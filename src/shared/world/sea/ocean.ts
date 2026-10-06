// The Boundless Ocean: one big sea map with Port Bilgewater at its centre and 100+ islands
// scattered around it. Islands come from a seeded list (deterministic on both sides), looked up
// through a coarse spatial hash so tile queries stay cheap.

import { Tile } from "../tiles";
import { fbm, hash2, rng, smoothstep, clamp } from "../../math";
import type { SpawnSpec } from "../scifi/space";

export const OCEAN_SEED = 4242;
export const OCEAN_RADIUS = 950;

export type IsleKind = "port" | "palm" | "rocky" | "jungle" | "pirate" | "ruins" | "treasure" | "turtle" | "skull";

export interface Isle {
  id: string;
  name: string;
  kind: IsleKind;
  x: number;
  y: number;
  r: number;
}

/** Port Bilgewater: the pirate town and its harbour. */
export const PORT: Isle = { id: "port", name: "Port Bilgewater", kind: "port", x: 0, y: 0, r: 44 };
/** End of the long south pier, where ships moor (bow pointing out to sea). */
export const MOORING = { x: 0.5, y: 70, f: Math.PI / 2 };
/** Where the Seafarer Cave tunnel comes out in the port. */
export const GROTTO = { x: -24.5, y: -25.2 };
export const PORT_SPAWN = { x: -21.5, y: -22.5 };

const SPECIAL: Isle[] = [
  PORT,
  { id: "turtle", name: "Turtle Cove", kind: "turtle", x: -390, y: 300, r: 26 },
  { id: "smugglers", name: "Smuggler's Rest", kind: "treasure", x: 300, y: 420, r: 20 },
  { id: "skull", name: "Skull Isle", kind: "skull", x: 540, y: -380, r: 36 }
];

/** Kraken's Maw: open sea where the Kraken lurks. */
export const KRAKEN_MAW = { x: -560, y: -470, r: 60 };

function generateIsles(): Isle[] {
  const rand = rng(OCEAN_SEED);
  const out = [...SPECIAL];
  const kinds: IsleKind[] = ["palm", "palm", "palm", "rocky", "jungle", "jungle", "pirate", "ruins", "treasure"];
  const names = ["Gull", "Coral", "Barnacle", "Mango", "Breezy", "Driftwood", "Pearl", "Kelp", "Starfish", "Sunny", "Lagoon", "Puffin", "Cutlass", "Doubloon", "Mermaid", "Seashell", "Tidal", "Lantern", "Parrot", "Cannon"];
  const suffix = ["Key", "Isle", "Atoll", "Rock", "Cay", "Island", "Reef"];
  let tries = 0;
  while (out.length < 126 && tries < 6000) {
    tries += 1;
    const a = rand() * Math.PI * 2;
    const d = 110 + Math.sqrt(rand()) * (OCEAN_RADIUS - 150);
    const r = 7 + rand() * rand() * 20;
    const x = Math.round(Math.cos(a) * d);
    const y = Math.round(Math.sin(a) * d);
    if (Math.hypot(x - KRAKEN_MAW.x, y - KRAKEN_MAW.y) < KRAKEN_MAW.r + r + 10) continue;
    if (Math.hypot(x - MOORING.x, y - (MOORING.y + 20)) < r + 40) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r + 22)) continue;
    const kind = kinds[Math.floor(rand() * kinds.length)];
    const name = `${names[Math.floor(rand() * names.length)]} ${suffix[Math.floor(rand() * suffix.length)]}`;
    out.push({ id: `isle${out.length}`, name, kind, x, y, r });
  }
  return out;
}

export const ISLES: Isle[] = generateIsles();
export const ISLES_BY_ID: Record<string, Isle> = Object.fromEntries(ISLES.map((i) => [i.id, i]));

// Spatial hash (cells of 96) for quick "which islands are near this point?".
const CELL = 96;
const grid = new Map<number, Isle[]>();
const key = (cx: number, cy: number) => (cx + 512) * 1024 + (cy + 512);
for (const isle of ISLES) {
  const reach = isle.r + 14;
  for (let cy = Math.floor((isle.y - reach) / CELL); cy <= Math.floor((isle.y + reach) / CELL); cy += 1) {
    for (let cx = Math.floor((isle.x - reach) / CELL); cx <= Math.floor((isle.x + reach) / CELL); cx += 1) {
      const k = key(cx, cy);
      const list = grid.get(k) ?? [];
      list.push(isle);
      grid.set(k, list);
    }
  }
}

