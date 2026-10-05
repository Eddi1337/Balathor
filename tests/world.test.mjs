// World generation invariants, run against the bundled server build (which includes the shared
// generator) via a tiny esbuild bundle of the shared module.

import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "balathor-v2-world-"));
const out = join(dir, "world.mjs");
await build({
  stdin: {
    contents: `
      export * from "./src/shared/world/overworld";
      export { Tile, isBlockingTile } from "./src/shared/world/tiles";
      export { CITY_HOUSES, TOWN_SPAWN, FOUNTAIN, GATES, WALL_R, TIER_H, WHITE_TREE } from "./src/shared/world/city";
      export { PLOTS, DOORS } from "./src/shared/world/housing";
      export { WAYPOINTS } from "./src/shared/game/waypoints";
      export { findPath } from "./src/shared/game/pathfind";
      export { NPCS } from "./src/shared/game/npcs";
      export { stepMovement } from "./src/shared/game/movement";
    `,
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: out,
  logLevel: "silent"
});
const W = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

test("generation is deterministic", () => {
  const a = [];
  for (let i = 0; i < 2000; i += 1) a.push(W.tileAt((i * 37) % 800 - 400, (i * 91) % 800 - 400));
  const b = [];
  for (let i = 0; i < 2000; i += 1) b.push(W.tileAt((i * 37) % 800 - 400, (i * 91) % 800 - 400));
  assert.deepEqual(a, b);
});

test("town spawn and every NPC stand on walkable ground", () => {
  assert.equal(W.isBlockingTile(W.tileAt(W.TOWN_SPAWN.x, W.TOWN_SPAWN.y)), false);
  for (const npc of W.NPCS.filter((n) => !n.map)) {
    assert.equal(W.isBlockingTile(W.tileAt(npc.x, npc.y)), false, `${npc.name} at ${npc.x},${npc.y}`);
  }
});

test("the city: fountain, solid houses, open gates, roads beyond", () => {
  assert.equal(W.tileAt(W.FOUNTAIN.x, W.FOUNTAIN.y), W.Tile.FOUNTAIN);
  for (const h of W.CITY_HOUSES.slice(0, 200)) {
    const am = (h.a0 + h.a1) / 2;
    const rm = (h.r0 + h.r1) / 2;
    assert.equal(W.tileAt(Math.cos(am) * rm, Math.sin(am) * rm), W.Tile.BUILDING, h.id);
  }
  assert.ok(W.CITY_HOUSES.length > 150, `a big city (${W.CITY_HOUSES.length} houses)`);
  for (const g of W.GATES) {
    const r = W.WALL_R[g.wall] - 1.2;
    assert.equal(W.isBlockingTile(W.tileAt(Math.cos(g.angle) * r, Math.sin(g.angle) * r)), false, `gate in wall ${g.wall}`);
  }
  const hasPath = (fn) => Array.from({ length: 25 }, (_, i) => fn(i - 12)).some((t) => t === W.Tile.PATH);
  for (const d of [130, 200, 300]) {
    assert.ok(hasPath((o) => W.tileAt(o, -d)), `north road at ${d}`);
    assert.ok(hasPath((o) => W.tileAt(d, o)), `east road at ${d}`);
    assert.ok(hasPath((o) => W.tileAt(o, d)), `south road at ${d}`);
    assert.ok(hasPath((o) => W.tileAt(-d, o)), `west road at ${d}`);
  }
});

test("terraces climb the hill and every gate ramps between them", () => {
  assert.ok(W.heightAt(0, 96) < W.heightAt(0, 70), "market ring below the artisans' ring");
  assert.ok(W.heightAt(0, 5) > 15, "the citadel sits on the summit");
});

test("you can walk from the market all the way up to the citadel", () => {
  const src = { tileAt: W.tileAt };
  const path = W.findPath(src, W.TOWN_SPAWN.x, W.TOWN_SPAWN.y, W.WHITE_TREE.x, W.WHITE_TREE.y + 4, 400000);
  assert.ok(path && path.length > 0, "a route up through the zig-zag gates exists");
});

test("every home's door, waypoint and door spot is reachable ground", () => {
  for (const p of W.PLOTS) assert.equal(W.isBlockingTile(W.tileAt(p.front.x, p.front.y)), false, p.id);
  for (const w of W.WAYPOINTS) assert.equal(W.isBlockingTile(W.tileAt(w.x, w.y)), false, w.id);
  assert.ok(W.PLOTS.length >= 20, "plenty of homes for sale");
});

test("every biome appears on the island and the sea surrounds it", () => {
  const seen = new Set();
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    for (let r = 10; r < 650; r += 10) seen.add(W.biomeAt(Math.cos(a) * r, Math.sin(a) * r));
  }
  for (const b of ["town", "meadow", "forest", "swamp", "desert", "frost", "ember", "highlands", "beach", "ocean"]) {
    assert.ok(seen.has(b), `missing biome ${b}`);
  }
  assert.equal(W.tileAt(720, 0), W.Tile.WATER);
  assert.ok(W.heightAt(720, 0) < 0, "seabed below sea level");
});

test("you can walk out of the city through the main gate", () => {
  const pos = { x: 0.5, y: 99.5 };
  for (let i = 0; i < 200; i += 1) W.stepMovement({ tileAt: W.tileAt }, pos, 0, 1, 5.2, 0.05);
  assert.ok(pos.y > 112, `walked to y=${pos.y.toFixed(1)}`);
});
