"use strict";

/**
 * Physical minigame anchors in the world — streamed in chunks like roadsides.
 * Coordinates are tile origins (footprint top-left). `world` filters visibility.
 */

const MINIGAME_SITES = Object.freeze([
  // ── Hub & fantasy ─────────────────────────────────────────────────────────
  { id: "mg_darts", gameId: "darts", world: "fantasy", x: -62, y: -36, footprintW: 2, footprintH: 2, prop: "dart_board", label: "Dart board — aim & throw" },
  { id: "mg_cards", gameId: "cards", world: "fantasy", x: -52, y: -36, footprintW: 2, footprintH: 1, prop: "card_table", label: "Card table — Balathor Hold'em" },
  { id: "mg_memory", gameId: "memory", world: "fantasy", x: -60, y: -34, footprintW: 2, footprintH: 1, prop: "card_table", label: "Memory tiles — match pairs" },
  { id: "mg_scavenger", gameId: "scavenger", world: "fantasy", x: 6, y: -72, footprintW: 2, footprintH: 2, prop: "bounty_board", label: "Wayfarer's board — biome hunt" },
  { id: "mg_training", gameId: "training", world: "fantasy", x: 42, y: -18, footprintW: 3, footprintH: 2, prop: "training_dummy", label: "Training yard — strike the dummy" },
  { id: "mg_consecration", gameId: "consecration", world: "fantasy", x: 28, y: 4, footprintW: 3, footprintH: 3, prop: "holy_ring", label: "Sanctum ring — hold the ground" },
  { id: "mg_vault", gameId: "vault", world: "fantasy", x: 18, y: -48, footprintW: 2, footprintH: 2, prop: "vault", label: "Town vault — deposit heavy coin" },
  { id: "mg_appraisal", gameId: "appraisal", world: "fantasy", x: -38, y: 8, footprintW: 2, footprintH: 2, prop: "market_stand", label: "Appraiser — guess your pack's worth" },
  { id: "mg_courier_hub", gameId: "courier", world: "fantasy", x: -4, y: -8, footprintW: 2, footprintH: 2, prop: "courier_crate", label: "Courier crate — stargate run" },
  { id: "mg_caravan_escort", gameId: "caravan_escort", world: "fantasy", x: 0, y: -118, footprintW: 2, footprintH: 2, prop: "bounty_board", label: "Caravan charter — escort contract" },
  { id: "mg_hollow", gameId: "seasonal", world: "fantasy", x: -48, y: -188, footprintW: 2, footprintH: 2, prop: "hollow_stone", label: "Hollow stone — night offering" },
  { id: "mg_trophy", gameId: "trophy", world: "fantasy", x: 14, y: -42, footprintW: 1, footprintH: 1, prop: "pedestal", label: "Trophy pedestal — display a prize" },
  { id: "mg_relay_0", gameId: "relay", world: "fantasy", x: -24, y: -8, footprintW: 1, footprintH: 1, prop: "relay_ring", label: "Town perimeter relay — Checkpoint 1/4: northwest path (solo — touch to begin)", relayIndex: 0 },
  { id: "mg_relay_1", gameId: "relay", world: "fantasy", x: 24, y: -8, footprintW: 1, footprintH: 1, prop: "relay_ring", label: "Town perimeter relay — Checkpoint 2/4: east avenue ring", relayIndex: 1 },
  { id: "mg_relay_2", gameId: "relay", world: "fantasy", x: 24, y: 32, footprintW: 1, footprintH: 1, prop: "relay_ring", label: "Town perimeter relay — Checkpoint 3/4: southeast lawn", relayIndex: 2 },
  { id: "mg_relay_3", gameId: "relay", world: "fantasy", x: -24, y: 32, footprintW: 1, footprintH: 1, prop: "relay_ring", label: "Town perimeter relay — Checkpoint 4/4: south gate (finish)", relayIndex: 3 },
  { id: "mg_swim_0", gameId: "swim", world: "fantasy", x: 108, y: 12, footprintW: 1, footprintH: 1, prop: "swim_buoy", label: "River swim trial — Buoy 1/4: east shallows (solo — swim to each buoy in order)", swimIndex: 0 },
  { id: "mg_swim_1", gameId: "swim", world: "fantasy", x: 118, y: 18, footprintW: 1, footprintH: 1, prop: "swim_buoy", label: "River swim trial — Buoy 2/4: mid channel", swimIndex: 1 },
  { id: "mg_swim_2", gameId: "swim", world: "fantasy", x: 124, y: 28, footprintW: 1, footprintH: 1, prop: "swim_buoy", label: "River swim trial — Buoy 3/4: south bend", swimIndex: 2 },
  { id: "mg_swim_3", gameId: "swim", world: "fantasy", x: 112, y: 34, footprintW: 1, footprintH: 1, prop: "swim_buoy", label: "River swim trial — Buoy 4/4: finish cove", swimIndex: 3 },
  { id: "mg_delivery", gameId: "delivery", world: "fantasy", x: -66, y: -20, footprintW: 2, footprintH: 2, prop: "courier_crate", label: "Fletcher crate — arrow delivery" },
  { id: "mg_delivery_drop", gameId: "delivery", world: "fantasy", x: 588, y: 480, footprintW: 1, footprintH: 1, prop: "relay_ring", label: "Oasis courier drop — hand off the fletcher crate here", deliveryDrop: true },

  // Camp bounty boards (one per starter camp)
  { id: "mg_camp_bracken", gameId: "camp_bounty", world: "fantasy", x: -3, y: -102, footprintW: 2, footprintH: 2, prop: "bounty_board", label: "Camp bounty — clear Bracken Post", campId: "bracken_post" },
  { id: "mg_camp_muddy", gameId: "camp_bounty", world: "fantasy", x: 90, y: -4, footprintW: 2, footprintH: 2, prop: "bounty_board", label: "Camp bounty — clear Muddy Bank", campId: "muddy_bank" },

  // Biome scavenger markers (visit via emote at ring)
  { id: "mg_visit_oasis", gameId: "scavenger", world: "fantasy", x: 588, y: 488, footprintW: 1, footprintH: 1, prop: "relay_ring", label: "Wayfarer beacon — Oasis sands (use /wave at the ring)", visitKey: "oasis" },
  { id: "mg_visit_frost", gameId: "scavenger", world: "fantasy", x: -590, y: -488, footprintW: 1, footprintH: 1, prop: "relay_ring", label: "Wayfarer beacon — Frost expanse (use /wave at the ring)", visitKey: "frost" },
  { id: "mg_visit_ember", gameId: "scavenger", world: "fantasy", x: 568, y: -512, footprintW: 1, footprintH: 1, prop: "relay_ring", label: "Wayfarer beacon — Ember coast (use /wave at the ring)", visitKey: "ember" },

  // ── Sci-fi orbital ────────────────────────────────────────────────────────
  { id: "mg_turret", gameId: "turret", world: "scifi", x: 1940, y: -8, footprintW: 3, footprintH: 3, prop: "turret_pad", label: "Defense pad — hold the line" },
  { id: "mg_asteroid", gameId: "asteroid", world: "scifi", x: 2000, y: -40, footprintW: 2, footprintH: 2, prop: "lane_beacon", label: "Asteroid lane — fly the corridor" },
  { id: "mg_courier_sci", gameId: "courier", world: "scifi", x: 1918, y: 2, footprintW: 2, footprintH: 2, prop: "courier_crate", label: "Orbital courier drop" },
  { id: "mg_dungeon_a", gameId: "tech_dungeon", world: "scifi", x: 1934, y: 14, footprintW: 1, footprintH: 1, prop: "dungeon_terminal", label: "Malfunction hatch — terminal I", dungeonIndex: 0 },
  { id: "mg_dungeon_b", gameId: "tech_dungeon", world: "scifi", x: 1906, y: -14, footprintW: 1, footprintH: 1, prop: "dungeon_terminal", label: "Malfunction hatch — terminal II", dungeonIndex: 1 },
  { id: "mg_dungeon_c", gameId: "tech_dungeon", world: "scifi", x: 1962, y: 18, footprintW: 1, footprintH: 1, prop: "dungeon_terminal", label: "Malfunction hatch — terminal III", dungeonIndex: 2 },

  // Planet Rust — mining beam pad
  { id: "mg_mining_rust", gameId: "mining", world: "planet:planet_rust", x: 5304, y: 2, footprintW: 2, footprintH: 2, prop: "mining_rig", label: "Mining rig — extract ore" }
]);

