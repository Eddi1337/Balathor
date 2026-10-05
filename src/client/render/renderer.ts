// Scene, camera rig, global lighting (sun/moon + sky + fog), clouds and the post-processing
// chain (god rays → bloom → vignette → ACES tone mapping).

import * as THREE from "three";
import {
  BlendFunction,
  BloomEffect,
  EffectComposer,
  EffectPass,
  GodRaysEffect,
  KernelSize,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect
} from "postprocessing";
import { clamp, lerp, smoothstep } from "../../shared/math";

export interface Quality {
  shadows: boolean;
  shadowSize: number;
  godRays: boolean;
  bloom: boolean;
  msaa: number;
  pixelRatio: number;
}

export function detectQuality(): Quality {
  const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || matchMedia("(pointer: coarse)").matches;
  const override = new URLSearchParams(location.search).get("quality");
  if (override === "low" || (mobile && override !== "high")) {
    return { shadows: true, shadowSize: 1024, godRays: false, bloom: true, msaa: 0, pixelRatio: Math.min(devicePixelRatio, 1.5) };
  }
  return { shadows: true, shadowSize: 2048, godRays: true, bloom: true, msaa: 4, pixelRatio: Math.min(devicePixelRatio, 2) };
}

/** Palette keyframes over the day (t = 0 midnight, 0.25 sunrise, 0.5 noon, 0.75 sunset). */
const SKY_KEYS: { t: number; top: string; horizon: string; fog: string; sun: string; sunI: number; hemiI: number; ground: string }[] = [
  { t: 0.0, top: "#141a3d", horizon: "#3a3f78", fog: "#2c3263", sun: "#9fb4ff", sunI: 0.55, hemiI: 0.55, ground: "#2b2a4a" },
  { t: 0.2, top: "#2a2d63", horizon: "#7f6fb0", fog: "#6a5f9a", sun: "#c9b6ff", sunI: 0.5, hemiI: 0.6, ground: "#3f3a5a" },
  { t: 0.27, top: "#6fa7e8", horizon: "#ffb39a", fog: "#f2b8a8", sun: "#ffb27a", sunI: 1.6, hemiI: 0.8, ground: "#8a6a5a" },
  { t: 0.36, top: "#58b4ff", horizon: "#cfeeff", fog: "#cfe9ff", sun: "#fff1d6", sunI: 2.6, hemiI: 1.0, ground: "#7a8f5a" },
  { t: 0.5, top: "#4aa9ff", horizon: "#d6f1ff", fog: "#d4eeff", sun: "#fff8e8", sunI: 2.9, hemiI: 1.05, ground: "#7f9a5c" },
  { t: 0.64, top: "#5aa8f5", horizon: "#ffe2c0", fog: "#f6dcc6", sun: "#ffe0b0", sunI: 2.5, hemiI: 1.0, ground: "#8a8a5a" },
  { t: 0.73, top: "#5a6fc9", horizon: "#ff9a7a", fog: "#ef9f8f", sun: "#ff8a5c", sunI: 1.7, hemiI: 0.8, ground: "#8a5a5a" },
  { t: 0.8, top: "#2e2f6e", horizon: "#9a6fa8", fog: "#6f5a8f", sun: "#c9a6ff", sunI: 0.6, hemiI: 0.6, ground: "#3f3a5a" },
  { t: 1.0, top: "#141a3d", horizon: "#3a3f78", fog: "#2c3263", sun: "#9fb4ff", sunI: 0.55, hemiI: 0.55, ground: "#2b2a4a" }
];

function sampleSky(t: number) {
  let i = 0;
  while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1].t <= t) i += 1;
  const a = SKY_KEYS[i];
  const b = SKY_KEYS[i + 1];
  const k = smoothstep(0, 1, (t - a.t) / Math.max(1e-6, b.t - a.t));
  const mix = (x: string, y: string) => new THREE.Color(x).lerp(new THREE.Color(y), k);
  return {
    top: mix(a.top, b.top),
    horizon: mix(a.horizon, b.horizon),
    fog: mix(a.fog, b.fog),
    sun: mix(a.sun, b.sun),
    ground: mix(a.ground, b.ground),
    sunI: lerp(a.sunI, b.sunI, k),
    hemiI: lerp(a.hemiI, b.hemiI, k)
  };
}

