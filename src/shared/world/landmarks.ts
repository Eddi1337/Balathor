// Fixed points of interest shared by server spawning and client quest markers.

import { coastRadiusAt, findWalkableNear, type Biome } from "./overworld";

const SECTOR_ANGLE: Partial<Record<Biome, number>> = {
  frost: -Math.PI / 2,
  ember: -Math.PI / 6,
  desert: Math.PI / 6,
  swamp: Math.PI / 2,
  forest: (5 * Math.PI) / 6,
  highlands: (-5 * Math.PI) / 6
};

const cache = new Map<Biome, { x: number; y: number }>();

/** Where each biome's champion lives. */
export function bossSpot(biome: Biome): { x: number; y: number } {
  const hit = cache.get(biome);
  if (hit) return hit;
  let x = 100;
  let y = -100; // King Wobble lounges in the fields north-east of the city.
  const a = SECTOR_ANGLE[biome];
  if (a !== undefined) {
    const r = coastRadiusAt(a) * 0.62;
    x = Math.cos(a) * r;
    y = Math.sin(a) * r;
  }
  const spot = findWalkableNear(x, y, 16);
  cache.set(biome, spot);
  return spot;
}
