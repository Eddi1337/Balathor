// A running map instance: its entities, spatial index and simulation systems (mob/NPC AI,
// abilities, projectiles, zones, buffs, loot, regen). Rules that touch saves/XP/quests live in
// Game and are reached through hooks.

import type { MapDef } from "../../shared/world/maps";
import { BIOME_BOSSES, BIOME_SPAWNS, MOB_TEMPLATES, mobStats, type MobTemplate } from "../../shared/game/mobs";
import { NPCS, scheduleAt } from "../../shared/game/npcs";
import { CLASSES } from "../../shared/game/classes";
import { MOUNT_SPEED_MULT, mitigate } from "../../shared/game/stats";
import { circleBlocked, stepMovement } from "../../shared/game/movement";
import { findPath } from "../../shared/game/pathfind";
import type { BuffId, Talent, ZoneKind } from "../../shared/game/talents";
import { EMOTES } from "../../shared/game/emotes";
import { blocksProjectile, Tile } from "../../shared/world/tiles";
import { coastRadiusAt, MEADOW_RADIUS, type Biome } from "../../shared/world/overworld";
import { bossSpot } from "../../shared/world/landmarks";
import { TOWN_WALL_OUTER } from "../../shared/world/town";
import { angleDelta, dist, dist2, rng, TAU } from "../../shared/math";
import type { FxEvent, ProjectileKind } from "../../shared/protocol";
import { Loot, Mob, Npc, Player, type Entity } from "./entities";
import { SpatialGrid } from "./spatial";

export interface WorldHooks {
  onMobKilled(world: World, mob: Mob): void;
  onPlayerDied(world: World, player: Player, by: Mob | null): void;
  /** Current in-game hour (0-24), for NPC routines. */
  hour(): number;
  /** Party members of p on this map (including p). */
  partyOf(p: Player): Player[];
}

interface Projectile {
  pid: number;
  kind: ProjectileKind;
  ownerId: string;
  team: "player" | "mob";
  x: number;
  y: number;
  dx: number;
  dy: number;
  spd: number;
  remaining: number;
  dmg: number;
  splash: number;
  pierce: boolean;
  hit: Set<string> | null;
  slow: number;
  stunMs: number;
}

interface Zone {
  zid: number;
  ownerId: string;
  kind: ZoneKind;
  x: number;
  y: number;
  r: number;
  until: number;
  nextTick: number;
  tickMs: number;
  dmg: number;
  slow: number;
  healPct: number;
}

interface ProjectileOpts {
  splash?: number;
  pierce?: boolean;
  slow?: number;
  stunMs?: number;
}

const MOB_WAKE_RADIUS = 52;
const MOB_LEASH = 18;
const LOOT_LIFETIME_MS = 120_000;
const LOOT_OWNER_MS = 25_000;
const FX_RADIUS = 44;
const MOB_RESPAWN_MS = 45_000;
const BOSS_RESPAWN_MS = 5 * 60_000;
const DEATH_VISIBLE_MS = 2200;
const PARTY_RADIUS = 14;
const NPC_SPEED = 1.8;

export class World {
  readonly players = new Map<string, Player>();
  readonly mobs = new Map<string, Mob>();
  readonly npcs = new Map<string, Npc>();
  readonly loot = new Map<string, Loot>();
  readonly grid = new SpatialGrid<Entity>();
  private projectiles: Projectile[] = [];
  private zones: Zone[] = [];
  private nextPid = 1;
  private nextZid = 1;
  private nextLoot = 1;
  /** Grid cells near any player; only mobs in these cells think. */
  private awakeCells = new Set<number>();
  private awakeRefreshAt = 0;

  constructor(readonly def: MapDef, private hooks: WorldHooks) {}

  // ── population ──────────────────────────────────────────────────────────────

  populate(): void {
    for (const def of NPCS) {
      const npc = new Npc(def.id, def);
      this.npcs.set(npc.id, npc);
      this.grid.insert(npc);
    }
    this.spawnWildlife();
    this.spawnBosses();
  }

