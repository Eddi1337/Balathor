// Town NPCs, their daily routines and their shops. Positions are overworld tile coords
// (see town.ts). Hours are in-game hours (0-24).

import { doorFront, nearestHouses } from "../world/city";
import { ALCOVES, LIFTS, LAUNCH_PAD } from "../world/scifi/station";
import { ISLES_BY_ID, landNear, portDoor } from "../world/sea/ocean";
import { CASTLE_PORTALS, THRONE_ROOM } from "../world/housing";

export type NpcRole = "shop" | "guide" | "guard" | "villager";

const bo = landNear(ISLES_BY_ID.turtle.x + 2, ISLES_BY_ID.turtle.y + 2);

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
  hat: "none" | "cap" | "hood" | "wizard" | "helmet" | "chef" | "bow" | "crown" | "tricorn" | "bandana";
  shopId?: string;
  /** Talking opens a special service window instead of a shop. */
  service?: "hangar" | "harbour";
  /** Map the NPC lives on (default: the overworld). */
  map?: string;
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
  furniture: {
    id: "furniture",
    name: "Marta's Workshop",
    greeting: "Handmade furniture for handmade lives! Own a home? Press H inside it to decorate.",
    stock: ["bed", "table", "chair", "sofa", "rug", "bookshelf", "fireplace", "plant", "lantern", "painting", "cabinet", "weapon_rack", "trophy", "chest", "cat"].map((id) => ({
      tpl: `furn_${id}`,
      price: ({ bed: 120, table: 70, chair: 30, sofa: 140, rug: 50, bookshelf: 110, fireplace: 220, plant: 25, lantern: 45, painting: 90, cabinet: 80, weapon_rack: 130, trophy: 160, chest: 150, cat: 300 } as Record<string, number>)[id]
    }))
  },
  tools: {
    id: "tools",
    name: "Bram's Tackle & Tools",
    greeting: "Everything a gatherer needs! Tools go in your bag; gather with E near trees, rocks, flowers or water.",
    stock: [
      { tpl: "tool_hatchet", price: 40 },
      { tpl: "tool_pickaxe", price: 40 },
      { tpl: "tool_sickle", price: 40 },
      { tpl: "tool_rod", price: 40 },
      { tpl: "fish_minnow", price: 6 },
      { tpl: "herb_grain", price: 4 }
    ]
  },
  tech: {
    id: "tech",
    name: "Ix's Quartermastery",
    greeting: "Ion edges, plasma strings, nano-weave. Field-tested on pirates, mostly.",
    stock: [
      { tpl: "bow_plasma", rarity: "uncommon", lvl: 10, price: 720 },
      { tpl: "staff_ion", rarity: "uncommon", lvl: 10, price: 720 },
      { tpl: "blade_arc", rarity: "uncommon", lvl: 10, price: 720 },
      { tpl: "suit_flight", rarity: "uncommon", lvl: 10, price: 640 },
      { tpl: "ring_quantum", rarity: "common", lvl: 10, price: 560 },
      { tpl: "repair_kit", price: 30 },
      { tpl: "potion_big", price: 40 }
    ]
  },
  cafe: {
    id: "cafe",
    name: "Orbit Beans",
    greeting: "Bloop! Fresh from the hydroponics deck. Snacks give you a buff, bloop.",
    stock: [
      { tpl: "food_star_latte", price: 25 },
      { tpl: "food_nebula_noodles", price: 48 },
      { tpl: "food_jelly_tart", price: 64 }
    ]
  },
  tavern: {
    id: "tavern",
    name: "The Salty Barnacle",
    greeting: "Arr, what'll it be? Grog for the legs, stew for the belly!",
    stock: [
      { tpl: "food_grog", price: 18 },
      { tpl: "food_fish_stew", price: 46 },
      { tpl: "potion_big", price: 40 }
    ]
  },
  port_store: {
    id: "port_store",
    name: "Pim's Provisions",
    greeting: "Everything a sailor needs, and a few things they don't!",
    stock: [
      { tpl: "cutlass", rarity: "uncommon", lvl: 12, price: 760 },
      { tpl: "musket_bow", rarity: "uncommon", lvl: 12, price: 760 },
      { tpl: "coral_staff", rarity: "uncommon", lvl: 12, price: 760 },
      { tpl: "coat_captain", rarity: "uncommon", lvl: 12, price: 700 },
      { tpl: "tool_rod", price: 40 },
      { tpl: "potion_small", price: 10 }
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

// Villagers' homes: ordinary houses nearest the market square.
const HOMES = nearestHouses(0, 90, 12, (h) => h.tier === 0);
const home = (i: number) => HOMES[i % HOMES.length]?.id ?? "inn";
const spot = (id: string, d = 1.6) => doorFront(id, d);

function guard(id: string, name: string, x: number, y: number, lines: string[], map?: string): NpcDef {
  return { id, name, role: "guard", x, y, wander: map ? 0 : 2, body: "#5b8def", accent: "#d9dde6", hat: "helmet", lines, map };
}

function gatePost(angle: number, r: number): { x: number; y: number } {
  return { x: Math.cos(angle) * r + 0.5, y: Math.sin(angle) * r + 0.5 };
}

const DEG = Math.PI / 180;
const NG = gatePost(270 * DEG, 98);
const EG = gatePost(0, 98);
const SG = gatePost(90 * DEG, 99);
const WG = gatePost(180 * DEG, 98);

export const NPCS: NpcDef[] = [
  {
    id: "npc_pip", name: "Pip", role: "shop", ...spot("store"), wander: 0.6,
    body: "#ffb3c7", accent: "#fff1e0", hat: "chef", shopId: "provisions",
    lines: ["Berry Tonics, fresh today!", "Stay hydrated out there~", "Ooh, is that slime gel? I'll buy it!"],
    schedule: [at("store", 6, 19, 0.6), at("inn", 19, 22, 1.5, false, "enjoying a cocoa at the inn"), at(home(0), 22, 6, 0, true)]
  },
  {
    id: "npc_brunhild", name: "Brunhild", role: "shop", ...spot("smithy"), wander: 0.6,
    body: "#c0703f", accent: "#3b3b3b", hat: "none", shopId: "smithy",
    lines: ["Clang clang clang!", "A good blade is a happy blade.", "Bring me shiny pebbles sometime."],
    schedule: [at("smithy", 6, 19, 0.6), at("inn", 19, 23, 1.5, false, "arm-wrestling at the inn"), at(home(1), 23, 6, 0, true)]
  },
  {
    id: "npc_rin", name: "Guide Rin", role: "guide", x: 6.5, y: 94.5, wander: 1.5,
    body: "#6fd3c4", accent: "#fff4c2", hat: "cap",
    lines: [
      "Welcome to Hearthmoor, the White City! WASD to walk, click to attack, Space to jump.",
      "The streets climb the hill ring by ring. The King's castle sits at the very top!",
      "The portals to other worlds are in the castle: a Stargate to the stars and a sea portal to Port Bilgewater.",
      "The fields and forests outside the walls are gentle. The further you roam, the tougher things get!",
      "Press I for your bag, C for your character, T for talents and L for quests."
    ],
    schedule: [{ from: 6, to: 23, x: 6.5, y: 94.5, wander: 1.5 }, at("inn", 23, 6, 0, true)]
  },
  {
    id: "npc_marigold", name: "Innkeeper Marigold", role: "villager", ...spot("inn", 2.2), wander: 1.2,
    body: "#c98bd8", accent: "#fff1e0", hat: "none",
    lines: ["The Sleepy Slime has the softest beds in the city.", "Rooms open soon, dear!"],
    schedule: [at("inn", 7, 24, 1.2), at("inn", 0, 7, 0, true)]
  },
  {
    id: "npc_oswin", name: "Guildmaster Oswin", role: "villager", ...spot("guild"), wander: 1.2,
    body: "#f2b950", accent: "#5a3a1e", hat: "wizard",
    lines: ["The guild is recruiting! Prove yourself against King Wobble in the fields.", "The King himself posts bounties on the island's champions."],
    schedule: [at("guild", 8, 19, 1.2), at("inn", 19, 23, 1.5, false, "telling tall tales at the inn"), at("guild", 23, 8, 0, true)]
  },
  guard("npc_guard_n", "Guard Torin", NG.x, NG.y, ["North gate's clear. The frost lies beyond the forest.", "Watch for wisps."]),
  guard("npc_guard_e", "Guard Mira", EG.x, EG.y, ["The east road leads to the dunes.", "Stay sharp."]),
  guard("npc_guard_s", "Guard Fen", SG.x - 6, SG.y, ["Welcome to the White City, traveller!", "South is swampland, past the forest. Mind your boots."]),
  guard("npc_guard_w", "Guard Bren", WG.x, WG.y, ["The west road climbs to the highlands.", "Wolves up there. Big ones."]),
  guard("npc_warden_1", "Gatewarden Aldo", ...Object.values(gatePost(135 * DEG, 85.5)) as [number, number], ["Up to the Artisans' Ring.", "Mind the ramp, it's steep!"]),
  guard("npc_warden_2", "Gatewarden Sela", ...Object.values(gatePost(45 * DEG, 64.5)) as [number, number], ["The Guild Ring lies above.", "Adventurers welcome."]),
  guard("npc_warden_3", "Gatewarden Corvin", ...Object.values(gatePost(135 * DEG, 45.5)) as [number, number], ["The Nobles' Ring. Wipe your boots, please."]),
  guard("npc_warden_4", "Citadel Guard Hale", ...Object.values(gatePost(45 * DEG, 28.5)) as [number, number], ["The Citadel. His Majesty receives visitors in the throne room."]),
  { id: "npc_tilly", name: "Tilly", role: "villager", x: -6, y: 88, wander: 6, body: "#8fc97a", accent: "#fff4e6", hat: "bow", lines: ["Have you seen the fountain sparkle at night?", "I'm going to be a ranger one day!", "Have you been up to the castle? The White Tree glows!"],
    schedule: [{ from: 7, to: 17, x: -6, y: 88, wander: 6 }, at("inn", 17, 20, 2, false, "listening to stories at the inn"), at(home(2), 20, 7, 0, true)] },
  { id: "npc_bramble", name: "Old Bramble", role: "villager", x: -14, y: 90, wander: 4, body: "#9a6b4f", accent: "#e8edf2", hat: "hood", lines: ["Back in my day the slimes were bigger.", "Mind the sunbeams in the forest, they're lovely."],
    schedule: [{ from: 8, to: 18, x: -14, y: 90, wander: 4 }, at("inn", 18, 22, 1.5, false, "napping by the inn fire"), at(home(3), 22, 8, 0, true)] },
  {
    id: "npc_holt", name: "Stable Keeper Holt", role: "shop", ...spot("stable"), wander: 1, body: "#9a6b4f", accent: "#f2d0b4", hat: "cap", shopId: "stable",
    lines: ["Ponies! Get your ponies!", "Press M to hop on once you've got one.", "Ponies don't swim, mind."],
    schedule: [at("stable", 6, 21, 1), at(home(4), 21, 6, 0, true)]
  },
  {
    id: "npc_marta", name: "Marta the Carpenter", role: "shop", ...spot("carpenter"), wander: 0.8, body: "#e98aa8", accent: "#7a5234", hat: "bow", shopId: "furniture",
    lines: ["Every home needs a sleepy cat. Trust me.", "Furniture! Fresh-sanded and lovingly glued.", "Own a home? Press H inside to decorate."],
    schedule: [at("carpenter", 7, 19, 0.8), at("inn", 19, 22, 1.5), at(home(5), 22, 7, 0, true)]
  },
  {
    id: "npc_bram", name: "Fisherman Bram", role: "shop", ...spot("tackle"), wander: 0.8, body: "#5fa8c9", accent: "#ffd166", hat: "cap", shopId: "tools",
    lines: ["Rods, hatchets, sickles, pickaxes! Everything a gatherer needs.", "The lakes past the forest are full of trout.", "Cook your catch at a campfire for a tasty boost."],
    schedule: [at("tackle", 6, 19, 0.8), at("inn", 19, 23, 1.5), at(home(6), 23, 6, 0, true)]
  },
  {
    id: "npc_steward", name: "Steward Willa", role: "villager", x: 4, y: 2, wander: 2, body: "#f4f8ff", accent: "#ffd166", hat: "cap",
    lines: ["The King is in the throne room. Go right in, he loves visitors.", "Isn't the White Tree beautiful?"]
  },
  // The castle's Hall of Portals: a keeper beside each portal.
  {
    id: "npc_astra", name: "Gatekeeper Astra", role: "guide", x: CASTLE_PORTALS.station.x + 2.5, y: CASTLE_PORTALS.station.y + 4.5, wander: 1, body: "#5b6bd6", accent: "#cfe3ff", hat: "wizard", map: "castle:throne",
    lines: ["The Stargate hums day and night. Step up to it and press E to travel to Ringforge Station.", "Up there they fly ships between the stars. Imagine!", "Pack a snack. Space is big."]
  },
  // Ringforge Station.
  { id: "npc_orla", name: "Station Master Orla", role: "guide", ...ALCOVES.master, wander: 1, body: "#3f6fb5", accent: "#ffd166", hat: "cap", map: "station",
    lines: ["Welcome aboard Ringforge! Mind the airlocks.", "Pirates have been raiding the belts again.", "Launch from the hangar pad to the south. Dock again by flying into the station ring and pressing E."] },
  { id: "npc_pax", name: "Pax the Ship Dealer", role: "shop", ...ALCOVES.shipyard, wander: 0.8, body: "#ff8fb1", accent: "#3b2f4a", hat: "cap", map: "station", service: "hangar",
    lines: ["Every ship on my lot is pre-loved and post-loved!", "A Comet Corvette? Excellent taste!", "The Starling Frigate comes with drones. Drones!"] },
  { id: "npc_gears", name: "Gears the Shipwright", role: "shop", ...ALCOVES.shipwright, wander: 0.8, body: "#e0a458", accent: "#5a5f6a", hat: "helmet", map: "station", service: "hangar",
    lines: ["Engines, shields, lasers, plating. I tune 'em all.", "Upgrades apply to every ship you own. Efficient, eh?"] },
  { id: "npc_ix", name: "Quartermaster Ix", role: "shop", ...ALCOVES.quartermaster, wander: 0.6, body: "#7d8a9b", accent: "#5ff6ff", hat: "helmet", map: "station", shopId: "tech",
    lines: ["Hull repair kits. Never leave the hangar without one.", "Gear from out here hits harder than anything on the island."] },
  { id: "npc_bloop", name: "Barista Bloop", role: "shop", ...ALCOVES.cafe, wander: 0.8, body: "#9fe7ff", accent: "#ff8fb1", hat: "chef", map: "station", shopId: "cafe",
    lines: ["Bloop! One Star Latte, extra stars!", "The jelly tarts are made from real star jellies. Ethically scooped."] },
  { id: "npc_nova", name: "Engineer Nova", role: "villager", x: ALCOVES.workshop.x - 1.5, y: ALCOVES.workshop.y - 1, wander: 1, body: "#5fa8c9", accent: "#ffd166", hat: "helmet", map: "station",
    lines: ["The fabricator smelts space ore into bars. Use it with E.", "Titanium from the Ember Belt, iridium from the Void Rift."] },
  { id: "npc_rivet", name: "Dockhand Rivet", role: "villager", x: LAUNCH_PAD.x - 5, y: LAUNCH_PAD.y - 3, wander: 2, body: "#f2b950", accent: "#3b2f4a", hat: "cap", map: "station",
    lines: ["Stand on the pad and press E to launch!", "In space: steer with WASD, fire with F or click, Space to boost, J to warp.", "Docking repairs your hull for free."] },
  { id: "npc_quill", name: "Dr. Quill", role: "guide", x: LIFTS[1].x, y: LIFTS[1].y + 3, wander: 1, body: "#f4f8ff", accent: "#b98cff", hat: "none", map: "station",
    lines: ["The Tech Labs below are... a little haunted by robots. My robots.", "The lifts go down to Labs I, II and III."] },
  guard("npc_sec_1", "Security Officer Kade", 27.5, 8.5, ["Arrivals, this way.", "Keep your weapons holstered on deck."], "station"),
  guard("npc_sec_2", "Security Officer Lin", 36.5, 8.5, ["The Stargate leads back to Hearthmoor.", "All clear."], "station"),
  // Planet guides, waiting by the landing pads.
  { id: "npc_fern", name: "Ranger Fern", role: "guide", x: 4.5, y: 7.5, wander: 1.5, body: "#3fae8a", accent: "#ffd1f0", hat: "hood", map: "planet:aurelia",
    lines: ["Welcome to Aurelia! Everything glows at night. Everything bites, too.", "The glowwood trees make lovely logs.", "Mind the pools. The fish bite back."] },
  { id: "npc_tundra", name: "Surveyor Tundra", role: "guide", x: 4.5, y: 7.5, wander: 1.5, body: "#9fd4f5", accent: "#ffffff", hat: "hood", map: "planet:icefall",
    lines: ["Brr! Welcome to Icefall. Keep moving, it helps.", "The crystals sing when the wind blows.", "Shardlings look like snowmen. They are not snowmen."] },
  { id: "npc_rusty", name: "Prospector Rusty", role: "guide", x: 4.5, y: 7.5, wander: 1.5, body: "#e07a4a", accent: "#ffd166", hat: "cap", map: "planet:rust",
    lines: ["Rust! Red sand, titanium, and things with too many legs.", "The old relay ridge still pings now and then.", "Don't swim in the green lakes. Trust me."] },
  { id: "npc_pete", name: "Old Salt Pete", role: "guide", x: CASTLE_PORTALS.ocean.x - 2.5, y: CASTLE_PORTALS.ocean.y + 4.5, wander: 1, body: "#3f6fb5", accent: "#fff1e6", hat: "tricorn", map: "castle:throne",
    lines: ["That portal smells of salt, it does. Comes out right in Port Bilgewater.", "I sailed the Boundless Ocean for forty years. Kraken took my hat. Twice.", "Press E at the sea portal, if ye dare!"] },
  // Port Bilgewater.
  { id: "npc_marlow", name: "Captain Marlow", role: "guide", ...portDoor("captain"), wander: 1.2, body: "#7b3fbf", accent: "#ffd166", hat: "tricorn", map: "ocean",
    lines: ["Welcome to Port Bilgewater, the finest den of scoundrels on the sea!", "Gristle's pirates grow bolder every tide.", "Every sailor needs a ship. Every ship needs a sailor."] },
  { id: "npc_finn", name: "Harbourmaster Finn", role: "shop", x: 4.5, y: 29.5, wander: 0.8, body: "#e0a458", accent: "#3b2f4a", hat: "cap", map: "ocean", service: "harbour",
    lines: ["Need your ship brought round? Say the word.", "Moor at the pier, mind the barnacles.", "Hold the wheel at the stern with E. Space raises and furls the sails."] },
  { id: "npc_moira", name: "Shipwright Moira", role: "shop", ...portDoor("shipwright"), wander: 0.8, body: "#3f6fb5", accent: "#ffd166", hat: "bandana", map: "ocean", service: "harbour",
    lines: ["A brig's a fine ship. A galleon's a finer one!", "Every hull I build floats. Usually.", "Sail across the wind for the best speed!"] },
  { id: "npc_salty", name: "Barkeep Salty", role: "shop", ...portDoor("tavern"), wander: 0.8, body: "#c95a3a", accent: "#fff1e6", hat: "bandana", map: "ocean", shopId: "tavern",
    lines: ["Grog! Get yer grog!", "Heard the Kraken's been seen near the Maw again.", "Pirates pay in doubloons. Mostly fake ones."] },
  { id: "npc_pim", name: "Provisioner Pim", role: "shop", ...portDoor("provisions"), wander: 0.8, body: "#5fae5a", accent: "#fff1e6", hat: "cap", map: "ocean", shopId: "port_store",
    lines: ["Cutlasses, rods and captain's coats!", "A good coat keeps the spray off."] },
  { id: "npc_bo", name: "Hermit Bo", role: "guide", x: bo.x, y: bo.y, wander: 2, body: "#9a6b4f", accent: "#7fe0a8", hat: "hood", map: "ocean",
    lines: ["Visitors! On Turtle Cove! Mind the turtles, they're napping.", "I collect shells. You collect shells? We should be friends.", "The sea talks, if you listen. Mostly it says 'splash'."] },
  { id: "npc_gull", name: "Dockhand Gully", role: "villager", x: -3.5, y: 34.5, wander: 3, body: "#ffd166", accent: "#3b2f4a", hat: "bandana", map: "ocean",
    lines: ["Ships come and go, I tie the ropes.", "Walk up to your ship at the pier and press E to board."] },
  // Inside the castle.
  { id: "npc_king", name: "King Aldric the Kind", role: "villager", x: THRONE_ROOM.door.x + 0.5, y: 3.6, wander: 0, body: "#7b3fbf", accent: "#ffd166", hat: "crown", map: "castle:throne",
    lines: ["Welcome, welcome! Any friend of Hearthmoor is a friend of mine.", "Our island's champions grow restless. Will you help?", "Have you tried the honey elixirs? Splendid stuff."] },
  guard("npc_royal_1", "Royal Guard", THRONE_ROOM.door.x - 2.5, 5.5, ["Long live the King!", "The portals? West for the stars, east for the sea."], "castle:throne"),
  guard("npc_royal_2", "Royal Guard", THRONE_ROOM.door.x + 3.5, 5.5, ["The King's bounties are posted daily."], "castle:throne")
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
