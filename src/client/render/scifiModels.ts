// Sci-fi models: player ships (with a tiny pilot in the cockpit), pirate ships, asteroids, star
// jellies, drones and wrecks. Same chunky low-poly toon style as everything else. Ships point
// their nose along +z like every other model, and float above the space plane.

import * as THREE from "three";
import { GeometryBuilder, PRIMS } from "./builder";
import { eyes, newModel, part, shade, type Model } from "./models";
import type { Appearance } from "../../shared/protocol";
import type { MobModel } from "../../shared/game/mobs";
import { HULLS, type HullId } from "../../shared/game/ships";

export const SHIP_FLOAT = 1.3;

const SCIFI_MOBS = new Set<MobModel>(["ship", "asteroid", "jelly", "drone", "wreck", "robot", "turret"]);
export function isScifiModel(model: MobModel): boolean {
  return SCIFI_MOBS.has(model);
}

function engineGlow(color: string, size: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(size, size * 3.2, 8, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  mesh.rotation.x = -Math.PI / 2; // point backward (-z)
  mesh.userData.base = size;
  return mesh;
}

function canopy(x: number, y: number, z: number, sx: number, sy: number, sz: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xbfefff, transparent: true, opacity: 0.38, roughness: 0.05, metalness: 0.2, depthWrite: false })
  );
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  return mesh;
}

/** A cute pilot head (skin + hair) peeking out of the cockpit. */
function pilot(b: GeometryBuilder, look: Appearance | null, x: number, y: number, z: number, s: number): void {
  const skin = look?.skin ?? "#ffd9b8";
  const hair = look?.hair ?? "#7a5234";
  b.add(PRIMS.rbox, { x, y, z, sx: 0.36 * s, sy: 0.34 * s, sz: 0.34 * s, color: skin });
  b.add(PRIMS.rbox, { x, y: y + 0.13 * s, z: z - 0.03 * s, sx: 0.39 * s, sy: 0.14 * s, sz: 0.37 * s, color: hair });
  eyes(b, x, y + 0.01 * s, z + 0.17 * s, 0.08 * s, 0.035 * s);
  for (const side of [-1, 1]) b.add(PRIMS.ico, { x: x + side * 0.12 * s, y: y - 0.06 * s, z: z + 0.17 * s, sx: 0.04 * s, sy: 0.025 * s, sz: 0.01, color: "#ff9fb5" });
}

interface ShipDesign {
  build(b: GeometryBuilder, color: string, accent: string): void;
  engines: [number, number, number][];
  engineSize: number;
  cockpit: [number, number, number, number];
  length: number;
}

