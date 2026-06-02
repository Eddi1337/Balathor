"use strict";

/**
 * Fantasy dungeon instances — isolated world planes at remote coordinates.
 * Seventy-five procedurally placed caves on the fantasy overworld; each dungeon
 * is entered only via its cave mouth (interact) and surrounded by black void.
 */

const CHUNK_SIZE = 16;
const DUNGEON_COUNT = 75;
const DUNGEON_INTERACT_RADIUS = 2.65;
const DUNGEON_INTERIOR_ORIGIN_X = 17000;
const DUNGEON_INTERIOR_ORIGIN_Y = 15000;
const DUNGEON_INTERIOR_SPACING = 130;
const DUNGEON_INTERIOR_COLS = 10;
const DUNGEON_EDGE_MARGIN = 1.5;

const FANTASY_CAVE_BOUNDS = Object.freeze({ min: -950, max: 950 });
const CAVE_HUB_EXCLUSION = 96;
const CAVE_PORTAL_EXCLUSION = 14;
const CAVE_MIN_SEPARATION = 44;
const CAVE_PLACEMENT_SEED = 88031;

const PORTAL_TILES = Object.freeze([
  { x: 46, y: -76 },
  { x: -46, y: -76 },
  { x: 0, y: -76 },
  { x: 20, y: 0 },
  { x: 600, y: 522 },
  { x: -600, y: -458 },
  { x: 580, y: -503 }
]);

const LEGACY_DUNGEONS = Object.freeze([
  Object.freeze({
    id: "whispering_crypt",
    name: "Whispering Crypt",
    bossName: "Ancient Lich",
    entranceX: -178,
    entranceY: 212,
    interiorX: 15000,
    interiorY: 15000,
    halfW: 30,
    halfH: 38,
    faction: "undead",
    tier: 2,
    seed: 31042,
    layoutVariant: 0,
    accent: "#8b7355"
  }),
  Object.freeze({
    id: "ember_pit",
    name: "Ember Pit",
    bossName: "Infernal Demon Lord",
    entranceX: 418,
    entranceY: -318,
    interiorX: 15000,
    interiorY: 15700,
    halfW: 32,
    halfH: 40,
    faction: "demon",
    tier: 3,
    seed: 42017,
    layoutVariant: 1,
    accent: "#c05a35"
  }),
  Object.freeze({
    id: "bandit_depths",
    name: "Bandit Depths",
    bossName: "Dread Bandit King",
    entranceX: 282,
    entranceY: 198,
    interiorX: 15700,
    interiorY: 15000,
    halfW: 28,
    halfH: 36,
    faction: "bandit",
    tier: 2,
    seed: 53091,
    layoutVariant: 2,
    accent: "#6b5344"
  })
]);

const DUNGEON_FACTIONS = Object.freeze([
  "undead", "demon", "bandit", "dragon", "golem", "toxic",
  "forest", "swamp", "savanna", "tundra", "badlands", "desert",
  "frost", "ember", "meadow"
]);

const FACTION_ACCENTS = Object.freeze({
  undead: "#8b7355",
  demon: "#c05a35",
  bandit: "#6b5344",
  dragon: "#8b1a1a",
  golem: "#5a5a6e",
  toxic: "#84cc16",
  forest: "#4f9f5f",
  swamp: "#3d6b4f",
  savanna: "#b8933a",
  tundra: "#8ac8e8",
  badlands: "#c05a35",
  desert: "#c7904f",
  frost: "#88d8ff",
  ember: "#d85b35",
  meadow: "#79b85a"
});

const NAME_PREFIXES = Object.freeze([
  "Whispering", "Forgotten", "Sunken", "Cursed", "Shattered", "Hollow", "Grim",
  "Murky", "Ashen", "Blighted", "Drowned", "Fungal", "Gloomy", "Haunted", "Iron",
  "Jagged", "Knotted", "Lost", "Moldering", "Nether", "Obsidian", "Pale", "Quiet",
  "Riven", "Shadow", "Thorn", "Umbral", "Vile", "Wretched", "Broken", "Cracked",
  "Deep", "Ebon", "Frost", "Ghastly", "Hidden"
]);

