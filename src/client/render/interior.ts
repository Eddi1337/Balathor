// Interior maps: homes (plank floors, plaster walls, windows) and the royal throne room (marble,
// pillars, banners, carpet, throne). The wall nearest the camera is kept low so you can see in.
// Also builds the furniture models placed in homes.

import * as THREE from "three";
import type { InteriorMapDef } from "../../shared/world/maps";
import { FURNITURE, footprint } from "../../shared/game/furniture";
import { hash2 } from "../../shared/math";
import { GeometryBuilder, PRIMS, sceneryMaterial } from "./builder";

const WALL_H = 3.2;

export function buildInterior(map: InteriorMapDef): THREE.Group {
  const L = map.layout;
  const royal = L.style === "throne";
  const b = new GeometryBuilder();
  const floorA = royal ? "#f1ece4" : "#c9955f";
  const floorB = royal ? "#d9d1c6" : "#b9854f";
  // Floor: planks (homes) or a marble chequerboard (throne room).
  for (let y = 1; y < L.h - 1; y += 1) {
    for (let x = 1; x < L.w - 1; x += 1) {
      const c = royal ? ((x + y) % 2 ? floorA : floorB) : (Math.floor((x + (y % 2) * 2) / 3) % 2 ? floorA : floorB);
      b.add(PRIMS.box, { x: x + 0.5, y: -0.05, z: y + 0.5, sx: 1.002, sy: 0.1, sz: 1.002, color: c, jitter: 0.04 });
    }
  }
  // Walls: tall at the back and sides, a low cut-away wall at the front (camera side).
  const wallColor = royal ? "#f6f2ec" : map.plot?.house.wall ?? "#fbeedd";
  const trim = royal ? "#d9c27a" : "#9a6b4f";
  for (let x = 0; x < L.w; x += 1) {
    for (const y of [0, L.h - 1]) {
      const front = y === L.h - 1;
      if (front && x === L.door.x) continue;
      const h = front ? 0.7 : WALL_H;
      b.add(PRIMS.box, { x: x + 0.5, y: h / 2, z: y + 0.5, sx: 1.01, sy: h, sz: 1, color: wallColor });
      if (!front) b.add(PRIMS.box, { x: x + 0.5, y: 0.5, z: y + 0.98, sx: 1.01, sy: 1, sz: 0.06, color: royal ? "#e9dccb" : "#e8d4b8" });
    }
  }
  for (let y = 1; y < L.h - 1; y += 1) {
    for (const x of [0, L.w - 1]) {
      const h = y > L.h - 4 ? 0.7 + ((L.h - 1 - y) / 3) * (WALL_H - 0.7) : WALL_H;
      b.add(PRIMS.box, { x: x + 0.5, y: h / 2, z: y + 0.5, sx: 1, sy: h, sz: 1.01, color: wallColor });
    }
  }
  b.add(PRIMS.box, { x: L.w / 2, y: WALL_H + 0.06, z: 0.5, sx: L.w, sy: 0.12, sz: 1.1, color: trim });
  // Windows on the back wall (glow at night, sunny by day).
  for (let x = 2; x < L.w - 2; x += 3) {
    b.add(PRIMS.box, { x: x + 0.5, y: 1.8, z: 1.03, sx: 0.9, sy: 1.1, sz: 0.06, color: "#ffe9b0", glow: 0.35 });
    b.add(PRIMS.box, { x: x + 0.5, y: 1.8, z: 1.06, sx: 0.08, sy: 1.15, sz: 0.06, color: trim });
    b.add(PRIMS.box, { x: x + 0.5, y: 1.8, z: 1.06, sx: 0.95, sy: 0.08, sz: 0.06, color: trim });
  }
  // Doormat + door frame.
  b.add(PRIMS.box, { x: L.door.x + 0.5, y: 0.02, z: L.door.y - 0.2, sx: 1.4, sy: 0.04, sz: 0.8, color: royal ? "#b23a48" : "#d98b5f" });
  // Door frame stays low, like the front wall, so it never hides you.
  for (const side of [-0.75, 0.75]) b.add(PRIMS.box, { x: L.door.x + 0.5 + side, y: 0.45, z: L.door.y + 0.5, sx: 0.18, sy: 0.9, sz: 0.3, color: "#8a5a3a" });
  if (L.stairs) {
    for (let i = 0; i < 5; i += 1) {
      b.add(PRIMS.box, { x: L.stairs.x + 0.5, y: 0.15 + i * 0.3, z: L.stairs.y + 0.9 - i * 0.2, sx: 1, sy: 0.3, sz: 0.3, color: i % 2 ? "#9a6b4f" : "#8a5a3a" });
    }
  }

  if (royal) {
    // Royal carpet from the door to the throne.
    b.add(PRIMS.box, { x: L.door.x + 0.5, y: 0.03, z: L.h / 2, sx: 2.2, sy: 0.04, sz: L.h - 3, color: "#b23a48" });
    b.add(PRIMS.box, { x: L.door.x + 0.5, y: 0.035, z: L.h / 2, sx: 1.6, sy: 0.04, sz: L.h - 3.2, color: "#d94a5e" });
    // Pillars.
    for (const key of L.solid) {
      const [x, y] = key.split(",").map(Number);
      if (y <= 2) continue;
      b.add(PRIMS.cyl12, { x: x + 0.5, y: WALL_H / 2 + 0.6, z: y + 0.5, sx: 0.42, sy: WALL_H + 1.2, sz: 0.42, color: "#f6f2ec" });
      b.add(PRIMS.box, { x: x + 0.5, y: 0.15, z: y + 0.5, sx: 1, sy: 0.3, sz: 1, color: "#d9d1c6" });
      b.add(PRIMS.box, { x: x + 0.5, y: WALL_H + 1.15, z: y + 0.5, sx: 1, sy: 0.3, sz: 1, color: "#d9c27a" });
    }
    // Dais + throne.
    b.add(PRIMS.box, { x: 11.5, y: 0.15, z: 2, sx: 6, sy: 0.3, sz: 3, color: "#d9d1c6" });
    b.add(PRIMS.box, { x: 11.5, y: 0.35, z: 1.6, sx: 4.6, sy: 0.25, sz: 2, color: "#e9dccb" });
    b.add(PRIMS.box, { x: 11.5, y: 0.95, z: 1.4, sx: 1.4, sy: 0.6, sz: 1.1, color: "#ffc94d", glow: 0.2 });
    b.add(PRIMS.box, { x: 11.5, y: 2.1, z: 0.95, sx: 1.4, sy: 2.4, sz: 0.25, color: "#ffc94d", glow: 0.2 });
    b.add(PRIMS.box, { x: 11.5, y: 1.3, z: 1.4, sx: 1.1, sy: 0.15, sz: 0.9, color: "#7b3fbf" });
    b.add(PRIMS.octa, { x: 11.5, y: 3.5, z: 0.95, sx: 0.35, sy: 0.4, sz: 0.1, color: "#ff5c8a", glow: 1.2 });
    // Banners along the back wall.
    for (const x of [3, 7, 16, 20]) {
      b.add(PRIMS.box, { x: x + 0.5, y: 2.2, z: 1.05, sx: 1.2, sy: 2.2, sz: 0.05, color: x < 11 ? "#7b3fbf" : "#5b8def" });
      b.add(PRIMS.octa, { x: x + 0.5, y: 2.4, z: 1.1, sx: 0.3, sy: 0.3, sz: 0.06, color: "#ffd166", glow: 0.5 });
    }
    // Chandeliers.
    for (const z of [5.5, 11]) {
      b.add(PRIMS.torus, { x: 11.5, y: WALL_H + 0.3, z, sx: 1.1, sy: 1.1, sz: 1.1, rx: Math.PI / 2, color: "#ffc94d" });
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        b.add(PRIMS.ico, { x: 11.5 + Math.cos(a) * 1.1, y: WALL_H + 0.5, z: z + Math.sin(a) * 1.1, sx: 0.08, sy: 0.12, sz: 0.08, color: "#ffe2a0", glow: 2.5 });
      }
    }
  } else {
    // A built-in rug and lamp so even an empty home feels lived in.
    b.add(PRIMS.cyl12, { x: L.w / 2, y: 0.02, z: L.h / 2, sx: 1.6, sy: 0.03, sz: 1.2, color: hash2(L.w, L.h, 1) > 0.5 ? "#e98aa8" : "#8fd3ff" });
    b.add(PRIMS.box, { x: 1.4, y: 1.8, z: 1.4, sx: 0.2, sy: 0.25, sz: 0.2, color: "#ffe2a0", glow: -2.2 });
  }
  const mesh = new THREE.Mesh(b.build(), sceneryMaterial());
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  const group = new THREE.Group();
  group.add(mesh);
  // Warm indoor light(s).
  const light = new THREE.PointLight(0xffd9a0, royal ? 26 : 14, royal ? 22 : 14, 1.4);
  light.position.set(L.w / 2, 2.8, L.h / 2);
  group.add(light);
  return group;
}

