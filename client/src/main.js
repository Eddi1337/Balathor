const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d", { alpha: false });
const bootPanel = document.querySelector("#boot");
const statusEl = document.querySelector("#status");
const connectionForm = document.querySelector("#connectionForm");
const serverUrlInput = document.querySelector("#serverUrlInput");
const connectButton = document.querySelector("#connectButton");
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
};

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
  chunks: new Map(),
  requestedChunks: new Set(),
  population: 0,
  input: { up: false, down: false, left: false, right: false },
  inputSeq: 0,
  camera: { x: 0, y: 0 },
  activeServerUrl: "",
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
  [TILE.GRASS]: ["#376d3b", "#438044", "#2f5c36"],
  [TILE.DARK_GRASS]: ["#244c33", "#2d5b3b", "#1f3d2e"],
  [TILE.TREE]: ["#23402a", "#31552e", "#6c4b2e"],
  [TILE.WATER]: ["#23618f", "#2f7db5", "#174b70"],
  [TILE.STONE]: ["#7f8792", "#9aa1a8", "#596271"],
  [TILE.PATH]: ["#826b45", "#a18454", "#5f4e35"],
  [TILE.FLOWERS]: ["#3f7a3d", "#f7d46b", "#dd6f99"],
  [TILE.WALL]: ["#6b5040", "#8c7060", "#4a3028"],
  [TILE.FLOOR]: ["#9a7c5a", "#b09070", "#7a5c40"],
  [TILE.DOOR]: ["#5c3520", "#7a4a2a", "#3c2010"],
};

resize();
wireUi();
start();
requestAnimationFrame(frame);
setInterval(sendInput, 33);

async function start() {
  setStatus("Loading realm config");
  state.config = await loadConfig();
  serverUrlInput.value = localStorage.getItem(SERVER_URL_STORAGE_KEY) || state.config.gameServerUrl;
  setStatus("Select a realm server");
  connectionForm.classList.remove("hidden");
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
    connectButton.disabled = false;
    return;
  }

  if (state.socket) {
    state.socket.close();
  }

  setStatus("Connecting to realm");
  connectButton.disabled = true;
  state.activeServerUrl = normalizedUrl;
  const socket = new WebSocket(normalizedUrl);
  state.socket = socket;

  socket.addEventListener("open", () => {
    state.connected = true;
    localStorage.setItem(SERVER_URL_STORAGE_KEY, normalizedUrl);
    setStatus("Connected");
    connectButton.disabled = false;
    connectionForm.classList.add("hidden");
    form.classList.remove("hidden");
    nameInput.focus();
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    handleServerMessage(message);
  });

  socket.addEventListener("close", () => {
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

  if (message.type === "chunk") {
    const key = chunkKey(message.cx, message.cy);
    state.chunks.set(key, message);
    state.requestedChunks.delete(key);
    return;
  }

  if (message.type === "snapshot") {
    state.population = message.population;
    applySnapshot(message.players);
    applyNpcSnapshot(message.npcs || []);
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
      lastSeen: now
    });
  }

  for (const [id] of state.npcs) {
    if (!seen.has(id)) {
      state.npcs.delete(id);
    }
  }
}

function updateSmoothPlayers(dt) {
  for (const player of state.players.values()) {
    if (player.id === state.selfId) {
      predictLocalPlayer(player, dt);
    }

    const follow = player.id === state.selfId ? 1 - Math.pow(0.00002, dt) : 1 - Math.pow(0.0005, dt);
    player.renderX += (player.targetX - player.renderX) * follow;
    player.renderY += (player.targetY - player.renderY) * follow;
  }

  const npcFollow = 1 - Math.pow(0.0005, dt);
  for (const npc of state.npcs.values()) {
    npc.renderX += (npc.targetX - npc.renderX) * npcFollow;
    npc.renderY += (npc.targetY - npc.renderY) * npcFollow;
  }
}

function predictLocalPlayer(player, dt) {
  let dx = Number(state.input.right) - Number(state.input.left);
  let dy = Number(state.input.down) - Number(state.input.up);
  const length = Math.hypot(dx, dy);

  if (length === 0) {
    return;
  }

  dx /= length;
  dy /= length;
  player.renderX += dx * CLIENT_PLAYER_SPEED * dt;
  player.renderY += dy * CLIENT_PLAYER_SPEED * dt;
}

