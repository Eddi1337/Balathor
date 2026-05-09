const isMobile = navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
if (isMobile) document.body.classList.add("mobile");

const canvas = document.querySelector("#game");
let ctx = canvas.getContext("2d", {
  alpha: false,
  desynchronized: true,
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
const equipmentPanel = document.querySelector("#equipmentPanel");
const bagsPanel = document.querySelector("#bagsPanel");
const equipmentClose = document.querySelector("#equipmentClose");
const bagsClose = document.querySelector("#bagsClose");
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
const potionSlotIconCanvas = document.querySelector("#potionSlotIcon");
const nearbyLoot = document.querySelector("#nearbyLoot");
const interactButton = document.querySelector("#interactButton");
const goldText = document.querySelector("#goldText");
const shopPanel = document.querySelector("#shopPanel");
const shopTitle = document.querySelector("#shopTitle");
const shopClose = document.querySelector("#shopClose");
const shopGold = document.querySelector("#shopGold");
const shopBuyList = document.querySelector("#shopBuyList");
const shopSellList = document.querySelector("#shopSellList");
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
let safeZoneTooltipPinTimer = null;

const TILE_SIZE = 32;

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
const DEBUG_HUD_STORAGE_KEY = "balathor.debugHud";
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
};

/** Mirrors server/src/index.js getBuildingPrice */
const BUILDING_TYPE_PRICES = { hut: 200, treehouse: 350, house: 500, big_house: 900, castle: 2000 };

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
  selfId: null,
  selectedClass: "ranger",
  torsoStyle: "tunic",
  weaponStyle: "classic",
  torsoColor: "#5cc8ff",
  weaponColor: "#ffd166",
  players: new Map(),
  npcs: new Map(),
  mobs: new Map(),
  chests: [],
  groundItems: [],
  inventory: Array(10).fill(null),
  equipment: { weapon: null, body: null, ring1: null, ring2: null },
  gold: 0,
  shop: null,
  speechBubbles: new Map(),
  combatFx: [],
  spellFx: [],
  spellCooldowns: new Map(),
  levelUpFx: [],
  portalTransition: null,
  chunks: new Map(),
  portals: new Map(),
  buildings: new Map(),
  roadsides: new Map(),
  benchSitUntil: 0,
  requestedChunks: new Set(),
  population: 0,
  input: { up: false, down: false, left: false, right: false },
  inputSeq: 0,
  camera: { x: 0, y: 0 },
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
  pendingHomeTeleportUntil: 0
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
    `Server tick: ${tickLabel}`
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
};

resize();
wireUi();
start();
requestAnimationFrame(frame);
setInterval(sendInput, 33);

