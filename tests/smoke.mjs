import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const world = require("../server/src/world.js");

assert.equal(world.CHUNK_SIZE, 16);
assert.ok(world.ENEMY_CAMPS.length >= 30);
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
const accountPath = `/tmp/balathor-smoke-accounts-${process.pid}.json`;
const smokeAccount = `Smoke${process.pid}`;
const smokePassword = "smoke-password";

const server = spawn(process.execPath, ["server/src/index.js"], {
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(serverPort),
    ACCOUNT_STORE_PATH: accountPath
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
  assert.match(index, /mobileControls/);
  assert.match(index, /Torso Colour/);
  assert.match(index, /Weapon Colour/);
  assert.match(index, /chatToggle/);
  assert.match(index, /accountForm/);
  assert.match(index, /equipmentButton/);
  assert.match(index, /bagsButton/);

  const messages = await joinViaWebSocket(serverPort, {
    action: "create",
    username: smokeAccount,
    password: smokePassword
  });
  await delay(120);
  const resumedMessages = await loginSavedCharacter(serverPort, smokeAccount, smokePassword);
  assert.equal(messages.some((message) => message.type === "welcome"), true);
  assert.equal(messages.some((message) => message.type === "auth" && message.ok && message.hasCharacter === false), true);
  assert.equal(resumedMessages.some((message) => message.type === "auth" && message.ok && message.hasCharacter === true), true);
  assert.equal(resumedMessages.some((message) => message.type === "snapshot" && message.players?.some((player) => (
    player.name === smokeAccount &&
    player.equipment?.body === null &&
    player.inventory?.some((item) => item?.type === "armor")
  ))), true);
  assert.equal(messages.some((message) => message.type === "teleport" && message.portalId === "home"), true);
  assert.equal(messages.some((message) => message.type === "chunk"), true);
  assert.equal(messages.some((message) => message.type === "snapshot" && message.mobs?.some((mob) => mob.isBoss)), true);
  assert.equal(messages.some((message) => message.type === "snapshot" && message.mobs?.some((mob) => (
    Number.isInteger(mob.level) &&
    mob.level > 1 &&
    ["forest", "meadow", "desert", "frost", "ember"].includes(mob.biome)
  ))), true);
  assert.equal(messages.some((message) => message.type === "snapshot" && message.chests?.length >= 10), true);
  assert.equal(messages.some((message) => message.type === "snapshot" && message.players?.some((player) => (
    player.level === 1 &&
    player.xp === 0 &&
    player.xpToNext > 0 &&
    player.statPoints === 0 &&
    Array.isArray(player.inventory) &&
    player.inventory.length === 10 &&
    player.equipment?.weapon?.type === "weapon" &&
    player.equipment?.body?.type === "armor" &&
    player.equipment?.ring1 === null &&
    player.equipment?.ring2 === null &&
    player.torsoStyle === "robe" &&
    player.weaponStyle === "ornate" &&
    player.weaponKind === "staff" &&
    player.torsoColor === "#c79cff" &&
    player.weaponColor === "#2ef3c5" &&
    player.stats?.speed === 0 &&
    player.stats?.strength === 0 &&
    player.stats?.armour === 0 &&
    player.stats?.health === 0
  ))), true);
  assert.equal(messages.some((message) => message.type === "chat" && message.text === "hello realm"), true);
  assert.equal(messages.some((message) => message.type === "chat" && message.text === "hello realm" && Number.isFinite(message.x) && Number.isFinite(message.y)), true);
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

async function joinViaWebSocket(port, account) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const key = crypto.randomBytes(16).toString("base64");
    let buffer = Buffer.alloc(0);
    let upgraded = false;
    let sentHello = false;
    let sentChat = false;
    let sentHome = false;
    let sentView = false;
    let sentUnequip = false;
    let sentEquip = false;
    let sentDropEquipment = false;
    let sentPickupGroundItem = false;
    const messages = [];
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("WebSocket smoke test timed out"));
    }, 3000);

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
          type: "auth",
          action: account.action,
          username: account.username,
          password: account.password
        })));
      }

      const decoded = decodeServerFrames(buffer);
      buffer = decoded.remaining;
      for (const payload of decoded.payloads) {
        messages.push(JSON.parse(payload.toString("utf8")));
      }

      if (!sentHello && messages.some((message) => message.type === "auth" && message.ok && message.hasCharacter === false)) {
        sentHello = true;
        socket.write(maskedFrame(JSON.stringify({
          type: "hello",
          name: account.username,
          classId: "mage",
          torsoStyle: "robe",
          weaponStyle: "ornate",
          torsoColor: "#c79cff",
          weaponColor: "#2ef3c5",
          primary: "#5cc8ff",
          accent: "#ffd166"
        })));
      }

      if (!sentChat && messages.some((message) => message.type === "welcome")) {
        sentChat = true;
        if (!sentView) {
          sentView = true;
          socket.write(maskedFrame(JSON.stringify({
            type: "view",
            view: { x: 0, y: -8, halfW: 22, halfH: 14 }
          })));
        }
        socket.write(maskedFrame(JSON.stringify({
          type: "chat",
          text: "hello realm"
        })));
      }

      if (!sentHome && messages.some((message) => message.type === "welcome")) {
        sentHome = true;
        socket.write(maskedFrame(JSON.stringify({
          type: "home"
        })));
      }

      const self = latestSelfSnapshot(messages);
      if (!sentUnequip && self?.equipment?.weapon) {
        sentUnequip = true;
        socket.write(maskedFrame(JSON.stringify({
          type: "unequipItem",
          equipmentSlot: "weapon"
        })));
      }

      const unequippedSelf = latestSelfSnapshot(messages, (player) => (
        player.equipment?.weapon === null &&
        player.inventory?.some((item) => item?.type === "weapon")
      ));
      if (sentUnequip && !sentEquip && unequippedSelf) {
        const slot = unequippedSelf.inventory.findIndex((item) => item?.type === "weapon");
        sentEquip = true;
        socket.write(maskedFrame(JSON.stringify({
          type: "equipItem",
          slot
        })));
      }

      const equippedSelf = latestSelfSnapshot(messages, (player) => player.equipment?.weapon?.type === "weapon");
      if (sentEquip && !sentDropEquipment && equippedSelf?.equipment?.body) {
        sentDropEquipment = true;
        socket.write(maskedFrame(JSON.stringify({
          type: "unequipItem",
          equipmentSlot: "body",
          drop: true
        })));
      }

      const droppedArmor = latestGroundItem(messages, (ground) => ground.item?.type === "armor");
      if (sentDropEquipment && !sentPickupGroundItem && droppedArmor) {
        sentPickupGroundItem = true;
        socket.write(maskedFrame(JSON.stringify({
          type: "pickupGroundItem",
          groundItemId: droppedArmor.id
        })));
      }

      if (
        messages.some((message) => message.type === "welcome") &&
        messages.some((message) => message.type === "teleport" && message.portalId === "home") &&
        messages.some((message) => message.type === "chunk") &&
        messages.some((message) => message.type === "snapshot" && message.mobs?.some((mob) => mob.isBoss)) &&
        messages.some((message) => message.type === "snapshot" && message.mobs?.some((mob) => Number.isInteger(mob.level) && mob.biome)) &&
        messages.some((message) => message.type === "snapshot" && message.chests?.length >= 10) &&
        messages.some((message) => message.type === "snapshot" && message.players?.some((player) => (
          player.level === 1 &&
          player.stats?.speed === 0 &&
          Array.isArray(player.inventory) &&
          player.inventory.length === 10 &&
          player.equipment?.weapon?.type === "weapon" &&
          player.equipment?.body?.type === "armor" &&
          player.torsoStyle === "robe" &&
          player.weaponStyle === "ornate" &&
          player.weaponKind === "staff"
        ))) &&
        messages.some((message) => message.type === "serverMessage" && message.message === "item_unequipped") &&
        messages.some((message) => message.type === "serverMessage" && message.message === "item_equipped") &&
        messages.some((message) => message.type === "serverMessage" && message.message === "item_dropped") &&
        messages.some((message) => message.type === "serverMessage" && message.message === "item_picked_up") &&
        messages.some((message) => message.type === "snapshot" && message.groundItems?.some((ground) => ground.item?.type === "armor")) &&
        messages.some((message) => message.type === "snapshot" && message.players?.some((player) => (
          player.name === smokeAccount &&
          player.equipment?.body === null &&
          player.inventory?.some((item) => item?.type === "armor")
        ))) &&
        messages.some((message) => message.type === "chat" && message.text === "hello realm" && Number.isFinite(message.x) && Number.isFinite(message.y))
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

function latestGroundItem(messages, predicate = () => true) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.type !== "snapshot") {
      continue;
    }
    const ground = message.groundItems?.find(predicate);
    if (ground) {
      return ground;
    }
  }
  return null;
}

function latestSelfSnapshot(messages, predicate = () => true) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.type !== "snapshot") {
      continue;
    }
    const player = message.players?.find((item) => item.name === smokeAccount);
    if (player && predicate(player)) {
      return player;
    }
  }
  return null;
}

async function loginSavedCharacter(port, username, password) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const key = crypto.randomBytes(16).toString("base64");
    let buffer = Buffer.alloc(0);
    let upgraded = false;
    const messages = [];
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("Saved character login timed out"));
    }, 3000);

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
          type: "auth",
          action: "login",
          username,
          password
        })));
      }

      const decoded = decodeServerFrames(buffer);
      buffer = decoded.remaining;
      for (const payload of decoded.payloads) {
        messages.push(JSON.parse(payload.toString("utf8")));
      }

      if (
        messages.some((message) => message.type === "auth" && message.ok && message.hasCharacter === true) &&
        messages.some((message) => message.type === "welcome") &&
        messages.some((message) => message.type === "snapshot" && message.players?.some((player) => (
          player.name === username &&
          player.equipment?.body === null &&
          player.inventory?.some((item) => item?.type === "armor")
        )))
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
