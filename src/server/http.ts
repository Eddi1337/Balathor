// Static file serving for the built client: in-memory cache, gzip for text, ETag revalidation.

import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg"
};
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".svg", ".map"]);

interface Entry {
  mtimeMs: number;
  size: number;
  type: string;
  etag: string;
  body: Buffer;
  gzip: Buffer | null;
}

export function createStaticHandler(publicDir: string) {
  const root = resolve(publicDir);
  const cache = new Map<string, Entry>();

  async function load(path: string): Promise<Entry | null> {
    try {
      const st = await stat(path);
      if (!st.isFile()) return null;
      const hit = cache.get(path);
      if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit;
      const body = await readFile(path);
      const ext = extname(path);
      const entry: Entry = {
        mtimeMs: st.mtimeMs,
        size: st.size,
        type: MIME[ext] ?? "application/octet-stream",
        etag: `"${createHash("sha1").update(body).digest("base64url")}"`,
        body,
        gzip: COMPRESSIBLE.has(ext) && body.length > 1024 ? gzipSync(body, { level: 9 }) : null
      };
      cache.set(path, entry);
      return entry;
    } catch {
      return null;
    }
  }

  return async function serve(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", "http://local");
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (pathname === "/") pathname = "/index.html";
    const filePath = normalize(join(root, pathname));
    if (!filePath.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    const entry = (await load(filePath)) ?? (extname(pathname) ? null : await load(join(root, "index.html")));
    if (!entry) {
      res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
      return;
    }
    const headers: Record<string, string | number> = {
      "content-type": entry.type,
      "cache-control": "no-cache",
      etag: entry.etag,
      vary: "accept-encoding"
    };
    if (req.headers["if-none-match"] === entry.etag) {
      res.writeHead(304, headers).end();
      return;
    }
    let body = entry.body;
    if (entry.gzip && /\bgzip\b/.test(String(req.headers["accept-encoding"] ?? ""))) {
      body = entry.gzip;
      headers["content-encoding"] = "gzip";
    }
    headers["content-length"] = body.length;
    res.writeHead(200, headers);
    res.end(req.method === "HEAD" ? undefined : body);
  };
}
