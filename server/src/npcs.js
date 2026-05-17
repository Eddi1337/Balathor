const WORLD = require("./world");
const { isBlockedCircle, isBlockedCircleForShip } = WORLD;
const { HUB_NPC_ORDER } = require("./hubRoundTown.js");
const { SCI_FI_DOCK_PORTS, SCI_FI_STATION_FEATURES, RINGFORGE_CENTER } = require("./sciFiStationLayout.js");

const NPC_SPEED = 2.0;
const NPC_STOP_DISTANCE = 0.08;
const NPC_STUCK_EPSILON = 0.001;
const NPC_PATROL_TARGET_ATTEMPTS = 8;
const MOVE_INTERVAL_MIN = 3000;
const MOVE_INTERVAL_MAX = 9000;
/** Hub road followers re-pick destinations often so the town stays visually busy (non-scheduled NPCs). */
const HUB_PATH_MOVE_INTERVAL_MIN = 420;
const HUB_PATH_MOVE_INTERVAL_MAX = 1100;
/** Breadth-first search cap for hub road paths (one rebuild per new goal / drift). */
const HUB_NAV_PATH_BFS_CAP = 4500;
const HUB_NAV_TILE_ARRIVE = 0.11;

/** Hub villager routine: doorstep -> commute into town -> stroll waypoints -> mingle -> walk home -> repeat */
const SCHED_HOME   = "home";
const SCHED_TO_TOWN = "to_town";
const SCHED_TOWN   = "town";
const SCHED_RETURN = "return";
/** Kept as the wire/debug value, but night now means quiet local patrol instead of standing asleep. */
const SCHED_SLEEP  = "sleep";
const SCHED_PUB    = "pub";

/** Game clock — 1 full day per 10 real minutes (0.04 game-hours per real second). */
let hubGameHour = 8.0;
const GAME_HOURS_PER_SEC = 24 / 600;

/** Pub / inn anchor in the north-village area. */
const HUB_PUB_X      = 11;
const HUB_PUB_Y      = -65;
const HUB_PUB_RADIUS = 12;

function isNightHour(h) { return h < 6 || h >= 22; }
function isPubHour(h)   { return h >= 18 && h < 22; }

function hubScheduleEligible(npc) {
  return npc._followHubPaths && !npc.isTrader && !npc.isGuard && !soldCompanionNpcIds.has(npc.id);
}

function hubScheduleEnsureInit(npc, now = Date.now()) {
  if (!hubScheduleEligible(npc)) {
    return;
  }
  if (!npc._schedPhase) {
    npc._schedPhase = SCHED_HOME;
    npc._schedUntil = now + 200 + ((npcIdHashSeed(`${String(npc.id)}|init`) >>> 0) % 800);
    npc._schedRoamGoal = 0;
    npc._schedDoneRoam = 0;
    npc._schedMingleUntil = 0;
  }
}

function assignScheduleNavTarget(npc, pt, navSet, ts = Date.now()) {
  if (!pt || !navSet || !hubScheduleEligible(npc)) {
    return false;
  }
  let tx = pt.tx ?? pt.x;
  let ty = pt.ty ?? pt.y;
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
    return false;
  }
  const k = hubTileKey(tx, ty);
  if (!navSet.has(k)) {
    const nt = nearestHubNavTile(tx, ty, navSet);
    if (!nt) {
      return false;
    }
    tx = nt.tx + 0.5;
    ty = nt.ty + 0.5;
  }
  if (isBlockedCircle(tx, ty)) {
    return false;
  }
  npc._targetX = tx;
  npc._targetY = ty;
  invalidateNpcHubRoadPath(npc);
  /** Leg completion: only count a town roam leg after real travel or a dwell timeout (see hubScheduleAdvance). */
  npc._schedLegStartAt = ts;
  npc._schedLegAnchorX = npc.x;
  npc._schedLegAnchorY = npc.y;
  npc._schedLegMoved = false;
  return true;
}

function pickCommuteTowardPlaza(npc, navSet) {
  if (!(navSet instanceof Set) || navSet.size < 48) {
    return null;
  }
  const bubble = Number(WORLD.HUB_TOWN_GRASS_RADIUS) || 132;
  const ax = Number(WORLD.START_SPAWN?.x) || 0;
  const ay = Number(WORLD.START_SPAWN?.y) || 0;
  const jx = ((npcIdHashSeed(`${String(npc.id)}|cmx`) >>> 0) % 31) / 19 - 0.82;
  const jy = ((npcIdHashSeed(`${String(npc.id)}|cmy`) >>> 0) % 31) / 19 - 0.82;
  let px = npc.homeX * 0.3 + ax * 0.7 + jx;
  let py = npc.homeY * 0.3 + ay * 0.7 + jy;
  const dCtr = Math.hypot(px - ax, py - ay);
  if (dCtr > bubble - 20) {
    const s = (bubble - 22) / Math.max(dCtr, 0.01);
    px = ax + (px - ax) * s;
    py = ay + (py - ay) * s;
  }
  const nt = nearestHubNavTile(px, py, navSet);
  return nt ? { tx: nt.tx + 0.5, ty: nt.ty + 0.5 } : null;
}

function pickTownRoamWaypointForSchedule(npc, navSet) {
  const savedHx = npc.homeX;
  const savedHy = npc.homeY;
  const savedR = npc.patrolRadius;
  const savedSalt = npc._hubWalkSalt;
  const sx = Number(WORLD.START_SPAWN?.x) || 0;
  const sy = Number(WORLD.START_SPAWN?.y) || 0;
  npc.homeX = (savedHx + sx) / 2;
  npc.homeY = (savedHy + sy) / 2;
  npc.patrolRadius = Math.min(savedR + 28, Number(WORLD.HUB_TOWN_GRASS_RADIUS) || 132);
  let p = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    p = sampleHubPatrolWaypoint(npc, navSet);
    if (!p) {
      break;
    }
    const d = Math.hypot((p.tx ?? 0) - npc.x, (p.ty ?? 0) - npc.y);
    if (d >= 0.42) {
      break;
    }
    npc._hubWalkSalt = (((npc._hubWalkSalt ?? 0) + 1300021) >>> 0) >>> 0;
  }
  npc.homeX = savedHx;
  npc.homeY = savedHy;
  npc.patrolRadius = savedR;
  npc._hubWalkSalt = savedSalt;
  if (!p) {
    p = sampleHubPatrolWaypoint(npc, navSet);
  }
  return p;
}

function pickNightRoamWaypoint(npc, navSet) {
  const savedR = npc.patrolRadius;
  npc.patrolRadius = Math.max(savedR, 5);
  let p = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    p = sampleHubPatrolWaypoint(npc, navSet);
    if (!p) {
      break;
    }
    const d = Math.hypot((p.tx ?? 0) - npc.x, (p.ty ?? 0) - npc.y);
    if (d >= 0.55) {
      break;
    }
    npc._hubWalkSalt = (((npc._hubWalkSalt ?? 0) + 424243) >>> 0) >>> 0;
  }
  npc.patrolRadius = savedR;
  return p;
}

function pickHomeNavTarget(npc, navSet) {
  if (!(navSet instanceof Set)) {
    return null;
  }
  const nt = nearestHubNavTile(npc.homeX + 0.02, npc.homeY + 0.12, navSet);
  return nt ? { tx: nt.tx + 0.5, ty: nt.ty + 0.5 } : null;
}

function pickPubWaypoint(npc, navSet) {
  const salt = (npcIdHashSeed(`${String(npc.id)}|pub${(hubGameHour * 2) | 0}`) >>> 0);
  const jx = ((salt % 41) / 41 - 0.5) * HUB_PUB_RADIUS * 2;
  const jy = (((salt >>> 11) % 41) / 41 - 0.5) * HUB_PUB_RADIUS * 2;
  const tx = HUB_PUB_X + jx;
  const ty = HUB_PUB_Y + jy;
  if (navSet instanceof Set) {
    const nt = nearestHubNavTile(tx, ty, navSet);
    if (nt) return { tx: nt.tx + 0.5, ty: nt.ty + 0.5 };
  }
  return { tx, ty };
}

/**
 * Advance the daily routine when the NPC has reached its current waypoint.
 * Time-of-day aware: night=quiet local patrol, 18-22=pub, daytime=street roam.
 */
function hubScheduleAdvance(npc, now, navSet) {
  if (!navSet || navSet.size < 96 || !hubScheduleEligible(npc)) {
    return;
  }
  hubScheduleEnsureInit(npc, now);

  const h = hubGameHour;

  // ---- Night (22-06): keep the town alive with quieter patrols near home. ----
  if (isNightHour(h)) {
    if (npc._schedPhase !== SCHED_SLEEP) {
      npc._schedPhase = SCHED_SLEEP;
      npc._schedUntil = 0;
      npc._schedMingleUntil = 0;
    }
    if (now >= npc._schedUntil) {
      const pt = pickNightRoamWaypoint(npc, navSet) || pickHomeNavTarget(npc, navSet);
      if (assignScheduleNavTarget(npc, pt, navSet, now)) {
        npc._schedUntil =
          now +
          250 +
          (((npcIdHashSeed(`${String(npc.id)}|nt${now >>> 11}`) >>> 0) % 650));
      } else {
        npc._schedUntil = now + 400;
      }
    }
    return;
  }

  // ---- Pub hours (18-22, non-guard): roam the pub area ----
  if (isPubHour(h) && !npc.isGuard) {
    if (npc._schedPhase !== SCHED_PUB) {
      npc._schedPhase = SCHED_PUB;
      npc._schedUntil = 0;
    }
    if (now >= npc._schedUntil) {
      const pt = pickPubWaypoint(npc, navSet);
      if (assignScheduleNavTarget(npc, pt, navSet, now)) {
        npc._schedUntil = now + 3000 + (((npcIdHashSeed(`${String(npc.id)}|pt${now >>> 12}`) >>> 0) % 5000));
      } else {
        npc._schedUntil = now + 400;
      }
    }
    return;
  }

  // ---- Daytime: reset from sleep/pub ----
  if (npc._schedPhase === SCHED_SLEEP || npc._schedPhase === SCHED_PUB) {
    npc._schedPhase = SCHED_HOME;
    npc._schedUntil = now;
    npc._schedDoneRoam = 0;
    npc._schedMingleUntil = 0;
  }

  // ---- SCHED_HOME: brief doorstep pause then commute ----
  if (npc._schedPhase === SCHED_HOME) {
    if (now < npc._schedUntil) {
      return;
    }
    npc._schedPhase = SCHED_TO_TOWN;
    npc._schedRoamGoal = 3 + ((npcIdHashSeed(`${String(npc.id)}|rg`) >>> 0) % 5);
    npc._schedDoneRoam = 0;
    npc._schedMingleUntil = 0;
    const wp = pickCommuteTowardPlaza(npc, navSet);
    if (!assignScheduleNavTarget(npc, wp, navSet, now)) {
      npc._schedPhase = SCHED_HOME;
      npc._schedUntil = now + 150;
    }
    return;
  }

  // ---- SCHED_TO_TOWN: reached commute waypoint, begin town roam ----
  if (npc._schedPhase === SCHED_TO_TOWN) {
    npc._schedPhase = SCHED_TOWN;
    npc._schedDoneRoam = 0;
    npc._schedMingleUntil = 0;
    const wp = pickTownRoamWaypointForSchedule(npc, navSet);
    if (!assignScheduleNavTarget(npc, wp, navSet, now)) {
      npc._schedUntil = now + 150;
      return;
    }
    npc._schedUntil = 0;
    return;
  }

  // ---- SCHED_TOWN: roam 3-7 waypoints, short mingle, then return ----
  if (npc._schedPhase === SCHED_TOWN) {
    if (npc._schedMingleUntil > 0) {
      if (now < npc._schedMingleUntil) {
        return;
      }
      npc._schedMingleUntil = 0;
      npc._schedPhase = SCHED_RETURN;
      assignScheduleNavTarget(npc, pickHomeNavTarget(npc, navSet), navSet, now);
      npc._schedUntil = 0;
      return;
    }
    if (npc._schedUntil && now < npc._schedUntil) {
      return;
    }

    // Reduced: 800 ms instead of 3400 ms before counting a stationary leg as done
    const legAge = now - (npc._schedLegStartAt ?? now);
    if (!npc._schedLegMoved && legAge < 800) {
      return;
    }

    npc._schedDoneRoam += 1;
    if (npc._schedDoneRoam < npc._schedRoamGoal) {
      const wp = pickTownRoamWaypointForSchedule(npc, navSet);
      if (!assignScheduleNavTarget(npc, wp, navSet, now)) {
        npc._schedDoneRoam -= 1;
        npc._schedUntil = now + 150;
      } else {
        npc._schedUntil = now + 50;
      }
      return;
    }

    npc._schedMingleUntil = now + 500 + (((npcIdHashSeed(`${String(npc.id)}|mg`) >>> 0) % 1000));
    npc._schedUntil = 0;
    npc._schedLegStartAt = undefined;
    return;
  }

  // ---- SCHED_RETURN: heading home, then immediately restart ----
  if (npc._schedPhase === SCHED_RETURN) {
    npc._schedPhase = SCHED_HOME;
    npc._schedUntil = now + 50;
    assignScheduleNavTarget(npc, pickHomeNavTarget(npc, navSet), navSet, now);
    return;
  }

  npc._schedPhase = SCHED_HOME;
  npc._schedUntil = now + 50;
}
/** Standoff spot in front of hub market stalls (patrons mingle here). */
const HUB_MARKET_BROWSE_WAYPOINTS = [];
const CHAT_INTERVAL_MIN = 28000;
const CHAT_INTERVAL_MAX = 70000;

const HUB_POPULATION_TARGET = 100;
const CLASSES_ROT = ["knight", "ranger", "mage"];

/** Cached tile centres for procedural hub walkers */
let _hubNavAnchorsCache = [];

function rebuildHubNavAnchors(navKeys) {
  _hubNavAnchorsCache = [];
  if (!(navKeys instanceof Set) || navKeys.size < 48) return;
  for (const k of navKeys) {
    const [tx, ty] = k.split(",").map(Number);
    _hubNavAnchorsCache.push({ cx: tx + 0.5, cy: ty + 0.5 });
  }
}

function refreshHubBrowseWaypointsFromRoadsides(list) {
  HUB_MARKET_BROWSE_WAYPOINTS.length = 0;
  if (!list || !Array.isArray(list)) {
    return;
  }
  for (const f of list) {
    if (!f || f.kind !== "market_stand") continue;
    const fw = Math.max(1, Math.floor(Number(f.footprintW) || 1));
    HUB_MARKET_BROWSE_WAYPOINTS.push({
      tx: f.x + fw / 2,
      ty: f.y + 0.62
    });
  }
}

refreshHubBrowseWaypointsFromRoadsides(WORLD.HUB_ROADSIDE_FEATURES);

