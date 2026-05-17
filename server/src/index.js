const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
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
  isBlockedCircleForShip,
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
  SCI_FI_STATION_CENTER,
  SCI_FI_SAFE_RADIUS,
  SCI_FI_DEFENSES,
  getPlanetById,
  getPlanetBySpacePoint,
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
  pickHouseCompanionComplimentLine,
  getCompanionNpcTemplate,
  pickPubDreamGirlfriendNpcId,
  getWorldTimeSnapshot,
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
const { postAuthEventToDiscord, isAllowedDiscordWebhookUrl, resolveDiscordAuthWebhookUrl } = require("./discordWebhook");

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
const TICK_RATE = readRateEnv("TICK_RATE", 60, 20, 120);
const SNAPSHOT_RATE = Math.min(TICK_RATE, readRateEnv("SNAPSHOT_RATE", 20, 5, 60));
const MAX_CONNECTED_CLIENTS = Number(process.env.MAX_CLIENTS || 180);
const MSG_RATE_LIMIT = 240; // max messages per second per client before dropping
// Base player movement speed (tiles per second).
const PLAYER_SPEED = 5.2;
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
const GATEKEEPER_IDS = Object.freeze(["hub_g_n", "hub_g_ne", "hub_g_e", "hub_g_se", "hub_g_s", "hub_g_sw", "hub_g_w", "hub_g_nw"]);
const GATEKEEPER_RANGE = 46;
const GATEKEEPER_NEAR_TOWN_RADIUS = HUB_TOWN_GRASS_RADIUS + 84;
const GATEKEEPER_ATTACK_COOLDOWN_MS = 1150;
const GATEKEEPER_ARROW_DAMAGE = 34;
const FANTASY_ASSAULT_INTERVAL_MS = 15000;
const SCI_FI_ASSAULT_INTERVAL_MS = 30000;
const MAX_ACTIVE_FANTASY_ASSAULT_MOBS = 128;
const MAX_ACTIVE_SCI_FI_ASSAULT_MOBS = 60;
const FANTASY_NIGHT_RAID_CAMPS_PER_WAVE = 3;
const STATION_DEFENSE_ATTACK_COOLDOWN_MS = 900;
const STATION_TURRET_DAMAGE = 42;
const ORBITAL_CANNON_DAMAGE = 82;
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
const QUEST_DEFINITIONS = Object.freeze({
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

const mobs = createMobs();
let nextAssaultMobId = 1;
let nextFantasyAssaultAt = Date.now() + 22000;
let nextSciFiAssaultAt = Date.now() + 30000;
const stationDefenseLastShotAt = new Map();
const traderStocks = new Map();
for (const def of getTraderDefinitions()) {
  traderStocks.set(def.id, createTraderStock(def.id, def.homeX * 100 + def.homeY));
}

syncNextItemIdFromAccounts();
syncNextItemIdFromHouseChestsDb();

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    sendJson(res, 200, {
      ok: true,
      players: [...clients.values()].filter((client) => client.player).length,
      tickRate: TICK_RATE,
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

server.listen(PORT, HOST, () => {
  console.log(`Balathor server listening on ${HOST}:${PORT}`);
  if (DISCORD_AUTH_WEBHOOK_URL && isAllowedDiscordWebhookUrl(DISCORD_AUTH_WEBHOOK_URL)) {
    console.log("Balathor: Discord auth webhook enabled");
  }
});

/** Single-threaded clock: never overlap simulate(); avoids setInterval piling callbacks when ticks overrun. */
let simulateTimer = null;
function queueSimulate() {
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
queueSimulate();

function clearSimulateTimer() {
  if (simulateTimer !== null && simulateTimer !== undefined) {
    clearTimeout(simulateTimer);
    simulateTimer = null;
  }
}

process.on("SIGTERM", () => {
  clearSimulateTimer();
  saveAllActiveCharacters();
  closeWorldDb(worldDb);
  process.exit(0);
});

process.on("SIGINT", () => {
  clearSimulateTimer();
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
    ...(typeof player.aboardShipId === "string" && player.aboardShipId ? { aboardShipId: player.aboardShipId } : {})
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
    dockX: clampNumber(ship.dockX, -10000, 10000, STARGATE_LANDING.x),
    dockY: clampNumber(ship.dockY, -10000, 10000, STARGATE_LANDING.y),
    dockStationId: typeof ship.dockStationId === "string" ? ship.dockStationId : "station_ringforge",
    dockPortId: typeof ship.dockPortId === "string" ? ship.dockPortId.slice(0, 48) : null,
    worldX: clampNumber(ship.worldX, -10000, 10000, ship.dockX ?? STARGATE_LANDING.x),
    worldY: clampNumber(ship.worldY, -10000, 10000, ship.dockY ?? STARGATE_LANDING.y),
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
    docking: ship.docking && typeof ship.docking.portId === "string"
      ? { portId: ship.docking.portId }
      : null
  };
}

function serializeShipForPlayer(player, ship = player?.ship) {
  if (!ship) return null;
  const snap = serializeShip(ship);
  snap.stationRole = typeof player?.shipStationRole === "string" ? player.shipStationRole : snap.stationRole;
  snap.stationId = typeof player?.shipStationId === "string" ? player.shipStationId : snap.stationId;
  return snap;
}

function getShipTurrets(shipOrClass) {
  const hullClass = typeof shipOrClass === "string" ? shipOrClass : shipOrClass?.hullClass;
  // Turret anchors are offsets (in tiles) from the ship center. The gunner fires one bolt
  // from every anchor when they click, and all bolts converge on the target.
  if (hullClass === "crew4" || hullClass === "frigate" || hullClass === "freighter") {
    return [
      { x: 1.6, y: -0.9 },
      { x: 1.6, y: 0.9 },
      { x: -1.6, y: -0.9 },
      { x: -1.6, y: 0.9 }
    ];
  }
  if (hullClass === "crew2" || hullClass === "corvette" || hullClass === "hauler" || hullClass === "yacht") {
    return [
      { x: 1.2, y: -0.7 },
      { x: 1.2, y: 0.7 }
    ];
  }
  return [{ x: 1.1, y: 0 }];
}

function getShipLayout(shipOrClass = "skiff") {
  const hullClass = typeof shipOrClass === "string" ? shipOrClass : shipOrClass?.hullClass;
  if (hullClass === "crew4" || hullClass === "frigate" || hullClass === "freighter") {
    return {
      crewCapacity: 4,
      deckW: 18,
      deckH: 10,
      entry: { x: -7, y: 0 },
      teleporter: { x: -4, y: 0 },
      stations: [
        { id: "captain", role: "captain", name: "Captain Seat", x: 3.2, y: 0 },
        { id: "pilot", role: "pilot", name: "Pilot Seat", x: 5.1, y: -1 },
        { id: "copilot", role: "copilot", name: "Co-Pilot Seat", x: 5.1, y: 1 },
        { id: "gunner_aft", role: "gunner", name: "Aft Gunner", x: -5.2, y: 0 },
        { id: "engineer_mid", role: "engineer", name: "Forward Engineering", x: -1.2, y: -2, defaultShieldFacing: "front" },
        { id: "engineer_aux", role: "engineer", name: "Aft Engineering", x: -1.6, y: 2, defaultShieldFacing: "back" }
      ]
    };
  }
  if (hullClass === "crew2" || hullClass === "corvette" || hullClass === "hauler" || hullClass === "yacht") {
    return {
      crewCapacity: 2,
      deckW: 14,
      deckH: 8,
      entry: { x: -5, y: 0 },
      teleporter: { x: -3, y: 0 },
      stations: [
        { id: "pilot", role: "pilot", name: "Pilot Seat", x: 3.4, y: -1 },
        { id: "copilot", role: "copilot", name: "Co-Pilot Seat", x: 3.4, y: 1 },
        { id: "gunner_aft", role: "gunner", name: "Aft Gunner", x: -4.1, y: 0 },
        { id: "engineer_mid", role: "engineer", name: "Engineering", x: -0.7, y: 0, defaultShieldFacing: "front" }
      ]
    };
  }
  return {
    crewCapacity: 1,
    deckW: 7,
    deckH: 4,
    entry: { x: 0, y: 0 },
    stations: [{ id: "pilot", role: "pilot", name: "Pilot Seat", x: 0, y: 0 }]
  };
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
    dockX: clampNumber(ship.dockX, -10000, 10000, STARGATE_LANDING.x),
    dockY: clampNumber(ship.dockY, -10000, 10000, STARGATE_LANDING.y),
    dockStationId: typeof ship.dockStationId === "string" ? ship.dockStationId.slice(0, 48) : "station_ringforge",
    dockPortId: typeof ship.dockPortId === "string" ? ship.dockPortId.slice(0, 48) : null,
    worldX: clampNumber(ship.worldX, -10000, 10000, ship.dockX ?? STARGATE_LANDING.x),
    worldY: clampNumber(ship.worldY, -10000, 10000, ship.dockY ?? STARGATE_LANDING.y),
    facing: normalizeAngle(clampNumber(ship.facing, -Math.PI * 2, Math.PI * 2, 0)),
    speed: clampNumber(ship.speed, 0, 1000, SHIP_SPEED),
    laserTier: clampInteger(ship.laserTier ?? 1, 1, 5),
    thrustTier: clampInteger(ship.thrustTier ?? 1, 1, 5),
    deckMode: Boolean(ship.deckMode),
    stationRole: typeof ship.stationRole === "string" ? ship.stationRole.slice(0, 24) : null,
    stationId: typeof ship.stationId === "string" ? ship.stationId.slice(0, 48) : null,
    shieldFacing: normalizeShieldFacing(ship.shieldFacing),
    shieldSections: sanitizeShipShieldSections(ship)
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
    }
  }
  if (player.ship) {
    player.ship.boarded = false;
    player.ship.deckMode = false;
    player.ship.stationRole = null;
    player.ship.stationId = null;
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
    result.push({
      minX: view.x - view.halfW - tileMargin,
      maxX: view.x + view.halfW + tileMargin,
      minY: view.y - view.halfH - tileMargin,
      maxY: view.y + view.halfH + tileMargin,
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

function simulate() {
  recordSimulateWallInterval();
  tick += 1;
  const dt = 1 / TICK_RATE;

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

    if (shipPilot) {
      const ship = client.player.ship;
      client.player._stillAccumulator = 0;

      // Auto-dock animation takes priority over pilot input.
      if (ship.docking && typeof ship.docking.portId === "string") {
        const dockPort = sciFiDockPortById(ship.docking.portId);
        if (!dockPort) {
          ship.docking = null;
        } else {
          const center = shipCenter(ship);
          const targetX = dockPort.x;
          const targetY = dockPort.y;
          const dxd = targetX - center.x;
          const dyd = targetY - center.y;
          const dist = Math.hypot(dxd, dyd);
          const dockSpeed = Math.max(1.5, getPlayerSpeed(client.player) * 0.4);
          if (dist <= dockSpeed * dt + 0.2) {
            ship.worldX = targetX;
            ship.worldY = targetY;
            ship.docking = null;
            client.player.facing = facingForDockPort(dockPort);
            dockPlayerShipAtStation(client, dockPort);
            continue;
          }
          const stepX = (dxd / dist) * dockSpeed * dt;
          const stepY = (dyd / dist) * dockSpeed * dt;
          const prevShipX = Number.isFinite(ship.worldX) ? ship.worldX : center.x;
          const prevShipY = Number.isFinite(ship.worldY) ? ship.worldY : center.y;
          ship.worldX = center.x + stepX;
          ship.worldY = center.y + stepY;
          client.player.facing = Math.atan2(dyd, dxd);
          const shipDx = ship.worldX - prevShipX;
          const shipDy = ship.worldY - prevShipY;
          for (const passengerClient of clients.values()) {
            const passenger = passengerClient.player;
            if (!passenger || passenger.aboardShipId !== ship.id) continue;
            passenger.x += shipDx;
            passenger.y += shipDy;
          }
          const seatStation = getShipLayout(ship).stations.find((candidate) => candidate.id === ship.stationId) || getShipLayout(ship).stations[0];
          const seat = shipStationWorld(ship, seatStation);
          client.player.x = seat.x;
          client.player.y = seat.y;
          client.player.moving = true;
          continue;
        }
      }

      // WASD sets the ship's facing direction
      const dx = Number(input.right) - Number(input.left);
      const dy = Number(input.down) - Number(input.up);
      const aimLength = Math.hypot(dx, dy);
      if (aimLength > 0) {
        client.player.facing = Math.atan2(dy, dx);
        ship.facing = client.player.facing;
      }
      // Engage thrusts forward in the facing direction
      if (input.engage) {
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
          for (const passengerClient of clients.values()) {
            const passenger = passengerClient.player;
            if (!passenger || passenger.aboardShipId !== ship.id) continue;
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
      client.player.moving = Boolean(input.engage);
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
        if (input.fire && Date.now() - client.lastAttackAt > 420) {
          client.lastAttackAt = Date.now();
          const center = shipCenter(ship);
          const tier = Math.max(1, Number(ship.laserTier) || 1);
          const range = 9 + tier * 2;
          broadcastCombat({
            type: "combat",
            kind: "projectile",
            weapon: "ship_turret",
            projectileKind: "arcane",
            attackerId: client.player.id,
            x: Number(center.x.toFixed(3)),
            y: Number(center.y.toFixed(3)),
            facing: Number(client.player.facing.toFixed(3)),
            range,
            hit: false,
            endX: Number((center.x + Math.cos(client.player.facing) * range).toFixed(3)),
            endY: Number((center.y + Math.sin(client.player.facing) * range).toFixed(3))
          });
        }
        client.player.moving = Boolean(input.fire);
      } else {
        let dx = Number(input.right) - Number(input.left);
        let dy = Number(input.down) - Number(input.up);
        const length = Math.hypot(dx, dy);
        if (length > 0) {
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
        client.player._stillAccumulator = 0;
        if (length > 0) {
          dx /= length;
          dy /= length;
        } else {
          dx = Number(client.player.zeroGDriftX) || 0;
          dy = Number(client.player.zeroGDriftY) || 0;
        }

        const speed = getPlayerSpeed(client.player) * (inZeroG ? ZERO_G_DRIFT_SPEED_MULTIPLIER : 1);
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

    handleDoorTravel(client);
    handlePortalTravel(client);
  }

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

  updateNpcs(dt, pushChat, computeNpcActivationBounds(), {
    targets: companionAiTargets,
    allPlayers: allNpcPlayers,
    tryOffer(npc, buddyRow) {
      if (buddyRow?.client) {
        sendCompanionPurchaseOffer(npc, buddyRow.client, Date.now());
      }
    }
  });
  processAssaultWaves(Date.now());
  updateMobs(dt, computePlayerViewBoundsArray(CHAT_VIEW_MARGIN_TILES + MOB_ACTIVITY_MARGIN_TILES));
  processGatekeeperArchers(Date.now());
  processStationDefenses(Date.now());
  updateCaravans(dt);

  processConsecrationZones(Date.now());

  snapshotAccumulator += SNAPSHOT_RATE;
  if (snapshotAccumulator >= TICK_RATE) {
    snapshotAccumulator -= TICK_RATE;
    broadcastSnapshot();
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
    const ship = client.player.ship;
    ship.worldX = portal.targetX;
    ship.worldY = portal.targetY;
    ship.boarded = true;
    ship.deckMode = (getShipLayout(ship).crewCapacity > 1);
    ship.stationRole = ship.deckMode ? null : "pilot";
    ship.stationId = ship.deckMode ? null : "pilot";
    if (ship.deckMode) {
      const layout = getShipLayout(ship);
      client.player.x = ship.worldX + (layout?.entry?.x || 0);
      client.player.y = ship.worldY + (layout?.entry?.y || 0);
    } else {
      client.player.x = ship.worldX;
      client.player.y = ship.worldY;
    }
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

  if (message.type === "ping") {
    const t = Number(message.t);
    send(client, {
      type: "pong",
      t: Number.isFinite(t) ? t : 0,
      tick,
      tickRate: TICK_RATE,
      snapshotRate: SNAPSHOT_RATE,
      simHz: getMeasuredSimHz()
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

  if (message.type === "travelToPlanet") {
    handleTravelToPlanet(client, message);
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

  if (message.type === "teleportMenuOpen") {
    handleTeleportMenuOpen(client);
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
  const dest = resolveHomeTeleportDestination(client.player, client.account?.key);
  client.player.x = dest.x;
  client.player.y = dest.y;
  client.player.moving = false;
  client.input = normalizeInput();

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

function handleShipFire(client, message = {}) {
  const ship = client.player?.ship;
  if (!ship?.boarded || ship.stationRole !== "gunner") {
    return;
  }
  const now = Date.now();
  if (now - (client.lastShipFireAt || 0) < SHIP_GUNNER_COOLDOWN_MS) {
    return;
  }
  client.lastShipFireAt = now;

  const center = shipCenter(ship);
  const tx = Number.isFinite(Number(message.targetX)) ? Number(message.targetX) : center.x + Math.cos(client.player.facing) * 8;
  const ty = Number.isFinite(Number(message.targetY)) ? Number(message.targetY) : center.y + Math.sin(client.player.facing) * 8;

  const tier = Math.max(1, Number(ship.laserTier) || 1);
  const baseRange = 9 + tier * 2;
  const turrets = getShipTurrets(ship);

  // Update the gunner's facing toward the click so the visual orientation tracks
  // their last shot and the turret seat indicator looks correct.
  const aimDx = tx - center.x;
  const aimDy = ty - center.y;
  if (aimDx * aimDx + aimDy * aimDy > 0.0001) {
    client.player.facing = Math.atan2(aimDy, aimDx);
  }

  const turretDamage = 12 + tier * 6;
  for (const turret of turrets) {
    const ox = center.x + turret.x;
    const oy = center.y + turret.y;
    const dxs = tx - ox;
    const dys = ty - oy;
    const dist = Math.hypot(dxs, dys);
    const reach = Math.min(baseRange, dist || baseRange) || baseRange;
    const facing = Math.atan2(dys, dxs);

    // Find the nearest live mob whose center is roughly along this turret's beam.
    let bestMob = null;
    let bestT = reach;
    const beamCos = Math.cos(facing);
    const beamSin = Math.sin(facing);
    for (const mob of mobs) {
      if (mob.dead) continue;
      const mx = mob.x - ox;
      const my = mob.y - oy;
      const t = mx * beamCos + my * beamSin;
      if (t < 0 || t > reach) continue;
      const perpX = mx - beamCos * t;
      const perpY = my - beamSin * t;
      const perpDist = Math.hypot(perpX, perpY);
      if (perpDist > 1.6) continue;
      if (t < bestT) {
        bestT = t;
        bestMob = mob;
      }
    }

    const endX = bestMob ? bestMob.x : ox + beamCos * reach;
    const endY = bestMob ? bestMob.y : oy + beamSin * reach;

    const event = {
      type: "combat",
      kind: "projectile",
      weapon: "ship_turret",
      projectileKind: "laser_bolt",
      weaponStyle: "ship_laser",
      weaponColor: ship.color || "#67f0ff",
      attackerId: client.player.id,
      x: Number(ox.toFixed(3)),
      y: Number(oy.toFixed(3)),
      facing: Number(facing.toFixed(3)),
      range: reach,
      hit: Boolean(bestMob),
      endX: Number(endX.toFixed(3)),
      endY: Number(endY.toFixed(3))
    };

    if (bestMob) {
      const damage = Math.max(1, Math.round(turretDamage + bestMob.level));
      bestMob.hp = Math.max(0, bestMob.hp - damage);
      event.targetId = bestMob.id;
      event.targetKind = "mob";
      event.damage = damage;
      event.targetHp = bestMob.hp;
      if (bestMob.isShipPirate) {
        alertPirateFleet(bestMob);
      }
      if (bestMob.hp <= 0) {
        bestMob.dead = true;
        bestMob.respawnAt = Date.now() + MOB_RESPAWN_MS;
        event.defeated = true;
        const progress = awardXp(client.player, xpForMob(bestMob));
        event.xpGained = progress.xpGained;
        event.levelsGained = progress.levelsGained;
        const goldReward = goldForMob(bestMob);
        client.player.gold += goldReward;
        event.goldGained = goldReward;
        dropLootForMob(bestMob);
        recordMobDefeatForQuests(client, bestMob);
      }
    }

    broadcastCombat(event);
  }
  client.player.moving = true;
}

// ── Teleport menu ───────────────────────────────────────────────────────────
// Surfaces a list of nearby destinations the player can warp to. Available
// inside any multi-crew ship (teleporter fixture / hotbar button) and on the
// main station. Destinations include the closest planet, the player's current
// home dock, and the main Orbital Square station as a fallback.

const TELEPORT_NEAR_RANGE = 220; // tiles — used to decide "nearby" planets / stations.

function buildTeleportDestinations(player) {
  const destinations = [];
  const px = Number(player.x) || 0;
  const py = Number(player.y) || 0;
  const world = worldForPosition(px, py);

  if (world === "scifi") {
    // Sort planets by distance from current ship position.
    const ranked = SCI_FI_PLANETS.slice().sort((a, b) => {
      const da = Math.hypot(a.x - px, a.y - py);
      const db = Math.hypot(b.x - px, b.y - py);
      return da - db;
    });
    for (const planet of ranked) {
      const dist = Math.hypot(planet.x - px, planet.y - py);
      destinations.push({
        kind: "planet",
        id: planet.id,
        label: planet.name,
        sublabel: dist <= TELEPORT_NEAR_RANGE ? "Nearby planet" : "Distant planet",
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

  return destinations;
}

function handleTeleportMenuOpen(client) {
  const player = client.player;
  if (!player) return;
  const world = worldForPosition(player.x, player.y);
  if (world !== "scifi" && !world?.startsWith("planet:")) {
    send(client, { type: "serverMessage", message: "teleport_not_here" });
    return;
  }
  send(client, {
    type: "teleportMenu",
    title: world?.startsWith("planet:") ? "Planet Teleporter" : "Ship Teleporter",
    destinations: buildTeleportDestinations(player)
  });
}

function handleTeleportMenuTravel(client, message = {}) {
  const player = client.player;
  if (!player) return;
  const kind = String(message.kind || "");
  const id = typeof message.id === "string" ? message.id : "";
  if (kind === "planet") {
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
  send(client, { type: "serverMessage", message: "teleport_unknown" });
}

function teleportPlayerToPortal(client, portal) {
  const player = client.player;
  if (!player) return;
  player.x = portal.targetX;
  player.y = portal.targetY + 3.2;
  player.moving = false;
  if (portal.kind === "planet_return" && player.ship) {
    const ship = player.ship;
    ship.worldX = portal.targetX;
    ship.worldY = portal.targetY;
    ship.boarded = true;
    ship.deckMode = (getShipLayout(ship).crewCapacity > 1);
    ship.stationRole = ship.deckMode ? null : "pilot";
    ship.stationId = ship.deckMode ? null : "pilot";
    if (ship.deckMode) {
      const layout = getShipLayout(ship);
      player.x = ship.worldX + (layout?.entry?.x || 0);
      player.y = ship.worldY + (layout?.entry?.y || 0);
    } else {
      player.x = ship.worldX;
      player.y = ship.worldY;
    }
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

  // Park the ship in orbit at the planet's space coords. Player will pop back
  // here when they step on the return portal on the surface.
  ship.boarded = false;
  ship.deckMode = false;
  ship.stationRole = null;
  ship.stationId = null;
  ship.docking = null;
  ship.worldX = planet.x;
  ship.worldY = planet.y;
  ship.dockX = planet.x;
  ship.dockY = planet.y;
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
  const ship = client.player?.ship;
  if (!ship?.boarded || !isPilotShipRole(ship.stationRole)) {
    send(client, { type: "serverMessage", message: "ship_dock_not_piloting" });
    return;
  }
  if (ship.docking) {
    return; // Already docking
  }
  const center = shipCenter(ship);
  const port = findNearestSciFiDockPort(center.x, center.y, SHIP_DOCK_PROMPT_RANGE);
  if (!port) {
    send(client, { type: "serverMessage", message: "ship_dock_not_nearby" });
    return;
  }
  ship.docking = { portId: port.id, startedAt: Date.now() };
  send(client, { type: "serverMessage", message: "ship_dock_engaged" });
  broadcastSnapshot();
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
  if (step.campId && mob.campId === step.campId) return true;
  if (step.faction && mob.faction === step.faction) return true;
  if (step.matchName && String(mob.name || "").toLowerCase().includes(String(step.matchName).toLowerCase())) return true;
  return false;
}

function recordMobDefeatForQuests(client, mob) {
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

  const ground = nearestGroundItem(client.player);
  if (!ground) {
    send(client, { type: "serverMessage", message: "nothing_nearby" });
    return;
  }

  pickupGroundItem(client, ground);
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

    for (const mob of mobs) {
      if (mob.dead) continue;
      if (Math.hypot(mob.x - z.gx, mob.y - z.gy) > z.radius) continue;

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
    }

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

  for (const mob of mobs) {
    if (mob.dead) {
      continue;
    }
    if (!isAttackTarget(client.player, mob, loadout)) {
      continue;
    }
    if (!hit || distance(client.player, mob) < distance(client.player, hit)) {
      hit = mob;
      hitKind = "mob";
    }
  }

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
let chunkGenScheduled = false;

function drainChunkGenQueue() {
  chunkGenScheduled = false;
  // Process up to 6 uncached chunks per drain so we don't starve I/O
  const batch = chunkGenQueue.splice(0, 6);
  for (const { client, cx, cy, key } of batch) {
    if (!client.socket || client.socket.destroyed) continue; // disconnected
    if (!chunkCache.has(key)) {
      chunkCache.set(key, generateChunk(cx, cy));
    }
    send(client, { type: "chunk", ...chunkCache.get(key) });
  }
  if (chunkGenQueue.length > 0) {
    chunkGenScheduled = true;
    setImmediate(drainChunkGenQueue);
  }
}

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
    } else {
      // First-time generation is expensive; defer off the tick path
      chunkGenQueue.push({ client, cx, cy, key });
      if (!chunkGenScheduled) {
        chunkGenScheduled = true;
        setImmediate(drainChunkGenQueue);
      }
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
  const margin = CHAT_VIEW_MARGIN_TILES;
  /** Widen NPC inclusion so crowds at the view edge still get position updates. */
  const npcMargin = margin + 18;
  const cellSize = CHUNK_SIZE;
  const mobCullBounds = computePlayerViewUnionBounds(CHAT_VIEW_MARGIN_TILES);

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
      ship: p.ship ? serializeShipForPlayer(p, p.ship) : null,
      ...(p.id === viewerId
        ? {
            ships: Array.isArray(p.ships) ? p.ships.map(serializeShip) : [],
            activeShipId: p.activeShipId || getOwnedActiveShip(p)?.id || null,
            quests: buildQuestSnapshot(p)
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
  const mobsAll = getMobSnapshot(mobCullBounds);

  const mobBuckets = new Map();
  for (const m of mobsAll) {
    snapshotAddToSpatialBucket(mobBuckets, m.x, m.y, m, cellSize);
  }

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
  let totalOnline = 0;
  for (const c of clients.values()) {
    if (c.player) {
      totalOnline += 1;
      snapshotAddToSpatialBucket(playerBuckets, c.player.x, c.player.y, c, cellSize);
    }
  }

  for (const client of clients.values()) {
    const view = client.player ? client.view || defaultViewForPlayer(client.player) : { x: 0, y: 0, halfW: 40, halfH: 25 };

    const minX = view.x - view.halfW - margin;
    const maxX = view.x + view.halfW + margin;
    const minY = view.y - view.halfH - margin;
    const maxY = view.y + view.halfH + margin;

    // Each viewer only sees entities sharing the same world (fantasy / sci-fi
    // sector / a specific planet surface). Worlds are otherwise completely
    // isolated — the only crossover is a portal teleport.
    const viewerWorld = client.player ? worldForPosition(client.player.x, client.player.y) : null;

    const playersVisible = [];
    const seenPid = new Set();

    if (client.player) {
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
          if (viewerWorld && worldForPosition(p.x, p.y) !== viewerWorld) {
            continue;
          }
          if (isInView(view, p.x, p.y)) {
            seenPid.add(p.id);
            playersVisible.push(playerSnapshot(p, client.player.id));
          }
        }
      });
    } else {
      snapshotForEachCellInWorldRect(minX, maxX, minY, maxY, cellSize, (key) => {
        const arr = playerBuckets.get(key);
        if (!arr) {
          return;
        }
        for (const cli of arr) {
          const p = cli.player;
          if (!p || seenPid.has(p.id)) {
            continue;
          }
          if (isInView(view, p.x, p.y)) {
            seenPid.add(p.id);
            playersVisible.push(playerSnapshot(p, null));
          }
        }
      });
    }

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
        if (viewerWorld && worldForPosition(n.x, n.y) !== viewerWorld) {
          continue;
        }
        if (isInView(view, n.x, n.y, npcMargin)) {
          seenNpc.add(n.id);
          npcs.push(n);
        }
      }
    });

    const mobs = [];
    const seenMob = new Set();
    snapshotForEachCellInWorldRect(minX, maxX, minY, maxY, cellSize, (key) => {
      const arr = mobBuckets.get(key);
      if (!arr) {
        return;
      }
      for (const m of arr) {
        if (seenMob.has(m.id)) {
          continue;
        }
        if (viewerWorld && worldForPosition(m.x, m.y) !== viewerWorld) {
          continue;
        }
        if (isInView(view, m.x, m.y)) {
          seenMob.add(m.id);
          mobs.push(m);
        }
      }
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

    send(client, {
      type: "snapshot",
      serverTime: Date.now(),
      worldTime: getWorldTimeSnapshot(),
      tick,
      population: totalOnline,
      players: playersVisible,
      npcs,
      mobs,
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
    { id: "pirate_eclipse", name: "Eclipse Raider", x: 1740, y: -180, size: 9, color: "#ff6b8a", level: 8 },
    { id: "pirate_blacksun", name: "Blacksun Corsair", x: 2240, y: 250, size: 10, color: "#c084fc", level: 10 },
    { id: "pirate_redclaw", name: "Redclaw Marauder", x: 1660, y: 350, size: 9, color: "#f97316", level: 9 },
    { id: "pirate_void", name: "Void Stalker", x: 2200, y: -420, size: 10, color: "#22d3ee", level: 11 },
    { id: "pirate_ironwake", name: "Ironwake Reaver", x: 2080, y: -255, size: 9, color: "#facc15", level: 9 },
    { id: "pirate_nullfang", name: "Nullfang Skiff", x: 1780, y: 265, size: 8, color: "#38bdf8", level: 7 }
  ];
  const out = [];
  for (const fleet of fleets) {
    const count = Math.max(1, fleet.size | 0);
    for (let i = 0; i < count; i += 1) {
      // Stagger fleet members in a small ring around the anchor point.
      const angle = (i / count) * Math.PI * 2 + (i * 0.37);
      const ringR = 4 + i * 1.4;
      const homeX = fleet.x + Math.cos(angle) * ringR;
      const homeY = fleet.y + Math.sin(angle) * ringR;
      const lvl = fleet.level + (i === 0 ? 1 : 0); // lead ship is a touch tougher
      out.push({
        id: `mob_${fleet.id}_${i + 1}`,
        name: fleet.name,
        level: lvl,
        homeX,
        homeY,
        primary: fleet.color,
        accent: "#0a0613",
        faction: fleet.id,
        isShipPirate: true,
        hullClass: i === 0 ? "interceptor" : "fighter",
        maxHp: 90 + lvl * 14,
        attackDamage: 6 + Math.floor(lvl * 0.9),
        roamRadius: 7 + (i % 2) * 3,
        speed: 1.9 + Math.random() * 0.4
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
  return [...fixedMobs, ...createWildernessMobs(), ...createRoamingMobs(), ...createCritterMobs(), ...createSciFiPirateMobs()].map((mob) => ({
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
    const count = Math.ceil(scaledCampEncounterSize(camp.size, camp) * 2.25);
    const tier = camp.tier || Math.max(1, Math.floor(Math.hypot(camp.x, camp.y) / 90));

    for (let i = 0; i < count; i += 1) {
      const enemy = type.enemies[i % type.enemies.length];
      const level = enemy.level + Math.max(0, tier - 1);
      const angle = hash2(camp.x, camp.y, 300 + i) * Math.PI * 2;
      const radius = 2 + hash2(camp.x, camp.y, 400 + i) * 5;
      const home = findOpenMobHome(
        camp.x + Math.cos(angle) * radius,
        camp.y + Math.sin(angle) * radius,
        camp.x,
        camp.y
      );
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
  return mobs.reduce((count, mob) => {
    if (mob.dead || !mob.isAssaultWave) return count;
    if (theme === "sci-fi") return count + (mob.isShipPirate ? 1 : 0);
    return count + (!mob.isShipPirate ? 1 : 0);
  }, 0);
}

function cleanupExpiredAssaultMobs(now) {
  for (let i = mobs.length - 1; i >= 0; i -= 1) {
    const mob = mobs[i];
    if (!mob?.isAssaultWave) continue;
    const expiredDead = mob.dead && now >= (mob.respawnAt || 0);
    const expiredLive = Number.isFinite(mob.spawnedAt) && now - mob.spawnedAt > 12 * 60 * 1000;
    const reachedTarget =
      !mob.dead &&
      Number.isFinite(mob.assaultTargetX) &&
      Number.isFinite(mob.assaultTargetY) &&
      Math.hypot(mob.x - mob.assaultTargetX, mob.y - mob.assaultTargetY) < 2.4;
    if (expiredDead || expiredLive || reachedTarget) {
      mobs.splice(i, 1);
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
    mobs.push(createRuntimeMob({
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
    }));
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
    mobs.push(createRuntimeMob({
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
    }));
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
      const count  = (tier >= 3 && hash2(gx, gy, 9450) > 0.46) ? 2 : 1;

      for (let i = 0; i < count; i++) {
        const ox = (hash2(gx, gy, 9500 + i) - 0.5) * (ROAM_CELL - 5);
        const oy = (hash2(gx, gy, 9600 + i) - 0.5) * (ROAM_CELL - 5);
        const hx = Math.round(cx + ox);
        const hy = Math.round(cy + oy);
        if (isTooCloseToAnyPortal(hx, hy)) continue;

        const eIdx  = Math.floor(hash2(gx, gy, 9700 + i) * type.enemies.length);
        const enemy = type.enemies[eIdx];
        const level = enemy.level + Math.max(0, tier - 1);
        const home  = findOpenMobHomeFromCandidates(hx, hy);

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

function updateMobs(dt, boundsArray) {
  const now = Date.now();

  for (const mob of mobs) {
    if (mob.dead) {
      if (mob.noRespawn) {
        continue;
      }
      if (now >= mob.respawnAt) {
        mob.dead = false;
        mob.hp = mob.maxHp;
        mob.x = mob.homeX;
        mob.y = mob.homeY;
      }
      continue;
    }

    if (!mob.forceSimulate && !mobShouldSimulateAny(mob, boundsArray)) {
      continue;
    }

    const targetPlayer = nearestAttackablePlayer(mob);
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
        continue;
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
      continue;
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
  }
}

function processGatekeeperArchers(now = Date.now()) {
  for (const guardId of GATEKEEPER_IDS) {
    const guard = getNpcById(guardId);
    if (!guard) continue;
    guard.x = guard.homeX;
    guard.y = guard.homeY;
    guard._targetX = guard.homeX;
    guard._targetY = guard.homeY;
    guard.moving = false;
    if (now - (guard._lastGateShotAt || 0) < GATEKEEPER_ATTACK_COOLDOWN_MS) {
      continue;
    }

    let target = null;
    let bestDist = Infinity;
    for (const mob of mobs) {
      if (mob.dead || mob.isCritter) continue;
      const townDist = Math.hypot(mob.x, mob.y);
      if (townDist > GATEKEEPER_NEAR_TOWN_RADIUS) continue;
      const d = Math.hypot(mob.x - guard.x, mob.y - guard.y);
      if (d <= GATEKEEPER_RANGE && d < bestDist) {
        bestDist = d;
        target = mob;
      }
    }
    if (!target) continue;

    const damage = Math.max(1, Math.round(GATEKEEPER_ARROW_DAMAGE + (Number(target.level) || 1) * 1.5));
    guard._lastGateShotAt = now;
    guard.facing = Math.atan2(target.y - guard.y, target.x - guard.x);
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

function processStationDefenses(now = Date.now()) {
  for (const defense of SCI_FI_DEFENSES) {
    const cooldown = STATION_DEFENSE_ATTACK_COOLDOWN_MS * (defense.kind === "orbital-cannon" ? 2.4 : 1);
    if (now - (stationDefenseLastShotAt.get(defense.id) || 0) < cooldown) {
      continue;
    }
    const range = Number(defense.range) || (defense.kind === "orbital-cannon" ? 138 : 96);
    let target = null;
    let bestDist = Infinity;
    for (const mob of mobs) {
      if (mob.dead || !mob.isShipPirate) continue;
      const stationDist = Math.hypot(mob.x - SCI_FI_STATION_CENTER.x, mob.y - SCI_FI_STATION_CENTER.y);
      if (stationDist > SCI_FI_SAFE_RADIUS + 130) continue;
      const d = Math.hypot(mob.x - defense.x, mob.y - defense.y);
      if (d <= range && d < bestDist) {
        bestDist = d;
        target = mob;
      }
    }
    if (!target) continue;

    stationDefenseLastShotAt.set(defense.id, now);
    const isCannon = defense.kind === "orbital-cannon";
    const damage = Math.max(1, Math.round((isCannon ? ORBITAL_CANNON_DAMAGE : STATION_TURRET_DAMAGE) + (Number(target.level) || 1) * 1.2));
    const facing = Math.atan2(target.y - defense.y, target.x - defense.x);
    target.hp = Math.max(0, target.hp - damage);
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
      targetKind: "mob",
      damage,
      targetHp: target.hp,
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
}

const PIRATE_AGGRO_RADIUS = 22;
const PIRATE_ATTACK_RANGE = 14;
const PIRATE_ATTACK_COOLDOWN_MS = 1400;
const PIRATE_ALERTED_MS = 30000;

function nearestAttackablePlayer(mob) {
  if (mob.isCritter) {
    return null;
  }
  let nearest = null;
  let nearestDistance = Infinity;
  const isPirate = Boolean(mob.isShipPirate);
  const aggroRange = isPirate ? PIRATE_AGGRO_RADIUS : MOB_AGGRO_RADIUS;
  const aggroSq = aggroRange * aggroRange;
  const now = Date.now();
  // Alerted pirates aggro from anywhere on the map for a window after taking damage.
  const alerted = isPirate && mob._alertedUntil && mob._alertedUntil > now;

  const mobWorld = worldForPosition(mob.x, mob.y);
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
    // Pirates never attack a player who is inside the station safe zone.
    if (isPirate && isInsideSciFiSafeZone(player.x, player.y)) {
      continue;
    }
    const ddx = mob.x - player.x;
    const ddy = mob.y - player.y;
    const distSq = ddx * ddx + ddy * ddy;
    if ((alerted || distSq <= aggroSq) && distSq < nearestDistance) {
      nearest = player;
      nearestDistance = distSq;
    }
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

function alertPirateFleet(triggerMob, alertRadius = 28) {
  if (!triggerMob?.faction) return;
  const until = Date.now() + PIRATE_ALERTED_MS;
  const r2 = alertRadius * alertRadius;
  for (const other of mobs) {
    if (other === triggerMob) continue;
    if (!other.isShipPirate || other.faction !== triggerMob.faction || other.dead) continue;
    const ddx = other.x - triggerMob.x;
    const ddy = other.y - triggerMob.y;
    if (ddx * ddx + ddy * ddy <= r2) {
      other._alertedUntil = until;
    }
  }
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
  for (const mob of mobs) {
    if (mob.dead) {
      continue;
    }
    if (
      viewBounds &&
      (mob.x < viewBounds.minX ||
        mob.x > viewBounds.maxX ||
        mob.y < viewBounds.minY ||
        mob.y > viewBounds.maxY)
    ) {
      continue;
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
      x: Number(mob.x.toFixed(3)),
      y: Number(mob.y.toFixed(3)),
      facing: Number(mob.facing.toFixed(3))
    });
  }
  return out;
}

function send(client, message) {
  if (!client.alive || client.socket.destroyed) {
    return;
  }

  client.socket.write(encodeFrame(Buffer.from(JSON.stringify(message)), 1));
}

function disconnect(client) {
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
    client.socket.end(encodeFrame(Buffer.alloc(0), 8));
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

function normalizeInput(keys = {}) {
  return {
    up: Boolean(keys.up),
    down: Boolean(keys.down),
    left: Boolean(keys.left),
    right: Boolean(keys.right),
    engage: Boolean(keys.engage),
    fire: Boolean(keys.fire),
    repair: Boolean(keys.repair)
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
  for (const mob of mobs) {
    if (mob.dead) continue;
    const dx = mob.x - player.x;
    const dy = mob.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (profile.radius) {
      if (dist > profile.radius) continue;
    } else {
      if (dist > profile.range || dist < 0.01) continue;
      const targetAngle = Math.atan2(dy, dx);
      const delta = Math.abs(normalizeAngle(targetAngle - player.facing));
      if (delta > profile.arc / 2) continue;
    }
    targets.push(mob);
  }

  targets.sort((a, b) => distance(player, a) - distance(player, b));
  return typeof profile.maxTargets === "number" ? targets.slice(0, profile.maxTargets) : targets;
}
