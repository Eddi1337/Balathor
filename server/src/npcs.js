const WORLD = require("./world");
const { isBlockedCircle } = WORLD;
const { HUB_NPC_ORDER } = require("./hubRoundTown.js");

const NPC_SPEED = 2.0;
const MOVE_INTERVAL_MIN = 3000;
const MOVE_INTERVAL_MAX = 9000;
const CHAT_INTERVAL_MIN = 28000;
const CHAT_INTERVAL_MAX = 70000;

const HUB_POPULATION_TARGET = 100;
const CLASSES_ROT = ["knight", "ranger", "mage"];

/** Cached tile centres for procedural hub walkers */
let _hubNavAnchorsCache = [];

function rebuildHubNavAnchors(navKeys) {
  _hubNavAnchorsCache = [];
  if (!(navKeys instanceof Set) || navKeys.size < 48) return;
  for (const k of navKeys) {
    const [tx, ty] = k.split(",").map(Number);
    _hubNavAnchorsCache.push({ cx: tx + 0.5, cy: ty + 0.5 });
  }
}

function npcIdHashSeed(idStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < idStr.length; i += 1) {
    h ^= idStr.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function hubTileKey(xf, yf) {
  return `${Math.floor(xf)},${Math.floor(yf)}`;
}

/** Grid-aligned hops that stay inside the procedural road mask. */
function steerNpcGridAlongPaths(npc, navSet, step) {
  const dx = npc._targetX - npc.x;
  const dy = npc._targetY - npc.y;
  const dist = Math.hypot(dx, dy);
  if (!(navSet instanceof Set) || navSet.size < 48 || dist < 0.08) {
    return false;
  }
  const ux = dx / dist;
  const uy = dy / dist;
  const CARD = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];
  CARD.sort((a, b) => b[0] * ux + b[1] * uy - (a[0] * ux + a[1] * uy));
  for (const scaler of [1, 0.55]) {
    const s = step * scaler;
    for (const [mx, my] of CARD) {
      const nx = npc.x + mx * s;
      const ny = npc.y + my * s;
      if (navSet.has(hubTileKey(nx, ny))) {
        npc.x = nx;
        npc.y = ny;
        npc.facing = Math.atan2(my, mx);
        npc.moving = true;
        return true;
      }
    }
  }
  return false;
}

function sampleHubPatrolWaypoint(npc, navSet) {
  const pts = _hubNavAnchorsCache;
  if (!(navSet instanceof Set) || pts.length < 60 || npc.patrolRadius < 0.95) {
    return null;
  }
  npc._hubWalkSalt = (((npc._hubWalkSalt ?? npcIdHashSeed(npc.id)) + 982451653) >>> 0) >>> 0;
  const bubble = Number(WORLD.HUB_TOWN_GRASS_RADIUS) || 132;
  const maxSq = Math.min((npc.patrolRadius + 13) ** 2, bubble * bubble);
  const picks = pts.length;

  function jitterSeed(pi) {
    const jx = (npc._hubWalkSalt + pi * 7) % 19;
    const jy = ((npc._hubWalkSalt >>> 11) ^ pi) % 19;
    return {
      tx: pts[pi].cx + jx / 170 - 0.055,
      ty: pts[pi].cy + jy / 170 - 0.055
    };
  }

  for (let t = 0; t < 190; t += 1) {
    const pi = ((npc._hubWalkSalt + t * 1103515245) >>> 0) % picks;
    const q = pts[pi];
    const ddx = q.cx - npc.homeX;
    const ddy = q.cy - npc.homeY;
    if (ddx * ddx + ddy * ddy <= maxSq) {
      return jitterSeed(pi);
    }
  }
  for (let t = 0; t < 120; t += 1) {
    const pi = ((npc._hubWalkSalt + t * 747796405) >>> 0) % picks;
    const q = pts[pi];
    const ddx = q.cx - npc.x;
    const ddy = q.cy - npc.y;
    if (ddx * ddx + ddy * ddy <= (npc.patrolRadius + 36) ** 2) {
      return jitterSeed(pi);
    }
  }
  return null;
}

const MINGLE_DIALOGUE_POOL = Object.freeze([
  "Mind the carts — dripped wax everywhere.",
  "Heard someone lost a pouch near the fountains.",
  "The east ring's packed today!",
  "Pass the salt gossip, will you?",
  "They say the baker's apprentice eloped.",
  "If you sniff smoke, that's just the smith flirting with trouble.",
  "Keep to the pavers — ankles hate mud.",
  "Wall bell rang twice — must be supper soon.",
  "Caravan rumours are ninety percent cloak-lint.",
  "My boots still smell like last week's rain.",
  "Could use a quieter corner and a sharper cheese.",
  "They paved another spoke — marvellous dust.",
]);

const SEEK_GF_CHAT = Object.freeze([
  "Your boots pause like someone's planning shelves.",
  "Three quiet seconds beside you and I'd risk a rhyme.",
  "Homestead rumours travel fast — you'd make them kinder.",
  "If you tucked me by your hearth, I'd mind the mugs.",
]);

const SEEK_BF_CHAT = Object.freeze([
  "Stillness suits you — mind if I lean into it?",
  "I've got clumsy bravery and nowhere to stash it tonight.",
  "Stand there a heartbeat longer?",
  "If you whisper where you tuck your cloak, I'd meet you halfway.",
]);

