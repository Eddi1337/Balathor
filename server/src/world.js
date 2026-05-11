const CHUNK_SIZE = 16;

const TILE = {
  GRASS: 0,
  TREE: 1,
  WATER: 2,
  STONE: 3,
  PATH: 4,
  FLOWERS: 5,
  DARK_GRASS: 6,
  WALL: 7,
  FLOOR: 8,
  DOOR: 9,
  SAND: 10,
  SNOW: 11,
  LAVA: 12,
  PORTAL: 13,
  CARPET: 14,
  BED: 15,
  TABLE: 16,
  SHELF: 17,
  FIREPLACE: 18,
  CHAIR: 19,
  /** Player-owned home storage (single tile, top-right interior). */
  CHEST: 20,
  /** Compact home-teleport tree (single tile, top-left interior). */
  HOME_TREE: 21,
  VOID: 22,
  METAL: 23,
  WALKWAY: 24,
  HULL: 25,
  WINDOW: 26,
  ENERGY: 27
};

const BLOCKED_TILES = new Set([
  TILE.WATER,
  TILE.WALL,
  TILE.LAVA,
  TILE.BED,
  TILE.TABLE,
  TILE.SHELF,
  TILE.FIREPLACE,
  TILE.CHAIR,
  TILE.CHEST,
  TILE.HOME_TREE,
  TILE.VOID,
  TILE.HULL,
  TILE.WINDOW
]);
const PORTAL_RADIUS = 1.6;
const DOOR_RADIUS = 0.52;
const INTERIOR_BASE_X = 10000;
const INTERIOR_BASE_Y = 10000;
const INTERIOR_SPACING = 40;
const INTERIOR_EXTERIOR_MARGIN = 12;
const PROCEDURAL_INTERIOR_GRID_SIZE = 1024;
const PROCEDURAL_INTERIOR_GRID_OFFSET = 512;
/** Hub plaza only (tree / fountain circle). Combat allowed beyond this in the village ring. */
const STARTING_AREA = { x: 0, y: 0, radius: 26 };
const START_SPAWN = { x: 0, y: 0 };
const SCI_FI_THEME = "sci-fi";
const SCI_FI_SECTOR = Object.freeze({
  xMin: 1500,
  xMax: 2340,
  yMin: -560,
  yMax: 560
});
const {
  SCI_FI_STATIONS,
  SCI_FI_STATION_FEATURES,
  SCI_FI_DOCK_PORTS,
  SCI_FI_LANES,
  sciFiDockPortForPlayerId: layoutDockPortForPlayerId,
  STARGATE_LANDING
} = require("./sciFiStationLayout.js");

const SCI_FI_STARGATE_PORTAL = Object.freeze({
  id: "portal_stargate",
  name: "Stargate",
  x: 0,
  y: -178,
  targetX: STARGATE_LANDING.x,
  targetY: STARGATE_LANDING.y,
  color: "#67f0ff",
  style: "stargate"
});
const SCI_FI_PLANETS = Object.freeze([
  { id: "planet_aurelia", name: "Aurelia", x: 2142, y: -382, radius: 74, seed: 8128, type: "lush" },
  { id: "planet_icefall", name: "Icefall", x: 2214, y: 180, radius: 64, seed: 9181, type: "ice" },
  { id: "planet_rust", name: "Rust", x: 2050, y: 416, radius: 58, seed: 10201, type: "desert" }
]);
const { computeHubDistrict, HUB_CLEARING_RADIUS: HUB_TOWN_GRASS_RADIUS } = require("./hubRoundTown.js");
/** Walled procedural hub + arterial sets (paths never overlap building rects). */
const _hubDistrict = computeHubDistrict();
const HUB_PATH_TILE_KEYS = _hubDistrict.pathTileKeys;
const HUB_WALL_TILE_KEYS = _hubDistrict.wallTileKeys;
const HUB_GARDEN_TILE_KEYS = _hubDistrict.gardenTileKeys;
const HUB_ROADSIDE_FEATURES = _hubDistrict.hubRoadsides || [];
const HUB_NAV_PATH_KEYS =
  _hubDistrict.hubNavPathKeys instanceof Set ? _hubDistrict.hubNavPathKeys : new Set();

function hash2(x, y, seed = 1337) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function isSciFiSector(x, y) {
  return x >= SCI_FI_SECTOR.xMin && x <= SCI_FI_SECTOR.xMax && y >= SCI_FI_SECTOR.yMin && y <= SCI_FI_SECTOR.yMax;
}

function sciFiStationById(id) {
  return SCI_FI_STATIONS.find((station) => station.id === id) || null;
}

function sciFiStationFeatureById(id) {
  return SCI_FI_STATION_FEATURES.find((feature) => feature.id === id) || null;
}

function sciFiDockPortForPlayerId(playerId) {
  return layoutDockPortForPlayerId(playerId);
}

