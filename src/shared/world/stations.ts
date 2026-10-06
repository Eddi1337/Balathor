// Crafting stations: a campfire and forge in the market, plus cosy campfires by the road obelisks.

import { doorFront } from "./city";
import { findWalkableNear } from "./overworld";
import { WAYPOINTS } from "../game/waypoints";
import type { Station } from "../game/professions";

function near(x: number, y: number): { x: number; y: number } {
  return findWalkableNear(x, y, 6);
}

const tackle = doorFront("tackle", 3.2);
const smithy = doorFront("smithy", 3.2);

export const STATIONS: Station[] = [
  { id: "campfire_market", kind: "campfire", name: "Market Campfire", ...near(tackle.x - 2.5, tackle.y + 0.5) },
  { id: "forge_market", kind: "forge", name: "Anvil & Ember Forge", ...near(smithy.x + 2.5, smithy.y + 0.5) },
  ...WAYPOINTS.filter((w) => w.id.endsWith("_road")).map((w) => ({ id: `campfire_${w.id}`, kind: "campfire" as const, name: `${w.name} Campfire`, ...near(w.x + 3.5, w.y + 3.5) }))
];

export function stationNear(x: number, y: number, range: number): Station | null {
  let best: Station | null = null;
  let bestD = range;
  for (const s of STATIONS) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d <= bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}
