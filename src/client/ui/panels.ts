// Milestone 2 UI: ability hotbar, talent trees, quests (offer dialog, log, tracker), waypoint
// travel, party frames + invites, trading, emotes and the player context menu.

import type { C2S, PartyView, SelfState, TradeView } from "../../shared/protocol";
import { BAR_SLOTS, TALENTS_BY_ID, TIER_LEVEL, TREE_NAMES, canLearn, respecCost, talentsFor } from "../../shared/game/talents";
import { QUESTS_BY_ID, isReady, stepTarget, type QuestStep } from "../../shared/game/quests";
import { WAYPOINTS, WAYPOINT_COST, type Waypoint } from "../../shared/game/waypoints";
import { EMOTES } from "../../shared/game/emotes";
import { itemTemplate, itemName, type Item } from "../../shared/game/items";
import { CLASSES } from "../../shared/game/classes";
import { npcDef } from "../../shared/game/npcs";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

function stepText(step: QuestStep, n: number): string {
  if (step.type === "kill" || step.type === "collect") return `${step.text} (${Math.min(n, step.count)}/${step.count})`;
  return step.text;
}

export class Panels {
  self: SelfState | null = null;
  party: PartyView | null = null;
  trade: TradeView | null = null;
  /** Ability id → performance.now() when it is ready again. */
  readyAt = new Map<string, number>();
  private abilityEls: HTMLButtonElement[] = [];
  private dialogYes: (() => void) | null = null;
  private dialogNo: (() => void) | null = null;
  /** Quest whose objective is shown on the minimap. */
  trackedQuest: string | null = null;
  onCast: (id: string) => void = () => {};

  constructor(private send: (msg: C2S) => void, private toast: (t: string, k?: "info" | "good" | "bad") => void) {
    this.buildAbilityBar();
    $("hot-talents").addEventListener("click", () => this.toggle("win-talents"));
    $("hot-quests").addEventListener("click", () => this.toggle("win-quests"));
    $("hot-mount").addEventListener("click", () => this.send({ t: "mount" }));
    $("hot-emote").addEventListener("click", () => $("emote-menu").classList.toggle("hidden"));
    $("quest-tracker").addEventListener("click", () => this.toggle("win-quests", true));
    $("talent-respec").addEventListener("click", () => {
      if (!this.self) return;
      this.confirm("Guildmaster Oswin", "Reset talents?", `Forget all your talents for ${respecCost(this.self.lv)} gold? (Oswin must be nearby.)`, () => this.send({ t: "respec" }), "Reset", "Keep them");
    });
    $("dialog-yes").addEventListener("click", () => this.closeDialog(true));
    $("dialog-no").addEventListener("click", () => this.closeDialog(false));
    $("trade-ready").addEventListener("click", () => this.send({ t: "trade", op: "ready" }));
    $("trade-cancel").addEventListener("click", () => this.send({ t: "trade", op: "cancel" }));
    $("trade-cancel-x").addEventListener("click", () => this.send({ t: "trade", op: "cancel" }));
    $<HTMLInputElement>("trade-gold").addEventListener("change", (e) => this.send({ t: "trade", op: "gold", gold: Number((e.target as HTMLInputElement).value) }));
    const emotes = $("emote-menu");
    for (const [id, e] of Object.entries(EMOTES)) {
      const b = document.createElement("button");
      b.innerHTML = `${e.icon}<span>${e.label}</span>`;
      b.addEventListener("click", () => {
        this.send({ t: "emote", id });
        emotes.classList.add("hidden");
      });
      emotes.appendChild(b);
    }
    addEventListener("pointerdown", (e) => {
      const menu = $("player-menu");
      if (!menu.classList.contains("hidden") && !menu.contains(e.target as Node)) menu.classList.add("hidden");
    });
  }

  toggle(id: string, force?: boolean): void {
    const el = $(id);
    el.classList.toggle("hidden", !(force ?? el.classList.contains("hidden")));
  }

  closeAll(): boolean {
    let closed = false;
    for (const id of ["win-talents", "win-quests", "win-waypoints", "win-profs", "win-craft", "emote-menu", "player-menu"]) {
      if (!$(id).classList.contains("hidden")) {
        $(id).classList.add("hidden");
        closed = true;
      }
    }
    if (!$("dialog").classList.contains("hidden")) {
      this.closeDialog(false);
      closed = true;
    }
    return closed;
  }

