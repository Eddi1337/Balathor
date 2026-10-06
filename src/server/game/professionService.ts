// Gathering (timed sessions on world props), fishing (cast → bite → reel), crafting at
// stations, food buffs and profession XP.

import { biomeAt } from "../../shared/world/overworld";
import { riverAt } from "../../shared/world/rivers";
import { isWaterTile } from "../../shared/world/tiles";
import { STATIONS } from "../../shared/world/stations";
import {
  FISH_BITE_MAX_MS,
  FISH_BITE_MIN_MS,
  FISH_RANGE,
  FISH_WINDOW_MS,
  GATHER_MS,
  GATHER_RANGE,
  NODE_RESPAWN_MS,
  PROFESSIONS,
  PROF_MAX_LEVEL,
  RECIPES_BY_ID,
  STATION_RANGE,
  fishTable,
  gatherNode,
  profXpToNext,
  type GatherNode,
  type ProfId
} from "../../shared/game/professions";
import { itemName, itemTemplate, makeItem, type Item } from "../../shared/game/items";
import type { Player } from "./entities";
import type { World } from "./world";

interface GatherSession {
  node: GatherNode;
  key: string;
  x: number;
  y: number;
  until: number;
  startX: number;
  startY: number;
}

interface FishSession {
  x: number;
  y: number;
  biteAt: number;
  windowEnd: number;
  bit: boolean;
  startX: number;
  startY: number;
}

export interface ProfessionContext {
  addToBag(p: Player, item: Item): boolean;
  randomWeapon(p: Player, rarity: "rare" | "epic", level: number): Item;
}

export class ProfessionService {
  private gathering = new Map<string, GatherSession>();
  private fishing = new Map<string, FishSession>();
  /** Depleted node tiles ("x,y") → time they regrow. */
  private depleted = new Map<string, number>();

  constructor(private ctx: ProfessionContext) {}

  private hasTool(p: Player, prof: ProfId): boolean {
    const tool = PROFESSIONS[prof].tool;
    return !tool || p.save.inv.some((i) => i?.tpl === tool);
  }

  private award(p: Player, prof: ProfId, xp: number): void {
    const s = p.save.professions[prof];
    if (s.lv >= PROF_MAX_LEVEL) return;
    s.xp += xp;
    while (s.lv < PROF_MAX_LEVEL && s.xp >= profXpToNext(s.lv)) {
      s.xp -= profXpToNext(s.lv);
      s.lv += 1;
      p.session.toast(`${PROFESSIONS[prof].name} is now level ${s.lv}!`, "good");
    }
    p.selfDirty = p.saveDirty = true;
  }

  depletedKeys(): string[] {
    return [...this.depleted.keys()];
  }

  startGather(p: Player, world: World, x: number, y: number, now: number): void {
    if (world.def.id !== "overworld" || p.dead) return;
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (Math.hypot(tx + 0.5 - p.x, ty + 0.5 - p.y) > GATHER_RANGE + 0.6) return;
    const node = gatherNode(world.def.tileAt(tx, ty), biomeAt(tx + 0.5, ty + 0.5));
    if (!node) return;
    const key = `${tx},${ty}`;
    if ((this.depleted.get(key) ?? 0) > now) return p.session.toast(`This ${node.name.toLowerCase()} needs time to regrow`, "bad");
    if (!this.hasTool(p, node.prof)) return p.session.toast(`You need a ${itemName(makeItem(PROFESSIONS[node.prof].tool!))}. Bram sells them in the market.`, "bad");
    const lv = p.save.professions[node.prof].lv;
    if (lv < node.level) return p.session.toast(`Requires ${PROFESSIONS[node.prof].name} ${node.level}`, "bad");
    this.cancel(p);
    const ms = Math.max(1200, GATHER_MS - (lv - node.level) * 40);
    this.gathering.set(p.id, { node, key, x: tx, y: ty, until: now + ms, startX: p.x, startY: p.y });
    p.mounted = false;
    p.f = Math.atan2(ty + 0.5 - p.y, tx + 0.5 - p.x);
    p.session.send({ t: "gather", state: "start", x: tx, y: ty, ms });
  }

  startFishing(p: Player, world: World, x: number, y: number, now: number): void {
    if (world.def.id !== "overworld" || p.dead) return;
    if (Math.hypot(x - p.x, y - p.y) > FISH_RANGE + 0.5) return;
    if (!isWaterTile(world.def.tileAt(x, y))) return p.session.toast("Cast into water!", "bad");
    if (!this.hasTool(p, "fishing")) return p.session.toast("You need a fishing rod. Bram sells them in the market.", "bad");
    this.cancel(p);
    const biteAt = now + FISH_BITE_MIN_MS + Math.random() * (FISH_BITE_MAX_MS - FISH_BITE_MIN_MS);
    this.fishing.set(p.id, { x, y, biteAt, windowEnd: biteAt + FISH_WINDOW_MS, bit: false, startX: p.x, startY: p.y });
    p.mounted = false;
    p.f = Math.atan2(y - p.y, x - p.x);
    p.session.send({ t: "fish", state: "cast", x, y });
  }

