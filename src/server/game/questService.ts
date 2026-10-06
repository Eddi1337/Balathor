// Quest progression: offers, step tracking (talk / kill / collect / visit), hand-ins and rewards.

import {
  availableFrom,
  isReady,
  MAX_ACTIVE_QUESTS,
  QUESTS,
  QUESTS_BY_ID,
  questTurnIn,
  type Quest,
  type QuestProgress
} from "../../shared/game/quests";
import { itemName, makeItem, type Item } from "../../shared/game/items";
import { dist } from "../../shared/math";
import type { Mob, Player } from "./entities";

export interface QuestContext {
  awardXp(p: Player, xp: number): void;
  addToBag(p: Player, item: Item): boolean;
  randomGear(p: Player, rarity: "uncommon" | "rare" | "epic"): Item;
  chat(p: Player, text: string): void;
  grantShip(p: Player, hull: string): string | null;
}

export class QuestService {
  constructor(private ctx: QuestContext) {}

  private active(p: Player, id: string): QuestProgress | undefined {
    return p.save.quests.active.find((a) => a.id === id);
  }

  /** "!" for quests this NPC can give you, "?" for ones you can hand in to them. */
  markers(p: Player): Record<string, "!" | "?"> {
    const out: Record<string, "!" | "?"> = {};
    const log = p.save.quests;
    for (const q of QUESTS) {
      const prog = this.active(p, q.id);
      if (prog && isReady(q, prog)) out[questTurnIn(q)] = "?";
    }
    for (const q of QUESTS) {
      if (out[q.giver]) continue;
      if (availableFrom(q.giver, log, p.save.lv).some((o) => o.id === q.id)) out[q.giver] = "!";
    }
    return out;
  }

  /**
   * Talking to an NPC: hand in finished quests, advance talk steps, and return the id of a quest
   * this NPC wants to offer (if any).
   */
  onTalk(p: Player, npcId: string): string | null {
    let changed = false;
    for (const prog of [...p.save.quests.active]) {
      const q = QUESTS_BY_ID[prog.id];
      if (!q) continue;
      if (isReady(q, prog) && questTurnIn(q) === npcId) {
        this.complete(p, q);
        changed = true;
        continue;
      }
      const step = q.steps[prog.step];
      if (step?.type === "talk" && step.npc === npcId) {
        this.advance(p, q, prog);
        changed = true;
        // A quest whose final step is "talk to the giver" completes right away.
        if (isReady(q, prog) && questTurnIn(q) === npcId) this.complete(p, q);
      }
    }
    if (changed) p.selfDirty = p.saveDirty = true;
    const offer = availableFrom(npcId, p.save.quests, p.save.lv)[0];
    return offer ? offer.id : null;
  }

  accept(p: Player, id: string, nearNpc: (npcId: string) => boolean): void {
    const q = QUESTS_BY_ID[id];
    if (!q) return;
    if (!availableFrom(q.giver, p.save.quests, p.save.lv).some((o) => o.id === id)) return;
    if (!nearNpc(q.giver)) return;
    if (p.save.quests.active.length >= MAX_ACTIVE_QUESTS) {
      p.session.toast("Your quest log is full", "bad");
      return;
    }
    const prog: QuestProgress = { id, step: 0, n: 0 };
    p.save.quests.active.push(prog);
    p.session.toast(`New quest: ${q.name}`, "good");
    this.checkCollect(p, q, prog);
    p.selfDirty = p.saveDirty = true;
  }

  abandon(p: Player, id: string): void {
    const before = p.save.quests.active.length;
    p.save.quests.active = p.save.quests.active.filter((a) => a.id !== id);
    if (p.save.quests.active.length !== before) p.selfDirty = p.saveDirty = true;
  }

