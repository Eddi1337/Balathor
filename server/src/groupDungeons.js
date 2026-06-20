"use strict";

/**
 * Party-scaling group dungeons — three instanced dungeon encounters in the
 * fantasy realm, themed to biome tiers.  Each instance is created when a
 * party enters and torn down when it empties (boss died or timeout).
 *
 * Dungeon definitions
 * ───────────────────
 * 1. Rootback Hollow   – Forest theme, entry level ~3,  near forest biome
 * 2. Sunken Bog Vault  – Swamp theme,  entry level ~7,  in the swamp
 * 3. Emberdeep Forge   – Ember Coast,  entry level ~12, on the ember coast
 *
 * Instance coordinates are placed far from the overworld and existing dungeon
 * planes.  Each definition gets three instance slots (one per biome tier) so
 * up to three simultaneous group-runs of the same dungeon can coexist without
 * overlap.  Slots are allocated on demand and freed on teardown.
 *
 * Party-size scaling (all constants tunable here)
 * ──────────────────────────────────────────────
 * Extra players beyond the first each add:
 *   MOB_HP_PER_EXTRA_PLAYER   +40 % base HP  (multiplicative per extra member)
 *   MOB_DMG_PER_EXTRA_PLAYER  +15 % damage   (multiplicative per extra member)
 *   BOSS_HP_PER_EXTRA_PLAYER  +40 % boss HP
 *   Extra mob spawns:         BASE_MOB_COUNT + (partySize - 1) * EXTRA_MOBS_PER_MEMBER
 * Rewards also scale: each extra member adds a bonus gold roll and improves
 * the gear drop quality by one step (capped at legendary).
 */

// ── Scaling constants ─────────────────────────────────────────────────────────

const MOB_HP_PER_EXTRA_PLAYER   = 0.40; // +40 % HP per extra player
const MOB_DMG_PER_EXTRA_PLAYER  = 0.15; // +15 % damage per extra player
const BOSS_HP_PER_EXTRA_PLAYER  = 0.40; // +40 % boss HP per extra player
const EXTRA_MOBS_PER_MEMBER     = 3;    // extra regular mobs per additional party member
const GOLD_PER_EXTRA_PLAYER     = 0.30; // +30 % gold reward per extra player
const XP_PER_EXTRA_PLAYER       = 0.20; // +20 % XP reward per extra player

// ── Geometry constants ────────────────────────────────────────────────────────

const GROUP_DUNGEON_ORIGIN_X  = 22000; // far from existing dungeon planes (17000/15000)
const GROUP_DUNGEON_ORIGIN_Y  = 22000;
const GROUP_DUNGEON_SPACING   = 200;   // tiles between instance planes
const GROUP_DUNGEON_SLOTS     = 3;     // parallel instances per definition
const PARTY_PULL_RADIUS       = 10;    // tiles — party members pulled from within this range
const INSTANCE_TIMEOUT_MS     = 20 * 60 * 1000; // 20 minutes hard timeout
const BOSS_DEFEAT_EXIT_DELAY_MS = 5000; // ms delay before teleporting winners out
const INSTANCE_COOLDOWN_MS    = 3000;  // anti-spam guard on entry

// ── Dungeon definitions ───────────────────────────────────────────────────────

