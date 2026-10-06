// Server-side entity types. Each knows how to serialise itself for replication (`net()`),
// cached per snapshot pass so many viewers share one object.

import type { Appearance, NetEntity, NetFurniture, NetLoot, NetMob, NetNpc, NetPlayer, NetShip } from "../../shared/protocol";
import { SAIL_HULLS, type SailHullId } from "../../shared/game/sailing";
import type { ClassId } from "../../shared/game/classes";
import type { EquipSlot, Item, Rarity } from "../../shared/game/items";
import { RARITIES } from "../../shared/game/items";
import type { StatId, Derived } from "../../shared/game/stats";
import type { MobTemplate } from "../../shared/game/mobs";
import type { NpcDef } from "../../shared/game/npcs";
import type { Spatial } from "./spatial";
import type { Session } from "./session";
import { round2 } from "../../shared/math";
import type { BuffId } from "../../shared/game/talents";
import type { QuestLog } from "../../shared/game/quests";
import type { FoodStat, ProfLevels } from "../../shared/game/professions";
import type { HullId, ShipStats, ShipUpgrades } from "../../shared/game/ships";

interface NetCached {
  netPass: number;
  netValue: NetEntity | null;
}

export interface CharacterSave {
  name: string;
  cls: ClassId;
  look: Appearance;
  lv: number;
  xp: number;
  gold: number;
  statPoints: number;
  stats: Record<StatId, number>;
  inv: (Item | null)[];
  equip: Record<EquipSlot, Item | null>;
  map: string;
  x: number;
  y: number;
  hp: number;
  kills: number;
  talents: string[];
  bar: (string | null)[];
  quests: QuestLog;
  waypoints: string[];
  hasMount: boolean;
  furniture: Record<string, number>;
  professions: ProfLevels;
  ships: HullId[];
  activeShip: HullId | null;
  shipUp: ShipUpgrades;
  discovered: string[];
  sailShips: SailHullId[];
  activeSail: SailHullId | null;
}

/** A ship being flown (players in space only). */
export interface ShipState {
  stats: ShipStats;
  hull: number;
  shield: number;
  vx: number;
  vy: number;
  boostUntil: number;
  boostReadyAt: number;
  warp: { dest: string; at: number } | null;
  nextTurretAt: number;
}

export interface ActiveBuff {
  until: number;
  value: number;
  /** Remaining absorb for "shield". */
  absorb?: number;
}

const rarityIndex = (r: Rarity | undefined) => (r ? RARITIES.indexOf(r) : 0);

export class Player implements Spatial, NetCached {
  readonly kind = "player" as const;
  cell = 0;
  netPass = -1;
  netValue: NetEntity | null = null;
  mapId: string;
  x: number;
  y: number;
  f = Math.PI / 2;
  hp: number;
  dead = false;
  moving = false;
  swimming = false;
  input = { mx: 0, my: 0, seq: 0 };
  lastAttackAt = 0;
  lastJumpAt = 0;
  lastDamagedAt = 0;
  lastChatAt = 0;
  derived!: Derived;
  mounted = false;
  emote = "";
  emoteUntil = 0;
  buffs = new Map<BuffId, ActiveBuff>();
  /** Ability id → time it is ready again. */
  cooldowns = new Map<string, number>();
  partyId: string | null = null;
  tradeId: string | null = null;
  /** Active food/tonic buff. */
  food: { stat: FoodStat; value: number; until: number; name: string } | null = null;
  /** Plot whose storage chest this player has open. */
  storageOpen: string | null = null;
  lastDoorAt = 0;
  nextDiscoverAt = 0;
  ship: ShipState | null = null;
  /** Aboard a sailing ship: which one, where on its deck, and whether we're steering. */
  aboard: { shipId: string; lx: number; ly: number; helm: boolean } | null = null;
  /** Per-cannon / broadside cooldowns while aboard. */
  cannonReadyAt = new Map<string, number>();
  /** Self state (inventory/stats) changed and must be re-sent. */
  selfDirty = true;
  /** Persisted fields changed since the last save. */
  saveDirty = false;

