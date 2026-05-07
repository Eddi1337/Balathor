const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d", {
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
const statSpeed = document.querySelector("#statSpeed");
const statStrength = document.querySelector("#statStrength");
const statArmour = document.querySelector("#statArmour");
const statHealth = document.querySelector("#statHealth");
const equipmentButton = document.querySelector("#equipmentButton");
const bagsButton = document.querySelector("#bagsButton");
const equipmentPanel = document.querySelector("#equipmentPanel");
const bagsPanel = document.querySelector("#bagsPanel");
const equipmentClose = document.querySelector("#equipmentClose");
const bagsClose = document.querySelector("#bagsClose");
const equipmentSlots = document.querySelector("#equipmentSlots");
const inventorySlots = document.querySelector("#inventorySlots");
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
const mobileControls = document.querySelector("#mobileControls");
const joystickCanvas = document.querySelector("#joystick");
const traderPanel = document.querySelector("#traderPanel");
const traderTitle = document.querySelector("#traderTitle");
const traderStock = document.querySelector("#traderStock");
const traderSellSlots = document.querySelector("#traderSellSlots");
const traderClose = document.querySelector("#traderClose");

const TILE_SIZE = 32;
const CHUNK_SIZE = 16;
// Client-side predicted base player speed (tiles per second). Match server base.
const CLIENT_PLAYER_SPEED = 5.2;
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
};

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
  levelUpFx: [],
  portalTransition: null,
  chunks: new Map(),
  portals: new Map(),
  buildings: new Map(),
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
  _debugLastPingAt: 0
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
    state.camera.x = message.spawn.x * TILE_SIZE;
    state.camera.y = message.spawn.y * TILE_SIZE;
    requestVisibleChunks();
    return;
  }

  if (message.type === "teleport") {
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
    }
    state.camera.x = message.x * TILE_SIZE;
    state.camera.y = message.y * TILE_SIZE;
    state.requestedChunks.clear();
    clearMovementInput();
    requestVisibleChunks();
    appendChat({
      kind: "system",
      name: "Realm",
      text: `Entered ${message.name}`
    });
    return;
  }

  if (message.type === "chunk") {
    const key = chunkKey(message.cx, message.cy);
    state.chunks.set(key, message);
    indexChunkPortals(message);
    indexChunkBuildings(message);
    state.requestedChunks.delete(key);
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
    renderEquipment();
    renderBags();
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
        text: "Combat is disabled inside houses and the starting area"
      });
    } else if (message.message === "stat_spent") {
      appendChat({
        kind: "system",
        name: "Realm",
        text: `Added a point to ${message.stat}`
      });
    } else if (message.message === "inventory_full") {
      appendChat({ kind: "system", name: "Realm", text: "Inventory is full" });
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
    } else if (message.itemName) {
      appendChat({ kind: "system", name: "Realm", text: `${message.itemName}` });
    }
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
    ttl: event.kind === "projectile" ? (event.projectileKind === "fireball" ? 560 : 420) : event.hit ? 360 : 220
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
  state.levelUpFx = state.levelUpFx.filter((fx) => now - fx.createdAt < fx.ttl);
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

  document.querySelectorAll("[data-stat]").forEach((button) => {
    button.addEventListener("click", () => {
      send({ type: "spendStat", stat: button.dataset.stat });
    });
  });

  equipmentButton.addEventListener("click", () => {
    toggleGameWindow("equipment");
  });

  bagsButton.addEventListener("click", () => {
    toggleGameWindow("bags");
  });

  equipmentClose.addEventListener("click", () => {
    setActiveGameWindow(null);
  });

  bagsClose.addEventListener("click", () => {
    setActiveGameWindow(null);
  });

  shopClose?.addEventListener("click", () => {
    closeShop();
  });

  traderClose.addEventListener("click", () => {
    setActiveGameWindow(null);
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
    sendInteract();
  });

  equipmentSlots.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-equipment-action]");
    if (!button) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const equipmentSlot = button.dataset.equipmentSlot;
    if (button.dataset.equipmentAction === "unequip") {
      send({ type: "unequipItem", equipmentSlot, drop: false });
    } else if (button.dataset.equipmentAction === "drop") {
      send({ type: "unequipItem", equipmentSlot, drop: true });
    }
  });

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
    }
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

  chatToggle.addEventListener("click", () => {
    setChatMinimized(!state.chatMinimized);
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
    if (tryPickupClickedGroundItem(event)) {
      return;
    }
    const world = screenEventToWorld(event);
    state.lastPointerWorldX = world.x;
    state.lastPointerWorldY = world.y;
    if (tryOpenTraderAtClick(world.x, world.y)) {
      return;
    }
    sendAttack(world.x, world.y);
  });

  // track latest pointer world position for keyboard/mobile attacks
  canvas.addEventListener("pointermove", (event) => {
    const world = screenEventToWorld(event);
    state.lastPointerWorldX = world.x;
    state.lastPointerWorldY = world.y;
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
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
    // include last known pointer world coordinates if we have them
    sendAttack(state.lastPointerWorldX, state.lastPointerWorldY);
      return;
    }

    if (event.key.toLowerCase() === "h" && state.joined && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      sendHome();
      return;
    }

    if (event.key.toLowerCase() === "e" && state.joined && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      sendInteract();
      return;
    }

    if (event.key === "Enter" && state.joined && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      clearMovementInput();
      chatInput.focus();
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

function sendHome() {
  if (!state.joined) {
    return;
  }
  clearMovementInput();
  send({ type: "home" });
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
    sendAttack();
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
  chat.classList.add("hidden");
  mobileControls.classList.add("hidden");
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
  state.speechBubbles.clear();
  state.combatFx = [];
  state.levelUpFx = [];
  state.portalTransition = null;
  state.chunks.clear();
  state.portals.clear();
  state.buildings.clear();
  state.requestedChunks.clear();
  state.population = 0;
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
  statSpeed.textContent = stats.speed || 0;
  statStrength.textContent = stats.strength || 0;
  statArmour.textContent = stats.armour || 0;
  statHealth.textContent = stats.health || 0;

  document.querySelectorAll("[data-stat]").forEach((button) => {
    button.disabled = statPoints <= 0;
  });
}

function renderEquipment() {
  const slots = [
    ["weapon", "Weapon"],
    ["body", "Body"],
    ["ring1", "Ring"],
    ["ring2", "Ring"]
  ];
  equipmentSlots.replaceChildren();

  for (const [slot, label] of slots) {
    const item = state.equipment?.[slot] || null;
    const cell = document.createElement("div");
    cell.className = `equipment-slot ${item ? item.rarity || "common" : "empty"}`;

    const labelEl = document.createElement("span");
    labelEl.className = "slot-label";
    labelEl.textContent = label;

    if (!item) {
      const empty = document.createElement("strong");
      empty.textContent = "Empty";
      cell.append(labelEl, empty);
      equipmentSlots.append(cell);
      continue;
    }

    const icon = createItemIcon(item);
    const name = document.createElement("strong");
    name.textContent = item.name;

    const stats = document.createElement("span");
    stats.className = "item-stats";
    stats.textContent = formatItemStats(item);

    const actions = document.createElement("div");
    actions.className = "item-actions";
    const unequip = document.createElement("button");
    unequip.type = "button";
    unequip.dataset.equipmentAction = "unequip";
    unequip.dataset.equipmentSlot = slot;
    unequip.textContent = "Unequip";
    const drop = document.createElement("button");
    drop.type = "button";
    drop.dataset.equipmentAction = "drop";
    drop.dataset.equipmentSlot = slot;
    drop.textContent = "Drop";
    actions.append(unequip, drop);

    cell.append(labelEl, icon, name, stats, actions);
    equipmentSlots.append(cell);
  }
}

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
    cell.append(createItemIcon(item), name, stats, actions);
    inventorySlots.append(cell);
  });
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
  shopTitle.textContent = state.shop.buildingName ? `${state.shop.buildingName} Shelf` : state.shop.name;
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