const GROUP_DUNGEON_DEFS = Object.freeze([
  Object.freeze({
    id:           "rootback_hollow",
    name:         "Rootback Hollow",
    lore:         "Ancient roots writhe through this hollow. Old Rootback's kin lurk within.",
    recLevel:     3,
    theme:        "forest",
    faction:      "forest",
    entranceX:    -88,
    entranceY:    -124,
    accent:       "#4f9f5f",
    bossName:     "Rootback Elder",
    bossColor:    "#3f7f44",
    bossPrimary:  "#3f7f44",
    bossAccent:   "#ffd166",
    halfW:        28,
    halfH:        32,
    rooms:        4,   // informational — used to size mob count
    baseMobs:     8,
    seed:         77001
  }),
  Object.freeze({
    id:           "sunken_bog_vault",
    name:         "Sunken Bog Vault",
    lore:         "Fetid water seeps through every crack. The Bogfather's vaults hold forgotten relics.",
    recLevel:     7,
    theme:        "swamp",
    faction:      "swamp",
    entranceX:    -188,
    entranceY:    172,
    accent:       "#3d6b4f",
    bossName:     "Bog Vault Sovereign",
    bossColor:    "#2a4a38",
    bossPrimary:  "#2a4a38",
    bossAccent:   "#78ffb0",
    halfW:        30,
    halfH:        36,
    rooms:        5,
    baseMobs:     10,
    seed:         77002
  }),
  Object.freeze({
    id:           "emberdeep_forge",
    name:         "Emberdeep Forge",
    lore:         "Lava channels carved by ancient smiths still glow. Red Crag's lieutenants guard the crucible.",
    recLevel:     12,
    theme:        "ember",
    faction:      "ember",
    entranceX:    348,
    entranceY:    -196,
    accent:       "#d85b35",
    bossName:     "Forge Colossus",
    bossColor:    "#902a18",
    bossPrimary:  "#902a18",
    bossAccent:   "#ffdf60",
    halfW:        32,
    halfH:        38,
    rooms:        5,
    baseMobs:     12,
    seed:         77003
  })
]);

// Export for use in minigameSites.js entrance placement check
const GROUP_DUNGEON_ENTRANCES = GROUP_DUNGEON_DEFS.map((d) => ({
  id:         `group_dungeon_${d.id}`,
  dungeonId:  d.id,
  name:       d.name,
  x:          d.entranceX,
  y:          d.entranceY,
  color:      d.accent,
  recLevel:   d.recLevel
}));

// ── Mob type lookup (mirrors MOB_TYPES from index.js) ────────────────────────

const GROUP_DUNGEON_MOB_TYPES = Object.freeze({
  forest: {
    enemies: [
      { name: "Root Creeper",  level: 2,  hp: 52,  damage: 9,  speed: 1.7 },
      { name: "Bark Stalker",  level: 3,  hp: 60,  damage: 10, speed: 1.8 },
      { name: "Thorn Guardian",level: 4,  hp: 72,  damage: 12, speed: 1.65 },
      { name: "Hollow Sprite", level: 5,  hp: 64,  damage: 13, speed: 2.0 }
    ],
    primary: "#4f9f5f",
    accent:  "#d8f0a0"
  },
  swamp: {
    enemies: [
      { name: "Bog Crawler",   level: 5,  hp: 70,  damage: 13, speed: 1.5 },
      { name: "Mire Lurker",   level: 6,  hp: 84,  damage: 15, speed: 1.45 },
      { name: "Marsh Wraith",  level: 7,  hp: 92,  damage: 16, speed: 1.8 },
      { name: "Vault Guard",   level: 8,  hp: 108, damage: 18, speed: 1.35 }
    ],
    primary: "#4a7a58",
    accent:  "#b8ffcc"
  },
  ember: {
    enemies: [
      { name: "Forge Imp",     level: 10, hp: 96,  damage: 20, speed: 1.95 },
      { name: "Cinder Drone",  level: 11, hp: 118, damage: 22, speed: 1.45 },
      { name: "Ash Warden",    level: 12, hp: 104, damage: 24, speed: 1.85 },
      { name: "Slag Knight",   level: 13, hp: 138, damage: 26, speed: 1.6 }
    ],
    primary: "#d85b35",
    accent:  "#ffd06a"
  }
});

// ── Instance slot geometry ────────────────────────────────────────────────────

function instanceOrigin(defIndex, slot) {
  const idx = defIndex * GROUP_DUNGEON_SLOTS + slot;
  return {
    x: GROUP_DUNGEON_ORIGIN_X + idx * GROUP_DUNGEON_SPACING,
    y: GROUP_DUNGEON_ORIGIN_Y
  };
}

// ── Runtime state ─────────────────────────────────────────────────────────────

/** @type {Map<string, object>} instanceId -> instance object */
const groupInstances = new Map();

let _deps = null;

