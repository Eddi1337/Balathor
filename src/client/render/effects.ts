// Visual effects: projectiles, pooled particles, swing arcs, stylised sunbeams that slant
// through the canopy (camera-independent "god rays"), and night-time fireflies.

import * as THREE from "three";
import type { ProjectileKind } from "../../shared/protocol";
import type { BuffId, ZoneKind } from "../../shared/game/talents";
import type { MapDef } from "../../shared/world/maps";
import { Tile } from "../../shared/world/tiles";
import { hash2 } from "../../shared/math";

// ── particles ────────────────────────────────────────────────────────────────

const MAX_PARTICLES = 900;

interface Particle {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  gravity: number;
  spin: number;
}

export class Particles {
  readonly mesh: THREE.InstancedMesh;
  private ps: Particle[] = [];
  private next = 0;
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();

  constructor() {
    const geo = new THREE.OctahedronGeometry(1, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      this.ps.push({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 0, gravity: 0, spin: 0 });
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, this.color.set(0xffffff));
    }
  }

  emit(x: number, y: number, z: number, opts: { n: number; color: THREE.ColorRepresentation; speed?: number; up?: number; life?: number; size?: number; gravity?: number; spread?: number }): void {
    const c = this.color.set(opts.color);
    for (let k = 0; k < opts.n; k += 1) {
      const i = this.next;
      this.next = (this.next + 1) % MAX_PARTICLES;
      const p = this.ps[i];
      const a = Math.random() * Math.PI * 2;
      const sp = (opts.speed ?? 2) * (0.4 + Math.random() * 0.8);
      const spread = opts.spread ?? 0.2;
      p.alive = true;
      p.x = x + (Math.random() - 0.5) * spread;
      p.y = y + (Math.random() - 0.5) * spread;
      p.z = z + (Math.random() - 0.5) * spread;
      p.vx = Math.cos(a) * sp;
      p.vz = Math.sin(a) * sp;
      p.vy = (opts.up ?? 2) * (0.5 + Math.random());
      p.max = p.life = (opts.life ?? 0.7) * (0.7 + Math.random() * 0.6);
      p.size = (opts.size ?? 0.08) * (0.7 + Math.random() * 0.6);
      p.gravity = opts.gravity ?? 6;
      p.spin = Math.random() * 6;
      this.mesh.setColorAt(i, c);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      const p = this.ps[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        this.dummy.scale.setScalar(0);
      } else {
        p.vy -= p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vx *= 0.96;
        p.vz *= 0.96;
        const k = p.life / p.max;
        this.dummy.position.set(p.x, p.y, p.z);
        this.dummy.rotation.set(p.spin * k, p.spin * 1.3 * k, 0);
        this.dummy.scale.setScalar(p.size * (0.3 + k * 0.7));
      }
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ── projectiles ──────────────────────────────────────────────────────────────

interface Proj {
  obj: THREE.Object3D;
  kind: ProjectileKind;
  x: number;
  y: number;
  h: number;
  dx: number;
  dy: number;
  spd: number;
  remaining: number;
  trailT: number;
  total: number;
}

const PROJ_COLORS: Record<ProjectileKind, string> = {
  arrow: "#fff4e6",
  fireball: "#ff9a3c",
  frostbolt: "#9fe7ff",
  emberball: "#ff6a3c",
  arcane: "#d9a6ff",
  laser: "#5ff6ff",
  laser_red: "#ff4f6a",
  plasma: "#b98cff",
  cannonball: "#c9c3b8",
  shot: "#e0d6c9"
};

const ZONE_COLORS: Record<ZoneKind, string> = {
  arrows: "#fff4e6",
  caltrops: "#c9c3b8",
  inferno: "#ff7a3c",
  blizzard: "#bfefff",
  consecration: "#ffd166"
};

const BUFF_COLORS: Record<BuffId, string> = {
  shield: "#8fe3ff",
  evasion: "#e8f7ff",
  camo: "#7fd66b",
  fortify: "#ffd166",
  haste: "#b9a3ff",
  rage: "#ff6f8e",
  regen: "#9dffb8"
};

interface ZoneFx {
  kind: ZoneKind;
  x: number;
  y: number;
  r: number;
  until: number;
  disc: THREE.Mesh;
  emitT: number;
}

function buildProjectile(kind: ProjectileKind): THREE.Object3D {
  if (kind === "arrow") {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 5), new THREE.MeshBasicMaterial({ color: 0x9a6b4f }));
    shaft.rotation.x = Math.PI / 2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 5), new THREE.MeshBasicMaterial({ color: 0xe8edf2 }));
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.46;
    const fl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.16), new THREE.MeshBasicMaterial({ color: 0xff8fb1 }));
    fl.position.z = -0.35;
    g.add(shaft, tip, fl);
    return g;
  }
  const col = new THREE.Color(PROJ_COLORS[kind]);
  const g = new THREE.Group();
  if (kind === "cannonball" || kind === "shot") {
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(kind === "cannonball" ? 0.26 : 0.08, 1), new THREE.MeshStandardMaterial({ color: 0x2b2238, roughness: 0.4, metalness: 0.6, flatShading: true }));
    g.add(ball);
    return g;
  }
  if (kind === "laser" || kind === "laser_red") {
    // A bright elongated bolt pointing along +z (the flight direction).
    const bolt = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.9, 2, 6), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2.4) }));
    bolt.rotation.x = Math.PI / 2;
    const glow = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 1.0, 2, 6),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    glow.rotation.x = Math.PI / 2;
    g.add(bolt, glow);
    return g;
  }
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(kind === "fireball" ? 0.26 : 0.2, 1), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2.2) }));
  const halo = new THREE.Mesh(
    new THREE.IcosahedronGeometry(kind === "fireball" ? 0.45 : 0.34, 1),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  g.add(core, halo);
  return g;
}

