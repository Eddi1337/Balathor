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
};

const BLOCKED_TILES = new Set([TILE.WATER, TILE.WALL, TILE.LAVA, TILE.BED, TILE.TABLE]);
const PORTAL_RADIUS = 0.58;
const DOOR_RADIUS = 0.52;
const INTERIOR_BASE_X = 10000;
const INTERIOR_BASE_Y = 10000;
const INTERIOR_SPACING = 40;
const INTERIOR_WIDTH = 12;
const INTERIOR_HEIGHT = 10;
const STARTING_AREA = { x: 0, y: 4, radius: 46 };
const START_SPAWN = { x: 0, y: -8 };

// Hand-crafted buildings: starting town + portal destinations only.
const BUILDINGS = [
  // Central village
  { x:  -5, y: -17, w: 10, h: 8, name: "Home" },
  { x: -38, y: -28, w: 10, h: 8, name: "Blue Roof House" },
  { x:  28, y: -27, w: 10, h: 8, name: "Red Roof House" },
  { x: -50, y:  10, w: 12, h: 8, name: "Market House" },
  { x:  39, y:  15, w: 12, h: 8, name: "Garden House" },
  { x:  -7, y:  35, w: 14, h: 9, name: "Town Hall" },
  // Desert Oasis (portal destination)
  { x: 142, y: 109, w: 12, h: 8, name: "Oasis House" },
  { x: 159, y: 110, w: 10, h: 7, name: "Sun House" },
  { x: 148, y: 122, w:  9, h: 7, name: "Clay House" },
  // Frost Village (portal destination)
  { x: -158, y: -128, w: 12, h: 8, name: "Frost Lodge" },
  { x: -141, y: -127, w: 10, h: 7, name: "Snow House" },
  { x: -153, y: -116, w:  9, h: 7, name: "Pine Cabin" },
  // Ember Camp (portal destination)
  { x: 137, y: -138, w: 12, h: 8, name: "Ember Hall" },
  { x: 154, y: -137, w: 10, h: 7, name: "Ash House" },
  { x: 143, y: -126, w:  9, h: 7, name: "Forge Hut" },
];

// Fixed village clearing zones — only starting town + portal destinations.
const VILLAGES = [
  { cx:   0, cy:   4, r: 64 }, // Central Village
  { cx: 150, cy: 118, r: 24 }, // Desert Oasis
  { cx: -150, cy: -120, r: 24 }, // Frost Village
  { cx: 145, cy: -130, r: 24 }, // Ember Camp
];

// Road segments for fixed villages only.
const STREET_SEGMENTS = [
  { x1: -58, y1:   0, x2: 58,  y2:   0, w: 1 }, // Central east-west lane
  { x1:   0, y1:  -9, x2:  0,  y2:  44, w: 1 }, // Central south lane to Town Hall
  { x1: -33, y1:  -8, x2: -11, y2:  -8, w: 0 }, // Blue Roof House branch
  { x1: -33, y1: -20, x2: -33, y2:  -8, w: 0 }, // Blue Roof House walk
  { x1:  11, y1:  -8, x2:  33, y2:  -8, w: 0 }, // Red Roof House branch
  { x1:  33, y1: -19, x2:  33, y2:  -8, w: 0 }, // Red Roof House walk
  { x1: -44, y1:   8, x2: -11, y2:   8, w: 0 }, // Market House branch
  { x1: -44, y1:   8, x2: -44, y2:  18, w: 0 }, // Market House walk
  { x1:  11, y1:   8, x2:  45, y2:   8, w: 0 }, // Garden House branch
  { x1:  45, y1:   8, x2:  45, y2:  23, w: 0 }, // Garden House walk
  { x1: 135, y1: 118, x2: 169, y2: 118 }, // Oasis lane
  { x1: 150, y1: 103, x2: 150, y2: 132 }, // Oasis lane
  { x1: -166, y1: -120, x2: -132, y2: -120 }, // Frost lane
  { x1: -150, y1: -136, x2: -150, y2: -108 }, // Frost lane
  { x1: 130, y1: -130, x2: 164, y2: -130 }, // Ember lane
  { x1: 145, y1: -146, x2: 145, y2: -116 }, // Ember lane
];