  onKill(p: Player, mob: Mob, biome: string): void {
    for (const prog of p.save.quests.active) {
      const q = QUESTS_BY_ID[prog.id];
      const step = q?.steps[prog.step];
      if (!q || step?.type !== "kill") continue;
      if (!step.mobs.includes(mob.tpl.id)) continue;
      if (step.biome && step.biome !== biome) continue;
      prog.n += 1;
      p.selfDirty = p.saveDirty = true;
      if (prog.n >= step.count) {
        this.advance(p, q, prog);
      }
    }
  }

  /** Re-check collect steps after the bag changes. */
  onBagChanged(p: Player): void {
    for (const prog of p.save.quests.active) {
      const q = QUESTS_BY_ID[prog.id];
      if (q) this.checkCollect(p, q, prog);
    }
  }

  private checkCollect(p: Player, q: Quest, prog: QuestProgress): void {
    const step = q.steps[prog.step];
    if (step?.type !== "collect") return;
    const have = countItem(p, step.item);
    if (have !== prog.n) {
      prog.n = Math.min(have, step.count);
      p.selfDirty = true;
    }
    if (have >= step.count) this.advance(p, q, prog);
  }

  /** Called a couple of times a second: visit steps complete by walking near the spot. */
  checkVisits(p: Player): void {
    for (const prog of p.save.quests.active) {
      const q = QUESTS_BY_ID[prog.id];
      const step = q?.steps[prog.step];
      if (q && step?.type === "visit" && (step.map ?? "overworld") === p.mapId && dist(p.x, p.y, step.x, step.y) <= step.r) {
        this.advance(p, q, prog);
        p.session.toast(`${q.name}: ${step.text}, done!`, "good");
      }
    }
  }

  private advance(p: Player, q: Quest, prog: QuestProgress): void {
    prog.step += 1;
    prog.n = 0;
    p.selfDirty = p.saveDirty = true;
    if (isReady(q, prog)) {
      p.session.toast(`${q.name}: ready to hand in`, "good");
    } else {
      this.checkCollect(p, q, prog);
    }
  }

  private complete(p: Player, q: Quest): void {
    // Collect quests consume their items on hand-in.
    for (const step of q.steps) {
      if (step.type === "collect") removeItems(p, step.item, step.count);
    }
    p.save.quests.active = p.save.quests.active.filter((a) => a.id !== q.id);
    if (!p.save.quests.done.includes(q.id)) p.save.quests.done.push(q.id);
    const r = q.reward;
    p.save.gold += r.gold;
    const gained: string[] = [`${r.xp} XP`, `${r.gold}g`];
    for (const it of r.items ?? []) {
      const item = makeItem(it.tpl, it.rarity ?? "common", Math.max(1, p.save.lv), it.qty ?? 1);
      if (this.ctx.addToBag(p, item)) gained.push(`${itemName(item)}${item.qty > 1 ? ` x${item.qty}` : ""}`);
    }
    if (r.ship) {
      const name = this.ctx.grantShip(p, r.ship);
      if (name) gained.push(name);
    }
    if (r.gear) {
      const gear = this.ctx.randomGear(p, r.gear);
      if (this.ctx.addToBag(p, gear)) gained.push(itemName(gear));
    }
    this.ctx.awardXp(p, r.xp);
    p.session.send({ t: "questDone", id: q.id });
    this.ctx.chat(p, `Quest complete: ${q.name}! (${gained.join(", ")})`);
    p.selfDirty = p.saveDirty = true;
  }
}

export function countItem(p: Player, tpl: string): number {
  let n = 0;
  for (const it of p.save.inv) if (it && it.tpl === tpl) n += it.qty;
  return n;
}

function removeItems(p: Player, tpl: string, count: number): void {
  let left = count;
  const inv = p.save.inv;
  for (let i = 0; i < inv.length && left > 0; i += 1) {
    const it = inv[i];
    if (!it || it.tpl !== tpl) continue;
    const take = Math.min(left, it.qty);
    it.qty -= take;
    left -= take;
    if (it.qty <= 0) inv[i] = null;
  }
}
