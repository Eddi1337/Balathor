// Cave dungeons: organic caverns grown with cellular automata. The largest connected cavern is
// kept; the entrance is its westernmost floor, and the boss waits at the floor cell farthest
// (by walking distance) from it. Each cave has a theme: floor, props, pools and creatures.

import { Tile, isBlockingTile } from "../tiles";
import { rng, hash2 } from "../../math";
import type { Biome } from "../overworld";
import type { SpawnSpec } from "../scifi/space";

export type CaveId = "grotto" | "ember" | "frost";

export interface CaveDef {
  id: CaveId;
  name: string;
  seed: number;
  w: number;
  h: number;
  level: number;
  biome: Biome;
  floor: number;
  /** Prop tiles scattered on the floor (weights). */
  props: Partial<Record<number, number>>;
  pool: number;
  mobs: Record<string, number>;
  boss: string;
  /** Overworld mouth: angle and distance from the island centre. */
  angle: number;
  radius: number;
}

export const CAVES: Record<CaveId, CaveDef> = {
  grotto: { id: "grotto", name: "The Mossy Grotto", seed: 5101, w: 84, h: 64, level: 5, biome: "forest", floor: Tile.DARK_GRASS, props: { [Tile.BUSH]: 3, [Tile.CRYSTAL]: 1, [Tile.FLOWERS]: 2 }, pool: Tile.SHALLOW, mobs: { cave_bat: 3, slime: 3, shroom: 3 }, boss: "boss_mossbloom", angle: -2.35, radius: 182 },
  ember: { id: "ember", name: "The Ember Depths", seed: 5202, w: 92, h: 70, level: 15, biome: "ember", floor: Tile.ASH, props: { [Tile.ROCK]: 3, [Tile.CRYSTAL]: 2, [Tile.DEAD_TREE]: 1 }, pool: Tile.WATER, mobs: { fire_bat: 3, imp: 3, golem: 2 }, boss: "boss_magma", angle: -0.5, radius: 330 },
  frost: { id: "frost", name: "The Frostbite Caverns", seed: 5303, w: 96, h: 72, level: 20, biome: "frost", floor: Tile.SNOW, props: { [Tile.CRYSTAL]: 3, [Tile.ROCK]: 2, [Tile.SNOW_PINE]: 1 }, pool: Tile.SHALLOW, mobs: { frost_bat: 3, wisp: 3, yeti: 2 }, boss: "boss_frost_queen", angle: -1.66, radius: 420 }
};

export interface CaveLayout {
  def: CaveDef;
  grid: Uint8Array;
  entry: { x: number; y: number };
  boss: { x: number; y: number };
  /** Floor cells with their walking distance from the entry (for spawns). */
  floor: { x: number; y: number; d: number }[];
}

