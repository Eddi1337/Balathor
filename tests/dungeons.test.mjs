// Cave dungeons and party-instanced group dungeons.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Client, sleep, startServer } from "./helpers.mjs";

const dir = mkdtempSync(join(tmpdir(), "balathor-v2-dg-"));
await build({
  stdin: {
    contents: `
      export { CAVE_MOUTHS_BY_ID, mouthFront, tileAt } from "./src/shared/world/overworld";
      export { CAVES, caveLayout, caveSpawns } from "./src/shared/world/dungeons/caves";
      export { GROUP_DUNGEONS, DUNGEON_DOORS, dungeonLayout } from "./src/shared/world/dungeons/group";
      export { getMap, OVERWORLD } from "./src/shared/world/maps";
      export { findPath } from "./src/shared/game/pathfind";
      export { isBlockingTile } from "./src/shared/world/tiles";
      export { oceanTileAt } from "./src/shared/world/sea/ocean";
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
let a;
let b;
const run = (Date.now() % 1e6).toString(36).replace(/\d/g, "");

before(async () => {
  // A wide view so the boss room is visible from the (safe) entry room.
  srv = await startServer({ DEV_COMMANDS: "1", AOI_RADIUS: "96" });
  a = new Client(srv.port);
  await a.join(`da${run}${Date.now() % 1000}`, `Delver${run}`.slice(0, 15), "knight");
  b = new Client(srv.port);
  await b.join(`db${run}${Date.now() % 1000}`, `Buddy${run}`.slice(0, 15), "mage");
  await a.chat("/xp 40000");
  await b.chat("/xp 40000");
});

after(() => {
  a?.close();
  b?.close();
  srv?.stop();
});

const mobs = (c, tpl) => [...c.entities.values()].filter((e) => e.k === "m" && e.tpl === tpl);

test("caves: mouths are open on the island and every cave connects its entrance to its boss", () => {
  for (const id of Object.keys(W.CAVES)) {
    const front = W.mouthFront(W.CAVE_MOUTHS_BY_ID[id]);
    assert.ok(!W.isBlockingTile(W.tileAt(front.x, front.y)), `${id} mouth is walkable`);
    const L = W.caveLayout(id);
    const map = W.getMap(`cave:${id}`);
    assert.equal(map.kind, "cave");
    assert.ok(W.findPath(map, L.entry.x + 1, L.entry.y, L.boss.x, L.boss.y, 120000), `${id}: entrance to boss`);
    assert.ok(W.caveSpawns(id).length > 20, `${id} has monsters`);
  }
  const crypt = W.mouthFront(W.CAVE_MOUTHS_BY_ID.crypt);
  assert.ok(!W.isBlockingTile(W.tileAt(crypt.x, crypt.y)), "crypt mouth is walkable");
  assert.ok(!W.isBlockingTile(W.oceanTileAt(W.DUNGEON_DOORS.sunken.x, W.DUNGEON_DOORS.sunken.y)), "temple door on Turtle Cove is walkable");
});

test("walk into the Mossy Grotto and find Mother Mossbloom", async () => {
  const front = W.mouthFront(W.CAVE_MOUTHS_BY_ID.grotto);
  await a.chat(`/tp ${front.x} ${front.y}`, 1200);
  a.messages = [];
  a.send({ t: "door", id: "cave_grotto_in" });
  await a.wait((m) => m.t === "welcome" && m.map === "cave:grotto", 3000, "in the grotto");
  const L = W.caveLayout("grotto");
  await a.chat(`/tp ${L.boss.x - 4} ${L.boss.y}`, 1500);
  await a.wait(() => mobs(a, "boss_mossbloom").length > 0, 3000, "Mother Mossbloom");
});

test("group dungeons: each party gets its own instance, scaled to its size", async () => {
  // Solo: a's own copy of the crypt.
  const front = W.mouthFront(W.CAVE_MOUTHS_BY_ID.crypt);
  await a.chat(`/map overworld ${front.x} ${front.y}`, 1200);
  a.messages = [];
  a.send({ t: "door", id: "dungeon_crypt_in" });
  await a.wait((m) => m.t === "welcome" && m.map === "dungeon:crypt", 3000, "a in the crypt");
  const L = W.dungeonLayout("crypt");
  await a.wait(() => mobs(a, "boss_hollow_king").length > 0, 3000, "the Hollow King (solo)");
  const soloHp = mobs(a, "boss_hollow_king")[0].mhp;

  // b goes in alone too: a different copy (it can't see a).
  await b.chat(`/map overworld ${front.x} ${front.y}`, 1200);
  b.send({ t: "door", id: "dungeon_crypt_in" });
  await b.wait((m) => m.t === "welcome" && m.map === "dungeon:crypt", 3000, "b in the crypt");
  await b.wait(() => mobs(b, "boss_hollow_king").length > 0, 3000, "b's Hollow King");
  assert.ok(!b.entities.has(a.id), "separate instances");

  // Form a party, both leave and re-enter: one shared, tougher copy.
  for (const c of [a, b]) await c.chat("/map overworld", 1200);
  await a.chat(`/invite ${`Buddy${run}`.slice(0, 15)}`);
  await b.wait((m) => m.t === "partyInvite", 3000, "party invite");
  b.send({ t: "party", op: "accept" });
  await a.wait((m) => m.t === "party" && m.party?.members.length === 2, 3000, "party formed");
  for (const c of [a, b]) {
    await c.chat(`/tp ${front.x} ${front.y}`, 1200);
    c.messages = [];
    c.send({ t: "door", id: "dungeon_crypt_in" });
    await c.wait((m) => m.t === "welcome" && m.map === "dungeon:crypt", 3000, "party member in").catch((e) => {
      console.log("DEBUG", JSON.stringify(c.messages.filter((m) => m.t !== "s" && m.t !== "fx").slice(-6)), JSON.stringify(c.pos));
      throw e;
    });
  }
  await a.wait(() => a.entities.has(b.id), 3000, "together in one instance");
  await a.wait(() => mobs(a, "boss_hollow_king").length > 0, 3000, "party Hollow King");
  assert.ok(mobs(a, "boss_hollow_king")[0].mhp > soloHp * 1.4, "tougher for a party of two");
});