const NAME_NOUNS = Object.freeze([
  "Crypt", "Caverns", "Depths", "Hollow", "Pit", "Lair", "Catacombs", "Warrens",
  "Grotto", "Vault", "Den", "Burrow", "Mines", "Tunnels", "Sanctum", "Halls",
  "Chamber", "Reach", "Maw", "Nest", "Sepulcher", "Tomb", "Undercroft", "Abyss",
  "Crawl", "Gulf", "Keep", "Labyrinth", "Maze", "Nexus", "Oubliette", "Passage",
  "Quarry", "Rift", "Sink", "Spire"
]);

const BOSS_EPITHETS = Object.freeze([
  "Ancient", "Corrupted", "Dread", "Forgotten", "Hollow", "Mad", "Silent", "Twisted",
  "Vile", "Wretched", "Accursed", "Bloodied", "Cinder", "Doomed", "Elder", "Feral",
  "Graven", "Hateful", "Infernal", "Jaded", "Keening", "Loathsome", "Malign", "Nether",
  "Ominous", "Pale", "Ruined", "Savage", "Tormented", "Unhallowed", "Vengeful", "Withered",
  "Blighted", "Chained", "Dark", "Ebon", "Fallen", "Grim", "Harrowed", "Iconoclast",
  "Jinxed", "Knave", "Lurking", "Malefic", "Night", "Obsidian", "Profane", "Ravenous",
  "Scorned", "Thorn", "Undying", "Vexed", "Wrathful", "Xenolith", "Yawning", "Zealous",
  "Ashbound", "Barrow", "Carrion", "Dusk", "Ember", "Frigid", "Gloom", "Haze",
  "Ichor", "Jade", "Kraken", "Lament", "Mire", "Nox", "Onyx", "Pestilent",
  "Quake", "Rot", "Shade", "Terror", "Umber", "Vortex"
]);

const BOSS_TITLES_BY_FACTION = Object.freeze({
  undead: ["Lich", "Wight Lord", "Bone King", "Grave Warden", "Death Priest"],
  demon: ["Demon Lord", "Pit Master", "Hell Baron", "Void Tyrant", "Flame Duke"],
  bandit: ["Bandit King", "Outlaw Captain", "Highway Reaver", "Blackhand", "Marauder Chief"],
  dragon: ["Drake Tyrant", "Wyrm Keeper", "Scale Lord", "Dragon Patriarch", "Ash Wyrm"],
  golem: ["Stone Colossus", "Iron Warden", "Shard Titan", "Rune Golem", "Bedrock Lord"],
  toxic: ["Blight Patriarch", "Spore Tyrant", "Venom Lord", "Miasma Warden", "Toxic Duke"],
  forest: ["Bramble Chief", "Thorn Patriarch", "Root Warden", "Grove Tyrant", "Wild Huntmaster"],
  swamp: ["Marsh Sovereign", "Bog Witch King", "Mire Lord", "Fen Horror", "Swamp Baron"],
  savanna: ["Plains Warlord", "Dust King", "Prairie Tyrant", "Sun Scourge", "Savanna Khan"],
  tundra: ["Frost Colossus", "Ice Warden", "Rime Lord", "Glacier Patriarch", "Blizzard Duke"],
  badlands: ["Infernal Warden", "Char Tyrant", "Scorch Lord", "Ash Baron", "Cinder King"],
  desert: ["Dune Brute", "Sand Sultan", "Mirage Lord", "Scorch Patriarch", "Dust Warden"],
  frost: ["Rime Lord", "Hoarfrost King", "Icebound Tyrant", "Permafrost Warden", "Glacier Duke"],
  ember: ["Cinder Brute", "Ember Patriarch", "Ash Lord", "Flame Warden", "Coal Tyrant"],
  meadow: ["Thistle Matron", "Field Warden", "Bloom Tyrant", "Pasture Lord", "Greensward Duke"]
});

