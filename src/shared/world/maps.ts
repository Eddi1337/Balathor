// Every playable space is its own map with its own coordinate system. v1 squeezed interiors,
// dungeons and planets into one plane at magic offsets; v2 keeps them separate, so world lookups
// never have to guess which realm a coordinate belongs to.

import * as overworld from "./overworld";
import type { Biome } from "./overworld";
import { PLOTS_BY_ID, THRONE_ROOM, interiorLayout, interiorTileAt, parseHouseMapId, type InteriorLayout, type Plot } from "./housing";
import { Tile } from "./tiles";
import { riverCurrent } from "./rivers";

export type MapTheme = "fantasy" | "scifi" | "ocean" | "dungeon" | "interior";

export interface MapDef {
  id: string;
  name: string;
  theme: MapTheme;
  /** Radius beyond which nothing exists (used for culling / bounds). */
  bounds: number;
  spawn: { x: number; y: number };
  tileAt(x: number, y: number): number;
  heightAt(x: number, y: number): number;
  biomeAt(x: number, y: number): Biome;
  zoneLevelAt(x: number, y: number): number;
  /** River current at a point (overworld only). */
  currentAt?(x: number, y: number): { vx: number; vy: number };
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
  bounds: overworld.ISLAND_RADIUS + 60,
  spawn: overworld.OVERWORLD_SPAWN,
  tileAt: overworld.tileAt,
  heightAt: overworld.heightAt,
  biomeAt: overworld.biomeAt,
  zoneLevelAt: overworld.zoneLevelAt,
  currentAt: riverCurrent
};

const MAPS = new Map<string, MapDef>([[OVERWORLD.id, OVERWORLD]]);

function createInterior(id: string, plot: Plot | null, floor: number, layout: InteriorLayout, name: string): InteriorMapDef {
  const blockers = new Set<string>();
  return {
    id,
    name,
    theme: "interior",
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
  if (id === "castle:throne") {
    const map = createInterior(id, null, 0, THRONE_ROOM, "The Throne Room");
    MAPS.set(id, map);
    return map;
  }
  return OVERWORLD;
}

export function isInterior(map: MapDef): map is InteriorMapDef {
  return map.theme === "interior";
}
