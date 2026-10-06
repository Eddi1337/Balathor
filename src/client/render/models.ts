// Cute low-poly models for players, NPCs, monsters and loot, plus their procedural animation.
// Each model is a handful of rigid parts (merged vertex-coloured geometry) sharing one toon
// material instance, so a character is ~7 draw calls and can flash white when hit.

import * as THREE from "three";
import type { ClassId } from "../../shared/game/classes";
import type { MobModel } from "../../shared/game/mobs";
import type { Appearance } from "../../shared/protocol";
import { RARITY_INFO, RARITIES, type Rarity } from "../../shared/game/items";
import { GeometryBuilder, PRIMS } from "./builder";

// ── materials ────────────────────────────────────────────────────────────────

let gradient: THREE.DataTexture | null = null;
function toonGradient(): THREE.DataTexture {
  if (gradient) return gradient;
  const data = new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}

export type ModelMaterial = THREE.MeshToonMaterial & {
  userData: { flash: { value: number }; fade: { value: number }; tint: { value: THREE.Vector4 } };
};

export function modelMaterial(): ModelMaterial {
  const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient(), transparent: false }) as ModelMaterial;
  const flash = { value: 0 };
  const fade = { value: 1 };
  const tint = { value: new THREE.Vector4(0, 0, 0, 0) };
  mat.userData = { flash, fade, tint };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFlash = flash;
    shader.uniforms.uFade = fade;
    shader.uniforms.uTint = tint;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float glow;\nvarying float vGlow;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGlow = glow;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vGlow;\nuniform float uFlash;\nuniform float uFade;\nuniform vec4 uTint;")
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * max(vGlow, 0.0) + vec3(uFlash) + uTint.rgb * uTint.a;"
      )
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.a *= uFade;");
  };
  mat.customProgramCacheKey = () => "balathor-toon";
  return mat;
}

// ── model structure ──────────────────────────────────────────────────────────

export interface Model {
  root: THREE.Group;
  /** Rotates with facing. */
  body: THREE.Group;
  parts: Partial<Record<"torso" | "head" | "armL" | "armR" | "legL" | "legR" | "weapon" | "tail" | "extra" | "pony" | "stars", THREE.Object3D>>;
  material: ModelMaterial;
  kind: "humanoid" | MobModel | "loot" | "furniture" | "sailship";
  /** Nameplate anchor height. */
  height: number;
  phase: number;
  attackT: number;
  hitT: number;
  scale: number;
  /** Seconds left in the current jump (0 = grounded). */
  jumpT: number;
}

export function part(b: GeometryBuilder, mat: THREE.Material, pivot?: [number, number, number]): THREE.Object3D {
  const mesh = new THREE.Mesh(b.build(), mat);
  mesh.castShadow = true;
  if (!pivot) return mesh;
  const g = new THREE.Group();
  g.position.set(...pivot);
  mesh.position.set(-pivot[0], -pivot[1], -pivot[2]);
  g.add(mesh);
  return g;
}

export function newModel(kind: Model["kind"], height: number, scale = 1): Model {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.scale.setScalar(scale);
  return { root, body, parts: {}, material: modelMaterial(), kind, height: height * scale, phase: Math.random() * 10, attackT: 0, hitT: 0, scale, jumpT: 0 };
}

export function shade(color: string, k: number): string {
  return "#" + new THREE.Color(color).multiplyScalar(k).getHexString();
}

// ── humanoids ────────────────────────────────────────────────────────────────

export type HatKind = "none" | "cap" | "hood" | "wizard" | "helmet" | "chef" | "bow" | "crown" | "tricorn" | "bandana";

export interface HumanoidOpts {
  look: Appearance;
  cls?: ClassId;
  hat?: HatKind;
  weaponRarity?: number;
  armorRarity?: number;
}