function hash2(x, y, seed = 1337) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function pickFrom(list, index, salt, seed) {
  return list[Math.floor(hash2(index, salt, seed) * list.length) % list.length];
}

function uniqueDungeonName(index, used) {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const prefix = pickFrom(NAME_PREFIXES, index, attempt * 3 + 1, CAVE_PLACEMENT_SEED);
    const noun = pickFrom(NAME_NOUNS, index, attempt * 3 + 2, CAVE_PLACEMENT_SEED + 17);
    const name = attempt === 0 ? `${prefix} ${noun}` : `${prefix} ${noun} ${attempt + 1}`;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  const fallback = `Hidden Depths ${index + 1}`;
  used.add(fallback);
  return fallback;
}

function uniqueBossName(index, faction, used) {
  const titles = BOSS_TITLES_BY_FACTION[faction] || BOSS_TITLES_BY_FACTION.undead;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const epithet = pickFrom(BOSS_EPITHETS, index, attempt * 2 + 5, CAVE_PLACEMENT_SEED + 41);
    const title = pickFrom(titles, index, attempt * 2 + 6, CAVE_PLACEMENT_SEED + 59);
    const name = attempt === 0 ? `${epithet} ${title}` : `${epithet} ${title} ${attempt + 1}`;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  const fallback = `Guardian ${index + 1}`;
  used.add(fallback);
  return fallback;
}

function isValidCaveEntrance(x, y, accepted) {
  if (x < FANTASY_CAVE_BOUNDS.min || x > FANTASY_CAVE_BOUNDS.max) return false;
  if (y < FANTASY_CAVE_BOUNDS.min || y > FANTASY_CAVE_BOUNDS.max) return false;
  if (Math.hypot(x, y) < CAVE_HUB_EXCLUSION) return false;

  for (const portal of PORTAL_TILES) {
    if (Math.hypot(x - portal.x, y - portal.y) < CAVE_PORTAL_EXCLUSION) return false;
  }

  for (const other of accepted) {
    if (Math.hypot(x - other.entranceX, y - other.entranceY) < CAVE_MIN_SEPARATION) return false;
  }

  return true;
}

function generateCaveEntrances(count, initialEntrances = []) {
  const accepted = [...initialEntrances];
  const targetCount = accepted.length + count;
  const ringRadii = [120, 180, 260, 340, 430, 520, 620, 720, 820, 910];
  let candidateIndex = 0;

  for (const radius of ringRadii) {
    if (accepted.length >= targetCount) break;
    const slots = Math.max(8, Math.floor((Math.PI * 2 * radius) / CAVE_MIN_SEPARATION));
    for (let slot = 0; slot < slots && accepted.length < targetCount; slot += 1) {
      const angle = (slot / slots) * Math.PI * 2 + hash2(radius, slot, CAVE_PLACEMENT_SEED) * 0.8;
      const jitter = hash2(candidateIndex, slot, CAVE_PLACEMENT_SEED + 101) * 18 - 9;
      const x = Math.round(Math.cos(angle) * (radius + jitter));
      const y = Math.round(Math.sin(angle) * (radius + jitter));
      candidateIndex += 1;
      if (!isValidCaveEntrance(x, y, accepted)) continue;
      accepted.push({ entranceX: x, entranceY: y });
    }
  }

  // Fill remaining slots with jittered grid candidates.
  for (let gx = FANTASY_CAVE_BOUNDS.min; gx <= FANTASY_CAVE_BOUNDS.max && accepted.length < targetCount; gx += 56) {
    for (let gy = FANTASY_CAVE_BOUNDS.min; gy <= FANTASY_CAVE_BOUNDS.max && accepted.length < targetCount; gy += 56) {
      const jx = Math.round(gx + hash2(gx, gy, CAVE_PLACEMENT_SEED + 211) * 34 - 17);
      const jy = Math.round(gy + hash2(gx, gy, CAVE_PLACEMENT_SEED + 313) * 34 - 17);
      candidateIndex += 1;
      if (!isValidCaveEntrance(jx, jy, accepted)) continue;
      accepted.push({ entranceX: jx, entranceY: jy });
    }
  }

  if (accepted.length < targetCount) {
    throw new Error(`Could only place ${accepted.length}/${targetCount} dungeon cave entrances`);
  }

  return accepted.slice(initialEntrances.length, targetCount);
}

