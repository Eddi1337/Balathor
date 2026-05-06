const crypto = require("node:crypto");
const http = require("node:http");
const {
  CHUNK_SIZE,
  ENEMY_CAMPS,
  canAttackAt,
  generateChunk,
  getBiome,
  getDoorTransitionAt,
  getPortalAt,
  hash2,
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
const HOME_COOLDOWN_MS = 2000;
const PLAYER_MAX_HP = 100;
const MOB_RESPAWN_MS = 7000;
const INVENTORY_SIZE = 10;
const INTERACT_RADIUS = 1.8;
const MAX_GROUND_ITEMS = 140;
const MOB_AGGRO_RADIUS = 7.5;
const MOB_ATTACK_RADIUS = 1.15;
const MOB_ATTACK_COOLDOWN_MS = 1300;
const MOB_ATTACK_DAMAGE = 13;
const BOSS_ATTACK_DAMAGE = 26;
const XP_BASE_TO_LEVEL = 100;
const XP_LEVEL_STEP = 55;
const STAT_IDS = ["speed", "strength", "armour", "health"];
const STAT_POINT_HP = 20;
const STAT_POINT_SPEED = 0.32;
const STAT_POINT_STRENGTH_DAMAGE = 4;
const STAT_POINT_ARMOUR_REDUCTION = 0.04;
const STAT_POINT_ARMOUR_CAP = 0.55;
const CLASS_IDS = ["ranger", "mage", "knight"];
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
const MOB_TYPES = Object.freeze({
  forest: {
    names: ["Forest Goblin", "Bramble Imp", "Moss Gnawer"],
    primary: "#4f9f5f",
    accent: "#d8f0a0",
    bossName: "Bramble Chief",
    bossPrimary: "#3f7f44",
    bossAccent: "#ffd166"
  },
  meadow: {
    names: ["Meadow Pest", "Field Imp", "Thistle Sprite"],
    primary: "#79b85a",
    accent: "#fff0a8",
    bossName: "Thistle Matron",
    bossPrimary: "#6d9540",
    bossAccent: "#f7c95f"
  },
  desert: {
    names: ["Sand Slime", "Dust Imp", "Clay Crawler"],
    primary: "#c7904f",
    accent: "#ffe0a0",
    bossName: "Dune Brute",
    bossPrimary: "#9f6935",
    bossAccent: "#ffd06a"
  },
  frost: {
    names: ["Frost Wisp", "Snow Gnawer", "Ice Sprite"],
    primary: "#88d8ff",
    accent: "#f0fbff",
    bossName: "Rime Lord",
    bossPrimary: "#5da8d8",
    bossAccent: "#ffffff"
  },
  ember: {
    names: ["Ember Imp", "Ash Crawler", "Cinderling"],
    primary: "#d85b35",
    accent: "#ffd06a",
    bossName: "Cinder Brute",
    bossPrimary: "#a43b2b",
    bossAccent: "#ffdf7a"
  }
});
const WILDERNESS_BOSSES = Object.freeze([
  { id: "lone_stag", x: -212, y: 18, biome: "forest", name: "Old Rootback" },
  { id: "glass_dune", x: 210, y: 158, biome: "desert", name: "Glasshide" },
  { id: "white_pine", x: -214, y: -184, biome: "frost", name: "Whitepine Warden" },
  { id: "red_crag", x: 218, y: -210, biome: "ember", name: "Red Crag" },
]);

let nextClientId = 1;
let nextSpawnIndex = 0;
let nextItemId = 1;
let nextGroundItemId = 1;
let tick = 0;

const clients = new Map();
const chunkCache = new Map();
const chatHistory = [];
const itemDatabase = createItemDatabase();
const chests = createChests();
const groundItems = [];
const mobs = createMobs();

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

      const speed = getPlayerSpeed(client.player);
      const nextX = client.player.x + dx * speed * dt;
      const nextY = client.player.y + dy * speed * dt;

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
  updateMobs(dt);

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

  if (message.type === "attack") {
    handleAttack(client);
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
    handleInteract(client);
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
  }
}

