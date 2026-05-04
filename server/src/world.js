const CHUNK_SIZE = 16;

const TILE = {
  GRASS: 0,
  TREE: 1,
  WATER: 2,
  STONE: 3,
  PATH: 4,
  FLOWERS: 5,
  DARK_GRASS: 6
};

const BLOCKED_TILES = new Set([TILE.TREE, TILE.WATER]);

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
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const dist = Math.hypot(x, y);

  if (ax <= 7 && ay <= 5) {
    return TILE.STONE;
  }

  if ((ax <= 1 && ay <= 34) || (ay <= 1 && ax <= 34)) {
    return TILE.PATH;
  }

  if (dist <= 16) {
    const fleck = hash2(x, y, 44);
    return fleck > 0.83 ? TILE.FLOWERS : TILE.GRASS;
  }

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
  generateChunk,
  generateTile,
  hash2,
  isBlocked,
  isBlockedCircle,
  spawnPoint
};
