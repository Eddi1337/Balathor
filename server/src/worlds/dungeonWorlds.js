"use strict";

/**
 * Fantasy dungeon instances — isolated world planes at remote coordinates.
 * Each dungeon is entered only via its overworld cave entrance (interact).
 * The playable area is surrounded by TILE.VOID (black) so the level floats in darkness.
 */

const DUNGEON_INTERACT_RADIUS = 2.65;
const DUNGEON_INTERIOR_SPACING = 700;

const DUNGEON_DEFINITIONS = Object.freeze([
  {
    id: "whispering_crypt",
    name: "Whispering Crypt",
    entranceX: -178,
    entranceY: 212,
    interiorX: 15000,
    interiorY: 15000,
    halfW: 30,
    halfH: 38,
    faction: "undead",
    tier: 2,
    seed: 31042,
    accent: "#8b7355"
  },
  {
    id: "ember_pit",
    name: "Ember Pit",
    entranceX: 418,
    entranceY: -318,
    interiorX: 15000,
    interiorY: 15000 + DUNGEON_INTERIOR_SPACING,
    halfW: 32,
    halfH: 40,
    faction: "demon",
    tier: 3,
    seed: 42017,
    accent: "#c05a35"
  },
  {
    id: "bandit_depths",
    name: "Bandit Depths",
    entranceX: 282,
    entranceY: 198,
    interiorX: 15000 + DUNGEON_INTERIOR_SPACING,
    interiorY: 15000,
    halfW: 28,
    halfH: 36,
    faction: "bandit",
    tier: 2,
    seed: 53091,
    accent: "#6b5344"
  }
]);

const DUNGEON_EDGE_MARGIN = 1.5;

function getDungeonById(id) {
  if (typeof id !== "string") return null;
  return DUNGEON_DEFINITIONS.find((dungeon) => dungeon.id === id) || null;
}

function getDungeonByInteriorPoint(x, y) {
  for (const dungeon of DUNGEON_DEFINITIONS) {
    const dx = x - dungeon.interiorX;
    const dy = y - dungeon.interiorY;
    const reachX = dungeon.halfW + DUNGEON_EDGE_MARGIN;
    const reachY = dungeon.halfH + DUNGEON_EDGE_MARGIN;
    if (Math.abs(dx) <= reachX && Math.abs(dy) <= reachY) {
      return dungeon;
    }
  }
  return null;
}

function getDungeonAtEntrance(x, y, maxDist = DUNGEON_INTERACT_RADIUS) {
  let best = null;
  let bestDist = maxDist;
  for (const dungeon of DUNGEON_DEFINITIONS) {
    const dist = Math.hypot(x - dungeon.entranceX, y - dungeon.entranceY);
    if (dist <= bestDist) {
      best = dungeon;
      bestDist = dist;
    }
  }
  return best;
}

function isInsideDungeonBounds(dungeon, lx, ly) {
  return Math.abs(lx) <= dungeon.halfW && Math.abs(ly) <= dungeon.halfH;
}

function inRect(lx, ly, rect) {
  return lx >= rect.minX && lx <= rect.maxX && ly >= rect.minY && ly <= rect.maxY;
}

function onRectEdge(lx, ly, rect) {
  const onVertical = (lx === rect.minX || lx === rect.maxX) && ly >= rect.minY && ly <= rect.maxY;
  const onHorizontal = (ly === rect.minY || ly === rect.maxY) && lx >= rect.minX && lx <= rect.maxX;
  return onVertical || onHorizontal;
}

function roomTile(lx, ly, rect, gap) {
  if (!inRect(lx, ly, rect)) return null;
  if (onRectEdge(lx, ly, rect)) {
    if (gap && ly === gap.y && lx >= gap.minX && lx <= gap.maxX) {
      return "floor";
    }
    if (gap && lx === gap.x && ly >= gap.minY && ly <= gap.maxY) {
      return "floor";
    }
    return "wall";
  }
  return "floor";
}

function corridorTile(lx, ly, cx, cy, halfW, halfH) {
  if (Math.abs(lx - cx) <= halfW && Math.abs(ly - cy) <= halfH) {
    return "floor";
  }
  return null;
}

/**
 * Procedural multi-room cave layout relative to dungeon center.
 * Outside the bounding box returns null (caller maps to VOID).
 */
