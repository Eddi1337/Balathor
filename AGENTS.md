# Balathor

## Cursor Cloud specific instructions

### Overview

Balathor is a sprite-based fantasy MMO prototype with two services: an authoritative Node.js game server (WebSocket + HTTP) and a vanilla HTML5 canvas client served by a simple static file server. Both have **zero npm dependencies** — no `npm install` is needed at the root level.

### Running the dev environment

```bash
npm run dev
```

This starts both server (port 8080) and client (port 3000) via `tools/dev.js`. If those ports are busy, the launcher auto-selects free ports and prints the actual URLs.

- Server health: `http://localhost:8080/health`
- Client health: `http://localhost:3000/health`
- Game client UI: `http://localhost:3000`

You can also run them individually with `npm run server` and `npm run client`.

### Testing

- **Smoke test**: `npm run smoke` — starts its own server/client on random ports and exercises the full protocol (auth, character creation, movement, chat, inventory, combat). Note: as of the current codebase, the smoke test has a pre-existing assertion failure at line 14 (`world.generateTile` tile type mismatch at enemy camp coordinates).
- **Stress test**: `npm run stress -- --url ws://127.0.0.1:8080/ws --clients 100 --duration 60`
- There is no linter or type checker configured (vanilla JS, no TypeScript, no ESLint).

### Gotchas

- The project requires **Node.js >= 22** (uses `node:crypto.subtle`, native `fetch`, etc.).
- Discord: successful **account creation** and **logins** post to a webhook (default URL in `server/src/discordWebhook.js`). Override with **`DISCORD_AUTH_WEBHOOK_URL`** (see root `README.md`).
- **`WORLD_DB_PATH`**: SQLite file for **house ownership**, house chests, and ground loot. Docker: mount **`/app/data`** or deeds do not survive container removal (see root `README.md`).
- Account data is stored in `server/data/accounts.json` (flat JSON file, no external database).
- The Electron desktop client (`client/desktop/`) is optional and targets Windows packaging — skip it in Cloud Agent environments.

### Git workflow

After making substantive code or asset changes, **commit and push** to `origin` (do not leave work only on the local branch). If `git commit` fails with odd options (for example `unknown option trailer`), use `command git` to bypass a broken shell alias.