  reel(p: Player, world: World, now: number): void {
    const f = this.fishing.get(p.id);
    if (!f) return;
    this.fishing.delete(p.id);
    if (!f.bit || now > f.windowEnd) {
      p.session.send({ t: "fish", state: "escaped", x: f.x, y: f.y });
      return;
    }
    const lv = p.save.professions.fishing.lv;
    const table = fishTable(biomeAt(f.x, f.y), Boolean(riverAt(f.x, f.y))).filter((e) => e.level <= lv);
    let roll = Math.random() * table.reduce((a, e) => a + e.weight, 0);
    let pick = table[0];
    for (const e of table) {
      roll -= e.weight;
      if (roll <= 0) {
        pick = e;
        break;
      }
    }
    const item = makeItem(pick.item);
    if (!this.ctx.addToBag(p, item)) {
      p.session.toast("Your bag is full; the fish slips away", "bad");
      return;
    }
    this.award(p, "fishing", pick.xp);
    world.fx(p.x, p.y, { e: "work", id: p.id, prof: "fishing", x: f.x, y: f.y });
    p.session.send({ t: "fish", state: "caught", x: f.x, y: f.y, item: pick.item });
  }

  craft(p: Player, recipeId: string, stationId: string): void {
    const r = RECIPES_BY_ID[recipeId];
    const st = STATIONS.find((s) => s.id === stationId);
    if (!r || !st || st.kind !== r.station || p.mapId !== "overworld") return;
    if (Math.hypot(st.x - p.x, st.y - p.y) > STATION_RANGE + 0.6) return p.session.toast(`Stand by the ${r.station}`, "bad");
    if (p.save.professions[r.prof].lv < r.level) return p.session.toast(`Requires ${PROFESSIONS[r.prof].name} ${r.level}`, "bad");
    for (const inp of r.inputs) {
      const have = p.save.inv.reduce((n, i) => n + (i?.tpl === inp.tpl ? i.qty : 0), 0);
      if (have < inp.qty) return p.session.toast(`You need ${inp.qty} ${itemTemplate(inp.tpl)?.name ?? inp.tpl}`, "bad");
    }
    const out =
      r.output === "weapon"
        ? this.ctx.randomWeapon(p, r.level >= 20 ? "epic" : "rare", Math.max(p.save.lv, r.level))
        : makeItem(r.output.tpl, "common", 1, r.output.qty);
    // Consume inputs first (frees bag space), roll back if the result doesn't fit.
    const backup = p.save.inv.map((i) => (i ? { ...i } : null));
    for (const inp of r.inputs) {
      let left = inp.qty;
      for (let i = 0; i < p.save.inv.length && left > 0; i += 1) {
        const it = p.save.inv[i];
        if (!it || it.tpl !== inp.tpl) continue;
        const take = Math.min(left, it.qty);
        it.qty -= take;
        left -= take;
        if (it.qty <= 0) p.save.inv[i] = null;
      }
    }
    if (!this.ctx.addToBag(p, out)) {
      p.save.inv = backup;
      return p.session.toast("Your bag is full", "bad");
    }
    this.award(p, r.prof, r.xp);
    p.session.toast(`${PROFESSIONS[r.prof].verb}ed ${itemName(out)}${out.qty > 1 ? ` x${out.qty}` : ""}!`, "good");
    p.selfDirty = p.saveDirty = true;
  }

  cancel(p: Player): void {
    const g = this.gathering.get(p.id);
    if (g) {
      this.gathering.delete(p.id);
      p.session.send({ t: "gather", state: "cancel", x: g.x, y: g.y });
    }
    const f = this.fishing.get(p.id);
    if (f) {
      this.fishing.delete(p.id);
      p.session.send({ t: "fish", state: "cancel", x: f.x, y: f.y });
    }
  }

  /** Called every tick. */
  tick(players: Iterable<Player>, worldOf: (p: Player) => World | undefined, now: number): string[] {
    const newlyDepleted: string[] = [];
    for (const p of players) {
      const g = this.gathering.get(p.id);
      if (g) {
        const moved = Math.hypot(p.x - g.startX, p.y - g.startY) > 0.4;
        if (p.dead || moved || now - p.lastDamagedAt < 300) {
          this.cancel(p);
        } else if (now >= g.until) {
          this.gathering.delete(p.id);
          const item = makeItem(g.node.item);
          if (!this.ctx.addToBag(p, item)) {
            p.session.toast("Your bag is full", "bad");
            p.session.send({ t: "gather", state: "cancel", x: g.x, y: g.y });
          } else {
            this.award(p, g.node.prof, g.node.xp);
            this.depleted.set(g.key, now + NODE_RESPAWN_MS);
            newlyDepleted.push(g.key);
            worldOf(p)?.fx(p.x, p.y, { e: "work", id: p.id, prof: g.node.prof, x: g.x + 0.5, y: g.y + 0.5 });
            p.session.send({ t: "gather", state: "done", x: g.x, y: g.y, item: g.node.item });
          }
        }
      }
      const f = this.fishing.get(p.id);
      if (f) {
        const moved = Math.hypot(p.x - f.startX, p.y - f.startY) > 0.6;
        if (p.dead || moved) this.cancel(p);
        else if (!f.bit && now >= f.biteAt) {
          f.bit = true;
          p.session.send({ t: "fish", state: "bite", x: f.x, y: f.y });
        } else if (f.bit && now > f.windowEnd + 200) {
          this.fishing.delete(p.id);
          p.session.send({ t: "fish", state: "escaped", x: f.x, y: f.y });
        }
      }
    }
    for (const [k, t] of this.depleted) if (t <= now) this.depleted.delete(k);
    return newlyDepleted;
  }

  isBusy(p: Player): boolean {
    return this.gathering.has(p.id) || this.fishing.has(p.id);
  }
}
