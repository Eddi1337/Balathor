// Professions: tools from Bram, gathering with depletion, fishing bite/reel, cooking and food buffs.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Client, sleep, startServer } from "./helpers.mjs";

const dir = mkdtempSync(join(tmpdir(), "balathor-v2-prof-"));
await build({
  stdin: {
    contents: `
      export { tileAt } from "./src/shared/world/overworld";
      export { Tile, isBlockingTile, isWaterTile } from "./src/shared/world/tiles";
      export { STATIONS } from "./src/shared/world/stations";
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
  await c.join(`pr${run}${Date.now() % 1000}`, `Prof${run}`.slice(0, 15), "ranger");
});

after(() => {
  c?.close();
  srv?.stop();
});

const tp = (x, y) => c.chat(`/tp ${x.toFixed(2)} ${y.toFixed(2)}`, 1200);
const count = (tpl) => c.self.inv.reduce((n, i) => n + (i?.tpl === tpl ? i.qty : 0), 0);

/** An oak tile with open ground beside it, outside the city. */
function findOak() {
  for (let r = 140; r < 200; r += 1) {
    for (let a = 0; a < Math.PI * 2; a += 0.02) {
      const x = Math.floor(Math.cos(a) * r);
      const y = Math.floor(Math.sin(a) * r);
      if (W.tileAt(x, y) !== W.Tile.TREE) continue;
      const sx = x + 1.5;
      const sy = y + 0.5;
      if (!W.isBlockingTile(W.tileAt(sx, sy)) && !W.isWaterTile(W.tileAt(sx, sy))) return { x, y, sx, sy };
    }
  }
  return null;
}

test("Bram sells tools; gathering needs them and depletes the node", async () => {
  await c.chat("/gold 500");
  await c.chat("/tpnpc npc_bram");
  c.send({ t: "talk", id: c.npc("npc_bram").id });
  const shop = await c.wait((m) => m.t === "shop" && m.shop?.id === "tools", 3000, "tool shop");
  const idx = (tpl) => shop.shop.stock.find((e) => e.item.tpl === tpl).idx;

  const oak = findOak();
  assert.ok(oak, "found an oak");
  await tp(oak.sx, oak.sy);
  c.messages = [];
  c.send({ t: "gather", x: oak.x, y: oak.y });
  const noTool = await c.wait((m) => m.t === "toast", 2000, "needs hatchet");
  assert.match(noTool.text, /Hatchet/);

  await c.chat("/tpnpc npc_bram");
  for (const tpl of ["tool_hatchet", "tool_rod", "fish_minnow"]) c.send({ t: "buy", shop: "tools", idx: idx(tpl) });
  await c.selfWhere((s) => ["tool_hatchet", "tool_rod", "fish_minnow"].every((t) => s.inv.some((i) => i?.tpl === t)), 3000, "bought tools");

  await tp(oak.sx, oak.sy);
  c.messages = [];
  c.send({ t: "gather", x: oak.x, y: oak.y });
  await c.wait((m) => m.t === "gather" && m.state === "start", 2000, "chopping");
  await c.wait((m) => m.t === "gather" && m.state === "done", 4000, "chopped");
  await c.selfWhere((s) => s.inv.some((i) => i?.tpl === "log_oak") && s.professions.woodcutting.xp > 0, 3000, "log + xp");
  await c.wait((m) => m.t === "depleted" && m.keys.includes(`${oak.x},${oak.y}`), 2000, "depletion broadcast");
  c.messages = [];
  c.send({ t: "gather", x: oak.x, y: oak.y });
  const regrow = await c.wait((m) => m.t === "toast", 2000, "regrow toast");
  assert.match(regrow.text, /regrow/);
});

test("fishing: cast, wait for the bite, reel it in", async () => {
  // A dry spot next to water within casting range near the west road.
  let spot = null;
  for (let y = -40; y < 120 && !spot; y += 1) {
    for (let x = -170; x < -90 && !spot; x += 1) {
      const t = W.tileAt(x + 0.5, y + 0.5);
      if (W.isBlockingTile(t) || W.isWaterTile(t)) continue;
      for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
        if (W.isWaterTile(W.tileAt(x + 0.5 + dx, y + 0.5 + dy))) {
          spot = { x: x + 0.5, y: y + 0.5, wx: x + 0.5 + dx, wy: y + 0.5 + dy };
          break;
        }
      }
    }
  }
  assert.ok(spot, "found a riverbank");
  await tp(spot.x, spot.y);
  let caught = false;
  for (let attempt = 0; attempt < 3 && !caught; attempt += 1) {
    c.messages = [];
    c.send({ t: "fish", x: spot.wx, y: spot.wy });
    await c.wait((m) => m.t === "fish" && m.state === "cast", 2000, "cast");
    await c.wait((m) => m.t === "fish" && m.state === "bite", 9000, "bite");
    c.send({ t: "reel" });
    const res = await c.wait((m) => m.t === "fish" && (m.state === "caught" || m.state === "escaped"), 3000, "reel result");
    caught = res.state === "caught";
  }
  assert.ok(caught, "caught something");
  await c.selfWhere((s) => s.professions.fishing.xp > 0, 3000, "fishing xp");
});

test("cooking at the market campfire, then eating grants a buff", async () => {
  const fire = W.STATIONS.find((s) => s.id === "campfire_market");
  await tp(fire.x + 1.2, fire.y);
  const before = count("fish_minnow");
  assert.ok(before >= 1);
  c.send({ t: "craft", recipe: "cook_minnow", station: fire.id });
  await c.selfWhere((s) => s.inv.some((i) => i?.tpl === "food_grilled_minnow"), 3000, "grilled minnow");
  assert.equal(count("fish_minnow"), before - 1);
  assert.ok(c.self.professions.cooking.xp > 0);

  // Bread grants a buff: give ourselves grain via the shop and bake.
  await c.chat("/tpnpc npc_bram");
  c.send({ t: "talk", id: c.npc("npc_bram").id });
  const shop = await c.wait((m) => m.t === "shop" && m.shop?.id === "tools", 3000, "tool shop");
  const grain = shop.shop.stock.find((e) => e.item.tpl === "herb_grain").idx;
  for (let i = 0; i < 3; i += 1) c.send({ t: "buy", shop: "tools", idx: grain });
  await c.selfWhere((s) => s.inv.reduce((n, i) => n + (i?.tpl === "herb_grain" ? i.qty : 0), 0) >= 3, 3000, "grain");
  await c.chat("/prof cooking 2");
  await tp(fire.x + 1.2, fire.y);
  c.send({ t: "craft", recipe: "cook_bread", station: fire.id });
  await sleep(600);
  const slot = c.self.inv.findIndex((i) => i?.tpl === "food_grilled_minnow");
  c.send({ t: "use", slot });
  await c.selfWhere((s) => !s.inv.some((i) => i?.tpl === "food_grilled_minnow"), 3000, "ate minnow");
  await c.selfWhere((s) => s.inv.some((i) => i?.tpl === "food_bread"), 3000, "baked bread");
  c.send({ t: "use", slot: c.self.inv.findIndex((i) => i?.tpl === "food_bread") });
  const fed = await c.selfWhere((s) => s.food?.stat === "regen", 3000, "bread buff");
  assert.ok(fed.food.ms > 100_000);
});
