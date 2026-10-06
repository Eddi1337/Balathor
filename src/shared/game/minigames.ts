// Minigames: where they are, what they cost, how they're scored, the trophies they give, and the
// shared helpers both sides need (courses, card hands). The server runs the sessions.

import { doorFront } from "../world/city";
import { findWalkableNear, tileAt } from "../world/overworld";
import { riverAt } from "../world/rivers";
import { Tile } from "../world/tiles";
import { WAYPOINTS } from "./waypoints";
import { LAUNCH_PAD } from "../world/scifi/station";
import { MOORING, PORT_SPAWN } from "../world/sea/ocean";
import { PLANET_PAD } from "../world/scifi/planets";

export type GameId =
  | "darts"
  | "holdem"
  | "memory"
  | "dummy"
  | "ring"
  | "relay"
  | "swim"
  | "wayfarer"
  | "escort"
  | "courier"
  | "fletcher"
  | "vault"
  | "appraiser"
  | "hollow"
  | "pedestal"
  | "bounty"
  | "turret"
  | "lane"
  | "orbital"
  | "rig"
  | "repair";

/** overlay: a little window game · course: reach checkpoints · arena: fight something · service: one click. */
export type GameKind = "overlay" | "course" | "arena" | "service";

export interface GameInfo {
  name: string;
  icon: string;
  kind: GameKind;
  blurb: string;
  cost: number;
  /** Leaderboard ordering and label, if scored. */
  board?: { order: "high" | "low"; unit: string };
  trophy?: { id: string; name: string; icon: string };
}

