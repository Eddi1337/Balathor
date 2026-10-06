// Balathor v2 client entry: wires networking, prediction, rendering and UI together.

import * as THREE from "three";
import type { Appearance, C2S, FxEvent, NetEntity, NetPlayer, S2C } from "../shared/protocol";
import { CLASSES, type ClassId } from "../shared/game/classes";
import { MOB_TEMPLATES } from "../shared/game/mobs";
import { npcDef } from "../shared/game/npcs";
import { OVERWORLD, getMap, isInterior, type MapDef } from "../shared/world/maps";
import { obstacleTopAt } from "../shared/world/city";
import { riverAt } from "../shared/world/rivers";
import { DOOR_RADIUS, PLOTS_BY_ID, doorsOn, parseHouseMapId, type Door } from "../shared/world/housing";
import { FURNITURE, cellsOf, placementError, type PlacedPiece } from "../shared/game/furniture";
import { buildFurniture, buildInterior } from "./render/interior";
import { HomeUI } from "./ui/home";
import { CraftingUI } from "./ui/crafting";
import { STATIONS, stationNear } from "../shared/world/stations";
import { FISH_RANGE, GATHER_RANGE, PROFESSIONS, STATION_RANGE, gatherNode } from "../shared/game/professions";
import { isWaterTile } from "../shared/world/tiles";
import { stepMovement } from "../shared/game/movement";
import { Tile } from "../shared/world/tiles";
import { Net } from "./net";
import { Input } from "./input";
import { ClientState, type ClientEntity } from "./state";
import { Renderer, detectQuality } from "./render/renderer";
import { TerrainStreamer } from "./render/terrain";
import { cityFountains, marketLights } from "./render/city";
import { Fountains } from "./render/water";
import { applyCurrent, isSwimming } from "../shared/game/movement";
import { itemTemplate } from "../shared/game/items";
import { Effects } from "./render/effects";
import { worldUniforms } from "./render/builder";
import { JUMP_TIME, animate, attachPony, buildHumanoid, buildLoot, buildMob, detachPony, disposeModel, jumpOffset, setStunStars, type Model } from "./render/models";
import { Landmarks } from "./render/landmarks";
import { Labels } from "./ui/labels";
import { Hud, type MinimapDot } from "./ui/hud";
import { Screens } from "./ui/screens";
import { Panels } from "./ui/panels";
import { TALENTS_BY_ID, type BuffId } from "../shared/game/talents";
import { WAYPOINTS, WAYPOINT_USE_RADIUS, type Waypoint } from "../shared/game/waypoints";
import { EMOTES } from "../shared/game/emotes";
import { MOUNT_SPEED_MULT } from "../shared/game/stats";
import { HULLS, shipStats, stepShip, BOOST_COOLDOWN_MS, BOOST_MS, type HullId } from "../shared/game/ships";
import { DOCK_RANGE, POIS, poiNear } from "../shared/world/scifi/space";
import { LAUNCH_PAD, STATION_H, STATION_W } from "../shared/world/scifi/station";
import { SpaceScene } from "./render/space";
import { buildDeck, type Deck } from "./render/deck";
import { SHIP_FLOAT, animateScifi, buildScifiMob, buildShip, isScifiModel } from "./render/scifiModels";
import { HangarUI, WarpUI } from "./ui/hangar";
import { Surface, planetSky } from "./render/surface";
import { PAD_RADIUS, PLANET_PAD } from "../shared/world/scifi/planets";
import { isPlanet } from "../shared/world/maps";

type Phase = "connecting" | "auth" | "create" | "play";

let map: MapDef = OVERWORLD;
let interiorGroup: THREE.Group | null = null;
const quality = detectQuality();
const canvas = document.getElementById("scene") as HTMLCanvasElement;
const renderer = new Renderer(canvas, quality);
renderer.occluder = obstacleTopAt;
const terrain = new TerrainStreamer(quality.msaa ? 4 : 3);
const cityLights = marketLights();
const effects = new Effects();
effects.setHeightFn((x, y) => map.heightAt(x, y));
const landmarks = new Landmarks();
const fountains = new Fountains(cityFountains());
const space = new SpaceScene();
space.group.visible = false;
renderer.scene.add(terrain.group, terrain.water, effects.group, landmarks.group, fountains.group, space.group, ...cityLights);
let deck: Deck | null = null;
let surface: Surface | null = null;
/** The ship parked on the hangar pad (station only). */
let parkedShip: { hull: string; model: Model } | null = null;

const net = new Net(Net.defaultUrl());
const state = new ClientState();
const input = new Input(canvas);
const labels = new Labels(renderer.camera);
const send = (msg: C2S) => net.send(msg);
const hud = new Hud(send);
const screens = new Screens(send);
const panels = new Panels(send, (t, k) => hud.toast(t, k));
panels.onCast = (id) => castAbility(id, performance.now());
const crafting = new CraftingUI(send);
const depleted = new Set<string>();
let bobber: THREE.Mesh | null = null;
const hangar = new HangarUI(send);
const warpUi = new WarpUI(send);
const home = new HomeUI(send, (title, text, yes) => panels.dialog("", title, text, "", yes, undefined, "Yes", "Cancel"));