function findNearestSciFiDockPort(px, py, maxDist = 12) {
  const md = maxDist * maxDist;
  let best = null;
  let bestD = md;
  for (const p of SCI_FI_DOCK_PORTS) {
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

function sciFiThemeForPoint(x, y) {
  return isSciFiSector(x, y) ? SCI_FI_THEME : "fantasy";
}

function sciFiStationAt(x, y) {
  for (const station of SCI_FI_STATIONS) {
    const halfW = Math.floor(station.w / 2);
    const halfH = Math.floor(station.h / 2);
    if (x >= station.x - halfW && x <= station.x + halfW && y >= station.y - halfH && y <= station.y + halfH) {
      return station;
    }
  }
  return null;
}

function sciFiPlanetAt(x, y) {
  for (const planet of SCI_FI_PLANETS) {
    const dx = x - planet.x;
    const dy = y - planet.y;
    if (dx * dx + dy * dy <= planet.radius * planet.radius) {
      return planet;
    }
  }
  return null;
}

function sciFiPlanetById(id) {
  return SCI_FI_PLANETS.find((p) => p.id === id) || null;
}

function sciFiPlanetSurfaceTile(planet, x, y) {
  const detail = hash2(x, y, planet.seed);
  const band = hash2(x + planet.seed, y - planet.seed, planet.seed + 11);
  if (planet.type === "lush") {
    if (detail > 0.94) return TILE.STONE;
    if (band > 0.76) return TILE.FLOWERS;
    return band > 0.42 ? TILE.GRASS : TILE.DARK_GRASS;
  }
  if (planet.type === "ice") {
    if (detail > 0.94) return TILE.STONE;
    if (band > 0.62) return TILE.SNOW;
    return TILE.GRASS;
  }
  if (planet.type === "desert") {
    if (detail > 0.93) return TILE.STONE;
    if (band > 0.82) return TILE.SAND;
    return TILE.DARK_GRASS;
  }
  if (detail > 0.95) return TILE.STONE;
  return TILE.GRASS;
}

function sciFiObjectTouchesChunk(obj, startX, startY, endX, endY) {
  const spanX = Math.max(1, Number(obj.w ?? obj.radius ?? 1) * 2);
  const spanY = Math.max(1, Number(obj.h ?? obj.radius ?? 1) * 2);
  const minX = Number(obj.x) - spanX / 2;
  const minY = Number(obj.y) - spanY / 2;
  const maxX = Number(obj.x) + spanX / 2;
  const maxY = Number(obj.y) + spanY / 2;
  return minX < endX && maxX > startX && minY < endY && maxY > startY;
}

function sciFiFeatureTouchesChunk(feature, startX, startY, endX, endY) {
  const fw = Math.max(1, Number(feature.w || 1));
  const fh = Math.max(1, Number(feature.h || 1));
  const halfW = Math.floor(fw / 2);
  const halfH = Math.floor(fh / 2);
  const minX = feature.x - halfW;
  const minY = feature.y - halfH;
  const maxX = minX + fw;
  const maxY = minY + fh;
  return minX < endX && maxX > startX && minY < endY && maxY > startY;
}

function sciFiStationFeatureAt(x, y) {
  for (const feature of SCI_FI_STATION_FEATURES) {
    const fw = Math.max(1, Number(feature.w || 1));
    const fh = Math.max(1, Number(feature.h || 1));
    const halfW = Math.floor(fw / 2);
    const halfH = Math.floor(fh / 2);
    const minX = feature.x - halfW;
    const minY = feature.y - halfH;
    if (x >= minX && x < minX + fw && y >= minY && y < minY + fh) {
      return feature;
    }
  }
  return null;
}

function sciFiStationTileForFeature(feature, x, y) {
  const fw = Math.max(1, Number(feature.w || 1));
  const fh = Math.max(1, Number(feature.h || 1));
  const minX = feature.x - Math.floor(fw / 2);
  const minY = feature.y - Math.floor(fh / 2);
  const lx = x - minX;
  const ly = y - minY;
  const edge = lx === 0 || ly === 0 || lx === fw - 1 || ly === fh - 1;

  if (feature.kind === "ship-port") {
    if (edge) return TILE.HULL;
    if (Math.abs(lx - Math.floor(fw / 2)) <= 1) return TILE.ENERGY;
    if (ly === Math.floor(fh / 2)) return TILE.WALKWAY;
    return TILE.METAL;
  }

  if (feature.kind === "ship-console") {
    if (edge) return TILE.HULL;
    if (lx === 1 || ly === 1 || lx === fw - 2 || ly === fh - 2) return TILE.WALKWAY;
    return TILE.ENERGY;
  }

  if (feature.kind === "ship-shop" || feature.kind === "shop-bay") {
    if (edge) return TILE.HULL;
    if (ly === 1 || ly === fh - 2) return TILE.WALKWAY;
    return lx === Math.floor(fw / 2) ? TILE.ENERGY : TILE.METAL;
  }

  if (feature.kind === "station-core") {
    const cx = Math.floor(fw / 2);
    const cy = Math.floor(fh / 2);
    const md = Math.abs(lx - cx) + Math.abs(ly - cy);
    if (edge) return TILE.HULL;
    if (md <= 2) return TILE.ENERGY;
    if (md <= 5) return TILE.WINDOW;
    if ((lx + ly) % 2 === 0) return TILE.ENERGY;
    return TILE.METAL;
  }

  if (feature.kind === "reactor") {
    if (edge) return TILE.HULL;
    if (lx === Math.floor(fw / 2) || ly === Math.floor(fh / 2)) return TILE.ENERGY;
    return TILE.METAL;
  }

  if (feature.kind === "quarters") {
    if (edge) return TILE.HULL;
    return (lx + ly) % 3 === 0 ? TILE.WALKWAY : TILE.METAL;
  }

  if (feature.kind === "core" || feature.kind === "command") {
    if (edge) return TILE.HULL;
    return lx === Math.floor(fw / 2) || ly === Math.floor(fh / 2) ? TILE.WALKWAY : TILE.METAL;
  }

  if (feature.kind === "ship-bay") {
    if (edge) return TILE.HULL;
    if (lx === 1 || ly === 1 || lx === fw - 2 || ly === fh - 2) return TILE.WALKWAY;
    return ly === Math.floor(fh / 2) ? TILE.ENERGY : TILE.METAL;
  }

  if (feature.kind === "corridor") {
    return ly === Math.floor(fh / 2) ? TILE.WALKWAY : TILE.METAL;
  }

  if (edge) return TILE.HULL;
  return TILE.METAL;
}

function getSciFiObjectsInChunk(cx, cy) {
  const startX = cx * CHUNK_SIZE;
  const startY = cy * CHUNK_SIZE;
  const endX = startX + CHUNK_SIZE;
  const endY = startY + CHUNK_SIZE;
  const out = [];

  for (const station of SCI_FI_STATIONS) {
    const obj = { ...station, kind: "station" };
    if (sciFiObjectTouchesChunk(obj, startX, startY, endX, endY)) {
      out.push(obj);
    }
  }

  for (const feature of SCI_FI_STATION_FEATURES) {
    const obj = { ...feature };
    if (sciFiFeatureTouchesChunk(feature, startX, startY, endX, endY) && !footprintHitsPortalClearance(feature.x, feature.y, Math.max(1, Number(feature.w || 1)), Math.max(1, Number(feature.h || 1)))) {
      out.push(obj);
    }
  }

  for (const planet of SCI_FI_PLANETS) {
    const obj = { ...planet, kind: "planet" };
    if (sciFiObjectTouchesChunk(obj, startX, startY, endX, endY)) {
      out.push(obj);
    }
  }

  for (const lane of SCI_FI_LANES) {
    const from = sciFiStationById(lane.from) || sciFiPlanetById(lane.from);
    const to = sciFiStationById(lane.to) || sciFiPlanetById(lane.to);
    if (!from || !to) {
      continue;
    }
    const minX = Math.min(from.x, to.x) - 2;
    const minY = Math.min(from.y, to.y) - 2;
    const maxX = Math.max(from.x, to.x) + 2;
    const maxY = Math.max(from.y, to.y) + 2;
    if (minX < endX && maxX > startX && minY < endY && maxY > startY) {
      out.push({
        id: lane.id,
        kind: "lane",
        type: "lane",
        from,
        to,
        color: "#72d7ff"
      });
    }
  }

  return out;
}

/** Distant realms connected by portals — not part of walled hub authoring. */
const PORTAL_REALM_BUILDINGS = [
  { x: 574, y: 472, w: 20, h: 16, name: "Oasis Keep", type: "castle", forSale: false },
  { x: 604, y: 470, w: 16, h: 12, name: "Oasis Palace", type: "big_house", forSale: false },
  { x: 588, y: 496, w: 10, h: 8, name: "Clay House", type: "house", forSale: false },
  { x: 618, y: 490, w: 8, h: 7, name: "Sun Hut", type: "hut", forSale: false },
  { x: -622, y: -500, w: 20, h: 16, name: "Frost Keep", type: "castle", forSale: false },
  { x: -596, y: -500, w: 10, h: 8, name: "Snow House", type: "house", forSale: false },
  { x: -614, y: -478, w: 8, h: 7, name: "Pine Hut", type: "hut", forSale: false },
  { x: -590, y: -480, w: 10, h: 8, name: "Ranger Post", type: "treehouse", forSale: false },
  { x: 558, y: -540, w: 20, h: 16, name: "Ember Citadel", type: "castle", forSale: false },
  { x: 584, y: -540, w: 10, h: 8, name: "Ash House", type: "house", forSale: false },
  { x: 566, y: -518, w: 8, h: 7, name: "Forge Hut", type: "hut", forSale: false },
  { x: 582, y: -520, w: 10, h: 8, name: "Watcher's Perch", type: "treehouse", forSale: false }
];

const BUILDINGS = _hubDistrict.hubBuildings.concat(PORTAL_REALM_BUILDINGS);

/** World X tile coords for outward-facing doors on north & south façade rows. Odd width ⇒ 1 tile; even ⇒ 2. */
function southDoorWorldXs(building) {
  const bw = Math.max(3, Math.floor(building.w));
  const bx = Math.floor(building.x);
  if (bw % 2 === 1) {
    return [bx + (bw - 1) / 2];
  }
  const left = bx + bw / 2 - 1;
  return [left, left + 1];
}

function southDoorAnchorWorldX(building) {
  const xs = southDoorWorldXs(building);
  if (!xs.length) {
    return building.x + building.w / 2;
  }
  if (xs.length === 1) {
    return xs[0] + 0.5;
  }
  return (xs[0] + xs[1]) / 2 + 0.5;
}

/** Local X positions (within building footprint) that are exterior door openings. */
function southDoorLocalXs(w) {
  const iw = Math.max(3, Math.floor(Number(w)));
  if (iw % 2 === 1) {
    return [(iw - 1) / 2];
  }
  return [iw / 2 - 1, iw / 2];
}

function southDoorLocalCenterOffset(w) {
  const lx = southDoorLocalXs(w);
  if (!lx.length) {
    return w / 2;
  }
  if (lx.length === 1) {
    return lx[0] + 0.5;
  }
  return (lx[0] + lx[1]) / 2 + 0.5;
}

// Fixed village clearing zones — only starting town + portal destinations.
function isInsidePrimaryHubGrass(x, y, marginTiles = 0) {
  return Math.hypot(x, y) <= HUB_TOWN_GRASS_RADIUS + marginTiles;
}

const VILLAGES = [
  { cx: 0, cy: 0, r: Math.max(HUB_TOWN_GRASS_RADIUS, 105) }, // walled round hub + pastures
  { cx: 600, cy: 490, r: 52 },
  { cx: -600, cy: -490, r: 52 },
  { cx: 580, cy: -530, r: 52 }
];

/** Roads inside the walled hub are baked into HUB_PATH_TILE_KEYS — only distal villages kept here */
const STREET_SEGMENTS = [
  { x1: -46, y1: 0, x2: -46, y2: -125, w: 2 },
  { x1: 46, y1: -12, x2: 46, y2: -125, w: 2 },
  { x1: 0, y1: -12, x2: 0, y2: -125, w: 1 },
  { x1: 574, y1: 482, x2: 628, y2: 482 },
  { x1: 600, y1: 470, x2: 600, y2: 519 },
  { x1: -622, y1: -484, x2: -578, y2: -484 },
  { x1: -600, y1: -497, x2: -600, y2: -458 },
  { x1: 558, y1: -524, x2: 596, y2: -524 },
  { x1: 580, y1: -537, x2: 580, y2: -503 }
];

/**
 * Thick stone corridors between hubs (half-width ±hw tiles perpendicular to axis).
 */
const STONE_HIGHWAY_SEGMENTS = [
  { x1: 92, y1: 0, x2: 92, y2: 340, hw: 3 },
  { x1: 92, y1: 340, x2: 520, y2: 340, hw: 3 },
  { x1: 520, y1: 340, x2: 520, y2: 470, hw: 3 },
  { x1: -92, y1: 0, x2: -92, y2: -335, hw: 3 },
  { x1: -92, y1: -335, x2: -530, y2: -335, hw: 3 },
  { x1: -530, y1: -335, x2: -530, y2: -478, hw: 3 },
  { x1: -40, y1: -92, x2: 240, y2: -92, hw: 3 },
  { x1: 240, y1: -92, x2: 240, y2: -360, hw: 3 },
  { x1: 240, y1: -360, x2: 560, y2: -360, hw: 3 },
  { x1: 560, y1: -360, x2: 560, y2: -514, hw: 3 },
  /* Village ring connectors from highway roots */
  { x1: 92, y1: 0, x2: 120, y2: 48, hw: 2 },
  { x1: -92, y1: 0, x2: -120, y2: -48, hw: 2 }
];

/** Oasis / Frost / Ember diagonals only — walled hub routing is authoritative via HUB_PATH_TILE_KEYS */
const FOOTPATH_SEGMENTS = [
  { x1: 588, y1: 488, x2: 593, y2: 476, thin: true },
  { x1: 596, y1: 488, x2: 601, y2: 476, thin: true },
  { x1: -590, y1: -488, x2: -596, y2: -476, thin: true },
  { x1: -598, y1: -488, x2: -604, y2: -476, thin: true },
  { x1: 568, y1: -512, x2: 574, y2: -524, thin: true },
  { x1: 576, y1: -512, x2: 582, y2: -524, thin: true }
];

/** Hub paths & walls are regenerated — roadside props confined to outskirts + portal realms. */
const ROADSIDE_FEATURES = Object.freeze([
  { id: "rs_pub_t_a", x: -58, y: -34, kind: "pub_table", facing: 0 },
  { id: "rs_pub_t_b", x: -51, y: -34, kind: "pub_table", facing: 0 },
  { id: "rs_pub_c_a", x: -61, y: -36, kind: "pub_chair", facing: Math.PI / 2 },
  { id: "rs_pub_c_b", x: -53, y: -36, kind: "pub_chair", facing: Math.PI / 2 },
  { id: "rs_pub_c_c", x: -58, y: -31, kind: "pub_chair", facing: -Math.PI / 2 },
  { id: "rs_wall_bench_n", x: -2, y: -112, kind: "bench", facing: 0 },
  { id: "rs_wall_bench_s", x: 12, y: 110, kind: "bench", facing: 0 },
  { id: "rs_oasis_b1", x: 592, y: 486, kind: "bench", facing: 0 },
  { id: "rs_frost_b1", x: -592, y: -486, kind: "bench", facing: 0 },
  { id: "rs_ember_b1", x: 572, y: -510, kind: "bench", facing: 0 }
]);

function distPointToSegmentSq(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) {
    const qx = px - x1;
    const qy = py - y1;
    return qx * qx + qy * qy;
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nx = x1 + t * dx;
  const ny = y1 + t * dy;
  const ox = px - nx;
  const oy = py - ny;
  return ox * ox + oy * oy;
}

function isStoneHighway(tx, ty) {
  const px = tx + 0.5;
  const py = ty + 0.5;
  for (const s of STONE_HIGHWAY_SEGMENTS) {
    const hw = s.hw ?? 3;
    const thresh = hw + 0.5;
    if (
      distPointToSegmentSq(px, py, s.x1 + 0.5, s.y1 + 0.5, s.x2 + 0.5, s.y2 + 0.5) <= thresh * thresh
    ) {
      return true;
    }
  }
  return false;
}

function isThinFootpath(tx, ty) {
  const px = tx + 0.5;
  const py = ty + 0.5;
  const thresh = 0.42;
  const threshSq = thresh * thresh;
  for (const s of FOOTPATH_SEGMENTS) {
    if (!s.thin) continue;
    if (
      distPointToSegmentSq(px, py, s.x1 + 0.5, s.y1 + 0.5, s.x2 + 0.5, s.y2 + 0.5) <= threshSq
    ) {
      return true;
    }
  }
  return false;
}

function roadsideFeatureTouchesChunk(f, startX, startY, endX, endY) {
  const w = Math.max(1, Math.floor(Number(f.footprintW) || 1));
  const h = Math.max(1, Math.floor(Number(f.footprintH) || 1));
  const fx0 = f.x;
  const fy0 = f.y;
  const fx1 = fx0 + w;
  const fy1 = fy0 + h;
  return fx0 < endX && fx1 > startX && fy0 < endY && fy1 > startY;
}

function getRoadsideFeaturesInChunk(cx, cy) {
  const startX = cx * CHUNK_SIZE;
  const startY = cy * CHUNK_SIZE;
  const endX = startX + CHUNK_SIZE;
  const endY = startY + CHUNK_SIZE;
  const out = [];
  for (const f of ROADSIDE_FEATURES) {
    const fw = Math.max(1, Math.floor(Number(f.footprintW) || 1));
    const fh = Math.max(1, Math.floor(Number(f.footprintH) || 1));
    if (roadsideFeatureTouchesChunk(f, startX, startY, endX, endY) && !footprintHitsPortalClearance(f.x, f.y, fw, fh)) out.push(f);
  }
  for (const f of HUB_ROADSIDE_FEATURES) {
    const fw = Math.max(1, Math.floor(Number(f.footprintW) || 1));
    const fh = Math.max(1, Math.floor(Number(f.footprintH) || 1));
    if (roadsideFeatureTouchesChunk(f, startX, startY, endX, endY) && !footprintHitsPortalClearance(f.x, f.y, fw, fh)) out.push(f);
  }
  return out;
}

function findRoadsideFeatureNear(wx, wy, radiusTiles = 1.35) {
  const rSq = radiusTiles * radiusTiles;
  let best = null;
  let bestD = rSq + 1;
  function consider(f) {
    const fw = Math.max(1, Math.floor(Number(f.footprintW) || 1));
    const fh = Math.max(1, Math.floor(Number(f.footprintH) || 1));
    if (footprintHitsPortalClearance(f.x, f.y, fw, fh)) {
      return;
    }
    const ax = f.x + fw / 2;
    const ay = f.y + fh / 2 + 0.06;
    const dx = wx - ax;
    const dy = wy - ay;
    const dSq = dx * dx + dy * dy;
    if (dSq <= rSq && dSq < bestD) {
      bestD = dSq;
      best = f;
    }
  }
  for (const f of ROADSIDE_FEATURES) consider(f);
  for (const f of HUB_ROADSIDE_FEATURES) consider(f);
  return best;
}

const PORTALS = [
  { id: "portal_oasis", name: "Oasis Gate",  x:  46, y: -76, targetX: 600, targetY: 522, color: "#f2c45f" },
  { id: "portal_frost", name: "Frost Gate",   x: -46, y: -76, targetX: -600, targetY: -458, color: "#9ee7ff" },
  { id: "portal_ember", name: "Ember Gate",   x:   0, y: -76, targetX: 580, targetY: -503, color: "#ff7a45" },
  { id: "portal_stargate", name: "Stargate",   x:   0, y: -178, targetX: STARGATE_LANDING.x, targetY: STARGATE_LANDING.y, color: "#67f0ff", style: "stargate" },
  { id: "portal_hub_oasis", name: "Oasis Gate", x: 600, y: 522, targetX: 46, targetY: -76, color: "#f2c45f" },
  { id: "portal_hub_frost", name: "Frost Gate", x: -600, y: -458, targetX: -46, targetY: -76, color: "#9ee7ff" },
  { id: "portal_hub_ember", name: "Ember Gate", x: 580, y: -503, targetX: 0, targetY: -76, color: "#ff7a45" },
  { id: "portal_stargate_return", name: "Stargate", x: STARGATE_LANDING.x, y: STARGATE_LANDING.y, targetX: 0, targetY: -178, color: "#67f0ff", style: "stargate" },
];

/** Stone disk under portals (tile-space, portal at integer lattice point). */
const PORTAL_CLEAR_STONE_RADIUS = 10;
const PORTAL_CAMP_CLEAR_RADIUS = 10;
/** Wild mobs (camps, roamers, critters) stay outside the starter walled town apron. */
const PRIMARY_HUB_MOBS_CLEAR_RADIUS = HUB_TOWN_GRASS_RADIUS + 48;

function squaredDistTileToNearestPortal(px, py) {
  let best = 1e18;
  for (const portal of PORTALS) {
    const dx = px - portal.x - 0.5;
    const dy = py - portal.y - 0.5;
    const s = dx * dx + dy * dy;
    if (s < best) best = s;
  }
  return best;
}

function rectIntersectsPortalClearance(minX, minY, maxX, maxY, clearance = PORTAL_CAMP_CLEAR_RADIUS) {
  const clearanceSq = clearance * clearance;
  for (const portal of PORTALS) {
    const dx = Math.max(minX - portal.x, 0, portal.x - maxX);
    const dy = Math.max(minY - portal.y, 0, portal.y - maxY);
    if (dx * dx + dy * dy < clearanceSq) {
      return true;
    }
  }
  return false;
}

function footprintHitsPortalClearance(x, y, w, h, clearance = PORTAL_CLEAR_STONE_RADIUS) {
  return rectIntersectsPortalClearance(x, y, x + w, y + h, clearance);
}

function isPortalCourtyardStoneTile(ti, tj) {
  return squaredDistTileToNearestPortal(ti + 0.5, tj + 0.5) <= PORTAL_CLEAR_STONE_RADIUS * PORTAL_CLEAR_STONE_RADIUS;
}

/** Non-portal tiles too close for enemy sites / roam cells. */
function isTooCloseToAnyPortal(ix, iy, clearance = PORTAL_CAMP_CLEAR_RADIUS) {
  for (const portal of PORTALS) {
    if (Math.hypot(ix - portal.x, iy - portal.y) < clearance) return true;
  }
  return false;
}

function closestSecondarySettlementDist(px, py) {
  let m = Number.POSITIVE_INFINITY;
  for (const c of [[600, 490], [-600, -490], [580, -530]]) {
    const d = Math.hypot(px - c[0], py - c[1]);
    if (d < m) m = d;
  }
  return m;
}

function scaledCampEncounterSize(baseCount, camp) {
  if (camp.type === "fort" || camp.boss || baseCount <= 1) return baseCount;
  const d = closestSecondarySettlementDist(camp.x, camp.y);
  if (d < 132 && d > 42) return Math.max(1, Math.floor(baseCount * 0.52));
  return baseCount;
}

function shouldSpawnWildMobCamp(camp) {
  if (Math.hypot(camp.x, camp.y) <= PRIMARY_HUB_MOBS_CLEAR_RADIUS) return false;
  if (isTooCloseToAnyPortal(camp.x, camp.y)) return false;
  return true;
}

function nearFixedBuilding(tx, ty, pad = 9) {
  for (const b of BUILDINGS) {
    if (tx >= b.x - pad && tx < b.x + b.w + pad && ty >= b.y - pad && ty < b.y + b.h + pad) {
      return true;
    }
  }
  return false;
}

function buildScatterEnemyCamps() {
  const out = [];
  let scatterId = 0;

  for (let ring = 88; ring < 735; ring += 24) {
    const sectors = Math.max(14, Math.min(40, Math.floor(ring / 20)));
    for (let i = 0; i < sectors; i += 1) {
      const pick = hash2(ring, i, 6100);
      if (pick > 0.62) continue; // ~62 % of slots get a camp — dense world

      const angle = (i / sectors + pick * 0.14) * Math.PI * 2;
      let tx = Math.round(Math.cos(angle) * ring + (hash2(i, ring, 6101) - 0.5) * 22);
      let ty = Math.round(Math.sin(angle) * ring + (hash2(ring, i, 6102) - 0.5) * 22);

      /** Match mob-free starter disk so scatter sites are not naked clearings without foes */
      if (Math.hypot(tx, ty) < PRIMARY_HUB_MOBS_CLEAR_RADIUS + 28) continue;
      if (isTooCloseToAnyPortal(tx, ty)) continue;

      /** Wider berth around Oasis / Frost / Ember portal towns — fewer outskirts camps */
      const dOas = Math.hypot(tx - 600, ty - 490);
      const dFrs = Math.hypot(tx + 600, ty + 490);
      const dEmb = Math.hypot(tx - 580, ty + 530);
      if (dOas < 92 || dFrs < 92 || dEmb < 92) continue;
      if ((dOas < 150 || dFrs < 150 || dEmb < 150) && pick > 0.38) continue;

      if (nearFixedBuilding(tx, ty)) continue;

      const tierGuess = Math.min(6, Math.max(1, Math.floor(ring / 96)));
      const cappedTier = Math.min(6, tierGuess + (hash2(tx, ty, 6103) > 0.82 ? 1 : 0));
      const typeRoll   = hash2(tx, ty, 6106);

      // Assign camp type
      let campType;
      let size;
      if (cappedTier >= 3 && typeRoll < 0.16) {
        campType = "fort";
        size = Math.min(Math.max(6 + Math.floor(hash2(tx, ty, 6107) * 4), 6), 10);
      } else if (typeRoll < 0.38) {
        campType = "watch";
        size = Math.min(3 + Math.floor(hash2(tx, ty, 6104) * 2), 4);
      } else {
        size = 4 + Math.floor(hash2(tx, ty, 6104) * 4) + (cappedTier >= 4 ? 1 : 0);
        size = Math.min(Math.max(size, 4), 9);
      }

      scatterId += 1;
      const bossRoll = hash2(tx, ty, 6105);
      const boss = campType === "fort"
        ? (cappedTier >= 2 && bossRoll > 0.55)
        : (cappedTier >= 3 && bossRoll > 0.87);

      // Assign enemy faction — 6 types spread by tier (sludge/undead near start, demons/golems deep)
      const factionRoll = hash2(tx, ty, 6200);
      let faction;
      if (cappedTier <= 1) {
        faction = factionRoll < 0.8 ? "sludge" : "undead";
      } else if (cappedTier === 2) {
        faction = factionRoll < 0.45 ? "sludge" : factionRoll < 0.82 ? "undead" : "bandit";
      } else if (cappedTier === 3) {
        faction = factionRoll < 0.22 ? "sludge" : factionRoll < 0.52 ? "undead" : factionRoll < 0.84 ? "bandit" : "demon";
      } else if (cappedTier === 4) {
        faction = factionRoll < 0.15 ? "undead" : factionRoll < 0.42 ? "bandit" : factionRoll < 0.68 ? "demon" : "dragon";
      } else {
        faction = factionRoll < 0.22 ? "demon" : factionRoll < 0.52 ? "dragon" : "golem";
      }

      out.push({
        id: `scatter_wild_${scatterId}`,
        x: tx,
        y: ty,
        size,
        tier: cappedTier,
        faction,
        ...(campType ? { type: campType } : {}),
        ...(boss ? { boss: true } : {})
      });
    }
  }

  return out;
}

const BASE_ENEMY_CAMPS = [
  // ── First encounters — just outside the walled hub pasture (hypot ≥ ~138) ─
  { id: "bracken_post",  x:    0, y:  -96, size: 3, tier: 1 },
  { id: "muddy_bank",    x:   96, y:    0, size: 3, tier: 1 },
  { id: "stone_stump",   x:    0, y:   96, size: 3, tier: 1 },
  { id: "briars_edge",   x:  -96, y:    0, size: 3, tier: 1 },
  // Diagonal camps sit past VILLAGES[0] so they do not clash with meadow clearing.
  { id: "crooked_pine",  x:  105, y: -105, size: 3, tier: 1 },
  { id: "dark_burrow",   x: -105, y: -105, size: 3, tier: 1 },
  { id: "wolf_den",      x:  105, y:  105, size: 3, tier: 1 },
  { id: "thorny_glade",  x: -105, y:  105, size: 3, tier: 1 },
  { id: "north_post",    x:   12, y: -148, size: 3, tier: 1, type: "watch" },
  { id: "east_post",     x:  148, y:   12, size: 3, tier: 1, type: "watch" },
  { id: "south_post",    x:  -12, y:  148, size: 3, tier: 1, type: "watch" },
  { id: "west_post",     x: -148, y:  -12, size: 3, tier: 1, type: "watch" },
  // ── Tier 1 — near hub (90–160 tiles) ─────────────────────────────────────
  { id: "north_woods",    x:  -80, y: -130, size: 4, tier: 1 },
  { id: "east_copse",     x:  130, y:  -60, size: 5, tier: 1 },
  { id: "south_ford",     x:   90, y:  130, size: 4, tier: 1 },
  { id: "west_bramble",   x: -140, y:   80, size: 5, tier: 1 },
  { id: "creek_watch",    x:  160, y:   40, size: 3, tier: 1, type: "watch" },
  { id: "trail_post",     x:  -60, y:  170, size: 4, tier: 1 },
  { id: "ridge_camp",     x:  -30, y: -160, size: 4, tier: 1 },
  { id: "hollow_band",    x:  150, y: -110, size: 4, tier: 1 },
  { id: "river_watch",    x:  -45, y:  145, size: 3, tier: 1, type: "watch" },
  { id: "grove_patrol",   x:  110, y:   95, size: 3, tier: 1 },
  { id: "pine_scout",     x: -125, y:  -80, size: 3, tier: 1 },
  { id: "east_thicket",   x:  155, y:  -80, size: 3, tier: 1 },
  // ── Tier 2 — mid range (160–320 tiles) ───────────────────────────────────
  { id: "briar_gate",     x:   50, y: -240, size: 5, tier: 2 },
  { id: "moss_ring",      x: -220, y:   10, size: 5, tier: 2 },
  { id: "deep_pines",     x: -185, y:  -65, size: 8, tier: 2, boss: true, type: "fort" },
  { id: "old_road",       x:   65, y: -185, size: 7, tier: 2, boss: true, type: "fort" },
  { id: "far_meadow",     x: -270, y:  225, size: 6, tier: 2, boss: true },
  { id: "flower_den",     x:  175, y:  230, size: 5, tier: 2 },
  { id: "thistle_bend",   x: -315, y:  135, size: 5, tier: 2 },
  { id: "canyon_watch",   x:  270, y:  -95, size: 3, tier: 2, type: "watch" },
  { id: "glade_post",     x: -245, y: -195, size: 5, tier: 2 },
  { id: "iron_fork",      x:  210, y:  170, size: 5, tier: 2 },
  { id: "dark_crossing",  x: -180, y:  260, size: 5, tier: 2 },
  { id: "salt_run",       x:  300, y:  130, size: 5, tier: 2 },
  { id: "hill_watch",     x: -190, y:  110, size: 3, tier: 2, type: "watch" },
  { id: "pine_watch",     x:  130, y: -165, size: 3, tier: 2, type: "watch" },
  { id: "amber_bastion",  x:  245, y:   65, size: 8, tier: 2, boss: true, type: "fort" },
  { id: "iron_fort",      x:  -50, y: -240, size: 8, tier: 2, boss: true, type: "fort" },
  // ── Tier 3 — outer ring (320–470 tiles) ──────────────────────────────────
  { id: "clover_ruins",   x:   25, y:  310, size: 8, tier: 3, boss: true, type: "fort" },
  { id: "oasis_raiders",  x:  295, y:  155, size: 7, tier: 3, boss: true },
  { id: "sunken_dunes",   x:  190, y:  275, size: 5, tier: 3 },
  { id: "frost_ridge",    x: -295, y: -155, size: 9, tier: 3, boss: true, type: "fort" },
  { id: "snow_hollow",    x: -180, y: -275, size: 5, tier: 3 },
  { id: "ember_watch",    x:  310, y: -195, size: 3, tier: 3, boss: false, type: "watch" },
  { id: "ash_fields",     x:  165, y: -300, size: 5, tier: 3 },
  { id: "stone_circle",   x: -205, y:  325, size: 8, tier: 3, boss: true, type: "fort" },
  { id: "pine_barricade", x: -155, y: -400, size: 5, tier: 3 },
  { id: "bone_crossing",  x:  350, y:  -40, size: 6, tier: 3 },
  { id: "mud_spire",      x: -370, y:   55, size: 5, tier: 3 },
  { id: "crag_den",       x:  -95, y:  390, size: 6, tier: 3, boss: true },
  { id: "dusk_hollow",    x:  375, y: -185, size: 5, tier: 3 },
  { id: "ridge_watch",    x: -320, y:  -80, size: 3, tier: 3, type: "watch" },
  { id: "summit_post",    x:  285, y: -280, size: 3, tier: 3, type: "watch" },
  { id: "oasis_fort",     x:  340, y:  275, size: 9, tier: 3, boss: true, type: "fort" },
  // ── Tier 4 — deep wilderness (470–600 tiles) ──────────────────────────────
  { id: "glass_wash",     x:  380, y:  195, size: 6, tier: 4 },
  { id: "scorpion_run",   x:  290, y:  345, size: 5, tier: 4 },
  { id: "icefall_post",   x: -385, y: -215, size: 5, tier: 4 },
  { id: "white_gulch",    x: -280, y: -360, size: 6, tier: 4 },
  { id: "cinder_ford",    x:  400, y: -280, size: 6, tier: 4 },
  { id: "charred_steps",  x:  255, y: -395, size: 5, tier: 4 },
  { id: "salt_basin",     x:  210, y:  415, size: 5, tier: 4 },
  { id: "bog_crossing",   x: -415, y:  210, size: 6, tier: 4 },
  { id: "smoke_hollow",   x:  155, y: -455, size: 5, tier: 4 },
  { id: "twin_cairns",    x: -450, y: -155, size: 6, tier: 4 },
  { id: "sand_gate",      x:  455, y:  340, size: 6, tier: 4 },
  { id: "frost_tooth",    x: -340, y: -430, size: 5, tier: 4 },
  { id: "ember_flats",    x:  455, y: -430, size: 6, tier: 4 },
  { id: "ruin_arch",      x: -480, y:  310, size: 5, tier: 4 },
  { id: "deep_bastion",   x: -390, y: -310, size: 9, tier: 4, boss: true, type: "fort" },
  { id: "ember_citadel",  x:  430, y: -360, size: 9, tier: 4, boss: true, type: "fort" },
  { id: "oasis_keep",     x:  415, y:  240, size: 9, tier: 4, boss: true, type: "fort" },
  { id: "far_tower_n",    x: -400, y: -150, size: 3, tier: 4, type: "watch" },
  { id: "far_tower_e",    x:  380, y:  -80, size: 3, tier: 4, type: "watch" },
  { id: "far_tower_s",    x:  100, y:  460, size: 3, tier: 4, type: "watch" },
  { id: "far_tower_w",    x: -460, y:  145, size: 3, tier: 4, type: "watch" },
  // ── Tier 5 — endgame approaches (600–720 tiles) ───────────────────────────
  { id: "saffron_outpost", x:  450, y:  295, size: 9, tier: 5, boss: true, type: "fort" },
  { id: "rime_circle",     x: -450, y: -325, size: 9, tier: 5, boss: true, type: "fort" },
  { id: "red_glass_camp",  x:  475, y: -375, size: 7, tier: 5, boss: true },
  { id: "deep_thorn",      x: -490, y:  320, size: 6, tier: 5, boss: true },
  { id: "dusk_spire",      x:  465, y:  465, size: 7, tier: 5, boss: true },
  { id: "ice_barrow",      x: -520, y: -410, size: 6, tier: 5 },
  { id: "lava_crown",      x:  510, y: -490, size: 6, tier: 5 },
  { id: "sand_throne",     x:  535, y:  400, size: 6, tier: 5 },
  { id: "black_fen",       x: -550, y:  250, size: 5, tier: 5 },
  { id: "frost_bastion",   x: -500, y: -470, size:10, tier: 5, boss: true, type: "fort" },
  { id: "ember_keep",      x:  520, y: -450, size:10, tier: 5, boss: true, type: "fort" },
  // ── Tier 6 — portal gates (720+ tiles, near destinations) ─────────────────
  { id: "void_crossing",   x:  545, y:  440, size:10, tier: 6, boss: true, type: "fort" },
  { id: "null_pinnacle",   x: -545, y: -455, size:10, tier: 6, boss: true, type: "fort" },
  { id: "ash_crown",       x:  440, y: -610, size:10, tier: 6, boss: true, type: "fort" },
];

const ENEMY_CAMPS = [...BASE_ENEMY_CAMPS, ...buildScatterEnemyCamps()];

const BUILDING_INTERIORS = BUILDINGS.map((building, index) => createInteriorForBuilding(building, index));

// ---------------------------------------------------------------------------
// Procedural settlement system
// ---------------------------------------------------------------------------
const SETTLE_GRID = 80;

// Fixed relative building positions within a procedural settlement.
const SETTLE_SLOTS = [
  { dx: -19, dy: -13, w: 9, h: 7, type: "hut"   },
  { dx:   7, dy: -13, w: 9, h: 7, type: "hut"   },
  { dx: -20, dy:   5, w:10, h: 7, type: "house"  },
  { dx:   7, dy:   5, w:10, h: 7, type: "house"  },
  { dx:  -8, dy:  -4, w: 8, h: 6, type: "hut"   },
];

const SETTLE_NAMES = {
  forest:   ["Forest Hut", "Woodland Rest", "Ranger Shelter", "Forest Cabin", "Woodsman Hut"],
  meadow:   ["Meadow Hut", "Field Cottage", "Farm Rest", "Pasture Shelter", "Meadow Cabin"],
  desert:   ["Sun Hut", "Oasis Rest", "Sand Cabin", "Clay Shelter", "Desert Hut"],
  frost:    ["Frost Hut", "Snow Cabin", "Pine Shelter", "Frost Cabin", "Ice Hut"],
  ember:    ["Ember Hut", "Ash Cabin", "Forge Shelter", "Ember Cabin", "Cinder Hut"],
  swamp:    ["Bog Hut", "Mire Shelter", "Marsh Cabin", "Reed Post", "Fen Hut"],
  savanna:  ["Dust Hut", "Prairie Shelter", "Dry Cabin", "Scrub Post", "Brush Hut"],
  tundra:   ["Cold Hut", "Ice Shelter", "Bleak Cabin", "Frozen Post", "Frigid Hut"],
  badlands: ["Scorch Hut", "Cinder Shelter", "Ash Cabin", "Char Post", "Brimstone Hut"],
};

function getSettlementAt(gx, gy) {
  if (hash2(gx * 7919, gy * 6271, 9991) > 0.18) return null;

  const cx = gx * SETTLE_GRID + 10 + Math.floor(hash2(gx, gy, 201) * (SETTLE_GRID - 20));
  const cy = gy * SETTLE_GRID + 10 + Math.floor(hash2(gx, gy, 202) * (SETTLE_GRID - 20));

  // Stay clear of starting town and portal destinations.
  if (Math.hypot(cx, cy) < Math.max(86, HUB_TOWN_GRASS_RADIUS + 18)) return null;
  if (Math.hypot(cx - 600, cy - 490) < 56) return null;
  if (Math.hypot(cx + 600, cy + 490) < 56) return null;
  if (Math.hypot(cx - 580, cy + 530) < 56) return null;

  const numSlots = 2 + Math.floor(hash2(gx, gy, 203) * 4);
  const clearRadius = 20 + Math.floor(hash2(gx, gy, 204) * 12);

  return { cx, cy, gx, gy, numSlots, clearRadius };
}

function getSettlementBuildingList(s) {
  const biome = getBiome(s.cx, s.cy);
  const names = SETTLE_NAMES[biome] || SETTLE_NAMES.forest;
  const count = Math.min(s.numSlots, SETTLE_SLOTS.length);
  const result = [];
  for (let i = 0; i < count; i++) {
    const slot = SETTLE_SLOTS[i];
    result.push({
      x: s.cx + slot.dx,
      y: s.cy + slot.dy,
      w: slot.w,
      h: slot.h,
      name: names[i % names.length],
      type: slot.type || "hut",
      gx: s.gx,
      gy: s.gy,
      slotIndex: i,
    });
  }
  return result;
}

function getNearbySettlements(x, y) {
  const gx = Math.floor(x / SETTLE_GRID);
  const gy = Math.floor(y / SETTLE_GRID);
  const result = [];
  for (let dg = -1; dg <= 1; dg++) {
    for (let dh = -1; dh <= 1; dh++) {
      const s = getSettlementAt(gx + dg, gy + dh);
      if (s) result.push(s);
    }
  }
  return result;
}

function getProceduralSettlementTile(x, y) {
  for (const s of getNearbySettlements(x, y)) {
    const dist = Math.hypot(x - s.cx, y - s.cy);
    if (dist > s.clearRadius + 5) continue;

    // Buildings take priority.
    for (const b of getSettlementBuildingList(s)) {
      if (x < b.x || x >= b.x + b.w || y < b.y || y >= b.y + b.h) continue;
      const doorXs = southDoorWorldXs(b);
      const southWall = b.y + b.h - 1;
      const northWall = b.y;
      if ((y === southWall || y === northWall) && doorXs.includes(x)) return TILE.DOOR;
      if (x === b.x || x === b.x + b.w - 1 || y === northWall || y === southWall) return TILE.WALL;
      const lx = x - b.x;
      const ly = y - b.y;
      const seed = hash2(b.x, b.y, 7777);
      return getBuildingInteriorTile(lx, ly, b.w, b.h, b.type || "hut", seed, false, false);
    }

    // Cross roads through settlement center.
    const dx = Math.abs(x - s.cx);
    const dy = Math.abs(y - s.cy);
    if ((dy <= 1 && dx <= s.clearRadius) || (dx <= 1 && dy <= s.clearRadius)) {
      return TILE.PATH;
    }

    // Clearing ground.
    if (dist <= s.clearRadius) {
      const biome = getBiome(x, y);
      if (biome === "desert")   return hash2(x, y, 77) > 0.93 ? TILE.STONE : TILE.SAND;
      if (biome === "frost")    return hash2(x, y, 77) > 0.92 ? TILE.STONE : TILE.SNOW;
      if (biome === "ember")    return hash2(x, y, 77) > 0.92 ? TILE.STONE : TILE.DARK_GRASS;
      if (biome === "savanna")  return hash2(x, y, 77) > 0.91 ? TILE.STONE : TILE.GRASS;
      if (biome === "tundra")   return hash2(x, y, 77) > 0.72 ? TILE.STONE : TILE.SNOW;
      if (biome === "badlands") return hash2(x, y, 77) > 0.88 ? TILE.STONE : TILE.DARK_GRASS;
      if (biome === "swamp")    return hash2(x, y, 77) > 0.90 ? TILE.STONE : TILE.DARK_GRASS;
      const r = hash2(x, y, 77);
      return r > 0.86 ? TILE.FLOWERS : r > 0.70 ? TILE.DARK_GRASS : TILE.GRASS;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------

function getEnemyCampTile(x, y) {
  if (isPortalCourtyardStoneTile(Math.floor(x), Math.floor(y))) {
    return null;
  }

  for (const camp of ENEMY_CAMPS) {
    const dx  = x - camp.x;
    const dy  = y - camp.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const dist = Math.hypot(dx, dy);

    // ── Fort: rectangular stone perimeter + corner towers ──────────────────
    if (camp.type === "fort") {
      const half = camp.size;
      if (adx > half + 2 || ady > half + 2) continue;

      // Corner towers (always solid stone)
      if (adx >= half && ady >= half) return TILE.STONE;

      // Perimeter walls
      const onNorthWall = ady === half && dy < 0;
      const onSideWall  = adx === half && ady < half;
      const onSouthWall = dy === half && adx > 3 && adx <= half; // gate gap of ±3
      if (onNorthWall || onSideWall || onSouthWall) return TILE.STONE;

      // Interior
      if (adx < half && ady < half) {
        if (adx <= 1 && ady <= 1) return TILE.STONE; // central structure
        const r = hash2(x, y, 910);
        if (r > 0.82) return TILE.STONE;             // rubble/debris
        return TILE.PATH;
      }

      // Exterior apron
      if (hash2(x, y, 911) > 0.62) return TILE.PATH;
      continue;
    }

    // ── Watchtower: solid stone tower with trampled ground ──────────────────
    if (camp.type === "watch") {
      if (dist > camp.size + 2) continue;

      if (adx <= 1 && ady <= 1) return TILE.STONE;
      if (adx <= 2 && ady <= 2) return hash2(x, y, 912) > 0.45 ? TILE.STONE : TILE.PATH;

      if (dist <= camp.size) {
        const r = hash2(x, y, 913);
        if (r > 0.55) return TILE.PATH;
        const biome = getBiome(x, y);
        if (biome === "desert" || biome === "savanna") return TILE.SAND;
        if (biome === "frost"  || biome === "tundra")  return TILE.SNOW;
        if (biome === "ember"  || biome === "badlands" || biome === "swamp") return TILE.DARK_GRASS;
        return TILE.GRASS;
      }
      if (hash2(x, y, 914) > 0.72) return TILE.PATH;
      continue;
    }

    // ── Default camp: scattered stone/path clearing ─────────────────────────
    if (dist > camp.size + 2) continue;

    if (adx <= 1 && ady <= 1) return TILE.STONE;

    if (dist <= camp.size) {
      const r = hash2(x, y, 901);
      if (r > 0.84) return TILE.STONE;
      if (r > 0.28) return TILE.PATH;
      const biome = getBiome(x, y);
      if (biome === "desert" || biome === "savanna") return TILE.SAND;
      if (biome === "frost"  || biome === "tundra")  return TILE.SNOW;
      if (biome === "ember"  || biome === "badlands" || biome === "swamp") return TILE.DARK_GRASS;
      return TILE.GRASS;
    }

    if (hash2(x, y, 902) > 0.62) return TILE.PATH;
  }

  return null;
}

// ---------------------------------------------------------------------------

function getBuildingInteriorTile(lx, ly, w, h, type, seed, buyableHome, isPub) {
  if (buyableHome && !isPub && (type === "house" || type === "big_house") && w >= 7 && h >= 6) {
    const shelfLX = Math.max(2, w - 3);
    const shelfLY = 2;
    return residentialDwellingInnerTileLocalsOrFloor(lx, ly, w, h, shelfLX, shelfLY);
  }
  if (buyableHome) {
    return TILE.FLOOR;
  }
  if (isPub && type === "house") {
    if (lx >= 2 && lx <= w - 3 && ly >= h - 4 && ly <= h - 2) return TILE.CARPET;
    if (lx === w - 3 && ly === 2) return TILE.SHELF;
    return TILE.FLOOR;
  }
  if (type === "hut") {
    const fpX = Math.floor((w - 2) / 2) + 1;
    if (lx === fpX && ly === 1) return TILE.FIREPLACE;
    if ((lx === 1 || lx === 2) && ly === 1) return TILE.BED;
    if (lx === w - 2 && ly === 1) return TILE.SHELF;
    if (ly === h - 2) return TILE.CARPET;
    return TILE.FLOOR;
  }

  if (type === "treehouse") {
    if ((lx === 1 || lx === 2) && ly === 1) return TILE.BED;
    if (lx === w - 2 && ly === 1) return TILE.SHELF;
    if (ly === h - 2) return TILE.CARPET;
    return TILE.FLOOR;
  }

  if (type === "house") {
    const fpX = Math.floor(w / 2);
    if (lx === fpX && ly === 1) return TILE.FIREPLACE;
    if ((lx === 1 || lx === 2) && ly === 1) return TILE.BED;
    if ((lx === w - 3 || lx === w - 2) && ly === 2) return TILE.TABLE;
    if (lx === w - 2 && ly === 3) return TILE.SHELF;
    if (ly >= h - 3 && lx >= 2 && lx <= w - 3) return TILE.CARPET;
    return TILE.FLOOR;
  }

  if (type === "big_house") {
    const fpX = Math.floor(w / 2);
    if (lx === fpX && ly === 1) return TILE.FIREPLACE;
    if ((lx === 1 || lx === 2) && ly === 1) return TILE.BED;
    if ((lx === 1 || lx === 2) && ly === 3) return TILE.BED;
    if (lx >= w - 4 && lx <= w - 2 && ly >= 2 && ly <= 4) return TILE.TABLE;
    if (lx === w - 2 && ly === 5) return TILE.SHELF;
    if (ly >= h - 4 && lx >= 3 && lx <= w - 3) return TILE.CARPET;
    return TILE.FLOOR;
  }

  if (type === "castle") {
    const midX = Math.floor(w / 2);
    if (lx === midX && ly === 1) return TILE.FIREPLACE;
    if (lx >= midX - 1 && lx <= midX + 1 && ly >= 2 && ly <= 3) return TILE.TABLE;
    if (lx >= 3 && lx <= w - 4 && ly >= 5 && ly <= 6) return TILE.TABLE;
    if (lx >= 3 && lx <= w - 4 && ly >= 8 && ly <= 9) return TILE.TABLE;
    if (lx === w - 2 && ly >= 3 && ly <= 5 && (ly - 3) % 2 === 0) return TILE.SHELF;
    if (lx >= midX - 1 && lx <= midX + 1 && ly >= 2 && ly <= h - 2) return TILE.CARPET;
    return TILE.FLOOR;
  }

  return TILE.FLOOR;
}

function getBuildingTile(x, y) {
  for (const b of BUILDINGS) {
    if (x < b.x || x >= b.x + b.w || y < b.y || y >= b.y + b.h) {
      continue;
    }

    const doorCols = southDoorWorldXs(b);
    const southWall = b.y + b.h - 1;
    const northWall = b.y;

    if ((y === southWall || y === northWall) && doorCols.includes(x)) {
      return TILE.DOOR;
    }

    if (
      x === b.x ||
      x === b.x + b.w - 1 ||
      y === northWall ||
      y === southWall
    ) {
      return TILE.WALL;
    }

    const lx = x - b.x;
    const ly = y - b.y;
    const seed = hash2(b.x, b.y, 7777);
    return getBuildingInteriorTile(lx, ly, b.w, b.h, b.type || "house", seed, !!b.forSale, !!b.isPub);
  }

  return null;
}

function createInteriorForBuilding(building, index) {
  return {
    id: `interior_${index}`,
    index,
    building,
    x: INTERIOR_BASE_X + index * INTERIOR_SPACING,
    y: INTERIOR_BASE_Y,
    w: building.w,
    h: building.h
  };
}

function getProceduralInteriorIndex(building) {
  if (!Number.isInteger(building.gx) || !Number.isInteger(building.gy) || !Number.isInteger(building.slotIndex)) {
    return null;
  }

  const gx = building.gx + PROCEDURAL_INTERIOR_GRID_OFFSET;
  const gy = building.gy + PROCEDURAL_INTERIOR_GRID_OFFSET;
  if (gx < 0 || gx >= PROCEDURAL_INTERIOR_GRID_SIZE || gy < 0 || gy >= PROCEDURAL_INTERIOR_GRID_SIZE) {
    return null;
  }

  return BUILDINGS.length + ((gx * PROCEDURAL_INTERIOR_GRID_SIZE + gy) * SETTLE_SLOTS.length) + building.slotIndex;
}

function getInteriorByIndex(index) {
  if (index < 0) {
    return null;
  }

  if (index < BUILDING_INTERIORS.length) {
    return BUILDING_INTERIORS[index] || null;
  }

  const procedural = index - BUILDINGS.length;
  const slotIndex = procedural % SETTLE_SLOTS.length;
  const cell = Math.floor(procedural / SETTLE_SLOTS.length);
  const gx = Math.floor(cell / PROCEDURAL_INTERIOR_GRID_SIZE) - PROCEDURAL_INTERIOR_GRID_OFFSET;
  const gy = (cell % PROCEDURAL_INTERIOR_GRID_SIZE) - PROCEDURAL_INTERIOR_GRID_OFFSET;
  const settlement = getSettlementAt(gx, gy);
  if (!settlement) {
    return null;
  }

  const building = getSettlementBuildingList(settlement)[slotIndex];
  if (!building) {
    return null;
  }

  return createInteriorForBuilding(building, index);
}

function getCandidateInteriorsNear(x) {
  const rough = Math.floor((x - INTERIOR_BASE_X) / INTERIOR_SPACING);
  const interiors = [];
  for (let index = rough - 1; index <= rough + 1; index += 1) {
    const interior = getInteriorByIndex(index);
    if (interior) {
      interiors.push(interior);
    }
  }
  return interiors;
}

function getInteriorAreaAt(x, y, margin = 0) {
  for (const interior of getCandidateInteriorsNear(x)) {
    if (
      x >= interior.x - margin &&
      x < interior.x + interior.w + margin &&
      y >= interior.y - margin &&
      y < interior.y + interior.h + margin
    ) {
      return interior;
    }
  }
  return null;
}

function getInteriorShopShelf(interior) {
  return {
    id: `shop_${interior.index}`,
    name: `${interior.building.name} Shelf`,
    x: interior.x + Math.max(2, interior.w - 3),
    y: interior.y + 2
  };
}

/**
 * Player-facing houses & big villas: hearth north, trader shelf, one-tile home tree NW,
 * one-tile chest NE, one-tile bed SW, one-tile table with one-tile chair below it SE column.
 */
function residentialDwellingInnerTileLocalsOrFloor(localX, localY, w, h, shelfLocalX, shelfLocalY) {
  if (w < 7 || h < 6) {
    return null;
  }

  if (localX === shelfLocalX && localY === shelfLocalY) {
    return TILE.SHELF;
  }

  const mid = Math.floor(w / 2);
  if (localX === mid && localY === 1) {
    return TILE.FIREPLACE;
  }

  if (localX === 1 && localY === 1) {
    return TILE.HOME_TREE;
  }
  if (localX === w - 2 && localY === 1) {
    return TILE.CHEST;
  }

  if (localX === 1 && localY === h - 2) {
    return TILE.BED;
  }
  if (localX === w - 2 && localY === h - 3) {
    return TILE.TABLE;
  }
  if (localX === w - 2 && localY === h - 2) {
    return TILE.CHAIR;
  }

  const rugRow = Math.max(3, Math.min(h - 7, 4));
  if (localY === rugRow && localX >= mid - 1 && localX <= mid + 1) {
    return TILE.CARPET;
  }

  return TILE.FLOOR;
}

function phantomResidentialDwellingTile(localX, localY, interior) {
  const b = interior.building;
  const typ = b.type || "house";
  if (b?.isPub || !(typ === "house" || typ === "big_house")) {
    return null;
  }

  const { w, h } = interior;
  const shelfLX = Math.max(2, w - 3);
  const shelfLY = 2;
  return residentialDwellingInnerTileLocalsOrFloor(localX, localY, w, h, shelfLX, shelfLY);
}

function getInteriorTile(x, y) {
  const interior = getInteriorAreaAt(x, y);
  if (!interior) {
    return null;
  }

  const localX = x - interior.x;
  const localY = y - interior.y;
  const { w, h } = interior;
  const doorLocals = southDoorLocalXs(w);

  if (
    doorLocals.includes(localX) &&
    (localY === 0 || localY === h - 1)
  ) {
    return TILE.DOOR;
  }

  if (localX === 0 || localX === w - 1 || localY === 0 || localY === h - 1) {
    return TILE.WALL;
  }

  const type = interior.building.type || "house";

  if (type === "hut") {
    // Fireplace centered on north wall interior
    if (localX === Math.floor(w / 2) && localY === 1) return TILE.FIREPLACE;
    // Single bed in corner
    if (localX >= 1 && localX <= 2 && localY >= 2 && localY <= 3) return TILE.BED;
    // Small rug
    if (localX >= 2 && localX <= w - 3 && localY === h - 3) return TILE.CARPET;
    return TILE.FLOOR;
  }

  if (type === "treehouse") {
    // Shelf on east wall
    if (localX === w - 2 && localY === 2) return TILE.SHELF;
    // Bed in west corner
    if (localX >= 1 && localX <= 2 && localY >= 2 && localY <= 3) return TILE.BED;
    // Rug strip
    if (localX >= 2 && localX <= w - 3 && localY >= h - 4 && localY <= h - 3) return TILE.CARPET;
    return TILE.FLOOR;
  }

  {
    const phantomRes = phantomResidentialDwellingTile(localX, localY, interior);
    if (phantomRes !== null) {
      return phantomRes;
    }
  }

  if (type === "castle") {
    const midX = Math.floor(w / 2);
    // Fireplace on north interior wall
    if (localX === midX && localY === 1) return TILE.FIREPLACE;
    // Throne / head table at north center
    if (localX >= midX - 2 && localX <= midX + 2 && localY >= 3 && localY <= 4) return TILE.TABLE;
    // Long banquet tables
    if (localX >= 3 && localX <= w - 4 && localY >= 6 && localY <= 7) return TILE.TABLE;
    if (localX >= 3 && localX <= w - 4 && localY >= 9 && localY <= 10) return TILE.TABLE;
    // Armory shelf on east wall
    if (localX === w - 2 && localY >= 3 && localY <= 5) return TILE.SHELF;
    // Grand carpet aisle
    if (localX >= midX - 2 && localX <= midX + 2 && localY >= 3 && localY <= h - 2) return TILE.CARPET;
    return TILE.FLOOR;
  }

  // Taproom variant (matches exterior pub footprint)
  if (interior.building.isPub && type === "house") {
    if (localX >= 2 && localX <= w - 3 && localY >= h - 4 && localY <= h - 2) return TILE.CARPET;
    if (localX === w - 3 && localY === 2) return TILE.SHELF;
    return TILE.FLOOR;
  }

  return TILE.FLOOR;
}

function getInteriorExteriorTile(x, y) {
  const interior = getInteriorAreaAt(x, y, INTERIOR_EXTERIOR_MARGIN);
  if (!interior || getInteriorAreaAt(x, y)) {
    return null;
  }

  const sourceX = interior.building.x + (x - interior.x);
  const sourceY = interior.building.y + (y - interior.y);
  return generateExteriorTile(sourceX, sourceY);
}

function isInteriorCoordinate(x, y) {
  return getInteriorAt(Math.floor(x), Math.floor(y)) !== null;
}

function isInsideBuilding(x, y) {
  for (const b of BUILDINGS) {
    if (footprintHitsPortalClearance(b.x, b.y, b.w, b.h)) {
      continue;
    }
    if (x > b.x + 0.5 && x < b.x + b.w - 0.5 && y > b.y + 0.5 && y < b.y + b.h - 0.5) return true;
  }
  return false;
}

function isProtectedStartingArea(x, y) {
  return Math.hypot(x - STARTING_AREA.x, y - STARTING_AREA.y) <= STARTING_AREA.radius;
}

function canAttackAt(x, y) {
  return !isInsideBuilding(x, y) && !isProtectedStartingArea(x, y);
}

function isInteriorDistrict(x, y) {
  return getInteriorAreaAt(x, y, INTERIOR_EXTERIOR_MARGIN) !== null;
}

function getInteriorAt(x, y) {
  return getInteriorAreaAt(x, y);
}

function getBuildingDoors(building) {
  const cx = southDoorAnchorWorldX(building);
  return [
    { side: "north", x: cx, y: building.y, outsideY: building.y - 1.15, insideOffsetY: 1.15 },
    { side: "south", x: cx, y: building.y + building.h - 1, outsideY: building.y + building.h + 0.15, insideOffsetY: -1.15 }
  ];
}

function getInteriorDoors(interior) {
  const cx = interior.x + southDoorLocalCenterOffset(interior.w);
  return [
    { side: "north", x: cx, y: interior.y, outsideY: interior.building.y - 1.15, insideOffsetY: 1.15 },
    { side: "south", x: cx, y: interior.y + interior.h - 1, outsideY: interior.building.y + interior.building.h + 0.15, insideOffsetY: -1.15 }
  ];
}

function getBuildingsNearDoor(x, y) {
  const buildings = BUILDINGS.filter((building) => (
    x >= building.x - 2 &&
    x < building.x + building.w + 2 &&
    y >= building.y - 2 &&
    y < building.y + building.h + 2 &&
    !footprintHitsPortalClearance(building.x, building.y, building.w, building.h)
  ));

  for (const settlement of getNearbySettlements(x, y)) {
    for (const building of getSettlementBuildingList(settlement)) {
      if (
        x >= building.x - 2 &&
        x < building.x + building.w + 2 &&
        y >= building.y - 2 &&
        y < building.y + building.h + 2
      ) {
        buildings.push(building);
      }
    }
  }

  return buildings;
}

function getDoorTransitionAt(x, y) {
  const tx = Math.round(Number(x));
  const ty = Math.round(Number(y));
  for (let i = 0; i < BUILDINGS.length; i += 1) {
    const b = BUILDINGS[i];
    if (footprintHitsPortalClearance(b.x, b.y, b.w, b.h)) {
      continue;
    }
    const doorCols = southDoorWorldXs(b);
    const southRow = Math.floor(b.y) + Math.floor(b.h) - 1;
    if (
      doorCols.includes(tx) &&
      (ty === southRow || ty === southRow + 1 || ty === southRow - 1)
    ) {
      const interior = BUILDING_INTERIORS[i];
      if (!interior) {
        return null;
      }
      return {
        ...interior,
        name: typeof b.name === "string" ? b.name : "Building"
      };
    }
  }
  return null;
}

function getShopFixtureAt(x, y) {
  if (isSciFiSector(x, y)) {
    for (const feature of SCI_FI_STATION_FEATURES) {
      if (feature.kind !== "shop-bay" && feature.kind !== "ship-shop") {
        continue;
      }
      if (!feature.shopType) {
        continue;
      }
      const halfW = Math.max(1, Math.floor(feature.w / 2));
      const halfH = Math.max(1, Math.floor(feature.h / 2));
      if (footprintHitsPortalClearance(feature.x - halfW, feature.y - halfH, feature.w, feature.h)) {
        continue;
      }
      if (x >= feature.x - halfW - 0.9 && x <= feature.x + halfW + 0.9 && y >= feature.y - halfH - 0.9 && y <= feature.y + halfH + 0.9) {
        return {
          id: feature.id,
          name: feature.name,
          buildingName: "Ringforge Station",
          isPub: false,
          shopType: feature.shopType,
          x: feature.x,
          y: feature.y
        };
      }
    }
  }

  for (const interior of getCandidateInteriorsNear(x)) {
    const b = interior.building;
    if (Math.abs(x - (interior.x + interior.w / 2)) > interior.w + 2 || Math.abs(y - (interior.y + interior.h / 2)) > interior.h + 2) {
      continue;
    }
    for (let lx = 1; lx <= interior.w - 2; lx += 1) {
      for (let ly = 1; ly <= interior.h - 2; ly += 1) {
        const wx = interior.x + lx;
        const wy = interior.y + ly;
        if (getInteriorTile(wx, wy) !== TILE.SHELF) {
          continue;
        }
        if (Math.hypot(x - (wx + 0.5), y - (wy + 0.5)) <= 1.25) {
          return {
            id: `shop_int_${interior.index}`,
            name: b.isPub ? "Taproom" : "Trader Shelf",
            buildingName: b.name,
            isPub: !!b.isPub,
            shopType: b.isPub ? "pub" : "trade",
            x: wx + 0.5,
            y: wy + 0.5
          };
        }
      }
    }
  }

  for (const b of BUILDINGS) {
    if (Math.abs(x - (b.x + b.w/2)) > b.w + 2 || Math.abs(y - (b.y + b.h/2)) > b.h + 2) continue;
    const seed = hash2(b.x, b.y, 7777);
    for (let lx = 1; lx <= b.w - 2; lx += 1) {
      for (let ly = 1; ly <= b.h - 2; ly += 1) {
        if (
          getBuildingInteriorTile(lx, ly, b.w, b.h, b.type || "house", seed, !!b.forSale, !!b.isPub)
            === TILE.SHELF
        ) {
          const sx = b.x + lx,
            sy = b.y + ly;
          if (Math.hypot(x - (sx + 0.5), y - (sy + 0.5)) <= 1.25) {
            return {
              id: `shop_${b.x}_${b.y}`,
              name: b.isPub ? "Taproom" : "Trader Shelf",
              buildingName: b.name,
              isPub: !!b.isPub,
              shopType: b.isPub ? "pub" : "trade",
              x: sx + 0.5,
              y: sy + 0.5
            };
          }
        }
      }
    }
  }
  return null;
}

function isInVillage(x, y) {
  for (const v of VILLAGES) {
    const dx = x - v.cx;
    const dy = y - v.cy;
    if (dx * dx + dy * dy <= v.r * v.r) {
      return true;
    }
  }

  return false;
}

function isStreet(x, y) {
  for (const s of STREET_SEGMENTS) {
    const width = s.w ?? 1;
    if (s.y1 === s.y2) {
      if (Math.abs(y - s.y1) <= width && x >= Math.min(s.x1, s.x2) && x <= Math.max(s.x1, s.x2)) {
        return true;
      }
    } else {
      if (Math.abs(x - s.x1) <= width && y >= Math.min(s.y1, s.y2) && y <= Math.max(s.y1, s.y2)) {
        return true;
      }
    }
  }

  return false;
}

function getPortalAtTile(x, y) {
  return PORTALS.find((portal) => portal.x === x && portal.y === y) || null;
}

function getPortalAt(x, y) {
  for (const portal of PORTALS) {
    if (Math.hypot(x - portal.x, y - portal.y) <= PORTAL_RADIUS) {
      return portal;
    }
  }

  return null;
}

function smoothNoise(x, y, scale, seed) {
  const fx = x / scale;
  const fy = y / scale;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  const ux = tx * tx * (3 - 2 * tx);
  const uy = ty * ty * (3 - 2 * ty);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getWorldThemeAt(x, y) {
  return sciFiThemeForPoint(x, y);
}

function getBiome(x, y) {
  if (isSciFiSector(x, y)) {
    const station = sciFiStationAt(x, y);
    if (station) {
      return station.kind === "spawn" ? "station_spawn" : "station";
    }
    const planet = sciFiPlanetAt(x, y);
    if (planet) {
      return planet.type || "planet";
    }
    return "space";
  }

  // Deep biome cores checked first — portal-destination territories
  if (x > 350 && y > 265) return "desert";
  if (x < -350 && y < -265) return "frost";
  if (x > 335 && y < -295) return "ember";

  // Swamp: NW quadrant — independent wetland biome (no portal)
  if (x < -175 && y > 175) return "swamp";

  // Transition biomes bridging forest ↔ deep biome
  if (x > 195 && y > 125) return "savanna";  // NE, leads to desert
  if (x < -195 && y < -125) return "tundra"; // SW, leads to frost
  if (x > 180 && y < -125) return "badlands"; // SE, leads to ember

  // Meadow: noise-driven patches in the forest belt
  const meadow = smoothNoise(x + 220, y - 140, 42, 234);
  if (meadow > 0.64 && Math.hypot(x, y) > Math.max(42, HUB_TOWN_GRASS_RADIUS + 18)) {
    return "meadow";
  }

  return "forest";
}

/**
 * Domain-warped biome lookup for tile generation.
 * Adds ±48-tile noise displacement to biome boundaries so they read as
 * organic, ragged edges rather than straight geometric cuts.
 */
function getBiomeForTile(x, y) {
  const wx = (smoothNoise(x, y, 90, 7701) - 0.5) * 96;
  const wy = (smoothNoise(x, y, 90, 7702) - 0.5) * 96;
  return getBiome(x + wx, y + wy);
}

function generateTile(x, y) {
  return generateExteriorTile(x, y);
}

function generateExteriorTile(x, y) {
  const portal = getPortalAtTile(x, y);
  if (portal) {
    return TILE.PORTAL;
  }

  const apronTile = getInteriorExteriorTile(x, y);
  if (apronTile !== null) {
    return apronTile;
  }

  const interiorTile = getInteriorTile(x, y);
  if (interiorTile !== null) {
    return interiorTile;
  }

  // Fixed buildings override everything.
  const buildingTile = getBuildingTile(x, y);
  if (buildingTile !== null) {
    return buildingTile;
  }

  if (isSciFiSector(x, y)) {
    const feature = sciFiStationFeatureAt(x, y);
    if (feature) {
      return sciFiStationTileForFeature(feature, x, y);
    }

    const station = sciFiStationAt(x, y);
    if (station) {
      const dx = Math.abs(x - station.x);
      const dy = Math.abs(y - station.y);
      const shellX = Math.floor(station.w / 2);
      const shellY = Math.floor(station.h / 2);
      if (dx >= shellX - 1 || dy >= shellY - 1) {
        return TILE.HULL;
      }
      return TILE.METAL;
    }

    const planet = sciFiPlanetAt(x, y);
    if (planet) {
      const localX = x - planet.x;
      const localY = y - planet.y;
      const dist = Math.hypot(localX, localY);
      if (dist > planet.radius - 3) {
        return TILE.HULL;
      }
      if (dist > planet.radius - 8 && hash2(x, y, planet.seed + 19) > 0.74) {
        return TILE.WALKWAY;
      }
      return sciFiPlanetSurfaceTile(planet, x, y);
    }

    const laneDistSq = SCI_FI_LANES.reduce((best, lane) => {
      const from = sciFiStationById(lane.from);
      const to = sciFiStationById(lane.to);
      if (!from || !to) {
        return best;
      }
      const d = distPointToSegmentSq(x + 0.5, y + 0.5, from.x + 0.5, from.y + 0.5, to.x + 0.5, to.y + 0.5);
      return Math.min(best, d);
    }, Number.POSITIVE_INFINITY);
    if (laneDistSq < 4.1 * 4.1) {
      return laneDistSq < 1.6 * 1.6 ? TILE.ENERGY : TILE.WALKWAY;
    }

    return TILE.VOID;
  }

  const tiGrid = Math.floor(x);
  const tjGrid = Math.floor(y);
  const hk = `${tiGrid},${tjGrid}`;
  /** Stone curtain wall around the walled round hub — never overlays the plaza tree lump */
  if (Math.hypot(x, y) > 12 && HUB_WALL_TILE_KEYS.has(hk)) {
    return TILE.WALL;
  }

  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const dist = Math.hypot(x, y);

  // Landmark big tree: 3×3 cluster at the very centre of the plaza.
  if (ax <= 1 && ay <= 1) {
    return TILE.TREE;
  }

  /** Keep portal courtyards on stone ahead of PATH layers (hub paths & cross avenues). */
  if (!portal && isPortalCourtyardStoneTile(tiGrid, tjGrid)) {
    return TILE.STONE;
  }

  // Main cross-roads radiate outward from the ring.
  if (
    !isPortalCourtyardStoneTile(tiGrid, tjGrid) &&
    ((ax <= 1 && ay <= 260) || (ay <= 1 && ax <= 260))
  ) {
    return TILE.PATH;
  }

  // Circular ring road (town-square perimeter, radius 7–9).
  if (dist >= 7 && dist <= 9) {
    return TILE.PATH;
  }

  // Village internal street network.
  if (isStreet(x, y)) {
    return TILE.PATH;
  }

  if (
    !isPortalCourtyardStoneTile(tiGrid, tjGrid) &&
    dist < HUB_TOWN_GRASS_RADIUS + 35 &&
    HUB_PATH_TILE_KEYS.has(hk)
  ) {
    return TILE.PATH;
  }

  if (isStoneHighway(tiGrid, tjGrid)) {
    return TILE.STONE;
  }

  if (!portal && isPortalCourtyardStoneTile(tiGrid, tjGrid)) {
    return TILE.STONE;
  }

  if (isThinFootpath(tiGrid, tjGrid)) {
    return TILE.PATH;
  }

  /** Allotment gardens beside homes — applied only after arterial paths so road spines keep PATH/ST tiles */
  const distPlots = Math.hypot(tiGrid + 0.5, tjGrid + 0.5);
  if (
    !portal &&
    !isPortalCourtyardStoneTile(tiGrid, tjGrid) &&
    distPlots >= 21 &&
    distPlots <= HUB_TOWN_GRASS_RADIUS + 9 &&
    HUB_GARDEN_TILE_KEYS.has(hk)
  ) {
    return hash2(tiGrid, tjGrid, 8843) > 0.61 ? TILE.FLOWERS : TILE.DARK_GRASS;
  }

  if (!portal && isPortalCourtyardStoneTile(tiGrid, tjGrid)) {
    return TILE.STONE;
  }

  // Inner clearing around the landmark tree — scattered flowers and dark grass.
  if (dist < 7) {
    const r = hash2(x, y, 44);
    if (r > 0.78) return TILE.FLOWERS;
    if (r > 0.52) return TILE.DARK_GRASS;
    return TILE.GRASS;
  }

  const campTile = getEnemyCampTile(x, y);
  if (campTile !== null) {
    return campTile;
  }

  // Village clearings: suppress forest and water.
  if (isInVillage(x, y)) {
    const biome = getBiomeForTile(x, y);
    if (biome === "desert")   return hash2(x, y, 55) > 0.94 ? TILE.FLOWERS : TILE.SAND;
    if (biome === "frost")    return hash2(x, y, 55) > 0.94 ? TILE.STONE : TILE.SNOW;
    if (biome === "ember")    return hash2(x, y, 55) > 0.94 ? TILE.STONE : TILE.DARK_GRASS;
    if (biome === "savanna")  return hash2(x, y, 55) > 0.88 ? TILE.DARK_GRASS : TILE.GRASS;
    if (biome === "tundra")   return hash2(x, y, 55) > 0.75 ? TILE.STONE : TILE.SNOW;
    if (biome === "badlands") return hash2(x, y, 55) > 0.91 ? TILE.STONE : TILE.DARK_GRASS;
    if (biome === "swamp")    return hash2(x, y, 55) > 0.90 ? TILE.STONE : TILE.DARK_GRASS;
    const r = hash2(x, y, 55);
    if (r > 0.84) return TILE.FLOWERS;
    if (r > 0.66) return TILE.DARK_GRASS;
    return TILE.GRASS;
  }

  // Procedural settlements scattered across the world.
  const settleTile = getProceduralSettlementTile(x, y);
  if (settleTile !== null) {
    return settleTile;
  }

  // Outer world noise generation — biome determined with domain-warped boundaries.
  const biome = getBiomeForTile(x, y);
  const water  = smoothNoise(x + 900, y - 200, 18, 81);
  const forest = smoothNoise(x, y, 9, 17);
  const detail = hash2(x, y, 9);

  // ── Desert: vast sand plains, rocky outcrops, rare oasis pools ──────────
  if (biome === "desert") {
    if (water > 0.86) return TILE.WATER;
    if (detail > 0.96) return TILE.STONE;
    if (detail > 0.91) return TILE.FLOWERS; // desert blooms
    return TILE.SAND;
  }

  // ── Savanna: dry open grassland transitioning to desert ─────────────────
  if (biome === "savanna") {
    if (water > 0.93) return TILE.WATER;   // rare waterholes
    if (detail > 0.97) return TILE.STONE;
    if (forest > 0.87) return TILE.TREE;   // scattered lone trees
    if (detail > 0.87) return TILE.DARK_GRASS;
    if (detail > 0.79) return TILE.FLOWERS; // dry wildflowers
    if (detail > 0.71) return TILE.SAND;   // sandy patches
    return TILE.GRASS;
  }

  // ── Frost: snow-covered pine forests, frozen lakes ───────────────────────
  if (biome === "frost") {
    if (water > 0.84) return TILE.WATER;
    if (forest > 0.72 || detail > 0.97) return TILE.TREE;
    return detail > 0.9 ? TILE.STONE : TILE.SNOW;
  }

  // ── Tundra: sparse cold plains bridging forest and frost ─────────────────
  if (biome === "tundra") {
    if (water > 0.90) return TILE.WATER;   // frozen ponds
    if (detail > 0.95) return TILE.TREE;   // sparse pines
    if (detail > 0.74) return TILE.STONE;  // exposed rock
    if (forest > 0.52) return TILE.SNOW;
    if (detail > 0.62) return TILE.SNOW;
    return TILE.GRASS; // sparse tundra grass
  }

  // ── Ember: volcanic wasteland, lava veins, scorched earth ───────────────
  if (biome === "ember") {
    if (water > 0.82 || detail > 0.96) return TILE.LAVA;
    if (forest > 0.76) return TILE.TREE;
    return forest < 0.3 ? TILE.STONE : TILE.DARK_GRASS;
  }

  // ── Badlands: rocky volcanic scrub transitioning to ember ────────────────
  if (biome === "badlands") {
    if (water > 0.90) return TILE.LAVA;    // lava pools (using water noise)
    if (detail > 0.94) return TILE.LAVA;   // lava cracks
    if (forest > 0.86) return TILE.TREE;   // dead trees
    if (detail > 0.72) return TILE.STONE;
    return TILE.DARK_GRASS;
  }

  // ── Swamp: dense murky wetlands, NW quadrant ────────────────────────────
  if (biome === "swamp") {
    if (water > 0.80) return TILE.WATER;   // broad murky pools
    if (forest > 0.78) return TILE.TREE;   // thick swamp canopy
    if (detail > 0.93) return TILE.STONE;  // mossy stones
    if (detail > 0.84) return TILE.FLOWERS; // swamp lilies
    return TILE.DARK_GRASS;
  }

  // ── Meadow: flower-rich clearings in the forest belt ────────────────────
  if (biome === "meadow") {
    return detail > 0.84 ? TILE.FLOWERS : TILE.GRASS;
  }

  // ── Forest (default) ────────────────────────────────────────────────────
  if (water > 0.82 && dist > 24) return TILE.WATER;
  if (water > 0.74 && dist > 24) return TILE.SAND;
  if (forest > 0.64 || detail > 0.94) return TILE.TREE;
  if (forest < 0.2) return TILE.DARK_GRASS;
  if (detail > 0.88) return TILE.FLOWERS;
  return TILE.GRASS;
}

function generateChunk(cx, cy) {
  const tiles = [];
  const startX = cx * CHUNK_SIZE;
  const startY = cy * CHUNK_SIZE;
  const theme = getWorldThemeAt(startX + CHUNK_SIZE / 2, startY + CHUNK_SIZE / 2);

  for (let y = 0; y < CHUNK_SIZE; y += 1) {
    for (let x = 0; x < CHUNK_SIZE; x += 1) {
      tiles.push(generateTile(startX + x, startY + y));
    }
  }

  return {
    cx,
    cy,
    size: CHUNK_SIZE,
    theme,
    tiles,
    portals: getPortalsInChunk(cx, cy),
    buildings: getBuildingsInChunk(cx, cy),
    roadsides: getRoadsideFeaturesInChunk(cx, cy),
    spaceObjects: theme === SCI_FI_THEME ? getSciFiObjectsInChunk(cx, cy) : []
  };
}

function isBlocked(x, y) {
  return BLOCKED_TILES.has(generateTile(Math.floor(x), Math.floor(y)));
}

/**
 * Circle-vs-axis-aligned rectangle (world tile units).
 * Used for slender hit volumes that corner-sampling misses.
 */
function circleIntersectsAxisRect(cx, cy, cr, minX, minY, maxX, maxY) {
  const qx = Math.max(minX, Math.min(cx, maxX));
  const qy = Math.max(minY, Math.min(cy, maxY));
  const dx = cx - qx;
  const dy = cy - qy;
  return dx * dx + dy * dy < cr * cr;
}

/**
 * Central plaza landmark tree (spawn hub): pillar + root soles only, not canopy.
 * Tile coords anchored to START_SPAWN; tuned to drawCenterTreehouse trunk base (32px tiles).
 */
const LANDMARK_SPAWN_TREE_TRUNK_BOUNDS = Object.freeze({
  minX: -0.14,
  maxX: 1.1,
  minY: 2.48,
  maxY: 3.62
});

function landmarkSpawnTreeTrunkBlocked(worldX, worldY, radius = 0.28) {
  const lx = worldX - START_SPAWN.x;
  const ly = worldY - START_SPAWN.y;
  const { minX, maxX, minY, maxY } = LANDMARK_SPAWN_TREE_TRUNK_BOUNDS;
  return circleIntersectsAxisRect(lx, ly, radius, minX, minY, maxX, maxY);
}

function isBlockedCircle(x, y, radius = 0.28) {
  if (landmarkSpawnTreeTrunkBlocked(x, y, radius)) {
    return true;
  }

  const points = [
    [x - radius, y - radius],
    [x + radius, y - radius],
    [x - radius, y + radius],
    [x + radius, y + radius]
  ];

  return points.some(([px, py]) => isBlocked(px, py));
}

function spawnPoint(index = 0) {
  // Spread players in a ring around the central tree (radius 4–5).
  const angle = index * 2.399963229728653; // golden-angle spiral
  const radius = 4 + (index % 3) * 0.6;
  return {
    x: START_SPAWN.x + Math.cos(angle) * radius,
    y: START_SPAWN.y + Math.sin(angle) * radius
  };
}

function getPortalsInChunk(cx, cy) {
  const startX = cx * CHUNK_SIZE;
  const startY = cy * CHUNK_SIZE;
  const endX = startX + CHUNK_SIZE;
  const endY = startY + CHUNK_SIZE;

  return PORTALS
    .filter((portal) => portal.x >= startX && portal.x < endX && portal.y >= startY && portal.y < endY)
    .map((portal) => ({
      id: portal.id,
      name: portal.name,
      x: portal.x,
      y: portal.y,
      targetX: portal.targetX,
      targetY: portal.targetY,
      color: portal.color,
      style: portal.style || "arch",
      previewTheme: getWorldThemeAt(portal.targetX, portal.targetY),
      preview: generatePortalPreview(portal.targetX, portal.targetY + 1, 7)
    }));
}

function getBuildingsInChunk(cx, cy) {
  const startX = cx * CHUNK_SIZE;
  const startY = cy * CHUNK_SIZE;
  const endX = startX + CHUNK_SIZE;
  const endY = startY + CHUNK_SIZE;

  const result = BUILDINGS
    .filter((b) => {
      if (b.x >= endX || b.x + b.w <= startX || b.y >= endY || b.y + b.h <= startY) {
        return false;
      }
      return !footprintHitsPortalClearance(b.x, b.y, b.w, b.h);
    })
    .map((b) => ({
      x: b.x,
      y: b.y,
      w: b.w,
      h: b.h,
      name: b.name,
      type: b.type,
      forSale: !!b.forSale,
      isPub: !!b.isPub,
      residentLabel: typeof b.residentLabel === "string" ? b.residentLabel.slice(0, 48) : undefined,
      residentSign:
        b.residentSign && typeof b.residentSign.sx === "number" && typeof b.residentSign.sy === "number"
          ? { sx: b.residentSign.sx, sy: b.residentSign.sy }
          : undefined
    }));

  const seen = new Set(result.map((b) => `${b.x},${b.y}`));
  const chunkMidX = startX + CHUNK_SIZE / 2;
  const chunkMidY = startY + CHUNK_SIZE / 2;

  for (const s of getNearbySettlements(chunkMidX, chunkMidY)) {
    for (const b of getSettlementBuildingList(s)) {
      if (b.x >= endX || b.x + b.w <= startX || b.y >= endY || b.y + b.h <= startY) continue;
      const key = `${b.x},${b.y}`;
      if (!seen.has(key)) {
        seen.add(key);
        if (!footprintHitsPortalClearance(b.x, b.y, b.w, b.h)) {
          result.push({ x: b.x, y: b.y, w: b.w, h: b.h, name: b.name, type: b.type || "hut", forSale: false });
        }
      }
    }
  }

  return result;
}

function generatePortalPreview(centerX, centerY, radius = 2) {
  const size = radius * 2 + 1;
  const tiles = [];

  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      tiles.push(generateTile(x, y));
    }
  }

  return { size, tiles };
}

module.exports = {
  CHUNK_SIZE,
  TILE,
  BUILDINGS,
  ENEMY_CAMPS,
  PORTALS,
  START_SPAWN,
  generateChunk,
  generateTile,
  getBiome,
  getWorldThemeAt,
  canAttackAt,
  getDoorTransitionAt,
  getShopFixtureAt,
  sciFiDockPortForPlayerId,
  findNearestSciFiDockPort,
  STARGATE_LANDING,
  getPortalAt,
  hash2,
  isInsideBuilding,
  isInteriorCoordinate,
  isProtectedStartingArea,
  isBlocked,
  isBlockedCircle,
  spawnPoint,
  southDoorWorldXs,
  southDoorAnchorWorldX,
  southDoorLocalXs,
  southDoorLocalCenterOffset,
  findRoadsideFeatureNear,
  PRIMARY_HUB_MOBS_CLEAR_RADIUS,
  shouldSpawnWildMobCamp,
  scaledCampEncounterSize,
  PORTAL_CLEAR_STONE_RADIUS,
  PORTAL_CAMP_CLEAR_RADIUS,
  isTooCloseToAnyPortal,
  HUB_NAV_PATH_KEYS,
  HUB_ROADSIDE_FEATURES,
  HUB_TOWN_GRASS_RADIUS,
  SCI_FI_THEME
};