function buildHydratedHubNpcExtras() {
  const navKeys = WORLD.HUB_NAV_PATH_KEYS instanceof Set ? WORLD.HUB_NAV_PATH_KEYS : null;
  rebuildHubNavAnchors(navKeys || new Set());
  /** @type {any[]} */
  const out = [];
  const roadside = WORLD.HUB_ROADSIDE_FEATURES || [];

  /** Procedural stall vendors (+2×1 stand footprint in hubRoundTown) */
  for (const rs of roadside) {
    if (rs.kind !== "market_stand") continue;
    const vid =
      typeof rs.vendorNpcId === "string"
        ? rs.vendorNpcId
        : `hub_vendor_${typeof rs.id === "string" ? rs.id : `${rs.x}_${rs.y}`}`;
    const nx = rs.x | 0;
    const ny = rs.y | 0;
    const stallHue = ((((nx * 79) ^ (ny * 131)) >>> 0) % 0x666650) + 0x393028;
    out.push({
      id: vid,
      name: "Stall Trader",
      classId: "ranger",
      primary: `#${(stallHue & 0xffffff).toString(16).padStart(6, "0")}`,
      accent: "#ddb66a",
      homeX: nx + 1,
      homeY: ny + 0.38,
      patrolRadius: 0,
      isTrader: true,
      dialogue: [
        "Two tiles of shade, honest coin.",
        "Spices cooled overnight — sweetest deal before noon.",
        "Browse slow; I pack faster than I chatter.",
        "Need thread, ink, luck? Mixed bag today.",
      ]
    });
  }

  const baseCount = BASE_NPC_DEFINITIONS.length;
  const extrasSoFar = out.length;
  const crowdBudget = Math.max(0, HUB_POPULATION_TARGET - baseCount - extrasSoFar);
  const seekersPlanned = Math.min(crowdBudget, Math.max(48, Math.floor(HUB_POPULATION_TARGET * 0.55)));
  const minglersTotal = crowdBudget - seekersPlanned;

  /** @type {{ cx: number, cy: number }[]} */
  const homes = [..._hubNavAnchorsCache];
  function pickHome(ix, bannedSet) {
    if (!homes.length || !bannedSet) return null;
    for (let t = 0; t < 240; t += 1) {
      const ti = (((ix * 193) >>> 0) + t * 514229) >>> 0;
      const p = homes[ti % homes.length];
      const k = `${Math.floor(p.cx)},${Math.floor(p.cy)}`;
      if (!bannedSet.has(k)) {
        bannedSet.add(k);
        return { cx: p.cx, cy: p.cy, key: k };
      }
    }
    return null;
  }

  const homeBanned = new Set();

  /** Extra romance-seekers circulating the paths */
  for (let si = 0; si < seekersPlanned; si += 1) {
    const id = `hub_seek_${si}`;
    /** Bias toward more girlfriend solicitations */
    const gf = si % 3 !== 2;
    const spot = pickHome(si + 1200, homeBanned);
    if (!spot) break;
    const seed = npcIdHashSeed(`${id}_${spot.key}`);
    const primHue = ((((seed >>> 3) ^ 0x8899aa) >>> 0) % 0xababab) + 0x303040;
    out.push({
      id,
      name: gf ? `Seeker ${si + 1}` : `Suit ${si + 1}`,
      classId: CLASSES_ROT[seed % CLASSES_ROT.length],
      primary: `#${(primHue & 0xffffff).toString(16).padStart(6, "0")}`,
      accent: gf ? "#fbcfe8" : "#fde68a",
      homeX: spot.cx + ((seed % 7) / 130 - 0.026),
      homeY: spot.cy + ((((seed >>> 9) % 7) >>> 0) / 130 - 0.026),
      patrolRadius: 26 + ((seed >>> 13) % 15),
      courtPlayer: true,
      companionPrice: 438 + (((seed >>> 17) % 41) >>> 0) + (gf ? 0 : 2),
      bondTag: gf ? "gf" : "bf",
      dialogue: gf ? [...SEEK_GF_CHAT] : [...SEEK_BF_CHAT]
    });
  }

  /** General crowd without romance hooks */
  for (let mi = 0; mi < minglersTotal; mi += 1) {
    const id = `hub_m_${mi}`;
    const spot = pickHome(mi + 9000, homeBanned);
    if (!spot) break;
    const seed = npcIdHashSeed(`${id}_${spot.key}`);
    out.push({
      id,
      name: `Townsfolk ${mi + 1}`,
      classId: CLASSES_ROT[(seed >>> 5) % CLASSES_ROT.length],
      primary: `#${(
        ((((seed >>> 2) ^ (mi << 11)) >>> 0) % 0xc0c0b0) +
        0x252528
      )
        .toString(16)
        .padStart(6, "0")
        .slice(-6)}`,
      accent: ((seed >>> 17) % 2) >>> 0 ? "#a8cfe8" : "#e8cfa8",
      homeX: spot.cx + ((((seed >>> 13) % 5) >>> 0) / 220 - 0.016),
      homeY: spot.cy + ((((seed >>> 19) % 5) >>> 0) / 220 - 0.016),
      patrolRadius: 18 + (((seed >>> 23) % 18) >>> 0),
      dialogue: [...MINGLE_DIALOGUE_POOL.slice(0, Math.min(MINGLE_DIALOGUE_POOL.length, 6))]
    });
  }

  return out;
}

