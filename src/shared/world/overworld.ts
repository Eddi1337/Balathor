// The overworld ("Verdant Isle"): a single island with Hearthmoor, the White City, on a hill at
// its centre; farm fields and a green forest belt around the walls; six biome sectors beyond. Fully deterministic from
// WORLD_SEED; client and server both call these functions.

import { Tile, isBlockingTile } from "./tiles";
import { cityHeightAt, cityTileAt, CITY_RADIUS, TOWN_SPAWN } from "./city";
import { initRivers, riverAt } from "./rivers";
import { stargateHeight, stargateTileAt } from "./scifi/stargate";
import { clamp, fbm, hash2, lerp, smoothstep, valueNoise, TAU } from "../math";

export const WORLD_SEED = 1337;
export const ISLAND_RADIUS = 560;
/** Fields and the forest belt around the city count as the gentle "meadow" starter zone. */
export const MEADOW_RADIUS = 168;
export const FIELDS_RADIUS = 128;
const TOWN_RADIUS = CITY_RADIUS;
export const CHUNK = 32;

export type Biome =
  | "town"
  | "meadow"
  | "forest"
  | "swamp"
  | "desert"
  | "frost"
  | "ember"
  | "highlands"
  | "beach"
  | "ocean"
  // Sci-fi realm
  | "station"
  | "space"
  | "lab"
  | "alien_lush"
  | "alien_ice"
  | "alien_rust";

export const BIOMES: Biome[] = ["meadow", "forest", "swamp", "desert", "frost", "ember", "highlands"];

/** Biome sectors by angle (radians, 0 = east, +PI/2 = south since +y is south). */
const SECTORS: { biome: Biome; center: number }[] = [
  { biome: "frost", center: -Math.PI / 2 },
  { biome: "ember", center: -Math.PI / 6 },
  { biome: "desert", center: Math.PI / 6 },
  { biome: "swamp", center: Math.PI / 2 },
  { biome: "forest", center: (5 * Math.PI) / 6 },
  { biome: "highlands", center: (-5 * Math.PI) / 6 }
];

/** The four roads leaving the town gates, each heading into a biome. */
const ROADS = [
  { angle: -Math.PI / 2, length: 470 },
  { angle: 0, length: 470 },
  { angle: Math.PI / 2, length: 470 },
  { angle: Math.PI, length: 470 }
];

export function coastRadiusAt(angle: number): number {
  // Smooth radial noise around the island so the coast has bays and headlands.
  const a = (angle + Math.PI) / TAU;
  const n = valueNoise(a * 9, 0.5, WORLD_SEED + 11) * 0.6 + valueNoise(a * 23, 3.5, WORLD_SEED + 12) * 0.4;
  return ISLAND_RADIUS * (0.86 + n * 0.22);
}

/**
 * Rocky cave mouths on the island: the Seafarer Cave (a tunnel under the sea to Port Bilgewater),
 * three cave dungeons and the Hollow King's Crypt. Each mouth faces back toward the city.
 */
export interface CaveMouth {
  id: string;
  x: number;
  y: number;
  /** Unit vector the mouth opens toward. */
  ox: number;
  oy: number;
  rock: string;
  moss: string;
}

function mouth(id: string, angle: number, radius: number, rock: string, moss: string): CaveMouth {
  return { id, x: Math.round(Math.cos(angle) * radius) + 0.5, y: Math.round(Math.sin(angle) * radius) + 0.5, ox: -Math.cos(angle), oy: -Math.sin(angle), rock, moss };
}

export const CAVE_MOUTHS: CaveMouth[] = [
  mouth("seafarer", 2.25, 150, "#8a8f9a", "#6fae5a"),
  mouth("grotto", -2.35, 182, "#7d8a7a", "#5fae5a"),
  mouth("ember", -0.5, 330, "#6a5a5e", "#ff8a5c"),
  mouth("frost", -1.66, 420, "#c9d6e6", "#f4f8ff"),
  mouth("crypt", -2.75, 430, "#5d6470", "#9a94a6")
];
export const CAVE_MOUTHS_BY_ID: Record<string, CaveMouth> = Object.fromEntries(CAVE_MOUTHS.map((m) => [m.id, m]));
export const SEAFARER_CAVE = CAVE_MOUTHS_BY_ID.seafarer;

/** Where you stand to go in. */
export function mouthFront(m: CaveMouth): { x: number; y: number } {
  return { x: m.x + m.ox * 4.2, y: m.y + m.oy * 4.2 };
}

