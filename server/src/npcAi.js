const OLLAMA_URL = process.env.OLLAMA_URL || "http://192.168.10.90:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "phi4-mini";
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || "/api/chat";
const AI_BATCH_INTERVAL_MS = Number(process.env.AI_BATCH_INTERVAL_MS) || 6000;
const AI_SPEECH_COOLDOWN_MS = Number(process.env.AI_SPEECH_COOLDOWN_MS) || 25000;
const AI_ENABLED = process.env.AI_NPC_ENABLED !== "false";

/**
 * Rarity → numeric renown weight for gear scoring.
 * Used to bias the Ollama prompt AND the deterministic fallback so admirers
 * approach high-renown players even when Ollama is down.
 */
const RARITY_RENOWN = Object.freeze({
  common: 1,
  uncommon: 2,
  rare: 4,
  epic: 7,
  legendary: 12,
  mythic: 20,
});

/**
 * Compute a renown score for a player based on level + equipped gear rarity.
 * Returns a non-negative integer; typical low-level range 0-5, high-end 50+.
 */
function computePlayerRenown(player) {
  if (!player) return 0;
  const level = Number(player.level) || 1;
  let gearScore = 0;
  const equip = player.equipment;
  if (equip && typeof equip === "object") {
    for (const item of Object.values(equip)) {
      if (!item) continue;
      gearScore += RARITY_RENOWN[item.rarity] || 0;
    }
  }
  return level * 2 + gearScore;
}

/**
 * Describe a player's renown level in prose for the AI prompt.
 */
function describeRenown(player) {
  const score = computePlayerRenown(player);
  if (score >= 80) return `${player.name} (level ${player.level}, mythic-tier gear — a living legend)`;
  if (score >= 40) return `${player.name} (level ${player.level}, legendary equipment — visibly famous)`;
  if (score >= 20) return `${player.name} (level ${player.level}, impressive epic gear)`;
  if (score >= 10) return `${player.name} (level ${player.level}, decent rare gear)`;
  return `${player.name} (level ${player.level})`;
}

let nextBatchAt = 0;
let inFlight = false;

const pendingResults = [];

function describeLocation(npc) {
  const hx = npc.homeX || 0;
  const hy = npc.homeY || 0;
  const dist = Math.hypot(hx, hy);
  if (dist < 15) return "the central plaza";
  if (Math.hypot(hx - 11, hy + 65) < 14) return "the north village near the inn";
  if (Math.hypot(hx - 60, hy - 10) < 18) return "the east market district";
  if (Math.hypot(hx - 8, hy - 61) < 18) return "the south farm hamlet";
  if (Math.hypot(hx + 55, hy + 4) < 16) return "the west ruins district";
  if (Math.hypot(hx, hy) < 40) return "the town hub area";
  return "the outer edges of town";
}

/**
 * Landmark positions used by the wander_to_landmark action.
 * Keys are used in the AI prompt; values are {x, y} world positions.
 */
const LANDMARKS = [
  { name: "north inn", x: 11, y: -65 },
  { name: "east market", x: 60, y: -11 },
  { name: "central plaza fountain", x: 0, y: 0 },
  { name: "south hamlet fields", x: 8, y: 70 },
  { name: "west ruins archway", x: -60, y: 0 },
  { name: "blacksmith forge", x: 60, y: 10 },
  { name: "baker's stall", x: -18, y: 84 },
];

function nearestLandmark(npc) {
  let best = LANDMARKS[0];
  let bestD = Infinity;
  for (const lm of LANDMARKS) {
    const d = Math.hypot(lm.x - (npc.homeX || 0), lm.y - (npc.homeY || 0));
    if (d < bestD) { bestD = d; best = lm; }
  }
  // Return a random landmark that isn't the nearest (variety of wandering)
  const others = LANDMARKS.filter(l => l !== best);
  return others[Math.floor(Math.random() * others.length)] || best;
}

function buildNpcPerception(npc, nearbyPlayers, nearbyNpcs, phase, recentCombatNearby) {
  // Find the most impressive nearby player for renown context
  let topRenown = 0;
  let topPlayer = null;
  for (const p of nearbyPlayers) {
    const r = computePlayerRenown(p);
    if (r > topRenown) { topRenown = r; topPlayer = p; }
  }

  // Quest givers should advertise their work when an adventurer is within
  // earshot. We don't have per-player quest logs here, so this is a soft hint:
  // if the NPC offers quests and a player is nearby, encourage an invitation.
  const isQuestGiver = !!(npc.questGiver && Array.isArray(npc.questIds) && npc.questIds.length > 0);
  const hasQuestForPlayers = isQuestGiver && nearbyPlayers.length > 0;

  return {
    id: npc.id,
    name: npc.name,
    personality: npc.aiPersonality || "a friendly townsperson",
    location: describeLocation(npc),
    timeOfDay: phase,
    isTrader: !!(npc.isTrader || npc.professionTrainer),
    isQuestGiver,
    hasQuestForPlayers,
    nearbyPlayers: nearbyPlayers.map(p => describeRenown(p)),
    nearbyNpcCount: nearbyNpcs.length,
    nearbyNpcNames: nearbyNpcs.slice(0, 3).map(n => n.name),
    hasCustomers: nearbyPlayers.length > 0 && !!(npc.isTrader || npc.professionTrainer),
    topPlayerRenown: topRenown,
    topPlayerName: topPlayer ? topPlayer.name : null,
    recentCombatNearby,
  };
}