const BASE_NPC_DEFINITIONS = [
  // --- North Village ---
  {
    id: "npc_mara", name: "Innkeeper Mara",
    classId: "knight", primary: "#8b4513", accent: "#d4a574",
    homeX: 11, homeY: -65, patrolRadius: 7,
    dialogue: [
      "A warm fire and a hot meal await you inside!",
      "The inn is open to all weary travellers.",
      "I heard strange sounds from the ruins last night...",
      "Trade has been good this season, thank the stars.",
      "Have you met old Thomas? He tells the strangest tales.",
    ],
  },
  {
    id: "npc_thomas", name: "Old Thomas",
    classId: "mage", primary: "#4a3728", accent: "#c8a86b",
    homeX: -10, homeY: -65, patrolRadius: 11,
    dialogue: [
      "The stars speak of change on the horizon.",
      "I have walked these paths for forty years.",
      "The ancient halls to the west hold secrets beyond imagining.",
      "The east market has the finest goods this side of the mountains.",
      "A wise traveller rests before venturing into the deep forest.",
    ],
  },
  {
    id: "npc_dale", name: "Merchant Dale",
    classId: "ranger", primary: "#5a4a35", accent: "#c8a86b",
    homeX: 0, homeY: -62, patrolRadius: 8,
    isTrader: true,
    dialogue: [
      "Finest wares from across the realm, step right up!",
      "Business has been booming since the new road opened.",
      "The south hamlet has the best grain this year.",
      "Watch your coin purse in the ruins to the west.",
      "Looking for something special? I can source it.",
    ],
  },
  {
    id: "npc_aldric", name: "Guard Aldric",
    classId: "knight", primary: "#6e7a8a", accent: "#c8c8c8",
    homeX: 2, homeY: -54, patrolRadius: 6,
    dialogue: [
      "The north road is safe under my watch.",
      "Report any trouble to me immediately.",
      "I have served this village for ten long years.",
      "All is quiet tonight. As it should be.",
      "Keep moving, citizen.",
    ],
  },

  // --- East Town ---
  {
    id: "npc_ren", name: "Blacksmith Ren",
    classId: "knight", primary: "#3a3a3a", accent: "#ff6600",
    homeX: 60, homeY: 10, patrolRadius: 6,
    dialogue: [
      "Steel and fire — that is all you need in this world.",
      "I forged the eastern gate with my own hands.",
      "Need a blade sharpened? You know where to find me.",
      "The ore from the northern hills is exceptionally pure.",
      "My father taught me this trade. And his father before him.",
    ],
  },
  {
    id: "npc_lyssa", name: "Trader Lyssa",
    classId: "ranger", primary: "#7b5ea7", accent: "#ffd700",
    homeX: 60, homeY: -11, patrolRadius: 8,
    isTrader: true,
    dialogue: [
      "The market has everything the heart desires!",
      "My spices come from lands you could not imagine.",
      "A fair price for a fair deal — that is my motto.",
      "The western ruins are said to hold ancient treasures.",
      "I have traded in thirty cities. This is my favourite.",
    ],
  },
  {
    id: "npc_brom", name: "Apprentice Brom",
    classId: "ranger", primary: "#5a7a5a", accent: "#ff8c00",
    homeX: 57, homeY: 12, patrolRadius: 5,
    dialogue: [
      "Master Ren says I still have much to learn.",
      "I burned myself on the forge again today...",
      "One day I will craft weapons worthy of legend!",
      "The east town is always so lively.",
      "Could you spare some advice for a young apprentice?",
    ],
  },
  {
    id: "npc_sera", name: "Guard Sera",
    classId: "knight", primary: "#6e7a8a", accent: "#ffd700",
    homeX: 50, homeY: 0, patrolRadius: 8,
    dialogue: [
      "The east road is under my protection.",
      "I keep watch so others may sleep soundly.",
      "The market closes at dusk — plan accordingly.",
      "Stay on the lit path and you will be fine.",
      "No trouble here tonight. Move along.",
    ],
  },

  // --- South Hamlet ---
  {
    id: "npc_holt", name: "Farmer Holt",
    classId: "ranger", primary: "#8b6914", accent: "#228b22",
    homeX: 8, homeY: 61, patrolRadius: 10,
    dialogue: [
      "The harvest will be plentiful this year, I can feel it.",
      "Good land needs good care. That is the farmer's way.",
      "My family has worked this soil for generations.",
      "The city folk do not know what real work is.",
      "Rain is coming. I can smell it on the wind.",
    ],
  },
  {
    id: "npc_greta", name: "Provisioner Greta",
    classId: "ranger", primary: "#6b4e2f", accent: "#e8c84a",
    homeX: -2, homeY: 58, patrolRadius: 6,
    isTrader: true,
    dialogue: [
      "Potions, rations, and remedies — all in stock!",
      "The hamlet folk keep me busy with orders.",
      "A prepared adventurer is a living adventurer.",
      "My tonics are brewed from the finest local herbs.",
      "Heading into the wilds? You will want supplies.",
    ],
  },
  {
    id: "npc_dot", name: "Miller Dot",
    classId: "mage", primary: "#c8a86b", accent: "#fff8dc",
    homeX: -8, homeY: 61, patrolRadius: 7,
    dialogue: [
      "Fresh flour, ground this very morning!",
      "The mill wheel turns as long as the river flows.",
      "Bread is the foundation of civilisation, I always say.",
      "My mill serves all four villages, you know.",
      "Come, share a loaf with a friendly face!",
    ],
  },
  {
    id: "npc_wyn", name: "Shepherd Wyn",
    classId: "ranger", primary: "#6b8e6b", accent: "#f5f5dc",
    homeX: -5, homeY: 72, patrolRadius: 13,
    dialogue: [
      "The sheep know the land better than any map.",
      "I find peace in long walks through the fields.",
      "If you see a lost sheep, please send it my way!",
      "The world is quieter here. That is how I like it.",
      "Every blade of grass tells a story if you listen.",
    ],
  },

  // --- West Ruins ---
  {
    id: "npc_voss", name: "Curio Dealer Voss",
    classId: "mage", primary: "#3a2f4a", accent: "#c79cff",
    homeX: -55, homeY: -4, patrolRadius: 6,
    isTrader: true,
    dialogue: [
      "Relics and curiosities, salvaged from the deep halls.",
      "Every item I sell has a story. Most of them tragic.",
      "The scholars pay well for enchanted trinkets.",
      "I accept coin, not questions about my sources.",
      "Rare finds today — the ruins were generous.",
    ],
  },
  {
    id: "npc_mira", name: "Sage Mira",
    classId: "mage", primary: "#2d3a4a", accent: "#9370db",
    homeX: -65, homeY: -9, patrolRadius: 9,
    dialogue: [
      "The ancients who built these halls were very powerful.",
      "Do not touch the inscriptions on the walls. Please.",
      "I have spent decades deciphering these ruins.",
      "Magic still lingers in these stones if you know how to feel it.",
      "Knowledge preserved is civilisation preserved.",
    ],
  },
  {
    id: "npc_cael", name: "Hermit Cael",
    classId: "mage", primary: "#1a1a2e", accent: "#6a0dad",
    homeX: -65, homeY: 10, patrolRadius: 5,
    dialogue: [
      "...",
      "The walls remember everything.",
      "You should not be here.",
      "Leave before the shadows notice you.",
      "Time means nothing in this place.",
    ],
  },
  {
    id: "npc_zix", name: "Wanderer Zix",
    classId: "ranger", primary: "#4a5568", accent: "#ed8936",
    homeX: -52, homeY: 2, patrolRadius: 14,
    dialogue: [
      "I have been everywhere and nowhere.",
      "The ruins fascinate me. So much history!",
      "You meet the most interesting folk on the road.",
      "Every city has a story. Every ruin has a secret.",
      "I never stay in one place long. Keeps life interesting.",
    ],
  },

  // --- Central Hub ---
  {
    id: "npc_kael", name: "Bazaar Kael",
    classId: "knight", primary: "#8b5e3c", accent: "#ffd166",
    homeX: 5, homeY: -3, patrolRadius: 5,
    isTrader: true,
    dialogue: [
      "Welcome to Kael's Bazaar! Best prices in the hub!",
      "Fresh stock every day, straight from the caravans.",
      "Buy, sell, trade — I do it all.",
      "The portal travellers always need supplies.",
      "My prices are fair. Mostly.",
    ],
  },
  {
    id: "npc_ebb", name: "Town Crier Ebb",
    classId: "ranger", primary: "#c8001a", accent: "#ffd700",
    homeX: 0, homeY: 3, patrolRadius: 9,
    dialogue: [
      "Hear ye! Travellers are welcome in Balathor!",
      "The four villages stand united under one realm!",
      "North road leads to the Crossroads Inn — warm beds await!",
      "The east town market is open daily at dawn!",
      "West ruins are open to scholars who show proper respect.",
      "South hamlet feeds the whole realm with its bountiful harvest!",
    ],
  },
  {
    id: "npc_ana", name: "Scribe Ana",
    classId: "mage", primary: "#1a1a6e", accent: "#87ceeb",
    homeX: -3, homeY: -3, patrolRadius: 5,
    dialogue: [
      "I record the history of this realm for posterity.",
      "Every traveller who passes through is noted in my ledger.",
      "Words outlast kingdoms. Always remember that.",
      "The library in the east town holds copies of my work.",
      "May I note your name for the record?",
    ],
  },

  {
    id: "npc_plaza_una", name: "Stallkeep Una",
    classId: "ranger", primary: "#5c4632", accent: "#e8c040",
    homeX: -40, homeY: -10, patrolRadius: 0,
    isTrader: true,
    dialogue: [
      "Everything on this wagon is priced for neighbours.",
      "Arrows, twine, and trail biscuits — take your pick.",
      "Parked off the busy square — easier to load up.",
      "The roads are quiet today. Perfect for stocking up.",
      "Coin honest, goods honest — that's my rule.",
    ],
  },
  {
    id: "npc_plaza_bram", name: "Hawker Bram",
    classId: "knight", primary: "#4a3a28", accent: "#c49a6c",
    homeX: 40, homeY: -10, patrolRadius: 0,
    isTrader: true,
    dialogue: [
      "Fine steel wool, oils, and wax — maintain your kit!",
      "I've walked every road out of this village; I know what sells.",
      "Buy now before the next caravan hikes its prices.",
      "Mind the wheels — but browse all you like.",
      "Everything here I've tested myself in the field.",
    ],
  },
  {
    id: "npc_plaza_lulu", name: "Vendor Lulu",
    classId: "mage", primary: "#4a3558", accent: "#9adbc9",
    homeX: -26, homeY: 44, patrolRadius: 0,
    isTrader: true,
    dialogue: [
      "Potions, dusts, and curious little charms.",
      "My stock shifts with the moon — always something new.",
      "Sit on the step; browsing's free.",
      "Scholars argue. Travellers drink my teas and sleep sound.",
      "If it glows slightly, that's how you know it's fresh.",
    ],
  },
  {
    id: "npc_plaza_otto", name: "Caravan Otto",
    classId: "ranger", primary: "#3d4f3a", accent: "#f0e6a8",
    homeX: 28, homeY: 50, patrolRadius: 0,
    isTrader: true,
    dialogue: [
      "Salt, spice, leather straps — straight off the wagon.",
      "I park here between runs east and west.",
      "No haggling before noon; I'm not awake enough.",
      "Hop up — serious buyers only.",
      "Sell me your extras — weight is money on the road.",
    ],
  },
  {
    id: "npc_rile",
    name: "Riley",
    classId: "ranger",
    primary: "#5c4a52",
    accent: "#fca5a5",
    homeX: 93,
    homeY: 14,
    patrolRadius: 11,
    courtPlayer: true,
    companionPrice: 480,
    bondTag: "gf",
    dialogue: [
      "You've got kind eyes.",
      "I keep wondering what your living room looks like.",
      "...That came out bolder than I meant.",
      "If you hold still for half a heartbeat, I'd tell you a secret.",
      "I like people who finish what they build — roofs, nests, friendships.",
    ]
  },
  {
    id: "npc_jax",
    name: "Jax",
    classId: "knight",
    primary: "#3d4f5f",
    accent: "#fde68a",
    homeX: 58,
    homeY: 2,
    patrolRadius: 10,
    courtPlayer: true,
    companionPrice: 455,
    bondTag: "bf",
    dialogue: [
      "Busy mind, restless feet?",
      "I've been known to linger where someone listens.",
      "Home isn't four walls unless someone shares it.",
      "Stand with me — no swords, just words.",
      "If you planted roots here, you'd make the place brighter.",
    ]
  },
  {
    id: "npc_mae",
    name: "Mae",
    classId: "mage",
    primary: "#483c44",
    accent: "#fbcfe8",
    homeX: -18,
    homeY: 58,
    patrolRadius: 13,
    courtPlayer: true,
    companionPrice: 448,
    bondTag: "gf",
    dialogue: [
      "...You stop long enough for a story and I melt a little.",
      "If you lent me shelf space beside your kettle, I'd make it sing.",
      "Three seconds standing still tells me you listen — rare magic.",
      "Homesteaders scare easy; you don't.",
      "Say the word and I'll haunt your hearth like it's mine.",
    ]
  },
  {
    id: "npc_sofia",
    name: "Sofia",
    classId: "ranger",
    primary: "#4b3f36",
    accent: "#f472b6",
    homeX: -38,
    homeY: -8,
    patrolRadius: 12,
    courtPlayer: true,
    companionPrice: 466,
    bondTag: "gf",
    dialogue: [
      "Your boots pause like someone planning roots.",
      "I've got clumsy bravery and nowhere to pin it tonight.",
      "Stand there three heartbeats longer — humour me?",
      "...Could I braid wildflowers onto your mantle?",
      "Owning a doorway means admitting you dare to belong.",
    ]
  },
  {
    id: "npc_nara",
    name: "Nara",
    classId: "knight",
    primary: "#3d4a54",
    accent: "#fda4af",
    homeX: -62,
    homeY: 8,
    patrolRadius: 11,
    courtPlayer: true,
    companionPrice: 455,
    bondTag: "gf",
    dialogue: [
      "Stillness suits you.",
      "...Not many offer me a hearth without swords involved.",
      "If you whisper where you tuck your slippers, I'll meet you halfway.",
      "Three seconds grounded while I chatter — dare you?",
      "Your walls look sturdy; my heart rattles anyhow.",
    ]
  },
];

