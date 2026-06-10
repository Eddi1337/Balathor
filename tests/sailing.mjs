// Functional test for the nautical sailing overhaul:
//  - momentum-based boat physics (throttle ramp, coasting)
//  - plank-only boarding/disembarking with a deck boundary
//  - automated docking that glides the ship onto the pier plank
//  - dismissable NPC crew that walk the plank and disappear
//  - slow-traverse side cannons aimed at a world point
//
// Run with: node tests/sailing.mjs

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { connectAndJoin, maskedFrame, latestSelfPlayer, waitForSnapshot } from "./lib/wsHelpers.mjs";

const require = createRequire(import.meta.url);
const oceanus = require("../server/src/worlds/oceanusWorld.js");

const serverPort = 19000 + (process.pid % 900);
const username = `Sail${process.pid}`;

const server = spawn(process.execPath, ["server/src/index.js"], {
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(serverPort),
    ACCOUNT_STORE_PATH: `/tmp/balathor-sail-accounts-${process.pid}.json`,
    WORLD_DB_PATH: `/tmp/balathor-sail-world-${process.pid}.sqlite`,
    DISCORD_AUTH_WEBHOOK_URL: ""
  },
  stdio: "ignore"
});

async function waitForHealth() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${serverPort}/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await delay(250);
  }
  throw new Error("server did not become healthy");
}

function send(socket, message) {
  socket.write(maskedFrame(JSON.stringify(message)));
}

function sendKeys(socket, keys) {
  send(socket, { type: "input", keys });
}

function self(messages) {
  return latestSelfPlayer(messages, username);
}

function sawMessage(messages, name) {
  return messages.some((m) => m.type === "serverMessage" && m.message === name);
}

async function walkToward(socket, messages, tx, ty, { timeoutMs = 30000, arrive = 1.0, stopWhen = null } = {}) {
  const start = Date.now();
  for (;;) {
    const me = self(messages);
    assert.ok(me, "no self snapshot while walking");
    if (stopWhen && stopWhen(me)) {
      sendKeys(socket, {});
      return me;
    }
    const dx = tx - me.x;
    const dy = ty - me.y;
    if (Math.hypot(dx, dy) <= arrive) {
      sendKeys(socket, {});
      return me;
    }
    if (Date.now() - start > timeoutMs) {
      sendKeys(socket, {});
      throw new Error(`walkToward timed out at (${me.x.toFixed(1)}, ${me.y.toFixed(1)}) heading for (${tx.toFixed(1)}, ${ty.toFixed(1)})`);
    }
    send(socket, { type: "view", view: { x: me.x, y: me.y, halfW: 40, halfH: 30 } });
    sendKeys(socket, {
      left: dx < -0.3,
      right: dx > 0.3,
      up: dy < -0.3,
      down: dy > 0.3
    });
    await delay(120);
    await waitForSnapshot(socket, messages, username, () => true, 4000);
  }
}

await waitForHealth();
const { socket, messages } = await connectAndJoin(serverPort, { username, password: "sail-password" });
// keep pumping snapshots in the background for the whole test
const pump = setInterval(() => {
  waitForSnapshot(socket, messages, username, () => true, 1500).catch(() => {});
}, 400);

