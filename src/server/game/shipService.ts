// Ships: the hangar (buy / pick / upgrade), launching and docking, warp jumps, boost, hull and
// shield damage, repair kits, drone turrets and discovering points of interest in space.

import {
  BOOST_COOLDOWN_MS,
  BOOST_MS,
  HULLS,
  HULL_IDS,
  LASER_RANGE,
  LASER_SPEED,
  MAX_UPGRADE,
  UPGRADE_INFO,
  UPGRADE_PRICES,
  UPGRADE_SLOTS,
  WARP_CHARGE_MS,
  shipStats,
  type HullId,
  type UpgradeSlot
} from "../../shared/game/ships";
import { DISCOVER_RANGE, DOCK_RANGE, LAUNCH_POINT, POIS, POIS_BY_ID, poiArrival, poiNear } from "../../shared/world/scifi/space";
import { LAUNCH_PAD } from "../../shared/world/scifi/station";
import { PAD_RADIUS, PLANET_PAD, PLANETS, parsePlanetMapId } from "../../shared/world/scifi/planets";
import { dist } from "../../shared/math";
import type { C2S } from "../../shared/protocol";
import type { Mob, Player, ShipState } from "./entities";
import type { World } from "./world";

const HANGAR_RANGE = 4;
const WARP_COMBAT_LOCK_MS = 4000;
const SHIELD_DELAY_MS = 3000;
const TURRET_RANGE = 16;
const TURRET_MS = 700;

export interface ShipContext {
  transfer(p: Player, mapId: string, x: number, y: number): void;
  world(mapId: string): World;
}

export class ShipService {
  constructor(private ctx: ShipContext) {}

  // ── ownership & hangar ─────────────────────────────────────────────────────

  grant(p: Player, hull: string): string | null {
    if (!HULL_IDS.includes(hull as HullId)) return null;
    const id = hull as HullId;
    if (!p.save.ships.includes(id)) p.save.ships.push(id);
    if (!p.save.activeShip) p.save.activeShip = id;
    p.selfDirty = p.saveDirty = true;
    return HULLS[id].name;
  }

  private nearHangarNpc(p: Player, world: World): boolean {
    for (const npc of world.npcs.values()) {
      if (npc.def.service === "hangar" && dist(p.x, p.y, npc.x, npc.y) <= HANGAR_RANGE) return true;
    }
    return false;
  }

  hangar(p: Player, world: World, msg: Extract<C2S, { t: "hangar" }>): void {
    if (!this.nearHangarNpc(p, world)) return;
    const s = p.save;
    if (msg.op === "buy" || msg.op === "select") {
      const id = msg.hull as HullId;
      const h = HULLS[id];
      if (!h) return;
      if (msg.op === "buy") {
        if (s.ships.includes(id)) return p.session.toast("You already own that ship");
        if (h.price <= 0) return p.session.toast("Station Master Orla hands those out to new pilots", "bad");
        if (s.gold < h.price) return p.session.toast("Not enough gold", "bad");
        s.gold -= h.price;
        s.ships.push(id);
        p.session.toast(`The ${h.name} is yours! It's waiting on the hangar pad.`, "good");
      } else if (!s.ships.includes(id)) {
        return;
      }
      s.activeShip = id;
    } else if (msg.op === "upgrade") {
      const slot = msg.slot as UpgradeSlot;
      if (!UPGRADE_SLOTS.includes(slot)) return;
      const lvl = s.shipUp[slot];
      if (lvl >= MAX_UPGRADE) return p.session.toast("That's fully upgraded");
      const price = UPGRADE_PRICES[lvl];
      if (s.gold < price) return p.session.toast("Not enough gold", "bad");
      s.gold -= price;
      s.shipUp[slot] = lvl + 1;
      p.session.toast(`${UPGRADE_INFO[slot].name} upgraded to Mk ${lvl + 2}!`, "good");
    }
    p.selfDirty = p.saveDirty = true;
  }

  // ── flying ─────────────────────────────────────────────────────────────────

  /** Put the player in their ship (called when entering space). */
  board(p: Player): void {
    const stats = shipStats(p.save.activeShip ?? "skiff", p.save.shipUp, p.save.lv);
    p.ship = { stats, hull: stats.maxHull, shield: stats.maxShield, vx: 0, vy: 0, boostUntil: 0, boostReadyAt: 0, warp: null, nextTurretAt: 0 };
    p.mounted = false;
    p.emote = "";
    p.selfDirty = true;
  }