  private spawnWildlife(): void {
    const rand = rng(424242);
    const SPACING = 8;
    let n = 0;
    const R = this.def.bounds;
    for (let gx = -R; gx <= R; gx += SPACING) {
      for (let gy = -R; gy <= R; gy += SPACING) {
        const x = gx + rand() * SPACING;
        const y = gy + rand() * SPACING;
        const d = Math.hypot(x, y);
        if (d < TOWN_WALL_OUTER + 6) continue;
        if (d > coastRadiusAt(Math.atan2(y, x)) - 4) continue;
        // Thin out the starter meadow a little so it stays calm near the gates.
        if (d < MEADOW_RADIUS && rand() < 0.45) continue;
        if (rand() < 0.38) continue;
        if (circleBlocked(this.def, x, y, 0.45)) continue;
        if (this.def.tileAt(x, y) === Tile.SHALLOW) continue;
        const table = BIOME_SPAWNS[this.def.biomeAt(x, y)];
        if (!table) continue;
        const tplId = pickWeighted(table, rand());
        const tpl = MOB_TEMPLATES[tplId];
        if (!tpl) continue;
        const level = Math.max(1, this.def.zoneLevelAt(x, y) + Math.floor(rand() * 3) - 1);
        this.addMob(`m${n++}`, tpl, level, x, y, MOB_RESPAWN_MS);
      }
    }
  }

  private spawnBosses(): void {
    for (const [biome, tplId] of Object.entries(BIOME_BOSSES)) {
      const tpl = MOB_TEMPLATES[tplId as string];
      if (!tpl) continue;
      const spot = bossSpot(biome as Biome);
      const level = biome === "meadow" ? 4 : this.def.zoneLevelAt(spot.x, spot.y) + 3;
      this.addMob(`boss_${biome}`, tpl, level, spot.x, spot.y, BOSS_RESPAWN_MS);
    }
  }

  private addMob(id: string, tpl: MobTemplate, level: number, x: number, y: number, respawnMs: number): Mob {
    const mob = new Mob(id, tpl, level, x, y, mobStats(tpl, level), respawnMs);
    mob.nextThinkAt = Date.now() + Math.random() * 4000;
    this.mobs.set(id, mob);
    this.grid.insert(mob);
    return mob;
  }

  // ── players ─────────────────────────────────────────────────────────────────

  addPlayer(p: Player): void {
    p.mapId = this.def.id;
    this.players.set(p.id, p);
    this.grid.insert(p);
  }

  removePlayer(p: Player): void {
    this.players.delete(p.id);
    this.grid.remove(p);
    this.dropAggroOn(p.id);
  }

  private dropAggroOn(playerId: string): void {
    for (const mob of this.mobs.values()) {
      if (mob.targetId === playerId) {
        mob.targetId = null;
        if (mob.state === "chase") mob.state = "return";
      }
    }
  }

  /** Effects that end when you start fighting. */
  private interrupt(p: Player): void {
    p.mounted = false;
    p.emote = "";
    p.buffs.delete("camo");
  }

  setEmote(p: Player, id: string, now: number): void {
    if (p.dead || !EMOTES[id]) return;
    p.emote = id;
    p.emoteUntil = EMOTES[id].loop ? Infinity : now + 4000;
    if (id === "sit") p.mounted = false;
  }

  // ── effects ─────────────────────────────────────────────────────────────────

  /** Queue an effect for every player near (x, y). */
  fx(x: number, y: number, ev: FxEvent, radius = FX_RADIUS): void {
    this.grid.forEachNear(x, y, radius, (e) => {
      if (e.kind === "player") e.session.fx.push(ev);
    });
  }

  // ── combat ──────────────────────────────────────────────────────────────────

  private outgoingDamage(p: Player, mult: number): number {
    let dmg = p.derived.damage * mult;
    const rage = p.buffs.get("rage");
    if (rage) dmg *= 1 + rage.value;
    if (p.buffs.has("camo")) dmg *= 2; // ambush bonus; camo then breaks
    return dmg;
  }

  attackCooldown(p: Player): number {
    const haste = p.buffs.get("haste");
    return CLASSES[p.save.cls].cooldownMs * (haste ? 1 - haste.value : 1);
  }

  playerAttack(p: Player, angle: number, now: number): boolean {
    const cls = CLASSES[p.save.cls];
    if (p.dead || now - p.lastAttackAt < this.attackCooldown(p) * 0.9) return false;
    p.lastAttackAt = now;
    p.f = angle;
    const dmg = this.outgoingDamage(p, 1);
    this.interrupt(p);
    if (cls.attack === "melee") {
      this.fx(p.x, p.y, { e: "swing", id: p.id, a: angle });
      this.grid.forEachNear(p.x, p.y, cls.range + 2, (e) => {
        if (e.kind !== "mob" || e.dead) return;
        const d = dist(p.x, p.y, e.x, e.y);
        if (d > cls.range + e.radius) return;
        const toward = Math.atan2(e.y - p.y, e.x - p.x);
        if (d > 0.6 && Math.abs(angleDelta(angle, toward)) > cls.arc / 2) return;
        this.damageMob(e, p, rollDamage(dmg), now);
      });
    } else {
      this.fx(p.x, p.y, { e: "cast", id: p.id, a: angle });
      const kind: ProjectileKind = cls.id === "mage" ? "fireball" : "arrow";
      this.spawnProjectile(p.id, "player", kind, p.x, p.y, angle, cls.speed, cls.range, dmg, { splash: cls.splash });
    }
    return true;
  }