export function buildHumanoid(o: HumanoidOpts): Model {
  const m = newModel("humanoid", 2.05, 1);
  const { look } = o;
  const mat = m.material;
  const armorGlow = o.armorRarity && o.armorRarity >= 3 ? RARITY_INFO[RARITIES[o.armorRarity] as Rarity].color : null;

  // Torso: rounded tunic + belt + collar.
  const torso = new GeometryBuilder();
  torso.add(PRIMS.rbox, { x: 0, y: 0.68, z: 0, sx: 0.66, sy: 0.6, sz: 0.52, color: look.body });
  torso.add(PRIMS.rbox, { x: 0, y: 0.47, z: 0, sx: 0.7, sy: 0.2, sz: 0.56, color: look.body });
  torso.add(PRIMS.box, { x: 0, y: 0.6, z: 0, sx: 0.69, sy: 0.08, sz: 0.55, color: look.accent });
  torso.add(PRIMS.box, { x: 0, y: 0.6, z: 0.28, sx: 0.13, sy: 0.11, sz: 0.04, color: "#ffd166" });
  if (armorGlow) torso.add(PRIMS.octa, { x: 0, y: 0.86, z: 0.27, sx: 0.07, sy: 0.09, sz: 0.04, color: armorGlow, glow: 1.2 });
  m.parts.torso = part(torso, mat);
  m.body.add(m.parts.torso);

  // Head: big round head, eyes with highlights, blush, little smile.
  const head = new GeometryBuilder();
  head.add(PRIMS.rbox, { x: 0, y: 1.32, z: 0, sx: 0.8, sy: 0.74, sz: 0.74, color: look.skin });
  head.add(PRIMS.rbox, { x: -0.15, y: 1.3, z: 0.37, sx: 0.11, sy: 0.15, sz: 0.04, color: "#2b2238" });
  head.add(PRIMS.rbox, { x: 0.15, y: 1.3, z: 0.37, sx: 0.11, sy: 0.15, sz: 0.04, color: "#2b2238" });
  head.add(PRIMS.box, { x: -0.13, y: 1.34, z: 0.395, sx: 0.04, sy: 0.04, sz: 0.01, color: "#ffffff", glow: 0.5 });
  head.add(PRIMS.box, { x: 0.17, y: 1.34, z: 0.395, sx: 0.04, sy: 0.04, sz: 0.01, color: "#ffffff", glow: 0.5 });
  head.add(PRIMS.rbox, { x: -0.27, y: 1.19, z: 0.36, sx: 0.13, sy: 0.07, sz: 0.03, color: "#ff9fb4" });
  head.add(PRIMS.rbox, { x: 0.27, y: 1.19, z: 0.36, sx: 0.13, sy: 0.07, sz: 0.03, color: "#ff9fb4" });
  head.add(PRIMS.box, { x: 0, y: 1.16, z: 0.375, sx: 0.08, sy: 0.018, sz: 0.01, color: "#8a4a5a" });
  addHair(head, look);
  addHat(head, o.hat ?? classHat(o.cls), look, o.cls);
  m.parts.head = part(head, mat, [0, 1.0, 0]);
  m.body.add(m.parts.head);

  // Arms (pivot at shoulder) with little hands.
  for (const side of [-1, 1] as const) {
    const arm = new GeometryBuilder();
    arm.add(PRIMS.rbox, { x: side * 0.41, y: 0.72, z: 0, sx: 0.17, sy: 0.34, sz: 0.17, rz: side * 0.12, color: look.body });
    arm.add(PRIMS.rbox, { x: side * 0.43, y: 0.53, z: 0, sx: 0.16, sy: 0.15, sz: 0.16, color: look.skin });
    const p = part(arm, mat, [side * 0.37, 0.88, 0]);
    if (side < 0) m.parts.armL = p;
    else m.parts.armR = p;
    m.body.add(p);
  }
  // Legs + boots.
  for (const side of [-1, 1] as const) {
    const leg = new GeometryBuilder();
    leg.add(PRIMS.rbox, { x: side * 0.15, y: 0.26, z: 0, sx: 0.18, sy: 0.3, sz: 0.18, color: shade(look.body, 0.7) });
    leg.add(PRIMS.rbox, { x: side * 0.15, y: 0.07, z: 0.04, sx: 0.2, sy: 0.14, sz: 0.27, color: "#7a5234" });
    const p = part(leg, mat, [side * 0.14, 0.4, 0]);
    if (side < 0) m.parts.legL = p;
    else m.parts.legR = p;
    m.body.add(p);
  }

  // Class gear, held in the right hand (attached to the right arm so it swings).
  if (o.cls) {
    const w = new GeometryBuilder();
    const rarity = o.weaponRarity ?? 0;
    const shine = rarity >= 2 ? RARITY_INFO[RARITIES[rarity] as Rarity].color : null;
    if (o.cls === "ranger") {
      for (let i = 0; i < 7; i += 1) {
        const a = -Math.PI / 2 + (i / 6) * Math.PI;
        w.add(PRIMS.cyl6, { x: 0.52 + Math.cos(a) * 0.08, y: 0.55 + Math.sin(a) * 0.36, z: 0.12, sx: 0.025, sy: 0.14, sz: 0.025, rz: a, color: "#9a6b4f" });
      }
      w.add(PRIMS.cyl6, { x: 0.47, y: 0.55, z: 0.12, sx: 0.006, sy: 0.72, sz: 0.006, color: "#fff4e6" });
      if (shine) w.add(PRIMS.octa, { x: 0.6, y: 0.55, z: 0.12, sx: 0.05, sy: 0.06, sz: 0.05, color: shine, glow: 1.5 });
      // Quiver on the back (part of torso visually but simplest here).
      w.add(PRIMS.cyl8, { x: 0.1 - 0.4, y: 0.85, z: -0.3, sx: 0.09, sy: 0.4, sz: 0.09, rz: 0.4, color: "#7a5234" });
      w.add(PRIMS.cone4, { x: 0.18 - 0.4, y: 1.08, z: -0.3, sx: 0.04, sy: 0.12, sz: 0.04, color: "#ff8fb1" });
    } else if (o.cls === "mage") {
      w.add(PRIMS.cyl6, { x: 0.47, y: 0.75, z: 0.12, sx: 0.035, sy: 1.25, sz: 0.035, color: "#8a5a3a" });
      w.add(PRIMS.torus, { x: 0.47, y: 1.4, z: 0.12, sx: 0.11, sy: 0.11, sz: 0.11, color: "#ffd166" });
      w.add(PRIMS.ico1, { x: 0.47, y: 1.42, z: 0.12, sx: 0.1, sy: 0.1, sz: 0.1, color: shine ?? "#8fe3ff", glow: 2.2 });
    } else {
      w.add(PRIMS.box, { x: 0.47, y: 0.92, z: 0.16, sx: 0.06, sy: 0.62, sz: 0.02, color: "#e8edf2" });
      w.add(PRIMS.cone4, { x: 0.47, y: 1.27, z: 0.16, sx: 0.045, sy: 0.12, sz: 0.015, ry: Math.PI / 4, color: "#e8edf2" });
      w.add(PRIMS.box, { x: 0.47, y: 0.6, z: 0.16, sx: 0.22, sy: 0.05, sz: 0.06, color: "#ffd166" });
      w.add(PRIMS.cyl6, { x: 0.47, y: 0.5, z: 0.16, sx: 0.03, sy: 0.16, sz: 0.03, color: "#7a5234" });
      if (shine) w.add(PRIMS.box, { x: 0.47, y: 0.95, z: 0.175, sx: 0.02, sy: 0.5, sz: 0.01, color: shine, glow: 1.6 });
      // Shield on the left arm.
      const sh = new GeometryBuilder();
      sh.add(PRIMS.cyl12, { x: -0.5, y: 0.66, z: 0.08, sx: 0.26, sy: 0.05, sz: 0.3, rz: Math.PI / 2, color: o.look.accent });
      sh.add(PRIMS.cyl12, { x: -0.53, y: 0.66, z: 0.08, sx: 0.14, sy: 0.04, sz: 0.16, rz: Math.PI / 2, color: "#ffd166" });
      const shield = part(sh, mat);
      // Geometry is in model space; cancel the shoulder pivot of the arm it hangs from.
      shield.position.set(0.37, -0.88, 0);
      m.parts.armL?.add(shield);
    }
    m.parts.weapon = part(w, mat);
    m.parts.weapon.position.set(-0.37, -0.88, 0);
    m.parts.armR?.add(m.parts.weapon);
  }
  return m;
}

function classHat(cls?: ClassId): HatKind {
  return cls === "ranger" ? "hood" : cls === "mage" ? "wizard" : cls === "knight" ? "helmet" : "none";
}

