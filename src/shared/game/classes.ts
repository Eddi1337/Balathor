// Playable classes. Attack shape and tuning live here so the client can preview ranges and
// cooldowns while the server stays authoritative.

export type ClassId = "ranger" | "mage" | "knight";

export interface ClassDef {
  id: ClassId;
  name: string;
  blurb: string;
  weapon: "bow" | "staff" | "sword";
  attack: "projectile" | "melee";
  /** Base damage before strength / weapon bonuses. */
  damage: number;
  cooldownMs: number;
  /** Projectile speed (tiles/s) and max range (tiles), or melee reach. */
  speed: number;
  range: number;
  /** Melee arc (radians) or projectile splash radius (tiles, 0 = single target). */
  arc: number;
  splash: number;
  baseHp: number;
  baseArmor: number;
  /** Knight only: shield block chance before gear. */
  blockChance: number;
  colors: { body: string; accent: string };
}

export const CLASSES: Record<ClassId, ClassDef> = {
  ranger: {
    id: "ranger",
    name: "Ranger",
    blurb: "Quick on their feet, deadly from afar. Arrows fly fast and far.",
    weapon: "bow",
    attack: "projectile",
    damage: 9,
    cooldownMs: 560,
    speed: 22,
    range: 14,
    arc: 0,
    splash: 0,
    baseHp: 95,
    baseArmor: 2,
    blockChance: 0,
    colors: { body: "#6dbb6a", accent: "#7a5234" }
  },
  mage: {
    id: "mage",
    name: "Mage",
    blurb: "Slow, sparkly fireballs that burst on impact and singe everything nearby.",
    weapon: "staff",
    attack: "projectile",
    damage: 13,
    cooldownMs: 820,
    speed: 13,
    range: 13,
    arc: 0,
    splash: 1.6,
    baseHp: 85,
    baseArmor: 1,
    blockChance: 0,
    colors: { body: "#7b6cf0", accent: "#ffd166" }
  },
  knight: {
    id: "knight",
    name: "Knight",
    blurb: "Sword and shield up close. Sturdy, and blocks a share of incoming hits.",
    weapon: "sword",
    attack: "melee",
    damage: 12,
    cooldownMs: 460,
    speed: 0,
    range: 2.1,
    arc: (110 * Math.PI) / 180,
    splash: 0,
    baseHp: 120,
    baseArmor: 5,
    blockChance: 0.2,
    colors: { body: "#5b8def", accent: "#d9dde6" }
  }
};

export const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

export function isClassId(v: unknown): v is ClassId {
  return typeof v === "string" && v in CLASSES;
}
