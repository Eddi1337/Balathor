import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const world = require("../server/src/world.js");

assert.equal(world.CHUNK_SIZE, 16);
assert.ok(world.ENEMY_CAMPS.length >= 10);
for (const camp of world.ENEMY_CAMPS) {
  assert.equal(world.generateTile(camp.x, camp.y), world.TILE.STONE);
  assert.equal(world.canAttackAt(camp.x, camp.y), true);
}
const originChunk = world.generateChunk(0, 0);
assert.equal(originChunk.tiles.length, world.CHUNK_SIZE * world.CHUNK_SIZE);
assert.equal(world.isBlocked(0, 0), false);

const basePort = 18000 + (process.pid % 1000);
const serverPort = basePort;
const clientPort = basePort + 1000;

const server = spawn(process.execPath, ["server/src/index.js"], {
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(serverPort)
  },
  stdio: "ignore"
});

const client = spawn(process.execPath, ["client/dev-server.js"], {
  env: {
    ...process.env,
    CLIENT_HOST: "127.0.0.1",
    CLIENT_PORT: String(clientPort),
    GAME_SERVER_URL: `ws://127.0.0.1:${serverPort}/ws`
  },
  stdio: "ignore"
});

try {
  const health = await fetchJson(`http://127.0.0.1:${serverPort}/health`);
  assert.equal(health.ok, true);
  assert.equal(health.chunkSize, 16);

  const config = await fetchJson(`http://127.0.0.1:${clientPort}/config.json`);
  assert.equal(config.gameServerUrl, `ws://127.0.0.1:${serverPort}/ws`);

  const index = await fetchText(`http://127.0.0.1:${clientPort}/`);
  assert.match(index, /Balathor/);

  const messages = await joinViaWebSocket(serverPort);
  assert.equal(messages.some((message) => message.type === "welcome"), true);
  assert.equal(messages.some((message) => message.type === "chunk"), true);
  assert.equal(messages.some((message) => message.type === "snapshot" && message.mobs?.some((mob) => mob.isBoss)), true);
  assert.equal(messages.some((message) => message.type === "chat" && message.text === "hello realm"), true);
} finally {
  server.kill("SIGTERM");
  client.kill("SIGTERM");
}

async function fetchJson(url) {
  const response = await retry(() => fetch(url), 50, 80);
  assert.equal(response.ok, true);
  return response.json();
}

async function fetchText(url) {
  const response = await retry(() => fetch(url), 50, 80);
  assert.equal(response.ok, true);
  return response.text();
}

async function retry(fn, attempts, waitMs) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await delay(waitMs);
    }
  }
  throw lastError;
}

async function joinViaWebSocket(port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const key = crypto.randomBytes(16).toString("base64");
    let buffer = Buffer.alloc(0);
    let upgraded = false;
    let sentChat = false;
    const messages = [];
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("WebSocket smoke test timed out"));
    }, 2000);

    socket.on("connect", () => {
      socket.write([
        "GET /ws HTTP/1.1",
        "Host: 127.0.0.1",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Key: ${key}`,
        "Sec-WebSocket-Version: 13",
        "",
        ""
      ].join("\r\n"));
    });

    socket.on("data", (data) => {
      buffer = Buffer.concat([buffer, data]);

      if (!upgraded) {
        const marker = buffer.indexOf("\r\n\r\n");
        if (marker === -1) {
          return;
        }
        const headers = buffer.subarray(0, marker).toString("utf8");
        assert.match(headers, /101 Switching Protocols/);
        buffer = buffer.subarray(marker + 4);
        upgraded = true;
        socket.write(maskedFrame(JSON.stringify({
          type: "hello",
          name: "Smoke",
          classId: "mage",
          primary: "#5cc8ff",
          accent: "#ffd166"
        })));
      }

      const decoded = decodeServerFrames(buffer);
      buffer = decoded.remaining;
      for (const payload of decoded.payloads) {
        messages.push(JSON.parse(payload.toString("utf8")));
      }

      if (!sentChat && messages.some((message) => message.type === "welcome")) {
        sentChat = true;
        socket.write(maskedFrame(JSON.stringify({
          type: "chat",
          text: "hello realm"
        })));
      }

      if (
        messages.some((message) => message.type === "welcome") &&
        messages.some((message) => message.type === "chunk") &&
        messages.some((message) => message.type === "snapshot" && message.mobs?.some((mob) => mob.isBoss)) &&
        messages.some((message) => message.type === "chat" && message.text === "hello realm")
      ) {
        clearTimeout(timeout);
        socket.end();
        resolve(messages);
      }
    });

    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function maskedFrame(text) {
  const payload = Buffer.from(text);
  const mask = crypto.randomBytes(4);
  const header = Buffer.alloc(payload.length < 126 ? 2 : 4);

  header[0] = 0x81;
  if (payload.length < 126) {
    header[1] = 0x80 | payload.length;
  } else {
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
  }

  const masked = Buffer.from(payload);
  for (let i = 0; i < masked.length; i += 1) {
    masked[i] ^= mask[i % 4];
  }

  return Buffer.concat([header, mask, masked]);
}

function decodeServerFrames(buffer) {
  const payloads = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const opcode = buffer[offset] & 0x0f;
    let length = buffer[offset + 1] & 0x7f;
    let headerLength = 2;

    if (length === 126) {
      if (offset + 4 > buffer.length) {
        break;
      }
      length = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (offset + 10 > buffer.length) {
        break;
      }
      length = Number(buffer.readBigUInt64BE(offset + 2));
      headerLength = 10;
    }

    const payloadStart = offset + headerLength;
    const payloadEnd = payloadStart + length;
    if (payloadEnd > buffer.length) {
      break;
    }

    if (opcode === 1) {
      payloads.push(buffer.subarray(payloadStart, payloadEnd));
    }
    offset = payloadEnd;
  }

  return {
    payloads,
    remaining: buffer.subarray(offset)
  };
}
