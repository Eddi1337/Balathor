// Hearthmoor's architecture: connected house rows, arch bridges, gatehouses, walls, the castle,
// the White Tree, market stalls and lamps. Features are bucketed by chunk and merged into the
// terrain chunk meshes, so the whole city costs a handful of draw calls.

import * as THREE from "three";
import {
  CASTLE,
  CASTLE_TOWERS,
  CITY_ARCHES,
  CITY_HOUSES,
  CITADEL_FOUNTAIN,
  CITY_LAMPS,
  FLOOR_H,
  FOUNTAIN,
  GATES,
  OUTSIDE_H,
  TIER_H,
  WALL_R,
  WALL_THICK,
  WHITE_TREE,
  type Arch,
  type CityHouse
} from "../../shared/world/city";
import { CHUNK, heightAt } from "../../shared/world/overworld";
import { hash2 } from "../../shared/math";
import { GeometryBuilder, PRIMS } from "./builder";
import type { FountainSpec } from "./water";

const STONE = "#f1ece4";
const STONE_DARK = "#d9d1c6";
const TIMBER = "#9a6b4f";
const BANNER = ["#7b6cf0", "#e98aa8", "#5b8def", "#f2b950"];

type Feature = (b: GeometryBuilder) => void;
const byChunk = new Map<string, Feature[]>();

function addFeature(x: number, y: number, f: Feature): void {
  const key = `${Math.floor(x / CHUNK)},${Math.floor(y / CHUNK)}`;
  const list = byChunk.get(key) ?? [];
  list.push(f);
  byChunk.set(key, list);
}

export function addCityFeatures(b: GeometryBuilder, cx: number, cy: number): void {
  for (const f of byChunk.get(`${cx},${cy}`) ?? []) f(b);
}

/** Local frame of a radial building at angle `am`: x = tangent, z = radial (outward). */
function frame(am: number, cx: number, cz: number) {
  const s = Math.sin(am);
  const c = Math.cos(am);
  return {
    ry: Math.PI / 2 - am,
    at(lx: number, lz: number): { x: number; z: number } {
      return { x: cx + lx * s + lz * c, z: cz - lx * c + lz * s };
    }
  };
}

// ── houses ───────────────────────────────────────────────────────────────────

