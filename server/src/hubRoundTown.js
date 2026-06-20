"use strict";

const { isTileNearMinigameSite } = require("./minigameSites.js");

const TWO_PI = Math.PI * 2;

const HUB_CLEARING_RADIUS = 132;

/** Wall stone ring — hollow inside HUB_WALL_R_IN_MAIN. */
const HUB_WALL_R_OUT_MAIN = 119;
const HUB_WALL_R_OUT_PARAPET = 121;
const HUB_WALL_R_IN_MAIN = 117;
const GATE_AXIS_HALF_WIDTH_TILES = 3;

/** Deterministic 0–1 mixer (standalone — world.js already loaded this module first). */
function hz(tx, ty, salt = 8891) {
  let h = Math.imul(tx | 0, 374761393) ^ Math.imul(ty | 0, 668265263) ^ (salt | 0);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const HUB_NPC_ORDER = [
  { id: "npc_mara", label: "Mara", cottage: "Mara's Cottage" },
  { id: "npc_thomas", label: "Thomas", cottage: "Thomas's Lodge" },
  { id: "npc_dale", label: "Dale", cottage: "Dale's Storehouse" },
  { id: "npc_aldric", label: "Aldric", cottage: "Aldric's Quarters" },
  { id: "npc_ren", label: "Ren", cottage: "Ren's Bunkhouse" },
  { id: "npc_lyssa", label: "Lyssa", cottage: "Lyssa's Shop-back" },
  { id: "npc_brom", label: "Brom", cottage: "Brom's Hovel" },
  { id: "npc_sera", label: "Sera", cottage: "Sera's Watch-hut" },
  { id: "npc_holt", label: "Holt", cottage: "Holt's Cottage" },
  { id: "npc_greta", label: "Greta", cottage: "Greta's Cellar Hut" },
  { id: "npc_dot", label: "Dot", cottage: "Dot's Mill Shack" },
  { id: "npc_wyn", label: "Wyn", cottage: "Wyn's Pasture Hut" },
  { id: "npc_voss", label: "Voss", cottage: "Voss's Lean-to" },
  { id: "npc_mira", label: "Mira", cottage: "Mira's Annex" },
  { id: "npc_cael", label: "Cael", cottage: "Cael's Hovel" },
  { id: "npc_zix", label: "Zix", cottage: "Zix's Camp Hut" },
  { id: "npc_kael", label: "Kael", cottage: "Kael's Storeroom" },
  { id: "npc_ebb", label: "Ebb", cottage: "Ebb's Lodging" },
  { id: "npc_ana", label: "Ana", cottage: "Ana's Script House" },
  { id: "npc_rile", label: "Riley", cottage: "Riley's Bungalow" },
  { id: "npc_jax", label: "Jax", cottage: "Jax's Flat" },
  { id: "npc_mae", label: "Mae", cottage: "Mae's Rowhouse" },
  { id: "npc_sofia", label: "Sofia", cottage: "Sofia's Shack" },
  { id: "npc_nara", label: "Nara", cottage: "Nara's Cabin" }
];

/**
 * Five Fletcher workshop buildings — real buildings positioned in clear
 * open areas (min 4-tile gap to every other building), one per 72° sector.
 * Roads connect automatically via connectHouseDoorways().
 */
const HUB_FLETCHER_RECTS = Object.freeze([
  [24, 71, 8, 7],   // sector E  (angle ~57°, r~80)
  [-8, 99, 8, 7],   // sector S  (angle ~96°, r~103)
  [-91, 19, 8, 7],  // sector W  (angle ~168°, r~90)
  [-57, -91, 8, 7], // sector N  (angle ~238°, r~102)
  [82, -45, 8, 7],  // sector NE (angle ~334°, r~95)
]);

/** Civic + dwellings — deterministic. */
const HUB_BLUEPRINT_RECT = [
  [-10, -78, 20, 16],
  [-14, 18, 11, 9],
  [-68, -18, 12, 9],
  [58, -18, 12, 9],
  [19, -52, 8, 7],
  [36, -40, 8, 7],
  [44, -28, 8, 7],
  [50, -8, 8, 7],
  [48, 13, 8, 7],
  [41, 26, 8, 7],
  [27, 41, 8, 7],
  [8, 49, 8, 7],
  [-7, 50, 8, 7],
  [-27, 46, 8, 7],
  [-44, 33, 8, 7],
  [-52, 21, 8, 7],
  [-58, 2, 8, 7],
  [-56, -20, 8, 7],
  [-49, -33, 8, 7],
  [-35, -47, 8, 7],
  [-16, -56, 8, 7],
  [0, -57, 8, 7],
  [40, -60, 8, 7],
  [58, -41, 8, 7],
  [64, -27, 8, 7],
  [68, -2, 8, 7],
  [62, 25, 8, 7],
  [55, 38, 8, 7],
  [37, 56, 8, 7],
  [12, 67, 8, 7],
  [-3, 68, 8, 7],
  [-28, 65, 8, 7],
  [-51, 51, 8, 7],
  [-62, 39, 8, 7],
  [-73, 18, 8, 7],
  [-76, -10, 8, 7],
  [-73, -25, 8, 7],
  [-62, -46, 8, 7],
  [-41, -65, 8, 7],
  [-27, -72, 8, 7],
  [24, -70, 8, 7],
  [-11, 68, 8, 7],
  [67, -62, 8, 7],
  [84, -31, 8, 7],
  [87, -15, 8, 7],
  [85, 19, 8, 7],
  [70, 51, 8, 7],
  [59, 64, 8, 7],
  [31, 82, 8, 7],
  [-5, 88, 8, 7],
  [-22, 87, 8, 7],
  [-52, 75, 8, 7],
  [-79, 49, 8, 7],
  [-88, 35, 8, 7],
  [-96, 4, 8, 7],
  [-91, -33, 8, 7],
  [-84, -49, 8, 7],
  [-65, -73, 8, 7],
  [-31, -91, 8, 7],
  [-14, -95, 8, 7],
  [16, -93, 8, 7],
  [51, -77, 8, 7]
];

function pointInRects(px, py, rects, pad = 0) {
  const x = px;
  const y = py;
  for (const r of rects) {
    const rx = r.x - pad;
    const ry = r.y - pad;
    const rw = r.w + pad * 2;
    const rh = r.h + pad * 2;
    if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) return true;
  }
  return false;
}

function hubSouthDoorApprox(bx, by, bw, bh) {
  const iw = Math.max(3, Math.floor(bw));
  const bx0 = Math.floor(bx);
  if (iw % 2 === 1) {
    const doorXTile = bx0 + (iw - 1) / 2;
    return { sx: doorXTile + 0.5, sy: by + bh };
  }
  const left = bx0 + iw / 2 - 1;
  return { sx: (left + left + 1) / 2 + 0.5, sy: by + bh };
}

function residentSignBesideDoor(bx, by, bw, bh) {
  const door = hubSouthDoorApprox(bx, by, bw, bh);
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  const radial = Math.hypot(cx, cy);
  if (radial < 0.001) return { sx: door.sx + 1.75, sy: door.sy + 1.05 };
  const ux = cx / radial;
  const uy = cy / radial;
  const px = -uy;
  const py = ux;
  const side = bx + bw / 2 > -2 ? -1 : 1;
  return {
    sx: door.sx + px * side * 1.8,
    sy: door.sy + py * side * 1.05 + 0.4
  };
}

/** Perpendicular distance from origin-line at angle theta to point (px,py). */
function radialLineDistance(px, py, theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return Math.abs(px * s - py * c);
}