export function islesNear(x: number, y: number): Isle[] {
  return grid.get(key(Math.floor(x / CELL), Math.floor(y / CELL))) ?? [];
}

/** Signed "land-ness" of a point for an island: > 0 on land (higher inland). */
function isleShape(isle: Isle, x: number, y: number): number {
  const d = Math.hypot(x - isle.x, y - isle.y);
  const a = Math.atan2(y - isle.y, x - isle.x);
  const wobble = isle.kind === "port" ? 0.04 : 0.22;
  const n = fbm(Math.cos(a) * 1.6 + isle.x * 0.01, Math.sin(a) * 1.6 + isle.y * 0.01, OCEAN_SEED + 5, 3) - 0.5;
  return isle.r * (1 + n * wobble * 2) - d;
}

/** The nearest island a point belongs to (land or its shallows), with its shape value. */
export function isleAt(x: number, y: number): { isle: Isle; s: number } | null {
  let best: { isle: Isle; s: number } | null = null;
  for (const isle of islesNear(x, y)) {
    const s = isleShape(isle, x, y);
    if (s > -10 && (!best || s > best.s)) best = { isle, s };
  }
  return best;
}

// ── Port Bilgewater layout ───────────────────────────────────────────────────

export interface PortBuilding {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  roof: string;
}

/** Buildings around the harbour square (x, y = top-left cell). */
export const PORT_BUILDINGS: PortBuilding[] = [
  { id: "tavern", name: "The Salty Barnacle", x: -14, y: 6, w: 9, h: 7, roof: "#c95a3a" },
  { id: "shipwright", name: "Moira's Shipwright", x: 6, y: 6, w: 9, h: 7, roof: "#3f6fb5" },
  { id: "provisions", name: "Provisioner", x: -26, y: -6, w: 7, h: 6, roof: "#5fae5a" },
  { id: "harbour", name: "Harbourmaster's Office", x: 19, y: -6, w: 7, h: 6, roof: "#e0a458" },
  { id: "captain", name: "Captain Marlow's House", x: -6, y: -22, w: 12, h: 8, roof: "#7b3fbf" },
  { id: "house1", name: "Cottage", x: -24, y: 16, w: 6, h: 5, roof: "#ff8fb1" },
  { id: "house2", name: "Cottage", x: 18, y: 16, w: 6, h: 5, roof: "#7fc8ff" },
  { id: "house3", name: "Cottage", x: 24, y: 3, w: 6, h: 5, roof: "#ffd166" },
  { id: "house4", name: "Cottage", x: -32, y: 4, w: 6, h: 5, roof: "#9dffb8" },
  { id: "house5", name: "Lighthouse", x: 30, y: -24, w: 5, h: 5, roof: "#ff5c6a" }
];

export function portDoor(id: string): { x: number; y: number } {
  const b = PORT_BUILDINGS.find((p) => p.id === id)!;
  return { x: b.x + b.w / 2, y: b.y + b.h + 1.2 };
}

function portTile(x: number, y: number, s: number): number | null {
  const cx = x + 0.5;
  const cy = y + 0.5;
  // The long south pier and two side jetties.
  if (cy > 30 && Math.abs(cx - 0.5) <= 2 && cy < MOORING.y - 2) return Tile.FLOOR;
  if (cy > 52 && cy < 55 && Math.abs(cx - 0.5) > 2 && Math.abs(cx - 0.5) < 12) return Tile.FLOOR;
  if (s < 0) return null;
  for (const b of PORT_BUILDINGS) {
    if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return Tile.BUILDING;
  }
  // Grotto mouth (rock outcrop around the cave exit).
  if (Math.hypot(cx - GROTTO.x, cy - (GROTTO.y - 4.4)) < 3.0) return Tile.ROCK;
  const d = Math.hypot(cx, cy);
  if (d < 12) return Tile.PLAZA;
  // A cobbled lane from the square up to the grotto.
  {
    const gx = GROTTO.x;
    const gy = GROTTO.y;
    const t = Math.max(0, Math.min(1, (cx * gx + cy * gy) / (gx * gx + gy * gy)));
    if (Math.hypot(cx - gx * t, cy - gy * t) < 1.6) return Tile.COBBLE;
  }
  if (Math.abs(cx) < 2.5 || Math.abs(cy - 2) < 2) return Tile.COBBLE;
  if (s < 3) return Tile.SAND;
  const r = hash2(x, y, 77);
  if (r < 0.035) return Tile.PALM;
  if (r < 0.05) return Tile.BUSH;
  return r < 0.15 ? Tile.FLOWERS : Tile.GRASS;
}

