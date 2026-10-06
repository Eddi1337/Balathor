// Quest definitions. Steps run in order; when the last step is done the quest is "ready" and
// you hand it in to the giver (or `turnIn`) for the rewards.

import type { Biome } from "../world/overworld";
import { NPCS } from "./npcs";
import { bossSpot } from "../world/landmarks";

export type QuestStep =
  | { type: "talk"; npc: string; text: string }
  | { type: "kill"; mobs: string[]; biome?: Biome; count: number; text: string; hint?: { x: number; y: number } }
  | { type: "collect"; item: string; count: number; text: string; hint?: { x: number; y: number } }
  | { type: "visit"; x: number; y: number; r: number; text: string; map?: string };

export interface QuestReward {
  xp: number;
  gold: number;
  items?: { tpl: string; qty?: number; rarity?: "common" | "uncommon" | "rare" | "epic" }[];
  /** A random piece of class-appropriate gear of at least this rarity. */
  gear?: "uncommon" | "rare" | "epic";
  /** A ship for your hangar. */
  ship?: "skiff" | "corvette" | "hauler" | "frigate" | "sloop" | "brig" | "galleon";
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
  /** Jobs can be taken again after you hand them in. */
  repeatable?: boolean;
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

// ── The sci-fi realm ────────────────────────────────────────────────────────

const SCIFI_QUESTS: Quest[] = [
  {
    id: "q_stargate",
    name: "Through the Stargate",
    giver: "npc_astra",
    turnIn: "npc_orla",
    level: 5,
    requires: ["q_welcome"],
    offer: "You've got that look: the one that stares at the stars. The gate's ready. Step through, and report to Station Master Orla on the other side.",
    complete: "A visitor from Hearthmoor! Welcome to Ringforge Station, the friendliest rock in orbit.",
    steps: [
      { type: "visit", map: "station", x: 32, y: 6.5, r: 6, text: "Step through the Stargate" },
      { type: "talk", npc: "npc_orla", text: "Report to Station Master Orla" }
    ],
    reward: { xp: 220, gold: 60 }
  },
  {
    id: "q_wings",
    name: "Get Your Wings",
    giver: "npc_orla",
    level: 5,
    requires: ["q_stargate"],
    offer: "Nobody gets far out here on foot. Pax keeps a loaner skiff for new pilots. Go say hello, then come back and I'll sign it over.",
    complete: "The Bumblebee Skiff is yours. She's small, but she's brave. Launch from the hangar pad to the south!",
    steps: [
      { type: "talk", npc: "npc_pax", text: "Ask Pax about the loaner skiff" },
      { type: "talk", npc: "npc_orla", text: "Return to Station Master Orla" }
    ],
    reward: { xp: 150, gold: 0, ship: "skiff" }
  },
  {
    id: "q_first_flight",
    name: "First Flight",
    giver: "npc_orla",
    level: 5,
    requires: ["q_wings"],
    offer: "Take her out! Fly to the beacon just south of the station, then crack a few asteroids in the South Belt. Bring me 4 Ferrite Ore.",
    complete: "Smooth flying! And look at that ore. You're a natural.",
    steps: [
      { type: "visit", map: "space", x: 0, y: 70, r: 14, text: "Launch and fly to the beacon south of Ringforge" },
      { type: "collect", item: "ore_ferrite", count: 4, text: "Mine Ferrite Ore in the South Belt", hint: { x: 40, y: 230 } },
      { type: "talk", npc: "npc_orla", text: "Return to Station Master Orla" }
    ],
    reward: { xp: 320, gold: 90, items: [{ tpl: "repair_kit", qty: 3 }] }
  },
  {
    id: "q_pirates",
    name: "Pirate Problem",
    giver: "npc_orla",
    level: 7,
    requires: ["q_first_flight"],
    offer: "Pirate fighters keep jumping our miners on the Kestrel lane and in the belts. Teach six of them some manners.",
    complete: "The miners are cheering on every channel. Thank you, pilot.",
    steps: [
      { type: "kill", mobs: ["pirate_fighter"], count: 6, text: "Shoot down Pirate Fighters", hint: { x: -330, y: -50 } },
      { type: "talk", npc: "npc_orla", text: "Return to Station Master Orla" }
    ],
    reward: { xp: 560, gold: 160, gear: "uncommon" }
  },
  {
    id: "q_freight",
    name: "Courier Run: Kestrel Harbor",
    giver: "npc_orla",
    level: 8,
    requires: ["q_first_flight"],
    offer: "I've a crate of sealed freight for Kestrel Harbor, way out west. Fly it there (warp with J once you've seen the place) and come back.",
    complete: "Delivered and signed for. Kestrel says thanks, and so do I.",
    steps: [
      { type: "visit", map: "space", x: -560, y: -90, r: 24, text: "Deliver the freight to Kestrel Harbor" },
      { type: "talk", npc: "npc_orla", text: "Return to Station Master Orla" }
    ],
    reward: { xp: 480, gold: 240 }
  },
  {
    id: "q_salvage",
    name: "Power to the Workshop",
    giver: "npc_nova",
    level: 8,
    requires: ["q_first_flight"],
    offer: "The fabricator's running on fumes. The wrecks drifting in the Derelict Helix still have power cores in them. Bring me two?",
    complete: "Ooh, these are still warm! The fabricator will purr for weeks.",
    steps: [
      { type: "collect", item: "salvage_core", count: 2, text: "Salvage power cores in the Derelict Helix", hint: { x: -430, y: 420 } },
      { type: "talk", npc: "npc_nova", text: "Return to Engineer Nova" }
    ],
    reward: { xp: 520, gold: 140, items: [{ tpl: "repair_kit", qty: 4 }] }
  },
  {
    id: "q_vex",
    name: "The Scourge of the Lanes",
    giver: "npc_orla",
    level: 20,
    requires: ["q_pirates"],
    offer: "Captain Vex runs the Pirate Haven out east. Every raid traces back to her flagship. Bring friends, and end this.",
    complete: "Vex's flagship is space dust. The lanes are safe. Ringforge owes you everything.",
    steps: [
      { type: "kill", mobs: ["boss_vex"], count: 1, text: "Defeat Captain Vex at the Pirate Haven", hint: { x: 640, y: 120 } },
      { type: "talk", npc: "npc_orla", text: "Return to Station Master Orla" }
    ],
    reward: { xp: 2600, gold: 900, gear: "epic" }
  },
  {
    id: "q_survey",
    name: "Planetfall",
    giver: "npc_orla",
    level: 9,
    requires: ["q_first_flight"],
    offer: "Three worlds orbit out here: Aurelia, Icefall and Rust. Fly to Aurelia, land on it (E near the planet) and say hello to Ranger Fern for me.",
    complete: "You've walked on another world! Fern says you've got good boots.",
    steps: [
      { type: "visit", map: "space", x: 290, y: -150, r: 60, text: "Fly into orbit around Aurelia" },
      { type: "talk", npc: "npc_fern", text: "Land on Aurelia and meet Ranger Fern" },
      { type: "talk", npc: "npc_orla", text: "Return to Station Master Orla" }
    ],
    reward: { xp: 700, gold: 180 }
  },
  {
    id: "q_aurelia",
    name: "Too Many Teeth",
    giver: "npc_fern",
    level: 10,
    offer: "Glowfangs have been circling my camp. They're pretty, but they keep eating my boots. Thin the pack: five should do.",
    complete: "Peace and quiet at last. And my boots are safe!",
    steps: [
      { type: "kill", mobs: ["glowfang"], count: 5, text: "Drive off Glowfangs" },
      { type: "talk", npc: "npc_fern", text: "Return to Ranger Fern" }
    ],
    reward: { xp: 950, gold: 220, gear: "uncommon" }
  },
  {
    id: "q_maw",
    name: "The Verdant Maw",
    giver: "npc_fern",
    level: 14,
    requires: ["q_aurelia"],
    offer: "Something huge lives in the south-west jungle. It swallowed a survey drone whole. Could you... get the drone back?",
    complete: "You beat the Maw! The drone's a little slimy, but it still works.",
    steps: [
      { type: "kill", mobs: ["boss_maw"], count: 1, text: "Defeat the Verdant Maw" },
      { type: "talk", npc: "npc_fern", text: "Return to Ranger Fern" }
    ],
    reward: { xp: 1600, gold: 420, gear: "rare" }
  },
  {
    id: "q_icefall",
    name: "Song of the Shards",
    giver: "npc_tundra",
    level: 14,
    offer: "Shardlings are swarming the crystal fields, and the Blue Shardline has started humming. Clear four of them and take a reading at the Shardline.",
    complete: "The readings are beautiful. The crystals are... singing? Science!",
    steps: [
      { type: "kill", mobs: ["shardling"], count: 4, text: "Shatter Shardlings" },
      { type: "visit", map: "planet:icefall", x: -62, y: 40, r: 9, text: "Take a reading at the Blue Shardline" },
      { type: "talk", npc: "npc_tundra", text: "Return to Surveyor Tundra" }
    ],
    reward: { xp: 1400, gold: 300, gear: "uncommon" }
  },
  {
    id: "q_glacier",
    name: "Heart of Ice",
    giver: "npc_tundra",
    level: 18,
    requires: ["q_icefall"],
    offer: "The Shardline's song comes from the Glacier Heart to the south-east. It's growing. Please make it stop growing.",
    complete: "The ice is quiet again. Thank you, brave pilot.",
    steps: [
      { type: "kill", mobs: ["boss_glacier"], count: 1, text: "Shatter the Glacier Heart" },
      { type: "talk", npc: "npc_tundra", text: "Return to Surveyor Tundra" }
    ],
    reward: { xp: 2200, gold: 520, gear: "rare" }
  },
  {
    id: "q_rust",
    name: "Ridge Signal",
    giver: "npc_rusty",
    level: 18,
    offer: "The old relay ridge started pinging again. Go take a look, and clear out the skitters nesting around it while you're there.",
    complete: "The relay's sending coordinates... to the Pirate Haven. Better tell Orla!",
    steps: [
      { type: "visit", map: "planet:rust", x: 82, y: -40, r: 10, text: "Scan the Relay Ridge" },
      { type: "kill", mobs: ["dune_skitter"], count: 4, text: "Clear Dune Skitters near the relay" },
      { type: "talk", npc: "npc_rusty", text: "Return to Prospector Rusty" }
    ],
    reward: { xp: 2000, gold: 420, gear: "rare" }
  },
  {
    id: "q_leviathan",
    name: "Something Under the Sand",
    giver: "npc_rusty",
    level: 22,
    requires: ["q_rust"],
    offer: "The dunes to the north-east are moving. Sand doesn't move like that on its own. It's the Leviathan. Good luck!",
    complete: "You... beat the Leviathan? I'm naming a dune after you.",
    steps: [
      { type: "kill", mobs: ["boss_leviathan"], count: 1, text: "Defeat the Dune Leviathan" },
      { type: "talk", npc: "npc_rusty", text: "Return to Prospector Rusty" }
    ],
    reward: { xp: 3000, gold: 700, gear: "epic" }
  },
  // ── Tech Labs ─────────────────────────────────────────────────────────────
  {
    id: "q_lab1",
    name: "Lab I: Unplug the Overseer",
    giver: "npc_quill",
    level: 10,
    requires: ["q_stargate"],
    offer: "My security robots got a teeny bit... sentient. Take the first lift down to the Robotics lab and switch off Overseer Mk I. Gently!",
    complete: "It's off! Ooh, it left a power core. Keep it, you earned it.",
    steps: [
      { type: "kill", mobs: ["overseer_1"], count: 1, text: "Defeat Overseer Mk I in Tech Lab I" },
      { type: "talk", npc: "npc_quill", text: "Return to Dr. Quill" }
    ],
    reward: { xp: 1300, gold: 320, gear: "rare" }
  },
  {
    id: "q_lab2",
    name: "Lab II: Cold Logic",
    giver: "npc_quill",
    level: 18,
    requires: ["q_lab1"],
    offer: "Overseer Mk II has frozen the cryo vaults solid, with my lunch inside. Lift two, please. Hurry, it's a sandwich.",
    complete: "My sandwich! And the vaults are thawing. You're a hero.",
    steps: [
      { type: "kill", mobs: ["overseer_2"], count: 1, text: "Defeat Overseer Mk II in Tech Lab II" },
      { type: "talk", npc: "npc_quill", text: "Return to Dr. Quill" }
    ],
    reward: { xp: 2400, gold: 560, gear: "rare" }
  },
  {
    id: "q_lab3",
    name: "Lab III: The Core",
    giver: "npc_quill",
    level: 26,
    requires: ["q_lab2"],
    offer: "Mk III is in the Core, rewriting itself faster than I can read. This is the big one. Bring friends, and bring snacks.",
    complete: "The Core is quiet. I'll... maybe stick to toasters from now on.",
    steps: [
      { type: "kill", mobs: ["overseer_3"], count: 1, text: "Defeat Overseer Mk III in Tech Lab III" },
      { type: "talk", npc: "npc_quill", text: "Return to Dr. Quill" }
    ],
    reward: { xp: 4200, gold: 1000, gear: "epic" }
  },
  // ── Orla's job board (repeatable) ─────────────────────────────────────────
  {
    id: "j_freight",
    name: "Job: Kestrel Freight",
    giver: "npc_orla",
    level: 9,
    requires: ["q_freight"],
    repeatable: true,
    offer: "Another crate for Kestrel Harbor. Same deal as before: fly it out, come back, get paid.",
    complete: "Signed, sealed, delivered. Here's your fee.",
    steps: [
      { type: "visit", map: "space", x: -560, y: -90, r: 24, text: "Deliver freight to Kestrel Harbor" },
      { type: "talk", npc: "npc_orla", text: "Collect your fee from Orla" }
    ],
    reward: { xp: 320, gold: 170 }
  },
  {
    id: "j_bounty",
    name: "Job: Pirate Bounty",
    giver: "npc_orla",
    level: 9,
    requires: ["q_pirates"],
    repeatable: true,
    offer: "Standing bounty: five pirate fighters, any lane. The miners chip in for this one.",
    complete: "Bounty verified. The miners send their thanks (and coin).",
    steps: [
      { type: "kill", mobs: ["pirate_fighter"], count: 5, text: "Shoot down Pirate Fighters" },
      { type: "talk", npc: "npc_orla", text: "Collect your bounty from Orla" }
    ],
    reward: { xp: 420, gold: 210 }
  },
  {
    id: "j_titanium",
    name: "Job: Titanium Order",
    giver: "npc_nova",
    level: 12,
    requires: ["q_salvage"],
    repeatable: true,
    offer: "The fabricator always needs titanium. Six ore from the Ember Belt or Rust, and I'll pay above market.",
    complete: "Lovely shiny ore. Pleasure doing business!",
    steps: [
      { type: "collect", item: "ore_titanium", count: 6, text: "Mine Titanium Ore (Ember Belt or Rust)" },
      { type: "talk", npc: "npc_nova", text: "Bring it to Engineer Nova" }
    ],
    reward: { xp: 520, gold: 320 }
  }
];

QUESTS.push(...SCIFI_QUESTS);

// ── The ocean ───────────────────────────────────────────────────────────────

const OCEAN_QUESTS: Quest[] = [
  {
    id: "q_seafarer",
    name: "The Seafarer Cave",
    giver: "npc_pete",
    turnIn: "npc_marlow",
    level: 8,
    requires: ["q_welcome"],
    offer: "Ye've got sea in yer eyes, I can tell. Go through the cave. At the end ye'll find Port Bilgewater. Tell Captain Marlow old Pete sent ye.",
    complete: "Pete sent ye? Ha! Then ye must be trouble. Good. I like trouble.",
    steps: [
      { type: "visit", map: "ocean", x: 0, y: 0, r: 34, text: "Find Port Bilgewater through the Seafarer Cave" },
      { type: "talk", npc: "npc_marlow", text: "Find Captain Marlow" }
    ],
    reward: { xp: 520, gold: 80 }
  },
  {
    id: "q_sea_legs",
    name: "Sea Legs",
    giver: "npc_marlow",
    level: 8,
    requires: ["q_seafarer"],
    offer: "A sailor without a ship is just a person standing on a pier. I've an old sloop going spare. Tell Harbourmaster Finn to ready her, then come back.",
    complete: "The Driftwood Sloop is yours. Board her at the pier, take the wheel at the stern, and mind the wind!",
    steps: [
      { type: "talk", npc: "npc_finn", text: "Speak to Harbourmaster Finn at the pier" },
      { type: "talk", npc: "npc_marlow", text: "Return to Captain Marlow" }
    ],
    reward: { xp: 220, gold: 0, ship: "sloop" }
  },
  {
    id: "q_turtle_cove",
    name: "Maiden Voyage",
    giver: "npc_marlow",
    level: 9,
    requires: ["q_sea_legs"],
    offer: "Take her out! Sail south-west to Turtle Cove. There's a hermit there who knows every current in these waters.",
    complete: "A visitor! By boat! Oh, how exciting. Marlow sent you? Then you're a friend.",
    steps: [
      { type: "visit", map: "ocean", x: -390, y: 300, r: 40, text: "Sail to Turtle Cove" },
      { type: "talk", npc: "npc_bo", text: "Find Hermit Bo on the island" }
    ],
    turnIn: "npc_bo",
    reward: { xp: 760, gold: 160 }
  },
  {
    id: "q_sink",
    name: "Black Sails",
    giver: "npc_marlow",
    level: 11,
    requires: ["q_sea_legs"],
    offer: "Gristle's sloops have been raiding our fishing boats. Take the wheel and give 'em a broadside or three. Sink three of them.",
    complete: "Three pirate sloops at the bottom of the sea! The fishers will sing about this.",
    steps: [
      { type: "kill", mobs: ["pirate_sloop"], count: 3, text: "Sink Pirate Sloops" },
      { type: "talk", npc: "npc_marlow", text: "Return to Captain Marlow" }
    ],
    reward: { xp: 1100, gold: 280, gear: "rare" }
  },
  {
    id: "q_xmarks",
    name: "X Marks the Spot",
    giver: "npc_marlow",
    level: 12,
    requires: ["q_sink"],
    offer: "Pirates carry scraps of treasure maps. Collect three, and they'll point to Smuggler's Rest. Dig at the X!",
    complete: "Ye found it! Keep the loot. Well, most of it.",
    steps: [
      { type: "collect", item: "treasure_map_piece", count: 3, text: "Collect Treasure Map Scraps from pirates" },
      { type: "visit", map: "ocean", x: 306.5, y: 416.5, r: 4, text: "Find the X on Smuggler's Rest" },
      { type: "talk", npc: "npc_marlow", text: "Return to Captain Marlow" }
    ],
    reward: { xp: 1300, gold: 520 }
  },
  {
    id: "q_gristle",
    name: "Dread Captain Gristle",
    giver: "npc_marlow",
    level: 22,
    requires: ["q_sink"],
    offer: "It's time. Gristle holds Skull Isle, far to the north-east. Gather a crew, sail out, and end his reign of terror.",
    complete: "Gristle's beaten! Port Bilgewater is free! Here, take my old coat. You've earned it.",
    steps: [
      { type: "kill", mobs: ["boss_gristle"], count: 1, text: "Defeat Dread Captain Gristle on Skull Isle" },
      { type: "talk", npc: "npc_marlow", text: "Return to Captain Marlow" }
    ],
    reward: { xp: 3200, gold: 900, gear: "epic", items: [{ tpl: "coat_captain", rarity: "rare" }] }
  },
  {
    id: "q_kraken",
    name: "Release the Kraken? No, Defeat It",
    giver: "npc_marlow",
    level: 24,
    requires: ["q_gristle"],
    offer: "One last thing. Something huge lives in the Maw, far to the north-west. It eats ships. I'd like it to stop eating ships.",
    complete: "The Kraken! Defeated! I'll be telling this story until I'm a hundred.",
    steps: [
      { type: "kill", mobs: ["boss_kraken"], count: 1, text: "Defeat the Kraken in Kraken's Maw" },
      { type: "talk", npc: "npc_marlow", text: "Return to Captain Marlow" }
    ],
    reward: { xp: 3800, gold: 1200, gear: "epic" }
  },
  {
    id: "j_shells",
    name: "Shells for Bo",
    giver: "npc_bo",
    level: 9,
    repeatable: true,
    offer: "I'm building a shell castle. It needs more shells. It always needs more shells. Eight, please?",
    complete: "Ooh, that's a lovely spiral one. Here, a little something from my pearl jar.",
    steps: [
      { type: "collect", item: "seashell", count: 8, text: "Collect Seashells (crabs and turtles drop them)" },
      { type: "talk", npc: "npc_bo", text: "Bring them to Hermit Bo" }
    ],
    reward: { xp: 380, gold: 120, items: [{ tpl: "pearl" }] }
  }
];

QUESTS.push(...OCEAN_QUESTS);

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
      (q.repeatable || !log.done.includes(q.id)) &&
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
