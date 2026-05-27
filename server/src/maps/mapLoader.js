"use strict";

/**
 * Loads hand-made tile maps from content/maps/*.json.
 *
 * Maps are sparse overlays: they stamp tiles onto a parent world's procedural
 * base (or replace entirely when `replaceBase` is true).
 */

const fs = require("node:fs");
const { listJsonFiles } = require("../worlds/contentLoader.js");

/** @typedef {{ id: string, worldId: string, originX: number, originY: number, width: number, height: number, tiles: number[], replaceBase?: boolean }} HandmadeMap */

/** @type {HandmadeMap[]} */
let loadedMaps = [];
/** worldId -> maps sorted by area descending for first-hit */
const mapsByWorld = new Map();

function decodeTiles(raw) {
  if (Array.isArray(raw)) {
    return raw.map((n) => Number(n) | 0);
  }
  if (raw && raw.encoding === "rle" && Array.isArray(raw.data)) {
    const out = [];
    for (const pair of raw.data) {
      const value = Number(pair[0]) | 0;
      const count = Number(pair[1]) | 0;
      for (let i = 0; i < count; i += 1) {
        out.push(value);
      }
    }
    return out;
  }
  return [];
}

function validateMap(doc) {
  if (!doc || typeof doc.id !== "string" || typeof doc.worldId !== "string") {
    return null;
  }
  const width = Number(doc.width);
  const height = Number(doc.height);
  const originX = Number(doc.originX);
  const originY = Number(doc.originY);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return null;
  }
  const tiles = decodeTiles(doc.tiles);
  if (tiles.length !== width * height) {
    return null;
  }
  return Object.freeze({
    id: doc.id,
    worldId: doc.worldId,
    originX,
    originY,
    width,
    height,
    tiles,
    replaceBase: Boolean(doc.replaceBase),
    label: typeof doc.label === "string" ? doc.label : doc.id
  });
}

function loadHandmadeMaps() {
  const files = listJsonFiles("maps");
  const maps = [];
  for (const file of files) {
    try {
      const doc = JSON.parse(fs.readFileSync(file, "utf8"));
      const map = validateMap(doc);
      if (map) {
        maps.push(map);
      }
    } catch {
      // skip invalid map files
    }
  }
  loadedMaps = maps;
  mapsByWorld.clear();
  for (const map of maps) {
    let list = mapsByWorld.get(map.worldId);
    if (!list) {
      list = [];
      mapsByWorld.set(map.worldId, list);
    }
    list.push(map);
  }
  for (const list of mapsByWorld.values()) {
    list.sort((a, b) => b.width * b.height - a.width * a.height);
  }
  return maps;
}

function getHandmadeMaps() {
  return loadedMaps;
}

function getMapsForWorld(worldId) {
  return mapsByWorld.get(worldId) || [];
}

/**
 * @returns {{ map: HandmadeMap, localX: number, localY: number, tile: number } | null}
 */
function getHandmadeTileAt(worldId, x, y) {
  const maps = getMapsForWorld(worldId);
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  for (const map of maps) {
    const lx = tx - map.originX;
    const ly = ty - map.originY;
    if (lx < 0 || ly < 0 || lx >= map.width || ly >= map.height) {
      continue;
    }
    const tile = map.tiles[ly * map.width + lx];
    return { map, localX: lx, localY: ly, tile };
  }
  return null;
}

function listMapCatalog() {
  return loadedMaps.map((m) => ({
    id: m.id,
    worldId: m.worldId,
    label: m.label,
    originX: m.originX,
    originY: m.originY,
    width: m.width,
    height: m.height,
    replaceBase: m.replaceBase
  }));
}

// Eager load at require time so world.js can use maps immediately.
loadHandmadeMaps();

module.exports = {
  loadHandmadeMaps,
  getHandmadeMaps,
  getMapsForWorld,
  getHandmadeTileAt,
  listMapCatalog,
  validateMap
};
