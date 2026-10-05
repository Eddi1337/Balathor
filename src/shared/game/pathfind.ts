// Small grid A* for NPC errands (walking between home, shop and inn). Bounded search, then the
// path is smoothed with line-of-sight checks so villagers stroll rather than zig-zag.

import { circleBlocked, type TileSource } from "./movement";

const NPC_RADIUS = 0.32;

function walkable(src: TileSource, x: number, y: number): boolean {
  return !circleBlocked(src, x + 0.5, y + 0.5, NPC_RADIUS);
}

/** True when a circle can travel in a straight line from a to b. */
export function clearLine(src: TileSource, ax: number, ay: number, bx: number, by: number): boolean {
  const d = Math.hypot(bx - ax, by - ay);
  const steps = Math.ceil(d / 0.3);
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    if (circleBlocked(src, ax + (bx - ax) * t, ay + (by - ay) * t, NPC_RADIUS)) return false;
  }
  return true;
}

/**
 * Path from (sx, sy) to (gx, gy) in world coords, or null if none within maxNodes.
 * Returned points exclude the start and end exactly at the goal.
 */
export function findPath(src: TileSource, sx: number, sy: number, gx: number, gy: number, maxNodes = 6000): { x: number; y: number }[] | null {
  if (clearLine(src, sx, sy, gx, gy)) return [{ x: gx, y: gy }];
  const start = [Math.floor(sx), Math.floor(sy)];
  const goal = [Math.floor(gx), Math.floor(gy)];
  const key = (x: number, y: number) => `${x},${y}`;
  const open: { x: number; y: number; f: number; g: number }[] = [{ x: start[0], y: start[1], f: 0, g: 0 }];
  const came = new Map<string, string>();
  const gScore = new Map<string, number>([[key(start[0], start[1]), 0]]);
  let expanded = 0;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (open.length && expanded < maxNodes) {
    // Small open sets: a linear scan for the best node is fine.
    let bi = 0;
    for (let i = 1; i < open.length; i += 1) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    expanded += 1;
    if (cur.x === goal[0] && cur.y === goal[1]) {
      const tiles: { x: number; y: number }[] = [];
      let k: string | undefined = key(cur.x, cur.y);
      while (k) {
        const [x, y] = k.split(",").map(Number);
        tiles.push({ x: x + 0.5, y: y + 0.5 });
        k = came.get(k);
      }
      tiles.reverse();
      tiles[tiles.length - 1] = { x: gx, y: gy };
      return smooth(src, sx, sy, tiles);
    }
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!walkable(src, nx, ny)) continue;
      if (dx && dy && (!walkable(src, cur.x + dx, cur.y) || !walkable(src, cur.x, cur.y + dy))) continue;
      const g = cur.g + (dx && dy ? 1.414 : 1);
      const k = key(nx, ny);
      if (g >= (gScore.get(k) ?? Infinity)) continue;
      gScore.set(k, g);
      came.set(k, key(cur.x, cur.y));
      open.push({ x: nx, y: ny, g, f: g + Math.hypot(goal[0] - nx, goal[1] - ny) });
    }
  }
  return null;
}

function smooth(src: TileSource, sx: number, sy: number, pts: { x: number; y: number }[]): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  let ax = sx;
  let ay = sy;
  let i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !clearLine(src, ax, ay, pts[j].x, pts[j].y)) j -= 1;
    out.push(pts[j]);
    ax = pts[j].x;
    ay = pts[j].y;
    i = j + 1;
  }
  return out;
}
