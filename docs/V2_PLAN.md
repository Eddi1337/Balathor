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

### Milestone 2: progression and town life ✅

| v1 feature | v2 |
|---|---|
| Talent trees, 3 trees × 3 tiers per class | ✅ 27 abilities (Precise Shot … Battle Cry): projectiles (multishot, piercing, slowing), novas (stun, blind, knockback), lingering zones (Rain of Arrows, Caltrops, Inferno, Blizzard, Consecration), buffs (shields, evasion, camouflage, fortify, haste, rage, party regen) and heals; tiers unlock at levels 2/5/9; respec at Guildmaster Oswin |
| Ability hotbar | ✅ keys 1-5, drag talents onto it, cooldown sweeps |
| Quests (kill / location / talk), quest panel, markers | ✅ 20 quests incl. onboarding, collect quests, guard bounties, biome bosses and a road-exploration quest; offer dialog, quest log (L), tracker, ! / ? markers over villagers, minimap objective star |
| NPC daily schedules (commute, pub evenings) | ✅ villagers pathfind between shop, inn and home by the in-game clock and go indoors at night |
| Mounts (Stable Keeper Holt) | ✅ Fluffy Pony (350g), M to ride, +60% speed, dismounts on combat/swimming |
| Waypoint obelisks + fast travel | ✅ 9 obelisks along the roads; attune by walking near; travel for 12g (home is free) |
| Parties | ✅ up to 5; shared XP + quest kill credit nearby, party frames, party chat (/p), party-wide buffs and heals |
| Player trading | ✅ request → offer items + gold → both ready → atomic swap; any change un-readies |
| Emotes | ✅ wave, dance, cheer, bow, sit, laugh, cry, love (menu or /commands) |

### Milestone 3: the White City, housing and professions ✅

| v1 feature | v2 |
|---|---|
| Starting town | ✅ Hearthmoor became a grand White City: five walled tiers climbing a hill, about 10x the area; terraced streets of joined two-storey houses, archways over the roads, gatehouses, the market, the White Tree and a citadel castle with the King in his throne room; forests and farmland outside the walls |
| Water | ✅ Rivers (Silverrun, Frostbrook) with bridges, flowing water whose current carries swimmers (shared server/client physics), fountain spray with droplet physics and ripples, swim splashes |
| Movement | ✅ Jumping (Space); characters are soft cubes |
| Buyable houses with interiors | ✅ 24 plots on tiers 1-3 (1200 / 1800 / 3000g), each interior is its own map; tier-3 manors have two floors; sell back for half; lock, or open to everyone (party members can always enter) |
| Furniture + decorate mode | ✅ 15 pieces from Marta's Furnishings; H to decorate, R to rotate, placement rules (no overlap, door kept clear, 40 per floor) |
| House chests | ✅ 30-slot storage in any placed chest, shared across your home |
| Six professions | ✅ Woodcutting, Mining, Herbalism and Fishing gather from the world's own trees, rocks, flowers, bushes, fields and water (tools from Bram, biome-tiered nodes with level requirements, nodes regrow after 60s); Cooking at campfires and Smithing at the market forge; levels 1-30 (P panel) |
| Fishing minigame | ✅ cast → bobber → bite → press E within the window to reel in; biome and river fish tables |
| Food buffs | ✅ cooked food heals and grants a timed damage / armour / speed / regen buff; smithing makes bars, rings, whetstone tonics and forged class weapons |

### Milestone 4: the sci-fi realm ✅

| v1 feature | v2 |
|---|---|
| Stargate → orbital station | ✅ Starfall Circle outside the main gate (Gatekeeper Astra) → Ringforge Station, a walkable deck: stargate hall, concourse with holo-fountain, shipyard, shipwright, quartermaster, café, workshop (fabricator + galley), hangar bay, lifts to the labs. Its own map, so there are no "which world is this?" lookups |
| Flyable ships | ✅ Four hulls (Bumblebee Skiff, Comet Corvette, Puffin Hauler, Starling Frigate) with a tiny pilot in the cockpit; shared, predicted flight model (turn, thrust, drift, afterburner); multi-gun lasers, frigate drone turrets, mining-laser bonus; four upgrade tracks (engines, shields, lasers, plating) shared by all your ships |
| Combat lanes, station defences | ✅ Shields soak hits before the hull; disabled ships get towed home; repair kits; Ringforge's guns protect a safe zone; pirate fighters, gunships, scrap drones, void wraiths and Captain Vex |
| Warp, docking | ✅ Warp drive (J) to any discovered place, interrupted by enemy fire; dock with E in the station ring (free repairs) |
| Asteroid corridors | ✅ South Belt, Ember Belt and Void Rift with ferrite, titanium and iridium asteroids, plus the Derelict Helix wreck field; a tractor beam scoops up loot |
| Procedural planets with mining | ✅ Aurelia, Icefall and Rust are their own maps: land from orbit, launch from the pad; alien flora and ore for the gathering professions, creatures, bosses and guide NPCs with quests |
| Tech dungeons I–III | ✅ Seeded room-and-corridor labs below Ringforge (levels 10/18/26) with security bots, turrets, sentinels and Overseers Mk I–III. Instancing for groups comes with M5 |
| Orbital courier runs | ✅ Courier Run quest plus repeatable jobs (Kestrel freight, pirate bounty, titanium order) |

### Milestone 5: oceans and dungeons ✅

| v1 feature | v2 |
|---|---|
| Seafarer Cave → Boundless Ocean | ✅ A cave mouth in the forest belt south-west of the city (Old Salt Pete) tunnels under the sea to Port Bilgewater; the ocean is its own map with 126 seeded islands (palm, jungle, rocky, ruins, pirate camps, treasure isles, Turtle Cove, Smuggler's Rest, Skull Isle) |
| Port Bilgewater | ✅ Tavern, shipwright, provisioner, harbourmaster, Captain Marlow's house, lighthouse, long pier and jetties |
| Sailing ships with walkable decks | ✅ Sloop, brig and galleon. Crews walk the planks while she sails (deck-local coordinates, predicted on the client), take the wheel at the stern, raise or furl the sails; wind and points of sail; running aground; summon at the harbour; sinking washes you ashore |
| Cannons, docking | ✅ Broadsides from the helm or single cannons at the rails; board from the pier or any shore, step ashore next to land; party members can crew your ship |
| Pirate crews and the pirate quest line | ✅ Pirate sloops and frigates that shoot hulls, brutes, gunners, skeletons, sharks, the Kraken and Dread Captain Gristle; treasure map scraps and digging at the X; Marlow's seven-quest line and Hermit Bo's shell job |
| Cave dungeons | ✅ The Mossy Grotto (lv 5), Ember Depths (lv 15) and Frostbite Caverns (lv 20): cellular-automaton caverns with themed walls, glowing props, pools or lava, bats, bosses and Guildmaster Oswin's quests |
| Group dungeon instances | ✅ Every party gets its own copy of the Sunken Temple (lv 16, under Turtle Cove), the Hollow King's Crypt (lv 24, western highlands) and Tech Labs I–III, with monsters scaled to the party's size; instances close two minutes after the last player leaves; dying or logging out inside returns you to the entrance |

### Milestone 6: minigames and polish 🔜

The ~20 minigames (darts, Balathor Hold'em, memory tiles, training dummy, consecration ring,
perimeter relay, river swim trial, wayfarer's board, caravan escort, courier/fletcher runs, town
vault, appraiser, hollow stone, trophy pedestal, bounty boards, turret defence, asteroid lane,
orbital courier), AI-driven NPC chat, leaderboards, audio and music, settings menu, desktop
(Electron) build.
