// Top-level game: sessions, auth, message handling, progression, persistence and per-client
// delta replication. Map simulation lives in World.

import type { WebSocket } from "ws";
import type { Appearance, C2S, NetEntity, S2C, SelfState, ShopView } from "../../shared/protocol";
import { PROTOCOL_VERSION } from "../../shared/protocol";
import { CLASSES, isClassId } from "../../shared/game/classes";
import {
  EQUIP_SLOTS,
  INVENTORY_SIZE,
  ITEM_TEMPLATES,
  itemName,
  itemTemplate,
  itemValue,
  makeItem,
  rollRarity,
  slotForItem,
  starterKit,
  type EquipSlot,
  type Item
} from "../../shared/game/items";
import { deriveStats, MAX_LEVEL, STAT_IDS, xpToNext, type StatId } from "../../shared/game/stats";
import { NPCS, SHOPS } from "../../shared/game/npcs";
import { BAR_SLOTS, TALENTS_BY_ID, canLearn, respecCost, talentPoints } from "../../shared/game/talents";
import { QUESTS_BY_ID } from "../../shared/game/quests";
import { WAYPOINTS, WAYPOINT_COST, WAYPOINT_DISCOVER_RADIUS, WAYPOINT_USE_RADIUS, waypointById } from "../../shared/game/waypoints";
import { EMOTES } from "../../shared/game/emotes";
import { QuestService } from "./questService";
import { SocialService } from "./socialService";
import { OVERWORLD, getMap, isInterior, type MapDef } from "../../shared/world/maps";
import { DOORS_BY_ID, DOOR_RADIUS, PLOTS_BY_ID, parseHouseMapId, houseMapId } from "../../shared/world/housing";
import { HOUSE_STORAGE_SIZE } from "../../shared/game/furniture";
import { circleBlocked } from "../../shared/game/movement";
import { Tile } from "../../shared/world/tiles";
import { HousingService } from "./housingService";
import { ProfessionService } from "./professionService";
import { ShipService } from "./shipService";
import { freshUpgrades, HULL_IDS, UPGRADE_SLOTS } from "../../shared/game/ships";
import { LAUNCH_PAD } from "../../shared/world/scifi/station";
import { freshProfessions, PROF_IDS } from "../../shared/game/professions";
import { findWalkableNear } from "../../shared/world/overworld";
import { clamp, dist, wrapAngle } from "../../shared/math";
import { CHARACTER_NAME_RE, hashPassword, validateCredentials, verifyPassword } from "../auth";
import { config } from "../config";
import type { Store } from "../db/database";
import { notifyAuthEvent } from "../discord";
import { Mob, Player, type CharacterSave } from "./entities";
import { Session } from "./session";
import { World } from "./world";

const CHAT_RADIUS = 32;
const CHAT_COOLDOWN_MS = 700;
const TALK_RADIUS = 3.6;
const PICKUP_RADIUS = 2.6;
const GOLD_MAGNET_RADIUS = 1.4;
const SHOP_RADIUS = 6;
const HEX = /^#[0-9a-fA-F]{6}$/;

export class Game {
  readonly sessions = new Map<string, Session>();
  readonly worlds = new Map<string, World>();
  private byAccount = new Map<number, Session>();
  private nextSessionId = 1;
  private tickCount = 0;
  private pass = 0;
  private timer: NodeJS.Timeout | null = null;
  private lastTickAt = Date.now();
  private lastSaveAt = Date.now();
  private lastTimeBroadcastAt = 0;
  private tickMs: number;
  private snapEvery: number;
  /** Rolling average of tick cost, for /health. */
  private tickCostMs = 0;
  private lastPartyTickAt = 0;
  private lastCheckAt = 0;
  readonly quests: QuestService;
  readonly social: SocialService;
  readonly housing: HousingService;
  readonly professions: ProfessionService;
  readonly ships: ShipService;

  constructor(private store: Store) {
    this.quests = new QuestService({
      grantShip: (p, hull) => this.ships.grant(p, hull),
      awardXp: (p, xp) => this.awardXp(p, xp),
      addToBag: (p, item) => this.addToBag(p, item),
      randomGear: (p, rarity) => {
        const item = randomGear(p.save.cls, p.save.lv, 0);
        const order = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
        if (order.indexOf(item.rarity) < order.indexOf(rarity)) return makeItem(item.tpl, rarity, Math.max(1, p.save.lv));
        return item;
      },
      chat: (p, text) => p.session.send({ t: "chat", from: "", name: "", text, kind: "system" })
    });
    this.social = new SocialService({
      player: (id) => this.findPlayer(id),
      findByName: (name) => {
        const lower = name.toLowerCase();
        for (const s of this.sessions.values()) if (s.player && s.player.name.toLowerCase() === lower) return s.player;
        return undefined;
      },
      addToBag: (p, item) => this.addToBag(p, item),
      system: (p, text) => p.session.send({ t: "chat", from: "", name: "", text, kind: "system" })
    });
    this.housing = new HousingService(store);
    this.ships = new ShipService({
      transfer: (p, mapId, x, y) => this.transfer(p, mapId, x, y),
      world: (mapId) => this.getWorld(mapId)
    });
    this.professions = new ProfessionService({
      addToBag: (p, item) => this.addToBag(p, item),
      randomWeapon: (p, rarity, level, scifi) => {
        const weapons = Object.values(ITEM_TEMPLATES).filter((t) => t.kind === "weapon" && t.cls === p.save.cls && (scifi ? t.realm === "scifi" : !t.realm));
        const tpl = weapons[weapons.length - 1] ?? weapons[0];
        return makeItem(tpl.id, rarity, level);
      }
    });
    this.getWorld(OVERWORLD.id);
    this.tickMs = 1000 / config.tickRate;
    this.snapEvery = Math.max(1, Math.round(config.tickRate / config.snapRate));
  }

  /** Maps are simulated as separate worlds, created the first time someone goes there. */
  getWorld(mapId: string): World {
    let w = this.worlds.get(mapId);
    if (w) return w;
    const def = getMap(mapId);
    w = this.worlds.get(def.id);
    if (w) return w;
    w = new World(def, {
      onMobKilled: (world, mob) => this.onMobKilled(world, mob),
      onPlayerDied: (world, p) => this.onPlayerDied(world, p),
      hour: () => this.worldTime() * 24,
      partyOf: (p) => this.social.membersOf(p).filter((m) => m.mapId === p.mapId),
      shipDamage: (world, p, raw, now) => this.ships.damage(p, world, raw, now),
      shipDestroyed: (world, p) => this.ships.destroyed(p, world),
      shipTick: (world, p, dt, now) => this.ships.tick(p, world, dt, now, (pl, target) => world.turretShot(pl, target))
    });
    w.populate();
    this.housing.loadInto(w);
    this.worlds.set(def.id, w);
    return w;
  }

  /** Move a player to another map (or another spot on the same one). */
  transfer(p: Player, mapId: string, x: number, y: number): void {
    const from = this.worlds.get(p.mapId);
    const to = this.getWorld(mapId);
    if (p.storageOpen) {
      this.housing.saveStorage(p.storageOpen);
      p.storageOpen = null;
      p.session.send({ t: "storage", items: null });
    }
    if (from !== to) {
      from?.removePlayer(p);
      p.x = x;
      p.y = y;
      p.mounted = false;
      if (to.def.kind === "space") this.ships.board(p);
      else p.ship = null;
      to.addPlayer(p);
      p.session.known.clear();
      p.selfDirty = true;
    } else {
      p.x = x;
      p.y = y;
      to.grid.moved(p);
    }
    p.input.mx = p.input.my = 0;
    p.lastDoorAt = Date.now();
    p.saveDirty = true;
    p.session.send({ t: "welcome", id: p.id, map: to.def.id, x: p.x, y: p.y, time: this.worldTime(), dayLength: config.dayLengthMs });
  }

  private broadcastHouses(): void {
    const json = JSON.stringify({ t: "houses", list: this.housing.list() } satisfies S2C);
    for (const s of this.sessions.values()) if (s.player) s.sendRaw(json);
  }

