"use strict";

const { MINIGAME_SITES, findMinigameSiteNear } = require("./minigameSites.js");

const INTERACT_REACH = 5.85;
const SITE_REACH = 2.35;

function emptyStats() {
  return { trophies: [], scores: {}, flags: {} };
}

function ensureMinigameStats(player) {
  if (!player.minigameStats || typeof player.minigameStats !== "object") {
    player.minigameStats = emptyStats();
  }
  if (!Array.isArray(player.minigameStats.trophies)) {
    player.minigameStats.trophies = [];
  }
  if (!player.minigameStats.scores || typeof player.minigameStats.scores !== "object") {
    player.minigameStats.scores = {};
  }
  if (!player.minigameStats.flags || typeof player.minigameStats.flags !== "object") {
    player.minigameStats.flags = {};
  }
  return player.minigameStats;
}

function sendState(client, session, extra = {}) {
  deps.send(client, {
    type: "minigameState",
    gameId: session.gameId,
    siteId: session.siteId,
    phase: session.phase,
    data: session.data,
    endsAt: session.endsAt || null,
    ...extra
  });
}

function endSession(client, reason, reward = null) {
  const p = client.player;
  if (!p?._minigameSession) return;
  const session = p._minigameSession;
  p._minigameSession = null;
  deps.send(client, {
    type: "minigameEnd",
    gameId: session.gameId,
    reason,
    reward
  });
  if (reward?.chat) {
    deps.pushChat({ kind: "system", name: "Realm", text: reward.chat });
  }
  deps.saveClientCharacter(client);
  deps.broadcastSnapshot();
}

function grantReward(client, { gold = 0, xp = 0, trophy = null, scoreKey = null, scoreValue = null }) {
  const p = client.player;
  if (!p) return;
  const stats = ensureMinigameStats(p);
  if (gold > 0) p.gold = (p.gold || 0) + gold;
  if (xp > 0) deps.awardXp(p, xp);
  if (trophy && !stats.trophies.includes(trophy)) {
    stats.trophies.push(trophy);
  }
  if (scoreKey && Number.isFinite(scoreValue)) {
    const prev = stats.scores[scoreKey] || 0;
    if (scoreValue > prev) stats.scores[scoreKey] = scoreValue;
  }
  deps.saveClientCharacter(client);
}

let deps = null;

function createMinigameSystem(systemDeps) {
  deps = systemDeps;
  return {
    findSiteNear: findMinigameSiteNearForPlayer,
    handleInteract,
    handleAction,
    cancelSession: (client, reason = "cancelled") => endSession(client, reason),
    startShipRepair,
    tick,
    onMobDefeat,
    onChestLoot,
    onAttackDamage,
    onCaravanPassengerTick,
    getWorldEvents,
    ensureMinigameStats,
    serializeMinigameStats
  };
}

function playerWorldId(player) {
  return deps.worldForPosition(player.x, player.y);
}

function findMinigameSiteNearForPlayer(player, message = {}) {
  const worldId = playerWorldId(player);
  const tx = Number(message.x);
  const ty = Number(message.y);
  if (Number.isFinite(tx) && Number.isFinite(ty)) {
    const clickHit = findMinigameSiteNear(tx, ty, SITE_REACH + 0.5, worldId);
    if (clickHit && Math.hypot(player.x - tx, player.y - ty) <= INTERACT_REACH) {
      return clickHit;
    }
  }
  return findMinigameSiteNear(player.x, player.y, SITE_REACH + 0.8, worldId);
}

function handleInteract(client, site) {
  const p = client.player;
  if (!p || !site) return false;

  if (p._minigameSession && p._minigameSession.siteId !== site.id) {
    deps.send(client, { type: "serverMessage", message: "minigame_busy" });
    return true;
  }

  switch (site.gameId) {
    case "darts":
      return startDarts(client, site);
    case "cards":
      return startCards(client, site);
    case "memory":
      return startMemory(client, site);
    case "scavenger":
      if (site.visitKey) return visitScavengerMarker(client, site);
      return startScavenger(client, site);
    case "training":
      return startTraining(client, site);
    case "consecration":
      return startConsecration(client, site);
    case "vault":
      return depositVault(client, site);
    case "appraisal":
      return startAppraisal(client, site);
    case "courier":
      return interactCourier(client, site);
    case "caravan_escort":
      return startCaravanEscort(client, site);
    case "seasonal":
      return startSeasonal(client, site);
    case "trophy":
      return placeTrophy(client, site);
    case "relay":
      return touchRelay(client, site);
    case "swim":
      return touchSwimBuoy(client, site);
    case "delivery":
      if (site.deliveryDrop) return tryDeliveryDrop(client, site);
      return startDelivery(client, site);
    case "camp_bounty":
      return startCampBounty(client, site);
    case "turret":
      return startTurret(client, site);
    case "asteroid":
      return startAsteroid(client, site);
    case "mining":
      return startMining(client, site);
    case "tech_dungeon":
      return touchDungeonTerminal(client, site);
    default:
      return false;
  }
}

