"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const DEFAULT_DB_PATH = path.join(__dirname, "..", "data", "world.sqlite");

/**
 * Persistent shared world state (houses, floor loot, future tables).
 * Uses Node.js built-in SQLite (see https://nodejs.org/api/sqlite.html).
 */
function openWorldDb(dbPath = process.env.WORLD_DB_PATH || DEFAULT_DB_PATH) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS building_ownership (
      building_key TEXT PRIMARY KEY NOT NULL,
      owner_account TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      price INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS ground_items (
      id TEXT PRIMARY KEY NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      item_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS house_chests (
      building_key TEXT PRIMARY KEY NOT NULL,
      slots_json TEXT NOT NULL
    );
  `);
  return db;
}

/** @returns {Map<string, { ownerAccountKey: string, ownerName: string, price: number }>} */
function loadBuildingOwnership(db) {
  const map = new Map();
  const stmt = db.prepare("SELECT building_key, owner_account, owner_name, price FROM building_ownership");
  for (const row of stmt.all()) {
    map.set(row.building_key, {
      ownerAccountKey: row.owner_account,
      ownerName: row.owner_name,
      price: clampInt(row.price, 0, 1e9)
    });
  }
  return map;
}

function upsertBuildingOwnership(db, buildingKey, ownerAccountKey, ownerName, price) {
  db.prepare(`
    INSERT INTO building_ownership (building_key, owner_account, owner_name, price)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(building_key) DO UPDATE SET
      owner_account = excluded.owner_account,
      owner_name = excluded.owner_name,
      price = excluded.price
  `).run(buildingKey, ownerAccountKey, ownerName, clampInt(price, 0, 1e9));
}

function insertGroundItem(db, row) {
  db.prepare("INSERT INTO ground_items (id, x, y, item_json) VALUES (?, ?, ?, ?)").run(
    row.id,
    row.x,
    row.y,
    row.itemJson
  );
}

function deleteGroundItem(db, id) {
  db.prepare("DELETE FROM ground_items WHERE id = ?").run(id);
}

/**
 * @returns {{ items: Array<{ id: string, x: number, y: number, item: object }>, nextNumericId: number }}
 */
function loadGroundItems(db, parseItem) {
  const items = [];
  let maxNum = 0;
  const stmt = db.prepare("SELECT id, x, y, item_json FROM ground_items");
  for (const row of stmt.all()) {
    let raw;
    try {
      raw = JSON.parse(row.item_json);
    } catch {
      continue;
    }
    const item = parseItem(raw);
    if (!item) continue;
    items.push({
      id: row.id,
      x: Number(row.x),
      y: Number(row.y),
      item
    });
    const m = /^ground_(\d+)$/.exec(row.id);
    if (m) maxNum = Math.max(maxNum, Number(m[1]));
  }
  return { items, nextNumericId: maxNum + 1 };
}

function closeWorldDb(db) {
  try {
    db.close();
  } catch {
    // ignore double-close
  }
}

function clampInt(n, lo, hi) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

const HOUSE_CHEST_SLOTS = 10;

function normalizeChestSlotArray(rawArr, parseItem) {
  const slots = Array(HOUSE_CHEST_SLOTS).fill(null);
  if (!Array.isArray(rawArr)) {
    return slots;
  }
  for (let i = 0; i < HOUSE_CHEST_SLOTS && i < rawArr.length; i += 1) {
    const cell = rawArr[i];
    slots[i] = cell && typeof cell === "object" ? parseItem(cell) : null;
  }
  return slots;
}

function loadHouseChestSlots(db, buildingKey, parseItem) {
  const row = db.prepare("SELECT slots_json FROM house_chests WHERE building_key = ?").get(buildingKey);
  if (!row?.slots_json) {
    return Array(HOUSE_CHEST_SLOTS).fill(null);
  }
  let rawArr;
  try {
    rawArr = JSON.parse(row.slots_json);
  } catch {
    return Array(HOUSE_CHEST_SLOTS).fill(null);
  }
  return normalizeChestSlotArray(rawArr, parseItem);
}

function saveHouseChestSlots(db, buildingKey, slots) {
  const json = JSON.stringify(Array.from({ length: HOUSE_CHEST_SLOTS }, (_, i) => slots[i] || null));
  db.prepare(`
    INSERT INTO house_chests (building_key, slots_json)
    VALUES (?, ?)
    ON CONFLICT(building_key) DO UPDATE SET slots_json = excluded.slots_json
  `).run(buildingKey, json);
}

module.exports = {
  openWorldDb,
  loadBuildingOwnership,
  upsertBuildingOwnership,
  insertGroundItem,
  deleteGroundItem,
  loadGroundItems,
  closeWorldDb,
  HOUSE_CHEST_SLOTS,
  loadHouseChestSlots,
  saveHouseChestSlots
};
