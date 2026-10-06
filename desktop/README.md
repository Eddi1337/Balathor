# Balathor v2 desktop client

A small Electron window onto the hosted game. It always loads the live site, so the desktop app is
the same version as the server and never needs updating for game changes.

```bash
cd desktop
npm install
npm run dev                                       # play against the default server
BALATHOR_URL=http://localhost:8084/ npm run dev   # or a local / LAN one
```

Installers (written to `desktop/dist/`):

```bash
npm run build:win     # Windows NSIS installer (needs Wine when built on Linux)
npm run build:linux   # AppImage
npm run build:mac     # dmg (build on a Mac)
```

Keys: **F11** fullscreen · **Ctrl+R** reload · **Ctrl+Shift+I** devtools. If the server can't be
reached you get a friendly retry page.