const DEFINITIONS = BASE_NPC_DEFINITIONS.concat(buildHydratedHubNpcExtras());

const soldCompanionNpcIds = new Set();
const SOCIAL_PAIR_INTERVAL_MS = 11000;
const SOCIAL_NEAR_HOME = 168;
/** Generic lines overheard during NPC→NPC chatter */
const SOCIAL_OVERHEARD = [
  "Any news from the east road?",
  "Hard to believe harvest's almost here.",
  "Keep your cloak dry — drizzle's coming.",
  "The smith's apprentice still burning himself?",
  "…and then I told him, not in my orchard!",
];

let lastNpcSocialAttempt = 0;

function npcPatrolIntersectsBounds(npc, bounds) {
  if (!bounds) {
    return false;
  }
  const pad = 1.5;
  const nx0 = npc.homeX - npc.patrolRadius - pad;
  const nx1 = npc.homeX + npc.patrolRadius + pad;
  const ny0 = npc.homeY - npc.patrolRadius - pad;
  const ny1 = npc.homeY + npc.patrolRadius + pad;
  return !(nx1 < bounds.minX || nx0 > bounds.maxX || ny1 < bounds.minY || ny0 > bounds.maxY);
}

// Runtime NPC state — positions are mutated by AI each tick.
const npcs = DEFINITIONS.map((def) => ({
  ...def,
  x: def.homeX + (Math.random() * 2 - 1),
  y: def.homeY + (Math.random() * 2 - 1),
  facing: Math.random() * Math.PI * 2,
  moving: false,
  _targetX: def.homeX,
  _targetY: def.homeY,
  _nextMoveAt: Date.now() + Math.random() * MOVE_INTERVAL_MAX,
  _nextChatAt:
    Date.now() +
    CHAT_INTERVAL_MIN +
    Math.random() * (CHAT_INTERVAL_MAX - CHAT_INTERVAL_MIN),
}));

