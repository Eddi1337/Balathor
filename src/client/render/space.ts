// Open space: a layered starfield and nebula dome that follow the camera, big low-poly planets
// floating below the flight plane, Ringforge Station's spinning ring, the outpost, the pirate
// haven, the derelict, decorative belt dust and the forcefield at the edge of the map.

import * as THREE from "three";
import { GeometryBuilder, PRIMS, sceneryMaterial } from "./builder";
import { DOCK_RANGE, POIS, SPACE_RADIUS, type Poi } from "../../shared/world/scifi/space";
import { hash2, rng } from "../../shared/math";

const PLANET_DEPTH = 62;

function nebulaMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {},
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float noise(vec3 p) {
        vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        float n = mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
        return n;
      }
      float fbm(vec3 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
      void main() {
        vec3 d = normalize(vDir);
        float n1 = fbm(d * 2.2 + vec3(3.1, 0.0, 1.7));
        float n2 = fbm(d * 3.4 + vec3(-2.0, 5.0, 0.3));
        vec3 base = vec3(0.025, 0.03, 0.09);
        vec3 purple = vec3(0.42, 0.18, 0.62);
        vec3 teal = vec3(0.1, 0.45, 0.6);
        vec3 pink = vec3(0.75, 0.3, 0.55);
        vec3 col = base;
        col += purple * smoothstep(0.45, 0.85, n1) * 0.55;
        col += teal * smoothstep(0.5, 0.9, n2) * 0.45;
        col += pink * smoothstep(0.62, 0.95, n1 * n2 * 1.6) * 0.35;
        gl_FragColor = vec4(col, 1.0);
      }`
  });
}

function starLayer(count: number, radius: number, size: number, colors: string[], seed: number): THREE.Points {
  const rand = rng(seed);
  const pos: number[] = [];
  const col: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const u = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    pos.push(Math.cos(a) * r * radius, u * radius, Math.sin(a) * r * radius);
    c.set(colors[Math.floor(rand() * colors.length)]);
    col.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true }));
  p.frustumCulled = false;
  return p;
}

const PLANET_LOOKS: Record<string, { bands: string[]; atmo: string; ring?: string; spots?: string }> = {
  aurelia: { bands: ["#5fd68a", "#7fe0a8", "#3fae8a", "#a8f0c0", "#4fc0d6"], atmo: "#9ff0ff", spots: "#ffffff" },
  icefall: { bands: ["#e8f6ff", "#bfe8ff", "#9fd4f5", "#ffffff", "#cfe3ff"], atmo: "#d6f4ff" },
  rust: { bands: ["#e07a4a", "#ff9a6b", "#c95a3a", "#ffc08a", "#b84a2a"], atmo: "#ffb38a", ring: "#e8c9a8" }
};

function buildPlanet(p: Poi): THREE.Group {
  const look = PLANET_LOOKS[p.id] ?? PLANET_LOOKS.aurelia;
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(p.r, 3).toNonIndexed();
  const pos = geo.getAttribute("position");
  const colors: number[] = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    // One colour per face, banded by latitude with noise for continents / storms.
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3 / p.r;
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3 / p.r;
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3 / p.r;
    const n = hash2(Math.floor(x * 6), Math.floor(z * 6 + y * 3), p.id.length * 7);
    const band = Math.floor((y * 0.5 + 0.5) * look.bands.length * 1.4 + n * 1.6) % look.bands.length;
    c.set(look.bands[band]);
    if (look.spots && n > 0.86) c.set(look.spots);
    for (let k = 0; k < 3; k += 1) colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }));
  g.add(body);
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(p.r * 1.08, 32, 20),
    new THREE.MeshBasicMaterial({ color: look.atmo, transparent: true, opacity: 0.18, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  g.add(atmo);
  if (look.ring) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(p.r * 1.35, p.r * 1.85, 64),
      new THREE.MeshBasicMaterial({ color: look.ring, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2.4;
    g.add(ring);
  }
  g.position.set(p.x, -PLANET_DEPTH, p.y);
  g.userData.body = body;
  return g;
}

function buildRingforge(p: Poi): THREE.Group {
  const g = new THREE.Group();
  const b = new GeometryBuilder();
  // Central hub
  b.add(PRIMS.ico1, { x: 0, y: -4, z: 0, sx: 4.5, sy: 3.2, sz: 4.5, color: "#e8ecf4" });
  b.add(PRIMS.cyl12, { x: 0, y: -1.8, z: 0, sx: 3.2, sy: 1.2, sz: 3.2, color: "#9aa6b8" });
  b.add(PRIMS.cyl12, { x: 0, y: -1.1, z: 0, sx: 2.2, sy: 0.3, sz: 2.2, color: "#5ff6ff", glow: 1.4 });
  b.add(PRIMS.cyl6, { x: 0, y: 1.5, z: 0, sx: 0.25, sy: 6, sz: 0.25, color: "#9aa6b8" });
  b.add(PRIMS.ico, { x: 0, y: 4.6, z: 0, sx: 0.45, sy: 0.45, sz: 0.45, color: "#ff5c6a", glow: 2.5 });
  const hub = new THREE.Mesh(b.build(), sceneryMaterial());
  g.add(hub);
  // The spinning habitat ring with spokes and windows.
  const rb = new GeometryBuilder();
  const R = p.r;
  const segs = 28;
  for (let i = 0; i < segs; i += 1) {
    const a = (i / segs) * Math.PI * 2;
    rb.add(PRIMS.box, { x: Math.cos(a) * R, y: -3, z: Math.sin(a) * R, sx: 2.2, sy: 2.0, sz: (Math.PI * 2 * R) / segs + 0.15, ry: -a, color: i % 2 ? "#e8ecf4" : "#cfd6e2" });
    rb.add(PRIMS.box, { x: Math.cos(a) * (R + 1.12), y: -2.7, z: Math.sin(a) * (R + 1.12), sx: 0.06, sy: 0.5, sz: 1.2, ry: -a, color: "#ffd166", glow: 1.6 });
  }
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    rb.add(PRIMS.box, { x: Math.cos(a) * R * 0.5, y: -3, z: Math.sin(a) * R * 0.5, sx: R * 0.85, sy: 0.6, sz: 0.8, ry: -a, color: "#9aa6b8" });
  }
  const ring = new THREE.Mesh(rb.build(), sceneryMaterial());
  g.add(ring);
  g.userData.spin = ring;
  // Docking zone marker
  const dock = new THREE.Mesh(
    new THREE.RingGeometry(R + DOCK_RANGE - 0.4, R + DOCK_RANGE, 64),
    new THREE.MeshBasicMaterial({ color: 0x5ff6ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  dock.rotation.x = -Math.PI / 2;
  dock.position.y = 0.05;
  g.add(dock);
  const light = new THREE.PointLight(0x9fd8ff, 30, 60, 1.4);
  light.position.set(0, 6, 0);
  g.add(light);
  g.position.set(p.x, 0, p.y);
  return g;
}

function buildOutpost(p: Poi): THREE.Group {
  const g = new THREE.Group();
  const b = new GeometryBuilder();
  b.add(PRIMS.cyl8, { x: 0, y: -2, z: 0, sx: 3, sy: 4, sz: 3, color: "#cfd6e2" });
  b.add(PRIMS.cone8, { x: 0, y: 1.2, z: 0, sx: 3, sy: 2.4, sz: 3, color: "#ffd166" });
  for (const s of [-1, 1]) {
    b.add(PRIMS.box, { x: s * 6.5, y: -1.5, z: 0, sx: 7, sy: 0.15, sz: 3, color: "#3f6fb5", glow: 0.3 });
    b.add(PRIMS.box, { x: s * 3.4, y: -1.5, z: 0, sx: 1.2, sy: 0.3, sz: 0.3, color: "#9aa6b8" });
  }
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    b.add(PRIMS.ico, { x: Math.cos(a) * 3.05, y: -1.2, z: Math.sin(a) * 3.05, sx: 0.2, sy: 0.2, sz: 0.2, color: "#7fe8ff", glow: 2 });
  }
  g.add(new THREE.Mesh(b.build(), sceneryMaterial()));
  g.position.set(p.x, 0, p.y);
  g.userData.spin = g.children[0];
  return g;
}

function buildHaven(p: Poi): THREE.Group {
  const g = new THREE.Group();
  const b = new GeometryBuilder();
  const rand = rng(77);
  b.add(PRIMS.dodeca, { x: 0, y: -8, z: 0, sx: 12, sy: 7, sz: 10, color: "#4a3f5a", jitter: 0.25 });
  for (let i = 0; i < 9; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = 4 + rand() * 6;
    b.add(PRIMS.cone4, { x: Math.cos(a) * r, y: -2 + rand() * 2, z: Math.sin(a) * r, sx: 1, sy: 4 + rand() * 4, sz: 1, rx: (rand() - 0.5) * 0.6, rz: (rand() - 0.5) * 0.6, color: "#2b2238" });
    b.add(PRIMS.ico, { x: Math.cos(a) * r, y: 2 + rand() * 3, z: Math.sin(a) * r, sx: 0.4, sy: 0.4, sz: 0.4, color: "#ff2e63", glow: 2.4 });
  }
  // A big grinning skull flag (it's a pirate base, after all).
  b.add(PRIMS.box, { x: 0, y: 6, z: 0, sx: 0.2, sy: 8, sz: 0.2, color: "#5a5f6a" });
  b.add(PRIMS.box, { x: 1.8, y: 9, z: 0, sx: 3.4, sy: 2, sz: 0.1, color: "#2b2238" });
  b.add(PRIMS.ico1, { x: 1.8, y: 9.1, z: 0.1, sx: 0.6, sy: 0.6, sz: 0.1, color: "#ffffff" });
  g.add(new THREE.Mesh(b.build(), sceneryMaterial()));
  const light = new THREE.PointLight(0xff2e63, 25, 50, 1.6);
  light.position.set(0, 4, 0);
  g.add(light);
  g.position.set(p.x, 0, p.y);
  return g;
}

function buildDerelict(p: Poi): THREE.Group {
  const g = new THREE.Group();
  const b = new GeometryBuilder();
  // A broken capital ship, split in two, drifting below the plane.
  b.add(PRIMS.box, { x: -8, y: -9, z: 0, sx: 22, sy: 6, sz: 8, ry: 0.3, rz: 0.15, color: "#7d8a9b", jitter: 0.15 });
  b.add(PRIMS.box, { x: 14, y: -11, z: 6, sx: 14, sy: 5, sz: 7, ry: 0.9, rz: -0.2, color: "#6a7488", jitter: 0.15 });
  for (let i = 0; i < 12; i += 1) b.add(PRIMS.box, { x: -18 + i * 3, y: -5.8, z: 2, sx: 1.2, sy: 0.3, sz: 0.8, ry: 0.3, color: i % 3 ? "#3b4a6a" : "#ffb02e", glow: i % 3 ? 0 : 1 });
  g.add(new THREE.Mesh(b.build(), sceneryMaterial()));
  g.position.set(p.x, 0, p.y);
  return g;
}

/** Background rocks around belts (not shootable; the real asteroids are entities). */
function beltDust(p: Poi, color: string, seed: number): THREE.InstancedMesh {
  const n = 220;
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 }), n);
  const rand = rng(seed);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (let i = 0; i < n; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * p.r * 1.3;
    const s = 0.4 + rand() * 1.8;
    e.set(rand() * 3, rand() * 3, rand() * 3);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(p.x + Math.cos(a) * r, -4 - rand() * 14, p.y + Math.sin(a) * r), q, new THREE.Vector3(s, s * 0.8, s));
    mesh.setMatrixAt(i, m);
  }
  return mesh;
}

export class SpaceScene {
  readonly group = new THREE.Group();
  private sky = new THREE.Group();
  private planets: THREE.Group[] = [];
  private spinners: THREE.Object3D[] = [];
  private beacon: THREE.Mesh;

  constructor() {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(390, 32, 20), nebulaMaterial());
    dome.renderOrder = -10;
    this.sky.add(dome);
    this.sky.add(starLayer(1800, 380, 1.4, ["#ffffff", "#cfe3ff", "#ffe8c9"], 1));
    this.sky.add(starLayer(400, 370, 2.4, ["#ffffff", "#9fd8ff", "#ffd1e8"], 2));
    this.sky.add(starLayer(80, 360, 3.6, ["#ffffff", "#fff1c9"], 3));
    this.group.add(this.sky);
    for (const p of POIS) {
      let obj: THREE.Group | null = null;
      if (p.kind === "planet") {
        obj = buildPlanet(p);
        this.planets.push(obj);
      } else if (p.kind === "station") {
        obj = buildRingforge(p);
        this.spinners.push(obj.userData.spin);
      } else if (p.kind === "outpost") {
        obj = buildOutpost(p);
        this.spinners.push(obj.userData.spin);
      } else if (p.kind === "haven") {
        obj = buildHaven(p);
      } else if (p.kind === "derelict") {
        obj = buildDerelict(p);
      }
      if (obj) this.group.add(obj);
      if (p.kind === "belt" || p.kind === "derelict" || p.kind === "haven") this.group.add(beltDust(p, p.color, p.id.length * 13));
    }
    // The quest beacon just south of the station.
    this.beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
    this.beacon.position.set(0, 1.5, 70);
    this.group.add(this.beacon);
    // The forcefield edge.
    const edge = new THREE.Mesh(
      new THREE.RingGeometry(SPACE_RADIUS - 2, SPACE_RADIUS, 256),
      new THREE.MeshBasicMaterial({ color: 0x7f9fff, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })
    );
    edge.rotation.x = -Math.PI / 2;
    this.group.add(edge);
  }

  update(time: number, camera: THREE.Camera): void {
    this.sky.position.copy(camera.position);
    for (const p of this.planets) (p.userData.body as THREE.Mesh).rotation.y = time * 0.02;
    for (const s of this.spinners) s.rotation.y = time * 0.08;
    this.beacon.rotation.y = time * 2;
    this.beacon.scale.setScalar(1 + Math.sin(time * 4) * 0.15);
  }
}
