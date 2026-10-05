// Monster templates per biome. `model` picks the low-poly body on the client; stats scale with
// the zone level at the spawn point.

import type { Biome } from "../world/overworld";

export type MobModel = "slime" | "bunny" | "boar" | "wolf" | "toad" | "scorpion" | "wisp" | "imp" | "golem" | "yeti" | "mushroom";

export interface MobTemplate {
  id: string;
  name: string;
  model: MobModel;
  color: string;
  accent: string;
  scale: number;
  /** Stats at level 1; scaled per level. */
  hp: number;
  dmg: number;
  speed: number;
  aggro: number;
  reach: number;
  cooldownMs: number;
  /** Ranged mobs throw a projectile instead of a bite. */
  ranged?: { speed: number; range: number };
  passive?: boolean;
  xp: number;
  gold: [number, number];
  drops: { tpl: string; chance: number }[];
  boss?: boolean;
}

const t = (m: MobTemplate) => m;

export const MOB_TEMPLATES: Record<string, MobTemplate> = {
  slime: t({ id: "slime", name: "Puddle Slime", model: "slime", color: "#7fd66b", accent: "#d9ffc9", scale: 0.8, hp: 26, dmg: 4, speed: 2.2, aggro: 6, reach: 1.1, cooldownMs: 1200, xp: 8, gold: [1, 4], drops: [{ tpl: "slime_gel", chance: 0.5 }, { tpl: "potion_small", chance: 0.08 }] }),
  bunny: t({ id: "bunny", name: "Puffbun", model: "bunny", color: "#f4efe8", accent: "#ffb3c7", scale: 0.55, hp: 10, dmg: 0, speed: 3.6, aggro: 0, reach: 0, cooldownMs: 1000, passive: true, xp: 2, gold: [0, 1], drops: [{ tpl: "fluffy_tail", chance: 0.4 }] }),
  shroom: t({ id: "shroom", name: "Grumpcap", model: "mushroom", color: "#e05d5d", accent: "#fff1e0", scale: 0.8, hp: 34, dmg: 6, speed: 1.8, aggro: 5, reach: 1.1, cooldownMs: 1300, xp: 11, gold: [2, 5], drops: [{ tpl: "potion_small", chance: 0.12 }] }),
  boar: t({ id: "boar", name: "Bristleback", model: "boar", color: "#9a6b4f", accent: "#f2d0b4", scale: 0.9, hp: 46, dmg: 8, speed: 3.2, aggro: 7, reach: 1.3, cooldownMs: 1250, xp: 15, gold: [2, 7], drops: [{ tpl: "fluffy_tail", chance: 0.3 }] }),
  wolf: t({ id: "wolf", name: "Mossfang", model: "wolf", color: "#7d8a9b", accent: "#e8edf2", scale: 0.95, hp: 40, dmg: 9, speed: 3.9, aggro: 9, reach: 1.3, cooldownMs: 1050, xp: 16, gold: [2, 8], drops: [{ tpl: "fluffy_tail", chance: 0.45 }] }),
  toad: t({ id: "toad", name: "Bog Croaker", model: "toad", color: "#5f8f4a", accent: "#e8d37a", scale: 0.95, hp: 52, dmg: 9, speed: 2.4, aggro: 6, reach: 1.4, cooldownMs: 1400, xp: 17, gold: [3, 8], drops: [{ tpl: "slime_gel", chance: 0.5 }] }),
  scorpion: t({ id: "scorpion", name: "Dune Pincher", model: "scorpion", color: "#e0a458", accent: "#5a3a1e", scale: 0.9, hp: 48, dmg: 11, speed: 3.1, aggro: 8, reach: 1.3, cooldownMs: 1150, xp: 18, gold: [3, 9], drops: [{ tpl: "shiny_pebble", chance: 0.25 }] }),
  wisp: t({ id: "wisp", name: "Frost Wisp", model: "wisp", color: "#9fe7ff", accent: "#ffffff", scale: 0.8, hp: 36, dmg: 10, speed: 2.8, aggro: 10, reach: 1.2, cooldownMs: 1600, ranged: { speed: 9, range: 8 }, xp: 18, gold: [3, 9], drops: [{ tpl: "shiny_pebble", chance: 0.3 }] }),
  yeti: t({ id: "yeti", name: "Snowpuff Yeti", model: "yeti", color: "#f3f7ff", accent: "#7fb7e6", scale: 1.3, hp: 90, dmg: 15, speed: 2.6, aggro: 7, reach: 1.7, cooldownMs: 1500, xp: 30, gold: [5, 14], drops: [{ tpl: "potion_big", chance: 0.1 }] }),
  imp: t({ id: "imp", name: "Ember Imp", model: "imp", color: "#ff7a45", accent: "#ffd166", scale: 0.8, hp: 40, dmg: 12, speed: 3.4, aggro: 10, reach: 1.2, cooldownMs: 1500, ranged: { speed: 10, range: 9 }, xp: 21, gold: [4, 11], drops: [{ tpl: "shiny_pebble", chance: 0.3 }] }),
  golem: t({ id: "golem", name: "Pebble Golem", model: "golem", color: "#9aa0a6", accent: "#7dd3c0", scale: 1.25, hp: 100, dmg: 16, speed: 2.0, aggro: 6, reach: 1.7, cooldownMs: 1700, xp: 32, gold: [6, 15], drops: [{ tpl: "shiny_pebble", chance: 0.6 }] }),
  // Bosses
  boss_meadow: t({ id: "boss_meadow", name: "King Wobble", model: "slime", color: "#ffd166", accent: "#fff7d6", scale: 2.4, hp: 420, dmg: 14, speed: 2.0, aggro: 9, reach: 2.4, cooldownMs: 1500, xp: 140, gold: [40, 80], drops: [{ tpl: "ring_copper", chance: 0.6 }, { tpl: "potion_big", chance: 0.5 }], boss: true }),
  boss_forest: t({ id: "boss_forest", name: "Old Rootback", model: "boar", color: "#5b7a3a", accent: "#c9e3a5", scale: 2.2, hp: 900, dmg: 24, speed: 2.8, aggro: 10, reach: 2.6, cooldownMs: 1600, xp: 320, gold: [80, 150], drops: [{ tpl: "bow_elm", chance: 0.4 }, { tpl: "leather", chance: 0.5 }], boss: true }),
  boss_swamp: t({ id: "boss_swamp", name: "The Bogfather", model: "toad", color: "#3f6b3a", accent: "#e8d37a", scale: 2.5, hp: 1000, dmg: 26, speed: 2.2, aggro: 9, reach: 2.8, cooldownMs: 1700, xp: 360, gold: [90, 170], drops: [{ tpl: "ring_moon", chance: 0.5 }, { tpl: "robe", chance: 0.4 }], boss: true }),
  boss_desert: t({ id: "boss_desert", name: "Glasshide", model: "scorpion", color: "#f2c45f", accent: "#7dd3fc", scale: 2.3, hp: 1050, dmg: 28, speed: 3.0, aggro: 11, reach: 2.6, cooldownMs: 1500, xp: 380, gold: [100, 180], drops: [{ tpl: "sword_steel", chance: 0.4 }, { tpl: "ring_ember", chance: 0.3 }], boss: true }),
  boss_frost: t({ id: "boss_frost", name: "Whitepine Warden", model: "yeti", color: "#e6f4ff", accent: "#5fb4ff", scale: 2.3, hp: 1250, dmg: 30, speed: 2.4, aggro: 10, reach: 2.8, cooldownMs: 1700, xp: 420, gold: [110, 200], drops: [{ tpl: "staff_star", chance: 0.4 }, { tpl: "plate", chance: 0.35 }], boss: true }),
  boss_ember: t({ id: "boss_ember", name: "Red Crag", model: "golem", color: "#b5543a", accent: "#ffb02e", scale: 2.4, hp: 1400, dmg: 34, speed: 2.1, aggro: 10, reach: 3.0, cooldownMs: 1800, xp: 460, gold: [120, 220], drops: [{ tpl: "ring_ember", chance: 0.6 }, { tpl: "plate", chance: 0.4 }], boss: true }),
  boss_highlands: t({ id: "boss_highlands", name: "Scar Warden", model: "wolf", color: "#5d6470", accent: "#ff5c8a", scale: 2.2, hp: 1150, dmg: 30, speed: 3.4, aggro: 12, reach: 2.6, cooldownMs: 1400, xp: 400, gold: [100, 200], drops: [{ tpl: "bow_elm", chance: 0.4 }, { tpl: "sword_steel", chance: 0.4 }], boss: true })
};