function npcIdHashSeed(idStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < idStr.length; i += 1) {
    h ^= idStr.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function hubTileKey(xf, yf) {
  return `${Math.floor(xf)},${Math.floor(yf)}`;
}

/** Expand rings from (floor x, floor y) until a hub road tile is found. */
function nearestHubNavTile(wx, wy, navSet, maxR = 24) {
  if (!(navSet instanceof Set) || navSet.size < 48) {
    return null;
  }
  const tx0 = Math.floor(wx);
  const ty0 = Math.floor(wy);
  if (navSet.has(`${tx0},${ty0}`)) {
    return { tx: tx0, ty: ty0 };
  }
  for (let r = 1; r <= maxR; r += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      for (const dy of [-r, r]) {
        const tx = tx0 + dx;
        const ty = ty0 + dy;
        const kk = `${tx},${ty}`;
        if (navSet.has(kk)) {
          return { tx, ty };
        }
      }
    }
    for (let dy = -r + 1; dy <= r - 1; dy += 1) {
      for (const dx of [-r, r]) {
        const tx = tx0 + dx;
        const ty = ty0 + dy;
        const kk = `${tx},${ty}`;
        if (navSet.has(kk)) {
          return { tx, ty };
        }
      }
    }
  }
  return null;
}

/**
 * Road-following NPCs must stand on the nav mesh; tiny door offsets or failed
 * steering can leave the floored tile off-path, and small steps then never
 * change tile — snap once onto the nearest road cell.
 */
function snapNpcOntoHubNavIfNeeded(npc, navSet) {
  if (!(navSet instanceof Set) || navSet.size < 48 || !npc._followHubPaths) {
    return;
  }
  if (soldCompanionNpcIds.has(npc.id)) {
    return;
  }
  if (navSet.has(hubTileKey(npc.x, npc.y))) {
    return;
  }
  const hit = nearestHubNavTile(npc.x, npc.y, navSet);
  if (!hit) {
    return;
  }
  npc.x = hit.tx + 0.5;
  npc.y = hit.ty + 0.5;
  npc._hubPathGoalKey = null;
  npc._hubTilePath = null;
  /**
   * Never overwrite the locomotion goal here. A one-frame float / tile-boundary
   * read can look “off mesh” while the NPC is legitimately walking; resetting
   * _target to the current tile cancels patrol and they stand still until
   * _nextMoveAt (seconds of apparent freeze).
   */
  npc.moving = false;
}

function hubNavTileAtWorld(wx, wy, navSet) {
  if (!(navSet instanceof Set) || navSet.size < 48) {
    return null;
  }
  const tx = Math.floor(wx);
  const ty = Math.floor(wy);
  if (navSet.has(`${tx},${ty}`)) {
    return { tx, ty };
  }
  return nearestHubNavTile(wx, wy, navSet);
}

function invalidateNpcHubRoadPath(npc) {
  npc._hubPathGoalKey = null;
  npc._hubTilePath = null;
}

/**
 * Shortest cardinal path along `HUB_NAV_PATH_KEYS` (road mask). Returns tile centres to visit after the current tile.
 */
function hubNavShortestPath(startTx, startTy, goalTx, goalTy, navSet) {
  const sk = `${startTx},${startTy}`;
  const gk = `${goalTx},${goalTy}`;
  if (!navSet.has(sk) || !navSet.has(gk)) {
    return null;
  }
  if (sk === gk) {
    return [];
  }
  const q = [[startTx, startTy]];
  const prev = new Map([[sk, null]]);
  const neigh = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];
  for (let qi = 0; qi < q.length && prev.size < HUB_NAV_PATH_BFS_CAP; qi += 1) {
    const [x, y] = q[qi];
    for (const [dx, dy] of neigh) {
      const nx = x + dx;
      const ny = y + dy;
      const nk = `${nx},${ny}`;
      if (!navSet.has(nk) || prev.has(nk)) {
        continue;
      }
      prev.set(nk, `${x},${y}`);
      if (nk === gk) {
        const out = [];
        let cur = gk;
        while (cur && cur !== sk) {
          const [cx, cy] = cur.split(",").map(Number);
          out.push({ tx: cx, ty: cy });
          cur = prev.get(cur);
        }
        out.reverse();
        return out;
      }
      q.push([nx, ny]);
    }
  }
  return null;
}

function ensureNpcHubTilePath(npc, navSet) {
  if (!(navSet instanceof Set) || navSet.size < 96) {
    return null;
  }
  const goalTile = hubNavTileAtWorld(npc._targetX, npc._targetY, navSet);
  if (!goalTile) {
    invalidateNpcHubRoadPath(npc);
    return null;
  }
  const goalKey = `${goalTile.tx},${goalTile.ty}`;
  const startTile = hubNavTileAtWorld(npc.x, npc.y, navSet);
  if (!startTile) {
    invalidateNpcHubRoadPath(npc);
    return null;
  }

  let path = npc._hubTilePath;
  const goalMismatch = npc._hubPathGoalKey !== goalKey;
  if (goalMismatch || !Array.isArray(path)) {
    path = hubNavShortestPath(startTile.tx, startTile.ty, goalTile.tx, goalTile.ty, navSet);
    if (!path) {
      invalidateNpcHubRoadPath(npc);
      return null;
    }
    npc._hubPathGoalKey = goalKey;
    npc._hubTilePath = path;
    return path;
  }

  if (path.length > 0) {
    const next = path[0];
    const manh =
      Math.abs(startTile.tx - next.tx) + Math.abs(startTile.ty - next.ty);
    if (manh !== 1) {
      path = hubNavShortestPath(startTile.tx, startTile.ty, goalTile.tx, goalTile.ty, navSet);
      if (!path) {
        invalidateNpcHubRoadPath(npc);
        return null;
      }
      npc._hubTilePath = path;
    }
  }
  return npc._hubTilePath;
}

function stepNpcAlongHubRoadPath(npc, navSet, dt) {
  const step = NPC_SPEED * dt;
  const path = ensureNpcHubTilePath(npc, navSet);
  const goalTile = hubNavTileAtWorld(npc._targetX, npc._targetY, navSet);

  if ((!path || path.length === 0) && goalTile) {
    const st = hubNavTileAtWorld(npc.x, npc.y, navSet);
    const onGoal =
      st &&
      st.tx === goalTile.tx &&
      st.ty === goalTile.ty &&
      Math.hypot(npc._targetX - npc.x, npc._targetY - npc.y) < HUB_NAV_TILE_ARRIVE;
    if (onGoal) {
      return false;
    }
  }

  if (!path || path.length === 0) {
    const dx = npc._targetX - npc.x;
    const dy = npc._targetY - npc.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.06) {
      return false;
    }
    const ux = dx / dist;
    const uy = dy / dist;
    const nx = npc.x + ux * Math.min(step, dist);
    const ny = npc.y + uy * Math.min(step, dist);
    if (!navSet.has(hubTileKey(nx, ny))) {
      invalidateNpcHubRoadPath(npc);
      return false;
    }
    npc.x = nx;
    npc.y = ny;
    npc.facing = Math.atan2(uy, ux);
    npc.moving = true;
    return true;
  }

  const next = path[0];
  const tcx = next.tx + 0.5;
  const tcy = next.ty + 0.5;
  const dx = tcx - npc.x;
  const dy = tcy - npc.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= HUB_NAV_TILE_ARRIVE + step * 0.35) {
    npc.x = tcx;
    npc.y = tcy;
    path.shift();
    npc.facing = Math.atan2(dy, dx);
    npc.moving = true;
    return true;
  }
  const ux = dx / dist;
  const uy = dy / dist;
  const nx = npc.x + ux * Math.min(step, dist);
  const ny = npc.y + uy * Math.min(step, dist);
  if (!navSet.has(hubTileKey(nx, ny))) {
    invalidateNpcHubRoadPath(npc);
    return false;
  }
  npc.x = nx;
  npc.y = ny;
  npc.facing = Math.atan2(uy, ux);
  npc.moving = true;
  return true;
}

function scheduleNpcNextPatrol(npc) {
  const now = Date.now();
  const span =
    npc._followHubPaths
      ? HUB_PATH_MOVE_INTERVAL_MAX - HUB_PATH_MOVE_INTERVAL_MIN
      : MOVE_INTERVAL_MAX - MOVE_INTERVAL_MIN;
  const lo = npc._followHubPaths ? HUB_PATH_MOVE_INTERVAL_MIN : MOVE_INTERVAL_MIN;
  npc._nextMoveAt = now + lo + Math.random() * span;
}

function stopNpcAfterBlockedStep(npc) {
  npc._targetX = npc.x;
  npc._targetY = npc.y;
  npc.moving = false;
  scheduleNpcNextPatrol(npc);
}

/** If an NPC hasn't moved for 3 s, snap to nearest road tile and force a new goal. */
function tickNpcStuckCheck(npc, now, navSet) {
  if (!npc._followHubPaths || !(navSet instanceof Set)) return;
  if (npc._meetPhase === "talk") return;
  if (npc._schedPhase === SCHED_TOWN && (npc._schedMingleUntil || 0) > now) return;

  // First call: seed the baseline — never use ?-chaining here or the timer never starts.
  if (npc._stuckLastX === undefined) {
    npc._stuckLastX = npc.x;
    npc._stuckLastY = npc.y;
    npc._stuckSince = now;
    return;
  }

  const dx = npc.x - npc._stuckLastX;
  const dy = npc.y - npc._stuckLastY;
  if (dx * dx + dy * dy > 0.04) {
    // Moved — reset baseline
    npc._stuckLastX = npc.x;
    npc._stuckLastY = npc.y;
    npc._stuckSince = now;
    return;
  }

  // Hasn't moved at least 0.2 tiles since baseline was set
  if (now - npc._stuckSince > 3000) {
    npc._stuckLastX = npc.x;
    npc._stuckLastY = npc.y;
    npc._stuckSince = now;
    // Snap onto the road mesh, then restart the schedule immediately
    const nt = nearestHubNavTile(npc.x, npc.y, navSet);
    if (nt) { npc.x = nt.tx + 0.5; npc.y = nt.ty + 0.5; }
    invalidateNpcHubRoadPath(npc);
    npc._targetX = npc.x;
    npc._targetY = npc.y;
    npc._schedPhase = SCHED_HOME;
    npc._schedUntil = now;
  }
}

function chooseOpenPatrolTarget(npc) {
  for (let attempt = 0; attempt < NPC_PATROL_TARGET_ATTEMPTS; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * npc.patrolRadius;
    const tx = npc.homeX + Math.cos(angle) * radius;
    const ty = npc.homeY + Math.sin(angle) * radius;

    if (!isBlockedCircle(tx, ty)) {
      return { tx, ty };
    }
  }

  if (!isBlockedCircle(npc.homeX, npc.homeY)) {
    return { tx: npc.homeX, ty: npc.homeY };
  }

  return null;
}

function sampleHubPatrolWaypoint(npc, navSet) {
  const pts = _hubNavAnchorsCache;
  if (!(navSet instanceof Set) || pts.length < 60 || npc.patrolRadius < 0.95) {
    return null;
  }
  npc._hubWalkSalt = (((npc._hubWalkSalt ?? npcIdHashSeed(npc.id)) + 982451653) >>> 0) >>> 0;
  const bubble = Number(WORLD.HUB_TOWN_GRASS_RADIUS) || 132;
  const maxSq = Math.min((npc.patrolRadius + 13) ** 2, bubble * bubble);
  const picks = pts.length;

  function jitterSeed(pi) {
    const jx = (npc._hubWalkSalt + pi * 7) % 19;
    const jy = ((npc._hubWalkSalt >>> 11) ^ pi) % 19;
    return {
      tx: pts[pi].cx + jx / 170 - 0.055,
      ty: pts[pi].cy + jy / 170 - 0.055
    };
  }

  for (let t = 0; t < 190; t += 1) {
    const pi = ((npc._hubWalkSalt + t * 1103515245) >>> 0) % picks;
    const q = pts[pi];
    const ddx = q.cx - npc.homeX;
    const ddy = q.cy - npc.homeY;
    if (ddx * ddx + ddy * ddy <= maxSq) {
      return jitterSeed(pi);
    }
  }
  for (let t = 0; t < 120; t += 1) {
    const pi = ((npc._hubWalkSalt + t * 747796405) >>> 0) % picks;
    const q = pts[pi];
    const ddx = q.cx - npc.x;
    const ddy = q.cy - npc.y;
    if (ddx * ddx + ddy * ddy <= (npc.patrolRadius + 36) ** 2) {
      return jitterSeed(pi);
    }
  }
  return null;
}

const MINGLE_DIALOGUE_POOL = Object.freeze([
  "Mind the carts — dripped wax everywhere.",
  "Heard someone lost a pouch near the fountains.",
  "The east ring's packed today!",
  "Pass the salt gossip, will you?",
  "They say the baker's apprentice eloped.",
  "If you sniff smoke, that's just the smith flirting with trouble.",
  "Keep to the pavers — ankles hate mud.",
  "Wall bell rang twice — must be supper soon.",
  "Caravan rumours are ninety percent cloak-lint.",
  "My boots still smell like last week's rain.",
  "Could use a quieter corner and a sharper cheese.",
  "They paved another spoke — marvellous dust.",
]);

const HAWKER_APPROACH_LINES = Object.freeze([
  "Psst — finest wares this side of the ring road.",
  "Adventurer! A moment of your time?",
  "You look like someone who appreciates quality.",
  "Special price, just for passing trade.",
  "Quick browse won't cost you a coin.",
  "That armour's seen some miles — I've got just the thing.",
  "Between us? My rival charges double.",
  "Hot off the cart — interested?",
]);

const APPROACH_COMMENT_LINES = Object.freeze([
  "Nice gear — bet it cost a fortune.",
  "You look like you've seen a fight or two.",
  "Heading into the wilds? Watch the east road.",
  "Is that enchanted? Shimmers a bit in the light.",
  "I wouldn't take that weapon south of the wall, myself.",
  "Heard anything from the ruins lately?",
  "You've got the look of someone who knows what they're doing.",
  "Stay sharp out there — beasties don't care about your reputation.",
]);

const SEEK_GF_CHAT = Object.freeze([
  "Your boots pause like someone's planning shelves.",
  "Three quiet seconds beside you and I'd risk a rhyme.",
  "Homestead rumours travel fast — you'd make them kinder.",
  "If you tucked me by your hearth, I'd mind the mugs.",
]);

const SEEK_BF_CHAT = Object.freeze([
  "Stillness suits you — mind if I lean into it?",
  "I've got clumsy bravery and nowhere to stash it tonight.",
  "Stand there a heartbeat longer?",
  "If you whisper where you tuck your cloak, I'd meet you halfway.",
]);

const FLIRT_GF_LINES = Object.freeze([
  "You carry yourself like someone worth following home.",
  "A face like yours deserves a second glance — I'm giving it one.",
  "New in town? You look too interesting to be local.",
  "I've been circling this square all afternoon, then you walked by.",
  "Forgive me for staring — you're just very easy to look at.",
  "My friends bet I wouldn't say hello. They owe me now.",
  "That armour suits you better than it has any right to.",
  "I don't normally chase strangers. Today feels different.",
  "You have kind eyes for someone who looks like trouble.",
  "Is it forward of me to say you're the most interesting thing in this market?",
  "You smell of adventure and I haven't had any in weeks.",
  "Strong enough to carry a conversation?",
]);

const FLIRT_BF_LINES = Object.freeze([
  "I've been looking for someone to share this road with.",
  "Don't mind me — I just wanted an excuse to walk your way.",
  "A warrior that striking? The bards will argue over who you are.",
  "I practice being brave, and you just became my test case.",
  "Take it as a compliment — I don't usually lose my words.",
  "Tell me your name so I have something to say when I think about this.",
  "Good kit, good stride — someone raised you right.",
  "You look like adventure. I look like trouble. Sounds like a match.",
  "I've walked past twice. Third time means I have to say something.",
  "My mother always said I had poor timing. She'd be proud today.",
]);