const CHUNK_SIZE = 32;

function siteTouchesChunk(site, startX, startY, endX, endY) {
  const w = Math.max(1, Math.floor(Number(site.footprintW) || 1));
  const h = Math.max(1, Math.floor(Number(site.footprintH) || 1));
  const fx0 = site.x;
  const fy0 = site.y;
  const fx1 = site.x + w;
  const fy1 = site.y + h;
  return fx1 > startX && fy1 > startY && fx0 < endX && fy0 < endY;
}

function getMinigameSitesInChunk(cx, cy) {
  const startX = cx * CHUNK_SIZE;
  const startY = cy * CHUNK_SIZE;
  const endX = startX + CHUNK_SIZE;
  const endY = startY + CHUNK_SIZE;
  const out = [];
  for (const site of MINIGAME_SITES) {
    if (siteTouchesChunk(site, startX, startY, endX, endY)) {
      out.push(site);
    }
  }
  return out;
}

/**
 * True when a tile is inside a minigame footprint (plus buffer) — blocks benches/trees.
 */
function isTileNearMinigameSite(tx, ty, worldId = "fantasy", buffer = 2) {
  const bx = Math.floor(Number(tx));
  const by = Math.floor(Number(ty));
  if (!Number.isFinite(bx) || !Number.isFinite(by)) return false;
  const pad = Math.max(0, Math.floor(Number(buffer) || 0));
  for (const site of MINIGAME_SITES) {
    if (site.world !== worldId) continue;
    const w = Math.max(1, Math.floor(Number(site.footprintW) || 1));
    const h = Math.max(1, Math.floor(Number(site.footprintH) || 1));
    if (bx >= site.x - pad && bx < site.x + w + pad && by >= site.y - pad && by < site.y + h + pad) {
      return true;
    }
  }
  return false;
}

function findMinigameSiteNear(wx, wy, radius = 2.1, worldId = "fantasy") {
  let best = null;
  let bestD = radius;
  for (const site of MINIGAME_SITES) {
    if (site.world !== worldId) continue;
    const w = Math.max(1, Math.floor(Number(site.footprintW) || 1));
    const h = Math.max(1, Math.floor(Number(site.footprintH) || 1));
    const ax = site.x + w / 2;
    const ay = site.y + h / 2;
    const d = Math.hypot(wx - ax, wy - ay);
    if (d < bestD) {
      bestD = d;
      best = site;
    }
  }
  return best;
}

module.exports = {
  MINIGAME_SITES,
  getMinigameSitesInChunk,
  findMinigameSiteNear,
  isTileNearMinigameSite
};