function gateCarveSkip(tx, ty) {
  const d = Math.hypot(tx + 0.5, ty + 0.5);
  if (!(d >= 112 && d <= 125)) return false;
  const g = GATE_AXIS_HALF_WIDTH_TILES;
  const edge = HUB_WALL_R_IN_MAIN - 20;
  // Axis gates: N, S, E, W
  if (Math.abs(tx) <= g && (ty <= -edge || ty >= edge)) return true;
  if (Math.abs(ty) <= g && (tx <= -edge || tx >= edge)) return true;
  // Diagonal gates: NE, SE, SW, NW (45° between the axis gates)
  const diagEdge = Math.floor(edge * 0.707); // ~68
  if (Math.abs(tx + ty + 1) <= g &&  tx >= diagEdge && -ty >= diagEdge) return true; // NE
  if (Math.abs(tx - ty)     <= g &&  tx >= diagEdge &&  ty >= diagEdge) return true; // SE
  if (Math.abs(tx + ty + 1) <= g && -tx >= diagEdge &&  ty >= diagEdge) return true; // SW
  if (Math.abs(tx - ty)     <= g && -tx >= diagEdge && -ty >= diagEdge) return true; // NW
  return false;
}

/** Stone battlement occupying a narrow radial band beyond the dwellings. */
function buildWallTiles(wallKeys) {
  const bound = Math.ceil(HUB_WALL_R_OUT_PARAPET + 8);
  for (let ty = -bound; ty <= bound; ty += 1) {
    for (let tx = -bound; tx <= bound; tx += 1) {
      if (gateCarveSkip(tx, ty)) continue;
      const ox = tx + 0.5;
      const oy = ty + 0.5;
      const d = Math.hypot(ox, oy);
      /** ~2½ tile parapet crest */
      if (d < 117.72 || d > 119.98) continue;
      wallKeys.add(`${tx},${ty}`);
    }
  }
}

/**
 * Concentric ring roads + radial spines stitched into one network inside the walls.
 */
function buildPathTiles(pathKeys, wallKeys, rects) {
  const bound = Math.ceil(HUB_WALL_R_IN_MAIN + 8);
  const ringCenters = [38, 55, 72, 95];
  const ringWidths = [2.35, 2.45, 2.52, 2.52];
  const nSpokes = 24;
  const spokeRadialHalf = 1.55;
  /** r range for spokes — stop before wall masonry */
  const rSpokeInner = 20.5;
  const rSpokeOuter = HUB_WALL_R_IN_MAIN - 4.95;

  for (let ty = -bound; ty <= bound; ty += 1) {
    for (let tx = -bound; tx <= bound; tx += 1) {
      const ox = tx + 0.5;
      const oy = ty + 0.5;
      const k = `${tx},${ty}`;
      if (wallKeys.has(k)) continue;
      const d = Math.hypot(ox, oy);

      /** Central tree cluster — untouched */
      if (tx <= 1 && tx >= -1 && ty <= 1 && ty >= -1) continue;
      /** Keep inner lawn until inner ring corridor */
      if (d > 21.5 && d < 27.95) {
        /* inner plaza ring roadway */
      } else if (d <= 21.5) {
        /** No path through plaza disk except standard cross avenues handled elsewhere */
        continue;
      }

      let ringHit = false;
      for (let ri = 0; ri < ringCenters.length; ri += 1) {
        if (Math.abs(d - ringCenters[ri]) <= ringWidths[ri]) ringHit = true;
      }
      let spokeHit = false;
      for (let s = 0; s < nSpokes; s += 1) {
        const theta = TWO_PI * (s / nSpokes) + 0.015;
        if (radialLineDistance(ox, oy, theta) < spokeRadialHalf && d >= rSpokeInner && d <= rSpokeOuter) {
          spokeHit = true;
          break;
        }
      }

      /** Inner plaza connecting ring (~ radius 31) linking radials — partial band */
      const innerConnector = Math.abs(d - 31.2) <= 3.95;

      if (!(ringHit || spokeHit || innerConnector)) continue;
      /** Never pave through footprints */
      if (pointInRects(ox, oy, rects, 0.92)) continue;
      if (wallKeys.has(k)) continue;

      /** Edge trim — soften path under wall inner apron */
      if (d >= HUB_WALL_R_IN_MAIN - 2.95 && !(ringCenters.some((rc, ix) => Math.abs(d - rc) <= ringWidths[ix]))) {
        /** keep ring road only at perimeter when spoke brings you there */
        if (!ringHit || d < HUB_WALL_R_IN_MAIN - 6) {
          //
        }
      }

      pathKeys.add(k);
    }
  }

  /** Second pass strip any path keys still grazing buildings — tile-centre dilation */
  for (const kk of [...pathKeys]) {
    const [tsx, tsy] = kk.split(",").map(Number);
    let bad = pointInRects(tsx + 0.49, tsy + 0.49, rects, 0);
    if (!bad) {
      for (let oy = tsy - 1; oy <= tsy + 1; oy += 1) {
        for (let ox = tsx - 1; ox <= tsx + 1; ox += 1) {
          if (pointInRects(ox + 0.49, oy + 0.49, rects, 2.08)) bad = true;
        }
      }
    }
    if (bad || wallKeys.has(kk)) pathKeys.delete(kk);
  }
}

/** Hub-only portal tiles (same as world.PORTALS gates on the northern wall). */
const HUB_GATE_PORTAL_TILES = Object.freeze([
  [46, -76],
  [-46, -76],
  [0, -76]
]);
const PORTAL_COURTYARD_R = 10;
const PORTAL_COURTYARD_R_SQ = PORTAL_COURTYARD_R * PORTAL_COURTYARD_R;

function pruneTilesNearListedPortals(tileSet, portals) {
  for (const k of [...tileSet]) {
    const [tx, ty] = k.split(",").map(Number);
    let hit = false;
    for (const [px, py] of portals) {
      const dx = tx - px;
      const dy = ty - py;
      if (dx * dx + dy * dy <= PORTAL_COURTYARD_R_SQ) {
        hit = true;
        break;
      }
    }
    if (hit) tileSet.delete(k);
  }
}

function tileBlocksCarving(tx, ty, wallKeys, rects) {
  if (wallKeys.has(`${tx},${ty}`)) return true;
  if (tx >= -1 && tx <= 1 && ty >= -1 && ty <= 1) return true;
  if (pointInRects(tx + 0.52, ty + 0.52, rects, 0.02)) return true;
  return false;
}

function bresCells(ax, ay, bx, by, out = []) {
  let x0 = ax;
  let y0 = ay;
  const x1 = bx;
  const y1 = by;
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    out.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
  return out;
}

function carveCells(coords, pathKeys, wallKeys, rects) {
  for (let i = 0; i < coords.length; i += 1) {
    const c = coords[i];
    const gx = c[0];
    const gy = c[1];
    if (tileBlocksCarving(gx, gy, wallKeys, rects)) continue;
    pathKeys.add(`${gx},${gy}`);
  }
}

function carveOrtho(ax, ay, bx, by, pathKeys, wallKeys, rects) {
  const a = [];
  bresCells(ax, ay, bx, ay, a);
  const b = [];
  bresCells(bx, ay, bx, by, b);
  carveCells(a.concat(b), pathKeys, wallKeys, rects);
}

function carveOrthoAlt(ax, ay, bx, by, pathKeys, wallKeys, rects) {
  const a = [];
  bresCells(ax, ay, ax, by, a);
  const bb = [];
  bresCells(ax, by, bx, by, bb);
  carveCells(a.concat(bb), pathKeys, wallKeys, rects);
}

function touchesPathNetwork(tx, ty, pathKeys, reach = 2) {
  for (let dy = -reach; dy <= reach; dy += 1) {
    for (let dx = -reach; dx <= reach; dx += 1) {
      if (pathKeys.has(`${tx + dx},${ty + dy}`)) return true;
    }
  }
  return false;
}

function nearestPathFootprint(tx, ty, pathKeys) {
  let best = null;
  let bd = 1e18;
  for (const k of pathKeys) {
    const [px, py] = k.split(",").map(Number);
    const d = (px - tx) ** 2 + (py - ty) ** 2;
    if (d < bd) {
      bd = d;
      best = [px, py];
    }
  }
  return best;
}

