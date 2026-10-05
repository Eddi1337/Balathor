// Balathor v2 client entry: wires networking, prediction, rendering and UI together.

import * as THREE from "three";
import type { Appearance, C2S, FxEvent, NetEntity, NetPlayer, S2C } from "../shared/protocol";
import { CLASSES, type ClassId } from "../shared/game/classes";
import { MOB_TEMPLATES } from "../shared/game/mobs";
import { npcDef } from "../shared/game/npcs";
import { OVERWORLD } from "../shared/world/maps";
import { stepMovement } from "../shared/game/movement";
import { Tile } from "../shared/world/tiles";
import { Net } from "./net";
import { Input } from "./input";
import { ClientState, type ClientEntity } from "./state";
import { Renderer, detectQuality } from "./render/renderer";
import { TerrainStreamer } from "./render/terrain";
import { buildTown } from "./render/town";
import { Effects } from "./render/effects";
import { worldUniforms } from "./render/builder";
import { animate, attachPony, buildHumanoid, buildLoot, buildMob, detachPony, disposeModel, setStunStars, type Model } from "./render/models";
import { Landmarks } from "./render/landmarks";
import { Labels } from "./ui/labels";
import { Hud, type MinimapDot } from "./ui/hud";
import { Screens } from "./ui/screens";
import { Panels } from "./ui/panels";
import { TALENTS_BY_ID, type BuffId } from "../shared/game/talents";
import { WAYPOINTS, WAYPOINT_USE_RADIUS, type Waypoint } from "../shared/game/waypoints";
import { EMOTES } from "../shared/game/emotes";
import { MOUNT_SPEED_MULT } from "../shared/game/stats";

type Phase = "connecting" | "auth" | "create" | "play";

const map = OVERWORLD;
const quality = detectQuality();
const canvas = document.getElementById("scene") as HTMLCanvasElement;
const renderer = new Renderer(canvas, quality);
const terrain = new TerrainStreamer(quality.msaa ? 4 : 3);
const town = buildTown();
const effects = new Effects();
effects.setHeightFn((x, y) => map.heightAt(x, y));
const landmarks = new Landmarks();
renderer.scene.add(terrain.group, terrain.water, town.mesh, effects.group, landmarks.group, ...town.lights);

const net = new Net(Net.defaultUrl());
const state = new ClientState();
const input = new Input(canvas);
const labels = new Labels(renderer.camera);
const send = (msg: C2S) => net.send(msg);
const hud = new Hud(send);
const screens = new Screens(send);
const panels = new Panels(send, (t, k) => hud.toast(t, k));
panels.onCast = (id) => castAbility(id, performance.now());

let phase: Phase = "connecting";
let loadingHidden = false;

// ── entity views ────────────────────────────────────────────────────────────

interface View {
  model: Model;
  sig: string;
  auras: Map<string, THREE.Object3D>;
  auraT: number;
}
const views = new Map<string, View>();

function viewSignature(d: NetEntity): string {
  if (d.k === "p") return `p|${d.cls}|${d.look.body}|${d.look.accent}|${d.look.skin}|${d.look.hair}|${d.look.hairStyle}|${d.wr}|${d.ar}`;
  if (d.k === "m") return `m|${d.tpl}`;
  if (d.k === "n") return `n|${d.npc}`;
  return `l|${d.tpl}|${d.rarity}|${d.gold}`;
}

function buildView(d: NetEntity): Model {
  if (d.k === "p") return buildHumanoid({ look: d.look, cls: d.cls, weaponRarity: d.wr, armorRarity: d.ar });
  if (d.k === "m") {
    const tpl = MOB_TEMPLATES[d.tpl];
    return buildMob(tpl?.model ?? "slime", tpl?.color ?? "#7fd66b", tpl?.accent ?? "#ffffff", tpl?.scale ?? 1, Boolean(tpl?.boss));
  }
  if (d.k === "n") {
    const def = npcDef(d.npc);
    return buildHumanoid({ look: { body: def?.body ?? "#8fc97a", accent: def?.accent ?? "#fff", skin: "#ffd9b8", hair: "#7a5234", hairStyle: (d.npc.length % 5) }, hat: def?.hat ?? "none", cls: def?.role === "guard" ? "knight" : undefined });
  }
  return buildLoot(d.gold, d.rarity);
}