function interiorAnchorForIndex(index) {
  const col = index % DUNGEON_INTERIOR_COLS;
  const row = Math.floor(index / DUNGEON_INTERIOR_COLS);
  return {
    interiorX: DUNGEON_INTERIOR_ORIGIN_X + col * DUNGEON_INTERIOR_SPACING,
    interiorY: DUNGEON_INTERIOR_ORIGIN_Y + row * DUNGEON_INTERIOR_SPACING
  };
}

function buildDungeonDefinitions() {
  const entrances = generateCaveEntrances(DUNGEON_COUNT - LEGACY_DUNGEONS.length, LEGACY_DUNGEONS);
  const usedNames = new Set(LEGACY_DUNGEONS.map((dungeon) => dungeon.name));
  const usedBossNames = new Set(LEGACY_DUNGEONS.map((dungeon) => dungeon.bossName));
  const dungeons = [...LEGACY_DUNGEONS];

  for (let index = 0; index < entrances.length; index += 1) {
    const definitionIndex = index + LEGACY_DUNGEONS.length;
    const entrance = entrances[index];
    const anchor = interiorAnchorForIndex(index);
    const faction = DUNGEON_FACTIONS[definitionIndex % DUNGEON_FACTIONS.length];
    const dist = Math.hypot(entrance.entranceX, entrance.entranceY);
    const tier = Math.min(5, Math.max(1, 1 + Math.floor(dist / 175)));
    const layoutVariant = Math.floor(hash2(definitionIndex, faction.length, CAVE_PLACEMENT_SEED + 401) * 8);
    const sizeRoll = hash2(definitionIndex, tier, CAVE_PLACEMENT_SEED + 503);
    const halfW = 22 + tier * 2 + Math.floor(sizeRoll * 5) + (layoutVariant % 3);
    const halfH = 28 + tier * 2 + Math.floor(hash2(definitionIndex, layoutVariant, CAVE_PLACEMENT_SEED + 607) * 6) + (layoutVariant % 4);
    const seed = 10000 + definitionIndex * 977 + Math.floor(hash2(definitionIndex, tier, CAVE_PLACEMENT_SEED + 709) * 9999);
    const name = uniqueDungeonName(definitionIndex, usedNames);
    const bossName = uniqueBossName(definitionIndex, faction, usedBossNames);

    dungeons.push(Object.freeze({
      id: `dungeon_${definitionIndex + 1}`,
      name,
      bossName,
      entranceX: entrance.entranceX,
      entranceY: entrance.entranceY,
      interiorX: anchor.interiorX,
      interiorY: anchor.interiorY,
      halfW,
      halfH,
      faction,
      tier,
      seed,
      layoutVariant,
      accent: FACTION_ACCENTS[faction] || "#8b7355"
    }));
  }

  return Object.freeze(dungeons);
}

const DUNGEON_DEFINITIONS = buildDungeonDefinitions();

