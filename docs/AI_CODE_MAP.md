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

### Furniture system (house interiors)

- **Catalog** (`index.js` Section 1): `FURNITURE_CATALOG` — 12 items with `{templateId, kind, fw, fh, price, walkable}`. `fw`/`fh` are tile footprints; `walkable` items (rug, painting) don't block movement.
- **Shop NPC**: `npc_furnisher_marta` in `npcs.js` (`isFurnisher: true, shopType: "furniture"`, `homeX: 20, homeY: 12`) near the market. `nearestFurnisherShop()` in `index.js` returns a synthetic shop fixture (same pattern as stable keeper).
- **Purchase**: `handleShopBuy` `template.type === "furniture"` branch — gold deducted, item pushed to `player.ownedFurniture[]`, persisted via `serializePlayer` in `accounts.json`.
- **Placement**: client sends `placeFurniture { templateIdx, lx, ly }`. Server validates: player is in own house interior (`getInteriorAreaAt`), footprint is in bounds, no AABB overlap with existing pieces. Placed piece stored in `house_furniture` sqlite table via `worldStore.js`.
- **Pickup**: client sends `pickupFurniture { pieceId }`. Server removes from DB, returns item to `ownedFurniture`.
- **Collision**: `isFurnitureBlockedAt(wx,wy)` checked in movement validation alongside `isBlockedCircle`; non-walkable furniture blocks players.
- **Persistence**: `house_furniture` table in `world.sqlite` (`worldStore.js`). In-memory cache: `houseFurnitureByKey` Map. Owned-but-unplaced furniture in `accounts.json` via `ownedFurniture[]` on player.
- **Visibility**: `houseFurniture` message sent to all players in the interior on change, and on entering any owned house interior (via `handleDoorTravel` interior-transition detection + `handleStairTravel`). Client stores in `state.houseFurniture`.
- **Rendering**: `drawHouseFurniturePiece(kind, sx, sy, fw, fh)` in `client/src/main.js` — procedural canvas art per kind. `drawHouseFurniture()` called in main draw loop after `drawBuildingSprites`. Client-side catalog: `CLIENT_FURNITURE_CATALOG`. Placement preview drawn while `state.decorateMode` is active.
- **UI**: `#decoratePanel` in `index.html`; `openDecoratePanel` / `closeDecoratePanel` / `refreshDecorateOwnedList` / `refreshDecoratePlacedList` in `main.js`. `D` key toggles panel when inside owned house. Canvas click in decorate mode places selected piece.
- **Mobile**: `decorate` chip added in `mobileUi.js` when `self.x > 9000` (interior proxy) and `homeBuildingKey` set. Chip opens decorate panel; placement is desktop-only (mobile gets view + pickup only).

### Gathering, Fishing & Crafting professions system

Six gathering/crafting professions (fishing, woodcutting, herbalism, mining, cooking, smithing) with levels 1–30 and XP, persisted per character in `accounts.json` alongside combat professions.

- **Constants** (`index.js` Section 1): `GATHER_PROF_MAX_LEVEL` (30), `GATHER_XP_PER_LEVEL` (60), `GATHER_NODE_RESPAWN_MS` (90 s), `FISH_BITE_MIN_MS`/`FISH_BITE_MAX_MS`/`FISH_CATCH_WINDOW_MS`, `CRAFT_STATION_INTERACT_RADIUS`, `FOOD_BUFF_DURATION_MS` (3 min). Tool catalog: `GATHER_TOOL_CATALOG` (4 tools). Node definitions: `RESOURCE_NODE_DEFS` (11 node types). Spawn positions: `RESOURCE_NODE_SPAWNS` (30 fixed fantasy-world nodes). Fish tables: `FISH_TABLE_FANTASY` / `FISH_TABLE_OCEANUS`. Cooking recipes: `COOKING_RECIPES` (6). Smithing recipes: `SMITHING_RECIPES` (6). Station locations: `CRAFT_STATIONS` (campfire at hub, forge near Tamsin).
- **Runtime state** (`index.js` Section 2, after houseFurnitureByKey): `resourceNodes` Map (depleted flag + respawnAt), `activeGatherSessions` / `activeFishingSessions` / `activeCraftSessions` Maps, `playerFoodBuffs` Map.
- **Persistence**: gathering profession levels saved in `accounts.json` via extended `sanitizeProfessions` (now covers both minigame and gather profession IDs). XP awarded via `awardGatherProfXp`.
- **Gathering flow**: `handleGatherNodeInteract` checks tool + tier, starts session; `processGatheringSessions` ticks each frame, delivers material item + XP on completion, marks node depleted, respawns after timer. Nodes sent to client on join via `sendResourceNodesNear`; updates pushed as `nodeUpdate` messages.
- **Fishing flow**: `handleFishingInteract` checks proximity to water (`isNearWater`), requires fishing rod, starts `activeFishingSessions` entry with random bite delay; `processFishingSessions` fires `fishingBite` event; client sends `fishingCatch`; `handleFishingCatch` does weighted roll from `FISH_TABLE_FANTASY` / `FISH_TABLE_OCEANUS` filtered by fishing level, awards fish item + XP.
- **Crafting**: `handleCraftStationInteract` finds nearby station (campfire/forge), sends recipe list with ingredient check; client sends `craftRecipe`; `handleCraftRecipe` validates ingredients, consumes them, creates output, awards XP. Food items carry a `buff` property consumed via `handleUseItem` (extended to handle `material` items with buff). `applyFoodBuff` / `expireFoodBuffs` manage the `playerFoodBuffs` table (server-authoritative; client receives `foodBuff` message).
- **NPC vendor**: `npc_fisherman_bram` (`homeX: -8, homeY: 50`) sells all four tools; `isGatherVendor: true, shopType: "tools"`. `nearestGatherShop` resolves the synthetic shop; `getShopStock` returns `GATHER_TOOL_CATALOG` for `shopType === "tools"`. Tool purchase adds a `{ type: "tool", toolKind }` item to inventory.
- **Scope cut**: smithing produces bars and sellable goods/buff tonics, not full gear items, to avoid entangling the existing loot/rarity system. Full gear crafting is deferred.
- **Professions panel**: `#professionsPanel` in `index.html`; `openProfessionsPanel` / `closeProfessionsPanel` / `refreshProfessionsPanel` in `main.js`. `P` key toggles panel. Server sends `professionsData` in response to `professionsOpen` message.
- **Rendering**: `drawResourceNodes()` — procedural canvas sprites (tree/herb/rock silhouettes, greyed-out when depleted). `drawCraftStations()` — animated campfire/forge. `drawGatherProgressOverlay()` — centred progress bar during gather. All called from main draw loop.
- **Craft/fishing panels**: `#craftPanel` and `#fishingPanel` in `index.html`; opened server-push (`craftStation`, `fishingCast` messages). Catch button and Space bar trigger `fishingCatch` message.
- **Crafting XP note**: two crafting skills (cooking, smithing) are separate from the four gathering skills — 6 skills total. All use the same level/XP structure.

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