function addHouse(b: GeometryBuilder, h: CityHouse): void {
  const am = (h.a0 + h.a1) / 2;
  const rm = (h.r0 + h.r1) / 2;
  const width = (h.a1 - h.a0) * rm * 1.03 + 0.08;
  const depth = h.r1 - h.r0 - 0.15;
  const base = TIER_H[h.tier];
  const tall = h.floors * FLOOR_H;
  const f = frame(am, Math.cos(am) * rm, Math.sin(am) * rm);
  const facade = h.row === 0 ? depth / 2 : -depth / 2;
  const out = h.row === 0 ? 1 : -1;
  const seed = Math.floor(am * 1000) + h.tier * 7;
  const p = (lx: number, ly: number, lz: number) => {
    const w = f.at(lx, lz);
    return { x: w.x, y: base + ly, z: w.z };
  };
  const add = (prim: THREE.BufferGeometry, lx: number, ly: number, lz: number, o: { sx: number; sy: number; sz: number; color: string; glow?: number; sway?: number; jitter?: number; extraRy?: number; rx?: number }) => {
    const q = p(lx, ly, lz);
    b.add(prim, { x: q.x, y: q.y, z: q.z, sx: o.sx, sy: o.sy, sz: o.sz, ry: f.ry + (o.extraRy ?? 0), rx: o.rx, color: o.color, glow: o.glow, sway: o.sway, jitter: o.jitter });
  };

  // Stone ground floor, plastered upper floors (classic townhouse).
  add(PRIMS.box, 0, FLOOR_H / 2, 0, { sx: width, sy: FLOOR_H, sz: depth, color: h.shop ? "#fbeedd" : "#e9e1d6", jitter: 0.04 });
  if (h.floors > 1) add(PRIMS.box, 0, FLOOR_H + (tall - FLOOR_H) / 2, out * 0.12, { sx: width, sy: tall - FLOOR_H, sz: depth + 0.24, color: h.wall, jitter: 0.03 });
  // Timber frame on the street facade.
  for (const sx of [-width / 2 + 0.12, width / 2 - 0.12]) add(PRIMS.box, sx, FLOOR_H + (tall - FLOOR_H) / 2, facade + out * 0.28, { sx: 0.16, sy: tall - FLOOR_H, sz: 0.08, color: TIMBER });
  for (let fl = 1; fl < h.floors; fl += 1) add(PRIMS.box, 0, fl * FLOOR_H, facade + out * 0.28, { sx: width, sy: 0.14, sz: 0.1, color: TIMBER });

  // Windows (glowing at night) on every floor of the facade.
  const cols = Math.max(1, Math.floor(width / 1.7));
  for (let fl = 0; fl < h.floors; fl += 1) {
    for (let i = 0; i < cols; i += 1) {
      const lx = (i + 0.5) * (width / cols) - width / 2;
      if (fl === 0 && Math.abs(lx) < 0.9) continue; // the door
      const wy = fl * FLOOR_H + 1.15;
      const lit = hash2(seed, fl * 10 + i, 7) > 0.3;
      const wz = facade + out * (fl ? 0.27 : 0.04);
      add(PRIMS.box, lx, wy, wz, { sx: 0.62, sy: 0.72, sz: 0.06, color: lit ? "#ffe2a0" : "#a9d4ee", glow: lit ? -1.6 : 0.08 });
      add(PRIMS.box, lx, wy, wz + out * 0.02, { sx: 0.07, sy: 0.74, sz: 0.05, color: "#ffffff" });
      add(PRIMS.box, lx, wy + 0.4, wz, { sx: 0.76, sy: 0.08, sz: 0.1, color: "#ffffff" });
      add(PRIMS.box, lx, wy - 0.42, wz + out * 0.05, { sx: 0.74, sy: 0.08, sz: 0.16, color: "#ffffff" });
      for (const sxs of [-1, 1]) add(PRIMS.box, lx + sxs * 0.45, wy, wz, { sx: 0.18, sy: 0.74, sz: 0.04, color: h.roof });
      if (fl > 0 && hash2(seed, fl * 10 + i, 9) > 0.45) {
        // Flower box under the window.
        add(PRIMS.box, lx, wy - 0.55, facade + out * 0.42, { sx: 0.7, sy: 0.16, sz: 0.2, color: "#9a6b4f" });
        for (let k = 0; k < 3; k += 1) add(PRIMS.ico, lx + (k - 1) * 0.2, wy - 0.42, facade + out * 0.44, { sx: 0.09, sy: 0.09, sz: 0.09, color: ["#ff8fb1", "#ffd166", "#b9a3ff", "#ff9a6b"][(i + k + fl) % 4], sway: 0.3 });
      }
    }
  }
  // Door (+ awning and lantern for shops).
  add(PRIMS.box, 0, 0.75, facade + out * 0.05, { sx: h.shop ? 1.4 : 0.9, sy: 1.5, sz: 0.08, color: "#8a5a3a" });
  add(PRIMS.box, 0, 0.08, facade + out * 0.4, { sx: 1.4, sy: 0.16, sz: 0.7, color: STONE_DARK });
  if (h.shop) {
    const awning = { store: "#8fd3ff", smithy: "#ff9a6b", inn: "#d9b3ff", guild: "#ffd166", stable: "#c98b6a", carpenter: "#9fe39a", tackle: "#7ed6b4" }[h.shop];
    const n = Math.max(3, Math.floor(width / 0.7));
    for (let i = 0; i < n; i += 1) {
      add(PRIMS.box, (i + 0.5) * (width / n) - width / 2, FLOOR_H - 0.15, facade + out * 0.55, { sx: width / n, sy: 0.06, sz: 1.0, rx: out * 0.35, color: i % 2 ? "#ffffff" : awning });
    }
    add(PRIMS.box, 0, FLOOR_H + 0.5, facade + out * 0.25, { sx: Math.min(width - 0.4, 3.4), sy: 0.55, sz: 0.1, color: "#7a5234" });
    add(PRIMS.box, 0, FLOOR_H + 0.5, facade + out * 0.31, { sx: Math.min(width - 0.6, 3.0), sy: 0.36, sz: 0.04, color: awning });
  }
  add(PRIMS.ico, 0.85, 1.75, facade + out * 0.25, { sx: 0.12, sy: 0.15, sz: 0.12, color: "#ffc66b", glow: -2.5 });

  // Balcony on some upper floors.
  if (h.floors >= 2 && hash2(seed, 3, 11) > 0.6 && width > 4) {
    add(PRIMS.box, 0, FLOOR_H + 0.05, facade + out * 0.6, { sx: 2.2, sy: 0.12, sz: 0.9, color: TIMBER });
    add(PRIMS.box, 0, FLOOR_H + 0.45, facade + out * 1.0, { sx: 2.2, sy: 0.6, sz: 0.06, color: "#ffffff" });
  }

  // Roof: gable along the street, colourful tiles, chimney, sometimes a little dormer.
  add(PRIMS.prism, 0, tall, out * 0.12, { sx: depth + 0.9, sy: 1.6 + depth * 0.12, sz: width + 0.25, color: h.roof, extraRy: Math.PI / 2, jitter: 0.07 });
  const chx = (hash2(seed, 5, 3) - 0.5) * width * 0.6;
  add(PRIMS.box, chx, tall + 1.0, -out * depth * 0.2, { sx: 0.45, sy: 1.3, sz: 0.45, color: "#b5a397" });
  add(PRIMS.box, chx, tall + 1.7, -out * depth * 0.2, { sx: 0.6, sy: 0.12, sz: 0.6, color: "#8a7a70" });
  if (h.floors >= 3 && width > 4.6 && hash2(seed, 6, 1) > 0.5) {
    add(PRIMS.box, 0, tall + 0.6, facade * 0.55, { sx: 1.1, sy: 1.0, sz: 0.9, color: h.wall });
    add(PRIMS.box, 0, tall + 0.6, facade * 0.55 + out * 0.46, { sx: 0.55, sy: 0.6, sz: 0.04, color: "#ffe2a0", glow: -1.4 });
    add(PRIMS.prism, 0, tall + 1.1, facade * 0.55, { sx: 1.3, sy: 0.7, sz: 1.1, color: h.roof });
  }
}