function caveTileAt(x: number, y: number): number | null {
  for (const m of CAVE_MOUTHS) {
    const dx = x + 0.5 - m.x;
    const dy = y + 0.5 - m.y;
    const d = Math.hypot(dx, dy);
    if (d > 6.5) continue;
    // Rock all round except the mouth.
    const facing = (dx * m.ox + dy * m.oy) / Math.max(0.01, d);
    if (d < 3.6 && !(facing > 0.55 && d > 1.2)) return Tile.ROCK;
    return Tile.MEADOW;
  }
  return null;
}

export const SEAFARER_FRONT = mouthFront(SEAFARER_CAVE);

export function biomeAt(x: number, y: number): Biome {
  const d = Math.hypot(x, y);
  if (d < TOWN_RADIUS + 1) return "town";
  const coast = coastRadiusAt(Math.atan2(y, x));
  if (d > coast) return "ocean";
  if (d > coast - 8) return "beach";
  const meadowEdge = MEADOW_RADIUS + (fbm(x / 40, y / 40, WORLD_SEED + 21, 3) - 0.5) * 30;
  if (d < meadowEdge) return "meadow";
  const warp = (fbm(x / 70, y / 70, WORLD_SEED + 22, 3) - 0.5) * 1.1;
  const angle = Math.atan2(y, x) + warp;
  let best: Biome = "forest";
  let bestDelta = Infinity;
  for (const s of SECTORS) {
    let delta = Math.abs(angle - s.center) % TAU;
    if (delta > Math.PI) delta = TAU - delta;
    if (delta < bestDelta) {
      bestDelta = delta;
      best = s.biome;
    }
  }
  return best;
}

/** Monster level band for a position: 1 in the meadow, rising towards the coast. */
export function zoneLevelAt(x: number, y: number): number {
  const d = Math.hypot(x, y);
  return clamp(Math.round(1 + Math.max(0, d - 132) / 21), 1, 20);
}

function roadDistance(x: number, y: number): number {
  const d = Math.hypot(x, y);
  let best = Infinity;
  for (const road of ROADS) {
    if (d > road.length) continue;
    // Gentle meander: offset perpendicular to the road by low-frequency noise of distance.
    const wobble = (valueNoise(d / 30, road.angle * 7, WORLD_SEED + 31) - 0.5) * 10 * smoothstep(TOWN_RADIUS, TOWN_RADIUS + 30, d);
    const ux = Math.cos(road.angle);
    const uy = Math.sin(road.angle);
    const along = x * ux + y * uy;
    if (along < 0) continue;
    const perp = -x * uy + y * ux - wobble;
    best = Math.min(best, Math.abs(perp));
  }
  return best;
}

function lakeValue(x: number, y: number): number {
  return fbm(x / 46, y / 46, WORLD_SEED + 41, 3);
}

const HILL_AMP: Record<string, number> = {
  frost: 4.2,
  highlands: 4.0,
  ember: 3.0,
  forest: 2.0,
  desert: 1.6,
  swamp: 0.35
};

/** Hill amplitude blended smoothly across sector borders (no cliffs at biome edges). */
function hillAmplitudeAt(x: number, y: number, d: number): number {
  const warp = (fbm(x / 70, y / 70, WORLD_SEED + 22, 3) - 0.5) * 1.1;
  const angle = Math.atan2(y, x) + warp;
  let sum = 0;
  let wsum = 0;
  for (const s of SECTORS) {
    let delta = Math.abs(angle - s.center) % TAU;
    if (delta > Math.PI) delta = TAU - delta;
    const w = Math.exp(-((delta / 0.45) ** 2));
    sum += w * (HILL_AMP[s.biome] ?? 1);
    wsum += w;
  }
  const sectorAmp = sum / Math.max(1e-6, wsum);
  const meadowEdge = MEADOW_RADIUS + (fbm(x / 40, y / 40, WORLD_SEED + 21, 3) - 0.5) * 30;
  return lerp(1.1, sectorAmp, smoothstep(meadowEdge - 12, meadowEdge + 12, d));
}

/** Terrain height with rivers carved in (world units). Sea level is 0. */
export function heightAt(x: number, y: number): number {
  const base = baseHeightAt(x, y);
  const r = riverAt(x, y);
  if (!r) return base;
  const half = r.width / 2;
  const onRoad = roadDistance(x, y) < 1.6;
  if (onRoad) return Math.max(base, r.level + 0.55); // bridge deck
  const bed = r.level - 0.75;
  if (r.dist <= half) return Math.min(base, bed + (r.level - bed) * (r.dist / half) ** 2 * 0.6);
  // Banks slope down to the water.
  const bankT = smoothstep(half + 2.6, half, r.dist);
  return base + (Math.min(base, r.level + 0.15) - base) * bankT;
}