  constructor(
    readonly id: string,
    readonly accountId: number,
    public session: Session,
    public save: CharacterSave
  ) {
    this.mapId = save.map;
    this.x = save.x;
    this.y = save.y;
    this.hp = save.hp;
  }

  get name(): string {
    return this.save.name;
  }

  net(pass: number): NetPlayer {
    if (this.netPass === pass && this.netValue) return this.netValue as NetPlayer;
    const s = this.save;
    const value: NetPlayer = {
      k: "p",
      id: this.id,
      x: round2(this.x),
      y: round2(this.y),
      f: round2(this.f),
      name: s.name,
      cls: s.cls,
      look: s.look,
      hp: Math.ceil(this.ship ? this.ship.hull : this.hp),
      mhp: this.ship ? this.ship.stats.maxHull : this.derived.maxHp,
      lv: s.lv,
      mv: this.moving ? 1 : 0,
      sw: this.swimming ? 1 : 0,
      dead: this.dead ? 1 : 0,
      wr: rarityIndex(s.equip.weapon?.rarity),
      ar: rarityIndex(s.equip.body?.rarity),
      mt: this.mounted ? 1 : 0,
      em: this.emote,
      bf: this.buffs.size ? [...this.buffs.keys()].join(",") : "",
      sh: this.ship ? this.ship.stats.hull : "",
      sd: this.ship ? Math.round((this.ship.shield / Math.max(1, this.ship.stats.maxShield)) * 100) : 0,
      bo: this.ship && this.ship.boostUntil > Date.now() ? 1 : 0,
      ab: this.aboard ? this.aboard.shipId : "",
      lx: this.aboard ? round2(this.aboard.lx) : 0,
      ly: this.aboard ? round2(this.aboard.ly) : 0,
      hm: this.aboard?.helm ? 1 : 0
    };
    this.netPass = pass;
    this.netValue = value;
    return value;
  }
}

export type MobState = "idle" | "wander" | "chase" | "return" | "flee";

export class Mob implements Spatial, NetCached {
  readonly kind = "mob" as const;
  cell = 0;
  netPass = -1;
  netValue: NetEntity | null = null;
  x: number;
  y: number;
  f = Math.random() * Math.PI * 2;
  hp: number;
  maxHp: number;
  dmg: number;
  xp: number;
  dead = false;
  diedAt = 0;
  respawnAt = 0;
  moving = false;
  state: MobState = "idle";
  targetId: string | null = null;
  goalX: number;
  goalY: number;
  nextThinkAt = 0;
  lastAttackAt = 0;
  fleeUntil = 0;
  slowUntil = 0;
  slowMult = 1;
  stunUntil = 0;
  blindUntil = 0;
  /** Damage dealt per player id (for XP / loot ownership). */
  damageBy = new Map<string, number>();

  constructor(
    readonly id: string,
    readonly tpl: MobTemplate,
    readonly level: number,
    readonly homeX: number,
    readonly homeY: number,
    stats: { hp: number; dmg: number; xp: number },
    readonly respawnMs: number
  ) {
    this.x = homeX;
    this.y = homeY;
    this.goalX = homeX;
    this.goalY = homeY;
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.dmg = stats.dmg;
    this.xp = stats.xp;
  }

  get radius(): number {
    return 0.35 * this.tpl.scale + 0.1;
  }

  statusBits(now: number): number {
    return (now < this.slowUntil ? 1 : 0) | (now < this.stunUntil ? 2 : 0) | (now < this.blindUntil ? 4 : 0);
  }

  net(pass: number): NetMob {
    if (this.netPass === pass && this.netValue) return this.netValue as NetMob;
    const value: NetMob = {
      k: "m",
      id: this.id,
      x: round2(this.x),
      y: round2(this.y),
      f: round2(this.f),
      tpl: this.tpl.id,
      lv: this.level,
      hp: Math.ceil(this.hp),
      mhp: this.maxHp,
      mv: this.moving ? 1 : 0,
      ag: this.state === "chase" ? 1 : 0,
      dead: this.dead ? 1 : 0,
      st: this.statusBits(Date.now())
    };
    this.netPass = pass;
    this.netValue = value;
    return value;
  }
}