const DESIGNS: Record<HullId | "pirate", ShipDesign> = {
  // A round yellow bumblebee with black stripes and stubby wings.
  skiff: {
    length: 2.0,
    cockpit: [0, 0.32, 0.25, 0.42],
    engines: [[0, 0, -0.95]],
    engineSize: 0.2,
    build(b, color, accent) {
      b.add(PRIMS.rbox, { x: 0, y: 0, z: 0, sx: 0.9, sy: 0.62, sz: 1.6, color });
      for (const z of [-0.25, -0.6]) b.add(PRIMS.rbox, { x: 0, y: 0, z, sx: 0.93, sy: 0.65, sz: 0.14, color: accent });
      b.add(PRIMS.cone8, { x: 0, y: 0, z: 0.95, sx: 0.32, sy: 0.4, sz: 0.28, rx: Math.PI / 2, color: shade(color, 0.85) });
      for (const s of [-1, 1]) {
        b.add(PRIMS.rbox, { x: s * 0.72, y: -0.05, z: -0.1, sx: 0.65, sy: 0.1, sz: 0.55, rz: s * -0.15, color: "#ffffff" });
        b.add(PRIMS.ico, { x: s * 1.04, y: -0.08, z: 0.05, sx: 0.09, sy: 0.09, sz: 0.09, color: "#5ff6ff", glow: 1.4 });
      }
      b.add(PRIMS.cyl8, { x: 0, y: 0, z: -0.9, sx: 0.26, sy: 0.25, sz: 0.26, rx: Math.PI / 2, color: "#5a5f6a" });
      b.add(PRIMS.cone4, { x: 0, y: 0.42, z: -0.55, sx: 0.06, sy: 0.35, sz: 0.3, color: accent });
    }
  },
  // A sleek pink comet with swept wings and twin guns.
  corvette: {
    length: 2.6,
    cockpit: [0, 0.27, 0.45, 0.36],
    engines: [[-0.32, 0, -1.3], [0.32, 0, -1.3]],
    engineSize: 0.17,
    build(b, color, accent) {
      b.add(PRIMS.rbox, { x: 0, y: 0, z: 0, sx: 0.7, sy: 0.48, sz: 2.3, color });
      b.add(PRIMS.cone8, { x: 0, y: 0, z: 1.35, sx: 0.28, sy: 0.55, sz: 0.22, rx: Math.PI / 2, color: accent });
      for (const s of [-1, 1]) {
        b.add(PRIMS.box, { x: s * 0.85, y: -0.04, z: -0.35, sx: 1.1, sy: 0.08, sz: 0.7, ry: s * 0.45, color: shade(color, 0.92) });
        b.add(PRIMS.box, { x: s * 1.18, y: -0.02, z: -0.62, sx: 0.32, sy: 0.12, sz: 0.5, ry: s * 0.45, color: accent });
        b.add(PRIMS.cyl6, { x: s * 1.3, y: 0, z: -0.2, sx: 0.06, sy: 0.7, sz: 0.06, rx: Math.PI / 2, color: "#5a5f6a" });
        b.add(PRIMS.cyl8, { x: s * 0.32, y: 0, z: -1.2, sx: 0.2, sy: 0.3, sz: 0.2, rx: Math.PI / 2, color: "#5a5f6a" });
      }
      b.add(PRIMS.cone4, { x: 0, y: 0.38, z: -0.8, sx: 0.05, sy: 0.4, sz: 0.4, color: accent });
    }
  },
  // A chubby blue puffin with an orange beak, cargo pods and a big engine.
  hauler: {
    length: 3.2,
    cockpit: [0, 0.55, 0.75, 0.42],
    engines: [[0, 0, -1.65]],
    engineSize: 0.38,
    build(b, color, accent) {
      b.add(PRIMS.ico1, { x: 0, y: 0, z: 0, sx: 1.05, sy: 0.85, sz: 1.6, color });
      b.add(PRIMS.ico1, { x: 0, y: -0.25, z: 0.2, sx: 0.8, sy: 0.55, sz: 1.2, color: "#ffffff" });
      b.add(PRIMS.cone4, { x: 0, y: 0.05, z: 1.65, sx: 0.36, sy: 0.6, sz: 0.3, rx: Math.PI / 2, ry: Math.PI / 4, color: accent });
      for (const s of [-1, 1]) {
        b.add(PRIMS.rbox, { x: s * 1.15, y: -0.2, z: -0.3, sx: 0.5, sy: 0.5, sz: 1.2, color: shade(color, 0.8) });
        b.add(PRIMS.box, { x: s * 1.15, y: 0.06, z: -0.3, sx: 0.52, sy: 0.06, sz: 0.9, color: accent });
        b.add(PRIMS.box, { x: s * 0.85, y: -0.1, z: 0, sx: 0.6, sy: 0.1, sz: 0.5, color: shade(color, 0.9) });
      }
      b.add(PRIMS.cyl8, { x: 0, y: 0, z: -1.5, sx: 0.45, sy: 0.4, sz: 0.45, rx: Math.PI / 2, color: "#5a5f6a" });
    }
  },
  // A long lavender starling flagship with big wings and drone pods.
  frigate: {
    length: 4.0,
    cockpit: [0, 0.48, 1.0, 0.42],
    engines: [[-0.55, 0, -2.0], [0, 0.1, -2.05], [0.55, 0, -2.0]],
    engineSize: 0.24,
    build(b, color, accent) {
      b.add(PRIMS.rbox, { x: 0, y: 0, z: 0, sx: 1.2, sy: 0.75, sz: 3.6, color });
      b.add(PRIMS.rbox, { x: 0, y: 0.35, z: -0.3, sx: 0.8, sy: 0.5, sz: 1.8, color: accent });
      b.add(PRIMS.cone8, { x: 0, y: 0, z: 2.05, sx: 0.5, sy: 0.6, sz: 0.36, rx: Math.PI / 2, color: shade(color, 0.85) });
      for (const s of [-1, 1]) {
        b.add(PRIMS.box, { x: s * 1.35, y: -0.05, z: -0.5, sx: 1.8, sy: 0.1, sz: 1.3, ry: s * 0.3, color: shade(color, 0.9) });
        b.add(PRIMS.box, { x: s * 2.05, y: 0.1, z: -0.85, sx: 0.12, sy: 0.6, sz: 0.7, color: accent });
        b.add(PRIMS.ico, { x: s * 2.1, y: 0.45, z: -0.7, sx: 0.1, sy: 0.1, sz: 0.1, color: s < 0 ? "#ff5c6a" : "#7cff9a", glow: 2 });
      }
      for (const x of [-0.55, 0, 0.55]) b.add(PRIMS.cyl8, { x, y: x === 0 ? 0.1 : 0, z: -1.9, sx: 0.25, sy: 0.3, sz: 0.25, rx: Math.PI / 2, color: "#5a5f6a" });
    }
  },
  // Angular, spiky, dark: unmistakably a pirate.
  pirate: {
    length: 2.2,
    cockpit: [0, 0.2, 0.2, 0],
    engines: [[0, 0, -1.05]],
    engineSize: 0.22,
    build(b, color, accent) {
      b.add(PRIMS.octa, { x: 0, y: 0, z: 0, sx: 0.6, sy: 0.38, sz: 1.3, color });
      b.add(PRIMS.box, { x: 0, y: 0.1, z: 0.1, sx: 0.5, sy: 0.25, sz: 1.1, color: shade(color, 1.2) });
      for (const s of [-1, 1]) {
        b.add(PRIMS.cone4, { x: s * 0.85, y: 0, z: -0.2, sx: 0.25, sy: 1.0, sz: 0.12, rz: s * -Math.PI / 2, color: shade(color, 0.9) });
        b.add(PRIMS.box, { x: s * 0.95, y: 0.02, z: -0.2, sx: 0.3, sy: 0.06, sz: 0.5, color: accent, glow: 0.6 });
        b.add(PRIMS.cone4, { x: s * 0.3, y: 0.38, z: -0.6, sx: 0.08, sy: 0.4, sz: 0.2, rz: s * 0.4, color: accent });
      }
      // Glowing angry eyes in the cockpit slit.
      for (const s of [-1, 1]) b.add(PRIMS.box, { x: s * 0.13, y: 0.24, z: 0.55, sx: 0.14, sy: 0.05, sz: 0.06, rz: s * -0.3, color: accent, glow: 2.2 });
      b.add(PRIMS.cyl8, { x: 0, y: 0, z: -1.0, sx: 0.24, sy: 0.25, sz: 0.24, rx: Math.PI / 2, color: "#2b2238" });
    }
  }
};

