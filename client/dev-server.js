const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const tls = require("node:tls");
const zlib = require("node:zlib");

const HOST = process.env.CLIENT_HOST || "127.0.0.1";
const PORT = Number(process.env.CLIENT_PORT || 3000);
const ROOT = __dirname;
/**
 * Public WebSocket URL handed to browsers. Leave unset (or "same-origin") to have the
 * browser connect back to this host at /ws, which GAME_SERVER_PROXY_URL then forwards.
 */
const GAME_SERVER_URL = (process.env.GAME_SERVER_URL || "").trim();
const PUBLIC_GAME_SERVER_URL = GAME_SERVER_URL.toLowerCase() === "same-origin" ? "" : GAME_SERVER_URL;
/** Internal game server base (e.g. http://balathor-server:8080). Enables the /ws proxy. */
const GAME_SERVER_PROXY_URL = (process.env.GAME_SERVER_PROXY_URL || "").trim();
const proxyTarget = GAME_SERVER_PROXY_URL ? new URL(GAME_SERVER_PROXY_URL) : null;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg"
};
const COMPRESSIBLE = new Set([".css", ".html", ".js", ".mjs", ".json", ".svg"]);

/**
 * Files are read, hashed and (for text) gzipped once, then served from memory. Entries are
 * revalidated against the file's mtime so edits during local development still show up.
 */
const fileCache = new Map();

function loadFile(filePath, callback) {
  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      callback(statError || new Error("not a file"));
      return;
    }
    const cached = fileCache.get(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      callback(null, cached);
      return;
    }
    fs.readFile(filePath, (readError, contents) => {
      if (readError) {
        callback(readError);
        return;
      }
      const ext = path.extname(filePath);
      const entry = {
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        type: MIME_TYPES[ext] || "application/octet-stream",
        etag: `"${crypto.createHash("sha1").update(contents).digest("base64url")}"`,
        body: contents,
        gzip: COMPRESSIBLE.has(ext) && contents.length > 1024 ? zlib.gzipSync(contents, { level: 9 }) : null
      };
      fileCache.set(filePath, entry);
      callback(null, entry);
    });
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/health") {
    send(res, 200, "application/json; charset=utf-8", JSON.stringify({
      ok: true,
      gameServerUrl: PUBLIC_GAME_SERVER_URL || "same-origin"
    }));
    return;
  }

  if (url.pathname === "/config.json") {
    send(res, 200, "application/json; charset=utf-8", JSON.stringify({
      gameServerUrl: PUBLIC_GAME_SERVER_URL
    }));
    return;
  }

  if (url.pathname === "/ws") {
    send(res, proxyTarget ? 426 : 404, "text/plain; charset=utf-8", proxyTarget ? "Upgrade Required" : "Not found");
    return;
  }

  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    send(res, 400, "text/plain; charset=utf-8", "Bad request");
    return;
  }
  const requestedPath = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, requestedPath);

  if (!filePath.startsWith(ROOT + path.sep)) {
    send(res, 403, "text/plain; charset=utf-8", "Forbidden");
    return;
  }

  loadFile(filePath, (error, entry) => {
    if (error) {
      send(res, 404, "text/plain; charset=utf-8", "Not found");
      return;
    }
    const headers = {
      "content-type": entry.type,
      // Always revalidate (cheap 304 via ETag) so deploys take effect immediately.
      "cache-control": "no-cache",
      etag: entry.etag,
      vary: "accept-encoding"
    };
    if (req.headers["if-none-match"] === entry.etag) {
      res.writeHead(304, headers);
      res.end();
      return;
    }
    let body = entry.body;
    if (entry.gzip && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
      body = entry.gzip;
      headers["content-encoding"] = "gzip";
    }
    headers["content-length"] = body.length;
    res.writeHead(200, headers);
    res.end(req.method === "HEAD" ? undefined : body);
  });
});

/**
 * Raw TCP pass-through for WebSocket upgrades on /ws: replay the upgrade request to the
 * game server and pipe bytes both ways. No frame parsing, so it adds almost no CPU.
 */
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, "http://localhost");
  if (!proxyTarget || url.pathname !== "/ws") {
    socket.destroy();
    return;
  }

  const secure = proxyTarget.protocol === "https:" || proxyTarget.protocol === "wss:";
  const port = Number(proxyTarget.port) || (secure ? 443 : 80);
  const upstream = secure
    ? tls.connect({ host: proxyTarget.hostname, port, servername: proxyTarget.hostname })
    : net.connect({ host: proxyTarget.hostname, port });

  const clientIp = (req.headers["x-forwarded-for"] ? `${req.headers["x-forwarded-for"]}, ` : "") + (socket.remoteAddress || "");
  upstream.once(secure ? "secureConnect" : "connect", () => {
    const lines = [`GET /ws${url.search} HTTP/1.1`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const name = req.rawHeaders[i];
      const lower = name.toLowerCase();
      if (lower === "host" || lower === "x-forwarded-for") continue;
      lines.push(`${name}: ${req.rawHeaders[i + 1]}`);
    }
    lines.push(`Host: ${proxyTarget.host}`);
    lines.push(`X-Forwarded-For: ${clientIp}`);
    upstream.write(`${lines.join("\r\n")}\r\n\r\n`);
    if (head && head.length) {
      upstream.write(head);
    }
    upstream.pipe(socket);
    socket.pipe(upstream);
  });

  socket.setNoDelay(true);
  upstream.setNoDelay?.(true);
  const close = () => {
    socket.destroy();
    upstream.destroy();
  };
  upstream.on("error", (error) => {
    if (!socket.destroyed && socket.bytesWritten === 0) {
      socket.end("HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
    }
    console.warn(`[ws-proxy] upstream error: ${error.message}`);
    close();
  });
  upstream.on("close", close);
  socket.on("error", close);
  socket.on("close", close);
});

server.listen(PORT, HOST, () => {
  console.log(`Balathor client listening on http://${HOST}:${PORT}`);
  console.log(`Client config gameServerUrl=${PUBLIC_GAME_SERVER_URL || "same-origin (/ws)"}`);
  if (proxyTarget) {
    console.log(`Proxying /ws to ${proxyTarget.origin}`);
  }
});

function send(res, status, contentType, body) {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store"
  });
  res.end(body);
}
