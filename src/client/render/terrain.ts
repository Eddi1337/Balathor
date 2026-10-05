// Streams overworld chunks around the camera: faceted terrain + all props merged per chunk,
// plus an animated low-poly water surface that follows the camera.

import * as THREE from "three";
import { CHUNK, getChunkTiles, heightAt, biomeAt, type Biome } from "../../shared/world/overworld";
import { Tile } from "../../shared/world/tiles";
import { hash2 } from "../../shared/math";
import { GeometryBuilder, PRIMS, sceneryMaterial, worldUniforms } from "./builder";
import { addCityFeatures, addWallTile } from "./city";
import { wallRingAt } from "../../shared/world/city";
import { riverAt } from "../../shared/world/rivers";
import { flowingWaterMaterial, stillWaterMaterial, withStillFlow } from "./water";

const TILE_COLORS: Record<number, string> = {
  [Tile.GRASS]: "#8fd16a",
  [Tile.MEADOW]: "#a6de7a",
  [Tile.FLOWERS]: "#a6de7a",
  [Tile.DARK_GRASS]: "#6cbd5c",
  [Tile.SAND]: "#f5e1a6",
  [Tile.SHALLOW]: "#a8e0cf",
  [Tile.WATER]: "#d6c08c",
  [Tile.SNOW]: "#f4f8ff",
  [Tile.ASH]: "#9a8a8e",
  [Tile.MUD]: "#9a8a5c",
  [Tile.PATH]: "#ecd09a",
  [Tile.COBBLE]: "#d9cfc4",
  [Tile.PLAZA]: "#f0e2cf",
  [Tile.FLOOR]: "#d8b48a",
  [Tile.FIELD]: "#b98f5e",
  [Tile.WALL]: "#e3dccf",
  [Tile.BUILDING]: "#d9cfc4",
  [Tile.FOUNTAIN]: "#e9dccb",
  [Tile.RIVER]: "#b9a27a"
};

const BIOME_GROUND: Record<Biome, number> = {
  town: Tile.MEADOW,
  meadow: Tile.MEADOW,
  forest: Tile.DARK_GRASS,
  swamp: Tile.MUD,
  desert: Tile.SAND,
  frost: Tile.SNOW,
  ember: Tile.ASH,
  highlands: Tile.GRASS,
  beach: Tile.SAND,
  ocean: Tile.WATER
};

const FLOWER_COLORS = ["#ff8fb1", "#ffd166", "#ffffff", "#b9a3ff", "#8fd3ff", "#ff9a6b"];
const LEAF_TINTS: Partial<Record<Biome, string[]>> = {
  meadow: ["#7fcf5a", "#94d96a", "#6fc25a"],
  forest: ["#4fae55", "#5cb85c", "#3f9d4f", "#6fc25a"],
  highlands: ["#5fa860", "#4f9a58"],
  swamp: ["#6f9a4a", "#7fa85a"],
  town: ["#7fcf5a", "#ffb3c7", "#94d96a"]
};

const tmpColor = new THREE.Color();

function tileColor(tile: number, biome: Biome, x: number, y: number, h: number): THREE.Color {
  const ground = isProp(tile) ? BIOME_GROUND[biome] : tile;
  tmpColor.set(TILE_COLORS[ground] ?? "#8fd16a");
  const n = hash2(x, y, 977);
  const j = 0.94 + n * 0.1;
  tmpColor.multiplyScalar(j);
  // Hilltops catch a little more light; lowlands are lusher.
  if (h > 1.5 && ground !== Tile.SNOW) tmpColor.lerp(new THREE.Color("#fff6d6"), Math.min(0.18, (h - 1.5) * 0.05));
  return tmpColor;
}

function isProp(tile: number): boolean {
  return tile >= 20 && tile !== Tile.WALL && tile !== Tile.BUILDING && tile !== Tile.FOUNTAIN;
}

