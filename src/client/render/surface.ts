// Planet surfaces: faceted terrain in each world's palette, alien flora (glowing bulb trees and
// star-moss on Aurelia, ice spires and crystal fields on Icefall, spine plants and rust-wood on
// Rust), pools and acid lakes, rim cliffs and the landing pad with its beacon. A planet is small
// enough to build in one go (chunk by chunk, spread over a few frames).

import * as THREE from "three";
import type { PlanetMapDef } from "../../shared/world/maps";
import { Tile } from "../../shared/world/tiles";
import { hash2 } from "../../shared/math";
import { PAD_RADIUS, PLANET_PAD, type PlanetId } from "../../shared/world/scifi/planets";
import { GeometryBuilder, PRIMS, sceneryMaterial } from "./builder";
import { stillWaterMaterial, withStillFlow } from "./water";

const CHUNK = 32;

interface Palette {
  ground: Partial<Record<number, string>>;
  base: string;
  leaves: string[];
  trunk: string;
  crystal: string;
  rock: string;
  ore: string;
  flowers: string[];
  sky: { top: string; horizon: string; fog: string; sun: string; ground: string; sunI: number; hemiI: number };
}

const PALETTES: Record<PlanetId, Palette> = {
  aurelia: {
    ground: { [Tile.GRASS]: "#5fd6a0", [Tile.DARK_GRASS]: "#3fb88a", [Tile.MEADOW]: "#7fe0b8", [Tile.FLOWERS]: "#7fe0b8", [Tile.SHALLOW]: "#4fa8a0" },
    base: "#5fd6a0",
    leaves: ["#ff9fd8", "#b98cff", "#7fe8ff", "#ffd166"],
    trunk: "#6a5a8a",
    crystal: "#7fffc9",
    rock: "#8a9ab8",
    ore: "#7fffc9",
    flowers: ["#ffffff", "#7fe8ff", "#ff9fd8", "#fff3a0"],
    sky: { top: "#2fa0c9", horizon: "#ffc9e8", fog: "#cfe3ef", sun: "#fff1e0", ground: "#3f8a7a", sunI: 2.3, hemiI: 1.1 }
  },
  icefall: {
    ground: { [Tile.SNOW]: "#eef6ff", [Tile.PLAZA]: "#bfe3ff" },
    base: "#eef6ff",
    leaves: ["#bfe8ff"],
    trunk: "#9fc4e6",
    crystal: "#7fc8ff",
    rock: "#9aa8c0",
    ore: "#e8f0ff",
    flowers: ["#ffffff"],
    sky: { top: "#6f9fe0", horizon: "#e8f4ff", fog: "#dceaff", sun: "#f4f8ff", ground: "#8aa0c0", sunI: 2.0, hemiI: 1.15 }
  },
  rust: {
    ground: { [Tile.SAND]: "#e8955f", [Tile.ASH]: "#c9724a", [Tile.WATER]: "#7a8a3a" },
    base: "#e8955f",
    leaves: ["#ffb02e"],
    trunk: "#7a3a2a",
    crystal: "#ffd166",
    rock: "#a85a3a",
    ore: "#d6e0f0",
    flowers: ["#ffd166"],
    sky: { top: "#d97a5a", horizon: "#ffd9a8", fog: "#f2c4a0", sun: "#fff0d0", ground: "#8a4a3a", sunI: 2.5, hemiI: 1.0 }
  }
};

export function planetSky(id: PlanetId): Palette["sky"] {
  return PALETTES[id].sky;
}

const tmpC = new THREE.Color();

function pick<T>(arr: T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}