/** Warm lines when chatting with a partner who lives in your house (private to you). */
const HOME_COMPLIMENT_GF = Object.freeze([
  "With you under this roof? The whole realm feels warmer.",
  "You're stubborn, brave, and ridiculous — and I still grin when the door opens.",
  "I saved a spot by the kettle. Figured you'd march in the moment I gave up waiting.",
  "Talk to me forever. Your voice still feels like coming home, even when you're two feet away.",
  "If courage had a face, I'd rather look at yours than any portrait in a hall."
]);

const HOME_COMPLIMENT_BF = Object.freeze([
  "Every time you walk through that door you remind me why I stayed.",
  "Still got that stubborn jaw — means you never quit. I noticed.",
  "Sit with me a minute. The world's loud; you're the quiet part I like.",
  "You carry the road in your shoulders and softness in your eyes — unfair combo.",
  "I'd follow you out again tomorrow. Tonight I'm just glad you're here."
]);

const ROMANCE_FEMALE_GIVEN = Object.freeze([
  "Aelithra", "Seraphina", "Morwyn", "Thalindra", "Caelindra", "Elara", "Sylvetra", "Nyssara",
  "Velithra", "Drusilla", "Isolde", "Lyralei", "Vexia", "Orianna", "Selene", "Melisandra",
  "Azalyn", "Brisella", "Tahlira", "Eryndoril", "Faelwyn", "Gwythlen", "Ilyndra", "Jyrrith",
  "Kaelith", "Lorewyn", "Myrrith", "Nyxara", "Orinth", "Pyrelle", "Quinara", "Ryllith",
  "Sylvaris", "Thrynn", "Ulara", "Vaelith", "Wyritha", "Xyrella", "Ysolde", "Zephira",
  "Astrith", "Bryssara", "Cerynth", "Dryssa", "Elyndra", "Faeryn", "Glysselle", "Hyrwen",
  "Ithrynne", "Joryss", "Kythira", "Lysara", "Mythra", "Nivelle", "Orynth", "Pryssia"
]);

const ROMANCE_FEMALE_EPITHET = Object.freeze([
  "Nightbloom", "Moondew", "Starsheen", "Ashvale", "Silverthorn", "Dawnveil", "Shadowmere",
  "Goldleaf", "Frostglen", "Wildrose", "Highvale", "Mistral", "Skylace", "Runehart",
  "Dreamspire", "Emberglow", "Riverwyn", "Stormlace", "Sunshard", "Duskwhisper",
  "Ironlily", "Seabright", "Hollowmere", "Brightfen", "Thornmere", "Ashwyn", "Cloudspire",
  "Deepmere", "Fairglen", "Glimmerfen", "Hollowrose", "Ivyrest", "Jadeglen", "Kestrelwyn",
  "Larkspire", "Mournvale", "Nighthollow", "Oakensheen", "Palethorn", "Quillrest",
  "Ravenshade", "Silversong", "Tideglen", "Underbloom", "Velvetfen", "Winterlace"
]);

const ROMANCE_MALE_GIVEN = Object.freeze([
  "Kaelric", "Dorian", "Theron", "Varric", "Aldric", "Branoc", "Cassian", "Drystan",
  "Erevan", "Faelor", "Garrick", "Hadrian", "Ithric", "Joren", "Korrin", "Lucan",
  "Mareth", "Norrin", "Orvik", "Perrin", "Quinlan", "Roric", "Stellan", "Torvik",
  "Ulric", "Valen", "Wystan", "Xander", "Yoric", "Zareth"
]);

const ROMANCE_MALE_EPITHET = Object.freeze([
  "Thornmantle", "Stormwatch", "Ironhand", "Ashford", "Nightblade", "Highmoor", "Blackrune",
  "Goldmantle", "Frostward", "Wildmark", "Dawnstrider", "Hollowhelm", "Runehart", "Seaborn",
  "Skylance", "Stonefell", "Wolfmark", "Duskward", "Brightaxe", "Cloudbreaker", "Deepforge",
  "Fairmark", "Glimmersteel", "Hollowcrest", "Ironvale", "Jadewatch", "Kestrelmark",
  "Larkward", "Mournsteel", "Nightward", "Oakenshield", "Palemark", "Quillward",
  "Ravenhelm", "Silvermark", "Tideborn", "Undermark", "Velvetward", "Wintermark"
]);

const CROWD_GIVEN = Object.freeze([
  "Aldwyn", "Brynn", "Castor", "Davan", "Eorn", "Fyrian", "Garath", "Hroth",
  "Isvan", "Joren", "Kelrin", "Lyven", "Meryn", "Narek", "Oswin", "Paret",
  "Riven", "Soryn", "Tavan", "Urven", "Varek", "Wyrn", "Aelric", "Bayne",
  "Corin", "Drath", "Elwyn", "Faron", "Garet", "Haryn", "Irek", "Jorin",
  "Sylva", "Thira", "Vera", "Wynne", "Xyla", "Yenna", "Arin", "Bela",
  "Cera", "Eryn", "Fenna", "Gyra", "Hara", "Iryn", "Jora", "Kira",
  "Myra", "Pyra", "Syla", "Tryn", "Ulra", "Vyra", "Wren", "Zora",
  "Aldric", "Borin", "Cavel", "Dryn", "Evorn", "Fendal", "Grynn", "Helm",
]);

const CROWD_EPITHET = Object.freeze([
  "the Baker", "the Weaver", "the Tanner", "the Cooper", "the Miller",
  "the Chandler", "the Fletcher", "the Cobbler", "the Thatcher", "the Sower",
  "of the Crossroads", "of the North Road", "of the Mill Quarter",
  "Ironhands", "Brighthelm", "Farrow", "Dunworth", "Ashfield", "Coldfen",
  "Stoneway", "Greenhollow", "Bramblewood", "Fernwatch", "Crestfall", "Hillborn",
  "Saltwick", "Dunmoor", "Faldwyn", "Greyfen", "Harwick", "Ironside",
]);

function pickCrowdName(seed) {
  const s = seed >>> 0;
  return `${CROWD_GIVEN[s % CROWD_GIVEN.length]} ${CROWD_EPITHET[(s >>> 9) % CROWD_EPITHET.length]}`;
}

/** Deterministic fantasy display name for procedural romance walkers */
function pickFantasyRomanceName(seed, gf) {
  const s = seed >>> 0;
  if (gf) {
    const a = ROMANCE_FEMALE_GIVEN[s % ROMANCE_FEMALE_GIVEN.length];
    const b = ROMANCE_FEMALE_EPITHET[(s >>> 11) % ROMANCE_FEMALE_EPITHET.length];
    return `${a} ${b}`;
  }
  const a = ROMANCE_MALE_GIVEN[s % ROMANCE_MALE_GIVEN.length];
  const b = ROMANCE_MALE_EPITHET[(s >>> 11) % ROMANCE_MALE_EPITHET.length];
  return `${a} ${b}`;
}

/** ~20% of purchasable romance NPCs actively pursue homeowners; rest only wander. */
function romanceCourtAggressiveFromId(idStr) {
  if (typeof idStr !== "string") {
    return false;
  }
  return (npcIdHashSeed(idStr) % 100) < 70;
}

const SCI_FI_TRAFFIC_DWELL_MIN_MS = 5200;
const SCI_FI_TRAFFIC_DWELL_MAX_MS = 11800;
const SCI_FI_TRAFFIC_OUTER_RADIUS = 92;
const SCI_FI_TRAFFIC_NAMES = Object.freeze([
  "Pilot Zhara",
  "Courier Vo",
  "Captain Elix",
  "Dockrunner Mave",
  "Hauler Kesh",
  "Axiom Nine",
  "Vela Korr",
  "Orrin Flux",
  "Juno Vex",
  "Talen Quill",
  "Sable Dray",
  "Kito Nara"
]);
const SCI_FI_TRAFFIC_HULLS = Object.freeze([
  { hullClass: "skiff", templateId: "npc_skiff", color: "#67f0ff", speed: 9.2 },
  { hullClass: "runner", templateId: "npc_runner", color: "#8affd2", speed: 10.6 },
  { hullClass: "fighter", templateId: "npc_fighter", color: "#ff8f6b", speed: 11.4 },
  { hullClass: "hauler", templateId: "npc_hauler", color: "#f7d86a", speed: 7.8 },
  { hullClass: "interceptor", templateId: "npc_interceptor", color: "#c084fc", speed: 12.5 },
  { hullClass: "courier", templateId: "npc_courier", color: "#9edfff", speed: 10.2 }
]);

function trafficVectorForPort(port) {
  const dx = Number(port.x) - RINGFORGE_CENTER.x;
  const dy = Number(port.y) - RINGFORGE_CENTER.y;
  const len = Math.max(0.001, Math.hypot(dx, dy));
  return { nx: dx / len, ny: dy / len };
}

function trafficOuterPointForPort(port, index = 0) {
  const { nx, ny } = trafficVectorForPort(port);
  const side = ((index % 5) - 2) * 7.5;
  return {
    x: port.x + nx * SCI_FI_TRAFFIC_OUTER_RADIUS + -ny * side,
    y: port.y + ny * SCI_FI_TRAFFIC_OUTER_RADIUS + nx * side
  };
}

function buildSciFiTrafficNpcDefinitions() {
  const ports = SCI_FI_DOCK_PORTS.filter((_, index) => index % 2 === 0);
  return ports.slice(0, SCI_FI_TRAFFIC_NAMES.length).map((port, index) => {
    const hull = SCI_FI_TRAFFIC_HULLS[index % SCI_FI_TRAFFIC_HULLS.length];
    return {
      id: `npc_ship_traffic_${index}`,
      name: SCI_FI_TRAFFIC_NAMES[index],
      classId: index % 3 === 0 ? "ranger" : index % 3 === 1 ? "mage" : "knight",
      primary: "#243447",
      accent: hull.color,
      homeX: RINGFORGE_CENTER.x,
      homeY: RINGFORGE_CENTER.y,
      patrolRadius: 220,
      npcTheme: "sci-fi",
      sciFiLook: index % 4 === 1 ? "android" : "alien",
      sciFiRole: "pilot",
      sciFiShipTraffic: true,
      _trafficPortIndex: index % Math.max(1, SCI_FI_DOCK_PORTS.length),
      ship: {
        templateId: hull.templateId,
        name: `${SCI_FI_TRAFFIC_NAMES[index]}'s Ship`,
        color: hull.color,
        hullClass: hull.hullClass,
        boarded: true,
        dockX: port.x,
        dockY: port.y,
        dockStationId: "station_ringforge",
        dockPortId: port.id,
        speed: hull.speed,
        laserTier: 1 + (index % 3),
        thrustTier: 1 + (index % 3)
      },
      dialogue: [
        "Clearance received. Vectoring to dock.",
        "Mind the mag-clamps, station crew.",
        "Cargo seal is green. I am coming in.",
        "Orbital Square, this is final approach.",
      ]
    };
  });
}

function buildSciFiShopkeeperNpcDefinitions() {
  return SCI_FI_STATION_FEATURES
    .filter((feature) => feature?.kind === "sci-shop")
    .map((shop, index) => {
      const shopType = String(shop.shopType || "trade");
      const role =
        shopType === "ship" ? "shipwright" :
        shopType === "arms" ? "armorer" :
        shopType === "stims" ? "medic_vendor" :
        shopType === "parts" ? "parts_dealer" :
        "station_vendor";
      const accent =
        shopType === "ship" ? "#67f0ff" :
        shopType === "arms" ? "#ff8f6b" :
        shopType === "stims" ? "#82ffbb" :
        shopType === "parts" ? "#f7d86a" :
        "#c084fc";
      return {
        id: `npc_keeper_${shop.id}`,
        name: shop.keeperName || `${shop.name} Keeper`,
        classId: index % 3 === 0 ? "mage" : index % 3 === 1 ? "ranger" : "knight",
        primary: index % 2 === 0 ? "#223044" : "#2a3650",
        accent,
        homeX: Number(shop.shopkeeperX) || Number(shop.x),
        homeY: Number(shop.shopkeeperY) || Number(shop.y),
        patrolRadius: 1.35,
        npcTheme: "sci-fi",
        sciFiRole: role,
        sciFiLook: index % 2 === 0 ? "android" : "alien",
        managedShopId: shop.id,
        dialogue: [
          `${shop.name} terminal is live. Browse from the console.`,
          "Everything is tagged, scanned, and mostly legal.",
          "Stand clear of the door field; it opens when you approach.",
          "The terminal handles payment. I handle complaints.",
        ]
      };
    });
}

function initSciFiTrafficRuntime(npc) {
  const port = SCI_FI_DOCK_PORTS[npc._trafficPortIndex % SCI_FI_DOCK_PORTS.length] || SCI_FI_DOCK_PORTS[0];
  const out = trafficOuterPointForPort(port, npc._trafficPortIndex || 0);
  npc.x = out.x;
  npc.y = out.y;
  npc._targetX = port.x;
  npc._targetY = port.y;
  npc._trafficPhase = "inbound";
  npc._trafficPortId = port.id;
  npc._trafficDockUntil = 0;
  npc.facing = Math.atan2(port.y - npc.y, port.x - npc.x);
  npc.moving = true;
  if (npc.ship) {
    npc.ship.boarded = true;
    npc.ship.dockX = port.x;
    npc.ship.dockY = port.y;
    npc.ship.dockStationId = "station_ringforge";
    npc.ship.dockPortId = port.id;
  }
}

function nextTrafficPort(npc) {
  if (!SCI_FI_DOCK_PORTS.length) {
    return null;
  }
  npc._trafficPortIndex = ((npc._trafficPortIndex || 0) + 5) % SCI_FI_DOCK_PORTS.length;
  return SCI_FI_DOCK_PORTS[npc._trafficPortIndex];
}

function dockedPilotPoint(port) {
  const { nx, ny } = trafficVectorForPort(port);
  return {
    x: port.x - nx * 10,
    y: port.y - ny * 10
  };
}