function ensureView(e: ClientEntity): View {
  let v = views.get(e.id);
  const sig = viewSignature(e.data);
  if (v && v.sig === sig) return v;
  if (v) {
    renderer.scene.remove(v.model.root);
    disposeModel(v.model);
  }
  v = { model: buildView(e.data), sig, auras: new Map(), auraT: 0 };
  renderer.scene.add(v.model.root);
  views.set(e.id, v);
  return v;
}

function dropView(id: string): void {
  const v = views.get(id);
  if (!v) return;
  renderer.scene.remove(v.model.root);
  disposeModel(v.model);
  views.delete(id);
  labels.removePlate(id);
}

state.onAdd = (e) => {
  ensureView(e);
  if (e.data.k === "m" && phase === "play") {
    const h = map.heightAt(e.data.x, e.data.y);
    effects.particles.emit(e.data.x, h + 0.3, e.data.y, { n: 6, color: "#ffffff", speed: 1, up: 1.5, size: 0.08, life: 0.5 });
  }
};

// ── local player prediction ─────────────────────────────────────────────────

const me = { x: 0, y: 0, f: Math.PI / 2, moving: false };
let lastSent = { mx: 0, my: 0, at: 0 };
let inputSeq = 0;
let lastAttackAt = 0;
let menuPreview: Model | null = null;
let menuAngle = 0;

function selfEntity(): ClientEntity | undefined {
  return state.selfId ? state.entities.get(state.selfId) : undefined;
}

function selfData(): NetPlayer | null {
  const e = selfEntity();
  return e && e.data.k === "p" ? e.data : null;
}

