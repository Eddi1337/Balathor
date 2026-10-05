// Home ownership, access, furniture placement and house storage.

import type { HouseInfo } from "../../shared/protocol";
import { PLOTS_BY_ID, parseHouseMapId } from "../../shared/world/housing";
import { getMap, isInterior } from "../../shared/world/maps";
import { FURNITURE, HOUSE_STORAGE_SIZE, cellsOf, placementError, type PlacedPiece } from "../../shared/game/furniture";
import type { Item } from "../../shared/game/items";
import type { Store } from "../db/database";
import { Furn, type Player } from "./entities";
import type { World } from "./world";

interface Ownership {
  accountId: number;
  name: string;
  open: boolean;
}

export class HousingService {
  private owners = new Map<string, Ownership>();
  private byAccount = new Map<number, string>();
  private storage = new Map<string, (Item | null)[]>();
  private nextFurn = Date.now();

  constructor(private store: Store) {
    for (const row of store.allHouses()) {
      this.owners.set(row.plot_id, { accountId: row.account_id, name: row.owner_name, open: Boolean(row.open) });
      this.byAccount.set(row.account_id, row.plot_id);
    }
  }

  list(): HouseInfo[] {
    return Object.keys(PLOTS_BY_ID).map((plot) => {
      const o = this.owners.get(plot);
      return { plot, owner: o?.name ?? null, open: o?.open ?? false };
    });
  }

  homeOf(accountId: number): string | null {
    return this.byAccount.get(accountId) ?? null;
  }

  ownerOf(plotId: string): Ownership | undefined {
    return this.owners.get(plotId);
  }

  /** Owners, their party, and anyone at all when the house is open to visitors. */
  canEnter(p: Player, plotId: string, party: Player[]): boolean {
    const o = this.owners.get(plotId);
    if (!o) return false;
    if (o.accountId === p.accountId || o.open) return true;
    return party.some((m) => m.accountId === o.accountId);
  }

  buy(p: Player, plotId: string): string | null {
    const plot = PLOTS_BY_ID[plotId];
    if (!plot) return "That isn't for sale";
    if (this.owners.has(plotId)) return "Someone already lives there";
    if (this.byAccount.has(p.accountId)) return "You already own a home";
    if (p.save.gold < plot.price) return `You need ${plot.price} gold`;
    p.save.gold -= plot.price;
    this.store.buyHouse(plotId, p.accountId, p.name);
    this.owners.set(plotId, { accountId: p.accountId, name: p.name, open: false });
    this.byAccount.set(p.accountId, plotId);
    p.selfDirty = p.saveDirty = true;
    return null;
  }

  /** Sell back for half; placed furniture returns to your stock, storage spills into the bag later. */
  sell(p: Player, plotId: string, worlds: Iterable<World>): string | null {
    const o = this.owners.get(plotId);
    if (!o || o.accountId !== p.accountId) return "That isn't your home";
    const plot = PLOTS_BY_ID[plotId];
    for (const row of this.store.furnitureFor(plotId)) p.save.furniture[row.kind] = (p.save.furniture[row.kind] ?? 0) + 1;
    const stored = this.getStorage(plotId).filter((i): i is Item => Boolean(i));
    if (stored.length) return "Empty your storage chest first";
    for (const w of worlds) {
      const id = parseHouseMapId(w.def.id);
      if (id?.plotId !== plotId) continue;
      for (const f of [...w.furniture.values()]) this.unblock(w, f), w.removeFurniture(f);
    }
    this.store.sellHouse(plotId);
    this.owners.delete(plotId);
    this.byAccount.delete(p.accountId);
    this.storage.delete(plotId);
    p.save.gold += Math.floor(plot.price / 2);
    p.selfDirty = p.saveDirty = true;
    return null;
  }

  setOpen(p: Player, plotId: string, open: boolean): void {
    const o = this.owners.get(plotId);
    if (!o || o.accountId !== p.accountId) return;
    o.open = open;
    this.store.setHouseOpen(plotId, open);
  }

  /** Called when a house interior world is created: spawn its saved furniture. */
  loadInto(world: World): void {
    const id = parseHouseMapId(world.def.id);
    if (!id) return;
    for (const row of this.store.furnitureFor(id.plotId)) {
      if (row.floor !== id.floor) continue;
      const f = new Furn(row.id, row.kind, row.x, row.y, row.rot, row.plot_id, row.floor);
      world.addFurniture(f);
      this.block(world, f);
    }
  }

