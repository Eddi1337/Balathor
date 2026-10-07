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
      export { CASTLE_PORTALS } from "./src/shared/world/housing";
      export { LAUNCH_PAD, STATION_GATE, STATION_ARRIVAL, ALCOVES } from "./src/shared/world/scifi/station";
      export { POIS_BY_ID } from "./src/shared/world/scifi/space";
      export { STATION } from "./src/shared/world/maps";
      export { findPath } from "./src/shared/game/pathfind";
      export { NPCS } from "./src/shared/game/npcs";
      export { getMap } from "./src/shared/world/maps";
      export { PLANETS, PLANET_PAD, planetSpawns } from "./src/shared/world/scifi/planets";
      export { isBlockingTile } from "./src/shared/world/tiles";
      export { labLayout, LAB_IDS } from "./src/shared/world/scifi/labs";
      export { LIFTS } from "./src/shared/world/scifi/station";
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
/** Wait until an NPC is replicated to this client, then return its entity id. */
async function npcId(cl, defId) {
  await cl.wait(() => cl.npc(defId), 3000, defId);
  return cl.npc(defId).id;
}
const me = () => c.entities.get(c.id);

test("the station deck is connected: every NPC, the pad, lifts and gate are reachable", () => {
  const from = W.STATION_ARRIVAL;
  const targets = [W.LAUNCH_PAD, { x: W.STATION_GATE.x, y: W.STATION_GATE.y + 1.4 }, ...W.NPCS.filter((n) => n.map === "station")];
  for (const t of targets) {
    const path = W.findPath(W.STATION, from.x, from.y, t.x, t.y);
    assert.ok(path, `path to ${t.id ?? `${t.x},${t.y}`}`);
  }
});

test("the castle's Stargate leads to Ringforge Station and back", async () => {
  await c.chat(`/map castle:throne ${W.CASTLE_PORTALS.station.x} ${W.CASTLE_PORTALS.station.y}`, 1200);
  c.messages = [];
  c.send({ t: "door", id: "stargate_in" });
  await c.wait((m) => m.t === "welcome" && m.map === "station", 3000, "arrived on station");
  await c.wait(() => c.npc("npc_orla"), 3000, "Orla on deck");
  await sleep(800);
  await tp(W.STATION_GATE.x, W.STATION_GATE.y + 1.4);
  c.messages = [];
  c.send({ t: "door", id: "stargate_out" });
  await c.wait((m) => m.t === "welcome" && m.map === "castle:throne", 3000, "back in the castle");
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
  c.send({ t: "talk", id: await npcId(c, "npc_pax") });
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
    await d.chat("/time 0.45");
    // Hand-wave the welcome quest: talk to Rin, Pip, Brunhild, Rin.
    for (const npc of ["npc_rin", "npc_pip", "npc_brunhild", "npc_rin"]) {
      await d.chat(`/tpnpc ${npc}`);
      d.send({ t: "talk", id: await npcId(d, npc) });
      await sleep(400);
      const offer = d.messages.findLast?.((m) => m.t === "questOffer" && m.id === "q_welcome");
      if (offer) d.send({ t: "questAccept", id: "q_welcome" });
      await sleep(300);
    }
    await d.selfWhere((s) => s.quests.done.includes("q_welcome"), 3000, "welcome done");
    await d.chat("/tpnpc npc_astra");
    d.send({ t: "talk", id: await npcId(d, "npc_astra") });
    await d.wait((m) => m.t === "questOffer" && m.id === "q_stargate", 2000, "stargate offer");
    d.send({ t: "questAccept", id: "q_stargate" });
    await d.selfWhere((s) => s.quests.active.some((q) => q.id === "q_stargate"), 2000, "accepted");
    await d.chat(`/map castle:throne ${W.CASTLE_PORTALS.station.x} ${W.CASTLE_PORTALS.station.y}`, 1200);
    d.send({ t: "door", id: "stargate_in" });
    await d.wait((m) => m.t === "welcome" && m.map === "station", 3000, "on station");
    await d.selfWhere((s) => s.quests.active.find((q) => q.id === "q_stargate")?.step === 1, 3000, "visit step done");
    await d.chat("/tpnpc npc_orla");
    d.send({ t: "talk", id: await npcId(d, "npc_orla") });
    await d.selfWhere((s) => s.quests.done.includes("q_stargate"), 3000, "quest complete");
    // Orla's next quest gives you your first ship.
    await d.wait((m) => m.t === "questOffer" && m.id === "q_wings", 2000, "wings offer");
    d.send({ t: "questAccept", id: "q_wings" });
    await d.chat("/tpnpc npc_pax");
    d.send({ t: "talk", id: await npcId(d, "npc_pax") });
    await sleep(400);
    await d.chat("/tpnpc npc_orla");
    d.send({ t: "talk", id: await npcId(d, "npc_orla") });
    await d.selfWhere((s) => s.ships.includes("skiff") && s.activeShip === "skiff", 3000, "got the skiff");
  } finally {
    d.close();
  }
});

test("planets: guides, landmarks and bosses are reachable from the landing pad", () => {
  for (const id of ["aurelia", "icefall", "rust"]) {
    const def = W.PLANETS[id];
    const map = W.getMap(`planet:${id}`);
    assert.equal(map.kind, "surface");
    const spawns = W.planetSpawns(def);
    assert.ok(spawns.length > 60, `${id} has ${spawns.length} creatures`);
    const boss = spawns.find((sp) => sp.id.endsWith("_boss"));
    const guide = W.NPCS.find((n) => n.map === `planet:${id}`);
    for (const [label, t] of [["guide", guide], ["landmark", def.landmark], ["boss", boss]]) {
      const path = W.findPath(map, W.PLANET_PAD.x, W.PLANET_PAD.y + 2.5, t.x, t.y, 60000);
      assert.ok(path, `${id}: path to ${label}`);
    }
  }
});

