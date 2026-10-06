// Sailing: buying hulls from the shipwright, summoning your ship to the harbour, boarding and going
// ashore, taking the helm, sails, cannons (broadsides from the helm, single guns at the rails),
// sinking, cleaning up abandoned ships, and digging for buried treasure.

import {
  BOARD_RANGE,
  BROADSIDE_COOLDOWN_MS,
  GANGPLANK,
  HELM,
  SAIL_HULLS,
  SAIL_HULL_IDS,
  STATION_REACH,
  axes,
  cannonSpots,
  deckHalfWidth,
  localToWorld,
  onDeck,
  worldToLocal,
  type SailHullId
} from "../../shared/game/sailing";
import { ISLES, MOORING, PORT_SPAWN, isLand, treasureSpot } from "../../shared/world/sea/ocean";
import { dist } from "../../shared/math";
import { makeItem, type Item } from "../../shared/game/items";
import type { C2S } from "../../shared/protocol";
import { SailShip, type Player } from "./entities";
import type { World } from "./world";

const HARBOUR_RANGE = 4.5;
const SINGLE_CANNON_MS = 1400;
const DIG_RANGE = 2.2;
const MAP_PIECES_PER_DIG = 3;

export interface SailContext {
  transfer(p: Player, mapId: string, x: number, y: number): void;
  partyIds(p: Player): string[];
  addToBag(p: Player, item: Item): boolean;
  randomGear(p: Player, rarity: "uncommon" | "rare" | "epic"): Item;
}

/** Mooring slots around the pier (stern toward the pier, bow out to sea). */
function moorings(len: number): { x: number; y: number; f: number }[] {
  return [
    { x: MOORING.x, y: MOORING.y + len / 2 - 1, f: Math.PI / 2 },
    { x: 13 + len / 2, y: 53.5, f: 0 },
    { x: -12 - len / 2, y: 53.5, f: Math.PI },
    { x: MOORING.x + 9, y: MOORING.y + len / 2 + 2, f: Math.PI / 2 },
    { x: MOORING.x - 9, y: MOORING.y + len / 2 + 2, f: Math.PI / 2 }
  ];
}

export class SailService {
  private nextId = 1;

  constructor(private ctx: SailContext) {}

  private shipOf(world: World, p: Player): SailShip | undefined {
    for (const s of world.ships.values()) if (s.ownerId === p.id) return s;
    return undefined;
  }

  private nearHarbour(p: Player, world: World): boolean {
    for (const npc of world.npcs.values()) {
      if (npc.def.service === "harbour" && dist(p.x, p.y, npc.x, npc.y) <= HARBOUR_RANGE) return true;
    }
    return false;
  }

  op(p: Player, world: World, msg: Extract<C2S, { t: "sail" }>, now: number): void {
    if (world.def.kind !== "sea" || p.dead) return;
    switch (msg.op) {
      case "buy":
      case "select":
        return this.shipyard(p, world, msg.op, String(msg.hull));
      case "summon":
        return this.summon(p, world);
      case "board":
        return this.board(p, world, String(msg.id ?? ""));
      case "ashore":
        return this.ashore(p, world);
      case "helm":
        return this.helm(p, world);
      case "furl": {
        const ship = p.aboard?.helm ? world.ships.get(p.aboard.shipId) : undefined;
        if (ship) ship.sail = ship.sail === 0 ? 2 : 0;
        return;
      }
    }
    void now;
  }

  private shipyard(p: Player, world: World, op: "buy" | "select", hull: string): void {
    if (!this.nearHarbour(p, world)) return;
    if (!SAIL_HULL_IDS.includes(hull as SailHullId)) return;
    const id = hull as SailHullId;
    const h = SAIL_HULLS[id];
    const s = p.save;
    if (op === "buy") {
      if (s.sailShips.includes(id)) return p.session.toast("You already own that ship");
      if (!h.price) return p.session.toast("Captain Marlow lends those to new sailors", "bad");
      if (s.gold < h.price) return p.session.toast("Not enough gold", "bad");
      s.gold -= h.price;
      s.sailShips.push(id);
      p.session.toast(`The ${h.name} is yours! Ask Old Finn to bring her round.`, "good");
    } else if (!s.sailShips.includes(id)) return;
    s.activeSail = id;
    // A ship already out on the water is swapped next time you summon.
    p.selfDirty = p.saveDirty = true;
  }

  grant(p: Player, hull: string): string | null {
    if (!SAIL_HULL_IDS.includes(hull as SailHullId)) return null;
    const id = hull as SailHullId;
    if (!p.save.sailShips.includes(id)) p.save.sailShips.push(id);
    if (!p.save.activeSail) p.save.activeSail = id;
    p.selfDirty = p.saveDirty = true;
    return SAIL_HULLS[id].name;
  }

