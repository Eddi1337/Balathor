// Minigames: one session per player. Overlay games (darts, Hold'em, memory, appraiser, mining
// rig, hull patching) are driven by actions from a little window; courses check checkpoints each
// tick; arenas spawn their own monsters (training dummy, ring trial, bounty camps, caravan
// escort, defence pad). Scores go to leaderboards; first clears earn trophies (titles).

import {
  COURSE_TIME_MS,
  GAMES,
  RARITY_VALUE,
  SITES_BY_ID,
  SITE_RANGE,
  TROPHIES,
  bestHand,
  cardName,
  courseFor,
  type Checkpoint,
  type GameId,
  type Site
} from "../../shared/game/minigames";
import { WAYPOINTS } from "../../shared/game/waypoints";
import { itemTemplate, makeItem, type Item } from "../../shared/game/items";
import { dist } from "../../shared/math";
import type { C2S, MgView } from "../../shared/protocol";
import type { Mob, Player } from "./entities";
import type { World } from "./world";
import { isBlockingTile } from "../../shared/world/tiles";

export interface MinigameContext {
  world(mapId: string): World | undefined;
  worldOf(p: Player): World | undefined;
  addToBag(p: Player, item: Item): boolean;
  awardXp(p: Player, xp: number): void;
  submitScore(game: string, p: Player, score: number, lowerIsBetter: boolean): boolean;
  topScores(game: string, lowerIsBetter: boolean): { name: string; score: number }[];
  /** In-game hour (0-24) and day number. */
  clock(): { hour: number; day: number };
  awardProf(p: Player, prof: "mining", xp: number): void;
}

interface Session {
  game: GameId;
  site: Site;
  startedAt: number;
  endsAt: number;
  /** Course checkpoints (courses, wayfarer). */
  course: Checkpoint[];
  next: number;
  /** Mobs this session spawned (cleaned up at the end). */
  mobs: Mob[];
  mapId: string;
  data: Record<string, unknown>;
  text: string;
  dirty: boolean;
}

const BURDEN: Partial<Record<GameId, number>> = { fletcher: 0.72 };

export class MinigameService {
  private sessions = new Map<string, Session>();
  private nextMob = 1;

  constructor(private ctx: MinigameContext) {}

  sessionOf(p: Player): Session | undefined {
    return this.sessions.get(p.id);
  }

  // ── plumbing ───────────────────────────────────────────────────────────────

  private view(p: Player, s: Session, now: number): MgView {
    const info = GAMES[s.game];
    const target = s.course[s.next] ?? (s.data.target as Checkpoint | undefined) ?? null;
    return {
      game: s.game,
      site: s.site.id,
      title: `${info.icon} ${info.name}`,
      ms: s.endsAt ? Math.max(0, s.endsAt - now) : 0,
      text: s.text,
      target,
      ui: (s.data.ui as Record<string, unknown>) ?? undefined
    };
  }

  private push(p: Player, s: Session | null, now: number): void {
    p.session.send({ t: "mg", s: s ? this.view(p, s, now) : null });
    if (s) s.dirty = false;
  }

  private grantTrophy(p: Player, game: GameId): void {
    const t = GAMES[game].trophy;
    if (!t || p.save.trophies.includes(t.id)) return;
    p.save.trophies.push(t.id);
    p.session.toast(`Trophy earned: ${t.icon} ${t.name}! Show it off at the Trophy Pedestal.`, "good");
    p.selfDirty = p.saveDirty = true;
  }

  private pay(p: Player, gold: number, xp = 0): void {
    if (gold) p.save.gold += gold;
    if (xp) this.ctx.awardXp(p, xp);
    p.selfDirty = p.saveDirty = true;
  }

  private score(p: Player, game: GameId, value: number): void {
    const board = GAMES[game].board;
    if (!board) return;
    if (this.ctx.submitScore(game, p, value, board.order === "low")) p.session.toast(`New personal best: ${value} ${board.unit}!`, "good");
  }

