const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const packagedClientRoot = path.resolve(__dirname, "app");
const CLIENT_ROOT = fs.existsSync(packagedClientRoot) ? packagedClientRoot : path.resolve(__dirname, "..");
const GAME_SERVER_URL = process.env.GAME_SERVER_URL || "wss://balathor.edmundmurphy.com/ws";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

let staticServer;

app.whenReady().then(async () => {
  const clientUrl = await startClientServer();
  const window = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: "#111522",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await window.loadURL(clientUrl);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (staticServer) {
    staticServer.close();
  }
});

async function startClientServer() {
  staticServer = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/config.json") {
      send(res, 200, "application/json; charset=utf-8", JSON.stringify({
        gameServerUrl: GAME_SERVER_URL
      }));
      return;
    }

    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const requestedPath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(CLIENT_ROOT, requestedPath);

    if (!filePath.startsWith(CLIENT_ROOT)) {
      send(res, 403, "text/plain; charset=utf-8", "Forbidden");
      return;
    }

    fs.readFile(filePath, (error, contents) => {
      if (error) {
        send(res, 404, "text/plain; charset=utf-8", "Not found");
        return;
      }

      const contentType = MIME_TYPES[path.extname(filePath)] || "application/octet-stream";
      send(res, 200, contentType, contents);
    });
  });

  await new Promise((resolve, reject) => {
    staticServer.once("error", reject);
    staticServer.listen(0, "127.0.0.1", resolve);
  });

  const address = staticServer.address();
  return `http://127.0.0.1:${address.port}/`;
}

function send(res, status, contentType, body) {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store"
  });
  res.end(body);
}
