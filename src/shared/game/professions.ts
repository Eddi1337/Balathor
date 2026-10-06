// Gathering & crafting professions. Gathering works on the world's own props (trees, rocks,
// flowers, bushes, fields) and on water (fishing); crafting happens at campfires and the forge.

import type { Biome } from "../world/overworld";
import { Tile } from "../world/tiles";

export type ProfId = "woodcutting" | "mining" | "herbalism" | "fishing" | "cooking" | "smithing";
export const PROF_IDS: ProfId[] = ["woodcutting", "mining", "herbalism", "fishing", "cooking", "smithing"];

export const PROFESSIONS: Record<ProfId, { name: string; icon: string; tool?: string; verb: string }> = {
  woodcutting: { name: "Woodcutting", icon: "🪓", tool: "tool_hatchet", verb: "Chop" },
  mining: { name: "Mining", icon: "⛏️", tool: "tool_pickaxe", verb: "Mine" },
  herbalism: { name: "Herbalism", icon: "🌿", tool: "tool_sickle", verb: "Gather" },
  fishing: { name: "Fishing", icon: "🎣", tool: "tool_rod", verb: "Fish" },
  cooking: { name: "Cooking", icon: "🍳", verb: "Cook" },
  smithing: { name: "Smithing", icon: "🔨", verb: "Forge" }
};

export const PROF_MAX_LEVEL = 30;
export function profXpToNext(lv: number): number {
  return 40 + lv * 25;
}

export type ProfLevels = Record<ProfId, { lv: number; xp: number }>;
export function freshProfessions(): ProfLevels {
  return Object.fromEntries(PROF_IDS.map((p) => [p, { lv: 1, xp: 0 }])) as ProfLevels;
}

export const GATHER_MS = 2400;
export const NODE_RESPAWN_MS = 60_000;
export const GATHER_RANGE = 2.2;

export interface GatherNode {
  prof: ProfId;
  item: string;
  level: number;
  xp: number;
  name: string;
}

/** What (if anything) can be gathered from a tile. */
export function gatherNode(tile: number, biome: Biome): GatherNode | null {
  switch (tile) {
    case Tile.TREE:
      return { prof: "woodcutting", item: "log_oak", level: 1, xp: 12, name: "Oak" };
    case Tile.PINE:
      return { prof: "woodcutting", item: "log_pine", level: 5, xp: 18, name: "Pine" };
    case Tile.WILLOW:
      return { prof: "woodcutting", item: "log_willow", level: 10, xp: 26, name: "Willow" };
    case Tile.PALM:
      return { prof: "woodcutting", item: "log_palm", level: 12, xp: 30, name: "Palm" };
    case Tile.SNOW_PINE:
      return { prof: "woodcutting", item: "log_frost", level: 18, xp: 40, name: "Frost Pine" };
    case Tile.DEAD_TREE:
      return { prof: "woodcutting", item: "log_ash", level: 22, xp: 48, name: "Ashwood" };
    case Tile.ROCK: {
      if (biome === "frost") return { prof: "mining", item: "ore_silver", level: 16, xp: 38, name: "Silver vein" };
      if (biome === "ember") return { prof: "mining", item: "ore_obsidian", level: 20, xp: 46, name: "Obsidian" };
      if (biome === "desert") return { prof: "mining", item: "ore_gold", level: 12, xp: 30, name: "Gold vein" };
      if (biome === "highlands" || biome === "swamp") return { prof: "mining", item: "ore_iron", level: 8, xp: 22, name: "Iron vein" };
      return { prof: "mining", item: "ore_copper", level: 1, xp: 12, name: "Copper vein" };
    }
    case Tile.CRYSTAL:
      return biome === "ember"
        ? { prof: "mining", item: "crystal_ember", level: 22, xp: 50, name: "Ember crystal" }
        : { prof: "mining", item: "crystal_frost", level: 18, xp: 42, name: "Frost crystal" };
    case Tile.FLOWERS:
      return { prof: "herbalism", item: "herb_sunpetal", level: 1, xp: 10, name: "Sunpetal" };
    case Tile.FIELD:
      return { prof: "herbalism", item: "herb_grain", level: 1, xp: 8, name: "Grain" };
    case Tile.BUSH:
      return biome === "swamp"
        ? { prof: "herbalism", item: "herb_bogmoss", level: 8, xp: 22, name: "Bogmoss" }
        : { prof: "herbalism", item: "herb_berries", level: 3, xp: 14, name: "Berry bush" };
    case Tile.CACTUS:
      return { prof: "herbalism", item: "herb_cactus", level: 12, xp: 30, name: "Cactus fruit" };
    default:
      return null;
  }
}

