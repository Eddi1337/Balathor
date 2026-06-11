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

- `world.js`: biome, collision, terrain/chunk generation, portals/doors (orchestration).
- `worlds/registry.js`: logical world ids, game modes, coordinate resolution.
- `worlds/`: themed world extensions (`sciFiWorld`, `planetWorlds`, `pirateWorld`).
- `maps/mapLoader.js`: hand-made maps from `content/maps/*.json`.
- `content/worlds/`: manifest, per-realm data (e.g. `fantasy/portals.json`).
- `docs/ADDING_MAPS.md`: how to add maps/worlds (for humans and AI agents).
- `sciFiStationLayout.js`, `hubRoundTown.js`: authored layout data.

### Starter-town layers & two-story houses (fantasy hub)

- `hubRoundTown.js`: `spreadDwellingFootprints` enforces a ≥3-tile walkable ring around every lot; `computeHubUpperDeck` authors the "sky promenade" — per-tile upper cells `{x, y, kind: deck|bridge|stairs, dir, edges}` (edges = railing bitmask N1/E2/S4/W8). Pubs + many cottages get `twoStory: true`.
- `world.js`: `TILE.STAIRS` (31); upper-cell queries `isUpperWalkableAt` / `isUpperStairsAt` / `isUpperBlockedCircle` / `getUpperCellsInChunk` (chunks carry `upperCells`); two-story upstairs floors live on the interior plane at `UPSTAIRS_BASE_Y` (`getUpstairsTile`, `getStairTravelAt` maps indoor stair tiles to up/down destinations).
- `index.js`: `player.layer` (0 ground / 1 deck). Movement uses `isUpperBlockedCircle` on layer 1; `handleTownLayerTransition` flips the layer when stepping off a stair cell; `handleStairTravel` teleports between house floors. Player snapshots include `layer`.
- `client/src/main.js`: `state.upperCells` + `state.predictedLayer`, layer-aware prediction (`predictTownLayer`), deck overlay pass (`drawUpperDeckLayer` draws planks/railings above ground entities, then layer-1 entities above that; `drawUpperDeckShadows` shades the ground beneath). Cute cottage art: `drawCuteCottage` / `drawCuteWindow` (hut/house/big_house all route here).

### Oceanus port, pirates & ship interiors

- `worlds/oceanusWorld.js`: `buildStarterFeatures()` authors **Port Bilgewater** (the starter island) — five finger-pier moorings, a wide crossbar quay, dockside buildings (`harbour-building`), a `harbour-lighthouse`, and `harbour-prop` clutter (barrels/crates/lanterns/capstans/ropes/anchors/cannons). `STARTER_MOORING_CLEARANCE` (=9) must stay within the ~14-tile dock-terminal reach (`resolveShipLaunchPort` in `index.js`) or summon/board breaks. Exports `STARTER_ISLAND` for NPC anchoring.
- `client/src/main.js`: `drawHarbourBuildingObject` / `drawHarbourLighthouseObject` / `drawHarbourPropObject` render the new dockside art; draw-order tiers added in `spaceObjectDrawOrder`.
- `npcs.js`: `buildPirateNpcDefinitions()` places 8 pirate crew NPCs (`npc_pirate_*`, `npcTheme: "oceanus"`) around the island centre with shanty dialogue + `aiPersonality`; the runtime spawner snaps any pirate whose home lands on water back toward the island centre.
- **Interior↔exterior ship mapping** (already in place, used by the ocean overhaul): the server keeps each aboard player's deck-frame position in `shipLocalX/shipLocalY` (axis-aligned to the deck, NOT world). `syncPlayerToShipLocal` sets `player.x = center + local`; passengers are dragged with the hull each tick (`index.js` ~4986). On the client, an exterior viewer draws a boarded nautical ship via `drawRotatedNauticalDeck` + `drawCharacterOnRotatedNauticalDeck`, which translate to ship center and `ctx.rotate(shipRenderFacing(ship))` (`withNauticalDeckRotation`) so deck-local figures appear oriented with the ship's heading — i.e. interior coords → deck-local → heading-rotated figures on the exterior hull.

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
