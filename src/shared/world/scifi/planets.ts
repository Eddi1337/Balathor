// Planet surfaces: Aurelia (lush glowing jungle), Icefall (crystal tundra) and Rust (red dunes).
// Each is a bounded, deterministic map with a landing pad in the middle, alien flora, ore and
// herbs to gather, its own creatures and a boss, and a guide waiting by the pad.

import { Tile, isBlockingTile } from "../tiles";
import { fbm, hash2, rng, smoothstep, clamp } from "../../math";
import type { Biome } from "../overworld";
import type { SpawnSpec } from "./space";

export type PlanetId = "aurelia" | "icefall" | "rust";

export interface PlanetDef {
  id: PlanetId;
  name: string;
  biome: Biome;
  seed: number;
  radius: number;
  /** Monster level at the pad, rising toward the rim. */
  baseLevel: number;
  hills: number;
  /** Creature spawn weights (template id → weight) and the boss. */
  spawns: Record<string, number>;
  boss: { tpl: string; x: number; y: number };
  /** Quest landmark (survey spot). */
  landmark: { x: number; y: number; name: string };
}

export const PLANETS: Record<PlanetId, PlanetDef> = {
  aurelia: {
    id: "aurelia",
    name: "Aurelia",
    biome: "alien_lush",
    seed: 9101,
    radius: 118,
    baseLevel: 9,
    hills: 2.6,
    spawns: { glowfang: 5, bloomspitter: 3, puffling: 3 },
    boss: { tpl: "boss_maw", x: -70, y: 62 },
    landmark: { x: 52, y: -48, name: "the Singing Grove" }
  },
  icefall: {
    id: "icefall",
    name: "Icefall",
    biome: "alien_ice",
    seed: 9202,
    radius: 112,
    baseLevel: 13,
    hills: 3.4,
    spawns: { shardling: 5, frost_mantis: 3, snowmote: 2 },
    boss: { tpl: "boss_glacier", x: 66, y: 66 },
    landmark: { x: -62, y: 40, name: "the Blue Shardline" }
  },
  rust: {
    id: "rust",
    name: "Rust",
    biome: "alien_rust",
    seed: 9303,
    radius: 124,
    baseLevel: 17,
    hills: 3.0,
    spawns: { dune_skitter: 5, rust_golem: 2, relay_wisp: 3 },
    boss: { tpl: "boss_leviathan", x: 74, y: -60 },
    landmark: { x: 82, y: -40, name: "the Relay Ridge" }
  }
};

export const PAD_RADIUS = 6;
export const PLANET_PAD = { x: 0.5, y: 0.5 };

export function planetMapId(id: PlanetId): string {
  return `planet:${id}`;
}

export function parsePlanetMapId(map: string): PlanetId | null {
  const m = /^planet:(aurelia|icefall|rust)$/.exec(map);
  return m ? (m[1] as PlanetId) : null;
}

export function planetHeightAt(def: PlanetDef, x: number, y: number): number {
  const d = Math.hypot(x, y);
  const hills = fbm(x / 26, y / 26, def.seed + 1, 4) * def.hills;
  const flat = smoothstep(PAD_RADIUS + 1, PAD_RADIUS + 9, d);
  let h = 0.5 + hills * flat;
  // The rim rises into cliffs.
  h += smoothstep(def.radius - 14, def.radius, d) * 6;
  // Lush & rust: a few low basins (pools / acid lakes).
  const basin = fbm(x / 34, y / 34, def.seed + 2, 3);
  if (def.id !== "icefall" && basin > 0.68 && d > 20) h -= smoothstep(0.68, 0.76, basin) * (h + 0.4);
  return h;
}

