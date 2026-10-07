// The one and only definition of the wire protocol. Both sides import these types, so a
// change here is a compile error anywhere it is mishandled.
//
// Transport: JSON text frames over a WebSocket at /ws.
// Replication: the server keeps, per client, the last state it sent for every entity in that
// client's area of interest and sends only additions, changed fields and removals.

import type { ClassId } from "./game/classes";
import type { EquipSlot, Item } from "./game/items";
import type { StatId } from "./game/stats";
import type { BuffId, ZoneKind } from "./game/talents";
import type { QuestLog } from "./game/quests";
import type { FoodStat, ProfLevels } from "./game/professions";
import type { HullId, ShipUpgrades } from "./game/ships";
import type { SailHullId } from "./game/sailing";

export const PROTOCOL_VERSION = 1;

// ─── Entities as replicated to clients ────────────────────────────────────────

export interface Appearance {
  body: string;
  accent: string;
  skin: string;
  hair: string;
  hairStyle: number;
}

export interface NetPlayer {
  k: "p";
  id: string;
  x: number;
  y: number;
  /** Facing angle (radians, world space: 0 = +x/east). */
  f: number;
  name: string;
  cls: ClassId;
  look: Appearance;
  hp: number;
  mhp: number;
  lv: number;
  /** 1 while walking. */
  mv: 0 | 1;
  /** 1 while swimming in shallows. */
  sw: 0 | 1;
  dead: 0 | 1;
  /** Rarity index (0-5) of equipped weapon / armour, for visual flair. */
  wr: number;
  ar: number;
  /** Riding a pony. */
  mt: 0 | 1;
  /** Current emote ("" when none). */
  em: string;
  /** Active visible buffs, comma-separated (e.g. "shield,rage"). */
  bf: string;
  /** Flying a ship: its hull class ("" on foot). hp/mhp are then the ship's hull. */
  sh: string;
  /** Ship shield 0-100. */
  sd: number;
  /** 1 while boosting. */
  bo: 0 | 1;
  /** Aboard a sailing ship: its id ("" otherwise) and our spot on its deck. */
  ab: string;
  lx: number;
  ly: number;
  /** 1 while at the helm. */
  hm: 0 | 1;
  /** Chosen trophy title ("" for none). */
  tt: string;
  /** 1 while sprinting. */
  sp: 0 | 1;
  /** Moderator (1) and flying god mode (1). */
  md: 0 | 1;
  gd: 0 | 1;
}

/** A running minigame, as the player sees it. */
export interface MgView {
  game: string;
  site: string;
  title: string;
  /** Milliseconds left (0 = untimed). */
  ms: number;
  text: string;
  /** Current checkpoint (courses / arenas). */
  target?: { map: string; x: number; y: number; r: number; label: string } | null;
  /** Game-specific state for overlay games. */
  ui?: Record<string, unknown>;
}

/** A sailing ship (players' ships; pirate ships are mobs). */
export interface NetShip {
  k: "s";
  id: string;
  x: number;
  y: number;
  f: number;
  hull: string;
  hp: number;
  mhp: number;
  /** Sail level 0 (furled) - 2 (full). */
  sail: number;
  /** Speed (for the wake). */
  v: number;
  owner: string;
}

export interface NetMob {
  k: "m";
  id: string;
  x: number;
  y: number;
  f: number;
  tpl: string;
  lv: number;
  hp: number;
  mhp: number;
  mv: 0 | 1;
  /** 1 while chasing / attacking someone. */
  ag: 0 | 1;
  dead: 0 | 1;
  /** Status bits: 1 slowed, 2 stunned, 4 blinded. */
  st: number;
}

export interface NetNpc {
  k: "n";
  id: string;
  x: number;
  y: number;
  f: number;
  npc: string;
  mv: 0 | 1;
}

export interface NetLoot {
  k: "l";
  id: string;
  x: number;
  y: number;
  tpl: string | null;
  rarity: string | null;
  gold: number;
}

export interface NetFurniture {
  k: "f";
  id: string;
  x: number;
  y: number;
  kind: string;
  rot: number;
}

export type NetEntity = NetPlayer | NetMob | NetNpc | NetLoot | NetFurniture | NetShip;

export interface HouseInfo {
  plot: string;
  owner: string | null;
  open: boolean;
}

// ─── Combat / world effects ───────────────────────────────────────────────────