function addHair(b: GeometryBuilder, look: Appearance): void {
  const c = look.hair;
  b.add(PRIMS.rbox, { x: 0, y: 1.56, z: -0.05, sx: 0.86, sy: 0.36, sz: 0.8, color: c });
  b.add(PRIMS.rbox, { x: 0, y: 1.32, z: -0.33, sx: 0.84, sy: 0.6, sz: 0.2, color: c });
  b.add(PRIMS.rbox, { x: -0.12, y: 1.5, z: 0.33, sx: 0.42, sy: 0.16, sz: 0.14, rz: 0.15, color: c });
  switch (look.hairStyle) {
    case 1: // side tufts
      b.add(PRIMS.ico, { x: -0.36, y: 1.28, z: 0.08, sx: 0.1, sy: 0.18, sz: 0.12, color: c });
      b.add(PRIMS.ico, { x: 0.36, y: 1.28, z: 0.08, sx: 0.1, sy: 0.18, sz: 0.12, color: c });
      break;
    case 2: // ponytail
      b.add(PRIMS.ico1, { x: 0, y: 1.4, z: -0.42, sx: 0.14, sy: 0.14, sz: 0.14, color: c });
      b.add(PRIMS.ico, { x: 0, y: 1.2, z: -0.5, sx: 0.11, sy: 0.22, sz: 0.11, color: c });
      break;
    case 3: // spiky
      for (let i = 0; i < 5; i += 1) b.add(PRIMS.cone4, { x: (i - 2) * 0.13, y: 1.72, z: -0.05, sx: 0.08, sy: 0.22, sz: 0.08, rz: (i - 2) * -0.3, color: c });
      break;
    case 4: // buns
      b.add(PRIMS.ico1, { x: -0.27, y: 1.68, z: -0.05, sx: 0.13, sy: 0.13, sz: 0.13, color: c });
      b.add(PRIMS.ico1, { x: 0.27, y: 1.68, z: -0.05, sx: 0.13, sy: 0.13, sz: 0.13, color: c });
      break;
    default:
      break;
  }
}

function addHat(b: GeometryBuilder, hat: HatKind, look: Appearance, cls?: ClassId): void {
  const tint = cls ? look.accent : look.body;
  switch (hat) {
    case "hood":
      b.add(PRIMS.rbox, { x: 0, y: 1.45, z: -0.07, sx: 0.92, sy: 0.82, sz: 0.86, color: look.body });
      b.add(PRIMS.cone6, { x: 0, y: 1.5, z: -0.45, sx: 0.16, sy: 0.4, sz: 0.16, rx: -1.2, color: look.body });
      b.add(PRIMS.cone4, { x: 0.18, y: 1.78, z: 0, sx: 0.03, sy: 0.25, sz: 0.06, rz: -0.6, color: "#ff8fb1" });
      break;
    case "wizard":
      b.add(PRIMS.cyl12, { x: 0, y: 1.62, z: 0, sx: 0.55, sy: 0.04, sz: 0.55, color: look.body });
      b.add(PRIMS.cone8, { x: 0, y: 1.98, z: -0.04, sx: 0.32, sy: 0.75, sz: 0.32, rx: -0.15, color: look.body });
      b.add(PRIMS.cyl12, { x: 0, y: 1.68, z: 0, sx: 0.33, sy: 0.07, sz: 0.33, color: tint });
      b.add(PRIMS.octa, { x: 0.05, y: 1.95, z: 0.25, sx: 0.06, sy: 0.06, sz: 0.02, color: "#ffd166", glow: 1 });
      break;
    case "helmet":
      b.add(PRIMS.rbox, { x: 0, y: 1.52, z: -0.02, sx: 0.88, sy: 0.6, sz: 0.84, color: "#d9dde6" });
      b.add(PRIMS.box, { x: 0, y: 1.42, z: 0.37, sx: 0.08, sy: 0.2, sz: 0.04, color: "#c3c8d2" });
      b.add(PRIMS.ico, { x: 0, y: 1.82, z: -0.08, sx: 0.08, sy: 0.22, sz: 0.25, color: tint === look.body ? "#ff6f8e" : tint });
      break;
    case "cap":
      b.add(PRIMS.rbox, { x: 0, y: 1.62, z: 0, sx: 0.84, sy: 0.3, sz: 0.8, color: tint });
      b.add(PRIMS.cyl12, { x: 0, y: 1.52, z: 0.25, sx: 0.28, sy: 0.03, sz: 0.2, color: tint });
      break;
    case "chef":
      b.add(PRIMS.cyl12, { x: 0, y: 1.72, z: 0, sx: 0.28, sy: 0.3, sz: 0.28, color: "#ffffff" });
      b.add(PRIMS.ico1, { x: 0, y: 1.9, z: 0, sx: 0.36, sy: 0.18, sz: 0.36, color: "#ffffff" });
      break;
    case "crown":
      b.add(PRIMS.cyl8, { x: 0, y: 1.78, z: 0, sx: 0.36, sy: 0.16, sz: 0.36, color: "#ffc94d", glow: 0.35 });
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        b.add(PRIMS.cone4, { x: Math.cos(a) * 0.3, y: 1.95, z: Math.sin(a) * 0.3, sx: 0.07, sy: 0.2, sz: 0.07, color: "#ffc94d", glow: 0.35 });
      }
      b.add(PRIMS.octa, { x: 0, y: 1.8, z: 0.36, sx: 0.07, sy: 0.08, sz: 0.04, color: "#ff5c8a", glow: 1.2 });
      break;
    case "tricorn": {
      // Pirate captain's hat: a dark three-cornered brim with a gold trim and a feather.
      b.add(PRIMS.cyl8, { x: 0, y: 1.66, z: 0, sx: 0.44, sy: 0.22, sz: 0.44, color: "#2b2238" });
      for (let i = 0; i < 3; i += 1) {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
        b.add(PRIMS.box, { x: Math.cos(a) * 0.32, y: 1.62, z: Math.sin(a) * 0.32, sx: 0.5, sy: 0.12, sz: 0.2, ry: -a + Math.PI / 2, rx: 0.3, color: "#2b2238" });
      }
      b.add(PRIMS.cyl8, { x: 0, y: 1.58, z: 0, sx: 0.46, sy: 0.04, sz: 0.46, color: "#ffc94d" });
      b.add(PRIMS.cone4, { x: -0.2, y: 1.9, z: -0.1, sx: 0.05, sy: 0.4, sz: 0.1, rz: 0.5, color: "#ff5c6a" });
      break;
    }
    case "bandana":
      b.add(PRIMS.rbox, { x: 0, y: 1.58, z: -0.02, sx: 0.86, sy: 0.28, sz: 0.82, color: tint === look.body ? "#ff5c6a" : tint });
      b.add(PRIMS.cone4, { x: 0, y: 1.5, z: -0.48, sx: 0.12, sy: 0.25, sz: 0.06, rx: 2.2, color: tint === look.body ? "#ff5c6a" : tint });
      for (let i = 0; i < 4; i += 1) b.add(PRIMS.ico, { x: -0.3 + i * 0.2, y: 1.6, z: 0.4, sx: 0.035, sy: 0.035, sz: 0.01, color: "#ffffff" });
      break;
    case "bow":
      b.add(PRIMS.cone4, { x: -0.12, y: 1.72, z: 0.05, sx: 0.12, sy: 0.18, sz: 0.06, rz: Math.PI / 2, color: "#ff8fb1" });
      b.add(PRIMS.cone4, { x: 0.12, y: 1.72, z: 0.05, sx: 0.12, sy: 0.18, sz: 0.06, rz: -Math.PI / 2, color: "#ff8fb1" });
      b.add(PRIMS.ico, { x: 0, y: 1.72, z: 0.05, sx: 0.06, sy: 0.06, sz: 0.06, color: "#ff6f8e" });
      break;
    default:
      break;
  }
}

