// Group dungeons: every party gets its own copy (an instance) of these, with monsters scaled to the
// party's size. The Sunken Temple lies under Turtle Cove; the Hollow King's Crypt in the highlands.

import { Tile } from "../tiles";
import { buildRooms, roomSpawns, roomTileAt, type RoomLayout } from "./rooms";
import type { SpawnSpec } from "../scifi/space";
import { CAVE_MOUTHS_BY_ID, mouthFront, type Biome } from "../overworld";
import { ISLES_BY_ID, landNear } from "../sea/ocean";

const SUNKEN_DOOR = landNear(ISLES_BY_ID.turtle.x - 8, ISLES_BY_ID.turtle.y - 8);
const CRYPT_DOOR = mouthFront(CAVE_MOUTHS_BY_ID.crypt);
/** Where you stand to go in. */
export const DUNGEON_DOORS = { sunken: SUNKEN_DOOR, crypt: CRYPT_DOOR };

export type GroupDungeonId = "sunken" | "crypt";

export interface GroupDungeonDef {
  id: GroupDungeonId;
  name: string;
  level: number;
  biome: Biome;
  boss: string;
  guard: string;
  mobs: Record<string, number>;
  seed: number;
  rooms: number;
  /** Where the entrance is (map and point) and where you come back out. */
  from: { map: string; x: number; y: number };
}

export const DUNGEON_W = 78;
export const DUNGEON_H = 56;

export const GROUP_DUNGEONS: Record<GroupDungeonId, GroupDungeonDef> = {
  sunken: { id: "sunken", name: "The Sunken Temple", level: 16, biome: "beach", boss: "boss_tidecaller", guard: "temple_guardian", mobs: { drowned_priest: 2, temple_guardian: 2, skeleton: 2, crab: 1 }, seed: 6101, rooms: 9, from: { map: "ocean", x: SUNKEN_DOOR.x, y: SUNKEN_DOOR.y + 1.5 } },
  crypt: { id: "crypt", name: "The Hollow King's Crypt", level: 24, biome: "highlands", boss: "boss_hollow_king", guard: "crypt_knight", mobs: { skeleton: 3, crypt_knight: 2, wisp: 1 }, seed: 6202, rooms: 10, from: { map: "overworld", x: CRYPT_DOOR.x + CAVE_MOUTHS_BY_ID.crypt.ox * 1.5, y: CRYPT_DOOR.y + CAVE_MOUTHS_BY_ID.crypt.oy * 1.5 } }
};

const LAYOUTS = new Map<GroupDungeonId, RoomLayout>();
export function dungeonLayout(id: GroupDungeonId): RoomLayout {
  let l = LAYOUTS.get(id);
  if (!l) {
    l = buildRooms(GROUP_DUNGEONS[id].seed, DUNGEON_W, DUNGEON_H, GROUP_DUNGEONS[id].rooms, { corner: [Tile.PLANTER], wall: Tile.CONSOLE });
    LAYOUTS.set(id, l);
  }
  return l;
}

export function dungeonTileAt(id: GroupDungeonId, x: number, y: number): number {
  return roomTileAt(dungeonLayout(id), x, y);
}

export function dungeonSpawns(id: GroupDungeonId): SpawnSpec[] {
  const def = GROUP_DUNGEONS[id];
  return roomSpawns(`dg_${id}`, dungeonLayout(id), def, def.seed + 3, 1);
}

export function parseDungeonMapId(map: string): GroupDungeonId | null {
  const m = /^dungeon:(sunken|crypt)$/.exec(map);
  return m ? (m[1] as GroupDungeonId) : null;
}
