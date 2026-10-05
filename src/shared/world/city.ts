// Hearthmoor, the White City: a grand tiered city rising up a hill, ringed by walls.
//
//   tier 0  market ring      (outer wall r=104, four gates; the main gate faces south)
//   tier 1  artisans' ring
//   tier 2  guild ring
//   tier 3  nobles' ring
//   tier 4  the citadel      (castle + White Tree on the summit)
//
// Each terrace is enclosed by a retaining wall with ONE gatehouse; gates alternate sides so the
// main street zig-zags up the hill. Ring streets are lined on both sides by connected rows of
// two- and three-storey houses, with archway bridges across the street. Everything here is
// deterministic data shared by server collision and client rendering.

import { Tile } from "./tiles";

const DEG = Math.PI / 180;

/** Outer radius of each wall: index k encloses tier k. */
export const WALL_R = [104, 82, 61, 42, 25];
export const WALL_THICK = 2.4;
/** Terrace heights (world units) for tiers 0..4. */
export const TIER_H = [1.2, 6.4, 11.6, 16.8, 22.0];
export const OUTSIDE_H = 0.6;
export const CITY_RADIUS = WALL_R[0];
export const ROW_DEPTH = 5;
export const FLOOR_H = 2.15;

export interface Gate {
  wall: number;
  angle: number;
  /** Half-width of the passage in tiles. */
  half: number;
  main?: boolean;
}

export const GATES: Gate[] = [
  { wall: 0, angle: 90 * DEG, half: 3.4, main: true },
  { wall: 0, angle: 0, half: 2.4 },
  { wall: 0, angle: 180 * DEG, half: 2.4 },
  { wall: 0, angle: 270 * DEG, half: 2.4 },
  { wall: 1, angle: 135 * DEG, half: 2.4 },
  { wall: 2, angle: 45 * DEG, half: 2.4 },
  { wall: 3, angle: 135 * DEG, half: 2.2 },
  { wall: 4, angle: 45 * DEG, half: 2.2 }
];

const RAMP_IN = 4.5;
const RAMP_OUT = 5.5;

export const FOUNTAIN = { x: 0, y: 95.5, r: 2.2 };
export const TOWN_SPAWN = { x: 4.5, y: 91.5 };
export const WHITE_TREE = { x: 0, y: 11 };
export const CITADEL_FOUNTAIN = { x: 0.5, y: 18, r: 1.7 };
export const CASTLE = { x: -9, y: -16, w: 18, h: 14, door: { x: 0, y: -2 } };
export const CASTLE_TOWERS = [
  { x: -9, y: -16, r: 2.3 },
  { x: 9, y: -16, r: 2.3 },
  { x: -9, y: -2, r: 2.3 },
  { x: 9, y: -2, r: 2.3 }
];

// ── geometry helpers ─────────────────────────────────────────────────────────

function norm(a: number): number {
  a %= Math.PI * 2;
  return a < 0 ? a + Math.PI * 2 : a;
}

function angDist(a: number, b: number): number {
  const d = Math.abs(norm(a) - norm(b));
  return d > Math.PI ? Math.PI * 2 - d : d;
}

/** Tier of a radius (or -1 outside the city). Wall bands report the tier they enclose. */
export function tierOf(d: number): number {
  for (let k = WALL_R.length - 1; k >= 0; k -= 1) if (d <= WALL_R[k]) return k;
  return -1;
}

export function tierBounds(k: number): { r0: number; r1: number } {
  return { r0: k + 1 < WALL_R.length ? WALL_R[k + 1] : 0, r1: WALL_R[k] - WALL_THICK };
}

// ── houses ───────────────────────────────────────────────────────────────────

export type ShopKind = "store" | "smithy" | "inn" | "guild" | "stable" | "carpenter" | "tackle";

export interface CityHouse {
  id: string;
  tier: number;
  /** 0 = inner row (backs onto the retaining wall), 1 = outer row. */
  row: 0 | 1;
  a0: number;
  a1: number;
  r0: number;
  r1: number;
  floors: number;
  roof: string;
  wall: string;
  /** Named shops/halls in the market. */
  shop?: ShopKind;
  name?: string;
  /** Door: point on the facade (street side) and the outward normal. */
  door: { x: number; y: number; nx: number; ny: number };
  front: { x: number; y: number };
}

