// Uniform grid for proximity queries. Entities re-bucket themselves only when they cross a
// cell boundary, so moving inside a cell is free.

export interface Spatial {
  id: string;
  x: number;
  y: number;
  cell: number;
}

const CELL = 16;
const OFFSET = 1 << 15;

function cellOf(x: number, y: number): number {
  return (Math.floor(x / CELL) + OFFSET) * 65536 + (Math.floor(y / CELL) + OFFSET);
}

export class SpatialGrid<T extends Spatial> {
  private cells = new Map<number, Set<T>>();

  insert(e: T): void {
    e.cell = cellOf(e.x, e.y);
    let set = this.cells.get(e.cell);
    if (!set) {
      set = new Set();
      this.cells.set(e.cell, set);
    }
    set.add(e);
  }

  remove(e: T): void {
    const set = this.cells.get(e.cell);
    if (!set) return;
    set.delete(e);
    if (!set.size) this.cells.delete(e.cell);
  }

  /** Call after changing e.x / e.y. */
  moved(e: T): void {
    const next = cellOf(e.x, e.y);
    if (next === e.cell) return;
    this.remove(e);
    this.insert(e);
  }

  /** Visit entities whose cell intersects the square around (x, y). Caller filters exact distance. */
  forEachNear(x: number, y: number, r: number, fn: (e: T) => void): void {
    const minX = Math.floor((x - r) / CELL) + OFFSET;
    const maxX = Math.floor((x + r) / CELL) + OFFSET;
    const minY = Math.floor((y - r) / CELL) + OFFSET;
    const maxY = Math.floor((y + r) / CELL) + OFFSET;
    for (let cx = minX; cx <= maxX; cx += 1) {
      for (let cy = minY; cy <= maxY; cy += 1) {
        const set = this.cells.get(cx * 65536 + cy);
        if (!set) continue;
        for (const e of set) fn(e);
      }
    }
  }

  /** Cells (as numeric keys) within r of (x, y); used to mark "awake" regions. */
  cellKeysNear(x: number, y: number, r: number, out: Set<number>): void {
    const minX = Math.floor((x - r) / CELL) + OFFSET;
    const maxX = Math.floor((x + r) / CELL) + OFFSET;
    const minY = Math.floor((y - r) / CELL) + OFFSET;
    const maxY = Math.floor((y + r) / CELL) + OFFSET;
    for (let cx = minX; cx <= maxX; cx += 1) {
      for (let cy = minY; cy <= maxY; cy += 1) out.add(cx * 65536 + cy);
    }
  }

  cellSet(key: number): Set<T> | undefined {
    return this.cells.get(key);
  }
}
