const { isBlockedCircle } = require("./world");

const NPC_SPEED = 2.0;
const MOVE_INTERVAL_MIN = 3000;
const MOVE_INTERVAL_MAX = 9000;
const CHAT_INTERVAL_MIN = 28000;
const CHAT_INTERVAL_MAX = 70000;

const DEFINITIONS = [
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

const soldCompanionNpcIds = new Set();
const SOCIAL_PAIR_INTERVAL_MS = 11000;
const SOCIAL_NEAR_HOME = 118;
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

    const dx = npc._targetX - npc.x;
    const dy = npc._targetY - npc.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.08) {
      npc.moving = false;

      const socialWalk = npc._meetPeerId && npc._meetPhase === "walk";
      if (!(courtSteers || socialWalk) && now >= npc._nextMoveAt && !soldCompanionNpcIds.has(npc.id)) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * npc.patrolRadius;
        const tx = npc.homeX + Math.cos(angle) * radius;
        const ty = npc.homeY + Math.sin(angle) * radius;

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

function getTraderDefinitions() {
  return DEFINITIONS.filter((d) => d.isTrader);
}

module.exports = {
  updateNpcs,
  getNpcSnapshot,
  getNpcById,
  getTraderDefinitions,
  syncSoldCompanionIdsFromAccounts,
  registerCompanionSold,
  getCompanionNpcTemplate
};