  // ── lifecycle ───────────────────────────────────────────────────────────────

  start(): void {
    const loop = () => {
      const started = Date.now();
      const dt = Math.min(0.1, (started - this.lastTickAt) / 1000);
      this.lastTickAt = started;
      try {
        this.tick(dt, started);
      } catch (error) {
        console.error("[tick] failed:", error);
      }
      const cost = Date.now() - started;
      this.tickCostMs = this.tickCostMs * 0.95 + cost * 0.05;
      // With nobody online, idle cheaply.
      const delay = this.sessions.size ? Math.max(0, this.tickMs - cost) : 250;
      this.timer = setTimeout(loop, delay);
    };
    loop();
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.saveAll(true);
  }

  /** Dev-only shift applied by /time. */
  private timeOffset = 0;

  worldTime(now = Date.now()): number {
    return (((now / config.dayLengthMs + 0.32 + this.timeOffset) % 1) + 1) % 1;
  }

  health() {
    let players = 0;
    let mobs = 0;
    for (const w of this.worlds.values()) {
      players += w.players.size;
      mobs += w.mobs.size;
    }
    return {
      ok: true,
      version: "v2",
      connections: this.sessions.size,
      players,
      mobs,
      tickRate: config.tickRate,
      snapRate: config.snapRate,
      tickCostMs: Math.round(this.tickCostMs * 100) / 100,
      ...this.store.counts()
    };
  }

  // ── connections ─────────────────────────────────────────────────────────────

  onConnect(ws: WebSocket, ip: string): void {
    if (this.sessions.size >= config.maxClients) {
      ws.close(1013, "server_full");
      return;
    }
    const session = new Session(`s${this.nextSessionId++}`, ws, ip);
    this.sessions.set(session.id, session);
    session.send({ t: "hello", v: PROTOCOL_VERSION, tickRate: config.tickRate, snapRate: config.snapRate });
    ws.on("message", (data, isBinary) => {
      if (isBinary) return;
      const text = data.toString();
      if (text.length > 4096 || !session.allowMessage()) return;
      let msg: C2S;
      try {
        msg = JSON.parse(text);
      } catch {
        return;
      }
      if (!msg || typeof msg !== "object" || typeof (msg as { t?: unknown }).t !== "string") return;
      void this.handle(session, msg).catch((error) => console.error("[handle]", msg.t, error));
    });
    ws.on("close", () => this.onClose(session));
    ws.on("error", () => this.onClose(session));
  }

  private onClose(session: Session): void {
    if (session.closed) return;
    session.closed = true;
    this.sessions.delete(session.id);
    if (session.accountId !== null && this.byAccount.get(session.accountId) === session) {
      this.byAccount.delete(session.accountId);
    }
    const p = session.player;
    if (p) {
      this.professions.cancel(p);
      this.social.onDisconnect(p);
      this.persist(p);
      this.worlds.get(p.mapId)?.removePlayer(p);
      session.player = null;
    }
  }

  // ── message dispatch ────────────────────────────────────────────────────────

  private async handle(s: Session, msg: C2S): Promise<void> {
    switch (msg.t) {
      case "ping":
        s.send({ t: "pong", c: Number(msg.c) || 0, s: Date.now() });
        return;
      case "auth":
        return this.handleAuth(s, msg);
      case "create":
        return this.handleCreate(s, msg);
      case "play":
        return this.handlePlay(s);
    }
    const p = s.player;
    if (!p) return;
    const world = this.worlds.get(p.mapId);
    if (!world) return;
    const now = Date.now();
    switch (msg.t) {
      case "in": {
        p.input.seq = Number(msg.seq) || 0;
        p.input.mx = clamp(Number(msg.mx) || 0, -1, 1);
        p.input.my = clamp(Number(msg.my) || 0, -1, 1);
        if (Number.isFinite(msg.f)) p.f = wrapAngle(Number(msg.f));
        return;
      }
      case "attack":
        this.professions.cancel(p);
        if (Number.isFinite(msg.a)) world.playerAttack(p, wrapAngle(Number(msg.a)), now);
        return;
      case "chat":
        return this.handleChat(s, p, world, String(msg.text ?? ""), now);
      case "equip":
        return this.equipFromBag(p, Number(msg.slot));
      case "unequip":
        return this.unequip(p, msg.slot);
      case "use":
        return this.useItem(p, world, Number(msg.slot));
      case "drop":
        return this.dropItem(p, world, Number(msg.slot), now);
      case "swap":
        return this.swapSlots(p, Number(msg.from), Number(msg.to));
      case "pickup":
        return this.pickup(p, world, String(msg.id), now);
      case "talk":
        return this.talk(p, world, String(msg.id), now);
      case "buy":
        return this.buy(p, world, String(msg.shop), Number(msg.idx));
      case "sell":
        return this.sell(p, world, Number(msg.slot));
      case "stat":
        return this.spendStat(p, msg.stat);
      case "respawn":
        return this.respawn(p, world);
      case "learn":
        return this.learnTalent(p, String(msg.id));
      case "bind":
        return this.bindAbility(p, Number(msg.slot), msg.id === null ? null : String(msg.id));
      case "cast":
        return this.castAbility(p, world, String(msg.id), Number(msg.a), Number(msg.x), Number(msg.y), now);
      case "respec":
        return this.respec(p, world);
      case "questAccept":
        return this.quests.accept(p, String(msg.id), (npcId) => {
          const npc = world.npcs.get(npcId);
          return Boolean(npc && dist(p.x, p.y, npc.x, npc.y) <= TALK_RADIUS + 2);
        });
      case "questAbandon":
        return this.quests.abandon(p, String(msg.id));
      case "mount":
        return this.toggleMount(p, now);
      case "travel":
        return this.travel(p, world, String(msg.id));
      case "emote":
        return world.setEmote(p, String(msg.id), now);
      case "jump":
        if (p.dead || p.ship || now - p.lastJumpAt < 550) return;
        p.lastJumpAt = now;
        p.emote = "";
        // Everyone else nearby sees the hop; the jumper already predicted it.
        world.grid.forEachNear(p.x, p.y, 44, (e) => {
          if (e.kind === "player" && e !== p) e.session.fx.push({ e: "jump", id: p.id });
        });
        return;
      case "party":
        return this.partyOp(p, msg);
      case "trade":
        return this.tradeOp(p, msg);
      case "door":
        return this.useDoor(p, world, String(msg.id), now);
      case "house":
        return this.houseOp(p, world, msg);
      case "furn":
        return this.furnOp(p, world, msg);
      case "storage":
        return this.storageOp(p, world, msg);
      case "gather":
        return this.professions.startGather(p, world, Number(msg.x), Number(msg.y), now);
      case "fish":
        return this.professions.startFishing(p, world, Number(msg.x), Number(msg.y), now);
      case "reel":
        return this.professions.reel(p, world, now);
      case "craft":
        return this.professions.craft(p, String(msg.recipe), String(msg.station));
      case "hangar":
        return this.ships.hangar(p, world, msg);
      case "launch":
        return this.ships.launch(p, world);
      case "dock":
        return this.ships.dock(p, world);
      case "warp":
        return this.ships.warp(p, world, String(msg.dest), now);
      case "boost":
        return this.ships.boost(p, now);
    }
  }

  // ── auth & characters ───────────────────────────────────────────────────────