function generate(def: CaveDef): CaveLayout {
  const { w, h } = def;
  const rand = rng(def.seed);
  let solid = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const edge = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
      solid[y * w + x] = edge || rand() < 0.45 ? 1 : 0;
    }
  }
  for (let it = 0; it < 5; it += 1) {
    const next = new Uint8Array(w * h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) {
          next[y * w + x] = 1;
          continue;
        }
        let n = 0;
        for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) n += solid[(y + dy) * w + x + dx];
        next[y * w + x] = n >= 5 ? 1 : 0;
      }
    }
    solid = next;
  }
  // Keep the largest open region.
  const region = new Int32Array(w * h).fill(-1);
  let best = -1;
  let bestSize = 0;
  let id = 0;
  for (let i = 0; i < w * h; i += 1) {
    if (solid[i] || region[i] >= 0) continue;
    const stack = [i];
    region[i] = id;
    let size = 0;
    while (stack.length) {
      const c = stack.pop()!;
      size += 1;
      const cx = c % w;
      const cy = (c / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (solid[ni] || region[ni] >= 0) continue;
        region[ni] = id;
        stack.push(ni);
      }
    }
    if (size > bestSize) {
      bestSize = size;
      best = id;
    }
    id += 1;
  }
  const grid = new Uint8Array(w * h).fill(Tile.ROCK);
  // Entry: the westernmost cell of the main cavern.
  let entry = { x: 0, y: 0 };
  for (let x = 0; x < w && !entry.x; x += 1) {
    for (let y = 0; y < h; y += 1) {
      if (region[y * w + x] === best) {
        entry = { x, y };
        break;
      }
    }
  }
  // Walking distances from the entry.
  const dist = new Int32Array(w * h).fill(-1);
  const q = [entry.y * w + entry.x];
  dist[q[0]] = 0;
  for (let qi = 0; qi < q.length; qi += 1) {
    const c = q[qi];
    const cx = c % w;
    const cy = (c / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = (cy + dy) * w + cx + dx;
      if (region[ni] !== best || dist[ni] >= 0) continue;
      dist[ni] = dist[c] + 1;
      q.push(ni);
    }
  }
  let far = q[q.length - 1];
  const floor: CaveLayout["floor"] = [];
  const propTotal = Object.values(def.props).reduce<number>((a, b) => a + (b ?? 0), 0);
  for (let i = 0; i < w * h; i += 1) {
    if (region[i] !== best) continue;
    const x = i % w;
    const y = (i / w) | 0;
    // Thin walls next to open space keep their rock; deep interior floor gets the theme.
    let t = def.floor;
    const r = hash2(x, y, def.seed);
    const nearWall = solid[i - 1] || solid[i + 1] || solid[i - w] || solid[i + w];
    if (r < 0.06 && nearWall && dist[i] > 6) {
      let roll = hash2(x, y, def.seed + 1) * propTotal;
      for (const [k, wgt] of Object.entries(def.props)) {
        roll -= wgt ?? 0;
        if (roll <= 0) {
          t = Number(k);
          break;
        }
      }
    } else if (r > 0.985 && dist[i] > 10) t = def.pool;
    grid[i] = t;
    if (dist[i] > dist[far]) far = i;
    if (!isBlockingTile(t) && t !== def.pool) floor.push({ x, y, d: dist[i] });
  }
  // The entry and the boss chamber stay clear.
  const clear = (cx: number, cy: number, r: number) => {
    for (let y = cy - r; y <= cy + r; y += 1) for (let x = cx - r; x <= cx + r; x += 1) if (region[y * w + x] === best) grid[y * w + x] = def.floor;
  };
  const bx = far % w;
  const by = (far / w) | 0;
  clear(entry.x, entry.y, 2);
  clear(bx, by, 3);
  grid[entry.y * w + entry.x] = Tile.PAD;
  return { def, grid, entry: { x: entry.x + 0.5, y: entry.y + 0.5 }, boss: { x: bx + 0.5, y: by + 0.5 }, floor };
}

const LAYOUTS = new Map<CaveId, CaveLayout>();
export function caveLayout(id: CaveId): CaveLayout {
  let l = LAYOUTS.get(id);
  if (!l) LAYOUTS.set(id, (l = generate(CAVES[id])));
  return l;
}

export function caveTileAt(id: CaveId, x: number, y: number): number {
  const def = CAVES[id];
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= def.w || ty >= def.h) return Tile.ROCK;
  return caveLayout(id).grid[ty * def.w + tx];
}

export function caveSpawns(id: CaveId): SpawnSpec[] {
  const L = caveLayout(id);
  const def = L.def;
  const rand = rng(def.seed + 7);
  const keys = Object.keys(def.mobs);
  const total = Object.values(def.mobs).reduce((a, b) => a + b, 0);
  const out: SpawnSpec[] = [];
  const maxD = Math.max(...L.floor.map((f) => f.d));
  let n = 0;
  for (const f of L.floor) {
    if (f.d < 8 || Math.hypot(f.x - L.boss.x, f.y - L.boss.y) < 6) continue;
    if (rand() > 0.03) continue;
    let roll = rand() * total;
    let tpl = keys[0];
    for (const k of keys) {
      roll -= def.mobs[k];
      if (roll <= 0) {
        tpl = k;
        break;
      }
    }
    out.push({ id: `cave_${id}_${n++}`, tpl, level: def.level - 1 + Math.round((f.d / maxD) * 3), x: f.x + 0.5, y: f.y + 0.5, respawnMs: 60_000 });
  }
  out.push({ id: `cave_${id}_boss`, tpl: def.boss, level: def.level + 4, x: L.boss.x, y: L.boss.y, respawnMs: 4 * 60_000 });
  return out;
}

export function parseCaveMapId(map: string): CaveId | null {
  const m = /^cave:(grotto|ember|frost)$/.exec(map);
  return m ? (m[1] as CaveId) : null;
}