function pick<T>(arr: T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}

function addProp(b: GeometryBuilder, tile: number, biome: Biome, x: number, y: number, h: number): void {
  const r1 = hash2(x, y, 11);
  const r2 = hash2(x, y, 23);
  const r3 = hash2(x, y, 37);
  const cx = x + 0.5 + (r1 - 0.5) * 0.3;
  const cz = y + 0.5 + (r2 - 0.5) * 0.3;
  const s = 0.85 + r3 * 0.4;
  const rot = r1 * Math.PI * 2;
  switch (tile) {
    case Tile.TREE: {
      const leaf = pick(LEAF_TINTS[biome] ?? LEAF_TINTS.meadow!, r2);
      b.add(PRIMS.taper6, { x: cx, y: h + 0.6 * s, z: cz, sx: 0.16 * s, sy: 1.2 * s, sz: 0.16 * s, color: "#9a6b4f" });
      b.add(PRIMS.ico1, { x: cx, y: h + 1.65 * s, z: cz, sx: 0.95 * s, sy: 0.85 * s, sz: 0.95 * s, ry: rot, color: leaf, sway: 1, jitter: 0.12 });
      b.add(PRIMS.ico, { x: cx + 0.35 * s, y: h + 2.2 * s, z: cz - 0.15 * s, sx: 0.55 * s, sy: 0.5 * s, sz: 0.55 * s, ry: rot, color: leaf, sway: 1.2, jitter: 0.12 });
      if (r3 > 0.75) {
        // A few fruit trees with little red apples.
        b.add(PRIMS.ico, { x: cx - 0.5 * s, y: h + 1.5 * s, z: cz + 0.5 * s, sx: 0.09, sy: 0.09, sz: 0.09, color: "#ff5c6a", sway: 1 });
        b.add(PRIMS.ico, { x: cx + 0.55 * s, y: h + 1.7 * s, z: cz + 0.35 * s, sx: 0.09, sy: 0.09, sz: 0.09, color: "#ff5c6a", sway: 1 });
      }
      break;
    }
    case Tile.PINE:
    case Tile.SNOW_PINE: {
      const snowy = tile === Tile.SNOW_PINE;
      const leaf = snowy ? "#4f8f6f" : pick(["#3f8f5f", "#4a9a62", "#357f55"], r2);
      b.add(PRIMS.cyl6, { x: cx, y: h + 0.35 * s, z: cz, sx: 0.13 * s, sy: 0.7 * s, sz: 0.13 * s, color: "#7a5234" });
      for (let i = 0; i < 3; i += 1) {
        const w = (0.95 - i * 0.25) * s;
        b.add(PRIMS.cone6, { x: cx, y: h + (0.95 + i * 0.6) * s, z: cz, sx: w, sy: 0.95 * s, sz: w, ry: rot + i, color: leaf, sway: 0.4 + i * 0.35, jitter: 0.1 });
        if (snowy) b.add(PRIMS.cone6, { x: cx, y: h + (1.2 + i * 0.6) * s, z: cz, sx: w * 0.62, sy: 0.5 * s, sz: w * 0.62, ry: rot + i, color: "#f4f8ff", sway: 0.4 + i * 0.35 });
      }
      break;
    }
    case Tile.PALM: {
      const lean = (r1 - 0.5) * 0.5;
      for (let i = 0; i < 4; i += 1) {
        b.add(PRIMS.cyl6, { x: cx + lean * i * 0.25, y: h + 0.35 + i * 0.55, z: cz, sx: 0.12, sy: 0.6, sz: 0.12, rz: -lean * 0.6, color: i % 2 ? "#b88a5a" : "#a67a4a" });
      }
      const topX = cx + lean * 1;
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + rot;
        b.add(PRIMS.box, { x: topX + Math.cos(a) * 0.6, y: h + 2.45, z: cz + Math.sin(a) * 0.6, sx: 1.2, sy: 0.06, sz: 0.32, ry: -a, rz: -0.35, color: "#5cc26a", sway: 1.3 });
      }
      b.add(PRIMS.ico, { x: topX, y: h + 2.4, z: cz, sx: 0.18, sy: 0.18, sz: 0.18, color: "#8a5a3a" });
      break;
    }
    case Tile.CACTUS: {
      b.add(PRIMS.cyl8, { x: cx, y: h + 0.7, z: cz, sx: 0.22, sy: 1.4, sz: 0.22, color: "#5fae5a" });
      b.add(PRIMS.ico, { x: cx, y: h + 1.42, z: cz, sx: 0.22, sy: 0.16, sz: 0.22, color: "#5fae5a" });
      b.add(PRIMS.cyl8, { x: cx + 0.3, y: h + 0.95, z: cz, sx: 0.13, sy: 0.5, sz: 0.13, color: "#6aba62" });
      b.add(PRIMS.cyl8, { x: cx - 0.28, y: h + 0.75, z: cz, sx: 0.12, sy: 0.4, sz: 0.12, color: "#6aba62" });
      if (r3 > 0.5) b.add(PRIMS.ico, { x: cx, y: h + 1.55, z: cz, sx: 0.08, sy: 0.08, sz: 0.08, color: "#ff8fb1", glow: 0.15 });
      break;
    }
    case Tile.DEAD_TREE: {
      b.add(PRIMS.taper6, { x: cx, y: h + 0.8, z: cz, sx: 0.14, sy: 1.6, sz: 0.14, color: "#5a4a4a" });
      b.add(PRIMS.cyl6, { x: cx + 0.3, y: h + 1.4, z: cz, sx: 0.06, sy: 0.7, sz: 0.06, rz: -0.8, color: "#5a4a4a" });
      b.add(PRIMS.cyl6, { x: cx - 0.25, y: h + 1.2, z: cz + 0.1, sx: 0.05, sy: 0.6, sz: 0.05, rz: 0.9, color: "#5a4a4a" });
      break;
    }
    case Tile.ROCK: {
      const col = biome === "frost" ? "#c9d6e6" : biome === "ember" ? "#6a5a5e" : biome === "desert" ? "#d9b07a" : "#a9a9b3";
      b.add(PRIMS.dodeca, { x: cx, y: h + 0.25 * s, z: cz, sx: 0.55 * s, sy: 0.42 * s, sz: 0.5 * s, ry: rot, color: col, jitter: 0.15 });
      if (r2 > 0.5) b.add(PRIMS.dodeca, { x: cx + 0.35, y: h + 0.12, z: cz + 0.25, sx: 0.25, sy: 0.2, sz: 0.25, ry: rot, color: col, jitter: 0.15 });
      if (biome === "meadow" || biome === "forest") b.add(PRIMS.ico, { x: cx - 0.1, y: h + 0.5 * s, z: cz, sx: 0.32 * s, sy: 0.08, sz: 0.3 * s, color: "#7fc25a" });
      break;
    }
    case Tile.BUSH: {
      const leaf = pick(LEAF_TINTS[biome] ?? LEAF_TINTS.meadow!, r1);
      b.add(PRIMS.ico1, { x: cx, y: h + 0.35, z: cz, sx: 0.55 * s, sy: 0.45 * s, sz: 0.55 * s, color: leaf, sway: 0.5, jitter: 0.12 });
      b.add(PRIMS.ico, { x: cx + 0.3, y: h + 0.3, z: cz + 0.2, sx: 0.35, sy: 0.3, sz: 0.35, color: leaf, sway: 0.5, jitter: 0.12 });
      if (r3 > 0.55) {
        for (let i = 0; i < 4; i += 1) {
          b.add(PRIMS.ico, { x: cx + Math.cos(i * 1.7) * 0.42, y: h + 0.5 + (i % 2) * 0.15, z: cz + Math.sin(i * 1.7) * 0.42, sx: 0.07, sy: 0.07, sz: 0.07, color: pick(FLOWER_COLORS, hash2(x, y + i, 5)), sway: 0.5 });
        }
      }
      break;
    }
    case Tile.WILLOW: {
      b.add(PRIMS.taper6, { x: cx, y: h + 0.8, z: cz, sx: 0.2, sy: 1.6, sz: 0.2, color: "#6a5a3a" });
      b.add(PRIMS.ico1, { x: cx, y: h + 1.9, z: cz, sx: 1.1, sy: 0.6, sz: 1.1, color: "#7fa85a", sway: 1, jitter: 0.1 });
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + rot;
        b.add(PRIMS.cone6, { x: cx + Math.cos(a) * 0.8, y: h + 1.25, z: cz + Math.sin(a) * 0.8, sx: 0.28, sy: 1.1, sz: 0.28, rx: Math.PI, color: "#8ab865", sway: 1.4 });
      }
      break;
    }
    case Tile.CRYSTAL: {
      const col = biome === "ember" ? "#ff8a5c" : "#8fe3ff";
      b.add(PRIMS.octa, { x: cx, y: h + 0.55, z: cz, sx: 0.22, sy: 0.65, sz: 0.22, ry: rot, color: col, glow: 0.9 });
      b.add(PRIMS.octa, { x: cx + 0.25, y: h + 0.3, z: cz + 0.1, sx: 0.13, sy: 0.38, sz: 0.13, rz: -0.4, color: col, glow: 0.9 });
      b.add(PRIMS.octa, { x: cx - 0.2, y: h + 0.28, z: cz - 0.12, sx: 0.12, sy: 0.32, sz: 0.12, rz: 0.4, color: col, glow: 0.9 });
      break;
    }
    default:
      break;
  }
}

