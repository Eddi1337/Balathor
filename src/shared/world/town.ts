// Authored layout of Hearthmoor, the walled hub town at the centre of the overworld.
// Pure data + deterministic derivation so server collision and client rendering agree.

import { Tile } from "./tiles";

export const TOWN_RADIUS = 32;
export const TOWN_WALL_INNER = 31.2;
export const TOWN_WALL_OUTER = 32.8;
export const PLAZA_RADIUS = 7.5;
export const RING_ROAD_INNER = 20.8;
export const RING_ROAD_OUTER = 23.2;
export const GATE_HALF_WIDTH = 2.5;
export const ROAD_HALF_WIDTH = 1.6;
export const FOUNTAIN_RADIUS = 1.9;

export const TOWN_SPAWN = { x: 0.5, y: 4.5 } as const;

export type BuildingKind = "store" | "smithy" | "inn" | "guild" | "cottage" | "tower";

export interface Building {
  id: string;
  name: string;
  kind: BuildingKind;
  /** Min corner (tile coords, inclusive). */
  x: number;
  y: number;
  w: number;
  h: number;
  roof: string;
  wall: string;
  /** Door tile on the building edge, and the direction it faces (radians, world space). */
  door: { x: number; y: number; facing: number };
}

export interface Lamp {
  x: number;
  y: number;
}

const ROOFS = ["#e57a5a", "#6fa8dc", "#8fc97a", "#c98bd8", "#f2b950", "#e98aa8"];
const WALLS = ["#fbeedd", "#f4e3c8", "#fff4e6", "#efe2d0"];

function makeBuilding(
  id: string,
  name: string,
  kind: BuildingKind,
  x: number,
  y: number,
  w: number,
  h: number,
  roof: string,
  wall: string
): Building {
  // The door sits on the edge facing the town centre.
  const cx = x + w / 2;
  const cy = y + h / 2;
  let door: Building["door"];
  if (Math.abs(cx) > Math.abs(cy)) {
    const side = cx > 0 ? x : x + w - 1;
    door = { x: side, y: Math.floor(cy), facing: cx > 0 ? Math.PI : 0 };
  } else {
    const side = cy > 0 ? y : y + h - 1;
    door = { x: Math.floor(cx), y: side, facing: cy > 0 ? -Math.PI / 2 : Math.PI / 2 };
  }
  return { id, name, kind, x, y, w, h, roof, wall, door };
}

function buildTownLayout(): { buildings: Building[]; lamps: Lamp[] } {
  const buildings: Building[] = [
    makeBuilding("store", "Pip's Provisions", "store", 5, -13, 7, 5, "#6fa8dc", "#fff4e6"),
    makeBuilding("smithy", "Anvil & Ember", "smithy", -12, -13, 7, 5, "#e57a5a", "#efe2d0"),
    makeBuilding("inn", "The Sleepy Slime", "inn", 5, 8, 8, 6, "#c98bd8", "#fbeedd"),
    makeBuilding("guild", "Adventurers' Guild", "guild", -13, 8, 8, 6, "#f2b950", "#f4e3c8")
  ];

  // Cottages ring the town between the ring road and the wall, skipping the four gate axes.
  const angles = [22, 58, 122, 158, 202, 238, 302, 338];
  angles.forEach((deg, i) => {
    const a = (deg * Math.PI) / 180;
    const r = 27.3;
    const w = 5;
    const h = 4;
    const cx = Math.cos(a) * r;
    const cy = Math.sin(a) * r;
    buildings.push(
      makeBuilding(
        `cottage_${i + 1}`,
        `Cottage ${i + 1}`,
        "cottage",
        Math.round(cx - w / 2),
        Math.round(cy - h / 2),
        w,
        h,
        ROOFS[i % ROOFS.length],
        WALLS[i % WALLS.length]
      )
    );
  });

  const lamps: Lamp[] = [];
  for (let d = 9; d <= 30; d += 5) {
    lamps.push({ x: 2.6, y: d }, { x: -2.1, y: -d }, { x: d, y: -2.1 }, { x: -d, y: 2.6 });
  }
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    lamps.push({ x: Math.cos(a) * (PLAZA_RADIUS + 0.6), y: Math.sin(a) * (PLAZA_RADIUS + 0.6) });
  }
  return { buildings, lamps };
}

export const TOWN = buildTownLayout();

const BUILDING_TILES = new Set<string>();
for (const b of TOWN.buildings) {
  for (let x = b.x; x < b.x + b.w; x += 1) {
    for (let y = b.y; y < b.y + b.h; y += 1) {
      BUILDING_TILES.add(`${x},${y}`);
    }
  }
}

function isGate(x: number, y: number): boolean {
  return Math.abs(x + 0.5) <= GATE_HALF_WIDTH || Math.abs(y + 0.5) <= GATE_HALF_WIDTH;
}

/**
 * Tile override for town cells, or null when (x, y) is outside the walled town.
 * Coordinates are integer tile coords; distances are measured from tile centres.
 */
export function townTileAt(x: number, y: number): number | null {
  const cx = x + 0.5;
  const cy = y + 0.5;
  const d = Math.hypot(cx, cy);
  if (d > TOWN_WALL_OUTER + 0.5) return null;
  if (d >= TOWN_WALL_INNER && d <= TOWN_WALL_OUTER) {
    return isGate(x, y) ? Tile.COBBLE : Tile.WALL;
  }
  if (d > TOWN_WALL_OUTER) return null;
  if (d <= FOUNTAIN_RADIUS) return Tile.FOUNTAIN;
  if (BUILDING_TILES.has(`${x},${y}`)) return Tile.BUILDING;
  if (d <= PLAZA_RADIUS) return Tile.PLAZA;
  if (Math.abs(cx) <= ROAD_HALF_WIDTH || Math.abs(cy) <= ROAD_HALF_WIDTH) return Tile.COBBLE;
  if (d >= RING_ROAD_INNER && d <= RING_ROAD_OUTER) return Tile.PATH;
  // Little gardens: flower beds and hedges tucked between buildings (never in front of doors).
  const garden = ((x * 73856093) ^ (y * 19349663)) >>> 0;
  if (d > PLAZA_RADIUS + 2 && garden % 23 === 0 && !nearDoor(cx, cy)) return Tile.BUSH;
  if (garden % 7 === 0) return Tile.FLOWERS;
  return Tile.MEADOW;
}

function nearDoor(x: number, y: number): boolean {
  for (const b of TOWN.buildings) {
    if (Math.hypot(x - (b.door.x + 0.5), y - (b.door.y + 0.5)) < 4.5) return true;
  }
  return false;
}

export function isInsideTown(x: number, y: number): boolean {
  return Math.hypot(x, y) < TOWN_WALL_INNER;
}

/** A walkable spot just outside a building's door (where NPCs wait / go in at night). */
export function doorFront(buildingId: string, dist = 1.3): { x: number; y: number } {
  const b = TOWN.buildings.find((o) => o.id === buildingId);
  if (!b) return { x: TOWN_SPAWN.x, y: TOWN_SPAWN.y };
  return {
    x: b.door.x + 0.5 + Math.cos(b.door.facing) * dist,
    y: b.door.y + 0.5 + Math.sin(b.door.facing) * dist
  };
}