function tickSciFiTraffic(npc, dt, now) {
  if (!npc._trafficPhase || !SCI_FI_DOCK_PORTS.length) {
    initSciFiTrafficRuntime(npc);
  }

  let port = SCI_FI_DOCK_PORTS.find((p) => p.id === npc._trafficPortId) || SCI_FI_DOCK_PORTS[0];
  if (npc._trafficPhase === "docked") {
    npc.moving = false;
    if (npc.ship) {
      npc.ship.boarded = false;
      npc.ship.dockX = port.x;
      npc.ship.dockY = port.y;
      npc.ship.dockStationId = "station_ringforge";
      npc.ship.dockPortId = port.id;
    }
    if (now < (npc._trafficDockUntil || 0)) {
      return;
    }
    npc._trafficPhase = "outbound";
    npc.x = port.x;
    npc.y = port.y;
    const out = trafficOuterPointForPort(port, npc._trafficPortIndex || 0);
    npc._targetX = out.x;
    npc._targetY = out.y;
    if (npc.ship) {
      npc.ship.boarded = true;
    }
  }

  const dx = npc._targetX - npc.x;
  const dy = npc._targetY - npc.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.7) {
    if (npc._trafficPhase === "inbound") {
      const pilot = dockedPilotPoint(port);
      npc.x = pilot.x;
      npc.y = pilot.y;
      npc._targetX = pilot.x;
      npc._targetY = pilot.y;
      npc._trafficPhase = "docked";
      npc._trafficDockUntil =
        now +
        SCI_FI_TRAFFIC_DWELL_MIN_MS +
        ((npcIdHashSeed(`${npc.id}|${now >>> 10}`) >>> 0) %
          (SCI_FI_TRAFFIC_DWELL_MAX_MS - SCI_FI_TRAFFIC_DWELL_MIN_MS));
      npc.moving = false;
      if (npc.ship) {
        npc.ship.boarded = false;
      }
      return;
    }

    if (npc._trafficPhase === "outbound") {
      port = nextTrafficPort(npc) || port;
      const out = trafficOuterPointForPort(port, npc._trafficPortIndex || 0);
      npc.x = out.x;
      npc.y = out.y;
      npc._trafficPortId = port.id;
      npc._trafficPhase = "inbound";
      npc._targetX = port.x;
      npc._targetY = port.y;
      if (npc.ship) {
        npc.ship.dockX = port.x;
        npc.ship.dockY = port.y;
        npc.ship.dockStationId = "station_ringforge";
        npc.ship.dockPortId = port.id;
        npc.ship.boarded = true;
      }
    }
  }

  const ndx = npc._targetX - npc.x;
  const ndy = npc._targetY - npc.y;
  const nd = Math.hypot(ndx, ndy);
  if (nd < 0.001) {
    npc.moving = false;
    return;
  }
  const speed = Math.max(5.5, Math.min(14, Number(npc.ship?.speed) || 9.2));
  const step = Math.min(speed * dt, nd);
  const nextX = npc.x + (ndx / nd) * step;
  const nextY = npc.y + (ndy / nd) * step;
  if (isBlockedCircleForShip(nextX, nextY)) {
    const safe = trafficOuterPointForPort(port, npc._trafficPortIndex || 0);
    npc.x = safe.x;
    npc.y = safe.y;
    npc._targetX = port.x;
    npc._targetY = port.y;
    npc._trafficPhase = "inbound";
    npc.moving = true;
    return;
  }
  npc.x = nextX;
  npc.y = nextY;
  npc.facing = Math.atan2(ndy, ndx);
  npc.moving = true;
}

function buildHydratedHubNpcExtras() {
  const navKeys = WORLD.HUB_NAV_PATH_KEYS instanceof Set ? WORLD.HUB_NAV_PATH_KEYS : null;
  rebuildHubNavAnchors(navKeys || new Set());
  /** @type {any[]} */
  const out = [];
  const roadside = WORLD.HUB_ROADSIDE_FEATURES || [];

  /** Procedural stall vendors (+2×1 stand footprint in hubRoundTown) */
  for (const rs of roadside) {
    if (rs.kind !== "market_stand") continue;
    const vid =
      typeof rs.vendorNpcId === "string"
        ? rs.vendorNpcId
        : `hub_vendor_${typeof rs.id === "string" ? rs.id : `${rs.x}_${rs.y}`}`;
    const nx = rs.x | 0;
    const ny = rs.y | 0;
    const stallHue = ((((nx * 79) ^ (ny * 131)) >>> 0) % 0x666650) + 0x393028;
    out.push({
      id: vid,
      name: "Stall Trader",
      classId: "ranger",
      primary: `#${(stallHue & 0xffffff).toString(16).padStart(6, "0")}`,
      accent: "#ddb66a",
      homeX: nx + 1,
      homeY: ny + 0.38,
      patrolRadius: 0,
      isTrader: true,
      dialogue: [
        "Two tiles of shade, honest coin.",
        "Spices cooled overnight — sweetest deal before noon.",
        "Browse slow; I pack faster than I chatter.",
        "Need thread, ink, luck? Mixed bag today.",
      ]
    });
  }

  /** Wandering hawkers — mobile traders who approach nearby players to sell wares. */
  const HAWKER_SPECS = [
    { id: "hub_hawk_0", name: "Wandering Merchant",  primary: "#5a3e28", accent: "#e8c86a", hx: 18, hy: -18 },
    { id: "hub_hawk_1", name: "Travelling Peddler",  primary: "#3a4a2e", accent: "#d4b06a", hx: -18, hy: 18 },
    { id: "hub_hawk_2", name: "Roving Trader",       primary: "#4a2e3a", accent: "#c8a050", hx: 20, hy: 20 },
  ];
  for (const hs of HAWKER_SPECS) {
    out.push({
      id: hs.id,
      name: hs.name,
      classId: "ranger",
      primary: hs.primary,
      accent: hs.accent,
      homeX: hs.hx,
      homeY: hs.hy,
      patrolRadius: 6,
      isTrader: true,
      wandersToPlayer: true,
      dialogue: [...HAWKER_APPROACH_LINES]
    });
  }

  const baseCount = BASE_NPC_DEFINITIONS.length;
  const extrasSoFar = out.length;
  const crowdBudget = Math.max(0, HUB_POPULATION_TARGET - baseCount - extrasSoFar);
  const seekersPlanned = Math.min(crowdBudget, Math.max(48, Math.floor(HUB_POPULATION_TARGET * 0.55)));
  const FLIRT_WALKER_COUNT = Math.min(14, Math.max(0, crowdBudget - seekersPlanned));
  const minglersTotal = crowdBudget - seekersPlanned - FLIRT_WALKER_COUNT;

  /** @type {{ cx: number, cy: number }[]} */
  const homes = [..._hubNavAnchorsCache];
  function pickHome(ix, bannedSet) {
    if (!homes.length || !bannedSet) return null;
    for (let t = 0; t < 240; t += 1) {
      const ti = (((ix * 193) >>> 0) + t * 514229) >>> 0;
      const p = homes[ti % homes.length];
      const k = `${Math.floor(p.cx)},${Math.floor(p.cy)}`;
      if (!bannedSet.has(k)) {
        bannedSet.add(k);
        return { cx: p.cx, cy: p.cy, key: k };
      }
    }
    return null;
  }

  const homeBanned = new Set();

  /** Extra romance-seekers circulating the paths */
  for (let si = 0; si < seekersPlanned; si += 1) {
    const id = `hub_seek_${si}`;
    const spot = pickHome(si + 1200, homeBanned);
    if (!spot) break;
    const seed = npcIdHashSeed(`${id}_${spot.key}`);
    /** Strong bias toward female (long-hair / curvy silhouette on client for bondTag gf). */
    const gf = (seed % 20) >= 3;
    const primHue = ((((seed >>> 3) ^ 0x8899aa) >>> 0) % 0xababab) + 0x303040;
    out.push({
      id,
      name: pickFantasyRomanceName(seed ^ (si * 2654435761), gf),
      classId: CLASSES_ROT[seed % CLASSES_ROT.length],
      primary: `#${(primHue & 0xffffff).toString(16).padStart(6, "0")}`,
      accent: gf ? "#fbcfe8" : "#fde68a",
      homeX: spot.cx + ((seed % 7) / 130 - 0.026),
      homeY: spot.cy + ((((seed >>> 9) % 7) >>> 0) / 130 - 0.026),
      patrolRadius: 26 + ((seed >>> 13) % 15),
      courtPlayer: true,
      companionPrice: 438 + (((seed >>> 17) % 41) >>> 0) + (gf ? 0 : 2),
      bondTag: gf ? "gf" : "bf",
      dialogue: gf ? [...SEEK_GF_CHAT] : [...SEEK_BF_CHAT]
    });
  }

  /** Wandering flirt NPCs — approach players based on level + armour attractiveness */
  for (let fi = 0; fi < FLIRT_WALKER_COUNT; fi += 1) {
    const id = `hub_flirt_${fi}`;
    const spot = pickHome(fi + 4500, homeBanned);
    if (!spot) break;
    const seed = npcIdHashSeed(`${id}_${spot.key}`);
    const gf = (seed % 10) < 7;
    const primHue = ((((seed >>> 5) ^ 0x667788) >>> 0) % 0x909080) + 0x282830;
    out.push({
      id,
      name: pickFantasyRomanceName(seed ^ (fi * 1234567891), gf),
      classId: CLASSES_ROT[seed % CLASSES_ROT.length],
      primary: `#${(primHue & 0xffffff).toString(16).padStart(6, "0")}`,
      accent: gf ? "#fbcfe8" : "#fde68a",
      homeX: spot.cx + ((seed % 7) / 130 - 0.026),
      homeY: spot.cy + ((((seed >>> 9) % 7) >>> 0) / 130 - 0.026),
      patrolRadius: 22 + ((seed >>> 13) % 18),
      bondTag: gf ? "gf" : "bf",
      wandersToFlirt: true,
      dialogue: gf ? [...FLIRT_GF_LINES] : [...FLIRT_BF_LINES]
    });
  }

  /** General crowd without romance hooks */
  for (let mi = 0; mi < minglersTotal; mi += 1) {
    const id = `hub_m_${mi}`;
    const spot = pickHome(mi + 9000, homeBanned);
    if (!spot) break;
    const seed = npcIdHashSeed(`${id}_${spot.key}`);
    out.push({
      id,
      name: pickCrowdName(seed ^ (mi * 2246822519)),
      classId: CLASSES_ROT[(seed >>> 5) % CLASSES_ROT.length],
      primary: `#${(
        ((((seed >>> 2) ^ (mi << 11)) >>> 0) % 0xc0c0b0) +
        0x252528
      )
        .toString(16)
        .padStart(6, "0")
        .slice(-6)}`,
      accent: ((seed >>> 17) % 2) >>> 0 ? "#a8cfe8" : "#e8cfa8",
      homeX: spot.cx + ((((seed >>> 13) % 5) >>> 0) / 220 - 0.016),
      homeY: spot.cy + ((((seed >>> 19) % 5) >>> 0) / 220 - 0.016),
      patrolRadius: 18 + (((seed >>> 23) % 18) >>> 0),
      dialogue: [...MINGLE_DIALOGUE_POOL.slice(0, Math.min(MINGLE_DIALOGUE_POOL.length, 6))]
    });
  }

  /** Gate guards — one per entrance gap in the perimeter wall (8 gates total) */
  const GATE_GUARD_SPECS = [
    { id: "hub_g_n",  homeX: 0,    homeY: -105, facing: -Math.PI / 2 },
    { id: "hub_g_ne", homeX: 74,   homeY: -74,  facing: -Math.PI / 4 },
    { id: "hub_g_e",  homeX: 105,  homeY: 0,    facing: 0 },
    { id: "hub_g_se", homeX: 74,   homeY: 74,   facing: Math.PI / 4 },
    { id: "hub_g_s",  homeX: 0,    homeY: 105,  facing: Math.PI / 2 },
    { id: "hub_g_sw", homeX: -74,  homeY: 74,   facing: Math.PI * 0.75 },
    { id: "hub_g_w",  homeX: -105, homeY: 0,    facing: Math.PI },
    { id: "hub_g_nw", homeX: -74,  homeY: -74,  facing: -Math.PI * 0.75 },
  ];
  for (const gs of GATE_GUARD_SPECS) {
    out.push({
      id: gs.id,
      name: "Gatekeeper Archer",
      classId: "ranger",
      primary: "#4f6474",
      accent: "#e8c86a",
      weaponKind: "bow",
      weaponStyle: "heavy",
      homeX: gs.homeX,
      homeY: gs.homeY,
      facing: gs.facing,
      patrolRadius: 0,
      isGuard: true,
      isGateKeeper: true,
      dialogue: [
        "Stay inside the wall if arrows start flying.",
        "No beast crosses this gate while I draw breath.",
        "The tower has eyes on the road.",
        "Keep moving, traveler — I have the gate covered.",
        "If it charges the town, it gets an arrow.",
      ]
    });
  }

  return out;
}

