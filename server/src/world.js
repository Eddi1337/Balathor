const CHUNK_SIZE = 16;

const TILE = {
  GRASS: 0,
  TREE: 1,
  WATER: 2,
  STONE: 3,
  PATH: 4,
  FLOWERS: 5,
  DARK_GRASS: 6,
  WALL: 7,
  FLOOR: 8,
  DOOR: 9,
  SAND: 10,
  SNOW: 11,
  LAVA: 12,
  PORTAL: 13,
  CARPET: 14,
  BED: 15,
  TABLE: 16,
  SHELF: 17,
  FIREPLACE: 18,
};

const BLOCKED_TILES = new Set([TILE.WATER, TILE.WALL, TILE.LAVA, TILE.BED, TILE.TABLE, TILE.SHELF, TILE.FIREPLACE]);
const PORTAL_RADIUS = 1.6;
const DOOR_RADIUS = 0.52;
const INTERIOR_BASE_X = 10000;
const INTERIOR_BASE_Y = 10000;
const INTERIOR_SPACING = 40;
const INTERIOR_EXTERIOR_MARGIN = 12;
const PROCEDURAL_INTERIOR_GRID_SIZE = 1024;
const PROCEDURAL_INTERIOR_GRID_OFFSET = 512;
const STARTING_AREA = { x: 0, y: 0, radius: 80 };
const START_SPAWN = { x: 0, y: 0 };

function hash2(x, y, seed = 1337) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// Hand-crafted buildings: starting town + portal destinations only.
const BUILDINGS = [
  // Central village – spread around the circular plaza, each with its own approach path.
  // North
  { x:  -6, y: -28, w: 11, h:  9, name: "Home",             type: "house",     forSale: false },
  { x:  20, y: -36, w:  8, h:  7, name: "Smith's Hut",       type: "hut",       forSale: false },
  { x: -30, y: -50, w: 10, h:  8, name: "Ranger's Post",     type: "treehouse", forSale: false },
  { x: -48, y: -26, w: 12, h:  9, name: "Blue Tavern",       type: "house",     forSale: false },
  // East
  { x:  38, y: -24, w: 16, h: 12, name: "Red Manor",         type: "big_house", forSale: true  },
  { x:  64, y: -20, w: 10, h:  8, name: "Hunter's Lodge",    type: "treehouse", forSale: false },
  { x:  34, y:   4, w:  8, h:  7, name: "East Hut",          type: "hut",       forSale: true  },
  { x:  48, y:  20, w: 12, h:  9, name: "Garden House",      type: "house",     forSale: true  },
  { x:  54, y:  36, w:  8, h:  7, name: "Herb Hut",          type: "hut",       forSale: true  },
  // West
  { x: -28, y: -10, w:  8, h:  7, name: "Weaver's Hut",      type: "hut",       forSale: false },
  { x: -54, y:   8, w:  8, h:  7, name: "Miller's Hut",      type: "hut",       forSale: true  },
  { x: -52, y:  22, w: 12, h:  9, name: "Market Hall",       type: "house",     forSale: false },
  // South
  { x: -14, y:  36, w: 20, h: 16, name: "Town Keep",         type: "castle",    forSale: false },
  { x:  18, y:  56, w:  8, h:  7, name: "South Hut",         type: "hut",       forSale: true  },
  { x: -38, y:  56, w:  8, h:  7, name: "West Hut",          type: "hut",       forSale: true  },
  // Desert Oasis – no overlaps, each building separated by ≥8 tiles
  { x: 574, y: 472, w: 20, h: 16, name: "Oasis Keep",        type: "castle",    forSale: false },
  { x: 604, y: 470, w: 16, h: 12, name: "Oasis Palace",      type: "big_house", forSale: false },
  { x: 588, y: 496, w: 10, h:  8, name: "Clay House",        type: "house",     forSale: false },
  { x: 618, y: 490, w:  8, h:  7, name: "Sun Hut",           type: "hut",       forSale: false },
  // Frost Village
  { x: -622, y: -500, w: 20, h: 16, name: "Frost Keep",      type: "castle",    forSale: false },
  { x: -596, y: -500, w: 10, h:  8, name: "Snow House",      type: "house",     forSale: false },
  { x: -614, y: -478, w:  8, h:  7, name: "Pine Hut",        type: "hut",       forSale: false },
  { x: -590, y: -480, w: 10, h:  8, name: "Ranger Post",     type: "treehouse", forSale: false },
  // Ember Camp
  { x: 558, y: -540, w: 20, h: 16, name: "Ember Citadel",    type: "castle",    forSale: false },
  { x: 584, y: -540, w: 10, h:  8, name: "Ash House",        type: "house",     forSale: false },
  { x: 566, y: -518, w:  8, h:  7, name: "Forge Hut",        type: "hut",       forSale: false },
  { x: 582, y: -520, w: 10, h:  8, name: "Watcher's Perch",  type: "treehouse", forSale: false },
];

// Fixed village clearing zones — only starting town + portal destinations.
const VILLAGES = [
  { cx:   0, cy:   0, r: 82 }, // Central Village
  { cx: 600, cy: 490, r: 52 },
  { cx: -600, cy: -490, r: 52 },
  { cx: 580, cy: -530, r: 52 },
];