function toggleGameWindow(windowName) {
  setActiveGameWindow(state.activeWindow === windowName ? null : windowName);
}

function setActiveGameWindow(windowName) {
  state.activeWindow = windowName;
  equipmentPanel.classList.toggle("hidden", windowName !== "equipment");
  bagsPanel.classList.toggle("hidden", windowName !== "bags");
  traderPanel.classList.toggle("hidden", windowName !== "trader");
  equipmentButton.classList.toggle("selected", windowName === "equipment");
  bagsButton.classList.toggle("selected", windowName === "bags");
  if (windowName !== "trader") {
    state.traderNpcId = null;
    state.traderItems = [];
  }
  if (!windowName) {
    clearMovementInput();
  }
}

function tryOpenTraderAtClick(worldX, worldY) {
  const self = state.players.get(state.selfId);
  if (!self) return false;
  for (const npc of state.npcs.values()) {
    if (!npc.isTrader) continue;
    const nx = Number.isFinite(npc.renderX) ? npc.renderX : npc.x;
    const ny = Number.isFinite(npc.renderY) ? npc.renderY : npc.y;
    if (Math.hypot(nx - worldX, ny - worldY) > 2.0) continue;
    const sx = Number.isFinite(self.renderX) ? self.renderX : self.x;
    const sy = Number.isFinite(self.renderY) ? self.renderY : self.y;
    if (Math.hypot(nx - sx, ny - sy) > 4.0) continue;
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
  drawPlayers();
  drawTreeCanopies();
  drawCombatFx();
  drawLevelUpFx();
  drawLighting();

  ctx.restore();
  drawPortalTransitionOverlay();
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

function drawWorld() {
  const zoom = state.zoom || 1;
  const screenHalfW = canvas.width / 2;
  const screenHalfH = canvas.height / 2;
  const visHalfW = screenHalfW / zoom;
  const visHalfH = screenHalfH / zoom;
  const minTileX = Math.floor((state.camera.x - visHalfW) / TILE_SIZE) - 1;
  const maxTileX = Math.ceil((state.camera.x + visHalfW) / TILE_SIZE) + 1;
  const minTileY = Math.floor((state.camera.y - visHalfH) / TILE_SIZE) - 1;
  const maxTileY = Math.ceil((state.camera.y + visHalfH) / TILE_SIZE) + 1;

  for (let ty = minTileY; ty <= maxTileY; ty += 1) {
    for (let tx = minTileX; tx <= maxTileX; tx += 1) {
      const tile = getTile(tx, ty);
      const sx = Math.floor(tx * TILE_SIZE - state.camera.x + screenHalfW);
      const sy = Math.floor(ty * TILE_SIZE - state.camera.y + screenHalfH);
      drawTile(tile, sx, sy, tx, ty);
    }
  }

  drawWorldAssets(minTileX, maxTileX, minTileY, maxTileY);
  drawWorldLoot();
  drawBuildingSprites(minTileX, maxTileX, minTileY, maxTileY);
}

function drawTile(tile, sx, sy, tx, ty) {
  if (isInteriorTileCoordinate(tx, ty) && isInteriorDrawTile(tile)) {
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
    drawPortal(sx, sy, tx, ty);
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
    tile === TILE.SHELF;
}

function drawPlayers() {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;

  const entities = [
    ...[...state.players.values()].map((p) => ({ entity: p, isNpc: false })),
    ...[...state.npcs.values()].map((n) => ({ entity: n, isNpc: true })),
    ...[...state.mobs.values()].map((m) => ({ entity: m, isMob: true })),
  ].sort((a, b) => a.entity.renderY - b.entity.renderY);

  for (const { entity, isNpc, isMob } of entities) {
    const sx = Math.floor(entity.renderX * TILE_SIZE - state.camera.x + halfW);
    const sy = Math.floor(entity.renderY * TILE_SIZE - state.camera.y + halfH);
    if (isMob) {
      drawMob(entity, sx, sy);
    } else {
      drawCharacter(entity, sx, sy, isNpc);
    }
  }
}

function drawWorldLoot() {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;

  for (const chest of state.chests) {
    if (chest.opened) {
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
    ctx.fillRect(x - 7, y - 8, 14, 14);
    ctx.fillStyle = "rgba(255,255,255,0.34)";
    ctx.fillRect(x - 4, y - 5, 8, 2);
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

function drawModCape(px, py, scale, bob, dirX, dirY) {
  // Cape drapes behind the character: two overlapping rectangles that sway with movement
  const capeX = px + 4 * scale;
  const capeY = py + 2 * scale + bob;
  const sway = Math.round(dirX * 2);
  ctx.fillStyle = "#2d9e3a";
  ctx.fillRect(capeX, capeY, 8 * scale, 6 * scale);
  ctx.fillStyle = "#1a6828";
  ctx.fillRect(capeX + sway, capeY + 4 * scale, 8 * scale, 5 * scale);
  ctx.fillStyle = "#6dcc7a";
  ctx.fillRect(capeX + 1, capeY, 2, 3 * scale);
}

function drawCharacter(entity, x, y, isNpc = false) {
  const s = 3;
  const phase = entity.walkPhase || 0;
  const moving = Boolean(entity.renderMoving);
  const facing = Number.isFinite(entity.facing) ? entity.facing : Math.PI / 2;
  const dirX = Math.cos(facing);
  const dirY = Math.sin(facing);
  const sideX = -dirY;
  const sideY = dirX;

  const wf = 2.4;
  const sin1 = moving ? Math.sin(phase * wf) : 0;
  const cos1 = moving ? Math.cos(phase * wf) : 0;
  const bob = moving ? Math.round(Math.abs(cos1) * 2 - 0.6) : 0;
  const sway = moving ? Math.round(sin1 * 0.6) : 0;

  const fx = Math.round(dirX * 2);
  const fy = Math.round(dirY * 1.4);

  const torsoColor = entity.torsoColor || entity.primary || "#5cc8ff";
  const weaponColor = entity.weaponColor || entity.accent || "#ffd166";
  const torsoStyle = entity.torsoStyle || "tunic";
  const skinColor = "#f0c9a2";
  const skinShadow = "#d4a87a";
  const pantColor = "#2a3044";
  const bootColor = "#1a1e2c";

  const bx = x + sway;
  const by = y + bob;

  drawEllipseShadow(x - 16, y + 14, 32, 8, 0.3);

  if (entity.isMod) {
    drawModCape(x - 8 * s, y - 10 * s + bob, s, bob, dirX, dirY);
  }

  const legSwing = moving ? sin1 * 4 : 0;
  const lFwdX = Math.round(dirX * legSwing);
  const lFwdY = Math.round(dirY * legSwing);

  drawLeg(bx - 5 * s + lFwdX, by + 2 * s + lFwdY, s, pantColor, bootColor, dirX, dirY, moving, sin1, 1);
  drawLeg(bx + 2 * s - lFwdX, by + 2 * s - lFwdY, s, pantColor, bootColor, dirX, dirY, moving, sin1, -1);

  const torsoX = bx - 6 * s;
  const torsoY = by - 8 * s;
  drawTorso2(torsoX, torsoY, s, torsoStyle, torsoColor, weaponColor, entity.classId, fx, fy);

  const armSwing = moving ? sin1 * 3 : 0;
  const laX = bx - 7 * s + Math.round(-dirX * armSwing);
  const laY = by - 5 * s + Math.round(-dirY * armSwing);
  const raX = bx + 4 * s + Math.round(dirX * armSwing);
  const raY = by - 5 * s + Math.round(dirY * armSwing);
  ctx.fillStyle = skinColor;
  ctx.fillRect(laX, laY, 3 * s, 2 * s);
  ctx.fillRect(raX, raY, 3 * s, 2 * s);
  ctx.fillStyle = skinShadow;
  ctx.fillRect(laX, laY + 2 * s, 3 * s, 4 * s);
  ctx.fillRect(raX, raY + 2 * s, 3 * s, 4 * s);

  const hx = bx - 4 * s + fx * s;
  const hy = by - 14 * s + fy * s;
  ctx.fillStyle = skinColor;
  ctx.fillRect(hx, hy, 8 * s, 6 * s);
  ctx.fillStyle = skinShadow;
  ctx.fillRect(hx, hy + 6 * s, 8 * s, 2 * s);

  ctx.fillStyle = weaponColor;
  ctx.fillRect(hx, hy, 8 * s, 2 * s);
  if (entity.classId === "mage") {
    ctx.fillRect(hx + s, hy - 2 * s, 6 * s, 2 * s);
  }

  ctx.fillStyle = "#1d2430";
  const eyeY = hy + 3 * s;
  ctx.fillRect(hx + 2 * s + Math.max(0, fx) * s, eyeY, s, s);
  ctx.fillRect(hx + 5 * s + Math.max(0, fx) * s, eyeY, s, s);

  if (!isNpc) {
    drawClassEquipment(entity, bx, by, dirX, dirY, sideX, sideY, weaponColor, raX + 1.5 * s, raY + 3 * s, laX + 1.5 * s, laY + 3 * s);
  }

  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(8, 12, 18, 0.82)";
  ctx.fillStyle = isNpc ? "#ffd27a" : entity.isMod ? "#c79cff" : "#f7f3df";
  ctx.strokeText(entity.name, x, y - 46);
  ctx.fillText(entity.name, x, y - 46);

  if (!isNpc && Number.isFinite(entity.hp) && Number.isFinite(entity.maxHp)) {
    drawHealthBar(x - 18, y - 40, 36, 4, entity.hp, entity.maxHp);
  }

  drawSpeechBubble(entity, x, y - 62);
}

function drawLeg(lx, ly, s, pantColor, bootColor, dirX, dirY, moving, sinVal, side) {
  const thighH = 4 * s;
  const shinH = 3 * s;
  const footH = 2 * s;
  const legW = 3 * s;
  const kneeShift = moving ? Math.round(sinVal * side * 1.2) : 0;

  ctx.fillStyle = pantColor;
  ctx.fillRect(lx, ly, legW, thighH);

  ctx.fillStyle = blend(pantColor, "#000000", 0.15);
  ctx.fillRect(lx + kneeShift, ly + thighH, legW, shinH);

  ctx.fillStyle = bootColor;
  ctx.fillRect(lx + kneeShift, ly + thighH + shinH, legW + s, footH);
}

function drawTorso2(tx, ty, s, style, torsoColor, trimColor, classId, fx, fy) {
  const w = 12 * s;
  const h = 10 * s;

  if (style === "armor") {
    ctx.fillStyle = "#5a6577";
    ctx.fillRect(tx, ty, w, h);
    ctx.fillStyle = "#6f7b86";
    ctx.fillRect(tx + s, ty + s, w - 2 * s, h - 2 * s);
    ctx.fillStyle = "#d4dae2";
    ctx.fillRect(tx + 2 * s, ty + 2 * s, w - 4 * s, s);
    ctx.fillRect(tx + 5 * s, ty, 2 * s, h);
    ctx.fillStyle = blend(torsoColor, "#ffffff", 0.3);
    ctx.fillRect(tx + 2 * s, ty + 5 * s, w - 4 * s, s);
    ctx.fillStyle = trimColor;
    ctx.fillRect(tx, ty + h - 2 * s, w, 2 * s);
    return;
  }

  if (style === "robe") {
    ctx.fillStyle = torsoColor;
    ctx.fillRect(tx, ty, w, h + 3 * s);
    ctx.fillStyle = blend(torsoColor, "#000000", 0.2);
    ctx.fillRect(tx, ty + h, w, 3 * s);
    ctx.fillStyle = trimColor;
    ctx.fillRect(tx, ty, s, h + 3 * s);
    ctx.fillRect(tx + w - s, ty, s, h + 3 * s);
    ctx.fillStyle = blend(torsoColor, "#ffffff", 0.15);
    ctx.fillRect(tx + 5 * s, ty, 2 * s, h);
    return;
  }

  ctx.fillStyle = torsoColor;
  ctx.fillRect(tx, ty, w, h);
  ctx.fillStyle = blend(torsoColor, "#000000", 0.18);
  ctx.fillRect(tx, ty + h - 2 * s, w, 2 * s);
  ctx.fillStyle = trimColor;
  ctx.fillRect(tx + 3 * s, ty, w - 6 * s, s);
  ctx.fillStyle = blend(torsoColor, "#ffffff", 0.12);
  ctx.fillRect(tx + 5 * s, ty + s, 2 * s, h - 3 * s);
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
  ctx.fillStyle = isMod ? "rgba(220, 200, 255, 0.96)" : "rgba(247, 243, 223, 0.94)";
  ctx.strokeStyle = isMod ? "rgba(90, 30, 168, 0.9)" : "rgba(28, 34, 46, 0.88)";
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

  ctx.fillStyle = isMod ? "#3a1060" : "#1d2430";
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

function drawClassEquipment(entity, x, y, dirX, dirY, sideX, sideY, accent, rHandX, rHandY, lHandX, lHandY) {
  const style = entity.weaponStyle || "classic";
  const weaponKind = entity.weaponKind || (entity.classId === "mage" ? "staff" : entity.classId === "knight" ? "sword" : "bow");
  if (!entity.weaponKind) {
    return;
  }
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (weaponKind === "staff") {
    const tipX = lHandX + dirX * 8 - sideX * 4;
    const tipY = lHandY - 40 + dirY * 8 - sideY * 4;
    ctx.strokeStyle = style === "ornate" ? accent : "#6b4428";
    ctx.lineWidth = style === "heavy" ? 7 : 5;
    ctx.beginPath();
    ctx.moveTo(lHandX, lHandY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.fillStyle = style === "ornate" ? "#c79cff" : "#ff7a45";
    ctx.beginPath();
    ctx.arc(tipX, tipY, style === "heavy" ? 8 : 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(tipX - 3, tipY - 3, 6, 6);
  } else if (weaponKind === "sword") {
    const swordTipX = rHandX + dirX * 28 + sideX * 6;
    const swordTipY = rHandY - 10 + dirY * 28 + sideY * 6;
    ctx.strokeStyle = style === "ornate" ? accent : "#edf3f7";
    ctx.lineWidth = style === "heavy" ? 7 : 5;
    ctx.beginPath();
    ctx.moveTo(rHandX, rHandY);
    ctx.lineTo(swordTipX, swordTipY);
    ctx.stroke();
    ctx.strokeStyle = "#7b532f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(rHandX - sideX * 6, rHandY - sideY * 6);
    ctx.lineTo(rHandX + sideX * 6, rHandY + sideY * 6);
    ctx.stroke();

    ctx.fillStyle = style === "heavy" ? "#2f3744" : "#3f4b5e";
    ctx.beginPath();
    ctx.ellipse(lHandX, lHandY - 4, 10, 14, entity.facing || 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d4dae2";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(lHandX - 2, lHandY - 14, 4, 20);
    if (style === "ornate") {
      ctx.fillRect(lHandX - 7, lHandY - 6, 14, 4);
    }
  } else {
    ctx.strokeStyle = style === "ornate" ? accent : "#8b5a34";
    ctx.lineWidth = style === "heavy" ? 7 : 5;
    ctx.beginPath();
    ctx.moveTo(lHandX - dirX * 12, lHandY - 12 - dirY * 12);
    ctx.quadraticCurveTo(lHandX + sideX * 8, lHandY + sideY * 8, lHandX + dirX * 12, lHandY + 6 + dirY * 12);
    ctx.stroke();
    ctx.strokeStyle = style === "heavy" ? "#d7e4ef" : "#f4ead3";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lHandX - dirX * 12, lHandY - 12 - dirY * 12);
    ctx.lineTo(lHandX + dirX * 12, lHandY + 6 + dirY * 12);
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.lineWidth = style === "heavy" ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(rHandX, rHandY);
    ctx.lineTo(rHandX + dirX * 16, rHandY - 14 + dirY * 16);
    ctx.stroke();
  }

  ctx.restore();
}

function drawMob(entity, x, y) {
  const phase = entity.walkPhase || 0;
  const bounce = Math.round(Math.sin(phase * 3) * 2);
  const primary = entity.primary || "#56b88f";
  const accent = entity.accent || "#c7f5b0";
  const isBoss = Boolean(entity.isBoss);
  const isCritter = Boolean(entity.isCritter);
  const bodyW = isBoss ? 30 : isCritter ? 15 : 24;
  const bodyH = isBoss ? 14 : isCritter ? 7 : 10;
  const headW = isBoss ? 26 : isCritter ? 12 : 20;
  const headH = isBoss ? 18 : isCritter ? 8 : 14;
  const nameY = isBoss ? y - 34 : isCritter ? y - 20 : y - 26;
  const barW = isBoss ? 44 : isCritter ? 22 : 32;

  drawEllipseShadow(x - bodyW / 2, y + 8, bodyW, isBoss ? 8 : isCritter ? 4 : 6, isCritter ? 0.2 : 0.28);
  ctx.fillStyle = blend(primary, "#000000", 0.25);
  ctx.fillRect(x - bodyW / 2, y - 1 + bounce, bodyW, bodyH);
  ctx.fillStyle = primary;
  ctx.fillRect(x - headW / 2, y - 8 + bounce - (isBoss ? 3 : isCritter ? 1 : 0), headW, headH);
  ctx.fillStyle = accent;
  if (isCritter) {
    const earX = bounce % 3;
    ctx.fillRect(x - 6 + earX, y - 12 + bounce, 4, 5);
    ctx.fillRect(x + 2 - earX, y - 12 + bounce, 4, 5);
  } else {
    ctx.fillRect(x - 6, y - 4 + bounce, 3, 3);
    ctx.fillRect(x + 4, y - 4 + bounce, 3, 3);
  }
  if (isBoss) {
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(x - 11, y - 16 + bounce, 5, 5);
    ctx.fillRect(x + 6, y - 16 + bounce, 5, 5);
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.fillRect(x - Math.min(headW / 3, 7), y - 9 + bounce, 6, 2);

  ctx.font = `${isBoss ? 13 : isCritter ? 10 : 12}px ui-sans-serif, system-ui`;
  ctx.textAlign = "center";
  ctx.lineWidth = isCritter ? 2 : 3;
  ctx.strokeStyle = "rgba(8, 12, 18, 0.82)";
  ctx.fillStyle = isBoss ? "#ffd166" : isCritter ? "#d8eec8" : "#ffc0a0";
  const label =
    Number.isFinite(entity.level) && !isCritter ? `Lv ${entity.level} ${entity.name}` : entity.name;
  ctx.strokeText(label, x, nameY);
  ctx.fillText(label, x, nameY);
  drawHealthBar(x - barW / 2, y - (isBoss ? 27 : isCritter ? 16 : 20), barW, isCritter ? 3 : 4, entity.hp, entity.maxHp);
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
  ctx.fillStyle = fx.blocked ? "#b9d7ff" : "#ffdf7a";
  ctx.font = "13px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.fillText(fx.blocked ? `blocked -${fx.damage}` : `-${fx.damage}`, tx, ty - 22 - pct * 18);
  ctx.globalAlpha = 1;
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
      if (getTile(tx, ty) === TILE.TREE) {
        const sx = Math.floor(tx * TILE_SIZE - state.camera.x + screenHalfW);
        const sy = Math.floor(ty * TILE_SIZE - state.camera.y + screenHalfH);
        drawTreeCanopy(sx, sy, tx, ty);
      }
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

function isNearTile(tx, ty, tile) {
  return getTile(tx - 1, ty) === tile || getTile(tx + 1, ty) === tile || getTile(tx, ty - 1) === tile || getTile(tx, ty + 1) === tile;
}

function drawBuildingSprites(minTileX, maxTileX, minTileY, maxTileY) {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
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
    drawBuildingSprite(building, sx, sy);
  }
}

function drawBuildingSprite(building, sx, sy) {
  const w = building.w * TILE_SIZE;
  const h = building.h * TILE_SIZE;
  const variant = getBuildingVariant(building);
  drawCastShadow(sx + 10, sy + h - 14, w - 6, 18, 0.28);
  drawHouse(building, sx, sy, w, h, variant);
}

function getBuildingVariant(building) {
  const n = building.name;
  if (n.includes("Frost") || n.includes("Snow") || n.includes("Pine")) return "stone";
  if (n.includes("Town") || n.includes("Hall") || n.includes("Shrine")) return "stone";
  if (n.includes("Oasis") || n.includes("Sun") || n.includes("Clay")) return "desert";
  if (n.includes("Ember") || n.includes("Ash") || n.includes("Forge")) return "ember";
  if (n.includes("Forest") || n.includes("Ranger") || n.includes("Woodland")) return "wood";
  return "timber";
}

const BUILDING_PALETTES = {
  timber: { roofBase: "#9c4c1a", roofDark: "#6a2e0e", roofMid: "#b86030", roofLight: "#d4884a", roofRidge: "#3c1808", eave: "#3c1808", wall: "#7a4a22", wallLight: "#a06838", wallDark: "#4a2c10", wallLine: "#3a1e0a", win: "#b8deff", door: "#2c1408", doorFrame: "#c07830", ground: "#5a7a44" },
  stone:  { roofBase: "#5a6060", roofDark: "#323838", roofMid: "#6e7e7e", roofLight: "#98aaaa", roofRidge: "#1a2020", eave: "#242c2c", wall: "#7a8484", wallLight: "#a8b8b8", wallDark: "#4a5454", wallLine: "#3a4444", win: "#c8e8ff", door: "#1c2424", doorFrame: "#98a8a8", ground: "#6e7a52" },
  wood:   { roofBase: "#5c3818", roofDark: "#341e0c", roofMid: "#7a5028", roofLight: "#9a7040", roofRidge: "#200e04", eave: "#200e04", wall: "#4a2e14", wallLight: "#6a4828", wallDark: "#2c1a08", wallLine: "#1e0e04", win: "#b8e8b8", door: "#180c04", doorFrame: "#9a6828", ground: "#3a5a2a" },
  desert: { roofBase: "#c07830", roofDark: "#8a4c18", roofMid: "#d89848", roofLight: "#f0c070", roofRidge: "#5a2c0c", eave: "#5a2c0c", wall: "#c8a060", wallLight: "#e4c890", wallDark: "#8a6a30", wallLine: "#6a4820", win: "#fff0c0", door: "#5c3010", doorFrame: "#e0a040", ground: "#b88840" },
  ember:  { roofBase: "#2c1c10", roofDark: "#140c08", roofMid: "#482818", roofLight: "#7a3c1c", roofRidge: "#080404", eave: "#0c0604", wall: "#281410", wallLight: "#483028", wallDark: "#140a08", wallLine: "#0c0604", win: "#ff8820", door: "#0c0404", doorFrame: "#8c3410", ground: "#2c2014" },
};

function drawHouse(building, sx, sy, w, h, variant) {
  const p = BUILDING_PALETTES[variant] || BUILDING_PALETTES.timber;
  const wallH = Math.max(38, Math.min(56, Math.round(h * 0.26)));
  const roofH = h - wallH;
  const wallY = sy + roofH;
  const inset = 4;
  const rw = w - inset * 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.32)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 6;

  // --- ROOF ---
  ctx.fillStyle = p.roofBase;
  ctx.fillRect(sx + inset, sy + 2, rw, roofH - 2);

  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  // Shingles: horizontal bands
  const shingleH = 5;
  for (let ly = 6; ly < roofH - 2; ly += shingleH + 2) {
    ctx.fillStyle = ly % (shingleH * 3) < shingleH ? p.roofMid : p.roofBase;
    ctx.fillRect(sx + inset, sy + 2 + ly, rw, shingleH);
    ctx.fillStyle = p.roofDark;
    ctx.fillRect(sx + inset, sy + 2 + ly + shingleH, rw, 2);
  }

  // Ridge line (runs left–right at roof center)
  const ridgeY = sy + 2 + Math.round(roofH * 0.28);
  ctx.fillStyle = p.roofRidge;
  ctx.fillRect(sx + inset, ridgeY, rw, 4);
  ctx.fillStyle = p.roofLight;
  ctx.fillRect(sx + inset, ridgeY + 1, rw, 2);

  // Top highlight
  ctx.fillStyle = p.roofLight;
  ctx.fillRect(sx + inset + 4, sy + 3, Math.round(rw * 0.55), 3);

  // Eave (dark overhang strip at wall join)
  ctx.fillStyle = p.eave;
  ctx.fillRect(sx + inset - 2, wallY - 6, rw + 4, 8);
  ctx.fillStyle = blend(p.eave, "#000000", 0.5);
  ctx.fillRect(sx + inset - 2, wallY + 2, rw + 4, 3);

  // Chimney (on roof, slightly right of center)
  const chimneyX = sx + Math.round(w * 0.65);
  const chimneyBotY = ridgeY + 2;
  ctx.fillStyle = blend(p.wall, "#000000", 0.35);
  ctx.fillRect(chimneyX - 5, sy + 3, 11, 4);
  ctx.fillStyle = p.wall;
  ctx.fillRect(chimneyX - 4, sy + 4, 9, chimneyBotY - sy - 4);
  ctx.fillStyle = p.wallLight;
  ctx.fillRect(chimneyX - 4, sy + 5, 3, 3);
  if (variant !== "ember") {
    ctx.fillStyle = "rgba(200,200,200,0.3)";
    ctx.beginPath();
    ctx.ellipse(chimneyX, sy + 1, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- FRONT WALL ---
  ctx.fillStyle = p.wall;
  ctx.fillRect(sx + inset - 2, wallY, rw + 4, wallH);

  // Wall texture: vertical boards (timber/wood) or horizontal blocks (stone)
  if (variant === "stone") {
    ctx.fillStyle = p.wallDark;
    for (let ly = 0; ly < wallH; ly += 9) {
      const offset = Math.floor(ly / 9) % 2 === 0 ? 0 : 14;
      for (let lx = -14 + offset; lx < rw + 4; lx += 28) {
        ctx.fillRect(sx + inset - 2 + lx, wallY + ly, 27, 8);
      }
    }
    ctx.fillStyle = p.wallLine;
    for (let ly = 0; ly < wallH; ly += 9) {
      ctx.fillRect(sx + inset - 2, wallY + ly, rw + 4, 1);
    }
  } else {
    ctx.fillStyle = p.wallLine;
    for (let lx = 8; lx < rw + 4; lx += 8) {
      ctx.fillRect(sx + inset - 2 + lx, wallY, 1, wallH);
    }
  }

  // Wall top highlight
  ctx.fillStyle = p.wallLight;
  ctx.fillRect(sx + inset - 2, wallY, rw + 4, 3);

  // Wall side shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(sx + inset - 2, wallY, 4, wallH);
  ctx.fillRect(sx + inset - 2 + rw, wallY, 4, wallH);

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

  // --- DOOR ---
  const doorW = Math.max(14, Math.round(w * 0.14));
  const doorH = wallH - 4;
  const doorX = sx + Math.round(w / 2) - Math.round(doorW / 2);
  const doorY = wallY + wallH - doorH;
  ctx.fillStyle = p.doorFrame;
  ctx.fillRect(doorX - 2, doorY - 2, doorW + 4, doorH + 2);
  ctx.fillStyle = p.door;
  ctx.fillRect(doorX, doorY, doorW, doorH);
  // Door panels
  ctx.fillStyle = blend(p.door, "#ffffff", 0.15);
  ctx.fillRect(doorX + 2, doorY + 3, Math.round(doorW / 2) - 3, Math.round(doorH / 2) - 4);
  ctx.fillRect(doorX + 2, doorY + Math.round(doorH / 2), Math.round(doorW / 2) - 3, Math.round(doorH / 2) - 4);
  // Door handle
  ctx.fillStyle = "#e8c040";
  ctx.fillRect(doorX + doorW - 5, doorY + Math.round(doorH / 2) - 1, 4, 4);

  ctx.restore();

  // Front garden strip
  drawBuildingFrontDetail(sx + inset - 2, sx + inset - 2 + rw + 4, sy + h, variant, p);
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

function drawPortal(sx, sy, tx, ty) {
  const portal = getPortalAtTile(tx, ty);
  if (!portal) return;

  const time = performance.now() / 1000;
  const color = portal.color || "#75f0ff";
  const T = TILE_SIZE;
  const cx = sx + T + T / 2;
  const cy = sy + T;
  const gateR = T * 2.8;
  const pulse = 0.5 + Math.sin(time * 3) * 0.5;

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
  const rgb = hexToRgb(color);

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 22 + pulse * 10;
  ctx.strokeStyle = "#3a3e4e";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "#555b6e";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#6e748a";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#494f63";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6 + pulse * 0.4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  const numChevrons = 9;
  for (let i = 0; i < numChevrons; i += 1) {
    const angle = (Math.PI * 2 * i) / numChevrons - Math.PI / 2;
    const chx = cx + Math.cos(angle) * r;
    const chy = cy + Math.sin(angle) * r;
    const lit = Math.sin(time * 2 + i * 0.9) > 0;
    ctx.save();
    ctx.translate(chx, chy);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = lit ? "#ffd166" : "#4a4230";
    ctx.shadowColor = lit ? "#ffd166" : "transparent";
    ctx.shadowBlur = lit ? 8 : 0;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-6, 5);
    ctx.lineTo(6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2a2820";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}

function drawPortalEventHorizon(cx, cy, r, portal, time) {
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, "#0e0828");
  grad.addColorStop(0.7, "#120a30");
  grad.addColorStop(1, "#1a1040");
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
  ctx.fillStyle = `rgba(${rgb}, 0.1)`;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  for (let ring = 0; ring < 5; ring += 1) {
    const rr = ((time * 20 + ring * r / 5) % r);
    const alpha = 0.15 * (1 - rr / r);
    ctx.strokeStyle = `rgba(${rgb},${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < 8; i += 1) {
    const angle = time * 0.6 + i * Math.PI / 4;
    const sr = r * 0.15 + Math.sin(time * 1.8 + i * 1.3) * r * 0.35;
    const sx = cx + Math.cos(angle) * sr;
    const sy = cy + Math.sin(angle) * sr;
    const shimmer = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10);
    shimmer.addColorStop(0, `rgba(255,255,255,${0.2 + Math.sin(time * 2.5 + i) * 0.1})`);
    shimmer.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shimmer;
    ctx.beginPath();
    ctx.arc(sx, sy, 10, 0, Math.PI * 2);
    ctx.fill();
  }
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
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function setStatus(text) {
  statusEl.textContent = text;
}
