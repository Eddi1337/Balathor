// The game page gets one tiny, read-only hint that it's running in the desktop app.
const { contextBridge } = require("electron");
contextBridge.exposeInMainWorld("balathorDesktop", { platform: process.platform, version: "2.0.0" });