function predict(dt: number, now: number): void {
  const s = state.self;
  const d = selfData();
  const { ix, iy } = hud.chatFocused ? { ix: 0, iy: 0 } : input.sample();
  let { mx, my } = renderer.toWorld(ix, iy);
  if (!s || !d || d.dead) {
    mx = 0;
    my = 0;
  }
  me.moving = Math.hypot(mx, my) > 0.05;
  if (me.moving && s && d) {
    const haste = d.bf.includes("haste") ? 1.4 : 1;
    stepMovement(map, me, mx, my, s.derived.speed * (d.mt ? MOUNT_SPEED_MULT : 1) * haste, dt);
    if (now - lastAttackAt > 350) me.f = Math.atan2(my, mx);
  }
  // Reconcile with the authoritative position.
  const ex = state.serverX - me.x;
  const ey = state.serverY - me.y;
  const err = Math.hypot(ex, ey);
  if (err > 3) {
    me.x = state.serverX;
    me.y = state.serverY;
  } else if (!me.moving) {
    const k = Math.min(1, dt * 6);
    me.x += ex * k;
    me.y += ey * k;
  } else if (err > 1) {
    const k = Math.min(1, dt * 2);
    me.x += ex * k;
    me.y += ey * k;
  }
  // Send input when it changes, and as a keep-alive while moving.
  const changed = Math.abs(mx - lastSent.mx) > 0.04 || Math.abs(my - lastSent.my) > 0.04;
  if (changed || (me.moving && now - lastSent.at > 200)) {
    inputSeq += 1;
    send({ t: "in", seq: inputSeq, mx: round(mx), my: round(my), f: round(me.f) });
    lastSent = { mx, my, at: now };
  }
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function aimAngle(): number {
  if (!input.touchMode) {
    const g = renderer.screenToGround(input.mouseX, input.mouseY, map.heightAt(me.x, me.y) + 0.9);
    if (g) return Math.atan2(g.y - me.y, g.x - me.x);
  }
  // Touch / no mouse: auto-target the nearest hostile in front-ish, else facing.
  let best: ClientEntity | null = null;
  let bestD = 14;
  for (const e of state.entities.values()) {
    if (e.data.k !== "m" || e.data.dead || e.removedAt) continue;
    const d = Math.hypot(e.rx - me.x, e.ry - me.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best ? Math.atan2(best.ry - me.y, best.rx - me.x) : me.f;
}

function tryAttack(now: number, angle?: number): void {
  const s = state.self;
  const d = selfData();
  if (!s || !d || d.dead) return;
  const cd = CLASSES[s.cls].cooldownMs * (d.bf.includes("haste") ? 0.6 : 1);
  if (now - lastAttackAt < cd) return;
  lastAttackAt = now;
  const a = angle ?? aimAngle();
  me.f = a;
  const v = state.selfId ? views.get(state.selfId) : undefined;
  if (v) v.model.attackT = 0.3;
  send({ t: "attack", a: round(a) });
}

/** Ground point under the cursor (desktop) or a sensible point ahead (touch). */
function aimPoint(angle: number): { x: number; y: number } {
  if (!input.touchMode) {
    const g = renderer.screenToGround(input.mouseX, input.mouseY, map.heightAt(me.x, me.y) + 0.2);
    if (g) return g;
  }
  let best: ClientEntity | null = null;
  let bestD = 15;
  for (const e of state.entities.values()) {
    if (e.data.k !== "m" || e.data.dead || e.removedAt) continue;
    const dd = Math.hypot(e.rx - me.x, e.ry - me.y);
    if (dd < bestD) {
      bestD = dd;
      best = e;
    }
  }
  return best ? { x: best.rx, y: best.ry } : { x: me.x + Math.cos(angle) * 6, y: me.y + Math.sin(angle) * 6 };
}

function castAbility(id: string, now: number): void {
  const d = selfData();
  if (!d || d.dead || !TALENTS_BY_ID[id]) return;
  if (!panels.isReady(id)) return;
  const a = aimAngle();
  const p = aimPoint(a);
  me.f = a;
  panels.startCooldown(id, 350); // brief lockout until the server confirms the real cooldown
  const v = state.selfId ? views.get(state.selfId) : undefined;
  if (v) v.model.attackT = 0.3;
  send({ t: "cast", id, a: round(a), x: round(p.x), y: round(p.y) });
}

function nearestObelisk(): Waypoint | null {
  for (const w of WAYPOINTS) if (Math.hypot(w.x - me.x, w.y - me.y) <= WAYPOINT_USE_RADIUS) return w;
  return null;
}

function nearestInteractable(): { id: string; kind: "npc" | "loot" | "waypoint"; label: string } | null {
  let best: { id: string; kind: "npc" | "loot" | "waypoint"; label: string } | null = null;
  let bestD = Infinity;
  const ob = nearestObelisk();
  if (ob) {
    best = { id: ob.id, kind: "waypoint", label: state.self?.waypoints.includes(ob.id) ? `E · Travel from ${ob.name}` : `E · Attune to ${ob.name}` };
    bestD = Math.hypot(ob.x - me.x, ob.y - me.y);
  }
  for (const e of state.entities.values()) {
    if (e.removedAt) continue;
    const d = Math.hypot(e.rx - me.x, e.ry - me.y);
    if (e.data.k === "n" && d < 3.4 && d < bestD) {
      bestD = d;
      const def = npcDef(e.data.npc);
      best = { id: e.id, kind: "npc", label: `E · Talk to ${def?.name ?? "villager"}${def?.shopId ? " (shop)" : ""}` };
    } else if (e.data.k === "l" && d < 2.4 && d < bestD) {
      bestD = d;
      best = { id: e.id, kind: "loot", label: e.data.gold && !e.data.tpl ? `E · Pick up ${e.data.gold} gold` : "E · Pick up loot" };
    }
  }
  return best;
}

function interact(): void {
  const target = nearestInteractable();
  if (!target) return;
  if (target.kind === "waypoint") {
    const w = WAYPOINTS.find((o) => o.id === target.id);
    if (w) panels.openWaypoints(w);
    return;
  }
  send(target.kind === "npc" ? { t: "talk", id: target.id } : { t: "pickup", id: target.id });
}

// ── input bindings ──────────────────────────────────────────────────────────

input.onKey = (code, e) => {
  if (phase !== "play") return;
  switch (code) {
    case "Enter":
      // Consume the key so it doesn't also submit the (now focused) empty chat box.
      e.preventDefault();
      hud.focusChat();
      break;
    case "Slash":
      e.preventDefault();
      hud.focusChat("/");
      break;
    case "KeyI":
    case "KeyB":
      hud.toggle("win-bag");
      break;
    case "KeyC":
      hud.toggle("win-char");
      break;
    case "KeyE":
    case "KeyF":
      interact();
      break;
    case "KeyQ":
      hud.drinkPotion();
      break;
    case "KeyT":
      panels.toggle("win-talents");
      break;
    case "KeyL":
      panels.toggle("win-quests");
      break;
    case "KeyM":
      send({ t: "mount" });
      break;
    case "Digit1":
    case "Digit2":
    case "Digit3":
    case "Digit4":
    case "Digit5": {
      const id = state.self?.bar[Number(code.slice(5)) - 1];
      if (id) castAbility(id, performance.now());
      break;
    }
    case "Escape":
      if (!panels.closeAll()) hud.closeAll();
      break;
  }
};

input.onClickWorld = (sx, sy) => {
  if (phase !== "play") return;
  // Clicking a villager or loot interacts; anything else attacks toward the cursor.
  const ndc = new THREE.Vector2((sx / innerWidth) * 2 - 1, -(sy / innerHeight) * 2 + 1);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, renderer.camera);
  const candidates: { id: string; obj: THREE.Object3D }[] = [];
  for (const [id, v] of views) {
    const e = state.entities.get(id);
    if (!e || (e.data.k !== "n" && e.data.k !== "l" && e.data.k !== "p") || id === state.selfId) continue;
    if (Math.hypot(e.rx - me.x, e.ry - me.y) > (e.data.k === "p" ? 20 : 8)) continue;
    candidates.push({ id, obj: v.model.root });
  }
  const hits = ray.intersectObjects(candidates.map((c) => c.obj), true);
  if (hits.length) {
    let o: THREE.Object3D | null = hits[0].object;
    while (o && !candidates.some((c) => c.obj === o)) o = o.parent;
    const hit = candidates.find((c) => c.obj === o);
    const e = hit ? state.entities.get(hit.id) : undefined;
    if (e) {
      const d = Math.hypot(e.rx - me.x, e.ry - me.y);
      if (e.data.k === "p") {
        panels.openPlayerMenu(e.id, e.data.name, sx + 8, sy + 8);
      } else if (e.data.k === "n") {
        if (d < 3.4) send({ t: "talk", id: e.id });
        else hud.toast("Walk a little closer to talk");
      } else if (e.data.k === "l") {
        if (d < 2.4) send({ t: "pickup", id: e.id });
        else hud.toast("Walk over to pick that up");
      }
      return;
    }
  }
  tryAttack(performance.now());
};

document.getElementById("hot-attack")!.addEventListener("click", () => tryAttack(performance.now(), me.f));
document.getElementById("hot-interact")!.addEventListener("click", () => interact());
document.getElementById("touch-interact")!.addEventListener("touchstart", (e) => {
  e.preventDefault();
  interact();
}, { passive: false });

// ── network ─────────────────────────────────────────────────────────────────

net.onOpen = () => {
  document.getElementById("conn-banner")!.classList.add("hidden");
  // After a reconnect we must log in again; the title screen handles it.
  if (phase !== "connecting") {
    leaveWorld();
    hud.toast("Reconnected! Please log in again.");
  }
  phase = "auth";
  screens.showAuth();
  screens.setAuthBusy(false);
};

net.onClose = () => {
  if (phase === "play" || phase === "create" || phase === "auth") document.getElementById("conn-banner")!.classList.remove("hidden");
};

function leaveWorld(): void {
  state.clear((e) => dropView(e.id));
  state.selfId = null;
  state.self = null;
  hud.hide();
  hud.setDead(false);
}

net.on((msg: S2C) => {
  switch (msg.t) {
    case "hello":
      return;
    case "auth":
      screens.setAuthBusy(false);
      if (!msg.ok) return screens.setAuthStatus(msg.err ?? "Something went wrong");
      screens.setAuthStatus("", false);
      if (msg.hasCharacter) {
        send({ t: "play" });
      } else {
        phase = "create";
        screens.showCreate();
      }
      return;
    case "welcome": {
      const first = phase !== "play";
      phase = "play";
      screens.hideAll();
      hud.show();
      state.selfId = msg.id;
      state.serverX = msg.x;
      state.serverY = msg.y;
      state.worldTime = msg.time;
      state.worldTimeAt = performance.now();
      state.dayLengthMs = msg.dayLength;
      me.x = msg.x;
      me.y = msg.y;
      hud.setDead(false);
      if (first && menuPreview) {
        renderer.scene.remove(menuPreview.root);
        disposeModel(menuPreview);
        menuPreview = null;
        renderer.distance = 14;
        renderer.pitch = 0.5;
        renderer.lookAbove = 2.2;
        renderer.yaw = 0;
      }
      return;
    }
    case "s":
      state.applySnapshot(msg);
      return;
    case "self":
      state.self = msg.self;
      hud.setSelf(msg.self);
      panels.setSelf(msg.self);
      landmarks.setAttuned(msg.self.waypoints);
      return;
    case "cd":
      panels.startCooldown(msg.id, msg.ms);
      return;
    case "questOffer":
      panels.offerQuest(msg.npc, msg.id);
      return;
    case "questDone": {
      const pos = state.selfId ? headPos(state.selfId) : null;
      if (pos) effects.sparkleColumn(pos.x, pos.z, "#8fe3ff");
      return;
    }
    case "party":
      panels.setParty(msg.party, state.selfId);
      return;
    case "partyInvite":
      panels.partyInvite(msg.name);
      return;
    case "tradeRequest":
      panels.tradeRequest(msg.name);
      return;
    case "trade":
      panels.setTrade(msg.trade);
      hud.bagClickOverride = msg.trade ? (slot) => send({ t: "trade", op: "offer", slot }) : null;
      hud.offeredUids = panels.offeredUids();
      hud.refreshBag();
      return;
    case "fx":
      for (const ev of msg.ev) handleFx(ev);
      return;
    case "chat":
      hud.chat(msg.name, msg.text, msg.kind);
      return;
    case "shop":
      hud.openShop(msg.shop);
      return;
    case "toast":
      if (phase === "create") screens.setCreateStatus(msg.text);
      else hud.toast(msg.text, msg.kind);
      return;
    case "time":
      state.worldTime = msg.time;
      state.worldTimeAt = performance.now();
      return;
    case "pong":
      return;
  }
});

function headPos(id: string): THREE.Vector3 | null {
  const e = state.entities.get(id);
  if (!e) return null;
  const v = views.get(id);
  const x = id === state.selfId ? me.x : e.rx;
  const y = id === state.selfId ? me.y : e.ry;
  return new THREE.Vector3(x, map.heightAt(x, y) + (v?.model.height ?? 1.5) + 0.2, y);
}

function handleFx(ev: FxEvent): void {
  switch (ev.e) {
    case "swing": {
      const e = state.entities.get(ev.id);
      const v = views.get(ev.id);
      if (v && ev.id !== state.selfId) v.model.attackT = 0.3;
      if (e) {
        const x = ev.id === state.selfId ? me.x : e.rx;
        const y = ev.id === state.selfId ? me.y : e.ry;
        effects.swing(x, y, ev.a, e.data.k === "p" ? CLASSES.knight.range : 1.4, e.data.k === "p" ? "#ffffff" : "#ffb3c7");
      }
      return;
    }
    case "cast": {
      const v = views.get(ev.id);
      if (v && ev.id !== state.selfId) v.model.attackT = 0.3;
      return;
    }
    case "proj":
      effects.spawnProjectile(ev.pid, ev.kind, ev.x, ev.y, ev.a, ev.spd, ev.rng);
      return;
    case "projEnd":
      effects.endProjectile(ev.pid, ev.x, ev.y, ev.burst);
      return;
    case "hit": {
      const pos = headPos(ev.id);
      const v = views.get(ev.id);
      if (v && !ev.block) v.model.hitT = 0.22;
      if (!pos) return;
      const isSelf = ev.id === state.selfId;
      if (ev.block) labels.floatText(pos, "Blocked!", "block");
      else labels.floatText(pos, String(ev.dmg), ev.crit ? "crit" : isSelf ? "self" : "");
      effects.hitSpark(pos.x, pos.z, pos.y - 0.6, Boolean(ev.crit));
      return;
    }
    case "heal": {
      const pos = headPos(ev.id);
      if (pos) {
        labels.floatText(pos, `+${ev.amt}`, "heal");
        effects.particles.emit(pos.x, pos.y - 0.8, pos.z, { n: 12, color: "#9dffb8", speed: 0.8, up: 1.5, size: 0.07, life: 1, gravity: -1 });
      }
      return;
    }
    case "die": {
      const e = state.entities.get(ev.id);
      const pos = headPos(ev.id);
      if (pos && e) {
        const color = e.data.k === "m" ? MOB_TEMPLATES[e.data.tpl]?.color ?? "#ffffff" : "#ffffff";
        effects.poof(pos.x, pos.z, pos.y - 0.6, color);
      }
      return;
    }
    case "lvl": {
      const pos = headPos(ev.id);
      if (pos) {
        labels.floatText(pos, `Level ${ev.lv}!`, "lvl");
        effects.sparkleColumn(pos.x, pos.z, "#ffd166");
      }
      return;
    }
    case "loot": {
      const e = state.entities.get(ev.id);
      if (e) effects.particles.emit(e.rx, map.heightAt(e.rx, e.ry) + 0.3, e.ry, { n: 8, color: "#ffc94d", speed: 1, up: 2.5, size: 0.06, life: 0.6 });
      return;
    }
    case "say": {
      const pos = headPos(ev.id);
      if (pos) labels.bubble(ev.id, pos, ev.text);
      return;
    }
    case "ability": {
      const v = views.get(ev.id);
      if (v && ev.id !== state.selfId) v.model.attackT = 0.3;
      const pos = headPos(ev.id);
      const t = TALENTS_BY_ID[ev.ab];
      if (pos && t) {
        effects.particles.emit(pos.x, pos.y - 0.9, pos.z, { n: 10, color: ABILITY_COLORS[t.id] ?? "#fff3b0", speed: 1.2, up: 2, size: 0.07, life: 0.6, gravity: -0.5, spread: 0.6 });
        if (ev.id !== state.selfId) labels.bubble(ev.id, pos, `${t.icon} ${t.name}!`);
      }
      return;
    }
    case "nova":
      effects.nova(ev.x, ev.y, ev.r, ABILITY_COLORS[ev.ab] ?? "#ffffff");
      return;
    case "zone":
      effects.zone(ev.zid, ev.kind, ev.x, ev.y, ev.r, ev.dur);
      return;
    case "buff": {
      const e = state.entities.get(ev.id);
      if (e) {
        const x = ev.id === state.selfId ? me.x : e.rx;
        const y = ev.id === state.selfId ? me.y : e.ry;
        effects.buffBurst(x, y, ev.buff);
      }
      return;
    }
  }
}

const ABILITY_COLORS: Record<string, string> = {
  shield_bash: "#d9dde6",
  holy_strike: "#ffd166",
  divine_wrath: "#fff3b0",
  fire_nova: "#ff7a3c",
  smoke_bomb: "#b8b0c4",
  precise_shot: "#fff4e6",
  piercing_arrow: "#e8f7ff",
  multishot: "#fff4e6",
  volley: "#fff4e6",
  great_fireball: "#ff9a3c",
  ice_shard: "#9fe7ff",
  arcane_bolt: "#d9a6ff",
  lay_on_hands: "#9dffb8",
  healing_aura: "#9dffb8",
  battle_cry: "#ff6f8e",
  time_warp: "#b9a3ff"
};

/** Glowing bubbles / rings / tints for active buffs (players) and status effects (mobs). */
function updateAuras(v: View, buffs: string[], dt: number, x: number, y: number): void {
  const m = v.model;
  const want = new Set(buffs);
  for (const [id, obj] of v.auras) {
    if (!want.has(id)) {
      m.root.remove(obj);
      obj.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        }
      });
      v.auras.delete(id);
    }
  }
  for (const id of want) {
    if (v.auras.has(id) || !["shield", "fortify", "haste", "rage", "evasion"].includes(id)) continue;
    const color = Effects.buffColor(id as BuffId);
    let obj: THREE.Object3D;
    if (id === "shield") {
      obj = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.05, 2),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      obj.position.y = 0.95;
    } else {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.75, 0.05, 6, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      ring.rotation.x = Math.PI / 2;
      obj = new THREE.Group();
      obj.add(ring);
      obj.position.y = id === "rage" ? 1.0 : 0.08;
    }
    m.root.add(obj);
    v.auras.set(id, obj);
  }
  for (const [id, obj] of v.auras) {
    obj.rotation.y += dt * (id === "haste" ? 6 : 1.5);
    if (id === "shield") obj.scale.setScalar(1 + Math.sin(performance.now() / 300) * 0.03);
  }
  // Tints: rage glows warm, slowed mobs look icy.
  const tint = m.material.userData.tint.value;
  if (want.has("rage")) tint.set(1, 0.25, 0.35, 0.25 + Math.sin(performance.now() / 150) * 0.1);
  else if (want.has("slow")) tint.set(0.4, 0.7, 1, 0.35);
  else if (want.has("blind")) tint.set(0.4, 0.4, 0.45, 0.3);
  else tint.set(0, 0, 0, 0);
  if (want.has("regen")) {
    v.auraT -= dt;
    if (v.auraT <= 0) {
      v.auraT = 0.25;
      effects.particles.emit(x, map.heightAt(x, y) + 0.4, y, { n: 2, color: "#9dffb8", speed: 0.3, up: 1.4, size: 0.06, life: 0.9, gravity: -1, spread: 0.7 });
    }
  }
}

