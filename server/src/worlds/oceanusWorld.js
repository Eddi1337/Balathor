"use strict";

/**
 * The Boundless Ocean ("oceanus") — a massive open-water world dotted with
 * 100+ small islands. Island definitions (position, size, pier direction,
 * content, decorative layout) live in content/worlds/oceanus/islands.json and
 * are loaded here. Tiles (water, sandy beaches, grassy centres, port piers) are
 * generated procedurally around those definitions, so the data file stays small
 * while the world is huge.
 *
 * Each island gets a pier that sticks out into the water, a dock port where a
 * player's boat moors, and a shipwright + chandler at the dock. Per-island
 * content (enemies / trader / loot / critters / objects) is surfaced via
 * getOceanusContentSpawns() and consumed by server/src/index.js.
 */

const { readJson } = require("./contentLoader.js");

const NAUTICAL_THEME = "nautical";

const DATA = readJson("worlds/oceanus/islands.json") || {
  bounds: { minX: -46000, maxX: -40000, minY: -3000, maxY: 3000 },
  landing: { x: -43240, y: -162 },
  islands: []
};

const OCEANUS_BOUNDS = Object.freeze({
  minX: Number(DATA.bounds.minX),
  maxX: Number(DATA.bounds.maxX),
  minY: Number(DATA.bounds.minY),
  maxY: Number(DATA.bounds.maxY)
});

const STARTER_ISLAND = Object.freeze({
  id: "starter_isle",
  name: "Port Bilgewater",
  x: (Number(DATA.landing?.x) || -43240) - 580,
  y: (Number(DATA.landing?.y) || -162) + 42,
  landRadius: 26
});
const STARTER_PIER_DIR = "south";

const OCEANUS_ISLANDS = Object.freeze(
  (Array.isArray(DATA.islands) ? DATA.islands : []).map((isle) =>
    Object.freeze({
      id: String(isle.id),
      name: String(isle.name || isle.id),
      x: Number(isle.x),
      y: Number(isle.y),
      landRadius: Math.max(8, Number(isle.landRadius) || 32),
      pierDir: ["north", "south", "east", "west"].includes(isle.pierDir) ? isle.pierDir : "south",
      hub: Boolean(isle.hub),
      content: Object.freeze({ ...(isle.content || { kind: "objects" }) }),
      layout: Object.freeze((Array.isArray(isle.layout) ? isle.layout : []).map((p) => Object.freeze({ ...p })))
    })
  )
);

const PIER_LEN = 10;
const PIER_HALF_WIDTH = 1;          // pier is 3 tiles wide
const HUB_PLAZA_RADIUS = 8;
const HUB_PATH_HALF_WIDTH = 2;

const OCEANUS_TELEPORTER = Object.freeze({
  x: Math.round(STARTER_ISLAND.x),
  y: Math.round(STARTER_ISLAND.y)
});
const TELEPORTER_DISK_R = 4;
const TELEPORTER_SPOKE_MAX = 18;

/** Path-rosette test: compact disk at the teleporter plus eight straight spokes. */
function isTeleporterRosette(x, y) {
  const vx = x - OCEANUS_TELEPORTER.x;
  const vy = y - OCEANUS_TELEPORTER.y;
  const r = Math.hypot(vx, vy);
  if (r <= TELEPORTER_DISK_R + 1e-9) return true;
  if (r > TELEPORTER_SPOKE_MAX + 1e-9) return false;
  if (vx === 0 || vy === 0) return true;
  return vx === vy || vx === -vy;
}

// ---------------------------------------------------------------------------
// Spatial index — bucket islands into a coarse grid so tile lookups only test
// nearby islands instead of all 135.
// ---------------------------------------------------------------------------
const CELL = 480;
const islandGrid = new Map();
function cellKey(cx, cy) {
  return `${cx},${cy}`;
}
for (const isle of OCEANUS_ISLANDS) {
  const cx = Math.floor(isle.x / CELL);
  const cy = Math.floor(isle.y / CELL);
  const key = cellKey(cx, cy);
  let list = islandGrid.get(key);
  if (!list) {
    list = [];
    islandGrid.set(key, list);
  }
  list.push(isle);
}