function wireUi() {
  connectionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    connect(serverUrlInput.value);
  });

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

  window.addEventListener("keydown", (event) => {
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
  if (isTextEntryTarget(event.target)) {
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
  state.players.clear();
  state.npcs.clear();
  state.chunks.clear();
  state.requestedChunks.clear();
  state.population = 0;
  clearMovementInput();
  connectButton.disabled = false;
  playButton.disabled = false;
  setStatus(message);
  bootPanel.classList.remove("hidden");
  connectionForm.classList.remove("hidden");
  form.classList.add("hidden");
  hud.classList.add("hidden");
  chat.classList.add("hidden");
  chatMessages.replaceChildren();
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
  positionEl.textContent = `${Math.round(self.renderX)}, ${Math.round(self.renderY)}`;
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
}

function drawTile(tile, sx, sy, tx, ty) {
  const colors = tilePalette[tile] || tilePalette[TILE.GRASS];
  ctx.fillStyle = colors[0];
  ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

  if (tile === TILE.GRASS || tile === TILE.DARK_GRASS) {
    scatterPixels(sx, sy, tx, ty, colors[1], 4, 2);
    return;
  }

  if (tile === TILE.FLOWERS) {
    scatterPixels(sx, sy, tx, ty, colors[0], 4, 2);
    scatterPixels(sx, sy, tx + 3, ty - 2, colors[1], 3, 3);
    scatterPixels(sx, sy, tx - 5, ty + 4, colors[2], 2, 3);
    return;
  }

  if (tile === TILE.PATH) {
    scatterPixels(sx, sy, tx, ty, colors[1], 5, 3);
    scatterPixels(sx, sy, tx + 1, ty, colors[2], 2, 2);
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
    ctx.fillStyle = colors[1];
    for (let i = 0; i < 3; i += 1) {
      const px = sx + ((hash2(tx, ty, i) * 22) | 0);
      const py = sy + 7 + i * 8;
      ctx.fillRect(px, py, 10, 2);
    }
    return;
  }

  if (tile === TILE.TREE) {
    ctx.fillStyle = "#2f5c36";
    ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = colors[2];
    ctx.fillRect(sx + 13, sy + 17, 6, 12);
    ctx.fillStyle = colors[1];
    ctx.fillRect(sx + 7, sy + 4, 18, 18);
    ctx.fillStyle = colors[0];
    ctx.fillRect(sx + 4, sy + 9, 24, 13);
    ctx.fillStyle = "#3c6b35";
    ctx.fillRect(sx + 10, sy + 3, 12, 7);
    return;
  }

  if (tile === TILE.WALL) {
    // Rough stone wall with brick rows.
    ctx.fillStyle = colors[1];
    for (let row = 0; row < 4; row += 1) {
      const offset = row % 2 === 0 ? 0 : 8;
      for (let col = -1; col < 4; col += 1) {
        ctx.fillRect(sx + offset + col * 16, sy + row * 8, 14, 6);
      }
    }
    return;
  }

  if (tile === TILE.FLOOR) {
    // Wooden plank floor with horizontal grain lines.
    scatterPixels(sx, sy, tx, ty, colors[1], 3, 2);
    ctx.fillStyle = colors[2];
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(sx, sy + 2 + i * 8, TILE_SIZE, 1);
    }
    return;
  }

  if (tile === TILE.DOOR) {
    // Dark wood door with a frame and handle.
    ctx.fillStyle = colors[1];
    ctx.fillRect(sx + 7, sy + 1, 18, TILE_SIZE - 2);
    ctx.fillStyle = colors[2];
    ctx.fillRect(sx + 9, sy + 3, 14, TILE_SIZE - 6);
    ctx.fillStyle = "#c8a040";
    ctx.fillRect(sx + 9, sy + 15, 4, 4);
    return;
  }
}

function drawPlayers() {
  const halfW = canvas.width / 2;
  const halfH = canvas.height / 2;

  const entities = [
    ...[...state.players.values()].map((p) => ({ entity: p, isNpc: false })),
    ...[...state.npcs.values()].map((n) => ({ entity: n, isNpc: true })),
  ].sort((a, b) => a.entity.renderY - b.entity.renderY);

  for (const { entity, isNpc } of entities) {
    const sx = Math.floor(entity.renderX * TILE_SIZE - state.camera.x + halfW);
    const sy = Math.floor(entity.renderY * TILE_SIZE - state.camera.y + halfH);
    drawCharacter(entity, sx, sy, isNpc);
  }
}

function drawCharacter(entity, x, y, isNpc = false) {
  const scale = 2;
  const px = x - 8 * scale;
  const py = y - 14 * scale;
  const primary = entity.primary || "#5cc8ff";
  const accent = entity.accent || "#ffd166";

  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.fillRect(x - 11, y + 8, 22, 5);

  pixel(px, py, 5, 2, 6, 2, accent, scale);
  pixel(px, py, 4, 4, 8, 7, primary, scale);
  pixel(px, py, 6, 5, 4, 3, "#f0c9a2", scale);
  pixel(px, py, 5, 11, 3, 4, "#202437", scale);
  pixel(px, py, 9, 11, 3, 4, "#202437", scale);

  if (entity.classId === "mage") {
    pixel(px, py, 3, 3, 10, 2, accent, scale);
    pixel(px, py, 7, 0, 3, 4, primary, scale);
  } else if (entity.classId === "knight") {
    pixel(px, py, 4, 3, 8, 2, "#d4dae2", scale);
    pixel(px, py, 3, 8, 10, 4, "#8a929e", scale);
  } else {
    pixel(px, py, 2, 6, 3, 5, accent, scale);
    pixel(px, py, 11, 6, 3, 5, accent, scale);
  }

  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(8, 12, 18, 0.82)";
  ctx.fillStyle = isNpc ? "#ffd27a" : "#f7f3df";
  ctx.strokeText(entity.name, x, y - 34);
  ctx.fillText(entity.name, x, y - 34);
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