  private async handleAuth(s: Session, msg: Extract<C2S, { t: "auth" }>): Promise<void> {
    if (s.accountId !== null || s.authPending) return;
    const err = validateCredentials(msg.user, msg.pass);
    if (err) return s.send({ t: "auth", ok: false, err });
    s.authPending = true;
    try {
      const user = String(msg.user);
      const pass = String(msg.pass);
      let account = this.store.findAccount(user);
      if (msg.mode === "register") {
        if (account) return s.send({ t: "auth", ok: false, err: "That username is taken" });
        account = this.store.createAccount(user, await hashPassword(pass));
        notifyAuthEvent("created", account.username);
      } else {
        if (!account || !(await verifyPassword(pass, account.pass_hash))) {
          return s.send({ t: "auth", ok: false, err: "Wrong username or password" });
        }
        notifyAuthEvent("login", account.username);
      }
      if (s.closed) return;
      // One session per account: the newest login wins.
      const existing = this.byAccount.get(account.id);
      if (existing && existing !== s) {
        existing.toast("Logged in from another window", "bad");
        existing.ws.close(4001, "replaced");
        this.onClose(existing);
      }
      s.accountId = account.id;
      s.username = account.username;
      this.byAccount.set(account.id, s);
      this.store.touchLogin(account.id);
      s.send({ t: "auth", ok: true, user: account.username, hasCharacter: Boolean(this.store.loadCharacter(account.id)) });
    } finally {
      s.authPending = false;
    }
  }

  private handleCreate(s: Session, msg: Extract<C2S, { t: "create" }>): void {
    if (s.accountId === null || s.player) return;
    if (this.store.loadCharacter(s.accountId)) return s.toast("You already have a character", "bad");
    const name = String(msg.name ?? "").trim().replace(/\s+/g, " ");
    if (!CHARACTER_NAME_RE.test(name)) return s.toast("Names are 2-16 letters, starting with a letter", "bad");
    if (this.store.isCharacterNameTaken(name)) return s.toast("That name is already taken", "bad");
    if (!isClassId(msg.cls)) return;
    const look = sanitizeLook(msg.look, msg.cls);
    const kit = starterKit(msg.cls);
    const inv: (Item | null)[] = new Array(INVENTORY_SIZE).fill(null);
    inv[0] = kit.potions;
    const spawn = OVERWORLD.spawn;
    const save: CharacterSave = {
      name,
      cls: msg.cls,
      look,
      lv: 1,
      xp: 0,
      gold: 25,
      statPoints: 0,
      stats: { str: 0, vit: 0, agi: 0, def: 0 },
      inv,
      equip: { weapon: kit.weapon, body: kit.body, ring1: null, ring2: null },
      map: OVERWORLD.id,
      x: spawn.x,
      y: spawn.y,
      // 0 = "start at full health" (resolved once derived stats are known in handlePlay).
      hp: 0,
      kills: 0,
      talents: [],
      bar: new Array(BAR_SLOTS).fill(null),
      quests: { active: [], done: [] },
      waypoints: ["wp_hearthmoor"],
      hasMount: false,
      furniture: {},
      professions: freshProfessions(),
      ships: [],
      activeShip: null,
      shipUp: freshUpgrades(),
      discovered: []
    };
    this.store.saveCharacter(s.accountId, name, save);
    this.handlePlay(s);
  }

  private handlePlay(s: Session): void {
    if (s.accountId === null || s.player) return;
    const row = this.store.loadCharacter(s.accountId);
    if (!row) return;
    const save = normalizeSave(JSON.parse(row.data) as CharacterSave);
    // You may log out inside a home you no longer have access to: put you on its doorstep.
    const house = parseHouseMapId(save.map);
    if (house && !(this.housing.ownerOf(house.plotId)?.accountId === s.accountId)) {
      const plot = PLOTS_BY_ID[house.plotId];
      save.map = OVERWORLD.id;
      save.x = plot?.front.x ?? OVERWORLD.spawn.x;
      save.y = plot?.front.y ?? OVERWORLD.spawn.y;
    }
    // Pilots who logged out mid-flight wake up in Ringforge's hangar.
    if (save.map === "space") {
      save.map = "station";
      save.x = LAUNCH_PAD.x;
      save.y = LAUNCH_PAD.y + LAUNCH_PAD.r + 1;
    }
    const world = this.getWorld(save.map);
    save.map = world.def.id;
    const safe = safeSpot(world.def, save.x, save.y);
    save.x = safe.x;
    save.y = safe.y;
    const p = new Player(`p${s.accountId}`, s.accountId, s, save);
    this.recompute(p);
    if (p.hp <= 0) p.hp = p.derived.maxHp;
    s.player = p;
    s.known.clear();
    world.addPlayer(p);
    s.send({ t: "welcome", id: p.id, map: world.def.id, x: p.x, y: p.y, time: this.worldTime(), dayLength: config.dayLengthMs });
    s.send({ t: "houses", list: this.housing.list() });
    s.send({ t: "depleted", keys: this.professions.depletedKeys() });
    this.sendSelf(p);
    s.send({ t: "chat", from: "", name: "", text: `Welcome to Balathor v2, ${save.name}! Press Enter to chat, /help for commands.`, kind: "system" });
    this.broadcastNear(world, p.x, p.y, 60, { t: "chat", from: "", name: "", text: `${save.name} arrived in Hearthmoor.`, kind: "system" }, p.id);
  }

  // ── progression ─────────────────────────────────────────────────────────────

  private recompute(p: Player): void {
    p.derived = deriveStats(p.save.cls, p.save.lv, p.save.stats, p.save.equip);
    p.hp = Math.min(p.hp, p.derived.maxHp);
    p.selfDirty = true;
    p.saveDirty = true;
  }

  private awardXp(p: Player, xp: number): void {
    const world = this.worlds.get(p.mapId);
    const s = p.save;
    if (s.lv >= MAX_LEVEL) return;
    s.xp += xp;
    let leveled = false;
    while (s.lv < MAX_LEVEL && s.xp >= xpToNext(s.lv)) {
      s.xp -= xpToNext(s.lv);
      s.lv += 1;
      s.statPoints += 3;
      leveled = true;
    }
    if (leveled) {
      this.recompute(p);
      this.ships.refresh(p);
      p.hp = p.derived.maxHp;
      world?.fx(p.x, p.y, { e: "lvl", id: p.id, lv: s.lv });
      p.session.toast(`Level up! You are now level ${s.lv}. +3 stat points and a talent point`, "good");
    }
    p.selfDirty = true;
    p.saveDirty = true;
  }

  private onMobKilled(world: World, mob: Mob): void {
    const now = Date.now();
    let topId: string | null = null;
    let topDmg = 0;
    // Everyone who helped, plus their party members nearby, gets full XP and quest credit:
    // cosy co-op over kill-stealing.
    const credited = new Set<Player>();
    for (const [pid, dmg] of mob.damageBy) {
      const p = world.players.get(pid);
      if (!p || dist(p.x, p.y, mob.x, mob.y) > 48) continue;
      for (const m of this.social.membersOf(p)) {
        if (m.mapId === world.def.id && !m.dead && dist(m.x, m.y, mob.x, mob.y) <= 48) credited.add(m);
      }
      if (dmg > topDmg) {
        topDmg = dmg;
        topId = pid;
      }
    }
    const biome = world.def.biomeAt(mob.homeX, mob.homeY);
    for (const p of credited) {
      this.awardXp(p, mob.xp);
      p.save.kills += 1;
      this.quests.onKill(p, mob, biome);
    }
    const tpl = mob.tpl;
    const [gMin, gMax] = tpl.gold;
    const gold = Math.round((gMin + Math.random() * (gMax - gMin)) * (1 + (mob.level - 1) * 0.2));
    if (gold > 0) world.spawnLoot(mob.x, mob.y, null, gold, topId, now);
    for (const drop of tpl.drops) {
      if (Math.random() < drop.chance) {
        const t = itemTemplate(drop.tpl);
        const rarity = t && (t.kind === "weapon" || t.kind === "armor" || t.kind === "ring") ? rollRarity(Math.random, tpl.boss ? 2 : 0) : "common";
        world.spawnLoot(mob.x, mob.y, makeItem(drop.tpl, rarity, mob.level), 0, topId, now);
      }
    }
    // Bonus random gear: rare from trash, guaranteed (x2) from bosses.
    const rolls = tpl.boss ? 2 : Math.random() < 0.05 ? 1 : 0;
    const killer = topId ? world.players.get(topId) : undefined;
    for (let i = 0; i < rolls; i += 1) {
      world.spawnLoot(mob.x, mob.y, randomGear(killer?.save.cls, mob.level, tpl.boss ? 3 : 0.3, world.def.theme === "scifi"), 0, topId, now);
    }
  }

