// Ocean models: sailing ships built from their actual deck shape (so crews stand on real planks),
// pirate ships, sharks, crabs, parrots, turtles, pirates, skeletons and the Kraken.

import * as THREE from "three";
import { GeometryBuilder, PRIMS } from "./builder";
import { buildHumanoid, eyes, newModel, part, shade, type Model } from "./models";
import type { MobModel } from "../../shared/game/mobs";
import { HELM, SAIL_HULLS, cannonSpots, deckHalfWidth, type SailHull, type SailHullId } from "../../shared/game/sailing";

/** Height of the deck above the water line. */
export const DECK_H = 1.0;

const SEA_MOBS = new Set<MobModel>(["pirate", "skeleton", "crab", "parrot", "turtle", "shark", "pirate_ship", "kraken", "bat"]);
export function isSeaModel(model: MobModel): boolean {
  return SEA_MOBS.has(model);
}

function sailMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide, flatShading: true, transparent: true, opacity: 1 });
}

/** Fade a ship's sails (so the crew can see past them from the deck). */
export function setSailOpacity(m: Model, opacity: number): void {
  for (const sail of m.parts.extra?.children ?? []) {
    const mat = (sail as THREE.Mesh).material as THREE.MeshStandardMaterial;
    mat.opacity += (opacity - mat.opacity) * 0.15;
    mat.depthWrite = mat.opacity > 0.95;
  }
}

/**
 * A sailing ship. The local frame matches the deck model: +z is the bow, +x is *port* in three's
 * right-handed space once the root is rotated like other models (rotation.y = PI/2 - f), so deck
 * coordinate lx (starboard) maps to -x here.
 */
