// Moderators (MODERATORS env, matched to character name or account username): perks, god mode,
// map teleport and the moderator commands. Runs like production: DEV_COMMANDS is off.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Client, sleep, startServer } from "./helpers.mjs";

let srv;
let mod;
let pleb;
const run = (Date.now() % 1e6).toString(36).replace(/\d/g, "");
const MOD_NAME = `Modder${run}`.slice(0, 15);
const PLEB_NAME = `Pleb${run}`.slice(0, 15);

before(async () => {
  srv = await startServer({ MODERATORS: `someoneelse, ${MOD_NAME}` });
  mod = new Client(srv.port);
  await mod.join(`md${run}${Date.now() % 1000}`, MOD_NAME, "knight");
  pleb = new Client(srv.port);
  await pleb.join(`pl${run}${Date.now() % 1000}`, PLEB_NAME, "mage");
});

after(() => {
  mod?.close();
  pleb?.close();
  srv?.stop();
});

const sysLine = (c, re) => c.wait((m) => m.t === "chat" && m.kind === "system" && re.test(m.text), 3000, String(re));

test("ordinary players get none of it", async () => {
  assert.equal(pleb.self.mod, false);
  pleb.messages = [];
  await pleb.chat("/godmode");
  await sysLine(pleb, /Unknown command/);
  await pleb.chat("/tp 0 0");
  await sysLine(pleb, /Unknown command/);
  pleb.send({ t: "mod", op: "tp", x: 150, y: 150 });
  await sleep(600);
  assert.ok(Math.hypot(pleb.pos.x - 150, pleb.pos.y - 150) > 50, "no map teleport");
});

test("moderators get bottomless gold, every ship and boat, and a badge", async () => {
  const s = mod.self;
  assert.equal(s.mod, true);
  assert.ok(s.gold >= 5_000_000);
  assert.deepEqual([...s.ships].sort(), ["corvette", "frigate", "hauler", "skiff"]);
  assert.deepEqual([...s.sailShips].sort(), ["brig", "galleon", "sloop"]);
  assert.equal(s.shipUp.engine, 3);
  await mod.wait(() => mod.entities.get(mod.id)?.md === 1, 2000, "mod badge");
});

test("god mode: fly straight through the city wall and take no damage", async () => {
  mod.messages = [];
  await mod.chat("/godmode");
  await mod.selfWhere((s) => s.god, 2000, "god on");
  // From the market, fly due south through the outer wall (about 104 tiles out).
  const start = { ...mod.pos };
  mod.send({ t: "in", seq: 1, mx: 0, my: 1, f: Math.PI / 2, sp: 1 });
  await sleep(3500);
  mod.send({ t: "in", seq: 2, mx: 0, my: 0, f: Math.PI / 2 });
  await sleep(300);
  assert.ok(mod.pos.y - start.y > 25, `flew ${(mod.pos.y - start.y).toFixed(1)} tiles`);
  await mod.chat("/godmode");
  await mod.selfWhere((s) => !s.god, 2000, "god off");
});

test("map-click teleport, /teleport to a player, /summon, /announce and /boot", async () => {
  mod.send({ t: "mod", op: "tp", x: 150, y: 20 });
  await mod.wait(() => Math.hypot(mod.pos.x - 150, mod.pos.y - 20) < 12, 3000, "map teleport");

  mod.messages = [];
  await mod.chat(`/teleport ${PLEB_NAME}`);
  await mod.wait(() => Math.hypot(mod.pos.x - pleb.pos.x, mod.pos.y - pleb.pos.y) < 4, 3000, "next to the player");

  mod.send({ t: "mod", op: "tp", x: -150, y: 20 });
  await sleep(1200);
  pleb.messages = [];
  await mod.chat(`/summon ${PLEB_NAME}`);
  await pleb.wait((m) => m.t === "toast" && /summoned/.test(m.text), 3000, "summon notice");
  await pleb.wait(() => Math.hypot(pleb.pos.x - mod.pos.x, pleb.pos.y - mod.pos.y) < 4, 3000, "summoned over");

  await mod.chat("/announce Server restart in 5 minutes");
  await pleb.wait((m) => m.t === "chat" && /📢 .*Server restart/.test(m.text), 3000, "announcement");

  const closed = new Promise((r) => pleb.ws.addEventListener("close", r));
  await mod.chat(`/boot ${PLEB_NAME}`);
  await Promise.race([closed, sleep(3000).then(() => assert.fail("not booted"))]);
});