// ── fishing ─────────────────────────────────────────────────────────────────

export interface FishEntry {
  item: string;
  level: number;
  weight: number;
  xp: number;
}

export function fishTable(biome: Biome, river: boolean): FishEntry[] {
  const base: FishEntry[] = [
    { item: "fish_minnow", level: 1, weight: 10, xp: 10 },
    { item: "junk_boot", level: 1, weight: 1, xp: 2 }
  ];
  if (river) base.push({ item: "fish_trout", level: 5, weight: 8, xp: 20 }, { item: "fish_salmon", level: 14, weight: 4, xp: 34 });
  if (biome === "beach" || biome === "ocean") base.push({ item: "fish_snapper", level: 8, weight: 7, xp: 24 }, { item: "fish_tuna", level: 16, weight: 3, xp: 40 });
  if (biome === "swamp") base.push({ item: "fish_catfish", level: 6, weight: 8, xp: 22 }, { item: "fish_eel", level: 12, weight: 4, xp: 32 });
  if (biome === "frost") base.push({ item: "fish_frostfin", level: 16, weight: 6, xp: 42 });
  if (biome === "desert") base.push({ item: "fish_goldcarp", level: 14, weight: 5, xp: 38 });
  if (biome === "meadow" || biome === "forest" || biome === "highlands") base.push({ item: "fish_pike", level: 10, weight: 5, xp: 28 });
  base.push({ item: "junk_bottle", level: 5, weight: 0.6, xp: 15 });
  return base;
}

export const FISH_BITE_MIN_MS = 2200;
export const FISH_BITE_MAX_MS = 6500;
export const FISH_WINDOW_MS = 1300;
export const FISH_RANGE = 4;

// ── crafting ────────────────────────────────────────────────────────────────

export type StationKind = "campfire" | "forge";

export interface Recipe {
  id: string;
  station: StationKind;
  prof: ProfId;
  level: number;
  inputs: { tpl: string; qty: number }[];
  /** Output item, or a class-appropriate weapon ("weapon" island gear, "scifi_weapon" plasma gear). */
  output: { tpl: string; qty: number } | "weapon" | "scifi_weapon";
  xp: number;
}

