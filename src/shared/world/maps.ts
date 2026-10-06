// Every playable space is its own map with its own coordinate system. v1 squeezed interiors,
// dungeons and planets into one plane at magic offsets; v2 keeps them separate, so world lookups
// never have to guess which realm a coordinate belongs to.

import * as overworld from "./overworld";
import type { Biome } from "./overworld";
import { PLOTS_BY_ID, THRONE_ROOM, interiorLayout, interiorTileAt, parseHouseMapId, type InteriorLayout, type Plot } from "./housing";
import { Tile } from "./tiles";
import { riverCurrent } from "./rivers";
import { STATION_ARRIVAL, STATION_W, stationTileAt } from "./scifi/station";
import { SPACE_RADIUS, spaceSpawns, spaceTileAt, LAUNCH_POINT, type SpawnSpec } from "./scifi/space";
import { OCEAN_RADIUS, PORT_SPAWN, isLand, oceanHeightAt, oceanLevelAt, oceanSpawns, oceanTileAt } from "./sea/ocean";
import { LAB_INFO, LAB_W, labLayout, labSpawns, labTileAt, parseLabMapId } from "./scifi/labs";
import { PLANETS, PLANET_PAD, parsePlanetMapId, planetHeightAt, planetLevelAt, planetSpawns, planetTileAt, type PlanetDef } from "./scifi/planets";

export type MapTheme = "fantasy" | "scifi" | "ocean" | "dungeon" | "interior";

/**
 * How a map is laid out (and rendered): the open overworld, a cosy interior, a sci-fi deck
 * (station / labs), open space (you fly a ship) or a planet surface.
 */
export type MapKind = "overworld" | "interior" | "deck" | "space" | "surface" | "sea";

export interface MapDef {
  id: string;
  name: string;
  theme: MapTheme;
  kind: MapKind;
  /** Radius beyond which nothing exists (used for culling / bounds). */
  bounds: number;
  spawn: { x: number; y: number };
  tileAt(x: number, y: number): number;
  heightAt(x: number, y: number): number;
  biomeAt(x: number, y: number): Biome;
  zoneLevelAt(x: number, y: number): number;
  /** River current at a point (overworld only). */
  currentAt?(x: number, y: number): { vx: number; vy: number };
  /** Fixed mob spawns (maps other than the overworld). */
  spawns?(): SpawnSpec[];
}

export interface InteriorMapDef extends MapDef {
  theme: "interior";
  plot: Plot | null;
  floor: number;
  layout: InteriorLayout;
  /** Cells occupied by solid furniture ("x,y"), kept in sync on both sides. */
  blockers: Set<string>;
}

export const OVERWORLD: MapDef = {
  id: "overworld",
  name: "Verdant Isle",
  theme: "fantasy",
  kind: "overworld",
  bounds: overworld.ISLAND_RADIUS + 60,
  spawn: overworld.OVERWORLD_SPAWN,
  tileAt: overworld.tileAt,
  heightAt: overworld.heightAt,
  biomeAt: overworld.biomeAt,
  zoneLevelAt: overworld.zoneLevelAt,
  currentAt: riverCurrent
};

export const STATION: MapDef = {
  id: "station",
  name: "Ringforge Station",
  theme: "scifi",
  kind: "deck",
  bounds: STATION_W,
  spawn: STATION_ARRIVAL,
  tileAt: stationTileAt,
  heightAt: () => 0,
  biomeAt: () => "station",
  zoneLevelAt: () => 1
};

export const SPACE: MapDef = {
  id: "space",
  name: "The Ringforge Expanse",
  theme: "scifi",
  kind: "space",
  bounds: SPACE_RADIUS,
  spawn: LAUNCH_POINT,
  tileAt: spaceTileAt,
  heightAt: () => 0,
  biomeAt: () => "space",
  zoneLevelAt: (x, y) => Math.max(1, Math.min(25, Math.round(1 + Math.hypot(x, y) / 32))),
  spawns: spaceSpawns
};