function createGroupDungeonSystem(deps) {
  _deps = deps;
  return {
    GROUP_DUNGEON_DEFS,
    GROUP_DUNGEON_ENTRANCES,
    findEntranceNear,
    handleGroupDungeonInteract,
    handleGroupDungeonConfirm,
    onGroupDungeonBossDefeat,
    onGroupDungeonPlayerDeath,
    onGroupDungeonDisconnect,
    tickGroupDungeons,
    isInGroupDungeon,
    getGroupDungeonInstance,
    getGroupDungeonTileAt,
    pointInsideGroupDungeon,
    getGroupDungeonDefs: () => GROUP_DUNGEON_DEFS
  };
}

// ── Entrance lookup ───────────────────────────────────────────────────────────

const ENTRANCE_INTERACT_RADIUS = 3.0;

function findEntranceNear(x, y, worldId) {
  if (worldId !== "fantasy") return null;
  let best = null;
  let bestDist = ENTRANCE_INTERACT_RADIUS;
  for (const def of GROUP_DUNGEON_DEFS) {
    const d = Math.hypot(x - def.entranceX, y - def.entranceY);
    if (d < bestDist) {
      bestDist = d;
      best = def;
    }
  }
  return best;
}

// ── Interact — show confirm panel ────────────────────────────────────────────

function handleGroupDungeonInteract(client, def) {
  const p = client.player;
  if (!p) return false;
  if (p._groupDungeonCooldownUntil && Date.now() < p._groupDungeonCooldownUntil) {
    _deps.send(client, { type: "serverMessage", message: "group_dungeon_cooldown" });
    return true;
  }

  // Build list of eligible party members within pull radius
  const eligibleMembers = getEligiblePartyMembers(client, def);

  _deps.send(client, {
    type: "groupDungeonOffer",
    dungeonId:   def.id,
    dungeonName: def.name,
    lore:        def.lore,
    recLevel:    def.recLevel,
    accent:      def.accent,
    members:     eligibleMembers.map((c) => ({ id: c.player.id, name: c.player.name }))
  });
  return true;
}

// ── Confirm — create/join instance ───────────────────────────────────────────

function handleGroupDungeonConfirm(client, message) {
  const p = client.player;
  if (!p) return;
  const def = GROUP_DUNGEON_DEFS.find((d) => d.id === message.dungeonId);
  if (!def) return;
  if (p._groupDungeonCooldownUntil && Date.now() < p._groupDungeonCooldownUntil) {
    _deps.send(client, { type: "serverMessage", message: "group_dungeon_cooldown" });
    return;
  }

  const eligibleClients = getEligiblePartyMembers(client, def);
  // Include the interacting player
  if (!eligibleClients.find((c) => c === client)) {
    eligibleClients.unshift(client);
  }

  const instance = createInstance(def, eligibleClients);
  if (!instance) {
    _deps.send(client, { type: "serverMessage", message: "group_dungeon_no_slots" });
    return;
  }

  for (const c of eligibleClients) {
    enterInstance(c, instance);
  }
}

// ── Party helpers ─────────────────────────────────────────────────────────────

function getEligiblePartyMembers(client, def) {
  const p = client.player;
  if (!p) return [];
  const partyId = _deps.getPartyIdForClient(client);
  if (!partyId) return [];

  const out = [];
  for (const c of _deps.clients.values()) {
    if (c === client) continue;
    if (!c.player) continue;
    const cPartyId = _deps.getPartyIdForClient(c);
    if (cPartyId !== partyId) continue;
    const dist = Math.hypot(p.x - c.player.x, p.y - c.player.y);
    if (dist <= PARTY_PULL_RADIUS) {
      out.push(c);
    }
  }
  return out;
}

// ── Instance creation ─────────────────────────────────────────────────────────

function allocateSlot(def) {
  const defIndex = GROUP_DUNGEON_DEFS.indexOf(def);
  for (let slot = 0; slot < GROUP_DUNGEON_SLOTS; slot += 1) {
    const id = `gdinst_${def.id}_${slot}`;
    if (!groupInstances.has(id)) return { id, slot, defIndex };
  }
  return null;
}