const VALID_ACTIONS = [
  "patrol",
  "approach_nearest_player",
  "return_home",
  "stand_still",
  "wander_to_landmark",
  "chat_with_nearby_npc",
];

function buildPrompt(perceptions, phase) {
  const npcBlocks = perceptions.map(p => {
    const playerList = p.nearbyPlayers.length
      ? `Nearby players: ${p.nearbyPlayers.join("; ")}.`
      : "No players nearby.";
    const trade = p.hasCustomers ? " You have customers — hawk your wares!" : "";
    const combat = p.recentCombatNearby ? " There was fighting nearby moments ago." : "";
    const renownHint = p.topPlayerRenown >= 20 && p.topPlayerName
      ? ` ${p.topPlayerName} looks impressively powerful and well-known — you are in awe or try to get their attention.`
      : "";
    const npcChat = p.nearbyNpcCount > 0
      ? ` ${p.nearbyNpcCount} other townsfolk nearby (${p.nearbyNpcNames.join(", ")}).`
      : "";
    const traderHint = p.isTrader ? " You are a trader/trainer — stay near your stall (stand_still or patrol short distances, approach customers)." : "";
    const questHint = p.hasQuestForPlayers
      ? " You are a QUEST GIVER and have a job/task available — if an adventurer is nearby, invite them in-character to hear about the work you need done (do NOT invent specific quest details, just beckon them over)."
      : (p.isQuestGiver ? " You give out quests/tasks to adventurers who come to you." : "");
    return `[${p.name}] Personality: ${p.personality}. Location: ${p.location}. Time: ${p.timeOfDay}. ${playerList}${trade}${combat}${renownHint}${npcChat}${traderHint}${questHint}`;
  }).join("\n---\n");

  return [
    `You control NPCs in a fantasy MMO town. Time: ${phase}.`,
    "For each NPC below, generate a SHORT line of dialogue (8-20 words) they would say RIGHT NOW based on their personality and surroundings.",
    `Also choose one action: patrol, approach_nearest_player, return_home, stand_still, wander_to_landmark, chat_with_nearby_npc.`,
    "- wander_to_landmark: NPC strolls toward a nearby town landmark (pub, market, fountain, forge).",
    "- chat_with_nearby_npc: NPC says something TO a nearby townsfolk (makes the world feel alive).",
    "- Traders and trainers should mostly stand_still or patrol short distances near their stall.",
    "- Quest givers with work available should beckon nearby adventurers over (in character) and may approach_nearest_player to flag them down.",
    "- If a very famous/high-level player is nearby, NPCs should react with admiration or try to approach them.",
    "Respond ONLY with a valid JSON array. No explanation, no markdown. Example:",
    `[{"id":"npc_baker_pip","line":"Fresh bread just out!","action":"stand_still"}]`,
    "NPCs:\n---\n" + npcBlocks + "\n---"
  ].join("\n");
}

function parseResponse(text) {
  try {
    const cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      const lines = cleaned.split("\n");
      const jsonLines = lines.filter(l => !l.startsWith("```"));
      return JSON.parse(jsonLines.join("\n"));
    }
    return JSON.parse(cleaned);
  } catch {
    try {
      const match = text.match(/\[[\s\S]*?\]/);
      if (match) return JSON.parse(match[0]);
    } catch {}
  }
  return null;
}

function clearNpcHubPath(npc) {
  npc._hubPathGoalKey = null;
  npc._hubTilePath = null;
}