  /** End the current session (win, lose or quit) and tidy up. */
  end(p: Player, outcome: "win" | "lose" | "quit", message?: string): void {
    const s = this.sessions.get(p.id);
    if (!s) return;
    this.sessions.delete(p.id);
    p.burden = p.save.inv.some((i) => i?.tpl === "heavy_coin") ? 0.8 : 1;
    const w = this.ctx.world(s.mapId);
    for (const m of s.mobs) w?.despawn(m);
    if (outcome === "win") this.grantTrophy(p, s.game);
    if (message) p.session.toast(message, outcome === "win" ? "good" : outcome === "lose" ? "bad" : "info");
    this.push(p, null, Date.now());
  }

  private begin(p: Player, site: Site, now: number, opts: Partial<Session> = {}): Session {
    const s: Session = {
      game: site.game,
      site,
      startedAt: now,
      endsAt: 0,
      course: [],
      next: 0,
      mobs: [],
      mapId: p.mapId,
      data: {},
      text: "",
      dirty: true,
      ...opts
    };
    this.sessions.set(p.id, s);
    return s;
  }

  board(p: Player, game: string): void {
    const info = GAMES[game as GameId];
    if (!info?.board) return;
    p.session.send({ t: "board", game, rows: this.ctx.topScores(game, info.board.order === "low") });
  }

  setTitle(p: Player, id: string): void {
    if (id && !p.save.trophies.includes(id)) return;
    p.save.title = id ? `${TROPHIES[id].icon} ${TROPHIES[id].name}` : null;
    p.selfDirty = p.saveDirty = true;
  }

  // ── entry point ─────────────────────────────────────────────────────────────

  handle(p: Player, world: World, msg: Extract<C2S, { t: "mg" }>, now: number): void {
    if (msg.op === "board") return this.board(p, String(msg.game ?? ""));
    if (msg.op === "title") return this.setTitle(p, String(msg.action ?? ""));
    if (msg.op === "quit") return this.end(p, "quit", "Minigame abandoned.");
    if (msg.op === "act") return this.act(p, world, String(msg.action ?? ""), Number(msg.value), now);
    if (msg.op !== "start") return;
    const site = SITES_BY_ID[String(msg.site ?? "")];
    if (!site || p.dead) return;
    if (site.map !== world.def.id || dist(p.x, p.y, site.x, site.y) > SITE_RANGE + 1) return;
    if (this.sessions.has(p.id)) return p.session.toast("Finish (or quit) your current minigame first", "bad");
    const info = GAMES[site.game];
    if (p.save.gold < info.cost) return p.session.toast(`You need ${info.cost} gold to play`, "bad");
    p.save.gold -= info.cost;
    p.selfDirty = true;
    this.start(p, world, site, now);
  }