// ── monsters ─────────────────────────────────────────────────────────────────

export function eyes(b: GeometryBuilder, x: number, y: number, z: number, spread: number, size: number, angry = false): void {
  for (const s of [-1, 1]) {
    b.add(PRIMS.ico, { x: x + s * spread, y, z, sx: size * 0.8, sy: size, sz: size * 0.5, color: "#2b2238" });
    b.add(PRIMS.ico, { x: x + s * spread + size * 0.25, y: y + size * 0.35, z: z + size * 0.35, sx: size * 0.3, sy: size * 0.3, sz: size * 0.2, color: "#ffffff", glow: 0.6 });
    if (angry) b.add(PRIMS.box, { x: x + s * spread, y: y + size * 1.3, z: z + 0.01, sx: size * 1.6, sy: size * 0.25, sz: size * 0.3, rz: s * 0.4, color: "#2b2238" });
  }
}

function crown(b: GeometryBuilder, y: number): void {
  b.add(PRIMS.cyl8, { x: 0, y, z: 0, sx: 0.22, sy: 0.1, sz: 0.22, color: "#ffc94d", glow: 0.4 });
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    b.add(PRIMS.cone4, { x: Math.cos(a) * 0.17, y: y + 0.1, z: Math.sin(a) * 0.17, sx: 0.06, sy: 0.14, sz: 0.06, color: "#ffc94d", glow: 0.4 });
  }
  b.add(PRIMS.octa, { x: 0, y: y + 0.03, z: 0.22, sx: 0.04, sy: 0.05, sz: 0.03, color: "#ff5c8a", glow: 1.2 });
}

