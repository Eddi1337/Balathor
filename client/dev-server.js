const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const HOST = process.env.CLIENT_HOST || "127.0.0.1";
const PORT = Number(process.env.CLIENT_PORT || 3000);
const ROOT = __dirname;
const GAME_SERVER_URL = process.env.GAME_SERVER_URL || "wss://balathor.edmundmurphy.com/ws";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/health") {
    send(res, 200, "application/json; charset=utf-8", JSON.stringify({
      ok: true,
      gameServerUrl: GAME_SERVER_URL
    }));
    return;
  }

  if (url.pathname === "/config.json") {
    send(res, 200, "application/json; charset=utf-8", JSON.stringify({
      gameServerUrl: GAME_SERVER_URL
    }));
    return;
  }

  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const requestedPath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, requestedPath);

  if (!filePath.startsWith(ROOT)) {
    send(res, 403, "text/plain; charset=utf-8", "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      send(res, 404, "text/plain; charset=utf-8", "Not found");
      return;
    }

    const type = MIME_TYPES[path.extname(filePath)] || "application/octet-stream";
    send(res, 200, type, contents);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Balathor client listening on http://${HOST}:${PORT}`);
  console.log(`Client config gameServerUrl=${GAME_SERVER_URL}`);
});

function send(res, status, contentType, body) {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store"
  });
  res.end(body);
}
