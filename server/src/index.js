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
  spawnPoint
} = require("./world");
const { updateNpcs, getNpcSnapshot, getNpcById, getTraderDefinitions } = require("./npcs");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8080);
const ACCOUNT_STORE_PATH = process.env.ACCOUNT_STORE_PATH || path.join(__dirname, "..", "data", "accounts.json");
const TICK_RATE = 30;
const SNAPSHOT_RATE = 20;
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
const PORTAL_COOLDOWN_MS = 1400;
const DOOR_COOLDOWN_MS = 600;
const HOME_COOLDOWN_MS = 2000;
const PLAYER_MAX_HP = 100;
const MOB_RESPAWN_MS = 300000; // 5 minutes
const INVENTORY_SIZE = 10;
const INTERACT_RADIUS = 1.8;
const SHOP_INTERACT_RADIUS = 1.75;
const STARTING_GOLD = 120;
const MAX_GROUND_ITEMS = 140;
const TRADER_INTERACT_RADIUS = 3.5;
const MOB_AGGRO_RADIUS = 7.5;
const MOB_ATTACK_RADIUS = 1.15;
const MOB_ATTACK_COOLDOWN_MS = 1300;
const MOB_ATTACK_DAMAGE = 13;
const BOSS_ATTACK_DAMAGE = 26;
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
    range: 8.5,
    arc: Math.PI * 0.36,
    damage: 16
  },
  mage: {
    weapon: "staff",
    kind: "projectile",
    projectileKind: "fireball",
    cooldownMs: 780,
    range: 7.2,
    arc: Math.PI * 0.48,
    damage: 24
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
  legendary: 0.62
});
const MOB_TYPES = Object.freeze({
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
  }
});
const WILDERNESS_BOSSES = Object.freeze([
  { id: "lone_stag",   x: -320, y:   35, biome: "forest", name: "Old Rootback" },
  { id: "glass_dune",  x:  450, y:  385, biome: "desert", name: "Glasshide" },
  { id: "white_pine",  x: -450, y: -365, biome: "frost",  name: "Whitepine Warden" },
  { id: "red_crag",    x:  425, y: -390, biome: "ember",  name: "Red Crag" },
]);

const CRITTER_CELL = 26;

const CRITTERS_BY_BIOME = Object.freeze({
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
  "#ff7675", "#00b894", "#e84393", "#0984e3", "#f39c12"
];

let nextClientId = 1;
let nextSpawnIndex = 0;
let nextItemId = 1;
let nextGroundItemId = 1;
let tick = 0;

/** Rolling wall-clock intervals between simulate() runs (for debug pong). */
let lastSimulateWallMs = Date.now();
const simulateWallIntervals = [];
const SIM_WALL_SAMPLES_MAX = 60;

const ownedBuildings = new Map(); // key: "x,y" → { ownerId, ownerName, price }
const FOR_SALE_BUILDINGS = BUILDING_LIST.filter(b => b.forSale);

const accountStore = loadAccountStore();
seedModAccounts();
const clients = new Map();
const chunkCache = new Map();
const chatHistory = [];
const itemDatabase = createItemDatabase();
const chests = createChests();
const groundItems = [];
const mobs = createMobs();
const traderStocks = new Map();
for (const def of getTraderDefinitions()) {
  traderStocks.set(def.id, createTraderStock(def.id, def.homeX * 100 + def.homeY));
}

syncNextItemIdFromAccounts();

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
  process.exit(0);
});

