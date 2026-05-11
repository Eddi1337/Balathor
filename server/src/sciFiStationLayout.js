"use strict";

/**
 * Ringforge — orbital station (sci-fi sector). Layout v2: offset fusion core, cross concourse, plaza hub.
 * `node tools/generateSciFiStation.mjs`
 */

const CX = 1920;
const CY = 0;
const STATION_W = 120;
const STATION_H = 96;

const SCI_FI_STATIONS = Object.freeze([
  { id: "station_ringforge", name: "Ringforge Station", x: CX, y: CY, w: STATION_W, h: STATION_H, kind: "spawn" }
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

function buildStationFeatures() {
  const out = [];

  /* First-match wins — list smaller hubs before concourse arms that sweep through them. */
  out.push({
    id: "rf_plaza",
    name: "Transit Plaza",
    x: CX,
    y: CY,
    w: 13,
    h: 13,
    kind: "station-plaza"
  });

  out.push({
    id: "rf_fusion_core",
    name: "Fusion Core",
    x: CX + 26,
    y: CY - 12,
    w: 16,
    h: 16,
    kind: "station-core"
  });

  out.push({
    id: "rf_shop_ships",
    name: "Orbital Shipworks",
    x: CX - 44,
    y: CY - 38,
    w: 14,
    h: 14,
    kind: "shop-bay",
    shopType: "ship"
  });
  out.push({
    id: "rf_shop_arms",
    name: "Armoury Annex",
    x: CX + 44,
    y: CY - 38,
    w: 14,
    h: 14,
    kind: "shop-bay",
    shopType: "arms"
  });
  out.push({
    id: "rf_shop_stims",
    name: "Synthesis Clinic",
    x: CX + 44,
    y: CY + 38,
    w: 14,
    h: 14,
    kind: "shop-bay",
    shopType: "stims"
  });
  out.push({
    id: "rf_shop_parts",
    name: "Spindle Parts",
    x: CX - 44,
    y: CY + 38,
    w: 14,
    h: 14,
    kind: "shop-bay",
    shopType: "parts"
  });

  out.push({
    id: "rf_conc_w",
    name: "Concourse W",
    x: CX - 22,
    y: CY,
    w: 28,
    h: 7,
    kind: "corridor"
  });
  out.push({
    id: "rf_conc_e",
    name: "Concourse E",
    x: CX + 22,
    y: CY,
    w: 28,
    h: 7,
    kind: "corridor"
  });
  out.push({
    id: "rf_conc_n",
    name: "Concourse N",
    x: CX,
    y: CY - 22,
    w: 7,
    h: 28,
    kind: "corridor"
  });
  out.push({
    id: "rf_conc_s",
    name: "Concourse S",
    x: CX,
    y: CY + 22,
    w: 7,
    h: 28,
    kind: "corridor"
  });

  for (let i = 0; i < 4; i += 1) {
    const r = DOCK_ROW[i];
    const px = CX + r;
    const py = CY - 50;
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
    const r = DOCK_ROW[i];
    const px = CX + r;
    const py = CY + 50;
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
    const r = DOCK_ROW[i];
    const px = CX - 50;
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
    const r = DOCK_ROW[i];
    const px = CX + 50;
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
  STARGATE_LANDING: Object.freeze({ x: CX, y: CY + 40 }),
  SCI_FI_STATIONS,
  SCI_FI_STATION_FEATURES,
  SCI_FI_DOCK_PORTS,
  SCI_FI_LANES,
  sciFiDockPortForPlayerId
};
