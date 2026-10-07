// Homes, interiors, furniture, storage, the castle and river currents.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Client, sleep, startServer } from "./helpers.mjs";

const dir = mkdtempSync(join(tmpdir(), "balathor-v2-m3-"));
await build({
  stdin: {
    contents: `
      export { PLOTS, CASTLE_FRONT } from "./src/shared/world/housing";
      export { riverAt } from "./src/shared/world/rivers";
      export { tileAt } from "./src/shared/world/overworld";
      export { Tile } from "./src/shared/world/tiles";
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
const plot = W.PLOTS[0];

before(async () => {
  srv = await startServer({ DEV_COMMANDS: "1" });
  a = new Client(srv.port);
  await a.join(`ha${run}${Date.now() % 1000}`, `Home${run}`.slice(0, 15), "mage");
  b = new Client(srv.port);
  await b.join(`hb${run}${Date.now() % 1000}`, `Guest${run}`.slice(0, 15), "knight");
  await a.chat("/time 0.45");
});

after(() => {
  a?.close();
  b?.close();
  srv?.stop();
});

const tp = (c, x, y) => c.chat(`/tp ${x.toFixed(2)} ${y.toFixed(2)}`, 1200);

test("buy a home from its doorstep; strangers stay out until it's opened", async () => {
  await a.chat("/gold 6000");
  await tp(a, plot.front.x, plot.front.y);
  a.messages = [];
  a.send({ t: "door", id: `${plot.id}_in` });
  const notice = await a.wait((m) => m.t === "toast", 2000, "for-sale notice");
  assert.match(notice.text, /for sale/);
  a.send({ t: "house", op: "buy", plot: plot.id });
  await a.wait((m) => m.t === "houses" && m.list.find((h) => h.plot === plot.id)?.owner, 3000, "ownership broadcast");
  const self = await a.selfWhere((s) => s.home === plot.id, 3000, "self.home");
  assert.equal(self.gold, 6025 - plot.price);

  await tp(b, plot.front.x, plot.front.y);
  b.messages = [];
  b.send({ t: "door", id: `${plot.id}_in` });
  const locked = await b.wait((m) => m.t === "toast", 2000, "locked toast");
  assert.match(locked.text, /locked/);
  a.send({ t: "house", op: "open", plot: plot.id, open: true });
  await sleep(500);
  b.send({ t: "door", id: `${plot.id}_in` });
  const w = await b.wait((m) => m.t === "welcome" && m.map === `house:${plot.id}:0`, 3000, "guest inside");
  assert.ok(w);
  await sleep(800); // doors have a short anti-bounce cooldown
  b.send({ t: "door", id: `${plot.id}_out` });
  await b.wait((m) => m.t === "welcome" && m.map === "overworld", 3000, "guest back outside");
});

test("furniture: buy from Marta, place inside (with rules), storage chest", async () => {
  await a.chat("/tpnpc npc_marta");
  const shop = await (async () => {
    const npc = a.npc("npc_marta");
    a.send({ t: "talk", id: npc.id });
    return a.wait((m) => m.t === "shop" && m.shop?.id === "furniture", 3000, "furniture shop");
  })();
  const idx = (tpl) => shop.shop.stock.find((e) => e.item.tpl === tpl).idx;
  a.send({ t: "buy", shop: "furniture", idx: idx("furn_chest") });
  a.send({ t: "buy", shop: "furniture", idx: idx("furn_bed") });
  await a.selfWhere((s) => s.furniture.chest === 1 && s.furniture.bed === 1, 3000, "furniture stock");

  await tp(a, plot.front.x, plot.front.y);
  a.send({ t: "door", id: `${plot.id}_in` });
  await a.wait((m) => m.t === "welcome" && m.map === `house:${plot.id}:0`, 3000, "owner inside");
  await sleep(500);
  a.send({ t: "furn", op: "place", kind: "chest", x: 4, y: 6, rot: 0 });
  await a.wait(() => [...a.entities.values()].some((e) => e.k === "f" && e.kind === "chest"), 3000, "chest placed");
  a.messages = [];
  a.send({ t: "furn", op: "place", kind: "bed", x: 4, y: 5, rot: 0 });
  const clash = await a.wait((m) => m.t === "toast", 2000, "overlap refused");
  assert.match(clash.text, /already there/);
  a.send({ t: "furn", op: "place", kind: "bed", x: 2, y: 2, rot: 0 });
  await a.wait(() => [...a.entities.values()].some((e) => e.k === "f" && e.kind === "bed"), 3000, "bed placed");

  // Storage: deposit a tonic, then take it back out.
  const slot = a.self.inv.findIndex((i) => i?.tpl === "potion_small");
  a.send({ t: "storage", op: "deposit", slot });
  const stored = await a.wait((m) => m.t === "storage" && m.items?.some((i) => i?.tpl === "potion_small"), 3000, "stored");
  const sIdx = stored.items.findIndex((i) => i?.tpl === "potion_small");
  a.send({ t: "storage", op: "withdraw", slot: sIdx });
  await a.selfWhere((s) => s.inv.some((i) => i?.tpl === "potion_small"), 3000, "withdrawn");
  a.send({ t: "door", id: `${plot.id}_out` });
  await a.wait((m) => m.t === "welcome" && m.map === "overworld", 3000, "back outside");
});

test("the castle door leads to the throne room, where the King holds court", async () => {
  await tp(b, W.CASTLE_FRONT.x, W.CASTLE_FRONT.y);
  b.messages = [];
  b.send({ t: "door", id: "castle_in" });
  await b.wait((m) => m.t === "welcome" && m.map === "castle:throne", 3000, "throne room");
  await b.wait(() => b.npc("npc_king"), 3000, "the King");
  await sleep(800);
  b.send({ t: "door", id: "castle_out" });
  await b.wait((m) => m.t === "welcome" && m.map === "overworld", 3000, "back out");
});

test("rivers: swimmers are carried downstream by the current", async () => {
  // Find a mid-river spot along the Silverrun west of the city.
  let spot = null;
  for (let y = -10; y < 120 && !spot; y += 1) {
    for (let x = -170; x < -90 && !spot; x += 0.5) {
      const r = W.riverAt(x, y);
      if (r && r.dist < 0.4 && W.tileAt(x, y) === W.Tile.RIVER) spot = { x, y, r };
    }
  }
  assert.ok(spot, "found the Silverrun");
  await tp(a, spot.x, spot.y);
  await sleep(600);
  const start = { ...a.pos };
  await sleep(2000);
  const moved = { x: a.pos.x - start.x, y: a.pos.y - start.y };
  const along = moved.x * spot.r.dirX + moved.y * spot.r.dirY;
  assert.ok(along > 1.5, `drifted ${along.toFixed(2)} tiles downstream`);
  assert.equal(a.entities.get(a.id)?.sw, 1, "swimming");
});

test("the castle's Hall of Portals: both portals and their keepers are reachable from the door", async () => {
  const dir2 = mkdtempSync(join(tmpdir(), "balathor-v2-hall-"));
  await build({
    stdin: {
      contents: `
        export { CASTLE_PORTALS, THRONE_ROOM } from "./src/shared/world/housing";
        export { getMap } from "./src/shared/world/maps";
        export { findPath } from "./src/shared/game/pathfind";
        export { NPCS } from "./src/shared/game/npcs";
      `,
      resolveDir: process.cwd(),
      loader: "ts"
    },
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: join(dir2, "h.mjs"),
    logLevel: "silent"
  });
  const H = await import(pathToFileURL(join(dir2, "h.mjs")).href);
  rmSync(dir2, { recursive: true, force: true });
  const hall = H.getMap("castle:throne");
  const from = H.THRONE_ROOM.spawn;
  const spots = [H.CASTLE_PORTALS.station, H.CASTLE_PORTALS.ocean, ...H.NPCS.filter((n) => n.map === "castle:throne")];
  for (const t of spots) assert.ok(H.findPath(hall, from.x, from.y, t.x, t.y), `path to ${t.id ?? `${t.x},${t.y}`}`);
});

test("sprinting (Shift) covers more ground than walking", async () => {
  const run = async (sp) => {
    await a.chat("/tp 0.5 140", 1200);
    const y0 = a.pos.y;
    a.send({ t: "in", seq: 1, mx: 0, my: 1, f: Math.PI / 2, sp });
    await sleep(1500);
    a.send({ t: "in", seq: 2, mx: 0, my: 0, f: Math.PI / 2, sp: 0 });
    await sleep(300);
    return a.pos.y - y0;
  };
  const walk = await run(0);
  const sprint = await run(1);
  assert.ok(sprint > walk * 1.35, `sprint ${sprint.toFixed(1)} vs walk ${walk.toFixed(1)}`);
});