// ── arch bridges across the streets ─────────────────────────────────────────

function addArch(b: GeometryBuilder, a: Arch): void {
  const rm = (a.r0 + a.r1) / 2;
  const span = a.r1 - a.r0;
  const base = TIER_H[a.tier];
  const f = frame(a.angle, Math.cos(a.angle) * rm, Math.sin(a.angle) * rm);
  const at = (lx: number, ly: number, lz: number) => {
    const w = f.at(lx, lz);
    return { x: w.x, y: base + ly, z: w.z };
  };
  const deckY = FLOOR_H + 0.3;
  // Arch: stone voussoirs following a semicircle under the deck.
  const segs = 10;
  for (let i = 0; i < segs; i += 1) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const z0 = -span / 2 + span * t0;
    const z1 = -span / 2 + span * t1;
    const curve = (t: number) => Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));
    const bottom = 1.0 + 1.15 * Math.min(curve(t0), curve(t1));
    const q = at(0, (bottom + deckY) / 2, (z0 + z1) / 2);
    b.add(PRIMS.box, { x: q.x, y: q.y, z: q.z, sx: 1.9, sy: deckY - bottom, sz: z1 - z0 + 0.02, ry: f.ry, color: i % 2 ? STONE : STONE_DARK });
  }
  // Covered walkway on top, linking the upper floors.
  let q = at(0, deckY + 1.0, 0);
  b.add(PRIMS.box, { x: q.x, y: q.y, z: q.z, sx: 1.8, sy: 1.9, sz: span + 0.2, ry: f.ry, color: "#fbeedd" });
  for (const lz of [-span / 4, 0, span / 4]) {
    for (const side of [-1, 1]) {
      q = at(side * 0.92, deckY + 1.1, lz);
      b.add(PRIMS.box, { x: q.x, y: q.y, z: q.z, sx: 0.05, sy: 0.6, sz: 0.6, ry: f.ry, color: "#ffe2a0", glow: -1.4 });
    }
  }
  q = at(0, deckY + 1.95, 0);
  b.add(PRIMS.prism, { x: q.x, y: q.y, z: q.z, sx: 2.4, sy: 0.9, sz: span + 0.5, ry: f.ry, color: BANNER[Math.floor(a.angle * 10) % BANNER.length] });
  // A hanging lantern and pennant under the arch.
  q = at(0, 1.6, 0);
  b.add(PRIMS.cyl6, { x: q.x, y: q.y + 0.25, z: q.z, sx: 0.02, sy: 0.4, sz: 0.02, color: "#5a4a4a" });
  b.add(PRIMS.box, { x: q.x, y: q.y, z: q.z, sx: 0.22, sy: 0.28, sz: 0.22, color: "#ffd98a", glow: -2.6 });
}

