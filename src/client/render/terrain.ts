// Streams overworld chunks around the camera: faceted terrain + all props merged per chunk,
// plus an animated low-poly water surface that follows the camera.

import * as THREE from "three";
import { CHUNK, getChunkTiles, heightAt, biomeAt, type Biome } from "../../shared/world/overworld";
import { Tile } from "../../shared/world/tiles";
import { hash2 } from "../../shared/math";
import { GeometryBuilder, PRIMS, sceneryMaterial, worldUniforms } from "./builder";

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
  [Tile.FLOOR]: "#d8b48a"
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
  return tile >= 20;
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
    case Tile.WALL: {
      // Town wall stones with little crenellations; the top tier glows faintly at night (torches).
      b.add(PRIMS.box, { x: x + 0.5, y: h + 1.1, z: y + 0.5, sx: 1.02, sy: 2.2, sz: 1.02, color: hash2(x, y, 3) > 0.5 ? "#d8cfc4" : "#cbbfb2", jitter: 0.06 });
      if ((x + y) % 2 === 0) b.add(PRIMS.box, { x: x + 0.5, y: h + 2.4, z: y + 0.5, sx: 0.6, sy: 0.4, sz: 0.6, color: "#e3dace" });
      if (hash2(x, y, 41) > 0.93) {
        b.add(PRIMS.cyl6, { x: x + 0.5, y: h + 2.45, z: y + 0.5, sx: 0.05, sy: 0.3, sz: 0.05, color: "#6a4a3a" });
        b.add(PRIMS.ico, { x: x + 0.5, y: h + 2.7, z: y + 0.5, sx: 0.12, sy: 0.16, sz: 0.12, color: "#ffb347", glow: -2.2 });
      }
      break;
    }
    default:
      break;
  }
}

function addGroundDecor(b: GeometryBuilder, tile: number, biome: Biome, x: number, y: number, h: number): void {
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
      if (isProp(tile)) addProp(b, tile, biome, x, y, hc);
      else addGroundDecor(b, tile, biome, x, y, hc);
    }
  }
  return b.build();
}

export class TerrainStreamer {
  private chunks = new Map<string, THREE.Mesh>();
  private queue: [number, number][] = [];
  readonly group = new THREE.Group();
  readonly water: THREE.Mesh;

  constructor(private radius: number) {
    const geo = new THREE.PlaneGeometry(320, 320, 96, 96);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: "#5cc6e8", roughness: 0.32, metalness: 0.02, transparent: true, opacity: 0.8, flatShading: true });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = worldUniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           vec4 wpos = modelMatrix * vec4(position, 1.0);
           transformed.y += sin(wpos.x * 0.55 + uTime * 1.3) * 0.06 + cos(wpos.z * 0.48 + uTime * 1.1) * 0.06;`
        );
    };
    this.water = new THREE.Mesh(geo, mat);
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
      const mesh = new THREE.Mesh(buildChunkGeometry(cx, cy), sceneryMaterial());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      this.chunks.set(`${cx},${cy}`, mesh);
      this.group.add(mesh);
    }
    for (const [key, mesh] of this.chunks) {
      if (wanted.has(key)) continue;
      // Keep a margin before unloading to avoid thrash at chunk borders.
      const [kx, ky] = key.split(",").map(Number);
      if ((kx - ccx) ** 2 + (ky - ccy) ** 2 <= (this.radius + 2) ** 2) continue;
      this.group.remove(mesh);
      mesh.geometry.dispose();
      this.chunks.delete(key);
    }
    this.water.position.x = Math.round(x / 4) * 4;
    this.water.position.z = Math.round(y / 4) * 4;
  }

  get pending(): number {
    return this.queue.length;
  }
}
