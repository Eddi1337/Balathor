"use strict";

/**
 * Planet world definitions.
 *
 * These surfaces are separate world planes addressed by `planet:<id>` world ids.
 * The legacy x/y values are still world-space coordinates used by the current
 * chunk protocol, but all planet terrain decisions live in this file rather
 * than falling through fantasy terrain generation.
 */

const SCI_FI_PLANETS = Object.freeze([
  { id: "planet_aurelia",   name: "Aurelia",   x: 2142, y: -382, radius: 60, seed: 8128, type: "lush",     surfaceX: 5000, surfaceY: 0, surfaceRadius: 30, surfacePrimary: "#3aa46c", surfaceAccent: "#daf7b0" },
  { id: "planet_icefall",   name: "Icefall",   x: 2214, y: 180,  radius: 52, seed: 9181, type: "ice",      surfaceX: 5150, surfaceY: 0, surfaceRadius: 30, surfacePrimary: "#9fd8ff", surfaceAccent: "#f8fdff" },
  { id: "planet_rust",      name: "Rust",      x: 2050, y: 416,  radius: 46, seed: 10201,type: "desert",   surfaceX: 5300, surfaceY: 0, surfaceRadius: 30, surfacePrimary: "#d3a15b", surfaceAccent: "#ffe0a6" },
  { id: "planet_pyros",     name: "Pyros",     x: 1640, y: -260, radius: 48, seed: 11329,type: "volcanic", surfaceX: 5450, surfaceY: 0, surfaceRadius: 30, surfacePrimary: "#ef4444", surfaceAccent: "#fb923c" },
  { id: "planet_thalas",    name: "Thalas",    x: 1560, y: 240,  radius: 56, seed: 12347,type: "ocean",    surfaceX: 5600, surfaceY: 0, surfaceRadius: 30, surfacePrimary: "#2bb3ff", surfaceAccent: "#a0e7ff" },
  { id: "planet_velm",      name: "Velm",      x: 2306, y: -120, radius: 42, seed: 13441,type: "jungle",   surfaceX: 5750, surfaceY: 0, surfaceRadius: 30, surfacePrimary: "#16a34a", surfaceAccent: "#86efac" },
  { id: "planet_kryon",     name: "Kryon",     x: 2280, y: 400,  radius: 50, seed: 14557,type: "crystal",  surfaceX: 5900, surfaceY: 0, surfaceRadius: 30, surfacePrimary: "#a78bfa", surfaceAccent: "#ddd6fe" },
  { id: "planet_mycelia",   name: "Mycelia",   x: 1520, y: -360, radius: 44, seed: 15661,type: "fungal",   surfaceX: 6050, surfaceY: 0, surfaceRadius: 30, surfacePrimary: "#d946ef", surfaceAccent: "#fbcfe8" },
  { id: "planet_obsidian",  name: "Obsidian",  x: 1820, y: 470,  radius: 40, seed: 16783,type: "barren",   surfaceX: 6200, surfaceY: 0, surfaceRadius: 30, surfacePrimary: "#475569", surfaceAccent: "#94a3b8" },
  { id: "planet_xelune",    name: "Xelune",    x: 1900, y: -510, radius: 38, seed: 17893,type: "toxic",    surfaceX: 6350, surfaceY: 0, surfaceRadius: 30, surfacePrimary: "#84cc16", surfaceAccent: "#bef264" },
  { id: "planet_aether",    name: "Aether",    x: 2160, y: 60,   radius: 36, seed: 18997,type: "aether",   surfaceX: 6500, surfaceY: 0, surfaceRadius: 30, surfacePrimary: "#22d3ee", surfaceAccent: "#cffafe" },
  { id: "planet_dustcairn", name: "Dustcairn", x: 1640, y: 380,  radius: 34, seed: 20011,type: "ashland",  surfaceX: 6650, surfaceY: 0, surfaceRadius: 30, surfacePrimary: "#a8a29e", surfaceAccent: "#f5f5f4" }
]);

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
  const h = hash2(x, y, planet.seed | 0);
  if (dist < 4) {
    if (planet.type === "ocean" || planet.type === "toxic") return TILE.SAND;
    if (planet.type === "ice" || planet.type === "aether") return TILE.SNOW;
    if (planet.type === "volcanic" || planet.type === "ashland" || planet.type === "barren") return TILE.STONE;
    if (planet.type === "desert") return TILE.SAND;
    return TILE.GRASS;
  }
  return biomeTileMix(planet.type, h, TILE);
}

module.exports = {
  SCI_FI_PLANETS,
  PLANET_SURFACE_LANDING_OFFSET,
  PLANET_SURFACE_EDGE_MARGIN,
  getPlanetById,
  getPlanetBySurfacePoint,
  getPlanetBySpacePoint,
  getPlanetSurfaceTile
};