const BASE_NPC_DEFINITIONS = [
  {
    id: "npc_quest_wynn_hearth",
    name: "Sage Wynn",
    classId: "mage",
    primary: "#5a4a7a",
    accent: "#ffd66e",
    homeX: -3,
    homeY: 4,
    patrolRadius: 2,
    questGiver: true,
    questIds: ["q_first_hunt"],
    dialogue: [
      "Welcome to the home tree, traveler.",
      "Even quiet paths grow restless if no one walks them.",
      "Test your blade on a slime or two — the realm thanks you for it.",
    ],
  },
  {
    id: "npc_quest_elm_watch",
    name: "Elder Elm",
    classId: "mage",
    primary: "#4b6b3d",
    accent: "#f4d35e",
    homeX: -6,
    homeY: 7,
    patrolRadius: 4,
    questGiver: true,
    questIds: ["q_slime_watch"],
    dialogue: [
      "The pasture paths are restless again.",
      "A steady hand can turn a whole town's luck.",
      "Keep your eyes on the grass line.",
    ],
  },
  {
    id: "npc_quest_mara_gate",
    name: "Gatewarden Mara",
    classId: "knight",
    primary: "#405166",
    accent: "#e6c15c",
    homeX: 11,
    homeY: -18,
    patrolRadius: 5,
    questGiver: true,
    questIds: ["q_north_watch", "q_road_report"],
    dialogue: [
      "North gate's quiet, which means trouble is walking around it.",
      "Reports first, heroics second.",
      "If you go beyond the wall, come back with useful news.",
    ],
  },
  {
    id: "npc_quest_borin_market",
    name: "Borin Reed",
    classId: "ranger",
    primary: "#6b5438",
    accent: "#7ed3a8",
    homeX: 24,
    homeY: 18,
    patrolRadius: 5,
    questGiver: true,
    questIds: ["q_briar_errand"],
    dialogue: [
      "I've counted the crates twice. The road still owes me three.",
      "Bandits hate paperwork almost as much as I do.",
      "Tell Mara I still need that gate report.",
    ],
  },
  {
    id: "npc_quest_lira_brook",
    name: "Lira Brook",
    classId: "mage",
    primary: "#5d6f91",
    accent: "#9ee8ff",
    homeX: -27,
    homeY: 23,
    patrolRadius: 4,
    questGiver: true,
    questIds: ["q_wisp_sample"],
    dialogue: [
      "Cold lights have been drifting from the frost road.",
      "Bring me proof, not a heroic limp.",
      "Every strange glow has a pattern if you stop squinting.",
    ],
  },
  {
    id: "npc_quest_tamsin_anvil",
    name: "Tamsin Anvil",
    classId: "knight",
    primary: "#734c3f",
    accent: "#ffb454",
    homeX: 33,
    homeY: -25,
    patrolRadius: 4,
    questGiver: true,
    questIds: ["q_ember_cinders"],
    dialogue: [
      "Ember imps have been chewing on my coal sacks.",
      "If it smokes and laughs, hit it.",
      "A clean forge needs dirty work outside town.",
    ],
  },
  // --- North Village ---
  {
    id: "npc_mara", name: "Innkeeper Mara",
    classId: "knight", primary: "#8b4513", accent: "#d4a574",
    homeX: 11, homeY: -65, patrolRadius: 7,
    dialogue: [
      "A warm fire and a hot meal await you inside!",
      "The inn is open to all weary travellers.",
      "I heard strange sounds from the ruins last night...",
      "Trade has been good this season, thank the stars.",
      "Have you met old Thomas? He tells the strangest tales.",
    ],
  },
  {
    id: "npc_thomas", name: "Old Thomas",
    classId: "mage", primary: "#4a3728", accent: "#c8a86b",
    homeX: -10, homeY: -65, patrolRadius: 11,
    dialogue: [
      "The stars speak of change on the horizon.",
      "I have walked these paths for forty years.",
      "The ancient halls to the west hold secrets beyond imagining.",
      "The east market has the finest goods this side of the mountains.",
      "A wise traveller rests before venturing into the deep forest.",
    ],
  },
  {
    id: "npc_dale", name: "Merchant Dale",
    classId: "ranger", primary: "#5a4a35", accent: "#c8a86b",
    homeX: 0, homeY: -62, patrolRadius: 8,
    isTrader: true,
    dialogue: [
      "Finest wares from across the realm, step right up!",
      "Business has been booming since the new road opened.",
      "The south hamlet has the best grain this year.",
      "Watch your coin purse in the ruins to the west.",
      "Looking for something special? I can source it.",
    ],
  },
  {
    id: "npc_aldric", name: "Guard Aldric",
    classId: "knight", primary: "#6e7a8a", accent: "#c8c8c8",
    homeX: 2, homeY: -54, patrolRadius: 6,
    dialogue: [
      "The north road is safe under my watch.",
      "Report any trouble to me immediately.",
      "I have served this village for ten long years.",
      "All is quiet tonight. As it should be.",
      "Keep moving, citizen.",
    ],
  },

  // --- East Town ---
  {
    id: "npc_ren", name: "Blacksmith Ren",
    classId: "knight", primary: "#3a3a3a", accent: "#ff6600",
    homeX: 60, homeY: 10, patrolRadius: 6,
    dialogue: [
      "Steel and fire — that is all you need in this world.",
      "I forged the eastern gate with my own hands.",
      "Need a blade sharpened? You know where to find me.",
      "The ore from the northern hills is exceptionally pure.",
      "My father taught me this trade. And his father before him.",
    ],
  },
  {
    id: "npc_lyssa", name: "Trader Lyssa",
    classId: "ranger", primary: "#7b5ea7", accent: "#ffd700",
    homeX: 60, homeY: -11, patrolRadius: 8,
    isTrader: true,
    dialogue: [
      "The market has everything the heart desires!",
      "My spices come from lands you could not imagine.",
      "A fair price for a fair deal — that is my motto.",
      "The western ruins are said to hold ancient treasures.",
      "I have traded in thirty cities. This is my favourite.",
    ],
  },
  {
    id: "npc_brom", name: "Apprentice Brom",
    classId: "ranger", primary: "#5a7a5a", accent: "#ff8c00",
    homeX: 57, homeY: 12, patrolRadius: 5,
    dialogue: [
      "Master Ren says I still have much to learn.",
      "I burned myself on the forge again today...",
      "One day I will craft weapons worthy of legend!",
      "The east town is always so lively.",
      "Could you spare some advice for a young apprentice?",
    ],
  },
  {
    id: "npc_sera", name: "Guard Sera",
    classId: "knight", primary: "#6e7a8a", accent: "#ffd700",
    homeX: 50, homeY: 0, patrolRadius: 8,
    dialogue: [
      "The east road is under my protection.",
      "I keep watch so others may sleep soundly.",
      "The market closes at dusk — plan accordingly.",
      "Stay on the lit path and you will be fine.",
      "No trouble here tonight. Move along.",
    ],
  },

  // --- South Hamlet ---
  {
    id: "npc_holt", name: "Farmer Holt",
    classId: "ranger", primary: "#8b6914", accent: "#228b22",
    homeX: 8, homeY: 61, patrolRadius: 10,
    dialogue: [
      "The harvest will be plentiful this year, I can feel it.",
      "Good land needs good care. That is the farmer's way.",
      "My family has worked this soil for generations.",
      "The city folk do not know what real work is.",
      "Rain is coming. I can smell it on the wind.",
    ],
  },
  {
    id: "npc_greta", name: "Provisioner Greta",
    classId: "ranger", primary: "#6b4e2f", accent: "#e8c84a",
    homeX: -2, homeY: 58, patrolRadius: 6,
    isTrader: true,
    dialogue: [
      "Potions, rations, and remedies — all in stock!",
      "The hamlet folk keep me busy with orders.",
      "A prepared adventurer is a living adventurer.",
      "My tonics are brewed from the finest local herbs.",
      "Heading into the wilds? You will want supplies.",
    ],
  },
  {
    id: "npc_dot", name: "Miller Dot",
    classId: "mage", primary: "#c8a86b", accent: "#fff8dc",
    homeX: -8, homeY: 61, patrolRadius: 7,
    dialogue: [
      "Fresh flour, ground this very morning!",
      "The mill wheel turns as long as the river flows.",
      "Bread is the foundation of civilisation, I always say.",
      "My mill serves all four villages, you know.",
      "Come, share a loaf with a friendly face!",
    ],
  },
  {
    id: "npc_wyn", name: "Shepherd Wyn",
    classId: "ranger", primary: "#6b8e6b", accent: "#f5f5dc",
    homeX: -5, homeY: 72, patrolRadius: 13,
    dialogue: [
      "The sheep know the land better than any map.",
      "I find peace in long walks through the fields.",
      "If you see a lost sheep, please send it my way!",
      "The world is quieter here. That is how I like it.",
      "Every blade of grass tells a story if you listen.",
    ],
  },

  // --- West Ruins ---
  {
    id: "npc_voss", name: "Curio Dealer Voss",
    classId: "mage", primary: "#3a2f4a", accent: "#c79cff",
    homeX: -55, homeY: -4, patrolRadius: 6,
    isTrader: true,
    dialogue: [
      "Relics and curiosities, salvaged from the deep halls.",
      "Every item I sell has a story. Most of them tragic.",
      "The scholars pay well for enchanted trinkets.",
      "I accept coin, not questions about my sources.",
      "Rare finds today — the ruins were generous.",
    ],
  },
  {
    id: "npc_mira", name: "Sage Mira",
    classId: "mage", primary: "#2d3a4a", accent: "#9370db",
    homeX: -65, homeY: -9, patrolRadius: 9,
    dialogue: [
      "The ancients who built these halls were very powerful.",
      "Do not touch the inscriptions on the walls. Please.",
      "I have spent decades deciphering these ruins.",
      "Magic still lingers in these stones if you know how to feel it.",
      "Knowledge preserved is civilisation preserved.",
    ],
  },
  {
    id: "npc_cael", name: "Hermit Cael",
    classId: "mage", primary: "#1a1a2e", accent: "#6a0dad",
    homeX: -65, homeY: 10, patrolRadius: 5,
    dialogue: [
      "...",
      "The walls remember everything.",
      "You should not be here.",
      "Leave before the shadows notice you.",
      "Time means nothing in this place.",
    ],
  },
  {
    id: "npc_zix", name: "Wanderer Zix",
    classId: "ranger", primary: "#4a5568", accent: "#ed8936",
    homeX: -52, homeY: 2, patrolRadius: 14,
    dialogue: [
      "I have been everywhere and nowhere.",
      "The ruins fascinate me. So much history!",
      "You meet the most interesting folk on the road.",
      "Every city has a story. Every ruin has a secret.",
      "I never stay in one place long. Keeps life interesting.",
    ],
  },

  // --- Central Hub ---
  {
    id: "npc_kael", name: "Bazaar Kael",
    classId: "knight", primary: "#8b5e3c", accent: "#ffd166",
    homeX: 5, homeY: -3, patrolRadius: 5,
    isTrader: true,
    dialogue: [
      "Welcome to Kael's Bazaar! Best prices in the hub!",
      "Fresh stock every day, straight from the caravans.",
      "Buy, sell, trade — I do it all.",
      "The portal travellers always need supplies.",
      "My prices are fair. Mostly.",
    ],
  },
  {
    id: "npc_ebb", name: "Town Crier Ebb",
    classId: "ranger", primary: "#c8001a", accent: "#ffd700",
    homeX: 0, homeY: 3, patrolRadius: 9,
    dialogue: [
      "Hear ye! Travellers are welcome in Balathor!",
      "The four villages stand united under one realm!",
      "North road leads to the Crossroads Inn — warm beds await!",
      "The east town market is open daily at dawn!",
      "West ruins are open to scholars who show proper respect.",
      "South hamlet feeds the whole realm with its bountiful harvest!",
    ],
  },
  {
    id: "npc_ana", name: "Scribe Ana",
    classId: "mage", primary: "#1a1a6e", accent: "#87ceeb",
    homeX: -3, homeY: -3, patrolRadius: 5,
    dialogue: [
      "I record the history of this realm for posterity.",
      "Every traveller who passes through is noted in my ledger.",
      "Words outlast kingdoms. Always remember that.",
      "The library in the east town holds copies of my work.",
      "May I note your name for the record?",
    ],
  },

  {
    id: "npc_plaza_una", name: "Stallkeep Una",
    classId: "ranger", primary: "#5c4632", accent: "#e8c040",
    homeX: -40, homeY: -10, patrolRadius: 0,
    isTrader: true,
    dialogue: [
      "Everything on this wagon is priced for neighbours.",
      "Arrows, twine, and trail biscuits — take your pick.",
      "Parked off the busy square — easier to load up.",
      "The roads are quiet today. Perfect for stocking up.",
      "Coin honest, goods honest — that's my rule.",
    ],
  },
  {
    id: "npc_plaza_bram", name: "Hawker Bram",
    classId: "knight", primary: "#4a3a28", accent: "#c49a6c",
    homeX: 40, homeY: -10, patrolRadius: 0,
    isTrader: true,
    dialogue: [
      "Fine steel wool, oils, and wax — maintain your kit!",
      "I've walked every road out of this village; I know what sells.",
      "Buy now before the next caravan hikes its prices.",
      "Mind the wheels — but browse all you like.",
      "Everything here I've tested myself in the field.",
    ],
  },
  {
    id: "npc_plaza_lulu", name: "Vendor Lulu",
    classId: "mage", primary: "#4a3558", accent: "#9adbc9",
    homeX: -26, homeY: 44, patrolRadius: 0,
    isTrader: true,
    dialogue: [
      "Potions, dusts, and curious little charms.",
      "My stock shifts with the moon — always something new.",
      "Sit on the step; browsing's free.",
      "Scholars argue. Travellers drink my teas and sleep sound.",
      "If it glows slightly, that's how you know it's fresh.",
    ],
  },
  {
    id: "npc_plaza_otto", name: "Caravan Otto",
    classId: "ranger", primary: "#3d4f3a", accent: "#f0e6a8",
    homeX: 28, homeY: 50, patrolRadius: 0,
    isTrader: true,
    dialogue: [
      "Salt, spice, leather straps — straight off the wagon.",
      "I park here between runs east and west.",
      "No haggling before noon; I'm not awake enough.",
      "Hop up — serious buyers only.",
      "Sell me your extras — weight is money on the road.",
    ],
  },
  {
    id: "npc_rile",
    name: "Seraphina Valewyn",
    classId: "ranger",
    primary: "#5c4a52",
    accent: "#fca5a5",
    homeX: 93,
    homeY: 14,
    patrolRadius: 11,
    courtPlayer: true,
    companionPrice: 480,
    bondTag: "gf",
    dialogue: [
      "You've got kind eyes.",
      "I keep wondering what your living room looks like.",
      "...That came out bolder than I meant.",
      "If you hold still for half a heartbeat, I'd tell you a secret.",
      "I like people who finish what they build — roofs, nests, friendships.",
    ]
  },
  {
    id: "npc_jax",
    name: "Kaelric Thornmantle",
    classId: "knight",
    primary: "#3d4f5f",
    accent: "#fde68a",
    homeX: 58,
    homeY: 2,
    patrolRadius: 10,
    courtPlayer: true,
    companionPrice: 455,
    bondTag: "bf",
    dialogue: [
      "Busy mind, restless feet?",
      "I've been known to linger where someone listens.",
      "Home isn't four walls unless someone shares it.",
      "Stand with me — no swords, just words.",
      "If you planted roots here, you'd make the place brighter.",
    ]
  },
  {
    id: "npc_mae",
    name: "Melisandra Ashryn",
    classId: "mage",
    primary: "#483c44",
    accent: "#fbcfe8",
    homeX: -18,
    homeY: 58,
    patrolRadius: 13,
    courtPlayer: true,
    companionPrice: 448,
    bondTag: "gf",
    dialogue: [
      "...You stop long enough for a story and I melt a little.",
      "If you lent me shelf space beside your kettle, I'd make it sing.",
      "Three seconds standing still tells me you listen — rare magic.",
      "Homesteaders scare easy; you don't.",
      "Say the word and I'll haunt your hearth like it's mine.",
    ]
  },
  {
    id: "npc_sofia",
    name: "Lyralei Moonsilk",
    classId: "ranger",
    primary: "#4b3f36",
    accent: "#f472b6",
    homeX: -38,
    homeY: -8,
    patrolRadius: 12,
    courtPlayer: true,
    companionPrice: 466,
    bondTag: "gf",
    dialogue: [
      "Your boots pause like someone planning roots.",
      "I've got clumsy bravery and nowhere to pin it tonight.",
      "Stand there three heartbeats longer — humour me?",
      "...Could I braid wildflowers onto your mantle?",
      "Owning a doorway means admitting you dare to belong.",
    ]
  },
  {
    id: "npc_nara",
    name: "Isolde Nightbloom",
    classId: "knight",
    primary: "#3d4a54",
    accent: "#fda4af",
    homeX: -62,
    homeY: 8,
    patrolRadius: 11,
    courtPlayer: true,
    companionPrice: 455,
    bondTag: "gf",
    dialogue: [
      "Stillness suits you.",
      "...Not many offer me a hearth without swords involved.",
      "If you whisper where you tuck your slippers, I'll meet you halfway.",
      "Three seconds grounded while I chatter — dare you?",
      "Your walls look sturdy; my heart rattles anyhow.",
    ]
  },
  {
    id: "npc_station_guard_n",
    name: "Station Guard",
    classId: "ranger",
    primary: "#24445c",
    accent: "#67f0ff",
    weaponKind: "bow",
    weaponStyle: "plasma",
    homeX: RINGFORGE_CENTER.x,
    homeY: RINGFORGE_CENTER.y - 6,
    patrolRadius: 1.5,
    npcTheme: "sci-fi",
    sciFiRole: "security",
    sciFiLook: "android",
    dialogue: ["Station defense grid is armed.", "Pirate vectors are tracked.", "Keep clear of cannon arcs."]
  },
  {
    id: "npc_station_guard_e",
    name: "Station Guard",
    classId: "ranger",
    primary: "#24445c",
    accent: "#67f0ff",
    weaponKind: "bow",
    weaponStyle: "plasma",
    homeX: RINGFORGE_CENTER.x + 6,
    homeY: RINGFORGE_CENTER.y,
    patrolRadius: 1.5,
    npcTheme: "sci-fi",
    sciFiRole: "security",
    sciFiLook: "android",
    dialogue: ["Outer ring clear.", "Turrets are slaved to the station core.", "No pirate crosses my scope."]
  },
  {
    id: "npc_station_guard_s",
    name: "Station Guard",
    classId: "ranger",
    primary: "#24445c",
    accent: "#67f0ff",
    weaponKind: "bow",
    weaponStyle: "plasma",
    homeX: RINGFORGE_CENTER.x,
    homeY: RINGFORGE_CENTER.y + 6,
    patrolRadius: 1.5,
    npcTheme: "sci-fi",
    sciFiRole: "security",
    sciFiLook: "android",
    dialogue: ["South battery ready.", "Pirate signatures get one warning.", "The station holds."]
  },
  {
    id: "npc_station_guard_w",
    name: "Station Guard",
    classId: "ranger",
    primary: "#24445c",
    accent: "#67f0ff",
    weaponKind: "bow",
    weaponStyle: "plasma",
    homeX: RINGFORGE_CENTER.x - 6,
    homeY: RINGFORGE_CENTER.y,
    patrolRadius: 1.5,
    npcTheme: "sci-fi",
    sciFiRole: "security",
    sciFiLook: "android",
    dialogue: ["West battery tracking.", "Keep your transponder clean.", "Defense drones are awake."]
  },
  {
    id: "npc_lyra_station",
    name: "Dockmaster Lyra",
    classId: "knight",
    primary: "#243447",
    accent: "#67f0ff",
    homeX: RINGFORGE_CENTER.x - 54,
    homeY: RINGFORGE_CENTER.y - 34,
    patrolRadius: 9,
    npcTheme: "sci-fi",
    sciFiRole: "dockmaster",
    sciFiLook: "android",
    isTrader: true,
    dialogue: [
      "Docking clamps are green. Keep the lane clear.",
      "If you want a ship, talk to me before you wander off.",
      "We keep this station running one airlock at a time.",
      "The bay to the east is for newer hulls and faster exits.",
      "Try not to stand in the hangar lane unless you want a story.",
    ]
  },
  {
    id: "npc_nix_station",
    name: "Engineer Nix",
    classId: "mage",
    primary: "#30415a",
    accent: "#9fefff",
    homeX: RINGFORGE_CENTER.x + 50,
    homeY: RINGFORGE_CENTER.y - 4,
    patrolRadius: 8,
    npcTheme: "sci-fi",
    sciFiRole: "engineer",
    sciFiLook: "alien",
    dialogue: [
      "The conduit lights look clean today. That is a rare joy.",
      "I can hear the whole station through the floor panels.",
      "Re-route the coolant, re-balance the shields, then breathe.",
      "If the lights flicker, that's me fixing the problem.",
      "The spine is stable. The captain can thank me later.",
    ]
  },
  {
    id: "npc_sera_station",
    name: "Medic Sera",
    classId: "ranger",
    primary: "#24303f",
    accent: "#7dd3fc",
    homeX: RINGFORGE_CENTER.x - 54,
    homeY: RINGFORGE_CENTER.y + 18,
    patrolRadius: 7,
    npcTheme: "sci-fi",
    sciFiRole: "medic",
    sciFiLook: "alien",
    dialogue: [
      "If you burn yourself on the drive coils, come straight here.",
      "No blood on the cargo bay floor. I have enough work already.",
      "Clean suits heal faster than dirty ones. That is science.",
      "I stock medgel, stims, and enough bandaging for a bad week.",
      "The station is calmer when the crew drinks water and stops posturing.",
    ]
  },
  {
    id: "npc_orin_station",
    name: "Navigator Orin",
    classId: "mage",
    primary: "#2b3b52",
    accent: "#c4f1ff",
    homeX: RINGFORGE_CENTER.x,
    homeY: RINGFORGE_CENTER.y - 46,
    patrolRadius: 6,
    npcTheme: "sci-fi",
    sciFiRole: "navigator",
    sciFiLook: "android",
    dialogue: [
      "I keep the lanes plotted so the pilots can pretend it was easy.",
      "We have three safe routes and a dozen reckless ones.",
      "Never trust a blank map. The stars are usually lying.",
      "I like the quiet before launch. The whole station listens.",
      "The best journeys start from a station that feels alive.",
    ]
  },
  {
    id: "npc_tess_station",
    name: "Quartermaster Tess",
    classId: "knight",
    primary: "#223044",
    accent: "#fbbf24",
    homeX: RINGFORGE_CENTER.x + 54,
    homeY: RINGFORGE_CENTER.y + 18,
    patrolRadius: 6,
    npcTheme: "sci-fi",
    sciFiRole: "quartermaster",
    sciFiLook: "alien",
    isTrader: true,
    dialogue: [
      "Supplies, ration packs, and replacement gear. No nonsense.",
      "I can outfit a crew in one stop if the credits are right.",
      "Dock first, shop second, complain never.",
      "The station keeps moving because somebody counted the bolts.",
      "If you need something carried or sold, I have a queue for it.",
    ]
  },
  {
    id: "npc_xel_station",
    name: "Xel Korr",
    classId: "mage",
    primary: "#1f3f48",
    accent: "#8affd2",
    homeX: RINGFORGE_CENTER.x - 14,
    homeY: RINGFORGE_CENTER.y + 18,
    patrolRadius: 14,
    npcTheme: "sci-fi",
    sciFiRole: "alien_crew",
    sciFiLook: "alien",
    dialogue: [
      "Your atmosphere mix is loud, but agreeable.",
      "I trade in three currencies and one excellent soup.",
      "The viewport glass sings when haulers pass.",
      "Do not lick the blue conduits. That was a visiting diplomat.",
    ]
  },
  {
    id: "npc_veera_station",
    name: "Vee'ra of the Coil",
    classId: "ranger",
    primary: "#2d3656",
    accent: "#fbcfe8",
    homeX: RINGFORGE_CENTER.x - 34,
    homeY: RINGFORGE_CENTER.y - 24,
    patrolRadius: 8,
    npcTheme: "sci-fi",
    sciFiRole: "alien_vendor",
    sciFiLook: "alien",
    dialogue: [
      "I have six eyes for bargains and seven for trouble.",
      "Photon blades, pulse coils, hull charms. You need at least one.",
      "Human coin is heavy. Digital coin is shy.",
      "The best ships look fast while parked.",
    ]
  },
  {
    id: "npc_rook17_station",
    name: "Rook-17",
    classId: "knight",
    primary: "#293241",
    accent: "#d9fbff",
    homeX: RINGFORGE_CENTER.x + 8,
    homeY: RINGFORGE_CENTER.y + 34,
    patrolRadius: 18,
    npcTheme: "sci-fi",
    sciFiRole: "android_courier",
    sciFiLook: "android",
    dialogue: [
      "Courier route recalculated. Please enjoy the delay.",
      "I have delivered parcels to three moons and one fish tank.",
      "Dock twenty-three smells like hot copper.",
      "Your organic stride is inefficient, but charming.",
    ]
  },
  {
    id: "npc_saal_station",
    name: "Saal Neb",
    classId: "mage",
    primary: "#25394a",
    accent: "#c084fc",
    homeX: RINGFORGE_CENTER.x + 30,
    homeY: RINGFORGE_CENTER.y - 10,
    patrolRadius: 16,
    npcTheme: "sci-fi",
    sciFiRole: "alien_pilgrim",
    sciFiLook: "alien",
    dialogue: [
      "The stars outside this wall are older than all our maps.",
      "A station is a campfire with better doors.",
      "I came to watch ships arrive and left with three new debts.",
      "Your skiff has a brave little engine note.",
    ]
  },
  {
    id: "npc_mira9_station",
    name: "MIRA-9",
    classId: "ranger",
    primary: "#203044",
    accent: "#7dd3fc",
    homeX: RINGFORGE_CENTER.x + 48,
    homeY: RINGFORGE_CENTER.y + 36,
    patrolRadius: 10,
    npcTheme: "sci-fi",
    sciFiRole: "customs_android",
    sciFiLook: "android",
    dialogue: [
      "Customs scan complete. You are only mildly suspicious.",
      "Declare weapons, pets, moons, and haunted artifacts.",
      "The bazaar imports everything except patience.",
      "Dock traffic is currently within acceptable chaos limits.",
    ]
  },
];