/** A ship model. `look` puts the pilot in the cockpit (players). */
export function buildShip(kind: HullId | "pirate", color: string, accent: string, look: Appearance | null, scale = 1): Model {
  const d = DESIGNS[kind];
  const len = kind === "pirate" ? d.length : HULLS[kind].size;
  const s = (len / d.length) * scale;
  const m = newModel("ship", 1.2, s);
  const b = new GeometryBuilder();
  d.build(b, color, accent);
  const [cx, cy, cz, cs] = d.cockpit;
  if (look && cs > 0) pilot(b, look, cx, cy + 0.1, cz, cs * 2.1);
  m.parts.torso = part(b, m.material);
  m.body.add(m.parts.torso);
  if (cs > 0) m.body.add(canopy(cx, cy, cz, cs, cs * 0.95, cs * 1.1));
  const glowColor = kind === "pirate" ? "#ff6a4a" : "#7fe8ff";
  const engines = new THREE.Group();
  for (const [x, y, z] of d.engines) {
    const g = engineGlow(glowColor, d.engineSize);
    g.position.set(x, y, z - d.engineSize * 1.5);
    engines.add(g);
  }
  m.body.add(engines);
  m.parts.extra = engines;
  m.body.position.y = SHIP_FLOAT;
  m.height = SHIP_FLOAT + 0.9 * s;
  if (kind === "frigate") {
    // Two little drone pods orbiting the flagship.
    const drones = new THREE.Group();
    for (const side of [-1, 1]) {
      const db = new GeometryBuilder();
      db.add(PRIMS.ico1, { x: 0, y: 0, z: 0, sx: 0.22, sy: 0.18, sz: 0.22, color: accent });
      db.add(PRIMS.ico, { x: 0, y: 0, z: 0.18, sx: 0.07, sy: 0.07, sz: 0.05, color: "#5ff6ff", glow: 2 });
      const dm = new THREE.Mesh(db.build(), m.material);
      dm.position.set(side * 2.6, 0.4, 0);
      drones.add(dm);
    }
    m.body.add(drones);
    m.parts.tail = drones;
  }
  return m;
}

