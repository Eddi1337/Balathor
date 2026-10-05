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
      export { TOWN, TOWN_SPAWN } from "./src/shared/world/town";
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
  for (const npc of W.NPCS) {
    assert.equal(W.isBlockingTile(W.tileAt(npc.x, npc.y)), false, `${npc.name} at ${npc.x},${npc.y}`);
  }
});

test("the fountain sits in the plaza and buildings are solid", () => {
  assert.equal(W.tileAt(0, 0), W.Tile.FOUNTAIN);
  for (const b of W.TOWN.buildings) {
    assert.equal(W.tileAt(b.x + 1, b.y + 1), W.Tile.BUILDING, b.name);
  }
});

test("each gate is open and leads onto a road", () => {
  for (const [x, y] of [[0, -32], [32, 0], [0, 32], [-32, 0]]) {
    assert.equal(W.isBlockingTile(W.tileAt(x, y)), false, `gate at ${x},${y}`);
  }
  // Roads meander a little, so look for path tiles across a band around each axis.
  const hasPath = (fn) => Array.from({ length: 25 }, (_, i) => fn(i - 12)).some((t) => t === W.Tile.PATH);
  for (const d of [60, 120, 180]) {
    assert.ok(hasPath((o) => W.tileAt(o, -d)), `north road at ${d}`);
    assert.ok(hasPath((o) => W.tileAt(d, o)), `east road at ${d}`);
    assert.ok(hasPath((o) => W.tileAt(o, d)), `south road at ${d}`);
    assert.ok(hasPath((o) => W.tileAt(-d, o)), `west road at ${d}`);
  }
});

test("every biome appears on the island and the sea surrounds it", () => {
  const seen = new Set();
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    for (let r = 10; r < 470; r += 10) seen.add(W.biomeAt(Math.cos(a) * r, Math.sin(a) * r));
  }
  for (const b of ["town", "meadow", "forest", "swamp", "desert", "frost", "ember", "highlands", "beach", "ocean"]) {
    assert.ok(seen.has(b), `missing biome ${b}`);
  }
  assert.equal(W.tileAt(600, 0), W.Tile.WATER);
  assert.ok(W.heightAt(600, 0) < 0, "seabed below sea level");
});

test("you can walk out of town through the south gate", () => {
  const pos = { x: W.TOWN_SPAWN.x, y: W.TOWN_SPAWN.y };
  for (let i = 0; i < 200; i += 1) W.stepMovement({ tileAt: W.tileAt }, pos, 0, 1, 5.2, 0.05);
  assert.ok(pos.y > 40, `walked to y=${pos.y.toFixed(1)}`);
});