  private start(p: Player, world: World, site: Site, now: number): void {
    const game = site.game;
    switch (game) {
      case "darts": {
        const s = this.begin(p, site, now, { endsAt: now + 90_000 });
        s.data = { throws: 3, total: 0, seed: Math.random() * 100, ui: { seed: 0, t: 0, throws: 3, total: 0, last: null } };
        (s.data.ui as Record<string, unknown>).seed = s.data.seed;
        s.text = "Click when the aim crosses the bullseye!";
        break;
      }
      case "holdem": {
        const deck = Array.from({ length: 52 }, (_, i) => i).sort(() => Math.random() - 0.5);
        const s = this.begin(p, site, now, { endsAt: now + 120_000 });
        s.data = { deck, you: deck.slice(0, 2), house: deck.slice(2, 4), board: deck.slice(4, 9), pot: 10, stage: "flop" };
        s.data.ui = { you: (s.data.you as number[]).map(cardName), board: (s.data.board as number[]).slice(0, 3).map(cardName), house: ["?", "?"], stage: "flop", pot: 10 };
        s.text = "Raise 20g to see the turn and river, or fold.";
        break;
      }
      case "memory": {
        const icons = ["⚔️", "🏹", "🪄", "👑", "🧪", "🛡️", "🍀", "⭐"];
        const tiles = [...icons, ...icons].sort(() => Math.random() - 0.5);
        const s = this.begin(p, site, now, { endsAt: now + 180_000 });
        s.data = { tiles, up: [] as number[], matched: [] as number[], flips: 0, hideAt: 0, ui: { shown: Array(16).fill(""), flips: 0 } };
        s.text = "Find all eight pairs.";
        break;
      }
      case "appraiser": {
        const value = Math.round(
          p.save.inv.reduce((n, it) => n + (it ? (itemTemplate(it.tpl)?.value ?? 1) * it.qty * (RARITY_VALUE[it.rarity] ?? 1) : 0), 0)
        );
        const s = this.begin(p, site, now, { endsAt: now + 60_000 });
        s.data = { value, ui: { items: p.save.inv.filter(Boolean).length } };
        s.text = "How much is everything in your bag worth, in gold?";
        break;
      }
      case "rig":
      case "repair": {
        const s = this.begin(p, site, now, { endsAt: now + 60_000 });
        s.data = { left: 5, hits: 0, seed: Math.random() * 100, zone: 0.35 + Math.random() * 0.3, ui: { seed: 0, t: 0, left: 5, hits: 0, zone: 0 } };
        Object.assign(s.data.ui as object, { seed: s.data.seed, zone: s.data.zone });
        s.text = game === "rig" ? "Pulse the drill when the needle is in the green." : "Swing when the hammer is over the gold nail.";
        break;
      }
      case "dummy": {
        const s = this.begin(p, site, now, { endsAt: now + 30_000 });
        const mob = world.spawnTemp(`mg_dummy_${this.nextMob++}`, "training_dummy", p.save.lv, site.x + 2, site.y - 1);
        if (mob) s.mobs.push(mob);
        s.data = { damage: 0 };
        s.text = "Hit the dummy! Damage: 0";
        break;
      }
      case "ring": {
        const s = this.begin(p, site, now, { endsAt: now + 45_000 });
        s.data = { target: { map: site.map, x: site.x, y: site.y, r: 4, label: "Stay in the ring" }, nextWave: now + 1500, outside: 0 };
        s.text = "Stay inside the ring!";
        break;
      }
      case "bounty": {
        // A camp somewhere out in the fields or forest.
        let camp = { x: site.x, y: site.y + 50 };
        for (let i = 0; i < 40; i += 1) {
          const a = Math.random() * Math.PI * 2;
          const r = 40 + Math.random() * 30;
          const x = site.x + Math.cos(a) * r;
          const y = site.y + Math.sin(a) * r;
          if (Math.hypot(x, y) > 112 && !isBlockingTile(world.def.tileAt(x, y))) {
            camp = { x, y };
            break;
          }
        }
        const s = this.begin(p, site, now, { endsAt: now + 150_000 });
        for (let i = 0; i < 6; i += 1) {
          const a = (i / 6) * Math.PI * 2;
          const mob = world.spawnTemp(`mg_bandit_${this.nextMob++}`, "bandit", Math.max(2, p.save.lv), camp.x + Math.cos(a) * 3, camp.y + Math.sin(a) * 3);
          if (mob) s.mobs.push(mob);
        }
        s.data = { target: { map: site.map, x: camp.x, y: camp.y, r: 6, label: "Bandit camp" } };
        s.text = "Clear the bandit camp: 6 left";
        break;
      }
      case "escort": {
        const end = WAYPOINTS.find((w) => w.id === "wp_east_road")!;
        const s = this.begin(p, site, now, { endsAt: now + 240_000 });
        const cart = world.spawnTemp(`mg_caravan_${this.nextMob++}`, "caravan", p.save.lv, site.x, site.y);
        if (cart) s.mobs.push(cart);
        s.data = { cart, to: { x: end.x, y: end.y + 3 }, nextAmbush: now + 9000, away: 0 };
        s.text = "Stay with the caravan to the Dune Gate!";
        break;
      }
      case "turret": {
        if (!p.ship) return p.session.toast("Fly your ship to the pad first", "bad");
        const s = this.begin(p, site, now, { endsAt: now + 60_000 });
        s.data = { kills: 0, nextWave: now + 1000, target: { map: site.map, x: site.x, y: site.y, r: 22, label: "Defence pad" } };
        s.text = "Defend the pad! Drones down: 0 / 8";
        break;
      }
      case "relay":
      case "swim":
      case "courier":
      case "fletcher":
      case "lane":
      case "orbital": {
        if (game === "lane" && !p.ship) return p.session.toast("You need to be flying your ship", "bad");
        const s = this.begin(p, site, now, { endsAt: now + (COURSE_TIME_MS[game] ?? 180_000), course: courseFor(game) });
        s.text = s.course[0]?.label ?? "";
        if (BURDEN[game]) p.burden = BURDEN[game]!;
        break;
      }
      case "wayfarer": {
        const far = WAYPOINTS.filter((w) => !["wp_hearthmoor", "wp_citadel"].includes(w.id)).sort(() => Math.random() - 0.5).slice(0, 3);
        const course: Checkpoint[] = far.map((w) => ({ map: "overworld", x: w.x, y: w.y, r: 6, label: w.name }));
        course.push({ map: "overworld", x: site.x, y: site.y, r: 4, label: "Back to the Wayfarer's Board" });
        const s = this.begin(p, site, now, { endsAt: now + (COURSE_TIME_MS.wayfarer ?? 600_000), course });
        s.text = `Visit ${far.map((w) => w.name).join(", ")}`;
        break;
      }
      case "vault":
        return this.vault(p);
      case "hollow":
        return this.hollow(p);
      case "pedestal":
        p.session.send({ t: "mg", s: { game: "pedestal", site: site.id, title: "🏆 Trophy Pedestal", ms: 0, text: "Choose a trophy to wear as your title.", ui: { trophies: p.save.trophies } } });
        return;
    }
    const s = this.sessions.get(p.id);
    if (s) this.push(p, s, now);
  }