const PORTALS = [
  { id: "portal_oasis", name: "Oasis Gate", x: 8, y: 4, targetX: 150, targetY: 118, color: "#f2c45f" },
  { id: "portal_frost", name: "Frost Gate", x: -8, y: 4, targetX: -150, targetY: -120, color: "#9ee7ff" },
  { id: "portal_ember", name: "Ember Gate", x: 0, y: 7, targetX: 145, targetY: -130, color: "#ff7a45" },
  { id: "portal_hub_oasis", name: "Hub Gate", x: 150, y: 118, targetX: 0, targetY: 0, color: "#8fe388" },
  { id: "portal_hub_frost", name: "Hub Gate", x: -150, y: -120, targetX: 0, targetY: 0, color: "#8fe388" },
  { id: "portal_hub_ember", name: "Hub Gate", x: 145, y: -130, targetX: 0, targetY: 0, color: "#8fe388" },
];

const ENEMY_CAMPS = [
  { id: "north_woods", x: -54, y: -86, size: 4 },
  { id: "east_copse", x: 88, y: -38, size: 5 },
  { id: "south_ford", x: 62, y: 82, size: 4 },
  { id: "west_bramble", x: -92, y: 56, size: 5 },
  { id: "deep_pines", x: -118, y: -42, size: 6, boss: true },
  { id: "old_road", x: 42, y: -116, size: 6, boss: true },
  { id: "oasis_raiders", x: 184, y: 94, size: 7, boss: true },
  { id: "sunken_dunes", x: 116, y: 170, size: 5 },
  { id: "frost_ridge", x: -184, y: -96, size: 7, boss: true },
  { id: "snow_hollow", x: -112, y: -174, size: 5 },
  { id: "ember_watch", x: 194, y: -120, size: 7, boss: true },
  { id: "ash_fields", x: 104, y: -190, size: 5 },
  { id: "far_meadow", x: -176, y: 148, size: 6, boss: true },
  { id: "green_crossing", x: 154, y: 24, size: 4 },
];

const BUILDING_INTERIORS = BUILDINGS.map((building, index) => ({
  building,
  x: INTERIOR_BASE_X + index * INTERIOR_SPACING,
  y: INTERIOR_BASE_Y,
  w: INTERIOR_WIDTH,
  h: INTERIOR_HEIGHT
}));

// ---------------------------------------------------------------------------
// Procedural settlement system
// ---------------------------------------------------------------------------
const SETTLE_GRID = 80;

// Fixed relative building positions within a procedural settlement.
const SETTLE_SLOTS = [
  { dx: -19, dy: -13, w: 9, h: 7 },
  { dx:   7, dy: -13, w: 9, h: 7 },
  { dx: -20, dy:   5, w: 10, h: 7 },
  { dx:   7, dy:   5, w: 10, h: 7 },
  { dx:  -8, dy:  -4, w: 8,  h: 6 },
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
  if (Math.hypot(cx, cy) < 82) return null;
  if (Math.hypot(cx - 150, cy - 118) < 46) return null;
  if (Math.hypot(cx + 150, cy + 120) < 46) return null;
  if (Math.hypot(cx - 145, cy + 130) < 46) return null;

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
      return TILE.FLOOR;
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

    return TILE.FLOOR;
  }

  return null;
}

function getInteriorTile(x, y) {
  for (const interior of BUILDING_INTERIORS) {
    if (x < interior.x || x >= interior.x + interior.w || y < interior.y || y >= interior.y + interior.h) {
      continue;
    }

    const localX = x - interior.x;
    const localY = y - interior.y;
    const doorX = Math.floor(interior.w / 2);

    if (localX === doorX && localY === interior.h - 1) {
      return TILE.DOOR;
    }

    if (localX === 0 || localX === interior.w - 1 || localY === 0 || localY === interior.h - 1) {
      return TILE.WALL;
    }

    if (localX >= 2 && localX <= 4 && localY >= 2 && localY <= 3) {
      return TILE.BED;
    }

    if (localX >= 7 && localX <= 8 && localY >= 4 && localY <= 5) {
      return TILE.TABLE;
    }

    if (localX >= 4 && localX <= 7 && localY >= 5 && localY <= 7) {
      return TILE.CARPET;
    }

    return TILE.FLOOR;
  }

  return null;
}

function isInteriorCoordinate(x, y) {
  return getInteriorAt(Math.floor(x), Math.floor(y)) !== null;
}

function isProtectedStartingArea(x, y) {
  return Math.hypot(x - STARTING_AREA.x, y - STARTING_AREA.y) <= STARTING_AREA.radius;
}

function canAttackAt(x, y) {
  return !isInteriorCoordinate(x, y) && !isProtectedStartingArea(x, y);
}