export function buildMob(model: MobModel, color: string, accent: string, scale: number, boss: boolean): Model {
  const m = newModel(model, 1, scale);
  const mat = m.material;
  const dark = shade(color, 0.75);
  const b = new GeometryBuilder();
  switch (model) {
    case "slime": {
      b.add(PRIMS.ico1, { x: 0, y: 0.38, z: 0, sx: 0.5, sy: 0.4, sz: 0.5, color, glow: 0.08 });
      b.add(PRIMS.ico, { x: -0.18, y: 0.58, z: 0.22, sx: 0.12, sy: 0.08, sz: 0.06, color: accent, glow: 0.4 });
      eyes(b, 0, 0.42, 0.42, 0.15, 0.065);
      b.add(PRIMS.ico, { x: 0, y: 0.3, z: 0.46, sx: 0.06, sy: 0.03, sz: 0.02, color: "#5a3a4a" });
      if (boss) crown(b, 0.82);
      m.height = 1.0 * scale;
      break;
    }
    case "bunny": {
      b.add(PRIMS.ico1, { x: 0, y: 0.3, z: -0.05, sx: 0.32, sy: 0.28, sz: 0.36, color });
      b.add(PRIMS.ico1, { x: 0, y: 0.55, z: 0.22, sx: 0.24, sy: 0.22, sz: 0.22, color });
      eyes(b, 0, 0.58, 0.42, 0.09, 0.04);
      b.add(PRIMS.ico, { x: 0, y: 0.52, z: 0.44, sx: 0.03, sy: 0.025, sz: 0.02, color: "#ff8fb1" });
      b.add(PRIMS.ico, { x: 0, y: 0.32, z: -0.42, sx: 0.1, sy: 0.1, sz: 0.1, color: "#ffffff" });
      for (const s of [-1, 1]) {
        b.add(PRIMS.ico, { x: s * 0.09, y: 0.88, z: 0.18, sx: 0.06, sy: 0.24, sz: 0.04, rz: s * -0.2, color });
        b.add(PRIMS.ico, { x: s * 0.09, y: 0.88, z: 0.205, sx: 0.035, sy: 0.17, sz: 0.02, rz: s * -0.2, color: accent });
      }
      m.height = 1.1 * scale;
      break;
    }
    case "boar":
    case "wolf": {
      const wolf = model === "wolf";
      b.add(PRIMS.ico1, { x: 0, y: 0.55, z: 0, sx: 0.36, sy: 0.32, sz: 0.55, color });
      b.add(PRIMS.ico1, { x: 0, y: 0.68, z: 0.5, sx: 0.28, sy: 0.26, sz: 0.28, color });
      b.add(wolf ? PRIMS.cone6 : PRIMS.cyl8, { x: 0, y: 0.6, z: 0.75, sx: wolf ? 0.12 : 0.13, sy: wolf ? 0.3 : 0.14, sz: 0.12, rx: Math.PI / 2, color: wolf ? accent : "#f2b5a5" });
      b.add(PRIMS.ico, { x: 0, y: 0.62, z: wolf ? 0.9 : 0.83, sx: 0.04, sy: 0.035, sz: 0.03, color: "#2b2238" });
      eyes(b, 0, 0.76, 0.7, 0.1, 0.04, true);
      for (const s of [-1, 1]) b.add(PRIMS.cone4, { x: s * 0.15, y: 0.95, z: 0.45, sx: 0.07, sy: wolf ? 0.2 : 0.12, sz: 0.05, rz: s * -0.3, color: dark });
      if (!wolf) for (const s of [-1, 1]) b.add(PRIMS.cone4, { x: s * 0.1, y: 0.56, z: 0.8, sx: 0.025, sy: 0.12, sz: 0.025, rx: -0.6, color: "#fff4e6" });
      if (wolf) b.add(PRIMS.ico, { x: 0, y: 0.5, z: 0.2, sx: 0.22, sy: 0.2, sz: 0.2, color: accent });
      if (boss) crown(b, 1.0);
      const tail = new GeometryBuilder();
      tail.add(wolf ? PRIMS.ico : PRIMS.cyl6, { x: 0, y: 0.68, z: -0.62, sx: wolf ? 0.1 : 0.03, sy: wolf ? 0.1 : 0.15, sz: wolf ? 0.28 : 0.03, rx: 0.5, color: wolf ? accent : dark });
      m.parts.tail = part(tail, mat, [0, 0.62, -0.5]);
      m.body.add(m.parts.tail);
      addQuadLegs(m, mat, color, 0.25, 0.38);
      m.height = 1.3 * scale;
      break;
    }
    case "toad": {
      b.add(PRIMS.ico1, { x: 0, y: 0.35, z: 0, sx: 0.55, sy: 0.33, sz: 0.48, color });
      b.add(PRIMS.ico1, { x: 0, y: 0.28, z: 0.1, sx: 0.42, sy: 0.22, sz: 0.4, color: accent });
      for (const s of [-1, 1]) {
        b.add(PRIMS.ico1, { x: s * 0.22, y: 0.66, z: 0.22, sx: 0.14, sy: 0.14, sz: 0.14, color });
        b.add(PRIMS.ico, { x: s * 0.22, y: 0.68, z: 0.33, sx: 0.07, sy: 0.08, sz: 0.04, color: "#2b2238" });
        b.add(PRIMS.ico, { x: s * 0.24, y: 0.71, z: 0.36, sx: 0.025, sy: 0.025, sz: 0.01, color: "#ffffff", glow: 0.6 });
        b.add(PRIMS.ico, { x: s * 0.42, y: 0.12, z: 0.2, sx: 0.16, sy: 0.08, sz: 0.2, color: dark });
      }
      b.add(PRIMS.box, { x: 0, y: 0.38, z: 0.47, sx: 0.32, sy: 0.02, sz: 0.02, color: "#3a2a3a" });
      if (boss) crown(b, 0.82);
      m.height = 1.0 * scale;
      break;
    }
    case "scorpion": {
      for (let i = 0; i < 3; i += 1) b.add(PRIMS.ico1, { x: 0, y: 0.32, z: 0.25 - i * 0.28, sx: 0.32 - i * 0.04, sy: 0.2, sz: 0.2, color });
      eyes(b, 0, 0.45, 0.42, 0.08, 0.045, true);
      for (const s of [-1, 1]) {
        b.add(PRIMS.cyl6, { x: s * 0.32, y: 0.3, z: 0.5, sx: 0.05, sy: 0.3, sz: 0.05, rx: Math.PI / 2, rz: s * 0.4, color: dark });
        b.add(PRIMS.cone4, { x: s * 0.42, y: 0.3, z: 0.72, sx: 0.12, sy: 0.18, sz: 0.06, rx: Math.PI / 2, color });
        for (let l = 0; l < 3; l += 1) b.add(PRIMS.cyl6, { x: s * 0.36, y: 0.16, z: 0.15 - l * 0.22, sx: 0.025, sy: 0.3, sz: 0.025, rz: s * 1.1, color: dark });
      }
      const tail = new GeometryBuilder();
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 4) * Math.PI * 0.85;
        tail.add(PRIMS.ico, { x: 0, y: 0.35 + Math.sin(a) * 0.55, z: -0.45 - Math.cos(a) * 0.1 + Math.sin(a) * 0.1 - i * 0.04, sx: 0.12 - i * 0.012, sy: 0.12 - i * 0.012, sz: 0.12 - i * 0.012, color });
      }
      tail.add(PRIMS.cone4, { x: 0, y: 0.85, z: -0.18, sx: 0.05, sy: 0.18, sz: 0.05, rx: 2.4, color: accent });
      m.parts.tail = part(tail, mat, [0, 0.35, -0.4]);
      m.body.add(m.parts.tail);
      if (boss) crown(b, 0.6);
      m.height = 1.1 * scale;
      break;
    }
    case "wisp": {
      b.add(PRIMS.ico1, { x: 0, y: 0.9, z: 0, sx: 0.3, sy: 0.34, sz: 0.3, color, glow: 1.6 });
      b.add(PRIMS.cone6, { x: 0, y: 0.55, z: -0.05, sx: 0.2, sy: 0.45, sz: 0.2, rx: Math.PI + 0.3, color, glow: 1.2 });
      eyes(b, 0, 0.92, 0.27, 0.09, 0.045);
      const sparkle = new GeometryBuilder();
      for (let i = 0; i < 3; i += 1) {
        const a = (i / 3) * Math.PI * 2;
        sparkle.add(PRIMS.octa, { x: Math.cos(a) * 0.5, y: 0.9, z: Math.sin(a) * 0.5, sx: 0.06, sy: 0.06, sz: 0.06, color: accent, glow: 2 });
      }
      m.parts.extra = part(sparkle, mat, [0, 0.9, 0]);
      m.body.add(m.parts.extra);
      m.height = 1.5 * scale;
      break;
    }
    case "imp": {
      b.add(PRIMS.ico1, { x: 0, y: 0.6, z: 0, sx: 0.3, sy: 0.32, sz: 0.28, color });
      b.add(PRIMS.ico1, { x: 0, y: 1.0, z: 0.03, sx: 0.28, sy: 0.26, sz: 0.26, color });
      eyes(b, 0, 1.02, 0.25, 0.1, 0.045, true);
      for (const s of [-1, 1]) {
        b.add(PRIMS.cone4, { x: s * 0.16, y: 1.3, z: 0, sx: 0.05, sy: 0.18, sz: 0.05, rz: s * -0.5, color: accent });
        b.add(PRIMS.cone4, { x: s * 0.42, y: 0.8, z: -0.18, sx: 0.28, sy: 0.04, sz: 0.2, rz: s * -0.5, ry: s * 0.4, color: dark });
        b.add(PRIMS.cyl6, { x: s * 0.12, y: 0.25, z: 0, sx: 0.06, sy: 0.3, sz: 0.06, color: dark });
      }
      b.add(PRIMS.cone4, { x: 0, y: 0.5, z: -0.4, sx: 0.04, sy: 0.4, sz: 0.04, rx: -1.1, color: dark });
      b.add(PRIMS.ico, { x: 0, y: 1.0, z: 0.28, sx: 0.06, sy: 0.03, sz: 0.02, color: "#ffd166", glow: 1.2 });
      m.height = 1.5 * scale;
      break;
    }
    case "golem": {
      b.add(PRIMS.dodeca, { x: 0, y: 0.7, z: 0, sx: 0.5, sy: 0.48, sz: 0.42, color, jitter: 0.1 });
      b.add(PRIMS.dodeca, { x: 0, y: 1.25, z: 0.05, sx: 0.32, sy: 0.28, sz: 0.3, color, jitter: 0.1 });
      for (const s of [-1, 1]) {
        b.add(PRIMS.ico, { x: s * 0.11, y: 1.28, z: 0.3, sx: 0.06, sy: 0.04, sz: 0.03, color: accent, glow: 2 });
        b.add(PRIMS.dodeca, { x: s * 0.62, y: 0.6, z: 0.05, sx: 0.2, sy: 0.35, sz: 0.2, color: dark, jitter: 0.1 });
        b.add(PRIMS.dodeca, { x: s * 0.22, y: 0.2, z: 0, sx: 0.18, sy: 0.22, sz: 0.2, color: dark });
      }
      b.add(PRIMS.octa, { x: 0.15, y: 1.0, z: 0.38, sx: 0.07, sy: 0.12, sz: 0.05, color: accent, glow: 1.8 });
      b.add(PRIMS.ico, { x: -0.2, y: 1.5, z: 0, sx: 0.14, sy: 0.05, sz: 0.12, color: "#7fc25a" });
      if (boss) crown(b, 1.55);
      m.height = 1.8 * scale;
      break;
    }
    case "yeti": {
      b.add(PRIMS.ico1, { x: 0, y: 0.7, z: 0, sx: 0.55, sy: 0.6, sz: 0.48, color, jitter: 0.06 });
      b.add(PRIMS.ico1, { x: 0, y: 0.82, z: 0.32, sx: 0.32, sy: 0.3, sz: 0.2, color: accent });
      eyes(b, 0, 0.92, 0.5, 0.11, 0.05);
      b.add(PRIMS.box, { x: 0, y: 0.72, z: 0.52, sx: 0.12, sy: 0.04, sz: 0.02, color: "#ffffff" });
      for (const s of [-1, 1]) {
        b.add(PRIMS.ico1, { x: s * 0.58, y: 0.6, z: 0.1, sx: 0.17, sy: 0.35, sz: 0.17, color, jitter: 0.06 });
        b.add(PRIMS.ico, { x: s * 0.22, y: 0.12, z: 0.05, sx: 0.18, sy: 0.12, sz: 0.24, color });
      }
      if (boss) crown(b, 1.38);
      m.height = 1.7 * scale;
      break;
    }
    case "mushroom": {
      b.add(PRIMS.cyl8, { x: 0, y: 0.3, z: 0, sx: 0.2, sy: 0.6, sz: 0.2, color: accent });
      b.add(PRIMS.ico1, { x: 0, y: 0.72, z: 0, sx: 0.48, sy: 0.3, sz: 0.48, color });
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        b.add(PRIMS.ico, { x: Math.cos(a) * 0.3, y: 0.86, z: Math.sin(a) * 0.3, sx: 0.07, sy: 0.04, sz: 0.07, color: "#ffffff" });
      }
      eyes(b, 0, 0.42, 0.19, 0.07, 0.04, true);
      for (const s of [-1, 1]) b.add(PRIMS.ico, { x: s * 0.1, y: 0.04, z: 0.04, sx: 0.09, sy: 0.05, sz: 0.12, color: shade(accent, 0.8) });
      m.height = 1.15 * scale;
      break;
    }
  }
  m.parts.torso = part(b, mat);
  m.body.add(m.parts.torso);
  return m;
}