/** Sci-fi mobs. */
export function buildScifiMob(model: MobModel, color: string, accent: string, scale: number, boss: boolean): Model {
  if (model === "ship") return buildShip("pirate", color, accent, null, scale * (boss ? 1.1 : 1));
  const m = newModel(model, 1, scale);
  const b = new GeometryBuilder();
  switch (model) {
    case "asteroid": {
      // A lumpy rock with glowing ore specks.
      const lumps = 4 + Math.floor(Math.random() * 3);
      b.add(PRIMS.dodeca, { x: 0, y: 0, z: 0, sx: 0.8, sy: 0.65, sz: 0.75, rx: Math.random() * 3, ry: Math.random() * 3, color, jitter: 0.25 });
      for (let i = 0; i < lumps; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const e = (Math.random() - 0.5) * 1.2;
        b.add(PRIMS.ico, { x: Math.cos(a) * 0.5, y: e * 0.4, z: Math.sin(a) * 0.5, sx: 0.35, sy: 0.3, sz: 0.32, rx: a, color: shade(color, 0.85 + Math.random() * 0.25), jitter: 0.2 });
      }
      for (let i = 0; i < 6; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const e = (Math.random() - 0.5) * 0.9;
        b.add(PRIMS.octa, { x: Math.cos(a) * 0.68, y: e * 0.5, z: Math.sin(a) * 0.62, sx: 0.09, sy: 0.12, sz: 0.09, color: accent, glow: 1.6 });
      }
      m.body.position.y = 0.9;
      m.height = 1.7 * scale;
      break;
    }
    case "jelly": {
      b.add(PRIMS.ico1, { x: 0, y: 0.35, z: 0, sx: 0.55, sy: 0.42, sz: 0.55, color, glow: 0.5 });
      b.add(PRIMS.cyl12, { x: 0, y: 0.12, z: 0, sx: 0.56, sy: 0.08, sz: 0.56, color: shade(color, 0.85), glow: 0.4 });
      eyes(b, 0, 0.36, 0.5, 0.16, 0.06);
      for (const s of [-1, 1]) b.add(PRIMS.ico, { x: s * 0.27, y: 0.26, z: 0.45, sx: 0.07, sy: 0.04, sz: 0.02, color: "#ff8fb1" });
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        b.add(PRIMS.cyl6, { x: Math.cos(a) * 0.32, y: -0.25, z: Math.sin(a) * 0.32, sx: 0.04, sy: 0.7, sz: 0.04, color: accent, glow: 1.2 });
      }
      m.body.position.y = 1.4;
      m.height = 2.0 * scale;
      break;
    }
    case "drone": {
      b.add(PRIMS.ico1, { x: 0, y: 0, z: 0, sx: 0.45, sy: 0.4, sz: 0.45, color });
      b.add(PRIMS.cyl12, { x: 0, y: 0, z: 0, sx: 0.65, sy: 0.08, sz: 0.65, color: shade(color, 0.7) });
      b.add(PRIMS.ico, { x: 0, y: 0.04, z: 0.4, sx: 0.14, sy: 0.14, sz: 0.08, color: accent, glow: 2.4 });
      for (const s of [-1, 1]) b.add(PRIMS.box, { x: s * 0.72, y: 0, z: 0, sx: 0.12, sy: 0.12, sz: 0.4, color: accent });
      m.body.position.y = 1.2;
      m.height = 1.8 * scale;
      break;
    }
    case "wreck": {
      // Broken hull halves and floating debris.
      b.add(PRIMS.box, { x: -0.3, y: 0, z: 0.1, sx: 0.8, sy: 0.5, sz: 1.2, ry: 0.4, rz: 0.3, color, jitter: 0.2 });
      b.add(PRIMS.box, { x: 0.55, y: 0.1, z: -0.5, sx: 0.6, sy: 0.45, sz: 0.8, ry: -0.6, rx: 0.4, color: shade(color, 0.8), jitter: 0.2 });
      b.add(PRIMS.box, { x: -0.5, y: 0.3, z: -0.6, sx: 0.9, sy: 0.06, sz: 0.4, ry: 1.1, rz: 0.5, color: shade(color, 1.1) });
      b.add(PRIMS.ico, { x: 0.2, y: 0.05, z: 0.05, sx: 0.16, sy: 0.16, sz: 0.16, color: accent, glow: 2.2 });
      for (let i = 0; i < 4; i += 1) b.add(PRIMS.box, { x: Math.random() * 2 - 1, y: Math.random() * 0.6 - 0.3, z: Math.random() * 2 - 1, sx: 0.12, sy: 0.12, sz: 0.12, rx: i, ry: i * 2, color: "#5a5f6a" });
      m.body.position.y = 0.9;
      m.height = 1.6 * scale;
      break;
    }
    case "robot": {
      // Lab security bot: boxy body on a hover base, big visor.
      b.add(PRIMS.rbox, { x: 0, y: 0.75, z: 0, sx: 0.7, sy: 0.7, sz: 0.55, color });
      b.add(PRIMS.rbox, { x: 0, y: 1.3, z: 0, sx: 0.55, sy: 0.42, sz: 0.48, color: shade(color, 1.1) });
      b.add(PRIMS.box, { x: 0, y: 1.32, z: 0.24, sx: 0.42, sy: 0.14, sz: 0.04, color: accent, glow: 2.2 });
      b.add(PRIMS.cyl8, { x: 0, y: 0.25, z: 0, sx: 0.4, sy: 0.12, sz: 0.4, color: "#5a5f6a" });
      b.add(PRIMS.cyl8, { x: 0, y: 0.12, z: 0, sx: 0.3, sy: 0.05, sz: 0.3, color: accent, glow: 1.4 });
      b.add(PRIMS.cyl6, { x: 0, y: 1.6, z: 0, sx: 0.03, sy: 0.25, sz: 0.03, color: "#5a5f6a" });
      b.add(PRIMS.ico, { x: 0, y: 1.75, z: 0, sx: 0.06, sy: 0.06, sz: 0.06, color: accent, glow: 2 });
      for (const s of [-1, 1]) b.add(PRIMS.rbox, { x: s * 0.45, y: 0.8, z: 0.05, sx: 0.18, sy: 0.45, sz: 0.2, color: shade(color, 0.8) });
      if (boss) {
        for (const s of [-1, 1]) b.add(PRIMS.cone4, { x: s * 0.3, y: 1.6, z: 0, sx: 0.08, sy: 0.3, sz: 0.08, color: accent, glow: 1 });
      }
      m.height = 1.95 * scale;
      break;
    }
    case "turret": {
      b.add(PRIMS.cyl8, { x: 0, y: 0.3, z: 0, sx: 0.55, sy: 0.6, sz: 0.55, color: shade(color, 0.8) });
      b.add(PRIMS.ico1, { x: 0, y: 0.8, z: 0, sx: 0.42, sy: 0.35, sz: 0.42, color });
      b.add(PRIMS.cyl6, { x: 0, y: 0.82, z: 0.45, sx: 0.08, sy: 0.6, sz: 0.08, rx: Math.PI / 2, color: "#5a5f6a" });
      b.add(PRIMS.ico, { x: 0, y: 0.92, z: 0.32, sx: 0.1, sy: 0.08, sz: 0.06, color: accent, glow: 2.2 });
      m.height = 1.3 * scale;
      break;
    }
    default:
      b.add(PRIMS.ico1, { x: 0, y: 0.5, z: 0, sx: 0.5, sy: 0.5, sz: 0.5, color });
  }
  m.parts.torso = part(b, m.material);
  m.body.add(m.parts.torso);
  return m;
}

