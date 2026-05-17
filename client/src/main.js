const isMobile = navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
if (isMobile) document.body.classList.add("mobile");

const canvas = document.querySelector("#game");
let ctx = canvas.getContext("2d", {
  alpha: false,
  desynchronized: true,
  powerPreference: "high-performance",
  willReadFrequently: false
});
const bootPanel = document.querySelector("#boot");
const statusEl = document.querySelector("#status");
const menu = document.querySelector("#menu");
const menuServerUrlInput = document.querySelector("#menuServerUrlInput");
const resumeButton = document.querySelector("#resumeButton");
const debugToggleButton = document.querySelector("#debugToggleButton");
const serverForm = document.querySelector("#serverForm");
const accountForm = document.querySelector("#accountForm");
const usernameInput = document.querySelector("#usernameInput");
const passwordInput = document.querySelector("#passwordInput");
const loginButton = document.querySelector("#loginButton");
const createAccountButton = document.querySelector("#createAccountButton");
const form = document.querySelector("#characterForm");
const playButton = document.querySelector("#playButton");
const nameInput = document.querySelector("#nameInput");
const menuServerLabel = document.querySelector("#menuServerLabel");
const menuPopulation = document.querySelector("#menuPopulation");
const menuPosition = document.querySelector("#menuPosition");
const menuTime = document.querySelector("#menuTime");
const menuTimeLabel = document.querySelector("#menuTimeLabel");
const menuTimeClock = document.querySelector("#menuTimeClock");
const modTimeControls = document.querySelector("#modTimeControls");
const modTimeHourInput = document.querySelector("#modTimeHourInput");
const modTimeApply = document.querySelector("#modTimeApply");
const logoutButton = document.querySelector("#logoutButton");
const progression = document.querySelector("#progression");
const progressionToggle = document.querySelector("#progressionToggle");
const hpFill = document.querySelector("#hpFill");
const hpText = document.querySelector("#hpText");
const levelText = document.querySelector("#levelText");
const statPointsEl = document.querySelector("#statPoints");
const xpFill = document.querySelector("#xpFill");
const xpText = document.querySelector("#xpText");
const equipmentButton = document.querySelector("#equipmentButton");
const bagsButton = document.querySelector("#bagsButton");
const questsButton = document.querySelector("#questsButton");
const equipmentPanel = document.querySelector("#equipmentPanel");
const bagsPanel = document.querySelector("#bagsPanel");
const questPanel = document.querySelector("#questPanel");
const equipmentClose = document.querySelector("#equipmentClose");
const bagsClose = document.querySelector("#bagsClose");
const questClose = document.querySelector("#questClose");
const questList = document.querySelector("#questList");
const equipSlotsLeft = document.querySelector("#equipSlotsLeft");
const equipSlotsRight = document.querySelector("#equipSlotsRight");
const charPreviewCanvas = document.querySelector("#charPreview");
const charStatsEl = document.querySelector("#charStats");
const charTalentMiniEl = document.querySelector("#charTalentMini");
const charTalentPointsMiniEl = document.querySelector("#charTalentPointsMini");
const talentPanel = document.querySelector("#talentPanel");
const talentClose = document.querySelector("#talentClose");
const talentPointsText = document.querySelector("#talentPointsText");
const talentTreeEl = document.querySelector("#talentTree");
const inventorySlots = document.querySelector("#inventorySlots");
const houseChestSection = document.querySelector("#houseChestSection");
const houseChestSlotsEl = document.querySelector("#houseChestSlots");
const abilityBar = document.querySelector("#abilityBar");
const abilityBarToggle = document.querySelector("#abilityBarToggle");
const abilitySlotsEl = document.querySelector("#abilitySlots");
const potionSlotEl = document.querySelector("#potionSlot");
const potionCountEl = document.querySelector("#potionCount");
const potionKeyEl = potionSlotEl?.querySelector(".potion-key");
const potionSlotIconCanvas = document.querySelector("#potionSlotIcon");
const homeTeleportSlotEl = document.querySelector("#homeTeleportSlot");
const homeTeleportIconCanvas = document.querySelector("#homeTeleportIcon");
const nearbyLoot = document.querySelector("#nearbyLoot");
const interactButton = document.querySelector("#interactButton");
const goldText = document.querySelector("#goldText");
const shopPanel = document.querySelector("#shopPanel");
const shopTitle = document.querySelector("#shopTitle");
const shopClose = document.querySelector("#shopClose");
const shopGold = document.querySelector("#shopGold");
const shopBuyList = document.querySelector("#shopBuyList");
const shopSellList = document.querySelector("#shopSellList");
const shipTerminalPanel = document.querySelector("#shipTerminalPanel");
const shipTerminalTitle = document.querySelector("#shipTerminalTitle");
const shipTerminalClose = document.querySelector("#shipTerminalClose");
const shipTerminalPort = document.querySelector("#shipTerminalPort");
const shipTerminalList = document.querySelector("#shipTerminalList");
const chat = document.querySelector("#chat");
const chatMessages = document.querySelector("#chatMessages");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const chatToggle = document.querySelector("#chatToggle");
const chatIconBtn = document.querySelector("#chatIconBtn");
const mobileControls = document.querySelector("#mobileControls");
const joystickCanvas = document.querySelector("#joystick");
const traderPanel = document.querySelector("#traderPanel");
const traderTitle = document.querySelector("#traderTitle");
const traderStock = document.querySelector("#traderStock");
const traderSellSlots = document.querySelector("#traderSellSlots");
const traderClose = document.querySelector("#traderClose");
const buyHousePanel = document.querySelector("#buyHousePanel");
const buyHouseTitle = document.querySelector("#buyHouseTitle");
const buyHouseClose = document.querySelector("#buyHouseClose");
const buyHousePriceLine = document.querySelector("#buyHousePriceLine");
const buyHouseGoldLine = document.querySelector("#buyHouseGoldLine");
const buyHouseConfirm = document.querySelector("#buyHouseConfirm");
const buyHouseCancel = document.querySelector("#buyHouseCancel");
const companionOfferPanel = document.querySelector("#companionOfferPanel");
const companionOfferTitle = document.querySelector("#companionOfferTitle");
const companionOfferLine = document.querySelector("#companionOfferLine");
const companionOfferCost = document.querySelector("#companionOfferCost");
const companionOfferAccept = document.querySelector("#companionOfferAccept");
const companionOfferDecline = document.querySelector("#companionOfferDecline");
const companionOfferClose = document.querySelector("#companionOfferClose");
const safeZoneIndicator = document.querySelector("#safeZoneIndicator");
const partyPanel = document.querySelector("#partyPanel");
const partyMembersEl = document.querySelector("#partyMembers");
const partyPanelMin = document.querySelector("#partyPanelMin");
const playerContextMenu = document.querySelector("#playerContextMenu");
const teleportMenuPanel = document.querySelector("#teleportMenuPanel");
const teleportMenuTitle = document.querySelector("#teleportMenuTitle");
const teleportMenuList = document.querySelector("#teleportMenuList");
const teleportMenuCloseBtn = document.querySelector("#teleportMenuClose");
const teleportHotbarBtn = document.querySelector("#teleportHotbarBtn");
const questOfferPanel = document.querySelector("#questOfferPanel");
const questOfferTitle = document.querySelector("#questOfferTitle");
const questOfferGiver = document.querySelector("#questOfferGiver");
const questOfferSummary = document.querySelector("#questOfferSummary");
const questOfferSteps = document.querySelector("#questOfferSteps");
const questOfferRewards = document.querySelector("#questOfferRewards");
const questOfferAcceptBtn = document.querySelector("#questOfferAccept");
const questOfferDeclineBtn = document.querySelector("#questOfferDecline");
const questOfferCloseBtn = document.querySelector("#questOfferClose");
const npcContextMenu = document.querySelector("#npcContextMenu");
const npcContextMenuName = document.querySelector("#npcContextMenuName");
const npcContextMenuButtons = document.querySelector("#npcContextMenuButtons");
const friendsWindow = document.querySelector("#friendsWindow");
const friendsWindowList = document.querySelector("#friendsWindowList");
const friendsWindowClose = document.querySelector("#friendsWindowClose");
const tradePanel = document.querySelector("#tradePanel");
const tradeTitle = document.querySelector("#tradeTitle");
const tradeClose = document.querySelector("#tradeClose");
const tradeYourSlots = document.querySelector("#tradeYourSlots");
const tradeTheirSlots = document.querySelector("#tradeTheirSlots");
const tradeYourGold = document.querySelector("#tradeYourGold");
const tradeTheirGold = document.querySelector("#tradeTheirGold");
const tradeYourLock = document.querySelector("#tradeYourLock");
const tradeTheirReady = document.querySelector("#tradeTheirReady");
const tradeConfirmBtn = document.querySelector("#tradeConfirmBtn");
const tradeCancelBtn = document.querySelector("#tradeCancelBtn");
const chatFriendsPane = document.querySelector("#chatFriendsPane");
let safeZoneTooltipPinTimer = null;

const TILE_SIZE = 32;
const SCI_FI_THEME = "sci-fi";
/** Hub landmark tree trunk — same origin as server/src/world.js START_SPAWN. */
const START_SPAWN = Object.freeze({ x: 0, y: 0 });

const CHAT_COMMANDS = [
  { cmd: "/sci",    desc: "Teleport to the orbital square" },
  { cmd: "/stuck",  desc: "Teleport to spawn if stuck" },
  { cmd: "/home",   desc: "Teleport to your house" },
  { cmd: "/dance",  kind: "dance", desc: "Do a little dance" },
  { cmd: "/wave",   kind: "wave",  desc: "Wave to nearby players" },
  { cmd: "/laugh",  kind: "laugh", desc: "Laugh out loud" },
  { cmd: "/cry",    kind: "cry",   desc: "Cry dramatically" },
  { cmd: "/cheer",  kind: "cheer", desc: "Cheer!" },
  { cmd: "/bow",    kind: "bow",   desc: "Bow respectfully" },
];

let cmdPaletteActiveIdx = -1;
let cmdPaletteFiltered = [];

function updateCmdPalette() {
  const palette = document.getElementById("cmdPalette");
  if (!palette) return;
  const val = chatInput?.value || "";
  if (!val.startsWith("/")) {
    palette.classList.add("hidden");
    return;
  }
  const lower = val.toLowerCase();
  cmdPaletteFiltered = CHAT_COMMANDS.filter((c) => c.cmd.startsWith(lower));
  if (!cmdPaletteFiltered.length) {
    palette.classList.add("hidden");
    return;
  }
  cmdPaletteActiveIdx = Math.max(-1, Math.min(cmdPaletteActiveIdx, cmdPaletteFiltered.length - 1));
  palette.innerHTML = cmdPaletteFiltered
    .map((c, i) =>
      `<div class="cmd-palette-item${i === cmdPaletteActiveIdx ? " active" : ""}" data-idx="${i}" role="option">` +
      `<span class="cmd-palette-name">${c.cmd}</span>` +
      `<span class="cmd-palette-desc">${c.desc}</span>` +
      `</div>`
    )
    .join("");
  palette.classList.remove("hidden");
  palette.querySelectorAll(".cmd-palette-item").forEach((el) => {
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const idx = Number(el.dataset.idx);
      if (cmdPaletteFiltered[idx]) {
        if (chatInput) chatInput.value = cmdPaletteFiltered[idx].cmd;
        hideCmdPalette();
        chatInput?.focus();
      }
    });
  });
}

function hideCmdPalette() {
  const palette = document.getElementById("cmdPalette");
  if (palette) palette.classList.add("hidden");
  cmdPaletteActiveIdx = -1;
  cmdPaletteFiltered = [];
}


function southDoorTilesWideBuilding(building) {
  const iw = Math.max(3, Math.floor(Number(building?.w)));
  return iw % 2 === 0 ? 2 : 1;
}

function southDoorAnchorWorldClient(building) {
  const bw = Math.max(3, Math.floor(Number(building?.w)));
  const bx = Math.floor(building.x);
  if (bw % 2 === 1) return bx + (bw - 1) / 2 + 0.5;
  return (bx + bw / 2 - 1 + bx + bw / 2) / 2 + 0.5;
}

function façadeDoorPxFromBuilding(building, faceWidthPx) {
  const span = southDoorTilesWideBuilding(building);
  return Math.max(TILE_SIZE * span, Math.round(faceWidthPx * 0.1 * span));
}

/** Mirrors server/src/world.js STARTING_AREA — combat-disabled plaza only */
const STARTING_SAFE_ZONE = { x: 0, y: 0, radius: 26 };
/** Matches server SPELL_DAMAGE_PROFILES.consecration.radius */
const CONSECRATION_RADIUS_TILES = 4.6;
const BUY_HOUSE_INTERACT_RADIUS = 8;
/** World-tile radius: small hover tooltip only when pointer is near the tree sprite. */
const INTERIOR_HOME_TREE_HIT_RADIUS_TILES = 0.55;
/** World-tile radius for click-to-teleport (generous; server validates click position). */
const INTERIOR_HOME_TREE_CLICK_RADIUS_TILES = 1.45;
/** World-tile radius for clicking the interior chest to open storage. */
const INTERIOR_HOUSE_CHEST_CLICK_RADIUS_TILES = 0.72;
/** Tooltip appears only when near the chest sprite. */
const INTERIOR_HOUSE_CHEST_TOOLTIP_RADIUS_TILES = 0.58;
const HOUSE_CHEST_SLOTS = 10;
/** Must match server INTERACT_RADIUS + small margin */
const WORLD_CHEST_LOOT_RADIUS_TILES = 2.1;
const TRADER_CLICK_HIT_RADIUS = 3.6;
const TRADER_CLICK_PLAYER_RADIUS = 8;
/** Trader caravan props — positions MUST match isTrader NPC homeX/homeY in server/src/npcs.js */
const TRADER_CARAVAN_SPOTS = [
  { x: -40, y: -10 },
  { x: 40, y: -10 },
  { x: -26, y: 44 },
  { x: 28, y: 50 }
];

const CHUNK_SIZE = 16;
const chunkCanvasCache = new Map();
const CLIENT_PLAYER_SPEED = 5.2;
const CLIENT_SHIP_TURN_SPEED = 2.65;
const LOCAL_CORRECTION_DEADZONE_TILES = 0.65;
const LOCAL_CORRECTION_BLEND_THRESHOLD_TILES = 1.35;
const LOCAL_CORRECTION_SNAP_TILES = 3.0;
const SHIP_STATION_INTERACT_RADIUS = 1.35;
/** Must match server/src/index.js SWIM_SPEED_MULT */
const CLIENT_SWIM_SPEED_MULT = 0.38;

const TALENT_TREES = {
  mage: [
    { name: "Fire", spells: [
      { id: "fireball",   name: "Fireball",    desc: "Hurl a ball of flame at enemies" },
      { id: "fire_nova",  name: "Fire Nova",   desc: "Burst of fire around you" },
      { id: "inferno",    name: "Inferno",     desc: "Channel a cone of scorching flame" }
    ]},
    { name: "Frost", spells: [
      { id: "ice_shard",      name: "Ice Shard",      desc: "Frost bolt that slows enemies" },
      { id: "frost_barrier",  name: "Frost Barrier",  desc: "Ice shield absorbs incoming damage" },
      { id: "blizzard",       name: "Blizzard",       desc: "AoE frost storm at target location" }
    ]},
    { name: "Arcane", spells: [
      { id: "arcane_bolt",  name: "Arcane Bolt",  desc: "Fast-moving arcane projectile" },
      { id: "mana_shield",  name: "Mana Shield",  desc: "Convert damage taken to mana loss" },
      { id: "time_warp",    name: "Time Warp",    desc: "Slow all nearby enemies briefly" }
    ]}
  ],
  knight: [
    { name: "Protection", spells: [
      { id: "shield_bash",    name: "Shield Bash",    desc: "Stun an enemy with your shield" },
      { id: "divine_shield",  name: "Divine Shield",  desc: "Brief invincibility bubble" },
      { id: "fortify",        name: "Fortify",        desc: "Massively boost armour temporarily" }
    ]},
    { name: "Retribution", spells: [
      { id: "holy_strike",    name: "Holy Strike",    desc: "Holy-charged powerful melee blow" },
      { id: "consecration",   name: "Consecration",   desc: "Consecrate the ground for ~5s — hurts foes, heals allies in the circle" },
      { id: "divine_wrath",   name: "Divine Wrath",   desc: "Smite enemies in a wide arc" }
    ]},
    { name: "Recovery", spells: [
      { id: "healing_aura",  name: "Healing Aura",  desc: "Regenerate HP over time" },
      { id: "lay_on_hands",  name: "Lay on Hands",  desc: "Large instant self-heal" },
      { id: "battle_cry",    name: "Battle Cry",    desc: "Boost speed and strength briefly" }
    ]}
  ],
  ranger: [
    { name: "Marksmanship", spells: [
      { id: "precise_shot",    name: "Precise Shot",    desc: "High-damage single arrow" },
      { id: "piercing_arrow",  name: "Piercing Arrow",  desc: "Arrow that passes through enemies" },
      { id: "rain_of_arrows",  name: "Rain of Arrows",  desc: "Barrage of arrows over an area" }
    ]},
    { name: "Survival", spells: [
      { id: "caltrops",     name: "Caltrops",    desc: "Drop spikes that slow enemies" },
      { id: "evasion",      name: "Evasion",     desc: "Become hard to hit briefly" },
      { id: "camouflage",   name: "Camouflage",  desc: "Vanish from enemies temporarily" }
    ]},
    { name: "Trickery", spells: [
      { id: "multishot",   name: "Multishot",   desc: "Fire three arrows simultaneously" },
      { id: "smoke_bomb",  name: "Smoke Bomb",  desc: "Disorient nearby enemies" },
      { id: "volley",      name: "Volley",      desc: "Rapid burst of arrows" }
    ]}
  ]
};
const PRODUCTION_SERVER_URL = "wss://balathor.edmundmurphy.com/ws";
const SERVER_URL_STORAGE_KEY = "balathor.serverUrl";
const DEBUG_HUD_STORAGE_KEY  = "balathor.debugHud";
const SAVED_CREDS_COOKIE     = "balathor_creds";
const RECONNECT_DELAYS_MS    = [3000, 5000, 10000, 15000, 30000];

function setSavedCreds(username, password) {
  const val = encodeURIComponent(username) + ":" + encodeURIComponent(password);
  const exp = new Date(Date.now() + 30 * 864e5).toUTCString();
  document.cookie = `${SAVED_CREDS_COOKIE}=${val};expires=${exp};path=/;SameSite=Strict`;
}

function getSavedCreds() {
  const m = document.cookie.match(/(?:^|;\s*)balathor_creds=([^;]*)/);
  if (!m) return null;
  const sep = m[1].indexOf(":");
  if (sep === -1) return null;
  return {
    username: decodeURIComponent(m[1].slice(0, sep)),
    password: decodeURIComponent(m[1].slice(sep + 1))
  };
}

function clearSavedCreds() {
  document.cookie = `${SAVED_CREDS_COOKIE}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}
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
  CHEST: 20,
  HOME_TREE: 21,
  VOID: 22,
  METAL: 23,
  WALKWAY: 24,
  HULL: 25,
  WINDOW: 26,
  ENERGY: 27
};

/** Local foot collision: mirrors server blocked tiles except WATER (swimmable). */
const CLIENT_BLOCKED_TILES = new Set([
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
  TILE.HULL
]);

/** Mirrors server/src/world.js isBlockedCircle default. */
const PLAYER_COLLISION_RADIUS = 0.28;

/** Mirrors server/src/world.js landmark spawn tree trunk AABB (tile-relative). */
const LANDMARK_SPAWN_TREE_TRUNK_BOUNDS = Object.freeze({
  minX: -0.14,
  maxX: 1.1,
  minY: 2.48,
  maxY: 3.62
});

/** Mirrors server/src/world.js circleIntersectsAxisRect */
function circleIntersectsAxisRect(cx, cy, cr, minX, minY, maxX, maxY) {
  const qx = Math.max(minX, Math.min(cx, maxX));
  const qy = Math.max(minY, Math.min(cy, maxY));
  const dx = cx - qx;
  const dy = cy - qy;
  return dx * dx + dy * dy < cr * cr;
}

function clientLandmarkSpawnTreeTrunkBlocked(worldX, worldY, radius = PLAYER_COLLISION_RADIUS) {
  const lx = worldX - START_SPAWN.x;
  const ly = worldY - START_SPAWN.y;
  const { minX, maxX, minY, maxY } = LANDMARK_SPAWN_TREE_TRUNK_BOUNDS;
  return circleIntersectsAxisRect(lx, ly, radius, minX, minY, maxX, maxY);
}

function clientIsSwimmingAt(wx, wy) {
  if (!clientMovementSampleChunksReady(wx, wy, PLAYER_COLLISION_RADIUS)) {
    return false;
  }
  return getTile(Math.floor(wx), Math.floor(wy)) === TILE.WATER;
}

function clientMovementSampleChunksReady(wx, wy, radius) {
  const points = [
    [wx - radius, wy - radius],
    [wx + radius, wy - radius],
    [wx - radius, wy + radius],
    [wx + radius, wy + radius]
  ];
  for (const [px, py] of points) {
    const tx = Math.floor(px);
    const ty = Math.floor(py);
    const cx = Math.floor(tx / CHUNK_SIZE);
    const cy = Math.floor(ty / CHUNK_SIZE);
    if (!state.chunks.has(chunkKey(cx, cy))) {
      return false;
    }
  }
  return true;
}

/** Mirrors server/src/world.js isBlockedCircle using local chunk tiles. */
function clientIsBlockedCircle(wx, wy, radius = PLAYER_COLLISION_RADIUS) {
  if (clientLandmarkSpawnTreeTrunkBlocked(wx, wy, radius)) {
    return true;
  }
  if (!clientMovementSampleChunksReady(wx, wy, radius)) {
    return false;
  }
  const points = [
    [wx - radius, wy - radius],
    [wx + radius, wy - radius],
    [wx - radius, wy + radius],
    [wx + radius, wy + radius]
  ];
  return points.some(([px, py]) => CLIENT_BLOCKED_TILES.has(getTile(Math.floor(px), Math.floor(py))));
}

function clientSpaceObjectBlocksShip(wx, wy) {
  const tx = Math.floor(wx);
  const ty = Math.floor(wy);
  for (const obj of state.spaceObjects.values()) {
    if (!obj || !Number.isFinite(obj.x) || !Number.isFinite(obj.y)) {
      continue;
    }
    if (obj.kind === "station") {
      const halfW = Math.floor(Math.max(1, Number(obj.w || 1)) / 2);
      const halfH = Math.floor(Math.max(1, Number(obj.h || 1)) / 2);
      if (tx >= obj.x - halfW && tx <= obj.x + halfW && ty >= obj.y - halfH && ty <= obj.y + halfH) {
        return true;
      }
    } else if (obj.kind === "planet" || obj.type === "planet") {
      const radius = Math.max(1, Number(obj.radius || 1));
      const dx = tx - obj.x;
      const dy = ty - obj.y;
      if (dx * dx + dy * dy <= radius * radius) {
        return true;
      }
    }
  }
  return false;
}

function clientIsBlockedForShip(wx, wy) {
  const tx = Math.floor(wx);
  const ty = Math.floor(wy);
  if (clientSpaceObjectBlocksShip(wx, wy)) {
    return true;
  }
  const tile = getTile(tx, ty);
  return tile !== TILE.VOID && tile !== TILE.WALKWAY && tile !== TILE.ENERGY;
}

/** Mirrors server/src/world.js isBlockedCircleForShip using loaded local chunks/objects. */
function clientIsBlockedCircleForShip(wx, wy, radius = 0.34) {
  if (!clientMovementSampleChunksReady(wx, wy, radius)) {
    return false;
  }
  const points = [
    [wx - radius, wy - radius],
    [wx + radius, wy - radius],
    [wx - radius, wy + radius],
    [wx + radius, wy + radius]
  ];
  return points.some(([px, py]) => clientIsBlockedForShip(px, py));
}

/** Mirrors server/src/index.js on-foot movement: X axis first, then Y with updated X. */
function clientTryFootMove(rx, ry, stepX, stepY) {
  const nextX = rx + stepX;
  const nextY = ry + stepY;
  let x = rx;
  let y = ry;
  if (!clientIsBlockedCircle(nextX, ry)) {
    x = nextX;
  }
  if (!clientIsBlockedCircle(x, nextY)) {
    y = nextY;
  }
  if (x !== rx || y !== ry) {
    return { x, y, moved: true };
  }
  return { x: rx, y: ry, moved: false };
}

/** Mirrors server/src/index.js getBuildingPrice */
const BUILDING_TYPE_PRICES = { hut: 200, treehouse: 350, house: 500, big_house: 900, castle: 2000 };

const RARITY_ICON_COLORS = {
  common:    "#4ade80",
  uncommon:  "#22d3ee",
  rare:      "#60a5fa",
  epic:      "#c084fc",
  legendary: "#f97316",
  mythic:    "#e2e8f0",
};
const RARITY_GLOW_COLORS = {
  rare:      "rgba(96,165,250,0.55)",
  epic:      "rgba(192,132,252,0.6)",
  legendary: "rgba(249,115,22,0.65)",
  mythic:    "rgba(226,232,240,0.7)",
};
function rarityIconColor(rarity) {
  return RARITY_ICON_COLORS[rarity] || RARITY_ICON_COLORS.common;
}

function isSciFiWorld() {
  return state.worldTheme === SCI_FI_THEME;
}

function displayItemName(item) {
  if (!item) {
    return "Item";
  }
  if (!isSciFiWorld()) {
    return item.name || "Item";
  }
  if (item.type === "weapon") {
    if (typeof item.templateId === "string" && item.templateId.startsWith("scifi_")) return item.name || "Sci-fi Weapon";
    if (item.weaponKind === "sword") return item.name?.includes("☆") ? item.name : "Lightsaber";
    if (item.weaponKind === "bow") return "Blaster Carbine";
    if (item.weaponKind === "staff") return "Laser Rifle";
  }
  if (item.type === "armor") {
    if (typeof item.templateId === "string" && item.templateId.startsWith("scifi_")) return item.name || "Exo Armor";
    return "Exo Armor";
  }
  if (item.type === "ring") {
    return "Phase Ring";
  }
  if (item.type === "potion") {
    return "Stim Capsule";
  }
  if (item.type === "ship") {
    return item.name || "Dock Skiff";
  }
  if (item.type === "ship_upgrade") {
    return item.name || "Ship upgrade";
  }
  return item.name || "Item";
}

function displayItemIconClass(item) {
  if (!item) {
    return "generic";
  }
  if (!isSciFiWorld()) {
    return item.icon || item.type || "generic";
  }
  if (item.type === "weapon") {
    if (item.weaponKind === "sword") return "lightsaber";
    if (item.weaponKind === "bow") return "blaster";
    if (item.weaponKind === "staff") return "laser-rifle";
  }
  if (item.type === "armor") {
    return "exo-armor";
  }
  if (item.type === "ship") {
    return "ship";
  }
  if (item.type === "ship_upgrade") {
    return "ship";
  }
  return item.icon || item.type || "generic";
}

function displayTalentInfo(spell, classId) {
  if (!spell) {
    return { name: "Talent", desc: "" };
  }
  if (!isSciFiWorld()) {
    return spell;
  }

  const sciFiTrees = {
    mage: {
      fireball: { name: "Plasma Burst", desc: "Launch a hot plasma shot at enemies" },
      fire_nova: { name: "Flare Ring", desc: "Detonate a ring of thermal sparks around you" },
      inferno: { name: "Fusion Beam", desc: "Channel a searing beam across a cone" },
      ice_shard: { name: "Cryo Dart", desc: "Piercing cryo shot that slows targets" },
      frost_barrier: { name: "Shield Matrix", desc: "Project a barrier that absorbs damage" },
      blizzard: { name: "Ion Storm", desc: "Blanket an area in crackling ion fire" },
      arcane_bolt: { name: "Photon Bolt", desc: "Fast-moving bolt of pure energy" },
      mana_shield: { name: "Flux Shield", desc: "Convert damage into shield drain" },
      time_warp: { name: "Phase Warp", desc: "Slow nearby enemies through a phase pulse" }
    },
    knight: {
      shield_bash: { name: "Aegis Strike", desc: "Stagger foes with a charged shield hit" },
      divine_shield: { name: "Barrier Dome", desc: "Brief invincibility field" },
      fortify: { name: "Reinforce", desc: "Massively boost armour temporarily" },
      holy_strike: { name: "Pulse Slash", desc: "High-energy close-range strike" },
      consecration: { name: "Overcharge Field", desc: "Area field that harms foes and restores allies" },
      divine_wrath: { name: "Nova Smite", desc: "Smite enemies in a wide arc" },
      healing_aura: { name: "Repair Aura", desc: "Regenerate HP over time" },
      lay_on_hands: { name: "Emergency Patch", desc: "Large instant self-repair" },
      battle_cry: { name: "Command Burst", desc: "Boost speed and strength briefly" }
    },
    ranger: {
      precise_shot: { name: "Rail Shot", desc: "High-damage single rail shot" },
      piercing_arrow: { name: "Piercing Pulse", desc: "Energy shot that passes through enemies" },
      rain_of_arrows: { name: "Drone Barrage", desc: "Barrage of targeting drones over an area" },
      caltrops: { name: "Mag Mines", desc: "Deploy mines that slow enemies" },
      evasion: { name: "Afterimage", desc: "Briefly become hard to hit" },
      camouflage: { name: "Signal Ghost", desc: "Vanish from enemies temporarily" },
      multishot: { name: "Tri-Shot", desc: "Fire three energy darts simultaneously" },
      smoke_bomb: { name: "Ion Smoke", desc: "Disorient nearby enemies" },
      volley: { name: "Pulse Volley", desc: "Rapid burst of shots" }
    }
  };

  return sciFiTrees[classId]?.[spell.id] || spell;
}

function displayTalentTreeName(classId, treeName) {
  if (!isSciFiWorld()) {
    return treeName;
  }
  const map = {
    mage: { Fire: "Plasma", Frost: "Cryo", Arcane: "Quantum" },
    knight: { Protection: "Aegis", Retribution: "Nova", Recovery: "Support" },
    ranger: { Marksmanship: "Rail", Survival: "Recon", Trickery: "Ghost" }
  };
  return map[classId]?.[treeName] || treeName;
}

const kenneyRpgBase = new Image();
kenneyRpgBase.src = "./assets/kenney-rpg-base.png";
const KENNEY_TILE_SIZE = 64;
const KENNEY_SHEET_COLUMNS = 20;

const kenneyRoguelike = new Image();
kenneyRoguelike.src = "./assets/kenney-roguelike.png";
const KRL_TILE = 16;
const KRL_STEP = 17;
const KRL_COLS = 57;

const state = {
  socket: null,
  config: null,
  connected: false,
  joined: false,
  _reconnectAttempt: 0,
  _reconnectTimer: null,
  selfId: null,
  selectedClass: "ranger",
  torsoStyle: "tunic",
  weaponStyle: "classic",
  torsoColor: "#5cc8ff",
  weaponColor: "#ffd166",
  players: new Map(),
  npcs: new Map(),
  mobs: new Map(),
  caravans: new Map(),
  chests: [],
  groundItems: [],
  inventory: Array(10).fill(null),
  equipment: { weapon: null, body: null, ring1: null, ring2: null },
  ship: null,
  ships: [],
  shipTerminal: null,
  teleportMenu: null,
  questOffer: null,
  gold: 0,
  shop: null,
  speechBubbles: new Map(),
  combatFx: [],
  spellFx: [],
  spellCooldowns: new Map(),
  levelUpFx: [],
  portalTransition: null,
  teleportGuardUntil: 0,
  worldTheme: "fantasy",
  chunks: new Map(),
  portals: new Map(),
  buildings: new Map(),
  roadsides: new Map(),
  spaceObjects: new Map(),
  benchSitUntil: 0,
  /** Server sends seatBench until local movement clears the pose */
  benchSeatIndefinite: false,
  friends: [],
  party: null,
  chatSubTab: "messages",
  playerContextMenu: null,
  npcContext: null,
  tradePartnerId: null,
  tradeDragInvSlot: null,
  friendsWindowOpen: false,
  partyPanelMinimized: false,
  /** @type {{ start: number, until: number, tx: number, ty: number } | null} */
  fountainToss: null,
  requestedChunks: new Set(),
  population: 0,
  worldTime: { hour: 8, phase: "day" },
  input: { up: false, down: false, left: false, right: false, engage: false, fire: false, repair: false, weaponMode: "laser" },
  inputSeq: 0,
  camera: { x: 0, y: 0, rotation: 0 },
  zoom: 1,
  activeServerUrl: "",
  authenticated: false,
  menuOpen: false,
  chatMinimized: false,
  progressionMinimized: false,
  activeWindow: null,
  buildingOwnership: new Map(),
  buyHouseOffer: null,
  pendingCompanionInvite: null,
  traderNpcId: null,
  traderItems: [],
  quests: [],
  lastViewSentAt: 0,
  lastFrame: performance.now(),
  debugHud: localStorage.getItem(DEBUG_HUD_STORAGE_KEY) === "1",
  clientFps: 0,
  debugRttMs: null,
  debugServerSimHz: null,
  debugTickRate: null,
  debugSnapshotRate: null,
  debugServerTick: null,
  _debugFpsFrames: 0,
  _debugFpsWindowStart: performance.now(),
  _debugLastPingAt: 0,
  hoverTooltipText: "",
  hoverTooltipX: 0,
  hoverTooltipY: 0,
  hoverTooltipSmall: false,
  pubPassoutUntil: 0,
  houseChestSlots: null,
  houseChestBuildingKey: null,
  /** Until this time (performance.now()), self draws home-teleport hand cast */
  pendingHomeTeleportUntil: 0,
  /** Full-screen blackout after choosing “make rumpi pumpi” with your partner at home */
  intimateBlackoutUntil: 0,
  /** After waking, keep the companion posed in bed for a short beat */
  morningAfterCompanionBedUntil: 0
};

const SPEECH_BUBBLE_MS = 5200;
const VIEW_SEND_INTERVAL_MS = 350;

function syncDebugToggleButton() {
  if (!debugToggleButton) {
    return;
  }
  debugToggleButton.setAttribute("aria-pressed", String(state.debugHud));
  debugToggleButton.textContent = state.debugHud ? "Debug overlay: On" : "Debug overlay: Off";
}

function updateClientFps(now) {
  state._debugFpsFrames += 1;
  const elapsed = now - state._debugFpsWindowStart;
  if (elapsed >= 450) {
    state.clientFps = Math.round((state._debugFpsFrames * 1000) / elapsed);
    state._debugFpsFrames = 0;
    state._debugFpsWindowStart = now;
  }
}

function maybeSendDebugPing(now) {
  if (!state.socket || state.socket.readyState !== WebSocket.OPEN || !state.debugHud) {
    return;
  }
  if (now - state._debugLastPingAt < 850) {
    return;
  }
  state._debugLastPingAt = now;
  send({ type: "ping", t: performance.now() });
}

function drawDebugHud() {
  if (!state.debugHud) {
    return;
  }

  const self = state.players.get(state.selfId);
  const posLabel = self
    ? `Map: ${Math.round(self.renderX)}, ${Math.round(self.renderY)} (chunk ${Math.floor(self.renderX / CHUNK_SIZE)}, ${Math.floor(self.renderY / CHUNK_SIZE)})`
    : "Map: —";
  const themeLabel = state.worldTheme === SCI_FI_THEME ? "Realm: sci-fi" : "Realm: fantasy";

  const simLabel =
    typeof state.debugServerSimHz === "number" && Number.isFinite(state.debugServerSimHz)
      ? `${state.debugServerSimHz.toFixed(1)} Hz`
      : "—";

  const targetSim =
    typeof state.debugTickRate === "number"
      ? ` (target ${state.debugTickRate} Hz)`
      : "";

  const snapLabel =
    typeof state.debugSnapshotRate === "number" ? `${state.debugSnapshotRate}/s` : "—";

  const rtt =
    typeof state.debugRttMs === "number" && Number.isFinite(state.debugRttMs)
      ? `${Math.round(state.debugRttMs)} ms`
      : "—";

  const tickLabel =
    typeof state.debugServerTick === "number" ? String(state.debugServerTick) : "—";

  const lines = [
    `FPS (client): ${state.clientFps || "—"}`,
    `Sim rate (srv): ${simLabel}${targetSim}`,
    `Snapshots (srv): ${snapLabel}`,
    `RTT: ${rtt}`,
    `Server tick: ${tickLabel}`,
    posLabel,
    themeLabel
  ];

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const pad = 14;
  const lineHeight = 18;
  const w = 292;
  const h = pad * 2 + lines.length * lineHeight;
  ctx.fillStyle = "rgba(12, 16, 24, 0.78)";
  ctx.strokeStyle = "rgba(255, 209, 102, 0.35)";
  ctx.lineWidth = 1;
  const bx = 12;
  const by = 12;
  ctx.fillRect(bx, by, w, h);
  ctx.strokeRect(bx, by, w, h);

  ctx.fillStyle = "#e8eef8";
  ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  let y = by + pad;
  for (const line of lines) {
    ctx.fillText(line, bx + pad, y);
    y += lineHeight;
  }
  ctx.restore();
}

const keys = new Map([
  ["w", "up"],
  ["arrowup", "up"],
  ["s", "down"],
  ["arrowdown", "down"],
  ["a", "left"],
  ["arrowleft", "left"],
  ["d", "right"],
  ["arrowright", "right"]
]);

const tilePalette = {
  [TILE.GRASS]: ["#4f8b49", "#6ba85c", "#35723d"],
  [TILE.DARK_GRASS]: ["#315f45", "#49775a", "#254a38"],
  [TILE.TREE]: ["#315f45", "#2f7a4e", "#6c4b2e"],
  [TILE.WATER]: ["#2f7ea7", "#4aa6c7", "#1f5a82"],
  [TILE.STONE]: ["#858d92", "#b5b8b2", "#5d6870"],
  [TILE.PATH]: ["#9c7c4a", "#c3a069", "#6f5537"],
  [TILE.FLOWERS]: ["#4f8b49", "#f2d46f", "#de6f99"],
  [TILE.WALL]: ["#6b5040", "#8c7060", "#4a3028"],
  [TILE.FLOOR]: ["#9a7c5a", "#b09070", "#7a5c40"],
  [TILE.DOOR]: ["#5c3520", "#7a4a2a", "#3c2010"],
  [TILE.SAND]: ["#caa35e", "#e0c782", "#9b7745"],
  [TILE.SNOW]: ["#d7e7ee", "#f7fbff", "#9eb9c8"],
  [TILE.LAVA]: ["#4a1b20", "#e0582c", "#ffd06a"],
  [TILE.PORTAL]: ["#241844", "#75f0ff", "#f87dff"],
  [TILE.CARPET]: ["#7b2e3a", "#b84f58", "#53212b"],
  [TILE.BED]: ["#4b6d88", "#8fb8d8", "#2d3e56"],
  [TILE.TABLE]: ["#6c4528", "#9b6a3e", "#3f291c"],
  [TILE.SHELF]: ["#5a3824", "#b8844d", "#2b1a10"],
  [TILE.FIREPLACE]: ["#3a2820", "#e05010", "#ffa040"],
  [TILE.CHAIR]: ["#5f3d24", "#8b5f3e", "#352010"],
  [TILE.CHEST]: ["#4a3018", "#7a5230", "#d4af37"],
  [TILE.HOME_TREE]: ["#315f45", "#2f7a4e", "#6c4b2e"]
};

const sciFiTilePalette = {
  [TILE.GRASS]: ["#2c4b5c", "#5f8ba3", "#183544"],
  [TILE.DARK_GRASS]: ["#203847", "#4c7386", "#13242f"],
  [TILE.TREE]: ["#315f45", "#2f7a4e", "#6c4b2e"],
  [TILE.WATER]: ["#13374d", "#1f7ea7", "#0c2230"],
  [TILE.STONE]: ["#5f7082", "#a8bacf", "#37485a"],
  [TILE.PATH]: ["#273744", "#5f8394", "#182530"],
  [TILE.FLOWERS]: ["#2c4b5c", "#f8d86a", "#7cc7ff"],
  [TILE.WALL]: ["#2d3440", "#61738a", "#141923"],
  [TILE.FLOOR]: ["#394657", "#7c93ab", "#1b2430"],
  [TILE.DOOR]: ["#1b2733", "#67f0ff", "#0d1218"],
  [TILE.SAND]: ["#3d5563", "#9ed1ea", "#223240"],
  [TILE.SNOW]: ["#d5eef8", "#f7fbff", "#9eb9c8"],
  [TILE.LAVA]: ["#4a1b20", "#e0582c", "#ffd06a"],
  [TILE.PORTAL]: ["#10182a", "#67f0ff", "#e48cff"],
  [TILE.CARPET]: ["#223447", "#5f8394", "#101922"],
  [TILE.BED]: ["#415c78", "#8fb8d8", "#223240"],
  [TILE.TABLE]: ["#2f4558", "#6e8aa0", "#17212c"],
  [TILE.SHELF]: ["#32465a", "#98c4da", "#141c26"],
  [TILE.FIREPLACE]: ["#3a2820", "#e05010", "#ffa040"],
  [TILE.CHAIR]: ["#35495c", "#7d9ab1", "#171f28"],
  [TILE.CHEST]: ["#2f3d4d", "#7ec8ff", "#d4af37"],
  [TILE.HOME_TREE]: ["#315f45", "#2f7a4e", "#6c4b2e"],
  [TILE.VOID]: ["#050916", "#0b1226", "#03050c"],
  [TILE.METAL]: ["#4b5a6d", "#9fb8cf", "#263243"],
  [TILE.WALKWAY]: ["#314152", "#7dcfff", "#1a2430"],
  [TILE.HULL]: ["#233041", "#637a93", "#111721"],
  [TILE.WINDOW]: ["#09131f", "#67f0ff", "#d8fbff"],
  [TILE.ENERGY]: ["#103a40", "#67f0ff", "#e8ffff"]
};

function getTileColors(tile, theme = state.worldTheme) {
  const themePalette = theme === SCI_FI_THEME ? sciFiTilePalette : tilePalette;
  return themePalette[tile] || themePalette[TILE.GRASS];
}

resize();
wireUi();
start();
requestAnimationFrame(frame);
setInterval(sendInput, 33);

async function start() {
  globalThis.__balathorClearChunkCache = () => chunkCanvasCache.clear();
  if (globalThis.TechDungeonSprites) {
    void TechDungeonSprites.load().then((ok) => {
      if (ok) {
        chunkCanvasCache.clear();
      }
    });
  }
  setStatus("Loading realm config");
  state.config = await loadConfig();
  const serverUrl = localStorage.getItem(SERVER_URL_STORAGE_KEY) || state.config.gameServerUrl;
  setStatus("Connecting to realm");
  connect(serverUrl);
}

async function loadConfig() {
  const queryServerUrl = new URLSearchParams(location.search).get("gameServerUrl");
  if (queryServerUrl) {
    return {
      gameServerUrl: queryServerUrl
    };
  }

  const fallbackUrl = PRODUCTION_SERVER_URL;
  const sources = ["/config.json", "./config.local.json"];

  for (const source of sources) {
    try {
      const response = await fetch(source, { cache: "no-store" });
      if (response.ok) {
        const config = await response.json();
        return {
          gameServerUrl: config.gameServerUrl || fallbackUrl
        };
      }
    } catch {
      // Try the next config source.
    }
  }

  return { gameServerUrl: fallbackUrl };
}

function connect(url) {
  let normalizedUrl;
  try {
    normalizedUrl = normalizeServerUrl(url);
  } catch {
    setStatus("Enter a valid server address");
    return;
  }

  if (state.socket) {
    state.ignoreNextClose = true;
    state.socket.close();
  }

  setStatus("Connecting to realm");
  state.activeServerUrl = normalizedUrl;
  const socket = new WebSocket(normalizedUrl);
  state.socket = socket;

  socket.addEventListener("open", () => {
    state.connected = true;
    state._reconnectAttempt = 0;
    clearTimeout(state._reconnectTimer);
    localStorage.setItem(SERVER_URL_STORAGE_KEY, normalizedUrl);

    const saved = getSavedCreds();
    if (saved) {
      usernameInput.value = saved.username;
      passwordInput.value = saved.password;
      setStatus("Logging in");
      loginButton.disabled = true;
      createAccountButton.disabled = true;
      send({ type: "auth", action: "login", username: saved.username, password: saved.password });
    } else {
      setStatus("Connected");
      bootPanel.classList.remove("hidden");
      accountForm.classList.remove("hidden");
      form.classList.add("hidden");
      usernameInput.focus();
    }
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    handleServerMessage(message);
  });

  socket.addEventListener("close", () => {
    if (state.ignoreNextClose) {
      state.ignoreNextClose = false;
      return;
    }
    state.connected = false;
    const wasJoined = state.joined;
    resetToConnection(wasJoined ? "Realm connection closed" : "Unable to connect");
    scheduleReconnect(wasJoined);
  });

  socket.addEventListener("error", () => {
    setStatus("Connection failed");
  });
}

function scheduleReconnect(wasJoined) {
  clearTimeout(state._reconnectTimer);
  const attempt = state._reconnectAttempt;
  const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
  state._reconnectAttempt = attempt + 1;
  const secs = Math.round(delay / 1000);
  setStatus(`${wasJoined ? "Realm connection closed" : "Unable to connect"} — retrying in ${secs}s`);
  state._reconnectTimer = setTimeout(() => {
    if (!state.connected && state.activeServerUrl) {
      connect(state.activeServerUrl);
    }
  }, delay);
}

function handleServerMessage(message) {
  if (message.type === "pong") {
    const t = Number(message.t);
    if (Number.isFinite(t)) {
      state.debugRttMs = performance.now() - t;
    }
    if (typeof message.tick === "number") {
      state.debugServerTick = message.tick;
    }
    if (typeof message.tickRate === "number") {
      state.debugTickRate = message.tickRate;
    }
    if (typeof message.snapshotRate === "number") {
      state.debugSnapshotRate = message.snapshotRate;
    }
    if (message.simHz == null || !Number.isFinite(message.simHz)) {
      state.debugServerSimHz = null;
    } else {
      state.debugServerSimHz = message.simHz;
    }
    return;
  }

  if (message.type === "auth") {
    loginButton.disabled = false;
    createAccountButton.disabled = false;
    if (!message.ok) {
      state.authenticated = false;
      setStatus(authErrorText(message.message));
      // Show the form so the player can correct their credentials manually
      bootPanel.classList.remove("hidden");
      accountForm.classList.remove("hidden");
      form.classList.add("hidden");
      usernameInput.focus();
      return;
    }
    // Save credentials to cookie on every successful login
    setSavedCreds(usernameInput.value, passwordInput.value);
    state.authenticated = true;
    accountForm.classList.add("hidden");
    if (!message.hasCharacter) {
      setStatus("Create your character");
      form.classList.remove("hidden");
      nameInput.value = message.username || usernameInput.value || "Wanderer";
      nameInput.focus();
    } else {
      setStatus("Entering realm");
    }
    return;
  }

  if (message.type === "welcome") {
    state.selfId = message.selfId;
    state.joined = true;
    state._reconnectAttempt = 0;
    clearTimeout(state._reconnectTimer);
    setWorldTheme(message.theme);
    if (typeof message.tickRate === "number") {
      state.debugTickRate = message.tickRate;
    }
    if (typeof message.snapshotRate === "number") {
      state.debugSnapshotRate = message.snapshotRate;
    }
    applyWorldTime(message.worldTime);
    bootPanel.classList.add("hidden");
    accountForm.classList.add("hidden");
    form.classList.add("hidden");
    progression.classList.remove("hidden");
    chat.classList.remove("hidden");
    mobileControls.classList.remove("hidden");
    abilityBar.classList.remove("hidden");
    if (isMobile) {
      setChatMinimized(true);
      setProgressionMinimized(true);
    }
    state.camera.x = message.spawn.x * TILE_SIZE;
    state.camera.y = message.spawn.y * TILE_SIZE;
    state.camera.rotation = 0;
    requestVisibleChunks();
    return;
  }

  if (message.type === "teleport") {
    setWorldTheme(message.theme);
    if (message.portalId === "home") {
      state.pendingHomeTeleportUntil = 0;
    }
    const portalTeleport = typeof message.portalId === "string" && message.portalId.startsWith("portal_");
    if (portalTeleport) {
      startPortalTransition(message);
    }
    const self = state.players.get(state.selfId);
    if (self) {
      self.x = message.x;
      self.y = message.y;
      self.targetX = message.x;
      self.targetY = message.y;
      self.renderX = message.x;
      self.renderY = message.y;
      self.renderMoving = false;
      state.benchSitUntil = 0;
      state.benchSeatIndefinite = false;
    }
    state.camera.x = message.x * TILE_SIZE;
    state.camera.y = message.y * TILE_SIZE;
    state.camera.rotation = 0;
    // Block stale pre-teleport snapshots from snapping the player back
    state.teleportGuardUntil = performance.now() + 700;
    state.requestedChunks.clear();
    chunkCanvasCache.clear();
    clearMovementInput();
    requestVisibleChunks();
    if (!message.skipChat && message.name != null && String(message.name).trim()) {
      appendChat({
        kind: "system",
        name: "Realm",
        text: `Entered ${message.name}`
      });
    }
    return;
  }

  if (message.type === "pubPassout") {
    const d = Number(message.durationMs);
    const ms = Number.isFinite(d) ? Math.max(600, Math.min(8000, d)) : 3000;
    state.pubPassoutUntil = performance.now() + ms;
    return;
  }

  if (message.type === "roadsideRest") {
    if (message.seatBench) {
      state.benchSeatIndefinite = true;
      state.benchSitUntil = 0;
    } else {
      state.benchSeatIndefinite = false;
      const d = Number(message.durationMs);
      const ms = Number.isFinite(d) ? Math.max(400, Math.min(9000, d)) : 2800;
      state.benchSitUntil = performance.now() + ms;
    }
    return;
  }

  if (message.type === "chunk") {
    const key = chunkKey(message.cx, message.cy);
    state.chunks.set(key, message);
    indexChunkPortals(message);
    indexChunkBuildings(message);
    indexChunkRoadsides(message);
    indexChunkSpaceObjects(message);
    state.requestedChunks.delete(key);
    return;
  }

  if (message.type === "talentUpdate") {
    const self = state.players.get(state.selfId);
    if (self) {
      self.talentPoints = message.talentPoints;
      self.talents = message.talents;
      self.abilityBar = message.abilityBar;
      if (state.activeWindow === "talent") renderTalentPanel();
      if (state.activeWindow === "equipment") renderEquipment();
      renderAbilityBar();
    }
    return;
  }

  if (message.type === "snapshot") {
    if (typeof message.tick === "number") {
      state.debugServerTick = message.tick;
    }
    applyWorldTime(message.worldTime);
    state.population = message.population;
    applySnapshot(message.players);
    applyNpcSnapshot(message.npcs || []);
    applyMobSnapshot(message.mobs || []);
    applyCaravanSnapshot(message.caravans || []);
    applyPartySnapshot(message.party ?? null);
    state.chests = message.chests || [];
    state.groundItems = message.groundItems || [];
    updateSelfInventory();
    syncWorldThemeFromSelf();
    if (state.activeWindow === "equipment") renderEquipment();
    if (state.activeWindow === "talent") renderTalentPanel();
    if (state.activeWindow === "quests") renderQuestPanel();
    renderBags();
    renderHouseChestPanelIfOpen();
    renderAbilityBar();
    renderPotionSlot();
    renderShop();
    if (state.activeWindow === "trader") {
      renderTraderStock();
      renderTraderSellSlots();
    }
    return;
  }

  if (message.type === "shop") {
    state.shop = {
      open: true,
      id: message.id,
      name: message.name || "Trader Shelf",
      buildingName: message.buildingName || "",
      isPub: !!message.isPub,
      shopType: message.shopType || "trade",
      x: message.x,
      y: message.y,
      gold: Number.isFinite(message.gold) ? message.gold : state.gold,
      stock: Array.isArray(message.stock) ? message.stock : []
    };
    state.gold = state.shop.gold;
    renderShop();
    shopPanel?.classList.remove("hidden");
    return;
  }

  if (message.type === "shipTerminal") {
    state.shipTerminal = {
      open: true,
      stationName: message.stationName || "Ship Terminal",
      port: message.port || null,
      activeShipId: typeof message.activeShipId === "string" ? message.activeShipId : null,
      ships: Array.isArray(message.ships) ? message.ships : [],
      partyShips: Array.isArray(message.partyShips) ? message.partyShips : []
    };
    renderShipTerminal();
    shipTerminalPanel?.classList.remove("hidden");
    return;
  }

  if (message.type === "shipTerminalClose") {
    closeShipTerminal();
    return;
  }

  if (message.type === "questOffer") {
    showQuestOffer(message);
    return;
  }

  if (message.type === "teleportMenu") {
    showTeleportMenu(message);
    return;
  }

  if (message.type === "combat") {
    applyCombatEvent(message);
    if (message.attackerId === state.selfId && message.xpGained) {
      if (message.levelsGained > 0) {
        createLevelUpFireworks();
      }
      const goldPart = message.goldGained ? ` +${message.goldGained}g` : "";
      appendChat({
        kind: "system",
        name: "Realm",
        text: message.levelsGained > 0
          ? `Gained ${message.xpGained} XP${goldPart} and reached a new level`
          : `Gained ${message.xpGained} XP${goldPart}`
      });
    }
    return;
  }

  if (message.type === "chatHistory") {
    chatMessages.replaceChildren();
    for (const chatMessage of message.messages) {
      appendChat(chatMessage);
    }
    return;
  }

  if (message.type === "chat") {
    appendChat(message);
    return;
  }

  if (message.type === "houseCompanionChat") {
    const name = typeof message.name === "string" ? message.name : "Companion";
    const text = typeof message.text === "string" ? message.text : "";
    if (text) {
      appendChat({ kind: "npc", name, text });
    }
    return;
  }

  if (message.type === "socialFriendsUpdated") {
    state.friends = Array.isArray(message.friends) ? message.friends : [];
    if (state.chatSubTab === "friends") renderFriendsInto(chatFriendsPane);
    if (state.friendsWindowOpen) renderFriendsInto(friendsWindowList);
    return;
  }

  if (message.type === "socialPartyUpdated") {
    applyPartySnapshot(message.party ?? null);
    return;
  }

  if (message.type === "tradeState") {
    openTradeUi(message.partnerId, message);
    syncTradeUi(message);
    return;
  }

  if (message.type === "tradeClosed") {
    closeTradeUi();
    return;
  }

  if (message.type === "fountainToss") {
    const d = Number(message.durationMs);
    const ms = Number.isFinite(d) ? Math.max(400, Math.min(2200, d)) : 920;
    const tx = Number(message.targetX);
    const ty = Number(message.targetY);
    if (Number.isFinite(tx) && Number.isFinite(ty)) {
      const now = performance.now();
      state.fountainToss = { start: now, until: now + ms, tx, ty };
    }
    return;
  }

  if (message.type === "houseChestState") {
    const bk = typeof message.buildingKey === "string" ? message.buildingKey : null;
    const slots = Array.isArray(message.slots) ? message.slots : [];
    state.houseChestBuildingKey = bk;
    state.houseChestSlots = slots.slice(0, HOUSE_CHEST_SLOTS);
    while (state.houseChestSlots.length < HOUSE_CHEST_SLOTS) {
      state.houseChestSlots.push(null);
    }
    houseChestSection?.classList.remove("hidden");
    setActiveGameWindow("bags");
    renderHouseChestPanel();
    renderBags();
    return;
  }

  if (message.type === "companionOffer") {
    if (
      typeof message.npcId === "string" &&
      Number.isFinite(Number(message.price)) &&
      typeof message.line === "string"
    ) {
      openCompanionInvitePanel({
        npcId: message.npcId,
        npcName: message.npcName || "Someone",
        bondTag: message.bondTag === "bf" ? "bf" : "gf",
        price: Number(message.price),
        line: message.line
      });
    }
    return;
  }

  if (message.type === "traderInventory") {
    state.traderNpcId = message.npcId;
    state.traderItems = message.items || [];
    traderTitle.textContent = message.npcName || "Trader";
    renderTraderStock();
    renderTraderSellSlots();
    setActiveGameWindow("trader");
    return;
  }

  if (message.type === "serverMessage" && state.joined) {
    if (message.message === "chat_too_fast") {
      appendChat({
        kind: "system",
        name: "Realm",
        text: "Slow down before sending another message"
      });
    } else if (message.message === "combat_protected") {
      appendChat({
        kind: "system",
        name: "Realm",
        text: "Combat is disabled inside houses and the central plaza"
      });
    } else if (message.message === "stat_spent") {
      appendChat({
        kind: "system",
        name: "Realm",
        text: `Added a point to ${message.stat}`
      });
    } else if (message.message === "mod_time_set") {
      appendChat({
        kind: "system",
        name: "Realm",
        text: `World time set to ${formatWorldClock(Number(message.hour) || 0)}`
      });
    } else if (message.message === "mod_time_denied") {
      appendChat({
        kind: "system",
        name: "Realm",
        text: "Only mod_ed can change world time"
      });
    } else if (message.message === "inventory_full") {
      appendChat({ kind: "system", name: "Realm", text: "Inventory is full" });
    } else if (message.message === "house_chest_full") {
      appendChat({ kind: "system", name: "Realm", text: "House chest is full" });
    } else if (message.message === "not_enough_gold") {
      appendChat({ kind: "system", name: "Realm", text: "Not enough gold" });
    } else if (message.message === "shop_not_nearby") {
      appendChat({ kind: "system", name: "Realm", text: "Move closer to the shelf" });
    } else if (message.message === "shop_item_missing") {
      appendChat({ kind: "system", name: "Realm", text: "That shelf item is no longer available" });
    } else if (message.message === "shop_bought") {
      appendChat({ kind: "system", name: "Realm", text: `Bought ${message.itemName}` });
    } else if (message.message === "shop_sold") {
      appendChat({ kind: "system", name: "Realm", text: `Sold ${message.itemName}` });
    } else if (message.message === "ship_bought") {
      appendChat({ kind: "system", name: "Realm", text: `Bought ship ${message.itemName}` });
    } else if (message.message === "ship_boarded") {
      appendChat({ kind: "system", name: "Realm", text: `Boarded ${message.shipName || "your ship"}` });
    } else if (message.message === "ship_docked") {
      appendChat({ kind: "system", name: "Realm", text: `Docked ${message.shipName || "your ship"}` });
    } else if (message.message === "ship_called") {
      appendChat({ kind: "system", name: "Realm", text: `Called ${message.shipName || "your ship"} to the dock` });
    } else if (message.message === "party_teleported_to_ship") {
      appendChat({ kind: "system", name: "Realm", text: `Teleported aboard ${message.shipName || "ship"} (${message.ownerName || "crewmate"})` });
    } else if (message.message === "party_ship_unavailable") {
      appendChat({ kind: "system", name: "Realm", text: "That crewmate's ship is not available." });
    } else if (message.message === "party_ship_full") {
      appendChat({ kind: "system", name: "Realm", text: "That ship cannot host additional crew." });
    } else if (message.message === "party_disembarked") {
      appendChat({ kind: "system", name: "Realm", text: "Disembarked from crewmate's ship" });
    } else if (message.message === "ship_dock_engaged") {
      appendChat({ kind: "system", name: "Realm", text: "Auto-dock engaged" });
    } else if (message.message === "ship_dock_not_nearby") {
      appendChat({ kind: "system", name: "Realm", text: "No dock port within range" });
    } else if (message.message === "ship_dock_not_piloting") {
      appendChat({ kind: "system", name: "Realm", text: "Take a pilot station to dock" });
    } else if (message.message === "planet_arrived") {
      appendChat({ kind: "system", name: "Realm", text: `Landed on ${message.planetName || "planet"}` });
    } else if (message.message === "planet_travel_not_in_space") {
      appendChat({ kind: "system", name: "Realm", text: "Board your ship before travelling to a planet" });
    } else if (message.message === "planet_travel_unknown") {
      appendChat({ kind: "system", name: "Realm", text: "Unknown planet" });
    } else if (message.message === "caravan_boarded") {
      appendChat({ kind: "system", name: "Realm", text: `Boarded ${message.caravanName || "caravan"} (${message.fare ?? 0}g) — bound for ${message.destination || "town"}. Tap a movement key to hop off.` });
    } else if (message.message === "caravan_arrived") {
      appendChat({ kind: "system", name: "Realm", text: `Arrived at ${message.destination || "town"} aboard ${message.caravanName || "caravan"}` });
    } else if (message.message === "caravan_disembarked") {
      appendChat({ kind: "system", name: "Realm", text: `Got off ${message.caravanName || "caravan"}` });
    } else if (message.message === "caravan_too_far") {
      appendChat({ kind: "system", name: "Realm", text: "Move closer to the caravan" });
    } else if (message.message === "caravan_too_poor") {
      appendChat({ kind: "system", name: "Realm", text: `Caravan fare is ${message.fare || 0}g — you can't afford it.` });
    } else if (message.message === "caravan_unknown") {
      appendChat({ kind: "system", name: "Realm", text: "That caravan isn't here" });
    } else if (message.message === "teleport_not_here") {
      appendChat({ kind: "system", name: "Realm", text: "No teleporter active here" });
    } else if (message.message === "teleport_unknown") {
      appendChat({ kind: "system", name: "Realm", text: "That destination is offline" });
    } else if (message.message === "teleport_arrived") {
      appendChat({ kind: "system", name: "Realm", text: `Teleported to ${message.destination || "destination"}` });
    } else if (message.message === "ship_station_entered") {
      appendChat({ kind: "system", name: "Realm", text: `Entered ${message.stationName || "ship station"}` });
    } else if (message.message === "ship_station_left") {
      appendChat({ kind: "system", name: "Realm", text: "Left ship station" });
    } else if (message.message === "ship_fixture_used") {
      appendChat({ kind: "system", name: "Realm", text: "Used ship fixture" });
    } else if (message.message === "quest_started") {
      appendChat({ kind: "system", name: "Quest", text: `Started: ${message.questTitle || "Quest"}` });
      toggleGameWindow("quests");
    } else if (message.message === "quest_updated") {
      appendChat({ kind: "system", name: "Quest", text: `Updated: ${message.questTitle || "Quest"}` });
    } else if (message.message === "quest_completed") {
      const xp = Number(message.xpGained) || 0;
      const gold = Number(message.goldGained) || 0;
      appendChat({ kind: "system", name: "Quest", text: `Completed: ${message.questTitle || "Quest"} (+${xp} XP, +${gold}g)` });
    } else if (message.message === "quest_in_progress") {
      appendChat({ kind: "system", name: "Quest", text: `${message.questTitle || "That quest"} is already in progress` });
      toggleGameWindow("quests");
    } else if (message.message === "quest_abandoned") {
      appendChat({ kind: "system", name: "Quest", text: `Abandoned: ${message.questTitle || "Quest"}` });
    } else if (message.message === "quest_too_far") {
      appendChat({ kind: "system", name: "Quest", text: "Move closer to the quest giver." });
    } else if (message.message === "quest_none") {
      appendChat({ kind: "system", name: "Quest", text: "They have no quest for you right now." });
    } else if (message.message === "ship_already_owned") {
      appendChat({ kind: "system", name: "Realm", text: "You already own a ship." });
    } else if (message.message === "ship_not_owned") {
      appendChat({ kind: "system", name: "Realm", text: "That ship is not registered to your account." });
    } else if (message.message === "item_sold_out") {
      appendChat({ kind: "system", name: "Realm", text: "Item is sold out" });
    } else if (message.message === "item_bought") {
      appendChat({ kind: "system", name: "Realm", text: `Bought ${message.itemName}` });
    } else if (message.message === "item_sold") {
      appendChat({ kind: "system", name: "Realm", text: `Sold ${message.itemName} for ${message.goldGained}g` });
    } else if (message.message === "companion_need_house") {
      appendChat({ kind: "system", name: "Realm", text: "You need to own a house before anyone can move in." });
    } else if (message.message === "companion_already") {
      appendChat({ kind: "system", name: "Realm", text: "You already welcomed someone home." });
    } else if (message.message === "companion_too_far") {
      appendChat({ kind: "system", name: "Realm", text: "Walk closer together and try again." });
    } else if (message.message === "companion_gold") {
      appendChat({ kind: "system", name: "Realm", text: `Not enough gold (needs ${Number(message.price) || 0}g)` });
    } else if (message.message === "companion_unavailable") {
      appendChat({ kind: "system", name: "Realm", text: "That person's path has already changed." });
    } else if (message.message === "house_companion_bad") {
      state.intimateBlackoutUntil = 0;
      appendChat({ kind: "system", name: "Realm", text: "You can only do that with your partner inside your home." });
    } else if (message.message === "companion_left_home") {
      appendChat({
        kind: "system",
        name: "Realm",
        text: "They pack a small bundle, kiss your cheek once, and slip out the door. Your hearth is yours alone again."
      });
    } else if (message.message === "companion_intimate_ok") {
      state.morningAfterCompanionBedUntil = performance.now() + 42000;
    } else if (message.message === "friend_added") {
      appendChat({
        kind: "system",
        name: "Realm",
        text: `Added ${message.name || "player"} to your friends list.`
      });
    } else if (message.message === "friend_exists") {
      appendChat({ kind: "system", name: "Realm", text: "Already on your friends list." });
    } else if (message.message === "friend_list_full") {
      appendChat({ kind: "system", name: "Realm", text: "Friends list is full." });
    } else if (message.message === "social_too_far") {
      appendChat({ kind: "system", name: "Realm", text: "Move closer to that player." });
    } else if (message.message === "trade_too_far") {
      appendChat({ kind: "system", name: "Realm", text: "Too far to trade." });
    } else if (message.message === "trade_busy") {
      appendChat({ kind: "system", name: "Realm", text: "A trade is already open with that player." });
    } else if (message.message === "trade_done") {
      appendChat({ kind: "system", name: "Realm", text: "Trade completed." });
    } else if (message.message === "trade_failed") {
      appendChat({ kind: "system", name: "Realm", text: "Trade failed — items changed or no space." });
    } else if (message.message === "trade_incoming") {
      appendChat({
        kind: "system",
        name: "Realm",
        text: `${message.name || "Someone"} wants to trade with you.`
      });
    } else if (message.message === "fountain_no_gold") {
      appendChat({ kind: "system", name: "Realm", text: "You need at least 1 gold to toss into the fountain." });
    } else if (message.message === "pub_need_house") {
      appendChat({
        kind: "system",
        name: "Realm",
        text: "That brew only lets you stagger home — you still need your own doorway first."
      });
    } else if (message.itemName) {
      appendChat({ kind: "system", name: "Realm", text: `${message.itemName}` });
    }
  }

  if (message.type === "buildingOwnership") {
    state.buildingOwnership.clear();
    for (const [key, ownerName] of Object.entries(message.data)) {
      state.buildingOwnership.set(key, ownerName);
    }
    return;
  }

  if (message.type === "buildingBought") {
    state.buildingOwnership.set(`${message.buildingX},${message.buildingY}`, message.ownerName);
    if (
      state.buyHouseOffer &&
      state.buyHouseOffer.buildingX === message.buildingX &&
      state.buyHouseOffer.buildingY === message.buildingY
    ) {
      closeBuyHousePanel();
    }
    return;
  }

  if (message.type === "spellCast") {
    if (message.casterId === state.selfId && message.readyAt) {
      state.spellCooldowns.set(message.spellId, {
        readyAt: Number(message.readyAt),
        cooldownMs: Number(message.cooldownMs || 0)
      });
    }
    state.spellFx.push({
      spellId: message.spellId,
      casterId: message.casterId,
      x: message.x,
      y: message.y,
      facing: message.facing,
      fixedGround: Boolean(message.groundAnchor),
      createdAt: performance.now(),
      ttl: SPELL_ANIMATION_CONFIG[message.spellId]?.ttl || 900
    });
    return;
  }

  if (message.type === "spellCooldown") {
    state.spellCooldowns.set(message.spellId, {
      readyAt: Number(message.readyAt),
      cooldownMs: Number(message.cooldownMs || 0)
    });
    updateAbilityCooldowns();
    return;
  }
}

function authErrorText(message) {
  if (message === "auth_exists") {
    return "That username is already taken";
  }
  if (message === "auth_failed") {
    return "Username or password is wrong";
  }
  return "Use a valid username and password (password may be empty; very long values are rejected)";
}

function startPortalTransition(message) {
  state.portalTransition = {
    fromX: state.camera.x / TILE_SIZE,
    fromY: state.camera.y / TILE_SIZE,
    toX: message.x,
    toY: message.y,
    color: message.color || "#75f0ff",
    name: message.name || "Portal",
    startedAt: performance.now(),
    duration: 920
  };
}

function applySnapshot(players) {
  const now = performance.now();
  const seen = new Set();

  for (const snapshot of players) {
    seen.add(snapshot.id);
    let player = state.players.get(snapshot.id);

    if (!player) {
      player = {
        ...snapshot,
        renderX: snapshot.x,
        renderY: snapshot.y,
        renderMoving: Boolean(snapshot.moving),
        walkPhase: 0,
        targetX: snapshot.x,
        targetY: snapshot.y,
        lastSeen: now
      };
      state.players.set(snapshot.id, player);
      continue;
    }

    // During the post-teleport guard window, ignore snapshot position for the
    // local player — stale server snapshots from before the teleport would
    // otherwise snap renderX/Y back to the old portal position.
    const isSelf = snapshot.id === state.selfId;
    const posGuarded = isSelf && now < state.teleportGuardUntil;
    if (snapshot.ship?.boarded && snapshot.ship.deckMode && player.ship?.boarded && player.ship.deckMode) {
      const oldCenter = shipCenter(player.ship, player);
      const newCenter = shipCenter(snapshot.ship, snapshot);
      const dx = newCenter.x - oldCenter.x;
      const dy = newCenter.y - oldCenter.y;
      if (Number.isFinite(dx) && Number.isFinite(dy) && (dx || dy)) {
        player.renderX += dx;
        player.renderY += dy;
      }
    }
    Object.assign(player, snapshot, {
      targetX: posGuarded ? player.targetX : snapshot.x,
      targetY: posGuarded ? player.targetY : snapshot.y,
      renderMoving: Boolean(snapshot.moving),
      lastSeen: now
    });
  }

  for (const [id] of state.players) {
    if (!seen.has(id)) {
      state.players.delete(id);
    }
  }
}

function updateSelfInventory() {
  const self = state.players.get(state.selfId);
  if (!self) {
    state.inventory = Array(10).fill(null);
    state.equipment = { weapon: null, body: null, ring1: null, ring2: null };
    state.ship = null;
    state.ships = [];
    state.gold = 0;
    return;
  }
  state.inventory = Array.isArray(self.inventory) ? self.inventory : Array(10).fill(null);
  state.equipment = self.equipment || { weapon: null, body: null, ring1: null, ring2: null };
  state.ship = self.ship || null;
  state.ships = Array.isArray(self.ships) ? self.ships : (self.ship ? [self.ship] : []);
  state.quests = Array.isArray(self.quests) ? self.quests : [];
  state.gold = Number.isFinite(self.gold) ? self.gold : state.gold;
  if (state.shop?.open) {
    state.shop.gold = state.gold;
  }
}

function applyNpcSnapshot(snapshotNpcs) {
  const now = performance.now();
  const seen = new Set();

  for (const snap of snapshotNpcs) {
    seen.add(snap.id);
    let npc = state.npcs.get(snap.id);

    if (!npc) {
      npc = {
        ...snap,
        renderX: snap.x,
        renderY: snap.y,
        renderMoving: Boolean(snap.moving),
        walkPhase: 0,
        targetX: snap.x,
        targetY: snap.y,
        lastSeen: now
      };
      state.npcs.set(snap.id, npc);
      continue;
    }

    Object.assign(npc, snap, {
      targetX: snap.x,
      targetY: snap.y,
      renderMoving: Boolean(snap.moving),
      lastSeen: now
    });
  }

  for (const [id] of state.npcs) {
    if (!seen.has(id)) {
      state.npcs.delete(id);
    }
  }
}

function applyMobSnapshot(snapshotMobs) {
  const now = performance.now();
  const seen = new Set();

  for (const snap of snapshotMobs) {
    seen.add(snap.id);
    let mob = state.mobs.get(snap.id);

    if (!mob) {
      mob = {
        ...snap,
        renderX: snap.x,
        renderY: snap.y,
        targetX: snap.x,
        targetY: snap.y,
        lastSeen: now,
        walkPhase: 0
      };
      state.mobs.set(snap.id, mob);
      continue;
    }

    Object.assign(mob, snap, {
      targetX: snap.x,
      targetY: snap.y,
      lastSeen: now
    });
  }

  for (const [id] of state.mobs) {
    if (!seen.has(id)) {
      state.mobs.delete(id);
    }
  }
}

function applyCaravanSnapshot(snapshotCaravans) {
  const seen = new Set();
  for (const snap of snapshotCaravans) {
    seen.add(snap.id);
    let caravan = state.caravans.get(snap.id);
    if (!caravan) {
      caravan = { ...snap, renderX: snap.x, renderY: snap.y };
      state.caravans.set(snap.id, caravan);
      continue;
    }
    Object.assign(caravan, snap);
  }
  for (const [id] of state.caravans) {
    if (!seen.has(id)) state.caravans.delete(id);
  }
}

function applyCombatEvent(event) {
  if (event.hit && event.targetId && Number.isFinite(event.targetHp)) {
    if (event.targetKind === "player") {
      const player = state.players.get(event.targetId);
      if (player) {
        player.hp = event.targetHp;
        // Light up the personal shield bubble locally in the direction of the hit so the
        // glow is responsive (server snapshot will confirm on the next tick).
        if (event.shieldHit && player.shieldBuff) {
          const px = Number.isFinite(player.renderX) ? player.renderX : player.x;
          const py = Number.isFinite(player.renderY) ? player.renderY : player.y;
          const dx = Number(event.x) - px;
          const dy = Number(event.y) - py;
          const len = Math.hypot(dx, dy) || 1;
          player.shieldBuff.lastHitAt = Date.now();
          player.shieldBuff.lastHitDx = dx / len;
          player.shieldBuff.lastHitDy = dy / len;
        }
      }
    } else if (event.targetKind === "mob") {
      const mob = state.mobs.get(event.targetId);
      if (mob) {
        mob.hp = event.targetHp;
      }
    }
  }
  state.combatFx.push({
    ...event,
    createdAt: performance.now(),
    ttl:
      event.kind === "projectile"
        ? event.projectileKind === "fireball"
          ? 560
          : 420
        : event.hit && event.heal
          ? 520
          : event.hit
            ? 360
            : 220
  });
}

function updateSmoothPlayers(dt) {
  for (const player of state.players.values()) {
    if (clientMovementSampleChunksReady(player.renderX, player.renderY, PLAYER_COLLISION_RADIUS)) {
      player.renderSwimming = getTile(Math.floor(player.renderX), Math.floor(player.renderY)) === TILE.WATER;
    } else {
      player.renderSwimming = Boolean(player.swimming);
    }

    let isMoving = Boolean(player.moving);

    if (player.id === state.selfId) {
      isMoving = predictLocalPlayer(player, dt) || isMoving;
    }
    // Interpolation strategy:
    // - When local player is moving, ignore normal snapshot delay and only correct meaningful drift.
    // - When local player stops, ease toward server position slowly to avoid bouncing from network jitter.
    const slowBase = 0.01; // gentle correction when stopping
    let follow;
    if (player.id === state.selfId) {
      const localInputActive = Boolean(
        state.input.up ||
        state.input.down ||
        state.input.left ||
        state.input.right ||
        (player.ship?.boarded && (state.input.engage || state.input.fire || state.input.repair))
      );
      const err = Math.hypot(player.targetX - player.renderX, player.targetY - player.renderY);
      if (err > LOCAL_CORRECTION_SNAP_TILES) {
        player.renderX = player.targetX;
        player.renderY = player.targetY;
        player.renderMoving = false;
        continue;
      }
      if (localInputActive) {
        if (err <= LOCAL_CORRECTION_DEADZONE_TILES) {
          follow = 0;
        } else if (err <= LOCAL_CORRECTION_BLEND_THRESHOLD_TILES) {
          follow = 1 - Math.pow(0.45, dt);
        } else {
          follow = 1 - Math.pow(0.02, dt);
        }
      } else {
        follow = 1 - Math.pow(slowBase, dt);
      }
    } else {
      follow = 1 - Math.pow(0.0005, dt);
    }
    player.renderX += (player.targetX - player.renderX) * follow;
    player.renderY += (player.targetY - player.renderY) * follow;
    player.renderMoving = isMoving || Math.hypot(player.targetX - player.renderX, player.targetY - player.renderY) > 0.01;
    if (player.renderMoving || player.renderSwimming) {
      const rate = player.renderSwimming ? (player.renderMoving ? 6.4 : 2.9) : 9;
      player.walkPhase = (player.walkPhase || 0) + dt * rate;
      if (player.renderMoving && player.id === state.selfId) {
        /** Do not clear bench pose from render catch-up while server still reports idle. */
        if (!state.benchSeatIndefinite || isMoving) {
          state.benchSitUntil = 0;
          state.benchSeatIndefinite = false;
        }
      }
    }
  }

  const npcFollow = Math.min(1, 16 * dt);
  for (const npc of state.npcs.values()) {
    npc.renderX += (npc.targetX - npc.renderX) * npcFollow;
    npc.renderY += (npc.targetY - npc.renderY) * npcFollow;
    npc.renderMoving = Boolean(npc.moving) || Math.hypot(npc.targetX - npc.renderX, npc.targetY - npc.renderY) > 0.01;
    if (npc.renderMoving) {
      npc.walkPhase = (npc.walkPhase || 0) + dt * 8;
    }
  }

  for (const mob of state.mobs.values()) {
    mob.renderX += (mob.targetX - mob.renderX) * npcFollow;
    mob.renderY += (mob.targetY - mob.renderY) * npcFollow;
    mob.walkPhase = (mob.walkPhase || 0) + dt * 7;
  }

  const now = performance.now();
  state.combatFx = state.combatFx.filter((fx) => now - fx.createdAt < fx.ttl);
  state.spellFx = state.spellFx.filter((fx) => now - fx.createdAt < fx.ttl);
  state.levelUpFx = state.levelUpFx.filter((fx) => now - fx.createdAt < fx.ttl);
  updateAbilityCooldowns();
}

function createLevelUpFireworks() {
  const self = state.players.get(state.selfId);
  if (!self) {
    return;
  }

  const colors = ["#ffd166", "#5cc8ff", "#f26d6d", "#c79cff", "#8fe388"];
  for (let burst = 0; burst < 4; burst += 1) {
    const particles = [];
    const count = 18;
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + burst * 0.18;
      const speed = 34 + (i % 5) * 9;
      particles.push({
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[(i + burst) % colors.length]
      });
    }
    state.levelUpFx.push({
      x: self.renderX,
      y: self.renderY - 0.9 - burst * 0.18,
      particles,
      createdAt: performance.now() + burst * 120,
      ttl: 1250
    });
  }
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

// True when the viewer is sitting in a pilot / captain / copilot seat —
// either on their own boarded ship or as a passenger on someone else's.
function selfIsInPilotSeat(player = state.players.get(state.selfId)) {
  const role = player?.ship?.stationRole || null;
  if (!isPilotShipRole(role)) return false;
  // The snapshot copies player.shipStationRole into ship.stationRole, so the
  // role is set for both ship owners (boarded ship) and passengers (aboardShipId).
  return Boolean(player.ship?.boarded || player.aboardShipId);
}

function getInteriorShipView(player = state.players.get(state.selfId)) {
  if (!player) return null;
  if (selfIsInPilotSeat(player)) {
    // Pilots and captains see the exterior view, not the locked interior camera.
    return null;
  }
  // Owners walking around their own deck.
  const ownShip = player.ship?.boarded && player.ship.deckMode ? player.ship : null;
  // Passengers riding inside someone else's ship.
  const aboardShipId = typeof player.aboardShipId === "string" ? player.aboardShipId : null;
  let hostShip = ownShip;
  if (!hostShip && aboardShipId) {
    for (const other of state.players.values()) {
      if (other.ship?.id === aboardShipId && other.ship?.boarded && other.ship.deckMode) {
        hostShip = other.ship;
        break;
      }
    }
  }
  if (!hostShip) return null;
  const center = shipCenter(hostShip, player);
  const facing = Number.isFinite(Number(hostShip.facing)) ? Number(hostShip.facing) : Number(player?.facing) || 0;
  return {
    ship: hostShip,
    center,
    rotation: normalizeAngle(-facing)
  };
}

function getEffectiveWorldZoom(player = state.players.get(state.selfId)) {
  const baseZoom = state.zoom || 1;
  const role = player?.ship?.stationRole;
  if (selfIsInPilotSeat(player)) return baseZoom * 0.7;
  if (role === "gunner" || role === "engineer") return baseZoom * 0.5;
  return baseZoom;
}

function sciFiFeatureAtClient(x, y, kind = null) {
  if (!isSciFiWorld()) return null;
  for (const obj of state.spaceObjects.values()) {
    if (!obj || (kind && obj.kind !== kind)) continue;
    const w = Math.max(1, Number(obj.w || 1));
    const h = Math.max(1, Number(obj.h || 1));
    const minX = Number(obj.x) - Math.floor(w / 2);
    const minY = Number(obj.y) - Math.floor(h / 2);
    if (x >= minX && x < minX + w && y >= minY && y < minY + h) {
      return obj;
    }
  }
  return null;
}

function predictLocalPlayer(player, dt) {
  // Base speed; on-foot path scales this by CLIENT_SWIM_SPEED_MULT when
  // standing on a water tile (must match server SWIM_SPEED_MULT).
  const speed = Number.isFinite(player.moveSpeed) ? player.moveSpeed : CLIENT_PLAYER_SPEED;

  if (player.ship?.boarded && player.ship.deckMode) {
    const role = player.ship.stationRole;
    if (isPilotShipRole(role)) {
      const dx = Number(state.input.right) - Number(state.input.left);
      const dy = Number(state.input.down) - Number(state.input.up);
      const aimLength = Math.hypot(dx, dy);
      if (aimLength > 0) {
        player.facing = Math.atan2(dy, dx);
        player.ship.facing = player.facing;
      }
      if (state.input.engage) {
        const vx = Math.cos(player.facing) * speed * dt;
        const vy = Math.sin(player.facing) * speed * dt;
        player.renderX += vx;
        player.renderY += vy;
        player.ship.worldX = (Number(player.ship.worldX) || player.x) + vx;
        player.ship.worldY = (Number(player.ship.worldY) || player.y) + vy;
      }
      player.renderMoving = Boolean(state.input.engage);
      return true;
    }
    if (role) {
      if (role === "gunner") {
        const dx = Number(state.input.right) - Number(state.input.left);
        const dy = Number(state.input.down) - Number(state.input.up);
        if (Math.hypot(dx, dy) > 0) {
          player.facing = Math.atan2(dy, dx);
        }
      }
      player.renderMoving = Boolean((role === "engineer" && state.input.repair) || (role === "gunner" && state.input.fire));
      return true;
    }

    let dx = Number(state.input.right) - Number(state.input.left);
    let dy = Number(state.input.down) - Number(state.input.up);
    const length = Math.hypot(dx, dy);
    if (length === 0) {
      player.renderMoving = false;
      return false;
    }
    dx /= length;
    dy /= length;
    const next = clampPointToShipDeck(player.ship, player.renderX + dx * CLIENT_PLAYER_SPEED * 0.82 * dt, player.renderY + dy * CLIENT_PLAYER_SPEED * 0.82 * dt);
    player.renderX = next.x;
    player.renderY = next.y;
    player.facing = Math.atan2(dy, dx);
    player.renderMoving = true;
    return true;
  }

  if (player.ship?.boarded) {
    // WASD sets the ship's facing direction
    const dx = Number(state.input.right) - Number(state.input.left);
    const dy = Number(state.input.down) - Number(state.input.up);
    const aimLength = Math.hypot(dx, dy);
    if (aimLength > 0) {
      player.facing = Math.atan2(dy, dx);
    }
    // Engage thrusts forward in the facing direction
    if (state.input.engage) {
      let vx = Math.cos(player.facing) * speed * dt;
      let vy = Math.sin(player.facing) * speed * dt;
      const nextX = player.renderX + vx;
      const nextY = player.renderY + vy;
      if (!clientIsBlockedCircleForShip(nextX, player.renderY)) {
        player.renderX = nextX;
      }
      if (!clientIsBlockedCircleForShip(player.renderX, nextY)) {
        player.renderY = nextY;
      }
    }
    player.renderMoving = Boolean(state.input.engage);
    return true;
  }

  let dx = Number(state.input.right) - Number(state.input.left);
  let dy = Number(state.input.down) - Number(state.input.up);
  const length = Math.hypot(dx, dy);
  const inZeroG = Boolean(sciFiFeatureAtClient(Math.round(player.renderX), Math.round(player.renderY), "station-plaza"));

  if (inZeroG && length > 0) {
    player.zeroGDriftX = dx / length;
    player.zeroGDriftY = dy / length;
  }

  if (length === 0 && (!inZeroG || Math.hypot(Number(player.zeroGDriftX) || 0, Number(player.zeroGDriftY) || 0) === 0)) {
    player.zeroGDriftX = 0;
    player.zeroGDriftY = 0;
    player.renderMoving = false;
    return false;
  }

  if (length > 0) {
    dx /= length;
    dy /= length;
  } else {
    dx = Number(player.zeroGDriftX) || 0;
    dy = Number(player.zeroGDriftY) || 0;
  }
  const swimMult = clientIsSwimmingAt(player.renderX, player.renderY) ? CLIENT_SWIM_SPEED_MULT : 1;
  const stepSpeed = speed * (inZeroG ? 0.74 : 1) * swimMult;
  const stepX = dx * stepSpeed * dt;
  const stepY = dy * stepSpeed * dt;

  const moved = clientTryFootMove(player.renderX, player.renderY, stepX, stepY);
  if (!moved.moved) {
    player.renderMoving = false;
    return false;
  }
  player.renderX = moved.x;
  player.renderY = moved.y;
  player.facing = Math.atan2(dy, dx);
  player.renderMoving = true;
  return true;
}

function initTradeSlotGrids() {
  if (!tradeYourSlots || tradeYourSlots.childElementCount > 0) return;
  for (let i = 0; i < 6; i += 1) {
    const y = document.createElement("div");
    y.className = "trade-slot";
    y.dataset.tradeSlot = String(i);
    y.textContent = "Drop";
    tradeYourSlots.appendChild(y);
    const t = document.createElement("div");
    t.className = "trade-slot";
    t.dataset.theirSlot = String(i);
    tradeTheirSlots.appendChild(t);
  }
}

function findNearbyOtherPlayer(worldX, worldY, maxDist = 1.05) {
  let best = null;
  let bestD = maxDist;
  for (const p of state.players.values()) {
    if (p.id === state.selfId) continue;
    const d = Math.hypot(p.renderX - worldX, p.renderY - worldY);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

function hidePlayerContextMenu() {
  state.playerContextMenu = null;
  playerContextMenu?.classList.add("hidden");
}

function showPlayerContextMenu(clientX, clientY, targetId) {
  state.playerContextMenu = { targetId, clientX, clientY };
  if (!playerContextMenu) return;
  playerContextMenu.classList.remove("hidden");
  playerContextMenu.style.left = `${Math.min(clientX, window.innerWidth - 140)}px`;
  playerContextMenu.style.top = `${Math.min(clientY, window.innerHeight - 120)}px`;
}

function tryOpenPlayerContextMenuFromCanvas(event, worldX, worldY) {
  const target = findNearbyOtherPlayer(worldX, worldY, 1.05);
  if (!target) return false;
  event.preventDefault();
  event.stopPropagation();
  showPlayerContextMenu(event.clientX, event.clientY, target.id);
  return true;
}

const NPC_CTX_HIT_RADIUS = 1.8;
const NPC_CTX_PLAYER_RADIUS = 9;
const HOUSE_COMPANION_CTX_HIT_RADIUS = 1.45;

function hideNpcContextMenu() {
  state.npcContext = null;
  npcContextMenu?.classList.add("hidden");
}

function showNpcContextMenu(npc) {
  const self = state.players.get(state.selfId);
  if (!self) return;
  const nx = Number.isFinite(npc.renderX) ? npc.renderX : npc.x;
  const ny = Number.isFinite(npc.renderY) ? npc.renderY : npc.y;
  const sx = Number.isFinite(self.renderX) ? self.renderX : self.x;
  const sy = Number.isFinite(self.renderY) ? self.renderY : self.y;
  if (Math.hypot(nx - sx, ny - sy) > NPC_CTX_PLAYER_RADIUS) return;

  const kind = npc.questGiver ? "quest" : npc.bondTag ? "romance" : npc.wandersToPlayer ? "hawker" : "comment";
  state.npcContext = { npcId: npc.id, kind };

  if (npcContextMenuName) npcContextMenuName.textContent = npc.name || "";
  if (npcContextMenuButtons) {
    npcContextMenuButtons.replaceChildren();
    if (kind === "quest") {
      const questBtn = document.createElement("button");
      questBtn.dataset.npcAction = "quest";
      questBtn.textContent = "Quest";
      const shooBtn = document.createElement("button");
      shooBtn.dataset.npcAction = "shoo";
      shooBtn.className = "npc-ctx-shoo";
      shooBtn.textContent = "Shoo";
      npcContextMenuButtons.append(questBtn, shooBtn);
    } else if (kind === "romance") {
      const self = state.players.get(state.selfId);
      const isMyFollower = npc.wandersToFlirt && self?.flirtFollowNpcId === npc.id;
      if (!isMyFollower) {
        const buyBtn = document.createElement("button");
        buyBtn.dataset.npcAction = npc.wandersToFlirt ? "pursue_flirt" : "buy_companion";
        buyBtn.textContent = npc.bondTag === "bf" ? "Pursue him" : "Pursue her";
        npcContextMenuButtons.append(buyBtn);
      }
      const shooBtn = document.createElement("button");
      shooBtn.dataset.npcAction = "shoo";
      shooBtn.className = "npc-ctx-shoo";
      shooBtn.textContent = isMyFollower ? "Say goodbye" : "Shoo";
      npcContextMenuButtons.append(shooBtn);
    } else if (kind === "hawker") {
      const shopBtn = document.createElement("button");
      shopBtn.dataset.npcAction = "shop";
      shopBtn.textContent = "Trade";
      const shooBtn = document.createElement("button");
      shooBtn.dataset.npcAction = "shoo";
      shooBtn.className = "npc-ctx-shoo";
      shooBtn.textContent = "Shoo";
      npcContextMenuButtons.append(shopBtn, shooBtn);
    } else {
      const shooBtn = document.createElement("button");
      shooBtn.dataset.npcAction = "shoo";
      shooBtn.className = "npc-ctx-shoo";
      shooBtn.textContent = "Shoo";
      npcContextMenuButtons.append(shooBtn);
    }
  }

  positionNpcContextMenu(nx, ny);
  npcContextMenu?.classList.remove("hidden");
}

function positionNpcContextMenu(worldX, worldY) {
  if (!npcContextMenu) return;
  const zoom = state.zoom || 1;
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const cssScale = canvas.clientWidth / canvas.width;
  const screenX = ((worldX * TILE_SIZE - state.camera.x) * zoom + halfW) * cssScale;
  const screenY = ((worldY * TILE_SIZE - state.camera.y) * zoom + halfH) * cssScale;
  const rect = canvas.getBoundingClientRect();
  const absX = rect.left + screenX;
  const absY = rect.top + screenY - 64;
  const menuW = npcContextMenu.offsetWidth || 140;
  const clampedX = Math.max(menuW / 2 + 4, Math.min(window.innerWidth - menuW / 2 - 4, absX));
  const clampedY = Math.max(rect.top + 4, Math.min(window.innerHeight - 80, absY));
  npcContextMenu.style.left = `${clampedX}px`;
  npcContextMenu.style.top = `${clampedY}px`;
}

function tickNpcContextMenuPosition() {
  if (!state.npcContext) return;
  if (state.npcContext.kind === "house_companion") {
    const self = state.players.get(state.selfId);
    if (!self?.houseCompanion || !self.homeBuildingKey) {
      hideNpcContextMenu();
      return;
    }
    const building = [...state.buildings.values()].find((b) => `${b.x},${b.y}` === self.homeBuildingKey);
    if (!building) {
      hideNpcContextMenu();
      return;
    }
    const px = Number.isFinite(self.renderX) ? self.renderX : self.x;
    const py = Number.isFinite(self.renderY) ? self.renderY : self.y;
    if (!worldPointInsideBuildingInterior(px, py, building, 0.55)) {
      hideNpcContextMenu();
      return;
    }
    const lay = resolveHouseCompanionPhantomLayout(self, building);
    if (!lay) {
      hideNpcContextMenu();
      return;
    }
    positionNpcContextMenu(lay.wx, lay.wy);
    return;
  }
  const npc = state.npcs.get(state.npcContext.npcId);
  if (!npc) { hideNpcContextMenu(); return; }
  const self = state.players.get(state.selfId);
  if (!self) { hideNpcContextMenu(); return; }
  const nx = Number.isFinite(npc.renderX) ? npc.renderX : npc.x;
  const ny = Number.isFinite(npc.renderY) ? npc.renderY : npc.y;
  const sx = Number.isFinite(self.renderX) ? self.renderX : self.x;
  const sy = Number.isFinite(self.renderY) ? self.renderY : self.y;
  if (Math.hypot(nx - sx, ny - sy) > NPC_CTX_PLAYER_RADIUS + 1) {
    hideNpcContextMenu();
    return;
  }
  positionNpcContextMenu(nx, ny);
}

function showHouseCompanionContextMenu(companionName) {
  const self = state.players.get(state.selfId);
  if (!self?.houseCompanion || !self.homeBuildingKey) return;
  const building = [...state.buildings.values()].find((b) => `${b.x},${b.y}` === self.homeBuildingKey);
  if (!building) return;
  const px = Number.isFinite(self.renderX) ? self.renderX : self.x;
  const py = Number.isFinite(self.renderY) ? self.renderY : self.y;
  if (!worldPointInsideBuildingInterior(px, py, building, 0.55)) return;
  const lay = resolveHouseCompanionPhantomLayout(self, building);
  if (!lay) return;

  state.npcContext = { npcId: "__house_companion__", kind: "house_companion" };
  if (npcContextMenuName) npcContextMenuName.textContent = companionName || "Partner";
  if (npcContextMenuButtons) {
    npcContextMenuButtons.replaceChildren();
    const chatBtn = document.createElement("button");
    chatBtn.dataset.npcAction = "hc_chat";
    chatBtn.textContent = "Chat";
    const breakBtn = document.createElement("button");
    breakBtn.dataset.npcAction = "hc_breakup";
    breakBtn.textContent = "Break up";
    breakBtn.className = "npc-ctx-shoo";
    const rpBtn = document.createElement("button");
    rpBtn.dataset.npcAction = "hc_intimate";
    rpBtn.textContent = "Make rumpi pumpi";
    npcContextMenuButtons.append(chatBtn, rpBtn, breakBtn);
  }
  positionNpcContextMenu(lay.wx, lay.wy);
  npcContextMenu?.classList.remove("hidden");
}

function tryOpenHouseCompanionMenu(event, worldX, worldY) {
  const self = state.players.get(state.selfId);
  if (!self?.houseCompanion || !self.homeBuildingKey) return false;
  const playerBuilding = getPlayerBuilding();
  if (!playerBuilding) return false;
  if (`${playerBuilding.x},${playerBuilding.y}` !== self.homeBuildingKey) return false;
  if (playerBuilding.isPub) return false;
  const typ = playerBuilding.type || "house";
  if (!(typ === "house" || typ === "big_house")) return false;

  const lay = resolveHouseCompanionPhantomLayout(self, playerBuilding);
  if (!lay) return false;
  const d = Math.hypot(lay.wx - worldX, lay.wy - worldY);
  if (d > HOUSE_COMPANION_CTX_HIT_RADIUS) return false;

  event.preventDefault();
  event.stopPropagation();
  hidePlayerContextMenu();
  const nm = typeof self.houseCompanion.name === "string" ? self.houseCompanion.name : "Partner";
  showHouseCompanionContextMenu(nm);
  return true;
}

function tryOpenNpcContextMenuFromCanvas(event, worldX, worldY) {
  const self = state.players.get(state.selfId);
  if (!self) return false;
  const sx = Number.isFinite(self.renderX) ? self.renderX : self.x;
  const sy = Number.isFinite(self.renderY) ? self.renderY : self.y;
  let best = null;
  let bestDist = NPC_CTX_HIT_RADIUS;
  for (const npc of state.npcs.values()) {
    // Quest givers + active approachers are all clickable.
    if (!npc.wandersToPlayer && !npc.bondTag && !npc.wandersToFlirt && !npc.questGiver) continue;
    const nx = Number.isFinite(npc.renderX) ? npc.renderX : npc.x;
    const ny = Number.isFinite(npc.renderY) ? npc.renderY : npc.y;
    const d = Math.hypot(nx - worldX, ny - worldY);
    if (d > bestDist) continue;
    if (Math.hypot(nx - sx, ny - sy) > NPC_CTX_PLAYER_RADIUS) continue;
    bestDist = d;
    best = npc;
  }
  if (!best) return false;
  event.preventDefault();
  event.stopPropagation();
  hidePlayerContextMenu();
  // Pure quest givers (no romance / hawker behaviour) open the quest dialog directly.
  if (best.questGiver && !best.bondTag && !best.wandersToFlirt && !best.wandersToPlayer) {
    send({ type: "questNpc", npcId: best.id });
    return true;
  }
  showNpcContextMenu(best);
  return true;
}

function renderFriendsInto(el) {
  if (!el) return;
  el.replaceChildren();
  const list = Array.isArray(state.friends) ? state.friends : [];
  if (!list.length) {
    el.appendChild(document.createTextNode("No friends yet — click another player and choose Add friend."));
    return;
  }
  for (const row of list) {
    const div = document.createElement("div");
    div.className = "friend-row";
    const left = document.createElement("span");
    left.style.display = "flex";
    left.style.alignItems = "center";
    const dot = document.createElement("span");
    dot.className = `dot ${row.online ? "on" : "off"}`;
    left.appendChild(dot);
    left.appendChild(document.createTextNode(row.name || row.accountKey || "?"));
    div.appendChild(left);
    el.appendChild(div);
  }
}

function setChatSubTab(tab) {
  state.chatSubTab = tab;
  document.querySelectorAll(".chat-tab").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.chatTab === tab);
  });
  const isFriends = tab === "friends";
  chatMessages?.classList.toggle("hidden", isFriends);
  chatFriendsPane?.classList.toggle("hidden", !isFriends);
  chatForm?.classList.toggle("hidden", isFriends);
  if (isFriends) renderFriendsInto(chatFriendsPane);
}

function applyPartySnapshot(party) {
  state.party = party && party.members?.length ? party : null;
  renderPartyPanel();
}

function renderPartyPanel() {
  if (!partyPanel || !partyMembersEl) return;
  const p = state.party;
  if (!p || !p.members?.length) {
    partyPanel.classList.add("hidden");
    return;
  }
  partyPanel.classList.remove("hidden");
  if (state.partyPanelMinimized) {
    partyPanel.classList.add("minimized");
  } else {
    partyPanel.classList.remove("minimized");
  }
  partyMembersEl.replaceChildren();
  for (const m of p.members) {
    const row = document.createElement("div");
    row.className = "party-member-row";
    const nm = document.createElement("span");
    nm.textContent = m.offline ? `${m.name} (off)` : m.name;
    const bar = document.createElement("div");
    bar.className = "hpbar";
    const inner = document.createElement("span");
    const pct = m.maxHp > 0 ? Math.max(0, Math.min(1, m.hp / m.maxHp)) : 0;
    inner.style.width = `${Math.round(pct * 100)}%`;
    bar.appendChild(inner);
    row.appendChild(nm);
    row.appendChild(bar);
    partyMembersEl.appendChild(row);
  }
}

function toggleFriendsWindow() {
  state.friendsWindowOpen = !state.friendsWindowOpen;
  if (friendsWindow) {
    friendsWindow.classList.toggle("hidden", !state.friendsWindowOpen);
  }
  if (state.friendsWindowOpen) {
    renderFriendsInto(friendsWindowList);
  }
}

function openTradeUi(partnerId, msg) {
  state.tradePartnerId = partnerId;
  tradePanel?.classList.remove("hidden");
  if (tradeTitle && msg?.partnerName) tradeTitle.textContent = `Trade — ${msg.partnerName}`;
  syncTradeUi(msg || {});
}

function closeTradeUi() {
  state.tradePartnerId = null;
  tradePanel?.classList.add("hidden");
  if (tradeYourLock) tradeYourLock.checked = false;
}

function syncTradeUi(msg) {
  if (!tradeYourSlots || !tradeTheirSlots) return;
  const ys = msg.selfSlots || [];
  const ts = msg.otherSlots || [];
  tradeYourSlots.querySelectorAll(".trade-slot").forEach((el, i) => {
    const ix = ys[i];
    const inv = typeof ix === "number" && state.inventory ? state.inventory[ix] : null;
    el.textContent = inv ? inv.name.slice(0, 18) : "Drop";
    el.classList.toggle("filled", Boolean(inv));
    el.dataset.invIndex = ix != null ? String(ix) : "";
  });
  const onames = msg.otherSlotNames || [];
  tradeTheirSlots.querySelectorAll(".trade-slot").forEach((el, i) => {
    const nm = onames[i];
    el.textContent = nm ? String(nm).slice(0, 22) : ts[i] != null ? "Item" : "—";
    el.classList.toggle("filled", Boolean(ts[i] != null));
  });
  if (tradeYourGold) tradeYourGold.value = String(msg.selfGold ?? 0);
  if (tradeTheirGold) tradeTheirGold.textContent = String(msg.otherGold ?? 0);
  if (tradeTheirReady) tradeTheirReady.textContent = msg.otherReady ? "Ready" : "Not ready";
  if (tradeYourLock) tradeYourLock.checked = Boolean(msg.selfReady);
}

function wireUi() {
  initTradeSlotGrids();
  document.querySelectorAll("[data-class]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedClass = button.dataset.class;
      document.querySelectorAll("[data-class]").forEach((item) => {
        item.classList.toggle("selected", item === button);
      });
    });
  });

  document.querySelectorAll("[data-torso-style]").forEach((button) => {
    button.addEventListener("click", () => {
      state.torsoStyle = button.dataset.torsoStyle;
      document.querySelectorAll("[data-torso-style]").forEach((item) => {
        item.classList.toggle("selected", item === button);
      });
    });
  });

  document.querySelectorAll("[data-weapon-style]").forEach((button) => {
    button.addEventListener("click", () => {
      state.weaponStyle = button.dataset.weaponStyle;
      document.querySelectorAll("[data-weapon-style]").forEach((item) => {
        item.classList.toggle("selected", item === button);
      });
    });
  });

  document.querySelectorAll(".swatches").forEach((group) => {
    group.addEventListener("click", (event) => {
      const button = event.target.closest(".swatch");
      if (!button) {
        return;
      }
      const target = group.dataset.target;
      state[target] = button.dataset.color;
      group.querySelectorAll(".swatch").forEach((item) => {
        item.classList.toggle("selected", item === button);
      });
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!state.connected || state.joined) {
      return;
    }
    if (!state.authenticated) {
      setStatus("Log in before creating a character");
      return;
    }

    playButton.disabled = true;
    send({
      type: "hello",
      name: nameInput.value,
      classId: state.selectedClass,
      torsoStyle: state.torsoStyle,
      weaponStyle: state.weaponStyle,
      torsoColor: state.torsoColor,
      weaponColor: state.weaponColor,
      primary: state.torsoColor,
      accent: state.weaponColor
    });
  });

  accountForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!state.connected || state.joined) {
      return;
    }
    const submitter = event.submitter;
    const action = submitter?.value === "create" ? "create" : "login";
    loginButton.disabled = true;
    createAccountButton.disabled = true;
    setStatus(action === "create" ? "Creating account" : "Logging in");
    send({
      type: "auth",
      action,
      username: usernameInput.value,
      password: passwordInput.value
    });
  });

  serverForm.addEventListener("submit", (event) => {
    event.preventDefault();
    changeServer(menuServerUrlInput.value);
  });

  modTimeApply?.addEventListener("click", () => {
    setWorldTimeFromMenu(modTimeHourInput?.value);
  });
  document.querySelectorAll("[data-mod-time]").forEach((button) => {
    button.addEventListener("click", () => {
      if (modTimeHourInput) {
        modTimeHourInput.value = button.dataset.modTime;
      }
      setWorldTimeFromMenu(button.dataset.modTime);
    });
  });

  // Delegated handler for the Character window
  equipmentPanel.addEventListener("click", (e) => {
    // Open talents window
    if (e.target.closest("#talentsButton")) {
      toggleGameWindow("talent");
      return;
    }
  });

  equipmentPanel.addEventListener("pointerdown", (e) => {
    const statBtn = e.target.closest("[data-stat]");
    if (statBtn && !statBtn.disabled) {
      e.preventDefault();
      e.stopPropagation();
      const fresh = state.players.get(state.selfId);
      if (!fresh || (fresh.statPoints || 0) < 1) return;
      fresh.statPoints -= 1;
      fresh.stats = Object.assign({}, fresh.stats);
      fresh.stats[statBtn.dataset.stat] = (fresh.stats[statBtn.dataset.stat] || 0) + 1;
      renderEquipment();
      send({ type: "spendStat", stat: statBtn.dataset.stat });
      return;
    }
  });

  // Delegated handler for the Talent window
  talentPanel.addEventListener("pointerdown", (e) => {
    // Unlock talent (optimistic)
    const unlockBtn = e.target.closest("[data-unlock-talent]");
    if (unlockBtn) {
      e.preventDefault();
      e.stopPropagation();
      const talentId = unlockBtn.dataset.unlockTalent;
      const fresh = state.players.get(state.selfId);
      if (!fresh || (fresh.talentPoints || 0) < 1) return;
      fresh.talents = { ...(fresh.talents || {}), [talentId]: true };
      fresh.talentPoints -= 1;
      fresh.abilityBar = (fresh.abilityBar || [null, null, null, null, null]).slice();
      const freeSlot = fresh.abilityBar.findIndex(s => s === null);
      if (freeSlot !== -1) fresh.abilityBar[freeSlot] = talentId;
      renderTalentPanel();
      renderAbilityBar();
      send({ type: "spendTalent", talentId });
      return;
    }
    // Equip talent to ability bar (optimistic)
    const equipBtn = e.target.closest("[data-equip-talent]");
    if (equipBtn) {
      e.preventDefault();
      e.stopPropagation();
      const spellId = equipBtn.dataset.equipTalent;
      const fresh = state.players.get(state.selfId);
      const freeSlot = (fresh?.abilityBar || []).findIndex(s => s === null);
      if (freeSlot === -1) return;
      fresh.abilityBar = (fresh.abilityBar || [null, null, null, null, null]).slice();
      fresh.abilityBar[freeSlot] = spellId;
      renderAbilityBar();
      send({ type: "setAbilitySlot", slot: freeSlot, spellId });
      renderTalentPanel();
      return;
    }
  });

  equipmentButton.addEventListener("click", () => {
    toggleGameWindow("equipment");
  });

  bagsButton.addEventListener("click", () => {
    toggleGameWindow("bags");
  });

  questsButton?.addEventListener("click", () => {
    toggleGameWindow("quests");
  });

  equipmentClose.addEventListener("click", () => setActiveGameWindow(null));
  bagsClose.addEventListener("click", () => setActiveGameWindow(null));
  questClose?.addEventListener("click", () => setActiveGameWindow(null));
  talentClose.addEventListener("click", () => setActiveGameWindow(null));

  document.querySelector("#talentResetBtn")?.addEventListener("click", () => {
    send({ type: "resetTalents" });
  });

  shopClose?.addEventListener("click", () => {
    closeShop();
  });

  shipTerminalClose?.addEventListener("click", () => {
    closeShipTerminal();
  });

  teleportMenuCloseBtn?.addEventListener("click", () => closeTeleportMenu());
  teleportHotbarBtn?.addEventListener("click", () => {
    if (!state.joined || state.menuOpen) return;
    send({ type: "teleportMenuOpen" });
  });
  teleportMenuPanel?.addEventListener("pointerdown", (event) => {
    const row = event.target.closest("[data-teleport-kind]");
    if (!row || !state.teleportMenu?.open) return;
    event.preventDefault();
    event.stopPropagation();
    send({
      type: "teleportMenuTravel",
      kind: row.dataset.teleportKind,
      id: row.dataset.teleportId
    });
    closeTeleportMenu();
  });

  questOfferAcceptBtn?.addEventListener("click", () => {
    if (!state.questOffer?.quest?.id) return;
    send({ type: "questAccept", questId: state.questOffer.quest.id, npcId: state.questOffer.npcId });
    closeQuestOffer();
  });
  questOfferDeclineBtn?.addEventListener("click", () => closeQuestOffer());
  questOfferCloseBtn?.addEventListener("click", () => closeQuestOffer());

  traderClose.addEventListener("click", () => {
    setActiveGameWindow(null);
  });

  buyHouseClose?.addEventListener("click", () => closeBuyHousePanel());
  buyHouseCancel?.addEventListener("click", () => closeBuyHousePanel());
  buyHouseConfirm?.addEventListener("click", () => confirmBuyHouseFromPanel());

  companionOfferClose?.addEventListener("click", () => closeCompanionInvitePanel());
  companionOfferDecline?.addEventListener("click", () => closeCompanionInvitePanel());
  companionOfferAccept?.addEventListener("click", () => {
    const inv = state.pendingCompanionInvite;
    if (!inv?.npcId || !state.joined) return;
    send({ type: "buyCompanion", npcId: inv.npcId, confirm: true });
    closeCompanionInvitePanel();
  });

  traderStock.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-trader-buy]");
    if (!button || !state.traderNpcId) return;
    event.preventDefault();
    send({ type: "buyItem", npcId: state.traderNpcId, index: Number(button.dataset.traderBuy) });
  });

  traderSellSlots.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-trader-sell]");
    if (!button || !state.traderNpcId) return;
    event.preventDefault();
    send({ type: "sellItem", npcId: state.traderNpcId, slot: Number(button.dataset.traderSell) });
  });

  questList?.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-abandon-quest]");
    if (!button) return;
    event.preventDefault();
    send({ type: "abandonQuest", questId: button.dataset.abandonQuest });
  });

  interactButton.addEventListener("click", () => {
    const self = state.players.get(state.selfId);
    if (!self || !tryOpenBuyHouseNearPlayer()) {
      sendInteract();
    }
  });

  equipmentPanel.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-equipment-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const equipmentSlot = button.dataset.equipmentSlot;
    if (button.dataset.equipmentAction === "unequip") {
      send({ type: "unequipItem", equipmentSlot, drop: false });
    } else if (button.dataset.equipmentAction === "drop") {
      send({ type: "unequipItem", equipmentSlot, drop: true });
    }
  });

  // Ability bar toggle
  abilityBarToggle.addEventListener("click", () => {
    const minimized = abilityBar.classList.toggle("minimized");
    abilityBarToggle.textContent = minimized ? "+" : "−";
    const selfMid = state.players.get(state.selfId);
    syncSafeZoneIndicator(selfMid);
    syncHomeTeleportSlot(selfMid);
  });
  abilityBarToggle.addEventListener(
    "pointerdown",
    (event) => {
      if (!(event.pointerType === "touch" || event.pointerType === "pen")) return;
      event.preventDefault();
      const minimized = abilityBar.classList.toggle("minimized");
      abilityBarToggle.textContent = minimized ? "+" : "−";
      const selfMid = state.players.get(state.selfId);
      syncSafeZoneIndicator(selfMid);
      syncHomeTeleportSlot(selfMid);
    },
    { passive: false }
  );

  safeZoneIndicator?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (safeZoneIndicator.classList.contains("hidden")) return;
    safeZoneIndicator.classList.add("safe-zone-tooltip-pinned");
    clearTimeout(safeZoneTooltipPinTimer);
    safeZoneTooltipPinTimer = setTimeout(() => {
      safeZoneIndicator?.classList.remove("safe-zone-tooltip-pinned");
      safeZoneTooltipPinTimer = null;
    }, 2600);
  });

  safeZoneIndicator?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    safeZoneIndicator?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  // Ability slot right-click to clear
  abilitySlotsEl.addEventListener("contextmenu", (event) => {
    const slot = event.target.closest("[data-slot]");
    if (!slot) return;
    event.preventDefault();
    send({ type: "setAbilitySlot", slot: Number(slot.dataset.slot), spellId: null });
  });

  /** Mobile & pen: numeric keys often absent — pointerdown activates without waiting for synthetic click latency */
  const abilityTapGuard = { t: 0, ix: -1 };
  abilitySlotsEl.addEventListener(
    "pointerdown",
    (event) => {
      if (!state.joined || state.menuOpen || abilityBar.classList.contains("minimized")) return;
      if (!(event.pointerType === "touch" || event.pointerType === "pen")) return;
      const slot = event.target.closest(".ability-slot[data-slot]");
      if (!slot) return;
      const ix = Number(slot.dataset.slot);
      if (!Number.isFinite(ix)) return;
      event.preventDefault();
      const now = performance.now();
      if (abilityTapGuard.ix === ix && now - abilityTapGuard.t < 420) return;
      abilityTapGuard.t = now;
      abilityTapGuard.ix = ix;
      castAbilitySlot(ix);
    },
    { passive: false }
  );

  abilitySlotsEl.addEventListener("click", (event) => {
    if (!state.joined || state.menuOpen || abilityBar.classList.contains("minimized")) return;
    const slot = event.target.closest(".ability-slot[data-slot]");
    if (!slot) return;
    const ix = Number(slot.dataset.slot);
    if (!Number.isFinite(ix)) return;
    const now = performance.now();
    /** Touch path already cast on pointerdown; skip delayed synthetic click doubling abilities */
    if (abilityTapGuard.ix === ix && now - abilityTapGuard.t < 450) return;
    event.preventDefault();
    castAbilitySlot(ix);
  });

  /** Potion / home teleport: touch needs pointer handlers (click alone misses on some browsers) */
  potionSlotEl?.addEventListener(
    "pointerdown",
    (event) => {
      if (!(event.pointerType === "touch" || event.pointerType === "pen")) return;
      if (!state.joined || state.menuOpen) return;
      event.preventDefault();
      usePotionOrShipExit();
    },
    { passive: false }
  );
  potionSlotEl?.addEventListener("click", () => {
    if (!state.joined || state.menuOpen) return;
    usePotionOrShipExit();
  });

  // Ship station button — held to thrust, fire, or repair depending on the active seat.
  const shipEngageEl = document.getElementById("shipEngageBtn");
  if (shipEngageEl) {
    function setShipStationButton(active, e) {
      if (!state.joined || state.menuOpen || !isSelfOnShip()) return;
      e.preventDefault();
      const role = selfShipStationRole();
      if (!role) {
        if (active) sendInteract();
        return;
      }
      state.input.engage = Boolean(active && isPilotShipRole(role));
      state.input.fire = Boolean(active && role === "gunner");
      state.input.repair = Boolean(active && role === "engineer");
      sendInput();
    }
    shipEngageEl.addEventListener("pointerdown", (e) => setShipStationButton(true, e), { passive: false });
    shipEngageEl.addEventListener("pointerup", (e) => setShipStationButton(false, e), { passive: false });
    shipEngageEl.addEventListener("pointerleave", (e) => setShipStationButton(false, e), { passive: false });
    shipEngageEl.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  homeTeleportSlotEl?.addEventListener(
    "pointerdown",
    (event) => {
      if (!(event.pointerType === "touch" || event.pointerType === "pen")) return;
      if (!state.joined || state.menuOpen) return;
      const self = state.players.get(state.selfId);
      if (!self?.homeBuildingKey) return;
      event.preventDefault();
      sendHome();
    },
    { passive: false }
  );
  homeTeleportSlotEl?.addEventListener("click", () => {
    if (!state.joined || state.menuOpen) return;
    const self = state.players.get(state.selfId);
    if (!self?.homeBuildingKey) return;
    sendHome();
  });
  homeTeleportSlotEl?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    homeTeleportSlotEl.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  makeDraggable(equipmentPanel);
  makeDraggable(bagsPanel);
  makeDraggable(shopPanel);
  makeDraggable(shipTerminalPanel);
  makeDraggable(traderPanel);
  if (buyHousePanel) makeDraggable(buyHousePanel);
  if (companionOfferPanel) makeDraggable(companionOfferPanel);
  makeDraggable(talentPanel);
  if (tradePanel) makeDraggable(tradePanel);

  // Delegated dragstart for ability slots (avoids listener accumulation across renders)
  abilitySlotsEl.addEventListener("dragstart", (e) => {
    const slotEl = e.target.closest("[data-slot]");
    if (!slotEl) return;
    const spellId = slotEl.dataset.currentSpell;
    if (!spellId) { e.preventDefault(); return; }
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: "abilitySlot", fromSlot: Number(slotEl.dataset.slot) }));
    e.dataTransfer.effectAllowed = "move";
  });

  function handleAbilityBarDrop(e) {
    e.preventDefault();
    const slotEl = e.target.closest("[data-slot]");
    if (!slotEl) return;
    const targetSlot = Number(slotEl.dataset.slot);
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.type === "inventory") {
        send({ type: "setAbilitySlot", slot: targetSlot, spellId: `item:${data.slot}` });
      } else if (data.type === "abilitySlot") {
        const fromSlot = data.fromSlot;
        if (fromSlot !== targetSlot) {
          send({ type: "swapAbilitySlots", fromSlot, toSlot: targetSlot });
        }
      }
    } catch {}
  }

  abilitySlotsEl.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; });
  abilitySlotsEl.addEventListener("drop", handleAbilityBarDrop);

  inventorySlots.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-inventory-action]");
    if (button) {
      event.preventDefault();
      event.stopPropagation();
      const slot = Number(button.dataset.slot);
      const action = button.dataset.inventoryAction;
      if (action === "equip") {
        send({ type: "equipItem", slot, equipmentSlot: button.dataset.equipmentSlot || null });
      } else if (action === "use") {
        send({ type: "useItem", slot });
      } else if (action === "drop") {
        send({ type: "dropItem", slot });
      } else if (action === "storeChest") {
        send({ type: "houseChestAction", action: "deposit", invSlot: slot });
      }
      return;
    }
    if (tradePanel && !tradePanel.classList.contains("hidden")) {
      const cell = event.target.closest("[data-inv-slot]");
      if (cell) {
        const ix = Number(cell.dataset.invSlot);
        if (Number.isInteger(ix)) {
          state.tradeDragInvSlot = ix;
        }
      }
    }
  });

  houseChestSlotsEl?.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-house-chest-withdraw]");
    if (!button || !state.houseChestBuildingKey) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const chestSlot = Number(button.dataset.houseChestWithdraw);
    if (!Number.isInteger(chestSlot) || chestSlot < 0 || chestSlot >= HOUSE_CHEST_SLOTS) {
      return;
    }
    send({ type: "houseChestAction", action: "withdraw", chestSlot });
  });

  shopPanel?.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-shop-action]");
    if (!button || !state.shop?.open) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const payload = {
      x: state.shop.x,
      y: state.shop.y
    };
    if (button.dataset.shopAction === "buy") {
      send({ type: "shopBuy", templateId: button.dataset.templateId, ...payload });
    } else if (button.dataset.shopAction === "sell") {
      send({ type: "shopSell", slot: Number(button.dataset.slot), ...payload });
    }
  });

  shopPanel?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  shipTerminalPanel?.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-ship-terminal-action]");
    if (!button || !state.shipTerminal?.open) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const port = state.shipTerminal.port || {};
    send({
      type: "shipTerminalAction",
      action: button.dataset.shipTerminalAction,
      shipId: button.dataset.shipId,
      ownerId: button.dataset.ownerId || undefined,
      x: Number.isFinite(port.terminalX) ? port.terminalX : port.x,
      y: Number.isFinite(port.terminalY) ? port.terminalY : port.y
    });
  });

  shipTerminalPanel?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  resumeButton.addEventListener("click", () => {
    closeMenu();
  });

  logoutButton?.addEventListener("click", () => {
    logout();
  });

  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!text) {
      return;
    }
    hideCmdPalette();
    if (text.startsWith("/")) {
      const cmd = text.toLowerCase();
      if (cmd === "/sci") {
        send({ type: "sciFiTeleport" });
        chatInput.value = "";
        return;
      }
      if (cmd === "/stuck") {
        send({ type: "home" });
        chatInput.value = "";
        return;
      }
      if (cmd === "/home") {
        sendHome();
        chatInput.value = "";
        return;
      }
      const emoteKind = cmd.slice(1);
      if (CHAT_COMMANDS.some((c) => c.kind === emoteKind)) {
        send({ type: "emote", kind: emoteKind });
        const self = state.players.get(state.selfId);
        if (self) self.emote = emoteKind;
        chatInput.value = "";
        return;
      }
    }
    send({ type: "chat", text });
    chatInput.value = "";
  });

  chatInput?.addEventListener("input", () => {
    cmdPaletteActiveIdx = -1;
    updateCmdPalette();
  });

  chatInput?.addEventListener("keydown", (event) => {
    const palette = document.getElementById("cmdPalette");
    const paletteVisible = palette && !palette.classList.contains("hidden");

    if (paletteVisible) {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        cmdPaletteActiveIdx = Math.max(0, cmdPaletteActiveIdx - 1);
        updateCmdPalette();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        cmdPaletteActiveIdx = Math.min(cmdPaletteFiltered.length - 1, cmdPaletteActiveIdx + 1);
        updateCmdPalette();
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        const pick = cmdPaletteActiveIdx >= 0 ? cmdPaletteFiltered[cmdPaletteActiveIdx] : cmdPaletteFiltered[0];
        if (pick) {
          chatInput.value = pick.cmd;
          cmdPaletteActiveIdx = -1;
          updateCmdPalette();
        }
        return;
      }
    }

    if (!state.joined || event.key !== "Enter" || event.isComposing) {
      return;
    }
    if (chatInput.value.trim().length > 0) {
      return;
    }
    event.preventDefault();
    chatInput.blur();
  });

  chatInput?.addEventListener("blur", () => {
    setTimeout(hideCmdPalette, 150);
  });

  chatToggle.addEventListener("click", () => {
    setChatMinimized(!state.chatMinimized);
  });
  chatIconBtn?.addEventListener("click", () => {
    setChatMinimized(false);
  });

  progressionToggle.addEventListener("click", () => {
    setProgressionMinimized(!state.progressionMinimized);
  });

  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("focus", clearMovementInput);
  });

  window.addEventListener("resize", resize);

  canvas.addEventListener("pointerdown", (event) => {
    if (!state.joined || state.menuOpen || isTextEntryTarget(event.target)) {
      return;
    }
    event.preventDefault();
    if (tryInteractClickedFixture(event)) {
      return;
    }
    if (tryLootClickedWorldChest(event)) {
      return;
    }
    if (tryPickupClickedGroundItem(event)) {
      return;
    }
    if (tryFountainClickInteract(event)) {
      return;
    }
    if (tryRoadsideBenchClickInteract(event)) {
      return;
    }
    const world = screenEventToWorld(event);
    state.lastPointerWorldX = world.x;
    state.lastPointerWorldY = world.y;
    if (tryShipDeckClickInteract(event)) {
      return;
    }
    if (tryDockPortClickInteract(event)) {
      return;
    }
    if (tryOpenBuyHouseAtClick(world.x, world.y)) {
      return;
    }
    if (tryOpenTraderAtClick(world.x, world.y)) {
      return;
    }
    if (tryClickHouseChest(world.x, world.y)) {
      return;
    }
    if (tryClickHouseHomeTree(world.x, world.y)) {
      return;
    }
    if (tryOpenHouseCompanionMenu(event, world.x, world.y)) {
      return;
    }
    if (tryOpenNpcContextMenuFromCanvas(event, world.x, world.y)) {
      return;
    }
    if (tryOpenPlayerContextMenuFromCanvas(event, world.x, world.y)) {
      return;
    }
    if (tryTravelToPlanetAtClick(world.x, world.y)) {
      return;
    }
    if (tryRideCaravanAtClick(world.x, world.y)) {
      return;
    }
    if (!playerAttackBlockedBySafeZone()) {
      sendAttack(world.x, world.y);
    }
  });

  document.addEventListener("pointerdown", (e) => {
    if (!state.playerContextMenu) return;
    if (e.target.closest("#playerContextMenu")) return;
    hidePlayerContextMenu();
  });

  document.addEventListener("pointerdown", (e) => {
    if (!state.npcContext) return;
    if (e.target.closest("#npcContextMenu")) return;
    hideNpcContextMenu();
  });

  npcContextMenu?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-npc-action]");
    if (!btn || !state.npcContext) return;
    const act = btn.dataset.npcAction;
    if (state.npcContext.kind === "house_companion") {
      hideNpcContextMenu();
      if (act === "hc_chat") {
        send({ type: "houseCompanionAction", action: "chat" });
      } else if (act === "hc_breakup") {
        send({ type: "houseCompanionAction", action: "breakup" });
      } else if (act === "hc_intimate") {
        state.intimateBlackoutUntil = performance.now() + 3200;
        send({ type: "houseCompanionAction", action: "intimate" });
      }
      return;
    }
    const { npcId } = state.npcContext;
    hideNpcContextMenu();
    if (act === "shoo") {
      send({ type: "shoo_npc", npcId });
    } else if (act === "quest") {
      send({ type: "questNpc", npcId });
    } else if (act === "shop") {
      send({ type: "traderOpen", npcId });
    } else if (act === "pursue_flirt") {
      send({ type: "pursueFlirt", npcId });
    } else if (act === "buy_companion") {
      send({ type: "companionApproach", npcId });
    }
  });

  // track latest pointer world position for keyboard/mobile attacks
  canvas.addEventListener("pointermove", (event) => {
    const world = screenEventToWorld(event);
    state.lastPointerWorldX = world.x;
    state.lastPointerWorldY = world.y;
    refreshWorldHoverTooltip(event);
  });

  canvas.addEventListener("pointerleave", () => {
    state.hoverTooltipText = "";
    state.hoverTooltipSmall = false;
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      hidePlayerContextMenu();
      hideNpcContextMenu();
      if (state.joined && state.pendingCompanionInvite) {
        closeCompanionInvitePanel();
        return;
      }
      if (state.joined && state.buyHouseOffer) {
        closeBuyHousePanel();
        return;
      }
      if (state.joined && state.friendsWindowOpen) {
        state.friendsWindowOpen = false;
        friendsWindow?.classList.add("hidden");
        return;
      }
      if (state.joined && state.tradePartnerId) {
        send({ type: "tradeCancel", partnerId: state.tradePartnerId });
        closeTradeUi();
        return;
      }
      if (state.joined) {
        toggleMenu();
      }
      return;
    }

    if (state.menuOpen) {
      return;
    }

    // Ship engage — Space thrusts forward when flying; attacks when on ground
    if (event.code === "Space" && state.joined && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      if (isSelfOnShip()) {
        const role = selfShipStationRole();
        state.input.engage = Boolean(isPilotShipRole(role) || (isSelfFlyingShip() && !role));
        state.input.fire = Boolean(role === "gunner");
        state.input.repair = Boolean(role === "engineer");
        sendInput();
        return;
      }
      if (!playerAttackBlockedBySafeZone()) {
        sendAttack(state.lastPointerWorldX, state.lastPointerWorldY);
      }
      return;
    }

    // Toggle gunner weapon mode with Tab
    if (event.key === "Tab" && state.joined && selfShipStationRole() === "gunner" && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      state.input.weaponMode = state.input.weaponMode === "missile" ? "laser" : "missile";
      sendInput();
      return;
    }

    // Attack — F key fires
    if (event.key.toLowerCase() === "f" && state.joined && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      if (!playerAttackBlockedBySafeZone()) {
        sendAttack(state.lastPointerWorldX, state.lastPointerWorldY);
      }
      return;
    }

    if (event.key.toLowerCase() === "h" && state.joined && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      sendHome();
      return;
    }

    if (event.key.toLowerCase() === "e" && state.joined && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      const self = state.players.get(state.selfId);
      if (!self || !tryOpenBuyHouseNearPlayer()) {
        sendInteract();
      }
      return;
    }

    if (event.key === "Enter" && state.joined && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      clearMovementInput();
      chatInput.focus();
      return;
    }

    // Ability bar keybinds 1-5
    const abilityKey = parseInt(event.key, 10);
    if (abilityKey >= 1 && abilityKey <= 5 && state.joined && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      castAbilitySlot(abilityKey - 1);
      return;
    }

    // Q — use the potion slot, or exit the ship while flying.
    if (event.key.toLowerCase() === "q" && state.joined && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      usePotionOrShipExit();
      return;
    }

    // B — bags, C — character, T — talents, L — quests
    if (event.key.toLowerCase() === "b" && state.joined && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      toggleGameWindow("bags");
      return;
    }
    if (event.key.toLowerCase() === "c" && state.joined && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      toggleGameWindow("equipment");
      return;
    }
    if (event.key.toLowerCase() === "t" && state.joined && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      toggleGameWindow("talent");
      return;
    }
    if (event.key.toLowerCase() === "l" && state.joined && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      toggleGameWindow("quests");
      return;
    }
    if (event.key.toLowerCase() === "o" && state.joined && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      toggleFriendsWindow();
      return;
    }

    updateInput(event, true);
  });
  window.addEventListener("keyup", (event) => {
    if (event.code === "Space" && isSelfOnShip()) {
      state.input.engage = false;
      state.input.fire = false;
      state.input.repair = false;
      sendInput();
      return;
    }
    updateInput(event, false);
  });

  canvas.addEventListener("wheel", (event) => {
    const self = state.players.get(state.selfId);
    if (!self?.isMod) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    state.zoom = Math.max(0.25, Math.min(1.0, state.zoom + delta));
    state.requestedChunks.clear();
    requestVisibleChunks();
  }, { passive: false });

  canvas.addEventListener("contextmenu", (event) => {
    const self = state.players.get(state.selfId);
    if (!self?.isMod || !state.joined) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (event.clientX - rect.left) * scaleX;
    const cy = (event.clientY - rect.top) * scaleY;
    const world = screenPointToWorld(cx, cy);
    const worldX = world.x;
    const worldY = world.y;
    send({ type: "modTeleport", x: worldX, y: worldY });
  });

  debugToggleButton?.addEventListener("click", () => {
    state.debugHud = !state.debugHud;
    localStorage.setItem(DEBUG_HUD_STORAGE_KEY, state.debugHud ? "1" : "0");
    syncDebugToggleButton();
    if (!state.debugHud) {
      state.debugRttMs = null;
    }
  });
  syncDebugToggleButton();

  document.querySelectorAll(".chat-tab").forEach((btn) => {
    btn.addEventListener("click", () => setChatSubTab(btn.dataset.chatTab || "messages"));
  });

  partyPanelMin?.addEventListener("click", () => {
    state.partyPanelMinimized = !state.partyPanelMinimized;
    renderPartyPanel();
  });

  playerContextMenu?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pctx]");
    if (!btn || !state.playerContextMenu) return;
    const tid = state.playerContextMenu.targetId;
    const act = btn.dataset.pctx;
    hidePlayerContextMenu();
    if (act === "party") send({ type: "partyJoin", targetPlayerId: tid });
    if (act === "trade") send({ type: "tradeInvite", targetPlayerId: tid });
    if (act === "friend") send({ type: "friendAdd", targetPlayerId: tid });
  });

  friendsWindowClose?.addEventListener("click", () => {
    state.friendsWindowOpen = false;
    friendsWindow?.classList.add("hidden");
  });

  tradeClose?.addEventListener("click", () => {
    send({ type: "tradeCancel", partnerId: state.tradePartnerId });
    closeTradeUi();
  });
  tradeCancelBtn?.addEventListener("click", () => {
    send({ type: "tradeCancel", partnerId: state.tradePartnerId });
    closeTradeUi();
  });
  tradeConfirmBtn?.addEventListener("click", () => {
    if (state.tradePartnerId) send({ type: "tradeConfirm", partnerId: state.tradePartnerId });
  });
  tradeYourGold?.addEventListener("change", () => {
    if (!state.tradePartnerId) return;
    const g = Number(tradeYourGold.value);
    send({ type: "tradeSetGold", partnerId: state.tradePartnerId, gold: Number.isFinite(g) ? g : 0 });
  });
  tradeYourLock?.addEventListener("change", () => {
    if (!state.tradePartnerId) return;
    send({ type: "tradeLock", partnerId: state.tradePartnerId, locked: tradeYourLock.checked });
  });

  tradeYourSlots?.addEventListener("pointerdown", (e) => {
    const slotEl = e.target.closest(".trade-slot");
    if (!slotEl || !state.tradePartnerId) return;
    const si = Number(slotEl.dataset.tradeSlot);
    if (!Number.isInteger(si)) return;
    const invSlot = state.tradeDragInvSlot;
    if (invSlot == null) return;
    send({ type: "tradeSetSlot", partnerId: state.tradePartnerId, slot: si, invSlot });
    state.tradeDragInvSlot = null;
  });

  tradeYourSlots?.addEventListener("click", (e) => {
    const slotEl = e.target.closest(".trade-slot");
    if (!slotEl || !state.tradePartnerId) return;
    const si = Number(slotEl.dataset.tradeSlot);
    if (!Number.isInteger(si)) return;
    const picker = document.querySelector("#tradePicker");
    if (!picker) return;
    if (slotEl.classList.contains("filled")) {
      send({ type: "tradeSetSlot", partnerId: state.tradePartnerId, slot: si, invSlot: null });
      picker.classList.add("hidden");
      return;
    }
    // Show item picker
    picker.replaceChildren();
    const items = (state.inventory || []).map((item, idx) => ({ item, idx })).filter(({ item }) => Boolean(item));
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "trade-picker-empty";
      empty.textContent = "Bag is empty";
      picker.appendChild(empty);
    } else {
      for (const { item, idx } of items) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "trade-picker-item";
        btn.textContent = displayItemName(item);
        btn.addEventListener("click", () => {
          send({ type: "tradeSetSlot", partnerId: state.tradePartnerId, slot: si, invSlot: idx });
          picker.classList.add("hidden");
        });
        picker.appendChild(btn);
      }
    }
    picker.classList.toggle("hidden", picker.classList.contains("hidden") === false && picker._forSlot === si);
    picker.classList.remove("hidden");
    picker._forSlot = si;
  });

  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest("#tradeYourSlots") && !e.target.closest("#tradePicker")) {
      document.querySelector("#tradePicker")?.classList.add("hidden");
    }
  }, true);

  wireMobileControls();
}

function updateInput(event, pressed) {
  if (state.menuOpen || isTextEntryTarget(event.target)) {
    return;
  }

  const key = keys.get(event.key.toLowerCase());
  if (!key) {
    return;
  }
  event.preventDefault();
  if (
    pressed &&
    (key === "up" || key === "down" || key === "left" || key === "right")
  ) {
    cancelBenchSitClient();
  }
  const changed = state.input[key] !== pressed;
  state.input[key] = pressed;
  if (changed) {
    sendInput();
  }
  if (pressed && homeCastTimer) cancelHomeCast(); // movement cancels cast
}

function clearMovementInput() {
  cancelBenchSitClient();
  state.input.up = false;
  state.input.down = false;
  state.input.left = false;
  state.input.right = false;
  state.input.engage = false;
  state.input.fire = false;
  state.input.repair = false;
  sendInput();
}

function cancelBenchSitClient() {
  state.benchSeatIndefinite = false;
  state.benchSitUntil = 0;
}

function setMovementInput(direction, pressed) {
  if (!Object.prototype.hasOwnProperty.call(state.input, direction)) {
    return;
  }
  if (pressed && (direction === "up" || direction === "down" || direction === "left" || direction === "right")) {
    cancelBenchSitClient();
  }
  state.input[direction] = pressed;
  sendInput();
}

function isTextEntryTarget(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

function sendInput() {
  if (!state.joined) {
    return;
  }

  send({
    type: "input",
    seq: state.inputSeq++,
    keys: state.input
  });
}

let homeCastTimer = null;
const HOME_CAST_MS = 3000;

function cancelHomeCast() {
  if (homeCastTimer) {
    clearTimeout(homeCastTimer);
    homeCastTimer = null;
  }
  state.pendingHomeTeleportUntil = 0;
  const bar = document.getElementById("cast-bar");
  if (bar) bar.classList.remove("casting");
}

function sendHome() {
  if (!state.joined) return;
  if (homeCastTimer) {
    cancelHomeCast();
    return;
  }
  clearMovementInput();
  const bar  = document.getElementById("cast-bar");
  const fill = document.getElementById("cast-bar-fill");
  if (bar)  bar.classList.add("casting");
  if (fill) { fill.style.transition = "none"; fill.style.width = "0%"; }
  requestAnimationFrame(() => {
    if (fill) { fill.style.transition = `width ${HOME_CAST_MS}ms linear`; fill.style.width = "100%"; }
  });
  state.pendingHomeTeleportUntil = performance.now() + HOME_CAST_MS;
  homeCastTimer = setTimeout(() => {
    homeCastTimer = null;
    if (bar) bar.classList.remove("casting");
    if (!state.joined) return;
    send({ type: "home" });
  }, HOME_CAST_MS);
}

function castAbilitySlot(slotIndex) {
  const self = state.players.get(state.selfId);
  if (!self) return;
  const spellId = (self.abilityBar || [])[slotIndex];
  if (!spellId) return;
  if (spellId.startsWith("item:")) {
    const itemSlot = parseInt(spellId.slice(5), 10);
    send({ type: "useItem", slot: itemSlot });
  } else {
    const cooldownMs = CLIENT_SPELL_COOLDOWN_MS[spellId];
    if (cooldownMs) {
      state.spellCooldowns.set(spellId, {
        readyAt: Date.now() + cooldownMs,
        cooldownMs
      });
      updateAbilityCooldowns();
    }
    send({ type: "castSpell", spellId, slot: slotIndex });
  }
}

function renderAbilityBar() {
  const self = state.players.get(state.selfId);
  if (!self || !state.joined) return;
  const bar = self.abilityBar || [null, null, null, null, null];
  abilityBar.classList.remove("hidden");

  // Teleport button shows whenever the player is somewhere a teleport menu makes sense:
  // any sci-fi context (in space, on a ship deck) or on a planet surface.
  if (teleportHotbarBtn) {
    const showTeleport = isSciFiWorld();
    teleportHotbarBtn.classList.toggle("hidden", !showTeleport);
  }

  // Ship mode: replace spell slots with the active ship-station control.
  const shipMode = isSelfOnShip();
  abilitySlotsEl.classList.toggle("hidden", shipMode);
  const engageEl = document.getElementById("shipEngage");
  if (engageEl) {
    engageEl.classList.toggle("hidden", !shipMode);
    const button = document.getElementById("shipEngageBtn");
    const key = engageEl.querySelector(".ship-engage-key");
    const role = selfShipStationRole();
    if (role !== "gunner" && state.input.weaponMode !== "laser") {
      state.input.weaponMode = "laser";
    }
    if (button) {
      button.dataset.dockAction = "";
      button.textContent = role === "gunner"
        ? "Fire"
        : role === "engineer"
          ? "Repair"
          : isPilotShipRole(role) || !self.ship?.deckMode
            ? "Engage"
            : "Station";
    }
    if (key) {
      key.textContent = role ? "Space" : "E";
    }
    const stats = document.getElementById("shipStationStats");
    if (stats) {
      const hp = Math.round(Number(self.ship?.health) || 0);
      const maxHp = Math.round(Number(self.ship?.maxHealth) || 0);
      const shields = Math.round(Number(self.ship?.shields) || 0);
      const maxShields = Math.round(Number(self.ship?.maxShields) || 0);
      const shieldSections = self.ship?.shieldSections && typeof self.ship.shieldSections === "object" ? self.ship.shieldSections : {};
      const stationId = String(self.ship?.stationId || "engineer_mid");
      const shieldDir = String(shieldSections[stationId] || self.ship?.shieldFacing || "front");
      stats.classList.toggle("hidden", !shipMode || (role !== "engineer" && role !== "gunner"));
      if (shipMode && role === "engineer") {
        stats.replaceChildren();
        const title = document.createElement("strong");
        title.textContent = "Engineering";
        const hull = document.createElement("span");
        hull.textContent = `Hull ${hp}/${maxHp}`;
        const shield = document.createElement("span");
        shield.textContent = `Shield ${shields}/${maxShields} ${shieldDir}`;
        stats.append(title, hull, shield);
      } else if (shipMode && role === "gunner") {
        stats.replaceChildren();
        const title = document.createElement("strong");
        title.textContent = "Gunner";
        const mode = document.createElement("span");
        const isMissile = state.input.weaponMode === "missile";
        mode.textContent = isMissile ? "Missiles  [Tab to switch]" : "Lasers  [Tab to switch]";
        mode.style.color = isMissile ? "#ff7b3a" : "#67f0ff";
        stats.append(title, mode);
      }
    }
  }

  const slots = abilitySlotsEl.querySelectorAll(".ability-slot");
  slots.forEach((slot, i) => {
    const spellId = bar[i] || null;
    const filled = Boolean(spellId);
    slot.classList.toggle("filled", filled);
    slot.draggable = filled;

    // Rebuild slot content (slot element is static HTML, listeners persist)
    const keySpan = document.createElement("span");
    keySpan.className = "ability-key";
    keySpan.textContent = String(i + 1);

    if (spellId) {
      const fill = document.createElement("div");
      fill.className = "ability-slot-fill";

      const nm = document.createElement("div");
      nm.className = "ability-slot-name";
      if (spellId.startsWith("item:")) {
        const itemSlot = parseInt(spellId.slice(5), 10);
        const item = state.inventory?.[itemSlot] || null;
        const ic = document.createElement("span");
        ic.className = `item-icon ${item?.icon || item?.type || "unknown"}`;
        if (item?.color) ic.style.setProperty("--item-color", item.color);
        nm.textContent = item?.name || "Item";
        fill.append(ic, nm);
        slot.replaceChildren(fill, keySpan);
      } else {
        const ic = document.createElement("canvas");
        ic.width = 32;
        ic.height = 32;
        ic.draggable = false;
        ic.style.imageRendering = "pixelated";
        drawSpellIcon(ic, spellId, true);
        const spellInfo = Object.values(TALENT_TREES).flat().flatMap(t => t.spells).find(s => s.id === spellId);
        nm.textContent = spellInfo?.name || spellId;
        const cooldown = document.createElement("div");
        cooldown.className = "ability-cooldown";
        const cooldownText = document.createElement("span");
        cooldownText.className = "ability-cooldown-text";
        fill.append(ic, nm);
        slot.replaceChildren(fill, cooldown, cooldownText, keySpan);
      }
    } else {
      slot.replaceChildren(keySpan);
    }

    // Store current spell on element so the handler reads fresh data without closure drift
    slot.dataset.currentSpell = spellId || "";
  });
  updateAbilityCooldowns();
  syncSafeZoneIndicator(self);
  syncHomeTeleportSlot(self);
}

function updateAbilityCooldowns() {
  const self = state.players.get(state.selfId);
  if (!self || !abilitySlotsEl) return;
  const now = Date.now();
  const slots = abilitySlotsEl.querySelectorAll(".ability-slot");
  slots.forEach((slot, i) => {
    const spellId = (self.abilityBar || [])[i];
    const cooldown = slot.querySelector(".ability-cooldown");
    const cooldownText = slot.querySelector(".ability-cooldown-text");
    if (!spellId || spellId.startsWith("item:") || !cooldown || !cooldownText) return;
    const cd = state.spellCooldowns.get(spellId);
    const remaining = Math.max(0, Number(cd?.readyAt || 0) - now);
    const total = Math.max(1, Number(cd?.cooldownMs || 1));
    if (remaining > 0) {
      const pct = Math.max(0, Math.min(1, remaining / total));
      cooldown.style.transform = `scaleY(${pct})`;
      cooldownText.textContent = remaining >= 1000 ? String(Math.ceil(remaining / 1000)) : "";
      slot.classList.add("cooling-down");
    } else {
      cooldown.style.transform = "scaleY(0)";
      cooldownText.textContent = "";
      slot.classList.remove("cooling-down");
      if (cd) state.spellCooldowns.delete(spellId);
    }
  });
}

function useHealthPotion() {
  const potionSlot = findPotionInInventory();
  if (potionSlot === -1) return;
  send({ type: "useItem", slot: potionSlot });
}

function isSelfFlyingShip() {
  const self = state.players.get(state.selfId);
  return Boolean(self?.ship?.boarded && isSciFiWorld() && (!self.ship.deckMode || isPilotShipRole(self.ship.stationRole)));
}

function isSelfOnShip() {
  const self = state.players.get(state.selfId);
  return Boolean(self?.ship?.boarded && isSciFiWorld());
}

function selfShipStationRole() {
  const self = state.players.get(state.selfId);
  return self?.ship?.boarded ? self.ship.stationRole || null : null;
}

function usePotionOrShipExit() {
  if (isSelfOnShip()) {
    sendInteract();
    return;
  }
  useHealthPotion();
}

function findPotionInInventory() {
  if (!state.inventory) return -1;
  for (let i = 0; i < state.inventory.length; i++) {
    const item = state.inventory[i];
    if (item && item.type === "potion") return i;
  }
  return -1;
}

function countPotionsInInventory() {
  if (!state.inventory) return 0;
  return state.inventory.filter(item => item && item.type === "potion").length;
}

let potionIconMode = "";
function renderPotionSlot() {
  if (!potionSlotEl || !potionCountEl) return;
  const shipMode = isSelfOnShip();
  const count = countPotionsInInventory();
  potionCountEl.textContent = shipMode ? "Exit" : count;
  if (potionKeyEl) {
    potionKeyEl.textContent = shipMode ? "E" : "Q";
  }
  potionSlotEl.title = shipMode ? "Exit Ship (E)" : "Health Potion (Q)";
  potionSlotEl.classList.toggle("ship-exit-slot", shipMode);
  potionSlotEl.classList.toggle("has-potions", shipMode || count > 0);
  potionSlotEl.classList.toggle("no-potions", !shipMode && count === 0);

  const mode = shipMode ? "ship-exit" : "potion";
  if (potionIconMode !== mode && potionSlotIconCanvas) {
    potionIconMode = mode;
    const c = potionSlotIconCanvas.getContext("2d");
    const w = potionSlotIconCanvas.width;
    const h = potionSlotIconCanvas.height;
    c.clearRect(0, 0, w, h);
    if (shipMode) {
      c.fillStyle = "rgba(103,240,255,0.22)";
      c.fillRect(w * 0.14, h * 0.56, w * 0.72, h * 0.12);
      c.fillStyle = "#67f0ff";
      c.fillRect(w * 0.3, h * 0.24, w * 0.4, h * 0.16);
      c.fillRect(w * 0.22, h * 0.4, w * 0.56, h * 0.16);
      c.fillStyle = "#d9fbff";
      c.fillRect(w * 0.42, h * 0.28, w * 0.16, h * 0.1);
      c.fillStyle = "#ffcf6a";
      c.fillRect(w * 0.46, h * 0.58, w * 0.08, h * 0.2);
      c.fillStyle = "#ffffff";
      c.fillRect(w * 0.36, h * 0.75, w * 0.28, h * 0.08);
      c.fillRect(w * 0.5, h * 0.68, w * 0.08, h * 0.2);
    } else {
      // Bottle body
      c.fillStyle = "#1a3a1a";
      c.fillRect(w * 0.3, h * 0.35, w * 0.4, h * 0.55);
      // Red liquid fill
      c.fillStyle = "#cc2244";
      c.fillRect(w * 0.3 + 2, h * 0.5, w * 0.4 - 4, h * 0.38);
      // Bottle neck
      c.fillStyle = "#1a3a1a";
      c.fillRect(w * 0.38, h * 0.2, w * 0.24, h * 0.18);
      // Cork
      c.fillStyle = "#8b5e3c";
      c.fillRect(w * 0.36, h * 0.15, w * 0.28, h * 0.08);
      // Gloss highlight
      c.fillStyle = "rgba(255,255,255,0.2)";
      c.fillRect(w * 0.34, h * 0.4, w * 0.1, h * 0.2);
      // Red glow
      c.fillStyle = "#ff4466";
      c.globalAlpha = 0.3;
      c.beginPath();
      c.ellipse(w / 2, h * 0.68, w * 0.22, h * 0.14, 0, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }
  }
}

let homeTeleportIconDrawn = false;
function renderHomeTeleportIconOnce() {
  if (homeTeleportIconDrawn || !homeTeleportIconCanvas) return;
  homeTeleportIconDrawn = true;
  const c = homeTeleportIconCanvas.getContext("2d");
  const w = homeTeleportIconCanvas.width;
  const h = homeTeleportIconCanvas.height;
  c.imageSmoothingEnabled = false;
  // Roof
  c.fillStyle = "#5a4838";
  c.beginPath();
  c.moveTo(w * 0.5, h * 0.12);
  c.lineTo(w * 0.88, h * 0.42);
  c.lineTo(w * 0.12, h * 0.42);
  c.closePath();
  c.fill();
  c.strokeStyle = "#2a2218";
  c.lineWidth = 1;
  c.stroke();
  // Body
  c.fillStyle = "#8a7348";
  c.fillRect(w * 0.18, h * 0.4, w * 0.64, h * 0.52);
  c.strokeRect(w * 0.18 + 0.5, h * 0.4 + 0.5, w * 0.64 - 1, h * 0.52 - 1);
  // Door
  c.fillStyle = "#4a3018";
  c.fillRect(w * 0.39, h * 0.58, w * 0.22, h * 0.34);
  c.fillStyle = "#c9a068";
  c.fillRect(w * 0.56, h * 0.74, 3, 3);
  // Window glow
  c.fillStyle = "rgba(255,236,160,0.55)";
  c.fillRect(w * 0.26, h * 0.5, w * 0.16, h * 0.14);
  c.fillRect(w * 0.58, h * 0.5, w * 0.16, h * 0.14);
  // Chimney
  c.fillStyle = "#6a5850";
  c.fillRect(w * 0.66, h * 0.18, w * 0.14, h * 0.22);
}

/** Hotbar “home” glyph — mirrors H key teleport; hidden until the player owns a house. */
function syncHomeTeleportSlot(self) {
  renderHomeTeleportIconOnce();
  if (!homeTeleportSlotEl || !abilityBar) return;
  const hasHome =
    state.joined &&
    self &&
    typeof self.homeBuildingKey === "string" &&
    self.homeBuildingKey.length > 0;
  const hide = !hasHome || abilityBar.classList.contains("minimized");
  homeTeleportSlotEl.classList.toggle("hidden", hide);
}

function getBuildingPriceClient(building) {
  const t = building?.type || "house";
  return BUILDING_TYPE_PRICES[t] ?? 500;
}

function findBuildingLot(buildingX, buildingY) {
  for (const b of state.buildings.values()) {
    if (b.x === buildingX && b.y === buildingY) return b;
  }
  return null;
}

function playerNearBuildingDoor(px, py, building) {
  const doorX = southDoorAnchorWorldClient(building);
  const doorY = building.y + building.h - 1;
  return Math.hypot(px - doorX, py - doorY) <= BUY_HOUSE_INTERACT_RADIUS;
}

/** Matches roadside sign anchor used for drawing / hit-testing (left front of lot). */
function playerNearForSaleSign(px, py, building) {
  const signX = building.x - 0.5;
  const signY = building.y + building.h - 0.5;
  return Math.hypot(px - signX, py - signY) <= BUY_HOUSE_INTERACT_RADIUS;
}

function playerCanInteractBuyHouse(px, py, building) {
  return playerNearBuildingDoor(px, py, building) || playerNearForSaleSign(px, py, building);
}

function worldPointHitsForSaleSign(building, worldX, worldY) {
  const minX = building.x - 1.15;
  const maxX = building.x + 0.35;
  const minY = building.y + building.h - 1.45;
  const maxY = building.y + building.h + 0.45;
  return worldX >= minX && worldX <= maxX && worldY >= minY && worldY <= maxY;
}

/** Door row + south façade strip + roof footprint — avoids narrow sign-only misses. */
function worldPointHitsForSaleBuildingPick(building, worldX, worldY) {
  if (worldPointHitsForSaleSign(building, worldX, worldY)) return true;
  const padX = 1.1;
  const southBand = 3.2;
  const minX = building.x - padX;
  const maxX = building.x + building.w + padX;
  const minY = building.y + building.h - southBand;
  const maxY = building.y + building.h + 1.25;
  return worldX >= minX && worldX <= maxX && worldY >= minY && worldY <= maxY;
}

function isPlayerInStartingSafeZone(px, py) {
  return Math.hypot(px - STARTING_SAFE_ZONE.x, py - STARTING_SAFE_ZONE.y) <= STARTING_SAFE_ZONE.radius;
}

function playerAttackBlockedBySafeZone() {
  const self = state.players.get(state.selfId);
  if (!self) return true;
  const px = Number.isFinite(self.renderX) ? self.renderX : self.x;
  const py = Number.isFinite(self.renderY) ? self.renderY : self.y;
  return isPlayerInStartingSafeZone(px, py);
}

function syncSafeZoneIndicator(self) {
  if (!safeZoneIndicator || !abilityBar) return;
  if (!state.joined || !self || abilityBar.classList.contains("minimized")) {
    safeZoneIndicator.classList.add("hidden");
    safeZoneIndicator.classList.remove("safe-zone-tooltip-pinned");
    clearTimeout(safeZoneTooltipPinTimer);
    safeZoneTooltipPinTimer = null;
    return;
  }
  const px = Number.isFinite(self.renderX) ? self.renderX : self.x;
  const py = Number.isFinite(self.renderY) ? self.renderY : self.y;
  const show = Number.isFinite(px) && Number.isFinite(py) && isPlayerInStartingSafeZone(px, py);
  if (!show) {
    safeZoneIndicator.classList.remove("safe-zone-tooltip-pinned");
    clearTimeout(safeZoneTooltipPinTimer);
    safeZoneTooltipPinTimer = null;
  }
  safeZoneIndicator.classList.toggle("hidden", !show);
}

function closeBuyHousePanel() {
  state.buyHouseOffer = null;
  buyHousePanel?.classList.add("hidden");
}

function closeCompanionInvitePanel() {
  state.pendingCompanionInvite = null;
  companionOfferPanel?.classList.add("hidden");
}

function openCompanionInvitePanel(inv) {
  if (!companionOfferPanel || !inv || !state.joined) {
    return;
  }
  state.pendingCompanionInvite = inv;
  const roleLabel = inv.bondTag === "bf" ? "Boyfriend" : "Girlfriend";
  if (companionOfferTitle) {
    companionOfferTitle.textContent = `${inv.npcName} — ${roleLabel}`;
  }
  if (companionOfferLine) {
    companionOfferLine.textContent = inv.line || "…";
  }
  if (companionOfferCost) {
    companionOfferCost.innerHTML = `They ask for <strong>${Number(inv.price) || 0}g</strong> to settle in.`;
  }
  companionOfferPanel.classList.remove("hidden");
}

function renderBuyHousePanel() {
  if (!buyHousePanel || !state.buyHouseOffer || !buyHouseTitle || !buyHousePriceLine || !buyHouseGoldLine || !buyHouseConfirm) {
    return;
  }
  const offer = state.buyHouseOffer;
  const building = findBuildingLot(offer.buildingX, offer.buildingY);
  const self = state.players.get(state.selfId);
  const gold = Number.isFinite(self?.gold) ? self.gold : 0;
  const price = building ? getBuildingPriceClient(building) : 0;

  buyHouseTitle.textContent = building?.name ? `Buy ${building.name}` : "Buy property";
  buyHousePriceLine.innerHTML = `Price: <strong>${price}g</strong>`;
  buyHouseGoldLine.innerHTML = `Your gold: <strong>${gold}g</strong>`;

  const key = `${offer.buildingX},${offer.buildingY}`;
  const owned = state.buildingOwnership.has(key);
  const canBuy = Boolean(building && building.forSale && !owned && gold >= price && price > 0);
  buyHouseConfirm.disabled = !canBuy;
}

function openBuyHousePanel(building) {
  closeShop();
  state.activeWindow = null;
  equipmentPanel.classList.add("hidden");
  bagsPanel.classList.add("hidden");
  questPanel?.classList.add("hidden");
  traderPanel.classList.add("hidden");
  talentPanel.classList.add("hidden");
  equipmentButton.classList.remove("selected");
  bagsButton.classList.remove("selected");
  questsButton?.classList.remove("selected");
  state.traderNpcId = null;
  state.traderItems = [];
  clearMovementInput();

  state.buyHouseOffer = {
    buildingX: building.x,
    buildingY: building.y,
    name: building.name
  };
  buyHousePanel?.classList.remove("hidden");
  renderBuyHousePanel();
}

function tryOpenBuyHouseAtClick(worldX, worldY) {
  const self = state.players.get(state.selfId);
  if (!self) return false;
  const px = Number.isFinite(self.renderX) ? self.renderX : self.x;
  const py = Number.isFinite(self.renderY) ? self.renderY : self.y;
  for (const building of state.buildings.values()) {
    if (!building.forSale) continue;
    const key = `${building.x},${building.y}`;
    if (state.buildingOwnership.has(key)) continue;
    if (!worldPointHitsForSaleBuildingPick(building, worldX, worldY)) continue;
    if (!playerCanInteractBuyHouse(px, py, building)) continue;
    openBuyHousePanel(building);
    return true;
  }
  return false;
}

function tryOpenBuyHouseNearPlayer() {
  const self = state.players.get(state.selfId);
  if (!self) return false;
  const px = Number.isFinite(self.renderX) ? self.renderX : self.x;
  const py = Number.isFinite(self.renderY) ? self.renderY : self.y;
  for (const building of state.buildings.values()) {
    if (!building.forSale) continue;
    const key = `${building.x},${building.y}`;
    if (state.buildingOwnership.has(key)) continue;
    if (!playerCanInteractBuyHouse(px, py, building)) continue;
    openBuyHousePanel(building);
    return true;
  }
  return false;
}

function confirmBuyHouseFromPanel() {
  const offer = state.buyHouseOffer;
  if (!offer) return;
  const building = findBuildingLot(offer.buildingX, offer.buildingY);
  if (!building || !building.forSale) return;
  const key = `${building.x},${building.y}`;
  if (state.buildingOwnership.has(key)) return;
  send({ type: "buyBuilding", buildingX: building.x, buildingY: building.y });
}

function drawOwnerSignpost(building, sx, sy, w, h, ownerName) {
  const poleX = sx - TILE_SIZE * 0.55;
  const baseY = sy + h - TILE_SIZE * 0.35;
  const poleW = 7;
  const poleH = Math.min(62, Math.round(TILE_SIZE * 1.55));

  ctx.save();
  ctx.fillStyle = "#4a3424";
  ctx.fillRect(poleX - poleW / 2, baseY - poleH, poleW, poleH);
  ctx.strokeStyle = "#2c1e14";
  ctx.lineWidth = 1;
  ctx.strokeRect(poleX - poleW / 2, baseY - poleH, poleW, poleH);

  const boardW = Math.min(TILE_SIZE + 34, Math.round(w * 0.46 + TILE_SIZE));
  const boardH = 42;
  const boardX = poleX - boardW / 2;
  const boardY = baseY - poleH - boardH + 8;
  ctx.fillStyle = "#b8894a";
  ctx.fillRect(boardX, boardY, boardW, boardH);
  ctx.strokeStyle = "#3d2814";
  ctx.lineWidth = 2;
  ctx.strokeRect(boardX, boardY, boardW, boardH);

  ctx.font = "bold 9px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(0,0,0,0.78)";
  ctx.fillStyle = "#fff7dd";
  const ownerShort = String(ownerName || "").trim().slice(0, 18);
  const line1 = "The home of";
  const tcx = boardX + boardW / 2;
  ctx.strokeText(line1, tcx, boardY + 13);
  ctx.fillText(line1, tcx, boardY + 13);
  ctx.strokeText(ownerShort, tcx, boardY + 28);
  ctx.fillText(ownerShort, tcx, boardY + 28);
  ctx.restore();
}

function drawForSaleSignpost(building, sx, sy, w, h) {
  const poleX = sx - TILE_SIZE * 0.72;
  const baseY = sy + h - 6;
  const poleW = 7;
  const poleH = Math.min(54, Math.round(TILE_SIZE * 1.42));

  ctx.save();
  ctx.fillStyle = "#4a3424";
  ctx.fillRect(poleX - poleW / 2, baseY - poleH, poleW, poleH);
  ctx.strokeStyle = "#2c1e14";
  ctx.lineWidth = 1;
  ctx.strokeRect(poleX - poleW / 2, baseY - poleH, poleW, poleH);

  const boardW = TILE_SIZE + 16;
  const boardH = 28;
  const boardX = poleX - boardW / 2;
  const boardY = baseY - poleH - boardH + 10;
  ctx.fillStyle = "#c9a66a";
  ctx.fillRect(boardX, boardY, boardW, boardH);
  ctx.strokeStyle = "#3d2814";
  ctx.lineWidth = 2;
  ctx.strokeRect(boardX, boardY, boardW, boardH);

  ctx.fillStyle = "#5c4a38";
  ctx.fillRect(boardX + 5, boardY + 5, 3, 3);
  ctx.fillRect(boardX + boardW - 8, boardY + 5, 3, 3);

  ctx.font = "bold 9px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(0,0,0,0.78)";
  ctx.fillStyle = "#1e6b32";
  const tx = boardX + boardW / 2;
  const ty = boardY + boardH / 2;
  ctx.strokeText("FOR SALE", tx, ty);
  ctx.fillText("FOR SALE", tx, ty);
  ctx.restore();
}

function sendInteract(target = null) {
  if (!state.joined) {
    return;
  }
  send(target ? { type: "interact", ...target } : { type: "interact" });
}

function isSelfInsideShipInterior(player = state.players.get(state.selfId)) {
  if (!player) return false;
  if (selfIsInPilotSeat(player)) return false;
  if (player.ship?.boarded && player.ship?.deckMode) return true;
  if (typeof player.aboardShipId === "string" && player.aboardShipId) return true;
  return false;
}

function screenPointToWorld(cx, cy) {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const zoom = getEffectiveWorldZoom();
  const dx = (cx - halfW) / (zoom || 1);
  const dy = (cy - halfH) / (zoom || 1);
  // Interior view counter-rotates the deck and crew so they read screen-static;
  // clicks on stations/fixtures therefore need to skip the camera rotation undo.
  if (isSelfInsideShipInterior()) {
    return {
      x: (state.camera.x + dx) / TILE_SIZE,
      y: (state.camera.y + dy) / TILE_SIZE
    };
  }
  const rotation = Number(state.camera.rotation) || 0;
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  const worldDx = dx * cos - dy * sin;
  const worldDy = dx * sin + dy * cos;
  return {
    x: (state.camera.x + worldDx) / TILE_SIZE,
    y: (state.camera.y + worldDy) / TILE_SIZE
  };
}

function screenEventToWorld(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (event.clientX - rect.left) * scaleX;
  const cy = (event.clientY - rect.top) * scaleY;
  return screenPointToWorld(cx, cy);
}

function getOwnedHouseHomeTreeWorldPos(building) {
  return { x: building.x + 1.5, y: building.y + 1.5 };
}

function getOwnedHouseChestWorldPos(building) {
  const w = Math.max(1, building.w | 0);
  return { x: building.x + w - 2 + 0.5, y: building.y + 1.5 };
}

/** Companion stand / lie anchors (tile centres, matches server residential layout). */
function residentialPhantomCompanionAnchors(building) {
  const bw = Math.max(1, building.w | 0);
  const bh = Math.max(1, building.h | 0);
  return {
    bed: { wx: building.x + 1.5, wy: building.y + (bh - 2) + 0.48 },
    dine: {
      wx: building.x + (bw - 2) + 0.5,
      wy: building.y + (bh - 2) + 0.48,
      facing: -Math.PI / 2,
      restingBench: true
    },
    flirtStand: {
      wx: building.x + Math.min(bw - 3.2, bw * 0.48),
      wy: building.y + Math.min(bh - 3.5, bh * 0.55)
    }
  };
}

function clampWorldToBuildingInterior(wx, wy, building, pad = 1.42) {
  return {
    x: Math.min(building.x + building.w - pad, Math.max(building.x + pad, wx)),
    y: Math.min(building.y + building.h - pad, Math.max(building.y + pad, wy))
  };
}

function hashHomeCompanionPhrase(npcId, homeKey) {
  let h = 2166136261 >>> 0;
  const s = `${npcId}:${homeKey}:flirt`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const lines = Object.freeze([
    "You smell like firewood and stubborn ideas.",
    "Missed your boots clomping.",
    "...Stay a minute?",
    "I saved the kettle for you.",
    "Talk while I thaw my hands on you?"
  ]);
  return lines[h % lines.length];
}

/**
 * Idle loop while you are viewing your homestead cutaway:
 * rest in bed · snack at table · flirt near hearth.
 */
function homeCompanionAmbientMode(npcId, homeKey) {
  let h = 0;
  const s = `${npcId}:${homeKey}:phase`;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  }
  const periodSec = 30;
  const t = Math.floor(performance.now() / 1000) + ((h >>> 7) % 13);
  const u = ((t % periodSec) + periodSec) % periodSec;
  if (u < 11) return "bed";
  if (u < 20) return "eat";
  return "flirt";
}

/**
 * World-space pose for the homestead phantom partner (must match draw).
 * @returns {{ wx: number, wy: number, facing: number, poseExtras: Record<string, unknown>, mode: string, hc: object } | null}
 */
function resolveHouseCompanionPhantomLayout(self, building) {
  if (!self?.houseCompanion || building?.isPub) {
    return null;
  }
  if (!self.homeBuildingKey || `${building.x},${building.y}` !== self.homeBuildingKey) {
    return null;
  }
  const typ = building.type || "house";
  if (!(typ === "house" || typ === "big_house")) {
    return null;
  }
  const hc = self.houseCompanion;
  const npcId = typeof hc.npcId === "string" ? hc.npcId : "companion";
  let mode = homeCompanionAmbientMode(npcId, self.homeBuildingKey);
  if ((state.morningAfterCompanionBedUntil || 0) > performance.now()) {
    mode = "bed";
  }
  const anchors = residentialPhantomCompanionAnchors(building);

  let wx;
  let wy;
  let facing = Math.PI / 2;
  /** @type {Record<string, unknown>} */
  let poseExtras = {};

  if (mode === "bed") {
    wx = anchors.bed.wx;
    wy = anchors.bed.wy;
    poseExtras = { lyingBed: true };
  } else if (mode === "eat") {
    wx = anchors.dine.wx;
    wy = anchors.dine.wy;
    facing = anchors.dine.facing;
    poseExtras = { restingBench: true };
  } else {
    const px = Number.isFinite(self.renderX) ? self.renderX : self.x;
    const py = Number.isFinite(self.renderY) ? self.renderY : self.y;
    const hx = anchors.flirtStand.wx;
    const hy = anchors.flirtStand.wy;
    const ang = Math.atan2(py - hy, px - hx);
    const pull = Math.min(2.05, Math.hypot(px - hx, py - hy) * 0.32 + 0.92);
    const rawX = px - Math.cos(ang) * pull;
    const rawY = py - Math.sin(ang) * pull;
    const cl = clampWorldToBuildingInterior(rawX, rawY, building);
    wx = cl.x;
    wy = cl.y;
    facing = Math.atan2(py - wy, px - wx);
    poseExtras = {
      ambientLine: hashHomeCompanionPhrase(npcId, self.homeBuildingKey),
      companionReachOut: true
    };
  }

  return { wx, wy, facing, poseExtras, mode, hc };
}

/** Floor line at bottom of tile cell (wx,wy) for interior props */
function interiorFloorAnchorFromWorld(wx, wy, halfW, halfH) {
  const ix = Math.floor(wx);
  const iy = Math.floor(wy);
  const tileTopX = ix * TILE_SIZE - state.camera.x + halfW;
  const tileTopY = iy * TILE_SIZE - state.camera.y + halfH;
  return {
    cx: tileTopX + TILE_SIZE / 2,
    groundY: tileTopY + TILE_SIZE - 6
  };
}

/** Player standing inside a purchasable plot (forSale) — used to hide clutter. */
function getPlayerStandingBuyableHouseInterior() {
  const self = state.players.get(state.selfId);
  if (!self) {
    return null;
  }
  for (const b of state.buildings.values()) {
    if (!b.forSale) {
      continue;
    }
    if (
      self.x > b.x + 0.55 &&
      self.x < b.x + b.w - 0.55 &&
      self.y > b.y + 0.55 &&
      self.y < b.y + b.h - 0.55
    ) {
      return b;
    }
  }
  return null;
}

function worldPointInsideBuildingInterior(wx, wy, b, inset = 0.35) {
  return (
    wx >= b.x + inset &&
    wx <= b.x + b.w - inset &&
    wy >= b.y + inset &&
    wy <= b.y + b.h - inset
  );
}

function findBuildingByKey(key) {
  for (const b of state.buildings.values()) {
    if (`${b.x},${b.y}` === key) {
      return b;
    }
  }
  return null;
}

function stationObjectInteractionAnchor(obj) {
  return {
    x: Number(obj?.x),
    y: Number(obj?.y)
  };
}

function stationShopDoorOpenings(obj) {
  const doors = Array.isArray(obj?.entrances) ? obj.entrances : [];
  if (doors.length) {
    return doors;
  }
  if (obj?.facing === "east") return [{ side: "east", width: 2 }];
  if (obj?.facing === "west") return [{ side: "west", width: 2 }];
  return [{ side: "bottom", width: 2 }];
}

function stationShopDoorAnchors(obj) {
  const fw = Math.max(1, Math.floor(Number(obj?.w) || 1));
  const fh = Math.max(1, Math.floor(Number(obj?.h) || 1));
  const minX = Number(obj.x) - Math.floor(fw / 2);
  const minY = Number(obj.y) - Math.floor(fh / 2);
  const anchors = [];
  for (const door of stationShopDoorOpenings(obj)) {
    const side = String(door?.side || "bottom");
    const width = Math.max(1, Math.min(4, Math.floor(Number(door?.width) || 2)));
    const axisSize = side === "east" || side === "west" ? fh : fw;
    const center = Math.floor(axisSize / 2) + Math.floor(Number(door?.offset) || 0);
    const start = Math.max(0, Math.min(axisSize - width, Math.round(center - (width - 1) / 2)));
    if (side === "east") anchors.push({ side, x: minX + fw, y: minY + start + width / 2, start, width });
    if (side === "west") anchors.push({ side, x: minX, y: minY + start + width / 2, start, width });
    if (side === "bottom" || side === "south") anchors.push({ side: "bottom", x: minX + start + width / 2, y: minY + fh, start, width });
  }
  return anchors;
}

function getStationShopDoorOpenFactor(obj) {
  const self = state.players.get(state.selfId);
  if (!self) return 0;
  const px = Number.isFinite(self.renderX) ? self.renderX : self.x;
  const py = Number.isFinite(self.renderY) ? self.renderY : self.y;
  let best = 0;
  for (const door of stationShopDoorAnchors(obj)) {
    const d = Math.hypot(px - door.x, py - door.y);
    const far = 4.0;
    const near = 1.05;
    if (d >= far) continue;
    const u = d <= near ? 1 : (far - d) / (far - near);
    best = Math.max(best, u * u * (3 - 2 * u));
  }
  return best;
}

function refreshWorldHoverTooltip(event) {
  state.hoverTooltipText = "";
  state.hoverTooltipSmall = false;
  state.hoverTooltipX = event.offsetX;
  state.hoverTooltipY = event.offsetY;
  if (!state.joined || state.menuOpen || event.target !== canvas) {
    return;
  }

  const world = screenEventToWorld(event);
  if (isSciFiWorld()) {
    const shipDeckHit = findShipDeckInteractionAt(world.x, world.y);
    if (shipDeckHit?.label) {
      state.hoverTooltipText = shipDeckHit.label;
      state.hoverTooltipSmall = true;
      return;
    }
    let bestStationObject = null;
    let bestStationDist = Infinity;
    for (const obj of state.spaceObjects.values()) {
      if (!obj || !isSciFiHoverLabelObject(obj)) {
        continue;
      }
      const { x: ax, y: ay } = stationObjectInteractionAnchor(obj);
      if (!Number.isFinite(ax) || !Number.isFinite(ay)) {
        continue;
      }
      const reach = stationObjectHoverReach(obj);
      const dist = Math.hypot(world.x - ax, world.y - ay);
      if (dist <= reach && dist < bestStationDist) {
        bestStationDist = dist;
        bestStationObject = obj;
      }
    }
    if (bestStationObject) {
      state.hoverTooltipText = sciFiHoverLabel(bestStationObject);
      state.hoverTooltipSmall = true;
      return;
    }
  }
  for (const f of state.roadsides.values()) {
    const rfW = Math.max(1, Math.floor(Number(f.footprintW) || 1));
    const rfH = Math.max(1, Math.floor(Number(f.footprintH) || 1));
    const ax = f.x + rfW / 2;
    const ay = f.y + rfH / 2 + (f.kind === "market_stand" ? 0.1 : 0.55);
    const reach = f.kind === "market_stand" ? 1.45 : f.kind === "fountain" ? 2.35 : 1.12;
    if (Math.hypot(world.x - ax, world.y - ay) <= reach) {
      state.hoverTooltipText =
        f.kind === "bench"
          ? "Bench — interact to sit"
          : f.kind === "market_stand"
            ? "Market stand"
            : f.kind === "small_tree"
              ? "Small tree"
              : f.kind === "fountain"
                ? "Fountain — interact"
                : f.kind.includes("chair")
                  ? "Outdoor chair"
                  : f.kind.includes("pub")
                    ? "Pub seating"
                    : "Roadside table";
      state.hoverTooltipSmall = true;
      return;
    }
  }

  const self = state.players.get(state.selfId);
  if (!self?.homeBuildingKey) {
    return;
  }
  const building = findBuildingByKey(self.homeBuildingKey);
  if (!building) {
    return;
  }
  const pb = getPlayerBuilding();
  if (!pb || pb.x !== building.x || pb.y !== building.y) {
    return;
  }

  const tp = getOwnedHouseHomeTreeWorldPos(building);
  if (Math.hypot(world.x - tp.x, world.y - tp.y) <= INTERIOR_HOME_TREE_HIT_RADIUS_TILES) {
    state.hoverTooltipText = "Teleport to home tree";
    state.hoverTooltipSmall = true;
    return;
  }

  const cp = getOwnedHouseChestWorldPos(building);
  if (Math.hypot(world.x - cp.x, world.y - cp.y) <= INTERIOR_HOUSE_CHEST_TOOLTIP_RADIUS_TILES) {
    state.hoverTooltipText = "House chest";
    state.hoverTooltipSmall = false;
  }
}

function isSciFiHoverLabelObject(obj) {
  return Boolean(obj && [
    "ship-port",
    "ship-console",
    "sci-shop",
    "sci-shop-terminal",
    "station-kiosk",
    "station-plaza",
    "station-core",
    "command",
    "station-module",
    "defense-turret",
    "orbital-cannon"
  ].includes(obj.kind));
}

function stationObjectHoverReach(obj) {
  if (!obj) return 1.4;
  if (obj.kind === "ship-console" || obj.kind === "sci-shop-terminal") return 1.6;
  if (obj.kind === "station-plaza") return 5.8;
  if (obj.kind === "station-core") return 4.2;
  if (obj.kind === "defense-turret" || obj.kind === "orbital-cannon") return 2.1;
  const w = Math.max(1, Number(obj.w) || 1);
  const h = Math.max(1, Number(obj.h) || 1);
  return Math.max(1.9, Math.min(6, Math.max(w, h) * 0.38));
}

function sciFiHoverLabel(obj) {
  if (!obj) return "";
  if (obj.kind === "ship-console") return "Ship terminal - summon or board";
  if (obj.kind === "station-plaza") return "Zero-G Concourse - drift keeps your last direction";
  if (obj.kind === "station-core") return "Prismatic Reactor - station power core";
  if (obj.kind === "command") return `${obj.name || "Command Deck"} - station operations`;
  if (obj.kind === "station-module") return `${obj.name || "Station module"} - station facility`;
  if (obj.kind === "defense-turret") return `${obj.name || "Defense Turret"} - automated pirate defense`;
  if (obj.kind === "orbital-cannon") return `${obj.name || "Orbital Cannon"} - heavy station defense`;
  const labels = {
    ship: "Shipyard kiosk",
    arms: "Armory kiosk",
    stims: "Medical kiosk",
    parts: "Parts kiosk",
    trade: "Bazaar kiosk",
    pub: "Lounge kiosk"
  };
  if (obj.kind === "station-kiosk") return `${labels[obj.shopType] || obj.name || "Station kiosk"} - open`;
  if (obj.kind === "sci-shop" || obj.kind === "sci-shop-terminal") {
    const terminal = obj.kind === "sci-shop-terminal" ? "terminal" : "shop";
    return `${labels[obj.shopType] || obj.shopName || obj.name || "Station shop"} ${terminal} - open`;
  }
  return obj.name || "Station object";
}

function tryClickHouseHomeTree(wx, wy) {
  const self = state.players.get(state.selfId);
  if (!self?.homeBuildingKey) {
    return false;
  }
  const building = findBuildingByKey(self.homeBuildingKey);
  if (!building) {
    return false;
  }
  const tp = getOwnedHouseHomeTreeWorldPos(building);
  if (Math.hypot(wx - tp.x, wy - tp.y) > INTERIOR_HOME_TREE_CLICK_RADIUS_TILES) {
    return false;
  }
  const pb = getPlayerBuilding();
  if (!pb || pb.x !== building.x || pb.y !== building.y) {
    return false;
  }
  send({ type: "houseHomeTree", x: wx, y: wy });
  return true;
}

function tryClickHouseChest(wx, wy) {
  const self = state.players.get(state.selfId);
  if (!self?.homeBuildingKey) {
    return false;
  }
  const building = findBuildingByKey(self.homeBuildingKey);
  if (!building) {
    return false;
  }
  const cp = getOwnedHouseChestWorldPos(building);
  if (Math.hypot(wx - cp.x, wy - cp.y) > INTERIOR_HOUSE_CHEST_CLICK_RADIUS_TILES) {
    return false;
  }
  const pb = getPlayerBuilding();
  if (!pb || pb.x !== building.x || pb.y !== building.y) {
    return false;
  }
  send({ type: "houseChestAction", action: "open" });
  return true;
}

function tryInteractClickedFixture(event) {
  const world = screenEventToWorld(event);
  const tileX = Math.floor(world.x);
  const tileY = Math.floor(world.y);
  const tile = getTile(tileX, tileY);
  if (tile !== TILE.SHELF && tile !== TILE.TABLE) {
    return false;
  }

  const self = state.players.get(state.selfId);
  if (self && Math.hypot(tileX + 0.5 - self.x, tileY + 0.5 - self.y) > 2.6) {
    return false;
  }

  sendInteract({ x: tileX + 0.5, y: tileY + 0.5 });
  return true;
}

/** Prefer sitting when the pointer clearly hits an upright roadside bench */
function tryFountainClickInteract(event) {
  const world = screenEventToWorld(event);
  const self = state.players.get(state.selfId);
  if (!self) return false;

  for (const f of state.roadsides.values()) {
    if (f.kind !== "fountain") continue;
    const rfW = Math.max(1, Math.floor(Number(f.footprintW) || 1));
    const rfH = Math.max(1, Math.floor(Number(f.footprintH) || 1));
    const ax = f.x + rfW / 2;
    const ay = f.y + rfH / 2;
    if (Math.hypot(world.x - ax, world.y - ay) > 2.35) continue;
    if (Math.hypot(self.x - ax, self.y - ay) > 4.5) continue;
    sendInteract({ x: ax, y: ay });
    return true;
  }
  return false;
}

function tryRoadsideBenchClickInteract(event) {
  const world = screenEventToWorld(event);
  const self = state.players.get(state.selfId);
  if (!self) return false;

  let bestD = Infinity;
  let bx = NaN;
  let by = NaN;
  for (const f of state.roadsides.values()) {
    if (f.kind !== "bench") continue;
    const rfW = Math.max(1, Math.floor(Number(f.footprintW) || 1));
    const rfH = Math.max(1, Math.floor(Number(f.footprintH) || 1));
    const ax = f.x + rfW / 2;
    const ay = f.y + rfH / 2 + 0.52;
    const d = Math.hypot(world.x - ax, world.y - ay);
    if (d <= 1.18 && d < bestD) {
      bestD = d;
      bx = ax;
      by = ay;
    }
  }
  if (!Number.isFinite(bx)) {
    return false;
  }

  /** Match server `resolveInteractRoadside`: player must be near the bench anchor (not click→player — a far click on the seat still sits you in one try). */
  if (Math.hypot(self.x - bx, self.y - by) > 5.85) {
    return false;
  }

  sendInteract({ x: bx, y: by });
  return true;
}

function tryDockPortClickInteract(event) {
  if (!isSciFiWorld()) {
    return false;
  }
  const world = screenEventToWorld(event);
  const self = state.players.get(state.selfId);
  if (!self) {
    return false;
  }

  let best = null;
  let bestDist = Infinity;
  for (const obj of state.spaceObjects.values()) {
    if (!obj || (obj.kind !== "ship-console" && obj.kind !== "sci-shop" && obj.kind !== "sci-shop-terminal" && obj.kind !== "station-kiosk")) {
      continue;
    }
    const { x: ax, y: ay } = stationObjectInteractionAnchor(obj);
    if (!Number.isFinite(ax) || !Number.isFinite(ay)) {
      continue;
    }
    const clickReach = obj.kind === "ship-console" || obj.kind === "sci-shop-terminal" ? 1.55 : 1.9;
    const d = Math.hypot(world.x - ax, world.y - ay);
    if (d <= clickReach && d < bestDist) {
      bestDist = d;
      best = { x: ax, y: ay };
    }
  }
  if (!best) {
    return false;
  }

  if (Math.hypot(self.x - best.x, self.y - best.y) > 6.25) {
    return false;
  }

  sendInteract({ x: best.x, y: best.y });
  return true;
}

function tryShipDeckClickInteract(event) {
  const world = screenEventToWorld(event);
  const hit = findShipDeckInteractionAt(world.x, world.y);
  if (!hit) {
    return false;
  }
  sendInteract({ x: hit.x, y: hit.y });
  return true;
}

function tryPickupClickedGroundItem(event) {
  const clicked = findClickedGroundItem(event);
  if (!clicked) {
    return false;
  }
  send({ type: "pickupGroundItem", groundItemId: clicked.id });
  return true;
}

function findClickedGroundItem(event) {
  const rect = canvas.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const self = state.players.get(state.selfId);

  let closest = null;
  let closestDistance = Infinity;
  for (const ground of state.groundItems) {
    if (self && Math.hypot(ground.x - self.x, ground.y - self.y) > 2.25) {
      continue;
    }
    const sx = ground.x * TILE_SIZE - state.camera.x + halfW;
    const sy = ground.y * TILE_SIZE - state.camera.y + halfH;
    const dist = Math.hypot(screenX - sx, screenY - sy);
    if (dist <= 18 && dist < closestDistance) {
      closest = ground;
      closestDistance = dist;
    }
  }
  return closest;
}

function findClickedWorldChest(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const screenX = (event.clientX - rect.left) * scaleX;
  const screenY = (event.clientY - rect.top) * scaleY;
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const self = state.players.get(state.selfId);
  if (!state.joined || !self) {
    return null;
  }

  const buyInterior = getPlayerStandingBuyableHouseInterior();
  let closest = null;
  let closestDistance = Infinity;

  for (const chest of state.chests) {
    if (chest.opened) {
      continue;
    }
    if (buyInterior && worldPointInsideBuildingInterior(chest.x, chest.y, buyInterior)) {
      continue;
    }
    if (Math.hypot(chest.x - self.x, chest.y - self.y) > WORLD_CHEST_LOOT_RADIUS_TILES) {
      continue;
    }
    const sx = chest.x * TILE_SIZE - state.camera.x + halfW;
    const sy = chest.y * TILE_SIZE - state.camera.y + halfH;
    const dist = Math.hypot(screenX - sx, screenY - sy);
    if (dist <= 26 && dist < closestDistance) {
      closest = chest;
      closestDistance = dist;
    }
  }
  return closest;
}

function tryLootClickedWorldChest(event) {
  const clicked = findClickedWorldChest(event);
  if (!clicked) {
    return false;
  }
  send({ type: "lootChest", chestId: clicked.id });
  return true;
}

function wireMobileControls() {
  const jctx = joystickCanvas?.getContext("2d");
  const JOYSTICK_RADIUS = 56;
  const KNOB_RADIUS = 22;
  const DEAD_ZONE = 0.15;
  const cx = 70;
  const cy = 70;
  let knobX = 0;
  let knobY = 0;
  let activePointerId = null;

  function drawJoystick() {
    if (!jctx) return;
    jctx.clearRect(0, 0, 140, 140);
    jctx.beginPath();
    jctx.arc(cx, cy, JOYSTICK_RADIUS, 0, Math.PI * 2);
    jctx.fillStyle = "rgba(24, 30, 43, 0.55)";
    jctx.fill();
    jctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    jctx.lineWidth = 2;
    jctx.stroke();
    jctx.beginPath();
    jctx.arc(cx + knobX, cy + knobY, KNOB_RADIUS, 0, Math.PI * 2);
    jctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    jctx.fill();
    jctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    jctx.lineWidth = 2;
    jctx.stroke();
  }

  function updateFromPointer(event) {
    const rect = joystickCanvas.getBoundingClientRect();
    const px = event.clientX - rect.left - cx;
    const py = event.clientY - rect.top - cy;
    const dist = Math.hypot(px, py);
    const maxDist = JOYSTICK_RADIUS - KNOB_RADIUS;
    if (dist > maxDist) {
      knobX = (px / dist) * maxDist;
      knobY = (py / dist) * maxDist;
    } else {
      knobX = px;
      knobY = py;
    }
    const normX = knobX / maxDist;
    const normY = knobY / maxDist;
    state.input.left = normX < -DEAD_ZONE;
    state.input.right = normX > DEAD_ZONE;
    state.input.up = normY < -DEAD_ZONE;
    state.input.down = normY > DEAD_ZONE;
    if (state.input.left || state.input.right || state.input.up || state.input.down) {
      cancelBenchSitClient();
    }
    sendInput();
    drawJoystick();
  }

  function resetJoystick() {
    knobX = 0;
    knobY = 0;
    activePointerId = null;
    clearMovementInput();
    drawJoystick();
  }

  if (joystickCanvas) {
    joystickCanvas.addEventListener("pointerdown", (event) => {
      if (!state.joined || state.menuOpen) return;
      event.preventDefault();
      activePointerId = event.pointerId;
      joystickCanvas.setPointerCapture(event.pointerId);
      updateFromPointer(event);
    });

    joystickCanvas.addEventListener("pointermove", (event) => {
      if (activePointerId !== event.pointerId) return;
      event.preventDefault();
      updateFromPointer(event);
    });

    joystickCanvas.addEventListener("pointerup", (event) => {
      if (activePointerId !== event.pointerId) return;
      event.preventDefault();
      resetJoystick();
    });

    joystickCanvas.addEventListener("pointercancel", (event) => {
      if (activePointerId !== event.pointerId) return;
      resetJoystick();
    });

    joystickCanvas.addEventListener("lostpointercapture", () => {
      resetJoystick();
    });

    drawJoystick();
  }

  document.querySelector("[data-mobile-action='attack']")?.addEventListener("pointerdown", (event) => {
    if (!state.joined || state.menuOpen) {
      return;
    }
    event.preventDefault();
    if (!playerAttackBlockedBySafeZone()) {
      sendAttack();
    }
  });

  document.querySelector("[data-mobile-action='home']")?.addEventListener("pointerdown", (event) => {
    if (!state.joined || state.menuOpen) {
      return;
    }
    event.preventDefault();
    sendHome();
  });
}

function send(message) {
  if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
    return;
  }
  state.socket.send(JSON.stringify(message));
}

function normalizeServerUrl(value) {
  let raw = String(value || "").trim();
  if (!raw) {
    throw new Error("missing server URL");
  }

  if (!/^wss?:\/\//i.test(raw)) {
    const lower = raw.toLowerCase();
    const local = lower.startsWith("localhost") || lower.startsWith("127.") || lower.startsWith("[::1]");
    raw = `${local ? "ws" : "wss"}://${raw}`;
  }

  const url = new URL(raw);
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new Error("unsupported server URL");
  }

  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = "/ws";
  }

  return url.toString();
}

function formatServerDisplay(url) {
  if (!url) {
    return "—";
  }
  try {
    const withProto = /^wss?:/i.test(url) ? url : `ws://${url}`;
    const httpish = withProto.replace(/^ws/i, "http");
    const u = new URL(httpish);
    const host = u.hostname + (u.port ? `:${u.port}` : "");
    return host || url;
  } catch {
    return url;
  }
}

function applyWorldTime(worldTime) {
  if (!worldTime || typeof worldTime !== "object") {
    return;
  }
  const hour = Number(worldTime.hour);
  if (!Number.isFinite(hour)) {
    return;
  }
  const phase = typeof worldTime.phase === "string" ? worldTime.phase : phaseForWorldHour(hour);
  state.worldTime = {
    hour: ((hour % 24) + 24) % 24,
    phase
  };
}

function phaseForWorldHour(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h < 6 || h >= 22) return "night";
  if (h < 8) return "dawn";
  if (h >= 18) return "dusk";
  return "day";
}

function formatWorldClock(hour) {
  const h = ((hour % 24) + 24) % 24;
  const wholeHour = Math.floor(h);
  const minutes = Math.floor((h - wholeHour) * 60);
  return `${String(wholeHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function worldTimeLabel(phase) {
  if (phase === "night") return "Night";
  if (phase === "dawn") return "Dawn";
  if (phase === "dusk") return "Dusk";
  return "Day";
}

function syncMenuWorldTime() {
  if (!menuTime || !menuTimeLabel || !menuTimeClock) {
    return;
  }
  const hour = Number(state.worldTime?.hour);
  const h = Number.isFinite(hour) ? ((hour % 24) + 24) % 24 : 8;
  const phase = state.worldTime?.phase || phaseForWorldHour(h);
  const dayProgress = Math.max(0, Math.min(1, (h - 6) / 16));
  const nightProgress = h >= 22 ? (h - 22) / 8 : (h + 2) / 8;
  menuTime.style.setProperty("--sun-x", `${Math.max(0, Math.min(1, dayProgress)) * 100}%`);
  menuTime.style.setProperty("--moon-x", `${Math.max(0, Math.min(1, nightProgress)) * 100}%`);
  menuTime.dataset.phase = phase;
  menuTimeLabel.textContent = worldTimeLabel(phase);
  menuTimeClock.textContent = formatWorldClock(h);
}

function canSelfEditWorldTime() {
  const self = state.players.get(state.selfId);
  return Boolean(self?.isMod && self.name === "ed");
}

function syncModTimeControls() {
  if (!modTimeControls) {
    return;
  }
  const enabled = canSelfEditWorldTime();
  modTimeControls.classList.toggle("hidden", !enabled);
  if (!enabled || !modTimeHourInput || document.activeElement === modTimeHourInput) {
    return;
  }
  const hour = Number(state.worldTime?.hour);
  const value = Number.isFinite(hour) ? ((hour % 24) + 24) % 24 : 8;
  modTimeHourInput.value = String(Math.round(value * 4) / 4);
}

function setWorldTimeFromMenu(hour) {
  if (!canSelfEditWorldTime()) {
    return;
  }
  const value = Number(hour);
  if (!Number.isFinite(value)) {
    return;
  }
  send({ type: "modSetWorldTime", hour: value });
}

function syncMenuSessionInfo() {
  if (!state.joined) {
    return;
  }
  menuServerLabel.textContent = formatServerDisplay(state.activeServerUrl);
  menuPopulation.textContent = `${state.population} online`;
  const self = state.players.get(state.selfId);
  menuPosition.textContent = self ? `${Math.round(self.renderX)}, ${Math.round(self.renderY)}` : "—";
  syncMenuWorldTime();
  syncModTimeControls();
}

function resetToConnection(message) {
  state.connected = false;
  state.joined = false;
  state.selfId = null;
  state.authenticated = false;
  state.socket = null;
  clearWorldState();
  state.menuOpen = false;
  menu.classList.add("hidden");
  menu.setAttribute("aria-hidden", "true");
  clearMovementInput();
  playButton.disabled = false;
  setStatus(message);
  bootPanel.classList.remove("hidden");
  accountForm.classList.add("hidden");
  modTimeControls?.classList.add("hidden");
  form.classList.add("hidden");
  progression.classList.add("hidden");
  equipmentPanel.classList.add("hidden");
  bagsPanel.classList.add("hidden");
  traderPanel.classList.add("hidden");
  abilityBar.classList.add("hidden");
  chat.classList.add("hidden");
  mobileControls.classList.add("hidden");
  safeZoneIndicator?.classList.add("hidden");
  safeZoneIndicator?.classList.remove("safe-zone-tooltip-pinned");
  clearTimeout(safeZoneTooltipPinTimer);
  safeZoneTooltipPinTimer = null;
  homeTeleportSlotEl?.classList.add("hidden");
  setChatMinimized(false);
  setProgressionMinimized(false);
  setActiveGameWindow(null);
  loginButton.disabled = false;
  createAccountButton.disabled = false;
  chatMessages.replaceChildren();
  state.debugRttMs = null;
  state.debugServerSimHz = null;
  state.debugServerTick = null;
}

function logout() {
  clearSavedCreds();
  clearTimeout(state._reconnectTimer);
  if (state.socket && state.socket.readyState !== WebSocket.CLOSED) {
    state.ignoreNextClose = true;
    state.socket.close();
  }
  state.socket = null;
  clearWorldState();
  state.connected = false;
  state.joined = false;
  state.selfId = null;
  state.authenticated = false;
  state.menuOpen = false;
  menu.classList.add("hidden");
  menu.setAttribute("aria-hidden", "true");
  modTimeControls?.classList.add("hidden");
  bootPanel.classList.remove("hidden");
  accountForm.classList.remove("hidden");
  form.classList.add("hidden");
  usernameInput.value = "";
  passwordInput.value = "";
  loginButton.disabled = false;
  createAccountButton.disabled = false;
  playButton.disabled = false;
  setStatus("Logged out");
  usernameInput.focus();
}

function clearWorldState() {
  state.players.clear();
  state.npcs.clear();
  state.mobs.clear();
  state.chests = [];
  state.groundItems = [];
  state.inventory = Array(10).fill(null);
  state.equipment = { weapon: null, body: null, ring1: null, ring2: null };
  state.ship = null;
  state.ships = [];
  state.quests = [];
  state.gold = 0;
  closeShop();
  closeShipTerminal();
  closeBuyHousePanel();
  state.speechBubbles.clear();
  state.combatFx = [];
  state.levelUpFx = [];
  state.portalTransition = null;
  state.teleportGuardUntil = 0;
  state.chunks.clear();
  state.portals.clear();
  state.buildings.clear();
  state.roadsides.clear();
  state.spaceObjects.clear();
  state.requestedChunks.clear();
  state.population = 0;
  state.worldTime = { hour: 8, phase: "day" };
  state.hoverTooltipText = "";
  state.pubPassoutUntil = 0;
  state.intimateBlackoutUntil = 0;
  state.morningAfterCompanionBedUntil = 0;
  state.benchSitUntil = 0;
  state.benchSeatIndefinite = false;
  state.friends = [];
  state.party = null;
  state.playerContextMenu = null;
  state.npcContext = null;
  state.tradePartnerId = null;
  state.friendsWindowOpen = false;
  partyPanel?.classList.add("hidden");
  friendsWindow?.classList.add("hidden");
  tradePanel?.classList.add("hidden");
  playerContextMenu?.classList.add("hidden");
  npcContextMenu?.classList.add("hidden");
  state.fountainToss = null;
  setWorldTheme("fantasy");
}

function sendAttack() {
  cancelBenchSitClient();
  const self = state.players.get(state.selfId);
  let payload = { type: "attack" };

  // Optional target world coords come in as arguments; we want them for ship gunner too.
  const args = Array.from(arguments);
  const targetX = args.length >= 1 && Number.isFinite(args[0]) ? Number(args[0]) : null;
  const targetY = args.length >= 2 && Number.isFinite(args[1]) ? Number(args[1]) : null;

  // Ship gunner — missiles auto-target; lasers fire toward clicked/aimed point.
  if (self?.ship?.boarded && self.ship.stationRole === "gunner") {
    if (state.input.weaponMode === "missile") {
      send({ type: "shipFire", weaponMode: "missile" });
    } else {
      const tx = Number.isFinite(targetX) ? targetX : state.lastPointerWorldX;
      const ty = Number.isFinite(targetY) ? targetY : state.lastPointerWorldY;
      send({
        type: "shipFire",
        ...(Number.isFinite(tx) ? { targetX: tx } : {}),
        ...(Number.isFinite(ty) ? { targetY: ty } : {})
      });
    }
    return;
  }

  // When piloting a ship, always fire forward in the ship's facing direction
  if (self?.ship?.boarded) {
    if (Number.isFinite(self.facing)) {
      payload.facing = Number(self.facing.toFixed(6));
    }
    send(payload);
    return;
  }

  // Allow optional target world coords (x,y) and compute facing client-side.
  if (Number.isFinite(targetX) && Number.isFinite(targetY)) {
    payload.targetX = targetX;
    payload.targetY = targetY;
    payload.facing = Number(Math.atan2(targetY - (self?.y || 0), targetX - (self?.x || 0)).toFixed(6));
    // Also set local facing for immediate feedback
    if (self) self.facing = payload.facing;
  } else {
    // no coords: fire in current facing
    if (self && Number.isFinite(self.facing)) {
      payload.facing = Number(self.facing.toFixed(6));
    }
  }
  send(payload);
}

function indexChunkPortals(chunk) {
  const minX = chunk.cx * CHUNK_SIZE;
  const minY = chunk.cy * CHUNK_SIZE;
  const maxX = minX + CHUNK_SIZE;
  const maxY = minY + CHUNK_SIZE;

  for (const key of [...state.portals.keys()]) {
    const [x, y] = key.split(",").map(Number);
    if (x >= minX && x < maxX && y >= minY && y < maxY) {
      state.portals.delete(key);
    }
  }

  for (const portal of chunk.portals || []) {
    state.portals.set(`${portal.x},${portal.y}`, portal);
  }
}

function indexChunkBuildings(chunk) {
  const minX = chunk.cx * CHUNK_SIZE;
  const minY = chunk.cy * CHUNK_SIZE;
  const maxX = minX + CHUNK_SIZE;
  const maxY = minY + CHUNK_SIZE;

  for (const [key, building] of [...state.buildings.entries()]) {
    if (
      building.x < maxX &&
      building.x + building.w > minX &&
      building.y < maxY &&
      building.y + building.h > minY
    ) {
      state.buildings.delete(key);
    }
  }

  for (const building of chunk.buildings || []) {
    state.buildings.set(`${building.x},${building.y},${building.w},${building.h}`, building);
  }
}

function indexChunkRoadsides(chunk) {
  const minX = chunk.cx * CHUNK_SIZE;
  const minY = chunk.cy * CHUNK_SIZE;
  const maxX = minX + CHUNK_SIZE;
  const maxY = minY + CHUNK_SIZE;

  for (const [id, f] of [...state.roadsides.entries()]) {
    const fx = f.x;
    const fy = f.y;
    if (fx >= minX && fx < maxX && fy >= minY && fy < maxY) {
      state.roadsides.delete(id);
    }
  }

  for (const feat of chunk.roadsides || []) {
    if (feat && feat.id) {
      state.roadsides.set(String(feat.id), feat);
    }
  }
}

function indexChunkSpaceObjects(chunk) {
  const minX = chunk.cx * CHUNK_SIZE;
  const minY = chunk.cy * CHUNK_SIZE;
  const maxX = minX + CHUNK_SIZE;
  const maxY = minY + CHUNK_SIZE;

  for (const [id, obj] of [...state.spaceObjects.entries()]) {
    const spanX = Math.max(1, Number(obj.w ?? obj.radius ?? 1) * 2);
    const spanY = Math.max(1, Number(obj.h ?? obj.radius ?? 1) * 2);
    const ox = Number(obj.x);
    const oy = Number(obj.y);
    if (ox - spanX / 2 < maxX && ox + spanX / 2 > minX && oy - spanY / 2 < maxY && oy + spanY / 2 > minY) {
      state.spaceObjects.delete(id);
    }
  }

  for (const obj of chunk.spaceObjects || []) {
    if (obj && obj.id) {
      state.spaceObjects.set(String(obj.id), obj);
    }
  }
}

function appendChat(message) {
  rememberSpeechBubble(message);
  const line = document.createElement("div");
  const kindClass = message.kind === "system" ? "system" : message.kind === "npc" ? "npc" : message.kind === "mod" ? "mod" : "player";
  line.className = `chat-line ${kindClass}`;

  if (message.kind === "system") {
    line.textContent = message.text;
  } else {
    const name = document.createElement("span");
    name.className = "chat-name";
    const modTag =
      message.kind === "mod" && typeof message.modChatTag === "string" && message.modChatTag.trim()
        ? message.modChatTag.trim()
        : null;
    const prefix = message.kind === "mod" ? (modTag ? `👑 ${modTag}` : `👑 ${message.name}`) : String(message.name);
    name.textContent = `${prefix}: `;
    line.append(name, document.createTextNode(message.text));
  }

  chatMessages.append(line);
  while (chatMessages.children.length > 80) {
    chatMessages.firstElementChild.remove();
  }
  chatMessages.scrollTop = chatMessages.scrollHeight;

  if (state.chatMinimized) {
    chatToggle.classList.add("has-unread");
    chatToggle.textContent = "Expand *";
  }
}

function rememberSpeechBubble(message) {
  if ((message.kind !== "player" && message.kind !== "npc" && message.kind !== "mod") || !message.fromId || !message.text) {
    return;
  }

  state.speechBubbles.set(message.fromId, {
    text: message.text,
    expiresAt: performance.now() + SPEECH_BUBBLE_MS
  });
}

function setChatMinimized(minimized) {
  state.chatMinimized = minimized;
  chat.classList.toggle("minimized", minimized);
  chatToggle.setAttribute("aria-expanded", String(!minimized));
  chatToggle.classList.remove("has-unread");
  chatToggle.textContent = minimized ? "Expand" : "Minimize";
  if (minimized) {
    clearMovementInput();
  }
}

function setProgressionMinimized(minimized) {
  state.progressionMinimized = minimized;
  progression.classList.toggle("minimized", minimized);
  progressionToggle.setAttribute("aria-expanded", String(!minimized));
  progressionToggle.innerHTML = minimized ? "&#43;" : "&#8722;";
}

function toggleMenu() {
  if (state.menuOpen) {
    closeMenu();
  } else {
    openMenu();
  }
}

function openMenu() {
  if (!state.joined) {
    return;
  }

  state.menuOpen = true;
  menu.classList.remove("hidden");
  menu.setAttribute("aria-hidden", "false");
  menuServerUrlInput.value = state.activeServerUrl || localStorage.getItem(SERVER_URL_STORAGE_KEY) || state.config.gameServerUrl;
  menuServerUrlInput.focus();
  menuServerUrlInput.select();
  clearMovementInput();
  syncDebugToggleButton();
  syncMenuSessionInfo();
}

function closeMenu() {
  state.menuOpen = false;
  menu.classList.add("hidden");
  menu.setAttribute("aria-hidden", "true");
}

const AUTO_CLOSE_RADIUS = TRADER_CLICK_PLAYER_RADIUS + 4;

function checkWindowAutoClose() {
  const self = state.players.get(state.selfId);
  if (!self) return;
  const px = self.renderX ?? self.x;
  const py = self.renderY ?? self.y;

  if (state.traderNpcId) {
    const npc = state.npcs.get(state.traderNpcId);
    if (!npc || Math.hypot(px - npc.x, py - npc.y) > AUTO_CLOSE_RADIUS) {
      traderPanel.classList.add("hidden");
      state.traderNpcId = null;
    }
  }

  if (state.shop?.open) {
    const dist = Math.hypot(px - state.shop.x, py - state.shop.y);
    if (dist > AUTO_CLOSE_RADIUS) {
      closeShop();
    }
  }

  if (state.shipTerminal?.open) {
    const port = state.shipTerminal.port || {};
    const tx = Number.isFinite(port.terminalX) ? port.terminalX : port.x;
    const ty = Number.isFinite(port.terminalY) ? port.terminalY : port.y;
    if (Number.isFinite(tx) && Number.isFinite(ty) && Math.hypot(px - tx, py - ty) > AUTO_CLOSE_RADIUS) {
      closeShipTerminal();
    }
  }

  if (state.buyHouseOffer) {
    const dist = Math.hypot(px - state.buyHouseOffer.buildingX, py - state.buyHouseOffer.buildingY);
    if (dist > AUTO_CLOSE_RADIUS) {
      closeBuyHousePanel();
    }
  }

  if (state.pendingCompanionInvite) {
    const npc = state.npcs.get(state.pendingCompanionInvite.npcId);
    if (!npc || Math.hypot(px - npc.x, py - npc.y) > AUTO_CLOSE_RADIUS) {
      closeCompanionInvitePanel();
    }
  }
}

function changeServer(url) {
  const normalizedUrl = normalizeServerUrl(url);
  closeMenu();
  clearWorldState();
  accountForm.classList.add("hidden");
  form.classList.add("hidden");
  playButton.disabled = false;
  state.joined = false;
  state.selfId = null;
  state.authenticated = false;
  state._reconnectAttempt = 0;
  clearTimeout(state._reconnectTimer);
  connect(normalizedUrl);
}

function frame(now) {
  const dt = Math.min(0.05, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
  if (state.debugHud) {
    updateClientFps(now);
    maybeSendDebugPing(now);
  }
  updateSmoothPlayers(dt);
  updateCamera(dt);
  checkWindowAutoClose();
  tickNpcContextMenuPosition();
  draw();
  requestAnimationFrame(frame);
}

function updateCamera(dt) {
  const self = state.players.get(state.selfId);
  if (!self) {
    return;
  }

  const follow = 1 - Math.pow(0.001, dt);
  const interiorView = getInteriorShipView(self);
  if (interiorView) {
    state.camera.x = interiorView.center.x * TILE_SIZE;
    state.camera.y = interiorView.center.y * TILE_SIZE;
    state.camera.rotation = normalizeAngle(
      state.camera.rotation + normalizeAngle(interiorView.rotation - state.camera.rotation) * follow
    );
  } else {
    const targetX = self.renderX * TILE_SIZE;
    const targetY = self.renderY * TILE_SIZE;
    state.camera.x += (targetX - state.camera.x) * follow;
    state.camera.y += (targetY - state.camera.y) * follow;
    state.camera.rotation = normalizeAngle(state.camera.rotation + normalizeAngle(0 - state.camera.rotation) * follow);
  }
  renderProgression(self);
  sendViewUpdate();
  requestVisibleChunks();
}

function sendViewUpdate() {
  const now = performance.now();
  if (!state.joined || now - state.lastViewSentAt < VIEW_SEND_INTERVAL_MS) {
    return;
  }
  state.lastViewSentAt = now;
  send({
    type: "view",
    view: {
      x: state.camera.x / TILE_SIZE,
      y: state.camera.y / TILE_SIZE,
      halfW: canvas.width / TILE_SIZE / 2 / getEffectiveWorldZoom(),
      halfH: canvas.height / TILE_SIZE / 2 / getEffectiveWorldZoom()
    }
  });
}

function renderProgression(self) {
  const level = Number.isFinite(self.level) ? self.level : 1;
  const xp = Number.isFinite(self.xp) ? self.xp : 0;
  const xpToNext = Number.isFinite(self.xpToNext) ? self.xpToNext : 100;
  const statPoints = Number.isFinite(self.statPoints) ? self.statPoints : 0;
  const stats = self.stats || {};
  const xpPct = Math.max(0, Math.min(100, (xp / Math.max(1, xpToNext)) * 100));

  const hpVal = Number.isFinite(self.hp) ? self.hp : 0;
  const maxHpVal = Number.isFinite(self.maxHp) ? self.maxHp : 1;
  const hpPct = Math.max(0, Math.min(100, (hpVal / Math.max(1, maxHpVal)) * 100));
  hpFill.style.width = `${hpPct}%`;
  hpFill.style.backgroundColor = hpPct < 26 ? "#e74c3c" : hpPct < 52 ? "#f1c40f" : "#2ecc71";
  hpText.textContent = `${hpVal} / ${maxHpVal} HP`;

  levelText.textContent = `Level ${level}`;
  const gold = Number.isFinite(self.gold) ? self.gold : 0;
  goldText.textContent = `${gold}g`;
  statPointsEl.textContent = `${statPoints} point${statPoints === 1 ? "" : "s"}`;
  xpFill.style.width = `${xpPct}%`;
  xpText.textContent = `${xp} / ${xpToNext} XP`;
  if (state.buyHouseOffer) {
    renderBuyHousePanel();
  }
  syncSafeZoneIndicator(self);
  syncHomeTeleportSlot(self);
}

function makeEquipSlotEl(slot, label) {
  const item = state.equipment?.[slot] || null;
  const cell = document.createElement("div");
  cell.className = `equip-slot-mini ${item ? item.rarity || "common" : "empty"}`;
  cell.dataset.equipmentSlot = slot;

  const lbl = document.createElement("span");
  lbl.className = "slot-label";
  lbl.textContent = label;

  const nameEl = document.createElement("span");
  nameEl.className = "slot-name";
  nameEl.textContent = item ? displayItemName(item) : "Empty";

  cell.append(lbl, nameEl);

  if (item) {
    const statsEl = document.createElement("span");
    statsEl.className = "item-stats";
    statsEl.style.fontSize = "10px";
    statsEl.textContent = formatItemStats(item);
    const actEl = document.createElement("div");
    actEl.className = "item-actions";
    const unequip = document.createElement("button");
    unequip.type = "button";
    unequip.style.fontSize = "10px";
    unequip.style.minHeight = "22px";
    unequip.dataset.equipmentAction = "unequip";
    unequip.dataset.equipmentSlot = slot;
    unequip.textContent = "Unequip";
    const drop = document.createElement("button");
    drop.type = "button";
    drop.style.fontSize = "10px";
    drop.style.minHeight = "22px";
    drop.dataset.equipmentAction = "drop";
    drop.dataset.equipmentSlot = slot;
    drop.textContent = "Drop";
    actEl.append(unequip, drop);
    cell.append(statsEl, actEl);
  }
  return cell;
}

function renderCharPreview(self) {
  if (!charPreviewCanvas || !self) return;
  const oc = new OffscreenCanvas(charPreviewCanvas.width, charPreviewCanvas.height);
  const mainCtx = ctx;
  ctx = oc.getContext("2d", { alpha: true });
  ctx.clearRect(0, 0, oc.width, oc.height);
  ctx.imageSmoothingEnabled = false;
  const previewEnt = {
    ...self,
    renderX: 0, renderY: 0,
    facing: Math.PI / 2,
    renderMoving: false,
    walkPhase: 0,
    equipment: state.equipment
  };
  drawCharacter(previewEnt, oc.width / 2, oc.height / 2 + 10);
  ctx = mainCtx;
  const pCtx = charPreviewCanvas.getContext("2d");
  pCtx.clearRect(0, 0, charPreviewCanvas.width, charPreviewCanvas.height);
  pCtx.drawImage(oc, 0, 0);
}

function renderTalentTree(self) {
  if (!talentTreeEl || !self) return;
  const classId = self.classId || "ranger";
  const trees = TALENT_TREES[classId] || TALENT_TREES.ranger;
  const unlockedTalents = self.talents || {};
  const abilityBarData = self.abilityBar || [null, null, null, null, null];

  talentTreeEl.replaceChildren();
  trees.forEach((tree) => {
    const section = document.createElement("section");
    section.className = "talent-tree-group";

    const title = document.createElement("h3");
    title.className = "talent-tree-title";
    title.textContent = displayTalentTreeName(classId, tree.name);

    const spellsEl = document.createElement("div");
    spellsEl.className = "talent-tree-spells";

    tree.spells.forEach((spell, tier) => {
      const unlocked = Boolean(unlockedTalents[spell.id]);
      const prevUnlocked = tier === 0 || Boolean(unlockedTalents[tree.spells[tier - 1].id]);
      const equipped = abilityBarData.some(s => s === spell.id);

      const node = document.createElement("div");
      node.className = `talent-node${unlocked ? " unlocked" : ""}${!prevUnlocked ? " locked" : ""}${equipped ? " equipped" : ""}`;

      const tierLabel = document.createElement("span");
      tierLabel.className = "talent-node-tier";
      tierLabel.textContent = `T${tier + 1}`;

      const ic = document.createElement("canvas");
      ic.className = "talent-node-icon";
      ic.width = 28; ic.height = 28;
      drawSpellIcon(ic, spell.id, unlocked);

      const spellView = displayTalentInfo(spell, classId);
      const nameEl = document.createElement("div");
      nameEl.className = "talent-node-name";
      nameEl.textContent = spellView.name;

      const desc = document.createElement("div");
      desc.className = "talent-node-desc";
      desc.textContent = spellView.desc;

      node.append(tierLabel, ic, nameEl, desc);

      if (!unlocked && prevUnlocked) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "talent-unlock-btn";
        btn.textContent = "Unlock (1pt)";
        btn.dataset.unlockTalent = spell.id;
        node.append(btn);
      } else if (unlocked && !equipped) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "talent-equip-btn";
        btn.textContent = "Equip to bar";
        btn.dataset.equipTalent = spell.id;
        node.append(btn);
      }

      spellsEl.append(node);
    });

    section.append(title, spellsEl);
    talentTreeEl.append(section);
  });
}

function renderCharTalentMini(self) {
  if (!charTalentMiniEl || !charTalentPointsMiniEl) return;
  charTalentMiniEl.replaceChildren();
  const tp = Number.isFinite(self.talentPoints) ? self.talentPoints : 0;
  charTalentPointsMiniEl.textContent =
    tp > 0 ? `${tp} talent pt${tp === 1 ? "" : "s"} to spend` : "";

  const classId = self.classId || "ranger";
  const trees = TALENT_TREES[classId] || TALENT_TREES.ranger;
  const unlockedMap = self.talents || {};
  const barSlots = self.abilityBar || [];
  const unlockedSpells = [];
  for (const tree of trees) {
    for (const spell of tree.spells) {
      if (unlockedMap[spell.id]) unlockedSpells.push(spell);
    }
  }

  if (unlockedSpells.length === 0) {
    const empty = document.createElement("span");
    empty.className = "char-talent-mini-empty";
    empty.textContent = "None yet — use Talents below to unlock.";
    charTalentMiniEl.append(empty);
    return;
  }

  for (const spell of unlockedSpells) {
    const node = document.createElement("div");
    const onBar = barSlots.includes(spell.id);
    node.className = `char-talent-mini-node${onBar ? " on-bar" : ""}`;
    const spellView = displayTalentInfo(spell, classId);
    node.title = `${spellView.name} — ${spellView.desc}${onBar ? " (on ability bar)" : ""}`;
    const ic = document.createElement("canvas");
    ic.width = 28;
    ic.height = 28;
    ic.className = "char-talent-mini-canvas";
    drawSpellIcon(ic, spell.id, true);
    const lbl = document.createElement("span");
    lbl.className = "char-talent-mini-name";
    lbl.textContent = spellView.name;
    node.append(ic, lbl);
    charTalentMiniEl.append(node);
  }
}

function renderEquipment() {
  const self = state.players.get(state.selfId);
  if (!self || !charStatsEl) return;

  const leftSlots  = [["weapon", "Weapon"], ["ring1", "Ring 1"]];
  const rightSlots = [["body", "Body"],     ["ring2", "Ring 2"]];

  equipSlotsLeft.replaceChildren(...leftSlots.map(([s, l]) => makeEquipSlotEl(s, l)));
  equipSlotsRight.replaceChildren(...rightSlots.map(([s, l]) => makeEquipSlotEl(s, l)));

  renderCharPreview(self);

  const stats = self.stats || {};
  const statPoints = Number.isFinite(self.statPoints) ? self.statPoints : 0;
  charStatsEl.innerHTML = "";
  if (statPoints > 0) {
    const banner = document.createElement("p");
    banner.className = "char-stats-points-banner";
    banner.textContent = `${statPoints} stat point${statPoints === 1 ? "" : "s"} to spend`;
    charStatsEl.append(banner);
  }
  for (const [label, val, statKey] of [
    ["HP", `${self.hp || 0} / ${self.maxHp || 0}`, null],
    ["Speed", stats.speed || 0, "speed"],
    ["Strength", stats.strength || 0, "strength"],
    ["Armour", stats.armour || 0, "armour"],
    ["Health", stats.health || 0, "health"]
  ]) {
    const chip = document.createElement("div");
    chip.className = "char-stat-chip";
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    const valEl = document.createElement("strong");
    valEl.textContent = String(val);
    chip.append(labelEl, valEl);
    if (statKey) {
      const plusBtn = document.createElement("button");
      plusBtn.type = "button";
      plusBtn.className = "stat-plus-btn";
      plusBtn.textContent = "+";
      plusBtn.dataset.stat = statKey;
      plusBtn.disabled = statPoints <= 0;
      chip.append(plusBtn);
    }
    charStatsEl.append(chip);
  }

  renderCharTalentMini(self);
}

function renderTalentPanel() {
  const self = state.players.get(state.selfId);
  if (!self) return;
  const tp = self.talentPoints || 0;
  const pct = ((self.level % 5) / 5) * 100;
  const talentProgressFill = document.getElementById("talentProgressFill");
  if (talentProgressFill) talentProgressFill.style.width = `${pct}%`;
  const nextTalentLevel = self.level + (5 - (self.level % 5 || 5));
  talentPointsText.textContent = `${tp} talent pt${tp !== 1 ? "s" : ""} · next at lv ${self.level % 5 === 0 ? self.level + 5 : nextTalentLevel}`;
  renderTalentTree(self);
}

function drawSpellIcon(iconCanvas, spellId, unlocked) {
  const c = iconCanvas.getContext("2d");
  c.clearRect(0, 0, 28, 28);
  const col = unlocked ? SPELL_ICON_COLORS[spellId] || "#c79cff" : "#3a2810";
  const cfg = SPELL_ANIMATION_CONFIG[spellId] || { kind: "burst", accent: "#ffffff" };
  c.fillStyle = unlocked ? "rgba(0,0,0,0.38)" : "#120d08";
  c.fillRect(2, 2, 24, 24);
  c.strokeStyle = unlocked ? col : "#3a2810";
  c.lineWidth = 2;
  c.strokeRect(3, 3, 22, 22);
  c.globalAlpha = unlocked ? 1 : 0.45;
  c.fillStyle = col;
  c.strokeStyle = col;
  c.lineWidth = 2;

  if (["bolt"].includes(cfg.kind)) {
    c.beginPath();
    c.moveTo(7, 19); c.lineTo(14, 4); c.lineTo(13, 12); c.lineTo(21, 9); c.lineTo(12, 24); c.lineTo(13, 15);
    c.closePath(); c.fill();
  } else if (["arrow", "pierce", "multi_arrow", "volley", "arrow_rain"].includes(cfg.kind)) {
    const arrows = cfg.kind === "multi_arrow" || cfg.kind === "volley" || cfg.kind === "arrow_rain" ? [9, 14, 19] : [14];
    for (const y of arrows) {
      c.beginPath(); c.moveTo(5, y); c.lineTo(21, y); c.stroke();
      c.beginPath(); c.moveTo(23, y); c.lineTo(17, y - 4); c.lineTo(17, y + 4); c.closePath(); c.fill();
    }
  } else if (["barrier", "fortify"].includes(cfg.kind)) {
    c.beginPath(); c.ellipse(14, 14, 9, 11, 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(14, 5); c.lineTo(21, 10); c.lineTo(18, 22); c.lineTo(14, 24); c.lineTo(10, 22); c.lineTo(7, 10); c.closePath(); c.stroke();
  } else if (["heal", "heal_big"].includes(cfg.kind)) {
    c.fillRect(12, 6, 4, 16);
    c.fillRect(6, 12, 16, 4);
    c.beginPath(); c.ellipse(14, 14, 10, 10, 0, 0, Math.PI * 2); c.stroke();
  } else if (cfg.kind === "cone" || cfg.kind === "melee") {
    c.beginPath(); c.arc(10, 18, 15, -1.2, 0.15); c.stroke();
    c.beginPath(); c.moveTo(9, 20); c.lineTo(22, 7); c.stroke();
  } else if (cfg.kind === "sword") {
    c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(8, 22); c.lineTo(21, 7); c.stroke(); // blade
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(5, 17); c.lineTo(15, 10); c.stroke(); // crossguard
    c.beginPath(); c.arc(7, 23, 2.5, 0, Math.PI * 2); c.fill(); // pommel
  } else if (cfg.kind === "shield") {
    c.beginPath();
    c.moveTo(14, 4); c.lineTo(22, 9); c.lineTo(22, 17); c.lineTo(14, 24); c.lineTo(6, 17); c.lineTo(6, 9); c.closePath();
    c.stroke();
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(14, 5); c.lineTo(14, 23); c.stroke();
    c.beginPath(); c.moveTo(7, 13); c.lineTo(21, 13); c.stroke();
  } else if (cfg.kind === "wrath") {
    c.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 - Math.PI / 8;
      c.beginPath();
      c.moveTo(14 + Math.cos(a) * 5, 14 + Math.sin(a) * 5);
      c.lineTo(14 + Math.cos(a) * 12, 14 + Math.sin(a) * 12);
      c.stroke();
    }
    c.beginPath(); c.arc(14, 14, 3, 0, Math.PI * 2); c.fill();
  } else if (["storm", "time", "smoke"].includes(cfg.kind)) {
    c.beginPath(); c.arc(12, 14, 6, 0, Math.PI * 1.5); c.stroke();
    c.beginPath(); c.arc(17, 14, 6, Math.PI, Math.PI * 2.5); c.stroke();
  } else if (["trap", "ground"].includes(cfg.kind)) {
    for (const [x, y] of [[9, 18], [14, 10], [19, 18]]) {
      c.beginPath(); c.moveTo(x - 4, y + 3); c.lineTo(x, y - 6); c.lineTo(x + 4, y + 3); c.stroke();
    }
  } else if (["dash", "vanish"].includes(cfg.kind)) {
    c.fillRect(8, 8, 5, 5); c.fillRect(13, 13, 5, 5); c.fillRect(18, 18, 4, 4);
    c.beginPath(); c.moveTo(6, 20); c.lineTo(20, 6); c.stroke();
  } else if (cfg.kind === "cry") {
    c.beginPath(); c.moveTo(7, 16); c.lineTo(12, 11); c.lineTo(12, 21); c.closePath(); c.fill();
    c.beginPath(); c.arc(15, 16, 5, -0.8, 0.8); c.arc(18, 16, 8, -0.8, 0.8); c.stroke();
  } else {
    c.beginPath(); c.ellipse(14, 14, 8, 8, 0, 0, Math.PI * 2); c.fill();
  }

  c.globalAlpha = unlocked ? 0.42 : 0.18;
  c.fillStyle = cfg.accent || "#ffffff";
  c.fillRect(6, 6, 5, 2);
  c.globalAlpha = 1;
}

const SPELL_ICON_COLORS = {
  fireball: "#ff6b1a", fire_nova: "#ff8c00", inferno: "#ff3300",
  ice_shard: "#88ccff", frost_barrier: "#a0d8ef", blizzard: "#6ab0e0",
  arcane_bolt: "#c79cff", mana_shield: "#9966ff", time_warp: "#cc88ff",
  shield_bash: "#8899aa", divine_shield: "#ffe066", fortify: "#aabbcc",
  holy_strike: "#ffee88", consecration: "#ffd700", divine_wrath: "#ffcc44",
  healing_aura: "#66ff88", lay_on_hands: "#44dd66", battle_cry: "#ffaa44",
  precise_shot: "#88ff44", piercing_arrow: "#aaff66", rain_of_arrows: "#66dd22",
  caltrops: "#aaa066", evasion: "#ccbb44", camouflage: "#448844",
  multishot: "#88dd44", smoke_bomb: "#777766", volley: "#99cc44"
};

const SPELL_ANIMATION_CONFIG = {
  fireball: { kind: "bolt", color: "#ff6b1a", accent: "#ffd166", ttl: 760 },
  fire_nova: { kind: "burst", color: "#ff8c00", accent: "#ffd166", ttl: 900 },
  inferno: { kind: "cone", color: "#ff3300", accent: "#ffb347", ttl: 980 },
  ice_shard: { kind: "bolt", color: "#88ccff", accent: "#e6f8ff", ttl: 720 },
  frost_barrier: { kind: "barrier", color: "#a0d8ef", accent: "#e6f8ff", ttl: 1000 },
  blizzard: { kind: "storm", color: "#6ab0e0", accent: "#e6f8ff", ttl: 1200 },
  arcane_bolt: { kind: "bolt", color: "#c79cff", accent: "#fff0ff", ttl: 660 },
  mana_shield: { kind: "barrier", color: "#9966ff", accent: "#d9c4ff", ttl: 1050 },
  time_warp: { kind: "time", color: "#cc88ff", accent: "#5cc8ff", ttl: 1100 },
  shield_bash: { kind: "shield", color: "#8899aa", accent: "#d7e4ef", ttl: 620 },
  divine_shield: { kind: "barrier", color: "#ffe066", accent: "#ffffff", ttl: 1100 },
  fortify: { kind: "fortify", color: "#aabbcc", accent: "#edf3f7", ttl: 1000 },
  holy_strike: { kind: "sword", color: "#ffee88", accent: "#ffffff", ttl: 620 },
  consecration: { kind: "ground", color: "#ffd700", accent: "#ffee88", ttl: 5000 },
  divine_wrath: { kind: "wrath", color: "#ffcc44", accent: "#ffffff", ttl: 980 },
  healing_aura: { kind: "heal", color: "#66ff88", accent: "#d8ffd8", ttl: 1100 },
  lay_on_hands: { kind: "heal_big", color: "#44dd66", accent: "#ffffff", ttl: 1200 },
  battle_cry: { kind: "cry", color: "#ffaa44", accent: "#ffd166", ttl: 900 },
  precise_shot: { kind: "arrow", color: "#88ff44", accent: "#f4ead3", ttl: 680 },
  piercing_arrow: { kind: "pierce", color: "#aaff66", accent: "#f4ead3", ttl: 760 },
  rain_of_arrows: { kind: "arrow_rain", color: "#66dd22", accent: "#f4ead3", ttl: 1150 },
  caltrops: { kind: "trap", color: "#aaa066", accent: "#e8c86a", ttl: 900 },
  evasion: { kind: "dash", color: "#ccbb44", accent: "#fff3a0", ttl: 820 },
  camouflage: { kind: "vanish", color: "#448844", accent: "#9fe29f", ttl: 1000 },
  multishot: { kind: "multi_arrow", color: "#88dd44", accent: "#f4ead3", ttl: 760 },
  smoke_bomb: { kind: "smoke", color: "#777766", accent: "#c7c7b8", ttl: 1100 },
  volley: { kind: "volley", color: "#99cc44", accent: "#f4ead3", ttl: 980 }
};

const CLIENT_SPELL_COOLDOWN_MS = {
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

function renderBags() {
  renderNearbyLoot();
  inventorySlots.replaceChildren();

  state.inventory.forEach((item, slot) => {
    const cell = document.createElement("div");
    cell.className = `inventory-slot ${item ? item.rarity || "common" : "empty"}`;
    cell.dataset.invSlot = String(slot);

    if (!item) {
      cell.textContent = slot + 1;
      inventorySlots.append(cell);
      return;
    }

    cell.draggable = true;
    cell.dataset.dragType = "inventory";
    cell.dataset.dragSlot = String(slot);
    cell.dataset.dragItemType = item.type || "";
    cell.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", JSON.stringify({ type: "inventory", slot, itemType: item.type }));
      e.dataTransfer.effectAllowed = "move";
    });

    const name = document.createElement("strong");
    name.textContent = displayItemName(item);

    const stats = document.createElement("span");
    stats.className = "item-stats";
    stats.textContent = formatItemStats(item);

    const actions = document.createElement("div");
    actions.className = "item-actions";
    if (item.type === "weapon" || item.type === "armor") {
      actions.append(itemActionButton("equip", slot, "Equip"));
    } else if (item.type === "ring") {
      actions.append(itemActionButton("equip", slot, "Ring 1", "ring1"));
      actions.append(itemActionButton("equip", slot, "Ring 2", "ring2"));
    }
    if (item.type === "potion") {
      actions.append(itemActionButton("use", slot, "Use"));
    }
    actions.append(itemActionButton("drop", slot, "Drop"));
    if (state.houseChestBuildingKey) {
      actions.append(itemActionButton("storeChest", slot, "Store"));
    }
    const info = document.createElement("div");
    info.className = "item-info";
    info.append(name, stats, actions);
    const body = document.createElement("div");
    body.className = "item-body";
    body.append(createItemIcon(item), info);
    cell.append(body);
    inventorySlots.append(cell);
  });
}

function renderHouseChestPanel() {
  if (!houseChestSlotsEl) {
    return;
  }
  houseChestSlotsEl.replaceChildren();
  const slots = Array.isArray(state.houseChestSlots)
    ? state.houseChestSlots.slice(0, HOUSE_CHEST_SLOTS)
    : [];
  while (slots.length < HOUSE_CHEST_SLOTS) {
    slots.push(null);
  }
  slots.forEach((item, slot) => {
    const cell = document.createElement("div");
    cell.className = `inventory-slot ${item ? item.rarity || "common" : "empty"}`;
    if (!item) {
      cell.textContent = slot + 1;
      houseChestSlotsEl.append(cell);
      return;
    }
    const name = document.createElement("strong");
    name.textContent = displayItemName(item);
    const stats = document.createElement("span");
    stats.className = "item-stats";
    stats.textContent = formatItemStats(item);
    const actions = document.createElement("div");
    actions.className = "item-actions";
    const takeBtn = document.createElement("button");
    takeBtn.type = "button";
    takeBtn.dataset.houseChestWithdraw = String(slot);
    takeBtn.textContent = "Take";
    actions.append(takeBtn);
    const info = document.createElement("div");
    info.className = "item-info";
    info.append(name, stats, actions);
    const body = document.createElement("div");
    body.className = "item-body";
    body.append(createItemIcon(item), info);
    cell.append(body);
    houseChestSlotsEl.append(cell);
  });
}

function renderHouseChestPanelIfOpen() {
  if (state.houseChestBuildingKey) {
    renderHouseChestPanel();
  }
}

function renderShipTerminal() {
  if (!shipTerminalPanel || !shipTerminalTitle || !shipTerminalPort || !shipTerminalList) {
    return;
  }

  if (!state.shipTerminal?.open) {
    shipTerminalPanel.classList.add("hidden");
    return;
  }

  const terminal = state.shipTerminal;
  shipTerminalTitle.textContent = `${terminal.stationName || "Station"} — Ship Terminal`;
  shipTerminalPort.textContent = "Station ship access";
  shipTerminalList.replaceChildren();

  if (!terminal.ships.length) {
    const empty = document.createElement("div");
    empty.className = "ship-terminal-empty";
    empty.textContent = "No ships registered to this account.";
    shipTerminalList.append(empty);
    return;
  }

  for (const ship of terminal.ships) {
    const row = document.createElement("div");
    row.className = `ship-terminal-row ${ship.active ? "active" : ""}`;

    const icon = createItemIcon({
      type: "ship",
      icon: "ship",
      rarity: ship.active ? "rare" : "common",
      color: ship.color
    });
    const info = document.createElement("div");
    info.className = "ship-terminal-info";

    const name = document.createElement("strong");
    name.textContent = ship.name || "Unnamed Ship";
    const stats = document.createElement("span");
    stats.className = "ship-terminal-stats";
    const status = ship.boarded
      ? "In flight"
      : ship.atTerminalPort
        ? "Ready"
        : "Stored";
    stats.textContent = [
      ship.hullClass || "ship",
      `crew ${ship.crewCapacity || 1}`,
      `hull ${Math.round(Number(ship.health) || 0)}/${Math.round(Number(ship.maxHealth) || 0)}`,
      `shield ${Math.round(Number(ship.shields) || 0)}/${Math.round(Number(ship.maxShields) || 0)}`,
      `speed ${Number(ship.speed || 0).toFixed(1)}`,
      `laser ${ship.laserTier || 1}`,
      `thrust ${ship.thrustTier || 1}`,
      status
    ].join(" · ");
    info.append(name, stats);

    const actions = document.createElement("div");
    actions.className = "ship-terminal-actions";
    const summon = document.createElement("button");
    summon.type = "button";
    summon.dataset.shipTerminalAction = "summon";
    summon.dataset.shipId = ship.id || "";
    summon.textContent = ship.atTerminalPort ? "Summoned" : "Summon";
    summon.disabled = Boolean(ship.atTerminalPort);
    const board = document.createElement("button");
    board.type = "button";
    board.dataset.shipTerminalAction = "board";
    board.dataset.shipId = ship.id || "";
    board.textContent = "Board";
    actions.append(summon, board);

    row.append(icon, info, actions);
    shipTerminalList.append(row);
  }

  const partyShips = Array.isArray(terminal.partyShips) ? terminal.partyShips : [];
  if (partyShips.length) {
    const header = document.createElement("div");
    header.className = "ship-terminal-section-header";
    header.textContent = "Party — Teleport to Crew";
    shipTerminalList.append(header);

    for (const offer of partyShips) {
      const row = document.createElement("div");
      row.className = "ship-terminal-row party";

      const icon = createItemIcon({
        type: "ship",
        icon: "ship",
        rarity: "uncommon",
        color: offer.color
      });
      const info = document.createElement("div");
      info.className = "ship-terminal-info";
      const name = document.createElement("strong");
      name.textContent = `${offer.shipName || "Ship"} — ${offer.ownerName || "Crewmate"}`;
      const stats = document.createElement("span");
      stats.className = "ship-terminal-stats";
      stats.textContent = [
        offer.hullClass || "ship",
        `crew ${offer.crewCapacity || 2}`,
        offer.deckMode ? "Interior" : "In flight"
      ].join(" · ");
      info.append(name, stats);

      const actions = document.createElement("div");
      actions.className = "ship-terminal-actions";
      const teleport = document.createElement("button");
      teleport.type = "button";
      teleport.dataset.shipTerminalAction = "boardParty";
      teleport.dataset.ownerId = offer.ownerId || "";
      teleport.textContent = "Teleport";
      actions.append(teleport);

      row.append(icon, info, actions);
      shipTerminalList.append(row);
    }
  }
}

function closeShipTerminal() {
  state.shipTerminal = null;
  shipTerminalPanel?.classList.add("hidden");
}

function showQuestOffer(payload) {
  if (!questOfferPanel) return;
  const quest = payload?.quest;
  if (!quest?.id || !quest.title) return;
  state.questOffer = { npcId: payload.npcId || null, quest };
  if (questOfferTitle) questOfferTitle.textContent = quest.title;
  if (questOfferGiver) questOfferGiver.textContent = payload.npcName ? `Offered by ${payload.npcName}` : "";
  if (questOfferSummary) questOfferSummary.textContent = quest.summary || "";
  if (questOfferSteps) {
    questOfferSteps.replaceChildren();
    for (const step of quest.steps || []) {
      const li = document.createElement("li");
      li.textContent = step?.text || step?.type || "";
      questOfferSteps.append(li);
    }
  }
  if (questOfferRewards) {
    questOfferRewards.replaceChildren();
    if (Number(quest.rewardGold) > 0) {
      const g = document.createElement("span");
      g.textContent = `Reward: ${quest.rewardGold}g`;
      questOfferRewards.append(g);
    }
    if (Number(quest.rewardXp) > 0) {
      const x = document.createElement("span");
      x.textContent = `${quest.rewardXp} XP`;
      questOfferRewards.append(x);
    }
  }
  questOfferPanel.classList.remove("hidden");
}

function closeQuestOffer() {
  state.questOffer = null;
  questOfferPanel?.classList.add("hidden");
}

function showTeleportMenu(payload) {
  if (!teleportMenuPanel || !teleportMenuList) return;
  const destinations = Array.isArray(payload?.destinations) ? payload.destinations : [];
  state.teleportMenu = { open: true, destinations };
  if (teleportMenuTitle) teleportMenuTitle.textContent = payload?.title || "Teleport";
  teleportMenuList.replaceChildren();
  if (!destinations.length) {
    const empty = document.createElement("div");
    empty.className = "ship-terminal-empty";
    empty.textContent = "No destinations available from here.";
    teleportMenuList.append(empty);
  } else {
    for (const dest of destinations) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "teleport-menu-row";
      row.dataset.teleportKind = dest.kind || "";
      row.dataset.teleportId = dest.id || "";
      const swatch = document.createElement("span");
      swatch.className = "teleport-menu-swatch";
      swatch.style.background = dest.color || "#67f0ff";
      const label = document.createElement("div");
      label.className = "teleport-menu-label";
      const strong = document.createElement("strong");
      strong.textContent = dest.label || "Destination";
      const sub = document.createElement("span");
      sub.textContent = dest.sublabel || "";
      label.append(strong, sub);
      const dist = document.createElement("span");
      dist.className = "teleport-menu-dist";
      dist.textContent = Number.isFinite(Number(dest.dist)) && dest.dist > 0 ? `${dest.dist} tiles` : "";
      row.append(swatch, label, dist);
      teleportMenuList.append(row);
    }
  }
  teleportMenuPanel.classList.remove("hidden");
}

function closeTeleportMenu() {
  state.teleportMenu = null;
  teleportMenuPanel?.classList.add("hidden");
}

function renderShop() {
  if (!shopPanel || !shopBuyList || !shopSellList || !shopGold || !shopTitle) {
    return;
  }

  if (!state.shop?.open) {
    shopPanel.classList.add("hidden");
    return;
  }

  const gold = Number.isFinite(state.shop.gold) ? state.shop.gold : state.gold;
  shopTitle.textContent =
    state.shop.shopType === "ship"
      ? `${state.shop.buildingName || state.shop.name} — Shipworks`
      : state.shop.shopType === "arms"
        ? `${state.shop.buildingName || state.shop.name} — Armoury`
      : state.shop.shopType === "stims"
        ? `${state.shop.buildingName || state.shop.name} — Clinic`
      : state.shop.shopType === "parts"
        ? `${state.shop.buildingName || state.shop.name} — Parts`
      : state.shop.shopType === "trade"
        ? `${state.shop.buildingName || state.shop.name} — Bazaar`
        : state.shop.shopType === "pub"
          ? `${state.shop.buildingName || state.shop.name} — Lounge`
          : state.shop.isPub && state.shop.buildingName
        ? `${state.shop.buildingName} Taproom`
        : state.shop.buildingName
          ? `${state.shop.buildingName} Shelf`
          : state.shop.name;
  shopGold.textContent = `${gold || 0} gold`;
  shopBuyList.replaceChildren();
  shopSellList.replaceChildren();

  for (const item of state.shop.stock || []) {
    const row = createShopRow(item, `${item.price || 1}g`, "Buy");
    const button = row.querySelector("button");
    button.dataset.shopAction = "buy";
    button.dataset.templateId = item.templateId;
    button.disabled = (state.gold || 0) < (item.price || 1);
    shopBuyList.append(row);
  }

  if (!state.shop.stock?.length) {
    const empty = document.createElement("div");
    empty.className = "shop-row empty";
    empty.textContent = "No stock";
    shopBuyList.append(empty);
  }

  let sellCount = 0;
  state.inventory.forEach((item, slot) => {
    if (!item) {
      return;
    }
    sellCount += 1;
    const price = Math.max(1, Math.floor((Number(item.value) || 1) * 0.5));
    const row = createShopRow(item, `${price}g`, "Sell");
    const button = row.querySelector("button");
    button.dataset.shopAction = "sell";
    button.dataset.slot = String(slot);
    shopSellList.append(row);
  });

  if (!sellCount) {
    const empty = document.createElement("div");
    empty.className = "shop-row empty";
    empty.textContent = "Nothing to sell";
    shopSellList.append(empty);
  }
}

function createShopRow(item, priceText, actionText) {
  const row = document.createElement("div");
  row.className = `shop-row ${item.rarity || "common"}`;
  const name = document.createElement("strong");
  name.textContent = displayItemName(item);
  const stats = document.createElement("span");
  stats.className = "item-stats";
  stats.textContent = [formatItemStats(item), priceText].filter(Boolean).join(" · ");
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = actionText;
  row.append(createItemIcon(item), name, stats, button);
  return row;
}

function closeShop() {
  state.shop = null;
  shopPanel?.classList.add("hidden");
}

function renderNearbyLoot() {
  const self = state.players.get(state.selfId);
  if (!self) {
    nearbyLoot.textContent = "Nothing nearby";
    return;
  }

  const nearbyItems = state.groundItems
    .filter((ground) => Math.hypot(ground.x - self.x, ground.y - self.y) <= 2.2)
    .slice(0, 3);
  const nearbyChests = state.chests
    .filter((chest) => !chest.opened && Math.hypot(chest.x - self.x, chest.y - self.y) <= 2.2)
    .slice(0, 2);

  nearbyLoot.replaceChildren();
  const label = document.createElement("span");
  label.textContent = "Nearby";
  nearbyLoot.append(label);

  if (nearbyChests.length === 0 && nearbyItems.length === 0) {
    const empty = document.createElement("strong");
    empty.textContent = "Nothing to pick up";
    nearbyLoot.append(empty);
    return;
  }

  for (const chest of nearbyChests) {
    const row = document.createElement("strong");
    row.textContent = `Chest ${Math.round(chest.x)}, ${Math.round(chest.y)}`;
    nearbyLoot.append(row);
  }
  for (const ground of nearbyItems) {
    const row = document.createElement("strong");
    row.textContent = displayItemName(ground.item) || "Loot";
    nearbyLoot.append(row);
  }
}

function createItemIcon(item) {
  const icon = document.createElement("span");
  icon.className = `item-icon ${displayItemIconClass(item)}`;
  icon.style.setProperty("--item-color", rarityIconColor(item.rarity));
  return icon;
}

function itemActionButton(action, slot, label, equipmentSlot = null) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.inventoryAction = action;
  button.dataset.slot = String(slot);
  if (equipmentSlot) {
    button.dataset.equipmentSlot = equipmentSlot;
  }
  button.textContent = label;
  return button;
}

function formatItemStats(item) {
  const labels = {
    damage: "dmg",
    strength: "str",
    armour: "arm",
    health: "hp",
    speed: "spd",
    healing: "heal"
  };
  return Object.entries(item.stats || {})
    .filter(([, value]) => value)
    .map(([key, value]) => `+${value} ${labels[key] || key}`)
    .join(" ");
}

function closeHouseChestSection() {
  state.houseChestSlots = null;
  state.houseChestBuildingKey = null;
  houseChestSection?.classList.add("hidden");
}

function toggleGameWindow(windowName) {
  setActiveGameWindow(state.activeWindow === windowName ? null : windowName);
}

function setActiveGameWindow(windowName) {
  closeBuyHousePanel();
  if (windowName !== "bags") {
    closeHouseChestSection();
  }
  state.activeWindow = windowName;
  equipmentPanel.classList.toggle("hidden", windowName !== "equipment");
  bagsPanel.classList.toggle("hidden", windowName !== "bags");
  questPanel?.classList.toggle("hidden", windowName !== "quests");
  traderPanel.classList.toggle("hidden", windowName !== "trader");
  talentPanel.classList.toggle("hidden", windowName !== "talent");
  equipmentButton.classList.toggle("selected", windowName === "equipment");
  bagsButton.classList.toggle("selected", windowName === "bags");
  questsButton?.classList.toggle("selected", windowName === "quests");
  if (windowName === "equipment") renderEquipment();
  if (windowName === "talent") renderTalentPanel();
  if (windowName === "quests") renderQuestPanel();
  if (windowName !== "trader") {
    state.traderNpcId = null;
    state.traderItems = [];
  }
  if (!windowName) clearMovementInput();
}

function tryOpenTraderAtClick(worldX, worldY) {
  const self = state.players.get(state.selfId);
  if (!self) return false;
  for (const npc of state.npcs.values()) {
    if (!npc.isTrader || npc.wandersToPlayer) continue;
    const nx = Number.isFinite(npc.renderX) ? npc.renderX : npc.x;
    const ny = Number.isFinite(npc.renderY) ? npc.renderY : npc.y;
    if (Math.hypot(nx - worldX, ny - worldY) > TRADER_CLICK_HIT_RADIUS) continue;
    const sx = Number.isFinite(self.renderX) ? self.renderX : self.x;
    const sy = Number.isFinite(self.renderY) ? self.renderY : self.y;
    if (Math.hypot(nx - sx, ny - sy) > TRADER_CLICK_PLAYER_RADIUS) continue;
    send({ type: "traderOpen", npcId: npc.id });
    return true;
  }
  return false;
}

function renderQuestPanel() {
  if (!questList) return;
  questList.replaceChildren();
  const quests = Array.isArray(state.quests) ? state.quests : [];
  if (!quests.length) {
    const empty = document.createElement("div");
    empty.className = "quest-empty";
    empty.textContent = "No active quests. Speak to people marked with ! in fantasy towns.";
    questList.append(empty);
    return;
  }
  const active = quests.filter((quest) => !quest.completed);
  const completed = quests.filter((quest) => quest.completed);
  for (const quest of [...active, ...completed]) {
    const card = document.createElement("section");
    card.className = `quest-card${quest.completed ? " completed" : ""}`;
    const head = document.createElement("div");
    head.className = "quest-card-head";
    const title = document.createElement("strong");
    title.textContent = quest.title || "Quest";
    const stateText = document.createElement("span");
    stateText.textContent = quest.completed ? "Complete" : "Active";
    head.append(title, stateText);

    const summary = document.createElement("p");
    summary.className = "quest-summary";
    summary.textContent = quest.summary || "";

    const objective = document.createElement("div");
    objective.className = "quest-objective";
    const obj = quest.objective;
    objective.textContent = quest.completed
      ? `Reward claimed: ${Number(quest.rewardXp) || 0} XP, ${Number(quest.rewardGold) || 0}g`
      : `${obj?.text || "Continue the quest"}${obj?.progressText ? ` (${obj.progressText})` : ""}`;

    card.append(head, summary, objective);
    if (!quest.completed) {
      const actions = document.createElement("div");
      actions.className = "quest-actions";
      const abandon = document.createElement("button");
      abandon.type = "button";
      abandon.className = "window-close";
      abandon.dataset.abandonQuest = quest.id;
      abandon.textContent = "Abandon";
      actions.append(abandon);
      card.append(actions);
    }
    questList.append(card);
  }
}

function renderTraderStock() {
  traderStock.replaceChildren();
  const self = state.players.get(state.selfId);
  const playerGold = self?.gold ?? 0;
  for (const entry of state.traderItems) {
    const row = document.createElement("div");
    row.className = `trader-item ${entry.item.rarity || "common"}${entry.sold ? " sold" : ""}`;

    const icon = createItemIcon(entry.item);
    const info = document.createElement("div");
    info.className = "trader-item-info";
    const name = document.createElement("strong");
    name.textContent = displayItemName(entry.item);
    const stats = document.createElement("span");
    stats.className = "item-stats";
    stats.textContent = formatItemStats(entry.item);
    info.append(name, stats);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "8px";
    const price = document.createElement("span");
    price.className = "trader-item-price";
    price.textContent = `${entry.price}g`;
    right.append(price);

    if (!entry.sold) {
      const buyBtn = document.createElement("button");
      buyBtn.type = "button";
      buyBtn.dataset.traderBuy = String(entry.index);
      buyBtn.textContent = "Buy";
      buyBtn.disabled = playerGold < entry.price;
      buyBtn.className = "window-close";
      right.append(buyBtn);
    } else {
      const soldLabel = document.createElement("span");
      soldLabel.textContent = "Sold";
      soldLabel.style.color = "var(--muted)";
      right.append(soldLabel);
    }

    row.append(icon, info, right);
    traderStock.append(row);
  }
}

function renderTraderSellSlots() {
  traderSellSlots.replaceChildren();
  state.inventory.forEach((item, slot) => {
    const cell = document.createElement("div");
    cell.className = `inventory-slot ${item ? item.rarity || "common" : "empty"}`;
    if (!item) {
      cell.textContent = slot + 1;
      traderSellSlots.append(cell);
      return;
    }
    const icon = createItemIcon(item);
    const name = document.createElement("strong");
    name.textContent = displayItemName(item);
    const stats = document.createElement("span");
    stats.className = "item-stats";
    stats.textContent = formatItemStats(item);
    const sellPrice = document.createElement("span");
    sellPrice.className = "sell-price";
    sellPrice.textContent = `Sell: ${itemSellPrice(item)}g`;
    const actions = document.createElement("div");
    actions.className = "item-actions";
    const sellBtn = document.createElement("button");
    sellBtn.type = "button";
    sellBtn.dataset.traderSell = String(slot);
    sellBtn.textContent = "Sell";
    actions.append(sellBtn);
    cell.append(icon, name, stats, sellPrice, actions);
    traderSellSlots.append(cell);
  });
}

function itemSellPrice(item) {
  if (!item) return 0;
  return Math.max(1, Math.floor((Number(item.value) || 1) * 0.5));
}

function requestVisibleChunks() {
  if (!state.joined) {
    return;
  }

  const zoom = state.zoom || 1;
  const widthTiles = Math.ceil(canvas.width / (TILE_SIZE * zoom));
  const heightTiles = Math.ceil(canvas.height / (TILE_SIZE * zoom));
  const centerTileX = Math.floor(state.camera.x / TILE_SIZE);
  const centerTileY = Math.floor(state.camera.y / TILE_SIZE);
  const minCx = Math.floor((centerTileX - widthTiles / 2) / CHUNK_SIZE) - 1;
  const maxCx = Math.floor((centerTileX + widthTiles / 2) / CHUNK_SIZE) + 1;
  const minCy = Math.floor((centerTileY - heightTiles / 2) / CHUNK_SIZE) - 1;
  const maxCy = Math.floor((centerTileY + heightTiles / 2) / CHUNK_SIZE) + 1;
  const chunks = [];

  for (let cy = minCy; cy <= maxCy; cy += 1) {
    for (let cx = minCx; cx <= maxCx; cx += 1) {
      const key = chunkKey(cx, cy);
      if (!state.chunks.has(key) && !state.requestedChunks.has(key)) {
        state.requestedChunks.add(key);
        chunks.push([cx, cy]);
      }
    }
  }

  if (chunks.length > 0) {
    send({ type: "requestChunks", chunks });
  }
}

function drawWorldHoverTooltip() {
  const t = state.hoverTooltipText;
  if (!t) return;
  const px = state.hoverTooltipX;
  const py = state.hoverTooltipY;
  const small = state.hoverTooltipSmall;
  ctx.save();
  ctx.font = small ? "10px ui-sans-serif, system-ui" : "12px ui-sans-serif, system-ui";
  const padX = small ? 6 : 8;
  const padY = small ? 4 : 5;
  const h = small ? 18 : 22;
  const w = ctx.measureText(t).width + padX * 2;
  let bx = px + 14;
  let by = py + 18;
  if (bx + w > canvas.width - 4) bx = canvas.width - w - 4;
  if (by + h > canvas.height - 4) by = py - h - 10;
  bx = Math.max(4, bx);
  by = Math.max(4, by);
  ctx.fillStyle = "rgba(12, 18, 14, 0.92)";
  ctx.strokeStyle = "rgba(110, 207, 141, 0.65)";
  ctx.lineWidth = 1;
  roundedRect(bx, by, w, h, small ? 3 : 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#dff7e8";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(t, bx + padX, by + h / 2);
  ctx.restore();
}

function drawFountainTossFx(halfW, halfH) {
  const toss = state.fountainToss;
  if (!toss) return;
  const now = performance.now();
  if (now >= toss.until) {
    state.fountainToss = null;
    return;
  }
  const self = state.players.get(state.selfId);
  if (!self) return;
  const span = Math.max(120, toss.until - toss.start);
  const u = Math.min(1, (now - toss.start) / span);
  const sx = self.renderX * TILE_SIZE - state.camera.x + halfW;
  const sy = self.renderY * TILE_SIZE - state.camera.y + halfH - 18;
  const ex = toss.tx * TILE_SIZE - state.camera.x + halfW;
  const ey = toss.ty * TILE_SIZE - state.camera.y + halfH - 16;
  const x = sx + (ex - sx) * u;
  const y = sy + (ey - sy) * u - Math.sin(u * Math.PI) * 40;
  ctx.save();
  ctx.fillStyle = "#ffd166";
  ctx.strokeStyle = "rgba(40,30,10,0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

const SHIP_RADAR_RANGE_TILES = 180;

function radarPoint(cx, cy, x, y, radius) {
  const dx = Number(x) - cx;
  const dy = Number(y) - cy;
  const dist = Math.hypot(dx, dy);
  const clamped = Math.min(dist, SHIP_RADAR_RANGE_TILES);
  const angle = Math.atan2(dy, dx);
  return {
    x: Math.cos(angle) * (clamped / SHIP_RADAR_RANGE_TILES) * radius,
    y: Math.sin(angle) * (clamped / SHIP_RADAR_RANGE_TILES) * radius,
    edge: dist > SHIP_RADAR_RANGE_TILES
  };
}

function drawGunnerMissileTarget() {
  const self = state.players.get(state.selfId);
  if (!self?.ship?.boarded || self.ship.stationRole !== "gunner") return;
  if (state.input.weaponMode !== "missile") return;

  // Find nearest mob visible on screen — prefer ship pirates.
  let target = null;
  let bestDist = Infinity;
  const sx = self.ship.worldX ?? self.x;
  const sy = self.ship.worldY ?? self.y;
  for (const mob of state.mobs.values()) {
    if (!mob) continue;
    const mx = mob.renderX ?? mob.x;
    const my = mob.renderY ?? mob.y;
    const d = Math.hypot(mx - sx, my - sy);
    if (target === null || (mob.isShipPirate && !target.isShipPirate) || d < bestDist) {
      target = mob;
      bestDist = d;
    }
  }
  if (!target) return;

  const pt = worldToScreenPoint(target.renderX ?? target.x, target.renderY ?? target.y);
  const now = performance.now();
  const pulse = 0.65 + Math.sin(now / 180) * 0.35;
  const r = 20 + Math.sin(now / 220) * 4;
  ctx.save();
  ctx.translate(pt.x, pt.y);
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = "#ff7b3a";
  ctx.lineWidth = 2;
  // Diamond reticle
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r, 0);
  ctx.closePath();
  ctx.stroke();
  // Corner ticks
  const tick = 6;
  const g = r * 0.7;
  for (const [dx, dy] of [[-g, -g], [g, -g], [g, g], [-g, g]]) {
    ctx.beginPath();
    ctx.moveTo(dx - tick * Math.sign(dx), dy);
    ctx.lineTo(dx, dy);
    ctx.lineTo(dx, dy - tick * Math.sign(dy));
    ctx.stroke();
  }
  ctx.restore();
}

function drawRadarBlip(cx, cy, x, y, radius, draw) {
  if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return;
  const p = radarPoint(cx, cy, Number(x), Number(y), radius);
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.edge) {
    ctx.globalAlpha = 0.72;
  }
  draw(p);
  ctx.restore();
}

function drawShipRadar() {
  const self = state.players.get(state.selfId);
  if (!self?.ship?.boarded || !isSciFiWorld()) return;
  const center = shipCenter(self.ship, self);
  const cx = Number(center.x);
  const cy = Number(center.y);
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;

  const size = Math.max(132, Math.min(178, Math.floor(Math.min(canvas.width, canvas.height) * 0.23)));
  const pad = 14;
  const x = canvas.width - size - pad;
  const y = pad;
  const radius = size / 2 - 15;
  const now = performance.now();

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(3, 10, 18, 0.78)";
  ctx.strokeStyle = "rgba(103, 240, 255, 0.55)";
  ctx.lineWidth = 1.5;
  roundedRect(0, 0, size, size, 8);
  ctx.fill();
  ctx.stroke();

  ctx.translate(size / 2, size / 2 + 4);
  ctx.strokeStyle = "rgba(103, 240, 255, 0.18)";
  ctx.lineWidth = 1;
  for (const rr of [0.33, 0.66, 1]) {
    ctx.beginPath();
    ctx.arc(0, 0, radius * rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-radius, 0);
  ctx.lineTo(radius, 0);
  ctx.moveTo(0, -radius);
  ctx.lineTo(0, radius);
  ctx.stroke();

  ctx.save();
  ctx.rotate(Number(self.ship.facing) || 0);
  ctx.fillStyle = "#67f0ff";
  ctx.strokeStyle = "rgba(2, 8, 14, 0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(-7, -6);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-7, 6);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();

  for (const obj of state.spaceObjects.values()) {
    const kind = obj?.kind || obj?.type;
    if (kind === "lane" || kind === "ship-port" || kind === "ship-console" || kind === "sci-shop-terminal") continue;
    drawRadarBlip(cx, cy, obj.x, obj.y, radius, () => {
      if (kind === "planet") {
        ctx.fillStyle = obj.color || obj.surfacePrimary || "#8bd346";
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      if (kind === "asteroid_field") {
        ctx.fillStyle = "rgba(190, 205, 220, 0.82)";
        ctx.fillRect(-2.5, -2.5, 5, 5);
        return;
      }
      if (kind === "station" || kind === "station-core" || kind === "station-plaza") {
        ctx.fillStyle = "#67f0ff";
        ctx.fillRect(-4, -4, 8, 8);
        return;
      }
      ctx.fillStyle = "rgba(126, 200, 255, 0.7)";
      ctx.fillRect(-2, -2, 4, 4);
    });
  }

  for (const mob of state.mobs.values()) {
    if (!mob?.isShipPirate) continue;
    drawRadarBlip(cx, cy, mob.renderX ?? mob.x, mob.renderY ?? mob.y, radius, () => {
      const pulse = 0.75 + Math.sin(now / 180) * 0.2;
      ctx.fillStyle = mob.isBoss ? "#ffcf6b" : `rgba(255, 107, 138, ${pulse})`;
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(5, 4);
      ctx.lineTo(-5, 4);
      ctx.closePath();
      ctx.fill();
    });
  }

  for (const player of state.players.values()) {
    if (!player || player.id === state.selfId || !player.ship?.boarded) continue;
    const pc = shipCenter(player.ship, player);
    drawRadarBlip(cx, cy, pc.x, pc.y, radius, () => {
      ctx.fillStyle = "#8fe388";
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#d8fbff";
  ctx.font = "bold 10px ui-sans-serif, system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("RADAR", x + 10, y + 8);
  ctx.fillStyle = "rgba(216,251,255,0.72)";
  ctx.font = "9px ui-sans-serif, system-ui";
  ctx.fillText(`${SHIP_RADAR_RANGE_TILES} tiles`, x + 10, y + 22);
  ctx.restore();
}

function draw() {
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  /** Solid fill so zoomed-out letterboxing matches the game frame (no “inner screen” seam). */
  ctx.fillStyle = state.worldTheme === SCI_FI_THEME ? "#02050d" : "#132118";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!state.joined) {
    drawTitleWorld();
    drawDebugHud();
    return;
  }

  const selfForZoom = state.players.get(state.selfId);
  const zoom = getEffectiveWorldZoom(selfForZoom);
  const viewRotation = Number(state.camera.rotation) || 0;
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  ctx.save();
  ctx.translate(halfW, halfH);
  ctx.scale(zoom, zoom);
  if (viewRotation) {
    ctx.rotate(viewRotation);
  }
  ctx.translate(-halfW, -halfH);

  drawWorld();
  drawPortals();
  drawCaravans();
  drawPlayers();
  drawFountainTossFx(halfW, halfH);
  drawTreeCanopies();
  drawCombatFx();
  drawTalentSpellFx();
  drawLevelUpFx();

  ctx.restore();
  // Lighting overlay runs in screen space so it always covers the full viewport,
  // even when the player has zoomed out and the scaled world doesn't fill the canvas.
  drawLighting();
  drawQuestHelperArrow();
  drawPortalTransitionOverlay();
  drawPubPassoutOverlay();
  drawIntimateBlackoutOverlay();
  drawShipRadar();
  drawGunnerMissileTarget();
  drawWorldHoverTooltip();
  if (state.menuOpen) {
    syncMenuSessionInfo();
  }
  drawDebugHud();
}

function worldToScreenPoint(worldX, worldY) {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const zoom = getEffectiveWorldZoom();
  const dx = worldX * TILE_SIZE - state.camera.x;
  const dy = worldY * TILE_SIZE - state.camera.y;
  const rotation = Number(state.camera.rotation) || 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: (dx * cos - dy * sin) * zoom + halfW,
    y: (dx * sin + dy * cos) * zoom + halfH
  };
}

function getTrackedQuestObjective() {
  const quests = Array.isArray(state.quests) ? state.quests : [];
  return quests.find((quest) => !quest.completed && quest.objective?.target) || null;
}

function drawQuestHelperArrow() {
  if (!state.joined || state.menuOpen || isSciFiWorld()) return;
  const quest = getTrackedQuestObjective();
  const target = quest?.objective?.target;
  if (!target || !Number.isFinite(Number(target.x)) || !Number.isFinite(Number(target.y))) return;

  const sx = Number(target.x);
  const sy = Number(target.y);
  const screen = worldToScreenPoint(sx, sy);
  const margin = 44;
  const inside =
    screen.x >= margin &&
    screen.x <= canvas.width - margin &&
    screen.y >= margin &&
    screen.y <= canvas.height - margin;

  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const dx = screen.x - halfW;
  const dy = screen.y - halfH;
  const angle = Math.atan2(dy, dx);
  const arrowX = inside ? screen.x : Math.max(margin, Math.min(canvas.width - margin, halfW + Math.cos(angle) * (halfW - margin)));
  const arrowY = inside ? screen.y : Math.max(margin, Math.min(canvas.height - margin, halfH + Math.sin(angle) * (halfH - margin)));

  ctx.save();
  ctx.translate(arrowX, arrowY);
  ctx.rotate(angle);
  ctx.fillStyle = inside ? "rgba(255, 209, 102, 0.36)" : "rgba(255, 209, 102, 0.92)";
  ctx.strokeStyle = "rgba(30, 18, 4, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-10, -10);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (!inside) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(255, 245, 215, 0.95)";
    ctx.strokeStyle = "rgba(8, 6, 3, 0.88)";
    ctx.lineWidth = 3;
    const label = quest.objective?.type === "kill" ? "Quest hunt" : "Quest talk";
    ctx.strokeText(label, arrowX, arrowY + 18);
    ctx.fillText(label, arrowX, arrowY + 18);
    ctx.restore();
  }
}

function drawTitleWorld() {
  const time = performance.now() / 1000;
  for (let y = 0; y < canvas.height; y += TILE_SIZE) {
    for (let x = 0; x < canvas.width; x += TILE_SIZE) {
      const wx = Math.floor(x / TILE_SIZE);
      const wy = Math.floor(y / TILE_SIZE);
      const shimmer = hash2(wx, wy, 1) + Math.sin(time + wx * 0.2) * 0.04;
      const tile = shimmer > 0.72 ? TILE.TREE : shimmer > 0.66 ? TILE.FLOWERS : TILE.GRASS;
      drawTile(tile, x, y, wx, wy);
    }
  }
}

function getChunkCanvas(cx, cy) {
  const key = `${cx},${cy}`;
  if (chunkCanvasCache.has(key)) return chunkCanvasCache.get(key);

  const oc = new OffscreenCanvas(CHUNK_SIZE * TILE_SIZE, CHUNK_SIZE * TILE_SIZE);
  const mainCtx = ctx;
  ctx = oc.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = false;
  for (let tly = 0; tly < CHUNK_SIZE; tly++) {
    for (let tlx = 0; tlx < CHUNK_SIZE; tlx++) {
      const wx = cx * CHUNK_SIZE + tlx;
      const wy = cy * CHUNK_SIZE + tly;
      const tile = getTile(wx, wy);
      drawTile(tile, tlx * TILE_SIZE, tly * TILE_SIZE, wx, wy);
    }
  }
  ctx = mainCtx;
  chunkCanvasCache.set(key, oc);
  return oc;
}

function drawRoadsideFeatures(minTileX, maxTileX, minTileY, maxTileY) {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;

  /** Local-space bench after translate(cx, gy) + optional rotate(facing). */
  const drawBenchLocal = () => {
    drawEllipseShadow(-26, 4, 54, 9, 0.22);
    ctx.fillStyle = "#4a3828";
    ctx.fillRect(-28, -8, 56, 10);
    ctx.fillStyle = "#6a5040";
    for (let i = 0; i < 5; i += 1) {
      const px = -24 + i * 10;
      ctx.fillRect(px, -18, 6, 12);
      ctx.strokeStyle = "rgba(30,22,14,0.45)";
      ctx.strokeRect(px, -18, 6, 12);
    }
    ctx.strokeStyle = "rgba(20,14,10,0.5)";
    ctx.strokeRect(-28, -8, 56, 10);
  };

  /** Upright market stall spanning `tilesWide` (hub uses 2). */
  const drawMarketStandLocal = (tilesWide = 2) => {
    const stallWpx = TILE_SIZE * Math.max(1, tilesWide);
    const pillarW = 6;
    const awningHalf = stallWpx / 2;
    drawEllipseShadow(-awningHalf + 10, 10, stallWpx + 8, 8, 0.2);
    ctx.fillStyle = "#4d3624";
    ctx.fillRect(-pillarW / 2, -2, pillarW, 10);
    ctx.fillRect(stallWpx / 2 - pillarW, -2, pillarW, 10);
    ctx.fillRect(-awningHalf + 2, -2, stallWpx - 4, 5);
    ctx.fillStyle = "#6a4830";
    const faceW = stallWpx - 8;
    ctx.fillRect(-faceW / 2, -20, faceW, 18);
    const stripe = Math.floor(faceW / 4);
    for (let si = 0; si < 4 && stripe > 3; si += 1) {
      ctx.fillStyle = si % 2 === 0 ? "#d4624a" : "#f7edd2";
      ctx.fillRect(-faceW / 2 + si * stripe, -20, stripe, 12);
    }
    ctx.strokeStyle = "rgba(24,14,10,0.45)";
    ctx.strokeRect(-faceW / 2, -20, faceW, 18);
    ctx.fillStyle = "rgba(120,92,62,0.35)";
    ctx.fillRect(-faceW / 2 + 4, -7, faceW - 8, 3);
  };

  const drawSmallTreeLocal = () => {
    drawEllipseShadow(-7, 8, 17, 5, 0.18);
    ctx.fillStyle = "#5a4028";
    ctx.fillRect(-2, -2, 4, 10);
    ctx.fillStyle = "#3d8348";
    ctx.beginPath();
    ctx.arc(0, -9, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(55,115,62,0.55)";
    ctx.beginPath();
    ctx.arc(-3, -12, 4, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawFountainSprite = (cx, gy, fwTiles = 4, fhTiles = 4) => {
    const wpx = Math.max(TILE_SIZE * 2, fwTiles * TILE_SIZE);
    const hpx = Math.max(TILE_SIZE * 2, fhTiles * TILE_SIZE);
    const rim = Math.min(22, Math.round(wpx * 0.08));
    ctx.save();
    drawEllipseShadow(cx - wpx / 2 + 6, gy + 4, wpx - 8, 14, 0.22);
    ctx.fillStyle = "#5a6278";
    ctx.beginPath();
    ctx.ellipse(cx, gy - hpx * 0.35, wpx / 2 - rim, hpx * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(26,34,52,0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(74,138,226,0.42)";
    ctx.beginPath();
    ctx.ellipse(cx, gy - hpx * 0.32, wpx / 2 - rim - 10, hpx * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(235,248,255,0.45)";
    ctx.fillRect(cx - wpx * 0.22, gy - hpx * 0.62, 5, hpx * 0.35);
    ctx.fillRect(cx + wpx * 0.14, gy - hpx * 0.58, 5, hpx * 0.3);
    ctx.fillStyle = "rgba(220,238,255,0.75)";
    ctx.beginPath();
    ctx.arc(cx, gy - hpx * 0.42, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(90,98,120,0.9)";
    for (const [ox, oy] of [
      [-wpx * 0.38, -hpx * 0.05],
      [wpx * 0.38, -hpx * 0.05],
      [-wpx * 0.38, -hpx * 0.52],
      [wpx * 0.38, -hpx * 0.52]
    ]) {
      ctx.fillRect(cx + ox - 5, gy + oy - 18, 10, 18);
    }
    ctx.restore();
  };

  const drawTableOutline = (cx, gy, w, shade) => {
    ctx.save();
    drawEllipseShadow(cx - w / 2, gy + 2, w + 8, 10, 0.24);
    ctx.fillStyle = shade;
    ctx.fillRect(cx - w / 2, gy - 10, w, 8);
    ctx.fillStyle = "#5c4030";
    ctx.fillRect(cx - w / 2 - 10, gy - 2, 6, 5);
    ctx.fillRect(cx + w / 2 + 6, gy - 2, 6, 5);
    ctx.restore();
  };

  for (const f of state.roadsides.values()) {
    const fw = Math.max(1, Math.floor(Number(f.footprintW) || 1));
    const fh = Math.max(1, Math.floor(Number(f.footprintH) || 1));
    if (f.x > maxTileX || f.y > maxTileY || f.x + fw - 1 < minTileX || f.y + fh - 1 < minTileY) {
      continue;
    }
    const gxCenterPx = (f.x + fw / 2) * TILE_SIZE - state.camera.x + halfW;
    const cx = Math.floor(gxCenterPx);
    const footRow = f.y + fh - 1;
    const gy = Math.floor(footRow * TILE_SIZE - state.camera.y + halfH) + TILE_SIZE - 10;
    const facing = Number.isFinite(f.facing) ? f.facing : 0;

    if (f.kind === "bench") {
      ctx.save();
      ctx.translate(cx, gy);
      /** Flip vertically so seat / legs read toward the ground tile. */
      ctx.scale(1, -1);
      ctx.translate(0, 12);
      drawBenchLocal();
      ctx.restore();
    } else if (f.kind === "market_stand") {
      const ftw = fw;
      ctx.save();
      ctx.translate(cx, gy - 2);
      ctx.rotate(facing);
      drawMarketStandLocal(ftw);
      ctx.restore();
    } else if (f.kind === "small_tree") {
      ctx.save();
      ctx.translate(cx, gy);
      drawSmallTreeLocal();
      ctx.restore();
    } else if (f.kind === "fountain") {
      drawFountainSprite(cx, gy - 4, fw, fh);
    } else if (f.kind === "table") {
      drawTableOutline(cx, gy, 38, "#7a5436");
    } else if (f.kind === "pub_table") {
      drawTableOutline(cx, gy, 44, "#6a4028");
      ctx.save();
      ctx.fillStyle = "rgba(255,220,160,0.35)";
      ctx.fillRect(cx - 8, gy - 16, 16, 5);
      ctx.restore();
    } else if (f.kind === "pub_chair") {
      ctx.save();
      drawEllipseShadow(cx - 8, gy + 2, 18, 6, 0.2);
      ctx.fillStyle = "#5a3820";
      ctx.fillRect(cx - 8, gy - 12, 16, 14);
      ctx.fillStyle = "#8a6040";
      ctx.fillRect(cx - 6, gy - 10, 12, 6);
      ctx.restore();
    }
  }
}

function drawPubPassoutOverlay() {
  const until = state.pubPassoutUntil || 0;
  const now = performance.now();
  if (until <= now) {
    return;
  }
  const span = until - now;
  const pulse = 0.72 + Math.sin(now / 120) * 0.06;
  const alpha = Math.min(0.9, 0.55 + (span > 2200 ? 0.28 : (3000 - span) / 3000 * 0.25));
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(12, 10, 22, ${alpha * pulse})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(240, 232, 255, 0.72)";
  ctx.font = "600 15px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("The floor tilts…", canvas.width / 2, canvas.height * 0.42);
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillStyle = "rgba(240, 232, 255, 0.5)";
  ctx.fillText("…heavy boots and distant laughter …", canvas.width / 2, canvas.height * 0.48);
  ctx.restore();
}

function drawTraderCaravans(minTileX, maxTileX, minTileY, maxTileY) {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  let i = 0;
  for (const pos of TRADER_CARAVAN_SPOTS) {
    if (pos.x < minTileX || pos.x > maxTileX || pos.y < minTileY || pos.y > maxTileY) {
      i += 1;
      continue;
    }
    const sx = Math.floor(pos.x * TILE_SIZE - state.camera.x + halfW);
    const sy = Math.floor(pos.y * TILE_SIZE - state.camera.y + halfH);
    drawCaravanSprite(sx, sy, i % 2 === 0);
    i += 1;
  }
}

function drawCaravanSprite(sx, sy, facingRight) {
  const ox = facingRight ? 2 : -2;
  const baseX = sx + TILE_SIZE / 2 + ox;
  const groundY = sy + TILE_SIZE - 3;
  ctx.save();
  drawEllipseShadow(baseX - 22, groundY + 2, 48, 10, 0.28);

  ctx.fillStyle = "#2a2420";
  ctx.fillRect(baseX - 18, groundY - 6, 12, 12);
  ctx.fillRect(baseX + 8, groundY - 6, 12, 12);
  ctx.strokeStyle = "#0f0c0a";
  ctx.lineWidth = 1;
  ctx.strokeRect(baseX - 18, groundY - 6, 12, 12);
  ctx.strokeRect(baseX + 8, groundY - 6, 12, 12);

  ctx.fillStyle = "#6b4428";
  ctx.fillRect(baseX - 26, groundY - 22, 54, 18);
  ctx.strokeStyle = "#2e2018";
  ctx.strokeRect(baseX - 26, groundY - 22, 54, 18);

  ctx.fillStyle = facingRight ? "#8b5a3a" : "#7a5034";
  ctx.fillRect(baseX - 24, groundY - 36, 50, 15);
  ctx.strokeStyle = "#3d2818";
  ctx.strokeRect(baseX - 24, groundY - 36, 50, 15);

  ctx.fillStyle = "#c49a4f";
  ctx.fillRect(baseX - 28, groundY - 38, 56, 6);
  ctx.fillRect(baseX - 30, groundY - 42, 60, 5);
  ctx.strokeStyle = "#4a3020";
  ctx.strokeRect(baseX - 28, groundY - 38, 56, 6);

  ctx.fillStyle = "#4a2024";
  ctx.fillRect(baseX + (facingRight ? 14 : -22), groundY - 30, 10, 12);

  ctx.fillStyle = "#ddd8c8";
  ctx.fillRect(baseX - 10, groundY - 32, 8, 6);
  ctx.fillRect(baseX + 2, groundY - 32, 8, 6);

  ctx.restore();
}

function drawWorld() {
  const zoom = state.zoom || 1;
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const visHalfW = halfW / zoom;
  const visHalfH = halfH / zoom;
  const minChunkX = Math.floor((state.camera.x - visHalfW) / (CHUNK_SIZE * TILE_SIZE)) - 1;
  const maxChunkX = Math.ceil( (state.camera.x + visHalfW) / (CHUNK_SIZE * TILE_SIZE)) + 1;
  const minChunkY = Math.floor((state.camera.y - visHalfH) / (CHUNK_SIZE * TILE_SIZE)) - 1;
  const maxChunkY = Math.ceil( (state.camera.y + visHalfH) / (CHUNK_SIZE * TILE_SIZE)) + 1;

  for (let cy = minChunkY; cy <= maxChunkY; cy++) {
    for (let cx = minChunkX; cx <= maxChunkX; cx++) {
      if (!state.chunks.has(`${cx},${cy}`)) continue;
      const chunkCanvas = getChunkCanvas(cx, cy);
      const sx = Math.floor(cx * CHUNK_SIZE * TILE_SIZE - state.camera.x + halfW);
      const sy = Math.floor(cy * CHUNK_SIZE * TILE_SIZE - state.camera.y + halfH);
      ctx.drawImage(chunkCanvas, sx, sy);
    }
  }

  const minTileX = minChunkX * CHUNK_SIZE - 1;
  const maxTileX = (maxChunkX + 1) * CHUNK_SIZE + 1;
  const minTileY = minChunkY * CHUNK_SIZE - 1;
  const maxTileY = (maxChunkY + 1) * CHUNK_SIZE + 1;
  if (state.worldTheme === SCI_FI_THEME) {
    drawSpaceBackdrop(minChunkX, maxChunkX, minChunkY, maxChunkY);
  }
  drawWorldAssets(minTileX, maxTileX, minTileY, maxTileY);
  drawSpaceObjects();
  drawWorldLoot();
  drawBuildingSprites(minTileX, maxTileX, minTileY, maxTileY);
  drawRoadsideFeatures(minTileX, maxTileX, minTileY, maxTileY);
  drawTraderCaravans(minTileX, maxTileX, minTileY, maxTileY);
}

function drawSpaceBackdrop(minChunkX, maxChunkX, minChunkY, maxChunkY, fillBackground = false) {
  if (fillBackground) {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#02050d");
    grad.addColorStop(0.45, "#08101f");
    grad.addColorStop(1, "#03050a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const zoom = state.zoom || 1;
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const minTileX = minChunkX * CHUNK_SIZE - 6;
  const maxTileX = (maxChunkX + 1) * CHUNK_SIZE + 6;
  const minTileY = minChunkY * CHUNK_SIZE - 6;
  const maxTileY = (maxChunkY + 1) * CHUNK_SIZE + 6;

  for (let y = minTileY; y <= maxTileY; y += 1) {
    for (let x = minTileX; x <= maxTileX; x += 1) {
      const wx = x * TILE_SIZE - state.camera.x + halfW;
      const wy = y * TILE_SIZE - state.camera.y + halfH;
      const star = hash2(x, y, 9901);
      if (star < 0.975) {
        continue;
      }
      const size = star > 0.995 ? 2 : 1;
      ctx.fillStyle = star > 0.995 ? "rgba(120,240,255,0.95)" : "rgba(240,248,255,0.72)";
      ctx.fillRect(wx, wy, size, size);
    }
  }

  const haze = ctx.createRadialGradient(halfW, halfH, 0, halfW, halfH, Math.max(canvas.width, canvas.height) * (0.32 + zoom * 0.06));
  haze.addColorStop(0, "rgba(99, 175, 255, 0.10)");
  haze.addColorStop(0.55, "rgba(8, 12, 24, 0.04)");
  haze.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSpaceObjects() {
  if (state.worldTheme !== SCI_FI_THEME) {
    return;
  }

  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const items = [...state.spaceObjects.values()].sort((a, b) => {
    const ao = spaceObjectDrawOrder(a);
    const bo = spaceObjectDrawOrder(b);
    if (ao !== bo) {
      return ao - bo;
    }
    return String(a.kind || a.type || "").localeCompare(String(b.kind || b.type || ""));
  });

  for (const obj of items) {
    if (!obj || !Number.isFinite(obj.x) || !Number.isFinite(obj.y)) {
      continue;
    }
    const sx = obj.x * TILE_SIZE - state.camera.x + halfW;
    const sy = obj.y * TILE_SIZE - state.camera.y + halfH;
    if (obj.kind === "planet" || obj.type === "planet") {
      drawPlanetObject(obj, sx, sy);
    } else if (obj.kind === "asteroid_field") {
      drawAsteroidFieldObject(obj, sx, sy);
    } else if (obj.kind === "lane" || obj.type === "lane") {
      drawShipLaneObject(obj, halfW, halfH);
    } else if (obj.kind === "corridor") {
      drawCorridorObject(obj, sx, sy);
    } else if (obj.kind === "station-core") {
      drawStationCoreObject(obj, sx, sy);
    } else if (obj.kind === "core" || obj.kind === "command" || obj.kind === "quarters" || obj.kind === "reactor" || obj.kind === "docks") {
      drawStationRoomObject(obj, sx, sy);
    } else if (obj.kind === "ship-bay") {
      drawShipBayObject(obj, sx, sy);
    } else if (obj.kind === "sci-shop") {
      drawSciFiShopObject(obj, sx, sy);
    } else if (obj.kind === "sci-shop-terminal") {
      drawSciFiShopTerminalObject(obj, sx, sy);
    } else if (obj.kind === "station-module" || obj.kind === "station-kiosk") {
      drawStationModuleObject(obj, sx, sy);
    } else if (obj.kind === "defense-turret" || obj.kind === "orbital-cannon") {
      drawSciFiDefenseObject(obj, sx, sy);
    } else if (obj.kind === "cargo-crate" || obj.kind === "shipping-crate" || obj.kind === "container-box") {
      drawCargoCrateObject(obj, sx, sy);
    } else if (obj.kind === "shop-bay" || obj.kind === "ship-shop") {
      drawShopBayObject(obj, sx, sy);
    } else if (obj.kind === "ship-console") {
      drawShipConsoleObject(obj, sx, sy);
    } else if (obj.kind === "ship-port") {
      drawDockPortObject(obj, sx, sy);
    } else {
      drawStationObject(obj, sx, sy);
    }
  }
}

function spaceObjectDrawOrder(obj) {
  const kind = obj?.kind || obj?.type || "";
  if (kind === "lane") return 0;
  if (kind === "planet") return 1;
  if (kind === "asteroid_field") return 1;
  if (kind === "station") return 2;
  if (kind === "corridor" || kind === "station-core" || kind === "core" || kind === "command" || kind === "quarters" || kind === "reactor" || kind === "docks") return 3;
  if (kind === "ship-bay" || kind === "shop-bay" || kind === "ship-shop" || kind === "station-module") return 4;
  if (kind === "cargo-crate" || kind === "shipping-crate" || kind === "container-box") return 5;
  if (kind === "sci-shop" || kind === "station-kiosk") return 6;
  if (kind === "defense-turret" || kind === "orbital-cannon") return 6;
  if (kind === "ship-port") return 7;
  if (kind === "ship-console" || kind === "sci-shop-terminal") return 8;
  return 5;
}

function drawCorridorObject(obj, sx, sy) {
  const w = Math.max(4, Number(obj.w || 8)) * TILE_SIZE;
  const h = Math.max(3, Number(obj.h || 4)) * TILE_SIZE;
  const x = sx - w / 2;
  const y = sy - h / 2;
  ctx.save();
  const longHorizontal = w >= h;
  ctx.fillStyle = "rgba(10, 18, 30, 0.58)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(34, 48, 72, 0.48)";
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  ctx.fillStyle = "rgba(103, 240, 255, 0.08)";
  ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
  ctx.fillStyle = "rgba(8, 14, 22, 0.58)";
  if (longHorizontal) {
    ctx.fillRect(x + 10, y + h * 0.38, w - 20, h * 0.24);
    ctx.fillStyle = "rgba(103, 240, 255, 0.13)";
    ctx.fillRect(x + 10, y + h * 0.46, w - 20, 3);
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    for (let i = 0; i < Math.max(3, Math.round(w / 60)); i += 1) {
      const px = x + 10 + i * (w - 20) / Math.max(1, Math.round(w / 60));
      ctx.fillRect(px, y + 6, 4, h - 12);
    }
  } else {
    ctx.fillRect(x + w * 0.38, y + 10, w * 0.24, h - 20);
    ctx.fillStyle = "rgba(103, 240, 255, 0.13)";
    ctx.fillRect(x + w * 0.46, y + 10, 3, h - 20);
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    for (let i = 0; i < Math.max(2, Math.round(h / 60)); i += 1) {
      const py = y + 10 + i * (h - 20) / Math.max(1, Math.round(h / 60));
      ctx.fillRect(x + 6, py, w - 12, 4);
    }
  }
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(x + 8, y + 8, 8, 2);
  ctx.fillStyle = "rgba(103,240,255,0.20)";
  ctx.fillRect(x + w - 14, y + h - 14, 6, 6);
  ctx.strokeStyle = "rgba(103,240,255,0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
}

function drawShopBayObject(obj, sx, sy) {
  const w = Math.max(4, Number(obj.w || 6)) * TILE_SIZE;
  const h = Math.max(3, Number(obj.h || 4)) * TILE_SIZE;
  const x = sx - w / 2;
  const y = sy - h / 2;
  ctx.save();
  ctx.fillStyle = "rgba(12, 18, 31, 0.96)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(103, 240, 255, 0.12)";
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = "rgba(255, 216, 102, 0.92)";
  ctx.fillRect(x + 6, y + h - 9, w - 12, 3);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(x + w * 0.18, y + 8, w * 0.64, 4);
  ctx.fillStyle = "rgba(78, 207, 255, 0.2)";
  ctx.fillRect(x + 10, y + 12, w - 20, h - 22);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(x + 8, y + 14, 6, h - 26);
  ctx.fillRect(x + w - 14, y + 14, 6, h - 26);
  ctx.strokeStyle = "rgba(103,240,255,0.44)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
}

function drawShipBayObject(obj, sx, sy) {
  const w = Math.max(6, Number(obj.w || 8)) * TILE_SIZE;
  const h = Math.max(4, Number(obj.h || 5)) * TILE_SIZE;
  const x = sx - w / 2;
  const y = sy - h / 2;
  ctx.save();
  ctx.fillStyle = "rgba(8, 12, 22, 0.96)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(103, 240, 255, 0.12)";
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  drawEllipseShadow(x + w * 0.48 - 6, y + h * 0.78, w * 0.36, 10, 0.2);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x + 8, y + 8, w - 16, 4);
  ctx.fillStyle = "rgba(103, 240, 255, 0.25)";
  ctx.fillRect(x + 10, y + h * 0.62, w - 20, 4);
  ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
  ctx.fillRect(x + 6, y + h * 0.18, 6, h * 0.46);
  ctx.fillStyle = "#e9fbff";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.2, y + h * 0.65);
  ctx.lineTo(x + w * 0.54, y + h * 0.35);
  ctx.lineTo(x + w * 0.8, y + h * 0.47);
  ctx.lineTo(x + w * 0.72, y + h * 0.7);
  ctx.lineTo(x + w * 0.36, y + h * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(103,240,255,0.9)";
  ctx.fillRect(x + w * 0.48, y + h * 0.38, 5, h * 0.22);
  ctx.fillStyle = "rgba(103,240,255,0.3)";
  ctx.fillRect(x + w * 0.22, y + h * 0.58, w * 0.5, 4);
  ctx.restore();
}

function drawSciFiDefenseObject(obj, sx, sy) {
  const isCannon = obj.kind === "orbital-cannon";
  const t = performance.now() / 1000;
  const pulse = 0.55 + Math.sin(t * (isCannon ? 2.2 : 3.8) + sx * 0.01) * 0.18;
  ctx.save();
  drawEllipseShadow(sx - 18, sy + 14, 36, 10, 0.28);
  ctx.translate(sx, sy);
  ctx.fillStyle = isCannon ? "rgba(32, 24, 12, 0.96)" : "rgba(10, 22, 32, 0.96)";
  ctx.strokeStyle = isCannon ? "#ffd166" : "#67f0ff";
  ctx.lineWidth = 2;
  roundedRect(isCannon ? -18 : -12, isCannon ? -14 : -10, isCannon ? 36 : 24, isCannon ? 28 : 20, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = isCannon ? `rgba(255, 209, 102, ${pulse})` : `rgba(103, 240, 255, ${pulse})`;
  ctx.fillRect(isCannon ? -5 : -3, isCannon ? -22 : -17, isCannon ? 10 : 6, isCannon ? 28 : 22);
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.fillRect(isCannon ? -2 : -1, isCannon ? -24 : -19, isCannon ? 4 : 2, isCannon ? 8 : 6);
  ctx.strokeStyle = isCannon ? "rgba(255, 209, 102, 0.35)" : "rgba(103, 240, 255, 0.32)";
  ctx.beginPath();
  ctx.arc(0, 0, isCannon ? 24 : 17, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function sciFiShopAccent(shopType) {
  if (shopType === "ship") {
    return { main: "#67f0ff", glow: "rgba(103,240,255,0.28)", sign: "#d7fbff" };
  }
  if (shopType === "arms") {
    return { main: "#ff8f6b", glow: "rgba(255,143,107,0.24)", sign: "#fff0da" };
  }
  if (shopType === "stims") {
    return { main: "#82ffbb", glow: "rgba(130,255,187,0.24)", sign: "#e8fff1" };
  }
  if (shopType === "parts") {
    return { main: "#f7d86a", glow: "rgba(247,216,106,0.24)", sign: "#fff7cf" };
  }
  return { main: "#9fe7ff", glow: "rgba(159,231,255,0.22)", sign: "#e9fbff" };
}

function drawSciFiShopObject(obj, sx, sy) {
  const w = Math.max(6, Number(obj.w || 8)) * TILE_SIZE;
  const h = Math.max(4, Number(obj.h || 5)) * TILE_SIZE;
  const x = sx - w / 2;
  const y = sy - h / 2;
  const accent = sciFiShopAccent(obj.shopType);
  const t = performance.now() / 1000;
  const pulse = 0.45 + Math.sin(t * 4 + sx * 0.01 + sy * 0.01) * 0.12;
  ctx.save();
  drawEllipseShadow(x - 4, y + h * 0.82, w + 8, 12, 0.26);
  ctx.fillStyle = "rgba(8, 14, 24, 0.97)";
  ctx.fillRect(x, y + 3, w, h - 3);
  ctx.fillStyle = "rgba(26, 40, 56, 0.98)";
  ctx.fillRect(x + 3, y + 7, w - 6, h - 10);
  ctx.fillStyle = accent.glow;
  ctx.fillRect(x + 5, y + 10, w - 10, h - 18);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x + 7, y + 8, w - 14, 4);
  ctx.fillStyle = accent.main;
  ctx.fillRect(x + w * 0.18, y + 5, w * 0.64, 5);
  ctx.fillStyle = accent.sign;
  ctx.fillRect(x + w * 0.22, y + 6, w * 0.56, 2);
  ctx.fillStyle = "rgba(12, 18, 30, 0.92)";
  ctx.beginPath();
  ctx.moveTo(x + 2, y + h * 0.32);
  ctx.lineTo(x + w * 0.14, y + 10);
  ctx.lineTo(x + w * 0.88, y + 10);
  ctx.lineTo(x + w - 2, y + h * 0.32);
  ctx.lineTo(x + w - 8, y + h - 4);
  ctx.lineTo(x + 8, y + h - 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x + 9, y + 15, w - 18, 3);
  ctx.fillStyle = "rgba(103,240,255,0.28)";
  ctx.fillRect(x + 8, y + h - 10, w - 16, 3);
  ctx.fillStyle = `rgba(255,255,255,${pulse})`;
  ctx.fillRect(x + w * 0.47, y + h - 14, w * 0.06, 6);
  drawSciFiShopDoors(obj, x, y, w, h, accent);
  ctx.strokeStyle = accent.main;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
}

function drawSciFiShopDoors(obj, x, y, w, h, accent) {
  const openT = getStationShopDoorOpenFactor(obj);
  const fw = Math.max(1, Math.floor(Number(obj.w) || 1));
  const fh = Math.max(1, Math.floor(Number(obj.h) || 1));
  const tileW = w / fw;
  const tileH = h / fh;

  for (const door of stationShopDoorAnchors(obj)) {
    const side = door.side;
    const width = Math.max(1, Number(door.width) || 2);
    const span = width * (side === "bottom" ? tileW : tileH);
    const panelGap = Math.round(openT * Math.min(22, span * 0.34));
    ctx.save();
    ctx.shadowColor = accent.main;
    ctx.shadowBlur = 7 + openT * 8;
    ctx.fillStyle = "rgba(5, 10, 18, 0.92)";
    if (side === "bottom") {
      const localCenterX = (door.x - (Number(obj.x) - Math.floor(fw / 2))) * tileW;
      const dw = Math.max(28, span);
      const dh = 18;
      const dx = x + localCenterX - dw / 2;
      const dy = y + h - dh - 1;
      ctx.fillRect(dx, dy, dw, dh);
      ctx.strokeStyle = accent.main;
      ctx.lineWidth = 2;
      ctx.strokeRect(dx - 2, dy - 2, dw + 4, dh + 4);
      ctx.fillStyle = "rgba(103,240,255,0.18)";
      ctx.fillRect(dx + 3, dy + 3, dw - 6, dh - 6);
      ctx.fillStyle = accent.main;
      const half = Math.max(4, dw / 2 - 3);
      ctx.fillRect(dx + 2 - panelGap, dy + 2, half, dh - 4);
      ctx.fillRect(dx + dw / 2 + 1 + panelGap, dy + 2, half, dh - 4);
    } else {
      const minY = Number(obj.y) - Math.floor(fh / 2);
      const localCenterY = (door.y - minY) * tileH;
      const dw = 18;
      const dh = Math.max(30, span);
      const dx = side === "east" ? x + w - dw - 1 : x + 1;
      const dy = y + localCenterY - dh / 2;
      ctx.fillRect(dx, dy, dw, dh);
      ctx.strokeStyle = accent.main;
      ctx.lineWidth = 2;
      ctx.strokeRect(dx - 2, dy - 2, dw + 4, dh + 4);
      ctx.fillStyle = "rgba(103,240,255,0.18)";
      ctx.fillRect(dx + 3, dy + 3, dw - 6, dh - 6);
      ctx.fillStyle = accent.main;
      const half = Math.max(5, dh / 2 - 3);
      ctx.fillRect(dx + 2, dy + 2 - panelGap, dw - 4, half);
      ctx.fillRect(dx + 2, dy + dh / 2 + 1 + panelGap, dw - 4, half);
    }
    ctx.restore();
  }
}

function drawSciFiShopTerminalObject(obj, sx, sy) {
  const accent = sciFiShopAccent(obj.shopType);
  const t = performance.now() / 1000;
  const pulse = 0.55 + Math.sin(t * 5.2 + sx * 0.01) * 0.18;
  const w = 34;
  const h = 42;
  const x = sx - w / 2;
  const y = sy - h / 2;
  ctx.save();
  drawEllipseShadow(x - 4, y + h - 8, w + 8, 8, 0.24);
  ctx.fillStyle = "rgba(7, 11, 20, 0.96)";
  ctx.fillRect(x + 5, y + 8, w - 10, h - 8);
  ctx.fillStyle = "rgba(38, 53, 72, 0.98)";
  ctx.fillRect(x + 2, y + 2, w - 4, h - 14);
  ctx.fillStyle = accent.main;
  ctx.globalAlpha = 0.35 + pulse * 0.35;
  ctx.fillRect(x + 7, y + 7, w - 14, 14);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.fillRect(x + 10, y + 10, w - 20, 2);
  ctx.fillRect(x + 10, y + 15, w - 24, 2);
  ctx.fillStyle = accent.main;
  ctx.shadowColor = accent.main;
  ctx.shadowBlur = 6 + pulse * 6;
  ctx.fillRect(x + w / 2 - 3, y + h - 13, 6, 6);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = accent.main;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 13);
  ctx.restore();
}

function drawStationModuleObject(obj, sx, sy) {
  const w = Math.max(5, Number(obj.w || 6)) * TILE_SIZE;
  const h = Math.max(4, Number(obj.h || 4)) * TILE_SIZE;
  const x = sx - w / 2;
  const y = sy - h / 2;
  const accent = sciFiShopAccent(obj.shopType || "trade");
  const t = performance.now() / 1000;
  const pulse = 0.3 + Math.sin(t * 5 + sx * 0.008 + sy * 0.01) * 0.08;
  ctx.save();
  drawEllipseShadow(x - 3, y + h * 0.78, w + 6, 10, 0.22);
  ctx.fillStyle = "rgba(10, 16, 26, 0.96)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(27, 39, 54, 0.98)";
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x + 6, y + 6, w - 12, 3);
  ctx.fillStyle = accent.main;
  ctx.fillRect(x + w * 0.18, y + h * 0.18, w * 0.64, 4);
  ctx.fillStyle = accent.glow;
  ctx.fillRect(x + 5, y + 10, w - 10, h - 18);
  ctx.fillStyle = `rgba(255,255,255,${pulse})`;
  ctx.fillRect(x + w * 0.42, y + h * 0.4, w * 0.16, h * 0.2);
  ctx.strokeStyle = accent.main;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
}

function drawCargoCrateObject(obj, sx, sy) {
  const kind = obj.kind || "cargo-crate";
  const w = Math.max(2, Number(obj.w || 2)) * TILE_SIZE;
  const h = Math.max(2, Number(obj.h || 2)) * TILE_SIZE;
  const x = sx - w / 2;
  const y = sy - h / 2;
  const t = performance.now() / 1000;
  const pulse = 0.3 + Math.sin(t * 3.2 + sx * 0.01 + sy * 0.008) * 0.08;
  const palette =
    kind === "shipping-crate"
      ? { base: "#24303d", edge: "#f1cf64", glow: "rgba(241,207,100,0.24)", stripe: "rgba(255,245,200,0.65)" }
      : kind === "container-box"
        ? { base: "#1c2a37", edge: "#67f0ff", glow: "rgba(103,240,255,0.2)", stripe: "rgba(215,251,255,0.58)" }
        : { base: "#182430", edge: "#8cdcf5", glow: "rgba(140,220,245,0.18)", stripe: "rgba(255,255,255,0.5)" };
  ctx.save();
  drawEllipseShadow(x - 3, y + h * 0.84, w + 6, 8, 0.18);
  ctx.fillStyle = palette.base;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = palette.glow;
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = palette.edge;
  ctx.fillRect(x + 4, y + 4, w - 8, 2);
  ctx.fillRect(x + 4, y + h - 6, w - 8, 2);
  ctx.fillRect(x + 4, y + 4, 2, h - 8);
  ctx.fillRect(x + w - 6, y + 4, 2, h - 8);
  ctx.fillStyle = palette.stripe;
  if (w >= h) {
    ctx.fillRect(x + 5, y + h * 0.45, w - 10, 2);
  } else {
    ctx.fillRect(x + w * 0.45, y + 5, 2, h - 10);
  }
  ctx.fillStyle = `rgba(255,255,255,${pulse})`;
  ctx.fillRect(x + w * 0.24, y + h * 0.2, 3, 3);
  ctx.fillRect(x + w * 0.68, y + h * 0.66, 3, 3);
  ctx.strokeStyle = palette.edge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
}

function shipHullDimensions(hullClass) {
  if (hullClass === "crew4") return { w: 124, h: 62 };
  if (hullClass === "crew2") return { w: 104, h: 52 };
  if (hullClass === "freighter") return { w: 82, h: 42 };
  if (hullClass === "hauler") return { w: 78, h: 40 };
  if (hullClass === "interceptor" || hullClass === "needle") return { w: 74, h: 28 };
  if (hullClass === "fighter") return { w: 70, h: 34 };
  if (hullClass === "yacht") return { w: 72, h: 38 };
  if (hullClass === "courier") return { w: 66, h: 32 };
  return { w: 64, h: 36 };
}

function getShipLayout(shipOrClass = "skiff") {
  const hullClass = typeof shipOrClass === "string" ? shipOrClass : shipOrClass?.hullClass;
  if (hullClass === "crew4" || hullClass === "frigate" || hullClass === "freighter") {
    return {
      crewCapacity: 4,
      deckW: 18,
      deckH: 10,
      entry: { x: -7, y: 0 },
      teleporter: { x: -2.5, y: 0 },
      stations: [
        { id: "captain", role: "captain", name: "Captain", x: 3.2, y: 0 },
        { id: "pilot", role: "pilot", name: "Pilot", x: 5.1, y: -1 },
        { id: "copilot", role: "copilot", name: "Co-Pilot", x: 5.1, y: 1 },
        { id: "gunner_aft", role: "gunner", name: "Gunner", x: -6.5, y: 0 },
        { id: "engineer_mid", role: "engineer", name: "Forward Engineering", x: -1.2, y: -2, defaultShieldFacing: "front" },
        { id: "engineer_aux", role: "engineer", name: "Aft Engineering", x: -1.6, y: 2, defaultShieldFacing: "back" }
      ],
      amenities: [
        { kind: "bed", x: -5.2, y: -2.8 },
        { kind: "bed", x: -5.2, y: 2.8 },
        { kind: "kitchen", x: -2.5, y: -2.8 },
        { kind: "table", x: 0, y: 2.5 }
      ]
    };
  }
  if (hullClass === "crew2" || hullClass === "corvette" || hullClass === "hauler" || hullClass === "yacht") {
    return {
      crewCapacity: 2,
      deckW: 14,
      deckH: 8,
      entry: { x: -5, y: 0 },
      teleporter: { x: -1.5, y: 0 },
      stations: [
        { id: "pilot", role: "pilot", name: "Pilot", x: 3.4, y: -1 },
        { id: "copilot", role: "copilot", name: "Co-Pilot", x: 3.4, y: 1 },
        { id: "gunner_aft", role: "gunner", name: "Gunner", x: -5.5, y: 0 },
        { id: "engineer_mid", role: "engineer", name: "Engineering", x: -0.7, y: 0, defaultShieldFacing: "front" }
      ],
      amenities: [
        { kind: "bed", x: -3.5, y: -2 },
        { kind: "kitchen", x: -2.5, y: 2 }
      ]
    };
  }
  return {
    crewCapacity: 1,
    deckW: 7,
    deckH: 4,
    entry: { x: 0, y: 0 },
    stations: [{ id: "pilot", role: "pilot", name: "Pilot", x: 0, y: 0 }],
    amenities: []
  };
}

function isPilotShipRole(role) {
  return role === "pilot" || role === "captain" || role === "copilot";
}

function shipCenter(ship, fallback) {
  return {
    x: Number.isFinite(Number(ship?.worldX)) ? Number(ship.worldX) : Number(ship?.dockX) || fallback?.x || 0,
    y: Number.isFinite(Number(ship?.worldY)) ? Number(ship.worldY) : Number(ship?.dockY) || fallback?.y || 0
  };
}

function nearestShipStationForPlayer(player) {
  if (!player?.ship?.boarded || !player.ship.deckMode) return null;
  const layout = getShipLayout(player.ship);
  const center = shipCenter(player.ship, player);
  const px = Number.isFinite(player.renderX) ? player.renderX : player.x;
  const py = Number.isFinite(player.renderY) ? player.renderY : player.y;
  let best = null;
  let bestDist = Infinity;
  for (const station of layout.stations) {
    const wx = center.x + station.x;
    const wy = center.y + station.y;
    const dist = Math.hypot(px - wx, py - wy);
    if (dist <= SHIP_STATION_INTERACT_RADIUS && dist < bestDist) {
      bestDist = dist;
      best = { ...station, worldX: wx, worldY: wy };
    }
  }
  return best;
}

const SHIP_DOCK_PROMPT_RANGE = 8;
const SHIELD_HIT_GLOW_MS = 600;

function planetAtWorldPoint(wx, wy) {
  if (!state.spaceObjects) return null;
  let best = null;
  let bestDistSq = Infinity;
  for (const obj of state.spaceObjects.values()) {
    if (obj?.kind !== "planet") continue;
    const dx = wx - Number(obj.x);
    const dy = wy - Number(obj.y);
    const r = Number(obj.radius) || 30;
    const padded = r + 2;
    const distSq = dx * dx + dy * dy;
    if (distSq <= padded * padded && distSq < bestDistSq) {
      best = obj;
      bestDistSq = distSq;
    }
  }
  return best;
}

function tryRideCaravanAtClick(wx, wy) {
  if (!state.caravans?.size) return false;
  const self = state.players.get(state.selfId);
  if (!self) return false;
  if (self._caravanRiding) return false;
  // Player has to be within 4 tiles of the caravan to ride; click within 3
  // tiles of the wagon body to count as a "ride" click.
  let best = null;
  let bestDist = 3;
  for (const caravan of state.caravans.values()) {
    const cx = Number(caravan.x);
    const cy = Number(caravan.y);
    const clickDist = Math.hypot(wx - cx, wy - cy);
    if (clickDist > bestDist) continue;
    const selfX = Number.isFinite(self.renderX) ? self.renderX : self.x;
    const selfY = Number.isFinite(self.renderY) ? self.renderY : self.y;
    if (Math.hypot(cx - selfX, cy - selfY) > 4) continue;
    bestDist = clickDist;
    best = caravan;
  }
  if (!best) return false;
  send({ type: "caravanRide", caravanId: best.id });
  return true;
}

function tryTravelToPlanetAtClick(wx, wy) {
  if (!isSciFiWorld()) return false;
  const self = state.players.get(state.selfId);
  // Only piloting (or otherwise in space, not on a planet surface) can travel.
  if (!self?.ship?.boarded) return false;
  const planet = planetAtWorldPoint(wx, wy);
  if (!planet) return false;
  send({
    type: "travelToPlanet",
    planetId: planet.id,
    targetX: Number(planet.x),
    targetY: Number(planet.y)
  });
  appendChat({ kind: "system", name: "Realm", text: `Setting course for ${planet.name || "planet"}…` });
  return true;
}

function drawShieldBuff(player, sx, sy) {
  const buff = player?.shieldBuff;
  if (!buff) return;
  const now = Date.now();
  if (!Number.isFinite(buff.expiresAt) || buff.expiresAt <= now) return;

  const color = typeof buff.color === "string" ? buff.color : "#a07bff";
  const t = performance.now() / 1000;
  const radius = TILE_SIZE * 1.35;
  // Soft breathing pulse so the bubble is always slightly visible
  const idleAlpha = 0.22 + Math.sin(t * 2.4) * 0.06;

  // Outer faint glow ring
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.globalAlpha = idleAlpha;
  ctx.beginPath();
  ctx.arc(sx, sy - 6, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner crisper ring
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = idleAlpha * 1.4;
  ctx.beginPath();
  ctx.arc(sx, sy - 6, radius * 0.9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Hit glow — bright arc on the side the damage came from
  const sinceHit = now - (Number(buff.lastHitAt) || 0);
  if (sinceHit >= 0 && sinceHit < SHIELD_HIT_GLOW_MS) {
    const fade = 1 - sinceHit / SHIELD_HIT_GLOW_MS;
    const dxh = Number(buff.lastHitDx) || 0;
    const dyh = Number(buff.lastHitDy) || 0;
    const angle = Math.atan2(dyh, dxh);
    ctx.save();
    ctx.translate(sx, sy - 6);
    // Radial glow centred on the impact point
    const impactX = Math.cos(angle) * radius;
    const impactY = Math.sin(angle) * radius;
    const glow = ctx.createRadialGradient(impactX, impactY, 0, impactX, impactY, radius * 0.9);
    glow.addColorStop(0, color);
    glow.addColorStop(0.5, hexToRgba(color, 0.45 * fade));
    glow.addColorStop(1, hexToRgba(color, 0));
    ctx.globalAlpha = Math.min(1, 0.85 * fade);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.05, 0, Math.PI * 2);
    ctx.fill();
    // Bright arc rim where the strike landed
    ctx.globalAlpha = Math.min(1, fade);
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, radius, angle - Math.PI / 3, angle + Math.PI / 3);
    ctx.stroke();
    ctx.restore();
  }
}

function hexToRgba(hex, alpha) {
  const v = String(hex || "").replace("#", "");
  const isShort = v.length === 3;
  const r = parseInt(isShort ? v[0] + v[0] : v.slice(0, 2), 16);
  const g = parseInt(isShort ? v[1] + v[1] : v.slice(2, 4), 16);
  const b = parseInt(isShort ? v[2] + v[2] : v.slice(4, 6), 16);
  return `rgba(${r || 0}, ${g || 0}, ${b || 0}, ${alpha})`;
}

// Runs `callback` in a transform that cancels the current camera rotation,
// so anything drawn stays at its un-rotated screen position. Used to keep
// the interior ship view and on-deck crew "stationary" while the rest of
// the world spins around them when the ship turns.
function withCameraUnrotated(callback) {
  const rotation = Number(state.camera.rotation) || 0;
  if (!rotation) {
    callback();
    return;
  }
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  ctx.save();
  ctx.translate(halfW, halfH);
  ctx.rotate(-rotation);
  ctx.translate(-halfW, -halfH);
  try {
    callback();
  } finally {
    ctx.restore();
  }
}

function isShipNearAnyDockPort(ship) {
  if (!ship) return false;
  const cx = Number.isFinite(ship.worldX) ? ship.worldX : ship.dockX;
  const cy = Number.isFinite(ship.worldY) ? ship.worldY : ship.dockY;
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return false;
  if (!state.spaceObjects) return false;
  for (const obj of state.spaceObjects.values()) {
    if (obj?.kind !== "ship-port") continue;
    const dx = Number(obj.x) - cx;
    const dy = Number(obj.y) - cy;
    if (Math.hypot(dx, dy) <= SHIP_DOCK_PROMPT_RANGE) return true;
  }
  return false;
}

function isEntityInsideAnyShipDeck(entity) {
  if (!entity || !state.players) return false;
  const px = Number.isFinite(entity.renderX) ? entity.renderX : entity.x;
  const py = Number.isFinite(entity.renderY) ? entity.renderY : entity.y;
  if (!Number.isFinite(px) || !Number.isFinite(py)) return false;
  for (const other of state.players.values()) {
    if (!other || other.id === entity.id) continue;
    const ship = other.ship;
    if (!ship?.boarded || !ship.deckMode) continue;
    const layout = getShipLayout(ship);
    const center = shipCenter(ship, other);
    if (Math.abs(px - center.x) <= layout.deckW / 2 && Math.abs(py - center.y) <= layout.deckH / 2) {
      return true;
    }
  }
  return false;
}

function findShipDeckInteractionAt(wx, wy) {
  if (!isSciFiWorld()) return null;
  const self = state.players.get(state.selfId);
  if (!self) return null;
  let best = null;
  let bestDist = Infinity;
  for (const player of state.players.values()) {
    const ship = player?.ship;
    if (!ship?.boarded || !ship.deckMode) continue;
    const layout = getShipLayout(ship);
    const center = shipCenter(ship, player);
    const inside =
      wx >= center.x - layout.deckW / 2 - 0.5 &&
      wx <= center.x + layout.deckW / 2 + 0.5 &&
      wy >= center.y - layout.deckH / 2 - 0.5 &&
      wy <= center.y + layout.deckH / 2 + 0.5;
    if (!inside) continue;
    const selfOnThisShip = self.ship?.boarded && self.ship?.id === ship.id;
    const reachFromSelf = Math.hypot((self.renderX ?? self.x) - wx, (self.renderY ?? self.y) - wy);
    if (!selfOnThisShip && reachFromSelf > 42) continue;

    for (const station of layout.stations) {
      const sx = center.x + station.x;
      const sy = center.y + station.y;
      const d = Math.hypot(wx - sx, wy - sy);
      if (d <= 1.15 && d < bestDist) {
        bestDist = d;
        best = { x: sx, y: sy, label: `${station.name} - use`, kind: "station" };
      }
    }

    for (const amenity of layout.amenities || []) {
      const ax = center.x + amenity.x;
      const ay = center.y + amenity.y;
      const d = Math.hypot(wx - ax, wy - ay);
      if (d <= 1.2 && d < bestDist) {
        bestDist = d;
        const label = amenity.kind === "bed" ? "Ship bunk - use" : amenity.kind === "kitchen" ? "Galley - use" : "Ship fixture - use";
        best = { x: ax, y: ay, label, kind: "fixture" };
      }
    }

    if (!best && !selfOnThisShip) {
      best = { x: wx, y: wy, label: `${ship.name || "Ship"} - board`, kind: "ship" };
    } else if (!best && selfOnThisShip) {
      best = { x: wx, y: wy, label: "Ship deck", kind: "deck" };
    }
  }
  return best;
}

function getShipHullPolygonClient(hullClass) {
  if (hullClass === "hauler" || hullClass === "freighter") {
    return [[-0.90,0.24],[-0.60,-0.62],[0.56,-0.62],[0.94,-0.04],[0.56,0.62],[-0.60,0.62]];
  }
  if (hullClass === "fighter" || hullClass === "interceptor" || hullClass === "needle") {
    return [[-0.94,0],[-0.32,-0.70],[0.94,0],[-0.32,0.70]];
  }
  if (hullClass === "yacht") {
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
  return [[-0.82,0.36],[-0.50,-0.34],[0.20,-0.62],[0.88,0.04],[0.40,0.78],[-0.44,0.56]];
}

function clientPointInPolygon(px, py, polygon) {
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

function clientProjectPointToPolygonEdge(px, py, polygon) {
  let bestX = polygon[0][0], bestY = polygon[0][1];
  let bestDist = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const x1 = polygon[j][0], y1 = polygon[j][1];
    const x2 = polygon[i][0], y2 = polygon[i][1];
    const dx = x2 - x1, dy = y2 - y1;
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

function clampPointToShipDeck(ship, x, y) {
  const layout = getShipLayout(ship);
  const center = shipCenter(ship, { x, y });
  const halfW = Math.max(0.5, layout.deckW / 2);
  const halfH = Math.max(0.5, layout.deckH / 2);
  let nx = (x - center.x) / halfW;
  let ny = (y - center.y) / halfH;
  const polygon = getShipHullPolygonClient(ship?.hullClass || "skiff");
  const margin = 0.12;
  if (!clientPointInPolygon(nx, ny, polygon)) {
    const [ex, ey] = clientProjectPointToPolygonEdge(nx, ny, polygon);
    const len = Math.hypot(ex, ey) || 1;
    nx = ex - (ex / len) * margin;
    ny = ey - (ey / len) * margin;
  }
  return {
    x: center.x + nx * halfW,
    y: center.y + ny * halfH
  };
}

function buildShipHullPath(hullClass, x, y, w, h) {
  ctx.beginPath();
  if (hullClass === "hauler" || hullClass === "freighter") {
    ctx.moveTo(x + w * 0.05, y + h * 0.62);
    ctx.lineTo(x + w * 0.20, y + h * 0.19);
    ctx.lineTo(x + w * 0.78, y + h * 0.19);
    ctx.lineTo(x + w * 0.97, y + h * 0.48);
    ctx.lineTo(x + w * 0.78, y + h * 0.81);
    ctx.lineTo(x + w * 0.20, y + h * 0.81);
  } else if (hullClass === "fighter" || hullClass === "interceptor" || hullClass === "needle") {
    ctx.moveTo(x + w * 0.03, y + h * 0.5);
    ctx.lineTo(x + w * 0.34, y + h * 0.15);
    ctx.lineTo(x + w * 0.97, y + h * 0.5);
    ctx.lineTo(x + w * 0.34, y + h * 0.85);
  } else if (hullClass === "yacht") {
    ctx.moveTo(x + w * 0.07, y + h * 0.58);
    ctx.bezierCurveTo(x + w * 0.25, y + h * 0.05, x + w * 0.72, y + h * 0.05, x + w * 0.96, y + h * 0.5);
    ctx.bezierCurveTo(x + w * 0.74, y + h * 0.97, x + w * 0.28, y + h * 0.97, x + w * 0.07, y + h * 0.58);
  } else {
    ctx.moveTo(x + w * 0.09, y + h * 0.68);
    ctx.lineTo(x + w * 0.25, y + h * 0.33);
    ctx.lineTo(x + w * 0.60, y + h * 0.19);
    ctx.lineTo(x + w * 0.94, y + h * 0.52);
    ctx.lineTo(x + w * 0.70, y + h * 0.89);
    ctx.lineTo(x + w * 0.28, y + h * 0.78);
  }
  ctx.closePath();
}

function drawShipHullShape(hullClass, x, y, w, h, color) {
  ctx.fillStyle = "rgba(18, 30, 48, 0.96)";
  buildShipHullPath(hullClass, x, y, w, h);
  ctx.fill();

  ctx.fillStyle = color;
  if (hullClass === "freighter" || hullClass === "hauler") {
    ctx.fillRect(x + w * 0.22, y + h * 0.21, w * 0.44, h * 0.17);
    ctx.fillRect(x + w * 0.22, y + h * 0.62, w * 0.44, h * 0.17);
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillRect(x + w * 0.73, y + h * 0.41, w * 0.12, h * 0.14);
  } else if (hullClass === "fighter" || hullClass === "interceptor" || hullClass === "needle") {
    ctx.fillRect(x + w * 0.38, y + h * 0.42, w * 0.42, h * 0.12);
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.fillRect(x + w * 0.58, y + h * 0.34, w * 0.11, h * 0.15);
  } else {
    ctx.fillRect(x + w * 0.28, y + h * 0.33, w * 0.28, h * 0.31);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(x + w * 0.38, y + h * 0.42, w * 0.09, h * 0.11);
  }

  ctx.fillStyle = "rgba(103,240,255,0.25)";
  ctx.fillRect(x + w * 0.12, y + h * 0.46, w * 0.76, h * 0.11);
  buildShipHullPath(hullClass, x, y, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = hullClass === "needle" ? 2 : 3;
  ctx.stroke();
}

function drawShipVehicleObject(obj, sx, sy, boarded = false, facing = 0, thrust = false) {
  const color = obj?.color || "#67f0ff";
  const hullClass = obj?.hullClass || obj?.templateId || "skiff";
  const { w, h } = shipHullDimensions(hullClass);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(Number.isFinite(facing) ? facing : 0);
  const x = -w / 2;
  const y = -h / 2;
  if (boarded) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
  }
  if (thrust && boarded) {
    const flick = 0.55 + Math.sin(performance.now() / 45) * 0.25;
    ctx.fillStyle = `rgba(255, 160, 80, ${flick})`;
    ctx.beginPath();
    ctx.moveTo(x - 4, y + h * 0.55);
    ctx.lineTo(x - 18 - flick * 10, y + h * 0.5);
    ctx.lineTo(x - 4, y + h * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(120, 200, 255, ${flick * 0.5})`;
    ctx.beginPath();
    ctx.moveTo(x - 2, y + h * 0.55);
    ctx.lineTo(x - 12 - flick * 6, y + h * 0.5);
    ctx.lineTo(x - 2, y + h * 0.44);
    ctx.closePath();
    ctx.fill();
  }
  drawEllipseShadow(x - 6, y + h * 0.84, w + 12, 10, 0.22);
  drawShipHullShape(hullClass, x, y, w, h, color);
  ctx.restore();
  ctx.save();
  ctx.translate(sx, sy);
  ctx.font = "bold 10px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(4,8,16,0.9)";
  ctx.fillStyle = color;
  const nameY = -h / 2 - 6;
  ctx.strokeText(obj?.name || "Ship", 0, nameY);
  ctx.fillText(obj?.name || "Ship", 0, nameY);
  ctx.restore();
}

function shieldFacingToAngle(facing) {
  if (facing === "right") return 0;
  if (facing === "back") return Math.PI / 2;
  if (facing === "left") return Math.PI;
  return -Math.PI / 2;
}

function defaultShipShieldSections(shipOrClass = "skiff") {
  const layout = getShipLayout(shipOrClass);
  const fallbackDirections = ["front", "back", "right", "left"];
  const sections = {};
  let index = 0;
  for (const station of layout.stations || []) {
    if (station.role !== "engineer") continue;
    sections[station.id] = station.defaultShieldFacing || fallbackDirections[index] || "front";
    index += 1;
  }
  return sections;
}

function shipShieldSections(ship, layout = getShipLayout(ship)) {
  const defaults = defaultShipShieldSections(ship);
  const source = ship?.shieldSections && typeof ship.shieldSections === "object" ? ship.shieldSections : {};
  const sections = {};
  for (const station of layout.stations || []) {
    if (station.role !== "engineer") continue;
    sections[station.id] = source[station.id] || defaults[station.id] || ship?.shieldFacing || "front";
  }
  return sections;
}

function stationShieldFacing(ship, station) {
  if (!station || station.role !== "engineer") return null;
  const sections = shipShieldSections(ship);
  return sections[station.id] || ship?.shieldFacing || station.defaultShieldFacing || "front";
}

function drawStationActiveRing(wx, wy, active, color, radius = 24) {
  if (!active) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(wx, wy, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPilotStation(wx, wy, active, color, isCaptain = false) {
  const width = isCaptain ? 38 : 26;
  const height = isCaptain ? 30 : 23;
  ctx.fillStyle = "rgba(8, 16, 28, 0.96)";
  ctx.strokeStyle = color;
  ctx.lineWidth = isCaptain ? 2.5 : 2;
  roundedRect(wx - width / 2, wy - height / 2, width, height, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = active ? "rgba(103,240,255,0.92)" : "rgba(44, 62, 86, 0.94)";
  roundedRect(wx - width * 0.26, wy - height * 0.18, width * 0.52, height * 0.42, 4);
  ctx.fill();

  ctx.strokeStyle = active ? "#06101c" : color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(wx - width * 0.22, wy + height * 0.08);
  ctx.lineTo(wx, wy + height * 0.22);
  ctx.lineTo(wx + width * 0.22, wy + height * 0.08);
  ctx.stroke();

  if (isCaptain) {
    ctx.fillStyle = active ? "#06101c" : "#ffd36d";
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / 10);
      const r = i % 2 === 0 ? 6 : 3;
      const px = wx + Math.cos(a) * r;
      const py = wy - 8 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  drawStationActiveRing(wx, wy, active, color, isCaptain ? 24 : 19);
}

function drawGunnerStation(wx, wy, active, color) {
  ctx.fillStyle = "rgba(12, 16, 24, 0.96)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  roundedRect(wx - 17, wy - 12, 34, 24, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = active ? color : "rgba(70, 78, 94, 0.96)";
  ctx.beginPath();
  ctx.arc(wx - 3, wy, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(wx + 3, wy - 3, 18, 6);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(wx + 14, wy - 1.5, 6, 3);

  ctx.strokeStyle = active ? "#ffe2d5" : color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(wx - 3, wy, 11, 0, Math.PI * 2);
  ctx.moveTo(wx - 3, wy - 15);
  ctx.lineTo(wx - 3, wy - 9);
  ctx.moveTo(wx - 3, wy + 9);
  ctx.lineTo(wx - 3, wy + 15);
  ctx.moveTo(wx - 17, wy);
  ctx.lineTo(wx - 11, wy);
  ctx.moveTo(wx + 6, wy);
  ctx.lineTo(wx + 12, wy);
  ctx.stroke();
  drawStationActiveRing(wx, wy, active, color, 20);
}

function drawEngineerStation(wx, wy, active, color, shieldFacing) {
  ctx.fillStyle = "rgba(6, 20, 22, 0.96)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  roundedRect(wx - 20, wy - 14, 40, 28, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = active ? "rgba(143,227,136,0.88)" : "rgba(39, 74, 64, 0.95)";
  roundedRect(wx - 15, wy - 9, 30, 14, 3);
  ctx.fill();
  ctx.fillStyle = active ? "#06150e" : "rgba(143,227,136,0.65)";
  ctx.fillRect(wx - 11, wy - 5, 9, 2);
  ctx.fillRect(wx - 11, wy - 1, 18, 2);
  ctx.fillRect(wx - 11, wy + 3, 13, 2);

  const angle = shieldFacingToAngle(shieldFacing);
  ctx.strokeStyle = active ? "#f2fff0" : color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(wx + 10, wy + 7, 6, angle - Math.PI / 4, angle + Math.PI / 4);
  ctx.stroke();
  drawStationActiveRing(wx, wy, active, color, 23);
}

function drawShipStationObject(ship, station, wx, wy) {
  const active = ship?.stationId === station.id;
  if (station.role === "gunner") {
    drawGunnerStation(wx, wy, active, "#ff8f6b");
    return;
  }
  if (station.role === "engineer") {
    drawEngineerStation(wx, wy, active, "#8fe388", stationShieldFacing(ship, station));
    return;
  }
  drawPilotStation(wx, wy, active, "#67f0ff", station.role === "captain");
}

function drawShipDeckObject(ship, sx, sy) {
  const layout = getShipLayout(ship);
  const color = ship?.color || "#67f0ff";
  const hullClass = ship?.hullClass || "skiff";
  // Interior size matches the player walkable area (deck tiles), so players have room to walk
  const w = layout.deckW * TILE_SIZE;
  const h = layout.deckH * TILE_SIZE;
  const x = sx - w / 2;
  const y = sy - h / 2;

  ctx.save();
  drawEllipseShadow(x - 10, y + h * 0.82, w + 20, 14, 0.22);

  // Draw dark hull-shaped fill (silhouette matches the exterior)
  ctx.fillStyle = "rgba(8, 15, 28, 0.96)";
  buildShipHullPath(hullClass, x, y, w, h);
  ctx.fill();

  // Clip interior decorations to the hull silhouette
  buildShipHullPath(hullClass, x, y, w, h);
  ctx.clip();

  // Interior floor
  ctx.fillStyle = "rgba(28, 44, 64, 0.96)";
  ctx.fillRect(x + w * 0.04, y + h * 0.06, w * 0.92, h * 0.88);

  // Bridge/cockpit highlight at the bow (right side)
  ctx.fillStyle = "rgba(103,240,255,0.10)";
  ctx.fillRect(x + w * 0.55, y + h * 0.12, w * 0.38, h * 0.76);

  // Center walkway stripe
  ctx.fillStyle = "rgba(103,240,255,0.16)";
  ctx.fillRect(x + w * 0.12, y + h * 0.46, w * 0.76, h * 0.08);

  // Amenities (in tile-space, scaled by TILE_SIZE)
  for (const amenity of layout.amenities || []) {
    const ax = sx + amenity.x * TILE_SIZE;
    const ay = sy + amenity.y * TILE_SIZE;
    if (amenity.kind === "bed") {
      ctx.fillStyle = "rgba(20, 32, 48, 0.95)";
      ctx.fillRect(ax - 22, ay - 12, 44, 24);
      ctx.fillStyle = "rgba(150, 210, 255, 0.7)";
      ctx.fillRect(ax - 18, ay - 9, 16, 18);
      ctx.strokeStyle = "rgba(103,240,255,0.5)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ax - 22, ay - 12, 44, 24);
    } else if (amenity.kind === "kitchen") {
      ctx.fillStyle = "rgba(14, 22, 34, 0.95)";
      ctx.fillRect(ax - 26, ay - 16, 52, 32);
      ctx.fillStyle = "rgba(255, 210, 110, 0.75)";
      ctx.fillRect(ax - 16, ay - 6, 32, 8);
      ctx.fillStyle = "rgba(103,240,255,0.55)";
      ctx.fillRect(ax - 12, ay + 4, 24, 4);
    } else {
      ctx.fillStyle = "rgba(12, 22, 35, 0.95)";
      ctx.fillRect(ax - 26, ay - 14, 52, 28);
      ctx.strokeStyle = "rgba(103,240,255,0.4)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ax - 26, ay - 14, 52, 28);
    }
  }

  // Teleporter pad — animated cyan disc; clicking it opens the teleport menu.
  if (layout.teleporter) {
    const tx = sx + Number(layout.teleporter.x) * TILE_SIZE;
    const ty = sy + Number(layout.teleporter.y) * TILE_SIZE;
    const t = performance.now() / 1000;
    const pulse = 0.55 + Math.sin(t * 2.4) * 0.18;
    ctx.save();
    // Floor pad
    ctx.fillStyle = "rgba(10, 18, 30, 0.95)";
    ctx.beginPath();
    ctx.arc(tx, ty, 18, 0, Math.PI * 2);
    ctx.fill();
    // Inner glow rings
    for (let i = 0; i < 3; i += 1) {
      ctx.strokeStyle = `rgba(103, 240, 255, ${pulse - i * 0.16})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx, ty, 16 - i * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Central beam
    const beam = ctx.createRadialGradient(tx, ty - 12, 0, tx, ty - 12, 12);
    beam.addColorStop(0, `rgba(180, 240, 255, ${pulse})`);
    beam.addColorStop(1, "rgba(103, 240, 255, 0)");
    ctx.fillStyle = beam;
    ctx.fillRect(tx - 12, ty - 24, 24, 24);
    // Label
    ctx.font = "bold 9px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.fillStyle = "#67f0ff";
    ctx.strokeStyle = "rgba(4,8,16,0.85)";
    ctx.lineWidth = 3;
    ctx.strokeText("TELEPORTER", tx, ty + 28);
    ctx.fillText("TELEPORTER", tx, ty + 28);
    ctx.restore();
  }

  // Stations - role-specific icons at full tile scale.
  for (const station of layout.stations) {
    const wx = sx + station.x * TILE_SIZE;
    const wy = sy + station.y * TILE_SIZE;
    drawShipStationObject(ship, station, wx, wy);
  }

  ctx.restore();
  ctx.save();

  // Shield arcs outside the hull clip. Each engineering station owns one shield section.
  const shieldSections = shipShieldSections(ship, layout);
  const shieldEntries = Object.entries(shieldSections);
  ctx.translate(sx, sy);
  const shieldColors = [
    "rgba(103, 240, 255, 0.68)",
    "rgba(143, 227, 136, 0.66)",
    "rgba(255, 211, 109, 0.62)",
    "rgba(255, 143, 107, 0.62)"
  ];
  if (!shieldEntries.length) {
    shieldEntries.push(["ship", ship?.shieldFacing || "front"]);
  }
  shieldEntries.forEach(([, facing], index) => {
    const shieldAngle = shieldFacingToAngle(facing);
    ctx.strokeStyle = shieldColors[index % shieldColors.length];
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(w, h) * (0.54 + index * 0.025), shieldAngle - Math.PI / 4, shieldAngle + Math.PI / 4);
    ctx.stroke();
  });
  ctx.restore();

  ctx.save();
  // Hull outline matches the exterior silhouette
  buildShipHullPath(hullClass, x, y, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = hullClass === "needle" ? 3 : 4;
  ctx.stroke();

  // Ship name above hull
  ctx.fillStyle = color;
  ctx.font = "bold 12px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(4,8,16,0.9)";
  ctx.strokeText(ship?.name || "Ship", sx, y - 8);
  ctx.fillText(ship?.name || "Ship", sx, y - 8);

  // Health/shield bars
  const hp = Math.max(0, Math.min(1, (Number(ship?.health) || 0) / Math.max(1, Number(ship?.maxHealth) || 1)));
  const shp = Math.max(0, Math.min(1, (Number(ship?.shields) || 0) / Math.max(1, Number(ship?.maxShields) || 1)));
  ctx.fillStyle = "rgba(2, 8, 14, 0.82)";
  ctx.fillRect(x + 10, y + h + 6, 80, 12);
  ctx.fillStyle = "#ef6461";
  ctx.fillRect(x + 12, y + h + 8, 36 * hp, 3);
  ctx.fillStyle = "#67f0ff";
  ctx.fillRect(x + 12, y + h + 13, 36 * shp, 3);
  ctx.restore();
}

function drawStationObject(obj, sx, sy) {
  const w = Math.max(12, Number(obj.w || 16)) * TILE_SIZE;
  const h = Math.max(10, Number(obj.h || 12)) * TILE_SIZE;
  const x = sx - w / 2;
  const y = sy - h / 2;
  ctx.save();
  drawEllipseShadow(x - 8, y + h * 0.68, w + 16, 10, 0.26);
  if (state.worldTheme === SCI_FI_THEME) {
    drawStationVacuumBorder(x, y, w, h);
  }
  if (obj.id === "station_ringforge" || obj.id === "station_nova_dock") {
    drawSpaceStationSquare(x, y, w, h);
  } else if (obj.kind === "core" || obj.kind === "command" || obj.kind === "quarters" || obj.kind === "reactor" || obj.kind === "docks") {
    drawStationRoomObject(obj, sx, sy);
  } else {
    drawSpaceStationSquare(x, y, w, h);
  }
  ctx.restore();
  ctx.save();
  ctx.font = "bold 11px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.strokeStyle = "rgba(4,8,16,0.85)";
  ctx.lineWidth = 3;
  ctx.fillStyle = "#d2f6ff";
  ctx.strokeText(obj.name || "Station", sx, y - 6);
  ctx.fillText(obj.name || "Station", sx, y - 6);
  ctx.restore();
}

function drawStationVacuumBorder(x, y, w, h) {
  const pad = Math.max(18, Math.round(Math.min(w, h) * 0.18));
  const bx = x - pad;
  const by = y - pad;
  const bw = w + pad * 2;
  const bh = h + pad * 2;
  const t = performance.now() / 1000;
  ctx.save();
  const outer = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.22, x + w / 2, y + h / 2, Math.max(bw, bh) * 0.58);
  outer.addColorStop(0, "rgba(2, 6, 14, 0)");
  outer.addColorStop(0.7, "rgba(2, 6, 14, 0.18)");
  outer.addColorStop(1, "rgba(2, 6, 14, 0.82)");
  ctx.fillStyle = outer;
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = "rgba(7, 12, 22, 0.5)";
  ctx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);

  for (let i = 0; i < 18; i += 1) {
    const rx = bx + ((hash2(Math.floor(x) + i * 11, Math.floor(y) - i * 7, 9123) * bw) | 0);
    const ry = by + ((hash2(Math.floor(x) - i * 5, Math.floor(y) + i * 13, 9011) * bh) | 0);
    const star = hash2(rx, ry, 7777 + i);
    if (star < 0.72) {
      continue;
    }
    const size = star > 0.96 ? 2 : 1;
    ctx.fillStyle = star > 0.96 ? "rgba(145, 242, 255, 0.92)" : "rgba(230, 242, 255, 0.72)";
    ctx.fillRect(rx, ry, size, size);
  }

  const nebula = ctx.createRadialGradient(x + w * 0.7, y + h * 0.32, 2, x + w * 0.7, y + h * 0.32, Math.max(w, h) * 0.72);
  nebula.addColorStop(0, "rgba(103, 240, 255, 0.10)");
  nebula.addColorStop(0.45, "rgba(69, 117, 188, 0.08)");
  nebula.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = nebula;
  ctx.fillRect(bx, by, bw, bh);

  ctx.strokeStyle = "rgba(103, 240, 255, 0.14)";
  ctx.lineWidth = 2;
  ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);

  const pulse = 0.2 + Math.sin(t * 2.5) * 0.05;
  ctx.fillStyle = `rgba(103,240,255,${pulse})`;
  ctx.fillRect(x - 1, y - 1, w + 2, 1);
  ctx.fillRect(x - 1, y + h, w + 2, 1);
  ctx.fillRect(x - 1, y - 1, 1, h + 2);
  ctx.fillRect(x + w, y - 1, 1, h + 2);
  ctx.restore();
}

function drawSpaceStationSquare(x, y, w, h) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.save();
  ctx.fillStyle = "#09111b";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#182635";
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  ctx.fillStyle = "rgba(103,240,255,0.08)";
  ctx.fillRect(x + 10, y + 10, w - 20, h - 20);
  ctx.strokeStyle = "rgba(103,240,255,0.42)";
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const px = x + 10 + i * ((w - 20) / 5);
    ctx.beginPath();
    ctx.moveTo(px, y + 10);
    ctx.lineTo(px, y + h - 10);
    ctx.stroke();
  }
  for (let i = 0; i < 5; i += 1) {
    const py = y + 10 + i * ((h - 20) / 5);
    ctx.beginPath();
    ctx.moveTo(x + 10, py);
    ctx.lineTo(x + w - 10, py);
    ctx.stroke();
  }
  ctx.fillStyle = "#67f0ff";
  ctx.fillRect(cx - 4, cy - 4, 8, 8);
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
  ctx.fillStyle = "rgba(103,240,255,0.16)";
  ctx.fillRect(x + 6, y + 6, 10, 10);
  ctx.fillRect(x + w - 16, y + 6, 10, 10);
  ctx.fillRect(x + 6, y + h - 16, 10, 10);
  ctx.fillRect(x + w - 16, y + h - 16, 10, 10);
  ctx.restore();
}

function drawStationCoreObject(obj, sx, sy) {
  const w = Math.max(10, Number(obj.w || 14)) * TILE_SIZE;
  const h = Math.max(10, Number(obj.h || 14)) * TILE_SIZE;
  const x = sx - w / 2;
  const y = sy - h / 2;
  const pulse = 0.55 + Math.sin(performance.now() / 380) * 0.22;
  ctx.save();
  const g = ctx.createRadialGradient(sx, sy, 4, sx, sy, Math.max(w, h) * 0.55);
  g.addColorStop(0, `rgba(180, 255, 255, ${0.45 + pulse * 0.35})`);
  g.addColorStop(0.35, "rgba(80, 200, 255, 0.22)");
  g.addColorStop(1, "rgba(4, 12, 28, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
  ctx.fillStyle = "rgba(12, 22, 40, 0.92)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = `rgba(103, 240, 255, ${0.55 + pulse * 0.35})`;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = `rgba(103, 240, 255, ${0.25 + pulse * 0.2})`;
  ctx.fillRect(x + w * 0.35, y + h * 0.35, w * 0.3, h * 0.3);
  ctx.restore();
}

function drawStationRoomObject(obj, sx, sy) {
  const w = Math.max(8, Number(obj.w || 10)) * TILE_SIZE;
  const h = Math.max(6, Number(obj.h || 8)) * TILE_SIZE;
  const x = sx - w / 2;
  const y = sy - h / 2;
  const kind = obj.kind || "core";
  const palette =
    kind === "reactor"
      ? { base: "#16222f", mid: "#2f4256", glow: "#67f0ff", edge: "#d9fbff" }
      : kind === "quarters"
        ? { base: "#1c2835", mid: "#304559", glow: "#7ec8ff", edge: "#d9eefb" }
        : kind === "command"
          ? { base: "#15202b", mid: "#2d4156", glow: "#67f0ff", edge: "#f0fbff" }
          : kind === "docks"
            ? { base: "#17222f", mid: "#2c4054", glow: "#ffd27a", edge: "#f3f8ff" }
            : kind === "core"
              ? { base: "#121c27", mid: "#2f4254", glow: "#67f0ff", edge: "#d0f7ff" }
              : { base: "#16202c", mid: "#304255", glow: "#67f0ff", edge: "#d0f7ff" };
  ctx.save();
  drawEllipseShadow(x - 8, y + h * 0.72, w + 16, 10, 0.18);
  ctx.fillStyle = palette.base;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = palette.mid;
  ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
  ctx.fillStyle = "rgba(103,240,255,0.12)";
  ctx.fillRect(x + 10, y + 10, w - 20, h - 20);
  ctx.fillStyle = palette.glow;
  ctx.fillRect(x + 8, y + h / 2 - 2, w - 16, 4);
  ctx.fillRect(x + w / 2 - 2, y + 8, 4, h - 16);
  ctx.fillStyle = palette.edge;
  ctx.fillRect(x + 4, y + 4, 4, 4);
  ctx.fillRect(x + w - 8, y + 4, 4, 4);
  ctx.fillRect(x + 4, y + h - 8, 4, 4);
  ctx.fillRect(x + w - 8, y + h - 8, 4, 4);
  if (kind === "reactor") {
    ctx.fillStyle = "rgba(103,240,255,0.18)";
    ctx.fillRect(x + w / 2 - 10, y + h / 2 - 10, 20, 20);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(x + 10, y + 10, 6, 6);
    ctx.fillRect(x + w - 16, y + h - 16, 6, 6);
  } else if (kind === "quarters") {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x + 12, y + 10, 10, 6);
    ctx.fillRect(x + w - 22, y + h - 16, 10, 6);
    ctx.fillStyle = "rgba(103,240,255,0.18)";
    ctx.fillRect(x + 12, y + h - 22, 12, 4);
  } else if (kind === "command") {
    ctx.fillStyle = "rgba(255,255,255,0.24)";
    ctx.fillRect(x + w / 2 - 12, y + 4, 24, 8);
    ctx.fillStyle = "rgba(103,240,255,0.85)";
    ctx.fillRect(x + 10, y + h - 16, 16, 6);
  } else if (kind === "docks") {
    ctx.fillStyle = "rgba(103,240,255,0.14)";
    ctx.fillRect(x + 8, y + 8, w - 16, 4);
    ctx.fillRect(x + 8, y + h - 12, w - 16, 4);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(x + 12, y + 12, 12, 6);
    ctx.fillRect(x + w - 24, y + h - 24, 12, 6);
  }
  ctx.strokeStyle = "rgba(103,240,255,0.34)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
}

function drawShipConsoleObject(obj, sx, sy) {
  const w = Math.max(4, Number(obj.w || 6)) * TILE_SIZE;
  const h = Math.max(4, Number(obj.h || 4)) * TILE_SIZE;
  const x = sx - w / 2;
  const y = sy - h / 2;
  const t = performance.now() / 1000;
  const pulse = 0.46 + Math.sin(t * 4.6 + sx * 0.01) * 0.16;
  ctx.save();
  drawEllipseShadow(x - 6, y + h * 0.88, w + 12, 12, 0.28);

  ctx.fillStyle = "rgba(7, 14, 24, 0.98)";
  ctx.fillRect(x + 5, y + h * 0.42, w - 10, h * 0.5);
  ctx.fillStyle = "#26384a";
  ctx.fillRect(x + 8, y + h * 0.48, w - 16, h * 0.34);
  ctx.fillStyle = "rgba(103,240,255,0.18)";
  ctx.fillRect(x + 12, y + h * 0.53, w - 24, h * 0.18);

  const screenW = w * 0.64;
  const screenH = h * 0.38;
  const screenX = x + (w - screenW) / 2;
  const screenY = y + h * 0.06;
  ctx.fillStyle = "#07131d";
  ctx.fillRect(screenX, screenY, screenW, screenH);
  ctx.strokeStyle = "#67f0ff";
  ctx.lineWidth = 3;
  ctx.strokeRect(screenX, screenY, screenW, screenH);
  ctx.fillStyle = `rgba(103,240,255,${pulse})`;
  ctx.fillRect(screenX + 6, screenY + 6, screenW - 12, screenH - 12);
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.fillRect(screenX + 10, screenY + 10, screenW * 0.3, 4);
  ctx.fillRect(screenX + 10, screenY + 18, screenW * 0.52, 3);
  ctx.fillStyle = "#d9fbff";
  ctx.fillRect(screenX + screenW * 0.68, screenY + 10, 8, 8);
  ctx.fillRect(screenX + screenW * 0.68, screenY + 21, 16, 3);

  ctx.fillStyle = "#0a101a";
  ctx.fillRect(x + w * 0.26, y + h * 0.42, w * 0.48, 8);
  ctx.fillStyle = "#67f0ff";
  for (let i = 0; i < 5; i += 1) {
    ctx.fillRect(x + w * 0.32 + i * 9, y + h * 0.44, 4, 3);
  }

  ctx.fillStyle = "rgba(217,251,255,0.88)";
  ctx.font = "bold 9px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.fillText("SHIP", sx, y + h - 9);
  ctx.strokeStyle = "rgba(103,240,255,0.52)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + h * 0.42, w - 2, h * 0.5);
  ctx.restore();
}

function drawDockPortObject(obj, sx, sy) {
  const w = Math.max(4, Number(obj.w || 6)) * TILE_SIZE;
  const h = Math.max(3, Number(obj.h || 4)) * TILE_SIZE;
  const x = sx - w / 2;
  const y = sy - h / 2;
  ctx.save();
  drawEllipseShadow(x - 2, y + h * 0.84, w + 4, 8, 0.14);
  ctx.fillStyle = "#121b27";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#2f4256";
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  ctx.fillStyle = "#67f0ff";
  ctx.fillRect(x + 8, y + 8, w - 16, 4);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(x + 8, y + h / 2 - 2, w - 16, 4);
  ctx.fillStyle = "#d9fbff";
  ctx.fillRect(x + w / 2 - 5, y + 12, 10, h - 24);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillRect(x + 12, y + 10, 5, 5);
  ctx.fillRect(x + w - 17, y + 10, 5, 5);
  ctx.fillStyle = "rgba(103,240,255,0.22)";
  ctx.fillRect(x + 6, y + h - 10, w - 12, 4);
  ctx.strokeStyle = "rgba(103,240,255,0.42)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
}

function drawRusticStationCluster(x, y, w, h) {
  const cell = Math.min(w, h) / 5;
  ctx.save();
  ctx.fillStyle = "#101924";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#223447";
  ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
  const rooms = [
    [x + 10, y + 10, cell * 1.45, cell * 1.45],
    [x + w * 0.38, y + 10, cell * 1.55, cell * 1.45],
    [x + w - cell * 2.2, y + 10, cell * 1.45, cell * 1.45],
    [x + 10, y + h * 0.42, cell * 1.55, cell * 1.55],
    [x + w * 0.37, y + h * 0.42, cell * 1.65, cell * 1.55],
    [x + w - cell * 2.2, y + h * 0.42, cell * 1.45, cell * 1.55],
    [x + 10, y + h - cell * 1.95, cell * 1.55, cell * 1.45],
    [x + w * 0.39, y + h - cell * 1.95, cell * 1.6, cell * 1.45],
    [x + w - cell * 2.2, y + h - cell * 1.95, cell * 1.45, cell * 1.45]
  ];
  for (const [rx, ry, rw, rh] of rooms) {
    ctx.fillStyle = "#2f4256";
    ctx.fillRect(rx, ry, rw, rh);
    ctx.fillStyle = "#5f8394";
    ctx.fillRect(rx + 4, ry + 4, rw - 8, rh - 8);
    ctx.fillStyle = "rgba(103,240,255,0.12)";
    ctx.fillRect(rx + 8, ry + 8, rw - 16, rh - 16);
    ctx.strokeStyle = "rgba(103,240,255,0.24)";
    ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(rx + 8, ry + 8, 4, 4);
    ctx.fillRect(rx + rw - 12, ry + rh - 12, 4, 4);
  }
  const corridors = [
    [x + w * 0.33, y + h * 0.28, w * 0.34, 10],
    [x + w * 0.33, y + h * 0.58, w * 0.34, 10],
    [x + w * 0.28, y + h * 0.28, 10, h * 0.34],
    [x + w * 0.58, y + h * 0.28, 10, h * 0.34]
  ];
  ctx.fillStyle = "#1a2430";
  for (const [cx, cy, cw, ch] of corridors) {
    ctx.fillRect(cx, cy, cw, ch);
    ctx.fillStyle = "#314152";
    ctx.fillRect(cx + 2, cy + 2, cw - 4, ch - 4);
    ctx.fillStyle = "rgba(103,240,255,0.18)";
    ctx.fillRect(cx + 4, cy + 4, Math.max(2, cw - 8), Math.max(2, ch - 8));
    ctx.fillStyle = "#1a2430";
  }
  ctx.fillStyle = "rgba(103,240,255,0.26)";
  ctx.fillRect(x + 18, y + h / 2 - 3, w - 36, 6);
  ctx.fillRect(x + w / 2 - 3, y + 18, 6, h - 36);
  ctx.strokeStyle = "rgba(103,240,255,0.34)";
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.restore();
}

function drawBarrelCluster(x, y, cols = 1, rows = 1, scale = 1) {
  const bw = Math.max(6, Math.round(6 * scale));
  const bh = Math.max(10, Math.round(10 * scale));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const bx = x + col * (bw + 2);
      const by = y + row * (bh + 1);
      ctx.fillStyle = "#6d4528";
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = "#9d6a3d";
      ctx.fillRect(bx + 1, by + 1, bw - 2, 2);
      ctx.fillRect(bx + 1, by + bh - 3, bw - 2, 2);
      ctx.fillStyle = "#3b2414";
      ctx.fillRect(bx + Math.floor(bw / 2) - 1, by, 2, bh);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(bx + 2, by + 2, 2, 3);
    }
  }
}

function drawAsteroidFieldObject(obj, sx, sy) {
  const rocks = Array.isArray(obj?.rocks) ? obj.rocks : [];
  if (!rocks.length) return;
  ctx.save();
  for (const rock of rocks) {
    const rsx = (rock.x - obj.x) * TILE_SIZE + sx;
    const rsy = (rock.y - obj.y) * TILE_SIZE + sy;
    const rr = Math.max(6, Number(rock.radius || 1) * TILE_SIZE);
    // Soft outer haze
    const halo = ctx.createRadialGradient(rsx, rsy, rr * 0.4, rsx, rsy, rr * 1.5);
    halo.addColorStop(0, "rgba(140, 130, 120, 0.45)");
    halo.addColorStop(1, "rgba(60, 50, 40, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(rsx, rsy, rr * 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Rock body
    ctx.fillStyle = "#574a3d";
    ctx.beginPath();
    ctx.arc(rsx, rsy, rr, 0, Math.PI * 2);
    ctx.fill();
    // Highlights
    ctx.fillStyle = "#8a7763";
    ctx.beginPath();
    ctx.arc(rsx - rr * 0.3, rsy - rr * 0.3, rr * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Dark crater
    ctx.fillStyle = "#2c241c";
    ctx.beginPath();
    ctx.arc(rsx + rr * 0.2, rsy + rr * 0.25, rr * 0.25, 0, Math.PI * 2);
    ctx.fill();
    // Outline
    ctx.strokeStyle = "rgba(20, 18, 14, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(rsx, rsy, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlanetObject(obj, sx, sy) {
  const radius = Math.max(20, Number(obj.radius || 48)) * TILE_SIZE;
  const gradient = ctx.createRadialGradient(sx - radius * 0.28, sy - radius * 0.34, radius * 0.14, sx, sy, radius);
  const type = String(obj.type || "").toLowerCase();
  switch (type) {
    case "ice":
      gradient.addColorStop(0, "#f8fdff");
      gradient.addColorStop(0.52, "#9fd8ff");
      gradient.addColorStop(1, "#335a7d");
      break;
    case "desert":
      gradient.addColorStop(0, "#ffe0a6");
      gradient.addColorStop(0.52, "#d3a15b");
      gradient.addColorStop(1, "#7c4e2c");
      break;
    case "volcanic":
      gradient.addColorStop(0, "#ffe2a8");
      gradient.addColorStop(0.5, "#ef4444");
      gradient.addColorStop(1, "#3f1313");
      break;
    case "ocean":
      gradient.addColorStop(0, "#cdebff");
      gradient.addColorStop(0.55, "#2bb3ff");
      gradient.addColorStop(1, "#0b3b66");
      break;
    case "jungle":
      gradient.addColorStop(0, "#bbf7d0");
      gradient.addColorStop(0.5, "#16a34a");
      gradient.addColorStop(1, "#14532d");
      break;
    case "crystal":
      gradient.addColorStop(0, "#ede9fe");
      gradient.addColorStop(0.5, "#a78bfa");
      gradient.addColorStop(1, "#3a1d80");
      break;
    case "fungal":
      gradient.addColorStop(0, "#fce7f3");
      gradient.addColorStop(0.5, "#d946ef");
      gradient.addColorStop(1, "#3b0a45");
      break;
    case "barren":
      gradient.addColorStop(0, "#cbd5e1");
      gradient.addColorStop(0.5, "#64748b");
      gradient.addColorStop(1, "#1e293b");
      break;
    case "toxic":
      gradient.addColorStop(0, "#ecfccb");
      gradient.addColorStop(0.5, "#84cc16");
      gradient.addColorStop(1, "#2a3d10");
      break;
    case "aether":
      gradient.addColorStop(0, "#cffafe");
      gradient.addColorStop(0.5, "#22d3ee");
      gradient.addColorStop(1, "#0e3a47");
      break;
    case "ashland":
      gradient.addColorStop(0, "#fafaf9");
      gradient.addColorStop(0.5, "#a8a29e");
      gradient.addColorStop(1, "#1c1917");
      break;
    case "lush":
    default:
      gradient.addColorStop(0, "#daf7b0");
      gradient.addColorStop(0.45, "#7ecf8d");
      gradient.addColorStop(1, "#244d3b");
      break;
  }

  ctx.save();
  drawEllipseShadow(sx - radius, sy + radius * 0.78, radius * 2, 16, 0.3);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, radius - 2, 0, Math.PI * 2);
  ctx.clip();
  for (let i = -4; i <= 4; i += 1) {
    const bandY = sy - radius * 0.75 + (i + 4) * (radius * 0.16);
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
    ctx.fillRect(sx - radius, bandY, radius * 2, radius * 0.09);
  }
  for (let i = 0; i < 10; i += 1) {
    const px = sx - radius * 0.7 + hash2(i, obj.seed || 1, 1001) * radius * 1.4;
    const py = sy - radius * 0.7 + hash2(i, obj.seed || 1, 1002) * radius * 1.4;
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(px, py, 5, 2);
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.font = "bold 11px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.strokeStyle = "rgba(4,8,16,0.85)";
  ctx.lineWidth = 3;
  ctx.fillStyle = "#d2f6ff";
  ctx.strokeText(obj.name || "Planet", sx, sy + radius + 16);
  ctx.fillText(obj.name || "Planet", sx, sy + radius + 16);
  ctx.restore();
}

function drawShipLaneObject(obj, halfW, halfH) {
  const from = obj.from;
  const to = obj.to;
  if (!from || !to) {
    return;
  }
  const fx = from.x * TILE_SIZE - state.camera.x + halfW;
  const fy = from.y * TILE_SIZE - state.camera.y + halfH;
  const tx = to.x * TILE_SIZE - state.camera.x + halfW;
  const ty = to.y * TILE_SIZE - state.camera.y + halfH;
  const now = performance.now() / 1000;
  const travel = (Math.sin(now * 0.24 + hash2(from.x, to.y, 1003) * Math.PI * 2) + 1) / 2;
  const shipX = fx + (tx - fx) * travel;
  const shipY = fy + (ty - fy) * travel;

  ctx.save();
  ctx.strokeStyle = "rgba(103,240,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.strokeStyle = "rgba(103,240,255,0.45)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.fillStyle = "#dffaff";
  ctx.beginPath();
  ctx.arc(shipX, shipY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#67f0ff";
  ctx.beginPath();
  ctx.arc(shipX, shipY, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Building whose inner floor contains this world point (matches cutaway / interior rules). */
function findBuildingFootprintContaining(wx, wy) {
  for (const building of state.buildings.values()) {
    if (
      wx > building.x + 1 &&
      wx < building.x + building.w - 1 &&
      wy > building.y + 1 &&
      wy < building.y + building.h - 1
    ) {
      return building;
    }
  }
  return null;
}

function getPlayerBuilding() {
  const self = state.players.get(state.selfId);
  if (!self) return null;
  return findBuildingFootprintContaining(self.renderX, self.renderY);
}

/** Hide everyone except yourself when they are inside a house you are not in (roof occlusion). */
function entityHiddenByBuildingRoof(entity, viewerBuilding) {
  if (entity.id === state.selfId) {
    return false;
  }
  const wx = Number.isFinite(entity.renderX) ? entity.renderX : entity.x;
  const wy = Number.isFinite(entity.renderY) ? entity.renderY : entity.y;
  const entityBuilding = findBuildingFootprintContaining(wx, wy);
  if (!entityBuilding) {
    return false;
  }
  if (!viewerBuilding) {
    return true;
  }
  return entityBuilding.x !== viewerBuilding.x || entityBuilding.y !== viewerBuilding.y;
}

function drawPortals() {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  for (const portal of state.portals.values()) {
    const sx = Math.floor(portal.x * TILE_SIZE - state.camera.x + halfW);
    const sy = Math.floor(portal.y * TILE_SIZE - state.camera.y + halfH);
    drawPortal(sx, sy, portal.x, portal.y);
  }
}

function drawTile(tile, sx, sy, tx, ty) {
  if (isInteriorDrawTile(tile)) {
    drawInteriorTile(tile, sx, sy, tx, ty);
    return;
  }

  if (
    globalThis.TechDungeonSprites &&
    tile >= TILE.VOID &&
    tile <= TILE.ENERGY &&
    TechDungeonSprites.drawSciFiStationTile(ctx, tile, sx, sy, tx, ty)
  ) {
    return;
  }

  const colors = getTileColors(tile);
  ctx.fillStyle = colors[0];
  ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

  if (tile === TILE.GRASS || tile === TILE.DARK_GRASS || tile === TILE.SAND || tile === TILE.SNOW) {
    drawGroundPatch(tile, sx, sy, tx, ty, colors);
    if (tile === TILE.SAND) {
      scatterPixels(sx, sy, tx + 7, ty - 3, colors[2], 2, 1);
    }
    if (tile === TILE.SNOW) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.fillRect(sx + 4, sy + 4, 9, 2);
      ctx.fillRect(sx + 20, sy + 18, 7, 2);
    }
    return;
  }

  if (tile === TILE.FLOWERS) {
    drawGroundPatch(TILE.GRASS, sx, sy, tx, ty, getTileColors(TILE.GRASS));
    drawFlowerPatch(sx, sy, tx, ty);
    return;
  }

  if (tile === TILE.PATH) {
    drawPath(sx, sy, tx, ty, colors);
    return;
  }

  if (tile === TILE.STONE) {
    ctx.fillStyle = colors[1];
    for (let row = 0; row < 4; row += 1) {
      const offset = row % 2 === 0 ? 0 : 8;
      for (let col = -1; col < 4; col += 1) {
        ctx.fillRect(sx + offset + col * 16, sy + row * 8, 14, 6);
      }
    }
    return;
  }

  if (tile === TILE.WATER) {
    drawWater(sx, sy, tx, ty, colors);
    return;
  }

  if (tile === TILE.LAVA) {
    ctx.fillStyle = colors[1];
    for (let i = 0; i < 4; i += 1) {
      const px = sx + ((hash2(tx, ty, i) * 24) | 0);
      const py = sy + 5 + i * 6;
      ctx.fillRect(px, py, 8, 2);
    }
    ctx.fillStyle = colors[2];
    ctx.fillRect(sx + 9, sy + 13, 5, 3);
    ctx.fillRect(sx + 20, sy + 23, 4, 2);
    return;
  }

  if (tile === TILE.TREE) {
    drawForestFloor(sx, sy, tx, ty);
    return;
  }

  if (tile === TILE.WALL) {
    drawCoveredBuildingGround(sx, sy, tx, ty);
    return;
  }

  if (tile === TILE.FLOOR) {
    drawCoveredBuildingGround(sx, sy, tx, ty);
    return;
  }

  if (tile === TILE.DOOR) {
    drawCoveredBuildingGround(sx, sy, tx, ty);
    return;
  }

  if (tile === TILE.PORTAL) {
    drawGroundPatch(TILE.STONE, sx, sy, tx, ty, getTileColors(TILE.STONE));
    return;
  }
}

function isInteriorDrawTile(tile) {
  return tile === TILE.WALL ||
    tile === TILE.FLOOR ||
    tile === TILE.DOOR ||
    tile === TILE.CARPET ||
    tile === TILE.BED ||
    tile === TILE.TABLE ||
    tile === TILE.SHELF ||
    tile === TILE.FIREPLACE ||
    tile === TILE.CHAIR ||
    tile === TILE.CHEST ||
    tile === TILE.HOME_TREE;
}

function isNpcRestingOnBench(npc) {
  if (!npc || npc.renderMoving) return false;
  const px = Number.isFinite(npc.renderX) ? npc.renderX : npc.x;
  const py = Number.isFinite(npc.renderY) ? npc.renderY : npc.y;
  for (const f of state.roadsides.values()) {
    if (f.kind !== "bench") continue;
    if (Math.hypot(px - (f.x + 0.5), py - (f.y + 0.52)) < 1.08) return true;
  }
  return false;
}

function npcQuestMarkerKind(npc) {
  if (!npc?.questGiver) return null;
  const quests = Array.isArray(state.quests) ? state.quests : [];
  for (const quest of quests) {
    if (quest.completed) continue;
    if (quest.objective?.type === "talk" && quest.objective?.npcId === npc.id) {
      return "turnin";
    }
  }
  const questIds = Array.isArray(npc.questIds) ? npc.questIds : [];
  const known = new Set(quests.map((quest) => quest.id));
  if (questIds.some((questId) => !known.has(questId))) {
    return "available";
  }
  if (questIds.some((questId) => quests.some((quest) => quest.id === questId && !quest.completed))) {
    return "active";
  }
  return null;
}

function drawQuestMarker(npc, sx, sy) {
  const kind = npcQuestMarkerKind(npc);
  if (!kind) return;
  const t = performance.now() / 1000;
  const y = sy - 48 + Math.sin(t * 3.4) * 2;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 22px ui-sans-serif, system-ui";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(20, 13, 4, 0.9)";
  ctx.fillStyle = kind === "turnin" ? "#74f29c" : kind === "available" ? "#ffd166" : "#b8c7ff";
  const mark = kind === "active" ? "?" : "!";
  ctx.strokeText(mark, sx, y);
  ctx.fillText(mark, sx, y);
  ctx.restore();
}

function drawCaravans() {
  if (!state.caravans?.size) return;
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const self = state.players.get(state.selfId);
  const selfX = self ? (Number.isFinite(self.renderX) ? self.renderX : self.x) : 0;
  const selfY = self ? (Number.isFinite(self.renderY) ? self.renderY : self.y) : 0;

  for (const caravan of state.caravans.values()) {
    const cx = Number(caravan.x);
    const cy = Number(caravan.y);
    const sx = Math.floor(cx * TILE_SIZE - state.camera.x + halfW);
    const sy = Math.floor(cy * TILE_SIZE - state.camera.y + halfH);
    const angle = Number(caravan.facing) || 0;
    const color = caravan.color || "#d4a55b";

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);

    // Shadow under the wagon
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 14, 40, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ox / draft beast pulling the cart (out front along facing direction)
    ctx.fillStyle = "#6e4a2a";
    ctx.fillRect(28, -8, 14, 16);
    ctx.fillStyle = "#3a261b";
    ctx.fillRect(42, -4, 4, 8); // head
    ctx.fillStyle = "#1a120a";
    ctx.fillRect(46, -5, 2, 2); ctx.fillRect(46, 3, 2, 2); // horns
    // Yoke
    ctx.strokeStyle = "#3a261b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(30, 0);
    ctx.stroke();

    // Wagon body
    ctx.fillStyle = "#2c1b0e";
    ctx.fillRect(-26, -14, 48, 28);
    ctx.fillStyle = color;
    ctx.fillRect(-22, -11, 40, 22);
    // Plank lines for wood texture
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    for (let i = -18; i < 18; i += 6) {
      ctx.fillRect(i, -10, 1, 20);
    }
    // Wheels
    ctx.fillStyle = "#1a0e06";
    ctx.beginPath(); ctx.arc(-16, 14, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(14, 14, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#5a3a1f";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-16, 14, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(14, 14, 7, 0, Math.PI * 2); ctx.stroke();

    // Canopy hint along top edge
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(-22, -13, 40, 3);

    ctx.restore();

    // Hover prompt — show fare and a "click to ride" hint when nearby
    const dist = Math.hypot(cx - selfX, cy - selfY);
    if (dist <= 4 && self && !self._caravanRiding) {
      const label = `${caravan.name || "Caravan"}  •  Pay ${caravan.fare}g → ${caravan.destinationName || "?"}`;
      ctx.save();
      ctx.font = "bold 11px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(4,8,16,0.9)";
      ctx.fillStyle = "#ffe6a8";
      ctx.strokeText(label, sx, sy - 26);
      ctx.fillText(label, sx, sy - 26);
      ctx.restore();
    }
  }
}

function drawPlayers() {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const buyInterior = getPlayerStandingBuyableHouseInterior();
  const self = state.players.get(state.selfId);
  const viewerBuilding = self ? findBuildingFootprintContaining(self.renderX, self.renderY) : null;

  const entities = [
    ...[...state.players.values()].map((p) => ({ entity: p, isNpc: false })),
    ...[...state.npcs.values()].map((n) => ({ entity: n, isNpc: true })),
    ...[...state.mobs.values()].map((m) => ({ entity: m, isMob: true })),
  ].sort((a, b) => a.entity.renderY - b.entity.renderY);

  // View rules:
  //   - If the viewer is sitting in a pilot/captain/copilot seat, they see their ship as the
  //     small exterior (interior hidden), with the camera zoomed out a bit.
  //   - If the viewer is walking around their deck (not piloting), they see the interior.
  //   - If the viewer was teleported aboard a party member's ship (aboardShipId), they always
  //     see the interior of that ship regardless of what the pilot is doing.
  //   - Everyone else (including other players) sees the small exterior view of any boarded ship.
  const selfShip = self?.ship?.boarded ? self.ship : null;
  const selfAboardShipId = typeof self?.aboardShipId === "string" ? self.aboardShipId : null;
  // The snapshot overrides ship.stationRole/stationId with the player's per-player
  // shipStationRole so this works for both ship owners and party-teleport passengers.
  const selfStationRole = self?.ship?.stationRole || null;
  const selfPiloting = Boolean(selfStationRole && isPilotShipRole(selfStationRole));
  let viewerInteriorShipId = null;
  if (selfPiloting) {
    // Sitting in a pilot/captain seat — get the exterior view of the host ship.
    viewerInteriorShipId = null;
  } else if (selfAboardShipId) {
    viewerInteriorShipId = selfAboardShipId;
  } else if (selfShip && selfShip.deckMode) {
    viewerInteriorShipId = selfShip.id;
  }
  const renderedShips = new Set();

  for (const { entity, isNpc, isMob } of entities) {
    if (entityHiddenByBuildingRoof(entity, viewerBuilding)) {
      continue;
    }
    if (buyInterior) {
      const wx = Number.isFinite(entity.renderX) ? entity.renderX : entity.x;
      const wy = Number.isFinite(entity.renderY) ? entity.renderY : entity.y;
      if (isNpc || (isMob && worldPointInsideBuildingInterior(wx, wy, buyInterior))) {
        continue;
      }
    }
    const sx = Math.floor(entity.renderX * TILE_SIZE - state.camera.x + halfW);
    const sy = Math.floor(entity.renderY * TILE_SIZE - state.camera.y + halfH);
    if (isMob) {
      drawMob(entity, sx, sy);
    } else if (entity.ship?.boarded && entity.ship.deckMode) {
      const shipId = entity.ship.id;
      const sameAsViewer = shipId && shipId === viewerInteriorShipId;
      if (sameAsViewer) {
        // Viewer is inside this ship and not in a pilot seat — render the interior view once and the crew inside it.
        // The interior view stays "locked" to ship orientation — counter-rotate so the deck and crew don't spin
        // when the ship turns; only the world background rotates around them.
        if (!renderedShips.has(shipId)) {
          renderedShips.add(shipId);
          const center = shipCenter(entity.ship, entity);
          const shipSx = Math.floor(center.x * TILE_SIZE - state.camera.x + halfW);
          const shipSy = Math.floor(center.y * TILE_SIZE - state.camera.y + halfH);
          withCameraUnrotated(() => drawShipDeckObject(entity.ship, shipSx, shipSy));
        }
        const seated = Boolean(entity.ship.stationRole);
        withCameraUnrotated(() => {
          drawCharacter(entity, sx, sy, isNpc, { restingBench: seated });
          drawShieldBuff(entity, sx, sy);
        });
      } else {
        // Viewer is outside this ship (or is piloting) — show only the small exterior hull.
        if (!renderedShips.has(shipId)) {
          renderedShips.add(shipId);
          const center = shipCenter(entity.ship, entity);
          const shipSx = Math.floor(center.x * TILE_SIZE - state.camera.x + halfW);
          const shipSy = Math.floor(center.y * TILE_SIZE - state.camera.y + halfH);
          const thrustOn = entity.id === state.selfId && state.input.up;
          drawShipVehicleObject(
            entity.ship,
            shipSx,
            shipSy,
            true,
            Number.isFinite(entity.facing) ? entity.facing : 0,
            Boolean(entity.moving || thrustOn)
          );
        }
        // Crew member is inside the hull — do not draw their character above the exterior.
      }
    } else if (entity.ship?.boarded) {
      const thrustOn = entity.id === state.selfId && state.input.up;
      drawShipVehicleObject(
        entity.ship,
        sx,
        sy,
        true,
        Number.isFinite(entity.facing) ? entity.facing : 0,
        Boolean(entity.moving || thrustOn)
      );
    } else {
      const restingBench = isNpc ? isNpcRestingOnBench(entity) : false;
      if (entity.ship && isSciFiWorld()) {
        const dockX = Number.isFinite(entity.ship.dockX) ? entity.ship.dockX : entity.x;
        const dockY = Number.isFinite(entity.ship.dockY) ? entity.ship.dockY : entity.y;
        const dockSx = Math.floor(dockX * TILE_SIZE - state.camera.x + halfW);
        const dockSy = Math.floor(dockY * TILE_SIZE - state.camera.y + halfH);
        if (Math.abs(dockSx - sx) < canvas.width && Math.abs(dockSy - sy) < canvas.height) {
          drawShipVehicleObject(entity.ship, dockSx, dockSy, false);
        }
      }
      // Detect if this entity is standing inside a party member's ship deck so we shrink them too
      const insideShipDeck = !isMob && !isNpc && isEntityInsideAnyShipDeck(entity);
      // Only show party-mate characters in their interior if we're inside that same ship.
      if (insideShipDeck && entity.id !== state.selfId && !viewerInteriorShipId) {
        continue;
      }
      // Passengers and crew inside the viewer's ship interior keep their orientation locked to the deck.
      const lockToShip = insideShipDeck && viewerInteriorShipId;
      if (lockToShip) {
        withCameraUnrotated(() => {
          drawCharacter(entity, sx, sy, isNpc, { restingBench, insideShipDeck });
          if (!isNpc) drawShieldBuff(entity, sx, sy);
        });
      } else {
        drawCharacter(entity, sx, sy, isNpc, { restingBench, insideShipDeck });
        if (!isNpc) drawShieldBuff(entity, sx, sy);
      }
      if (isNpc) {
        drawQuestMarker(entity, sx, sy);
      }
    }
  }
}

function drawWorldLoot() {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const buyInterior = getPlayerStandingBuyableHouseInterior();

  for (const chest of state.chests) {
    if (chest.opened) {
      continue;
    }
    if (buyInterior && worldPointInsideBuildingInterior(chest.x, chest.y, buyInterior)) {
      continue;
    }
    const sx = Math.floor(chest.x * TILE_SIZE - state.camera.x + halfW);
    const sy = Math.floor(chest.y * TILE_SIZE - state.camera.y + halfH);
    if (sx < -40 || sy < -40 || sx > canvas.width + 40 || sy > canvas.height + 40) {
      continue;
    }
    drawChest(sx, sy);
  }

  for (const ground of state.groundItems) {
    if (buyInterior && worldPointInsideBuildingInterior(ground.x, ground.y, buyInterior)) {
      continue;
    }
    const sx = Math.floor(ground.x * TILE_SIZE - state.camera.x + halfW);
    const sy = Math.floor(ground.y * TILE_SIZE - state.camera.y + halfH);
    if (sx < -40 || sy < -40 || sx > canvas.width + 40 || sy > canvas.height + 40) {
      continue;
    }
    drawItemIcon(ground.item, sx, sy);
  }
}

function drawChest(x, y) {
  drawEllipseShadow(x - 11, y + 7, 22, 5, 0.22);
  ctx.fillStyle = "#6c4528";
  ctx.fillRect(x - 10, y - 5, 20, 12);
  ctx.fillStyle = "#9b6a3e";
  ctx.fillRect(x - 10, y - 10, 20, 7);
  ctx.fillStyle = "#ffd166";
  ctx.fillRect(x - 2, y - 8, 4, 13);
  ctx.fillStyle = "#3f291c";
  ctx.fillRect(x - 10, y - 2, 20, 2);
}

function drawItemIcon(item, x, y) {
  ctx.save();
  const color = rarityIconColor(item?.rarity);
  const glowColor = RARITY_GLOW_COLORS[item?.rarity];
  drawEllipseShadow(x - 8, y + 7, 16, 4, 0.18);
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = item?.rarity === "mythic" ? 10 : item?.rarity === "legendary" ? 8 : 6;
  }
  ctx.fillStyle = color;

  if (item?.icon === "potion") {
    ctx.fillStyle = "#d7e4ef";
    ctx.fillRect(x - 2, y - 10, 4, 4);
    ctx.fillStyle = "#f26d6d";
    ctx.fillRect(x - 5, y - 6, 10, 12);
    ctx.restore();
    return;
  }

  if (item?.type === "ship") {
    ctx.fillStyle = "#132131";
    ctx.beginPath();
    ctx.moveTo(x - 9, y + 4);
    ctx.lineTo(x - 1, y - 8);
    ctx.lineTo(x + 9, y - 4);
    ctx.lineTo(x + 5, y + 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(x - 1, y - 6, 8, 5);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.fillRect(x + 2, y - 4, 3, 2);
    ctx.fillStyle = "rgba(103,240,255,0.35)";
    ctx.fillRect(x - 8, y + 1, 16, 2);
    ctx.restore();
    return;
  }

  if (isSciFiWorld() && item?.type === "weapon") {
    if (item.weaponKind === "sword") {
      ctx.fillStyle = color;
      ctx.fillRect(x - 1, y - 10, 3, 18);
      ctx.fillStyle = "#eafcff";
      ctx.fillRect(x, y - 14, 2, 16);
      ctx.fillStyle = "rgba(103,240,255,0.8)";
      ctx.fillRect(x - 6, y - 2, 12, 2);
      ctx.restore();
      return;
    }
    if (item.weaponKind === "bow") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x - 1, y - 1, 9, -0.9, 0.9);
      ctx.stroke();
      ctx.fillStyle = "#eafcff";
      ctx.fillRect(x + 1, y - 9, 10, 3);
      ctx.fillStyle = "rgba(103,240,255,0.8)";
      ctx.fillRect(x + 6, y - 6, 4, 10);
      ctx.restore();
      return;
    }
    if (item.weaponKind === "staff") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.lineTo(x, y - 10);
      ctx.stroke();
      ctx.fillStyle = "#dffaff";
      ctx.fillRect(x - 4, y - 10, 8, 4);
      ctx.fillStyle = "rgba(103,240,255,0.8)";
      ctx.fillRect(x - 6, y - 2, 12, 2);
      ctx.restore();
      return;
    }
  }

  if (item?.type === "armor") {
    const vstyle = item.visual?.torsoStyle || item.torsoStyle || "";
    const nm     = (item.name || "").toLowerCase();
    const isHeavy = vstyle === "armor"  || nm.includes("chestplate") || nm.includes("plate");
    const isRobe  = vstyle === "robe"   || nm.includes("robe");

    if (isSciFiWorld()) {
      ctx.fillStyle = color;
      ctx.fillRect(x - 7, y - 9, 14, 12);
      ctx.fillStyle = "rgba(103,240,255,0.25)";
      ctx.fillRect(x - 7, y - 9, 14, 3);
      ctx.fillRect(x - 7, y + 1, 14, 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(x - 2, y - 6, 4, 10);
      ctx.restore();
      return;
    }

    if (vstyle === "ascendant") {
      ctx.fillStyle = color;
      ctx.fillRect(x - 8, y - 10, 16, 14);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#67e8f9";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 8, y - 10, 16, 14);
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(x - 8, y - 10, 16, 3);
      ctx.fillRect(x - 8, y + 2, 16, 3);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(x - 2, y - 7, 4, 10);
      ctx.restore();
      return;
    }

    if (isHeavy) {
      ctx.fillStyle = color;
      ctx.fillRect(x - 7, y - 9, 14, 12);
      ctx.fillRect(x - 9, y - 8,  4,  7);
      ctx.fillRect(x + 5, y - 8,  4,  7);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x - 1, y - 9, 2, 12);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(x - 6, y - 8, 4, 2);
    } else if (isRobe) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 10);
      ctx.lineTo(x + 4, y - 10);
      ctx.lineTo(x + 8, y + 3);
      ctx.lineTo(x - 8, y + 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(180,120,255,0.75)";
      ctx.fillRect(x - 4, y - 10, 8, 2);
      ctx.fillRect(x - 8, y + 1,  16, 2);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x - 5, y - 8, 10, 11);
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 6);
      ctx.lineTo(x + 4, y + 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(x - 4, y - 7, 4, 2);
    }
    ctx.restore();
    return;
  }

  if (item?.type === "ring") {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y - 2, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(x - 2, y - 12, 4, 4);
    ctx.restore();
    return;
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 6);
  ctx.lineTo(x + 8, y - 10);
  ctx.stroke();
  ctx.restore();
}

/** Green cloak — anchored tight to the back; subtle motion only at the hem */
function drawModCape(px, py, scale, bob, dirX, dirY, moving, sinWalk) {
  const capeX = px + 1.25 * scale;
  const capeY = py + 1.6 * scale + bob;
  const t = performance.now() * 0.0038;
  const idleSway = Math.sin(t) * 0.28 * scale + Math.sin(t * 1.7 + dirX * 2) * 0.1 * scale;
  const walkBurst = moving
    ? sinWalk * 1.9 * Math.max(scale / 3, 1)
      + Math.sin(t * 2.8) * 0.65 * Math.max(scale / 3, 1)
      + dirX * 0.55 * scale
    : 0;
  const skew = idleSway + walkBurst;

  ctx.fillStyle = "#0f4d32";
  ctx.fillRect(
    Math.round(capeX - scale + skew * 0.08),
    capeY,
    9 * scale,
    8 * scale
  );
  ctx.fillStyle = "#198f55";
  ctx.fillRect(
    Math.round(capeX - 0.45 * scale + skew * 0.12),
    capeY + 2.5 * scale,
    8.2 * scale,
    11 * scale
  );
  ctx.fillStyle = "#20965d";
  ctx.fillRect(
    Math.round(capeX - 0.9 * scale + skew * 0.22),
    capeY + 5.5 * scale,
    9 * scale + Math.min(4, Math.abs(skew) * 0.35),
    6 * scale
  );
  ctx.fillStyle = "#4dd68c";
  const fold = moving ? Math.abs(sinWalk) * scale * 0.55 : Math.abs(skew) * 0.06;
  ctx.fillRect(Math.round(capeX + 4 * scale + skew * 0.12), capeY + 4 * scale, Math.max(scale * 1.4, fold), 8 * scale);
  ctx.fillStyle = "#9fecc0";
  ctx.fillRect(capeX - 0.9 * scale, capeY, 9 * scale, Math.max(1.1 * scale, 2));
}

function drawModHood(hx, hy, scale, dirX) {
  ctx.fillStyle = "#4f5c6a";
  ctx.fillRect(hx - scale, hy - scale, 7 * scale, 6 * scale);
  ctx.fillStyle = "#323943";
  ctx.fillRect(hx, hy, 5 * scale, 4 * scale);
  ctx.fillStyle = "#9aaebf";
  ctx.fillRect(hx + scale + Math.max(0, dirX) * scale, hy + scale, 3 * scale, 2 * scale);
  ctx.fillStyle = "#6b7f92";
  ctx.fillRect(hx + scale + Math.max(0, dirX) * scale, hy + scale + scale, 3 * scale, scale);
  ctx.fillStyle = "#263240";
  ctx.fillRect(hx + scale + Math.max(0, dirX) * scale, hy + scale, scale, scale);
  ctx.fillRect(hx + 3 * scale + Math.max(0, dirX) * scale, hy + scale, scale, scale);
  ctx.fillStyle = "#74c896";
  ctx.fillRect(hx - scale, hy - scale, 7 * scale, Math.max(scale, 2));
}

function drawSciFiHelmet(hx, hy, scale, shellColor, visorColor, dirX) {
  const visorShift = Math.max(0, Math.round(dirX)) * scale;
  ctx.fillStyle = blend(shellColor, "#000000", 0.26);
  ctx.fillRect(hx - scale, hy - scale, 7 * scale, 6 * scale);
  ctx.fillStyle = shellColor;
  ctx.fillRect(hx, hy, 5 * scale, 4 * scale);
  ctx.fillStyle = blend(shellColor, "#ffffff", 0.12);
  ctx.fillRect(hx + scale, hy - scale, 3 * scale, scale);
  ctx.fillStyle = visorColor;
  ctx.fillRect(hx + scale + visorShift, hy + scale, 3 * scale, 2 * scale);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(hx + scale + visorShift, hy + scale, 2 * scale, scale);
  ctx.fillStyle = "rgba(103,240,255,0.25)";
  ctx.fillRect(hx - scale, hy - scale, 7 * scale, Math.max(scale, 2));
}

function drawAlienHead(hx, hy, scale, shellColor, visorColor, dirX) {
  const eyeShift = Math.max(0, Math.round(dirX)) * scale;
  ctx.fillStyle = blend(shellColor, "#102028", 0.18);
  ctx.fillRect(hx - scale, hy - 2 * scale, 7 * scale, 7 * scale);
  ctx.fillStyle = shellColor;
  ctx.fillRect(hx, hy - scale, 5 * scale, 5 * scale);
  ctx.fillStyle = blend(shellColor, "#ffffff", 0.18);
  ctx.fillRect(hx + scale, hy - 2 * scale, 3 * scale, scale);
  ctx.fillStyle = visorColor;
  ctx.fillRect(hx + scale + eyeShift, hy + scale, scale, scale);
  ctx.fillRect(hx + 3 * scale + eyeShift, hy + scale, scale, scale);
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillRect(hx + scale + eyeShift, hy + scale, Math.max(1, scale - 1), Math.max(1, scale - 1));
  ctx.fillRect(hx + 3 * scale + eyeShift, hy + scale, Math.max(1, scale - 1), Math.max(1, scale - 1));
  ctx.fillStyle = blend(shellColor, "#000000", 0.35);
  ctx.fillRect(hx + 2 * scale, hy + 3 * scale, 2 * scale, scale);
}

function drawCharacter(entity, x, y, isNpc = false, poseOpts = null) {
  const isMod = !!entity.isMod;
  // Players appear smaller when walking around inside a ship deck so the interior feels spacious
  const onShipDeck = Boolean(entity?.ship?.boarded && entity.ship?.deckMode) || Boolean(poseOpts?.insideShipDeck);
  const deckScale = onShipDeck ? 0.55 : 1;
  const s = (isMod ? 3 * 1.2 : 3) * deckScale;
  const phase  = entity.walkPhase || 0;
  const moving = Boolean(entity.renderMoving);
  const facing = Number.isFinite(entity.facing) ? entity.facing : Math.PI / 2;
  const dirX = Math.cos(facing);
  const dirY = Math.sin(facing);
  const sideX = -dirY;
  const sideY =  dirX;

  const emoteKind = entity.emote || null;
  const t = emoteKind ? performance.now() / 1000 : 0;
  const dancing  = emoteKind === "dance";
  const waving   = emoteKind === "wave";
  const laughing = emoteKind === "laugh";
  const cheering = emoteKind === "cheer";
  const crying   = emoteKind === "cry";
  const bowing   = emoteKind === "bow";

  const lyingBedPose = !!(poseOpts && poseOpts.lyingBed);
  const restingBenchPose = !!(poseOpts && poseOpts.restingBench);
  const selfBenchSit =
    !isNpc &&
    entity.id === state.selfId &&
    ((state.benchSeatIndefinite || false) || (state.benchSitUntil || 0) > performance.now());
  const benchSeatPose = restingBenchPose || selfBenchSit;
  const compressLowerBody = benchSeatPose || lyingBedPose;
  const swimming = Boolean(entity.renderSwimming) && !compressLowerBody && !entity.ship?.boarded;

  const wf   = dancing ? 4.0 : swimming ? 3.05 : 2.6;
  const swimAnim = swimming && !dancing;
  const sin1 = (moving || dancing || swimAnim) ? Math.sin(dancing ? t * wf : phase * wf) : 0;
  const cos1 = (moving || dancing || swimAnim) ? Math.cos(dancing ? t * wf : phase * wf) : 0;

  let rawBob;
  if (dancing)       rawBob = Math.abs(Math.cos(t * 4.0)) * 4 - 0.4 + Math.sin(t * 2.1) * 2;
  else if (laughing) rawBob = Math.sin(t * 13) * 2;
  else if (crying)   rawBob = Math.sin(t * 1.8) * 1;
  else if (bowing)   rawBob = 0;
  else if (swimming) rawBob = 0;
  else               rawBob = moving ? Math.abs(cos1) * 1.5 - 0.4 : 0;
  const bob = dancing ? rawBob : Math.round(rawBob);

  const fx   = Math.round(dirX);
  const fy   = Math.round(dirY * 0.6);

  const sciFiNpc = !!(isNpc && (entity.npcTheme === SCI_FI_THEME || entity.sciFiLook));
  const sciFiLook = entity.sciFiLook || "";
  const torsoColor  = isMod ? "#697987" : (entity.torsoColor || entity.primary || "#5cc8ff");
  const weaponColor = entity.weaponColor || entity.accent || "#ffd166";
  const torsoStyle  = isMod ? "robe" : sciFiNpc ? "sciFi" : (entity.torsoStyle || "tunic");
  const skinColor   = sciFiNpc ? "#bfd8ea" : "#f0c9a2";
  const skinShadow  = sciFiNpc ? "#6f91a7" : "#c88a60";
  const pantColor   = isMod ? "#454e5c" : sciFiNpc ? blend(torsoColor, "#000000", 0.22) : "#2a3044";
  const bootColor   = isMod ? "#2f3641" : sciFiNpc ? blend(torsoColor, "#000000", 0.38) : "#1a1e2c";
  const helmetColor = entity.helmetColor || blend(torsoColor, "#ffffff", 0.08);
  const visorColor = entity.visorColor || "#67f0ff";

  /** Negative nudge draws the torso higher so the character reads as sitting on the plank, not under it. */
  const sitBumpPx = lyingBedPose ? 11 : benchSeatPose ? -13 : 0;
  const headSitNudge = benchSeatPose ? Math.round(s * 0.85) : lyingBedPose ? Math.round(s * 0.42) : 0;

  const swimSink = swimming ? Math.round(2.1 * s) : 0;
  const bx = x;
  const by = y + bob + sitBumpPx + swimSink;

  const homeCasting =
    !isNpc &&
    entity.id === state.selfId &&
    state.pendingHomeTeleportUntil > performance.now();

  if (!lyingBedPose) {
    if (isMod) {
      drawEllipseShadow(x - 14, y + 13, 29, 7, 0.28);
    } else {
      drawEllipseShadow(x - 12, y + 12, 24, 6, 0.28);
    }
  } else {
    drawEllipseShadow(x + 2, y + 14, 30, 5, 0.22);
  }

  if (lyingBedPose) {
    ctx.save();
    ctx.translate(x + 10, by + s * 2);
    ctx.rotate(-Math.PI / 2 + 0.06);
    ctx.translate(-(x + 10), -(by + s * 2));
  }
  if (swimming) {
    ctx.save();
    ctx.translate(bx, by - s);
    ctx.rotate(Math.PI / 2 - facing);
    ctx.translate(-bx, -(by - s));
  }

  if (isMod) {
    drawModCape(bx - 5.2 * s, by - 3.6 * s, s, bob, dirX, dirY, moving, sin1);
  }

  // Tiny stump legs (RotMG style) — compressed when seated on benches; scissor kick when swimming
  const legWalk = moving && !swimming ? Math.round(sin1 * 2) : 0;
  const swimKick = swimming ? Math.round(Math.sin(phase * 3.15) * 2.2) : 0;
  ctx.fillStyle = pantColor;
  if (compressLowerBody) {
    ctx.fillRect(bx - 4 * s, by + 3 * s, 8 * s, 2 * s);
    ctx.fillStyle = bootColor;
    ctx.fillRect(bx - 4 * s - 1, by + 4 * s, 5 * s, 2 * s);
    ctx.fillRect(bx + 0 * s, by + 4 * s, 5 * s, 2 * s);
  } else if (swimming) {
    ctx.fillRect(bx - 5 * s - swimKick, by + 3 * s, 3 * s, 2 * s);
    ctx.fillRect(bx + 2 * s + swimKick, by + 3 * s, 3 * s, 2 * s);
    ctx.fillStyle = bootColor;
    ctx.fillRect(bx - 5 * s - 1, by + 5 * s, 4 * s, 2 * s);
    ctx.fillRect(bx + 2 * s, by + 5 * s, 4 * s, 2 * s);
  } else {
    ctx.fillRect(bx - 4 * s,     by + 3 * s - legWalk, 3 * s, 2 * s);
    ctx.fillRect(bx +     s,     by + 3 * s + legWalk, 3 * s, 2 * s);
    ctx.fillStyle = bootColor;
    ctx.fillRect(bx - 4 * s - 1, by + 5 * s,           4 * s, 2 * s);
    ctx.fillRect(bx +     s,     by + 5 * s + legWalk,  4 * s, 2 * s);
  }

  // Torso
  drawTorso2(bx - 4 * s, by - 3 * s, s, torsoStyle, torsoColor, weaponColor, entity.classId, fx, fy);

  if (isNpc && entity.romanceSilhouette === "soft_curves" && !lyingBedPose && !compressLowerBody) {
    const bustTint = blend(torsoColor, "#ffd6e8", 0.42);
    ctx.fillStyle = bustTint;
    ctx.beginPath();
    ctx.ellipse(bx - 1.4 * s, by - 1.15 * s, 2.35 * s, 1.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bx + 1.25 * s, by - 1.1 * s, 2.15 * s, 1.42 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Short arms (raised + glowing while channeling home teleport)
  ctx.fillStyle = isMod ? torsoColor : sciFiNpc ? blend(torsoColor, "#ffffff", 0.02) : skinColor;
  let lAX;
  let lAY;
  let rAX;
  let rAY;
  const nowArm = performance.now();
  if (homeCasting && !lyingBedPose) {
    const tw = Math.sin(nowArm / 95);
    const tw2 = Math.sin(nowArm / 72 + 1.1);
    const lift = 4 * s;
    const wave = Math.round(tw * 2 * s);
    const wave2 = Math.round(tw2 * 2 * s);
    lAX = bx - 7 * s - wave;
    lAY = by - 6 * s - lift - Math.round(Math.abs(tw2) * s);
    rAX = bx + 3 * s + wave2;
    rAY = by - 6 * s - lift - Math.round(Math.abs(tw) * s);
    const lw = Math.max(2, Math.round(2 * s));
    const lh = Math.round(5 * s);
    ctx.save();
    ctx.shadowColor = "rgba(255, 230, 160, 0.95)";
    ctx.shadowBlur = 16;
    ctx.fillRect(lAX, lAY, lw, lh);
    ctx.fillRect(rAX, rAY, lw, lh);
    ctx.shadowBlur = 0;
    ctx.restore();
  } else if (poseOpts && poseOpts.companionReachOut && isNpc) {
    const wig = Math.round(Math.sin(nowArm / 118) * (1.6 * s));
    lAX = bx - 9 * s + wig;
    lAY = by - 7 * s + Math.abs(wig) * 0.35;
    rAX = bx + 3 * s + wig;
    rAY = by - 9 * s;
    ctx.fillRect(lAX, lAY, 2 * s, 5 * s);
    ctx.fillRect(rAX, rAY, 2 * s, 5 * s);
  } else if (dancing) {
    const da = Math.round(Math.sin(t * 4.0) * 3 * s);
    lAX = bx - 7 * s; lAY = by - 3 * s - da;
    rAX = bx + 4 * s; rAY = by - 3 * s + da;
    ctx.fillRect(lAX, lAY, 2 * s, 4 * s);
    ctx.fillRect(rAX, rAY, 2 * s, 4 * s);
  } else if (waving) {
    const wv = Math.round(Math.sin(t * 5) * 2 * s);
    lAX = bx - 6 * s; lAY = by - 2 * s;
    rAX = bx + 4 * s; rAY = by - 6 * s + wv;
    ctx.fillRect(lAX, lAY, 2 * s, 4 * s);
    ctx.fillRect(rAX, rAY, 2 * s, 3 * s);
  } else if (cheering) {
    const cv = Math.round(Math.sin(t * 3) * s);
    lAX = bx - 8 * s + cv; lAY = by - 7 * s;
    rAX = bx + 5 * s - cv; rAY = by - 7 * s;
    ctx.fillRect(lAX, lAY, 2 * s, 5 * s);
    ctx.fillRect(rAX, rAY, 2 * s, 5 * s);
  } else if (crying) {
    lAX = bx - 6 * s; lAY = by - s;
    rAX = bx + 4 * s; rAY = by - s;
    ctx.fillRect(lAX, lAY, 2 * s, 5 * s);
    ctx.fillRect(rAX, rAY, 2 * s, 5 * s);
  } else if (laughing) {
    const la = Math.round(Math.sin(t * 13) * s);
    lAX = bx - 6 * s + la; lAY = by - 2 * s;
    rAX = bx + 4 * s - la; rAY = by - 2 * s;
    ctx.fillRect(lAX, lAY, 2 * s, 4 * s);
    ctx.fillRect(rAX, rAY, 2 * s, 4 * s);
  } else if (bowing) {
    lAX = bx - 4 * s; lAY = by + s;
    rAX = bx + 3 * s; rAY = by + s;
    ctx.fillRect(lAX, lAY, 2 * s, 4 * s);
    ctx.fillRect(rAX, rAY, 2 * s, 4 * s);
  } else if (swimming) {
    if (moving) {
      // Alternating crawl stroke: arms cycle from reaching past the head (forward in
      // swim direction after the body rotation) to pulling back past the hips.
      const strokeL = Math.sin(phase * 2.0);
      lAX = bx - 7 * s;
      lAY = by - 2 * s + Math.round(strokeL * 5 * s);
      rAX = bx + 5 * s;
      rAY = by - 2 * s - Math.round(strokeL * 5 * s);
    } else {
      const tr = Math.round(Math.sin(phase * 2.15) * s);
      lAX = bx - 7 * s + tr;
      lAY = by - 3 * s;
      rAX = bx + 4 * s - tr;
      rAY = by - 3 * s;
    }
    ctx.fillRect(lAX, lAY, 2 * s, 4 * s);
    ctx.fillRect(rAX, rAY, 2 * s, 4 * s);
  } else {
    const armSwing = moving ? Math.round(sin1 * 2) : 0;
    lAX = bx - 6 * s;
    lAY = by - 2 * s - armSwing;
    rAX = bx + 4 * s;
    rAY = by - 2 * s + armSwing;
    ctx.fillRect(lAX, lAY, 2 * s, 4 * s);
    ctx.fillRect(rAX, rAY, 2 * s, 4 * s);
  }

  // Head / hood
  const bowHeadNudge = bowing ? Math.round(3 * s) : 0;
  const hx = bx - 2 * s + fx * s + (bowing ? Math.round(s) : 0);
  const hy = by - 7 * s + fy + headSitNudge + bowHeadNudge;
  if (sciFiNpc) {
    if (sciFiLook === "alien") {
      drawAlienHead(hx, hy, s, helmetColor, visorColor, fx);
    } else {
      drawSciFiHelmet(hx, hy, s, helmetColor, visorColor, fx);
    }
  } else if (isMod) {
    drawModHood(hx, hy, s, dirX);
  } else {
    ctx.fillStyle = skinColor;
    ctx.fillRect(hx, hy, 5 * s, 4 * s);
    ctx.fillStyle = skinShadow;
    ctx.fillRect(hx, hy + 3 * s, 5 * s, s);
    // Hair / hat stripe
    ctx.fillStyle = weaponColor;
    ctx.fillRect(hx, hy, 5 * s, s + 1);
    if (entity.classId === "mage") {
      ctx.fillRect(hx + s,           hy - 2 * s, 3 * s, 2 * s);
      ctx.fillRect(hx + s + (s >> 1), hy - 3 * s, 2 * s, s);
    }
    if (entity.longHair) {
      ctx.fillStyle = weaponColor;
      ctx.fillRect(hx - 1 * s, hy - 3 * s, 2 * s, 5 * s);
      ctx.fillRect(hx + 4 * s, hy - 2 * s, 2 * s, 4 * s);
      ctx.fillRect(hx + s, hy - 4 * s, 3 * s, 2 * s);
      ctx.fillRect(hx + 2 * s, hy - 5 * s, 2 * s, 2 * s);
    }
    // Eyes
    ctx.fillStyle = "#1d2430";
    const eyeY = hy + 2 * s;
    const eo   = Math.max(0, fx) * s;
    ctx.fillRect(hx +     s + eo, eyeY, s, s);
    ctx.fillRect(hx + 3 * s + eo, eyeY, s, s);
  }

  // Weapon / equipment (stash weapon while channeling home / sitting / swimming)
  if (!isNpc && !homeCasting && !benchSeatPose && !lyingBedPose && !swimming) {
    drawClassEquipment(entity, bx, by, dirX, dirY, sideX, sideY, weaponColor,
      rAX + s, rAY + 2 * s,
      lAX + s, lAY + 2 * s, moving, sin1, s);
  }

  if (lyingBedPose) {
    ctx.restore();
  }
  if (swimming) {
    ctx.restore();
  }

  const flirtLine =
    poseOpts && typeof poseOpts.ambientLine === "string" ? poseOpts.ambientLine.trim() : "";

  // Name tag
  ctx.font = "11px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(8,12,18,0.82)";
  ctx.fillStyle = sciFiNpc ? "#9fefff" : isNpc ? "#ffd27a" : entity.isMod ? "#b8efd0" : "#f7f3df";
  const nameLift = entity.isMod ? 38 : 28;
  ctx.strokeText(entity.name, x, y - nameLift);
  ctx.fillText(entity.name, x, y - nameLift);

  if (flirtLine) {
    const ly = lyingBedPose ? y - 12 : y - 40;
    ctx.font = "10px ui-sans-serif, system-ui";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(12,14,26,0.88)";
    ctx.fillStyle = "rgba(255,225,238,0.92)";
    ctx.strokeText(flirtLine, x, ly);
    ctx.fillText(flirtLine, x, ly);
  }

  if (!isNpc && Number.isFinite(entity.hp) && Number.isFinite(entity.maxHp)) {
    const barW = entity.isMod ? 38 : 32;
    const barXOff = entity.isMod ? Math.round(barW / 2) : 16;
    drawHealthBar(x - barXOff, y - (entity.isMod ? 26 : 22), barW, 3, entity.hp, entity.maxHp);
  }

  drawSpeechBubble(entity, x, y - (entity.isMod ? 52 : 44));
}

function drawLeg(lx, ly, s, pantColor, bootColor, dirX, dirY, moving, sinVal, side) {
  ctx.fillStyle = pantColor;
  ctx.fillRect(lx, ly, 3 * s, 2 * s);
  ctx.fillStyle = bootColor;
  ctx.fillRect(lx - 1, ly + 2 * s, 4 * s, 2 * s);
}

function drawTorso2(tx, ty, s, style, torsoColor, trimColor, classId, fx, fy) {
  const w = 8 * s;
  const h = 6 * s;

  if (style === "legendary") {
    ctx.shadowColor = "#ffd166";
    ctx.shadowBlur = 8;
    ctx.fillStyle = torsoColor;
    ctx.fillRect(tx, ty, w, h);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(tx, ty,         w, s);
    ctx.fillRect(tx, ty + h - s, w, s);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    return;
  }

  if (style === "ascendant") {
    ctx.shadowColor = "#e879f9";
    ctx.shadowBlur = 11;
    ctx.fillStyle = torsoColor;
    ctx.fillRect(tx, ty, w, h);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#fde68a";
    ctx.fillRect(tx, ty, w, s);
    ctx.fillRect(tx, ty + h - s, w, s);
    ctx.fillStyle = "#67e8f9";
    ctx.fillRect(tx, ty + s, s, h - 2 * s);
    ctx.fillRect(tx + w - s, ty + s, s, h - 2 * s);
    ctx.fillStyle = "rgba(255,255,255,0.42)";
    ctx.fillRect(tx + (w >> 1) - Math.max(1, s >> 1), ty + s, Math.max(2, s), h - 2 * s);
    return;
  }

  if (style === "armor") {
    // Chestplate — boxy, metallic
    ctx.fillStyle = "#5a6577";
    ctx.fillRect(tx, ty, w, h);
    ctx.fillStyle = "#7c8c9a";
    ctx.fillRect(tx + s, ty + s, w - 2 * s, h - 2 * s);
    ctx.fillStyle = "#d4dae2";
    ctx.fillRect(tx + 2 * s, ty + s, w - 4 * s, s);
    ctx.fillRect(tx + (w >> 1) - 1, ty, 2, h);
    ctx.fillStyle = trimColor;
    ctx.fillRect(tx, ty + h - s, w, s);
    return;
  }

  if (style === "robe") {
    // Flowing robe — coloured, wider skirt
    ctx.fillStyle = torsoColor;
    ctx.fillRect(tx, ty, w, h + 2 * s);
    ctx.fillStyle = blend(torsoColor, "#000000", 0.22);
    ctx.fillRect(tx, ty + h, w, 2 * s);
    ctx.fillStyle = trimColor;
    ctx.fillRect(tx,         ty, s, h + 2 * s);
    ctx.fillRect(tx + w - s, ty, s, h + 2 * s);
    ctx.fillStyle = blend(torsoColor, "#ffffff", 0.1);
    ctx.fillRect(tx + (w >> 1) - s, ty + s, 2 * s, h - 2 * s);
    return;
  }

  if (style === "sciFi") {
    ctx.fillStyle = blend(torsoColor, "#0a1018", 0.08);
    ctx.fillRect(tx, ty, w, h);
    ctx.fillStyle = blend(torsoColor, "#000000", 0.18);
    ctx.fillRect(tx + s, ty + s, w - 2 * s, h - 2 * s);
    ctx.fillStyle = trimColor;
    ctx.fillRect(tx + s, ty, w - 2 * s, s);
    ctx.fillRect(tx + s, ty + h - s, w - 2 * s, s);
    ctx.fillStyle = "rgba(103,240,255,0.92)";
    ctx.fillRect(tx + (w >> 1) - Math.max(1, s >> 1), ty + s, Math.max(2, s), h - 2 * s);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(tx + s, ty + s, w - 2 * s, s);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(tx + 2 * s, ty + 2 * s, 2 * s, 2 * s);
    ctx.fillRect(tx + w - 4 * s, ty + 2 * s, 2 * s, 2 * s);
    return;
  }

  if (style === "plate") {
    ctx.fillStyle = blend(torsoColor, "#708090", 0.55);
    ctx.fillRect(tx, ty, w, h);
    ctx.fillStyle = blend(torsoColor, "#c8d4dc", 0.35);
    ctx.fillRect(tx + s, ty + s, w - 2 * s, h - 2 * s);
    ctx.fillStyle = blend(torsoColor, "#e0e8f0", 0.25);
    ctx.fillRect(tx + (w >> 1) - s, ty, 2 * s, h);
    ctx.fillStyle = trimColor;
    ctx.fillRect(tx, ty, w, s);
    ctx.fillRect(tx, ty, s, h);
    ctx.fillRect(tx + w - s, ty, s, h);
    return;
  }

  if (style === "chainmail") {
    ctx.fillStyle = "#383e4a";
    ctx.fillRect(tx, ty, w, h);
    ctx.fillStyle = blend(torsoColor, "#aabbcc", 0.5);
    const cw = Math.max(2, Math.round(w / 5));
    const ch = Math.max(2, Math.round(h / 4));
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const ox = (row % 2) * Math.round(cw / 2);
        ctx.fillRect(tx + col * cw + ox, ty + row * ch, cw - 1, ch - 1);
      }
    }
    ctx.fillStyle = trimColor;
    ctx.fillRect(tx, ty, w, s);
    ctx.fillRect(tx, ty + h - s, w, s);
    return;
  }

  if (style === "leather") {
    ctx.fillStyle = blend(torsoColor, "#3e2208", 0.45);
    ctx.fillRect(tx, ty, w, h);
    ctx.fillStyle = blend(torsoColor, "#c08040", 0.35);
    for (let i = 1; i <= 3; i++) {
      ctx.fillRect(tx + s, ty + Math.round(i * h / 4) - 1, w - 2 * s, Math.max(1, s - 1));
    }
    ctx.fillStyle = trimColor;
    ctx.fillRect(tx + 2 * s, ty, w - 4 * s, s);
    ctx.fillRect(tx + 2 * s, ty + h - s, w - 4 * s, s);
    return;
  }

  if (style === "cloak") {
    ctx.fillStyle = torsoColor;
    ctx.fillRect(tx - s, ty, w + 2 * s, h + 3 * s);
    ctx.fillStyle = blend(torsoColor, "#000000", 0.22);
    ctx.fillRect(tx - s, ty + h, w + 2 * s, 3 * s);
    ctx.fillStyle = trimColor;
    ctx.fillRect(tx - s, ty, s, h + 3 * s);
    ctx.fillRect(tx + w, ty, s, h + 3 * s);
    ctx.fillStyle = blend(torsoColor, "#ffffff", 0.12);
    ctx.fillRect(tx + (w >> 1) - s, ty + s, 2 * s, h);
    return;
  }

  if (style === "scale") {
    ctx.fillStyle = blend(torsoColor, "#000000", 0.3);
    ctx.fillRect(tx, ty, w, h);
    ctx.fillStyle = torsoColor;
    const sw = Math.max(2, Math.round(w / 4));
    const sh = Math.max(2, Math.round(h / 4));
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const ox = (row % 2) * Math.round(sw / 2);
        ctx.fillRect(tx + col * sw + ox, ty + row * sh, sw - 1, sh - 1);
      }
    }
    ctx.fillStyle = trimColor;
    ctx.fillRect(tx, ty, w, s);
    return;
  }

  if (style === "battle") {
    ctx.fillStyle = blend(torsoColor, "#4a5568", 0.5);
    ctx.fillRect(tx, ty, w, h);
    ctx.fillStyle = blend(torsoColor, "#8899aa", 0.4);
    ctx.fillRect(tx + s, ty + s, w - 2 * s, h - 2 * s);
    ctx.fillStyle = blend(torsoColor, "#ffffff", 0.15);
    ctx.fillRect(tx + s, ty, 3 * s, h);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(tx + 3 * s, ty + s, 2, h - 2 * s);
    ctx.fillStyle = trimColor;
    ctx.fillRect(tx, ty, w, s);
    ctx.fillRect(tx, ty + h - s, w, s);
    return;
  }

  if (style === "cloth") {
    ctx.fillStyle = blend(torsoColor, "#ffffff", 0.2);
    ctx.fillRect(tx, ty, w, h);
    ctx.fillStyle = blend(torsoColor, "#000000", 0.08);
    ctx.fillRect(tx, ty + h - s, w, s);
    ctx.fillRect(tx + s, ty + Math.round(h / 2), w - 2 * s, Math.max(1, s >> 1));
    ctx.fillStyle = trimColor;
    ctx.fillRect(tx + s, ty, w - 2 * s, s);
    return;
  }

  if (style === "shadowweave") {
    ctx.shadowColor = blend(torsoColor, "#9900ff", 0.6);
    ctx.shadowBlur = 8;
    ctx.fillStyle = blend(torsoColor, "#000000", 0.72);
    ctx.fillRect(tx, ty, w, h);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.fillStyle = blend(torsoColor, "#cc88ff", 0.35);
    ctx.fillRect(tx + s, ty + s, w - 2 * s, s);
    ctx.fillRect(tx + (w >> 1) - s, ty + 2 * s, 2 * s, h - 3 * s);
    return;
  }

  if (style === "crystal") {
    ctx.shadowColor = torsoColor;
    ctx.shadowBlur = 7;
    ctx.fillStyle = blend(torsoColor, "#ffffff", 0.4);
    ctx.fillRect(tx, ty, w, h);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillRect(tx + s, ty, s, h);
    ctx.fillStyle = blend(torsoColor, "#000000", 0.12);
    ctx.fillRect(tx + 3 * s, ty, w - 5 * s, h);
    ctx.fillStyle = trimColor;
    ctx.fillRect(tx, ty, w, s);
    ctx.fillRect(tx, ty + h - s, w, s);
    return;
  }

  if (style === "fire") {
    ctx.fillStyle = blend(torsoColor, "#cc3300", 0.45);
    ctx.fillRect(tx, ty, w, h);
    ctx.fillStyle = blend(torsoColor, "#ffaa00", 0.35);
    ctx.fillRect(tx + s, ty + s, w - 2 * s, h - 2 * s);
    ctx.shadowColor = "#ff6600";
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#ffcc44";
    ctx.fillRect(tx + 2 * s, ty, w - 4 * s, s);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.fillStyle = trimColor;
    ctx.fillRect(tx, ty + h - s, w, s);
    return;
  }

  if (style === "frost") {
    ctx.fillStyle = blend(torsoColor, "#99ddff", 0.45);
    ctx.fillRect(tx, ty, w, h);
    ctx.fillStyle = blend(torsoColor, "#ffffff", 0.35);
    ctx.fillRect(tx + s, ty, w - 2 * s, s);
    ctx.fillRect(tx + s, ty + h - s, w - 2 * s, s);
    ctx.fillStyle = "rgba(200,240,255,0.5)";
    ctx.fillRect(tx + 2 * s, ty + s, 2 * s, h - 2 * s);
    ctx.fillRect(tx + w - 4 * s, ty + s, 2 * s, h - 2 * s);
    ctx.fillStyle = trimColor;
    ctx.fillRect(tx + (w >> 1) - s, ty, 2 * s, h);
    return;
  }

  if (style === "runic") {
    ctx.fillStyle = blend(torsoColor, "#0a0a1e", 0.6);
    ctx.fillRect(tx, ty, w, h);
    ctx.shadowColor = "#ffdd44";
    ctx.shadowBlur = 5;
    ctx.fillStyle = "#ffdd44";
    ctx.fillRect(tx + 2 * s, ty + s, w - 4 * s, Math.max(1, s >> 1));
    ctx.fillRect(tx + 2 * s, ty + h - 2 * s, w - 4 * s, Math.max(1, s >> 1));
    ctx.fillRect(tx + (w >> 1) - 1, ty + 2 * s, 2, h - 4 * s);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.fillStyle = trimColor;
    ctx.fillRect(tx, ty, w, s);
    ctx.fillRect(tx, ty + h - s, w, s);
    return;
  }

  // Default tunic
  ctx.fillStyle = torsoColor;
  ctx.fillRect(tx, ty, w, h);
  ctx.fillStyle = blend(torsoColor, "#000000", 0.2);
  ctx.fillRect(tx, ty + h - s, w, s);
  ctx.fillStyle = trimColor;
  ctx.fillRect(tx + 2 * s, ty, w - 4 * s, s);
  ctx.fillStyle = blend(torsoColor, "#ffffff", 0.12);
  ctx.fillRect(tx + (w >> 1) - s, ty + s, 2 * s, h - 2 * s);
}

function drawSpeechBubble(entity, x, y) {
  const bubble = state.speechBubbles.get(entity.id);
  const now = performance.now();
  if (!bubble) {
    return;
  }
  if (bubble.expiresAt <= now) {
    state.speechBubbles.delete(entity.id);
    return;
  }

  ctx.font = "12px ui-sans-serif, system-ui";
  const lines = wrapBubbleText(bubble.text, 24).slice(0, 3);
  const width = Math.min(190, Math.max(58, ...lines.map((line) => ctx.measureText(line).width + 18)));
  const height = 16 + lines.length * 14;
  const left = Math.round(x - width / 2);
  const top = Math.round(y - height);

  const isMod = entity.isMod;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (bubble.expiresAt - now) / 500);
  ctx.fillStyle = isMod ? "rgba(200, 240, 214, 0.96)" : "rgba(247, 243, 223, 0.94)";
  ctx.strokeStyle = isMod ? "rgba(25, 80, 52, 0.95)" : "rgba(28, 34, 46, 0.88)";
  ctx.lineWidth = 2;
  roundedRect(left, top, width, height, 6);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - 5, top + height - 1);
  ctx.lineTo(x, top + height + 7);
  ctx.lineTo(x + 5, top + height - 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isMod ? "#123d28" : "#1d2430";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  lines.forEach((line, index) => {
    ctx.fillText(line, x, top + 8 + index * 14);
  });
  ctx.restore();
}

function wrapBubbleText(text, maxChars) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines.length > 0 ? lines : [String(text).slice(0, maxChars)];
}

function roundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function drawClassEquipment(entity, x, y, dirX, dirY, sideX, sideY, accent, rHandX, rHandY, lHandX, lHandY, moving = false, walkSin = 0, eqS = 3) {
  const style = entity.weaponStyle || "classic";
  const weaponKind = entity.weaponKind || (entity.classId === "mage" ? "staff" : entity.classId === "knight" ? "sword" : "bow");
  if (!weaponKind) {
    return;
  }
  const ornateWeapon = [
    "ornate",
    "legendary",
    "ascendant",
    "crystal",
    "dark",
    "runic",
    "spectral",
    "frost",
    "fire",
    "saber",
    "pulse",
    "ion",
    "plasma",
    "rail"
  ].includes(style);
  const isLegendary = style === "legendary";
  const isAscendant = style === "ascendant";
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (isLegendary || isAscendant) {
    ctx.save();
    ctx.shadowColor = isAscendant ? "#c084fc" : "#ffd166";
    ctx.shadowBlur = isAscendant ? 17 : 14;
  } else if (style === "crystal") {
    ctx.save(); ctx.shadowColor = "#67e8f9"; ctx.shadowBlur = 10;
  } else if (style === "dark") {
    ctx.save(); ctx.shadowColor = "#9900ff"; ctx.shadowBlur = 12;
  } else if (style === "frost") {
    ctx.save(); ctx.shadowColor = "#99ddff"; ctx.shadowBlur = 9;
  } else if (style === "fire") {
    ctx.save(); ctx.shadowColor = "#ff6600"; ctx.shadowBlur = 12;
  } else if (style === "runic") {
    ctx.save(); ctx.shadowColor = "#ffdd44"; ctx.shadowBlur = 8;
  } else if (style === "spectral") {
    ctx.save(); ctx.shadowColor = "#88aaff"; ctx.shadowBlur = 10; ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.78;
  }

  const ks = eqS / 3;

  if (isSciFiWorld()) {
    if (weaponKind === "staff") {
      ctx.strokeStyle = ornateWeapon ? accent : "#9edfff";
      ctx.lineWidth = 5 * Math.min(ks, 1.2);
      ctx.beginPath();
      ctx.moveTo(lHandX - dirX * (8 * ks), lHandY - (8 + dirY * 8) * ks);
      ctx.lineTo(rHandX + dirX * (14 * ks), rHandY + (6 + dirY * 14) * ks);
      ctx.stroke();
      ctx.fillStyle = ornateWeapon ? accent : "#67f0ff";
      ctx.fillRect(Math.round(rHandX + dirX * (10 * ks)), Math.round(rHandY + dirY * (10 * ks) - 2), 18 * ks, 5 * ks);
      ctx.fillStyle = "#effcff";
      ctx.fillRect(Math.round(rHandX + dirX * (22 * ks)), Math.round(rHandY + dirY * (22 * ks) - 4), 6 * ks, 9 * ks);
      ctx.fillStyle = accent;
      ctx.fillRect(Math.round(rHandX + dirX * (28 * ks)), Math.round(rHandY + dirY * (28 * ks) - 3), 3 * ks, 7 * ks);
      if (isLegendary || isAscendant) {
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    if (weaponKind === "sword") {
      ctx.strokeStyle = ornateWeapon ? accent : "#67f0ff";
      ctx.lineWidth = style === "heavy" ? 8 : 6 * Math.min(ks, 1.25);
      ctx.beginPath();
      ctx.moveTo(rHandX, rHandY);
      ctx.lineTo(rHandX + dirX * (30 * ks), rHandY + dirY * (30 * ks));
      ctx.stroke();
      ctx.strokeStyle = "#eafcff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rHandX - sideX * (4 * ks), rHandY - sideY * (4 * ks));
      ctx.lineTo(rHandX + sideX * (4 * ks), rHandY + sideY * (4 * ks));
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(lHandX - 2 * ks, lHandY - 10 * ks, 4 * ks, 16 * ks);
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.fillRect(rHandX + dirX * (12 * ks), rHandY + dirY * (12 * ks) - 2, 16 * ks, 4 * ks);
      if (isLegendary || isAscendant) {
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    if (weaponKind === "bow") {
      ctx.strokeStyle = ornateWeapon ? accent : "#a0d8ff";
      ctx.lineWidth = 5 * Math.min(ks, 1.2);
      ctx.beginPath();
      ctx.moveTo(lHandX - dirX * (12 * ks), lHandY - (12 + dirY * 12) * ks);
      ctx.quadraticCurveTo(
        lHandX + sideX * (9 * ks),
        lHandY + sideY * (9 * ks),
        lHandX + dirX * (12 * ks),
        lHandY + (6 + dirY * 12) * ks
      );
      ctx.stroke();
      ctx.fillStyle = "#dffaff";
      ctx.fillRect(Math.round(rHandX + dirX * (10 * ks)), Math.round(rHandY + dirY * (10 * ks) - 2), 18 * ks, 5 * ks);
      ctx.fillStyle = accent;
      ctx.fillRect(Math.round(rHandX + dirX * (22 * ks)), Math.round(rHandY + dirY * (22 * ks) - 3), 5 * ks, 7 * ks);
      ctx.restore();
      return;
    }
  }

  if (weaponKind === "staff") {
    // Straight vertical shaft with body; orb centered on shaft top — whole column sways subtly with gait.
    const s = eqS;
    const groundY = y + 7 * s + 6;
    const gait = moving ? walkSin : 0;
    /** Staff held in right hand — same silhouette as before; horizontal anchor follows hand, not torso center. */
    const cx = rHandX + (moving ? gait * s * 0.45 : 0);
    const shaftTipY = y - 13 * s - 14;
    const shaftW = style === "heavy" ? Math.max(6, Math.round(s + 2)) : Math.round(s + 1.8);
    const orn = ornateWeapon ? (isAscendant ? "#67e8f9" : "#c79cff") : "#ff7a45";
    const orbR = (style === "heavy" ? 8 : 7) * Math.min(ks, 1.2);
    const orbCy = shaftTipY - orbR;
    const shaftTopJoin = orbCy + orbR - 1;

    const face = Number.isFinite(entity.facing) ? entity.facing : Math.atan2(dirY, dirX);

    ctx.strokeStyle = ornateWeapon ? accent : "#6b4428";
    ctx.lineWidth = shaftW;
    ctx.beginPath();
    ctx.moveTo(cx, groundY);
    ctx.lineTo(cx, shaftTopJoin);
    ctx.stroke();

    ctx.fillStyle = orn;
    ctx.beginPath();
    ctx.arc(cx, orbCy, orbR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isAscendant ? "#fde68a" : "#ffd166";
    ctx.fillRect(Math.round(cx) - 3, Math.round(orbCy) - 4, 6, 6);

    const gripBlend = ornateWeapon ? blend(accent, "#2a1810", 0.52) : "#4a3424";
    ctx.strokeStyle = gripBlend;
    ctx.lineWidth = Math.max(3, shaftW - 3);
    ctx.beginPath();
    ctx.moveTo(cx, groundY + (shaftTipY - groundY) * 0.43);
    ctx.lineTo(cx, groundY + (shaftTipY - groundY) * 0.62);
    ctx.stroke();

    ctx.fillStyle = "rgba(34,24,16,0.32)";
    ctx.beginPath();
    ctx.ellipse(cx + dirX * 0.4, groundY + 3, 6, 2.4, face, 0, Math.PI * 2);
    ctx.fill();
  } else if (weaponKind === "sword") {
    if (style === "curved") {
      // Scimitar — curved arc blade
      ctx.strokeStyle = ornateWeapon ? accent : "#e0c890";
      ctx.lineWidth = 5 * Math.min(ks, 1.25);
      ctx.beginPath();
      ctx.moveTo(rHandX, rHandY);
      ctx.quadraticCurveTo(
        rHandX + dirX * (20 * ks) + sideX * (12 * ks),
        rHandY + dirY * (20 * ks) + sideY * (12 * ks),
        rHandX + dirX * (30 * ks) + sideX * (4 * ks),
        rHandY + dirY * (30 * ks) + sideY * (4 * ks)
      );
      ctx.stroke();
      ctx.strokeStyle = "#7b532f";
      ctx.lineWidth = 4 * Math.min(ks, 1.2);
      ctx.beginPath();
      ctx.moveTo(rHandX - sideX * (5 * ks), rHandY - sideY * (5 * ks));
      ctx.lineTo(rHandX + sideX * (5 * ks), rHandY + sideY * (5 * ks));
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(lHandX - 2 * ks, lHandY - 12 * ks, 4 * ks, 18 * ks);
    } else if (style === "dagger") {
      // Short wide blade
      ctx.strokeStyle = ornateWeapon ? accent : "#c8d8e8";
      ctx.lineWidth = 7 * Math.min(ks, 1.25);
      ctx.beginPath();
      ctx.moveTo(rHandX, rHandY);
      ctx.lineTo(rHandX + dirX * (16 * ks) + sideX * (4 * ks), rHandY + dirY * (16 * ks) + sideY * (4 * ks));
      ctx.stroke();
      ctx.strokeStyle = "#7b532f";
      ctx.lineWidth = 4 * Math.min(ks, 1.2);
      ctx.beginPath();
      ctx.moveTo(rHandX - sideX * (7 * ks), rHandY - sideY * (7 * ks));
      ctx.lineTo(rHandX + sideX * (7 * ks), rHandY + sideY * (7 * ks));
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(lHandX - 2 * ks, lHandY - 10 * ks, 4 * ks, 16 * ks);
    } else if (style === "spear") {
      // Long thin spear / glaive
      ctx.strokeStyle = ornateWeapon ? accent : "#c8bca0";
      ctx.lineWidth = 3 * Math.min(ks, 1.1);
      ctx.beginPath();
      ctx.moveTo(rHandX, rHandY);
      ctx.lineTo(rHandX + dirX * (40 * ks) + sideX * (3 * ks), rHandY + dirY * (40 * ks) + sideY * (3 * ks));
      ctx.stroke();
      ctx.strokeStyle = ornateWeapon ? accent : "#edf3f7";
      ctx.lineWidth = 5 * Math.min(ks, 1.2);
      ctx.beginPath();
      ctx.moveTo(rHandX + dirX * (30 * ks), rHandY + dirY * (30 * ks));
      ctx.lineTo(rHandX + dirX * (42 * ks) + sideX * (3 * ks), rHandY + dirY * (42 * ks) + sideY * (3 * ks));
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(lHandX - 2 * ks, lHandY - 14 * ks, 4 * ks, 18 * ks);
    } else if (style === "mace") {
      // Short handle + large round head
      ctx.strokeStyle = "#7b532f";
      ctx.lineWidth = 4 * Math.min(ks, 1.2);
      ctx.beginPath();
      ctx.moveTo(rHandX, rHandY);
      ctx.lineTo(rHandX + dirX * (18 * ks), rHandY + dirY * (18 * ks));
      ctx.stroke();
      ctx.fillStyle = ornateWeapon ? accent : "#8899aa";
      ctx.beginPath();
      ctx.arc(
        rHandX + dirX * (24 * ks),
        rHandY + dirY * (24 * ks),
        7 * Math.min(ks, 1.2),
        0, Math.PI * 2
      );
      ctx.fill();
      ctx.strokeStyle = blend(ornateWeapon ? accent : "#8899aa", "#ffffff", 0.3);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(lHandX - 2 * ks, lHandY - 12 * ks, 4 * ks, 18 * ks);
    } else {
      // classic / heavy / ornate / crystal / dark / runic / spectral + default
      const swordTipX = rHandX + dirX * (28 * ks) + sideX * (6 * ks);
      const swordTipY = rHandY - 10 * ks + dirY * (28 * ks) + sideY * (6 * ks);
      ctx.strokeStyle = ornateWeapon ? accent : "#edf3f7";
      ctx.lineWidth = style === "heavy" ? 7 : 5 * Math.min(ks, 1.25);
      ctx.beginPath();
      ctx.moveTo(rHandX, rHandY);
      ctx.lineTo(swordTipX, swordTipY);
      ctx.stroke();
      ctx.strokeStyle = "#7b532f";
      ctx.lineWidth = 4 * Math.min(ks, 1.2);
      ctx.beginPath();
      ctx.moveTo(rHandX - sideX * (6 * ks), rHandY - sideY * (6 * ks));
      ctx.lineTo(rHandX + sideX * (6 * ks), rHandY + sideY * (6 * ks));
      ctx.stroke();
      ctx.fillStyle = style === "heavy" ? "#2f3744" : "#3f4b5e";
      ctx.beginPath();
      ctx.ellipse(lHandX, lHandY - 4 * ks, 10 * ks, 14 * ks, entity.facing || 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d4dae2";
      ctx.lineWidth = Math.max(2, 2 * ks);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(lHandX - 2 * ks, lHandY - 14 * ks, 4 * ks, 20 * ks);
      if (ornateWeapon) {
        ctx.fillRect(lHandX - 7 * ks, lHandY - 6 * ks, 14 * ks, 4 * ks);
      }
    }
  } else {
    ctx.strokeStyle = ornateWeapon ? accent : "#8b5a34";
    ctx.lineWidth = style === "heavy" ? 7 : 5 * Math.min(ks, 1.25);
    ctx.beginPath();
    ctx.moveTo(lHandX - dirX * (12 * ks), lHandY - (12 + dirY * 12) * ks);
    ctx.quadraticCurveTo(
      lHandX + sideX * (8 * ks),
      lHandY + sideY * (8 * ks),
      lHandX + dirX * (12 * ks),
      lHandY + (6 + dirY * 12) * ks
    );
    ctx.stroke();
    ctx.strokeStyle = style === "heavy" ? "#d7e4ef" : "#f4ead3";
    ctx.lineWidth = Math.max(2, 2 * ks);
    ctx.beginPath();
    ctx.moveTo(lHandX - dirX * (12 * ks), lHandY - (12 + dirY * 12) * ks);
    ctx.lineTo(lHandX + dirX * (12 * ks), lHandY + (6 + dirY * 12) * ks);
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.lineWidth = style === "heavy" ? 4 * ks : Math.max(2, 3 * ks);
    ctx.beginPath();
    ctx.moveTo(rHandX, rHandY);
    ctx.lineTo(rHandX + dirX * (16 * ks), rHandY + (-14 + dirY * 16) * ks);
    ctx.stroke();
  }

  const hasGlowSave = isLegendary || isAscendant ||
    style === "crystal" || style === "dark" || style === "frost" ||
    style === "fire" || style === "runic" || style === "spectral";
  if (hasGlowSave) {
    ctx.restore();
  }

  ctx.restore();
}

function drawMob(entity, x, y) {
  const faction = entity.faction;
  if (entity.isShipPirate)     return drawMobShipPirate(entity, x, y);
  if (entity.megaBoss)         return drawMobMegaBoss(entity, x, y);
  if (faction === "dragon" || entity.isDragon) return drawMobDragon(entity, x, y);
  if (faction === "undead")    return drawMobUndead(entity, x, y);
  if (faction === "demon")     return drawMobDemon(entity, x, y);
  if (faction === "golem")     return drawMobGolem(entity, x, y);
  if (faction === "bandit")    return drawMobBandit(entity, x, y);
  drawMobSludge(entity, x, y);
}

function drawMobShipPirate(entity, x, y) {
  const hullClass = typeof entity.hullClass === "string" ? entity.hullClass : "fighter";
  const color = entity.primary || "#ff6b8a";
  const { w, h } = shipHullDimensions(hullClass);
  const facing = Number.isFinite(entity.facing) ? entity.facing : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);
  drawEllipseShadow(-w / 2 - 4, h * 0.36, w + 8, 8, 0.28);
  drawShipHullShape(hullClass, -w / 2, -h / 2, w, h, color);
  ctx.restore();
  // Hostile name label below the hull
  ctx.save();
  ctx.font = "bold 10px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(4,8,16,0.9)";
  ctx.fillStyle = "#ff8aa6";
  const label = `Lv ${entity.level || 1} ${entity.name || "Pirate"}`;
  ctx.strokeText(label, x, y - h / 2 - 6);
  ctx.fillText(label, x, y - h / 2 - 6);
  ctx.restore();
  // HP bar
  const hpPct = Math.max(0, Math.min(1, (entity.hp || 0) / Math.max(1, entity.maxHp || 1)));
  if (hpPct < 1) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x - 22, y + h / 2 + 4, 44, 4);
    ctx.fillStyle = "#ff5d6e";
    ctx.fillRect(x - 21, y + h / 2 + 5, 42 * hpPct, 2);
  }
}

function _mobLabel(entity, x, nameY, labelColor, fontSize) {
  ctx.font = `${fontSize}px ui-sans-serif, system-ui`;
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(8,12,18,0.85)";
  ctx.fillStyle = labelColor;
  const label = Number.isFinite(entity.level) ? `Lv ${entity.level} ${entity.name}` : entity.name;
  ctx.strokeText(label, x, nameY);
  ctx.fillText(label, x, nameY);
}

// ── Sludge / nature creatures (green blobs) ────────────────────────────────
function drawMobSludge(entity, x, y) {
  const phase   = entity.walkPhase || 0;
  const primary = entity.primary || "#4f9f5f";
  const accent  = entity.accent  || "#d8f0a0";
  const isBoss  = Boolean(entity.isBoss);
  const isCritter = Boolean(entity.isCritter);
  const sc      = isBoss ? 2.0 : isCritter ? 0.65 : 1.0;
  const bW = Math.round(22 * sc), bH = Math.round(9 * sc);
  const hW = Math.round(18 * sc), hH = Math.round(11 * sc);
  const legW = Math.round(6 * sc), legH = Math.round(4 * sc);
  const bounce = Math.round(Math.sin(phase * 3) * (isCritter ? 1.5 : 1));
  const nameY  = y - (isBoss ? 42 : isCritter ? 20 : 28);
  const barW   = isBoss ? 48 : isCritter ? 22 : 30;
  const barY   = y - (isBoss ? 35 : isCritter ? 14 : 22);
  drawEllipseShadow(x - bW / 2, y + 8, bW, Math.round(isBoss ? 9 : isCritter ? 3 : 5), isCritter ? 0.18 : 0.28);
  if (!isCritter) {
    ctx.fillStyle = blend(primary, "#000000", 0.38);
    const legY = Math.round(y + bH / 2 + bounce);
    ctx.fillRect(x - legW - 1, legY, legW, legH);
    ctx.fillRect(x + 1, legY, legW, legH);
  }
  ctx.fillStyle = blend(primary, "#000000", 0.22);
  ctx.fillRect(x - bW / 2, Math.round(y - bH / 2 + bounce), bW, bH);
  ctx.fillStyle = primary;
  ctx.fillRect(x - bW / 2, Math.round(y - bH / 2 + bounce), bW, bH - 2);
  const headY = Math.round(y - bH / 2 - hH + bounce);
  ctx.fillStyle = primary;
  ctx.fillRect(x - hW / 2, headY, hW, hH);
  ctx.fillStyle = blend(primary, "#ffffff", 0.18);
  ctx.fillRect(x - hW / 2, headY, hW, 3);
  ctx.fillStyle = accent;
  if (isCritter) {
    const eW = Math.round(hW * 0.22), eH = Math.round(hH * 0.5);
    ctx.fillRect(x - Math.round(hW * 0.38), headY - eH + 2, eW, eH);
    ctx.fillRect(x + Math.round(hW * 0.16), headY - eH + 2, eW, eH);
  } else {
    const eyeSz = Math.max(2, Math.round(3 * sc)), eyeY = headY + Math.round(hH * 0.38);
    ctx.fillRect(x - Math.round(hW * 0.3), eyeY, eyeSz, eyeSz);
    ctx.fillRect(x + Math.round(hW * 0.08), eyeY, eyeSz, eyeSz);
  }
  if (isBoss) {
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(x - 14, headY - 8, 6, 8); ctx.fillRect(x - 3, headY - 12, 6, 12); ctx.fillRect(x + 8, headY - 8, 6, 8);
  }
  _mobLabel(entity, x, nameY, isBoss ? "#ffd166" : isCritter ? "#d8eec8" : "#ffc0a0", isBoss ? 13 : isCritter ? 10 : 11);
  drawHealthBar(x - barW / 2, barY, barW, isCritter ? 3 : 4, entity.hp, entity.maxHp);
}

// ── Bandits (armoured humans) ──────────────────────────────────────────────
function drawMobBandit(entity, x, y) {
  const phase   = entity.walkPhase || 0;
  const primary = entity.primary || "#4a3f5e";
  const accent  = entity.accent  || "#c0b8e0";
  const isBoss  = Boolean(entity.isBoss);
  const sc      = isBoss ? 2.0 : 1.0;
  const bounce  = Math.round(Math.sin(phase * 2.8) * 1);
  // Proportions — taller/thinner than sludge
  const bW = Math.round(16 * sc), bH = Math.round(14 * sc);
  const hW = Math.round(13 * sc), hH = Math.round(10 * sc);
  const legW = Math.round(5 * sc), legH = Math.round(6 * sc);
  const nameY = y - (isBoss ? 50 : 34), barW = isBoss ? 48 : 30, barY = y - (isBoss ? 43 : 28);
  drawEllipseShadow(x - bW / 2, y + 9, bW + 4, isBoss ? 9 : 5, 0.28);
  // Boots
  ctx.fillStyle = blend(primary, "#000000", 0.55);
  const legY = Math.round(y + bH / 2 + bounce);
  ctx.fillRect(x - legW - 1, legY, legW, legH); ctx.fillRect(x + 2, legY, legW, legH);
  // Tabard / body armour
  ctx.fillStyle = blend(primary, "#000000", 0.3);
  ctx.fillRect(x - bW / 2, Math.round(y - bH / 2 + bounce), bW, bH);
  ctx.fillStyle = primary;
  ctx.fillRect(x - bW / 2 + 1, Math.round(y - bH / 2 + bounce), bW - 2, bH - 3);
  // Belt stripe
  ctx.fillStyle = blend(accent, "#000000", 0.3);
  ctx.fillRect(x - bW / 2, Math.round(y + bounce), bW, 2);
  // Weapon arm (sword hilt sticking up on right)
  ctx.fillStyle = blend(accent, "#000000", 0.1);
  ctx.fillRect(x + Math.round(bW / 2) + 1, Math.round(y - bH / 4 + bounce), 3, Math.round(bH * 0.7));
  ctx.fillStyle = accent;
  ctx.fillRect(x + Math.round(bW / 2) + 0, Math.round(y - bH / 2 + bounce - 4), 5, 3);
  // Head / helmet
  const headY = Math.round(y - bH / 2 - hH + bounce);
  ctx.fillStyle = blend(primary, "#000000", 0.4);
  ctx.fillRect(x - hW / 2, headY, hW, hH);
  ctx.fillStyle = blend(primary, "#ffffff", 0.12);
  ctx.fillRect(x - hW / 2, headY, hW, 3);
  // Visor slit (dark band across helmet)
  ctx.fillStyle = blend(primary, "#000000", 0.7);
  ctx.fillRect(x - hW / 2 + 2, headY + Math.round(hH * 0.35), hW - 4, 3);
  // Eyes glinting through visor
  ctx.fillStyle = accent;
  const eyeY = headY + Math.round(hH * 0.38);
  ctx.fillRect(x - Math.round(hW * 0.28), eyeY, 2, 2);
  ctx.fillRect(x + Math.round(hW * 0.1), eyeY, 2, 2);
  if (isBoss) {
    ctx.fillStyle = "#e8c060";
    ctx.fillRect(x - 14, headY - 10, 5, 10); ctx.fillRect(x - 3, headY - 14, 6, 14); ctx.fillRect(x + 9, headY - 10, 5, 10);
  }
  _mobLabel(entity, x, nameY, isBoss ? "#e8c060" : "#d8c8ff", isBoss ? 13 : 11);
  drawHealthBar(x - barW / 2, barY, barW, 4, entity.hp, entity.maxHp);
}

// ── Dragons ────────────────────────────────────────────────────────────────
function drawMobDragon(entity, x, y) {
  const phase   = entity.walkPhase || 0;
  const primary = entity.primary || "#8b1a1a";
  const accent  = entity.accent  || "#ffd700";
  const isBoss  = Boolean(entity.isBoss);
  const sc      = isBoss ? 2.2 : 1.45;
  const bW = Math.round(22 * sc), bH = Math.round(9 * sc);
  const hW = Math.round(18 * sc), hH = Math.round(11 * sc);
  const legW = Math.round(6 * sc), legH = Math.round(4 * sc);
  const bounce = Math.round(Math.sin(phase * 3) * 1);
  const nameY = y - (isBoss ? 52 : 38), barW = isBoss ? 56 : 40, barY = y - (isBoss ? 44 : 30);
  drawEllipseShadow(x - bW * 0.8, y + 8, bW * 1.6, isBoss ? 11 : 7, 0.3);
  // Wings behind body
  const wingW = Math.round(bW * 1.1), wingH = Math.round(bH * 1.6);
  const wingY = Math.round(y - bH / 2 + bounce) - 3;
  ctx.fillStyle = blend(primary, "#000000", 0.5);
  ctx.fillRect(x - bW / 2 - wingW, wingY, wingW, wingH);
  ctx.fillRect(x + bW / 2, wingY, wingW, wingH);
  ctx.fillStyle = blend(primary, "#000000", 0.32);
  ctx.fillRect(x - bW / 2 - wingW + 2, wingY + 2, wingW - 4, wingH - 4);
  ctx.fillRect(x + bW / 2 + 2, wingY + 2, wingW - 4, wingH - 4);
  // Wing membrane veins
  ctx.fillStyle = blend(primary, "#000000", 0.65);
  ctx.fillRect(x - bW / 2 - wingW + 3, wingY + 3, 2, wingH - 8);
  ctx.fillRect(x + bW / 2 + wingW - 5, wingY + 3, 2, wingH - 8);
  // Legs
  const legY = Math.round(y + bH / 2 + bounce);
  ctx.fillStyle = blend(primary, "#000000", 0.38);
  ctx.fillRect(x - legW - 1, legY, legW, legH); ctx.fillRect(x + 1, legY, legW, legH);
  // Body
  ctx.fillStyle = blend(primary, "#000000", 0.22);
  ctx.fillRect(x - bW / 2, Math.round(y - bH / 2 + bounce), bW, bH);
  ctx.fillStyle = primary;
  ctx.fillRect(x - bW / 2, Math.round(y - bH / 2 + bounce), bW, bH - 2);
  // Belly scales (lighter stripe)
  ctx.fillStyle = blend(primary, "#ffffff", 0.15);
  ctx.fillRect(x - Math.round(bW * 0.22), Math.round(y - bH / 2 + bounce) + 1, Math.round(bW * 0.44), bH - 4);
  // Head
  const headY = Math.round(y - bH / 2 - hH + bounce);
  ctx.fillStyle = primary;
  ctx.fillRect(x - hW / 2, headY, hW, hH);
  ctx.fillStyle = blend(primary, "#ffffff", 0.1);
  ctx.fillRect(x - hW / 2, headY, hW, 3);
  // Snout extension
  ctx.fillStyle = blend(primary, "#000000", 0.15);
  ctx.fillRect(x + Math.round(hW * 0.3), headY + Math.round(hH * 0.3), Math.round(hW * 0.35), Math.round(hH * 0.5));
  // Glowing eyes
  ctx.fillStyle = accent;
  const eyeY = headY + Math.round(hH * 0.35);
  ctx.fillRect(x - Math.round(hW * 0.32), eyeY, Math.max(2, Math.round(3 * sc)), Math.max(2, Math.round(3 * sc)));
  ctx.fillRect(x + Math.round(hW * 0.06), eyeY, Math.max(2, Math.round(3 * sc)), Math.max(2, Math.round(3 * sc)));
  // Horns
  ctx.fillStyle = accent;
  ctx.fillRect(x - Math.round(hW * 0.38), headY - Math.round(8 * sc / 1.45), Math.round(3 * sc / 1.45), Math.round(8 * sc / 1.45));
  ctx.fillRect(x + Math.round(hW * 0.25), headY - Math.round(8 * sc / 1.45), Math.round(3 * sc / 1.45), Math.round(8 * sc / 1.45));
  if (isBoss) {
    ctx.fillStyle = accent;
    ctx.fillRect(x - 16, headY - 14, 6, 14); ctx.fillRect(x - 3, headY - 20, 6, 20); ctx.fillRect(x + 10, headY - 14, 6, 14);
  }
  _mobLabel(entity, x, nameY, isBoss ? "#ff9900" : "#ffd700", isBoss ? 14 : 12);
  drawHealthBar(x - barW / 2, barY, barW, 4, entity.hp, entity.maxHp);
}

// ── Undead (skeletons / wights) ────────────────────────────────────────────
function drawMobUndead(entity, x, y) {
  const phase   = entity.walkPhase || 0;
  const primary = entity.primary || "#c8c8b4";
  const accent  = entity.accent  || "#8b2fb8";
  const isBoss  = Boolean(entity.isBoss);
  const sc      = isBoss ? 2.0 : 1.0;
  // Floaty hover instead of bounce
  const hover   = Math.round(Math.sin(phase * 2.2) * 2);
  const nameY   = y - (isBoss ? 52 : 36), barW = isBoss ? 48 : 30, barY = y - (isBoss ? 44 : 29);
  // Thin leg bones
  const legW = Math.round(2 * sc), legH = Math.round(7 * sc);
  ctx.fillStyle = blend(primary, "#000000", 0.25);
  const legY = Math.round(y + 2 + hover);
  ctx.fillRect(x - Math.round(5 * sc), legY, legW, legH);
  ctx.fillRect(x + Math.round(3 * sc), legY, legW, legH);
  // Foot bones
  ctx.fillRect(x - Math.round(7 * sc), legY + legH, Math.round(5 * sc), Math.round(2 * sc));
  ctx.fillRect(x + Math.round(2 * sc), legY + legH, Math.round(5 * sc), Math.round(2 * sc));
  // Ribcage body — narrow with ribs
  const bW = Math.round(12 * sc), bH = Math.round(14 * sc);
  const bodyY = Math.round(y - bH / 2 + hover);
  ctx.fillStyle = blend(primary, "#000000", 0.2);
  ctx.fillRect(x - bW / 2, bodyY, bW, bH);
  ctx.fillStyle = primary;
  ctx.fillRect(x - bW / 2, bodyY, bW, bH - 2);
  // Rib lines
  ctx.fillStyle = blend(primary, "#000000", 0.45);
  for (let r = 0; r < 4; r++) {
    const ry = bodyY + Math.round(2 + r * (bH - 4) / 4);
    ctx.fillRect(x - bW / 2 + 1, ry, bW - 2, 1);
  }
  // Arm bones
  ctx.fillStyle = primary;
  ctx.fillRect(x - bW / 2 - Math.round(5 * sc), bodyY + Math.round(2 * sc), Math.round(4 * sc), Math.round(10 * sc));
  ctx.fillRect(x + bW / 2 + Math.round(1 * sc), bodyY + Math.round(2 * sc), Math.round(4 * sc), Math.round(10 * sc));
  // Skull head — wider than body, hollow eyes
  const hW = Math.round(16 * sc), hH = Math.round(12 * sc);
  const headY = Math.round(y - bH / 2 - hH + hover);
  ctx.fillStyle = primary;
  ctx.fillRect(x - hW / 2, headY, hW, hH);
  ctx.fillStyle = blend(primary, "#ffffff", 0.2);
  ctx.fillRect(x - hW / 2, headY, hW, 2);
  // Hollow eye sockets (dark)
  ctx.fillStyle = blend(accent, "#000000", 0.3);
  const eyeW = Math.round(4 * sc), eyeH = Math.round(4 * sc);
  const eyeY = headY + Math.round(hH * 0.28);
  ctx.fillRect(x - Math.round(hW * 0.38), eyeY, eyeW, eyeH);
  ctx.fillRect(x + Math.round(hW * 0.12), eyeY, eyeW, eyeH);
  // Glowing pupils in sockets
  ctx.fillStyle = accent;
  ctx.fillRect(x - Math.round(hW * 0.32), eyeY + 1, Math.round(eyeW * 0.5), Math.round(eyeH * 0.5));
  ctx.fillRect(x + Math.round(hW * 0.18), eyeY + 1, Math.round(eyeW * 0.5), Math.round(eyeH * 0.5));
  // Jaw / teeth marks
  ctx.fillStyle = blend(primary, "#000000", 0.4);
  ctx.fillRect(x - Math.round(hW * 0.3), headY + hH - 3, Math.round(hW * 0.6), 3);
  if (isBoss) {
    // Lich crown
    ctx.fillStyle = accent;
    ctx.fillRect(x - 14, headY - 10, 5, 10); ctx.fillRect(x - 3, headY - 14, 6, 14); ctx.fillRect(x + 9, headY - 10, 5, 10);
    // Glow aura hint
    ctx.fillStyle = blend(accent, "#000000", 0.6);
    ctx.fillRect(x - hW / 2 - 2, headY - 2, hW + 4, hH + 4);
    ctx.fillStyle = primary;
    ctx.fillRect(x - hW / 2, headY, hW, hH);
  }
  drawEllipseShadow(x - Math.round(bW * 0.7), y + 8, Math.round(bW * 1.4), isBoss ? 8 : 4, 0.2);
  _mobLabel(entity, x, nameY, isBoss ? "#c060ff" : "#d0a8ff", isBoss ? 13 : 11);
  drawHealthBar(x - barW / 2, barY, barW, 4, entity.hp, entity.maxHp);
}

// ── Demons ─────────────────────────────────────────────────────────────────
function drawMobDemon(entity, x, y) {
  const phase   = entity.walkPhase || 0;
  const primary = entity.primary || "#1a0a2e";
  const accent  = entity.accent  || "#ff5500";
  const isBoss  = Boolean(entity.isBoss);
  const sc      = isBoss ? 2.0 : 1.0;
  const bounce  = Math.round(Math.sin(phase * 2.6) * 1);
  // Wide shoulders — trapezoidal body
  const bWTop = Math.round(28 * sc), bWBot = Math.round(16 * sc), bH = Math.round(14 * sc);
  const hW = Math.round(14 * sc), hH = Math.round(10 * sc);
  const nameY = y - (isBoss ? 52 : 38), barW = isBoss ? 48 : 34, barY = y - (isBoss ? 44 : 30);
  drawEllipseShadow(x - bWBot / 2, y + 8, bWTop, isBoss ? 10 : 6, 0.32);
  // Tail
  ctx.fillStyle = blend(primary, "#ffffff", 0.1);
  ctx.fillRect(x + Math.round(bWBot / 2) - 1, Math.round(y + bounce) + 2, Math.round(4 * sc), Math.round(5 * sc));
  ctx.fillRect(x + Math.round(bWBot / 2) + Math.round(2 * sc), Math.round(y + bounce) + 6, Math.round(3 * sc), Math.round(4 * sc));
  // Legs
  ctx.fillStyle = blend(primary, "#000000", 0.25);
  const legY = Math.round(y + bH / 2 + bounce);
  ctx.fillRect(x - Math.round(7 * sc), legY, Math.round(6 * sc), Math.round(5 * sc));
  ctx.fillRect(x + Math.round(1 * sc), legY, Math.round(6 * sc), Math.round(5 * sc));
  // Body (trapezoid via overlapping rects)
  ctx.fillStyle = blend(primary, "#000000", 0.25);
  const bodyY = Math.round(y - bH / 2 + bounce);
  ctx.fillRect(x - bWTop / 2, bodyY, bWTop, Math.round(bH * 0.45));
  ctx.fillRect(x - bWBot / 2, bodyY + Math.round(bH * 0.45), bWBot, Math.round(bH * 0.55));
  ctx.fillStyle = primary;
  ctx.fillRect(x - bWTop / 2, bodyY, bWTop, Math.round(bH * 0.45) - 1);
  ctx.fillRect(x - bWBot / 2, bodyY + Math.round(bH * 0.45), bWBot, Math.round(bH * 0.55) - 2);
  // Glowing chest rune
  ctx.fillStyle = accent;
  ctx.fillRect(x - Math.round(2 * sc), bodyY + Math.round(bH * 0.25), Math.round(4 * sc), Math.round(4 * sc));
  // Claw marks on sides
  ctx.fillStyle = blend(accent, "#000000", 0.3);
  for (let c = 0; c < 3; c++) {
    ctx.fillRect(x - bWTop / 2 - Math.round(3 * sc), bodyY + Math.round(c * 3 * sc), Math.round(3 * sc), Math.round(1.5 * sc));
    ctx.fillRect(x + bWTop / 2, bodyY + Math.round(c * 3 * sc), Math.round(3 * sc), Math.round(1.5 * sc));
  }
  // Head
  const headY = Math.round(y - bH / 2 - hH + bounce);
  ctx.fillStyle = blend(primary, "#ffffff", 0.08);
  ctx.fillRect(x - hW / 2, headY, hW, hH);
  ctx.fillStyle = primary;
  ctx.fillRect(x - hW / 2, headY, hW, hH - 2);
  // Glowing ember eyes
  ctx.fillStyle = accent;
  const eyeY = headY + Math.round(hH * 0.35);
  ctx.fillRect(x - Math.round(hW * 0.35), eyeY, Math.round(4 * sc), Math.round(3 * sc));
  ctx.fillRect(x + Math.round(hW * 0.1), eyeY, Math.round(4 * sc), Math.round(3 * sc));
  // Large curved horns
  const hornH = Math.round(12 * sc);
  ctx.fillStyle = blend(primary, "#ffffff", 0.2);
  ctx.fillRect(x - Math.round(hW * 0.42), headY - hornH, Math.round(4 * sc), hornH);
  ctx.fillRect(x - Math.round(hW * 0.42) - Math.round(3 * sc), headY - hornH, Math.round(3 * sc), Math.round(hornH * 0.5));
  ctx.fillRect(x + Math.round(hW * 0.26), headY - hornH, Math.round(4 * sc), hornH);
  ctx.fillRect(x + Math.round(hW * 0.26) + Math.round(3 * sc), headY - hornH, Math.round(3 * sc), Math.round(hornH * 0.5));
  if (isBoss) {
    ctx.fillStyle = accent;
    ctx.fillRect(x - 18, headY - hornH - 6, 6, 6);
    ctx.fillRect(x + 12, headY - hornH - 6, 6, 6);
  }
  _mobLabel(entity, x, nameY, isBoss ? "#ff2200" : "#ff8844", isBoss ? 13 : 11);
  drawHealthBar(x - barW / 2, barY, barW, 4, entity.hp, entity.maxHp);
}

// ── Golems (stone constructs) ──────────────────────────────────────────────
function drawMobGolem(entity, x, y) {
  const phase   = entity.walkPhase || 0;
  const primary = entity.primary || "#5a5a6e";
  const accent  = entity.accent  || "#00ffcc";
  const isBoss  = Boolean(entity.isBoss);
  const sc      = isBoss ? 2.0 : 1.0;
  // Golems have almost no movement — heavy thud
  const stomp   = Math.abs(Math.sin(phase * 1.5)) > 0.85 ? Math.round(2 * sc) : 0;
  const nameY   = y - (isBoss ? 54 : 38), barW = isBoss ? 52 : 36, barY = y - (isBoss ? 46 : 30);
  // Very thick chunky legs
  const legW = Math.round(8 * sc), legH = Math.round(6 * sc);
  ctx.fillStyle = blend(primary, "#000000", 0.45);
  const legY = Math.round(y + 5 + stomp);
  ctx.fillRect(x - legW - 1, legY, legW, legH); ctx.fillRect(x + 2, legY, legW, legH);
  drawEllipseShadow(x - Math.round(20 * sc), y + 10, Math.round(40 * sc), isBoss ? 11 : 7, 0.35);
  // Square body — taller than wide
  const bW = Math.round(24 * sc), bH = Math.round(18 * sc);
  const bodyY = Math.round(y - bH / 2 + stomp);
  ctx.fillStyle = blend(primary, "#000000", 0.35);
  ctx.fillRect(x - bW / 2, bodyY, bW, bH);
  ctx.fillStyle = primary;
  ctx.fillRect(x - bW / 2, bodyY, bW, bH - 2);
  // Stone crack lines on body
  ctx.fillStyle = blend(primary, "#000000", 0.5);
  ctx.fillRect(x - Math.round(3 * sc), bodyY + 2, 1, Math.round(bH * 0.6));
  ctx.fillRect(x - Math.round(7 * sc), bodyY + Math.round(bH * 0.3), Math.round(8 * sc), 1);
  ctx.fillRect(x + Math.round(2 * sc), bodyY + Math.round(bH * 0.55), Math.round(6 * sc), 1);
  // Glowing core gem
  const gemW = Math.round(6 * sc), gemH = Math.round(6 * sc);
  ctx.fillStyle = blend(accent, "#000000", 0.2);
  ctx.fillRect(x - gemW / 2 - 1, bodyY + Math.round(bH * 0.38) - 1, gemW + 2, gemH + 2);
  ctx.fillStyle = accent;
  ctx.fillRect(x - gemW / 2, bodyY + Math.round(bH * 0.38), gemW, gemH);
  ctx.fillStyle = blend(accent, "#ffffff", 0.5);
  ctx.fillRect(x - gemW / 2 + 1, bodyY + Math.round(bH * 0.38) + 1, Math.round(gemW * 0.4), Math.round(gemH * 0.4));
  // Blocky arms
  const armW = Math.round(6 * sc), armH = Math.round(14 * sc);
  ctx.fillStyle = blend(primary, "#000000", 0.3);
  ctx.fillRect(x - bW / 2 - armW, bodyY + Math.round(2 * sc), armW, armH);
  ctx.fillRect(x + bW / 2, bodyY + Math.round(2 * sc), armW, armH);
  ctx.fillStyle = blend(primary, "#ffffff", 0.06);
  ctx.fillRect(x - bW / 2 - armW, bodyY + Math.round(2 * sc), armW, 2);
  ctx.fillRect(x + bW / 2, bodyY + Math.round(2 * sc), armW, 2);
  // Square head (sits directly on body — no neck)
  const hW = Math.round(20 * sc), hH = Math.round(12 * sc);
  const headY = Math.round(y - bH / 2 - hH + stomp);
  ctx.fillStyle = blend(primary, "#000000", 0.3);
  ctx.fillRect(x - hW / 2, headY, hW, hH);
  ctx.fillStyle = primary;
  ctx.fillRect(x - hW / 2, headY, hW, hH - 2);
  ctx.fillStyle = blend(primary, "#000000", 0.5);
  ctx.fillRect(x - Math.round(4 * sc), headY + 2, 1, Math.round(hH * 0.5));
  // Glowing eye slits
  ctx.fillStyle = accent;
  ctx.fillRect(x - Math.round(hW * 0.35), headY + Math.round(hH * 0.35), Math.round(6 * sc), Math.round(2 * sc));
  ctx.fillRect(x + Math.round(hW * 0.06), headY + Math.round(hH * 0.35), Math.round(6 * sc), Math.round(2 * sc));
  if (isBoss) {
    ctx.fillStyle = accent;
    ctx.fillRect(x - 16, headY - 8, 6, 8); ctx.fillRect(x - 3, headY - 12, 6, 12); ctx.fillRect(x + 10, headY - 8, 6, 8);
  }
  _mobLabel(entity, x, nameY, isBoss ? "#00ffff" : "#a0fff0", isBoss ? 13 : 11);
  drawHealthBar(x - barW / 2, barY, barW, 4, entity.hp, entity.maxHp);
}

// ── Mega Boss (colossus-tier, any faction) ─────────────────────────────────
function drawMobMegaBoss(entity, x, y) {
  const faction = entity.faction;
  const primary = entity.primary || "#5a0808";
  const accent  = entity.accent  || "#ff9900";
  const phase   = entity.walkPhase || 0;
  const stomp   = Math.abs(Math.sin(phase * 1.2)) > 0.8 ? 3 : 0;
  const sc      = 3.2;
  const bW = Math.round(22 * sc), bH = Math.round(14 * sc);
  const hW = Math.round(18 * sc), hH = Math.round(13 * sc);
  const nameY = y - 88, barW = 80, barY = y - 78;
  drawEllipseShadow(x - Math.round(bW * 0.7), y + 10, Math.round(bW * 1.4), 14, 0.4);
  // Dragon mega boss gets wings
  if (faction === "dragon" || entity.isDragon) {
    const wingW = Math.round(bW * 1.3), wingH = Math.round(bH * 1.8);
    const wingY = Math.round(y - bH / 2 + stomp) - 4;
    ctx.fillStyle = blend(primary, "#000000", 0.5);
    ctx.fillRect(x - bW / 2 - wingW, wingY, wingW, wingH);
    ctx.fillRect(x + bW / 2, wingY, wingW, wingH);
    ctx.fillStyle = blend(primary, "#000000", 0.3);
    ctx.fillRect(x - bW / 2 - wingW + 3, wingY + 3, wingW - 6, wingH - 6);
    ctx.fillRect(x + bW / 2 + 3, wingY + 3, wingW - 6, wingH - 6);
  }
  // Golem mega boss gets massive arms
  if (faction === "golem") {
    ctx.fillStyle = blend(primary, "#000000", 0.3);
    ctx.fillRect(x - bW / 2 - 22, Math.round(y - bH / 2 + stomp) + 4, 20, 40);
    ctx.fillRect(x + bW / 2 + 2,  Math.round(y - bH / 2 + stomp) + 4, 20, 40);
    ctx.fillStyle = accent;
    const gemY = Math.round(y - bH / 2 + stomp) + 10;
    ctx.fillRect(x - 7, gemY, 14, 14);
    ctx.fillStyle = blend(accent, "#ffffff", 0.5);
    ctx.fillRect(x - 4, gemY + 2, 6, 5);
  }
  // Demon mega boss gets massive horns
  if (faction === "demon") {
    ctx.fillStyle = blend(primary, "#ffffff", 0.25);
    ctx.fillRect(x - Math.round(hW * 0.46), Math.round(y - bH / 2 + stomp) - hH - 28, 10, 28);
    ctx.fillRect(x - Math.round(hW * 0.46) - 9, Math.round(y - bH / 2 + stomp) - hH - 18, 9, 14);
    ctx.fillRect(x + Math.round(hW * 0.26), Math.round(y - bH / 2 + stomp) - hH - 28, 10, 28);
    ctx.fillRect(x + Math.round(hW * 0.26) + 10, Math.round(y - bH / 2 + stomp) - hH - 18, 9, 14);
  }
  // Legs
  const legW2 = Math.round(10 * sc / 2), legH2 = Math.round(6 * sc / 2);
  ctx.fillStyle = blend(primary, "#000000", 0.42);
  const legY = Math.round(y + bH / 2 + stomp);
  ctx.fillRect(x - legW2 - 2, legY, legW2, legH2); ctx.fillRect(x + 2, legY, legW2, legH2);
  // Body
  ctx.fillStyle = blend(primary, "#000000", 0.25);
  ctx.fillRect(x - bW / 2, Math.round(y - bH / 2 + stomp), bW, bH);
  ctx.fillStyle = primary;
  ctx.fillRect(x - bW / 2, Math.round(y - bH / 2 + stomp), bW, bH - 3);
  // Glowing core / chest mark
  ctx.fillStyle = accent;
  ctx.fillRect(x - 7, Math.round(y - bH / 4 + stomp), 14, 10);
  ctx.fillStyle = blend(accent, "#ffffff", 0.5);
  ctx.fillRect(x - 4, Math.round(y - bH / 4 + stomp) + 2, 7, 5);
  // Head
  const headY = Math.round(y - bH / 2 - hH + stomp);
  ctx.fillStyle = primary;
  ctx.fillRect(x - hW / 2, headY, hW, hH);
  ctx.fillStyle = blend(primary, "#ffffff", 0.12);
  ctx.fillRect(x - hW / 2, headY, hW, 4);
  // Massive glowing eyes
  ctx.fillStyle = accent;
  const eyeY = headY + Math.round(hH * 0.38);
  ctx.fillRect(x - Math.round(hW * 0.32), eyeY, 10, 7);
  ctx.fillRect(x + Math.round(hW * 0.08), eyeY, 10, 7);
  ctx.fillStyle = blend(accent, "#ffffff", 0.6);
  ctx.fillRect(x - Math.round(hW * 0.3), eyeY + 1, 4, 3);
  ctx.fillRect(x + Math.round(hW * 0.1), eyeY + 1, 4, 3);
  // Crown
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(x - 22, headY - 14, 9, 14); ctx.fillRect(x - 5, headY - 20, 10, 20); ctx.fillRect(x + 13, headY - 14, 9, 14);
  ctx.fillStyle = accent;
  ctx.fillRect(x - 18, headY - 17, 5, 5); ctx.fillRect(x, headY - 23, 5, 5); ctx.fillRect(x + 14, headY - 17, 5, 5);
  // [COLOSSUS] label in red above name
  ctx.font = "bold 11px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.strokeStyle = "rgba(8,12,18,0.9)";
  ctx.lineWidth = 3;
  ctx.fillStyle = "#ff2200";
  ctx.strokeText("⚠ COLOSSUS", x, nameY - 14);
  ctx.fillText("⚠ COLOSSUS", x, nameY - 14);
  _mobLabel(entity, x, nameY, "#ffd700", 14);
  drawHealthBar(x - barW / 2, barY, barW, 6, entity.hp, entity.maxHp);
}

function drawCombatFx() {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const now = performance.now();

  for (const fx of state.combatFx) {
    const age = now - fx.createdAt;
    const pct = age / fx.ttl;
    const sx = Math.floor(fx.x * TILE_SIZE - state.camera.x + halfW);
    const sy = Math.floor(fx.y * TILE_SIZE - state.camera.y + halfH);
    const angle = fx.facing || 0;

    if (fx.kind === "projectile") {
      drawProjectileFx(fx, sx, sy, pct, halfW, halfH);
      drawDamageFx(fx, pct, halfW, halfH);
      continue;
    }

    if (fx.heal) {
      drawDamageFx(fx, pct, halfW, halfH);
      continue;
    }

    const reach = 28 + pct * 8;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);
    ctx.globalAlpha = 1 - pct;
    if (fx.weaponStyle === "saber") {
      // Lightsaber swing — bright glowing arc in the weapon's color
      const color = typeof fx.weaponColor === "string" ? fx.weaponColor : "#67f0ff";
      ctx.lineCap = "round";
      // Outer halo
      ctx.strokeStyle = hexToRgba(color, 0.45);
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(16, 0, reach, -0.6, 0.6);
      ctx.stroke();
      // Mid blade glow
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(16, 0, reach, -0.55, 0.55);
      ctx.stroke();
      // Hot core
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(16, 0, reach, -0.5, 0.5);
      ctx.stroke();
      ctx.lineCap = "butt";
    } else {
      ctx.strokeStyle = fx.hit ? "#ffd166" : "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(16, 0, reach, -0.5, 0.5);
      ctx.stroke();
    }
    ctx.restore();

    drawDamageFx(fx, pct, halfW, halfH);
  }
}

function drawProjectileFx(fx, sx, sy, pct, halfW, halfH) {
  const endWorldX = Number.isFinite(fx.endX) ? fx.endX : fx.x + Math.cos(fx.facing || 0) * (fx.range || 6);
  const endWorldY = Number.isFinite(fx.endY) ? fx.endY : fx.y + Math.sin(fx.facing || 0) * (fx.range || 6);
  const endX = endWorldX * TILE_SIZE - state.camera.x + halfW;
  const endY = endWorldY * TILE_SIZE - state.camera.y + halfH;
  const travel = Math.min(1, pct * 1.25);
  const px = sx + (endX - sx) * travel;
  const py = sy + (endY - sy) * travel;
  const angle = Math.atan2(endY - sy, endX - sx);

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);

  if (fx.projectileKind === "ship_missile") {
    ctx.globalAlpha = Math.max(0, 1 - pct * 0.2);
    // Exhaust trail
    const trailLen = 28;
    const trail = ctx.createLinearGradient(-trailLen, 0, 0, 0);
    trail.addColorStop(0, "rgba(255, 123, 58, 0)");
    trail.addColorStop(0.6, "rgba(255, 200, 80, 0.7)");
    trail.addColorStop(1, "rgba(255, 255, 200, 0.9)");
    ctx.strokeStyle = trail;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-trailLen, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();
    // Missile body
    ctx.fillStyle = "#ff7b3a";
    ctx.fillRect(0, -3, 14, 6);
    ctx.fillStyle = "#ffcf6b";
    ctx.fillRect(10, -2, 6, 4);
    // Nose
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(10, -3);
    ctx.lineTo(10, 3);
    ctx.closePath();
    ctx.fill();
    ctx.lineCap = "butt";
  } else if (fx.projectileKind === "laser_bolt") {
    const boltColor = typeof fx.weaponColor === "string" ? fx.weaponColor : "#67f0ff";
    const style = fx.weaponStyle || "";
    // Pulse / plasma → fat short bolt. Ion → thinner with crackle. Rail → long streak.
    const length = style === "rail" ? 26 : style === "ion" ? 20 : 18;
    const thick = style === "plasma" ? 6 : style === "rail" ? 3 : 4;
    ctx.globalAlpha = Math.max(0, 1 - pct * 0.25);
    // Outer halo for the bolt
    const halo = ctx.createLinearGradient(-length, 0, length, 0);
    halo.addColorStop(0, hexToRgba(boltColor, 0));
    halo.addColorStop(0.5, hexToRgba(boltColor, 0.9));
    halo.addColorStop(1, hexToRgba(boltColor, 0));
    ctx.strokeStyle = halo;
    ctx.lineWidth = thick + 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-length, 0);
    ctx.lineTo(length, 0);
    ctx.stroke();
    // Core bolt
    ctx.strokeStyle = boltColor;
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.moveTo(-length + 4, 0);
    ctx.lineTo(length, 0);
    ctx.stroke();
    // Bright tip
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = Math.max(1, thick - 2);
    ctx.beginPath();
    ctx.moveTo(-length + 8, 0);
    ctx.lineTo(length - 2, 0);
    ctx.stroke();
    ctx.fillStyle = hexToRgba(boltColor, 0.9);
    ctx.beginPath();
    ctx.arc(length - 2, 0, thick - 1, 0, Math.PI * 2);
    ctx.fill();
    if (style === "ion") {
      // Crackle sparks along the bolt
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1;
      for (let i = -length + 4; i < length - 4; i += 5) {
        const jitter = (Math.sin(i * 17.3 + performance.now() * 0.04) * 3);
        ctx.beginPath();
        ctx.moveTo(i, jitter);
        ctx.lineTo(i + 3, -jitter);
        ctx.stroke();
      }
    }
    ctx.lineCap = "butt";
  } else if (fx.projectileKind === "fireball") {
    const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 18);
    glow.addColorStop(0, "rgba(255, 209, 102, 0.95)");
    glow.addColorStop(0.45, "rgba(255, 122, 69, 0.72)");
    glow.addColorStop(1, "rgba(255, 69, 44, 0)");
    ctx.globalAlpha = Math.max(0, 1 - pct * 0.35);
    ctx.fillStyle = glow;
    ctx.fillRect(-18, -18, 36, 36);
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff5d2d";
    ctx.fillRect(-13, -3, 10, 6);
  } else {
    ctx.globalAlpha = 1 - Math.max(0, pct - 0.75) * 4;
    ctx.strokeStyle = "#f4ead3";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();
    ctx.fillStyle = "#d7e4ef";
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(6, -4);
    ctx.lineTo(6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#8b5a34";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, -3);
    ctx.lineTo(-17, 0);
    ctx.lineTo(-12, 3);
    ctx.stroke();
  }

  ctx.restore();

  if (fx.hit && pct > 0.72) {
    ctx.globalAlpha = 1 - pct;
    ctx.strokeStyle = fx.projectileKind === "fireball" ? "#ffb347" : "#ffd166";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(endX, endY - 4, fx.projectileKind === "fireball" ? 22 * pct : 12 * pct, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawDamageFx(fx, pct, halfW, halfH) {
  if (!fx.hit || !fx.targetId) {
    return;
  }

  const target = state.mobs.get(fx.targetId) || state.players.get(fx.targetId);
  const tx = Number.isFinite(fx.endX) ? fx.endX * TILE_SIZE - state.camera.x + halfW : target?.renderX * TILE_SIZE - state.camera.x + halfW;
  const ty = Number.isFinite(fx.endY) ? fx.endY * TILE_SIZE - state.camera.y + halfH : target?.renderY * TILE_SIZE - state.camera.y + halfH;
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
    return;
  }

  ctx.globalAlpha = 1 - pct;
  ctx.font = "13px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  if (fx.heal && Number.isFinite(fx.healAmount) && fx.healAmount > 0) {
    ctx.fillStyle = "#86ffb8";
    ctx.fillText(`+${fx.healAmount}`, tx, ty - 22 - pct * 18);
    ctx.globalAlpha = 1;
    return;
  }
  ctx.fillStyle = fx.blocked ? "#b9d7ff" : "#ffdf7a";
  ctx.fillText(fx.blocked ? `blocked -${fx.damage}` : `-${fx.damage}`, tx, ty - 22 - pct * 18);
  ctx.globalAlpha = 1;
}

function drawTalentSpellFx() {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const now = performance.now();

  for (const fx of state.spellFx) {
    const cfg = SPELL_ANIMATION_CONFIG[fx.spellId] || { kind: "burst", color: "#c79cff", accent: "#ffffff", ttl: 900 };
    const age = now - fx.createdAt;
    const pct = Math.max(0, Math.min(1, age / fx.ttl));
    const caster = state.players.get(fx.casterId);
    const worldX = fx.fixedGround
      ? fx.x
      : Number.isFinite(caster?.renderX)
        ? caster.renderX
        : fx.x;
    const worldY = fx.fixedGround
      ? fx.y
      : Number.isFinite(caster?.renderY)
        ? caster.renderY
        : fx.y;
    const sx = worldX * TILE_SIZE - state.camera.x + halfW;
    const sy = worldY * TILE_SIZE - state.camera.y + halfH;
    const angle = Number.isFinite(fx.facing) ? fx.facing : Number.isFinite(caster?.facing) ? caster.facing : 0;

    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - pct * 0.85);
    switch (cfg.kind) {
      case "bolt":
        drawSpellBolt(sx, sy, angle, pct, cfg, 122);
        break;
      case "arrow":
        drawSpellArrow(sx, sy, angle, pct, cfg, [0], 136);
        break;
      case "pierce":
        drawSpellArrow(sx, sy, angle, pct, cfg, [0], 170);
        drawSpellRing(sx + Math.cos(angle) * 88, sy + Math.sin(angle) * 88, 8 + pct * 20, cfg.accent);
        break;
      case "multi_arrow":
        drawSpellArrow(sx, sy, angle, pct, cfg, [-0.22, 0, 0.22], 126);
        break;
      case "volley":
        drawSpellArrow(sx, sy, angle, pct, cfg, [-0.3, -0.1, 0.1, 0.3], 112);
        break;
      case "arrow_rain":
        drawArrowRain(sx, sy, pct, cfg);
        break;
      case "burst":
        drawSpellBurst(sx, sy, pct, cfg);
        break;
      case "cone":
        drawSpellCone(sx, sy, angle, pct, cfg);
        break;
      case "barrier":
        drawSpellBarrier(sx, sy, pct, cfg, fx.spellId === "divine_shield" ? 4 : 2);
        break;
      case "storm":
        drawSpellStorm(sx, sy, pct, cfg);
        break;
      case "time":
        drawTimeWarp(sx, sy, pct, cfg);
        break;
      case "shield":
        drawShieldBash(sx, sy, angle, pct, cfg);
        break;
      case "fortify":
        drawFortify(sx, sy, pct, cfg);
        break;
      case "sword":
      case "melee":
        drawHolyStrike(sx, sy, angle, pct, cfg);
        break;
      case "ground":
        drawConsecration(sx, sy, age, pct, cfg);
        break;
      case "wrath":
        drawDivineWrath(sx, sy, angle, pct, cfg);
        break;
      case "heal":
      case "heal_big":
        drawHeal(sx, sy, pct, cfg, cfg.kind === "heal_big");
        break;
      case "cry":
        drawBattleCry(sx, sy, angle, pct, cfg);
        break;
      case "trap":
        drawCaltrops(sx, sy, pct, cfg);
        break;
      case "dash":
        drawEvasion(sx, sy, angle, pct, cfg);
        break;
      case "vanish":
        drawCamouflage(sx, sy, pct, cfg);
        break;
      case "smoke":
        drawSmokeBomb(sx, sy, pct, cfg);
        break;
      default:
        drawSpellBurst(sx, sy, pct, cfg);
        break;
    }
    ctx.restore();
  }
}

function drawSpellRing(x, y, radius, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - 8, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawSpellBolt(x, y, angle, pct, cfg, distance) {
  const travel = Math.min(1, pct * 1.2);
  const px = x + Math.cos(angle) * distance * travel;
  const py = y + Math.sin(angle) * distance * travel - 10;
  const glow = ctx.createRadialGradient(px, py, 2, px, py, 18);
  glow.addColorStop(0, cfg.accent);
  glow.addColorStop(0.45, cfg.color);
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(px - 18, py - 18, 36, 36);
  ctx.strokeStyle = cfg.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(angle) * 16, y + Math.sin(angle) * 16 - 10);
  ctx.lineTo(px, py);
  ctx.stroke();
}

function drawSpellArrow(x, y, angle, pct, cfg, offsets, distance) {
  for (const offset of offsets) {
    const a = angle + offset;
    const travel = Math.min(1, pct * 1.35);
    const px = x + Math.cos(a) * distance * travel;
    const py = y + Math.sin(a) * distance * travel - 10;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);
    ctx.strokeStyle = cfg.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();
    ctx.fillStyle = cfg.color;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(6, -5);
    ctx.lineTo(6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawSpellBurst(x, y, pct, cfg) {
  for (let i = 0; i < 3; i += 1) {
    drawSpellRing(x, y, 12 + pct * (24 + i * 14), i === 0 ? cfg.accent : cfg.color);
  }
}

function drawSpellCone(x, y, angle, pct, cfg) {
  ctx.save();
  ctx.translate(x, y - 8);
  ctx.rotate(angle);
  ctx.fillStyle = cfg.color;
  ctx.globalAlpha *= 0.34;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.arc(12, 0, 112 * pct, -0.42, 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha *= 1.8;
  ctx.strokeStyle = cfg.accent;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawSpellBarrier(x, y, pct, cfg, rings) {
  for (let i = 0; i < rings; i += 1) {
    drawSpellRing(x, y, 22 + i * 7 + Math.sin(pct * Math.PI) * 8, i % 2 === 0 ? cfg.color : cfg.accent);
  }
}

function drawSpellStorm(x, y, pct, cfg) {
  drawSpellRing(x, y, 42 + pct * 18, cfg.color);
  for (let i = 0; i < 12; i += 1) {
    const ox = ((i % 4) - 1.5) * 24;
    const fall = ((pct * 72 + i * 11) % 72) - 36;
    ctx.strokeStyle = i % 2 ? cfg.color : cfg.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + ox - 6, y - 64 + fall);
    ctx.lineTo(x + ox + 4, y - 42 + fall);
    ctx.stroke();
  }
}

function drawTimeWarp(x, y, pct, cfg) {
  for (let i = 0; i < 4; i += 1) {
    ctx.strokeStyle = i % 2 ? cfg.color : cfg.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - 8, 24 + pct * 44, 10 + i * 8, pct * Math.PI * 2 + i, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawShieldBash(x, y, angle, pct, cfg) {
  ctx.save();
  ctx.translate(x, y - 8);
  ctx.rotate(angle);
  ctx.fillStyle = cfg.color;
  ctx.globalAlpha *= 0.55;
  ctx.fillRect(20 + pct * 28, -18, 14, 36);
  ctx.strokeStyle = cfg.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(18 + pct * 34, 0, 26, -0.9, 0.9);
  ctx.stroke();
  ctx.restore();
}

function drawFortify(x, y, pct, cfg) {
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i % 2 ? cfg.color : cfg.accent;
    const ox = (i - 2) * 10;
    ctx.fillRect(x + ox - 4, y - 8 - pct * 20, 8, 28);
  }
  drawSpellRing(x, y, 26 + pct * 8, cfg.color);
}

function drawHolyStrike(x, y, angle, pct, cfg) {
  ctx.save();
  ctx.translate(x, y - 8);
  ctx.rotate(angle);
  ctx.strokeStyle = cfg.accent;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(26, 0, 34 + pct * 10, -0.8 + pct * 0.5, 0.8 + pct * 0.5);
  ctx.stroke();
  ctx.strokeStyle = cfg.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, -34);
  ctx.lineTo(54, 34);
  ctx.stroke();
  ctx.restore();
}

function drawConsecration(x, y, ageMs, pct, cfg) {
  const radiusPx = CONSECRATION_RADIUS_TILES * TILE_SIZE;
  const rx = radiusPx * 0.92;
  const ry = radiusPx * 0.48;
  const pulse = 0.5 + 0.5 * Math.sin(ageMs * 0.007 + pct * 4);
  const baseAlpha = Math.max(0.12, 0.42 * (1 - pct * 0.55) + pulse * 0.12);

  ctx.save();
  ctx.translate(x, y + TILE_SIZE * 0.08);
  ctx.globalCompositeOperation = "lighter";

  const floorGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  floorGlow.addColorStop(0, hexWithAlpha(cfg.accent, baseAlpha + 0.18));
  floorGlow.addColorStop(0.45, hexWithAlpha(cfg.color, baseAlpha * 0.85));
  floorGlow.addColorStop(1, hexWithAlpha(cfg.color, 0));

  ctx.fillStyle = floorGlow;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hexWithAlpha(cfg.accent, 0.35 + pulse * 0.35);
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 7]);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.88, ry * 0.82, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const inner = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 0.35);
  inner.addColorStop(0, hexWithAlpha("#ffffff", 0.15 + pulse * 0.12));
  inner.addColorStop(1, hexWithAlpha(cfg.accent, 0));
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.34, ry * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function hexWithAlpha(hex, a) {
  const h = String(hex).replace("#", "");
  if (h.length !== 6) {
    return `rgba(255,215,0,${Math.max(0, Math.min(1, a))})`;
  }
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}

function drawDivineWrath(x, y, angle, pct, cfg) {
  drawSpellCone(x, y, angle, pct, cfg);
  for (let i = 0; i < 3; i += 1) {
    const ox = Math.cos(angle) * (34 + i * 22);
    const oy = Math.sin(angle) * (34 + i * 22);
    ctx.strokeStyle = cfg.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + ox, y - 72 + oy);
    ctx.lineTo(x + ox - 10, y - 12 + oy);
    ctx.stroke();
  }
}

function drawHeal(x, y, pct, cfg, big) {
  drawSpellRing(x, y, (big ? 34 : 24) + pct * 18, cfg.color);
  const count = big ? 8 : 5;
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    const px = x + Math.cos(a) * (18 + pct * 18);
    const py = y - 8 + Math.sin(a) * 10 - pct * 30;
    ctx.strokeStyle = i % 2 ? cfg.color : cfg.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px - 5, py);
    ctx.lineTo(px + 5, py);
    ctx.moveTo(px, py - 5);
    ctx.lineTo(px, py + 5);
    ctx.stroke();
  }
}

function drawBattleCry(x, y, angle, pct, cfg) {
  drawSpellRing(x, y, 22 + pct * 46, cfg.color);
  ctx.save();
  ctx.translate(x, y - 20);
  ctx.rotate(angle);
  ctx.strokeStyle = cfg.accent;
  ctx.lineWidth = 3;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.arc(20, i * 10, 16 + pct * 32, -0.45, 0.45);
    ctx.stroke();
  }
  ctx.restore();
}

function drawArrowRain(x, y, pct, cfg) {
  for (let i = 0; i < 12; i += 1) {
    const ox = ((i % 6) - 2.5) * 18;
    const fall = ((pct * 96 + i * 13) % 96) - 48;
    drawSpellArrow(x + ox, y - 38 + fall, Math.PI / 2, 0.7, cfg, [0], 34);
  }
  drawSpellRing(x, y, 46, cfg.color);
}

function drawCaltrops(x, y, pct, cfg) {
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2;
    const px = x + Math.cos(a) * (12 + pct * 28);
    const py = y + Math.sin(a) * (7 + pct * 15);
    ctx.strokeStyle = i % 2 ? cfg.color : cfg.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px - 5, py + 4);
    ctx.lineTo(px, py - 7);
    ctx.lineTo(px + 5, py + 4);
    ctx.stroke();
  }
}

function drawEvasion(x, y, angle, pct, cfg) {
  for (let i = 0; i < 4; i += 1) {
    const back = 18 + i * 10 + pct * 30;
    ctx.strokeStyle = i % 2 ? cfg.color : cfg.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(angle) * back, y - 8 - Math.sin(angle) * back);
    ctx.lineTo(x - Math.cos(angle) * (back + 18), y - 8 - Math.sin(angle) * (back + 18));
    ctx.stroke();
  }
}

function drawCamouflage(x, y, pct, cfg) {
  ctx.globalAlpha *= 0.7;
  drawSpellRing(x, y, 34 + Math.sin(pct * Math.PI) * 12, cfg.color);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + pct * 2;
    ctx.fillStyle = i % 2 ? cfg.color : cfg.accent;
    ctx.fillRect(x + Math.cos(a) * 24 - 3, y - 8 + Math.sin(a) * 18 - 3, 6, 6);
  }
}

function drawSmokeBomb(x, y, pct, cfg) {
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const r = 12 + pct * (20 + i * 2);
    const px = x + Math.cos(a) * r;
    const py = y - 8 + Math.sin(a) * r * 0.6;
    const smoke = ctx.createRadialGradient(px, py, 2, px, py, 18);
    smoke.addColorStop(0, cfg.accent);
    smoke.addColorStop(1, "rgba(119,119,102,0)");
    ctx.fillStyle = smoke;
    ctx.fillRect(px - 18, py - 18, 36, 36);
  }
}

function drawLevelUpFx() {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const now = performance.now();

  for (const fx of state.levelUpFx) {
    const age = now - fx.createdAt;
    if (age < 0) {
      continue;
    }
    const pct = Math.min(1, age / fx.ttl);
    const originX = fx.x * TILE_SIZE - state.camera.x + halfW;
    const originY = fx.y * TILE_SIZE - state.camera.y + halfH;
    ctx.save();
    ctx.globalAlpha = 1 - pct;
    for (const particle of fx.particles) {
      const px = originX + particle.vx * pct;
      const py = originY + particle.vy * pct + pct * pct * 34;
      ctx.fillStyle = particle.color;
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(originX, originY, 14 + pct * 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHealthBar(x, y, w, h, hp, maxHp) {
  const pct = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = "#481b24";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = pct > 0.5 ? "#6ee36f" : pct > 0.25 ? "#ffd166" : "#f26d6d";
  ctx.fillRect(x, y, Math.round(w * pct), h);
}

function pixel(originX, originY, x, y, w, h, color, scale) {
  ctx.fillStyle = color;
  ctx.fillRect(originX + x * scale, originY + y * scale, w * scale, h * scale);
}

function scatterPixels(sx, sy, tx, ty, color, count, size) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i += 1) {
    const x = (hash2(tx, ty, i) * (TILE_SIZE - size)) | 0;
    const y = (hash2(tx, ty, i + 20) * (TILE_SIZE - size)) | 0;
    ctx.fillRect(sx + x, sy + y, size, size);
  }
}

function drawInteriorTile(tile, sx, sy, tx, ty) {
  const colors = getTileColors(tile);

  if (tile === TILE.WALL) {
    ctx.fillStyle = "#2b2630";
    ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = "#5d4b46";
    ctx.fillRect(sx, sy + 8, TILE_SIZE, 24);
    ctx.fillStyle = "#7b655b";
    ctx.fillRect(sx, sy + 10, TILE_SIZE, 4);
    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.fillRect(sx, sy + 28, TILE_SIZE, 4);
    return;
  }

  ctx.fillStyle = tile === TILE.CARPET ? colors[0] : "#9d7954";
  ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

  if (tile === TILE.FLOOR) {
    ctx.fillStyle = "#b48b60";
    ctx.fillRect(sx, sy + 2, TILE_SIZE, 2);
    ctx.fillRect(sx, sy + 14, TILE_SIZE, 2);
    ctx.fillRect(sx, sy + 26, TILE_SIZE, 2);
    ctx.fillStyle = "rgba(73, 45, 26, 0.28)";
    ctx.fillRect(sx + 2, sy, 2, TILE_SIZE);
    return;
  }

  if (tile === TILE.DOOR) {
    ctx.fillStyle = "#9d7954";
    ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = "#4e2d1b";
    ctx.fillRect(sx + 7, sy + 4, 18, 25);
    ctx.fillStyle = "#c89338";
    ctx.fillRect(sx + 21, sy + 16, 3, 3);
    return;
  }

  if (tile === TILE.CARPET) {
    ctx.fillStyle = colors[1];
    ctx.fillRect(sx + 3, sy + 3, TILE_SIZE - 6, TILE_SIZE - 6);
    ctx.fillStyle = colors[2];
    ctx.fillRect(sx + 7, sy + 7, TILE_SIZE - 14, TILE_SIZE - 14);
    return;
  }

  if (tile === TILE.BED) {
    drawEllipseShadow(sx + 4, sy + 23, 24, 6, 0.24);
    ctx.fillStyle = "#5e3b28";
    ctx.fillRect(sx + 4, sy + 6, 24, 22);
    ctx.fillStyle = colors[1];
    ctx.fillRect(sx + 6, sy + 8, 20, 17);
    ctx.fillStyle = "#eef2df";
    ctx.fillRect(sx + 7, sy + 9, 18, 6);
    return;
  }

  if (tile === TILE.TABLE) {
    drawEllipseShadow(sx + 4, sy + 22, 24, 7, 0.25);
    ctx.fillStyle = colors[2];
    ctx.fillRect(sx + 7, sy + 19, 4, 9);
    ctx.fillRect(sx + 21, sy + 19, 4, 9);
    ctx.fillStyle = colors[1];
    ctx.fillRect(sx + 5, sy + 9, 22, 13);
    ctx.fillStyle = "#d2a963";
    ctx.fillRect(sx + 10, sy + 12, 5, 3);
    return;
  }

  if (tile === TILE.CHAIR) {
    drawEllipseShadow(sx + 6, sy + 24, 20, 5, 0.2);
    ctx.fillStyle = colors[2];
    ctx.fillRect(sx + 8, sy + 20, 4, 8);
    ctx.fillRect(sx + 18, sy + 20, 4, 8);
    ctx.fillStyle = colors[1];
    ctx.fillRect(sx + 9, sy + 8, 12, 16);
    ctx.fillStyle = colors[0];
    ctx.fillRect(sx + 14, sy + 4, 2, 6);
    return;
  }

  if (tile === TILE.CHEST) {
    drawEllipseShadow(sx + 8, sy + 26, 16, 5, 0.22);
    ctx.fillStyle = colors[0];
    ctx.fillRect(sx + 7, sy + 15, 18, 15);
    ctx.fillStyle = colors[1];
    ctx.fillRect(sx + 9, sy + 9, 14, 9);
    ctx.strokeStyle = "rgba(40,24,10,0.55)";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 7, sy + 15, 18, 15);
    ctx.strokeRect(sx + 9, sy + 9, 14, 9);
    ctx.fillStyle = colors[2];
    ctx.fillRect(sx + 13, sy + 11, 6, 4);
    return;
  }

  if (tile === TILE.HOME_TREE) {
    const t = performance.now() / 1000;
    const bob = Math.sin(t * 2.6) * 1.1;
    const glimmer = 0.38 + Math.sin(t * 5.4) * 0.22;
    ctx.fillStyle = "#9d7954";
    ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
    drawEllipseShadow(sx + 9, sy + 28, 14, 4, 0.18);
    ctx.save();
    ctx.translate(sx + 16 + bob * 0.22, sy + 28);
    ctx.fillStyle = "#5b3b26";
    ctx.fillRect(-2, -11, 4, 11);
    ctx.fillStyle = `rgba(47, 122, 72, ${0.82 + glimmer * 0.18})`;
    ctx.beginPath();
    ctx.arc(0, -17 + bob * 0.28, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(120, 210, 150, 0.55)";
    ctx.beginPath();
    ctx.arc(-3, -19 + bob * 0.32, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(20,40,24,0.45)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = `rgba(200, 255, 220, ${0.15 + glimmer * 0.35})`;
    ctx.beginPath();
    ctx.arc(2, -14, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (tile === TILE.SHELF) {
    drawEllipseShadow(sx + 5, sy + 24, 22, 6, 0.24);
    ctx.fillStyle = colors[2];
    ctx.fillRect(sx + 5, sy + 8, 22, 21);
    ctx.fillStyle = colors[1];
    ctx.fillRect(sx + 7, sy + 10, 18, 4);
    ctx.fillRect(sx + 7, sy + 18, 18, 4);
    ctx.fillStyle = "#e4c26a";
    ctx.fillRect(sx + 10, sy + 6, 4, 4);
    ctx.fillStyle = "#c85b5b";
    ctx.fillRect(sx + 18, sy + 15, 5, 5);
    ctx.fillStyle = "#8fe388";
    ctx.fillRect(sx + 10, sy + 23, 6, 4);
    return;
  }

  if (tile === TILE.FIREPLACE) {
    const time = performance.now() / 1000;
    const flicker = 0.7 + Math.sin(time * 9.3) * 0.15 + Math.sin(time * 14.7) * 0.1;
    // Stone surround
    ctx.fillStyle = "#3a2820";
    ctx.fillRect(sx + 3, sy + 4, 26, 26);
    ctx.fillStyle = "#5a4030";
    ctx.fillRect(sx + 5, sy + 6, 22, 22);
    // Firebox opening
    ctx.fillStyle = "#120808";
    ctx.fillRect(sx + 7, sy + 10, 18, 16);
    // Logs
    ctx.fillStyle = "#3a1808";
    ctx.fillRect(sx + 9, sy + 22, 14, 4);
    ctx.fillStyle = "#5a2810";
    ctx.fillRect(sx + 11, sy + 22, 10, 3);
    // Flames
    ctx.fillStyle = `rgba(255,${Math.round(100 * flicker)},0,${0.85 * flicker})`;
    ctx.beginPath();
    ctx.ellipse(sx + 16, sy + 18, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,${Math.round(160 * flicker)},0,${0.7 * flicker})`;
    ctx.beginPath();
    ctx.ellipse(sx + 12, sy + 19, 3, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx + 20, sy + 19, 3, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,230,180,${0.6 * flicker})`;
    ctx.beginPath();
    ctx.ellipse(sx + 16, sy + 17, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Mantle
    ctx.fillStyle = "#6a5040";
    ctx.fillRect(sx + 3, sy + 8, 26, 4);
    ctx.fillStyle = "#8a6858";
    ctx.fillRect(sx + 3, sy + 8, 26, 2);
    return;
  }
}

function drawGroundPatch(tile, sx, sy, tx, ty, colors) {
  const shade = hash2(tx, ty, 31);
  ctx.fillStyle = shade > 0.56 ? colors[0] : blend(colors[0], "#000000", 0.04);
  ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

  if (shade > 0.42) {
    ctx.fillStyle = colors[1];
    ctx.fillRect(sx + 5, sy + 7, 8, 2);
    ctx.fillRect(sx + 19, sy + 21, 7, 2);
  }

  if ((tile === TILE.GRASS || tile === TILE.DARK_GRASS) && hash2(tx, ty, 95) > 0.72) {
    drawGrassTuft(sx + 7 + ((hash2(tx, ty, 96) * 16) | 0), sy + 8 + ((hash2(tx, ty, 97) * 14) | 0), tile === TILE.DARK_GRASS ? "#254a38" : "#35723d");
  }
}

function drawGrassTuft(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y + 2, 2, 5);
  ctx.fillRect(x + 3, y, 2, 7);
  ctx.fillRect(x + 6, y + 3, 2, 4);
}

function drawFlowerPatch(sx, sy, tx, ty) {
  const colors = ["#f2d46f", "#ffffff", "#de6f99"];
  for (let i = 0; i < 5; i += 1) {
    const x = sx + 6 + ((hash2(tx, ty, i + 161) * 19) | 0);
    const y = sy + 7 + ((hash2(tx, ty, i + 171) * 17) | 0);
    ctx.fillStyle = "#35723d";
    ctx.fillRect(x, y + 2, 2, 4);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x - 1, y, 3, 3);
  }
}

function drawPath(sx, sy, tx, ty, colors) {
  // Mortar base
  ctx.fillStyle = colors[0];
  ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

  // Staggered cobblestone blocks (3 per row, 2px mortar gaps)
  const sW = 10; const sH = 7; const gap = 2; const step = sW + gap;
  for (let row = 0; row < 4; row++) {
    const by = sy + 2 + row * (sH + gap);
    if (by + sH > sy + TILE_SIZE) break;
    const shift = row % 2 === 0 ? 0 : 6;
    for (let col = -1; col < 4; col++) {
      const bx = sx + col * step + shift;
      const x1 = Math.max(bx, sx);
      const x2 = Math.min(bx + sW, sx + TILE_SIZE);
      if (x2 <= x1) continue;
      ctx.fillStyle = hash2(tx + col * 7, ty + row * 3, 701) > 0.5 ? colors[1] : blend(colors[0], colors[1], 0.65);
      ctx.fillRect(x1, by, x2 - x1, sH);
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(x1, by, x2 - x1, 1);
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(x1, by + sH - 1, x2 - x1, 1);
    }
  }

  // Curb edges where path meets soft ground
  const soft = new Set([TILE.GRASS, TILE.DARK_GRASS, TILE.FLOWERS, TILE.SAND, TILE.SNOW]);
  if (soft.has(getTile(tx, ty - 1))) { ctx.fillStyle = colors[2]; ctx.fillRect(sx, sy, TILE_SIZE, 2); }
  if (soft.has(getTile(tx, ty + 1))) { ctx.fillStyle = colors[2]; ctx.fillRect(sx, sy + TILE_SIZE - 2, TILE_SIZE, 2); }
  if (soft.has(getTile(tx - 1, ty))) { ctx.fillStyle = colors[2]; ctx.fillRect(sx, sy, 2, TILE_SIZE); }
  if (soft.has(getTile(tx + 1, ty))) { ctx.fillStyle = colors[2]; ctx.fillRect(sx + TILE_SIZE - 2, sy, 2, TILE_SIZE); }
}

function drawWater(sx, sy, tx, ty, colors) {
  ctx.fillStyle = colors[0];
  ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = "#1d8fb3";
  ctx.fillRect(sx, sy + 3, TILE_SIZE, TILE_SIZE - 6);
  ctx.fillStyle = colors[1];
  for (let i = 0; i < 3; i += 1) {
    const px = sx + ((hash2(tx, ty, i) * 22) | 0);
    const py = sy + 7 + i * 8;
    ctx.fillRect(px, py, 10, 2);
  }

  ctx.fillStyle = "rgba(186, 233, 214, 0.45)";
  if (getTile(tx, ty - 1) !== TILE.WATER) {
    ctx.fillRect(sx, sy, TILE_SIZE, 3);
  }
  if (getTile(tx, ty + 1) !== TILE.WATER) {
    ctx.fillRect(sx, sy + TILE_SIZE - 3, TILE_SIZE, 3);
  }
  if (getTile(tx - 1, ty) !== TILE.WATER) {
    ctx.fillRect(sx, sy, 3, TILE_SIZE);
  }
  if (getTile(tx + 1, ty) !== TILE.WATER) {
    ctx.fillRect(sx + TILE_SIZE - 3, sy, 3, TILE_SIZE);
  }
}

function drawCoveredBuildingGround(sx, sy, tx, ty) {
  const colors = getTileColors(TILE.GRASS);
  ctx.fillStyle = colors[0];
  ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
  scatterPixels(sx, sy, tx, ty, colors[1], 2, 2);
}

function drawForestFloor(sx, sy, tx, ty) {
  const frost = isNearTile(tx, ty, TILE.SNOW);
  const ember = tx > 80 && ty < -70;
  const base = frost ? "#2a4a4e" : ember ? "#1e2c1a" : "#253c2a";
  const mid = frost ? "#3a6468" : ember ? "#2a3c24" : "#315432";
  const detail = frost ? "#4a7c7a" : ember ? "#3a4c30" : "#3e6840";
  const moss = frost ? "#5a8a82" : ember ? "#4a5c3a" : "#4e7848";

  ctx.fillStyle = base;
  ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

  ctx.fillStyle = mid;
  ctx.fillRect(sx + 4, sy + 4, 24, 24);

  const r1 = hash2(tx, ty, 601);
  const r2 = hash2(tx, ty, 602);
  const r3 = hash2(tx, ty, 603);
  const r4 = hash2(tx, ty, 604);

  if (r1 > 0.3) {
    ctx.fillStyle = detail;
    ctx.fillRect(sx + (r1 * 20 | 0), sy + (r2 * 20 | 0), 6, 2);
  }
  if (r3 > 0.4) {
    ctx.fillStyle = moss;
    ctx.fillRect(sx + (r3 * 18 | 0) + 4, sy + (r4 * 18 | 0) + 4, 4, 4);
  }
  if (r2 > 0.55) {
    ctx.fillStyle = detail;
    ctx.fillRect(sx + (r4 * 22 | 0) + 2, sy + (r1 * 14 | 0) + 10, 3, 5);
    ctx.fillRect(sx + (r4 * 22 | 0) + 5, sy + (r1 * 14 | 0) + 8, 3, 3);
  }
  if (hash2(tx, ty, 605) > 0.72) {
    ctx.fillStyle = blend(moss, "#ffffff", 0.1);
    ctx.fillRect(sx + (hash2(tx, ty, 606) * 22 | 0) + 2, sy + (hash2(tx, ty, 607) * 22 | 0) + 2, 2, 6);
  }
}

function drawWorldAssets(minTileX, maxTileX, minTileY, maxTileY) {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;

  if (state.worldTheme === SCI_FI_THEME) {
    for (let ty = minTileY; ty <= maxTileY; ty += 1) {
      for (let tx = minTileX; tx <= maxTileX; tx += 1) {
        const tile = getTile(tx, ty);
        const sx = Math.floor(tx * TILE_SIZE - state.camera.x + halfW);
        const sy = Math.floor(ty * TILE_SIZE - state.camera.y + halfH);
        if ((tile === TILE.METAL || tile === TILE.WALKWAY) && hash2(tx, ty, 801) > 0.96) {
          drawSciFiPanelLight(sx, sy, tx, ty);
        } else if (tile === TILE.ENERGY && hash2(tx, ty, 802) > 0.7) {
          drawSciFiBeacon(sx, sy, tx, ty);
        }
      }
    }
    return;
  }

  for (let ty = minTileY; ty <= maxTileY; ty += 1) {
    for (let tx = minTileX; tx <= maxTileX; tx += 1) {
      const tile = getTile(tx, ty);
      const sx = Math.floor(tx * TILE_SIZE - state.camera.x + halfW);
      const sy = Math.floor(ty * TILE_SIZE - state.camera.y + halfH);

      if ((tile === TILE.GRASS || tile === TILE.DARK_GRASS) && hash2(tx, ty, 501) > 0.93) {
        drawCuratedBush(sx, sy, tx, ty, tile === TILE.DARK_GRASS);
      } else if ((tile === TILE.STONE || tile === TILE.SAND || tile === TILE.SNOW) && hash2(tx, ty, 502) > 0.9) {
        drawCuratedRock(sx, sy, tx, ty, tile === TILE.SAND);
      } else if (tile === TILE.PATH && hash2(tx, ty, 503) > 0.985) {
        drawCuratedSign(sx, sy);
      } else if (tile === TILE.FLOWERS) {
        // Potted plants / decorative shrubs on flower strips alongside roads
        const nearPath = getTile(tx - 1, ty) === TILE.PATH || getTile(tx + 1, ty) === TILE.PATH ||
                         getTile(tx, ty - 1) === TILE.PATH || getTile(tx, ty + 1) === TILE.PATH;
        if (nearPath && hash2(tx, ty, 504) > 0.55) {
          drawTownPlanter(sx, sy, tx, ty);
        }
      }
    }
  }
}

function drawSciFiPanelLight(sx, sy, tx, ty) {
  const flicker = 0.4 + hash2(tx, ty, 803) * 0.6;
  ctx.fillStyle = "rgba(103,240,255,0.18)";
  ctx.fillRect(sx + 11, sy + 7, 10, 4);
  ctx.fillStyle = `rgba(103,240,255,${0.2 + flicker * 0.35})`;
  ctx.fillRect(sx + 14, sy + 12, 4, 8);
  ctx.fillStyle = "rgba(190,245,255,0.25)";
  ctx.fillRect(sx + 8, sy + 5, 2, 2);
}

function drawSciFiBeacon(sx, sy, tx, ty) {
  const pulse = 0.5 + Math.sin(performance.now() / 300 + hash2(tx, ty, 804) * Math.PI * 2) * 0.5;
  ctx.save();
  ctx.fillStyle = "rgba(103,240,255,0.14)";
  ctx.fillRect(sx + 8, sy + 8, 16, 12);
  ctx.fillStyle = `rgba(103,240,255,${0.35 + pulse * 0.35})`;
  ctx.fillRect(sx + 14, sy + 3, 4, 20);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(sx + 15, sy + 5, 2, 8);
  ctx.restore();
}

function drawTownPlanter(sx, sy, tx, ty) {
  const r = hash2(tx, ty, 550);
  const x = sx + 8 + ((r * 10) | 0);
  const y = sy + 14 + ((hash2(tx, ty, 551) * 6) | 0);

  // Planter pot
  ctx.fillStyle = "#7a4a22";
  ctx.fillRect(x, y + 7, 14, 8);
  ctx.fillStyle = "#9c6030";
  ctx.fillRect(x + 1, y + 7, 12, 2);

  // Soil
  ctx.fillStyle = "#3a2010";
  ctx.fillRect(x + 1, y + 6, 12, 3);

  // Plant stems and petals
  const colors = r > 0.66 ? ["#e86870", "#c83050"] : r > 0.33 ? ["#f8c840", "#d0a020"] : ["#78c8f0", "#4898d0"];
  for (let i = 0; i < 3; i++) {
    const fx = x + 2 + i * 4;
    ctx.fillStyle = "#3a6030";
    ctx.fillRect(fx, y + 1, 2, 7);
    ctx.fillStyle = colors[0];
    ctx.fillRect(fx - 1, y - 2, 4, 4);
    ctx.fillStyle = colors[1];
    ctx.fillRect(fx, y - 1, 2, 2);
  }
}

function drawCenterTreehouse(sx, sy) {
  // sx,sy = screen pos of tile (0,0) top-left. Treehouse centered on 3×3 cluster.
  const cx = sx + 16;
  const cy = sy + 16;
  ctx.save();

  // Giant trunk
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur  = 14;
  ctx.fillStyle = "#2a1a08";
  ctx.fillRect(cx - 22, cy + 8, 44, 70);
  ctx.fillStyle = "#3d2512";
  for (let i = 4; i < 44; i += 12) ctx.fillRect(cx - 22 + i, cy + 8, 2, 70);

  // Root buttresses
  ctx.fillStyle = "#1e1008";
  ctx.beginPath(); ctx.moveTo(cx - 22, cy + 70); ctx.lineTo(cx - 55, cy + 82); ctx.lineTo(cx - 18, cy + 18); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + 22, cy + 70); ctx.lineTo(cx + 55, cy + 82); ctx.lineTo(cx + 18, cy + 18); ctx.fill();

  // Tree crown layers (bottom-up for depth)
  ctx.shadowBlur = 22;
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.fillStyle = "#143214";
  ctx.beginPath(); ctx.ellipse(cx, cy - 50, 88, 105, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1e5a1e";
  ctx.beginPath(); ctx.ellipse(cx - 8, cy - 58, 74, 88, -0.08, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#2a7a2a";
  ctx.beginPath(); ctx.ellipse(cx + 4, cy - 66, 62, 74, 0.08, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a943a";
  ctx.beginPath(); ctx.ellipse(cx, cy - 72, 50, 60, 0, 0, Math.PI * 2); ctx.fill();

  // Side canopy clusters
  ctx.fillStyle = "#143214";
  ctx.beginPath(); ctx.ellipse(cx - 68, cy - 18, 38, 52, -0.28, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 68, cy - 18, 38, 52,  0.28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1e5a1e";
  ctx.beginPath(); ctx.ellipse(cx - 62, cy - 24, 30, 42, -0.28, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 62, cy - 24, 30, 42,  0.28, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawTreeCanopies() {
  if (state.worldTheme === SCI_FI_THEME) {
    return;
  }
  const zoom = state.zoom || 1;
  const screenHalfW = canvas.width / 2;
  const screenHalfH = canvas.height / 2;
  const visHalfW = screenHalfW / zoom;
  const visHalfH = screenHalfH / zoom;
  const minTileX = Math.floor((state.camera.x - visHalfW) / TILE_SIZE) - 2;
  const maxTileX = Math.ceil((state.camera.x + visHalfW) / TILE_SIZE) + 2;
  const minTileY = Math.floor((state.camera.y - visHalfH) / TILE_SIZE) - 2;
  const maxTileY = Math.ceil((state.camera.y + visHalfH) / TILE_SIZE) + 2;

  for (let ty = minTileY; ty <= maxTileY; ty += 1) {
    for (let tx = minTileX; tx <= maxTileX; tx += 1) {
      if (getTile(tx, ty) !== TILE.TREE) continue;
      const sx = Math.floor(tx * TILE_SIZE - state.camera.x + screenHalfW);
      const sy = Math.floor(ty * TILE_SIZE - state.camera.y + screenHalfH);
      if (Math.abs(tx) <= 1 && Math.abs(ty) <= 1) {
        if (tx === 0 && ty === 0) drawCenterTreehouse(sx, sy);
        continue;
      }
      drawTreeCanopy(sx, sy, tx, ty);
    }
  }
}

function drawTreeCanopy(sx, sy, tx, ty) {
  const frost = isNearTile(tx, ty, TILE.SNOW);
  const ember = tx > 80 && ty < -70;
  const v = hash2(tx, ty, 200);

  let leafDark, leafBase, leafMid, leafLight, trunk;
  if (frost) {
    leafDark = "#3a5e60"; leafBase = "#5a8284"; leafMid = "#6f9396"; leafLight = "#9fbab9"; trunk = "#556b52";
  } else if (ember) {
    leafDark = "#1e2d1a"; leafBase = "#2c4226"; leafMid = "#3c5b38"; leafLight = "#587950"; trunk = "#50312a";
  } else if (v > 0.68) {
    leafDark = "#17482a"; leafBase = "#1e6032"; leafMid = "#2a7a44"; leafLight = "#489a5e"; trunk = "#5b3b26";
  } else if (v > 0.34) {
    leafDark = "#1a5228"; leafBase = "#267a3c"; leafMid = "#359a52"; leafLight = "#55bc72"; trunk = "#6c4b2e";
  } else {
    leafDark = "#253822"; leafBase = "#3a5830"; leafMid = "#4e7044"; leafLight = "#6a9260"; trunk = "#5a4028";
  }

  const ox = Math.round((hash2(tx, ty, 15) - 0.5) * 7);
  const rw = 14 + Math.round(hash2(tx, ty, 201) * 6);
  const rh = 12 + Math.round(hash2(tx, ty, 202) * 5);
  const cx = sx + 16 + ox;
  const cy = sy + 13;

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx + 3, sy + 28, rw - 1, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = trunk;
  ctx.fillRect(cx - 3, sy + 21, 6, 9);
  ctx.fillStyle = blend(trunk, "#000000", 0.3);
  ctx.fillRect(cx - 1, sy + 21, 2, 9);

  ctx.fillStyle = leafDark;
  ctx.beginPath();
  ctx.ellipse(cx + 2, cy + 3, rw + 2, rh + 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = leafBase;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = leafMid;
  ctx.beginPath();
  ctx.ellipse(cx - rw * 0.38, cy - rh * 0.14, rw * 0.44, rh * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + rw * 0.31, cy - rh * 0.08, rw * 0.38, rh * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = leafLight;
  ctx.beginPath();
  ctx.ellipse(cx - rw * 0.14, cy - rh * 0.3, rw * 0.46, rh * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.55;
  ctx.fillStyle = leafLight;
  ctx.beginPath();
  ctx.ellipse(cx - 2, cy - rh * 0.52, rw * 0.2, rh * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawCuratedTree(sx, sy, tx, ty) {
  drawTreeCanopy(sx, sy, tx, ty);
}

function drawCuratedBush(sx, sy, tx, ty, dark) {
  const base = dark ? "#315f45" : "#3f8c4f";
  const light = dark ? "#5b8366" : "#78b96a";
  const x = sx + 6 + ((hash2(tx, ty, 521) * 9) | 0);
  const y = sy + 18 + ((hash2(tx, ty, 522) * 4) | 0);

  drawEllipseShadow(x - 1, y + 8, 18, 4, 0.16);
  ctx.fillStyle = base;
  ctx.fillRect(x, y + 3, 18, 8);
  ctx.fillRect(x + 4, y, 10, 6);
  ctx.fillStyle = light;
  ctx.fillRect(x + 4, y + 2, 5, 2);
  ctx.fillRect(x + 11, y + 5, 4, 2);
}

function drawCuratedRock(sx, sy, tx, ty, warm) {
  const base = warm ? "#8f6c3b" : "#6d767d";
  const light = warm ? "#d1a968" : "#b5b8b2";
  const x = sx + 8 + ((hash2(tx, ty, 531) * 8) | 0);
  const y = sy + 19 + ((hash2(tx, ty, 532) * 4) | 0);

  drawEllipseShadow(x - 2, y + 8, 17, 4, 0.18);
  ctx.fillStyle = base;
  ctx.fillRect(x, y + 4, 15, 7);
  ctx.fillRect(x + 3, y, 9, 6);
  ctx.fillStyle = light;
  ctx.fillRect(x + 4, y + 2, 5, 2);
}

function drawCuratedSign(sx, sy) {
  ctx.fillStyle = "#6c4b2e";
  ctx.fillRect(sx + 15, sy + 15, 3, 13);
  ctx.fillStyle = "#b98b4f";
  ctx.fillRect(sx + 9, sy + 10, 15, 8);
  ctx.fillStyle = "#5f3c27";
  ctx.fillRect(sx + 11, sy + 13, 10, 2);
}

/** Freestanding homestead sign beside the façade (world fractions). */
function drawStandingResidentSign(worldX, worldY, shortName) {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const cx = Math.floor(worldX * TILE_SIZE - state.camera.x + halfW);
  const baseY = Math.floor(worldY * TILE_SIZE - state.camera.y + halfH);

  ctx.save();
  ctx.fillStyle = "#4a3428";
  ctx.fillRect(cx - 2, baseY - 38, 4, 40);
  const boardW = Math.min(120, Math.max(74, Math.round(12 + shortName.length * 6.3)));
  const bx = cx - Math.round(boardW / 2);
  const by = baseY - 56;
  ctx.fillStyle = "#c9a66a";
  ctx.strokeStyle = "#2c1c10";
  ctx.lineWidth = 2;
  ctx.fillRect(bx, by, boardW, 22);
  ctx.strokeRect(bx, by, boardW, 22);
  ctx.font = "600 11px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const text = shortName.slice(0, 16);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.strokeText(text, bx + boardW / 2, by + 11);
  ctx.fillStyle = "#173018";
  ctx.fillText(text, bx + boardW / 2, by + 11);
  ctx.restore();
}

function isNearTile(tx, ty, tile) {
  return getTile(tx - 1, ty) === tile || getTile(tx + 1, ty) === tile || getTile(tx, ty - 1) === tile || getTile(tx, ty + 1) === tile;
}

function drawBuildingSprites(minTileX, maxTileX, minTileY, maxTileY) {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const playerBuilding = getPlayerBuilding();
  const buildings = [...state.buildings.values()]
    .filter((building) => (
      building.x <= maxTileX &&
      building.x + building.w >= minTileX &&
      building.y <= maxTileY &&
      building.y + building.h >= minTileY
    ))
    .sort((a, b) => (a.y + a.h) - (b.y + b.h));

  for (const building of buildings) {
    const sx = Math.floor(building.x * TILE_SIZE - state.camera.x + halfW);
    const sy = Math.floor(building.y * TILE_SIZE - state.camera.y + halfH);
    const roofless = !!(playerBuilding && playerBuilding.x === building.x && playerBuilding.y === building.y);
    drawBuildingSprite(building, sx, sy, roofless);
    drawOwnedHouseInteriorCompanion(building, roofless, halfW, halfH);
  }
}

function drawOwnedHouseInteriorCompanion(building, roofless, halfW, halfH) {
  const self = state.players.get(state.selfId);
  if (!roofless || !self?.houseCompanion || building?.isPub) {
    return;
  }
  const lay = resolveHouseCompanionPhantomLayout(self, building);
  if (!lay) {
    return;
  }
  const { wx, wy, facing, poseExtras, mode, hc } = lay;

  const anchor = interiorFloorAnchorFromWorld(wx, wy, halfW, halfH);
  const groundBump = mode === "bed" ? 4 : mode === "eat" ? 6 : 9;
  const npcId = typeof hc.npcId === "string" ? hc.npcId : "companion";
  const ent = {
    id: `_house_companion_${npcId}`,
    name: hc.name || "Companion",
    classId: hc.classId || "ranger",
    primary: hc.primary,
    accent: hc.accent,
    torsoStyle: hc.classId === "knight" ? "armor" : hc.classId === "mage" ? "robe" : "tunic",
    torsoColor: hc.primary,
    weaponColor: hc.accent,
    weaponKind:
      hc.classId === "knight" ? "sword" : hc.classId === "mage" ? "staff" : "bow",
    x: wx,
    y: wy,
    facing,
    moving: false,
    renderX: wx,
    renderY: wy,
    hp: null,
    ...(hc.bondTag === "bf"
      ? {}
      : {
          longHair: true,
          romanceSilhouette: hc.romanceSilhouette || "soft_curves"
        })
  };
  drawCharacter(ent, anchor.cx, anchor.groundY + groundBump, true, poseExtras);
}

function drawIntimateBlackoutOverlay() {
  if (!state.joined || !(state.intimateBlackoutUntil > 0)) {
    return;
  }
  const now = performance.now();
  if (now >= state.intimateBlackoutUntil) {
    state.intimateBlackoutUntil = 0;
    return;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTower(building, sx, sy, w, h) {
  const battleH = Math.round(h * 0.14);
  const platH   = Math.round(h * 0.06);
  const wallH   = h - battleH - platH;
  const platY   = sy + battleH;
  const wallY   = platY + platH;
  const col     = sx + Math.round(w * 0.15);
  const colW    = w - Math.round(w * 0.30);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur   = 12;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 9;

  // Main stone column
  ctx.fillStyle = "#646b6b";
  ctx.fillRect(col, wallY, colW, wallH);
  // Horizontal mortar lines
  ctx.fillStyle = "#505656";
  for (let ry = wallY + 8; ry < wallY + wallH; ry += 11) {
    ctx.fillRect(col, ry, colW, 2);
  }
  // Corner quoins
  ctx.fillStyle = "#3e4444";
  ctx.fillRect(col, wallY, 5, wallH);
  ctx.fillRect(col + colW - 5, wallY, 5, wallH);

  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  // Wooden platform
  ctx.fillStyle = "#3a2410";
  ctx.fillRect(sx - 4, platY, w + 8, platH + 3);
  ctx.fillStyle = "#5a3a1a";
  for (let lx = 0; lx < w + 8; lx += 9) {
    ctx.fillRect(sx - 4 + lx, platY + 1, 7, platH);
  }
  ctx.fillStyle = "#24140a";
  ctx.fillRect(sx - 4, platY, w + 8, 2);
  ctx.fillRect(sx - 4, platY + platH, w + 8, 3);

  // Battlements / merlons
  const mW = Math.max(6, Math.round(w * 0.22));
  const mGap = Math.round(mW * 0.55);
  ctx.fillStyle = "#646b6b";
  for (let mx = sx + 2; mx < sx + w - 4; mx += mW + mGap) {
    ctx.fillRect(mx, sy, Math.min(mW, sx + w - 4 - mx), battleH + platH + 2);
    ctx.fillStyle = "#505656";
    ctx.fillRect(mx + 1, sy + 3, Math.min(mW - 2, sx + w - 5 - mx), 2);
    ctx.fillStyle = "#646b6b";
  }

  // Stone arch doorway at ground level
  const dw = Math.max(6, Math.round(colW * 0.38));
  const dh = Math.round(wallH * 0.26);
  const dx = col + Math.round((colW - dw) / 2);
  const dy = wallY + wallH - dh;
  ctx.fillStyle = "#1a1e1e";
  ctx.fillRect(dx, dy, dw, dh);
  ctx.beginPath();
  ctx.arc(dx + dw / 2, dy, dw / 2, Math.PI, 0);
  ctx.fill();
  // Door frame
  ctx.strokeStyle = "#3e4444";
  ctx.lineWidth = 2;
  ctx.strokeRect(dx - 1, dy - 1, dw + 2, dh + 1);

  // Ladder on right side
  const lx = col + colW - 1;
  ctx.strokeStyle = "#7a5830";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(lx - 4, platY + platH + 2); ctx.lineTo(lx - 4, wallY + wallH - dh - 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lx + 2, platY + platH + 2); ctx.lineTo(lx + 2, wallY + wallH - dh - 4); ctx.stroke();
  ctx.lineWidth = 1.5;
  for (let ry = platY + platH + 6; ry < wallY + wallH - dh - 6; ry += 7) {
    ctx.beginPath(); ctx.moveTo(lx - 4, ry); ctx.lineTo(lx + 2, ry); ctx.stroke();
  }

  ctx.restore();
}

function drawBuildingSprite(building, sx, sy, roofless) {
  const w = building.w * TILE_SIZE;
  const h = building.h * TILE_SIZE;
  const variant = getBuildingVariant(building);
  const type = building.type || "house";
  if (!roofless) drawCastShadow(sx + 10, sy + h - 14, w - 6, 18, 0.28);
  if (type === "tower") drawTower(building, sx, sy, w, h);
  else if (type === "hut") drawHut(building, sx, sy, w, h, variant, roofless);
  else if (type === "big_house") drawBigHouse(building, sx, sy, w, h, variant, roofless);
  else if (type === "treehouse") drawTreehouse(building, sx, sy, w, h, variant, roofless);
  else if (type === "castle") drawCastle(building, sx, sy, w, h, variant, roofless);
  else drawHouse(building, sx, sy, w, h, variant, roofless);

  // Owner name or for-sale sign
  const key = `${building.x},${building.y}`;
  const ownerName = state.buildingOwnership.get(key);
  ctx.font = "bold 11px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 2.5;
  if (ownerName) {
    drawOwnerSignpost(building, sx, sy, w, h, ownerName);
  } else if (building.forSale) {
    drawForSaleSignpost(building, sx, sy, w, h);
  } else if (building.residentLabel) {
    if (building.residentSign && typeof building.residentSign.sx === "number" && typeof building.residentSign.sy === "number") {
      drawStandingResidentSign(building.residentSign.sx, building.residentSign.sy, building.residentLabel);
    } else {
      const lx = sx + w / 2;
      const ly = sy + h - TILE_SIZE * 0.92;
      ctx.save();
      ctx.font = "600 10px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const text = `Home of ${building.residentLabel}`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.strokeText(text, lx, ly);
      ctx.fillStyle = "#f0f4ff";
      ctx.fillText(text, lx, ly);
      ctx.restore();
    }
  }

  if (building.isPub && !roofless) {
    ctx.save();
    const px = sx + w * 0.72;
    const py = sy + TILE_SIZE * 0.35;
    ctx.fillStyle = "rgba(92,52,38,0.94)";
    ctx.strokeStyle = "rgba(255,220,170,0.45)";
    ctx.lineWidth = 2;
    roundedRect(px - 36, py - 14, 72, 22, 4);
    ctx.fill();
    ctx.stroke();
    ctx.font = "bold 10px ui-sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffe8c8";
    ctx.fillText("PUB", px, py - 3);
    ctx.restore();
  }
}

function clientOwnsBuyableHouse(building) {
  const self = state.players.get(state.selfId);
  if (!building?.forSale) {
    return true;
  }
  if (!self) {
    return false;
  }
  const key = `${building.x},${building.y}`;
  const deedName = state.buildingOwnership.get(key);
  return Boolean(deedName && deedName === self.name && self.homeBuildingKey === key);
}

function getBuildingVariant(building) {
  const n = building.name;
  if (n.includes("Frost") || n.includes("Snow") || n.includes("Pine") || n.includes("Ice")) return "stone";
  if (n.includes("Keep") || n.includes("Castle") || n.includes("Citadel") || n.includes("Hall") || n.includes("Shrine")) return "stone";
  if (n.includes("Oasis") || n.includes("Sun") || n.includes("Clay") || n.includes("Sand") || n.includes("Palace")) return "desert";
  if (n.includes("Ember") || n.includes("Ash") || n.includes("Forge") || n.includes("Watcher")) return "ember";
  if (n.includes("Forest") || n.includes("Ranger") || n.includes("Woodland") || n.includes("Lodge") || n.includes("Perch")) return "wood";
  return "timber";
}

const BUILDING_PALETTES = {
  timber: { roofBase: "#9c4c1a", roofDark: "#6a2e0e", roofMid: "#b86030", roofLight: "#d4884a", roofRidge: "#3c1808", eave: "#3c1808", wall: "#7a4a22", wallLight: "#a06838", wallDark: "#4a2c10", wallLine: "#3a1e0a", win: "#b8deff", door: "#2c1408", doorFrame: "#c07830", ground: "#5a7a44" },
  stone:  { roofBase: "#5a6060", roofDark: "#323838", roofMid: "#6e7e7e", roofLight: "#98aaaa", roofRidge: "#1a2020", eave: "#242c2c", wall: "#7a8484", wallLight: "#a8b8b8", wallDark: "#4a5454", wallLine: "#3a4444", win: "#c8e8ff", door: "#1c2424", doorFrame: "#98a8a8", ground: "#6e7a52" },
  wood:   { roofBase: "#5c3818", roofDark: "#341e0c", roofMid: "#7a5028", roofLight: "#9a7040", roofRidge: "#200e04", eave: "#200e04", wall: "#4a2e14", wallLight: "#6a4828", wallDark: "#2c1a08", wallLine: "#1e0e04", win: "#b8e8b8", door: "#180c04", doorFrame: "#9a6828", ground: "#3a5a2a" },
  desert: { roofBase: "#c07830", roofDark: "#8a4c18", roofMid: "#d89848", roofLight: "#f0c070", roofRidge: "#5a2c0c", eave: "#5a2c0c", wall: "#c8a060", wallLight: "#e4c890", wallDark: "#8a6a30", wallLine: "#6a4820", win: "#fff0c0", door: "#5c3010", doorFrame: "#e0a040", ground: "#b88840" },
  ember:  { roofBase: "#2c1c10", roofDark: "#140c08", roofMid: "#482818", roofLight: "#7a3c1c", roofRidge: "#080404", eave: "#0c0604", wall: "#281410", wallLight: "#483028", wallDark: "#140a08", wallLine: "#0c0604", win: "#ff8820", door: "#0c0404", doorFrame: "#8c3410", ground: "#2c2014" },
};

function getFrontDoorOpenFactor(building, roofless) {
  if (roofless) return 1;
  if (!clientOwnsBuyableHouse(building)) {
    return 0;
  }
  const self = state.players.get(state.selfId);
  if (!self) return 0;
  const px = Number.isFinite(self.renderX) ? self.renderX : self.x;
  const py = Number.isFinite(self.renderY) ? self.renderY : self.y;
  const doorWx = southDoorAnchorWorldClient(building);
  const doorWy = building.y + building.h - 0.5;
  const d = Math.hypot(px - doorWx, py - doorWy);
  const far = 3.6;
  const near = 1.05;
  if (d >= far) return 0;
  if (d <= near) return 1;
  const u = (far - d) / (far - near);
  return u * u * (3 - 2 * u);
}

function drawSplitWoodenDoor(p, doorX, doorY, doorW, doorH, openT, framePad = 2, translucentPanels = false) {
  const t = Math.max(0, Math.min(1, openT));
  const mid = doorX + doorW / 2;
  const halfW = Math.max(2, Math.round(doorW / 2) - 1);
  const maxSwing = Math.min(halfW + 8, Math.max(halfW - 1, Math.round(doorW * 0.52)));
  const split = t * maxSwing;
  const pa = translucentPanels ? 0.45 : 1;
  ctx.fillStyle = p.doorFrame;
  ctx.globalAlpha = translucentPanels ? 0.55 : 1;
  ctx.fillRect(doorX - framePad, doorY - 2, doorW + framePad * 2, doorH + 2);
  ctx.globalAlpha = 1;
  const leftX = Math.round(mid - halfW - split);
  const rightX = Math.round(mid + split);
  ctx.globalAlpha = pa;
  ctx.fillStyle = p.door;
  ctx.fillRect(leftX, doorY, halfW, doorH);
  ctx.fillRect(rightX, doorY, halfW, doorH);
  ctx.fillStyle = blend(p.door, "#ffffff", 0.15);
  ctx.fillRect(leftX + 1, doorY + 3, Math.max(2, Math.round(halfW / 2) - 2), Math.max(2, Math.round(doorH / 2) - 4));
  ctx.fillRect(rightX + 1, doorY + 3, Math.max(2, Math.round(halfW / 2) - 2), Math.max(2, Math.round(doorH / 2) - 4));
  ctx.fillStyle = blend(p.door, "#ffffff", 0.08);
  ctx.fillRect(leftX + 1, doorY + Math.round(doorH / 2), Math.max(2, Math.round(halfW / 2) - 2), Math.max(2, Math.round(doorH / 2) - 4));
  ctx.fillRect(rightX + 1, doorY + Math.round(doorH / 2), Math.max(2, Math.round(halfW / 2) - 2), Math.max(2, Math.round(doorH / 2) - 4));
  ctx.fillStyle = translucentPanels ? "rgba(232,192,64,0.55)" : "#e8c040";
  ctx.fillRect(leftX + 2, doorY + Math.round(doorH / 2) - 1, 3, 3);
  ctx.fillRect(rightX + halfW - 5, doorY + Math.round(doorH / 2) - 1, 3, 3);
  ctx.globalAlpha = 1;
}

function drawHouse(building, sx, sy, w, h, variant, roofless) {
  const p = BUILDING_PALETTES[variant] || BUILDING_PALETTES.timber;
  const wallH = Math.max(38, Math.min(56, Math.round(h * 0.26)));
  const roofH = h - wallH;
  const wallY = sy + roofH;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.32)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 6;

  if (!roofless) {
    // --- ROOF (full-width, two-tone pitched) ---
    const ridgeY = sy + Math.round(roofH * 0.30);
    // Dark back face (far slope seen from above)
    ctx.fillStyle = p.roofDark;
    ctx.fillRect(sx - 3, sy, w + 6, ridgeY - sy + 1);
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    // Lighter front face (near slope)
    ctx.fillStyle = p.roofBase;
    ctx.fillRect(sx - 3, ridgeY, w + 6, wallY - ridgeY);
    // Shingle bands on front face
    const shingleH = 5;
    for (let ly = 4; ly < wallY - ridgeY - 2; ly += shingleH + 2) {
      ctx.fillStyle = p.roofMid;
      ctx.fillRect(sx - 3, ridgeY + ly, w + 6, shingleH);
      ctx.fillStyle = p.roofDark;
      ctx.fillRect(sx - 3, ridgeY + ly + shingleH, w + 6, 1);
    }
    // Ridge band
    ctx.fillStyle = p.roofRidge;
    ctx.fillRect(sx - 3, ridgeY - 2, w + 6, 5);
    ctx.fillStyle = p.roofLight;
    ctx.fillRect(sx - 3, ridgeY - 1, w + 6, 2);
    // Top-edge highlight on back face
    ctx.fillStyle = p.roofLight;
    ctx.fillRect(sx, sy + 2, Math.round(w * 0.6), 3);
    // Eave overhang at wall join
    ctx.fillStyle = p.eave;
    ctx.fillRect(sx - 5, wallY - 5, w + 10, 8);
    ctx.fillStyle = blend(p.eave, "#000000", 0.5);
    ctx.fillRect(sx - 5, wallY + 3, w + 10, 3);
    // Chimney
    const chimneyX = sx + Math.round(w * 0.65);
    ctx.fillStyle = blend(p.wall, "#000000", 0.35);
    ctx.fillRect(chimneyX - 5, sy, 11, 5);
    ctx.fillStyle = p.wall;
    ctx.fillRect(chimneyX - 4, sy + 2, 9, ridgeY - sy);
    ctx.fillStyle = p.wallLight;
    ctx.fillRect(chimneyX - 4, sy + 3, 3, 3);
    if (variant !== "ember") {
      ctx.fillStyle = "rgba(200,200,200,0.3)";
      ctx.beginPath();
      ctx.ellipse(chimneyX, sy, 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  }

  const doorOpen = getFrontDoorOpenFactor(building, roofless);
  const doorW = façadeDoorPxFromBuilding(building, w);
  const doorH = wallH - 2;
  const doorX = sx + Math.round(w / 2) - Math.round(doorW / 2);
  const doorY = wallY + wallH - doorH;

  if (!roofless) {
    // --- FRONT WALL ---
    ctx.fillStyle = p.wall;
    ctx.fillRect(sx - 3, wallY, w + 6, wallH);

    // Wall texture: vertical boards (timber/wood) or horizontal blocks (stone)
    if (variant === "stone") {
      ctx.fillStyle = p.wallDark;
      for (let ly = 0; ly < wallH; ly += 9) {
        const offset = Math.floor(ly / 9) % 2 === 0 ? 0 : 14;
        for (let lx = -14 + offset; lx < w + 6; lx += 28) {
          ctx.fillRect(sx - 3 + lx, wallY + ly, 27, 8);
        }
      }
      ctx.fillStyle = p.wallLine;
      for (let ly = 0; ly < wallH; ly += 9) {
        ctx.fillRect(sx - 3, wallY + ly, w + 6, 1);
      }
    } else {
      ctx.fillStyle = p.wallLine;
      for (let lx = 8; lx < w + 6; lx += 8) {
        ctx.fillRect(sx - 3 + lx, wallY, 1, wallH);
      }
    }

    // Wall top highlight
    ctx.fillStyle = p.wallLight;
    ctx.fillRect(sx - 3, wallY, w + 6, 3);

    // Wall side shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(sx - 3, wallY, 4, wallH);
    ctx.fillRect(sx + w - 1, wallY, 4, wallH);

    // --- WINDOWS ---
    const numWin = building.w >= 10 ? 2 : 1;
    const winW = 12; const winH = Math.max(10, wallH - 14);
    const winY = wallY + 6;
    if (numWin === 2) {
      drawHouseWindow(sx + Math.round(w * 0.18), winY, winW, winH, p);
      drawHouseWindow(sx + Math.round(w * 0.70), winY, winW, winH, p);
    } else {
      drawHouseWindow(sx + Math.round(w * 0.30), winY, winW, winH, p);
    }

    drawSplitWoodenDoor(p, doorX, doorY, doorW, doorH, doorOpen, 2, false);
  } else {
    // Cutaway: facade outline only + door (still shows entry)
    ctx.strokeStyle = blend(p.wallDark, p.wallLine, 0.5);
    ctx.lineWidth = 2;
    ctx.strokeRect(sx - 3 + 0.5, wallY + 0.5, w + 6 - 1, wallH - 1);
    ctx.strokeStyle = blend(p.wallLight, "#000000", 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - 3, wallY + 0.5);
    ctx.lineTo(sx + w + 3, wallY + 0.5);
    ctx.stroke();
    drawSplitWoodenDoor(p, doorX, doorY, doorW, doorH, 1, 2, true);
  }

  ctx.restore();

  // Front garden strip
  drawBuildingFrontDetail(sx - 3, sx - 3 + w + 6, sy + h, variant, p);
}

function drawHut(building, sx, sy, w, h, variant, roofless) {
  const p = BUILDING_PALETTES[variant] || BUILDING_PALETTES.timber;
  const roofH = Math.round(h * 0.52);
  const wallH = h - roofH;
  const wallY = sy + roofH;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;

  if (!roofless) {
    // Fill full footprint so no interior bleeds through triangular gaps
    ctx.fillStyle = variant === "desert" ? "#9a7020" : variant === "ember" ? "#241208" : "#5a4818";
    ctx.fillRect(sx - 5, sy, w + 10, h);
    // Thatched roof: full-width triangle from sy (no top gap)
    ctx.fillStyle = variant === "desert" ? "#b89040" : variant === "ember" ? "#3a2010" : "#8a7230";
    ctx.beginPath();
    ctx.moveTo(sx - 5, wallY);
    ctx.lineTo(sx + w / 2, sy);
    ctx.lineTo(sx + w + 5, wallY);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    // Thatch texture: staggered horizontal stripes clipped to triangle
    const thatchLight = variant === "desert" ? "#d4b860" : variant === "ember" ? "#5a3020" : "#a09050";
    const thatchDark  = variant === "desert" ? "#7a6020" : variant === "ember" ? "#221008" : "#504020";
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sx - 5, wallY);
    ctx.lineTo(sx + w / 2, sy);
    ctx.lineTo(sx + w + 5, wallY);
    ctx.closePath();
    ctx.clip();
    for (let i = 1; i <= 6; i += 1) {
      const ty2 = sy + i * roofH / 6;
      ctx.fillStyle = i % 2 === 0 ? thatchLight : thatchDark;
      ctx.fillRect(sx - 5, ty2 - 3, w + 10, 5);
    }
    ctx.restore();

    // Eave overhang
    ctx.fillStyle = p.eave;
    ctx.fillRect(sx - 5, wallY - 5, w + 10, 8);
    ctx.fillStyle = blend(p.eave, "#000", 0.5);
    ctx.fillRect(sx - 5, wallY + 3, w + 10, 3);
  } else {
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  }

  const doorOpen = getFrontDoorOpenFactor(building, roofless);
  const doorW = façadeDoorPxFromBuilding(building, w);
  const doorH = wallH - 4;
  const doorX = sx + Math.round(w / 2) - Math.round(doorW / 2);
  const doorY = wallY + wallH - doorH;

  if (!roofless) {
    ctx.fillStyle = p.wall;
    ctx.fillRect(sx + 2, wallY, w - 4, wallH);
    ctx.fillStyle = p.wallLight;
    ctx.fillRect(sx + 2, wallY, w - 4, 3);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(sx + 2, wallY, 3, wallH);
    ctx.fillRect(sx + w - 5, wallY, 3, wallH);

    const winW = 10; const winH = Math.max(8, wallH - 12);
    drawHouseWindow(sx + Math.round(w * 0.32), wallY + 5, winW, winH, p);

    drawSplitWoodenDoor(p, doorX, doorY, doorW, doorH, doorOpen, 2, false);
  } else {
    ctx.strokeStyle = blend(p.wallDark, p.wallLine, 0.55);
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 2 + 0.5, wallY + 0.5, w - 5, wallH - 1);
    ctx.strokeStyle = blend(p.wallLight, "#000", 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + 2, wallY + 0.5);
    ctx.lineTo(sx + w - 2, wallY + 0.5);
    ctx.stroke();
    drawSplitWoodenDoor(p, doorX, doorY, doorW, doorH, 1, 2, true);
  }

  ctx.restore();
  drawBuildingFrontDetail(sx + 2, sx + w - 2, sy + h, variant, p);
}

function drawBigHouse(building, sx, sy, w, h, variant, roofless) {
  const p = BUILDING_PALETTES[variant] || BUILDING_PALETTES.timber;
  const wallH = Math.max(52, Math.min(72, Math.round(h * 0.28)));
  const roofH = h - wallH;
  const wallY = sy + roofH;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 8;

  if (!roofless) {
    // --- ROOF (full-width, two-tone pitched) ---
    const ridgeY = sy + Math.round(roofH * 0.30);
    ctx.fillStyle = p.roofDark;
    ctx.fillRect(sx - 4, sy, w + 8, ridgeY - sy + 1);
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = p.roofBase;
    ctx.fillRect(sx - 4, ridgeY, w + 8, wallY - ridgeY);
    const shingleH = 5;
    for (let ly = 4; ly < wallY - ridgeY - 2; ly += shingleH + 2) {
      ctx.fillStyle = p.roofMid;
      ctx.fillRect(sx - 4, ridgeY + ly, w + 8, shingleH);
      ctx.fillStyle = p.roofDark;
      ctx.fillRect(sx - 4, ridgeY + ly + shingleH, w + 8, 1);
    }
    ctx.fillStyle = p.roofRidge;
    ctx.fillRect(sx - 4, ridgeY - 2, w + 8, 5);
    ctx.fillStyle = p.roofLight;
    ctx.fillRect(sx - 4, ridgeY - 1, w + 8, 2);
    ctx.fillStyle = p.roofLight;
    ctx.fillRect(sx, sy + 2, Math.round(w * 0.6), 3);

    // Two chimneys
    for (const cFrac of [0.28, 0.72]) {
      const chx = sx + Math.round(w * cFrac);
      ctx.fillStyle = blend(p.wall, "#000", 0.35);
      ctx.fillRect(chx - 4, sy, 9, 5);
      ctx.fillStyle = p.wall;
      ctx.fillRect(chx - 3, sy + 2, 7, ridgeY - sy);
      ctx.fillStyle = p.wallLight;
      ctx.fillRect(chx - 3, sy + 3, 3, 3);
      if (variant !== "ember") {
        ctx.fillStyle = "rgba(200,200,200,0.28)";
        ctx.beginPath();
        ctx.ellipse(chx, sy, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Eave overhang
    ctx.fillStyle = p.eave;
    ctx.fillRect(sx - 6, wallY - 5, w + 12, 8);
    ctx.fillStyle = blend(p.eave, "#000", 0.5);
    ctx.fillRect(sx - 6, wallY + 3, w + 12, 3);
  } else {
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  }

  const midFloor = Math.round(wallH * 0.45);
  const doorOpen = getFrontDoorOpenFactor(building, roofless);
  const doorW = façadeDoorPxFromBuilding(building, w);
  const doorH = wallH - midFloor - 4;
  const doorX = sx + Math.round(w / 2) - Math.round(doorW / 2);
  const doorY = wallY + wallH - doorH;

  if (!roofless) {
    ctx.fillStyle = p.wall;
    ctx.fillRect(sx - 4, wallY, w + 8, wallH);

    ctx.fillStyle = p.eave;
    ctx.fillRect(sx - 4, wallY + midFloor - 2, w + 8, 4);

    if (variant === "stone") {
      ctx.fillStyle = p.wallDark;
      for (let ly = 0; ly < wallH; ly += 9) {
        const offset = Math.floor(ly / 9) % 2 === 0 ? 0 : 14;
        for (let lx = -14 + offset; lx < w + 8; lx += 28) {
          ctx.fillRect(sx - 4 + lx, wallY + ly, 27, 8);
        }
      }
    } else {
      ctx.fillStyle = p.wallLine;
      for (let lx = 8; lx < w + 8; lx += 8) {
        ctx.fillRect(sx - 4 + lx, wallY, 1, wallH);
      }
    }

    ctx.fillStyle = p.wallLight;
    ctx.fillRect(sx - 4, wallY, w + 8, 3);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(sx - 4, wallY, 4, wallH);
    ctx.fillRect(sx + w, wallY, 4, wallH);

    const winW = 13; const winH = Math.max(10, midFloor - 14);
    const lowerWinH = Math.max(10, wallH - midFloor - 12);
    drawHouseWindow(sx + Math.round(w * 0.14), wallY + 5, winW, winH, p);
    drawHouseWindow(sx + Math.round(w * 0.50), wallY + 5, winW, winH, p);
    drawHouseWindow(sx + Math.round(w * 0.76), wallY + 5, winW, winH, p);
    drawHouseWindow(sx + Math.round(w * 0.14), wallY + midFloor + 6, winW, lowerWinH, p);
    drawHouseWindow(sx + Math.round(w * 0.72), wallY + midFloor + 6, winW, lowerWinH, p);

    ctx.fillStyle = p.wallLight;
    ctx.fillRect(doorX - 5, doorY - 4, 5, doorH + 4);
    ctx.fillRect(doorX + doorW, doorY - 4, 5, doorH + 4);
    drawSplitWoodenDoor(p, doorX, doorY, doorW, doorH, doorOpen, 2, false);
  } else {
    ctx.strokeStyle = blend(p.wallDark, p.wallLine, 0.5);
    ctx.lineWidth = 2;
    ctx.strokeRect(sx - 4 + 0.5, wallY + 0.5, w + 8 - 1, wallH - 1);
    ctx.strokeStyle = blend(p.eave, "#000", 0.45);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - 4, wallY + midFloor);
    ctx.lineTo(sx + w + 4, wallY + midFloor);
    ctx.stroke();
    ctx.strokeStyle = blend(p.wallLight, "#000", 0.35);
    ctx.beginPath();
    ctx.moveTo(sx - 4, wallY + 0.5);
    ctx.lineTo(sx + w + 4, wallY + 0.5);
    ctx.stroke();
    ctx.strokeStyle = blend(p.wallLight, "#000", 0.45);
    ctx.lineWidth = 2;
    ctx.strokeRect(doorX - 5 + 0.5, doorY - 4 + 0.5, 4, doorH + 4 - 1);
    ctx.strokeRect(doorX + doorW + 0.5, doorY - 4 + 0.5, 4, doorH + 4 - 1);
    drawSplitWoodenDoor(p, doorX, doorY, doorW, doorH, 1, 2, true);
  }

  ctx.restore();
  drawBuildingFrontDetail(sx - 4, sx - 4 + w + 8, sy + h, variant, p);
}

function drawTreehouse(building, sx, sy, w, h, variant, roofless) {
  const p = BUILDING_PALETTES[variant] || BUILDING_PALETTES.wood;
  const stiltsH = Math.round(h * 0.22);
  const houseH = h - stiltsH;
  const roofH = Math.round(houseH * 0.44);
  const wallH = houseH - roofH;
  const baseY = sy + h - stiltsH;
  const houseTopY = sy;
  const wallY = houseTopY + roofH;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.30)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 6;

  // Stilts / support posts
  ctx.fillStyle = "#2a1a0a";
  const numStilts = Math.max(3, Math.floor(w / 24));
  for (let i = 0; i < numStilts; i += 1) {
    const stx = sx + Math.round(w * 0.1 + i * (w * 0.8 / (numStilts - 1)));
    ctx.fillRect(stx - 3, baseY, 6, stiltsH);
    // Cross-brace
    if (i < numStilts - 1) {
      const nx = sx + Math.round(w * 0.1 + (i + 1) * (w * 0.8 / (numStilts - 1)));
      ctx.strokeStyle = "#3a2410";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(stx, baseY + 4);
      ctx.lineTo(nx, baseY + stiltsH - 4);
      ctx.stroke();
    }
  }

  // Platform floor
  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = "#4a3018";
  ctx.fillRect(sx - 2, baseY - 6, w + 4, 8);
  ctx.fillStyle = "#6a4828";
  for (let lx = 0; lx < w + 4; lx += 10) {
    ctx.fillRect(sx - 2 + lx, baseY - 6, 8, 8);
  }
  ctx.fillStyle = "#2e1c0c";
  ctx.fillRect(sx - 2, baseY - 6, w + 4, 2);
  ctx.fillRect(sx - 2, baseY + 2, w + 4, 2);

  // Rope ladder
  const ladderX = sx + Math.round(w * 0.72);
  ctx.strokeStyle = "#7a5830";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ladderX - 5, baseY); ctx.lineTo(ladderX - 5, baseY + stiltsH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ladderX + 3, baseY); ctx.lineTo(ladderX + 3, baseY + stiltsH); ctx.stroke();
  ctx.lineWidth = 1.5;
  for (let ry = baseY + 4; ry < baseY + stiltsH - 2; ry += 7) {
    ctx.beginPath(); ctx.moveTo(ladderX - 5, ry); ctx.lineTo(ladderX + 3, ry); ctx.stroke();
  }

  if (!roofless) {
    // Roof (full-width, two-tone pitched)
    const ridgeY = houseTopY + Math.round(roofH * 0.30);
    ctx.fillStyle = "#341e0c";
    ctx.fillRect(sx - 2, houseTopY, w + 4, ridgeY - houseTopY + 1);
    ctx.fillStyle = "#5c3818";
    ctx.fillRect(sx - 2, ridgeY, w + 4, wallY - ridgeY);
    const shingleH = 4;
    for (let ly = 4; ly < wallY - ridgeY - 2; ly += shingleH + 2) {
      ctx.fillStyle = "#7a5028";
      ctx.fillRect(sx - 2, ridgeY + ly, w + 4, shingleH);
      ctx.fillStyle = "#341e0c";
      ctx.fillRect(sx - 2, ridgeY + ly + shingleH, w + 4, 1);
    }
    ctx.fillStyle = "#200e04";
    ctx.fillRect(sx - 2, ridgeY - 2, w + 4, 4);
    ctx.fillStyle = "#9a7040";
    ctx.fillRect(sx - 2, ridgeY - 1, w + 4, 2);
    ctx.fillStyle = "#9a7040";
    ctx.fillRect(sx, houseTopY + 2, Math.round(w * 0.55), 2);

    // Eave
    ctx.fillStyle = "#200e04";
    ctx.fillRect(sx - 3, wallY - 5, w + 6, 8);
    ctx.fillStyle = "#0e0604";
    ctx.fillRect(sx - 3, wallY + 3, w + 6, 2);
  }

  const doorOpen = getFrontDoorOpenFactor(building, roofless);
  const doorW = façadeDoorPxFromBuilding(building, w);
  const doorH2 = wallH - 5;
  const doorX = sx + Math.round(w / 2) - Math.round(doorW / 2);
  const doorY = wallY + wallH - doorH2;

  if (!roofless) {
    ctx.fillStyle = "#4a2e14";
    ctx.fillRect(sx + 2, wallY, w - 4, wallH);
    ctx.fillStyle = "#1e0e04";
    for (let lx = 6; lx < w - 4; lx += 7) {
      ctx.fillRect(sx + 2 + lx, wallY, 1, wallH);
    }
    ctx.fillStyle = "#6a4828";
    ctx.fillRect(sx + 2, wallY, w - 4, 3);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(sx + 2, wallY, 3, wallH);
    ctx.fillRect(sx + w - 5, wallY, 3, wallH);

    const winR = Math.max(5, Math.round(Math.min(wallH, w / 6) * 0.4));
    for (const fx of [0.25, 0.65]) {
      const wx = sx + Math.round(w * fx);
      const wy = wallY + Math.round(wallH * 0.35);
      ctx.fillStyle = "#2c1a08";
      ctx.beginPath(); ctx.arc(wx, wy, winR + 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#b8e8b8";
      ctx.beginPath(); ctx.arc(wx, wy, winR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath(); ctx.arc(wx - 2, wy - 2, Math.round(winR * 0.45), 0, Math.PI * 2); ctx.fill();
    }

    drawSplitWoodenDoor(p, doorX, doorY, doorW, doorH2, doorOpen, 2, false);
  } else {
    ctx.strokeStyle = blend(p.wallDark, p.wallLine, 0.55);
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 2 + 0.5, wallY + 0.5, w - 5, wallH - 1);
    ctx.strokeStyle = blend(p.wallLight, "#000", 0.35);
    ctx.beginPath();
    ctx.moveTo(sx + 2, wallY + 0.5);
    ctx.lineTo(sx + w - 2, wallY + 0.5);
    ctx.stroke();
    drawSplitWoodenDoor(p, doorX, doorY, doorW, doorH2, 1, 2, true);
  }

  ctx.restore();
}

function drawCastle(building, sx, sy, w, h, variant, roofless) {
  const p = BUILDING_PALETTES[variant] || BUILDING_PALETTES.stone;
  const wallH = Math.max(60, Math.min(90, Math.round(h * 0.30)));
  const roofH = h - wallH;
  const wallY = sy + roofH;
  const towerW = Math.round(w * 0.16);
  const towerH = wallH + Math.round(h * 0.12);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.42)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 6;
  ctx.shadowOffsetY = 10;

  if (!roofless) {
    // Roof / upper keep — full-width two-tone pitched
    const ridgeY = sy + Math.round(roofH * 0.30);
    ctx.fillStyle = p.roofDark;
    ctx.fillRect(sx + towerW, sy, w - towerW * 2, ridgeY - sy + 1);
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = p.roofBase;
    ctx.fillRect(sx + towerW, ridgeY, w - towerW * 2, wallY - ridgeY);
    const shingleH = 6;
    for (let ly = 4; ly < wallY - ridgeY - 2; ly += shingleH + 2) {
      ctx.fillStyle = p.roofMid;
      ctx.fillRect(sx + towerW, ridgeY + ly, w - towerW * 2, shingleH);
      ctx.fillStyle = p.roofDark;
      ctx.fillRect(sx + towerW, ridgeY + ly + shingleH, w - towerW * 2, 1);
    }
    ctx.fillStyle = p.roofRidge;
    ctx.fillRect(sx + towerW, ridgeY - 2, w - towerW * 2, 5);
    ctx.fillStyle = p.roofLight;
    ctx.fillRect(sx + towerW, ridgeY - 1, w - towerW * 2, 3);
    ctx.fillStyle = p.roofLight;
    ctx.fillRect(sx + towerW + 4, sy + 2, Math.round((w - towerW * 2) * 0.55), 3);
  } else {
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  }

  // Side towers (drawn behind wall)
  for (const tx of [sx, sx + w - towerW]) {
    ctx.fillStyle = p.wall;
    ctx.fillRect(tx, wallY - towerH + wallH, towerW, towerH);
    // Tower stone texture
    ctx.fillStyle = p.wallDark;
    for (let ly = 0; ly < towerH; ly += 9) {
      const offset = Math.floor(ly / 9) % 2 === 0 ? 0 : 10;
      for (let lx = -10 + offset; lx < towerW; lx += 20) {
        ctx.fillRect(tx + lx, wallY - towerH + wallH + ly, 19, 8);
      }
    }
    ctx.fillStyle = p.wallLight;
    ctx.fillRect(tx, wallY - towerH + wallH, towerW, 3);
    // Tower battlements (merlons)
    const merlonTop = wallY - towerH + wallH;
    ctx.fillStyle = p.wall;
    for (let mx = 2; mx < towerW - 2; mx += 8) {
      ctx.fillRect(tx + mx, merlonTop - 8, 5, 9);
    }
    // Arrow slit windows on tower
    ctx.fillStyle = p.wallDark;
    ctx.fillRect(tx + Math.round(towerW / 2) - 1, wallY - towerH + wallH + 10, 3, 10);
    ctx.fillStyle = p.win;
    ctx.fillRect(tx + Math.round(towerW / 2) - 1, wallY - towerH + wallH + 10, 3, 10);
  }

  const doorOpen = getFrontDoorOpenFactor(building, roofless);
  const doorW = façadeDoorPxFromBuilding(building, w);
  const doorH = wallH - 4;
  const doorX = sx + Math.round(w / 2) - Math.round(doorW / 2);
  const doorY2 = wallY + wallH - doorH;
  const mwX = sx + towerW;
  const mwW = w - towerW * 2;

  if (!roofless) {
    ctx.fillStyle = p.wall;
    ctx.fillRect(mwX, wallY, mwW, wallH);

    ctx.fillStyle = p.wallDark;
    for (let ly = 0; ly < wallH; ly += 9) {
      const offset = Math.floor(ly / 9) % 2 === 0 ? 0 : 14;
      for (let lx = -14 + offset; lx < mwW; lx += 28) {
        ctx.fillRect(mwX + lx, wallY + ly, 27, 8);
      }
    }
    ctx.fillStyle = p.wallLine;
    for (let ly = 0; ly < wallH; ly += 9) {
      ctx.fillRect(mwX, wallY + ly, mwW, 1);
    }

    ctx.fillStyle = p.wallLight;
    ctx.fillRect(mwX, wallY, mwW, 3);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(mwX, wallY, 4, wallH);
    ctx.fillRect(sx + w - towerW - 4, wallY, 4, wallH);

    for (let mx = mwX + 4; mx < sx + w - towerW - 4; mx += 10) {
      ctx.fillStyle = p.wall;
      ctx.fillRect(mx, wallY - 8, 6, 9);
    }

    ctx.fillStyle = p.eave;
    ctx.fillRect(mwX - 2, wallY - 5, mwW + 4, 7);
    ctx.fillStyle = blend(p.eave, "#000", 0.5);
    ctx.fillRect(mwX - 2, wallY + 2, mwW + 4, 3);

    const numWin = Math.max(2, Math.floor(mwW / 32));
    const winW = 6; const winH = Math.max(14, wallH - 16);
    for (let i = 0; i < numWin; i += 1) {
      const wx = mwX + Math.round((i + 0.5) * mwW / numWin) - Math.round(winW / 2);
      const midX = wx + winW / 2;
      if (Math.abs(midX - (sx + w / 2)) < doorW + 14) continue;
      drawHouseWindow(wx, wallY + 6, winW, winH, p);
    }

    ctx.fillStyle = blend(p.wall, "#000", 0.5);
    ctx.fillRect(doorX - 3, doorY2 - 4, doorW + 6, doorH + 4);
    drawSplitWoodenDoor(p, doorX, doorY2, doorW, doorH, doorOpen, 3, false);
    ctx.fillStyle = blend(p.door, "#000", 0.4);
    for (const bandY of [doorY2 + Math.round(doorH * 0.3), doorY2 + Math.round(doorH * 0.65)]) {
      ctx.fillRect(doorX, bandY, doorW, 3);
    }
    ctx.fillStyle = p.wallLight;
    ctx.fillRect(doorX - 3, doorY2 - 4, doorW + 6, 3);
  } else {
    ctx.strokeStyle = blend(p.wallDark, p.wallLine, 0.5);
    ctx.lineWidth = 2;
    ctx.strokeRect(mwX + 0.5, wallY + 0.5, mwW - 1, wallH - 1);
    ctx.strokeStyle = blend(p.wallLight, "#000", 0.35);
    ctx.beginPath();
    ctx.moveTo(mwX, wallY + 0.5);
    ctx.lineTo(mwX + mwW, wallY + 0.5);
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = blend(p.wall, "#000", 0.55);
    ctx.fillRect(doorX - 3, doorY2 - 4, doorW + 6, doorH + 4);
    ctx.restore();
    drawSplitWoodenDoor(p, doorX, doorY2, doorW, doorH, 1, 3, true);
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = blend(p.door, "#000", 0.48);
    for (const bandY of [doorY2 + Math.round(doorH * 0.3), doorY2 + Math.round(doorH * 0.65)]) {
      ctx.fillRect(doorX, bandY, doorW, 3);
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = p.wallLight;
    ctx.fillRect(doorX - 3, doorY2 - 4, doorW + 6, 3);
    ctx.restore();
  }

  ctx.restore();
  drawBuildingFrontDetail(sx + towerW, sx + w - towerW, sy + h, variant, p);
}

function drawHouseWindow(x, y, w, h, p) {
  ctx.fillStyle = p.wallDark;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = p.win;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(x + 1, y + 1, Math.round(w / 2) - 1, Math.round(h / 2) - 1);
  ctx.fillStyle = p.wallDark;
  ctx.fillRect(x + Math.round(w / 2), y, 1, h);
  ctx.fillRect(x, y + Math.round(h / 2), w, 1);
}

function drawBuildingFrontDetail(leftX, rightX, groundY, variant, p) {
  const detailW = rightX - leftX;
  const ground = p ? p.ground : "#5a7a44";

  ctx.fillStyle = ground;
  ctx.fillRect(leftX, groundY, detailW, 5);

  if (variant === "desert") {
    ctx.fillStyle = "#c8e06a";
    for (let i = 0; i < 3; i += 1) {
      const bx = leftX + 10 + Math.round(i * detailW / 3);
      ctx.fillRect(bx, groundY - 7, 3, 9);
      ctx.fillRect(bx - 3, groundY - 3, 9, 3);
    }
    return;
  }

  if (variant === "ember") {
    for (let i = 0; i < 4; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? "#8b3010" : "#6a2808";
      ctx.fillRect(leftX + 8 + Math.round(i * detailW / 4), groundY - 3, 6, 4);
    }
    return;
  }

  const flowerColors = variant === "stone" ? ["#d0e8a0", "#b8d480", "#8ec860"] :
                       variant === "wood" ? ["#e8b840", "#c87830", "#90b820"] :
                       ["#e86870", "#f8c840", "#78c8f0"];
  for (let i = 0; i < 5; i += 1) {
    const fx = leftX + 8 + Math.round(i * detailW / 5);
    ctx.fillStyle = "#3a6030";
    ctx.fillRect(fx, groundY - 5, 2, 6);
    ctx.fillStyle = flowerColors[i % flowerColors.length];
    ctx.fillRect(fx - 1, groundY - 8, 4, 4);
  }
}

function drawLighting() {
  const self = state.players.get(state.selfId);
  // Compute the player's screen position via the same projection used for the world transform
  // so the lighting tracks them regardless of zoom or camera rotation.
  let lightX = canvas.width / 2;
  let lightY = canvas.height / 2;
  if (self) {
    const screen = worldToScreenPoint(
      Number.isFinite(self.renderX) ? self.renderX : self.x,
      Number.isFinite(self.renderY) ? self.renderY : self.y
    );
    lightX = screen.x;
    lightY = screen.y;
  }
  const radius = Math.max(canvas.width, canvas.height) * 0.82;
  const gradient = ctx.createRadialGradient(lightX, lightY, 80, lightX, lightY, radius);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "multiply";
  gradient.addColorStop(0, "rgba(255, 244, 205, 0.98)");
  gradient.addColorStop(0.45, "rgba(222, 214, 180, 0.94)");
  gradient.addColorStop(1, "rgba(96, 95, 118, 0.72)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = "screen";
  const glow = ctx.createRadialGradient(lightX - 140, lightY - 180, 0, lightX - 140, lightY - 180, 360);
  glow.addColorStop(0, "rgba(255, 226, 132, 0.16)");
  glow.addColorStop(1, "rgba(255, 226, 132, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawPortal(sx, sy, tx, ty) {
  const portal = getPortalAtTile(tx, ty);
  if (!portal) return;

  if (portal.style === "stargate") {
    drawStargatePortal(sx, sy, tx, ty, portal);
    return;
  }

  const time = performance.now() / 1000;
  const color = portal.color || "#75f0ff";
  const T = TILE_SIZE;
  const pulse = 0.5 + Math.sin(time * 2.4) * 0.5;

  // Arch geometry — centred on the portal tile, rising above it
  const cx = sx + T * 0.5;
  const baseY = sy + T * 0.88;
  const openW = T * 0.62;       // half-width of the opening
  const openH = T * 1.48;       // full height of opening (rect + semicap)
  const capR = openW;            // radius of the semicircular top cap
  const rectH = openH - capR;   // height of the rectangular body
  const capCY = baseY - rectH - capR; // centre of the arch cap circle
  const pillarW = 7;

  drawEllipseShadow(cx, baseY + 4, openW * 2.4, 10, 0.5);

  // Clip to arch shape and draw the glowing interior
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - openW, baseY);
  ctx.lineTo(cx - openW, capCY);
  ctx.arc(cx, capCY, capR, Math.PI, 0, false);
  ctx.lineTo(cx + openW, baseY);
  ctx.closePath();
  ctx.clip();
  drawPortalEventHorizon(cx, baseY - openH * 0.52, capR * 1.1, portal, time);
  ctx.restore();

  // --- Stone arch frame ---

  // Small base slab
  const slabW = openW * 2 + pillarW * 2 + 8;
  ctx.fillStyle = "#251808";
  ctx.fillRect(cx - slabW / 2, baseY, slabW, 6);
  ctx.fillStyle = "#3a2412";
  ctx.fillRect(cx - slabW / 2, baseY, slabW, 3);

  // Pillars
  for (const side of [-1, 1]) {
    const px = side === -1 ? cx - openW - pillarW : cx + openW;
    const pillarH = rectH + 4;
    const py = baseY - pillarH;
    // Body
    ctx.fillStyle = "#2e1e0e";
    ctx.fillRect(px, py, pillarW, pillarH);
    // Highlight
    ctx.fillStyle = "#4a3018";
    ctx.fillRect(px, py, 2, pillarH);
    ctx.fillStyle = "#1a0e06";
    ctx.fillRect(px + pillarW - 2, py, 2, pillarH);
    // Cap
    ctx.fillStyle = "#3c2814";
    ctx.fillRect(px - 2, py, pillarW + 4, 5);
    // Rune glyph
    ctx.save();
    ctx.globalAlpha = 0.35 + pulse * 0.45;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4 + pulse * 4;
    const ry = py + pillarH * 0.42;
    ctx.fillRect(px + 2, ry, pillarW - 4, 2);
    ctx.fillRect(px + Math.floor(pillarW / 2) - 1, ry - 5, 2, 10);
    ctx.restore();
  }

  // Arch top — thick stone arc drawn as a filled ring segment
  ctx.save();
  ctx.strokeStyle = "#2e1e0e";
  ctx.lineWidth = pillarW * 2 + 2;
  ctx.beginPath();
  ctx.arc(cx, capCY, capR + pillarW, Math.PI, 0, false);
  ctx.stroke();
  // Outer shadow edge
  ctx.strokeStyle = "#1a0e06";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, capCY, capR + pillarW * 2, Math.PI, 0, false);
  ctx.stroke();
  // Inner highlight edge
  ctx.strokeStyle = "#4a3018";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, capCY, capR + pillarW - 1, Math.PI, 0, false);
  ctx.stroke();
  ctx.restore();

  // Glowing inner rim around the entire arch opening
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.38 + pulse * 0.38;
  ctx.shadowColor = color;
  ctx.shadowBlur = 7 + pulse * 6;
  ctx.beginPath();
  ctx.moveTo(cx - openW, baseY);
  ctx.lineTo(cx - openW, capCY);
  ctx.arc(cx, capCY, capR, Math.PI, 0, false);
  ctx.lineTo(cx + openW, baseY);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.restore();

  // Portal name
  ctx.font = "bold 11px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(8,12,18,0.85)";
  ctx.fillStyle = color;
  ctx.strokeText(portal.name, cx, baseY + 18);
  ctx.fillText(portal.name, cx, baseY + 18);
}

function drawStargatePortal(sx, sy, tx, ty, portal) {
  const time = performance.now() / 1000;
  const color = portal.color || "#67f0ff";
  const T = TILE_SIZE;
  const cx = sx + T * 0.5;
  const cy = sy + T * 0.5;
  const outerR = T * 1.75;
  const innerR = T * 1.18;
  const pulse = 0.5 + Math.sin(time * 2.8) * 0.5;

  drawEllipseShadow(cx - outerR, cy + outerR * 0.66, outerR * 2, 18, 0.4);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.clip();
  drawPortalEventHorizon(cx, cy, innerR, portal, time, true);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#1a2434";
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR - 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#415369";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR - 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.7 + pulse * 0.2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR - 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, innerR + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#dffaff";
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  for (let i = 0; i < 12; i += 1) {
    const a = time * 0.7 + (i / 12) * Math.PI * 2;
    const r = outerR - 7 + Math.sin(time * 3 + i) * 1.5;
    ctx.fillRect(cx + Math.cos(a) * r - 1, cy + Math.sin(a) * r - 1, 2, 2);
  }
  ctx.restore();

  ctx.save();
  ctx.font = "bold 11px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(8,12,18,0.85)";
  ctx.fillStyle = color;
  ctx.strokeText(portal.name, cx, cy + outerR + 18);
  ctx.fillText(portal.name, cx, cy + outerR + 18);
  ctx.restore();
}

function drawPortalEventHorizon(cx, cy, r, portal, time, stargate = false) {
  // Deep arcane void
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  if (stargate) {
    grad.addColorStop(0, "#061520");
    grad.addColorStop(0.45, "#0b3142");
    grad.addColorStop(1, "#050b12");
  } else {
    grad.addColorStop(0, "#0a0420");
    grad.addColorStop(0.55, "#0e0828");
    grad.addColorStop(1, "#18103a");
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  if (portal?.preview?.tiles) {
    const size = portal.preview.size;
    const viewD = r * 2;
    const cellW = viewD / size;
    const cellH = viewD / size;
    const ox = cx - r;
    const oy = cy - r;

    for (let py = 0; py < size; py += 1) {
      for (let px = 0; px < size; px += 1) {
        const dx = (px + 0.5) / size - 0.5;
        const dy = (py + 0.5) / size - 0.5;
        const dist = Math.hypot(dx, dy) * 2;
        if (dist > 1.05) continue;
        const tile = portal.preview.tiles[py * size + px];
        const waveX = Math.sin(time * 1.6 + py * 0.4 + px * 0.2) * 3 * (0.3 + dist);
        const waveY = Math.cos(time * 1.2 + px * 0.3 + py * 0.25) * 2.5 * (0.3 + dist);
        drawPortalPreviewTile(tile, ox + px * cellW + waveX, oy + py * cellH + waveY, cellW + 1, cellH + 1, px, py, time, portal?.previewTheme);
      }
    }
  }

  const rgb = hexToRgb(portal?.color || "#75f0ff");

  // Magical vortex wisps rotating around center
  for (let wisp = 0; wisp < 3; wisp += 1) {
    const wispAngle = time * 0.7 + (wisp / 3) * Math.PI * 2;
    const wx = cx + Math.cos(wispAngle) * r * 0.28;
    const wy = cy + Math.sin(wispAngle) * r * 0.28;
    const wispGrad = ctx.createRadialGradient(wx, wy, 0, cx, cy, r);
    wispGrad.addColorStop(0, `rgba(${rgb}, 0.38)`);
    wispGrad.addColorStop(0.45, `rgba(${rgb}, 0.08)`);
    wispGrad.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = wispGrad;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (stargate) {
    ctx.save();
    ctx.strokeStyle = `rgba(${rgb}, 0.42)`;
    ctx.lineWidth = 3;
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * (0.38 + ring * 0.18), 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let spokes = 0; spokes < 10; spokes += 1) {
      const a = time * 0.7 + (spokes / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.18, cy + Math.sin(a) * r * 0.18);
      ctx.lineTo(cx + Math.cos(a) * r * 0.88, cy + Math.sin(a) * r * 0.88);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    // Rotating spiral arms
    ctx.save();
    for (let arm = 0; arm < 2; arm += 1) {
      ctx.beginPath();
      const armOffset = arm * Math.PI;
      for (let step = 0; step <= 40; step += 1) {
        const t = step / 40;
        const angle = time * 0.9 + armOffset + t * Math.PI * 3.5;
        const sr = t * r * 0.88;
        const spx = cx + Math.cos(angle) * sr;
        const spy = cy + Math.sin(angle) * sr;
        if (step === 0) ctx.moveTo(spx, spy);
        else ctx.lineTo(spx, spy);
      }
      ctx.strokeStyle = `rgba(${rgb}, 0.25)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();

    // Central arcane glow
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.45);
    coreGrad.addColorStop(0, `rgba(255, 255, 255, 0.18)`);
    coreGrad.addColorStop(0.5, `rgba(${rgb}, 0.12)`);
    coreGrad.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Floating arcane motes
    for (let i = 0; i < 6; i += 1) {
      const moteAngle = time * 0.5 + i * (Math.PI / 3);
      const moteR = r * 0.2 + Math.sin(time * 1.4 + i * 1.1) * r * 0.3;
      const mx = cx + Math.cos(moteAngle) * moteR;
      const my = cy + Math.sin(moteAngle) * moteR;
      const brightness = 0.5 + Math.sin(time * 2.5 + i * 0.9) * 0.4;
      ctx.shadowColor = `rgba(${rgb}, 0.9)`;
      ctx.shadowBlur = 6;
      ctx.fillStyle = `rgba(255,255,255,${brightness * 0.7})`;
      ctx.beginPath();
      ctx.arc(mx, my, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
}

function drawPortalPreviewTile(tile, x, y, w, h, px, py, time, theme = state.worldTheme) {
  const colors = getTileColors(tile, theme);
  ctx.fillStyle = colors[0];
  ctx.fillRect(x, y, w, h);

  if (tile === TILE.WATER) {
    ctx.fillStyle = colors[1];
    ctx.fillRect(x, y + h * (0.35 + Math.sin(time * 2 + px) * 0.08), w, h * 0.16);
    return;
  }

  if (tile === TILE.LAVA) {
    ctx.fillStyle = colors[1];
    ctx.fillRect(x + w * 0.18, y + h * 0.35, w * 0.64, h * 0.18);
    ctx.fillStyle = colors[2];
    ctx.fillRect(x + w * 0.42, y + h * 0.62, w * 0.36, h * 0.12);
    return;
  }

  if (tile === TILE.PATH || tile === TILE.STONE || tile === TILE.FLOOR) {
    ctx.fillStyle = colors[1] || colors[0];
    ctx.fillRect(x, y + h * 0.42, w, Math.max(1, h * 0.18));
    return;
  }

  if (tile === TILE.TREE) {
    ctx.fillStyle = colors[1] || colors[0];
    ctx.beginPath();
    ctx.arc(x + w * 0.5, y + h * 0.42, Math.max(2, Math.min(w, h) * 0.36), 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (tile === TILE.FLOWERS) {
    ctx.fillStyle = colors[1] || "#ffd166";
    ctx.fillRect(x + w * 0.22, y + h * 0.24, Math.max(1, w * 0.18), Math.max(1, h * 0.18));
    ctx.fillStyle = colors[2] || "#f26d6d";
    ctx.fillRect(x + w * 0.62, y + h * 0.58, Math.max(1, w * 0.18), Math.max(1, h * 0.18));
  }
}

function drawPortalTransitionOverlay() {
  const fx = state.portalTransition;
  if (!fx) {
    return;
  }

  const now = performance.now();
  const pct = Math.min(1, Math.max(0, (now - fx.startedAt) / fx.duration));
  if (pct >= 1) {
    state.portalTransition = null;
    return;
  }

  const color = fx.color || "#75f0ff";
  const rgb = hexToRgb(color);
  const travel = pct < 0.5 ? pct / 0.5 : (1 - pct) / 0.5;
  const radius = Math.hypot(canvas.width, canvas.height) * (0.18 + travel * 0.78);
  const alpha = 0.18 + travel * 0.56;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = `rgba(5, 8, 18, ${0.16 + travel * 0.42})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "screen";

  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    Math.max(1, radius * 0.08),
    canvas.width / 2,
    canvas.height / 2,
    radius
  );
  gradient.addColorStop(0, `rgba(255,255,255,${0.18 + travel * 0.18})`);
  gradient.addColorStop(0.34, `rgba(${rgb},${alpha})`);
  gradient.addColorStop(0.72, `rgba(${rgb},${alpha * 0.28})`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = `rgba(255,255,255,${0.25 + travel * 0.35})`;
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i += 1) {
    const r = radius * (0.22 + i * 0.18) + Math.sin(now * 0.01 + i) * 18;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function drawTree(sx, sy, tx, ty) {
  const crown = hash2(tx, ty, 11);
  const frost = getTile(tx, ty + 1) === TILE.SNOW || getTile(tx, ty - 1) === TILE.SNOW;
  const ember = getTile(tx, ty + 1) === TILE.DARK_GRASS && tx > 80 && ty < -70;
  const leaf = frost ? "#5d8183" : ember ? "#244030" : crown > 0.5 ? "#2f6a45" : "#23583d";
  const leafDark = frost ? "#365d62" : ember ? "#1b2f28" : "#194532";
  const leafLight = frost ? "#8aa9a2" : ember ? "#496c3b" : "#5f8d4a";
  const trunk = ember ? "#4b2d27" : "#5b3b26";
  const offset = Math.round((hash2(tx, ty, 15) - 0.5) * 8);
  const height = 36 + Math.round(hash2(tx, ty, 16) * 14);
  const baseY = sy + 27;

  drawCastShadow(sx + 6 + offset, sy + 21, 34, 12, 0.38);
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.36)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 6;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = trunk;
  ctx.fillRect(sx + 13 + offset, baseY - 16, 8, 17);
  ctx.fillStyle = leafDark;
  ctx.fillRect(sx - 3 + offset, baseY - height + 12, 38, 20);
  ctx.fillStyle = leaf;
  ctx.fillRect(sx - 7 + offset, baseY - height + 19, 46, 18);
  ctx.fillStyle = leafLight;
  ctx.fillRect(sx + 1 + offset, baseY - height + 6, 30, 14);
  ctx.fillStyle = leaf;
  ctx.fillRect(sx + 5 + offset, baseY - height, 22, 10);
  ctx.restore();

  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(sx + 5 + offset, baseY - height + 9, 9, 3);
  ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
  ctx.fillRect(sx + 20 + offset, baseY - height + 24, 13, 4);
}

function drawHouseWall(sx, sy, tx, ty, colors) {
  const northTile = getTile(tx, ty - 1);
  const southTile = getTile(tx, ty + 1);
  const isRoofEdge = northTile !== TILE.WALL && northTile !== TILE.FLOOR && northTile !== TILE.DOOR;

  drawCastShadow(sx + 5, sy + 22, TILE_SIZE + 5, 8, 0.28);
  ctx.fillStyle = colors[1];
  ctx.fillRect(sx, sy + 4, TILE_SIZE, 24);
  ctx.fillStyle = colors[0];
  ctx.fillRect(sx + 2, sy + 10, TILE_SIZE - 4, 16);
  ctx.fillStyle = colors[2];
  ctx.fillRect(sx + 4, sy + 8, TILE_SIZE - 8, 2);
  ctx.fillStyle = "#d7c09a";
  ctx.fillRect(sx + 6, sy + 12, 4, 4);
  ctx.fillRect(sx + 22, sy + 12, 4, 4);
  ctx.fillStyle = "#9d5a39";
  ctx.fillRect(sx + 11, sy + 18, 10, 5);

  if (isRoofEdge) {
    drawRoof(sx, sy, colors, southTile === TILE.WALL || southTile === TILE.FLOOR || southTile === TILE.DOOR);
  }
}

function drawHouseFloor(sx, sy, tx, ty, colors) {
  scatterPixels(sx, sy, tx, ty, colors[1], 4, 2);
  ctx.fillStyle = colors[2];
  for (let i = 0; i < 4; i += 1) {
    ctx.fillRect(sx, sy + 3 + i * 7, TILE_SIZE, 1);
  }
}

function drawHouseDoor(sx, sy, tx, ty, colors) {
  drawCastShadow(sx + 5, sy + 22, TILE_SIZE + 5, 8, 0.3);
  ctx.fillStyle = colors[1];
  ctx.fillRect(sx + 8, sy + 2, 16, TILE_SIZE - 3);
  ctx.fillStyle = colors[2];
  ctx.fillRect(sx + 10, sy + 4, 12, TILE_SIZE - 7);
  ctx.fillStyle = "#c8a040";
  ctx.fillRect(sx + 20, sy + 15, 2, 2);
  drawRoof(sx, sy, colors, true);
  ctx.fillStyle = "#5f381e";
  ctx.fillRect(sx + 11, sy + 19, 2, 9);
  ctx.fillRect(sx + 17, sy + 19, 2, 9);
}

function drawRoof(sx, sy, colors, broad = false) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.fillRect(sx + 3, sy + 8, TILE_SIZE - 2, 4);
  ctx.fillStyle = "#7c3f31";
  ctx.fillRect(sx - 2, sy + 1, TILE_SIZE + 4, 7);
  ctx.fillStyle = "#a1513f";
  ctx.fillRect(sx, sy + 2, TILE_SIZE, 4);
  if (broad) {
    ctx.fillStyle = "#5d281f";
    ctx.fillRect(sx + 4, sy, TILE_SIZE - 8, 2);
  }
  ctx.fillStyle = colors[2];
  ctx.fillRect(sx + 2, sy + 4, 8, 1);
  ctx.fillRect(sx + 22, sy + 4, 8, 1);
  ctx.fillStyle = "#5f381e";
  ctx.fillRect(sx + 13, sy - 1, 6, 4);
  ctx.fillStyle = "#c96f4b";
  ctx.fillRect(sx + 14, sy - 3, 4, 3);
}

function drawCastShadow(x, y, w, h, alpha) {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(x + 3, y + 2, w, h);
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.55})`;
  ctx.fillRect(x + 7, y + h, Math.max(2, w - 8), 3);
}

function drawEllipseShadow(x, y, w, h, alpha) {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function getTile(tileX, tileY) {
  const cx = Math.floor(tileX / CHUNK_SIZE);
  const cy = Math.floor(tileY / CHUNK_SIZE);
  const chunk = state.chunks.get(chunkKey(cx, cy));
  if (!chunk) {
    return TILE.DARK_GRASS;
  }

  const localX = modulo(tileX, CHUNK_SIZE);
  const localY = modulo(tileY, CHUNK_SIZE);
  return chunk.tiles[localY * CHUNK_SIZE + localX];
}

function getPortalAtTile(tileX, tileY) {
  for (const portal of state.portals.values()) {
    if (portal.x === tileX && portal.y === tileY) {
      return portal;
    }
  }
  return null;
}

function isInteriorTileCoordinate(tileX, tileY) {
  return tileX >= 9996 && tileY >= 9996 && tileY < 10014;
}

function chunkKey(cx, cy) {
  return `${cx},${cy}`;
}

function modulo(value, size) {
  return ((value % size) + size) % size;
}

function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function blend(hex, otherHex, amount) {
  const a = parseHexColor(hex);
  const b = parseHexColor(otherHex);
  const mix = (from, to) => Math.round(from + (to - from) * amount);
  return `rgb(${mix(a.r, b.r)}, ${mix(a.g, b.g)}, ${mix(a.b, b.b)})`;
}

function parseHexColor(hex) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  chunkCanvasCache.clear();
}

function makeDraggable(panel) {
  const head = panel.querySelector(".window-head");
  if (!head) return;
  let startX, startY, startLeft, startTop;

  head.style.cursor = "grab";

  head.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return; // don't drag when clicking buttons
    e.preventDefault();
    head.setPointerCapture(e.pointerId);
    head.style.cursor = "grabbing";

    // Get current position — convert from fixed positioning
    const rect = panel.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;

    // Switch from right/top to left/top positioning
    panel.style.right = "auto";
    panel.style.left = startLeft + "px";
    panel.style.top = startTop + "px";
  });

  head.addEventListener("pointermove", (e) => {
    if (e.buttons === 0) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const newLeft = Math.max(0, Math.min(window.innerWidth - 80, startLeft + dx));
    const newTop = Math.max(0, Math.min(window.innerHeight - 40, startTop + dy));
    panel.style.left = newLeft + "px";
    panel.style.top = newTop + "px";
  });

  head.addEventListener("pointerup", () => {
    head.style.cursor = "grab";
  });
}

function setStatus(text) {
  statusEl.textContent = text;
}

function setWorldTheme(theme) {
  const next = theme === SCI_FI_THEME ? SCI_FI_THEME : "fantasy";
  if (state.worldTheme === next) {
    return;
  }
  state.worldTheme = next;
  document.body.classList.toggle("theme-sci-fi", next === SCI_FI_THEME);
  if (next === SCI_FI_THEME) {
    document.body.classList.remove("theme-fantasy");
  } else {
    document.body.classList.add("theme-fantasy");
  }
  chunkCanvasCache.clear();
}

function syncWorldThemeFromSelf() {
  const self = state.players.get(state.selfId);
  if (!self) {
    return;
  }
  const cx = Math.floor(self.x / CHUNK_SIZE);
  const cy = Math.floor(self.y / CHUNK_SIZE);
  const chunk = state.chunks.get(chunkKey(cx, cy));
  if (chunk?.theme) {
    setWorldTheme(chunk.theme);
  }
}
