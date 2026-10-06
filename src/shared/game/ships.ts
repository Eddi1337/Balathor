// Ships: hull classes, upgrades, derived stats and the flight model. The flight model is shared
// so the client predicts exactly what the server simulates: the ship turns toward the stick
// direction and thrusts along its nose, with a little drift.

import { circleBlocked, type TileSource } from "./movement";

export type HullId = "skiff" | "corvette" | "hauler" | "frigate";
export const HULL_IDS: HullId[] = ["skiff", "corvette", "hauler", "frigate"];

export interface Hull {
  id: HullId;
  name: string;
  price: number;
  blurb: string;
  hull: number;
  shield: number;
  speed: number;
  accel: number;
  turn: number;
  dmg: number;
  fireMs: number;
  /** Parallel guns per volley. */
  guns: number;
  /** Auto-firing drone turrets. */
  turrets: number;
  /** Bonus to asteroid damage (mining lasers). */
  mining: number;
  color: string;
  accent: string;
  /** Model length (tiles). */
  size: number;
}

export const HULLS: Record<HullId, Hull> = {
  skiff: { id: "skiff", name: "Bumblebee Skiff", price: 0, blurb: "A plucky little starter ship. Station Master Orla hands one to every new pilot.", hull: 160, shield: 70, speed: 13, accel: 20, turn: 3.2, dmg: 13, fireMs: 380, guns: 1, turrets: 0, mining: 0, color: "#ffd166", accent: "#3b2f4a", size: 2.2 },
  corvette: { id: "corvette", name: "Comet Corvette", price: 2400, blurb: "Fast twin-gunned fighter for hunting pirates.", hull: 280, shield: 150, speed: 16, accel: 24, turn: 3.0, dmg: 15, fireMs: 320, guns: 2, turrets: 0, mining: 0, color: "#ff8fb1", accent: "#ffffff", size: 2.8 },
  hauler: { id: "hauler", name: "Puffin Hauler", price: 3200, blurb: "Chunky, tough and slow. Its mining lasers chew through asteroids.", hull: 520, shield: 130, speed: 11, accel: 14, turn: 2.1, dmg: 15, fireMs: 420, guns: 1, turrets: 0, mining: 1.0, color: "#7fc8ff", accent: "#ffd166", size: 3.4 },
  frigate: { id: "frigate", name: "Starling Frigate", price: 7800, blurb: "A flagship with two drone turrets that shoot whatever you're fighting.", hull: 680, shield: 320, speed: 12.5, accel: 16, turn: 2.3, dmg: 22, fireMs: 360, guns: 2, turrets: 2, mining: 0.3, color: "#b9a3ff", accent: "#ffffff", size: 4.2 }
};

export type UpgradeSlot = "engine" | "shield" | "weapon" | "armor";
export const UPGRADE_SLOTS: UpgradeSlot[] = ["engine", "shield", "weapon", "armor"];
export const UPGRADE_INFO: Record<UpgradeSlot, { name: string; icon: string; per: string }> = {
  engine: { name: "Engines", icon: "🚀", per: "+8% speed & thrust" },
  shield: { name: "Shield Emitters", icon: "🛡️", per: "+20% shields, faster recharge" },
  weapon: { name: "Laser Banks", icon: "🔫", per: "+15% laser damage" },
  armor: { name: "Hull Plating", icon: "🔩", per: "+20% hull" }
};
export const UPGRADE_PRICES = [600, 1500, 3600];
export const MAX_UPGRADE = 3;

export type ShipUpgrades = Record<UpgradeSlot, number>;
export function freshUpgrades(): ShipUpgrades {
  return { engine: 0, shield: 0, weapon: 0, armor: 0 };
}

export interface ShipStats {
  hull: HullId;
  maxHull: number;
  maxShield: number;
  speed: number;
  accel: number;
  turn: number;
  dmg: number;
  fireMs: number;
  guns: number;
  turrets: number;
  mining: number;
  /** Shield recharge per second once out of combat. */
  shieldRegen: number;
}

/** Ship stats for a hull, its upgrades and the pilot's level. */
export function shipStats(hullId: HullId, up: ShipUpgrades, level: number): ShipStats {
  const h = HULLS[hullId] ?? HULLS.skiff;
  const lv = Math.max(1, level);
  const maxShield = Math.round(h.shield * (1 + up.shield * 0.2) * (1 + (lv - 1) * 0.04));
  return {
    hull: h.id,
    maxHull: Math.round(h.hull * (1 + up.armor * 0.2) * (1 + (lv - 1) * 0.05)),
    maxShield,
    speed: h.speed * (1 + up.engine * 0.08),
    accel: h.accel * (1 + up.engine * 0.08),
    turn: h.turn,
    dmg: h.dmg * (1 + up.weapon * 0.15) * (1 + (lv - 1) * 0.07),
    fireMs: h.fireMs,
    guns: h.guns,
    turrets: h.turrets,
    mining: h.mining,
    shieldRegen: maxShield * (0.08 + up.shield * 0.02)
  };
}

export const SHIP_RADIUS = 0.9;
export const BOOST_MULT = 1.8;
export const BOOST_MS = 1800;
export const BOOST_COOLDOWN_MS = 7000;
export const WARP_CHARGE_MS = 2600;
export const LASER_SPEED = 34;
export const LASER_RANGE = 26;

export interface ShipBody {
  x: number;
  y: number;
  f: number;
  vx: number;
  vy: number;
}

function wrap(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Advance a ship one step. (mx, my) is the desired direction (length ≤ 1 is throttle); the ship
 * turns toward it, thrusts along its nose and coasts with drag. Returns whether it moved.
 */
export function stepShip(src: TileSource, s: ShipBody, mx: number, my: number, stats: Pick<ShipStats, "speed" | "accel" | "turn">, boost: boolean, dt: number): boolean {
  const throttle = Math.min(1, Math.hypot(mx, my));
  if (throttle > 0.05) {
    const want = Math.atan2(my, mx);
    const delta = wrap(want - s.f);
    const maxTurn = stats.turn * dt;
    s.f = wrap(s.f + Math.max(-maxTurn, Math.min(maxTurn, delta)));
    const align = Math.max(0, Math.cos(delta));
    const thrust = stats.accel * throttle * (0.25 + 0.75 * align) * (boost ? BOOST_MULT : 1);
    s.vx += Math.cos(s.f) * thrust * dt;
    s.vy += Math.sin(s.f) * thrust * dt;
  }
  // Drag: firm when coasting, light while thrusting (so top speed ≈ speed).
  const drag = throttle > 0.05 ? 1.2 : 1.8;
  const k = Math.max(0, 1 - drag * dt);
  s.vx *= k;
  s.vy *= k;
  const cap = stats.speed * (boost ? BOOST_MULT : 1);
  const v = Math.hypot(s.vx, s.vy);
  if (v > cap) {
    s.vx *= cap / v;
    s.vy *= cap / v;
  }
  if (v < 0.02) {
    s.vx = 0;
    s.vy = 0;
    return false;
  }
  const nx = s.x + s.vx * dt;
  const ny = s.y + s.vy * dt;
  if (!circleBlocked(src, nx, ny, SHIP_RADIUS)) {
    s.x = nx;
    s.y = ny;
  } else {
    // Bounce off the forcefield.
    s.vx *= -0.4;
    s.vy *= -0.4;
  }
  return true;
}