  // ── services ─────────────────────────────────────────────────────────────────

  private vault(p: Player): void {
    let coins = 0;
    p.save.inv = p.save.inv.map((it) => {
      if (it?.tpl === "heavy_coin") {
        coins += it.qty;
        return null;
      }
      return it;
    });
    if (!coins) return p.session.toast("You carry no cursed Heavy Coins. (Bosses sometimes drop them.)", "info");
    p.burden = 1;
    this.pay(p, 60 * coins, 40 * coins);
    this.grantTrophy(p, "vault");
    p.session.toast(`The vault swallows ${coins} cursed coin${coins > 1 ? "s" : ""}. Your step lightens! +${60 * coins} gold`, "good");
  }

  private hollow(p: Player): void {
    const { hour, day } = this.ctx.clock();
    if (hour >= 5 && hour < 20) return p.session.toast("The Hollow Stone sleeps by day. Come back after dusk.", "info");
    const night = hour >= 20 ? day : day - 1;
    if (p.save.hollow.night !== night) p.save.hollow = { night, n: 0 };
    if (p.save.hollow.n >= 3) return p.session.toast("The stone is full for tonight.", "info");
    const slot = p.save.inv.findIndex((i) => i?.tpl === "shiny_pebble");
    if (slot < 0) return p.session.toast("The stone wants a shiny pebble.", "info");
    const it = p.save.inv[slot]!;
    it.qty -= 1;
    if (it.qty <= 0) p.save.inv[slot] = null;
    p.save.hollow.n += 1;
    const roll = Math.random();
    const reward = roll < 0.45 ? makeItem("potion_big", "common", 1, 2) : roll < 0.75 ? makeItem("ring_moon", Math.random() < 0.3 ? "rare" : "uncommon", p.save.lv) : roll < 0.95 ? makeItem("pearl") : makeItem("ring_ember", "epic", p.save.lv);
    const ok = this.ctx.addToBag(p, reward);
    this.pay(p, 20);
    if (p.save.hollow.n === 3) this.grantTrophy(p, "hollow");
    p.session.toast(`The stone glows softly (${p.save.hollow.n}/3 tonight)${ok ? ` and leaves you a gift!` : "."}`, "good");
  }