let phase: Phase = "connecting";
/** Where the title screen camera looks: the market fountain, the city rising behind it. */
const MENU_SPOT = { x: 0.5, y: 113.5 };
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
  if (d.k === "p") return `p|${d.cls}|${d.look.body}|${d.look.accent}|${d.look.skin}|${d.look.hair}|${d.look.hairStyle}|${d.wr}|${d.ar}|${d.sh}`;
  if (d.k === "m") return `m|${d.tpl}`;
  if (d.k === "n") return `n|${d.npc}`;
  if (d.k === "f") return `f|${d.kind}|${d.rot}|${d.x}|${d.y}`;
  return `l|${d.tpl}|${d.rarity}|${d.gold}`;
}

function buildView(d: NetEntity): Model {
  if (d.k === "p") {
    if (d.sh) {
      const h = HULLS[d.sh as HullId] ?? HULLS.skiff;
      return buildShip(h.id, h.color, h.accent, d.look);
    }
    return buildHumanoid({ look: d.look, cls: d.cls, weaponRarity: d.wr, armorRarity: d.ar });
  }
  if (d.k === "m") {
    const tpl = MOB_TEMPLATES[d.tpl];
    if (tpl && isScifiModel(tpl.model)) return buildScifiMob(tpl.model, tpl.color, tpl.accent, tpl.scale, Boolean(tpl.boss));
    return buildMob(tpl?.model ?? "slime", tpl?.color ?? "#7fd66b", tpl?.accent ?? "#ffffff", tpl?.scale ?? 1, Boolean(tpl?.boss));
  }
  if (d.k === "n") {
    const def = npcDef(d.npc);
    return buildHumanoid({ look: { body: def?.body ?? "#8fc97a", accent: def?.accent ?? "#fff", skin: "#ffd9b8", hair: "#7a5234", hairStyle: (d.npc.length % 5) }, hat: def?.hat ?? "none", cls: def?.role === "guard" ? "knight" : undefined });
  }
  if (d.k === "f") return staticModel(buildFurniture(d.kind, d.rot));
  return buildLoot(d.gold, d.rarity);
}

function staticModel(group: THREE.Group): Model {
  const m = buildLoot(0, null);
  m.root.clear();
  m.root.add(group);
  m.kind = "furniture";
  m.height = 1;
  return m;
}

/** Keep the client's copy of furniture collision in sync (for movement prediction). */
function syncBlockers(): void {
  if (!isInterior(map)) return;
  map.blockers.clear();
  for (const e of state.entities.values()) {
    if (e.data.k !== "f" || e.removedAt || !FURNITURE[e.data.kind]?.solid) continue;
    for (const c of cellsOf(e.data)) map.blockers.add(`${c.x},${c.y}`);
  }
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

state.onRemove = (e) => {
  if (e.data.k === "f") syncBlockers();
};

state.onAdd = (e) => {
  ensureView(e);
  if (e.data.k === "f") syncBlockers();
  if (e.data.k === "m" && phase === "play") {
    const h = map.heightAt(e.data.x, e.data.y);
    effects.particles.emit(e.data.x, h + 0.3, e.data.y, { n: 6, color: "#ffffff", speed: 1, up: 1.5, size: 0.08, life: 0.5 });
  }
};

// ── local player prediction ─────────────────────────────────────────────────

const me = { x: 0, y: 0, f: Math.PI / 2, moving: false, vx: 0, vy: 0, boostUntil: 0, boostReadyAt: 0 };
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
  if (s && d && d.sh && map.kind === "space") {
    // Flying: the shared flight model (turn toward the stick, thrust, drift).
    const stats = shipStats(d.sh as HullId, s.shipUp, s.lv);
    stepShip(map, me, mx, my, stats, now < me.boostUntil, dt);
    me.moving = Math.hypot(me.vx, me.vy) > 0.4;
  } else {
    me.vx = me.vy = 0;
    me.moving = Math.hypot(mx, my) > 0.05;
  }
  if (me.moving && s && d && !d.sh) {
    const haste = d.bf.includes("haste") ? 1.4 : 1;
    stepMovement(map, me, mx, my, s.derived.speed * (d.mt ? MOUNT_SPEED_MULT : 1) * haste, dt);
    if (now - lastAttackAt > 350) me.f = Math.atan2(my, mx);
  }
  // Rivers carry swimmers downstream (same shared rule as the server).
  if (d && !d.dead && isSwimming(map, me.x, me.y)) applyCurrent(map, me, dt);
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
  const flying = Boolean(d.sh);
  const cd = flying ? shipStats(d.sh as HullId, s.shipUp, s.lv).fireMs : CLASSES[s.cls].cooldownMs * (d.bf.includes("haste") ? 0.6 : 1);
  if (now - lastAttackAt < cd) return;
  lastAttackAt = now;
  const a = angle ?? aimAngle();
  if (!flying) me.f = a;
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
  if (d.sh) return hud.toast("Abilities don't work from the cockpit");
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

function doorLabel(door: Door): string {
  if (!door.plot || door.to.map === OVERWORLD.id) return door.label;
  const plot = PLOTS_BY_ID[door.plot];
  const info = home.houses.get(door.plot);
  if (!info?.owner) return `${plot.name}: for sale (${plot.price}g)`;
  if (state.self?.home === door.plot) return "Enter your home";
  return `Visit ${info.owner}'s home${info.open ? "" : " (if invited)"}`;
}

type InteractKind = "npc" | "loot" | "waypoint" | "door" | "chest" | "station" | "gather" | "fish" | "reel" | "launch" | "dock";

function hasTool(tpl: string | undefined): boolean {
  return !tpl || Boolean(state.self?.inv.some((i) => i?.tpl === tpl));
}

/** The nearest gatherable prop (tree, rock, flowers…) within reach, if any. */
function nearestNode(): { x: number; y: number; label: string; locked: boolean } | null {
  if (map.kind !== "overworld" && map.kind !== "surface") return null;
  let best: { x: number; y: number; label: string; locked: boolean } | null = null;
  let bestD = GATHER_RANGE;
  const r = Math.ceil(GATHER_RANGE);
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const tx = Math.floor(me.x) + dx;
      const ty = Math.floor(me.y) + dy;
      const d = Math.hypot(tx + 0.5 - me.x, ty + 0.5 - me.y);
      if (d > GATHER_RANGE || depleted.has(`${map.id}|${tx},${ty}`)) continue;
      const node = gatherNode(map.tileAt(tx, ty), map.biomeAt(tx + 0.5, ty + 0.5));
      if (!node || !hasTool(PROFESSIONS[node.prof].tool)) continue;
      // Nodes you can't work yet only show when nothing workable is in reach.
      const locked = (state.self?.professions[node.prof].lv ?? 1) < node.level;
      if (locked && best && !best.locked) continue;
      if (!locked && best?.locked) bestD = GATHER_RANGE;
      if (d > bestD) continue;
      bestD = d;
      best = { x: tx, y: ty, locked, label: `${PROFESSIONS[node.prof].verb} ${node.name} (${PROFESSIONS[node.prof].name} ${node.level})` };
    }
  }
  return best;
}

