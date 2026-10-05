// Parties (up to 5, shared XP/quest credit nearby, party chat, healing/buff targets) and safe
// two-player trading (both sides must be ready; any change un-readies both).

import type { PartyView, TradeView } from "../../shared/protocol";
import { itemTemplate, type Item } from "../../shared/game/items";
import { dist } from "../../shared/math";
import type { Player } from "./entities";

export const MAX_PARTY = 5;
const TRADE_RANGE = 10;
const MAX_TRADE_ITEMS = 6;

interface Party {
  id: string;
  leader: string;
  members: string[];
}

interface TradeOffer {
  slots: number[];
  gold: number;
  ready: boolean;
}

interface Trade {
  id: string;
  a: string;
  b: string;
  offers: Record<string, TradeOffer>;
}

export interface SocialContext {
  player(id: string): Player | undefined;
  findByName(name: string): Player | undefined;
  addToBag(p: Player, item: Item): boolean;
  system(p: Player, text: string): void;
}

export class SocialService {
  private parties = new Map<string, Party>();
  private invites = new Map<string, { partyLeader: string; at: number }>();
  private tradeRequests = new Map<string, { from: string; at: number }>();
  private trades = new Map<string, Trade>();
  private nextId = 1;

  constructor(private ctx: SocialContext) {}

  // ── parties ─────────────────────────────────────────────────────────────────

  membersOf(p: Player): Player[] {
    const party = p.partyId ? this.parties.get(p.partyId) : undefined;
    if (!party) return [p];
    return party.members.map((id) => this.ctx.player(id)).filter((m): m is Player => Boolean(m));
  }

  invite(from: Player, targetName: string): void {
    const target = this.ctx.findByName(targetName);
    if (!target || target === from) return this.ctx.system(from, `No one called "${targetName}" is online.`);
    if (target.partyId) return this.ctx.system(from, `${target.name} is already in a party.`);
    const party = from.partyId ? this.parties.get(from.partyId) : undefined;
    if (party && party.leader !== from.id) return this.ctx.system(from, "Only the party leader can invite.");
    if (party && party.members.length >= MAX_PARTY) return this.ctx.system(from, "Your party is full.");
    this.invites.set(target.id, { partyLeader: from.id, at: Date.now() });
    target.session.send({ t: "partyInvite", from: from.id, name: from.name });
    this.ctx.system(from, `Invited ${target.name} to your party.`);
  }

  respondInvite(p: Player, accept: boolean): void {
    const inv = this.invites.get(p.id);
    this.invites.delete(p.id);
    if (!inv || Date.now() - inv.at > 60_000) return;
    const leader = this.ctx.player(inv.partyLeader);
    if (!leader) return;
    if (!accept) return this.ctx.system(leader, `${p.name} declined your invite.`);
    if (p.partyId) return;
    let party = leader.partyId ? this.parties.get(leader.partyId) : undefined;
    if (!party) {
      party = { id: `party${this.nextId++}`, leader: leader.id, members: [leader.id] };
      this.parties.set(party.id, party);
      leader.partyId = party.id;
    }
    if (party.members.length >= MAX_PARTY) return this.ctx.system(p, "That party is full.");
    party.members.push(p.id);
    p.partyId = party.id;
    for (const m of this.membersOf(p)) this.ctx.system(m, `${p.name} joined the party.`);
    this.broadcastParty(party);
  }

  leave(p: Player, reason: "left" | "kicked" | "offline" = "left"): void {
    const party = p.partyId ? this.parties.get(p.partyId) : undefined;
    p.partyId = null;
    if (!party) return;
    party.members = party.members.filter((id) => id !== p.id);
    if (reason !== "offline") p.session.send({ t: "party", party: null });
    for (const m of party.members) {
      const mp = this.ctx.player(m);
      if (mp) this.ctx.system(mp, `${p.name} ${reason === "kicked" ? "was removed from" : "left"} the party.`);
    }
    if (party.members.length <= 1) {
      for (const m of party.members) {
        const mp = this.ctx.player(m);
        if (mp) {
          mp.partyId = null;
          mp.session.send({ t: "party", party: null });
        }
      }
      this.parties.delete(party.id);
      return;
    }
    if (party.leader === p.id) party.leader = party.members[0];
    this.broadcastParty(party);
  }

