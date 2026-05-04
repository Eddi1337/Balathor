const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const GAME_SERVER_URL = process.env.GAME_SERVER_URL || "wss://balathor.edmundmurphy.com/ws";

app.whenReady().then(async () => {
  const clientRoot = fsPathForClientRoot();
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

  await window.loadFile(path.join(clientRoot, "index.html"), {
    query: {
      gameServerUrl: GAME_SERVER_URL
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
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
