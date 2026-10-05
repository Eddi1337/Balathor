// Movement + collision shared by the server simulation and client-side prediction, so both
// sides integrate the same input the same way.

import { isBlockingTile, Tile } from "../world/tiles";
import { SWIM_SPEED_MULT } from "./stats";

export const PLAYER_RADIUS = 0.3;

export interface TileSource {
  tileAt(x: number, y: number): number;
}

export function circleBlocked(src: TileSource, x: number, y: number, r = PLAYER_RADIUS): boolean {
  return (
    isBlockingTile(src.tileAt(x - r, y - r)) ||
    isBlockingTile(src.tileAt(x + r, y - r)) ||
    isBlockingTile(src.tileAt(x - r, y + r)) ||
    isBlockingTile(src.tileAt(x + r, y + r))
  );
}

export function isSwimming(src: TileSource, x: number, y: number): boolean {
  return src.tileAt(x, y) === Tile.SHALLOW;
}

/**
 * Integrate one movement step. (mx, my) is the desired direction (any length ≤ 1 is
 * honoured; longer is normalised). Slides along walls by resolving each axis separately.
 */
export function stepMovement(
  src: TileSource,
  pos: { x: number; y: number },
  mx: number,
  my: number,
  speed: number,
  dt: number
): boolean {
  const len = Math.hypot(mx, my);
  if (len < 0.01) return false;
  const scale = len > 1 ? 1 / len : 1;
  const swim = isSwimming(src, pos.x, pos.y) ? SWIM_SPEED_MULT : 1;
  // Sub-step so fast movers never skip a 1-tile wall.
  const total = speed * swim * dt;
  const steps = Math.max(1, Math.ceil(total / 0.25));
  const sx = (mx * scale * total) / steps;
  const sy = (my * scale * total) / steps;
  let moved = false;
  for (let i = 0; i < steps; i += 1) {
    const nx = pos.x + sx;
    if (!circleBlocked(src, nx, pos.y)) {
      pos.x = nx;
      moved = true;
    }
    const ny = pos.y + sy;
    if (!circleBlocked(src, pos.x, ny)) {
      pos.y = ny;
      moved = true;
    }
  }
  return moved;
}
