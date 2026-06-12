// Proves that every building sprite paints an OPAQUE cover over its full world
// footprint when viewed from outside (roofless=false). The footprint is the
// region whose interior floor/wall/furniture tiles are baked into the chunk
// canvas underneath the sprite; any uncovered footprint pixel is a "see-through
// roof" hole.
//
// Run: node --test tests/roof-coverage.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import { createRecorder, loadMain } from "./lib/roofCoverage.mjs";

const W = 900;
const H = 700;
const recorder = createRecorder(W, H);
const api = loadMain(recorder);
api.setCtx(recorder.ctx);
const TILE = api.TILE_SIZE;

// Place sprites away from the canvas edges so nothing clips off-screen.
const SX = 300;
const SY = 250;

function coverageReport(building) {
  // Reset the coverage bitmap.
  recorder.cover.fill(0);
  const wTiles = building.w;
  const hTiles = building.h;
  api.drawBuildingSprite(building, SX, SY, /* roofless */ false);

  // Footprint in device pixels (the sprite is drawn with sx,sy at the
  // footprint top-left and w=building.w*TILE, h=building.h*TILE).
  const fx0 = SX;
  const fy0 = SY;
  const fx1 = SX + wTiles * TILE;
  const fy1 = SY + hTiles * TILE;

  // The interior tiles that actually get baked sit strictly inside the
  // footprint border (walls occupy the outer ring). We require coverage over
  // the FULL footprint to be safe, but report the worst uncovered run.
  let uncovered = 0;
  let total = 0;
  const holes = [];
  for (let y = fy0; y < fy1; y++) {
    for (let x = fx0; x < fx1; x++) {
      total++;
      if (!recorder.cover[y * W + x]) {
        uncovered++;
        if (holes.length < 12) holes.push([x - SX, y - SY]);
      }
    }
  }
  return { uncovered, total, holes, pct: uncovered / total };
}

function mkBuilding(over) {
  const b = {
    x: 10, y: 10, w: 7, h: 7,
    type: "house",
    name: "Test Cottage",
    ...over,
  };
  // getBuildingVariant honours building.style when it maps to a palette.
  if (b.variant && !b.style) b.style = b.variant;
  return b;
}

const VARIANTS = ["timber", "stone", "wood", "rose"];

for (let shape = 0; shape <= 4; shape++) {
  for (const twoStory of [false, true]) {
    for (const variant of VARIANTS) {
      test(`house roofShape=${shape} twoStory=${twoStory} variant=${variant} fully covers footprint`, () => {
        const b = mkBuilding({ roofShape: shape, twoStory, variant });
        const r = coverageReport(b);
        assert.equal(r.uncovered, 0,
          `${r.uncovered}/${r.total} footprint px uncovered (holes@ ${JSON.stringify(r.holes)})`);
      });
    }
  }
}

for (const kind of ["house", "hut", "big_house"]) {
  for (const bridgeDir of [null, "e", "w"]) {
    test(`${kind} bridgeDir=${bridgeDir} covers footprint`, () => {
      const b = mkBuilding({ type: kind, bridgeDir, roofShape: 1 });
      const r = coverageReport(b);
      assert.equal(r.uncovered, 0,
        `${r.uncovered}/${r.total} uncovered (holes@ ${JSON.stringify(r.holes)})`);
    });
  }
}

for (const type of ["tower", "treehouse", "castle", "fletcher"]) {
  test(`${type} covers footprint`, () => {
    const b = mkBuilding({ type, w: 5, h: 6 });
    const r = coverageReport(b);
    assert.equal(r.uncovered, 0,
      `${type}: ${r.uncovered}/${r.total} uncovered (holes@ ${JSON.stringify(r.holes)})`);
  });
}

// Pub flag (taverns) — same cottage path but with the PUB banner.
test("pub house covers footprint", () => {
  const b = mkBuilding({ isPub: true, roofShape: 2 });
  const r = coverageReport(b);
  assert.equal(r.uncovered, 0, `pub: ${r.uncovered}/${r.total} uncovered`);
});

// Cutaway (the viewer is INSIDE) must NOT seal the footprint — the interior
// stays visible. We assert the footprint is mostly OPEN when roofless=true so
// the inside view is preserved for every building type.
function rooflessUncovered(building) {
  recorder.cover.fill(0);
  api.drawBuildingSprite(building, SX, SY, /* roofless */ true);
  let uncovered = 0, total = 0;
  for (let y = SY; y < SY + building.h * TILE; y++) {
    for (let x = SX; x < SX + building.w * TILE; x++) {
      total++;
      if (!recorder.cover[y * W + x]) uncovered++;
    }
  }
  return uncovered / total;
}

for (const type of ["house", "treehouse", "castle", "fletcher"]) {
  test(`${type} cutaway keeps interior visible (not sealed)`, () => {
    const b = mkBuilding({ type, w: 7, h: 7, roofShape: 1 });
    const open = rooflessUncovered(b);
    assert.ok(open > 0.5,
      `${type} roofless should leave the interior open, only ${(open * 100).toFixed(0)}% open`);
  });
}