// ── furniture models ─────────────────────────────────────────────────────────

export function buildFurniture(kind: string, rot: number): THREE.Group {
  const def = FURNITURE[kind];
  const b = new GeometryBuilder();
  const wood = "#b9854f";
  const dark = "#8a5a3a";
  switch (kind) {
    case "bed":
      b.add(PRIMS.box, { x: 0, y: 0.25, z: 0, sx: 0.95, sy: 0.3, sz: 1.9, color: wood });
      b.add(PRIMS.rbox, { x: 0, y: 0.48, z: 0.1, sx: 0.85, sy: 0.22, sz: 1.6, color: "#f4f8ff" });
      b.add(PRIMS.rbox, { x: 0, y: 0.52, z: 0.35, sx: 0.88, sy: 0.18, sz: 1.1, color: "#ff9fc4" });
      b.add(PRIMS.rbox, { x: 0, y: 0.62, z: -0.65, sx: 0.6, sy: 0.16, sz: 0.35, color: "#ffffff" });
      b.add(PRIMS.box, { x: 0, y: 0.6, z: -0.93, sx: 0.95, sy: 0.9, sz: 0.08, color: dark });
      break;
    case "table":
      b.add(PRIMS.box, { x: 0, y: 0.72, z: 0, sx: 1.9, sy: 0.08, sz: 0.85, color: wood });
      for (const sx of [-0.8, 0.8]) for (const sz of [-0.32, 0.32]) b.add(PRIMS.box, { x: sx, y: 0.36, z: sz, sx: 0.08, sy: 0.72, sz: 0.08, color: dark });
      b.add(PRIMS.cyl8, { x: 0.3, y: 0.84, z: 0, sx: 0.12, sy: 0.16, sz: 0.12, color: "#8fd3ff" });
      b.add(PRIMS.ico, { x: 0.3, y: 0.98, z: 0, sx: 0.1, sy: 0.1, sz: 0.1, color: "#ff8fb1" });
      break;
    case "chair":
      b.add(PRIMS.box, { x: 0, y: 0.42, z: 0, sx: 0.55, sy: 0.07, sz: 0.55, color: wood });
      b.add(PRIMS.box, { x: 0, y: 0.75, z: -0.25, sx: 0.55, sy: 0.6, sz: 0.06, color: wood });
      for (const sx of [-0.22, 0.22]) for (const sz of [-0.22, 0.22]) b.add(PRIMS.box, { x: sx, y: 0.21, z: sz, sx: 0.06, sy: 0.42, sz: 0.06, color: dark });
      break;
    case "sofa":
      b.add(PRIMS.rbox, { x: 0, y: 0.3, z: 0.05, sx: 1.9, sy: 0.4, sz: 0.8, color: "#9fb4ff" });
      b.add(PRIMS.rbox, { x: 0, y: 0.7, z: -0.3, sx: 1.9, sy: 0.6, sz: 0.25, color: "#8fa3ef" });
      for (const sx of [-0.9, 0.9]) b.add(PRIMS.rbox, { x: sx, y: 0.5, z: 0.05, sx: 0.22, sy: 0.55, sz: 0.8, color: "#8fa3ef" });
      b.add(PRIMS.rbox, { x: -0.45, y: 0.62, z: -0.05, sx: 0.4, sy: 0.3, sz: 0.15, color: "#ffd166" });
      break;
    case "rug":
      b.add(PRIMS.cyl12, { x: 0, y: 0.02, z: 0, sx: 0.98, sy: 0.03, sz: 0.98, color: "#c98bd8" });
      b.add(PRIMS.cyl12, { x: 0, y: 0.03, z: 0, sx: 0.7, sy: 0.03, sz: 0.7, color: "#ffd166" });
      b.add(PRIMS.cyl12, { x: 0, y: 0.04, z: 0, sx: 0.35, sy: 0.03, sz: 0.35, color: "#ff8fb1" });
      break;
    case "bookshelf":
      b.add(PRIMS.box, { x: 0, y: 1.0, z: 0, sx: 1.9, sy: 2.0, sz: 0.5, color: dark });
      for (let row = 0; row < 3; row += 1) {
        for (let i = 0; i < 9; i += 1) b.add(PRIMS.box, { x: -0.8 + i * 0.2, y: 0.45 + row * 0.6, z: 0.08, sx: 0.14, sy: 0.4 + (i % 3) * 0.04, sz: 0.36, color: ["#e57a5a", "#6fa8dc", "#8fc97a", "#f2b950", "#c98bd8"][(i + row) % 5] });
      }
      break;
    case "fireplace":
      b.add(PRIMS.box, { x: 0, y: 0.8, z: -0.1, sx: 1.9, sy: 1.6, sz: 0.7, color: "#cfc6bd" });
      b.add(PRIMS.box, { x: 0, y: 1.65, z: 0.05, sx: 2.1, sy: 0.15, sz: 0.8, color: dark });
      b.add(PRIMS.box, { x: 0, y: 0.45, z: 0.22, sx: 0.9, sy: 0.7, sz: 0.1, color: "#3b2f4a" });
      b.add(PRIMS.ico, { x: 0, y: 0.35, z: 0.24, sx: 0.32, sy: 0.3, sz: 0.1, color: "#ff8a3c", glow: 2.4 });
      b.add(PRIMS.ico, { x: 0.05, y: 0.45, z: 0.25, sx: 0.16, sy: 0.22, sz: 0.08, color: "#ffd166", glow: 2.8 });
      break;
    case "plant":
      b.add(PRIMS.cyl8, { x: 0, y: 0.2, z: 0, sx: 0.25, sy: 0.4, sz: 0.25, color: "#e57a5a" });
      b.add(PRIMS.ico1, { x: 0, y: 0.65, z: 0, sx: 0.35, sy: 0.4, sz: 0.35, color: "#6fbf5f", sway: 0.3, jitter: 0.1 });
      b.add(PRIMS.ico, { x: 0.15, y: 0.85, z: 0.1, sx: 0.08, sy: 0.08, sz: 0.08, color: "#ff8fb1" });
      break;
    case "lantern":
      b.add(PRIMS.cyl6, { x: 0, y: 0.7, z: 0, sx: 0.05, sy: 1.4, sz: 0.05, color: "#6a5a52" });
      b.add(PRIMS.box, { x: 0, y: 1.45, z: 0, sx: 0.28, sy: 0.32, sz: 0.28, color: "#ffe2a0", glow: 2.5 });
      b.add(PRIMS.cone4, { x: 0, y: 1.7, z: 0, sx: 0.24, sy: 0.2, sz: 0.24, ry: Math.PI / 4, color: dark });
      break;
    case "painting":
      b.add(PRIMS.box, { x: 0, y: 1.7, z: -0.42, sx: 0.9, sy: 0.7, sz: 0.06, color: "#ffc94d" });
      b.add(PRIMS.box, { x: 0, y: 1.7, z: -0.39, sx: 0.76, sy: 0.56, sz: 0.04, color: "#8fd3ff" });
      b.add(PRIMS.box, { x: 0, y: 1.55, z: -0.37, sx: 0.76, sy: 0.24, sz: 0.04, color: "#8fc97a" });
      b.add(PRIMS.ico, { x: 0.2, y: 1.85, z: -0.36, sx: 0.08, sy: 0.08, sz: 0.02, color: "#fff3b0", glow: 0.5 });
      break;
    case "cabinet":
      b.add(PRIMS.box, { x: 0, y: 0.5, z: 0, sx: 0.9, sy: 1, sz: 0.6, color: "#e9dccb" });
      b.add(PRIMS.box, { x: 0, y: 1.02, z: 0, sx: 0.95, sy: 0.06, sz: 0.65, color: wood });
      b.add(PRIMS.box, { x: 0, y: 0.5, z: 0.31, sx: 0.04, sy: 0.85, sz: 0.02, color: dark });
      b.add(PRIMS.cyl8, { x: -0.2, y: 1.15, z: 0, sx: 0.1, sy: 0.2, sz: 0.1, color: "#6fa8dc" });
      break;
    case "weapon_rack":
      b.add(PRIMS.box, { x: 0, y: 0.9, z: -0.3, sx: 1.9, sy: 1.6, sz: 0.1, color: dark });
      for (let i = 0; i < 3; i += 1) b.add(PRIMS.box, { x: -0.6 + i * 0.6, y: 1.0, z: -0.2, sx: 0.08, sy: 1.2, sz: 0.04, color: "#e8edf2" });
      b.add(PRIMS.cyl12, { x: 0, y: 1.3, z: -0.2, sx: 0.35, sy: 0.05, sz: 0.35, rx: Math.PI / 2, color: "#5b8def" });
      break;
    case "trophy":
      b.add(PRIMS.box, { x: 0, y: 0.45, z: 0, sx: 0.6, sy: 0.9, sz: 0.6, color: "#e9dccb" });
      b.add(PRIMS.cyl8, { x: 0, y: 1.0, z: 0, sx: 0.12, sy: 0.2, sz: 0.12, color: "#ffc94d", glow: 0.3 });
      b.add(PRIMS.cyl12, { x: 0, y: 1.25, z: 0, sx: 0.22, sy: 0.3, sz: 0.22, color: "#ffc94d", glow: 0.3 });
      break;
    case "chest":
      b.add(PRIMS.box, { x: 0, y: 0.28, z: 0, sx: 0.85, sy: 0.55, sz: 0.6, color: wood });
      b.add(PRIMS.rbox, { x: 0, y: 0.62, z: 0, sx: 0.88, sy: 0.22, sz: 0.62, color: dark });
      b.add(PRIMS.box, { x: 0, y: 0.45, z: 0.31, sx: 0.14, sy: 0.18, sz: 0.04, color: "#ffc94d", glow: 0.3 });
      break;
    case "cat": {
      b.add(PRIMS.cyl12, { x: 0, y: 0.08, z: 0, sx: 0.42, sy: 0.16, sz: 0.42, color: "#e98aa8" });
      b.add(PRIMS.rbox, { x: 0, y: 0.27, z: 0, sx: 0.5, sy: 0.24, sz: 0.36, color: "#ffb38a" });
      b.add(PRIMS.rbox, { x: 0.22, y: 0.33, z: 0.08, sx: 0.24, sy: 0.22, sz: 0.24, color: "#ffb38a" });
      b.add(PRIMS.cone4, { x: 0.18, y: 0.48, z: 0.02, sx: 0.06, sy: 0.1, sz: 0.06, color: "#ffb38a" });
      b.add(PRIMS.cone4, { x: 0.3, y: 0.48, z: 0.12, sx: 0.06, sy: 0.1, sz: 0.06, color: "#ffb38a" });
      b.add(PRIMS.box, { x: 0.3, y: 0.34, z: 0.2, sx: 0.08, sy: 0.015, sz: 0.01, color: "#3b2f4a" });
      b.add(PRIMS.ico, { x: -0.2, y: 0.22, z: 0.18, sx: 0.22, sy: 0.07, sz: 0.07, color: "#e8956a" });
      break;
    }
    default:
      b.add(PRIMS.box, { x: 0, y: 0.4, z: 0, sx: 0.8, sy: 0.8, sz: 0.8, color: wood });
  }
  const mesh = new THREE.Mesh(b.build(), sceneryMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const inner = new THREE.Group();
  inner.add(mesh);
  inner.rotation.y = -rot * (Math.PI / 2);
  const outer = new THREE.Group();
  // Pivot at the footprint centre; the entity position is the min corner.
  const fp = def ? footprint(def, rot) : { w: 1, h: 1 };
  inner.position.set(fp.w / 2, 0, fp.h / 2);
  outer.add(inner);
  return outer;
}