  /** Stats changed (level up, upgrade): keep hull/shield fractions. */
  refresh(p: Player): void {
    if (!p.ship) return;
    const old = p.ship.stats;
    const stats = shipStats(p.save.activeShip ?? "skiff", p.save.shipUp, p.save.lv);
    p.ship.hull = (p.ship.hull / old.maxHull) * stats.maxHull;
    p.ship.shield = (p.ship.shield / Math.max(1, old.maxShield)) * stats.maxShield;
    p.ship.stats = stats;
  }

  launch(p: Player, world: World): void {
    if (p.dead) return;
    const planet = parsePlanetMapId(world.def.id);
    if (planet) {
      if (dist(p.x, p.y, PLANET_PAD.x, PLANET_PAD.y) > PAD_RADIUS + 1.5) return p.session.toast("Stand on the landing pad to launch", "bad");
      if (!p.save.activeShip) return p.session.toast("You don't have a ship!", "bad");
      const poi = POIS_BY_ID[planet];
      const to = poiArrival(poi);
      this.ctx.transfer(p, "space", to.x, to.y);
      p.f = Math.PI / 2;
      return;
    }
    if (world.def.id !== "station") return;
    if (dist(p.x, p.y, LAUNCH_PAD.x, LAUNCH_PAD.y) > LAUNCH_PAD.r + 1.5) return p.session.toast("Stand on the hangar pad to launch", "bad");
    if (!p.save.activeShip) return p.session.toast("You don't have a ship yet. Station Master Orla can help!", "bad");
    this.discover(p, "ringforge");
    this.ctx.transfer(p, "space", LAUNCH_POINT.x, LAUNCH_POINT.y);
    p.f = Math.PI / 2;
  }

  dock(p: Player, world: World): void {
    if (world.def.kind !== "space" || !p.ship || p.dead) return;
    const poi = poiNear(p.x, p.y, ["station", "planet"], DOCK_RANGE);
    if (!poi) return p.session.toast("Fly into the station's docking ring first", "bad");
    world.fx(p.x, p.y, { e: "warp", id: p.id, x: p.x, y: p.y, out: 1 });
    if (poi.planet) {
      this.ctx.transfer(p, poi.planet, PLANET_PAD.x, PLANET_PAD.y + 2.5);
      p.session.toast(`Landed on ${PLANETS[poi.id as keyof typeof PLANETS]?.name ?? poi.name}!`, "good");
      return;
    }
    this.ctx.transfer(p, "station", LAUNCH_PAD.x, LAUNCH_PAD.y + LAUNCH_PAD.r + 1);
    p.session.toast("Docked at Ringforge. Hull repaired!", "good");
  }

  boost(p: Player, now: number): void {
    const s = p.ship;
    if (!s || p.dead || now < s.boostReadyAt) return;
    s.boostUntil = now + BOOST_MS;
    s.boostReadyAt = now + BOOST_COOLDOWN_MS;
  }

  warp(p: Player, world: World, dest: string, now: number): void {
    const s = p.ship;
    const poi = POIS_BY_ID[dest];
    if (!s || !poi || world.def.kind !== "space" || p.dead) return;
    if (!p.save.discovered.includes(dest)) return p.session.toast("You need to visit a place once before you can warp there", "bad");
    if (now - p.lastDamagedAt < WARP_COMBAT_LOCK_MS) return p.session.toast("Can't warp while under fire!", "bad");
    if (dist(p.x, p.y, poi.x, poi.y) < poi.r + 30) return p.session.toast("You're already there!");
    s.warp = { dest, at: now + WARP_CHARGE_MS };
    p.session.send({ t: "warp", state: "charge", dest, ms: WARP_CHARGE_MS });
  }

  private cancelWarp(p: Player, why?: string): void {
    if (!p.ship?.warp) return;
    p.session.send({ t: "warp", state: "cancel", dest: p.ship.warp.dest });
    p.ship.warp = null;
    if (why) p.session.toast(why, "bad");
  }