export const GAMES: Record<GameId, GameInfo> = {
  darts: { name: "Darts", icon: "🎯", kind: "overlay", blurb: "Three darts. Click when the wobbling aim crosses the bullseye.", cost: 2, board: { order: "high", unit: "points" }, trophy: { id: "dart_master", name: "Dart Master", icon: "🎯" } },
  holdem: { name: "Balathor Hold'em", icon: "🃏", kind: "overlay", blurb: "Heads-up poker against the house. Ante 10g, then raise or fold.", cost: 10, board: { order: "high", unit: "gold won" }, trophy: { id: "card_shark", name: "Card Shark", icon: "🃏" } },
  memory: { name: "Memory Tiles", icon: "🀄", kind: "overlay", blurb: "Match all eight pairs in as few flips as you can.", cost: 0, board: { order: "low", unit: "flips" }, trophy: { id: "memory_sage", name: "Memory Sage", icon: "🀄" } },
  dummy: { name: "Training Dummy", icon: "🥊", kind: "arena", blurb: "Thirty seconds. Hit the dummy as hard as you can.", cost: 0, board: { order: "high", unit: "damage" }, trophy: { id: "dummy_crusher", name: "Dummy Crusher", icon: "🥊" } },
  ring: { name: "Ring of Trials", icon: "⭕", kind: "arena", blurb: "Hold the sacred ring for 45 seconds while slimes pour in.", cost: 0, trophy: { id: "ring_warden", name: "Ring Warden", icon: "⭕" } },
  relay: { name: "Perimeter Relay", icon: "🏃", kind: "course", blurb: "Run the city wall: touch all four gates and come back.", cost: 0, board: { order: "low", unit: "seconds" }, trophy: { id: "wall_runner", name: "Wall Runner", icon: "🏃" } },
  swim: { name: "Silverrun Swim Trial", icon: "🏊", kind: "course", blurb: "Swim through the buoys in order. The current helps (downstream).", cost: 0, board: { order: "low", unit: "seconds" }, trophy: { id: "river_otter", name: "River Otter", icon: "🦦" } },
  wayfarer: { name: "Wayfarer's Board", icon: "🧭", kind: "course", blurb: "Visit three far-flung obelisks, then come back.", cost: 0, trophy: { id: "realm_walker", name: "Realm Walker", icon: "🧭" } },
  escort: { name: "Caravan Escort", icon: "🛒", kind: "arena", blurb: "Guard the caravan to the Dune Gate. Bandits ambush on the way!", cost: 0, trophy: { id: "road_warden", name: "Road Warden", icon: "🛒" } },
  courier: { name: "Courier Run", icon: "📦", kind: "course", blurb: "Rush a parcel to Mirewater Crossing before it goes stale.", cost: 0, trophy: { id: "swift_post", name: "Swift Post", icon: "📦" } },
  fletcher: { name: "Fletcher's Crate", icon: "🏹", kind: "course", blurb: "Haul a heavy crate of arrows to Highland Steps. It slows you down!", cost: 0, trophy: { id: "pack_mule", name: "Pack Mule", icon: "🐴" } },
  vault: { name: "Town Vault", icon: "🏦", kind: "service", blurb: "Deposit cursed Heavy Coins (they slow you) for a reward.", cost: 0, trophy: { id: "coin_bearer", name: "Coin Bearer", icon: "🪙" } },
  appraiser: { name: "The Appraiser", icon: "🧐", kind: "overlay", blurb: "Guess what your bag is worth. Within 15% wins a prize.", cost: 0, trophy: { id: "keen_eye", name: "Keen Eye", icon: "🧐" } },
  hollow: { name: "The Hollow Stone", icon: "🪨", kind: "service", blurb: "At night, offer a shiny pebble to the stone. Three times a night.", cost: 0, trophy: { id: "stone_friend", name: "Stone Friend", icon: "🪨" } },
  pedestal: { name: "Trophy Pedestal", icon: "🏆", kind: "service", blurb: "Show off a trophy: it becomes your title.", cost: 0 },
  bounty: { name: "Bounty Board", icon: "📜", kind: "arena", blurb: "A bandit camp is posted. Clear it within two minutes.", cost: 0, trophy: { id: "bounty_hunter", name: "Bounty Hunter", icon: "📜" } },
  turret: { name: "Defence Pad", icon: "🛡️", kind: "arena", blurb: "Hold off waves of drones attacking Ringforge's outer pad.", cost: 0, trophy: { id: "pad_defender", name: "Pad Defender", icon: "🛡️" } },
  lane: { name: "Asteroid Lane", icon: "☄️", kind: "course", blurb: "Fly through the beacon rings. Fast and clean.", cost: 0, board: { order: "low", unit: "seconds" }, trophy: { id: "lane_ace", name: "Lane Ace", icon: "☄️" } },
  orbital: { name: "Orbital Courier", icon: "🛰️", kind: "course", blurb: "Fly a sealed crate to Kestrel Harbor and back to Ringforge.", cost: 0, trophy: { id: "star_post", name: "Star Post", icon: "🛰️" } },
  rig: { name: "Mining Rig", icon: "⛏️", kind: "overlay", blurb: "Pulse the drill when the needle hits the sweet spot.", cost: 0, trophy: { id: "rig_hand", name: "Rig Hand", icon: "⛏️" } },
  repair: { name: "Hull Patching", icon: "🔨", kind: "overlay", blurb: "Hammer each plank home at just the right moment.", cost: 0, trophy: { id: "shipwright", name: "Shipwright", icon: "🔨" } }
};

export const TROPHIES: Record<string, { name: string; icon: string }> = Object.fromEntries(
  Object.values(GAMES)
    .filter((g) => g.trophy)
    .map((g) => [g.trophy!.id, { name: g.trophy!.name, icon: g.trophy!.icon }])
);

export interface Site {
  id: string;
  game: GameId;
  map: string;
  x: number;
  y: number;
}

export const SITE_RANGE = 3;

function walk(x: number, y: number): { x: number; y: number } {
  return findWalkableNear(x, y, 6);
}

const inn = doorFront("inn", 3.2);
const guild = doorFront("guild", 3.2);
const store = doorFront("store", 3.2);
const smithy = doorFront("smithy", 3.2);
const SOUTH_OUT = walk(0.5, 113);
const EAST_OUT = walk(113, 0.5);

