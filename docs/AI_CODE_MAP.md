# Balathor AI Code Map

This guide breaks the codebase into stable sections so future AI edits can target one area at a time.

## 1) Repository-level sections

| Section | Path | Purpose | Safe edit scope |
|---|---|---|---|
| Runtime launcher | `tools/` | Start/dev/stress scripts | Script behavior and CLI flags |
| Game server | `server/src/` | Authoritative simulation, auth, persistence, world rules | Gameplay rules, protocol handling, storage |
| Web client | `client/src/` | Rendering, UI, input, networking | UI behavior, draw logic, client prediction |
| Integration tests | `tests/` | End-to-end smoke checks | Assertions and protocol expectations |
| Static assets | `client/assets/`, `Assets/` | Sprites and licenses | Asset additions/replacements |

## 2) Server section map (`server/src`)

### `index.js` (main runtime)

Treat this file as five logical sections:

1. **Boot/config/constants** – env parsing, tuning values.
2. **Persistence/auth wiring** – account store, db open/load, session/account helpers.
3. **Network/protocol** – HTTP routes, WebSocket handshake, inbound message routing.
4. **Simulation loop** – tick/update cadence, mobs/NPC updates, collision + combat.
5. **Snapshot/output** – world/chunk serialization and outbound messages.

When changing behavior, confine edits to the smallest section possible and avoid moving constants between unrelated sections.

### World generation and layout

- `world.js`: biome, collision, terrain/chunk generation, portals/doors.
- `worlds/`: themed world extensions (`sciFiWorld`, `planetWorlds`).
- `sciFiStationLayout.js`, `hubRoundTown.js`: authored layout data.

### Systems modules

- `npcs.js`: NPC templates/schedules/world-time integration.
- `social.js`: social graph and chat-adjacent systems.
- `minigames.js`, `minigameSites.js`: mini-game registry and site placement.
- `worldStore.js`: sqlite-backed ownership/chest/ground-item persistence.
- `discordWebhook.js`: auth event notification transport.

## 3) Client section map (`client/src`)

### `main.js` (main runtime)

Treat this file as seven logical sections:

1. **Boot + DOM cache** – `querySelector` handles and startup layout.
2. **Config/network init** – server URL resolution, socket setup, reconnect/auth flow.
3. **Gameplay state model** – player/NPC/chunk/inventory/quest local state.
4. **Input + interaction** – keyboard, touch joystick, UI actions.
5. **Protocol handlers** – `type`-based inbound message handling.
6. **Render pipeline** – camera, chunk draw, entities, overlays, HUD.
7. **UI panels/utilities** – shop/trade/chat/talent/party and helper formatters.

### Smaller client modules

- `mobileUi.js`: mobile layout and touch-centric helpers.
- `minigames.js`: client mini-game UX/runtime.
- `techDungeonSprites.js`: theme-specific sprite mapping utilities.

## 4) AI editing workflow (recommended)

1. **Pick one section only** (from maps above).
2. **State unchanged boundaries** in commit/PR text (e.g., “no protocol shape changes”).
3. **Run focused checks** (`npm run smoke` for protocol-level edits, manual client run for UI edits).
4. **Document deltas** in `README.md` if behavior or env vars changed.

## 5) Naming + documentation conventions

- Keep gameplay constants uppercase near their owning system.
- Prefer short function headers for non-obvious rules:
  - _what invariant is enforced_
  - _what upstream/downstream depends on it_
- Avoid cross-module hidden coupling; if required, document it at callsite.
- For new feature areas, add a short subsection in this file so future edits remain localized.