function addAlienProp(b: GeometryBuilder, id: PlanetId, pal: Palette, tile: number, x: number, y: number, h: number): void {
  const r1 = hash2(x, y, 11);
  const r2 = hash2(x, y, 23);
  const r3 = hash2(x, y, 37);
  const cx = x + 0.5 + (r1 - 0.5) * 0.3;
  const cz = y + 0.5 + (r2 - 0.5) * 0.3;
  const s = 0.85 + r3 * 0.45;
  const rot = r1 * Math.PI * 2;
  switch (tile) {
    case Tile.TREE: {
      // Bulb tree: a curvy trunk and a glowing round canopy with hanging lanterns.
      const leaf = pick(pal.leaves, r2);
      b.add(PRIMS.taper6, { x: cx, y: h + 0.7 * s, z: cz, sx: 0.14 * s, sy: 1.4 * s, sz: 0.14 * s, rz: (r1 - 0.5) * 0.3, color: pal.trunk });
      b.add(PRIMS.ico, { x: cx, y: h + 1.9 * s, z: cz, sx: 0.9 * s, sy: 0.75 * s, sz: 0.9 * s, ry: rot, color: leaf, sway: 0.8, jitter: 0.1, glow: 0.12 });
      b.add(PRIMS.octa, { x: cx + Math.cos(rot) * 0.6 * s, y: h + 1.35 * s, z: cz + Math.sin(rot) * 0.6 * s, sx: 0.1, sy: 0.14, sz: 0.1, color: "#fff3a0", glow: 1.4, sway: 1 });
      break;
    }
    case Tile.SNOW_PINE: {
      // Ice spire: stacked translucent-looking shards.
      for (let i = 0; i < 3; i += 1) {
        b.add(PRIMS.octa, { x: cx + (i - 1) * 0.22, y: h + (0.6 + i * 0.22) * s, z: cz + (i % 2) * 0.18, sx: 0.22 * s, sy: (1.2 - i * 0.3) * s, sz: 0.22 * s, ry: rot + i, color: i === 1 ? "#e8f6ff" : "#9fd4f5", glow: 0.15 });
      }
      break;
    }
    case Tile.CRYSTAL: {
      const n = 3 + Math.floor(r3 * 3);
      for (let i = 0; i < n; i += 1) {
        const a = rot + (i / n) * Math.PI * 2;
        const lean = i === 0 ? 0 : 0.45;
        b.add(PRIMS.octa, { x: cx + Math.cos(a) * lean * 0.4, y: h + (i === 0 ? 0.7 : 0.4) * s, z: cz + Math.sin(a) * lean * 0.4, sx: 0.18 * s, sy: (i === 0 ? 0.8 : 0.45) * s, sz: 0.18 * s, rx: Math.sin(a) * lean, rz: -Math.cos(a) * lean, color: pal.crystal, glow: 1.0 });
      }
      break;
    }
    case Tile.ROCK: {
      b.add(PRIMS.dodeca, { x: cx, y: h + 0.3 * s, z: cz, sx: 0.6 * s, sy: 0.48 * s, sz: 0.55 * s, ry: rot, color: pal.rock, jitter: 0.18 });
      if (r2 > 0.4) b.add(PRIMS.dodeca, { x: cx + 0.35, y: h + 0.15, z: cz + 0.25, sx: 0.28, sy: 0.22, sz: 0.28, ry: rot, color: pal.rock, jitter: 0.15 });
      for (let i = 0; i < 3; i += 1) b.add(PRIMS.octa, { x: cx + Math.cos(rot + i * 2) * 0.35 * s, y: h + 0.4 * s, z: cz + Math.sin(rot + i * 2) * 0.32 * s, sx: 0.07, sy: 0.09, sz: 0.07, color: pal.ore, glow: 0.8 });
      break;
    }
    case Tile.BUSH: {
      const leaf = pick(pal.leaves, r1);
      b.add(PRIMS.ico, { x: cx, y: h + 0.35, z: cz, sx: 0.5 * s, sy: 0.4 * s, sz: 0.5 * s, color: leaf, sway: 0.5, jitter: 0.12 });
      b.add(PRIMS.octa, { x: cx + 0.3, y: h + 0.55, z: cz, sx: 0.07, sy: 0.07, sz: 0.07, color: "#7fe8ff", glow: 1.2, sway: 0.5 });
      break;
    }
    case Tile.CACTUS: {
      // Spine plant: a bulb with long glowing spines.
      b.add(PRIMS.ico, { x: cx, y: h + 0.45, z: cz, sx: 0.4, sy: 0.5, sz: 0.4, color: "#c95a3a", jitter: 0.1 });
      for (let i = 0; i < 4; i += 1) {
        const a = rot + (i / 4) * Math.PI * 2;
        b.add(PRIMS.cone4, { x: cx + Math.cos(a) * 0.3, y: h + 0.7, z: cz + Math.sin(a) * 0.3, sx: 0.04, sy: 0.6, sz: 0.04, rx: Math.sin(a) * 0.8, rz: -Math.cos(a) * 0.8, color: "#ffd166", glow: 0.5 });
      }
      break;
    }
    case Tile.DEAD_TREE: {
      b.add(PRIMS.taper6, { x: cx, y: h + 0.9, z: cz, sx: 0.16, sy: 1.8, sz: 0.16, rz: (r1 - 0.5) * 0.4, color: pal.trunk });
      b.add(PRIMS.cyl6, { x: cx + 0.35, y: h + 1.5, z: cz, sx: 0.06, sy: 0.8, sz: 0.06, rz: -0.9, color: pal.trunk });
      b.add(PRIMS.cyl6, { x: cx - 0.3, y: h + 1.3, z: cz + 0.1, sx: 0.05, sy: 0.7, sz: 0.05, rz: 0.9, color: pal.trunk });
      b.add(PRIMS.ico, { x: cx + 0.7, y: h + 1.85, z: cz, sx: 0.12, sy: 0.12, sz: 0.12, color: "#ffb02e", glow: 1 });
      break;
    }
    case Tile.FLOWERS: {
      b.add(PRIMS.cone4, { x: cx, y: h + 0.18, z: cz, sx: 0.03, sy: 0.36, sz: 0.03, color: "#3f8a7a", sway: 1 });
      b.add(PRIMS.octa, { x: cx, y: h + 0.4, z: cz, sx: 0.1, sy: 0.08, sz: 0.1, color: pick(pal.flowers, r3), glow: 0.9, sway: 1 });
      break;
    }
  }
}