  /** Use a talent ability. Ownership and cooldown are checked by the caller. */
  castAbility(p: Player, t: Talent, angle: number, tx: number, ty: number, now: number): boolean {
    if (p.dead) return false;
    const eff = t.effect;
    p.f = angle;
    if (eff.type === "buff" || eff.type === "heal") {
      p.mounted = false;
      p.emote = "";
    } else {
      this.interrupt(p);
    }
    this.fx(p.x, p.y, { e: "ability", id: p.id, ab: t.id, a: round(angle) });
    switch (eff.type) {
      case "projectile": {
        const count = eff.count ?? 1;
        const dmg = this.outgoingDamage(p, eff.mult);
        for (let i = 0; i < count; i += 1) {
          const a = angle + (count > 1 ? (i - (count - 1) / 2) * (eff.spread ?? 0.2) : 0);
          this.spawnProjectile(p.id, "player", eff.kind, p.x, p.y, a, eff.speed, eff.range, dmg, {
            splash: eff.splash,
            pierce: eff.pierce,
            slow: eff.slow,
            stunMs: eff.stunMs
          });
        }
        break;
      }
      case "nova": {
        const dmg = this.outgoingDamage(p, eff.mult);
        this.fx(p.x, p.y, { e: "nova", id: p.id, ab: t.id, x: round(p.x), y: round(p.y), r: eff.radius });
        this.grid.forEachNear(p.x, p.y, eff.radius + 2, (e) => {
          if (e.kind !== "mob" || e.dead) return;
          const d = dist(p.x, p.y, e.x, e.y);
          if (d > eff.radius + e.radius) return;
          if (eff.stunMs) e.stunUntil = Math.max(e.stunUntil, now + eff.stunMs);
          if (eff.slow) {
            e.slowUntil = now + 3000;
            e.slowMult = 1 - eff.slow;
          }
          if (eff.blindMs) {
            e.blindUntil = now + eff.blindMs;
            if (e.state === "chase") e.state = "return";
            e.targetId = null;
          }
          if (eff.knock && d > 0.01) {
            const k = { x: e.x, y: e.y };
            stepMovement(this.def, k, (e.x - p.x) / d, (e.y - p.y) / d, eff.knock * 10, 0.1);
            e.x = k.x;
            e.y = k.y;
            this.grid.moved(e);
          }
          if (eff.mult > 0) this.damageMob(e, p, rollDamage(dmg), now);
        });
        break;
      }
      case "zone": {
        let zx = p.x;
        let zy = p.y;
        if (eff.at === "target") {
          const aimed = Number.isFinite(tx) && Number.isFinite(ty) && Math.hypot(tx - p.x, ty - p.y) > 0.5;
          const d = aimed ? Math.min(eff.range, Math.hypot(tx - p.x, ty - p.y)) : eff.range * 0.6;
          const a = aimed ? Math.atan2(ty - p.y, tx - p.x) : angle;
          zx = p.x + Math.cos(a) * d;
          zy = p.y + Math.sin(a) * d;
        }
        const zone: Zone = {
          zid: this.nextZid++,
          ownerId: p.id,
          kind: eff.kind,
          x: zx,
          y: zy,
          r: eff.radius,
          until: now + eff.durMs,
          nextTick: now + 150,
          tickMs: eff.tickMs,
          dmg: this.outgoingDamage(p, eff.mult),
          slow: eff.slow ?? 0,
          healPct: eff.healPct ?? 0
        };
        this.zones.push(zone);
        this.fx(zx, zy, { e: "zone", zid: zone.zid, kind: eff.kind, x: round(zx), y: round(zy), r: eff.radius, dur: eff.durMs });
        break;
      }
      case "buff": {
        const targets = eff.party ? this.hooks.partyOf(p).filter((o) => !o.dead && dist(o.x, o.y, p.x, p.y) <= PARTY_RADIUS) : [p];
        for (const o of targets) this.applyBuff(o, eff.buff, eff.durMs, eff.value, now);
        if (eff.resetCooldowns) {
          for (const id of [...p.cooldowns.keys()]) if (id !== t.id) p.cooldowns.delete(id);
        }
        if (eff.buff === "camo") this.dropAggroOn(p.id);
        break;
      }
      case "heal": {
        this.heal(p, p.derived.maxHp * eff.pct);
        if (eff.partyPct) {
          for (const o of this.hooks.partyOf(p)) {
            if (o !== p && !o.dead && dist(o.x, o.y, p.x, p.y) <= PARTY_RADIUS) this.heal(o, o.derived.maxHp * eff.partyPct);
          }
        }
        break;
      }
    }
    return true;
  }

