// Waypoint obelisks. Walk near one to attune; then travel between attuned obelisks for a fee.

import { findWalkableNear } from "../world/overworld";

export interface Waypoint {
  id: string;
  name: string;
  x: number;
  y: number;
}

export const WAYPOINT_DISCOVER_RADIUS = 5;
export const WAYPOINT_USE_RADIUS = 3.2;
export const WAYPOINT_COST = 12;

function place(id: string, name: string, x: number, y: number): Waypoint {
  // Obelisks stand beside the road, never on a tree or in water.
  const spot = findWalkableNear(x, y, 8);
  return { id, name, x: spot.x, y: spot.y };
}

export const WAYPOINTS: Waypoint[] = [
  place("wp_hearthmoor", "Hearthmoor Plaza", -4.5, 5.5),
  place("wp_north_road", "Frostwatch Road", 5, -118),
  place("wp_north_end", "Whitepine Hollow", 5, -215),
  place("wp_east_road", "Dune Gate", 118, 5),
  place("wp_east_end", "Glasshide Flats", 215, 5),
  place("wp_south_road", "Mirewater Crossing", 5, 118),
  place("wp_south_end", "Bogfather's Mire", 5, 215),
  place("wp_west_road", "Highland Steps", -118, 5),
  place("wp_west_end", "Scarcliff", -215, 5)
];

export function waypointById(id: string): Waypoint | undefined {
  return WAYPOINTS.find((w) => w.id === id);
}
