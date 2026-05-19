"use strict";

/**
 * Sci-fi orbital sector world definitions.
 *
 * `world.js` imports this module as the sci-fi plane data source. Keeping this
 * separate prevents station, asteroid, and defense data from being authored as
 * part of the fantasy terrain file.
 */

const SCI_FI_SECTOR = Object.freeze({
  xMin: 1500,
  xMax: 2340,
  yMin: -560,
  yMax: 560
});

const SCI_FI_STATION_CENTER = Object.freeze({ x: 1920, y: 0 });
const SCI_FI_SAFE_RADIUS = 34;

const SCI_FI_DEFENSES = Object.freeze([
  { id: "ringforge_turret_n", kind: "defense-turret", name: "North Defense Turret", x: SCI_FI_STATION_CENTER.x, y: SCI_FI_STATION_CENTER.y - 43, range: 104 },
  { id: "ringforge_turret_e", kind: "defense-turret", name: "East Defense Turret", x: SCI_FI_STATION_CENTER.x + 48, y: SCI_FI_STATION_CENTER.y, range: 104 },
  { id: "ringforge_turret_s", kind: "defense-turret", name: "South Defense Turret", x: SCI_FI_STATION_CENTER.x, y: SCI_FI_STATION_CENTER.y + 43, range: 104 },
  { id: "ringforge_turret_w", kind: "defense-turret", name: "West Defense Turret", x: SCI_FI_STATION_CENTER.x - 48, y: SCI_FI_STATION_CENTER.y, range: 104 },
  { id: "ringforge_cannon_alpha", kind: "orbital-cannon", name: "Orbital Cannon Alpha", x: SCI_FI_STATION_CENTER.x - 45, y: SCI_FI_STATION_CENTER.y - 38, range: 146 },
  { id: "ringforge_cannon_beta", kind: "orbital-cannon", name: "Orbital Cannon Beta", x: SCI_FI_STATION_CENTER.x + 45, y: SCI_FI_STATION_CENTER.y + 38, range: 146 }
]);

const SCI_FI_ASTEROIDS = Object.freeze([
  // Original belts (slightly denser)
  { id: "asteroid_belt_north",       x: 1820, y: -260, radius: 20, density: 20, seed: 3201 },
  { id: "asteroid_belt_south",       x: 1990, y:  290, radius: 24, density: 24, seed: 4117 },
  { id: "asteroid_belt_east_outer",  x: 2280, y:  -90, radius: 18, density: 18, seed: 5293 },
  { id: "asteroid_belt_west_outer",  x: 1620, y:   90, radius: 22, density: 22, seed: 6418 },
  { id: "asteroid_belt_far_north",   x: 1740, y: -450, radius: 16, density: 15, seed: 7102 },
  // New clusters filling the sector
  { id: "asteroid_belt_mid_east",    x: 2140, y: -175, radius: 21, density: 20, seed: 8213 },
  { id: "asteroid_belt_deep_south",  x: 1870, y:  460, radius: 18, density: 16, seed: 9347 },
  { id: "asteroid_belt_far_west",    x: 1540, y: -310, radius: 16, density: 14, seed: 10521 },
  { id: "asteroid_belt_central",     x: 2030, y:  -80, radius: 13, density: 12, seed: 11604 },
  { id: "asteroid_belt_northeast",   x: 2290, y: -370, radius: 20, density: 18, seed: 12718 },
  { id: "asteroid_belt_southwest",   x: 1680, y:  420, radius: 17, density: 16, seed: 13892 },
  { id: "asteroid_belt_far_east",    x: 2315, y:  400, radius: 19, density: 17, seed: 14956 },
  { id: "asteroid_belt_corridor",    x: 2060, y:  180, radius: 15, density: 14, seed: 15033 },
  { id: "asteroid_belt_rim_north",   x: 1920, y: -510, radius: 17, density: 15, seed: 16210 },
  { id: "asteroid_belt_scatter_w",   x: 1570, y: -490, radius: 14, density: 12, seed: 17388 },
  { id: "asteroid_belt_scatter_e",   x: 2200, y:  360, radius: 16, density: 14, seed: 18471 },
  { id: "asteroid_battle_shards",    x: 2028, y: -286, radius: 24, density: 24, seed: 19544 },
  { id: "asteroid_distress_debris",  x: 1748, y: -322, radius: 18, density: 18, seed: 20631 },
  { id: "asteroid_derelict_drift",   x: 2128, y:  318, radius: 20, density: 20, seed: 21702 },
  { id: "asteroid_outer_crossfire",  x: 2248, y: -292, radius: 21, density: 18, seed: 22849 },
]);

function getAsteroidRocks(cluster, hash2) {
  const rocks = [];
  const count = Math.max(4, Number(cluster.density) || 10);
  for (let i = 0; i < count; i += 1) {
    const a = hash2(cluster.seed, i, 17) * Math.PI * 2;
    const r = Math.sqrt(hash2(cluster.seed, i, 29)) * cluster.radius;
    const size = 0.9 + hash2(cluster.seed, i, 43) * 1.6;
    rocks.push({
      x: cluster.x + Math.cos(a) * r,
      y: cluster.y + Math.sin(a) * r,
      radius: size
    });
  }
  return rocks;
}

function getSciFiAsteroids() {
  return SCI_FI_ASTEROIDS;
}

function isInsideSciFiSafeZone(x, y) {
  const dx = x - SCI_FI_STATION_CENTER.x;
  const dy = y - SCI_FI_STATION_CENTER.y;
  return dx * dx + dy * dy <= SCI_FI_SAFE_RADIUS * SCI_FI_SAFE_RADIUS;
}

function isBlockedByAsteroid(x, y, radius, hash2) {
  for (const cluster of SCI_FI_ASTEROIDS) {
    const dx = x - cluster.x;
    const dy = y - cluster.y;
    const reach = cluster.radius + radius + 1;
    if (dx * dx + dy * dy > reach * reach) continue;
    for (const rock of getAsteroidRocks(cluster, hash2)) {
      const rdx = x - rock.x;
      const rdy = y - rock.y;
      const ar = rock.radius + radius;
      if (rdx * rdx + rdy * rdy < ar * ar) return true;
    }
  }
  return false;
}

module.exports = {
  SCI_FI_SECTOR,
  SCI_FI_STATION_CENTER,
  SCI_FI_SAFE_RADIUS,
  SCI_FI_DEFENSES,
  SCI_FI_ASTEROIDS,
  getAsteroidRocks,
  getSciFiAsteroids,
  isInsideSciFiSafeZone,
  isBlockedByAsteroid
};
