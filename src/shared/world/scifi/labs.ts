// Tech Labs I-III: Dr. Quill's robot-haunted research decks below Ringforge. Each lab is a
// seeded chain of rooms joined by corridors: the lift pad in the first room, security robots
// and turrets in between, and an Overseer waiting in the last (largest) room.

import { Tile } from "../tiles";
import { buildRooms, roomSpawns, type RoomLayout } from "../dungeons/rooms";
import type { SpawnSpec } from "./space";

export const LAB_W = 78;
export const LAB_H = 56;
export type LabId = 1 | 2 | 3;
export const LAB_IDS: LabId[] = [1, 2, 3];

export const LAB_INFO: Record<LabId, { name: string; level: number; boss: string; mobs: Record<string, number> }> = {
  1: { name: "Tech Lab I: Robotics", level: 10, boss: "overseer_1", mobs: { security_bot: 5, laser_turret: 2 } },
  2: { name: "Tech Lab II: Cryo Vaults", level: 18, boss: "overseer_2", mobs: { security_bot: 4, laser_turret: 2, sentinel: 3 } },
  3: { name: "Tech Lab III: The Core", level: 26, boss: "overseer_3", mobs: { security_bot: 3, laser_turret: 3, sentinel: 4 } }
};

export type LabLayout = RoomLayout & { id: LabId };

function build(id: LabId): LabLayout {
  return { id, ...buildRooms(7000 + id * 131, LAB_W, LAB_H, 7 + id, { corner: [Tile.CONSOLE, Tile.PLANTER], wall: Tile.CONSOLE }) };
}

const LAYOUTS = new Map<LabId, LabLayout>();
export function labLayout(id: LabId): LabLayout {
  let l = LAYOUTS.get(id);
  if (!l) LAYOUTS.set(id, (l = build(id)));
  return l;
}

export function labTileAt(id: LabId, x: number, y: number): number {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= LAB_W || ty >= LAB_H) return Tile.METAL_WALL;
  return labLayout(id).grid[ty * LAB_W + tx];
}

export function labMapId(id: LabId): string {
  return `lab:${id}`;
}

export function parseLabMapId(map: string): LabId | null {
  const m = /^lab:([123])$/.exec(map);
  return m ? (Number(m[1]) as LabId) : null;
}

export function labSpawns(id: LabId): SpawnSpec[] {
  const info = LAB_INFO[id];
  return roomSpawns(`lab${id}`, labLayout(id), { ...info, guard: "security_bot" }, 9000 + id, id - 1);
}