/** Weighted spawn tables per biome (template id → weight). */
export const BIOME_SPAWNS: Partial<Record<Biome, Record<string, number>>> = {
  meadow: { slime: 6, bunny: 4, shroom: 2 },
  forest: { wolf: 4, boar: 4, shroom: 3, bunny: 1 },
  swamp: { toad: 5, slime: 3, shroom: 2 },
  desert: { scorpion: 6, slime: 1 },
  frost: { wisp: 4, yeti: 2, wolf: 2 },
  ember: { imp: 5, golem: 2 },
  highlands: { wolf: 4, golem: 2, boar: 2 }
};

export const BIOME_BOSSES: Partial<Record<Biome, string>> = {
  meadow: "boss_meadow",
  forest: "boss_forest",
  swamp: "boss_swamp",
  desert: "boss_desert",
  frost: "boss_frost",
  ember: "boss_ember",
  highlands: "boss_highlands"
};

export function mobTemplate(id: string): MobTemplate | undefined {
  return MOB_TEMPLATES[id];
}

/** Level-scaled combat stats for a template. */
export function mobStats(tpl: MobTemplate, level: number): { hp: number; dmg: number; xp: number } {
  const l = Math.max(1, level) - 1;
  return {
    hp: Math.round(tpl.hp * (1 + l * 0.22)),
    dmg: Math.round(tpl.dmg * (1 + l * 0.14)),
    xp: Math.round(tpl.xp * (1 + l * 0.25))
  };
}