/** Terrain height before rivers carve into it. */
function baseHeightAt(x: number, y: number): number {
  const city = cityHeightAt(x, y);
  if (city !== null) return city;
  const h = naturalHeightAt(x, y);
  return stargateHeight(x, y, h) ?? h;
}

function naturalHeightAt(x: number, y: number): number {
  const d = Math.hypot(x, y);
  const townFlat = 0.6;
  const coast = coastRadiusAt(Math.atan2(y, x));
  const townBlend = smoothstep(TOWN_RADIUS + 1.5, TOWN_RADIUS + 34, d);
  const hills = fbm(x / 38, y / 38, WORLD_SEED + 51, 4) * hillAmplitudeAt(x, y, d) * townBlend;
  let h = townFlat + hills;
  const lake = lakeValue(x, y);
  const roadBlend = smoothstep(3.2, 1.2, roadDistance(x, y));
  if (d > 140 && lake > 0.66) h -= smoothstep(0.66, 0.74, lake) * (h + 0.7) * (1 - roadBlend);
  h = lerp(h, Math.max(0.25, h * 0.6 + 0.2), roadBlend);
  // Coast: hills flatten into a low beach, then the seabed drops away past the shoreline.
  const beach = 0.18;
  if (d < coast - 1.5) {
    return beach + (h - beach) * smoothstep(coast - 2, coast - 30, d);
  }
  return Math.max(-1.8, beach - (d - (coast - 1.5)) * 0.38);
}

function rawTileAt(x: number, y: number): number {
  const city = cityTileAt(x, y);
  if (city !== null) return city;
  const gate = stargateTileAt(x, y);
  if (gate !== null) return gate;
  const cave = caveTileAt(x, y);
  if (cave !== null) return cave;

  const cx = x + 0.5;
  const cy = y + 0.5;
  const d = Math.hypot(cx, cy);
  const coast = coastRadiusAt(Math.atan2(cy, cx));
  if (d > coast + 1) return Tile.WATER;
  if (d > coast - 1) return Tile.SHALLOW;
  const biome = biomeAt(cx, cy);

  // Roads win over everything else outside town (they cross lakes as causeways, rivers by bridge).
  const road = roadDistance(cx, cy);
  if (road < 1.4) return Tile.PATH;
  const nearRoad = road < 3.2;

  const river = riverAt(cx, cy);
  if (river) {
    if (river.dist <= river.width / 2) return Tile.RIVER;
    if (river.dist <= river.width / 2 + 1.2) return hash2(x, y, WORLD_SEED + 66) < 0.25 ? Tile.ROCK : Tile.SAND;
  }

  const lake = lakeValue(cx, cy);
  if (d > 140 && lake > 0.71 && !nearRoad) return Tile.WATER;
  if (d > 140 && lake > 0.68) return biome === "swamp" || biome === "forest" ? Tile.SHALLOW : Tile.SAND;

  if (biome === "beach") {
    return hash2(x, y, WORLD_SEED + 61) > 0.985 ? Tile.PALM : Tile.SAND;
  }

  const r = hash2(x, y, WORLD_SEED + 71);
  const cluster = fbm(cx / 14, cy / 14, WORLD_SEED + 81, 3);
  const detail = hash2(x, y, WORLD_SEED + 91);

  switch (biome) {
    case "meadow": {
      // A clear ring of grass hugs the walls; then patchwork farm fields; then the green forest.
      if (d < TOWN_RADIUS + 5) return detail < 0.1 ? Tile.FLOWERS : Tile.MEADOW;
      if (d < FIELDS_RADIUS) {
        if (nearRoad) return Tile.MEADOW;
        const patch = fbm(cx / 11, cy / 11, WORLD_SEED + 101, 2);
        if (patch > 0.47) return Tile.FIELD;
        if (cluster > 0.7 && r < 0.25) return Tile.TREE;
        if (r < 0.012) return Tile.BUSH;
        return detail < 0.1 ? Tile.FLOWERS : Tile.MEADOW;
      }
      if (!nearRoad) {
        // The forest belt: dense, with sunny glades.
        const glade = fbm(cx / 18, cy / 18, WORLD_SEED + 102, 2);
        if (glade < 0.62 && r < (d < FIELDS_RADIUS + 12 ? 0.22 : 0.42)) return r < 0.12 ? Tile.PINE : Tile.TREE;
        if (r < 0.47 && glade < 0.62) return Tile.BUSH;
        if (r < 0.004) return Tile.ROCK;
      }
      if (detail < 0.12) return Tile.FLOWERS;
      return cluster > 0.55 ? Tile.GRASS : Tile.MEADOW;
    }
    case "forest": {
      if (!nearRoad) {
        if (cluster > 0.5 && r < 0.42) return r < 0.2 ? Tile.PINE : Tile.TREE;
        if (r < 0.05) return Tile.TREE;
        if (r < 0.07) return Tile.BUSH;
        if (r < 0.075) return Tile.ROCK;
      }
      return detail < 0.05 ? Tile.FLOWERS : Tile.DARK_GRASS;
    }
    case "swamp": {
      if (!nearRoad) {
        if (cluster > 0.62 && r < 0.18) return Tile.WILLOW;
        if (lake > 0.6 && detail < 0.45) return Tile.SHALLOW;
        if (r < 0.02) return Tile.BUSH;
      }
      return fbm(cx / 9, cy / 9, WORLD_SEED + 95, 2) > 0.56 ? Tile.MUD : Tile.DARK_GRASS;
    }
    case "desert": {
      if (!nearRoad) {
        if (r < 0.012) return Tile.CACTUS;
        if (r < 0.02) return Tile.ROCK;
        // Oases: rare lush pockets with palms.
        if (cluster > 0.78) return r < 0.12 ? Tile.PALM : Tile.GRASS;
      }
      return Tile.SAND;
    }
    case "frost": {
      if (!nearRoad) {
        if (cluster > 0.52 && r < 0.3) return Tile.SNOW_PINE;
        if (r < 0.02) return Tile.ROCK;
        if (r < 0.024) return Tile.CRYSTAL;
      }
      return Tile.SNOW;
    }
    case "ember": {
      if (!nearRoad) {
        if (cluster > 0.6 && r < 0.12) return Tile.DEAD_TREE;
        if (r < 0.03) return Tile.ROCK;
        if (r < 0.037) return Tile.CRYSTAL;
      }
      return fbm(cx / 11, cy / 11, WORLD_SEED + 96, 2) > 0.68 ? Tile.DARK_GRASS : Tile.ASH;
    }
    case "highlands": {
      if (!nearRoad) {
        if (cluster > 0.6 && r < 0.22) return Tile.PINE;
        if (r < 0.045) return Tile.ROCK;
      }
      return detail < 0.08 ? Tile.FLOWERS : Tile.GRASS;
    }
    default:
      return Tile.GRASS;
  }
}

