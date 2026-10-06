// Ringforge Station: the sci-fi hub. A walkable deck carved from rectangles: the Stargate Hall
// (north), the Concourse with its holo-fountain, shop alcoves on both sides, and the Hangar Bay
// (south) with the launch pad and the lifts down to the Tech Labs.

import { Tile } from "../tiles";

export const STATION_W = 64;
export const STATION_H = 46;

const grid = new Uint8Array(STATION_W * STATION_H).fill(Tile.METAL_WALL);

function set(x: number, y: number, t: number): void {
  if (x >= 0 && y >= 0 && x < STATION_W && y < STATION_H) grid[y * STATION_W + x] = t;
}
function get(x: number, y: number): number {
  return x >= 0 && y >= 0 && x < STATION_W && y < STATION_H ? grid[y * STATION_W + x] : Tile.METAL_WALL;
}
function rect(x0: number, y0: number, x1: number, y1: number, t: number): void {
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) set(x, y, t);
}

// ── named spots ──────────────────────────────────────────────────────────────

/** Centre of the stargate's event horizon (step in to return to Hearthmoor). */
export const STATION_GATE = { x: 32, y: 2.6 };
export const STATION_ARRIVAL = { x: 32, y: 6.5 };
export const HOLO_FOUNTAIN = { x: 32, y: 22, r: 2.3 };
export const LAUNCH_PAD = { x: 32, y: 38.5, r: 3.2 };
/** Lifts down to Tech Labs I-III. */
export const LIFTS = [
  { lab: 1, x: 47.5, y: 35.5 },
  { lab: 2, x: 50.5, y: 35.5 },
  { lab: 3, x: 53.5, y: 35.5 }
];
/** Shop / NPC alcoves (centre of each). */
export const ALCOVES = {
  shipyard: { x: 4.5, y: 16.5 },
  shipwright: { x: 4.5, y: 22.5 },
  quartermaster: { x: 4.5, y: 28.5 },
  master: { x: 59.5, y: 16.5 },
  cafe: { x: 59.5, y: 22.5 },
  workshop: { x: 59.5, y: 28.5 }
};

// ── carve ────────────────────────────────────────────────────────────────────

// Stargate Hall
rect(22, 2, 41, 11, Tile.METAL_FLOOR);
for (let y = 3; y <= 10; y += 2) {
  set(21, y, Tile.GLASS);
  set(42, y, Tile.GLASS);
}
set(29, 2, Tile.GATE);
set(34, 2, Tile.GATE);
rect(30, 2, 33, 2, Tile.PAD);
rect(30, 5, 33, 7, Tile.PAD);
set(23, 3, Tile.PLANTER);
set(40, 3, Tile.PLANTER);
set(23, 10, Tile.PLANTER);
set(40, 10, Tile.PLANTER);
// Corridor to the concourse
rect(28, 12, 35, 13, Tile.METAL_FLOOR);
// Concourse
rect(8, 14, 55, 29, Tile.METAL_FLOOR);
for (let x = 9; x <= 54; x += 1) if (x < 27 || x > 36) set(x, 13, x % 3 === 0 ? Tile.METAL_WALL : Tile.GLASS);
for (let y = 14; y <= 29; y += 1) {
  for (let x = 28; x <= 36; x += 1) {
    if (Math.hypot(x + 0.5 - HOLO_FOUNTAIN.x, y + 0.5 - HOLO_FOUNTAIN.y) <= HOLO_FOUNTAIN.r) set(x, y, Tile.CONSOLE);
  }
}
for (const [px, py] of [[11, 16], [51, 16], [11, 26], [51, 26], [20, 19], [43, 19], [20, 25], [43, 25]]) rect(px, py, px + 1, py + 1, Tile.PLANTER);
// West alcoves (shipyard, shipwright, quartermaster) and east (station master, cafe, workshop).
for (const [ay] of [[14], [20], [26]]) {
  rect(2, ay, 7, ay + 4, Tile.METAL_FLOOR);
  rect(56, ay, 61, ay + 4, Tile.METAL_FLOOR);
  set(2, ay, Tile.CONSOLE);
  set(2, ay + 4, Tile.CONSOLE);
  set(61, ay, Tile.CONSOLE);
  set(61, ay + 4, Tile.CONSOLE);
}
// Workshop: fabricator + galley along the back wall.
set(61, 27, Tile.CONSOLE);
set(61, 28, Tile.CONSOLE);
set(61, 29, Tile.CONSOLE);
export const FABRICATOR = { x: 61.5, y: 28.0 };
export const GALLEY = { x: 61.5, y: 29.9 };
// Hangar Bay
rect(20, 30, 43, 31, Tile.METAL_FLOOR);
rect(6, 32, 57, 43, Tile.METAL_FLOOR);
for (let x = 7; x <= 56; x += 1) set(x, 44, x % 4 === 0 ? Tile.METAL_WALL : Tile.GLASS);
for (let y = 33; y <= 42; y += 1) {
  for (let x = 28; x <= 36; x += 1) {
    if (Math.hypot(x + 0.5 - LAUNCH_PAD.x, y + 0.5 - LAUNCH_PAD.y) <= LAUNCH_PAD.r) set(x, y, Tile.PAD);
  }
}
for (const l of LIFTS) set(Math.floor(l.x), Math.floor(l.y), Tile.PAD);
// Crates and consoles around the hangar edges.
for (const [cx, cy] of [[8, 34], [9, 34], [8, 35], [8, 41], [9, 41], [55, 41], [55, 40], [16, 42], [44, 42]]) set(cx, cy, Tile.CONSOLE);

export function stationTileAt(x: number, y: number): number {
  return get(Math.floor(x), Math.floor(y));
}

export function isStationPad(x: number, y: number): boolean {
  return get(Math.floor(x), Math.floor(y)) === Tile.PAD;
}
