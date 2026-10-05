// Water: one animated material (ripples, sparkles, flowing streaks along a per-vertex flow
// direction) used by the sea, river surfaces and fountain basins, plus the fountain spray
// simulation (droplets with gravity that splash into the basin).

import * as THREE from "three";
import { worldUniforms } from "./builder";

let flowingMat: THREE.MeshStandardMaterial | null = null;
let stillMat: THREE.MeshStandardMaterial | null = null;

function makeWater(flowing: boolean): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: flowing ? "#66cde6" : "#5cc6e8",
    roughness: 0.28,
    metalness: 0.02,
    transparent: true,
    opacity: flowing ? 0.86 : 0.8,
    flatShading: true
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = worldUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uTime;
         attribute vec2 flow;
         varying vec2 vFlow;
         varying vec3 vWorld;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         vec4 wpos = modelMatrix * vec4(position, 1.0);
         vWorld = wpos.xyz;
         vFlow = flow;
         float amp = ${flowing ? "0.035" : "0.06"};
         transformed.y += sin(wpos.x * 0.55 + uTime * 1.3) * amp + cos(wpos.z * 0.48 + uTime * 1.1) * amp;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         uniform float uTime;
         varying vec2 vFlow;
         varying vec3 vWorld;`
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
         // Scroll the pattern downstream (rivers) or let it shimmer in place (still water).
         vec2 p = vWorld.xz - vFlow * uTime * 1.6;
         float w1 = sin(p.x * 1.7 + sin(p.y * 0.9 + uTime * 0.7) * 1.3);
         float w2 = sin(p.y * 1.9 + sin(p.x * 1.1 - uTime * 0.6) * 1.2);
         float ripple = smoothstep(0.75, 1.0, w1 * w2);
         float speed = length(vFlow);
         // Foam streaks along the current.
         vec2 along = vFlow / max(speed, 1e-3);
         float streak = smoothstep(0.82, 1.0, sin(dot(p, vec2(-along.y, along.x)) * 3.0 + sin(dot(p, along) * 0.8) * 2.0)) * speed;
         float sparkle = pow(max(0.0, sin(vWorld.x * 7.3 + uTime * 2.1) * sin(vWorld.z * 6.1 - uTime * 1.7)), 24.0);
         totalEmissiveRadiance += vec3(0.85, 0.95, 1.0) * (ripple * 0.18 + streak * 0.35 + sparkle * 0.9);`
      );
  };
  mat.customProgramCacheKey = () => (flowing ? "water-flow" : "water-still");
  return mat;
}

export function flowingWaterMaterial(): THREE.MeshStandardMaterial {
  return (flowingMat ??= makeWater(true));
}

export function stillWaterMaterial(): THREE.MeshStandardMaterial {
  return (stillMat ??= makeWater(false));
}

/** Give a geometry a zero flow attribute so it can use the water material. */
export function withStillFlow(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const n = g.getAttribute("position").count;
  g.setAttribute("flow", new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}

// ── fountains ────────────────────────────────────────────────────────────────

export interface FountainSpec {
  x: number;
  y: number;
  /** Height of the basin water surface. */
  water: number;
  /** Basin radius. */
  r: number;
  /** Spouts: height above ground and outward spray speed. */
  spouts: { h: number; out: number; up: number; ring: number }[];
}

const MAX_DROPS = 700;

interface Drop {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  floor: number;
}

interface Ripple {
  mesh: THREE.Mesh;
  t: number;
}

export class Fountains {
  readonly group = new THREE.Group();
  private drops: Drop[] = [];
  private next = 0;
  private dropMesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private ripples: Ripple[] = [];
  private ripplePool: THREE.Mesh[] = [];
  private emitAcc = 0;

  constructor(private specs: FountainSpec[]) {
    for (const f of specs) {
      const g = withStillFlow(new THREE.CircleGeometry(f.r, 28).rotateX(-Math.PI / 2));
      const surface = new THREE.Mesh(g, stillWaterMaterial());
      surface.position.set(f.x, f.water, f.y);
      surface.receiveShadow = true;
      this.group.add(surface);
    }
    this.dropMesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshBasicMaterial({ color: 0xd9f6ff, transparent: true, opacity: 0.85 }),
      MAX_DROPS
    );
    this.dropMesh.frustumCulled = false;
    for (let i = 0; i < MAX_DROPS; i += 1) {
      this.drops.push({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, floor: 0 });
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.dropMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.group.add(this.dropMesh);
  }

  private ripple(x: number, y: number, z: number, size: number): void {
    const mesh =
      this.ripplePool.pop() ??
      new THREE.Mesh(
        new THREE.RingGeometry(0.75, 1, 20).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false })
      );
    mesh.position.set(x, y + 0.01, z);
    mesh.userData.size = size;
    mesh.visible = true;
    if (!mesh.parent) this.group.add(mesh);
    this.ripples.push({ mesh, t: 0 });
  }

  /** Public so swimmers can make ripples too. */
  addRipple(x: number, y: number, z: number, size = 0.6): void {
    if (this.ripples.length < 120) this.ripple(x, y, z, size);
  }

  update(dt: number, camX: number, camZ: number): void {
    // Emit from fountains near the camera.
    this.emitAcc += dt;
    const emits = Math.floor(this.emitAcc / 0.012);
    this.emitAcc -= emits * 0.012;
    for (const f of this.specs) {
      if (Math.hypot(f.x - camX, f.y - camZ) > 70) continue;
      for (let e = 0; e < emits; e += 1) {
        for (const s of f.spouts) {
          const a = Math.random() * Math.PI * 2;
          const d = this.drops[this.next];
          this.next = (this.next + 1) % MAX_DROPS;
          d.alive = true;
          d.x = f.x + Math.cos(a) * s.ring;
          d.z = f.y + Math.sin(a) * s.ring;
          d.y = s.h;
          const out = s.out * (0.85 + Math.random() * 0.3);
          d.vx = Math.cos(a) * out;
          d.vz = Math.sin(a) * out;
          d.vy = s.up * (0.85 + Math.random() * 0.3);
          d.floor = f.water;
        }
      }
    }
    for (let i = 0; i < MAX_DROPS; i += 1) {
      const d = this.drops[i];
      if (d.alive) {
        d.vy -= 9.8 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.z += d.vz * dt;
        if (d.y <= d.floor && d.vy < 0) {
          d.alive = false;
          if (Math.random() < 0.12) this.addRipple(d.x, d.floor, d.z, 0.35 + Math.random() * 0.3);
        }
      }
      if (d.alive) {
        this.dummy.position.set(d.x, d.y, d.z);
        const s = 0.045;
        this.dummy.scale.set(s, s * (1 + Math.min(2, Math.abs(d.vy) * 0.25)), s);
      } else {
        this.dummy.scale.setScalar(0);
      }
      this.dummy.updateMatrix();
      this.dropMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.dropMesh.instanceMatrix.needsUpdate = true;
    this.ripples = this.ripples.filter((r) => {
      r.t += dt;
      const k = r.t / 0.9;
      const size = r.mesh.userData.size as number;
      r.mesh.scale.setScalar(size * (0.3 + k * 1.4));
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - k);
      if (k >= 1) {
        r.mesh.visible = false;
        this.ripplePool.push(r.mesh);
        return false;
      }
      return true;
    });
  }
}