export class Npc implements Spatial, NetCached {
  readonly kind = "npc" as const;
  cell = 0;
  netPass = -1;
  netValue: NetEntity | null = null;
  x: number;
  y: number;
  f = Math.PI / 2;
  moving = false;
  goalX: number;
  goalY: number;
  nextThinkAt = 0;
  talkUntil = 0;
  /** Inside a building (not replicated) until their schedule moves them on. */
  indoors = false;
  /** Current schedule entry key, and the path being walked to it. */
  scheduleKey = "";
  path: { x: number; y: number }[] = [];
  homeX: number;
  homeY: number;
  wander: number;
  stuckSince = 0;

  constructor(readonly id: string, readonly def: NpcDef) {
    this.x = def.x;
    this.y = def.y;
    this.goalX = def.x;
    this.goalY = def.y;
    this.homeX = def.x;
    this.homeY = def.y;
    this.wander = def.wander;
  }

  net(pass: number): NetNpc {
    if (this.netPass === pass && this.netValue) return this.netValue as NetNpc;
    const value: NetNpc = { k: "n", id: this.id, x: round2(this.x), y: round2(this.y), f: round2(this.f), npc: this.def.id, mv: this.moving ? 1 : 0 };
    this.netPass = pass;
    this.netValue = value;
    return value;
  }
}

export class Loot implements Spatial, NetCached {
  readonly kind = "loot" as const;
  cell = 0;
  netPass = -1;
  netValue: NetEntity | null = null;

  constructor(
    readonly id: string,
    public x: number,
    public y: number,
    readonly item: Item | null,
    readonly gold: number,
    readonly ownerId: string | null,
    readonly ownerUntil: number,
    readonly expiresAt: number
  ) {}

  net(pass: number): NetLoot {
    if (this.netPass === pass && this.netValue) return this.netValue as NetLoot;
    const value: NetLoot = {
      k: "l",
      id: this.id,
      x: round2(this.x),
      y: round2(this.y),
      tpl: this.item?.tpl ?? null,
      rarity: this.item?.rarity ?? null,
      gold: this.gold
    };
    this.netPass = pass;
    this.netValue = value;
    return value;
  }
}

export class Furn implements Spatial, NetCached {
  readonly kind = "furniture" as const;
  cell = 0;
  netPass = -1;
  netValue: NetEntity | null = null;

  constructor(
    readonly id: string,
    readonly furn: string,
    readonly x: number,
    readonly y: number,
    readonly rot: number,
    readonly plotId: string,
    readonly floor: number
  ) {}

  net(pass: number): NetFurniture {
    if (this.netPass === pass && this.netValue) return this.netValue as NetFurniture;
    const value: NetFurniture = { k: "f", id: this.id, x: this.x, y: this.y, kind: this.furn, rot: this.rot };
    this.netPass = pass;
    this.netValue = value;
    return value;
  }
}

/** A player's sailing ship on the ocean. */
export class SailShip implements Spatial, NetCached {
  readonly kind = "ship" as const;
  cell = 0;
  netPass = -1;
  netValue: NetEntity | null = null;
  f = Math.PI / 2;
  v = 0;
  sail = 0;
  hp: number;
  /** Player at the wheel. */
  helmId: string | null = null;
  readonly crew = new Set<string>();
  /** Last time the hull took a hit (repairs wait for calm). */
  lastHitAt = 0;

  constructor(
    readonly id: string,
    readonly hull: SailHullId,
    public ownerId: string,
    public ownerName: string,
    public x: number,
    public y: number
  ) {
    this.hp = SAIL_HULLS[hull].hp;
  }

  get def() {
    return SAIL_HULLS[this.hull];
  }

  net(pass: number): NetShip {
    if (this.netPass === pass && this.netValue) return this.netValue as NetShip;
    const value: NetShip = {
      k: "s",
      id: this.id,
      x: round2(this.x),
      y: round2(this.y),
      f: round2(this.f),
      hull: this.hull,
      hp: Math.ceil(this.hp),
      mhp: this.def.hp,
      sail: this.sail,
      v: round2(this.v),
      owner: this.ownerName
    };
    this.netPass = pass;
    this.netValue = value;
    return value;
  }
}

export type Entity = Player | Mob | Npc | Loot | Furn | SailShip;