const DEFINITIONS = BASE_NPC_DEFINITIONS.concat(
  buildHydratedHubNpcExtras(),
  buildSciFiShopkeeperNpcDefinitions(),
  buildSciFiTrafficNpcDefinitions()
);

const soldCompanionNpcIds = new Set();
const SOCIAL_PAIR_INTERVAL_MS = 9200;
const SOCIAL_NEAR_HOME = 168;
/** Generic lines overheard during NPC→NPC chatter */
const SOCIAL_OVERHEARD = [
  "Any news from the east road?",
  "Hard to believe harvest's almost here.",
  "Keep your cloak dry — drizzle's coming.",
  "The smith's apprentice still burning himself?",
  "…and then I told him, not in my orchard!",
];

let lastNpcSocialAttempt = 0;

function npcPatrolIntersectsBounds(npc, bounds) {
  if (!bounds) {
    return false;
  }
  const pad = 1.5;
  const nx0 = npc.homeX - npc.patrolRadius - pad;
  const nx1 = npc.homeX + npc.patrolRadius + pad;
  const ny0 = npc.homeY - npc.patrolRadius - pad;
  const ny1 = npc.homeY + npc.patrolRadius + pad;
  return !(nx1 < bounds.minX || nx0 > bounds.maxX || ny1 < bounds.minY || ny0 > bounds.maxY);
}

// Runtime NPC state — positions are mutated by AI each tick.
const npcs = DEFINITIONS.map((def) => {
  const idStr = String(def.id ?? "");
  const isPurchasableRomance =
    typeof def.companionPrice === "number" && Boolean(def.courtPlayer) && !def.isTrader;
  const courtAggressive = isPurchasableRomance ? romanceCourtAggressiveFromId(idStr) : false;
  const longHair = isPurchasableRomance && def.bondTag === "gf";
  const romanceSilhouette = longHair ? "soft_curves" : null;
  const npc = {
    ...def,
    courtAggressive,
    longHair,
    romanceSilhouette,
    x: def.homeX + (Math.random() * 2 - 1),
    y: def.homeY + (Math.random() * 2 - 1),
    facing: Number.isFinite(def.facing) ? def.facing : Math.random() * Math.PI * 2,
    moving: false,
    _targetX: def.homeX,
    _targetY: def.homeY,
    _nextMoveAt: Date.now() + Math.random() * MOVE_INTERVAL_MAX,
    _nextChatAt:
      Date.now() +
      CHAT_INTERVAL_MIN +
      Math.random() * (CHAT_INTERVAL_MAX - CHAT_INTERVAL_MIN),
  };
  if (npc.isGateKeeper) {
    npc.x = npc.homeX;
    npc.y = npc.homeY;
    npc._targetX = npc.homeX;
    npc._targetY = npc.homeY;
  }
  if (npc.sciFiShipTraffic) {
    initSciFiTrafficRuntime(npc);
  }
  return npc;
});

const hubLinkedNpcIds = new Set(HUB_NPC_ORDER.map((entry) => entry.id));

/** Keep road-following walkers aligned once homes move beside doors. */
function refreshHubPathFollowingFlags() {
  const hubBubble = Number(WORLD.HUB_TOWN_GRASS_RADIUS || 132) - 11;
  for (const n of npcs) {
    const idStr = typeof n.id === "string" ? n.id : "";
    let follow = false;
    if (idStr.startsWith("hub_m_") || idStr.startsWith("hub_seek_") || idStr.startsWith("hub_g_")) {
      follow = !soldCompanionNpcIds.has(idStr);
    } else if (hubLinkedNpcIds.has(idStr)) {
      if (!(n.isTrader && n.patrolRadius <= 1.251)) {
        follow = Math.hypot(n.homeX, n.homeY) <= hubBubble && Number(n.patrolRadius ?? 0) >= 3;
      }
    }
    n._followHubPaths = follow;
  }

  const tHub = Date.now();
  for (const n of npcs) {
    if (!n._followHubPaths || soldCompanionNpcIds.has(n.id)) {
      continue;
    }
    /** First patrol leg should start quickly so the hub does not look deserted on join. */
    n._nextMoveAt = Math.min(
      n._nextMoveAt,
      tHub +
        HUB_PATH_MOVE_INTERVAL_MIN +
        Math.random() * (HUB_PATH_MOVE_INTERVAL_MAX - HUB_PATH_MOVE_INTERVAL_MIN)
    );
  }
}

refreshHubPathFollowingFlags();

/** Repoint villagers + romance NPCs toward their shack door after hub regeneration. */
function syncNpcHubHomesFromBuildings(buildings, southDoorAnchorWorldXFn) {
  if (typeof southDoorAnchorWorldXFn !== "function" || !buildings?.length) {
    return;
  }

  for (const b of buildings) {
    const nid = b?.npcAttachId;
    if (typeof nid !== "string") {
      continue;
    }
    const n = npcs.find((z) => z.id === nid);
    if (!n) {
      continue;
    }
    const hx = southDoorAnchorWorldXFn(b);
    const hy = b.y + b.h + 0.35;

    const defObj = DEFINITIONS.find((d) => d.id === nid);
    if (defObj) {
      defObj.homeX = hx;
      defObj.homeY = hy;
    }
    n.homeX = hx;
    n.homeY = hy;
    invalidateNpcHubRoadPath(n);
    n._targetX = hx;
    n._targetY = hy;
    n.x = hx + Math.random() * 0.7 - 0.35;
    n.y = hy + Math.random() * 0.45 + 0.04;
    const tn = Date.now();
    if (hubScheduleEligible(n)) {
      n._schedPhase = SCHED_HOME;
      n._schedUntil = tn + 200 + (((npcIdHashSeed(`${String(n.id)}|rs`) >>> 0) % 500));
      n._schedRoamGoal = 2;
      n._schedDoneRoam = 0;
      n._schedMingleUntil = 0;
    }
  }
  refreshHubPathFollowingFlags();
  const navSnap = WORLD.HUB_NAV_PATH_KEYS instanceof Set ? WORLD.HUB_NAV_PATH_KEYS : null;
  if (navSnap) {
    for (const n of npcs) {
      snapNpcOntoHubNavIfNeeded(n, navSnap);
    }
  }
}

function syncSoldCompanionIdsFromAccounts(accountsRoot) {
  soldCompanionNpcIds.clear();
  if (!accountsRoot || typeof accountsRoot !== "object") {
    return;
  }
  for (const account of Object.values(accountsRoot)) {
    const id = account?.character?.houseCompanion?.npcId;
    if (typeof id === "string") {
      soldCompanionNpcIds.add(id.slice(0, 96));
    }
  }
}

function registerCompanionSold(npcId) {
  if (typeof npcId === "string") {
    soldCompanionNpcIds.add(npcId.slice(0, 96));
  }
}

function unregisterCompanionSold(npcId) {
  if (typeof npcId === "string") {
    soldCompanionNpcIds.delete(npcId.slice(0, 96));
  }
}

function pickHouseCompanionComplimentLine(hc) {
  if (!hc || typeof hc !== "object") {
    return "You belong here — with me.";
  }
  const id = typeof hc.npcId === "string" ? hc.npcId : "c";
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) >>> 0;
  }
  const lines = hc.bondTag === "bf" ? HOME_COMPLIMENT_BF : HOME_COMPLIMENT_GF;
  return lines[h % lines.length] || lines[0];
}

function getNpcBuddy(npc) {
  if (!npc?._meetPeerId) {
    return null;
  }
  return npcs.find((n) => n.id === npc._meetPeerId) || null;
}