function createInstance(def, enteringClients) {
  const slotInfo = allocateSlot(def);
  if (!slotInfo) return null;

  const partySize = enteringClients.length;
  const extraPlayers = Math.max(0, partySize - 1);
  const hpMult    = Math.pow(1 + MOB_HP_PER_EXTRA_PLAYER, extraPlayers);
  const dmgMult   = Math.pow(1 + MOB_DMG_PER_EXTRA_PLAYER, extraPlayers);
  const mobCount  = def.baseMobs + extraPlayers * EXTRA_MOBS_PER_MEMBER;
  const origin    = instanceOrigin(slotInfo.defIndex, slotInfo.slot);

  const mobs = buildInstanceMobs(def, origin, mobCount, hpMult, dmgMult, partySize);

  const instance = {
    id:        slotInfo.id,
    defId:     def.id,
    def,
    slot:      slotInfo.slot,
    originX:   origin.x,
    originY:   origin.y,
    partySize,
    hpMult,
    dmgMult,
    mobs,        // live mob objects registered with the main mob list
    memberKeys:  new Set(),  // accountKeys of players currently inside
    bossDefeated: false,
    createdAt:   Date.now(),
    expiresAt:   Date.now() + INSTANCE_TIMEOUT_MS
  };

  groupInstances.set(slotInfo.id, instance);
  // Register mobs with the global mob system
  _deps.registerInstanceMobs(mobs);

  return instance;
}

function buildInstanceMobs(def, origin, mobCount, hpMult, dmgMult, partySize) {
  const mobType = GROUP_DUNGEON_MOB_TYPES[def.faction] || GROUP_DUNGEON_MOB_TYPES.forest;
  const mobs = [];
  const hw = def.halfW;
  const hh = def.halfH;
  const halfFloor = hh - 6; // don't spawn in the boss room (top ~6 rows)

  // Regular mobs distributed across the floor
  for (let i = 0; i < mobCount; i += 1) {
    const enemy   = mobType.enemies[i % mobType.enemies.length];
    const angle   = groupHash2(def.seed, i, 1000) * Math.PI * 2;
    const radius  = 4 + groupHash2(def.seed, i, 1100) * (Math.min(hw, halfFloor) - 5);
    const lx      = Math.round(Math.cos(angle) * radius);
    const ly      = Math.round(Math.sin(angle) * radius * 0.65 + halfFloor * 0.3);
    const wx      = origin.x + Math.max(-hw + 3, Math.min(hw - 3, lx));
    const wy      = origin.y + Math.max(-halfFloor + 3, Math.min(halfFloor - 3, ly));
    const level   = enemy.level + Math.floor(i / mobType.enemies.length);
    const baseHp  = enemy.hp + level * 7;
    const baseDmg = enemy.damage + Math.floor(level * 1.15);
    mobs.push({
      id:           `mob_gd_${def.id}_${Date.now().toString(36)}_${i}`,
      name:         enemy.name,
      level,
      homeX:        wx,
      homeY:        wy,
      x:            wx,
      y:            wy,
      hp:           Math.round(baseHp * hpMult),
      maxHp:        Math.round(baseHp * hpMult),
      attackDamage: Math.round(baseDmg * dmgMult),
      primary:      mobType.primary,
      accent:       mobType.accent,
      biome:        def.faction,
      faction:      def.faction,
      groupDungeonId:    def.id,
      groupDungeonInstId: `gdinst_${def.id}_${Math.floor(i / 10)}`,
      _gdInstId:    `gdinst_${def.id}_0`, // will be fixed below
      dead:         false,
      respawnAt:    0,
      lastAttackAt: 0,
      facing:       Math.random() * Math.PI * 2,
      _targetX:     wx,
      _targetY:     wy,
      _nextMoveAt:  Date.now() + Math.random() * 3000,
      roamRadius:   4.5,
      speed:        enemy.speed + groupHash2(def.seed, i, 1200) * 0.15,
      noRespawn:    true  // instance mobs never respawn
    });
  }

  // Boss
  const bossLevel = (def.recLevel || 5) + 5 + (partySize > 1 ? partySize : 0);
  const baseBossHp = 280 + bossLevel * 18;
  const scaledBossHp = Math.round(baseBossHp * Math.pow(1 + BOSS_HP_PER_EXTRA_PLAYER, Math.max(0, partySize - 1)));
  const baseBossDmg = 22 + bossLevel * 2;
  mobs.push({
    id:             `mob_gd_boss_${def.id}_${Date.now().toString(36)}`,
    name:           def.bossName,
    level:          bossLevel,
    homeX:          origin.x,
    homeY:          origin.y - hh + 6,
    x:              origin.x,
    y:              origin.y - hh + 6,
    hp:             scaledBossHp,
    maxHp:          scaledBossHp,
    attackDamage:   Math.round(baseBossDmg * dmgMult),
    primary:        def.bossPrimary,
    accent:         def.bossAccent,
    biome:          def.faction,
    faction:        def.faction,
    isBoss:         true,
    isGroupDungeonBoss: true,
    groupDungeonId: def.id,
    dead:           false,
    respawnAt:      0,
    lastAttackAt:   0,
    facing:         Math.PI / 2,
    _targetX:       origin.x,
    _targetY:       origin.y - hh + 6,
    _nextMoveAt:    Date.now() + Math.random() * 2000,
    roamRadius:     6.0,
    speed:          1.3,
    noRespawn:      true,
    // Boss AoE ring mechanic
    _aoeNextAt:     Date.now() + 8000 + Math.random() * 4000
  });

  // Tag all mobs with their instance id
  const instId = `gdinst_${def.id}_${/* slot unknown here */ 0}`;
  for (const m of mobs) m._gdInstId = instId;

  return mobs;
}