  kick(leader: Player, targetName: string): void {
    const party = leader.partyId ? this.parties.get(leader.partyId) : undefined;
    if (!party || party.leader !== leader.id) return this.ctx.system(leader, "Only the party leader can remove members.");
    const target = this.membersOf(leader).find((m) => m.name.toLowerCase() === targetName.toLowerCase());
    if (!target || target === leader) return;
    this.leave(target, "kicked");
  }

  partyChat(p: Player, text: string): void {
    if (!p.partyId) return this.ctx.system(p, "You're not in a party. Invite someone with /invite name.");
    for (const m of this.membersOf(p)) m.session.send({ t: "chat", from: p.id, name: `[Party] ${p.name}`, text, kind: "say" });
  }

  private view(party: Party): PartyView {
    return {
      leader: party.leader,
      members: party.members.map((id) => {
        const m = this.ctx.player(id);
        return m
          ? { id, name: m.name, cls: m.save.cls, lv: m.save.lv, hp: Math.ceil(m.hp), mhp: m.derived.maxHp, x: Math.round(m.x), y: Math.round(m.y), online: true }
          : { id, name: "?", cls: "ranger", lv: 1, hp: 0, mhp: 1, x: 0, y: 0, online: false };
      })
    };
  }

  private broadcastParty(party: Party): void {
    const view = this.view(party);
    for (const id of party.members) this.ctx.player(id)?.session.send({ t: "party", party: view });
  }

  /** Periodic refresh so party frames show live health and positions. */
  tick(): void {
    for (const party of this.parties.values()) this.broadcastParty(party);
  }

  // ── trading ─────────────────────────────────────────────────────────────────

  requestTrade(from: Player, targetId: string): void {
    const target = this.ctx.player(targetId) ?? this.ctx.findByName(targetId);
    if (!target || target === from) return;
    if (from.tradeId || target.tradeId) return this.ctx.system(from, "One of you is already trading.");
    if (dist(from.x, from.y, target.x, target.y) > TRADE_RANGE) return this.ctx.system(from, `Get closer to ${target.name} to trade.`);
    this.tradeRequests.set(target.id, { from: from.id, at: Date.now() });
    target.session.send({ t: "tradeRequest", from: from.id, name: from.name });
    this.ctx.system(from, `Asked ${target.name} to trade.`);
  }

  respondTrade(p: Player, accept: boolean): void {
    const req = this.tradeRequests.get(p.id);
    this.tradeRequests.delete(p.id);
    if (!req || Date.now() - req.at > 60_000) return;
    const other = this.ctx.player(req.from);
    if (!other) return;
    if (!accept) return this.ctx.system(other, `${p.name} declined to trade.`);
    if (p.tradeId || other.tradeId) return;
    const trade: Trade = {
      id: `trade${this.nextId++}`,
      a: other.id,
      b: p.id,
      offers: { [other.id]: { slots: [], gold: 0, ready: false }, [p.id]: { slots: [], gold: 0, ready: false } }
    };
    this.trades.set(trade.id, trade);
    p.tradeId = other.tradeId = trade.id;
    this.sendTrade(trade);
  }

  cancelTrade(p: Player, why = "Trade cancelled."): void {
    const trade = p.tradeId ? this.trades.get(p.tradeId) : undefined;
    if (!trade) return;
    this.trades.delete(trade.id);
    for (const id of [trade.a, trade.b]) {
      const m = this.ctx.player(id);
      if (!m) continue;
      m.tradeId = null;
      m.session.send({ t: "trade", trade: null });
      this.ctx.system(m, why);
    }
  }

  private unready(trade: Trade): void {
    for (const o of Object.values(trade.offers)) o.ready = false;
  }

  offer(p: Player, slot: number, add: boolean): void {
    const trade = p.tradeId ? this.trades.get(p.tradeId) : undefined;
    if (!trade) return;
    const mine = trade.offers[p.id];
    if (add) {
      const item = p.save.inv[slot];
      if (!item || mine.slots.includes(slot) || mine.slots.length >= MAX_TRADE_ITEMS) return;
      mine.slots.push(slot);
    } else {
      mine.slots = mine.slots.filter((s) => s !== slot);
    }
    this.unready(trade);
    this.sendTrade(trade);
  }