/** Fast tile overrides for overworld cave mouths. */
const CAVE_ENTRANCE_TILE_OVERRIDES = new Map();
/** Cave props grouped by chunk key `${cx},${cy}`. */
const CAVES_BY_CHUNK = new Map();
function registerSpatialIndexes() {
  CAVE_ENTRANCE_TILE_OVERRIDES.clear();
  CAVES_BY_CHUNK.clear();

  for (const dungeon of DUNGEON_DEFINITIONS) {
    for (let dx = -3; dx <= 3; dx += 1) {
      for (let dy = -3; dy <= 3; dy += 1) {
        const tx = dungeon.entranceX + dx;
        const ty = dungeon.entranceY + dy;
        const distSq = dx * dx + dy * dy;
        if (distSq > 12) continue;
        let tileKind = "dark_grass";
        if (dx === 0 && dy === 0) tileKind = "void";
        else if (Math.abs(dx) <= 1 && dy <= 0) tileKind = "void";
        else if (distSq <= 8) tileKind = "stone";
        CAVE_ENTRANCE_TILE_OVERRIDES.set(`${tx},${ty}`, tileKind);
      }
    }

    const chunkCx = Math.floor(dungeon.entranceX / CHUNK_SIZE);
    const chunkCy = Math.floor(dungeon.entranceY / CHUNK_SIZE);
    const chunkKey = `${chunkCx},${chunkCy}`;
    let chunkList = CAVES_BY_CHUNK.get(chunkKey);
    if (!chunkList) {
      chunkList = [];
      CAVES_BY_CHUNK.set(chunkKey, chunkList);
    }
    chunkList.push({
      id: `cave_${dungeon.id}`,
      dungeonId: dungeon.id,
      name: dungeon.name,
      x: dungeon.entranceX,
      y: dungeon.entranceY,
      color: dungeon.accent
    });
  }
}

registerSpatialIndexes();

function getDungeonById(id) {
  if (typeof id !== "string") return null;
  return DUNGEON_DEFINITIONS.find((dungeon) => dungeon.id === id) || null;
}

function pointInsideDungeon(dungeon, x, y) {
  const dx = x - dungeon.interiorX;
  const dy = y - dungeon.interiorY;
  const reachX = dungeon.halfW + DUNGEON_EDGE_MARGIN;
  const reachY = dungeon.halfH + DUNGEON_EDGE_MARGIN;
  return Math.abs(dx) <= reachX && Math.abs(dy) <= reachY;
}

