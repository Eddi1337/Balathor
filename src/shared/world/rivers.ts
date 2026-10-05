// Rivers: meandering water that runs downhill from the highlands/frost to the sea. Swimmable,
// with a current that carries swimmers downstream. Deterministic and shared (collision,
// current physics and rendering all read the same data).

import { valueNoise } from "../math";

export interface RiverInfo {
  /** Distance from the river's centreline. */
  dist: number;
  /** Full width of the water at this point. */
  width: number;
  /** Water surface height. */
  level: number;
  /** Downstream direction (unit). */
  dirX: number;
  dirY: number;
}

interface Pt {
  x: number;
  y: number;
  w: number;
  level: number;
  dx: number;
  dy: number;
}

const CONTROL: { name: string; pts: [number, number][]; w0: number; w1: number }[] = [
  {
    name: "Silverrun",
    pts: [[-335, -262], [-262, -205], [-205, -140], [-160, -82], [-136, -18], [-132, 44], [-118, 112], [-96, 178], [-74, 262], [-52, 350], [-34, 450], [-22, 540], [-16, 640]],
    w0: 3,
    w1: 9
  },
  {
    name: "Frostbrook",
    pts: [[58, -390], [76, -330], [112, -268], [166, -212], [226, -164], [292, -122], [360, -86], [430, -52], [510, -26], [590, -10], [660, 0]],
    w0: 2.6,
    w1: 7
  }
];

export const RIVER_NAMES = CONTROL.map((c) => c.name);
export const MAX_RIVER_WIDTH = 9;

let rivers: Pt[][] | null = null;
const grid = new Map<string, { r: number; i: number }[]>();
const CELL = 16;

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/**
 * Build the river polylines. `baseHeight` is the terrain height before rivers carve into it;
 * water levels follow it downstream but never rise.
 */
export function initRivers(baseHeight: (x: number, y: number) => number): void {
  if (rivers) return;
  rivers = CONTROL.map((c, ri) => {
    const out: Pt[] = [];
    const P = c.pts;
    for (let i = 0; i < P.length - 1; i += 1) {
      const p0 = P[Math.max(0, i - 1)];
      const p1 = P[i];
      const p2 = P[i + 1];
      const p3 = P[Math.min(P.length - 1, i + 2)];
      const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const steps = Math.ceil(segLen / 2.5);
      for (let s = 0; s < steps; s += 1) {
        const t = s / steps;
        let x = catmull(p0[0], p1[0], p2[0], p3[0], t);
        let y = catmull(p0[1], p1[1], p2[1], p3[1], t);
        // Small meanders on top of the spline.
        x += (valueNoise((out.length) / 14, ri * 10, 777) - 0.5) * 6;
        y += (valueNoise((out.length) / 14, ri * 10 + 5, 778) - 0.5) * 6;
        out.push({ x, y, w: 0, level: 0, dx: 0, dy: 0 });
      }
    }
    const n = out.length;
    let level = Infinity;
    for (let i = 0; i < n; i += 1) {
      const p = out[i];
      const next = out[Math.min(n - 1, i + 1)];
      const prev = out[Math.max(0, i - 1)];
      const dl = Math.hypot(next.x - prev.x, next.y - prev.y) || 1;
      p.dx = (next.x - prev.x) / dl;
      p.dy = (next.y - prev.y) / dl;
      p.w = c.w0 + (c.w1 - c.w0) * (i / (n - 1));
      // Water sits a little below the banks and only ever flows downhill.
      level = Math.min(level, baseHeight(p.x, p.y) - 0.35);
      p.level = Math.max(-0.05, level);
      const key = `${Math.floor(p.x / CELL)},${Math.floor(p.y / CELL)}`;
      const list = grid.get(key) ?? [];
      list.push({ r: ri, i });
      grid.set(key, list);
    }
    // Smooth the levels so the surface glides instead of stepping.
    for (let pass = 0; pass < 3; pass += 1) {
      for (let i = 1; i < n - 1; i += 1) out[i].level = Math.min(out[i - 1].level, (out[i - 1].level + out[i].level + out[i + 1].level) / 3);
    }
    return out;
  });
}

/** River data at a point, or null when not near any river. */
export function riverAt(x: number, y: number): RiverInfo | null {
  if (!rivers) return null;
  const cx = Math.floor(x / CELL);
  const cy = Math.floor(y / CELL);
  let best: RiverInfo | null = null;
  for (let ox = -1; ox <= 1; ox += 1) {
    for (let oy = -1; oy <= 1; oy += 1) {
      const list = grid.get(`${cx + ox},${cy + oy}`);
      if (!list) continue;
      for (const { r, i } of list) {
        const pts = rivers[r];
        const a = pts[i];
        const b = pts[Math.min(pts.length - 1, i + 1)];
        const vx = b.x - a.x;
        const vy = b.y - a.y;
        const len2 = vx * vx + vy * vy || 1;
        const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / len2));
        const px = a.x + vx * t;
        const py = a.y + vy * t;
        const d = Math.hypot(x - px, y - py);
        const w = a.w + (b.w - a.w) * t;
        if (d > w / 2 + 3) continue;
        if (!best || d - w / 2 < best.dist - best.width / 2) {
          best = { dist: d, width: w, level: a.level + (b.level - a.level) * t, dirX: a.dx + (b.dx - a.dx) * t, dirY: a.dy + (b.dy - a.dy) * t };
        }
      }
    }
  }
  return best;
}

/** Peak current speed at the centre of the river (tiles/second). */
export const CURRENT_SPEED = 1.9;

/** Current velocity at a point (zero outside rivers), strongest mid-stream. */
export function riverCurrent(x: number, y: number): { vx: number; vy: number } {
  const r = riverAt(x, y);
  if (!r || r.dist > r.width / 2) return { vx: 0, vy: 0 };
  const k = 1 - (r.dist / (r.width / 2)) ** 2;
  const len = Math.hypot(r.dirX, r.dirY) || 1;
  return { vx: (r.dirX / len) * CURRENT_SPEED * (0.35 + 0.65 * k), vy: (r.dirY / len) * CURRENT_SPEED * (0.35 + 0.65 * k) };
}
