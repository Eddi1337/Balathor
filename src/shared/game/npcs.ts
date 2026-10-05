// Town NPCs, their daily routines and their shops. Positions are overworld tile coords
// (see town.ts). Hours are in-game hours (0-24).

import { doorFront } from "../world/town";

export type NpcRole = "shop" | "guide" | "guard" | "villager";

/** Where an NPC wants to be during [from, to) hours (wraps past midnight). */
export interface ScheduleEntry {
  from: number;
  to: number;
  x: number;
  y: number;
  wander: number;
  /** Arriving here means going inside (hidden until the next entry). */
  indoors?: boolean;
  /** Shown in the NPC's nameplate tooltip / chat when greeted off-shift. */
  activity?: string;
}

export interface NpcDef {
  id: string;
  name: string;
  role: NpcRole;
  x: number;
  y: number;
  /** Wander radius around home (0 = stands still). */
  wander: number;
  body: string;
  accent: string;
  hat: "none" | "cap" | "hood" | "wizard" | "helmet" | "chef" | "bow";
  shopId?: string;
  lines: string[];
  schedule?: ScheduleEntry[];
}

export interface ShopEntry {
  tpl: string;
  rarity?: "common" | "uncommon" | "rare";
  lvl?: number;
  price: number;
}

export interface ShopDef {
  id: string;
  name: string;
  greeting: string;
  stock: ShopEntry[];
}

function at(building: string, from: number, to: number, wander: number, indoors = false, activity?: string): ScheduleEntry {
  const p = doorFront(building, indoors ? 0.9 : 1.6);
  return { from, to, x: p.x, y: p.y, wander: indoors ? 0 : wander, indoors, activity };
}

export const SHOPS: Record<string, ShopDef> = {
  provisions: {
    id: "provisions",
    name: "Pip's Provisions",
    greeting: "Tonics, snacks and sparkly odds! Everything an adventurer needs~",
    stock: [
      { tpl: "potion_small", price: 12 },
      { tpl: "potion_big", price: 36 },
      { tpl: "ring_copper", price: 60 },
      { tpl: "ring_moon", price: 110 }
    ]
  },
  stable: {
    id: "stable",
    name: "Holt's Stables",
    greeting: "Every adventurer needs a trusty pony. Mine are the fluffiest on the isle!",
    stock: [{ tpl: "mount_pony", price: 350 }]
  },
  smithy: {
    id: "smithy",
    name: "Anvil & Ember",
    greeting: "Fresh off the anvil. Mind the sparks, little one.",
    stock: [
      { tpl: "bow_elm", price: 120 },
      { tpl: "staff_star", price: 130 },
      { tpl: "sword_steel", price: 125 },
      { tpl: "leather", price: 90 },
      { tpl: "robe", price: 95 },
      { tpl: "plate", price: 140 }
    ]
  }
};

