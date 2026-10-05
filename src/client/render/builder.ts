// Merged-geometry builder for static scenery. Each chunk (and the town) becomes ONE mesh with
// vertex colours plus two custom attributes:
//   sway — foliage wind weight (0 = rigid)
//   glow — emissive strength; > 0 always glows, < 0 glows only at night (|glow| × night)
// so the whole static world renders with a single shared material.

import * as THREE from "three";

export const worldUniforms = {
  uTime: { value: 0 },
  uNight: { value: 0 }
};

let sharedMaterial: THREE.MeshStandardMaterial | null = null;

export function sceneryMaterial(): THREE.MeshStandardMaterial {
  if (sharedMaterial) return sharedMaterial;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = worldUniforms.uTime;
    shader.uniforms.uNight = worldUniforms.uNight;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
         attribute float sway;
         attribute float glow;
         varying float vGlow;
         uniform float uTime;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         vGlow = glow;
         if (sway > 0.0) {
           vec4 wp = modelMatrix * vec4(position, 1.0);
           float gust = 0.55 + 0.45 * sin(uTime * 0.45 + wp.x * 0.02);
           float s = sway * 0.085 * gust;
           transformed.x += sin(uTime * 1.7 + wp.x * 0.35 + wp.z * 0.27) * s;
           transformed.z += cos(uTime * 1.3 + wp.x * 0.21 + wp.z * 0.33) * s * 0.7;
         }`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         varying float vGlow;
         uniform float uNight;`
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
         float glowAmt = vGlow > 0.0 ? vGlow : -vGlow * uNight;
         totalEmissiveRadiance += vColor.rgb * glowAmt;`
      );
  };
  sharedMaterial = mat;
  return mat;
}

// Primitive templates (non-indexed so every triangle is flat-shaded).
/** Non-indexed copy (each triangle gets its own vertices → faceted shading). */
function flat(g: THREE.BufferGeometry): THREE.BufferGeometry {
  return g.index ? g.toNonIndexed() : g;
}

export const PRIMS = {
  box: flat(new THREE.BoxGeometry(1, 1, 1)),
  ico: flat(new THREE.IcosahedronGeometry(1, 0)),
  ico1: flat(new THREE.IcosahedronGeometry(1, 1)),
  dodeca: flat(new THREE.DodecahedronGeometry(1, 0)),
  octa: flat(new THREE.OctahedronGeometry(1, 0)),
  cone6: flat(new THREE.ConeGeometry(1, 1, 6, 1)),
  cone8: flat(new THREE.ConeGeometry(1, 1, 8, 1)),
  cone4: flat(new THREE.ConeGeometry(1, 1, 4, 1)),
  cyl6: flat(new THREE.CylinderGeometry(1, 1, 1, 6, 1)),
  cyl8: flat(new THREE.CylinderGeometry(1, 1, 1, 8, 1)),
  cyl12: flat(new THREE.CylinderGeometry(1, 1, 1, 12, 1)),
  taper6: flat(new THREE.CylinderGeometry(0.7, 1, 1, 6, 1)),
  torus: flat(new THREE.TorusGeometry(1, 0.18, 6, 12)),
  prism: makePrism()
};

/** Triangular prism (a roof): base width 1 on x, ridge along z, height 1. Centred on origin base. */
function makePrism(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.lineTo(0.5, 0);
  s.lineTo(0, 1);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g.index ? g.toNonIndexed() : g;
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const tmpC = new THREE.Color();

export interface PartOpts {
  x: number;
  y: number;
  z: number;
  sx?: number;
  sy?: number;
  sz?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  color: THREE.ColorRepresentation;
  sway?: number;
  glow?: number;
  /** Per-vertex colour jitter (0..1) for a hand-painted feel. */
  jitter?: number;
}

export class GeometryBuilder {
  positions: number[] = [];
  colors: number[] = [];
  sway: number[] = [];
  glow: number[] = [];

  /** Append a transformed primitive. */
  add(prim: THREE.BufferGeometry, o: PartOpts): void {
    tmpP.set(o.x, o.y, o.z);
    tmpE.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
    tmpQ.setFromEuler(tmpE);
    tmpS.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
    tmpM.compose(tmpP, tmpQ, tmpS);
    const pos = prim.getAttribute("position");
    tmpC.set(o.color);
    const sway = o.sway ?? 0;
    const glow = o.glow ?? 0;
    const jitter = o.jitter ?? 0;
    for (let i = 0; i < pos.count; i += 3) {
      // One colour per triangle keeps the faceted look.
      const j = jitter ? 1 + (Math.random() - 0.5) * jitter : 1;
      for (let k = 0; k < 3; k += 1) {
        tmpV.fromBufferAttribute(pos, i + k).applyMatrix4(tmpM);
        this.positions.push(tmpV.x, tmpV.y, tmpV.z);
        this.colors.push(tmpC.r * j, tmpC.g * j, tmpC.b * j);
        this.sway.push(sway);
        this.glow.push(glow);
      }
    }
  }

  /** Append a raw triangle (used for terrain). */
  tri(ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number, color: THREE.Color): void {
    this.positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    for (let k = 0; k < 3; k += 1) {
      this.colors.push(color.r, color.g, color.b);
      this.sway.push(0);
      this.glow.push(0);
    }
  }

  get vertexCount(): number {
    return this.positions.length / 3;
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.colors, 3));
    g.setAttribute("sway", new THREE.Float32BufferAttribute(this.sway, 1));
    g.setAttribute("glow", new THREE.Float32BufferAttribute(this.glow, 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}
