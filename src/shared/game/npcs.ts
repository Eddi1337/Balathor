// Town NPCs and their shops. Positions are in overworld tile coords (see town.ts layout).

export type NpcRole = "shop" | "guide" | "guard" | "villager";

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
    lines: ["Berry Tonics, fresh today!", "Stay hydrated out there~", "Ooh, is that slime gel? I'll buy it!"]
  },
  {
    id: "npc_brunhild", name: "Brunhild", role: "shop", x: -8.5, y: -7.2, wander: 0.6,
    body: "#c0703f", accent: "#3b3b3b", hat: "none", shopId: "smithy",
    lines: ["Clang clang clang!", "A good blade is a happy blade.", "Bring me shiny pebbles sometime."]
  },
  {
    id: "npc_rin", name: "Guide Rin", role: "guide", x: 3.5, y: 6.5, wander: 1.5,
    body: "#6fd3c4", accent: "#fff4c2", hat: "cap",
    lines: [
      "Welcome to Hearthmoor! Click or press Space to attack, WASD to walk.",
      "The meadow outside the walls is gentle. The further you roam, the tougher things get!",
      "Bosses roam each biome. Bring friends, or a lot of tonics.",
      "Press I for your bag, C for your character, and Enter to chat."
    ]
  },
  {
    id: "npc_marigold", name: "Innkeeper Marigold", role: "villager", x: 9, y: 7, wander: 1.2,
    body: "#c98bd8", accent: "#fff1e0", hat: "none",
    lines: ["The Sleepy Slime has the softest beds in the isle.", "Rooms open soon, dear!"]
  },
  {
    id: "npc_oswin", name: "Guildmaster Oswin", role: "villager", x: -9, y: 7, wander: 1.2,
    body: "#f2b950", accent: "#5a3a1e", hat: "wizard",
    lines: ["The guild is recruiting! Prove yourself against King Wobble in the meadow.", "Every biome has a champion. Topple them all!"]
  },
  { id: "npc_guard_n", name: "Guard Torin", role: "guard", x: 0.5, y: -30, wander: 2, body: "#5b8def", accent: "#d9dde6", hat: "helmet", lines: ["North gate's clear. Frost lies beyond.", "Watch for wisps."] },
  { id: "npc_guard_e", name: "Guard Mira", role: "guard", x: 30, y: 0.5, wander: 2, body: "#5b8def", accent: "#d9dde6", hat: "helmet", lines: ["East road leads to the dunes.", "Stay sharp."] },
  { id: "npc_guard_s", name: "Guard Fen", role: "guard", x: 0.5, y: 30, wander: 2, body: "#5b8def", accent: "#d9dde6", hat: "helmet", lines: ["South is swampland. Mind your boots.", "Croak croak, they say. Heh."] },
  { id: "npc_guard_w", name: "Guard Bren", role: "guard", x: -30, y: 0.5, wander: 2, body: "#5b8def", accent: "#d9dde6", hat: "helmet", lines: ["West road climbs to the highlands.", "Wolves up there. Big ones."] },
  { id: "npc_tilly", name: "Tilly", role: "villager", x: -4, y: -4, wander: 5, body: "#8fc97a", accent: "#fff4e6", hat: "bow", lines: ["Have you seen the fountain sparkle at night?", "I'm going to be a ranger one day!"] },
  { id: "npc_bramble", name: "Old Bramble", role: "villager", x: 15, y: 15, wander: 4, body: "#9a6b4f", accent: "#e8edf2", hat: "hood", lines: ["Back in my day the slimes were bigger.", "Mind the sunbeams in the forest, they're lovely."] }
];

export function npcDef(id: string): NpcDef | undefined {
  return NPCS.find((n) => n.id === id);
}
