"use strict";

/**
 * Shared world / game-mode identifiers. Game modes group worlds that share
 * art direction and travel rules; world ids are what the server uses for
 * entity isolation and chunk streaming.
 */

const GAME_MODE_BALATHOR = "balathor";
const GAME_MODE_PIRATE = "pirate";

/** How a world occupies coordinates in the shared universe. */
const COORD_SPACE_SHARED = "shared";
/** Future: instanced maps can reuse local (0,0) without colliding. */
const COORD_SPACE_INSTANCED = "instanced";

/** Tile generation strategy for a world definition. */
const GEN_PROCEDURAL = "procedural";
const GEN_HANDMADE = "handmade";
const GEN_HYBRID = "hybrid";

/** Client render themes (chunk.theme). */
const THEME_FANTASY = "fantasy";
const THEME_SCIFI = "sci-fi";
const THEME_ALIEN = "alien";
const THEME_PIRATE = "pirate";
const THEME_NAUTICAL = "nautical";
const THEME_DUNGEON = "dungeon";

/** Reserved coordinate slab for the upcoming pirate game mode (open sea). */
const PIRATE_WORLD_BOUNDS = Object.freeze({
  xMin: 200_000,
  xMax: 280_000,
  yMin: -40_000,
  yMax: 40_000
});

const FANTASY_WORLD_BOUNDS = Object.freeze({
  xMin: -1000,
  xMax: 1000,
  yMin: -1000,
  yMax: 1000
});

const INTERIOR_PLANE_ORIGIN = Object.freeze({ x: 10_000, y: 10_000 });
const INTERIOR_PLANE_MARGIN = 12;

module.exports = {
  GAME_MODE_BALATHOR,
  GAME_MODE_PIRATE,
  COORD_SPACE_SHARED,
  COORD_SPACE_INSTANCED,
  GEN_PROCEDURAL,
  GEN_HANDMADE,
  GEN_HYBRID,
  THEME_FANTASY,
  THEME_SCIFI,
  THEME_ALIEN,
  THEME_PIRATE,
  THEME_NAUTICAL,
  THEME_DUNGEON,
  PIRATE_WORLD_BOUNDS,
  FANTASY_WORLD_BOUNDS,
  INTERIOR_PLANE_ORIGIN,
  INTERIOR_PLANE_MARGIN
};