/** Link every building south-door apron into the pavement graph. */
function connectHouseDoorways(rects, pathKeys, wallKeys) {
  for (const r of rects) {
    const door = hubSouthDoorApprox(r.x, r.y, r.w, r.h);
    const tx = Math.floor(door.sx);
    const ty = Math.floor(door.sy);
    if (touchesPathNetwork(tx, ty, pathKeys, 2)) continue;
    const goal = nearestPathFootprint(tx, ty, pathKeys);
    if (!goal) continue;
    carveOrtho(tx, ty, goal[0], goal[1], pathKeys, wallKeys, rects);
    if (!touchesPathNetwork(tx, ty, pathKeys, 2)) carveOrthoAlt(tx, ty, goal[0], goal[1], pathKeys, wallKeys, rects);
    const direct = [];
    bresCells(tx, ty, goal[0], goal[1], direct);
    carveCells(direct, pathKeys, wallKeys, rects);
  }
}

function pathAdjacentKeys(kStr, pathKeys) {
  const [x0, y0] = kStr.split(",").map(Number);
  const out = [];
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ]) {
    const nk = `${x0 + dx},${y0 + dy}`;
    if (pathKeys.has(nk)) out.push(nk);
  }
  return out;
}

/** Bridge tiny disconnected pavement islands after pruning. */
function mergePathComponents(pathKeys, wallKeys, rects) {
  if (pathKeys.size < 100) return;
  const visited = new Set();
  const comps = [];
  const keysArr = [...pathKeys];

  for (let qi = 0; qi < keysArr.length; qi += 1) {
    const start = keysArr[qi];
    if (visited.has(start)) continue;
    const bucket = [];
    const stack = [start];
    visited.add(start);
    while (stack.length) {
      const k = stack.pop();
      bucket.push(k);
      for (const nk of pathAdjacentKeys(k, pathKeys)) {
        if (visited.has(nk)) continue;
        visited.add(nk);
        stack.push(nk);
      }
    }
    comps.push(bucket);
  }

  comps.sort((a, b) => b.length - a.length);
  if (comps.length < 2) return;

  for (let ci = 1; ci < comps.length && ci <= 8; ci += 1) {
    const isl = comps[ci];
    if (isl.length > 560) continue;
    let bestA = null;
    let bestB = null;
    let bd = 1e18;
    /** Sample orphans — full bipartite scan is costly on large comps */
    const sampleA = isl.length <= 240 ? isl : isl.filter((_, j) => j % 7 === 0);
    const sampleB = comps[0];
    const sampleBThin = sampleB.length <= 400 ? sampleB : sampleB.filter((_, j) => j % 11 === 0);
    for (let ai = 0; ai < sampleA.length; ai += 1) {
      const [ax, ay] = sampleA[ai].split(",").map(Number);
      for (let bi = 0; bi < sampleBThin.length; bi += 1) {
        const [bx, by] = sampleBThin[bi].split(",").map(Number);
        const d = (ax - bx) ** 2 + (ay - by) ** 2;
        if (d < bd) {
          bd = d;
          bestA = [ax, ay];
          bestB = [bx, by];
        }
      }
    }
    if (!bestA || !bestB) continue;
    carveOrtho(bestA[0], bestA[1], bestB[0], bestB[1], pathKeys, wallKeys, rects);
    carveOrthoAlt(bestA[0], bestA[1], bestB[0], bestB[1], pathKeys, wallKeys, rects);
    const cut = [];
    bresCells(bestA[0], bestA[1], bestB[0], bestB[1], cut);
    carveCells(cut, pathKeys, wallKeys, rects);
  }
}

/** Main avenues + ring paths — full set NPCs may walk (includes orthogonal spines). */
function buildHubNavPathKeys(pathKeys, wallKeys) {
  const nav = new Set(pathKeys);
  const lim = Math.ceil(HUB_WALL_R_IN_MAIN + 18);
  function plazaCell(tx, ty) {
    return tx >= -1 && tx <= 1 && ty >= -1 && ty <= 1;
  }
  for (let t = -lim; t <= lim; t += 1) {
    for (const [tx, ty] of [
      [t, 0],   // E–W avenue
      [0, t],   // N–S avenue
      [t, -t],  // NE–SW diagonal avenue (through NE and SW gates)
      [t, t],   // SE–NW diagonal avenue (through SE and NW gates)
    ]) {
      if (plazaCell(tx, ty)) continue;
      const k = `${tx},${ty}`;
      if (!wallKeys.has(k)) nav.add(k);
    }
  }
  return nav;
}

function addGardenPatches(gardenKeys, rects) {
  for (let i = 0; i < rects.length; i += 1) {
    const r = rects[i];
    /** Skip monumental footprints */
    if (r.w * r.h > 112) continue;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const rad = Math.hypot(cx, cy) || 1;
    const ux = cx / rad;
    const uy = cy / rad;
    const gx = Math.round(cx + ux * ((r.w + r.h) * 0.25 + 1.6));
    const gy = Math.round(cy + uy * ((r.w + r.h) * 0.25 + 1.6));
    for (let lx = gx - 1; lx <= gx + 2; lx += 1) {
      for (let ly = gy - 1; ly <= gy + 1; ly += 1) {
        if (pointInRects(lx + 0.51, ly + 0.51, rects, 0.15)) continue;
        if (lx * lx + ly * ly < 9.5 * 9.5) continue;
        gardenKeys.add(`${lx},${ly}`);
      }
    }
  }
}

/**
 * Lawns touching paths: benches & small trees; separate pass for 2×1 upright market stalls + traders.
 */