process.on("SIGINT", () => {
  clearSimulateTimer();
  saveAllActiveCharacters();
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

function serializePlayer(player) {
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
    x: Number(player.x.toFixed(3)),
    y: Number(player.y.toFixed(3)),
    facing: Number(player.facing.toFixed(3))
  };
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

function computeNpcActivationBounds() {
  return computePlayerViewUnionBounds(CHAT_VIEW_MARGIN_TILES);
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

function simulate() {
  recordSimulateWallInterval();
  tick += 1;
  const dt = 1 / TICK_RATE;

  for (const client of clients.values()) {
    if (!client.player) {
      continue;
    }

    const input = client.input;
    let dx = Number(input.right) - Number(input.left);
    let dy = Number(input.down) - Number(input.up);
    const length = Math.hypot(dx, dy);

    if (length > 0) {
      dx /= length;
      dy /= length;

      const speed = getPlayerSpeed(client.player);
      const nextX = client.player.x + dx * speed * dt;
      const nextY = client.player.y + dy * speed * dt;

      if (!isBlockedCircle(nextX, client.player.y) && !isDoorLockedForPlayer(nextX, client.player.y, client.player.id)) {
        client.player.x = nextX;
      }
      if (!isBlockedCircle(client.player.x, nextY) && !isDoorLockedForPlayer(client.player.x, nextY, client.player.id)) {
        client.player.y = nextY;
      }

      client.player.facing = Math.atan2(dy, dx);
      client.player.moving = true;
    } else {
      client.player.moving = false;
    }

    handleDoorTravel(client);
    handlePortalTravel(client);
  }

  updateNpcs(dt, pushChat, computeNpcActivationBounds());
  updateMobs(dt, computePlayerViewUnionBounds(CHAT_VIEW_MARGIN_TILES + MOB_ACTIVITY_MARGIN_TILES));

  if (tick % Math.round(TICK_RATE / SNAPSHOT_RATE) === 0) {
    broadcastSnapshot();
  }
}

function handleDoorTravel(client) {
  // Walk-in architecture: players walk through doors naturally, no teleportation
}

function isDoorLockedForPlayer(x, y, playerId) {
  const r = 0.28;
  for (let tx = Math.floor(x - r); tx <= Math.ceil(x + r); tx++) {
    for (let ty = Math.floor(y - r); ty <= Math.ceil(y + r); ty++) {
      for (const b of FOR_SALE_BUILDINGS) {
        const doorX = b.x + Math.floor(b.w / 2);
        if (tx === doorX && (ty === b.y || ty === b.y + b.h - 1)) {
          const key = `${b.x},${b.y}`;
          const ownership = ownedBuildings.get(key);
          if (!ownership) return true; // unowned for-sale building = locked
          return ownership.ownerId !== playerId;
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
  client.player.y = portal.targetY + 1.2;
  client.player.moving = false;
  client.input = normalizeInput();

  send(client, {
    type: "teleport",
    portalId: portal.id,
    name: portal.name,
    color: portal.color,
    x: client.player.x,
    y: client.player.y
  });
  streamChunks(client, nearbyChunks(client.player.x, client.player.y, 3));
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

  if (message.type === "attack") {
    handleAttack(client, message);
    return;
  }

  if (message.type === "home") {
    handleHomeTeleport(client);
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
    const { buildingX, buildingY } = message;
    const building = FOR_SALE_BUILDINGS.find(b => b.x === buildingX && b.y === buildingY);
    if (!building) return;
    const key = `${building.x},${building.y}`;
    if (ownedBuildings.has(key)) return; // already owned
    const price = getBuildingPrice(building);
    if (!client.player || client.player.gold < price) return;
    // Check proximity
    if (Math.hypot(client.player.x - (building.x + building.w/2), client.player.y - (building.y + building.h - 1)) > 4) return;
    client.player.gold -= price;
    ownedBuildings.set(key, { ownerId: client.player.id, ownerName: client.player.name, price });
    // Broadcast ownership update to all clients
    for (const c of clients.values()) send(c, { type: "buildingBought", buildingX: building.x, buildingY: building.y, ownerName: client.player.name });
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
    inventory: sanitizeInventory(savedCharacter?.inventory),
    equipment: sanitizeEquipment(savedCharacter?.equipment) || createStarterEquipment(classId, {
      torsoStyle: baseTorsoStyle,
      weaponStyle: baseWeaponStyle,
      torsoColor,
      weaponColor
    }),
    talentPoints: initialTalentPoints(savedCharacter, isMod),
    talents: savedCharacter?.talents || {},
    abilityBar: Array.isArray(savedCharacter?.abilityBar)
      ? savedCharacter.abilityBar.slice(0, 5).map(v => (typeof v === "string" ? v : null))
      : [null, null, null, null, null],
    x: spawn.x,
    y: spawn.y,
    facing: 0,
    moving: false,
    isMod
  };

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

  // If client supplied a facing or target coords, prefer those (validate)
  if (typeof message.facing === "number" && Number.isFinite(message.facing)) {
    client.player.facing = normalizeAngle(Number(message.facing));
  } else if (typeof message.targetX === "number" && typeof message.targetY === "number") {
    const fx = Number(message.targetX) - client.player.x;
    const fy = Number(message.targetY) - client.player.y;
    client.player.facing = Math.atan2(fy, fx);
  }

  const target = findAttackTarget(client, loadout);

  const event = {
    type: "combat",
    kind: loadout.kind,
    weapon: loadout.weapon,
    projectileKind: loadout.projectileKind,
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

    if (hitKind === "mob" && hit.hp <= 0) {
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

  const spawn = spawnPoint(nextSpawnIndex++);
  client.lastHomeAt = now;
  client.player.x = spawn.x;
  client.player.y = spawn.y;
  client.player.moving = false;
  client.input = normalizeInput();

  send(client, {
    type: "teleport",
    portalId: "home",
    name: "Spawn",
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

function handleInteract(client, message = {}) {
  if (!client.player) {
    return;
  }

  const shop = nearestShopFixture(client.player, message);
  if (shop) {
    sendShopWindow(client, shop);
    return;
  }

  const chest = nearestClosedChest(client.player);
  if (chest) {
    if (!addItemToInventory(client.player, cloneItem(chest.item))) {
      send(client, { type: "serverMessage", message: "inventory_full" });
      return;
    }
    chest.opened = true;
    send(client, { type: "serverMessage", message: "chest_looted", itemName: chest.item.name });
    broadcastSnapshot();
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
  return 18 + mob.level * 8 + Math.floor(mob.maxHp / 8);
}

function goldForMob(mob) {
  if (mob.isCritter) return 1;
  if (mob.isBoss) return 25 + mob.level * 5;
  return 3 + mob.level * 2;
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

function getActiveLoadout(player) {
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

  if (weapon.weaponKind === "staff") {
    return { ...CLASS_LOADOUTS.mage, damage: 14 };
  }

  if (weapon.weaponKind === "bow") {
    return { ...CLASS_LOADOUTS.ranger, damage: 10 };
  }

  if (weapon.weaponKind === "sword") {
    return { ...CLASS_LOADOUTS.knight, damage: 13 };
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
  pushChat({
    kind: client.player.isMod ? "mod" : "player",
    fromId: client.player.id,
    name: client.player.name,
    text,
    x: client.player.x,
    y: client.player.y
  });
}

function pushChat({ kind, fromId = null, name, text, x = null, y = null }) {
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

    if (!chunkCache.has(key)) {
      chunkCache.set(key, generateChunk(cx, cy));
    }

    send(client, {
      type: "chunk",
      ...chunkCache.get(key)
    });
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
  const cellSize = CHUNK_SIZE;
  const mobCullBounds = computePlayerViewUnionBounds(CHAT_VIEW_MARGIN_TILES);

  // Helper: is a point inside a client's view (with optional margin)
  function isInView(view, x, y) {
    return (
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      x >= view.x - view.halfW - margin &&
      x <= view.x + view.halfW + margin &&
      y >= view.y - view.halfH - margin &&
      y <= view.y + view.halfH + margin
    );
  }

  const playerSnapCache = new Map();

  // Build a compact representation for a player entity (cached per snapshot pass)
  function playerSnapshot(p) {
    let snap = playerSnapCache.get(p.id);
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
      talentPoints: p.talentPoints || 0,
      talents: p.talents || {},
      abilityBar: p.abilityBar || [null, null, null, null, null],
      moveSpeed: Number(getPlayerSpeed(p).toFixed(2)),
      x: Number(p.x.toFixed(3)),
      y: Number(p.y.toFixed(3)),
      facing: Number(p.facing.toFixed(3)),
      moving: p.moving,
      isMod: p.isMod || false
    };
    playerSnapCache.set(p.id, snap);
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

    const playersVisible = [];
    const seenPid = new Set();

    if (client.player) {
      playersVisible.push(playerSnapshot(client.player));
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
          if (isInView(view, p.x, p.y)) {
            seenPid.add(p.id);
            playersVisible.push(playerSnapshot(p));
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
            playersVisible.push(playerSnapshot(p));
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
        if (isInView(view, n.x, n.y)) {
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

    send(client, {
      type: "snapshot",
      serverTime: Date.now(),
      tick,
      population: totalOnline,
      players: playersVisible,
      npcs,
      mobs,
      chests: visibleChests,
      groundItems: visibleGround
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
  const types = ["weapon", "armor", "ring", "potion"];
  const rarities = [
    { id: "common",    label: "Common",    multiplier: 1 },
    { id: "uncommon",  label: "Uncommon",  multiplier: 1.35 },
    { id: "rare",      label: "Rare",      multiplier: 1.8 },
    { id: "epic",      label: "Epic",      multiplier: 2.35 },
    { id: "legendary", label: "Legendary", multiplier: 3.5 },
  ];
  const result = [];

  for (let i = 0; i < 120; i += 1) {
    const type = types[i % types.length];
    const r = hash2(i, 11, 700);
    const rarityIdx = r > 0.97 ? 4 : r > 0.85 ? 3 : r > 0.65 ? 2 : r > 0.35 ? 1 : 0;
    const rarity = rarities[rarityIdx];
    result.push(createItemTemplate(type, rarity, i));
  }

  return result;
}

function createItemTemplate(type, rarity, index) {
  if (type === "weapon") {
    const weaponKinds = ["Bow", "Staff", "Sword"];
    const visualStyles = ["classic", "heavy", "ornate"];
    const kind = weaponKinds[index % weaponKinds.length];
    const weaponKind = kind.toLowerCase();
    const damage = Math.round((4 + hash2(index, 2, 711) * 8) * rarity.multiplier);
    const strength = hash2(index, 3, 712) > 0.68 ? Math.ceil(rarity.multiplier) : 0;
    const itemColor = ITEM_COLORS[index % ITEM_COLORS.length];
    const weaponVisualStyle = rarity.id === "legendary" ? "legendary" : visualStyles[index % visualStyles.length];
    return {
      templateId: `weapon_${index}`,
      type,
      name: rarity.id === "legendary" ? `⚜ ${kind} of Legend` : `${rarity.label} ${kind}`,
      icon: weaponKind,
      rarity: rarity.id,
      color: itemColor,
      weaponKind,
      visual: {
        weaponStyle: weaponVisualStyle,
        weaponColor: itemColor
      },
      value: Math.round((28 + damage * 4 + strength * 12) * rarity.multiplier),
      stats: { damage, strength }
    };
  }

  if (type === "ring") {
    const ringKinds = ["Ring of Vigor", "Ring of Iron", "Ring of Haste", "Ring of Force"];
    const kind = ringKinds[index % ringKinds.length];
    const statKey = ["health", "armour", "speed", "strength"][index % 4];
    const base = statKey === "speed" ? 0.18 : statKey === "health" ? 8 : 1;
    const value = statKey === "speed"
      ? Number((base * rarity.multiplier).toFixed(2))
      : Math.max(1, Math.round(base * rarity.multiplier));
    return {
      templateId: `ring_${index}`,
      type,
      name: rarity.id === "legendary" ? `⚜ ${kind} of Legend` : `${rarity.label} ${kind}`,
      icon: "ring",
      rarity: rarity.id,
      color: ITEM_COLORS[index % ITEM_COLORS.length],
      value: Math.round((32 + value * (statKey === "health" ? 2 : 18)) * rarity.multiplier),
      stats: { [statKey]: value }
    };
  }

  if (type === "armor") {
    const armorKinds = ["Jerkin", "Chestplate", "Robe"];
    const visualStyles = ["tunic", "armor", "robe"];
    const kind = armorKinds[index % armorKinds.length];
    const health = Math.round((8 + hash2(index, 4, 713) * 22) * rarity.multiplier);
    const armour = Math.max(1, Math.round((1 + hash2(index, 5, 714) * 3) * rarity.multiplier));
    const itemColor = ITEM_COLORS[index % ITEM_COLORS.length];
    const armorVisualStyle = rarity.id === "legendary" ? "legendary" : visualStyles[index % visualStyles.length];
    return {
      templateId: `armor_${index}`,
      type,
      name: rarity.id === "legendary" ? `⚜ ${kind} of Legend` : `${rarity.label} ${kind}`,
      icon: "armor",
      rarity: rarity.id,
      color: itemColor,
      visual: {
        torsoStyle: armorVisualStyle,
        torsoColor: itemColor
      },
      value: Math.round((24 + health * 1.5 + armour * 14) * rarity.multiplier),
      stats: { health, armour }
    };
  }

  const healing = Math.round((30 + hash2(index, 6, 715) * 45) * rarity.multiplier);
  return {
    templateId: `potion_${index}`,
    type,
    name: `${rarity.label} Health Potion`,
    icon: "potion",
    rarity: rarity.id,
    color: "#f26d6d",
    value: Math.round((12 + healing * 0.8) * rarity.multiplier),
    stats: { healing }
  };
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
  const highQuality = roll > 0.97 ? "legendary" : roll > 0.92 ? "epic" : roll > 0.74 ? "rare" : roll > 0.46 ? "uncommon" : null;
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
    visual: { ...(template.visual || {}) }
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
    legendary: 3.5
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

function addGroundItem(item, x, y) {
  groundItems.push({
    id: `ground_${nextGroundItemId++}`,
    item,
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3))
  });
  while (groundItems.length > MAX_GROUND_ITEMS) {
    groundItems.shift();
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

function createMobs() {
  const fixedMobs = [
    { id: "mob_slime_oasis_1", name: "Oasis Slime", level: 5, homeX: 137, homeY: 113, primary: "#56b88f", accent: "#c7f5b0", maxHp: 74, attackDamage: 13 },
    { id: "mob_slime_oasis_2", name: "Oasis Slime", level: 5, homeX: 163, homeY: 126, primary: "#56b88f", accent: "#c7f5b0", maxHp: 74, attackDamage: 13 },
    { id: "mob_wisp_frost_1", name: "Frost Wisp", level: 7, homeX: -139, homeY: -113, primary: "#88d8ff", accent: "#f0fbff", maxHp: 78, attackDamage: 16 },
    { id: "mob_wisp_frost_2", name: "Frost Wisp", level: 7, homeX: -162, homeY: -132, primary: "#88d8ff", accent: "#f0fbff", maxHp: 78, attackDamage: 16 },
    { id: "mob_imp_ember_1", name: "Ember Imp", level: 9, homeX: 134, homeY: -121, primary: "#d85b35", accent: "#ffd06a", maxHp: 86, attackDamage: 19 },
    { id: "mob_imp_ember_2", name: "Ember Imp", level: 9, homeX: 158, homeY: -142, primary: "#d85b35", accent: "#ffd06a", maxHp: 86, attackDamage: 19 },
  ];
  return [...fixedMobs, ...createWildernessMobs(), ...createRoamingMobs(), ...createCritterMobs()].map((mob) => ({
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
    const type = MOB_TYPES[biome] || MOB_TYPES.forest;
    const count = camp.size;
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
        maxHp: enemy.hp + level * 7 + Math.floor(hash2(camp.x, camp.y, 500 + i) * 14),
        attackDamage: enemy.damage + Math.floor(level * 1.15),
        roamRadius: camp.size >= 6 ? 6.5 : 4.8,
        speed: enemy.speed + hash2(camp.x, camp.y, 600 + i) * 0.18
      });
    }

    if (camp.boss) {
      const bossHome = findOpenMobHome(camp.x, camp.y, camp.x, camp.y);
      const level = type.bossLevel + tier;
      mobs.push({
        id: `mob_boss_${camp.id}`,
        name: type.bossName,
        level,
        homeX: bossHome.x,
        homeY: bossHome.y,
        primary: type.bossPrimary,
        accent: type.bossAccent,
        campId: camp.id,
        biome,
        isBoss: true,
        maxHp: 150 + level * 18,
        attackDamage: 16 + level * 2,
        roamRadius: 7,
        speed: 1.25
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

function createRoamingMobs() {
  const ROAM_CELL = 20;
  const list = [];
  let seq = 0;

  const gMin = Math.floor(-720 / ROAM_CELL);
  const gMax = Math.ceil(720 / ROAM_CELL);

  for (let gx = gMin; gx <= gMax; gx++) {
    for (let gy = gMin; gy <= gMax; gy++) {
      const roll = hash2(gx, gy, 9400);
      if (roll > 0.42) continue;

      const cx = gx * ROAM_CELL + ROAM_CELL * 0.5;
      const cy = gy * ROAM_CELL + ROAM_CELL * 0.5;

      // Exclude safe zones
      if (Math.hypot(cx, cy)            < 35) continue;  // spawn hub
      if (Math.hypot(cx - 600, cy - 490) < 68) continue; // oasis town
      if (Math.hypot(cx + 600, cy + 490) < 68) continue; // frost town
      if (Math.hypot(cx - 580, cy + 530) < 68) continue; // ember town

      const biome  = getBiome(Math.round(cx), Math.round(cy));
      const type   = MOB_TYPES[biome] || MOB_TYPES.forest;
      const dist   = Math.hypot(cx, cy);
      const tier   = Math.min(6, Math.max(1, Math.floor(dist / 100)));
      const count  = (tier >= 3 && hash2(gx, gy, 9450) > 0.62) ? 2 : 1;

      for (let i = 0; i < count; i++) {
        const ox = (hash2(gx, gy, 9500 + i) - 0.5) * (ROAM_CELL - 5);
        const oy = (hash2(gx, gy, 9600 + i) - 0.5) * (ROAM_CELL - 5);
        const hx = Math.round(cx + ox);
        const hy = Math.round(cy + oy);

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

      if (Math.hypot(baseX - 0, baseY - 4) < 78) continue;
      if (Math.hypot(baseX - 600, baseY - 490) < 52) continue;
      if (Math.hypot(baseX + 600, baseY + 490) < 52) continue;
      if (Math.hypot(baseX - 580, baseY + 530) < 52) continue;

      for (let i = 0; i < n; i += 1) {
        const ox = (hash2(gx, gy, 8801 + i) - 0.5) * (CRITTER_CELL - 7);
        const oy = (hash2(gx, gy, 8901 + i) - 0.5) * (CRITTER_CELL - 7);
        const bx = Math.round(baseX + ox);
        const by = Math.round(baseY + oy);
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

function updateMobs(dt, activityBounds) {
  const now = Date.now();

  for (const mob of mobs) {
    if (mob.dead) {
      if (now >= mob.respawnAt) {
        mob.dead = false;
        mob.hp = mob.maxHp;
        mob.x = mob.homeX;
        mob.y = mob.homeY;
      }
      continue;
    }

    if (!mobShouldSimulate(mob, activityBounds)) {
      continue;
    }

    const targetPlayer = nearestAttackablePlayer(mob);
    if (targetPlayer) {
      mob._targetX = targetPlayer.x;
      mob._targetY = targetPlayer.y;
      const angleToPlayer = Math.atan2(targetPlayer.y - mob.y, targetPlayer.x - mob.x);
      mob.facing = angleToPlayer;
      if (distance(mob, targetPlayer) <= MOB_ATTACK_RADIUS) {
        attackPlayerWithMob(mob, targetPlayer, now);
        continue;
      }
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

function nearestAttackablePlayer(mob) {
  if (mob.isCritter) {
    return null;
  }
  let nearest = null;
  let nearestDistance = Infinity;

  for (const client of clients.values()) {
    const player = client.player;
    if (!player || player.hp <= 0 || !canAttackAt(player.x, player.y)) {
      continue;
    }
    const dist = distance(mob, player);
    if (dist <= MOB_AGGRO_RADIUS && dist < nearestDistance) {
      nearest = player;
      nearestDistance = dist;
    }
  }

  return nearest;
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
      isBoss: Boolean(mob.isBoss),
      isCritter: Boolean(mob.isCritter),
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
    right: Boolean(keys.right)
  };
}

function normalizeView(view = {}, player = null) {
  const fallback = player ? defaultViewForPlayer(player) : { x: 0, y: 0, halfW: 22, halfH: 14 };
  const x = Number(view.x);
  const y = Number(view.y);
  const halfW = Number(view.halfW);
  const halfH = Number(view.halfH);
  return {
    x: Number.isFinite(x) ? x : fallback.x,
    y: Number.isFinite(y) ? y : fallback.y,
    halfW: Number.isFinite(halfW) ? Math.max(6, Math.min(80, halfW)) : fallback.halfW,
    halfH: Number.isFinite(halfH) ? Math.max(4, Math.min(45, halfH)) : fallback.halfH
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
    visual: typeof item.visual === "object" && item.visual ? { ...item.visual } : {}
  };
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
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

function handleCastSpell(client, spellId) {
  const p = client.player;
  const now = Date.now();
  const cdKey = `${p.id}:${spellId}`;
  const cd = SPELL_COOLDOWN_MS[spellId] || 3000;
  if ((SPELL_COOLDOWNS.get(cdKey) || 0) + cd > now) return;
  SPELL_COOLDOWNS.set(cdKey, now);

  if (spellId === "healing_aura" || spellId === "lay_on_hands") {
    const heal = spellId === "lay_on_hands" ? Math.round(p.maxHp * 0.5) : Math.round(p.maxHp * 0.05);
    p.hp = Math.min(p.maxHp, p.hp + heal);
  }
  if (spellId === "battle_cry" || spellId === "evasion" || spellId === "camouflage") {
    p._buffExpires = now + 5000;
    p._buff = spellId;
  }
  for (const c of clients.values()) {
    send(c, { type: "spellCast", casterId: p.id, spellId, x: p.x, y: p.y, facing: p.facing });
  }
}