  setGold(p: Player, gold: number): void {
    const trade = p.tradeId ? this.trades.get(p.tradeId) : undefined;
    if (!trade) return;
    trade.offers[p.id].gold = Math.max(0, Math.min(p.save.gold, Math.floor(gold) || 0));
    this.unready(trade);
    this.sendTrade(trade);
  }

  ready(p: Player): void {
    const trade = p.tradeId ? this.trades.get(p.tradeId) : undefined;
    if (!trade) return;
    trade.offers[p.id].ready = true;
    if (trade.offers[trade.a].ready && trade.offers[trade.b].ready) this.execute(trade);
    else this.sendTrade(trade);
  }

  /** Bag changes (selling, dropping…) mid-trade invalidate the offer. */
  onBagChanged(p: Player): void {
    const trade = p.tradeId ? this.trades.get(p.tradeId) : undefined;
    if (!trade) return;
    const mine = trade.offers[p.id];
    const valid = mine.slots.filter((s) => p.save.inv[s]);
    if (valid.length !== mine.slots.length || mine.gold > p.save.gold) {
      mine.slots = valid;
      mine.gold = Math.min(mine.gold, p.save.gold);
      this.unready(trade);
      this.sendTrade(trade);
    }
  }

  private execute(trade: Trade): void {
    const a = this.ctx.player(trade.a);
    const b = this.ctx.player(trade.b);
    if (!a || !b) return;
    if (dist(a.x, a.y, b.x, b.y) > TRADE_RANGE * 1.5) return this.cancelTrade(a, "You walked too far apart to trade.");
    const oa = trade.offers[a.id];
    const ob = trade.offers[b.id];
    if (oa.gold > a.save.gold || ob.gold > b.save.gold) return this.cancelTrade(a, "Someone doesn't have that much gold.");
    const itemsA = oa.slots.map((s) => a.save.inv[s]).filter((i): i is Item => Boolean(i));
    const itemsB = ob.slots.map((s) => b.save.inv[s]).filter((i): i is Item => Boolean(i));
    // Room check: freed slots count toward space.
    const freeA = a.save.inv.filter((i) => !i).length + itemsA.length;
    const freeB = b.save.inv.filter((i) => !i).length + itemsB.length;
    if (itemsB.length > freeA || itemsA.length > freeB) return this.cancelTrade(a, "Not enough bag space for that trade.");
    for (const s of oa.slots) a.save.inv[s] = null;
    for (const s of ob.slots) b.save.inv[s] = null;
    for (const it of itemsB) this.ctx.addToBag(a, it);
    for (const it of itemsA) this.ctx.addToBag(b, it);
    a.save.gold += ob.gold - oa.gold;
    b.save.gold += oa.gold - ob.gold;
    for (const m of [a, b]) {
      m.selfDirty = m.saveDirty = true;
      m.tradeId = null;
      m.session.send({ t: "trade", trade: null });
      m.session.toast("Trade complete!", "good");
    }
    this.trades.delete(trade.id);
  }

  private sendTrade(trade: Trade): void {
    for (const [meId, themId] of [[trade.a, trade.b], [trade.b, trade.a]]) {
      const me = this.ctx.player(meId);
      const them = this.ctx.player(themId);
      if (!me || !them) continue;
      const side = (p: Player) => {
        const o = trade.offers[p.id];
        return { id: p.id, name: p.name, items: o.slots.map((s) => p.save.inv[s]).filter((i): i is Item => Boolean(i)), gold: o.gold, ready: o.ready };
      };
      const view: TradeView = { me: side(me), them: side(them) };
      me.session.send({ t: "trade", trade: view });
    }
  }

  /** The bag slots a player currently has on offer (so the UI can mark them). */
  offeredSlots(p: Player): number[] {
    const trade = p.tradeId ? this.trades.get(p.tradeId) : undefined;
    return trade ? trade.offers[p.id].slots : [];
  }

  onDisconnect(p: Player): void {
    this.cancelTrade(p, `${p.name} left, so the trade was cancelled.`);
    this.leave(p, "offline");
    this.invites.delete(p.id);
    this.tradeRequests.delete(p.id);
  }
}

export function isStackable(item: Item): boolean {
  return Boolean(itemTemplate(item.tpl)?.stack);
}