  applyBuff(p: Player, buff: BuffId, durMs: number, value: number, now: number): void {
    p.buffs.set(buff, { until: now + durMs, value, absorb: buff === "shield" ? p.derived.maxHp * value : undefined });
    this.fx(p.x, p.y, { e: "buff", id: p.id, buff, dur: durMs });
  }

  heal(p: Player, amount: number, quiet = false): void {
    if (p.dead) return;
    const amt = Math.min(p.derived.maxHp - p.hp, amount);
    if (amt <= 0) return;
    p.hp += amt;
    if (!quiet && amt >= 1) this.fx(p.x, p.y, { e: "heal", id: p.id, amt: Math.round(amt) });
  }

  private spawnProjectile(
    ownerId: string,
    team: Projectile["team"],
    kind: ProjectileKind,
    x: number,
    y: number,
    angle: number,
    spd: number,
    range: number,
    dmg: number,
    opts: ProjectileOpts = {}
  ): void {
    const pid = this.nextPid++;
    const sx = x + Math.cos(angle) * 0.4;
    const sy = y + Math.sin(angle) * 0.4;
    this.projectiles.push({
      pid,
      kind,
      ownerId,
      team,
      x: sx,
      y: sy,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      spd,
      remaining: range,
      dmg,
      splash: opts.splash ?? 0,
      pierce: Boolean(opts.pierce),
      hit: opts.pierce ? new Set() : null,
      slow: opts.slow ?? 0,
      stunMs: opts.stunMs ?? 0
    });
    this.fx(sx, sy, { e: "proj", pid, by: ownerId, kind, x: round(sx), y: round(sy), a: round(angle), spd, rng: range });
  }

  private stepProjectiles(dt: number, now: number): void {
    const keep: Projectile[] = [];
    for (const pr of this.projectiles) {
      let travel = Math.min(pr.remaining, pr.spd * dt);
      let ended = false;
      while (travel > 0 && !ended) {
        const step = Math.min(0.3, travel);
        travel -= step;
        pr.remaining -= step;
        pr.x += pr.dx * step;
        pr.y += pr.dy * step;
        if (blocksProjectile(this.def.tileAt(pr.x, pr.y))) {
          ended = true;
          break;
        }
        let hit: Entity | null = null;
        this.grid.forEachNear(pr.x, pr.y, 3, (e) => {
          if (hit) return;
          if (pr.team === "player" && e.kind === "mob" && !e.dead) {
            if (pr.hit?.has(e.id)) return;
            if (dist2(pr.x, pr.y, e.x, e.y) <= (e.radius + 0.2) ** 2) hit = e;
          } else if (pr.team === "mob" && e.kind === "player" && !e.dead) {
            if (dist2(pr.x, pr.y, e.x, e.y) <= 0.45 * 0.45) hit = e;
          }
        });
        if (hit) {
          const h = hit as Entity;
          this.resolveProjectileHit(pr, h, now);
          if (pr.pierce && h.kind === "mob") pr.hit!.add(h.id);
          else ended = true;
        }
      }
      if (!ended && pr.remaining <= 0.001) {
        ended = true;
        if (pr.splash > 0) this.resolveProjectileHit(pr, null, now);
      }
      if (ended) {
        this.fx(pr.x, pr.y, { e: "projEnd", pid: pr.pid, x: round(pr.x), y: round(pr.y), burst: pr.splash });
      } else {
        keep.push(pr);
      }
    }
    this.projectiles = keep;
  }

