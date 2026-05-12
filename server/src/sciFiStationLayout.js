"use strict";

/**
 * Orbital Square — sci-fi sector. Layout v4: simple walkable square station with open space around it.
 * `node tools/generateSciFiStation.mjs`
 */

const CX = 1920;
const CY = 0;
const STATION_W = 97;
const STATION_H = 97;

function hash2(x, y, seed = 1337) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ (seed | 0);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const SCI_FI_STATIONS = Object.freeze([
  { id: "station_ringforge", name: "Orbital Square", x: CX, y: CY, w: STATION_W, h: STATION_H, kind: "spawn" }
]);

const DOCK_ROW = Object.freeze([-34, -12, 12, 34]);

function buildDockPorts() {
  const out = [];
  let k = 0;
  for (const ox of DOCK_ROW) {
    out.push({ id: `rf_dock_n_${k}`, x: CX + ox, y: CY - 50 });
    k += 1;
  }
  k = 0;
  for (const ox of DOCK_ROW) {
    out.push({ id: `rf_dock_s_${k}`, x: CX + ox, y: CY + 50 });
    k += 1;
  }
  k = 0;
  for (const oy of DOCK_ROW) {
    out.push({ id: `rf_dock_w_${k}`, x: CX - 50, y: CY + oy });
    k += 1;
  }
  k = 0;
  for (const oy of DOCK_ROW) {
    out.push({ id: `rf_dock_e_${k}`, x: CX + 50, y: CY + oy });
    k += 1;
  }
  return Object.freeze(out);
}

const SCI_FI_DOCK_PORTS = buildDockPorts();

function pushFeature(out, feature) {
  out.push(Object.freeze(feature));
}

function buildStationFeatures() {
  const out = [];

  pushFeature(out, {
    id: "rf_core",
    name: "Fusion Core",
    kind: "station-core",
    x: CX,
    y: CY,
    w: 13,
    h: 13
  });

  const shops = [
    { id: "rf_shop_ship", name: "Dock Exchange", shopType: "ship", x: CX - 24, y: CY - 22, w: 8, h: 5 },
    { id: "rf_shop_arms", name: "Armory Node", shopType: "arms", x: CX + 24, y: CY - 22, w: 8, h: 5 },
    { id: "rf_shop_stims", name: "Medbay Kiosk", shopType: "stims", x: CX - 24, y: CY + 22, w: 8, h: 5 },
    { id: "rf_shop_parts", name: "Parts Depot", shopType: "parts", x: CX + 24, y: CY + 22, w: 8, h: 5 },
    { id: "rf_shop_trade", name: "Orbital Bazaar", shopType: "trade", x: CX, y: CY + 30, w: 9, h: 5 }
  ];

  for (const shop of shops) {
    pushFeature(out, {
      id: shop.id,
      name: shop.name,
      kind: "sci-shop",
      shopType: shop.shopType,
      x: shop.x,
      y: shop.y,
      w: shop.w,
      h: shop.h,
      facing: shop.x < CX ? "east" : shop.x > CX ? "west" : shop.y < CY ? "south" : "north"
    });
  }

  const modules = [
    { id: "rf_module_nw", name: "Transit Node", x: CX - 34, y: CY - 34, w: 6, h: 4, facing: "south" },
    { id: "rf_module_ne", name: "Dock Relay", x: CX + 34, y: CY - 34, w: 6, h: 4, facing: "south" },
    { id: "rf_module_sw", name: "Signal Node", x: CX - 34, y: CY + 34, w: 6, h: 4, facing: "north" },
    { id: "rf_module_se", name: "Service Node", x: CX + 34, y: CY + 34, w: 6, h: 4, facing: "north" },
    { id: "rf_module_w", name: "Maintenance Rack", x: CX - 38, y: CY, w: 5, h: 4, facing: "east" },
    { id: "rf_module_e", name: "Maintenance Rack", x: CX + 38, y: CY, w: 5, h: 4, facing: "west" }
  ];

  for (const module of modules) {
    pushFeature(out, {
      id: module.id,
      name: module.name,
      kind: "station-module",
      x: module.x,
      y: module.y,
      w: module.w,
      h: module.h,
      facing: module.facing
    });
  }

  const cargoSlots = [];
  for (let gx = -40; gx <= 40; gx += 8) {
    for (let gy = -40; gy <= 40; gy += 8) {
      const dist = Math.hypot(gx, gy);
      if (dist < 16 || dist > 44) {
        continue;
      }
      if (Math.abs(gx) <= 8 && Math.abs(gy) <= 8) {
        continue;
      }
      const roll = hash2(gx, gy, 711);
      if (roll < 0.58) {
        continue;
      }
      cargoSlots.push({ x: CX + gx, y: CY + gy, roll });
    }
  }

  cargoSlots.sort((a, b) => a.roll - b.roll);
  const cargoKinds = [
    { kind: "container-box", name: "Container Box", w: 3, h: 2 },
    { kind: "shipping-crate", name: "Shipping Crate", w: 4, h: 3 },
    { kind: "cargo-crate", name: "Cargo Crate", w: 2, h: 2 }
  ];

  cargoSlots.slice(0, 18).forEach((slot, index) => {
    const pick = cargoKinds[Math.floor((slot.roll * 997 + index * 13) % cargoKinds.length)];
    pushFeature(out, {
      id: `rf_cargo_${index}`,
      name: pick.name,
      kind: pick.kind,
      x: slot.x,
      y: slot.y,
      w: pick.w,
      h: pick.h,
      facing: hash2(slot.x, slot.y, 913) > 0.5 ? "east" : "west"
    });
  });

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
  STARGATE_LANDING: Object.freeze({ x: CX, y: CY + 40 }),
  SCI_FI_STATIONS,
  SCI_FI_STATION_FEATURES,
  SCI_FI_DOCK_PORTS,
  SCI_FI_LANES,
  sciFiDockPortForPlayerId
};