// ── Enter / Exit ──────────────────────────────────────────────────────────────

function enterInstance(client, instance) {
  const p = client.player;
  if (!p) return;

  // Fix instance id on all mobs now that we have it
  for (const m of instance.mobs) m._gdInstId = instance.id;

  const landing = {
    x: instance.originX,
    y: instance.originY + instance.def.halfH - 3
  };
  p.x = landing.x;
  p.y = landing.y;
  p.facing = -Math.PI / 2;
  p.moving = false;
  p._activeGroupDungeonInstId = instance.id;
  p._groupDungeonCooldownUntil = Date.now() + INSTANCE_COOLDOWN_MS;
  instance.memberKeys.add(client.account?.key || p.id);
  _deps.saveClientCharacter(client);
  _deps.send(client, {
    type: "teleport",
    portalId:   `gd_${instance.id}_enter`,
    name:       instance.def.name,
    color:      instance.def.accent,
    style:      "arch",
    theme:      "dungeon",
    x:          landing.x,
    y:          landing.y
  });
  _deps.send(client, {
    type:         "groupDungeonEntered",
    dungeonId:    instance.def.id,
    dungeonName:  instance.def.name,
    instId:       instance.id,
    partySize:    instance.partySize,
    bossName:     instance.def.bossName,
    bossDefeated: instance.bossDefeated
  });
  _deps.streamChunks(client, nearbyChunksAround(landing.x, landing.y, 3));
  _deps.broadcastSnapshot();
  _deps.pushChat({
    kind: "system",
    name: "Realm",
    text: `Your party descends into ${instance.def.name} (${instance.partySize}-player run). Slay the ${instance.def.bossName} to escape.`
  });
}

function exitPlayer(client, instance, reason) {
  const p = client.player;
  if (!p) return;
  if (p._activeGroupDungeonInstId !== instance.id) return;

  p._activeGroupDungeonInstId = null;
  p.x = instance.def.entranceX;
  p.y = instance.def.entranceY + 2;
  p.facing = Math.PI / 2;
  p.moving = false;
  _deps.saveClientCharacter(client);
  _deps.send(client, {
    type: "teleport",
    portalId: `gd_${instance.id}_exit_${reason}`,
    name:     instance.def.name,
    color:    instance.def.accent,
    style:    "arch",
    theme:    "fantasy",
    x:        p.x,
    y:        p.y,
    skipChat: true
  });
  _deps.streamChunks(client, nearbyChunksAround(p.x, p.y, 3));
}

function exitAllPlayers(instance, reason) {
  for (const c of _deps.clients.values()) {
    if (c.player?._activeGroupDungeonInstId === instance.id) {
      exitPlayer(c, instance, reason);
    }
  }
  instance.memberKeys.clear();
}

