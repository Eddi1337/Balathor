// Geometric roof-occlusion test harness.
//
// Loads the real client/src/main.js in a sandboxed VM with a mocked DOM and a
// RECORDING 2D canvas context. The recording context rasterises every fill/
// stroke into an opacity bitmap so we can prove that a building sprite paints
// an opaque cover over its entire world footprint (the region whose interior
// floor/wall/furniture tiles are baked into the chunk underneath).
//
// We deliberately rasterise only the operations the building renderers use:
// fillRect, fill() of the current path (rects, arcs, quadraticCurveTo, lineTo,
// moveTo, ellipse, closePath), and roundedRect (which calls path ops + fill).
// Strokes are ignored for coverage (they are thin trim, never a guarantee).

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAIN_PATH = path.resolve(__dirname, "../../client/src/main.js");

// ---- Recording canvas context -------------------------------------------
// A simple scanline rasteriser. We track a coverage Uint8Array over a fixed
// pixel grid. Alpha >= OPAQUE_THRESHOLD counts as "covers".
const OPAQUE_THRESHOLD = 0.9;

export function createRecorder(width, height) {
  const cover = new Uint8Array(width * height);
  const stack = [];
  let state = {
    fillStyle: "#000",
    strokeStyle: "#000",
    lineWidth: 1,
    globalAlpha: 1,
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowColor: "#000",
    font: "10px",
    textAlign: "start",
    textBaseline: "alphabetic",
    clip: null, // {minX,minY,maxX,maxY} bbox approximation
    transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
  };
  let path = [];
  let cur = null;
  let start = null;

  function alphaOf(style) {
    if (typeof style !== "string") return 1; // gradients => treat as opaque-ish
    const m = style.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      const parts = m[1].split(",").map((s) => s.trim());
      if (parts.length === 4) return parseFloat(parts[3]);
      return 1;
    }
    return 1; // hex => opaque
  }

  function applyTransformPt(x, y) {
    const t = state.transform;
    return { x: t.a * x + t.c * y + t.e, y: t.b * x + t.d * y + t.f };
  }

  function markPoly(points, alpha) {
    if (alpha < OPAQUE_THRESHOLD) return;
    if (points.length < 3) return;
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    for (const p of points) {
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
    }
    const clip = state.clip;
    const y0 = Math.max(0, Math.floor(minY));
    const y1 = Math.min(height - 1, Math.ceil(maxY));
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5;
      const xs = [];
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i], b = points[j];
        if ((a.y <= yc && b.y > yc) || (b.y <= yc && a.y > yc)) {
          const t = (yc - a.y) / (b.y - a.y);
          xs.push(a.x + t * (b.x - a.x));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        let xl = Math.floor(xs[k] + 0.5);
        let xr = Math.ceil(xs[k + 1] - 0.5);
        if (clip) {
          if (y < clip.minY || y > clip.maxY) continue;
          xl = Math.max(xl, clip.minX);
          xr = Math.min(xr, clip.maxX);
        }
        xl = Math.max(0, xl);
        xr = Math.min(width - 1, xr);
        for (let x = xl; x <= xr; x++) cover[y * width + x] = 1;
      }
    }
  }

  function flattenPath() {
    // Convert recorded subpaths into polygon point lists (already in device space).
    return path;
  }

  const ctx = {
    canvas: { width, height },
    set fillStyle(v) { state.fillStyle = v; },
    get fillStyle() { return state.fillStyle; },
    set strokeStyle(v) { state.strokeStyle = v; },
    get strokeStyle() { return state.strokeStyle; },
    set lineWidth(v) { state.lineWidth = v; },
    get lineWidth() { return state.lineWidth; },
    set globalAlpha(v) { state.globalAlpha = v; },
    get globalAlpha() { return state.globalAlpha; },
    set shadowBlur(v) { state.shadowBlur = v; },
    get shadowBlur() { return state.shadowBlur; },
    set shadowOffsetX(v) { state.shadowOffsetX = v; },
    get shadowOffsetX() { return state.shadowOffsetX; },
    set shadowOffsetY(v) { state.shadowOffsetY = v; },
    get shadowOffsetY() { return state.shadowOffsetY; },
    set shadowColor(v) { state.shadowColor = v; },
    get shadowColor() { return state.shadowColor; },
    set font(v) { state.font = v; },
    get font() { return state.font; },
    set textAlign(v) { state.textAlign = v; },
    get textAlign() { return state.textAlign; },
    set textBaseline(v) { state.textBaseline = v; },
    get textBaseline() { return state.textBaseline; },
    set lineCap(v) {},
    set lineJoin(v) {},
    set globalCompositeOperation(v) {},
    set imageSmoothingEnabled(v) {},

    save() { stack.push({ ...state, transform: { ...state.transform }, clip: state.clip ? { ...state.clip } : null }); },
    restore() { if (stack.length) state = stack.pop(); },

    translate(x, y) {
      const t = state.transform;
      t.e += t.a * x + t.c * y;
      t.f += t.b * x + t.d * y;
    },
    scale(x, y) {
      const t = state.transform;
      t.a *= x; t.b *= x; t.c *= y; t.d *= y;
    },
    rotate(ang) {
      const t = state.transform;
      const cos = Math.cos(ang), sin = Math.sin(ang);
      const a = t.a, b = t.b, c = t.c, d = t.d;
      t.a = a * cos + c * sin;
      t.b = b * cos + d * sin;
      t.c = a * -sin + c * cos;
      t.d = b * -sin + d * cos;
    },
    setTransform(a, b, c, d, e, f) { state.transform = { a, b, c, d, e, f }; },
    resetTransform() { state.transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; },

    beginPath() { path = []; cur = null; start = null; },
    closePath() { if (cur && start) cur.push({ ...start }); },
    moveTo(x, y) { const p = applyTransformPt(x, y); cur = [p]; start = p; path.push(cur); },
    lineTo(x, y) { if (!cur) this.moveTo(x, y); else cur.push(applyTransformPt(x, y)); },
    quadraticCurveTo(cx, cy, x, y) {
      if (!cur) this.moveTo(x, y);
      else {
        const p0 = cur[cur.length - 1];
        const c = applyTransformPt(cx, cy);
        const p1 = applyTransformPt(x, y);
        for (let i = 1; i <= 8; i++) {
          const t = i / 8, u = 1 - t;
          cur.push({
            x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
            y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
          });
        }
      }
    },
    bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
      if (!cur) this.moveTo(x, y);
      else {
        const p0 = cur[cur.length - 1];
        const a = applyTransformPt(c1x, c1y);
        const b = applyTransformPt(c2x, c2y);
        const p1 = applyTransformPt(x, y);
        for (let i = 1; i <= 10; i++) {
          const t = i / 10, u = 1 - t;
          cur.push({
            x: u * u * u * p0.x + 3 * u * u * t * a.x + 3 * u * t * t * b.x + t * t * t * p1.x,
            y: u * u * u * p0.y + 3 * u * u * t * a.y + 3 * u * t * t * b.y + t * t * t * p1.y,
          });
        }
      }
    },
    arc(cx, cy, r, a0, a1, ccw) {
      const pts = [];
      let span = a1 - a0;
      if (!ccw && span < 0) span += Math.PI * 2;
      if (ccw && span > 0) span -= Math.PI * 2;
      const steps = Math.max(6, Math.ceil(Math.abs(span) / (Math.PI / 8)));
      for (let i = 0; i <= steps; i++) {
        const a = a0 + (span * i) / steps;
        pts.push(applyTransformPt(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
      }
      if (!cur) { cur = pts; start = pts[0]; path.push(cur); }
      else cur.push(...pts);
    },
    arcTo(x1, y1, x2, y2, r) { this.lineTo(x1, y1); this.lineTo(x2, y2); },
    ellipse(cx, cy, rx, ry, rot, a0, a1, ccw) {
      const pts = [];
      const steps = 24;
      const cosR = Math.cos(rot || 0), sinR = Math.sin(rot || 0);
      for (let i = 0; i <= steps; i++) {
        const a = a0 + ((a1 - a0) * i) / steps;
        const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
        pts.push(applyTransformPt(cx + ex * cosR - ey * sinR, cy + ex * sinR + ey * cosR));
      }
      if (!cur) { cur = pts; start = pts[0]; path.push(cur); }
      else cur.push(...pts);
    },
    rect(x, y, w, h) {
      this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath();
    },

    fill() {
      const alpha = alphaOf(state.fillStyle) * state.globalAlpha;
      for (const sub of flattenPath()) markPoly(sub, alpha);
    },
    stroke() { /* ignored for opaque coverage */ },
    clip() {
      // Approximate clip as bbox of current path, intersected with existing clip.
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const sub of path) for (const p of sub) {
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
      }
      const nb = { minX: Math.floor(minX), minY: Math.floor(minY), maxX: Math.ceil(maxX), maxY: Math.ceil(maxY) };
      if (state.clip) {
        state.clip = {
          minX: Math.max(state.clip.minX, nb.minX),
          minY: Math.max(state.clip.minY, nb.minY),
          maxX: Math.min(state.clip.maxX, nb.maxX),
          maxY: Math.min(state.clip.maxY, nb.maxY),
        };
      } else state.clip = nb;
    },
    fillRect(x, y, w, h) {
      const alpha = alphaOf(state.fillStyle) * state.globalAlpha;
      const poly = [
        applyTransformPt(x, y), applyTransformPt(x + w, y),
        applyTransformPt(x + w, y + h), applyTransformPt(x, y + h),
      ];
      markPoly(poly, alpha);
    },
    strokeRect() {},
    clearRect(x, y, w, h) {
      const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
      const x1 = Math.min(width - 1, Math.ceil(x + w)), y1 = Math.min(height - 1, Math.ceil(y + h));
      for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) cover[yy * width + xx] = 0;
    },
    fillText() {}, strokeText() {},
    measureText() { return { width: 10 }; },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    createPattern() { return null; },
    drawImage() {},
    setLineDash() {}, getLineDash() { return []; },
    putImageData() {}, getImageData() { return { data: new Uint8ClampedArray(4) }; },
  };

  return { ctx, cover, width, height, OPAQUE_THRESHOLD };
}

