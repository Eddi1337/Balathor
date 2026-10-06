// Player homes: ordinary city houses up the hill that can be bought. Each home's interior is its
// own map ("house:<id>:<floor>"); the castle's throne room is an interior too.

import { CITY_HOUSES, CASTLE, TIER_H, type CityHouse } from "./city";
import { STARGATE, STARGATE_FRONT } from "./scifi/stargate";
import { LIFTS, STATION_ARRIVAL, STATION_GATE } from "./scifi/station";
import { LAB_INFO, labLayout } from "./scifi/labs";
import { CAVE_MOUTHS_BY_ID, SEAFARER_CAVE, SEAFARER_FRONT, mouthFront } from "./overworld";
import { CAVES, caveLayout, type CaveId } from "./dungeons/caves";
import { DUNGEON_DOORS, GROUP_DUNGEONS, dungeonLayout, type GroupDungeonId } from "./dungeons/group";
import { GROTTO, PORT_SPAWN } from "./sea/ocean";
import { Tile } from "./tiles";

export const PRICES = [0, 1200, 1800, 3000];

export interface Plot {
  id: string;
  name: string;
  house: CityHouse;
  /** Nobles' ring homes are two-storey manors. */
  manor: boolean;
  price: number;
  front: { x: number; y: number };
}

const NAMES = ["Bluebell", "Clover", "Hazelnut", "Honeydew", "Juniper", "Marigold", "Peony", "Primrose", "Rosehip", "Sorrel", "Thistle", "Wren", "Bramble", "Fennel", "Lavender", "Moss", "Nettle", "Poppy", "Saffron", "Tansy", "Willow", "Yarrow", "Acorn", "Daisy"];

function buildPlots(): Plot[] {
  const plots: Plot[] = [];
  for (const tier of [1, 2, 3]) {
    const candidates = CITY_HOUSES.filter((h) => h.tier === tier && !h.shop);
    const every = Math.max(2, Math.floor(candidates.length / 8));
    candidates.forEach((h, i) => {
      if (i % every !== 0 || plots.filter((p) => p.house.tier === tier).length >= 8) return;
      const manor = tier === 3;
      plots.push({
        id: h.id,
        name: `${NAMES[plots.length % NAMES.length]} ${manor ? "Manor" : "House"}`,
        house: h,
        manor,
        price: PRICES[tier],
        front: h.front
      });
    });
  }
  return plots;
}

export const PLOTS: Plot[] = buildPlots();
export const PLOTS_BY_ID: Record<string, Plot> = Object.fromEntries(PLOTS.map((p) => [p.id, p]));

// ── interiors ───────────────────────────────────────────────────────────────

export type InteriorStyle = "home" | "manor" | "throne";

export interface InteriorLayout {
  style: InteriorStyle;
  w: number;
  h: number;
  /** Exit mat inside the front door. */
  door: { x: number; y: number };
  /** Stairs tile (to the other floor), if any. */
  stairs: { x: number; y: number } | null;
  spawn: { x: number; y: number };
  /** Extra solid cells (pillars, the throne dais). */
  solid: Set<string>;
}

export function interiorLayout(plot: Plot, floor: number): InteriorLayout {
  const w = plot.manor ? 15 : 12;
  const h = plot.manor ? 11 : 9;
  const door = { x: Math.floor(w / 2), y: h - 1 };
  const stairs = plot.manor ? { x: w - 2, y: 1 } : null;
  const style: InteriorStyle = plot.manor ? "manor" : "home";
  if (floor === 1) {
    return { style, w, h, door: { x: -10, y: -10 }, stairs, spawn: { x: w - 3.5, y: 1.5 }, solid: new Set() };
  }
  return { style, w, h, door, stairs, spawn: { x: door.x + 0.5, y: door.y - 1.2 }, solid: new Set() };
}

export const THRONE_ROOM: InteriorLayout = (() => {
  const w = 23;
  const h = 17;
  const solid = new Set<string>();
  for (const px of [4, 18]) for (const py of [4, 8, 12]) solid.add(`${px},${py}`);
  for (let x = 9; x <= 13; x += 1) solid.add(`${x},1`);
  solid.add("11,2");
  return { style: "throne", w, h, door: { x: 11, y: h - 1 }, stairs: null, spawn: { x: 11.5, y: h - 2.4 }, solid };
})();

export function interiorTileAt(layout: InteriorLayout, x: number, y: number): number {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx === layout.door.x && ty === layout.door.y) return Tile.DOORMAT;
  if (layout.stairs && tx === layout.stairs.x && ty === layout.stairs.y) return Tile.STAIRS;
  if (tx <= 0 || ty <= 0 || tx >= layout.w - 1 || ty >= layout.h - 1) return Tile.WALL;
  if (layout.solid.has(`${tx},${ty}`)) return Tile.FURNITURE;
  return Tile.FLOOR;
}

export function houseMapId(plotId: string, floor = 0): string {
  return `house:${plotId}:${floor}`;
}

export function parseHouseMapId(id: string): { plotId: string; floor: number } | null {
  const m = /^house:([a-z0-9_]+):(\d)$/.exec(id);
  return m ? { plotId: m[1], floor: Number(m[2]) } : null;
}

// ── doors between maps ──────────────────────────────────────────────────────