function teardownInstance(instance) {
  _deps.removeInstanceMobs(instance.mobs);
  groupInstances.delete(instance.id);
}

// ── Boss defeat ───────────────────────────────────────────────────────────────

function onGroupDungeonBossDefeat(client, mob) {
  if (!mob?.isGroupDungeonBoss || !mob.groupDungeonId) return false;
  const instance = findInstanceByMob(mob);
  if (!instance || instance.bossDefeated) return true;

  instance.bossDefeated = true;
  const def = instance.def;
  const partySize = instance.partySize;
  const extraPlayers = Math.max(0, partySize - 1);

  // Collect party members inside the instance
  const winners = [];
  for (const c of _deps.clients.values()) {
    if (c.player?._activeGroupDungeonInstId === instance.id) {
      winners.push(c);
    }
  }

  // Base rewards
  const baseGold = 60 + def.recLevel * 8;
  const baseXp   = 80 + def.recLevel * 12;
  const goldMult = Math.pow(1 + GOLD_PER_EXTRA_PLAYER, extraPlayers);
  const xpMult   = Math.pow(1 + XP_PER_EXTRA_PLAYER, extraPlayers);
  const gold     = Math.round(baseGold * goldMult);
  const xp       = Math.round(baseXp * xpMult);
  // Gear quality bias: base 0.6, +0.08 per extra player, capped at 0.9
  const qualityBias = Math.min(0.9, 0.6 + extraPlayers * 0.08);

  for (const c of winners) {
    const p = c.player;
    if (!p) continue;

    // Gold + XP
    p.gold = (p.gold || 0) + gold;
    _deps.awardXp(p, xp);

    // Gear drop — always for boss clear
    const item = _deps.createLootItem(def.seed + Math.floor(Math.random() * 10000), def.seed, qualityBias);
    const added = _deps.addItemToInventory(p, item);
    if (!added) {
      _deps.addGroundItem(item, p.x + (Math.random() - 0.5) * 2, p.y + (Math.random() - 0.5) * 2);
    }

    // First-clear bonus
    const clearKey = `gd_clear_${def.id}`;
    const stats = _deps.ensureMinigameStats(p);
    const firstClear = !stats.flags[clearKey];
    if (firstClear) {
      stats.flags[clearKey] = true;
      p.gold += Math.round(gold * 0.5); // 50 % bonus gold for first clear
      _deps.awardXp(p, Math.round(xp * 0.5));
    }

    _deps.saveClientCharacter(c);
    _deps.send(c, {
      type:           "groupDungeonComplete",
      dungeonName:    def.name,
      gold,
      xp,
      firstClear,
      partySize,
      bossName:       def.bossName
    });
  }

  _deps.pushChat({
    kind: "system",
    name: "Realm",
    text: `The ${def.bossName} falls! ${def.name} conquered by a party of ${partySize}.`
  });

  // Teleport winners out after a short victory pause
  setTimeout(() => {
    if (!groupInstances.has(instance.id)) return;
    exitAllPlayers(instance, "complete");
    _deps.broadcastSnapshot();
    setTimeout(() => teardownInstance(instance), 2000);
  }, BOSS_DEFEAT_EXIT_DELAY_MS);

  return true;
}

// ── Player death ──────────────────────────────────────────────────────────────

function onGroupDungeonPlayerDeath(client) {
  const p = client.player;
  if (!p?._activeGroupDungeonInstId) return false;
  const instance = groupInstances.get(p._activeGroupDungeonInstId);
  if (!instance) {
    p._activeGroupDungeonInstId = null;
    return false;
  }
  // Respawn outside (respawnPlayer was already called — override position to entrance)
  p._activeGroupDungeonInstId = null;
  p.x = instance.def.entranceX;
  p.y = instance.def.entranceY + 2;
  p.facing = Math.PI / 2;
  instance.memberKeys.delete(client.account?.key || p.id);
  _deps.saveClientCharacter(client);
  _deps.send(client, {
    type: "teleport",
    portalId: `gd_${instance.id}_death`,
    name:     instance.def.name,
    color:    instance.def.accent,
    style:    "arch",
    theme:    "fantasy",
    x:        p.x,
    y:        p.y,
    skipChat: true
  });
  _deps.streamChunks(client, nearbyChunksAround(p.x, p.y, 3));
  _deps.pushChat({ kind: "system", name: "Realm", text: `You are carried out of ${instance.def.name}. Your allies fight on.` });
  maybeReapInstance(instance);
  return true;
}