// ---- Sandbox loader ------------------------------------------------------
export function loadMain(recorder) {
  const src = fs.readFileSync(MAIN_PATH, "utf8");

  const noop = () => {};
  const fakeEl = new Proxy({}, {
    get(_t, prop) {
      if (prop === "getContext") return () => recorder.ctx;
      if (prop === "classList") return { add: noop, remove: noop, toggle: noop, contains: () => false };
      if (prop === "style") return new Proxy({}, { get: () => "", set: () => true });
      if (prop === "addEventListener" || prop === "removeEventListener") return noop;
      if (prop === "appendChild" || prop === "removeChild" || prop === "querySelector") return () => fakeEl;
      if (prop === "querySelectorAll") return () => [];
      if (prop === "getBoundingClientRect") return () => ({ left: 0, top: 0, width: recorder.width, height: recorder.height });
      if (prop === "width") return recorder.width;
      if (prop === "height") return recorder.height;
      if (prop === "dataset") return {};
      if (prop === "value") return "";
      return noop;
    },
    set() { return true; },
  });

  const matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop });
  const documentMock = new Proxy({}, {
    get(_t, prop) {
      if (prop === "querySelector" || prop === "getElementById" || prop === "createElement") return () => fakeEl;
      if (prop === "querySelectorAll" || prop === "getElementsByClassName") return () => [];
      if (prop === "body" || prop === "documentElement" || prop === "head") return fakeEl;
      if (prop === "addEventListener" || prop === "removeEventListener") return noop;
      if (prop === "hidden") return false;
      if (prop === "visibilityState") return "visible";
      if (prop === "fonts") return { ready: Promise.resolve(), add: noop };
      return noop;
    },
    set() { return true; },
  });

  class FakeWS { constructor() {} send() {} close() {} addEventListener() {} }
  class OffscreenCanvasMock {
    constructor(w, h) { this.width = w; this.height = h; }
    getContext() { return recorder.ctx; }
  }

  const sandbox = {
    window: undefined,
    document: documentMock,
    navigator: { maxTouchPoints: 0, userAgent: "node", language: "en", clipboard: { writeText: noop } },
    location: { href: "http://localhost/", protocol: "http:", host: "localhost", search: "" },
    matchMedia,
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: noop,
    requestAnimationFrame: noop,
    cancelAnimationFrame: noop,
    setInterval: () => 0,
    clearInterval: noop,
    setTimeout: () => 0,
    clearTimeout: noop,
    WebSocket: FakeWS,
    OffscreenCanvas: OffscreenCanvasMock,
    performance: { now: () => 0 },
    console,
    Image: class { constructor() {} },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    devicePixelRatio: 1,
    visualViewport: { width: recorder.width, height: recorder.height, addEventListener: noop },
    fetch: () => Promise.reject(new Error("no fetch in test")),
    URLSearchParams,
    structuredClone: (v) => JSON.parse(JSON.stringify(v)),
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;

  const ctxObj = vm.createContext(sandbox);
  // Capture top-level function/const decls by appending an export grab.
  const wrapped = src + "\n;globalThis.__balathorTestExports = { drawBuildingSprite: typeof drawBuildingSprite !== 'undefined' ? drawBuildingSprite : null, drawCuteCottage: typeof drawCuteCottage !== 'undefined' ? drawCuteCottage : null, drawTower: typeof drawTower !== 'undefined' ? drawTower : null, drawTreehouse: typeof drawTreehouse !== 'undefined' ? drawTreehouse : null, drawCastle: typeof drawCastle !== 'undefined' ? drawCastle : null, drawFletcherBuilding: typeof drawFletcherBuilding !== 'undefined' ? drawFletcherBuilding : null, state: typeof state !== 'undefined' ? state : null, TILE_SIZE: typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : null, setCtx: (c)=>{ ctx = c; } };";
  vm.runInContext(wrapped, ctxObj, { filename: "main.js" });
  return sandbox.__balathorTestExports;
}
