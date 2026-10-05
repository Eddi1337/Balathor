// Item templates, rarity and rolling. Items are small plain objects so they persist as JSON.

import type { ClassId } from "./classes";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";
export const RARITIES: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

export const RARITY_INFO: Record<Rarity, { color: string; mult: number; weight: number }> = {
  common: { color: "#c9c3b8", mult: 1, weight: 600 },
  uncommon: { color: "#6fd36a", mult: 1.25, weight: 260 },
  rare: { color: "#4fa3ff", mult: 1.55, weight: 100 },
  epic: { color: "#b26bff", mult: 1.95, weight: 32 },
  legendary: { color: "#ffb02e", mult: 2.5, weight: 7 },
  mythic: { color: "#ff5c8a", mult: 3.2, weight: 1 }
};

export type EquipSlot = "weapon" | "body" | "ring1" | "ring2";
export const EQUIP_SLOTS: EquipSlot[] = ["weapon", "body", "ring1", "ring2"];

export type ItemKind = "weapon" | "armor" | "ring" | "potion" | "junk";

export interface ItemTemplate {
  id: string;
  name: string;
  kind: ItemKind;
  /** Weapons are class-locked. */
  cls?: ClassId;
  icon: string;
  /** Base stats at item level 1 (scaled by level and rarity when rolled). */
  dmg?: number;
  armor?: number;
  hp?: number;
  str?: number;
  heal?: number;
  value: number;
  stack?: number;
}

export interface Item {
  /** Unique instance id. */
  uid: string;
  tpl: string;
  rarity: Rarity;
  lvl: number;
  qty: number;
  dmg?: number;
  armor?: number;
  hp?: number;
  str?: number;
}

export const ITEM_TEMPLATES: Record<string, ItemTemplate> = {
  // Weapons
  bow_twig: { id: "bow_twig", name: "Twig Bow", kind: "weapon", cls: "ranger", icon: "🏹", dmg: 3, value: 12 },
  bow_elm: { id: "bow_elm", name: "Elmwood Longbow", kind: "weapon", cls: "ranger", icon: "🏹", dmg: 6, value: 40 },
  staff_oak: { id: "staff_oak", name: "Oak Staff", kind: "weapon", cls: "mage", icon: "🪄", dmg: 4, value: 12 },
  staff_star: { id: "staff_star", name: "Starglass Staff", kind: "weapon", cls: "mage", icon: "🪄", dmg: 8, value: 44 },
  sword_tin: { id: "sword_tin", name: "Tin Sword", kind: "weapon", cls: "knight", icon: "🗡️", dmg: 3, value: 12 },
  sword_steel: { id: "sword_steel", name: "Steel Blade", kind: "weapon", cls: "knight", icon: "⚔️", dmg: 7, value: 42 },
  // Armour
  tunic: { id: "tunic", name: "Wanderer's Tunic", kind: "armor", icon: "👕", armor: 2, hp: 6, value: 10 },
  leather: { id: "leather", name: "Leather Jerkin", kind: "armor", icon: "🦺", armor: 4, hp: 10, value: 30 },
  robe: { id: "robe", name: "Moonthread Robe", kind: "armor", icon: "🥋", armor: 2, hp: 14, str: 1, value: 34 },
  plate: { id: "plate", name: "Knightly Plate", kind: "armor", icon: "🛡️", armor: 7, hp: 8, value: 48 },
  // Rings
  ring_copper: { id: "ring_copper", name: "Copper Ring", kind: "ring", icon: "💍", str: 1, value: 20 },
  ring_moon: { id: "ring_moon", name: "Moonstone Ring", kind: "ring", icon: "💍", hp: 12, value: 36 },
  ring_ember: { id: "ring_ember", name: "Ember Band", kind: "ring", icon: "💍", str: 2, armor: 1, value: 50 },
  // Consumables
  potion_small: { id: "potion_small", name: "Berry Tonic", kind: "potion", icon: "🧃", heal: 45, value: 8, stack: 20 },
  potion_big: { id: "potion_big", name: "Honey Elixir", kind: "potion", icon: "🍯", heal: 120, value: 24, stack: 20 },
  // Junk (sold to vendors)
  slime_gel: { id: "slime_gel", name: "Slime Gel", kind: "junk", icon: "🟢", value: 3, stack: 50 },
  fluffy_tail: { id: "fluffy_tail", name: "Fluffy Tail", kind: "junk", icon: "🦊", value: 5, stack: 50 },
  shiny_pebble: { id: "shiny_pebble", name: "Shiny Pebble", kind: "junk", icon: "💎", value: 9, stack: 50 }
};

export function itemTemplate(id: string): ItemTemplate | undefined {
  return ITEM_TEMPLATES[id];
}

export function itemName(item: Item): string {
  const tpl = itemTemplate(item.tpl);
  return tpl ? tpl.name : item.tpl;
}

export function itemValue(item: Item): number {
  const tpl = itemTemplate(item.tpl);
  if (!tpl) return 1;
  return Math.max(1, Math.round(tpl.value * RARITY_INFO[item.rarity].mult * (1 + (item.lvl - 1) * 0.15)));
}

export function slotForItem(item: Item): EquipSlot | null {
  const tpl = itemTemplate(item.tpl);
  if (!tpl) return null;
  if (tpl.kind === "weapon") return "weapon";
  if (tpl.kind === "armor") return "body";
  if (tpl.kind === "ring") return "ring1";
  return null;
}

let uidCounter = 0;
export function newItemUid(): string {
  uidCounter = (uidCounter + 1) % 1_000_000;
  return `${Date.now().toString(36)}${uidCounter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

/** Create an item instance with stats scaled by level and rarity. */
export function makeItem(tplId: string, rarity: Rarity = "common", lvl = 1, qty = 1): Item {
  const tpl = itemTemplate(tplId);
  const item: Item = { uid: newItemUid(), tpl: tplId, rarity, lvl, qty };
  if (!tpl) return item;
  const scale = RARITY_INFO[rarity].mult * (1 + (lvl - 1) * 0.12);
  if (tpl.dmg) item.dmg = Math.round(tpl.dmg * scale);
  if (tpl.armor) item.armor = Math.round(tpl.armor * scale);
  if (tpl.hp) item.hp = Math.round(tpl.hp * scale);
  if (tpl.str) item.str = Math.max(1, Math.round(tpl.str * scale));
  return item;
}

export function rollRarity(rand: () => number, luck = 0): Rarity {
  let total = 0;
  for (const r of RARITIES) total += RARITY_INFO[r].weight * (r === "common" ? 1 : 1 + luck);
  let roll = rand() * total;
  for (const r of RARITIES) {
    roll -= RARITY_INFO[r].weight * (r === "common" ? 1 : 1 + luck);
    if (roll <= 0) return r;
  }
  return "common";
}

export function starterKit(cls: ClassId): { weapon: Item; body: Item; potions: Item } {
  const weapon = cls === "ranger" ? "bow_twig" : cls === "mage" ? "staff_oak" : "sword_tin";
  return {
    weapon: makeItem(weapon),
    body: makeItem("tunic"),
    potions: makeItem("potion_small", "common", 1, 3)
  };
}

export const INVENTORY_SIZE = 20;
