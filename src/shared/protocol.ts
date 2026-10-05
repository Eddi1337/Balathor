// The one and only definition of the wire protocol. Both sides import these types, so a
// change here is a compile error anywhere it is mishandled.
//
// Transport: JSON text frames over a WebSocket at /ws.
// Replication: the server keeps, per client, the last state it sent for every entity in that
// client's area of interest and sends only additions, changed fields and removals.

import type { ClassId } from "./game/classes";
import type { EquipSlot, Item } from "./game/items";
import type { StatId } from "./game/stats";

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

export type NetEntity = NetPlayer | NetMob | NetNpc | NetLoot;

// ─── Combat / world effects ───────────────────────────────────────────────────

export type ProjectileKind = "arrow" | "fireball" | "frostbolt" | "emberball";

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
  | { e: "say"; id: string; text: string };

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
  | { t: "in"; seq: number; mx: number; my: number; f: number }
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
  | { t: "pong"; c: number; s: number };

export type S2CType = S2C["t"];
