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
};

const BLOCKED_TILES = new Set([TILE.TREE, TILE.WATER, TILE.WALL, TILE.LAVA]);
const PORTAL_RADIUS = 0.58;

// Hand-crafted buildings: {x, y, w, h, name}
// Each building gets a south door at center-x of its south wall, and a north door.
const BUILDINGS = [
  // North Village (center ~0, -65)
  { x:   4, y: -70, w: 14, h: 10, name: "Crossroads Inn" },
  { x: -17, y: -70, w: 14, h: 10, name: "Travellers Hall" },
  { x:   4, y: -60, w:  8, h:  7, name: "House" },
  { x: -11, y: -60, w:  8, h:  7, name: "House" },
  { x:  19, y: -60, w:  7, h:  6, name: "Cottage" },
  { x: -24, y: -60, w:  7, h:  6, name: "Cottage" },

  // East Town (center ~62, 0)
  { x: 52, y: -16, w: 16, h: 10, name: "Market Hall" },
  { x: 52, y:   5, w: 16, h: 10, name: "Blacksmith" },
  { x: 68, y: -15, w:  8, h:  7, name: "House" },
  { x: 68, y:   5, w:  8, h:  7, name: "House" },
  { x: 79, y:  -6, w:  7, h:  6, name: "Cottage" },
  { x: 79, y:  14, w:  7, h:  6, name: "Cottage" },

  // South Hamlet (center ~0, 65)
  { x:   4, y: 56, w: 10, h:  8, name: "Farmhouse" },
  { x: -13, y: 56, w: 10, h:  8, name: "Farmhouse" },
  { x:   4, y: 66, w: 11, h:  9, name: "Barn" },
  { x: -14, y: 66, w: 11, h:  9, name: "Barn" },
  { x:  18, y: 58, w:  7, h:  6, name: "Cottage" },
  { x: -25, y: 58, w:  7, h:  6, name: "Cottage" },

  // West Ruins (center ~-65, 0)
  { x: -76, y: -15, w: 18, h: 12, name: "Ancient Hall" },
  { x: -57, y: -13, w:  9, h:  8, name: "Ruin" },
  { x: -76, y:   5, w: 18, h: 12, name: "Ruin Hall" },
  { x: -57, y:   5, w:  9, h:  8, name: "Ruin" },

  // Desert Oasis (center ~150, 118)
  { x: 142, y: 109, w: 12, h:  8, name: "Oasis House" },
  { x: 159, y: 110, w: 10, h:  7, name: "Sun House" },
  { x: 148, y: 122, w:  9, h:  7, name: "Clay House" },

  // Frost Village (center ~-150, -120)
  { x: -158, y: -128, w: 12, h:  8, name: "Frost Lodge" },
  { x: -141, y: -127, w: 10, h:  7, name: "Snow House" },
  { x: -153, y: -116, w:  9, h:  7, name: "Pine Cabin" },

  // Ember Camp (center ~145, -130)
  { x: 137, y: -138, w: 12, h:  8, name: "Ember Hall" },
  { x: 154, y: -137, w: 10, h:  7, name: "Ash House" },
  { x: 143, y: -126, w:  9, h:  7, name: "Forge Hut" },
];

// Village clearing zones: forest and water are suppressed inside these circles.
const VILLAGES = [
  { cx:   0, cy: -65, r: 26 }, // North Village
  { cx:  62, cy:   0, r: 26 }, // East Town
  { cx:   0, cy:  65, r: 24 }, // South Hamlet
  { cx: -65, cy:   0, r: 26 }, // West Ruins
  { cx: 150, cy: 118, r: 24 }, // Desert Oasis
  { cx: -150, cy: -120, r: 24 }, // Frost Village
  { cx: 145, cy: -130, r: 24 }, // Ember Camp
];

// Village internal roads (horizontal or vertical line segments).
const STREET_SEGMENTS = [
  { x1: -17, y1: -62, x2: 17,  y2: -62 }, // North village cross-street
  { x1:  52, y1: -17, x2: 52,  y2:  15 }, // East town cross-street
  { x1: -14, y1:  65, x2: 15,  y2:  65 }, // South hamlet cross-street
  { x1: -57, y1: -14, x2: -57, y2:  14 }, // West ruins cross-street
  { x1: 135, y1: 118, x2: 169, y2: 118 }, // Oasis lane
  { x1: 150, y1: 103, x2: 150, y2: 132 }, // Oasis lane
  { x1: -166, y1: -120, x2: -132, y2: -120 }, // Frost lane
  { x1: -150, y1: -136, x2: -150, y2: -108 }, // Frost lane
  { x1: 130, y1: -130, x2: 164, y2: -130 }, // Ember lane
  { x1: 145, y1: -146, x2: 145, y2: -116 }, // Ember lane
];

