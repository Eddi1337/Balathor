// Home UI: decorate mode (furniture stock + placement), visitor toggle, selling, and storage.

import type { C2S, HouseInfo, SelfState } from "../../shared/protocol";
import { FURNITURE } from "../../shared/game/furniture";
import { PLOTS_BY_ID } from "../../shared/world/housing";
import { itemTemplate, itemName, type Item } from "../../shared/game/items";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export class HomeUI {
  self: SelfState | null = null;
  houses = new Map<string, HouseInfo>();
  /** Furniture kind selected for placement (decorate mode). */
  placing: string | null = null;
  rot = 0;
  decorating = false;
  storageOpen = false;
  /** Plot of the home we're currently inside, if it's ours. */
  insideOwnHome: string | null = null;

  constructor(private send: (msg: C2S) => void, private confirm: (title: string, text: string, yes: () => void) => void) {
    $("home-open").addEventListener("change", (e) => {
      if (this.insideOwnHome) this.send({ t: "house", op: "open", plot: this.insideOwnHome, open: (e.target as HTMLInputElement).checked });
    });
    $("home-sell").addEventListener("click", () => {
      const plot = this.insideOwnHome && PLOTS_BY_ID[this.insideOwnHome];
      if (!plot) return;
      this.confirm("Sell your home?", `Sell ${plot.name} back for ${Math.floor(plot.price / 2)} gold? Placed furniture returns to your stock.`, () => this.send({ t: "house", op: "sell", plot: plot.id }));
    });
    $("storage-close").addEventListener("click", () => this.closeStorage());
    document.querySelector('[data-close="win-decorate"]')?.addEventListener("click", () => this.stopDecorating());
  }

  setHouses(list: HouseInfo[]): void {
    this.houses = new Map(list.map((h) => [h.plot, h]));
    if (this.insideOwnHome) ($("home-open") as HTMLInputElement).checked = Boolean(this.houses.get(this.insideOwnHome)?.open);
  }

  setSelf(self: SelfState): void {
    this.self = self;
    if (this.decorating) this.render();
  }

  toggleDecorate(): void {
    if (this.decorating) return this.stopDecorating();
    if (!this.insideOwnHome) return;
    this.decorating = true;
    $("win-decorate").classList.remove("hidden");
    $("decorate-title").textContent = `Decorate ${PLOTS_BY_ID[this.insideOwnHome]?.name ?? "your home"}`;
    ($("home-open") as HTMLInputElement).checked = Boolean(this.houses.get(this.insideOwnHome)?.open);
    this.render();
  }

  stopDecorating(): void {
    this.decorating = false;
    this.placing = null;
    $("win-decorate").classList.add("hidden");
  }

  private render(): void {
    const list = $("decorate-list");
    list.replaceChildren();
    const stock = this.self?.furniture ?? {};
    for (const def of Object.values(FURNITURE)) {
      const n = stock[def.id] ?? 0;
      const el = document.createElement("div");
      el.className = `decor ${n <= 0 ? "empty" : ""} ${this.placing === def.id ? "selected" : ""}`;
      el.innerHTML = `<span class="ico">${def.icon}</span><span></span><b>x${n}</b>`;
      el.querySelector("span:nth-child(2)")!.textContent = def.name;
      el.title = n <= 0 ? "Buy more at Marta's Workshop in the market" : "Click, then click the floor";
      el.addEventListener("click", () => {
        if (n <= 0) return;
        this.placing = this.placing === def.id ? null : def.id;
        this.rot = 0;
        this.render();
      });
      list.appendChild(el);
    }
  }

  openStorage(items: (Item | null)[] | null): void {
    this.storageOpen = Boolean(items);
    $("win-storage").classList.toggle("hidden", !items);
    if (!items) return;
    $("win-bag").classList.remove("hidden");
    const grid = $("storage-grid");
    grid.replaceChildren();
    items.forEach((it, i) => {
      const el = document.createElement("div");
      el.className = `slot ${it ? `r-${it.rarity}` : "empty"}`;
      el.textContent = it ? itemTemplate(it.tpl)?.icon ?? "❔" : "";
      if (it) {
        el.title = `${itemName(it)}${it.qty > 1 ? ` x${it.qty}` : ""}`;
        el.addEventListener("click", () => this.send({ t: "storage", op: "withdraw", slot: i }));
      }
      grid.appendChild(el);
    });
  }

  closeStorage(): void {
    if (!this.storageOpen) return;
    this.storageOpen = false;
    $("win-storage").classList.add("hidden");
    this.send({ t: "storage", op: "close", slot: -1 });
  }
}
