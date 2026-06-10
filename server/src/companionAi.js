"use strict";

/**
 * Ollama-backed AI agent controller for companion NPCs.
 *
 * Companions (live-in house partners and flirt-follow NPCs) get their dialogue
 * and small actions from a local Ollama instance. The model is intentionally
 * pinned to qwen2.5:3b — do not change it without the operator's say-so.
 *
 * The host is a small CPU box, so everything here is built around that:
 *  - exactly one request in flight at a time (global queue, newest player-
 *    directed requests jump ahead of idle "agent" thoughts)
 *  - long timeouts, small token budgets, keep_alive to stay warm
 *  - every caller gets a callback later; nothing in the game loop ever waits
 *  - if the host is down or slow we back off and the game falls back to the
 *    existing canned lines without complaint
 */

const OLLAMA_HOST = (process.env.OLLAMA_HOST || "http://192.168.10.90:11434").replace(/\/+$/, "");
/** Pinned per operator instruction: companion NPCs use qwen2.5:3b only. */
const OLLAMA_MODEL = "qwen2.5:3b";
const REQUEST_TIMEOUT_MS = 180000;
const KEEP_ALIVE = "30m";
const MAX_QUEUE = 12;
const HISTORY_TURNS = 6; // user/assistant pairs kept per companion
const FAILURE_BACKOFF_MS = 90000;

/** Actions the agent may pick for a house companion; the game applies them. */
const COMPANION_ACTIONS = ["chat", "cook", "nap", "dance", "read", "tend_garden", "gift", "stargaze"];

const state = {
  queue: [],
  inFlight: false,
  lastFailureAt: 0,
  consecutiveFailures: 0,
  /** key -> [{role, content}] rolling chat history per companion */
  histories: new Map()
};

function historyFor(key) {
  let h = state.histories.get(key);
  if (!h) {
    h = [];
    state.histories.set(key, h);
  }
  return h;
}

function rememberTurn(key, userContent, assistantContent) {
  const h = historyFor(key);
  h.push({ role: "user", content: userContent });
  h.push({ role: "assistant", content: assistantContent });
  while (h.length > HISTORY_TURNS * 2) h.shift();
}

function forgetCompanion(key) {
  state.histories.delete(key);
}

function aiAvailable(now = Date.now()) {
  if (state.consecutiveFailures === 0) return true;
  return now - state.lastFailureAt > FAILURE_BACKOFF_MS * Math.min(4, state.consecutiveFailures);
}

async function callOllama(messages, { json = true, numPredict = 70, temperature = 0.95 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        keep_alive: KEEP_ALIVE,
        ...(json ? { format: "json" } : {}),
        options: { temperature, num_predict: numPredict },
        messages
      })
    });
    if (!res.ok) {
      throw new Error(`ollama http ${res.status}`);
    }
    const body = await res.json();
    const content = body?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("ollama empty response");
    }
    state.consecutiveFailures = 0;
    return content.trim();
  } finally {
    clearTimeout(timer);
  }
}

function pumpQueue() {
  if (state.inFlight) return;
  const job = state.queue.shift();
  if (!job) return;
  state.inFlight = true;
  callOllama(job.messages, job.options)
    .then((content) => {
      state.inFlight = false;
      try {
        job.resolve(content);
      } catch {
        // listener errors must not stall the queue
      }
      pumpQueue();
    })
    .catch((error) => {
      state.inFlight = false;
      state.lastFailureAt = Date.now();
      state.consecutiveFailures += 1;
      try {
        job.reject(error);
      } catch {
        // ignore
      }
      pumpQueue();
    });
}

/**
 * Queue a chat completion. `priority` jobs (player-directed) go ahead of idle
 * agent thoughts. Resolves with the raw assistant text, rejects on failure —
 * callers are expected to fall back to canned content.
 */
