// Balathor v2 server entry: one process serves the client, /health and the /ws game socket.

import { createServer } from "node:http";
import { join } from "node:path";
import { WebSocketServer } from "ws";
import { config } from "./config";
import { Store } from "./db/database";
import { Game } from "./game/game";
import { createStaticHandler } from "./http";

const store = new Store(process.env.DB_PATH || join(config.dataDir, "balathor-v2.sqlite"));
const game = new Game(store);
const serveStatic = createStaticHandler(config.publicDir);

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify(game.health()));
    return;
  }
  void serveStatic(req, res);
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024, perMessageDeflate: false });

server.on("upgrade", (req, socket, head) => {
  if (new URL(req.url ?? "/", "http://local").pathname !== "/ws") {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    const forwarded = String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim();
    game.onConnect(ws, forwarded || req.socket.remoteAddress || "");
  });
});

server.listen(config.port, config.host, () => {
  console.log(`Balathor v2 listening on http://${config.host}:${config.port} (tick ${config.tickRate} Hz, snapshots ${config.snapRate} Hz)`);
  game.start();
});

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[${signal}] saving and shutting down…`);
  game.stop();
  store.close();
  server.close();
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
