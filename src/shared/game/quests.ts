// Quest definitions. Steps run in order; when the last step is done the quest is "ready" and
// you hand it in to the giver (or `turnIn`) for the rewards.

import type { Biome } from "../world/overworld";
import { NPCS } from "./npcs";
import { bossSpot } from "../world/landmarks";

export type QuestStep =
  | { type: "talk"; npc: string; text: string }
  | { type: "kill"; mobs: string[]; biome?: Biome; count: number; text: string; hint?: { x: number; y: number } }
  | { type: "collect"; item: string; count: number; text: string; hint?: { x: number; y: number } }
  | { type: "visit"; x: number; y: number; r: number; text: string };

export interface QuestReward {
  xp: number;
  gold: number;
  items?: { tpl: string; qty?: number; rarity?: "common" | "uncommon" | "rare" | "epic" }[];
  /** A random piece of class-appropriate gear of at least this rarity. */
  gear?: "uncommon" | "rare" | "epic";
}

export interface Quest {
  id: string;
  name: string;
  giver: string;
  turnIn?: string;
  level: number;
  requires?: string[];
  offer: string;
  complete: string;
  steps: QuestStep[];
  reward: QuestReward;
}

const BOSS_SPOTS = {
  meadow: bossSpot("meadow")
};

export const QUESTS: Quest[] = [
  {
    id: "q_welcome",
    name: "Hello, Hearthmoor!",
    giver: "npc_rin",
    level: 1,
    offer: "Oh, a new face! Hearthmoor's lovely, but you should meet the folks who'll keep you alive. Say hi to Pip and Brunhild for me?",
    complete: "See? Everyone's friendly here. Mostly. Brunhild bites, but only metaphorically.",
    steps: [
      { type: "talk", npc: "npc_pip", text: "Say hi to Pip at Pip's Provisions" },
      { type: "talk", npc: "npc_brunhild", text: "Meet Brunhild at Anvil & Ember" },
      { type: "talk", npc: "npc_rin", text: "Return to Guide Rin" }
    ],
    reward: { xp: 45, gold: 15 }
  },
  {
    id: "q_first_hunt",
    name: "Slime Time",
    giver: "npc_rin",
    level: 1,
    requires: ["q_welcome"],
    offer: "Puddle Slimes keep oozing up to the gates. Pop five of them in the meadow outside town. They're squishy, you'll be fine!",
    complete: "Ew, you're all gooey. Here, take these tonics, you've earned them.",
    steps: [{ type: "kill", mobs: ["slime"], biome: "meadow", count: 5, text: "Defeat Puddle Slimes in the meadow", hint: { x: 0, y: 118 } }],
    reward: { xp: 90, gold: 10, items: [{ tpl: "potion_small", qty: 3 }] }
  },
  {
    id: "q_gel",
    name: "Sticky Business",
    giver: "npc_pip",
    level: 2,
    requires: ["q_first_hunt"],
    offer: "Slime gel makes the BEST jelly tonics. Could you bring me six blobs? Don't ask what's in them.",
    complete: "Perfect wobble! Take this ring, it's been sitting in my drawer looking lonely.",
    steps: [{ type: "collect", item: "slime_gel", count: 6, text: "Collect Slime Gel", hint: { x: 0, y: 118 } }],
    reward: { xp: 70, gold: 40, items: [{ tpl: "ring_copper", rarity: "uncommon" }] }
  },
  {
    id: "q_grumpcaps",
    name: "Grumpy Caps",
    giver: "npc_bramble",
    level: 2,
    offer: "Those Grumpcap mushrooms keep heckling me on my walks. Teach four of them some manners.",
    complete: "Ha! That'll learn 'em. Back in my day mushrooms were polite.",
    steps: [{ type: "kill", mobs: ["shroom"], count: 4, text: "Defeat Grumpcaps", hint: { x: -118, y: 40 } }],
    reward: { xp: 110, gold: 25 }
  },
  {
    id: "q_inn_invites",
    name: "Lights On at the Inn",
    giver: "npc_marigold",
    level: 2,
    offer: "The Sleepy Slime's doing a guards' night! Would you invite the four gate guards for me? North, east, south and west.",
    complete: "Wonderful! Now I just need to bake forty pies. Here's a little something.",
    steps: [
      { type: "talk", npc: "npc_guard_n", text: "Invite Guard Torin (north gate)" },
      { type: "talk", npc: "npc_guard_e", text: "Invite Guard Mira (east gate)" },
      { type: "talk", npc: "npc_guard_s", text: "Invite Guard Fen (south gate)" },
      { type: "talk", npc: "npc_guard_w", text: "Invite Guard Bren (west gate)" }
    ],
    reward: { xp: 130, gold: 45, items: [{ tpl: "potion_big", qty: 1 }] }
  },
  {
    id: "q_tails",
    name: "Fluffy Tails",
    giver: "npc_tilly",
    level: 3,
    offer: "I'm making a SCARF. Out of tails. Fluffy ones! Can you find me five? Puffbuns and wolves have the best.",
    complete: "It's going to be the fluffiest scarf in history. You can borrow it sometimes.",
    steps: [{ type: "collect", item: "fluffy_tail", count: 5, text: "Collect Fluffy Tails", hint: { x: -150, y: 90 } }],
    reward: { xp: 160, gold: 30, items: [{ tpl: "potion_big", qty: 1 }] }
  },
  {
    id: "q_guild",
    name: "Guild Initiation",
    giver: "npc_oswin",
    level: 3,
    requires: ["q_first_hunt"],
    offer: "So you want to join the Adventurers' Guild? Scout the meadow north-east of town; something big and wobbly lives there.",
    complete: "A king-sized slime, you say? Then you know your next task.",
    steps: [
      { type: "visit", x: BOSS_SPOTS.meadow.x, y: BOSS_SPOTS.meadow.y, r: 14, text: "Scout the north-east meadow" },
      { type: "talk", npc: "npc_oswin", text: "Report back to Guildmaster Oswin" }
    ],
    reward: { xp: 140, gold: 20 }
  },
  {
    id: "q_wobble",
    name: "Long Live the King",
    giver: "npc_oswin",
    level: 4,
    requires: ["q_guild"],
    offer: "King Wobble has ruled the meadow for too long. Topple him and you're a guild member for life. Bring friends!",
    complete: "The King is jelly! Welcome to the Guild, adventurer. Take this, you'll need better gear out there.",
    steps: [{ type: "kill", mobs: ["boss_meadow"], count: 1, text: "Defeat King Wobble", hint: BOSS_SPOTS.meadow }],
    reward: { xp: 380, gold: 120, gear: "rare" }
  },
  {
    id: "q_audience",
    name: "An Audience with the King",
    giver: "npc_rin",
    level: 2,
    requires: ["q_welcome"],
    offer: "Have you met King Aldric? He sits in the castle at the very top of the city. Climb the rings and say hello. He LOVES visitors.",
    complete: "Splendid! A new face in my hall. Hearthmoor is in good hands with folk like you.",
    turnIn: "npc_king",
    steps: [
      { type: "visit", x: 0.5, y: 8, r: 9, text: "Climb up to the Citadel" },
      { type: "talk", npc: "npc_king", text: "Greet King Aldric in the throne room" }
    ],
    reward: { xp: 160, gold: 50, items: [{ tpl: "potion_big", qty: 2 }] }
  },
  {
    id: "q_explorer",
    name: "Road's End",
    giver: "npc_rin",
    level: 5,
    requires: ["q_welcome"],
    offer: "Every road out of Hearthmoor leads somewhere wild. Attune to the far obelisks so you can always find your way home.",
    complete: "A true wanderer! Those obelisks will whisk you anywhere you've been.",
    steps: [
      { type: "visit", x: 5, y: -345, r: 12, text: "Reach Whitepine Hollow (far up the north road)" },
      { type: "visit", x: 345, y: 5, r: 12, text: "Reach Glasshide Flats (far along the east road)" },
      { type: "visit", x: 5, y: 345, r: 12, text: "Reach Bogfather's Mire (far down the south road)" },
      { type: "visit", x: -345, y: 5, r: 12, text: "Reach Scarcliff (far along the west road)" }
    ],
    reward: { xp: 900, gold: 150 }
  },
  {
    id: "q_saddle",
    name: "Saddle Up",
    giver: "npc_holt",
    level: 5,
    offer: "My ponies love shiny pebbles. Weird, I know. Bring me five and I'll give you a stack of coin toward one.",
    complete: "Look at them sparkle! Here, put this toward a pony of your own.",
    steps: [{ type: "collect", item: "shiny_pebble", count: 5, text: "Collect Shiny Pebbles", hint: { x: 260, y: 150 } }],
    reward: { xp: 250, gold: 175 }
  },
  {
    id: "q_south",
    name: "Croak and Dagger",
    giver: "npc_guard_s",
    level: 6,
    offer: "Bog Croakers have been croaking ALL night. I haven't slept in a week. Six of them, please.",
    complete: "Silence! Beautiful, beautiful silence.",
    steps: [{ type: "kill", mobs: ["toad"], biome: "swamp", count: 6, text: "Silence Bog Croakers in the swamp", hint: { x: 0, y: 250 } }],
    reward: { xp: 420, gold: 60 }
  },
  {
    id: "q_west",
    name: "Wolves of the Heights",
    giver: "npc_guard_w",
    level: 6,
    offer: "Mossfangs are prowling the highland road. Thin the pack: six should do it.",
    complete: "The road's safer already. Good hunting.",
    steps: [{ type: "kill", mobs: ["wolf"], biome: "highlands", count: 6, text: "Hunt Mossfangs in the highlands", hint: { x: -225, y: -130 } }],
    reward: { xp: 440, gold: 65 }
  },
  {
    id: "q_east",
    name: "Pinchers in the Dunes",
    giver: "npc_guard_e",
    level: 7,
    offer: "Dune Pinchers keep snipping the caravan ropes. Snip six of them back.",
    complete: "Ha! Snip snip yourself, crabs. Scorpions. Whatever they are.",
    steps: [{ type: "kill", mobs: ["scorpion"], biome: "desert", count: 6, text: "Defeat Dune Pinchers in the desert", hint: { x: 230, y: 135 } }],
    reward: { xp: 520, gold: 75 }
  },
  {
    id: "q_north",
    name: "Whispers in the Frost",
    giver: "npc_guard_n",
    level: 8,
    offer: "Frost Wisps have been freezing the north road solid. Six of them, and mind their icy bolts.",
    complete: "Warmer already! Well, a bit. It's still the frost.",
    steps: [{ type: "kill", mobs: ["wisp"], biome: "frost", count: 6, text: "Disperse Frost Wisps in the frost", hint: { x: 0, y: -260 } }],
    reward: { xp: 640, gold: 85 }
  },
  {
    id: "q_boss_forest",
    name: "The Old Rootback",
    giver: "npc_king",
    level: 9,
    requires: ["q_wobble", "q_audience"],
    offer: "Old Rootback has trampled half the south-west forest. The crown's oldest bounty. Will you claim it?",
    complete: "Rootback, felled! The forest owes you one.",
    steps: [{ type: "kill", mobs: ["boss_forest"], count: 1, text: "Defeat the Old Rootback in the forest", hint: bossSpot("forest") }],
    reward: { xp: 1200, gold: 220, gear: "rare" }
  },
  {
    id: "q_boss_swamp",
    name: "An Offer You Can't Refuse",
    giver: "npc_king",
    level: 10,
    requires: ["q_wobble", "q_audience"],
    offer: "The Bogfather runs the swamp like a family business. Shut it down.",
    complete: "The Bogfather sleeps with the fishes. Literally, it's a swamp.",
    steps: [{ type: "kill", mobs: ["boss_swamp"], count: 1, text: "Defeat the Bogfather in the swamp", hint: bossSpot("swamp") }],
    reward: { xp: 1400, gold: 250, gear: "rare" }
  },
  {
    id: "q_boss_desert",
    name: "Glass Half Empty",
    giver: "npc_king",
    level: 12,
    requires: ["q_wobble", "q_audience"],
    offer: "Glasshide's crystal shell turns arrows. Find a way through it.",
    complete: "Shattered! Mind the shards on your way out.",
    steps: [{ type: "kill", mobs: ["boss_desert"], count: 1, text: "Defeat Glasshide in the desert", hint: bossSpot("desert") }],
    reward: { xp: 1800, gold: 300, gear: "epic" }
  },
  {
    id: "q_boss_highlands",
    name: "Scar Warden",
    giver: "npc_king",
    level: 13,
    requires: ["q_wobble", "q_audience"],
    offer: "The Scar Warden leads the highland packs. Take down the alpha.",
    complete: "The packs scatter. The heights are yours.",
    steps: [{ type: "kill", mobs: ["boss_highlands"], count: 1, text: "Defeat the Scar Warden in the highlands", hint: bossSpot("highlands") }],
    reward: { xp: 2000, gold: 320, gear: "epic" }
  },
  {
    id: "q_boss_frost",
    name: "Winter's Warden",
    giver: "npc_king",
    level: 13,
    requires: ["q_wobble", "q_audience"],
    offer: "The Whitepine Warden guards the frozen north. Bundle up.",
    complete: "Spring might come to the north after all!",
    steps: [{ type: "kill", mobs: ["boss_frost"], count: 1, text: "Defeat the Whitepine Warden in the frost", hint: bossSpot("frost") }],
    reward: { xp: 2100, gold: 330, gear: "epic" }
  },
  {
    id: "q_boss_ember",
    name: "Red Crag",
    giver: "npc_king",
    level: 14,
    requires: ["q_wobble", "q_audience"],
    offer: "Red Crag is the oldest thing on the isle, a mountain that walks. The guild's final bounty.",
    complete: "You did it. Every champion of the isle has fallen. Hearthmoor will sing about you for years.",
    steps: [{ type: "kill", mobs: ["boss_ember"], count: 1, text: "Defeat Red Crag in the ember wastes", hint: bossSpot("ember") }],
    reward: { xp: 2600, gold: 400, gear: "epic" }
  }
];