function scheduleAiBatch(perceptions, batchNpcIds) {
  if (inFlight || perceptions.length === 0) return;
  inFlight = true;

  const phase = perceptions[0]?.timeOfDay || "day";
  const prompt = buildPrompt(perceptions, phase);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  fetch(`${OLLAMA_URL}${OLLAMA_ENDPOINT}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [{ role: "user", content: prompt }],
      stream: false,
      options: { num_predict: 2048, temperature: 0.8 }
    }),
    signal: controller.signal
  })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      const text = data?.message?.content || "";
      const results = parseResponse(text);
      if (results && Array.isArray(results)) {
        const batchSet = new Set(batchNpcIds);
        for (let i = pendingResults.length - 1; i >= 0; i--) {
          if (batchSet.has(pendingResults[i].npcId)) {
            pendingResults.splice(i, 1);
          }
        }
        for (const r of results) {
          if (r && r.id) {
            pendingResults.push({
              npcId: r.id,
              line: typeof r.line === "string" ? r.line.trim().slice(0, 200) : null,
              action: VALID_ACTIONS.includes(r.action) ? r.action : "patrol",
            });
          }
        }
      }
    })
    .catch(err => {
      if (err.name !== "AbortError") {
        console.warn("[npcAi] ollama error:", err.message);
      }
    })
    .finally(() => {
      clearTimeout(timeout);
      inFlight = false;
    });
}

function consumeAiResult(npcId) {
  const idx = pendingResults.findIndex(r => r.npcId === npcId);
  if (idx === -1) return null;
  const result = pendingResults[idx];
  pendingResults.splice(idx, 1);
  return result;
}

/**
 * Deterministic admirer fallback: if Ollama is down, high-renown players still
 * draw NPCs toward them. Returns true if the NPC should approach.
 * Probability scales from 0 at renown 0 up to ~70% at renown 80+.
 */
function shouldAdmirePlayer(player) {
  const score = computePlayerRenown(player);
  if (score < 10) return false;
  const prob = Math.min(0.7, (score - 10) / 100);
  return Math.random() < prob;
}

/**
 * Pick an admiring line for a high-renown player (used when Ollama is down).
 */
function admireLines(player) {
  const level = player.level || 1;
  // Find best gear rarity for flavour
  let topRarity = "common";
  const rarityOrder = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
  if (player.equipment) {
    for (const item of Object.values(player.equipment)) {
      if (!item?.rarity) continue;
      if (rarityOrder.indexOf(item.rarity) > rarityOrder.indexOf(topRarity)) {
        topRarity = item.rarity;
      }
    }
  }
  const gearLines = {
    mythic: [
      `Is that mythic-forged armour? I've never seen anything like it!`,
      `Those mythic relics... you must have faced terrible dangers.`,
    ],
    legendary: [
      `Legendary gear! The stories about you must be true.`,
      `That legendary weapon — is it really as powerful as they say?`,
    ],
    epic: [
      `Epic gear on a level ${level} adventurer — you're serious about this.`,
      `Those epic gauntlets shine brighter than anything in the market.`,
    ],
    rare: [
      `Rare equipment! You must be quite the adventurer.`,
      `That rare blade catches the light beautifully.`,
    ],
  };
  const lines = gearLines[topRarity] || [
    `A level ${level} adventurer! Could I ask about your travels?`,
    `You look experienced. Are you looking for work in town?`,
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

function tickAiNpcs(activeNpcs, allPlayers, onChat, now, hour) {
  if (!AI_ENABLED) return;

  // Traders and trainers are now included — they can hawk wares and react to customers.
  // Guards/archers/couriers and onboarding/companion NPCs are still excluded (they have
  // their own steering logic that would conflict with AI actions).
  const aiNpcs = activeNpcs.filter(n =>
    n.aiPersonality &&
    !n.isGuard &&
    !n.isTownArcher &&
    !n.isFletcher &&
    !n.isFletcherWorker &&
    !n.isArrowCourier &&
    !n.onboardingGuide &&
    typeof n.companionPrice !== "number"
  );
  if (aiNpcs.length === 0) return;

  let phase = "day";
  if (hour < 6 || hour >= 22) phase = "night";
  else if (hour >= 18) phase = "dusk";
  else if (hour >= 6 && hour < 8) phase = "dawn";

  // Check for recent nearby combat (any mob death within 15 tiles of any ai NPC)
  // We read _recentCombatAt set by npcs.js via notifyNpcCombatNearby().
  const recentCombatThreshold = now - 8000;

  if (now >= nextBatchAt && !inFlight) {
    const batchNpcIds = aiNpcs.map(n => n.id);
    const perceptions = aiNpcs.map(npc => {
      const nearby = allPlayers ? allPlayers.filter(row => {
        const p = row.player;
        return p && Math.hypot(p.x - npc.x, p.y - npc.y) < 12;
      }).map(row => row.player) : [];
      const nearbyNpcs = activeNpcs.filter(
        other => other.id !== npc.id && Math.hypot(other.x - npc.x, other.y - npc.y) < 8
      );
      const recentCombatNearby = !!(npc._recentCombatAt && npc._recentCombatAt > recentCombatThreshold);
      return buildNpcPerception(npc, nearby, nearbyNpcs, phase, recentCombatNearby);
    });

    scheduleAiBatch(perceptions, batchNpcIds);
    nextBatchAt = now + AI_BATCH_INTERVAL_MS;
  }

  for (const npc of aiNpcs) {
    const result = consumeAiResult(npc.id);

    // --- Deterministic admirer fallback (works even when Ollama is down) ---
    // If we have no AI result, we might still approach a nearby famous player.
    if (!result && allPlayers) {
      const cooldownOk = now >= (npc._aiNextLineCooldownUntil || 0);
      if (cooldownOk && !(npc._aiAction === "approach" && now < (npc._aiActionUntil || 0))) {
        for (const row of allPlayers) {
          const p = row.player;
          if (!p) continue;
          const d = Math.hypot(p.x - npc.x, p.y - npc.y);
          if (d > 18) continue;
          if (shouldAdmirePlayer(p)) {
            npc._aiNextLine = admireLines(p);
            npc._aiNextLineCooldownUntil = now + AI_SPEECH_COOLDOWN_MS + Math.random() * 15000;
            npc._targetX = p.x + (Math.random() * 1.2 - 0.6);
            npc._targetY = p.y + (Math.random() * 1.2 - 0.6);
            npc._aiAction = "approach";
            npc._aiActionUntil = now + 5000;
            clearNpcHubPath(npc);
            break;
          }
        }
      }
      continue;
    }

    if (!result) continue;

    const cooldownOk = now >= (npc._aiNextLineCooldownUntil || 0);
    if (result.line && cooldownOk) {
      npc._aiNextLine = result.line;
      npc._aiNextLineCooldownUntil = now + AI_SPEECH_COOLDOWN_MS + Math.random() * 15000;
    }

    if (result.action === "approach_nearest_player" && allPlayers) {
      // Prefer the highest-renown player nearby for dramatic admirer effect
      let nearest = null;
      let bestScore = -Infinity;
      for (const row of allPlayers) {
        const p = row.player;
        if (!p) continue;
        const d = Math.hypot(p.x - npc.x, p.y - npc.y);
        if (d > 20) continue;
        // Score = renown - distance (so famous nearby players beat distant nobodies)
        const score = computePlayerRenown(p) - d;
        if (score > bestScore) { bestScore = score; nearest = p; }
      }
      if (nearest) {
        npc._targetX = nearest.x + (Math.random() * 1.2 - 0.6);
        npc._targetY = nearest.y + (Math.random() * 1.2 - 0.6);
        npc._aiAction = "approach";
        npc._aiActionUntil = now + 5000;
        clearNpcHubPath(npc);
      }
    } else if (result.action === "return_home") {
      npc._targetX = npc.homeX;
      npc._targetY = npc.homeY;
      npc._aiAction = "return_home";
      npc._aiActionUntil = now + 8000;
      clearNpcHubPath(npc);
    } else if (result.action === "stand_still") {
      npc._targetX = npc.x;
      npc._targetY = npc.y;
      npc._aiAction = "stand_still";
      npc._aiActionUntil = now + 4000;
      clearNpcHubPath(npc);
    } else if (result.action === "wander_to_landmark") {
      const lm = nearestLandmark(npc);
      // Wander within ~4 tiles of the landmark so NPCs spread around town
      npc._targetX = lm.x + (Math.random() * 6 - 3);
      npc._targetY = lm.y + (Math.random() * 6 - 3);
      npc._aiAction = "wander_to_landmark";
      npc._aiActionUntil = now + 12000;
      clearNpcHubPath(npc);
    } else if (result.action === "chat_with_nearby_npc") {
      // Find the nearest other NPC and drift toward them
      const nearbyNpcs = activeNpcs.filter(
        other => other.id !== npc.id && Math.hypot(other.x - npc.x, other.y - npc.y) < 10
      );
      if (nearbyNpcs.length > 0) {
        const partner = nearbyNpcs[0];
        npc._targetX = partner.x + (Math.random() * 1.4 - 0.7);
        npc._targetY = partner.y + (Math.random() * 1.4 - 0.7);
        npc._aiAction = "chat_with_nearby_npc";
        npc._aiActionUntil = now + 6000;
        clearNpcHubPath(npc);
      }
    } else {
      // patrol — let the existing patrol logic handle it
      npc._aiAction = null;
      npc._aiActionUntil = 0;
    }
  }
}

/**
 * Call this from npcs.js or index.js when combat happens near an NPC so the
 * next AI batch can mention it in the perception context.
 * @param {object} npc - the NPC object
 * @param {number} now - Date.now()
 */
function notifyNpcCombatNearby(npc, now) {
  npc._recentCombatAt = now;
}

module.exports = { tickAiNpcs, computePlayerRenown, notifyNpcCombatNearby };