// ── Disconnect ────────────────────────────────────────────────────────────────

function onGroupDungeonDisconnect(client) {
  const p = client.player;
  if (!p?._activeGroupDungeonInstId) return;
  const instance = groupInstances.get(p._activeGroupDungeonInstId);
  if (!instance) {
    p._activeGroupDungeonInstId = null;
    return;
  }
  p._activeGroupDungeonInstId = null;
  instance.memberKeys.delete(client.account?.key || p.id);
  maybeReapInstance(instance);
}

function maybeReapInstance(instance) {
  // Count players still inside
  let inside = 0;
  for (const c of _deps.clients.values()) {
    if (c.player?._activeGroupDungeonInstId === instance.id) inside += 1;
  }
  if (inside === 0) {
    teardownInstance(instance);
  }
}

// ── Tick — AoE ring mechanic + timeout ───────────────────────────────────────

function tickGroupDungeons(now) {
  for (const instance of groupInstances.values()) {
    if (now > instance.expiresAt) {
      _deps.pushChat({ kind: "system", name: "Realm", text: `${instance.def.name} instance timed out.` });
      exitAllPlayers(instance, "timeout");
      teardownInstance(instance);
      continue;
    }

    if (instance.bossDefeated) continue;

    // Boss AoE ring — warn players near the boss
    const boss = instance.mobs.find((m) => m.isBoss && !m.dead);
    if (boss && now >= (boss._aoeNextAt || 0)) {
      boss._aoeNextAt = now + 9000 + Math.random() * 5000;
      broadcastAoeRing(instance, boss, now);
    }
  }
}

function broadcastAoeRing(instance, boss, now) {
  const aoeRadius = 4.5;
  for (const c of _deps.clients.values()) {
    if (c.player?._activeGroupDungeonInstId !== instance.id) continue;
    _deps.send(c, {
      type:     "groupDungeonAoe",
      instId:   instance.id,
      bossId:   boss.id,
      bossX:    boss.x,
      bossY:    boss.y,
      radius:   aoeRadius,
      warnMs:   2500
    });
  }
}

// ── Tile generation helpers ───────────────────────────────────────────────────

/**
 * Returns the tile kind for a position inside a group dungeon instance.
 * Returns null if the position is not inside any group dungeon.
 * Callers should map: "floor" -> TILE.FLOOR, "wall" -> TILE.WALL/TILE.STONE, else -> TILE.VOID
 */
function getGroupDungeonTileAt(x, y) {
  for (const def of GROUP_DUNGEON_DEFS) {
    for (let slot = 0; slot < GROUP_DUNGEON_SLOTS; slot += 1) {
      const origin = instanceOrigin(GROUP_DUNGEON_DEFS.indexOf(def), slot);
      const lx = x - origin.x;
      const ly = y - origin.y;
      if (Math.abs(lx) > def.halfW + 1 || Math.abs(ly) > def.halfH + 1) continue;
      return groupDungeonLayoutKind(def, lx, ly);
    }
  }
  return null;
}

/**
 * Returns true if the coordinate is inside any group dungeon plane (active or not).
 * Used by worldForPosition to label these coordinates as "dungeon" theme.
 */
function pointInsideGroupDungeon(x, y) {
  for (let d = 0; d < GROUP_DUNGEON_DEFS.length; d += 1) {
    const def = GROUP_DUNGEON_DEFS[d];
    for (let slot = 0; slot < GROUP_DUNGEON_SLOTS; slot += 1) {
      const origin = instanceOrigin(d, slot);
      const lx = x - origin.x;
      const ly = y - origin.y;
      if (Math.abs(lx) <= def.halfW + 2 && Math.abs(ly) <= def.halfH + 2) return true;
    }
  }
  return false;
}

function isInGroupDungeon(player) {
  return Boolean(player?._activeGroupDungeonInstId && groupInstances.has(player._activeGroupDungeonInstId));
}