const CROPS = ["wheat", "cabbage", "pumpkin", "carrot"] as const;

function addCrop(b: GeometryBuilder, x: number, y: number, h: number): void {
  // Each field patch grows one crop, planted in tidy rows.
  const kind = CROPS[Math.floor(hash2(Math.floor(x / 9), Math.floor(y / 9), 555) * CROPS.length)];
  for (let i = 0; i < 2; i += 1) {
    const px = x + 0.25 + i * 0.5;
    const pz = y + 0.5;
    switch (kind) {
      case "wheat":
        for (let k = 0; k < 3; k += 1) b.add(PRIMS.cone4, { x: px + (k - 1) * 0.12, y: h + 0.32, z: pz + (k % 2) * 0.1, sx: 0.06, sy: 0.65, sz: 0.06, color: k === 1 ? "#f2cf6a" : "#e8bf55", sway: 1.1 });
        break;
      case "cabbage":
        b.add(PRIMS.ico1, { x: px, y: h + 0.14, z: pz, sx: 0.2, sy: 0.15, sz: 0.2, color: "#8fd16a", jitter: 0.1 });
        break;
      case "pumpkin":
        if ((Math.floor(x) + i) % 2 === 0) b.add(PRIMS.ico1, { x: px, y: h + 0.15, z: pz, sx: 0.24, sy: 0.18, sz: 0.24, color: "#ff9a3c", jitter: 0.08 });
        else b.add(PRIMS.ico, { x: px, y: h + 0.08, z: pz, sx: 0.18, sy: 0.08, sz: 0.18, color: "#6fbf5f", sway: 0.4 });
        break;
      case "carrot":
        b.add(PRIMS.cone4, { x: px, y: h + 0.15, z: pz, sx: 0.08, sy: 0.3, sz: 0.08, color: "#5fae5a", sway: 0.8 });
        break;
    }
  }
}