// ── walls & gates ────────────────────────────────────────────────────────────

/** Wall segment for one tile of ring k. */
export function addWallTile(b: GeometryBuilder, x: number, y: number, k: number): void {
  const bottom = k === 0 ? OUTSIDE_H - 0.4 : TIER_H[k - 1] - 0.2;
  const top = k === 0 ? TIER_H[0] + 6.5 : TIER_H[k] + 1.3;
  const cx = x + 0.5;
  const cy = y + 0.5;
  const shade = hash2(x, y, 3) > 0.5 ? STONE : "#ebe4d9";
  b.add(PRIMS.box, { x: cx, y: (bottom + top) / 2, z: cy, sx: 1.03, sy: top - bottom, sz: 1.03, color: shade, jitter: 0.04 });
  // Crenellations on the outer edge only.
  const d = Math.hypot(cx, cy);
  if (d > WALL_R[k] - 0.9 && (x + y) % 2 === 0) b.add(PRIMS.box, { x: cx, y: top + 0.3, z: cy, sx: 0.65, sy: 0.6, sz: 0.65, color: STONE });
  // A darker base course and the odd climbing ivy.
  if (d > WALL_R[k] - 1) b.add(PRIMS.box, { x: cx, y: bottom + 0.4, z: cy, sx: 1.06, sy: 0.8, sz: 1.06, color: STONE_DARK });
  if (hash2(x, y, 17) > 0.9 && d > WALL_R[k] - 1) b.add(PRIMS.ico1, { x: cx, y: bottom + (top - bottom) * 0.55, z: cy, sx: 0.6, sy: (top - bottom) * 0.35, sz: 0.6, color: "#6fbf5f", sway: 0.2, jitter: 0.15 });
}

function addGatehouse(b: GeometryBuilder, gate: (typeof GATES)[number]): void {
  const k = gate.wall;
  const r = WALL_R[k] - WALL_THICK / 2;
  const top = k === 0 ? TIER_H[0] + 6.5 : TIER_H[k] + 1.3;
  const big = gate.main ? 1.6 : 1;
  for (const side of [-1, 1]) {
    const ang = gate.angle + (side * (gate.half + 1.5 * big)) / r;
    const tx = Math.cos(ang) * r;
    const tz = Math.sin(ang) * r;
    const bottom = heightAt(tx, tz) - 0.3;
    const h = top - bottom + 3 * big;
    b.add(PRIMS.cyl8, { x: tx, y: bottom + h / 2, z: tz, sx: 1.7 * big, sy: h, sz: 1.7 * big, color: STONE, jitter: 0.04 });
    b.add(PRIMS.cyl8, { x: tx, y: bottom + h + 0.15, z: tz, sx: 1.95 * big, sy: 0.3, sz: 1.95 * big, color: STONE_DARK });
    b.add(PRIMS.cone8, { x: tx, y: bottom + h + 1.4 * big, z: tz, sx: 2.0 * big, sy: 2.4 * big, sz: 2.0 * big, color: k % 2 ? "#6fa8dc" : "#7b6cf0", jitter: 0.05 });
    b.add(PRIMS.cyl6, { x: tx, y: bottom + h + 3.0 * big, z: tz, sx: 0.04, sy: 1.2, sz: 0.04, color: "#5a4a4a" });
    b.add(PRIMS.box, { x: tx + 0.35, y: bottom + h + 3.3 * big, z: tz, sx: 0.7, sy: 0.4, sz: 0.03, color: BANNER[k % BANNER.length] });
    for (let i = 0; i < 3; i += 1) b.add(PRIMS.box, { x: tx + Math.cos(gate.angle) * 1.75 * big, y: bottom + h * (0.35 + i * 0.22), z: tz + Math.sin(gate.angle) * 1.75 * big, sx: 0.3, sy: 0.5, sz: 0.3, color: "#ffe2a0", glow: -1.5 });
  }
  // The arch over the passage.
  const f = frame(gate.angle, Math.cos(gate.angle) * r, Math.sin(gate.angle) * r);
  const archBottom = (k === 0 ? TIER_H[0] : TIER_H[k]) + 3.2 * big;
  const q = f.at(0, 0);
  b.add(PRIMS.box, { x: q.x, y: (archBottom + top + 0.8) / 2, z: q.z, sx: (gate.half + 0.6) * 2, sy: top + 0.8 - archBottom, sz: WALL_THICK + 0.4, ry: f.ry, color: STONE });
  // Banners hanging from the arch on both faces.
  for (const side of [-1, 1]) {
    const bq = f.at(0, side * (WALL_THICK / 2 + 0.25));
    b.add(PRIMS.box, { x: bq.x, y: archBottom + 0.4, z: bq.z, sx: 1.1, sy: 1.6, sz: 0.05, ry: f.ry, color: BANNER[(k + 1) % BANNER.length] });
    b.add(PRIMS.octa, { x: bq.x, y: archBottom + 0.5, z: bq.z, sx: 0.25, sy: 0.25, sz: 0.06, ry: f.ry, color: "#ffd166", glow: 0.4 });
  }
}