  private onPlayerDied(_world: World, p: Player): void {
    p.mounted = false;
    p.session.toast("You fainted! Respawn when you're ready.", "bad");
    p.saveDirty = true;
  }

  private respawn(p: Player, world: World): void {
    if (!p.dead) return;
    p.dead = false;
    p.mounted = false;
    p.hp = p.derived.maxHp;
    void world;
    this.transfer(p, OVERWORLD.id, OVERWORLD.spawn.x, OVERWORLD.spawn.y);
  }

  private spendStat(p: Player, stat: StatId): void {
    if (!STAT_IDS.includes(stat) || p.save.statPoints <= 0) return;
    p.save.statPoints -= 1;
    p.save.stats[stat] += 1;
    this.recompute(p);
  }

  // ── inventory ───────────────────────────────────────────────────────────────

  private bagFits(p: Player, item: Item): boolean {
    if (p.save.inv.includes(null)) return true;
    const stack = itemTemplate(item.tpl)?.stack ?? 0;
    return stack > 0 && p.save.inv.some((o) => o && o.tpl === item.tpl && o.rarity === item.rarity && o.qty < stack);
  }

  private addToBag(p: Player, item: Item): boolean {
    const inv = p.save.inv;
    const tpl = itemTemplate(item.tpl);
    if (tpl?.stack) {
      for (const other of inv) {
        if (other && other.tpl === item.tpl && other.rarity === item.rarity && other.qty < tpl.stack) {
          const room = tpl.stack - other.qty;
          const moved = Math.min(room, item.qty);
          other.qty += moved;
          item.qty -= moved;
          if (item.qty <= 0) break;
        }
      }
      if (item.qty <= 0) {
        p.selfDirty = p.saveDirty = true;
        return true;
      }
    }
    const free = inv.indexOf(null);
    if (free === -1) return false;
    inv[free] = item;
    p.selfDirty = p.saveDirty = true;
    return true;
  }

  private equipFromBag(p: Player, slot: number): void {
    const item = p.save.inv[slot];
    if (!item) return;
    let target = slotForItem(item);
    if (!target) return;
    const tpl = itemTemplate(item.tpl);
    if (tpl?.cls && tpl.cls !== p.save.cls) return p.session.toast(`Only a ${CLASSES[tpl.cls].name} can use that`, "bad");
    if (target === "ring1" && p.save.equip.ring1 && !p.save.equip.ring2) target = "ring2";
    p.save.inv[slot] = p.save.equip[target];
    p.save.equip[target] = item;
    this.recompute(p);
  }

  private unequip(p: Player, slot: EquipSlot): void {
    if (!EQUIP_SLOTS.includes(slot)) return;
    const item = p.save.equip[slot];
    if (!item) return;
    const free = p.save.inv.indexOf(null);
    if (free === -1) return p.session.toast("Your bag is full", "bad");
    p.save.inv[free] = item;
    p.save.equip[slot] = null;
    this.recompute(p);
  }

  private useItem(p: Player, world: World, slot: number): void {
    const item = p.save.inv[slot];
    if (!item || p.dead) return;
    const tpl = itemTemplate(item.tpl);
    if (!tpl) return;
    if (tpl.kind === "food") {
      const amt = Math.min(p.derived.maxHp - p.hp, tpl.heal ?? 0);
      if (amt > 0) {
        p.hp += amt;
        world.fx(p.x, p.y, { e: "heal", id: p.id, amt: Math.round(amt) });
      }
      if (tpl.buff) {
        p.food = { stat: tpl.buff.stat, value: tpl.buff.value, until: Date.now() + tpl.buff.ms, name: tpl.name };
        p.session.toast(`${tpl.name}: ${tpl.buff.stat === "def" ? `+${tpl.buff.value} armour` : `+${Math.round(tpl.buff.value * 100)}% ${tpl.buff.stat === "str" ? "damage" : tpl.buff.stat === "spd" ? "speed" : "regen/s"}`} for ${Math.round(tpl.buff.ms / 60000)} min`, "good");
      }
      item.qty -= 1;
      if (item.qty <= 0) p.save.inv[slot] = null;
      p.selfDirty = p.saveDirty = true;
      return;
    }
    if (tpl.repair) {
      if (!p.ship) return p.session.toast("Use repair kits while flying your ship");
      if (!this.ships.repair(p, tpl.repair)) return p.session.toast("Your hull is already in perfect shape");
      world.fx(p.x, p.y, { e: "heal", id: p.id, amt: Math.round(p.ship.stats.maxHull * tpl.repair) });
      item.qty -= 1;
      if (item.qty <= 0) p.save.inv[slot] = null;
      p.selfDirty = p.saveDirty = true;
      return;
    }
    if (tpl.kind === "potion" && tpl.heal) {
      if (p.hp >= p.derived.maxHp) return p.session.toast("Already at full health");
      const amt = Math.min(p.derived.maxHp - p.hp, tpl.heal);
      p.hp += amt;
      world.fx(p.x, p.y, { e: "heal", id: p.id, amt: Math.round(amt) });
      item.qty -= 1;
      if (item.qty <= 0) p.save.inv[slot] = null;
      p.selfDirty = p.saveDirty = true;
    } else if (slotForItem(item)) {
      this.equipFromBag(p, slot);
    }
  }

  private dropItem(p: Player, world: World, slot: number, now: number): void {
    const item = p.save.inv[slot];
    if (!item) return;
    p.save.inv[slot] = null;
    world.spawnLoot(p.x, p.y, item, 0, null, now);
    p.selfDirty = p.saveDirty = true;
  }

  private swapSlots(p: Player, from: number, to: number): void {
    const inv = p.save.inv;
    if (!(from >= 0 && from < inv.length && to >= 0 && to < inv.length) || from === to) return;
    [inv[from], inv[to]] = [inv[to], inv[from]];
    p.selfDirty = p.saveDirty = true;
  }

  private pickup(p: Player, world: World, id: string, now: number): void {
    const loot = world.loot.get(id);
    if (!loot || p.dead) return;
    if (dist(p.x, p.y, loot.x, loot.y) > PICKUP_RADIUS + (p.ship ? 3.5 : 0)) return;
    if (loot.ownerId && loot.ownerId !== p.id && now < loot.ownerUntil) {
      return p.session.toast("That belongs to someone else for a moment", "bad");
    }
    if (loot.item && !this.addToBag(p, { ...loot.item })) return p.session.toast("Your bag is full", "bad");
    if (loot.gold) {
      p.save.gold += loot.gold;
      p.selfDirty = p.saveDirty = true;
    }
    world.fx(loot.x, loot.y, { e: "loot", id: loot.id, by: p.id });
    world.removeLoot(loot);
  }

  /** Gold piles hop into your purse when you walk over them. */
  private magnetGold(world: World, now: number): void {
    for (const p of world.players.values()) {
      if (p.dead) continue;
      // Ships have a tractor beam: everything nearby (that fits in the bag) floats aboard.
      const R = p.ship ? 4.5 : GOLD_MAGNET_RADIUS;
      world.grid.forEachNear(p.x, p.y, R, (e) => {
        if (e.kind !== "loot") return;
        if (e.item ? !p.ship || !this.bagFits(p, e.item) : !e.gold) return;
        if (dist(p.x, p.y, e.x, e.y) > R) return;
        if (e.ownerId && e.ownerId !== p.id && now < e.ownerUntil) return;
        this.pickup(p, world, e.id, now);
      });
    }
  }

  // ── NPCs & shops ────────────────────────────────────────────────────────────