// Road segments for fixed villages only.
const STREET_SEGMENTS = [
  // Main roads radiate outward from the circular plaza (wide, w=1 = 3 tiles wide)
  { x1: -70, y1:  0, x2:  70, y2:  0, w: 1 },  // East-west main road
  { x1:   0, y1: -70, x2:   0, y2: 70, w: 1 },  // North-south main road

  // North buildings — branch off N-S road
  { x1:   0, y1: -28, x2:   1, y2: -28 },        // Home: N-S road already passes door
  { x1:  24, y1: -36, x2:  24, y2:   0 },         // Smith's Hut spur
  { x1: -25, y1: -42, x2:   0, y2: -42 },         // Ranger's Post: east branch
  { x1: -25, y1: -50, x2: -25, y2: -42 },         // Ranger's Post: north spur
  { x1: -42, y1: -17, x2: -42, y2:   0 },         // Blue Tavern spur
  { x1: -48, y1: -17, x2: -42, y2: -17 },         // Blue Tavern: west branch

  // East buildings — branch off E-W road
  { x1:  46, y1: -12, x2:  46, y2:   0 },         // Red Manor spur
  { x1:  62, y1: -12, x2:  62, y2:   0 },         // Hunter's Lodge south spur
  { x1:  62, y1: -12, x2:  69, y2: -12 },         // Hunter's Lodge east branch
  { x1:  38, y1:   0, x2:  38, y2:  11 },         // East Hut spur
  { x1:  54, y1:   0, x2:  54, y2:  29 },         // Garden House spur
  { x1:  54, y1:  29, x2:  58, y2:  29 },         // Garden→Herb connector
  { x1:  58, y1:  29, x2:  58, y2:  43 },         // Herb Hut spur

  // West buildings — branch off E-W road
  { x1: -24, y1:   0, x2: -24, y2:  -3 },         // Weaver's Hut spur
  { x1: -50, y1:   0, x2: -50, y2:  15 },         // Miller's Hut spur
  { x1: -46, y1:   0, x2: -46, y2:  31 },         // Market Hall spur
  { x1: -52, y1:  22, x2: -46, y2:  22 },         // Market Hall west branch

  // South buildings — branch off N-S road
  { x1:  -7, y1:  36, x2:   0, y2:  36 },         // Town Keep north door branch
  { x1:  22, y1:   0, x2:  22, y2:  63 },         // South Hut spur
  { x1: -34, y1:   0, x2: -34, y2:  63 },         // West Hut spur

  // Portal destination villages
  // Oasis
  { x1: 574, y1: 482, x2: 628, y2: 482 },         // horizontal cross-road
  { x1: 600, y1: 470, x2: 600, y2: 522 },         // vertical: buildings to portal
  // Frost
  { x1: -622, y1: -484, x2: -578, y2: -484 },     // horizontal cross-road
  { x1: -600, y1: -500, x2: -600, y2: -458 },     // vertical: buildings to portal
  // Ember
  { x1: 558, y1: -524, x2: 596, y2: -524 },       // horizontal cross-road
  { x1: 580, y1: -540, x2: 580, y2: -503 },       // vertical: buildings to portal
];

const PORTALS = [
  { id: "portal_oasis", name: "Oasis Gate",  x:  46, y:  0, targetX: 600, targetY: 522, color: "#f2c45f" },
  { id: "portal_frost", name: "Frost Gate",   x: -46, y:  0, targetX: -600, targetY: -458, color: "#9ee7ff" },
  { id: "portal_ember", name: "Ember Gate",   x:   0, y: 60, targetX: 580, targetY: -503, color: "#ff7a45" },
  { id: "portal_hub_oasis", name: "Hub Gate", x: 600, y: 522, targetX: 0, targetY: 0, color: "#8fe388" },
  { id: "portal_hub_frost", name: "Hub Gate", x: -600, y: -458, targetX: 0, targetY: 0, color: "#8fe388" },
  { id: "portal_hub_ember", name: "Hub Gate", x: 580, y: -503, targetX: 0, targetY: 0, color: "#8fe388" },
];

function nearFixedBuilding(tx, ty, pad = 9) {
  for (const b of BUILDINGS) {
    if (tx >= b.x - pad && tx < b.x + b.w + pad && ty >= b.y - pad && ty < b.y + b.h + pad) {
      return true;
    }
  }
  return false;
}

function buildScatterEnemyCamps() {
  const out = [];
  let scatterId = 0;

  for (let ring = 88; ring < 735; ring += 30) {
    const sectors = Math.max(12, Math.min(34, Math.floor(ring / 24)));
    for (let i = 0; i < sectors; i += 1) {
      const pick = hash2(ring, i, 6100);
      if (pick > 0.48) continue;

      const angle = (i / sectors + pick * 0.14) * Math.PI * 2;
      let tx = Math.round(Math.cos(angle) * ring + (hash2(i, ring, 6101) - 0.5) * 24);
      let ty = Math.round(Math.sin(angle) * ring + (hash2(ring, i, 6102) - 0.5) * 24);

      if (Math.hypot(tx, ty) < 88) continue;
      if (Math.hypot(tx - 600, ty - 490) < 54) continue;
      if (Math.hypot(tx + 600, ty + 490) < 54) continue;
      if (Math.hypot(tx - 580, ty + 530) < 54) continue;
      if (nearFixedBuilding(tx, ty)) continue;

      const tierGuess = Math.min(6, Math.max(1, Math.floor(ring / 96)));
      const cappedTier = Math.min(6, tierGuess + (hash2(tx, ty, 6103) > 0.82 ? 1 : 0));
      let size = 5 + Math.floor(hash2(tx, ty, 6104) * 4) + (cappedTier >= 4 ? 1 : 0);
      size = Math.min(Math.max(size, 4), 9);

      scatterId += 1;
      const bossRoll = hash2(tx, ty, 6105);
      const boss = cappedTier >= 3 && bossRoll > 0.87;

      out.push({
        id: `scatter_wild_${scatterId}`,
        x: tx,
        y: ty,
        size,
        tier: cappedTier,
        ...(boss ? { boss: true } : {})
      });
    }
  }

  return out;
}