export const NPCS: NpcDef[] = [
  {
    id: "npc_pip", name: "Pip", role: "shop", x: 8.5, y: -7.2, wander: 0.6,
    body: "#ffb3c7", accent: "#fff1e0", hat: "chef", shopId: "provisions",
    lines: ["Berry Tonics, fresh today!", "Stay hydrated out there~", "Ooh, is that slime gel? I'll buy it!"],
    schedule: [at("store", 6, 19, 0.6), at("inn", 19, 22, 1.5, false, "enjoying a cocoa at the inn"), at("cottage_2", 22, 6, 0, true)]
  },
  {
    id: "npc_brunhild", name: "Brunhild", role: "shop", x: -8.5, y: -7.2, wander: 0.6,
    body: "#c0703f", accent: "#3b3b3b", hat: "none", shopId: "smithy",
    lines: ["Clang clang clang!", "A good blade is a happy blade.", "Bring me shiny pebbles sometime."],
    schedule: [at("smithy", 6, 19, 0.6), at("inn", 19, 23, 1.5, false, "arm-wrestling at the inn"), at("cottage_7", 23, 6, 0, true)]
  },
  {
    id: "npc_rin", name: "Guide Rin", role: "guide", x: 3.5, y: 6.5, wander: 1.5,
    body: "#6fd3c4", accent: "#fff4c2", hat: "cap",
    lines: [
      "Welcome to Hearthmoor! Click or press Space to attack, WASD to walk.",
      "The meadow outside the walls is gentle. The further you roam, the tougher things get!",
      "Bosses roam each biome. Bring friends, or a lot of tonics.",
      "Press I for your bag, C for your character, T for talents and L for quests."
    ],
    schedule: [{ from: 6, to: 23, x: 3.5, y: 6.5, wander: 1.5 }, at("inn", 23, 6, 0, true)]
  },
  {
    id: "npc_marigold", name: "Innkeeper Marigold", role: "villager", x: 9, y: 7, wander: 1.2,
    body: "#c98bd8", accent: "#fff1e0", hat: "none",
    lines: ["The Sleepy Slime has the softest beds in the isle.", "Rooms open soon, dear!"],
    schedule: [at("inn", 7, 24, 1.2), at("inn", 0, 7, 0, true)]
  },
  {
    id: "npc_oswin", name: "Guildmaster Oswin", role: "villager", x: -9, y: 7, wander: 1.2,
    body: "#f2b950", accent: "#5a3a1e", hat: "wizard",
    lines: ["The guild is recruiting! Prove yourself against King Wobble in the meadow.", "Every biome has a champion. Topple them all!"],
    schedule: [at("guild", 8, 19, 1.2), at("inn", 19, 23, 1.5, false, "telling tall tales at the inn"), at("guild", 23, 8, 0, true)]
  },
  { id: "npc_guard_n", name: "Guard Torin", role: "guard", x: 0.5, y: -30, wander: 2, body: "#5b8def", accent: "#d9dde6", hat: "helmet", lines: ["North gate's clear. Frost lies beyond.", "Watch for wisps."] },
  { id: "npc_guard_e", name: "Guard Mira", role: "guard", x: 30, y: 0.5, wander: 2, body: "#5b8def", accent: "#d9dde6", hat: "helmet", lines: ["East road leads to the dunes.", "Stay sharp."] },
  { id: "npc_guard_s", name: "Guard Fen", role: "guard", x: 0.5, y: 30, wander: 2, body: "#5b8def", accent: "#d9dde6", hat: "helmet", lines: ["South is swampland. Mind your boots.", "Croak croak, they say. Heh."] },
  { id: "npc_guard_w", name: "Guard Bren", role: "guard", x: -30, y: 0.5, wander: 2, body: "#5b8def", accent: "#d9dde6", hat: "helmet", lines: ["West road climbs to the highlands.", "Wolves up there. Big ones."] },
  { id: "npc_tilly", name: "Tilly", role: "villager", x: -4, y: -4, wander: 5, body: "#8fc97a", accent: "#fff4e6", hat: "bow", lines: ["Have you seen the fountain sparkle at night?", "I'm going to be a ranger one day!"],
    schedule: [{ from: 7, to: 17, x: -4, y: -4, wander: 5 }, at("inn", 17, 20, 2, false, "listening to stories at the inn"), at("cottage_4", 20, 7, 0, true)] },
  { id: "npc_bramble", name: "Old Bramble", role: "villager", x: 15, y: 15, wander: 4, body: "#9a6b4f", accent: "#e8edf2", hat: "hood", lines: ["Back in my day the slimes were bigger.", "Mind the sunbeams in the forest, they're lovely."],
    schedule: [{ from: 8, to: 18, x: 15, y: 15, wander: 4 }, at("inn", 18, 22, 1.5, false, "napping by the inn fire"), at("cottage_1", 22, 8, 0, true)] },
  {
    id: "npc_holt", name: "Stable Keeper Holt", role: "shop", x: -24, y: 3.5, wander: 1, body: "#9a6b4f", accent: "#f2d0b4", hat: "cap", shopId: "stable",
    lines: ["Ponies! Get your ponies!", "Press M to hop on once you've got one.", "Ponies don't swim, mind."],
    schedule: [{ from: 6, to: 21, x: -24, y: 3.5, wander: 1 }, at("cottage_5", 21, 6, 0, true)]
  }
];

/** The schedule entry active at a given in-game hour, if any. */
export function scheduleAt(def: NpcDef, hour: number): ScheduleEntry | null {
  if (!def.schedule) return null;
  for (const e of def.schedule) {
    const inRange = e.from <= e.to ? hour >= e.from && hour < e.to : hour >= e.from || hour < e.to;
    if (inRange) return e;
  }
  return null;
}

export function npcDef(id: string): NpcDef | undefined {
  return NPCS.find((n) => n.id === id);
}