export interface Arch {
  tier: number;
  angle: number;
  r0: number;
  r1: number;
}

const ROOFS = ["#e57a5a", "#6fa8dc", "#8fc97a", "#c98bd8", "#f2b950", "#e98aa8", "#7ed6b4", "#ffb38a", "#9fb4ff"];
const WALLS = ["#fff4e6", "#fbeedd", "#f4e3c8", "#fff9f1", "#efe2d0", "#f6ead8"];

function hashf(i: number, j: number): number {
  let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Angular half-width (radians) of the open plaza around each gate at radius r. */
function gatePlazaHalf(gate: Gate, r: number): number {
  const tiles = gate.main ? 13 : gate.wall === 0 ? 7 : 6.5;
  return tiles / r;
}

/** Is (angle, radius) inside a gate's plaza in tier k? */
function inGatePlaza(k: number, a: number, r: number): boolean {
  for (const g of GATES) {
    if (g.wall !== k && g.wall !== k + 1) continue;
    if (angDist(a, g.angle) < gatePlazaHalf(g, r)) return true;
  }
  return false;
}

/** The market around the main gate: a wide square, shops on its inner side. */
const MARKET_A0 = 72 * DEG;
const MARKET_A1 = 108 * DEG;

const MARKET_SHOPS: { shop: ShopKind; name: string; a0: number; a1: number; floors: number; roof: string }[] = [
  { shop: "smithy", name: "Anvil & Ember", a0: 73, a1: 79.5, floors: 2, roof: "#e57a5a" },
  { shop: "store", name: "Pip's Provisions", a0: 79.5, a1: 85.5, floors: 2, roof: "#6fa8dc" },
  { shop: "inn", name: "The Sleepy Slime", a0: 85.5, a1: 94.5, floors: 3, roof: "#c98bd8" },
  { shop: "carpenter", name: "Marta's Workshop", a0: 94.5, a1: 100.5, floors: 2, roof: "#8fc97a" },
  { shop: "tackle", name: "Bram's Tackle & Tools", a0: 100.5, a1: 107, floors: 2, roof: "#7ed6b4" }
];

function buildHouses(): { houses: CityHouse[]; arches: Arch[] } {
  const houses: CityHouse[] = [];
  const arches: Arch[] = [];
  let n = 0;
  for (let k = 0; k < 4; k += 1) {
    const { r0, r1 } = tierBounds(k);
    const rows: [number, number][] = [
      [r0, r0 + ROW_DEPTH],
      [r1 - ROW_DEPTH, r1]
    ];
    rows.forEach(([ra, rb], row) => {
      const rm = (ra + rb) / 2;
      let a = 0;
      let idx = 0;
      while (a < Math.PI * 2 - 1e-6) {
        const widthTiles = 4.5 + hashf(k * 100 + row, idx) * 2.6;
        let next = Math.min(Math.PI * 2, a + widthTiles / rm);
        const mid = (a + next) / 2;
        idx += 1;
        // Leave plazas around gates and the market square open.
        const marketOuter = k === 0 && row === 1 && mid > MARKET_A0 - 0.02 && mid < MARKET_A1 + 0.02;
        if (inGatePlaza(k, mid, rm) || inGatePlaza(k, a, rm) || inGatePlaza(k, next, rm) || marketOuter) {
          a = next;
          continue;
        }
        if (k === 0 && row === 0 && next > MARKET_A0 && a < MARKET_A1) {
          a = next;
          continue; // market shops are placed separately
        }
        // Every so often an alley/garden gap between houses.
        if (hashf(k * 7 + row, idx * 3) < 0.12) {
          a = next;
          continue;
        }
        if (next > Math.PI * 2 - 2 / rm) next = Math.PI * 2;
        const floors = row === 0 ? 3 : hashf(k, idx * 5 + row) < 0.35 ? 3 : 2;
        houses.push(makeHouse(`h${n++}`, k, row as 0 | 1, a, next, ra, rb, floors, ROOFS[(idx + k * 3 + row) % ROOFS.length], WALLS[(idx + row) % WALLS.length]));
        a = next;
      }
    });
    // Archway bridges across the street, linking the two rows' upper floors.
    const count = [9, 8, 7, 6][k];
    for (let i = 0; i < count; i += 1) {
      const ang = (i + 0.5) * ((Math.PI * 2) / count) + k * 0.2;
      const rm = (r0 + r1) / 2;
      if (inGatePlaza(k, ang, rm) || (k === 0 && ang > MARKET_A0 - 0.1 && ang < MARKET_A1 + 0.1)) continue;
      arches.push({ tier: k, angle: ang, r0: r0 + ROW_DEPTH, r1: r1 - ROW_DEPTH });
    }
  }
  // Market shops on the inner side of the market square.
  const { r0 } = tierBounds(0);
  for (const s of MARKET_SHOPS) {
    const h = makeHouse(s.shop, 0, 0, s.a0 * DEG, s.a1 * DEG, r0, r0 + ROW_DEPTH + 1, s.floors, s.roof, "#fff4e6");
    h.shop = s.shop;
    h.name = s.name;
    houses.push(h);
  }
  return { houses, arches };
}

function makeHouse(id: string, tier: number, row: 0 | 1, a0: number, a1: number, ra: number, rb: number, floors: number, roof: string, wall: string): CityHouse {
  const am = (a0 + a1) / 2;
  const ux = Math.cos(am);
  const uy = Math.sin(am);
  // Inner-row doors face outward (toward the street), outer-row doors face inward.
  const facadeR = row === 0 ? rb : ra;
  const n = row === 0 ? 1 : -1;
  const door = { x: ux * (facadeR - n * 0.5), y: uy * (facadeR - n * 0.5), nx: ux * n, ny: uy * n };
  return {
    id,
    tier,
    row,
    a0,
    a1,
    r0: ra,
    r1: rb,
    floors,
    roof,
    wall,
    door,
    front: { x: ux * (facadeR + n * 1.4), y: uy * (facadeR + n * 1.4) }
  };
}

const built = buildHouses();

/** Promote a regular house to a named hall: the one in (tier, row) nearest an angle. */
function promote(tier: number, row: number, angle: number, shop: ShopKind, name: string, roof: string): void {
  let best: CityHouse | null = null;
  for (const h of built.houses) {
    if (h.tier !== tier || h.row !== row || h.shop) continue;
    if (!best || angDist((h.a0 + h.a1) / 2, angle) < angDist((best.a0 + best.a1) / 2, angle)) best = h;
  }
  if (!best) return;
  best.id = shop;
  best.shop = shop;
  best.name = name;
  best.roof = roof;
  best.floors = 3;
}
promote(2, 0, 70 * DEG, "guild", "Adventurers' Guild", "#f2b950");
promote(0, 1, 118 * DEG, "stable", "Holt's Stables", "#9a6b4f");

export const CITY_HOUSES: CityHouse[] = built.houses;
export const CITY_ARCHES: Arch[] = built.arches;
export const CITY_HOUSES_BY_ID: Record<string, CityHouse> = Object.fromEntries(CITY_HOUSES.map((h) => [h.id, h]));

/** Houses sorted by start angle, per tier/row, for fast tile lookup. */
const ROW_INDEX = new Map<string, CityHouse[]>();
for (const h of CITY_HOUSES) {
  const key = `${h.tier}:${h.row}`;
  const list = ROW_INDEX.get(key) ?? [];
  list.push(h);
  ROW_INDEX.set(key, list);
}
for (const list of ROW_INDEX.values()) list.sort((a, b) => a.a0 - b.a0);

function houseAt(tier: number, row: number, a: number, r: number): CityHouse | null {
  const list = ROW_INDEX.get(`${tier}:${row}`);
  if (!list) return null;
  for (const h of list) {
    if (a >= h.a0 && a < h.a1 && r >= h.r0 && r <= h.r1) return h;
  }
  return null;
}

// ── lamps & greenery ─────────────────────────────────────────────────────────

export interface CityLamp {
  x: number;
  y: number;
}

function buildLamps(): CityLamp[] {
  const lamps: CityLamp[] = [];
  for (let k = 0; k < 4; k += 1) {
    const { r0, r1 } = tierBounds(k);
    for (const side of [r0 + ROW_DEPTH + 0.7, r1 - ROW_DEPTH - 0.7]) {
      const step = 11 / side;
      for (let a = step / 2; a < Math.PI * 2; a += step) lamps.push({ x: Math.cos(a) * side, y: Math.sin(a) * side });
    }
  }
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    lamps.push({ x: FOUNTAIN.x + Math.cos(a) * 6.5, y: FOUNTAIN.y + Math.sin(a) * 6.5 });
  }
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    lamps.push({ x: WHITE_TREE.x + Math.cos(a) * 8, y: WHITE_TREE.y + Math.sin(a) * 8 });
  }
  return lamps;
}

