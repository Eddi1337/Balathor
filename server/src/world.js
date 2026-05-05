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
};

const BLOCKED_TILES = new Set([TILE.TREE, TILE.WATER, TILE.WALL]);

// Hand-crafted buildings: {x, y, w, h, name}
// Each building gets a south door at center-x of its south wall, and a north door.
const BUILDINGS = [
  // North Village (center ~0, -65)
  { x:   4, y: -70, w: 14, h: 10, name: "Crossroads Inn" },
  { x: -17, y: -70, w: 14, h: 10, name: "Travellers Hall" },
  { x:   4, y: -60, w:  8, h:  7, name: "House" },
  { x: -11, y: -60, w:  8, h:  7, name: "House" },

  // East Town (center ~62, 0)
  { x: 52, y: -16, w: 16, h: 10, name: "Market Hall" },
  { x: 52, y:   5, w: 16, h: 10, name: "Blacksmith" },
  { x: 68, y: -15, w:  8, h:  7, name: "House" },
  { x: 68, y:   5, w:  8, h:  7, name: "House" },

  // South Hamlet (center ~0, 65)
  { x:   4, y: 56, w: 10, h:  8, name: "Farmhouse" },
  { x: -13, y: 56, w: 10, h:  8, name: "Farmhouse" },
  { x:   4, y: 66, w: 11, h:  9, name: "Barn" },
  { x: -14, y: 66, w: 11, h:  9, name: "Barn" },

  // West Ruins (center ~-65, 0)
  { x: -76, y: -15, w: 18, h: 12, name: "Ancient Hall" },
  { x: -57, y: -13, w:  9, h:  8, name: "Ruin" },
  { x: -76, y:   5, w: 18, h: 12, name: "Ruin Hall" },
  { x: -57, y:   5, w:  9, h:  8, name: "Ruin" },
];

// Village clearing zones: forest and water are suppressed inside these circles.
const VILLAGES = [
  { cx:   0, cy: -65, r: 26 }, // North Village
  { cx:  62, cy:   0, r: 26 }, // East Town
  { cx:   0, cy:  65, r: 24 }, // South Hamlet
  { cx: -65, cy:   0, r: 26 }, // West Ruins
];

// Village internal roads (horizontal or vertical line segments).
const STREET_SEGMENTS = [
  { x1: -17, y1: -62, x2: 17,  y2: -62 }, // North village cross-street
  { x1:  52, y1: -17, x2: 52,  y2:  15 }, // East town cross-street
  { x1: -14, y1:  65, x2: 15,  y2:  65 }, // South hamlet cross-street
  { x1: -57, y1: -14, x2: -57, y2:  14 }, // West ruins cross-street
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

function generateTile(x, y) {
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
    return hash2(x, y, 55) > 0.88 ? TILE.FLOWERS : TILE.GRASS;
  }

  // Outer world noise generation.
  const water = smoothNoise(x + 900, y - 200, 18, 81);
  const forest = smoothNoise(x, y, 9, 17);
  const detail = hash2(x, y, 9);

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

  return { cx, cy, size: CHUNK_SIZE, tiles };
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

module.exports = {
  CHUNK_SIZE,
  TILE,
  BUILDINGS,
  generateChunk,
  generateTile,
  hash2,
  isBlocked,
  isBlockedCircle,
  spawnPoint
};