// ── menu preview ────────────────────────────────────────────────────────────

screens.onLookChange = (cls: ClassId, look: Appearance) => {
  if (menuPreview) {
    renderer.scene.remove(menuPreview.root);
    disposeModel(menuPreview);
  }
  menuPreview = buildHumanoid({ look, cls });
  menuPreview.root.position.set(0.5, map.heightAt(0.5, 4.5), 4.5);
  menuPreview.root.scale.setScalar(1.25);
  renderer.scene.add(menuPreview.root);
};

// ── per-frame update ────────────────────────────────────────────────────────

let lastFrame = performance.now();
let minimapAt = 0;
const tmpV = new THREE.Vector3();

function updateEntities(dt: number, now: number, time: number): void {
  state.interpolate(now);
  state.purge(now, 400, (e) => dropView(e.id));
  const keepPlates = new Set<string>();
  for (const e of state.entities.values()) {
    const v = ensureView(e);
    const isSelf = e.id === state.selfId;
    const x = isSelf ? me.x : e.rx;
    const y = isSelf ? me.y : e.ry;
    const f = isSelf ? me.f : e.rf;
    const d = e.data;
    const m = v.model;
    m.root.position.set(x, map.heightAt(x, y), y);
    if (d.k !== "l") m.root.rotation.y = Math.PI / 2 - f;
    const dead = "dead" in d && d.dead === 1;
    const moving = isSelf ? me.moving : "mv" in d && d.mv === 1;
    let fadeCap = 1;
    if (d.k === "p") {
      if (d.mt) attachPony(m);
      else detachPony(m);
      const buffs = d.bf ? d.bf.split(",") : [];
      updateAuras(v, buffs, dt, x, y);
      if (buffs.includes("camo")) fadeCap = isSelf ? 0.5 : 0.25;
      else if (buffs.includes("evasion")) fadeCap = 0.75 + Math.sin(now / 80) * 0.15;
    } else if (d.k === "m") {
      setStunStars(m, (d.st & 2) !== 0 && !dead);
      updateAuras(v, [(d.st & 1) ? "slow" : "", (d.st & 4) ? "blind" : ""].filter(Boolean), dt, x, y);
    }
    animate(m, { moving, dead, swimming: d.k === "p" && d.sw === 1, speed: d.k === "m" ? 0.7 : 1, mounted: d.k === "p" && d.mt === 1, emote: d.k === "p" ? d.em : "" }, dt, time);
    // Fade out removed entities (and dead mobs) instead of popping.
    const fadeTarget = e.removedAt ? 0 : fadeCap;
    const fade = m.material.userData.fade;
    fade.value += (fadeTarget - fade.value) * Math.min(1, dt * 8);
    m.material.transparent = fade.value < 0.99;
    m.root.visible = fade.value > 0.02;

    // Nameplates
    const dist = Math.hypot(x - me.x, y - me.y);
    tmpV.set(x, map.heightAt(x, y) + m.height + 0.15, y);
    if (d.k === "p") {
      keepPlates.add(e.id);
      labels.plate(e.id, tmpV, {
        name: isSelf ? d.name : `${d.name} · ${d.lv}`,
        kind: isSelf ? "self" : "player",
        hp: d.hp,
        mhp: d.mhp,
        showBar: !isSelf && d.hp < d.mhp,
        emote: d.em ? EMOTES[d.em]?.icon : undefined
      });
    } else if (d.k === "n") {
      if (dist < 22) {
        keepPlates.add(e.id);
        labels.plate(e.id, tmpV, { name: npcDef(d.npc)?.name ?? "Villager", kind: "npc", showBar: false, marker: state.self?.markers[d.npc] });
      }
    } else if (d.k === "m") {
      const tpl = MOB_TEMPLATES[d.tpl];
      const show = !dead && (tpl?.boss || d.hp < d.mhp || d.ag === 1 || dist < 7);
      if (show) {
        keepPlates.add(e.id);
        labels.plate(e.id, tmpV, { name: `${tpl?.name ?? d.tpl} · ${d.lv}`, kind: tpl?.boss ? "boss" : "mob", hp: d.hp, mhp: d.mhp, showBar: true });
      }
    }
    labels.moveBubble(e.id, tmpV);
  }
  labels.hidePlatesExcept(keepPlates);
}