export const OCEAN: MapDef = {
  id: "ocean",
  name: "The Boundless Ocean",
  theme: "ocean",
  kind: "sea",
  bounds: OCEAN_RADIUS,
  spawn: PORT_SPAWN,
  tileAt: oceanTileAt,
  heightAt: oceanHeightAt,
  biomeAt: (x, y) => (isLand(oceanTileAt(x, y)) ? "beach" : "ocean"),
  zoneLevelAt: oceanLevelAt,
  spawns: oceanSpawns
};

const MAPS = new Map<string, MapDef>([
  [OCEAN.id, OCEAN],
  [OVERWORLD.id, OVERWORLD],
  [STATION.id, STATION],
  [SPACE.id, SPACE]
]);

function createInterior(id: string, plot: Plot | null, floor: number, layout: InteriorLayout, name: string): InteriorMapDef {
  const blockers = new Set<string>();
  return {
    id,
    name,
    theme: "interior",
    kind: "interior",
    bounds: Math.max(layout.w, layout.h) + 4,
    spawn: layout.spawn,
    plot,
    floor,
    layout,
    blockers,
    tileAt(x: number, y: number): number {
      const t = interiorTileAt(layout, x, y);
      if (t === Tile.FLOOR && blockers.has(`${Math.floor(x)},${Math.floor(y)}`)) return Tile.FURNITURE;
      return t;
    },
    heightAt: () => 0,
    biomeAt: () => "town",
    zoneLevelAt: () => 1
  };
}

/** Look up (or lazily create) a map. Unknown ids fall back to the overworld. */
export function getMap(id: string): MapDef {
  const hit = MAPS.get(id);
  if (hit) return hit;
  const house = parseHouseMapId(id);
  if (house) {
    const plot = PLOTS_BY_ID[house.plotId];
    if (plot && (house.floor === 0 || (house.floor === 1 && plot.manor))) {
      const map = createInterior(id, plot, house.floor, interiorLayout(plot, house.floor), house.floor ? `${plot.name} (upstairs)` : plot.name);
      MAPS.set(id, map);
      return map;
    }
  }
  const lab = parseLabMapId(id);
  if (lab) {
    const L = labLayout(lab);
    const map: MapDef = {
      id,
      name: LAB_INFO[lab].name,
      theme: "scifi",
      kind: "deck",
      bounds: LAB_W,
      spawn: { x: L.pad.x, y: L.pad.y + 1.5 },
      tileAt: (x, y) => labTileAt(lab, x, y),
      heightAt: () => 0,
      biomeAt: () => "lab",
      zoneLevelAt: () => LAB_INFO[lab].level,
      spawns: () => labSpawns(lab)
    };
    MAPS.set(id, map);
    return map;
  }
  const planet = parsePlanetMapId(id);
  if (planet) {
    const map = createPlanet(PLANETS[planet]);
    MAPS.set(id, map);
    return map;
  }
  if (id === "castle:throne") {
    const map = createInterior(id, null, 0, THRONE_ROOM, "The Throne Room");
    MAPS.set(id, map);
    return map;
  }
  return OVERWORLD;
}

export interface PlanetMapDef extends MapDef {
  kind: "surface";
  planet: PlanetDef;
}

function createPlanet(def: PlanetDef): PlanetMapDef {
  return {
    id: `planet:${def.id}`,
    name: def.name,
    theme: "scifi",
    kind: "surface",
    planet: def,
    bounds: def.radius + 4,
    spawn: { x: PLANET_PAD.x, y: PLANET_PAD.y + 2.5 },
    tileAt: (x, y) => planetTileAt(def, x, y),
    heightAt: (x, y) => planetHeightAt(def, x, y),
    biomeAt: () => def.biome,
    zoneLevelAt: (x, y) => planetLevelAt(def, x, y),
    spawns: () => planetSpawns(def)
  };
}

export function isPlanet(map: MapDef): map is PlanetMapDef {
  return map.kind === "surface";
}

export function isInterior(map: MapDef): map is InteriorMapDef {
  return map.theme === "interior";
}