function buildHubRoadsideFeatures(pathKeys, wallKeys, gardenKeys, rects, pubRects = [], reservedKeys = null) {
  const list = [];
  const used = new Set(reservedKeys ? [...reservedKeys] : []);
  const pathSet = pathKeys;

  function nearListedPortal(tx, ty, rSq) {
    for (const [px, py] of HUB_GATE_PORTAL_TILES) {
      const dx = tx - px;
      const dy = ty - py;
      if (dx * dx + dy * dy <= rSq) return true;
    }
    return false;
  }

  function plazaTree(tx, ty) {
    return tx >= -1 && tx <= 1 && ty >= -1 && ty <= 1;
  }

  function buildingBlock(tx, ty) {
    return pointInRects(tx + 0.52, ty + 0.52, rects, 0.42);
  }

  const isPath = (tx, ty) => pathSet.has(`${tx},${ty}`);

  function stampUsed(tx, ty) {
    used.add(`${tx},${ty}`);
  }
  function isUsed(tx, ty) {
    return used.has(`${tx},${ty}`);
  }
  /**
   * Declutter spacing guard: returns true if any already-placed prop sits within
   * `r` tiles of (tx,ty). Used to keep scattered scenery sparse and walkable so
   * the town reads tidy instead of buried under loose props.
   */
  function nearUsed(tx, ty, r) {
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        if (used.has(`${tx + dx},${ty + dy}`)) return true;
      }
    }
    return false;
  }

  /** Road-adjacent grass cells */
  const lawnEdge = new Map();
  for (const k of pathSet) {
    const [px, py] = k.split(",").map(Number);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ]) {
      const nx = px + dx;
      const ny = py + dy;
      if (plazaTree(nx, ny) || nearListedPortal(nx, ny, 105)) continue;
      if (wallKeys.has(`${nx},${ny}`)) continue;
      if (buildingBlock(nx, ny)) continue;
      if (isPath(nx, ny)) continue;
      const key = `${nx},${ny}`;
      if (!lawnEdge.has(key)) {
        lawnEdge.set(key, { adx: [], ady: [] });
      }
      const cel = lawnEdge.get(key);
      cel.adx.push(-dx);
      cel.ady.push(-dy);
    }
  }

  for (const [key] of lawnEdge) {
    const [nx, ny] = key.split(",").map(Number);
    // Sparse roadside scenery: a few purposeful accents along the verges, not a
    // wall of clutter. High rejection threshold + a 2-tile spacing guard keep
    // the streets open and walkable; loose barrels are gone, the mix favours
    // greenery (trees/hedges/flowers) with the occasional bench or planter.
    if (hz(nx, ny, 7721) < 0.985) continue;
    if (isTileNearMinigameSite(nx, ny, "fantasy", 2)) continue;
    if (isUsed(nx, ny) || nearUsed(nx, ny, 2)) continue;

    const pick = hz(nx, ny, 7722);
    const kind =
      pick < 0.34 ? "small_tree"
        : pick < 0.58 ? "flower_bed"
          : pick < 0.78 ? "hedge"
            : pick < 0.92 ? "bench"
              : "planter";

    stampUsed(nx, ny);

    list.push({
      id: `hub_rs_${nx}_${ny}`,
      x: nx,
      y: ny,
      kind,
      facing: 0
    });
  }

  /** Lantern posts march along the four grand avenues, two tiles off the kerb. */
  const lanternLim = HUB_WALL_R_IN_MAIN - 6;
  for (let t = -lanternLim; t <= lanternLim; t += 13) {
    if (Math.abs(t) < 12) continue; // keep the plaza clear
    for (const [lx, ly] of [
      [t, -2], [t, 2],   // E–W avenue
      [-2, t], [2, t]    // N–S avenue
    ]) {
      if (plazaTree(lx, ly) || nearListedPortal(lx, ly, 130)) continue;
      if (isPath(lx, ly) || wallKeys.has(`${lx},${ly}`)) continue;
      if (buildingBlock(lx, ly) || isUsed(lx, ly)) continue;
      if (isTileNearMinigameSite(lx, ly, "fantasy", 2)) continue;
      stampUsed(lx, ly);
      list.push({ id: `hub_lamp_${lx}_${ly}`, x: lx, y: ly, kind: "lantern", facing: 0 });
    }
  }

  /** A stone well in each quadrant, nudged onto clear grass. */
  for (const base of [
    { cx: 46, cy: 46 },
    { cx: -46, cy: 46 },
    { cx: -46, cy: -46 },
    { cx: 46, cy: -46 }
  ]) {
    let placed = false;
    for (let ring = 0; ring <= 6 && !placed; ring += 1) {
      for (let oy = -ring; oy <= ring && !placed; oy += 1) {
        for (let ox = -ring; ox <= ring && !placed; ox += 1) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== ring) continue;
          const tx = base.cx + ox;
          const ty = base.cy + oy;
          let clear = true;
          for (let dy = 0; dy < 2 && clear; dy += 1) {
            for (let dx = 0; dx < 2; dx += 1) {
              const ax = tx + dx;
              const ay = ty + dy;
              if (
                plazaTree(ax, ay) || nearListedPortal(ax, ay, 125) ||
                isPath(ax, ay) || wallKeys.has(`${ax},${ay}`) ||
                buildingBlock(ax, ay) || isUsed(ax, ay) ||
                isTileNearMinigameSite(ax, ay, "fantasy", 2)
              ) {
                clear = false;
                break;
              }
            }
          }
          if (!clear) continue;
          for (let dy = 0; dy < 2; dy += 1) {
            for (let dx = 0; dx < 2; dx += 1) stampUsed(tx + dx, ty + dy);
          }
          list.push({ id: `hub_well_${tx}_${ty}`, x: tx, y: ty, kind: "well", facing: 0, footprintW: 2, footprintH: 2 });
          placed = true;
        }
      }
    }
  }

  /** Beer-garden seating outside every pub: tables, chairs, benches, a lantern. */
  for (const pub of pubRects) {
    const door = hubSouthDoorApprox(pub.x, pub.y, pub.w, pub.h);
    const dx0 = Math.floor(door.sx);
    const dy0 = Math.floor(door.sy);
    const spots = [
      { ox: -3, oy: 1, kind: "pub_table" },
      { ox: -4, oy: 1, kind: "pub_chair" },
      { ox: -2, oy: 1, kind: "pub_chair" },
      { ox: -3, oy: 2, kind: "pub_chair" },
      { ox: 3, oy: 1, kind: "pub_table" },
      { ox: 2, oy: 1, kind: "pub_chair" },
      { ox: 4, oy: 1, kind: "pub_chair" },
      { ox: 3, oy: 2, kind: "pub_chair" },
      { ox: -5, oy: 2, kind: "barrel" },
      { ox: 5, oy: 2, kind: "lantern" },
      { ox: 0, oy: 3, kind: "bench" }
    ];
    for (const s of spots) {
      const tx = dx0 + s.ox;
      const ty = dy0 + s.oy;
      if (plazaTree(tx, ty) || nearListedPortal(tx, ty, 110)) continue;
      if (wallKeys.has(`${tx},${ty}`) || buildingBlock(tx, ty) || isUsed(tx, ty)) continue;
      if (isTileNearMinigameSite(tx, ty, "fantasy", 2)) continue;
      stampUsed(tx, ty);
      list.push({ id: `hub_pubseat_${tx}_${ty}`, x: tx, y: ty, kind: s.kind, facing: 0 });
    }
  }

  /** Upright 2×1 stalls on flat grass with path along the south edge (customer side). */
  const limS = Math.ceil(HUB_WALL_R_IN_MAIN + 4);
  for (let ny = -limS; ny <= limS; ny += 1) {
    for (let nx = -limS; nx <= limS - 1; nx += 1) {
      if (plazaTree(nx, ny) || plazaTree(nx + 1, ny) || nearListedPortal(nx, ny, 110) || nearListedPortal(nx + 1, ny, 110)) {
        continue;
      }
      if (
        isPath(nx, ny) ||
        isPath(nx + 1, ny) ||
        wallKeys.has(`${nx},${ny}`) ||
        wallKeys.has(`${nx + 1},${ny}`)
      ) {
        continue;
      }
      if (buildingBlock(nx, ny) || buildingBlock(nx + 1, ny)) continue;
      if (isTileNearMinigameSite(nx, ny, "fantasy", 2) || isTileNearMinigameSite(nx + 1, ny, "fantasy", 2)) continue;
      if (!isPath(nx, ny + 1) || !isPath(nx + 1, ny + 1)) continue;
      if (isUsed(nx, ny) || isUsed(nx + 1, ny)) continue;
      if (hz(nx, ny, 9911) < 0.982) continue;

      stampUsed(nx, ny);
      stampUsed(nx + 1, ny);
      const vid = `hub_vendor_${nx}_${ny}`;
      list.push({
        id: `hub_stand_${nx}_${ny}`,
        x: nx,
        y: ny,
        kind: "market_stand",
        footprintW: 2,
        footprintH: 1,
        facing: 0,
        vendorNpcId: vid
      });
    }
  }

  const bound = Math.ceil(HUB_WALL_R_IN_MAIN + 2);
  for (let ty = -bound; ty <= bound; ty += 1) {
    for (let tx = -bound; tx <= bound; tx += 1) {
      if (plazaTree(tx, ty) || nearListedPortal(tx, ty, 105)) continue;
      if (isPath(tx, ty) || wallKeys.has(`${tx},${ty}`)) continue;
      if (buildingBlock(tx, ty)) continue;
      let adjPath = 0;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ]) {
        if (isPath(tx + dx, ty + dy)) adjPath += 1;
      }
      const onGarden = gardenKeys.has(`${tx},${ty}`);
      if (!(onGarden || adjPath >= 2)) continue;
      if (hz(tx, ty, 8819) < 0.986) continue;
      let clear4 = true;
      for (let dy = 0; dy < 4 && clear4; dy += 1) {
        for (let dx = 0; dx < 4; dx += 1) {
          const ax = tx + dx;
          const ay = ty + dy;
          if (plazaTree(ax, ay) || nearListedPortal(ax, ay, 125)) {
            clear4 = false;
            break;
          }
          if (isPath(ax, ay) || wallKeys.has(`${ax},${ay}`)) {
            clear4 = false;
            break;
          }
          if (buildingBlock(ax, ay)) {
            clear4 = false;
            break;
          }
          if (used.has(`${ax},${ay}`)) {
            clear4 = false;
            break;
          }
        }
      }
      if (!clear4) continue;
      for (let dy = 0; dy < 4; dy += 1) {
        for (let dx = 0; dx < 4; dx += 1) {
          used.add(`${tx + dx},${ty + dy}`);
        }
      }
      list.push({
        id: `hub_fn_${tx}_${ty}`,
        x: tx,
        y: ty,
        kind: "fountain",
        facing: 0,
        footprintW: 4,
        footprintH: 4
      });
    }
  }

  /** Pocket parks in the four inter-spoke quadrants — trees, flower rings,
   *  hedge rims, benches and a picnic table at the heart of each. */
  const PARK_CENTERS = [
    { cx: 32, cy: -42 },
    { cx: 42, cy:  32 },
    { cx: -42, cy:  32 },
    { cx: -32, cy: -42 }
  ];
  const PARK_R = 8;
  for (const pk of PARK_CENTERS) {
    for (let dy = -PARK_R; dy <= PARK_R; dy += 1) {
      for (let dx = -PARK_R; dx <= PARK_R; dx += 1) {
        const dist = Math.hypot(dx, dy);
        if (dist > PARK_R) continue;
        const tx = pk.cx + dx;
        const ty = pk.cy + dy;
        if (plazaTree(tx, ty)) continue;
        if (nearListedPortal(tx, ty, 120)) continue;
        if (isPath(tx, ty) || wallKeys.has(`${tx},${ty}`)) continue;
        if (buildingBlock(tx, ty)) continue;
        if (isUsed(tx, ty)) continue;
        if (isTileNearMinigameSite(tx, ty, "fantasy", 2)) continue;
        const r = hz(tx, ty, 3344);
        let kind;
        if (dist < 1.2) {
          kind = r < 0.5 ? "pub_table" : "pub_chair"; // picnic spot at the heart
        } else if (dist >= PARK_R - 1.0) {
          // Sparse hedge rim — a soft, broken hedge edge, not a solid wall.
          if (r < 0.22) kind = "hedge";
          else continue;
        } else if (dist >= PARK_R - 2.6 && dist < PARK_R - 1.4) {
          if (r < 0.18) kind = "flower_bed"; // light flower ring inside the hedge
          else continue;
        } else {
          // Keep the park interior mostly open lawn with a few scattered features.
          if (r < 0.07) kind = "small_tree";
          else if (r < 0.12) kind = "flower_bed";
          else continue;
        }
        // Spacing guard so park features stay scattered, not packed.
        if (kind !== "hedge" && nearUsed(tx, ty, 2)) continue;
        stampUsed(tx, ty);
        list.push({ id: `hub_park_${tx}_${ty}`, x: tx, y: ty, kind, facing: 0 });
      }
    }
  }

  return Object.freeze(list);
}