test("land on Aurelia, meet Fern, gather glowwood and launch back to orbit", async () => {
  await c.chat("/map space 290 -100", 1500);
  await c.wait(() => me()?.sh, 3000, "flying");
  c.messages = [];
  c.send({ t: "dock" });
  await c.wait((m) => m.t === "welcome" && m.map === "planet:aurelia", 3000, "landed");
  await c.wait(() => c.npc("npc_fern"), 3000, "Fern by the pad");
  await c.wait(() => me()?.sh === "", 3000, "on foot");
  // Glowwood needs a hatchet and Woodcutting 8.
  await c.chat("/prof woodcutting 10");
  await c.chat("/time 0.45");
  await c.chat("/tpnpc npc_bram");
  c.send({ t: "talk", id: await npcId(c, "npc_bram") });
  const shop = await c.wait((m) => m.t === "shop" && m.shop?.id === "tools", 3000, "tool shop");
  c.send({ t: "buy", shop: "tools", idx: shop.shop.stock.find((e) => e.item.tpl === "tool_hatchet").idx });
  await c.selfWhere((s) => s.inv.some((i) => i?.tpl === "tool_hatchet"), 3000, "hatchet");
  await c.chat("/map planet:aurelia", 1500);
  const map = W.getMap("planet:aurelia");
  let tree = null;
  for (let r = 10; r < 60 && !tree; r += 1) {
    for (let a = 0; a < Math.PI * 2 && !tree; a += 0.05) {
      const x = Math.floor(Math.cos(a) * r);
      const y = Math.floor(Math.sin(a) * r);
      if (map.tileAt(x + 0.5, y + 0.5) !== 20) continue; // Tile.TREE
      if (!W.isBlockingTile(map.tileAt(x + 1.5, y + 0.5))) tree = { x, y };
    }
  }
  assert.ok(tree, "a glowwood tree");
  await c.chat(`/tp ${tree.x + 1.5} ${tree.y + 0.5}`, 1200);
  c.messages = [];
  c.send({ t: "gather", x: tree.x, y: tree.y });
  await c.wait((m) => m.t === "gather" && m.state === "done", 5000, "chopped glowwood");
  await c.selfWhere((s) => s.inv.some((i) => i?.tpl === "log_glowwood"), 3000, "glowwood log");
  await c.chat(`/tp ${W.PLANET_PAD.x} ${W.PLANET_PAD.y}`, 1200);
  c.messages = [];
  c.send({ t: "launch" });
  await c.wait((m) => m.t === "welcome" && m.map === "space", 3000, "back in orbit");
});

test("tech labs: every room connects the lift pad to the Overseer", () => {
  for (const id of W.LAB_IDS) {
    const L = W.labLayout(id);
    const map = W.getMap(`lab:${id}`);
    assert.equal(map.kind, "deck");
    for (const rm of L.rooms) {
      const path = W.findPath(map, L.pad.x, L.pad.y + 1.5, rm.x + rm.w / 2, rm.y + rm.h / 2, 60000);
      assert.ok(path, `lab ${id}: room at ${rm.x},${rm.y}`);
    }
  }
});

test("the lift takes you down to Tech Lab I, where the Overseer waits", async () => {
  const lift = W.LIFTS[0];
  await c.chat(`/map station ${lift.x} ${lift.y + 1}`, 1500);
  await sleep(700);
  c.messages = [];
  c.send({ t: "door", id: "lift_1" });
  await c.wait((m) => m.t === "welcome" && m.map === "lab:1", 3000, "in the lab");
  const L = W.labLayout(1);
  await c.chat(`/tp ${L.boss.x - 6} ${L.boss.y}`, 1500);
  await c.wait(() => [...c.entities.values()].some((e) => e.k === "m" && e.tpl === "overseer_1"), 3000, "Overseer Mk I");
  await c.chat(`/tp ${L.pad.x} ${L.pad.y + 1}`, 1500);
  c.messages = [];
  c.send({ t: "door", id: "lift_1_up" });
  await c.wait((m) => m.t === "welcome" && m.map === "station", 3000, "back on the station");
});

test("jobs are repeatable: Orla offers the freight job again after you hand it in", async () => {
  await c.chat("/xp 20000");
  await c.chat("/questdone q_freight");
  for (let round = 0; round < 2; round += 1) {
    await c.chat("/tpnpc npc_orla", 1200);
    c.messages = [];
    c.send({ t: "talk", id: await npcId(c, "npc_orla") });
    const offer = await c.wait((m) => m.t === "questOffer", 3000, `freight offer #${round + 1}`);
    assert.equal(offer.id, "j_freight");
    c.send({ t: "questAccept", id: "j_freight" });
    await c.selfWhere((s) => s.quests.active.some((q) => q.id === "j_freight"), 2000, "accepted");
    await c.chat("/map space -560 -80", 1500);
    await c.selfWhere((s) => s.quests.active.find((q) => q.id === "j_freight")?.step === 1, 4000, "delivered");
    await c.chat("/tpnpc npc_orla", 1200);
    c.send({ t: "talk", id: await npcId(c, "npc_orla") });
    await c.selfWhere((s) => !s.quests.active.some((q) => q.id === "j_freight"), 3000, "handed in");
  }
  assert.ok(c.self.quests.done.includes("j_freight"));
});