function addGroundDecor(b: GeometryBuilder, tile: number, biome: Biome, x: number, y: number, h: number): void {
  if (tile === Tile.FIELD) {
    addCrop(b, x, y, h);
    return;
  }
  if (tile === Tile.FLOWERS) {
    for (let i = 0; i < 3; i += 1) {
      const fx = x + 0.2 + hash2(x, y, 100 + i) * 0.6;
      const fz = y + 0.2 + hash2(x, y, 200 + i) * 0.6;
      const col = pick(FLOWER_COLORS, hash2(x, y, 300 + i));
      b.add(PRIMS.cyl6, { x: fx, y: h + 0.12, z: fz, sx: 0.02, sy: 0.24, sz: 0.02, color: "#5aa84a", sway: 0.6 });
      b.add(PRIMS.octa, { x: fx, y: h + 0.27, z: fz, sx: 0.09, sy: 0.07, sz: 0.09, color: col, sway: 0.7 });
    }
    return;
  }
  const grassy = tile === Tile.GRASS || tile === Tile.MEADOW || tile === Tile.DARK_GRASS;
  if (grassy && hash2(x, y, 401) < 0.16) {
    const col = biome === "forest" ? "#5aa84f" : "#86c95e";
    const gx = x + 0.2 + hash2(x, y, 402) * 0.6;
    const gz = y + 0.2 + hash2(x, y, 403) * 0.6;
    for (let i = 0; i < 3; i += 1) {
      b.add(PRIMS.cone4, { x: gx + (i - 1) * 0.08, y: h + 0.13, z: gz + (i % 2) * 0.05, sx: 0.05, sy: 0.28 + i * 0.05, sz: 0.05, rz: (i - 1) * 0.3, color: col, sway: 0.9 });
    }
  } else if (tile === Tile.SAND && biome === "beach" && hash2(x, y, 404) < 0.02) {
    b.add(PRIMS.octa, { x: x + 0.5, y: h + 0.05, z: y + 0.5, sx: 0.12, sy: 0.05, sz: 0.1, color: "#ffb3c7" }); // seashell
  } else if (tile === Tile.SNOW && hash2(x, y, 405) < 0.05) {
    b.add(PRIMS.ico, { x: x + 0.5, y: h + 0.08, z: y + 0.5, sx: 0.25, sy: 0.12, sz: 0.25, color: "#ffffff" });
  } else if (tile === Tile.SHALLOW && hash2(x, y, 406) < 0.08) {
    b.add(PRIMS.cyl8, { x: x + 0.5, y: 0.02, z: y + 0.5, sx: 0.35, sy: 0.02, sz: 0.35, color: "#6fc25a" }); // lily pad
    if (hash2(x, y, 407) < 0.4) b.add(PRIMS.octa, { x: x + 0.55, y: 0.08, z: y + 0.45, sx: 0.08, sy: 0.06, sz: 0.08, color: "#ffd3e0" });
  }
}

