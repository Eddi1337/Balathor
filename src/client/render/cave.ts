// Cave dungeons: a themed floor, tall craggy walls wherever rock meets open floor, glowing props
// (mushrooms, crystals, embers), pools (or lava in the Ember Depths) and a shaft of daylight over
// the entrance. Built once when you arrive.

import * as THREE from "three";
import type { MapDef } from "../../shared/world/maps";
import { Tile } from "../../shared/world/tiles";
import { hash2 } from "../../shared/math";
import { CAVES, caveLayout, type CaveId } from "../../shared/world/dungeons/caves";
import { GeometryBuilder, PRIMS, sceneryMaterial } from "./builder";
import { addProp, tileColor } from "./terrain";
import { stillWaterMaterial, withStillFlow } from "./water";

interface CaveLook {
  rock: string;
  rock2: string;
  glow: string;
  fog: string;
  light: number;
}

export const CAVE_LOOKS: Record<CaveId, CaveLook> = {
  grotto: { rock: "#5d6a5a", rock2: "#7d8a6a", glow: "#9dff9a", fog: "#1a2a22", light: 0x9dffc9 },
  ember: { rock: "#4a3a3e", rock2: "#6a4a42", glow: "#ff8a3c", fog: "#2a1210", light: 0xff9a5c },
  frost: { rock: "#7a8aa8", rock2: "#9fb4d6", glow: "#9fe7ff", fog: "#16223a", light: 0x9fd8ff }
};

export function buildCave(map: MapDef, id: CaveId): THREE.Group {
  const def = CAVES[id];
  const L = caveLayout(id);
  const look = CAVE_LOOKS[id];
  const g = new THREE.Group();
  const b = new GeometryBuilder();
  const water = new GeometryBuilder();
  const lava = new GeometryBuilder();
  const open = (x: number, y: number) => {
    const t = map.tileAt(x + 0.5, y + 0.5);
    return t !== Tile.ROCK;
  };
  const c = new THREE.Color();
  for (let y = 0; y < def.h; y += 1) {
    for (let x = 0; x < def.w; x += 1) {
      const t = map.tileAt(x + 0.5, y + 0.5);
      if (t === Tile.ROCK) {
        let edge = false;
        for (let dy = -1; dy <= 1 && !edge; dy += 1) for (let dx = -1; dx <= 1 && !edge; dx += 1) if (open(x + dx, y + dy)) edge = true;
        if (!edge) continue;
        const r = hash2(x, y, 3);
        const h = 2.6 + r * 2.4;
        b.add(PRIMS.dodeca, { x: x + 0.5, y: h / 2 - 0.2, z: y + 0.5, sx: 0.85, sy: h / 2, sz: 0.85, ry: r * 6, color: r > 0.5 ? look.rock : look.rock2, jitter: 0.18 });
        if (r > 0.8) b.add(PRIMS.octa, { x: x + 0.5, y: 0.6 + r, z: y + 0.5, sx: 0.12, sy: 0.25, sz: 0.12, color: look.glow, glow: 1.6 });
        continue;
      }
      const cx = x + 0.5;
      const cz = y + 0.5;
      c.copy(tileColor(t === def.pool || t === Tile.PAD ? def.floor : t, def.biome, x, y, 0)).multiplyScalar(0.7);
      b.tri(x, 0, y, x, 0, y + 1, x + 1, 0, y, c);
      b.tri(x + 1, 0, y, x, 0, y + 1, x + 1, 0, y + 1, c.clone().multiplyScalar(0.96));
      if (t === Tile.SHALLOW) {
        const wc = new THREE.Color("#5cc6e8");
        water.tri(x, 0.08, y, x, 0.08, y + 1, x + 1, 0.08, y, wc);
        water.tri(x + 1, 0.08, y, x, 0.08, y + 1, x + 1, 0.08, y + 1, wc);
      } else if (t === Tile.WATER) {
        const lc = new THREE.Color("#ff7a2c");
        lava.tri(x, 0.06, y, x, 0.06, y + 1, x + 1, 0.06, y, lc);
        lava.tri(x + 1, 0.06, y, x, 0.06, y + 1, x + 1, 0.06, y + 1, lc);
      } else if (t >= 20) {
        addProp(b, t, def.biome, x, y, 0);
      } else {
        // Little glowing things scattered on the floor.
        const r = hash2(x, y, 17);
        if (r > 0.965) {
          if (id === "grotto") {
            b.add(PRIMS.cyl6, { x: cx, y: 0.15, z: cz, sx: 0.05, sy: 0.3, sz: 0.05, color: "#f2ead8" });
            b.add(PRIMS.ico, { x: cx, y: 0.32, z: cz, sx: 0.16, sy: 0.08, sz: 0.16, color: look.glow, glow: 1.4 });
          } else if (id === "ember") {
            b.add(PRIMS.dodeca, { x: cx, y: 0.1, z: cz, sx: 0.18, sy: 0.12, sz: 0.18, color: "#ff8a3c", glow: 1.8 });
          } else {
            b.add(PRIMS.octa, { x: cx, y: 0.3, z: cz, sx: 0.1, sy: 0.32, sz: 0.1, color: look.glow, glow: 1.4 });
          }
        }
      }
    }
  }
  // A shaft of daylight (and a rope ladder) over the entrance.
  b.add(PRIMS.cyl8, { x: L.entry.x, y: 0.02, z: L.entry.y, sx: 1.4, sy: 0.04, sz: 1.4, color: "#fff3c9", glow: 0.6 });
  for (let i = 0; i < 6; i += 1) b.add(PRIMS.box, { x: L.entry.x - 0.6, y: 0.4 + i * 0.5, z: L.entry.y, sx: 0.5, sy: 0.05, sz: 0.06, color: "#9a6b4f" });
  const mesh = new THREE.Mesh(b.build(), sceneryMaterial());
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  g.add(mesh);
  if (water.vertexCount) g.add(new THREE.Mesh(withStillFlow(water.build()), stillWaterMaterial()));
  if (lava.vertexCount) g.add(new THREE.Mesh(lava.build(), new THREE.MeshStandardMaterial({ color: 0xff7a2c, emissive: 0xff5a1c, emissiveIntensity: 1.4, roughness: 0.6, flatShading: true })));
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.6, 10, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff3c9, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
  );
  shaft.position.set(L.entry.x, 5, L.entry.y);
  g.add(shaft);
  return g;
}
