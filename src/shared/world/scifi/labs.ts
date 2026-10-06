// Tech Labs I-III: Dr. Quill's robot-haunted research decks below Ringforge. Each lab is a
// seeded chain of rooms joined by corridors: the lift pad in the first room, security robots
// and turrets in between, and an Overseer waiting in the last (largest) room.

import { Tile } from "../tiles";
import { rng } from "../../math";
import type { SpawnSpec } from "./space";

export const LAB_W = 78;
export const LAB_H = 56;
export type LabId = 1 | 2 | 3;
export const LAB_IDS: LabId[] = [1, 2, 3];

export const LAB_INFO: Record<LabId, { name: string; level: number; boss: string; mobs: Record<string, number> }> = {
  1: { name: "Tech Lab I: Robotics", level: 10, boss: "overseer_1", mobs: { security_bot: 5, laser_turret: 2 } },
  2: { name: "Tech Lab II: Cryo Vaults", level: 18, boss: "overseer_2", mobs: { security_bot: 4, laser_turret: 2, sentinel: 3 } },
  3: { name: "Tech Lab III: The Core", level: 26, boss: "overseer_3", mobs: { security_bot: 3, laser_turret: 3, sentinel: 4 } }
};

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LabLayout {
  id: LabId;
  grid: Uint8Array;
  rooms: Room[];
  /** Lift pad (arrive / leave). */
  pad: { x: number; y: number };
  boss: { x: number; y: number };
}

function build(id: LabId): LabLayout {
  const grid = new Uint8Array(LAB_W * LAB_H).fill(Tile.METAL_WALL);
  const set = (x: number, y: number, t: number) => {
    if (x > 0 && y > 0 && x < LAB_W - 1 && y < LAB_H - 1) grid[y * LAB_W + x] = t;
  };
  const get = (x: number, y: number) => (x >= 0 && y >= 0 && x < LAB_W && y < LAB_H ? grid[y * LAB_W + x] : Tile.METAL_WALL);
  const rand = rng(7000 + id * 131);
  // Snake through a 4x3 grid of cells so the path winds across the whole deck.
  const cols = 4;
  const rows = 3;
  const cw = Math.floor((LAB_W - 2) / cols);
  const ch = Math.floor((LAB_H - 2) / rows);
  const order: [number, number][] = [];
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) order.push([r % 2 ? cols - 1 - c : c, r]);
  const count = 7 + id; // longer labs as they get harder
  const rooms: Room[] = [];
  for (let i = 0; i < Math.min(count, order.length); i += 1) {
    const [c, r] = order[i];
    const last = i === Math.min(count, order.length) - 1;
    const w = last ? cw - 3 : 9 + Math.floor(rand() * (cw - 13));
    const h = last ? ch - 3 : 8 + Math.floor(rand() * (ch - 12));
    const x = 1 + c * cw + Math.floor((cw - w) / 2);
    const y = 1 + r * ch + Math.floor((ch - h) / 2);
    rooms.push({ x, y, w, h });
    for (let yy = y; yy < y + h; yy += 1) for (let xx = x; xx < x + w; xx += 1) set(xx, yy, Tile.METAL_FLOOR);
  }
  // Corridors (3 wide) between consecutive rooms: L-shaped, centre to centre.
  for (let i = 1; i < rooms.length; i += 1) {
    const a = rooms[i - 1];
    const b = rooms[i];
    const ax = Math.floor(a.x + a.w / 2);
    const ay = Math.floor(a.y + a.h / 2);
    const bx = Math.floor(b.x + b.w / 2);
    const by = Math.floor(b.y + b.h / 2);
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x += 1) for (let d = -1; d <= 1; d += 1) set(x, ay + d, Tile.METAL_FLOOR);
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y += 1) for (let d = -1; d <= 1; d += 1) set(bx + d, y, Tile.METAL_FLOOR);
  }
  // Furnishings: consoles along walls and glowing specimen tanks in room corners.
  rooms.forEach((rm, i) => {
    for (const [cx, cy] of [[rm.x, rm.y], [rm.x + rm.w - 1, rm.y], [rm.x, rm.y + rm.h - 1], [rm.x + rm.w - 1, rm.y + rm.h - 1]]) {
      if (rand() < 0.7) set(cx, cy, i % 2 ? Tile.PLANTER : Tile.CONSOLE);
    }
    for (let k = 0; k < 2; k += 1) {
      const cx = rm.x + 2 + Math.floor(rand() * Math.max(1, rm.w - 4));
      if (get(cx, rm.y - 1) === Tile.METAL_WALL && get(cx, rm.y) === Tile.METAL_FLOOR && get(cx - 1, rm.y) === Tile.METAL_FLOOR && get(cx + 1, rm.y) === Tile.METAL_FLOOR) set(cx, rm.y, Tile.CONSOLE);
    }
  });
  const first = rooms[0];
  const pad = { x: first.x + 2.5, y: first.y + 2.5 };
  set(Math.floor(pad.x), Math.floor(pad.y), Tile.PAD);
  const last = rooms[rooms.length - 1];
  const boss = { x: last.x + last.w / 2, y: last.y + last.h / 2 };
  return { id, grid, rooms, pad, boss };
}

const LAYOUTS = new Map<LabId, LabLayout>();
export function labLayout(id: LabId): LabLayout {
  let l = LAYOUTS.get(id);
  if (!l) LAYOUTS.set(id, (l = build(id)));
  return l;
}

export function labTileAt(id: LabId, x: number, y: number): number {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= LAB_W || ty >= LAB_H) return Tile.METAL_WALL;
  return labLayout(id).grid[ty * LAB_W + tx];
}

export function labMapId(id: LabId): string {
  return `lab:${id}`;
}

export function parseLabMapId(map: string): LabId | null {
  const m = /^lab:([123])$/.exec(map);
  return m ? (Number(m[1]) as LabId) : null;
}

export function labSpawns(id: LabId): SpawnSpec[] {
  const L = labLayout(id);
  const info = LAB_INFO[id];
  const rand = rng(9000 + id);
  const out: SpawnSpec[] = [];
  const keys = Object.keys(info.mobs);
  const total = Object.values(info.mobs).reduce((a, b) => a + b, 0);
  L.rooms.forEach((rm, i) => {
    if (i === 0 || i === L.rooms.length - 1) return; // safe arrival room; boss room
    const n = 3 + Math.floor(rand() * 2) + (id - 1);
    for (let k = 0; k < n; k += 1) {
      let roll = rand() * total;
      let tpl = keys[0];
      for (const key of keys) {
        roll -= info.mobs[key];
        if (roll <= 0) {
          tpl = key;
          break;
        }
      }
      const x = rm.x + 1.5 + rand() * (rm.w - 3);
      const y = rm.y + 1.5 + rand() * (rm.h - 3);
      if (labTileAt(id, x, y) !== Tile.METAL_FLOOR) continue;
      out.push({ id: `lab${id}_${i}_${k}`, tpl, level: info.level + Math.floor(rand() * 3) - 1, x, y, respawnMs: 90_000 });
    }
  });
  // The Overseer and two guards.
  out.push({ id: `lab${id}_boss`, tpl: info.boss, level: info.level + 4, x: L.boss.x, y: L.boss.y, respawnMs: 4 * 60_000 });
  for (const s of [-1, 1]) out.push({ id: `lab${id}_guard${s}`, tpl: "security_bot", level: info.level + 1, x: L.boss.x + s * 4, y: L.boss.y + 2, respawnMs: 90_000 });
  return out;
}
