"use strict";

/**
 * Ringforge — one large square orbital station (sci-fi sector).
 * Deterministic layout (same role as hubRoundTown for the fantasy hub).
 *
 * Summary: `node tools/generateSciFiStation.mjs`
 */

const CX = 1920;
const CY = 0;
const STATION_W = 108;
const STATION_H = 108;

const SCI_FI_STATIONS = Object.freeze([
  { id: "station_ringforge", name: "Ringforge Station", x: CX, y: CY, w: STATION_W, h: STATION_H, kind: "spawn" }
]);

function buildDockPorts() {
  const row = [-34, -12, 12, 34];
  const out = [];
  let k = 0;
  for (const ox of row) {
    out.push({ id: `rf_dock_n_${k}`, x: CX + ox, y: CY - 48 });
    k += 1;
  }
  k = 0;
  for (const ox of row) {
    out.push({ id: `rf_dock_s_${k}`, x: CX + ox, y: CY + 48 });
    k += 1;
  }
  k = 0;
  for (const oy of row) {
    out.push({ id: `rf_dock_w_${k}`, x: CX - 48, y: CY + oy });
    k += 1;
  }
  k = 0;
  for (const oy of row) {
    out.push({ id: `rf_dock_e_${k}`, x: CX + 48, y: CY + oy });
    k += 1;
  }
  return Object.freeze(out);
}

const SCI_FI_DOCK_PORTS = buildDockPorts();

function buildStationFeatures() {
  const out = [];
  const row = [-34, -12, 12, 34];

  for (let i = 0; i < 4; i += 1) {
    const r = row[i];
    const px = CX + r;
    const py = CY - 48;
    out.push({
      id: `rf_n_port_${i}`,
      name: `Dock N${i + 1}`,
      x: px,
      y: py,
      w: 5,
      h: 5,
      kind: "ship-port"
    });
    out.push({
      id: `rf_n_term_${i}`,
      name: "Dock terminal",
      x: px,
      y: py + 5,
      w: 5,
      h: 4,
      kind: "ship-console"
    });
  }

  for (let i = 0; i < 4; i += 1) {
    const r = row[i];
    const px = CX + r;
    const py = CY + 48;
    out.push({
      id: `rf_s_port_${i}`,
      name: `Dock S${i + 1}`,
      x: px,
      y: py,
      w: 5,
      h: 5,
      kind: "ship-port"
    });
    out.push({
      id: `rf_s_term_${i}`,
      name: "Dock terminal",
      x: px,
      y: py - 5,
      w: 5,
      h: 4,
      kind: "ship-console"
    });
  }

  for (let i = 0; i < 4; i += 1) {
    const r = row[i];
    const px = CX - 48;
    const py = CY + r;
    out.push({
      id: `rf_w_port_${i}`,
      name: `Dock W${i + 1}`,
      x: px,
      y: py,
      w: 5,
      h: 5,
      kind: "ship-port"
    });
    out.push({
      id: `rf_w_term_${i}`,
      name: "Dock terminal",
      x: px + 5,
      y: py,
      w: 4,
      h: 5,
      kind: "ship-console"
    });
  }

  for (let i = 0; i < 4; i += 1) {
    const r = row[i];
    const px = CX + 48;
    const py = CY + r;
    out.push({
      id: `rf_e_port_${i}`,
      name: `Dock E${i + 1}`,
      x: px,
      y: py,
      w: 5,
      h: 5,
      kind: "ship-port"
    });
    out.push({
      id: `rf_e_term_${i}`,
      name: "Dock terminal",
      x: px - 5,
      y: py,
      w: 4,
      h: 5,
      kind: "ship-console"
    });
  }

  out.push({
    id: "rf_shop_ships",
    name: "Orbital Shipworks",
    x: CX - 38,
    y: CY - 38,
    w: 14,
    h: 14,
    kind: "shop-bay",
    shopType: "ship"
  });
  out.push({
    id: "rf_shop_arms",
    name: "Armoury Annex",
    x: CX + 38,
    y: CY - 38,
    w: 14,
    h: 14,
    kind: "shop-bay",
    shopType: "arms"
  });
  out.push({
    id: "rf_shop_stims",
    name: "Synthesis Clinic",
    x: CX + 38,
    y: CY + 38,
    w: 14,
    h: 14,
    kind: "shop-bay",
    shopType: "stims"
  });
  out.push({
    id: "rf_shop_parts",
    name: "Spindle Parts",
    x: CX - 38,
    y: CY + 38,
    w: 14,
    h: 14,
    kind: "shop-bay",
    shopType: "parts"
  });

  out.push({
    id: "rf_fusion_core",
    name: "Fusion Core",
    x: CX,
    y: CY,
    w: 18,
    h: 18,
    kind: "station-core"
  });

  return Object.freeze(out);
}

const SCI_FI_STATION_FEATURES = buildStationFeatures();

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
  STARGATE_LANDING: Object.freeze({ x: CX, y: 44 }),
  SCI_FI_STATIONS,
  SCI_FI_STATION_FEATURES,
  SCI_FI_DOCK_PORTS,
  SCI_FI_LANES,
  sciFiDockPortForPlayerId
};
