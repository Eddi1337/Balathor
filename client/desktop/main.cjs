const { app, BrowserWindow, dialog } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const GAME_SERVER_URL = process.env.GAME_SERVER_URL || "wss://balathor.edmundmurphy.com/ws";

// Chromium cannot fork a sandboxed renderer from a UNC path (\\server\...).
// This happens when the exe is run directly from the WSL filesystem on Windows.
// Disabling the sandbox lets the renderer start normally in that case.
if (process.execPath.startsWith("\\\\")) {
  app.commandLine.appendSwitch("no-sandbox");
}

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

let staticServer;
let logPath;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try {
    if (logPath) {
      fs.appendFileSync(logPath, line);
    }
  } catch {
    // best-effort
  }
}

function setupLog() {
  try {
    const logDir = app.getPath("userData");
    fs.mkdirSync(logDir, { recursive: true });
    logPath = path.join(logDir, "startup.log");
    // Truncate on each launch so the file stays small.
    fs.writeFileSync(logPath, "");
    log(`Balathor ${app.getVersion()} starting — platform=${process.platform} packaged=${app.isPackaged}`);
    log(`resourcesPath=${process.resourcesPath}`);
    log(`__dirname=${__dirname}`);
    log(`logPath=${logPath}`);
  } catch (err) {
    process.stderr.write(`log setup failed: ${err}\n`);
  }
}

process.on("uncaughtException", (err) => {
  log(`uncaughtException: ${err.stack || err}`);
  dialog.showErrorBox("Balathor — startup error", String(err.stack || err));
  app.exit(1);
});

process.on("unhandledRejection", (reason) => {
  log(`unhandledRejection: ${reason}`);
  dialog.showErrorBox("Balathor — startup error", String(reason));
  app.exit(1);
});

app.whenReady().then(async () => {
  setupLog();

  let clientRoot;
  try {
    clientRoot = fsPathForClientRoot();
    log(`clientRoot=${clientRoot}`);
    log(`index.html exists=${fs.existsSync(path.join(clientRoot, "index.html"))}`);
  } catch (err) {
    log(`fsPathForClientRoot failed: ${err}`);
    throw err;
  }

  let clientUrl;
  try {
    clientUrl = await startClientServer(clientRoot);
    log(`HTTP server listening at ${clientUrl}`);
  } catch (err) {
    log(`startClientServer failed: ${err}`);
    throw err;
  }

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

  window.webContents.on("did-fail-load", (_event, code, desc, url) => {
    log(`did-fail-load: code=${code} desc=${desc} url=${url}`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    log(`render-process-gone: reason=${details.reason} exitCode=${details.exitCode}`);
  });

  try {
    await window.loadURL(clientUrl);
    log("loadURL completed OK");
  } catch (err) {
    log(`loadURL failed: ${err}`);
    throw err;
  }
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

function fsPathForClientRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app.asar", "app");
  }

  const unpackedClientRoot = path.resolve(__dirname, "app");
  if (fs.existsSync(unpackedClientRoot)) {
    return unpackedClientRoot;
  }

  return path.resolve(__dirname, "..");
}

async function startClientServer(clientRoot) {
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
    const filePath = path.join(clientRoot, requestedPath);

    if (!filePath.startsWith(clientRoot)) {
      send(res, 403, "text/plain; charset=utf-8", "Forbidden");
      return;
    }

    fs.readFile(filePath, (error, contents) => {
      if (error) {
        log(`readFile failed: ${filePath} — ${error.code}`);
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

  const { port } = staticServer.address();
  return `http://127.0.0.1:${port}/`;
}

function send(res, status, contentType, body) {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store"
  });
  res.end(body);
}
