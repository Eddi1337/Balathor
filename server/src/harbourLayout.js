"use strict";

/**
 * Archipelago harbours — old-fashioned sailing ships dock at island quays.
 * Coordinates are world tile centers (same convention as sciFiStationLayout).
 */

const ARCHIPELAGO_BOUNDS = Object.freeze({
  minX: -3400,
  maxX: -1600,
  minY: 1600,
  maxY: 3400
});

/** Main portal landing on the hub island. */
const ARCHIPELAGO_LANDING = Object.freeze({ x: -2500, y: 2468 });

const ARCHIPELAGO_ISLANDS = Object.freeze([
  { id: "tidemark", name: "Tidemark Haven", x: -2500, y: 2500, landRadius: 96, pierDir: "south" },
  { id: "skull_cove", name: "Skull Cove", x: -2100, y: 2220, landRadius: 58, pierDir: "east" },
  { id: "pearl_atoll", name: "Pearl Atoll", x: -2900, y: 2320, landRadius: 50, pierDir: "west" },
  { id: "windmere", name: "Windmere Isle", x: -2260, y: 2860, landRadius: 64, pierDir: "north" },
  { id: "saffron_cay", name: "Saffron Cay", x: -2740, y: 2720, landRadius: 54, pierDir: "south" }
]);

function hashDock(seed) {
  let h = Math.imul(seed | 0, 374761393) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function pierOffset(island, slot, count) {
  const spread = island.landRadius * 0.55;
  const t = count <= 1 ? 0 : (slot / (count - 1) - 0.5) * 2;
  const jitter = (hashDock(slot + island.x * 17 + island.y * 31) - 0.5) * 4;
  if (island.pierDir === "south") return { dx: t * spread + jitter, dy: island.landRadius + 7 };
  if (island.pierDir === "north") return { dx: t * spread + jitter, dy: -(island.landRadius + 7) };
  if (island.pierDir === "east") return { dx: island.landRadius + 7, dy: t * spread + jitter };
  return { dx: -(island.landRadius + 7), dy: t * spread + jitter };
}

function facingForPier(dir) {
  if (dir === "south") return "south";
  if (dir === "north") return "north";
  if (dir === "east") return "east";
  return "west";
}

function terminalForPort(port, island) {
  const inward = 4;
  if (island.pierDir === "south") return { terminalX: port.x, terminalY: port.y - inward };
  if (island.pierDir === "north") return { terminalX: port.x, terminalY: port.y + inward };
  if (island.pierDir === "east") return { terminalX: port.x - inward, terminalY: port.y };
  return { terminalX: port.x + inward, terminalY: port.y };
}

function buildHarbourPorts() {
  const out = [];
  for (const island of ARCHIPELAGO_ISLANDS) {
    const berthCount = island.id === "tidemark" ? 6 : 4;
    for (let slot = 0; slot < berthCount; slot += 1) {
      const off = pierOffset(island, slot, berthCount);
      const port = Object.freeze({
        id: `${island.id}_berth_${slot}`,
        harbourId: island.id,
        harbourName: island.name,
        x: island.x + off.dx,
        y: island.y + off.dy,
        facing: facingForPier(island.pierDir),
        islandX: island.x,
        islandY: island.y
      });
      const term = terminalForPort(port, island);
      out.push(Object.freeze({
        ...port,
        terminalX: term.terminalX,
        terminalY: term.terminalY
      }));
    }
  }
  return Object.freeze(out);
}

const ARCHIPELAGO_HARBOUR_PORTS = buildHarbourPorts();

function buildHarbourFeatures() {
  const out = [];
  for (const island of ARCHIPELAGO_ISLANDS) {
    const pierLen = 10;
    let px = island.x;
    let py = island.y;
    let w = 3;
    let h = pierLen;
    if (island.pierDir === "south") {
      py = island.y + island.landRadius - 2;
      w = 14;
      h = pierLen;
    } else if (island.pierDir === "north") {
      py = island.y - island.landRadius - pierLen + 2;
      w = 14;
      h = pierLen;
    } else if (island.pierDir === "east") {
      px = island.x + island.landRadius - 2;
      w = pierLen;
      h = 10;
    } else {
      px = island.x - island.landRadius - pierLen + 2;
      w = pierLen;
      h = 10;
    }
    out.push(Object.freeze({
      id: `${island.id}_pier`,
      kind: "harbour-pier",
      name: `${island.name} Pier`,
      harbourId: island.id,
      x: px,
      y: py,
      w,
      h
    }));
    const hubPort = ARCHIPELAGO_HARBOUR_PORTS.find((p) => p.harbourId === island.id);
    if (hubPort) {
      out.push(Object.freeze({
        id: `${island.id}_shipwright`,
        kind: "ship-console",
        name: `${island.name} Shipwright`,
        harbourId: island.id,
        x: hubPort.terminalX,
        y: hubPort.terminalY,
        w: 4,
        h: 4
      }));
      const chandlerInward = island.pierDir === "south" ? { dx: 4, dy: -3 }
        : island.pierDir === "north" ? { dx: -4, dy: 3 }
        : island.pierDir === "east" ? { dx: -3, dy: 4 }
        : { dx: 3, dy: -4 };
      out.push(Object.freeze({
        id: `${island.id}_chandler`,
        kind: "ship-shop",
        name: `${island.name} Chandlery`,
        shopName: `${island.name} Chandlery`,
        shopType: "ship",
        harbourId: island.id,
        x: hubPort.terminalX + chandlerInward.dx,
        y: hubPort.terminalY + chandlerInward.dy,
        w: 4,
        h: 4
      }));
    }
  }
  return Object.freeze(out);
}

const ARCHIPELAGO_HARBOUR_FEATURES = buildHarbourFeatures();

function harbourPortForPlayerId(playerId) {
  const seed = String(playerId || "harbour");
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 2654435761) >>> 0;
  }
  const tidemarkPorts = ARCHIPELAGO_HARBOUR_PORTS.filter((p) => p.harbourId === "tidemark");
  return tidemarkPorts[h % tidemarkPorts.length] || ARCHIPELAGO_HARBOUR_PORTS[0];
}

function harbourPortById(id) {
  if (typeof id !== "string" || !id) return null;
  return ARCHIPELAGO_HARBOUR_PORTS.find((port) => port.id === id) || null;
}

function findNearestHarbourPort(px, py, maxDist = 12) {
  const md = maxDist * maxDist;
  let best = null;
  let bestD = md;
  for (const p of ARCHIPELAGO_HARBOUR_PORTS) {
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

function islandAtPoint(x, y) {
  let best = null;
  let bestScore = 0;
  for (const island of ARCHIPELAGO_ISLANDS) {
    const dist = Math.hypot(x - island.x, y - island.y);
    const score = 1 - dist / island.landRadius;
    if (score > bestScore) {
      bestScore = score;
      best = island;
    }
  }
  return bestScore > 0 ? best : null;
}

module.exports = {
  ARCHIPELAGO_BOUNDS,
  ARCHIPELAGO_LANDING,
  ARCHIPELAGO_ISLANDS,
  ARCHIPELAGO_HARBOUR_PORTS,
  ARCHIPELAGO_HARBOUR_FEATURES,
  harbourPortForPlayerId,
  harbourPortById,
  findNearestHarbourPort,
  islandAtPoint
};
