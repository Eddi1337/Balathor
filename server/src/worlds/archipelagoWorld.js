"use strict";

const {
  ARCHIPELAGO_BOUNDS,
  ARCHIPELAGO_ISLANDS,
  ARCHIPELAGO_HARBOUR_FEATURES,
  islandAtPoint
} = require("../harbourLayout.js");

const NAUTICAL_THEME = "nautical";

function smoothNoise(x, y, scale, seed) {
  const sx = x / scale;
  const sy = y / scale;
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = sx - ix;
  const fy = sy - iy;
  const hash = (a, b) => {
    let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ (seed | 0);
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function isInArchipelagoBounds(x, y) {
  return (
    x >= ARCHIPELAGO_BOUNDS.minX &&
    x <= ARCHIPELAGO_BOUNDS.maxX &&
    y >= ARCHIPELAGO_BOUNDS.minY &&
    y <= ARCHIPELAGO_BOUNDS.maxY
  );
}

function getArchipelagoAtPoint(x, y) {
  if (!isInArchipelagoBounds(x, y)) return null;
  const cx = (ARCHIPELAGO_BOUNDS.minX + ARCHIPELAGO_BOUNDS.maxX) / 2;
  const cy = (ARCHIPELAGO_BOUNDS.minY + ARCHIPELAGO_BOUNDS.maxY) / 2;
  const edgeDist = Math.hypot(x - cx, y - cy);
  const maxR = Math.min(
    (ARCHIPELAGO_BOUNDS.maxX - ARCHIPELAGO_BOUNDS.minX) / 2,
    (ARCHIPELAGO_BOUNDS.maxY - ARCHIPELAGO_BOUNDS.minY) / 2
  );
  if (edgeDist > maxR - 8) return null;
  return "archipelago";
}

function islandLandScore(x, y) {
  let best = 0;
  for (const island of ARCHIPELAGO_ISLANDS) {
    const dist = Math.hypot(x - island.x, y - island.y);
    const t = 1 - dist / island.landRadius;
    if (t > best) best = t;
  }
  return best;
}

function harbourFeatureAt(x, y) {
  for (const feature of ARCHIPELAGO_HARBOUR_FEATURES) {
    const fw = Math.max(1, Number(feature.w || 1));
    const fh = Math.max(1, Number(feature.h || 1));
    const minX = feature.x - Math.floor(fw / 2);
    const minY = feature.y - Math.floor(fh / 2);
    if (x >= minX && x < minX + fw && y >= minY && y < minY + fh) {
      return feature;
    }
  }
  return null;
}

function getArchipelagoTile(x, y, TILE, hash2) {
  const feature = harbourFeatureAt(x, y);
  if (feature) {
    if (feature.kind === "ship-console") {
      const fw = Math.max(1, Number(feature.w || 1));
      const fh = Math.max(1, Number(feature.h || 1));
      const minX = feature.x - Math.floor(fw / 2);
      const minY = feature.y - Math.floor(fh / 2);
      const lx = x - minX;
      const ly = y - minY;
      const edge = lx === 0 || ly === 0 || lx === fw - 1 || ly === fh - 1;
      if (edge) return TILE.STONE;
      if (lx === 1 || ly === 1 || lx === fw - 2 || ly === fh - 2) return TILE.PATH;
      return TILE.TABLE;
    }
    if (feature.kind === "harbour-pier") {
      const detail = hash2(x, y, 8801);
      if (detail > 0.92) return TILE.STONE;
      return TILE.PATH;
    }
  }

  const island = islandAtPoint(x, y);
  const land = islandLandScore(x, y);
  const ripple = smoothNoise(x, y, 11, 44017) * 0.08;

  if (land + ripple <= 0) {
    const depth = smoothNoise(x, y, 24, 44021);
    if (depth > 0.93) return TILE.DARK_GRASS;
    return TILE.WATER;
  }

  if (land + ripple < 0.12) {
    return TILE.SAND;
  }

  if (island) {
    const dx = x - island.x;
    const dy = y - island.y;
    const pierBand =
      (island.pierDir === "south" && dy > island.landRadius * 0.55 && Math.abs(dx) < 8) ||
      (island.pierDir === "north" && dy < -island.landRadius * 0.55 && Math.abs(dx) < 8) ||
      (island.pierDir === "east" && dx > island.landRadius * 0.55 && Math.abs(dy) < 7) ||
      (island.pierDir === "west" && dx < -island.landRadius * 0.55 && Math.abs(dy) < 7);
    if (pierBand && land + ripple < 0.35) {
      return TILE.PATH;
    }
    const hubDist = Math.hypot(dx, dy);
    if (hubDist < 8) return TILE.PATH;
    if (hubDist < 14 && hash2(x, y, island.x) > 0.55) return TILE.STONE;
  }

  const detail = hash2(x, y, 8803);
  if (detail > 0.9) return TILE.TREE;
  if (detail > 0.82) return TILE.FLOWERS;
  if (detail > 0.45) return TILE.GRASS;
  return TILE.DARK_GRASS;
}

function featureTouchesChunk(feature, startX, startY, endX, endY) {
  const fw = Math.max(1, Number(feature.w || 1));
  const fh = Math.max(1, Number(feature.h || 1));
  const minX = feature.x - Math.floor(fw / 2);
  const minY = feature.y - Math.floor(fh / 2);
  const maxX = minX + fw;
  const maxY = minY + fh;
  return minX < endX && maxX > startX && minY < endY && maxY > startY;
}

function getArchipelagoObjectsInChunk(cx, cy, chunkSize) {
  const startX = cx * chunkSize;
  const startY = cy * chunkSize;
  const endX = startX + chunkSize;
  const endY = startY + chunkSize;
  const out = [];
  for (const island of ARCHIPELAGO_ISLANDS) {
    if (island.x >= startX - island.landRadius && island.x < endX + island.landRadius &&
        island.y >= startY - island.landRadius && island.y < endY + island.landRadius) {
      out.push({
        id: `harbour_${island.id}`,
        kind: "harbour",
        name: island.name,
        x: island.x,
        y: island.y,
        radius: island.landRadius,
        w: island.landRadius * 2,
        h: island.landRadius * 2
      });
    }
  }
  for (const feature of ARCHIPELAGO_HARBOUR_FEATURES) {
    if (featureTouchesChunk(feature, startX, startY, endX, endY)) {
      out.push({ ...feature });
    }
  }
  return out;
}

module.exports = {
  NAUTICAL_THEME,
  isInArchipelagoBounds,
  getArchipelagoAtPoint,
  getArchipelagoTile,
  harbourFeatureAt,
  getArchipelagoObjectsInChunk
};