// ── sunbeams ─────────────────────────────────────────────────────────────────

const BEAM_COUNT = 16;

function beamMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: { uTime: { value: 0 }, uStrength: { value: 0 }, uColor: { value: new THREE.Color("#ffe7a8") }, uSeed: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uStrength; uniform vec3 uColor; uniform float uSeed;
      varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      void main() {
        // Soft edges (view-facing core), fade toward both ends, slow shimmer bands.
        float edge = pow(abs(dot(normalize(vN), normalize(vView))), 1.6);
        float ends = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
        float shimmer = 0.75 + 0.25 * sin(vUv.y * 9.0 - uTime * 0.9 + uSeed * 6.0);
        float a = edge * ends * shimmer * uStrength;
        gl_FragColor = vec4(uColor * a, a);
      }`
  });
}

// ── swing arcs ───────────────────────────────────────────────────────────────

interface Arc {
  mesh: THREE.Mesh;
  t: number;
}

export class Effects {
  readonly group = new THREE.Group();
  readonly particles = new Particles();
  private projectiles = new Map<number, Proj>();
  private arcs: Arc[] = [];
  private zones = new Map<number, ZoneFx>();
  private beams: THREE.Mesh[] = [];
  private beamRefreshAt = 0;
  private fireflies: THREE.Points;
  private fireflyBase: Float32Array;
  private heightAt: (x: number, y: number) => number = () => 0;

  constructor() {
    this.group.add(this.particles.mesh);
    // Sunbeams
    const beamGeo = new THREE.CylinderGeometry(0.9, 1.6, 14, 10, 1, true);
    beamGeo.translate(0, 7, 0);
    for (let i = 0; i < BEAM_COUNT; i += 1) {
      const m = new THREE.Mesh(beamGeo, beamMaterial());
      m.visible = false;
      m.renderOrder = 5;
      (m.material as THREE.ShaderMaterial).uniforms.uSeed.value = Math.random();
      this.beams.push(m);
      this.group.add(m);
    }
    // Fireflies
    const n = 70;
    this.fireflyBase = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    this.fireflies = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0xfff27a, size: 0.16, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.fireflies.frustumCulled = false;
    this.group.add(this.fireflies);
  }

  setHeightFn(fn: (x: number, y: number) => number): void {
    this.heightAt = fn;
  }

  spawnProjectile(pid: number, kind: ProjectileKind, x: number, y: number, a: number, spd: number, rng: number): void {
    const obj = buildProjectile(kind);
    const h = this.heightAt(x, y) + 0.95;
    obj.position.set(x, h, y);
    obj.rotation.y = Math.PI / 2 - a;
    this.group.add(obj);
    this.projectiles.set(pid, { obj, kind, x, y, h, dx: Math.cos(a), dy: Math.sin(a), spd, remaining: rng, trailT: 0, total: rng });
  }

  endProjectile(pid: number, x: number, y: number, burst: number): void {
    const p = this.projectiles.get(pid);
    const kind = p?.kind ?? "arrow";
    if (p) {
      this.group.remove(p.obj);
      disposeObject(p.obj);
      this.projectiles.delete(pid);
    }
    const h = (p?.h ?? this.heightAt(x, y) + 0.9);
    if (kind === "arrow") {
      this.particles.emit(x, h, y, { n: 5, color: "#fff4e6", speed: 1.5, up: 1, size: 0.05 });
    } else {
      const col = PROJ_COLORS[kind];
      this.particles.emit(x, h, y, { n: burst > 0 ? 26 : 12, color: col, speed: burst > 0 ? 4 + burst : 2.5, up: 2.5, size: 0.11, life: 0.6 });
      this.particles.emit(x, h, y, { n: 8, color: "#fff3b0", speed: 1.5, up: 3, size: 0.06, life: 0.8 });
      if (burst > 0) this.ring(x, y, burst, col);
    }
  }

  /** Expanding ground ring (splash damage, level-up). */
  ring(x: number, y: number, radius: number, color: THREE.ColorRepresentation): void {
    const geo = new THREE.RingGeometry(0.8, 1, 32);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    mesh.position.set(x, this.heightAt(x, y) + 0.08, y);
    mesh.userData.radius = radius;
    this.group.add(mesh);
    this.arcs.push({ mesh, t: 0 });
  }

  swing(x: number, y: number, a: number, reach: number, color: THREE.ColorRepresentation = "#ffffff"): void {
    const arc = (110 * Math.PI) / 180;
    const geo = new THREE.RingGeometry(reach * 0.35, reach, 18, 1, -arc / 2, arc);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    mesh.position.set(x, this.heightAt(x, y) + 0.8, y);
    mesh.rotation.y = -a;
    mesh.userData.radius = 0;
    this.group.add(mesh);
    this.arcs.push({ mesh, t: 0 });
  }

  zone(zid: number, kind: ZoneKind, x: number, y: number, r: number, durMs: number): void {
    const color = ZONE_COLORS[kind];
    const geo = new THREE.CircleGeometry(1, 40);
    geo.rotateX(-Math.PI / 2);
    const disc = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    disc.scale.setScalar(r);
    disc.position.set(x, this.heightAt(x, y) + 0.07, y);
    this.group.add(disc);
    this.zones.set(zid, { kind, x, y, r, until: performance.now() + durMs, disc, emitT: 0 });
    this.ring(x, y, r, color);
  }

  private updateZones(dt: number, now: number): void {
    for (const [zid, z] of this.zones) {
      const left = z.until - now;
      const mat = z.disc.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.32 * Math.min(1, left / 400) * (0.85 + Math.sin(now / 120) * 0.15);
      if (left <= 0) {
        this.group.remove(z.disc);
        disposeObject(z.disc);
        this.zones.delete(zid);
        continue;
      }
      z.emitT -= dt;
      if (z.emitT > 0) continue;
      z.emitT = 0.05;
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * z.r;
      const px = z.x + Math.cos(a) * rr;
      const py = z.y + Math.sin(a) * rr;
      const h = this.heightAt(px, py);
      switch (z.kind) {
        case "arrows":
          this.particles.emit(px, h + 6, py, { n: 1, color: "#fff4e6", speed: 0, up: -16, size: 0.07, life: 0.4, gravity: 10, spread: 0 });
          this.particles.emit(px, h + 0.1, py, { n: 2, color: "#d9c4a0", speed: 1, up: 1, size: 0.04, life: 0.3 });
          break;
        case "inferno":
          this.particles.emit(px, h + 0.2, py, { n: 2, color: Math.random() < 0.5 ? "#ff9a3c" : "#ffd166", speed: 0.3, up: 2.5, size: 0.13, life: 0.7, gravity: -1 });
          break;
        case "blizzard":
          this.particles.emit(px, h + 4, py, { n: 2, color: "#ffffff", speed: 0.6, up: -2, size: 0.06, life: 1.4, gravity: 1 });
          break;
        case "consecration":
          this.particles.emit(px, h + 0.1, py, { n: 1, color: "#fff3b0", speed: 0.1, up: 1.4, size: 0.07, life: 1, gravity: -0.5 });
          break;
        case "caltrops":
          if (Math.random() < 0.3) this.particles.emit(px, h + 0.05, py, { n: 1, color: "#a9a9b3", speed: 0.2, up: 0.4, size: 0.05, life: 0.5 });
          break;
      }
    }
  }

  nova(x: number, y: number, r: number, color: THREE.ColorRepresentation): void {
    this.ring(x, y, r, color);
    const h = this.heightAt(x, y) + 0.6;
    for (let i = 0; i < 24; i += 1) {
      const a = (i / 24) * Math.PI * 2;
      this.particles.emit(x + Math.cos(a) * 0.5, h, y + Math.sin(a) * 0.5, { n: 1, color, speed: r * 2.4, up: 1, size: 0.1, life: 0.45, gravity: 2, spread: 0 });
    }
  }

  buffBurst(x: number, y: number, buff: BuffId): void {
    const h = this.heightAt(x, y);
    const color = BUFF_COLORS[buff];
    this.particles.emit(x, h + 0.4, y, { n: 18, color, speed: 1.4, up: 2.5, size: 0.08, life: 1, gravity: -0.5, spread: 0.6 });
    this.ring(x, y, 1.6, color);
  }

  static buffColor(buff: BuffId): string {
    return BUFF_COLORS[buff];
  }

  hitSpark(x: number, y: number, h: number, crit: boolean): void {
    this.particles.emit(x, h, y, { n: crit ? 16 : 9, color: crit ? "#ffd166" : "#ffffff", speed: crit ? 4 : 3, up: 2.5, size: crit ? 0.1 : 0.07, life: 0.45 });
  }

  poof(x: number, y: number, h: number, color: THREE.ColorRepresentation): void {
    this.particles.emit(x, h, y, { n: 18, color, speed: 2.4, up: 2.5, size: 0.16, life: 0.8, gravity: 2, spread: 0.6 });
    this.particles.emit(x, h + 0.3, y, { n: 8, color: "#fff3b0", speed: 1.5, up: 3.5, size: 0.07, life: 1, gravity: 1 });
  }

  sparkleColumn(x: number, y: number, color: THREE.ColorRepresentation): void {
    const h = this.heightAt(x, y);
    for (let i = 0; i < 6; i += 1) {
      this.particles.emit(x, h + i * 0.4, y, { n: 6, color, speed: 1.2, up: 1.5, size: 0.09, life: 1.4, gravity: -1, spread: 0.8 });
    }
    this.ring(x, y, 2.2, color);
  }

  /**
   * Place sunbeams near the camera target: slanted along the sun, favouring spots beside
   * trees (light falling through the canopy) and the town plaza.
   */
  updateBeams(map: MapDef, cx: number, cy: number, sunDir: THREE.Vector3, daylight: number, now: number, cam?: THREE.Vector3): void {
    const strength = Math.max(0, daylight) * 0.42;
    if (now >= this.beamRefreshAt) {
      this.beamRefreshAt = now + 1800;
      const spots: { x: number; y: number }[] = [];
      const R = 26;
      for (let gy = Math.floor(cy - R); gy <= cy + R && spots.length < BEAM_COUNT * 3; gy += 3) {
        for (let gx = Math.floor(cx - R); gx <= cx + R; gx += 3) {
          const qx = Math.floor(gx / 3) * 3;
          const qy = Math.floor(gy / 3) * 3;
          if (hash2(qx, qy, 777) > 0.18) continue;
          const t = map.tileAt(qx, qy);
          const nearTree =
            map.tileAt(qx + 1, qy) === Tile.TREE || map.tileAt(qx - 1, qy) === Tile.TREE || map.tileAt(qx, qy + 1) === Tile.PINE || map.tileAt(qx, qy - 1) === Tile.TREE;
          if (t === Tile.PLAZA || nearTree || (t === Tile.DARK_GRASS && hash2(qx, qy, 778) < 0.5)) spots.push({ x: qx + 0.5, y: qy + 0.5 });
        }
      }
      spots.sort((a, b) => (a.x - cx) ** 2 + (a.y - cy) ** 2 - ((b.x - cx) ** 2 + (b.y - cy) ** 2));
      this.beams.forEach((beam, i) => {
        const s = spots[i];
        beam.visible = Boolean(s);
        if (!s) return;
        beam.position.set(s.x, this.heightAt(s.x, s.y) - 0.3, s.y);
        beam.userData.base = 0.6 + hash2(Math.floor(s.x), Math.floor(s.y), 779) * 0.6;
      });
    }
    // Tilt every beam toward the sun.
    const tilt = Math.acos(Math.min(1, Math.max(-1, sunDir.y)));
    const az = Math.atan2(sunDir.x, sunDir.z);
    for (const beam of this.beams) {
      if (!beam.visible) continue;
      beam.rotation.set(0, 0, 0);
      beam.rotateY(az);
      beam.rotateX(Math.min(0.7, tilt));
      // Fade a beam out as the camera nears it: from the inside, it would wash out the screen.
      let fade = 1;
      if (cam) {
        const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(beam.quaternion);
        const v = cam.clone().sub(beam.position);
        const t = Math.max(0, Math.min(14, v.dot(dir)));
        const d = v.sub(dir.multiplyScalar(t)).length();
        fade = Math.min(1, Math.max(0, (d - 2.2) / 3));
      }
      const mat = beam.material as THREE.ShaderMaterial;
      mat.uniforms.uStrength.value = strength * (beam.userData.base ?? 1) * fade;
      mat.uniforms.uTime.value = now / 1000;
    }
  }

  updateFireflies(cx: number, cy: number, night: number, time: number): void {
    const mat = this.fireflies.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, night - 0.2) * 1.2;
    if (mat.opacity <= 0) return;
    const pos = this.fireflies.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i += 1) {
      let bx = this.fireflyBase[i * 3];
      let bz = this.fireflyBase[i * 3 + 2];
      if ((bx - cx) ** 2 + (bz - cy) ** 2 > 30 * 30 || (bx === 0 && bz === 0)) {
        bx = cx + (Math.random() - 0.5) * 50;
        bz = cy + (Math.random() - 0.5) * 50;
        this.fireflyBase[i * 3] = bx;
        this.fireflyBase[i * 3 + 1] = this.heightAt(bx, bz) + 0.6 + Math.random() * 1.6;
        this.fireflyBase[i * 3 + 2] = bz;
      }
      pos.setXYZ(
        i,
        bx + Math.sin(time * 0.7 + i) * 0.6,
        this.fireflyBase[i * 3 + 1] + Math.sin(time * 1.3 + i * 1.7) * 0.25,
        bz + Math.cos(time * 0.6 + i * 0.5) * 0.6
      );
    }
    pos.needsUpdate = true;
  }

  update(dt: number): void {
    this.particles.update(dt);
    this.updateZones(dt, performance.now());
    for (const [pid, p] of this.projectiles) {
      const step = Math.min(p.remaining, p.spd * dt);
      p.remaining -= step;
      p.x += p.dx * step;
      p.y += p.dy * step;
      // Cannonballs fly in a lazy arc.
      const lob = p.kind === "cannonball" ? Math.sin((1 - p.remaining / Math.max(0.01, p.total)) * Math.PI) * Math.min(3, p.total * 0.12) : 0;
      p.obj.position.set(p.x, p.h + lob, p.y);
      if (p.kind === "cannonball" || p.kind === "shot") {
        p.trailT -= dt;
        if (p.trailT <= 0) {
          p.trailT = 0.04;
          this.particles.emit(p.x, p.h + lob, p.y, { n: 1, color: "#e8e4dc", speed: 0.2, up: 0.4, size: p.kind === "shot" ? 0.06 : 0.14, life: 0.5, gravity: 0 });
        }
      } else if (p.kind !== "arrow") {
        p.trailT -= dt;
        if (p.trailT <= 0) {
          p.trailT = 0.03;
          this.particles.emit(p.x, p.h, p.y, { n: 2, color: PROJ_COLORS[p.kind], speed: 0.4, up: 0.6, size: 0.08, life: 0.35, gravity: 0 });
        }
        p.obj.rotation.y += dt * 8;
      }
      // Safety: the server always sends projEnd, but never leave strays around.
      if (p.remaining <= 0) {
        p.remaining = -1;
        setTimeout(() => {
          if (this.projectiles.get(pid) === p) this.endProjectile(pid, p.x, p.y, 0);
        }, 400);
      }
    }
    this.arcs = this.arcs.filter((a) => {
      a.t += dt;
      const mat = a.mesh.material as THREE.MeshBasicMaterial;
      const radius = a.mesh.userData.radius as number;
      if (radius > 0) {
        const k = a.t / 0.5;
        a.mesh.scale.setScalar(0.2 + k * radius);
        mat.opacity = 0.8 * (1 - k);
        if (k >= 1) {
          this.group.remove(a.mesh);
          disposeObject(a.mesh);
          return false;
        }
      } else {
        const k = a.t / 0.22;
        mat.opacity = 0.55 * (1 - k);
        a.mesh.scale.setScalar(0.8 + k * 0.3);
        if (k >= 1) {
          this.group.remove(a.mesh);
          disposeObject(a.mesh);
          return false;
        }
      }
      return true;
    });
  }
}

function disposeObject(o: THREE.Object3D): void {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
  });
}