/**
 * Footprint sizes dwellings may roll — no two streets look stamped from one
 * mould. Minimum stays 7×6 so buyable homes keep their residential interior
 * (bed/chest layout requires w≥7, h≥6).
 */
const DWELLING_SIZE_VARIANTS = Object.freeze([
  { w: 7, h: 6 },
  { w: 7, h: 7 },
  { w: 8, h: 7 },
  { w: 8, h: 7 },
  { w: 9, h: 7 },
  { w: 9, h: 8 },
  { w: 10, h: 8 }
]);

/** Cute cottage-core wall/roof styles the client knows how to paint. */
const DWELLING_STYLES = Object.freeze(["timber", "rose", "cream", "sage", "sky", "honey", "lilac", "mint", "stone"]);

const CUTE_HOUSE_FIRSTS = Object.freeze(["Rosehip", "Honeysuckle", "Bluebell", "Foxglove", "Clover", "Daisy", "Lavender", "Primrose", "Buttercup", "Willow", "Bramble", "Poppy"]);
const CUTE_HOUSE_SECONDS = Object.freeze(["Cottage", "Nook", "Burrow", "Lodge", "Snug", "Roost", "Hollow", "Perch"]);

function rectsOverlapPadded(a, b, pad) {
  return (
    a.x - pad < b.x + b.w &&
    a.x + a.w + pad > b.x &&
    a.y - pad < b.y + b.h &&
    a.y + a.h + pad > b.y
  );
}

function rectFitsTown(cand, selfIndex, rects, reserved) {
  // Stay well inside the curtain wall.
  for (const [cx, cy] of [
    [cand.x, cand.y],
    [cand.x + cand.w, cand.y],
    [cand.x, cand.y + cand.h],
    [cand.x + cand.w, cand.y + cand.h]
  ]) {
    if (Math.hypot(cx, cy) > HUB_WALL_R_IN_MAIN - 5) return false;
  }
  // Clear of the gate-portal courtyards.
  for (const [px, py] of HUB_GATE_PORTAL_TILES) {
    const nx = Math.max(cand.x, Math.min(px, cand.x + cand.w));
    const ny = Math.max(cand.y, Math.min(py, cand.y + cand.h));
    if (Math.hypot(px - nx, py - ny) < PORTAL_COURTYARD_R + 3) return false;
  }
  // Clear of the central plaza.
  if (Math.hypot(cand.x + cand.w / 2, cand.y + cand.h / 2) < 24) return false;
  for (let j = 0; j < rects.length; j += 1) {
    if (j === selfIndex) continue;
    if (rectsOverlapPadded(cand, rects[j], 3)) return false;
  }
  for (const r of reserved) {
    if (rectsOverlapPadded(cand, r, 3)) return false;
  }
  return true;
}

/** Resize dwelling footprints in place (centre-anchored) where the town allows it. */
function applyDwellingSizeVariety(rects, reserved) {
  for (let i = 4; i < rects.length; i += 1) {
    const r = rects[i];
    const pick = DWELLING_SIZE_VARIANTS[Math.floor(hz(r.x, r.y, 5151) * DWELLING_SIZE_VARIANTS.length)];
    if (!pick || (pick.w === r.w && pick.h === r.h)) continue;
    const cand = {
      x: r.x - Math.floor((pick.w - r.w) / 2),
      y: r.y - Math.floor((pick.h - r.h) / 2),
      w: pick.w,
      h: pick.h
    };
    if (!rectFitsTown(cand, i, rects, reserved)) continue;
    r.x = cand.x;
    r.y = cand.y;
    r.w = cand.w;
    r.h = cand.h;
  }
}

/**
 * Minimum clear ring around every dwelling so players can walk all the way
 * around each house and reach the door (3 tiles ≥ player collision + path).
 */
const DWELLING_MIN_GAP = 3;

/** Wall / portal / plaza constraints only (no neighbour-pad test). */
function rectFitsTownStatic(cand) {
  for (const [cx, cy] of [
    [cand.x, cand.y],
    [cand.x + cand.w, cand.y],
    [cand.x, cand.y + cand.h],
    [cand.x + cand.w, cand.y + cand.h]
  ]) {
    if (Math.hypot(cx, cy) > HUB_WALL_R_IN_MAIN - 5) return false;
  }
  for (const [px, py] of HUB_GATE_PORTAL_TILES) {
    const nx = Math.max(cand.x, Math.min(px, cand.x + cand.w));
    const ny = Math.max(cand.y, Math.min(py, cand.y + cand.h));
    if (Math.hypot(px - nx, py - ny) < PORTAL_COURTYARD_R + 3) return false;
  }
  if (Math.hypot(cand.x + cand.w / 2, cand.y + cand.h / 2) < 24) return false;
  return true;
}