export const QUESTS_BY_ID: Record<string, Quest> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

export interface QuestProgress {
  id: string;
  step: number;
  /** Count toward the current kill/collect step. */
  n: number;
}

export interface QuestLog {
  active: QuestProgress[];
  done: string[];
}

export const MAX_ACTIVE_QUESTS = 10;

export function questTurnIn(q: Quest): string {
  return q.turnIn ?? q.giver;
}

export function isReady(q: Quest, p: QuestProgress): boolean {
  return p.step >= q.steps.length;
}

/** Quests this NPC could offer to someone with this log and level. */
export function availableFrom(npcId: string, log: QuestLog, level: number): Quest[] {
  return QUESTS.filter(
    (q) =>
      q.giver === npcId &&
      level >= q.level &&
      !log.done.includes(q.id) &&
      !log.active.some((a) => a.id === q.id) &&
      (q.requires ?? []).every((r) => log.done.includes(r))
  );
}

/** Where to point the player for their current step. */
export function stepTarget(step: QuestStep): { x: number; y: number } | null {
  if (step.type === "talk") {
    const npc = NPCS.find((n) => n.id === step.npc);
    return npc ? { x: npc.x, y: npc.y } : null;
  }
  if (step.type === "visit") return { x: step.x, y: step.y };
  return step.hint ?? null;
}