function isPropTile(t: number): boolean {
  return t === Tile.TREE || t === Tile.SNOW_PINE || t === Tile.CRYSTAL || t === Tile.ROCK || t === Tile.BUSH || t === Tile.CACTUS || t === Tile.DEAD_TREE || t === Tile.FLOWERS;
}

function buildSurfaceChunk(map: PlanetMapDef, pal: Palette, cx: number, cy: number): { scenery: THREE.BufferGeometry; water: THREE.BufferGeometry | null; acid: THREE.BufferGeometry | null } {
  const b = new GeometryBuilder();
  const water = new GeometryBuilder();
  const acid = new GeometryBuilder();
  const ox = cx * CHUNK;
  const oy = cy * CHUNK;
  const N = CHUNK + 1;
  const hs = new Float32Array(N * N);
  for (let j = 0; j < N; j += 1) for (let i = 0; i < N; i += 1) hs[j * N + i] = map.heightAt(ox + i, oy + j);
  const R = map.planet.radius;
  const id = map.planet.id;
  for (let ly = 0; ly < CHUNK; ly += 1) {
    for (let lx = 0; lx < CHUNK; lx += 1) {
      const x = ox + lx;
      const y = oy + ly;
      if (Math.hypot(x + 0.5, y + 0.5) > R + 6) continue;
      const tile = map.tileAt(x + 0.5, y + 0.5);
      const h00 = hs[ly * N + lx];
      const h10 = hs[ly * N + lx + 1];
      const h01 = hs[(ly + 1) * N + lx];
      const h11 = hs[(ly + 1) * N + lx + 1];
      const hc = (h00 + h10 + h01 + h11) / 4;
      const groundTile = isPropTile(tile) && tile !== Tile.FLOWERS ? -1 : tile;
      tmpC.set(pal.ground[groundTile] ?? (tile === Tile.PAD ? "#5a6478" : tile === Tile.FORCEFIELD || tile === Tile.ROCK ? pal.rock : pal.base));
      tmpC.multiplyScalar(0.94 + hash2(x, y, 977) * 0.1);
      if (hc > 2.5) tmpC.lerp(new THREE.Color(pal.rock), Math.min(0.6, (hc - 2.5) * 0.12));
      const c = tmpC.clone();
      if ((x + y) & 1) {
        b.tri(x, h00, y, x, h01, y + 1, x + 1, h10, y, c);
        b.tri(x + 1, h10, y, x, h01, y + 1, x + 1, h11, y + 1, c.clone().multiplyScalar(0.97));
      } else {
        b.tri(x, h00, y, x + 1, h11, y + 1, x + 1, h10, y, c);
        b.tri(x, h00, y, x, h01, y + 1, x + 1, h11, y + 1, c.clone().multiplyScalar(0.97));
      }
      if (tile === Tile.SHALLOW || tile === Tile.WATER) {
        const wb = tile === Tile.SHALLOW ? water : acid;
        const wy = tile === Tile.SHALLOW ? 0.14 : 0.16;
        const wc = new THREE.Color(tile === Tile.SHALLOW ? "#5cc6e8" : "#9dff5c");
        wb.tri(x, wy, y, x, wy, y + 1, x + 1, wy, y, wc);
        wb.tri(x + 1, wy, y, x, wy, y + 1, x + 1, wy, y + 1, wc);
      }
      else if (tile === Tile.ROCK && Math.hypot(x + 0.5, y + 0.5) > R - 3.5) {
        // The rim: a few big boulders (the cliffs beyond do the rest).
        if (hash2(x, y, 47) < 0.3) b.add(PRIMS.dodeca, { x: x + 0.5, y: hc + 0.6, z: y + 0.5, sx: 1.2, sy: 1.0, sz: 1.1, ry: hash2(x, y, 49) * 3, color: pal.rock, jitter: 0.15 });
      } else if (isPropTile(tile)) addAlienProp(b, id, pal, tile, x, y, hc);
      // Rim cliffs: tall rock spires mark the edge of the world.
      if (tile === Tile.FORCEFIELD && Math.hypot(x + 0.5, y + 0.5) < R + 2.5 && hash2(x, y, 41) < 0.35) {
        const s = 1 + hash2(x, y, 43) * 1.6;
        b.add(PRIMS.cone6, { x: x + 0.5, y: hc + 1.6 * s, z: y + 0.5, sx: 0.9 * s, sy: 3.4 * s, sz: 0.9 * s, ry: hash2(x, y, 45) * 3, color: pal.rock, jitter: 0.15 });
      }
    }
  }
  return {
    scenery: b.build(),
    water: water.vertexCount ? withStillFlow(water.build()) : null,
    acid: acid.vertexCount ? acid.build() : null
  };
}

