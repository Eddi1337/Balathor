# Balathor v2

A cosy low-poly 3D MMO: slimes, sunbeams and second breakfasts. This `v2` branch is a ground-up
rebuild of Balathor (v1 lives on `main`). See [`docs/V2_PLAN.md`](docs/V2_PLAN.md) for the review
of v1, the new architecture and the milestone plan for reaching full feature parity.

- **Server**: authoritative TypeScript game server (Node 22, `ws`, `node:sqlite`).
- **Client**: three.js with a post-processing chain (god rays, bloom, tone mapping).
- **Shared**: one typed protocol and one deterministic world generator used by both sides.

## Run locally

```bash
npm install
npm run dev        # builds, watches and serves on http://localhost:8080
```

Or step by step: `npm run build && npm start`. Useful URL flags: `?quality=low|high` and
`?server=ws://host:port/ws`.

Set `DEV_COMMANDS=1` to enable `/tp x y` and `/time 0..1` chat commands while developing.

## Controls

| | |
|---|---|
| WASD / arrows | Walk (camera-relative) |
| Left click / hold Space | Attack toward the cursor |
| Right-drag, mouse wheel | Rotate / zoom the camera |
| E | Talk to villagers, pick up loot |
| Q | Drink a tonic |
| I / C | Bag / character sheet |
| Enter, `/` | Chat, commands (`/help`) |

On touch screens: left joystick to walk, ⚔️ to attack (auto-aims), 💬 to interact, drag the scene
to rotate.

## Tests and tools

```bash
npm test                                              # typecheck + build + smoke & world tests
node tools/stress.mjs --url ws://127.0.0.1:8080/ws --bots 100 --duration 60
```

## Configuration

| Variable | Default | |
|---|---|---|
| `PORT` / `HOST` | `8080` / `0.0.0.0` | |
| `DATA_DIR` | `data` | SQLite database location (`balathor-v2.sqlite`) |
| `TICK_RATE` / `SNAPSHOT_RATE` | `20` / `10` | Simulation and replication rates |
| `AOI_RADIUS` | `38` | Replication radius in tiles |
| `MAX_CLIENTS` | `300` | |
| `DAY_LENGTH_MS` | `1440000` | One in-game day (24 minutes) |
| `DISCORD_WEBHOOK_URL` | | Optional signup/login notifications |
| `DEV_COMMANDS` | | `1` enables `/tp` and `/time` (never in production) |

## Deployment

Pushing to the `v2` branch runs `.github/workflows/deploy-v2.yml`: tests, then on the self-hosted
runner builds **`harbor.edmundmurphy.com/balathor/v2`**, pushes it, and deploys
`docker-compose.prod.yml` to `/root/balathor-v2` on `192.168.10.112`. The single container
serves the client, `/health` and `/ws` on host port **8084**, with data in the
`balathor-v2-data` volume. It runs as its own compose project alongside v1 (8082/8083) and
never touches v1's containers or data.

To expose it publicly, add a reverse-proxy host (for example `v2.balathor.click`) pointing at
`192.168.10.112:8084` with WebSocket support enabled. No other configuration is needed: the client
connects to `/ws` on whatever host served it.