/** A water spot to cast into: straight ahead first, else the nearest water in range. */
function fishingSpot(): { x: number; y: number } | null {
  if ((map.kind !== "overworld" && map.kind !== "surface") || !hasTool("tool_rod")) return null;
  for (let d = 1.5; d <= FISH_RANGE; d += 0.5) {
    const x = me.x + Math.cos(me.f) * d;
    const y = me.y + Math.sin(me.f) * d;
    if (isWaterTile(map.tileAt(x, y))) return { x, y };
  }
  for (let d = 1.5; d <= FISH_RANGE; d += 0.75) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const x = me.x + Math.cos(a) * d;
      const y = me.y + Math.sin(a) * d;
      if (isWaterTile(map.tileAt(x, y))) return { x, y };
    }
  }
  return null;
}

function nearestInteractable(): { id: string; kind: InteractKind; label: string } | null {
  let best: { id: string; kind: InteractKind; label: string } | null = null;
  let bestD = Infinity;
  for (const door of doorsOn(map.id)) {
    const dd = Math.hypot(door.x - me.x, door.y - me.y);
    if (dd <= DOOR_RADIUS && dd < bestD) {
      bestD = dd;
      best = { id: door.id, kind: "door", label: `E · ${doorLabel(door)}` };
    }
  }
  if (home.insideOwnHome) {
    for (const e of state.entities.values()) {
      if (e.data.k !== "f" || !FURNITURE[e.data.kind]?.storage || e.removedAt) continue;
      const dd = Math.hypot(e.data.x + 0.5 - me.x, e.data.y + 0.5 - me.y);
      if (dd < 2.4 && dd < bestD) {
        bestD = dd;
        best = { id: e.id, kind: "chest", label: "E · Open storage" };
      }
    }
  }
  if (crafting.fishing?.bite) return { id: "reel", kind: "reel", label: "E · Reel in!" };
  if (map.kind === "space") {
    const dock = poiNear(me.x, me.y, ["station", "planet"], DOCK_RANGE);
    if (dock) return { id: dock.id, kind: "dock", label: dock.planet ? `E · Land on ${dock.name}` : `E · Dock at ${dock.name}` };
  }
  if (isPlanet(map) && Math.hypot(me.x - PLANET_PAD.x, me.y - PLANET_PAD.y) <= PAD_RADIUS) {
    return { id: "launch", kind: "launch", label: state.self?.activeShip ? "E · Launch to orbit" : "E · Launch (you need a ship)" };
  }
  if (map.id === "station" && Math.hypot(me.x - LAUNCH_PAD.x, me.y - LAUNCH_PAD.y) <= LAUNCH_PAD.r + 1) {
    const hull = state.self?.activeShip;
    return { id: "launch", kind: "launch", label: hull ? `E · Launch the ${HULLS[hull].name}` : "E · Launch (you need a ship first)" };
  }
  if (!best) {
    const st = stationNear(me.x, me.y, STATION_RANGE, map.id);
    if (st) return { id: st.id, kind: "station", label: `E · Use ${st.name}` };
  }
  const ob = map.id === OVERWORLD.id ? nearestObelisk() : null;
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
  if (!best && !crafting.fishing && !crafting.working) {
    const node = nearestNode();
    if (node) return { id: `${node.x},${node.y}`, kind: "gather", label: `E · ${node.label}` };
    const spot = fishingSpot();
    if (spot) return { id: `${spot.x},${spot.y}`, kind: "fish", label: "E · Cast your line" };
  }
  return best;
}

