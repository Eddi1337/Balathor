// Room-and-corridor layouts (Tech Labs, the Sunken Temple, the Hollow King's Crypt): a seeded
// chain of rooms that snakes across the grid, joined by 3-wide corridors, with the entry pad in
// the first room and a big boss room at the end.

import { Tile } from "../tiles";
import { rng } from "../../math";

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RoomLayout {
  w: number;
  h: number;
  grid: Uint8Array;
  rooms: Room[];
  /** Entry / exit pad. */
  pad: { x: number; y: number };
  boss: { x: number; y: number };
}

export function buildRooms(seed: number, w: number, h: number, count: number, decor: { corner: number[]; wall: number }): RoomLayout {
  const grid = new Uint8Array(w * h).fill(Tile.METAL_WALL);
  const set = (x: number, y: number, t: number) => {
    if (x > 0 && y > 0 && x < w - 1 && y < h - 1) grid[y * w + x] = t;
  };
  const get = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? grid[y * w + x] : Tile.METAL_WALL);
  const rand = rng(seed);
  const cols = 4;
  const rows = 3;
  const cw = Math.floor((w - 2) / cols);
  const ch = Math.floor((h - 2) / rows);
  const order: [number, number][] = [];
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) order.push([r % 2 ? cols - 1 - c : c, r]);
  const n = Math.min(count, order.length);
  const rooms: Room[] = [];
  for (let i = 0; i < n; i += 1) {
    const [c, r] = order[i];
    const last = i === n - 1;
    const rw = last ? cw - 3 : 9 + Math.floor(rand() * (cw - 13));
    const rh = last ? ch - 3 : 8 + Math.floor(rand() * (ch - 12));
    const x = 1 + c * cw + Math.floor((cw - rw) / 2);
    const y = 1 + r * ch + Math.floor((ch - rh) / 2);
    rooms.push({ x, y, w: rw, h: rh });
    for (let yy = y; yy < y + rh; yy += 1) for (let xx = x; xx < x + rw; xx += 1) set(xx, yy, Tile.METAL_FLOOR);
  }
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
  rooms.forEach((rm, i) => {
    for (const [cx, cy] of [[rm.x, rm.y], [rm.x + rm.w - 1, rm.y], [rm.x, rm.y + rm.h - 1], [rm.x + rm.w - 1, rm.y + rm.h - 1]]) {
      if (rand() < 0.7) set(cx, cy, decor.corner[i % decor.corner.length]);
    }
    for (let k = 0; k < 2; k += 1) {
      const cx = rm.x + 2 + Math.floor(rand() * Math.max(1, rm.w - 4));
      if (get(cx, rm.y - 1) === Tile.METAL_WALL && get(cx, rm.y) === Tile.METAL_FLOOR && get(cx - 1, rm.y) === Tile.METAL_FLOOR && get(cx + 1, rm.y) === Tile.METAL_FLOOR) set(cx, rm.y, decor.wall);
    }
  });
  const first = rooms[0];
  const pad = { x: first.x + 2.5, y: first.y + 2.5 };
  set(Math.floor(pad.x), Math.floor(pad.y), Tile.PAD);
  const last = rooms[rooms.length - 1];
  return { w, h, grid, rooms, pad, boss: { x: last.x + last.w / 2, y: last.y + last.h / 2 } };
}

export function roomTileAt(L: RoomLayout, x: number, y: number): number {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= L.w || ty >= L.h) return Tile.METAL_WALL;
  return L.grid[ty * L.w + tx];
}

export interface RoomSpawnInfo {
  level: number;
  boss: string;
  mobs: Record<string, number>;
  guard: string;
}

/** Mobs in every room except the first (safe) and the last (the boss and two guards). */
export function roomSpawns(prefix: string, L: RoomLayout, info: RoomSpawnInfo, seed: number, extra = 0): { id: string; tpl: string; level: number; x: number; y: number; respawnMs: number }[] {
  const rand = rng(seed);
  const out: { id: string; tpl: string; level: number; x: number; y: number; respawnMs: number }[] = [];
  const keys = Object.keys(info.mobs);
  const total = Object.values(info.mobs).reduce((a, b) => a + b, 0);
  L.rooms.forEach((rm, i) => {
    if (i === 0 || i === L.rooms.length - 1) return;
    const n = 3 + Math.floor(rand() * 2) + extra;
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
      if (roomTileAt(L, x, y) !== Tile.METAL_FLOOR) continue;
      out.push({ id: `${prefix}_${i}_${k}`, tpl, level: info.level + Math.floor(rand() * 3) - 1, x, y, respawnMs: 90_000 });
    }
  });
  out.push({ id: `${prefix}_boss`, tpl: info.boss, level: info.level + 4, x: L.boss.x, y: L.boss.y, respawnMs: 4 * 60_000 });
  for (const s of [-1, 1]) out.push({ id: `${prefix}_guard${s}`, tpl: info.guard, level: info.level + 1, x: L.boss.x + s * 4, y: L.boss.y + 2, respawnMs: 90_000 });
  return out;
}