function rawTile(x: number, y: number): number {
  const cx = x + 0.5;
  const cy = y + 0.5;
  if (Math.hypot(cx, cy) > OCEAN_RADIUS) return Tile.FORCEFIELD;
  const hit = isleAt(cx, cy);
  if (Math.hypot(cx, cy) < PORT.r + 40) {
    const t = portTile(x, y, hit?.isle.kind === "port" ? hit.s : -99);
    if (t !== null) return t;
  }
  if (!hit || hit.s < -4) return Tile.WATER;
  if (hit.s < 0) return Tile.SHALLOW;
  const { isle, s } = hit;
  if (s < 2.5) return hash2(x, y, OCEAN_SEED + 3) > 0.97 ? Tile.ROCK : Tile.SAND;
  const r = hash2(x, y, OCEAN_SEED + 7);
  const cluster = fbm(cx / 9, cy / 9, OCEAN_SEED + 8, 2);
  switch (isle.kind) {
    case "rocky":
    case "skull":
      if (r < 0.12) return Tile.ROCK;
      if (r < 0.16) return Tile.DEAD_TREE;
      return cluster > 0.55 ? Tile.ASH : Tile.SAND;
    case "jungle":
    case "turtle":
      if (cluster > 0.48 && r < 0.38) return r < 0.2 ? Tile.PALM : Tile.TREE;
      if (r < 0.06) return Tile.BUSH;
      return r < 0.12 ? Tile.FLOWERS : Tile.DARK_GRASS;
    case "ruins":
      if (r < 0.06) return Tile.WALL;
      if (r < 0.12) return Tile.PALM;
      return cluster > 0.5 ? Tile.COBBLE : Tile.GRASS;
    default:
      if (r < 0.08) return Tile.PALM;
      if (r < 0.1) return Tile.BUSH;
      if (r < 0.11) return Tile.ROCK;
      return r < 0.16 ? Tile.FLOWERS : Tile.GRASS;
  }
}

const CHUNK = 32;
const chunks = new Map<number, Uint8Array>();
export function oceanTileAt(x: number, y: number): number {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  const ccx = Math.floor(tx / CHUNK);
  const ccy = Math.floor(ty / CHUNK);
  const k = (ccx + 512) * 1024 + (ccy + 512);
  let c = chunks.get(k);
  if (!c) {
    c = new Uint8Array(CHUNK * CHUNK);
    for (let ly = 0; ly < CHUNK; ly += 1) for (let lx = 0; lx < CHUNK; lx += 1) c[ly * CHUNK + lx] = rawTile(ccx * CHUNK + lx, ccy * CHUNK + ly);
    if (chunks.size > 3000) chunks.delete(chunks.keys().next().value!);
    chunks.set(k, c);
  }
  return c[(ty - ccy * CHUNK) * CHUNK + (tx - ccx * CHUNK)];
}

/** Height of the pier planks above the water. */
export const PIER_H = 0.55;

export function oceanHeightAt(x: number, y: number): number {
  if (oceanTileAt(x, y) === Tile.FLOOR) return PIER_H;
  const hit = isleAt(x, y);
  if (!hit) return -2;
  const { isle, s } = hit;
  if (s < 0) return Math.max(-2, s * 0.35 - 0.15);
  const inland = smoothstep(0, isle.r * 0.6, s);
  const hills = isle.kind === "port" ? 0.3 : fbm(x / 14, y / 14, OCEAN_SEED + 9, 3) * (isle.kind === "rocky" || isle.kind === "skull" ? 3.2 : 1.8);
  return 0.18 + inland * (0.5 + hills);
}

/** Can a ship float here? */
export function isSailable(tile: number): boolean {
  return tile === Tile.WATER || tile === Tile.SHALLOW;
}