/** River surface quads for a chunk (with a per-vertex flow direction), or null. */
function buildRiverGeometry(tiles: Uint8Array, ox: number, oy: number): THREE.BufferGeometry | null {
  const pos: number[] = [];
  const flow: number[] = [];
  const corner = (x: number, y: number) => {
    const r = riverAt(x, y);
    return { h: r ? r.level : 0, fx: r ? r.dirX : 0, fy: r ? r.dirY : 0 };
  };
  for (let ly = 0; ly < CHUNK; ly += 1) {
    for (let lx = 0; lx < CHUNK; lx += 1) {
      const t = tiles[ly * CHUNK + lx];
      const x = ox + lx;
      const y = oy + ly;
      // Water also runs under bridges (road tiles over the river).
      if (t !== Tile.RIVER && !(t === Tile.PATH && (riverAt(x + 0.5, y + 0.5)?.dist ?? 99) < (riverAt(x + 0.5, y + 0.5)?.width ?? 0) / 2 + 0.5)) continue;
      // Extend each quad slightly past the tile so it tucks under the banks.
      const c00 = corner(x - 0.15, y - 0.15);
      const c10 = corner(x + 1.15, y - 0.15);
      const c01 = corner(x - 0.15, y + 1.15);
      const c11 = corner(x + 1.15, y + 1.15);
      const q = [
        [x - 0.15, c00.h, y - 0.15, c00],
        [x - 0.15, c01.h, y + 1.15, c01],
        [x + 1.15, c10.h, y - 0.15, c10],
        [x + 1.15, c10.h, y - 0.15, c10],
        [x - 0.15, c01.h, y + 1.15, c01],
        [x + 1.15, c11.h, y + 1.15, c11]
      ] as const;
      for (const [px, py, pz, c] of q) {
        pos.push(px, py, pz);
        flow.push(c.fx, c.fy);
      }
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("flow", new THREE.Float32BufferAttribute(flow, 2));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

function addBridge(b: GeometryBuilder, tiles: Uint8Array, lx: number, ly: number, x: number, y: number, h: number): void {
  // Plank deck, with railings on edges that don't continue the road.
  b.add(PRIMS.box, { x: x + 0.5, y: h - 0.05, z: y + 0.5, sx: 1.04, sy: 0.18, sz: 1.04, color: (x + y) % 2 ? "#b9854f" : "#a6764a" });
  const at = (dx: number, dy: number) => {
    const nx = lx + dx;
    const ny = ly + dy;
    if (nx < 0 || ny < 0 || nx >= CHUNK || ny >= CHUNK) return Tile.PATH;
    return tiles[ny * CHUNK + nx];
  };
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (at(dx, dy) === Tile.PATH) continue;
    const rx = x + 0.5 + dx * 0.46;
    const rz = y + 0.5 + dy * 0.46;
    b.add(PRIMS.box, { x: rx, y: h + 0.45, z: rz, sx: dx ? 0.08 : 1.02, sy: 0.08, sz: dy ? 0.08 : 1.02, color: "#8a5a3a" });
    b.add(PRIMS.box, { x: rx, y: h + 0.22, z: rz, sx: 0.1, sy: 0.5, sz: 0.1, color: "#7a5234" });
  }
}

export interface ChunkMeshes {
  scenery: THREE.BufferGeometry;
  water: THREE.BufferGeometry | null;
}

export function buildChunk(cx: number, cy: number): ChunkMeshes {
  const tiles = getChunkTiles(cx, cy);
  return { scenery: buildChunkGeometry(cx, cy), water: buildRiverGeometry(tiles, cx * CHUNK, cy * CHUNK) };
}

export function buildChunkGeometry(cx: number, cy: number): THREE.BufferGeometry {
  const tiles = getChunkTiles(cx, cy);
  const b = new GeometryBuilder();
  const ox = cx * CHUNK;
  const oy = cy * CHUNK;
  // Corner heights (CHUNK+1)^2, shared so neighbouring chunks meet seamlessly.
  const N = CHUNK + 1;
  const hs = new Float32Array(N * N);
  for (let j = 0; j < N; j += 1) for (let i = 0; i < N; i += 1) hs[j * N + i] = heightAt(ox + i, oy + j);

  for (let ly = 0; ly < CHUNK; ly += 1) {
    for (let lx = 0; lx < CHUNK; lx += 1) {
      const x = ox + lx;
      const y = oy + ly;
      const tile = tiles[ly * CHUNK + lx];
      const h00 = hs[ly * N + lx];
      const h10 = hs[ly * N + lx + 1];
      const h01 = hs[(ly + 1) * N + lx];
      const h11 = hs[(ly + 1) * N + lx + 1];
      const hc = (h00 + h10 + h01 + h11) / 4;
      const biome = biomeAt(x + 0.5, y + 0.5);
      const c = tileColor(tile, biome, x, y, hc).clone();
      // Alternate the diagonal for a less gridded, more hand-made facet pattern.
      if ((x + y) & 1) {
        b.tri(x, h00, y, x, h01, y + 1, x + 1, h10, y, c);
        b.tri(x + 1, h10, y, x, h01, y + 1, x + 1, h11, y + 1, c.clone().multiplyScalar(0.97));
      } else {
        b.tri(x, h00, y, x + 1, h11, y + 1, x + 1, h10, y, c);
        b.tri(x, h00, y, x, h01, y + 1, x + 1, h11, y + 1, c.clone().multiplyScalar(0.97));
      }
      if (tile === Tile.WALL) {
        const ring = wallRingAt(x, y);
        if (ring >= 0) addWallTile(b, x, y, ring);
      } else if (tile === Tile.PATH && biome !== "town") {
        const r = riverAt(x + 0.5, y + 0.5);
        if (r && r.dist < r.width / 2 + 0.6) addBridge(b, tiles, lx, ly, x, y, heightAt(x + 0.5, y + 0.5));
      } else if (isProp(tile)) addProp(b, tile, biome, x, y, hc);
      else addGroundDecor(b, tile, biome, x, y, hc);
    }
  }
  addCityFeatures(b, cx, cy);
  return b.build();
}

export class TerrainStreamer {
  private chunks = new Map<string, THREE.Object3D>();
  private queue: [number, number][] = [];
  readonly group = new THREE.Group();
  readonly water: THREE.Mesh;

  constructor(private radius: number) {
    const geo = new THREE.PlaneGeometry(320, 320, 96, 96);
    geo.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(withStillFlow(geo), stillWaterMaterial());
    this.water.position.y = -0.04;
    this.water.receiveShadow = true;
  }

  /** Ensure chunks around (x, y) exist; builds at most `budget` per call. */
  update(x: number, y: number, budget = 2): void {
    const ccx = Math.floor(x / CHUNK);
    const ccy = Math.floor(y / CHUNK);
    const wanted = new Set<string>();
    this.queue.length = 0;
    for (let dy = -this.radius; dy <= this.radius; dy += 1) {
      for (let dx = -this.radius; dx <= this.radius; dx += 1) {
        if (dx * dx + dy * dy > (this.radius + 0.5) ** 2) continue;
        const key = `${ccx + dx},${ccy + dy}`;
        wanted.add(key);
        if (!this.chunks.has(key)) this.queue.push([ccx + dx, ccy + dy]);
      }
    }
    // Nearest first.
    this.queue.sort((a, b) => (a[0] - ccx) ** 2 + (a[1] - ccy) ** 2 - ((b[0] - ccx) ** 2 + (b[1] - ccy) ** 2));
    for (let i = 0; i < Math.min(budget, this.queue.length); i += 1) {
      const [cx, cy] = this.queue[i];
      const built = buildChunk(cx, cy);
      const holder = new THREE.Group();
      const mesh = new THREE.Mesh(built.scenery, sceneryMaterial());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      holder.add(mesh);
      if (built.water) {
        const water = new THREE.Mesh(built.water, flowingWaterMaterial());
        water.receiveShadow = true;
        water.matrixAutoUpdate = false;
        water.updateMatrix();
        holder.add(water);
      }
      this.chunks.set(`${cx},${cy}`, holder);
      this.group.add(holder);
    }
    for (const [key, mesh] of this.chunks) {
      if (wanted.has(key)) continue;
      // Keep a margin before unloading to avoid thrash at chunk borders.
      const [kx, ky] = key.split(",").map(Number);
      if ((kx - ccx) ** 2 + (ky - ccy) ** 2 <= (this.radius + 2) ** 2) continue;
      this.group.remove(mesh);
      mesh.traverse((o) => (o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry.dispose());
      this.chunks.delete(key);
    }
    this.water.position.x = Math.round(x / 4) * 4;
    this.water.position.z = Math.round(y / 4) * 4;
  }

  get pending(): number {
    return this.queue.length;
  }
}
