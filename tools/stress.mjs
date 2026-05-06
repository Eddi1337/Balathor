#!/usr/bin/env node
/**
 * Balathor stress tester
 *
 * Usage:
 *   node tools/stress.mjs [options]
 *
 * Options:
 *   --url      ws://host:port/ws   Target server   (default: wss://balathor.edmundmurphy.com/ws)
 *   --clients N                    Number of clients (default: 100)
 *   --bots     N                   Alias for --clients
 *   --duration S                   Run duration    (default: 300 seconds)
 *   --ramp     ms                  Delay between each client spawn (default: 25 ms)
 *   --attack                       Clients occasionally attack  (default: off)
 */

import crypto from "node:crypto";
import { parseArgs } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";

const { values: argv } = parseArgs({
  options: {
    url:           { type: "string",  default: "wss://balathor.edmundmurphy.com/ws" },
    clients:       { type: "string" },
    bots:          { type: "string" },
    duration:      { type: "string",  default: "300" },
    ramp:          { type: "string",  default: "25" },
    attack:        { type: "boolean", default: false },
  },
  strict: true,
});

const SERVER_URL = argv.url;
const clientCountArg = argv.clients ?? argv.bots ?? "100";
const BOT_COUNT  = parsePositiveInteger(clientCountArg, "--clients", 1);
const DURATION_S = parsePositiveInteger(argv.duration, "--duration", 1);
const RAMP_MS    = parseNonNegativeInteger(argv.ramp, "--ramp");
const DO_ATTACK  = argv.attack;

if (typeof WebSocket !== "function") {
  throw new Error("This stress runner requires Node.js 22 or newer with the built-in WebSocket client.");
}

const wsUrl = new URL(SERVER_URL);
if (wsUrl.protocol !== "ws:" && wsUrl.protocol !== "wss:") {
  throw new Error(`Only ws:// and wss:// URLs are supported: ${SERVER_URL}`);
}
const wsPath = wsUrl.pathname && wsUrl.pathname !== "/" ? wsUrl.pathname : "/ws";
const TARGET_URL = new URL(`${wsPath}${wsUrl.search}`, wsUrl.origin).toString();

const BOT_CLASSES = ["ranger", "mage", "knight"];
const BOT_COLORS  = ["#5cc8ff", "#ff7a45", "#f2c45f", "#9ee7ff", "#8fe388", "#f26d6d"];
const NAME_STARTS = ["Ar", "Bel", "Cor", "Da", "El", "Fen", "Gal", "Hal", "Is", "Jar", "Ka", "Lor", "Mar", "Nor", "Or", "Per", "Quin", "Ren", "Sol", "Tor", "Ul", "Val", "Wyn", "Xan", "Yor", "Zen"];
const NAME_ENDS = ["adan", "amir", "avel", "dric", "emar", "eth", "ian", "ivar", "len", "mir", "ric", "rin", "tan", "ven", "wyn"];
const DIRS = [
  { up: true,  down: false, left: false, right: false },
  { up: false, down: true,  left: false, right: false },
  { up: false, down: false, left: true,  right: false },
  { up: false, down: false, left: false, right: true  },
  { up: true,  down: false, left: true,  right: false },
  { up: true,  down: false, left: false, right: true  },
  { up: false, down: true,  left: true,  right: false },
  { up: false, down: true,  left: false, right: true  },
  { up: false, down: false, left: false, right: false },
];

// ---------------------------------------------------------------------------
// Shared counters
// ---------------------------------------------------------------------------
const stats = {
  spawned:  0,
  connected: 0,
  joined:    0,
  peakConnected: 0,
  peakJoined: 0,
  errors:    0,
  rxTotal:   0,
  txTotal:   0,
  rxSec:     0,
  txSec:     0,
  latencyMs: [],   // last N snapshot latencies
  snapshotCount: 0,
};
let rxWindow = 0;
let txWindow = 0;

// ---------------------------------------------------------------------------
// Bot implementation
// ---------------------------------------------------------------------------
function spawnBot(index) {
  stats.spawned++;
  const name = randomName(index);
  const classId = BOT_CLASSES[index % BOT_CLASSES.length];
  const primary = BOT_COLORS[index % BOT_COLORS.length];
  const accent  = BOT_COLORS[(index + 3) % BOT_COLORS.length];

  const socket = new WebSocket(TARGET_URL);

  let joined   = false;
  let selfId   = null;
  let inputTimer = null;
  let wanderTimer = null;
  let attackTimer = null;
  let currentDir  = randomDir();
  let lastPingSent = 0;
  let connected = false;
  let cleaned = false;

  socket.addEventListener("open", () => {
    connected = true;
    stats.connected++;
    stats.peakConnected = Math.max(stats.peakConnected, stats.connected);
    send({ type: "hello", name, classId, primary, accent });
  });

  socket.addEventListener("message", (event) => {
    stats.rxTotal++;
    rxWindow++;
    let msg;
    try { msg = JSON.parse(messageDataToString(event.data)); } catch { return; }
    handleMessage(msg);
  });

  socket.addEventListener("error", () => { stats.errors++; cleanup(); });
  socket.addEventListener("close", () => { cleanup(); });

  function handleMessage(msg) {
    if (msg.type === "welcome") {
      if (joined) return;
      joined  = true;
      selfId  = msg.selfId;
      stats.joined++;
      stats.peakJoined = Math.max(stats.peakJoined, stats.joined);
      startBotLoop();
    } else if (msg.type === "snapshot") {
      stats.snapshotCount++;
      if (lastPingSent > 0) {
        stats.latencyMs.push(Date.now() - lastPingSent);
        if (stats.latencyMs.length > 200) stats.latencyMs.shift();
        lastPingSent = 0;
      }
    }
  }

  function startBotLoop() {
    // Send input at 30 fps
    inputTimer = setInterval(() => {
      lastPingSent = Date.now();
      send({ type: "input", keys: currentDir });
    }, 33);

    // Change direction randomly every 400-1200 ms
    const rescheduleWander = () => {
      const delay = 400 + Math.random() * 800;
      wanderTimer = setTimeout(() => {
        currentDir = randomDir();
        rescheduleWander();
      }, delay);
    };
    rescheduleWander();

    // Occasionally attack (if enabled)
    if (DO_ATTACK) {
      const rescheduleAttack = () => {
        const delay = 600 + Math.random() * 1200;
        attackTimer = setTimeout(() => {
          send({ type: "attack" });
          rescheduleAttack();
        }, delay);
      };
      rescheduleAttack();
    }
  }

  function send(obj) {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(obj));
    stats.txTotal++;
    txWindow++;
  }

  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    if (inputTimer)  clearInterval(inputTimer);
    if (wanderTimer) clearTimeout(wanderTimer);
    if (attackTimer) clearTimeout(attackTimer);
    if (joined) stats.joined = Math.max(0, stats.joined - 1);
    if (connected) stats.connected = Math.max(0, stats.connected - 1);
  }

  return {
    destroy: () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      cleanup();
    }
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const bots = [];
const startTime = Date.now();
let stopping = false;
let ticker = null;
let reporter = null;
let shutdownTimer = null;

