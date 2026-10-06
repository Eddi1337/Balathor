// The Boundless Ocean: island chunks streamed around the camera (sandy beaches, palms, jungles,
// ruins, Skull Isle's rocks), Port Bilgewater's houses, piers and lighthouse, treasure X's, and a
// big animated sea that follows the camera.

import * as THREE from "three";
import type { MapDef } from "../../shared/world/maps";
import { Tile } from "../../shared/world/tiles";
import { hash2 } from "../../shared/math";
import { GROTTO, ISLES, PIER_H, PORT_BUILDINGS, treasureSpot } from "../../shared/world/sea/ocean";
import { GeometryBuilder, PRIMS, sceneryMaterial } from "./builder";
import { addProp, tileColor } from "./terrain";
import { stillWaterMaterial, withStillFlow } from "./water";

const CHUNK = 32;

const SEA_FLOOR: Record<number, string> = {
  [Tile.WATER]: "#2f8fb0",
  [Tile.SHALLOW]: "#7fd6c9"
};

function addPortBuilding(b: GeometryBuilder, bd: (typeof PORT_BUILDINGS)[number], h: number): void {
  const cx = bd.x + bd.w / 2;
  const cz = bd.y + bd.h / 2;
  if (bd.id === "house5") {
    // The lighthouse: a striped tower with a glowing lamp room.
    for (let i = 0; i < 6; i += 1) b.add(PRIMS.cyl8, { x: cx, y: h + 0.9 + i * 1.6, z: cz, sx: 1.9 - i * 0.15, sy: 1.6, sz: 1.9 - i * 0.15, color: i % 2 ? "#ff5c6a" : "#ffffff" });
    b.add(PRIMS.cyl8, { x: cx, y: h + 10.6, z: cz, sx: 1.1, sy: 1.2, sz: 1.1, color: "#fff3a0", glow: 2 });
    b.add(PRIMS.cone8, { x: cx, y: h + 11.8, z: cz, sx: 1.3, sy: 1.2, sz: 1.3, color: "#3b2f4a" });
    return;
  }
  const wallH = 2.8;
  b.add(PRIMS.box, { x: cx, y: h + wallH / 2, z: cz, sx: bd.w, sy: wallH, sz: bd.h, color: "#e8d6b8", jitter: 0.06 });
  // Timber frame
  for (const s of [-1, 1]) {
    b.add(PRIMS.box, { x: cx + s * (bd.w / 2), y: h + wallH / 2, z: cz, sx: 0.2, sy: wallH, sz: bd.h + 0.1, color: "#7a5234" });
    b.add(PRIMS.box, { x: cx, y: h + wallH / 2, z: cz + s * (bd.h / 2), sx: bd.w + 0.1, sy: 0.2, sz: 0.2, color: "#7a5234" });
  }
  // Roof
  b.add(PRIMS.prism, { x: cx, y: h + wallH, z: cz, sx: bd.w + 0.8, sy: 2.2, sz: bd.h + 0.6, color: bd.roof, jitter: 0.05 });
  // Door and windows on the south face
  b.add(PRIMS.box, { x: cx, y: h + 0.9, z: bd.y + bd.h + 0.03, sx: 1.1, sy: 1.8, sz: 0.08, color: "#5a3a2a" });
  for (let i = 1; i < bd.w / 2.5; i += 1) {
    const wx = bd.x + i * 2.5;
    if (Math.abs(wx - cx) < 1.2) continue;
    b.add(PRIMS.box, { x: wx, y: h + 1.7, z: bd.y + bd.h + 0.03, sx: 0.8, sy: 0.7, sz: 0.06, color: "#ffd166", glow: -1.5 });
    b.add(PRIMS.box, { x: wx, y: h + 1.7, z: bd.y + bd.h + 0.06, sx: 0.9, sy: 0.08, sz: 0.04, color: "#7a5234" });
  }
  // A hanging sign for the shops.
  if (!bd.id.startsWith("house")) {
    b.add(PRIMS.box, { x: cx + 1.4, y: h + 2.3, z: bd.y + bd.h + 0.5, sx: 0.06, sy: 0.06, sz: 1, color: "#7a5234" });
    b.add(PRIMS.box, { x: cx + 1.4, y: h + 1.95, z: bd.y + bd.h + 0.85, sx: 0.8, sy: 0.55, sz: 0.06, color: bd.roof });
  }
  // Chimney
  b.add(PRIMS.box, { x: bd.x + bd.w - 1, y: h + wallH + 1.6, z: bd.y + 1.2, sx: 0.6, sy: 1.4, sz: 0.6, color: "#9a8a80" });
}