function getDungeonByInteriorPoint(x, y) {
  return DUNGEON_DEFINITIONS.find((dungeon) => pointInsideDungeon(dungeon, x, y)) || null;
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

function wingSetForDungeon(dungeon) {
  const hh = dungeon.halfH;
  const variant = dungeon.layoutVariant % 8;
  const sets = [
    [
      { cy: hh - 12, halfW: 1.2, halfH: 20, rooms: [-16, 16] },
      { cy: 4, halfW: 1.2, halfH: 24, rooms: [-18, 0, 18] },
      { cy: -hh + 24, halfW: 1.2, halfH: 18, rooms: [-14, 14] }
    ],
    [
      { cy: hh - 10, halfW: 1.4, halfH: 16, rooms: [-12, 12, 0] },
      { cy: -2, halfW: 1.0, halfH: 22, rooms: [-20, 20] },
      { cy: -hh + 20, halfW: 1.3, halfH: 14, rooms: [-10, 10] }
    ],
    [
      { cy: hh - 14, halfW: 1.1, halfH: 18, rooms: [-22, 22] },
      { cy: 8, halfW: 1.5, halfH: 20, rooms: [-8, 8] },
      { cy: -hh + 26, halfW: 1.2, halfH: 16, rooms: [-18, 0, 18] }
    ],
    [
      { cy: hh - 8, halfW: 1.6, halfH: 24, rooms: [-14, 14] },
      { cy: 0, halfW: 1.0, halfH: 28, rooms: [-24, -8, 8, 24] },
      { cy: -hh + 18, halfW: 1.2, halfH: 12, rooms: [-12, 12] }
    ],
    [
      { cy: hh - 16, halfW: 1.3, halfH: 14, rooms: [-10, 10] },
      { cy: 6, halfW: 1.1, halfH: 26, rooms: [-20, 0, 20] },
      { cy: -hh + 22, halfW: 1.4, halfH: 20, rooms: [-16, 16] }
    ],
    [
      { cy: hh - 11, halfW: 1.0, halfH: 22, rooms: [-18, -6, 6, 18] },
      { cy: -4, halfW: 1.3, halfH: 18, rooms: [-14, 14] },
      { cy: -hh + 28, halfW: 1.2, halfH: 16, rooms: [-12, 0, 12] }
    ],
    [
      { cy: hh - 13, halfW: 1.2, halfH: 20, rooms: [-20, 20] },
      { cy: 2, halfW: 1.4, halfH: 22, rooms: [-16, 0, 16] },
      { cy: -hh + 24, halfW: 1.0, halfH: 24, rooms: [-22, 22] }
    ],
    [
      { cy: hh - 9, halfW: 1.5, halfH: 18, rooms: [-8, 8] },
      { cy: 10, halfW: 1.1, halfH: 16, rooms: [-18, 18] },
      { cy: -hh + 20, halfW: 1.3, halfH: 22, rooms: [-14, 0, 14] }
    ]
  ];
  return sets[variant] || sets[0];
}

/**
 * Procedural multi-room cave layout relative to dungeon center.
 * Outside the bounding box returns null (caller maps to VOID).
 */
function dungeonLayoutKind(dungeon, lx, ly) {
  const hw = dungeon.halfW;
  const hh = dungeon.halfH;
  const variant = dungeon.layoutVariant % 8;

  if (!isInsideDungeonBounds(dungeon, lx, ly)) {
    return null;
  }

  if (Math.abs(lx) === hw || Math.abs(ly) === hh) {
    if (ly === hh && Math.abs(lx) <= 1.5) return "floor";
    return "wall";
  }

  const bossDepth = 11 + (variant % 4);
  const bossHalfW = 7 + (variant % 3);
  const bossRoom = {
    minX: -bossHalfW,
    maxX: bossHalfW,
    minY: -hh + 2,
    maxY: -hh + 2 + bossDepth
  };
  const bossGap = { y: bossRoom.maxY, minX: -1, maxX: 1 };
  const bossTile = roomTile(lx, ly, bossRoom, bossGap);
  if (bossTile) return bossTile;

  const spineWidth = variant % 2 === 0 ? 1.5 : 1.0;
  if (Math.abs(lx) <= spineWidth && ly >= -hh + bossDepth + 2) {
    return "floor";
  }

  if (variant >= 4 && Math.abs(ly) <= spineWidth && lx >= -hw + 8) {
    return "floor";
  }

  for (const wing of wingSetForDungeon(dungeon)) {
    const corridor = corridorTile(lx, ly, 0, wing.cy, wing.halfW, wing.halfH);
    if (corridor) return corridor;

    for (const rx of wing.rooms) {
      const roomHalf = rx === 0 ? 6 : 5;
      const room = {
        minX: rx - roomHalf,
        maxX: rx + roomHalf,
        minY: wing.cy - roomHalf,
        maxY: wing.cy + roomHalf
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

  const stalagmiteThreshold = 0.9 + (variant % 5) * 0.012;
  const h = hash2(lx + dungeon.interiorX, ly + dungeon.interiorY, dungeon.seed | 0);
  if (h > stalagmiteThreshold) return "wall";

  return "wall";
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
  const kind = CAVE_ENTRANCE_TILE_OVERRIDES.get(`${x},${y}`);
  if (!kind) return null;
  if (kind === "void") return TILE.VOID;
  if (kind === "stone") return TILE.STONE;
  return TILE.DARK_GRASS;
}

function getCaveEntrancesInChunk(cx, cy, chunkSize) {
  const chunkKey = `${cx},${cy}`;
  return CAVES_BY_CHUNK.get(chunkKey) || [];
}

function getDungeonLandingPosition(dungeon) {
  return {
    x: dungeon.interiorX,
    y: dungeon.interiorY + dungeon.halfH - 3.5
  };
}

function getDungeonBossPosition(dungeon) {
  const variant = dungeon.layoutVariant % 8;
  const bossDepth = 11 + (variant % 4);
  return {
    x: dungeon.interiorX + (variant % 2 === 0 ? 0 : (variant % 3) - 1),
    y: dungeon.interiorY - dungeon.halfH + Math.min(bossDepth - 2, 10)
  };
}

module.exports = {
  DUNGEON_COUNT,
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
