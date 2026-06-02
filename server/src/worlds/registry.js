"use strict";

/**
 * Central registry of logical worlds and game modes.
 *
 * New maps and game modes register here (or via content/worlds/manifest.json)
 * instead of scattering coordinate checks through world.js.
 */

const { getPlanetBySurfacePoint } = require("./planetWorlds.js");
const { getDungeonByInteriorPoint } = require("./dungeonWorlds.js");
const { isInsidePirateBounds, getPirateWorldTheme } = require("./pirateWorld.js");
const { getOceanusAtPoint } = require("./oceanusWorld.js");
const { readJson } = require("./contentLoader.js");
const {
  GAME_MODE_BALATHOR,
  GAME_MODE_PIRATE,
  COORD_SPACE_SHARED,
  GEN_PROCEDURAL,
  GEN_HYBRID,
  THEME_FANTASY,
  THEME_SCIFI,
  THEME_ALIEN,
  THEME_PIRATE,
  THEME_NAUTICAL,
  THEME_DUNGEON,
  FANTASY_WORLD_BOUNDS,
  INTERIOR_PLANE_ORIGIN,
  INTERIOR_PLANE_MARGIN
} = require("./constants.js");

function isFantasyBounds(x, y) {
  return (
    x > FANTASY_WORLD_BOUNDS.xMin &&
    x < FANTASY_WORLD_BOUNDS.xMax &&
    y > FANTASY_WORLD_BOUNDS.yMin &&
    y < FANTASY_WORLD_BOUNDS.yMax
  );
}

function isInteriorPlane(x, y) {
  if (getDungeonByInteriorPoint(x, y)) {
    return false;
  }
  return (
    x >= INTERIOR_PLANE_ORIGIN.x - INTERIOR_PLANE_MARGIN &&
    y >= INTERIOR_PLANE_ORIGIN.y - INTERIOR_PLANE_MARGIN
  );
}

function isSciFiBounds(x, y) {
  if (isFantasyBounds(x, y) || isInteriorPlane(x, y) || getPlanetBySurfacePoint(x, y)) {
    return false;
  }
  if (isInsidePirateBounds(x, y) || getOceanusAtPoint(x, y)) {
    return false;
  }
  return true;
}

function isOceanusBounds(x, y) {
  return Boolean(getOceanusAtPoint(x, y));
}

/** Built-in world definitions (content manifest can extend metadata). */
const BUILTIN_WORLDS = [
  {
    id: "fantasy",
    gameMode: GAME_MODE_BALATHOR,
    label: "Balathor — fantasy overworld",
    coordSpace: COORD_SPACE_SHARED,
    generation: GEN_PROCEDURAL,
    theme: THEME_FANTASY,
    priority: 30,
    contains(x, y) {
      return isFantasyBounds(x, y) || isInteriorPlane(x, y);
    }
  },
  {
    id: "scifi",
    gameMode: GAME_MODE_BALATHOR,
    label: "Balathor — orbital sector",
    coordSpace: COORD_SPACE_SHARED,
    generation: GEN_PROCEDURAL,
    theme: THEME_SCIFI,
    priority: 20,
    contains(x, y) {
      return isSciFiBounds(x, y);
    }
  },
  {
    id: "oceanus",
    gameMode: GAME_MODE_BALATHOR,
    label: "The Boundless Ocean",
    coordSpace: COORD_SPACE_SHARED,
    generation: GEN_PROCEDURAL,
    theme: THEME_NAUTICAL,
    priority: 28,
    contains: isOceanusBounds
  },
  {
    id: "pirate",
    gameMode: GAME_MODE_PIRATE,
    label: "Pirate seas (preview)",
    coordSpace: COORD_SPACE_SHARED,
    generation: GEN_HYBRID,
    theme: THEME_PIRATE,
    priority: 25,
    contains: isInsidePirateBounds
  }
];

let manifestWorlds = [];
try {
  const manifest = readJson("worlds/manifest.json");
  if (manifest && Array.isArray(manifest.worlds)) {
    manifestWorlds = manifest.worlds
      .filter((w) => w && typeof w.id === "string" && w.builtin === false)
      .map((w) => ({
        id: w.id,
        gameMode: w.gameMode || GAME_MODE_BALATHOR,
        label: w.label || w.id,
        coordSpace: w.coordSpace || COORD_SPACE_SHARED,
        generation: w.generation || GEN_PROCEDURAL,
        theme: w.theme || THEME_FANTASY,
        priority: Number(w.priority) || 10,
        bounds: w.bounds || null,
        contains(x, y) {
          if (!w.bounds) return false;
          const b = w.bounds;
          return x >= b.xMin && x < b.xMax && y >= b.yMin && y < b.yMax;
        }
      }));
  }
} catch {
  manifestWorlds = [];
}