export function buildSailShip(hull: SailHull, opts: { pirate?: boolean; scale?: number } = {}): Model {
  const m = newModel(opts.pirate ? "pirate_ship" : "sailship", DECK_H + 2, opts.scale ?? 1);
  const b = new GeometryBuilder();
  const L = hull.length;
  const hullColor = opts.pirate ? "#3b2f4a" : hull.hullColor;
  const trim = opts.pirate ? "#ff2e63" : hull.trim;
  const deckColor = opts.pirate ? "#6a5a5e" : "#d9b07a";
  // Hull: stacked slices following the deck outline (finer at the tapering bow), with a gentle
  // sheer toward bow and stern; rails angle along the taper so the outline stays smooth.
  const front = L / 2 - hull.bow;
  for (let z = -L / 2; z < L / 2 - 0.01; ) {
    const step = z >= front - 0.01 ? 0.25 : 0.5;
    const zc = z + step / 2;
    const hw = deckHalfWidth(hull, zc);
    const slope = Math.atan2(deckHalfWidth(hull, z) - deckHalfWidth(hull, Math.min(L / 2, z + step)), step);
    const sheer = Math.pow(Math.abs(zc) / (L / 2), 2) * 0.35;
    const len = step / Math.cos(slope) + 0.03;
    b.add(PRIMS.box, { x: 0, y: 0.15 + sheer / 2, z: zc, sx: hw * 2, sy: 1.5 + sheer, sz: step + 0.02, color: hullColor });
    b.add(PRIMS.box, { x: 0, y: -0.55, z: zc, sx: hw * 1.3, sy: 0.4, sz: step + 0.02, color: shade(hullColor, 0.75) });
    b.add(PRIMS.box, { x: 0, y: DECK_H - 0.04 + sheer, z: zc, sx: Math.max(0.1, hw * 2 - 0.3), sy: 0.08, sz: step, color: shade(deckColor, Math.floor(zc * 2) % 2 ? 1 : 0.94) });
    for (const s of [-1, 1]) {
      b.add(PRIMS.box, { x: s * (hw - 0.07), y: DECK_H + 0.25 + sheer, z: zc, sx: 0.14, sy: 0.5, sz: len, ry: s * slope, color: shade(hullColor, 1.15) });
      b.add(PRIMS.box, { x: s * (hw + 0.01), y: 0.55 + sheer, z: zc, sx: 0.05, sy: 0.12, sz: len, ry: s * slope, color: trim });
    }
    z += step;
  }
  // Stern rail and a cabin on bigger ships.
  b.add(PRIMS.box, { x: 0, y: DECK_H + 0.3, z: -L / 2 + 0.15, sx: hull.width - 0.1, sy: 0.6, sz: 0.2, color: shade(hullColor, 1.15) });
  if (L > 10) {
    b.add(PRIMS.box, { x: 0, y: DECK_H + 0.6, z: -L / 2 + 0.9, sx: hull.width - 0.6, sy: 1.2, sz: 1.2, color: shade(hullColor, 1.1) });
    for (const s of [-1, 1]) b.add(PRIMS.box, { x: s * (hull.width / 2 - 0.3), y: DECK_H + 0.7, z: -L / 2 + 0.9, sx: 0.04, sy: 0.35, sz: 0.4, color: "#ffd166", glow: -1.4 });
  }
  // Figurehead
  b.add(PRIMS.ico, { x: 0, y: DECK_H + 0.2, z: L / 2 + 0.15, sx: 0.22, sy: 0.3, sz: 0.3, color: opts.pirate ? "#f2ead8" : "#ffc94d" });
  // Masts, yards and crow's nest
  const mastH = 4 + L * 0.3;
  for (const mz of hull.masts) {
    b.add(PRIMS.cyl8, { x: 0, y: DECK_H + mastH / 2, z: mz, sx: 0.13, sy: mastH, sz: 0.13, color: "#7a5234" });
    b.add(PRIMS.cyl6, { x: 0, y: DECK_H + mastH * 0.85, z: mz, sx: 0.07, sy: hull.width * 1.1, sz: 0.07, rz: Math.PI / 2, color: "#7a5234" });
    b.add(PRIMS.cyl6, { x: 0, y: DECK_H + mastH * 0.32, z: mz, sx: 0.07, sy: hull.width * 1.2, sz: 0.07, rz: Math.PI / 2, color: "#7a5234" });
  }
  b.add(PRIMS.cyl8, { x: 0, y: DECK_H + mastH - 0.3, z: hull.masts[0], sx: 0.4, sy: 0.3, sz: 0.4, color: "#9a6b4f" });
  // Bowsprit
  b.add(PRIMS.cyl6, { x: 0, y: DECK_H + 0.6, z: L / 2 + 0.8, sx: 0.06, sy: 2, sz: 0.06, rx: 1.1, color: "#7a5234" });
  // Cannons poke out of the rails (deck-left = starboard = -x in model space).
  for (const c of cannonSpots(hull)) {
    const x = -c.lx + -c.side * 0.35;
    b.add(PRIMS.cyl8, { x, y: DECK_H + 0.25, z: c.ly, sx: 0.12, sy: 0.75, sz: 0.12, rz: Math.PI / 2, color: "#2b2238" });
    b.add(PRIMS.box, { x: -c.lx, y: DECK_H + 0.12, z: c.ly, sx: 0.4, sy: 0.18, sz: 0.4, color: "#7a5234" });
  }
  // The ship's wheel at the helm.
  const h = HELM(hull);
  b.add(PRIMS.box, { x: 0, y: DECK_H + 0.45, z: h.ly + 0.35, sx: 0.12, sy: 0.9, sz: 0.12, color: "#7a5234" });
  b.add(PRIMS.torus, { x: 0, y: DECK_H + 0.95, z: h.ly + 0.45, sx: 0.35, sy: 0.35, sz: 0.35, color: "#c9955f" });
  for (let i = 0; i < 4; i += 1) b.add(PRIMS.box, { x: 0, y: DECK_H + 0.95, z: h.ly + 0.45, sx: 0.04, sy: 0.85, sz: 0.04, rz: (i / 4) * Math.PI, color: "#9a6b4f" });
  // Stern lanterns
  for (const s of [-1, 1]) b.add(PRIMS.octa, { x: s * (hull.width / 2 - 0.2), y: DECK_H + 0.8, z: -L / 2 + 0.2, sx: 0.12, sy: 0.18, sz: 0.12, color: "#ffd166", glow: 1.4 });

  m.parts.torso = part(b, m.material);
  m.body.add(m.parts.torso);

  // Sails (one per mast): billowing panels we can scale with the sail level.
  const sails = new THREE.Group();
  const sailCol = opts.pirate ? "#2b2238" : hull.sailColor;
  for (const mz of hull.masts) {
    const geo = new THREE.PlaneGeometry(hull.width * 1.05, mastH * 0.5, 4, 4);
    const pos = geo.getAttribute("position");
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i) / (hull.width * 0.52);
      const y = pos.getY(i) / (mastH * 0.25);
      pos.setZ(i, (1 - x * x) * (1 - y * y * 0.5) * 0.7);
    }
    geo.computeVertexNormals();
    const sail = new THREE.Mesh(geo, sailMaterial(sailCol));
    sail.position.set(0, DECK_H + mastH * 0.58, mz + 0.1);
    sail.castShadow = true;
    sail.userData.base = sail.position.y;
    sails.add(sail);
    if (opts.pirate) {
      const skull = new THREE.Mesh(new THREE.CircleGeometry(0.45, 10), new THREE.MeshBasicMaterial({ color: 0xf2ead8, side: THREE.DoubleSide }));
      skull.position.set(0, 0, 0.72);
      sail.add(skull);
    }
  }
  m.body.add(sails);
  m.parts.extra = sails;
  // Flag on the main mast.
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), new THREE.MeshStandardMaterial({ color: opts.pirate ? 0x111111 : new THREE.Color(trim).getHex(), side: THREE.DoubleSide }));
  flag.position.set(0, DECK_H + mastH + 0.25, hull.masts[0] - 0.45);
  flag.rotation.y = Math.PI / 2;
  m.body.add(flag);
  m.parts.tail = flag;
  m.height = DECK_H + mastH + 0.6;
  return m;
}