export const CITY_LAMPS: CityLamp[] = buildLamps();

// ── tiles & heights ──────────────────────────────────────────────────────────

/** Gate whose passage contains (a, d), if any. */
function gateAt(a: number, d: number): Gate | null {
  for (const g of GATES) {
    const wr = WALL_R[g.wall];
    if (d < wr - WALL_THICK - (g.wall === 0 ? 0.5 : RAMP_IN) || d > wr + (g.wall === 0 ? 1.5 : RAMP_OUT)) continue;
    if (angDist(a, g.angle) * d <= g.half + 0.6) return g;
  }
  return null;
}

/** Tile override for the city, or null outside its walls. */
export function cityTileAt(x: number, y: number): number | null {
  const cx = x + 0.5;
  const cy = y + 0.5;
  const d = Math.hypot(cx, cy);
  if (d > WALL_R[0] + 0.3) return null;
  const a = norm(Math.atan2(cy, cx));

  // Walls (with gate passages).
  for (let k = 0; k < WALL_R.length; k += 1) {
    if (d >= WALL_R[k] - WALL_THICK && d <= WALL_R[k]) {
      const g = gateAt(a, d);
      return g && g.wall === k ? Tile.COBBLE : Tile.WALL;
    }
  }
  if (gateAt(a, d)) return Tile.COBBLE;

  const k = tierOf(d);
  if (k === 4) return citadelTile(cx, cy, d);

  // Market square fountain.
  if (Math.hypot(cx - FOUNTAIN.x, cy - FOUNTAIN.y) <= FOUNTAIN.r) return Tile.FOUNTAIN;

  const { r0, r1 } = tierBounds(k);
  const row = d < r0 + ROW_DEPTH + (k === 0 && a > MARKET_A0 && a < MARKET_A1 ? 1 : 0) ? 0 : d > r1 - ROW_DEPTH ? 1 : -1;
  if (row >= 0) {
    const h = houseAt(k, row, a, d);
    if (h) return Tile.BUILDING;
    // Gaps between houses: little gardens.
    const g = hashf(Math.floor(cx), Math.floor(cy));
    if (inGatePlaza(k, a, d) || (k === 0 && a > MARKET_A0 && a < MARKET_A1)) return Tile.PLAZA;
    return g < 0.2 ? Tile.FLOWERS : Tile.MEADOW;
  }
  if (k === 0 && a > MARKET_A0 && a < MARKET_A1) return Tile.PLAZA;
  if (inGatePlaza(k, a, d)) return Tile.PLAZA;
  // Tree planters down the middle of the wide lower boulevards.
  const mid = (r0 + ROW_DEPTH + r1 - ROW_DEPTH) / 2;
  if (k <= 1 && Math.abs(d - mid) < 0.6) {
    const step = 9 / mid;
    const center = Math.round(a / step) * step;
    if (angDist(a, center) * mid < 0.6) return Tile.TREE;
  }
  return Tile.COBBLE;
}