let lastJumpAt = 0;
function jump(): void {
  const d = selfData();
  const now = performance.now();
  if (d?.sh) {
    // In a ship, Space is the afterburner.
    if (now < me.boostReadyAt) return;
    me.boostUntil = now + BOOST_MS;
    me.boostReadyAt = now + BOOST_COOLDOWN_MS;
    send({ t: "boost" });
    return;
  }
  if (!d || d.dead || now - lastJumpAt < 560) return;
  lastJumpAt = now;
  const v = state.selfId ? views.get(state.selfId) : undefined;
  if (v) v.model.jumpT = JUMP_TIME;
  send({ t: "jump" });
}

function interact(): void {
  const target = nearestInteractable();
  if (!target) return;
  if (target.kind === "door") {
    const door = doorsOn(map.id).find((d) => d.id === target.id);
    if (door?.plot && door.to.map !== OVERWORLD.id && !home.houses.get(door.plot)?.owner) {
      const plot = PLOTS_BY_ID[door.plot];
      panels.dialog("Estate notice", `${plot.name} is for sale`, `A lovely ${plot.manor ? "two-storey manor" : "townhouse"} on the ${["", "Artisans'", "Guild", "Nobles'"][plot.house.tier]} Ring. Make it yours for ${plot.price} gold?`, "", () => send({ t: "house", op: "buy", plot: plot.id }), undefined, "Buy it!", "Not now");
      return;
    }
    send({ t: "door", id: target.id });
    return;
  }
  if (target.kind === "reel") {
    send({ t: "reel" });
    return;
  }
  if (target.kind === "launch" || target.kind === "dock") {
    send({ t: target.kind });
    return;
  }
  if (target.kind === "station") {
    const st = STATIONS.find((s) => s.id === target.id);
    if (st) crafting.openStation(st);
    return;
  }
  if (target.kind === "gather" || target.kind === "fish") {
    const [x, y] = target.id.split(",").map(Number);
    send(target.kind === "gather" ? { t: "gather", x, y } : { t: "fish", x, y });
    return;
  }
  if (target.kind === "chest") {
    send({ t: "storage", op: "open", slot: -1 });
    return;
  }
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
      interact();
      break;
    case "Space":
      jump();
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
    case "KeyP":
      crafting.toggleProfs();
      break;
    case "KeyJ":
      if (map.kind === "space") {
        warpUi.pos = { x: me.x, y: me.y };
        warpUi.toggle();
      } else hud.toast("The warp drive works in open space");
      break;
    case "KeyM":
      send({ t: "mount" });
      break;
    case "KeyH":
      if (home.insideOwnHome) home.toggleDecorate();
      else if (state.self?.home) hud.toast("Decorate inside your home (press H there)");
      break;
    case "KeyR":
      if (home.placing) home.rot = (home.rot + 1) % 4;
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
      if (hangar.open) hangar.hide();
      else if (warpUi.open) warpUi.hide();
      else if (home.placing) home.placing = null;
      else if (home.decorating) home.stopDecorating();
      else if (home.storageOpen) home.closeStorage();
      else if (!panels.closeAll()) hud.closeAll();
      break;
  }
};

