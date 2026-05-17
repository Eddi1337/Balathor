"use strict";

/**
 * Orbital Square sci-fi sector.
 *
 * This file is the authoritative layout used by both tile generation and
 * station interaction fixtures. Coordinates are world tile centers.
 */

const CX = 1920;
const CY = 0;
const STATION_W = 71;
const STATION_H = 61;
const HALF_W = Math.floor(STATION_W / 2);
const HALF_H = Math.floor(STATION_H / 2);

function hash2(x, y, seed = 1337) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ (seed | 0);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const SCI_FI_STATIONS = Object.freeze([
  {
    id: "station_ringforge",
    name: "Orbital Square",
    x: CX,
    y: CY,
    w: STATION_W,
    h: STATION_H,
    kind: "spawn"
  }
]);

const NORTH_SOUTH_DOCK_OFFSETS = Object.freeze([-24, -8, 8, 24]);
const EAST_WEST_DOCK_OFFSETS = Object.freeze([-18, 0, 18]);

function buildDockPorts() {
  const out = [];
  let n = 0;

  for (const ox of NORTH_SOUTH_DOCK_OFFSETS) {
    out.push(Object.freeze({
      id: `rf_dock_n_${n++}`,
      x: CX + ox,
      y: CY - HALF_H - 7,
      facing: "north",
      terminalX: CX + ox,
      terminalY: CY - HALF_H + 2
    }));
  }

  n = 0;
  for (const ox of NORTH_SOUTH_DOCK_OFFSETS) {
    out.push(Object.freeze({
      id: `rf_dock_s_${n++}`,
      x: CX + ox,
      y: CY + HALF_H + 7,
      facing: "south",
      terminalX: CX + ox,
      terminalY: CY + HALF_H - 2
    }));
  }

  n = 0;
  for (const oy of EAST_WEST_DOCK_OFFSETS) {
    out.push(Object.freeze({
      id: `rf_dock_w_${n++}`,
      x: CX - HALF_W - 7,
      y: CY + oy,
      facing: "west",
      terminalX: CX - HALF_W + 2,
      terminalY: CY + oy
    }));
  }

  n = 0;
  for (const oy of EAST_WEST_DOCK_OFFSETS) {
    out.push(Object.freeze({
      id: `rf_dock_e_${n++}`,
      x: CX + HALF_W + 7,
      y: CY + oy,
      facing: "east",
      terminalX: CX + HALF_W - 2,
      terminalY: CY + oy
    }));
  }

  return Object.freeze(out);
}

const SCI_FI_DOCK_PORTS = buildDockPorts();

function pushFeature(out, feature) {
  out.push(Object.freeze(feature));
}

function stationFacingForPort(port) {
  if (port.facing === "north") return "south";
  if (port.facing === "south") return "north";
  if (port.facing === "west") return "east";
  return "west";
}

function shopkeeperPoint(shop) {
  if (shop.keeperX != null && shop.keeperY != null) {
    return { x: shop.x + shop.keeperX, y: shop.y + shop.keeperY };
  }
  if (shop.x < CX) return { x: shop.x - 3.1, y: shop.y - 0.2 };
  if (shop.x > CX) return { x: shop.x + 3.1, y: shop.y - 0.2 };
  return { x: shop.x, y: shop.y - 1.7 };
}

function terminalPoint(shop) {
  if (shop.terminalX != null && shop.terminalY != null) {
    return { x: shop.x + shop.terminalX, y: shop.y + shop.terminalY };
  }
  if (shop.x < CX) return { x: shop.x + 3.7, y: shop.y + 0.4 };
  if (shop.x > CX) return { x: shop.x - 3.7, y: shop.y + 0.4 };
  return { x: shop.x, y: shop.y + 2.1 };
}

function buildPortFeatures(out) {
  for (const port of SCI_FI_DOCK_PORTS) {
    const vertical = port.facing === "north" || port.facing === "south";
    const portW = vertical ? 7 : 5;
    const portH = vertical ? 5 : 7;
    const bridgeX =
      port.facing === "west"
        ? CX - HALF_W - 1
        : port.facing === "east"
          ? CX + HALF_W + 1
          : port.x;
    const bridgeY =
      port.facing === "north"
        ? CY - HALF_H - 1
        : port.facing === "south"
          ? CY + HALF_H + 1
          : port.y;

    pushFeature(out, {
      id: `${port.id}_port`,
      name: "Docking Port",
      kind: "ship-port",
      portId: port.id,
      x: bridgeX,
      y: bridgeY,
      w: portW,
      h: portH,
      facing: port.facing
    });

    pushFeature(out, {
      id: `${port.id}_console`,
      name: "Ship Call Terminal",
      kind: "ship-console",
      portId: port.id,
      x: port.terminalX,
      y: port.terminalY,
      w: vertical ? 4 : 5,
      h: vertical ? 3 : 4,
      facing: stationFacingForPort(port)
    });
  }
}