export const SITES: Site[] = [
  { id: "darts", game: "darts", map: "overworld", ...walk(inn.x - 3, inn.y + 1) },
  { id: "holdem", game: "holdem", map: "overworld", ...walk(inn.x, inn.y + 2) },
  { id: "memory", game: "memory", map: "overworld", ...walk(inn.x + 3, inn.y + 1) },
  { id: "dummy", game: "dummy", map: "overworld", ...walk(guild.x - 3, guild.y + 1) },
  { id: "pedestal", game: "pedestal", map: "overworld", ...walk(guild.x + 3, guild.y + 1) },
  { id: "wayfarer", game: "wayfarer", map: "overworld", ...walk(store.x - 3, store.y + 2) },
  { id: "appraiser", game: "appraiser", map: "overworld", ...walk(store.x + 3, store.y + 2) },
  { id: "vault", game: "vault", map: "overworld", ...walk(smithy.x + 3, smithy.y + 2) },
  { id: "courier", game: "courier", map: "overworld", ...walk(smithy.x - 3, smithy.y + 2) },
  { id: "relay", game: "relay", map: "overworld", ...walk(SOUTH_OUT.x + 4, SOUTH_OUT.y + 1) },
  { id: "ring", game: "ring", map: "overworld", ...walk(-26, 124) },
  { id: "bounty", game: "bounty", map: "overworld", ...walk(SOUTH_OUT.x - 5, SOUTH_OUT.y + 1) },
  { id: "escort", game: "escort", map: "overworld", ...walk(EAST_OUT.x, EAST_OUT.y + 3) },
  { id: "fletcher", game: "fletcher", map: "overworld", ...walk(-112, 4) },
  { id: "hollow", game: "hollow", map: "overworld", ...walk(140, -60) },
  { id: "swim", game: "swim", map: "overworld", x: 0, y: 0 },
  { id: "turret", game: "turret", map: "space", x: 0, y: -42 },
  { id: "lane", game: "lane", map: "space", x: 40, y: 40 },
  { id: "orbital", game: "orbital", map: "station", x: LAUNCH_PAD.x - 6, y: LAUNCH_PAD.y - 4 },
  { id: "rig", game: "rig", map: "planet:rust", x: PLANET_PAD.x + 7, y: PLANET_PAD.y - 3 },
  { id: "repair", game: "repair", map: "ocean", x: MOORING.x + 3.5, y: 40 }
];

/** Buoys down the Silverrun (west of the city), found by walking down the river's centre line. */
let buoys: { x: number; y: number }[] | null = null;
export function swimBuoys(): { x: number; y: number }[] {
  if (buoys) return buoys;
  let start: { x: number; y: number } | null = null;
  for (let y = -30; y < 60 && !start; y += 1) {
    for (let x = -160; x < -100 && !start; x += 0.5) {
      const r = riverAt(x, y);
      if (r && r.dist < 0.3) start = { x, y };
    }
  }
  const out: { x: number; y: number }[] = [];
  let p = start ?? { x: -130, y: 0 };
  for (let i = 0; i < 6; i += 1) {
    out.push({ x: Math.round(p.x * 2) / 2, y: Math.round(p.y * 2) / 2 });
    const r = riverAt(p.x, p.y);
    if (!r) break;
    let next = { x: p.x + r.dirX * 11, y: p.y + r.dirY * 11 };
    // Re-centre on the channel.
    let best = next;
    let bestD = Infinity;
    for (let s = -4; s <= 4; s += 0.5) {
      const q = { x: next.x - r.dirY * s, y: next.y + r.dirX * s };
      const rq = riverAt(q.x, q.y);
      if (rq && rq.dist < bestD) {
        bestD = rq.dist;
        best = q;
      }
    }
    next = best;
    p = next;
  }
  buoys = out;
  return out;
}

const swimStart = () => {
  const b = swimBuoys()[0];
  // Stand on the bank beside the first buoy.
  for (let r = 2; r < 10; r += 1) {
    for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) {
      const t = tileAt(b.x + dx, b.y + dy);
      if (t === Tile.SAND || t === Tile.MEADOW || t === Tile.GRASS || t === Tile.PATH) return { x: b.x + dx, y: b.y + dy };
    }
  }
  return b;
};
const swimSite = SITES.find((s) => s.id === "swim")!;
Object.assign(swimSite, swimStart());

export const SITES_BY_ID: Record<string, Site> = Object.fromEntries(SITES.map((s) => [s.id, s]));

export interface Checkpoint {
  map: string;
  x: number;
  y: number;
  r: number;
  label: string;
}