// Chunk cache: tiles are generated once per 32x32 chunk and kept (bounded) in memory.
const MAX_CACHED_CHUNKS = 2048;
const chunkCache = new Map<number, Uint8Array>();

function chunkKey(cx: number, cy: number): number {
  return (cx + 4096) * 8192 + (cy + 4096);
}

export function getChunkTiles(cx: number, cy: number): Uint8Array {
  const key = chunkKey(cx, cy);
  let tiles = chunkCache.get(key);
  if (tiles) return tiles;
  tiles = new Uint8Array(CHUNK * CHUNK);
  const ox = cx * CHUNK;
  const oy = cy * CHUNK;
  for (let ly = 0; ly < CHUNK; ly += 1) {
    for (let lx = 0; lx < CHUNK; lx += 1) {
      tiles[ly * CHUNK + lx] = rawTileAt(ox + lx, oy + ly);
    }
  }
  if (chunkCache.size >= MAX_CACHED_CHUNKS) {
    const oldest = chunkCache.keys().next().value;
    if (oldest !== undefined) chunkCache.delete(oldest);
  }
  chunkCache.set(key, tiles);
  return tiles;
}

export function tileAt(x: number, y: number): number {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  const cx = Math.floor(tx / CHUNK);
  const cy = Math.floor(ty / CHUNK);
  return getChunkTiles(cx, cy)[(ty - cy * CHUNK) * CHUNK + (tx - cx * CHUNK)];
}

export function isBlockedAt(x: number, y: number): boolean {
  return isBlockingTile(tileAt(x, y));
}

export const OVERWORLD_SPAWN = TOWN_SPAWN;

/** Find a walkable tile near (x, y), searching outward in rings. */
export function findWalkableNear(x: number, y: number, maxRadius = 12): { x: number; y: number } {
  for (let r = 0; r <= maxRadius; r += 1) {
    for (let i = 0; i < Math.max(1, r * 8); i += 1) {
      const a = (i / Math.max(1, r * 8)) * TAU;
      const px = Math.floor(x + Math.cos(a) * r) + 0.5;
      const py = Math.floor(y + Math.sin(a) * r) + 0.5;
      const t = tileAt(px, py);
      if (!isBlockingTile(t) && t !== Tile.SHALLOW) return { x: px, y: py };
    }
  }
  return { x: OVERWORLD_SPAWN.x, y: OVERWORLD_SPAWN.y };
}

initRivers(baseHeightAt);
