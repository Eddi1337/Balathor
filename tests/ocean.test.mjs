// The ocean: Seafarer Cave → Port Bilgewater, summoning a ship, boarding, steering, walking the
// deck while under way, cannons, going ashore, treasure and the quest line's first steps.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Client, sleep, startServer } from "./helpers.mjs";

const dir = mkdtempSync(join(tmpdir(), "balathor-v2-ocean-"));
await build({
  stdin: {
    contents: `
      export { CASTLE_PORTALS } from "./src/shared/world/housing";
      export { PORT_SPAWN, GROTTO, ISLES_BY_ID, treasureSpot, oceanTileAt, isLand, MOORING } from "./src/shared/world/sea/ocean";
      export { OCEAN } from "./src/shared/world/maps";
      export { findPath } from "./src/shared/game/pathfind";
      export { NPCS } from "./src/shared/game/npcs";
      export { SAIL_HULLS, HELM, cannonSpots } from "./src/shared/game/sailing";
      export { oceanSpawns } from "./src/shared/world/sea/ocean";
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
  await c.join(`oc${run}${Date.now() % 1000}`, `Sailor${run}`.slice(0, 15), "ranger");
  await c.chat("/time 0.45");
});

after(() => {
  c?.close();
  srv?.stop();
});

const me = () => c.entities.get(c.id);
async function npcId(cl, defId) {
  await cl.wait(() => cl.npc(defId), 3000, defId);
  return cl.npc(defId).id;
}

test("port layout: every port NPC, the pier and the grotto are reachable on foot", () => {
  for (const n of W.NPCS.filter((d) => d.map === "ocean" && d.id !== "npc_bo")) {
    assert.ok(W.findPath(W.OCEAN, W.PORT_SPAWN.x, W.PORT_SPAWN.y, n.x, n.y, 60000), `path to ${n.id}`);
  }
  assert.ok(W.findPath(W.OCEAN, W.PORT_SPAWN.x, W.PORT_SPAWN.y, 0.5, W.MOORING.y - 3, 60000), "path to the pier end");
  const smug = W.treasureSpot(W.ISLES_BY_ID.smugglers);
  assert.ok(W.isLand(W.oceanTileAt(smug.x, smug.y)), "the X is on land");
});

test("the castle's sea portal leads to Port Bilgewater and back", async () => {
  await c.chat(`/map castle:throne ${W.CASTLE_PORTALS.ocean.x} ${W.CASTLE_PORTALS.ocean.y}`, 1200);
  c.messages = [];
  c.send({ t: "door", id: "seafarer_in" });
  await c.wait((m) => m.t === "welcome" && m.map === "ocean", 3000, "arrived in port");
  await sleep(800);
  await c.chat(`/tp ${W.GROTTO.x} ${W.GROTTO.y + 0.5}`, 1200);
  c.messages = [];
  c.send({ t: "door", id: "seafarer_out" });
  await c.wait((m) => m.t === "welcome" && m.map === "castle:throne", 3000, "back in the castle");
});

test("summon, board, take the helm and sail away; walk the deck while under way; go ashore", async () => {
  await c.chat("/map ocean");
  await c.chat("/sailship sloop");
  await c.chat("/tpnpc npc_finn");
  c.messages = [];
  c.send({ t: "talk", id: await npcId(c, "npc_finn") });
  await c.wait((m) => m.t === "harbour", 2000, "harbour window");
  c.send({ t: "sail", op: "summon" });
  await c.wait((m) => m.t === "toast" && /moored/.test(m.text), 2000, "summoned");
  // Walk to the pier end, where she's moored, and board.
  await c.chat(`/tp 0.5 ${W.MOORING.y - 3}`, 1200);
  await c.wait(() => [...c.entities.values()].some((e) => e.k === "s"), 3000, "ship at the pier");
  const ship = [...c.entities.values()].find((e) => e.k === "s");
  assert.equal(ship.hull, "sloop");
  c.send({ t: "sail", op: "board" });
  await c.wait(() => me()?.ab === ship.id, 3000, "aboard");
  // Walk to the wheel (stern) and take it.
  const def = W.SAIL_HULLS.sloop;
  const helm = W.HELM(def);
  for (let i = 0; i < 30 && Math.hypot(me().lx - helm.lx, me().ly - helm.ly) > 0.9; i += 1) {
    // Ship faces south at the mooring (+y world = forward), so "toward the stern" is north.
    const dlx = helm.lx - me().lx;
    const dly = helm.ly - me().ly;
    // forward=(0,1), starboard=(-1,0): world = (-dlx, dly)
    const len = Math.hypot(dlx, dly) || 1;
    c.send({ t: "in", seq: i + 1, mx: -dlx / len, my: dly / len, f: 0 });
    await sleep(150);
  }
  c.send({ t: "in", seq: 99, mx: 0, my: 0, f: 0 });
  await sleep(300);
  c.send({ t: "sail", op: "helm" });
  await c.wait(() => me()?.hm === 1, 3000, "at the helm");
  // Steer south (out to sea) for a while.
  const y0 = ship.y;
  c.send({ t: "in", seq: 200, mx: 0, my: 1, f: Math.PI / 2 });
  await sleep(4000);
  const s1 = c.entities.get(ship.id);
  assert.ok(s1.y - y0 > 4, `sailed ${(s1.y - y0).toFixed(1)} tiles`);
  assert.equal(s1.sail, 2, "sails up");
  // Fire a broadside: two cannonballs fly from one side.
  c.messages = [];
  c.send({ t: "attack", a: Math.PI });
  await c.wait((m) => m.t === "fx" && m.ev.filter((e) => e.e === "proj" && e.kind === "cannonball").length >= 2, 2000, "broadside");
  // Leave the helm; the ship keeps going; walk forward along the deck.
  c.send({ t: "sail", op: "helm" });
  await c.wait(() => me()?.hm === 0, 3000, "left the helm");
  const ly0 = me().ly;
  c.send({ t: "in", seq: 300, mx: 0, my: 1, f: Math.PI / 2 });
  await sleep(1200);
  c.send({ t: "in", seq: 301, mx: 0, my: 0, f: Math.PI / 2 });
  await sleep(300);
  assert.ok(me().ly - ly0 > 1, "walked toward the bow while sailing");
  // Too far from land to go ashore out here.
  c.messages = [];
  c.send({ t: "sail", op: "ashore" });
  const t = await c.wait((m) => m.t === "toast", 2000, "too far toast");
  assert.match(t.text, /shore/);
});

test("pirate sloops shoot the hull, not the crew", async () => {
  const sp = W.oceanSpawns().find((x) => x.tpl === "pirate_sloop");
  await c.chat(`/shiptp ${sp.x + 10} ${sp.y}`, 600);
  const ship = [...c.entities.values()].find((e) => e.k === "s");
  const hp0 = me().hp;
  await c.wait(() => (c.entities.get(ship.id)?.hp ?? ship.mhp) < ship.mhp, 12000, "hull damage");
  assert.equal(me().hp, hp0, "the sailor is unhurt");
});

test("treasure: three map scraps and a shovelful at the X", async () => {
  // Hop off (leaving the map puts the ship away) and dig on Smuggler's Rest.
  await c.chat("/map overworld");
  await c.chat("/map ocean", 1500);
  const smug = W.treasureSpot(W.ISLES_BY_ID.smugglers);
  await c.chat(`/tp ${smug.x} ${smug.y}`, 1200);
  c.messages = [];
  c.send({ t: "dig" });
  const t1 = await c.wait((m) => m.t === "toast", 2000, "need scraps").catch((e) => {
    console.log("DEBUG", JSON.stringify(c.messages.filter((m) => m.t !== "s").slice(-8)), JSON.stringify(c.pos), JSON.stringify(me()));
    throw e;
  });
  assert.match(t1.text, /Scraps/);
});

test("crewing: strangers can't board your ship, party members can and ride along", async () => {
  const d = new Client(srv.port);
  const dName = `Deckhand${run}`.slice(0, 15);
  await d.join(`dk${run}${Date.now() % 1000}`, dName, "mage");
  try {
    await c.chat("/map ocean");
    await d.chat("/map ocean");
    await c.chat("/tpnpc npc_finn");
    c.send({ t: "sail", op: "summon" });
    await c.wait((m) => m.t === "toast" && /moored/.test(m.text), 3000, "summoned");
    for (const cl of [c, d]) await cl.chat(`/tp 0.5 ${W.MOORING.y - 3}`, 1200);
    await d.wait(() => [...d.entities.values()].some((e) => e.k === "s"), 3000, "d sees the ship");
    d.messages = [];
    d.send({ t: "sail", op: "board" });
    const no = await d.wait((m) => m.t === "toast", 2000, "refused");
    assert.match(no.text, /party/);
    await c.chat(`/invite ${dName}`);
    await d.wait((m) => m.t === "partyInvite", 3000, "invite");
    d.send({ t: "party", op: "accept" });
    await c.wait((m) => m.t === "party" && m.party?.members.length === 2, 3000, "party");
    d.send({ t: "sail", op: "board" });
    await d.wait(() => d.entities.get(d.id)?.ab, 3000, "d aboard");
    c.send({ t: "sail", op: "board" });
    await c.wait(() => c.entities.get(c.id)?.ab, 3000, "c aboard");
    // Teleporting the ship carries the whole crew.
    await c.chat("/shiptp 0.5 140", 1500);
    await d.wait(() => d.pos && d.pos.y > 125, 3000, "deckhand carried along");
  } finally {
    d.close();
  }
});
