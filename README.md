# Balathor

Balathor is a sprite-based fantasy MMO with two applications:

- `server`: an authoritative Node.js simulation server with a custom WebSocket transport and Dockerfile.
- `client`: a Windows-friendly HTML5 canvas client that can be run in a browser now and packaged with the Electron scaffold in `client/desktop`.

Players create an account, customise their character, and drop into a living shared world. Movement is server-authoritative (WASD or mobile joystick), characters persist across sessions, and chat is visible only to nearby players.

## Worlds

The game map is divided into distinct realms, each with its own visual theme and activities.

**Fantasy Realm** — the starting world. A walled hub town sits at the centre, surrounded by open wilderness split into biomes: Forest, Swamp, Savanna/Desert, Oasis, Frost Tundra, Ember Coast, and Badlands. Each biome has its own enemy roster and a roaming world boss.

**Sci-Fi Orbital Station** — a space station reached through a stargate in the hub town. Home to ship combat in outer lanes, orbital courier runs, asteroid corridor flying, and three tech-dungeon terminals.

**The Boundless Ocean** — a massive open-water world dotted with 100+ small islands, each with sandy beaches, a grassy centre, a port pier, and its own content (enemies, traders, loot, critters, or scenery). Reached through the Seafarer Cave; arriving lands you on a dock with your own boat moored alongside. Island layouts are data-driven in `content/worlds/oceanus/islands.json` (regenerate with `node tools/generateOceanus.mjs`).

**Planet Surfaces** — discrete planet maps (e.g. Planet Rust) accessible from the orbital station, each with a mining rig and unique terrain.

## Player Classes

Choose one of three classes at character creation. Your class determines your weapon, attack range, and talent tree.

| Class | Weapon | Attack style | Range | Cooldown |
|-------|--------|-------------|-------|----------|
| **Ranger** | Bow | Projectile (arrow) | 15 tiles | 560 ms |
| **Mage** | Staff | Projectile (fireball) | 29 tiles | 780 ms |
| **Knight** | Sword & Shield | Melee swing | 2 tiles | 420 ms |

Knights can **block** incoming damage with their shield — block chance scales with equipment rarity (20 % common → 72 % mythic).

### Talent Trees

Each class has three talent trees with three tiers of abilities. Spend talent points (earned on level-up) to unlock them in tier order.

**Ranger:** Precise Shot → Piercing Arrow → Rain of Arrows · Caltrops → Evasion → Camouflage · Multishot → Smoke Bomb → Volley

**Mage:** Fireball → Fire Nova → Inferno · Ice Shard → Frost Barrier → Blizzard · Arcane Bolt → Mana Shield → Time Warp

**Knight:** Shield Bash → Divine Shield → Fortify · Holy Strike → Consecration → Divine Wrath · Healing Aura → Lay on Hands → Battle Cry

## Mounts & Fast Travel

**Mounts** can be purchased from Stable Keeper Holt (hub town, near the market) for 350 gold. Once owned, press **M** (or the Mount button on mobile) to toggle riding. Mounts increase movement speed by 70 %. Riding is disabled in the Boundless Ocean, on ship decks, and on upper-story balconies. Entering a portal, boarding a ship, taking damage, or attacking automatically dismounts you. The mount sprite changes with the world theme: a horse in the Fantasy realm, a hoverboard on the sci-fi station and planet surfaces.

**Waypoint obelisks** are placed throughout each world. Walk near one to unlock it; once unlocked, press **E** next to any obelisk to open the travel menu and fast-travel to another unlocked waypoint in the same world for 15 gold. Waypoints are same-world only — cross-world travel still uses portals.

## Home Decoration

House owners can furnish their interior with up to 12 furniture types: bed, table, chair, rug, bookshelf, fireplace, potted plant, wall painting, lantern stand, storage cabinet, weapon rack, and trophy stand. Buy pieces from **Marta's Workshop** (hub town carpenter, near the market at 20,12) then enter your house and press **D** to open the Decorate panel. Select a piece and click a floor tile to place it; click a placed piece in the panel to retrieve it. Furniture persists in `world.sqlite` alongside house deeds. Non-walkable furniture physically blocks movement. Mobile players can view and pick up placed furniture; placement is desktop-only.

## Professions

Six gathering and crafting skills — each with levels 1–30 and XP — let you harvest resources, catch fish, and craft consumables.