function rawTile(def: PlanetDef, x: number, y: number): number {
  const cx = x + 0.5;
  const cy = y + 0.5;
  const d = Math.hypot(cx, cy);
  if (d > def.radius) return Tile.FORCEFIELD;
  if (d < PAD_RADIUS) return Tile.PAD;
  if (d > def.radius - 3) return Tile.ROCK;
  const r = hash2(x, y, def.seed + 11);
  const cluster = fbm(cx / 13, cy / 13, def.seed + 12, 3);
  const detail = hash2(x, y, def.seed + 13);
  const basin = fbm(cx / 34, cy / 34, def.seed + 2, 3);
  const clear = d < PAD_RADIUS + 4;
  switch (def.id) {
    case "aurelia": {
      if (basin > 0.72 && d > 20) return Tile.SHALLOW;
      if (clear) return Tile.MEADOW;
      if (cluster > 0.56 && r < 0.3) return Tile.TREE;
      if (r < 0.03) return Tile.BUSH;
      if (r < 0.036) return Tile.CRYSTAL;
      if (detail < 0.1) return Tile.FLOWERS;
      return cluster > 0.5 ? Tile.DARK_GRASS : Tile.GRASS;
    }
    case "icefall": {
      if (clear) return Tile.SNOW;
      if (cluster > 0.62 && r < 0.09) return Tile.SNOW_PINE;
      if (r < 0.022) return Tile.CRYSTAL;
      if (r < 0.04) return Tile.ROCK;
      return fbm(cx / 9, cy / 9, def.seed + 14, 2) > 0.6 ? Tile.PLAZA : Tile.SNOW;
    }
    case "rust": {
      if (basin > 0.73 && d > 20) return Tile.WATER;
      if (clear) return Tile.SAND;
      if (cluster > 0.64 && r < 0.12) return Tile.DEAD_TREE;
      if (r < 0.03) return Tile.ROCK;
      if (r < 0.042) return Tile.CACTUS;
      return fbm(cx / 11, cy / 11, def.seed + 15, 2) > 0.58 ? Tile.ASH : Tile.SAND;
    }
  }
}

const caches = new Map<PlanetId, Map<number, number>>();

export function planetTileAt(def: PlanetDef, x: number, y: number): number {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  let cache = caches.get(def.id);
  if (!cache) caches.set(def.id, (cache = new Map()));
  const key = (tx + 4096) * 8192 + (ty + 4096);
  let t = cache.get(key);
  if (t === undefined) {
    t = rawTile(def, tx, ty);
    cache.set(key, t);
  }
  return t;
}

export function planetLevelAt(def: PlanetDef, x: number, y: number): number {
  return clamp(Math.round(def.baseLevel + (Math.hypot(x, y) / def.radius) * 6), 1, 30);
}

export function planetSpawns(def: PlanetDef): SpawnSpec[] {
  const out: SpawnSpec[] = [];
  const rand = rng(def.seed + 99);
  const total = Object.values(def.spawns).reduce((a, b) => a + b, 0);
  let n = 0;
  for (let i = 0; i < 260 && n < 95; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = 16 + Math.sqrt(rand()) * (def.radius - 22);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    const t = planetTileAt(def, x, y);
    if (isBlockingTile(t) || t === Tile.SHALLOW || t === Tile.PAD) continue;
    let roll = rand() * total;
    let tpl = Object.keys(def.spawns)[0];
    for (const [k, w] of Object.entries(def.spawns)) {
      roll -= w;
      if (roll <= 0) {
        tpl = k;
        break;
      }
    }
    out.push({ id: `${def.id}_m${n++}`, tpl, level: planetLevelAt(def, x, y), x, y, respawnMs: 45_000 });
  }
  const boss = openSpot(def, def.boss.x, def.boss.y);
  out.push({ id: `${def.id}_boss`, tpl: def.boss.tpl, level: def.baseLevel + 8, x: boss.x, y: boss.y, respawnMs: 5 * 60_000 });
  return out;
}

/** Nearest open (walkable, dry) spot with a little room around it. */
export function openSpot(def: PlanetDef, x: number, y: number): { x: number; y: number } {
  const ok = (px: number, py: number) => {
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const t = planetTileAt(def, px + dx, py + dy);
      if (isBlockingTile(t) || t === Tile.SHALLOW) return false;
    }
    return true;
  };
  for (let r = 0; r <= 14; r += 1) {
    for (let i = 0; i < Math.max(1, r * 8); i += 1) {
      const a = (i / Math.max(1, r * 8)) * Math.PI * 2;
      const px = Math.floor(x + Math.cos(a) * r) + 0.5;
      const py = Math.floor(y + Math.sin(a) * r) + 0.5;
      if (ok(px, py)) return { x: px, y: py };
    }
  }
  return { x: PLANET_PAD.x, y: PLANET_PAD.y };
}