function getGroupDungeonInstance(instId) {
  return groupInstances.get(instId) || null;
}

// ── Simple multi-room layout for group dungeon planes ────────────────────────

function groupDungeonLayoutKind(def, lx, ly) {
  const hw = def.halfW;
  const hh = def.halfH;

  if (Math.abs(lx) > hw || Math.abs(ly) > hh) return null;

  // Outer boundary wall
  if (Math.abs(lx) === hw || Math.abs(ly) === hh) {
    // Entry gap at the south boundary
    if (ly === hh && Math.abs(lx) <= 1.5) return "floor";
    return "wall";
  }

  // Boss chamber at the north end
  const bossChamberHalfW = 6;
  const bossChamberDepth = 10;
  const bossChamberMinY = -hh + 2;
  const bossChamberMaxY = -hh + bossChamberDepth;
  if (lx >= -bossChamberHalfW && lx <= bossChamberHalfW && ly >= bossChamberMinY && ly <= bossChamberMaxY) {
    // Boss chamber walls
    if (lx === -bossChamberHalfW || lx === bossChamberHalfW || ly === bossChamberMinY) return "wall";
    if (ly === bossChamberMaxY && Math.abs(lx) > 1) return "wall";
    return "floor";
  }

  // Central spine corridor
  if (Math.abs(lx) <= 1) return "floor";

  // Cross-corridor at midpoint
  if (Math.abs(ly) <= 1 && Math.abs(lx) <= hw - 2) return "floor";

  // Side rooms (positioned at thirds of the dungeon height)
  const roomHalf = 5;
  const roomYPositions = [Math.round(hh * 0.35), -Math.round(hh * 0.15), -Math.round(hh * 0.55)];
  for (const ry of roomYPositions) {
    // Left room
    if (lx >= -hw + 2 && lx <= -hw + 2 + roomHalf * 2 && ly >= ry - roomHalf && ly <= ry + roomHalf) {
      if (lx === -hw + 2 || lx === -hw + 2 + roomHalf * 2 || ly === ry - roomHalf || ly === ry + roomHalf) {
        // Doorway connecting to spine
        if (lx === -hw + 2 + roomHalf * 2 && Math.abs(ly - ry) <= 1) return "floor";
        return "wall";
      }
      return "floor";
    }
    // Right room
    if (lx >= hw - 2 - roomHalf * 2 && lx <= hw - 2 && ly >= ry - roomHalf && ly <= ry + roomHalf) {
      if (lx === hw - 2 - roomHalf * 2 || lx === hw - 2 || ly === ry - roomHalf || ly === ry + roomHalf) {
        if (lx === hw - 2 - roomHalf * 2 && Math.abs(ly - ry) <= 1) return "floor";
        return "wall";
      }
      return "floor";
    }
  }

  // Scatter some internal walls using hash
  const h = groupHash2(lx + def.seed, ly + def.seed, def.seed);
  if (h > 0.92) return "wall";

  return "wall"; // everything else is void/wall
}

// ── Chunk helper ──────────────────────────────────────────────────────────────

function nearbyChunksAround(wx, wy, radius) {
  const cx = Math.floor(wx / 16);
  const cy = Math.floor(wy / 16);
  const out = [];
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      out.push({ cx: cx + dx, cy: cy + dy });
    }
  }
  return out;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function findInstanceByMob(mob) {
  for (const inst of groupInstances.values()) {
    if (inst.mobs.includes(mob)) return inst;
  }
  // Fallback by dungeonId
  if (mob.groupDungeonId) {
    for (const inst of groupInstances.values()) {
      if (inst.defId === mob.groupDungeonId) return inst;
    }
  }
  return null;
}

function groupHash2(x, y, seed = 1337) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

module.exports = {
  createGroupDungeonSystem,
  GROUP_DUNGEON_DEFS,
  GROUP_DUNGEON_ENTRANCES,
  GROUP_DUNGEON_ORIGIN_X,
  GROUP_DUNGEON_ORIGIN_Y,
  GROUP_DUNGEON_SPACING,
  GROUP_DUNGEON_SLOTS,
  pointInsideGroupDungeon,
  getGroupDungeonTileAt
};
