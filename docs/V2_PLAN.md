# Balathor v2: premise review, architecture and parity plan

## 1. Premise review (v1)

**What Balathor is.** A browser MMO where you make an account, pick a Ranger, Mage or Knight,
and drop into a shared persistent world. You start in a walled hub town and range out through
biome wilderness, then through portals into very different realms: a sci-fi orbital station with
flyable ships, procedural planets, a pirate ocean with 100+ islands and sailing ships, dungeons
and group dungeons. Around the combat → loot → level loop sit a lot of "cosy MMO" systems:
houses you buy and decorate, six professions, ~20 minigames, a 29-quest line, mounts, waypoints,
parties, trading, NPCs with daily schedules and an AI-chat layer.

**What works.** An authoritative server with client prediction; a deterministic procedural world
(cheap to store, huge); persistent characters; genuinely charming details (two-storey houses
with sky promenades, walkable ship decks, NPC routines); no build step and trivial deploys.

**What held it back.**

| Problem | Consequence | v2 answer |
|---|---|---|
| 16k-line `server/src/index.js`, 23k-line `client/src/main.js` | Everything can reach everything; fixes break distant features (e.g. a variable used before its declaration froze the sci-fi world) | Small modules with one job each, TypeScript everywhere |
| Every realm crammed into one coordinate plane (interiors at x>9000, dungeons at 15000, planets at 500000) | Constant "which world is this tile in?" lookups (the #1 CPU cost), teleports landing on return gates | Each realm/interior/instance is its own **map** with its own entities and simulation |
| 123 JSON message types defined only by convention; full-copy snapshots | Client/server drift; heavy bandwidth | One typed `shared/protocol.ts`; per-client **delta replication** |
| Server streams terrain chunks | Server CPU + bandwidth for static data | World generator is **shared code**; clients build terrain from the seed |
| `accounts.json` rewritten on every save + separate SQLite | Fragile, slow with many players | Everything in **SQLite** (accounts, characters; later houses, chests…) |
| Flat 2D canvas look with procedural sprites | Hard to make "cute" and cohesive | **Low-poly 3D** with toon characters, global lighting, god rays |

**Identity.** Fantasy, sci-fi and pirate all compete for attention. v2 keeps every feature
(as requested) but makes each realm a self-contained module reached from the hub, so the
"cosy hub town → portals to wildly different worlds" structure reads as deliberate.

## 2. v2 architecture

```
src/
  shared/            ← imported by BOTH server and client
    protocol.ts        every message and replicated entity shape
    math.ts            deterministic hash / noise / rng
    world/             tiles, town layout, overworld generator, map registry
    game/              classes, items, monsters, NPCs/shops, stats, movement+collision
  server/
    main.ts            HTTP (static client, /health) + WebSocket /ws
    db/database.ts     SQLite (node:sqlite) with migrations
    auth.ts            scrypt password hashing, validation
    game/game.ts       sessions, auth flow, handlers, progression, persistence, replication
    game/world.ts      one running map: spatial grid, mob/NPC AI, projectiles, loot, regen
    game/entities.ts   Player / Mob / Npc / Loot with cached net() serialisation
  client/
    main.ts            app flow, prediction, input → world, entity views, frame loop
    render/            renderer (sky, sun/moon, fog, shadows, god rays, bloom), terrain
                       chunks, town, cute models + animation, effects (sunbeams, particles)
    ui/                HUD, windows, chat, title/creator screens, world-space labels
```

Key decisions:

- **Simulation**: 20 Hz authoritative ticks; snapshots at 10 Hz; mobs only think in grid cells
  near players ("awake cells"); with nobody online the loop idles at 4 Hz.
- **Replication**: each client keeps a cache of what it was last told per entity; the server
  sends `add` (full), `upd` (changed fields only) and `del`. Entity serialisation is cached per
  pass so many viewers share one object. Effects (`fx`) are pushed immediately.
- **Prediction**: the client runs the same `stepMovement` + collision as the server and eases
  toward the authoritative position (snap only on large error).
- **Rendering**: each 32×32 terrain chunk is **one merged mesh** (ground + every prop) with a
  shared material that adds wind sway and night-glow via vertex attributes, so the whole world is
  ~50 draw calls. Characters are a few merged parts with a toon material.
- **Lighting**: hemisphere + directional sun/moon with soft shadows following the player, gradient
  sky dome, fog, a full day/night palette, drifting clouds that cast shadows; post chain of
  screen-space **god rays** (sun disc as light source), bloom, vignette and neutral tone mapping;
  plus **stylised volumetric sunbeams** that slant through tree canopies and over the plaza so the
  effect shows even when the sun is off-screen; fireflies at night.

Measured (100 bots clustered in town, local): ~15% of one core, 4.6 ms average tick, 190 MB RSS.
v1 saturated a core with 60 bots before the recent optimisations.

## 3. Milestones and feature parity

Legend: ✅ in v2 · 🔜 planned milestone

### Milestone 1: foundations and the core loop ✅ (this release)

| v1 feature | v2 |
|---|---|
| Accounts (create/login), persistent characters | ✅ SQLite, scrypt |
| Discord webhook on signup/login | ✅ `DISCORD_WEBHOOK_URL` |
| Character customisation | ✅ class, outfit, trim, skin, hair colour, 5 hairstyles, live 3D preview |
| Three classes: Ranger (arrows), Mage (splash fireballs), Knight (melee arc + shield block) | ✅ |
| Walled hub town with shops, guards, villagers | ✅ Hearthmoor: 4 named buildings, 8 cottages, gates, lamps, fountain |
| Biome wilderness with level scaling | ✅ meadow, forest, swamp, desert/oasis, frost, ember, highlands, beaches |
| Biome monsters + roaming world bosses | ✅ 11 monster types, 7 named bosses (King Wobble, Old Rootback, The Bogfather, Glasshide, Whitepine Warden, Red Crag, Scar Warden) |
| XP, levels, stat points (Speed/Strength/Armour/Health) | ✅ Strength, Vitality, Agility, Defence |
| Loot, gold, rarity (common → mythic), inventory, equipment (weapon, armour, 2 rings) | ✅ 20-slot bag, drag to rearrange, drop, sell |
| Shops (buy/sell) | ✅ Pip's Provisions, Anvil & Ember |
| Local chat, `/home`, `/who`, `/roll` | ✅ plus `/where`, speech bubbles |
| Day/night cycle | ✅ with lit windows, lamps and fireflies |
| Mobile touch controls | ✅ joystick, attack/interact buttons, drag to rotate camera |
| Minimap | ✅ |
| Health endpoint, stress tool, smoke tests | ✅ |

### Milestone 2: progression and town life 🔜

Talent trees (3 trees × 3 tiers per class, hotbar abilities: Precise Shot … Battle Cry), the
quest system and the 29 v1 quests (onboarding tour, kill/location/talk steps, quest panel, map
markers), NPC daily schedules (commute, pub evenings), mounts (Stable Keeper Holt, horse /
hoverboard), waypoint obelisks + fast travel, parties, player trading, emotes.

### Milestone 3: housing and professions 🔜

Buyable houses with interiors as their own maps (deeds, house chests, furniture and decorate
mode, two-storey homes and the sky promenade); six professions (fishing, woodcutting, herbalism,
mining, cooking, smithing) with resource nodes, tools, crafting stations and food buffs.

### Milestone 4: the sci-fi realm 🔜

Stargate → Orbital Station map; flyable ships (combat lanes, warp, docking), asteroid corridors,
procedural planet surfaces with mining rigs, station defences, tech dungeons I–III, orbital
courier runs.

### Milestone 5: oceans and dungeons 🔜

Seafarer Cave → Boundless Ocean (100+ islands, Port Bilgewater, sailing ships with walkable
decks, cannons, docking, pirate crews and the pirate quest line); cave dungeons; group dungeon
instances with parties.

### Milestone 6: minigames and polish 🔜

The ~20 minigames (darts, Balathor Hold'em, memory tiles, training dummy, consecration ring,
perimeter relay, river swim trial, wayfarer's board, caravan escort, courier/fletcher runs, town
vault, appraiser, hollow stone, trophy pedestal, bounty boards, turret defence, asteroid lane,
orbital courier), AI-driven NPC chat, leaderboards, audio and music, settings menu, desktop
(Electron) build.