export function buildPlayerShip(hull: SailHullId): Model {
  return buildSailShip(SAIL_HULLS[hull]);
}

/** Sea creatures and island folk. */
export function buildSeaMob(model: MobModel, color: string, accent: string, scale: number, boss: boolean): Model {
  if (model === "pirate_ship") return buildSailShip(SAIL_HULLS.sloop, { pirate: true, scale });
  if (model === "pirate" || model === "skeleton") {
    const skeleton = model === "skeleton";
    const m = buildHumanoid({
      look: { body: color, accent, skin: skeleton ? "#f2ead8" : "#f2c9a8", hair: skeleton ? "#f2ead8" : "#3b2f4a", hairStyle: skeleton ? 0 : 2 },
      hat: skeleton ? (boss ? "crown" : scale > 1.1 ? "helmet" : "none") : boss ? "tricorn" : "bandana",
      cls: "knight"
    });
    m.body.scale.setScalar(scale);
    m.height *= scale;
    m.scale = scale;
    if (m.parts.head && !skeleton) {
      // An eyepatch, of course.
      const patch = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.04), new THREE.MeshBasicMaterial({ color: 0x2b2238 }));
      patch.position.set(0.12, 1.33, 0.42);
      m.parts.head.add(patch);
    }
    return m;
  }
  const m = newModel(model, 1, scale);
  const b = new GeometryBuilder();
  switch (model) {
    case "crab": {
      b.add(PRIMS.ico1, { x: 0, y: 0.3, z: 0, sx: 0.5, sy: 0.25, sz: 0.38, color });
      eyes(b, 0, 0.62, 0.22, 0.12, 0.05);
      for (const s of [-1, 1]) {
        b.add(PRIMS.cyl6, { x: s * 0.12, y: 0.5, z: 0.22, sx: 0.025, sy: 0.25, sz: 0.025, color });
        b.add(PRIMS.ico, { x: s * 0.48, y: 0.38, z: 0.32, sx: 0.18, sy: 0.12, sz: 0.14, color: shade(color, 1.1) });
        b.add(PRIMS.cone4, { x: s * 0.56, y: 0.4, z: 0.46, sx: 0.06, sy: 0.18, sz: 0.06, rx: Math.PI / 2, color: shade(color, 1.1) });
        for (let i = 0; i < 3; i += 1) b.add(PRIMS.cyl6, { x: s * 0.42, y: 0.15, z: -0.15 + i * 0.15, sx: 0.03, sy: 0.3, sz: 0.03, rz: s * 1.0, color: shade(color, 0.85) });
      }
      m.height = 0.85 * scale;
      break;
    }
    case "parrot": {
      b.add(PRIMS.ico1, { x: 0, y: 0.45, z: 0, sx: 0.22, sy: 0.3, sz: 0.24, color });
      b.add(PRIMS.ico1, { x: 0, y: 0.8, z: 0.06, sx: 0.2, sy: 0.2, sz: 0.2, color: accent });
      b.add(PRIMS.cone4, { x: 0, y: 0.76, z: 0.26, sx: 0.06, sy: 0.14, sz: 0.06, rx: Math.PI / 2, color: "#ffd166" });
      eyes(b, 0, 0.84, 0.19, 0.08, 0.035);
      b.add(PRIMS.box, { x: 0, y: 0.25, z: -0.3, sx: 0.12, sy: 0.04, sz: 0.4, rx: 0.4, color: "#3f6fb5" });
      for (const s of [-1, 1]) b.add(PRIMS.box, { x: s * 0.24, y: 0.5, z: -0.02, sx: 0.06, sy: 0.32, sz: 0.24, color: shade(color, 0.85) });
      m.height = 1.1 * scale;
      break;
    }
    case "turtle": {
      b.add(PRIMS.ico1, { x: 0, y: 0.3, z: 0, sx: 0.55, sy: 0.3, sz: 0.62, color: accent });
      for (let i = 0; i < 5; i += 1) b.add(PRIMS.ico, { x: (i - 2) * 0.18, y: 0.48, z: (i % 2) * 0.15 - 0.05, sx: 0.12, sy: 0.04, sz: 0.12, color: shade(accent, 0.8) });
      b.add(PRIMS.ico1, { x: 0, y: 0.3, z: 0.65, sx: 0.2, sy: 0.18, sz: 0.22, color });
      eyes(b, 0, 0.36, 0.82, 0.08, 0.035);
      for (const [x, z] of [[-0.45, 0.35], [0.45, 0.35], [-0.4, -0.4], [0.4, -0.4]]) b.add(PRIMS.ico, { x, y: 0.15, z, sx: 0.2, sy: 0.06, sz: 0.12, color });
      m.height = 0.8 * scale;
      break;
    }
    case "shark": {
      // Mostly below the waves: a grinning head, a dorsal fin and a tail.
      b.add(PRIMS.ico1, { x: 0, y: -0.15, z: 0, sx: 0.45, sy: 0.35, sz: 1.3, color });
      b.add(PRIMS.ico1, { x: 0, y: -0.28, z: 0.2, sx: 0.4, sy: 0.18, sz: 1.0, color: accent });
      b.add(PRIMS.cone4, { x: 0, y: 0.45, z: -0.1, sx: 0.06, sy: 0.75, sz: 0.4, color });
      b.add(PRIMS.cone4, { x: 0, y: 0.05, z: -1.35, sx: 0.06, sy: 0.6, sz: 0.3, rx: -0.6, color });
      eyes(b, 0, 0.12, 1.0, 0.22, 0.05, true);
      for (let i = 0; i < 5; i += 1) b.add(PRIMS.cone4, { x: -0.16 + i * 0.08, y: -0.06, z: 1.18, sx: 0.025, sy: 0.07, sz: 0.02, rx: Math.PI, color: "#ffffff" });
      m.height = 1.2 * scale;
      break;
    }
    case "bat": {
      b.add(PRIMS.ico1, { x: 0, y: 0, z: 0, sx: 0.3, sy: 0.32, sz: 0.28, color });
      eyes(b, 0, 0.06, 0.24, 0.1, 0.045);
      for (const sd of [-1, 1]) b.add(PRIMS.cone4, { x: sd * 0.14, y: 0.33, z: 0, sx: 0.07, sy: 0.18, sz: 0.06, color });
      b.add(PRIMS.cone4, { x: 0, y: -0.12, z: 0.26, sx: 0.03, sy: 0.06, sz: 0.02, rx: Math.PI, color: "#ffffff" });
      m.height = 1.8 * scale;
      // Wings as their own parts so they can flap.
      for (const sd of [-1, 1]) {
        const wb = new GeometryBuilder();
        wb.add(PRIMS.box, { x: sd * 0.4, y: 0, z: 0, sx: 0.55, sy: 0.04, sz: 0.4, color: shade(color, 0.8) });
        wb.add(PRIMS.cone4, { x: sd * 0.7, y: 0, z: -0.12, sx: 0.12, sy: 0.3, sz: 0.04, rz: sd * Math.PI / 2, color: accent });
        const wing = part(wb, m.material, [sd * 0.15, 0, 0]);
        m.body.add(wing);
        if (sd < 0) m.parts.armL = wing;
        else m.parts.armR = wing;
      }
      break;
    }
    case "kraken": {
      b.add(PRIMS.ico1, { x: 0, y: 0.8, z: 0, sx: 1.1, sy: 1.3, sz: 1.0, color, jitter: 0.06 });
      for (let i = 0; i < 6; i += 1) b.add(PRIMS.ico, { x: Math.cos(i) * 0.6, y: 1.2 + (i % 3) * 0.3, z: Math.sin(i) * 0.5, sx: 0.12, sy: 0.12, sz: 0.06, color: accent });
      eyes(b, 0, 0.9, 0.85, 0.35, 0.16, true);
      m.height = 2.4 * scale;
      // Tentacles as separate parts so they can writhe.
      const tentacles = new THREE.Group();
      for (let i = 0; i < 6; i += 1) {
        const tb = new GeometryBuilder();
        for (let k = 0; k < 5; k += 1) tb.add(PRIMS.cyl8, { x: 0, y: k * 0.55 + 0.3, z: 0, sx: 0.28 - k * 0.04, sy: 0.6, sz: 0.28 - k * 0.04, color: k % 2 ? color : shade(color, 1.15) });
        tb.add(PRIMS.ico, { x: 0, y: 3, z: 0.1, sx: 0.12, sy: 0.12, sz: 0.12, color: accent });
        const t = new THREE.Mesh(tb.build(), m.material);
        const a = (i / 6) * Math.PI * 2;
        t.position.set(Math.cos(a) * 1.6, -0.3, Math.sin(a) * 1.6);
        t.userData.a = a;
        tentacles.add(t);
      }
      m.body.add(tentacles);
      m.parts.tail = tentacles;
      break;
    }
  }
  if (boss && model !== "kraken") m.height += 0.4;
  m.parts.torso = part(b, m.material);
  m.body.add(m.parts.torso);
  return m;
}

