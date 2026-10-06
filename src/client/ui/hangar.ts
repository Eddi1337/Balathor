// The hangar (Pax & Gears on Ringforge): buy or pick your ship, and buy upgrades that apply to
// every ship you own. Also the warp map (J) used while flying.

import type { C2S, SelfState } from "../../shared/protocol";
import { HULLS, HULL_IDS, MAX_UPGRADE, UPGRADE_INFO, UPGRADE_PRICES, UPGRADE_SLOTS, shipStats } from "../../shared/game/ships";
import { POIS } from "../../shared/world/scifi/space";

function el(tag: string, cls: string, html = ""): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  e.innerHTML = html;
  return e;
}

function windowShell(id: string, title: string): { root: HTMLElement; body: HTMLElement } {
  const root = el("div", "window card hidden");
  root.id = id;
  const header = el("header", "", `<h3>${title}</h3>`);
  const x = el("button", "x", "✕");
  x.addEventListener("click", () => root.classList.add("hidden"));
  header.appendChild(x);
  const body = el("div", "");
  root.append(header, body);
  document.getElementById("hud")!.appendChild(root);
  return { root, body };
}

export class HangarUI {
  private win = windowShell("win-hangar", "🚀 Ringforge Hangar");
  private self: SelfState | null = null;

  constructor(private send: (m: C2S) => void) {}

  get open(): boolean {
    return !this.win.root.classList.contains("hidden");
  }

  show(): void {
    this.win.root.classList.remove("hidden");
    this.render();
  }

  hide(): void {
    this.win.root.classList.add("hidden");
  }

  setSelf(s: SelfState): void {
    this.self = s;
    if (this.open) this.render();
  }

  private render(): void {
    const s = this.self;
    const body = this.win.body;
    body.replaceChildren();
    if (!s) return;
    body.appendChild(el("h4", "hangar-h", "Ships"));
    for (const id of HULL_IDS) {
      const h = HULLS[id];
      const st = shipStats(id, s.shipUp, s.lv);
      const owned = s.ships.includes(id);
      const active = s.activeShip === id;
      const row = el(
        "div",
        `shop-item ship-row${active ? " active" : ""}`,
        `<div class="slot ship-swatch" style="background:${h.color}">🚀</div>
         <div><div><b>${h.name}</b>${active ? " <small>(flying)</small>" : ""}</div>
         <div class="recipe-in">${h.blurb}</div>
         <small>Hull ${st.maxHull} · Shield ${st.maxShield} · Speed ${st.speed.toFixed(1)} · ${h.guns}× ${Math.round(st.dmg)} dmg${h.turrets ? ` · ${h.turrets} drones` : ""}${h.mining ? ` · +${Math.round(h.mining * 100)}% mining` : ""}</small></div>`
      );
      const btn = el("button", "btn", owned ? (active ? "Active" : "Fly this") : h.price ? `${h.price}g` : "Quest") as HTMLButtonElement;
      btn.disabled = active || (!owned && (!h.price || s.gold < h.price));
      btn.addEventListener("click", () => this.send({ t: "hangar", op: owned ? "select" : "buy", hull: id }));
      row.appendChild(btn);
      body.appendChild(row);
    }
    body.appendChild(el("h4", "hangar-h", "Upgrades <small>(all your ships)</small>"));
    for (const slot of UPGRADE_SLOTS) {
      const lvl = s.shipUp[slot];
      const info = UPGRADE_INFO[slot];
      const pips = Array.from({ length: MAX_UPGRADE }, (_, i) => `<span class="pip${i < lvl ? " on" : ""}"></span>`).join("");
      const row = el("div", "shop-item", `<div class="slot">${info.icon}</div><div><div><b>${info.name}</b> <span class="pips">${pips}</span></div><small>${info.per} per level</small></div>`);
      const price = UPGRADE_PRICES[lvl];
      const btn = el("button", "btn", lvl >= MAX_UPGRADE ? "Maxed" : `${price}g`) as HTMLButtonElement;
      btn.disabled = lvl >= MAX_UPGRADE || s.gold < price;
      btn.addEventListener("click", () => this.send({ t: "hangar", op: "upgrade", slot }));
      row.appendChild(btn);
      body.appendChild(row);
    }
  }
}

export class WarpUI {
  private win = windowShell("win-warp", "🌌 Warp Drive");
  private self: SelfState | null = null;
  pos = { x: 0, y: 0 };

  constructor(private send: (m: C2S) => void) {}

  get open(): boolean {
    return !this.win.root.classList.contains("hidden");
  }

  toggle(): void {
    this.win.root.classList.toggle("hidden");
    this.render();
  }

  hide(): void {
    this.win.root.classList.add("hidden");
  }

  setSelf(s: SelfState): void {
    this.self = s;
    if (this.open) this.render();
  }

  private render(): void {
    const s = this.self;
    const body = this.win.body;
    body.replaceChildren();
    if (!s) return;
    body.appendChild(el("p", "tip", "Jump to anywhere you've already visited. Charging takes a moment, and enemy fire interrupts it."));
    for (const p of POIS) {
      const known = s.discovered.includes(p.id);
      const d = Math.round(Math.hypot(p.x - this.pos.x, p.y - this.pos.y));
      const kind = { station: "Station", outpost: "Outpost", planet: "Planet", belt: "Asteroid belt", derelict: "Wreck field", haven: "Pirate base" }[p.kind];
      const row = el(
        "div",
        `shop-item${known ? "" : " unknown"}`,
        `<div class="slot" style="color:${p.color}">●</div><div><div><b>${known ? p.name : "???"}</b></div><small>${kind} · lv ${p.level} · ${d}u away</small></div>`
      );
      const btn = el("button", "btn", known ? "Warp" : "Unvisited") as HTMLButtonElement;
      btn.disabled = !known;
      btn.addEventListener("click", () => {
        this.send({ t: "warp", dest: p.id });
        this.hide();
      });
      row.appendChild(btn);
      body.appendChild(row);
    }
  }
}