function citadelTile(cx: number, cy: number, d: number): number {
  if (cx >= CASTLE.x && cx < CASTLE.x + CASTLE.w && cy >= CASTLE.y && cy < CASTLE.y + CASTLE.h) return Tile.BUILDING;
  for (const t of CASTLE_TOWERS) if (Math.hypot(cx - t.x, cy - t.y) <= t.r) return Tile.BUILDING;
  if (Math.hypot(cx - WHITE_TREE.x, cy - WHITE_TREE.y) <= 1.2) return Tile.FOUNTAIN; // the White Tree's stone ring
  if (Math.hypot(cx - CITADEL_FOUNTAIN.x, cy - CITADEL_FOUNTAIN.y) <= CITADEL_FOUNTAIN.r) return Tile.FOUNTAIN;
  if (Math.abs(cx) < 2 && cy > CASTLE.y + CASTLE.h - 0.5) return Tile.COBBLE; // processional way
  if (d > WALL_R[4] - WALL_THICK - 3) return Tile.FLOWERS;
  return Tile.PLAZA;
}

/** Terrace height inside the city (with gatehouse ramps), or null outside. */
export function cityHeightAt(x: number, y: number): number | null {
  const d = Math.hypot(x, y);
  if (d > WALL_R[0] + 1.5) return null;
  const a = norm(Math.atan2(y, x));
  for (const g of GATES) {
    if (g.wall === 0) continue;
    const wr = WALL_R[g.wall];
    const inner = wr - WALL_THICK - RAMP_IN;
    const outer = wr + RAMP_OUT;
    if (d < inner || d > outer) continue;
    if (angDist(a, g.angle) * d > g.half + 2.5) continue;
    const t = (d - inner) / (outer - inner);
    return TIER_H[g.wall] + (TIER_H[g.wall - 1] - TIER_H[g.wall]) * t;
  }
  if (d > WALL_R[0] - WALL_THICK) return d > WALL_R[0] ? OUTSIDE_H + (TIER_H[0] - OUTSIDE_H) * Math.max(0, 1 - (d - WALL_R[0]) / 1.5) : TIER_H[0];
  const k = tierOf(d);
  return TIER_H[k];
}

