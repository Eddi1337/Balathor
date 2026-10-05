// Furniture for player homes, sold at Marta's Workshop. Placement rules are shared so the
// client's ghost preview agrees with the server's validation.

import type { InteriorLayout } from "../world/housing";

export interface FurnitureDef {
  id: string;
  name: string;
  icon: string;
  price: number;
  w: number;
  h: number;
  /** Solid pieces block walking; rugs (layer 0) can sit under other furniture. */
  solid: boolean;
  layer: 0 | 1;
  /** Opens the house storage when you interact with it. */
  storage?: boolean;
}

export const FURNITURE: Record<string, FurnitureDef> = {
  bed: { id: "bed", name: "Cosy Bed", icon: "🛏️", price: 120, w: 1, h: 2, solid: true, layer: 1 },
  table: { id: "table", name: "Oak Table", icon: "🪵", price: 70, w: 2, h: 1, solid: true, layer: 1 },
  chair: { id: "chair", name: "Little Chair", icon: "🪑", price: 30, w: 1, h: 1, solid: true, layer: 1 },
  sofa: { id: "sofa", name: "Squishy Sofa", icon: "🛋️", price: 140, w: 2, h: 1, solid: true, layer: 1 },
  rug: { id: "rug", name: "Round Rug", icon: "🟣", price: 50, w: 2, h: 2, solid: false, layer: 0 },
  bookshelf: { id: "bookshelf", name: "Bookshelf", icon: "📚", price: 110, w: 2, h: 1, solid: true, layer: 1 },
  fireplace: { id: "fireplace", name: "Stone Fireplace", icon: "🔥", price: 220, w: 2, h: 1, solid: true, layer: 1 },
  plant: { id: "plant", name: "Potted Plant", icon: "🪴", price: 25, w: 1, h: 1, solid: true, layer: 1 },
  lantern: { id: "lantern", name: "Lantern Stand", icon: "🏮", price: 45, w: 1, h: 1, solid: true, layer: 1 },
  painting: { id: "painting", name: "Landscape Painting", icon: "🖼️", price: 90, w: 1, h: 1, solid: false, layer: 1 },
  cabinet: { id: "cabinet", name: "Kitchen Cabinet", icon: "🗄️", price: 80, w: 1, h: 1, solid: true, layer: 1 },
  weapon_rack: { id: "weapon_rack", name: "Weapon Rack", icon: "⚔️", price: 130, w: 2, h: 1, solid: true, layer: 1 },
  trophy: { id: "trophy", name: "Trophy Stand", icon: "🏆", price: 160, w: 1, h: 1, solid: true, layer: 1 },
  chest: { id: "chest", name: "Storage Chest", icon: "🧰", price: 150, w: 1, h: 1, solid: true, layer: 1, storage: true },
  cat: { id: "cat", name: "Sleepy Cat", icon: "🐈", price: 300, w: 1, h: 1, solid: true, layer: 1 }
};

export const MAX_PIECES_PER_FLOOR = 40;
export const HOUSE_STORAGE_SIZE = 30;

export interface PlacedPiece {
  id: string;
  kind: string;
  x: number;
  y: number;
  rot: number;
}

export function footprint(def: FurnitureDef, rot: number): { w: number; h: number } {
  return rot % 2 === 0 ? { w: def.w, h: def.h } : { w: def.h, h: def.w };
}

export function cellsOf(piece: { kind: string; x: number; y: number; rot: number }): { x: number; y: number }[] {
  const def = FURNITURE[piece.kind];
  if (!def) return [];
  const { w, h } = footprint(def, piece.rot);
  const out: { x: number; y: number }[] = [];
  for (let dx = 0; dx < w; dx += 1) for (let dy = 0; dy < h; dy += 1) out.push({ x: piece.x + dx, y: piece.y + dy });
  return out;
}

/** Why a piece can't go here, or null if it can. */
export function placementError(layout: InteriorLayout, pieces: PlacedPiece[], kind: string, x: number, y: number, rot: number): string | null {
  const def = FURNITURE[kind];
  if (!def) return "Unknown furniture";
  if (pieces.length >= MAX_PIECES_PER_FLOOR) return "This floor is full";
  const cells = cellsOf({ kind, x, y, rot });
  for (const c of cells) {
    if (c.x <= 0 || c.y <= 0 || c.x >= layout.w - 1 || c.y >= layout.h - 1) return "Keep it inside the walls";
    if (Math.abs(c.x - layout.door.x) <= 1 && c.y >= layout.door.y - 1) return "Keep the doorway clear";
    if (layout.stairs && Math.abs(c.x - layout.stairs.x) <= 1 && Math.abs(c.y - layout.stairs.y) <= 1) return "Keep the stairs clear";
  }
  for (const other of pieces) {
    const od = FURNITURE[other.kind];
    if (!od || od.layer !== def.layer) continue;
    const occupied = new Set(cellsOf(other).map((c) => `${c.x},${c.y}`));
    if (cells.some((c) => occupied.has(`${c.x},${c.y}`))) return "Something's already there";
  }
  return null;
}