input.onClickWorld = (sx, sy) => {
  if (phase !== "play") return;
  if (home.decorating) {
    decorateClick(sx, sy);
    return;
  }
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

function floorCell(sx: number, sy: number): { x: number; y: number } | null {
  const g = renderer.screenToGround(sx, sy, 0);
  return g ? { x: Math.floor(g.x), y: Math.floor(g.y) } : null;
}

function placedPieces(): PlacedPiece[] {
  const out: PlacedPiece[] = [];
  for (const e of state.entities.values()) if (e.data.k === "f" && !e.removedAt) out.push({ id: e.id, kind: e.data.kind, x: e.data.x, y: e.data.y, rot: e.data.rot });
  return out;
}

function decorateClick(sx: number, sy: number): void {
  const cell = floorCell(sx, sy);
  if (!cell) return;
  if (home.placing) {
    send({ t: "furn", op: "place", kind: home.placing, x: cell.x, y: cell.y, rot: home.rot });
    if ((state.self?.furniture[home.placing] ?? 0) <= 1) home.placing = null;
    return;
  }
  // Click an existing piece to pick it up.
  for (const p of placedPieces()) {
    if (cellsOf(p).some((c) => c.x === cell.x && c.y === cell.y)) {
      send({ t: "furn", op: "pickup", id: p.id });
      return;
    }
  }
}

// Ghost preview of the piece being placed.
let ghost: { kind: string; rot: number; group: THREE.Group } | null = null;
function updateGhost(): void {
  const want = home.decorating && home.placing && isInterior(map) ? home.placing : null;
  if (ghost && (!want || ghost.kind !== want || ghost.rot !== home.rot)) {
    renderer.scene.remove(ghost.group);
    ghost = null;
  }
  if (!want || !isInterior(map)) return;
  if (!ghost) {
    const group = buildFurniture(want, home.rot);
    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = new THREE.MeshBasicMaterial({ color: 0x9dffb8, transparent: true, opacity: 0.55, depthWrite: false });
        mesh.castShadow = false;
      }
    });
    renderer.scene.add(group);
    ghost = { kind: want, rot: home.rot, group };
  }
  const cell = floorCell(input.mouseX, input.mouseY);
  if (!cell) return;
  ghost.group.position.set(cell.x, 0.02, cell.y);
  const err = placementError(map.layout, placedPieces(), want, cell.x, cell.y, home.rot);
  ghost.group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) (mesh.material as THREE.MeshBasicMaterial).color.set(err ? 0xff8fb1 : 0x9dffb8);
  });
}

/** Switch the scene to another map (overworld ↔ interiors). */
let shownMap = "";
function switchMap(id: string): void {
  if (id === shownMap) return;
  shownMap = id;
  state.clear((e) => dropView(e.id));
  home.stopDecorating();
  home.closeStorage();
  hangar.hide();
  warpUi.hide();
  crafting.closeStation();
  if (interiorGroup) {
    renderer.scene.remove(interiorGroup);
    interiorGroup = null;
  }
  if (deck) {
    renderer.scene.remove(deck.group);
    deck = null;
  }
  if (surface) {
    renderer.scene.remove(surface.group);
    surface.dispose();
    surface = null;
  }
  if (parkedShip) {
    renderer.scene.remove(parkedShip.model.root);
    disposeModel(parkedShip.model);
    parkedShip = null;
  }
  map = getMap(id);
  const outdoors = map.kind === "overworld";
  renderer.env = outdoors ? "outdoor" : map.kind === "interior" ? "indoor" : map.kind === "deck" ? "deck" : map.kind === "space" ? "space" : "planet";
  renderer.occluder = outdoors ? obstacleTopAt : null;
  terrain.group.visible = terrain.water.visible = landmarks.group.visible = fountains.group.visible = outdoors;
  for (const l of cityLights) l.visible = outdoors;
  space.group.visible = map.kind === "space";
  me.vx = me.vy = 0;
  if (map.kind === "space") {
    renderer.distance = 23;
    renderer.pitch = 0.98;
    renderer.lookAbove = 0;
  } else if (isPlanet(map)) {
    surface = new Surface(map);
    surface.update(0, 24);
    renderer.scene.add(surface.group);
    const sky = planetSky(map.planet.id);
    const ps = renderer.planetSky;
    ps.top.set(sky.top);
    ps.horizon.set(sky.horizon);
    ps.fog.set(sky.fog);
    ps.sun.set(sky.sun);
    ps.ground.set(sky.ground);
    ps.sunI = sky.sunI;
    ps.hemiI = sky.hemiI;
    renderer.distance = 14;
    renderer.pitch = 0.5;
    renderer.lookAbove = 2.2;
  } else if (map.kind === "deck") {
    deck = buildDeck(map, STATION_W, STATION_H);
    renderer.scene.add(deck.group);
    renderer.distance = 13;
    renderer.pitch = 0.82;
    renderer.lookAbove = 0.6;
    renderer.yaw = 0;
  } else if (isInterior(map)) {
    map.blockers.clear();
    interiorGroup = buildInterior(map);
    renderer.scene.add(interiorGroup);
    renderer.distance = 11;
    renderer.pitch = 0.85;
    renderer.lookAbove = 0.6;
    renderer.yaw = 0;
  } else {
    renderer.distance = 14;
    renderer.pitch = 0.5;
    renderer.lookAbove = 2.2;
  }
  const house = parseHouseMapId(map.id);
  home.insideOwnHome = house && state.self?.home === house.plotId ? house.plotId : null;
}