const hubLinkedNpcIds = new Set(HUB_NPC_ORDER.map((entry) => entry.id));

/** Keep road-following walkers aligned once homes move beside doors. */
function refreshHubPathFollowingFlags() {
  const hubBubble = Number(WORLD.HUB_TOWN_GRASS_RADIUS || 132) - 11;
  for (const n of npcs) {
    const idStr = typeof n.id === "string" ? n.id : "";
    let follow = false;
    if (idStr.startsWith("hub_m_") || idStr.startsWith("hub_seek_")) {
      follow = !soldCompanionNpcIds.has(idStr);
    } else if (hubLinkedNpcIds.has(idStr)) {
      if (!(n.isTrader && n.patrolRadius <= 1.251)) {
        follow = Math.hypot(n.homeX, n.homeY) <= hubBubble && Number(n.patrolRadius ?? 0) >= 3;
      }
    }
    n._followHubPaths = follow;
  }
}

refreshHubPathFollowingFlags();

/** Repoint villagers + romance NPCs toward their shack door after hub regeneration. */
function syncNpcHubHomesFromBuildings(buildings, southDoorAnchorWorldXFn) {
  if (typeof southDoorAnchorWorldXFn !== "function" || !buildings?.length) {
    return;
  }

  for (const b of buildings) {
    const nid = b?.npcAttachId;
    if (typeof nid !== "string") {
      continue;
    }
    const n = npcs.find((z) => z.id === nid);
    if (!n) {
      continue;
    }
    const hx = southDoorAnchorWorldXFn(b);
    const hy = b.y + b.h + 0.35;

    const defObj = DEFINITIONS.find((d) => d.id === nid);
    if (defObj) {
      defObj.homeX = hx;
      defObj.homeY = hy;
    }
    n.homeX = hx;
    n.homeY = hy;
    n._targetX = hx;
    n._targetY = hy;
    n.x = hx + Math.random() * 0.7 - 0.35;
    n.y = hy + Math.random() * 0.45 + 0.04;
  }
  refreshHubPathFollowingFlags();
}

