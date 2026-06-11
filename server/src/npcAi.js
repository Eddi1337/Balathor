const OLLAMA_URL = process.env.OLLAMA_URL || "http://192.168.10.90:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "phi4-mini";
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || "/api/chat";
const AI_BATCH_INTERVAL_MS = Number(process.env.AI_BATCH_INTERVAL_MS) || 6000;
const AI_SPEECH_COOLDOWN_MS = Number(process.env.AI_SPEECH_COOLDOWN_MS) || 25000;
const AI_ENABLED = process.env.AI_NPC_ENABLED !== "false";

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

function buildNpcPerception(npc, nearbyPlayers, nearbyNpcs, phase) {
  return {
    id: npc.id,
    name: npc.name,
    personality: npc.aiPersonality || "a friendly townsperson",
    location: describeLocation(npc),
    timeOfDay: phase,
    nearbyPlayers: nearbyPlayers.map(p => p.name),
    nearbyNpcCount: nearbyNpcs.length,
    hasCustomers: nearbyPlayers.length > 0 && (npc.isTrader || npc.professionTrainer),
  };
}

function buildPrompt(perceptions, phase) {
  const npcBlocks = perceptions.map(p => {
    const vicinity = p.nearbyPlayers.length
      ? `Nearby players: ${p.nearbyPlayers.join(", ")}.`
      : "No players nearby.";
    const trade = p.hasCustomers ? " You have potential customers nearby." : "";
    return `[${p.name}] Personality: ${p.personality}. Location: ${p.location}. Time: ${p.timeOfDay}. ${vicinity}${trade}`;
  }).join("\n---\n");

  return [
    `You control NPCs in a fantasy MMO town. Time: ${phase}.`,
    "For each NPC below, generate a SHORT line of dialogue (8-20 words) they would say RIGHT NOW based on their personality and surroundings.",
    "Also choose an action: patrol, approach_nearest_player, return_home, or stand_still.",
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
              action: ["patrol", "approach_nearest_player", "return_home", "stand_still"].includes(r.action) ? r.action : "patrol",
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

function tickAiNpcs(activeNpcs, allPlayers, onChat, now, hour) {
  if (!AI_ENABLED) return;

  const aiNpcs = activeNpcs.filter(n =>
    n.aiPersonality &&
    !n.isTrader &&
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
      return buildNpcPerception(npc, nearby, nearbyNpcs, phase);
    });

    scheduleAiBatch(perceptions, batchNpcIds);
    nextBatchAt = now + AI_BATCH_INTERVAL_MS;
  }

  for (const npc of aiNpcs) {
    const result = consumeAiResult(npc.id);
    if (!result) continue;

    const cooldownOk = now >= (npc._aiNextLineCooldownUntil || 0);
    if (result.line && cooldownOk) {
      npc._aiNextLine = result.line;
      npc._aiNextLineCooldownUntil = now + AI_SPEECH_COOLDOWN_MS + Math.random() * 15000;
    }

    if (result.action === "approach_nearest_player" && allPlayers) {
      let nearest = null;
      let nearD = Infinity;
      for (const row of allPlayers) {
        const p = row.player;
        if (!p) continue;
        const d = Math.hypot(p.x - npc.x, p.y - npc.y);
        if (d < nearD) { nearD = d; nearest = p; }
      }
      if (nearest && nearD < 20) {
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
    } else {
      npc._aiAction = null;
      npc._aiActionUntil = 0;
    }
  }
}

module.exports = { tickAiNpcs };
