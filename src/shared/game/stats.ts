// Character progression and derived stats.

import { CLASSES, type ClassId } from "./classes";
import type { EquipSlot, Item } from "./items";

export type StatId = "str" | "vit" | "agi" | "def";
export const STAT_IDS: StatId[] = ["str", "vit", "agi", "def"];
export const STAT_INFO: Record<StatId, { name: string; blurb: string }> = {
  str: { name: "Strength", blurb: "+5% damage per point" },
  vit: { name: "Vitality", blurb: "+10 max health per point" },
  agi: { name: "Agility", blurb: "+3% move speed per point" },
  def: { name: "Defence", blurb: "+1.5 armour per point" }
};

export const MAX_LEVEL = 30;
export const BASE_SPEED = 5.2;
export const SWIM_SPEED_MULT = 0.45;
/** Riding a pony. */
export const MOUNT_SPEED_MULT = 1.6;
/** Holding Shift (or the joystick pushed all the way) on foot. */
export const SPRINT_SPEED_MULT = 1.55;

export function xpToNext(level: number): number {
  return Math.round(60 + level * 45 + level * level * 6);
}

export interface Derived {
  maxHp: number;
  damage: number;
  armor: number;
  speed: number;
  blockChance: number;
}

export function deriveStats(
  cls: ClassId,
  level: number,
  stats: Record<StatId, number>,
  equipment: Partial<Record<EquipSlot, Item | null>>
): Derived {
  const def = CLASSES[cls];
  let gearDmg = 0;
  let gearArmor = 0;
  let gearHp = 0;
  let gearStr = 0;
  let rarityRank = 0;
  for (const item of Object.values(equipment)) {
    if (!item) continue;
    gearDmg += item.dmg ?? 0;
    gearArmor += item.armor ?? 0;
    gearHp += item.hp ?? 0;
    gearStr += item.str ?? 0;
    if (item === equipment.body) {
      rarityRank = ["common", "uncommon", "rare", "epic", "legendary", "mythic"].indexOf(item.rarity);
    }
  }
  const str = stats.str + gearStr;
  return {
    maxHp: def.baseHp + (level - 1) * 12 + stats.vit * 10 + gearHp,
    damage: (def.damage + gearDmg + (level - 1) * 1.2) * (1 + str * 0.05),
    armor: def.baseArmor + stats.def * 1.5 + gearArmor,
    speed: BASE_SPEED * (1 + stats.agi * 0.03),
    blockChance: def.blockChance > 0 ? Math.min(0.72, def.blockChance + rarityRank * 0.1) : 0
  };
}

/** Damage after armour mitigation. */
export function mitigate(damage: number, armor: number): number {
  return Math.max(1, Math.round(damage * (100 / (100 + armor * 4))));
}