/** Fixed courses (wayfarer picks its own random obelisks). */
export function courseFor(game: GameId): Checkpoint[] {
  const ow = (x: number, y: number, label: string, r = 4): Checkpoint => ({ map: "overworld", x, y, r, label });
  switch (game) {
    case "relay":
      return [ow(112, 0.5, "East Gate", 5), ow(0.5, -112, "North Gate", 5), ow(-112, 0.5, "West Gate", 5), ow(0.5, 113, "South Gate", 5)];
    case "swim":
      return swimBuoys().map((b, i) => ow(b.x, b.y, `Buoy ${i + 1}`, 2.6));
    case "courier": {
      const w = WAYPOINTS.find((p) => p.id === "wp_south_road")!;
      return [ow(w.x, w.y, "Mirewater Crossing", 5)];
    }
    case "fletcher": {
      const w = WAYPOINTS.find((p) => p.id === "wp_west_road")!;
      return [ow(w.x, w.y, "Highland Steps", 5)];
    }
    case "lane":
      return [[60, 70], [90, 95], [110, 130], [95, 165], [60, 190], [30, 175], [10, 145], [15, 110]].map(([x, y], i) => ({ map: "space", x, y, r: 5, label: `Ring ${i + 1}` }));
    case "orbital":
      return [
        { map: "space", x: -560, y: -90, r: 24, label: "Kestrel Harbor" },
        { map: "station", x: 32, y: 20, r: 8, label: "Ringforge concourse" }
      ];
    default:
      return [];
  }
}

export const COURSE_TIME_MS: Partial<Record<GameId, number>> = {
  relay: 240_000,
  swim: 180_000,
  wayfarer: 1_200_000,
  courier: 150_000,
  fletcher: 300_000,
  lane: 90_000,
  orbital: 480_000
};

// ── Hold'em ──────────────────────────────────────────────────────────────────

/** Cards are 0-51: rank = c % 13 (0 = deuce … 12 = ace), suit = floor(c / 13). */
export function cardName(c: number): string {
  return "23456789TJQKA"[c % 13] + "♠♥♦♣"[Math.floor(c / 13)];
}

const HAND_NAMES = ["High card", "Pair", "Two pair", "Three of a kind", "Straight", "Flush", "Full house", "Four of a kind", "Straight flush"];

/** Best 5-card score from up to 7 cards (higher is better) and its name. */
export function bestHand(cards: number[]): { score: number; name: string } {
  let best = { score: -1, name: "" };
  const n = cards.length;
  for (let a = 0; a < n; a += 1)
    for (let b = a + 1; b < n; b += 1)
      for (let c = b + 1; c < n; c += 1)
        for (let d = c + 1; d < n; d += 1)
          for (let e = d + 1; e < n; e += 1) {
            const s = score5([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (s.score > best.score) best = s;
          }
  return best;
}

function score5(cs: number[]): { score: number; name: string } {
  const ranks = cs.map((c) => c % 13).sort((x, y) => y - x);
  const flush = cs.every((c) => Math.floor(c / 13) === Math.floor(cs[0] / 13));
  const uniq = [...new Set(ranks)];
  let straightHigh = -1;
  if (uniq.length === 5) {
    if (ranks[0] - ranks[4] === 4) straightHigh = ranks[0];
    else if (ranks[0] === 12 && ranks[1] === 3) straightHigh = 3; // wheel
  }
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.entries()].sort((x, y) => y[1] - x[1] || y[0] - x[0]);
  const kick = groups.map((g) => g[0]);
  let cat = 0;
  if (straightHigh >= 0 && flush) cat = 8;
  else if (groups[0][1] === 4) cat = 7;
  else if (groups[0][1] === 3 && groups[1][1] === 2) cat = 6;
  else if (flush) cat = 5;
  else if (straightHigh >= 0) cat = 4;
  else if (groups[0][1] === 3) cat = 3;
  else if (groups[0][1] === 2 && groups[1][1] === 2) cat = 2;
  else if (groups[0][1] === 2) cat = 1;
  const tie = cat === 4 || cat === 8 ? [straightHigh] : kick;
  let score = cat;
  for (let i = 0; i < 5; i += 1) score = score * 13 + (tie[i] ?? 0);
  return { score, name: HAND_NAMES[cat] };
}

/** Bag appraisal: what the appraiser thinks your bag is worth. */
export const RARITY_VALUE: Record<string, number> = { common: 1, uncommon: 1.5, rare: 2.5, epic: 4, legendary: 7, mythic: 12 };