// ── citadel ──────────────────────────────────────────────────────────────────

function addCastle(b: GeometryBuilder): void {
  const H = TIER_H[4];
  const { x, y, w, h } = CASTLE;
  const cx = x + w / 2;
  const cz = y + h / 2;
  // Great hall / keep.
  b.add(PRIMS.box, { x: cx, y: H + 5, z: cz, sx: w - 0.6, sy: 10, sz: h - 0.6, color: "#f6f2ec", jitter: 0.03 });
  b.add(PRIMS.box, { x: cx, y: H + 0.4, z: cz, sx: w, sy: 0.8, sz: h, color: STONE_DARK });
  for (let i = 0; i < w; i += 2) {
    b.add(PRIMS.box, { x: x + i + 0.5, y: H + 10.4, z: y + 0.3, sx: 0.8, sy: 0.8, sz: 0.6, color: STONE });
    b.add(PRIMS.box, { x: x + i + 0.5, y: H + 10.4, z: y + h - 0.3, sx: 0.8, sy: 0.8, sz: 0.6, color: STONE });
  }
  b.add(PRIMS.prism, { x: cx, y: H + 10, z: cz, sx: h - 3, sy: 4.5, sz: w - 3, ry: Math.PI / 2, color: "#5b6fc9", jitter: 0.06 });
  // Windows rows.
  for (let fl = 0; fl < 3; fl += 1) {
    for (let i = 0; i < 7; i += 1) {
      const wx = x + 1.6 + i * ((w - 3.2) / 6);
      if (fl === 0 && Math.abs(wx - cx) < 1.6) continue;
      b.add(PRIMS.box, { x: wx, y: H + 2 + fl * 3, z: y + h + 0.01, sx: 0.8, sy: 1.6, sz: 0.06, color: "#ffe2a0", glow: -1.8 });
      b.add(PRIMS.cyl12, { x: wx, y: H + 2.8 + fl * 3, z: y + h + 0.01, sx: 0.4, sy: 0.06, sz: 0.4, rx: Math.PI / 2, color: "#ffe2a0", glow: -1.8 });
    }
  }
  // Grand door with steps and banners.
  const dz = y + h;
  b.add(PRIMS.box, { x: cx, y: H + 1.6, z: dz + 0.04, sx: 2.4, sy: 3.2, sz: 0.1, color: "#8a5a3a" });
  b.add(PRIMS.cyl12, { x: cx, y: H + 3.2, z: dz + 0.04, sx: 1.2, sy: 0.12, sz: 1.2, rx: Math.PI / 2, color: "#8a5a3a" });
  b.add(PRIMS.octa, { x: cx, y: H + 4.4, z: dz + 0.1, sx: 0.5, sy: 0.5, sz: 0.1, color: "#ffd166", glow: 0.6 });
  for (let i = 0; i < 3; i += 1) b.add(PRIMS.box, { x: cx, y: H + 0.12 + i * 0.12 - 0.2, z: dz + 0.6 + i * 0.5, sx: 4.4 - i * 0.4, sy: 0.24, sz: 0.6, color: STONE_DARK });
  for (const side of [-1, 1]) {
    b.add(PRIMS.box, { x: cx + side * 3, y: H + 6, z: dz + 0.06, sx: 1.4, sy: 4.5, sz: 0.06, color: "#7b3fbf" });
    b.add(PRIMS.octa, { x: cx + side * 3, y: H + 6.6, z: dz + 0.12, sx: 0.45, sy: 0.45, sz: 0.08, color: "#ffd166", glow: 0.5 });
  }
  // Corner towers.
  for (const t of CASTLE_TOWERS) {
    b.add(PRIMS.cyl12, { x: t.x, y: H + 7.5, z: t.y, sx: t.r, sy: 15, sz: t.r, color: STONE, jitter: 0.03 });
    b.add(PRIMS.cyl12, { x: t.x, y: H + 15.2, z: t.y, sx: t.r + 0.25, sy: 0.4, sz: t.r + 0.25, color: STONE_DARK });
    b.add(PRIMS.cone8, { x: t.x, y: H + 17.4, z: t.y, sx: t.r + 0.3, sy: 4.2, sz: t.r + 0.3, color: "#5b6fc9", jitter: 0.05 });
    b.add(PRIMS.octa, { x: t.x, y: H + 19.8, z: t.y, sx: 0.25, sy: 0.4, sz: 0.25, color: "#ffd166", glow: 0.8 });
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      b.add(PRIMS.box, { x: t.x + Math.cos(a) * t.r, y: H + 9 + (i % 2) * 2.5, z: t.y + Math.sin(a) * t.r, sx: 0.4, sy: 0.9, sz: 0.4, color: "#ffe2a0", glow: -1.6 });
    }
  }
  // The great tower rising from the keep.
  const gx = cx;
  const gz = y + 5;
  b.add(PRIMS.cyl12, { x: gx, y: H + 14, z: gz, sx: 3.0, sy: 18, sz: 3.0, color: "#f6f2ec", jitter: 0.03 });
  b.add(PRIMS.cyl12, { x: gx, y: H + 23.2, z: gz, sx: 3.4, sy: 0.5, sz: 3.4, color: STONE_DARK });
  b.add(PRIMS.cone8, { x: gx, y: H + 26.3, z: gz, sx: 3.6, sy: 6, sz: 3.6, color: "#5b6fc9", jitter: 0.05 });
  b.add(PRIMS.cyl6, { x: gx, y: H + 30.6, z: gz, sx: 0.06, sy: 2.4, sz: 0.06, color: "#5a4a4a" });
  b.add(PRIMS.box, { x: gx + 0.7, y: H + 31.3, z: gz, sx: 1.4, sy: 0.8, sz: 0.04, color: "#ffd166", glow: 0.3 });
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    b.add(PRIMS.box, { x: gx + Math.cos(a) * 3.02, y: H + 19 + (i % 2), z: gz + Math.sin(a) * 3.02, sx: 0.5, sy: 1.1, sz: 0.5, color: "#ffe2a0", glow: -1.8 });
  }
}