/** Try to arrange a short meet-up dialogue between two patrolling villagers. */
function maybeStartNpcMeeting(now, activationBounds) {
  if (!activationBounds || now - lastNpcSocialAttempt < SOCIAL_PAIR_INTERVAL_MS) {
    return;
  }
  lastNpcSocialAttempt = now;
  if (Math.random() > 0.35) {
    return;
  }

  const cand = npcs.filter(
    (n) =>
      npcPatrolIntersectsBounds(n, activationBounds) &&
      !n.isTrader &&
      !n.courtPlayer &&
      typeof n.companionPrice !== "number" &&
      !soldCompanionNpcIds.has(n.id) &&
      !n._meetPeerId &&
      n.patrolRadius >= 5 &&
      Math.hypot(n.homeX, n.homeY) <= SOCIAL_NEAR_HOME &&
      (!hubScheduleEligible(n) || n._schedPhase === SCHED_TOWN || n._schedPhase === SCHED_PUB)
  );
  if (cand.length < 2) {
    return;
  }

  shuffleInPlace(cand);
  let a = null;
  let b = null;
  for (let i = 0; i < cand.length && !b; i += 1) {
    for (let j = i + 1; j < cand.length; j += 1) {
      if (Math.hypot(cand[i].homeX - cand[j].homeX, cand[i].homeY - cand[j].homeY) < 76) {
        a = cand[i];
        b = cand[j];
        break;
      }
    }
  }
  if (!a || !b) {
    return;
  }

  const meetX = (a.x + b.x) / 2;
  const meetY = (a.y + b.y) / 2;

  let mx = meetX + (Math.random() * 1.8 - 0.9);
  let my = meetY + (Math.random() * 1.8 - 0.9);
  if (!isBlockedCircle(mx, my)) {
    a._meetPeerId = b.id;
    b._meetPeerId = a.id;
    a._meetPhase = "walk";
    b._meetPhase = "walk";
    a._meetEndAt = now + 5000;
    b._meetEndAt = now + 5000;
    a._meetNextLineAt = now + 2200;
    b._meetNextLineAt = now + 2200 + 550;
    a._meetTurnSpeaker = Math.random() < 0.5 ? a.id : b.id;

    mx = clampMeet(mx);
    my = clampMeet(my);
    a._targetX = mx + 0.35;
    a._targetY = my;
    b._targetX = mx - 0.35;
    b._targetY = my;
    a._meetMidX = mx;
    b._meetMidX = mx;
    a._meetMidY = my;
    b._meetMidY = my;
    /** Do not push _nextMoveAt far ahead — it suppresses patrol for a long time after the chat ends. */
  }
}

function clampMeet(value) {
  return Math.round(value * 40) / 40;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function clearMeeting(npc) {
  const buddy = getNpcBuddy(npc);
  const resume = Date.now();
  invalidateNpcHubRoadPath(npc);
  npc._meetPeerId = undefined;
  npc._meetPhase = undefined;
  npc._meetEndAt = undefined;
  npc._meetNextLineAt = undefined;
  npc._meetTurnSpeaker = undefined;
  npc._meetMidX = undefined;
  npc._meetMidY = undefined;
  npc._nextMoveAt = resume;
  if (buddy) {
    invalidateNpcHubRoadPath(buddy);
    buddy._meetPeerId = undefined;
    buddy._meetPhase = undefined;
    buddy._meetEndAt = undefined;
    buddy._meetNextLineAt = undefined;
    buddy._meetTurnSpeaker = undefined;
    buddy._meetMidX = undefined;
    buddy._meetMidY = undefined;
    buddy._nextMoveAt = resume;
  }
}

/** Advance scripted meet phases and timed lines. Returns true while npc is in a pairing. */
function tickNpcMeeting(npc, now, dt, onChat) {
  if (!npc._meetPeerId || !npc._meetPhase || !npc._meetEndAt) {
    return false;
  }

  const buddy = getNpcBuddy(npc);
  if (!buddy || now >= npc._meetEndAt) {
    clearMeeting(npc);
    return false;
  }

  if (npc.id > buddy.id) {
    /** Only buddy with lexicographically lower id advances pair chatter to avoid duplication */
    return npc._meetPhase === "talk";
  }

  if (npc._meetPhase === "walk") {
    const midOk =
      typeof npc._meetMidX === "number" &&
      typeof npc._meetMidY === "number" &&
      Math.hypot(npc.x - npc._meetMidX, npc.y - npc._meetMidY) < 0.55 &&
      Math.hypot(buddy.x - npc._meetMidX, buddy.y - npc._meetMidY) < 0.55;
    if (midOk || now > npc._meetEndAt - 4500) {
      npc._meetPhase = "talk";
      buddy._meetPhase = "talk";
      npc.x = npc._meetMidX + 0.3;
      npc.y = npc._meetMidY;
      buddy.x = npc._meetMidX - 0.3;
      buddy.y = npc._meetMidY;
      npc.moving = false;
      buddy.moving = false;
      npc._targetX = npc.x;
      npc._targetY = npc.y;
      buddy._targetX = buddy.x;
      buddy._targetY = buddy.y;
      npc._meetTurnSpeaker =
        npc._meetTurnSpeaker === buddy.id ? buddy.id : npc.id;
    }
  }

  if (npc._meetPhase === "talk" && now >= npc._meetNextLineAt && now < npc._meetEndAt - 400) {
    const speaker =
      npc._meetTurnSpeaker === buddy.id ? buddy : npc;
    const linePick =
      Math.random() < 0.55
        ? SOCIAL_OVERHEARD[Math.floor(Math.random() * SOCIAL_OVERHEARD.length)]
        : speaker.dialogue[Math.floor(Math.random() * speaker.dialogue.length)];
    onChat({
      kind: "npc",
      fromId: speaker.id,
      name: speaker.name,
      text: linePick,
      x: speaker.x,
      y: speaker.y,
      social: true
    });
    npc._meetTurnSpeaker = speaker.id === buddy.id ? npc.id : buddy.id;
    npc._meetNextLineAt = now + 3200 + Math.random() * 2200;
    buddy._meetNextLineAt = npc._meetNextLineAt;
  }

  return npc._meetPhase === "talk";
}

/**
 * Romantic companion NPC seeks homeowners; offer only after player stood still ≥3s in earshot.
 * @returns {boolean} true if court AI took over npc movement targeting this tick
 */
function applyCompanionCourt(npc, companionCtx, onChat, now) {
  if (!companionCtx || typeof npc.companionPrice !== "number" || soldCompanionNpcIds.has(npc.id)) {
    return false;
  }
  if ((npc._shooedUntil || 0) > now) {
    return false;
  }
  if (!npc.courtAggressive) {
    return false;
  }
  if (npc._meetPeerId) {
    return false;
  }

  let best = null;
  let bestD = Infinity;
  for (const row of companionCtx.targets) {
    const p = row.player;
    if (!p?.homeBuildingKey || p.houseCompanion) {
      continue;
    }
    const dx = npc.x - p.x;
    const dy = npc.y - p.y;
    const dd = dx * dx + dy * dy;
    if (dd < bestD) {
      bestD = dd;
      best = row;
    }
  }

  const COURT_RANGE = 32;
  if (!best || bestD > COURT_RANGE * COURT_RANGE) {
    npc._courtOfferLatch = false;
    npc._courtLineAt = 0;
    return false;
  }

  const px = best.player.x;
  const py = best.player.y;
  const angle = Math.atan2(py - npc.y, px - npc.x);
  npc._targetX = px - Math.cos(angle) * 1.52;
  npc._targetY = py - Math.sin(angle) * 1.52;

  const hear = Math.hypot(npc.x - px, npc.y - py) < 2.35;
  const still = Number(best.stillAccumulator) || 0;

  if (!hear || still < 0.75) {
    npc._courtOfferLatch = false;
  }

  if (
    hear &&
    still >= 3 &&
    !best.player.houseCompanion &&
    !npc._courtOfferLatch &&
    (npc._courtOfferCooldownUntil || 0) <= now
  ) {
    npc._courtOfferCooldownUntil = now + 75000;
    npc._courtOfferLatch = true;
    if (typeof companionCtx.tryOffer === "function") {
      companionCtx.tryOffer(npc, best);
    }
  }

  if (hear && now - (npc._courtLineAt || 0) > 7400) {
    npc._courtLineAt = now;
    const flirt = npc.dialogue[Math.floor(Math.random() * npc.dialogue.length)];
    onChat({
      kind: "npc",
      fromId: npc.id,
      name: npc.name,
      text: flirt,
      x: npc.x,
      y: npc.y
    });
  }

  return true;
}

/**
 * Returns an attraction score for a player based on their level and armour.
 * Score range: 1 (bare level-1) to 9 (high level + full armour).
 */
function playerAttractionScore(player) {
  const level = Math.max(1, player.level || 1);
  const levelBonus = Math.min(5, Math.floor(level / 4));
  const eq = player.equipment || {};
  const armorFilled = ["chest", "legs", "head", "hands", "feet"].filter(s => eq[s] != null).length;
  const armorBonus = Math.min(3, Math.floor(armorFilled * 3 / 5));
  return 1 + levelBonus + armorBonus;
}

const APPROACH_ORBIT_RADIUS = 2.0;
const APPROACH_GIVE_UP_MS = 20000;
const APPROACH_COOLDOWN_MS = 45000;

/**
 * Picks a position on the orbit circle around (tx, ty) for this NPC that
 * avoids clustering with other approaching NPCs. Each NPC has a seed-derived
 * preferred slot (1 of 8 at 45° intervals); if that slot is taken the NPC
 * tries adjacent slots until one is clear (min 1.4 tiles from neighbours).
 */
function orbitSlotPosition(npc, tx, ty) {
  const seed = npcIdHashSeed(npc.id);
  const preferredSlot = seed % 8;
  for (let attempt = 0; attempt < 8; attempt++) {
    const slot = (preferredSlot + attempt) % 8;
    const angle = slot * (Math.PI / 4);
    const cx = tx + Math.cos(angle) * APPROACH_ORBIT_RADIUS;
    const cy = ty + Math.sin(angle) * APPROACH_ORBIT_RADIUS;
    let clear = true;
    for (const n of npcs) {
      if (n === npc) continue;
      if (!n.wandersToFlirt && !n.wandersToPlayer) continue;
      if (Math.hypot(n.x - cx, n.y - cy) < 1.4) { clear = false; break; }
    }
    if (clear) return { angle, cx, cy };
  }
  // All slots occupied — keep preferred slot anyway
  const angle = preferredSlot * (Math.PI / 4);
  return { angle, cx: tx + Math.cos(angle) * APPROACH_ORBIT_RADIUS, cy: ty + Math.sin(angle) * APPROACH_ORBIT_RADIUS };
}

/** Shared give-up / return-home logic used by both approach functions. */
function approachGiveUp(npc, now) {
  npc._engagedAt = null;
  npc._givenUpUntil = now + APPROACH_COOLDOWN_MS;
  npc._targetX = npc.homeX;
  npc._targetY = npc.homeY;
  invalidateNpcHubRoadPath(npc);
}

/**
 * Flirt follower: NPC stays with the player indefinitely (no give-up, no cost).
 * Used when a player pursues a flirt walker but has no house yet.
 */
function applyFollowPlayer(npc, player, onChat, now) {
  const dx = player.x - npc.x;
  const dy = player.y - npc.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 2.5) {
    const angle = Math.atan2(dy, dx);
    npc._targetX = player.x - Math.cos(angle) * 2.0;
    npc._targetY = player.y - Math.sin(angle) * 2.0;
    invalidateNpcHubRoadPath(npc);
  }

  if (dist < 3 && now - (npc._flirtLineAt || 0) > 12000) {
    npc._flirtLineAt = now;
    const line = npc.dialogue[Math.floor(Math.random() * npc.dialogue.length)];
    onChat({ kind: "npc", fromId: npc.id, name: npc.name, text: line, x: npc.x, y: npc.y });
  }

  return dist > 1.5;
}

/**
 * Flirt-walker NPC approaches the most attractive player within range.
 * Range and pickiness both scale with playerAttractionScore.
 * NPCs orbit around the player rather than stacking, and give up after 20 s.
 * @returns {boolean} true if the NPC is steering toward a player this tick
 */
function applyFlirtApproach(npc, companionCtx, onChat, now) {
  if (!npc.wandersToFlirt || !companionCtx?.allPlayers) return false;
  if ((npc._shooedUntil || 0) > now || (npc._givenUpUntil || 0) > now) {
    npc._engagedAt = null;
    npc._targetX = npc.homeX;
    npc._targetY = npc.homeY;
    invalidateNpcHubRoadPath(npc);
    return false;
  }
  if (npc._meetPeerId) return false;

  const threshold = (npcIdHashSeed(npc.id) % 5) + 1;

  let best = null;
  let bestScore = 0;
  for (const { player: p } of companionCtx.allPlayers) {
    const score = playerAttractionScore(p);
    if (score < threshold) continue;
    const range = Math.min(38, 8 + score * 3.2);
    const dsq = (npc.x - p.x) ** 2 + (npc.y - p.y) ** 2;
    if (dsq > range * range) continue;
    if (score > bestScore) { bestScore = score; best = p; }
  }

  if (!best) {
    npc._engagedAt = null;
    return false;
  }

  const dx = best.x - npc.x;
  const dy = best.y - npc.y;
  const dist = Math.hypot(dx, dy);

  // Start engagement timer once within talking range
  if (dist < 3.0 && !npc._engagedAt) npc._engagedAt = now;
  if (npc._engagedAt && now - npc._engagedAt > APPROACH_GIVE_UP_MS) {
    approachGiveUp(npc, now);
    return false;
  }

  if (dist > 2.2) {
    let tx, ty;
    if (dist > 5) {
      // Still far — head straight toward player
      const angle = Math.atan2(dy, dx);
      tx = best.x - Math.cos(angle) * APPROACH_ORBIT_RADIUS;
      ty = best.y - Math.sin(angle) * APPROACH_ORBIT_RADIUS;
    } else {
      // Close — arc toward NPC's unique orbit slot to avoid stacking
      const slot = orbitSlotPosition(npc, best.x, best.y);
      tx = slot.cx;
      ty = slot.cy;
    }
    npc._targetX = tx;
    npc._targetY = ty;
    invalidateNpcHubRoadPath(npc);
  }

  if (dist < 2.5 && now - (npc._flirtLineAt || 0) > 8500) {
    npc._flirtLineAt = now;
    const line = npc.dialogue[Math.floor(Math.random() * npc.dialogue.length)];
    onChat({ kind: "npc", fromId: npc.id, name: npc.name, text: line, x: npc.x, y: npc.y });
  }

  return dist > 1.6;
}

/**
 * Wandering hawker NPC approaches the nearest player within 28 tiles.
 * Orbits the player to avoid stacking; gives up after 20 s close contact.
 * @returns {boolean} true if hawker AI steered the NPC this tick
 */
function applyHawkerApproach(npc, companionCtx, onChat, now) {
  if (!npc.wandersToPlayer || !companionCtx?.allPlayers) return false;
  if ((npc._shooedUntil || 0) > now || (npc._givenUpUntil || 0) > now) {
    npc._engagedAt = null;
    npc._targetX = npc.homeX;
    npc._targetY = npc.homeY;
    invalidateNpcHubRoadPath(npc);
    return false;
  }

  let best = null;
  let bestDsq = 28 * 28;
  for (const { player: p } of companionCtx.allPlayers) {
    const ddx = npc.x - p.x;
    const ddy = npc.y - p.y;
    const dsq = ddx * ddx + ddy * ddy;
    if (dsq < bestDsq) { bestDsq = dsq; best = p; }
  }
  if (!best) {
    npc._engagedAt = null;
    return false;
  }

  const dx = best.x - npc.x;
  const dy = best.y - npc.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 3.0 && !npc._engagedAt) npc._engagedAt = now;
  if (npc._engagedAt && now - npc._engagedAt > APPROACH_GIVE_UP_MS) {
    approachGiveUp(npc, now);
    return false;
  }

  if (dist > 2.2) {
    let tx, ty;
    if (dist > 5) {
      const angle = Math.atan2(dy, dx);
      tx = best.x - Math.cos(angle) * APPROACH_ORBIT_RADIUS;
      ty = best.y - Math.sin(angle) * APPROACH_ORBIT_RADIUS;
    } else {
      const slot = orbitSlotPosition(npc, best.x, best.y);
      tx = slot.cx;
      ty = slot.cy;
    }
    npc._targetX = tx;
    npc._targetY = ty;
    invalidateNpcHubRoadPath(npc);
  }

  if (dist < 2.5 && now - (npc._hawkLineAt || 0) > 9000) {
    npc._hawkLineAt = now;
    const line = npc.dialogue[Math.floor(Math.random() * npc.dialogue.length)];
    onChat({ kind: "npc", fromId: npc.id, name: npc.name, text: line, x: npc.x, y: npc.y });
  }

  return dist > 1.6;
}