  // ── actions from overlay windows ─────────────────────────────────────────────

  private act(p: Player, world: World, action: string, value: number, now: number): void {
    const s = this.sessions.get(p.id);
    if (!s) return;
    const ui = s.data.ui as Record<string, unknown>;
    switch (s.game) {
      case "darts": {
        if (action !== "throw" || (s.data.throws as number) <= 0) return;
        // Where was the wobbling aim at that moment? (Client time, sanity-checked against ours.)
        const elapsed = now - s.startedAt;
        const t = (Number.isFinite(value) && Math.abs(value - elapsed) < 600 ? value : elapsed) / 1000;
        const seed = s.data.seed as number;
        const ax = Math.sin(t * 1.9 + seed) * 0.75 + Math.sin(t * 4.3 + seed * 2) * 0.2;
        const ay = Math.cos(t * 1.5 + seed * 3) * 0.75 + Math.sin(t * 3.7 + seed) * 0.2;
        const d = Math.hypot(ax, ay);
        const pts = d < 0.08 ? 50 : d < 0.22 ? 25 : d < 0.42 ? 15 : d < 0.62 ? 10 : d < 0.9 ? 5 : 0;
        s.data.throws = (s.data.throws as number) - 1;
        s.data.total = (s.data.total as number) + pts;
        Object.assign(ui, { throws: s.data.throws, total: s.data.total, last: { x: ax, y: ay, pts } });
        s.text = pts === 50 ? "BULLSEYE! 50 points!" : `${pts} points`;
        if ((s.data.throws as number) <= 0) {
          const total = s.data.total as number;
          const gold = Math.round(total * 0.4);
          this.pay(p, gold);
          this.score(p, "darts", total);
          this.push(p, s, now);
          return this.end(p, total >= 100 ? "win" : "quit", `Darts: ${total} points, ${gold} gold.${total >= 100 ? "" : " (Score 100+ for the trophy!)"}`);
        }
        break;
      }
      case "holdem": {
        if (s.data.stage !== "flop") return;
        if (action === "fold") return this.end(p, "lose", "You fold. The house takes the ante.");
        if (action !== "raise") return;
        if (p.save.gold < 20) return p.session.toast("You need 20 gold to raise", "bad");
        p.save.gold -= 20;
        const pot = 60; // your 10 + 20, matched by the house
        const you = bestHand([...(s.data.you as number[]), ...(s.data.board as number[])]);
        const house = bestHand([...(s.data.house as number[]), ...(s.data.board as number[])]);
        Object.assign(ui, { board: (s.data.board as number[]).map(cardName), house: (s.data.house as number[]).map(cardName), stage: "done", you2: you.name, house2: house.name, pot });
        s.data.stage = "done";
        let msg: string;
        let won = 0;
        if (you.score > house.score) {
          won = pot;
          msg = `${you.name} beats the house's ${house.name}! You win ${pot} gold.`;
        } else if (you.score === house.score) {
          won = 30;
          msg = `Split pot: both ${you.name}. Your stake comes back.`;
        } else msg = `The house's ${house.name} beats your ${you.name}.`;
        this.pay(p, won);
        if (won > 30) this.score(p, "holdem", won - 30);
        s.text = msg;
        this.push(p, s, now);
        return this.end(p, won > 30 ? "win" : "lose", msg);
      }
      case "memory": {
        if (action !== "flip") return;
        const i = Math.floor(value);
        const tiles = s.data.tiles as string[];
        const up = s.data.up as number[];
        const matched = s.data.matched as number[];
        if (!(i >= 0 && i < 16) || up.includes(i) || matched.includes(i) || up.length >= 2 || (s.data.hideAt as number) > 0) return;
        up.push(i);
        s.data.flips = (s.data.flips as number) + 1;
        const shown = ui.shown as string[];
        shown[i] = tiles[i];
        ui.flips = s.data.flips;
        if (up.length === 2) {
          if (tiles[up[0]] === tiles[up[1]]) {
            matched.push(...up);
            s.data.up = [];
          } else s.data.hideAt = now + 1100;
        }
        if (matched.length === 16) {
          const flips = s.data.flips as number;
          const gold = Math.max(10, 50 - flips);
          this.pay(p, gold, 20);
          this.score(p, "memory", flips);
          this.push(p, s, now);
          return this.end(p, "win", `All pairs in ${flips} flips! +${gold} gold`);
        }
        break;
      }
      case "appraiser": {
        if (action !== "guess" || !Number.isFinite(value)) return;
        const real = s.data.value as number;
        const off = Math.abs(value - real) / Math.max(1, real);
        if (off <= 0.15) {
          const gold = Math.min(500, 25 + Math.round(real * 0.05));
          this.pay(p, gold);
          return this.end(p, "win", `Spot on! It's worth about ${real} gold. Here's ${gold} for your keen eye.`);
        }
        return this.end(p, "lose", `Not quite: your bag is worth about ${real} gold.`);
      }
      case "rig":
      case "repair": {
        if (action !== "pulse" || (s.data.left as number) <= 0) return;
        const elapsed = now - s.startedAt;
        const t = (Number.isFinite(value) && Math.abs(value - elapsed) < 600 ? value : elapsed) / 1000;
        const needle = (Math.sin(t * 2.6 + (s.data.seed as number)) + 1) / 2;
        const zone = s.data.zone as number;
        const hit = Math.abs(needle - zone) < 0.09;
        s.data.left = (s.data.left as number) - 1;
        if (hit) s.data.hits = (s.data.hits as number) + 1;
        s.data.zone = 0.2 + Math.random() * 0.6;
        Object.assign(ui, { left: s.data.left, hits: s.data.hits, zone: s.data.zone, last: hit });
        s.text = hit ? "Perfect!" : "Missed…";
        if ((s.data.left as number) <= 0) {
          const hits = s.data.hits as number;
          if (s.game === "rig") {
            if (hits > 0) this.ctx.addToBag(p, makeItem("bar_titanium", "common", 1, hits));
            this.ctx.awardProf(p, "mining", hits * 20);
            this.push(p, s, now);
            return this.end(p, hits >= 4 ? "win" : hits >= 3 ? "quit" : "lose", `The rig coughs up ${hits} titanium bar${hits === 1 ? "" : "s"}.`);
          }
          // Hull patching: pays, and mends your own ship if it's nearby.
          this.pay(p, hits * 12);
          for (const ship of world.ships.values()) if (ship.ownerId === p.id) ship.hp = Math.min(ship.def.hp, ship.hp + ship.def.hp * 0.08 * hits);
          this.push(p, s, now);
          return this.end(p, hits >= 4 ? "win" : "quit", `${hits}/5 planks hammered home. +${hits * 12} gold`);
        }
        break;
      }
      default:
        return;
    }
    this.push(p, s, now);
  }