document.getElementById("hot-attack")!.addEventListener("click", () => tryAttack(performance.now(), me.f));
document.getElementById("hot-interact")!.addEventListener("click", () => interact());
document.getElementById("touch-jump")!.addEventListener("touchstart", (e) => {
  e.preventDefault();
  jump();
}, { passive: false });
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
      switchMap(msg.map);
      if (map.kind === "space") me.f = Math.PI / 2;
      renderer.target.set(me.x, map.heightAt(me.x, me.y), me.y);
      renderer.snapCamera();
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
      home.setSelf(msg.self);
      crafting.setSelf(msg.self);
      hangar.setSelf(msg.self);
      warpUi.setSelf(msg.self);
      landmarks.setAttuned(msg.self.waypoints);
      {
        const house = parseHouseMapId(map.id);
        home.insideOwnHome = house && msg.self.home === house.plotId ? house.plotId : null;
      }
      return;
    case "houses":
      home.setHouses(msg.list);
      return;
    case "hangar":
      hangar.show();
      return;
    case "warp":
      if (msg.state === "charge") crafting.startWork(msg.ms ?? 2500, "Warp drive charging…");
      else crafting.stopWork();
      if (msg.state === "done" && msg.x !== undefined && msg.y !== undefined) {
        me.x = state.serverX = msg.x;
        me.y = state.serverY = msg.y;
        me.vx = 0;
        me.vy = -2;
        me.f = -Math.PI / 2;
        renderer.target.set(me.x, 0, me.y);
        renderer.snapCamera();
        hud.toast("Warp complete!", "good");
      }
      return;
    case "depleted":
      depleted.clear();
      for (const k of msg.keys) depleted.add(k);
      return;
    case "gather":
      if (msg.state === "start") {
        crafting.startWork(msg.ms ?? 2000, "Working…");
        me.f = Math.atan2(msg.y + 0.5 - me.y, msg.x + 0.5 - me.x);
      } else {
        crafting.stopWork();
        if (msg.state === "done") depleted.add(`${map.id}|${msg.x},${msg.y}`);
        if (msg.state === "done" && msg.item) hud.toast(`+1 ${itemTemplate(msg.item)?.name ?? msg.item}`, "good");
      }
      return;
    case "fish":
      if (msg.state === "cast" || msg.state === "bite") {
        crafting.fishing = { x: msg.x, y: msg.y, bite: msg.state === "bite" };
        me.f = Math.atan2(msg.y - me.y, msg.x - me.x);
        if (!bobber) {
          bobber = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 1), new THREE.MeshStandardMaterial({ color: 0xff5c6a, emissive: 0x551018, flatShading: true }));
          renderer.scene.add(bobber);
        }
        bobber.position.set(msg.x, waterLevelAt(msg.x, msg.y) + 0.06, msg.y);
        fountains.addRipple(msg.x, waterLevelAt(msg.x, msg.y), msg.y, msg.state === "bite" ? 1.2 : 0.7);
      } else {
        crafting.fishing = null;
        if (bobber) {
          renderer.scene.remove(bobber);
          bobber = null;
        }
        if (msg.state === "caught" && msg.item) {
          hud.toast(`Caught a ${itemTemplate(msg.item)?.name ?? msg.item}!`, "good");
          effects.particles.emit(msg.x, waterLevelAt(msg.x, msg.y) + 0.3, msg.y, { n: 16, color: "#d9f6ff", speed: 2, up: 3, size: 0.07, life: 0.7 });
        } else if (msg.state === "escaped") hud.toast("It got away…");
      }
      return;
    case "storage":
      home.openStorage(msg.items);
      hud.bagClickOverride = msg.items ? (slot) => send({ t: "storage", op: "deposit", slot }) : null;
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
    case "work": {
      const v = views.get(ev.id);
      if (v) v.model.attackT = 0.3;
      const h = map.heightAt(ev.x, ev.y);
      const color = ev.prof === "woodcutting" ? "#c9955f" : ev.prof === "mining" ? "#c9c3b8" : ev.prof === "herbalism" ? "#ff9fc4" : "#d9f6ff";
      effects.particles.emit(ev.x, h + 0.8, ev.y, { n: 14, color, speed: 2, up: 2.5, size: 0.08, life: 0.7 });
      return;
    }
    case "jump": {
      const v = views.get(ev.id);
      if (v) v.model.jumpT = JUMP_TIME;
      return;
    }
    case "warp": {
      effects.ring(ev.x, ev.y, 4, "#9fd8ff");
      effects.particles.emit(ev.x, SHIP_FLOAT, ev.y, { n: 40, color: ev.out ? "#ffffff" : "#9fd8ff", speed: 7, up: 0.5, size: 0.12, life: 0.7, gravity: 0 });
      return;
    }
    case "boom": {
      effects.ring(ev.x, ev.y, ev.big ? 6 : 3, "#ff9a3c");
      effects.particles.emit(ev.x, SHIP_FLOAT, ev.y, { n: ev.big ? 60 : 24, color: "#ffb02e", speed: ev.big ? 8 : 5, up: 1, size: 0.16, life: 0.9, gravity: 0 });
      effects.particles.emit(ev.x, SHIP_FLOAT, ev.y, { n: ev.big ? 30 : 12, color: "#5a5f6a", speed: 3, up: 0.5, size: 0.2, life: 1.4, gravity: 0 });
      return;
    }
    case "shieldHit": {
      const pos = headPos(ev.id);
      if (pos) effects.particles.emit(pos.x, pos.y - 0.6, pos.z, { n: 10, color: "#7fe8ff", speed: 2.5, up: 0.4, size: 0.09, life: 0.4, gravity: 0 });
      return;
    }
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