/**
 * Deterministic relaxation: push dwellings apart until every pair (and every
 * fixed civic/reserved footprint) keeps a DWELLING_MIN_GAP clear ring. The
 * blueprint shipped with touching/overlapping lots; this guarantees walkable
 * space all the way around each house. Unfixable lots are dropped.
 */
function spreadDwellingFootprints(rects, reserved) {
  const obstaclesFor = (i) => {
    const out = [];
    for (let j = 0; j < rects.length; j += 1) {
      if (j !== i) out.push(rects[j]);
    }
    for (const r of reserved) out.push(r);
    return out;
  };

  for (let pass = 0; pass < 80; pass += 1) {
    let moved = false;
    for (let i = 4; i < rects.length; i += 1) {
      const r = rects[i];
      let conflict = null;
      for (const o of obstaclesFor(i)) {
        if (rectsOverlapPadded(r, o, DWELLING_MIN_GAP)) {
          conflict = o;
          break;
        }
      }
      if (!conflict) continue;
      const rcx = r.x + r.w / 2;
      const rcy = r.y + r.h / 2;
      const ocx = conflict.x + conflict.w / 2;
      const ocy = conflict.y + conflict.h / 2;
      const needX = Math.ceil((r.w + conflict.w) / 2 + DWELLING_MIN_GAP - Math.abs(rcx - ocx)) + 0;
      const needY = Math.ceil((r.h + conflict.h) / 2 + DWELLING_MIN_GAP - Math.abs(rcy - ocy)) + 0;
      const sx = rcx >= ocx ? 1 : -1;
      const sy = rcy >= ocy ? 1 : -1;
      const tries = needX <= needY
        ? [[sx * needX, 0], [0, sy * needY], [sx * needX, sy * needY]]
        : [[0, sy * needY], [sx * needX, 0], [sx * needX, sy * needY]];
      for (const [dx, dy] of tries) {
        const cand = { x: r.x + dx, y: r.y + dy, w: r.w, h: r.h };
        if (!rectFitsTownStatic(cand)) continue;
        r.x = cand.x;
        r.y = cand.y;
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }

  /** Drop any lot still cramped after relaxation (rare, deterministic). */
  for (let i = rects.length - 1; i >= 4; i -= 1) {
    const r = rects[i];
    let bad = false;
    for (const o of obstaclesFor(i)) {
      if (rectsOverlapPadded(r, o, 1)) {
        bad = true;
        break;
      }
    }
    if (bad) rects.splice(i, 1);
  }
}

function dwellingStyleFor(x, y) {
  return DWELLING_STYLES[Math.floor(hz(x, y, 6161) * DWELLING_STYLES.length)] || "timber";
}

/** Two-story roll: pubs always; roomy non-buyable cottages often. */
function dwellingIsTwoStory(bld) {
  if (bld.isPub) return true;
  if (bld.forSale) return false;
  if (bld.type !== "hut" && bld.type !== "house" && bld.type !== "big_house") return false;
  if (bld.w < 7 || bld.h < 6) return false;
  return hz(bld.x, bld.y, 6195) > 0.52;
}

function cuteHouseName(x, y) {
  const first = CUTE_HOUSE_FIRSTS[Math.floor(hz(x, y, 6171) * CUTE_HOUSE_FIRSTS.length)];
  const second = CUTE_HOUSE_SECONDS[Math.floor(hz(x, y, 6172) * CUTE_HOUSE_SECONDS.length)];
  return `${first} ${second}`;
}

/**
 * Sky promenade — the town's second level. Walkable plank bridges span the
 * gaps between paired cottages (with balcony decks resting on each roof),
 * plus a few free-standing viewing platforms. Exterior stair runs connect
 * ground (layer 0) to the deck level (layer 1). Ground tiles underneath stay
 * fully playable; the client renders deck cells above layer-0 entities.
 *
 * Cell kinds: "deck" (balcony/platform planks), "bridge" (span planks),
 * "stairs" (layer-transition steps; dir = compass side holding the deck).
 * `edges` is a railing bitmask of missing neighbours: N=1 E=2 S=4 W=8.
 */
const HUB_MAX_BRIDGES = 8;
const HUB_MAX_PLATFORMS = 3;

function computeHubUpperDeck(hubBuildings, rects, pathKeys, wallKeys) {
  // Sky-promenade removed: the exterior rooftop decks, connecting bridges and the
  // outdoor ladders/stairs that fed them trapped players on the walkways (the only
  // way back down was through a house). Returning no upper cells removes the whole
  // elevated network from the starting town. Two-story HOUSE interiors are a separate
  // system (dwellingIsTwoStory + interior stairs) and are unaffected.
  return [];
  /* eslint-disable no-unreachable */
  const cells = new Map();
  const key = (x, y) => `${x},${y}`;
  const buildingAt = (tx, ty, pad = 0) => pointInRects(tx + 0.5, ty + 0.5, rects, pad);
  const portalNear = (tx, ty, r) => {
    for (const [px, py] of HUB_GATE_PORTAL_TILES) {
      if ((tx - px) ** 2 + (ty - py) ** 2 <= r * r) return true;
    }
    return false;
  };
  const stargateNear = (tx, ty) => Math.hypot(tx - 20, ty) < 8;
  const cellBad = (tx, ty) =>
    wallKeys.has(key(tx, ty)) || portalNear(tx, ty, 12) || stargateNear(tx, ty) ||
    (tx >= -2 && tx <= 2 && ty >= -2 && ty <= 2) ||
    isTileNearMinigameSite(tx, ty, "fantasy", 2);
  const stairsBad = (tx, ty) =>
    cellBad(tx, ty) || buildingAt(tx, ty, 0.05) || pathKeys.has(key(tx, ty)) || cells.has(key(tx, ty));

  const dwellings = hubBuildings
    .filter((b) => (b.type === "hut" || b.type === "house" || b.type === "big_house") && b.w * b.h <= 110)
    .sort((a, b) => a.x - b.x || a.y - b.y);

  const accepted = [];

  for (const a of dwellings) {
    if (accepted.length >= HUB_MAX_BRIDGES) break;
    for (const b of dwellings) {
      if (b === a) continue;
      const gapX = b.x - (a.x + a.w);
      if (gapX < 3 || gapX > 8) continue;
      const top = Math.max(a.y, b.y) + 1;
      const bot = Math.min(a.y + a.h, b.y + b.h) - 2;
      if (bot - top < 1) continue;
      const yr = top + Math.floor((bot - top - 1) / 2);
      const cx = a.x + a.w + gapX / 2;
      if (accepted.some((s) => Math.hypot(s.cx - cx, s.cy - yr) < 26)) continue;

      const cand = [];
      let ok = true;
      for (let yy = yr; yy <= yr + 1 && ok; yy += 1) {
        for (let xx = a.x + a.w - 2; xx <= b.x + 1; xx += 1) {
          if (cellBad(xx, yy) || cells.has(key(xx, yy))) { ok = false; break; }
          const onRoof = xx < a.x + a.w || xx >= b.x;
          if (!onRoof && buildingAt(xx, yy, 0)) { ok = false; break; }
          cand.push({ x: xx, y: yy, kind: onRoof ? "deck" : "bridge" });
        }
      }
      if (!ok) continue;

      /** Stair run descending from the bridge into the gap (south preferred). */
      const gapCols = [];
      for (let xx = a.x + a.w; xx < b.x; xx += 1) gapCols.push(xx);
      gapCols.sort((p, q) => Math.abs(p + 0.5 - cx) - Math.abs(q + 0.5 - cx) || p - q);
      let stair = null;
      for (const sxx of gapCols) {
        if (!stairsBad(sxx, yr + 2) && !stairsBad(sxx, yr + 3)) {
          stair = { x: sxx, rows: [yr + 2, yr + 3], dir: "n" };
          break;
        }
        if (!stairsBad(sxx, yr - 1) && !stairsBad(sxx, yr - 2)) {
          stair = { x: sxx, rows: [yr - 1, yr - 2], dir: "s" };
          break;
        }
      }
      if (!stair) continue;

      for (const c of cand) cells.set(key(c.x, c.y), { kind: c.kind });
      for (const sy of stair.rows) cells.set(key(stair.x, sy), { kind: "stairs", dir: stair.dir });
      accepted.push({ cx, cy: yr });

      /**
       * Make the paired roofs read as connected and wire their lofts to the
       * bridge: both houses go two-story, share a roof style, and remember the
       * adjacent bridge cell they open onto. `a` meets the bridge on its east
       * edge, `b` on its west edge. The loft door lands the player on the
       * bridge span just outside the house wall (and entering from there sends
       * them back into the loft) via the stair-travel machinery.
       */
      const sharedShape = Math.floor(hz(a.x, a.y, 4477) * 5);
      for (const [bld, dir, doorX] of [
        [a, "e", a.x + a.w],
        [b, "w", b.x - 1]
      ]) {
        bld.twoStory = true;
        bld.roofShape = sharedShape;
        bld.bridgeDir = dir;
        bld.bridgeDoor = { x: doorX, y: yr };
      }
      break;
    }
  }

  /** Free-standing viewing platforms (5×4 decks, stairs off the south edge). */
  const PLATFORM_SEEDS = [
    { cx: 36, cy: 14 }, { cx: -38, cy: -16 }, { cx: -14, cy: 38 },
    { cx: 16, cy: -40 }, { cx: 58, cy: 58 }, { cx: -58, cy: -58 }
  ];
  let platforms = 0;
  for (const seed of PLATFORM_SEEDS) {
    if (platforms >= HUB_MAX_PLATFORMS) break;
    let placed = false;
    for (let ring = 0; ring <= 6 && !placed; ring += 1) {
      for (let oy = -ring; oy <= ring && !placed; oy += 1) {
        for (let ox = -ring; ox <= ring && !placed; ox += 1) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== ring) continue;
          const px = seed.cx + ox;
          const py = seed.cy + oy;
          if (accepted.some((s) => Math.hypot(s.cx - (px + 2.5), s.cy - (py + 2)) < 24)) continue;
          let ok = true;
          for (let yy = py; yy < py + 4 && ok; yy += 1) {
            for (let xx = px; xx < px + 5; xx += 1) {
              if (cellBad(xx, yy) || buildingAt(xx, yy, 1) || cells.has(key(xx, yy))) { ok = false; break; }
            }
          }
          if (!ok) continue;
          const stx = px + 2;
          if (stairsBad(stx, py + 4) || stairsBad(stx, py + 5)) continue;
          for (let yy = py; yy < py + 4; yy += 1) {
            for (let xx = px; xx < px + 5; xx += 1) cells.set(key(xx, yy), { kind: "deck" });
          }
          cells.set(key(stx, py + 4), { kind: "stairs", dir: "n" });
          cells.set(key(stx, py + 5), { kind: "stairs", dir: "n" });
          accepted.push({ cx: px + 2.5, cy: py + 2 });
          platforms += 1;
          placed = true;
        }
      }
    }
  }

  /** Railing bitmask: edge where no neighbouring upper cell continues. */
  const out = [];
  for (const [k, cell] of cells) {
    const [tx, ty] = k.split(",").map(Number);
    let edges = 0;
    if (!cells.has(key(tx, ty - 1))) edges |= 1;
    if (!cells.has(key(tx + 1, ty))) edges |= 2;
    if (!cells.has(key(tx, ty + 1))) edges |= 4;
    if (!cells.has(key(tx - 1, ty))) edges |= 8;
    out.push({ x: tx, y: ty, kind: cell.kind, dir: cell.dir, edges });
  }
  return out;
}

