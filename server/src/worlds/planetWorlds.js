"use strict";

/**
 * Planet world definitions.
 *
 * These surfaces are separate world planes addressed by `planet:<id>` world ids.
 * The legacy x/y values are still world-space coordinates used by the current
 * chunk protocol, but all planet terrain decisions live in this file rather
 * than falling through fantasy terrain generation.
 */

const PLANET_SURFACE_RADIUS = 900;
const PLANET_SURFACE_SPACING = 2300;
const PLANET_SURFACE_ORIGIN_X = 5000;
const PLANET_SURFACE_ORIGIN_Y = -2600;

function planetSurfaceAnchor(index) {
  return {
    surfaceX: PLANET_SURFACE_ORIGIN_X + (index % 4) * PLANET_SURFACE_SPACING,
    surfaceY: PLANET_SURFACE_ORIGIN_Y + Math.floor(index / 4) * PLANET_SURFACE_SPACING
  };
}

const PLANET_DEFINITIONS = [
  { id: "planet_aurelia",   name: "Aurelia",   x: 2142, y: -382, radius: 60, seed: 8128,  type: "lush",     surfacePrimary: "#3aa46c", surfaceAccent: "#daf7b0" },
  { id: "planet_icefall",   name: "Icefall",   x: 2214, y: 180,  radius: 52, seed: 9181,  type: "ice",      surfacePrimary: "#9fd8ff", surfaceAccent: "#f8fdff" },
  { id: "planet_rust",      name: "Rust",      x: 2050, y: 416,  radius: 46, seed: 10201, type: "desert",   surfacePrimary: "#d3a15b", surfaceAccent: "#ffe0a6" },
  { id: "planet_pyros",     name: "Pyros",     x: 1640, y: -260, radius: 48, seed: 11329, type: "volcanic", surfacePrimary: "#ef4444", surfaceAccent: "#fb923c" },
  { id: "planet_thalas",    name: "Thalas",    x: 1560, y: 240,  radius: 56, seed: 12347, type: "ocean",    surfacePrimary: "#2bb3ff", surfaceAccent: "#a0e7ff" },
  { id: "planet_velm",      name: "Velm",      x: 2306, y: -120, radius: 42, seed: 13441, type: "jungle",   surfacePrimary: "#16a34a", surfaceAccent: "#86efac" },
  { id: "planet_kryon",     name: "Kryon",     x: 2280, y: 400,  radius: 50, seed: 14557, type: "crystal",  surfacePrimary: "#a78bfa", surfaceAccent: "#ddd6fe" },
  { id: "planet_mycelia",   name: "Mycelia",   x: 1520, y: -360, radius: 44, seed: 15661, type: "fungal",   surfacePrimary: "#d946ef", surfaceAccent: "#fbcfe8" },
  { id: "planet_obsidian",  name: "Obsidian",  x: 1820, y: 470,  radius: 40, seed: 16783, type: "barren",   surfacePrimary: "#475569", surfaceAccent: "#94a3b8" },
  { id: "planet_xelune",    name: "Xelune",    x: 1900, y: -510, radius: 38, seed: 17893, type: "toxic",    surfacePrimary: "#84cc16", surfaceAccent: "#bef264" },
  { id: "planet_aether",    name: "Aether",    x: 2160, y: 60,   radius: 36, seed: 18997, type: "aether",   surfacePrimary: "#22d3ee", surfaceAccent: "#cffafe" },
  { id: "planet_dustcairn", name: "Dustcairn", x: 1640, y: 380,  radius: 34, seed: 20011, type: "ashland",  surfacePrimary: "#a8a29e", surfaceAccent: "#f5f5f4" }
];

const SCI_FI_PLANETS = Object.freeze(PLANET_DEFINITIONS.map((planet, index) => Object.freeze({
  ...planet,
  ...planetSurfaceAnchor(index),
  surfaceRadius: PLANET_SURFACE_RADIUS
})));

const PLANET_SURFACE_LANDING_OFFSET = 6;
const PLANET_SURFACE_EDGE_MARGIN = 1.5;

function getPlanetById(id) {
  if (typeof id !== "string") return null;
  return SCI_FI_PLANETS.find((p) => p.id === id) || null;
}

function getPlanetBySurfacePoint(x, y) {
  for (const planet of SCI_FI_PLANETS) {
    const dx = x - planet.surfaceX;
    const dy = y - planet.surfaceY;
    const r = planet.surfaceRadius + PLANET_SURFACE_EDGE_MARGIN;
    if (dx * dx + dy * dy <= r * r) return planet;
  }
  return null;
}

function getPlanetBySpacePoint(x, y) {
  for (const planet of SCI_FI_PLANETS) {
    const dx = x - planet.x;
    const dy = y - planet.y;
    const r = planet.radius + 2;
    if (dx * dx + dy * dy <= r * r) return planet;
  }
  return null;
}