| Profession | How to level | Tool required |
|---|---|---|
| **Fishing** | Catch fish near water | Fishing Rod |
| **Woodcutting** | Chop trees in forest/savanna biomes | Hatchet |
| **Herbalism** | Harvest plants in swamp/oasis/frost biomes | Sickle |
| **Mining** | Mine ore rocks in badlands/ember/frost biomes | Pickaxe |
| **Cooking** | Cook at campfires (hub or biome camps) | — |
| **Smithing** | Forge ore into bars and goods at the forge | — |

Buy tools from **Fisherman Bram** (hub river, near -8, 50). Walk near any resource node and press **E** to gather; a progress bar shows while you work. Depleted nodes respawn after 90 seconds.

**Fishing** works anywhere near water in the fantasy realm and throughout Oceanus. Cast with **E**, wait for the bite prompt, then press **Catch** (or **Space**) before the window closes. Higher fishing level unlocks rarer catches.

**Cooking** recipes are available at the campfire (hub square, ~-5, 28). **Smithing** recipes are at Tamsin's Forge (~54, 42). Cooked food and smith tonics grant temporary stat buffs (speed, strength, armour, or health regen) lasting 3 minutes. Consume food from your inventory bag.

Press **P** to open the Professions panel and track your levels and XP.

*Scope note: Smithing produces bars, sellable blades/fittings, and stat tonics. Full weapon/armour gear crafting (integrating with the rarity system) is deferred to a future milestone.*

## Progression

Characters gain XP from combat and mini-games. On level-up you receive a talent point; you can also spend stat points on **Speed**, **Strength**, **Armour**, or **Health** via the in-game stat panel. Gold dropped by enemies and earned from activities can be traded with other players or spent at market NPCs.

## Enemies & World Bosses

Enemy difficulty scales with biome. Each biome has a named world boss that roams the wilderness.

| Biome | World Boss |
|-------|-----------|
| Forest | Old Rootback |
| Swamp | The Bogfather |
| Desert/Oasis | Glasshide |
| Frost Tundra | Whitepine Warden |
| Ember Coast | Red Crag |
| Savanna | Plains Reaver |
| Tundra | Frost Herald |
| Badlands | Scar Warden |

Starter camps (Bracken Post, Muddy Bank) serve as easy entry points with lower-level enemies and dedicated bounty boards.

## Mini-Games

Interactive sites placed throughout each world reward gold, XP, trophies, and leaderboard scores. Walk up to a site and interact to begin.

**Fantasy hub:**
- **Dart board** — precision throw challenge
- **Card table** — Balathor Hold'em (poker variant)
- **Memory tiles** — match pairs
- **Training dummy** — strike for score
- **Consecration ring** — hold the sanctum ground (Knight-focused)
- **Town perimeter relay** — 4-checkpoint foot race
- **River swim trial** — 4-buoy swimming course
- **Wayfarer's board** — biome scavenger hunt (visit Oasis, Frost, and Ember beacons)
- **Caravan escort** — protect a caravan through hostile territory
- **Courier crate / Fletcher delivery** — timed delivery runs
- **Town vault** — deposit heavy coin for safekeeping
- **Appraiser** — estimate the value of your inventory
- **Hollow stone** — seasonal night offering
- **Trophy pedestal** — display earned prizes
- **Camp bounty boards** — clear starter camps for rewards

**Sci-Fi station:**
- **Defense turret pad** — hold the line against incoming waves
- **Asteroid lane** — fly a debris corridor
- **Tech dungeon terminals I–III** — instanced encounters
- **Orbital courier drop** — cross-station timed delivery

**Planet Rust:**
- **Mining rig** — extract ore with a mining beam

## Quests

NPC quest givers are stationed around the hub town and in biome wilderness areas. Quests mix location visits, enemy kills, and NPC conversations. Early quests walk new players through the town; later quests send them into biomes and through the stargate.

Notable quest givers: Guide Rin (onboarding tour), Sage Wynn (home tree), Gatewarden Mara (town gate), Elder Elm, Borin Reed (market), Lira Brook, Tamsin Anvil, and biome NPCs like Iona Marsh (swamp) and Vaela Snowmend (frost).

## NPC Simulation

The hub town is populated by NPCs with daily schedules tied to a 10-minutes-per-day game clock. Villagers leave home at dawn, commute to town, stroll waypoints during the day, gather at the pub in the evening (18:00–22:00 game time), and walk home at night. Guards and wall archers hold their posts; traders stock their stalls; couriers and fletchers run supply routes continuously.