/** Which wall ring (if any) a tile belongs to, for rendering heights. */
export function wallRingAt(x: number, y: number): number {
  const d = Math.hypot(x + 0.5, y + 0.5);
  for (let k = 0; k < WALL_R.length; k += 1) if (d >= WALL_R[k] - WALL_THICK - 0.01 && d <= WALL_R[k] + 0.01) return k;
  return -1;
}

export function isInsideCity(x: number, y: number): boolean {
  return Math.hypot(x, y) < WALL_R[0] - WALL_THICK;
}

/** Walkable spot just outside a building's door. */
export function doorFront(id: string, dist = 1.4): { x: number; y: number } {
  const h = CITY_HOUSES_BY_ID[id];
  if (!h) return { ...TOWN_SPAWN };
  return { x: h.door.x + h.door.nx * (0.5 + dist), y: h.door.y + h.door.ny * (0.5 + dist) };
}

/** Houses villagers live in (near the market, on the lowest ring). */
export function nearestHouses(x: number, y: number, n: number, filter: (h: CityHouse) => boolean = () => true): CityHouse[] {
  return CITY_HOUSES.filter((h) => !h.shop && filter(h))
    .map((h) => ({ h, d: Math.hypot(h.front.x - x, h.front.y - y) }))
    .sort((p, q) => p.d - q.d)
    .slice(0, n)
    .map((p) => p.h);
}

/**
 * Height of the tallest solid thing (wall, house, castle) at a tile, or -Infinity. The client
 * uses it to keep the camera from hiding behind buildings.
 */
export function obstacleTopAt(x: number, y: number): number {
  const cx = Math.floor(x) + 0.5;
  const cy = Math.floor(y) + 0.5;
  const d = Math.hypot(cx, cy);
  if (d > WALL_R[0] + 0.3) return -Infinity;
  for (let k = 0; k < WALL_R.length; k += 1) {
    if (d >= WALL_R[k] - WALL_THICK && d <= WALL_R[k]) {
      const g = gateAt(norm(Math.atan2(cy, cx)), d);
      const top = k === 0 ? TIER_H[0] + 7 : TIER_H[k] + 1.9;
      return g && g.wall === k ? top - 2 : top;
    }
  }
  const k = tierOf(d);
  if (k === 4) {
    if (cx >= CASTLE.x && cx < CASTLE.x + CASTLE.w && cy >= CASTLE.y && cy < CASTLE.y + CASTLE.h) return TIER_H[4] + 12;
    for (const t of CASTLE_TOWERS) if (Math.hypot(cx - t.x, cy - t.y) <= t.r) return TIER_H[4] + 16;
    return -Infinity;
  }
  const { r0, r1 } = tierBounds(k);
  const a = norm(Math.atan2(cy, cx));
  const row = d < r0 + ROW_DEPTH + 1 ? 0 : d > r1 - ROW_DEPTH ? 1 : -1;
  if (row < 0) return -Infinity;
  const h = houseAt(k, row, a, d);
  return h ? TIER_H[k] + h.floors * FLOOR_H + 1.8 : -Infinity;
}