function handleAction(client, message) {
  const p = client.player;
  if (!p?._minigameSession) {
    deps.send(client, { type: "serverMessage", message: "minigame_none" });
    return;
  }
  const session = p._minigameSession;
  const action = String(message.action || "").slice(0, 32);

  switch (session.gameId) {
    case "darts":
      if (action === "throw") return dartsThrow(client, message);
      break;
    case "cards":
      if (action === "draw") return cardsDraw(client);
      break;
    case "memory":
      if (action === "flip") return memoryFlip(client, message);
      break;
    case "appraisal":
      if (action === "guess") return appraisalGuess(client, message);
      break;
    case "mining":
      if (action === "pulse") return miningPulse(client, message);
      break;
    case "lockpick":
      if (action === "tap") return lockpickTap(client, message);
      break;
    case "ship_repair":
      if (action === "place_plank") return shipRepairPlacePlank(client, message);
      break;
    default:
      break;
  }
  if (action === "cancel") {
    endSession(client, "cancelled");
    return;
  }
}

// ── Individual games ─────────────────────────────────────────────────────────

function startDarts(client, site) {
  const p = client.player;
  if ((p.gold || 0) < 2) {
    deps.send(client, { type: "serverMessage", message: "minigame_need_gold", amount: 2 });
    return true;
  }
  p.gold -= 2;
  p._minigameSession = {
    gameId: "darts",
    siteId: site.id,
    phase: "aim",
    data: { throwsLeft: 3, total: 0 },
    startedAt: Date.now(),
    endsAt: Date.now() + 120000
  };
  sendState(client, p._minigameSession);
  deps.pushChat({ kind: "system", name: "Realm", text: "You chalk your fingers and take aim at the dart board." });
  deps.saveClientCharacter(client);
  return true;
}