function joinWorld(client, message) {
  if (client.player) {
    return;
  }

  const spawn = spawnPoint(nextSpawnIndex++);
  const torsoColor = sanitizeColor(message.torsoColor || message.primary, "#5cc8ff");
  const weaponColor = sanitizeColor(message.weaponColor || message.accent, "#ffd166");
  const baseTorsoStyle = sanitizeChoice(message.torsoStyle, TORSO_STYLE_IDS, "tunic");
  const baseWeaponStyle = sanitizeChoice(message.weaponStyle, WEAPON_STYLE_IDS, "classic");
  const classId = sanitizeChoice(message.classId, CLASS_IDS, "ranger");
  client.player = {
    id: client.id,
    name: sanitizeName(message.name),
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
    xp: 0,
    level: 1,
    xpToNext: xpForNextLevel(1),
    statPoints: 0,
    stats: createBaseStats(),
    inventory: Array(INVENTORY_SIZE).fill(null),
    equipment: createStarterEquipment(classId, {
      torsoStyle: baseTorsoStyle,
      weaponStyle: baseWeaponStyle,
      torsoColor,
      weaponColor
    }),
    x: spawn.x,
    y: spawn.y,
    facing: 0,
    moving: false
  };

  applyDerivedPlayerStats(client.player);
  client.player.hp = client.player.maxHp;

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

function handleAttack(client) {
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
    event.endX = Number((client.player.x + Math.cos(client.player.facing) * loadout.range).toFixed(3));
    event.endY = Number((client.player.y + Math.sin(client.player.facing) * loadout.range).toFixed(3));
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
      hit.respawnAt = now + MOB_RESPAWN_MS;
      event.defeated = true;
      const progress = awardXp(client.player, xpForMob(hit));
      event.xpGained = progress.xpGained;
      event.levelsGained = progress.levelsGained;
      dropLootForMob(hit);
    }

    if (hitKind === "player" && hit.hp <= 0) {
      respawnPlayer(hit);
      event.defeated = true;
    }
  }

  broadcastCombat(event);
  broadcastSnapshot();
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
  client.player.statPoints -= 1;

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