function addWhiteTree(b: GeometryBuilder): void {
  const H = TIER_H[4];
  const { x, y } = WHITE_TREE;
  b.add(PRIMS.cyl12, { x, y: H + 0.25, z: y, sx: 1.5, sy: 0.5, sz: 1.5, color: STONE });
  b.add(PRIMS.taper6, { x, y: H + 2.2, z: y, sx: 0.4, sy: 3.8, sz: 0.4, color: "#f4f8ff" });
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    b.add(PRIMS.cyl6, { x: x + Math.cos(a) * 0.8, y: H + 4.1, z: y + Math.sin(a) * 0.8, sx: 0.12, sy: 1.8, sz: 0.12, rz: Math.cos(a) * 0.7, rx: -Math.sin(a) * 0.7, color: "#f4f8ff" });
  }
  // Blossom clusters at the branch tips: many small puffs of white and blush pink.
  for (let i = 0; i < 26; i += 1) {
    const a = i * 2.39996;
    const r = 0.6 + (i % 7) * 0.32;
    const yy = 4.6 + ((i * 37) % 11) * 0.17 - r * 0.15;
    b.add(PRIMS.ico, { x: x + Math.cos(a) * r, y: H + yy, z: y + Math.sin(a) * r, sx: 0.42, sy: 0.34, sz: 0.42, color: i % 4 === 0 ? "#ffd6e7" : "#ffffff", glow: 0.45, sway: 0.7 });
  }
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    b.add(PRIMS.octa, { x: x + Math.cos(a) * 2.5, y: H + 0.08, z: y + Math.sin(a) * 2.5, sx: 0.12, sy: 0.03, sz: 0.12, color: "#ffffff", glow: 0.3 });
  }
  // Flowerbeds ringing the courtyard.
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2;
    b.add(PRIMS.ico, { x: x + Math.cos(a) * 3, y: H + 0.2, z: y + Math.sin(a) * 3, sx: 0.28, sy: 0.22, sz: 0.28, color: ["#ff8fb1", "#ffd166", "#b9a3ff", "#ffffff"][i % 4], sway: 0.4 });
  }
}

