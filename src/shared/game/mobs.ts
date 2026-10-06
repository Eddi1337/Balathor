// Monster templates per biome. `model` picks the low-poly body on the client; stats scale with
// the zone level at the spawn point.

import type { Biome } from "../world/overworld";
import type { ProjectileKind } from "../protocol";

export type MobModel =
  | "slime"
  | "bunny"
  | "boar"
  | "wolf"
  | "toad"
  | "scorpion"
  | "wisp"
  | "imp"
  | "golem"
  | "yeti"
  | "mushroom"
  // Sci-fi realm
  | "ship"
  | "asteroid"
  | "jelly"
  | "drone"
  | "wreck"
  | "robot"
  | "turret";

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
  /** Projectile look for ranged mobs (default: emberball / frostbolt by model). */
  proj?: ProjectileKind;
  /** Asteroids and wrecks: mined by lasers (bonus damage from mining hulls). */
  mineable?: boolean;
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
  // ── Space ──────────────────────────────────────────────────────────────────
  asteroid_ferrite: t({ id: "asteroid_ferrite", name: "Ferrite Asteroid", model: "asteroid", color: "#a89a8c", accent: "#e0a060", scale: 1.6, hp: 60, dmg: 0, speed: 0, aggro: 0, reach: 0, cooldownMs: 1000, passive: true, mineable: true, xp: 5, gold: [0, 2], drops: [{ tpl: "ore_ferrite", chance: 1 }, { tpl: "ore_ferrite", chance: 0.4 }] }),
  asteroid_titan: t({ id: "asteroid_titan", name: "Titanium Asteroid", model: "asteroid", color: "#8a8f9a", accent: "#7fe0ff", scale: 1.8, hp: 90, dmg: 0, speed: 0, aggro: 0, reach: 0, cooldownMs: 1000, passive: true, mineable: true, xp: 8, gold: [1, 3], drops: [{ tpl: "ore_titanium", chance: 1 }, { tpl: "ore_titanium", chance: 0.35 }] }),
  asteroid_void: t({ id: "asteroid_void", name: "Void Asteroid", model: "asteroid", color: "#4a3f6b", accent: "#c99bff", scale: 2.0, hp: 120, dmg: 0, speed: 0, aggro: 0, reach: 0, cooldownMs: 1000, passive: true, mineable: true, xp: 11, gold: [1, 4], drops: [{ tpl: "ore_iridium", chance: 1 }, { tpl: "crystal_void", chance: 0.35 }] }),
  salvage_wreck: t({ id: "salvage_wreck", name: "Drifting Wreck", model: "wreck", color: "#7d8a9b", accent: "#ffb02e", scale: 1.7, hp: 80, dmg: 0, speed: 0, aggro: 0, reach: 0, cooldownMs: 1000, passive: true, mineable: true, xp: 8, gold: [3, 9], drops: [{ tpl: "salvage_scrap", chance: 1 }, { tpl: "salvage_core", chance: 0.3 }] }),
  star_jelly: t({ id: "star_jelly", name: "Star Jelly", model: "jelly", color: "#ffb3e6", accent: "#9fe7ff", scale: 1.1, hp: 30, dmg: 0, speed: 2.2, aggro: 0, reach: 0, cooldownMs: 1000, passive: true, xp: 4, gold: [1, 3], drops: [{ tpl: "jelly_glow", chance: 0.6 }] }),
  pirate_fighter: t({ id: "pirate_fighter", name: "Pirate Fighter", model: "ship", color: "#5a5f6a", accent: "#ff5c6a", scale: 1, hp: 70, dmg: 9, speed: 9, aggro: 22, reach: 1.8, cooldownMs: 1400, ranged: { speed: 26, range: 18 }, proj: "laser_red", xp: 18, gold: [4, 12], drops: [{ tpl: "salvage_scrap", chance: 0.5 }, { tpl: "repair_kit", chance: 0.08 }] }),
  pirate_gunship: t({ id: "pirate_gunship", name: "Pirate Gunship", model: "ship", color: "#3b2f4a", accent: "#ff8a3c", scale: 1.6, hp: 220, dmg: 16, speed: 7, aggro: 24, reach: 2.4, cooldownMs: 1600, ranged: { speed: 24, range: 20 }, proj: "laser_red", xp: 45, gold: [12, 30], drops: [{ tpl: "salvage_scrap", chance: 0.8 }, { tpl: "repair_kit", chance: 0.2 }, { tpl: "salvage_core", chance: 0.15 }] }),
  scrap_drone: t({ id: "scrap_drone", name: "Scrap Drone", model: "drone", color: "#9aa0a6", accent: "#ffd166", scale: 0.9, hp: 55, dmg: 8, speed: 8, aggro: 16, reach: 1.5, cooldownMs: 1300, ranged: { speed: 22, range: 14 }, proj: "laser_red", xp: 16, gold: [3, 9], drops: [{ tpl: "salvage_scrap", chance: 0.7 }] }),
  void_wraith: t({ id: "void_wraith", name: "Void Wraith", model: "wisp", color: "#7a4dff", accent: "#e0ccff", scale: 1.6, hp: 160, dmg: 18, speed: 8, aggro: 20, reach: 2, cooldownMs: 1500, ranged: { speed: 20, range: 16 }, proj: "plasma", xp: 40, gold: [10, 24], drops: [{ tpl: "crystal_void", chance: 0.3 }] }),
  boss_vex: t({ id: "boss_vex", name: "Captain Vex", model: "ship", color: "#2a2238", accent: "#ff2e63", scale: 2.6, hp: 2400, dmg: 30, speed: 7.5, aggro: 26, reach: 3, cooldownMs: 900, ranged: { speed: 28, range: 22 }, proj: "laser_red", xp: 900, gold: [200, 400], drops: [{ tpl: "bow_plasma", chance: 0.3 }, { tpl: "staff_ion", chance: 0.3 }, { tpl: "blade_arc", chance: 0.3 }, { tpl: "suit_nano", chance: 0.4 }], boss: true }),
  // ── Planets ────────────────────────────────────────────────────────────────
  glowfang: t({ id: "glowfang", name: "Glowfang", model: "wolf", color: "#3fae8a", accent: "#9ff0ff", scale: 1.0, hp: 60, dmg: 11, speed: 4.0, aggro: 9, reach: 1.3, cooldownMs: 1050, xp: 22, gold: [4, 10], drops: [{ tpl: "crystal_bloom", chance: 0.2 }, { tpl: "fluffy_tail", chance: 0.3 }] }),
  bloomspitter: t({ id: "bloomspitter", name: "Bloomspitter", model: "mushroom", color: "#ff7fd0", accent: "#9ff0ff", scale: 0.95, hp: 50, dmg: 12, speed: 1.8, aggro: 9, reach: 1.1, cooldownMs: 1700, ranged: { speed: 9, range: 9 }, proj: "plasma", xp: 22, gold: [4, 10], drops: [{ tpl: "herb_starmoss", chance: 0.4 }] }),
  puffling: t({ id: "puffling", name: "Puffling", model: "bunny", color: "#ffd1f0", accent: "#9ff0ff", scale: 0.6, hp: 14, dmg: 0, speed: 3.6, aggro: 0, reach: 0, cooldownMs: 1000, passive: true, xp: 4, gold: [0, 2], drops: [{ tpl: "fluffy_tail", chance: 0.5 }] }),
  boss_maw: t({ id: "boss_maw", name: "The Verdant Maw", model: "toad", color: "#2f8f6a", accent: "#ff7fd0", scale: 2.6, hp: 1500, dmg: 30, speed: 2.4, aggro: 10, reach: 2.8, cooldownMs: 1600, xp: 520, gold: [120, 220], drops: [{ tpl: "suit_flight", chance: 0.5 }, { tpl: "crystal_bloom", chance: 1 }], boss: true }),
  shardling: t({ id: "shardling", name: "Shardling", model: "golem", color: "#bfe8ff", accent: "#5fb4ff", scale: 0.85, hp: 85, dmg: 14, speed: 2.4, aggro: 7, reach: 1.4, cooldownMs: 1500, xp: 28, gold: [5, 12], drops: [{ tpl: "crystal_frost", chance: 0.25 }] }),
  frost_mantis: t({ id: "frost_mantis", name: "Frost Mantis", model: "scorpion", color: "#9fd4f5", accent: "#ffffff", scale: 1.0, hp: 75, dmg: 16, speed: 3.5, aggro: 9, reach: 1.4, cooldownMs: 1150, xp: 30, gold: [5, 13], drops: [{ tpl: "shiny_pebble", chance: 0.3 }] }),
  snowmote: t({ id: "snowmote", name: "Snowmote", model: "wisp", color: "#e8f6ff", accent: "#9fd4f5", scale: 0.9, hp: 55, dmg: 14, speed: 2.8, aggro: 10, reach: 1.2, cooldownMs: 1600, ranged: { speed: 9, range: 9 }, xp: 26, gold: [4, 11], drops: [{ tpl: "crystal_frost", chance: 0.15 }] }),
  boss_glacier: t({ id: "boss_glacier", name: "Glacier Heart", model: "golem", color: "#9fd4f5", accent: "#ffffff", scale: 2.6, hp: 2000, dmg: 36, speed: 2.0, aggro: 10, reach: 3.0, cooldownMs: 1800, xp: 640, gold: [140, 260], drops: [{ tpl: "ring_quantum", chance: 0.5 }, { tpl: "crystal_frost", chance: 1 }], boss: true }),
  dune_skitter: t({ id: "dune_skitter", name: "Dune Skitter", model: "scorpion", color: "#e07a4a", accent: "#ffd166", scale: 0.95, hp: 90, dmg: 18, speed: 3.6, aggro: 9, reach: 1.3, cooldownMs: 1100, xp: 34, gold: [6, 14], drops: [{ tpl: "ore_titanium", chance: 0.25 }] }),
  rust_golem: t({ id: "rust_golem", name: "Rust Golem", model: "golem", color: "#b84a2a", accent: "#ffb02e", scale: 1.3, hp: 180, dmg: 24, speed: 2.0, aggro: 7, reach: 1.8, cooldownMs: 1800, xp: 52, gold: [9, 20], drops: [{ tpl: "ore_titanium", chance: 0.6 }, { tpl: "salvage_scrap", chance: 0.4 }] }),
  relay_wisp: t({ id: "relay_wisp", name: "Relay Wisp", model: "wisp", color: "#ff9a6b", accent: "#ffd166", scale: 0.9, hp: 70, dmg: 18, speed: 3.0, aggro: 11, reach: 1.2, cooldownMs: 1500, ranged: { speed: 10, range: 10 }, proj: "emberball", xp: 32, gold: [6, 14], drops: [{ tpl: "salvage_core", chance: 0.08 }] }),
  boss_leviathan: t({ id: "boss_leviathan", name: "Dune Leviathan", model: "scorpion", color: "#c95a3a", accent: "#ffd166", scale: 2.8, hp: 2600, dmg: 42, speed: 3.0, aggro: 11, reach: 3.0, cooldownMs: 1400, xp: 780, gold: [160, 300], drops: [{ tpl: "suit_nano", chance: 0.45 }, { tpl: "bar_titanium", chance: 1 }], boss: true }),
  // ── Tech Labs ──────────────────────────────────────────────────────────────
  security_bot: t({ id: "security_bot", name: "Security Bot", model: "robot", color: "#e8ecf4", accent: "#5ff6ff", scale: 0.9, hp: 80, dmg: 12, speed: 2.8, aggro: 8, reach: 1.4, cooldownMs: 1200, xp: 26, gold: [5, 12], drops: [{ tpl: "salvage_scrap", chance: 0.5 }, { tpl: "repair_kit", chance: 0.06 }] }),
  laser_turret: t({ id: "laser_turret", name: "Laser Turret", model: "turret", color: "#9aa6b8", accent: "#ff4f6a", scale: 1, hp: 70, dmg: 13, speed: 0, aggro: 11, reach: 1.2, cooldownMs: 1400, ranged: { speed: 18, range: 11 }, proj: "laser_red", xp: 24, gold: [4, 10], drops: [{ tpl: "salvage_core", chance: 0.06 }, { tpl: "salvage_scrap", chance: 0.5 }] }),
  sentinel: t({ id: "sentinel", name: "Sentinel Drone", model: "drone", color: "#b9a3ff", accent: "#5ff6ff", scale: 1.0, hp: 70, dmg: 14, speed: 3.2, aggro: 11, reach: 1.4, cooldownMs: 1500, ranged: { speed: 16, range: 10 }, proj: "laser", xp: 28, gold: [5, 12], drops: [{ tpl: "salvage_scrap", chance: 0.4 }] }),
  overseer_1: t({ id: "overseer_1", name: "Overseer Mk I", model: "robot", color: "#ffd166", accent: "#ff4f6a", scale: 2.0, hp: 1300, dmg: 26, speed: 2.4, aggro: 10, reach: 2.4, cooldownMs: 1500, ranged: { speed: 14, range: 9 }, proj: "laser_red", xp: 480, gold: [100, 200], drops: [{ tpl: "bow_plasma", chance: 0.35 }, { tpl: "staff_ion", chance: 0.35 }, { tpl: "blade_arc", chance: 0.35 }, { tpl: "salvage_core", chance: 1 }], boss: true }),
  overseer_2: t({ id: "overseer_2", name: "Overseer Mk II", model: "robot", color: "#9fd4f5", accent: "#5ff6ff", scale: 2.3, hp: 2200, dmg: 36, speed: 2.5, aggro: 10, reach: 2.6, cooldownMs: 1300, ranged: { speed: 15, range: 10 }, proj: "plasma", xp: 760, gold: [160, 300], drops: [{ tpl: "suit_nano", chance: 0.4 }, { tpl: "ring_quantum", chance: 0.4 }, { tpl: "salvage_core", chance: 1 }], boss: true }),
  overseer_3: t({ id: "overseer_3", name: "Overseer Mk III", model: "robot", color: "#2b2238", accent: "#ff2e63", scale: 2.6, hp: 3400, dmg: 48, speed: 2.7, aggro: 11, reach: 2.8, cooldownMs: 1100, ranged: { speed: 17, range: 11 }, proj: "laser_red", xp: 1100, gold: [240, 420], drops: [{ tpl: "bow_photon", chance: 0.35 }, { tpl: "staff_nebula", chance: 0.35 }, { tpl: "blade_star", chance: 0.35 }, { tpl: "salvage_core", chance: 1 }], boss: true }),
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