function computeHubDistrict() {
  /** @type {{x:number,y:number,w:number,h:number}[]} */
  const rects = HUB_BLUEPRINT_RECT.map(([x, y, w, h]) => ({ x, y, w, h }));

  /** Fixed footprints added later in this function — size rolls must respect them. */
  const reservedRects = [
    ...HUB_FLETCHER_RECTS.map(([x, y, w, h]) => ({ x, y, w, h })),
    { x: 6, y: -116, w: 3, h: 5 },
    { x: 83, y: -79, w: 3, h: 5 },
    { x: 112, y: 4, w: 3, h: 5 },
    { x: 75, y: 82, w: 3, h: 5 },
    { x: -8, y: 112, w: 3, h: 5 },
    { x: -86, y: 73, w: 3, h: 5 },
    { x: -114, y: -8, w: 3, h: 5 },
    { x: -78, y: -87, w: 3, h: 5 },
    { x: -28, y: 78, w: 10, h: 8 },
    { x: 48, y: 34, w: 12, h: 9 },
    { x: 30, y: 48, w: 11, h: 8 }
  ];
  applyDwellingSizeVariety(rects, reservedRects);
  spreadDwellingFootprints(rects, reservedRects);

  /** Assign NPC lots by angular sweep from east */
  /** @type {{r:{x:number,y:number,w:number,h:number}, angle:number}[]} */
  const hutSlots = rects.slice(4).map((r) => ({
    r,
    angle: Math.atan2(r.y + r.h / 2, r.x + r.w / 2)
  }));
  hutSlots.sort((a, b) => a.angle - b.angle);

  /** Pick 20 buyable plots — farthest-from-centre huts preferred */
  const byDist = rects.slice(4).map((r) => ({
    r,
    dd: Math.hypot(r.x + r.w / 2, r.y + r.h / 2)
  }));
  byDist.sort((a, b) => b.dd - a.dd);
  const purchSet = new Set();
  for (let ii = 0; ii < byDist.length && purchSet.size < 20; ii += 1) {
    const slot = byDist[ii];
    if (slot.dd < 70 && purchSet.size < 8) continue;
    purchSet.add(`${slot.r.x},${slot.r.y}`);
  }
  /** Top up toward 20 */
  for (let ii = 0; ii < byDist.length && purchSet.size < 20; ii += 1) {
    purchSet.add(`${byDist[ii].r.x},${byDist[ii].r.y}`);
  }

  /** @type {Map<string,string>} footprint key -> npc id */
  const attachByFoot = new Map();
  let ni = 0;
  for (const slot of hutSlots) {
    if (ni >= HUB_NPC_ORDER.length) break;
    const kk = `${slot.r.x},${slot.r.y}`;
    if (purchSet.has(kk)) continue;
    attachByFoot.set(kk, HUB_NPC_ORDER[ni].id);
    ni += 1;
  }

  /**
   * Two extra taverns besides the Blue Tavern — pick free filler huts nearest
   * the SE plaza and the western mid-ring, then grow them to taproom size.
   */
  const PUB_PICK_DEFS = [
    { angle: Math.PI / 4, name: "The Gilded Goose" },
    { angle: Math.PI, name: "The Dancing Pony" }
  ];
  /** @type {Map<string,string>} footprint key -> pub name */
  const pubByFoot = new Map();
  for (const def of PUB_PICK_DEFS) {
    let best = null;
    let bestScore = Infinity;
    for (let i = 4; i < rects.length; i += 1) {
      const r = rects[i];
      const kk = `${r.x},${r.y}`;
      if (purchSet.has(kk) || attachByFoot.has(kk) || pubByFoot.has(kk)) continue;
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const dd = Math.hypot(cx, cy);
      if (dd < 30 || dd > 80) continue;
      let da = Math.abs(Math.atan2(cy, cx) - def.angle);
      if (da > Math.PI) da = TWO_PI - da;
      if (da < bestScore) {
        bestScore = da;
        best = { r, index: i };
      }
    }
    if (!best) continue;
    // Taprooms want a roomier footprint; keep the roll if the lot is cramped.
    const cand = {
      x: best.r.x - Math.floor((11 - best.r.w) / 2),
      y: best.r.y - Math.floor((8 - best.r.h) / 2),
      w: 11,
      h: 8
    };
    if (rectFitsTown(cand, best.index, rects, reservedRects)) {
      best.r.x = cand.x;
      best.r.y = cand.y;
      best.r.w = cand.w;
      best.r.h = cand.h;
    }
    pubByFoot.set(`${best.r.x},${best.r.y}`, def.name);
  }

  /** @type {any[]} */
  const hubBuildings = [];
  hubBuildings.push({
    ...rects[0],
    name: "Town Keep",
    type: "castle",
    forSale: false
  });
  hubBuildings.push({
    ...rects[1],
    name: "Home",
    type: "house",
    forSale: false
  });
  hubBuildings.push({
    ...rects[2],
    name: "Blue Tavern",
    type: "house",
    forSale: false,
    isPub: true,
    twoStory: true
  });
  hubBuildings.push({
    ...rects[3],
    name: "Market Hall",
    type: "house",
    forSale: false
  });

  /** Remaining footprints */
  for (let i = 4; i < rects.length; i += 1) {
    const r = rects[i];
    const kk = `${r.x},${r.y}`;
    let npcId = attachByFoot.get(kk);
    const buy = purchSet.has(kk);
    if (buy) npcId = undefined;
    const pubName = pubByFoot.get(kk);

    /** @type {any} */
    const bld = {
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      forSale: buy,
      style: dwellingStyleFor(r.x, r.y)
    };

    if (pubName) {
      bld.name = pubName;
      bld.type = "house";
      bld.isPub = true;
      bld.forSale = false;
      bld.style = "timber";
    } else if (npcId) {
      const nd = HUB_NPC_ORDER.find((z) => z.id === npcId);
      bld.name = nd ? nd.cottage : `NPC ${npcId}`;
      bld.type = "hut";
      bld.residentLabel = nd ? nd.label : undefined;
      bld.npcAttachId = npcId;
      const sig = residentSignBesideDoor(r.x, r.y, r.w, r.h);
      bld.residentSign = { sx: sig.sx, sy: sig.sy };
    } else {
      /** Player purchasable or filler — bigger lots read as houses, snug ones as huts. */
      const roomy = r.w * r.h >= 63;
      const typ = buy && roomy ? "big_house" : buy ? "house" : roomy && hz(r.x, r.y, 6183) > 0.5 ? "house" : "hut";
      bld.type = typ;
      const cute = cuteHouseName(r.x, r.y);
      const tag = `${r.x}_${r.y}`.slice(-12);
      bld.name = buy ? `${cute} #${tag}` : `${cute} (${tag})`;
    }

    if (dwellingIsTwoStory(bld)) bld.twoStory = true;

    hubBuildings.push(bld);
  }

  /** Gate towers — stone watchtower beside each of the 8 wall openings */
  const GATE_TOWER_W = 3;
  const GATE_TOWER_H = 5;
  const GATE_TOWER_DEFS = [
    { x:   6, y: -116 }, // N
    { x:  83, y:  -79 }, // NE
    { x: 112, y:    4 }, // E
    { x:  75, y:   82 }, // SE
    { x:  -8, y:  112 }, // S
    { x: -86, y:   73 }, // SW
    { x:-114, y:   -8 }, // W
    { x: -78, y:  -87 }, // NW
  ];
  for (const td of GATE_TOWER_DEFS) {
    rects.push({ x: td.x, y: td.y, w: GATE_TOWER_W, h: GATE_TOWER_H });
    hubBuildings.push({
      x: td.x, y: td.y,
      w: GATE_TOWER_W, h: GATE_TOWER_H,
      name: "Gate Tower",
      type: "tower",
      forSale: false,
    });
  }

  /** Fletcher workshops — footprints registered in rects so path-building avoids them
   * and connectHouseDoorways() carves roads to their south doors. */
  const FLETCHER_NAMES = [
    "East Fletching House",
    "South Fletching House",
    "West Fletching House",
    "North Fletching House",
    "Northeast Fletching House",
  ];
  for (let fi = 0; fi < HUB_FLETCHER_RECTS.length; fi++) {
    const [x, y, w, h] = HUB_FLETCHER_RECTS[fi];
    rects.push({ x, y, w, h });
    hubBuildings.push({
      x, y, w, h,
      name: FLETCHER_NAMES[fi] || "Fletching House",
      type: "fletcher",
      forSale: false,
      fletcherIndex: fi,
    });
  }

  const SPECIAL_WORKSHOP_RECTS = [
    { x: -28, y: 78, w: 10, h: 8, name: "Pip's Bakery", type: "house", professionId: "baking" },
    { x: 48, y: 34, w: 12, h: 9, name: "Ren's Forge House", type: "house", professionId: "blacksmithing" },
    { x: 30, y: 48, w: 11, h: 8, name: "Server Admin House", type: "house", professionId: "server_admin" },
  ];
  for (const b of SPECIAL_WORKSHOP_RECTS) {
    rects.push({ x: b.x, y: b.y, w: b.w, h: b.h });
    hubBuildings.push({
      ...b,
      forSale: false,
    });
  }

  const wallKeys = new Set();
  const pathKeys = new Set();
  const gardenKeys = new Set();

  buildWallTiles(wallKeys);
  buildPathTiles(pathKeys, wallKeys, rects);
  for (const k of [...pathKeys]) {
    if (wallKeys.has(k)) pathKeys.delete(k);
  }

  // Everything laid by buildPathTiles (ring roads + radial spokes) is cobbled
  // street; the doorway lanes and island bridges carved afterwards stay dirt.
  const roadCobbleKeys = new Set(pathKeys);

  pruneTilesNearListedPortals(pathKeys, HUB_GATE_PORTAL_TILES);
  connectHouseDoorways(rects, pathKeys, wallKeys);
  mergePathComponents(pathKeys, wallKeys, rects);

  /** Gardens after paths — prune garden keys conflicting with roads */
  addGardenPatches(gardenKeys, rects);
  pruneTilesNearListedPortals(gardenKeys, HUB_GATE_PORTAL_TILES);
  for (const kk of [...gardenKeys]) {
    const [gx, gy] = kk.split(",").map(Number);
    if (
      wallKeys.has(kk) ||
      pathKeys.has(kk) ||
      pointInRects(gx + 0.52, gy + 0.52, rects, 0.92)
    ) {
      gardenKeys.delete(kk);
    }
  }

  // Keep the cobble layer in sync with the pruned network.
  for (const k of [...roadCobbleKeys]) {
    if (!pathKeys.has(k)) roadCobbleKeys.delete(k);
  }

  const hubNavPathKeys = buildHubNavPathKeys(pathKeys, wallKeys);
  const hubUpperCells = computeHubUpperDeck(hubBuildings, rects, pathKeys, wallKeys);
  const upperGroundKeys = new Set(hubUpperCells.map((c) => `${c.x},${c.y}`));
  const pubRects = hubBuildings.filter((b) => b.isPub).map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h }));
  const hubRoadsides = buildHubRoadsideFeatures(pathKeys, wallKeys, gardenKeys, rects, pubRects, upperGroundKeys);

  return {
    hubBuildings,
    pathTileKeys: pathKeys,
    roadCobbleKeys,
    wallTileKeys: wallKeys,
    gardenTileKeys: gardenKeys,
    hubNavPathKeys,
    hubRoadsides,
    hubUpperCells,
    hubClearingRadius: HUB_CLEARING_RADIUS,
    hutSlotCount: rects.length - 4
  };
}

module.exports = {
  computeHubDistrict,
  HUB_CLEARING_RADIUS,
  HUB_FLETCHER_RECTS,
  /** Read-only roster used to tag hub-bound NPCs without circular imports through world.js */
  HUB_NPC_ORDER
};