function syncSoldCompanionIdsFromAccounts(accountsRoot) {
  soldCompanionNpcIds.clear();
  if (!accountsRoot || typeof accountsRoot !== "object") {
    return;
  }
  for (const account of Object.values(accountsRoot)) {
    const id = account?.character?.houseCompanion?.npcId;
    if (typeof id === "string") {
      soldCompanionNpcIds.add(id.slice(0, 96));
    }
  }
}

function registerCompanionSold(npcId) {
  if (typeof npcId === "string") {
    soldCompanionNpcIds.add(npcId.slice(0, 96));
  }
}

function getNpcBuddy(npc) {
  if (!npc?._meetPeerId) {
    return null;
  }
  return npcs.find((n) => n.id === npc._meetPeerId) || null;
}

/** Try to arrange a short meet-up dialogue between two patrolling villagers. */
function maybeStartNpcMeeting(now, activationBounds) {
  if (!activationBounds || now - lastNpcSocialAttempt < SOCIAL_PAIR_INTERVAL_MS) {
    return;
  }
  lastNpcSocialAttempt = now;
  if (Math.random() > 0.42) {
    return;
  }

  const cand = npcs.filter(
    (n) =>
      npcPatrolIntersectsBounds(n, activationBounds) &&
      !n.isTrader &&
      !n.courtPlayer &&
      typeof n.companionPrice !== "number" &&
      !soldCompanionNpcIds.has(n.id) &&
      !n._meetPeerId &&
      n.patrolRadius >= 5 &&
      Math.hypot(n.homeX, n.homeY) <= SOCIAL_NEAR_HOME
  );
  if (cand.length < 2) {
    return;
  }

  shuffleInPlace(cand);
  let a = null;
  let b = null;
  for (let i = 0; i < cand.length && !b; i += 1) {
    for (let j = i + 1; j < cand.length; j += 1) {
      if (Math.hypot(cand[i].homeX - cand[j].homeX, cand[i].homeY - cand[j].homeY) < 76) {
        a = cand[i];
        b = cand[j];
        break;
      }
    }
  }
  if (!a || !b) {
    return;
  }

  const meetX = (a.x + b.x) / 2;
  const meetY = (a.y + b.y) / 2;

  let mx = meetX + (Math.random() * 1.8 - 0.9);
  let my = meetY + (Math.random() * 1.8 - 0.9);
  if (!isBlockedCircle(mx, my)) {
    a._meetPeerId = b.id;
    b._meetPeerId = a.id;
    a._meetPhase = "walk";
    b._meetPhase = "walk";
    a._meetEndAt = now + 16000;
    b._meetEndAt = now + 16000;
    a._meetNextLineAt = now + 2200;
    b._meetNextLineAt = now + 2200 + 550;
    a._meetTurnSpeaker = Math.random() < 0.5 ? a.id : b.id;

    mx = clampMeet(mx);
    my = clampMeet(my);
    a._targetX = mx + 0.35;
    a._targetY = my;
    b._targetX = mx - 0.35;
    b._targetY = my;
    a._meetMidX = mx;
    b._meetMidX = mx;
    a._meetMidY = my;
    b._meetMidY = my;
    a._nextMoveAt = now + 28000;
    b._nextMoveAt = now + 28000;
  }
}