export class Surface {
  readonly group = new THREE.Group();
  private queue: [number, number][] = [];
  private beacon: THREE.Mesh;

  constructor(private map: PlanetMapDef) {
    const pal = PALETTES[map.planet.id];
    const n = Math.ceil((map.planet.radius + 8) / CHUNK);
    for (let cy = -n; cy < n; cy += 1) for (let cx = -n; cx < n; cx += 1) this.queue.push([cx, cy]);
    // Nearest chunks to the pad first.
    this.queue.sort((a, b) => a[0] ** 2 + a[1] ** 2 - (b[0] ** 2 + b[1] ** 2));
    void pal;
    // The landing pad: a metal disc with lights and a beacon mast.
    const pb = new GeometryBuilder();
    const ph = map.heightAt(PLANET_PAD.x, PLANET_PAD.y);
    pb.add(PRIMS.cyl12, { x: PLANET_PAD.x, y: ph + 0.08, z: PLANET_PAD.y, sx: PAD_RADIUS - 0.4, sy: 0.16, sz: PAD_RADIUS - 0.4, color: "#9aa6b8" });
    pb.add(PRIMS.cyl12, { x: PLANET_PAD.x, y: ph + 0.18, z: PLANET_PAD.y, sx: PAD_RADIUS - 1.6, sy: 0.04, sz: PAD_RADIUS - 1.6, color: "#3b4a6a" });
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      pb.add(PRIMS.box, { x: PLANET_PAD.x + Math.cos(a) * (PAD_RADIUS - 0.9), y: ph + 0.2, z: PLANET_PAD.y + Math.sin(a) * (PAD_RADIUS - 0.9), sx: 0.4, sy: 0.06, sz: 0.16, ry: -a, color: "#ffd166", glow: 1.2 });
    }
    pb.add(PRIMS.cyl6, { x: PLANET_PAD.x - 4.2, y: ph + 2, z: PLANET_PAD.y - 4.2, sx: 0.12, sy: 4, sz: 0.12, color: "#5a6478" });
    const pad = new THREE.Mesh(pb.build(), sceneryMaterial());
    pad.receiveShadow = true;
    this.group.add(pad);
    this.beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshBasicMaterial({ color: 0xff5c6a }));
    this.beacon.position.set(PLANET_PAD.x - 4.2, ph + 4.2, PLANET_PAD.y - 4.2);
    this.group.add(this.beacon);
  }

  /** Build a few chunks per frame until the whole world is up. */
  update(time: number, budget = 4): void {
    const pal = PALETTES[this.map.planet.id];
    for (let i = 0; i < budget && this.queue.length; i += 1) {
      const [cx, cy] = this.queue.shift()!;
      const built = buildSurfaceChunk(this.map, pal, cx, cy);
      const mesh = new THREE.Mesh(built.scenery, sceneryMaterial());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      if (built.water) this.group.add(new THREE.Mesh(built.water, stillWaterMaterial()));
      if (built.acid) this.group.add(new THREE.Mesh(built.acid, new THREE.MeshStandardMaterial({ color: 0x9dff5c, emissive: 0x3f8a1a, transparent: true, opacity: 0.8, roughness: 0.2 })));
    }
    this.beacon.visible = Math.sin(time * 4) > 0;
  }

  get pending(): number {
    return this.queue.length;
  }

  dispose(): void {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
  }
}