  private talk(p: Player, world: World, id: string, now: number): void {
    const npc = world.npcs.get(id);
    if (!npc || dist(p.x, p.y, npc.x, npc.y) > TALK_RADIUS) return;
    npc.talkUntil = now + 4000;
    npc.f = Math.atan2(p.y - npc.y, p.x - npc.x);
    const def = npc.def;
    const offer = this.quests.onTalk(p, npc.id);
    if (offer) p.session.send({ t: "questOffer", npc: npc.id, id: offer });
    if (def.shopId && SHOPS[def.shopId]) {
      p.session.send({ t: "shop", shop: this.shopView(def.shopId, npc.id) });
    }
    if (def.service === "hangar") p.session.send({ t: "hangar", npc: npc.id });
    const line = offer ? QUESTS_BY_ID[offer].offer : def.lines[Math.floor(Math.random() * def.lines.length)];
    world.fx(npc.x, npc.y, { e: "say", id: npc.id, text: line }, 20);
    p.session.send({ t: "chat", from: npc.id, name: def.name, text: line, kind: "npc" });
  }

  private shopView(shopId: string, npcId: string): ShopView {
    const shop = SHOPS[shopId];
    return {
      id: shop.id,
      name: shop.name,
      greeting: shop.greeting,
      npcId,
      stock: shop.stock.map((entry, idx) => ({ idx, item: { ...makeItem(entry.tpl, entry.rarity ?? "common", entry.lvl ?? 1), uid: `shop_${shop.id}_${idx}` }, price: entry.price }))
    };
  }

  private nearShop(p: Player, world: World, shopId?: string): boolean {
    for (const npc of world.npcs.values()) {
      if (!npc.def.shopId || (shopId && npc.def.shopId !== shopId)) continue;
      if (dist(p.x, p.y, npc.x, npc.y) <= SHOP_RADIUS) return true;
    }
    return false;
  }

  private buy(p: Player, world: World, shopId: string, idx: number): void {
    const shop = SHOPS[shopId];
    const entry = shop?.stock[idx];
    if (!entry || !this.nearShop(p, world, shopId)) return;
    if (p.save.gold < entry.price) return p.session.toast("Not enough gold", "bad");
    if (itemTemplate(entry.tpl)?.kind === "furniture") {
      const kind = entry.tpl.slice(5);
      p.save.gold -= entry.price;
      p.save.furniture[kind] = (p.save.furniture[kind] ?? 0) + 1;
      p.selfDirty = p.saveDirty = true;
      p.session.toast(`Bought ${itemName(makeItem(entry.tpl))}! Decorate your home with H.`, "good");
      return;
    }
    if (itemTemplate(entry.tpl)?.kind === "mount") {
      if (p.save.hasMount) return p.session.toast("You already have a pony!", "bad");
      p.save.gold -= entry.price;
      p.save.hasMount = true;
      p.selfDirty = p.saveDirty = true;
      p.session.toast("You got a Fluffy Pony! Press M to ride.", "good");
      return;
    }
    const item = makeItem(entry.tpl, entry.rarity ?? "common", entry.lvl ?? 1);
    if (!this.addToBag(p, item)) return p.session.toast("Your bag is full", "bad");
    p.save.gold -= entry.price;
    p.selfDirty = p.saveDirty = true;
    p.session.toast(`Bought ${itemName(item)}`, "good");
  }

  private sell(p: Player, world: World, slot: number): void {
    const item = p.save.inv[slot];
    if (!item || !this.nearShop(p, world)) return;
    const price = Math.max(1, Math.round(itemValue(item) * 0.45)) * item.qty;
    p.save.inv[slot] = null;
    p.save.gold += price;
    p.selfDirty = p.saveDirty = true;
    p.session.toast(`Sold ${itemName(item)}${item.qty > 1 ? ` x${item.qty}` : ""} for ${price}g`, "good");
  }

  // ── chat ────────────────────────────────────────────────────────────────────

