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
const MAX_REACH = 64;               // largest landRadius + pier + slack

// Return teleporter sits on the large central hub island, a little inland from
// its south dock. Roads radiate out from it (a path rosette, like the stargate).
const HUB_FOR_TELEPORTER = (Array.isArray(DATA.islands) ? DATA.islands : []).find((i) => i.hub) || null;
const OCEANUS_TELEPORTER = Object.freeze(
  HUB_FOR_TELEPORTER
    ? { x: Math.round(HUB_FOR_TELEPORTER.x), y: Math.round(HUB_FOR_TELEPORTER.y + (Number(HUB_FOR_TELEPORTER.landRadius) || 70) - 20) }
    : { x: OCEANUS_BOUNDS.minX, y: OCEANUS_BOUNDS.minY }
);
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
  for (const isle of nearbyIslands(x, y)) {
    const dist = Math.hypot(x - isle.x, y - isle.y);
    const score = 1 - dist / isle.landRadius;
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
  let best = -Infinity;
  for (const isle of nearbyIslands(x, y)) {
    const dist = Math.hypot(x - isle.x, y - isle.y);
    const t = 1 - dist / isle.landRadius;
    if (t > best) best = t;
  }
  return best;
}

/** Pier geometry for an island: a band that sticks out into the water. */
function pierRect(isle) {
  const r = isle.landRadius;
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
  const ripple = smoothNoise(x, y, 11, 44017) * 0.08;

  if (land + ripple <= 0) {
    return TILE.WATER; // open ocean
  }

  if (land + ripple < 0.14) {
    return TILE.SAND; // sandy beach ring
  }

  const isle = islandAtPoint(x, y);
  if (isle) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    const prop = propTileAt(isle, tx, ty, TILE);
    if (prop != null) return prop;

    const dx = x - isle.x;
    const dy = y - isle.y;
    // Port path leading inland from the pier.
    const pierBand =
      (isle.pierDir === "south" && dy > isle.landRadius * 0.4 && Math.abs(dx) <= PIER_HALF_WIDTH + 1) ||
      (isle.pierDir === "north" && dy < -isle.landRadius * 0.4 && Math.abs(dx) <= PIER_HALF_WIDTH + 1) ||
      (isle.pierDir === "east" && dx > isle.landRadius * 0.4 && Math.abs(dy) <= PIER_HALF_WIDTH + 1) ||
      (isle.pierDir === "west" && dx < -isle.landRadius * 0.4 && Math.abs(dy) <= PIER_HALF_WIDTH + 1);
    if (pierBand) return TILE.PATH;

    const hubDist = Math.hypot(dx, dy);
    if (hubDist < 4) return TILE.PATH; // small central plaza
  }

  const detail = hash2(x, y, 8803);
  if (detail > 0.9) return TILE.TREE;
  if (detail > 0.82) return TILE.FLOWERS;
  if (detail > 0.45) return TILE.GRASS;
  return TILE.DARK_GRASS;
}

// ---------------------------------------------------------------------------
// Dock ports + harbour features (shipwright, chandler, trader markets).
// ---------------------------------------------------------------------------
function facingForPier(dir) {
  return dir; // "north" | "south" | "east" | "west"
}

function dockPortForIsland(isle) {
  const r = isle.landRadius;
  let x = isle.x;
  let y = isle.y;
  if (isle.pierDir === "south") y = isle.y + r + PIER_LEN + 2;
  else if (isle.pierDir === "north") y = isle.y - r - PIER_LEN - 2;
  else if (isle.pierDir === "east") x = isle.x + r + PIER_LEN + 2;
  else x = isle.x - r - PIER_LEN - 2;

  // Terminal: a few tiles back toward the island (where you stand on the dock).
  const inward = 5;
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
    terminalX: tx,
    terminalY: ty,
    islandX: isle.x,
    islandY: isle.y
  });
}

const OCEANUS_PORTS = Object.freeze(OCEANUS_ISLANDS.map(dockPortForIsland));
const PORTS_BY_ISLAND = new Map(OCEANUS_PORTS.map((p) => [p.harbourId, p]));

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

const OCEANUS_LANDING = Object.freeze({
  x: Number(DATA.landing?.x) || OCEANUS_ISLANDS[0]?.x || 0,
  y: Number(DATA.landing?.y) || OCEANUS_ISLANDS[0]?.y || 0
});

const HUB_ISLAND = OCEANUS_ISLANDS.find((isle) => isle.hub) || OCEANUS_ISLANDS[0] || null;
const HUB_PORT = HUB_ISLAND ? PORTS_BY_ISLAND.get(HUB_ISLAND.id) : OCEANUS_PORTS[0];

function oceanusDockPortForPlayerId(/* playerId */) {
  // Everyone spawns at the safe hub dock with their boat moored.
  return HUB_PORT || OCEANUS_PORTS[0] || null;
}

function oceanusPortById(id) {
  if (typeof id !== "string" || !id) return null;
  return OCEANUS_PORTS.find((p) => p.id === id) || null;
}

function findNearestOceanusPort(px, py, maxDist = 14) {
  const md = maxDist * maxDist;
  let best = null;
  let bestD = md;
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
  for (const isle of OCEANUS_ISLANDS) {
    if (
      isle.x >= startX - isle.landRadius && isle.x < endX + isle.landRadius &&
      isle.y >= startY - isle.landRadius && isle.y < endY + isle.landRadius
    ) {
      out.push({
        id: `harbour_${isle.id}`,
        kind: "harbour",
        name: isle.name,
        x: isle.x,
        y: isle.y,
        radius: isle.landRadius,
        w: isle.landRadius * 2,
        h: isle.landRadius * 2
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
  if (trafficHash % 7 === 0) {
    const trafficX = startX + 3 + (trafficHash % Math.max(1, chunkSize - 6));
    const trafficY = startY + 3 + ((trafficHash >>> 4) % Math.max(1, chunkSize - 6));
    if (!islandAtPoint(trafficX, trafficY)) {
      out.push({
        id: `ambient_ship_${cx}_${cy}`,
        kind: "ambient-sailing-ship",
        hullClass: trafficHash % 3 === 0 ? "brig" : "sloop",
        x: trafficX,
        y: trafficY,
        phase: (trafficHash % 628) / 100,
        routeRadius: 4 + (trafficHash % 5),
        speed: 0.12 + (trafficHash % 4) * 0.025,
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
  OCEANUS_BOUNDS,
  OCEANUS_LANDING,
  OCEANUS_TELEPORTER,
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
