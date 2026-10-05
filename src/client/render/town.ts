// Hearthmoor's buildings, lamps, gate towers and fountain as one merged mesh, plus a handful of
// real point lights that wake up at dusk.

import * as THREE from "three";
import { TOWN, TOWN_RADIUS, FOUNTAIN_RADIUS, type Building } from "../../shared/world/town";
import { heightAt } from "../../shared/world/overworld";
import { hash2 } from "../../shared/math";
import { GeometryBuilder, PRIMS, sceneryMaterial } from "./builder";

const H = heightAt(0, 0);

function addBuilding(b: GeometryBuilder, bd: Building): void {
  const cx = bd.x + bd.w / 2;
  const cz = bd.y + bd.h / 2;
  const tall = bd.kind === "inn" || bd.kind === "guild" ? 2.6 : 2.0;
  const w = bd.w - 0.3;
  const d = bd.h - 0.3;
  const alongX = bd.w >= bd.h;
  // Stone footing, walls, timber corners.
  b.add(PRIMS.box, { x: cx, y: H + 0.15, z: cz, sx: w + 0.2, sy: 0.3, sz: d + 0.2, color: "#cbbfb2" });
  b.add(PRIMS.box, { x: cx, y: H + 0.3 + tall / 2, z: cz, sx: w, sy: tall, sz: d, color: bd.wall, jitter: 0.04 });
  for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    b.add(PRIMS.box, { x: cx + (ox * w) / 2, y: H + 0.3 + tall / 2, z: cz + (oz * d) / 2, sx: 0.22, sy: tall, sz: 0.22, color: "#9a6b4f" });
  }
  // Roof: a prism with overhang, ridge along the long side.
  const roofH = 1.5 + Math.min(bd.w, bd.h) * 0.12;
  b.add(PRIMS.prism, {
    x: cx,
    y: H + 0.3 + tall,
    z: cz,
    sx: (alongX ? d : w) + 0.9,
    sy: roofH,
    sz: (alongX ? w : d) + 0.6,
    ry: alongX ? Math.PI / 2 : 0,
    color: bd.roof,
    jitter: 0.08
  });
  // Chimney with a little cap.
  const chx = cx + (alongX ? w * 0.25 : w * 0.2);
  const chz = cz + (alongX ? d * 0.15 : -d * 0.25);
  b.add(PRIMS.box, { x: chx, y: H + tall + roofH * 0.8, z: chz, sx: 0.45, sy: 1.2, sz: 0.45, color: "#b5a397" });
  b.add(PRIMS.box, { x: chx, y: H + tall + roofH * 0.8 + 0.65, z: chz, sx: 0.6, sy: 0.12, sz: 0.6, color: "#8a7a70" });

  // Door on the side facing town centre, with a round-ish top and a lantern.
  const doorX = bd.door.x + 0.5;
  const doorZ = bd.door.y + 0.5;
  const nx = Math.round(Math.cos(bd.door.facing));
  const nz = Math.round(Math.sin(bd.door.facing));
  const faceX = nx !== 0 ? cx + (nx * w) / 2 + nx * 0.03 : doorX;
  const faceZ = nz !== 0 ? cz + (nz * d) / 2 + nz * 0.03 : doorZ;
  const doorRot = nx !== 0 ? Math.PI / 2 : 0;
  b.add(PRIMS.box, { x: faceX, y: H + 0.3 + 0.75, z: faceZ, sx: 0.9, sy: 1.5, sz: 0.08, ry: doorRot, color: "#8a5a3a" });
  b.add(PRIMS.cyl12, { x: faceX, y: H + 0.3 + 1.5, z: faceZ, sx: 0.45, sy: 0.08, sz: 0.45, rx: Math.PI / 2, ry: doorRot, color: "#8a5a3a" });
  b.add(PRIMS.ico, { x: faceX + (nz !== 0 ? 0.7 : 0) , y: H + 0.3 + 1.7, z: faceZ + (nx !== 0 ? 0.7 : 0), sx: 0.12, sy: 0.15, sz: 0.12, color: "#ffc66b", glow: -2.5 });
  // Steps
  b.add(PRIMS.box, { x: faceX + nx * 0.35, y: H + 0.08, z: faceZ + nz * 0.35, sx: nx ? 0.5 : 1.2, sy: 0.16, sz: nz ? 0.5 : 1.2, color: "#d9cfc4" });

  // Windows on all four sides (glow warmly at night), with flower boxes under the front ones.
  const sides: [number, number, number, number][] = [
    [0, -1, w, d],
    [0, 1, w, d],
    [-1, 0, d, w],
    [1, 0, d, w]
  ];
  for (const [sx, sz, len] of sides) {
    const count = Math.max(1, Math.floor(len / 2.2));
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count - 0.5;
      const wx = sx !== 0 ? cx + (sx * w) / 2 + sx * 0.04 : cx + t * len;
      const wz = sz !== 0 ? cz + (sz * d) / 2 + sz * 0.04 : cz + t * len;
      if (Math.abs(wx - faceX) < 0.8 && Math.abs(wz - faceZ) < 0.8) continue;
      const rot = sx !== 0 ? Math.PI / 2 : 0;
      b.add(PRIMS.box, { x: wx, y: H + 0.3 + tall * 0.6, z: wz, sx: 0.7, sy: 0.65, sz: 0.06, ry: rot, color: "#ffe6a8", glow: -1.6 });
      b.add(PRIMS.box, { x: wx, y: H + 0.3 + tall * 0.6, z: wz, sx: 0.08, sy: 0.7, sz: 0.09, ry: rot, color: "#ffffff" });
      b.add(PRIMS.box, { x: wx, y: H + 0.3 + tall * 0.6, z: wz, sx: 0.78, sy: 0.08, sz: 0.09, ry: rot, color: "#ffffff" });
      if (hash2(Math.round(wx * 3), Math.round(wz * 3), 5) > 0.35) {
        const ox = sx * 0.12;
        const oz = sz * 0.12;
        b.add(PRIMS.box, { x: wx + ox, y: H + 0.3 + tall * 0.6 - 0.42, z: wz + oz, sx: 0.8, sy: 0.16, sz: 0.2, ry: rot, color: "#9a6b4f" });
        for (let f = 0; f < 3; f += 1) {
          const along = (f - 1) * 0.24;
          b.add(PRIMS.ico, {
            x: wx + ox + (sx === 0 ? along : 0),
            y: H + 0.3 + tall * 0.6 - 0.28,
            z: wz + oz + (sz === 0 ? 0 : along),
            sx: 0.1, sy: 0.1, sz: 0.1,
            color: ["#ff8fb1", "#ffd166", "#b9a3ff"][f],
            sway: 0.3
          });
        }
      }
    }
  }

  // Shop signage / awnings.
  if (bd.kind === "store" || bd.kind === "smithy" || bd.kind === "inn") {
    const awning = bd.kind === "store" ? "#8fd3ff" : bd.kind === "smithy" ? "#ff9a6b" : "#d9b3ff";
    for (let i = -2; i <= 2; i += 1) {
      const ax = nx !== 0 ? faceX + nx * 0.55 : faceX + i * 0.62;
      const az = nz !== 0 ? faceZ + nz * 0.55 : faceZ + i * 0.62;
      b.add(PRIMS.box, { x: ax, y: H + 0.3 + tall - 0.1, z: az, sx: nx ? 1.1 : 0.62, sy: 0.06, sz: nz ? 1.1 : 0.62, rx: nz ? nz * 0.35 : 0, rz: nx ? -nx * 0.35 : 0, color: i % 2 ? "#ffffff" : awning });
    }
    if (bd.kind === "smithy") {
      // Anvil + glowing forge outside.
      const fx = faceX + nx * 2 + (nz ? 1.6 : 0);
      const fz = faceZ + nz * 2 + (nx ? 1.6 : 0);
      b.add(PRIMS.box, { x: fx, y: H + 0.4, z: fz, sx: 0.5, sy: 0.4, sz: 0.3, color: "#5a5f6a" });
      b.add(PRIMS.box, { x: fx, y: H + 0.68, z: fz, sx: 0.8, sy: 0.18, sz: 0.32, color: "#6a707c" });
      b.add(PRIMS.cyl8, { x: fx + 1.1, y: H + 0.35, z: fz, sx: 0.5, sy: 0.7, sz: 0.5, color: "#8a7a70" });
      b.add(PRIMS.ico, { x: fx + 1.1, y: H + 0.75, z: fz, sx: 0.32, sy: 0.15, sz: 0.32, color: "#ff8a3c", glow: 1.8 });
    }
    if (bd.kind === "store") {
      // Crates and a barrel of apples.
      const sx0 = faceX + nx * 1.8 + (nz ? -1.8 : 0);
      const sz0 = faceZ + nz * 1.8 + (nx ? -1.8 : 0);
      b.add(PRIMS.box, { x: sx0, y: H + 0.3, z: sz0, sx: 0.6, sy: 0.6, sz: 0.6, ry: 0.2, color: "#c9955f" });
      b.add(PRIMS.box, { x: sx0 + 0.3, y: H + 0.8, z: sz0, sx: 0.45, sy: 0.4, sz: 0.45, ry: 0.6, color: "#d9a56f" });
      b.add(PRIMS.cyl8, { x: sx0 - 0.8, y: H + 0.4, z: sz0 + 0.2, sx: 0.32, sy: 0.8, sz: 0.32, color: "#9a6b4f" });
      for (let i = 0; i < 5; i += 1) b.add(PRIMS.ico, { x: sx0 - 0.8 + (i - 2) * 0.1, y: H + 0.85, z: sz0 + 0.2 + (i % 2) * 0.1, sx: 0.1, sy: 0.1, sz: 0.1, color: "#ff5c6a" });
    }
  }
}

