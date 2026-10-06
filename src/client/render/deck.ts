// Sci-fi decks (Ringforge Station, later the Tech Labs): panelled floors, walls with glowing
// light strips, windows onto the stars, consoles, planters, pads, the station's stargate, the
// holo-fountain and the crafting stations. Built once per visit into a few merged meshes.

import * as THREE from "three";
import type { MapDef } from "../../shared/world/maps";
import { Tile } from "../../shared/world/tiles";
import { hash2 } from "../../shared/math";
import { GeometryBuilder, PRIMS, sceneryMaterial } from "./builder";
import { buildStargate } from "./stargate";
import { HOLO_FOUNTAIN, LAUNCH_PAD, LIFTS, STATION_GATE } from "../../shared/world/scifi/station";
import { STATIONS } from "../../shared/world/stations";

export interface DeckPalette {
  floorA: string;
  floorB: string;
  seam: string;
  wall: string;
  wallTop: string;
  strip: string;
  plant: string[];
}

export const LAB_PALETTE: DeckPalette = {
  floorA: "#8f8aa8",
  floorB: "#7f7a98",
  seam: "#4a4560",
  wall: "#5a5470",
  wallTop: "#3b3550",
  strip: "#ff5c8a",
  plant: ["#9dff5c", "#5ff6ff", "#b98cff"]
};

export const STATION_PALETTE: DeckPalette = {
  floorA: "#cfd6e2",
  floorB: "#bfc7d6",
  seam: "#8f9ab0",
  wall: "#e8ecf4",
  wallTop: "#9aa6bc",
  strip: "#7fe8ff",
  plant: ["#7fe0a8", "#5fd6c9", "#b98cff", "#ff9fc4"]
};

const WALL_H = 3.2;

function isWalkable(t: number): boolean {
  return t === Tile.METAL_FLOOR || t === Tile.PAD;
}

export interface Deck {
  group: THREE.Group;
  /** Animated bits (holo-fountain hologram, pads). */
  update(time: number): void;
}

