// Talent trees and the active abilities they unlock. Every talent is an ability you can put on
// the hotbar (keys 1-5). Three trees per class, three tiers per tree, unlocked in order.

import type { ClassId } from "./classes";

export type BuffId = "shield" | "evasion" | "camo" | "fortify" | "haste" | "rage" | "regen";
export type ZoneKind = "arrows" | "caltrops" | "inferno" | "blizzard" | "consecration";
export type AbilityProjectile = "arrow" | "fireball" | "frostbolt" | "arcane";

export type AbilityEffect =
  | {
      type: "projectile";
      kind: AbilityProjectile;
      mult: number;
      speed: number;
      range: number;
      count?: number;
      spread?: number;
      pierce?: boolean;
      splash?: number;
      slow?: number;
      stunMs?: number;
    }
  | { type: "nova"; radius: number; mult: number; slow?: number; stunMs?: number; blindMs?: number; knock?: number }
  | { type: "zone"; kind: ZoneKind; at: "self" | "target"; range: number; radius: number; mult: number; tickMs: number; durMs: number; slow?: number; healPct?: number }
  | { type: "buff"; buff: BuffId; durMs: number; value: number; party?: boolean; resetCooldowns?: boolean }
  | { type: "heal"; pct: number; partyPct?: number };

export interface Talent {
  id: string;
  cls: ClassId;
  tree: number;
  tier: 1 | 2 | 3;
  name: string;
  icon: string;
  desc: string;
  cooldownMs: number;
  effect: AbilityEffect;
}

export const TREE_NAMES: Record<ClassId, [string, string, string]> = {
  ranger: ["Marksman", "Survival", "Skirmish"],
  mage: ["Fire", "Frost", "Arcane"],
  knight: ["Protection", "Holy", "Valor"]
};

/** Level needed to learn each tier. */
export const TIER_LEVEL: Record<1 | 2 | 3, number> = { 1: 2, 2: 5, 3: 9 };

const T = (t: Talent) => t;