  private resolveProjectileHit(pr: Projectile, hit: Entity | null, now: number): void {
    if (pr.team === "player") {
      const owner = this.players.get(pr.ownerId) ?? null;
      const affect = (m: Mob) => {
        if (pr.slow) {
          m.slowUntil = now + 3000;
          m.slowMult = 1 - pr.slow;
        }
        if (pr.stunMs) m.stunUntil = Math.max(m.stunUntil, now + pr.stunMs);
        this.damageMob(m, owner, rollDamage(pr.dmg), now);
      };
      if (pr.splash > 0) {
        this.grid.forEachNear(pr.x, pr.y, pr.splash + 2, (e) => {
          if (e.kind !== "mob" || e.dead) return;
          if (dist(pr.x, pr.y, e.x, e.y) <= pr.splash + e.radius) affect(e);
        });
      } else if (hit && hit.kind === "mob") {
        affect(hit);
      }
    } else if (hit && hit.kind === "player") {
      const mob = this.mobs.get(pr.ownerId) ?? null;
      this.damagePlayer(hit, pr.dmg, mob, now);
    }
  }

  private stepZones(now: number): void {
    if (!this.zones.length) return;
    this.zones = this.zones.filter((z) => {
      if (now >= z.until) return false;
      if (now < z.nextTick) return true;
      z.nextTick = now + z.tickMs;
      const owner = this.players.get(z.ownerId) ?? null;
      const allies = owner ? this.hooks.partyOf(owner) : [];
      this.grid.forEachNear(z.x, z.y, z.r + 2, (e) => {
        if (e.kind === "mob" && !e.dead && dist(z.x, z.y, e.x, e.y) <= z.r + e.radius) {
          if (z.slow) {
            e.slowUntil = now + 1200;
            e.slowMult = 1 - z.slow;
          }
          if (z.dmg > 0) this.damageMob(e, owner, rollDamage(z.dmg), now);
        } else if (e.kind === "player" && z.healPct > 0 && !e.dead && dist(z.x, z.y, e.x, e.y) <= z.r && allies.includes(e)) {
          this.heal(e, e.derived.maxHp * z.healPct);
        }
      });
      return true;
    });
  }

  damageMob(mob: Mob, by: Player | null, amount: number, now: number): void {
    if (mob.dead) return;
    const crit = Math.random() < 0.08;
    const dmg = Math.max(1, Math.round(crit ? amount * 1.6 : amount));
    mob.hp -= dmg;
    if (by) {
      mob.damageBy.set(by.id, (mob.damageBy.get(by.id) ?? 0) + dmg);
      if (mob.tpl.passive) {
        mob.state = "flee";
        mob.fleeUntil = now + 3500;
        mob.targetId = by.id;
      } else if (mob.state !== "chase" && now >= mob.blindUntil && !by.buffs.has("camo")) {
        mob.state = "chase";
        mob.targetId = by.id;
      }
    }
    this.fx(mob.x, mob.y, crit ? { e: "hit", id: mob.id, dmg, crit: 1 } : { e: "hit", id: mob.id, dmg });
    if (mob.hp <= 0) {
      mob.hp = 0;
      mob.dead = true;
      mob.diedAt = now;
      mob.moving = false;
      mob.respawnAt = now + mob.respawnMs;
      this.fx(mob.x, mob.y, { e: "die", id: mob.id });
      this.hooks.onMobKilled(this, mob);
      mob.damageBy.clear();
      mob.targetId = null;
    }
  }

  damagePlayer(p: Player, raw: number, by: Mob | null, now: number): void {
    if (p.dead) return;
    p.lastDamagedAt = now;
    p.mounted = false;
    p.emote = "";
    const evasion = p.buffs.get("evasion")?.value ?? 0;
    const dodge = evasion + p.derived.blockChance;
    if (dodge > 0 && Math.random() < Math.min(0.85, dodge)) {
      this.fx(p.x, p.y, { e: "hit", id: p.id, dmg: 0, block: 1 });
      return;
    }
    let dmg = mitigate(raw, p.derived.armor);
    const fort = p.buffs.get("fortify");
    if (fort) dmg = Math.max(1, Math.round(dmg * (1 - fort.value)));
    const shield = p.buffs.get("shield");
    if (shield?.absorb && shield.absorb > 0) {
      const absorbed = Math.min(shield.absorb, dmg);
      shield.absorb -= absorbed;
      dmg -= absorbed;
      if (shield.absorb <= 0) p.buffs.delete("shield");
      if (dmg <= 0) {
        this.fx(p.x, p.y, { e: "hit", id: p.id, dmg: 0, block: 1 });
        return;
      }
    }
    p.hp -= dmg;
    this.fx(p.x, p.y, { e: "hit", id: p.id, dmg });
    if (p.hp <= 0) {
      p.hp = 0;
      p.dead = true;
      p.moving = false;
      p.buffs.clear();
      this.fx(p.x, p.y, { e: "die", id: p.id });
      this.dropAggroOn(p.id);
      this.hooks.onPlayerDied(this, p, by);
    }
  }