const BASE_ENEMY_CAMPS = [
  // Tier 1 — near hub (50–160 tiles)
  { id: "north_woods",    x:  -80, y: -130, size: 4, tier: 1 },
  { id: "east_copse",     x:  130, y:  -60, size: 5, tier: 1 },
  { id: "south_ford",     x:   90, y:  130, size: 4, tier: 1 },
  { id: "west_bramble",   x: -140, y:   80, size: 5, tier: 1 },
  { id: "creek_watch",    x:  160, y:   40, size: 4, tier: 1 },
  { id: "trail_post",     x:  -60, y:  170, size: 4, tier: 1 },
  { id: "ridge_camp",     x:  -30, y: -160, size: 4, tier: 1 },
  { id: "hollow_band",    x:  150, y: -110, size: 4, tier: 1 },
  // Tier 2 — mid range (160–320 tiles)
  { id: "briar_gate",     x:   50, y: -240, size: 5, tier: 2 },
  { id: "moss_ring",      x: -220, y:   10, size: 5, tier: 2 },
  { id: "deep_pines",     x: -185, y:  -65, size: 6, tier: 2, boss: true },
  { id: "old_road",       x:   65, y: -185, size: 6, tier: 2, boss: true },
  { id: "far_meadow",     x: -270, y:  225, size: 6, tier: 2, boss: true },
  { id: "flower_den",     x:  175, y:  230, size: 5, tier: 2 },
  { id: "thistle_bend",   x: -315, y:  135, size: 5, tier: 2 },
  { id: "canyon_watch",   x:  270, y:  -95, size: 5, tier: 2 },
  { id: "glade_post",     x: -245, y: -195, size: 5, tier: 2 },
  { id: "iron_fork",      x:  210, y:  170, size: 5, tier: 2 },
  { id: "dark_crossing",  x: -180, y:  260, size: 5, tier: 2 },
  { id: "salt_run",       x:  300, y:  130, size: 5, tier: 2 },
  // Tier 3 — outer ring (320–470 tiles)
  { id: "clover_ruins",   x:   25, y:  310, size: 6, tier: 3, boss: true },
  { id: "oasis_raiders",  x:  295, y:  155, size: 7, tier: 3, boss: true },
  { id: "sunken_dunes",   x:  190, y:  275, size: 5, tier: 3 },
  { id: "frost_ridge",    x: -295, y: -155, size: 7, tier: 3, boss: true },
  { id: "snow_hollow",    x: -180, y: -275, size: 5, tier: 3 },
  { id: "ember_watch",    x:  310, y: -195, size: 7, tier: 3, boss: true },
  { id: "ash_fields",     x:  165, y: -300, size: 5, tier: 3 },
  { id: "stone_circle",   x: -205, y:  325, size: 6, tier: 3, boss: true },
  { id: "pine_barricade", x: -155, y: -400, size: 5, tier: 3 },
  { id: "bone_crossing",  x:  350, y:  -40, size: 6, tier: 3 },
  { id: "mud_spire",      x: -370, y:   55, size: 5, tier: 3 },
  { id: "crag_den",       x:  -95, y:  390, size: 6, tier: 3, boss: true },
  { id: "dusk_hollow",    x:  375, y:  -185, size: 5, tier: 3 },
  // Tier 4 — deep wilderness (470–600 tiles)
  { id: "glass_wash",     x:  380, y:  195, size: 6, tier: 4 },
  { id: "scorpion_run",   x:  290, y:  345, size: 5, tier: 4 },
  { id: "icefall_post",   x: -385, y: -215, size: 5, tier: 4 },
  { id: "white_gulch",    x: -280, y: -360, size: 6, tier: 4 },
  { id: "cinder_ford",    x:  400, y: -280, size: 6, tier: 4 },
  { id: "charred_steps",  x:  255, y: -395, size: 5, tier: 4 },
  { id: "salt_basin",     x:  210, y:  415, size: 5, tier: 4 },
  { id: "bog_crossing",   x: -415, y:  210, size: 6, tier: 4 },
  { id: "smoke_hollow",   x:  155, y: -455, size: 5, tier: 4 },
  { id: "twin_cairns",    x: -450, y: -155, size: 6, tier: 4 },
  { id: "sand_gate",      x:  455, y:  340, size: 6, tier: 4 },
  { id: "frost_tooth",    x: -340, y: -430, size: 5, tier: 4 },
  { id: "ember_flats",    x:  455, y: -430, size: 6, tier: 4 },
  { id: "ruin_arch",      x: -480, y:  310, size: 5, tier: 4 },
  // Tier 5 — endgame approaches (600–720 tiles)
  { id: "saffron_outpost", x:  450, y:  295, size: 7, tier: 5, boss: true },
  { id: "rime_circle",     x: -450, y: -325, size: 7, tier: 5, boss: true },
  { id: "red_glass_camp",  x:  475, y: -375, size: 7, tier: 5, boss: true },
  { id: "deep_thorn",      x: -490, y:  320, size: 6, tier: 5, boss: true },
  { id: "dusk_spire",      x:  465, y:  465, size: 7, tier: 5, boss: true },
  { id: "ice_barrow",      x: -520, y: -410, size: 6, tier: 5 },
  { id: "lava_crown",      x:  510, y: -490, size: 6, tier: 5 },
  { id: "sand_throne",     x:  535, y:  400, size: 6, tier: 5 },
  { id: "black_fen",       x: -550, y:  250, size: 5, tier: 5 },
  // Tier 6 — portal gates (720+ tiles, near destinations)
  { id: "void_crossing",  x:  545, y:  440, size: 8, tier: 6, boss: true },
  { id: "null_pinnacle",  x: -545, y: -455, size: 8, tier: 6, boss: true },
  { id: "ash_crown",      x:  540, y: -500, size: 8, tier: 6, boss: true },
];

const ENEMY_CAMPS = [...BASE_ENEMY_CAMPS, ...buildScatterEnemyCamps()];

const BUILDING_INTERIORS = BUILDINGS.map((building, index) => createInteriorForBuilding(building, index));

// ---------------------------------------------------------------------------
// Procedural settlement system
// ---------------------------------------------------------------------------
const SETTLE_GRID = 80;

// Fixed relative building positions within a procedural settlement.
const SETTLE_SLOTS = [
  { dx: -19, dy: -13, w: 9, h: 7, type: "hut"   },
  { dx:   7, dy: -13, w: 9, h: 7, type: "hut"   },
  { dx: -20, dy:   5, w:10, h: 7, type: "house"  },
  { dx:   7, dy:   5, w:10, h: 7, type: "house"  },
  { dx:  -8, dy:  -4, w: 8, h: 6, type: "hut"   },
];