export function oceanLevelAt(x: number, y: number): number {
  return clamp(Math.round(8 + Math.hypot(x, y) / 42), 1, 30);
}

/** Buried treasure spots ("X marks the spot") on treasure islands. */
export function treasureSpot(isle: Isle): { x: number; y: number } {
  return { x: Math.round(isle.x + isle.r * 0.3) + 0.5, y: Math.round(isle.y - isle.r * 0.2) + 0.5 };
}

export function oceanSpawns(): SpawnSpec[] {
  const out: SpawnSpec[] = [];
  const rand = rng(OCEAN_SEED + 50);
  const land = (x: number, y: number) => {
    const t = oceanTileAt(x, y);
    return t === Tile.SAND || t === Tile.GRASS || t === Tile.DARK_GRASS || t === Tile.FLOWERS || t === Tile.ASH || t === Tile.COBBLE;
  };
  for (const isle of ISLES) {
    if (isle.kind === "port") continue;
    const lvl = oceanLevelAt(isle.x, isle.y);
    const n = Math.round(isle.r / 4);
    const table: Record<string, number> =
      isle.kind === "pirate" || isle.kind === "skull" ? { pirate_brute: 3, pirate_gunner: 2, crab: 1 }
      : isle.kind === "ruins" ? { skeleton: 3, crab: 1 }
      : isle.kind === "turtle" ? { crab: 1, sea_turtle: 3 }
      : { crab: 3, parrot: 1 };
    const keys = Object.keys(table);
    const total = Object.values(table).reduce((a, b) => a + b, 0);
    for (let i = 0; i < n; i += 1) {
      const a = rand() * Math.PI * 2;
      const r = rand() * isle.r * 0.8;
      const x = isle.x + Math.cos(a) * r;
      const y = isle.y + Math.sin(a) * r;
      if (!land(x, y)) continue;
      let roll = rand() * total;
      let tpl = keys[0];
      for (const k of keys) {
        roll -= table[k];
        if (roll <= 0) {
          tpl = k;
          break;
        }
      }
      out.push({ id: `${isle.id}_${i}`, tpl, level: lvl + Math.floor(rand() * 3) - 1, x, y, respawnMs: 50_000 });
    }
  }
  // Out at sea: sharks everywhere, pirate ships on the lanes, the Kraken in its maw.
  for (let i = 0; i < 70; i += 1) {
    const a = rand() * Math.PI * 2;
    const d = 140 + Math.sqrt(rand()) * (OCEAN_RADIUS - 180);
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    if (oceanTileAt(x, y) !== Tile.WATER) continue;
    const tpl = i % 3 === 0 ? (d > 500 ? "pirate_frigate" : "pirate_sloop") : "shark";
    out.push({ id: `sea_${i}`, tpl, level: oceanLevelAt(x, y), x, y, respawnMs: tpl === "shark" ? 45_000 : 70_000 });
  }
  out.push({ id: "boss_kraken", tpl: "boss_kraken", level: 26, x: KRAKEN_MAW.x, y: KRAKEN_MAW.y, respawnMs: 6 * 60_000 });
  const skull = ISLES_BY_ID.skull;
  const fort = landNear(skull.x, skull.y);
  out.push({ id: "boss_gristle", tpl: "boss_gristle", level: 24, x: fort.x, y: fort.y, respawnMs: 5 * 60_000 });
  return out;
}

const WALKABLE_LAND = new Set<number>([Tile.SAND, Tile.GRASS, Tile.DARK_GRASS, Tile.FLOWERS, Tile.ASH, Tile.COBBLE, Tile.PLAZA, Tile.FLOOR]);

/** Nearest open land tile (with room around it). */
export function landNear(x: number, y: number, maxR = 20): { x: number; y: number } {
  for (let r = 0; r <= maxR; r += 1) {
    for (let i = 0; i < Math.max(1, r * 8); i += 1) {
      const a = (i / Math.max(1, r * 8)) * Math.PI * 2;
      const px = Math.floor(x + Math.cos(a) * r) + 0.5;
      const py = Math.floor(y + Math.sin(a) * r) + 0.5;
      if ([[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => WALKABLE_LAND.has(oceanTileAt(px + dx, py + dy)))) return { x: px, y: py };
    }
  }
  return { x, y };
}

export function isLand(tile: number): boolean {
  return WALKABLE_LAND.has(tile);
}