function handleInteract(client) {
  if (!client.player) {
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
  if (mob.isBoss) {
    return 150 + Math.max(0, mob.maxHp - 100);
  }
  return 25 + Math.floor(mob.maxHp / 6);
}

function awardXp(player, amount) {
  player.xp += amount;
  let levelsGained = 0;

  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level += 1;
    player.statPoints += 1;
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
    .map((client) => {
      const appearance = getPlayerAppearance(client.player);
      return {
        id: client.player.id,
        name: client.player.name,
        classId: client.player.classId,
        torsoStyle: appearance.torsoStyle,
        weaponStyle: appearance.weaponStyle,
        weaponKind: appearance.weaponKind,
        torsoColor: appearance.torsoColor,
        weaponColor: appearance.weaponColor,
        primary: appearance.torsoColor,
        accent: appearance.weaponColor,
        hp: client.player.hp,
        maxHp: client.player.maxHp,
        xp: client.player.xp,
        level: client.player.level,
        xpToNext: client.player.xpToNext,
        statPoints: client.player.statPoints,
        stats: client.player.stats,
        inventory: client.player.inventory,
        equipment: client.player.equipment,
        moveSpeed: Number(getPlayerSpeed(client.player).toFixed(2)),
        x: Number(client.player.x.toFixed(3)),
        y: Number(client.player.y.toFixed(3)),
        facing: Number(client.player.facing.toFixed(3)),
        moving: client.player.moving
      };
    });

  const snapshot = {
    type: "snapshot",
    serverTime: Date.now(),
    tick,
    population: players.length,
    players,
    npcs: getNpcSnapshot(),
    mobs: getMobSnapshot(),
    chests: chests.map((chest) => ({
      id: chest.id,
      x: chest.x,
      y: chest.y,
      opened: chest.opened
    })),
    groundItems: groundItems.map((ground) => ({
      id: ground.id,
      x: ground.x,
      y: ground.y,
      item: ground.item
    }))
  };

  for (const client of clients.values()) {
    send(client, snapshot);
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

function createItemDatabase() {
  const types = ["weapon", "armor", "ring", "potion"];
  const rarities = [
    { id: "common", label: "Common", multiplier: 1, color: "#d7e4ef" },
    { id: "uncommon", label: "Uncommon", multiplier: 1.35, color: "#8fe388" },
    { id: "rare", label: "Rare", multiplier: 1.8, color: "#5cc8ff" },
    { id: "epic", label: "Epic", multiplier: 2.35, color: "#c79cff" },
  ];
  const result = [];

  for (let i = 0; i < 96; i += 1) {
    const type = types[i % types.length];
    const rarity = rarities[Math.min(rarities.length - 1, Math.floor(hash2(i, 11, 700) * rarities.length))];
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
    return {
      templateId: `weapon_${index}`,
      type,
      name: `${rarity.label} ${kind}`,
      icon: weaponKind,
      rarity: rarity.id,
      color: rarity.color,
      weaponKind,
      visual: {
        weaponStyle: visualStyles[index % visualStyles.length],
        weaponColor: rarity.color
      },
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
      name: `${rarity.label} ${kind}`,
      icon: "ring",
      rarity: rarity.id,
      color: rarity.color,
      stats: { [statKey]: value }
    };
  }

  if (type === "armor") {
    const armorKinds = ["Jerkin", "Chestplate", "Robe"];
    const visualStyles = ["tunic", "armor", "robe"];
    const kind = armorKinds[index % armorKinds.length];
    const health = Math.round((8 + hash2(index, 4, 713) * 22) * rarity.multiplier);
    const armour = Math.max(1, Math.round((1 + hash2(index, 5, 714) * 3) * rarity.multiplier));
    return {
      templateId: `armor_${index}`,
      type,
      name: `${rarity.label} ${kind}`,
      icon: "armor",
      rarity: rarity.id,
      color: rarity.color,
      visual: {
        torsoStyle: visualStyles[index % visualStyles.length],
        torsoColor: rarity.color
      },
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
  const highQuality = roll > 0.92 ? "epic" : roll > 0.74 ? "rare" : roll > 0.46 ? "uncommon" : null;
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

function addItemToInventory(player, item) {
  const index = player.inventory.findIndex((slot) => slot === null);
  if (index === -1) {
    return false;
  }
  player.inventory[index] = item;
  return true;
}

function dropLootForMob(mob) {
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
    { id: "mob_slime_oasis_1", name: "Oasis Slime", homeX: 137, homeY: 113, primary: "#56b88f", accent: "#c7f5b0" },
    { id: "mob_slime_oasis_2", name: "Oasis Slime", homeX: 163, homeY: 126, primary: "#56b88f", accent: "#c7f5b0" },
    { id: "mob_wisp_frost_1", name: "Frost Wisp", homeX: -139, homeY: -113, primary: "#88d8ff", accent: "#f0fbff" },
    { id: "mob_wisp_frost_2", name: "Frost Wisp", homeX: -162, homeY: -132, primary: "#88d8ff", accent: "#f0fbff" },
    { id: "mob_imp_ember_1", name: "Ember Imp", homeX: 134, homeY: -121, primary: "#d85b35", accent: "#ffd06a" },
    { id: "mob_imp_ember_2", name: "Ember Imp", homeX: 158, homeY: -142, primary: "#d85b35", accent: "#ffd06a" },
  ];
  return [...fixedMobs, ...createWildernessMobs()].map((mob) => ({
    ...mob,
    x: mob.homeX,
    y: mob.homeY,
    hp: mob.maxHp || 60,
    maxHp: mob.maxHp || 60,
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

    for (let i = 0; i < count; i += 1) {
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
        name: type.names[i % type.names.length],
        homeX: home.x,
        homeY: home.y,
        primary: type.primary,
        accent: type.accent,
        campId: camp.id,
        maxHp: 58 + Math.floor(hash2(camp.x, camp.y, 500 + i) * 18),
        roamRadius: camp.size >= 6 ? 6 : 4.5,
        speed: 1.55 + hash2(camp.x, camp.y, 600 + i) * 0.35
      });
    }

    if (camp.boss) {
      const bossHome = findOpenMobHome(camp.x, camp.y, camp.x, camp.y);
      mobs.push({
        id: `mob_boss_${camp.id}`,
        name: type.bossName,
        homeX: bossHome.x,
        homeY: bossHome.y,
        primary: type.bossPrimary,
        accent: type.bossAccent,
        campId: camp.id,
        isBoss: true,
        maxHp: 190,
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
      homeX: home.x,
      homeY: home.y,
      primary: type.bossPrimary,
      accent: type.bossAccent,
      isBoss: true,
      maxHp: 220,
      roamRadius: 8,
      speed: 1.18
    });
  }

  return mobs;
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

function updateMobs(dt) {
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
  if (now - mob.lastAttackAt < MOB_ATTACK_COOLDOWN_MS) {
    return;
  }

  mob.lastAttackAt = now;
  let damage = mob.isBoss ? BOSS_ATTACK_DAMAGE : MOB_ATTACK_DAMAGE;
  const blocked = isShieldBlocking(player, mob);
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
  broadcastSnapshot();
}

function respawnPlayer(player) {
  const spawn = spawnPoint(nextSpawnIndex++);
  player.hp = player.maxHp;
  player.x = spawn.x;
  player.y = spawn.y;
  player.moving = false;
}

function getMobSnapshot() {
  return mobs
    .filter((mob) => !mob.dead)
    .map((mob) => ({
      id: mob.id,
      name: mob.name,
      primary: mob.primary,
      accent: mob.accent,
      hp: mob.hp,
      maxHp: mob.maxHp,
      isBoss: Boolean(mob.isBoss),
      x: Number(mob.x.toFixed(3)),
      y: Number(mob.y.toFixed(3)),
      facing: Number(mob.facing.toFixed(3)),
    }));
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