function addQuadLegs(m: Model, mat: THREE.Material, color: string, sx: number, sz: number): void {
  const legs: THREE.Object3D[] = [];
  for (const [x, z] of [[-sx, sz], [sx, sz], [-sx, -sz], [sx, -sz]]) {
    const b = new GeometryBuilder();
    b.add(PRIMS.cyl6, { x, y: 0.18, z, sx: 0.07, sy: 0.36, sz: 0.07, color: shade(color, 0.8) });
    const p = part(b, mat, [x, 0.36, z]);
    m.body.add(p);
    legs.push(p);
  }
  m.parts.legL = legs[0];
  m.parts.legR = legs[1];
  m.parts.armL = legs[3];
  m.parts.armR = legs[2];
}

// ── loot ─────────────────────────────────────────────────────────────────────

export function buildLoot(gold: number, rarity: string | null): Model {
  const m = newModel("loot", 0.9, 1);
  const b = new GeometryBuilder();
  if (!rarity) {
    const n = Math.min(5, 1 + Math.floor(Math.log2(1 + gold)));
    for (let i = 0; i < n; i += 1) b.add(PRIMS.cyl12, { x: (i % 2) * 0.06, y: 0.05 + i * 0.07, z: 0, sx: 0.16, sy: 0.05, sz: 0.16, color: "#ffc94d", glow: 0.35 });
  } else {
    const col = RARITY_INFO[rarity as Rarity]?.color ?? "#ffffff";
    b.add(PRIMS.box, { x: 0, y: 0.2, z: 0, sx: 0.42, sy: 0.3, sz: 0.32, color: "#c9955f" });
    b.add(PRIMS.box, { x: 0, y: 0.38, z: 0, sx: 0.46, sy: 0.08, sz: 0.36, color: col, glow: 0.4 });
    b.add(PRIMS.box, { x: 0, y: 0.2, z: 0.165, sx: 0.08, sy: 0.12, sz: 0.02, color: "#ffd166", glow: 0.4 });
    const rank = RARITIES.indexOf(rarity as Rarity);
    if (rank >= 2) {
      // A soft pillar of light for rare-and-better drops.
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.3, 4, 10, 1, true),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
      );
      pillar.position.y = 2;
      m.root.add(pillar);
    }
  }
  m.parts.torso = part(b, m.material);
  m.body.add(m.parts.torso);
  return m;
}

// ── mount & status props ─────────────────────────────────────────────────────

