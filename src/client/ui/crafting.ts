// Professions UI: levels panel, crafting window, gathering progress / fishing prompt, food chip.

import type { C2S, SelfState } from "../../shared/protocol";
import { PROFESSIONS, PROF_IDS, RECIPES, profXpToNext, FOOD_STAT_INFO, type Station } from "../../shared/game/professions";
import { itemTemplate } from "../../shared/game/items";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export class CraftingUI {
  self: SelfState | null = null;
  station: Station | null = null;
  private work: { until: number; total: number; label: string } | null = null;
  fishing: { x: number; y: number; bite: boolean } | null = null;
  private foodUntil = 0;
  private foodLabel = "";

  constructor(private send: (msg: C2S) => void) {
    $("hot-profs").addEventListener("click", () => this.toggleProfs());
  }

  toggleProfs(): void {
    $("win-profs").classList.toggle("hidden");
    this.renderProfs();
  }

  setSelf(self: SelfState): void {
    this.self = self;
    this.renderProfs();
    if (this.station) this.renderCraft();
    if (self.food) {
      this.foodUntil = performance.now() + self.food.ms;
      const v = self.food.stat === "def" ? `+${self.food.value} armour` : `+${Math.round(self.food.value * 100)}% ${FOOD_STAT_INFO[self.food.stat]}`;
      this.foodLabel = `🍽️ ${self.food.name}: ${v}`;
    } else this.foodUntil = 0;
  }

  private renderProfs(): void {
    const s = this.self;
    if (!s || $("win-profs").classList.contains("hidden")) return;
    const list = $("prof-list");
    list.replaceChildren();
    for (const id of PROF_IDS) {
      const p = PROFESSIONS[id];
      const st = s.professions[id];
      const el = document.createElement("div");
      el.className = "prof";
      el.innerHTML = `<span class="ico">${p.icon}</span><div><b>${p.name}</b><div class="bar"><div style="transform:scaleX(${Math.min(1, st.xp / profXpToNext(st.lv))})"></div></div></div><b>Lv ${st.lv}</b>`;
      list.appendChild(el);
    }
  }

  openStation(st: Station): void {
    this.station = st;
    $("craft-title").textContent = st.name;
    $("win-craft").classList.remove("hidden");
    this.renderCraft();
  }

  closeStation(): void {
    this.station = null;
    $("win-craft").classList.add("hidden");
  }

  private renderCraft(): void {
    const s = this.self;
    const st = this.station;
    if (!s || !st) return;
    const have = (tpl: string) => s.inv.reduce((n, i) => n + (i?.tpl === tpl ? i.qty : 0), 0);
    const list = $("craft-list");
    list.replaceChildren();
    for (const r of RECIPES.filter((x) => x.station === st.kind)) {
      const out = r.output === "weapon" ? { name: "Forged class weapon", icon: "⚔️" } : { name: itemTemplate(r.output.tpl)?.name ?? r.output.tpl, icon: itemTemplate(r.output.tpl)?.icon ?? "❔" };
      const lvOk = s.professions[r.prof].lv >= r.level;
      const inputs = r.inputs.map((i) => {
        const n = have(i.tpl);
        return `<span class="${n >= i.qty ? "ok" : "no"}">${itemTemplate(i.tpl)?.icon ?? ""} ${itemTemplate(i.tpl)?.name ?? i.tpl} ${n}/${i.qty}</span>`;
      });
      const can = lvOk && r.inputs.every((i) => have(i.tpl) >= i.qty);
      const row = document.createElement("div");
      row.className = "shop-item";
      row.innerHTML = `<div class="slot">${out.icon}</div><div><div>${out.name}${r.output !== "weapon" && r.output.qty > 1 ? ` x${r.output.qty}` : ""}</div><div class="recipe-in">${inputs.join(" · ")}</div><small class="${lvOk ? "" : "no"}">${PROFESSIONS[r.prof].name} ${r.level}</small></div>`;
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = PROFESSIONS[r.prof].verb;
      btn.disabled = !can;
      btn.addEventListener("click", () => this.send({ t: "craft", recipe: r.id, station: st.id }));
      row.appendChild(btn);
      list.appendChild(row);
    }
  }

  startWork(ms: number, label: string): void {
    this.work = { until: performance.now() + ms, total: ms, label };
  }

  stopWork(): void {
    this.work = null;
  }

  get working(): boolean {
    return Boolean(this.work);
  }

  update(now: number): void {
    const bar = $("work-bar");
    if (this.fishing) {
      bar.classList.remove("hidden");
      bar.classList.toggle("bite", this.fishing.bite);
      $("work-fill").style.width = this.fishing.bite ? "100%" : `${50 + Math.sin(now / 300) * 20}%`;
      $("work-text").textContent = this.fishing.bite ? "A bite! Press E to reel in!" : "Waiting for a bite…";
    } else if (this.work) {
      const k = 1 - (this.work.until - now) / this.work.total;
      bar.classList.remove("hidden", "bite");
      $("work-fill").style.width = `${Math.min(100, k * 100)}%`;
      $("work-text").textContent = this.work.label;
      if (k >= 1.15) this.work = null;
    } else {
      bar.classList.add("hidden");
    }
    const chip = $("food-chip");
    const left = this.foodUntil - now;
    chip.classList.toggle("hidden", left <= 0);
    if (left > 0) chip.textContent = `${this.foodLabel} · ${Math.ceil(left / 60000)}m`;
  }
}
