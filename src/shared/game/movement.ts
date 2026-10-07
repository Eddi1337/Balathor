// Movement + collision shared by the server simulation and client-side prediction, so both
// sides integrate the same input the same way.

import { isBlockingTile, isSwimTile } from "../world/tiles";
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
  return isSwimTile(src.tileAt(x, y));
}

/**
 * Let a river's current carry an entity downstream (no-op on dry land). Shared so the client's
 * prediction drifts exactly like the server does.
 */
export function applyCurrent(src: TileSource & { currentAt?: (x: number, y: number) => { vx: number; vy: number } }, pos: { x: number; y: number }, dt: number): boolean {
  if (!src.currentAt) return false;
  const c = src.currentAt(pos.x, pos.y);
  const speed = Math.hypot(c.vx, c.vy);
  if (speed < 0.01) return false;
  const steps = Math.max(1, Math.ceil((speed * dt) / 0.25));
  const sx = (c.vx * dt) / steps;
  const sy = (c.vy * dt) / steps;
  let moved = false;
  for (let i = 0; i < steps; i += 1) {
    if (!circleBlocked(src, pos.x + sx, pos.y)) {
      pos.x += sx;
      moved = true;
    }
    if (!circleBlocked(src, pos.x, pos.y + sy)) {
      pos.y += sy;
      moved = true;
    }
  }
  return moved;
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

/** God-mode flight: straight through walls, water and everything else. */
export function stepFly(pos: { x: number; y: number }, mx: number, my: number, speed: number, dt: number): boolean {
  const len = Math.hypot(mx, my);
  if (len < 0.01) return false;
  const k = (Math.min(1, len) / len) * speed * dt;
  pos.x += mx * k;
  pos.y += my * k;
  return true;
}
