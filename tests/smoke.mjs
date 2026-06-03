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
assert.equal(world.ENEMY_CAMPS.some((camp) => camp.boss), true);
for (const camp of world.ENEMY_CAMPS) {
  assert.equal([world.TILE.STONE, world.TILE.PATH].includes(world.generateTile(camp.x, camp.y)), true);
  assert.equal(world.canAttackAt(camp.x, camp.y), true);
}
const originChunk = world.generateChunk(0, 0);
assert.equal(originChunk.tiles.length, world.CHUNK_SIZE * world.CHUNK_SIZE);
assert.equal(originChunk.worldId, "fantasy");
assert.equal(world.worldIdAt(0, 0), "fantasy");
assert.equal(world.worldIdAt(1920, 0), "scifi");
const seafarerCave = world.PORTALS.find((portal) => portal.id === "portal_oceanus");
assert.deepEqual(
  { x: seafarerCave?.x, y: seafarerCave?.y, style: seafarerCave?.style },
  { x: -20, y: 0, style: "nautical" }
);
assert.equal(world.worldIdAt(seafarerCave?.targetX, seafarerCave?.targetY), "oceanus");

// ── Boundless Ocean: 100+ islands, mostly water, sandy beaches + grassy cores ──
assert.ok(world.OCEANUS_ISLANDS.length >= 100, "ocean should have at least 100 islands");
const oceanHub = world.OCEANUS_ISLANDS.find((isle) => isle.hub);
assert.ok(oceanHub, "ocean should have a hub island");
// Island centre is land (grassy/path core); far from islands is open water.
assert.notEqual(world.generateTile(oceanHub.x, oceanHub.y), world.TILE.WATER);
assert.equal(world.generateTile(oceanHub.x + 240, oceanHub.y), world.TILE.WATER);
// A sandy beach ring exists between the grassy core and the water.
const beachRing = [];
for (let r = oceanHub.landRadius - 6; r <= oceanHub.landRadius + 8; r += 1) {
  beachRing.push(world.generateTile(oceanHub.x + r, oceanHub.y));
}
assert.ok(beachRing.includes(world.TILE.SAND), "island should have a sandy beach ring");
// The arrival dock places the boat in water and the player on a walkable pier.
const hubDock = world.dockPortForPlayerId("smoke_player", "oceanus");
assert.equal(world.worldIdAt(hubDock.x, hubDock.y), "oceanus");
assert.equal(world.generateTile(hubDock.x, hubDock.y), world.TILE.WATER);
assert.notEqual(world.generateTile(hubDock.terminalX, hubDock.terminalY), world.TILE.WATER);
assert.equal(world.worldIdAt(world.OCEANUS_SAFE_LANDING.x, world.OCEANUS_SAFE_LANDING.y), "oceanus");
assert.equal(world.isSwimmingAt(world.OCEANUS_SAFE_LANDING.x, world.OCEANUS_SAFE_LANDING.y), false);
assert.equal(world.isBlockedCircle(world.OCEANUS_SAFE_LANDING.x, world.OCEANUS_SAFE_LANDING.y), false);
assert.equal(world.isBlockedCircle(world.OCEANUS_SAFE_LANDING.x + 0.8, world.OCEANUS_SAFE_LANDING.y), false);
const starterViewCounts = new Map();
for (let y = world.OCEANUS_SAFE_LANDING.y - 10; y <= world.OCEANUS_SAFE_LANDING.y + 10; y += 1) {
  for (let x = world.OCEANUS_SAFE_LANDING.x - 14; x <= world.OCEANUS_SAFE_LANDING.x + 14; x += 1) {
    const tile = world.generateTile(x, y);
    starterViewCounts.set(tile, (starterViewCounts.get(tile) || 0) + 1);
  }
}
assert.equal(starterViewCounts.get(world.TILE.WATER) || 0, 0, "starter island first screen should be solid land");
assert.ok((starterViewCounts.get(world.TILE.GRASS) || 0) + (starterViewCounts.get(world.TILE.PATH) || 0) > 260, "starter island should render as readable grass and paths");
let starterDarkGrass = 0;
for (let y = world.OCEANUS_SAFE_LANDING.y - 24; y <= world.OCEANUS_SAFE_LANDING.y + 24; y += 1) {
  for (let x = world.OCEANUS_SAFE_LANDING.x - 42; x <= world.OCEANUS_SAFE_LANDING.x + 42; x += 1) {
    if (world.generateTile(x, y) === world.TILE.DARK_GRASS) starterDarkGrass += 1;
  }
}
assert.equal(starterDarkGrass, 0, "starter island viewport should not render as a dark grass slab");
for (const isle of world.OCEANUS_ISLANDS.slice(0, 20)) {
  assert.notEqual(world.generateTile(isle.x, isle.y), world.TILE.WATER, `island ${isle.id} centre should be land`);
  const shoreProbe = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let r = Math.max(8, isle.landRadius - 8); r <= Math.round(isle.landRadius * 1.35) + 12; r += 1) {
      shoreProbe.push(world.generateTile(isle.x + dx * r, isle.y + dy * r));
    }
  }
  assert.ok(shoreProbe.includes(world.TILE.SAND), `island ${isle.id} should have a visible beach`);
}
const oceanDecorKinds = new Set(world.OCEANUS_ISLANDS.flatMap((isle) => isle.layout.map((prop) => prop.kind)));
assert.equal(oceanDecorKinds.has("mangrove"), true);
assert.equal(oceanDecorKinds.has("banana"), true);
assert.equal(oceanDecorKinds.has("fern"), true);
let ambientOceanShip = null;
for (let cx = Math.floor(-45500 / world.CHUNK_SIZE); cx < Math.floor(-40500 / world.CHUNK_SIZE) && !ambientOceanShip; cx += 1) {
  const chunk = world.generateChunk(cx, Math.floor(2000 / world.CHUNK_SIZE));
  ambientOceanShip = chunk.spaceObjects.find((obj) => obj.kind === "ambient-sailing-ship") || null;
}
assert.ok(ambientOceanShip, "ocean should stream ambient sailing traffic");
assert.equal(world.worldIdAt(210_000, 0), "pirate");
assert.equal(world.worldIdAt(15_000, 15_000), "dungeon:whispering_crypt");
assert.ok(world.listMapCatalog().some((m) => m.id === "example_cove"));
const pirateChunk = world.generateChunk(Math.floor(210_000 / world.CHUNK_SIZE), 0);
assert.equal(pirateChunk.worldId, "pirate");
assert.equal(pirateChunk.theme, "pirate");
assert.equal(world.isBlocked(0, 0), false);
const home = world.BUILDINGS.find((building) => building.name === "Home");
const homeDoorX = home.x + Math.floor(home.w / 2);
const homeSouthDoorY = home.y + home.h - 1;
const homeInterior = world.getDoorTransitionAt(homeDoorX, homeSouthDoorY);
assert.equal(homeInterior.name, "Home");
/** Phantom interior slab top-left equals createInteriorForBuilding coords (aligned with exporter). */
const ix = homeInterior.x;
const iy = homeInterior.y;
assert.equal(world.generateTile(ix, iy), world.TILE.WALL);
assert.equal(world.generateTile(ix + home.w - 1, iy + home.h - 1), world.TILE.WALL);
assert.equal(world.generateTile(ix + Math.floor(home.w / 2), iy + home.h - 1), world.TILE.DOOR);
assert.equal(world.generateTile(ix + home.w - 3, iy + 2), world.TILE.SHELF);
assert.equal(world.generateTile(ix + 1, iy + 1), world.TILE.HOME_TREE);
assert.equal(world.generateTile(ix + home.w - 2, iy + 1), world.TILE.CHEST);
assert.equal(world.generateTile(ix + 1, iy + home.h - 2), world.TILE.BED);
assert.equal(world.generateTile(ix + home.w - 2, iy + home.h - 3), world.TILE.TABLE);
assert.equal(world.generateTile(ix + home.w - 2, iy + home.h - 2), world.TILE.CHAIR);
assert.equal(world.generateTile(ix - 1, iy + home.h), world.generateTile(home.x - 1, home.y + home.h));
assert.equal(Boolean(world.getShopFixtureAt(ix + home.w - 2.5, iy + 2.5)), true);

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
    ACCOUNT_STORE_PATH: accountPath,
    WORLD_DB_PATH: `/tmp/balathor-smoke-world-${process.pid}.sqlite`,
    DISCORD_AUTH_WEBHOOK_URL: ""
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
  assert.match(index, /goldText/);
  assert.match(index, /shopPanel/);

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
  assert.equal(messages.some((message) => message.type === "snapshot" && Array.isArray(message.mobs)), true);
  assert.equal(messages.every((message) => !Array.isArray(message.mobs) || message.mobs.every((mob) => (
    Number.isInteger(mob.level) &&
    ["forest", "meadow", "desert", "frost", "ember"].includes(mob.biome)
  ))), true);
  assert.equal(messages.some((message) => message.type === "snapshot" && Array.isArray(message.chests)), true);
  assert.equal(messages.some((message) => message.type === "snapshot" && message.players?.some((player) => (
    player.level === 1 &&
    player.xp === 0 &&
    player.xpToNext > 0 &&
    player.statPoints === 0 &&
    player.gold === 120 &&
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
  const response = await retry(() => fetch(url), 150, 80);
  assert.equal(response.ok, true);
  return response.json();
}

async function fetchText(url) {
  const response = await retry(() => fetch(url), 150, 80);
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
        messages.some((message) => message.type === "snapshot" && Array.isArray(message.mobs)) &&
        messages.some((message) => message.type === "snapshot" && Array.isArray(message.chests)) &&
        messages.some((message) => message.type === "snapshot" && message.players?.some((player) => (
          player.level === 1 &&
          player.stats?.speed === 0 &&
          player.gold === 120 &&
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