function buildSeaChunk(map: MapDef, cx: number, cy: number): THREE.BufferGeometry {
  const b = new GeometryBuilder();
  const ox = cx * CHUNK;
  const oy = cy * CHUNK;
  const N = CHUNK + 1;
  const hs = new Float32Array(N * N);
  for (let j = 0; j < N; j += 1) for (let i = 0; i < N; i += 1) hs[j * N + i] = map.heightAt(ox + i, oy + j);
  const tmp = new THREE.Color();
  let land = false;
  for (let ly = 0; ly < CHUNK; ly += 1) {
    for (let lx = 0; lx < CHUNK; lx += 1) {
      const x = ox + lx;
      const y = oy + ly;
      const tile = map.tileAt(x + 0.5, y + 0.5);
      if (tile === Tile.FORCEFIELD) continue;
      const h00 = hs[ly * N + lx];
      const h10 = hs[ly * N + lx + 1];
      const h01 = hs[(ly + 1) * N + lx];
      const h11 = hs[(ly + 1) * N + lx + 1];
      if (tile === Tile.WATER && h00 < -1.5 && h11 < -1.5 && h10 < -1.5 && h01 < -1.5) continue; // open sea: the water plane covers it
      land = true;
      const hc = (h00 + h10 + h01 + h11) / 4;
      if (tile === Tile.FLOOR) {
        // Pier planks on posts.
        b.add(PRIMS.box, { x: x + 0.5, y: PIER_H - 0.06, z: y + 0.5, sx: 1.02, sy: 0.12, sz: 0.94, color: (x + y) % 2 ? "#c9955f" : "#b98550", jitter: 0.08 });
        if (x % 3 === 0 && y % 3 === 0) b.add(PRIMS.cyl6, { x: x + 0.5, y: -0.6, z: y + 0.5, sx: 0.14, sy: 2.4, sz: 0.14, color: "#7a5234" });
        continue;
      }
      const c = SEA_FLOOR[tile] ? tmp.set(SEA_FLOOR[tile]).multiplyScalar(0.92 + hash2(x, y, 5) * 0.12).clone() : tileColor(tile, "beach", x, y, hc).clone();
      if ((x + y) & 1) {
        b.tri(x, h00, y, x, h01, y + 1, x + 1, h10, y, c);
        b.tri(x + 1, h10, y, x, h01, y + 1, x + 1, h11, y + 1, c.clone().multiplyScalar(0.97));
      } else {
        b.tri(x, h00, y, x + 1, h11, y + 1, x + 1, h10, y, c);
        b.tri(x, h00, y, x, h01, y + 1, x + 1, h11, y + 1, c.clone().multiplyScalar(0.97));
      }
      if (tile === Tile.WALL) {
        // Ruins: broken pillars and toppled blocks.
        const r = hash2(x, y, 9);
        b.add(PRIMS.box, { x: x + 0.5, y: hc + 0.6 + r * 0.6, z: y + 0.5, sx: 0.8, sy: 1.2 + r * 1.2, sz: 0.8, ry: r, color: "#cfc6bd", jitter: 0.12 });
        if (r > 0.6) b.add(PRIMS.box, { x: x + 0.9, y: hc + 0.2, z: y + 0.2, sx: 0.7, sy: 0.4, sz: 0.5, ry: r * 3, color: "#b9b0a6" });
      } else if (tile >= 20 && tile !== Tile.BUILDING) {
        addProp(b, tile, tile === Tile.PALM || tile === Tile.SAND ? "beach" : "meadow", x, y, hc);
      }
    }
  }
  if (!land) return b.build();
  // Port Bilgewater's buildings, the grotto arch and treasure X's that fall in this chunk.
  for (const bd of PORT_BUILDINGS) {
    const cxB = bd.x + bd.w / 2;
    const czB = bd.y + bd.h / 2;
    if (Math.floor(cxB / CHUNK) === cx && Math.floor(czB / CHUNK) === cy) addPortBuilding(b, bd, map.heightAt(cxB, bd.y + bd.h + 1));
  }
  if (Math.floor(GROTTO.x / CHUNK) === cx && Math.floor(GROTTO.y / CHUNK) === cy) {
    const h = map.heightAt(GROTTO.x, GROTTO.y);
    b.add(PRIMS.dodeca, { x: GROTTO.x, y: h + 1.4, z: GROTTO.y - 4.2, sx: 3.6, sy: 2.8, sz: 3, color: "#8a8f9a", jitter: 0.15 });
    b.add(PRIMS.box, { x: GROTTO.x, y: h + 0.9, z: GROTTO.y - 1.45, sx: 1.6, sy: 1.8, sz: 0.2, color: "#1a1626" });
    b.add(PRIMS.octa, { x: GROTTO.x - 1.2, y: h + 1.9, z: GROTTO.y - 1.4, sx: 0.12, sy: 0.18, sz: 0.12, color: "#ffd166", glow: 1.4 });
  }
  for (const isle of ISLES) {
    if (isle.kind !== "treasure" && isle.kind !== "skull") continue;
    const t = treasureSpot(isle);
    if (Math.floor(t.x / CHUNK) !== cx || Math.floor(t.y / CHUNK) !== cy) continue;
    const h = map.heightAt(t.x, t.y) + 0.04;
    for (const r of [0.75, -0.75]) b.add(PRIMS.box, { x: t.x, y: h, z: t.y, sx: 1.4, sy: 0.04, sz: 0.25, ry: r, color: "#ff5c6a" });
  }
  return b.build();
}