console.log(`Balathor stress test - ${BOT_COUNT} clients -> ${TARGET_URL} for ${DURATION_S}s`);
console.log(`Ramp: ${RAMP_MS}ms between clients  |  Attack: ${DO_ATTACK ? "on" : "off"}\n`);

// Spawn bots with a ramp delay
(async () => {
  for (let i = 0; i < BOT_COUNT; i++) {
    if (stopping) break;
    bots.push(spawnBot(i));
    if (RAMP_MS > 0) await sleep(RAMP_MS);
  }
})();

// Rolling per-second counters
ticker = setInterval(() => {
  stats.rxSec = rxWindow;
  stats.txSec = txWindow;
  rxWindow = 0;
  txWindow = 0;
}, 1000);

// Live stats display
reporter = setInterval(() => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  const avgLat  = stats.latencyMs.length
    ? Math.round(stats.latencyMs.reduce((a, b) => a + b, 0) / stats.latencyMs.length)
    : "-";

  process.stdout.write(
    `\r[${elapsed}s] ` +
    `connected: ${stats.connected}  joined: ${stats.joined}  ` +
    `rx: ${stats.rxSec}/s  tx: ${stats.txSec}/s  ` +
    `snapshots: ${stats.snapshotCount}  latency: ${avgLat}ms  ` +
    `errors: ${stats.errors}  ` +
    `total rx: ${fmtNum(stats.rxTotal)}  tx: ${fmtNum(stats.txTotal)}    `
  );
}, 500);

// Shutdown after duration
shutdownTimer = setTimeout(() => stopAndExit(0), DURATION_S * 1000);
process.once("SIGINT", () => stopAndExit(130));
process.once("SIGTERM", () => stopAndExit(143));

function stopAndExit(exitCode) {
  if (stopping) return;
  stopping = true;
  if (shutdownTimer) clearTimeout(shutdownTimer);
  if (ticker) clearInterval(ticker);
  if (reporter) clearInterval(reporter);
  process.stdout.write("\n");

  console.log("\n-- Results ------------------------------------------");
  console.log(`Duration    : ${DURATION_S}s`);
  console.log(`Clients     : ${stats.spawned}/${BOT_COUNT} spawned`);
  console.log(`Peak conn.  : ${stats.peakConnected}`);
  console.log(`Peak joined : ${stats.peakJoined}`);
  console.log(`Errors      : ${stats.errors}`);
  console.log(`Total rx    : ${fmtNum(stats.rxTotal)} msgs`);
  console.log(`Total tx    : ${fmtNum(stats.txTotal)} msgs`);
  console.log(`Snapshots   : ${fmtNum(stats.snapshotCount)}`);
  if (stats.latencyMs.length) {
    const sorted = [...stats.latencyMs].sort((a, b) => a - b);
    console.log(`Latency avg : ${Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length)}ms`);
    console.log(`Latency p50 : ${sorted[Math.floor(sorted.length * 0.50)]}ms`);
    console.log(`Latency p95 : ${sorted[Math.floor(sorted.length * 0.95)]}ms`);
    console.log(`Latency p99 : ${sorted[Math.floor(sorted.length * 0.99)]}ms`);
  }
  console.log("------------------------------------------------------");

  for (const bot of bots) bot.destroy();
  process.exit(exitCode);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function randomName(index) {
  const start = NAME_STARTS[crypto.randomInt(NAME_STARTS.length)];
  const end = NAME_ENDS[crypto.randomInt(NAME_ENDS.length)];
  const suffix = crypto.randomInt(1000, 10000);
  return `${start}${end}${suffix}-${index + 1}`;
}

function randomDir() {
  return DIRS[Math.floor(Math.random() * DIRS.length)];
}

function messageDataToString(data) {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
  return String(data);
}

function parsePositiveInteger(value, label, min) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new Error(`${label} must be an integer >= ${min}`);
  }
  return parsed;
}

function parseNonNegativeInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be an integer >= 0`);
  }
  return parsed;
}

function fmtNum(n) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
       : n >= 1_000     ? `${(n / 1_000).toFixed(1)}K`
       : String(n);
}