  // ── hooks ────────────────────────────────────────────────────────────────────

  onMobDamaged(world: World, mob: Mob, by: Player | null, dmg: number): void {
    if (!by) return;
    const s = this.sessions.get(by.id);
    if (s?.game === "dummy" && s.mobs.includes(mob)) {
      s.data.damage = (s.data.damage as number) + dmg;
      s.text = `Hit the dummy! Damage: ${s.data.damage}`;
      s.dirty = true;
    }
    void world;
  }

  onMobKilled(world: World, mob: Mob, killers: Player[]): void {
    for (const p of killers) {
      const s = this.sessions.get(p.id);
      if (!s) continue;
      if (s.game === "turret" && mob.tpl.id === "scrap_drone") {
        s.data.kills = (s.data.kills as number) + 1;
        s.text = `Defend the pad! Drones down: ${s.data.kills} / 8`;
        s.dirty = true;
      }
    }
    // Bosses sometimes drop a cursed Heavy Coin for the Town Vault.
    if (mob.tpl.boss && Math.random() < 0.3) world.spawnLoot(mob.x, mob.y, makeItem("heavy_coin"), 0, killers[0]?.id ?? null, Date.now());
  }

  onLeave(p: Player): void {
    if (this.sessions.has(p.id)) this.end(p, "quit");
  }