export const RECIPES: Recipe[] = [
  // Cooking
  { id: "cook_minnow", station: "campfire", prof: "cooking", level: 1, inputs: [{ tpl: "fish_minnow", qty: 1 }], output: { tpl: "food_grilled_minnow", qty: 1 }, xp: 10 },
  { id: "cook_bread", station: "campfire", prof: "cooking", level: 2, inputs: [{ tpl: "herb_grain", qty: 3 }], output: { tpl: "food_bread", qty: 1 }, xp: 12 },
  { id: "cook_pie", station: "campfire", prof: "cooking", level: 4, inputs: [{ tpl: "herb_berries", qty: 3 }, { tpl: "herb_grain", qty: 1 }], output: { tpl: "food_berry_pie", qty: 1 }, xp: 18 },
  { id: "cook_trout", station: "campfire", prof: "cooking", level: 6, inputs: [{ tpl: "fish_trout", qty: 1 }, { tpl: "herb_sunpetal", qty: 1 }], output: { tpl: "food_trout_supper", qty: 1 }, xp: 24 },
  { id: "cook_stew", station: "campfire", prof: "cooking", level: 9, inputs: [{ tpl: "fish_catfish", qty: 1 }, { tpl: "herb_bogmoss", qty: 2 }], output: { tpl: "food_bog_stew", qty: 1 }, xp: 30 },
  { id: "cook_snapper", station: "campfire", prof: "cooking", level: 11, inputs: [{ tpl: "fish_snapper", qty: 1 }, { tpl: "herb_sunpetal", qty: 2 }], output: { tpl: "food_seaside_platter", qty: 1 }, xp: 34 },
  { id: "cook_feast", station: "campfire", prof: "cooking", level: 15, inputs: [{ tpl: "fish_goldcarp", qty: 1 }, { tpl: "herb_cactus", qty: 2 }], output: { tpl: "food_golden_feast", qty: 1 }, xp: 46 },
  { id: "cook_sashimi", station: "campfire", prof: "cooking", level: 18, inputs: [{ tpl: "fish_frostfin", qty: 1 }], output: { tpl: "food_frostfin_sashimi", qty: 1 }, xp: 52 },
  // Smithing
  { id: "smelt_copper", station: "forge", prof: "smithing", level: 1, inputs: [{ tpl: "ore_copper", qty: 2 }, { tpl: "log_oak", qty: 1 }], output: { tpl: "bar_copper", qty: 1 }, xp: 14 },
  { id: "smelt_iron", station: "forge", prof: "smithing", level: 7, inputs: [{ tpl: "ore_iron", qty: 2 }, { tpl: "log_pine", qty: 1 }], output: { tpl: "bar_iron", qty: 1 }, xp: 24 },
  { id: "smelt_gold", station: "forge", prof: "smithing", level: 11, inputs: [{ tpl: "ore_gold", qty: 2 }, { tpl: "log_pine", qty: 1 }], output: { tpl: "bar_gold", qty: 1 }, xp: 30 },
  { id: "smelt_silver", station: "forge", prof: "smithing", level: 15, inputs: [{ tpl: "ore_silver", qty: 2 }, { tpl: "log_willow", qty: 1 }], output: { tpl: "bar_silver", qty: 1 }, xp: 38 },
  { id: "whetstone", station: "forge", prof: "smithing", level: 3, inputs: [{ tpl: "bar_copper", qty: 1 }], output: { tpl: "food_whetstone", qty: 2 }, xp: 18 },
  { id: "ring_copper", station: "forge", prof: "smithing", level: 4, inputs: [{ tpl: "bar_copper", qty: 2 }], output: { tpl: "ring_copper", qty: 1 }, xp: 22 },
  { id: "ring_gold", station: "forge", prof: "smithing", level: 12, inputs: [{ tpl: "bar_gold", qty: 2 }, { tpl: "shiny_pebble", qty: 1 }], output: { tpl: "ring_moon", qty: 1 }, xp: 40 },
  { id: "ring_ember", station: "forge", prof: "smithing", level: 20, inputs: [{ tpl: "bar_silver", qty: 2 }, { tpl: "crystal_ember", qty: 1 }], output: { tpl: "ring_ember", qty: 1 }, xp: 60 },
  { id: "fab_repair", station: "forge", prof: "smithing", level: 5, inputs: [{ tpl: "salvage_scrap", qty: 3 }], output: { tpl: "repair_kit", qty: 2 }, xp: 20 },
  { id: "smelt_titanium", station: "forge", prof: "smithing", level: 13, inputs: [{ tpl: "ore_titanium", qty: 2 }, { tpl: "ore_ferrite", qty: 1 }], output: { tpl: "bar_titanium", qty: 1 }, xp: 36 },
  { id: "smelt_iridium", station: "forge", prof: "smithing", level: 19, inputs: [{ tpl: "ore_iridium", qty: 2 }, { tpl: "salvage_scrap", qty: 1 }], output: { tpl: "bar_iridium", qty: 1 }, xp: 46 },
  { id: "ring_quantum", station: "forge", prof: "smithing", level: 17, inputs: [{ tpl: "bar_titanium", qty: 2 }, { tpl: "crystal_void", qty: 1 }], output: { tpl: "ring_quantum", qty: 1 }, xp: 55 },
  { id: "plasma_weapon", station: "forge", prof: "smithing", level: 24, inputs: [{ tpl: "bar_iridium", qty: 3 }, { tpl: "salvage_core", qty: 2 }], output: "scifi_weapon", xp: 110 },
  { id: "cook_jelly", station: "campfire", prof: "cooking", level: 6, inputs: [{ tpl: "jelly_glow", qty: 2 }, { tpl: "herb_grain", qty: 1 }], output: { tpl: "food_jelly_tart", qty: 1 }, xp: 26 },
  { id: "forged_weapon", station: "forge", prof: "smithing", level: 9, inputs: [{ tpl: "bar_iron", qty: 3 }, { tpl: "log_willow", qty: 1 }], output: "weapon", xp: 50 },
  { id: "masterwork_weapon", station: "forge", prof: "smithing", level: 22, inputs: [{ tpl: "bar_silver", qty: 3 }, { tpl: "ore_obsidian", qty: 2 }, { tpl: "crystal_frost", qty: 1 }], output: "weapon", xp: 90 }
];

export const RECIPES_BY_ID: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

export interface Station {
  id: string;
  kind: StationKind;
  name: string;
  x: number;
  y: number;
  /** Map it stands on (default: the overworld). */
  map?: string;
}

export const STATION_RANGE = 2.8;

/** Food & tonic buffs (from cooking and smithing). */
export type FoodStat = "str" | "def" | "spd" | "regen";
export const FOOD_STAT_INFO: Record<FoodStat, string> = {
  str: "damage",
  def: "armour",
  spd: "speed",
  regen: "regen"
};
