#!/usr/bin/env node
/**
 * Prints Ringforge station layout summary (same data as server/src/sciFiStationLayout.js).
 * Run after editing the layout module to verify dock counts and bounds.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const layout = require("../server/src/sciFiStationLayout.js");

const { SCI_FI_STATIONS, SCI_FI_STATION_FEATURES, SCI_FI_DOCK_PORTS, RINGFORGE_CENTER, STARGATE_LANDING } =
  layout;

console.log("Ringforge sci-fi station layout\n");
console.log("Center:", RINGFORGE_CENTER);
console.log("Stargate landing tile:", STARGATE_LANDING);
console.log("\nStations:", SCI_FI_STATIONS.length);
for (const s of SCI_FI_STATIONS) {
  const hx = Math.floor(s.w / 2);
  const hy = Math.floor(s.h / 2);
  console.log(
    `  ${s.id}  ${s.x}±${hx}  ${s.y}±${hy}  (${s.name})`
  );
}

const ports = SCI_FI_STATION_FEATURES.filter((f) => f.kind === "ship-port");
const terms = SCI_FI_STATION_FEATURES.filter((f) => f.kind === "ship-console");
const shops = SCI_FI_STATION_FEATURES.filter((f) => f.kind === "sci-shop" || f.kind === "shop-bay");
const core = SCI_FI_STATION_FEATURES.filter((f) => f.kind === "station-core");

console.log("\nFeatures:", SCI_FI_STATION_FEATURES.length);
console.log(`  ship-port: ${ports.length} (expected ${SCI_FI_DOCK_PORTS.length})`);
console.log(`  ship-console: ${terms.length} (expected ${SCI_FI_DOCK_PORTS.length})`);
console.log(`  sci-shop/shop-bay: ${shops.length}`);
for (const sh of shops) {
  console.log(`    - ${sh.name} (${sh.shopType})`);
}
console.log(`  station-core: ${core.length}`);

console.log("\nSCI_FI_DOCK_PORTS:", SCI_FI_DOCK_PORTS.length);
console.log("Sample ports:", SCI_FI_DOCK_PORTS.slice(0, 4));
