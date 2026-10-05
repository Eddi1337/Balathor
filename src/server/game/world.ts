// A running map instance: its entities, spatial index and simulation systems (mob/NPC AI,
// projectiles, loot, regen). Player-facing rules that touch saves/XP live in Game via hooks.

import type { MapDef } from "../../shared/world/maps";
import { BIOME_BOSSES, BIOME_SPAWNS, MOB_TEMPLATES, mobStats, type MobTemplate } from "../../shared/game/mobs";
import { NPCS } from "../../shared/game/npcs";
import { CLASSES } from "../../shared/game/classes";
import { mitigate } from "../../shared/game/stats";
import { circleBlocked, stepMovement } from "../../shared/game/movement";
import { blocksProjectile, Tile } from "../../shared/world/tiles";
import { coastRadiusAt, MEADOW_RADIUS } from "../../shared/world/overworld";
import { TOWN_WALL_OUTER } from "../../shared/world/town";
import { angleDelta, dist, dist2, hash2, rng, TAU } from "../../shared/math";
import type { FxEvent, ProjectileKind } from "../../shared/protocol";
import { Loot, Mob, Npc, Player, type Entity } from "./entities";
import { SpatialGrid } from "./spatial";

export interface WorldHooks {
  onMobKilled(world: World, mob: Mob): void;
  onPlayerDied(world: World, player: Player, by: Mob | null): void;
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
}

const MOB_WAKE_RADIUS = 52;
const MOB_LEASH = 18;
const LOOT_LIFETIME_MS = 120_000;
const LOOT_OWNER_MS = 25_000;
const FX_RADIUS = 44;
const MOB_RESPAWN_MS = 45_000;
const BOSS_RESPAWN_MS = 5 * 60_000;
const DEATH_VISIBLE_MS = 2200;

export class World {
  readonly players = new Map<string, Player>();
  readonly mobs = new Map<string, Mob>();
  readonly npcs = new Map<string, Npc>();
  readonly loot = new Map<string, Loot>();
  readonly grid = new SpatialGrid<Entity>();
  private projectiles: Projectile[] = [];
  private nextPid = 1;
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
    const sectors: Record<string, number> = {
      frost: -Math.PI / 2,
      ember: -Math.PI / 6,
      desert: Math.PI / 6,
      swamp: Math.PI / 2,
      forest: (5 * Math.PI) / 6,
      highlands: (-5 * Math.PI) / 6
    };
    for (const [biome, tplId] of Object.entries(BIOME_BOSSES)) {
      const tpl = MOB_TEMPLATES[tplId as string];
      if (!tpl) continue;
      let x: number;
      let y: number;
      if (biome === "meadow") {
        // King Wobble lounges in the meadow just north-east of town.
        x = 26;
        y = -42;
      } else {
        const a = sectors[biome] ?? 0;
        const r = coastRadiusAt(a) * 0.62;
        x = Math.cos(a) * r;
        y = Math.sin(a) * r;
      }
      const spot = findOpen(this.def, x, y);
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
    for (const mob of this.mobs.values()) {
      if (mob.targetId === p.id) {
        mob.targetId = null;
        mob.state = "return";
      }
    }
  }

  // ── effects ─────────────────────────────────────────────────────────────────

  /** Queue an effect for every player near (x, y). */
  fx(x: number, y: number, ev: FxEvent, radius = FX_RADIUS): void {
    this.grid.forEachNear(x, y, radius, (e) => {
      if (e.kind === "player") e.session.fx.push(ev);
    });
  }

  // ── combat ──────────────────────────────────────────────────────────────────

