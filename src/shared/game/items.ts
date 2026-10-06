// Item templates, rarity and rolling. Items are small plain objects so they persist as JSON.

import type { ClassId } from "./classes";
import { FURNITURE } from "./furniture";

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

export type ItemKind = "weapon" | "armor" | "ring" | "potion" | "junk" | "mount" | "furniture" | "tool" | "material" | "food";

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
  /** Food / tonic buff: stat, value (fraction or flat armour), duration. */
  buff?: { stat: "str" | "def" | "spd" | "regen"; value: number; ms: number };
  /** Gear that only drops / sells in the sci-fi realm. */
  realm?: "scifi";
  /** Repair kits: restore this fraction of your ship's hull. */
  repair?: number;
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
  // Sci-fi gear (Quartermaster Ix, pirates, tech labs)
  bow_plasma: { id: "bow_plasma", name: "Plasma Bow", kind: "weapon", cls: "ranger", icon: "🏹", dmg: 10, value: 90, realm: "scifi" },
  staff_ion: { id: "staff_ion", name: "Ion Staff", kind: "weapon", cls: "mage", icon: "🔮", dmg: 12, value: 95, realm: "scifi" },
  blade_arc: { id: "blade_arc", name: "Arc Blade", kind: "weapon", cls: "knight", icon: "🗡️", dmg: 11, value: 92, realm: "scifi" },
  bow_photon: { id: "bow_photon", name: "Photon Longbow", kind: "weapon", cls: "ranger", icon: "🏹", dmg: 15, value: 180, realm: "scifi" },
  staff_nebula: { id: "staff_nebula", name: "Nebula Scepter", kind: "weapon", cls: "mage", icon: "🔮", dmg: 17, value: 190, realm: "scifi" },
  blade_star: { id: "blade_star", name: "Starforged Greatsword", kind: "weapon", cls: "knight", icon: "⚔️", dmg: 16, value: 185, realm: "scifi" },
  suit_flight: { id: "suit_flight", name: "Flight Suit", kind: "armor", icon: "🧑‍🚀", armor: 5, hp: 18, value: 80, realm: "scifi" },
  suit_nano: { id: "suit_nano", name: "Nano Plate", kind: "armor", icon: "🦾", armor: 10, hp: 22, value: 170, realm: "scifi" },
  ring_quantum: { id: "ring_quantum", name: "Quantum Band", kind: "ring", icon: "💫", str: 2, hp: 14, value: 120, realm: "scifi" },
  // Rings
  ring_copper: { id: "ring_copper", name: "Copper Ring", kind: "ring", icon: "💍", str: 1, value: 20 },
  ring_moon: { id: "ring_moon", name: "Moonstone Ring", kind: "ring", icon: "💍", hp: 12, value: 36 },
  ring_ember: { id: "ring_ember", name: "Ember Band", kind: "ring", icon: "💍", str: 2, armor: 1, value: 50 },
  // Consumables
  potion_small: { id: "potion_small", name: "Berry Tonic", kind: "potion", icon: "🧃", heal: 45, value: 8, stack: 20 },
  potion_big: { id: "potion_big", name: "Honey Elixir", kind: "potion", icon: "🍯", heal: 120, value: 24, stack: 20 },
  repair_kit: { id: "repair_kit", name: "Hull Repair Kit", kind: "potion", icon: "🔧", repair: 0.4, value: 20, stack: 20 },
  // Mounts (unlock on purchase; never enter the bag)
  mount_pony: { id: "mount_pony", name: "Fluffy Pony", kind: "mount", icon: "🐴", value: 100 },
  // Tools (needed to gather)
  tool_hatchet: { id: "tool_hatchet", name: "Trusty Hatchet", kind: "tool", icon: "🪓", value: 20 },
  tool_pickaxe: { id: "tool_pickaxe", name: "Sturdy Pickaxe", kind: "tool", icon: "⛏️", value: 20 },
  tool_sickle: { id: "tool_sickle", name: "Little Sickle", kind: "tool", icon: "🌾", value: 20 },
  tool_rod: { id: "tool_rod", name: "Bamboo Fishing Rod", kind: "tool", icon: "🎣", value: 20 },
  // Gathered materials
  log_oak: { id: "log_oak", name: "Oak Log", kind: "material", icon: "🪵", value: 3, stack: 50 },
  log_pine: { id: "log_pine", name: "Pine Log", kind: "material", icon: "🪵", value: 5, stack: 50 },
  log_willow: { id: "log_willow", name: "Willow Log", kind: "material", icon: "🪵", value: 8, stack: 50 },
  log_palm: { id: "log_palm", name: "Palm Log", kind: "material", icon: "🪵", value: 9, stack: 50 },
  log_frost: { id: "log_frost", name: "Frost Pine Log", kind: "material", icon: "🪵", value: 14, stack: 50 },
  log_ash: { id: "log_ash", name: "Ashwood Log", kind: "material", icon: "🪵", value: 18, stack: 50 },
  ore_copper: { id: "ore_copper", name: "Copper Ore", kind: "material", icon: "🟤", value: 4, stack: 50 },
  ore_iron: { id: "ore_iron", name: "Iron Ore", kind: "material", icon: "⚫", value: 7, stack: 50 },
  ore_gold: { id: "ore_gold", name: "Gold Ore", kind: "material", icon: "🟡", value: 12, stack: 50 },
  ore_silver: { id: "ore_silver", name: "Silver Ore", kind: "material", icon: "⚪", value: 15, stack: 50 },
  ore_obsidian: { id: "ore_obsidian", name: "Obsidian Shard", kind: "material", icon: "🖤", value: 20, stack: 50 },
  crystal_frost: { id: "crystal_frost", name: "Frost Crystal", kind: "material", icon: "💠", value: 22, stack: 50 },
  crystal_ember: { id: "crystal_ember", name: "Ember Crystal", kind: "material", icon: "🔶", value: 26, stack: 50 },
  bar_copper: { id: "bar_copper", name: "Copper Bar", kind: "material", icon: "🧱", value: 12, stack: 50 },
  bar_iron: { id: "bar_iron", name: "Iron Bar", kind: "material", icon: "🧱", value: 20, stack: 50 },
  bar_gold: { id: "bar_gold", name: "Gold Bar", kind: "material", icon: "🧱", value: 32, stack: 50 },
  bar_silver: { id: "bar_silver", name: "Silver Bar", kind: "material", icon: "🧱", value: 40, stack: 50 },
  herb_sunpetal: { id: "herb_sunpetal", name: "Sunpetal", kind: "material", icon: "🌼", value: 3, stack: 50 },
  herb_grain: { id: "herb_grain", name: "Golden Grain", kind: "material", icon: "🌾", value: 2, stack: 50 },
  herb_berries: { id: "herb_berries", name: "Wild Berries", kind: "material", icon: "🫐", value: 4, stack: 50 },
  herb_bogmoss: { id: "herb_bogmoss", name: "Bogmoss", kind: "material", icon: "🍀", value: 8, stack: 50 },
  herb_cactus: { id: "herb_cactus", name: "Cactus Fruit", kind: "material", icon: "🌵", value: 11, stack: 50 },
  fish_minnow: { id: "fish_minnow", name: "Minnow", kind: "material", icon: "🐟", value: 3, stack: 30 },
  fish_trout: { id: "fish_trout", name: "River Trout", kind: "material", icon: "🐟", value: 8, stack: 30 },
  fish_salmon: { id: "fish_salmon", name: "Silver Salmon", kind: "material", icon: "🐟", value: 16, stack: 30 },
  fish_pike: { id: "fish_pike", name: "Lake Pike", kind: "material", icon: "🐟", value: 12, stack: 30 },
  fish_catfish: { id: "fish_catfish", name: "Whiskery Catfish", kind: "material", icon: "🐟", value: 10, stack: 30 },
  fish_eel: { id: "fish_eel", name: "Bog Eel", kind: "material", icon: "🐍", value: 14, stack: 30 },
  fish_snapper: { id: "fish_snapper", name: "Red Snapper", kind: "material", icon: "🐠", value: 12, stack: 30 },
  fish_tuna: { id: "fish_tuna", name: "Bluefin Tuna", kind: "material", icon: "🐟", value: 22, stack: 30 },
  fish_frostfin: { id: "fish_frostfin", name: "Frostfin", kind: "material", icon: "🐡", value: 24, stack: 30 },
  fish_goldcarp: { id: "fish_goldcarp", name: "Golden Carp", kind: "material", icon: "🐠", value: 26, stack: 30 },
  // Space materials
  ore_ferrite: { id: "ore_ferrite", name: "Ferrite Ore", kind: "material", icon: "🪨", value: 6, stack: 50 },
  ore_titanium: { id: "ore_titanium", name: "Titanium Ore", kind: "material", icon: "🩶", value: 14, stack: 50 },
  ore_iridium: { id: "ore_iridium", name: "Iridium Ore", kind: "material", icon: "🔷", value: 24, stack: 50 },
  crystal_void: { id: "crystal_void", name: "Void Crystal", kind: "material", icon: "🔮", value: 40, stack: 50 },
  crystal_bloom: { id: "crystal_bloom", name: "Bloomstone", kind: "material", icon: "💚", value: 18, stack: 50 },
  log_glowwood: { id: "log_glowwood", name: "Glowwood Log", kind: "material", icon: "🪵", value: 12, stack: 50 },
  herb_starmoss: { id: "herb_starmoss", name: "Starmoss", kind: "material", icon: "🌱", value: 10, stack: 50 },
  bar_titanium: { id: "bar_titanium", name: "Titanium Bar", kind: "material", icon: "🧱", value: 40, stack: 50 },
  bar_iridium: { id: "bar_iridium", name: "Iridium Bar", kind: "material", icon: "🧱", value: 64, stack: 50 },
  salvage_scrap: { id: "salvage_scrap", name: "Salvage Scrap", kind: "material", icon: "🔩", value: 7, stack: 50 },
  salvage_core: { id: "salvage_core", name: "Salvaged Power Core", kind: "material", icon: "🔋", value: 35, stack: 20 },
  jelly_glow: { id: "jelly_glow", name: "Glowing Jelly", kind: "material", icon: "🫧", value: 6, stack: 50 },
  // Station café
  food_star_latte: { id: "food_star_latte", name: "Star Latte", kind: "food", icon: "☕", heal: 40, value: 12, stack: 20, buff: { stat: "spd", value: 0.1, ms: 240_000 } },
  food_nebula_noodles: { id: "food_nebula_noodles", name: "Nebula Noodles", kind: "food", icon: "🍜", heal: 120, value: 24, stack: 20, buff: { stat: "str", value: 0.12, ms: 240_000 } },
  food_jelly_tart: { id: "food_jelly_tart", name: "Jelly Tart", kind: "food", icon: "🥧", heal: 160, value: 30, stack: 20, buff: { stat: "regen", value: 0.02, ms: 240_000 } },
  fish_glowfin: { id: "fish_glowfin", name: "Glowfin", kind: "material", icon: "🐠", value: 18, stack: 30 },
  food_glowfin_bowl: { id: "food_glowfin_bowl", name: "Glowfin Poke Bowl", kind: "food", icon: "🥗", heal: 170, value: 34, stack: 20, buff: { stat: "def", value: 8, ms: 240_000 } },
  junk_boot: { id: "junk_boot", name: "Soggy Boot", kind: "junk", icon: "🥾", value: 1, stack: 20 },
  junk_bottle: { id: "junk_bottle", name: "Message in a Bottle", kind: "junk", icon: "🍾", value: 40, stack: 20 },
  // Cooked food & smithing tonics (heal + timed buff)
  food_grilled_minnow: { id: "food_grilled_minnow", name: "Grilled Minnow", kind: "food", icon: "🍢", heal: 40, value: 8, stack: 20 },
  food_bread: { id: "food_bread", name: "Crusty Bread", kind: "food", icon: "🍞", heal: 50, value: 9, stack: 20, buff: { stat: "regen", value: 0.01, ms: 120_000 } },
  food_berry_pie: { id: "food_berry_pie", name: "Berry Pie", kind: "food", icon: "🥧", heal: 90, value: 16, stack: 20, buff: { stat: "regen", value: 0.015, ms: 180_000 } },
  food_trout_supper: { id: "food_trout_supper", name: "Trout Supper", kind: "food", icon: "🍱", heal: 110, value: 22, stack: 20, buff: { stat: "str", value: 0.1, ms: 180_000 } },
  food_bog_stew: { id: "food_bog_stew", name: "Hearty Bog Stew", kind: "food", icon: "🍲", heal: 130, value: 26, stack: 20, buff: { stat: "def", value: 6, ms: 180_000 } },
  food_seaside_platter: { id: "food_seaside_platter", name: "Seaside Platter", kind: "food", icon: "🍤", heal: 150, value: 30, stack: 20, buff: { stat: "spd", value: 0.1, ms: 180_000 } },
  food_golden_feast: { id: "food_golden_feast", name: "Golden Feast", kind: "food", icon: "🍛", heal: 220, value: 48, stack: 20, buff: { stat: "spd", value: 0.15, ms: 240_000 } },
  food_frostfin_sashimi: { id: "food_frostfin_sashimi", name: "Frostfin Sashimi", kind: "food", icon: "🍣", heal: 200, value: 50, stack: 20, buff: { stat: "str", value: 0.18, ms: 240_000 } },
  food_whetstone: { id: "food_whetstone", name: "Whetstone Tonic", kind: "food", icon: "🧪", heal: 0, value: 14, stack: 20, buff: { stat: "str", value: 0.08, ms: 180_000 } },
  // Junk (sold to vendors)
  slime_gel: { id: "slime_gel", name: "Slime Gel", kind: "junk", icon: "🟢", value: 3, stack: 50 },
  fluffy_tail: { id: "fluffy_tail", name: "Fluffy Tail", kind: "junk", icon: "🦊", value: 5, stack: 50 },
  shiny_pebble: { id: "shiny_pebble", name: "Shiny Pebble", kind: "junk", icon: "💎", value: 9, stack: 50 }
};

// Furniture is sold like an item ("furn_<id>") but goes to your home's furniture stock.
for (const f of Object.values(FURNITURE)) {
  ITEM_TEMPLATES[`furn_${f.id}`] = { id: `furn_${f.id}`, name: f.name, kind: "furniture", icon: f.icon, value: Math.round(f.price / 2) };
}

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
