// Waypoint obelisks: carved stone with a floating crystal that glows once you've attuned.

import * as THREE from "three";
import { WAYPOINTS } from "../../shared/game/waypoints";
import { STATIONS } from "../../shared/world/stations";
import { heightAt } from "../../shared/world/overworld";
import { GeometryBuilder, PRIMS, sceneryMaterial } from "./builder";
import { buildStargate } from "./stargate";
import { GATE_RING, STARGATE } from "../../shared/world/scifi/stargate";
import { CAVE_MOUTHS } from "../../shared/world/overworld";

interface Obelisk {
  id: string;
  crystal: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  baseY: number;
  attuned: boolean;
}

export class Landmarks {
  readonly group = new THREE.Group();
  private obelisks: Obelisk[] = [];

  constructor() {
    const stone = new GeometryBuilder();
    for (const w of WAYPOINTS) {
      const h = heightAt(w.x, w.y);
      stone.add(PRIMS.cyl8, { x: w.x, y: h + 0.15, z: w.y, sx: 0.9, sy: 0.3, sz: 0.9, color: "#cfc6bd" });
      stone.add(PRIMS.cyl8, { x: w.x, y: h + 0.38, z: w.y, sx: 0.65, sy: 0.18, sz: 0.65, color: "#e3dace" });
      stone.add(PRIMS.taper6, { x: w.x, y: h + 1.2, z: w.y, sx: 0.32, sy: 1.6, sz: 0.32, color: "#b9b0c9", jitter: 0.05 });
      stone.add(PRIMS.cone6, { x: w.x, y: h + 2.15, z: w.y, sx: 0.24, sy: 0.32, sz: 0.24, color: "#b9b0c9" });
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        stone.add(PRIMS.box, { x: w.x + Math.cos(a) * 0.33, y: h + 1.1, z: w.y + Math.sin(a) * 0.33, sx: 0.04, sy: 0.5, sz: 0.1, ry: -a, color: "#d9b3ff", glow: -1.2 });
      }
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        stone.add(PRIMS.ico, { x: w.x + Math.cos(a) * 1.05, y: h + 0.12, z: w.y + Math.sin(a) * 1.05, sx: 0.12, sy: 0.12, sz: 0.12, color: ["#ff8fb1", "#ffd166", "#b9a3ff"][i % 3], sway: 0.3 });
      }
      const mat = new THREE.MeshStandardMaterial({ color: 0x9a94a6, emissive: 0x000000, flatShading: true, roughness: 0.3 });
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), mat);
      crystal.scale.set(1, 1.6, 1);
      crystal.position.set(w.x, h + 2.9, w.y);
      crystal.castShadow = true;
      this.group.add(crystal);
      this.obelisks.push({ id: w.id, crystal, mat, baseY: h + 2.9, attuned: false });
    }
    // The Stargate at Starfall Circle, facing west toward the road.
    const gate = buildStargate("stone", GATE_RING.radius);
    gate.position.set(GATE_RING.x, heightAt(GATE_RING.x, GATE_RING.y), GATE_RING.y);
    gate.rotation.y = -Math.PI / 2;
    this.group.add(gate);
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      const r = STARGATE.r - 0.6;
      const x = STARGATE.x + Math.cos(a) * r;
      const y = STARGATE.y + Math.sin(a) * r;
      if (Math.abs(a - Math.PI) < 0.4) continue; // leave the path open
      stone.add(PRIMS.taper6, { x, y: heightAt(x, y) + 0.45, z: y, sx: 0.22, sy: 0.9, sz: 0.22, color: "#d9d2e0" });
      stone.add(PRIMS.octa, { x, y: heightAt(x, y) + 1.05, z: y, sx: 0.12, sy: 0.18, sz: 0.12, color: "#b98cff", glow: -1.6 });
    }
    // The Seafarer Cave: a mossy rock mound with a dark mouth facing the sea and a lantern.
    for (const c of CAVE_MOUTHS) {
      const h = heightAt(c.x, c.y);
      const ang = Math.atan2(c.oy, c.ox);
      stone.add(PRIMS.dodeca, { x: c.x, y: h + 1.3, z: c.y, sx: 4.2, sy: 3.0, sz: 4.0, ry: ang, color: c.rock, jitter: 0.18 });
      stone.add(PRIMS.ico, { x: c.x - c.ox * 0.6, y: h + 3.6, z: c.y - c.oy * 0.6, sx: 2.8, sy: 0.6, sz: 2.6, color: c.moss, jitter: 0.15 });
      stone.add(PRIMS.box, { x: c.x + c.ox * 3.5, y: h + 1.1, z: c.y + c.oy * 3.5, sx: 2.0, sy: 2.2, sz: 0.3, ry: -ang + Math.PI / 2, color: "#1a1626" });
      const lx = c.x + c.ox * 3.9 - c.oy * 1.6;
      const lz = c.y + c.oy * 3.9 + c.ox * 1.6;
      stone.add(PRIMS.cyl6, { x: lx, y: h + 0.9, z: lz, sx: 0.08, sy: 1.8, sz: 0.08, color: "#7a5234" });
      stone.add(PRIMS.octa, { x: lx, y: h + 1.9, z: lz, sx: 0.18, sy: 0.25, sz: 0.18, color: "#ffd166", glow: 1.6 });
    }
    for (const st of STATIONS) {
      if (st.map && st.map !== "overworld") continue;
      const h = heightAt(st.x, st.y);
      if (st.kind === "campfire") {
        for (let i = 0; i < 8; i += 1) {
          const a = (i / 8) * Math.PI * 2;
          stone.add(PRIMS.dodeca, { x: st.x + Math.cos(a) * 0.62, y: h + 0.1, z: st.y + Math.sin(a) * 0.62, sx: 0.2, sy: 0.15, sz: 0.2, color: "#a9a9b3" });
        }
        for (let i = 0; i < 3; i += 1) stone.add(PRIMS.cyl6, { x: st.x, y: h + 0.15, z: st.y, sx: 0.08, sy: 0.9, sz: 0.08, rz: Math.PI / 2, ry: (i / 3) * Math.PI, color: "#7a5234" });
        stone.add(PRIMS.cone6, { x: st.x, y: h + 0.45, z: st.y, sx: 0.28, sy: 0.6, sz: 0.28, color: "#ff8a3c", glow: 2.2 });
        stone.add(PRIMS.cone6, { x: st.x, y: h + 0.5, z: st.y, sx: 0.15, sy: 0.5, sz: 0.15, color: "#ffd166", glow: 2.8 });
        stone.add(PRIMS.box, { x: st.x + 1.1, y: h + 0.2, z: st.y + 0.3, sx: 0.9, sy: 0.25, sz: 0.3, ry: 0.4, color: "#9a6b4f" });
        stone.add(PRIMS.cyl8, { x: st.x - 0.9, y: h + 0.3, z: st.y + 0.6, sx: 0.25, sy: 0.3, sz: 0.25, color: "#5a5f6a" });
      } else {
        stone.add(PRIMS.box, { x: st.x, y: h + 0.8, z: st.y, sx: 1.4, sy: 1.6, sz: 1.2, color: "#8a7a70", jitter: 0.06 });
        stone.add(PRIMS.box, { x: st.x, y: h + 0.6, z: st.y + 0.61, sx: 0.7, sy: 0.6, sz: 0.04, color: "#ff8a3c", glow: 2.4 });
        stone.add(PRIMS.cyl8, { x: st.x + 0.3, y: h + 2.0, z: st.y - 0.2, sx: 0.25, sy: 1.0, sz: 0.25, color: "#6a5a52" });
        stone.add(PRIMS.box, { x: st.x + 1.4, y: h + 0.35, z: st.y + 0.3, sx: 0.5, sy: 0.5, sz: 0.35, color: "#5a5f6a" });
        stone.add(PRIMS.box, { x: st.x + 1.4, y: h + 0.68, z: st.y + 0.3, sx: 0.85, sy: 0.18, sz: 0.38, color: "#6a707c" });
      }
    }
    const mesh = new THREE.Mesh(stone.build(), sceneryMaterial());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  setAttuned(ids: string[]): void {
    for (const o of this.obelisks) {
      const on = ids.includes(o.id);
      if (on === o.attuned) continue;
      o.attuned = on;
      o.mat.color.set(on ? 0xd9a6ff : 0x9a94a6);
      o.mat.emissive.set(on ? 0xb97cff : 0x000000);
      o.mat.emissiveIntensity = on ? 1.4 : 0;
    }
  }

  update(time: number): void {
    for (const o of this.obelisks) {
      o.crystal.rotation.y = time * (o.attuned ? 1.2 : 0.3);
      o.crystal.position.y = o.baseY + Math.sin(time * 1.5 + o.baseY) * 0.12;
    }
  }
}