  private handleChat(s: Session, p: Player, world: World, raw: string, now: number): void {
    const text = raw.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 160);
    if (!text) return;
    if (now - p.lastChatAt < CHAT_COOLDOWN_MS) return;
    p.lastChatAt = now;
    if (text.startsWith("/")) return this.chatCommand(s, p, world, text);
    world.fx(p.x, p.y, { e: "say", id: p.id, text }, CHAT_RADIUS);
    this.broadcastNear(world, p.x, p.y, CHAT_RADIUS, { t: "chat", from: p.id, name: p.name, text, kind: "say" });
  }

  private chatCommand(s: Session, p: Player, world: World, text: string): void {
    const [cmd] = text.slice(1).split(/\s+/);
    const sys = (t: string) => s.send({ t: "chat", from: "", name: "", text: t, kind: "system" });
    switch ((cmd ?? "").toLowerCase()) {
      case "help":
        return sys("Commands: /who, /roll, /home, /where, /invite name, /leave, /kick name, /p message, /trade name, /mount, emotes: /" + Object.keys(EMOTES).join(" /"));
      case "invite":
        return this.social.invite(p, text.trim().split(/\s+/).slice(1).join(" "));
      case "leave":
        return this.social.leave(p);
      case "kick":
        return this.social.kick(p, text.trim().split(/\s+/).slice(1).join(" "));
      case "p":
      case "party":
        return this.social.partyChat(p, text.trim().split(/\s+/).slice(1).join(" ").slice(0, 160));
      case "trade":
        return this.social.requestTrade(p, text.trim().split(/\s+/).slice(1).join(" "));
      case "mount":
        return this.toggleMount(p, Date.now());
      case "who": {
        const names = [...world.players.values()].map((o) => `${o.name} (Lv ${o.save.lv})`);
        return sys(`${names.length} online: ${names.join(", ")}`);
      }
      case "roll": {
        const n = 1 + Math.floor(Math.random() * 100);
        return this.broadcastNear(world, p.x, p.y, CHAT_RADIUS, { t: "chat", from: "", name: "", text: `${p.name} rolls ${n} (1-100)`, kind: "system" });
      }
      case "where":
        return sys(`You are at ${p.x.toFixed(0)}, ${p.y.toFixed(0)} in the ${world.def.biomeAt(p.x, p.y)} (zone level ${world.def.zoneLevelAt(p.x, p.y)}).`);
      case "home": {
        if (p.dead) return;
        if (Date.now() - p.lastDamagedAt < 8000) return sys("You can't go home mid-fight!");
        this.transfer(p, OVERWORLD.id, OVERWORLD.spawn.x, OVERWORLD.spawn.y);
        return sys("Whoosh! Back to Hearthmoor.");
      }
      case "tp": {
        // Developer-only teleport (DEV_COMMANDS=1), used for testing distant biomes.
        if (!config.devCommands) return sys(`Unknown command /${cmd}. Try /help`);
        const [, xs, ys] = text.trim().split(/\s+/);
        // Within the current map (from a house interior: out onto the overworld).
        const def = world.def.kind === "interior" ? OVERWORLD : world.def;
        const spot = def.id === OVERWORLD.id ? findWalkableNear(Number(xs) || 0, Number(ys) || 0, 10) : safeSpot(def, Number(xs) || 0, Number(ys) || 0);
        this.transfer(p, def.id, spot.x, spot.y);
        return sys(`Teleported to ${p.x.toFixed(0)}, ${p.y.toFixed(0)}`);
      }
      case "tpnpc": {
        if (!config.devCommands) return sys(`Unknown command /${cmd}. Try /help`);
        const id = text.trim().split(/\s+/)[1] ?? "";
        const def = NPCS.find((n) => n.id === id);
        if (!def) return sys(`No NPC ${id}`);
        const w = this.getWorld(def.map ?? OVERWORLD.id);
        const npc = w.npcs.get(id);
        if (!npc) return sys(`No NPC ${id}`);
        const spot = w.def.id === OVERWORLD.id ? findWalkableNear(npc.x, npc.y + 1, 4) : safeSpot(w.def, npc.x, npc.y + 1);
        this.transfer(p, w.def.id, spot.x, spot.y);
        return sys(`Teleported to ${npc.def.name}`);
      }
      case "map": {
        if (!config.devCommands) return sys(`Unknown command /${cmd}. Try /help`);
        const [, id, xs, ys] = text.trim().split(/\s+/);
        const def = getMap(id ?? "");
        if (def.id !== id) return sys(`No map ${id}`);
        const x = Number(xs);
        const y = Number(ys);
        const spot = Number.isFinite(x) && Number.isFinite(y) ? { x, y } : def.spawn;
        this.transfer(p, def.id, spot.x, spot.y);
        return sys(`Moved to ${def.name}`);
      }
      case "ship": {
        if (!config.devCommands) return sys(`Unknown command /${cmd}. Try /help`);
        const name = this.ships.grant(p, text.trim().split(/\s+/)[1] ?? "skiff");
        return sys(name ? `Granted the ${name}` : "Unknown hull");
      }
      case "prof": {
        if (!config.devCommands) return sys(`Unknown command /${cmd}. Try /help`);
        const [, id, lvRaw] = text.trim().split(/\s+/);
        const st = p.save.professions[id as keyof typeof p.save.professions];
        if (!st) return sys(`Professions: ${PROF_IDS.join(", ")}`);
        st.lv = Math.max(1, Math.min(30, Number(lvRaw) || 1));
        st.xp = 0;
        p.selfDirty = p.saveDirty = true;
        return sys(`${id} is now level ${st.lv}`);
      }
      case "xp":
      case "gold": {
        if (!config.devCommands) return sys(`Unknown command /${cmd}. Try /help`);
        const n = Math.max(0, Math.min(1_000_000, Number(text.trim().split(/\s+/)[1]) || 0));
        if (cmd === "xp") this.awardXp(p, n);
        else {
          p.save.gold += n;
          p.selfDirty = p.saveDirty = true;
        }
        return sys(`Granted ${n} ${cmd}`);
      }
      case "time": {
        if (!config.devCommands) return sys(`Unknown command /${cmd}. Try /help`);
        const t = Number(text.trim().split(/\s+/)[1]);
        if (Number.isFinite(t)) this.timeOffset = (((t - this.worldTime()) % 1) + 1) % 1 + this.timeOffset;
        const json = JSON.stringify({ t: "time", time: this.worldTime() } satisfies S2C);
        for (const other of this.sessions.values()) if (other.player) other.sendRaw(json);
        return sys(`World time is now ${this.worldTime().toFixed(2)}`);
      }
      default:
        if (EMOTES[(cmd ?? "").toLowerCase()]) return world.setEmote(p, (cmd ?? "").toLowerCase(), Date.now());
        return sys(`Unknown command /${cmd}. Try /help`);
    }
  }

  // ── talents & abilities ─────────────────────────────────────────────────────

  private learnTalent(p: Player, id: string): void {
    const err = canLearn(p.save.cls, p.save.lv, p.save.talents, id);
    if (err) return p.session.toast(err, "bad");
    p.save.talents.push(id);
    // Drop it on the first empty hotbar slot.
    const free = p.save.bar.indexOf(null);
    if (free !== -1) p.save.bar[free] = id;
    p.selfDirty = p.saveDirty = true;
    p.session.toast(`Learned ${TALENTS_BY_ID[id].name}!`, "good");
  }

  private bindAbility(p: Player, slot: number, id: string | null): void {
    if (!(slot >= 0 && slot < BAR_SLOTS)) return;
    if (id !== null && !p.save.talents.includes(id)) return;
    if (id !== null) p.save.bar = p.save.bar.map((b) => (b === id ? null : b));
    p.save.bar[slot] = id;
    p.selfDirty = p.saveDirty = true;
  }

  private castAbility(p: Player, world: World, id: string, a: number, x: number, y: number, now: number): void {
    const t = TALENTS_BY_ID[id];
    if (!t || !p.save.talents.includes(id) || p.dead || !Number.isFinite(a)) return;
    if (p.ship) return p.session.toast("Abilities don't work from the cockpit", "bad");
    if ((p.cooldowns.get(id) ?? 0) > now) return;
    if (!world.castAbility(p, t, wrapAngle(a), x, y, now)) return;
    p.cooldowns.set(id, now + t.cooldownMs);
    p.session.send({ t: "cd", id, ms: t.cooldownMs });
  }

  private respec(p: Player, world: World): void {
    const npc = world.npcs.get("npc_oswin");
    if (!npc || dist(p.x, p.y, npc.x, npc.y) > 6) return p.session.toast("Visit Guildmaster Oswin to reset talents", "bad");
    const cost = respecCost(p.save.lv);
    if (p.save.gold < cost) return p.session.toast(`Resetting talents costs ${cost}g`, "bad");
    if (!p.save.talents.length) return;
    p.save.gold -= cost;
    p.save.talents = [];
    p.save.bar = new Array(BAR_SLOTS).fill(null);
    p.cooldowns.clear();
    p.selfDirty = p.saveDirty = true;
    p.session.toast(`Talents reset for ${cost}g`, "good");
  }

  // ── mounts, waypoints, social ───────────────────────────────────────────────

  private toggleMount(p: Player, now: number): void {
    if (!p.save.hasMount) return p.session.toast("You need a pony first. Visit Stable Keeper Holt!", "bad");
    if (p.mounted) {
      p.mounted = false;
      return;
    }
    if (p.dead || p.swimming) return;
    if (now - p.lastDamagedAt < 3000) return p.session.toast("You can't mount up mid-fight!", "bad");
    p.mounted = true;
    p.emote = "";
  }

  private travel(p: Player, world: World, id: string): void {
    const dest = waypointById(id);
    if (!dest || !p.save.waypoints.includes(id) || p.dead || world.def.id !== OVERWORLD.id) return;
    const near = WAYPOINTS.find((w) => dist(p.x, p.y, w.x, w.y) <= WAYPOINT_USE_RADIUS && p.save.waypoints.includes(w.id));
    if (!near) return p.session.toast("Stand next to an attuned obelisk to travel", "bad");
    if (near.id === id) return;
    const cost = id === "wp_hearthmoor" ? 0 : WAYPOINT_COST;
    if (p.save.gold < cost) return p.session.toast(`Travel costs ${cost}g`, "bad");
    if (Date.now() - p.lastDamagedAt < 5000) return p.session.toast("You can't travel mid-fight!", "bad");
    p.save.gold -= cost;
    const spot = findWalkableNear(dest.x + 1.5, dest.y + 1.5, 4);
    p.selfDirty = p.saveDirty = true;
    this.transfer(p, OVERWORLD.id, spot.x, spot.y);
    p.session.toast(`Whoosh! Welcome to ${dest.name}.`, "good");
  }

  private discoverWaypoints(p: Player): void {
    for (const w of WAYPOINTS) {
      if (p.save.waypoints.includes(w.id)) continue;
      if (dist(p.x, p.y, w.x, w.y) <= WAYPOINT_DISCOVER_RADIUS) {
        p.save.waypoints.push(w.id);
        p.selfDirty = p.saveDirty = true;
        p.session.toast(`Attuned to ${w.name}!`, "good");
      }
    }
  }

  private partyOp(p: Player, msg: Extract<C2S, { t: "party" }>): void {
    switch (msg.op) {
      case "invite": {
        const target = msg.target ? this.findPlayer(msg.target) : undefined;
        return this.social.invite(p, target?.name ?? String(msg.target ?? ""));
      }
      case "accept":
        return this.social.respondInvite(p, true);
      case "decline":
        return this.social.respondInvite(p, false);
      case "leave":
        return this.social.leave(p);
      case "kick": {
        const target = msg.target ? this.findPlayer(msg.target) : undefined;
        return this.social.kick(p, target?.name ?? String(msg.target ?? ""));
      }
    }
  }

  private tradeOp(p: Player, msg: Extract<C2S, { t: "trade" }>): void {
    switch (msg.op) {
      case "request":
        return this.social.requestTrade(p, String(msg.target ?? ""));
      case "accept":
        return this.social.respondTrade(p, true);
      case "decline":
        return this.social.respondTrade(p, false);
      case "cancel":
        return this.social.cancelTrade(p);
      case "offer":
        return this.social.offer(p, Number(msg.slot), true);
      case "unoffer":
        return this.social.offer(p, Number(msg.slot), false);
      case "gold":
        return this.social.setGold(p, Number(msg.gold));
      case "ready":
        return this.social.ready(p);
    }
  }

  private findPlayer(id: string): Player | undefined {
    for (const w of this.worlds.values()) {
      const p = w.players.get(id);
      if (p) return p;
    }
    return undefined;
  }

  private broadcastNear(world: World, x: number, y: number, r: number, msg: S2C, exceptId?: string): void {
    const json = JSON.stringify(msg);
    world.grid.forEachNear(x, y, r, (e) => {
      if (e.kind === "player" && e.id !== exceptId && dist(x, y, e.x, e.y) <= r) e.session.sendRaw(json);
    });
  }

  // ── tick, replication, persistence ──────────────────────────────────────────

  private tick(dt: number, now: number): void {
    this.tickCount += 1;
    for (const world of this.worlds.values()) {
      world.tick(dt, now);
      this.magnetGold(world, now);
    }
    if (now - this.lastCheckAt >= 500) {
      this.lastCheckAt = now;
      for (const s of this.sessions.values()) {
        const p = s.player;
        if (!p || p.dead) continue;
        this.quests.checkVisits(p);
        if (p.mapId === OVERWORLD.id) this.discoverWaypoints(p);
        else this.checkStairs(p, now);
      }
    }
    const depleted = this.professions.tick(
      (function* (sessions) {
        for (const s of sessions) if (s.player) yield s.player;
      })(this.sessions.values()),
      (p) => this.worlds.get(p.mapId),
      now
    );
    if (depleted.length) {
      const json = JSON.stringify({ t: "depleted", keys: this.professions.depletedKeys() } satisfies S2C);
      for (const s of this.sessions.values()) if (s.player) s.sendRaw(json);
    }
    if (now - this.lastPartyTickAt >= 1000) {
      this.lastPartyTickAt = now;
      this.social.tick();
    }
    if (this.tickCount % this.snapEvery === 0) this.replicateAll(now);
    for (const s of this.sessions.values()) {
      if (s.player?.selfDirty) this.sendSelf(s.player);
      s.flushFx();
    }
    if (now - this.lastTimeBroadcastAt > 30_000) {
      this.lastTimeBroadcastAt = now;
      const json = JSON.stringify({ t: "time", time: this.worldTime(now) } satisfies S2C);
      for (const s of this.sessions.values()) if (s.player) s.sendRaw(json);
    }
    if (now - this.lastSaveAt > config.saveIntervalMs) {
      this.lastSaveAt = now;
      this.saveAll(false);
    }
  }

  private replicateAll(now: number): void {
    this.pass += 1;
    for (const s of this.sessions.values()) {
      const p = s.player;
      if (!p || s.congested) continue;
      const world = this.worlds.get(p.mapId);
      if (world) this.replicate(s, p, world, now);
    }
  }

  /** Send this client only what changed in its area of interest since its last snapshot. */
  private replicate(s: Session, p: Player, world: World, now: number): void {
    const R = config.aoiRadius;
    const add: NetEntity[] = [];
    const upd: [string, Partial<NetEntity>][] = [];
    const seen = new Set<string>();
    world.grid.forEachNear(p.x, p.y, R, (e) => {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy > R * R || !world.isReplicated(e, now)) return;
      const net = e.net(this.pass);
      seen.add(net.id);
      const prev = s.known.get(net.id);
      if (!prev) {
        add.push(net);
      } else if (prev !== net) {
        let diff: Record<string, unknown> | null = null;
        for (const key in net) {
          const v = (net as unknown as Record<string, unknown>)[key];
          if ((prev as unknown as Record<string, unknown>)[key] !== v) (diff ??= {})[key] = v;
        }
        if (diff) upd.push([net.id, diff as Partial<NetEntity>]);
      }
      s.known.set(net.id, net);
    });
    let del: string[] | undefined;
    if (s.known.size !== seen.size) {
      for (const id of s.known.keys()) {
        if (!seen.has(id)) {
          (del ??= []).push(id);
          s.known.delete(id);
        }
      }
    }
    const msg: S2C = { t: "s", tk: this.tickCount, ack: p.input.seq, x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 };
    if (add.length) msg.add = add;
    if (upd.length) msg.upd = upd;
    if (del) msg.del = del;
    s.send(msg);
  }

  // ── doors, homes, decorating, storage ───────────────────────────────────────

  private useDoor(p: Player, world: World, id: string, now: number): void {
    const door = DOORS_BY_ID[id];
    if (!door || door.map !== world.def.id || p.dead) return;
    if (Math.hypot(p.x - door.x, p.y - door.y) > DOOR_RADIUS + 0.4) return;
    if (now - p.lastDoorAt < 600) return;
    if (door.plot && door.to.map !== OVERWORLD.id) {
      const owner = this.housing.ownerOf(door.plot);
      if (!owner) {
        const plot = PLOTS_BY_ID[door.plot];
        return p.session.send({ t: "toast", text: `${plot.name} is for sale: ${plot.price} gold`, kind: "info" });
      }
      if (!this.housing.canEnter(p, door.plot, this.social.membersOf(p))) {
        return p.session.toast(`${owner.name}'s home is locked`, "bad");
      }
    }
    this.transfer(p, door.to.map, door.to.x, door.to.y);
  }

  private checkStairs(p: Player, now: number): void {
    const map = getMap(p.mapId);
    if (!isInterior(map) || !map.plot?.manor || now - p.lastDoorAt < 1200) return;
    if (map.tileAt(p.x, p.y) !== Tile.STAIRS) return;
    const other = map.floor === 0 ? 1 : 0;
    const target = getMap(houseMapId(map.plot.id, other));
    if (!isInterior(target) || !target.layout.stairs) return;
    this.transfer(p, target.id, target.layout.stairs.x - 0.8, target.layout.stairs.y + 1.3);
  }

  private houseOp(p: Player, world: World, msg: Extract<C2S, { t: "house" }>): void {
    const plotId = String(msg.plot);
    let err: string | null = null;
    if (msg.op === "buy") {
      const plot = PLOTS_BY_ID[plotId];
      if (!plot || Math.hypot(p.x - plot.front.x, p.y - plot.front.y) > 4 || world.def.id !== OVERWORLD.id) return;
      err = this.housing.buy(p, plotId);
      if (!err) p.session.toast(`Welcome home! ${plot.name} is yours.`, "good");
    } else if (msg.op === "sell") {
      err = this.housing.sell(p, plotId, this.worlds.values());
      if (!err) {
        p.session.toast("Home sold. Your furniture is back in your stock.", "good");
        for (const w of this.worlds.values()) {
          const id = parseHouseMapId(w.def.id);
          if (id?.plotId !== plotId) continue;
          const plot = PLOTS_BY_ID[plotId];
          for (const other of [...w.players.values()]) this.transfer(other, OVERWORLD.id, plot.front.x, plot.front.y);
        }
      }
    } else if (msg.op === "open") {
      this.housing.setOpen(p, plotId, Boolean(msg.open));
      p.session.toast(msg.open ? "Your home is open to visitors" : "Your home is private again", "good");
    }
    if (err) p.session.toast(err, "bad");
    else this.broadcastHouses();
  }

  private furnOp(p: Player, world: World, msg: Extract<C2S, { t: "furn" }>): void {
    const err =
      msg.op === "place"
        ? this.housing.place(p, world, String(msg.kind), Number(msg.x), Number(msg.y), Number(msg.rot))
        : this.housing.pickup(p, world, String(msg.id));
    if (err) p.session.toast(err, "bad");
  }

  private storageOp(p: Player, world: World, msg: Extract<C2S, { t: "storage" }>): void {
    if (msg.op === "close") {
      if (p.storageOpen) this.housing.saveStorage(p.storageOpen);
      p.storageOpen = null;
      return;
    }
    const plotId = this.housing.storageAccess(p, world);
    if (!plotId) return p.session.toast("Stand next to a storage chest in your home", "bad");
    const items = this.housing.getStorage(plotId);
    p.storageOpen = plotId;
    const slot = Math.floor(Number(msg.slot));
    if (msg.op === "deposit") {
      const item = p.save.inv[slot];
      const free = items.indexOf(null);
      if (item && free !== -1 && free < HOUSE_STORAGE_SIZE) {
        items[free] = item;
        p.save.inv[slot] = null;
        p.selfDirty = p.saveDirty = true;
        this.housing.saveStorage(plotId);
      } else if (item) p.session.toast("Your storage is full", "bad");
    } else if (msg.op === "withdraw") {
      const item = items[slot];
      if (item && this.addToBag(p, { ...item })) {
        items[slot] = null;
        this.housing.saveStorage(plotId);
      } else if (item) p.session.toast("Your bag is full", "bad");
    }
    p.session.send({ t: "storage", items });
  }

  private sendSelf(p: Player): void {
    // Bag-dependent systems re-check before we publish the new state.
    this.quests.onBagChanged(p);
    this.social.onBagChanged(p);
    p.selfDirty = false;
    const s = p.save;
    const self: SelfState = {
      id: p.id,
      name: s.name,
      cls: s.cls,
      look: s.look,
      lv: s.lv,
      xp: s.xp,
      xpNext: xpToNext(s.lv),
      gold: s.gold,
      statPoints: s.statPoints,
      stats: s.stats,
      derived: {
        maxHp: p.derived.maxHp,
        damage: Math.round(p.derived.damage * 10) / 10,
        armor: Math.round(p.derived.armor * 10) / 10,
        speed: Math.round(p.derived.speed * 100) / 100,
        blockChance: Math.round(p.derived.blockChance * 100) / 100
      },
      inv: s.inv,
      equip: s.equip,
      kills: s.kills,
      talents: s.talents,
      talentPoints: talentPoints(s.lv, s.talents),
      bar: s.bar,
      quests: s.quests,
      markers: this.quests.markers(p),
      waypoints: s.waypoints,
      hasMount: s.hasMount,
      furniture: s.furniture,
      home: this.housing.homeOf(p.accountId),
      professions: s.professions,
      ships: s.ships,
      activeShip: s.activeShip,
      shipUp: s.shipUp,
      discovered: s.discovered,
      ship: p.ship ? { hull: Math.ceil(p.ship.hull), shield: Math.ceil(p.ship.shield) } : null,
      food: p.food ? { stat: p.food.stat, value: p.food.value, ms: Math.max(0, p.food.until - Date.now()), name: p.food.name } : null
    };
    p.session.send({ t: "self", self });
  }

  private persist(p: Player): void {
    p.save.x = p.x;
    p.save.y = p.y;
    p.save.hp = Math.max(1, Math.round(p.hp));
    p.save.map = p.mapId;
    try {
      this.store.saveCharacter(p.accountId, p.name, p.save);
      p.saveDirty = false;
    } catch (error) {
      console.error("[save] failed for", p.name, error);
    }
  }

  saveAll(force: boolean): void {
    const rows: { accountId: number; name: string; data: unknown }[] = [];
    const saved: Player[] = [];
    for (const s of this.sessions.values()) {
      const p = s.player;
      if (!p || (!force && !p.saveDirty && !p.moving)) continue;
      p.save.x = p.x;
      p.save.y = p.y;
      p.save.hp = Math.max(1, Math.round(p.hp));
      p.save.map = p.mapId;
      rows.push({ accountId: p.accountId, name: p.name, data: p.save });
      saved.push(p);
    }
    try {
      this.store.saveCharacters(rows);
      for (const p of saved) p.saveDirty = false;
    } catch (error) {
      console.error("[save] batch failed:", error);
    }
  }
}