function dungeonLayoutKind(dungeon, lx, ly) {
  const hw = dungeon.halfW;
  const hh = dungeon.halfH;

  if (!isInsideDungeonBounds(dungeon, lx, ly)) {
    return null;
  }

  // Perimeter cavern wall
  if (Math.abs(lx) === hw || Math.abs(ly) === hh) {
    if (ly === hh && Math.abs(lx) <= 1.5) return "floor";
    return "wall";
  }

  const bossRoom = {
    minX: -9,
    maxX: 9,
    minY: -hh + 2,
    maxY: -hh + 13
  };
  const bossGap = { y: bossRoom.maxY, minX: -1, maxX: 1 };
  const bossTile = roomTile(lx, ly, bossRoom, bossGap);
  if (bossTile) return bossTile;

  // Main spine from entrance to boss chamber
  if (Math.abs(lx) <= 1.5 && ly >= -hh + 14) {
    return "floor";
  }

  const wings = [
    { cy: hh - 12, halfW: 1.2, halfH: 20, rooms: [-16, 16] },
    { cy: 4, halfW: 1.2, halfH: 24, rooms: [-18, 0, 18] },
    { cy: -hh + 24, halfW: 1.2, halfH: 18, rooms: [-14, 14] }
  ];

  for (const wing of wings) {
    const corridor = corridorTile(lx, ly, 0, wing.cy, wing.halfW, wing.halfH);
    if (corridor) return corridor;

    for (const rx of wing.rooms) {
      const room = {
        minX: rx - 4,
        maxX: rx + 4,
        minY: wing.cy - (rx === 0 ? 6 : 5),
        maxY: wing.cy + (rx === 0 ? 6 : 5)
      };
      const gap = rx < 0
        ? { x: room.maxX, minY: wing.cy - 1, maxY: wing.cy + 1 }
        : rx > 0
          ? { x: room.minX, minY: wing.cy - 1, maxY: wing.cy + 1 }
          : { y: room.maxY, minX: -1, maxX: 1 };
      const tile = roomTile(lx, ly, room, gap);
      if (tile) return tile;
    }
  }

  // Occasional stalagmites
  const h = hash2(lx + dungeon.interiorX, ly + dungeon.interiorY, dungeon.seed | 0);
  if (h > 0.93) return "wall";

  return "wall";
}

function hash2(x, y, seed = 1337) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function getDungeonInteriorTile(dungeon, x, y, TILE, hashFn = hash2) {
  const lx = x - dungeon.interiorX;
  const ly = y - dungeon.interiorY;

  if (!isInsideDungeonBounds(dungeon, lx, ly)) {
    return TILE.VOID;
  }

  const kind = dungeonLayoutKind(dungeon, lx, ly);
  if (kind === "floor") {
    const detail = hashFn(x, y, dungeon.seed + 17);
    if (detail > 0.88) return TILE.STONE;
    if (detail > 0.72) return TILE.DARK_GRASS;
    return TILE.FLOOR;
  }
  if (kind === "wall") {
    const detail = hashFn(x, y, dungeon.seed + 31);
    return detail > 0.55 ? TILE.STONE : TILE.WALL;
  }
  return TILE.VOID;
}

function isDungeonWalkableTile(dungeon, x, y, TILE, hashFn = hash2) {
  const tile = getDungeonInteriorTile(dungeon, x, y, TILE, hashFn);
  return tile === TILE.FLOOR || tile === TILE.PATH || tile === TILE.DARK_GRASS;
}

function collectDungeonFloorTiles(dungeon, TILE, hashFn = hash2) {
  const tiles = [];
  for (let ly = -dungeon.halfH + 2; ly < dungeon.halfH; ly += 1) {
    for (let lx = -dungeon.halfW + 2; lx < dungeon.halfW; lx += 1) {
      const x = dungeon.interiorX + lx;
      const y = dungeon.interiorY + ly;
      if (isDungeonWalkableTile(dungeon, x, y, TILE, hashFn)) {
        tiles.push({ x, y });
      }
    }
  }
  return tiles;
}

function getCaveEntranceTileOverride(x, y, TILE) {
  for (const dungeon of DUNGEON_DEFINITIONS) {
    const dx = x - dungeon.entranceX;
    const dy = y - dungeon.entranceY;
    const distSq = dx * dx + dy * dy;
    if (distSq > 12) continue;

    // Dark cave mouth
    if (dx === 0 && dy === 0) return TILE.VOID;
    if (Math.abs(dx) <= 1 && dy <= 0) return TILE.VOID;

    // Rocky mound around the entrance
    if (distSq <= 8) return TILE.STONE;
    if (distSq <= 12) return TILE.DARK_GRASS;
  }
  return null;
}

function getCaveEntrancesInChunk(cx, cy, chunkSize) {
  const startX = cx * chunkSize;
  const startY = cy * chunkSize;
  const endX = startX + chunkSize;
  const endY = startY + chunkSize;
  const out = [];

  for (const dungeon of DUNGEON_DEFINITIONS) {
    if (dungeon.entranceX < startX || dungeon.entranceX >= endX || dungeon.entranceY < startY || dungeon.entranceY >= endY) {
      continue;
    }
    out.push({
      id: `cave_${dungeon.id}`,
      dungeonId: dungeon.id,
      name: dungeon.name,
      x: dungeon.entranceX,
      y: dungeon.entranceY,
      color: dungeon.accent
    });
  }

  return out;
}

function getDungeonLandingPosition(dungeon) {
  return {
    x: dungeon.interiorX,
    y: dungeon.interiorY + dungeon.halfH - 3.5
  };
}

function getDungeonBossPosition(dungeon) {
  return {
    x: dungeon.interiorX,
    y: dungeon.interiorY - dungeon.halfH + 8
  };
}

module.exports = {
  DUNGEON_DEFINITIONS,
  DUNGEON_INTERACT_RADIUS,
  getDungeonById,
  getDungeonByInteriorPoint,
  getDungeonAtEntrance,
  getDungeonInteriorTile,
  isDungeonWalkableTile,
  collectDungeonFloorTiles,
  getCaveEntranceTileOverride,
  getCaveEntrancesInChunk,
  getDungeonLandingPosition,
  getDungeonBossPosition,
  hash2
};