export const TALENTS: Talent[] = [
  // ── Ranger ──
  T({ id: "precise_shot", cls: "ranger", tree: 0, tier: 1, name: "Precise Shot", icon: "🎯", desc: "A carefully aimed arrow for 220% damage that flies extra far.", cooldownMs: 6000, effect: { type: "projectile", kind: "arrow", mult: 2.2, speed: 30, range: 19 } }),
  T({ id: "piercing_arrow", cls: "ranger", tree: 0, tier: 2, name: "Piercing Arrow", icon: "🪡", desc: "An arrow that passes through every enemy in a line for 160% damage.", cooldownMs: 8000, effect: { type: "projectile", kind: "arrow", mult: 1.6, speed: 28, range: 20, pierce: true } }),
  T({ id: "rain_of_arrows", cls: "ranger", tree: 0, tier: 3, name: "Rain of Arrows", icon: "🌧️", desc: "Arrows pour down on the target area for 3 seconds.", cooldownMs: 18000, effect: { type: "zone", kind: "arrows", at: "target", range: 15, radius: 3.2, mult: 0.6, tickMs: 400, durMs: 3000 } }),
  T({ id: "caltrops", cls: "ranger", tree: 1, tier: 1, name: "Caltrops", icon: "📌", desc: "Scatter spikes around you that slow and nick enemies for 5 seconds.", cooldownMs: 14000, effect: { type: "zone", kind: "caltrops", at: "self", range: 0, radius: 2.8, mult: 0.3, tickMs: 500, durMs: 5000, slow: 0.5 } }),
  T({ id: "evasion", cls: "ranger", tree: 1, tier: 2, name: "Evasion", icon: "💨", desc: "Dodge half of all incoming attacks for 5 seconds.", cooldownMs: 20000, effect: { type: "buff", buff: "evasion", durMs: 5000, value: 0.5 } }),
  T({ id: "camouflage", cls: "ranger", tree: 1, tier: 3, name: "Camouflage", icon: "🌿", desc: "Vanish from monsters for 6 seconds. Attacking reveals you.", cooldownMs: 30000, effect: { type: "buff", buff: "camo", durMs: 6000, value: 1 } }),
  T({ id: "multishot", cls: "ranger", tree: 2, tier: 1, name: "Multishot", icon: "🔱", desc: "Loose three arrows in a fan.", cooldownMs: 7000, effect: { type: "projectile", kind: "arrow", mult: 0.9, speed: 24, range: 14, count: 3, spread: 0.26 } }),
  T({ id: "smoke_bomb", cls: "ranger", tree: 2, tier: 2, name: "Smoke Bomb", icon: "💣", desc: "A puff of smoke that blinds nearby enemies for 3 seconds.", cooldownMs: 16000, effect: { type: "nova", radius: 4, mult: 0.2, blindMs: 3000 } }),
  T({ id: "volley", cls: "ranger", tree: 2, tier: 3, name: "Volley", icon: "🏹", desc: "Seven arrows in a tight spread.", cooldownMs: 15000, effect: { type: "projectile", kind: "arrow", mult: 0.75, speed: 24, range: 15, count: 7, spread: 0.11 } }),
  // ── Mage ──
  T({ id: "great_fireball", cls: "mage", tree: 0, tier: 1, name: "Fireball", icon: "☄️", desc: "A huge fireball for 200% damage with a wide burst.", cooldownMs: 6000, effect: { type: "projectile", kind: "fireball", mult: 2.0, speed: 14, range: 14, splash: 2.4 } }),
  T({ id: "fire_nova", cls: "mage", tree: 0, tier: 2, name: "Fire Nova", icon: "🔥", desc: "Burst into flame, scorching and knocking back everything nearby.", cooldownMs: 10000, effect: { type: "nova", radius: 4, mult: 1.4, knock: 2.2 } }),
  T({ id: "inferno", cls: "mage", tree: 0, tier: 3, name: "Inferno", icon: "🌋", desc: "Set the target area ablaze for 4 seconds.", cooldownMs: 20000, effect: { type: "zone", kind: "inferno", at: "target", range: 14, radius: 3.5, mult: 0.7, tickMs: 400, durMs: 4000 } }),
  T({ id: "ice_shard", cls: "mage", tree: 1, tier: 1, name: "Ice Shard", icon: "❄️", desc: "A chilly shard that slows its target by half for 3 seconds.", cooldownMs: 4000, effect: { type: "projectile", kind: "frostbolt", mult: 1.2, speed: 20, range: 14, slow: 0.5 } }),
  T({ id: "frost_barrier", cls: "mage", tree: 1, tier: 2, name: "Frost Barrier", icon: "🧊", desc: "A shield of ice absorbs damage equal to 35% of your health.", cooldownMs: 20000, effect: { type: "buff", buff: "shield", durMs: 8000, value: 0.35 } }),
  T({ id: "blizzard", cls: "mage", tree: 1, tier: 3, name: "Blizzard", icon: "🌨️", desc: "A freezing storm slows and chips at enemies in an area.", cooldownMs: 24000, effect: { type: "zone", kind: "blizzard", at: "target", range: 14, radius: 4.5, mult: 0.45, tickMs: 500, durMs: 5000, slow: 0.55 } }),
  T({ id: "arcane_bolt", cls: "mage", tree: 2, tier: 1, name: "Arcane Bolt", icon: "✨", desc: "A swift sparkling bolt for 150% damage.", cooldownMs: 3000, effect: { type: "projectile", kind: "arcane", mult: 1.5, speed: 26, range: 15 } }),
  T({ id: "mana_shield", cls: "mage", tree: 2, tier: 2, name: "Mana Shield", icon: "🔮", desc: "Take 45% less damage for 6 seconds.", cooldownMs: 18000, effect: { type: "buff", buff: "fortify", durMs: 6000, value: 0.45 } }),
  T({ id: "time_warp", cls: "mage", tree: 2, tier: 3, name: "Time Warp", icon: "⏳", desc: "Reset your other cooldowns and move and attack 40% faster for 8 seconds.", cooldownMs: 45000, effect: { type: "buff", buff: "haste", durMs: 8000, value: 0.4, resetCooldowns: true } }),
  // ── Knight ──
  T({ id: "shield_bash", cls: "knight", tree: 0, tier: 1, name: "Shield Bash", icon: "🛡️", desc: "Bash nearby enemies, stunning them for 1.5 seconds.", cooldownMs: 8000, effect: { type: "nova", radius: 2.4, mult: 1.2, stunMs: 1500 } }),
  T({ id: "divine_shield", cls: "knight", tree: 0, tier: 2, name: "Divine Shield", icon: "✝️", desc: "A golden shield absorbs damage equal to half your health.", cooldownMs: 25000, effect: { type: "buff", buff: "shield", durMs: 6000, value: 0.5 } }),
  T({ id: "fortify", cls: "knight", tree: 0, tier: 3, name: "Fortify", icon: "🏰", desc: "Take half damage for 8 seconds.", cooldownMs: 30000, effect: { type: "buff", buff: "fortify", durMs: 8000, value: 0.5 } }),
  T({ id: "holy_strike", cls: "knight", tree: 1, tier: 1, name: "Holy Strike", icon: "⚡", desc: "A radiant sweep hitting everything around you for 200% damage.", cooldownMs: 6000, effect: { type: "nova", radius: 2.8, mult: 2.0 } }),
  T({ id: "consecration", cls: "knight", tree: 1, tier: 2, name: "Consecration", icon: "🌟", desc: "Bless the ground: burns enemies and heals allies standing in it.", cooldownMs: 16000, effect: { type: "zone", kind: "consecration", at: "self", range: 0, radius: 3.6, mult: 0.5, tickMs: 500, durMs: 6000, healPct: 0.015 } }),
  T({ id: "divine_wrath", cls: "knight", tree: 1, tier: 3, name: "Divine Wrath", icon: "☀️", desc: "Smite everything nearby for 250% damage and stun them briefly.", cooldownMs: 25000, effect: { type: "nova", radius: 5, mult: 2.5, stunMs: 1000 } }),
  T({ id: "healing_aura", cls: "knight", tree: 2, tier: 1, name: "Healing Aura", icon: "💚", desc: "You and nearby party members regenerate 4% health per second for 6 seconds.", cooldownMs: 20000, effect: { type: "buff", buff: "regen", durMs: 6000, value: 0.04, party: true } }),
  T({ id: "lay_on_hands", cls: "knight", tree: 2, tier: 2, name: "Lay on Hands", icon: "🙏", desc: "Heal yourself for 60% of your health and nearby allies for 30%.", cooldownMs: 45000, effect: { type: "heal", pct: 0.6, partyPct: 0.3 } }),
  T({ id: "battle_cry", cls: "knight", tree: 2, tier: 3, name: "Battle Cry", icon: "📯", desc: "You and nearby party members deal 40% more damage for 10 seconds.", cooldownMs: 40000, effect: { type: "buff", buff: "rage", durMs: 10000, value: 0.4, party: true } })
];

export const TALENTS_BY_ID: Record<string, Talent> = Object.fromEntries(TALENTS.map((t) => [t.id, t]));

export function talentsFor(cls: ClassId): Talent[] {
  return TALENTS.filter((t) => t.cls === cls);
}

export function talentPoints(level: number, learned: string[]): number {
  return Math.max(0, level - 1 - learned.length);
}

/** Why a talent can't be learned yet, or null if it can. */
export function canLearn(cls: ClassId, level: number, learned: string[], id: string): string | null {
  const t = TALENTS_BY_ID[id];
  if (!t || t.cls !== cls) return "That isn't one of your talents";
  if (learned.includes(id)) return "Already learned";
  if (talentPoints(level, learned) <= 0) return "No talent points to spend";
  if (level < TIER_LEVEL[t.tier]) return `Requires level ${TIER_LEVEL[t.tier]}`;
  if (t.tier > 1) {
    const prev = TALENTS.find((o) => o.cls === cls && o.tree === t.tree && o.tier === t.tier - 1);
    if (prev && !learned.includes(prev.id)) return `Learn ${prev.name} first`;
  }
  return null;
}

export function respecCost(level: number): number {
  return 20 + level * 15;
}

export const BAR_SLOTS = 5;
