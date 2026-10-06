// Starfall Circle: a stone plaza just outside Hearthmoor's main gate where the Stargate stands.
// Step through it to reach Ringforge Station.

import { Tile } from "../tiles";

/** Plaza centre (overworld tiles). The ring stands on the plaza's east side, facing west. */
export const STARGATE = { x: 24.5, y: 117.5, r: 6.5 };
/** The ring's centre line (x) and its two pillar cells. */
export const GATE_RING = { x: STARGATE.x + 2, y: STARGATE.y, radius: 2.9 };
/** Where you stand to step through. */
export const STARGATE_FRONT = { x: STARGATE.x, y: STARGATE.y };
const PLAZA_H = 0.75;

export function stargateTileAt(x: number, y: number): number | null {
  const cx = x + 0.5;
  const cy = y + 0.5;
  const d = Math.hypot(cx - STARGATE.x, cy - STARGATE.y);
  if (d <= STARGATE.r) {
    if (x === Math.floor(GATE_RING.x) && (y === Math.floor(GATE_RING.y - 2.5) || y === Math.floor(GATE_RING.y + 2.5))) return Tile.GATE;
    return Tile.PLAZA;
  }
  // A short path from the south road to the plaza.
  if (Math.abs(cy - STARGATE.y) < 1.3 && cx > 1.4 && cx < STARGATE.x - STARGATE.r + 1) return Tile.PATH;
  return null;
}

/** Flatten the plaza; returns null outside its influence. */
export function stargateHeight(x: number, y: number, base: number): number | null {
  const d = Math.hypot(x - STARGATE.x, y - STARGATE.y);
  if (d > STARGATE.r + 5) return null;
  const k = Math.min(1, Math.max(0, (STARGATE.r + 5 - d) / 5));
  return base + (PLAZA_H - base) * k;
}
