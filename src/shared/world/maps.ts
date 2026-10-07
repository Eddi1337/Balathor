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
import { OCEAN_RADIUS, PORT_SPAWN, isLand, oceanHeightAt, oceanLevelAt, oceanSpawns, oceanTileAt, sampleOceanTileAt } from "./sea/ocean";
import { CAVES, caveLayout, caveSpawns, caveTileAt, parseCaveMapId } from "./dungeons/caves";
import { DUNGEON_W, GROUP_DUNGEONS, dungeonLayout, dungeonSpawns, dungeonTileAt, parseDungeonMapId } from "./dungeons/group";
import { LIFTS } from "./scifi/station";
import { CAVE_MOUTHS_BY_ID, mouthFront } from "./overworld";
import { LAB_INFO, LAB_W, labLayout, labSpawns, labTileAt, parseLabMapId } from "./scifi/labs";
import { PLANETS, PLANET_PAD, parsePlanetMapId, planetHeightAt, planetLevelAt, planetSpawns, planetTileAt, type PlanetDef } from "./scifi/planets";

export type MapTheme = "fantasy" | "scifi" | "ocean" | "dungeon" | "interior";

/**
 * How a map is laid out (and rendered): the open overworld, a cosy interior, a sci-fi deck
 * (station / labs), open space (you fly a ship) or a planet surface.
 */
export type MapKind = "overworld" | "interior" | "deck" | "space" | "surface" | "sea" | "cave";

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
  /** Cheap single-tile lookup for overview maps (skips chunk generation). */
  sampleTile?(x: number, y: number): number;
  /** Each party gets its own copy ("<id>#<party>") with monsters scaled to the party. */
  instanced?: boolean;
  /** Where you end up when you leave (or log back in after leaving mid-run). */
  exit?: { map: string; x: number; y: number };
}

/** "lab:1#p12" → "lab:1". */
export function baseMapId(id: string): string {
  const i = id.indexOf("#");
  return i < 0 ? id : id.slice(0, i);
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
  currentAt: riverCurrent,
  sampleTile: overworld.sampleTileAt
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
  spawns: oceanSpawns,
  sampleTile: sampleOceanTileAt
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
export function getMap(rawId: string): MapDef {
  const id = baseMapId(rawId);
  const hit = MAPS.get(id);
  if (hit) return hit;
  const cave = parseCaveMapId(id);
  if (cave) {
    const def = CAVES[cave];
    const L = caveLayout(cave);
    const front = mouthFront(CAVE_MOUTHS_BY_ID[cave]);
    const map: MapDef = {
      id,
      name: def.name,
      theme: "dungeon",
      kind: "cave",
      bounds: Math.max(def.w, def.h),
      spawn: { x: L.entry.x + 1, y: L.entry.y },
      tileAt: (x, y) => caveTileAt(cave, x, y),
      heightAt: () => 0,
      biomeAt: () => def.biome,
      zoneLevelAt: () => def.level,
      spawns: () => caveSpawns(cave),
      exit: { map: "overworld", x: front.x, y: front.y }
    };
    MAPS.set(id, map);
    return map;
  }
  const dungeon = parseDungeonMapId(id);
  if (dungeon) {
    const def = GROUP_DUNGEONS[dungeon];
    const L = dungeonLayout(dungeon);
    const map: MapDef = {
      id,
      name: def.name,
      theme: "dungeon",
      kind: "deck",
      bounds: DUNGEON_W,
      spawn: { x: L.pad.x, y: L.pad.y + 1.5 },
      tileAt: (x, y) => dungeonTileAt(dungeon, x, y),
      heightAt: () => 0,
      biomeAt: () => def.biome,
      zoneLevelAt: () => def.level,
      spawns: () => dungeonSpawns(dungeon),
      instanced: true,
      exit: def.from
    };
    MAPS.set(id, map);
    return map;
  }
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
      spawns: () => labSpawns(lab),
      instanced: true,
      exit: { map: "station", x: LIFTS[lab - 1].x, y: LIFTS[lab - 1].y + 1.6 }
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