export type ProjectileKind = "arrow" | "fireball" | "frostbolt" | "emberball" | "arcane" | "laser" | "laser_red" | "plasma" | "cannonball" | "shot";

export type FxEvent =
  | { e: "swing"; id: string; a: number }
  | { e: "cast"; id: string; a: number }
  | { e: "proj"; pid: number; by: string; kind: ProjectileKind; x: number; y: number; a: number; spd: number; rng: number }
  | { e: "projEnd"; pid: number; x: number; y: number; burst: number }
  | { e: "hit"; id: string; dmg: number; block?: 1; crit?: 1 }
  | { e: "heal"; id: string; amt: number }
  | { e: "die"; id: string }
  | { e: "lvl"; id: string; lv: number }
  | { e: "loot"; id: string; by: string }
  | { e: "say"; id: string; text: string }
  | { e: "ability"; id: string; ab: string; a: number }
  | { e: "nova"; id: string; ab: string; x: number; y: number; r: number }
  | { e: "zone"; zid: number; kind: ZoneKind; x: number; y: number; r: number; dur: number }
  | { e: "buff"; id: string; buff: BuffId; dur: number }
  | { e: "jump"; id: string }
  | { e: "work"; id: string; prof: string; x: number; y: number }
  | { e: "warp"; id: string; x: number; y: number; out: 0 | 1 }
  | { e: "boom"; x: number; y: number; big: 0 | 1 }
  | { e: "shieldHit"; id: string };

// ─── The local player's private state ─────────────────────────────────────────

export interface SelfState {
  id: string;
  name: string;
  cls: ClassId;
  look: Appearance;
  lv: number;
  xp: number;
  xpNext: number;
  gold: number;
  statPoints: number;
  stats: Record<StatId, number>;
  derived: { maxHp: number; damage: number; armor: number; speed: number; blockChance: number };
  inv: (Item | null)[];
  equip: Record<EquipSlot, Item | null>;
  kills: number;
  talents: string[];
  talentPoints: number;
  bar: (string | null)[];
  quests: QuestLog;
  /** Quest markers over NPC heads: "!" = quest available, "?" = ready to hand in. */
  markers: Record<string, "!" | "?">;
  waypoints: string[];
  hasMount: boolean;
  /** Owned-but-unplaced furniture counts. */
  furniture: Record<string, number>;
  /** Plot id of the home you own, if any. */
  home: string | null;
  ships: HullId[];
  activeShip: HullId | null;
  shipUp: ShipUpgrades;
  /** Space points of interest you've visited (warp destinations). */
  discovered: string[];
  sailShips: SailHullId[];
  trophies: string[];
  title: string | null;
  /** Moderator powers / god mode on. */
  mod: boolean;
  god: boolean;
  activeSail: SailHullId | null;
  /** While flying: hull / shield right now. */
  ship: { hull: number; shield: number } | null;
  professions: ProfLevels;
  /** Active food/tonic buff (ms remaining when sent). */
  food: { stat: FoodStat; value: number; ms: number; name: string } | null;
}

export interface PartyMember {
  id: string;
  name: string;
  cls: ClassId;
  lv: number;
  hp: number;
  mhp: number;
  x: number;
  y: number;
  online: boolean;
}

export interface PartyView {
  leader: string;
  members: PartyMember[];
}

export interface TradeSide {
  id: string;
  name: string;
  items: Item[];
  gold: number;
  ready: boolean;
}

export interface TradeView {
  me: TradeSide;
  them: TradeSide;
}

export interface ShopView {
  id: string;
  name: string;
  greeting: string;
  npcId: string;
  stock: { idx: number; item: Item; price: number }[];
}

// ─── Client → server ──────────────────────────────────────────────────────────