const PORTALS = [
  { id: "portal_oasis", name: "Oasis Gate", x: 10, y: 0, targetX: 150, targetY: 118, color: "#f2c45f" },
  { id: "portal_frost", name: "Frost Gate", x: -10, y: 0, targetX: -150, targetY: -120, color: "#9ee7ff" },
  { id: "portal_ember", name: "Ember Gate", x: 0, y: -10, targetX: 145, targetY: -130, color: "#ff7a45" },
  { id: "portal_hub_oasis", name: "Hub Gate", x: 150, y: 118, targetX: 0, targetY: 0, color: "#8fe388" },
  { id: "portal_hub_frost", name: "Hub Gate", x: -150, y: -120, targetX: 0, targetY: 0, color: "#8fe388" },
  { id: "portal_hub_ember", name: "Hub Gate", x: 145, y: -130, targetX: 0, targetY: 0, color: "#8fe388" },
];

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
    if (s.y1 === s.y2) {
      if (y === s.y1 && x >= Math.min(s.x1, s.x2) && x <= Math.max(s.x1, s.x2)) {
        return true;
      }
    } else {
      if (x === s.x1 && y >= Math.min(s.y1, s.y2) && y <= Math.max(s.y1, s.y2)) {
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
  const portal = getPortalAtTile(x, y);
  if (portal) {
    return TILE.PORTAL;
  }

  // Buildings override everything.
  const buildingTile = getBuildingTile(x, y);
  if (buildingTile !== null) {
    return buildingTile;
  }

  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const dist = Math.hypot(x, y);

  // Central stone plaza.
  if (ax <= 7 && ay <= 5) {
    return TILE.STONE;
  }

  // Main cross-paths, extended to reach the four villages.
  if ((ax <= 1 && ay <= 90) || (ay <= 1 && ax <= 90)) {
    return TILE.PATH;
  }

  // Village internal cross-streets.
  if (isStreet(x, y)) {
    return TILE.PATH;
  }

  // Central grass clearing.
  if (dist <= 16) {
    return hash2(x, y, 44) > 0.83 ? TILE.FLOWERS : TILE.GRASS;
  }

  // Village clearings: suppress forest and water, keep it open.
  if (isInVillage(x, y)) {
    const biome = getBiome(x, y);
    if (biome === "desert") {
      return hash2(x, y, 55) > 0.88 ? TILE.FLOWERS : TILE.SAND;
    }
    if (biome === "frost") {
      return hash2(x, y, 55) > 0.9 ? TILE.STONE : TILE.SNOW;
    }
    if (biome === "ember") {
      return hash2(x, y, 55) > 0.9 ? TILE.STONE : TILE.DARK_GRASS;
    }
    return hash2(x, y, 55) > 0.88 ? TILE.FLOWERS : TILE.GRASS;
  }

  // Outer world noise generation.
  const biome = getBiome(x, y);
  const water = smoothNoise(x + 900, y - 200, 18, 81);
  const forest = smoothNoise(x, y, 9, 17);
  const detail = hash2(x, y, 9);

  if (biome === "desert") {
    if (water > 0.82) {
      return TILE.WATER;
    }
    if (detail > 0.91) {
      return TILE.STONE;
    }
    return TILE.SAND;
  }

  if (biome === "frost") {
    if (water > 0.79) {
      return TILE.WATER;
    }
    if (forest > 0.62 || detail > 0.9) {
      return TILE.TREE;
    }
    return detail > 0.82 ? TILE.STONE : TILE.SNOW;
  }

  if (biome === "ember") {
    if (water > 0.76 || detail > 0.92) {
      return TILE.LAVA;
    }
    if (forest > 0.66) {
      return TILE.TREE;
    }
    return forest < 0.36 ? TILE.STONE : TILE.DARK_GRASS;
  }

  if (biome === "meadow") {
    return detail > 0.72 ? TILE.FLOWERS : TILE.GRASS;
  }

  if (water > 0.78 && dist > 24) {
    return TILE.WATER;
  }

  if (forest > 0.57 || detail > 0.86) {
    return TILE.TREE;
  }

  if (forest < 0.28) {
    return TILE.DARK_GRASS;
  }

  if (detail > 0.77) {
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
  const radius = 1.6 + (index % 6) * 0.55;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius
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

  return BUILDINGS
    .filter((building) => (
      building.x < endX &&
      building.x + building.w > startX &&
      building.y < endY &&
      building.y + building.h > startY
    ))
    .map((building) => ({
      x: building.x,
      y: building.y,
      w: building.w,
      h: building.h,
      name: building.name
    }));
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
  PORTALS,
  generateChunk,
  generateTile,
  getBiome,
  getPortalAt,
  hash2,
  isBlocked,
  isBlockedCircle,
  spawnPoint
};