function dartsThrow(client, message) {
  const session = client.player._minigameSession;
  if (!session || session.gameId !== "darts") return;
  const angle = Number(message.angle);
  const power = Math.max(0, Math.min(1, Number(message.power) || 0.5));
  const bullDist = Math.abs(((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI) / Math.PI;
  const ring = bullDist < 0.08 && power > 0.55 ? 50 : bullDist < 0.2 ? 25 : bullDist < 0.38 ? 15 : bullDist < 0.55 ? 10 : 5;
  session.data.throwsLeft -= 1;
  session.data.total += ring;
  session.phase = session.data.throwsLeft > 0 ? "aim" : "done";
  sendState(client, session, { lastRing: ring });
  if (session.data.throwsLeft <= 0) {
    const bonus = Math.round(session.data.total * 0.4);
    grantReward(client, { gold: bonus, scoreKey: "darts", scoreValue: session.data.total, trophy: session.data.total >= 100 ? "dart_master" : null });
    endSession(client, "complete", { chat: `Dart round over — ${session.data.total} points. You earn ${bonus} gold.`, gold: bonus });
  }
}

function startCards(client, site) {
  const p = client.player;
  if ((p.gold || 0) < 5) {
    deps.send(client, { type: "serverMessage", message: "minigame_need_gold", amount: 5 });
    return true;
  }
  p.gold -= 5;
  const deck = [];
  for (let i = 2; i <= 14; i += 1) deck.push(i);
  const draw = () => deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
  p._minigameSession = {
    gameId: "cards",
    siteId: site.id,
    phase: "ready",
    data: { playerCard: null, pot: 10 },
    startedAt: Date.now(),
    endsAt: Date.now() + 90000,
    _deck: deck,
    _draw: draw
  };
  sendState(client, p._minigameSession);
  deps.pushChat({ kind: "system", name: "Realm", text: "You slide five gold into the pot at the card table." });
  deps.saveClientCharacter(client);
  return true;
}

function cardsDraw(client) {
  const session = client.player._minigameSession;
  if (!session || session.gameId !== "cards") return;
  const playerCard = session._draw();
  const dealerCard = session._draw();
  let gold = 0;
  let chat = "";
  if (playerCard > dealerCard) {
    gold = session.data.pot + playerCard;
    chat = `You reveal ${playerCard} against the house ${dealerCard} — pot won!`;
    grantReward(client, { gold, trophy: playerCard >= 13 ? "card_shark" : null });
  } else if (playerCard === dealerCard) {
    gold = 5;
    chat = `A tie at ${playerCard} — your ante returns.`;
    client.player.gold += 5;
  } else {
    chat = `House shows ${dealerCard} over your ${playerCard} — gold lost.`;
  }
  endSession(client, "complete", { chat, gold });
}

function startMemory(client, site) {
  const p = client.player;
  const icons = ["⚔", "🏹", "✦", "♛", "⚗", "🛡", "☘", "✸"];
  const pairs = [...icons, ...icons];
  for (let i = pairs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  p._minigameSession = {
    gameId: "memory",
    siteId: site.id,
    phase: "play",
    data: { cards: pairs.map((v, i) => ({ i, v, up: false, matched: false })), flipped: [], moves: 0, matched: 0 },
    startedAt: Date.now(),
    endsAt: Date.now() + 180000
  };
  sendState(client, p._minigameSession, { hideValues: true });
  deps.pushChat({ kind: "system", name: "Realm", text: "You lay out enchanted tiles on the pub table." });
  return true;
}

function memoryFlip(client, message) {
  const session = client.player._minigameSession;
  if (!session || session.gameId !== "memory") return;
  const idx = Math.floor(Number(message.index));
  const cards = session.data.cards;
  if (!Number.isFinite(idx) || idx < 0 || idx >= cards.length) return;
  const card = cards[idx];
  if (card.matched || card.up || session.data.flipped.length >= 2) return;
  card.up = true;
  session.data.flipped.push(idx);
  session.data.moves += 1;
  if (session.data.flipped.length === 2) {
    const [a, b] = session.data.flipped;
    if (cards[a].v === cards[b].v) {
      cards[a].matched = true;
      cards[b].matched = true;
      session.data.matched += 1;
      session.data.flipped = [];
    } else {
      setTimeout(() => {
        if (!client.player?._minigameSession || client.player._minigameSession !== session) return;
        cards[a].up = false;
        cards[b].up = false;
        session.data.flipped = [];
        sendState(client, session, { hideValues: true });
      }, 700);
    }
  }
  sendState(client, session, { hideValues: session.data.flipped.length < 2 });
  if (session.data.matched >= 8) {
    const gold = Math.max(8, 24 - session.data.moves);
    grantReward(client, { gold, trophy: "memory_sage", scoreKey: "memory_moves", scoreValue: 1000 - session.data.moves });
    endSession(client, "complete", { chat: `All pairs matched in ${session.data.moves} moves — ${gold} gold.`, gold });
  }
}

function startScavenger(client, site) {
  const p = client.player;
  const stats = ensureMinigameStats(p);
  if (stats.flags.scavengerActive) {
    deps.pushChat({ kind: "system", name: "Realm", text: "Your hunt is already underway — visit the marked realms." });
    return true;
  }
  stats.flags.scavengerActive = true;
  stats.flags.scavengerVisits = {};
  p._minigameSession = {
    gameId: "scavenger",
    siteId: site.id,
    phase: "hunt",
    data: { need: ["oasis", "frost", "ember"], visits: {} },
    startedAt: Date.now(),
    endsAt: Date.now() + 600000
  };
  sendState(client, p._minigameSession);
  deps.pushChat({ kind: "system", name: "Realm", text: "The wayfarer's board lists Oasis, Frost, and Ember — find each realm marker." });
  deps.saveClientCharacter(client);
  return true;
}

function visitScavengerMarker(client, site) {
  const p = client.player;
  const stats = ensureMinigameStats(p);
  if (!stats.flags.scavengerActive) {
    deps.send(client, { type: "serverMessage", message: "minigame_start_at_board" });
    return true;
  }
  const key = site.visitKey;
  stats.flags.scavengerVisits = stats.flags.scavengerVisits || {};
  stats.flags.scavengerVisits[key] = true;
  const need = ["oasis", "frost", "ember"];
  const done = need.every((k) => stats.flags.scavengerVisits[k]);
  deps.pushChat({ kind: "system", name: "Realm", text: `You mark ${key} on the wayfarer's slate.` });
  if (done) {
    stats.flags.scavengerActive = false;
    grantReward(client, { gold: 40, xp: 60, trophy: "realm_walker" });
    endSession(client, "complete", { chat: "Biome hunt complete — 40 gold and experience.", gold: 40 });
  } else {
    deps.saveClientCharacter(client);
  }
  return true;
}

function startTraining(client, site) {
  const p = client.player;
  p._minigameSession = {
    gameId: "training",
    siteId: site.id,
    phase: "strike",
    data: { damage: 0, endsAt: Date.now() + 30000 },
    startedAt: Date.now(),
    endsAt: Date.now() + 30000
  };
  sendState(client, p._minigameSession);
  deps.pushChat({ kind: "system", name: "Realm", text: "The straw dummy creaks — strike it for thirty seconds." });
  return true;
}

function startConsecration(client, site) {
  const p = client.player;
  if (p.classId !== "knight") {
    deps.send(client, { type: "serverMessage", message: "minigame_knight_only" });
    return true;
  }
  const cx = site.x + 1.5;
  const cy = site.y + 1.5;
  p._minigameSession = {
    gameId: "consecration",
    siteId: site.id,
    phase: "hold",
    data: { cx, cy, radius: 2.2, seconds: 0 },
    startedAt: Date.now(),
    endsAt: Date.now() + 45000
  };
  sendState(client, p._minigameSession);
  deps.pushChat({ kind: "system", name: "Realm", text: "You trace a sanctum circle — hold it against the tide." });
  return true;
}

function depositVault(client, site) {
  const p = client.player;
  if (!p._heavyCoin) {
    deps.send(client, { type: "serverMessage", message: "minigame_no_coin" });
    return true;
  }
  p._heavyCoin = false;
  p.stats = p.stats || {};
  p.stats.speed = Math.max(1, (p.stats.speed || 1));
  grantReward(client, { gold: 25, trophy: "coin_bearer" });
  deps.pushChat({ kind: "system", name: "Realm", text: "The vault accepts the heavy coin — your stride lightens." });
  deps.saveClientCharacter(client);
  deps.broadcastSnapshot();
  return true;
}

function startAppraisal(client, site) {
  const p = client.player;
  let value = 0;
  for (const item of p.inventory || []) {
    if (!item) continue;
    value += (item.value || 5) + (item.rarity === "legendary" ? 40 : item.rarity === "epic" ? 20 : item.rarity === "rare" ? 8 : 0);
  }
  const secret = Math.max(5, Math.round(value * (0.85 + Math.random() * 0.3)));
  p._minigameSession = {
    gameId: "appraisal",
    siteId: site.id,
    phase: "guess",
    data: { secret },
    startedAt: Date.now(),
    endsAt: Date.now() + 60000
  };
  sendState(client, p._minigameSession);
  deps.pushChat({ kind: "system", name: "Realm", text: "The appraiser eyes your pack — guess its worth (send guess via game)." });
  return true;
}

function appraisalGuess(client, message) {
  const session = client.player._minigameSession;
  if (!session || session.gameId !== "appraisal") return;
  const guess = Math.max(0, Math.floor(Number(message.value) || 0));
  const diff = Math.abs(guess - session.data.secret);
  let gold = 0;
  let chat = "";
  if (diff <= 5) {
    gold = 30;
    chat = "Spot on — the appraiser tosses you a heavy purse.";
    grantReward(client, { gold, trophy: "appraiser" });
  } else if (diff <= 15) {
    gold = 12;
    chat = "Close enough — a modest tip.";
    grantReward(client, { gold });
  } else {
    chat = `Off by ${diff} — better luck next market day.`;
  }
  endSession(client, "complete", { chat, gold });
}

function interactCourier(client, site) {
  const p = client.player;
  const stats = ensureMinigameStats(p);
  if (!stats.flags.courierPackage) {
    if (site.id === "mg_courier_hub") {
      stats.flags.courierPackage = "hub";
      stats.flags.courierStage = 0;
      deps.pushChat({ kind: "system", name: "Realm", text: "You hoist a sealed courier crate — deliver it through the stargate to orbit." });
      deps.saveClientCharacter(client);
      return true;
    }
    deps.send(client, { type: "serverMessage", message: "minigame_no_package" });
    return true;
  }
  if (site.id === "mg_courier_sci" && stats.flags.courierStage === 0) {
    stats.flags.courierStage = 1;
    deps.pushChat({ kind: "system", name: "Realm", text: "Orbital customs stamp the crate — return through the gate to the hub." });
    deps.saveClientCharacter(client);
    return true;
  }
  if (site.id === "mg_courier_hub" && stats.flags.courierStage === 1) {
    stats.flags.courierPackage = false;
    stats.flags.courierStage = 0;
    grantReward(client, { gold: 55, xp: 80, trophy: "star_courier" });
    deps.pushChat({ kind: "system", name: "Realm", text: "Courier run complete — payment received." });
    deps.saveClientCharacter(client);
    return true;
  }
  deps.send(client, { type: "serverMessage", message: "minigame_courier_wrong_stop" });
  return true;
}

function startCaravanEscort(client, site) {
  const p = client.player;
  if ((p.gold || 0) < 3) {
    deps.send(client, { type: "serverMessage", message: "minigame_need_gold", amount: 3 });
    return true;
  }
  p.gold -= 3;
  p._caravanEscortUntil = Date.now() + 300000;
  deps.pushChat({ kind: "system", name: "Realm", text: "You sign an escort charter — ride a caravan and fend off ambushes." });
  deps.saveClientCharacter(client);
  return true;
}

function startSeasonal(client, site) {
  const hour = deps.getWorldHour();
  if (hour >= 6 && hour < 22) {
    deps.send(client, { type: "serverMessage", message: "minigame_night_only" });
    return true;
  }
  const p = client.player;
  if ((p.gold || 0) < 1) {
    deps.send(client, { type: "serverMessage", message: "minigame_need_gold", amount: 1 });
    return true;
  }
  p.gold -= 1;
  const token = (ensureMinigameStats(p).flags.hollowTokens || 0) + 1;
  ensureMinigameStats(p).flags.hollowTokens = token;
  if (token >= 3) {
    ensureMinigameStats(p).flags.hollowTokens = 0;
    grantReward(client, { gold: 35, xp: 50, trophy: "hollow_warden" });
    deps.pushChat({ kind: "system", name: "Realm", text: "The hollow stone drinks your offering and blooms with pale light — a reward coalesces." });
  } else {
    deps.pushChat({ kind: "system", name: "Realm", text: `The stone hums (${token}/3 offerings this night).` });
  }
  deps.saveClientCharacter(client);
  return true;
}

function placeTrophy(client, site) {
  const p = client.player;
  const stats = ensureMinigameStats(p);
  if (!stats.trophies.length) {
    deps.send(client, { type: "serverMessage", message: "minigame_no_trophy" });
    return true;
  }
  const name = stats.trophies[stats.trophies.length - 1];
  stats.flags.displayedTrophy = name;
  deps.pushChat({ kind: "system", name: "Realm", text: `You set the "${name}" trophy upon the pedestal.` });
  deps.saveClientCharacter(client);
  deps.broadcastSnapshot();
  return true;
}

function touchRelay(client, site) {
  const p = client.player;
  const idx = site.relayIndex ?? 0;
  p._relayProgress = p._relayProgress || { next: 0, startedAt: Date.now() };
  if (idx !== p._relayProgress.next) {
    const need = p._relayProgress.next + 1;
    deps.pushChat({
      kind: "system",
      name: "Realm",
      text: `Wrong checkpoint — touch post ${need} of 4 next (run the town perimeter ring clockwise from the northwest post).`
    });
    return true;
  }
  p._relayProgress.next += 1;
  if (p._relayProgress.next >= 4) {
    grantReward(client, { gold: 20, xp: 30, trophy: "relay_runner", scoreKey: "relay_time", scoreValue: Date.now() - p._relayProgress.startedAt });
    p._relayProgress = null;
    deps.pushChat({ kind: "system", name: "Realm", text: "Perimeter relay complete — you collect the runner's purse." });
    deps.saveClientCharacter(client);
    deps.broadcastSnapshot();
  } else {
    const labels = ["northwest", "east avenue", "southeast lawn", "south gate"];
    const nextLabel = labels[p._relayProgress.next] || "next post";
    deps.pushChat({
      kind: "system",
      name: "Realm",
      text: `Checkpoint ${idx + 1}/4 logged — run to the ${nextLabel} ring.`
    });
  }
  return true;
}

function touchSwimBuoy(client, site) {
  const p = client.player;
  if (!deps.isSwimmingAt(p.x, p.y)) {
    deps.send(client, { type: "serverMessage", message: "minigame_swim_only" });
    return true;
  }
  const idx = site.swimIndex ?? 0;
  p._swimProgress = p._swimProgress || { next: 0, startedAt: Date.now() };
  if (idx !== p._swimProgress.next) {
    deps.pushChat({ kind: "system", name: "Realm", text: "Touch the buoys in order while swimming." });
    return true;
  }
  p._swimProgress.next += 1;
  if (p._swimProgress.next >= 4) {
    grantReward(client, { gold: 18, xp: 25, trophy: "river_fin", scoreKey: "swim_time", scoreValue: Date.now() - p._swimProgress.startedAt });
    p._swimProgress = null;
    deps.pushChat({ kind: "system", name: "Realm", text: "Swim trial complete — you haul yourself ashore, richer." });
  } else {
    deps.pushChat({ kind: "system", name: "Realm", text: `Buoy ${idx + 1} tagged — keep swimming.` });
  }
  deps.saveClientCharacter(client);
  return true;
}

function startDelivery(client, site) {
  const p = client.player;
  if (p._deliveryCrate) {
    deps.pushChat({ kind: "system", name: "Realm", text: "You already carry a fletcher crate — deliver it to Oasis." });
    return true;
  }
  p._deliveryCrate = true;
  p.stats = p.stats || {};
  p._deliverySpeedPenalty = (p.stats.speed || 1) * 0.75;
  deps.pushChat({ kind: "system", name: "Realm", text: "You shoulder a crate of arrows — the weight slows you (reach Oasis drop)." });
  deps.saveClientCharacter(client);
  deps.broadcastSnapshot();
  return true;
}

function tryDeliveryDrop(client, site) {
  const p = client.player;
  if (!p._deliveryCrate) {
    deps.send(client, { type: "serverMessage", message: "minigame_no_crate" });
    return true;
  }
  p._deliveryCrate = false;
  p._deliverySpeedPenalty = null;
  grantReward(client, { gold: 22, xp: 35 });
  deps.pushChat({ kind: "system", name: "Realm", text: "Crate delivered — the fletcher pays you well." });
  deps.saveClientCharacter(client);
  deps.broadcastSnapshot();
  return true;
}

function startCampBounty(client, site) {
  const p = client.player;
  const camp = deps.getCampById(site.campId);
  if (!camp) return false;
  p._minigameSession = {
    gameId: "camp_bounty",
    siteId: site.id,
    phase: "clear",
    data: { campId: site.campId, kills: 0, need: 6, cx: camp.x, cy: camp.y, radius: 14 },
    startedAt: Date.now(),
    endsAt: Date.now() + 90000
  };
  sendState(client, p._minigameSession);
  deps.pushChat({ kind: "system", name: "Realm", text: `Camp bounty posted — clear ${site.campId} within ninety seconds.` });
  return true;
}

function startTurret(client, site) {
  const p = client.player;
  p._minigameSession = {
    gameId: "turret",
    siteId: site.id,
    phase: "defend",
    data: { wave: 0, kills: 0, need: 8 },
    startedAt: Date.now(),
    endsAt: Date.now() + 120000
  };
  globalMinigameEvents.turretPad = { x: site.x + 1.5, y: site.y + 1.5, until: Date.now() + 120000 };
  sendState(client, p._minigameSession);
  deps.pushChat({ kind: "system", name: "Realm", text: "Defense pad online — hostiles inbound!" });
  return true;
}

function startAsteroid(client, site) {
  const p = client.player;
  const ship = deps.getOwnedShip(p);
  if (!ship?.boarded) {
    deps.send(client, { type: "serverMessage", message: "minigame_need_ship" });
    return true;
  }
  p._minigameSession = {
    gameId: "asteroid",
    siteId: site.id,
    phase: "fly",
    data: { checkpoints: [{ x: 2008, y: -28 }, { x: 2036, y: -52 }, { x: 2068, y: -24 }], next: 0, damageTaken: 0 },
    startedAt: Date.now(),
    endsAt: Date.now() + 90000
  };
  sendState(client, p._minigameSession);
  deps.pushChat({ kind: "system", name: "Realm", text: "Lane beacons lit — fly the asteroid corridor without hull breaches." });
  return true;
}

function startMining(client, site) {
  const p = client.player;
  p._minigameSession = {
    gameId: "mining",
    siteId: site.id,
    phase: "beam",
    data: { progress: 0, sweetAt: Date.now() + 800 + Math.floor(Math.random() * 2200) },
    startedAt: Date.now(),
    endsAt: Date.now() + 45000
  };
  sendState(client, p._minigameSession);
  deps.pushChat({ kind: "system", name: "Realm", text: "Mining rig whines — pulse the beam on the sweet spot." });
  return true;
}

function startShipRepair(client, ship, station) {
  const p = client.player;
  if (!p || !ship || !station) return false;
  const maxHealth = Math.max(1, Number(deps.getShipMaxHealth?.(ship)) || Number(ship.maxHealth) || 1);
  if ((Number(ship.health) || 0) >= maxHealth) {
    deps.send(client, { type: "serverMessage", message: "ship_repair_full" });
    return true;
  }
  p._minigameSession = {
    gameId: "ship_repair",
    siteId: `ship:${ship.id}:repair`,
    phase: "planking",
    data: {
      shipId: ship.id,
      stationId: station.id,
      planks: 0,
      need: 5,
      sweetAt: Date.now() + 550 + Math.floor(Math.random() * 900),
      hull: Math.round(Number(ship.health) || 0),
      maxHull: Math.round(maxHealth)
    },
    startedAt: Date.now(),
    endsAt: Date.now() + 45000
  };
  sendState(client, p._minigameSession);
  deps.pushChat({ kind: "system", name: "Realm", text: "Repair station ready — time the planks against the damaged hull." });
  return true;
}

function shipRepairPlacePlank(client, message) {
  const p = client.player;
  const session = p?._minigameSession;
  if (!session || session.gameId !== "ship_repair") return;
  const ship = deps.getShipById?.(session.data.shipId) || p.ship;
  if (!ship || !p.ship?.boarded || (p.shipStationRole || p.ship?.stationRole) !== "repair") {
    endSession(client, "cancelled", { chat: "Repair interrupted." });
    return;
  }
  const now = Date.now();
  const accuracy = Math.abs(now - Number(session.data.sweetAt || 0));
  const good = accuracy <= 260;
  const ok = accuracy <= 520;
  const heal = good ? 18 : ok ? 10 : 4;
  const maxHealth = Math.max(1, Number(deps.getShipMaxHealth?.(ship)) || Number(ship.maxHealth) || 1);
  ship.health = Math.min(maxHealth, (Number(ship.health) || 0) + heal);
  session.data.planks += good ? 1 : ok ? 0.75 : 0.35;
  session.data.last = good ? "flush" : ok ? "crooked" : "loose";
  session.data.sweetAt = now + 650 + Math.floor(Math.random() * 950);
  session.data.hull = Math.round(Number(ship.health) || 0);
  session.data.maxHull = Math.round(maxHealth);
  sendState(client, session);
  deps.broadcastSnapshot();
  if (ship.health >= maxHealth || session.data.planks >= session.data.need) {
    endSession(client, "complete", { chat: `Repair complete — hull restored to ${Math.round(ship.health)}/${Math.round(maxHealth)}.` });
  }
}

function miningPulse(client, message) {
  const session = client.player._minigameSession;
  if (!session || session.gameId !== "mining") return;
  const now = Date.now();
  const onSweet = Math.abs(now - session.data.sweetAt) < 320;
  session.data.progress += onSweet ? 22 : 8;
  session.data.sweetAt = now + 700 + Math.floor(Math.random() * 1800);
  sendState(client, session);
  if (session.data.progress >= 100) {
    grantReward(client, { gold: 28, xp: 40, trophy: "rust_digger" });
    endSession(client, "complete", { chat: "Ore canister full — sold to orbital refineries for 28 gold.", gold: 28 });
  }
}

function touchDungeonTerminal(client, site) {
  const p = client.player;
  const idx = site.dungeonIndex ?? 0;
  p._dungeonProgress = p._dungeonProgress || { next: 0, startedAt: Date.now() };
  if (idx !== p._dungeonProgress.next) {
    deps.pushChat({ kind: "system", name: "Realm", text: "Terminals must be synced in sequence — find the next hatch." });
    return true;
  }
  p._dungeonProgress.next += 1;
  if (p._dungeonProgress.next >= 3) {
    grantReward(client, { gold: 45, xp: 70, trophy: "ringforge_tech" });
    p._dungeonProgress = null;
    deps.pushChat({ kind: "system", name: "Realm", text: "All hatches stabilized — emergency lock disengaged." });
  } else {
    deps.pushChat({ kind: "system", name: "Realm", text: `Terminal ${idx + 1} synced — ${3 - p._dungeonProgress.next} remain.` });
  }
  deps.saveClientCharacter(client);
  return true;
}

// ── Hooks ────────────────────────────────────────────────────────────────────

const globalMinigameEvents = { turretPad: null };

function getWorldEvents() {
  const out = [];
  if (globalMinigameEvents.turretPad && globalMinigameEvents.turretPad.until > Date.now()) {
    out.push({ kind: "turret_pad", ...globalMinigameEvents.turretPad });
  }
  return out;
}

function onMobDefeat(client, mob) {
  const p = client?.player;
  if (!p) return;
  const session = p._minigameSession;
  if (session?.gameId === "camp_bounty" && session.data.campId) {
    const d = session.data;
    if (Math.hypot(mob.x - d.cx, mob.y - d.cy) <= d.radius) {
      d.kills += 1;
      sendState(client, session);
      if (d.kills >= d.need) {
        grantReward(client, { gold: 35, xp: 55, trophy: "camp_clearer" });
        endSession(client, "complete", { chat: "Camp cleared — bounty paid.", gold: 35 });
      }
    }
  }
  if (session?.gameId === "turret") {
    session.data.kills += 1;
    sendState(client, session);
    if (session.data.kills >= session.data.need) {
      grantReward(client, { gold: 40, xp: 60, trophy: "pad_defender" });
      globalMinigameEvents.turretPad = null;
      endSession(client, "complete", { chat: "Defense pad secured.", gold: 40 });
    }
  }
}

function onChestLoot(client, chest) {
  if (Math.random() > 0.12) return;
  const p = client.player;
  p._heavyCoin = true;
  deps.send(client, { type: "minigameDebuff", debuff: "heavy_coin" });
  deps.pushChat({ kind: "system", name: "Realm", text: "A curse clings to the loot — a heavy coin slows you. Deposit it at the town vault." });
  deps.saveClientCharacter(client);
  if (!p._minigameSession) {
    const seq = [0, 1, 2, 3][Math.floor(Math.random() * 4)];
    p._minigameSession = {
      gameId: "lockpick",
      siteId: chest.id,
      phase: "rhythm",
      data: { sequence: seq, step: 0 },
      startedAt: Date.now(),
      endsAt: Date.now() + 15000
    };
    sendState(client, p._minigameSession);
  }
}

function lockpickTap(client, message) {
  const session = client.player._minigameSession;
  if (!session || session.gameId !== "lockpick") return;
  const key = Math.floor(Number(message.key));
  if (key !== session.data.sequence[session.data.step]) {
    endSession(client, "failed", { chat: "Lock resists — chest already looted." });
    return;
  }
  session.data.step += 1;
  sendState(client, session);
  if (session.data.step >= session.data.sequence.length) {
    grantReward(client, { gold: 8 });
    endSession(client, "complete", { chat: "Lock clicks — bonus latch yields extra gold.", gold: 8 });
  }
}

function onAttackDamage(client, damage, targetKind, targetX, targetY) {
  const p = client.player;
  const session = p?._minigameSession;
  if (session?.gameId === "training" && targetKind === "dummy") {
    session.data.damage += damage;
    sendState(client, session);
    if (Date.now() >= (session.endsAt || session.data?.endsAt || 0)) {
      const gold = Math.min(40, Math.round(session.data.damage / 8));
      grantReward(client, { gold, scoreKey: "training_dps", scoreValue: session.data.damage, trophy: session.data.damage > 200 ? "yard_master" : null });
      endSession(client, "complete", { chat: `Training done — ${session.data.damage} damage, ${gold} gold.`, gold });
    }
  }
}

function onCaravanPassengerTick(client, caravan) {
  const p = client.player;
  if (!p?._caravanEscortUntil || Date.now() > p._caravanEscortUntil) return;
  if (!p._caravanRiding) return;
  if (Math.random() > 0.02) return;
  deps.spawnEscortAmbush(caravan.x, caravan.y);
}

function tick(now) {
  for (const client of deps.clients.values()) {
    const p = client.player;
    if (!p) continue;

    const session = p._minigameSession;
    if (session?.endsAt && now > session.endsAt) {
      endSession(client, "timeout", { chat: "Time expired — activity ends." });
      continue;
    }

    if (session?.gameId === "consecration") {
      const d = session.data;
      const inside = Math.hypot(p.x - d.cx, p.y - d.cy) <= d.radius;
      if (inside) {
        d.seconds += 1 / deps.tickRate;
        if (d.seconds >= 25) {
          grantReward(client, { gold: 30, xp: 45, trophy: "sanctum_keeper" });
          endSession(client, "complete", { chat: "You held the sanctum — the circle rewards you.", gold: 30 });
        }
      } else {
        d.seconds = Math.max(0, d.seconds - 2 / deps.tickRate);
      }
      if (now % 500 < 20) sendState(client, session);
    }

    if (session?.gameId === "asteroid" && p.ship?.boarded) {
      const d = session.data;
      const cp = d.checkpoints[d.next];
      if (cp && Math.hypot(p.x - cp.x, p.y - cp.y) < 3.5) {
        d.next += 1;
        deps.pushChat({ kind: "system", name: "Realm", text: `Beacon ${d.next} passed.` });
        if (d.next >= d.checkpoints.length) {
          grantReward(client, { gold: 50, xp: 65, trophy: "lane_ace" });
          endSession(client, "complete", { chat: "Asteroid lane cleared — prize wired to your account.", gold: 50 });
        } else {
          sendState(client, session);
        }
      }
    }

    if (p._deliveryCrate && p._deliverySpeedPenalty && p.stats) {
      p.stats.speed = Math.min(p.stats.speed || 1, p._deliverySpeedPenalty);
    }
  }

  if (globalMinigameEvents.turretPad && globalMinigameEvents.turretPad.until <= now) {
    globalMinigameEvents.turretPad = null;
  }

  // Spawn turret defense mobs periodically
  const pad = globalMinigameEvents.turretPad;
  if (pad && Math.random() < 0.015) {
    deps.spawnEscortAmbush(pad.x, pad.y);
  }
}

function serializeMinigameStats(player) {
  const stats = ensureMinigameStats(player);
  return {
    trophies: [...stats.trophies],
    scores: { ...stats.scores },
    flags: {
      displayedTrophy: stats.flags.displayedTrophy || null,
      hollowTokens: stats.flags.hollowTokens || 0
    }
  };
}

module.exports = {
  createMinigameSystem,
  MINIGAME_SITES
};