/** Bobbing ships, billowing sails, flapping flags, swimming sharks and writhing tentacles. */
export function animateSea(m: Model, o: { moving: boolean; dead: boolean; sail?: number; speed?: number }, dt: number, time: number): void {
  const p = m.parts;
  if (m.kind === "sailship" || m.kind === "pirate_ship") {
    m.body.position.y = Math.sin(time * 1.1 + m.phase) * 0.12 - (o.dead ? 1.5 : 0);
    m.body.rotation.z = Math.sin(time * 0.8 + m.phase) * 0.04;
    m.body.rotation.x = Math.sin(time * 0.6 + m.phase * 2) * 0.025;
    if (p.extra) {
      const level = o.sail ?? (o.moving ? 2 : 0);
      const want = level === 0 ? 0.15 : level === 1 ? 0.6 : 1;
      for (const sail of p.extra.children) {
        sail.scale.y += (want - sail.scale.y) * Math.min(1, dt * 3);
        sail.scale.z = 0.4 + sail.scale.y * (0.8 + Math.sin(time * 2 + m.phase) * 0.1);
        sail.position.y = (sail.userData.base as number) + (1 - sail.scale.y) * 1.2;
      }
    }
    if (p.tail) p.tail.rotation.y = Math.PI / 2 + Math.sin(time * 6 + m.phase) * 0.25;
    return;
  }
  switch (m.kind) {
    case "shark":
      if (o.dead) return;
      m.body.position.y = Math.sin(time * 2 + m.phase) * 0.08;
      m.body.rotation.y = Math.sin(time * (o.moving ? 6 : 2) + m.phase) * 0.12;
      break;
    case "kraken":
      if (o.dead) return;
      m.body.position.y = -0.6 + Math.sin(time * 0.8) * 0.3;
      if (p.tail) {
        for (const t of p.tail.children) {
          const a = t.userData.a as number;
          t.rotation.x = Math.sin(time * 1.5 + a * 2) * 0.5 + Math.sin(a) * 0.3;
          t.rotation.z = Math.cos(time * 1.2 + a * 3) * 0.5 - Math.cos(a) * 0.3;
        }
      }
      if (m.attackT > 0 && p.tail) for (const t of p.tail.children) t.rotation.x -= m.attackT * 2;
      break;
    case "bat":
      if (o.dead) return;
      m.body.position.y = 1.2 + Math.sin(time * 4 + m.phase) * 0.2;
      if (p.armL) p.armL.rotation.z = Math.sin(time * 18 + m.phase) * 0.7;
      if (p.armR) p.armR.rotation.z = -Math.sin(time * 18 + m.phase) * 0.7;
      break;
    case "parrot":
      if (o.dead) return;
      m.body.position.y = o.moving ? 0.4 + Math.abs(Math.sin(time * 10)) * 0.2 : 0;
      break;
    case "turtle":
      m.body.rotation.z = o.moving ? Math.sin(time * 4 + m.phase) * 0.05 : 0;
      break;
  }
}
