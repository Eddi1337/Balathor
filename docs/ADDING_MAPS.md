# Adding maps and worlds (AI agent guide)

Balathor separates **game modes**, **logical worlds**, and **map content** so you can add large amounts of terrain without editing the 2,700-line `world.js` file.

## Quick reference

| Task | Where to work |
|------|----------------|
| Register a new logical world | `content/worlds/manifest.json` + optional bounds in `server/src/worlds/registry.js` |
| Hand-made tile island / dungeon | `content/maps/<name>.json` (see schema below) |
| Fantasy portals | `content/worlds/fantasy/portals.json` |
| Pirate open sea (preview) | `server/src/worlds/pirateWorld.js` (reserved coords in manifest) |
| Procedural fantasy biomes | Still in `server/src/world.js` (migrate incrementally) |
| Sci-fi / planets | `server/src/worlds/sciFiWorld.js`, `planetWorlds.js` |

## Game modes vs worlds

- **Game mode** (`balathor`, `pirate`): product / rules family. Pirate mode uses reserved coordinates and its own theme.
- **World id** (`fantasy`, `scifi`, `planet:planet_rust`, `pirate`, `void`): used for entity isolation, mob buckets, and chunk streaming. Players only see others in the same world id.

Resolution order lives in `server/src/worlds/registry.js`: planets first, then registered worlds by priority.

## Hand-made map file schema

Create `content/maps/my-island.json`:

```json
{
  "id": "my_island",
  "label": "My Island",
  "worldId": "fantasy",
  "originX": 200,
  "originY": 300,
  "width": 16,
  "height": 16,
  "replaceBase": false,
  "tiles": [0, 0, 2, 2, ...]
}
```

Or use run-length encoding for smaller files:

```json
"tiles": {
  "encoding": "rle",
  "data": [[2, 64], [10, 32], [0, 128]]
}
```

- `worldId` must match a registered world (`fantasy`, `pirate`, or a custom id from manifest).
- `originX` / `originY` are world tile coordinates (top-left of the map).
- `tiles` length must equal `width * height`.
- Tile indices match `TILE` in `server/src/world.js` (0 = GRASS, 2 = WATER, 10 = SAND, …).
- `replaceBase: true` skips procedural generation under the footprint (use for dungeons).

Maps are loaded automatically from `content/maps/*.json` at server boot (`server/src/maps/mapLoader.js`).

## Pirate mode coordinates

The pirate preview world occupies **x: 200000–280000, y: -40000–40000** (see `content/worlds/manifest.json`). Place hand-made islands there with `"worldId": "pirate"` so they do not overlap Balathor.

## API surfaces

- `GET /health` includes `worlds` and `maps` catalog summaries.
- Chunks now include `worldId` alongside `theme`.
- `world.worldIdAt(x, y)` and `world.resolveWorldAt(x, y)` are exported from `world.js`.

## Testing

```bash
npm run smoke
```

Add assertions in `tests/smoke.mjs` when you add maps that gameplay depends on.

## What not to do

- Do not add large tile arrays inside `world.js` — use `content/maps/`.
- Do not overlap world bounds in manifest without namespacing chunk cache keys (future instanced maps will use `worldId:cx,cy`).