function sanitizeLook(raw: unknown, cls: keyof typeof CLASSES): Appearance {
  const r = (raw ?? {}) as Partial<Appearance>;
  const color = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v : fallback);
  return {
    body: color(r.body, CLASSES[cls].colors.body),
    accent: color(r.accent, CLASSES[cls].colors.accent),
    skin: color(r.skin, "#ffd9b8"),
    hair: color(r.hair, "#5a3a2a"),
    hairStyle: clamp(Math.floor(Number(r.hairStyle) || 0), 0, 4)
  };
}

/** Fill in fields added after a save was written. */
function normalizeSave(save: CharacterSave): CharacterSave {
  save.inv = Array.isArray(save.inv) ? save.inv.slice(0, INVENTORY_SIZE) : [];
  while (save.inv.length < INVENTORY_SIZE) save.inv.push(null);
  save.equip = Object.assign({ weapon: null, body: null, ring1: null, ring2: null }, save.equip ?? {});
  save.stats = Object.assign({ str: 0, vit: 0, agi: 0, def: 0 }, save.stats ?? {});
  save.kills ??= 0;
  save.statPoints ??= 0;
  save.map ??= OVERWORLD.id;
  save.talents = Array.isArray(save.talents) ? save.talents.filter((t) => TALENTS_BY_ID[t]?.cls === save.cls) : [];
  save.bar = Array.isArray(save.bar) ? save.bar.slice(0, BAR_SLOTS) : [];
  while (save.bar.length < BAR_SLOTS) save.bar.push(null);
  save.bar = save.bar.map((b) => (b && save.talents.includes(b) ? b : null));
  save.quests = { active: save.quests?.active ?? [], done: save.quests?.done ?? [] };
  save.quests.active = save.quests.active.filter((q) => QUESTS_BY_ID[q.id]);
  save.waypoints = Array.isArray(save.waypoints) ? save.waypoints : ["wp_hearthmoor"];
  if (!save.waypoints.includes("wp_hearthmoor")) save.waypoints.push("wp_hearthmoor");
  save.hasMount = Boolean(save.hasMount);
  save.furniture = save.furniture && typeof save.furniture === "object" ? save.furniture : {};
  const profs = freshProfessions();
  for (const id of PROF_IDS) if (save.professions?.[id]) profs[id] = { lv: Math.max(1, Number(save.professions[id].lv) || 1), xp: Math.max(0, Number(save.professions[id].xp) || 0) };
  save.professions = profs;
  save.ships = Array.isArray(save.ships) ? save.ships.filter((h) => HULL_IDS.includes(h)) : [];
  save.activeShip = save.activeShip && save.ships.includes(save.activeShip) ? save.activeShip : save.ships[0] ?? null;
  const up = freshUpgrades();
  for (const slot of UPGRADE_SLOTS) up[slot] = Math.max(0, Math.min(3, Number(save.shipUp?.[slot]) || 0));
  save.shipUp = up;
  save.discovered = Array.isArray(save.discovered) ? save.discovered.filter((d) => typeof d === "string") : [];
  return save;
}