  playerAttack(p: Player, angle: number, now: number): boolean {
    const cls = CLASSES[p.save.cls];
    if (p.dead || now - p.lastAttackAt < cls.cooldownMs * 0.9) return false;
    p.lastAttackAt = now;
    p.f = angle;
    if (cls.attack === "melee") {
      this.fx(p.x, p.y, { e: "swing", id: p.id, a: angle });
      this.grid.forEachNear(p.x, p.y, cls.range + 2, (e) => {
        if (e.kind !== "mob" || e.dead) return;
        const d = dist(p.x, p.y, e.x, e.y);
        if (d > cls.range + e.radius) return;
        const toward = Math.atan2(e.y - p.y, e.x - p.x);
        if (d > 0.6 && Math.abs(angleDelta(angle, toward)) > cls.arc / 2) return;
        this.damageMob(e, p, rollDamage(p.derived.damage), now);
      });
    } else {
      this.fx(p.x, p.y, { e: "cast", id: p.id, a: angle });
      const kind: ProjectileKind = cls.id === "mage" ? "fireball" : "arrow";
      this.spawnProjectile(p.id, "player", kind, p.x, p.y, angle, cls.speed, cls.range, p.derived.damage, cls.splash);
    }
    return true;
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
    splash: number
  ): void {
    const pid = this.nextPid++;
    const sx = x + Math.cos(angle) * 0.4;
    const sy = y + Math.sin(angle) * 0.4;
    this.projectiles.push({ pid, kind, ownerId, team, x: sx, y: sy, dx: Math.cos(angle), dy: Math.sin(angle), spd, remaining: range, dmg, splash });
    this.fx(sx, sy, { e: "proj", pid, by: ownerId, kind, x: sx, y: sy, a: angle, spd, rng: range });
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
            if (dist2(pr.x, pr.y, e.x, e.y) <= (e.radius + 0.2) ** 2) hit = e;
          } else if (pr.team === "mob" && e.kind === "player" && !e.dead) {
            if (dist2(pr.x, pr.y, e.x, e.y) <= 0.45 * 0.45) hit = e;
          }
        });
        if (hit) {
          ended = true;
          this.resolveProjectileHit(pr, hit, now);
        }
      }
      if (!ended && pr.remaining <= 0.001) {
        ended = true;
        if (pr.splash > 0) this.resolveProjectileHit(pr, null, now);
      }
      if (ended) {
        this.fx(pr.x, pr.y, { e: "projEnd", pid: pr.pid, x: Math.round(pr.x * 100) / 100, y: Math.round(pr.y * 100) / 100, burst: pr.splash });
      } else {
        keep.push(pr);
      }
    }
    this.projectiles = keep;
  }

  private resolveProjectileHit(pr: Projectile, hit: Entity | null, now: number): void {
    if (pr.team === "player") {
      const owner = this.players.get(pr.ownerId) ?? null;
      if (pr.splash > 0) {
        this.grid.forEachNear(pr.x, pr.y, pr.splash + 2, (e) => {
          if (e.kind !== "mob" || e.dead) return;
          if (dist(pr.x, pr.y, e.x, e.y) <= pr.splash + e.radius) this.damageMob(e, owner, rollDamage(pr.dmg), now);
        });
      } else if (hit && hit.kind === "mob") {
        this.damageMob(hit, owner, rollDamage(pr.dmg), now);
      }
    } else if (hit && hit.kind === "player") {
      const mob = this.mobs.get(pr.ownerId) ?? null;
      this.damagePlayer(hit, pr.dmg, mob, now);
    }
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
      } else if (mob.state !== "chase") {
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
    if (p.derived.blockChance > 0 && Math.random() < p.derived.blockChance) {
      this.fx(p.x, p.y, { e: "hit", id: p.id, dmg: 0, block: 1 });
      return;
    }
    const dmg = mitigate(raw, p.derived.armor);
    p.hp -= dmg;
    this.fx(p.x, p.y, { e: "hit", id: p.id, dmg });
    if (p.hp <= 0) {
      p.hp = 0;
      p.dead = true;
      p.moving = false;
      this.fx(p.x, p.y, { e: "die", id: p.id });
      for (const mob of this.mobs.values()) {
        if (mob.targetId === p.id) {
          mob.targetId = null;
          mob.state = "return";
        }
      }
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
        else if (e.kind === "npc") this.tickNpc(e, dt, now);
      }
    }
    this.stepProjectiles(dt, now);
    this.tickLoot(now);
  }

  private tickPlayers(dt: number, now: number): void {
    for (const p of this.players.values()) {
      if (p.dead) continue;
      const { mx, my } = p.input;
      const moving = Math.hypot(mx, my) > 0.05;
      if (moving) {
        p.moving = stepMovement(this.def, p, mx, my, p.derived.speed, dt);
        this.grid.moved(p);
      } else {
        p.moving = false;
      }
      p.swimming = this.def.tileAt(p.x, p.y) === Tile.SHALLOW;
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
    let target: Player | null = mob.targetId ? this.players.get(mob.targetId) ?? null : null;
    if (target && (target.dead || target.mapId !== this.def.id)) {
      target = null;
      mob.targetId = null;
      if (mob.state === "chase") mob.state = "return";
    }

    // Aggro: look for the nearest player in range when idle.
    if (!tpl.passive && !target && (mob.state === "idle" || mob.state === "wander")) {
      let best: Player | null = null;
      let bestD = tpl.aggro + mob.level * 0.15;
      this.grid.forEachNear(mob.x, mob.y, bestD, (e) => {
        if (e.kind !== "player" || e.dead) return;
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
          if (now - mob.lastAttackAt >= tpl.cooldownMs) {
            mob.lastAttackAt = now;
            const kind: ProjectileKind = tpl.model === "wisp" ? "frostbolt" : "emberball";
            this.fx(mob.x, mob.y, { e: "cast", id: mob.id, a: mob.f });
            this.spawnProjectile(mob.id, "mob", kind, mob.x, mob.y, mob.f, tpl.ranged.speed, tpl.ranged.range + 1, mob.dmg, 0);
          }
          // Hold position-ish: drift slightly to keep range.
          gx = mob.x;
          gy = mob.y;
          speed = 0;
        } else if (d <= tpl.reach + 0.3) {
          if (now - mob.lastAttackAt >= tpl.cooldownMs) {
            mob.lastAttackAt = now;
            this.fx(mob.x, mob.y, { e: "swing", id: mob.id, a: mob.f });
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
    this.grid.moved(mob);
  }

  private tickNpc(npc: Npc, dt: number, now: number): void {
    const def = npc.def;
    npc.moving = false;
    if (def.wander <= 0 || now < npc.talkUntil) return;
    if (now >= npc.nextThinkAt) {
      npc.nextThinkAt = now + 3000 + Math.random() * 6000;
      const a = Math.random() * TAU;
      const r = Math.random() * def.wander;
      npc.goalX = def.x + Math.cos(a) * r;
      npc.goalY = def.y + Math.sin(a) * r;
    }
    const dx = npc.goalX - npc.x;
    const dy = npc.goalY - npc.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.2) {
      const before = npc.x + npc.y;
      stepMovement(this.def, npc, dx / d, dy / d, 1.6, dt);
      npc.moving = Math.abs(npc.x + npc.y - before) > 1e-4;
      if (!npc.moving) npc.goalX = npc.x, npc.goalY = npc.y;
      npc.f = Math.atan2(dy, dx);
      this.grid.moved(npc);
    }
  }

  private tickLoot(now: number): void {
    if (Math.random() > 0.1) return; // expiry is not time-critical; check ~2x/s
    for (const loot of this.loot.values()) {
      if (now >= loot.expiresAt) this.removeLoot(loot);
    }
  }

  /** Mobs that died a while ago are hidden from replication until they respawn. */
  isReplicated(e: Entity, now: number): boolean {
    return !(e.kind === "mob" && e.dead && now - e.diedAt > DEATH_VISIBLE_MS);
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

function findOpen(def: MapDef, x: number, y: number): { x: number; y: number } {
  for (let r = 0; r < 20; r += 1) {
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * TAU + hash2(r, i, 9) * 0.3;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (!circleBlocked(def, px, py, 1.2) && def.tileAt(px, py) !== Tile.SHALLOW) return { x: px, y: py };
    }
  }
  return { x, y };
}
