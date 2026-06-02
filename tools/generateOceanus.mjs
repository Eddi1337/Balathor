#!/usr/bin/env node
"use strict";

/**
 * Generates the Boundless Ocean ("oceanus") world data file.
 *
 * The ocean is mostly open water dotted with >100 small islands. Each island
 * has a sandy beach ring, a grassy centre, a port/pier that sticks out into the
 * water, and a content descriptor (enemies / trader / loot / critters / objects)
 * plus a hand-editable `layout` array of decorative props. The output is written
 * to content/worlds/oceanus/islands.json and consumed by
 * server/src/worlds/oceanusWorld.js.
 *
 * Deterministic: re-running produces an identical file (seeded RNG), so the
 * committed JSON stays stable. Edit this generator (or the JSON directly) to
 * redesign the ocean.
 *
 *   node tools/generateOceanus.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "..", "content", "worlds", "oceanus");
const OUT_FILE = path.join(OUT_DIR, "islands.json");

// ---- World bounds (clear of fantasy/planets/interior/pirate coordinate spaces)
const BOUNDS = { minX: -46000, maxX: -40000, minY: -3000, maxY: 3000 };
const CENTER = { x: (BOUNDS.minX + BOUNDS.maxX) / 2, y: (BOUNDS.minY + BOUNDS.maxY) / 2 };

// ---- Island grid layout
const MARGIN = 360;            // keep islands away from the open-water border
const GRID_SPACING = 480;      // distance between grid cells
const JITTER = 150;            // random per-island offset within a cell
const PIER_DIRS = ["north", "south", "east", "west"];

// Mulberry32 deterministic RNG.
function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(0x0cea_0107);
const randInt = (min, max) => min + Math.floor(rng() * (max - min + 1));
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

const NAME_PREFIX = [
  "Coral", "Salt", "Tide", "Wind", "Storm", "Pearl", "Drift", "Gull", "Reef", "Mist",
  "Sun", "Moon", "Shell", "Wave", "Foam", "Anchor", "Siren", "Kraken", "Marlin", "Azure",
  "Crimson", "Ivory", "Amber", "Jade", "Onyx", "Saffron", "Cobalt", "Verdant", "Hollow", "Lone",
  "Black", "Whisper", "Thunder", "Glass", "Iron", "Bone", "Dusk", "Dawn", "Frost", "Ember",
];
const NAME_SUFFIX = [
  "Atoll", "Cay", "Isle", "Reef", "Spit", "Shoal", "Holm", "Haven", "Cove", "Rock",
  "Bank", "Key", "Strand", "Point", "Skerry", "Bar", "Refuge", "Quay", "Landing", "Hook",
];

function uniqueNames(count) {
  const used = new Set();
  const out = [];
  let guard = 0;
  while (out.length < count && guard < count * 50) {
    guard += 1;
    const name = `${pick(NAME_PREFIX)} ${pick(NAME_SUFFIX)}`;
    if (used.has(name)) continue;
    used.add(name);
    out.push(name);
  }
  // Fallback numbering if we run out of unique combos.
  let n = 1;
  while (out.length < count) {
    out.push(`Outer Shoal ${n++}`);
  }
  return out;
}

const PROP_KINDS = [
  "tree", "tree", "palm", "palm", "mangrove", "banana",
  "fern", "fern", "reeds", "flowers", "flowers", "rock"
];

/** Decorative props scattered on the grassy centre — the per-island "layout". */
function makeLayout(landRadius) {
  const props = [];
  const count = randInt(7, 16);
  const inner = Math.max(2, landRadius * 0.5);
  for (let i = 0; i < count; i += 1) {
    const ang = rng() * Math.PI * 2;
    const dist = rng() * inner;
    props.push({
      kind: pick(PROP_KINDS),
      dx: Math.round(Math.cos(ang) * dist),
      dy: Math.round(Math.sin(ang) * dist),
    });
  }
  return props;
}

/**
 * Content distribution across islands (kind -> relative weight). The hub island
 * is assigned separately and is always safe.
 */
function rollContent(index) {
  const r = rng();
  if (r < 0.34) {
    const tier = randInt(1, 4);
    return { kind: "enemies", tier, size: randInt(3, 4 + tier), boss: rng() < 0.18 };
  }
  if (r < 0.52) {
    return { kind: "loot", quality: Number((0.2 + rng() * 0.7).toFixed(2)) };
  }
  if (r < 0.70) {
    return { kind: "critters", count: randInt(2, 5) };
  }
  if (r < 0.86) {
    return { kind: "trader", shopName: null };
  }
  return { kind: "objects" };
}

function build() {
  const islands = [];
  const cells = [];
  for (let x = BOUNDS.minX + MARGIN; x <= BOUNDS.maxX - MARGIN; x += GRID_SPACING) {
    for (let y = BOUNDS.minY + MARGIN; y <= BOUNDS.maxY - MARGIN; y += GRID_SPACING) {
      cells.push({ x, y });
    }
  }

  // Reserve the cell nearest the centre for the hub island.
  cells.sort((a, b) => Math.hypot(a.x - CENTER.x, a.y - CENTER.y) - Math.hypot(b.x - CENTER.x, b.y - CENTER.y));
  const hubCell = cells.shift();

  // Skip ~8% of remaining cells for open-water variety while keeping >100 islands.
  const chosen = cells.filter(() => rng() > 0.08);
  const total = chosen.length + 1;
  const names = uniqueNames(total);

  // Hub island first — a large central island that hosts the return teleporter.
  const hubRadius = 120;
  islands.push({
    id: "isle_hub",
    name: "Mariner's Rest",
    x: Math.round(hubCell.x),
    y: Math.round(hubCell.y),
    landRadius: hubRadius,
    pierDir: "south",
    hub: true,
    content: { kind: "hub" },
    layout: makeLayout(hubRadius),
  });

  chosen.forEach((cell, i) => {
    const landRadius = randInt(28, 58);
    const jx = (rng() - 0.5) * 2 * JITTER;
    const jy = (rng() - 0.5) * 2 * JITTER;
    islands.push({
      id: `isle_${String(i + 1).padStart(3, "0")}`,
      name: names[i + 1] || `Outer Shoal ${i + 1}`,
      x: Math.round(cell.x + jx),
      y: Math.round(cell.y + jy),
      landRadius,
      pierDir: pick(PIER_DIRS),
      content: rollContent(i),
      layout: makeLayout(landRadius),
    });
  });

  // Name trader shops after their island.
  for (const isle of islands) {
    if (isle.content.kind === "trader") {
      isle.content.shopName = `${isle.name} Market`;
    }
  }

  return {
    id: "oceanus",
    label: "The Boundless Ocean",
    theme: "nautical",
    worldId: "oceanus",
    description:
      "A massive open ocean dotted with small islands. Each island has sandy beaches, a grassy centre, a port pier, and its own content. Generated by tools/generateOceanus.mjs.",
    bounds: BOUNDS,
    landing: { x: Math.round(hubCell.x), y: Math.round(hubCell.y + hubRadius + 8) },
    islands,
  };
}

const data = build();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2) + "\n");

const counts = data.islands.reduce((acc, isle) => {
  acc[isle.content.kind] = (acc[isle.content.kind] || 0) + 1;
  return acc;
}, {});
console.log(`Wrote ${data.islands.length} islands to ${path.relative(process.cwd(), OUT_FILE)}`);
console.log("Content breakdown:", counts);