function updateNpcs(dt, onChat, activationBounds, companionCtx = null) {
  if (!activationBounds) {
    return;
  }

  // Advance game clock
  hubGameHour = (hubGameHour + dt * GAME_HOURS_PER_SEC) % 24;

  const now = Date.now();
  /** Social pairing checks _schedPhase; ensure schedules exist before maybeStartNpcMeeting runs. */
  for (const n of npcs) {
    if (npcPatrolIntersectsBounds(n, activationBounds) && hubScheduleEligible(n)) {
      hubScheduleEnsureInit(n, now);
    }
  }
  maybeStartNpcMeeting(now, activationBounds);

  const navSetStatic = WORLD.HUB_NAV_PATH_KEYS instanceof Set ? WORLD.HUB_NAV_PATH_KEYS : null;

  for (const npc of npcs) {
    if (!npcPatrolIntersectsBounds(npc, activationBounds)) {
      continue;
    }

    if (npc.isGateKeeper) {
      npc.x = npc.homeX;
      npc.y = npc.homeY;
      npc._targetX = npc.homeX;
      npc._targetY = npc.homeY;
      npc.moving = false;
      continue;
    }

    if (npc.sciFiShipTraffic) {
      tickSciFiTraffic(npc, dt, now);
      continue;
    }

    /** Retired romance NPCs idle at template home (clients see them only inside your house). */
    if (soldCompanionNpcIds.has(npc.id)) {
      npc.moving = false;
      npc.x = npc.homeX;
      npc.y = npc.homeY;
      npc._targetX = npc.x;
      npc._targetY = npc.y;
      continue;
    }

    if (hubScheduleEligible(npc)) {
      tickNpcStuckCheck(npc, now, navSetStatic);
    }

    const inMeetTalk = tickNpcMeeting(npc, now, dt, onChat);
    let courtSteers = false;
    if (npc.wandersToPlayer) {
      courtSteers = applyHawkerApproach(npc, companionCtx, onChat, now);
    } else if (npc.wandersToFlirt) {
      const followerRow = companionCtx?.allPlayers?.find(
        row => row.player.flirtFollowNpcId === npc.id
      );
      if (followerRow) {
        courtSteers = applyFollowPlayer(npc, followerRow.player, onChat, now);
      } else {
        courtSteers = applyFlirtApproach(npc, companionCtx, onChat, now);
      }
    } else if (companionCtx && typeof npc.companionPrice === "number") {
      courtSteers = applyCompanionCourt(npc, companionCtx, onChat, now);
    }

    if (inMeetTalk) {
      continue;
    }

    const loveSeeking =
      Boolean(npc.courtPlayer) &&
      typeof npc.companionPrice === "number" &&
      !soldCompanionNpcIds.has(npc.id);
    const socialWalkTowardPeer = npc._meetPeerId && npc._meetPhase === "walk";
    /** Do not yank meet-up approachers / aggressive suitors off their scripted pathing. */
    const skipNavSnap =
      (npc._meetPeerId && npc._meetPhase === "walk") || courtSteers;
    if (!skipNavSnap) {
      snapNpcOntoHubNavIfNeeded(npc, navSetStatic);
    }

    const gridPathsOk =
      npc._followHubPaths &&
      navSetStatic &&
      navSetStatic.size > 96 &&
      !(loveSeeking && courtSteers) &&
      !(socialWalkTowardPeer);

    const dx = npc._targetX - npc.x;
    const dy = npc._targetY - npc.y;
    const dist = Math.hypot(dx, dy);

    if (dist < NPC_STOP_DISTANCE) {
      npc.moving = false;

      const socialWalk = npc._meetPeerId && npc._meetPhase === "walk";
      hubScheduleEnsureInit(npc, now);
      const hubSchedActive =
        hubScheduleEligible(npc) && !(courtSteers && loveSeeking) && !socialWalk;

      if (!(courtSteers || socialWalk) && hubSchedActive) {
        hubScheduleAdvance(npc, now, navSetStatic);
        // Safety net: if the schedule still left us with no new target (nav unavailable,
        // all paths failed, etc.), fall through to a simple open-space patrol so the NPC
        // never freezes indefinitely even without a working nav mesh.
        const stillHere =
          Math.hypot(npc._targetX - npc.x, npc._targetY - npc.y) < NPC_STOP_DISTANCE;
        if (stillHere && npc._schedPhase !== SCHED_SLEEP && now >= npc._nextMoveAt) {
          const fallback = chooseOpenPatrolTarget(npc);
          if (fallback) {
            npc._targetX = fallback.tx;
            npc._targetY = fallback.ty;
            invalidateNpcHubRoadPath(npc);
          }
          scheduleNpcNextPatrol(npc);
        }
      } else if (
        !(courtSteers || socialWalk) &&
        now >= npc._nextMoveAt &&
        !soldCompanionNpcIds.has(npc.id) &&
        !hubSchedActive
      ) {
        let tx;
        let ty;
        const crowdBrowsing =
          HUB_MARKET_BROWSE_WAYPOINTS.length &&
          npc._followHubPaths &&
          (npc.id.startsWith("hub_m_") || npc.id.startsWith("hub_seek_")) &&
          !npc.isTrader &&
          Math.random() < 0.15;
        const hubPick =
          !crowdBrowsing &&
          npc._followHubPaths &&
          npc.patrolRadius >= 0.98
            ? sampleHubPatrolWaypoint(npc, navSetStatic)
            : null;
        if (crowdBrowsing) {
          const bi =
            Math.abs(npcIdHashSeed(`${npc.id}|stall|${Math.floor(now / 5800)}`)) %
            HUB_MARKET_BROWSE_WAYPOINTS.length;
          const wp = HUB_MARKET_BROWSE_WAYPOINTS[bi];
          tx = wp.tx;
          ty = wp.ty;
        } else if (hubPick) {
          ({ tx: tx, ty: ty } = hubPick);
        } else {
          const patrolTarget = chooseOpenPatrolTarget(npc);
          if (patrolTarget) {
            ({ tx: tx, ty: ty } = patrolTarget);
          }
        }

        if (
          Number.isFinite(tx) &&
          Number.isFinite(ty) &&
          npc._followHubPaths &&
          navSetStatic instanceof Set &&
          navSetStatic.size > 96 &&
          !navSetStatic.has(hubTileKey(tx, ty))
        ) {
          const nt = nearestHubNavTile(tx, ty, navSetStatic);
          if (nt) {
            tx = nt.tx + 0.5;
            ty = nt.ty + 0.5;
          }
        }

        if (Number.isFinite(tx) && Number.isFinite(ty) && !isBlockedCircle(tx, ty)) {
          invalidateNpcHubRoadPath(npc);
          npc._targetX = tx;
          npc._targetY = ty;
        }

        scheduleNpcNextPatrol(npc);
      }
    } else {
      const nx = dx / dist;
      const ny = dy / dist;
      const step = Math.min(NPC_SPEED * dt, dist);

      if (!gridPathsOk) {
        const startX = npc.x;
        const startY = npc.y;
        const nextX = npc.x + nx * step;
        const nextY = npc.y + ny * step;

        if (!isBlockedCircle(nextX, npc.y)) {
          npc.x = nextX;
        } else if (!soldCompanionNpcIds.has(npc.id)) {
          npc._targetX = npc.homeX;
        }

        if (!isBlockedCircle(npc.x, nextY)) {
          npc.y = nextY;
        } else if (!soldCompanionNpcIds.has(npc.id)) {
          npc._targetY = npc.homeY;
        }

        npc.facing = Math.atan2(ny, nx);
        npc.moving = Math.hypot(npc.x - startX, npc.y - startY) > NPC_STUCK_EPSILON;
        if (!npc.moving && !soldCompanionNpcIds.has(npc.id)) {
          stopNpcAfterBlockedStep(npc);
        }
      } else {
        let movedGrid = stepNpcAlongHubRoadPath(npc, navSetStatic, dt);
        if (!movedGrid) {
          invalidateNpcHubRoadPath(npc);
          if (!soldCompanionNpcIds.has(npc.id)) {
            if (
              hubScheduleEligible(npc) &&
              navSetStatic instanceof Set &&
              navSetStatic.size > 96
            ) {
              const mx = npc.x + (npc._targetX - npc.x) * 0.42;
              const my = npc.y + (npc._targetY - npc.y) * 0.42;
              const nt = nearestHubNavTile(mx, my, navSetStatic);
              if (nt) {
                npc._targetX = nt.tx + 0.5;
                npc._targetY = nt.ty + 0.5;
              } else {
                npc._targetX = npc.homeX + (Math.random() * 2 - 1) * 0.06;
                npc._targetY = npc.homeY + (Math.random() * 2 - 1) * 0.06;
              }
            } else {
              npc._targetX = npc.homeX + (Math.random() * 2 - 1) * 0.06;
              npc._targetY = npc.homeY + (Math.random() * 2 - 1) * 0.06;
            }
          }
          npc.facing = Math.atan2(ny, nx);
          npc.moving = false;
        }
      }
    }

    if (
      hubScheduleEligible(npc) &&
      npc._schedLegAnchorX !== undefined &&
      !npc._schedLegMoved
    ) {
      if (
        Math.hypot(npc.x - npc._schedLegAnchorX, npc.y - npc._schedLegAnchorY) > 0.22
      ) {
        npc._schedLegMoved = true;
      }
    }

    const skipSoloRamble =
      (typeof npc.companionPrice === "number" && !soldCompanionNpcIds.has(npc.id)) ||
      Boolean(npc._meetPeerId) ||
      npc._schedPhase === SCHED_SLEEP;

    if (!skipSoloRamble && now >= npc._nextChatAt) {
      const line = npc.dialogue[Math.floor(Math.random() * npc.dialogue.length)];
      onChat({ kind: "npc", fromId: npc.id, name: npc.name, text: line, x: npc.x, y: npc.y });
      npc._nextChatAt =
        now +
        CHAT_INTERVAL_MIN +
        Math.random() * (CHAT_INTERVAL_MAX - CHAT_INTERVAL_MIN);
    }
  }
}

function getWorldTimeSnapshot() {
  const hour = ((hubGameHour % 24) + 24) % 24;
  let phase = "day";
  if (isNightHour(hour)) {
    phase = "night";
  } else if (hour >= 6 && hour < 8) {
    phase = "dawn";
  } else if (hour >= 18 && hour < 22) {
    phase = "dusk";
  }
  return {
    hour: Number(hour.toFixed(3)),
    phase
  };
}

function setWorldTimeHour(hour) {
  const value = Number(hour);
  if (!Number.isFinite(value)) {
    return getWorldTimeSnapshot();
  }
  hubGameHour = ((value % 24) + 24) % 24;
  return getWorldTimeSnapshot();
}

function getNpcSnapshot() {
  return npcs
    .filter((npc) => !soldCompanionNpcIds.has(npc.id))
    .map((npc) => ({
      id: npc.id,
      name: npc.name,
      classId: npc.classId,
      primary: npc.primary,
      accent: npc.accent,
      ...(npc.weaponKind ? { weaponKind: npc.weaponKind } : {}),
      ...(npc.weaponStyle ? { weaponStyle: npc.weaponStyle } : {}),
      ...(npc.npcTheme ? { npcTheme: npc.npcTheme } : {}),
      ...(npc.sciFiLook ? { sciFiLook: npc.sciFiLook } : {}),
      ...(npc.sciFiRole ? { sciFiRole: npc.sciFiRole } : {}),
      ...(npc.ship
        ? {
            ship: {
              templateId: typeof npc.ship.templateId === "string" ? npc.ship.templateId : "npc_ship",
              name: typeof npc.ship.name === "string" ? npc.ship.name : "NPC Ship",
              color: typeof npc.ship.color === "string" ? npc.ship.color : npc.accent,
              hullClass: typeof npc.ship.hullClass === "string" ? npc.ship.hullClass : "skiff",
              boarded: Boolean(npc.ship.boarded),
              dockX: Number(npc.ship.dockX),
              dockY: Number(npc.ship.dockY),
              dockStationId: typeof npc.ship.dockStationId === "string" ? npc.ship.dockStationId : "station_ringforge",
              dockPortId: typeof npc.ship.dockPortId === "string" ? npc.ship.dockPortId : null,
              speed: Number(npc.ship.speed) || 9,
              laserTier: Number(npc.ship.laserTier) || 1,
              thrustTier: Number(npc.ship.thrustTier) || 1
            }
          }
        : {}),
      x: Number(npc.x.toFixed(3)),
      y: Number(npc.y.toFixed(3)),
      facing: Number(npc.facing.toFixed(3)),
      moving: npc.moving,
      isTrader: npc.isTrader || false,
      ...(npc.isGateKeeper ? { isGateKeeper: true } : {}),
      ...(npc.questGiver ? { questGiver: true, questIds: Array.isArray(npc.questIds) ? npc.questIds : [] } : {}),
      ...(npc.bondTag ? { bondTag: npc.bondTag } : {}),
      ...(npc.longHair ? { longHair: true } : {}),
      ...(npc.romanceSilhouette ? { romanceSilhouette: npc.romanceSilhouette } : {}),
      ...(npc.wandersToPlayer ? { wandersToPlayer: true } : {}),
      ...(npc.wandersToFlirt ? { wandersToFlirt: true } : {})
    }));
}

function getNpcById(id) {
  return npcs.find((npc) => npc.id === id) || null;
}

/** Template for romance NPCs — works even after that NPC is retired from world patrol. */
function getCompanionNpcTemplate(id) {
  if (typeof id !== "string") {
    return null;
  }
  return DEFINITIONS.find((d) => d.id === id && typeof d.companionPrice === "number") || null;
}

/** Random eligible girlfriend companion for bar “dream hangover”; prefers NPCs still in the world roster. */
function pickPubDreamGirlfriendNpcId() {
  const gfs = DEFINITIONS.filter(
    (d) => d.courtPlayer && d.bondTag === "gf" && typeof d.companionPrice === "number"
  );
  if (!gfs.length) {
    return null;
  }
  const unsold = gfs.filter((d) => !soldCompanionNpcIds.has(d.id));
  const pool = unsold.length ? unsold : gfs;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return pick.id;
}

function getTraderDefinitions() {
  return DEFINITIONS.filter((d) => d.isTrader);
}

module.exports = {
  updateNpcs,
  getNpcSnapshot,
  getNpcById,
  getTraderDefinitions,
  syncNpcHubHomesFromBuildings,
  syncSoldCompanionIdsFromAccounts,
  registerCompanionSold,
  unregisterCompanionSold,
  pickHouseCompanionComplimentLine,
  getCompanionNpcTemplate,
  pickPubDreamGirlfriendNpcId,
  getWorldTimeSnapshot,
  setWorldTimeHour
};