  private block(world: World, f: Furn): void {
    const map = getMap(world.def.id);
    if (!isInterior(map) || !FURNITURE[f.furn]?.solid) return;
    for (const c of cellsOf({ kind: f.furn, x: f.x, y: f.y, rot: f.rot })) map.blockers.add(`${c.x},${c.y}`);
  }

  private unblock(world: World, f: Furn): void {
    const map = getMap(world.def.id);
    if (!isInterior(map)) return;
    for (const c of cellsOf({ kind: f.furn, x: f.x, y: f.y, rot: f.rot })) map.blockers.delete(`${c.x},${c.y}`);
  }

  private ownsWorld(p: Player, world: World): { plotId: string; floor: number } | null {
    const id = parseHouseMapId(world.def.id);
    if (!id) return null;
    const o = this.owners.get(id.plotId);
    return o && o.accountId === p.accountId ? id : null;
  }

  place(p: Player, world: World, kind: string, x: number, y: number, rot: number): string | null {
    const id = this.ownsWorld(p, world);
    if (!id) return "You can only decorate your own home";
    if ((p.save.furniture[kind] ?? 0) <= 0) return "You don't have one of those. Visit Marta's Workshop!";
    const map = getMap(world.def.id);
    if (!isInterior(map)) return "Not here";
    const pieces: PlacedPiece[] = [...world.furniture.values()].map((f) => ({ id: f.id, kind: f.furn, x: f.x, y: f.y, rot: f.rot }));
    const err = placementError(map.layout, pieces, kind, Math.floor(x), Math.floor(y), ((Math.floor(rot) % 4) + 4) % 4);
    if (err) return err;
    // Don't trap anyone inside the new piece.
    const cells = cellsOf({ kind, x: Math.floor(x), y: Math.floor(y), rot });
    if (FURNITURE[kind].solid) {
      for (const other of world.players.values()) {
        if (cells.some((c) => Math.floor(other.x) === c.x && Math.floor(other.y) === c.y)) return "Someone is standing there";
      }
    }
    const f = new Furn(`f${(this.nextFurn++).toString(36)}`, kind, Math.floor(x), Math.floor(y), ((Math.floor(rot) % 4) + 4) % 4, id.plotId, id.floor);
    this.store.addFurniture({ id: f.id, plot_id: f.plotId, floor: f.floor, kind, x: f.x, y: f.y, rot: f.rot });
    world.addFurniture(f);
    this.block(world, f);
    p.save.furniture[kind] -= 1;
    p.selfDirty = p.saveDirty = true;
    return null;
  }

  pickup(p: Player, world: World, furnId: string): string | null {
    if (!this.ownsWorld(p, world)) return "You can only rearrange your own home";
    const f = world.furniture.get(furnId);
    if (!f) return null;
    this.store.removeFurniture(f.id);
    this.unblock(world, f);
    world.removeFurniture(f);
    p.save.furniture[f.furn] = (p.save.furniture[f.furn] ?? 0) + 1;
    p.selfDirty = p.saveDirty = true;
    return null;
  }

  getStorage(plotId: string): (Item | null)[] {
    let items = this.storage.get(plotId);
    if (!items) {
      const raw = this.store.loadStorage(plotId);
      items = raw ? (JSON.parse(raw) as (Item | null)[]) : [];
      while (items.length < HOUSE_STORAGE_SIZE) items.push(null);
      this.storage.set(plotId, items);
    }
    return items;
  }

  saveStorage(plotId: string): void {
    const items = this.storage.get(plotId);
    if (items) this.store.saveStorage(plotId, items);
  }

  /** Storage is only usable by the owner, inside their home, next to a chest. */
  storageAccess(p: Player, world: World): string | null {
    const id = this.ownsWorld(p, world);
    if (!id) return null;
    for (const f of world.furniture.values()) {
      if (FURNITURE[f.furn]?.storage && Math.hypot(f.x + 0.5 - p.x, f.y + 0.5 - p.y) < 2.6) return id.plotId;
    }
    return null;
  }
}