export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly composer: EffectComposer;
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly time = { value: 0 };
  /** 0 at noon … 1 at midnight; drives window glow and lamps. */
  night = 0;
  sunDir = new THREE.Vector3(0, 1, -1).normalize();

  // Camera rig (orbit around the target).
  yaw = 0;
  pitch = 0.5;
  distance = 14;
  /** The camera aims this far above the player so the horizon (and sun) stay in frame. */
  lookAbove = 2.2;
  readonly target = new THREE.Vector3();
  private smoothTarget = new THREE.Vector3();

  private sky: THREE.Mesh;
  private skyUniforms: { top: { value: THREE.Color }; horizon: { value: THREE.Color }; sunDir: { value: THREE.Vector3 }; sunColor: { value: THREE.Color }; night: { value: number } };
  private sunDisc: THREE.Mesh;
  private moonDisc: THREE.Mesh;
  private stars: THREE.Points;
  private clouds = new THREE.Group();
  private godRays: GodRaysEffect | null = null;
  private bloom: BloomEffect | null = null;

  constructor(canvas: HTMLCanvasElement, readonly quality: Quality) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: false, depth: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(quality.pixelRatio);
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.3, 420);
    this.scene.fog = new THREE.Fog(0xcfe9ff, 70, 175);

    // Lights
    this.hemi = new THREE.HemisphereLight(0xcfeeff, 0x7f9a5c, 1.0);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
    this.sun.castShadow = quality.shadows;
    this.sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
    const sc = this.sun.shadow.camera;
    sc.left = -38;
    sc.right = 38;
    sc.top = 38;
    sc.bottom = -38;
    sc.near = 1;
    sc.far = 160;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);

    // Sky dome
    this.skyUniforms = {
      top: { value: new THREE.Color("#4aa9ff") },
      horizon: { value: new THREE.Color("#d6f1ff") },
      sunDir: { value: this.sunDir.clone() },
      sunColor: { value: new THREE.Color("#fff8e8") },
      night: { value: 0 }
    };
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(380, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: this.skyUniforms,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform float night;
          varying vec3 vDir;
          void main() {
            float h = clamp(vDir.y, -0.2, 1.0);
            vec3 col = mix(horizon, top, pow(smoothstep(-0.05, 0.75, h), 0.8));
            float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
            col += sunColor * (pow(s, 12.0) * 0.35 + pow(s, 120.0) * 0.6) * (1.0 - night * 0.7);
            gl_FragColor = vec4(col, 1.0);
          }`
      })
    );
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    // Sun & moon discs (the sun is also the god-ray light source).
    this.sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(16, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, depthWrite: false, fog: false })
    );
    this.sunDisc.frustumCulled = false;
    this.scene.add(this.sunDisc);
    this.moonDisc = new THREE.Mesh(
      new THREE.CircleGeometry(9, 20),
      new THREE.MeshBasicMaterial({ color: 0xe8eeff, transparent: true, depthWrite: false, fog: false })
    );
    this.moonDisc.frustumCulled = false;
    this.scene.add(this.moonDisc);

    // Stars (fade in at night)
    const starPos: number[] = [];
    for (let i = 0; i < 600; i += 1) {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      if (u < 0.05) continue;
      starPos.push(Math.cos(a) * r * 360, u * 360, Math.sin(a) * r * 360);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    this.buildClouds();

    // Post-processing
    this.composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType, multisampling: quality.msaa });
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const effects = [];
    if (quality.godRays) {
      this.godRays = new GodRaysEffect(this.camera, this.sunDisc, {
        blendFunction: BlendFunction.SCREEN,
        samples: 48,
        density: 0.94,
        decay: 0.92,
        weight: 0.42,
        exposure: 0.5,
        clampMax: 1,
        resolutionScale: 0.5,
        kernelSize: KernelSize.SMALL,
        blur: true
      });
      effects.push(this.godRays);
    }
    if (quality.bloom) {
      this.bloom = new BloomEffect({ intensity: 0.85, luminanceThreshold: 0.72, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.7 });
      effects.push(this.bloom);
    }
    effects.push(new VignetteEffect({ offset: 0.3, darkness: 0.42 }));
    effects.push(new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }));
    this.composer.addPass(new EffectPass(this.camera, ...effects));

    addEventListener("resize", () => this.resize());
  }

  private buildClouds(): void {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, transparent: true, opacity: 0.92 });
    const puff = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 14; i += 1) {
      const cloud = new THREE.Group();
      const n = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < n; j += 1) {
        const m = new THREE.Mesh(puff, mat);
        const s = 2.2 + Math.random() * 2.6;
        m.scale.set(s * 1.3, s * 0.8, s);
        m.position.set((j - n / 2) * 2.6 + Math.random(), Math.random() * 1.2, Math.random() * 2 - 1);
        m.castShadow = true;
        cloud.add(m);
      }
      cloud.position.set((Math.random() - 0.5) * 220, 34 + Math.random() * 10, (Math.random() - 0.5) * 220);
      cloud.userData.speed = 0.6 + Math.random() * 0.8;
      this.clouds.add(cloud);
    }
    this.scene.add(this.clouds);
  }

  resize(): void {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.composer.setSize(innerWidth, innerHeight);
  }

  /** Orbit input: drag rotates, wheel zooms (closer also lowers the camera a little). */
  orbit(dx: number, dy: number, wheel: number): void {
    this.yaw -= dx * 0.006;
    this.pitch = clamp(this.pitch + dy * 0.004, 0.12, 1.25);
    if (wheel) this.distance = clamp(this.distance + wheel * 1.4, 7, 30);
  }

  /** Camera-relative input (strafe, forward) → world-space movement (x, y). */
  toWorld(ix: number, iy: number): { mx: number; my: number } {
    const fx = -Math.sin(this.yaw);
    const fy = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw);
    const ry = -Math.sin(this.yaw);
    return { mx: rx * ix + fx * iy, my: ry * ix + fy * iy };
  }

  /** Project a screen point onto the horizontal plane at height h (world coords). */
  screenToGround(sx: number, sy: number, h: number): { x: number; y: number } | null {
    const ndc = new THREE.Vector2((sx / innerWidth) * 2 - 1, -(sy / innerHeight) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -h);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    return { x: hit.x, y: hit.z };
  }

  update(dt: number, worldTime: number): void {
    this.time.value += dt;

    // Camera follows the target smoothly.
    this.smoothTarget.lerp(this.target, 1 - Math.pow(0.0005, dt));
    const cp = Math.cos(this.pitch);
    this.camera.position.set(
      this.smoothTarget.x + Math.sin(this.yaw) * cp * this.distance,
      this.smoothTarget.y + Math.sin(this.pitch) * this.distance,
      this.smoothTarget.z + Math.cos(this.yaw) * cp * this.distance
    );
    this.camera.lookAt(this.smoothTarget.x, this.smoothTarget.y + this.lookAbove, this.smoothTarget.z);

    // Sun path: rises in the east, sets in the west, arcing across the northern sky so it
    // usually sits ahead of the default camera (good for god rays).
    const sunAngle = (worldTime - 0.25) * Math.PI * 2; // 0 at sunrise
    const elev = Math.sin(sunAngle);
    const isDay = elev > -0.08;
    const dirSun = new THREE.Vector3(Math.cos(sunAngle) * 0.9, Math.max(0.1, elev) * 0.52 + 0.06, -0.85).normalize();
    const dirMoon = new THREE.Vector3(-Math.cos(sunAngle) * 0.9, Math.max(0.2, -elev) * 0.8 + 0.1, -0.7).normalize();
    this.sunDir.copy(isDay ? dirSun : dirMoon);
    const sky = sampleSky(worldTime);
    this.night = clamp(1 - (elev + 0.15) / 0.4, 0, 1);

    this.skyUniforms.top.value.copy(sky.top);
    this.skyUniforms.horizon.value.copy(sky.horizon);
    this.skyUniforms.sunDir.value.copy(this.sunDir);
    this.skyUniforms.sunColor.value.copy(sky.sun);
    this.skyUniforms.night.value = this.night;
    (this.scene.fog as THREE.Fog).color.copy(sky.fog);
    this.hemi.color.copy(sky.horizon).lerp(new THREE.Color(0xffffff), 0.35);
    this.hemi.groundColor.copy(sky.ground);
    this.hemi.intensity = sky.hemiI;
    this.sun.color.copy(sky.sun);
    this.sun.intensity = sky.sunI;

    const center = this.smoothTarget;
    this.sun.position.copy(center).addScaledVector(this.sunDir, 80);
    this.sun.target.position.copy(center);
    this.sky.position.copy(this.camera.position);
    this.stars.position.copy(this.camera.position);
    (this.stars.material as THREE.PointsMaterial).opacity = this.night * 0.9;

    this.sunDisc.position.copy(this.camera.position).addScaledVector(dirSun, 300);
    this.sunDisc.lookAt(this.camera.position);
    (this.sunDisc.material as THREE.MeshBasicMaterial).color.copy(sky.sun).lerp(new THREE.Color(0xffffff), 0.4);
    this.sunDisc.visible = elev > -0.15;
    this.moonDisc.position.copy(this.camera.position).addScaledVector(dirMoon, 300);
    this.moonDisc.lookAt(this.camera.position);
    this.moonDisc.visible = this.night > 0.05;
    (this.moonDisc.material as THREE.MeshBasicMaterial).opacity = this.night;

    if (this.godRays) {
      // Stronger shafts at golden hour, gentle at noon, off at night.
      const golden = 1 - Math.abs(elev - 0.25) * 1.4;
      this.godRays.godRaysMaterial.uniforms.weight.value = clamp(0.32 + golden * 0.3, 0.2, 0.62) * (1 - this.night);
    }
    if (this.bloom) this.bloom.intensity = 0.7 + this.night * 0.9;

    // Drift clouds with the wind, recycling them around the player.
    for (const c of this.clouds.children) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x - center.x > 130) c.position.x = center.x - 130;
      if (c.position.x - center.x < -130) c.position.x = center.x + 130;
      if (c.position.z - center.z > 130) c.position.z = center.z - 130;
      if (c.position.z - center.z < -130) c.position.z = center.z + 130;
    }
  }

  render(dt: number): void {
    this.composer.render(dt);
  }
}