function biomeTileMix(type, h, TILE) {
  switch (type) {
    case "ice":
      if (h < 0.06) return TILE.WATER;
      if (h < 0.16) return TILE.STONE;
      if (h < 0.28) return TILE.TREE;
      return TILE.SNOW;
    case "desert":
      if (h < 0.04) return TILE.FLOWERS;
      if (h < 0.18) return TILE.STONE;
      if (h < 0.24) return TILE.TREE;
      return TILE.SAND;
    case "volcanic":
      if (h < 0.18) return TILE.LAVA;
      if (h < 0.36) return TILE.STONE;
      if (h < 0.44) return TILE.SAND;
      return TILE.DARK_GRASS;
    case "ocean":
      if (h < 0.78) return TILE.WATER;
      if (h < 0.86) return TILE.SAND;
      if (h < 0.92) return TILE.FLOWERS;
      return TILE.DARK_GRASS;
    case "jungle":
      if (h < 0.42) return TILE.TREE;
      if (h < 0.54) return TILE.FLOWERS;
      if (h < 0.7) return TILE.DARK_GRASS;
      if (h < 0.78) return TILE.WATER;
      return TILE.GRASS;
    case "crystal":
      if (h < 0.20) return TILE.ENERGY;
      if (h < 0.55) return TILE.STONE;
      if (h < 0.7) return TILE.FLOWERS;
      return TILE.DARK_GRASS;
    case "fungal":
      if (h < 0.32) return TILE.FLOWERS;
      if (h < 0.5) return TILE.TREE;
      if (h < 0.6) return TILE.WATER;
      return TILE.DARK_GRASS;
    case "barren":
      if (h < 0.55) return TILE.STONE;
      if (h < 0.7) return TILE.SAND;
      return TILE.DARK_GRASS;
    case "toxic":
      if (h < 0.22) return TILE.WATER;
      if (h < 0.36) return TILE.FLOWERS;
      if (h < 0.5) return TILE.TREE;
      return TILE.DARK_GRASS;
    case "aether":
      if (h < 0.16) return TILE.ENERGY;
      if (h < 0.34) return TILE.WATER;
      if (h < 0.5) return TILE.FLOWERS;
      return TILE.SNOW;
    case "ashland":
      if (h < 0.12) return TILE.LAVA;
      if (h < 0.34) return TILE.STONE;
      if (h < 0.5) return TILE.SAND;
      return TILE.DARK_GRASS;
    case "lush":
    default:
      if (h < 0.05) return TILE.WATER;
      if (h < 0.22) return TILE.TREE;
      if (h < 0.34) return TILE.FLOWERS;
      if (h < 0.58) return TILE.DARK_GRASS;
      return TILE.GRASS;
  }
}

function smoothNoise(hash2, x, y, scale, seed) {
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
  return (a + (b - a) * ux) + (((c + (d - c) * ux) - (a + (b - a) * ux)) * uy);
}

function getPlanetSurfaceTile(planet, x, y, TILE, hash2) {
  const dx = x - planet.surfaceX;
  const dy = y - planet.surfaceY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > planet.surfaceRadius) return TILE.VOID;
  if (Math.round(x - planet.surfaceX) === 0 && Math.round(y - planet.surfaceY) === -3) {
    return TILE.PORTAL;
  }
  if (dist > planet.surfaceRadius - 1.2) {
    return TILE.STONE;
  }
  const localX = x - planet.surfaceX;
  const localY = y - planet.surfaceY;
  const continental = smoothNoise(hash2, localX, localY, 78, planet.seed + 100);
  const regional = smoothNoise(hash2, localX + planet.seed, localY - planet.seed, 28, planet.seed + 200);
  const detail = hash2(x, y, planet.seed | 0);
  const h = continental * 0.52 + regional * 0.34 + detail * 0.14;
  const river = Math.abs(smoothNoise(hash2, localX, localY, 42, planet.seed + 330) - 0.5);
  const ridge = smoothNoise(hash2, localX - 70, localY + 40, 96, planet.seed + 440);
  if (dist < 9) {
    if (planet.type === "ocean" || planet.type === "toxic") return TILE.SAND;
    if (planet.type === "ice" || planet.type === "aether") return TILE.SNOW;
    if (planet.type === "volcanic" || planet.type === "ashland" || planet.type === "barren") return TILE.STONE;
    if (planet.type === "desert") return TILE.SAND;
    return TILE.GRASS;
  }
  if (dist > planet.surfaceRadius - 9) {
    return ridge > 0.58 ? TILE.STONE : TILE.DARK_GRASS;
  }
  if ((planet.type === "lush" || planet.type === "jungle" || planet.type === "fungal") && river < 0.028 && dist > 20) {
    return TILE.WATER;
  }
  if ((planet.type === "crystal" || planet.type === "aether") && ridge > 0.78) {
    return TILE.ENERGY;
  }
  return biomeTileMix(planet.type, h, TILE);
}