  /** Per-tick upkeep for every running session. */
  tick(players: Iterable<Player>, now: number): void {
    for (const p of players) {
      const s = this.sessions.get(p.id);
      if (!s) continue;
      const world = this.ctx.worldOf(p);
      if (!world || p.dead) {
        this.end(p, "lose", "You fell, and the minigame ended.");
        continue;
      }
      if (s.endsAt && now > s.endsAt) {
        this.timeUp(p, s, world);
        continue;
      }
      const base = p.mapId.split("#")[0];
      // Courses: reach each checkpoint in turn.
      const cp = s.course[s.next];
      if (cp && cp.map === base && dist(p.x, p.y, cp.x, cp.y) <= cp.r) {
        s.next += 1;
        s.dirty = true;
        if (s.next >= s.course.length) {
          this.finishCourse(p, s, now);
          continue;
        }
        s.text = `${cp.label} ✓ Next: ${s.course[s.next].label}`;
      }
      switch (s.game) {
        case "memory": {
          const hideAt = s.data.hideAt as number;
          if (hideAt && now >= hideAt) {
            const shown = (s.data.ui as { shown: string[] }).shown;
            for (const i of s.data.up as number[]) shown[i] = "";
            s.data.up = [];
            s.data.hideAt = 0;
            s.dirty = true;
          }
          break;
        }
        case "ring": {
          const t = s.data.target as Checkpoint;
          const inside = dist(p.x, p.y, t.x, t.y) <= t.r;
          s.data.outside = inside ? 0 : (s.data.outside as number) || now;
          if (!inside && now - (s.data.outside as number) > 3000) {
            this.end(p, "lose", "You left the ring!");
            continue;
          }
          if (now >= (s.data.nextWave as number)) {
            s.data.nextWave = now + 6000;
            for (let i = 0; i < 3; i += 1) {
              const a = Math.random() * Math.PI * 2;
              const mob = world.spawnTemp(`mg_slime_${this.nextMob++}`, "slime", Math.max(1, p.save.lv - 1), t.x + Math.cos(a) * 9, t.y + Math.sin(a) * 9);
              if (mob) {
                mob.state = "chase";
                mob.targetId = p.id;
                s.mobs.push(mob);
              }
            }
          }
          const left = Math.ceil((s.endsAt - now) / 1000);
          const text = inside ? `Hold the ring! ${left}s` : "Get back in the ring!";
          if (text !== s.text) {
            s.text = text;
            s.dirty = true;
          }
          break;
        }
        case "bounty": {
          const alive = s.mobs.filter((m) => !m.dead).length;
          if (!alive) {
            const gold = 40 + p.save.lv * 6;
            this.pay(p, gold, 60 + p.save.lv * 10);
            this.end(p, "win", `Camp cleared! Bounty paid: ${gold} gold.`);
            continue;
          }
          const text = `Clear the bandit camp: ${alive} left`;
          if (text !== s.text) {
            s.text = text;
            s.dirty = true;
          }
          break;
        }
        case "escort": {
          const cart = s.data.cart as Mob | undefined;
          const to = s.data.to as { x: number; y: number };
          if (!cart) break;
          const d = dist(cart.x, cart.y, to.x, to.y);
          if (d < 2) {
            const gold = 60 + p.save.lv * 6;
            this.pay(p, gold, 80 + p.save.lv * 10);
            this.end(p, "win", `The caravan made it! The merchants pay you ${gold} gold.`);
            continue;
          }
          // The cart trundles along (it waits if you fall behind).
          const near = dist(p.x, p.y, cart.x, cart.y) < 12;
          if (near) {
            const step = Math.min(d, 2.2 * 0.05);
            cart.x += ((to.x - cart.x) / d) * step;
            cart.y += ((to.y - cart.y) / d) * step;
            cart.f = Math.atan2(to.y - cart.y, to.x - cart.x);
            cart.moving = true;
            world.grid.moved(cart);
            s.data.away = 0;
          } else {
            cart.moving = false;
            s.data.away = (s.data.away as number) || now;
            if (now - (s.data.away as number) > 15_000) {
              this.end(p, "lose", "You left the caravan behind. It turned back to town.");
              continue;
            }
          }
          if (now >= (s.data.nextAmbush as number)) {
            s.data.nextAmbush = now + 15_000;
            for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i += 1) {
              const a = Math.random() * Math.PI * 2;
              const mob = world.spawnTemp(`mg_bandit_${this.nextMob++}`, "bandit", Math.max(2, p.save.lv), cart.x + Math.cos(a) * 10, cart.y + Math.sin(a) * 10);
              if (mob) {
                mob.state = "chase";
                mob.targetId = p.id;
                s.mobs.push(mob);
              }
            }
            p.session.toast("Ambush! Protect the caravan!", "bad");
          }
          const text = near ? `Escort the caravan: ${Math.round(d)} tiles to go` : "Catch up with the caravan!";
          if (text !== s.text) {
            s.text = text;
            s.dirty = true;
          }
          s.data.target = { map: "overworld", x: cart.x, y: cart.y, r: 3, label: "Caravan" };
          break;
        }
        case "turret": {
          if (!p.ship) {
            this.end(p, "lose", "You left the pad.");
            continue;
          }
          if (now >= (s.data.nextWave as number)) {
            s.data.nextWave = now + 12_000;
            const t = s.data.target as Checkpoint;
            for (let i = 0; i < 3; i += 1) {
              const a = Math.random() * Math.PI * 2;
              const mob = world.spawnTemp(`mg_drone_${this.nextMob++}`, "scrap_drone", Math.max(3, p.save.lv), t.x + Math.cos(a) * 26, t.y + Math.sin(a) * 26);
              if (mob) {
                mob.state = "chase";
                mob.targetId = p.id;
                s.mobs.push(mob);
              }
            }
          }
          break;
        }
      }
      // Overlay games update on actions; everything else gets a gentle once-a-second refresh.
      if (s.dirty || (GAMES[s.game].kind !== "overlay" && (now - s.startedAt) % 1000 < 50)) this.push(p, s, now);
    }
  }

  private finishCourse(p: Player, s: Session, now: number): void {
    const secs = Math.round((now - s.startedAt) / 100) / 10;
    const gold: Partial<Record<GameId, number>> = { relay: 50, swim: 45, wayfarer: 120, courier: 70, fletcher: 110, lane: 90, orbital: 260 };
    const g = (gold[s.game] ?? 40) + p.save.lv * 3;
    this.pay(p, g, 40 + p.save.lv * 8);
    this.score(p, s.game, secs);
    this.end(p, "win", `${GAMES[s.game].name} complete in ${secs}s! +${g} gold`);
  }

  private timeUp(p: Player, s: Session, world: World): void {
    if (s.game === "dummy") {
      const dmg = s.data.damage as number;
      this.score(p, "dummy", dmg);
      this.pay(p, Math.round(dmg / 60));
      return this.end(p, dmg >= 1500 ? "win" : "quit", `Time! You dealt ${dmg} damage to the dummy.`);
    }
    if (s.game === "ring") {
      this.pay(p, 50 + p.save.lv * 5, 50 + p.save.lv * 10);
      return this.end(p, "win", "You held the ring! The guild is impressed.");
    }
    if (s.game === "turret") {
      const kills = s.data.kills as number;
      if (kills >= 8) {
        this.pay(p, 120 + p.save.lv * 5, 100 + p.save.lv * 10);
        return this.end(p, "win", `Pad defended: ${kills} drones down!`);
      }
      return this.end(p, "lose", `Only ${kills} drones stopped. The pad needs a sharper pilot.`);
    }
    void world;
    this.end(p, "lose", "Time's up!");
  }
}