function clampMeet(value) {
  return Math.round(value * 40) / 40;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function clearMeeting(npc) {
  const buddy = getNpcBuddy(npc);
  npc._meetPeerId = undefined;
  npc._meetPhase = undefined;
  npc._meetEndAt = undefined;
  npc._meetNextLineAt = undefined;
  npc._meetTurnSpeaker = undefined;
  npc._meetMidX = undefined;
  npc._meetMidY = undefined;
  if (buddy) {
    buddy._meetPeerId = undefined;
    buddy._meetPhase = undefined;
    buddy._meetEndAt = undefined;
    buddy._meetNextLineAt = undefined;
    buddy._meetTurnSpeaker = undefined;
    buddy._meetMidX = undefined;
    buddy._meetMidY = undefined;
  }
}

/** Advance scripted meet phases and timed lines. Returns true while npc is in a pairing. */
function tickNpcMeeting(npc, now, dt, onChat) {
  if (!npc._meetPeerId || !npc._meetPhase || !npc._meetEndAt) {
    return false;
  }

  const buddy = getNpcBuddy(npc);
  if (!buddy || now >= npc._meetEndAt) {
    clearMeeting(npc);
    return false;
  }

  if (npc.id > buddy.id) {
    /** Only buddy with lexicographically lower id advances pair chatter to avoid duplication */
    return npc._meetPhase === "talk";
  }

  if (npc._meetPhase === "walk") {
    const midOk =
      typeof npc._meetMidX === "number" &&
      typeof npc._meetMidY === "number" &&
      Math.hypot(npc.x - npc._meetMidX, npc.y - npc._meetMidY) < 0.55 &&
      Math.hypot(buddy.x - npc._meetMidX, buddy.y - npc._meetMidY) < 0.55;
    if (midOk || now > npc._meetEndAt - 4500) {
      npc._meetPhase = "talk";
      buddy._meetPhase = "talk";
      npc.x = npc._meetMidX + 0.3;
      npc.y = npc._meetMidY;
      buddy.x = npc._meetMidX - 0.3;
      buddy.y = npc._meetMidY;
      npc.moving = false;
      buddy.moving = false;
      npc._targetX = npc.x;
      npc._targetY = npc.y;
      buddy._targetX = buddy.x;
      buddy._targetY = buddy.y;
      npc._meetTurnSpeaker =
        npc._meetTurnSpeaker === buddy.id ? buddy.id : npc.id;
    }
  }

  if (npc._meetPhase === "talk" && now >= npc._meetNextLineAt && now < npc._meetEndAt - 400) {
    const speaker =
      npc._meetTurnSpeaker === buddy.id ? buddy : npc;
    const linePick =
      Math.random() < 0.55
        ? SOCIAL_OVERHEARD[Math.floor(Math.random() * SOCIAL_OVERHEARD.length)]
        : speaker.dialogue[Math.floor(Math.random() * speaker.dialogue.length)];
    onChat({
      kind: "npc",
      fromId: speaker.id,
      name: speaker.name,
      text: linePick,
      x: speaker.x,
      y: speaker.y,
      social: true
    });
    npc._meetTurnSpeaker = speaker.id === buddy.id ? npc.id : buddy.id;
    npc._meetNextLineAt = now + 3200 + Math.random() * 2200;
    buddy._meetNextLineAt = npc._meetNextLineAt;
  }

  return npc._meetPhase === "talk";
}

/**
 * Romantic companion NPC seeks homeowners; offer only after player stood still ≥3s in earshot.
 * @returns {boolean} true if court AI took over npc movement targeting this tick
 */
function applyCompanionCourt(npc, companionCtx, onChat, now) {
  if (!companionCtx || typeof npc.companionPrice !== "number" || soldCompanionNpcIds.has(npc.id)) {
    return false;
  }
  if (npc._meetPeerId) {
    return false;
  }

  let best = null;
  let bestD = Infinity;
  for (const row of companionCtx.targets) {
    const p = row.player;
    if (!p?.homeBuildingKey || p.houseCompanion) {
      continue;
    }
    const dx = npc.x - p.x;
    const dy = npc.y - p.y;
    const dd = dx * dx + dy * dy;
    if (dd < bestD) {
      bestD = dd;
      best = row;
    }
  }

  const COURT_RANGE = 32;
  if (!best || bestD > COURT_RANGE * COURT_RANGE) {
    npc._courtOfferLatch = false;
    npc._courtLineAt = 0;
    return false;
  }

  const px = best.player.x;
  const py = best.player.y;
  const angle = Math.atan2(py - npc.y, px - npc.x);
  npc._targetX = px - Math.cos(angle) * 1.52;
  npc._targetY = py - Math.sin(angle) * 1.52;

  const hear = Math.hypot(npc.x - px, npc.y - py) < 2.35;
  const still = Number(best.stillAccumulator) || 0;

  if (!hear || still < 0.75) {
    npc._courtOfferLatch = false;
  }

  if (
    hear &&
    still >= 3 &&
    !best.player.houseCompanion &&
    !npc._courtOfferLatch &&
    (npc._courtOfferCooldownUntil || 0) <= now
  ) {
    npc._courtOfferCooldownUntil = now + 75000;
    npc._courtOfferLatch = true;
    if (typeof companionCtx.tryOffer === "function") {
      companionCtx.tryOffer(npc, best);
    }
  }

  if (hear && now - (npc._courtLineAt || 0) > 7400) {
    npc._courtLineAt = now;
    const flirt = npc.dialogue[Math.floor(Math.random() * npc.dialogue.length)];
    onChat({
      kind: "npc",
      fromId: npc.id,
      name: npc.name,
      text: flirt,
      x: npc.x,
      y: npc.y
    });
  }

  return true;
}

function updateNpcs(dt, onChat, activationBounds, companionCtx = null) {
  if (!activationBounds) {
    return;
  }

  const now = Date.now();
  maybeStartNpcMeeting(now, activationBounds);

  const navSetStatic = WORLD.HUB_NAV_PATH_KEYS instanceof Set ? WORLD.HUB_NAV_PATH_KEYS : null;

  for (const npc of npcs) {
    if (!npcPatrolIntersectsBounds(npc, activationBounds)) {
      continue;
    }

    /** Retired romance NPCs idle at template home (clients see them only inside your house). */
    if (soldCompanionNpcIds.has(npc.id)) {
      npc.moving = false;
      npc.x = npc.homeX;
      npc.y = npc.homeY;
      npc._targetX = npc.x;
      npc._targetY = npc.y;
      continue;
    }

    const inMeetTalk = tickNpcMeeting(npc, now, dt, onChat);
    let courtSteers = false;
    if (companionCtx && typeof npc.companionPrice === "number") {
      courtSteers = applyCompanionCourt(npc, companionCtx, onChat, now);
    }

    if (inMeetTalk) {
      continue;
    }

    const loveSeeking =
      Boolean(npc.courtPlayer) &&
      typeof npc.companionPrice === "number" &&
      !soldCompanionNpcIds.has(npc.id);
    const socialWalkTowardPeer = npc._meetPeerId && npc._meetPhase === "walk";
    const gridPathsOk =
      npc._followHubPaths &&
      navSetStatic &&
      navSetStatic.size > 96 &&
      !(loveSeeking && courtSteers) &&
      !(socialWalkTowardPeer);

    const dx = npc._targetX - npc.x;
    const dy = npc._targetY - npc.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.08) {
      npc.moving = false;

      const socialWalk = npc._meetPeerId && npc._meetPhase === "walk";
      if (!(courtSteers || socialWalk) && now >= npc._nextMoveAt && !soldCompanionNpcIds.has(npc.id)) {
        let tx;
        let ty;
        const hubPick =
          npc._followHubPaths && npc.patrolRadius >= 0.98
            ? sampleHubPatrolWaypoint(npc, navSetStatic)
            : null;
        if (hubPick) {
          ({ tx: tx, ty: ty } = hubPick);
        } else {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * npc.patrolRadius;
          tx = npc.homeX + Math.cos(angle) * radius;
          ty = npc.homeY + Math.sin(angle) * radius;
        }

        if (!isBlockedCircle(tx, ty)) {
          npc._targetX = tx;
          npc._targetY = ty;
        }

        npc._nextMoveAt =
          now +
          MOVE_INTERVAL_MIN +
          Math.random() * (MOVE_INTERVAL_MAX - MOVE_INTERVAL_MIN);
      }
    } else {
      const nx = dx / dist;
      const ny = dy / dist;
      const step = NPC_SPEED * dt;

      if (!gridPathsOk) {
        const nextX = npc.x + nx * step;
        const nextY = npc.y + ny * step;

        if (!isBlockedCircle(nextX, npc.y)) {
          npc.x = nextX;
        } else if (!soldCompanionNpcIds.has(npc.id)) {
          npc._targetX = npc.homeX;
        }

        if (!isBlockedCircle(npc.x, nextY)) {
          npc.y = nextY;
        } else if (!soldCompanionNpcIds.has(npc.id)) {
          npc._targetY = npc.homeY;
        }

        npc.facing = Math.atan2(ny, nx);
        npc.moving = true;
      } else if (!steerNpcGridAlongPaths(npc, navSetStatic, step)) {
        if (!soldCompanionNpcIds.has(npc.id)) {
          npc._targetX = npc.homeX + (Math.random() * 2 - 1) * 0.06;
          npc._targetY = npc.homeY + (Math.random() * 2 - 1) * 0.06;
        }
        npc.facing = Math.atan2(ny, nx);
        npc.moving = false;
      }
    }

    const skipSoloRamble =
      (typeof npc.companionPrice === "number" && !soldCompanionNpcIds.has(npc.id)) ||
      Boolean(npc._meetPeerId);

    if (!skipSoloRamble && now >= npc._nextChatAt) {
      const line = npc.dialogue[Math.floor(Math.random() * npc.dialogue.length)];
      onChat({ kind: "npc", fromId: npc.id, name: npc.name, text: line, x: npc.x, y: npc.y });
      npc._nextChatAt =
        now +
        CHAT_INTERVAL_MIN +
        Math.random() * (CHAT_INTERVAL_MAX - CHAT_INTERVAL_MIN);
    }
  }
}