  /** Bring your ship to a free mooring at the pier, fully repaired. */
  summon(p: Player, world: World): void {
    if (!this.nearHarbour(p, world)) return p.session.toast("Ask the harbourmaster at the pier", "bad");
    const hull = p.save.activeSail;
    if (!hull) return p.session.toast("You don't own a ship yet. Captain Marlow might lend you one!", "bad");
    const old = this.shipOf(world, p);
    if (old) {
      if ([...old.crew].some((id) => id !== p.id)) return p.session.toast("Your crew is still aboard!", "bad");
      this.removeShip(world, old);
    }
    const def = SAIL_HULLS[hull];
    const slots = moorings(def.length);
    const slot = slots.find((m) => ![...world.ships.values()].some((o) => dist(o.x, o.y, m.x, m.y) < 7)) ?? slots[0];
    const ship = new SailShip(`ship${this.nextId++}`, hull, p.id, p.name, slot.x, slot.y);
    ship.f = slot.f;
    world.addShip(ship);
    p.session.toast(`The ${def.name} is moored at the pier. Walk up to her and press E to board.`, "good");
  }

  private canBoard(p: Player, ship: SailShip): boolean {
    return ship.ownerId === p.id || this.ctx.partyIds(p).includes(ship.ownerId);
  }

  /** Board the ship you're standing next to (yours or a party member's). */
  board(p: Player, world: World, id: string): void {
    if (p.aboard) return;
    const ship = world.ships.get(id) ?? [...world.ships.values()].find((s) => dist(p.x, p.y, s.x, s.y) < s.def.length / 2 + BOARD_RANGE);
    if (!ship || dist(p.x, p.y, ship.x, ship.y) > ship.def.length / 2 + BOARD_RANGE) return;
    if (!this.canBoard(p, ship)) return p.session.toast(`That's ${ship.ownerName}'s ship. Join their party to sail with them!`, "bad");
    // Step aboard at the nearest point of the deck.
    const l = worldToLocal(ship, p.x, p.y);
    const def = ship.def;
    let ly = Math.max(-def.length / 2 + 0.8, Math.min(def.length / 2 - 0.9, l.ly));
    let lx = Math.max(-(deckHalfWidth(def, ly) - 0.6), Math.min(deckHalfWidth(def, ly) - 0.6, l.lx));
    if (!onDeck(def, lx, ly)) ({ lx, ly } = GANGPLANK(def));
    p.aboard = { shipId: ship.id, lx, ly, helm: false };
    ship.crew.add(p.id);
    p.mounted = false;
    const w = localToWorld(ship, lx, ly);
    p.x = w.x;
    p.y = w.y;
    world.grid.moved(p);
    p.selfDirty = true;
  }

  /** Step off onto land (a beach or the pier) next to the rail. */
  ashore(p: Player, world: World): void {
    const a = p.aboard;
    const ship = a ? world.ships.get(a.shipId) : undefined;
    if (!a || !ship) return;
    for (let r = 1; r <= 4; r += 0.5) {
      for (let i = 0; i < 16; i += 1) {
        const ang = (i / 16) * Math.PI * 2;
        const x = p.x + Math.cos(ang) * r;
        const y = p.y + Math.sin(ang) * r;
        if (!isLand(world.def.tileAt(x, y))) continue;
        this.leave(p, ship);
        p.x = Math.floor(x) + 0.5;
        p.y = Math.floor(y) + 0.5;
        world.grid.moved(p);
        return;
      }
    }
    p.session.toast("Too far from shore. Sail closer to land (or the pier)!", "bad");
  }

  helm(p: Player, world: World): void {
    const a = p.aboard;
    const ship = a ? world.ships.get(a.shipId) : undefined;
    if (!a || !ship) return;
    if (a.helm) {
      a.helm = false;
      ship.helmId = null;
      a.ly += 0.9;
      return;
    }
    const h = HELM(ship.def);
    if (Math.hypot(a.lx - h.lx, a.ly - h.ly) > STATION_REACH + 0.6) return p.session.toast("Walk to the ship's wheel (at the stern)", "bad");
    if (ship.helmId && ship.helmId !== p.id) return p.session.toast("Someone else is steering", "bad");
    a.helm = true;
    ship.helmId = p.id;
  }