function updateHud(now: number): void {
  const d = selfData();
  const s = state.self;
  if (d) {
    hud.setHp(d.hp, d.mhp);
    hud.setDead(d.dead === 1);
  }
  if (s) {
    const cd = CLASSES[s.cls].cooldownMs;
    hud.setCooldown(1 - (now - lastAttackAt) / cd);
  }
  panels.updateCooldowns(now);
  document.getElementById("hot-mount")!.classList.toggle("mounted", Boolean(d?.mt));
  const target = nearestInteractable();
  hud.setHint(target && !input.touchMode ? target.label : target ? target.label.replace("E · ", "") : null);
  if (now >= minimapAt) {
    minimapAt = now + 150;
    const dots: MinimapDot[] = [];
    for (const e of state.entities.values()) {
      if (e.removedAt || e.id === state.selfId) continue;
      const dd = e.data;
      if (dd.k === "m" && !dd.dead) dots.push({ x: e.rx, y: e.ry, color: MOB_TEMPLATES[dd.tpl]?.boss ? "#ffc94d" : "#ff6f8e", size: MOB_TEMPLATES[dd.tpl]?.boss ? 4 : 2 });
      else if (dd.k === "n") dots.push({ x: e.rx, y: e.ry, color: "#2fa784", size: 2.5 });
      else if (dd.k === "p") dots.push({ x: e.rx, y: e.ry, color: "#5b8def", size: 3 });
      else if (dd.k === "l") dots.push({ x: e.rx, y: e.ry, color: "#ffd166", size: 1.5 });
    }
    // Party members show even when they're out of view range.
    for (const pm of panels.party?.members ?? []) {
      if (pm.id !== state.selfId) dots.push({ x: pm.x, y: pm.y, color: "#b26bff", size: 3.5 });
    }
    for (const w of WAYPOINTS) dots.push({ x: w.x, y: w.y, color: state.self?.waypoints.includes(w.id) ? "#d9a6ff" : "#9a94a6", size: 3 });
    hud.drawMinimap(map, me.x, me.y, me.f, dots, panels.objective());
    const biome = map.biomeAt(me.x, me.y);
    hud.setZone(biome === "town" ? "Hearthmoor" : `${biome} · lv ${map.zoneLevelAt(me.x, me.y)}`);
  }
}