function addMarket(b: GeometryBuilder): void {
  const H = TIER_H[0];
  const { x, y, r } = FOUNTAIN;
  // Tiered fountain.
  b.add(PRIMS.cyl12, { x, y: H + 0.3, z: y, sx: r + 0.3, sy: 0.6, sz: r + 0.3, color: STONE });
  b.add(PRIMS.cyl8, { x, y: H + 1.3, z: y, sx: 0.35, sy: 1.6, sz: 0.35, color: STONE });
  b.add(PRIMS.cyl12, { x, y: H + 2.1, z: y, sx: 1.1, sy: 0.22, sz: 1.1, color: STONE });
  b.add(PRIMS.cyl8, { x, y: H + 2.7, z: y, sx: 0.2, sy: 1.0, sz: 0.2, color: STONE });
  b.add(PRIMS.cyl12, { x, y: H + 3.2, z: y, sx: 0.55, sy: 0.14, sz: 0.55, color: STONE });
  b.add(PRIMS.ico, { x, y: H + 3.55, z: y, sx: 0.28, sy: 0.36, sz: 0.28, color: "#ffc94d", glow: 0.6 });
  // Colourful market stalls around the square (leaving the gate road clear).
  const colors = ["#ff8fb1", "#8fd3ff", "#ffd166", "#9fe39a", "#c98bd8", "#ffb38a"];
  for (let i = 0; i < 8; i += 1) {
    const a = -Math.PI / 2 + ((i + 0.5) / 8 - 0.5) * Math.PI * 1.5;
    if (Math.abs(Math.cos(a)) < 0.2 && Math.sin(a) > 0) continue;
    const sx = x + Math.cos(a) * 9;
    const sz = y + Math.sin(a) * 6.5 - 1;
    const c = colors[i % colors.length];
    b.add(PRIMS.box, { x: sx, y: H + 0.5, z: sz, sx: 1.8, sy: 1, sz: 1, color: "#c9955f" });
    for (const ox of [-0.85, 0.85]) b.add(PRIMS.cyl6, { x: sx + ox, y: H + 1.2, z: sz, sx: 0.05, sy: 2.4, sz: 0.05, color: TIMBER });
    for (let s = 0; s < 4; s += 1) b.add(PRIMS.box, { x: sx - 0.75 + s * 0.5, y: H + 2.35, z: sz, sx: 0.5, sy: 0.08, sz: 1.5, rx: 0.25, color: s % 2 ? "#ffffff" : c });
    for (let s = 0; s < 5; s += 1) b.add(PRIMS.ico, { x: sx - 0.6 + s * 0.3, y: H + 1.1, z: sz, sx: 0.12, sy: 0.12, sz: 0.12, color: ["#ff5c6a", "#ffd166", "#9fe39a", "#ff9a6b", "#b9a3ff"][(s + i) % 5] });
  }
}

