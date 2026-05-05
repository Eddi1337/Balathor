const crypto = require("node:crypto");
const http = require("node:http");
const {
  CHUNK_SIZE,
  generateChunk,
  getDoorTransitionAt,
  getPortalAt,
  isBlockedCircle,
  spawnPoint
} = require("./world");
const { updateNpcs, getNpcSnapshot } = require("./npcs");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8080);
const TICK_RATE = 30;
const SNAPSHOT_RATE = 20;
const PLAYER_SPEED = 5.2;
const MAX_CHUNKS_PER_REQUEST = 64;
const MAX_NAME_LENGTH = 18;
const MAX_CHAT_LENGTH = 180;
const CHAT_HISTORY_LIMIT = 60;
const CHAT_COOLDOWN_MS = 800;
const PORTAL_COOLDOWN_MS = 1400;
const DOOR_COOLDOWN_MS = 600;

let nextClientId = 1;
let nextSpawnIndex = 0;
let tick = 0;

const clients = new Map();
const chunkCache = new Map();
const chatHistory = [];

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
    lastDoorAt: 0,
    lastPortalAt: 0,
    input: { up: false, down: false, left: false, right: false },
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

setInterval(simulate, 1000 / TICK_RATE).unref();

function simulate() {
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

      const nextX = client.player.x + dx * PLAYER_SPEED * dt;
      const nextY = client.player.y + dy * PLAYER_SPEED * dt;

      if (!isBlockedCircle(nextX, client.player.y)) {
        client.player.x = nextX;
      }
      if (!isBlockedCircle(client.player.x, nextY)) {
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

  updateNpcs(dt, pushChat);

  if (tick % Math.round(TICK_RATE / SNAPSHOT_RATE) === 0) {
    broadcastSnapshot();
  }
}

function handleDoorTravel(client) {
  const now = Date.now();
  if (now - client.lastDoorAt < DOOR_COOLDOWN_MS) {
    return;
  }

  const transition = getDoorTransitionAt(client.player.x, client.player.y);
  if (!transition) {
    return;
  }

  client.lastDoorAt = now;
  client.player.x = transition.x;
  client.player.y = transition.y;
  client.player.moving = false;
  client.input = normalizeInput();

  send(client, {
    type: "teleport",
    portalId: "door",
    name: transition.name,
    x: client.player.x,
    y: client.player.y
  });
  streamChunks(client, nearbyChunks(client.player.x, client.player.y, 3));
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

  if (message.type === "hello") {
    joinWorld(client, message);
    return;
  }

  if (message.type === "input") {
    client.input = normalizeInput(message.keys);
    return;
  }

  if (message.type === "chat") {
    handleChat(client, message);
    return;
  }

  if (message.type === "requestChunks") {
    streamChunks(client, message.chunks);
  }
}

function joinWorld(client, message) {
  if (client.player) {
    return;
  }

  const spawn = spawnPoint(nextSpawnIndex++);
  client.player = {
    id: client.id,
    name: sanitizeName(message.name),
    classId: sanitizeChoice(message.classId, ["ranger", "mage", "knight"], "ranger"),
    primary: sanitizeColor(message.primary, "#5cc8ff"),
    accent: sanitizeColor(message.accent, "#ffd166"),
    x: spawn.x,
    y: spawn.y,
    facing: 0,
    moving: false
  };

  send(client, {
    type: "welcome",
    selfId: client.id,
    tickRate: TICK_RATE,
    snapshotRate: SNAPSHOT_RATE,
    tileSize: 32,
    chunkSize: CHUNK_SIZE,
    spawn
  });

  send(client, {
    type: "chatHistory",
    messages: chatHistory
  });

  streamChunks(client, nearbyChunks(spawn.x, spawn.y, 3));
  pushChat({
    kind: "system",
    name: "Realm",
    text: `${client.player.name} entered the hub`
  });
  broadcastSnapshot();
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
    kind: "player",
    fromId: client.player.id,
    name: client.player.name,
    text
  });
}

function pushChat({ kind, fromId = null, name, text }) {
  const message = {
    type: "chat",
    id: crypto.randomUUID(),
    kind,
    fromId,
    name,
    text,
    serverTime: Date.now()
  };

  chatHistory.push(message);
  if (chatHistory.length > CHAT_HISTORY_LIMIT) {
    chatHistory.shift();
  }

  for (const client of clients.values()) {
    send(client, message);
  }
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

function broadcastSnapshot() {
  const players = [...clients.values()]
    .filter((client) => client.player)
    .map((client) => ({
      id: client.player.id,
      name: client.player.name,
      classId: client.player.classId,
      primary: client.player.primary,
      accent: client.player.accent,
      x: Number(client.player.x.toFixed(3)),
      y: Number(client.player.y.toFixed(3)),
      facing: Number(client.player.facing.toFixed(3)),
      moving: client.player.moving
    }));

  const snapshot = {
    type: "snapshot",
    serverTime: Date.now(),
    tick,
    population: players.length,
    players,
    npcs: getNpcSnapshot()
  };

  for (const client of clients.values()) {
    send(client, snapshot);
  }
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

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}
