// The Ringforge Expanse: open space around Ringforge Station. Everything here is a point of
// interest (station, outposts, planets, belts) plus a deterministic list of spawns; the map
// itself is an empty flyable plane bounded by a forcefield.

import { Tile } from "../tiles";
import { rng } from "../../math";

export const SPACE_RADIUS = 900;

export type PoiKind = "station" | "outpost" | "planet" | "belt" | "derelict" | "haven";

export interface Poi {
  id: string;
  kind: PoiKind;
  name: string;
  x: number;
  y: number;
  /** Visual / interaction radius. */
  r: number;
  /** Planet map id (planets only). */
  planet?: string;
  /** Suggested level, shown on the warp map. */
  level: number;
  color: string;
}

export const POIS: Poi[] = [
  { id: "ringforge", kind: "station", name: "Ringforge Station", x: 0, y: 0, r: 16, level: 1, color: "#9fd8ff" },
  { id: "kestrel", kind: "outpost", name: "Kestrel Harbor", x: -560, y: -90, r: 12, level: 9, color: "#ffd166" },
  { id: "aurelia", kind: "planet", name: "Aurelia", x: 290, y: -150, r: 44, planet: "planet:aurelia", level: 10, color: "#7fe0a8" },
  { id: "icefall", kind: "planet", name: "Icefall", x: -260, y: -380, r: 38, planet: "planet:icefall", level: 14, color: "#bfe8ff" },
  { id: "rust", kind: "planet", name: "Rust", x: 400, y: 380, r: 52, planet: "planet:rust", level: 18, color: "#ff9a6b" },
  { id: "south_belt", kind: "belt", name: "South Belt", x: 40, y: 230, r: 75, level: 3, color: "#c9b8a8" },
  { id: "ember_belt", kind: "belt", name: "Ember Belt", x: -360, y: 180, r: 70, level: 12, color: "#ff8a5c" },
  { id: "void_rift", kind: "belt", name: "Void Rift", x: 560, y: -470, r: 80, level: 20, color: "#b98cff" },
  { id: "derelict", kind: "derelict", name: "Derelict Helix", x: -430, y: 420, r: 60, level: 8, color: "#9aa0a6" },
  { id: "haven", kind: "haven", name: "Pirate Haven", x: 640, y: 120, r: 70, level: 22, color: "#ff5c6a" }
];

export const POIS_BY_ID: Record<string, Poi> = Object.fromEntries(POIS.map((p) => [p.id, p]));

/** Dock / land when within this distance of a station, outpost or planet centre (+ its radius). */
export const DOCK_RANGE = 10;
/** Station guns cover this radius around Ringforge. */
export const SAFE_RADIUS = 70;
/** Where ships appear when launching from the hangar. */
export const LAUNCH_POINT = { x: 0, y: 24 };
/** Discovery happens within r + this. */
export const DISCOVER_RANGE = 40;

export function spaceTileAt(x: number, y: number): number {
  return Math.hypot(x, y) > SPACE_RADIUS ? Tile.FORCEFIELD : Tile.VOID;
}

/** Arrival point just off a POI's edge (south side, facing in). */
export function poiArrival(p: Poi): { x: number; y: number } {
  return { x: p.x, y: p.y + p.r + DOCK_RANGE * 0.6 };
}

export function poiNear(x: number, y: number, kinds: PoiKind[], extra = DOCK_RANGE): Poi | null {
  for (const p of POIS) {
    if (!kinds.includes(p.kind)) continue;
    if (Math.hypot(x - p.x, y - p.y) <= p.r + extra) return p;
  }
  return null;
}

export interface SpawnSpec {
  id: string;
  tpl: string;
  level: number;
  x: number;
  y: number;
  respawnMs: number;
}

function scatter(out: SpawnSpec[], seed: number, poi: Poi, tpl: string, n: number, lvl: [number, number], respawnMs: number, inner = 0): void {
  const rand = rng(seed);
  for (let i = 0; i < n; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = inner + Math.sqrt(rand()) * (poi.r - inner);
    out.push({
      id: `${poi.id}_${tpl}_${i}`,
      tpl,
      level: lvl[0] + Math.floor(rand() * (lvl[1] - lvl[0] + 1)),
      x: poi.x + Math.cos(a) * r,
      y: poi.y + Math.sin(a) * r,
      respawnMs
    });
  }
}

/** Everything that lives in open space. */
export function spaceSpawns(): SpawnSpec[] {
  const out: SpawnSpec[] = [];
  const P = POIS_BY_ID;
  scatter(out, 11, P.south_belt, "asteroid_ferrite", 34, [2, 4], 40_000);
  scatter(out, 12, P.south_belt, "star_jelly", 10, [2, 4], 45_000);
  scatter(out, 13, P.south_belt, "pirate_fighter", 6, [4, 6], 50_000, 30);
  scatter(out, 21, P.ember_belt, "asteroid_titan", 30, [10, 13], 40_000);
  scatter(out, 22, P.ember_belt, "pirate_fighter", 8, [11, 13], 50_000, 20);
  scatter(out, 31, P.void_rift, "asteroid_void", 30, [19, 22], 45_000);
  scatter(out, 32, P.void_rift, "void_wraith", 10, [20, 23], 55_000, 20);
  scatter(out, 41, P.derelict, "scrap_drone", 16, [7, 9], 45_000);
  scatter(out, 42, P.derelict, "salvage_wreck", 12, [7, 9], 60_000);
  scatter(out, 51, P.haven, "pirate_fighter", 10, [20, 22], 50_000, 20);
  scatter(out, 52, P.haven, "pirate_gunship", 6, [22, 24], 70_000, 20);
  out.push({ id: "boss_vex", tpl: "boss_vex", level: 25, x: P.haven.x + 10, y: P.haven.y - 6, respawnMs: 6 * 60_000 });
  // Gentle jellies drifting near the station and on the way to Aurelia.
  scatter(out, 61, { ...P.ringforge, r: 140 }, "star_jelly", 12, [1, 3], 45_000, 80);
  scatter(out, 62, { ...P.aurelia, x: 150, y: -80, r: 60 }, "star_jelly", 8, [5, 8], 45_000);
  // Pirate scouts along the Kestrel lane.
  scatter(out, 71, { ...P.kestrel, x: -330, y: -50, r: 70 }, "pirate_fighter", 7, [8, 10], 50_000, 10);
  return out;
}
