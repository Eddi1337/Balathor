// Milestone 2 end-to-end tests: quests, talents & abilities, mounts, waypoints, emotes, parties
// and trading. Uses DEV_COMMANDS for /tp, /time, /xp and /gold.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Client, sleep, startServer } from "./helpers.mjs";

let srv;
const run = (Date.now() % 1e6).toString(36);
let a;
let b;

before(async () => {
  srv = await startServer({ DEV_COMMANDS: "1" });
  a = new Client(srv.port);
  await a.join(`qa${run}`, `Alda${run.replace(/\d/g, "")}`.slice(0, 15), "ranger");
  await a.chat("/time 0.5");
});

after(() => {
  a?.close();
  b?.close();
  srv?.stop();
});

async function goTo(c, x, y) {
  await c.chat(`/tp ${x.toFixed(1)} ${y.toFixed(1)}`, 1200);
}

async function talkTo(c, defId) {
  let npc;
  for (let i = 0; i < 30 && !npc; i += 1) {
    npc = c.npc(defId);
    if (!npc) await sleep(100);
  }
  assert.ok(npc, `${defId} should be visible`);
  await goTo(c, npc.x, npc.y + 0.8);
  c.send({ t: "talk", id: npc.id });
  await sleep(400);
}

test("the welcome quest: offer, accept, talk to Pip and Brunhild, hand in", async () => {
  await talkTo(a, "npc_rin");
  const offer = await a.wait((m) => m.t === "questOffer" && m.id === "q_welcome", 3000, "quest offer");
  assert.equal(offer.npc, "npc_rin");
  a.send({ t: "questAccept", id: "q_welcome" });
  await a.selfWhere((s) => s.quests.active.some((q) => q.id === "q_welcome"), 3000, "quest active");
  assert.equal(a.self.markers.npc_rin, undefined, "no marker on Rin while the quest is in progress");

  await talkTo(a, "npc_pip");
  await a.selfWhere((s) => s.quests.active.find((q) => q.id === "q_welcome")?.step === 1, 3000, "step 1");
  await talkTo(a, "npc_brunhild");
  await a.selfWhere((s) => s.quests.active.find((q) => q.id === "q_welcome")?.step === 2, 3000, "step 2");
  const goldBefore = a.self.gold;
  a.messages = [];
  await talkTo(a, "npc_rin");
  await a.wait((m) => m.t === "questDone" && m.id === "q_welcome", 3000, "quest done");
  const self = await a.selfWhere((s) => s.quests.done.includes("q_welcome"), 3000, "quest in done list");
  assert.ok(self.gold >= goldBefore + 15, "gold reward paid");
  // The follow-up quest is now offered.
  assert.equal(self.markers.npc_rin, "!", "Rin offers the next quest");
});

test("talents: points from levels, tier rules, learning, hotbar and cooldowns", async () => {
  a.messages = [];
  a.send({ t: "learn", id: "precise_shot" });
  const refused = await a.wait((m) => m.t === "toast", 2000, "no points toast");
  assert.match(refused.text, /No talent points|Requires level/);

  await a.chat("/xp 2500");
  const leveled = await a.selfWhere((s) => s.lv >= 5, 3000, "level up");
  assert.equal(leveled.talentPoints, leveled.lv - 1);

  a.messages = [];
  a.send({ t: "learn", id: "evasion" });
  const order = await a.wait((m) => m.t === "toast", 2000, "tier order toast");
  assert.match(order.text, /Caltrops first/);

  a.send({ t: "learn", id: "precise_shot" });
  const learned = await a.selfWhere((s) => s.talents.includes("precise_shot"), 2000, "learned");
  assert.equal(learned.bar[0], "precise_shot", "auto-placed on the hotbar");

  a.messages = [];
  a.send({ t: "cast", id: "precise_shot", a: 0, x: a.pos.x + 5, y: a.pos.y });
  const cd = await a.wait((m) => m.t === "cd" && m.id === "precise_shot", 2000, "cooldown");
  assert.equal(cd.ms, 6000);
  await a.wait((m) => m.t === "fx" && m.ev.some((e) => e.e === "ability" && e.ab === "precise_shot"), 2000, "ability fx");
  a.messages = [];
  a.send({ t: "cast", id: "precise_shot", a: 0, x: 0, y: 0 });
  await sleep(500);
  assert.ok(!a.messages.some((m) => m.t === "cd"), "second cast during cooldown is refused");

  // Buff abilities show up on the replicated player.
  a.send({ t: "learn", id: "caltrops" });
  a.send({ t: "learn", id: "evasion" });
  await a.selfWhere((s) => s.talents.includes("evasion"), 2000, "evasion learned");
  a.send({ t: "cast", id: "evasion", a: 0, x: 0, y: 0 });
  await a.wait(() => a.entities.get(a.id)?.bf?.includes("evasion"), 2000, "evasion buff visible");
});