  repair(p: Player, frac: number): boolean {
    const s = p.ship;
    if (!s) return false;
    if (s.hull >= s.stats.maxHull) return false;
    s.hull = Math.min(s.stats.maxHull, s.hull + s.stats.maxHull * frac);
    return true;
  }

  private discover(p: Player, id: string): void {
    if (p.save.discovered.includes(id)) return;
    p.save.discovered.push(id);
    p.selfDirty = p.saveDirty = true;
    const poi = POIS_BY_ID[id];
    if (poi && id !== "ringforge") p.session.toast(`Discovered ${poi.name}! You can now warp here (J).`, "good");
  }

  /** Incoming damage while flying: shields soak it first. Returns true if the hull broke. */
  damage(p: Player, world: World, raw: number, now: number): boolean {
    const s = p.ship!;
    p.lastDamagedAt = now;
    this.cancelWarp(p, s.warp ? "Warp interrupted!" : undefined);
    let dmg = raw;
    if (s.shield > 0) {
      const soak = Math.min(s.shield, dmg);
      s.shield -= soak;
      dmg -= soak;
      world.fx(p.x, p.y, { e: "shieldHit", id: p.id });
    }
    if (dmg > 0) s.hull -= dmg;
    world.fx(p.x, p.y, { e: "hit", id: p.id, dmg: Math.max(1, Math.round(raw)) });
    p.selfDirty = true;
    return s.hull <= 0;
  }

  /** The hull broke: tow the pilot (unharmed) back to Ringforge. */
  destroyed(p: Player, world: World): void {
    world.fx(p.x, p.y, { e: "boom", x: p.x, y: p.y, big: 1 });
    p.session.toast("Your ship was disabled! A tug towed you back to Ringforge.", "bad");
    this.ctx.transfer(p, "station", LAUNCH_PAD.x, LAUNCH_PAD.y + LAUNCH_PAD.r + 1);
  }

  /** Per-tick for every player flying in a space world. */
  tick(p: Player, world: World, dt: number, now: number, fire: (p: Player, target: Mob) => void): void {
    const s = p.ship;
    if (!s || p.dead) return;
    // Shields recharge once you've been out of fire for a moment.
    if (now - p.lastDamagedAt > SHIELD_DELAY_MS && s.shield < s.stats.maxShield) {
      s.shield = Math.min(s.stats.maxShield, s.shield + s.stats.shieldRegen * dt);
    }
    // Slow hull self-repair out of combat.
    if (now - p.lastDamagedAt > 8000 && s.hull < s.stats.maxHull) s.hull = Math.min(s.stats.maxHull, s.hull + s.stats.maxHull * 0.01 * dt);
    if (s.warp && now >= s.warp.at) {
      const poi = POIS_BY_ID[s.warp.dest];
      s.warp = null;
      if (poi) {
        const to = poiArrival(poi);
        world.fx(p.x, p.y, { e: "warp", id: p.id, x: p.x, y: p.y, out: 1 });
        p.x = to.x;
        p.y = to.y;
        s.vx = 0;
        s.vy = -2;
        p.f = -Math.PI / 2;
        world.grid.moved(p);
        world.fx(p.x, p.y, { e: "warp", id: p.id, x: p.x, y: p.y, out: 0 });
        p.session.send({ t: "warp", state: "done", dest: poi.id, x: p.x, y: p.y });
      }
    }
    if (now >= p.nextDiscoverAt) {
      p.nextDiscoverAt = now + 1000;
      for (const poi of POIS) {
        if (!p.save.discovered.includes(poi.id) && dist(p.x, p.y, poi.x, poi.y) <= poi.r + DISCOVER_RANGE) this.discover(p, poi.id);
      }
    }
    // Drone turrets: auto-fire at the nearest hostile.
    if (s.stats.turrets > 0 && now >= s.nextTurretAt) {
      let best: Mob | null = null;
      let bestD = TURRET_RANGE;
      world.grid.forEachNear(p.x, p.y, TURRET_RANGE, (e) => {
        if (e.kind !== "mob" || e.dead || e.tpl.passive) return;
        const d = dist(p.x, p.y, e.x, e.y);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      });
      if (best) {
        s.nextTurretAt = now + TURRET_MS / s.stats.turrets;
        fire(p, best);
      }
    }
  }
}

export { LASER_RANGE, LASER_SPEED };
export type { ShipState };
