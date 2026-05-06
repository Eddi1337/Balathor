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
];

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

function updateNpcs(dt, onChat, activationBounds) {
  if (!activationBounds) {
    return;
  }

  const now = Date.now();

  for (const npc of npcs) {
    if (!npcPatrolIntersectsBounds(npc, activationBounds)) {
      continue;
    }

    const dx = npc._targetX - npc.x;
    const dy = npc._targetY - npc.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.08) {
      npc.moving = false;

      if (now >= npc._nextMoveAt) {
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
      } else {
        npc._targetX = npc.homeX;
      }

      if (!isBlockedCircle(npc.x, nextY)) {
        npc.y = nextY;
      } else {
        npc._targetY = npc.homeY;
      }

      npc.facing = Math.atan2(ny, nx);
      npc.moving = true;
    }

    if (now >= npc._nextChatAt) {
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
  return npcs.map((npc) => ({
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

function getTraderDefinitions() {
  return DEFINITIONS.filter((d) => d.isTrader);
}

module.exports = { updateNpcs, getNpcSnapshot, getNpcById, getTraderDefinitions };
