# Balathor

Balathor is starting as a small MMO prototype in the style of a sprite-based fantasy realm. This first slice has two applications:

- `server`: an authoritative Node.js simulation server with a custom WebSocket transport and Dockerfile.
- `client`: a Windows-friendly HTML5 canvas client that can be run in a browser now and packaged with the Electron scaffold in `client/desktop`.

The current gameplay loop is intentionally narrow: the client opens on a server connection screen, connects, shows character customization, then joins a social hub in a large forest world. Players move with WASD, movement is simulated by the server, and chat is broadcast server-side to all connected clients.

## Run Locally

Requires Node.js 22 or newer.

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

Local development binds to `127.0.0.1` by default. If `3000` or `8080` is busy, the launcher uses the next free port and prints the actual URL. Set `HOST=0.0.0.0 CLIENT_HOST=0.0.0.0` when you want LAN access.

You can also run each application separately:

```bash
npm run server
npm run client
```

## Stress Testing

The stress runner launches lightweight WebSocket clients with random player names. It targets the remote Balathor server by default:

```bash
npm run stress -- --clients 500 --duration 300 --ramp 25
```

From a Windows Command Prompt, the shortest command is:

```bat
stress-remote.cmd 500
```

From PowerShell, run:

```powershell
.\stress-remote.cmd 500
```

That launches 500 clients against:

```text
wss://balathor.edmundmurphy.com/ws
```

Add `--attack` when you want combat traffic too:

```bash
npm run stress -- --clients 500 --duration 300 --ramp 25 --attack
```

To test a local development server instead, start it first with `npm run server`, then pass the local URL:

```bash
npm run stress -- --url ws://127.0.0.1:8080/ws --clients 100 --duration 60
```

## Docker Server

```bash
npm run server:docker:build
npm run server:docker:run
```

Or with Compose:

```bash
docker compose up --build balathor-server
```

The web client can be built and run the same way:

```bash
docker compose up --build balathor-client
```

The server container exposes HTTP health at `/health` and WebSocket gameplay at `/ws`. The client container exposes HTTP health at `/health` and serves the browser client from `/`.

## Server Deployment

Pushes to `main` or `master` build `./server` and `./client` on the self-hosted Balathor runner, publish the images to Harbor as `192.168.10.155/balathor/server` and `192.168.10.155/balathor/client`, then deploy `docker-compose.prod.yml` to `/root/balathor` on `192.168.10.222`.

The workflow expects the same repository secrets as the other deployed repos:

- `HARBOR_USERNAME`
- `HARBOR_PASSWORD`
- `DEPLOY_SSH_PRIVATE_KEY`

The production server container maps host port `8082` to the server's internal `8080`. The production web client container maps host port `8083` to the client's internal `3000`.

The client dev server reads `GAME_SERVER_URL`, so a custom endpoint can be used like this:

```bash
GAME_SERVER_URL=ws://localhost:8080/ws npm run client
```

## Current Architecture

The server owns:

- player positions and movement validation
- social hub spawning
- generated world chunks
- chunk streaming over WebSocket
- world snapshots sent to clients

The client owns:

- boot config lookup
- server connection screen
- character customization UI
- input capture
- local render smoothing for streamed positions
- sprite-style rendering
- chunk cache and draw order
- chat display and input

Client house sprites use Kenney's `RPG Base` asset pack under CC0. The copied license is in `client/assets/kenney-rpg-base-license.txt`.

The packaged client defaults to:

```text
wss://balathor.edmundmurphy.com/ws
```

For local development, `npm run dev` injects the local server URL into `/config.json`.

The world is chunked into 16x16 tile regions. The server generates chunks deterministically from world coordinates, with a central social plaza and mostly forest terrain outside the hub.

## Windows Client Direction

The browser client has no build step. The Windows desktop wrapper lives in `client/desktop`:

```bash
cd client/desktop
npm install
npm run dev
npm run build:win
```

From the repo root, the same commands are available as:

```bash
npm run client:desktop:install
npm run client:desktop:dev
npm run client:desktop:build:win-dir
npm run client:desktop:build:win
```

`client:desktop:build:win-dir` produces `client/desktop/dist/Balathor-win32-x64/Balathor.exe`. `client:desktop:build:win` produces an NSIS installer and requires Wine when run from Linux. The important boundary is already present: the client asks for `/config.json` at boot and uses the returned `gameServerUrl` as the default value on the connection screen.

## Protocol Sketch

Client to server:

- `hello`: sends player name, class, torso style/colour, and weapon style/colour.
- `input`: sends current movement key state.
- `chat`: sends a player chat line to the server.
- `attack`: uses the player's class weapon.
- `home`: teleports the player back to the spawn square.
- `spendStat`: spends a level-up point on speed, strength, armour, or health.
- `interact`: opens a nearby chest or picks up nearby loot.
- `pickupGroundItem`: picks up a clicked ground item after the server validates range.
- `equipItem`, `unequipItem`, `useItem`, `dropItem`: manages equipment and bag items.
- `requestChunks`: asks the server for world chunks around the camera.

Server to client:

- `welcome`: confirms the player's id and world settings.
- `chatHistory`: sends recent server-side chat history.
- `chat`: broadcasts a server-accepted chat line to all clients.
- `chunk`: streams generated tile data for one chunk.
- `snapshot`: sends authoritative player positions.
- `combat`: broadcasts sword swings, arrows, fireballs, hits, damage, and shield blocks.
- `serverMessage`: sends connection or validation messages.

## Next Milestones

- account/session identity
- combat and enemy simulation
- item drops and inventory
- persistent shard state
- binary protocol and interest management
- desktop Windows packaging