## Social Features

- **Local chat** — visible only to players in range of the speaker
- **Party system** — group up with nearby players
- **Player trading** — exchange gold and items directly with another player
- **Emotes** — use `/wave` and other emotes at world beacons to complete scavenger milestones
- **Discord notifications** — account creation and login events are posted to a configurable Discord webhook

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

### Discord login / signup notifications

The game server posts to Discord whenever an account is **created** or someone **logs in** successfully (failed logins are not reported). Each message includes **username**, **event**, and **UTC time** (Discord embed timestamp plus text fields).

**Default**

A built-in Incoming Webhook URL lives in `server/src/discordWebhook.js` so the server works without extra config.

**Override**

Set **`DISCORD_AUTH_WEBHOOK_URL`** if you want a different channel or if the repo/build is shared (webhook URLs are effectively secrets):

```bash
export DISCORD_AUTH_WEBHOOK_URL='https://discord.com/api/webhooks/…'
npm run server
```

If the env value is invalid, the server warns and falls back to the built-in URL.

**Create or rotate a webhook (Discord)**

Channel **Edit** → **Integrations** → **Webhooks** → **New webhook** (or regenerate URL on an existing webhook), then paste the URL into env or replace the constant in code.

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

House deeds, chests, and floor loot persist in **`world.sqlite`** (path from **`WORLD_DB_PATH`**, default `server/data/world.sqlite` when running locally, or **`/app/data/world.sqlite`** in the bundled image).

**Important:** Containers are ephemeral unless you attach a volume, e.g.:

```bash
docker run --rm -p 8080:8080 -v balathor-world-data:/app/data balathor-server
```

Without a mounted `/app/data`, ownership resets when the container is removed.

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

Pushes to `main` or `master` build `./server` and `./client` on the self-hosted Balathor runner, publish the images to Harbor as `harbor.edmundmurphy.com/balathor/server` and `harbor.edmundmurphy.com/balathor/client`, then deploy `docker-compose.prod.yml` to `/root/balathor` on `192.168.10.112`.

The workflow expects the same repository secrets as the other deployed repos:

- `HARBOR_USERNAME`
- `HARBOR_PASSWORD`
- `DEPLOY_SSH_PRIVATE_KEY`

The production server container maps host port `8082` to the server's internal `8080`. The production web client container maps host port `8083` to the client's internal `3000`.

The client dev server reads `GAME_SERVER_URL`, so a custom endpoint can be used like this:

```bash
GAME_SERVER_URL=ws://localhost:8080/ws npm run client
```

## AI-Friendly Code Navigation

For future AI-assisted edits, use the project section map in `docs/AI_CODE_MAP.md`. It breaks server/client code into stable areas and recommends scoped-edit workflows.

## Current Architecture

The server owns:

- account login and saved character state
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

- `auth`: creates an account or logs into an existing account.
- `hello`: sends player name, class, torso style/colour, and weapon style/colour.
- `input`: sends current movement key state.
- `view`: sends the current camera viewport used for local chat visibility.
- `chat`: sends a player chat line to the server.
- `attack`: uses the player's class weapon.
- `home`: teleports the player back to the spawn square.
- `spendStat`: spends a level-up point on speed, strength, armour, or health.
- `interact`: opens a nearby chest or picks up nearby loot.
- `pickupGroundItem`: picks up a clicked ground item after the server validates range.
- `equipItem`, `unequipItem`, `useItem`, `dropItem`: manages equipment and bag items.
- `requestChunks`: asks the server for world chunks around the camera.

Server to client:

- `auth`: confirms account login/create status.
- `welcome`: confirms the player's id and world settings.
- `chatHistory`: sends recent server-side chat history visible to this player.
- `chat`: sends a server-accepted local chat line to nearby visible clients.
- `chunk`: streams generated tile data for one chunk.
- `snapshot`: sends authoritative player positions.
- `combat`: broadcasts sword swings, arrows, fireballs, hits, damage, and shield blocks.
- `serverMessage`: sends connection or validation messages.

## Account Persistence

The server stores local account data in `server/data/accounts.json` by default. Passwords are salted and hashed with PBKDF2. Set `ACCOUNT_STORE_PATH=/path/to/accounts.json` to place the account file somewhere persistent for a deployment.

## Next Milestones

- combat and enemy simulation
- item drops and inventory
- persistent shard state
- binary protocol and interest management
- desktop Windows packaging
