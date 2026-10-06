// The sci-fi realm: Stargate → Ringforge Station → launch → flight, lasers & mining → warp →
// dock, the hangar, ship damage and the first sci-fi quest.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Client, sleep, startServer } from "./helpers.mjs";

const dir = mkdtempSync(join(tmpdir(), "balathor-v2-scifi-"));
await build({
  stdin: {
    contents: `
      export { STARGATE_FRONT } from "./src/shared/world/scifi/stargate";
      export { LAUNCH_PAD, STATION_GATE, STATION_ARRIVAL, ALCOVES } from "./src/shared/world/scifi/station";
      export { POIS_BY_ID } from "./src/shared/world/scifi/space";
      export { STATION } from "./src/shared/world/maps";
      export { findPath } from "./src/shared/game/pathfind";
      export { NPCS } from "./src/shared/game/npcs";
    `,
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: join(dir, "w.mjs"),
  logLevel: "silent"
});
const W = await import(pathToFileURL(join(dir, "w.mjs")).href);
rmSync(dir, { recursive: true, force: true });

let srv;
let c;
const run = (Date.now() % 1e6).toString(36).replace(/\d/g, "");

before(async () => {
  srv = await startServer({ DEV_COMMANDS: "1" });
  c = new Client(srv.port);
  await c.join(`sf${run}${Date.now() % 1000}`, `Pilot${run}`.slice(0, 15), "ranger");
});

after(() => {
  c?.close();
  srv?.stop();
});

const tp = (x, y) => c.chat(`/tp ${x.toFixed(2)} ${y.toFixed(2)}`, 1200);
const me = () => c.entities.get(c.id);

test("the station deck is connected: every NPC, the pad, lifts and gate are reachable", () => {
  const from = W.STATION_ARRIVAL;
  const targets = [W.LAUNCH_PAD, { x: W.STATION_GATE.x, y: W.STATION_GATE.y + 1.4 }, ...W.NPCS.filter((n) => n.map === "station")];
  for (const t of targets) {
    const path = W.findPath(W.STATION, from.x, from.y, t.x, t.y);
    assert.ok(path, `path to ${t.id ?? `${t.x},${t.y}`}`);
  }
});

test("step through the Stargate to Ringforge Station and back", async () => {
  await tp(W.STARGATE_FRONT.x, W.STARGATE_FRONT.y);
  c.messages = [];
  c.send({ t: "door", id: "stargate_in" });
  await c.wait((m) => m.t === "welcome" && m.map === "station", 3000, "arrived on station");
  await c.wait(() => c.npc("npc_orla"), 3000, "Orla on deck");
  await sleep(800);
  await tp(W.STATION_GATE.x, W.STATION_GATE.y + 1.4);
  c.messages = [];
  c.send({ t: "door", id: "stargate_out" });
  await c.wait((m) => m.t === "welcome" && m.map === "overworld", 3000, "back home");
});

test("launch, fly, mine an asteroid with lasers, warp home and dock", async () => {
  await c.chat("/map station");
  await tp(W.LAUNCH_PAD.x, W.LAUNCH_PAD.y);
  c.messages = [];
  c.send({ t: "launch" });
  const noShip = await c.wait((m) => m.t === "toast", 2000, "no ship yet");
  assert.match(noShip.text, /ship/);
  await c.chat("/ship skiff");
  c.messages = [];
  c.send({ t: "launch" });
  await c.wait((m) => m.t === "welcome" && m.map === "space", 3000, "in space");
  await c.wait(() => me()?.sh === "skiff", 3000, "flying the skiff");

  // Fly south for two seconds.
  await sleep(500);
  const y0 = c.pos.y;
  c.send({ t: "in", seq: 1, mx: 0, my: 1, f: Math.PI / 2 });
  await sleep(2000);
  c.send({ t: "in", seq: 2, mx: 0, my: 0, f: Math.PI / 2 });
  assert.ok(c.pos.y - y0 > 12, `flew ${(c.pos.y - y0).toFixed(1)} tiles`);

  // The South Belt: shoot the nearest asteroid until it cracks and the tractor beam grabs ore.
  const belt = W.POIS_BY_ID.south_belt;
  await c.chat(`/tp ${belt.x} ${belt.y}`, 1500);
  const rock = [...c.entities.values()].filter((e) => e.k === "m" && e.tpl === "asteroid_ferrite" && !e.dead).sort((a, b) => Math.hypot(a.x - c.pos.x, a.y - c.pos.y) - Math.hypot(b.x - c.pos.x, b.y - c.pos.y))[0];
  assert.ok(rock, "an asteroid nearby");
  await c.chat(`/tp ${(rock.x - 4).toFixed(2)} ${rock.y.toFixed(2)}`, 1200);
  for (let i = 0; i < 40 && !(c.entities.get(rock.id)?.dead); i += 1) {
    c.send({ t: "attack", a: Math.atan2(rock.y - c.pos.y, rock.x - c.pos.x) });
    await sleep(400);
  }
  assert.equal(c.entities.get(rock.id)?.dead ?? 1, 1, "asteroid cracked");
  await c.chat(`/tp ${rock.x.toFixed(2)} ${rock.y.toFixed(2)}`, 300);
  await c.selfWhere((s) => s.inv.some((i) => i?.tpl === "ore_ferrite"), 4000, "tractored ore");
  await c.selfWhere((s) => s.discovered.includes("south_belt"), 3000, "discovered the belt");

  // Warp back to Ringforge and dock.
  c.messages = [];
  c.send({ t: "warp", dest: "ringforge" });
  await c.wait((m) => m.t === "warp" && m.state === "charge", 2000, "warp charging");
  const warped = await c.wait((m) => m.t === "warp" && m.state === "done", 5000, "warped");
  assert.ok(Math.hypot(warped.x, warped.y) < 40, "near the station");
  await sleep(400);
  c.send({ t: "dock" });
  await c.wait((m) => m.t === "welcome" && m.map === "station", 3000, "docked");
  await c.wait(() => me()?.sh === "", 3000, "on foot again");
});

test("the hangar sells ships and upgrades", async () => {
  await c.chat("/gold 9000");
  await c.chat("/tpnpc npc_pax");
  c.messages = [];
  c.send({ t: "talk", id: c.npc("npc_pax").id });
  await c.wait((m) => m.t === "hangar", 2000, "hangar opens");
  c.send({ t: "hangar", op: "buy", hull: "corvette" });
  await c.selfWhere((s) => s.ships.includes("corvette") && s.activeShip === "corvette", 3000, "bought a corvette");
  c.send({ t: "hangar", op: "upgrade", slot: "weapon" });
  await c.selfWhere((s) => s.shipUp.weapon === 1, 3000, "upgraded lasers");
  c.send({ t: "hangar", op: "select", hull: "skiff" });
  await c.selfWhere((s) => s.activeShip === "skiff", 3000, "switched back");
});

test("pirates shoot back: shields soak hits before the hull", async () => {
  await tp(W.LAUNCH_PAD.x, W.LAUNCH_PAD.y);
  c.send({ t: "launch" });
  await c.wait((m) => m.t === "welcome" && m.map === "space", 3000, "in space");
  const lane = { x: -330, y: -50 };
  await c.chat(`/tp ${lane.x} ${lane.y}`, 1500);
  const pirate = [...c.entities.values()].find((e) => e.k === "m" && e.tpl === "pirate_fighter" && !e.dead);
  assert.ok(pirate, "a pirate on the lane");
  await c.chat(`/tp ${(pirate.x + 6).toFixed(2)} ${pirate.y.toFixed(2)}`, 300);
  await c.wait(() => (me()?.sd ?? 100) < 100, 8000, "shield took a hit");
});

test("the Stargate quest leads to the station and Orla", async () => {
  // A fresh pilot who has finished the welcome quest and is level 5.
  const d = new Client(srv.port);
  await d.join(`sq${run}${Date.now() % 1000}`, `Quest${run}`.slice(0, 15), "mage");
  try {
    await d.chat("/xp 2000");
    // Hand-wave the welcome quest: talk to Rin, Pip, Brunhild, Rin.
    for (const npc of ["npc_rin", "npc_pip", "npc_brunhild", "npc_rin"]) {
      await d.chat(`/tpnpc ${npc}`);
      d.send({ t: "talk", id: d.npc(npc).id });
      await sleep(400);
      const offer = d.messages.findLast?.((m) => m.t === "questOffer" && m.id === "q_welcome");
      if (offer) d.send({ t: "questAccept", id: "q_welcome" });
      await sleep(300);
    }
    await d.selfWhere((s) => s.quests.done.includes("q_welcome"), 3000, "welcome done");
    await d.chat("/tpnpc npc_astra");
    d.send({ t: "talk", id: d.npc("npc_astra").id });
    await d.wait((m) => m.t === "questOffer" && m.id === "q_stargate", 2000, "stargate offer");
    d.send({ t: "questAccept", id: "q_stargate" });
    await d.selfWhere((s) => s.quests.active.some((q) => q.id === "q_stargate"), 2000, "accepted");
    await d.chat(`/tp ${W.STARGATE_FRONT.x} ${W.STARGATE_FRONT.y}`, 1200);
    d.send({ t: "door", id: "stargate_in" });
    await d.wait((m) => m.t === "welcome" && m.map === "station", 3000, "on station");
    await d.selfWhere((s) => s.quests.active.find((q) => q.id === "q_stargate")?.step === 1, 3000, "visit step done");
    await d.chat("/tpnpc npc_orla");
    d.send({ t: "talk", id: d.npc("npc_orla").id });
    await d.selfWhere((s) => s.quests.done.includes("q_stargate"), 3000, "quest complete");
    // Orla's next quest gives you your first ship.
    await d.wait((m) => m.t === "questOffer" && m.id === "q_wings", 2000, "wings offer");
    d.send({ t: "questAccept", id: "q_wings" });
    await d.chat("/tpnpc npc_pax");
    d.send({ t: "talk", id: d.npc("npc_pax").id });
    await sleep(400);
    await d.chat("/tpnpc npc_orla");
    d.send({ t: "talk", id: d.npc("npc_orla").id });
    await d.selfWhere((s) => s.ships.includes("skiff") && s.activeShip === "skiff", 3000, "got the skiff");
  } finally {
    d.close();
  }
});
