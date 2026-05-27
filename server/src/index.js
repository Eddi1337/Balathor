const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { Worker } = require("node:worker_threads");
const {
  CHUNK_SIZE,
  BUILDINGS: BUILDING_LIST,
  ENEMY_CAMPS,
  canAttackAt,
  generateChunk,
  getBiome,
  getDoorTransitionAt,
  getPortalAt,
  getShopFixtureAt,
  hash2,
  isBlockedCircle,
  isSwimmingAt,
  isBlockedCircleForShip,
  getAsteroidRocks,
  setAsteroidCollisionStateResolver,
  getWorldThemeAt,
  spawnPoint,
  southDoorAnchorWorldX,
  southDoorWorldXs,
  findRoadsideFeatureNear,
  shouldSpawnWildMobCamp,
  scaledCampEncounterSize,
  PRIMARY_HUB_MOBS_CLEAR_RADIUS,
  isTooCloseToAnyPortal,
  HUB_TOWN_GRASS_RADIUS,
  sciFiDockPortForPlayerId,
  sciFiDockPortById,
  findNearestSciFiDockPort,
  sciFiStationFeatureAt,
  STARGATE_LANDING,
  isInsideSciFiSafeZone,
  getSciFiAsteroids,
  SCI_FI_STATION_CENTER,
  SCI_FI_SAFE_RADIUS,
  SCI_FI_DEFENSES,
  getPlanetById,
  getPlanetBySpacePoint,
  getPlanetsNearSpacePoint,
  planetShipSpriteRadiusTiles,
  sciFiStationById,
  proceduralAsteroidFieldsNear,
  proceduralSpaceStationsNear,
  SCI_FI_PLANETS,
  PLANET_SURFACE_LANDING_OFFSET,
  worldForPosition
} = require("./world");
const {
  updateNpcs,
  getNpcSnapshot,
  getNpcById,
  getTraderDefinitions,
  syncSoldCompanionIdsFromAccounts,
  registerCompanionSold,
  unregisterCompanionSold,
  startFloComplimentEvent,
  pickHouseCompanionComplimentLine,
  getCompanionNpcTemplate,
  pickPubDreamGirlfriendNpcId,
  getWorldTimeSnapshot,
  setWorldTimeHour,
  syncNpcHubHomesFromBuildings
} = require("./npcs");
const {
  openWorldDb,
  loadBuildingOwnership,
  upsertBuildingOwnership,
  insertGroundItem,
  deleteGroundItem,
  loadGroundItems,
  closeWorldDb,
  HOUSE_CHEST_SLOTS,
  loadHouseChestSlots,
  saveHouseChestSlots,
  getWorldDatabasePath
} = require("./worldStore");
const { createSocialSystem } = require("./social.js");
const { createMinigameSystem } = require("./minigames.js");
const { postAuthEventToDiscord, isAllowedDiscordWebhookUrl, resolveDiscordAuthWebhookUrl } = require("./discordWebhook");

// =============================
// SECTION 1: Boot, imports, env, and simulation constants
// =============================

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8080);
const ACCOUNT_STORE_PATH = process.env.ACCOUNT_STORE_PATH || path.join(__dirname, "..", "data", "accounts.json");
/** Auth notifications; env DISCORD_AUTH_WEBHOOK_URL overrides built-in default in discordWebhook.js. */
const DISCORD_AUTH_WEBHOOK_URL = resolveDiscordAuthWebhookUrl();
function readRateEnv(name, fallback, min, max) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function readIntEnv(name, fallback, min, max) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}

const TICK_RATE = readRateEnv("TICK_RATE", 60, 20, 120);
const SNAPSHOT_RATE = Math.min(TICK_RATE, readRateEnv("SNAPSHOT_RATE", 20, 5, 60));
const AI_TICK_DIVISOR = readIntEnv("AI_TICK_DIVISOR", 3, 1, 6);
const CPU_COUNT = typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length;
const CHUNK_WORKER_COUNT = readIntEnv("CHUNK_WORKERS", Math.max(1, Math.min(4, CPU_COUNT - 1)), 0, Math.max(1, CPU_COUNT));
const MAX_CONNECTED_CLIENTS = Number(process.env.MAX_CLIENTS || 500);
const LISTEN_BACKLOG = readIntEnv("LISTEN_BACKLOG", 1024, 128, 8192);
const MAX_SOCKET_BUFFER_BYTES = readIntEnv("MAX_SOCKET_BUFFER_BYTES", 1_000_000, 64_000, 16_000_000);
const IDLE_DISCONNECT_MS = readIntEnv("IDLE_DISCONNECT_MS", 30 * 60 * 1000, 60_000, 24 * 60 * 60 * 1000);
const WS_CLOSE_IDLE_TIMEOUT = 4000;
const NO_CLIENT_SIM_DELAY_MS = readIntEnv("NO_CLIENT_SIM_DELAY_MS", 1000, 100, 60_000);
const MSG_RATE_LIMIT = 240; // max messages per second per client before dropping
// Base player movement speed (tiles per second).
const PLAYER_SPEED = 5.2;
/** On-foot speed multiplier while standing on a water tile (keep in sync with client). */
const SWIM_SPEED_MULT = 0.38;
const MAX_CHUNKS_PER_REQUEST = 64;
const MAX_NAME_LENGTH = 18;
const MIN_USERNAME_LENGTH = 1;
/** Hard cap to keep account storage and hashing bounded; large enough to count as “unlimited” in practice. */
const MAX_AUTH_USERNAME_LENGTH = 8192;
const MAX_AUTH_PASSWORD_LENGTH = 8192;
const MAX_CHAT_LENGTH = 180;
const CHAT_HISTORY_LIMIT = 60;
const CHAT_COOLDOWN_MS = 800;
const CHAT_VIEW_MARGIN_TILES = 4;
/** Extra tiles beyond snapshot view union — mob AI + roam so critters/off-screen camps still simulate near players */
const MOB_ACTIVITY_MARGIN_TILES = 52;
const PLAYER_TARGET_BUCKET_SIZE = 24;
/** Always tick NPC AI across the walled hub so crowd NPCs roam even far from players. */
const NPC_HUB_AI_PAD_TILES = 125;
const PORTAL_COOLDOWN_MS = 2400;
const DOOR_COOLDOWN_MS = 600;
const HOME_COOLDOWN_MS = 2000;
const PLAYER_MAX_HP = 100;
const MOB_RESPAWN_MS = 300000; // 5 minutes
const INVENTORY_SIZE = 10;
const INTERACT_RADIUS = 1.8;
const SHOP_INTERACT_RADIUS = 1.75;
const STARTING_GOLD = 120;
const SHIP_BUY_PRICE = 850;
const SHIP_SPEED = 9.75;
const SHIP_COORD_LIMIT = 100000000;
const SHIP_WARP_APPROACH_SPEED = 26;
const SHIP_WARP_APPROACH_MS = 800;
const SHIP_WARP_JUMP_MS = 1700;
const SHIP_ORBIT_VIEW_OFFSET = 18;
const SHIP_WARP_CLEARANCE = 5;
const SHIP_DOCK_RADIUS = 4.25;
const SHIP_TURN_SPEED = 2.65;
const SHIP_REPAIR_PER_SECOND = 7;
const SHIP_STATION_INTERACT_RADIUS = 1.35;
const MAX_GROUND_ITEMS = 140;
const TRADER_INTERACT_RADIUS = 8;
const MOB_AGGRO_RADIUS = 7.5;
const MOB_ATTACK_RADIUS = 1.15;
const MOB_ATTACK_COOLDOWN_MS = 1300;
const MOB_ATTACK_DAMAGE = 13;
const BOSS_ATTACK_DAMAGE = 26;
const ENEMY_DENSITY_MULTIPLIER = readIntEnv("ENEMY_DENSITY_MULTIPLIER", 12, 1, 100);
const MOB_SPATIAL_CELL_SIZE = 32;
const MOB_SPATIAL_QUERY_PAD = 96;
const WORLD_IDS_WITH_MOBS = ["fantasy", "scifi", ...SCI_FI_PLANETS.map((planet) => `planet:${planet.id}`)];
const GATEKEEPER_IDS = Object.freeze([
  "hub_g_n",
  "hub_g_ne",
  "hub_g_e",
  "hub_g_se",
  "hub_g_s",
  "hub_g_sw",
  "hub_g_w",
  "hub_g_nw",
  "hub_g_in_n",
  "hub_g_in_e",
  "hub_g_in_s",
  "hub_g_in_w"
]);
const TOWN_ARCHER_IDS = Object.freeze([
  ...GATEKEEPER_IDS,
  ...Array.from({ length: 50 }, (_, index) => `hub_wall_archer_${index}`)
]);
const GATEKEEPER_RANGE = 20;
const GATEKEEPER_NEAR_TOWN_RADIUS = HUB_TOWN_GRASS_RADIUS + 84;
const GATEKEEPER_ATTACK_COOLDOWN_MS = 1150;
const GATEKEEPER_ARROW_DAMAGE = 34;
const TOWN_ARCHER_AMMO_LOW_WATERMARK = 8;
const TOWN_COURIER_IDS = Object.freeze(
  Array.from({ length: 50 }, (_, i) => `hub_arrow_courier_${i}`)
);
const FLETCHER_COUNT = 5;
const FLETCHER_IDS = Object.freeze(Array.from({ length: FLETCHER_COUNT }, (_, i) => `hub_fletcher_${i}`));
const FLETCHER_ARROW_STOCK_MAX = 9999;
const FLETCHER_COURIER_CARRY_MAX = 16;
const FLETCHER_QUEUE_SPACING = 1.6; // tiles between queue slots
const FANTASY_ASSAULT_INTERVAL_MS = 15000;
const SCI_FI_ASSAULT_INTERVAL_MS = 30000;
const MAX_ACTIVE_FANTASY_ASSAULT_MOBS = 128;
const MAX_ACTIVE_SCI_FI_ASSAULT_MOBS = 60;
const FANTASY_NIGHT_RAID_CAMPS_PER_WAVE = 3;
const STATION_DEFENSE_ATTACK_COOLDOWN_MS = 900;
const STATION_TURRET_DAMAGE = 42;
const ORBITAL_CANNON_DAMAGE = 82;
const NPC_SHIP_BATTLE_RANGE = 16;
const NPC_SHIP_BATTLE_SCAN_RADIUS = 26;
const NPC_SHIP_BATTLE_COOLDOWN_MS = 1250;
const CAPITAL_SHIP_SHIELD_REGEN_MS = 1800;
const CAPITAL_SHIP_SHIELD_REGEN_AMOUNT = 3;
const SCI_FI_ENCOUNTER_EVENTS = Object.freeze([
  {
    id: "distress_beacon_kestrel",
    kind: "distress",
    title: "Distress Beacon",
    x: 1748,
    y: -322,
    radius: 28,
    message: "A looping distress beacon reports raiders closing on a disabled courier."
  },
  {
    id: "derelict_helix",
    kind: "derelict",
    title: "Derelict Ship",
    x: 2128,
    y: 318,
    radius: 30,
    message: "A derelict cruiser drifts without power. Heat signatures move around the wreck."
  },
  {
    id: "blackstar_battle_line",
    kind: "battle",
    title: "Fleet Battle",
    x: 2038,
    y: -286,
    radius: 38,
    message: "Long-range sensors light up as two hostile fleets exchange fire."
  }
]);
const ZERO_G_DRIFT_SPEED_MULTIPLIER = 0.74;
const XP_BASE_TO_LEVEL = 100;
const XP_LEVEL_STEP = 55;
const STARTING_TALENT_POINTS = 1;
const STAT_IDS = ["speed", "strength", "armour", "health"];
const STAT_POINT_HP = 20;
const STAT_POINT_SPEED = 0.32;
const STAT_POINT_STRENGTH_DAMAGE = 4;
const STAT_POINT_ARMOUR_REDUCTION = 0.04;
const STAT_POINT_ARMOUR_CAP = 0.55;
const CLASS_IDS = ["ranger", "mage", "knight"];
const QUEST_INTERACT_RADIUS = 4.5;
const PROFESSION_INTERACT_RADIUS = 5.5;
const PROFESSION_DEFINITIONS = Object.freeze({
  fletching: { id: "fletching", name: "Fletching", label: "Fletching", product: "arrows", rewardGold: 12, xp: 10 },
  baking: { id: "baking", name: "Baking", label: "Baking", product: "ration loaves", rewardGold: 14, xp: 12 },
  blacksmithing: { id: "blacksmithing", name: "Blacksmithing", label: "Smithing", product: "tempered blanks", rewardGold: 18, xp: 14 },
  surveying: { id: "surveying", name: "Surveying", label: "Surveying", product: "map notes", rewardGold: 16, xp: 12 },
  prospecting: { id: "prospecting", name: "Prospecting", label: "Prospecting", product: "ore scans", rewardGold: 20, xp: 15 },
  salvaging: { id: "salvaging", name: "Salvaging", label: "Salvage", product: "usable scrap", rewardGold: 18, xp: 14 },
  server_admin: { id: "server_admin", name: "Server Admin", label: "Admin Debug", product: "clean logs", rewardGold: 22, xp: 16 }
});
const SPACE_JOB_FREIGHT_ORIGIN = Object.freeze({ x: SCI_FI_STATION_CENTER.x - 29, y: SCI_FI_STATION_CENTER.y + 21, radius: 18, name: "Ringforge Freight Deck" });
const SPACE_JOB_FREIGHT_DESTINATION = Object.freeze(sciFiStationById("station_proc_3_-2") || { id: "station_proc_3_-2", name: "Kestrel Harbor 155", x: 2750, y: -1192, radius: 34 });
const SPACE_JOB_SURVEY_DESTINATION = Object.freeze(getPlanetById("planet_proc_2_1") || { id: "planet_proc_2_1", name: "Zorara-45 Desert", x: 2383, y: 1641, radius: 58 });
const SPACE_JOB_MINING_TARGET = Object.freeze({ x: 1990, y: 290, radius: 34, name: "South Belt" });
const SPACE_JOB_SALVAGE_TARGET = Object.freeze({ x: 2128, y: 318, radius: 30, name: "Derelict Helix" });
const PLANET_AURELIA = Object.freeze(getPlanetById("planet_aurelia") || { id: "planet_aurelia", name: "Aurelia", surfaceX: 5000, surfaceY: -2600 });
const PLANET_ICEFALL = Object.freeze(getPlanetById("planet_icefall") || { id: "planet_icefall", name: "Icefall", surfaceX: 7300, surfaceY: -2600 });
const PLANET_RUST = Object.freeze(getPlanetById("planet_rust") || { id: "planet_rust", name: "Rust", surfaceX: 9600, surfaceY: -2600 });
const QUEST_DEFINITIONS = Object.freeze({
  q_town_intro_tour: {
    id: "q_town_intro_tour",
    giverId: "npc_town_guide_rin",
    title: "A Quick Look Around",
    summary: "Guide Rin can show new arrivals the useful places around the starting town: quests, crafting games, shops, the gate, and the stargate.",
    rewardGold: 18,
    rewardXp: 60,
    steps: [
      { type: "location", text: "Start at the home tree and quest givers", target: { x: -3, y: 4 }, radius: 9 },
      { type: "location", text: "Visit Pip's Bakery minigame", target: { x: -23, y: 82 }, radius: 10 },
      { type: "location", text: "Visit Ren's Forge House", target: { x: 54, y: 38 }, radius: 10 },
      { type: "location", text: "Visit a fletcher workshop for arrow making", target: { x: 28, y: 75 }, radius: 10 },
      { type: "location", text: "Visit the market stalls and shops", target: { x: 24, y: 18 }, radius: 12 },
      { type: "location", text: "Visit the north gate guard post", target: { x: 11, y: -18 }, radius: 11 },
      { type: "location", text: "Visit the stargate path", target: { x: 20, y: 0 }, radius: 12 },
      { type: "talk", text: "Return to Guide Rin", npcId: "npc_town_guide_rin", target: { x: 2, y: 6 } }
    ]
  },
  q_first_hunt: {
    id: "q_first_hunt",
    giverId: "npc_quest_wynn_hearth",
    title: "Welcome to the Hearth",
    summary: "Sage Wynn — at the home tree — offers a starter task to teach you the basics of combat.",
    rewardGold: 12,
    rewardXp: 40,
    steps: [
      { type: "kill", text: "Defeat 2 slimes near the home tree", count: 2, matchName: "slime", target: { x: 12, y: 12 } },
      { type: "talk", text: "Return to Sage Wynn at the home tree", npcId: "npc_quest_wynn_hearth", target: { x: -3, y: 4 } }
    ]
  },
  q_slime_watch: {
    id: "q_slime_watch",
    giverId: "npc_quest_elm_watch",
    title: "Slimes at the Pasture",
    summary: "Elder Elm wants the nearby slime pockets thinned before they spill into the hub lanes.",
    rewardGold: 18,
    rewardXp: 65,
    steps: [
      { type: "kill", text: "Defeat 3 slimes near the oasis road", count: 3, matchName: "slime", target: { x: 137, y: 113 } },
      { type: "talk", text: "Return to Elder Elm", npcId: "npc_quest_elm_watch", target: { x: -6, y: 7 } }
    ]
  },
  q_north_watch: {
    id: "q_north_watch",
    giverId: "npc_quest_mara_gate",
    title: "North Watch Sweep",
    summary: "Gatewarden Mara needs the north approach cleared and reported.",
    rewardGold: 24,
    rewardXp: 85,
    steps: [
      { type: "kill", text: "Defeat 4 enemies around the north post", count: 4, campId: "north_post", target: { x: 12, y: -148 } },
      { type: "talk", text: "Report back to Gatewarden Mara", npcId: "npc_quest_mara_gate", target: { x: 11, y: -18 } }
    ]
  },
  q_road_report: {
    id: "q_road_report",
    giverId: "npc_quest_mara_gate",
    title: "Market Road Report",
    summary: "Mara needs you to check in with Borin at the market before the gate can send help.",
    rewardGold: 16,
    rewardXp: 50,
    steps: [
      { type: "talk", text: "Speak with Borin Reed in the market", npcId: "npc_quest_borin_market", target: { x: 24, y: 18 } },
      { type: "talk", text: "Bring Borin's report to Gatewarden Mara", npcId: "npc_quest_mara_gate", target: { x: 11, y: -18 } }
    ]
  },
  q_briar_errand: {
    id: "q_briar_errand",
    giverId: "npc_quest_borin_market",
    title: "Briar Crate Recovery",
    summary: "Borin's missing crates are guarded by raiders past the eastern road.",
    rewardGold: 30,
    rewardXp: 105,
    steps: [
      { type: "kill", text: "Defeat 5 enemies at Hollow Band", count: 5, campId: "hollow_band", target: { x: 150, y: -110 } },
      { type: "talk", text: "Return to Borin Reed", npcId: "npc_quest_borin_market", target: { x: 24, y: 18 } }
    ]
  },
  q_wisp_sample: {
    id: "q_wisp_sample",
    giverId: "npc_quest_lira_brook",
    title: "Cold-Light Samples",
    summary: "Lira wants frost wisps dispersed so she can study the residue safely.",
    rewardGold: 34,
    rewardXp: 120,
    steps: [
      { type: "kill", text: "Defeat 3 Frost Wisps", count: 3, matchName: "frost wisp", target: { x: -150, y: -122 } },
      { type: "talk", text: "Return to Lira Brook", npcId: "npc_quest_lira_brook", target: { x: -27, y: 23 } }
    ]
  },
  q_ember_cinders: {
    id: "q_ember_cinders",
    giverId: "npc_quest_tamsin_anvil",
    title: "Cinders for the Forge",
    summary: "Tamsin needs ember imps driven back from the forge supply road.",
    rewardGold: 38,
    rewardXp: 135,
    steps: [
      { type: "kill", text: "Defeat 3 Ember Imps", count: 3, matchName: "ember imp", target: { x: 146, y: -132 } },
      { type: "talk", text: "Return to Tamsin Anvil", npcId: "npc_quest_tamsin_anvil", target: { x: 33, y: -25 } }
    ]
  },
  q_scifi_pirate_patrol: {
    id: "q_scifi_pirate_patrol",
    giverId: "npc_lyra_station",
    title: "Outer Patrol Contract",
    summary: "Dockmaster Lyra needs raider patrols cleared from the station approach lanes.",
    rewardGold: 72,
    rewardXp: 180,
    steps: [
      { type: "kill", text: "Destroy 6 pirate ships in the outer lanes", count: 6, isShipPirate: true, target: { x: 1740, y: -180 } },
      { type: "talk", text: "Report back to Dockmaster Lyra", npcId: "npc_lyra_station", target: { x: 1866, y: -34 } }
    ]
  },
  q_scifi_capital_breaker: {
    id: "q_scifi_capital_breaker",
    giverId: "npc_lyra_station",
    title: "Break the Flagship",
    summary: "A shielded capital ship is anchoring the enemy battle line beyond the station.",
    rewardGold: 140,
    rewardXp: 340,
    steps: [
      { type: "kill", text: "Destroy 1 enemy capital ship", count: 1, matchName: "capital", target: { x: 2038, y: -286 } },
      { type: "talk", text: "Return to Dockmaster Lyra", npcId: "npc_lyra_station", target: { x: 1866, y: -34 } }
    ]
  },
  q_scifi_distress_response: {
    id: "q_scifi_distress_response",
    giverId: "npc_lyra_station",
    title: "Answer the Beacon",
    summary: "A distress beacon is broadcasting from the asteroid belt north-west of Ringforge.",
    rewardGold: 96,
    rewardXp: 240,
    steps: [
      { type: "kill", text: "Destroy 4 raiders near the distress beacon", count: 4, faction: "pirate_distress", target: { x: 1748, y: -322 } },
      { type: "talk", text: "Confirm the response with Dockmaster Lyra", npcId: "npc_lyra_station", target: { x: 1866, y: -34 } }
    ]
  },
  q_scifi_space_trucker: {
    id: "q_scifi_space_trucker",
    giverId: "npc_lyra_station",
    title: "Space Trucker: Sealed Freight",
    summary: `Move sealed station freight from Ringforge to ${SPACE_JOB_FREIGHT_DESTINATION.name}.`,
    rewardGold: 160,
    rewardXp: 260,
    steps: [
      { type: "location", text: "Load sealed cargo at Ringforge Freight Deck", target: SPACE_JOB_FREIGHT_ORIGIN, radius: SPACE_JOB_FREIGHT_ORIGIN.radius },
      { type: "location", text: `Deliver cargo to ${SPACE_JOB_FREIGHT_DESTINATION.name}`, target: { x: SPACE_JOB_FREIGHT_DESTINATION.x, y: SPACE_JOB_FREIGHT_DESTINATION.y }, radius: 42 },
      { type: "talk", text: "File the delivery receipt with Dockmaster Lyra", npcId: "npc_lyra_station", target: { x: 1866, y: -34 } }
    ]
  },
  q_scifi_survey_world: {
    id: "q_scifi_survey_world",
    giverId: "npc_lyra_station",
    title: "Survey Job: New Horizon",
    summary: `Run a scan pass near ${SPACE_JOB_SURVEY_DESTINATION.name} for the station cartographers.`,
    rewardGold: 120,
    rewardXp: 230,
    steps: [
      { type: "location", text: `Reach orbit of ${SPACE_JOB_SURVEY_DESTINATION.name}`, target: { x: SPACE_JOB_SURVEY_DESTINATION.x, y: SPACE_JOB_SURVEY_DESTINATION.y }, radius: Math.max(70, Number(SPACE_JOB_SURVEY_DESTINATION.radius) + 16) },
      { type: "talk", text: "Report the survey data to Dockmaster Lyra", npcId: "npc_lyra_station", target: { x: 1866, y: -34 } }
    ]
  },
  q_scifi_mining_run: {
    id: "q_scifi_mining_run",
    giverId: "npc_lyra_station",
    title: "Prospector Job: South Belt",
    summary: "Prospect the mineral-rich asteroid belt and bring the scan ledger home.",
    rewardGold: 110,
    rewardXp: 210,
    steps: [
      { type: "location", text: "Hold position in the South Belt long enough to scan ore signatures", target: { x: SPACE_JOB_MINING_TARGET.x, y: SPACE_JOB_MINING_TARGET.y }, radius: SPACE_JOB_MINING_TARGET.radius },
      { type: "talk", text: "Return the prospecting ledger to Dockmaster Lyra", npcId: "npc_lyra_station", target: { x: 1866, y: -34 } }
    ]
  },
  q_scifi_salvage_sweep: {
    id: "q_scifi_salvage_sweep",
    giverId: "npc_lyra_station",
    title: "Salvage Job: Derelict Sweep",
    summary: "Check the derelict cruiser field and mark anything worth towing.",
    rewardGold: 130,
    rewardXp: 240,
    steps: [
      { type: "location", text: "Sweep the Derelict Helix field", target: { x: SPACE_JOB_SALVAGE_TARGET.x, y: SPACE_JOB_SALVAGE_TARGET.y }, radius: SPACE_JOB_SALVAGE_TARGET.radius },
      { type: "talk", text: "Bring the salvage markers back to Dockmaster Lyra", npcId: "npc_lyra_station", target: { x: 1866, y: -34 } }
    ]
  },
  q_wild_swamp_trace: {
    id: "q_wild_swamp_trace",
    giverId: "npc_quest_iona_swamp",
    title: "Boglight Trail",
    summary: "Iona wants the swamp paths checked before night raiders use them.",
    rewardGold: 52,
    rewardXp: 170,
    steps: [
      { type: "kill", text: "Defeat 4 swamp creatures near the bog trail", count: 4, biome: "swamp", target: { x: -320, y: 290 } },
      { type: "location", text: "Inspect the old bog marker", target: { x: -334, y: 304 }, radius: 12 },
      { type: "talk", text: "Report back to Iona Marsh", npcId: "npc_quest_iona_swamp", target: { x: -250, y: 248 } }
    ]
  },
  q_wild_dune_bones: {
    id: "q_wild_dune_bones",
    giverId: "npc_quest_orren_dunes",
    title: "Bones in the Glass Dunes",
    summary: "Orren needs the desert camp disrupted before it finds the caravan road.",
    rewardGold: 58,
    rewardXp: 190,
    steps: [
      { type: "kill", text: "Defeat 5 desert enemies", count: 5, biome: "desert", target: { x: 450, y: 385 } },
      { type: "talk", text: "Return to Orren Sandglass", npcId: "npc_quest_orren_dunes", target: { x: 376, y: 334 } }
    ]
  },
  q_wild_frost_signal: {
    id: "q_wild_frost_signal",
    giverId: "npc_quest_vaela_frost",
    title: "Signal Under Snow",
    summary: "Vaela hears a pattern under the frost road and wants the source quieted.",
    rewardGold: 62,
    rewardXp: 205,
    steps: [
      { type: "kill", text: "Defeat 4 frost enemies", count: 4, biome: "frost", target: { x: -450, y: -365 } },
      { type: "location", text: "Stand by the buried signal stone", target: { x: -462, y: -352 }, radius: 12 },
      { type: "talk", text: "Return to Vaela Snowmend", npcId: "npc_quest_vaela_frost", target: { x: -366, y: -318 } }
    ]
  },
  q_space_nav_beacons: {
    id: "q_space_nav_beacons",
    giverId: "npc_orin_station",
    title: "Beacon Calibration",
    summary: "Navigator Orin needs three deep-space beacon passes logged.",
    rewardGold: 150,
    rewardXp: 260,
    steps: [
      { type: "location", text: "Sweep the Northeast Cluster beacon", target: { x: 2290, y: -370 }, radius: 42 },
      { type: "location", text: "Sweep the Rim Fragment beacon", target: { x: 1920, y: -510 }, radius: 42 },
      { type: "talk", text: "Upload the route to Navigator Orin", npcId: "npc_orin_station", target: { x: 1920, y: -46 } }
    ]
  },
  q_space_medgel_run: {
    id: "q_space_medgel_run",
    giverId: "npc_sera_station",
    title: "Medgel Under Fire",
    summary: "Medic Sera wants raiders cleared from a medical courier route.",
    rewardGold: 132,
    rewardXp: 245,
    steps: [
      { type: "kill", text: "Destroy 5 pirate ships near the courier lane", count: 5, isShipPirate: true, target: { x: 1582, y: 372 } },
      { type: "talk", text: "Confirm the route with Medic Sera", npcId: "npc_sera_station", target: { x: 1866, y: 18 } }
    ]
  },
  q_space_quartermaster_manifest: {
    id: "q_space_quartermaster_manifest",
    giverId: "npc_tess_station",
    title: "Lost Manifest",
    summary: "Quartermaster Tess lost a manifest near the salvage field.",
    rewardGold: 118,
    rewardXp: 225,
    steps: [
      { type: "location", text: "Scan the salvage crates near Derelict Helix", target: { x: SPACE_JOB_SALVAGE_TARGET.x, y: SPACE_JOB_SALVAGE_TARGET.y }, radius: SPACE_JOB_SALVAGE_TARGET.radius },
      { type: "talk", text: "Bring the manifest back to Quartermaster Tess", npcId: "npc_tess_station", target: { x: 1974, y: 18 } }
    ]
  },
  q_planet_aurelia_spores: {
    id: "q_planet_aurelia_spores",
    giverId: "npc_planet_guide_planet_aurelia",
    title: "Aurelia Spore Count",
    summary: "The Aurelia guide needs aggressive bloom predators cleared from the landing grove.",
    rewardGold: 86,
    rewardXp: 210,
    steps: [
      { type: "kill", text: "Defeat 5 Aurelia predators", count: 5, faction: "planet_lush", target: { x: PLANET_AURELIA.surfaceX + 42, y: PLANET_AURELIA.surfaceY + 28 } },
      { type: "talk", text: "Return to the Aurelia guide", npcId: "npc_planet_guide_planet_aurelia", target: { x: PLANET_AURELIA.surfaceX + 16, y: PLANET_AURELIA.surfaceY + 10 } }
    ]
  },
  q_planet_icefall_shards: {
    id: "q_planet_icefall_shards",
    giverId: "npc_planet_guide_planet_icefall",
    title: "Icefall Shardline",
    summary: "Icefall locals need the crystal trail made safe.",
    rewardGold: 92,
    rewardXp: 230,
    steps: [
      { type: "kill", text: "Defeat 4 shard creatures", count: 4, faction: "planet_ice", target: { x: PLANET_ICEFALL.surfaceX - 56, y: PLANET_ICEFALL.surfaceY + 30 } },
      { type: "location", text: "Check the blue shardline", target: { x: PLANET_ICEFALL.surfaceX - 70, y: PLANET_ICEFALL.surfaceY + 42 }, radius: 14 },
      { type: "talk", text: "Return to the Icefall guide", npcId: "npc_planet_guide_planet_icefall", target: { x: PLANET_ICEFALL.surfaceX + 19, y: PLANET_ICEFALL.surfaceY + 8 } }
    ]
  },
  q_planet_rust_relay: {
    id: "q_planet_rust_relay",
    giverId: "npc_planet_guide_planet_rust",
    title: "Rust Relay Bones",
    summary: "The Rust guide wants an old relay ridge scanned and secured.",
    rewardGold: 96,
    rewardXp: 240,
    steps: [
      { type: "location", text: "Scan the relay ridge on Rust", target: { x: PLANET_RUST.surfaceX + 88, y: PLANET_RUST.surfaceY - 44 }, radius: 16 },
      { type: "kill", text: "Defeat 4 desert lifeforms near the relay", count: 4, faction: "planet_desert", target: { x: PLANET_RUST.surfaceX + 88, y: PLANET_RUST.surfaceY - 44 } },
      { type: "talk", text: "Return to the Rust guide", npcId: "npc_planet_guide_planet_rust", target: { x: PLANET_RUST.surfaceX + 22, y: PLANET_RUST.surfaceY + 6 } }
    ]
  }
});

const SERVER_TALENT_TREES = {
  mage: [
    ["fireball","fire_nova","inferno"],
    ["ice_shard","frost_barrier","blizzard"],
    ["arcane_bolt","mana_shield","time_warp"]
  ],
  knight: [
    ["shield_bash","divine_shield","fortify"],
    ["holy_strike","consecration","divine_wrath"],
    ["healing_aura","lay_on_hands","battle_cry"]
  ],
  ranger: [
    ["precise_shot","piercing_arrow","rain_of_arrows"],
    ["caltrops","evasion","camouflage"],
    ["multishot","smoke_bomb","volley"]
  ]
};
const TORSO_STYLE_IDS = ["tunic", "armor", "robe"];
const WEAPON_STYLE_IDS = ["classic", "heavy", "ornate"];
const CLASS_LOADOUTS = Object.freeze({
  ranger: {
    weapon: "bow",
    kind: "projectile",
    projectileKind: "arrow",
    cooldownMs: 560,
    range: 15,
    arc: Math.PI * 0.34,
    damage: 28
  },
  mage: {
    weapon: "staff",
    kind: "projectile",
    projectileKind: "fireball",
    cooldownMs: 780,
    range: 29,
    arc: Math.PI * 0.42,
    damage: 17
  },
  knight: {
    weapon: "sword_shield",
    kind: "swing",
    projectileKind: null,
    cooldownMs: 420,
    range: 2.1,
    arc: Math.PI * 0.72,
    damage: 22
  }
});
const KNIGHT_SHIELD_ARC = Math.PI * 0.72;
const KNIGHT_SHIELD_DAMAGE_MULTIPLIER = 0.45;
const BLOCK_CHANCE_BY_RARITY = Object.freeze({
  common: 0.20,
  uncommon: 0.28,
  rare: 0.36,
  epic: 0.45,
  legendary: 0.62,
  mythic: 0.72
});
let consecrationZones = [];
const CONSECRATION_DURATION_MS = 5000;
const CONSECRATION_TICK_MS = 500;
const MOB_TYPES = Object.freeze({
  swamp: {
    enemies: [
      { name: "Bog Crawler",  level: 3, hp: 58,  damage: 10, speed: 1.5 },
      { name: "Marsh Wisp",   level: 4, hp: 50,  damage: 12, speed: 2.1 },
      { name: "Mire Lurker",  level: 5, hp: 72,  damage: 13, speed: 1.4 },
      { name: "Swamp Troll",  level: 6, hp: 98,  damage: 16, speed: 1.3 },
    ],
    primary: "#4a7a58",
    accent:  "#b8ffcc",
    bossName:  "Bogfather",
    bossLevel: 10,
    bossPrimary: "#2a4a38",
    bossAccent:  "#78ffb0"
  },
  savanna: {
    enemies: [
      { name: "Dust Jackal",   level: 4, hp: 62,  damage: 11, speed: 2.1 },
      { name: "Prairie Gnoll", level: 5, hp: 74,  damage: 13, speed: 1.85 },
      { name: "Brush Marauder",level: 6, hp: 82,  damage: 15, speed: 1.75 },
      { name: "Dry Plains Ogre",level: 7, hp: 104, damage: 17, speed: 1.4 },
    ],
    primary: "#b8933a",
    accent:  "#f5e6b0",
    bossName:  "Plains Warlord",
    bossLevel: 11,
    bossPrimary: "#8a6a2a",
    bossAccent:  "#ffe080"
  },
  tundra: {
    enemies: [
      { name: "Frost Wraith",  level: 6, hp: 68,  damage: 14, speed: 1.95 },
      { name: "Ice Gnawer",    level: 7, hp: 84,  damage: 16, speed: 1.55 },
      { name: "Tundra Brute",  level: 8, hp: 102, damage: 18, speed: 1.4 },
      { name: "Pale Stalker",  level: 9, hp: 90,  damage: 20, speed: 1.8 },
    ],
    primary: "#8ac8e8",
    accent:  "#e8f6ff",
    bossName:  "Frost Colossus",
    bossLevel: 13,
    bossPrimary: "#5898c8",
    bossAccent:  "#c0f0ff"
  },
  badlands: {
    enemies: [
      { name: "Char Fiend",    level: 7, hp: 80,  damage: 17, speed: 1.85 },
      { name: "Scorchling",    level: 8, hp: 96,  damage: 19, speed: 1.7 },
      { name: "Ash Marauder",  level: 9, hp: 114, damage: 21, speed: 1.6 },
      { name: "Cinder Ogre",   level: 10, hp: 130, damage: 23, speed: 1.45 },
    ],
    primary: "#c05a35",
    accent:  "#ffb870",
    bossName:  "Infernal Warden",
    bossLevel: 14,
    bossPrimary: "#902a18",
    bossAccent:  "#ffdf60"
  },
  forest: {
    enemies: [
      { name: "Forest Goblin", level: 1, hp: 48, damage: 8, speed: 1.7 },
      { name: "Bramble Imp", level: 2, hp: 54, damage: 9, speed: 1.8 },
      { name: "Moss Gnawer", level: 3, hp: 62, damage: 10, speed: 1.6 },
      { name: "Thorn Stalker", level: 4, hp: 70, damage: 12, speed: 1.9 },
    ],
    primary: "#4f9f5f",
    accent: "#d8f0a0",
    bossName: "Bramble Chief",
    bossLevel: 8,
    bossPrimary: "#3f7f44",
    bossAccent: "#ffd166"
  },
  meadow: {
    enemies: [
      { name: "Meadow Pest", level: 1, hp: 42, damage: 7, speed: 2.0 },
      { name: "Field Imp", level: 2, hp: 50, damage: 9, speed: 1.85 },
      { name: "Thistle Sprite", level: 3, hp: 46, damage: 11, speed: 2.15 },
      { name: "Clover Raider", level: 4, hp: 68, damage: 12, speed: 1.7 },
    ],
    primary: "#79b85a",
    accent: "#fff0a8",
    bossName: "Thistle Matron",
    bossLevel: 8,
    bossPrimary: "#6d9540",
    bossAccent: "#f7c95f"
  },
  desert: {
    enemies: [
      { name: "Sand Slime", level: 5, hp: 76, damage: 13, speed: 1.45 },
      { name: "Dust Imp", level: 6, hp: 68, damage: 15, speed: 1.9 },
      { name: "Clay Crawler", level: 7, hp: 92, damage: 16, speed: 1.35 },
      { name: "Dune Raider", level: 8, hp: 86, damage: 18, speed: 1.8 },
    ],
    primary: "#c7904f",
    accent: "#ffe0a0",
    bossName: "Dune Brute",
    bossLevel: 13,
    bossPrimary: "#9f6935",
    bossAccent: "#ffd06a"
  },
  frost: {
    enemies: [
      { name: "Frost Wisp", level: 7, hp: 72, damage: 16, speed: 2.05 },
      { name: "Snow Gnawer", level: 8, hp: 94, damage: 17, speed: 1.45 },
      { name: "Ice Sprite", level: 9, hp: 78, damage: 19, speed: 2.1 },
      { name: "Rime Guard", level: 10, hp: 110, damage: 20, speed: 1.55 },
    ],
    primary: "#88d8ff",
    accent: "#f0fbff",
    bossName: "Rime Lord",
    bossLevel: 15,
    bossPrimary: "#5da8d8",
    bossAccent: "#ffffff"
  },
  ember: {
    enemies: [
      { name: "Ember Imp", level: 9, hp: 84, damage: 19, speed: 1.95 },
      { name: "Ash Crawler", level: 10, hp: 116, damage: 20, speed: 1.4 },
      { name: "Cinderling", level: 11, hp: 92, damage: 22, speed: 2.0 },
      { name: "Charred Knight", level: 12, hp: 132, damage: 24, speed: 1.55 },
    ],
    primary: "#d85b35",
    accent: "#ffd06a",
    bossName: "Cinder Brute",
    bossLevel: 17,
    bossPrimary: "#a43b2b",
    bossAccent: "#ffdf7a"
  },
  bandit: {
    enemies: [
      { name: "Cutpurse",      level: 4, hp: 95,  damage: 15, speed: 1.9  },
      { name: "Brigand",       level: 5, hp: 115, damage: 18, speed: 1.75 },
      { name: "Outlaw",        level: 6, hp: 130, damage: 21, speed: 1.7  },
      { name: "Sellsword",     level: 8, hp: 155, damage: 25, speed: 1.65 },
    ],
    primary: "#4a3f5e",
    accent:  "#c0b8e0",
    bossName:  "Bandit Warlord",
    bossLevel: 12,
    bossPrimary: "#2d1f3e",
    bossAccent:  "#e8c060"
  },
  dragon: {
    enemies: [
      { name: "Whelpling",     level: 10, hp: 190, damage: 32, speed: 1.6  },
      { name: "Drake",         level: 12, hp: 250, damage: 40, speed: 1.5  },
      { name: "Drake Warden",  level: 14, hp: 310, damage: 48, speed: 1.45 },
      { name: "Ancient Drake", level: 16, hp: 380, damage: 58, speed: 1.4  },
    ],
    primary: "#8b1a1a",
    accent:  "#ffd700",
    bossName:  "Elder Dragon",
    bossLevel: 20,
    bossPrimary: "#5a0808",
    bossAccent:  "#ff9900"
  },
  undead: {
    enemies: [
      { name: "Skeleton",      level: 3, hp: 62,  damage: 11, speed: 1.65 },
      { name: "Grave Walker",  level: 4, hp: 78,  damage: 14, speed: 1.5  },
      { name: "Bone Archer",   level: 5, hp: 70,  damage: 17, speed: 1.55 },
      { name: "Wight",         level: 7, hp: 108, damage: 21, speed: 1.4  },
    ],
    primary: "#c8c8b4",
    accent:  "#8b2fb8",
    bossName:  "Lich King",
    bossLevel: 13,
    bossPrimary: "#d4d4c0",
    bossAccent:  "#c060ff"
  },
  demon: {
    enemies: [
      { name: "Fiend",         level: 8,  hp: 148, damage: 27, speed: 1.7  },
      { name: "Hellspawn",     level: 10, hp: 185, damage: 33, speed: 1.65 },
      { name: "Pit Demon",     level: 12, hp: 228, damage: 40, speed: 1.6  },
      { name: "Void Reaver",   level: 14, hp: 272, damage: 47, speed: 1.55 },
    ],
    primary: "#1a0a2e",
    accent:  "#ff5500",
    bossName:  "Demon Lord",
    bossLevel: 18,
    bossPrimary: "#0d0518",
    bossAccent:  "#ff2200"
  },
  golem: {
    enemies: [
      { name: "Stone Hulk",    level: 12, hp: 285, damage: 44, speed: 1.2  },
      { name: "Iron Golem",    level: 14, hp: 345, damage: 52, speed: 1.1  },
      { name: "Void Construct",level: 16, hp: 405, damage: 60, speed: 1.05 },
      { name: "Titan Shard",   level: 18, hp: 465, damage: 68, speed: 1.0  },
    ],
    primary: "#5a5a6e",
    accent:  "#00ffcc",
    bossName:  "Stone Colossus",
    bossLevel: 22,
    bossPrimary: "#3a3a4e",
    bossAccent:  "#00ffff"
  },
  lush: {
    enemies: [
      { name: "Vineclaw Stalker", level: 8, hp: 96, damage: 18, speed: 1.9 },
      { name: "Bloommaw", level: 9, hp: 112, damage: 21, speed: 1.6 },
      { name: "Sporeback Runner", level: 10, hp: 102, damage: 22, speed: 2.0 },
      { name: "Petal Ripper", level: 11, hp: 124, damage: 24, speed: 1.7 },
    ],
    primary: "#3aa46c",
    accent: "#daf7b0",
    bossName: "Canopy Devourer",
    bossLevel: 15,
    bossPrimary: "#1d6f48",
    bossAccent: "#b7ff8d"
  },
  ice: {
    enemies: [
      { name: "Shard Hound", level: 9, hp: 104, damage: 20, speed: 1.8 },
      { name: "Cryo Mite Swarm", level: 10, hp: 88, damage: 22, speed: 2.15 },
      { name: "Glacier Prowler", level: 11, hp: 128, damage: 24, speed: 1.55 },
      { name: "Rift Howler", level: 12, hp: 138, damage: 26, speed: 1.7 },
    ],
    primary: "#9fd8ff",
    accent: "#f8fdff",
    bossName: "Ice Maw Regent",
    bossLevel: 16,
    bossPrimary: "#4da3dd",
    bossAccent: "#ffffff"
  },
  volcanic: {
    enemies: [
      { name: "Magma Skitter", level: 10, hp: 108, damage: 23, speed: 1.9 },
      { name: "Cinderjaw", level: 11, hp: 132, damage: 25, speed: 1.6 },
      { name: "Basalt Horror", level: 12, hp: 154, damage: 28, speed: 1.35 },
      { name: "Ashwing Hunter", level: 13, hp: 118, damage: 29, speed: 1.95 },
    ],
    primary: "#ef4444",
    accent: "#fb923c",
    bossName: "Molten Spine Tyrant",
    bossLevel: 17,
    bossPrimary: "#7f1d1d",
    bossAccent: "#ffb347"
  },
  ocean: {
    enemies: [
      { name: "Tide Raker", level: 8, hp: 92, damage: 18, speed: 2.0 },
      { name: "Coral Fang", level: 9, hp: 110, damage: 21, speed: 1.75 },
      { name: "Brine Leaper", level: 10, hp: 98, damage: 22, speed: 2.1 },
      { name: "Shellcrusher", level: 11, hp: 136, damage: 24, speed: 1.45 },
    ],
    primary: "#2bb3ff",
    accent: "#a0e7ff",
    bossName: "Abyssal Waveback",
    bossLevel: 15,
    bossPrimary: "#0b5a8f",
    bossAccent: "#d2f8ff"
  },
  jungle: {
    enemies: [
      { name: "Needle Ape", level: 9, hp: 106, damage: 20, speed: 1.95 },
      { name: "Glowtooth Creeper", level: 10, hp: 116, damage: 22, speed: 1.85 },
      { name: "Razor Fern Beast", level: 11, hp: 138, damage: 25, speed: 1.6 },
      { name: "Canopy Lancer", level: 12, hp: 126, damage: 27, speed: 1.9 },
    ],
    primary: "#16a34a",
    accent: "#86efac",
    bossName: "Emerald Spinecaller",
    bossLevel: 16,
    bossPrimary: "#14532d",
    bossAccent: "#bbf7d0"
  },
  crystal: {
    enemies: [
      { name: "Prism Skitter", level: 10, hp: 102, damage: 22, speed: 2.0 },
      { name: "Facet Hound", level: 11, hp: 126, damage: 24, speed: 1.75 },
      { name: "Resonance Wraith", level: 12, hp: 118, damage: 27, speed: 1.95 },
      { name: "Shard Colossling", level: 13, hp: 152, damage: 29, speed: 1.45 },
    ],
    primary: "#a78bfa",
    accent: "#ddd6fe",
    bossName: "Prism Crown Behemoth",
    bossLevel: 18,
    bossPrimary: "#6d28d9",
    bossAccent: "#f5f3ff"
  },
  fungal: {
    enemies: [
      { name: "Spore Husher", level: 8, hp: 98, damage: 19, speed: 1.85 },
      { name: "Myco Pouncer", level: 9, hp: 112, damage: 21, speed: 1.9 },
      { name: "Rotcap Bulker", level: 10, hp: 142, damage: 24, speed: 1.45 },
      { name: "Hypha Stinger", level: 11, hp: 120, damage: 25, speed: 1.8 },
    ],
    primary: "#d946ef",
    accent: "#fbcfe8",
    bossName: "Queen of Mold",
    bossLevel: 15,
    bossPrimary: "#86198f",
    bossAccent: "#f5d0fe"
  },
  barren: {
    enemies: [
      { name: "Dust Gnawer", level: 9, hp: 108, damage: 20, speed: 1.8 },
      { name: "Slate Stalker", level: 10, hp: 126, damage: 23, speed: 1.7 },
      { name: "Rubble Mauler", level: 11, hp: 150, damage: 26, speed: 1.4 },
      { name: "Hollow Scree Beast", level: 12, hp: 136, damage: 27, speed: 1.55 },
    ],
    primary: "#64748b",
    accent: "#cbd5e1",
    bossName: "Gravemound Titan",
    bossLevel: 16,
    bossPrimary: "#334155",
    bossAccent: "#e2e8f0"
  },
  toxic: {
    enemies: [
      { name: "Caustic Hopper", level: 10, hp: 104, damage: 23, speed: 2.05 },
      { name: "Venom Bloom", level: 11, hp: 132, damage: 25, speed: 1.55 },
      { name: "Sludge Manta", level: 12, hp: 120, damage: 27, speed: 1.85 },
      { name: "Acidback Drifter", level: 13, hp: 146, damage: 30, speed: 1.6 },
    ],
    primary: "#84cc16",
    accent: "#d9f99d",
    bossName: "Blight Lung Sovereign",
    bossLevel: 17,
    bossPrimary: "#365314",
    bossAccent: "#ecfccb"
  },
  aether: {
    enemies: [
      { name: "Phase Lynx", level: 10, hp: 100, damage: 22, speed: 2.1 },
      { name: "Halo Drifter", level: 11, hp: 116, damage: 24, speed: 1.95 },
      { name: "Skyglass Seraph", level: 12, hp: 138, damage: 27, speed: 1.65 },
      { name: "Null Ray", level: 13, hp: 124, damage: 29, speed: 2.0 },
    ],
    primary: "#22d3ee",
    accent: "#cffafe",
    bossName: "Aether Choir Beast",
    bossLevel: 18,
    bossPrimary: "#155e75",
    bossAccent: "#ecfeff"
  },
  ashland: {
    enemies: [
      { name: "Ash Prowler", level: 9, hp: 110, damage: 21, speed: 1.85 },
      { name: "Cairn Hound", level: 10, hp: 128, damage: 24, speed: 1.7 },
      { name: "Soothide Rammer", level: 11, hp: 146, damage: 26, speed: 1.5 },
      { name: "Emberbone Lurker", level: 12, hp: 134, damage: 28, speed: 1.65 },
    ],
    primary: "#a8a29e",
    accent: "#f5f5f4",
    bossName: "Ashfall Leviathan",
    bossLevel: 16,
    bossPrimary: "#44403c",
    bossAccent: "#fafaf9"
  }
});
const WILDERNESS_BOSSES = Object.freeze([
  { id: "lone_stag",     x: -320, y:   35,  biome: "forest",   name: "Old Rootback" },
  { id: "glass_dune",    x:  450, y:  385,  biome: "desert",   name: "Glasshide" },
  { id: "white_pine",    x: -450, y: -365,  biome: "frost",    name: "Whitepine Warden" },
  { id: "red_crag",      x:  425, y: -390,  biome: "ember",    name: "Red Crag" },
  { id: "bogfather",     x: -320, y:  290,  biome: "swamp",    name: "The Bogfather" },
  { id: "plains_reaver", x:  285, y:  210,  biome: "savanna",  name: "Plains Reaver" },
  { id: "frost_herald",  x: -285, y: -215,  biome: "tundra",   name: "Frost Herald" },
  { id: "scar_warden",   x:  275, y: -215,  biome: "badlands", name: "Scar Warden" },
]);

const CRITTER_CELL = 26;

const CRITTERS_BY_BIOME = Object.freeze({
  swamp: [
    { name: "Mud Frog",      maxHp: 10, primary: "#5a7a60", accent: "#c8f0c0", speed: 2.0 },
    { name: "Bog Newt",      maxHp: 8,  primary: "#6a8870", accent: "#d0e8c0", speed: 1.85 },
    { name: "Reed Warbler",  maxHp: 7,  primary: "#7a9060", accent: "#e8f0d0", speed: 2.3 },
    { name: "Swamp Hare",    maxHp: 12, primary: "#785a48", accent: "#d0c8b0", speed: 2.5 }
  ],
  savanna: [
    { name: "Dust Rabbit",   maxHp: 12, primary: "#c8a870", accent: "#f8f0d8", speed: 2.8 },
    { name: "Prairie Dog",   maxHp: 10, primary: "#a08860", accent: "#e8dcc0", speed: 2.4 },
    { name: "Scrub Jay",     maxHp: 7,  primary: "#8080a0", accent: "#d8dce8", speed: 2.2 },
    { name: "Plains Vole",   maxHp: 9,  primary: "#a09078", accent: "#e8e0c8", speed: 2.35 }
  ],
  tundra: [
    { name: "Arctic Hare",   maxHp: 14, primary: "#d0d8e8", accent: "#f8fcff", speed: 2.6 },
    { name: "Tundra Vole",   maxHp: 9,  primary: "#a0a8b8", accent: "#e8ecf4", speed: 2.2 },
    { name: "Snowy Bunting", maxHp: 7,  primary: "#b8c4d0", accent: "#f4f8ff", speed: 2.45 },
    { name: "Frost Shrew",   maxHp: 8,  primary: "#9098a8", accent: "#e0e8f0", speed: 2.3 }
  ],
  badlands: [
    { name: "Scorch Lizard", maxHp: 11, primary: "#8a5a40", accent: "#ffb888", speed: 2.1 },
    { name: "Char Mouse",    maxHp: 9,  primary: "#6a6058", accent: "#d8d0c8", speed: 2.45 },
    { name: "Cinder Skink",  maxHp: 12, primary: "#7a5048", accent: "#ffa878", speed: 1.9 },
    { name: "Ash Sparrow",   maxHp: 7,  primary: "#787070", accent: "#d0ccc8", speed: 2.3 }
  ],
  lush: [
    { name: "Glow Hare", maxHp: 12, primary: "#5ccf84", accent: "#daf7b0", speed: 2.7 },
    { name: "Petal Moth", maxHp: 7, primary: "#7bd389", accent: "#fff7d6", speed: 2.4 },
    { name: "Moss Pup", maxHp: 13, primary: "#2f855a", accent: "#bbf7d0", speed: 2.55 }
  ],
  ice: [
    { name: "Frost Nibbler", maxHp: 10, primary: "#9fd8ff", accent: "#f8fdff", speed: 2.35 },
    { name: "Shard Finch", maxHp: 7, primary: "#bfe9ff", accent: "#ffffff", speed: 2.5 },
    { name: "Snow Paddler", maxHp: 12, primary: "#8ecae6", accent: "#e0fbff", speed: 2.2 }
  ],
  volcanic: [
    { name: "Cinder Mite", maxHp: 9, primary: "#ef4444", accent: "#fb923c", speed: 2.25 },
    { name: "Ash Beetle", maxHp: 11, primary: "#7f1d1d", accent: "#fdba74", speed: 2.0 },
    { name: "Lava Skipper", maxHp: 10, primary: "#b91c1c", accent: "#fecaca", speed: 2.3 }
  ],
  ocean: [
    { name: "Foam Hopper", maxHp: 11, primary: "#2bb3ff", accent: "#a0e7ff", speed: 2.55 },
    { name: "Tide Mouse", maxHp: 9, primary: "#38bdf8", accent: "#e0f2fe", speed: 2.25 },
    { name: "Coral Peep", maxHp: 8, primary: "#0ea5e9", accent: "#fef3c7", speed: 2.4 }
  ],
  jungle: [
    { name: "Canopy Skipper", maxHp: 12, primary: "#16a34a", accent: "#86efac", speed: 2.75 },
    { name: "Fern Mouse", maxHp: 9, primary: "#166534", accent: "#dcfce7", speed: 2.4 },
    { name: "Bloom Drakelet", maxHp: 13, primary: "#22c55e", accent: "#fef9c3", speed: 2.35 }
  ],
  crystal: [
    { name: "Prism Hopper", maxHp: 10, primary: "#a78bfa", accent: "#ddd6fe", speed: 2.5 },
    { name: "Facet Finch", maxHp: 8, primary: "#8b5cf6", accent: "#f5f3ff", speed: 2.45 },
    { name: "Shardling", maxHp: 12, primary: "#7c3aed", accent: "#ede9fe", speed: 2.2 }
  ],
  fungal: [
    { name: "Spore Puff", maxHp: 8, primary: "#d946ef", accent: "#fbcfe8", speed: 2.2 },
    { name: "Myco Hopper", maxHp: 11, primary: "#c026d3", accent: "#f5d0fe", speed: 2.45 },
    { name: "Capling", maxHp: 12, primary: "#86198f", accent: "#f0abfc", speed: 2.25 }
  ],
  barren: [
    { name: "Dust Scuttler", maxHp: 9, primary: "#64748b", accent: "#e2e8f0", speed: 2.3 },
    { name: "Scree Hopper", maxHp: 10, primary: "#475569", accent: "#f8fafc", speed: 2.4 },
    { name: "Pebble Pup", maxHp: 12, primary: "#94a3b8", accent: "#ffffff", speed: 2.2 }
  ],
  toxic: [
    { name: "Fume Skink", maxHp: 10, primary: "#84cc16", accent: "#ecfccb", speed: 2.35 },
    { name: "Acid Moth", maxHp: 7, primary: "#65a30d", accent: "#f7fee7", speed: 2.55 },
    { name: "Sludge Toad", maxHp: 13, primary: "#4d7c0f", accent: "#d9f99d", speed: 2.05 }
  ],
  aether: [
    { name: "Halo Wisp", maxHp: 8, primary: "#22d3ee", accent: "#ecfeff", speed: 2.7 },
    { name: "Sky Glider", maxHp: 10, primary: "#06b6d4", accent: "#cffafe", speed: 2.5 },
    { name: "Null Kit", maxHp: 12, primary: "#155e75", accent: "#f0fdfa", speed: 2.3 }
  ],
  ashland: [
    { name: "Soot Hopper", maxHp: 9, primary: "#a8a29e", accent: "#fafaf9", speed: 2.3 },
    { name: "Cairn Beetle", maxHp: 11, primary: "#78716c", accent: "#e7e5e4", speed: 2.0 },
    { name: "Ashling", maxHp: 10, primary: "#57534e", accent: "#f5f5f4", speed: 2.35 }
  ],
  forest: [
    { name: "Brown Rabbit", maxHp: 14, primary: "#9c7355", accent: "#efe6dc", speed: 2.65 },
    { name: "Brush Squirrel", maxHp: 12, primary: "#786047", accent: "#d8c8a8", speed: 2.85 },
    { name: "Field Mouse", maxHp: 10, primary: "#8a867c", accent: "#ddd4c4", speed: 2.45 },
    { name: "Moss Finch", maxHp: 8, primary: "#6b9080", accent: "#eaf2e6", speed: 2.25 }
  ],
  meadow: [
    { name: "Clover Rabbit", maxHp: 13, primary: "#a67f5c", accent: "#f8f4e9", speed: 2.7 },
    { name: "Prairie Vole", maxHp: 9, primary: "#9a9578", accent: "#ebe4ce", speed: 2.35 },
    { name: "Honey Bee Swarm", maxHp: 7, primary: "#c9a227", accent: "#fff8dc", speed: 2.1 },
    { name: "Skipper Hare", maxHp: 15, primary: "#8d6f52", accent: "#fff0dd", speed: 2.9 }
  ],
  desert: [
    { name: "Sand Jerboa", maxHp: 11, primary: "#c4a574", accent: "#f7edd6", speed: 2.75 },
    { name: "Dust Cicada", maxHp: 6, primary: "#b89f6a", accent: "#eae2c9", speed: 1.9 },
    { name: "Sun Lizard", maxHp: 12, primary: "#a8734a", accent: "#ffd7a8", speed: 2.2 },
    { name: "Cactus Beetle", maxHp: 10, primary: "#907050", accent: "#e8dec8", speed: 1.75 }
  ],
  frost: [
    { name: "Snow Hare", maxHp: 14, primary: "#b8c4d6", accent: "#fafcff", speed: 2.55 },
    { name: "Frost Lemming", maxHp: 9, primary: "#9aaab8", accent: "#eaf0f8", speed: 2.3 },
    { name: "Ice Vole", maxHp: 10, primary: "#8fa0b5", accent: "#dfe8f4", speed: 2.15 },
    { name: "Shiver Pipit", maxHp: 7, primary: "#7d8ea3", accent: "#eef4ff", speed: 2.4 }
  ],
  ember: [
    { name: "Ash Mouse", maxHp: 9, primary: "#7a7068", accent: "#dce0e3", speed: 2.5 },
    { name: "Cinder Beetle", maxHp: 11, primary: "#6b5448", accent: "#ffb38a", speed: 1.85 },
    { name: "Ember Salamander", maxHp: 13, primary: "#8b4a38", accent: "#ffd4a8", speed: 2.0 },
    { name: "Soot Pip", maxHp: 8, primary: "#5c524c", accent: "#cfd2d8", speed: 2.35 }
  ]
});

const ITEM_COLORS = [
  "#ff6b6b", "#ff9f43", "#ffd166", "#a8e673", "#26de81",
  "#45aaf2", "#a55eea", "#fd79a8", "#00cec9", "#6c5ce7",
  "#e17055", "#74b9ff", "#55efc4", "#fdcb6e", "#c8a0ff",
  "#ff7675", "#00b894", "#e84393", "#0984e3", "#f39c12",
  "#b2f7ef", "#f9c74f", "#90be6d", "#43aa8b", "#577590",
  "#f94144", "#f3722c", "#f8961e", "#43bccd", "#e76f51",
  "#9b5de5", "#f15bb5", "#fee440", "#00bbf9", "#00f5d4",
  "#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#073b4c"
];

const WEAPON_KINDS = [
  { name: "Sword",          wk: "sword", style: "classic",  dmgMin: 7,  dmgMax: 12 },
  { name: "Bow",            wk: "bow",   style: "classic",  dmgMin: 6,  dmgMax: 10 },
  { name: "Staff",          wk: "staff", style: "classic",  dmgMin: 5,  dmgMax: 9  },
  { name: "Scimitar",       wk: "sword", style: "curved",   dmgMin: 8,  dmgMax: 13 },
  { name: "Dagger",         wk: "sword", style: "dagger",   dmgMin: 5,  dmgMax: 8  },
  { name: "Greatsword",     wk: "sword", style: "heavy",    dmgMin: 10, dmgMax: 15 },
  { name: "Crossbow",       wk: "bow",   style: "heavy",    dmgMin: 8,  dmgMax: 13 },
  { name: "Wand",           wk: "staff", style: "ornate",   dmgMin: 4,  dmgMax: 7  },
  { name: "Spear",          wk: "sword", style: "spear",    dmgMin: 8,  dmgMax: 12 },
  { name: "Mace",           wk: "sword", style: "mace",     dmgMin: 9,  dmgMax: 14 },
  { name: "Rapier",         wk: "sword", style: "ornate",   dmgMin: 7,  dmgMax: 11 },
  { name: "Longbow",        wk: "bow",   style: "heavy",    dmgMin: 9,  dmgMax: 14 },
  { name: "Crystal Sword",  wk: "sword", style: "crystal",  dmgMin: 8,  dmgMax: 13 },
  { name: "Shadow Blade",   wk: "sword", style: "dark",     dmgMin: 9,  dmgMax: 14 },
  { name: "Frost Bow",      wk: "bow",   style: "frost",    dmgMin: 7,  dmgMax: 11 },
  { name: "Flame Staff",    wk: "staff", style: "fire",     dmgMin: 7,  dmgMax: 12 },
  { name: "Runic Axe",      wk: "sword", style: "runic",    dmgMin: 9,  dmgMax: 15 },
  { name: "Spectral Blade", wk: "sword", style: "spectral", dmgMin: 8,  dmgMax: 13 },
  { name: "Glaive",         wk: "sword", style: "spear",    dmgMin: 10, dmgMax: 16 },
  { name: "Void Scepter",   wk: "staff", style: "dark",     dmgMin: 6,  dmgMax: 11 },
];

const ARMOR_KINDS = [
  { name: "Jerkin",        style: "tunic",       hpMin: 8,  hpMax: 22, armMin: 1, armMax: 3 },
  { name: "Chestplate",    style: "armor",       hpMin: 6,  hpMax: 18, armMin: 2, armMax: 5 },
  { name: "Robe",          style: "robe",        hpMin: 12, hpMax: 28, armMin: 1, armMax: 2 },
  { name: "Plate Armor",   style: "plate",       hpMin: 5,  hpMax: 14, armMin: 3, armMax: 6 },
  { name: "Chainmail",     style: "chainmail",   hpMin: 8,  hpMax: 19, armMin: 2, armMax: 4 },
  { name: "Leather Vest",  style: "leather",     hpMin: 10, hpMax: 23, armMin: 1, armMax: 3 },
  { name: "Battle Cloak",  style: "cloak",       hpMin: 14, hpMax: 30, armMin: 1, armMax: 2 },
  { name: "Scale Mail",    style: "scale",       hpMin: 7,  hpMax: 18, armMin: 2, armMax: 4 },
  { name: "War Plate",     style: "battle",      hpMin: 5,  hpMax: 13, armMin: 3, armMax: 7 },
  { name: "Cloth Wraps",   style: "cloth",       hpMin: 16, hpMax: 34, armMin: 0, armMax: 1 },
  { name: "Shadow Weave",  style: "shadowweave", hpMin: 12, hpMax: 26, armMin: 1, armMax: 3 },
  { name: "Iron Hauberk",  style: "chainmail",   hpMin: 7,  hpMax: 17, armMin: 2, armMax: 5 },
  { name: "Void Shroud",   style: "shadowweave", hpMin: 11, hpMax: 24, armMin: 1, armMax: 3 },
  { name: "Forest Cloak",  style: "cloak",       hpMin: 14, hpMax: 28, armMin: 1, armMax: 2 },
  { name: "Crystal Vest",  style: "crystal",     hpMin: 9,  hpMax: 21, armMin: 2, armMax: 3 },
  { name: "Flame Mantle",  style: "fire",        hpMin: 10, hpMax: 22, armMin: 1, armMax: 3 },
  { name: "Frost Shell",   style: "frost",       hpMin: 8,  hpMax: 19, armMin: 2, armMax: 4 },
  { name: "Runic Plate",   style: "runic",       hpMin: 6,  hpMax: 15, armMin: 3, armMax: 5 },
  { name: "Battle Jerkin", style: "leather",     hpMin: 12, hpMax: 24, armMin: 1, armMax: 3 },
  { name: "Mystic Robe",   style: "robe",        hpMin: 16, hpMax: 32, armMin: 1, armMax: 2 },
];

const RING_KINDS = [
  { name: "Ring of Vigor",     stat: "health",   base: 8,    vscale: 2  },
  { name: "Ring of Iron",      stat: "armour",   base: 1,    vscale: 18 },
  { name: "Ring of Haste",     stat: "speed",    base: 0.18, vscale: 60 },
  { name: "Ring of Force",     stat: "strength", base: 1,    vscale: 18 },
  { name: "Ring of Endurance", stat: "health",   base: 12,   vscale: 2  },
  { name: "Ring of Steel",     stat: "armour",   base: 2,    vscale: 18 },
  { name: "Ring of Swiftness", stat: "speed",    base: 0.25, vscale: 60 },
  { name: "Ring of Power",     stat: "strength", base: 2,    vscale: 18 },
  { name: "Ring of Vitality",  stat: "health",   base: 16,   vscale: 2  },
  { name: "Ring of the Titan", stat: "armour",   base: 3,    vscale: 18 },
];

const POTION_KINDS = [
  { name: "Health Potion", color: "#f26d6d", healMin: 25, healMax: 50 },
  { name: "Elixir",        color: "#ff9f43", healMin: 40, healMax: 70 },
  { name: "Tonic",         color: "#26de81", healMin: 15, healMax: 35 },
  { name: "Draught",       color: "#a55eea", healMin: 55, healMax: 85 },
];

const ITEM_RARITIES = [
  { id: "common",    label: "Common",    multiplier: 1    },
  { id: "uncommon",  label: "Uncommon",  multiplier: 1.35 },
  { id: "rare",      label: "Rare",      multiplier: 1.8  },
  { id: "epic",      label: "Epic",      multiplier: 2.35 },
  { id: "legendary", label: "Legendary", multiplier: 3.5  },
];

function itemRarity(seed) {
  const r = hash2(seed, 11, 700);
  return ITEM_RARITIES[r > 0.97 ? 4 : r > 0.85 ? 3 : r > 0.65 ? 2 : r > 0.35 ? 1 : 0];
}

/** Above legendary — unique visuals & combat perks via specialEffects (see getEquipmentSpecial). */
const MYTHIC_ARTIFACT_TEMPLATES = [
  {
    templateId: "mythic_dawnblade",
    type: "weapon",
    name: "☆ Dawnblade Ascendant",
    icon: "sword",
    rarity: "mythic",
    color: "#ffaa44",
    weaponKind: "sword",
    visual: { weaponStyle: "ascendant", weaponColor: "#ffaa44" },
    stats: { damage: 46, strength: 10 },
    specialEffects: { lifesteal: 0.07 },
    value: 11200
  },
  {
    templateId: "mythic_starsing",
    type: "weapon",
    name: "☆ Starsinger Choirstaff",
    icon: "staff",
    rarity: "mythic",
    color: "#66ffe8",
    weaponKind: "staff",
    visual: { weaponStyle: "ascendant", weaponColor: "#66ffe8" },
    stats: { damage: 44, strength: 8 },
    specialEffects: { lifesteal: 0.055 },
    value: 10800
  },
  {
    templateId: "mythic_voidbranch",
    type: "weapon",
    name: "☆ Voidbranch Longbow",
    icon: "bow",
    rarity: "mythic",
    color: "#cc77ff",
    weaponKind: "bow",
    visual: { weaponStyle: "ascendant", weaponColor: "#cc77ff" },
    stats: { damage: 42, strength: 9 },
    specialEffects: { lifesteal: 0.065 },
    value: 10600
  },
  {
    templateId: "mythic_sunspire_edge",
    type: "weapon",
    name: "☆ Sunspire Crusblade",
    icon: "sword",
    rarity: "mythic",
    color: "#ffe066",
    weaponKind: "sword",
    visual: { weaponStyle: "ascendant", weaponColor: "#ffe066" },
    stats: { damage: 50, strength: 11 },
    specialEffects: { lifesteal: 0.08 },
    value: 12800
  },
  {
    templateId: "mythic_aegisvault",
    type: "armor",
    name: "☆ Aegisvault Mantle",
    icon: "armor",
    rarity: "mythic",
    color: "#8899ff",
    visual: { torsoStyle: "ascendant", torsoColor: "#8899ff" },
    stats: { health: 120, armour: 22 },
    specialEffects: { consecrationPower: 0.35 },
    value: 11800
  },
  {
    templateId: "mythic_soulwoven_robes",
    type: "armor",
    name: "☆ Soulwoven Apexrobe",
    icon: "armor",
    rarity: "mythic",
    color: "#ffaacc",
    visual: { torsoStyle: "ascendant", torsoColor: "#ffaacc" },
    stats: { health: 135, armour: 14 },
    specialEffects: { consecrationPower: 0.45 },
    value: 12200
  },
  {
    templateId: "mythic_ironsoul_carapace",
    type: "armor",
    name: "☆ Ironsoul Warplate",
    icon: "armor",
    rarity: "mythic",
    color: "#b87333",
    visual: { torsoStyle: "ascendant", torsoColor: "#b87333" },
    stats: { health: 95, armour: 34 },
    specialEffects: { consecrationPower: 0.22 },
    value: 11900
  }
];

let nextClientId = 1;
let nextSpawnIndex = 0;
let nextItemId = 1;
let nextGroundItemId = 1;
let tick = 0;
let snapshotAccumulator = 0;

/** Rolling wall-clock intervals between simulate() runs (for debug pong). */
let lastSimulateWallMs = Date.now();
const simulateWallIntervals = [];
const SIM_WALL_SAMPLES_MAX = 60;

/** Per-section timing accumulators (microseconds, reset every PERF_LOG_INTERVAL ticks). */
const PERF_LOG_INTERVAL = 300;
const perfAcc = { players: 0, npcs: 0, assaults: 0, mobs: 0, archerSupply: 0, archers: 0, defenses: 0, encounters: 0, jobs: 0, caravans: 0, consecration: 0, snapshot: 0 };
let perfLastSnapshot = null;

const worldDb = openWorldDb();
const ownedBuildings = loadBuildingOwnership(worldDb); // key: "x,y" → { ownerAccountKey, ownerName, price }
{
  const p = getWorldDatabasePath();
  if (p) {
    console.log(`Balathor world database: ${p}`);
  }
  console.log(`Balathor persisted house deeds: ${ownedBuildings.size}`);
}
const FOR_SALE_BUILDINGS = BUILDING_LIST.filter(b => b.forSale);

syncNpcHubHomesFromBuildings(BUILDING_LIST, southDoorAnchorWorldX);

const accountStore = loadAccountStore();
syncSoldCompanionIdsFromAccounts(accountStore.accounts);
seedModAccounts();
const clients = new Map();
/** @type {ReturnType<typeof createSocialSystem> | null} */
let social = null;
let minigames = null;
const chunkCache = new Map();
const chatHistory = [];
const itemDatabase = createItemDatabase();
/** Fixed catalogue for pubs (sold from taproom SHELF fixtures). Dream drinks grant a homestead companion storyline. */
const PUB_BAR_STOCK_TEMPLATES = Object.freeze([
  {
    templateId: "pub_inkwell_stout",
    type: "potion",
    name: "Inkwell Stout",
    icon: "potion",
    rarity: "uncommon",
    color: "#3d281a",
    value: 10,
    stats: { healing: 16, dreamHangover: true }
  },
  {
    templateId: "pub_twilight_smallbeer",
    type: "potion",
    name: "Twilight Smallbeer",
    icon: "potion",
    rarity: "common",
    color: "#6a4828",
    value: 4,
    stats: { healing: 10, dreamHangover: true }
  },
  {
    templateId: "pub_bramblewine",
    type: "potion",
    name: "Bramblewine Cup",
    icon: "potion",
    rarity: "rare",
    color: "#722f4f",
    value: 22,
    stats: { healing: 22, dreamHangover: true }
  }
]);
const chests = createChests();
const groundItems = [];
{
  const { items: persistedGround, nextNumericId } = loadGroundItems(worldDb, parseGroundItemFromDbJson);
  for (const row of persistedGround) {
    groundItems.push(row);
  }
  nextGroundItemId = Math.max(nextGroundItemId, nextNumericId);
}
/** Cached persistent chest slots per owned building key ("x,y"). */
const ownedHouseChestSlotsByKey = new Map();

function touchOwnedHouseChestCache(buildingKey) {
  if (!ownedHouseChestSlotsByKey.has(buildingKey)) {
    ownedHouseChestSlotsByKey.set(
      buildingKey,
      loadHouseChestSlots(worldDb, buildingKey, parseGroundItemFromDbJson)
    );
  }
  return ownedHouseChestSlotsByKey.get(buildingKey);
}

function persistOwnedHouseChest(buildingKey) {
  const slots = ownedHouseChestSlotsByKey.get(buildingKey);
  if (!slots) {
    return;
  }
  saveHouseChestSlots(worldDb, buildingKey, slots);
}

let nextAssaultMobId = 1;
let nextFantasyAssaultAt = Date.now() + 22000;
let nextSciFiAssaultAt = Date.now() + 30000;
const stationDefenseLastShotAt = new Map();
const asteroidStateById = new Map();
const mobs = createMobs();
const mobHomeBuckets = buildMobHomeBuckets(mobs);
const forceSimulateMobs = new Set(mobs.filter((mob) => mob.forceSimulate));
const traderStocks = new Map();
for (const def of getTraderDefinitions()) {
  traderStocks.set(def.id, createTraderStock(def.id, def.homeX * 100 + def.homeY));
}

syncNextItemIdFromAccounts();
syncNextItemIdFromHouseChestsDb();

const ASTEROID_VIEW_MARGIN = 18;
const ASTEROID_DESPAWN_MS = 8 * 60 * 1000;

function asteroidMaxHp(rock) {
  return Math.max(28, Math.round(18 + Number(rock?.radius || 1) * 20));
}

function asteroidStateForRock(rock) {
  if (!rock?.id) return null;
  const now = Date.now();
  let state = asteroidStateById.get(rock.id);
  if (!state) {
    state = {
      id: rock.id,
      hp: asteroidMaxHp(rock),
      maxHp: asteroidMaxHp(rock),
      destroyed: false,
      destroyedAt: 0,
      lastDamagedAt: 0,
      lastSeenAt: now
    };
    asteroidStateById.set(rock.id, state);
  } else if (!Number.isFinite(state.maxHp) || state.maxHp <= 0) {
    state.maxHp = asteroidMaxHp(rock);
    if (!Number.isFinite(state.hp) || state.hp <= 0) {
      state.hp = state.maxHp;
    }
  }
  state.lastSeenAt = now;
  return state;
}

function isAsteroidDestroyed(rock) {
  const state = rock?.id ? asteroidStateById.get(rock.id) : null;
  return Boolean(state?.destroyed || (state && state.hp <= 0));
}

setAsteroidCollisionStateResolver(isAsteroidDestroyed);

function pruneAsteroidState(now = Date.now()) {
  for (const [id, state] of asteroidStateById.entries()) {
    if (!state) {
      asteroidStateById.delete(id);
      continue;
    }
    if (state.destroyed) {
      continue;
    }
    const lastTouched = Math.max(
      Number(state.lastDamagedAt) || 0,
      Number(state.destroyedAt) || 0,
      Number(state.lastSeenAt) || 0
    );
    if (lastTouched && now - lastTouched > ASTEROID_DESPAWN_MS) {
      asteroidStateById.delete(id);
    }
  }
}

function asteroidFieldsNearPoint(x, y, radius) {
  const out = [];
  for (const cluster of getSciFiAsteroids()) {
    if (Math.hypot(cluster.x - x, cluster.y - y) <= radius + Number(cluster.radius || 0)) {
      out.push(cluster);
    }
  }
  for (const cluster of proceduralAsteroidFieldsNear(x, y, radius)) {
    out.push(cluster);
  }
  return out;
}

function forEachAsteroidRockNear(x, y, radius, visitor) {
  const seen = new Set();
  for (const field of asteroidFieldsNearPoint(x, y, radius + 32)) {
    const fieldReach = Number(field.radius || 0) + radius + 3;
    if (Math.hypot(field.x - x, field.y - y) > fieldReach) continue;
    for (const rock of getAsteroidRocks(field)) {
      if (!rock?.id || seen.has(rock.id) || isAsteroidDestroyed(rock)) continue;
      seen.add(rock.id);
      const reach = Number(rock.radius || 0) + radius;
      if (Math.hypot(rock.x - x, rock.y - y) <= reach + 2.5) {
        visitor(rock, asteroidStateForRock(rock));
      }
    }
  }
}

function findAsteroidHitAlongRay(ox, oy, beamCos, beamSin, reach) {
  let bestRock = null;
  let bestState = null;
  let bestT = reach;
  forEachAsteroidRockNear(ox, oy, reach + 4, (rock, state) => {
    const mx = rock.x - ox;
    const my = rock.y - oy;
    const t = mx * beamCos + my * beamSin;
    if (t < 0 || t > reach) return;
    const perpX = mx - beamCos * t;
    const perpY = my - beamSin * t;
    if (Math.hypot(perpX, perpY) > Number(rock.radius || 1) + 0.45) return;
    if (t < bestT) {
      bestT = t;
      bestRock = rock;
      bestState = state;
    }
  });
  return bestRock ? { rock: bestRock, state: bestState, distance: bestT } : null;
}

function applyAsteroidDamage(rock, rawDamage, now = Date.now()) {
  const state = asteroidStateForRock(rock);
  if (!state || state.destroyed) {
    return {
      damage: 0,
      targetHp: 0,
      destroyed: true
    };
  }
  const damage = Math.max(1, Math.round(Number(rawDamage) || 1));
  state.hp = Math.max(0, state.hp - damage);
  state.lastDamagedAt = now;
  if (state.hp <= 0) {
    state.destroyed = true;
    state.destroyedAt = now;
  }
  return {
    damage,
    targetHp: state.hp,
    destroyed: state.destroyed
  };
}

function buildAsteroidSnapshotForView(minX, maxX, minY, maxY, viewerWorld) {
  if (viewerWorld !== "scifi") return [];
  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;
  const radius = Math.hypot(maxX - minX, maxY - minY) * 0.5 + ASTEROID_VIEW_MARGIN;
  const out = [];
  const seen = new Set();
  for (const field of asteroidFieldsNearPoint(centerX, centerY, radius + 32)) {
    for (const rock of getAsteroidRocks(field)) {
      if (!rock?.id || seen.has(rock.id)) continue;
      seen.add(rock.id);
      if (
        rock.x < minX - ASTEROID_VIEW_MARGIN ||
        rock.x > maxX + ASTEROID_VIEW_MARGIN ||
        rock.y < minY - ASTEROID_VIEW_MARGIN ||
        rock.y > maxY + ASTEROID_VIEW_MARGIN
      ) {
        continue;
      }
      const state = asteroidStateForRock(rock);
      out.push({
        id: rock.id,
        hp: state.hp,
        maxHp: state.maxHp,
        destroyed: Boolean(state.destroyed)
      });
    }
  }
  return out;
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    sendJson(res, 200, {
      ok: true,
      players: [...clients.values()].filter((client) => client.player).length,
      connections: clients.size,
      maxClients: MAX_CONNECTED_CLIENTS,
      idleDisconnectMs: IDLE_DISCONNECT_MS,
      simulationPaused: clients.size === 0,
      tickRate: TICK_RATE,
      snapshotRate: SNAPSHOT_RATE,
      aiTickDivisor: AI_TICK_DIVISOR,
      enemyDensityMultiplier: ENEMY_DENSITY_MULTIPLIER,
      enemies: mobs.length,
      forceSimulatedEnemies: forceSimulateMobs.size,
      measuredSimHz: getMeasuredSimHz(),
      perf: perfLastSnapshot,
      chunkWorkers: chunkWorkerPool.length,
      chunkQueue: chunkGenQueue.length,
      chunkSize: CHUNK_SIZE
    });
    return;
  }

  sendJson(res, 404, { error: "not_found" });
});

server.on("upgrade", (req, socket) => {
  if (req.url !== "/ws") {
    socket.destroy();
    return;
  }

  if (clients.size >= MAX_CONNECTED_CLIENTS) {
    socket.write("HTTP/1.1 503 Service Unavailable\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }

  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return;
  }

  const accept = crypto
    .createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");

  socket.write(
    [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${accept}`,
      "",
      ""
    ].join("\r\n")
  );

  const id = String(nextClientId++);
  const client = {
    id,
    socket,
    buffer: Buffer.alloc(0),
    alive: true,
    lastChatAt: 0,
    lastAttackAt: 0,
    lastDoorAt: 0,
    lastPortalAt: 0,
    lastHomeAt: 0,
    connectedAt: Date.now(),
    lastActivityAt: Date.now(),
    _msgCount: 0,
    _msgWindowEnd: 0,
    input: { up: false, down: false, left: false, right: false },
    view: null,
    account: null,
    player: null
  };

  clients.set(id, client);
  send(client, {
    type: "serverMessage",
    message: "connected"
  });

  socket.on("data", (data) => receive(client, data));
  socket.on("error", () => disconnect(client));
  socket.on("close", () => disconnect(client));
});

server.listen(PORT, HOST, LISTEN_BACKLOG, () => {
  console.log(`Balathor server listening on ${HOST}:${PORT}`);
  if (DISCORD_AUTH_WEBHOOK_URL && isAllowedDiscordWebhookUrl(DISCORD_AUTH_WEBHOOK_URL)) {
    console.log("Balathor: Discord auth webhook enabled");
  }
});

/** Single-threaded clock: never overlap simulate(); avoids setInterval piling callbacks when ticks overrun. */
let simulateTimer = null;
function queueSimulate() {
  if (clients.size === 0) {
    simulateTimer = setTimeout(queueSimulate, NO_CLIENT_SIM_DELAY_MS);
    if (typeof simulateTimer.unref === "function") {
      simulateTimer.unref();
    }
    return;
  }
  const elapsed = simulateCore();
  const delay = Math.max(0, 1000 / TICK_RATE - elapsed);
  simulateTimer = setTimeout(queueSimulate, delay);
  if (typeof simulateTimer.unref === "function") {
    simulateTimer.unref();
  }
}

function simulateCore() {
  const t0 = Date.now();
  simulate();
  return Date.now() - t0;
}

function initSocialModule() {
  social = createSocialSystem({
    clients,
    accountStore,
    saveAccountStore,
    broadcastSnapshot,
    send,
    addItemToInventory,
    cloneItem,
    INVENTORY_SIZE,
    saveClientCharacter
  });
}
initSocialModule();

function getPartyMemberClients(client) {
  const view = social?.getPartyView(client);
  if (!view?.members?.length) return [client];
  const out = [];
  for (const m of view.members) {
    if (!m?.id) continue;
    const c = findClientByPlayerIdInternal(m.id);
    if (c) out.push(c);
  }
  return out.length ? out : [client];
}

function spawnMinigameAmbush(x, y) {
  const jitter = () => (Math.random() - 0.5) * 5;
  addRuntimeMob({
    id: `mg_amb_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    name: "Raider",
    homeX: x + jitter(),
    homeY: y + jitter(),
    x: x + jitter(),
    y: y + jitter(),
    maxHp: 42,
    level: 2,
    attackDamage: 8,
    roamRadius: 6,
    speed: 1.5,
    forceSimulate: true
  });
  broadcastSnapshot();
}

function initMinigameModule() {
  minigames = createMinigameSystem({
    send,
    pushChat,
    broadcastSnapshot,
    saveClientCharacter,
    clients,
    awardXp,
    worldForPosition,
    isSwimmingAt,
    getWorldHour: () => getWorldTimeSnapshot().hour,
    getCampById: (id) => ENEMY_CAMPS.find((c) => c.id === id) || null,
    getOwnedShip: getOwnedActiveShip,
    getPartyView: (client) => social?.getPartyView(client) || null,
    getPartyMemberClients,
    spawnEscortAmbush: spawnMinigameAmbush,
    tickRate: TICK_RATE
  });
}
initMinigameModule();

queueSimulate();

function clearSimulateTimer() {
  if (simulateTimer !== null && simulateTimer !== undefined) {
    clearTimeout(simulateTimer);
    simulateTimer = null;
  }
}

process.on("SIGTERM", () => {
  clearSimulateTimer();
  shutdownChunkWorkers();
  saveAllActiveCharacters();
  closeWorldDb(worldDb);
  process.exit(0);
});

process.on("SIGINT", () => {
  clearSimulateTimer();
  shutdownChunkWorkers();
  saveAllActiveCharacters();
  closeWorldDb(worldDb);
  process.exit(0);
});

function seedModAccounts() {
  const MOD_ACCOUNTS = [
    { username: "mod_ed", password: "QAZ123wsx!", isMod: true, modCharacterName: "ed" }
  ];
  let dirty = false;
  for (const def of MOD_ACCOUNTS) {
    const key = def.username.toLowerCase();
    const existing = accountStore.accounts[key];
    if (!existing) {
      const salt = crypto.randomBytes(16).toString("hex");
      accountStore.accounts[key] = {
        username: def.username,
        salt,
        passwordHash: hashPassword(def.password, salt),
        isMod: def.isMod,
        modCharacterName: def.modCharacterName || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        character: null
      };
      dirty = true;
    } else if (!existing.isMod) {
      existing.isMod = def.isMod;
      existing.modCharacterName = def.modCharacterName || null;
      existing.updatedAt = Date.now();
      dirty = true;
    }
  }
  if (dirty) {
    saveAccountStore();
  }
}

function loadAccountStore() {
  try {
    const raw = fs.readFileSync(ACCOUNT_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.accounts && typeof parsed.accounts === "object") {
      return parsed;
    }
  } catch {
    // A missing or unreadable account file starts with an empty local store.
  }
  return { version: 1, accounts: {} };
}

function saveAccountStore() {
  fs.mkdirSync(path.dirname(ACCOUNT_STORE_PATH), { recursive: true });
  const tmpPath = `${ACCOUNT_STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(accountStore, null, 2));
  fs.renameSync(tmpPath, ACCOUNT_STORE_PATH);
}

function createAccount(username, password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    username,
    salt,
    passwordHash: hashPassword(password, salt),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    character: null
  };
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
}

function verifyPassword(password, account) {
  const expected = Buffer.from(account.passwordHash || "", "hex");
  const actual = Buffer.from(hashPassword(password, account.salt || ""), "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function saveClientCharacter(client) {
  if (!client.account || !client.player) {
    return;
  }

  const account = accountStore.accounts[client.account.key];
  if (!account) {
    return;
  }

  account.character = serializePlayer(client.player);
  account.updatedAt = Date.now();
  saveAccountStore();
}

function saveAllActiveCharacters() {
  for (const client of clients.values()) {
    saveClientCharacter(client);
  }
}

function sanitizeQuestLog(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") {
    return out;
  }
  for (const [questId, quest] of Object.entries(raw)) {
    const def = QUEST_DEFINITIONS[questId];
    if (!def || !quest || typeof quest !== "object") continue;
    const step = clampInteger(quest.step ?? 0, 0, def.steps.length);
    out[questId] = {
      id: questId,
      step,
      progress: clampInteger(quest.progress ?? 0, 0, 9999),
      completed: Boolean(quest.completed) || step >= def.steps.length
    };
  }
  return out;
}

function sanitizeProfessions(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") {
    return out;
  }
  for (const id of Object.keys(PROFESSION_DEFINITIONS)) {
    const entry = raw[id];
    if (!entry || typeof entry !== "object") continue;
    out[id] = {
      id,
      level: clampInteger(entry.level ?? 1, 1, 100),
      xp: clampInteger(entry.xp ?? 0, 0, 1000000)
    };
  }
  return out;
}

function awardProfessionXp(player, professionId, xp) {
  const def = PROFESSION_DEFINITIONS[professionId];
  if (!player || !def) return null;
  player.professions = sanitizeProfessions(player.professions || {});
  const current = player.professions[professionId] || { id: professionId, level: 1, xp: 0 };
  current.xp += Math.max(0, Math.round(Number(xp) || 0));
  while (current.xp >= current.level * 40 && current.level < 100) {
    current.xp -= current.level * 40;
    current.level += 1;
  }
  player.professions[professionId] = current;
  return current;
}

function serializeQuestLog(quests) {
  const out = {};
  for (const [questId, quest] of Object.entries(quests || {})) {
    const def = QUEST_DEFINITIONS[questId];
    if (!def || !quest || typeof quest !== "object") continue;
    out[questId] = {
      id: questId,
      step: clampInteger(quest.step ?? 0, 0, def.steps.length),
      progress: clampInteger(quest.progress ?? 0, 0, 9999),
      completed: Boolean(quest.completed)
    };
  }
  return out;
}

function serializePlayer(player) {
  const ownedShip = getOwnedActiveShip(player);
  const savedShips = Array.isArray(player.ships) ? player.ships.map((ship) => {
    // The active ship persists its boarded / deckMode / world position so the player
    // wakes up inside the ship right where they left off (the gunner / pilot seat is
    // cleared so they need to re-take their station after reconnecting).
    const isActive = ship === ownedShip;
    return serializeShip({
      ...ship,
      boarded: isActive ? Boolean(ship.boarded) : false,
      deckMode: isActive ? Boolean(ship.deckMode) : false,
      stationRole: null,
      stationId: null
    });
  }) : [];
  return {
    name: player.name,
    classId: player.classId,
    baseTorsoStyle: player.baseTorsoStyle,
    baseWeaponStyle: player.baseWeaponStyle,
    torsoStyle: player.baseTorsoStyle || player.torsoStyle,
    weaponStyle: player.baseWeaponStyle || player.weaponStyle,
    torsoColor: player.torsoColor,
    weaponColor: player.weaponColor,
    hp: player.hp,
    maxHp: player.maxHp,
    xp: player.xp,
    level: player.level,
    statPoints: player.statPoints,
    talentPoints: player.talentPoints || 0,
    talents: player.talents || {},
    abilityBar: player.abilityBar || [null, null, null, null, null],
    stats: player.stats,
    gold: player.gold,
    inventory: player.inventory,
    equipment: player.equipment,
    quests: serializeQuestLog(player.quests),
    professions: sanitizeProfessions(player.professions),
    x: Number(player.x.toFixed(3)),
    y: Number(player.y.toFixed(3)),
    facing: Number(player.facing.toFixed(3)),
    ...(typeof player.homeBuildingKey === "string" && player.homeBuildingKey
      ? { homeBuildingKey: player.homeBuildingKey }
      : {}),
    ...(player.houseCompanion && typeof player.houseCompanion === "object"
      ? { houseCompanion: player.houseCompanion }
      : {}),
    ...(player.flirtFollowNpcId ? { flirtFollowNpcId: player.flirtFollowNpcId } : {}),
    ...(savedShips.length
      ? { ships: savedShips, activeShipId: player.activeShipId || ownedShip?.id || null }
      : {}),
    ...(ownedShip && typeof ownedShip === "object" ? { ship: serializeShip({ ...ownedShip, stationRole: null, stationId: null }) } : {}),
    ...(typeof player.aboardShipId === "string" && player.aboardShipId ? { aboardShipId: player.aboardShipId } : {}),
    ...(player.carryingArrows > 0 ? { carryingArrows: Math.max(0, Math.round(player.carryingArrows)) } : {}),
    ...(minigames ? { minigameStats: minigames.serializeMinigameStats(player) } : {})
  };
}

function getOwnedActiveShip(player) {
  if (!player) return null;
  if (Array.isArray(player.ships) && player.ships.length) {
    return player.ships.find((ship) => ship.id === player.activeShipId) || player.ships[0];
  }
  return player.ship && !player.boardedShip ? player.ship : null;
}

function findShipById(shipId) {
  if (!shipId) return null;
  for (const c of clients.values()) {
    const ship = c.player?.ship;
    if (ship?.id === shipId) return { ship, owner: c.player };
  }
  return null;
}

function validatePassengerLink(player) {
  if (!player || typeof player.aboardShipId !== "string" || !player.aboardShipId) return;
  const found = findShipById(player.aboardShipId);
  if (!found || !found.ship.boarded) {
    // Owner offline or ship not boarded — passenger drops back to a safe dock terminal.
    player.aboardShipId = null;
    const fallback = getPlayerDockPort(player) || findNearestSciFiDockPort(STARGATE_LANDING.x, STARGATE_LANDING.y, 120);
    if (fallback) {
      player.x = Number.isFinite(fallback.terminalX) ? fallback.terminalX : fallback.x;
      player.y = Number.isFinite(fallback.terminalY) ? fallback.terminalY : fallback.y;
    }
    return;
  }
  // Owner online and aboard the ship — slot the passenger to the ship's current entry point.
  const layout = getShipLayout(found.ship);
  const center = shipCenter(found.ship);
  player.x = center.x + (layout?.entry?.x || 0);
  player.y = center.y + (layout?.entry?.y || 0);
}

function serializeShip(ship) {
  const layout = getShipLayout(ship);
  const maxHealth = getShipMaxHealth(ship);
  const maxShields = getShipMaxShields(ship);
  const shieldSections = sanitizeShipShieldSections(ship);
  return {
    id: typeof ship.id === "string" ? ship.id.slice(0, 64) : "starter_ship",
    templateId: typeof ship.templateId === "string" ? ship.templateId : "starter_ship",
    name: typeof ship.name === "string" ? ship.name : "Nova Skiff",
    color: typeof ship.color === "string" ? ship.color : "#67f0ff",
    hullClass: typeof ship.hullClass === "string" ? ship.hullClass.slice(0, 24) : "skiff",
    boarded: Boolean(ship.boarded),
    dockX: clampNumber(ship.dockX, -SHIP_COORD_LIMIT, SHIP_COORD_LIMIT, STARGATE_LANDING.x),
    dockY: clampNumber(ship.dockY, -SHIP_COORD_LIMIT, SHIP_COORD_LIMIT, STARGATE_LANDING.y),
    dockStationId: typeof ship.dockStationId === "string" ? ship.dockStationId : "station_ringforge",
    dockPortId: typeof ship.dockPortId === "string" ? ship.dockPortId.slice(0, 48) : null,
    worldX: clampNumber(ship.worldX, -SHIP_COORD_LIMIT, SHIP_COORD_LIMIT, ship.dockX ?? STARGATE_LANDING.x),
    worldY: clampNumber(ship.worldY, -SHIP_COORD_LIMIT, SHIP_COORD_LIMIT, ship.dockY ?? STARGATE_LANDING.y),
    facing: normalizeAngle(clampNumber(ship.facing, -Math.PI * 2, Math.PI * 2, 0)),
    speed: clampNumber(ship.speed, 0, 1000, SHIP_SPEED),
    laserTier: clampInteger(ship.laserTier ?? 1, 1, 5),
    thrustTier: clampInteger(ship.thrustTier ?? 1, 1, 5),
    crewCapacity: layout.crewCapacity,
    deckMode: Boolean(ship.deckMode),
    stationRole: typeof ship.stationRole === "string" ? ship.stationRole : null,
    stationId: typeof ship.stationId === "string" ? ship.stationId : null,
    health: clampNumber(ship.health, 0, maxHealth, maxHealth),
    maxHealth,
    shields: clampNumber(ship.shields, 0, maxShields, maxShields),
    maxShields,
    shieldFacing: normalizeShieldFacing(ship.shieldFacing || Object.values(shieldSections)[0]),
    shieldSections,
    crew: serializeShipCrew(ship),
    docking: null,
    warp: sanitizeShipWarp(ship.warp)
  };
}

function serializeShipForPlayer(player, ship = player?.ship) {
  if (!ship) return null;
  const snap = serializeShip(ship);
  snap.stationRole = typeof player?.shipStationRole === "string" ? player.shipStationRole : snap.stationRole;
  snap.stationId = typeof player?.shipStationId === "string" ? player.shipStationId : snap.stationId;
  return snap;
}

function sanitizeShipWarp(warp) {
  if (!warp || typeof warp !== "object" || !warp.active) return null;
  const targetX = clampNumber(warp.targetX, -SHIP_COORD_LIMIT, SHIP_COORD_LIMIT, NaN);
  const targetY = clampNumber(warp.targetY, -SHIP_COORD_LIMIT, SHIP_COORD_LIMIT, NaN);
  const arrivalX = clampNumber(warp.arrivalX, -SHIP_COORD_LIMIT, SHIP_COORD_LIMIT, targetX);
  const arrivalY = clampNumber(warp.arrivalY, -SHIP_COORD_LIMIT, SHIP_COORD_LIMIT, targetY);
  if (!Number.isFinite(targetX) || !Number.isFinite(targetY) || !Number.isFinite(arrivalX) || !Number.isFinite(arrivalY)) return null;
  return {
    active: true,
    phase: typeof warp.phase === "string" ? warp.phase.slice(0, 16) : "approach",
    targetX,
    targetY,
    arrivalX,
    arrivalY,
    destinationName: typeof warp.destinationName === "string" ? warp.destinationName.slice(0, 80) : "Destination",
    destinationKind: typeof warp.destinationKind === "string" ? warp.destinationKind.slice(0, 32) : "warp",
    destinationId: typeof warp.destinationId === "string" ? warp.destinationId.slice(0, 96) : null,
    color: typeof warp.color === "string" ? warp.color.slice(0, 22) : "#67f0ff",
    startedAt: clampNumber(warp.startedAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
    jumpStartedAt: clampNumber(warp.jumpStartedAt, 0, Number.MAX_SAFE_INTEGER, 0)
  };
}

// Each gunner station owns one orbiting combat drone. The drone count therefore
// matches the number of gunner stations on the hull.
function getShipDroneCount(shipOrClass) {
  const hullClass = typeof shipOrClass === "string" ? shipOrClass : shipOrClass?.hullClass;
  if (hullClass === "crew4" || hullClass === "frigate" || hullClass === "freighter") return 3;
  if (hullClass === "crew3" || hullClass === "cruiser") return 2;
  return 1;
}

// Radius (in tiles) of the ring the drones orbit around the exterior hull.
function getShipDroneOrbitRadius(shipOrClass) {
  const hullClass = typeof shipOrClass === "string" ? shipOrClass : shipOrClass?.hullClass;
  if (hullClass === "crew4" || hullClass === "frigate" || hullClass === "freighter") return 3.0;
  if (hullClass === "crew3" || hullClass === "cruiser") return 2.7;
  if (hullClass === "crew2" || hullClass === "corvette" || hullClass === "hauler" || hullClass === "yacht") return 2.4;
  return 2.0;
}

const SHIP_DRONE_ORBIT_SPEED = 0.55; // radians per second

// World-relative offset (tiles) of a drone at the given moment. Server and client
// share this formula keyed off Date.now() so the firing origin tracks the visual.
function shipDroneOffset(shipOrClass, index, count, now = Date.now()) {
  const radius = getShipDroneOrbitRadius(shipOrClass);
  const slots = Math.max(1, count);
  const angle = (Math.PI * 2 * index) / slots + (now / 1000) * SHIP_DRONE_ORBIT_SPEED;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

// All drone offsets for a hull (used when a lone gunner controls every drone).
function getShipTurrets(shipOrClass) {
  const count = getShipDroneCount(shipOrClass);
  const now = Date.now();
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(shipDroneOffset(shipOrClass, i, count, now));
  }
  return out;
}

function getShipLayout(shipOrClass = "skiff") {
  const hullClass = typeof shipOrClass === "string" ? shipOrClass : shipOrClass?.hullClass;
  if (hullClass === "crew4" || hullClass === "frigate" || hullClass === "freighter") {
    return {
      crewCapacity: 4,
      npcCrew: 4,
      deckW: 30,
      deckH: 18,
      entry: { x: -13, y: 0 },
      teleporter: { x: -12, y: 0 },
      stations: [
        { id: "helm", role: "pilot", name: "Helm", x: 11.0, y: 0 },
        { id: "engineer_fwd", role: "engineer", name: "Fore Engineering", x: 4.0, y: -4.0, defaultShieldFacing: "front" },
        { id: "engineer_aft", role: "engineer", name: "Aft Engineering", x: 4.0, y: 4.0, defaultShieldFacing: "back" },
        { id: "engineer_port", role: "engineer", name: "Port Engineering", x: -8.0, y: -3.0, defaultShieldFacing: "left" },
        { id: "gunner_1", role: "gunner", name: "Gunner I", x: -2.0, y: -4.0, droneIndex: 0 },
        { id: "gunner_2", role: "gunner", name: "Gunner II", x: -2.0, y: 4.0, droneIndex: 1 },
        { id: "gunner_3", role: "gunner", name: "Gunner III", x: -8.0, y: 3.0, droneIndex: 2 }
      ],
      crewIdle: [
        { x: -10.0, y: -1.5 },
        { x: -10.0, y: 1.5 },
        { x: -5.0, y: -1.5 },
        { x: -5.0, y: 1.5 }
      ],
      amenities: [
        { kind: "bed", x: -11.0, y: -3.5 },
        { kind: "bed", x: -11.0, y: 3.5 },
        { kind: "kitchen", x: -6.5, y: -4.5 },
        { kind: "table", x: 0.5, y: 0 }
      ]
    };
  }
  if (hullClass === "crew3" || hullClass === "cruiser") {
    return {
      crewCapacity: 3,
      npcCrew: 2,
      deckW: 23,
      deckH: 14,
      entry: { x: -10, y: 0 },
      teleporter: { x: -8.5, y: 0 },
      stations: [
        { id: "helm", role: "pilot", name: "Helm", x: 8.5, y: 0 },
        { id: "engineer_fwd", role: "engineer", name: "Fore Engineering", x: 2.5, y: -3.0, defaultShieldFacing: "front" },
        { id: "engineer_aft", role: "engineer", name: "Aft Engineering", x: 2.5, y: 3.0, defaultShieldFacing: "back" },
        { id: "gunner_1", role: "gunner", name: "Gunner I", x: -4.0, y: -3.0, droneIndex: 0 },
        { id: "gunner_2", role: "gunner", name: "Gunner II", x: -4.0, y: 3.0, droneIndex: 1 }
      ],
      crewIdle: [
        { x: -6.5, y: -1.5 },
        { x: -6.5, y: 1.5 }
      ],
      amenities: [
        { kind: "bed", x: -8.0, y: -3.0 },
        { kind: "kitchen", x: -8.0, y: 3.0 }
      ]
    };
  }
  if (hullClass === "crew2" || hullClass === "corvette" || hullClass === "hauler" || hullClass === "yacht") {
    return {
      crewCapacity: 2,
      npcCrew: 1,
      deckW: 17,
      deckH: 11,
      entry: { x: -7, y: 0 },
      teleporter: { x: -6.0, y: -1.5 },
      stations: [
        { id: "helm", role: "pilot", name: "Helm", x: 6.0, y: 0 },
        { id: "engineer_main", role: "engineer", name: "Engineering", x: 0.5, y: -2.5, defaultShieldFacing: "front" },
        { id: "gunner_1", role: "gunner", name: "Gunner", x: -4.5, y: 2.0, droneIndex: 0 }
      ],
      crewIdle: [
        { x: -4.5, y: -2.0 }
      ],
      amenities: [
        { kind: "bed", x: -2.5, y: 2.5 },
        { kind: "kitchen", x: -6.0, y: 2.0 }
      ]
    };
  }
  return {
    crewCapacity: 1,
    npcCrew: 0,
    deckW: 8,
    deckH: 5,
    entry: { x: 0, y: 0 },
    stations: [{ id: "pilot", role: "pilot", name: "Pilot Seat", x: 0, y: 0 }],
    crewIdle: [],
    amenities: []
  };
}

// Gunner stations in layout order, each mapped to its orbiting drone.
function getShipGunnerStations(shipOrClass) {
  const layout = getShipLayout(shipOrClass);
  return (layout.stations || []).filter((s) => s.role === "gunner");
}

// ---------------------------------------------------------------------------
// NPC crew — the helpers that come bundled with multi-crew ships. They man
// stations (gunner drones, engineering shields) and can be re-tasked by the
// owner walking up to them on the deck.
// ---------------------------------------------------------------------------
const SHIP_CREW_NAMES = ["Vega", "Orin", "Lyra", "Cass", "Juno", "Rhea", "Dax", "Mira", "Kai", "Tov", "Sela", "Bren", "Nova", "Pell", "Zane", "Ivo"];
const SHIP_CREW_COLORS = ["#5cc8ff", "#7ce0c0", "#ffb27a", "#c9a6ff", "#ff8f9e", "#9ed36a", "#f7d86a", "#8ad7ff"];
const SHIP_CREW_NPC_FIRE_COOLDOWN_MS = 620;
const SHIP_CREW_NPC_TARGET_RANGE = 22;

function shipCrewNameFor(ship, index) {
  const seed = (index + (typeof ship?.id === "string" ? ship.id.length : 0)) % SHIP_CREW_NAMES.length;
  return SHIP_CREW_NAMES[seed];
}

function makeShipCrewMember(ship, index) {
  return {
    id: `crew_${index}`,
    name: shipCrewNameFor(ship, index),
    color: SHIP_CREW_COLORS[index % SHIP_CREW_COLORS.length],
    stationId: null,
    idleKind: "chill",
    localX: 0,
    localY: 0,
    facing: Math.PI,
    lastFireAt: 0
  };
}

function assignDefaultCrewStations(ship, layout = getShipLayout(ship)) {
  // Crew fill the guns first (so the ship auto-defends), then engineering.
  const order = [
    ...layout.stations.filter((s) => s.role === "gunner"),
    ...layout.stations.filter((s) => s.role === "engineer")
  ];
  let i = 0;
  for (const crew of ship.crew) {
    crew.stationId = order[i] ? order[i].id : null;
    i += 1;
  }
}

function placeShipCrew(ship, layout = getShipLayout(ship)) {
  const idle = Array.isArray(layout.crewIdle) ? layout.crewIdle : [];
  const amenitySpots = Array.isArray(layout.amenities) ? layout.amenities : [];
  const restSpots = idle.concat(amenitySpots.filter((spot) => spot.kind === "bed"));
  let idleIdx = 0;
  for (const crew of ship.crew) {
    const station = crew.stationId ? layout.stations.find((s) => s.id === crew.stationId) : null;
    if (station) {
      crew.localX = Number(station.x) || 0;
      crew.localY = Number(station.y) || 0;
      crew.facing = station.role === "pilot" ? 0 : (Number(station.x) >= 0 ? 0 : Math.PI);
    } else {
      const kind = crew.idleKind === "bed" ? "bed" : crew.idleKind === "galley" ? "galley" : "chill";
      const matching = restSpots.filter((spot) =>
        kind === "bed" ? spot.kind === "bed" :
          kind === "galley" ? spot.kind === "kitchen" || spot.kind === "table" :
            spot.kind !== "bed" && spot.kind !== "kitchen" && spot.kind !== "table"
      );
      const pool = matching.length ? matching : restSpots;
      const spot = pool[idleIdx % Math.max(1, pool.length)] || { x: (layout.entry?.x || 0) + 1.5, y: 0 };
      idleIdx += 1;
      crew.localX = Number(spot.x) || 0;
      crew.localY = Number(spot.y) || 0;
      crew.facing = kind === "bed" ? -Math.PI / 2 : kind === "galley" ? Math.PI / 2 : 0;
    }
  }
}

function ensureShipCrew(ship) {
  if (!ship || typeof ship !== "object") return [];
  const layout = getShipLayout(ship);
  const target = Math.max(0, Number(layout.npcCrew) || 0);
  if (!Array.isArray(ship.crew)) ship.crew = [];
  if (ship.crew.length > target) ship.crew.length = target;
  while (ship.crew.length < target) {
    ship.crew.push(makeShipCrewMember(ship, ship.crew.length));
  }
  for (let i = 0; i < ship.crew.length; i += 1) {
    const crew = ship.crew[i];
    if (!crew || typeof crew !== "object") continue;
    if (typeof crew.id !== "string" || !crew.id) crew.id = `crew_${i}`;
    if (typeof crew.name !== "string" || !crew.name.trim() || crew.name === "Crew") crew.name = shipCrewNameFor(ship, i);
    if (typeof crew.color !== "string" || !crew.color) crew.color = SHIP_CREW_COLORS[i % SHIP_CREW_COLORS.length];
    if (crew.idleKind !== "bed" && crew.idleKind !== "galley") crew.idleKind = "chill";
  }
  // Drop assignments that no longer map to a valid non-pilot station.
  const validStationIds = new Set(layout.stations.filter((s) => s.role !== "pilot").map((s) => s.id));
  for (const crew of ship.crew) {
    if (crew.stationId && !validStationIds.has(crew.stationId)) crew.stationId = null;
  }
  // Fresh crew with no posting at all → auto-fill stations once.
  if (target > 0 && ship.crew.every((c) => !c.stationId)) {
    assignDefaultCrewStations(ship, layout);
  }
  placeShipCrew(ship, layout);
  return ship.crew;
}

function shipStationNpcOccupant(ship, stationId) {
  if (!Array.isArray(ship?.crew)) return null;
  return ship.crew.find((c) => c.stationId === stationId) || null;
}

function shipStationPlayerOccupant(ship, stationId) {
  if (!ship || !stationId) return null;
  for (const c of clients.values()) {
    const p = c.player;
    if (!p) continue;
    const onShip = p.ship === ship || (typeof p.aboardShipId === "string" && p.aboardShipId === ship.id);
    if (!onShip) continue;
    if ((p.shipStationId || null) === stationId) return p;
  }
  return null;
}

// When a player sits at a station an NPC holds, move that NPC to an open
// non-pilot station, or to an idle post if the deck is full.
function bumpCrewFromStation(ship, stationId) {
  if (!ship || !stationId) return;
  ensureShipCrew(ship);
  const crew = shipStationNpcOccupant(ship, stationId);
  if (!crew) return;
  const layout = getShipLayout(ship);
  const open = layout.stations.find((s) =>
    s.role !== "pilot" &&
    s.id !== stationId &&
    !shipStationPlayerOccupant(ship, s.id) &&
    !shipStationNpcOccupant(ship, s.id)
  );
  crew.stationId = open ? open.id : null;
  placeShipCrew(ship, layout);
}

function serializeShipCrew(ship) {
  if (!Array.isArray(ship?.crew) || !ship.crew.length) return [];
  const layout = getShipLayout(ship);
  return ship.crew.map((crew) => {
    const station = crew.stationId ? layout.stations.find((s) => s.id === crew.stationId) : null;
    return {
      id: crew.id,
      name: crew.name,
      color: crew.color,
      stationId: crew.stationId || null,
      role: station ? station.role : null,
      idleKind: station ? null : (crew.idleKind === "bed" ? "bed" : crew.idleKind === "galley" ? "galley" : "chill"),
      localX: Number(crew.localX) || 0,
      localY: Number(crew.localY) || 0,
      facing: Number(crew.facing) || 0
    };
  });
}

// ---------------------------------------------------------------------------
// Drone weapons — every gunner station owns one orbiting drone. A lone gunner
// commands all of them; otherwise each operator drives only their own.
// ---------------------------------------------------------------------------
function gunnerDroneSelection(ship, stationId) {
  const layout = getShipLayout(ship);
  const count = getShipDroneCount(ship);
  const gunnerStations = layout.stations.filter((s) => s.role === "gunner");
  const myStation = gunnerStations.find((s) => s.id === stationId);
  const myDrone = myStation && Number.isFinite(myStation.droneIndex) ? myStation.droneIndex : 0;
  let otherOccupied = 0;
  for (const s of gunnerStations) {
    if (s.id === stationId) continue;
    if (shipStationPlayerOccupant(ship, s.id) || shipStationNpcOccupant(ship, s.id)) otherOccupied += 1;
  }
  if (otherOccupied === 0) {
    return Array.from({ length: count }, (_, i) => i);
  }
  return [myDrone];
}

// Fires a single drone's beam from its current orbit position toward (tx,ty).
// Kills are credited to attributeClient (the gunner, or the owner for NPC fire).
function fireOneShipDrone(ship, attributeClient, droneIndex, droneCount, tx, ty, now = Date.now()) {
  const center = shipCenter(ship);
  const off = shipDroneOffset(ship, droneIndex, droneCount, now);
  const ox = center.x + off.x;
  const oy = center.y + off.y;
  const tier = Math.max(1, Number(ship.laserTier) || 1);
  const baseRange = 9 + tier * 2;
  const turretDamage = 12 + tier * 6;
  const dxs = tx - ox;
  const dys = ty - oy;
  const dist = Math.hypot(dxs, dys);
  const reach = Math.min(baseRange, dist || baseRange) || baseRange;
  const facing = Math.atan2(dys, dxs);
  const beamCos = Math.cos(facing);
  const beamSin = Math.sin(facing);

  let bestMob = null;
  let bestT = reach;
  forEachMobNear(ox, oy, reach + 4, (mob) => {
    if (mob.dead) return;
    const mx = mob.x - ox;
    const my = mob.y - oy;
    const t = mx * beamCos + my * beamSin;
    if (t < 0 || t > reach) return;
    const perpX = mx - beamCos * t;
    const perpY = my - beamSin * t;
    if (Math.hypot(perpX, perpY) > 1.6) return;
    if (t < bestT) {
      bestT = t;
      bestMob = mob;
    }
  });
  const asteroidHit = findAsteroidHitAlongRay(ox, oy, beamCos, beamSin, reach);
  const hitAsteroid = asteroidHit && asteroidHit.distance <= bestT;
  const endX = hitAsteroid ? asteroidHit.rock.x : bestMob ? bestMob.x : ox + beamCos * reach;
  const endY = hitAsteroid ? asteroidHit.rock.y : bestMob ? bestMob.y : oy + beamSin * reach;

  const event = {
    type: "combat",
    kind: "projectile",
    weapon: "ship_turret",
    projectileKind: "laser_bolt",
    weaponStyle: "ship_laser",
    weaponColor: ship.color || "#67f0ff",
    attackerId: attributeClient?.player?.id || ship.id,
    x: Number(ox.toFixed(3)),
    y: Number(oy.toFixed(3)),
    facing: Number(facing.toFixed(3)),
    range: reach,
    hit: Boolean(bestMob || hitAsteroid),
    endX: Number(endX.toFixed(3)),
    endY: Number(endY.toFixed(3))
  };

  if (hitAsteroid) {
    const damage = Math.max(1, Math.round(turretDamage * 0.85));
    const result = applyAsteroidDamage(asteroidHit.rock, damage, now);
    event.targetId = asteroidHit.rock.id;
    event.targetKind = "asteroid";
    event.damage = result.damage;
    event.targetHp = result.targetHp;
    if (result.destroyed) event.defeated = true;
  } else if (bestMob) {
    const damage = Math.max(1, Math.round(turretDamage + bestMob.level));
    const result = applyShipMobDamage(bestMob, damage, now, ox, oy);
    event.targetId = bestMob.id;
    event.targetKind = "mob";
    event.damage = result.damage;
    event.shieldDamage = result.shieldDamage;
    event.shieldHit = result.shieldHit;
    event.targetHp = result.targetHp;
    event.targetShieldHp = result.targetShieldHp;
    if (bestMob.isShipPirate) alertPirateFleet(bestMob);
    if (bestMob.hp <= 0) {
      if (attributeClient) {
        awardMobDefeatToClient(attributeClient, bestMob, event, now);
      } else {
        bestMob.dead = true;
        bestMob.respawnAt = now + MOB_RESPAWN_MS;
        event.defeated = true;
      }
    }
  }

  broadcastCombat(event);
  return Boolean(bestMob || hitAsteroid);
}

function angleToShieldFacing(angle) {
  const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  if (a < Math.PI / 4 || a >= (7 * Math.PI) / 4) return "right";
  if (a < (3 * Math.PI) / 4) return "back";
  if (a < (5 * Math.PI) / 4) return "left";
  return "front";
}

// One AI tick for a ship's NPC crew: gunners auto-fire their drone, engineers
// hold shields up and patch the hull.
function tickShipCrew(ownerClient, ship, aiDt, now) {
  ensureShipCrew(ship);
  if (!Array.isArray(ship.crew) || !ship.crew.length) return;
  const layout = getShipLayout(ship);
  const count = getShipDroneCount(ship);
  const center = shipCenter(ship);

  // Nearest hostile (ship pirate) once per ship, reused by all crew.
  let threat = null;
  let threatDist = Infinity;
  forEachMobNear(center.x, center.y, SHIP_CREW_NPC_TARGET_RANGE + 4, (mob) => {
    if (mob.dead || !mob.isShipPirate) return;
    const d = Math.hypot(mob.x - center.x, mob.y - center.y);
    if (d > SHIP_CREW_NPC_TARGET_RANGE) return;
    if (d < threatDist) {
      threatDist = d;
      threat = mob;
    }
  });

  for (const crew of ship.crew) {
    if (!crew.stationId) continue;
    const station = layout.stations.find((s) => s.id === crew.stationId);
    if (!station) continue;
    // A player sitting here takes over; the NPC stands by.
    if (shipStationPlayerOccupant(ship, station.id)) continue;

    if (station.role === "gunner" && threat) {
      if (now - (crew.lastFireAt || 0) >= SHIP_CREW_NPC_FIRE_COOLDOWN_MS) {
        crew.lastFireAt = now;
        const droneIndex = Number.isFinite(station.droneIndex) ? station.droneIndex : 0;
        crew.facing = Math.atan2(threat.y - center.y, threat.x - center.x);
        fireOneShipDrone(ship, ownerClient, droneIndex, count, threat.x, threat.y, now);
      }
    } else if (station.role === "engineer") {
      const maxShields = getShipMaxShields(ship);
      ship.shields = Math.min(maxShields, (Number(ship.shields) || 0) + CAPITAL_SHIP_SHIELD_REGEN_AMOUNT * aiDt);
      const maxHealth = getShipMaxHealth(ship);
      ship.health = Math.min(maxHealth, (Number(ship.health) || 0) + SHIP_REPAIR_PER_SECOND * 0.5 * aiDt);
      if (threat) {
        ship.shieldSections = sanitizeShipShieldSections(ship);
        ship.shieldSections[station.id] = angleToShieldFacing(Math.atan2(threat.y - center.y, threat.x - center.x));
      }
    }
  }
}

function tickAllShipCrews(aiDt, now) {
  for (const c of clients.values()) {
    const ship = c.player?.ship;
    if (!ship?.boarded) continue;
    tickShipCrew(c, ship, aiDt, now);
  }
}

function handleShipCrewCommand(client, message = {}) {
  const player = client.player;
  if (!player) return;
  let ship = player.ship?.boarded ? player.ship : null;
  if (!ship && typeof player.aboardShipId === "string" && player.aboardShipId) {
    const found = findShipById(player.aboardShipId);
    if (found?.ship?.boarded) ship = found.ship;
  }
  if (!ship || !ship.deckMode) return;
  ensureShipCrew(ship);
  const crew = ship.crew.find((c) => c.id === (typeof message.crewId === "string" ? message.crewId : null));
  if (!crew) return;
  const layout = getShipLayout(ship);
  const center = shipCenter(ship);
  const cx = center.x + (Number(crew.localX) || 0);
  const cy = center.y + (Number(crew.localY) || 0);
  if (Math.hypot(player.x - cx, player.y - cy) > 3.2) return;

  const requested = typeof message.stationId === "string" ? message.stationId : null;
  const requestedRole = typeof message.role === "string" ? message.role : null;
  const idleKind = typeof message.idleKind === "string" ? message.idleKind : null;
  if (idleKind === "bed" || requested === "bed") {
    crew.stationId = null;
    crew.idleKind = "bed";
  } else if (idleKind === "galley" || requested === "galley" || requested === "kitchen") {
    crew.stationId = null;
    crew.idleKind = "galley";
  } else if (idleKind === "chill" || requested === "chill" || requested === "chilling" || requested === "idle") {
    crew.stationId = null;
    crew.idleKind = "chill";
  } else if (requestedRole === "gunner" || requestedRole === "engineer") {
    const station = layout.stations.find((s) =>
      s.role === requestedRole &&
      !shipStationPlayerOccupant(ship, s.id) &&
      (!shipStationNpcOccupant(ship, s.id) || shipStationNpcOccupant(ship, s.id).id === crew.id)
    );
    if (!station) {
      send(client, { type: "serverMessage", message: "ship_crew_no_station", role: requestedRole });
      return;
    }
    const other = shipStationNpcOccupant(ship, station.id);
    if (other && other.id !== crew.id) {
      other.stationId = null;
      other.idleKind = "chill";
    }
    crew.stationId = station.id;
    crew.idleKind = "chill";
  } else {
    const station = layout.stations.find((s) => s.id === requested);
    if (!station || station.role === "pilot") return;
    if (shipStationPlayerOccupant(ship, station.id)) return;
    const other = shipStationNpcOccupant(ship, station.id);
    if (other && other.id !== crew.id) {
      other.stationId = null;
      other.idleKind = "chill";
    }
    crew.stationId = station.id;
    crew.idleKind = "chill";
  }
  placeShipCrew(ship, layout);
  const stationName = crew.stationId
    ? (layout.stations.find((s) => s.id === crew.stationId)?.name || "station")
    : crew.idleKind === "bed" ? "bed" : crew.idleKind === "galley" ? "galley" : "chilling";
  send(client, { type: "serverMessage", message: "ship_crew_assigned", crewName: crew.name, stationName });
  broadcastSnapshot();
}

function getShipMaxHealth(ship) {
  const layout = getShipLayout(ship);
  return Math.max(80, Math.round(90 + layout.crewCapacity * 55 + (Number(ship?.laserTier) || 1) * 8));
}

function getShipMaxShields(ship) {
  const layout = getShipLayout(ship);
  return Math.max(45, Math.round(45 + layout.crewCapacity * 32 + (Number(ship?.thrustTier) || 1) * 6));
}

function normalizeShieldFacing(value) {
  const dir = String(value || "front");
  return ["front", "right", "back", "left"].includes(dir) ? dir : "front";
}

function defaultShipShieldSections(shipOrClass = "skiff") {
  const layout = getShipLayout(shipOrClass);
  const fallbackDirections = ["front", "back", "right", "left"];
  const sections = {};
  let index = 0;
  for (const station of layout.stations || []) {
    if (station.role !== "engineer") continue;
    sections[station.id] = normalizeShieldFacing(station.defaultShieldFacing || fallbackDirections[index] || "front");
    index += 1;
  }
  return sections;
}

function sanitizeShipShieldSections(shipOrClass = "skiff") {
  const defaults = defaultShipShieldSections(shipOrClass);
  const source = shipOrClass && typeof shipOrClass === "object" && shipOrClass.shieldSections && typeof shipOrClass.shieldSections === "object"
    ? shipOrClass.shieldSections
    : {};
  for (const id of Object.keys(defaults)) {
    defaults[id] = normalizeShieldFacing(source[id] || defaults[id]);
  }
  return defaults;
}

function shieldFacingFromInput(input = {}) {
  const dx = Number(input.right) - Number(input.left);
  const dy = Number(input.down) - Number(input.up);
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : dx < 0 ? "left" : null;
  }
  if (dy !== 0) {
    return dy > 0 ? "back" : "front";
  }
  return null;
}

function shipCenter(ship) {
  return {
    x: clampNumber(ship?.worldX, -10000, 10000, ship?.dockX ?? STARGATE_LANDING.x),
    y: clampNumber(ship?.worldY, -10000, 10000, ship?.dockY ?? STARGATE_LANDING.y)
  };
}

function setPlayerShipLocal(player, localX, localY) {
  player.shipLocalX = Number.isFinite(localX) ? localX : 0;
  player.shipLocalY = Number.isFinite(localY) ? localY : 0;
}

function syncPlayerToShipLocal(player) {
  const ship = player?.ship;
  if (!ship?.boarded || !ship.deckMode) return;
  const center = shipCenter(ship);
  const localX = Number(player.shipLocalX);
  const localY = Number(player.shipLocalY);
  player.x = center.x + (Number.isFinite(localX) ? localX : 0);
  player.y = center.y + (Number.isFinite(localY) ? localY : 0);
}

function shipStationWorld(ship, station) {
  const center = shipCenter(ship);
  return { x: center.x + Number(station?.x || 0), y: center.y + Number(station?.y || 0) };
}

// Polygon points in normalised [-1..1] space relative to the deck centre,
// mirroring the visual hull silhouette drawn by buildShipHullPath on the client.
function getShipHullPolygon(hullClass) {
  if (hullClass === "crew2" || hullClass === "crew3" || hullClass === "crew4" ||
      hullClass === "corvette" || hullClass === "cruiser" || hullClass === "frigate") {
    // Roomy, symmetric crew deck: pointed bow, wide body, flat stern.
    return [[0.96, 0],[0.55,-0.55],[-0.55,-0.62],[-0.90,-0.30],[-0.90,0.30],[-0.55,0.62],[0.55,0.55]];
  }
  if (hullClass === "hauler" || hullClass === "freighter") {
    return [[-0.90, 0.24],[-0.60,-0.62],[0.56,-0.62],[0.94,-0.04],[0.56,0.62],[-0.60,0.62]];
  }
  if (hullClass === "fighter" || hullClass === "interceptor" || hullClass === "needle") {
    return [[-0.94, 0],[-0.32,-0.70],[0.94, 0],[-0.32, 0.70]];
  }
  if (hullClass === "yacht") {
    // Cubic-bezier silhouette approximated with sampled points.
    const pts = [];
    const sample = (p0, p1, p2, p3, steps = 14) => {
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        const u = 1 - t;
        pts.push([
          u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
          u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]
        ]);
      }
    };
    pts.push([-0.86, 0.16]);
    sample([-0.86, 0.16], [-0.50,-0.90], [0.44,-0.90], [0.92, 0]);
    sample([0.92, 0],     [0.48, 0.94], [-0.56, 0.94], [-0.86, 0.16]);
    return pts;
  }
  return [[-0.82, 0.36],[-0.50,-0.34],[0.20,-0.62],[0.88, 0.04],[0.40, 0.78],[-0.44, 0.56]];
}

function pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-9) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function projectPointToPolygonEdge(px, py, polygon) {
  let bestX = polygon[0][0];
  let bestY = polygon[0][1];
  let bestDist = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const x1 = polygon[j][0], y1 = polygon[j][1];
    const x2 = polygon[i][0], y2 = polygon[i][1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const d2 = (projX - px) * (projX - px) + (projY - py) * (projY - py);
    if (d2 < bestDist) {
      bestDist = d2;
      bestX = projX;
      bestY = projY;
    }
  }
  return [bestX, bestY];
}

function clampShipLocalToHull(localX, localY, ship, layout = getShipLayout(ship)) {
  const halfW = Math.max(0.5, layout.deckW / 2);
  const halfH = Math.max(0.5, layout.deckH / 2);
  // Convert ship-local tile coords to the normalised hull space.
  let nx = localX / halfW;
  let ny = localY / halfH;
  const polygon = getShipHullPolygon(ship?.hullClass || "skiff");
  // Margin keeps the player a tile shy of the visible hull edge.
  const margin = 0.12;
  if (pointInPolygon(nx, ny, polygon)) {
    // Even when inside, refuse to stand within `margin` of the closest edge so the
    // collision feels like a wall rather than a sticky boundary.
    const [ex, ey] = projectPointToPolygonEdge(nx, ny, polygon);
    const dx = nx - ex;
    const dy = ny - ey;
    const dist = Math.hypot(dx, dy);
    if (dist < margin && dist > 1e-4) {
      const push = (margin - dist);
      nx -= (dx / dist) * push * -1; // push back inward
      ny -= (dy / dist) * push * -1;
    }
  } else {
    const [ex, ey] = projectPointToPolygonEdge(nx, ny, polygon);
    // Pull a hair inside the edge so we don't oscillate on the boundary.
    const cx = 0, cy = 0;
    const tx = ex - cx;
    const ty = ey - cy;
    const len = Math.hypot(tx, ty) || 1;
    nx = ex - (tx / len) * margin;
    ny = ey - (ty / len) * margin;
  }
  return [nx * halfW, ny * halfH];
}

function clampPlayerToShipDeck(player) {
  const ship = player?.ship;
  if (!ship) return;
  const layout = getShipLayout(ship);
  const [clampedX, clampedY] = clampShipLocalToHull(
    Number(player.shipLocalX) || 0,
    Number(player.shipLocalY) || 0,
    ship,
    layout
  );
  player.shipLocalX = clampedX;
  player.shipLocalY = clampedY;
  syncPlayerToShipLocal(player);
}

function nearestShipStation(player, message = {}) {
  const ship = player?.ship;
  if (!ship?.boarded || !ship.deckMode) return null;
  const layout = getShipLayout(ship);
  const tx = Number(message.x);
  const ty = Number(message.y);
  const useTarget = Number.isFinite(tx) && Number.isFinite(ty);
  let best = null;
  let bestDist = Infinity;
  for (const station of layout.stations) {
    const p = shipStationWorld(ship, station);
    const dist = Math.hypot((useTarget ? tx : player.x) - p.x, (useTarget ? ty : player.y) - p.y);
    const playerReach = Math.hypot(player.x - p.x, player.y - p.y);
    const clickReach = useTarget ? 1.15 : SHIP_STATION_INTERACT_RADIUS;
    if (dist <= clickReach && playerReach <= 6.5 && dist < bestDist) {
      bestDist = dist;
      best = { ...station, worldX: p.x, worldY: p.y };
    }
  }
  return best;
}

function isPilotShipRole(role) {
  return role === "pilot" || role === "captain" || role === "copilot";
}

function createShipId(templateId = "ship") {
  const base = String(templateId || "ship").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32) || "ship";
  return `${base}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`.slice(0, 64);
}

function createStarterShip(playerId = "starter") {
  const dp =
    sciFiDockPortForPlayerId(playerId) ||
    findNearestSciFiDockPort(STARGATE_LANDING.x, STARGATE_LANDING.y, 120);
  const ship = {
    id: "starter_ship",
    templateId: "starter_ship",
    name: "Nova Skiff",
    color: "#67f0ff",
    hullClass: "skiff",
    boarded: false,
    dockX: dp.x,
    dockY: dp.y,
    dockStationId: "station_ringforge",
    dockPortId: dp.id,
    worldX: dp.x,
    worldY: dp.y,
    facing: facingForDockPort(dp),
    speed: SHIP_SPEED,
    laserTier: 1,
    thrustTier: 1,
    deckMode: false,
    stationRole: null,
    stationId: null,
    shieldFacing: "front"
  };
  ship.shieldSections = defaultShipShieldSections(ship);
  ship.maxHealth = getShipMaxHealth(ship);
  ship.health = ship.maxHealth;
  ship.maxShields = getShipMaxShields(ship);
  ship.shields = ship.maxShields;
  ensureShipCrew(ship);
  return ship;
}

function sanitizeShip(ship, fallbackId = null) {
  if (!ship || typeof ship !== "object") {
    return null;
  }
  const templateId = typeof ship.templateId === "string" ? ship.templateId.slice(0, 48) : "starter_ship";
  const out = {
    id: typeof ship.id === "string" && ship.id ? ship.id.slice(0, 64) : fallbackId || createShipId(templateId),
    templateId,
    name: typeof ship.name === "string" ? ship.name.slice(0, 48) : "Nova Skiff",
    color: typeof ship.color === "string" ? ship.color.slice(0, 22) : "#67f0ff",
    hullClass: typeof ship.hullClass === "string" ? ship.hullClass.slice(0, 24) : "skiff",
    boarded: Boolean(ship.boarded),
    dockX: clampNumber(ship.dockX, -SHIP_COORD_LIMIT, SHIP_COORD_LIMIT, STARGATE_LANDING.x),
    dockY: clampNumber(ship.dockY, -SHIP_COORD_LIMIT, SHIP_COORD_LIMIT, STARGATE_LANDING.y),
    dockStationId: typeof ship.dockStationId === "string" ? ship.dockStationId.slice(0, 48) : "station_ringforge",
    dockPortId: typeof ship.dockPortId === "string" ? ship.dockPortId.slice(0, 48) : null,
    worldX: clampNumber(ship.worldX, -SHIP_COORD_LIMIT, SHIP_COORD_LIMIT, ship.dockX ?? STARGATE_LANDING.x),
    worldY: clampNumber(ship.worldY, -SHIP_COORD_LIMIT, SHIP_COORD_LIMIT, ship.dockY ?? STARGATE_LANDING.y),
    facing: normalizeAngle(clampNumber(ship.facing, -Math.PI * 2, Math.PI * 2, 0)),
    speed: clampNumber(ship.speed, 0, 1000, SHIP_SPEED),
    laserTier: clampInteger(ship.laserTier ?? 1, 1, 5),
    thrustTier: clampInteger(ship.thrustTier ?? 1, 1, 5),
    deckMode: Boolean(ship.deckMode),
    stationRole: typeof ship.stationRole === "string" ? ship.stationRole.slice(0, 24) : null,
    stationId: typeof ship.stationId === "string" ? ship.stationId.slice(0, 48) : null,
    shieldFacing: normalizeShieldFacing(ship.shieldFacing),
    shieldSections: sanitizeShipShieldSections(ship),
    crew: Array.isArray(ship.crew)
      ? ship.crew.slice(0, 8).map((c, i) => ({
          id: typeof c?.id === "string" ? c.id.slice(0, 24) : `crew_${i}`,
          name: typeof c?.name === "string" && c.name.trim() && c.name !== "Crew" ? c.name.slice(0, 24) : shipCrewNameFor(ship, i),
          color: typeof c?.color === "string" ? c.color.slice(0, 22) : "#5cc8ff",
          stationId: typeof c?.stationId === "string" ? c.stationId.slice(0, 48) : null,
          idleKind: c?.idleKind === "bed" ? "bed" : c?.idleKind === "galley" ? "galley" : "chill"
        }))
      : [],
    warp: sanitizeShipWarp(ship.warp)
  };
  out.maxHealth = getShipMaxHealth(out);
  out.health = clampNumber(ship.health, 0, out.maxHealth, out.maxHealth);
  out.maxShields = getShipMaxShields(out);
  out.shields = clampNumber(ship.shields, 0, out.maxShields, out.maxShields);
  return out;
}

function sanitizeShipFleet(savedCharacter, ownerKey = "starter") {
  const fallbackShip =
    sanitizeShip(savedCharacter?.ship, typeof savedCharacter?.ship?.id === "string" ? savedCharacter.ship.id : "starter_ship") ||
    createStarterShip(ownerKey);
  const rawShips = Array.isArray(savedCharacter?.ships) ? savedCharacter.ships : [];
  const ships = rawShips
    .map((ship, index) => sanitizeShip(ship, index === 0 ? fallbackShip.id : null))
    .filter(Boolean);

  if (!ships.length && fallbackShip) {
    ships.push(fallbackShip);
  }
  if (!ships.length) {
    ships.push(createStarterShip(ownerKey));
  }

  const seen = new Set();
  for (const ship of ships) {
    if (!ship.id || seen.has(ship.id)) {
      ship.id = createShipId(ship.templateId);
    }
    seen.add(ship.id);
  }

  const requestedActiveId =
    typeof savedCharacter?.activeShipId === "string"
      ? savedCharacter.activeShipId
      : typeof savedCharacter?.ship?.id === "string"
        ? savedCharacter.ship.id
        : fallbackShip?.id;
  const activeShip = ships.find((ship) => ship.id === requestedActiveId) || ships[0];
  for (const ship of ships) {
    if (ship !== activeShip) {
      ship.boarded = false;
    }
  }

  return {
    ships,
    activeShipId: activeShip.id,
    activeShip
  };
}

function ensurePlayerFleet(player) {
  if (!player) {
    return null;
  }
  if (!Array.isArray(player.ships) || !player.ships.length) {
    player.ships = [player.ship ? sanitizeShip(player.ship, player.ship.id || "starter_ship") : createStarterShip(player.id)];
  }
  const activeShip = player.ships.find((ship) => ship.id === player.activeShipId) || player.ships[0];
  player.activeShipId = activeShip.id;
  player.ship = activeShip;
  return activeShip;
}

function selectPlayerShip(player, shipId, { clearOtherBoarded = true } = {}) {
  if (!player) {
    return null;
  }
  ensurePlayerFleet(player);
  const ship = player.ships.find((candidate) => candidate.id === shipId);
  if (!ship) {
    return null;
  }
  if (clearOtherBoarded) {
    for (const candidate of player.ships) {
      if (candidate !== ship) {
        candidate.boarded = false;
      }
    }
  }
  player.activeShipId = ship.id;
  player.ship = ship;
  return ship;
}

function clearPlayerBoardedShips(player) {
  if (!player) {
    return;
  }
  player.boardedShip = null;
  player.aboardShipId = null;
  player.shipStationRole = null;
  player.shipStationId = null;
  player.shipLocalX = 0;
  player.shipLocalY = 0;
  if (Array.isArray(player.ships)) {
    for (const ship of player.ships) {
      ship.boarded = false;
      ship.deckMode = false;
      ship.stationRole = null;
      ship.stationId = null;
      ship.docking = null;
      ship.warp = null;
    }
  }
  if (player.ship) {
    player.ship.boarded = false;
    player.ship.deckMode = false;
    player.ship.stationRole = null;
    player.ship.stationId = null;
    player.ship.docking = null;
    player.ship.warp = null;
  }
}

function getPlayerDockPort(player) {
  if (!player?.id) {
    return null;
  }
  const port = sciFiDockPortForPlayerId(player.id);
  if (!port) {
    return null;
  }
  return {
    id: port.id,
    x: port.x,
    y: port.y,
    facing: port.facing,
    terminalX: port.terminalX,
    terminalY: port.terminalY
  };
}

function getPartsCatalog() {
  return [
    {
      templateId: "part_emitter_focus",
      type: "ship_upgrade",
      name: "Emitter focus (+laser tier)",
      price: 140,
      rarity: "rare",
      upgrade: "laser"
    },
    {
      templateId: "part_vector_coils",
      type: "ship_upgrade",
      name: "Vector coils (+thrust tier)",
      price: 130,
      rarity: "rare",
      upgrade: "thrust"
    },
    {
      templateId: "part_injector_tune",
      type: "ship_upgrade",
      name: "Injector tuning (+speed)",
      price: 160,
      rarity: "uncommon",
      upgrade: "speed"
    }
  ];
}

function getShipCatalog() {
  return [
    {
      templateId: "dock_skiff",
      type: "ship",
      name: "Dock Skiff",
      icon: "ship",
      rarity: "rare",
      color: "#67f0ff",
      hullClass: "skiff",
      value: 650,
      price: 650,
      shipTemplateId: "dock_skiff",
      shipName: "Dock Skiff",
      shipColor: "#67f0ff",
      stats: { speed: 14 }
    },
    {
      templateId: "station_runner",
      type: "ship",
      name: "Station Runner",
      icon: "ship",
      rarity: "epic",
      color: "#9edfff",
      hullClass: "runner",
      value: 1200,
      price: 1200,
      shipTemplateId: "station_runner",
      shipName: "Station Runner",
      shipColor: "#9edfff",
      stats: { speed: 16 }
    },
    {
      templateId: "comet_courier",
      type: "ship",
      name: "Comet Courier",
      icon: "ship",
      rarity: "rare",
      color: "#8affd2",
      hullClass: "courier",
      value: 980,
      price: 980,
      shipTemplateId: "comet_courier",
      shipName: "Comet Courier",
      shipColor: "#8affd2",
      stats: { speed: 15.5 },
      thrustTier: 2
    },
    {
      templateId: "vesper_fighter",
      type: "ship",
      name: "Vesper Fighter",
      icon: "ship",
      rarity: "epic",
      color: "#ff8f6b",
      hullClass: "fighter",
      value: 1850,
      price: 1850,
      shipTemplateId: "vesper_fighter",
      shipName: "Vesper Fighter",
      shipColor: "#ff8f6b",
      stats: { speed: 17.25 },
      laserTier: 2
    },
    {
      templateId: "asterion_hauler",
      type: "ship",
      name: "Asterion Hauler",
      icon: "ship",
      rarity: "uncommon",
      color: "#f7d86a",
      hullClass: "hauler",
      value: 1150,
      price: 1150,
      shipTemplateId: "asterion_hauler",
      shipName: "Asterion Hauler",
      shipColor: "#f7d86a",
      stats: { speed: 12.75 },
      laserTier: 2
    },
    {
      templateId: "eclipse_interceptor",
      type: "ship",
      name: "Eclipse Interceptor",
      icon: "ship",
      rarity: "legendary",
      color: "#c084fc",
      hullClass: "interceptor",
      value: 3100,
      price: 3100,
      shipTemplateId: "eclipse_interceptor",
      shipName: "Eclipse Interceptor",
      shipColor: "#c084fc",
      stats: { speed: 19.5 },
      laserTier: 3,
      thrustTier: 3
    },
    {
      templateId: "nebula_yacht",
      type: "ship",
      name: "Nebula Yacht",
      icon: "ship",
      rarity: "epic",
      color: "#fbcfe8",
      hullClass: "yacht",
      value: 2400,
      price: 2400,
      shipTemplateId: "nebula_yacht",
      shipName: "Nebula Yacht",
      shipColor: "#fbcfe8",
      stats: { speed: 15.75 },
      thrustTier: 2
    },
    {
      templateId: "titan_freighter",
      type: "ship",
      name: "Titan Freighter",
      icon: "ship",
      rarity: "legendary",
      color: "#94a3b8",
      hullClass: "freighter",
      value: 3600,
      price: 3600,
      shipTemplateId: "titan_freighter",
      shipName: "Titan Freighter",
      shipColor: "#94a3b8",
      stats: { speed: 13.5 },
      laserTier: 4
    },
    {
      templateId: "duo_corvette",
      type: "ship",
      name: "Duo Corvette",
      icon: "ship",
      rarity: "epic",
      color: "#58d5ff",
      hullClass: "crew2",
      value: 2850,
      price: 2850,
      shipTemplateId: "duo_corvette",
      shipName: "Duo Corvette",
      shipColor: "#58d5ff",
      stats: { speed: 14.4 },
      laserTier: 3,
      thrustTier: 2
    },
    {
      templateId: "trident_cruiser",
      type: "ship",
      name: "Trident Cruiser",
      icon: "ship",
      rarity: "legendary",
      color: "#7ce0c0",
      hullClass: "crew3",
      value: 3750,
      price: 3750,
      shipTemplateId: "trident_cruiser",
      shipName: "Trident Cruiser",
      shipColor: "#7ce0c0",
      stats: { speed: 13.6 },
      laserTier: 3,
      thrustTier: 3
    },
    {
      templateId: "aegis_frigate",
      type: "ship",
      name: "Aegis Frigate",
      icon: "ship",
      rarity: "legendary",
      color: "#a7f3d0",
      hullClass: "crew4",
      value: 4650,
      price: 4650,
      shipTemplateId: "aegis_frigate",
      shipName: "Aegis Frigate",
      shipColor: "#a7f3d0",
      stats: { speed: 12.4 },
      laserTier: 4,
      thrustTier: 3
    },
    {
      templateId: "wraith_needle",
      type: "ship",
      name: "Wraith Needle",
      icon: "ship",
      rarity: "mythic",
      color: "#d9fbff",
      hullClass: "needle",
      value: 5200,
      price: 5200,
      shipTemplateId: "wraith_needle",
      shipName: "Wraith Needle",
      shipColor: "#d9fbff",
      stats: { speed: 22 },
      laserTier: 4,
      thrustTier: 4
    }
  ];
}

function getSciFiArmoryCatalog() {
  return [
    {
      templateId: "scifi_weapon_lightsaber_aqua",
      type: "weapon",
      name: "Aqua Lightsaber",
      icon: "lightsaber",
      rarity: "rare",
      color: "#67f0ff",
      weaponKind: "sword",
      visual: { weaponStyle: "saber", weaponColor: "#67f0ff" },
      value: 210,
      stats: { damage: 13, speed: 0.18 }
    },
    {
      templateId: "scifi_weapon_sunblade",
      type: "weapon",
      name: "Solar Arc Saber",
      icon: "lightsaber",
      rarity: "epic",
      color: "#fbbf24",
      weaponKind: "sword",
      visual: { weaponStyle: "saber", weaponColor: "#fbbf24" },
      value: 380,
      stats: { damage: 19, strength: 1 }
    },
    {
      templateId: "scifi_weapon_pulse_rifle",
      type: "weapon",
      name: "VX-9 Pulse Rifle",
      icon: "laser-rifle",
      rarity: "rare",
      color: "#9edfff",
      weaponKind: "staff",
      visual: { weaponStyle: "pulse", weaponColor: "#9edfff" },
      value: 260,
      stats: { damage: 15, strength: 1 }
    },
    {
      templateId: "scifi_weapon_ion_lance",
      type: "weapon",
      name: "Ion Lance Rifle",
      icon: "laser-rifle",
      rarity: "epic",
      color: "#c084fc",
      weaponKind: "staff",
      visual: { weaponStyle: "ion", weaponColor: "#c084fc" },
      value: 430,
      stats: { damage: 21, strength: 2 }
    },
    {
      templateId: "scifi_weapon_blaster_carbine",
      type: "weapon",
      name: "Blaster Carbine",
      icon: "blaster",
      rarity: "uncommon",
      color: "#8affd2",
      weaponKind: "bow",
      visual: { weaponStyle: "plasma", weaponColor: "#8affd2" },
      value: 180,
      stats: { damage: 11, speed: 0.22 }
    },
    {
      templateId: "scifi_weapon_rail_caster",
      type: "weapon",
      name: "Rail Caster",
      icon: "blaster",
      rarity: "legendary",
      color: "#ff8f6b",
      weaponKind: "bow",
      visual: { weaponStyle: "rail", weaponColor: "#ff8f6b" },
      value: 740,
      stats: { damage: 28, strength: 2, speed: 0.18 }
    },
    {
      templateId: "scifi_armor_exo_scout",
      type: "armor",
      name: "Scout Exo Armor",
      icon: "exo-armor",
      rarity: "uncommon",
      color: "#67f0ff",
      visual: { torsoStyle: "sciFi", torsoColor: "#2b4f62" },
      value: 190,
      stats: { health: 18, armour: 2, speed: 0.16 }
    },
    {
      templateId: "scifi_armor_voidplate",
      type: "armor",
      name: "Voidplate Harness",
      icon: "exo-armor",
      rarity: "rare",
      color: "#c084fc",
      visual: { torsoStyle: "sciFi", torsoColor: "#43315f" },
      value: 320,
      stats: { health: 28, armour: 4 }
    },
    {
      templateId: "scifi_armor_titan_shell",
      type: "armor",
      name: "Titan Shell Armor",
      icon: "exo-armor",
      rarity: "epic",
      color: "#f7d86a",
      visual: { torsoStyle: "sciFi", torsoColor: "#4e4b39" },
      value: 560,
      stats: { health: 42, armour: 6, strength: 1 }
    },
    {
      templateId: "scifi_armor_phaseweave",
      type: "armor",
      name: "Phaseweave Suit",
      icon: "exo-armor",
      rarity: "legendary",
      color: "#d9fbff",
      visual: { torsoStyle: "sciFi", torsoColor: "#263748" },
      value: 920,
      stats: { health: 56, armour: 5, speed: 0.38 }
    }
  ];
}

function sanitizeHomeBuildingKey(raw) {
  if (typeof raw !== "string") {
    return null;
  }
  const m = /^(-?\d+),(-?\d+)$/.exec(raw.trim());
  if (!m) {
    return null;
  }
  return `${m[1]},${m[2]}`;
}

function buildHouseCompanionFromTemplate(tpl) {
  if (!tpl || typeof tpl !== "object") {
    return null;
  }
  const bondTag = tpl.bondTag === "bf" ? "bf" : "gf";
  const row = {
    npcId: tpl.id,
    name: tpl.name,
    bondTag,
    classId: tpl.classId,
    primary: tpl.primary,
    accent: tpl.accent
  };
  if (bondTag === "gf") {
    row.longHair = true;
    row.romanceSilhouette = "soft_curves";
  }
  return row;
}

function sanitizeHouseCompanion(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const npcId = typeof raw.npcId === "string" ? raw.npcId.slice(0, 96) : null;
  if (!npcId) {
    return null;
  }
  const bondTag = raw.bondTag === "bf" ? "bf" : "gf";
  const out = {
    npcId,
    name: sanitizeName(raw.name),
    bondTag,
    classId: sanitizeChoice(raw.classId, CLASS_IDS, "ranger"),
    primary: sanitizeColor(raw.primary, "#fca5a5"),
    accent: sanitizeColor(raw.accent, "#ffd166")
  };
  if (bondTag === "gf") {
    out.longHair = true;
    out.romanceSilhouette = "soft_curves";
  }
  return out;
}

function sendCompanionPurchaseOffer(npc, shoppingClient, nowMs) {
  const p = shoppingClient.player;
  if (!npc || typeof npc.companionPrice !== "number" || !p || p.houseCompanion) {
    return;
  }
  const gate = `${npc.id}:${p.id}`;
  if (shoppingClient._companionGateKey === gate && (shoppingClient._companionGateUntil || 0) > nowMs) {
    return;
  }
  shoppingClient._companionGateKey = gate;
  shoppingClient._companionGateUntil = nowMs + 90000;

  send(shoppingClient, {
    type: "companionOffer",
    npcId: npc.id,
    npcName: npc.name,
    bondTag: npc.bondTag === "bf" ? "bf" : "gf",
    price: npc.companionPrice,
    line:
      npc.bondTag === "bf"
        ? "...Could I move in with you? It costs a little coin — I'd make it worth your while."
        : "...I've been circling half the square. If you'd have me stay at your hearth, here's my pledge."
  });
}

function handleBuyCompanion(client, message) {
  const p = client.player;
  if (!p || !client.account || !message || message.confirm !== true) {
    return;
  }
  const npcId = typeof message.npcId === "string" ? message.npcId.slice(0, 96) : null;
  const tpl = getCompanionNpcTemplate(npcId);
  const npcLive = tpl ? getNpcById(npcId) : null;
  if (!tpl || !npcLive || typeof tpl.companionPrice !== "number") {
    send(client, { type: "serverMessage", message: "companion_unavailable" });
    return;
  }
  const key = typeof p.homeBuildingKey === "string" ? sanitizeHomeBuildingKey(p.homeBuildingKey) : null;
  if (!key) {
    send(client, { type: "serverMessage", message: "companion_need_house" });
    return;
  }
  const own = ownedBuildings.get(key);
  if (!own || own.ownerAccountKey !== client.account.key) {
    send(client, { type: "serverMessage", message: "companion_need_house" });
    return;
  }
  if (p.houseCompanion) {
    send(client, { type: "serverMessage", message: "companion_already" });
    return;
  }

  const dist = Math.hypot(npcLive.x - p.x, npcLive.y - p.y);
  if (dist > 3.2) {
    send(client, { type: "serverMessage", message: "companion_too_far" });
    return;
  }

  if (p.gold < tpl.companionPrice) {
    send(client, { type: "serverMessage", message: "companion_gold", price: tpl.companionPrice });
    return;
  }

  p.gold -= tpl.companionPrice;
  p.houseCompanion = buildHouseCompanionFromTemplate(tpl);
  registerCompanionSold(tpl.id);
  saveClientCharacter(client);
  broadcastSnapshot();
  pushChat({
    kind: "system",
    name: "Realm",
    text: `${tpl.name} moves into your house and waits beside the hearth whenever you step inside.`,
  });
}

function resolveOwnedHouseDoorOutside(building) {
  return { x: southDoorAnchorWorldX(building), y: building.y + building.h + 0.35 };
}

/** Interior tile (1,1): centre of top-left home-teleport tree slab. */
function getOwnedHouseHomeTreeWorldPos(building) {
  return { x: building.x + 1.5, y: building.y + 1.5 };
}

/** Interior tile (w−2, 1): centre of top-right house chest. */
function getOwnedHouseChestWorldPos(building) {
  const w = Math.max(1, building.w | 0);
  return { x: building.x + w - 2 + 0.5, y: building.y + 1.5 };
}

function resolveHomeTeleportDestination(player, accountKey) {
  const key = typeof player.homeBuildingKey === "string" ? player.homeBuildingKey : null;
  if (key && typeof accountKey === "string") {
    const ownership = ownedBuildings.get(key);
    if (ownership && ownership.ownerAccountKey === accountKey) {
      const building = BUILDING_LIST.find((b) => `${b.x},${b.y}` === key);
      if (building) {
        const dest = resolveOwnedHouseDoorOutside(building);
        return { x: dest.x, y: dest.y, name: building.name || "Home" };
      }
    }
  }
  const spawn = spawnPoint(nextSpawnIndex++);
  return { x: spawn.x, y: spawn.y, name: "Spawn" };
}

function initialTalentPoints(savedCharacter, isMod) {
  if (isMod) return 9999;
  if (!savedCharacter) return STARTING_TALENT_POINTS;

  const savedPoints = clampInteger(savedCharacter.talentPoints ?? 0, 0, 10000);
  const savedTalents = savedCharacter.talents && typeof savedCharacter.talents === "object"
    ? savedCharacter.talents
    : {};
  if (savedPoints === 0 && Object.keys(savedTalents).length === 0) {
    return STARTING_TALENT_POINTS;
  }
  return savedPoints;
}

function syncNextItemIdFromAccounts() {
  let maxId = 0;
  for (const account of Object.values(accountStore.accounts)) {
    const character = account.character;
    if (!character) continue;
    for (const item of [
      ...(Array.isArray(character.inventory) ? character.inventory : []),
      ...Object.values(character.equipment || {})
    ]) {
      const match = /^item_(\d+)$/.exec(item?.id || "");
      if (match) {
        maxId = Math.max(maxId, Number(match[1]));
      }
    }
  }
  nextItemId = Math.max(nextItemId, maxId + 1);
}

function syncNextItemIdFromHouseChestsDb() {
  let maxId = 0;
  try {
    const stmt = worldDb.prepare("SELECT slots_json FROM house_chests");
    for (const row of stmt.iterate()) {
      let arr;
      try {
        arr = JSON.parse(row.slots_json);
      } catch {
        continue;
      }
      if (!Array.isArray(arr)) {
        continue;
      }
      for (const cell of arr) {
        const match = /^item_(\d+)$/.exec(cell?.id || "");
        if (match) {
          maxId = Math.max(maxId, Number(match[1]));
        }
      }
    }
  } catch {
    // ignore DB issues during migration
  }
  nextItemId = Math.max(nextItemId, maxId + 1);
}

function recordSimulateWallInterval() {
  const now = Date.now();
  const delta = now - lastSimulateWallMs;
  lastSimulateWallMs = now;
  if (delta > 0 && delta < 500) {
    simulateWallIntervals.push(delta);
    while (simulateWallIntervals.length > SIM_WALL_SAMPLES_MAX) {
      simulateWallIntervals.shift();
    }
  }
}

function getMeasuredSimHz() {
  if (simulateWallIntervals.length < 5) {
    return null;
  }
  const avgMs = simulateWallIntervals.reduce((a, b) => a + b, 0) / simulateWallIntervals.length;
  return avgMs > 0 ? 1000 / avgMs : null;
}

/** Union of all logged-in players' view rectangles inflated by tileMargin on each edge (snapshot / AI culling). */
function computePlayerViewUnionBounds(tileMargin) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let any = false;
  for (const client of clients.values()) {
    if (!client.player) {
      continue;
    }
    any = true;
    const view = client.view || defaultViewForPlayer(client.player);
    minX = Math.min(minX, view.x - view.halfW - tileMargin);
    maxX = Math.max(maxX, view.x + view.halfW + tileMargin);
    minY = Math.min(minY, view.y - view.halfH - tileMargin);
    maxY = Math.max(maxY, view.y + view.halfH + tileMargin);
  }
  if (!any) {
    return null;
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Per-player view rectangles — one entry per logged-in player, no union.
 * Mob simulation uses this so distant players don't inflate the active zone
 * to cover the entire map between them.
 */
function computePlayerViewBoundsArray(tileMargin) {
  const result = [];
  for (const client of clients.values()) {
    if (!client.player) continue;
    const view = client.view || defaultViewForPlayer(client.player);
    const world = worldForPosition(client.player.x, client.player.y);
    result.push({
      minX: view.x - view.halfW - tileMargin,
      maxX: view.x + view.halfW + tileMargin,
      minY: view.y - view.halfH - tileMargin,
      maxY: view.y + view.halfH + tileMargin,
      world
    });
  }
  return result;
}

function computeMobActivationBoundsArray(tileMargin = MOB_ACTIVITY_MARGIN_TILES) {
  const result = [];
  for (const client of clients.values()) {
    const player = client.player;
    if (!player) continue;
    const world = worldForPosition(player.x, player.y);
    result.push({
      minX: player.x - tileMargin,
      maxX: player.x + tileMargin,
      minY: player.y - tileMargin,
      maxY: player.y + tileMargin,
      world
    });
  }
  return result;
}

function computeNpcActivationBounds() {
  const half = Math.ceil(Number(HUB_TOWN_GRASS_RADIUS) || 132) + NPC_HUB_AI_PAD_TILES;
  const hubAlways = { minX: -half, maxX: half, minY: -half, maxY: half };
  const pb = computePlayerViewUnionBounds(CHAT_VIEW_MARGIN_TILES);
  if (!pb) {
    /** No players online — still simulate hub crowd so NPCs do not freeze. */
    return hubAlways;
  }
  return {
    minX: Math.min(pb.minX, hubAlways.minX),
    maxX: Math.max(pb.maxX, hubAlways.maxX),
    minY: Math.min(pb.minY, hubAlways.minY),
    maxY: Math.max(pb.maxY, hubAlways.maxY)
  };
}

function mobShouldSimulate(mob, activityBounds) {
  if (!activityBounds) {
    return false;
  }
  const pad = (mob.roamRadius || 5) + 4;
  const hx0 = mob.homeX - pad;
  const hx1 = mob.homeX + pad;
  const hy0 = mob.homeY - pad;
  const hy1 = mob.homeY + pad;
  const homeOverlaps = !(hx1 < activityBounds.minX || hx0 > activityBounds.maxX || hy1 < activityBounds.minY || hy0 > activityBounds.maxY);
  if (homeOverlaps) {
    return true;
  }
  return (
    mob.x >= activityBounds.minX - pad &&
    mob.x <= activityBounds.maxX + pad &&
    mob.y >= activityBounds.minY - pad &&
    mob.y <= activityBounds.maxY + pad
  );
}

/** True if the mob should simulate for at least one player's view region. */
function mobShouldSimulateAny(mob, boundsArray) {
  for (const b of boundsArray) {
    if (mobShouldSimulate(mob, b)) return true;
  }
  return false;
}

function mobSpatialKeyFor(world, x, y, cellSize = MOB_SPATIAL_CELL_SIZE) {
  const cx = Math.floor(x / cellSize);
  const cy = Math.floor(y / cellSize);
  return `${world}|${cx},${cy}`;
}

function buildMobHomeBuckets(list) {
  const buckets = new Map();
  for (const mob of list) {
    addMobToHomeBuckets(buckets, mob);
  }
  return buckets;
}

function addMobToHomeBuckets(buckets, mob) {
  const world = worldForPosition(mob.homeX, mob.homeY);
  const key = mobSpatialKeyFor(world, mob.homeX, mob.homeY);
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = [];
    buckets.set(key, bucket);
  }
  bucket.push(mob);
}

function forEachMobHomeInBounds(bounds, visitor) {
  if (!bounds) return;
  const cellSize = MOB_SPATIAL_CELL_SIZE;
  const minCx = Math.floor((bounds.minX - MOB_SPATIAL_QUERY_PAD) / cellSize);
  const maxCx = Math.floor((bounds.maxX + MOB_SPATIAL_QUERY_PAD) / cellSize);
  const minCy = Math.floor((bounds.minY - MOB_SPATIAL_QUERY_PAD) / cellSize);
  const maxCy = Math.floor((bounds.maxY + MOB_SPATIAL_QUERY_PAD) / cellSize);
  const worlds = typeof bounds.world === "string" && bounds.world
    ? [bounds.world]
    : WORLD_IDS_WITH_MOBS;
  for (let cx = minCx; cx <= maxCx; cx += 1) {
    for (let cy = minCy; cy <= maxCy; cy += 1) {
      for (const world of worlds) {
        const bucket = mobHomeBuckets.get(`${world}|${cx},${cy}`);
        if (!bucket) continue;
        for (const mob of bucket) {
          visitor(mob);
        }
      }
    }
  }
}

function forEachMobCandidate(boundsArray, visitor) {
  const seen = new Set();
  for (const bounds of boundsArray || []) {
    forEachMobHomeInBounds(bounds, (mob) => {
      if (seen.has(mob.id)) return;
      seen.add(mob.id);
      visitor(mob);
    });
  }
  for (const mob of forceSimulateMobs) {
    if (seen.has(mob.id)) continue;
    seen.add(mob.id);
    visitor(mob);
  }
}

function forEachMobNear(x, y, radius, visitor) {
  const bounds = {
    minX: x - radius,
    maxX: x + radius,
    minY: y - radius,
    maxY: y + radius,
    world: worldForPosition(x, y)
  };
  const seen = new Set();
  forEachMobHomeInBounds(bounds, (mob) => {
    if (seen.has(mob.id)) return;
    seen.add(mob.id);
    visitor(mob);
  });
  for (const mob of forceSimulateMobs) {
    if (seen.has(mob.id)) continue;
    if (Math.abs(mob.x - x) > radius + MOB_SPATIAL_QUERY_PAD || Math.abs(mob.y - y) > radius + MOB_SPATIAL_QUERY_PAD) continue;
    seen.add(mob.id);
    visitor(mob);
  }
}

function buildAboardShipClientIndex() {
  const out = new Map();
  for (const passengerClient of clients.values()) {
    const passenger = passengerClient.player;
    if (!passenger || typeof passenger.aboardShipId !== "string" || !passenger.aboardShipId) {
      continue;
    }
    let list = out.get(passenger.aboardShipId);
    if (!list) {
      list = [];
      out.set(passenger.aboardShipId, list);
    }
    list.push(passengerClient);
  }
  return out;
}

function moveShipOccupantsWithWarp(ownerClient, ship, shipDx, shipDy, aboardShipClients) {
  if (!shipDx && !shipDy) return;
  const owner = ownerClient?.player;
  if (owner?.ship === ship && ship.boarded && ship.deckMode && !owner.shipStationRole) {
    owner.x += shipDx;
    owner.y += shipDy;
  }
  const passengers = aboardShipClients.get(ship.id) || [];
  for (const passengerClient of passengers) {
    const passenger = passengerClient.player;
    if (!passenger) continue;
    passenger.x += shipDx;
    passenger.y += shipDy;
  }
}

function orbitalArrivalPointForPlanet(planet, fromX, fromY) {
  const dx = Number(planet.x) - Number(fromX);
  const dy = Number(planet.y) - Number(fromY);
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const offset = planetShipSpriteRadiusTiles(planet) + SHIP_WARP_CLEARANCE + 2;
  return {
    x: Number((planet.x - ux * offset).toFixed(3)),
    y: Number((planet.y - uy * offset).toFixed(3))
  };
}

function resolveClearShipArrivalPoint(arrivalX, arrivalY, anchorX, anchorY) {
  const ax = Number(anchorX);
  const ay = Number(anchorY);
  let x = Number(arrivalX);
  let y = Number(arrivalY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { x: 0, y: 0 };
  }
  if (!isBlockedCircleForShip(x, y)) {
    return { x, y };
  }
  let awayAngle = Math.atan2(y - ay, x - ax);
  if (!Number.isFinite(awayAngle)) {
    awayAngle = 0;
  }
  const step = 2.5;
  const maxRings = 14;
  for (let ring = 1; ring <= maxRings; ring += 1) {
    const push = step * ring;
    for (let i = 0; i < 8; i += 1) {
      const angle = awayAngle + (i * Math.PI) / 4;
      const tx = x + Math.cos(angle) * push;
      const ty = y + Math.sin(angle) * push;
      if (!isBlockedCircleForShip(tx, ty)) {
        return { x: tx, y: ty };
      }
    }
  }
  const ux = Math.cos(awayAngle);
  const uy = Math.sin(awayAngle);
  for (let extra = step; extra <= step * maxRings; extra += step) {
    const tx = x + ux * extra;
    const ty = y + uy * extra;
    if (!isBlockedCircleForShip(tx, ty)) {
      return { x: tx, y: ty };
    }
  }
  return { x, y };
}

function updateShipWarpForClient(client, dt, aboardShipClients) {
  const player = client.player;
  const ship = player?.ship;
  const warp = sanitizeShipWarp(ship?.warp);
  if (!ship || !warp) {
    if (ship?.warp) ship.warp = null;
    return false;
  }

  const now = Date.now();
  const center = shipCenter(ship, player);
  if (warp.phase !== "jump") {
    const dx = warp.arrivalX - center.x;
    const dy = warp.arrivalY - center.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1e-4) {
      const step = Math.min(dist, SHIP_WARP_APPROACH_SPEED * dt);
      const ux = dx / dist;
      const uy = dy / dist;
      const prevX = center.x;
      const prevY = center.y;
      ship.facing = Math.atan2(uy, ux);
      ship.worldX = center.x + ux * step;
      ship.worldY = center.y + uy * step;
      moveShipOccupantsWithWarp(client, ship, ship.worldX - prevX, ship.worldY - prevY, aboardShipClients);
    }
    ship.speed = SHIP_WARP_APPROACH_SPEED;
    if (now - warp.startedAt >= SHIP_WARP_APPROACH_MS) {
      warp.phase = "jump";
      warp.jumpStartedAt = now;
      ship.speed = 0;
      ship.warp = warp;
      send(client, {
        type: "shipWarp",
        destinationName: warp.destinationName,
        color: warp.color,
        durationMs: SHIP_WARP_JUMP_MS
      });
      return true;
    }
    ship.warp = warp;
    return true;
  }

  if (now - warp.jumpStartedAt >= SHIP_WARP_JUMP_MS) {
    const prevX = center.x;
    const prevY = center.y;
    const cleared = resolveClearShipArrivalPoint(
      warp.arrivalX,
      warp.arrivalY,
      warp.targetX,
      warp.targetY
    );
    ship.worldX = cleared.x;
    ship.worldY = cleared.y;
    ship.dockX = cleared.x;
    ship.dockY = cleared.y;
    ship.speed = 0;
    ship.warp = null;
    moveShipOccupantsWithWarp(client, ship, ship.worldX - prevX, ship.worldY - prevY, aboardShipClients);
    saveClientCharacter(client);
    send(client, { type: "serverMessage", message: "ship_warp_complete", destination: warp.destinationName });
    return true;
  }

  ship.speed = 0;
  ship.warp = warp;
  return true;
}

function simulate() {
  disconnectIdleClients(Date.now());
  if (clients.size === 0) {
    return;
  }
  recordSimulateWallInterval();
  tick += 1;
  const dt = 1 / TICK_RATE;
  const _perfT0 = process.hrtime.bigint();
  if (tick % (TICK_RATE * 10) === 0) {
    pruneAsteroidState();
  }
  const aboardShipClients = buildAboardShipClientIndex();

  for (const client of clients.values()) {
    if (!client.player) {
      continue;
    }

    // Mod characters never run out of gold — refill every tick so purchases feel free.
    if (client.player.isMod && client.player.gold < 99000000) {
      client.player.gold = 99000000;
    }

    const input = client.input;
    const doorAccountKey = client.account?.key || "";
    const shipPilot =
      Boolean(client.player.ship?.boarded) &&
      isPilotShipRole(client.player.shipStationRole || client.player.ship.stationRole) &&
      getWorldThemeAt(client.player.x, client.player.y) === "sci-fi";
    const shipWarping = updateShipWarpForClient(client, dt, aboardShipClients);

    if (shipPilot) {
      const ship = client.player.ship;
      client.player._stillAccumulator = 0;
      ship.docking = null;

      // WASD sets the ship's facing direction
      const dx = Number(input.right) - Number(input.left);
      const dy = Number(input.down) - Number(input.up);
      const aimLength = Math.hypot(dx, dy);
      if (aimLength > 0) {
        client.player.facing = Math.atan2(dy, dx);
        if (!shipWarping) {
          ship.facing = client.player.facing;
        }
      }
      // Engage thrusts forward in the facing direction
      if (input.engage && !shipWarping) {
        const sp = getPlayerSpeed(client.player);
        const vx = Math.cos(client.player.facing) * sp * dt;
        const vy = Math.sin(client.player.facing) * sp * dt;
        const center = shipCenter(ship);
        const prevShipX = Number.isFinite(ship.worldX) ? ship.worldX : center.x;
        const prevShipY = Number.isFinite(ship.worldY) ? ship.worldY : center.y;
        const nextX = center.x + vx;
        const nextY = center.y + vy;
        if (
          !isBlockedCircleForShip(nextX, center.y) &&
          !isDoorLockedForPlayer(nextX, center.y, doorAccountKey)
        ) {
          ship.worldX = nextX;
        }
        if (
          !isBlockedCircleForShip(ship.worldX ?? center.x, nextY) &&
          !isDoorLockedForPlayer(ship.worldX ?? center.x, nextY, doorAccountKey)
        ) {
          ship.worldY = nextY;
        }
        // Drag passengers (aboardShipId === ship.id) along with the ship so they stay
        // in their relative position inside the interior as it flies.
        const shipDx = (ship.worldX ?? prevShipX) - prevShipX;
        const shipDy = (ship.worldY ?? prevShipY) - prevShipY;
        if (shipDx !== 0 || shipDy !== 0) {
          const passengers = aboardShipClients.get(ship.id) || [];
          for (const passengerClient of passengers) {
            const passenger = passengerClient.player;
            if (!passenger) continue;
            passenger.x += shipDx;
            passenger.y += shipDy;
          }
        }
      }
      const station = getShipLayout(ship).stations.find((candidate) => candidate.id === (client.player.shipStationId || ship.stationId)) || getShipLayout(ship).stations[0];
      const seat = shipStationWorld(ship, station);
      setPlayerShipLocal(client.player, Number(station.x) || 0, Number(station.y) || 0);
      client.player.x = seat.x;
      client.player.y = seat.y;
      client.player.moving = Boolean(input.engage || shipWarping);
    } else if (client.player.ship?.boarded && client.player.ship.deckMode) {
      const ship = client.player.ship;
      const role = client.player.shipStationRole || ship.stationRole;
      client.player._stillAccumulator = 0;
      if (role === "engineer") {
        const station = getShipLayout(ship).stations.find((candidate) => candidate.id === (client.player.shipStationId || ship.stationId));
        if (station) {
          setPlayerShipLocal(client.player, Number(station.x) || 0, Number(station.y) || 0);
          syncPlayerToShipLocal(client.player);
        }
        const shieldFacing = shieldFacingFromInput(input);
        if (shieldFacing) {
          ship.shieldSections = sanitizeShipShieldSections(ship);
          if (station) {
            ship.shieldSections[station.id] = shieldFacing;
          }
          ship.shieldFacing = shieldFacing;
        }
        if (input.repair) {
          ship.health = Math.min(getShipMaxHealth(ship), (Number(ship.health) || 0) + SHIP_REPAIR_PER_SECOND * dt);
        }
        client.player.moving = false;
      } else if (role === "gunner") {
        const station = getShipLayout(ship).stations.find((candidate) => candidate.id === (client.player.shipStationId || ship.stationId));
        if (station) {
          setPlayerShipLocal(client.player, Number(station.x) || 0, Number(station.y) || 0);
          syncPlayerToShipLocal(client.player);
        }
        const dx = Number(input.right) - Number(input.left);
        const dy = Number(input.down) - Number(input.up);
        if (Math.hypot(dx, dy) > 0) {
          client.player.facing = Math.atan2(dy, dx);
        }
        if (input.fire) {
          if (input.weaponMode === "missile") {
            if (Date.now() - (client.lastShipMissileAt || 0) > SHIP_MISSILE_COOLDOWN_MS) {
              handleShipMissile(client);
            }
          } else {
            if (Date.now() - (client.lastShipFireAt || 0) > SHIP_GUNNER_COOLDOWN_MS) {
              const center = shipCenter(ship);
              handleShipFire(client, {
                targetX: center.x + Math.cos(client.player.facing) * 24,
                targetY: center.y + Math.sin(client.player.facing) * 24
              });
            }
          }
        }
        client.player.moving = Boolean(input.fire);
      } else {
        let dx = Number(input.right) - Number(input.left);
        let dy = Number(input.down) - Number(input.up);
        const length = Math.hypot(dx, dy);
        if (length > 0) {
          client.player.shipAmenityPose = null;
          dx /= length;
          dy /= length;
          const speed = (PLAYER_SPEED + client.player.stats.speed * STAT_POINT_SPEED + getEquipmentStats(client.player).speed) * 0.82;
          client.player.shipLocalX = (Number(client.player.shipLocalX) || 0) + dx * speed * dt;
          client.player.shipLocalY = (Number(client.player.shipLocalY) || 0) + dy * speed * dt;
          clampPlayerToShipDeck(client.player);
          client.player.facing = Math.atan2(dy, dx);
          client.player.moving = true;
        } else {
          syncPlayerToShipLocal(client.player);
          client.player.moving = false;
        }
      }
    } else if (client.player._caravanRiding) {
      // While riding a caravan the server drives the player position. Input is ignored.
      const dx = Number(input.right) - Number(input.left);
      const dy = Number(input.down) - Number(input.up);
      // Tapping any direction key is treated as a disembark request, so players
      // don't get stuck if they stop reading chat hints.
      if (Math.hypot(dx, dy) > 0.5) {
        handleCaravanDisembark(client);
      }
    } else {
      let dx = Number(input.right) - Number(input.left);
      let dy = Number(input.down) - Number(input.up);
      const length = Math.hypot(dx, dy);
      const zeroGFeature = getWorldThemeAt(client.player.x, client.player.y) === "sci-fi"
        ? sciFiStationFeatureAt(Math.round(client.player.x), Math.round(client.player.y))
        : null;
      const inZeroG = zeroGFeature?.kind === "station-plaza";
      if (inZeroG && length > 0) {
        client.player.zeroGDriftX = dx / length;
        client.player.zeroGDriftY = dy / length;
      }

      if (length > 0 || (inZeroG && Math.hypot(Number(client.player.zeroGDriftX) || 0, Number(client.player.zeroGDriftY) || 0) > 0)) {
        client.player.shipAmenityPose = null;
        client.player._stillAccumulator = 0;
        if (length > 0) {
          dx /= length;
          dy /= length;
        } else {
          dx = Number(client.player.zeroGDriftX) || 0;
          dy = Number(client.player.zeroGDriftY) || 0;
        }

        const swim = isSwimmingAt(client.player.x, client.player.y);
        const speed = getPlayerSpeed(client.player)
          * (inZeroG ? ZERO_G_DRIFT_SPEED_MULTIPLIER : 1)
          * (swim ? SWIM_SPEED_MULT : 1);
        const nextX = client.player.x + dx * speed * dt;
        const nextY = client.player.y + dy * speed * dt;

        const shipMode = Boolean(client.player.ship?.boarded);
        if (shipMode || (!isBlockedCircle(nextX, client.player.y) && !isDoorLockedForPlayer(nextX, client.player.y, doorAccountKey))) {
          client.player.x = nextX;
        }
        if (shipMode || (!isBlockedCircle(client.player.x, nextY) && !isDoorLockedForPlayer(client.player.x, nextY, doorAccountKey))) {
          client.player.y = nextY;
        }

        client.player.facing = Math.atan2(dy, dx);
        client.player.moving = true;
      } else {
        client.player.zeroGDriftX = 0;
        client.player.zeroGDriftY = 0;
        client.player.moving = false;
        client.player._stillAccumulator = (client.player._stillAccumulator || 0) + dt;
      }
    }

    if (shipPilot) {
      client.player.swimming = false;
    } else {
      client.player.swimming = isSwimmingAt(client.player.x, client.player.y);
    }

    handleDoorTravel(client);
    handlePortalTravel(client);
  }

  perfAcc.players += Number(process.hrtime.bigint() - _perfT0) / 1e3;

  const runWorldAi = tick % AI_TICK_DIVISOR === 0;
  const aiDt = dt * AI_TICK_DIVISOR;
  if (runWorldAi) {
    tickAllShipCrews(aiDt, Date.now());
    const companionAiTargets = [];
    const allNpcPlayers = [];
    for (const c of clients.values()) {
      const p = c.player;
      if (!p) continue;
      allNpcPlayers.push({ player: p, client: c });
      if (!p.homeBuildingKey || p.houseCompanion) continue;
      const own = ownedBuildings.get(String(p.homeBuildingKey));
      if (!own || !c.account || own.ownerAccountKey !== c.account.key) continue;
      companionAiTargets.push({
        player: p,
        client: c,
        stillAccumulator: p._stillAccumulator || 0
      });
    }

    let _pt = process.hrtime.bigint();
    updateNpcs(aiDt, pushChat, computeNpcActivationBounds(), {
      targets: companionAiTargets,
      allPlayers: allNpcPlayers,
      tryOffer(npc, buddyRow) {
        if (buddyRow?.client) {
          sendCompanionPurchaseOffer(npc, buddyRow.client, Date.now());
        }
      }
    });
    perfAcc.npcs += Number(process.hrtime.bigint() - _pt) / 1e3;

    _pt = process.hrtime.bigint();
    processAssaultWaves(Date.now());
    perfAcc.assaults += Number(process.hrtime.bigint() - _pt) / 1e3;

    _pt = process.hrtime.bigint();
    updateMobs(aiDt, computeMobActivationBoundsArray());
    perfAcc.mobs += Number(process.hrtime.bigint() - _pt) / 1e3;

    _pt = process.hrtime.bigint();
    processTownArrowSupply(Date.now(), aiDt);
    perfAcc.archerSupply += Number(process.hrtime.bigint() - _pt) / 1e3;

    _pt = process.hrtime.bigint();
    processGatekeeperArchers(Date.now());
    perfAcc.archers += Number(process.hrtime.bigint() - _pt) / 1e3;

    _pt = process.hrtime.bigint();
    processStationDefenses(Date.now());
    perfAcc.defenses += Number(process.hrtime.bigint() - _pt) / 1e3;

    _pt = process.hrtime.bigint();
    processSciFiEncounters(Date.now());
    perfAcc.encounters += Number(process.hrtime.bigint() - _pt) / 1e3;

    _pt = process.hrtime.bigint();
    processQuestLocationObjectives(Date.now());
    perfAcc.jobs += Number(process.hrtime.bigint() - _pt) / 1e3;

    _pt = process.hrtime.bigint();
    updateCaravans(aiDt);
    perfAcc.caravans += Number(process.hrtime.bigint() - _pt) / 1e3;

    _pt = process.hrtime.bigint();
    processConsecrationZones(Date.now());
    perfAcc.consecration += Number(process.hrtime.bigint() - _pt) / 1e3;
  }

  if (minigames) {
    minigames.tick(Date.now());
  }

  snapshotAccumulator += SNAPSHOT_RATE;
  let _pt = process.hrtime.bigint();
  if (snapshotAccumulator >= TICK_RATE) {
    snapshotAccumulator -= TICK_RATE;
    broadcastSnapshot();
  }
  perfAcc.snapshot += Number(process.hrtime.bigint() - _pt) / 1e3;

  if (tick % PERF_LOG_INTERVAL === 0) {
    const total = Object.values(perfAcc).reduce((a, b) => a + b, 0);
    const fmt = (us) => `${(us / PERF_LOG_INTERVAL / 1e3).toFixed(3)}ms`;
    const pct = (us) => `${((us / total) * 100).toFixed(1)}%`;
    const sorted = Object.entries(perfAcc).sort((a, b) => b[1] - a[1]);
    perfLastSnapshot = Object.fromEntries(sorted.map(([k, v]) => [k, { avgMs: parseFloat((v / PERF_LOG_INTERVAL / 1e3).toFixed(3)), pct: parseFloat(((v / total) * 100).toFixed(1)) }]));
    const lines = sorted.map(([k, v]) => `  ${k.padEnd(14)} ${fmt(v).padStart(9)}  ${pct(v).padStart(6)}`).join("\n");
    console.log(`[perf] tick=${tick} total=${fmt(total)}/tick players=${clients.size}\n${lines}`);
    for (const k of Object.keys(perfAcc)) perfAcc[k] = 0;
  }
}

function handleDoorTravel(client) {
  // Walk-in architecture: players walk through doors naturally, no teleportation
}

function isDoorLockedForPlayer(x, y, ownerAccountKey) {
  const accountKey = typeof ownerAccountKey === "string" ? ownerAccountKey : "";
  const r = 0.28;
  for (let tx = Math.floor(x - r); tx <= Math.ceil(x + r); tx++) {
    for (let ty = Math.floor(y - r); ty <= Math.ceil(y + r); ty++) {
      for (const b of FOR_SALE_BUILDINGS) {
        const doorCols = southDoorWorldXs(b);
        const onDoorRow = ty === b.y || ty === b.y + b.h - 1;
        if (onDoorRow && doorCols.includes(tx)) {
          const key = `${b.x},${b.y}`;
          const ownership = ownedBuildings.get(key);
          if (!ownership) return true; // unowned for-sale building = locked
          return ownership.ownerAccountKey !== accountKey;
        }
      }
    }
  }
  return false;
}

function getBuildingPrice(building) {
  const prices = { hut: 200, treehouse: 350, house: 500, big_house: 900, castle: 2000 };
  return prices[building.type] || 500;
}

function playerNearBuildingForPurchase(player, building) {
  const px = player.x;
  const py = player.y;
  const doorX = southDoorAnchorWorldX(building);
  const doorY = building.y + building.h - 1;
  if (Math.hypot(px - doorX, py - doorY) <= 8) return true;
  const signX = building.x - 0.5;
  const signY = building.y + building.h - 0.5;
  return Math.hypot(px - signX, py - signY) <= 8;
}

function handleHouseHomeTreeTeleport(client, message = {}) {
  if (!client.player || !client.account) {
    return;
  }
  const key = typeof client.player.homeBuildingKey === "string" ? client.player.homeBuildingKey : null;
  if (!key) {
    return;
  }
  const ownership = ownedBuildings.get(key);
  if (!ownership || ownership.ownerAccountKey !== client.account.key) {
    return;
  }
  const building = BUILDING_LIST.find((b) => `${b.x},${b.y}` === key);
  if (!building) {
    return;
  }

  const px = client.player.x;
  const py = client.player.y;
  if (
    !(px > building.x + 0.55 &&
      px < building.x + building.w - 0.55 &&
      py > building.y + 0.55 &&
      py < building.y + building.h - 0.55)
  ) {
    return;
  }

  const treePos = getOwnedHouseHomeTreeWorldPos(building);
  const cx = Number(message.x);
  const cy = Number(message.y);
  const ax = Number.isFinite(cx) ? cx : px;
  const ay = Number.isFinite(cy) ? cy : py;
  /** Clicks are validated against tree anchor; walking onto the tile is not required. */
  if (Math.hypot(ax - treePos.x, ay - treePos.y) > 1.45) {
    return;
  }

  const now = Date.now();
  if (now - client.lastPortalAt < PORTAL_COOLDOWN_MS) {
    return;
  }

  client.lastPortalAt = now;
  const dest = spawnPoint(0);
  client.player.x = dest.x;
  client.player.y = dest.y;
  client.player.moving = false;
  client.input = normalizeInput();

  send(client, {
    type: "teleport",
    portalId: "house_return",
    name: "Plaza",
    color: "#6ecf8d",
    theme: getWorldThemeAt(client.player.x, client.player.y),
    x: client.player.x,
    y: client.player.y
  });
  streamChunks(client, nearbyChunks(client.player.x, client.player.y, 3));
}

function snapshotHouseChestSlots(slots) {
  return Array.from({ length: HOUSE_CHEST_SLOTS }, (_, i) => slots[i] || null);
}

function playerInsideOwnedHouseInterior(player, building) {
  const px = player.x;
  const py = player.y;
  return (
    px > building.x + 0.55 &&
    px < building.x + building.w - 0.55 &&
    py > building.y + 0.55 &&
    py < building.y + building.h - 0.55
  );
}

function validateOwnedHouseChestSession(client) {
  if (!client.player || !client.account) {
    return null;
  }
  const key = typeof client.player.homeBuildingKey === "string" ? client.player.homeBuildingKey : null;
  if (!key) {
    return null;
  }
  const ownership = ownedBuildings.get(key);
  if (!ownership || ownership.ownerAccountKey !== client.account.key) {
    return null;
  }
  const building = BUILDING_LIST.find((b) => `${b.x},${b.y}` === key);
  if (!building) {
    return null;
  }
  if (!playerInsideOwnedHouseInterior(client.player, building)) {
    return null;
  }
  const chestPos = getOwnedHouseChestWorldPos(building);
  if (Math.hypot(client.player.x - chestPos.x, client.player.y - chestPos.y) > 2.55) {
    return null;
  }
  const chest = touchOwnedHouseChestCache(key);
  return { key, building, chest };
}

function handleHouseChestAction(client, message) {
  const action = typeof message.action === "string" ? message.action : "";
  const ctx = validateOwnedHouseChestSession(client);
  if (!ctx) {
    return;
  }
  const { key, chest } = ctx;

  if (action === "open") {
    send(client, { type: "houseChestState", buildingKey: key, slots: snapshotHouseChestSlots(chest) });
    return;
  }

  if (action === "deposit") {
    const invSlot = clampInteger(message.invSlot, 0, INVENTORY_SIZE - 1);
    const item = client.player.inventory[invSlot];
    if (!item) {
      return;
    }
    const emptyChest = chest.findIndex((s) => !s);
    if (emptyChest === -1) {
      send(client, { type: "serverMessage", message: "house_chest_full" });
      return;
    }
    chest[emptyChest] = item;
    client.player.inventory[invSlot] = null;
    persistOwnedHouseChest(key);
    saveClientCharacter(client);
    send(client, { type: "houseChestState", buildingKey: key, slots: snapshotHouseChestSlots(chest) });
    broadcastSnapshot();
    return;
  }

  if (action === "withdraw") {
    const chestSlot = clampInteger(message.chestSlot, 0, HOUSE_CHEST_SLOTS - 1);
    const item = chest[chestSlot];
    if (!item) {
      return;
    }
    if (!addItemToInventory(client.player, item)) {
      send(client, { type: "serverMessage", message: "inventory_full" });
      return;
    }
    chest[chestSlot] = null;
    persistOwnedHouseChest(key);
    saveClientCharacter(client);
    send(client, { type: "houseChestState", buildingKey: key, slots: snapshotHouseChestSlots(chest) });
    broadcastSnapshot();
  }
}

/** Player inside their owned homestead (house / big_house) with a live-in companion. */
function sanitizePlayerHouseCompanionSession(client) {
  const p = client.player;
  if (!p || !client.account) {
    return null;
  }
  const rawKey = typeof p.homeBuildingKey === "string" ? p.homeBuildingKey : null;
  const key = rawKey ? sanitizeHomeBuildingKey(rawKey) : null;
  if (!key || !p.houseCompanion) {
    return null;
  }
  const ownership = ownedBuildings.get(key);
  if (!ownership || ownership.ownerAccountKey !== client.account.key) {
    return null;
  }
  const building = BUILDING_LIST.find((b) => `${b.x},${b.y}` === key);
  if (!building || building.isPub) {
    return null;
  }
  const typ = building.type || "house";
  if (typ !== "house" && typ !== "big_house") {
    return null;
  }
  if (!playerInsideOwnedHouseInterior(p, building)) {
    return null;
  }
  return { p, building, key, hc: p.houseCompanion };
}

function residentialBedWakeWorldPos(building) {
  const bh = Math.max(1, building.h | 0);
  return {
    x: building.x + 2.18,
    y: building.y + (bh - 2) + 0.48
  };
}

function handleHouseCompanionAction(client, message) {
  const ctx = sanitizePlayerHouseCompanionSession(client);
  if (!ctx) {
    send(client, { type: "serverMessage", message: "house_companion_bad" });
    return;
  }
  const act = typeof message.action === "string" ? message.action.trim() : "";
  if (act === "chat") {
    const line = pickHouseCompanionComplimentLine(ctx.hc);
    const nm = typeof ctx.hc.name === "string" ? ctx.hc.name : "Companion";
    send(client, { type: "houseCompanionChat", name: nm, text: line });
    return;
  }
  if (act === "breakup") {
    const npcId = typeof ctx.hc.npcId === "string" ? ctx.hc.npcId : null;
    ctx.p.houseCompanion = null;
    if (npcId) {
      unregisterCompanionSold(npcId);
    }
    saveClientCharacter(client);
    broadcastSnapshot();
    send(client, { type: "serverMessage", message: "companion_left_home" });
    return;
  }
  if (act === "intimate") {
    const pos = residentialBedWakeWorldPos(ctx.building);
    ctx.p.x = pos.x;
    ctx.p.y = pos.y;
    ctx.p.moving = false;
    client.input = normalizeInput();
    broadcastSnapshot();
    send(client, { type: "serverMessage", message: "companion_intimate_ok" });
    return;
  }
  send(client, { type: "serverMessage", message: "house_companion_bad" });
}

function handlePortalTravel(client) {
  const now = Date.now();
  if (now - client.lastPortalAt < PORTAL_COOLDOWN_MS) {
    return;
  }

  const portal = getPortalAt(client.player.x, client.player.y);
  if (!portal) {
    return;
  }

  client.lastPortalAt = now;
  client.player.x = portal.targetX;
  client.player.y = portal.targetY + 3.2;
  client.player.moving = false;
  if (client.player.ship && getWorldThemeAt(client.player.x, client.player.y) !== "sci-fi") {
    clearPlayerBoardedShips(client.player);
  }
  // Returning from a planet surface re-boards the player's ship in orbit.
  if (portal.kind === "planet_return" && client.player.ship) {
    boardPlayerOntoCurrentShip(client.player);
    saveClientCharacter(client);
  }
  client.input = normalizeInput();

  send(client, {
    type: "teleport",
    portalId: portal.id,
    name: portal.name,
    color: portal.color,
    style: portal.style || "arch",
    theme: getWorldThemeAt(client.player.x, client.player.y),
    x: client.player.x,
    y: client.player.y
  });
  streamChunks(client, nearbyChunks(client.player.x, client.player.y, 3));
  broadcastSnapshot();
}

function receive(client, data) {
  client.buffer = Buffer.concat([client.buffer, data]);
  const decoded = decodeFrames(client.buffer);
  client.buffer = decoded.remaining;

  if (decoded.close) {
    disconnect(client);
    return;
  }

  for (const frame of decoded.frames) {
    if (frame.opcode === 8) {
      disconnect(client);
      return;
    }

    if (frame.opcode === 9) {
      client.socket.write(encodeFrame(frame.payload, 10));
      continue;
    }

    if (frame.opcode !== 1) {
      continue;
    }

    handleMessage(client, frame.payload.toString("utf8"));
  }
}

function inputHasActivity(keys = {}) {
  return Boolean(
    keys.up ||
    keys.down ||
    keys.left ||
    keys.right ||
    keys.engage ||
    keys.fire ||
    keys.repair
  );
}

function isActivityMessage(message) {
  if (!message || typeof message.type !== "string") {
    return false;
  }
  if (message.type === "ping" || message.type === "view" || message.type === "requestChunks") {
    return false;
  }
  if (message.type === "input") {
    return inputHasActivity(message.keys);
  }
  return true;
}

function handleMessage(client, raw) {
  // Per-client rate limiting — drop burst traffic that would overwhelm the sim
  const nowMs = Date.now();
  if (nowMs >= client._msgWindowEnd) {
    client._msgCount = 0;
    client._msgWindowEnd = nowMs + 1000;
  }
  client._msgCount += 1;
  if (client._msgCount > MSG_RATE_LIMIT) {
    return;
  }

  let message;
  try {
    message = JSON.parse(raw);
  } catch {
    send(client, { type: "serverMessage", message: "invalid_json" });
    return;
  }
  if (isActivityMessage(message)) {
    client.lastActivityAt = nowMs;
  }

  if (message.type === "ping") {
    const t = Number(message.t);
    send(client, {
      type: "pong",
      t: Number.isFinite(t) ? t : 0,
      tick,
      tickRate: TICK_RATE,
      snapshotRate: SNAPSHOT_RATE,
      simHz: getMeasuredSimHz(),
      perf: perfLastSnapshot
    });
    return;
  }

  if (message.type === "auth") {
    handleAuth(client, message);
    return;
  }

  if (message.type === "hello") {
    joinWorld(client, message);
    return;
  }

  if (message.type === "input") {
    client.input = normalizeInput(message.keys);
    return;
  }

  if (message.type === "view") {
    client.view = normalizeView(message.view, client.player);
    return;
  }

  if (message.type === "modSetWorldTime") {
    handleModSetWorldTime(client, message);
    return;
  }

  if (message.type === "chat") {
    handleChat(client, message);
    return;
  }

  if (social && social.handleMessage(client, message)) {
    return;
  }

  if (message.type === "attack") {
    handleAttack(client, message);
    return;
  }

  if (message.type === "home") {
    handleHomeTeleport(client);
    return;
  }

  if (message.type === "sciFiTeleport") {
    handleSciFiTeleport(client);
    return;
  }

  if (message.type === "emote") {
    handleEmote(client, message);
    return;
  }

  if (message.type === "houseHomeTree") {
    handleHouseHomeTreeTeleport(client, message);
    return;
  }

  if (message.type === "houseChestAction") {
    handleHouseChestAction(client, message);
    return;
  }

  if (message.type === "houseCompanionAction") {
    handleHouseCompanionAction(client, message);
    return;
  }

  if (message.type === "spendStat") {
    handleSpendStat(client, message);
    return;
  }

  if (message.type === "interact") {
    handleInteract(client, message);
    return;
  }

  if (message.type === "fletchingTap") {
    handleFletchingTap(client, message);
    return;
  }

  if (message.type === "questNpc") {
    handleQuestNpc(client, message);
    return;
  }

  if (message.type === "questAccept") {
    handleQuestAccept(client, message);
    return;
  }

  if (message.type === "abandonQuest") {
    handleAbandonQuest(client, message);
    return;
  }

  if (message.type === "shipTerminalAction") {
    handleShipTerminalAction(client, message);
    return;
  }

  if (message.type === "shipDockRequest") {
    handleShipDockRequest(client);
    return;
  }

  if (message.type === "shipFire") {
    handleShipFire(client, message);
    return;
  }

  if (message.type === "shipCrewCommand") {
    handleShipCrewCommand(client, message);
    return;
  }

  if (message.type === "travelToPlanet") {
    handleTravelToPlanet(client, message);
    return;
  }

  if (message.type === "returnToShip") {
    handleReturnToShip(client);
    return;
  }

  if (message.type === "caravanRide") {
    handleCaravanRide(client, message);
    return;
  }

  if (message.type === "caravanDisembark") {
    handleCaravanDisembark(client);
    return;
  }

  if (message.type === "minigameAction") {
    if (minigames) {
      minigames.handleAction(client, message);
    }
    return;
  }

  if (message.type === "teleportMenuOpen") {
    handleTeleportMenuOpen(client, message);
    return;
  }

  if (message.type === "teleportMenuTravel") {
    handleTeleportMenuTravel(client, message);
    return;
  }

  if (message.type === "shopBuy") {
    handleShopBuy(client, message);
    return;
  }

  if (message.type === "shopSell") {
    handleShopSell(client, message);
    return;
  }

  if (message.type === "pickupGroundItem") {
    handlePickupGroundItem(client, message);
    return;
  }

  if (message.type === "lootChest") {
    if (!client.player) {
      return;
    }
    const chestId = typeof message.chestId === "string" ? message.chestId.slice(0, 96) : null;
    if (!chestId) {
      return;
    }
    const chest = chests.find((ch) => ch.id === chestId && !ch.opened);
    if (!chest) {
      send(client, { type: "serverMessage", message: "nothing_nearby" });
      return;
    }
    if (
      Math.hypot(chest.x - client.player.x, chest.y - client.player.y)
      > INTERACT_RADIUS + 0.38
    ) {
      send(client, { type: "serverMessage", message: "nothing_nearby" });
      return;
    }
    lootWorldChest(client, chest);
    return;
  }

  if (message.type === "buyCompanion") {
    handleBuyCompanion(client, message);
    return;
  }

  if (message.type === "equipItem") {
    handleEquipItem(client, message);
    return;
  }

  if (message.type === "useItem") {
    handleUseItem(client, message);
    return;
  }

  if (message.type === "dropItem") {
    handleDropItem(client, message);
    return;
  }

  if (message.type === "unequipItem") {
    handleUnequipItem(client, message);
    return;
  }

  if (message.type === "requestChunks") {
    streamChunks(client, message.chunks);
    return;
  }

  if (message.type === "traderOpen") {
    handleTraderOpen(client, message);
    return;
  }

  if (message.type === "shoo_npc") {
    const npc = getNpcById(String(message.npcId || "").slice(0, 64));
    if (npc) {
      npc._shooedUntil = Date.now() + 45000;
      npc._engagedAt = null;
      npc._givenUpUntil = null;
      npc._targetX = npc.homeX;
      npc._targetY = npc.homeY;
      // Release flirt follower
      if (client.player && client.player.flirtFollowNpcId === npc.id) {
        client.player.flirtFollowNpcId = null;
        saveClientCharacter(client);
      }
    }
    return;
  }

  if (message.type === "pursueFlirt") {
    const p = client.player;
    if (!p) return;
    const npc = getNpcById(String(message.npcId || "").slice(0, 96));
    if (!npc || !npc.wandersToFlirt || !npc.bondTag) return;
    if (p.houseCompanion || p.flirtFollowNpcId) {
      send(client, { type: "serverMessage", message: "companion_already" });
      return;
    }
    if (Math.hypot(npc.x - p.x, npc.y - p.y) > 5) {
      send(client, { type: "serverMessage", message: "companion_too_far" });
      return;
    }

    if (p.homeBuildingKey) {
      const house = ownedBuildings.get(p.homeBuildingKey);
      if (house && client.account && house.ownerAccountKey === client.account.key) {
        // Player has a house — NPC enters house companion system
        p.houseCompanion = buildHouseCompanionFromTemplate(npc);
        registerCompanionSold(npc.id);
        saveClientCharacter(client);
        broadcastSnapshot();
        pushChat({
          kind: "system", name: "Realm",
          text: `${npc.name} smiles warmly. "I'll find my way to your hearth."`,
        });
        return;
      }
    }

    // No house — follow the player around
    npc._followingPlayerId = p.id;
    npc._engagedAt = null;
    npc._givenUpUntil = null;
    p.flirtFollowNpcId = npc.id;
    saveClientCharacter(client);
    broadcastSnapshot();
    pushChat({
      kind: "system", name: "Realm",
      text: `${npc.name} smiles and falls into step beside you.`,
    });
    return;
  }

  if (message.type === "companionApproach") {
    const npc = getNpcById(String(message.npcId || "").slice(0, 64));
    if (npc && npc.bondTag && client.player) {
      const p = client.player;
      const dx = npc.x - p.x, dy = npc.y - p.y;
      if (dx * dx + dy * dy < 144) {
        sendCompanionPurchaseOffer(npc, client, Date.now());
      }
    }
    return;
  }

  if (message.type === "buyItem") {
    handleBuyItem(client, message);
    return;
  }

  if (message.type === "sellItem") {
    handleSellItem(client, message);
    return;
  }

  if (message.type === "modTeleport") {
    handleModTeleport(client, message);
    return;
  }

  if (message.type === "buyBuilding") {
    const bx = Number(message.buildingX);
    const by = Number(message.buildingY);
    if (!Number.isFinite(bx) || !Number.isFinite(by)) {
      return;
    }
    const building = FOR_SALE_BUILDINGS.find((b) => b.x === bx && b.y === by);
    if (!building || !client.account || !client.player) {
      return;
    }
    const key = `${building.x},${building.y}`;
    if (ownedBuildings.has(key)) {
      return;
    }
    const price = getBuildingPrice(building);
    if (!playerNearBuildingForPurchase(client.player, building)) {
      return;
    }
    if (client.player.gold < price) {
      return;
    }
    client.player.gold -= price;
    try {
      upsertBuildingOwnership(worldDb, key, client.account.key, client.player.name, price);
    } catch (err) {
      client.player.gold += price;
      console.error("[world] building purchase not written to SQLite:", err && err.message ? err.message : err);
      return;
    }
    ownedBuildings.set(key, {
      ownerAccountKey: client.account.key,
      ownerName: client.player.name,
      price
    });
    client.player.homeBuildingKey = key;
    touchOwnedHouseChestCache(key);
    saveClientCharacter(client);
    for (const c of clients.values()) {
      send(c, { type: "buildingBought", buildingX: building.x, buildingY: building.y, ownerName: client.player.name });
    }
    broadcastSnapshot();
    return;
  }

  if (message.type === "spendTalent") {
    const p = client.player;
    if (!p || (p.talentPoints || 0) < 1) return;
    const talentId = typeof message.talentId === "string" ? message.talentId.slice(0, 32) : null;
    if (!talentId || p.talents[talentId]) return;
    // Validate tier order: find which tree/tier this talent is in
    const trees = SERVER_TALENT_TREES[p.classId] || [];
    let tierValid = false;
    for (const tree of trees) {
      const idx = tree.indexOf(talentId);
      if (idx === -1) continue;
      // tier 0 always valid, higher tiers require previous tier unlocked
      tierValid = idx === 0 || Boolean(p.talents[tree[idx - 1]]);
      break;
    }
    if (!tierValid) return; // spell not found or previous tier not unlocked
    p.talentPoints -= 1;
    p.talents[talentId] = true;
    // Auto-assign to first free bar slot
    p.abilityBar = p.abilityBar || [null, null, null, null, null];
    const freeBarSlot = p.abilityBar.findIndex(s => s === null);
    if (freeBarSlot !== -1) p.abilityBar[freeBarSlot] = talentId;
    saveClientCharacter(client);
    // Send immediate ack so client doesn't wait for next broadcast tick
    send(client, { type: "talentUpdate", talentPoints: p.talentPoints, talents: p.talents, abilityBar: p.abilityBar });
    broadcastSnapshot();
  }

  if (message.type === "resetTalents") {
    const p = client.player;
    if (!p) return;
    const trees = SERVER_TALENT_TREES[p.classId] || [];
    const allTalentIds = trees.flat();
    const spent = allTalentIds.filter(id => Boolean(p.talents?.[id])).length;
    if (spent === 0) return;
    p.talentPoints = (p.talentPoints || 0) + spent;
    p.talents = {};
    p.abilityBar = (p.abilityBar || [null, null, null, null, null]).map(
      s => (s && s.startsWith("item:")) ? s : null
    );
    saveClientCharacter(client);
    send(client, { type: "talentUpdate", talentPoints: p.talentPoints, talents: p.talents, abilityBar: p.abilityBar });
    broadcastSnapshot();
  }

  if (message.type === "setAbilitySlot") {
    const p = client.player;
    if (!p) return;
    const slot = Number(message.slot);
    if (!Number.isInteger(slot) || slot < 0 || slot > 4) return;
    const spellId = message.spellId === null ? null : typeof message.spellId === "string" ? message.spellId.slice(0, 48) : null;
    const isItemRef = spellId !== null && spellId.startsWith("item:");
    if (!isItemRef && spellId !== null && !p.talents[spellId]) return;
    p.abilityBar = p.abilityBar || [null, null, null, null, null];
    p.abilityBar[slot] = spellId;
    saveClientCharacter(client);
    broadcastSnapshot();
  }

  if (message.type === "swapAbilitySlots") {
    const p = client.player;
    if (!p) return;
    const from = Number(message.fromSlot);
    const to = Number(message.toSlot);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from > 4 || to < 0 || to > 4) return;
    p.abilityBar = p.abilityBar || [null, null, null, null, null];
    const tmp = p.abilityBar[from];
    p.abilityBar[from] = p.abilityBar[to];
    p.abilityBar[to] = tmp;
    saveClientCharacter(client);
    broadcastSnapshot();
  }

  if (message.type === "castSpell") {
    const p = client.player;
    if (!p) return;
    const spellId = typeof message.spellId === "string" ? message.spellId : null;
    if (!spellId || !p.talents[spellId]) return;
    handleCastSpell(client, spellId);
  }
}

function handleAuth(client, message) {
  if (client.player) {
    return;
  }

  const username = sanitizeUsername(message.username);
  const password = sanitizePassword(message.password);
  const action = message.action === "create" ? "create" : "login";
  if (!username || password === null) {
    send(client, { type: "auth", ok: false, message: "auth_invalid" });
    return;
  }

  const key = username.toLowerCase();
  let account = accountStore.accounts[key];
  if (action === "create") {
    if (account) {
      send(client, { type: "auth", ok: false, message: "auth_exists" });
      return;
    }
    account = createAccount(username, password);
    accountStore.accounts[key] = account;
    saveAccountStore();
  } else if (!account || !verifyPassword(password, account)) {
    send(client, { type: "auth", ok: false, message: "auth_failed" });
    return;
  }

  client.account = { key, username: account.username, isMod: Boolean(account.isMod), modCharacterName: account.modCharacterName || null };
  send(client, {
    type: "auth",
    ok: true,
    username: account.username,
    hasCharacter: Boolean(account.character)
  });

  postAuthEventToDiscord(DISCORD_AUTH_WEBHOOK_URL, { event: action, username: account.username });

  if (account.character) {
    joinWorld(client, account.character, account.character);
  }
}

function joinWorld(client, message, savedCharacter = null) {
  if (client.player) {
    return;
  }

  const fallbackSpawn = spawnPoint(nextSpawnIndex++);
  const spawn = savedCharacter
    ? {
        x: clampNumber(savedCharacter.x, -10000, 10000, fallbackSpawn.x),
        y: clampNumber(savedCharacter.y, -10000, 10000, fallbackSpawn.y)
      }
    : fallbackSpawn;
  const torsoColor = sanitizeColor(message.torsoColor || message.primary, "#5cc8ff");
  const weaponColor = sanitizeColor(message.weaponColor || message.accent, "#ffd166");
  const baseTorsoStyle = sanitizeChoice(message.torsoStyle, TORSO_STYLE_IDS, "tunic");
  const baseWeaponStyle = sanitizeChoice(message.weaponStyle, WEAPON_STYLE_IDS, "classic");
  const classId = sanitizeChoice(message.classId, CLASS_IDS, "ranger");
  const isMod = Boolean(client.account?.isMod);
  const forcedName = isMod && client.account?.modCharacterName ? client.account.modCharacterName : null;
  const shipFleet = sanitizeShipFleet(savedCharacter, client.account?.key || client.id);
  client.player = {
    id: client.id,
    name: forcedName || sanitizeName(message.name),
    classId,
    baseTorsoStyle,
    baseWeaponStyle,
    torsoStyle: baseTorsoStyle,
    weaponStyle: baseWeaponStyle,
    torsoColor,
    weaponColor,
    primary: torsoColor,
    accent: weaponColor,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    xp: clampInteger(savedCharacter?.xp ?? 0, 0, 100000000),
    level: clampInteger(savedCharacter?.level ?? 1, 1, 1000),
    xpToNext: xpForNextLevel(clampInteger(savedCharacter?.level ?? 1, 1, 1000)),
    statPoints: isMod ? 9999 : clampInteger(savedCharacter?.statPoints ?? 0, 0, 1000),
    stats: sanitizeStats(savedCharacter?.stats),
    gold: clampInteger(savedCharacter?.gold ?? STARTING_GOLD, 0, 100000000),
    quests: sanitizeQuestLog(savedCharacter?.quests),
    professions: sanitizeProfessions(savedCharacter?.professions),
    inventory: sanitizeInventory(savedCharacter?.inventory),
    equipment: sanitizeEquipment(savedCharacter?.equipment) || createStarterEquipment(classId, {
      torsoStyle: baseTorsoStyle,
      weaponStyle: baseWeaponStyle,
      torsoColor,
      weaponColor
    }),
    ships: shipFleet.ships,
    activeShipId: shipFleet.activeShipId,
    ship: shipFleet.activeShip,
    talentPoints: initialTalentPoints(savedCharacter, isMod),
    talents: savedCharacter?.talents || {},
    abilityBar: Array.isArray(savedCharacter?.abilityBar)
      ? savedCharacter.abilityBar.slice(0, 5).map(v => (typeof v === "string" ? v : null))
      : [null, null, null, null, null],
    x: spawn.x,
    y: spawn.y,
    facing: 0,
    moving: false,
    isMod,
    boardedShip: null,
    shipStationRole: null,
    shipStationId: null,
    shipLocalX: 0,
    shipLocalY: 0,
    _stillAccumulator: 0
  };

  let homeBuildingKey = sanitizeHomeBuildingKey(savedCharacter?.homeBuildingKey);
  if (homeBuildingKey) {
    const own = ownedBuildings.get(homeBuildingKey);
    if (!own || own.ownerAccountKey !== client.account?.key) {
      homeBuildingKey = null;
    }
  }
  client.player.homeBuildingKey = homeBuildingKey;
  client.player.houseCompanion = sanitizeHouseCompanion(savedCharacter?.houseCompanion);
  client.player.flirtFollowNpcId = typeof savedCharacter?.flirtFollowNpcId === "string"
    ? savedCharacter.flirtFollowNpcId.slice(0, 96)
    : null;
  client.player.aboardShipId = typeof savedCharacter?.aboardShipId === "string"
    ? savedCharacter.aboardShipId
    : null;
  validatePassengerLink(client.player);

  applyDerivedPlayerStats(client.player);
  client.player.hp = savedCharacter
    ? Math.min(client.player.maxHp, clampInteger(savedCharacter.hp ?? client.player.maxHp, 0, client.player.maxHp))
    : client.player.maxHp;

  if (savedCharacter?.minigameStats && minigames) {
    client.player.minigameStats = savedCharacter.minigameStats;
    minigames.ensureMinigameStats(client.player);
  }

  if (client.account && !savedCharacter) {
    saveClientCharacter(client);
  }

  send(client, {
    type: "welcome",
    selfId: client.id,
    tickRate: TICK_RATE,
    snapshotRate: SNAPSHOT_RATE,
    tileSize: 32,
    chunkSize: CHUNK_SIZE,
    theme: getWorldThemeAt(spawn.x, spawn.y),
    worldTime: getWorldTimeSnapshot(),
    spawn
  });

  if (ownedBuildings.size > 0) {
    const ownership = {};
    for (const [key, val] of ownedBuildings) {
      ownership[key] = val.ownerName;
    }
    send(client, { type: "buildingOwnership", data: ownership });
  }

  send(client, {
    type: "chatHistory",
    messages: chatHistory.filter((message) => isMessageVisibleToClient(message, client))
  });

  streamChunks(client, nearbyChunks(spawn.x, spawn.y, 3));
  const accForSocial = client.account ? accountStore.accounts[client.account.key] : null;
  if (accForSocial && social) {
    social.ensureFriendsArray(accForSocial);
    send(client, { type: "socialFriendsUpdated", friends: social.getFriendsList(client) });
    send(client, { type: "socialPartyUpdated", party: social.getPartyView(client) });
  }
  pushChat({
    kind: "system",
    name: "Realm",
    text: `${client.player.name} entered the hub`
  });
  if (startFloComplimentEvent(client.player)) {
    pushChat({
      kind: "system",
      name: "Realm",
      text: "The starting town turns to welcome Flo."
    });
  }
  broadcastSnapshot();
}

function handleAttack(client, message = {}) {
  if (!client.player) {
    return;
  }

  const loadout = getActiveLoadout(client.player);
  const now = Date.now();
  if (now - client.lastAttackAt < loadout.cooldownMs) {
    return;
  }

  client.lastAttackAt = now;

  if (!canAttackAt(client.player.x, client.player.y)) {
    send(client, { type: "serverMessage", message: "combat_protected" });
    return;
  }

  // When piloting a ship, always fire in the ship's facing direction
  if (!(client.player.ship?.boarded && getWorldThemeAt(client.player.x, client.player.y) === "sci-fi")) {
    if (typeof message.facing === "number" && Number.isFinite(message.facing)) {
      client.player.facing = normalizeAngle(Number(message.facing));
    } else if (typeof message.targetX === "number" && typeof message.targetY === "number") {
      const fx = Number(message.targetX) - client.player.x;
      const fy = Number(message.targetY) - client.player.y;
      client.player.facing = Math.atan2(fy, fx);
    }
  }

  const target = findAttackTarget(client, loadout);

  const event = {
    type: "combat",
    kind: loadout.kind,
    weapon: loadout.weapon,
    projectileKind: loadout.projectileKind,
    weaponStyle: loadout.weaponStyle || null,
    weaponColor: loadout.weaponColor || null,
    attackerId: client.player.id,
    x: Number(client.player.x.toFixed(3)),
    y: Number(client.player.y.toFixed(3)),
    facing: Number(client.player.facing.toFixed(3)),
    range: loadout.range,
    hit: false
  };

  if (loadout.kind === "projectile") {
    if (typeof message.targetX === "number" && typeof message.targetY === "number") {
      event.endX = Number(Number(message.targetX).toFixed(3));
      event.endY = Number(Number(message.targetY).toFixed(3));
    } else {
      event.endX = Number((client.player.x + Math.cos(client.player.facing) * loadout.range).toFixed(3));
      event.endY = Number((client.player.y + Math.sin(client.player.facing) * loadout.range).toFixed(3));
    }
  }

  if (target) {
    const { entity: hit, kind: hitKind } = target;
    const hitX = hit.x;
    const hitY = hit.y;
    const blocked = hitKind === "player" && isShieldBlocking(hit, client.player);
    let damage = getAttackDamage(client.player, loadout);
    if (blocked) {
      damage = Math.max(1, Math.round(damage * KNIGHT_SHIELD_DAMAGE_MULTIPLIER));
    }
    if (hitKind === "player") {
      damage = applyArmourReduction(hit, damage);
    }

    hit.hp = Math.max(0, hit.hp - damage);
    event.hit = true;
    event.targetId = hit.id;
    event.targetKind = hitKind;
    event.damage = damage;
    event.blocked = blocked;
    event.targetHp = hit.hp;
    event.endX = Number(hitX.toFixed(3));
    event.endY = Number(hitY.toFixed(3));

    const ls = getEquipmentSpecial(client.player).lifesteal;
    if (ls > 0 && client.player.hp < client.player.maxHp) {
      client.player.hp = Math.min(
        client.player.maxHp,
        client.player.hp + Math.max(1, Math.round(damage * ls))
      );
    }

    if (hitKind === "mob") {
      // Damaging a pirate alerts the rest of their fleet.
      if (hit.isShipPirate) {
        alertPirateFleet(hit);
      }
      if (hit.hp <= 0) {
        hit.dead = true;
        hit.respawnAt = now + (hit.isCritter ? 4200 : MOB_RESPAWN_MS);
        event.defeated = true;
        const progress = awardXp(client.player, xpForMob(hit));
        event.xpGained = progress.xpGained;
        event.levelsGained = progress.levelsGained;
        const goldReward = goldForMob(hit);
        client.player.gold += goldReward;
        event.goldGained = goldReward;
        dropLootForMob(hit);
        recordMobDefeatForQuests(client, hit);
      }
    }

    if (hitKind === "player" && hit.hp <= 0) {
      respawnPlayer(hit);
      event.defeated = true;
    }
  }

  if (!target && minigames) {
    const nearDummy = Math.hypot(client.player.x - 43.5, client.player.y - (-17)) < 4.2;
    if (nearDummy) {
      const dmg = getAttackDamage(client.player, loadout);
      minigames.onAttackDamage(client, dmg, "dummy", 43.5, -17);
    }
  }

  broadcastCombat(event);
}

function handleHomeTeleport(client) {
  if (!client.player) {
    return;
  }

  const now = Date.now();
  if (now - client.lastHomeAt < HOME_COOLDOWN_MS) {
    return;
  }

  client.lastHomeAt = now;
  clearPlayerBoardedShips(client.player);
  const dest = resolveHomeTeleportDestination(client.player, client.account?.key);
  client.player.x = dest.x;
  client.player.y = dest.y;
  client.player.moving = false;
  client.input = normalizeInput();
  saveClientCharacter(client);

  send(client, {
    type: "teleport",
    portalId: "home",
    name: dest.name,
    theme: getWorldThemeAt(client.player.x, client.player.y),
    x: client.player.x,
    y: client.player.y
  });
  streamChunks(client, nearbyChunks(client.player.x, client.player.y, 3));
  broadcastSnapshot();
}

const EMOTE_KINDS = new Set(["dance", "wave", "laugh", "cry", "cheer", "bow"]);
const EMOTE_DURATION_MS = 6000;
const EMOTE_COOLDOWN_MS = 3000;

function handleEmote(client, message) {
  if (!client.player) return;
  const kind = typeof message.kind === "string" ? message.kind.trim() : "";
  if (!EMOTE_KINDS.has(kind)) return;
  const now = Date.now();
  if (now - (client.lastEmoteAt || 0) < EMOTE_COOLDOWN_MS) return;
  client.lastEmoteAt = now;
  client.player.emote = { kind, until: now + EMOTE_DURATION_MS };
  broadcastSnapshot();
}

function handleSciFiTeleport(client) {
  if (!client.player) {
    return;
  }

  const now = Date.now();
  if (now - (client.lastSciFiAt || 0) < HOME_COOLDOWN_MS) {
    return;
  }

  client.lastSciFiAt = now;
  clearPlayerBoardedShips(client.player);
  client.player.x = STARGATE_LANDING.x;
  client.player.y = STARGATE_LANDING.y;
  client.player.moving = false;
  client.input = normalizeInput();

  send(client, {
    type: "teleport",
    portalId: "sci_command",
    name: "Orbital Square",
    theme: getWorldThemeAt(client.player.x, client.player.y),
    x: client.player.x,
    y: client.player.y
  });
  streamChunks(client, nearbyChunks(client.player.x, client.player.y, 3));
  broadcastSnapshot();
}

function handleSpendStat(client, message) {
  if (!client.player) {
    return;
  }

  const stat = sanitizeChoice(message.stat, STAT_IDS, null);
  if (!stat || client.player.statPoints <= 0) {
    return;
  }

  client.player.stats[stat] += 1;
  if (!client.player.isMod) {
    client.player.statPoints -= 1;
  }

  if (stat === "health") {
    const oldMax = client.player.maxHp;
    applyDerivedPlayerStats(client.player);
    client.player.hp = Math.min(client.player.maxHp, client.player.hp + (client.player.maxHp - oldMax));
  } else {
    applyDerivedPlayerStats(client.player);
  }

  send(client, {
    type: "serverMessage",
    message: "stat_spent",
    stat
  });
  saveClientCharacter(client);
  broadcastSnapshot();
}

function canEditWorldTime(client) {
  return Boolean(
    client?.player?.isMod &&
    client?.account?.username === "mod_ed"
  );
}

function handleModSetWorldTime(client, message) {
  if (!canEditWorldTime(client)) {
    send(client, { type: "serverMessage", message: "mod_time_denied" });
    return;
  }

  const hour = Number(message.hour);
  if (!Number.isFinite(hour)) {
    return;
  }

  const snapshot = setWorldTimeHour(Math.max(0, Math.min(23.999, hour)));
  send(client, {
    type: "serverMessage",
    message: "mod_time_set",
    hour: snapshot.hour,
    phase: snapshot.phase
  });
  broadcastSnapshot();
}

function handleModTeleport(client, message) {
  if (!client.player || !client.player.isMod) {
    return;
  }

  const x = clampNumber(message.x, -10000, 10000, null);
  const y = clampNumber(message.y, -10000, 10000, null);
  if (x === null || y === null) {
    return;
  }

  client.player.x = x;
  client.player.y = y;
  send(client, { type: "teleport", x, y, name: "Teleport" });
  streamChunks(client, nearbyChunks(x, y, 3));
  broadcastSnapshot();
}

function lootWorldChest(client, chest) {
  if (!client.player || !chest || chest.opened) {
    return false;
  }
  if (!addItemToInventory(client.player, cloneItem(chest.item))) {
    send(client, { type: "serverMessage", message: "inventory_full" });
    return true;
  }
  chest.opened = true;
  if (minigames) {
    minigames.onChestLoot(client, chest);
  }
  send(client, { type: "serverMessage", message: "chest_looted", itemName: chest.item.name });
  broadcastSnapshot();
  return true;
}

/** Sit on the bench seat row (matches upright client sprite), facing the bench back (−Math.PI/2). */
function resolveBenchSeatForPlayer(roadsideBench) {
  const fw = Math.max(1, Math.floor(Number(roadsideBench.footprintW) || 1));
  const fh = Math.max(1, Math.floor(Number(roadsideBench.footprintH) || 1));
  const cx = roadsideBench.x + fw / 2;
  /** Plank is along the upper part of the footprint, not south of the centroid. */
  const seatY = roadsideBench.y + Math.max(0.22, Math.min(fh - 0.55, fh * 0.38));
  const candidates = [
    { x: cx, y: seatY },
    { x: cx + 0.12, y: seatY + 0.02 },
    { x: cx - 0.12, y: seatY + 0.02 },
    { x: cx + 0.22, y: seatY + 0.04 },
    { x: cx - 0.22, y: seatY + 0.04 }
  ];
  let pick = candidates[0];
  for (const c of candidates) {
    if (!isBlockedCircle(c.x, c.y)) {
      pick = c;
      break;
    }
  }
  const facing = -Math.PI / 2;
  return { dx: Number(pick.x.toFixed(5)), dy: Number(pick.y.toFixed(5)), facing };
}

function resolveInteractRoadside(player, message = {}) {
  const tx = Number(message.x);
  const ty = Number(message.y);
  if (Number.isFinite(tx) && Number.isFinite(ty)) {
    const clickHit = findRoadsideFeatureNear(tx, ty, 1.42);
    if (clickHit && Math.hypot(player.x - tx, player.y - ty) <= 5.85) {
      return clickHit;
    }
  }
  return findRoadsideFeatureNear(player.x, player.y, 2.05);
}

function resolveShipBoarding(player) {
  const ship = player?.ship;
  if (!ship) {
    return null;
  }

  const dockX = Number(ship.dockX);
  const dockY = Number(ship.dockY);
  if (!Number.isFinite(dockX) || !Number.isFinite(dockY)) {
    return null;
  }

  const storedPort = sciFiDockPortById(ship.dockPortId) || findNearestSciFiDockPort(dockX, dockY, 18);
  const distToStoredPort = storedPort ? Math.hypot(player.x - storedPort.x, player.y - storedPort.y) : Infinity;
  const distToDock = Math.hypot(player.x - dockX, player.y - dockY);
  return {
    ship,
    dockX: storedPort?.x ?? dockX,
    dockY: storedPort?.y ?? dockY,
    dockPort: storedPort || null,
    canBoard: !ship.boarded && Math.min(distToDock, distToStoredPort) <= SHIP_DOCK_RADIUS
  };
}

function resolveShipLaunchPort(player, message = {}) {
  if (!player?.ship) {
    return null;
  }

  const tx = Number(message.x);
  const ty = Number(message.y);
  const aimX = Number.isFinite(tx) ? tx : player.x;
  const aimY = Number.isFinite(ty) ? ty : player.y;
  const port = findNearestSciFiDockPort(aimX, aimY, 14);
  if (!port) {
    return null;
  }

  if (Number.isFinite(tx) && Number.isFinite(ty)) {
    const clickDist = Math.hypot(tx - port.x, ty - port.y);
    if (clickDist > 10.5) {
      return null;
    }
  }

  const dist = Math.hypot(player.x - port.x, player.y - port.y);
  if (dist > SHIP_DOCK_RADIUS + 10) {
    return null;
  }

  return port;
}

function facingForDockPort(port) {
  if (port?.facing === "north") return -Math.PI / 2;
  if (port?.facing === "south") return Math.PI / 2;
  if (port?.facing === "west") return Math.PI;
  return 0;
}

function resolveShipExitDockPort(player) {
  const ship = player?.ship;
  const nearbyPort = findNearestSciFiDockPort(player?.x ?? 0, player?.y ?? 0, 18);
  if (nearbyPort) {
    return nearbyPort;
  }

  const storedPort = sciFiDockPortById(ship?.dockPortId);
  if (storedPort) {
    return storedPort;
  }

  const dockX = Number(ship?.dockX);
  const dockY = Number(ship?.dockY);
  if (Number.isFinite(dockX) && Number.isFinite(dockY)) {
    const dockedPort = findNearestSciFiDockPort(dockX, dockY, 18);
    if (dockedPort) {
      return dockedPort;
    }
  }

  return getPlayerDockPort(player) || findNearestSciFiDockPort(STARGATE_LANDING.x, STARGATE_LANDING.y, 120);
}

function disembarkPassengers(shipId, port) {
  if (!shipId) return;
  for (const passengerClient of clients.values()) {
    const passenger = passengerClient.player;
    if (!passenger || (passenger.aboardShipId !== shipId && passenger.boardedShip?.shipId !== shipId)) continue;
    passenger.aboardShipId = null;
    passenger.boardedShip = null;
    passenger.shipStationRole = null;
    passenger.shipStationId = null;
    passenger.shipLocalX = 0;
    passenger.shipLocalY = 0;
    passenger.ship = getOwnedActiveShip(passenger);
    if (port) {
      passenger.x = Number.isFinite(port.terminalX) ? port.terminalX : port.x;
      passenger.y = Number.isFinite(port.terminalY) ? port.terminalY : port.y;
      passenger.facing = facingForDockPort(port);
    }
    passenger.moving = false;
    passenger._stillAccumulator = 0;
    saveClientCharacter(passengerClient);
    send(passengerClient, {
      type: "serverMessage",
      message: "party_disembarked",
      shipName: shipId
    });
  }
}

function dockPlayerShipAtStation(client, port = resolveShipExitDockPort(client.player)) {
  if (!client.player?.ship || !port) {
    return false;
  }
  if (client.player.boardedShip || client.player.aboardShipId) {
    return disembarkFromSharedShip(client);
  }

  const shipId = client.player.ship.id;
  client.player.ship.boarded = false;
  client.player.ship.deckMode = false;
  client.player.ship.stationRole = null;
  client.player.ship.stationId = null;
  client.player.shipStationRole = null;
  client.player.shipStationId = null;
  client.player.boardedShip = null;
  client.player.aboardShipId = null;
  client.player.ship.dockX = port.x;
  client.player.ship.dockY = port.y;
  client.player.ship.dockStationId = "station_ringforge";
  client.player.ship.dockPortId = port.id;
  client.player.ship.worldX = port.x;
  client.player.ship.worldY = port.y;
  client.player.ship.facing = facingForDockPort(port);
  disembarkPassengers(shipId, port);
  client.player.x = Number.isFinite(port.terminalX) ? port.terminalX : port.x;
  client.player.y = Number.isFinite(port.terminalY) ? port.terminalY : port.y;
  client.player.facing = facingForDockPort(port);
  client.player.moving = false;
  client.player._stillAccumulator = 0;
  saveClientCharacter(client);
  send(client, {
    type: "serverMessage",
    message: "ship_docked",
    shipName: client.player.ship.name
  });
  broadcastSnapshot();
  return true;
}

function disembarkFromSharedShip(client) {
  const ship = client.player?.ship;
  if (!client.player || !ship) {
    return false;
  }
  const layout = getShipLayout(ship);
  const center = shipCenter(ship);
  client.player.boardedShip = null;
  client.player.aboardShipId = null;
  client.player.shipStationRole = null;
  client.player.shipStationId = null;
  client.player.shipLocalX = 0;
  client.player.shipLocalY = 0;
  client.player.ship = getOwnedActiveShip(client.player);
  client.player.x = center.x - layout.deckW / 2 - 1.2;
  client.player.y = center.y;
  client.player.moving = false;
  client.input = normalizeInput();
  saveClientCharacter(client);
  send(client, { type: "serverMessage", message: "ship_docked", shipName: ship.name });
  broadcastSnapshot();
  return true;
}

function findBoardableSharedShip(client, message = {}) {
  if (!client.player) {
    return null;
  }
  const tx = Number(message.x);
  const ty = Number(message.y);
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
    return null;
  }
  let best = null;
  let bestDist = Infinity;
  for (const other of clients.values()) {
    if (!other.player || other === client) continue;
    const ship = other.player.ship;
    if (!ship?.boarded || !ship.deckMode) continue;
    if (client.player.ship === ship) continue;
    const layout = getShipLayout(ship);
    const center = shipCenter(ship);
    const insideDeck =
      tx >= center.x - layout.deckW / 2 - 0.5 &&
      tx <= center.x + layout.deckW / 2 + 0.5 &&
      ty >= center.y - layout.deckH / 2 - 0.5 &&
      ty <= center.y + layout.deckH / 2 + 0.5;
    if (!insideDeck) continue;
    const travelDist = Math.hypot(client.player.x - tx, client.player.y - ty);
    if (travelDist > 42) continue;
    const d = Math.hypot(tx - center.x, ty - center.y);
    if (d < bestDist) {
      bestDist = d;
      best = { owner: other, ship, layout, center };
    }
  }
  return best;
}

function boardSharedShip(client, match, message = {}) {
  if (!client.player || !match?.ship) {
    return false;
  }
  const owned = getOwnedActiveShip(client.player);
  if (owned && owned !== match.ship) {
    owned.boarded = false;
    owned.deckMode = false;
    owned.stationRole = null;
    owned.stationId = null;
  }
  const ship = match.ship;
  const layout = match.layout || getShipLayout(ship);
  const tx = Number(message.x);
  const ty = Number(message.y);
  const center = shipCenter(ship);
  const localX = Number.isFinite(tx) ? tx - center.x : layout.entry.x;
  const localY = Number.isFinite(ty) ? ty - center.y : layout.entry.y;
  client.player.boardedShip = { ownerId: match.owner.id, shipId: ship.id };
  client.player.aboardShipId = ship.id;
  client.player.ship = ship;
  client.player.shipStationRole = null;
  client.player.shipStationId = null;
  setPlayerShipLocal(client.player, localX, localY);
  clampPlayerToShipDeck(client.player);
  client.player.facing = 0;
  client.player.moving = false;
  client.input = normalizeInput();
  saveClientCharacter(client);
  send(client, { type: "serverMessage", message: "ship_boarded", shipName: ship.name });
  broadcastSnapshot();
  return true;
}

function targetInsideActiveShipDeck(player, message = {}) {
  const ship = player?.ship;
  if (!ship?.boarded || !ship.deckMode) return false;
  const tx = Number(message.x);
  const ty = Number(message.y);
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return false;
  const layout = getShipLayout(ship);
  const center = shipCenter(ship);
  return (
    tx >= center.x - layout.deckW / 2 - 0.5 &&
    tx <= center.x + layout.deckW / 2 + 0.5 &&
    ty >= center.y - layout.deckH / 2 - 0.5 &&
    ty <= center.y + layout.deckH / 2 + 0.5
  );
}

function nearestShipAmenityOn(ship, player, message = {}) {
  if (!ship?.boarded || !ship.deckMode) return null;
  const layout = getShipLayout(ship);
  const tx = Number(message.x);
  const ty = Number(message.y);
  const useTarget = Number.isFinite(tx) && Number.isFinite(ty);
  const center = shipCenter(ship);
  let best = null;
  let bestDist = Infinity;
  for (const amenity of layout.amenities || []) {
    if (amenity.kind !== "bed" && amenity.kind !== "kitchen") continue;
    const ax = center.x + (Number(amenity.x) || 0);
    const ay = center.y + (Number(amenity.y) || 0);
    const clickDist = useTarget ? Math.hypot(tx - ax, ty - ay) : Number.POSITIVE_INFINITY;
    const playerDist = Math.hypot(player.x - ax, player.y - ay);
    const dist = useTarget ? clickDist : playerDist;
    if (((useTarget && clickDist <= 1.35) || playerDist <= 1.9) && dist < bestDist) {
      bestDist = dist;
      best = { ...amenity, worldX: ax, worldY: ay };
    }
  }
  return best;
}

function useShipAmenity(client, ship, amenity) {
  const player = client.player;
  if (!player || !ship || !amenity) return false;
  player.shipStationRole = null;
  player.shipStationId = null;
  player.shipAmenityPose = {
    kind: amenity.kind === "bed" ? "sleep" : "eat",
    until: Date.now() + (amenity.kind === "bed" ? 180000 : 14000)
  };
  if (ship.deckMode) {
    setPlayerShipLocal(player, Number(amenity.x) || 0, Number(amenity.y) || 0);
  } else {
    player.x = amenity.worldX;
    player.y = amenity.worldY;
  }
  player.facing = amenity.kind === "bed" ? -Math.PI / 2 : Math.PI / 2;
  player.moving = false;
  client.input = normalizeInput();
  send(client, {
    type: "serverMessage",
    message: "ship_fixture_used",
    fixtureKind: amenity.kind,
    pose: player.shipAmenityPose.kind
  });
  broadcastSnapshot();
  return true;
}

function handleShipInteract(client, message = {}) {
  const player = client.player;
  if (!player) return false;
  const ownShip = player.ship?.boarded ? player.ship : null;

  // Passengers (aboardShipId set) can interact with stations on the host ship,
  // not their own (unboarded) ship. Resolve the right ship to drive the rest of
  // the interaction.
  let hostShip = ownShip;
  if (!hostShip && typeof player.aboardShipId === "string" && player.aboardShipId) {
    const found = findShipById(player.aboardShipId);
    if (found?.ship?.boarded && found.ship.deckMode) {
      hostShip = found.ship;
    }
  }
  if (!hostShip) return false;

  if (hostShip.deckMode) {
    if (player.shipStationRole) {
      player.shipStationRole = null;
      player.shipStationId = null;
      client.input = normalizeInput();
      send(client, { type: "serverMessage", message: "ship_station_left" });
      broadcastSnapshot();
      return true;
    }
    const station = nearestShipStationOn(hostShip, player, message);
    if (station) {
      // A player taking a seat displaces any NPC crew member currently holding it.
      bumpCrewFromStation(hostShip, station.id);
      player.shipStationRole = station.role;
      player.shipStationId = station.id;
      if (hostShip === ownShip) {
        setPlayerShipLocal(player, Number(station.x) || 0, Number(station.y) || 0);
      }
      player.x = station.worldX;
      player.y = station.worldY;
      player.moving = false;
      client.input = normalizeInput();
      send(client, { type: "serverMessage", message: "ship_station_entered", stationName: station.name, stationRole: station.role });
      broadcastSnapshot();
      return true;
    }
    const amenity = nearestShipAmenityOn(hostShip, player, message);
    if (amenity) {
      return useShipAmenity(client, hostShip, amenity);
    }
    // Teleporter fixture on multi-crew decks.
    const layout = getShipLayout(hostShip);
    if (layout?.teleporter) {
      const center = shipCenter(hostShip);
      const tx = center.x + (Number(layout.teleporter.x) || 0);
      const ty = center.y + (Number(layout.teleporter.y) || 0);
      const tgtX = Number(message.x);
      const tgtY = Number(message.y);
      const useTarget = Number.isFinite(tgtX) && Number.isFinite(tgtY);
      const clickDist = useTarget ? Math.hypot(tgtX - tx, tgtY - ty) : Number.POSITIVE_INFINITY;
      const playerDist = Math.hypot(player.x - tx, player.y - ty);
      if ((useTarget && clickDist <= 1.4) || playerDist <= 1.8) {
        handleTeleportMenuOpen(client);
        return true;
      }
    }
    if (hostShip === ownShip && targetInsideActiveShipDeck(player, message)) {
      send(client, { type: "serverMessage", message: "ship_fixture_used" });
      return true;
    }
  }
  // Only the owner can trigger landing.
  if (hostShip === ownShip) {
    return dockPlayerShipAtStation(client);
  }
  return false;
}

function nearestShipStationOn(ship, player, message = {}) {
  if (!ship?.boarded || !ship.deckMode) return null;
  const layout = getShipLayout(ship);
  const tx = Number(message.x);
  const ty = Number(message.y);
  const useTarget = Number.isFinite(tx) && Number.isFinite(ty);
  let best = null;
  let bestDist = Infinity;
  for (const station of layout.stations) {
    const p = shipStationWorld(ship, station);
    const dist = Math.hypot((useTarget ? tx : player.x) - p.x, (useTarget ? ty : player.y) - p.y);
    const playerReach = Math.hypot(player.x - p.x, player.y - p.y);
    const clickReach = useTarget ? 1.15 : SHIP_STATION_INTERACT_RADIUS;
    if (dist <= clickReach && playerReach <= 6.5 && dist < bestDist) {
      bestDist = dist;
      best = { ...station, worldX: p.x, worldY: p.y };
    }
  }
  return best;
}

function publicTerminalShip(ship, activeShipId, port) {
  const snap = serializeShip(ship);
  return {
    ...snap,
    active: ship.id === activeShipId,
    atTerminalPort: Boolean(port && ship.dockPortId === port.id && !ship.boarded)
  };
}

function getPartyShipOffers(client) {
  if (!social) return [];
  const view = social.getPartyView(client);
  if (!view || !Array.isArray(view.members)) return [];
  const offers = [];
  for (const member of view.members) {
    if (!member?.id || member.offline) continue;
    if (member.id === client.player.id) continue;
    const other = getPlayerById(member.id);
    const ship = other?.ship;
    if (!ship || !ship.boarded) continue;
    const layout = getShipLayout(ship);
    if (!layout || layout.crewCapacity < 2) continue;
    offers.push({
      ownerId: other.id,
      ownerName: other.name,
      shipId: ship.id,
      shipName: ship.name,
      hullClass: ship.hullClass,
      color: ship.color,
      crewCapacity: layout.crewCapacity,
      deckMode: Boolean(ship.deckMode)
    });
  }
  return offers;
}

function sendShipTerminalWindow(client, port) {
  if (!client.player || !port) {
    return false;
  }
  ensurePlayerFleet(client.player);
  send(client, {
    type: "shipTerminal",
    stationName: "Orbital Square",
    port: {
      id: port.id,
      x: port.x,
      y: port.y,
      terminalX: port.terminalX,
      terminalY: port.terminalY,
      facing: port.facing
    },
    activeShipId: client.player.activeShipId || client.player.ship?.id || null,
    ships: client.player.ships.map((ship) => publicTerminalShip(ship, client.player.activeShipId, port)),
    partyShips: getPartyShipOffers(client)
  });
  return true;
}

const SHIP_DOCK_PROMPT_RANGE = 8;
const SHIP_GUNNER_COOLDOWN_MS = 350;
const SHIP_MISSILE_COOLDOWN_MS = 1500;

function applyShipMobDamage(mob, rawDamage, now = Date.now(), sourceX = mob.x, sourceY = mob.y) {
  const incoming = Math.max(1, Math.round(Number(rawDamage) || 1));
  let hullDamage = incoming;
  let shieldDamage = 0;
  let shieldHit = false;
  if (mob?.isShipPirate && (Number(mob.maxShieldHp) || 0) > 0 && (Number(mob.shieldHp) || 0) > 0) {
    shieldHit = true;
    shieldDamage = Math.min(Math.max(0, Math.round(mob.shieldHp)), incoming);
    mob.shieldHp = Math.max(0, Math.round(mob.shieldHp) - shieldDamage);
    hullDamage = Math.max(0, incoming - shieldDamage);
    mob.lastShieldHitAt = now;
    const dx = sourceX - mob.x;
    const dy = sourceY - mob.y;
    const len = Math.hypot(dx, dy) || 1;
    mob.lastShieldHitDx = dx / len;
    mob.lastShieldHitDy = dy / len;
  }
  if (hullDamage > 0) {
    mob.hp = Math.max(0, mob.hp - hullDamage);
  }
  return {
    damage: hullDamage,
    shieldDamage,
    shieldHit,
    targetHp: mob.hp,
    targetShieldHp: Number(mob.shieldHp) || 0
  };
}

function awardMobDefeatToClient(client, mob, event, now = Date.now()) {
  mob.dead = true;
  mob.respawnAt = now + (mob.isCritter ? 4200 : MOB_RESPAWN_MS);
  event.defeated = true;
  const progress = awardXp(client.player, xpForMob(mob));
  event.xpGained = progress.xpGained;
  event.levelsGained = progress.levelsGained;
  const goldReward = goldForMob(mob);
  client.player.gold += goldReward;
  event.goldGained = goldReward;
  dropLootForMob(mob);
  recordMobDefeatForQuests(client, mob);
}

function handleShipFire(client, message = {}) {
  const ctx = resolveCrewShipContext(client);
  const pilotForwardMissile = ctx && isPilotShipRole(ctx.role) && message.weaponMode === "missile";
  if (!ctx || (ctx.role !== "gunner" && !pilotForwardMissile)) return;
  const ship = ctx.ship;
  if (message.weaponMode === "missile") {
    if (Date.now() - (client.lastShipMissileAt || 0) > SHIP_MISSILE_COOLDOWN_MS) {
      handleShipMissile(client, ship, { forward: pilotForwardMissile || Boolean(message.forward) });
    }
    return;
  }
  if (ctx.role !== "gunner") return;
  const now = Date.now();
  if (now - (client.lastShipFireAt || 0) < SHIP_GUNNER_COOLDOWN_MS) {
    return;
  }
  client.lastShipFireAt = now;

  const center = shipCenter(ship);
  const tx = Number.isFinite(Number(message.targetX)) ? Number(message.targetX) : center.x + Math.cos(client.player.facing) * 8;
  const ty = Number.isFinite(Number(message.targetY)) ? Number(message.targetY) : center.y + Math.sin(client.player.facing) * 8;

  // Update the gunner's facing toward the aim point so the seat orientation tracks.
  const aimDx = tx - center.x;
  const aimDy = ty - center.y;
  if (aimDx * aimDx + aimDy * aimDy > 0.0001) {
    client.player.facing = Math.atan2(aimDy, aimDx);
  }

  ensureShipCrew(ship);
  const count = getShipDroneCount(ship);
  const drones = gunnerDroneSelection(ship, ctx.stationId);
  for (const droneIndex of drones) {
    fireOneShipDrone(ship, client, droneIndex, count, tx, ty, now);
  }
  client.player.moving = true;
}

function resolveCrewShipContext(client) {
  const player = client?.player;
  if (!player) return null;
  if (player.ship?.boarded) {
    return {
      ship: player.ship,
      role: player.shipStationRole || player.ship.stationRole || null,
      stationId: player.shipStationId || player.ship.stationId || null,
      isOwner: true
    };
  }
  if (typeof player.aboardShipId === "string" && player.aboardShipId) {
    const found = findShipById(player.aboardShipId);
    if (found?.ship?.boarded) {
      return {
        ship: found.ship,
        role: player.shipStationRole || null,
        stationId: player.shipStationId || null,
        isOwner: false
      };
    }
  }
  return null;
}

function handleShipMissile(client, shipOverride = null, opts = {}) {
  const ship = shipOverride || client.player?.ship;
  if (!ship?.boarded) return;
  client.lastShipMissileAt = Date.now();

  const center = shipCenter(ship);
  const tier = Math.max(1, Number(ship.laserTier) || 1);
  const missileDamage = Math.round((12 + tier * 6) * 3);
  const missileRange = (9 + tier * 2) * 2;
  const forwardShot = Boolean(opts.forward);
  let originX = center.x;
  let originY = center.y;
  let facing = Number.isFinite(ship.facing) ? ship.facing : Number(client.player?.facing) || 0;

  // Find nearest mob — prefer ship pirates but fall back to any mob.
  let target = null;
  let bestDist = Infinity;

  let asteroidTarget = null;
  let asteroidTargetState = null;
  let asteroidDist = Infinity;

  if (forwardShot) {
    const layout = getShipLayout(ship);
    const noseOffset = Math.max(3.5, (Number(layout.deckW) || 8) * 0.58);
    const cos = Math.cos(facing);
    const sin = Math.sin(facing);
    originX = center.x + cos * noseOffset;
    originY = center.y + sin * noseOffset;
    forEachMobNear(originX, originY, missileRange + 4, (mob) => {
      if (mob.dead) return;
      const mx = mob.x - originX;
      const my = mob.y - originY;
      const t = mx * cos + my * sin;
      if (t < 0 || t > missileRange) return;
      const perpX = mx - cos * t;
      const perpY = my - sin * t;
      if (Math.hypot(perpX, perpY) > 1.8) return;
      if (!target || t < bestDist) {
        target = mob;
        bestDist = t;
      }
    });
    const asteroidHit = findAsteroidHitAlongRay(originX, originY, cos, sin, missileRange);
    if (asteroidHit) {
      asteroidTarget = asteroidHit.rock;
      asteroidTargetState = asteroidHit.state;
      asteroidDist = asteroidHit.distance;
    }
  } else {
    forEachMobNear(center.x, center.y, missileRange + 4, (mob) => {
      if (mob.dead) return;
      const dx = mob.x - center.x;
      const dy = mob.y - center.y;
      const d = Math.hypot(dx, dy);
      if (d > missileRange) return;
      if (target === null || (mob.isShipPirate && !target.isShipPirate) || d < bestDist) {
        target = mob;
        bestDist = d;
      }
    });

    forEachAsteroidRockNear(center.x, center.y, missileRange + 4, (rock, state) => {
      const d = Math.hypot(rock.x - center.x, rock.y - center.y);
      if (d > missileRange) return;
      if (d < asteroidDist) {
        asteroidTarget = rock;
        asteroidTargetState = state;
        asteroidDist = d;
      }
    });
  }

  if (!target && !asteroidTarget) {
    if (forwardShot) {
      broadcastCombat({
        type: "combat",
        kind: "projectile",
        weapon: "ship_missile",
        projectileKind: "ship_missile",
        weaponColor: "#ff7b3a",
        attackerId: client.player.id,
        x: Number(originX.toFixed(3)),
        y: Number(originY.toFixed(3)),
        facing: Number(facing.toFixed(3)),
        range: Number(missileRange.toFixed(3)),
        hit: false,
        endX: Number((originX + Math.cos(facing) * missileRange).toFixed(3)),
        endY: Number((originY + Math.sin(facing) * missileRange).toFixed(3))
      });
      client.player.moving = true;
    }
    return;
  }

  const hitAsteroid = !target || (asteroidTarget && asteroidDist < bestDist);
  const targetX = hitAsteroid ? asteroidTarget.x : target.x;
  const targetY = hitAsteroid ? asteroidTarget.y : target.y;
  const hitDistance = hitAsteroid ? asteroidDist : bestDist;

  if (!forwardShot) facing = Math.atan2(targetY - center.y, targetX - center.x);
  const event = {
    type: "combat",
    kind: "projectile",
    weapon: "ship_missile",
    projectileKind: "ship_missile",
    weaponColor: "#ff7b3a",
    attackerId: client.player.id,
    x: Number(originX.toFixed(3)),
    y: Number(originY.toFixed(3)),
    facing: Number(facing.toFixed(3)),
    range: Number(hitDistance.toFixed(3)),
    hit: true,
    endX: Number(targetX.toFixed(3)),
    endY: Number(targetY.toFixed(3)),
    targetId: hitAsteroid ? asteroidTarget.id : target.id,
    targetKind: hitAsteroid ? "asteroid" : "mob",
    damage: missileDamage,
    targetHp: hitAsteroid ? asteroidTargetState.hp : target.hp
  };

  if (hitAsteroid) {
    const result = applyAsteroidDamage(asteroidTarget, missileDamage, Date.now());
    event.damage = result.damage;
    event.targetHp = result.targetHp;
    if (result.destroyed) {
      event.defeated = true;
    }
  } else {
    const result = applyShipMobDamage(target, missileDamage, Date.now(), originX, originY);
    event.damage = result.damage;
    event.shieldDamage = result.shieldDamage;
    event.shieldHit = result.shieldHit;
    event.targetHp = result.targetHp;
    event.targetShieldHp = result.targetShieldHp;
    if (target.isShipPirate) alertPirateFleet(target);
    if (target.hp <= 0) {
      awardMobDefeatToClient(client, target, event, Date.now());
    }
  }

  broadcastCombat(event);
  client.player.moving = true;
}

// ── Teleport / Warp menu ─────────────────────────────────────────────────────
// Surfaces a list of nearby destinations the player can warp to. Available
// inside any multi-crew ship (teleporter fixture / hotbar button) and on the
// main station. Destinations include the closest planet, the player's current
// home dock, and the main Orbital Square station as a fallback.
// When opened from the warp-drive button (fromFlight:true), pirate outposts
// and major asteroid belts are also included.

const TELEPORT_NEAR_RANGE = 220; // tiles — used to decide "nearby" planets / stations.
const RINGFORGE_STATION_W = 71;
const RINGFORGE_STATION_H = 61;

const WARP_PIRATE_OUTPOSTS = Object.freeze([
  { id: "outpost_breach",    name: "Breach Depot",      sublabel: "Pirate stronghold",   x: 2192, y: -428, color: "#ff6b6b" },
  { id: "outpost_shoals",    name: "Iron Shoals",       sublabel: "Pirate salvage yard",  x: 1582, y:  372, color: "#ff8c42" },
  { id: "outpost_voidgate",  name: "Void Gate Relay",   sublabel: "Contested relay post", x: 2316, y:  284, color: "#ff6baa" },
  { id: "outpost_boneyard",  name: "The Boneyard",      sublabel: "Derelict hulk cluster", x: 1658, y: -402, color: "#cc7fff" },
]);

const WARP_ASTEROID_BELTS = Object.freeze([
  { id: "belt_north",     name: "North Belt",      sublabel: "Dense rock field",     x: 1820, y: -260, color: "#b0c0d4" },
  { id: "belt_south",     name: "South Belt",      sublabel: "Mineral-rich cluster", x: 1990, y:  290, color: "#a8bcc8" },
  { id: "belt_northeast", name: "Northeast Cluster", sublabel: "Outer asteroid ring", x: 2290, y: -370, color: "#c4d4e8" },
  { id: "belt_rim",       name: "Rim Fragment",    sublabel: "Far sector debris",    x: 1920, y: -510, color: "#9ab0c0" },
  { id: "belt_mideast",   name: "Mid-Sector Field", sublabel: "Navigation hazard",  x: 2140, y: -175, color: "#a8c0c8" },
]);

function ringforgeWarpArrivalPoint(fromX, fromY) {
  let dx = (Number(fromX) || 0) - SCI_FI_STATION_CENTER.x;
  let dy = (Number(fromY) || 0) - SCI_FI_STATION_CENTER.y;
  let len = Math.hypot(dx, dy);
  if (len < 0.01) {
    dx = 0;
    dy = -1;
    len = 1;
  }
  const halfW = Math.floor(RINGFORGE_STATION_W / 2);
  const halfH = Math.floor(RINGFORGE_STATION_H / 2);
  const offset = Math.hypot(halfW, halfH) + SHIP_WARP_CLEARANCE + 4;
  return {
    x: SCI_FI_STATION_CENTER.x + (dx / len) * offset,
    y: SCI_FI_STATION_CENTER.y + (dy / len) * offset
  };
}

function buildTeleportDestinations(player, fromFlight = false) {
  const destinations = [];
  const px = Number(player.x) || 0;
  const py = Number(player.y) || 0;
  const world = worldForPosition(px, py);

  if (world === "scifi") {
    // Show deterministic planets near the ship. This includes authored hub
    // planets and procedurally generated worlds discovered as players fly out.
    const ranked = getPlanetsNearSpacePoint(px, py, fromFlight ? 2600 : 260).slice(0, fromFlight ? 12 : 5);
    for (const planet of ranked) {
      const dist = Math.hypot(planet.x - px, planet.y - py);
      destinations.push({
        kind: "planet",
        id: planet.id,
        label: planet.name,
        sublabel: planet.procedural ? "Procedural world" : dist <= TELEPORT_NEAR_RANGE ? "Nearby planet" : "Known planet",
        color: planet.surfacePrimary || "#67f0ff",
        dist: Math.round(dist)
      });
    }
  } else if (world && world.startsWith("planet:")) {
    const id = world.slice("planet:".length);
    const here = getPlanetById(id);
    if (here) {
      destinations.push({
        kind: "return_to_orbit",
        id: `orbit_${here.id}`,
        label: `${here.name} Orbit`,
        sublabel: "Return to your ship",
        color: here.surfacePrimary || "#67f0ff",
        dist: 0
      });
    }
  }

  // Always offer the main station so players can fast-travel home.
  destinations.push({
    kind: "station",
    id: "station_ringforge",
    label: "Orbital Square",
    sublabel: "Main hub station",
    color: "#67f0ff",
    dist: world === "scifi" ? Math.round(Math.hypot(SCI_FI_STATION_CENTER.x - px, SCI_FI_STATION_CENTER.y - py)) : 0
  });

  // Warp-drive mode: include pirate outposts and major asteroid belts as deep-space jump targets.
  if (fromFlight && world === "scifi") {
    for (const outpost of WARP_PIRATE_OUTPOSTS) {
      const dist = Math.round(Math.hypot(outpost.x - px, outpost.y - py));
      destinations.push({ kind: "warp_pirate", id: outpost.id, label: outpost.name, sublabel: outpost.sublabel, color: outpost.color, dist });
    }
    for (const belt of WARP_ASTEROID_BELTS) {
      const dist = Math.round(Math.hypot(belt.x - px, belt.y - py));
      destinations.push({ kind: "warp_asteroid", id: belt.id, label: belt.name, sublabel: belt.sublabel, color: belt.color, dist });
    }
  }

  return destinations;
}

function handleTeleportMenuOpen(client, message = {}) {
  const player = client.player;
  if (!player) return;
  const world = worldForPosition(player.x, player.y);
  if (world !== "scifi" && !world?.startsWith("planet:")) {
    send(client, { type: "serverMessage", message: "teleport_not_here" });
    return;
  }
  const fromFlight = Boolean(message.fromFlight);
  const title = world?.startsWith("planet:") ? "Planet Teleporter" : fromFlight ? "Warp Drive" : "Ship Teleporter";
  send(client, {
    type: "teleportMenu",
    title,
    fromFlight,
    destinations: buildTeleportDestinations(player, fromFlight)
  });
}

function startShipWarp(client, destination) {
  const player = client.player;
  const ship = player?.ship;
  if (!player || !ship?.boarded) {
    send(client, { type: "serverMessage", message: "teleport_not_here" });
    return false;
  }
  const role = player.shipStationRole || ship.stationRole;
  if (ship.deckMode && !isPilotShipRole(role)) {
    send(client, { type: "serverMessage", message: "ship_dock_not_piloting" });
    return false;
  }
  const targetX = Number(destination?.x);
  const targetY = Number(destination?.y);
  if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
    send(client, { type: "serverMessage", message: "teleport_unknown" });
    return false;
  }
  const center = shipCenter(ship, player);
  const travelFacing = Math.atan2(targetY - center.y, targetX - center.x);
  const rawArrival =
    destination?.kind === "planet"
      ? orbitalArrivalPointForPlanet(destination, center.x, center.y)
      : destination?.kind === "station" && destination?.id === "station_ringforge"
        ? ringforgeWarpArrivalPoint(center.x, center.y)
      : { x: targetX, y: targetY };
  const arrival = resolveClearShipArrivalPoint(rawArrival.x, rawArrival.y, targetX, targetY);
  ship.warp = {
    active: true,
    phase: "approach",
    targetX,
    targetY,
    arrivalX: arrival.x,
    arrivalY: arrival.y,
    destinationName: String(destination.name || destination.label || "Destination").slice(0, 80),
    destinationKind: String(destination.kind || "warp").slice(0, 32),
    destinationId: typeof destination.id === "string" ? destination.id.slice(0, 96) : null,
    color: typeof destination.color === "string" ? destination.color : "#67f0ff",
    startedAt: Date.now(),
    jumpStartedAt: 0
  };
  ship.docking = null;
  ship.speed = SHIP_WARP_APPROACH_SPEED;
  ship.facing = travelFacing;
  player.facing = travelFacing;
  saveClientCharacter(client);
  broadcastSnapshot();
  return true;
}

function handleTeleportMenuTravel(client, message = {}) {
  const player = client.player;
  if (!player) return;
  const kind = String(message.kind || "");
  const id = typeof message.id === "string" ? message.id : "";
  const fromFlight = Boolean(message.fromFlight);
  if (kind === "planet") {
    const planet = getPlanetById(id);
    if (!planet) {
      send(client, { type: "serverMessage", message: "teleport_unknown" });
      return;
    }
    if (fromFlight) {
      startShipWarp(client, { id: planet.id, kind: "planet", name: planet.name, x: planet.x, y: planet.y, color: planet.surfacePrimary || "#67f0ff" });
      return;
    }
    handleTravelToPlanet(client, { planetId: id });
    return;
  }
  if (kind === "return_to_orbit") {
    // Use the existing planet-return portal logic: place the player at the
    // planet's orbit point and re-board their ship.
    const planetId = id.replace(/^orbit_/, "");
    const planet = getPlanetById(planetId);
    if (!planet) {
      send(client, { type: "serverMessage", message: "teleport_unknown" });
      return;
    }
    const fakePortal = {
      id: `portal_${planet.id}_return`,
      kind: "planet_return",
      targetX: planet.x,
      targetY: planet.y,
      color: planet.surfacePrimary || "#67f0ff",
      style: "stargate",
      name: `${planet.name} Orbit`,
      planetId: planet.id
    };
    teleportPlayerToPortal(client, fakePortal);
    return;
  }
  if (kind === "station" && fromFlight) {
    startShipWarp(client, { id: "station_ringforge", kind: "station", name: "Orbital Square", x: SCI_FI_STATION_CENTER.x, y: SCI_FI_STATION_CENTER.y, color: "#67f0ff" });
    return;
  }
  if (kind === "station") {
    // Drop the player at the main station landing terminal.
    const landing = STARGATE_LANDING;
    if (player.ship) {
      // Park the ship at the player's saved dock if available, otherwise the landing pad.
      player.ship.boarded = false;
      player.ship.deckMode = false;
      player.ship.stationRole = null;
      player.ship.stationId = null;
      player.ship.docking = null;
      player.ship.worldX = landing.x;
      player.ship.worldY = landing.y;
      player.ship.dockX = landing.x;
      player.ship.dockY = landing.y;
    }
    player.shipStationRole = null;
    player.shipStationId = null;
    player.aboardShipId = null;
    player.x = landing.x;
    player.y = landing.y;
    player.facing = -Math.PI / 2;
    player.moving = false;
    saveClientCharacter(client);
    send(client, {
      type: "teleport",
      portalId: "teleport_to_station",
      name: "Orbital Square",
      color: "#67f0ff",
      style: "stargate",
      theme: getWorldThemeAt(player.x, player.y),
      x: player.x,
      y: player.y
    });
    send(client, { type: "serverMessage", message: "teleport_arrived", destination: "Orbital Square" });
    broadcastSnapshot();
    return;
  }
  if (kind === "warp_pirate" || kind === "warp_asteroid") {
    const lookup = kind === "warp_pirate"
      ? WARP_PIRATE_OUTPOSTS.find((o) => o.id === id)
      : WARP_ASTEROID_BELTS.find((b) => b.id === id);
    if (!lookup) {
      send(client, { type: "serverMessage", message: "teleport_unknown" });
      return;
    }
    startShipWarp(client, { ...lookup, kind });
    return;
  }
  send(client, { type: "serverMessage", message: "teleport_unknown" });
}

function handleReturnToShip(client) {
  const player = client.player;
  if (!player) return;
  const world = worldForPosition(player.x, player.y);
  if (!world?.startsWith("planet:")) {
    send(client, { type: "serverMessage", message: "teleport_not_here" });
    return;
  }
  const planetId = world.slice("planet:".length);
  const planet = getPlanetById(planetId);
  if (!planet || !player.ship) {
    send(client, { type: "serverMessage", message: "teleport_unknown" });
    return;
  }
  teleportPlayerToPortal(client, {
    id: `portal_${planet.id}_return_hotbar`,
    kind: "planet_return",
    targetX: planet.x,
    targetY: planet.y,
    color: planet.surfacePrimary || "#67f0ff",
    style: "stargate",
    name: `${planet.name} Orbit`,
    planetId: planet.id
  });
}

function boardPlayerOntoCurrentShip(player) {
  const ship = player?.ship;
  if (!ship) return false;
  ensureShipCrew(ship);
  const center = shipCenter(ship, player);
  ship.boarded = true;
  ship.deckMode = (getShipLayout(ship).crewCapacity > 1);
  ship.stationRole = ship.deckMode ? null : "pilot";
  ship.stationId = ship.deckMode ? null : "pilot";
  ship.docking = null;
  ship.warp = null;
  player.shipStationRole = null;
  player.shipStationId = null;
  player.aboardShipId = null;
  if (ship.deckMode) {
    const layout = getShipLayout(ship);
    player.x = center.x + (layout?.entry?.x || 0);
    player.y = center.y + (layout?.entry?.y || 0);
  } else {
    player.x = center.x;
    player.y = center.y;
  }
  player.moving = false;
  return true;
}

function teleportPlayerToPortal(client, portal) {
  const player = client.player;
  if (!player) return;
  player.x = portal.targetX;
  player.y = portal.targetY + 3.2;
  player.moving = false;
  if (portal.kind === "planet_return" && player.ship) {
    boardPlayerOntoCurrentShip(player);
    saveClientCharacter(client);
  }
  send(client, {
    type: "teleport",
    portalId: portal.id,
    name: portal.name,
    color: portal.color,
    style: portal.style || "arch",
    theme: getWorldThemeAt(player.x, player.y),
    x: player.x,
    y: player.y
  });
  broadcastSnapshot();
}

function handleTravelToPlanet(client, message = {}) {
  const player = client.player;
  const ship = player?.ship;
  if (!player || !ship) {
    return;
  }
  // Only valid when the player is in space (boarded or near a sci-fi dock).
  if (!ship.boarded && getWorldThemeAt(player.x, player.y) !== "sci-fi") {
    send(client, { type: "serverMessage", message: "planet_travel_not_in_space" });
    return;
  }
  let planet = null;
  if (typeof message.planetId === "string") {
    planet = getPlanetById(message.planetId);
  }
  // Fallback: if a world-space target was clicked, find the planet covering it.
  if (!planet && Number.isFinite(Number(message.targetX)) && Number.isFinite(Number(message.targetY))) {
    planet = getPlanetBySpacePoint(Number(message.targetX), Number(message.targetY));
  }
  if (!planet) {
    send(client, { type: "serverMessage", message: "planet_travel_unknown" });
    return;
  }

  // Keep the ship at the orbital position where it was left if already near
  // the planet, otherwise park it at a clean orbit offset outside the planet's
  // collision radius.
  const parkedX = Number.isFinite(ship.worldX) ? ship.worldX : Number(player.x) || 0;
  const parkedY = Number.isFinite(ship.worldY) ? ship.worldY : Number(player.y) || 0;
  const parkedDist = Math.hypot(parkedX - planet.x, parkedY - planet.y);
  const orbitKeepRadius = planetShipSpriteRadiusTiles(planet) + SHIP_WARP_CLEARANCE + 6;
  const orbitalParking =
    parkedDist <= orbitKeepRadius
      ? { x: parkedX, y: parkedY }
      : orbitalArrivalPointForPlanet(planet, parkedX, parkedY);

  ship.boarded = false;
  ship.deckMode = false;
  ship.stationRole = null;
  ship.stationId = null;
  ship.docking = null;
  ship.warp = null;
  ship.speed = 0;
  ship.worldX = orbitalParking.x;
  ship.worldY = orbitalParking.y;
  ship.dockX = orbitalParking.x;
  ship.dockY = orbitalParking.y;
  ship.dockStationId = `orbit_${planet.id}`;
  ship.dockPortId = null;

  // Drop the player onto the surface a tile south of the return portal so
  // they don't immediately step back through it.
  player.x = planet.surfaceX;
  player.y = planet.surfaceY + PLANET_SURFACE_LANDING_OFFSET;
  player.facing = -Math.PI / 2;
  player.moving = false;
  player._stillAccumulator = 0;
  player.aboardShipId = null;

  // Disembark any passengers that were aboard; they land at the planet too.
  for (const other of clients.values()) {
    const o = other.player;
    if (!o || o.aboardShipId !== ship.id) continue;
    o.aboardShipId = null;
    o.x = planet.surfaceX + (Math.random() * 2 - 1);
    o.y = planet.surfaceY + PLANET_SURFACE_LANDING_OFFSET + (Math.random() * 2 - 1);
    o.facing = -Math.PI / 2;
    o.moving = false;
    saveClientCharacter(other);
    send(other, { type: "serverMessage", message: "party_disembarked", shipName: ship.name });
  }

  saveClientCharacter(client);
  send(client, {
    type: "teleport",
    portalId: `planet_${planet.id}_descent`,
    name: planet.name,
    color: planet.surfacePrimary || "#67f0ff",
    style: "stargate",
    theme: getWorldThemeAt(player.x, player.y),
    x: player.x,
    y: player.y
  });
  send(client, { type: "serverMessage", message: "planet_arrived", planetName: planet.name });
  broadcastSnapshot();
}

function handleShipDockRequest(client) {
  if (client.player?.ship) {
    client.player.ship.docking = null;
  }
}

function handleShipTerminalInteract(client, message = {}) {
  if (!client.player || client.player.ship?.boarded) {
    return false;
  }

  const port = resolveShipLaunchPort(client.player, message);
  if (!port) {
    return false;
  }

  return sendShipTerminalWindow(client, port);
}

function summonPlayerShipToPort(player, ship, port) {
  if (!player || !ship || !port) {
    return false;
  }
  selectPlayerShip(player, ship.id);
  ship.boarded = false;
  ship.dockX = port.x;
  ship.dockY = port.y;
  ship.dockStationId = "station_ringforge";
  ship.dockPortId = port.id;
  ship.worldX = port.x;
  ship.worldY = port.y;
  ship.facing = facingForDockPort(port);
  return true;
}

function boardPlayerShipAtPort(client, ship, port) {
  if (!client.player || !summonPlayerShipToPort(client.player, ship, port)) {
    return false;
  }
  const layout = getShipLayout(ship);
  const deckMode = layout.crewCapacity > 1;
  ship.boarded = true;
  ship.deckMode = deckMode;
  ship.stationRole = null;
  ship.stationId = null;
  client.player.boardedShip = null;
  client.player.shipStationRole = deckMode ? null : "pilot";
  client.player.shipStationId = deckMode ? null : "pilot";
  ship.worldX = port.x;
  ship.worldY = port.y;
  ship.facing = facingForDockPort(port);
  setPlayerShipLocal(client.player, deckMode ? layout.entry.x : 0, deckMode ? layout.entry.y : 0);
  client.player.x = port.x + (deckMode ? layout.entry.x : 0);
  client.player.y = port.y + (deckMode ? layout.entry.y : 0);
  client.player.facing = facingForDockPort(port);
  client.player.moving = false;
  client.player._stillAccumulator = 0;
  client.player.aboardShipId = null;
  saveClientCharacter(client);
  send(client, {
    type: "serverMessage",
    message: "ship_boarded",
    shipName: client.player.ship.name
  });
  broadcastSnapshot();
  return true;
}

function teleportToPartyShip(client, ownerId, port) {
  if (!client?.player) return false;
  const owner = getPlayerById(ownerId);
  const ship = owner?.ship;
  if (!ship || !ship.boarded) {
    send(client, { type: "serverMessage", message: "party_ship_unavailable" });
    return false;
  }
  const layout = getShipLayout(ship);
  if (!layout || layout.crewCapacity < 2) {
    send(client, { type: "serverMessage", message: "party_ship_full" });
    return false;
  }
  const center = shipCenter(ship);
  if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) return false;
  const owned = getOwnedActiveShip(client.player);
  if (owned && owned !== ship) {
    owned.boarded = false;
    owned.deckMode = false;
    owned.stationRole = null;
    owned.stationId = null;
  }
  ship.deckMode = true;
  client.player.ship = ship;
  client.player.boardedShip = { ownerId: owner.id, shipId: ship.id };
  client.player.aboardShipId = ship.id;
  client.player.shipStationRole = null;
  client.player.shipStationId = null;
  setPlayerShipLocal(client.player, layout.entry.x, layout.entry.y);
  clampPlayerToShipDeck(client.player);
  client.player.facing = facingForDockPort(port);
  client.player.moving = false;
  client.player._stillAccumulator = 0;
  saveClientCharacter(client);
  send(client, {
    type: "serverMessage",
    message: "party_teleported_to_ship",
    shipName: ship.name,
    ownerName: owner.name
  });
  send(client, { type: "shipTerminalClose" });
  broadcastSnapshot();
  return true;
}

function handleShipTerminalAction(client, message = {}) {
  if (!client.player) {
    return;
  }
  if (client.player.ship?.boarded) {
    send(client, { type: "shipTerminalClose" });
    return;
  }

  const port = resolveShipLaunchPort(client.player, message);
  if (!port) {
    send(client, { type: "serverMessage", message: "shop_not_nearby" });
    return;
  }

  if (String(message.action || "") === "boardParty") {
    const ownerId = typeof message.ownerId === "string" ? message.ownerId : null;
    if (!ownerId) {
      send(client, { type: "serverMessage", message: "party_ship_unavailable" });
      sendShipTerminalWindow(client, port);
      return;
    }
    if (!teleportToPartyShip(client, ownerId, port)) {
      sendShipTerminalWindow(client, port);
    }
    return;
  }

  ensurePlayerFleet(client.player);
  const shipId = typeof message.shipId === "string" ? message.shipId : client.player.activeShipId;
  const ship = selectPlayerShip(client.player, shipId);
  if (!ship) {
    send(client, { type: "serverMessage", message: "ship_not_owned" });
    sendShipTerminalWindow(client, port);
    return;
  }

  const action = String(message.action || "");
  if (action === "summon") {
    summonPlayerShipToPort(client.player, ship, port);
    saveClientCharacter(client);
    send(client, { type: "serverMessage", message: "ship_called", shipName: ship.name });
    sendShipTerminalWindow(client, port);
    broadcastSnapshot();
    return;
  }

  if (action === "board") {
    send(client, { type: "shipTerminalClose" });
    boardPlayerShipAtPort(client, ship, port);
  }
}

function questStepFor(questId, quest) {
  const def = QUEST_DEFINITIONS[questId];
  if (!def || !quest || quest.completed) return null;
  return def.steps[quest.step] || null;
}

function questStepProgressText(step, quest) {
  if (!step) return "";
  if (step.type === "kill") {
    return `${Math.min(step.count, quest.progress || 0)} / ${step.count}`;
  }
  if (step.type === "location") {
    return "Travel";
  }
  return "Speak";
}

function buildQuestSnapshot(player) {
  const quests = sanitizeQuestLog(player?.quests || {});
  return Object.values(quests).map((quest) => {
    const def = QUEST_DEFINITIONS[quest.id];
    const step = questStepFor(quest.id, quest);
    return {
      id: quest.id,
      title: def.title,
      summary: def.summary,
      giverId: def.giverId,
      step: quest.step,
      progress: quest.progress,
      completed: Boolean(quest.completed),
      rewardGold: def.rewardGold || 0,
      rewardXp: def.rewardXp || 0,
      objective: step
        ? {
            type: step.type,
            text: step.text,
            progressText: questStepProgressText(step, quest),
            target: step.target || null,
            radius: step.radius || null,
            npcId: step.npcId || null
          }
        : null
    };
  });
}

function activeQuestByNpc(player, npcId) {
  for (const [questId, quest] of Object.entries(player.quests || {})) {
    const step = questStepFor(questId, quest);
    if (step?.type === "talk" && step.npcId === npcId) {
      return { questId, quest, step };
    }
  }
  return null;
}

function playerQuestLocationPoint(player) {
  if (!player) return null;
  if (player.ship?.boarded) {
    return shipCenter(player.ship, player);
  }
  return { x: Number(player.x) || 0, y: Number(player.y) || 0 };
}

function processQuestLocationObjectives(now = Date.now()) {
  void now;
  for (const client of clients.values()) {
    const player = client.player;
    if (!player?.quests) continue;
    const point = playerQuestLocationPoint(player);
    if (!point) continue;
    for (const [questId, quest] of Object.entries(player.quests)) {
      const step = questStepFor(questId, quest);
      if (step?.type !== "location" || !step.target) continue;
      const tx = Number(step.target.x);
      const ty = Number(step.target.y);
      if (!Number.isFinite(tx) || !Number.isFinite(ty)) continue;
      const radius = Math.max(3, Number(step.radius) || Number(step.target.radius) || 12);
      if (Math.hypot(point.x - tx, point.y - ty) <= radius) {
        completeQuestStep(client, questId);
        break;
      }
    }
  }
}

function completeQuestStep(client, questId) {
  const player = client.player;
  const quest = player?.quests?.[questId];
  const def = QUEST_DEFINITIONS[questId];
  if (!player || !quest || !def || quest.completed) return false;
  quest.step += 1;
  quest.progress = 0;
  if (quest.step >= def.steps.length) {
    quest.completed = true;
    const xpReward = clampInteger(def.rewardXp || 0, 0, 1000000);
    const goldReward = clampInteger(def.rewardGold || 0, 0, 1000000);
    if (xpReward > 0) {
      awardXp(player, xpReward);
    }
    if (goldReward > 0) {
      player.gold += goldReward;
    }
    send(client, {
      type: "serverMessage",
      message: "quest_completed",
      questTitle: def.title,
      xpGained: xpReward,
      goldGained: goldReward
    });
  } else {
    send(client, { type: "serverMessage", message: "quest_updated", questTitle: def.title });
  }
  saveClientCharacter(client);
  broadcastSnapshot();
  return true;
}

function nearestQuestNpc(player, message = {}) {
  const tx = Number(message.x);
  const ty = Number(message.y);
  const useTarget = Number.isFinite(tx) && Number.isFinite(ty);
  let best = null;
  let bestDist = Infinity;
  for (const questId of Object.keys(QUEST_DEFINITIONS)) {
    const def = QUEST_DEFINITIONS[questId];
    const npc = getNpcById(def.giverId);
    if (!npc) continue;
    const d = Math.hypot((useTarget ? tx : player.x) - npc.x, (useTarget ? ty : player.y) - npc.y);
    const reach = useTarget ? 1.45 : QUEST_INTERACT_RADIUS;
    const playerReach = Math.hypot(player.x - npc.x, player.y - npc.y);
    if (d <= reach && playerReach <= QUEST_INTERACT_RADIUS && d < bestDist) {
      bestDist = d;
      best = npc;
    }
  }
  return best;
}

function findNextQuestFromNpc(player, npc) {
  const ids = Array.isArray(npc?.questIds) ? npc.questIds : Object.values(QUEST_DEFINITIONS)
    .filter((def) => def.giverId === npc?.id)
    .map((def) => def.id);
  for (const questId of ids) {
    const def = QUEST_DEFINITIONS[questId];
    const quest = player.quests?.[questId];
    if (def && !quest) {
      return def;
    }
  }
  for (const questId of ids) {
    const def = QUEST_DEFINITIONS[questId];
    const quest = player.quests?.[questId];
    if (def && quest && !quest.completed) {
      return def;
    }
  }
  return null;
}

function handleQuestNpc(client, message = {}) {
  const player = client.player;
  if (!player) return;
  const npcId = typeof message.npcId === "string" ? message.npcId.slice(0, 96) : null;
  const npc = npcId ? getNpcById(npcId) : nearestQuestNpc(player, message);
  if (!npc || Math.hypot(npc.x - player.x, npc.y - player.y) > QUEST_INTERACT_RADIUS) {
    send(client, { type: "serverMessage", message: "quest_too_far" });
    return;
  }

  player.quests = sanitizeQuestLog(player.quests || {});
  const activeTalk = activeQuestByNpc(player, npc.id);
  if (activeTalk) {
    completeQuestStep(client, activeTalk.questId);
    return;
  }

  const next = findNextQuestFromNpc(player, npc);
  if (!next) {
    send(client, { type: "serverMessage", message: "quest_none" });
    return;
  }
  const existing = player.quests[next.id];
  if (existing?.completed) {
    send(client, { type: "serverMessage", message: "quest_none" });
    return;
  }
  if (existing) {
    send(client, { type: "serverMessage", message: "quest_in_progress", questTitle: next.title });
    return;
  }
  // Offer the quest to the player rather than auto-accepting.
  send(client, {
    type: "questOffer",
    npcId: npc.id,
    npcName: npc.name || "",
    quest: {
      id: next.id,
      title: next.title,
      summary: next.summary,
      rewardGold: next.rewardGold,
      rewardXp: next.rewardXp,
      steps: Array.isArray(next.steps) ? next.steps.map((step) => ({ text: step.text, type: step.type, count: step.count })) : []
    }
  });
}

function handleQuestAccept(client, message = {}) {
  const player = client.player;
  if (!player) return;
  const questId = typeof message.questId === "string" ? message.questId : null;
  const def = questId ? QUEST_DEFINITIONS[questId] : null;
  if (!def) return;
  player.quests = sanitizeQuestLog(player.quests || {});
  const existing = player.quests[def.id];
  if (existing) {
    if (existing.completed) {
      send(client, { type: "serverMessage", message: "quest_none" });
    } else {
      send(client, { type: "serverMessage", message: "quest_in_progress", questTitle: def.title });
    }
    return;
  }
  // Make sure the player is still in range of the giver before committing.
  const giver = getNpcById(def.giverId);
  if (!giver || Math.hypot(giver.x - player.x, giver.y - player.y) > QUEST_INTERACT_RADIUS + 1) {
    send(client, { type: "serverMessage", message: "quest_too_far" });
    return;
  }
  player.quests[def.id] = { id: def.id, step: 0, progress: 0, completed: false };
  send(client, { type: "serverMessage", message: "quest_started", questTitle: def.title });
  saveClientCharacter(client);
  broadcastSnapshot();
}

function handleAbandonQuest(client, message = {}) {
  const player = client.player;
  const questId = typeof message.questId === "string" ? message.questId : null;
  if (!player || !questId || !QUEST_DEFINITIONS[questId]) return;
  const quest = player.quests?.[questId];
  if (!quest || quest.completed) return;
  delete player.quests[questId];
  send(client, { type: "serverMessage", message: "quest_abandoned", questTitle: QUEST_DEFINITIONS[questId].title });
  saveClientCharacter(client);
  broadcastSnapshot();
}

function mobMatchesQuestStep(mob, step) {
  if (!mob || !step || step.type !== "kill") return false;
  if (step.isShipPirate && mob.isShipPirate) return true;
  if (step.campId && mob.campId === step.campId) return true;
  if (step.faction && mob.faction === step.faction) return true;
  if (step.biome && mob.biome === step.biome) return true;
  if (step.matchName && String(mob.name || "").toLowerCase().includes(String(step.matchName).toLowerCase())) return true;
  return false;
}

function recordMobDefeatForQuests(client, mob) {
  if (minigames && client?.player) {
    minigames.onMobDefeat(client, mob);
  }
  const player = client?.player || client;
  if (!player?.quests) return;
  let changed = false;
  for (const [questId, quest] of Object.entries(player.quests)) {
    const step = questStepFor(questId, quest);
    if (!mobMatchesQuestStep(mob, step)) continue;
    quest.progress = Math.min(step.count, (quest.progress || 0) + 1);
    changed = true;
    if (quest.progress >= step.count) {
      if (client?.player) {
        completeQuestStep(client, questId);
      } else {
        quest.step += 1;
        quest.progress = 0;
      }
    }
  }
  if (changed && client?.player) {
    saveClientCharacter(client);
    broadcastSnapshot();
  }
}

function nearestProfessionNpc(player, message = {}) {
  const tx = Number(message.x);
  const ty = Number(message.y);
  const useTarget = Number.isFinite(tx) && Number.isFinite(ty);
  let best = null;
  let bestDist = Infinity;
  for (const npc of getNpcSnapshot()) {
    if (!npc?.professionTrainer || !PROFESSION_DEFINITIONS[npc.professionTrainer]) continue;
    const px = useTarget ? tx : player.x;
    const py = useTarget ? ty : player.y;
    const d = Math.hypot(px - npc.x, py - npc.y);
    const playerReach = Math.hypot(player.x - npc.x, player.y - npc.y);
    if (d <= 1.6 && playerReach <= PROFESSION_INTERACT_RADIUS && d < bestDist) {
      best = npc;
      bestDist = d;
    }
  }
  return best;
}

function learnProfessionFromNpc(client, npc) {
  const player = client.player;
  const professionId = npc?.professionTrainer;
  const def = PROFESSION_DEFINITIONS[professionId];
  if (!player || !def) return false;
  player.professions = sanitizeProfessions(player.professions || {});
  if (!player.professions[professionId]) {
    player.professions[professionId] = { id: professionId, level: 1, xp: 0 };
    saveClientCharacter(client);
    send(client, {
      type: "serverMessage",
      message: "profession_learned",
      professionName: def.name
    });
    pushChat({ kind: "system", name: "Realm", text: `${npc.name} teaches you ${def.name}.` });
    broadcastSnapshot();
  } else {
    startProfessionMinigame(client, professionId, npc.name || def.name);
  }
  return true;
}

function nearestProfessionBuilding(player) {
  let best = null;
  let bd = Infinity;
  for (const b of BUILDING_LIST) {
    if (!b.professionId || !PROFESSION_DEFINITIONS[b.professionId]) continue;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const d = Math.hypot(player.x - cx, player.y - cy);
    if (d < bd && d <= PROFESSION_INTERACT_RADIUS) {
      bd = d;
      best = b;
    }
  }
  return best;
}

function startProfessionMinigame(client, professionId, sourceName = "workbench") {
  const player = client.player;
  const def = PROFESSION_DEFINITIONS[professionId];
  if (!player || !def) return false;
  player.professions = sanitizeProfessions(player.professions || {});
  if (!player.professions[professionId]) {
    send(client, { type: "serverMessage", message: "profession_unknown", professionName: def.name });
    pushChat({ kind: "system", name: "Realm", text: `Learn ${def.name} from a trainer before using the ${sourceName}.` });
    return true;
  }
  const now = Date.now();
  if (player._professionGame?.active || player._fletchingGame?.active) {
    return true;
  }
  if ((player._professionCooldownAt || 0) + FLETCHING_GAME_COOLDOWN_MS > now) {
    return true;
  }
  const sessionId = Math.random().toString(36).slice(2, 10);
  player._professionGame = {
    sessionId,
    active: true,
    professionId,
    hit: 0,
    total: FLETCHING_GAME_SHAFTS,
    startedAt: now,
    beatStartedAt: now,
    goldEarned: 0
  };
  send(client, {
    type: "fletchingMinigame",
    sessionId,
    title: def.label,
    product: def.product,
    totalShafts: FLETCHING_GAME_SHAFTS,
    beatIntervalMs: FLETCHING_BEAT_INTERVAL_MS,
    windowMs: FLETCHING_WINDOW_MS
  });
  return true;
}

function handleProfessionBuildingInteract(client, message) {
  if (!client.player) return false;
  const building = nearestProfessionBuilding(client.player);
  if (!building) return false;
  return startProfessionMinigame(client, building.professionId, building.name || "workbench");
}

function handleInteract(client, message = {}) {
  if (!client.player) {
    return;
  }

  const sharedShip = findBoardableSharedShip(client, message);
  if (sharedShip && boardSharedShip(client, sharedShip, message)) {
    return;
  }

  if (handleShipInteract(client, message)) {
    return;
  }

  if (handleShipTerminalInteract(client, message)) {
    return;
  }

  if (handleProfessionBuildingInteract(client, message)) {
    return;
  }

  // Fletcher building interactions: arrow pickup or mini-game
  if (handleFletcherBuildingInteract(client, message)) {
    return;
  }

  // Archer delivery: player carrying arrows walks to wall archer
  if (handleArrowDelivery(client, message)) {
    return;
  }

  const shop = nearestShopFixture(client.player, message);
  if (shop) {
    sendShopWindow(client, shop);
    return;
  }

  const chest = nearestClosedChest(client.player);
  if (chest) {
    lootWorldChest(client, chest);
    return;
  }

  const questNpc = nearestQuestNpc(client.player, message);
  if (questNpc) {
    handleQuestNpc(client, { npcId: questNpc.id });
    return;
  }

  const professionNpc = nearestProfessionNpc(client.player, message);
  if (professionNpc && learnProfessionFromNpc(client, professionNpc)) {
    return;
  }

  const roadside = resolveInteractRoadside(client.player, message);
  if (roadside) {
    if (roadside.kind === "bench") {
      const seat = resolveBenchSeatForPlayer(roadside);
      client.player.x = seat.dx;
      client.player.y = seat.dy;
      client.player.facing = seat.facing;
      client.player.moving = false;
      client.player._stillAccumulator = 0;
      /** Sit until voluntary movement clears it on client; server echoes position each snapshot. */
      send(client, { type: "roadsideRest", seatBench: true });
      broadcastSnapshot();
      pushChat({
        kind: "system",
        name: "Realm",
        text: "You rest awhile on the bench."
      });
      return;
    }
    if (roadside.kind === "fountain") {
      if ((client.player.gold || 0) < 1) {
        send(client, { type: "serverMessage", message: "fountain_no_gold" });
        return;
      }
      client.player.gold -= 1;
      const fw = Math.max(1, Math.floor(Number(roadside.footprintW) || 4));
      const fh = Math.max(1, Math.floor(Number(roadside.footprintH) || 4));
      const tcx = roadside.x + fw / 2;
      const tcy = roadside.y + fh / 2;
      send(client, {
        type: "fountainToss",
        durationMs: 920,
        targetX: tcx,
        targetY: tcy
      });
      saveClientCharacter(client);
      broadcastSnapshot();
      pushChat({
        kind: "system",
        name: "Realm",
        text: "You flip a gold coin into the fountain — it rings once and vanishes in the shimmer."
      });
      return;
    }
    let vibe = "You linger at the roadside.";
    if (roadside.kind === "market_stand") {
      vibe = "You browse crates and linens at the market stand.";
    } else if (roadside.kind === "small_tree") {
      vibe = "You pause in the shade of a small tree.";
    } else if (roadside.kind.includes("chair")) {
      vibe = "You sit on the pub chair awhile.";
    } else if (roadside.kind.includes("pub")) {
      vibe = "You linger at the pub seating.";
    } else if (roadside.kind.includes("table")) {
      vibe = "You linger at the roadside table.";
    }
    pushChat({
      kind: "system",
      name: "Realm",
      text: vibe
    });
    return;
  }

  const minigameSite = minigames?.findSiteNear(client.player, message);
  if (minigameSite && minigames.handleInteract(client, minigameSite)) {
    return;
  }

  const ground = nearestGroundItem(client.player);
  if (!ground) {
    send(client, { type: "serverMessage", message: "nothing_nearby" });
    return;
  }

  pickupGroundItem(client, ground);
}

// ── Fletching mini-game constants ─────────────────────────────────────────────
const FLETCHING_GAME_SHAFTS = 6;       // number of timing beats per session
const FLETCHING_BEAT_INTERVAL_MS = 1600; // ms between beats
const FLETCHING_WINDOW_MS = 320;        // ms of green zone either side of center
const FLETCHING_GOLD_PERFECT = 3;
const FLETCHING_GOLD_OK = 1;
const FLETCHING_GAME_COOLDOWN_MS = 3000; // ms before player can start another session

const FLETCHER_INTERACT_RADIUS = 5.5; // tiles — generous so player can stand near door
const FLETCHER_ARROW_PICKUP_COUNT = 10; // arrows given per visit
const FLETCHER_PICKUP_COOLDOWN_MS = 8000; // prevent instant re-pickup

const ARCHER_DELIVER_RADIUS = 3.0;
const ARROW_DELIVER_GOLD_PER_ARROW = 2; // gold earned per arrow delivered

function nearestFletcherBuilding(player) {
  let best = null;
  let bd = Infinity;
  for (const b of BUILDING_LIST) {
    if (b.type !== "fletcher") continue;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const d = Math.hypot(player.x - cx, player.y - cy);
    if (d < bd && d <= FLETCHER_INTERACT_RADIUS) {
      bd = d;
      best = b;
    }
  }
  return best;
}

function nearestNeedyArcher(player) {
  let best = null;
  let bd = Infinity;
  for (const id of TOWN_ARCHER_IDS) {
    const npc = getNpcById(id);
    if (!npc) continue;
    const ax = Number.isFinite(npc.supplyX) ? npc.supplyX : npc.homeX;
    const ay = Number.isFinite(npc.supplyY) ? npc.supplyY : npc.homeY;
    const d = Math.hypot(player.x - ax, player.y - ay);
    if (d < bd && d <= ARCHER_DELIVER_RADIUS) {
      bd = d;
      best = npc;
    }
  }
  return best;
}

function handleFletcherBuildingInteract(client, message) {
  if (!client.player) return false;
  const player = client.player;

  const bld = nearestFletcherBuilding(player);
  if (!bld) return false;

  const now = Date.now();

  // If player is carrying arrows, just remind them to deliver
  if ((player.carryingArrows || 0) > 0) {
    send(client, { type: "serverMessage", message: "fletcher_carrying_already" });
    pushChat({ kind: "system", name: "Realm", text: `You're already carrying ${player.carryingArrows} arrows. Deliver them to wall archers first!` });
    return true;
  }

  // If active fletching game, don't start a new one
  if (player._fletchingGame && player._fletchingGame.active) {
    return true;
  }

  // Cooldown check
  if ((player._fletcherPickupAt || 0) + FLETCHER_PICKUP_COOLDOWN_MS > now) {
    const secsLeft = Math.ceil(((player._fletcherPickupAt || 0) + FLETCHER_PICKUP_COOLDOWN_MS - now) / 1000);
    pushChat({ kind: "system", name: "Realm", text: `The fletcher needs ${secsLeft}s to prepare more arrows.` });
    return true;
  }

  // Start fletching mini-game
  const sessionId = Math.random().toString(36).slice(2, 10);
  player._fletchingGame = {
    sessionId,
    active: true,
    shaft: 0,
    totalShafts: FLETCHING_GAME_SHAFTS,
    startedAt: now,
    beatStartedAt: now,
    goldEarned: 0
  };
  send(client, {
    type: "fletchingMinigame",
    sessionId,
    totalShafts: FLETCHING_GAME_SHAFTS,
    beatIntervalMs: FLETCHING_BEAT_INTERVAL_MS,
    windowMs: FLETCHING_WINDOW_MS
  });
  return true;
}

function handleFletchingTap(client, message) {
  if (!client.player) return;
  const player = client.player;
  if (player._professionGame?.active && player._professionGame.sessionId === message.sessionId) {
    handleProfessionTap(client, message);
    return;
  }
  const game = player._fletchingGame;
  if (!game || !game.active || game.sessionId !== message.sessionId) return;

  const now = Date.now();
  const elapsed = now - game.beatStartedAt;
  const center = FLETCHING_BEAT_INTERVAL_MS / 2;
  const dist = Math.abs(elapsed - center);
  let quality = "miss";
  let gold = 0;
  if (dist <= FLETCHING_WINDOW_MS / 4) {
    quality = "perfect";
    gold = FLETCHING_GOLD_PERFECT;
  } else if (dist <= FLETCHING_WINDOW_MS / 2) {
    quality = "good";
    gold = FLETCHING_GOLD_OK;
  }

  game.goldEarned += gold;
  game.shaft += 1;
  game.beatStartedAt = now;

  const done = game.shaft >= game.totalShafts;
  if (done) {
    game.active = false;
    player.carryingArrows = FLETCHER_ARROW_PICKUP_COUNT;
    player._fletcherPickupAt = now;
    if (player.professions?.fletching) {
      awardProfessionXp(player, "fletching", FLETCHING_GAME_SHAFTS * 2);
    }
    if (game.goldEarned > 0) {
      player.gold = Math.min(100000000, (player.gold || 0) + game.goldEarned);
      saveClientCharacter(client);
    }
    send(client, { type: "fletchingResult", sessionId: game.sessionId, quality, gold, totalGold: game.goldEarned, arrows: FLETCHER_ARROW_PICKUP_COUNT, done: true });
    pushChat({ kind: "system", name: "Realm", text: `Fletching done! Earned ${game.goldEarned} gold. You have ${FLETCHER_ARROW_PICKUP_COUNT} arrows — deliver them to wall archers!` });
    broadcastSnapshot();
  } else {
    send(client, { type: "fletchingResult", sessionId: game.sessionId, quality, gold, shaft: game.shaft, totalShafts: game.totalShafts, done: false });
  }
}

function handleProfessionTap(client, message) {
  const player = client.player;
  const game = player?._professionGame;
  if (!player || !game || !game.active || game.sessionId !== message.sessionId) return;
  const def = PROFESSION_DEFINITIONS[game.professionId];
  if (!def) {
    game.active = false;
    return;
  }

  const now = Date.now();
  const elapsed = now - game.beatStartedAt;
  const center = FLETCHING_BEAT_INTERVAL_MS / 2;
  const dist = Math.abs(elapsed - center);
  let quality = "miss";
  let gold = 0;
  let xp = 1;
  if (dist <= FLETCHING_WINDOW_MS / 4) {
    quality = "perfect";
    gold = Math.max(1, Math.round(def.rewardGold / 3));
    xp = Math.max(2, Math.round(def.xp / 2));
  } else if (dist <= FLETCHING_WINDOW_MS / 2) {
    quality = "good";
    gold = Math.max(1, Math.round(def.rewardGold / 6));
    xp = Math.max(1, Math.round(def.xp / 3));
  }

  game.goldEarned += gold;
  game.hit += 1;
  game.beatStartedAt = now;
  awardProfessionXp(player, game.professionId, xp);

  const done = game.hit >= game.total;
  if (done) {
    game.active = false;
    player._professionCooldownAt = now;
    if (game.goldEarned > 0) {
      player.gold = Math.min(100000000, (player.gold || 0) + game.goldEarned);
    }
    const profession = player.professions?.[game.professionId];
    saveClientCharacter(client);
    send(client, {
      type: "fletchingResult",
      sessionId: game.sessionId,
      quality,
      gold,
      totalGold: game.goldEarned,
      done: true,
      professionName: def.name,
      product: def.product,
      professionLevel: profession?.level || 1
    });
    pushChat({ kind: "system", name: "Realm", text: `${def.name} task complete. Produced ${def.product}, earned ${game.goldEarned} gold, level ${profession?.level || 1}.` });
    broadcastSnapshot();
  } else {
    send(client, {
      type: "fletchingResult",
      sessionId: game.sessionId,
      quality,
      gold,
      shaft: game.hit,
      totalShafts: game.total,
      done: false
    });
  }
}

function handleArrowDelivery(client, message) {
  if (!client.player) return false;
  const player = client.player;
  if (!(player.carryingArrows > 0)) return false;

  const archer = nearestNeedyArcher(player);
  if (!archer) return false;

  const need = Math.max(0, (Number(archer.ammoMax) || 24) - (Number(archer.ammo) || 0));
  if (need <= 0) {
    send(client, { type: "serverMessage", message: "archer_full" });
    return true;
  }

  const deliver = Math.min(player.carryingArrows, need);
  archer.ammo = Math.min(Number(archer.ammoMax) || 24, (Number(archer.ammo) || 0) + deliver);
  player.carryingArrows -= deliver;

  const goldEarned = deliver * ARROW_DELIVER_GOLD_PER_ARROW;
  player.gold = Math.min(100000000, (player.gold || 0) + goldEarned);
  saveClientCharacter(client);

  send(client, { type: "arrowDelivered", delivered: deliver, goldEarned, remaining: player.carryingArrows });
  pushChat({ kind: "system", name: "Realm", text: `Delivered ${deliver} arrows → +${goldEarned} gold! ${player.carryingArrows > 0 ? `${player.carryingArrows} arrows left to deliver.` : "Quiver empty — pick up more from a fletcher."}` });
  broadcastSnapshot();
  return true;
}

function handlePickupGroundItem(client, message) {
  if (!client.player) {
    return;
  }

  const ground = groundItems.find((item) => item.id === message.groundItemId);
  if (!ground || Math.hypot(ground.x - client.player.x, ground.y - client.player.y) > INTERACT_RADIUS + 0.35) {
    send(client, { type: "serverMessage", message: "nothing_nearby" });
    return;
  }

  pickupGroundItem(client, ground);
}

function pickupGroundItem(client, ground) {
  if (!addItemToInventory(client.player, ground.item)) {
    send(client, { type: "serverMessage", message: "inventory_full" });
    return;
  }

  const index = groundItems.findIndex((item) => item.id === ground.id);
  if (index !== -1) {
    groundItems.splice(index, 1);
  }
  deleteGroundItem(worldDb, ground.id);
  send(client, { type: "serverMessage", message: "item_picked_up", itemName: ground.item.name });
  broadcastSnapshot();
}

function handleEquipItem(client, message) {
  if (!client.player) {
    return;
  }

  const slot = clampInteger(message.slot, 0, INVENTORY_SIZE - 1);
  const item = client.player.inventory[slot];
  let equipSlot = getEquipmentSlotForItem(item, message.equipmentSlot);
  if (item?.type === "ring" && !message.equipmentSlot) {
    equipSlot = client.player.equipment.ring1 ? "ring2" : "ring1";
  }
  if (!item || !equipSlot) {
    return;
  }

  const oldMaxHp = client.player.maxHp;
  client.player.inventory[slot] = client.player.equipment[equipSlot];
  client.player.equipment[equipSlot] = item;
  applyDerivedPlayerStats(client.player);
  client.player.hp = Math.min(client.player.maxHp, client.player.hp + Math.max(0, client.player.maxHp - oldMaxHp));
  send(client, { type: "serverMessage", message: "item_equipped", itemName: item.name });
  broadcastSnapshot();
}

function handleUnequipItem(client, message) {
  if (!client.player) {
    return;
  }

  const equipmentSlot = sanitizeChoice(message.equipmentSlot, ["weapon", "body", "ring1", "ring2"], null);
  const item = equipmentSlot ? client.player.equipment[equipmentSlot] : null;
  if (!item) {
    return;
  }

  if (message.drop) {
    client.player.equipment[equipmentSlot] = null;
    addGroundItem(item, client.player.x, client.player.y);
    applyDerivedPlayerStats(client.player);
    send(client, { type: "serverMessage", message: "item_dropped", itemName: item.name });
    broadcastSnapshot();
    return;
  }

  if (!addItemToInventory(client.player, item)) {
    send(client, { type: "serverMessage", message: "inventory_full" });
    return;
  }

  client.player.equipment[equipmentSlot] = null;
  applyDerivedPlayerStats(client.player);
  send(client, { type: "serverMessage", message: "item_unequipped", itemName: item.name });
  broadcastSnapshot();
}

function handleUseItem(client, message) {
  if (!client.player) {
    return;
  }

  const slot = clampInteger(message.slot, 0, INVENTORY_SIZE - 1);
  const item = client.player.inventory[slot];
  if (!item || item.type !== "potion") {
    return;
  }

  if (item.stats && item.stats.dreamHangover) {
    const p = client.player;
    const rawKey = typeof p.homeBuildingKey === "string" ? p.homeBuildingKey : null;
    const key = rawKey ? sanitizeHomeBuildingKey(rawKey) : null;
    const own = key ? ownedBuildings.get(key) : null;
    if (!key || !client.account || !own || own.ownerAccountKey !== client.account.key) {
      send(client, { type: "serverMessage", message: "pub_need_house" });
      return;
    }

    const dreamId = pickPubDreamGirlfriendNpcId();
    const tpl = dreamId ? getCompanionNpcTemplate(dreamId) : null;
    if (!tpl || typeof tpl.companionPrice !== "number") {
      send(client, { type: "serverMessage", message: "companion_unavailable" });
      return;
    }

    p.inventory[slot] = null;

    const heal = Number(item.stats?.healing);
    if (Number.isFinite(heal) && heal > 0) {
      p.hp = Math.min(p.maxHp, (p.hp || 0) + heal);
    }

    registerCompanionSold(tpl.id);
    p.houseCompanion = buildHouseCompanionFromTemplate(tpl);

    const building = BUILDING_LIST.find((b) => `${b.x},${b.y}` === key);
    if (building) {
      p.x = southDoorAnchorWorldX(building);
      p.y = building.y + Math.max(2.2, building.h - 2.4);
      send(client, { type: "pubPassout", durationMs: 3000 });
      send(client, {
        type: "teleport",
        x: p.x,
        y: p.y,
        skipChat: true
      });
      streamChunks(client, nearbyChunks(p.x, p.y, 3));
    }

    saveClientCharacter(client);
    broadcastSnapshot();
    send(client, { type: "serverMessage", message: "item_used", itemName: item.name });
    pushChat({
      kind: "system",
      name: "Realm",
      text: `The room spins shut. You stir on your boards — ${tpl.name} hums softly and claims the spare pillow.`,
    });
    return;
  }

  const heal = item.stats?.healing || 30;
  client.player.hp = Math.min(client.player.maxHp, client.player.hp + heal);
  client.player.inventory[slot] = null;
  send(client, { type: "serverMessage", message: "item_used", itemName: item.name });
  broadcastSnapshot();
}

function handleDropItem(client, message) {
  if (!client.player) {
    return;
  }

  const slot = clampInteger(message.slot, 0, INVENTORY_SIZE - 1);
  const item = client.player.inventory[slot];
  if (!item) {
    return;
  }

  client.player.inventory[slot] = null;
  addGroundItem(item, client.player.x, client.player.y);
  send(client, { type: "serverMessage", message: "item_dropped", itemName: item.name });
  broadcastSnapshot();
}

function handleTraderOpen(client, message) {
  if (!client.player) return;
  const npcId = String(message.npcId || "").slice(0, 64);
  const npc = getNpcById(npcId);
  if (!npc || !npc.isTrader) return;
  if (Math.hypot(npc.x - client.player.x, npc.y - client.player.y) > TRADER_INTERACT_RADIUS) return;
  const stock = traderStocks.get(npcId);
  if (!stock) return;
  send(client, {
    type: "traderInventory",
    npcId,
    npcName: npc.name,
    items: stock.map((entry, index) => ({
      index,
      item: entry.item,
      price: entry.price,
      sold: entry.sold || false
    }))
  });
}

function handleBuyItem(client, message) {
  if (!client.player) return;
  const npcId = String(message.npcId || "").slice(0, 64);
  const npc = getNpcById(npcId);
  if (!npc || !npc.isTrader) return;
  if (Math.hypot(npc.x - client.player.x, npc.y - client.player.y) > TRADER_INTERACT_RADIUS) return;
  const stock = traderStocks.get(npcId);
  if (!stock) return;
  const idx = clampInteger(message.index, 0, stock.length - 1);
  const entry = stock[idx];
  if (!entry || entry.sold) {
    send(client, { type: "serverMessage", message: "item_sold_out" });
    return;
  }
  if (client.player.gold < entry.price) {
    send(client, { type: "serverMessage", message: "not_enough_gold" });
    return;
  }
  if (!addItemToInventory(client.player, cloneItem(entry.item))) {
    send(client, { type: "serverMessage", message: "inventory_full" });
    return;
  }
  client.player.gold -= entry.price;
  entry.sold = true;
  saveClientCharacter(client);
  send(client, { type: "serverMessage", message: "item_bought", itemName: entry.item.name });
  handleTraderOpen(client, { npcId });
  broadcastSnapshot();
}

function handleSellItem(client, message) {
  if (!client.player) return;
  const npcId = String(message.npcId || "").slice(0, 64);
  const npc = getNpcById(npcId);
  if (!npc || !npc.isTrader) return;
  if (Math.hypot(npc.x - client.player.x, npc.y - client.player.y) > TRADER_INTERACT_RADIUS) return;
  const slot = clampInteger(message.slot, 0, INVENTORY_SIZE - 1);
  const item = client.player.inventory[slot];
  if (!item) return;
  const price = getSellPrice(item);
  client.player.inventory[slot] = null;
  client.player.gold = Math.min(100000000, (client.player.gold || 0) + price);
  saveClientCharacter(client);
  send(client, { type: "serverMessage", message: "item_sold", itemName: item.name, goldGained: price });
  handleTraderOpen(client, { npcId });
  broadcastSnapshot();
}

function createBaseStats() {
  return {
    speed: 0,
    strength: 0,
    armour: 0,
    health: 0
  };
}

function xpForNextLevel(level) {
  return XP_BASE_TO_LEVEL + (level - 1) * XP_LEVEL_STEP;
}

function xpForMob(mob) {
  if (mob.isCritter) {
    return typeof mob.critterXp === "number" ? mob.critterXp : 3;
  }
  if (mob.isBoss) {
    return 120 + mob.level * 24 + Math.max(0, mob.maxHp - 120);
  }
  const factionMult = mob.faction === "golem" ? 2.8 : mob.faction === "dragon" ? 2.4 : mob.faction === "demon" ? 2.0 : mob.faction === "bandit" ? 1.5 : mob.faction === "undead" ? 1.35 : 1.0;
  const megaMult = mob.megaBoss ? 4.0 : 1.0;
  return Math.round((18 + mob.level * 8 + Math.floor(mob.maxHp / 8)) * factionMult * megaMult);
}

function goldForMob(mob) {
  if (mob.isCritter) return 1;
  if (mob.isBoss) return 25 + mob.level * 5;
  const factionMult = mob.faction === "golem" ? 3.5 : mob.faction === "dragon" ? 3.0 : mob.faction === "demon" ? 2.4 : mob.faction === "bandit" ? 1.8 : mob.faction === "undead" ? 1.4 : 1.0;
  const megaMult = mob.megaBoss ? 5.0 : 1.0;
  return Math.round((3 + mob.level * 2) * factionMult * megaMult);
}

function awardXp(player, amount) {
  player.xp += amount;
  let levelsGained = 0;

  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level += 1;
    player.statPoints += 1;
    if (player.level % 5 === 0) {
      player.talentPoints = (player.talentPoints || 0) + 1;
    }
    levelsGained += 1;
    player.xpToNext = xpForNextLevel(player.level);
  }

  if (levelsGained > 0) {
    player.hp = player.maxHp;
  }

  return { xpGained: amount, levelsGained };
}

function applyDerivedPlayerStats(player) {
  const equipment = getEquipmentStats(player);
  player.maxHp = PLAYER_MAX_HP + player.stats.health * STAT_POINT_HP + equipment.health;
  player.hp = Math.min(player.hp, player.maxHp);
}

function getPlayerSpeed(player) {
  if (player.ship?.boarded) {
    const base = Number(player.ship.speed) || SHIP_SPEED;
    const tt = Math.min(5, Math.max(1, Math.floor(Number(player.ship.thrustTier) || 1)));
    return base + (tt - 1) * 0.55;
  }
  return PLAYER_SPEED + player.stats.speed * STAT_POINT_SPEED + getEquipmentStats(player).speed;
}

function getAttackDamage(player, loadout) {
  const equipment = getEquipmentStats(player);
  return loadout.damage + player.stats.strength * STAT_POINT_STRENGTH_DAMAGE + equipment.strength + equipment.damage;
}

function applyArmourReduction(player, damage) {
  const armour = player.stats.armour + getEquipmentStats(player).armour;
  const reduction = Math.min(STAT_POINT_ARMOUR_CAP, armour * STAT_POINT_ARMOUR_REDUCTION);
  return Math.max(1, Math.round(damage * (1 - reduction)));
}

function getEquipmentStats(player) {
  const totals = { health: 0, speed: 0, strength: 0, armour: 0, damage: 0 };
  for (const item of Object.values(player.equipment || {})) {
    if (!item?.stats) continue;
    for (const key of Object.keys(totals)) {
      totals[key] += Number(item.stats[key] || 0);
    }
  }
  return totals;
}

function getEquipmentSpecial(player) {
  let lifesteal = 0;
  let consecrationPower = 0;
  for (const item of Object.values(player.equipment || {})) {
    const se = item?.specialEffects;
    if (!se || typeof se !== "object") continue;
    lifesteal += Number(se.lifesteal || 0);
    consecrationPower += Number(se.consecrationPower || 0);
  }
  return { lifesteal, consecrationPower };
}

function getPlayerById(id) {
  for (const c of clients.values()) {
    if (c.player?.id === id) {
      return c.player;
    }
  }
  return null;
}

function spawnConsecrationZone(player, now) {
  const gx = Math.floor(player.x) + 0.5;
  const gy = Math.floor(player.y) + 0.5;
  consecrationZones.push({
    casterId: player.id,
    gx,
    gy,
    radius: SPELL_DAMAGE_PROFILES.consecration.radius,
    expiresAt: now + CONSECRATION_DURATION_MS,
    nextTickAt: now + CONSECRATION_TICK_MS
  });
}

function processConsecrationZones(now) {
  consecrationZones = consecrationZones.filter((z) => z.expiresAt > now);
  for (const z of consecrationZones) {
    if (now < z.nextTickAt) continue;
    z.nextTickAt = now + CONSECRATION_TICK_MS;

    const consecrationCaster = getPlayerById(z.casterId);
    if (!consecrationCaster || consecrationCaster.hp <= 0) continue;

    const profile = SPELL_DAMAGE_PROFILES.consecration;
    const equip = getEquipmentStats(consecrationCaster);
    const spec = getEquipmentSpecial(consecrationCaster);
    const baseDamage =
      profile.damage +
      consecrationCaster.stats.strength * STAT_POINT_STRENGTH_DAMAGE +
      equip.damage;
    const tickDamage = Math.max(
      1,
      Math.round(baseDamage * 0.11 * (1 + (spec.consecrationPower || 0)))
    );

    forEachMobNear(z.gx, z.gy, z.radius + 4, (mob) => {
      if (mob.dead) return;
      if (Math.hypot(mob.x - z.gx, mob.y - z.gy) > z.radius) return;

      const damage = Math.max(1, Math.round(tickDamage + mob.level * 3));
      mob.hp = Math.max(0, mob.hp - damage);
      const event = {
        type: "combat",
        kind: "spell",
        weapon: "consecration",
        projectileKind: null,
        attackerId: consecrationCaster.id,
        x: Number(consecrationCaster.x.toFixed(3)),
        y: Number(consecrationCaster.y.toFixed(3)),
        facing: Number(consecrationCaster.facing.toFixed(3)),
        range: z.radius,
        hit: true,
        targetId: mob.id,
        targetKind: "mob",
        damage,
        targetHp: mob.hp,
        endX: Number(mob.x.toFixed(3)),
        endY: Number(mob.y.toFixed(3))
      };

      if (mob.hp <= 0 && !mob.dead) {
        mob.dead = true;
        mob.respawnAt = now + (mob.isCritter ? 4200 : MOB_RESPAWN_MS);
        event.defeated = true;
        const progress = awardXp(consecrationCaster, xpForMob(mob));
        event.xpGained = progress.xpGained;
        event.levelsGained = progress.levelsGained;
        const goldReward = goldForMob(mob);
        consecrationCaster.gold += goldReward;
        event.goldGained = goldReward;
        dropLootForMob(mob);
        const casterClient = [...clients.values()].find((candidate) => candidate.player?.id === consecrationCaster.id);
        recordMobDefeatForQuests(casterClient || consecrationCaster, mob);
      }

      broadcastCombat(event);
    });

    const healAmt = Math.max(
      3,
      Math.round(consecrationCaster.maxHp * 0.016 * (1 + (spec.consecrationPower || 0) * 0.55))
    );

    for (const client of clients.values()) {
      const pl = client.player;
      if (!pl || pl.hp <= 0) continue;
      if (Math.hypot(pl.x - z.gx, pl.y - z.gy) > z.radius) continue;

      const before = pl.hp;
      pl.hp = Math.min(pl.maxHp, pl.hp + healAmt);
      const gained = pl.hp - before;
      if (gained <= 0) continue;

      broadcastCombat({
        type: "combat",
        kind: "spell",
        weapon: "consecration",
        projectileKind: null,
        attackerId: consecrationCaster.id,
        heal: true,
        healAmount: gained,
        x: Number(pl.x.toFixed(3)),
        y: Number(pl.y.toFixed(3)),
        facing: Number(pl.facing.toFixed(3)),
        range: z.radius,
        hit: true,
        targetId: pl.id,
        targetKind: "player",
        damage: 0,
        targetHp: pl.hp,
        endX: Number(pl.x.toFixed(3)),
        endY: Number(pl.y.toFixed(3))
      });
    }
  }
}

function getActiveLoadout(player) {
  if (player.ship?.boarded && getWorldThemeAt(player.x, player.y) === "sci-fi") {
    const lt = Math.min(5, Math.max(1, Math.floor(Number(player.ship.laserTier) || 1)));
    return {
      weapon: "ship_laser",
      kind: "projectile",
      projectileKind: "laser_bolt",
      cooldownMs: Math.max(150, 400 - lt * 48),
      range: 7.2 + lt * 2.2,
      arc: 0,
      damage: 6 + lt * 3
    };
  }

  const weapon = player.equipment?.weapon;
  if (!weapon) {
    return {
      weapon: "unarmed",
      kind: "swing",
      projectileKind: null,
      cooldownMs: 620,
      range: 1.35,
      arc: Math.PI * 0.58,
      damage: 5
    };
  }

  const weaponStyle = weapon.visual?.weaponStyle || null;
  const weaponColor = weapon.visual?.weaponColor || null;
  // Sci-fi weapon visual styles drive distinct combat FX on the client.
  // Saber-class weapons stay a swing but light up; rifles/blasters fire colored laser bolts.
  const SCIFI_BOLT_STYLES = new Set(["pulse", "ion", "plasma", "rail"]);
  const isSciFiSaber = weaponStyle === "saber";
  const isSciFiBolt = SCIFI_BOLT_STYLES.has(weaponStyle);

  if (weapon.weaponKind === "staff") {
    const base = { ...CLASS_LOADOUTS.mage, damage: 15 };
    if (isSciFiBolt) {
      return { ...base, projectileKind: "laser_bolt", weaponStyle, weaponColor };
    }
    return { ...base, weaponStyle, weaponColor };
  }

  if (weapon.weaponKind === "bow") {
    const base = { ...CLASS_LOADOUTS.ranger, damage: 21 };
    if (isSciFiBolt) {
      return { ...base, projectileKind: "laser_bolt", weaponStyle, weaponColor };
    }
    return { ...base, weaponStyle, weaponColor };
  }

  if (weapon.weaponKind === "sword") {
    const base = { ...CLASS_LOADOUTS.knight, damage: 13 };
    if (isSciFiSaber) {
      return { ...base, weaponStyle, weaponColor };
    }
    return { ...base, weaponStyle, weaponColor };
  }

  return CLASS_LOADOUTS[player.classId] || CLASS_LOADOUTS.ranger;
}

function getEquipmentSlotForItem(item, preferredSlot = null) {
  if (!item) {
    return null;
  }
  if (item.type === "weapon") {
    return "weapon";
  }
  if (item.type === "armor") {
    return "body";
  }
  if (item.type === "ring") {
    return preferredSlot === "ring2" ? "ring2" : "ring1";
  }
  return null;
}

function findAttackTarget(client, loadout) {
  let hit = null;
  let hitKind = null;

  forEachMobNear(client.player.x, client.player.y, Math.max(loadout.range + 4, 12), (mob) => {
    if (mob.dead) {
      return;
    }
    if (!isAttackTarget(client.player, mob, loadout)) {
      return;
    }
    if (!hit || distance(client.player, mob) < distance(client.player, hit)) {
      hit = mob;
      hitKind = "mob";
    }
  });

  for (const other of clients.values()) {
    if (!other.player || other === client || other.player.hp <= 0) {
      continue;
    }
    if (!canAttackAt(other.player.x, other.player.y) || !isAttackTarget(client.player, other.player, loadout)) {
      continue;
    }
    if (!hit || distance(client.player, other.player) < distance(client.player, hit)) {
      hit = other.player;
      hitKind = "player";
    }
  }

  if (!hit) {
    return null;
  }

  return { entity: hit, kind: hitKind };
}

function handleChat(client, message) {
  if (!client.player) {
    send(client, { type: "serverMessage", message: "join_before_chat" });
    return;
  }

  const rawText = typeof message.text === "string" ? message.text.trim().toLowerCase() : "";
  if (rawText === "/sci") {
    handleSciFiTeleport(client);
    return;
  }
  if (rawText === "/home") {
    handleHomeTeleport(client);
    return;
  }

  const now = Date.now();
  if (now - client.lastChatAt < CHAT_COOLDOWN_MS) {
    send(client, { type: "serverMessage", message: "chat_too_fast" });
    return;
  }

  const text = sanitizeChatText(message.text);
  if (!text) {
    return;
  }

  client.lastChatAt = now;
  const chatRow = {
    kind: client.player.isMod ? "mod" : "player",
    fromId: client.player.id,
    name: client.player.name,
    text,
    x: client.player.x,
    y: client.player.y
  };
  if (client.player.isMod && typeof client.account?.username === "string" && client.account.username.trim()) {
    chatRow.modChatTag = client.account.username.trim();
  }
  pushChat(chatRow);
}

function pushChat({ kind, fromId = null, name, text, x = null, y = null, modChatTag = null }) {
  const message = {
    type: "chat",
    id: crypto.randomUUID(),
    kind,
    fromId,
    name,
    text,
    x: Number.isFinite(x) ? Number(x.toFixed(3)) : null,
    y: Number.isFinite(y) ? Number(y.toFixed(3)) : null,
    serverTime: Date.now()
  };
  if (typeof modChatTag === "string" && modChatTag.trim()) {
    message.modChatTag = modChatTag.trim();
  }

  chatHistory.push(message);
  if (chatHistory.length > CHAT_HISTORY_LIMIT) {
    chatHistory.shift();
  }

  for (const client of clients.values()) {
    if (isMessageVisibleToClient(message, client)) {
      send(client, message);
    }
  }
}

function isMessageVisibleToClient(message, client) {
  if (message.kind === "system" || message.fromId === client.player?.id) {
    return true;
  }

  if (!client.player || !Number.isFinite(message.x) || !Number.isFinite(message.y)) {
    return false;
  }

  const view = client.view || defaultViewForPlayer(client.player);
  return (
    message.x >= view.x - view.halfW - CHAT_VIEW_MARGIN_TILES &&
    message.x <= view.x + view.halfW + CHAT_VIEW_MARGIN_TILES &&
    message.y >= view.y - view.halfH - CHAT_VIEW_MARGIN_TILES &&
    message.y <= view.y + view.halfH + CHAT_VIEW_MARGIN_TILES
  );
}

function defaultViewForPlayer(player) {
  return {
    x: player.x,
    y: player.y,
    halfW: 22,
    halfH: 14
  };
}

function nearbyChunks(x, y, radius) {
  const centerX = Math.floor(Math.floor(x) / CHUNK_SIZE);
  const centerY = Math.floor(Math.floor(y) / CHUNK_SIZE);
  const chunks = [];

  for (let cy = centerY - radius; cy <= centerY + radius; cy += 1) {
    for (let cx = centerX - radius; cx <= centerX + radius; cx += 1) {
      chunks.push([cx, cy]);
    }
  }

  return chunks;
}

/** Queue of {client, cx, cy, key} for chunks that need first-time generation off the hot tick path. */
const chunkGenQueue = [];
const pendingChunkClients = new Map();
const chunkWorkerPool = [];
let chunkGenFallbackScheduled = false;
let nextChunkJobId = 1;

function createChunkWorker(index) {
  const worker = new Worker(path.join(__dirname, "chunkWorker.js"));
  if (typeof worker.unref === "function") {
    worker.unref();
  }
  const slot = { worker, index, busy: false, job: null };
  worker.on("message", (message) => handleChunkWorkerMessage(slot, message));
  worker.on("error", (error) => handleChunkWorkerFailure(slot, error));
  worker.on("exit", (code) => {
    if (code !== 0) {
      handleChunkWorkerFailure(slot, new Error(`chunk worker exited with code ${code}`));
    }
  });
  return slot;
}

function initChunkWorkers() {
  for (let i = 0; i < CHUNK_WORKER_COUNT; i += 1) {
    chunkWorkerPool.push(createChunkWorker(i));
  }
  if (chunkWorkerPool.length) {
    console.log(`Balathor chunk workers: ${chunkWorkerPool.length}`);
  } else {
    console.log("Balathor chunk workers disabled; using main-thread chunk fallback");
  }
}

function shutdownChunkWorkers() {
  for (const slot of chunkWorkerPool.splice(0)) {
    slot.busy = false;
    slot.job = null;
    slot._failed = true;
    slot.worker.terminate().catch(() => {});
  }
}

function deliverGeneratedChunk(key, chunk) {
  chunkCache.set(key, chunk);
  const waiters = pendingChunkClients.get(key);
  pendingChunkClients.delete(key);
  if (!waiters) return;
  for (const client of waiters) {
    if (!client.socket || client.socket.destroyed) continue;
    send(client, { type: "chunk", ...chunk });
  }
}

function generateChunkFallback(job) {
  try {
    deliverGeneratedChunk(job.key, generateChunk(job.cx, job.cy));
  } catch (error) {
    pendingChunkClients.delete(job.key);
    console.warn(`[chunk] failed to generate ${job.key}:`, error instanceof Error ? error.message : error);
  }
}

function handleChunkWorkerMessage(slot, message) {
  const job = slot.job;
  slot.busy = false;
  slot.job = null;
  if (message?.error) {
    console.warn(`[chunk-worker:${slot.index}] ${message.error}`);
    if (job) generateChunkFallback(job);
  } else if (message?.chunk && typeof message.key === "string") {
    deliverGeneratedChunk(message.key, message.chunk);
  } else if (job) {
    generateChunkFallback(job);
  }
  dispatchChunkWork();
}

function handleChunkWorkerFailure(slot, error) {
  if (slot._failed) return;
  slot._failed = true;
  console.warn(`[chunk-worker:${slot.index}] disabled:`, error instanceof Error ? error.message : error);
  const job = slot.job;
  slot.busy = false;
  slot.job = null;
  const index = chunkWorkerPool.indexOf(slot);
  if (index !== -1) {
    chunkWorkerPool.splice(index, 1);
  }
  if (job) {
    generateChunkFallback(job);
  }
  dispatchChunkWork();
}

function dispatchChunkWork() {
  for (const slot of chunkWorkerPool) {
    if (slot.busy) continue;
    const job = chunkGenQueue.shift();
    if (!job) break;
    if (chunkCache.has(job.key)) {
      deliverGeneratedChunk(job.key, chunkCache.get(job.key));
      continue;
    }
    slot.busy = true;
    slot.job = { ...job, id: nextChunkJobId++ };
    slot.worker.postMessage(slot.job);
  }
  if (chunkGenQueue.length > 0 && !chunkWorkerPool.length && !chunkGenFallbackScheduled) {
    chunkGenFallbackScheduled = true;
    setImmediate(drainChunkGenFallbackQueue);
  }
}

function drainChunkGenFallbackQueue() {
  chunkGenFallbackScheduled = false;
  const batch = chunkGenQueue.splice(0, 4);
  for (const job of batch) {
    if (chunkCache.has(job.key)) {
      deliverGeneratedChunk(job.key, chunkCache.get(job.key));
    } else {
      generateChunkFallback(job);
    }
  }
  if (chunkGenQueue.length > 0) {
    chunkGenFallbackScheduled = true;
    setImmediate(drainChunkGenFallbackQueue);
  }
}

initChunkWorkers();

function chunkInClientWorld(client, cx, cy) {
  if (!client.player) return true;
  const playerWorld = worldForPosition(client.player.x, client.player.y);
  // Sample the chunk's center to decide which world the tiles belong to.
  // A chunk passes if any corner shares the player's world — generous so
  // chunks straddling a world boundary still stream cleanly.
  const samples = [
    [cx * CHUNK_SIZE + CHUNK_SIZE / 2, cy * CHUNK_SIZE + CHUNK_SIZE / 2],
    [cx * CHUNK_SIZE, cy * CHUNK_SIZE],
    [cx * CHUNK_SIZE + CHUNK_SIZE - 1, cy * CHUNK_SIZE],
    [cx * CHUNK_SIZE, cy * CHUNK_SIZE + CHUNK_SIZE - 1],
    [cx * CHUNK_SIZE + CHUNK_SIZE - 1, cy * CHUNK_SIZE + CHUNK_SIZE - 1]
  ];
  for (const [sx, sy] of samples) {
    if (worldForPosition(sx, sy) === playerWorld) return true;
  }
  return false;
}

function streamChunks(client, chunks) {
  if (!Array.isArray(chunks)) {
    return;
  }

  for (const item of chunks.slice(0, MAX_CHUNKS_PER_REQUEST)) {
    if (!Array.isArray(item) || item.length !== 2) {
      continue;
    }

    const cx = clampInteger(item[0], -4096, 4096);
    const cy = clampInteger(item[1], -4096, 4096);
    const key = `${cx},${cy}`;

    // Skip chunks that belong to a different world — keeps maps isolated.
    if (!chunkInClientWorld(client, cx, cy)) {
      continue;
    }

    if (chunkCache.has(key)) {
      // Already cached — send immediately, no tick cost
      send(client, { type: "chunk", ...chunkCache.get(key) });
    } else if (pendingChunkClients.has(key)) {
      pendingChunkClients.get(key).add(client);
    } else {
      // First-time generation is expensive; run it in the chunk worker pool.
      pendingChunkClients.set(key, new Set([client]));
      chunkGenQueue.push({ cx, cy, key });
      dispatchChunkWork();
    }
  }
}

function snapshotAddToSpatialBucket(buckets, x, y, item, cellSize) {
  const cx = Math.floor(Number(x) / cellSize);
  const cy = Math.floor(Number(y) / cellSize);
  const key = `${cx},${cy}`;
  let arr = buckets.get(key);
  if (!arr) {
    arr = [];
    buckets.set(key, arr);
  }
  arr.push(item);
}

/** Visit every spatial cell whose tile region intersects [minX,maxX]×[minY,maxY] world tile coordinates. */
function snapshotForEachCellInWorldRect(minX, maxX, minY, maxY, cellSize, visitor) {
  const minCx = Math.floor(minX / cellSize);
  const maxCx = Math.floor(maxX / cellSize);
  const minCy = Math.floor(minY / cellSize);
  const maxCy = Math.floor(maxY / cellSize);
  for (let cx = minCx; cx <= maxCx; cx += 1) {
    for (let cy = minCy; cy <= maxCy; cy += 1) {
      visitor(`${cx},${cy}`);
    }
  }
}

function broadcastSnapshot() {
  const joinedClients = [];
  for (const client of clients.values()) {
    if (client.player) {
      joinedClients.push(client);
    }
  }
  if (!joinedClients.length) {
    return;
  }

  const margin = CHAT_VIEW_MARGIN_TILES;
  /** Widen NPC inclusion so crowds at the view edge still get position updates. */
  const npcMargin = margin + 18;
  const cellSize = CHUNK_SIZE;

  // Helper: is a point inside a client's view (with optional margin)
  function isInView(view, x, y, pad = margin) {
    return (
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      x >= view.x - view.halfW - pad &&
      x <= view.x + view.halfW + pad &&
      y >= view.y - view.halfH - pad &&
      y <= view.y + view.halfH + pad
    );
  }

  const playerSnapCache = new Map();

  // Build a compact representation for a player entity (cached per snapshot pass)
  function playerSnapshot(p, viewerId = null) {
    const cacheKey = `${p.id}:${viewerId ?? "_"}`;
    let snap = playerSnapCache.get(cacheKey);
    if (snap) {
      return snap;
    }
    const appearance = getPlayerAppearance(p);
    snap = {
      id: p.id,
      name: p.name,
      classId: p.classId,
      torsoStyle: appearance.torsoStyle,
      weaponStyle: appearance.weaponStyle,
      weaponKind: appearance.weaponKind,
      torsoColor: appearance.torsoColor,
      weaponColor: appearance.weaponColor,
      primary: appearance.torsoColor,
      accent: appearance.weaponColor,
      hp: p.hp,
      maxHp: p.maxHp,
      xp: p.xp,
      level: p.level,
      xpToNext: p.xpToNext,
      statPoints: p.statPoints,
      stats: p.stats,
      gold: p.gold,
      inventory: p.inventory,
      equipment: p.equipment,
      professions: sanitizeProfessions(p.professions),
      ship: p.ship ? serializeShipForPlayer(p, p.ship) : null,
      ...(p.id === viewerId
        ? {
            ships: Array.isArray(p.ships) ? p.ships.map(serializeShip) : [],
            activeShipId: p.activeShipId || getOwnedActiveShip(p)?.id || null,
            quests: buildQuestSnapshot(p),
            minigameStats: minigames ? minigames.serializeMinigameStats(p) : null
          }
        : {}),
      talentPoints: p.talentPoints || 0,
      talents: p.talents || {},
      abilityBar: p.abilityBar || [null, null, null, null, null],
      moveSpeed: Number(getPlayerSpeed(p).toFixed(2)),
      x: Number(p.x.toFixed(3)),
      y: Number(p.y.toFixed(3)),
      facing: Number(p.facing.toFixed(3)),
      moving: p.moving,
      swimming: Boolean(p.swimming),
      shipAmenityPose: (p.shipAmenityPose && p.shipAmenityPose.until > Date.now())
        ? {
            kind: p.shipAmenityPose.kind === "sleep" ? "sleep" : "eat",
            until: p.shipAmenityPose.until
          }
        : null,
      isMod: p.isMod || false,
      emote: (p.emote && p.emote.until > Date.now()) ? p.emote.kind : null,
      aboardShipId: typeof p.aboardShipId === "string" ? p.aboardShipId : null,
      shieldBuff: (p.shieldBuff && p.shieldBuff.expiresAt > Date.now())
        ? {
            spellId: p.shieldBuff.spellId,
            expiresAt: p.shieldBuff.expiresAt,
            color: p.shieldBuff.color,
            lastHitAt: p.shieldBuff.lastHitAt || 0,
            lastHitDx: Number((p.shieldBuff.lastHitDx || 0).toFixed(3)),
            lastHitDy: Number((p.shieldBuff.lastHitDy || 0).toFixed(3))
          }
        : null
    };
    if (
      viewerId &&
      p.id === viewerId &&
      typeof p.homeBuildingKey === "string" &&
      p.homeBuildingKey
    ) {
      snap.homeBuildingKey = p.homeBuildingKey;
    }
    if (viewerId && p.id === viewerId && p.houseCompanion) {
      snap.houseCompanion = p.houseCompanion;
    }
    if (viewerId && p.id === viewerId && p.flirtFollowNpcId) {
      snap.flirtFollowNpcId = p.flirtFollowNpcId;
    }
    playerSnapCache.set(cacheKey, snap);
    return snap;
  }

  const npcsAll = getNpcSnapshot();
  const npcBuckets = new Map();
  for (const n of npcsAll) {
    snapshotAddToSpatialBucket(npcBuckets, n.x, n.y, n, cellSize);
  }

  const chestBuckets = new Map();
  for (const chest of chests) {
    snapshotAddToSpatialBucket(chestBuckets, chest.x, chest.y, chest, cellSize);
  }

  const groundBuckets = new Map();
  for (const g of groundItems) {
    snapshotAddToSpatialBucket(groundBuckets, g.x, g.y, g, cellSize);
  }

  const playerBuckets = new Map();
  const totalOnline = joinedClients.length;
  for (const c of joinedClients) {
    snapshotAddToSpatialBucket(playerBuckets, c.player.x, c.player.y, c, cellSize);
  }

  for (const client of joinedClients) {
    const view = client.view || defaultViewForPlayer(client.player);

    const minX = view.x - view.halfW - margin;
    const maxX = view.x + view.halfW + margin;
    const minY = view.y - view.halfH - margin;
    const maxY = view.y + view.halfH + margin;

    // Each viewer only sees entities sharing the same world (fantasy / sci-fi
    // sector / a specific planet surface). Worlds are otherwise completely
    // isolated — the only crossover is a portal teleport.
    const viewerWorld = worldForPosition(client.player.x, client.player.y);

    const playersVisible = [];
    const seenPid = new Set();

    playersVisible.push(playerSnapshot(client.player, client.player.id));
    seenPid.add(client.player.id);
    snapshotForEachCellInWorldRect(minX, maxX, minY, maxY, cellSize, (key) => {
      const arr = playerBuckets.get(key);
      if (!arr) {
        return;
      }
      for (const cli of arr) {
        const p = cli.player;
        if (!p || seenPid.has(p.id) || cli === client) {
          continue;
        }
        if (worldForPosition(p.x, p.y) !== viewerWorld) {
          continue;
        }
        if (isInView(view, p.x, p.y)) {
          seenPid.add(p.id);
          playersVisible.push(playerSnapshot(p, client.player.id));
        }
      }
    });

    const npcs = [];
    const seenNpc = new Set();
    snapshotForEachCellInWorldRect(minX, maxX, minY, maxY, cellSize, (key) => {
      const arr = npcBuckets.get(key);
      if (!arr) {
        return;
      }
      for (const n of arr) {
        if (seenNpc.has(n.id)) {
          continue;
        }
        if (worldForPosition(n.x, n.y) !== viewerWorld) {
          continue;
        }
        if (isInView(view, n.x, n.y, npcMargin)) {
          seenNpc.add(n.id);
          npcs.push(n);
        }
      }
    });

    const mobs = getMobSnapshot({
      minX,
      maxX,
      minY,
      maxY,
      world: viewerWorld
    });

    const visibleChests = [];
    const seenChest = new Set();
    snapshotForEachCellInWorldRect(minX, maxX, minY, maxY, cellSize, (key) => {
      const arr = chestBuckets.get(key);
      if (!arr) {
        return;
      }
      for (const ch of arr) {
        if (seenChest.has(ch.id)) {
          continue;
        }
        if (isInView(view, ch.x, ch.y)) {
          seenChest.add(ch.id);
          visibleChests.push({ id: ch.id, x: ch.x, y: ch.y, opened: ch.opened });
        }
      }
    });

    const visibleGround = [];
    const seenGround = new Set();
    snapshotForEachCellInWorldRect(minX, maxX, minY, maxY, cellSize, (key) => {
      const arr = groundBuckets.get(key);
      if (!arr) {
        return;
      }
      for (const g of arr) {
        if (seenGround.has(g.id)) {
          continue;
        }
        if (isInView(view, g.x, g.y)) {
          seenGround.add(g.id);
          visibleGround.push({ id: g.id, x: g.x, y: g.y, item: g.item });
        }
      }
    });

    const caravansForViewer = viewerWorld === "fantasy" ? getCaravansSnapshotForViewer(view) : [];
    const asteroidStates = buildAsteroidSnapshotForView(minX, maxX, minY, maxY, viewerWorld);

    send(client, {
      type: "snapshot",
      serverTime: Date.now(),
      worldTime: getWorldTimeSnapshot(),
      tick,
      population: totalOnline,
      players: playersVisible,
      npcs,
      mobs,
      asteroidStates,
      caravans: caravansForViewer,
      chests: visibleChests,
      groundItems: visibleGround,
      party: social ? social.getPartyView(client) : null
    });
  }
}

function broadcastCombat(event) {
  for (const client of clients.values()) {
    send(client, event);
  }
}

function isAttackTarget(attacker, target, loadout) {
  const dx = target.x - attacker.x;
  const dy = target.y - attacker.y;
  const dist = Math.hypot(dx, dy);
  if (dist > loadout.range || dist < 0.01) {
    return false;
  }

  const targetAngle = Math.atan2(dy, dx);
  const delta = Math.abs(normalizeAngle(targetAngle - attacker.facing));
  return delta <= loadout.arc / 2;
}

function isShieldBlocking(target, attacker) {
  if (target.equipment?.weapon?.weaponKind !== "sword") {
    return false;
  }

  const angleToAttacker = Math.atan2(attacker.y - target.y, attacker.x - target.x);
  const delta = Math.abs(normalizeAngle(angleToAttacker - target.facing));
  return delta <= KNIGHT_SHIELD_ARC / 2;
}

function rollBlockChance(player) {
  const weapon = player.equipment?.weapon;
  if (weapon?.weaponKind !== "sword") return false;
  const chance = BLOCK_CHANCE_BY_RARITY[weapon.rarity] ?? BLOCK_CHANCE_BY_RARITY.common;
  return Math.random() < chance;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function createStarterEquipment(classId, appearance) {
  const weaponKindByClass = {
    ranger: "bow",
    mage: "staff",
    knight: "sword"
  };
  const weaponNameByKind = {
    bow: "Training Bow",
    staff: "Apprentice Staff",
    sword: "Squire Sword and Shield"
  };
  const weaponKind = weaponKindByClass[classId] || "bow";
  return {
    weapon: {
      id: `item_${nextItemId++}`,
      templateId: `starter_weapon_${classId}`,
      type: "weapon",
      name: weaponNameByKind[weaponKind],
      icon: weaponKind,
      rarity: "common",
      color: appearance.weaponColor,
      value: 10,
      weaponKind,
      visual: {
        weaponStyle: appearance.weaponStyle,
        weaponColor: appearance.weaponColor
      },
      stats: { damage: 0 }
    },
    body: {
      id: `item_${nextItemId++}`,
      templateId: `starter_body_${classId}`,
      type: "armor",
      name: "Wanderer's Tunic",
      icon: "armor",
      rarity: "common",
      color: appearance.torsoColor,
      value: 12,
      visual: {
        torsoStyle: appearance.torsoStyle,
        torsoColor: appearance.torsoColor
      },
      stats: { health: 8, armour: 1 }
    },
    ring1: null,
    ring2: null
  };
}

function createTraderStock(traderId, seed) {
  const stock = [];
  const count = 8;
  for (let i = 0; i < count; i += 1) {
    const roll = hash2(seed + i, traderId.length + i, 900);
    const qualityBias = roll > 0.85 ? 0.8 : roll > 0.55 ? 0.5 : roll > 0.3 ? 0.25 : 0;
    const item = createLootItem(seed + i * 7, traderId.length * 13 + i, qualityBias);
    stock.push({ item, price: getBuyPrice(item) });
  }
  return stock;
}

function createItemDatabase() {
  const result = [];
  let seed = 0;

  for (const wk of WEAPON_KINDS) {
    for (let j = 0; j < 10; j++) {
      result.push(createWeaponEntry(wk, itemRarity(seed), seed));
      seed++;
    }
  }
  for (const ak of ARMOR_KINDS) {
    for (let j = 0; j < 10; j++) {
      result.push(createArmorEntry(ak, itemRarity(seed), seed));
      seed++;
    }
  }
  for (const rk of RING_KINDS) {
    for (let j = 0; j < 6; j++) {
      result.push(createRingEntry(rk, itemRarity(seed), seed));
      seed++;
    }
  }
  for (const pk of POTION_KINDS) {
    for (let j = 0; j < 8; j++) {
      result.push(createPotionEntry(pk, itemRarity(seed), seed));
      seed++;
    }
  }

  return [...result, ...MYTHIC_ARTIFACT_TEMPLATES];
}

function createWeaponEntry(wk, rarity, seed) {
  const dmg = Math.round((wk.dmgMin + hash2(seed, 2, 711) * (wk.dmgMax - wk.dmgMin)) * rarity.multiplier);
  const str = hash2(seed, 3, 712) > 0.70 ? Math.ceil(rarity.multiplier) : 0;
  const color = ITEM_COLORS[seed % ITEM_COLORS.length];
  const visualStyle = rarity.id === "legendary" ? "legendary" : wk.style;
  const name = rarity.id === "legendary" ? `⚜ ${wk.name} of Legend` : `${rarity.label} ${wk.name}`;
  return {
    templateId: `weapon_${seed}`,
    type: "weapon",
    name,
    icon: wk.wk,
    rarity: rarity.id,
    color,
    weaponKind: wk.wk,
    visual: { weaponStyle: visualStyle, weaponColor: color },
    value: Math.round((28 + dmg * 4 + str * 12) * rarity.multiplier),
    stats: { damage: dmg, ...(str ? { strength: str } : {}) }
  };
}

function createArmorEntry(ak, rarity, seed) {
  const hp  = Math.round((ak.hpMin + hash2(seed, 4, 713) * (ak.hpMax - ak.hpMin)) * rarity.multiplier);
  const arm = Math.max(ak.armMin, Math.round((ak.armMin + hash2(seed, 5, 714) * (ak.armMax - ak.armMin)) * rarity.multiplier));
  const color = ITEM_COLORS[seed % ITEM_COLORS.length];
  const visualStyle = rarity.id === "legendary" ? "legendary" : ak.style;
  const name = rarity.id === "legendary" ? `⚜ ${ak.name} of Legend` : `${rarity.label} ${ak.name}`;
  return {
    templateId: `armor_${seed}`,
    type: "armor",
    name,
    icon: "armor",
    rarity: rarity.id,
    color,
    visual: { torsoStyle: visualStyle, torsoColor: color },
    value: Math.round((24 + hp * 1.5 + arm * 14) * rarity.multiplier),
    stats: { health: hp, armour: arm }
  };
}

function createRingEntry(rk, rarity, seed) {
  const isSpeed = rk.stat === "speed";
  const val = isSpeed
    ? Number((rk.base * rarity.multiplier).toFixed(2))
    : Math.max(1, Math.round(rk.base * rarity.multiplier));
  const name = rarity.id === "legendary" ? `⚜ ${rk.name} of Legend` : `${rarity.label} ${rk.name}`;
  return {
    templateId: `ring_${seed}`,
    type: "ring",
    name,
    icon: "ring",
    rarity: rarity.id,
    color: ITEM_COLORS[seed % ITEM_COLORS.length],
    value: Math.round((32 + val * rk.vscale) * rarity.multiplier),
    stats: { [rk.stat]: val }
  };
}

function createPotionEntry(pk, rarity, seed) {
  const healing = Math.round((pk.healMin + hash2(seed, 6, 715) * (pk.healMax - pk.healMin)) * rarity.multiplier);
  const name = rarity.id === "legendary" ? `⚜ ${pk.name} of Legend` : `${rarity.label} ${pk.name}`;
  return {
    templateId: `potion_${seed}`,
    type: "potion",
    name,
    icon: "potion",
    rarity: rarity.id,
    color: pk.color,
    value: Math.round((12 + healing * 0.8) * rarity.multiplier),
    stats: { healing }
  };
}

function createItemTemplate(type, rarity, index) {
  if (type === "weapon") return createWeaponEntry(WEAPON_KINDS[index % WEAPON_KINDS.length], rarity, index + 9000);
  if (type === "armor")  return createArmorEntry(ARMOR_KINDS[index % ARMOR_KINDS.length], rarity, index + 9000);
  if (type === "ring")   return createRingEntry(RING_KINDS[index % RING_KINDS.length], rarity, index + 9000);
  return createPotionEntry(POTION_KINDS[0], rarity, index + 9000);
}

function createChests() {
  return ENEMY_CAMPS.map((camp, index) => {
    const item = createLootItem(camp.x, camp.y, camp.boss ? 0.7 : 0.25);
    return {
      id: `chest_${camp.id}`,
      x: Number((camp.x + 1.5 + (index % 2)).toFixed(2)),
      y: Number((camp.y + 1.5).toFixed(2)),
      opened: false,
      item
    };
  });
}

function createLootItem(seedX, seedY, qualityBias = 0) {
  const roll = hash2(seedX + nextItemId, seedY - nextItemId, 820) + qualityBias;
  const highQuality =
    roll > 0.992 ? "mythic"
      : roll > 0.97 ? "legendary"
      : roll > 0.92 ? "epic"
      : roll > 0.74 ? "rare"
      : roll > 0.46 ? "uncommon"
      : null;
  const candidates = highQuality
    ? itemDatabase.filter((item) => item.rarity === highQuality)
    : itemDatabase;
  const template = candidates[Math.floor(hash2(seedY, seedX, 821 + nextItemId) * candidates.length)] || itemDatabase[0];
  return cloneItem(template);
}

function cloneItem(template) {
  return {
    ...template,
    id: `item_${nextItemId++}`,
    stats: { ...(template.stats || {}) },
    visual: { ...(template.visual || {}) },
    specialEffects: template.specialEffects ? { ...template.specialEffects } : undefined
  };
}

function getItemValue(item) {
  const direct = Number(item?.value);
  if (Number.isFinite(direct) && direct > 0) {
    return Math.round(direct);
  }

  const stats = item?.stats || {};
  const rarityMultiplier = {
    common: 1,
    uncommon: 1.35,
    rare: 1.8,
    epic: 2.35,
    legendary: 3.5,
    mythic: 5.5
  }[item?.rarity] || 1;
  const statValue =
    (Number(stats.damage) || 0) * 4 +
    (Number(stats.strength) || 0) * 14 +
    (Number(stats.armour) || 0) * 12 +
    (Number(stats.health) || 0) * 1.2 +
    (Number(stats.speed) || 0) * 60 +
    (Number(stats.healing) || 0) * 0.7;
  return Math.max(1, Math.round((12 + statValue) * rarityMultiplier));
}

function getBuyPrice(item) {
  return Math.max(1, Math.ceil(getItemValue(item) * 1.3));
}

function getSellPrice(item) {
  return Math.max(1, Math.floor(getItemValue(item) * 0.5));
}

function addItemToInventory(player, item) {
  const index = player.inventory.findIndex((slot) => slot === null);
  if (index === -1) {
    return false;
  }
  player.inventory[index] = item;
  return true;
}

function dropLootForMob(mob) {
  if (mob.isCritter) {
    return;
  }
  const chance = mob.isBoss ? 1 : 0.62;
  if (Math.random() > chance) {
    return;
  }
  const item = createLootItem(mob.homeX, mob.homeY, mob.isBoss ? 0.65 : 0);
  addGroundItem(item, mob.x, mob.y);
}

/** Restore floor items from SQLite — keeps ids stable across reboots. */
function parseGroundItemFromDbJson(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const t = raw.type;
  if (t !== "weapon" && t !== "armor" && t !== "ring" && t !== "potion") {
    return null;
  }
  return {
    ...raw,
    type: t,
    name: String(raw.name || "Item").slice(0, 48),
    id: typeof raw.id === "string" ? raw.id.slice(0, 48) : `item_${Date.now()}`,
    rarity: typeof raw.rarity === "string" ? raw.rarity.slice(0, 16) : "common",
    color: typeof raw.color === "string" ? raw.color.slice(0, 22) : "#d7e4ef",
    icon: typeof raw.icon === "string" ? raw.icon.slice(0, 24) : undefined,
    weaponKind: typeof raw.weaponKind === "string" ? raw.weaponKind.slice(0, 16) : undefined,
    stats: typeof raw.stats === "object" && raw.stats ? { ...raw.stats } : {},
    visual: typeof raw.visual === "object" && raw.visual ? { ...raw.visual } : {},
    specialEffects:
      typeof raw.specialEffects === "object" && raw.specialEffects ? { ...raw.specialEffects } : {},
    templateId: typeof raw.templateId === "string" ? raw.templateId.slice(0, 64) : undefined
  };
}

function addGroundItem(item, x, y) {
  const row = {
    id: `ground_${nextGroundItemId++}`,
    item,
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3))
  };
  groundItems.push(row);
  insertGroundItem(worldDb, {
    id: row.id,
    x: row.x,
    y: row.y,
    itemJson: JSON.stringify(row.item)
  });
  while (groundItems.length > MAX_GROUND_ITEMS) {
    const removed = groundItems.shift();
    if (removed) {
      deleteGroundItem(worldDb, removed.id);
    }
  }
}

function nearestClosedChest(player) {
  return chests
    .filter((chest) => !chest.opened && Math.hypot(chest.x - player.x, chest.y - player.y) <= INTERACT_RADIUS)
    .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0] || null;
}

function nearestGroundItem(player) {
  return groundItems
    .filter((ground) => Math.hypot(ground.x - player.x, ground.y - player.y) <= INTERACT_RADIUS)
    .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0] || null;
}

function nearestShopFixture(player, message = {}) {
  const targetX = Number(message.x);
  const targetY = Number(message.y);
  if (Number.isFinite(targetX) && Number.isFinite(targetY)) {
    const targeted = getShopFixtureAt(targetX, targetY);
    if (targeted && Math.hypot(targeted.x - player.x, targeted.y - player.y) <= SHOP_INTERACT_RADIUS + 0.65) {
      return targeted;
    }
  }

  const nearby = getShopFixtureAt(player.x, player.y);
  if (nearby && Math.hypot(nearby.x - player.x, nearby.y - player.y) <= SHOP_INTERACT_RADIUS) {
    return nearby;
  }

  return null;
}

function getShopStock(shop) {
  if (shop?.shopType === "ship") {
    return getShipCatalog();
  }
  if (shop?.shopType === "arms") {
    if (getWorldThemeAt(shop.x, shop.y) === "sci-fi") {
      return getSciFiArmoryCatalog();
    }
    const arms = itemDatabase.filter((it) => it && (it.type === "weapon" || it.type === "armor"));
    const seedX = Math.floor((shop.x || 0) * 10);
    const seedY = Math.floor((shop.y || 0) * 10);
    const picks = [];
    const seen = new Set();
    for (let i = 0; i < 40 && picks.length < 20; i++) {
      const idx = Math.floor(hash2(seedX + i * 17, seedY - i * 11, 313) * arms.length);
      const item = arms[idx];
      if (item && !seen.has(item.templateId)) { seen.add(item.templateId); picks.push(item); }
    }
    return picks.length ? picks : arms.slice(0, 20);
  }
  if (shop?.shopType === "stims") {
    const pots = itemDatabase.filter((it) => it && it.type === "potion");
    return pots.slice(0, 16);
  }
  if (shop?.shopType === "parts") {
    return getPartsCatalog();
  }
  if (shop?.isPub) {
    return [...PUB_BAR_STOCK_TEMPLATES];
  }

  const stock = [];
  const seedX = Math.floor(shop.x * 10);
  const seedY = Math.floor(shop.y * 10);
  for (let i = 0; i < 8; i += 1) {
    const index = Math.floor(hash2(seedX + i * 13, seedY - i * 7, 911) * itemDatabase.length);
    const template = itemDatabase[index] || itemDatabase[i % itemDatabase.length];
    if (template) {
      stock.push(template);
    }
  }
  return stock;
}

function publicShopItem(template) {
  if (template?.type === "ship_upgrade") {
    return {
      templateId: template.templateId,
      type: "ship_upgrade",
      name: template.name,
      price: Number(template.price) || 0,
      rarity: template.rarity || "uncommon",
      upgrade: template.upgrade || "speed"
    };
  }
  if (template?.type === "ship") {
    return {
      templateId: template.templateId,
      type: "ship",
      name: template.name,
      icon: template.icon || "ship",
      rarity: template.rarity || "rare",
      color: template.color || "#67f0ff",
      hullClass: template.hullClass || "skiff",
      stats: template.stats || {},
      value: template.value || template.price || SHIP_BUY_PRICE,
      price: template.price || template.value || SHIP_BUY_PRICE,
      shipTemplateId: template.shipTemplateId || template.templateId,
      shipName: template.shipName || template.name,
      shipColor: template.shipColor || template.color || "#67f0ff"
    };
  }
  return {
    templateId: template.templateId,
    type: template.type,
    name: template.name,
    icon: template.icon,
    rarity: template.rarity,
    color: template.color,
    weaponKind: template.weaponKind,
    stats: template.stats || {},
    visual: template.visual || {},
    specialEffects: template.specialEffects ? { ...template.specialEffects } : undefined,
    value: getItemValue(template),
    price: getBuyPrice(template),
    sellPrice: getSellPrice(template)
  };
}

function sendShopWindow(client, shop) {
  send(client, {
    type: "shop",
    id: shop.id,
    name: shop.name,
    buildingName: shop.buildingName,
    isPub: !!shop.isPub,
    shopType: shop.shopType || "trade",
    x: shop.x,
    y: shop.y,
    gold: client.player?.gold || 0,
    stock: getShopStock(shop).map(publicShopItem)
  });
}

function handleShopBuy(client, message) {
  if (!client.player) {
    return;
  }

  const shop = nearestShopFixture(client.player, message);
  if (!shop) {
    send(client, { type: "serverMessage", message: "shop_not_nearby" });
    return;
  }

  const templateId = String(message.templateId || "");
  const template = getShopStock(shop).find((item) => item.templateId === templateId);
  if (!template) {
    send(client, { type: "serverMessage", message: "shop_item_missing" });
    return;
  }

  if (template.type === "ship_upgrade") {
    const sh = ensurePlayerFleet(client.player);
    if (!sh) {
      send(client, { type: "serverMessage", message: "shop_not_nearby" });
      return;
    }
    const price = Number(template.price) || 0;
    if ((client.player.gold || 0) < price) {
      send(client, { type: "serverMessage", message: "not_enough_gold" });
      sendShopWindow(client, shop);
      return;
    }
    const up = String(template.upgrade || "");
    if (up === "laser" && (sh.laserTier || 1) >= 5) {
      send(client, { type: "serverMessage", message: "shop_item_missing" });
      sendShopWindow(client, shop);
      return;
    }
    if (up === "thrust" && (sh.thrustTier || 1) >= 5) {
      send(client, { type: "serverMessage", message: "shop_item_missing" });
      sendShopWindow(client, shop);
      return;
    }
    client.player.gold = Math.max(0, (client.player.gold || 0) - price);
    if (up === "laser") {
      sh.laserTier = Math.min(5, (sh.laserTier || 1) + 1);
    } else if (up === "thrust") {
      sh.thrustTier = Math.min(5, (sh.thrustTier || 1) + 1);
    } else if (up === "speed") {
      sh.speed = Math.min(24, (Number(sh.speed) || SHIP_SPEED) + 0.65);
    }
    saveClientCharacter(client);
    send(client, { type: "serverMessage", message: "item_bought", itemName: template.name });
    sendShopWindow(client, shop);
    broadcastSnapshot();
    return;
  }

  if (template.type === "ship") {
    const shipPrice = Number(template.price || template.value || SHIP_BUY_PRICE);
    if ((client.player.gold || 0) < shipPrice) {
      send(client, { type: "serverMessage", message: "not_enough_gold" });
      sendShopWindow(client, shop);
      return;
    }
    client.player.gold = Math.max(0, (client.player.gold || 0) - shipPrice);
    const dockPort =
      findNearestSciFiDockPort(client.player.x, client.player.y, 80) || getPlayerDockPort(client.player);
    const newShip = sanitizeShip({
      id: createShipId(template.shipTemplateId || template.templateId),
      templateId: template.shipTemplateId || template.templateId,
      name: template.shipName || template.name,
      color: template.shipColor || template.color,
      hullClass: template.hullClass || "skiff",
      boarded: false,
      dockX: dockPort?.x ?? STARGATE_LANDING.x,
      dockY: dockPort?.y ?? STARGATE_LANDING.y,
      dockStationId: "station_ringforge",
      dockPortId: dockPort?.id || null,
      facing: dockPort ? facingForDockPort(dockPort) : 0,
      speed: Number(template.stats?.speed) || SHIP_SPEED,
      laserTier: Math.min(5, Math.max(1, Number(template.laserTier) || 1)),
      thrustTier: Math.min(5, Math.max(1, Number(template.thrustTier) || 1))
    }) || createStarterShip(client.account?.key || client.player.id);
    ensureShipCrew(newShip);
    ensurePlayerFleet(client.player);
    client.player.ships.push(newShip);
    selectPlayerShip(client.player, newShip.id);
    saveClientCharacter(client);
    send(client, { type: "serverMessage", message: "ship_bought", itemName: newShip.name });
    sendShopWindow(client, shop);
    broadcastSnapshot();
    return;
  }

  const price = getBuyPrice(template);
  if ((client.player.gold || 0) < price) {
    send(client, { type: "serverMessage", message: "not_enough_gold" });
    sendShopWindow(client, shop);
    return;
  }

  const item = cloneItem(template);
  if (!addItemToInventory(client.player, item)) {
    send(client, { type: "serverMessage", message: "inventory_full" });
    sendShopWindow(client, shop);
    return;
  }

  client.player.gold = Math.max(0, (client.player.gold || 0) - price);
  saveClientCharacter(client);
  send(client, { type: "serverMessage", message: "shop_bought", itemName: item.name });
  sendShopWindow(client, shop);
  broadcastSnapshot();
}

function handleShopSell(client, message) {
  if (!client.player) {
    return;
  }

  const shop = nearestShopFixture(client.player, message);
  if (!shop) {
    send(client, { type: "serverMessage", message: "shop_not_nearby" });
    return;
  }

  const slot = clampInteger(message.slot, 0, INVENTORY_SIZE - 1);
  const item = client.player.inventory[slot];
  if (!item) {
    sendShopWindow(client, shop);
    return;
  }

  const price = getSellPrice(item);
  client.player.inventory[slot] = null;
  client.player.gold = Math.min(100000000, (client.player.gold || 0) + price);
  saveClientCharacter(client);
  send(client, { type: "serverMessage", message: "shop_sold", itemName: item.name });
  sendShopWindow(client, shop);
  broadcastSnapshot();
}

function getPlayerAppearance(player) {
  const armor = player.equipment?.body;
  const weapon = player.equipment?.weapon;
  return {
    torsoStyle: armor?.visual?.torsoStyle || "tunic",
    weaponStyle: weapon?.visual?.weaponStyle || player.baseWeaponStyle || player.weaponStyle,
    weaponKind: weapon?.weaponKind || null,
    torsoColor: armor?.visual?.torsoColor || "#8a929e",
    weaponColor: weapon?.visual?.weaponColor || player.weaponColor
  };
}

function normalizeAngle(value) {
  let angle = value;
  while (angle > Math.PI) {
    angle -= Math.PI * 2;
  }
  while (angle < -Math.PI) {
    angle += Math.PI * 2;
  }
  return angle;
}

function createSciFiPirateMobs() {
  // Hand-placed pirate fleet anchor points. Each anchor seeds a fleet of N ships orbiting
  // the anchor. All are placed comfortably outside the SCI_FI_SAFE_RADIUS around the station.
  // Declared inside the function so it's evaluated lazily and avoids a temporal dead zone
  // when createMobs() runs at module top-level startup.
  const fleets = [
    // Original fleets — sizes bumped up
    { id: "pirate_eclipse",   name: "Eclipse Raider",    x: 1740, y: -180, size: 14, color: "#ff6b8a", level: 8, battleSide: "eclipse" },
    { id: "pirate_blacksun",  name: "Blacksun Corsair",  x: 2240, y:  250, size: 15, color: "#c084fc", level: 10, battleSide: "blackstar", capital: true, capitalName: "Blacksun Capital" },
    { id: "pirate_redclaw",   name: "Redclaw Marauder",  x: 1660, y:  350, size: 13, color: "#f97316", level: 9, battleSide: "redclaw" },
    { id: "pirate_void",      name: "Void Stalker",      x: 2200, y: -420, size: 15, color: "#22d3ee", level: 11, battleSide: "void", capital: true, capitalName: "Void Capital" },
    { id: "pirate_ironwake",  name: "Ironwake Reaver",   x: 2080, y: -255, size: 13, color: "#facc15", level: 9, battleSide: "eclipse" },
    { id: "pirate_nullfang",  name: "Nullfang Skiff",    x: 1780, y:  265, size: 12, color: "#38bdf8", level: 7, battleSide: "redclaw" },
    // New fleets scattered across the sector
    { id: "pirate_riftclaw",  name: "Riftclaw Brigand",  x: 1580, y: -200, size: 12, color: "#86efac", level: 8, battleSide: "riftclaw" },
    { id: "pirate_ashwing",   name: "Ashwing Raider",    x: 2160, y:  430, size: 13, color: "#fb923c", level: 10, battleSide: "blackstar" },
    { id: "pirate_deathmark", name: "Deathmark Corsair", x: 1910, y: -490, size: 11, color: "#e879f9", level: 11, battleSide: "void" },
    { id: "pirate_ironveil",  name: "Ironveil Scourge",  x: 2310, y: -215, size: 12, color: "#f43f5e", level: 12, battleSide: "blackstar" },
    { id: "pirate_ghost",     name: "Ghost Marauder",    x: 1700, y:  480, size: 11, color: "#94a3b8", level: 8, battleSide: "riftclaw" },
    { id: "pirate_venomfang", name: "Venomfang Pack",    x: 1870, y: -370, size: 10, color: "#4ade80", level: 9, battleSide: "eclipse" },
    { id: "pirate_burnedge",  name: "Burn Edge Fleet",   x: 2320, y:  130, size: 12, color: "#fbbf24", level: 10, battleSide: "blackstar" },
    { id: "pirate_wraithclaw",name: "Wraithclaw Patrol", x: 1560, y:  390, size: 10, color: "#a78bfa", level: 9, battleSide: "riftclaw" },
    // Dense opposing groups around event locations so players can fly into fleet battles.
    { id: "battle_eclipse_line", name: "Eclipse Battlewing", x: 1996, y: -296, size: 10, color: "#ff6b8a", level: 12, battleSide: "eclipse", capital: true, capitalName: "Eclipse Capital" },
    { id: "battle_blackstar_line", name: "Blackstar Battlewing", x: 2076, y: -274, size: 10, color: "#8b5cf6", level: 13, battleSide: "blackstar", capital: true, capitalName: "Blackstar Capital" },
    { id: "pirate_distress", name: "Distress Raider", x: 1748, y: -322, size: 7, color: "#fb7185", level: 9, battleSide: "distress" },
    { id: "derelict_scavenger", name: "Derelict Scavenger", x: 2128, y: 318, size: 8, color: "#f59e0b", level: 10, battleSide: "scavenger", capital: true, capitalName: "Scavenger Capital" },
  ];
  const out = [];
  for (const fleet of fleets) {
    const count = Math.max(1, (fleet.size | 0) * ENEMY_DENSITY_MULTIPLIER);
    for (let i = 0; i < count; i += 1) {
      // Stagger fleet members in a small ring around the anchor point.
      const angle = (i / count) * Math.PI * 2 + (i * 0.37);
      const ringR = 4 + Math.sqrt(i + 1) * 1.8;
      const homeX = fleet.x + Math.cos(angle) * ringR;
      const homeY = fleet.y + Math.sin(angle) * ringR;
      const isCapitalShip = Boolean(fleet.capital && i === 0);
      const isHeavyEscort = !isCapitalShip && i % Math.max(5, Math.floor(count / 4)) === 0;
      const lvl = fleet.level + (isCapitalShip ? 4 : isHeavyEscort ? 2 : 0);
      const maxHp = isCapitalShip ? 420 + lvl * 30 : isHeavyEscort ? 180 + lvl * 18 : 90 + lvl * 14;
      const maxShieldHp = isCapitalShip ? 220 + lvl * 18 : isHeavyEscort ? 70 + lvl * 6 : (i % 7 === 0 ? 38 + lvl * 3 : 0);
      out.push({
        id: `mob_${fleet.id}_${i + 1}`,
        name: isCapitalShip ? (fleet.capitalName || `${fleet.name} Capital`) : fleet.name,
        level: lvl,
        homeX,
        homeY,
        primary: fleet.color,
        accent: "#0a0613",
        faction: fleet.id,
        isShipPirate: true,
        battleSide: fleet.battleSide || fleet.id,
        isCapitalShip,
        hullClass: isCapitalShip ? "crew4" : isHeavyEscort ? "crew2" : (i % Math.max(1, fleet.size | 0) === 0 ? "interceptor" : "fighter"),
        maxHp,
        maxShieldHp,
        shieldHp: maxShieldHp,
        attackDamage: (isCapitalShip ? 16 : isHeavyEscort ? 10 : 6) + Math.floor(lvl * 0.9),
        roamRadius: isCapitalShip ? 5 : 7 + (i % 2) * 3,
        speed: (isCapitalShip ? 1.15 : isHeavyEscort ? 1.45 : 1.9) + hash2(fleet.x, fleet.y, 700 + i) * 0.4
      });
    }
  }
  return out;
}

function createMobs() {
  const fixedMobs = [
    { id: "mob_slime_oasis_1", name: "Oasis Slime", level: 5, homeX: 137, homeY: 113, primary: "#56b88f", accent: "#c7f5b0", maxHp: 74, attackDamage: 13 },
    { id: "mob_slime_oasis_2", name: "Oasis Slime", level: 5, homeX: 163, homeY: 126, primary: "#56b88f", accent: "#c7f5b0", maxHp: 74, attackDamage: 13 },
    { id: "mob_wisp_frost_1", name: "Frost Wisp", level: 7, homeX: -139, homeY: -113, primary: "#88d8ff", accent: "#f0fbff", maxHp: 78, attackDamage: 16 },
    { id: "mob_wisp_frost_2", name: "Frost Wisp", level: 7, homeX: -162, homeY: -132, primary: "#88d8ff", accent: "#f0fbff", maxHp: 78, attackDamage: 16 },
    { id: "mob_imp_ember_1", name: "Ember Imp", level: 9, homeX: 134, homeY: -121, primary: "#d85b35", accent: "#ffd06a", maxHp: 86, attackDamage: 19 },
    { id: "mob_imp_ember_2", name: "Ember Imp", level: 9, homeX: 158, homeY: -142, primary: "#d85b35", accent: "#ffd06a", maxHp: 86, attackDamage: 19 },
  ];
  return [...fixedMobs, ...createWildernessMobs(), ...createRoamingMobs(), ...createCritterMobs(), ...createPlanetSurfaceMobs(), ...createSciFiPirateMobs()].map((mob) => ({
    ...mob,
    x: mob.homeX,
    y: mob.homeY,
    hp: mob.maxHp || 60,
    maxHp: mob.maxHp || 60,
    level: mob.level || 1,
    attackDamage: "attackDamage" in mob ? mob.attackDamage : MOB_ATTACK_DAMAGE,
    dead: false,
    respawnAt: 0,
    lastAttackAt: 0,
    facing: Math.random() * Math.PI * 2,
    _targetX: mob.homeX,
    _targetY: mob.homeY,
    _nextMoveAt: Date.now() + Math.random() * 3000,
    roamRadius: mob.roamRadius || 5,
    speed: mob.speed || 1.7
  }));
}

function createWildernessMobs() {
  const mobs = [];

  for (const camp of ENEMY_CAMPS) {
    const biome = camp.biome || getBiome(camp.x, camp.y);
    const faction = camp.faction;
    const type = (faction && MOB_TYPES[faction]) ? MOB_TYPES[faction] : (MOB_TYPES[biome] || MOB_TYPES.forest);
    const residentCount = Math.max(1, Math.ceil(scaledCampEncounterSize(camp.size, camp) * 2.25));
    const overflowLimit = Math.max(2, Math.floor(residentCount * 0.75));
    const overflowCount = Math.min(
      Math.max(0, residentCount * Math.max(0, ENEMY_DENSITY_MULTIPLIER - 1)),
      overflowLimit
    );
    const totalCount = residentCount + overflowCount;
    const tier = camp.tier || Math.max(1, Math.floor(Math.hypot(camp.x, camp.y) / 90));

    for (let i = 0; i < residentCount; i += 1) {
      const enemy = type.enemies[i % type.enemies.length];
      const level = enemy.level + Math.max(0, tier - 1);
      const angle = hash2(camp.x, camp.y, 300 + i) * Math.PI * 2;
      const radius = 2 + Math.sqrt(i + 1) * 0.62 + hash2(camp.x, camp.y, 400 + i) * 5;
      const rawX = camp.x + Math.cos(angle) * radius;
      const rawY = camp.y + Math.sin(angle) * radius;
      const home = findOpenMobHome(rawX, rawY, camp.x, camp.y);
      mobs.push({
        id: `mob_camp_${camp.id}_${i + 1}`,
        name: enemy.name,
        level,
        homeX: home.x,
        homeY: home.y,
        primary: type.primary,
        accent: type.accent,
        campId: camp.id,
        biome,
        faction: faction || null,
        isDragon: faction === "dragon",
        maxHp: enemy.hp + level * 7 + Math.floor(hash2(camp.x, camp.y, 500 + i) * 14),
        attackDamage: enemy.damage + Math.floor(level * 1.15),
        roamRadius: camp.size >= 6 ? 8.5 : 6.2,
        speed: enemy.speed + hash2(camp.x, camp.y, 600 + i) * 0.18
      });
    }

    const routeAngle = Math.atan2(-camp.y, -camp.x);
    const targetRadius = 104;
    const targetX = Math.cos(routeAngle) * targetRadius;
    const targetY = Math.sin(routeAngle) * targetRadius;
    for (let i = 0; i < overflowCount; i += 1) {
      const enemy = type.enemies[(residentCount + i) % type.enemies.length];
      const level = enemy.level + Math.max(0, tier - 1) + 1;
      const sideAngle = routeAngle + Math.PI / 2;
      const spread = (i - (overflowCount - 1) / 2) * 1.5;
      const rawX = camp.x + Math.cos(sideAngle) * spread + Math.cos(routeAngle) * (2.5 + (i % 3) * 0.6);
      const rawY = camp.y + Math.sin(sideAngle) * spread + Math.sin(routeAngle) * (2.5 + (i % 3) * 0.6);
      const home = findOpenMobHome(rawX, rawY, camp.x, camp.y);
      mobs.push({
        id: `mob_camp_overflow_${camp.id}_${i + 1}`,
        name: `${enemy.name} Raider`,
        level,
        homeX: home.x,
        homeY: home.y,
        targetX: targetX,
        targetY: targetY,
        assaultTargetX: targetX,
        assaultTargetY: targetY,
        primary: type.primary,
        accent: type.accent,
        campId: camp.id,
        biome,
        faction: faction || null,
        isDragon: faction === "dragon",
        isAssaultWave: true,
        noRespawn: true,
        spawnedAt: Date.now(),
        maxHp: enemy.hp + level * 7 + Math.floor(hash2(camp.x, camp.y, 700 + i) * 14),
        attackDamage: enemy.damage + Math.floor(level * 1.15) + 2,
        roamRadius: 1,
        speed: enemy.speed + 0.25 + hash2(camp.x, camp.y, 800 + i) * 0.12
      });
    }

    if (camp.boss) {
      const bossHome = findOpenMobHome(camp.x, camp.y, camp.x, camp.y);
      const level = type.bossLevel + tier;
      const isDragonBoss = faction === "dragon";
      const isGolemBoss  = faction === "golem";
      const isDemonBoss  = faction === "demon";
      const megaBoss = camp.size >= 9 && tier >= 4;
      const hpBase = isDragonBoss ? 350 + level * 28 : isGolemBoss ? 500 + level * 35 : isDemonBoss ? 300 + level * 24 : 150 + level * 18;
      mobs.push({
        id: `mob_boss_${camp.id}`,
        name: megaBoss ? `${type.bossName} [COLOSSUS]` : type.bossName,
        level: megaBoss ? level + 4 : level,
        homeX: bossHome.x,
        homeY: bossHome.y,
        primary: type.bossPrimary,
        accent: type.bossAccent,
        campId: camp.id,
        biome,
        faction: faction || null,
        isDragon: isDragonBoss,
        isBoss: true,
        megaBoss,
        maxHp: megaBoss ? hpBase * 2.5 : hpBase,
        attackDamage: megaBoss ? (isDragonBoss ? 55 + level * 4 : isGolemBoss ? 70 + level * 4 : isDemonBoss ? 50 + level * 3 : 28 + level * 3) : (isDragonBoss ? 40 + level * 3 : 16 + level * 2),
        roamRadius: megaBoss ? 12 : isDragonBoss ? 9 : 7,
        speed: megaBoss ? 0.95 : isDragonBoss ? 1.15 : 1.25
      });
    }
  }

  for (const boss of WILDERNESS_BOSSES) {
    const type = MOB_TYPES[boss.biome] || MOB_TYPES.forest;
    const home = findOpenMobHome(boss.x, boss.y, boss.x, boss.y);
    mobs.push({
      id: `mob_boss_${boss.id}`,
      name: boss.name,
      level: (type.bossLevel || 8) + 3,
      homeX: home.x,
      homeY: home.y,
      primary: type.bossPrimary,
      accent: type.bossAccent,
      biome: boss.biome,
      isBoss: true,
      maxHp: 260,
      attackDamage: 34,
      roamRadius: 8,
      speed: 1.18
    });
  }

  return mobs;
}

function createRuntimeMob(def) {
  return {
    ...def,
    x: def.homeX,
    y: def.homeY,
    hp: def.maxHp || 60,
    maxHp: def.maxHp || 60,
    level: def.level || 1,
    attackDamage: "attackDamage" in def ? def.attackDamage : MOB_ATTACK_DAMAGE,
    dead: false,
    respawnAt: 0,
    lastAttackAt: 0,
    facing: Number.isFinite(def.facing) ? def.facing : Math.random() * Math.PI * 2,
    _targetX: Number.isFinite(def.targetX) ? def.targetX : def.homeX,
    _targetY: Number.isFinite(def.targetY) ? def.targetY : def.homeY,
    _nextMoveAt: Date.now() + Math.random() * 900,
    roamRadius: def.roamRadius || 5,
    speed: def.speed || 1.7
  };
}

function addRuntimeMob(def) {
  const mob = createRuntimeMob(def);
  mobs.push(mob);
  addMobToHomeBuckets(mobHomeBuckets, mob);
  if (mob.forceSimulate) {
    forceSimulateMobs.add(mob);
  }
  return mob;
}

const FANTASY_ASSAULT_SPAWNS = Object.freeze([
  { id: "north", x: 12, y: -178, targetX: 0, targetY: -105, faction: "sludge" },
  { id: "east", x: 178, y: 12, targetX: 105, targetY: 0, faction: "bandit" },
  { id: "south", x: -12, y: 178, targetX: 0, targetY: 105, faction: "undead" },
  { id: "west", x: -178, y: -12, targetX: -105, targetY: 0, faction: "sludge" }
]);

const SCI_FI_ASSAULT_SPAWNS = Object.freeze([
  { id: "north", x: SCI_FI_STATION_CENTER.x, y: SCI_FI_STATION_CENTER.y - 185, color: "#ff6b8a", faction: "assault_eclipse" },
  { id: "east", x: SCI_FI_STATION_CENTER.x + 185, y: SCI_FI_STATION_CENTER.y + 16, color: "#c084fc", faction: "assault_blackstar" },
  { id: "south", x: SCI_FI_STATION_CENTER.x - 16, y: SCI_FI_STATION_CENTER.y + 185, color: "#f97316", faction: "assault_redwake" },
  { id: "west", x: SCI_FI_STATION_CENTER.x - 185, y: SCI_FI_STATION_CENTER.y - 16, color: "#22d3ee", faction: "assault_nullwake" }
]);

function countActiveAssaultMobs(theme) {
  let count = 0;
  for (const mob of forceSimulateMobs) {
    if (mob.dead || !mob.isAssaultWave) continue;
    if (theme === "sci-fi") {
      count += mob.isShipPirate ? 1 : 0;
    } else {
      count += !mob.isShipPirate ? 1 : 0;
    }
  }
  return count;
}

function cleanupExpiredAssaultMobs(now) {
  for (const mob of Array.from(forceSimulateMobs)) {
    if (!mob?.isAssaultWave) continue;
    const expiredDead = mob.dead && now >= (mob.respawnAt || 0);
    const expiredLive = Number.isFinite(mob.spawnedAt) && now - mob.spawnedAt > 12 * 60 * 1000;
    const reachedTarget =
      !mob.dead &&
      Number.isFinite(mob.assaultTargetX) &&
      Number.isFinite(mob.assaultTargetY) &&
      Math.hypot(mob.x - mob.assaultTargetX, mob.y - mob.assaultTargetY) < 2.4;
    if (expiredDead || expiredLive || reachedTarget) {
      mob.dead = true;
      forceSimulateMobs.delete(mob);
    }
  }
}

function processAssaultWaves(now = Date.now()) {
  cleanupExpiredAssaultMobs(now);
  if (isNightTime()) {
    if (now >= nextFantasyAssaultAt && countActiveAssaultMobs("fantasy") < MAX_ACTIVE_FANTASY_ASSAULT_MOBS) {
      spawnFantasyAssaultWave(now, FANTASY_NIGHT_RAID_CAMPS_PER_WAVE);
      nextFantasyAssaultAt = now + FANTASY_ASSAULT_INTERVAL_MS + Math.floor(Math.random() * 5000);
    }
  } else {
    nextFantasyAssaultAt = Math.max(nextFantasyAssaultAt, now + 4000);
  }
  if (now >= nextSciFiAssaultAt && countActiveAssaultMobs("sci-fi") < MAX_ACTIVE_SCI_FI_ASSAULT_MOBS) {
    spawnSciFiAssaultWave(now);
    nextSciFiAssaultAt = now + SCI_FI_ASSAULT_INTERVAL_MS + Math.floor(Math.random() * 10000);
  }
}

function isNightTime() {
  return getWorldTimeSnapshot().phase === "night";
}

function spawnFantasyAssaultWave(now, campCount = 1) {
  const eligibleCamps = ENEMY_CAMPS.filter((camp) => Math.hypot(camp.x, camp.y) > PRIMARY_HUB_MOBS_CLEAR_RADIUS);
  const shuffled = eligibleCamps
    .map((camp) => ({ camp, roll: Math.random() }))
    .sort((a, b) => a.roll - b.roll)
    .map((entry) => entry.camp);
  const camps = shuffled.slice(0, Math.max(1, campCount));
  if (!camps.length) return;
  for (const camp of camps) {
    spawnFantasyCampAssault(now, camp);
    if (countActiveAssaultMobs("fantasy") >= MAX_ACTIVE_FANTASY_ASSAULT_MOBS) break;
  }
}

function spawnFantasyCampAssault(now, camp) {
  const biome = camp.biome || getBiome(camp.x, camp.y);
  const faction = camp.faction;
  const type = (faction && MOB_TYPES[faction]) ? MOB_TYPES[faction] : (MOB_TYPES[biome] || MOB_TYPES.forest);
  const routeAngle = Math.atan2(-camp.y, -camp.x);
  const targetRadius = 104;
  const targetX = Math.cos(routeAngle) * targetRadius;
  const targetY = Math.sin(routeAngle) * targetRadius;
  const tier = camp.tier || Math.max(1, Math.floor(Math.hypot(camp.x, camp.y) / 90));
  const count = Math.max(4, Math.min(12, Math.ceil((camp.size || 4) * 0.9) + Math.floor(Math.random() * 4)));
  for (let i = 0; i < count && countActiveAssaultMobs("fantasy") < MAX_ACTIVE_FANTASY_ASSAULT_MOBS; i += 1) {
    const enemy = type.enemies[i % type.enemies.length];
    const spread = (i - (count - 1) / 2) * 1.7;
    const sideAngle = routeAngle + Math.PI / 2;
    const homeX = camp.x + Math.cos(sideAngle) * spread + (Math.random() - 0.5) * 1.2;
    const homeY = camp.y + Math.sin(sideAngle) * spread + (Math.random() - 0.5) * 1.2;
    const level = Math.max(2, enemy.level + Math.max(0, tier - 1) + Math.floor(Math.random() * 2));
    addRuntimeMob({
      id: `mob_assault_fantasy_${nextAssaultMobId++}`,
      name: `${enemy.name} Raider`,
      level,
      homeX,
      homeY,
      targetX,
      targetY,
      assaultTargetX: targetX,
      assaultTargetY: targetY,
      primary: type.primary,
      accent: type.accent,
      faction: faction || biome,
      campId: `night_assault_${camp.id}`,
      isAssaultWave: true,
      noRespawn: true,
      forceSimulate: true,
      spawnedAt: now,
      maxHp: enemy.hp + level * 8,
      attackDamage: enemy.damage + Math.floor(level * 1.25),
      roamRadius: 1,
      speed: enemy.speed + 0.42
    });
  }
}

function spawnSciFiAssaultWave(now) {
  const route = SCI_FI_ASSAULT_SPAWNS[Math.floor(Math.random() * SCI_FI_ASSAULT_SPAWNS.length)];
  const count = 6 + Math.floor(Math.random() * 5);
  for (let i = 0; i < count && countActiveAssaultMobs("sci-fi") < MAX_ACTIVE_SCI_FI_ASSAULT_MOBS; i += 1) {
    const angle = (i / Math.max(1, count)) * Math.PI * 2;
    const homeX = route.x + Math.cos(angle) * (4 + i * 0.8);
    const homeY = route.y + Math.sin(angle) * (4 + i * 0.8);
    const level = 7 + Math.floor(Math.random() * 5);
    addRuntimeMob({
      id: `mob_assault_scifi_${nextAssaultMobId++}`,
      name: i === 0 ? "Raid Captain" : "Pirate Interceptor",
      level,
      homeX,
      homeY,
      targetX: SCI_FI_STATION_CENTER.x,
      targetY: SCI_FI_STATION_CENTER.y,
      assaultTargetX: SCI_FI_STATION_CENTER.x,
      assaultTargetY: SCI_FI_STATION_CENTER.y,
      primary: route.color,
      accent: "#080a14",
      faction: route.faction,
      isShipPirate: true,
      isAssaultWave: true,
      noRespawn: true,
      forceSimulate: true,
      spawnedAt: now,
      hullClass: i === 0 ? "interceptor" : "fighter",
      maxHp: 95 + level * 13,
      attackDamage: 7 + Math.floor(level * 0.9),
      roamRadius: 2,
      speed: 2.62 + Math.random() * 0.32
    });
  }
}

function createRoamingMobs() {
  const ROAM_CELL = 20;
  const list = [];
  let seq = 0;

  const gMin = Math.floor(-720 / ROAM_CELL);
  const gMax = Math.ceil(720 / ROAM_CELL);

  for (let gx = gMin; gx <= gMax; gx++) {
    for (let gy = gMin; gy <= gMax; gy++) {
      const roll = hash2(gx, gy, 9400);
      if (roll > 0.62) continue;

      const cx = gx * ROAM_CELL + ROAM_CELL * 0.5;
      const cy = gy * ROAM_CELL + ROAM_CELL * 0.5;

      // Exclude starter town + quieter margins around distant portal towns / portal courtyards
      if (Math.hypot(cx, cy) < PRIMARY_HUB_MOBS_CLEAR_RADIUS) continue;
      if (Math.hypot(cx - 600, cy - 490) < 106) continue;
      if (Math.hypot(cx + 600, cy + 490) < 106) continue;
      if (Math.hypot(cx - 580, cy + 530) < 106) continue;
      if (isTooCloseToAnyPortal(Math.round(cx), Math.round(cy))) continue;

      const biome  = getBiome(Math.round(cx), Math.round(cy));
      const type   = MOB_TYPES[biome] || MOB_TYPES.forest;
      const dist   = Math.hypot(cx, cy);
      const tier   = Math.min(6, Math.max(1, Math.floor(dist / 100)));
      const baseCount = (tier >= 3 && hash2(gx, gy, 9450) > 0.46) ? 2 : 1;
      const count = baseCount * ENEMY_DENSITY_MULTIPLIER;

      for (let i = 0; i < count; i++) {
        const ox = (hash2(gx, gy, 9500 + i) - 0.5) * (ROAM_CELL - 5);
        const oy = (hash2(gx, gy, 9600 + i) - 0.5) * (ROAM_CELL - 5);
        const hx = Math.round(cx + ox);
        const hy = Math.round(cy + oy);
        if (isTooCloseToAnyPortal(hx, hy)) continue;

        const eIdx  = Math.floor(hash2(gx, gy, 9700 + i) * type.enemies.length);
        const enemy = type.enemies[eIdx];
        const level = enemy.level + Math.max(0, tier - 1);
        const home = i < baseCount
          ? findOpenMobHomeFromCandidates(hx, hy)
          : { x: Number(hx.toFixed(3)), y: Number(hy.toFixed(3)) };

        seq++;
        list.push({
          id: `mob_roam_${seq}`,
          name: enemy.name,
          level,
          homeX: home.x,
          homeY: home.y,
          primary: type.primary,
          accent: type.accent,
          biome,
          maxHp: enemy.hp + level * 5 + Math.floor(hash2(gx, gy, 9800 + i) * 10),
          attackDamage: enemy.damage + Math.floor(level * 0.8),
          roamRadius: 9,
          speed: enemy.speed + hash2(gx, gy, 9900 + i) * 0.15
        });
      }
    }
  }

  return list;
}

function createCritterMobs() {
  const list = [];

  let critterSeq = 0;
  const gxMin = Math.floor(-720 / CRITTER_CELL);
  const gxMax = Math.ceil(720 / CRITTER_CELL);
  const gyMin = gxMin;
  const gyMax = gxMax;

  for (let gx = gxMin; gx <= gxMax; gx += 1) {
    for (let gy = gyMin; gy <= gyMax; gy += 1) {
      const cellPick = hash2(gx, gy, 7711);
      if (cellPick > 0.28) continue;

      const n = cellPick > 0.12 ? 2 : 1;
      const baseX = gx * CRITTER_CELL + CRITTER_CELL * 0.5;
      const baseY = gy * CRITTER_CELL + CRITTER_CELL * 0.5;

      if (Math.hypot(baseX - 0, baseY - 4) < PRIMARY_HUB_MOBS_CLEAR_RADIUS) continue;
      if (Math.hypot(baseX - 600, baseY - 490) < 82) continue;
      if (Math.hypot(baseX + 600, baseY + 490) < 82) continue;
      if (Math.hypot(baseX - 580, baseY + 530) < 82) continue;
      if (isTooCloseToAnyPortal(Math.round(baseX), Math.round(baseY))) continue;

      for (let i = 0; i < n; i += 1) {
        const ox = (hash2(gx, gy, 8801 + i) - 0.5) * (CRITTER_CELL - 7);
        const oy = (hash2(gx, gy, 8901 + i) - 0.5) * (CRITTER_CELL - 7);
        const bx = Math.round(baseX + ox);
        const by = Math.round(baseY + oy);
        if (isTooCloseToAnyPortal(bx, by)) continue;
        const biome = getBiome(bx, by);
        const pool = CRITTERS_BY_BIOME[biome] || CRITTERS_BY_BIOME.forest;
        const tmpl = pool[Math.floor(hash2(gx, gy + i * 97, 9001) * pool.length) % pool.length];
        const home = findOpenMobHomeFromCandidates(bx, by);

        critterSeq += 1;
        const critterXp = 2 + Math.floor(hash2(gx, gy + i * 13, 9017) * 3);

        list.push({
          id: `mob_critter_${critterSeq}`,
          name: tmpl.name,
          level: 1,
          biome,
          isCritter: true,
          critterXp,
          attackDamage: 0,
          homeX: home.x,
          homeY: home.y,
          primary: tmpl.primary,
          accent: tmpl.accent,
          maxHp: tmpl.maxHp,
          roamRadius: 5.2 + hash2(gx, gy, 9031 + i) * 2,
          speed: tmpl.speed
        });
      }
    }
  }

  return list;
}

function createPlanetSurfaceMobs() {
  const list = [];
  for (const [planetIndex, planet] of SCI_FI_PLANETS.entries()) {
    const type = MOB_TYPES[planet.type] || MOB_TYPES.lush;
    const critterPool = CRITTERS_BY_BIOME[planet.type] || CRITTERS_BY_BIOME.lush;
    const ringRadius = Math.max(24, Math.min(planet.surfaceRadius - 36, 94));
    const enemyCount = 10 + (planetIndex % 4) * 2;
    const critterCount = 6 + (planetIndex % 3);

    for (let i = 0; i < enemyCount; i += 1) {
      const enemy = type.enemies[i % type.enemies.length];
      const angle = hash2(planet.seed, i, 55100) * Math.PI * 2;
      const radius = 18 + hash2(planet.seed, i, 55101) * ringRadius;
      const rawX = planet.surfaceX + Math.cos(angle) * radius;
      const rawY = planet.surfaceY + Math.sin(angle) * radius;
      const home = findOpenMobHomeFromCandidates(Math.round(rawX), Math.round(rawY));
      const level = enemy.level + Math.floor(planetIndex / 3);
      list.push({
        id: `mob_planet_${planet.id}_${i}`,
        name: enemy.name,
        level,
        homeX: home.x,
        homeY: home.y,
        primary: type.primary,
        accent: type.accent,
        biome: planet.type,
        faction: `planet_${planet.type}`,
        maxHp: enemy.hp + level * 6 + Math.floor(hash2(planet.seed, i, 55102) * 18),
        attackDamage: enemy.damage + Math.floor(level * 0.95),
        roamRadius: 10 + hash2(planet.seed, i, 55103) * 7,
        speed: enemy.speed + hash2(planet.seed, i, 55104) * 0.18
      });
    }

    for (let i = 0; i < critterCount; i += 1) {
      const critter = critterPool[i % critterPool.length];
      const angle = hash2(planet.seed, i, 55200) * Math.PI * 2;
      const radius = 8 + hash2(planet.seed, i, 55201) * (ringRadius * 0.82);
      const rawX = planet.surfaceX + Math.cos(angle) * radius;
      const rawY = planet.surfaceY + Math.sin(angle) * radius;
      const home = findOpenMobHomeFromCandidates(Math.round(rawX), Math.round(rawY));
      list.push({
        id: `mob_planet_critter_${planet.id}_${i}`,
        name: critter.name,
        level: 1,
        biome: planet.type,
        isCritter: true,
        critterXp: 3 + (planetIndex % 3),
        attackDamage: 0,
        homeX: home.x,
        homeY: home.y,
        primary: critter.primary,
        accent: critter.accent,
        maxHp: critter.maxHp,
        roamRadius: 5 + hash2(planet.seed, i, 55202) * 4,
        speed: critter.speed
      });
    }

    const bossType = type;
    const bossAngle = hash2(planet.seed, planetIndex, 55300) * Math.PI * 2;
    const bossRadius = Math.min(planet.surfaceRadius - 44, 120);
    const bossX = planet.surfaceX + Math.cos(bossAngle) * bossRadius;
    const bossY = planet.surfaceY + Math.sin(bossAngle) * bossRadius;
    const bossHome = findOpenMobHomeFromCandidates(Math.round(bossX), Math.round(bossY));
    const bossLevel = (bossType.bossLevel || 14) + Math.floor(planetIndex / 2);
    list.push({
      id: `mob_planet_boss_${planet.id}`,
      name: bossType.bossName,
      level: bossLevel,
      homeX: bossHome.x,
      homeY: bossHome.y,
      primary: bossType.bossPrimary,
      accent: bossType.bossAccent,
      biome: planet.type,
      faction: `planet_boss_${planet.type}`,
      isBoss: true,
      maxHp: 220 + bossLevel * 22,
      attackDamage: 22 + bossLevel * 2,
      roamRadius: 14,
      speed: 1.18 + hash2(planet.seed, planetIndex, 55301) * 0.12
    });
  }
  return list;
}

// Lighter footprint than findOpenMobHome — used when spawning many passive critters per cell.
function findOpenMobHomeFromCandidates(px, py) {
  const base = [[px, py], [px + 1.2, py], [px - 1.2, py], [px, py + 1.2], [px, py - 1.2]];
  const extra = [];
  for (let s = 1; s <= 4; s += 1) {
    extra.push(
      [px + s * 0.95, py],
      [px - s * 0.95, py],
      [px, py + s * 0.95],
      [px, py - s * 0.95]
    );
  }

  const candidates = [...base, ...extra];

  for (const [cx, cy] of candidates) {
    if (!isBlockedCircle(cx, cy, 0.32) && canAttackAt(cx, cy)) {
      return { x: Number(cx.toFixed(3)), y: Number(cy.toFixed(3)) };
    }
  }

  return { x: px, y: py };
}

function findOpenMobHome(x, y, fallbackX, fallbackY) {
  const candidates = [
    [x, y],
    [x + 1.5, y],
    [x - 1.5, y],
    [x, y + 1.5],
    [x, y - 1.5],
    [fallbackX + 2, fallbackY + 2],
    [fallbackX - 2, fallbackY + 2],
    [fallbackX + 2, fallbackY - 2],
    [fallbackX - 2, fallbackY - 2],
  ];

  for (const [cx, cy] of candidates) {
    if (!isBlockedCircle(cx, cy, 0.35) && canAttackAt(cx, cy)) {
      return { x: Number(cx.toFixed(3)), y: Number(cy.toFixed(3)) };
    }
  }

  return { x: fallbackX, y: fallbackY };
}

// ── Caravan system ─────────────────────────────────────────────────────────
// Wagons that ferry players between hub towns. Pay the fare and you ride on
// the back; the caravan moves itself, dragging you to the destination.

// Caravan defs + state live entirely inside getCaravans() so nothing here is
// in a temporal dead zone when the simulate loop kicks off at module load.
// (simulate() is invoked synchronously near the top of this file, well before
// any const/let declared after it has been evaluated.)
function getCaravans() {
  if (getCaravans._cache) return getCaravans._cache;
  const defs = [
    {
      id: "caravan_oasis",
      name: "Oasis Caravan",
      fromName: "Hub",
      toName: "Oasis Keep",
      fare: 25,
      speed: 2.6,
      color: "#d4a55b",
      route: [{ x: 0, y: -30 }, { x: 240, y: 220 }, { x: 560, y: 480 }]
    },
    {
      id: "caravan_frost",
      name: "Frost Caravan",
      fromName: "Hub",
      toName: "Frost Keep",
      fare: 25,
      speed: 2.6,
      color: "#9ee7ff",
      route: [{ x: 0, y: -30 }, { x: -240, y: -200 }, { x: -560, y: -420 }]
    },
    {
      id: "caravan_ember",
      name: "Ember Caravan",
      fromName: "Hub",
      toName: "Ember Citadel",
      fare: 30,
      speed: 2.6,
      color: "#ff8f4a",
      route: [{ x: 0, y: -30 }, { x: 240, y: -220 }, { x: 540, y: -470 }]
    }
  ];
  getCaravans._cache = defs.map((def) => ({
    ...def,
    x: def.route[0].x,
    y: def.route[0].y,
    facing: 0,
    targetIndex: 1,
    paused: true,
    pauseUntil: Date.now() + 3000,
    passengers: new Set()
  }));
  return getCaravans._cache;
}

function getCaravanById(id) {
  return getCaravans().find((c) => c.id === id) || null;
}

function caravanIsAtEndpoint(caravan) {
  return caravan.targetIndex === 0 || caravan.targetIndex === caravan.route.length - 1;
}

function disembarkAllCaravanPassengers(caravan, opts = {}) {
  if (!caravan.passengers.size) return;
  for (const pid of caravan.passengers) {
    const player = getPlayerById(pid);
    if (!player) continue;
    player._caravanRiding = null;
    // Step off to the side so two passengers don't stack.
    player.x = caravan.x + 1.4;
    player.y = caravan.y + 0.8;
    player.moving = false;
    const client = findClientByPlayerIdInternal(pid);
    if (client) {
      send(client, {
        type: "serverMessage",
        message: opts.arrived ? "caravan_arrived" : "caravan_disembarked",
        caravanName: caravan.name,
        destination: opts.destinationName
      });
      saveClientCharacter(client);
    }
  }
  caravan.passengers.clear();
}

function findClientByPlayerIdInternal(playerId) {
  for (const c of clients.values()) {
    if (c.player?.id === playerId) return c;
  }
  return null;
}

function updateCaravans(dt) {
  const now = Date.now();
  for (const caravan of getCaravans()) {
    if (caravan.paused) {
      if (now >= caravan.pauseUntil) {
        caravan.paused = false;
      } else {
        continue;
      }
    }
    const target = caravan.route[caravan.targetIndex];
    if (!target) continue;
    const dx = target.x - caravan.x;
    const dy = target.y - caravan.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.4) {
      caravan.x = target.x;
      caravan.y = target.y;
      // If we just rolled into an endpoint, drop off everyone and rest.
      if (caravanIsAtEndpoint(caravan)) {
        const destinationName = caravan.targetIndex === 0 ? caravan.fromName : caravan.toName;
        disembarkAllCaravanPassengers(caravan, { arrived: true, destinationName });
        caravan.paused = true;
        caravan.pauseUntil = now + 9000;
      }
      caravan.targetIndex = caravan.targetIndex === caravan.route.length - 1
        ? caravan.route.length - 2
        : caravan.targetIndex === 0 ? 1 : caravan.targetIndex + 1;
      continue;
    }
    const step = caravan.speed * dt;
    const mx = (dx / dist) * step;
    const my = (dy / dist) * step;
    caravan.x += mx;
    caravan.y += my;
    caravan.facing = Math.atan2(dy, dx);
    for (const pid of caravan.passengers) {
      const passenger = getPlayerById(pid);
      if (!passenger) continue;
      const passengerClient = findClientByPlayerIdInternal(pid);
      if (passengerClient && minigames) {
        minigames.onCaravanPassengerTick(passengerClient, caravan);
      }
      passenger.x += mx;
      passenger.y += my;
      passenger.facing = caravan.facing;
      passenger.moving = true;
    }
  }
}

function handleCaravanRide(client, message = {}) {
  const player = client.player;
  if (!player) return;
  const caravan = getCaravanById(typeof message.caravanId === "string" ? message.caravanId : "");
  if (!caravan) {
    send(client, { type: "serverMessage", message: "caravan_unknown" });
    return;
  }
  if (caravan.passengers.has(player.id)) return;
  if (worldForPosition(player.x, player.y) !== "fantasy") {
    send(client, { type: "serverMessage", message: "caravan_unknown" });
    return;
  }
  const dist = Math.hypot(caravan.x - player.x, caravan.y - player.y);
  if (dist > 4) {
    send(client, { type: "serverMessage", message: "caravan_too_far" });
    return;
  }
  const fare = Math.max(0, Number(caravan.fare) || 0);
  if (!player.isMod && (player.gold || 0) < fare) {
    send(client, { type: "serverMessage", message: "caravan_too_poor", fare });
    return;
  }
  if (!player.isMod && fare > 0) {
    player.gold = Math.max(0, (player.gold || 0) - fare);
  }
  caravan.passengers.add(player.id);
  player._caravanRiding = caravan.id;
  player.x = caravan.x;
  player.y = caravan.y + 0.6;
  player.facing = caravan.facing;
  player.moving = false;
  saveClientCharacter(client);
  send(client, {
    type: "serverMessage",
    message: "caravan_boarded",
    caravanName: caravan.name,
    fare,
    destination: caravan.targetIndex === 0 ? caravan.fromName : caravan.toName
  });
  broadcastSnapshot();
}

function handleCaravanDisembark(client) {
  const player = client.player;
  if (!player?._caravanRiding) return;
  const caravan = getCaravanById(player._caravanRiding);
  if (caravan) {
    caravan.passengers.delete(player.id);
    player.x = caravan.x + 1.4;
    player.y = caravan.y + 0.8;
    send(client, { type: "serverMessage", message: "caravan_disembarked", caravanName: caravan.name });
  }
  player._caravanRiding = null;
  saveClientCharacter(client);
  broadcastSnapshot();
}

function getCaravansSnapshotForViewer(view) {
  const out = [];
  for (const caravan of getCaravans()) {
    if (Math.abs(caravan.x - view.x) > view.halfW + 12) continue;
    if (Math.abs(caravan.y - view.y) > view.halfH + 12) continue;
    out.push({
      id: caravan.id,
      name: caravan.name,
      color: caravan.color || "#d4a55b",
      fare: caravan.fare,
      fromName: caravan.fromName,
      toName: caravan.toName,
      destinationName: caravan.targetIndex === 0 ? caravan.fromName : caravan.toName,
      x: Number(caravan.x.toFixed(3)),
      y: Number(caravan.y.toFixed(3)),
      facing: Number((caravan.facing || 0).toFixed(3)),
      moving: !caravan.paused,
      passengers: caravan.passengers.size
    });
  }
  return out;
}

function addPlayerTargetBucket(index, row) {
  const cx = Math.floor(row.player.x / index.cellSize);
  const cy = Math.floor(row.player.y / index.cellSize);
  const key = `${row.world}|${cx},${cy}`;
  let bucket = index.buckets.get(key);
  if (!bucket) {
    bucket = [];
    index.buckets.set(key, bucket);
  }
  bucket.push(row);
}

function buildAttackablePlayerTargetIndex() {
  const index = {
    cellSize: PLAYER_TARGET_BUCKET_SIZE,
    buckets: new Map(),
    byWorld: new Map()
  };

  for (const client of clients.values()) {
    const player = client.player;
    if (!player || player.hp <= 0 || !canAttackAt(player.x, player.y)) {
      continue;
    }
    const world = worldForPosition(player.x, player.y);
    const row = { player, world };
    let worldRows = index.byWorld.get(world);
    if (!worldRows) {
      worldRows = [];
      index.byWorld.set(world, worldRows);
    }
    worldRows.push(row);
    addPlayerTargetBucket(index, row);
  }

  return index;
}

function forEachPlayerTargetNear(index, world, x, y, radius, visitor) {
  const cellSize = index.cellSize;
  const minCx = Math.floor((x - radius) / cellSize);
  const maxCx = Math.floor((x + radius) / cellSize);
  const minCy = Math.floor((y - radius) / cellSize);
  const maxCy = Math.floor((y + radius) / cellSize);
  for (let cx = minCx; cx <= maxCx; cx += 1) {
    for (let cy = minCy; cy <= maxCy; cy += 1) {
      const bucket = index.buckets.get(`${world}|${cx},${cy}`);
      if (!bucket) continue;
      for (const row of bucket) {
        visitor(row.player);
      }
    }
  }
}

function updateMobs(dt, boundsArray) {
  const now = Date.now();
  const playerTargets = buildAttackablePlayerTargetIndex();

  forEachMobCandidate(boundsArray, (mob) => {
    if (mob.dead) {
      if (mob.noRespawn) {
        return;
      }
      if (now >= mob.respawnAt) {
        mob.dead = false;
        mob.hp = mob.maxHp;
        if ((Number(mob.maxShieldHp) || 0) > 0) {
          mob.shieldHp = mob.maxShieldHp;
        }
        mob.x = mob.homeX;
        mob.y = mob.homeY;
      }
      return;
    }

    if (!mob.forceSimulate && !mobShouldSimulateAny(mob, boundsArray)) {
      return;
    }

    const targetPlayer = nearestAttackablePlayer(mob, playerTargets, now);
    if (mob.isShipPirate && (Number(mob.maxShieldHp) || 0) > 0 && mob.shieldHp < mob.maxShieldHp) {
      if (now - (mob.lastShieldHitAt || 0) > CAPITAL_SHIP_SHIELD_REGEN_MS) {
        mob.shieldHp = Math.min(mob.maxShieldHp, (Number(mob.shieldHp) || 0) + CAPITAL_SHIP_SHIELD_REGEN_AMOUNT * dt * 20);
      }
    }
    if (targetPlayer) {
      mob._targetX = targetPlayer.x;
      mob._targetY = targetPlayer.y;
      const angleToPlayer = Math.atan2(targetPlayer.y - mob.y, targetPlayer.x - mob.x);
      mob.facing = angleToPlayer;
      const distToPlayer = distance(mob, targetPlayer);
      if (mob.isShipPirate) {
        // Pirates fire laser bolts from beyond melee range, but still drift toward the target.
        if (distToPlayer <= PIRATE_ATTACK_RANGE) {
          fireShipPirateLaser(mob, targetPlayer, now);
        }
        // Don't `continue` — let movement code below close the gap toward the player.
      } else if (distToPlayer <= MOB_ATTACK_RADIUS) {
        attackPlayerWithMob(mob, targetPlayer, now);
        return;
      }
    } else if (mob.isShipPirate) {
      const npcTarget = nearestHostileNpcShip(mob);
      if (npcTarget) {
        const dxh = npcTarget.x - mob.x;
        const dyh = npcTarget.y - mob.y;
        const distToShip = Math.hypot(dxh, dyh);
        mob.facing = Math.atan2(dyh, dxh);
        if (distToShip <= NPC_SHIP_BATTLE_RANGE) {
          fireNpcShipLaser(mob, npcTarget, now);
        }
        const standOff = mob.isCapitalShip ? 11 : 8;
        const pull = distToShip > standOff ? 0.65 : -0.35;
        const len = distToShip || 1;
        mob._targetX = mob.x + (dxh / len) * standOff * pull;
        mob._targetY = mob.y + (dyh / len) * standOff * pull;
      }
    } else if (
      mob.isAssaultWave &&
      Number.isFinite(mob.assaultTargetX) &&
      Number.isFinite(mob.assaultTargetY)
    ) {
      mob._targetX = mob.assaultTargetX;
      mob._targetY = mob.assaultTargetY;
    }

    const dx = mob._targetX - mob.x;
    const dy = mob._targetY - mob.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.08) {
      if (now >= mob._nextMoveAt) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * mob.roamRadius;
        mob._targetX = mob.homeX + Math.cos(angle) * radius;
        mob._targetY = mob.homeY + Math.sin(angle) * radius;
        mob._nextMoveAt = now + 1500 + Math.random() * 3500;
      }
      return;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    const step = mob.speed * dt;
    const nextX = mob.x + nx * step;
    const nextY = mob.y + ny * step;

    if (!isBlockedCircle(nextX, mob.y)) {
      mob.x = nextX;
    }
    if (!isBlockedCircle(mob.x, nextY)) {
      mob.y = nextY;
    }
    mob.facing = Math.atan2(ny, nx);
  });
}

function processSciFiEncounters(now = Date.now()) {
  for (const client of clients.values()) {
    const player = client.player;
    if (!player || player.hp <= 0 || worldForPosition(player.x, player.y) !== "scifi") {
      continue;
    }
    if (!client.sciFiEncounterSeen) {
      client.sciFiEncounterSeen = new Set();
    }
    for (const encounter of SCI_FI_ENCOUNTER_EVENTS) {
      if (client.sciFiEncounterSeen.has(encounter.id)) continue;
      const radius = Number(encounter.radius) || 24;
      const dx = player.x - encounter.x;
      const dy = player.y - encounter.y;
      if (dx * dx + dy * dy > radius * radius) continue;
      client.sciFiEncounterSeen.add(encounter.id);
      send(client, {
        type: "spaceEvent",
        id: encounter.id,
        kind: encounter.kind,
        title: encounter.title,
        message: encounter.message,
        x: encounter.x,
        y: encounter.y,
        at: now
      });
    }
  }
}

function processGatekeeperArchers(now = Date.now()) {
  for (const guardId of TOWN_ARCHER_IDS) {
    const guard = getNpcById(guardId);
    if (!guard) continue;
    guard.x = guard.homeX;
    guard.y = guard.homeY;
    guard._targetX = guard.homeX;
    guard._targetY = guard.homeY;
    guard.moving = false;
    const ammoMax = Math.max(0, Number(guard.ammoMax) || 0);
    if (ammoMax <= 0) {
      continue;
    }
    if (guard.ammo <= 0) {
      continue;
    }
    if (now - (guard._lastGateShotAt || 0) < GATEKEEPER_ATTACK_COOLDOWN_MS) {
      continue;
    }

    let target = null;
    let bestDist = Infinity;
    forEachMobNear(guard.x, guard.y, GATEKEEPER_RANGE + 6, (mob) => {
      if (mob.dead || mob.isCritter) return;
      const townDist = Math.hypot(mob.x, mob.y);
      if (townDist > GATEKEEPER_NEAR_TOWN_RADIUS) return;
      const d = Math.hypot(mob.x - guard.x, mob.y - guard.y);
      if (d <= GATEKEEPER_RANGE && d < bestDist) {
        bestDist = d;
        target = mob;
      }
    });
    if (!target) continue;

    const damage = Math.max(1, Math.round(GATEKEEPER_ARROW_DAMAGE + (Number(target.level) || 1) * 1.5));
    guard._lastGateShotAt = now;
    guard.facing = Math.atan2(target.y - guard.y, target.x - guard.x);
    guard.ammo = Math.max(0, (Number(guard.ammo) || 0) - 1);
    target.hp = Math.max(0, target.hp - damage);

    const event = {
      type: "combat",
      kind: "projectile",
      weapon: "gatekeeper_bow",
      projectileKind: "arrow",
      attackerId: guard.id,
      x: Number(guard.x.toFixed(3)),
      y: Number(guard.y.toFixed(3)),
      facing: Number(guard.facing.toFixed(3)),
      range: GATEKEEPER_RANGE,
      hit: true,
      targetId: target.id,
      targetKind: "mob",
      damage,
      targetHp: target.hp,
      endX: Number(target.x.toFixed(3)),
      endY: Number(target.y.toFixed(3))
    };

    if (target.hp <= 0 && !target.dead) {
      target.dead = true;
      target.respawnAt = now + (target.noRespawn ? 9000 : target.isCritter ? 4200 : MOB_RESPAWN_MS);
      event.defeated = true;
    }

    broadcastCombat(event);
  }
}

function processTownArrowSupply(now = Date.now(), dt = 0.05) {
  const archers = TOWN_ARCHER_IDS.map((id) => getNpcById(id)).filter((npc) => npc && typeof npc.ammo === "number");
  const archerNeeds = archers
    .map((npc) => ({
      npc,
      threshold: Math.max(1, Number(npc.ammoLowWatermark) || TOWN_ARCHER_AMMO_LOW_WATERMARK),
      need: Math.max(0, (Number(npc.ammoMax) || 24) - (Number(npc.ammo) || 0))
    }))
    .filter((row) => row.need > 0 && (Number(row.npc.ammo) || 0) < row.threshold)
    .sort((a, b) => b.need - a.need || (Number(a.npc.ammo) || 0) - (Number(b.npc.ammo) || 0));

  const courierRows = TOWN_COURIER_IDS.map((id) => getNpcById(id)).filter(Boolean);

  // ── Assign delivery targets ───────────────────────────────────────────────
  const assigned = new Set();
  for (const courier of courierRows) {
    if (!Number.isFinite(courier.carryMax)) courier.carryMax = FLETCHER_COURIER_CARRY_MAX;
    if (!courier._deliveryTargetId || assigned.has(courier._deliveryTargetId)) {
      courier._deliveryTargetId = null;
    }
    const currentTarget = courier._deliveryTargetId
      ? archers.find((npc) => npc.id === courier._deliveryTargetId && (Number(npc.ammoMax) || 24) > (Number(npc.ammo) || 0))
      : null;
    if (currentTarget) { assigned.add(currentTarget.id); continue; }
    const nextTarget = archerNeeds.find((row) => !assigned.has(row.npc.id))?.npc || null;
    if (nextTarget) { courier._deliveryTargetId = nextTarget.id; assigned.add(nextTarget.id); }
  }

  // ── Build queue slots per fletcher ───────────────────────────────────────
  // Couriers heading back to reload (carryAmount==0, have a delivery target) queue
  // up in a line extending from their assigned fletcher toward the town centre so
  // they don't all pile onto the same tile.
  const fletcherQueueMap = new Map(); // fletcherId → [{courier, dist}]
  for (const courier of courierRows) {
    if ((Number(courier.carryAmount) || 0) > 0) continue; // already loaded, heading to archer
    if (!courier._deliveryTargetId) continue;             // no work, idling
    const fid = courier.assignedFletcherId || FLETCHER_IDS[0];
    if (!fletcherQueueMap.has(fid)) fletcherQueueMap.set(fid, []);
    const home = getNpcById(fid);
    const hx = Number(home?.x ?? home?.homeX);
    const hy = Number(home?.y ?? home?.homeY);
    fletcherQueueMap.get(fid).push({ courier, dist: Math.hypot(courier.x - hx, courier.y - hy) });
  }
  // Sort each fletcher's waiters closest-first and assign _queueSlot
  for (const [, waiters] of fletcherQueueMap) {
    waiters.sort((a, b) => a.dist - b.dist);
    for (let qi = 0; qi < waiters.length; qi++) waiters[qi].courier._queueSlot = qi;
  }

  // ── Move couriers and handle pickup/delivery ──────────────────────────────
  for (const courier of courierRows) {
    const fid = courier.assignedFletcherId || FLETCHER_IDS[0];
    const home = getNpcById(fid);
    const fletcherX = Number(home?.x ?? home?.homeX);
    const fletcherY = Number(home?.y ?? home?.homeY);
    const target = courier._deliveryTargetId ? getNpcById(courier._deliveryTargetId) : null;
    const targetX = Number.isFinite(target?.supplyX) ? Number(target.supplyX) : Number(target?.homeX);
    const targetY = Number.isFinite(target?.supplyY) ? Number(target.supplyY) : Number(target?.homeY);
    const carryAmount = Math.max(0, Number(courier.carryAmount) || 0);
    const carryMax = Math.max(0, Number(courier.carryMax) || FLETCHER_COURIER_CARRY_MAX);
    const stock = home ? Math.max(0, Number(home.arrowStock) || 0) : 0;

    if (!target || !Number.isFinite(targetX) || !Number.isFinite(targetY)) {
      courier._deliveryTargetId = null;
      courier.carryAmount = 0;
      courier._queueSlot = null;
      courier._targetX = Number.isFinite(fletcherX) ? fletcherX : courier.homeX;
      courier._targetY = Number.isFinite(fletcherY) ? fletcherY : courier.homeY;
      continue;
    }

    if (carryAmount <= 0) {
      // Queue position: slot 0 = pickup point, slots 1+ extend toward town centre
      const slot = courier._queueSlot ?? 0;
      const qDist = Math.hypot(fletcherX, fletcherY);
      const qDirX = qDist > 0.1 ? -fletcherX / qDist : 0;
      const qDirY = qDist > 0.1 ? -fletcherY / qDist : 1;
      const qx = fletcherX + qDirX * slot * FLETCHER_QUEUE_SPACING;
      const qy = fletcherY + qDirY * slot * FLETCHER_QUEUE_SPACING;
      courier._targetX = qx;
      courier._targetY = qy;

      // Only the front-of-queue courier (slot 0) can load up
      if (slot === 0 && home && Math.hypot(courier.x - fletcherX, courier.y - fletcherY) <= 1.5 && stock > 0) {
        const targetNeed = Math.max(0, (Number(target.ammoMax) || 24) - (Number(target.ammo) || 0));
        const load = Math.min(carryMax, stock, targetNeed > 0 ? targetNeed : carryMax);
        if (load > 0) {
          courier.carryAmount = load;
          home.arrowStock = Math.max(0, stock - load);
          courier._queueSlot = null;
          courier._targetX = targetX;
          courier._targetY = targetY;
        }
      }
      continue;
    }

    courier._targetX = targetX;
    courier._targetY = targetY;
    if (Math.hypot(courier.x - targetX, courier.y - targetY) <= 1.45) {
      const targetNeed = Math.max(0, (Number(target.ammoMax) || 24) - (Number(target.ammo) || 0));
      const transfer = Math.min(carryAmount, targetNeed);
      if (transfer > 0) {
        target.ammo = Math.min(Number(target.ammoMax) || 24, (Number(target.ammo) || 0) + transfer);
        courier.carryAmount = carryAmount - transfer;
      }
      courier._deliveryTargetId = (Number(target.ammo) || 0) < (Number(target.ammoMax) || 24) ? target.id : null;
      if (courier.carryAmount <= 0) {
        courier._targetX = Number.isFinite(fletcherX) ? fletcherX : courier.homeX;
        courier._targetY = Number.isFinite(fletcherY) ? fletcherY : courier.homeY;
      }
    }
  }

  // Stuck detection: if a courier has a distant target but barely moved in 5s, teleport clear.
  const COURIER_STUCK_MS = 5000;
  const COURIER_STUCK_MIN_DIST = 0.3;
  for (const courier of courierRows) {
    const cx = courier.x;
    const cy = courier.y;
    const tx = Number(courier._targetX);
    const ty = Number(courier._targetY);
    // Only check couriers that are supposed to be travelling somewhere
    if (!Number.isFinite(tx) || Math.hypot(cx - tx, cy - ty) < 1.5) {
      courier._stuckCheckX = cx;
      courier._stuckCheckY = cy;
      courier._stuckCheckAt = now;
      continue;
    }
    if (!Number.isFinite(courier._stuckCheckAt)) {
      courier._stuckCheckX = cx;
      courier._stuckCheckY = cy;
      courier._stuckCheckAt = now;
      continue;
    }
    if (now - courier._stuckCheckAt < COURIER_STUCK_MS) continue;
    const moved = Math.hypot(cx - courier._stuckCheckX, cy - courier._stuckCheckY);
    courier._stuckCheckX = cx;
    courier._stuckCheckY = cy;
    courier._stuckCheckAt = now;
    if (moved < COURIER_STUCK_MIN_DIST) {
      const angle = Math.random() * Math.PI * 2;
      const nudge = 2.5 + Math.random() * 2;
      courier.x = cx + Math.cos(angle) * nudge;
      courier.y = cy + Math.sin(angle) * nudge;
    }
  }
}

function processStationDefenses(now = Date.now()) {
  for (const defense of SCI_FI_DEFENSES) {
    const cooldown = STATION_DEFENSE_ATTACK_COOLDOWN_MS * (defense.kind === "orbital-cannon" ? 2.4 : 1);
    if (now - (stationDefenseLastShotAt.get(defense.id) || 0) < cooldown) {
      continue;
    }
    const range = Number(defense.range) || (defense.kind === "orbital-cannon" ? 138 : 96);
    let target = null;
    let bestDist = Infinity;
    let targetKind = "mob";
    forEachMobNear(defense.x, defense.y, range + 8, (mob) => {
      if (mob.dead || !mob.isShipPirate) return;
      const stationDist = Math.hypot(mob.x - SCI_FI_STATION_CENTER.x, mob.y - SCI_FI_STATION_CENTER.y);
      if (stationDist > SCI_FI_SAFE_RADIUS + 130) return;
      const d = Math.hypot(mob.x - defense.x, mob.y - defense.y);
      if (d <= range && d < bestDist) {
        bestDist = d;
        target = mob;
      }
    });
    forEachAsteroidRockNear(defense.x, defense.y, range + 8, (rock) => {
      const stationDist = Math.hypot(rock.x - SCI_FI_STATION_CENTER.x, rock.y - SCI_FI_STATION_CENTER.y);
      if (stationDist > SCI_FI_SAFE_RADIUS + 120) return;
      const d = Math.hypot(rock.x - defense.x, rock.y - defense.y);
      if (d <= range && d < bestDist) {
        bestDist = d;
        target = rock;
        targetKind = "asteroid";
      }
    });
    if (!target) continue;

    stationDefenseLastShotAt.set(defense.id, now);
    const isCannon = defense.kind === "orbital-cannon";
    const damage = targetKind === "asteroid"
      ? Math.max(18, Math.round((isCannon ? ORBITAL_CANNON_DAMAGE : STATION_TURRET_DAMAGE) * 0.95))
      : Math.max(1, Math.round((isCannon ? ORBITAL_CANNON_DAMAGE : STATION_TURRET_DAMAGE) + (Number(target.level) || 1) * 1.2));
    const facing = Math.atan2(target.y - defense.y, target.x - defense.x);
    const result = targetKind === "asteroid"
      ? applyAsteroidDamage(target, damage, now)
      : applyShipMobDamage(target, damage, now, defense.x, defense.y);
    const event = {
      type: "combat",
      kind: "projectile",
      weapon: isCannon ? "orbital_cannon" : "station_turret",
      projectileKind: "laser_bolt",
      weaponStyle: isCannon ? "orbital_cannon" : "station_laser",
      weaponColor: isCannon ? "#ffd166" : "#67f0ff",
      attackerId: defense.id,
      x: Number(defense.x.toFixed(3)),
      y: Number(defense.y.toFixed(3)),
      facing: Number(facing.toFixed(3)),
      range,
      hit: true,
      targetId: target.id,
      targetKind,
      damage: result.damage,
      shieldDamage: result.shieldDamage,
      shieldHit: result.shieldHit,
      targetHp: result.targetHp,
      targetShieldHp: result.targetShieldHp,
      endX: Number(target.x.toFixed(3)),
      endY: Number(target.y.toFixed(3))
    };

    if (targetKind === "mob" && target.hp <= 0 && !target.dead) {
      target.dead = true;
      target.respawnAt = now + (target.noRespawn ? 9000 : MOB_RESPAWN_MS);
      event.defeated = true;
    } else if (targetKind === "asteroid" && result.destroyed) {
      event.defeated = true;
    }
    broadcastCombat(event);
  }
}

const PIRATE_AGGRO_RADIUS = 22;
const PIRATE_ATTACK_RANGE = 14;
const PIRATE_ATTACK_COOLDOWN_MS = 1400;
const PIRATE_ALERTED_MS = 30000;

function nearestAttackablePlayer(mob, playerTargets = null, now = Date.now()) {
  if (mob.isCritter) {
    return null;
  }
  let nearest = null;
  let nearestDistance = Infinity;
  const isPirate = Boolean(mob.isShipPirate);
  const aggroRange = isPirate ? PIRATE_AGGRO_RADIUS : MOB_AGGRO_RADIUS;
  const aggroSq = aggroRange * aggroRange;
  // Alerted pirates aggro from anywhere on the map for a window after taking damage.
  const alerted = isPirate && mob._alertedUntil && mob._alertedUntil > now;

  const mobWorld = worldForPosition(mob.x, mob.y);

  function consider(player, requireRange) {
    // Pirates never attack a player who is inside the station safe zone.
    if (isPirate && isInsideSciFiSafeZone(player.x, player.y)) {
      return;
    }
    const ddx = mob.x - player.x;
    const ddy = mob.y - player.y;
    const distSq = ddx * ddx + ddy * ddy;
    if ((!requireRange || distSq <= aggroSq) && distSq < nearestDistance) {
      nearest = player;
      nearestDistance = distSq;
    }
  }

  if (playerTargets) {
    if (alerted) {
      const rows = playerTargets.byWorld.get(mobWorld) || [];
      for (const row of rows) {
        consider(row.player, false);
      }
    } else {
      forEachPlayerTargetNear(playerTargets, mobWorld, mob.x, mob.y, aggroRange, (player) => {
        consider(player, true);
      });
    }
    return nearest;
  }

  for (const client of clients.values()) {
    const player = client.player;
    if (!player || player.hp <= 0 || !canAttackAt(player.x, player.y)) {
      continue;
    }
    // Worlds are isolated — never target a player in another map (e.g. a
    // pirate in space won't aggro on a player in the fantasy hub).
    if (mobWorld !== worldForPosition(player.x, player.y)) {
      continue;
    }
    consider(player, !alerted);
  }

  return nearest;
}

function fireShipPirateLaser(mob, player, now) {
  if (now - (mob.lastAttackAt || 0) < PIRATE_ATTACK_COOLDOWN_MS) return;
  mob.lastAttackAt = now;
  const dxh = player.x - mob.x;
  const dyh = player.y - mob.y;
  const dist = Math.hypot(dxh, dyh);
  if (dist > PIRATE_ATTACK_RANGE || dist < 0.01) return;
  const facing = Math.atan2(dyh, dxh);
  mob.facing = facing;
  const range = PIRATE_ATTACK_RANGE;
  const endX = mob.x + Math.cos(facing) * Math.min(range, dist);
  const endY = mob.y + Math.sin(facing) * Math.min(range, dist);

  // Damage application — direct hit on the targeted player.
  let damage = mob.attackDamage || 8;
  damage = applyArmourReduction(player, damage);
  let shieldHit = false;
  if (player.shieldBuff && player.shieldBuff.expiresAt > now) {
    shieldHit = true;
    damage = Math.max(1, Math.round(damage * (1 - SHIELD_DAMAGE_REDUCTION)));
    const len = dist || 1;
    player.shieldBuff.lastHitAt = now;
    player.shieldBuff.lastHitDx = -dxh / len;
    player.shieldBuff.lastHitDy = -dyh / len;
  }
  player.hp = Math.max(0, player.hp - damage);
  const event = {
    type: "combat",
    kind: "projectile",
    weapon: "ship_turret",
    projectileKind: "laser_bolt",
    weaponStyle: "ship_laser",
    weaponColor: mob.primary || "#ff6b8a",
    attackerId: mob.id,
    x: Number(mob.x.toFixed(3)),
    y: Number(mob.y.toFixed(3)),
    facing: Number(facing.toFixed(3)),
    range,
    hit: true,
    targetId: player.id,
    targetKind: "player",
    damage,
    shieldHit,
    targetHp: player.hp,
    endX: Number(endX.toFixed(3)),
    endY: Number(endY.toFixed(3))
  };
  if (player.hp <= 0) {
    respawnPlayer(player);
    event.defeated = true;
  }
  broadcastCombat(event);
}

function nearestHostileNpcShip(mob) {
  if (!mob?.isShipPirate || !mob.battleSide) return null;
  let nearest = null;
  let nearestDistance = Infinity;
  forEachMobNear(mob.x, mob.y, NPC_SHIP_BATTLE_SCAN_RADIUS, (other) => {
    if (other === mob || other.dead || !other.isShipPirate || !other.battleSide) return;
    if (other.battleSide === mob.battleSide) return;
    const dx = other.x - mob.x;
    const dy = other.y - mob.y;
    const dist = dx * dx + dy * dy;
    if (dist < nearestDistance) {
      nearestDistance = dist;
      nearest = other;
    }
  });
  return nearest;
}

function fireNpcShipLaser(attacker, target, now) {
  if (!attacker?.isShipPirate || !target?.isShipPirate || target.dead) return;
  if (now - (attacker._lastNpcShipShotAt || 0) < NPC_SHIP_BATTLE_COOLDOWN_MS) return;
  const dxh = target.x - attacker.x;
  const dyh = target.y - attacker.y;
  const dist = Math.hypot(dxh, dyh);
  if (dist > NPC_SHIP_BATTLE_RANGE || dist < 0.01) return;
  attacker._lastNpcShipShotAt = now;
  attacker.facing = Math.atan2(dyh, dxh);
  const damage = Math.max(2, Math.round((attacker.attackDamage || 8) * (attacker.isCapitalShip ? 1.35 : 1)));
  const result = applyShipMobDamage(target, damage, now, attacker.x, attacker.y);
  const event = {
    type: "combat",
    kind: "projectile",
    weapon: "npc_ship_laser",
    projectileKind: "laser_bolt",
    weaponStyle: attacker.isCapitalShip ? "orbital_cannon" : "ship_laser",
    weaponColor: attacker.primary || "#ff6b8a",
    attackerId: attacker.id,
    x: Number(attacker.x.toFixed(3)),
    y: Number(attacker.y.toFixed(3)),
    facing: Number(attacker.facing.toFixed(3)),
    range: NPC_SHIP_BATTLE_RANGE,
    hit: true,
    targetId: target.id,
    targetKind: "mob",
    damage: result.damage,
    shieldDamage: result.shieldDamage,
    shieldHit: result.shieldHit,
    targetHp: result.targetHp,
    targetShieldHp: result.targetShieldHp,
    endX: Number(target.x.toFixed(3)),
    endY: Number(target.y.toFixed(3))
  };
  if (target.hp <= 0 && !target.dead) {
    target.dead = true;
    target.respawnAt = now + (target.noRespawn ? 9000 : MOB_RESPAWN_MS);
    event.defeated = true;
  }
  broadcastCombat(event);
}

function alertPirateFleet(triggerMob, alertRadius = 28) {
  if (!triggerMob?.faction) return;
  const until = Date.now() + PIRATE_ALERTED_MS;
  const r2 = alertRadius * alertRadius;
  forEachMobNear(triggerMob.x, triggerMob.y, alertRadius + 4, (other) => {
    if (other === triggerMob) return;
    if (!other.isShipPirate || other.faction !== triggerMob.faction || other.dead) return;
    const ddx = other.x - triggerMob.x;
    const ddy = other.y - triggerMob.y;
    if (ddx * ddx + ddy * ddy <= r2) {
      other._alertedUntil = until;
    }
  });
  triggerMob._alertedUntil = until;
}

function attackPlayerWithMob(mob, player, now) {
  if ((mob.attackDamage || 0) <= 0 || mob.isCritter) {
    return;
  }
  if (now - mob.lastAttackAt < MOB_ATTACK_COOLDOWN_MS) {
    return;
  }

  mob.lastAttackAt = now;
  let damage = mob.attackDamage || (mob.isBoss ? BOSS_ATTACK_DAMAGE : MOB_ATTACK_DAMAGE);
  const blocked = rollBlockChance(player);
  if (blocked) {
    damage = Math.max(1, Math.round(damage * KNIGHT_SHIELD_DAMAGE_MULTIPLIER));
  }
  damage = applyArmourReduction(player, damage);

  // Personal shield buff absorbs part of the damage and lights up in the direction of the hit.
  let shieldHit = false;
  if (player.shieldBuff && player.shieldBuff.expiresAt > now) {
    shieldHit = true;
    damage = Math.max(1, Math.round(damage * (1 - SHIELD_DAMAGE_REDUCTION)));
    const dxh = player.x - mob.x;
    const dyh = player.y - mob.y;
    const len = Math.hypot(dxh, dyh) || 1;
    player.shieldBuff.lastHitAt = now;
    player.shieldBuff.lastHitDx = -dxh / len; // direction from player toward attacker
    player.shieldBuff.lastHitDy = -dyh / len;
  }

  player.hp = Math.max(0, player.hp - damage);

  const event = {
    type: "combat",
    kind: "swing",
    weapon: mob.isBoss ? "boss_claws" : "claws",
    projectileKind: null,
    attackerId: mob.id,
    x: Number(mob.x.toFixed(3)),
    y: Number(mob.y.toFixed(3)),
    facing: Number(mob.facing.toFixed(3)),
    range: MOB_ATTACK_RADIUS,
    hit: true,
    targetId: player.id,
    targetKind: "player",
    damage,
    blocked,
    shieldHit,
    targetHp: player.hp,
    endX: Number(player.x.toFixed(3)),
    endY: Number(player.y.toFixed(3))
  };

  if (player.hp <= 0) {
    respawnPlayer(player);
    event.defeated = true;
  }

  broadcastCombat(event);
}

function respawnPlayer(player) {
  const spawn = spawnPoint(nextSpawnIndex++);
  player.hp = player.maxHp;
  player.x = spawn.x;
  player.y = spawn.y;
  player.moving = false;
  clearPlayerBoardedShips(player);
}

function getMobSnapshot(viewBounds) {
  if (!viewBounds) {
    return [];
  }
  const out = [];
  forEachMobCandidate([viewBounds], (mob) => {
    if (mob.dead) {
      return;
    }
    if (typeof viewBounds.world === "string" && worldForPosition(mob.x, mob.y) !== viewBounds.world) {
      return;
    }
    if (
      viewBounds &&
      (mob.x < viewBounds.minX ||
        mob.x > viewBounds.maxX ||
        mob.y < viewBounds.minY ||
        mob.y > viewBounds.maxY)
    ) {
      return;
    }
    out.push({
      id: mob.id,
      name: mob.name,
      primary: mob.primary,
      accent: mob.accent,
      hp: mob.hp,
      maxHp: mob.maxHp,
      level: mob.level,
      biome: mob.biome || getBiome(mob.homeX, mob.homeY),
      faction: mob.faction,
      isBoss: Boolean(mob.isBoss),
      isDragon: Boolean(mob.isDragon),
      megaBoss: Boolean(mob.megaBoss),
      isCritter: Boolean(mob.isCritter),
      isShipPirate: Boolean(mob.isShipPirate),
      hullClass: typeof mob.hullClass === "string" ? mob.hullClass : null,
      isCapitalShip: Boolean(mob.isCapitalShip),
      battleSide: typeof mob.battleSide === "string" ? mob.battleSide : null,
      shieldHp: Number.isFinite(Number(mob.shieldHp)) ? Number(Number(mob.shieldHp).toFixed(2)) : 0,
      maxShieldHp: Number.isFinite(Number(mob.maxShieldHp)) ? Number(mob.maxShieldHp) : 0,
      x: Number(mob.x.toFixed(3)),
      y: Number(mob.y.toFixed(3)),
      facing: Number(mob.facing.toFixed(3))
    });
  });
  return out;
}

function send(client, message) {
  if (!client.alive || client.socket.destroyed) {
    return;
  }
  if (message?.type === "snapshot" && client.socket.writableLength > MAX_SOCKET_BUFFER_BYTES) {
    return;
  }

  client.socket.write(encodeFrame(Buffer.from(JSON.stringify(message)), 1));
}

function disconnectIdleClients(now = Date.now()) {
  for (const client of clients.values()) {
    if (!client?.alive) continue;
    const lastActivityAt = Number(client.lastActivityAt) || Number(client.connectedAt) || now;
    if (now - lastActivityAt < IDLE_DISCONNECT_MS) continue;
    send(client, {
      type: "serverMessage",
      message: "idle_disconnect",
      idleMinutes: Math.round(IDLE_DISCONNECT_MS / 60000)
    });
    disconnect(client, "idle");
  }
}

function disconnect(client, reason = null) {
  if (!client.alive) {
    return;
  }

  const playerName = client.player?.name;
  if (social) {
    social.onDisconnect(client);
  }
  saveClientCharacter(client);
  client.alive = false;
  clients.delete(client.id);

  if (!client.socket.destroyed) {
    client.socket.end(encodeCloseFrame(reason));
  }

  if (playerName) {
    pushChat({
      kind: "system",
      name: "Realm",
      text: `${playerName} left the hub`
    });
  }

  broadcastSnapshot();
}

function decodeFrames(buffer) {
  const frames = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const first = buffer[offset];
    const second = buffer[offset + 1];
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;
    let length = second & 0x7f;
    let headerLength = 2;

    if (length === 126) {
      if (offset + 4 > buffer.length) {
        break;
      }
      length = buffer.readUInt16BE(offset + 2);
      headerLength += 2;
    } else if (length === 127) {
      if (offset + 10 > buffer.length) {
        break;
      }
      const longLength = buffer.readBigUInt64BE(offset + 2);
      if (longLength > BigInt(Number.MAX_SAFE_INTEGER)) {
        return { frames, remaining: Buffer.alloc(0), close: true };
      }
      length = Number(longLength);
      headerLength += 8;
    }

    const maskLength = masked ? 4 : 0;
    const payloadStart = offset + headerLength + maskLength;
    const payloadEnd = payloadStart + length;

    if (payloadEnd > buffer.length) {
      break;
    }

    let payload = buffer.subarray(payloadStart, payloadEnd);
    if (masked) {
      const mask = buffer.subarray(offset + headerLength, offset + headerLength + 4);
      payload = Buffer.from(payload);
      for (let i = 0; i < payload.length; i += 1) {
        payload[i] ^= mask[i % 4];
      }
    }

    frames.push({ opcode, payload });
    offset = payloadEnd;
  }

  return {
    frames,
    remaining: buffer.subarray(offset),
    close: false
  };
}

function encodeFrame(payload, opcode = 1) {
  const length = payload.length;
  let header;

  if (length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  return Buffer.concat([header, payload]);
}

function encodeCloseFrame(reason = null) {
  if (reason === "idle") {
    const reasonBytes = Buffer.from("idle_timeout");
    const payload = Buffer.alloc(2 + reasonBytes.length);
    payload.writeUInt16BE(WS_CLOSE_IDLE_TIMEOUT, 0);
    reasonBytes.copy(payload, 2);
    return encodeFrame(payload, 8);
  }
  return encodeFrame(Buffer.alloc(0), 8);
}

function normalizeInput(keys = {}) {
  return {
    up: Boolean(keys.up),
    down: Boolean(keys.down),
    left: Boolean(keys.left),
    right: Boolean(keys.right),
    engage: Boolean(keys.engage),
    fire: Boolean(keys.fire),
    repair: Boolean(keys.repair),
    weaponMode: keys.weaponMode === "missile" ? "missile" : "laser"
  };
}

function normalizeView(view = {}, player = null) {
  const fallback = player ? defaultViewForPlayer(player) : { x: 0, y: 0, halfW: 22, halfH: 14 };
  const x = Number(view.x);
  const y = Number(view.y);
  const halfW = Number(view.halfW);
  const halfH = Number(view.halfH);
  /**
   * Caps must cover client max zoom-out (zoom 0.25 → large halfW in tiles) or hub NPCs
   * stay culled from snapshots while still visible — they look frozen.
   */
  return {
    x: Number.isFinite(x) ? x : fallback.x,
    y: Number.isFinite(y) ? y : fallback.y,
    halfW: Number.isFinite(halfW) ? Math.max(6, Math.min(220, halfW)) : fallback.halfW,
    halfH: Number.isFinite(halfH) ? Math.max(4, Math.min(140, halfH)) : fallback.halfH
  };
}

function sanitizeUsername(value) {
  const normalized = String(value || "")
    .replace(/[^\w-]/g, "")
    .trim()
    .slice(0, MAX_AUTH_USERNAME_LENGTH);
  return normalized.length >= MIN_USERNAME_LENGTH ? normalized : "";
}

function sanitizePassword(value) {
  const password = String(value ?? "");
  if (password.length > MAX_AUTH_PASSWORD_LENGTH) {
    return null;
  }
  return password;
}

function sanitizeName(value) {
  const normalized = String(value || "Wanderer")
    .replace(/[^\w -]/g, "")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
  return normalized || "Wanderer";
}

function sanitizeChatText(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHAT_LENGTH);
}

function sanitizeChoice(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function sanitizeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function clampInteger(value, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(min, Math.min(max, parsed));
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function sanitizeStats(stats = {}) {
  const result = createBaseStats();
  for (const stat of STAT_IDS) {
    result[stat] = clampInteger(stats[stat] || 0, 0, 1000);
  }
  return result;
}

function sanitizeInventory(inventory) {
  const result = Array(INVENTORY_SIZE).fill(null);
  if (!Array.isArray(inventory)) {
    return result;
  }
  inventory.slice(0, INVENTORY_SIZE).forEach((item, index) => {
    result[index] = sanitizeItem(item);
  });
  return result;
}

function sanitizeEquipment(equipment) {
  if (!equipment || typeof equipment !== "object") {
    return null;
  }
  return {
    weapon: sanitizeItem(equipment.weapon),
    body: sanitizeItem(equipment.body),
    ring1: sanitizeItem(equipment.ring1),
    ring2: sanitizeItem(equipment.ring2)
  };
}

function sanitizeItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }
  const type = sanitizeChoice(item.type, ["weapon", "armor", "ring", "potion"], null);
  if (!type) {
    return null;
  }
  return {
    ...item,
    type,
    name: String(item.name || "Item").slice(0, 48),
    id: String(item.id || `item_${nextItemId++}`).slice(0, 48),
    value: clampInteger(item.value ?? getItemValue(item), 0, 1000000),
    stats: typeof item.stats === "object" && item.stats ? { ...item.stats } : {},
    visual: typeof item.visual === "object" && item.visual ? { ...item.visual } : {},
    specialEffects:
      typeof item.specialEffects === "object" && item.specialEffects ? { ...item.specialEffects } : {}
  };
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

// Personal-shield spells get a long-duration protective bubble around the caster.
const SHIELD_SPELLS = new Set(["mana_shield", "frost_barrier", "divine_shield", "fortify"]);
const SHIELD_BUFF_DURATION_MS = 30000;
const SHIELD_DAMAGE_REDUCTION = 0.5; // 50% incoming damage is absorbed while the shield holds.
const SHIELD_HIT_GLOW_MS = 600;

function shieldBuffColor(spellId) {
  if (spellId === "frost_barrier") return "#9ee8ff";
  if (spellId === "divine_shield") return "#ffe27a";
  if (spellId === "fortify") return "#f4d35e";
  return "#a07bff"; // mana_shield default
}

const SPELL_COOLDOWNS = new Map();
const SPELL_COOLDOWN_MS = {
  fireball: 2000, fire_nova: 4000, inferno: 8000,
  ice_shard: 2000, frost_barrier: 12000, blizzard: 10000,
  arcane_bolt: 1500, mana_shield: 15000, time_warp: 20000,
  shield_bash: 4000, divine_shield: 30000, fortify: 20000,
  holy_strike: 2000, consecration: 8000, divine_wrath: 10000,
  healing_aura: 12000, lay_on_hands: 30000, battle_cry: 15000,
  precise_shot: 2000, piercing_arrow: 3000, rain_of_arrows: 8000,
  caltrops: 6000, evasion: 12000, camouflage: 20000,
  multishot: 3000, smoke_bomb: 8000, volley: 6000
};

const SPELL_DAMAGE_PROFILES = {
  fireball: { damage: 95, range: 26, arc: 0.34, maxTargets: 1 },
  fire_nova: { damage: 85, radius: 4.2 },
  inferno: { damage: 180, range: 21, arc: 1.08 },
  ice_shard: { damage: 90, range: 24, arc: 0.31, maxTargets: 1 },
  frost_barrier: { damage: 70, radius: 3.2 },
  blizzard: { damage: 150, radius: 5.4 },
  arcane_bolt: { damage: 115, range: 29, arc: 0.29, maxTargets: 1 },
  mana_shield: { damage: 70, radius: 3 },
  time_warp: { damage: 110, radius: 5.2 },
  shield_bash: { damage: 125, range: 2.8, arc: 1.0, maxTargets: 2 },
  divine_shield: { damage: 95, radius: 3.5 },
  fortify: { damage: 80, radius: 2.8 },
  holy_strike: { damage: 150, range: 3.2, arc: 1.1, maxTargets: 2 },
  consecration: { damage: 145, radius: 4.6 },
  divine_wrath: { damage: 210, range: 22, arc: 1.2 },
  healing_aura: { damage: 65, radius: 3.5 },
  lay_on_hands: { damage: 120, radius: 4.2 },
  battle_cry: { damage: 80, radius: 4.4 },
  precise_shot: { damage: 145, range: 20, arc: 0.26, maxTargets: 1 },
  piercing_arrow: { damage: 125, range: 18, arc: 0.4 },
  rain_of_arrows: { damage: 155, radius: 5.2 },
  caltrops: { damage: 90, radius: 3.6 },
  evasion: { damage: 70, radius: 2.6 },
  camouflage: { damage: 75, radius: 3.2 },
  multishot: { damage: 100, range: 17, arc: 0.85, maxTargets: 3 },
  smoke_bomb: { damage: 105, radius: 4.2 },
  volley: { damage: 135, range: 19, arc: 0.98, maxTargets: 5 }
};

function handleCastSpell(client, spellId) {
  const p = client.player;
  const now = Date.now();
  const cdKey = `${p.id}:${spellId}`;
  const cd = SPELL_COOLDOWN_MS[spellId] || 3000;
  const nextReadyAt = (SPELL_COOLDOWNS.get(cdKey) || 0) + cd;
  if (nextReadyAt > now) {
    send(client, { type: "spellCooldown", spellId, cooldownMs: cd, readyAt: nextReadyAt });
    return;
  }

  if (spellId === "consecration" && !canAttackAt(p.x, p.y)) {
    send(client, { type: "serverMessage", message: "combat_protected" });
    return;
  }

  SPELL_COOLDOWNS.set(cdKey, now);

  if (spellId === "healing_aura" || spellId === "lay_on_hands") {
    const heal = spellId === "lay_on_hands" ? Math.round(p.maxHp * 0.5) : Math.round(p.maxHp * 0.05);
    p.hp = Math.min(p.maxHp, p.hp + heal);
  }
  if (spellId === "battle_cry" || spellId === "evasion" || spellId === "camouflage") {
    p._buffExpires = now + 5000;
    p._buff = spellId;
  }
  if (SHIELD_SPELLS.has(spellId)) {
    p.shieldBuff = {
      spellId,
      expiresAt: now + SHIELD_BUFF_DURATION_MS,
      color: shieldBuffColor(spellId),
      lastHitAt: 0,
      lastHitDx: 0,
      lastHitDy: 0
    };
  }
  if (spellId === "consecration") {
    spawnConsecrationZone(p, now);
  } else {
    applySpellDamage(client, spellId, now);
  }

  const gx = Math.floor(p.x) + 0.5;
  const gy = Math.floor(p.y) + 0.5;
  for (const c of clients.values()) {
    send(c, {
      type: "spellCast",
      casterId: p.id,
      spellId,
      x: spellId === "consecration" ? gx : p.x,
      y: spellId === "consecration" ? gy : p.y,
      groundAnchor: spellId === "consecration",
      facing: p.facing,
      cooldownMs: cd,
      readyAt: now + cd
    });
  }
  send(client, { type: "spellCooldown", spellId, cooldownMs: cd, readyAt: now + cd });
  broadcastSnapshot();
}

function applySpellDamage(client, spellId, now) {
  if (spellId === "consecration") {
    return;
  }
  const player = client.player;
  const profile = SPELL_DAMAGE_PROFILES[spellId];
  if (!player || !profile || !canAttackAt(player.x, player.y)) {
    return;
  }

  const targets = findSpellTargets(player, profile);
  const baseDamage = profile.damage + player.stats.strength * STAT_POINT_STRENGTH_DAMAGE + getEquipmentStats(player).damage;
  for (const mob of targets) {
    const damage = Math.max(1, Math.round(baseDamage + mob.level * 3));
    mob.hp = Math.max(0, mob.hp - damage);
    const event = {
      type: "combat",
      kind: "spell",
      weapon: spellId,
      projectileKind: null,
      attackerId: player.id,
      x: Number(player.x.toFixed(3)),
      y: Number(player.y.toFixed(3)),
      facing: Number(player.facing.toFixed(3)),
      range: profile.radius || profile.range || 4,
      hit: true,
      targetId: mob.id,
      targetKind: "mob",
      damage,
      targetHp: mob.hp,
      endX: Number(mob.x.toFixed(3)),
      endY: Number(mob.y.toFixed(3))
    };

    if (mob.hp <= 0 && !mob.dead) {
      mob.dead = true;
      mob.respawnAt = now + (mob.isCritter ? 4200 : MOB_RESPAWN_MS);
      event.defeated = true;
      const progress = awardXp(player, xpForMob(mob));
      event.xpGained = progress.xpGained;
      event.levelsGained = progress.levelsGained;
      const goldReward = goldForMob(mob);
      player.gold += goldReward;
      event.goldGained = goldReward;
      dropLootForMob(mob);
      recordMobDefeatForQuests(client, mob);
    }

    broadcastCombat(event);
  }
}

function findSpellTargets(player, profile) {
  const targets = [];
  const searchRadius = profile.radius || profile.range || 12;
  forEachMobNear(player.x, player.y, searchRadius + 4, (mob) => {
    if (mob.dead) return;
    const dx = mob.x - player.x;
    const dy = mob.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (profile.radius) {
      if (dist > profile.radius) return;
    } else {
      if (dist > profile.range || dist < 0.01) return;
      const targetAngle = Math.atan2(dy, dx);
      const delta = Math.abs(normalizeAngle(targetAngle - player.facing));
      if (delta > profile.arc / 2) return;
    }
    targets.push(mob);
  });

  targets.sort((a, b) => distance(player, a) - distance(player, b));
  return typeof profile.maxTargets === "number" ? targets.slice(0, profile.maxTargets) : targets;
}