function getNpcSnapshot() {
  return npcs
    .filter((npc) => !soldCompanionNpcIds.has(npc.id))
    .map((npc) => ({
      id: npc.id,
      name: npc.name,
      classId: npc.classId,
      primary: npc.primary,
      accent: npc.accent,
      x: Number(npc.x.toFixed(3)),
      y: Number(npc.y.toFixed(3)),
      facing: Number(npc.facing.toFixed(3)),
      moving: npc.moving,
      isTrader: npc.isTrader || false,
    }));
}

function getNpcById(id) {
  return npcs.find((npc) => npc.id === id) || null;
}

/** Template for romance NPCs — works even after that NPC is retired from world patrol. */
function getCompanionNpcTemplate(id) {
  if (typeof id !== "string") {
    return null;
  }
  return DEFINITIONS.find((d) => d.id === id && typeof d.companionPrice === "number") || null;
}

/** Random eligible girlfriend companion for bar “dream hangover”; prefers NPCs still in the world roster. */
function pickPubDreamGirlfriendNpcId() {
  const gfs = DEFINITIONS.filter(
    (d) => d.courtPlayer && d.bondTag === "gf" && typeof d.companionPrice === "number"
  );
  if (!gfs.length) {
    return null;
  }
  const unsold = gfs.filter((d) => !soldCompanionNpcIds.has(d.id));
  const pool = unsold.length ? unsold : gfs;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return pick.id;
}

function getTraderDefinitions() {
  return DEFINITIONS.filter((d) => d.isTrader);
}

module.exports = {
  updateNpcs,
  getNpcSnapshot,
  getNpcById,
  getTraderDefinitions,
  syncNpcHubHomesFromBuildings,
  syncSoldCompanionIdsFromAccounts,
  registerCompanionSold,
  getCompanionNpcTemplate,
  pickPubDreamGirlfriendNpcId
};