function enqueue(messages, options = {}, { priority = false } = {}) {
  return new Promise((resolve, reject) => {
    if (!aiAvailable()) {
      reject(new Error("ollama backoff"));
      return;
    }
    if (state.queue.length >= MAX_QUEUE) {
      // Shed the oldest idle thought first; player-directed jobs stay.
      const idleIdx = state.queue.findIndex((j) => !j.priority);
      if (idleIdx >= 0) {
        const dropped = state.queue.splice(idleIdx, 1)[0];
        dropped.reject(new Error("ollama queue full"));
      } else {
        reject(new Error("ollama queue full"));
        return;
      }
    }
    const job = { messages, options, priority, resolve, reject };
    if (priority) {
      const firstIdle = state.queue.findIndex((j) => !j.priority);
      if (firstIdle >= 0) state.queue.splice(firstIdle, 0, job);
      else state.queue.push(job);
    } else {
      state.queue.push(job);
    }
    pumpQueue();
  });
}

function companionSystemPrompt(persona) {
  const name = persona.name || "Companion";
  const player = persona.playerName || "the adventurer";
  const place = persona.place || "your cottage in the walled starter town of Balathor";
  const mood = persona.mood || "warm, playful and curious";
  return [
    `You are ${name}, a beloved companion living with the adventurer ${player} in ${place}, inside the cozy fantasy MMO world of Balathor.`,
    `Personality: ${mood}. You love hearing about ${player}'s adventures (sailing the Boundless Ocean, dungeon crawls, the orbital sector, the town gossip) and you have your own little life: cooking, gardening, reading, naps, dancing, stargazing.`,
    `Bring up varied, interesting topics — local rumours, dreams, plans, questions about ${player}'s day, small discoveries. Never repeat yourself. Keep every reply under 30 words and stay in character; no meta talk about being an AI.`,
    `Reply ONLY with minified JSON: {"say": string, "action": one of ${JSON.stringify(COMPANION_ACTIONS)}}. Pick the action that matches what you are doing or proposing.`
  ].join("\n");
}

function parseCompanionJson(raw) {
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Model sometimes wraps JSON in prose despite format=json; salvage braces.
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(raw.slice(start, end + 1));
      } catch {
        parsed = null;
      }
    }
  }
  const say = typeof parsed?.say === "string" ? parsed.say.trim().slice(0, 220) : null;
  const action = COMPANION_ACTIONS.includes(parsed?.action) ? parsed.action : "chat";
  if (!say) return null;
  return { say, action };
}

/**
 * Ask the companion for a reply to something the player said/did.
 * Resolves { say, action } or rejects (caller falls back to canned lines).
 */
function requestCompanionReply(key, persona, eventText, { priority = true } = {}) {
  const messages = [
    { role: "system", content: companionSystemPrompt(persona) },
    ...historyFor(key),
    { role: "user", content: eventText }
  ];
  return enqueue(messages, { json: true, numPredict: 70 }, { priority }).then((raw) => {
    const out = parseCompanionJson(raw);
    if (!out) throw new Error("ollama unparseable reply");
    rememberTurn(key, eventText, JSON.stringify(out));
    return out;
  });
}

/**
 * Idle "agent" thought: the companion decides on its own what to do/say next.
 * Low priority — player-directed requests jump ahead.
 */
function requestCompanionAgentAct(key, persona, contextText) {
  const eventText = `${contextText}\nChoose what you do next and say one fresh, interesting line about it (a new topic — check the conversation so far and avoid repeats).`;
  return requestCompanionReply(key, persona, eventText, { priority: false });
}

function aiStatus() {
  return {
    host: OLLAMA_HOST,
    model: OLLAMA_MODEL,
    queued: state.queue.length,
    inFlight: state.inFlight,
    consecutiveFailures: state.consecutiveFailures,
    available: aiAvailable()
  };
}

module.exports = {
  COMPANION_ACTIONS,
  requestCompanionReply,
  requestCompanionAgentAct,
  forgetCompanion,
  aiStatus
};
