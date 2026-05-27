"use strict";

/**
 * Pirate game mode — procedural open sea with island clusters.
 *
 * Occupies a reserved coordinate slab (see constants.PIRATE_WORLD_BOUNDS) so it
 * does not collide with Balathor fantasy / sci-fi content. Generation is
 * intentionally simple until ships, quests, and authored islands land.
 */

const { PIRATE_WORLD_BOUNDS, THEME_PIRATE } = require("./constants.js");

function unitHash(x, y, seed = 88021) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function isInsidePirateBounds(x, y) {
  return (
    x >= PIRATE_WORLD_BOUNDS.xMin &&
    x < PIRATE_WORLD_BOUNDS.xMax &&
    y >= PIRATE_WORLD_BOUNDS.yMin &&
    y < PIRATE_WORLD_BOUNDS.yMax
  );
}

/**
 * Island mask: low-frequency noise blobs on an open ocean plane.
 */
function pirateLandMask(x, y) {
  const islandGrid = 48;
  const gx = Math.floor(x / islandGrid);
  const gy = Math.floor(y / islandGrid);
  const roll = unitHash(gx, gy, 901);
  if (roll < 0.72) return 0;
  const lx = x - gx * islandGrid - islandGrid / 2;
  const ly = y - gy * islandGrid - islandGrid / 2;
  const r = Math.hypot(lx, ly);
  const radius = 6 + unitHash(gx, gy, 902) * 14;
  if (r > radius) return 0;
  const coast = 1 - r / radius;
  return coast;
}

/**
 * @param {Record<string, number>} TILE tile enum from world.js
 */
function getPirateTile(x, y, TILE) {
  const mask = pirateLandMask(x, y);
  if (mask <= 0) {
    return TILE.WATER;
  }
  if (mask < 0.35) {
    return TILE.SAND;
  }
  const detail = unitHash(x, y, 903);
  if (detail > 0.88) return TILE.STONE;
  if (detail > 0.62) return TILE.TREE;
  return TILE.GRASS;
}

function getPirateWorldTheme() {
  return THEME_PIRATE;
}

module.exports = {
  isInsidePirateBounds,
  pirateLandMask,
  getPirateTile,
  getPirateWorldTheme,
  PIRATE_WORLD_BOUNDS
};