const SETTLE_NAMES = {
  forest: ["Forest Hut", "Woodland Rest", "Ranger Shelter", "Forest Cabin", "Woodsman Hut"],
  meadow: ["Meadow Hut", "Field Cottage", "Farm Rest", "Pasture Shelter", "Meadow Cabin"],
  desert: ["Sun Hut", "Oasis Rest", "Sand Cabin", "Clay Shelter", "Desert Hut"],
  frost:  ["Frost Hut", "Snow Cabin", "Pine Shelter", "Frost Cabin", "Ice Hut"],
  ember:  ["Ember Hut", "Ash Cabin", "Forge Shelter", "Ember Cabin", "Cinder Hut"],
};

function getSettlementAt(gx, gy) {
  if (hash2(gx * 7919, gy * 6271, 9991) > 0.18) return null;

  const cx = gx * SETTLE_GRID + 10 + Math.floor(hash2(gx, gy, 201) * (SETTLE_GRID - 20));
  const cy = gy * SETTLE_GRID + 10 + Math.floor(hash2(gx, gy, 202) * (SETTLE_GRID - 20));

  // Stay clear of starting town and portal destinations.
  if (Math.hypot(cx, cy) < 86) return null;
  if (Math.hypot(cx - 600, cy - 490) < 56) return null;
  if (Math.hypot(cx + 600, cy + 490) < 56) return null;
  if (Math.hypot(cx - 580, cy + 530) < 56) return null;

  const numSlots = 2 + Math.floor(hash2(gx, gy, 203) * 4);
  const clearRadius = 20 + Math.floor(hash2(gx, gy, 204) * 12);

  return { cx, cy, gx, gy, numSlots, clearRadius };
}

function getSettlementBuildingList(s) {
  const biome = getBiome(s.cx, s.cy);
  const names = SETTLE_NAMES[biome] || SETTLE_NAMES.forest;
  const count = Math.min(s.numSlots, SETTLE_SLOTS.length);
  const result = [];
  for (let i = 0; i < count; i++) {
    const slot = SETTLE_SLOTS[i];
    result.push({
      x: s.cx + slot.dx,
      y: s.cy + slot.dy,
      w: slot.w,
      h: slot.h,
      name: names[i % names.length],
      type: slot.type || "hut",
      gx: s.gx,
      gy: s.gy,
      slotIndex: i,
    });
  }
  return result;
}

function getNearbySettlements(x, y) {
  const gx = Math.floor(x / SETTLE_GRID);
  const gy = Math.floor(y / SETTLE_GRID);
  const result = [];
  for (let dg = -1; dg <= 1; dg++) {
    for (let dh = -1; dh <= 1; dh++) {
      const s = getSettlementAt(gx + dg, gy + dh);
      if (s) result.push(s);
    }
  }
  return result;
}