  /**
   * Firing while aboard: from the helm, a full broadside on the side you're aiming at; next to a
   * cannon, that cannon. Returns false when neither applies (you just use your own weapon).
   */
  attack(p: Player, world: World, angle: number, now: number): boolean {
    const a = p.aboard;
    const ship = a ? world.ships.get(a.shipId) : undefined;
    if (!a || !ship || p.dead) return false;
    const def = ship.def;
    const ax = axes(ship.f);
    const dmg = def.cannonDmg * (1 + (p.save.lv - 1) * 0.06);
    const sideOf = (ang: number) => (Math.cos(ang) * ax.rx + Math.sin(ang) * ax.ry >= 0 ? 1 : -1);
    const fire = (spot: { lx: number; ly: number; side: number }, aim: number) => {
      const base = Math.atan2(ax.ry * spot.side, ax.rx * spot.side);
      // Cannons swivel a little toward where you're aiming.
      let d = aim - base;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const shot = base + Math.max(-0.45, Math.min(0.45, d));
      const w = localToWorld(ship, spot.lx + spot.side * 0.6, spot.ly);
      world.fireCannon(p.id, w.x, w.y, shot, dmg);
      world.fx(w.x, w.y, { e: "boom", x: w.x, y: w.y, big: 0 });
    };
    if (a.helm) {
      const side = sideOf(angle);
      const key = `broadside${side}`;
      if ((p.cannonReadyAt.get(key) ?? 0) > now) return true;
      p.cannonReadyAt.set(key, now + BROADSIDE_COOLDOWN_MS);
      for (const spot of cannonSpots(def)) if (spot.side === side) fire(spot, angle);
      return true;
    }
    const near = cannonSpots(def).find((c) => Math.hypot(c.lx - a.lx, c.ly - a.ly) <= STATION_REACH);
    if (!near) return false;
    const key = `cannon${near.lx},${near.ly}`;
    if ((p.cannonReadyAt.get(key) ?? 0) > now) return true;
    p.cannonReadyAt.set(key, now + SINGLE_CANNON_MS);
    fire(near, angle);
    return true;
  }

  /** Take a player off whatever ship they're on (no position change). */
  leave(p: Player, ship?: SailShip): void {
    if (!p.aboard) return;
    if (ship) {
      ship.crew.delete(p.id);
      if (ship.helmId === p.id) ship.helmId = null;
    }
    p.aboard = null;
    p.selfDirty = true;
  }

  removeShip(world: World, ship: SailShip): void {
    for (const id of ship.crew) {
      const p = world.players.get(id);
      if (p) this.leave(p, ship);
    }
    world.removeShip(ship);
  }

  /** Sunk: everyone aboard washes up at the port; the ship can be summoned again for free. */
  sunk(world: World, ship: SailShip): void {
    const crew = [...ship.crew].map((id) => world.players.get(id)).filter((p): p is Player => Boolean(p));
    this.removeShip(world, ship);
    for (const p of crew) {
      p.session.toast("Your ship went down! You washed up in Port Bilgewater. Old Finn can fetch her back.", "bad");
      this.ctx.transfer(p, "ocean", PORT_SPAWN.x, PORT_SPAWN.y);
    }
  }

  /** Called when a player leaves the ocean (map change or logout). */
  onLeaveMap(p: Player, world: World | undefined): void {
    if (!world) return;
    const ship = p.aboard ? world.ships.get(p.aboard.shipId) : undefined;
    this.leave(p, ship);
    const own = this.shipOf(world, p);
    if (own && own.crew.size === 0) world.removeShip(own);
  }

  /** Abandoned ships (owner gone, nobody aboard) are taken back to the harbour. */
  sweep(world: World): void {
    for (const ship of [...world.ships.values()]) {
      if (ship.crew.size === 0 && !world.players.has(ship.ownerId)) world.removeShip(ship);
    }
  }

  dig(p: Player, world: World): void {
    if (world.def.kind !== "sea" || p.dead || p.aboard) return;
    const isle = ISLES.find((i) => (i.kind === "treasure" || i.kind === "skull") && dist(p.x, p.y, treasureSpot(i).x, treasureSpot(i).y) <= DIG_RANGE);
    if (!isle) return p.session.toast("Nothing buried here. Look for the X!", "bad");
    const have = p.save.inv.reduce((n, i) => n + (i?.tpl === "treasure_map_piece" ? i.qty : 0), 0);
    if (have < MAP_PIECES_PER_DIG) return p.session.toast(`You need ${MAP_PIECES_PER_DIG} Treasure Map Scraps to know where to dig`, "bad");
    let left = MAP_PIECES_PER_DIG;
    for (let i = 0; i < p.save.inv.length && left > 0; i += 1) {
      const it = p.save.inv[i];
      if (!it || it.tpl !== "treasure_map_piece") continue;
      const take = Math.min(left, it.qty);
      it.qty -= take;
      left -= take;
      if (it.qty <= 0) p.save.inv[i] = null;
    }
    const gold = 150 + Math.floor(Math.random() * 250) + p.save.lv * 10;
    p.save.gold += gold;
    const gear = this.ctx.randomGear(p, Math.random() < 0.3 ? "epic" : "rare");
    const got = this.ctx.addToBag(p, gear);
    this.ctx.addToBag(p, makeItem("pearl"));
    world.fx(p.x, p.y, { e: "work", id: p.id, prof: "mining", x: p.x, y: p.y });
    p.session.toast(`Treasure! ${gold} gold, a pearl${got ? " and some fine gear" : ""}!`, "good");
    p.selfDirty = p.saveDirty = true;
  }
}

export { MOORING };