function alienAssetKindsForPlanet(type) {
  switch (type) {
    case "ice": return ["alien_crystal", "alien_spire", "alien_flora"];
    case "desert": return ["alien_spire", "alien_vent", "alien_crystal"];
    case "volcanic": return ["alien_vent", "alien_spire", "alien_crystal"];
    case "ocean": return ["alien_coral", "alien_flora", "alien_crystal"];
    case "jungle": return ["alien_flora", "alien_mushroom", "alien_spire"];
    case "crystal": return ["alien_crystal", "alien_spire", "alien_vent"];
    case "fungal": return ["alien_mushroom", "alien_flora", "alien_coral"];
    case "barren": return ["alien_spire", "alien_vent", "alien_crystal"];
    case "toxic": return ["alien_vent", "alien_mushroom", "alien_flora"];
    case "aether": return ["alien_crystal", "alien_flora", "alien_spire"];
    case "ashland": return ["alien_vent", "alien_spire", "alien_mushroom"];
    case "lush":
    default: return ["alien_flora", "alien_mushroom", "alien_crystal"];
  }
}

function planetObjectTouchesChunk(obj, startX, startY, endX, endY) {
  const w = Math.max(1, Number(obj.w || 1));
  const h = Math.max(1, Number(obj.h || 1));
  return obj.x - w / 2 < endX && obj.x + w / 2 > startX && obj.y - h / 2 < endY && obj.y + h / 2 > startY;
}

function getPlanetSurfaceObjectsInChunk(cx, cy, chunkSize, hash2) {
  const startX = cx * chunkSize;
  const startY = cy * chunkSize;
  const endX = startX + chunkSize;
  const endY = startY + chunkSize;
  const out = [];

  for (const planet of SCI_FI_PLANETS) {
    const reach = planet.surfaceRadius + 8;
    if (planet.surfaceX + reach < startX || planet.surfaceX - reach > endX || planet.surfaceY + reach < startY || planet.surfaceY - reach > endY) {
      continue;
    }

    const portal = {
      id: `alien_return_${planet.id}`,
      kind: "alien_return_gate",
      type: "alien_return_gate",
      planetId: planet.id,
      x: planet.surfaceX,
      y: planet.surfaceY - 3,
      w: 4,
      h: 5,
      primary: planet.surfacePrimary,
      accent: planet.surfaceAccent
    };
    if (planetObjectTouchesChunk(portal, startX, startY, endX, endY)) {
      out.push(portal);
    }

    const cxSeed = Math.floor(cx);
    const cySeed = Math.floor(cy);
    const densityRoll = hash2(cxSeed, cySeed, planet.seed + 600);
    const objectCount = densityRoll > 0.78 ? 2 : densityRoll > 0.34 ? 1 : 0;
    const kinds = alienAssetKindsForPlanet(planet.type);
    for (let i = 0; i < objectCount; i += 1) {
      const px = startX + 1.5 + hash2(cxSeed, cySeed, planet.seed + 701 + i * 13) * (chunkSize - 3);
      const py = startY + 1.5 + hash2(cxSeed, cySeed, planet.seed + 811 + i * 17) * (chunkSize - 3);
      const dx = px - planet.surfaceX;
      const dy = py - planet.surfaceY;
      const dist = Math.hypot(dx, dy);
      if (dist < 13 || dist > planet.surfaceRadius - 10) continue;
      const kind = kinds[Math.floor(hash2(cxSeed, cySeed, planet.seed + 911 + i) * kinds.length) % kinds.length];
      const scale = 0.8 + hash2(cxSeed, cySeed, planet.seed + 991 + i) * 0.8;
      out.push({
        id: `alien_${planet.id}_${cx}_${cy}_${i}`,
        kind,
        type: kind,
        planetId: planet.id,
        planetType: planet.type,
        x: Number(px.toFixed(3)),
        y: Number(py.toFixed(3)),
        w: scale * (kind === "alien_spire" ? 2.6 : kind === "alien_coral" ? 2.2 : 1.8),
        h: scale * (kind === "alien_spire" ? 4.6 : kind === "alien_crystal" ? 3.2 : kind === "alien_vent" ? 2.4 : 2.8),
        primary: planet.surfacePrimary,
        accent: planet.surfaceAccent,
        seed: planet.seed + cxSeed * 17 + cySeed * 31 + i
      });
    }
  }

  return out;
}

module.exports = {
  SCI_FI_PLANETS,
  PLANET_SURFACE_LANDING_OFFSET,
  PLANET_SURFACE_EDGE_MARGIN,
  getPlanetById,
  getPlanetBySurfacePoint,
  getPlanetBySpacePoint,
  getPlanetSurfaceTile,
  getPlanetSurfaceObjectsInChunk
};