/** Surface height of the water at (x, y): river level or sea level. */
function waterLevelAt(x: number, y: number): number {
  if (map.kind === "surface") return 0.14;
  const r = riverAt(x, y);
  return r ? r.level : 0;
}

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
  menuPreview.root.position.set(MENU_SPOT.x, map.heightAt(MENU_SPOT.x, MENU_SPOT.y), MENU_SPOT.y);
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
      const swim = isSwimming(map, x, y);
      const was = Boolean(v.model.root.userData.swim);
      if (swim !== was) {
        v.model.root.userData.swim = swim;
        // Splash on entering (or climbing out of) the water.
        effects.particles.emit(x, map.heightAt(x, y) + 0.5, y, { n: swim ? 22 : 10, color: "#d9f6ff", speed: 2.2, up: 3, size: 0.07, life: 0.7 });
        fountains.addRipple(x, waterLevelAt(x, y), y, 1.2);
      }
      if (swim) {
        v.auraT -= dt;
        if (v.auraT <= 0) {
          v.auraT = moving ? 0.22 : 0.7;
          fountains.addRipple(x, waterLevelAt(x, y), y, moving ? 0.8 : 0.5);
        }
      }
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
    if (m.kind !== "humanoid" && m.kind !== "loot" && m.kind !== "furniture") {
      const prevF = (m.root.userData.prevF as number | undefined) ?? f;
      let turn = f - prevF;
      if (turn > Math.PI) turn -= Math.PI * 2;
      if (turn < -Math.PI) turn += Math.PI * 2;
      m.root.userData.prevF = f;
      const boost = d.k === "p" && (isSelf ? now < me.boostUntil : d.bo === 1);
      animateScifi(m, { moving, dead, boost, turn: dt > 0 ? turn / dt : 0 }, dt, time);
      if (m.kind === "ship" && moving && !dead && Math.random() < dt * (boost ? 60 : 25)) {
        const back = (m.scale ?? 1) * 1.3;
        effects.particles.emit(x - Math.cos(f) * back, SHIP_FLOAT, y - Math.sin(f) * back, { n: 1, color: boost ? "#ffffff" : d.k === "p" ? "#7fe8ff" : "#ff8a5c", speed: 0.4, up: 0, size: boost ? 0.16 : 0.11, life: 0.5, gravity: 0, spread: 0.1 });
      }
    }
    m.root.position.y += jumpOffset(m, dt);
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
  // Little signs over homes: owner names or "for sale".
  if (map.id === OVERWORLD.id) {
    for (const plot of Object.values(PLOTS_BY_ID)) {
      if (Math.hypot(plot.front.x - me.x, plot.front.y - me.y) > 16) continue;
      const info = home.houses.get(plot.id);
      tmpV.set(plot.front.x, map.heightAt(plot.front.x, plot.front.y) + 2.6, plot.front.y);
      const key = `plot_${plot.id}`;
      keepPlates.add(key);
      labels.plate(key, tmpV, { name: info?.owner ? `🏠 ${info.owner}` : `🏷️ For sale · ${plot.price}g`, kind: "npc", showBar: false });
    }
  }
  if (map.kind === "space") {
    for (const p of POIS) {
      if (Math.hypot(p.x - me.x, p.y - me.y) > p.r + 90) continue;
      tmpV.set(p.x, p.kind === "planet" ? 4 : 7, p.y + (p.kind === "planet" ? 0 : p.r * 0.2));
      const key = `poi_${p.id}`;
      keepPlates.add(key);
      labels.plate(key, tmpV, { name: `${p.name} · lv ${p.level}`, kind: "npc", showBar: false });
    }
  }
  labels.hidePlatesExcept(keepPlates);
}