function addLamp(b: GeometryBuilder, x: number, z: number): void {
  const H = heightAt(x, z);
  b.add(PRIMS.cyl6, { x, y: H + 0.06, z, sx: 0.16, sy: 0.12, sz: 0.16, color: "#8a7a70" });
  b.add(PRIMS.cyl6, { x, y: H + 0.85, z, sx: 0.045, sy: 1.6, sz: 0.045, color: "#6a5a52" });
  b.add(PRIMS.box, { x, y: H + 1.78, z, sx: 0.24, sy: 0.28, sz: 0.24, color: "#ffe2a0", glow: -3 });
  b.add(PRIMS.cone4, { x, y: H + 2.02, z, sx: 0.22, sy: 0.2, sz: 0.22, ry: Math.PI / 4, color: "#c98b6a" });
}

// ── registration ─────────────────────────────────────────────────────────────

for (const h of CITY_HOUSES) {
  const am = (h.a0 + h.a1) / 2;
  const rm = (h.r0 + h.r1) / 2;
  addFeature(Math.cos(am) * rm, Math.sin(am) * rm, (b) => addHouse(b, h));
}
for (const a of CITY_ARCHES) {
  const rm = (a.r0 + a.r1) / 2;
  addFeature(Math.cos(a.angle) * rm, Math.sin(a.angle) * rm, (b) => addArch(b, a));
}
for (const g of GATES) {
  const r = WALL_R[g.wall];
  addFeature(Math.cos(g.angle) * r, Math.sin(g.angle) * r, (b) => addGatehouse(b, g));
}
for (const l of CITY_LAMPS) addFeature(l.x, l.y, (b) => addLamp(b, l.x, l.y));
addFeature(CASTLE.x + CASTLE.w / 2, CASTLE.y + CASTLE.h / 2, addCastle);
addFeature(WHITE_TREE.x, WHITE_TREE.y, addWhiteTree);
addFeature(FOUNTAIN.x, FOUNTAIN.y, addMarket);
addFeature(CITADEL_FOUNTAIN.x, CITADEL_FOUNTAIN.y, (b) => {
  const H = TIER_H[4];
  const { x, y, r } = CITADEL_FOUNTAIN;
  b.add(PRIMS.cyl12, { x, y: H + 0.3, z: y, sx: r + 0.25, sy: 0.6, sz: r + 0.25, color: STONE });
  b.add(PRIMS.cyl8, { x, y: H + 1.0, z: y, sx: 0.22, sy: 1.4, sz: 0.22, color: STONE });
  b.add(PRIMS.cyl12, { x, y: H + 1.75, z: y, sx: 0.7, sy: 0.16, sz: 0.7, color: STONE });
  b.add(PRIMS.octa, { x, y: H + 2.1, z: y, sx: 0.2, sy: 0.32, sz: 0.2, color: "#ffffff", glow: 0.6 });
});

/** The city's fountains, for the water spray simulation. */
export function cityFountains(): FountainSpec[] {
  return [
    {
      x: FOUNTAIN.x,
      y: FOUNTAIN.y,
      water: TIER_H[0] + 0.55,
      r: FOUNTAIN.r,
      spouts: [
        { h: TIER_H[0] + 3.4, out: 1.05, up: 2.6, ring: 0.15 },
        { h: TIER_H[0] + 2.2, out: 1.5, up: 0.4, ring: 1.0 }
      ]
    },
    {
      x: CITADEL_FOUNTAIN.x,
      y: CITADEL_FOUNTAIN.y,
      water: TIER_H[4] + 0.55,
      r: CITADEL_FOUNTAIN.r,
      spouts: [{ h: TIER_H[4] + 2.1, out: 0.9, up: 3.0, ring: 0.1 }]
    }
  ];
}

/** A few real lights around the market square that wake up at dusk. */
export function marketLights(): THREE.PointLight[] {
  const out: THREE.PointLight[] = [];
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const l = new THREE.PointLight(0xffc979, 0, 13, 1.6);
    l.position.set(FOUNTAIN.x + Math.cos(a) * 6.5, TIER_H[0] + 1.8, FOUNTAIN.y + Math.sin(a) * 6.5);
    out.push(l);
  }
  return out;
}