function isInteriorDistrict(x, y) {
  return (
    x >= INTERIOR_BASE_X - 4 &&
    x < INTERIOR_BASE_X + BUILDING_INTERIORS.length * INTERIOR_SPACING + INTERIOR_WIDTH + 4 &&
    y >= INTERIOR_BASE_Y - 4 &&
    y < INTERIOR_BASE_Y + INTERIOR_HEIGHT + 4
  );
}

function getInteriorAt(x, y) {
  return BUILDING_INTERIORS.find((interior) => (
    x >= interior.x &&
    x < interior.x + interior.w &&
    y >= interior.y &&
    y < interior.y + interior.h
  )) || null;
}

function getBuildingDoor(building) {
  return {
    x: building.x + Math.floor(building.w / 2),
    y: building.y + building.h - 1
  };
}

function getInteriorDoor(interior) {
  return {
    x: interior.x + Math.floor(interior.w / 2),
    y: interior.y + interior.h - 1
  };
}

function getDoorTransitionAt(x, y) {
  for (const interior of BUILDING_INTERIORS) {
    const door = getInteriorDoor(interior);
    if (Math.hypot(x - door.x, y - door.y) <= DOOR_RADIUS) {
      const exit = getBuildingDoor(interior.building);
      return {
        type: "door",
        name: interior.building.name,
        x: exit.x,
        y: exit.y + 1.15
      };
    }

    const entrance = getBuildingDoor(interior.building);
    if (Math.hypot(x - entrance.x, y - entrance.y) <= DOOR_RADIUS) {
      return {
        type: "door",
        name: interior.building.name,
        x: door.x,
        y: door.y - 1.15
      };
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

function hash2(x, y, seed = 1337) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
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
  if (x > 96 && y > 70) {
    return "desert";
  }

  if (x < -96 && y < -70) {
    return "frost";
  }

  if (x > 92 && y < -78) {
    return "ember";
  }

  const meadow = smoothNoise(x + 220, y - 140, 42, 234);
  if (meadow > 0.67 && Math.hypot(x, y) > 34) {
    return "meadow";
  }

  return "forest";
}

function generateTile(x, y) {
  const interiorTile = getInteriorTile(x, y);
  if (interiorTile !== null) {
    return interiorTile;
  }

  if (isInteriorDistrict(x, y)) {
    return TILE.WALL;
  }

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

  // Central stone plaza outside Home.
  if (ax <= 11 && ay <= 9) {
    return TILE.STONE;
  }

  // Main cross-paths, extended to reach the portal villages.
  if ((ax <= 1 && ay <= 90) || (ay <= 1 && ax <= 90)) {
    return TILE.PATH;
  }

  // Village internal cross-streets.
  if (isStreet(x, y)) {
    return TILE.PATH;
  }

  // Flower borders alongside main roads within the starting town.
  if (dist <= 36) {
    if (ax >= 3 && ax <= 5 && ay >= 7 && ay <= 28) return TILE.FLOWERS;
    if (ay >= 3 && ay <= 5 && ax >= 9 && ax <= 28) return TILE.FLOWERS;
  }

  // Central grass clearing — richer variety of ground cover.
  if (dist <= 16) {
    const r = hash2(x, y, 44);
    if (r > 0.82) return TILE.FLOWERS;
    if (r > 0.60) return TILE.DARK_GRASS;
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
  const angle = index * 2.399963229728653;
  const radius = (index % 8) * 0.08;
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
      preview: generatePortalPreview(portal.targetX, portal.targetY + 1)
    }));
}

function getBuildingsInChunk(cx, cy) {
  const startX = cx * CHUNK_SIZE;
  const startY = cy * CHUNK_SIZE;
  const endX = startX + CHUNK_SIZE;
  const endY = startY + CHUNK_SIZE;

  const result = BUILDINGS
    .filter((b) => b.x < endX && b.x + b.w > startX && b.y < endY && b.y + b.h > startY)
    .map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h, name: b.name }));

  const seen = new Set(result.map((b) => `${b.x},${b.y}`));
  const chunkMidX = startX + CHUNK_SIZE / 2;
  const chunkMidY = startY + CHUNK_SIZE / 2;

  for (const s of getNearbySettlements(chunkMidX, chunkMidY)) {
    for (const b of getSettlementBuildingList(s)) {
      if (b.x >= endX || b.x + b.w <= startX || b.y >= endY || b.y + b.h <= startY) continue;
      const key = `${b.x},${b.y}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(b);
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
  getPortalAt,
  hash2,
  isInteriorCoordinate,
  isProtectedStartingArea,
  isBlocked,
  isBlockedCircle,
  spawnPoint
};
