// Balathor v2 desktop client: a window onto the hosted game. Loading the live site (rather than
// bundling a copy of the client) means the desktop app is always the same version as the server.
//
//   BALATHOR_URL   game address (default: the production v2 server)
//
// F11 toggles fullscreen, Ctrl+R reloads, Ctrl+Shift+I opens devtools. If the server can't be
// reached, a friendly offline page offers to retry.

const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("node:path");

// No public hostname for v2 yet: default to the LAN deployment. Set BALATHOR_URL for anything else.
const GAME_URL = process.env.BALATHOR_URL || "http://192.168.10.112:8084/";

// Chromium can't sandbox a renderer started from a UNC path (running the exe straight out of WSL).
if (process.execPath.startsWith("\\\\")) app.commandLine.appendSwitch("no-sandbox");
// Keep the GPU busy for the 3D renderer even on laptops that would rather save power.
app.commandLine.appendSwitch("force_high_performance_gpu");

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#cfe9ff",
    title: "Balathor",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  });
  Menu.setApplicationMenu(null);

  const load = () => win.loadURL(GAME_URL).catch(() => {});
  win.webContents.on("did-fail-load", (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // -3: aborted (e.g. a redirect)
    win.loadFile(path.join(__dirname, "offline.html"), { query: { url: GAME_URL, reason: desc } });
  });
  // Links to other sites open in the real browser, never inside the game window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11") {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    } else if (input.control && input.key.toLowerCase() === "r") {
      load();
      event.preventDefault();
    } else if (input.control && input.shift && input.key.toLowerCase() === "i") {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });
  load();
  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