/**
 * Per-frame animation for sci-fi models, applied after the generic animate(): banking ships,
 * engine flames, tumbling rocks, bobbing jellies and hovering drones.
 */
export function animateScifi(m: Model, opts: { moving: boolean; dead: boolean; boost?: boolean; turn?: number }, dt: number, time: number): void {
  const p = m.parts;
  switch (m.kind) {
    case "ship": {
      if (opts.dead) return;
      const bank = Math.max(-0.6, Math.min(0.6, -(opts.turn ?? 0) * 0.35));
      m.body.rotation.z += (bank - m.body.rotation.z) * Math.min(1, dt * 5);
      m.body.rotation.x = 0;
      m.body.position.y = SHIP_FLOAT + Math.sin(time * 1.6 + m.phase) * 0.12;
      if (p.extra) {
        const want = opts.boost ? 1.9 : opts.moving ? 1.15 : 0.45;
        for (const g of p.extra.children) {
          const cur = g.scale.y;
          g.scale.set(1, cur + (want * (0.9 + Math.random() * 0.2) - cur) * Math.min(1, dt * 10), 1);
        }
      }
      if (p.tail) p.tail.rotation.y = time * 0.9;
      break;
    }
    case "asteroid":
      if (opts.dead) return;
      m.body.rotation.y += dt * 0.25;
      m.body.rotation.x += dt * 0.12;
      m.body.position.y = 0.9 + Math.sin(time * 0.7 + m.phase) * 0.15;
      break;
    case "wreck":
      if (opts.dead) return;
      m.body.rotation.y += dt * 0.12;
      m.body.rotation.z = Math.sin(time * 0.5 + m.phase) * 0.15;
      m.body.position.y = 0.9 + Math.sin(time * 0.6 + m.phase) * 0.1;
      break;
    case "jelly":
      if (opts.dead) return;
      m.body.position.y = 1.4 + Math.sin(time * 1.8 + m.phase) * 0.25;
      m.body.scale.y = m.scale * (1 + Math.sin(time * 3.6 + m.phase) * 0.08);
      break;
    case "drone":
      if (opts.dead) return;
      m.body.position.y = 1.2 + Math.sin(time * 3 + m.phase) * 0.12;
      m.body.rotation.z = Math.sin(time * 2 + m.phase) * 0.1;
      break;
    case "robot":
      if (opts.dead) return;
      m.body.position.y = 0.1 + Math.sin(time * 2.4 + m.phase) * 0.06;
      break;
  }
}
