"use strict";

const TWO_PI = Math.PI * 2;

const HUB_CLEARING_RADIUS = 132;

/** Wall stone ring — hollow inside HUB_WALL_R_IN_MAIN. */
const HUB_WALL_R_OUT_MAIN = 119;
const HUB_WALL_R_OUT_PARAPET = 121;
const HUB_WALL_R_IN_MAIN = 117;
const GATE_AXIS_HALF_WIDTH_TILES = 3;

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
  if (Math.abs(tx) <= g && (ty <= -edge || ty >= edge)) return true;
  if (Math.abs(ty) <= g && (tx <= -edge || tx >= edge)) return true;
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

function computeHubDistrict() {
  /** @type {{x:number,y:number,w:number,h:number}[]} */
  const rects = HUB_BLUEPRINT_RECT.map(([x, y, w, h]) => ({ x, y, w, h }));

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
    isPub: true
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

    /** @type {any} */
    const bld = {
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      forSale: buy
    };

    if (npcId) {
      const nd = HUB_NPC_ORDER.find((z) => z.id === npcId);
      bld.name = nd ? nd.cottage : `NPC ${npcId}`;
      bld.type = "hut";
      bld.residentLabel = nd ? nd.label : undefined;
      bld.npcAttachId = npcId;
      const sig = residentSignBesideDoor(r.x, r.y, r.w, r.h);
      bld.residentSign = { sx: sig.sx, sy: sig.sy };
    } else {
      /** Player purchasable or filler */
      const typ = buy && Number(i) % 4 === 0 ? "big_house" : buy ? "house" : "hut";
      bld.type = typ;
      const tag = `${r.x}_${r.y}`.slice(-12);
      bld.name = buy ? `${typ === "big_house" ? "Garden Villa" : "Garden Close"} #${tag}` : `Garden Close (${tag})`;
    }

    hubBuildings.push(bld);
  }

  const wallKeys = new Set();
  const pathKeys = new Set();
  const gardenKeys = new Set();

  buildWallTiles(wallKeys);
  buildPathTiles(pathKeys, wallKeys, rects);
  for (const k of [...pathKeys]) {
    if (wallKeys.has(k)) pathKeys.delete(k);
  }

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

  return {
    hubBuildings,
    pathTileKeys: pathKeys,
    wallTileKeys: wallKeys,
    gardenTileKeys: gardenKeys,
    hubClearingRadius: HUB_CLEARING_RADIUS,
    hutSlotCount: rects.length - 4
  };
}

module.exports = {
  computeHubDistrict,
  HUB_CLEARING_RADIUS
};
