// Every playable space is its own map with its own coordinate system. v1 squeezed interiors,
// dungeons and planets into one plane at magic offsets; v2 keeps them separate, so world lookups
// never have to guess which realm a coordinate belongs to.

import * as overworld from "./overworld";
import type { Biome } from "./overworld";

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
  zoneLevelAt: overworld.zoneLevelAt
};

export const MAPS: Record<string, MapDef> = {
  [OVERWORLD.id]: OVERWORLD
};

export function getMap(id: string): MapDef {
  return MAPS[id] ?? OVERWORLD;
}
