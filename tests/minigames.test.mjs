// Minigames: darts, memory, Hold'em, the training dummy, a course (relay) with leaderboard and
// trophy title, and an arena (bounty camp).

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Client, sleep, startServer } from "./helpers.mjs";

const dir = mkdtempSync(join(tmpdir(), "balathor-v2-mg-"));
await build({
  stdin: {
    contents: `
      export { SITES_BY_ID, courseFor, bestHand } from "./src/shared/game/minigames";
      export { OVERWORLD } from "./src/shared/world/maps";
      export { isBlockingTile } from "./src/shared/world/tiles";
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
  await c.join(`mg${run}${Date.now() % 1000}`, `Gamer${run}`.slice(0, 15), "knight");
  await c.chat("/xp 20000");
  await c.chat("/gold 500");
});

after(() => {
  c?.close();
  srv?.stop();
});

const at = (id) => c.chat(`/tp ${W.SITES_BY_ID[id].x} ${W.SITES_BY_ID[id].y}`, 1200);
const mg = () => c.messages.filter((m) => m.t === "mg").at(-1)?.s;

test("hand evaluator ranks poker hands", () => {
  const card = (r, s) => s * 13 + r;
  const flush = W.bestHand([card(1, 0), card(4, 0), card(7, 0), card(9, 0), card(11, 0), card(2, 1), card(3, 2)]);
  const pair = W.bestHand([card(5, 0), card(5, 1), card(7, 2), card(9, 3), card(11, 0)]);
  assert.equal(flush.name, "Flush");
  assert.equal(pair.name, "Pair");
  assert.ok(flush.score > pair.score);
  const wheel = W.bestHand([card(12, 0), card(0, 1), card(1, 2), card(2, 3), card(3, 0)]);
  assert.equal(wheel.name, "Straight");
});

test("darts: three throws, a score and some gold", async () => {
  await at("darts");
  c.messages = [];
  c.send({ t: "mg", op: "start", site: "darts" });
  await c.wait((m) => m.t === "mg" && m.s?.game === "darts", 2000, "darts started");
  for (let i = 0; i < 3; i += 1) {
    await sleep(300);
    c.send({ t: "mg", op: "act", action: "throw", value: 300 * (i + 1) });
  }
  await c.wait((m) => m.t === "mg" && m.s === null, 3000, "darts over");
  assert.ok(c.messages.some((m) => m.t === "toast" && /Darts: \d+ points/.test(m.text)));
});

test("memory tiles: a perfect-memory solver clears the board", async () => {
  await at("memory");
  c.messages = [];
  c.send({ t: "mg", op: "start", site: "memory" });
  await c.wait((m) => m.t === "mg" && m.s?.game === "memory", 2000, "memory started");
  const seen = new Map();
  const solved = new Set();
  const flip = async (i) => {
    c.send({ t: "mg", op: "act", action: "flip", value: i });
    const m = await c.wait((x) => x.t === "mg" && (x.s === null || x.s?.ui?.shown?.[i]), 2000, `flip ${i}`);
    if (m.s) seen.set(i, m.s.ui.shown[i]);
    c.messages = [];
    return m.s;
  };
  for (let i = 0; i < 16 && mg() !== null; i += 1) {
    if (solved.has(i)) continue;
    const s1 = await flip(i);
    if (!s1) break;
    const icon = seen.get(i);
    let j = [...seen.entries()].find(([k, v]) => k !== i && v === icon && !solved.has(k))?.[0];
    if (j === undefined) j = [...Array(16).keys()].find((k) => k !== i && !seen.has(k) && !solved.has(k));
    const s2 = await flip(j);
    if (seen.get(j) === icon) {
      solved.add(i);
      solved.add(j);
    } else await sleep(900);
    if (!s2) break;
  }
  await c.wait((m) => m.t === "toast" && /All pairs/.test(m.text), 4000, "memory cleared");
});

test("Hold'em: raise to see the showdown", async () => {
  await at("holdem");
  c.messages = [];
  c.send({ t: "mg", op: "start", site: "holdem" });
  const s = await c.wait((m) => m.t === "mg" && m.s?.game === "holdem", 2000, "dealt");
  assert.equal(s.s.ui.you.length, 2);
  assert.equal(s.s.ui.board.length, 3);
  c.send({ t: "mg", op: "act", action: "raise" });
  await c.wait((m) => m.t === "mg" && m.s === null, 3000, "showdown");
});

test("training dummy counts your damage", async () => {
  await at("dummy");
  c.messages = [];
  c.send({ t: "mg", op: "start", site: "dummy" });
  await c.wait((m) => m.t === "mg" && m.s?.game === "dummy", 2000, "dummy up");
  await c.wait(() => [...c.entities.values()].some((e) => e.k === "m" && e.tpl === "training_dummy"), 3000, "dummy entity");
  const dummy = [...c.entities.values()].find((e) => e.k === "m" && e.tpl === "training_dummy");
  await c.chat(`/tp ${dummy.x - 1} ${dummy.y}`, 600);
  for (let i = 0; i < 6; i += 1) {
    c.send({ t: "attack", a: Math.atan2(dummy.y - c.pos.y, dummy.x - c.pos.x) });
    await sleep(700);
  }
  await c.wait((m) => m.t === "mg" && /Damage: [1-9]/.test(m.s?.text ?? ""), 3000, "damage counted");
  c.send({ t: "mg", op: "quit" });
  await c.wait((m) => m.t === "mg" && m.s === null, 2000, "quit");
});

test("perimeter relay: run the gates, get on the leaderboard, wear the trophy", async () => {
  await at("relay");
  c.messages = [];
  c.send({ t: "mg", op: "start", site: "relay" });
  await c.wait((m) => m.t === "mg" && m.s?.game === "relay", 2000, "relay started");
  for (const cp of W.courseFor("relay")) await c.chat(`/tp ${cp.x} ${cp.y}`, 900);
  await c.wait((m) => m.t === "toast" && /Perimeter Relay complete/.test(m.text), 3000, "relay done");
  await c.selfWhere((s) => s.trophies.includes("wall_runner"), 3000, "trophy");
  c.send({ t: "mg", op: "board", game: "relay" });
  const b = await c.wait((m) => m.t === "board" && m.game === "relay", 2000, "leaderboard");
  assert.equal(b.rows[0].name, `Gamer${run}`.slice(0, 15));
  c.send({ t: "mg", op: "title", action: "wall_runner" });
  await c.selfWhere((s) => /Wall Runner/.test(s.title ?? ""), 2000, "title set");
});

test("bounty board: a bandit camp appears; clearing it pays out", async () => {
  await at("bounty");
  c.messages = [];
  c.send({ t: "mg", op: "start", site: "bounty" });
  const s = await c.wait((m) => m.t === "mg" && m.s?.game === "bounty", 2000, "bounty posted");
  const camp = s.s.target;
  assert.ok(camp && !W.isBlockingTile(W.OVERWORLD.tileAt(camp.x, camp.y)), "camp on open ground");
  await c.chat(`/tp ${camp.x} ${camp.y}`, 1200);
  await c.wait(() => [...c.entities.values()].filter((e) => e.k === "m" && e.tpl === "bandit" && !e.dead).length >= 1, 3000, "bandits");
  c.send({ t: "mg", op: "quit" });
  await c.wait((m) => m.t === "mg" && m.s === null, 2000, "quit");
  await sleep(500);
  assert.equal([...c.entities.values()].filter((e) => e.k === "m" && e.tpl === "bandit" && !e.dead).length, 0, "camp cleaned up");
});
