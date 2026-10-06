// Sailing ships: hulls with walkable decks, stations (helm, cannons, gangplank), wind and the
// sailing model. A ship has a world transform (x, y, heading f); people aboard stand at local deck
// coordinates (lx across the beam, +x = starboard; ly along the keel, +y = bow), so they ride
// along as the ship moves and turns.

export type SailHullId = "sloop" | "brig" | "galleon";
export const SAIL_HULL_IDS: SailHullId[] = ["sloop", "brig", "galleon"];

export interface SailHull {
  id: SailHullId;
  name: string;
  price: number;
  blurb: string;
  length: number;
  width: number;
  /** Length of the tapering bow section. */
  bow: number;
  masts: number[];
  /** Cannon positions along the keel (one on each side per entry). */
  cannons: number[];
  hp: number;
  speed: number;
  turn: number;
  cannonDmg: number;
  hullColor: string;
  sailColor: string;
  trim: string;
}

export const SAIL_HULLS: Record<SailHullId, SailHull> = {
  sloop: { id: "sloop", name: "Driftwood Sloop", price: 0, blurb: "Small, nimble and forgiving. Captain Marlow lends one to every new sailor.", length: 9, width: 3.6, bow: 2.6, masts: [0.8], cannons: [-1.2, 1.2], hp: 420, speed: 9, turn: 0.95, cannonDmg: 34, hullColor: "#a8784f", sailColor: "#fff6e8", trim: "#5fa8c9" },
  brig: { id: "brig", name: "Gull-Wing Brig", price: 2600, blurb: "Two masts, three cannons a side and room for the whole party.", length: 13, width: 4.6, bow: 3.2, masts: [-1.6, 2.6], cannons: [-3.2, -0.6, 2.0], hp: 860, speed: 10.5, turn: 0.72, cannonDmg: 40, hullColor: "#8a5a3a", sailColor: "#ffe8d6", trim: "#ff8fb1" },
  galleon: { id: "galleon", name: "Golden Galleon", price: 7200, blurb: "A floating castle: four cannons a side and a hull like a mountain.", length: 18, width: 6, bow: 3.8, masts: [-4.2, 0.4, 4.8], cannons: [-5.4, -2.8, -0.2, 2.4], hp: 1600, speed: 9.8, turn: 0.55, cannonDmg: 48, hullColor: "#6a3f2a", sailColor: "#fff1c9", trim: "#ffc94d" }
};

export const SAIL_LEVELS = [0, 0.55, 1];
export const CANNON_RANGE = 22;
export const CANNON_SPEED = 20;
export const BROADSIDE_COOLDOWN_MS = 2600;
export const STATION_REACH = 1.3;
export const BOARD_RANGE = 3.2;

export interface Transform {
  x: number;
  y: number;
  f: number;
}

/** Forward and starboard unit vectors for a heading (world y points south). */
export function axes(f: number): { fx: number; fy: number; rx: number; ry: number } {
  const fx = Math.cos(f);
  const fy = Math.sin(f);
  return { fx, fy, rx: -fy, ry: fx };
}

export function localToWorld(t: Transform, lx: number, ly: number): { x: number; y: number } {
  const a = axes(t.f);
  return { x: t.x + a.fx * ly + a.rx * lx, y: t.y + a.fy * ly + a.ry * lx };
}

export function worldToLocal(t: Transform, x: number, y: number): { lx: number; ly: number } {
  const a = axes(t.f);
  const dx = x - t.x;
  const dy = y - t.y;
  return { lx: dx * a.rx + dy * a.ry, ly: dx * a.fx + dy * a.fy };
}

/** Half the deck width at a point along the keel (the bow tapers to a point). */
export function deckHalfWidth(h: SailHull, ly: number): number {
  const front = h.length / 2 - h.bow;
  if (ly <= front) return h.width / 2;
  return Math.max(0.3, (h.width / 2) * (1 - (ly - front) / h.bow));
}

export function onDeck(h: SailHull, lx: number, ly: number): boolean {
  if (ly < -h.length / 2 + 0.45 || ly > h.length / 2 - 0.5) return false;
  if (Math.abs(lx) > deckHalfWidth(h, ly) - 0.4) return false;
  for (const m of h.masts) if (Math.hypot(lx, ly - m) < 0.42) return false;
  return true;
}

