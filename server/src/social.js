/**
 * Friends list, parties, and player-to-player trades (server-authoritative).
 * Wired from index.js via createSocialSystem(api).
 */

const MAX_PARTY = 8;
const MAX_FRIENDS = 80;
const PARTY_JOIN_RANGE = 7.5;
const TRADE_RANGE = 5.5;
const TRADE_SLOTS = 6;

/**
 * @param {object} api
 * @param {Map} api.clients
 * @param {object} api.accountStore
 * @param {() => void} api.saveAccountStore
 * @param {() => void} api.broadcastSnapshot
 * @param {(c: object, m: object) => void} api.send
 * @param {(player: object, item: object) => boolean} api.addItemToInventory
 * @param {(o: object) => object} api.cloneItem
 * @param {number} api.INVENTORY_SIZE
 * @param {(c: object) => void} api.saveClientCharacter
 */
function createSocialSystem(api) {
  const {
    clients,
    accountStore,
    saveAccountStore,
    broadcastSnapshot,
    send,
    addItemToInventory,
    cloneItem,
    INVENTORY_SIZE,
    saveClientCharacter
  } = api;

  /** @type {Map<string, { id: string, leaderKey: string, members: Set<string> }>} */
  const parties = new Map();
  /** @type {Map<string, string>} accountKey -> partyId */
  const accountParty = new Map();

  /** @type {Map<string, { aKey: string, bKey: string, aSlots: (number|null)[], bSlots: (number|null)[], aGold: number, bGold: number, aReady: boolean, bReady: boolean }>} */
  const trades = new Map();

  function findClientByPlayerId(playerId) {
    for (const c of clients.values()) {
      if (c.player && c.player.id === playerId) {
        return c;
      }
    }
    return null;
  }

  function findOnlineByAccountKey(accountKey) {
    for (const c of clients.values()) {
      if (c.account?.key === accountKey && c.player) {
        return c;
      }
    }
    return null;
  }

  function playerDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function ensureFriendsArray(account) {
    if (!Array.isArray(account.friends)) {
      account.friends = [];
    }
  }

  function getFriendsList(client) {
    const acc = accountStore.accounts[client.account.key];
    if (!acc) return [];
    ensureFriendsArray(acc);
    return acc.friends.map((friendKey) => {
      const facc = accountStore.accounts[friendKey];
      const online = findOnlineByAccountKey(friendKey);
      const name = online?.player?.name || facc?.character?.name || friendKey;
      return { accountKey: friendKey, name, online: Boolean(online) };
    });
  }

  function leaveParty(accountKey) {
    const pid = accountParty.get(accountKey);
    if (!pid) return;
    const party = parties.get(pid);
    if (!party) {
      accountParty.delete(accountKey);
      return;
    }
    party.members.delete(accountKey);
    accountParty.delete(accountKey);
    if (party.members.size === 0) {
      parties.delete(pid);
    } else if (party.leaderKey === accountKey) {
      const next = [...party.members][0];
      party.leaderKey = next;
    }
  }

  function joinPartyInternal(joinerKey, hostKey) {
    if (joinerKey === hostKey) return { ok: false, message: "party_self" };
    let pid = accountParty.get(hostKey);
    if (!pid) {
      pid = `party_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
      parties.set(pid, { id: pid, leaderKey: hostKey, members: new Set([hostKey]) });
      accountParty.set(hostKey, pid);
    }
    const party = parties.get(pid);
    if (!party) return { ok: false, message: "party_missing" };
    if (party.members.size >= MAX_PARTY) return { ok: false, message: "party_full" };
    const joinerOld = accountParty.get(joinerKey);
    if (joinerOld && joinerOld !== pid) {
      leaveParty(joinerKey);
    }
    party.members.add(joinerKey);
    accountParty.set(joinerKey, pid);
    return { ok: true };
  }

  function getPartyView(client) {
    if (!client.player || !client.account) return null;
    const pid = accountParty.get(client.account.key);
    if (!pid) return null;
    const party = parties.get(pid);
    if (!party) return null;
    const members = [...party.members].map((key) => {
      const online = findOnlineByAccountKey(key);
      if (online?.player) {
        return {
          id: online.player.id,
          name: online.player.name,
          hp: online.player.hp,
          maxHp: online.player.maxHp,
          offline: false
        };
      }
      const facc = accountStore.accounts[key];
      return {
        id: null,
        name: facc?.character?.name || "Offline",
        hp: 0,
        maxHp: 1,
        offline: true
      };
    });
    return { id: pid, leaderKey: party.leaderKey, members };
  }

  function tradeKey(aKey, bKey) {
    return aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
  }

  function endTrade(aKey, bKey) {
    trades.delete(tradeKey(aKey, bKey));
  }

  function notifyTradeClosed(aClient, bClient) {
    if (aClient) send(aClient, { type: "tradeClosed" });
    if (bClient) send(bClient, { type: "tradeClosed" });
  }

  function slotNamesFor(player, slots) {
    if (!player?.inventory) return slots.map(() => null);
    return slots.map((ix) => (ix == null ? null : player.inventory[ix]?.name || "Item"));
  }

  function buildTradePayload(tr, viewerKey) {
    const isA = viewerKey === tr.aKey;
    const selfKey = isA ? tr.aKey : tr.bKey;
    const otherKey = isA ? tr.bKey : tr.aKey;
    const selfSlots = isA ? tr.aSlots : tr.bSlots;
    const otherSlots = isA ? tr.bSlots : tr.aSlots;
    const selfGold = isA ? tr.aGold : tr.bGold;
    const otherGold = isA ? tr.bGold : tr.aGold;
    const other = findOnlineByAccountKey(otherKey);
    const otherPl = other?.player;
    return {
      partnerId: other?.player?.id || null,
      partnerName: other?.player?.name || "Partner",
      selfSlots,
      otherSlots,
      otherSlotNames: otherPl ? slotNamesFor(otherPl, otherSlots) : otherSlots.map(() => null),
      selfGold,
      otherGold,
      selfReady: isA ? tr.aReady : tr.bReady,
      otherReady: isA ? tr.bReady : tr.aReady
    };
  }

  function pushTradeState(tr) {
    const ca = findOnlineByAccountKey(tr.aKey);
    const cb = findOnlineByAccountKey(tr.bKey);
    if (ca) send(ca, { type: "tradeState", ...buildTradePayload(tr, tr.aKey) });
    if (cb) send(cb, { type: "tradeState", ...buildTradePayload(tr, tr.bKey) });
  }

  function handleFriendAdd(client, targetPlayerId) {
    if (!client.player || !client.account) return;
    const tid = typeof targetPlayerId === "string" ? targetPlayerId : null;
    if (!tid) return;
    const target = findClientByPlayerId(tid);
    if (!target?.player || !target.account) return;
    if (target.account.key === client.account.key) return;
    if (playerDistance(client.player, target.player) > PARTY_JOIN_RANGE) {
      send(client, { type: "serverMessage", message: "social_too_far" });
      return;
    }
    const acc = accountStore.accounts[client.account.key];
    if (!acc) return;
    ensureFriendsArray(acc);
    const fk = target.account.key;
    if (acc.friends.includes(fk)) {
      send(client, { type: "serverMessage", message: "friend_exists" });
      return;
    }
    if (acc.friends.length >= MAX_FRIENDS) {
      send(client, { type: "serverMessage", message: "friend_list_full" });
      return;
    }
    acc.friends.push(fk);
    saveAccountStore();
    send(client, { type: "socialFriendsUpdated", friends: getFriendsList(client) });
    send(client, { type: "serverMessage", message: "friend_added", name: target.player.name });
  }

  function handlePartyJoin(client, targetPlayerId) {
    if (!client.player || !client.account) return;
    const tid = typeof targetPlayerId === "string" ? targetPlayerId : null;
    if (!tid) return;
    const target = findClientByPlayerId(tid);
    if (!target?.player || !target.account) return;
    if (target.account.key === client.account.key) return;
    if (playerDistance(client.player, target.player) > PARTY_JOIN_RANGE) {
      send(client, { type: "serverMessage", message: "social_too_far" });
      return;
    }
    const r = joinPartyInternal(client.account.key, target.account.key);
    if (!r.ok) {
      send(client, { type: "serverMessage", message: r.message || "party_fail" });
      return;
    }
    broadcastSnapshot();
  }

  function handlePartyLeave(client) {
    if (!client.account) return;
    leaveParty(client.account.key);
    broadcastSnapshot();
  }

  function handleTradeInvite(client, targetPlayerId) {
    if (!client.player || !client.account) return;
    const tid = typeof targetPlayerId === "string" ? targetPlayerId : null;
    if (!tid) return;
    const target = findClientByPlayerId(tid);
    if (!target?.player || !target.account) return;
    if (target.account.key === client.account.key) return;
    if (playerDistance(client.player, target.player) > TRADE_RANGE) {
      send(client, { type: "serverMessage", message: "trade_too_far" });
      return;
    }
    const aKey = client.account.key;
    const bKey = target.account.key;
    const key = tradeKey(aKey, bKey);
    if (trades.has(key)) {
      send(client, { type: "serverMessage", message: "trade_busy" });
      return;
    }
    const tr = {
      aKey,
      bKey,
      aSlots: Array(TRADE_SLOTS).fill(null),
      bSlots: Array(TRADE_SLOTS).fill(null),
      aGold: 0,
      bGold: 0,
      aReady: false,
      bReady: false
    };
    trades.set(key, tr);
    pushTradeState(tr);
    send(target, { type: "serverMessage", message: "trade_incoming", name: client.player.name });
  }

  function handleTradeSetSlot(client, message) {
    if (!client.player || !client.account) return;
    const slot = clampInt(message.slot, 0, TRADE_SLOTS - 1);
    const invSlot = message.invSlot === null ? null : clampInt(message.invSlot, 0, INVENTORY_SIZE - 1);
    const partner = typeof message.partnerId === "string" ? findClientByPlayerId(message.partnerId) : null;
    if (!partner?.account) return;
    const key = tradeKey(client.account.key, partner.account.key);
    const tr = trades.get(key);
    if (!tr) return;
    const isA = client.account.key === tr.aKey;
    const slots = isA ? tr.aSlots : tr.bSlots;
    if (tr.aReady || tr.bReady) return;
    if (invSlot === null) {
      slots[slot] = null;
    } else {
      const it = client.player.inventory[invSlot];
      if (!it) {
        slots[slot] = null;
      } else {
        slots[slot] = invSlot;
      }
    }
    pushTradeState(tr);
  }

  function handleTradeSetGold(client, message) {
    if (!client.player || !client.account) return;
    const partner = typeof message.partnerId === "string" ? findClientByPlayerId(message.partnerId) : null;
    if (!partner?.account) return;
    const key = tradeKey(client.account.key, partner.account.key);
    const tr = trades.get(key);
    if (!tr) return;
    if (tr.aReady || tr.bReady) return;
    const g = clampInt(message.gold, 0, 999999);
    if (client.account.key === tr.aKey) tr.aGold = Math.min(g, client.player.gold);
    else tr.bGold = Math.min(g, client.player.gold);
    pushTradeState(tr);
  }

  function handleTradeLock(client, message) {
    if (!client.player || !client.account) return;
    const partner = typeof message.partnerId === "string" ? findClientByPlayerId(message.partnerId) : null;
    if (!partner?.account) return;
    const key = tradeKey(client.account.key, partner.account.key);
    const tr = trades.get(key);
    if (!tr) return;
    if (client.account.key === tr.aKey) tr.aReady = Boolean(message.locked);
    else tr.bReady = Boolean(message.locked);
    pushTradeState(tr);
  }

  function handleTradeConfirm(client, message) {
    if (!client.player || !client.account) return;
    const partner = typeof message.partnerId === "string" ? findClientByPlayerId(message.partnerId) : null;
    if (!partner?.player || !partner.account) return;
    const key = tradeKey(client.account.key, partner.account.key);
    const tr = trades.get(key);
    if (!tr || !tr.aReady || !tr.bReady) return;
    if (playerDistance(client.player, partner.player) > TRADE_RANGE) {
      endTrade(tr.aKey, tr.bKey);
      notifyTradeClosed(findOnlineByAccountKey(tr.aKey), findOnlineByAccountKey(tr.bKey));
      broadcastSnapshot();
      return;
    }

    const aClient = findOnlineByAccountKey(tr.aKey);
    const bClient = findOnlineByAccountKey(tr.bKey);
    if (!aClient?.player || !bClient?.player) {
      endTrade(tr.aKey, tr.bKey);
      return;
    }

    const collect = (pl, slots) => {
      const out = [];
      const seenIx = new Set();
      for (let i = 0; i < slots.length; i += 1) {
        const ix = slots[i];
        if (ix === null || ix === undefined) continue;
        if (seenIx.has(ix)) return { error: "trade_dup_slot" };
        seenIx.add(ix);
        const item = pl.inventory[ix];
        if (!item) return { error: "trade_item_moved" };
        out.push({ ix, item, id: item.id });
      }
      return { items: out };
    };

    const aPick = collect(aClient.player, tr.aSlots);
    const bPick = collect(bClient.player, tr.bSlots);
    if (aPick.error || bPick.error) {
      send(aClient, { type: "serverMessage", message: aPick.error || bPick.error });
      tr.aReady = false;
      tr.bReady = false;
      pushTradeState(tr);
      return;
    }

    if (tr.aGold > aClient.player.gold || tr.bGold > bClient.player.gold) {
      send(client, { type: "serverMessage", message: "trade_gold_mismatch" });
      tr.aReady = false;
      tr.bReady = false;
      pushTradeState(tr);
      return;
    }

    /** Snapshot inventories for rollback */
    const aInv = aClient.player.inventory.map((x) => x);
    const bInv = bClient.player.inventory.map((x) => x);
    const aGold0 = aClient.player.gold;
    const bGold0 = bClient.player.gold;

    function freeSlots(pl, count) {
      const idx = [];
      for (let i = 0; i < INVENTORY_SIZE && idx.length < count; i += 1) {
        if (!pl.inventory[i]) idx.push(i);
      }
      return idx.length >= count ? idx : null;
    }

    try {
      for (const { ix } of aPick.items) {
        aClient.player.inventory[ix] = null;
      }
      for (const { ix } of bPick.items) {
        bClient.player.inventory[ix] = null;
      }
      aClient.player.gold -= tr.aGold;
      bClient.player.gold -= tr.bGold;

      const needA = bPick.items.length;
      const needB = aPick.items.length;
      const slotsForA = freeSlots(aClient.player, needA);
      const slotsForB = freeSlots(bClient.player, needB);
      if (!slotsForA || !slotsForB) {
        throw new Error("inv_full");
      }
      let ai = 0;
      for (const row of bPick.items) {
        aClient.player.inventory[slotsForA[ai]] = cloneItem(row.item);
        ai += 1;
      }
      let bi = 0;
      for (const row of aPick.items) {
        bClient.player.inventory[slotsForB[bi]] = cloneItem(row.item);
        bi += 1;
      }
      aClient.player.gold += tr.bGold;
      bClient.player.gold += tr.aGold;
    } catch {
      aClient.player.inventory = aInv;
      bClient.player.inventory = bInv;
      aClient.player.gold = aGold0;
      bClient.player.gold = bGold0;
      send(client, { type: "serverMessage", message: "trade_failed" });
      tr.aReady = false;
      tr.bReady = false;
      pushTradeState(tr);
      return;
    }

    endTrade(tr.aKey, tr.bKey);
    notifyTradeClosed(aClient, bClient);
    saveClientCharacter(aClient);
    saveClientCharacter(bClient);
    send(aClient, { type: "serverMessage", message: "trade_done" });
    send(bClient, { type: "serverMessage", message: "trade_done" });
    broadcastSnapshot();
  }

  function handleTradeCancel(client, message) {
    if (!client.account) return;
    const partner = typeof message.partnerId === "string" ? findClientByPlayerId(message.partnerId) : null;
    const bKey = partner?.account?.key;
    if (!bKey) return;
    const key = tradeKey(client.account.key, bKey);
    if (!trades.has(key)) return;
    endTrade(client.account.key, bKey);
    notifyTradeClosed(client, partner);
  }

  function clampInt(v, lo, hi) {
    const n = Number(v);
    if (!Number.isFinite(n)) return lo;
    return Math.max(lo, Math.min(hi, Math.floor(n)));
  }

  function onDisconnect(client) {
    if (!client.account) return;
    const key = client.account.key;
    for (const [tk, tr] of [...trades.entries()]) {
      if (tr.aKey === key || tr.bKey === key) {
        trades.delete(tk);
        const otherKey = tr.aKey === key ? tr.bKey : tr.aKey;
        const other = findOnlineByAccountKey(otherKey);
        if (other) send(other, { type: "tradeClosed" });
      }
    }
    leaveParty(key);
  }

  function handleMessage(client, message) {
    const t = message.type;
    if (t === "friendAdd") {
      handleFriendAdd(client, message.targetPlayerId);
      return true;
    }
    if (t === "partyJoin") {
      handlePartyJoin(client, message.targetPlayerId);
      return true;
    }
    if (t === "partyLeave") {
      handlePartyLeave(client);
      return true;
    }
    if (t === "tradeInvite") {
      handleTradeInvite(client, message.targetPlayerId);
      return true;
    }
    if (t === "tradeSetSlot") {
      handleTradeSetSlot(client, message);
      return true;
    }
    if (t === "tradeSetGold") {
      handleTradeSetGold(client, message);
      return true;
    }
    if (t === "tradeLock") {
      handleTradeLock(client, message);
      return true;
    }
    if (t === "tradeConfirm") {
      handleTradeConfirm(client, message);
      return true;
    }
    if (t === "tradeCancel") {
      handleTradeCancel(client, message);
      return true;
    }
    return false;
  }

  return {
    handleMessage,
    getPartyView,
    getFriendsList,
    onDisconnect,
    ensureFriendsArray
  };
}

module.exports = { createSocialSystem };