/** A fluffy pastel pony that the humanoid sits on (added under the model's root). */
export function attachPony(m: Model, coat = "#fff1e6", mane = "#ff9fc4"): void {
  if (m.parts.pony) {
    m.parts.pony.visible = true;
    return;
  }
  const pony = new THREE.Group();
  const b = new GeometryBuilder();
  b.add(PRIMS.ico1, { x: 0, y: 0.72, z: 0, sx: 0.36, sy: 0.33, sz: 0.62, color: coat });
  b.add(PRIMS.ico1, { x: 0, y: 1.08, z: 0.6, sx: 0.24, sy: 0.27, sz: 0.3, color: coat });
  b.add(PRIMS.ico, { x: 0, y: 0.98, z: 0.84, sx: 0.15, sy: 0.13, sz: 0.12, color: "#ffd9e3" });
  for (const sd of [-1, 1]) {
    b.add(PRIMS.ico, { x: sd * 0.13, y: 1.13, z: 0.82, sx: 0.04, sy: 0.05, sz: 0.03, color: "#2b2238" });
    b.add(PRIMS.cone4, { x: sd * 0.12, y: 1.36, z: 0.55, sx: 0.06, sy: 0.14, sz: 0.04, color: coat });
  }
  for (let i = 0; i < 5; i += 1) b.add(PRIMS.ico, { x: 0, y: 1.25 - i * 0.1, z: 0.45 - i * 0.12, sx: 0.09, sy: 0.12, sz: 0.1, color: mane });
  b.add(PRIMS.ico, { x: 0, y: 0.72, z: -0.68, sx: 0.12, sy: 0.3, sz: 0.12, rx: 0.6, color: mane });
  b.add(PRIMS.box, { x: 0, y: 1.02, z: -0.05, sx: 0.42, sy: 0.08, sz: 0.4, color: "#8a5a3a" });
  const body = new THREE.Mesh(b.build(), m.material);
  body.castShadow = true;
  pony.add(body);
  const legs: THREE.Object3D[] = [];
  for (const [x, z] of [[-0.2, 0.35], [0.2, 0.35], [-0.2, -0.35], [0.2, -0.35]]) {
    const lb = new GeometryBuilder();
    lb.add(PRIMS.cyl6, { x, y: 0.25, z, sx: 0.08, sy: 0.5, sz: 0.08, color: coat });
    lb.add(PRIMS.cyl6, { x, y: 0.04, z, sx: 0.09, sy: 0.08, sz: 0.09, color: "#c98b6a" });
    const leg = part(lb, m.material, [x, 0.5, z]);
    pony.add(leg);
    legs.push(leg);
  }
  pony.userData.legs = legs;
  m.parts.pony = pony;
  m.root.add(pony);
}

export function detachPony(m: Model): void {
  if (m.parts.pony) m.parts.pony.visible = false;
}

export function setStunStars(m: Model, on: boolean): void {
  if (!on) {
    if (m.parts.stars) m.parts.stars.visible = false;
    return;
  }
  if (!m.parts.stars) {
    const b = new GeometryBuilder();
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * Math.PI * 2;
      b.add(PRIMS.octa, { x: Math.cos(a) * 0.35, y: 0, z: Math.sin(a) * 0.35, sx: 0.08, sy: 0.08, sz: 0.03, color: "#ffd166", glow: 1.5 });
    }
    const g = new THREE.Mesh(b.build(), m.material);
    g.position.y = m.height / m.scale + 0.1;
    m.parts.stars = g;
    m.body.add(g);
  }
  m.parts.stars.visible = true;
}

// ── animation ────────────────────────────────────────────────────────────────

export interface AnimState {
  moving: boolean;
  dead: boolean;
  swimming?: boolean;
  speed?: number;
  mounted?: boolean;
  emote?: string;
}

export function animate(m: Model, s: AnimState, dt: number, time: number): void {
  const p = m.parts;
  if (m.hitT > 0) m.hitT = Math.max(0, m.hitT - dt);
  m.material.userData.flash.value = m.hitT > 0 ? m.hitT * 2.2 : 0;
  if (m.attackT > 0) m.attackT = Math.max(0, m.attackT - dt);

  if (m.kind === "furniture") return;
  if (m.kind === "loot") {
    m.body.rotation.y += dt * 1.6;
    m.body.position.y = 0.1 + Math.sin(time * 3 + m.phase) * 0.06;
    return;
  }

  if (s.dead) {
    // Topple over and sink.
    m.body.rotation.z = Math.min(Math.PI / 2, m.body.rotation.z + dt * 5);
    m.body.position.y = Math.max(-0.3, m.body.position.y - dt * 0.15);
    return;
  }
  m.body.rotation.z *= 0.8;

  const rate = s.moving ? (s.speed ?? 1) * 9 : 2.2;
  m.phase += dt * rate;
  const swing = s.moving ? Math.sin(m.phase) : 0;

  if (m.parts.stars?.visible) m.parts.stars.rotation.y += dt * 5;

  if (m.kind === "humanoid") {
    if (s.mounted && m.parts.pony?.visible) {
      // Riding: sit in the saddle, legs out, pony trots.
      const legs = m.parts.pony.userData.legs as THREE.Object3D[];
      const gallop = s.moving ? Math.sin(m.phase * 1.2) : 0;
      legs.forEach((l, i) => (l.rotation.x = gallop * 0.8 * (i % 3 === 0 ? 1 : -1)));
      m.parts.pony.position.y = s.moving ? Math.abs(gallop) * 0.08 : Math.sin(time * 2) * 0.01;
      m.body.position.y = 0.62 + m.parts.pony.position.y;
      m.body.rotation.x = 0;
      if (p.legL) p.legL.rotation.set(-1.2, 0, 0.35);
      if (p.legR) p.legR.rotation.set(-1.2, 0, -0.35);
      if (p.armL) p.armL.rotation.x = -0.4;
      if (p.armR && m.attackT <= 0) p.armR.rotation.x = -0.4;
      if (p.armR && m.attackT > 0) p.armR.rotation.x = -2.2 * Math.sin((m.attackT / 0.3) * Math.PI);
      return;
    }
    if (p.legL) p.legL.rotation.z = 0;
    if (p.legR) p.legR.rotation.z = 0;
    if (s.emote && !s.moving && animateEmote(m, s.emote, time)) return;
    m.body.rotation.x = 0;
    m.body.rotation.y = 0;
    const bob = s.moving ? Math.abs(Math.sin(m.phase)) * 0.07 : Math.sin(m.phase) * 0.012;
    m.body.position.y = bob + (s.swimming ? -0.55 : 0);
    if (p.legL) p.legL.rotation.x = swing * 0.7;
    if (p.legR) p.legR.rotation.x = -swing * 0.7;
    if (p.armL) p.armL.rotation.x = -swing * 0.6;
    if (p.armR) {
      if (m.attackT > 0) {
        const k = m.attackT / 0.3;
        p.armR.rotation.x = -2.2 * Math.sin(k * Math.PI);
        p.armR.rotation.z = 0.3 * Math.sin(k * Math.PI);
      } else {
        p.armR.rotation.x = swing * 0.6;
        p.armR.rotation.z = 0;
      }
    }
    if (p.head) p.head.rotation.z = s.moving ? Math.sin(m.phase * 0.5) * 0.05 : Math.sin(time * 0.8 + m.phase) * 0.04;
    return;
  }

  switch (m.kind) {
    case "slime": {
      // Hop: squash at landing, stretch in the air.
      const hop = s.moving ? Math.max(0, Math.sin(m.phase * 0.6)) : 0;
      const breathe = Math.sin(time * 2.4 + m.phase) * 0.04;
      m.body.position.y = hop * 0.35;
      const sq = s.moving ? 1 + (hop - 0.4) * 0.35 : 1 + breathe;
      m.body.scale.set(m.scale / Math.sqrt(sq), m.scale * sq, m.scale / Math.sqrt(sq));
      break;
    }
    case "bunny": {
      const hop = s.moving ? Math.max(0, Math.sin(m.phase * 0.8)) : 0;
      m.body.position.y = hop * 0.25;
      break;
    }
    case "wisp": {
      m.body.position.y = 0.2 + Math.sin(time * 2 + m.phase) * 0.15;
      if (p.extra) p.extra.rotation.y += dt * 2.5;
      break;
    }
    case "imp": {
      m.body.position.y = 0.25 + Math.sin(time * 4 + m.phase) * 0.08;
      break;
    }
    case "toad": {
      const hop = s.moving ? Math.max(0, Math.sin(m.phase * 0.5)) : 0;
      m.body.position.y = hop * 0.3;
      m.body.scale.y = m.scale * (1 + Math.sin(time * 3 + m.phase) * 0.03);
      break;
    }
    default: {
      m.body.position.y = s.moving ? Math.abs(Math.sin(m.phase)) * 0.05 : 0;
      if (p.legL) p.legL.rotation.x = swing * 0.6;
      if (p.legR) p.legR.rotation.x = -swing * 0.6;
      if (p.armL) p.armL.rotation.x = -swing * 0.6;
      if (p.armR) p.armR.rotation.x = swing * 0.6;
      if (p.tail) p.tail.rotation.y = Math.sin(time * 6 + m.phase) * 0.35;
      if (m.kind === "golem" || m.kind === "yeti") {
        m.body.rotation.z = s.moving ? Math.sin(m.phase) * 0.06 : 0;
      }
    }
  }
  if (m.attackT > 0) {
    // Lunge forward.
    const k = Math.sin((m.attackT / 0.3) * Math.PI);
    m.body.position.z = k * 0.25;
  } else {
    m.body.position.z = 0;
  }
}