test("mounts: buy a pony from Holt, ride it", async () => {
  await a.chat("/gold 400");
  await talkTo(a, "npc_holt");
  const shop = await a.wait((m) => m.t === "shop" && m.shop?.id === "stable", 3000, "stable shop");
  a.send({ t: "buy", shop: shop.shop.id, idx: 0 });
  await a.selfWhere((s) => s.hasMount, 2000, "pony owned");
  assert.ok(!a.self.inv.some((i) => i?.tpl === "mount_pony"), "the pony doesn't take a bag slot");
  a.send({ t: "mount" });
  await a.wait(() => a.entities.get(a.id)?.mt === 1, 2000, "mounted");
  a.send({ t: "mount" });
  await a.wait(() => a.entities.get(a.id)?.mt === 0, 2000, "dismounted");
});

test("waypoints: attune by walking near an obelisk, then travel between them", async () => {
  assert.deepEqual(a.self.waypoints, ["wp_hearthmoor"]);
  await goTo(a, 5, -118);
  const self = await a.selfWhere((s) => s.waypoints.includes("wp_north_road"), 3000, "attuned");
  assert.ok(self.waypoints.includes("wp_north_road"));
  // Head home (monsters roam out there) and travel from the safe plaza obelisk.
  await goTo(a, -4.5, 5.5);
  a.send({ t: "respawn" });
  await sleep(5500); // travel is refused for 5s after taking damage

  const gold = a.self.gold;
  a.messages = [];
  a.send({ t: "travel", id: "wp_north_road" });
  const w = await a.wait((m) => m.t === "welcome", 3000, "travel teleport");
  assert.ok(Math.hypot(w.x - 5, w.y + 118) < 10, `arrived at the north road (${w.x}, ${w.y})`);
  await a.selfWhere((s) => s.gold === gold - 12, 2000, "travel fee paid");
  await goTo(a, 0.5, 4.5);
  a.send({ t: "respawn" });
  await sleep(500);
});

test("parties, party chat, emotes and trading between two players", async () => {
  b = new Client(srv.port);
  const bName = `Bree${run.replace(/\d/g, "")}`.slice(0, 15);
  await b.join(`qb${run}`, bName, "knight");
  await goTo(b, a.pos.x + 1, a.pos.y);
  await goTo(a, a.pos.x, a.pos.y); // refresh

  a.send({ t: "chat", text: `/invite ${bName}` });
  await b.wait((m) => m.t === "partyInvite", 3000, "party invite");
  b.send({ t: "party", op: "accept" });
  const party = await a.wait((m) => m.t === "party" && m.party?.members.length === 2, 3000, "party formed");
  assert.equal(party.party.leader, a.id);
  await sleep(800);
  a.send({ t: "chat", text: "/p hello team" });
  await b.wait((m) => m.t === "chat" && m.text === "hello team" && m.name.startsWith("[Party]"), 3000, "party chat");

  a.send({ t: "emote", id: "wave" });
  await b.wait(() => b.entities.get(a.id)?.em === "wave", 3000, "wave seen by the other player");

  // Trade: A offers its tonics, B offers 5 gold.
  const potionSlot = a.self.inv.findIndex((i) => i?.tpl === "potion_small");
  assert.ok(potionSlot >= 0);
  const bGold = b.self.gold;
  a.send({ t: "trade", op: "request", target: b.id });
  await b.wait((m) => m.t === "tradeRequest", 3000, "trade request");
  b.send({ t: "trade", op: "accept" });
  await a.wait((m) => m.t === "trade" && m.trade, 3000, "trade open");
  a.send({ t: "trade", op: "offer", slot: potionSlot });
  b.send({ t: "trade", op: "gold", gold: 5 });
  await a.wait((m) => m.t === "trade" && m.trade?.me.items.length === 1 && m.trade.them.gold === 5, 3000, "offers visible");
  a.send({ t: "trade", op: "ready" });
  await sleep(200);
  b.send({ t: "trade", op: "ready" });
  await a.wait((m) => m.t === "trade" && m.trade === null, 3000, "trade closed");
  const bAfter = await b.selfWhere((s) => s.inv.some((i) => i?.tpl === "potion_small" && i.qty >= 6), 3000, "B received tonics");
  assert.equal(bAfter.gold, bGold - 5);
  await a.selfWhere((s) => !s.inv.some((i) => i?.tpl === "potion_small"), 3000, "A gave tonics away");

  b.send({ t: "party", op: "leave" });
  await a.wait((m) => m.t === "party" && m.party === null, 3000, "party disbanded");
});

test("villagers follow their routine: at night Pip goes home", async () => {
  await goTo(a, 0.5, 4.5);
  await a.wait(() => a.npc("npc_pip"), 3000, "Pip visible by day");
  await a.chat("/time 0.97", 1500);
  // Pip walks to her cottage and goes inside (disappearing from view).
  await a.wait(() => !a.npc("npc_pip"), 25000, "Pip went home");
  await a.chat("/time 0.5", 1500);
  await a.wait(() => a.npc("npc_pip"), 5000, "Pip back at the shop");
});
