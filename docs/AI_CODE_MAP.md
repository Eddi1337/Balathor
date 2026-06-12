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

### Quests (definitions, dialogue, ocean line)

- `index.js` `QUEST_DEFINITIONS`: each quest has `steps[]` of type `kill` (matched by `mobMatchesQuestStep` on `isShipPirate`/`campId`/`faction`/`biome`/`matchName`), `location` (radius trigger via `processQuestLocationObjectives`; uses ship center when boarded), or `talk` (completed by `npcId` in `activeQuestByNpc` — the step `target` is a map marker only). Optional `offer`/`complete` strings are in-character giver lines surfaced as `offerLine` in the `questOffer` payload and `completeLine`/`giverName` in the `quest_completed` message; the client renders the offer quote in the offer panel and the completion quote in chat.
- **Mob targeting invariants:** `kill` steps only complete against mobs that actually spawn near the target. Tutorial slimes for `q_first_hunt` are hand-placed "Meadow Slime" fixed mobs in `createMobs()` just south of the home tree (fixed mobs bypass the 180-tile `PRIMARY_HUB_MOBS_CLEAR_RADIUS`). When adding kill quests, confirm a matching mob spawns at the target before shipping.
- **Port Bilgewater pirate quest line** (`q_pirate_*`, givers `npc_pirate_*`): initiation→supplies→gunnery→charting→lost_treasure. Uses sailing location triggers at real islands (Iron Haven, Mariner's Rest, Black Cay), `oceanus_marauder`-faction kills off Storm Atoll, and the Storm Cay "Pirate Captain" boss. `buildPirateNpcDefinitions()` forwards `questIds` onto each giver.
- `npcAi.js`: quest-giver NPCs with a nearby player get `hasQuestForPlayers` in their perception and a prompt hint to beckon adventurers over (no invented quest specifics).

### Sword-guard melee system (fantasy hub)

- `npcs.js`: Six guards carry `isSwordGuard: true` and `weaponKind: "sword"` — Guard Aldric, Guard Sera (upgraded from plain NPCs), plus four new perimeter guards (Torin/north, Mira/east, Fen/south, Bren/west). `SWORD_GUARD_IDS` is exported so `index.js` can drive their combat. Guards also carry `isGuard: true`, which excludes them from the hub schedule and pub AI (`hubScheduleEligible`, `isPubHour`).
- `index.js`: `processSwordGuards(now, dt)` runs each tick after `processGatekeeperArchers`. It scans mobs within `SWORD_GUARD_AGGRO_RANGE` (22 tiles), chases the nearest one (moving `guard.x/y` by `SWORD_GUARD_SPEED * dt` tiles/sec), swings when within `SWORD_GUARD_MELEE_RANGE` (1.6 tiles) on a 1.1 s cooldown (`_lastSwordHitAt`), broadcasts a `combat/melee/sword` event, and returns to `homeX/homeY` when no target is in range. Quest slimes `mob_slime_meadow_1/2/3` are in `SWORD_GUARD_QUEST_MOB_IDS` and skipped unconditionally.
- `npcAi.js`: already excludes all `isGuard` NPCs from Ollama ambient AI — no change needed.

### Mount system

- **Constants** (`index.js` Section 1): `MOUNT_SPEED_MULTIPLIER` (1.7×), `MOUNT_BUY_PRICE` (350g), `MOUNT_FORBIDDEN_WORLDS` (`oceanus`).
- **Server state**: `player.hasMount` (boolean, persisted in `accounts.json` via `serializePlayer`), `player.mounted` (boolean, runtime only — always `false` on login).
- **Speed**: `getPlayerSpeed` multiplies by `MOUNT_SPEED_MULTIPLIER` when `player.mounted && !ship.boarded`.
- **Toggle**: `handleToggleMount` (server) — validates world + layer; client sends `toggleMount` message. Keybind `M` in `main.js`.
- **Auto-dismount**: `dismountPlayer(player)` called in `handleAttack`, mob damage handler, `handlePortalTravel`, `handleTownLayerTransition` (when layer becomes 1), `boardPlayerOntoCurrentShip`, and waypoint teleport.
- **Shop**: `Stable Keeper Holt` NPC (`npc_stable_keeper`, `homeX: 36, homeY: 12` in fantasy hub). `nearestStableShop()` in `index.js` returns a synthetic shop fixture; `getShopStock("mount")` → `getMountCatalog()`. `handleShopBuy` handles `template.type === "mount"` by setting `player.hasMount = true`.
- **Rendering**: `drawMount(x, y, s, facing, moving, phase, isSciFi)` in `main.js` draws a horse (fantasy) or hoverboard (sci-fi/planet) under the character sprite. Called at the top of `drawCharacter` when `entity.mounted`.
- **Snapshot**: `mounted` included in all player snapshots; `hasMount` + `unlockedWaypoints` in self-only block.
- **Per-world theme**: Horse in fantasy/oceanus (oceanus disallows mounting); hoverboard on sci-fi station and planet surfaces.

### Waypoint fast-travel system

- **Constants** (`index.js` Section 1): `WAYPOINT_NODES` (9 obelisks across fantasy, sci-fi, planet:rust), `WAYPOINT_DISCOVER_RADIUS` (4.5 tiles), `WAYPOINT_TRAVEL_RADIUS` (6.0 tiles), `WAYPOINT_TRAVEL_COST` (15g).
- **Scope**: same-world travel only. Cross-world travel still uses portals (bridging world coordinates is out of scope here; noted in the travel refusal message `waypoint_cross_world`).
- **Persistence**: `player.unlockedWaypoints` (string array of node IDs) saved in `accounts.json` via `serializePlayer`.
- **Discovery**: `discoverWaypointsNear(client)` runs every simulation tick — passive discovery by proximity.
- **Interaction**: Walking near an obelisk and pressing E triggers `handleWaypointOpen` (via `handleInteract`). Client sends `waypointOpen` (explicit) or it falls through `handleInteract`. Server sends `waypointMenu` payload.
- **Travel**: Client sends `waypointTravel { targetId }`. Server validates same-world, unlocked, gold; teleports player and sends `teleport` message with style `"waypoint"`.
- **Rendering**: `drawWaypointObelisks()` in `main.js` (called in main draw loop after portals) draws obelisk sprites; unlocked ones glow purple, locked ones are grey.
- **Welcome message**: `waypointNodes` array sent once on join so the client knows positions for rendering.
- **UI**: Waypoint panel (`#waypointPanel`) in `index.html`; `openWaypointMenu` / `closeWaypointMenu` in `main.js`.

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