function frame(): void {
  requestAnimationFrame(frame);
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  const time = now / 1000;
  const worldTime = phase === "play" ? state.currentWorldTime(now) : 0.42;

  const drag = input.consumeDrag();
  if (phase === "play") {
    renderer.orbit(drag.dx, drag.dy, drag.wheel);
    predict(dt, now);
    // Holding Space, the mouse button or the touch attack button keeps attacking on cooldown.
    if (!hud.chatFocused && (input.isDown("Space") || input.touchAttack || (input.mouseDown && !input.touchMode))) tryAttack(now);
    renderer.target.set(me.x, map.heightAt(me.x, me.y), me.y);
    updateEntities(dt, now, time);
    updateHud(now);
  } else {
    // Title / creator: slowly orbit the plaza around the preview character.
    menuAngle += dt * 0.08;
    renderer.yaw = 0.25 + Math.sin(menuAngle) * 0.4;
    renderer.pitch = 0.22;
    renderer.distance = 7;
    renderer.lookAbove = 1.5;
    // On wide screens the creator card sits on the right, so shift the view to put the
    // preview character in the left half.
    const shift = phase === "create" && innerWidth > 720 ? 2.6 : 0;
    renderer.target.set(0.5 + Math.cos(renderer.yaw) * shift, map.heightAt(0.5, 4.5), 4.5 - Math.sin(renderer.yaw) * shift);
    if (menuPreview) {
      menuPreview.root.rotation.y = renderer.yaw;
      animate(menuPreview, { moving: false, dead: false }, dt, time);
    }
  }

  const focus = phase === "play" ? me : { x: 0.5, y: 4.5 };
  terrain.update(focus.x, focus.y, loadingHidden ? 2 : 6);
  if (!loadingHidden && terrain.pending === 0) {
    loadingHidden = true;
    document.getElementById("loading")!.classList.add("fade");
  }
  renderer.update(dt, worldTime);
  worldUniforms.uTime.value = time;
  worldUniforms.uNight.value = renderer.night;
  for (const l of town.lights) l.intensity = renderer.night * 6;
  effects.updateBeams(map, focus.x, focus.y, renderer.sunDir, 1 - renderer.night * 1.4, now);
  effects.updateFireflies(focus.x, focus.y, renderer.night, time);
  effects.update(dt);
  landmarks.update(time);
  labels.update(now);
  renderer.render(dt);
}

// Keep-alive / RTT probe.
setInterval(() => {
  if (net.open) send({ t: "ping", c: performance.now() });
}, 5000);

// Boot
(document.getElementById("loading-text") as HTMLElement).textContent = "Planting trees and fluffing clouds…";
net.connect();
requestAnimationFrame(frame);

// Debug handle for tests / console tinkering.
(globalThis as unknown as { balathor: unknown }).balathor = { state, me, renderer, map, Tile, send, views };