export function buildDeck(map: MapDef, w: number, h: number, pal: DeckPalette = STATION_PALETTE): Deck {
  const group = new THREE.Group();
  const b = new GeometryBuilder();
  const glass = new GeometryBuilder();
  const at = (x: number, y: number) => map.tileAt(x + 0.5, y + 0.5);
  const nearFloor = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) if (isWalkable(at(x + dx, y + dy))) return true;
    return false;
  };
  const inHolo = (x: number, y: number) => map.id === "station" && Math.hypot(x + 0.5 - HOLO_FOUNTAIN.x, y + 0.5 - HOLO_FOUNTAIN.y) <= HOLO_FOUNTAIN.r + 0.2;
  const stationSpots = STATIONS.filter((s) => s.map === map.id);

  for (let y = -1; y <= h; y += 1) {
    for (let x = -1; x <= w; x += 1) {
      const t = at(x, y);
      const cx = x + 0.5;
      const cz = y + 0.5;
      if (t === Tile.METAL_WALL || t === Tile.GLASS) {
        if (!nearFloor(x, y)) continue;
        if (t === Tile.GLASS) {
          b.add(PRIMS.box, { x: cx, y: 0.35, z: cz, sx: 1, sy: 0.7, sz: 1, color: pal.wall });
          b.add(PRIMS.box, { x: cx, y: WALL_H - 0.2, z: cz, sx: 1, sy: 0.4, sz: 1, color: pal.wallTop });
          b.add(PRIMS.box, { x: cx, y: 0.72, z: cz, sx: 1.02, sy: 0.06, sz: 1.02, color: pal.strip, glow: 1.4 });
          glass.add(PRIMS.box, { x: cx, y: (0.7 + WALL_H - 0.4) / 2, z: cz, sx: 0.98, sy: WALL_H - 1.1, sz: 0.12, color: "#9fd8ff" });
          glass.add(PRIMS.box, { x: cx, y: (0.7 + WALL_H - 0.4) / 2, z: cz, sx: 0.12, sy: WALL_H - 1.1, sz: 0.98, color: "#9fd8ff" });
        } else {
          b.add(PRIMS.box, { x: cx, y: WALL_H / 2, z: cz, sx: 1, sy: WALL_H, sz: 1, color: pal.wall });
          b.add(PRIMS.box, { x: cx, y: WALL_H + 0.05, z: cz, sx: 1.04, sy: 0.12, sz: 1.04, color: pal.wallTop });
          b.add(PRIMS.box, { x: cx, y: 2.3, z: cz, sx: 1.03, sy: 0.08, sz: 1.03, color: pal.strip, glow: 1.6 });
          b.add(PRIMS.box, { x: cx, y: 0.08, z: cz, sx: 1.03, sy: 0.16, sz: 1.03, color: pal.wallTop });
        }
        continue;
      }
      if (t === Tile.FORCEFIELD || t === Tile.VOID) continue;
      // Floor panel with a seam and a little colour variation.
      const n = hash2(x, y, 31);
      const checker = (x + y) % 2 === 0;
      b.add(PRIMS.box, { x: cx, y: -0.05, z: cz, sx: 0.98, sy: 0.1, sz: 0.98, color: checker ? pal.floorA : pal.floorB, jitter: 0.04 });
      b.add(PRIMS.box, { x: cx, y: -0.07, z: cz, sx: 1.0, sy: 0.08, sz: 1.0, color: pal.seam });
      if (n > 0.93 && t === Tile.METAL_FLOOR) b.add(PRIMS.box, { x: cx, y: 0.005, z: cz, sx: 0.5, sy: 0.02, sz: 0.06, color: pal.strip, glow: 0.9 });
      if (t === Tile.PAD) {
        b.add(PRIMS.box, { x: cx, y: 0.01, z: cz, sx: 0.86, sy: 0.04, sz: 0.86, color: "#3b4a6a" });
        b.add(PRIMS.box, { x: cx, y: 0.03, z: cz, sx: 0.5, sy: 0.02, sz: 0.5, color: pal.strip, glow: 1.2 });
      } else if (t === Tile.CONSOLE) {
        if (inHolo(x, y)) continue;
        if (stationSpots.some((s) => Math.floor(s.x) === x && Math.abs(s.y - cz) < 1.2)) continue;
        if (map.id === "station" && y >= 32) {
          // Hangar crates
          b.add(PRIMS.box, { x: cx, y: 0.4, z: cz, sx: 0.85, sy: 0.8, sz: 0.85, ry: n * 0.4, color: n > 0.5 ? "#ffb02e" : "#7d8a9b", jitter: 0.1 });
          b.add(PRIMS.box, { x: cx, y: 0.82, z: cz, sx: 0.88, sy: 0.06, sz: 0.88, ry: n * 0.4, color: "#3b2f4a" });
        } else {
          b.add(PRIMS.box, { x: cx, y: 0.45, z: cz, sx: 0.8, sy: 0.9, sz: 0.6, color: "#6a7488" });
          b.add(PRIMS.box, { x: cx, y: 1.05, z: cz, sx: 0.7, sy: 0.4, sz: 0.06, rx: -0.3, color: n > 0.5 ? "#5ff6ff" : "#9dffb8", glow: 1.6 });
          b.add(PRIMS.box, { x: cx, y: 0.92, z: cz + 0.12, sx: 0.7, sy: 0.05, sz: 0.3, color: "#3b4a6a" });
        }
      } else if (t === Tile.PLANTER && map.id !== "station") {
        // Lab specimen tank: a glowing cylinder with something wriggly inside.
        const c = pal.plant[Math.floor(n * pal.plant.length)];
        b.add(PRIMS.cyl8, { x: cx, y: 0.15, z: cz, sx: 0.42, sy: 0.3, sz: 0.42, color: pal.wallTop });
        b.add(PRIMS.cyl8, { x: cx, y: 1.0, z: cz, sx: 0.38, sy: 1.4, sz: 0.38, color: c, glow: 0.7 });
        b.add(PRIMS.ico, { x: cx, y: 1.0 + n * 0.3, z: cz, sx: 0.16, sy: 0.2, sz: 0.16, color: "#2b2238" });
        b.add(PRIMS.cyl8, { x: cx, y: 1.8, z: cz, sx: 0.42, sy: 0.2, sz: 0.42, color: pal.wallTop });
      } else if (t === Tile.PLANTER) {
        b.add(PRIMS.rbox, { x: cx, y: 0.3, z: cz, sx: 0.92, sy: 0.6, sz: 0.92, color: "#e8ecf4" });
        b.add(PRIMS.box, { x: cx, y: 0.6, z: cz, sx: 0.8, sy: 0.04, sz: 0.8, color: "#6a4a3a" });
        const c = pal.plant[Math.floor(n * pal.plant.length)];
        for (let i = 0; i < 3; i += 1) {
          const a = n * 6 + i * 2.1;
          b.add(PRIMS.ico, { x: cx + Math.cos(a) * 0.2, y: 0.85 + i * 0.12, z: cz + Math.sin(a) * 0.2, sx: 0.28, sy: 0.32, sz: 0.28, color: c, sway: 0.6 });
        }
        b.add(PRIMS.octa, { x: cx, y: 1.25, z: cz, sx: 0.1, sy: 0.14, sz: 0.1, color: "#ffffff", glow: 1.4, sway: 0.6 });
      }
    }
  }

  // Launch pad ring + lift pads (station only)
  if (map.id === "station") {
  b.add(PRIMS.cyl12, { x: LAUNCH_PAD.x, y: 0.02, z: LAUNCH_PAD.y, sx: LAUNCH_PAD.r + 0.3, sy: 0.04, sz: LAUNCH_PAD.r + 0.3, color: "#3b4a6a" });
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2;
    b.add(PRIMS.box, { x: LAUNCH_PAD.x + Math.cos(a) * LAUNCH_PAD.r, y: 0.06, z: LAUNCH_PAD.y + Math.sin(a) * LAUNCH_PAD.r, sx: 0.5, sy: 0.04, sz: 0.18, ry: -a, color: i % 2 ? "#ffd166" : "#3b2f4a", glow: i % 2 ? 0.8 : 0 });
  }
  for (const l of LIFTS) {
    b.add(PRIMS.cyl12, { x: l.x, y: 0.04, z: l.y, sx: 0.75, sy: 0.08, sz: 0.75, color: "#b98cff", glow: 1.4 });
    b.add(PRIMS.box, { x: l.x, y: 2.8, z: l.y - 0.2, sx: 0.8, sy: 0.4, sz: 0.1, color: "#3b2f4a" });
    for (let i = 0; i < l.lab; i += 1) b.add(PRIMS.box, { x: l.x - (l.lab - 1) * 0.12 + i * 0.24, y: 2.8, z: l.y - 0.14, sx: 0.08, sy: 0.25, sz: 0.04, color: "#ffffff", glow: 2 });
  }
  }
  // Crafting stations
  for (const st of stationSpots) {
    if (st.kind === "forge") {
      b.add(PRIMS.box, { x: st.x - 0.1, y: 0.7, z: st.y, sx: 0.9, sy: 1.4, sz: 1.2, color: "#7d8a9b" });
      b.add(PRIMS.box, { x: st.x - 0.56, y: 0.7, z: st.y, sx: 0.04, sy: 0.6, sz: 0.7, color: "#ff8a3c", glow: 2.4 });
      b.add(PRIMS.cyl8, { x: st.x, y: 1.6, z: st.y, sx: 0.3, sy: 0.4, sz: 0.3, color: "#5a6478" });
    } else {
      b.add(PRIMS.box, { x: st.x - 0.1, y: 0.45, z: st.y, sx: 0.9, sy: 0.9, sz: 1.0, color: "#e8ecf4" });
      b.add(PRIMS.cyl8, { x: st.x - 0.1, y: 0.95, z: st.y, sx: 0.28, sy: 0.12, sz: 0.28, color: "#5a6478" });
      b.add(PRIMS.cyl8, { x: st.x - 0.1, y: 0.92, z: st.y, sx: 0.2, sy: 0.04, sz: 0.2, color: "#ff8a3c", glow: 2 });
    }
  }
  // Holo-fountain basin
  if (map.id === "station") b.add(PRIMS.cyl12, { x: HOLO_FOUNTAIN.x, y: 0.3, z: HOLO_FOUNTAIN.y, sx: HOLO_FOUNTAIN.r, sy: 0.6, sz: HOLO_FOUNTAIN.r, color: "#e8ecf4" });
  if (map.id === "station") b.add(PRIMS.cyl12, { x: HOLO_FOUNTAIN.x, y: 0.62, z: HOLO_FOUNTAIN.y, sx: HOLO_FOUNTAIN.r - 0.25, sy: 0.04, sz: HOLO_FOUNTAIN.r - 0.25, color: "#5ff6ff", glow: 1.2 });
  if (map.id === "station") b.add(PRIMS.cyl8, { x: HOLO_FOUNTAIN.x, y: 0.9, z: HOLO_FOUNTAIN.y, sx: 0.35, sy: 0.6, sz: 0.35, color: "#9aa6b8" });

  const mesh = new THREE.Mesh(b.build(), sceneryMaterial());
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  group.add(mesh);
  if (glass.vertexCount) {
    const gm = new THREE.Mesh(glass.build(), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.3, depthWrite: false }));
    group.add(gm);
  }

  // A starfield all around so the windows look out into space.
  const starPos: number[] = [];
  for (let i = 0; i < 900; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const r = 70 + Math.random() * 60;
    starPos.push(w / 2 + Math.cos(a) * r, -20 + Math.random() * 60, h / 2 + Math.sin(a) * r);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
  group.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, fog: false })));

  // The station's stargate, set into the north wall.
  if (map.id === "station") {
    const gate = buildStargate("metal", 2.9);
    gate.position.set(STATION_GATE.x, 0, 2.3);
    group.add(gate);
  }

  // Hologram above the fountain: a spinning little planet with a moon.
  const holo = new THREE.Group();
  const hm = new THREE.MeshBasicMaterial({ color: 0x7fe8ff, transparent: true, opacity: 0.55, wireframe: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const planet = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), hm);
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), hm);
  moon.position.set(1.5, 0.2, 0);
  const ringM = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.03, 4, 32), hm);
  ringM.rotation.x = Math.PI / 2.4;
  holo.add(planet, moon, ringM);
  holo.position.set(HOLO_FOUNTAIN.x, 2.4, HOLO_FOUNTAIN.y);
  const holoLight = new THREE.PointLight(0x7fe8ff, 5, 9, 1.6);
  holoLight.position.set(HOLO_FOUNTAIN.x, 2.2, HOLO_FOUNTAIN.y);
  if (map.id === "station") group.add(holo, holoLight);

  return {
    group,
    update(time: number) {
      holo.rotation.y = time * 0.6;
      planet.rotation.x = time * 0.3;
      holo.position.y = 2.4 + Math.sin(time * 1.2) * 0.12;
    }
  };
}
