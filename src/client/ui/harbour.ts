// The harbour (Harbourmaster Finn & Shipwright Moira): bring your ship round, buy hulls and pick
// which one to sail. Plus the little sailing panel (wind, sails, speed) shown while aboard.

import type { C2S, SelfState } from "../../shared/protocol";
import { SAIL_HULLS, SAIL_HULL_IDS } from "../../shared/game/sailing";

function el(tag: string, cls: string, html = ""): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  e.innerHTML = html;
  return e;
}

export class HarbourUI {
  private root: HTMLElement;
  private body: HTMLElement;
  private self: SelfState | null = null;

  constructor(private send: (m: C2S) => void) {
    this.root = el("div", "window card hidden");
    this.root.id = "win-harbour";
    const header = el("header", "", "<h3>⚓ Port Bilgewater Harbour</h3>");
    const x = el("button", "x", "✕");
    x.addEventListener("click", () => this.hide());
    header.appendChild(x);
    this.body = el("div", "");
    this.root.append(header, this.body);
    document.getElementById("hud")!.appendChild(this.root);
  }

  get open(): boolean {
    return !this.root.classList.contains("hidden");
  }

  show(): void {
    this.root.classList.remove("hidden");
    this.render();
  }

  hide(): void {
    this.root.classList.add("hidden");
  }

  setSelf(s: SelfState): void {
    this.self = s;
    if (this.open) this.render();
  }

  private render(): void {
    const s = this.self;
    this.body.replaceChildren();
    if (!s) return;
    const summon = el("button", "btn primary big", s.activeSail ? `⛵ Bring the ${SAIL_HULLS[s.activeSail].name} to the pier` : "You don't own a ship yet") as HTMLButtonElement;
    summon.disabled = !s.activeSail;
    summon.addEventListener("click", () => {
      this.send({ t: "sail", op: "summon" });
      this.hide();
    });
    this.body.appendChild(summon);
    this.body.appendChild(el("p", "tip", "Board at the pier with E. Take the wheel at the stern, steer with WASD, Space raises or furls the sails, click to fire a broadside. Sail across the wind for the best speed!"));
    this.body.appendChild(el("h4", "hangar-h", "Ships"));
    for (const id of SAIL_HULL_IDS) {
      const h = SAIL_HULLS[id];
      const owned = s.sailShips.includes(id);
      const active = s.activeSail === id;
      const row = el(
        "div",
        `shop-item ship-row${active ? " active" : ""}`,
        `<div class="slot ship-swatch" style="background:${h.hullColor}">⛵</div>
         <div><div><b>${h.name}</b>${active ? " <small>(your ship)</small>" : ""}</div>
         <div class="recipe-in">${h.blurb}</div>
         <small>Hull ${h.hp} · Speed ${h.speed} · ${h.cannons.length} cannons a side · ${h.masts.length} mast${h.masts.length > 1 ? "s" : ""}</small></div>`
      );
      const btn = el("button", "btn", owned ? (active ? "Sailing" : "Choose") : h.price ? `${h.price}g` : "Quest") as HTMLButtonElement;
      btn.disabled = active || (!owned && (!h.price || s.gold < h.price));
      btn.addEventListener("click", () => this.send({ t: "sail", op: owned ? "select" : "buy", hull: id }));
      row.appendChild(btn);
      this.body.appendChild(row);
    }
  }
}

/** Wind compass + sail state while aboard. */
export class SailPanel {
  private root: HTMLElement;
  constructor() {
    this.root = el("div", "sail-panel card hidden", `<div class="wind"><span class="arrow">➤</span></div><div class="sail-text"></div>`);
    document.getElementById("hud")!.appendChild(this.root);
  }

  update(show: boolean, windScreenAngle: number, sail: number, speed: number, hull: number, mhp: number, helm: boolean): void {
    this.root.classList.toggle("hidden", !show);
    if (!show) return;
    (this.root.querySelector(".arrow") as HTMLElement).style.transform = `rotate(${windScreenAngle}rad)`;
    (this.root.querySelector(".sail-text") as HTMLElement).innerHTML =
      `<b>${["Sails furled", "Half sail", "Full sail"][sail] ?? ""}</b> · ${speed.toFixed(1)} knots<div class="bar ship"><div style="transform:scaleX(${Math.max(0, hull / Math.max(1, mhp))})"></div><span>Hull ${Math.ceil(hull)} / ${mhp}</span></div>` +
      (helm ? `<small>WASD steer · Space sails · Click broadside · E leave wheel</small>` : `<small>Walk to the wheel at the stern (E) or a cannon (click)</small>`);
  }
}