  // ── loot ────────────────────────────────────────────────────────────────────

  spawnLoot(x: number, y: number, item: Loot["item"], gold: number, ownerId: string | null, now: number): Loot {
    const id = `l${this.nextLoot++}`;
    const a = Math.random() * TAU;
    const r = 0.3 + Math.random() * 0.7;
    let lx = x + Math.cos(a) * r;
    let ly = y + Math.sin(a) * r;
    if (circleBlocked(this.def, lx, ly, 0.2)) {
      lx = x;
      ly = y;
    }
    const loot = new Loot(id, lx, ly, item, gold, ownerId, now + LOOT_OWNER_MS, now + LOOT_LIFETIME_MS);
    this.loot.set(id, loot);
    this.grid.insert(loot);
    return loot;
  }

  removeLoot(loot: Loot): void {
    this.loot.delete(loot.id);
    this.grid.remove(loot);
  }

  // ── tick ────────────────────────────────────────────────────────────────────

  tick(dt: number, now: number): void {
    if (!this.players.size) return;
    if (now >= this.awakeRefreshAt) {
      this.awakeRefreshAt = now + 500;
      this.awakeCells.clear();
      for (const p of this.players.values()) this.grid.cellKeysNear(p.x, p.y, MOB_WAKE_RADIUS, this.awakeCells);
    }
    this.tickPlayers(dt, now);
    for (const key of this.awakeCells) {
      const set = this.grid.cellSet(key);
      if (!set) continue;
      // Copy: entities may change cell (and set membership) while we iterate.
      for (const e of [...set]) {
        if (e.kind === "mob") this.tickMob(e, dt, now);
      }
    }
    for (const npc of this.npcs.values()) this.tickNpc(npc, dt, now);
    this.stepProjectiles(dt, now);
    this.stepZones(now);
    this.tickLoot(now);
  }

  playerSpeed(p: Player): number {
    let speed = p.derived.speed;
    if (p.mounted) speed *= MOUNT_SPEED_MULT;
    const haste = p.buffs.get("haste");
    if (haste) speed *= 1 + haste.value;
    return speed;
  }

  private tickPlayers(dt: number, now: number): void {
    for (const p of this.players.values()) {
      if (p.dead) continue;
      for (const [id, b] of p.buffs) {
        if (now >= b.until) p.buffs.delete(id);
        else if (id === "regen") this.heal(p, p.derived.maxHp * b.value * dt, true);
      }
      if (p.emote && now >= p.emoteUntil) p.emote = "";
      const { mx, my } = p.input;
      const moving = Math.hypot(mx, my) > 0.05;
      if (moving) {
        p.moving = stepMovement(this.def, p, mx, my, this.playerSpeed(p), dt);
        if (p.moving && p.emote) p.emote = "";
        this.grid.moved(p);
      } else {
        p.moving = false;
      }
      p.swimming = this.def.tileAt(p.x, p.y) === Tile.SHALLOW;
      if (p.swimming) p.mounted = false;
      // Regen: brisk out of combat, slow during.
      const outOfCombat = now - p.lastDamagedAt > 5000;
      if (p.hp < p.derived.maxHp) {
        p.hp = Math.min(p.derived.maxHp, p.hp + p.derived.maxHp * (outOfCombat ? 0.02 : 0.002) * dt);
      }
    }
  }

