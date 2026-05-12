"use strict";

/**
 * Orbital Square — sci-fi sector. Layout v4: simple walkable square station with open space around it.
 * `node tools/generateSciFiStation.mjs`
 */

const CX = 1920;
const CY = 0;
const STATION_W = 97;
const STATION_H = 97;

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
const SCI_FI_STATION_FEATURES = Object.freeze([]);

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