function buildStationFeatures() {
  const out = [];

  pushFeature(out, {
    id: "rf_core",
    name: "Prismatic Reactor",
    kind: "station-core",
    x: CX,
    y: CY,
    w: 15,
    h: 15
  });

  pushFeature(out, {
    id: "rf_plaza",
    name: "Zero-G Concourse",
    kind: "station-plaza",
    x: CX,
    y: CY,
    w: 23,
    h: 17
  });

  const shops = [
    {
      id: "rf_shop_ship",
      name: "Nova Shipyard",
      keeperName: "Foreman Voss-7",
      shopType: "ship",
      x: CX - 22,
      y: CY - 15,
      w: 10,
      h: 7,
      entrances: [{ side: "east", width: 2 }, { side: "bottom", offset: 3, width: 2 }]
    },
    {
      id: "rf_shop_arms",
      name: "Photon Armory",
      keeperName: "Armorer Kade",
      shopType: "arms",
      x: CX + 22,
      y: CY - 15,
      w: 10,
      h: 7,
      entrances: [{ side: "west", width: 2 }, { side: "bottom", offset: -3, width: 2 }]
    },
    {
      id: "rf_shop_stims",
      name: "Medgel Clinic",
      keeperName: "Sera-Med Automa",
      shopType: "stims",
      x: CX - 22,
      y: CY + 12,
      w: 10,
      h: 7,
      entrances: [{ side: "east", offset: -1, width: 2 }, { side: "bottom", offset: 3, width: 2 }]
    },
    {
      id: "rf_shop_parts",
      name: "Drive Parts Depot",
      keeperName: "Tess Gearwright",
      shopType: "parts",
      x: CX + 22,
      y: CY + 12,
      w: 10,
      h: 7,
      entrances: [{ side: "west", offset: -1, width: 2 }, { side: "bottom", offset: -3, width: 2 }]
    }
  ];

  for (const shop of shops) {
    const keeper = shopkeeperPoint(shop);
    const terminal = terminalPoint(shop);
    pushFeature(out, {
      id: shop.id,
      name: shop.name,
      keeperName: shop.keeperName,
      kind: "sci-shop",
      shopType: shop.shopType,
      x: shop.x,
      y: shop.y,
      w: shop.w,
      h: shop.h,
      entrances: shop.entrances,
      terminalId: `${shop.id}_terminal`,
      terminalX: terminal.x,
      terminalY: terminal.y,
      shopkeeperX: keeper.x,
      shopkeeperY: keeper.y,
      facing: shop.x < CX ? "east" : shop.x > CX ? "west" : shop.y < CY ? "south" : "north"
    });
    pushFeature(out, {
      id: `${shop.id}_terminal`,
      name: `${shop.name} Terminal`,
      kind: "sci-shop-terminal",
      shopId: shop.id,
      shopName: shop.name,
      shopType: shop.shopType,
      x: terminal.x,
      y: terminal.y,
      w: 2,
      h: 2,
      facing: shop.x < CX ? "east" : shop.x > CX ? "west" : shop.y < CY ? "south" : "north"
    });
  }

  const shopCorridors = [
    { id: "rf_shop_lane_n", name: "North Retail Walk", kind: "corridor", x: CX, y: CY - 15, w: 43, h: 3 },
    { id: "rf_shop_lane_s", name: "South Retail Walk", kind: "corridor", x: CX, y: CY + 12, w: 43, h: 3 },
    { id: "rf_shop_lane_spine", name: "Retail Spine", kind: "corridor", x: CX, y: CY - 1, w: 3, h: 35 },
    { id: "rf_shop_lane_gate", name: "Stargate Arcade", kind: "corridor", x: CX, y: CY + 22, w: 5, h: 12 },
    { id: "rf_shop_lane_w", name: "West Arcade", kind: "corridor", x: CX - 27, y: CY - 1, w: 5, h: 25 },
    { id: "rf_shop_lane_e", name: "East Arcade", kind: "corridor", x: CX + 27, y: CY - 1, w: 5, h: 25 },
    { id: "rf_shop_lane_port_n", name: "North Dock Link", kind: "corridor", x: CX, y: CY - 31, w: 57, h: 3 },
    { id: "rf_shop_lane_port_s", name: "South Dock Link", kind: "corridor", x: CX, y: CY + 31, w: 57, h: 3 },
    { id: "rf_shop_lane_port_w", name: "West Dock Link", kind: "corridor", x: CX - 36, y: CY, w: 3, h: 43 },
    { id: "rf_shop_lane_port_e", name: "East Dock Link", kind: "corridor", x: CX + 36, y: CY, w: 3, h: 43 }
  ];
  for (const corridor of shopCorridors) {
    pushFeature(out, corridor);
  }

  const modules = [
    { id: "rf_cmd", name: "Command Deck", kind: "command", x: CX, y: CY - 25, w: 11, h: 4, facing: "south" },
    { id: "rf_observatory_s", name: "Starview Lounge", kind: "station-module", x: CX, y: CY + 25, w: 12, h: 4, facing: "north" },
    { id: "rf_hydro_nw", name: "Hydroponics Rack", kind: "station-module", x: CX - 30, y: CY - 1, w: 4, h: 8, facing: "east" },
    { id: "rf_hydro_ne", name: "Life Support Rack", kind: "station-module", x: CX + 30, y: CY - 1, w: 4, h: 8, facing: "west" },
    { id: "rf_relay_w", name: "Signal Relay", kind: "station-kiosk", shopType: "trade", x: CX - 29, y: CY + 21, w: 4, h: 4, facing: "east" },
    { id: "rf_relay_e", name: "Signal Relay", kind: "station-kiosk", shopType: "trade", x: CX + 29, y: CY + 21, w: 4, h: 4, facing: "west" }
  ];

  for (const module of modules) {
    pushFeature(out, module);
  }

  buildPortFeatures(out);

  const cargoKinds = [
    { kind: "container-box", name: "Ion Container", w: 3, h: 2 },
    { kind: "shipping-crate", name: "Stasis Crate", w: 4, h: 3 },
    { kind: "cargo-crate", name: "Cargo Cube", w: 2, h: 2 }
  ];
  let cargoIndex = 0;
  for (let gx = -30; gx <= 30; gx += 7) {
    for (let gy = -23; gy <= 23; gy += 7) {
      if (Math.abs(gx) < 12 && Math.abs(gy) < 12) continue;
      if (Math.abs(gx) < 9 || Math.abs(gy) < 8) continue;
      const roll = hash2(gx, gy, 711);
      if (roll < 0.68) continue;
      const pick = cargoKinds[(cargoIndex + Math.floor(roll * 31)) % cargoKinds.length];
      pushFeature(out, {
        id: `rf_cargo_${cargoIndex}`,
        name: pick.name,
        kind: pick.kind,
        x: CX + gx,
        y: CY + gy,
        w: pick.w,
        h: pick.h,
        facing: hash2(gx, gy, 913) > 0.5 ? "east" : "west"
      });
      cargoIndex += 1;
      if (cargoIndex >= 10) return out;
    }
  }

  return out;
}

const SCI_FI_STATION_FEATURES = Object.freeze(buildStationFeatures());

const SCI_FI_LANES = Object.freeze([
  { id: "lane_rf_aurelia", from: "station_ringforge", to: "planet_aurelia" },
  { id: "lane_rf_icefall", from: "station_ringforge", to: "planet_icefall" },
  { id: "lane_rf_rust", from: "station_ringforge", to: "planet_rust" }
]);

function sciFiDockPortForPlayerId(playerId) {
  const seed = String(playerId || "station");
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 2654435761) >>> 0;
  }
  return SCI_FI_DOCK_PORTS[h % SCI_FI_DOCK_PORTS.length];
}

module.exports = {
  RINGFORGE_CENTER: Object.freeze({ x: CX, y: CY }),
  STARGATE_LANDING: Object.freeze({ x: CX, y: CY + 22 }),
  SCI_FI_STATIONS,
  SCI_FI_STATION_FEATURES,
  SCI_FI_DOCK_PORTS,
  SCI_FI_LANES,
  sciFiDockPortForPlayerId
};