export class SeaTerrain {
  readonly group = new THREE.Group();
  readonly water: THREE.Mesh;
  private chunks = new Map<string, THREE.Mesh>();

  constructor(private map: MapDef, private radius = 4) {
    const geo = new THREE.PlaneGeometry(420, 420, 110, 110);
    geo.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(withStillFlow(geo), stillWaterMaterial());
    this.water.position.y = 0;
    this.water.receiveShadow = true;
    this.group.add(this.water);
  }

  update(x: number, y: number, budget = 2): void {
    const ccx = Math.floor(x / CHUNK);
    const ccy = Math.floor(y / CHUNK);
    const want = new Set<string>();
    const queue: [number, number][] = [];
    for (let dy = -this.radius; dy <= this.radius; dy += 1) {
      for (let dx = -this.radius; dx <= this.radius; dx += 1) {
        if (dx * dx + dy * dy > (this.radius + 0.5) ** 2) continue;
        const key = `${ccx + dx},${ccy + dy}`;
        want.add(key);
        if (!this.chunks.has(key)) queue.push([ccx + dx, ccy + dy]);
      }
    }
    queue.sort((a, b) => (a[0] - ccx) ** 2 + (a[1] - ccy) ** 2 - ((b[0] - ccx) ** 2 + (b[1] - ccy) ** 2));
    for (let i = 0; i < Math.min(budget, queue.length); i += 1) {
      const [cx, cy] = queue[i];
      const mesh = new THREE.Mesh(buildSeaChunk(this.map, cx, cy), sceneryMaterial());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.chunks.set(`${cx},${cy}`, mesh);
      this.group.add(mesh);
    }
    for (const [key, mesh] of this.chunks) {
      if (want.has(key)) continue;
      const [kx, ky] = key.split(",").map(Number);
      if ((kx - ccx) ** 2 + (ky - ccy) ** 2 <= (this.radius + 2) ** 2) continue;
      this.group.remove(mesh);
      mesh.geometry.dispose();
      this.chunks.delete(key);
    }
    this.water.position.x = Math.round(x / 4) * 4;
    this.water.position.z = Math.round(y / 4) * 4;
  }

  dispose(): void {
    for (const mesh of this.chunks.values()) mesh.geometry.dispose();
    this.chunks.clear();
  }
}