function getProceduralSettlementTile(x, y) {
  for (const s of getNearbySettlements(x, y)) {
    const dist = Math.hypot(x - s.cx, y - s.cy);
    if (dist > s.clearRadius + 5) continue;

    // Buildings take priority.
    for (const b of getSettlementBuildingList(s)) {
      if (x < b.x || x >= b.x + b.w || y < b.y || y >= b.y + b.h) continue;
      const doorX = b.x + Math.floor(b.w / 2);
      const southWall = b.y + b.h - 1;
      const northWall = b.y;
      if (x === doorX && (y === southWall || y === northWall)) return TILE.DOOR;
      if (x === b.x || x === b.x + b.w - 1 || y === northWall || y === southWall) return TILE.WALL;
      const lx = x - b.x;
      const ly = y - b.y;
      const seed = hash2(b.x, b.y, 7777);
      return getBuildingInteriorTile(lx, ly, b.w, b.h, b.type || "hut", seed);
    }

    // Cross roads through settlement center.
    const dx = Math.abs(x - s.cx);
    const dy = Math.abs(y - s.cy);
    if ((dy <= 1 && dx <= s.clearRadius) || (dx <= 1 && dy <= s.clearRadius)) {
      return TILE.PATH;
    }

    // Clearing ground.
    if (dist <= s.clearRadius) {
      const biome = getBiome(x, y);
      if (biome === "desert") return hash2(x, y, 77) > 0.93 ? TILE.STONE : TILE.SAND;
      if (biome === "frost")  return hash2(x, y, 77) > 0.92 ? TILE.STONE : TILE.SNOW;
      if (biome === "ember")  return hash2(x, y, 77) > 0.92 ? TILE.STONE : TILE.DARK_GRASS;
      const r = hash2(x, y, 77);
      return r > 0.86 ? TILE.FLOWERS : r > 0.70 ? TILE.DARK_GRASS : TILE.GRASS;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------

function getEnemyCampTile(x, y) {
  for (const camp of ENEMY_CAMPS) {
    const dist = Math.hypot(x - camp.x, y - camp.y);
    if (dist > camp.size + 2) {
      continue;
    }

    if (Math.abs(x - camp.x) <= 1 && Math.abs(y - camp.y) <= 1) {
      return TILE.STONE;
    }

    if (dist <= camp.size) {
      const r = hash2(x, y, 901);
      if (r > 0.84) {
        return TILE.STONE;
      }
      if (r > 0.28) {
        return TILE.PATH;
      }
      const biome = getBiome(x, y);
      if (biome === "desert") return TILE.SAND;
      if (biome === "frost") return TILE.SNOW;
      if (biome === "ember") return TILE.DARK_GRASS;
      return TILE.GRASS;
    }

    if (hash2(x, y, 902) > 0.62) {
      return TILE.PATH;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------

function getBuildingInteriorTile(lx, ly, w, h, type, seed) {
  if (type === "hut") {
    const fpX = Math.floor((w - 2) / 2) + 1;
    if (lx === fpX && ly === 1) return TILE.FIREPLACE;
    if ((lx === 1 || lx === 2) && ly === 1) return TILE.BED;
    if (lx === w - 2 && ly === 1) return TILE.SHELF;
    if (ly === h - 2) return TILE.CARPET;
    return TILE.FLOOR;
  }

  if (type === "treehouse") {
    if ((lx === 1 || lx === 2) && ly === 1) return TILE.BED;
    if (lx === w - 2 && ly === 1) return TILE.SHELF;
    if (ly === h - 2) return TILE.CARPET;
    return TILE.FLOOR;
  }

  if (type === "house") {
    const fpX = Math.floor(w / 2);
    if (lx === fpX && ly === 1) return TILE.FIREPLACE;
    if ((lx === 1 || lx === 2) && ly === 1) return TILE.BED;
    if ((lx === w - 3 || lx === w - 2) && ly === 2) return TILE.TABLE;
    if (lx === w - 2 && ly === 3) return TILE.SHELF;
    if (ly >= h - 3 && lx >= 2 && lx <= w - 3) return TILE.CARPET;
    return TILE.FLOOR;
  }

  if (type === "big_house") {
    const fpX = Math.floor(w / 2);
    if (lx === fpX && ly === 1) return TILE.FIREPLACE;
    if ((lx === 1 || lx === 2) && ly === 1) return TILE.BED;
    if ((lx === 1 || lx === 2) && ly === 3) return TILE.BED;
    if (lx >= w - 4 && lx <= w - 2 && ly >= 2 && ly <= 4) return TILE.TABLE;
    if (lx === w - 2 && ly === 5) return TILE.SHELF;
    if (ly >= h - 4 && lx >= 3 && lx <= w - 3) return TILE.CARPET;
    return TILE.FLOOR;
  }

  if (type === "castle") {
    const midX = Math.floor(w / 2);
    if (lx === midX && ly === 1) return TILE.FIREPLACE;
    if (lx >= midX - 1 && lx <= midX + 1 && ly >= 2 && ly <= 3) return TILE.TABLE;
    if (lx >= 3 && lx <= w - 4 && ly >= 5 && ly <= 6) return TILE.TABLE;
    if (lx >= 3 && lx <= w - 4 && ly >= 8 && ly <= 9) return TILE.TABLE;
    if (lx === w - 2 && ly >= 3 && ly <= 5 && (ly - 3) % 2 === 0) return TILE.SHELF;
    if (lx >= midX - 1 && lx <= midX + 1 && ly >= 2 && ly <= h - 2) return TILE.CARPET;
    return TILE.FLOOR;
  }

  return TILE.FLOOR;
}

function getBuildingTile(x, y) {
  for (const b of BUILDINGS) {
    if (x < b.x || x >= b.x + b.w || y < b.y || y >= b.y + b.h) {
      continue;
    }

    const doorX = b.x + Math.floor(b.w / 2);
    const southWall = b.y + b.h - 1;
    const northWall = b.y;

    if (x === doorX && (y === southWall || y === northWall)) {
      return TILE.DOOR;
    }

    if (
      x === b.x ||
      x === b.x + b.w - 1 ||
      y === northWall ||
      y === southWall
    ) {
      return TILE.WALL;
    }

    const lx = x - b.x;
    const ly = y - b.y;
    const seed = hash2(b.x, b.y, 7777);
    return getBuildingInteriorTile(lx, ly, b.w, b.h, b.type || "house", seed);
  }

  return null;
}

function createInteriorForBuilding(building, index) {
  return {
    id: `interior_${index}`,
    index,
    building,
    x: INTERIOR_BASE_X + index * INTERIOR_SPACING,
    y: INTERIOR_BASE_Y,
    w: building.w,
    h: building.h
  };
}

function getProceduralInteriorIndex(building) {
  if (!Number.isInteger(building.gx) || !Number.isInteger(building.gy) || !Number.isInteger(building.slotIndex)) {
    return null;
  }

  const gx = building.gx + PROCEDURAL_INTERIOR_GRID_OFFSET;
  const gy = building.gy + PROCEDURAL_INTERIOR_GRID_OFFSET;
  if (gx < 0 || gx >= PROCEDURAL_INTERIOR_GRID_SIZE || gy < 0 || gy >= PROCEDURAL_INTERIOR_GRID_SIZE) {
    return null;
  }

  return BUILDINGS.length + ((gx * PROCEDURAL_INTERIOR_GRID_SIZE + gy) * SETTLE_SLOTS.length) + building.slotIndex;
}

function getInteriorByIndex(index) {
  if (index < 0) {
    return null;
  }

  if (index < BUILDING_INTERIORS.length) {
    return BUILDING_INTERIORS[index] || null;
  }

  const procedural = index - BUILDINGS.length;
  const slotIndex = procedural % SETTLE_SLOTS.length;
  const cell = Math.floor(procedural / SETTLE_SLOTS.length);
  const gx = Math.floor(cell / PROCEDURAL_INTERIOR_GRID_SIZE) - PROCEDURAL_INTERIOR_GRID_OFFSET;
  const gy = (cell % PROCEDURAL_INTERIOR_GRID_SIZE) - PROCEDURAL_INTERIOR_GRID_OFFSET;
  const settlement = getSettlementAt(gx, gy);
  if (!settlement) {
    return null;
  }

  const building = getSettlementBuildingList(settlement)[slotIndex];
  if (!building) {
    return null;
  }

  return createInteriorForBuilding(building, index);
}

function getCandidateInteriorsNear(x) {
  const rough = Math.floor((x - INTERIOR_BASE_X) / INTERIOR_SPACING);
  const interiors = [];
  for (let index = rough - 1; index <= rough + 1; index += 1) {
    const interior = getInteriorByIndex(index);
    if (interior) {
      interiors.push(interior);
    }
  }
  return interiors;
}

function getInteriorAreaAt(x, y, margin = 0) {
  for (const interior of getCandidateInteriorsNear(x)) {
    if (
      x >= interior.x - margin &&
      x < interior.x + interior.w + margin &&
      y >= interior.y - margin &&
      y < interior.y + interior.h + margin
    ) {
      return interior;
    }
  }
  return null;
}

function getInteriorShopShelf(interior) {
  return {
    id: `shop_${interior.index}`,
    name: `${interior.building.name} Shelf`,
    x: interior.x + Math.max(2, interior.w - 3),
    y: interior.y + 2
  };
}

function getInteriorTile(x, y) {
  const interior = getInteriorAreaAt(x, y);
  if (!interior) {
    return null;
  }

  const localX = x - interior.x;
  const localY = y - interior.y;
  const { w, h } = interior;
  const doorX = Math.floor(w / 2);

  if (localX === doorX && (localY === 0 || localY === h - 1)) {
    return TILE.DOOR;
  }

  if (localX === 0 || localX === w - 1 || localY === 0 || localY === h - 1) {
    return TILE.WALL;
  }

  const type = interior.building.type || "house";

  if (type === "hut") {
    // Fireplace centered on north wall interior
    if (localX === Math.floor(w / 2) && localY === 1) return TILE.FIREPLACE;
    // Single bed in corner
    if (localX >= 1 && localX <= 2 && localY >= 2 && localY <= 3) return TILE.BED;
    // Small rug
    if (localX >= 2 && localX <= w - 3 && localY === h - 3) return TILE.CARPET;
    return TILE.FLOOR;
  }

  if (type === "treehouse") {
    // Shelf on east wall
    if (localX === w - 2 && localY === 2) return TILE.SHELF;
    // Bed in west corner
    if (localX >= 1 && localX <= 2 && localY >= 2 && localY <= 3) return TILE.BED;
    // Rug strip
    if (localX >= 2 && localX <= w - 3 && localY >= h - 4 && localY <= h - 3) return TILE.CARPET;
    return TILE.FLOOR;
  }

  if (type === "big_house") {
    // Fireplace on north wall interior center
    if (localX === Math.floor(w / 2) && localY === 1) return TILE.FIREPLACE;
    // Two beds on west side
    if (localX >= 2 && localX <= 4 && localY >= 2 && localY <= 3) return TILE.BED;
    if (localX >= 2 && localX <= 4 && localY >= 5 && localY <= 6) return TILE.BED;
    // Dining table
    if (localX >= w - 6 && localX <= w - 3 && localY >= 3 && localY <= 5) return TILE.TABLE;
    // Shelf on east wall
    const shelf = getInteriorShopShelf(interior);
    if (x === shelf.x && y === shelf.y) return TILE.SHELF;
    // Wide carpet down center
    if (localX >= 3 && localX <= w - 4 && localY >= h - 5 && localY <= h - 2) return TILE.CARPET;
    return TILE.FLOOR;
  }

  if (type === "castle") {
    const midX = Math.floor(w / 2);
    // Fireplace on north interior wall
    if (localX === midX && localY === 1) return TILE.FIREPLACE;
    // Throne / head table at north center
    if (localX >= midX - 2 && localX <= midX + 2 && localY >= 3 && localY <= 4) return TILE.TABLE;
    // Long banquet tables
    if (localX >= 3 && localX <= w - 4 && localY >= 6 && localY <= 7) return TILE.TABLE;
    if (localX >= 3 && localX <= w - 4 && localY >= 9 && localY <= 10) return TILE.TABLE;
    // Armory shelf on east wall
    if (localX === w - 2 && localY >= 3 && localY <= 5) return TILE.SHELF;
    // Grand carpet aisle
    if (localX >= midX - 2 && localX <= midX + 2 && localY >= 3 && localY <= h - 2) return TILE.CARPET;
    return TILE.FLOOR;
  }

  // Default "house" layout
  const shelf = getInteriorShopShelf(interior);
  if (x === shelf.x && y === shelf.y) {
    return TILE.SHELF;
  }
  if (w >= 9 && h >= 7 && localX >= 2 && localX <= 4 && localY >= 2 && localY <= 3) {
    return TILE.BED;
  }
  if (w >= 10 && h >= 7 && localX >= w - 4 && localX <= w - 3 && localY >= 4 && localY <= 5) {
    return TILE.TABLE;
  }
  if (w >= 8 && h >= 7 && localX >= 3 && localX <= w - 4 && localY >= h - 4 && localY <= h - 2) {
    return TILE.CARPET;
  }
  return TILE.FLOOR;
}

function getInteriorExteriorTile(x, y) {
  const interior = getInteriorAreaAt(x, y, INTERIOR_EXTERIOR_MARGIN);
  if (!interior || getInteriorAreaAt(x, y)) {
    return null;
  }

  const sourceX = interior.building.x + (x - interior.x);
  const sourceY = interior.building.y + (y - interior.y);
  return generateExteriorTile(sourceX, sourceY);
}

function isInteriorCoordinate(x, y) {
  return getInteriorAt(Math.floor(x), Math.floor(y)) !== null;
}

function isInsideBuilding(x, y) {
  for (const b of BUILDINGS) {
    if (x > b.x + 0.5 && x < b.x + b.w - 0.5 && y > b.y + 0.5 && y < b.y + b.h - 0.5) return true;
  }
  return false;
}

function isProtectedStartingArea(x, y) {
  return Math.hypot(x - STARTING_AREA.x, y - STARTING_AREA.y) <= STARTING_AREA.radius;
}

function canAttackAt(x, y) {
  return !isInsideBuilding(x, y) && !isProtectedStartingArea(x, y);
}

function isInteriorDistrict(x, y) {
  return getInteriorAreaAt(x, y, INTERIOR_EXTERIOR_MARGIN) !== null;
}

function getInteriorAt(x, y) {
  return getInteriorAreaAt(x, y);
}

function getBuildingDoors(building) {
  const x = building.x + Math.floor(building.w / 2);
  return [
    { side: "north", x, y: building.y, outsideY: building.y - 1.15, insideOffsetY: 1.15 },
    { side: "south", x, y: building.y + building.h - 1, outsideY: building.y + building.h + 0.15, insideOffsetY: -1.15 }
  ];
}

function getInteriorDoors(interior) {
  const x = interior.x + Math.floor(interior.w / 2);
  return [
    { side: "north", x, y: interior.y, outsideY: interior.building.y - 1.15, insideOffsetY: 1.15 },
    { side: "south", x, y: interior.y + interior.h - 1, outsideY: interior.building.y + interior.building.h + 0.15, insideOffsetY: -1.15 }
  ];
}

function getBuildingsNearDoor(x, y) {
  const buildings = BUILDINGS.filter((building) => (
    x >= building.x - 2 &&
    x < building.x + building.w + 2 &&
    y >= building.y - 2 &&
    y < building.y + building.h + 2
  ));

  for (const settlement of getNearbySettlements(x, y)) {
    for (const building of getSettlementBuildingList(settlement)) {
      if (
        x >= building.x - 2 &&
        x < building.x + building.w + 2 &&
        y >= building.y - 2 &&
        y < building.y + building.h + 2
      ) {
        buildings.push(building);
      }
    }
  }

  return buildings;
}

function getDoorTransitionAt(x, y) {
  return null;
}

function getShopFixtureAt(x, y) {
  for (const b of BUILDINGS) {
    if (Math.abs(x - (b.x + b.w/2)) > b.w + 2 || Math.abs(y - (b.y + b.h/2)) > b.h + 2) continue;
    const seed = hash2(b.x, b.y, 7777);
    for (let lx = 1; lx <= b.w-2; lx++) {
      for (let ly = 1; ly <= b.h-2; ly++) {
        const doorX = b.x + Math.floor(b.w/2);
        const isDoor = (lx === doorX - b.x) && (ly === 0 || ly === b.h-1);
        if (isDoor) continue;
        if (getBuildingInteriorTile(lx, ly, b.w, b.h, b.type || "house", seed) === TILE.SHELF) {
          const sx = b.x + lx, sy = b.y + ly;
          if (Math.hypot(x - (sx+0.5), y - (sy+0.5)) <= 1.25) {
            return { id: `shop_${b.x}_${b.y}`, name: "Trader Shelf", buildingName: b.name, x: sx+0.5, y: sy+0.5 };
          }
        }
      }
    }
  }
  return null;
}

function isInVillage(x, y) {
  for (const v of VILLAGES) {
    const dx = x - v.cx;
    const dy = y - v.cy;
    if (dx * dx + dy * dy <= v.r * v.r) {
      return true;
    }
  }

  return false;
}

function isStreet(x, y) {
  for (const s of STREET_SEGMENTS) {
    const width = s.w ?? 1;
    if (s.y1 === s.y2) {
      if (Math.abs(y - s.y1) <= width && x >= Math.min(s.x1, s.x2) && x <= Math.max(s.x1, s.x2)) {
        return true;
      }
    } else {
      if (Math.abs(x - s.x1) <= width && y >= Math.min(s.y1, s.y2) && y <= Math.max(s.y1, s.y2)) {
        return true;
      }
    }
  }

  return false;
}

function getPortalAtTile(x, y) {
  return PORTALS.find((portal) => portal.x === x && portal.y === y) || null;
}

function getPortalAt(x, y) {
  for (const portal of PORTALS) {
    if (Math.hypot(x - portal.x, y - portal.y) <= PORTAL_RADIUS) {
      return portal;
    }
  }

  return null;
}

function smoothNoise(x, y, scale, seed) {
  const fx = x / scale;
  const fy = y / scale;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  const ux = tx * tx * (3 - 2 * tx);
  const uy = ty * ty * (3 - 2 * ty);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getBiome(x, y) {
  if (x > 290 && y > 220) {
    return "desert";
  }

  if (x < -290 && y < -220) {
    return "frost";
  }

  if (x > 275 && y < -250) {
    return "ember";
  }

  const meadow = smoothNoise(x + 220, y - 140, 42, 234);
  if (meadow > 0.67 && Math.hypot(x, y) > 34) {
    return "meadow";
  }

  return "forest";
}

function generateTile(x, y) {
  return generateExteriorTile(x, y);
}

function generateExteriorTile(x, y) {
  const portal = getPortalAtTile(x, y);
  if (portal) {
    return TILE.PORTAL;
  }

  // Fixed buildings override everything.
  const buildingTile = getBuildingTile(x, y);
  if (buildingTile !== null) {
    return buildingTile;
  }

  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const dist = Math.hypot(x, y);

  // Landmark big tree: 3×3 cluster at the very centre of the plaza.
  if (ax <= 1 && ay <= 1) {
    return TILE.TREE;
  }

  // Main cross-roads radiate outward from the ring.
  if ((ax <= 1 && ay <= 200) || (ay <= 1 && ax <= 200)) {
    return TILE.PATH;
  }

  // Circular ring road (town-square perimeter, radius 7–9).
  if (dist >= 7 && dist <= 9) {
    return TILE.PATH;
  }

  // Village internal street network.
  if (isStreet(x, y)) {
    return TILE.PATH;
  }

  // Inner clearing around the landmark tree — scattered flowers and dark grass.
  if (dist < 7) {
    const r = hash2(x, y, 44);
    if (r > 0.78) return TILE.FLOWERS;
    if (r > 0.52) return TILE.DARK_GRASS;
    return TILE.GRASS;
  }

  // Village clearings: suppress forest and water.
  if (isInVillage(x, y)) {
    const biome = getBiome(x, y);
    if (biome === "desert") {
      return hash2(x, y, 55) > 0.94 ? TILE.FLOWERS : TILE.SAND;
    }
    if (biome === "frost") {
      return hash2(x, y, 55) > 0.94 ? TILE.STONE : TILE.SNOW;
    }
    if (biome === "ember") {
      return hash2(x, y, 55) > 0.94 ? TILE.STONE : TILE.DARK_GRASS;
    }
    const r = hash2(x, y, 55);
    if (r > 0.84) return TILE.FLOWERS;
    if (r > 0.66) return TILE.DARK_GRASS;
    return TILE.GRASS;
  }

  const campTile = getEnemyCampTile(x, y);
  if (campTile !== null) {
    return campTile;
  }

  // Procedural settlements scattered across the world.
  const settleTile = getProceduralSettlementTile(x, y);
  if (settleTile !== null) {
    return settleTile;
  }

  // Outer world noise generation.
  const biome = getBiome(x, y);
  const water = smoothNoise(x + 900, y - 200, 18, 81);
  const forest = smoothNoise(x, y, 9, 17);
  const detail = hash2(x, y, 9);

  if (biome === "desert") {
    if (water > 0.86) {
      return TILE.WATER;
    }
    if (detail > 0.96) {
      return TILE.STONE;
    }
    return TILE.SAND;
  }

  if (biome === "frost") {
    if (water > 0.84) {
      return TILE.WATER;
    }
    if (forest > 0.72 || detail > 0.97) {
      return TILE.TREE;
    }
    return detail > 0.9 ? TILE.STONE : TILE.SNOW;
  }

  if (biome === "ember") {
    if (water > 0.82 || detail > 0.96) {
      return TILE.LAVA;
    }
    if (forest > 0.76) {
      return TILE.TREE;
    }
    return forest < 0.3 ? TILE.STONE : TILE.DARK_GRASS;
  }

  if (biome === "meadow") {
    return detail > 0.84 ? TILE.FLOWERS : TILE.GRASS;
  }

  if (water > 0.82 && dist > 24) {
    return TILE.WATER;
  }

  if (water > 0.74 && dist > 24) {
    return TILE.SAND;
  }

  if (forest > 0.64 || detail > 0.94) {
    return TILE.TREE;
  }

  if (forest < 0.2) {
    return TILE.DARK_GRASS;
  }

  if (detail > 0.88) {
    return TILE.FLOWERS;
  }

  return TILE.GRASS;
}

function generateChunk(cx, cy) {
  const tiles = [];
  const startX = cx * CHUNK_SIZE;
  const startY = cy * CHUNK_SIZE;

  for (let y = 0; y < CHUNK_SIZE; y += 1) {
    for (let x = 0; x < CHUNK_SIZE; x += 1) {
      tiles.push(generateTile(startX + x, startY + y));
    }
  }

  return {
    cx,
    cy,
    size: CHUNK_SIZE,
    tiles,
    portals: getPortalsInChunk(cx, cy),
    buildings: getBuildingsInChunk(cx, cy)
  };
}

function isBlocked(x, y) {
  return BLOCKED_TILES.has(generateTile(Math.floor(x), Math.floor(y)));
}

function isBlockedCircle(x, y, radius = 0.28) {
  const points = [
    [x - radius, y - radius],
    [x + radius, y - radius],
    [x - radius, y + radius],
    [x + radius, y + radius]
  ];

  return points.some(([px, py]) => isBlocked(px, py));
}

function spawnPoint(index = 0) {
  // Spread players in a ring around the central tree (radius 4–5).
  const angle = index * 2.399963229728653; // golden-angle spiral
  const radius = 4 + (index % 3) * 0.6;
  return {
    x: START_SPAWN.x + Math.cos(angle) * radius,
    y: START_SPAWN.y + Math.sin(angle) * radius
  };
}

function getPortalsInChunk(cx, cy) {
  const startX = cx * CHUNK_SIZE;
  const startY = cy * CHUNK_SIZE;
  const endX = startX + CHUNK_SIZE;
  const endY = startY + CHUNK_SIZE;

  return PORTALS
    .filter((portal) => portal.x >= startX && portal.x < endX && portal.y >= startY && portal.y < endY)
    .map((portal) => ({
      id: portal.id,
      name: portal.name,
      x: portal.x,
      y: portal.y,
      targetX: portal.targetX,
      targetY: portal.targetY,
      color: portal.color,
      preview: generatePortalPreview(portal.targetX, portal.targetY + 1, 7)
    }));
}

function getBuildingsInChunk(cx, cy) {
  const startX = cx * CHUNK_SIZE;
  const startY = cy * CHUNK_SIZE;
  const endX = startX + CHUNK_SIZE;
  const endY = startY + CHUNK_SIZE;

  const result = BUILDINGS
    .filter((b) => b.x < endX && b.x + b.w > startX && b.y < endY && b.y + b.h > startY)
    .map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h, name: b.name, type: b.type, forSale: !!b.forSale }));

  const seen = new Set(result.map((b) => `${b.x},${b.y}`));
  const chunkMidX = startX + CHUNK_SIZE / 2;
  const chunkMidY = startY + CHUNK_SIZE / 2;

  for (const s of getNearbySettlements(chunkMidX, chunkMidY)) {
    for (const b of getSettlementBuildingList(s)) {
      if (b.x >= endX || b.x + b.w <= startX || b.y >= endY || b.y + b.h <= startY) continue;
      const key = `${b.x},${b.y}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ x: b.x, y: b.y, w: b.w, h: b.h, name: b.name, type: b.type || "hut", forSale: false });
      }
    }
  }

  return result;
}

function generatePortalPreview(centerX, centerY, radius = 2) {
  const size = radius * 2 + 1;
  const tiles = [];

  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      tiles.push(generateTile(x, y));
    }
  }

  return { size, tiles };
}

module.exports = {
  CHUNK_SIZE,
  TILE,
  BUILDINGS,
  ENEMY_CAMPS,
  PORTALS,
  generateChunk,
  generateTile,
  getBiome,
  canAttackAt,
  getDoorTransitionAt,
  getShopFixtureAt,
  getPortalAt,
  hash2,
  isInsideBuilding,
  isInteriorCoordinate,
  isProtectedStartingArea,
  isBlocked,
  isBlockedCircle,
  spawnPoint
};