function addLamp(b: GeometryBuilder, x: number, z: number): void {
  b.add(PRIMS.cyl6, { x, y: H + 0.06, z, sx: 0.16, sy: 0.12, sz: 0.16, color: "#8a7a70" });
  b.add(PRIMS.cyl6, { x, y: H + 0.8, z, sx: 0.045, sy: 1.5, sz: 0.045, color: "#7a6a62" });
  b.add(PRIMS.box, { x, y: H + 1.68, z, sx: 0.24, sy: 0.28, sz: 0.24, color: "#ffe2a0", glow: -3 });
  b.add(PRIMS.cone4, { x, y: H + 1.92, z, sx: 0.22, sy: 0.2, sz: 0.22, ry: Math.PI / 4, color: "#c98b6a" });
  b.add(PRIMS.ico, { x, y: H + 2.05, z, sx: 0.05, sy: 0.05, sz: 0.05, color: "#c98b6a" });
}

function addFountain(b: GeometryBuilder): void {
  const r = FOUNTAIN_RADIUS;
  b.add(PRIMS.cyl12, { x: 0, y: H + 0.25, z: 0, sx: r + 0.2, sy: 0.5, sz: r + 0.2, color: "#e3dace" });
  b.add(PRIMS.cyl12, { x: 0, y: H + 0.46, z: 0, sx: r - 0.1, sy: 0.08, sz: r - 0.1, color: "#7fd3f0", glow: 0.15 });
  b.add(PRIMS.cyl8, { x: 0, y: H + 1.0, z: 0, sx: 0.25, sy: 1.2, sz: 0.25, color: "#e3dace" });
  b.add(PRIMS.cyl12, { x: 0, y: H + 1.55, z: 0, sx: 0.75, sy: 0.18, sz: 0.75, color: "#e3dace" });
  b.add(PRIMS.cyl12, { x: 0, y: H + 1.64, z: 0, sx: 0.62, sy: 0.04, sz: 0.62, color: "#8fe3ff", glow: 0.2 });
  b.add(PRIMS.ico, { x: 0, y: H + 1.95, z: 0, sx: 0.22, sy: 0.3, sz: 0.22, color: "#ffc94d", glow: 0.6 });
  // Flowerbeds around the basin.
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    b.add(PRIMS.ico, { x: Math.cos(a) * (r + 0.55), y: H + 0.2, z: Math.sin(a) * (r + 0.55), sx: 0.22, sy: 0.18, sz: 0.22, color: ["#ff8fb1", "#ffd166", "#b9a3ff", "#ffffff"][i % 4], sway: 0.4 });
  }
}