async function start() {
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
    localStorage.setItem(SERVER_URL_STORAGE_KEY, normalizedUrl);
    setStatus("Connected");
    bootPanel.classList.remove("hidden");
    accountForm.classList.remove("hidden");
    form.classList.add("hidden");
    usernameInput.focus();
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
    resetToConnection(state.joined ? "Realm connection closed" : "Unable to connect");
  });

  socket.addEventListener("error", () => {
    setStatus("Connection failed");
  });
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
      return;
    }
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
    if (typeof message.tickRate === "number") {
      state.debugTickRate = message.tickRate;
    }
    if (typeof message.snapshotRate === "number") {
      state.debugSnapshotRate = message.snapshotRate;
    }
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
    requestVisibleChunks();
    return;
  }

  if (message.type === "teleport") {
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
    }
    state.camera.x = message.x * TILE_SIZE;
    state.camera.y = message.y * TILE_SIZE;
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
    const d = Number(message.durationMs);
    const ms = Number.isFinite(d) ? Math.max(400, Math.min(9000, d)) : 2800;
    state.benchSitUntil = performance.now() + ms;
    return;
  }

  if (message.type === "chunk") {
    const key = chunkKey(message.cx, message.cy);
    state.chunks.set(key, message);
    indexChunkPortals(message);
    indexChunkBuildings(message);
    indexChunkRoadsides(message);
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
    state.population = message.population;
    applySnapshot(message.players);
    applyNpcSnapshot(message.npcs || []);
    applyMobSnapshot(message.mobs || []);
    state.chests = message.chests || [];
    state.groundItems = message.groundItems || [];
    updateSelfInventory();
    if (state.activeWindow === "equipment") renderEquipment();
    if (state.activeWindow === "talent") renderTalentPanel();
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

    Object.assign(player, snapshot, {
      targetX: snapshot.x,
      targetY: snapshot.y,
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
    state.gold = 0;
    return;
  }
  state.inventory = Array.isArray(self.inventory) ? self.inventory : Array(10).fill(null);
  state.equipment = self.equipment || { weapon: null, body: null, ring1: null, ring2: null };
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

function applyCombatEvent(event) {
  if (event.hit && event.targetId && Number.isFinite(event.targetHp)) {
    if (event.targetKind === "player") {
      const player = state.players.get(event.targetId);
      if (player) {
        player.hp = event.targetHp;
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
    let isMoving = Boolean(player.moving);

    if (player.id === state.selfId) {
      isMoving = predictLocalPlayer(player, dt) || isMoving;
    }
    // Interpolation strategy:
    // - When local player is moving (local input), follow server target aggressively for responsiveness.
    // - When local player stops, ease toward server position slowly to avoid bouncing from network jitter.
    const fastBase = 0.00002; // aggressive follow
    const slowBase = 0.01; // gentle correction when stopping
    let follow;
    if (player.id === state.selfId) {
      const localInputActive = Boolean(state.input.up || state.input.down || state.input.left || state.input.right);
      follow = localInputActive ? 1 - Math.pow(fastBase, dt) : 1 - Math.pow(slowBase, dt);
      // If server and client disagree massively, snap to avoid long drift
      const err = Math.hypot(player.targetX - player.renderX, player.targetY - player.renderY);
      if (!localInputActive && err > 3.0) {
        player.renderX = player.targetX;
        player.renderY = player.targetY;
        player.renderMoving = false;
        continue;
      }
    } else {
      follow = 1 - Math.pow(0.0005, dt);
    }
    player.renderX += (player.targetX - player.renderX) * follow;
    player.renderY += (player.targetY - player.renderY) * follow;
    player.renderMoving = isMoving || Math.hypot(player.targetX - player.renderX, player.targetY - player.renderY) > 0.01;
    if (player.renderMoving) {
      player.walkPhase = (player.walkPhase || 0) + dt * 9;
      if (player.id === state.selfId) {
        state.benchSitUntil = 0;
      }
    }
  }

  const npcFollow = 1 - Math.pow(0.0005, dt);
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

function predictLocalPlayer(player, dt) {
  let dx = Number(state.input.right) - Number(state.input.left);
  let dy = Number(state.input.down) - Number(state.input.up);
  const length = Math.hypot(dx, dy);

  if (length === 0) {
    player.renderMoving = false;
    return false;
  }

  dx /= length;
  dy /= length;
  const speed = Number.isFinite(player.moveSpeed) ? player.moveSpeed : CLIENT_PLAYER_SPEED;
  player.renderX += dx * speed * dt;
  player.renderY += dy * speed * dt;
  player.facing = Math.atan2(dy, dx);
  player.renderMoving = true;
  return true;
}

function wireUi() {
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

  equipmentClose.addEventListener("click", () => setActiveGameWindow(null));
  bagsClose.addEventListener("click", () => setActiveGameWindow(null));
  talentClose.addEventListener("click", () => setActiveGameWindow(null));

  shopClose?.addEventListener("click", () => {
    closeShop();
  });

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
    syncSafeZoneIndicator(state.players.get(state.selfId));
  });

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

  // Potion slot click to use potion
  potionSlotEl?.addEventListener("click", () => { if (state.joined) useHealthPotion(); });

  makeDraggable(equipmentPanel);
  makeDraggable(bagsPanel);
  makeDraggable(shopPanel);
  makeDraggable(traderPanel);
  if (buyHousePanel) makeDraggable(buyHousePanel);
  if (companionOfferPanel) makeDraggable(companionOfferPanel);
  makeDraggable(talentPanel);

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
    if (!button) {
      return;
    }
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

  resumeButton.addEventListener("click", () => {
    closeMenu();
  });

  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!text) {
      return;
    }
    send({ type: "chat", text });
    chatInput.value = "";
  });

  chatInput?.addEventListener("keydown", (event) => {
    if (!state.joined || event.key !== "Enter" || event.isComposing) {
      return;
    }
    if (chatInput.value.trim().length > 0) {
      return;
    }
    event.preventDefault();
    chatInput.blur();
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
    const world = screenEventToWorld(event);
    state.lastPointerWorldX = world.x;
    state.lastPointerWorldY = world.y;
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
    if (!playerAttackBlockedBySafeZone()) {
      sendAttack(world.x, world.y);
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
      if (state.joined && state.pendingCompanionInvite) {
        closeCompanionInvitePanel();
        return;
      }
      if (state.joined && state.buyHouseOffer) {
        closeBuyHousePanel();
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

    if ((event.code === "Space" || event.key.toLowerCase() === "f") && state.joined && !isTextEntryTarget(event.target)) {
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

    // Q — use health potion
    if (event.key.toLowerCase() === "q" && state.joined && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      useHealthPotion();
      return;
    }

    // B — bags, C — character, T — talents
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

    updateInput(event, true);
  });
  window.addEventListener("keyup", (event) => updateInput(event, false));

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
    const halfW = canvas.width / 2;
    const halfH = canvas.height / 2;
    const worldX = (cx - halfW) / (TILE_SIZE * state.zoom) + state.camera.x / TILE_SIZE;
    const worldY = (cy - halfH) / (TILE_SIZE * state.zoom) + state.camera.y / TILE_SIZE;
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
  state.input[key] = pressed;
  if (pressed && homeCastTimer) cancelHomeCast(); // movement cancels cast
}

function clearMovementInput() {
  state.input.up = false;
  state.input.down = false;
  state.input.left = false;
  state.input.right = false;
  sendInput();
}

function setMovementInput(direction, pressed) {
  if (!Object.prototype.hasOwnProperty.call(state.input, direction)) {
    return;
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

let potionIconDrawn = false;
function renderPotionSlot() {
  if (!potionSlotEl || !potionCountEl) return;
  const count = countPotionsInInventory();
  potionCountEl.textContent = count;
  potionSlotEl.classList.toggle("has-potions", count > 0);
  potionSlotEl.classList.toggle("no-potions", count === 0);

  // Draw potion icon once
  if (!potionIconDrawn && potionSlotIconCanvas) {
    potionIconDrawn = true;
    const c = potionSlotIconCanvas.getContext("2d");
    const w = potionSlotIconCanvas.width;
    const h = potionSlotIconCanvas.height;
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
  traderPanel.classList.add("hidden");
  talentPanel.classList.add("hidden");
  equipmentButton.classList.remove("selected");
  bagsButton.classList.remove("selected");
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

function screenEventToWorld(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (event.clientX - rect.left) * scaleX;
  const cy = (event.clientY - rect.top) * scaleY;
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  return {
    x: (cx - halfW) / (TILE_SIZE * state.zoom) + state.camera.x / TILE_SIZE,
    y: (cy - halfH) / (TILE_SIZE * state.zoom) + state.camera.y / TILE_SIZE
  };
}

/** Matches server ownedHouseCornerInset / interior anchors */
function ownedHouseCornerInset(building) {
  const span = Math.min(building.w, building.h);
  return Math.min(2.55, Math.max(2.05, span * 0.26));
}

function getOwnedHouseHomeTreeWorldPos(building) {
  const d = ownedHouseCornerInset(building);
  return { x: building.x + d, y: building.y + d };
}

function getOwnedHouseChestWorldPos(building) {
  const d = ownedHouseCornerInset(building);
  return { x: building.x + building.w - d, y: building.y + d };
}

/** Bottom dining tile row centres (aligned with phantom residential slabs). */
function residentialPhantomCompanionAnchors(building) {
  const bw = Math.max(1, building.w | 0);
  const bh = Math.max(1, building.h | 0);
  const dineRow = bh - 4;
  const dineFloorY = building.y + dineRow + 0.48;
  return {
    bed: { wx: building.x + 1.5, wy: building.y + bh - 3.52 },
    /** Chair sits west of table (local x = w − 4), faces east (+x toward table). */
    dine: {
      wx: building.x + (bw - 4) + 0.52,
      wy: dineFloorY,
      facing: 0,
      restingBench: true
    },
    flirtStand: {
      wx: building.x + Math.min(bw - 3.8, bw * 0.48),
      wy: building.y + Math.min(bh - 4.9, dineRow + 0.62)
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

function refreshWorldHoverTooltip(event) {
  state.hoverTooltipText = "";
  state.hoverTooltipSmall = false;
  state.hoverTooltipX = event.offsetX;
  state.hoverTooltipY = event.offsetY;
  if (!state.joined || state.menuOpen || event.target !== canvas) {
    return;
  }

  const world = screenEventToWorld(event);
  for (const f of state.roadsides.values()) {
    const rfW = Math.max(1, Math.floor(Number(f.footprintW) || 1));
    const rfH = Math.max(1, Math.floor(Number(f.footprintH) || 1));
    const ax = f.x + rfW / 2;
    const ay = f.y + rfH / 2 + (f.kind === "market_stand" ? 0.1 : 0.55);
    const reach = f.kind === "market_stand" ? 1.45 : 1.12;
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

function syncMenuSessionInfo() {
  if (!state.joined) {
    return;
  }
  menuServerLabel.textContent = formatServerDisplay(state.activeServerUrl);
  menuPopulation.textContent = `${state.population} online`;
  const self = state.players.get(state.selfId);
  menuPosition.textContent = self ? `${Math.round(self.renderX)}, ${Math.round(self.renderY)}` : "—";
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

function clearWorldState() {
  state.players.clear();
  state.npcs.clear();
  state.mobs.clear();
  state.chests = [];
  state.groundItems = [];
  state.inventory = Array(10).fill(null);
  state.equipment = { weapon: null, body: null, ring1: null, ring2: null };
  state.gold = 0;
  closeShop();
  closeBuyHousePanel();
  state.speechBubbles.clear();
  state.combatFx = [];
  state.levelUpFx = [];
  state.portalTransition = null;
  state.chunks.clear();
  state.portals.clear();
  state.buildings.clear();
  state.roadsides.clear();
  state.requestedChunks.clear();
  state.population = 0;
  state.hoverTooltipText = "";
  state.pubPassoutUntil = 0;
}

function sendAttack() {
  // Allow optional target world coords (x,y) and compute facing client-side.
  const args = Array.from(arguments);
  let payload = { type: "attack" };
  if (args.length >= 2 && Number.isFinite(args[0]) && Number.isFinite(args[1])) {
    const tx = Number(args[0]);
    const ty = Number(args[1]);
    payload.targetX = tx;
    payload.targetY = ty;
    payload.facing = Number(Math.atan2(ty - (state.players.get(state.selfId)?.y || 0), tx - (state.players.get(state.selfId)?.x || 0)).toFixed(6));
    // Also set local facing for immediate feedback
    const self = state.players.get(state.selfId);
    if (self) self.facing = payload.facing;
  } else {
    // no coords: fire in current facing
    const self = state.players.get(state.selfId);
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
    name.textContent = `${message.name}: `;
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
  draw();
  requestAnimationFrame(frame);
}

function updateCamera(dt) {
  const self = state.players.get(state.selfId);
  if (!self) {
    return;
  }

  const targetX = self.renderX * TILE_SIZE;
  const targetY = self.renderY * TILE_SIZE;
  const follow = 1 - Math.pow(0.001, dt);
  state.camera.x += (targetX - state.camera.x) * follow;
  state.camera.y += (targetY - state.camera.y) * follow;
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
      halfW: canvas.width / TILE_SIZE / 2 / (state.zoom || 1),
      halfH: canvas.height / TILE_SIZE / 2 / (state.zoom || 1)
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
  nameEl.textContent = item ? item.name : "Empty";

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
    title.textContent = tree.name;

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

      const nameEl = document.createElement("div");
      nameEl.className = "talent-node-name";
      nameEl.textContent = spell.name;

      const desc = document.createElement("div");
      desc.className = "talent-node-desc";
      desc.textContent = spell.desc;

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
    node.title = `${spell.name} — ${spell.desc}${onBar ? " (on ability bar)" : ""}`;
    const ic = document.createElement("canvas");
    ic.width = 28;
    ic.height = 28;
    ic.className = "char-talent-mini-canvas";
    drawSpellIcon(ic, spell.id, true);
    const lbl = document.createElement("span");
    lbl.className = "char-talent-mini-name";
    lbl.textContent = spell.name;
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
  } else if (["cone", "wrath", "melee", "shield"].includes(cfg.kind)) {
    c.beginPath(); c.arc(10, 18, 15, -1.2, 0.15); c.stroke();
    c.beginPath(); c.moveTo(9, 20); c.lineTo(22, 7); c.stroke();
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
  holy_strike: { kind: "melee", color: "#ffee88", accent: "#ffffff", ttl: 620 },
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
    name.textContent = item.name;

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
    name.textContent = item.name;
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
    state.shop.isPub && state.shop.buildingName
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
  name.textContent = item.name;
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
    row.textContent = ground.item?.name || "Loot";
    nearbyLoot.append(row);
  }
}

function createItemIcon(item) {
  const icon = document.createElement("span");
  icon.className = `item-icon ${item.icon || item.type}`;
  icon.style.setProperty("--item-color", item.color || "#d7e4ef");
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
  traderPanel.classList.toggle("hidden", windowName !== "trader");
  talentPanel.classList.toggle("hidden", windowName !== "talent");
  equipmentButton.classList.toggle("selected", windowName === "equipment");
  bagsButton.classList.toggle("selected", windowName === "bags");
  if (windowName === "equipment") renderEquipment();
  if (windowName === "talent") renderTalentPanel();
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
    if (!npc.isTrader) continue;
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
    name.textContent = entry.item.name;
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
    name.textContent = item.name;
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

function draw() {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!state.joined) {
    drawTitleWorld();
    drawDebugHud();
    return;
  }

  const zoom = state.zoom || 1;
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  ctx.save();
  ctx.translate(halfW, halfH);
  ctx.scale(zoom, zoom);
  ctx.translate(-halfW, -halfH);

  drawWorld();
  drawPortals();
  drawPlayers();
  drawTreeCanopies();
  drawCombatFx();
  drawTalentSpellFx();
  drawLevelUpFx();
  drawLighting();

  ctx.restore();
  drawPortalTransitionOverlay();
  drawPubPassoutOverlay();
  drawWorldHoverTooltip();
  if (state.menuOpen) {
    syncMenuSessionInfo();
  }
  drawDebugHud();
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

  const drawFountainSprite = (cx, gy) => {
    ctx.save();
    drawEllipseShadow(cx - 14, gy + 2, 30, 8, 0.22);
    ctx.fillStyle = "#697288";
    ctx.beginPath();
    ctx.ellipse(cx, gy - 6, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(26,34,52,0.45)";
    ctx.stroke();
    ctx.fillStyle = "rgba(74,138,226,0.45)";
    ctx.beginPath();
    ctx.ellipse(cx, gy - 6, 11, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(235,248,255,0.5)";
    ctx.fillRect(cx - 4, gy - 20, 2, 11);
    ctx.fillRect(cx + 2, gy - 19, 2, 9);
    ctx.fillStyle = "rgba(220,238,255,0.7)";
    ctx.beginPath();
    ctx.arc(cx, gy - 8, 2.2, 0, Math.PI * 2);
    ctx.fill();
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
      ctx.rotate(facing);
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
      ctx.rotate(facing + Math.PI / 2);
      drawSmallTreeLocal();
      ctx.restore();
    } else if (f.kind === "fountain") {
      drawFountainSprite(cx, gy - 6);
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
  drawWorldAssets(minTileX, maxTileX, minTileY, maxTileY);
  drawWorldLoot();
  drawBuildingSprites(minTileX, maxTileX, minTileY, maxTileY);
  drawRoadsideFeatures(minTileX, maxTileX, minTileY, maxTileY);
  drawTraderCaravans(minTileX, maxTileX, minTileY, maxTileY);
}

function getPlayerBuilding() {
  const self = state.players.get(state.selfId);
  if (!self) return null;
  for (const building of state.buildings.values()) {
    if (self.renderX > building.x + 1 && self.renderX < building.x + building.w - 1 &&
        self.renderY > building.y + 1 && self.renderY < building.y + building.h - 1) {
      return building;
    }
  }
  return null;
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

  const colors = tilePalette[tile] || tilePalette[TILE.GRASS];
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
    drawGroundPatch(TILE.GRASS, sx, sy, tx, ty, tilePalette[TILE.GRASS]);
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
    drawGroundPatch(TILE.STONE, sx, sy, tx, ty, tilePalette[TILE.STONE]);
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
    tile === TILE.CHAIR;
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

function drawPlayers() {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const buyInterior = getPlayerStandingBuyableHouseInterior();

  const entities = [
    ...[...state.players.values()].map((p) => ({ entity: p, isNpc: false })),
    ...[...state.npcs.values()].map((n) => ({ entity: n, isNpc: true })),
    ...[...state.mobs.values()].map((m) => ({ entity: m, isMob: true })),
  ].sort((a, b) => a.entity.renderY - b.entity.renderY);

  for (const { entity, isNpc, isMob } of entities) {
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
    } else {
      const restingBench = isNpc ? isNpcRestingOnBench(entity) : false;
      drawCharacter(entity, sx, sy, isNpc, { restingBench });
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
  const color = item?.color || "#d7e4ef";
  drawEllipseShadow(x - 8, y + 7, 16, 4, 0.18);
  ctx.fillStyle = color;

  if (item?.icon === "potion") {
    ctx.fillStyle = "#d7e4ef";
    ctx.fillRect(x - 2, y - 10, 4, 4);
    ctx.fillStyle = "#f26d6d";
    ctx.fillRect(x - 5, y - 6, 10, 12);
    return;
  }

  if (item?.type === "armor") {
    const vstyle = item.visual?.torsoStyle || item.torsoStyle || "";
    const nm     = (item.name || "").toLowerCase();
    const isHeavy = vstyle === "armor"  || nm.includes("chestplate") || nm.includes("plate");
    const isRobe  = vstyle === "robe"   || nm.includes("robe");

    if (vstyle === "ascendant") {
      ctx.shadowColor = "#c084fc";
      ctx.shadowBlur = 6;
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
      return;
    }

    if (isHeavy) {
      // Breastplate — wide shoulders, centre seam
      ctx.fillStyle = color;
      ctx.fillRect(x - 7, y - 9, 14, 12);
      ctx.fillRect(x - 9, y - 8,  4,  7);  // left pauldron
      ctx.fillRect(x + 5, y - 8,  4,  7);  // right pauldron
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x - 1, y - 9, 2, 12);   // centre seam
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(x - 6, y - 8, 4, 2);    // highlight
    } else if (isRobe) {
      // Robe — trapezoid, magic trim
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
      // Leather jerkin — compact, diagonal strap
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
    return;
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 6);
  ctx.lineTo(x + 8, y - 10);
  ctx.stroke();
}

/** Green cloak with motion tied to gait + idle sway */
function drawModCape(px, py, scale, bob, dirX, dirY, moving, sinWalk) {
  const capeX = px + 4 * scale;
  const capeY = py + 2 * scale + bob;
  const t = performance.now() * 0.0038;
  const idleSway = Math.sin(t) * 1.2 * scale + Math.sin(t * 1.7 + dirX * 2) * 0.35 * scale;
  const walkBurst = moving
    ? sinWalk * 7 * Math.max(scale / 3, 1)
      + Math.sin(t * 2.8) * 2.8 * Math.max(scale / 3, 1)
      + dirX * 3.2 * scale
    : 0;
  const skew = idleSway + walkBurst;

  ctx.fillStyle = "#0f4d32";
  ctx.fillRect(
    Math.round(capeX - scale + skew * 0.35),
    capeY,
    10 * scale,
    8 * scale
  );
  ctx.fillStyle = "#198f55";
  ctx.fillRect(
    Math.round(capeX - 0.5 * scale + skew * 0.55),
    capeY + 2.5 * scale,
    9 * scale,
    11 * scale
  );
  ctx.fillStyle = "#20965d";
  ctx.fillRect(
    Math.round(capeX - scale + skew),
    capeY + 5.5 * scale,
    10 * scale + Math.min(8, Math.abs(skew)),
    6 * scale
  );
  // Fold edge catching light while moving
  ctx.fillStyle = "#4dd68c";
  const fold = moving ? Math.abs(sinWalk) * scale * 1.8 : Math.abs(skew) * 0.12;
  ctx.fillRect(Math.round(capeX + 5 * scale + skew * 0.4), capeY + 4 * scale, Math.max(scale * 1.8, fold), 8 * scale);
  // Cloak clasp / shoulder trim
  ctx.fillStyle = "#9fecc0";
  ctx.fillRect(capeX - scale, capeY, 10 * scale, Math.max(1.2 * scale, 2));
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

function drawCharacter(entity, x, y, isNpc = false, poseOpts = null) {
  const isMod = !!entity.isMod;
  const s = isMod ? 3 * 1.2 : 3;
  const phase  = entity.walkPhase || 0;
  const moving = Boolean(entity.renderMoving);
  const facing = Number.isFinite(entity.facing) ? entity.facing : Math.PI / 2;
  const dirX = Math.cos(facing);
  const dirY = Math.sin(facing);
  const sideX = -dirY;
  const sideY =  dirX;

  const wf   = 2.6;
  const sin1 = moving ? Math.sin(phase * wf) : 0;
  const cos1 = moving ? Math.cos(phase * wf) : 0;
  const bob  = moving ? Math.round(Math.abs(cos1) * 1.5 - 0.4) : 0;
  const fx   = Math.round(dirX);
  const fy   = Math.round(dirY * 0.6);

  const torsoColor  = isMod ? "#697987" : (entity.torsoColor || entity.primary || "#5cc8ff");
  const weaponColor = entity.weaponColor || entity.accent || "#ffd166";
  const torsoStyle  = isMod ? "robe" : (entity.torsoStyle || "tunic");
  const skinColor   = "#f0c9a2";
  const skinShadow  = "#c88a60";
  const pantColor   = isMod ? "#454e5c" : "#2a3044";
  const bootColor   = isMod ? "#2f3641" : "#1a1e2c";

  const lyingBedPose = !!(poseOpts && poseOpts.lyingBed);
  const restingBenchPose = !!(poseOpts && poseOpts.restingBench);
  const selfBenchSit =
    !isNpc &&
    entity.id === state.selfId &&
    (state.benchSitUntil || 0) > performance.now();
  const benchSeatPose = restingBenchPose || selfBenchSit;
  const compressLowerBody = benchSeatPose || lyingBedPose;
  const sitBumpPx = lyingBedPose ? 11 : benchSeatPose ? 7 : 0;
  const headSitNudge = benchSeatPose ? Math.round(s * 0.85) : lyingBedPose ? Math.round(s * 0.42) : 0;

  const bx = x;
  const by = y + bob + sitBumpPx;

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

  if (isMod) {
    drawModCape(bx - 5 * s, by - 4 * s, s, bob, dirX, dirY, moving, sin1);
  }

  // Tiny stump legs (RotMG style) — compressed when seated on benches
  const legWalk = moving ? Math.round(sin1 * 2) : 0;
  ctx.fillStyle = pantColor;
  if (compressLowerBody) {
    ctx.fillRect(bx - 4 * s, by + 3 * s, 8 * s, 2 * s);
    ctx.fillStyle = bootColor;
    ctx.fillRect(bx - 4 * s - 1, by + 4 * s, 5 * s, 2 * s);
    ctx.fillRect(bx + 0 * s, by + 4 * s, 5 * s, 2 * s);
  } else {
    ctx.fillRect(bx - 4 * s,     by + 3 * s - legWalk, 3 * s, 2 * s);
    ctx.fillRect(bx +     s,     by + 3 * s + legWalk, 3 * s, 2 * s);
    ctx.fillStyle = bootColor;
    ctx.fillRect(bx - 4 * s - 1, by + 5 * s,           4 * s, 2 * s);
    ctx.fillRect(bx +     s,     by + 5 * s + legWalk,  4 * s, 2 * s);
  }

  // Torso
  drawTorso2(bx - 4 * s, by - 3 * s, s, torsoStyle, torsoColor, weaponColor, entity.classId, fx, fy);

  // Short arms (raised + glowing while channeling home teleport)
  ctx.fillStyle = isMod ? torsoColor : skinColor;
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
  const hx = bx - 2 * s + fx * s;
  const hy = by - 7 * s + fy + headSitNudge;
  if (isMod) {
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
    // Eyes
    ctx.fillStyle = "#1d2430";
    const eyeY = hy + 2 * s;
    const eo   = Math.max(0, fx) * s;
    ctx.fillRect(hx +     s + eo, eyeY, s, s);
    ctx.fillRect(hx + 3 * s + eo, eyeY, s, s);
  }

  // Weapon / equipment (stash weapon while channeling home / sitting)
  if (!isNpc && !homeCasting && !benchSeatPose && !lyingBedPose) {
    drawClassEquipment(entity, bx, by, dirX, dirY, sideX, sideY, weaponColor,
      rAX + s, rAY + 2 * s,
      lAX + s, lAY + 2 * s, moving, sin1, s);
  }

  if (lyingBedPose) {
    ctx.restore();
  }

  const flirtLine =
    poseOpts && typeof poseOpts.ambientLine === "string" ? poseOpts.ambientLine.trim() : "";

  // Name tag
  ctx.font = "11px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(8,12,18,0.82)";
  ctx.fillStyle = isNpc ? "#ffd27a" : entity.isMod ? "#b8efd0" : "#f7f3df";
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
  const ornateWeapon = style === "ornate" || style === "legendary" || style === "ascendant";
  const isLegendary = style === "legendary";
  const isAscendant = style === "ascendant";
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (isLegendary || isAscendant) {
    ctx.save();
    ctx.shadowColor = isAscendant ? "#c084fc" : "#ffd166";
    ctx.shadowBlur = isAscendant ? 17 : 14;
  }

  const ks = eqS / 3;

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

  if (isLegendary || isAscendant) {
    ctx.restore();
  }

  ctx.restore();
}

function drawMob(entity, x, y) {
  const phase     = entity.walkPhase || 0;
  const primary   = entity.primary  || "#56b88f";
  const accent    = entity.accent   || "#c7f5b0";
  const isBoss    = Boolean(entity.isBoss);
  const isCritter = Boolean(entity.isCritter);

  const sc  = isBoss ? 2.0 : isCritter ? 0.65 : 1.0;
  const bW  = Math.round(22 * sc);
  const bH  = Math.round(9  * sc);
  const hW  = Math.round(18 * sc);
  const hH  = Math.round(11 * sc);
  const legW = Math.round(6  * sc);
  const legH = Math.round(4  * sc);
  const bounce = Math.round(Math.sin(phase * 3) * (isCritter ? 1.5 : 1));

  const nameY = y - (isBoss ? 42 : isCritter ? 20 : 28);
  const barW  = isBoss ? 48 : isCritter ? 22 : 30;
  const barY  = y - (isBoss ? 35 : isCritter ? 14 : 22);

  drawEllipseShadow(x - bW / 2, y + 8, bW, Math.round(isBoss ? 9 : isCritter ? 3 : 5), isCritter ? 0.18 : 0.28);

  // Stump legs
  if (!isCritter) {
    const legY = Math.round(y + bH / 2 + bounce);
    ctx.fillStyle = blend(primary, "#000000", 0.38);
    ctx.fillRect(x - legW - 1, legY, legW, legH);
    ctx.fillRect(x + 1,        legY, legW, legH);
  }

  // Body
  ctx.fillStyle = blend(primary, "#000000", 0.22);
  ctx.fillRect(x - bW / 2, Math.round(y - bH / 2 + bounce), bW, bH);
  ctx.fillStyle = primary;
  ctx.fillRect(x - bW / 2, Math.round(y - bH / 2 + bounce), bW, bH - 2);

  // Head
  const headY = Math.round(y - bH / 2 - hH + bounce);
  ctx.fillStyle = primary;
  ctx.fillRect(x - hW / 2, headY, hW, hH);
  ctx.fillStyle = blend(primary, "#ffffff", 0.18);
  ctx.fillRect(x - hW / 2, headY, hW, 3);

  // Eyes / ears (accent)
  ctx.fillStyle = accent;
  if (isCritter) {
    const eW = Math.round(hW * 0.22);
    const eH = Math.round(hH * 0.5);
    ctx.fillRect(x - Math.round(hW * 0.38), headY - eH + 2, eW, eH);
    ctx.fillRect(x + Math.round(hW * 0.16), headY - eH + 2, eW, eH);
  } else {
    const eyeSz = Math.max(2, Math.round(3 * sc));
    const eyeY  = headY + Math.round(hH * 0.38);
    ctx.fillRect(x - Math.round(hW * 0.3),  eyeY, eyeSz, eyeSz);
    ctx.fillRect(x + Math.round(hW * 0.08), eyeY, eyeSz, eyeSz);
  }

  // Boss crown / horns
  if (isBoss) {
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(x - 14, headY - 8,  6, 8);
    ctx.fillRect(x -  3, headY - 12, 6, 12);
    ctx.fillRect(x +  8, headY - 8,  6, 8);
  }

  // Label
  ctx.font = `${isBoss ? 13 : isCritter ? 10 : 11}px ui-sans-serif, system-ui`;
  ctx.textAlign = "center";
  ctx.lineWidth = isCritter ? 2 : 3;
  ctx.strokeStyle = "rgba(8,12,18,0.82)";
  ctx.fillStyle   = isBoss ? "#ffd166" : isCritter ? "#d8eec8" : "#ffc0a0";
  const label = Number.isFinite(entity.level) && !isCritter
    ? `Lv ${entity.level} ${entity.name}` : entity.name;
  ctx.strokeText(label, x, nameY);
  ctx.fillText(label,   x, nameY);
  drawHealthBar(x - barW / 2, barY, barW, isCritter ? 3 : 4, entity.hp, entity.maxHp);
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
    ctx.strokeStyle = fx.hit ? "#ffd166" : "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(16, 0, reach, -0.5, 0.5);
    ctx.stroke();
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

  if (fx.projectileKind === "fireball") {
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
  const colors = tilePalette[tile] || tilePalette[TILE.FLOOR];

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
  const colors = tilePalette[TILE.GRASS];
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
    drawOwnedHouseInteriorHomeTree(building, roofless, halfW, halfH);
    drawOwnedHouseInteriorChest(building, roofless, halfW, halfH);
    drawOwnedHouseInteriorCompanion(building, roofless, halfW, halfH);
  }
}

function drawOwnedHouseInteriorCompanion(building, roofless, halfW, halfH) {
  const self = state.players.get(state.selfId);
  const hc = self?.houseCompanion;
  if (!roofless || !hc || building?.isPub) {
    return;
  }
  if (!self.homeBuildingKey || `${building.x},${building.y}` !== self.homeBuildingKey) {
    return;
  }

  const typ = building.type || "house";
  if (!(typ === "house" || typ === "big_house")) {
    return;
  }

  const npcId = typeof hc.npcId === "string" ? hc.npcId : "companion";
  const mode = homeCompanionAmbientMode(npcId, self.homeBuildingKey);
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

  const anchor = interiorFloorAnchorFromWorld(wx, wy, halfW, halfH);
  const groundBump = mode === "bed" ? 4 : mode === "eat" ? 6 : 9;
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
    hp: null
  };
  drawCharacter(ent, anchor.cx, anchor.groundY + groundBump, true, poseExtras);
}

function drawOwnedHouseInteriorHomeTree(building, roofless, halfW, halfH) {
  const self = state.players.get(state.selfId);
  if (!roofless || !self?.homeBuildingKey) {
    return;
  }
  if (`${building.x},${building.y}` !== self.homeBuildingKey) {
    return;
  }
  const tp = getOwnedHouseHomeTreeWorldPos(building);
  const { cx, groundY } = interiorFloorAnchorFromWorld(tp.x, tp.y, halfW, halfH);
  drawInteriorHomeTree(cx, groundY);
}

function drawOwnedHouseInteriorChest(building, roofless, halfW, halfH) {
  const self = state.players.get(state.selfId);
  if (!roofless || !self?.homeBuildingKey) {
    return;
  }
  if (`${building.x},${building.y}` !== self.homeBuildingKey) {
    return;
  }
  const cp = getOwnedHouseChestWorldPos(building);
  const { cx, groundY } = interiorFloorAnchorFromWorld(cp.x, cp.y, halfW, halfH);
  drawInteriorHouseChest(cx, groundY);
}

/** Interior chest — opens bags via houseChestAction; `groundY` = soles on floor tiles */
function drawInteriorHouseChest(cx, groundY) {
  ctx.save();
  drawCastShadow(cx - 6, groundY + 4, 22, 6, 0.2);
  ctx.fillStyle = "#5c3d22";
  ctx.fillRect(cx - 14, groundY - 18, 28, 18);
  ctx.fillStyle = "#7a5230";
  ctx.fillRect(cx - 12, groundY - 22, 24, 8);
  ctx.strokeStyle = "rgba(40,24,10,0.55)";
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 14, groundY - 18, 28, 18);
  ctx.strokeRect(cx - 12, groundY - 22, 24, 8);
  ctx.fillStyle = "#d4af37";
  ctx.fillRect(cx - 3, groundY - 14, 6, 5);
  ctx.restore();
}

/** Compact decorative tree — click handled via houseHomeTree message */
function drawInteriorHomeTree(cx, groundY) {
  const trunk = "#5b3b26";
  const leaf = "#2f7a48";
  const leafHi = "#58a068";
  ctx.save();
  drawCastShadow(cx - 8, groundY + 2, 22, 6, 0.2);
  ctx.fillStyle = trunk;
  ctx.fillRect(cx - 3, groundY - 14, 6, 14);
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.arc(cx, groundY - 24, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = leafHi;
  ctx.beginPath();
  ctx.arc(cx - 5, groundY - 28, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(20,40,24,0.45)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawBuildingSprite(building, sx, sy, roofless) {
  const w = building.w * TILE_SIZE;
  const h = building.h * TILE_SIZE;
  const variant = getBuildingVariant(building);
  const type = building.type || "house";
  if (!roofless) drawCastShadow(sx + 10, sy + h - 14, w - 6, 18, 0.28);
  if (type === "hut") drawHut(building, sx, sy, w, h, variant, roofless);
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
  const lightX = self ? self.renderX * TILE_SIZE - state.camera.x + canvas.width / 2 : canvas.width / 2;
  const lightY = self ? self.renderY * TILE_SIZE - state.camera.y + canvas.height / 2 : canvas.height / 2;
  const radius = Math.max(canvas.width, canvas.height) * 0.82;
  const gradient = ctx.createRadialGradient(lightX, lightY, 80, lightX, lightY, radius);

  ctx.save();
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

function drawPortalPedestal(cx, cy, gateR, color) {
  const baseY = cy + gateR - 8;
  const steps = [
    { w: gateR * 2 + 64, h: 18 },
    { w: gateR * 2 + 40, h: 15 },
    { w: gateR * 2 + 18, h: 12 },
  ];
  let stepY = baseY;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const half = step.w / 2;
    // Shadow bottom
    ctx.fillStyle = "#0e0804";
    ctx.fillRect(cx - half, stepY + step.h - 4, step.w, 4);
    // Main stone
    ctx.fillStyle = i === 0 ? "#2a1e10" : i === 1 ? "#332414" : "#3c2a18";
    ctx.fillRect(cx - half, stepY, step.w, step.h - 4);
    // Top highlight edge
    ctx.fillStyle = "#5a4020";
    ctx.fillRect(cx - half, stepY, step.w, 3);
    // Side highlight
    ctx.fillStyle = "#4a3018";
    ctx.fillRect(cx - half, stepY + 3, 3, step.h - 7);
    ctx.fillRect(cx + half - 3, stepY + 3, 3, step.h - 7);
    // Portal color tint on top step
    if (i === steps.length - 1) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.12;
      ctx.fillRect(cx - half + 3, stepY + 3, step.w - 6, step.h - 7);
      ctx.globalAlpha = 1;
    }
    stepY += step.h;
  }
}

function drawPortal(sx, sy, tx, ty) {
  const portal = getPortalAtTile(tx, ty);
  if (!portal) return;

  const time = performance.now() / 1000;
  const color = portal.color || "#75f0ff";
  const T = TILE_SIZE;
  const cx = sx + T + T / 2;
  const cy = sy + T;
  const gateR = T * 2.0;
  const pulse = 0.5 + Math.sin(time * 3) * 0.5;

  drawPortalPedestal(cx, cy, gateR, color);
  drawEllipseShadow(cx - gateR - 4, cy + gateR + 2, gateR * 2 + 8, 16, 0.5);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, gateR - 10, 0, Math.PI * 2);
  ctx.clip();
  drawPortalEventHorizon(cx, cy, gateR - 10, portal, time);
  ctx.restore();

  drawStargateRing(cx, cy, gateR, color, time, pulse);

  ctx.font = "bold 13px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(8,12,18,0.85)";
  ctx.fillStyle = color;
  ctx.strokeText(portal.name, cx, cy + gateR + 20);
  ctx.fillText(portal.name, cx, cy + gateR + 20);
}

function drawStargateRing(cx, cy, r, color, time, pulse) {
  ctx.save();
  // Outer magical aura
  ctx.shadowColor = color;
  ctx.shadowBlur = 28 + pulse * 16;
  ctx.strokeStyle = "#0e0a06";
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Stone body layers
  ctx.strokeStyle = "#3a2a18";
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#4e3820";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#5e4830";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Carved grooves
  ctx.strokeStyle = "#1a100a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 11, 0, Math.PI * 2);
  ctx.stroke();

  // Inner color glow rim
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5 + pulse * 0.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.restore();

  // Arcane gem stones at 8 equidistant points
  const numGems = 8;
  for (let i = 0; i < numGems; i += 1) {
    const angle = (Math.PI * 2 * i) / numGems - Math.PI / 2;
    const gx = cx + Math.cos(angle) * r;
    const gy = cy + Math.sin(angle) * r;
    const litPhase = Math.sin(time * 1.6 + i * 0.8);
    const lit = litPhase > 0;
    const glowStr = Math.max(0, litPhase);

    ctx.save();
    ctx.translate(gx, gy);
    const gs = i % 2 === 0 ? 7 : 5;
    ctx.beginPath();
    ctx.moveTo(0, -gs);
    ctx.lineTo(gs * 0.65, 0);
    ctx.lineTo(0, gs);
    ctx.lineTo(-gs * 0.65, 0);
    ctx.closePath();
    ctx.fillStyle = lit ? color : "#251a10";
    ctx.shadowColor = color;
    ctx.shadowBlur = lit ? 8 + glowStr * 10 : 0;
    ctx.fill();
    ctx.strokeStyle = "#0a0806";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // Crystal clusters at cardinal points (N, E, S, W)
  const cardinalAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  for (const baseAngle of cardinalAngles) {
    const kx = cx + Math.cos(baseAngle) * (r + 9);
    const ky = cy + Math.sin(baseAngle) * (r + 9);
    ctx.save();
    ctx.translate(kx, ky);
    ctx.rotate(baseAngle + Math.PI / 2);
    for (let c = -1; c <= 1; c += 1) {
      const cLen = c === 0 ? 12 : 7;
      const cOff = c * 5;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 5 + pulse * 9;
      ctx.globalAlpha = 0.65 + pulse * 0.35;
      ctx.beginPath();
      ctx.moveTo(cOff, -cLen);
      ctx.lineTo(cOff + 3, 0);
      ctx.lineTo(cOff - 3, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function drawPortalEventHorizon(cx, cy, r, portal, time) {
  // Deep arcane void
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, "#0a0420");
  grad.addColorStop(0.55, "#0e0828");
  grad.addColorStop(1, "#18103a");
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
        drawPortalPreviewTile(tile, ox + px * cellW + waveX, oy + py * cellH + waveY, cellW + 1, cellH + 1, px, py, time);
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

function drawPortalPreviewTile(tile, x, y, w, h, px, py, time) {
  const colors = tilePalette[tile] || tilePalette[TILE.GRASS];
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
