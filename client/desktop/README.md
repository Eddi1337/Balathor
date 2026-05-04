# Balathor Windows Client

This folder is the Windows desktop packaging scaffold for the canvas client.

```bash
cd client/desktop
npm install
npm run dev
```

Build a Windows installer:

```bash
npm run build:win:dir
npm run build:win
```

`build:win:dir` creates `dist/Balathor-win32-x64/Balathor.exe`. `build:win` creates an NSIS installer and requires Wine when run from Linux. Output is written to `dist/`. The desktop wrapper starts a local static server inside Electron, serves the same client files as the browser build, and injects `/config.json` with `GAME_SERVER_URL`.

By default the packaged client points at:

```text
wss://balathor.edmundmurphy.com/ws
```

Override that during development with:

```bash
GAME_SERVER_URL=ws://localhost:8080/ws npm run dev
```