function updateHud(now: number): void {
  const d = selfData();
  const s = state.self;
  if (d) {
    hud.setHp(d.hp, d.mhp);
    hud.setDead(d.dead === 1);
    hud.setShield(d.sh ? d.sd : null);
  }
  // The ship you'll launch in sits on the hangar pad.
  const wantParked = map.id === "station" ? state.self?.activeShip ?? null : null;
  if ((parkedShip?.hull ?? null) !== wantParked) {
    if (parkedShip) {
      renderer.scene.remove(parkedShip.model.root);
      disposeModel(parkedShip.model);
      parkedShip = null;
    }
    if (wantParked) {
      const h = HULLS[wantParked];
      const model = buildShip(h.id, h.color, h.accent, null);
      model.root.position.set(LAUNCH_PAD.x, -0.6, LAUNCH_PAD.y);
      model.root.rotation.y = 0;
      renderer.scene.add(model.root);
      parkedShip = { hull: wantParked, model };
    }
  }
  if (s) {
    const cd = CLASSES[s.cls].cooldownMs;
    hud.setCooldown(1 - (now - lastAttackAt) / cd);
  }
  panels.updateCooldowns(now);
  crafting.update(now);
  if (crafting.station && Math.hypot(crafting.station.x - me.x, crafting.station.y - me.y) > STATION_RANGE + 2) crafting.closeStation();
  if (crafting.working && state.selfId) {
    const v = views.get(state.selfId);
    if (v && v.model.attackT <= 0) v.model.attackT = 0.3;
  }
  if (bobber && crafting.fishing) {
    const base = waterLevelAt(crafting.fishing.x, crafting.fishing.y) + 0.06;
    bobber.position.y = crafting.fishing.bite ? base - 0.12 + Math.sin(now / 60) * 0.06 : base + Math.sin(now / 400) * 0.03;
  }
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
    if (map.id === OVERWORLD.id) for (const w of WAYPOINTS) dots.push({ x: w.x, y: w.y, color: state.self?.waypoints.includes(w.id) ? "#d9a6ff" : "#9a94a6", size: 3 });
    if (map.kind === "space") {
      for (const p of POIS) dots.push({ x: p.x, y: p.y, color: p.color, size: Math.max(3, Math.min(9, p.r / 7)) });
      hud.drawMinimap(map, me.x, me.y, me.f, dots, null, 5);
      const near = POIS.find((p) => Math.hypot(p.x - me.x, p.y - me.y) < p.r + 60);
      hud.setZone(near ? `${near.name} · lv ${near.level}` : `Deep space · lv ${map.zoneLevelAt(me.x, me.y)}`);
    } else {
      hud.drawMinimap(map, me.x, me.y, me.f, dots, map.id === OVERWORLD.id ? panels.objective() : null);
      const biome = map.biomeAt(me.x, me.y);
      hud.setZone(map.kind !== "overworld" ? map.name : biome === "town" ? "Hearthmoor" : `${biome} · lv ${map.zoneLevelAt(me.x, me.y)}`);
    }
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
    // Holding F, the mouse button or the touch attack button keeps attacking on cooldown.
    if (!hud.chatFocused && (input.isDown("KeyF") || input.touchAttack || (input.mouseDown && !input.touchMode))) tryAttack(now);
    renderer.target.set(me.x, map.heightAt(me.x, me.y), me.y);
    updateEntities(dt, now, time);
    updateHud(now);
  } else {
    // Title / creator: slowly orbit the plaza around the preview character.
    menuAngle += dt * 0.08;
    renderer.yaw = 0.2 + Math.sin(menuAngle) * 0.35;
    renderer.pitch = 0.16;
    renderer.distance = 8;
    renderer.lookAbove = 4.5;
    // On wide screens the creator card sits on the right, so shift the view to put the
    // preview character in the left half.
    const shift = phase === "create" && innerWidth > 720 ? 2.6 : 0;
    renderer.target.set(MENU_SPOT.x + Math.cos(renderer.yaw) * shift, map.heightAt(MENU_SPOT.x, MENU_SPOT.y), MENU_SPOT.y - Math.sin(renderer.yaw) * shift);
    if (menuPreview) {
      menuPreview.root.rotation.y = renderer.yaw;
      animate(menuPreview, { moving: false, dead: false }, dt, time);
    }
  }

  const focus = phase === "play" ? me : MENU_SPOT;
  updateGhost();
  if (map.kind === "overworld") terrain.update(focus.x, focus.y, loadingHidden ? 2 : 6);
  if (!loadingHidden && terrain.pending === 0) {
    loadingHidden = true;
    document.getElementById("loading")!.classList.add("fade");
  }
  renderer.update(dt, worldTime);
  worldUniforms.uTime.value = time;
  worldUniforms.uNight.value = renderer.night;
  for (const l of cityLights) l.intensity = renderer.night * 6;
  const outdoors = map.kind === "overworld";
  effects.updateBeams(map, focus.x, focus.y, renderer.sunDir, outdoors ? 1 - renderer.night * 1.4 : 0, now);
  effects.updateFireflies(focus.x, focus.y, outdoors ? renderer.night : 0, time);
  if (map.kind === "space") space.update(time, renderer.camera);
  deck?.update(time);
  surface?.update(time);
  effects.update(dt);
  landmarks.update(time);
  if (outdoors) {
    fountains.update(dt, renderer.camera.position.x, renderer.camera.position.z);
    for (const st of STATIONS) {
      if (st.map) continue;
      if (Math.hypot(st.x - me.x, st.y - me.y) > 40 || Math.random() > dt * 14) continue;
      const h = map.heightAt(st.x, st.y) + (st.kind === "campfire" ? 0.5 : 0.7);
      effects.particles.emit(st.x, h, st.y + (st.kind === "forge" ? 0.65 : 0), { n: 1, color: Math.random() < 0.5 ? "#ff9a3c" : "#ffd166", speed: 0.25, up: 1.6, size: 0.07, life: 0.8, gravity: -0.5, spread: 0.3 });
    }
  }
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