  private tickMob(mob: Mob, dt: number, now: number): void {
    if (mob.dead) {
      if (now >= mob.respawnAt) this.respawnMob(mob);
      return;
    }
    const tpl = mob.tpl;
    if (now < mob.stunUntil) {
      mob.moving = false;
      return;
    }
    const blind = now < mob.blindUntil;
    let target: Player | null = mob.targetId ? this.players.get(mob.targetId) ?? null : null;
    if (target && (target.dead || target.mapId !== this.def.id || target.buffs.has("camo"))) {
      target = null;
      mob.targetId = null;
      if (mob.state === "chase") mob.state = "return";
    }

    // Aggro: look for the nearest visible player in range when idle.
    if (!tpl.passive && !blind && !target && (mob.state === "idle" || mob.state === "wander")) {
      let best: Player | null = null;
      let bestD = tpl.aggro + mob.level * 0.15;
      this.grid.forEachNear(mob.x, mob.y, bestD, (e) => {
        if (e.kind !== "player" || e.dead || e.buffs.has("camo")) return;
        const d = dist(mob.x, mob.y, e.x, e.y);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      });
      if (best) {
        target = best;
        mob.targetId = (best as Player).id;
        mob.state = "chase";
      }
    }

    let gx = mob.goalX;
    let gy = mob.goalY;
    let speed = tpl.speed * 0.45;
    mob.moving = false;

    switch (mob.state) {
      case "chase": {
        if (!target) {
          mob.state = "return";
          break;
        }
        const homeD = dist(mob.x, mob.y, mob.homeX, mob.homeY);
        if (homeD > MOB_LEASH + (tpl.boss ? 8 : 0)) {
          mob.state = "return";
          mob.targetId = null;
          break;
        }
        const d = dist(mob.x, mob.y, target.x, target.y);
        mob.f = Math.atan2(target.y - mob.y, target.x - mob.x);
        if (tpl.ranged && d <= tpl.ranged.range && d > 2.2) {
          if (!blind && now - mob.lastAttackAt >= tpl.cooldownMs) {
            mob.lastAttackAt = now;
            const kind: ProjectileKind = tpl.model === "wisp" ? "frostbolt" : "emberball";
            this.fx(mob.x, mob.y, { e: "cast", id: mob.id, a: round(mob.f) });
            this.spawnProjectile(mob.id, "mob", kind, mob.x, mob.y, mob.f, tpl.ranged.speed, tpl.ranged.range + 1, mob.dmg);
          }
          gx = mob.x;
          gy = mob.y;
          speed = 0;
        } else if (d <= tpl.reach + 0.3) {
          if (!blind && now - mob.lastAttackAt >= tpl.cooldownMs) {
            mob.lastAttackAt = now;
            this.fx(mob.x, mob.y, { e: "swing", id: mob.id, a: round(mob.f) });
            this.damagePlayer(target, mob.dmg, mob, now);
          }
          gx = mob.x;
          gy = mob.y;
          speed = 0;
        } else {
          gx = target.x;
          gy = target.y;
          speed = tpl.speed;
        }
        break;
      }
      case "return": {
        gx = mob.homeX;
        gy = mob.homeY;
        speed = tpl.speed * 1.1;
        if (dist(mob.x, mob.y, mob.homeX, mob.homeY) < 1) {
          mob.state = "idle";
          mob.hp = mob.maxHp;
          mob.damageBy.clear();
          mob.nextThinkAt = now + 1500;
        }
        break;
      }
      case "flee": {
        if (now > mob.fleeUntil || !target) {
          mob.state = "return";
          break;
        }
        const away = Math.atan2(mob.y - target.y, mob.x - target.x);
        gx = mob.x + Math.cos(away) * 3;
        gy = mob.y + Math.sin(away) * 3;
        speed = tpl.speed * 1.2;
        break;
      }
      default: {
        if (now >= mob.nextThinkAt) {
          mob.nextThinkAt = now + 2500 + Math.random() * 5000;
          if (Math.random() < 0.6) {
            const a = Math.random() * TAU;
            const r = Math.random() * 4.5;
            mob.goalX = mob.homeX + Math.cos(a) * r;
            mob.goalY = mob.homeY + Math.sin(a) * r;
            mob.state = "wander";
          } else {
            mob.state = "idle";
          }
        }
        if (mob.state === "wander") {
          gx = mob.goalX;
          gy = mob.goalY;
          if (dist(mob.x, mob.y, gx, gy) < 0.3) mob.state = "idle";
        } else {
          gx = mob.x;
          gy = mob.y;
        }
      }
    }

    if (now < mob.slowUntil) speed *= mob.slowMult;
    const dx = gx - mob.x;
    const dy = gy - mob.y;
    const d = Math.hypot(dx, dy);
    if (speed > 0 && d > 0.15) {
      const before = mob.x + mob.y;
      stepMovement(this.def, mob, dx / d, dy / d, speed, dt);
      mob.moving = Math.abs(mob.x + mob.y - before) > 1e-4;
      if (mob.state !== "chase") mob.f = Math.atan2(dy, dx);
      if (!mob.moving && mob.state === "wander") mob.state = "idle";
      this.grid.moved(mob);
    }
  }