try {
  // ── 1. Walk into the Seafarer Cave portal (fantasy → oceanus) ──────────────
  await waitForSnapshot(socket, messages, username, (p) => Number.isFinite(p.x), 5000);
  await walkToward(socket, messages, -20, 0.8, { timeoutMs: 40000, stopWhen: (p) => p.x < -40000 });
  let me = await waitForSnapshot(socket, messages, username, (p) => p.x < -40000, 10000);
  console.log("arrived in oceanus at", me.x.toFixed(1), me.y.toFixed(1));

  // Arrival leaves the player's boat moored (at the hub dock) and the player ashore.
  me = await waitForSnapshot(socket, messages, username, (p) => p.ship && p.ship.moored === true && p.ship.boarded === false, 8000);
  console.log("boat moored at", me.ship.worldX.toFixed(1), me.ship.worldY.toFixed(1));

  // ── 2. Walk to the starter pier head and summon the boat to this dock ──────
  const starterPort = oceanus.oceanusPortById("starter_isle_dock");
  assert.ok(starterPort && Number.isFinite(starterPort.plankX), "starter dock should expose a pier-head plank");
  await walkToward(socket, messages, starterPort.plankX, starterPort.plankY - 1.6, { arrive: 0.8 });
  send(socket, { type: "shipTerminalAction", action: "summon" });
  me = await waitForSnapshot(
    socket,
    messages,
    username,
    (p) => p.ship && p.ship.moored === true && Math.hypot(p.ship.worldX - starterPort.x, p.ship.worldY - starterPort.y) < 14,
    8000
  );
  const pose = { x: me.ship.worldX, y: me.ship.worldY, facing: me.ship.facing };
  console.log("boat summoned to starter pier:", pose.x.toFixed(1), pose.y.toFixed(1), "facing", pose.facing.toFixed(2));

  // ── 3. Board by walking off the pier head onto the boarding plank ──────────
  await walkToward(socket, messages, starterPort.plankX, starterPort.plankY + 1.2, {
    arrive: 0.4,
    timeoutMs: 15000,
    stopWhen: (p) => p.ship?.boarded === true
  });
  me = await waitForSnapshot(socket, messages, username, (p) => p.ship?.boarded === true, 8000);
  assert.equal(me.ship.moored, true, "boarding via plank keeps the boat moored");
  assert.ok(sawMessage(messages, "ship_boarded"), "expected ship_boarded message");
  console.log("boarded via plank; deckMode:", me.ship.deckMode);

  // ── 4. Dismiss the NPC crew member — they walk the plank and vanish ────────
  assert.ok(Array.isArray(me.ship.crew) && me.ship.crew.length >= 1, "sloop should carry one NPC crew");
  const crewId = me.ship.crew[0].id;
  const crewLocal = me.ship.crew[0];
  sendKeys(socket, {
    up: crewLocal.localY < -0.5,
    down: crewLocal.localY > 0.5,
    left: crewLocal.localX < -0.5,
    right: crewLocal.localX > 0.5
  });
  await delay(650);
  sendKeys(socket, {});
  send(socket, { type: "shipCrewCommand", crewId, action: "dismiss" });
  await waitForSnapshot(socket, messages, username, () => sawMessage(messages, "ship_crew_dismissed"), 5000);
  const overboardSeen = await waitForSnapshot(
    socket,
    messages,
    username,
    (p) => Array.isArray(p.ship?.crew) && p.ship.crew.some((c) => c.id === crewId && c.overboard),
    6000
  ).then(() => true).catch(() => false);
  me = await waitForSnapshot(
    socket,
    messages,
    username,
    (p) => Array.isArray(p.ship?.crew) && !p.ship.crew.some((c) => c.id === crewId),
    25000
  );
  assert.equal(overboardSeen, true, "crew should be visibly overboard before disappearing");
  console.log("crew dismissed, walked the plank and disappeared");

  // ── 5. Take the helm and cast off — momentum physics ───────────────────────
  send(socket, { type: "interact", x: me.ship.worldX + 2.8, y: me.ship.worldY });
  me = await waitForSnapshot(socket, messages, username, (p) => p.ship?.stationRole === "pilot" || p.ship?.stationId === "helm", 6000);
  console.log("took the helm");

  sendKeys(socket, { up: true });
  me = await waitForSnapshot(socket, messages, username, (p) => p.ship?.moored === false, 6000);
  assert.ok(sawMessage(messages, "ship_set_sail"), "expected ship_set_sail message");
  const speedSamples = [];
  for (let i = 0; i < 6; i += 1) {
    await delay(350);
    const snap = await waitForSnapshot(socket, messages, username, () => true, 3000);
    speedSamples.push(Math.abs(Number(snap.ship?.sailSpeed) || 0));
  }
  sendKeys(socket, {});
  assert.ok(speedSamples[speedSamples.length - 1] > 1.5, `boat should build speed gradually (got ${speedSamples.join(", ")})`);
  assert.ok(speedSamples[0] < speedSamples[speedSamples.length - 1], "speed should ramp up, not jump");
  console.log("throttle ramp:", speedSamples.map((s) => s.toFixed(1)).join(" -> "));

  // Coast: with keys released the boat keeps way on for a while.
  await delay(700);
  const coasting = await waitForSnapshot(socket, messages, username, () => true, 3000);
  assert.ok(Math.abs(Number(coasting.ship?.sailSpeed) || 0) > 0.4, "boat should coast after releasing the throttle");
  console.log("coasting at", Number(coasting.ship.sailSpeed).toFixed(1));

  // ── 6. Automated docking glides the boat back onto a pier plank ────────────
  send(socket, { type: "shipDockRequest" });
  me = await waitForSnapshot(socket, messages, username, (p) => Boolean(p.ship?.docking) || p.ship?.moored === true, 10000);
  assert.ok(sawMessage(messages, "ship_dock_engaged"), "expected ship_dock_engaged message");
  me = await waitForSnapshot(socket, messages, username, (p) => p.ship?.moored === true, 35000);
  assert.ok(sawMessage(messages, "ship_moored"), "expected ship_moored message");
  console.log("auto-dock complete; moored at", me.ship.worldX.toFixed(1), me.ship.worldY.toFixed(1));

  // ── 7. Side cannon slews slowly toward the aim point ───────────────────────
  send(socket, { type: "interact" }); // leave the helm
  await delay(300);
  send(socket, { type: "interact", x: me.ship.worldX - 0.8, y: me.ship.worldY - 1.0 });
  me = await waitForSnapshot(socket, messages, username, (p) => p.ship?.stationRole === "gunner", 6000);
  console.log("manning the cannon");

  sendKeys(socket, { aimX: me.ship.worldX + 30, aimY: me.ship.worldY - 30 });
  const angles = [];
  for (let i = 0; i < 6; i += 1) {
    await delay(300);
    const snap = await waitForSnapshot(socket, messages, username, () => true, 3000);
    const cannons = snap.ship?.cannons || {};
    const angle = Number(Object.values(cannons)[0]);
    if (Number.isFinite(angle)) angles.push(angle);
  }
  assert.ok(angles.length >= 3, "cannon angles should stream in snapshots");
  const spread = Math.abs(angles[angles.length - 1] - angles[0]);
  assert.ok(spread > 0.05, `cannon should traverse toward the aim point over time (angles ${angles.map((a) => a.toFixed(2)).join(", ")})`);
  console.log("cannon traverse:", angles.map((a) => a.toFixed(2)).join(" -> "));

  // ── 8. Disembark over the plank back onto the pier ─────────────────────────
  send(socket, { type: "interact" }); // leave the gunner seat
  await delay(300);
  sendKeys(socket, { down: true }); // deck-local +y → starboard plank → off
  me = await waitForSnapshot(socket, messages, username, (p) => p.ship && p.ship.boarded === false, 15000);
  sendKeys(socket, {});
  assert.ok(
    sawMessage(messages, "ship_docked") || sawMessage(messages, "ship_plank_disembarked") || sawMessage(messages, "ship_plank_overboard"),
    "expected a disembark message"
  );
  assert.equal(me.ship.moored, true, "boat stays moored at the pier after stepping off");
  console.log("walked the plank back ashore at", me.x.toFixed(1), me.y.toFixed(1));

  console.log("\nALL SAILING TESTS PASSED");
} finally {
  clearInterval(pump);
  socket.destroy();
  server.kill();
}