function randomGear(cls: keyof typeof CLASSES | undefined, level: number, luck: number, scifi = false): Item {
  const ok = (t: (typeof ITEM_TEMPLATES)[string]) => (scifi ? t.realm === "scifi" : !t.realm);
  const weapons = Object.values(ITEM_TEMPLATES).filter((t) => t.kind === "weapon" && (!cls || t.cls === cls) && ok(t));
  const armor = Object.values(ITEM_TEMPLATES).filter((t) => t.kind === "armor" && ok(t));
  const rings = Object.values(ITEM_TEMPLATES).filter((t) => t.kind === "ring" && ok(t));
  const roll = Math.random();
  const pool = roll < 0.45 ? weapons : roll < 0.8 ? armor : rings;
  const tpl = pool[Math.floor(Math.random() * pool.length)];
  return makeItem(tpl.id, rollRarity(Math.random, luck), Math.max(1, level));
}

/** A walkable spot near (x, y) on any map. */
function safeSpot(map: MapDef, x: number, y: number): { x: number; y: number } {
  if (map.id === OVERWORLD.id) return findWalkableNear(x, y, 6);
  if (!circleBlocked(map, x, y)) return { x, y };
  for (let r = 1; r <= 8; r += 1) {
    for (let i = 0; i < r * 8; i += 1) {
      const a = (i / (r * 8)) * Math.PI * 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (!circleBlocked(map, px, py)) return { x: px, y: py };
    }
  }
  return { ...map.spawn };
}
