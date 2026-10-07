// The Stargate: a standing ring with glowing chevrons and a shimmering event horizon. Stone and
// runes on the island, brushed metal on Ringforge Station.

import * as THREE from "three";
import { GeometryBuilder, PRIMS, sceneryMaterial, worldUniforms } from "./builder";

function horizonMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: worldUniforms.uTime },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        float a = atan(p.y, p.x);
        float swirl = sin(a * 3.0 + r * 9.0 - uTime * 2.2) * 0.5 + 0.5;
        float ripple = sin(r * 18.0 - uTime * 4.0) * 0.5 + 0.5;
        vec3 deep = vec3(0.25, 0.45, 1.0);
        vec3 bright = vec3(0.65, 0.95, 1.0);
        vec3 col = mix(deep, bright, swirl * 0.6 + ripple * 0.25);
        float alpha = (0.55 + 0.35 * swirl) * smoothstep(1.0, 0.82, r) + smoothstep(0.75, 1.0, r) * 0.4;
        gl_FragColor = vec4(col * (1.0 + (1.0 - r) * 0.6), alpha);
      }`
  });
}

/**
 * A stargate standing on the ground at the origin, ring plane = local XY (it faces ±z). Rotate
 * the returned group to face where you want.
 */
export function buildStargate(style: "stone" | "metal" | "sea", radius = 2.9): THREE.Group {
  const g = new THREE.Group();
  const b = new GeometryBuilder();
  const ringColor = style === "stone" ? "#c9c0d4" : style === "sea" ? "#ff9f8a" : "#9aa6b8";
  const trim = style === "stone" ? "#a99fb8" : style === "sea" ? "#3f8fb0" : "#5a6478";
  const glow = style === "stone" ? "#b98cff" : style === "sea" ? "#9ff0e8" : "#5ff6ff";
  const segs = 18;
  const cy = radius + 0.25;
  for (let i = 0; i < segs; i += 1) {
    const a = (i / segs) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    b.add(PRIMS.box, { x, y, z: 0, sx: 0.62, sy: (Math.PI * 2 * radius) / segs + 0.08, sz: 0.7, rz: a, color: i % 2 ? ringColor : trim, jitter: style === "stone" ? 0.08 : 0 });
    if (i % 2 === 0) {
      // Chevrons
      b.add(PRIMS.cone4, { x: Math.cos(a) * (radius + 0.35), y: cy + Math.sin(a) * (radius + 0.35), z: 0, sx: 0.22, sy: 0.32, sz: 0.25, rz: a - Math.PI / 2, color: glow, glow: 1.8 });
    } else {
      b.add(PRIMS.box, { x: Math.cos(a) * (radius - 0.28), y: cy + Math.sin(a) * (radius - 0.28), z: 0.36, sx: 0.12, sy: 0.12, sz: 0.04, rz: a, color: glow, glow: 1.2 });
    }
  }
  // Feet / plinth
  for (const s of [-1, 1]) b.add(PRIMS.box, { x: s * (radius - 0.4), y: 0.35, z: 0, sx: 0.9, sy: 0.7, sz: 1.2, color: trim });
  b.add(PRIMS.box, { x: 0, y: 0.1, z: 0, sx: radius * 2.4, sy: 0.2, sz: 1.6, color: trim });
  for (let i = -2; i <= 2; i += 1) b.add(PRIMS.box, { x: i * 0.8, y: 0.06, z: 1.6, sx: 0.7, sy: 0.12, sz: 1.4, color: ringColor });
  const ring = new THREE.Mesh(b.build(), sceneryMaterial());
  ring.castShadow = true;
  ring.receiveShadow = true;
  g.add(ring);
  const horizon = new THREE.Mesh(new THREE.CircleGeometry(radius - 0.32, 40), horizonMaterial());
  horizon.position.set(0, cy, 0);
  g.add(horizon);
  const light = new THREE.PointLight(style === "stone" ? 0x9fb8ff : style === "sea" ? 0x7fffe0 : 0x7fe8ff, 6, 12, 1.6);
  light.position.set(0, cy, 1.2);
  g.add(light);
  return g;
}
