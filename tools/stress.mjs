#!/usr/bin/env node
// Balathor v2 load generator: N bots register, create characters, wander and fight.
// Usage: node tools/stress.mjs --url ws://127.0.0.1:8080/ws --bots 60 --duration 60

import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    url: { type: "string", default: "ws://127.0.0.1:8080/ws" },
    bots: { type: "string", default: "50" },
    duration: { type: "string", default: "60" },
    ramp: { type: "string", default: "40" },
    /** "town" (everyone piles into the market: worst case) or "spread" (bots scatter, needs DEV_COMMANDS=1). */
    mode: { type: "string", default: "town" }
  }
});

const BOTS = Number(args.bots);
const DURATION = Number(args.duration) * 1000;
const CLASSES = ["ranger", "mage", "knight"];
const stats = { joined: 0, snapshots: 0, bytes: 0, errors: 0, fx: 0 };
const health = { samples: 0, tickSum: 0, tickMax: 0 };
const healthUrl = args.url.replace(/^ws/, "http").replace(/\/ws$/, "/health");
const SPOTS = ["/map overworld", "/tp 180 10", "/tp -180 10", "/tp 10 180", "/map station", "/map space 40 220", "/map ocean", "/map planet:aurelia", "/map cave:grotto"];
const run = Date.now().toString(36);

function bot(i) {
  const ws = new WebSocket(args.url);
  const name = `Bot${run.slice(-4)}${i}`.replace(/[^A-Za-z0-9]/g, "").slice(0, 15);
  let seq = 0;
  let timer = null;
  ws.onmessage = (ev) => {
    stats.bytes += ev.data.length;
    const m = JSON.parse(ev.data);
    if (m.t === "hello") ws.send(JSON.stringify({ t: "auth", mode: "register", user: `b${run}${i}`.slice(0, 16), pass: "stress-test-pw" }));
    else if (m.t === "auth" && m.ok) ws.send(JSON.stringify(m.hasCharacter ? { t: "play" } : { t: "create", name: `${name[0]}${name.slice(1).toLowerCase()}`, cls: CLASSES[i % 3], look: {} }));
    else if (m.t === "auth" && !m.ok) stats.errors += 1;
    else if (m.t === "welcome" && !timer) {
      stats.joined += 1;
      if (args.mode === "spread") ws.send(JSON.stringify({ t: "chat", text: SPOTS[i % SPOTS.length] }));
      let a = Math.random() * Math.PI * 2;
      timer = setInterval(() => {
        if (Math.random() < 0.15) a += (Math.random() - 0.5) * 2;
        seq += 1;
        ws.send(JSON.stringify({ t: "in", seq, mx: Math.cos(a), my: Math.sin(a), f: a }));
        if (Math.random() < 0.3) ws.send(JSON.stringify({ t: "attack", a }));
        if (Math.random() < 0.01) ws.send(JSON.stringify({ t: "chat", text: "hello!" }));
      }, 200);
    } else if (m.t === "s") stats.snapshots += 1;
    else if (m.t === "fx") stats.fx += m.ev.length;
  };
  ws.onerror = () => (stats.errors += 1);
  ws.onclose = () => clearInterval(timer);
  return ws;
}

const sockets = [];
for (let i = 0; i < BOTS; i += 1) {
  sockets.push(bot(i));
  await new Promise((r) => setTimeout(r, Number(args.ramp)));
}
const start = Date.now();
const poll = setInterval(async () => {
  try {
    const h = await (await fetch(healthUrl)).json();
    health.samples += 1;
    health.tickSum += h.tickCostMs;
    health.tickMax = Math.max(health.tickMax, h.tickCostMs);
    health.last = h;
  } catch {
    // server busy / unreachable: skip this sample
  }
}, 1000);
const report = setInterval(() => {
  const secs = (Date.now() - start) / 1000;
  const h = health.last ?? {};
  console.log(`[${secs.toFixed(0)}s] joined ${stats.joined}/${BOTS}  snapshots/s ${(stats.snapshots / secs).toFixed(0)}  KB/s ${(stats.bytes / 1024 / secs).toFixed(0)}  fx ${stats.fx}  errors ${stats.errors}  tick ${h.tickCostMs ?? "?"}ms players ${h.players ?? "?"}`);
}, 5000);
await new Promise((r) => setTimeout(r, DURATION));
clearInterval(report);
clearInterval(poll);
for (const ws of sockets) ws.close();
const secs = (Date.now() - start) / 1000;
console.log(`done: joined ${stats.joined}/${BOTS}, ${(stats.bytes / 1024 / secs / Math.max(1, stats.joined)).toFixed(1)} KB/s per bot, errors ${stats.errors}`);
if (health.samples) console.log(`server tick cost (smoothed): avg ${(health.tickSum / health.samples).toFixed(2)}ms, max ${health.tickMax.toFixed(2)}ms of a 50ms budget`);
process.exit(0);