const WORLDS_BY_ID = new Map();
const RESOLVE_ORDER = [...BUILTIN_WORLDS, ...manifestWorlds].sort((a, b) => b.priority - a.priority);

for (const world of RESOLVE_ORDER) {
  WORLDS_BY_ID.set(world.id, world);
}

/**
 * Dungeon instances use dynamic ids `dungeon:<dungeonId>`.
 */
function resolveDungeonWorld(x, y) {
  const dungeon = getDungeonByInteriorPoint(x, y);
  if (!dungeon) return null;
  const id = `dungeon:${dungeon.id}`;
  return {
    id,
    gameMode: GAME_MODE_BALATHOR,
    label: dungeon.name || id,
    coordSpace: COORD_SPACE_SHARED,
    generation: GEN_PROCEDURAL,
    theme: THEME_DUNGEON,
    dungeonId: dungeon.id,
    dungeon
  };
}

/**
 * Planet surfaces use dynamic ids `planet:<planetId>`.
 */
function resolvePlanetWorld(x, y) {
  const planet = getPlanetBySurfacePoint(x, y);
  if (!planet) return null;
  const id = `planet:${planet.id}`;
  return {
    id,
    gameMode: GAME_MODE_BALATHOR,
    label: planet.name || id,
    coordSpace: COORD_SPACE_SHARED,
    generation: GEN_PROCEDURAL,
    theme: THEME_ALIEN,
    planetId: planet.id,
    planet
  };
}

/**
 * Resolve the logical world at world-space tile coordinates.
 * @returns {{ id: string, theme: string, gameMode: string } | null}
 */
function resolveWorldAt(x, y) {
  const dungeonWorld = resolveDungeonWorld(x, y);
  if (dungeonWorld) {
    return dungeonWorld;
  }

  const planetWorld = resolvePlanetWorld(x, y);
  if (planetWorld) {
    return planetWorld;
  }

  for (const world of RESOLVE_ORDER) {
    if (world.contains(x, y)) {
      return world;
    }
  }

  return null;
}

function worldIdAt(x, y) {
  const world = resolveWorldAt(x, y);
  return world ? world.id : "void";
}

function sameWorldAt(ax, ay, bx, by) {
  return worldIdAt(ax, ay) === worldIdAt(bx, by);
}

function getWorldDefinition(id) {
  if (typeof id !== "string" || !id) return null;
  if (id.startsWith("planet:")) {
    return { id, gameMode: GAME_MODE_BALATHOR, theme: THEME_ALIEN, generation: GEN_PROCEDURAL };
  }
  if (id.startsWith("dungeon:")) {
    return { id, gameMode: GAME_MODE_BALATHOR, theme: THEME_DUNGEON, generation: GEN_PROCEDURAL };
  }
  if (id === "oceanus") {
    return { id, gameMode: GAME_MODE_BALATHOR, theme: THEME_NAUTICAL, generation: GEN_PROCEDURAL };
  }
  return WORLDS_BY_ID.get(id) || null;
}

function getThemeAt(x, y) {
  const world = resolveWorldAt(x, y);
  if (world) {
    if (world.id === "pirate") {
      return getPirateWorldTheme();
    }
    return world.theme;
  }
  return THEME_FANTASY;
}

function listWorlds(gameMode) {
  const base = [...WORLDS_BY_ID.values()];
  if (!gameMode) {
    return base.map((w) => ({ id: w.id, gameMode: w.gameMode, label: w.label, theme: w.theme }));
  }
  return base
    .filter((w) => w.gameMode === gameMode)
    .map((w) => ({ id: w.id, gameMode: w.gameMode, label: w.label, theme: w.theme }));
}

function listGameModes() {
  return [
    { id: GAME_MODE_BALATHOR, label: "Balathor (fantasy MMO prototype)" },
    { id: GAME_MODE_PIRATE, label: "Pirate seas (ships, islands, quests)" }
  ];
}

module.exports = {
  resolveWorldAt,
  worldIdAt,
  sameWorldAt,
  getWorldDefinition,
  getThemeAt,
  listWorlds,
  listGameModes,
  isFantasyBounds,
  isInteriorPlane,
  isSciFiBounds,
  BUILTIN_WORLDS,
  GAME_MODE_BALATHOR,
  GAME_MODE_PIRATE
};