  private respawnMob(mob: Mob): void {
    mob.dead = false;
    mob.hp = mob.maxHp;
    mob.x = mob.homeX;
    mob.y = mob.homeY;
    mob.state = "idle";
    mob.targetId = null;
    mob.damageBy.clear();
    mob.slowUntil = mob.stunUntil = mob.blindUntil = 0;
    this.grid.moved(mob);
  }

  /** Villagers follow their daily routine: pathfind to the scheduled spot, then idle there. */
  private tickNpc(npc: Npc, dt: number, now: number): void {
    const def = npc.def;
    npc.moving = false;
    const entry = scheduleAt(def, this.hooks.hour());
    const key = entry ? `${entry.from}-${entry.to}` : "home";
    if (key !== npc.scheduleKey) {
      npc.scheduleKey = key;
      const tx = entry?.x ?? def.x;
      const ty = entry?.y ?? def.y;
      npc.homeX = tx;
      npc.homeY = ty;
      npc.wander = entry ? entry.wander : def.wander;
      let watched = false;
      this.grid.forEachNear(npc.x, npc.y, 60, (e) => {
        if (e.kind === "player") watched = true;
      });
      if (npc.indoors || !watched) {
        // Nobody to see the walk (or they're stepping out of a building): just be there.
        npc.indoors = Boolean(entry?.indoors);
        npc.x = tx;
        npc.y = ty;
        npc.path = [];
        this.grid.moved(npc);
      } else {
        npc.path = findPath(this.def, npc.x, npc.y, tx, ty) ?? [{ x: tx, y: ty }];
      }
      npc.goalX = tx;
      npc.goalY = ty;
    }
    if (npc.indoors || now < npc.talkUntil) return;

    let goal = npc.path[0];
    if (!goal) {
      if (entry?.indoors && dist(npc.x, npc.y, npc.homeX, npc.homeY) < 0.6) {
        npc.indoors = true;
        return;
      }
      if (npc.wander > 0 && now >= npc.nextThinkAt) {
        npc.nextThinkAt = now + 3000 + Math.random() * 6000;
        const a = Math.random() * TAU;
        const r = Math.random() * npc.wander;
        npc.goalX = npc.homeX + Math.cos(a) * r;
        npc.goalY = npc.homeY + Math.sin(a) * r;
      }
      goal = { x: npc.goalX, y: npc.goalY };
    }
    const dx = goal.x - npc.x;
    const dy = goal.y - npc.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.2) {
      if (npc.path.length) npc.path.shift();
      return;
    }
    const before = { x: npc.x, y: npc.y };
    stepMovement(this.def, npc, dx / d, dy / d, npc.path.length ? NPC_SPEED * 1.15 : NPC_SPEED * 0.8, dt);
    npc.moving = Math.hypot(npc.x - before.x, npc.y - before.y) > 1e-4;
    npc.f = Math.atan2(dy, dx);
    if (!npc.moving) {
      if (!npc.stuckSince) npc.stuckSince = now;
      if (now - npc.stuckSince > 2500) {
        // Hopelessly stuck: hop to the next waypoint.
        npc.stuckSince = 0;
        const next = npc.path.shift() ?? { x: npc.goalX, y: npc.goalY };
        npc.x = next.x;
        npc.y = next.y;
        npc.goalX = npc.x;
        npc.goalY = npc.y;
      }
    } else {
      npc.stuckSince = 0;
    }
    this.grid.moved(npc);
  }

  private tickLoot(now: number): void {
    if (Math.random() > 0.1) return; // expiry is not time-critical; check ~2x/s
    for (const loot of this.loot.values()) {
      if (now >= loot.expiresAt) this.removeLoot(loot);
    }
  }

  /** Long-dead mobs and villagers who are indoors are hidden from replication. */
  isReplicated(e: Entity, now: number): boolean {
    if (e.kind === "mob") return !(e.dead && now - e.diedAt > DEATH_VISIBLE_MS);
    if (e.kind === "npc") return !e.indoors;
    return true;
  }
}

function pickWeighted(table: Record<string, number>, roll: number): string {
  let total = 0;
  for (const w of Object.values(table)) total += w;
  let r = roll * total;
  for (const [k, w] of Object.entries(table)) {
    r -= w;
    if (r <= 0) return k;
  }
  return Object.keys(table)[0];
}

function rollDamage(base: number): number {
  return base * (0.85 + Math.random() * 0.3);
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