  setSelf(self: SelfState): void {
    const prevBar = this.self?.bar.join("|");
    this.self = self;
    if (prevBar !== self.bar.join("|")) this.renderAbilityBar();
    this.renderTalents();
    this.renderQuests();
    $("hot-talent-badge").classList.toggle("hidden", self.talentPoints <= 0);
    $("hot-mount").classList.toggle("hidden", !self.hasMount);
    if (!$("win-waypoints").classList.contains("hidden")) this.renderWaypoints(this.currentObelisk);
  }

  // ── ability bar ─────────────────────────────────────────────────────────────

  private buildAbilityBar(): void {
    const bar = $("ability-bar");
    for (let i = 0; i < BAR_SLOTS; i += 1) {
      const b = document.createElement("button");
      b.className = "hot ability empty";
      b.innerHTML = `<span class="ico"></span><span class="key">${i + 1}</span><span class="cd"></span><span class="cdtext"></span>`;
      b.addEventListener("click", () => {
        const id = this.self?.bar[i];
        if (id) this.onCast(id);
      });
      b.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (this.self?.bar[i]) this.send({ t: "bind", slot: i, id: null });
      });
      b.addEventListener("dragover", (e) => {
        e.preventDefault();
        b.classList.add("dragover");
      });
      b.addEventListener("dragleave", () => b.classList.remove("dragover"));
      b.addEventListener("drop", (e) => {
        e.preventDefault();
        b.classList.remove("dragover");
        const id = e.dataTransfer?.getData("text/talent");
        if (id) this.send({ t: "bind", slot: i, id });
      });
      b.draggable = true;
      b.addEventListener("dragstart", (e) => {
        const id = this.self?.bar[i];
        if (id) e.dataTransfer?.setData("text/talent", id);
      });
      this.abilityEls.push(b);
      bar.appendChild(b);
    }
  }

  private renderAbilityBar(): void {
    const bar = this.self?.bar ?? [];
    this.abilityEls.forEach((el, i) => {
      const t = bar[i] ? TALENTS_BY_ID[bar[i]!] : null;
      el.classList.toggle("empty", !t);
      el.querySelector(".ico")!.textContent = t?.icon ?? "";
      el.title = t ? `${t.name} (${i + 1}): ${t.desc}` : "Drag a talent here from the Talents window (T)";
    });
  }

  startCooldown(id: string, ms: number): void {
    this.readyAt.set(id, performance.now() + ms);
  }

  isReady(id: string): boolean {
    return (this.readyAt.get(id) ?? 0) <= performance.now();
  }

  updateCooldowns(now: number): void {
    const bar = this.self?.bar ?? [];
    this.abilityEls.forEach((el, i) => {
      const id = bar[i];
      const t = id ? TALENTS_BY_ID[id] : null;
      const left = id ? (this.readyAt.get(id) ?? 0) - now : 0;
      const cd = el.querySelector<HTMLElement>(".cd")!;
      const txt = el.querySelector<HTMLElement>(".cdtext")!;
      if (t && left > 0) {
        cd.style.transform = `scaleY(${Math.min(1, left / t.cooldownMs)})`;
        txt.textContent = left > 1000 ? String(Math.ceil(left / 1000)) : "";
      } else {
        cd.style.transform = "scaleY(0)";
        txt.textContent = "";
      }
    });
  }

  // ── talents ─────────────────────────────────────────────────────────────────

  private renderTalents(): void {
    const s = this.self;
    if (!s) return;
    $("talent-title").textContent = `${CLASSES[s.cls].name} Talents`;
    $("talent-points").textContent = String(s.talentPoints);
    const root = $("talent-trees");
    root.replaceChildren();
    const all = talentsFor(s.cls);
    TREE_NAMES[s.cls].forEach((name, tree) => {
      const col = document.createElement("div");
      col.className = "tree";
      col.innerHTML = `<h4>${name}</h4>`;
      for (const t of all.filter((o) => o.tree === tree).sort((a, b) => a.tier - b.tier)) {
        const learned = s.talents.includes(t.id);
        const err = canLearn(s.cls, s.lv, s.talents, t.id);
        const el = document.createElement("div");
        el.className = `talent ${learned ? "learned" : err ? "locked" : "available"}`;
        el.title = learned ? "Learned! Drag onto your hotbar." : err ?? "Click to learn";
        el.innerHTML = `<span class="tierlbl">Tier ${t.tier} · Lv ${TIER_LEVEL[t.tier]}</span><div class="icon">${t.icon}</div><div><b>${t.name}</b><small>${t.desc} (${Math.round(t.cooldownMs / 1000)}s)</small></div>`;
        el.draggable = learned;
        el.addEventListener("dragstart", (e) => e.dataTransfer?.setData("text/talent", t.id));
        el.addEventListener("click", () => {
          if (learned) {
            const free = s.bar.indexOf(null);
            if (!s.bar.includes(t.id) && free !== -1) this.send({ t: "bind", slot: free, id: t.id });
            return;
          }
          if (err) return this.toast(err, "bad");
          this.send({ t: "learn", id: t.id });
        });
        col.appendChild(el);
      }
      root.appendChild(col);
    });
  }

  // ── quests ──────────────────────────────────────────────────────────────────

  offerQuest(npcId: string, questId: string): void {
    const q = QUESTS_BY_ID[questId];
    if (!q) return;
    const objectives = q.steps.map((st) => `<li>${st.text}${st.type === "kill" || st.type === "collect" ? ` (${st.count})` : ""}</li>`).join("");
    const rewards = [`${q.reward.xp} XP`, `${q.reward.gold} gold`, ...(q.reward.items ?? []).map((i) => `${itemTemplate(i.tpl)?.name ?? i.tpl}${i.qty && i.qty > 1 ? ` x${i.qty}` : ""}`), ...(q.reward.gear ? [`a ${q.reward.gear} piece of gear`] : [])];
    this.dialog(
      npcDef(npcId)?.name ?? "",
      q.name,
      `“${q.offer}”`,
      `<ul class="objectives">${objectives}</ul><div class="rewards"><b>Rewards:</b> ${rewards.join(", ")}</div>`,
      () => this.send({ t: "questAccept", id: questId }),
      undefined,
      "Accept",
      "Not now"
    );
  }

  private renderQuests(): void {
    const s = this.self;
    if (!s) return;
    const list = $("quest-list");
    list.replaceChildren();
    if (!s.quests.active.length) {
      const empty = document.createElement("p");
      empty.className = "tip";
      empty.textContent = "No quests yet. Look for villagers with a golden ! over their heads.";
      list.appendChild(empty);
    }
    for (const prog of s.quests.active) {
      const q = QUESTS_BY_ID[prog.id];
      if (!q) continue;
      const ready = isReady(q, prog);
      const el = document.createElement("div");
      el.className = `quest ${ready ? "ready" : ""}`;
      const h = document.createElement("h4");
      h.textContent = q.name;
      const ab = document.createElement("button");
      ab.className = "abandon";
      ab.textContent = "Abandon";
      ab.addEventListener("click", () => this.confirm("", "Abandon quest?", `Give up on “${q.name}”? You can pick it up again later.`, () => this.send({ t: "questAbandon", id: q.id }), "Abandon", "Keep it"));
      h.appendChild(ab);
      el.appendChild(h);
      q.steps.forEach((st, i) => {
        const d = document.createElement("div");
        d.className = `step ${i < prog.step ? "done" : i === prog.step ? "current" : ""}`;
        d.textContent = i === prog.step ? stepText(st, prog.n) : st.text;
        el.appendChild(d);
      });
      if (ready) {
        const d = document.createElement("div");
        d.className = "step current";
        d.textContent = `Return to ${npcDef(q.turnIn ?? q.giver)?.name ?? "the quest giver"} for your reward`;
        el.appendChild(d);
      }
      el.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).closest(".abandon")) return;
        this.trackedQuest = q.id;
        this.renderQuests();
      });
      list.appendChild(el);
    }
    if (s.quests.done.length) {
      const done = document.createElement("div");
      done.className = "quest-done-list";
      done.textContent = `Completed: ${s.quests.done.map((id) => QUESTS_BY_ID[id]?.name ?? id).join(", ")}`;
      list.appendChild(done);
    }
    // Tracker: up to three quests, tracked one first.
    const tracker = $("quest-tracker");
    tracker.replaceChildren();
    const active = [...s.quests.active].sort((a, b) => (a.id === this.trackedQuest ? -1 : b.id === this.trackedQuest ? 1 : 0)).slice(0, 3);
    if (!this.trackedQuest || !s.quests.active.some((a) => a.id === this.trackedQuest)) this.trackedQuest = active[0]?.id ?? null;
    tracker.classList.toggle("hidden", active.length === 0);
    for (const prog of active) {
      const q = QUESTS_BY_ID[prog.id];
      if (!q) continue;
      const ready = isReady(q, prog);
      const el = document.createElement("div");
      el.className = `tq ${ready ? "ready" : ""}`;
      const step = q.steps[prog.step];
      el.innerHTML = `<b></b><span></span>`;
      el.querySelector("b")!.textContent = q.name;
      el.querySelector("span")!.textContent = ready ? `Return to ${npcDef(q.turnIn ?? q.giver)?.name ?? "the giver"}` : step ? stepText(step, prog.n) : "";
      tracker.appendChild(el);
    }
  }

  /** World position of the tracked quest's current objective (for the minimap). */
  objective(): { x: number; y: number } | null {
    const s = this.self;
    const prog = s?.quests.active.find((a) => a.id === this.trackedQuest);
    if (!prog) return null;
    const q = QUESTS_BY_ID[prog.id];
    if (!q) return null;
    if (isReady(q, prog)) {
      const npc = npcDef(q.turnIn ?? q.giver);
      return npc ? { x: npc.x, y: npc.y } : null;
    }
    const step = q.steps[prog.step];
    return step ? stepTarget(step) : null;
  }

  // ── waypoints ───────────────────────────────────────────────────────────────

  private currentObelisk: Waypoint | null = null;

  openWaypoints(at: Waypoint): void {
    this.currentObelisk = at;
    this.renderWaypoints(at);
    $("win-waypoints").classList.remove("hidden");
  }

  private renderWaypoints(at: Waypoint | null): void {
    const s = this.self;
    if (!s || !at) return;
    const list = $("waypoint-list");
    list.replaceChildren();
    for (const w of WAYPOINTS) {
      const attuned = s.waypoints.includes(w.id);
      const row = document.createElement("div");
      row.className = "shop-item";
      const cost = w.id === "wp_hearthmoor" ? 0 : WAYPOINT_COST;
      row.innerHTML = `<div class="slot">${attuned ? "🔮" : "❔"}</div><div><div>${attuned ? w.name : "Unknown obelisk"}</div><small>${w.id === at.id ? "You are here" : attuned ? (cost ? `${cost} gold` : "Free") : "Find it to attune"}</small></div>`;
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = "Travel";
      btn.disabled = !attuned || w.id === at.id || s.gold < cost;
      btn.addEventListener("click", () => {
        this.send({ t: "travel", id: w.id });
        $("win-waypoints").classList.add("hidden");
      });
      row.appendChild(btn);
      list.appendChild(row);
    }
  }

  // ── party ───────────────────────────────────────────────────────────────────

  setParty(party: PartyView | null, selfId: string | null): void {
    this.party = party;
    const root = $("party-frames");
    root.replaceChildren();
    if (!party) return;
    for (const m of party.members) {
      if (m.id === selfId) continue;
      const el = document.createElement("div");
      el.className = `pframe ${party.leader === m.id ? "leader" : ""}`;
      el.innerHTML = `<div class="top"><b></b><span>Lv ${m.lv}</span></div><div class="bar hp"><div style="transform:scaleX(${Math.max(0, Math.min(1, m.hp / Math.max(1, m.mhp)))})"></div></div>`;
      el.querySelector("b")!.textContent = m.name;
      root.appendChild(el);
    }
  }

  partyInvite(fromName: string): void {
    this.dialog("", "Party invite", `${fromName} invited you to their party. Adventure together and share XP and quest kills!`, "", () => this.send({ t: "party", op: "accept" }), () => this.send({ t: "party", op: "decline" }), "Join", "No thanks");
  }

  // ── trading ─────────────────────────────────────────────────────────────────

  tradeRequest(fromName: string): void {
    this.dialog("", "Trade request", `${fromName} would like to trade with you.`, "", () => this.send({ t: "trade", op: "accept" }), () => this.send({ t: "trade", op: "decline" }), "Trade", "No thanks");
  }

  setTrade(trade: TradeView | null): void {
    this.trade = trade;
    $("win-trade").classList.toggle("hidden", !trade);
    if (!trade) return;
    $("win-bag").classList.remove("hidden");
    $("trade-title").textContent = `Trading with ${trade.them.name}`;
    $("trade-them-name").textContent = `${trade.them.name} offers`;
    const fill = (id: string, items: Item[], mine: boolean) => {
      const grid = $(id);
      grid.replaceChildren();
      for (let i = 0; i < 6; i += 1) {
        const it = items[i];
        const el = document.createElement("div");
        el.className = `slot ${it ? `r-${it.rarity}` : "empty"}`;
        el.textContent = it ? itemTemplate(it.tpl)?.icon ?? "❔" : "";
        if (it) el.title = `${itemName(it)}${it.qty > 1 ? ` x${it.qty}` : ""}`;
        if (it && mine) el.addEventListener("click", () => {
          const slot = this.self?.inv.findIndex((x) => x?.uid === it.uid) ?? -1;
          if (slot >= 0) this.send({ t: "trade", op: "unoffer", slot });
        });
        grid.appendChild(el);
      }
    };
    fill("trade-mine", trade.me.items, true);
    fill("trade-theirs", trade.them.items, false);
    const goldInput = $<HTMLInputElement>("trade-gold");
    if (document.activeElement !== goldInput) goldInput.value = String(trade.me.gold);
    $("trade-their-gold").textContent = String(trade.them.gold);
    $("trade-mine-ready").textContent = trade.me.ready ? "✓ You're ready" : "";
    $("trade-their-ready").textContent = trade.them.ready ? `✓ ${trade.them.name} is ready` : "";
    $<HTMLButtonElement>("trade-ready").disabled = trade.me.ready;
  }

  offeredUids(): Set<string> {
    return new Set((this.trade?.me.items ?? []).map((i) => i.uid));
  }

  // ── player menu ─────────────────────────────────────────────────────────────

  openPlayerMenu(id: string, name: string, sx: number, sy: number): void {
    const menu = $("player-menu");
    menu.replaceChildren();
    const title = document.createElement("b");
    title.textContent = name;
    menu.appendChild(title);
    const add = (label: string, fn: () => void) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.addEventListener("click", () => {
        fn();
        menu.classList.add("hidden");
      });
      menu.appendChild(b);
    };
    const inParty = this.party?.members.some((m) => m.id === id);
    if (!inParty) add("🤝 Invite to party", () => this.send({ t: "party", op: "invite", target: id }));
    else if (this.party?.leader !== id) add("👢 Remove from party", () => this.send({ t: "party", op: "kick", target: id }));
    add("💰 Trade", () => this.send({ t: "trade", op: "request", target: id }));
    add("👋 Wave", () => this.send({ t: "emote", id: "wave" }));
    menu.style.left = `${Math.min(innerWidth - 170, sx)}px`;
    menu.style.top = `${Math.min(innerHeight - 160, sy)}px`;
    menu.classList.remove("hidden");
  }

  // ── dialog ──────────────────────────────────────────────────────────────────

  dialog(who: string, title: string, text: string, extraHtml: string, yes: () => void, no?: () => void, yesLabel = "OK", noLabel = "Cancel"): void {
    // A newer prompt replaces an older one (declining the old one first).
    if (!$("dialog").classList.contains("hidden")) this.closeDialog(false);
    $("dialog-who").textContent = who;
    $("dialog-title").textContent = title;
    $("dialog-text").textContent = text;
    $("dialog-extra").innerHTML = extraHtml;
    $("dialog-yes").textContent = yesLabel;
    $("dialog-no").textContent = noLabel;
    this.dialogYes = yes;
    this.dialogNo = no ?? null;
    $("dialog").classList.remove("hidden");
  }

  private confirm(who: string, title: string, text: string, yes: () => void, yesLabel: string, noLabel: string): void {
    this.dialog(who, title, text, "", yes, undefined, yesLabel, noLabel);
  }

  private closeDialog(accepted: boolean): void {
    $("dialog").classList.add("hidden");
    const fn = accepted ? this.dialogYes : this.dialogNo;
    this.dialogYes = this.dialogNo = null;
    fn?.();
  }

  get dialogOpen(): boolean {
    return !$("dialog").classList.contains("hidden");
  }
}