function addGateTowers(b: GeometryBuilder): void {
  for (let i = 0; i < 4; i += 1) {
    const a = (i * Math.PI) / 2;
    for (const side of [-1, 1]) {
      const perp = a + Math.PI / 2;
      const x = Math.cos(a) * TOWN_RADIUS + Math.cos(perp) * side * 3.6;
      const z = Math.sin(a) * TOWN_RADIUS + Math.sin(perp) * side * 3.6;
      b.add(PRIMS.cyl8, { x, y: H + 1.8, z, sx: 1.15, sy: 3.6, sz: 1.15, color: "#d8cfc4", jitter: 0.05 });
      b.add(PRIMS.cyl8, { x, y: H + 3.75, z, sx: 1.3, sy: 0.3, sz: 1.3, color: "#e3dace" });
      b.add(PRIMS.cone8, { x, y: H + 4.75, z, sx: 1.4, sy: 1.7, sz: 1.4, color: i % 2 ? "#6fa8dc" : "#e57a5a", jitter: 0.06 });
      b.add(PRIMS.cyl6, { x, y: H + 5.9, z, sx: 0.03, sy: 0.8, sz: 0.03, color: "#5a4a4a" });
      b.add(PRIMS.box, { x: x + 0.28, y: H + 6.1, z, sx: 0.5, sy: 0.3, sz: 0.02, color: "#ffd166" });
      b.add(PRIMS.box, { x: x + Math.cos(a) * 1.18, y: H + 2.4, z: z + Math.sin(a) * 1.18, sx: 0.3, sy: 0.5, sz: 0.3, color: "#ffe6a8", glow: -1.4 });
    }
    // Arch banner across the gate.
    const gx = Math.cos(a) * TOWN_RADIUS;
    const gz = Math.sin(a) * TOWN_RADIUS;
    b.add(PRIMS.box, { x: gx, y: H + 3.3, z: gz, sx: Math.abs(Math.sin(a)) > 0.5 ? 0.4 : 7.2, sy: 0.35, sz: Math.abs(Math.sin(a)) > 0.5 ? 7.2 : 0.4, color: "#b5a397" });
  }
}

export interface TownVisual {
  mesh: THREE.Mesh;
  lights: THREE.PointLight[];
}

export function buildTown(): TownVisual {
  const b = new GeometryBuilder();
  for (const bd of TOWN.buildings) addBuilding(b, bd);
  for (const lamp of TOWN.lamps) addLamp(b, lamp.x, lamp.y);
  addFountain(b);
  addGateTowers(b);
  const mesh = new THREE.Mesh(b.build(), sceneryMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();

  // A few real lights: plaza lamps only (cheap), brightening at night.
  const lights: THREE.PointLight[] = [];
  TOWN.lamps.slice(-8).forEach((lamp, i) => {
    if (i % 2) return;
    const l = new THREE.PointLight(0xffc979, 0, 11, 1.6);
    l.position.set(lamp.x, H + 1.7, lamp.y);
    lights.push(l);
  });
  return { mesh, lights };
}