export interface Door {
  id: string;
  label: string;
  /** Where you stand to use it. */
  map: string;
  x: number;
  y: number;
  /** Where it takes you. */
  to: { map: string; x: number; y: number };
  plot?: string;
}

export const CASTLE_FRONT = { x: 0.5, y: CASTLE.y + CASTLE.h + 1.6 };
export const CASTLE_FLOOR_H = TIER_H[4];

export const DOORS: Door[] = [
  {
    id: "castle_in",
    label: "Enter the castle",
    map: "overworld",
    x: CASTLE_FRONT.x,
    y: CASTLE_FRONT.y,
    to: { map: "castle:throne", x: THRONE_ROOM.spawn.x, y: THRONE_ROOM.spawn.y }
  },
  {
    id: "castle_out",
    label: "Leave the castle",
    map: "castle:throne",
    x: THRONE_ROOM.door.x + 0.5,
    y: THRONE_ROOM.door.y - 0.5,
    to: { map: "overworld", x: CASTLE_FRONT.x, y: CASTLE_FRONT.y + 0.8 }
  },
  {
    id: "stargate_in",
    label: "Step through the Stargate",
    map: "overworld",
    x: STARGATE_FRONT.x,
    y: STARGATE_FRONT.y,
    to: { map: "station", x: STATION_ARRIVAL.x, y: STATION_ARRIVAL.y }
  },
  {
    id: "stargate_out",
    label: "Return to Hearthmoor",
    map: "station",
    x: STATION_GATE.x,
    y: STATION_GATE.y + 1.4,
    to: { map: "overworld", x: STARGATE.x - 2, y: STARGATE.y }
  },
  {
    id: "seafarer_in",
    label: "Enter the Seafarer Cave",
    map: "overworld",
    x: SEAFARER_FRONT.x,
    y: SEAFARER_FRONT.y,
    to: { map: "ocean", x: PORT_SPAWN.x, y: PORT_SPAWN.y }
  },
  {
    id: "seafarer_out",
    label: "Take the tunnel back to the island",
    map: "ocean",
    x: GROTTO.x,
    y: GROTTO.y,
    to: { map: "overworld", x: SEAFARER_FRONT.x + SEAFARER_CAVE.ox * 1.5, y: SEAFARER_FRONT.y + SEAFARER_CAVE.oy * 1.5 }
  },
  ...(Object.keys(CAVES) as CaveId[]).flatMap((id): Door[] => {
    const m = CAVE_MOUTHS_BY_ID[id];
    const front = mouthFront(m);
    const L = caveLayout(id);
    return [
      { id: `cave_${id}_in`, label: `Enter ${CAVES[id].name} (lv ${CAVES[id].level})`, map: "overworld", x: front.x, y: front.y, to: { map: `cave:${id}`, x: L.entry.x + 1, y: L.entry.y } },
      { id: `cave_${id}_out`, label: "Climb back out into the daylight", map: `cave:${id}`, x: L.entry.x, y: L.entry.y, to: { map: "overworld", x: front.x + m.ox * 1.5, y: front.y + m.oy * 1.5 } }
    ];
  }),
  ...(Object.keys(GROUP_DUNGEONS) as GroupDungeonId[]).flatMap((id): Door[] => {
    const def = GROUP_DUNGEONS[id];
    const at = DUNGEON_DOORS[id];
    const L = dungeonLayout(id);
    return [
      { id: `dungeon_${id}_in`, label: `Enter ${def.name} (group, lv ${def.level})`, map: def.from.map, x: at.x, y: at.y, to: { map: `dungeon:${id}`, x: L.pad.x, y: L.pad.y + 1.5 } },
      { id: `dungeon_${id}_out`, label: "Leave the dungeon", map: `dungeon:${id}`, x: L.pad.x, y: L.pad.y, to: { map: def.from.map, x: def.from.x, y: def.from.y } }
    ];
  }),
  ...LIFTS.flatMap((l): Door[] => {
    const lab = l.lab as 1 | 2 | 3;
    const L = labLayout(lab);
    return [
      { id: `lift_${lab}`, label: `Take the lift to ${LAB_INFO[lab].name} (lv ${LAB_INFO[lab].level})`, map: "station", x: l.x, y: l.y, to: { map: `lab:${lab}`, x: L.pad.x, y: L.pad.y + 1.5 } },
      { id: `lift_${lab}_up`, label: "Take the lift back up to Ringforge", map: `lab:${lab}`, x: L.pad.x, y: L.pad.y, to: { map: "station", x: l.x, y: l.y + 1.6 } }
    ];
  }),
  ...PLOTS.flatMap((p): Door[] => {
    const inside = interiorLayout(p, 0);
    return [
      { id: `${p.id}_in`, label: `Enter ${p.name}`, map: "overworld", x: p.front.x, y: p.front.y, to: { map: houseMapId(p.id, 0), x: inside.spawn.x, y: inside.spawn.y }, plot: p.id },
      { id: `${p.id}_out`, label: "Go outside", map: houseMapId(p.id, 0), x: inside.door.x + 0.5, y: inside.door.y - 0.5, to: { map: "overworld", x: p.front.x, y: p.front.y }, plot: p.id }
    ];
  })
];

export const DOORS_BY_ID: Record<string, Door> = Object.fromEntries(DOORS.map((d) => [d.id, d]));
export const DOOR_RADIUS = 2.4;

export function doorsOn(map: string): Door[] {
  return DOORS.filter((d) => d.map === map);
}
