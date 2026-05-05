const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d", { alpha: false });
const bootPanel = document.querySelector("#boot");
const statusEl = document.querySelector("#status");
const menu = document.querySelector("#menu");
const menuServerUrlInput = document.querySelector("#menuServerUrlInput");
const resumeButton = document.querySelector("#resumeButton");
const serverForm = document.querySelector("#serverForm");
const form = document.querySelector("#characterForm");
const playButton = document.querySelector("#playButton");
const nameInput = document.querySelector("#nameInput");
const hud = document.querySelector("#hud");
const populationEl = document.querySelector("#population");
const positionEl = document.querySelector("#position");
const chat = document.querySelector("#chat");
const chatMessages = document.querySelector("#chatMessages");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");

const TILE_SIZE = 32;
const CHUNK_SIZE = 16;
const CLIENT_PLAYER_SPEED = 5.2;
const PRODUCTION_SERVER_URL = "wss://balathor.edmundmurphy.com/ws";
const SERVER_URL_STORAGE_KEY = "balathor.serverUrl";
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
};

const kenneyRpgBase = new Image();
kenneyRpgBase.src = "./assets/kenney-rpg-base.png";
const KENNEY_TILE_SIZE = 64;
const KENNEY_SHEET_COLUMNS = 20;

const state = {
  socket: null,
  config: null,
  connected: false,
  joined: false,
  selfId: null,
  selectedClass: "ranger",
  primary: "#5cc8ff",
  accent: "#ffd166",
  players: new Map(),
  npcs: new Map(),
  mobs: new Map(),
  combatFx: [],
  chunks: new Map(),
  portals: new Map(),
  buildings: new Map(),
  requestedChunks: new Set(),
  population: 0,
  input: { up: false, down: false, left: false, right: false },
  inputSeq: 0,
  camera: { x: 0, y: 0 },
  activeServerUrl: "",
  menuOpen: false,
  lastFrame: performance.now()
};

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
    form.classList.remove("hidden");
    nameInput.focus();
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
  if (message.type === "welcome") {
    state.selfId = message.selfId;
    state.joined = true;
    bootPanel.classList.add("hidden");
    hud.classList.remove("hidden");
    chat.classList.remove("hidden");
    state.camera.x = message.spawn.x * TILE_SIZE;
    state.camera.y = message.spawn.y * TILE_SIZE;
    requestVisibleChunks();
    return;
  }

  if (message.type === "teleport") {
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
    state.population = message.population;
    applySnapshot(message.players);
    applyNpcSnapshot(message.npcs || []);
    applyMobSnapshot(message.mobs || []);
    return;
  }

  if (message.type === "combat") {
    applyCombatEvent(message);
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
    }
  }
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

    const follow = player.id === state.selfId ? 1 - Math.pow(0.00002, dt) : 1 - Math.pow(0.0005, dt);
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
  player.renderX += dx * CLIENT_PLAYER_SPEED * dt;
  player.renderY += dy * CLIENT_PLAYER_SPEED * dt;
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

    playButton.disabled = true;
    send({
      type: "hello",
      name: nameInput.value,
      classId: state.selectedClass,
      primary: state.primary,
      accent: state.accent
    });
  });

  serverForm.addEventListener("submit", (event) => {
    event.preventDefault();
    changeServer(menuServerUrlInput.value);
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

  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("focus", clearMovementInput);
  });

  window.addEventListener("resize", resize);

  canvas.addEventListener("pointerdown", (event) => {
    if (!state.joined || state.menuOpen || isTextEntryTarget(event.target)) {
      return;
    }
    event.preventDefault();
    sendAttack();
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
      sendAttack();
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

function resetToConnection(message) {
  state.connected = false;
  state.joined = false;
  state.selfId = null;
  state.socket = null;
  clearWorldState();
  state.menuOpen = false;
  menu.classList.add("hidden");
  menu.setAttribute("aria-hidden", "true");
  clearMovementInput();
  playButton.disabled = false;
  setStatus(message);
  bootPanel.classList.remove("hidden");
  form.classList.add("hidden");
  hud.classList.add("hidden");
  chat.classList.add("hidden");
  chatMessages.replaceChildren();
}

function clearWorldState() {
  state.players.clear();
  state.npcs.clear();
  state.mobs.clear();
  state.combatFx = [];
  state.chunks.clear();
  state.portals.clear();
  state.buildings.clear();
  state.requestedChunks.clear();
  state.population = 0;
}

function sendAttack() {
  send({ type: "attack" });
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
  const line = document.createElement("div");
  const kindClass = message.kind === "system" ? "system" : message.kind === "npc" ? "npc" : "player";
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
  form.classList.add("hidden");
  playButton.disabled = false;
  state.joined = false;
  state.selfId = null;
  connect(normalizedUrl);
}

function frame(now) {
  const dt = Math.min(0.05, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
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
  const hpText = Number.isFinite(self.hp) ? ` HP ${self.hp}/${self.maxHp}` : "";
  positionEl.textContent = `${Math.round(self.renderX)}, ${Math.round(self.renderY)}${hpText}`;
  requestVisibleChunks();
}

function requestVisibleChunks() {
  if (!state.joined) {
    return;
  }

  const widthTiles = Math.ceil(canvas.width / TILE_SIZE);
  const heightTiles = Math.ceil(canvas.height / TILE_SIZE);
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
    return;
  }

  drawWorld();
  drawPlayers();
  drawCombatFx();
  drawLighting();
  populationEl.textContent = `${state.population} online`;
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
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;
  const minTileX = Math.floor((state.camera.x - halfW) / TILE_SIZE) - 1;
  const maxTileX = Math.ceil((state.camera.x + halfW) / TILE_SIZE) + 1;
  const minTileY = Math.floor((state.camera.y - halfH) / TILE_SIZE) - 1;
  const maxTileY = Math.ceil((state.camera.y + halfH) / TILE_SIZE) + 1;

  for (let ty = minTileY; ty <= maxTileY; ty += 1) {
    for (let tx = minTileX; tx <= maxTileX; tx += 1) {
      const tile = getTile(tx, ty);
      const sx = Math.floor(tx * TILE_SIZE - state.camera.x + halfW);
      const sy = Math.floor(ty * TILE_SIZE - state.camera.y + halfH);
      drawTile(tile, sx, sy, tx, ty);
    }
  }

  drawWorldAssets(minTileX, maxTileX, minTileY, maxTileY);
  drawBuildingSprites(minTileX, maxTileX, minTileY, maxTileY);
}

function drawTile(tile, sx, sy, tx, ty) {
  if (isInteriorTileCoordinate(tx, ty)) {
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
    drawGroundPatch(TILE.DARK_GRASS, sx, sy, tx, ty, tilePalette[TILE.DARK_GRASS]);
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

function drawCharacter(entity, x, y, isNpc = false) {
  const scale = 2;
  const phase = entity.walkPhase || 0;
  const moving = Boolean(entity.renderMoving);
  const bob = moving ? Math.round(Math.sin(phase * 1.6) * 1.5) : 0;
  const stride = moving ? Math.sin(phase * 1.6) : 0;
  const facing = Number.isFinite(entity.facing) ? entity.facing : Math.PI / 2;
  const dirX = Math.cos(facing);
  const dirY = Math.sin(facing);
  const sideX = -dirY;
  const sideY = dirX;
  const forward = moving ? Math.round(stride * 2) : 0;
  const travelX = Math.round(dirX * 2);
  const travelY = Math.round(dirY * 2);
  const px = x - 8 * scale;
  const py = y - 10 * scale + bob;
  const primary = entity.primary || "#5cc8ff";
  const accent = entity.accent || "#ffd166";

  drawEllipseShadow(x - 11, y + 7, 22, 5, 0.28);

  pixel(px, py, 5, 1, 6, 2, accent, scale);
  pixel(px, py, 4, 3, 8, 7, primary, scale);
  pixel(px, py, 6, 4, 4, 3, "#f0c9a2", scale);

  const leftFootX = 4 + travelX - Math.round(sideX * forward);
  const leftFootY = 10 + travelY - Math.round(sideY * forward);
  const rightFootX = 10 + travelX + Math.round(sideX * forward);
  const rightFootY = 10 + travelY + Math.round(sideY * forward);
  const leftKneeX = 5 + Math.round(sideX * forward);
  const leftKneeY = 7 + Math.round(sideY * forward);
  const rightKneeX = 9 - Math.round(sideX * forward);
  const rightKneeY = 7 - Math.round(sideY * forward);

  pixel(px, py, leftKneeX, leftKneeY, 3, 4, "#202437", scale);
  pixel(px, py, rightKneeX, rightKneeY, 3, 4, "#202437", scale);
  pixel(px, py, leftFootX, leftFootY, 3, 2, "#111722", scale);
  pixel(px, py, rightFootX, rightFootY, 3, 2, "#111722", scale);

  const leftArmX = 3 + Math.round(-sideX * forward) + travelX;
  const leftArmY = 6 + Math.round(-sideY * forward) + travelY;
  const rightArmX = 11 + Math.round(sideX * forward) + travelX;
  const rightArmY = 6 + Math.round(sideY * forward) + travelY;
  pixel(px, py, leftArmX, leftArmY, 3, 4, accent, scale);
  pixel(px, py, rightArmX, rightArmY, 3, 4, accent, scale);

  if (entity.classId === "mage") {
    pixel(px, py, 3, 2, 10, 2, accent, scale);
    pixel(px, py, 7, -1, 3, 4, primary, scale);
  } else if (entity.classId === "knight") {
    pixel(px, py, 4, 2, 8, 2, "#d4dae2", scale);
    pixel(px, py, 3, 7, 10, 4, "#8a929e", scale);
  } else {
    pixel(px, py, 2, 5, 3, 5, accent, scale);
    pixel(px, py, 11, 5, 3, 5, accent, scale);
  }

  if (!isNpc) {
    drawClassEquipment(entity, x, y + bob, dirX, dirY, sideX, sideY, accent);
  }

  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(8, 12, 18, 0.82)";
  ctx.fillStyle = isNpc ? "#ffd27a" : "#f7f3df";
  ctx.strokeText(entity.name, x, y - 28);
  ctx.fillText(entity.name, x, y - 28);

  if (!isNpc && Number.isFinite(entity.hp) && Number.isFinite(entity.maxHp)) {
    drawHealthBar(x - 14, y - 22, 28, 4, entity.hp, entity.maxHp);
  }
}

function drawClassEquipment(entity, x, y, dirX, dirY, sideX, sideY, accent) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (entity.classId === "mage") {
    const baseX = x - sideX * 12 - dirX * 2;
    const baseY = y + 8 - sideY * 12 - dirY * 2;
    const tipX = x - sideX * 15 + dirX * 9;
    const tipY = y - 21 - sideY * 15 + dirY * 9;
    ctx.strokeStyle = "#6b4428";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.fillStyle = "#ff7a45";
    ctx.beginPath();
    ctx.arc(tipX, tipY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(tipX - 2, tipY - 2, 4, 4);
  } else if (entity.classId === "knight") {
    const swordBaseX = x + dirX * 8 + sideX * 4;
    const swordBaseY = y - 5 + dirY * 8 + sideY * 4;
    const swordTipX = x + dirX * 24 + sideX * 8;
    const swordTipY = y - 12 + dirY * 24 + sideY * 8;
    ctx.strokeStyle = "#edf3f7";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(swordBaseX, swordBaseY);
    ctx.lineTo(swordTipX, swordTipY);
    ctx.stroke();
    ctx.strokeStyle = "#7b532f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(swordBaseX - sideX * 5, swordBaseY - sideY * 5);
    ctx.lineTo(swordBaseX + sideX * 5, swordBaseY + sideY * 5);
    ctx.stroke();

    const shieldX = x - sideX * 12 + dirX * 3;
    const shieldY = y - 5 - sideY * 12 + dirY * 3;
    ctx.fillStyle = "#3f4b5e";
    ctx.beginPath();
    ctx.ellipse(shieldX, shieldY, 8, 11, entity.facing || 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d4dae2";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(shieldX - 2, shieldY - 7, 4, 14);
  } else {
    const bowX = x - sideX * 13 + dirX * 2;
    const bowY = y - 7 - sideY * 13 + dirY * 2;
    ctx.strokeStyle = "#8b5a34";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bowX - dirX * 9 - dirY * 4, bowY - dirY * 9 + dirX * 4);
    ctx.quadraticCurveTo(bowX + sideX * 7, bowY + sideY * 7, bowX + dirX * 9 + dirY * 4, bowY + dirY * 9 - dirX * 4);
    ctx.stroke();
    ctx.strokeStyle = "#f4ead3";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bowX - dirX * 9 - dirY * 4, bowY - dirY * 9 + dirX * 4);
    ctx.lineTo(bowX + dirX * 9 + dirY * 4, bowY + dirY * 9 - dirX * 4);
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + sideX * 8 - dirX * 10, y - 12 + sideY * 8 - dirY * 10);
    ctx.lineTo(x + sideX * 8 + dirX * 8, y - 3 + sideY * 8 + dirY * 8);
    ctx.stroke();
  }

  ctx.restore();
}

function drawMob(entity, x, y) {
  const phase = entity.walkPhase || 0;
  const bounce = Math.round(Math.sin(phase * 3) * 2);
  const primary = entity.primary || "#56b88f";
  const accent = entity.accent || "#c7f5b0";

  drawEllipseShadow(x - 12, y + 8, 24, 6, 0.28);
  ctx.fillStyle = blend(primary, "#000000", 0.25);
  ctx.fillRect(x - 12, y - 1 + bounce, 24, 10);
  ctx.fillStyle = primary;
  ctx.fillRect(x - 10, y - 8 + bounce, 20, 14);
  ctx.fillStyle = accent;
  ctx.fillRect(x - 5, y - 4 + bounce, 3, 3);
  ctx.fillRect(x + 3, y - 4 + bounce, 3, 3);
  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.fillRect(x - 7, y - 7 + bounce, 6, 2);

  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(8, 12, 18, 0.82)";
  ctx.fillStyle = "#ffc0a0";
  ctx.strokeText(entity.name, x, y - 26);
  ctx.fillText(entity.name, x, y - 26);
  drawHealthBar(x - 16, y - 20, 32, 4, entity.hp, entity.maxHp);
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
  ctx.fillStyle = colors[0];
  ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = colors[1];
  ctx.fillRect(sx, sy + 5, TILE_SIZE, 22);
  ctx.fillStyle = colors[2];
  ctx.fillRect(sx, sy + 5, TILE_SIZE, 2);
  ctx.fillRect(sx, sy + 25, TILE_SIZE, 2);
  ctx.fillStyle = "rgba(255, 240, 180, 0.18)";
  ctx.fillRect(sx + 5, sy + 11, 10, 2);
  ctx.fillRect(sx + 18, sy + 19, 8, 2);
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

function drawWorldAssets(minTileX, maxTileX, minTileY, maxTileY) {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;

  for (let ty = minTileY; ty <= maxTileY; ty += 1) {
    for (let tx = minTileX; tx <= maxTileX; tx += 1) {
      const tile = getTile(tx, ty);
      const sx = Math.floor(tx * TILE_SIZE - state.camera.x + halfW);
      const sy = Math.floor(ty * TILE_SIZE - state.camera.y + halfH);

      if (tile === TILE.TREE) {
        drawCuratedTree(sx, sy, tx, ty);
      } else if ((tile === TILE.GRASS || tile === TILE.DARK_GRASS) && hash2(tx, ty, 501) > 0.93) {
        drawCuratedBush(sx, sy, tx, ty, tile === TILE.DARK_GRASS);
      } else if ((tile === TILE.STONE || tile === TILE.SAND || tile === TILE.SNOW) && hash2(tx, ty, 502) > 0.9) {
        drawCuratedRock(sx, sy, tx, ty, tile === TILE.SAND);
      } else if (tile === TILE.PATH && hash2(tx, ty, 503) > 0.985) {
        drawCuratedSign(sx, sy);
      }
    }
  }
}

function drawCuratedTree(sx, sy, tx, ty) {
  const frost = isNearTile(tx, ty, TILE.SNOW);
  const ember = tx > 80 && ty < -70;
  const leaf = frost ? "#6f9396" : ember ? "#315f45" : "#2f7a4e";
  const leafLight = frost ? "#9fb9b8" : ember ? "#5f8552" : "#6ca85d";
  const leafDark = frost ? "#46696e" : ember ? "#254a38" : "#215b3a";
  const trunk = ember ? "#50312a" : "#6c4b2e";

  drawEllipseShadow(sx + 7, sy + 24, 18, 5, 0.24);
  ctx.fillStyle = trunk;
  ctx.fillRect(sx + 13, sy + 17, 6, 11);
  ctx.fillStyle = leafDark;
  ctx.fillRect(sx + 7, sy + 10, 18, 13);
  ctx.fillStyle = leaf;
  ctx.fillRect(sx + 5, sy + 14, 22, 9);
  ctx.fillRect(sx + 10, sy + 5, 12, 9);
  ctx.fillStyle = leafLight;
  ctx.fillRect(sx + 10, sy + 9, 6, 3);
  ctx.fillRect(sx + 14, sy + 4, 5, 2);
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

  drawCastShadow(sx + 12, sy + h - 18, w - 4, 20, 0.32);

  if (!kenneyRpgBase.complete || kenneyRpgBase.naturalWidth === 0) {
    drawBuildingFallback(sx, sy, w, h, variant);
    return;
  }

  drawKenneyHouse(building, sx, sy, w, h, variant);
}

function getBuildingVariant(building) {
  const cold = building.name.includes("Frost") || building.name.includes("Snow") || building.name.includes("Pine");
  const stone = building.name.includes("Town") || building.name.includes("Hall") || building.name.includes("Shrine");
  return cold || stone ? "stone" : "timber";
}

function drawKenneyHouse(building, sx, sy, w, h, variant) {
  const wide = building.w >= 11;
  const cols = wide ? 5 : 4;
  const tile = 64;
  const houseW = cols * tile;
  const houseX = Math.round(sx + (w - houseW) / 2);
  const bodyRows = wide ? 3 : 2;
  const bodyY = Math.round(sy + h - bodyRows * tile - 12);
  const roofY = bodyY - (wide ? 100 : 80);
  const doorIndex = variant === "stone" ? 214 : 189;
  const wallIndex = variant === "stone" ? 60 : 83;
  const wallDetailIndex = variant === "stone" ? 80 : 84;
  const windowIndex = variant === "stone" ? 191 : 185;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 8;

  for (let row = 0; row < bodyRows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      drawKenneyTile((row + col) % 2 === 0 ? wallIndex : wallDetailIndex, houseX + col * tile, bodyY + row * tile, tile, tile);
    }
  }

  const capTile = variant === "stone" ? 80 : 86;
  for (let col = 0; col < cols; col += 1) {
    drawKenneyTile(capTile, houseX + col * tile, bodyY - 18, tile, tile);
  }

  drawKenneyRoof(houseX, roofY, cols, variant);

  const doorX = houseX + Math.floor(cols / 2) * tile;
  drawKenneyTile(doorIndex, doorX, bodyY + (bodyRows - 1) * tile, tile, tile);

  if (cols > 3) {
    drawKenneyTile(windowIndex, houseX + tile, bodyY + tile * 0.35, tile, tile);
    drawKenneyTile(windowIndex, houseX + (cols - 2) * tile, bodyY + tile * 0.35, tile, tile);
  } else {
    drawKenneyTile(windowIndex, houseX + tile, bodyY + tile * 0.35, tile, tile);
  }

  ctx.restore();
}

function drawKenneyRoof(x, y, cols, variant) {
  const tan = variant !== "stone";
  const roofLeft = tan ? 101 : 110;
  const roofRight = tan ? 102 : 111;
  const gableLeft = tan ? 103 : 112;
  const gableRight = tan ? 104 : 113;
  const gableCenter = tan ? 105 : 114;
  const roofMid = tan ? 106 : 115;
  const tile = 64;

  drawKenneyTile(roofLeft, x, y + tile, tile, tile);
  drawKenneyTile(roofRight, x + (cols - 1) * tile, y + tile, tile, tile);

  for (let col = 1; col < cols - 1; col += 1) {
    drawKenneyTile(roofMid, x + col * tile, y + tile, tile, tile);
  }

  const center = Math.floor(cols / 2);
  drawKenneyTile(gableLeft, x + (center - 1) * tile, y + tile * 0.2, tile, tile);
  drawKenneyTile(gableRight, x + center * tile, y + tile * 0.2, tile, tile);
  drawKenneyTile(gableCenter, x + center * tile - tile / 2, y + tile * 0.9, tile, tile);
}

function drawKenneyTile(index, dx, dy, dw = KENNEY_TILE_SIZE, dh = KENNEY_TILE_SIZE) {
  const sx = (index % KENNEY_SHEET_COLUMNS) * KENNEY_TILE_SIZE;
  const sy = Math.floor(index / KENNEY_SHEET_COLUMNS) * KENNEY_TILE_SIZE;
  ctx.drawImage(kenneyRpgBase, sx, sy, KENNEY_TILE_SIZE, KENNEY_TILE_SIZE, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
}

function drawBuildingFallback(sx, sy, w, h, variant) {
  const roofColor = variant === "stone" ? "#5f6c72" : "#b97438";
  const wallColor = variant === "stone" ? "#9eb0b2" : "#e1d1a1";
  const roofH = Math.max(42, Math.min(72, h * 0.35));
  const bodyY = sy + roofH * 0.72;

  ctx.fillStyle = wallColor;
  ctx.fillRect(sx + 16, bodyY, w - 32, h - roofH);
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(sx + 4, bodyY + 6);
  ctx.lineTo(sx + w / 2, sy + 4);
  ctx.lineTo(sx + w - 4, bodyY + 6);
  ctx.closePath();
  ctx.fill();
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
  const time = performance.now() / 1000;
  const pulse = 0.5 + Math.sin(time * 4 + tx * 0.3) * 0.5;
  const color = portal?.color || "#75f0ff";

  drawEllipseShadow(sx + 2, sy + 23, TILE_SIZE - 4, 8, 0.42);
  drawPortalPreview(sx, sy, portal);

  ctx.save();
  ctx.translate(sx + 16, sy + 16);
  ctx.rotate(time * 1.8);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.85;
  ctx.strokeRect(-10, -10, 20, 20);
  ctx.rotate(-time * 3.1);
  ctx.strokeStyle = "#f87dff";
  ctx.globalAlpha = 0.42 + pulse * 0.35;
  ctx.strokeRect(-7, -7, 14, 14);
  ctx.restore();

  ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
  ctx.fillRect(sx + 15, sy + 3 + Math.round(pulse * 3), 2, 5);
  ctx.fillRect(sx + 25, sy + 15, 3, 2);
}

function drawPortalPreview(sx, sy, portal) {
  if (!portal?.preview?.tiles) {
    ctx.fillStyle = "#241844";
    ctx.fillRect(sx + 8, sy + 8, 16, 16);
    return;
  }

  const size = portal.preview.size;
  const sampleSize = 4;
  const startX = sx + 6;
  const startY = sy + 6;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const tile = portal.preview.tiles[y * size + x];
      const colors = tilePalette[tile] || tilePalette[TILE.GRASS];
      ctx.fillStyle = colors[0];
      ctx.fillRect(startX + x * sampleSize, startY + y * sampleSize, sampleSize, sampleSize);
    }
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.fillRect(startX + 4, startY + 4, 8, 3);
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
  return state.portals.get(`${tileX},${tileY}`) || null;
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