/** Character emote poses. Returns false for unknown emotes. */
function animateEmote(m: Model, emote: string, time: number): boolean {
  const p = m.parts;
  const t = time * 6;
  m.body.rotation.x = 0;
  m.body.position.y = 0;
  if (p.legL) p.legL.rotation.x = 0;
  if (p.legR) p.legR.rotation.x = 0;
  if (p.armL) p.armL.rotation.set(0, 0, 0);
  if (p.armR) p.armR.rotation.set(0, 0, 0);
  if (p.head) p.head.rotation.set(0, 0, 0);
  switch (emote) {
    case "wave":
      if (p.armR) {
        p.armR.rotation.x = -2.8;
        p.armR.rotation.z = Math.sin(t * 1.4) * 0.5;
      }
      if (p.head) p.head.rotation.z = Math.sin(t * 0.7) * 0.1;
      return true;
    case "dance":
      m.body.rotation.y = Math.sin(time * 3) * 0.9;
      m.body.position.y = Math.abs(Math.sin(t)) * 0.12;
      if (p.armL) p.armL.rotation.x = -2.5 + Math.sin(t) * 0.5;
      if (p.armR) p.armR.rotation.x = -2.5 - Math.sin(t) * 0.5;
      if (p.legL) p.legL.rotation.x = Math.sin(t) * 0.4;
      if (p.legR) p.legR.rotation.x = -Math.sin(t) * 0.4;
      return true;
    case "cheer":
      m.body.position.y = Math.max(0, Math.sin(t * 0.8)) * 0.35;
      if (p.armL) p.armL.rotation.set(-2.9, 0, 0.4);
      if (p.armR) p.armR.rotation.set(-2.9, 0, -0.4);
      return true;
    case "bow":
      m.body.rotation.x = 0.55;
      if (p.armR) p.armR.rotation.x = -0.6;
      return true;
    case "sit":
      m.body.position.y = -0.38;
      if (p.legL) p.legL.rotation.x = -1.5;
      if (p.legR) p.legR.rotation.x = -1.5;
      if (p.armL) p.armL.rotation.x = -0.5;
      if (p.armR) p.armR.rotation.x = -0.5;
      return true;
    case "laugh":
      m.body.position.y = Math.abs(Math.sin(t * 1.5)) * 0.05;
      if (p.head) p.head.rotation.x = -0.3 + Math.sin(t * 1.5) * 0.08;
      if (p.armL) p.armL.rotation.set(-0.5, 0, 0.6);
      if (p.armR) p.armR.rotation.set(-0.5, 0, -0.6);
      return true;
    case "cry":
      if (p.head) p.head.rotation.x = 0.35 + Math.sin(t * 2) * 0.04;
      if (p.armL) p.armL.rotation.x = -2.0;
      if (p.armR) p.armR.rotation.x = -2.0;
      return true;
    case "heart":
      if (p.armL) p.armL.rotation.set(-1.4, 0, -0.7);
      if (p.armR) p.armR.rotation.set(-1.4, 0, 0.7);
      m.body.position.y = Math.abs(Math.sin(t * 0.5)) * 0.05;
      return true;
  }
  return false;
}

export const JUMP_TIME = 0.62;
export const JUMP_HEIGHT = 1.15;

/** Vertical offset of a jump arc; also tucks the legs while airborne. */
export function jumpOffset(m: Model, dt: number): number {
  if (m.jumpT <= 0) return 0;
  m.jumpT = Math.max(0, m.jumpT - dt);
  const k = 1 - m.jumpT / JUMP_TIME;
  const y = Math.sin(k * Math.PI) * JUMP_HEIGHT;
  if (m.kind === "humanoid" && m.jumpT > 0) {
    if (m.parts.legL) m.parts.legL.rotation.x = -0.7 * Math.sin(k * Math.PI);
    if (m.parts.legR) m.parts.legR.rotation.x = -0.4 * Math.sin(k * Math.PI);
    if (m.parts.armL) m.parts.armL.rotation.z = -0.6 * Math.sin(k * Math.PI);
  }
  return y;
}

export function disposeModel(m: Model): void {
  m.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material;
      if (mat !== m.material) mat.dispose();
    }
  });
  m.material.dispose();
}