export type C2S =
  | { t: "auth"; mode: "login" | "register"; user: string; pass: string }
  | { t: "create"; name: string; cls: ClassId; look: Appearance }
  | { t: "play" }
  | { t: "in"; seq: number; mx: number; my: number; f: number; sp?: 0 | 1 }
  | { t: "attack"; a: number }
  | { t: "chat"; text: string }
  | { t: "equip"; slot: number }
  | { t: "unequip"; slot: EquipSlot }
  | { t: "use"; slot: number }
  | { t: "drop"; slot: number }
  | { t: "swap"; from: number; to: number }
  | { t: "pickup"; id: string }
  | { t: "talk"; id: string }
  | { t: "buy"; shop: string; idx: number }
  | { t: "sell"; slot: number }
  | { t: "stat"; stat: StatId }
  | { t: "respawn" }
  | { t: "learn"; id: string }
  | { t: "bind"; slot: number; id: string | null }
  | { t: "cast"; id: string; a: number; x: number; y: number }
  | { t: "respec" }
  | { t: "questAccept"; id: string }
  | { t: "questAbandon"; id: string }
  | { t: "mount" }
  | { t: "travel"; id: string }
  | { t: "emote"; id: string }
  | { t: "jump" }
  | { t: "door"; id: string }
  | { t: "house"; op: "buy" | "sell" | "open"; plot: string; open?: boolean }
  | { t: "furn"; op: "place"; kind: string; x: number; y: number; rot: number }
  | { t: "furn"; op: "pickup"; id: string }
  | { t: "storage"; op: "open" | "close" | "deposit" | "withdraw"; slot: number }
  | { t: "gather"; x: number; y: number }
  | { t: "fish"; x: number; y: number }
  | { t: "reel" }
  | { t: "craft"; recipe: string; station: string }
  | { t: "hangar"; op: "buy" | "select" | "upgrade"; hull?: HullId; slot?: keyof ShipUpgrades }
  | { t: "launch" }
  | { t: "dock" }
  | { t: "warp"; dest: string }
  | { t: "boost" }
  | { t: "sail"; op: "summon" | "board" | "ashore" | "helm" | "furl" | "buy" | "select"; hull?: string; id?: string }
  | { t: "dig" }
  | { t: "mod"; op: "tp"; x: number; y: number }
  | { t: "mg"; op: "start" | "act" | "quit" | "board" | "title"; site?: string; action?: string; value?: number; game?: string }
  | { t: "party"; op: "invite" | "accept" | "decline" | "leave" | "kick"; target?: string }
  | { t: "trade"; op: "request" | "accept" | "decline" | "cancel" | "offer" | "unoffer" | "gold" | "ready"; target?: string; slot?: number; gold?: number }
  | { t: "ping"; c: number };

// ─── Server → client ──────────────────────────────────────────────────────────

export type S2C =
  | { t: "hello"; v: number; tickRate: number; snapRate: number }
  | { t: "auth"; ok: boolean; err?: string; user?: string; hasCharacter?: boolean }
  | { t: "welcome"; id: string; map: string; x: number; y: number; time: number; dayLength: number }
  | {
      t: "s";
      tk: number;
      /** Last input sequence the server applied for this client. */
      ack: number;
      /** Authoritative self position. */
      x: number;
      y: number;
      add?: NetEntity[];
      upd?: [string, Partial<NetEntity>][];
      del?: string[];
    }
  | { t: "fx"; ev: FxEvent[] }
  | { t: "self"; self: SelfState }
  | { t: "chat"; from: string; name: string; text: string; kind: "say" | "system" | "npc" }
  | { t: "shop"; shop: ShopView | null }
  | { t: "toast"; text: string; kind?: "info" | "good" | "bad" }
  | { t: "time"; time: number }
  | { t: "pong"; c: number; s: number }
  | { t: "cd"; id: string; ms: number }
  | { t: "questOffer"; npc: string; id: string }
  | { t: "questDone"; id: string }
  | { t: "party"; party: PartyView | null }
  | { t: "partyInvite"; from: string; name: string }
  | { t: "tradeRequest"; from: string; name: string }
  | { t: "trade"; trade: TradeView | null }
  | { t: "houses"; list: HouseInfo[] }
  | { t: "storage"; items: (Item | null)[] | null }
  | { t: "gather"; state: "start" | "done" | "cancel"; x: number; y: number; ms?: number; item?: string }
  | { t: "fish"; state: "cast" | "bite" | "caught" | "escaped" | "cancel"; x: number; y: number; item?: string }
  | { t: "depleted"; keys: string[] }
  | { t: "hangar"; npc: string }
  | { t: "harbour"; npc: string }
  | { t: "mg"; s: MgView | null }
  | { t: "board"; game: string; rows: { name: string; score: number }[] }
  | { t: "warp"; state: "charge" | "cancel" | "done"; dest: string; ms?: number; x?: number; y?: number };

export type S2CType = S2C["t"];