/** Walk on the deck: slide along railings and masts like any wall. */
export function stepDeck(h: SailHull, pos: { lx: number; ly: number }, dlx: number, dly: number, speed: number, dt: number): boolean {
  const len = Math.hypot(dlx, dly);
  if (len < 0.05) return false;
  const k = (Math.min(1, len) / len) * speed * dt;
  let moved = false;
  const nx = pos.lx + dlx * k;
  if (onDeck(h, nx, pos.ly)) {
    pos.lx = nx;
    moved = true;
  }
  const ny = pos.ly + dly * k;
  if (onDeck(h, pos.lx, ny)) {
    pos.ly = ny;
    moved = true;
  }
  return moved;
}

export const HELM = (h: SailHull) => ({ lx: 0, ly: -h.length / 2 + 1.3 });
export const GANGPLANK = (h: SailHull) => ({ lx: -(h.width / 2 - 0.65), ly: -0.3 });
export function cannonSpots(h: SailHull): { lx: number; ly: number; side: -1 | 1 }[] {
  const out: { lx: number; ly: number; side: -1 | 1 }[] = [];
  for (const ly of h.cannons) for (const side of [-1, 1] as const) out.push({ lx: side * (deckHalfWidth(h, ly) - 0.7), ly, side });
  return out;
}

/** The wind blows *toward* this angle; it drifts slowly over the day. */
export function windAngle(now: number): number {
  return 0.9 + Math.sin(now / 180_000) * 1.3 + Math.sin(now / 47_000) * 0.25;
}

const POLAR: [number, number][] = [
  [0, 0.75],
  [1.0, 0.95],
  [1.6, 1.0],
  [2.3, 0.55],
  [2.6, 0.15],
  [Math.PI, 0.12]
];

/** How well a ship sails at this angle off the wind (0 = running downwind, PI = into it). */
export function pointOfSail(off: number): number {
  for (let i = 1; i < POLAR.length; i += 1) {
    if (off <= POLAR[i][0]) {
      const [a0, v0] = POLAR[i - 1];
      const [a1, v1] = POLAR[i];
      return v0 + ((v1 - v0) * (off - a0)) / (a1 - a0);
    }
  }
  return POLAR[POLAR.length - 1][1];
}

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export interface SailBody extends Transform {
  v: number;
  sail: number;
}

/**
 * Advance a ship: turn toward the wanted heading (if any), accelerate toward the speed the wind
 * allows, and stop against land. `sailable(x, y)` says whether water can float the hull there.
 */
export function stepSail(h: SailHull, s: SailBody, want: number | null, wind: number, dt: number, sailable: (x: number, y: number) => boolean): boolean {
  const steer = Math.min(1, 0.35 + Math.abs(s.v) / h.speed);
  if (want !== null) {
    const d = wrapAngle(want - s.f);
    const max = h.turn * steer * dt;
    s.f = wrapAngle(s.f + Math.max(-max, Math.min(max, d)));
  }
  const off = Math.abs(wrapAngle(s.f - wind));
  const target = h.speed * SAIL_LEVELS[s.sail] * pointOfSail(off);
  s.v += (target - s.v) * Math.min(1, dt * 0.45);
  if (Math.abs(s.v) < 0.01) return false;
  const nx = s.x + Math.cos(s.f) * s.v * dt;
  const ny = s.y + Math.sin(s.f) * s.v * dt;
  const probe: Transform = { x: nx, y: ny, f: s.f };
  const pts = [
    localToWorld(probe, 0, h.length / 2),
    localToWorld(probe, 0, -h.length / 2),
    localToWorld(probe, h.width / 2, 0),
    localToWorld(probe, -h.width / 2, 0),
    localToWorld(probe, 0, 0)
  ];
  if (pts.every((p) => sailable(p.x, p.y))) {
    s.x = nx;
    s.y = ny;
    return true;
  }
  // Ran aground: stop dead (a little bump back).
  s.v = -0.4;
  return false;
}