function nearbyIslands(x, y) {
  const cx = Math.floor(x / CELL);
  const cy = Math.floor(y / CELL);
  const out = [];
  for (let ox = -1; ox <= 1; ox += 1) {
    for (let oy = -1; oy <= 1; oy += 1) {
      const list = islandGrid.get(cellKey(cx + ox, cy + oy));
      if (list) {
        for (const isle of list) {
          out.push(isle);
        }
      }
    }
  }
  return out;
}

function isInOceanusBounds(x, y) {
  return (
    x >= OCEANUS_BOUNDS.minX &&
    x <= OCEANUS_BOUNDS.maxX &&
    y >= OCEANUS_BOUNDS.minY &&
    y <= OCEANUS_BOUNDS.maxY
  );
}

function getOceanusAtPoint(x, y) {
  return isInOceanusBounds(x, y) ? "oceanus" : null;
}

function smoothNoise(x, y, scale, seed) {
  const sx = x / scale;
  const sy = y / scale;
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = sx - ix;
  const fy = sy - iy;
  const hash = (a, b) => {
    let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ (seed | 0);
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** Nearest island whose land footprint covers (x, y); null over open water. */
function islandAtPoint(x, y) {
  let best = null;
  let bestScore = 0;
  const starterScore = starterIslandScore(x, y);
  if (starterScore > bestScore) {
    bestScore = starterScore;
    best = STARTER_ISLAND;
  }
  for (const isle of nearbyIslands(x, y)) {
    const score = islandShapeScore(isle, x, y);
    if (score > bestScore) {
      bestScore = score;
      best = isle;
    }
  }
  return bestScore > 0 ? best : null;
}

/**
 * Signed land score for the nearest island: ~1 at an island centre, 0 at its
 * shore, and negative over open water (the further out, the more negative). The
 * negative range is what keeps the ocean as WATER rather than an endless beach.
 */
function islandLandScore(x, y) {
  let best = starterIslandScore(x, y);
  for (const isle of nearbyIslands(x, y)) {
    const t = islandShapeScore(isle, x, y);
    if (t > best) best = t;
  }
  return best;
}

function islandShapeScore(isle, x, y) {
  const dx = x - isle.x;
  const dy = y - isle.y;
  return 1 - Math.hypot(dx, dy) / Math.max(8, Number(isle?.landRadius) || 32);
}

function islandRadii(isle) {
  const r = Math.max(8, Number(isle?.landRadius) || 32);
  return {
    rx: r,
    ryNorth: r,
    rySouth: r
  };
}

function islandMaxReach(isle) {
  const radii = islandRadii(isle);
  return Math.max(radii.rx, radii.ryNorth, radii.rySouth);
}

/** Pier geometry for an island: a band that sticks out into the water. */
function pierReachForIsland(isle) {
  return Math.max(8, Number(isle?.landRadius) || 32);
}

function starterIslandScore(x, y) {
  const dx = x - STARTER_ISLAND.x;
  const dy = y - STARTER_ISLAND.y;
  return 1 - Math.hypot(dx, dy) / STARTER_ISLAND.landRadius;
}

const STARTER_PIER_HALF_WIDTH = 4;       // broad central boardwalk leading off the island
const STARTER_PIER_HEAD_HALF = 18;       // crossbar spanning all five moorings
const STARTER_MOORING_CLEARANCE = 9;     // open water gap between the quay and a moored hull
                                         // (kept within the ~14-tile dock-terminal reach so players
                                         // standing on the pier head can still summon/board)

function starterPierRect() {
  const r = STARTER_ISLAND.landRadius;
  return {
    minX: STARTER_ISLAND.x - STARTER_PIER_HALF_WIDTH,
    maxX: STARTER_ISLAND.x + STARTER_PIER_HALF_WIDTH,
    minY: STARTER_ISLAND.y + r - 2,
    maxY: STARTER_ISLAND.y + r + PIER_LEN
  };
}

/** T-shaped pier head: a wide walkable crossbar spanning all starter moorings. */
function starterPierHeadRect() {
  const r = STARTER_ISLAND.landRadius;
  return {
    minX: STARTER_ISLAND.x - STARTER_PIER_HEAD_HALF,
    maxX: STARTER_ISLAND.x + STARTER_PIER_HEAD_HALF,
    minY: STARTER_ISLAND.y + r + PIER_LEN - 3,
    maxY: STARTER_ISLAND.y + r + PIER_LEN
  };
}

function onStarterPier(x, y) {
  const p = starterPierRect();
  if (x >= p.minX && x <= p.maxX && y >= p.minY && y <= p.maxY) return true;
  const head = starterPierHeadRect();
  if (x >= head.minX && x <= head.maxX && y >= head.minY && y <= head.maxY) return true;
  return false;
}

function pierRect(isle) {
  const r = pierReachForIsland(isle);
  if (isle.pierDir === "south") {
    return { minX: isle.x - PIER_HALF_WIDTH, maxX: isle.x + PIER_HALF_WIDTH, minY: isle.y + r - 2, maxY: isle.y + r + PIER_LEN };
  }
  if (isle.pierDir === "north") {
    return { minX: isle.x - PIER_HALF_WIDTH, maxX: isle.x + PIER_HALF_WIDTH, minY: isle.y - r - PIER_LEN, maxY: isle.y - r + 2 };
  }
  if (isle.pierDir === "east") {
    return { minX: isle.x + r - 2, maxX: isle.x + r + PIER_LEN, minY: isle.y - PIER_HALF_WIDTH, maxY: isle.y + PIER_HALF_WIDTH };
  }
  return { minX: isle.x - r - PIER_LEN, maxX: isle.x - r + 2, minY: isle.y - PIER_HALF_WIDTH, maxY: isle.y + PIER_HALF_WIDTH };
}

function onPier(isle, x, y) {
  const p = pierRect(isle);
  return x >= p.minX && x <= p.maxX && y >= p.minY && y <= p.maxY;
}

const PROP_TILE = {
  tree: "TREE",
  palm: "TREE",
  mangrove: "TREE",
  banana: "TREE",
  fern: "FLOWERS",
  reeds: "FLOWERS",
  flowers: "FLOWERS",
  rock: "STONE"
};

function propTileAt(isle, x, y, TILE) {
  for (const prop of isle.layout) {
    if (isle.x + (prop.dx | 0) === x && isle.y + (prop.dy | 0) === y) {
      return TILE[PROP_TILE[prop.kind] || "TREE"];
    }
  }
  return null;
}

function getOceanusTile(x, y, TILE, hash2) {
  if (onStarterPier(x, y)) {
    const detail = hash2(x, y, 8797);
    return detail > 0.92 ? TILE.STONE : TILE.PATH;
  }
  // Walkable pier planks over the water.
  for (const isle of nearbyIslands(x, y)) {
    if (onPier(isle, x, y)) {
      const detail = hash2(x, y, 8801);
      return detail > 0.92 ? TILE.STONE : TILE.PATH;
    }
  }

  // Road rosette radiating from the hub island's return teleporter (drawn ahead
  // of beach/water so the roads stay connected down to the dock).
  if (isTeleporterRosette(Math.floor(x), Math.floor(y))) {
    return TILE.PATH;
  }

  const land = islandLandScore(x, y);
  const isle = islandAtPoint(x, y);

  if (land <= 0) {
    return TILE.WATER; // open ocean
  }

  if (land < 0.16) {
    return TILE.SAND; // sandy beach ring
  }

  if (isle?.id === STARTER_ISLAND.id) {
    const dist = Math.hypot(x - STARTER_ISLAND.x, y - STARTER_ISLAND.y);
    if (dist <= HUB_PLAZA_RADIUS + 1) return hash2(x, y, 8811) > 0.88 ? TILE.STONE : TILE.PATH;
    if (Math.abs(x - STARTER_ISLAND.x) <= PIER_HALF_WIDTH + 1 && y > STARTER_ISLAND.y + STARTER_ISLAND.landRadius * 0.3) return TILE.PATH;
    if (hash2(x, y, 8812) > 0.9) return TILE.FLOWERS;
    return TILE.GRASS;
  }

  if (isle) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    const prop = propTileAt(isle, tx, ty, TILE);
    if (prop != null) return prop;

    const dx = x - isle.x;
    const dy = y - isle.y;
    const pierReach = pierReachForIsland(isle);
    // Port path leading inland from the pier.
    const pierBand =
      (isle.pierDir === "south" && dy > pierReach * 0.36 && Math.abs(dx) <= PIER_HALF_WIDTH + 1) ||
      (isle.pierDir === "north" && dy < -pierReach * 0.36 && Math.abs(dx) <= PIER_HALF_WIDTH + 1) ||
      (isle.pierDir === "east" && dx > pierReach * 0.36 && Math.abs(dy) <= PIER_HALF_WIDTH + 1) ||
      (isle.pierDir === "west" && dx < -pierReach * 0.36 && Math.abs(dy) <= PIER_HALF_WIDTH + 1);
    if (pierBand) return TILE.PATH;

    if (Math.hypot(dx, dy) < 3) return TILE.PATH;
  }

  const detail = hash2(x, y, 8803);
  if (detail > 0.9) return TILE.TREE;
  if (detail > 0.82) return TILE.FLOWERS;
  return TILE.GRASS;
}

// ---------------------------------------------------------------------------
// Dock ports + harbour features (shipwright, chandler, trader markets).
// ---------------------------------------------------------------------------
function facingForPier(dir) {
  return dir; // "north" | "south" | "east" | "west"
}

function dockPortForIsland(isle) {
  const r = pierReachForIsland(isle);
  const mooringClearance = 8;
  let x = isle.x;
  let y = isle.y;
  if (isle.pierDir === "south") y = isle.y + r + PIER_LEN + mooringClearance;
  else if (isle.pierDir === "north") y = isle.y - r - PIER_LEN - mooringClearance;
  else if (isle.pierDir === "east") x = isle.x + r + PIER_LEN + mooringClearance;
  else x = isle.x - r - PIER_LEN - mooringClearance;

  // Pier-head plank tile: the walkable end of the pier where the boarding
  // plank bridges across to a moored ship.
  let plankX = isle.x;
  let plankY = isle.y;
  if (isle.pierDir === "south") plankY = isle.y + r + PIER_LEN;
  else if (isle.pierDir === "north") plankY = isle.y - r - PIER_LEN;
  else if (isle.pierDir === "east") plankX = isle.x + r + PIER_LEN;
  else plankX = isle.x - r - PIER_LEN;

  // Terminal: a few tiles back toward the island (where you stand on the dock).
  const inward = isle.hub ? 25 : 5;
  let tx = x;
  let ty = y;
  if (isle.pierDir === "south") ty = y - inward;
  else if (isle.pierDir === "north") ty = y + inward;
  else if (isle.pierDir === "east") tx = x - inward;
  else tx = x + inward;

  return Object.freeze({
    id: `${isle.id}_dock`,
    harbourId: isle.id,
    harbourName: isle.name,
    x,
    y,
    facing: facingForPier(isle.pierDir),
    plankX,
    plankY,
    terminalX: tx,
    terminalY: ty,
    islandX: isle.x,
    islandY: isle.y
  });
}

const OCEANUS_PORTS = Object.freeze(OCEANUS_ISLANDS.map(dockPortForIsland));
const PORTS_BY_ISLAND = new Map(OCEANUS_PORTS.map((p) => [p.harbourId, p]));

function starterPortAt(idSuffix, xOffset, yOffset = 0) {
  return Object.freeze({
    id: `${STARTER_ISLAND.id}_${idSuffix}`,
    harbourId: STARTER_ISLAND.id,
    harbourName: STARTER_ISLAND.name,
    x: STARTER_ISLAND.x + xOffset,
    y: STARTER_ISLAND.y + STARTER_ISLAND.landRadius + PIER_LEN + STARTER_MOORING_CLEARANCE + yOffset,
    facing: STARTER_PIER_DIR,
    plankX: STARTER_ISLAND.x + xOffset,
    plankY: STARTER_ISLAND.y + STARTER_ISLAND.landRadius + PIER_LEN,
    terminalX: STARTER_ISLAND.x + xOffset,
    terminalY: STARTER_ISLAND.y + STARTER_ISLAND.landRadius + 1,
    islandX: STARTER_ISLAND.x,
    islandY: STARTER_ISLAND.y
  });
}

const STARTER_PORTS = Object.freeze([
  starterPortAt("dock", 0, 0),
  starterPortAt("west_dock", -7, 1),
  starterPortAt("east_dock", 7, 1),
  starterPortAt("far_west_dock", -14, 2),
  starterPortAt("far_east_dock", 14, 2)
]);
const STARTER_PORT = STARTER_PORTS[0];

function buildFeatures() {
  const out = [];
  for (const isle of OCEANUS_ISLANDS) {
    const port = PORTS_BY_ISLAND.get(isle.id);
    const pr = pierRect(isle);
    out.push(
      Object.freeze({
        id: `${isle.id}_pier`,
        kind: "harbour-pier",
        name: `${isle.name} Pier`,
        harbourId: isle.id,
        x: Math.round((pr.minX + pr.maxX) / 2),
        y: Math.round((pr.minY + pr.maxY) / 2),
        w: Math.max(1, pr.maxX - pr.minX + 1),
        h: Math.max(1, pr.maxY - pr.minY + 1)
      })
    );
    if (port) {
      out.push(
        Object.freeze({
          id: `${port.id}_mooring`,
          kind: "ship-port",
          name: `${isle.name} Mooring`,
          harbourId: isle.id,
          x: port.x,
          y: port.y,
          w: 5,
          h: 3,
          facing: port.facing,
          plankX: port.plankX,
          plankY: port.plankY,
          portId: port.id
        })
      );
      out.push(
        Object.freeze({
          id: `${isle.id}_shipwright`,
          kind: "ship-console",
          name: `${isle.name} Shipwright`,
          harbourId: isle.id,
          x: port.terminalX,
          y: port.terminalY,
          w: 4,
          h: 4
        })
      );
      // Chandlery (ship outfitter) at every dock.
      const inward =
        isle.pierDir === "south" ? { dx: 4, dy: -3 }
          : isle.pierDir === "north" ? { dx: -4, dy: 3 }
            : isle.pierDir === "east" ? { dx: -3, dy: 4 }
              : { dx: 3, dy: -4 };
      out.push(
        Object.freeze({
          id: `${isle.id}_chandler`,
          kind: "ship-shop",
          name: `${isle.name} Chandlery`,
          shopName: `${isle.name} Chandlery`,
          shopType: "ship",
          harbourId: isle.id,
          x: port.terminalX + inward.dx,
          y: port.terminalY + inward.dy,
          w: 4,
          h: 4
        })
      );
      // Trader islands get an extra market stall near the island centre.
      if (isle.content.kind === "trader") {
        out.push(
          Object.freeze({
            id: `${isle.id}_market`,
            kind: "ship-shop",
            name: isle.content.shopName || `${isle.name} Market`,
            shopName: isle.content.shopName || `${isle.name} Market`,
            shopType: "ship",
            harbourId: isle.id,
            x: Math.round(isle.x),
            y: Math.round(isle.y - 2),
            w: 4,
            h: 4
          })
        );
      }
    }
  }
  return Object.freeze(out);
}

const OCEANUS_FEATURES = buildFeatures();

/**
 * Port Bilgewater — the big pirate starter harbour. A broad central boardwalk
 * runs out from the island to a wide crossbar pier with five finger-pier
 * moorings; dockside buildings (taverns, warehouses, the shipwright, market
 * stalls) and props (barrels, crates, lanterns, capstans) cluster around the
 * waterfront so it reads as a bustling pirate town rather than a lone jetty.
 */
function buildStarterFeatures() {
  const out = [];
  const ix = STARTER_ISLAND.x;
  const iy = STARTER_ISLAND.y;
  const r = STARTER_ISLAND.landRadius;
  const dockY = STARTER_PORT.terminalY; // dockside terminal row, just inland of the pier

  out.push(Object.freeze({
    id: `${STARTER_ISLAND.id}_harbour`,
    kind: "harbour",
    name: STARTER_ISLAND.name,
    x: ix,
    y: iy,
    radius: r,
    w: r * 2,
    h: r * 2
  }));

  // Broad central boardwalk + the wide crossbar pier head.
  out.push(Object.freeze({
    id: `${STARTER_ISLAND.id}_pier`,
    kind: "harbour-pier",
    name: `${STARTER_ISLAND.name} Boardwalk`,
    harbourId: STARTER_ISLAND.id,
    x: ix,
    y: iy + r + Math.floor(PIER_LEN / 2),
    w: STARTER_PIER_HALF_WIDTH * 2 + 1,
    h: PIER_LEN + 3
  }));
  out.push(Object.freeze({
    id: `${STARTER_ISLAND.id}_pier_head`,
    kind: "harbour-pier",
    name: `${STARTER_ISLAND.name} Quay`,
    harbourId: STARTER_ISLAND.id,
    x: ix,
    y: iy + r + PIER_LEN - 1,
    w: STARTER_PIER_HEAD_HALF * 2 + 1,
    h: 4
  }));

  for (const port of STARTER_PORTS) {
    out.push(Object.freeze({
      id: port.id,
      kind: "ship-port",
      name: `${STARTER_ISLAND.name} Mooring`,
      harbourId: STARTER_ISLAND.id,
      x: port.x,
      y: port.y,
      w: 5,
      h: 3,
      facing: port.facing,
      plankX: port.plankX,
      plankY: port.plankY,
      portId: port.id
    }));
  }

  // Dockside service buildings.
  out.push(Object.freeze({
    id: `${STARTER_ISLAND.id}_shipwright`,
    kind: "ship-console",
    name: `${STARTER_ISLAND.name} Shipwright`,
    harbourId: STARTER_ISLAND.id,
    x: ix - 6,
    y: dockY,
    w: 4,
    h: 4
  }));
  out.push(Object.freeze({
    id: `${STARTER_ISLAND.id}_chandler`,
    kind: "ship-shop",
    name: `${STARTER_ISLAND.name} Chandlery`,
    shopName: `${STARTER_ISLAND.name} Chandlery`,
    shopType: "ship",
    harbourId: STARTER_ISLAND.id,
    x: ix + 6,
    y: dockY,
    w: 4,
    h: 4
  }));

  // Waterfront town buildings flanking the boardwalk.
  const buildings = [
    { sub: "tavern", name: "The Salty Siren Tavern", dx: -14, dy: -2, w: 7, h: 6, roof: "#7a3b2a", wall: "#8a6a44" },
    { sub: "warehouse", name: "Bilgewater Warehouse", dx: 14, dy: -2, w: 7, h: 6, roof: "#4a4036", wall: "#6e5a3c" },
    { sub: "market", name: "Smuggler's Market", dx: -16, dy: 6, w: 6, h: 5, roof: "#5a6b3a", wall: "#7c7048" },
    { sub: "guild", name: "Pirate Guild Hall", dx: 16, dy: 6, w: 6, h: 5, roof: "#3a3550", wall: "#5c5470" },
    { sub: "house", name: "Harbourmaster's Lodge", dx: -8, dy: -10, w: 5, h: 5, roof: "#6a4a30", wall: "#8a7250" },
    { sub: "house", name: "Keeper's Cottage", dx: 8, dy: -10, w: 5, h: 5, roof: "#52442e", wall: "#7c6648" }
  ];
  for (const b of buildings) {
    out.push(Object.freeze({
      id: `${STARTER_ISLAND.id}_bld_${b.sub}_${b.dx}_${b.dy}`,
      kind: "harbour-building",
      subKind: b.sub,
      name: b.name,
      harbourId: STARTER_ISLAND.id,
      x: ix + b.dx,
      y: iy + b.dy,
      w: b.w,
      h: b.h,
      roofColor: b.roof,
      wallColor: b.wall
    }));
  }

  // Lighthouse landmark at the seaward tip.
  out.push(Object.freeze({
    id: `${STARTER_ISLAND.id}_lighthouse`,
    kind: "harbour-lighthouse",
    name: `${STARTER_ISLAND.name} Lighthouse`,
    harbourId: STARTER_ISLAND.id,
    x: ix - r + 5,
    y: iy + r - 8,
    w: 3,
    h: 3
  }));

  // Dockside props scattered along the quay and boardwalk.
  const props = [
    { kind: "barrel", dx: -10, dy: 14 }, { kind: "barrel", dx: -8, dy: 15 },
    { kind: "crate", dx: 9, dy: 14 }, { kind: "crate", dx: 11, dy: 15 },
    { kind: "crate", dx: -14, dy: 12 }, { kind: "barrel", dx: 13, dy: 12 },
    { kind: "lantern", dx: -5, dy: 16 }, { kind: "lantern", dx: 5, dy: 16 },
    { kind: "capstan", dx: 0, dy: 16 },
    { kind: "barrel", dx: -3, dy: 10 }, { kind: "crate", dx: 3, dy: 10 },
    { kind: "cannon", dx: -17, dy: 9 }, { kind: "cannon", dx: 17, dy: 9 },
    { kind: "barrel", dx: -22, dy: 1 }, { kind: "crate", dx: 22, dy: 1 },
    { kind: "rope", dx: -12, dy: 17 }, { kind: "rope", dx: 12, dy: 17 },
    { kind: "anchor", dx: 7, dy: 18 }, { kind: "anchor", dx: -7, dy: 18 }
  ];
  for (const [index, prop] of props.entries()) {
    out.push(Object.freeze({
      id: `${STARTER_ISLAND.id}_dprop_${index}`,
      kind: "harbour-prop",
      propKind: prop.kind,
      harbourId: STARTER_ISLAND.id,
      x: ix + prop.dx,
      y: iy + prop.dy
    }));
  }

  return Object.freeze(out);
}

const STARTER_FEATURES = buildStarterFeatures();

const OCEANUS_LANDING = Object.freeze({
  x: STARTER_ISLAND.x,
  y: STARTER_ISLAND.y
});

const HUB_ISLAND = OCEANUS_ISLANDS.find((isle) => isle.hub) || OCEANUS_ISLANDS[0] || null;
const HUB_PORT = HUB_ISLAND ? PORTS_BY_ISLAND.get(HUB_ISLAND.id) : OCEANUS_PORTS[0];
const OCEANUS_SAFE_LANDING = Object.freeze(
  { x: Math.round(STARTER_ISLAND.x), y: Math.round(STARTER_ISLAND.y + 6) }
);

function oceanusDockPortForPlayerId(/* playerId */) {
  // Everyone spawns at the safe hub dock with their boat moored.
  return HUB_PORT || OCEANUS_PORTS[0] || null;
}

function oceanusPortById(id) {
  if (typeof id !== "string" || !id) return null;
  if (id === STARTER_PORT.id) return STARTER_PORT;
  const starter = STARTER_PORTS.find((p) => p.id === id);
  if (starter) return starter;
  return OCEANUS_PORTS.find((p) => p.id === id) || null;
}

function findNearestOceanusPort(px, py, maxDist = 14) {
  const md = maxDist * maxDist;
  let best = null;
  let bestD = md;
  for (const port of STARTER_PORTS) {
    const dx = px - port.x;
    const dy = py - port.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = port;
    }
  }
  for (const p of OCEANUS_PORTS) {
    const dx = px - p.x;
    const dy = py - p.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

function featureTouchesChunk(feature, startX, startY, endX, endY) {
  const fw = Math.max(1, Number(feature.w || 1));
  const fh = Math.max(1, Number(feature.h || 1));
  const minX = feature.x - Math.floor(fw / 2);
  const minY = feature.y - Math.floor(fh / 2);
  return minX < endX && minX + fw > startX && minY < endY && minY + fh > startY;
}

function getOceanusObjectsInChunk(cx, cy, chunkSize) {
  const startX = cx * chunkSize;
  const startY = cy * chunkSize;
  const endX = startX + chunkSize;
  const endY = startY + chunkSize;
  const out = [];
  const starterReach = STARTER_ISLAND.landRadius + PIER_LEN + 16;
  if (
    STARTER_ISLAND.x >= startX - starterReach && STARTER_ISLAND.x < endX + starterReach &&
    STARTER_ISLAND.y >= startY - starterReach && STARTER_ISLAND.y < endY + starterReach
  ) {
    for (const feature of STARTER_FEATURES) {
      if (featureTouchesChunk(feature, startX, startY, endX, endY)) {
        out.push({ ...feature });
      }
    }
  }
  for (const isle of OCEANUS_ISLANDS) {
    const reach = islandMaxReach(isle) + PIER_LEN + 16;
    if (
      isle.x >= startX - reach && isle.x < endX + reach &&
      isle.y >= startY - reach && isle.y < endY + reach
    ) {
      out.push({
        id: `harbour_${isle.id}`,
        kind: "harbour",
        name: isle.name,
        x: isle.x,
        y: isle.y,
        radius: islandMaxReach(isle),
        w: islandRadii(isle).rx * 2,
        h: (islandRadii(isle).ryNorth + islandRadii(isle).rySouth)
      });
      for (const [index, prop] of isle.layout.entries()) {
        const propX = isle.x + (prop.dx | 0);
        const propY = isle.y + (prop.dy | 0);
        if (propX < startX || propX >= endX || propY < startY || propY >= endY) continue;
        out.push({
          id: `${isle.id}_decor_${index}`,
          kind: "oceanus-decor",
          decorKind: prop.kind,
          x: propX,
          y: propY
        });
      }
    }
  }
  for (const feature of OCEANUS_FEATURES) {
    if (featureTouchesChunk(feature, startX, startY, endX, endY)) {
      out.push({ ...feature });
    }
  }
  // Deterministic ambient traffic. These are visual-only vessels with short
  // local routes, so the ocean feels inhabited without entering player fleets.
  const trafficHash = Math.abs(Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663));
  if (trafficHash % 70 === 0) {
    const trafficX = startX + 3 + (trafficHash % Math.max(1, chunkSize - 6));
    const trafficY = startY + 3 + ((trafficHash >>> 4) % Math.max(1, chunkSize - 6));
    if (!islandAtPoint(trafficX, trafficY)) {
      out.push({
        id: `ambient_ship_${cx}_${cy}`,
        kind: "ambient-sailing-ship",
        hullClass: trafficHash % 6 === 0 ? "galleon" : trafficHash % 3 === 0 ? "brig" : "sloop",
        x: trafficX,
        y: trafficY,
        phase: (trafficHash % 628) / 100,
        heading: ((trafficHash >>> 6) % 628) / 100,
        routeRadius: 28 + (trafficHash % 34),
        speed: 0.035 + (trafficHash % 4) * 0.008,
        color: trafficHash % 2 === 0 ? "#c9a06a" : "#8b5a2b",
        hideName: true
      });
    }
  }
  return out;
}

/**
 * Per-island content for server-side spawning (mobs, critters, loot chests).
 * @returns {{ islandId, name, x, y, landRadius, content }[]}
 */
function getOceanusContentSpawns() {
  return OCEANUS_ISLANDS.map((isle) => ({
    islandId: isle.id,
    name: isle.name,
    x: isle.x,
    y: isle.y,
    landRadius: isle.landRadius,
    content: isle.content
  }));
}

module.exports = {
  NAUTICAL_THEME,
  STARTER_ISLAND,
  OCEANUS_BOUNDS,
  OCEANUS_LANDING,
  OCEANUS_TELEPORTER,
  OCEANUS_SAFE_LANDING,
  OCEANUS_ISLANDS,
  OCEANUS_PORTS,
  OCEANUS_FEATURES,
  isInOceanusBounds,
  getOceanusAtPoint,
  getOceanusTile,
  getOceanusObjectsInChunk,
  getOceanusContentSpawns,
  islandAtPoint,
  oceanusDockPortForPlayerId,
  oceanusPortById,
  findNearestOceanusPort
};
