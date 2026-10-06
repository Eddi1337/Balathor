// In-game HUD and windows (bag, character, shop), chat, toasts, tooltip and minimap.

import type { C2S, SelfState, ShopView } from "../../shared/protocol";
import { EQUIP_SLOTS, RARITY_INFO, itemTemplate, itemName, itemValue, type EquipSlot, type Item } from "../../shared/game/items";
import { STAT_IDS, STAT_INFO } from "../../shared/game/stats";
import { CLASSES } from "../../shared/game/classes";
import { Tile } from "../../shared/world/tiles";
import type { MapDef } from "../../shared/world/maps";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const MINIMAP_COLORS: Record<number, [number, number, number]> = {
  [Tile.GRASS]: [143, 209, 106],
  [Tile.MEADOW]: [166, 222, 122],
  [Tile.FLOWERS]: [190, 225, 140],
  [Tile.DARK_GRASS]: [108, 189, 92],
  [Tile.SAND]: [245, 225, 166],
  [Tile.SHALLOW]: [140, 210, 220],
  [Tile.WATER]: [92, 178, 232],
  [Tile.SNOW]: [244, 248, 255],
  [Tile.ASH]: [154, 138, 142],
  [Tile.MUD]: [154, 138, 92],
  [Tile.PATH]: [236, 208, 154],
  [Tile.COBBLE]: [217, 207, 196],
  [Tile.PLAZA]: [240, 226, 207],
  [Tile.WALL]: [150, 140, 130],
  [Tile.BUILDING]: [229, 122, 90],
  [Tile.FOUNTAIN]: [143, 227, 255],
  [Tile.FLOOR]: [216, 180, 138],
  [Tile.FIELD]: [185, 143, 94],
  [Tile.RIVER]: [102, 205, 230],
  [Tile.VOID]: [14, 16, 42],
  [Tile.FORCEFIELD]: [60, 70, 140],
  [Tile.METAL_FLOOR]: [200, 208, 222],
  [Tile.METAL_WALL]: [70, 80, 104],
  [Tile.GLASS]: [127, 200, 240],
  [Tile.PAD]: [127, 232, 255],
  [Tile.CONSOLE]: [106, 116, 136],
  [Tile.PLANTER]: [127, 224, 168],
  [Tile.GATE]: [185, 140, 255]
};
const PROP_COLOR: [number, number, number] = [70, 140, 80];

const EQUIP_LABEL: Record<EquipSlot, string> = { weapon: "Weapon", body: "Armour", ring1: "Ring", ring2: "Ring" };

export interface MinimapDot {
  x: number;
  y: number;
  color: string;
  size: number;
}

export class Hud {
  self: SelfState | null = null;
  shop: ShopView | null = null;
  private dragFrom: number | null = null;
  private minimapCtx = $<HTMLCanvasElement>("minimap").getContext("2d")!;
  private minimapBase: ImageData | null = null;
  private minimapCenter = { x: 1e9, y: 1e9 };
  chatFocused = false;
  /** When set (e.g. during a trade), bag clicks go here instead of use/equip. */
  bagClickOverride: ((slot: number) => void) | null = null;
  offeredUids = new Set<string>();

  constructor(private send: (msg: C2S) => void) {
    document.querySelectorAll<HTMLButtonElement>("[data-close]").forEach((btn) =>
      btn.addEventListener("click", () => {
        $(btn.dataset.close!).classList.add("hidden");
        if (btn.dataset.close === "win-shop") this.shop = null;
      })
    );
    $("hot-bag").addEventListener("click", () => this.toggle("win-bag"));
    $("hot-char").addEventListener("click", () => this.toggle("win-char"));
    $("hot-potion").addEventListener("click", () => this.drinkPotion());
    $("respawn").addEventListener("click", () => this.send({ t: "respawn" }));
    const chatInput = $<HTMLInputElement>("chat-input");
    $("chat-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (text) this.send({ t: "chat", text });
      chatInput.value = "";
      chatInput.blur();
    });
    chatInput.addEventListener("focus", () => (this.chatFocused = true));
    chatInput.addEventListener("blur", () => (this.chatFocused = false));
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") chatInput.blur();
    });
    this.makeDraggable("win-bag");
    this.makeDraggable("win-char");
    this.makeDraggable("win-shop");
  }

  show(): void {
    $("hud").classList.remove("hidden");
  }

  hide(): void {
    $("hud").classList.add("hidden");
  }

  toggle(id: string, force?: boolean): void {
    const el = $(id);
    const open = force ?? el.classList.contains("hidden");
    el.classList.toggle("hidden", !open);
    if (id === "win-shop" && !open) this.shop = null;
  }

  focusChat(prefill = ""): void {
    const input = $<HTMLInputElement>("chat-input");
    input.value = prefill;
    input.focus();
  }

  closeAll(): boolean {
    let closed = false;
    for (const id of ["win-bag", "win-char", "win-shop"]) {
      if (!$(id).classList.contains("hidden")) {
        $(id).classList.add("hidden");
        closed = true;
      }
    }
    this.shop = null;
    return closed;
  }

  private makeDraggable(id: string): void {
    const win = $(id);
    const header = win.querySelector("header")!;
    header.addEventListener("pointerdown", (e) => {
      if ((e.target as HTMLElement).closest("button")) return;
      const rect = win.getBoundingClientRect();
      const ox = e.clientX - rect.left;
      const oy = e.clientY - rect.top;
      const move = (ev: PointerEvent) => {
        win.style.left = `${Math.max(0, Math.min(innerWidth - 60, ev.clientX - ox))}px`;
        win.style.top = `${Math.max(0, Math.min(innerHeight - 40, ev.clientY - oy))}px`;
        win.style.right = "auto";
        win.style.transform = "none";
      };
      const up = () => {
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", up);
      };
      addEventListener("pointermove", move);
      addEventListener("pointerup", up);
    });
  }

  // ── self / bars ─────────────────────────────────────────────────────────────

  setSelf(self: SelfState): void {
    this.self = self;
    $("hud-name").textContent = self.name;
    $("hud-level").textContent = String(self.lv);
    $("hud-gold").textContent = self.gold.toLocaleString();
    const xpPct = Math.min(1, self.xp / Math.max(1, self.xpNext));
    $("hud-xp-fill").style.transform = `scaleX(${xpPct})`;
    $("hud-xp-text").textContent = `${self.xp} / ${self.xpNext} XP`;
    $("hot-char-badge").classList.toggle("hidden", self.statPoints <= 0);
    $("hot-attack").querySelector(".ico")!.textContent = self.cls === "ranger" ? "🏹" : self.cls === "mage" ? "🔥" : "⚔️";
    let potions = 0;
    for (const it of self.inv) if (it && itemTemplate(it.tpl)?.kind === "potion") potions += it.qty;
    $("hot-potion-count").textContent = String(potions);
    this.renderBag();
    this.renderChar();
    if (this.shop) this.renderShop();
  }

  /** While flying: the hull uses the HP bar and shields get their own bar. */
  setShield(pct: number | null): void {
    $("hud-shield").classList.toggle("hidden", pct === null);
    document.querySelector(".hud-portrait")!.classList.toggle("flying", pct !== null);
    if (pct !== null) $("hud-shield-fill").style.transform = `scaleX(${Math.max(0, Math.min(1, pct / 100))})`;
  }

  setHp(hp: number, mhp: number): void {
    $("hud-hp-fill").style.transform = `scaleX(${Math.max(0, Math.min(1, hp / Math.max(1, mhp)))})`;
    $("hud-hp-text").textContent = `${Math.ceil(hp)} / ${mhp}`;
  }

  setCooldown(frac: number): void {
    $("hot-attack-cd").style.transform = `scaleY(${Math.max(0, Math.min(1, frac))})`;
  }

  setDead(dead: boolean): void {
    $("death").classList.toggle("hidden", !dead);
  }

  setZone(text: string): void {
    const el = $("hud-zone");
    if (el.textContent !== text) el.textContent = text;
  }

  setHint(text: string | null): void {
    const el = $("interact-hint");
    el.classList.toggle("hidden", !text);
    if (text && el.textContent !== text) el.textContent = text;
  }

  drinkPotion(): void {
    if (!this.self) return;
    let best = -1;
    let bestHeal = Infinity;
    this.self.inv.forEach((it, i) => {
      const tpl = it ? itemTemplate(it.tpl) : null;
      if (tpl?.kind === "potion" && (tpl.heal ?? 0) < bestHeal) {
        bestHeal = tpl.heal ?? 0;
        best = i;
      }
    });
    if (best >= 0) this.send({ t: "use", slot: best });
    else this.toast("No tonics left!", "bad");
  }

  // ── chat / toasts ───────────────────────────────────────────────────────────

  chat(name: string, text: string, kind: "say" | "system" | "npc"): void {
    const log = $("chat-log");
    const line = document.createElement("div");
    line.className = kind;
    if (kind === "system") line.textContent = text;
    else {
      const b = document.createElement("b");
      b.textContent = `${name}: `;
      line.append(b, document.createTextNode(text));
    }
    const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 8;
    log.appendChild(line);
    while (log.children.length > 120) log.firstChild?.remove();
    if (atBottom) log.scrollTop = log.scrollHeight;
  }

  toast(text: string, kind: "info" | "good" | "bad" = "info"): void {
    const el = document.createElement("div");
    el.className = `toast ${kind}`;
    el.textContent = text;
    $("toasts").appendChild(el);
    setTimeout(() => el.remove(), 3300);
  }

  // ── items ───────────────────────────────────────────────────────────────────

  private slotEl(item: Item | null, extraClass = ""): HTMLDivElement {
    const el = document.createElement("div");
    el.className = `slot ${item ? `r-${item.rarity}` : "empty"} ${extraClass}`;
    if (item) {
      el.textContent = itemTemplate(item.tpl)?.icon ?? "❔";
      if (item.qty > 1) {
        const q = document.createElement("span");
        q.className = "qty";
        q.textContent = String(item.qty);
        el.appendChild(q);
      }
      if (item.lvl > 1) {
        const l = document.createElement("span");
        l.className = "lvl";
        l.textContent = `L${item.lvl}`;
        el.appendChild(l);
      }
      el.addEventListener("pointerenter", (e) => this.showTooltip(item, e.clientX, e.clientY));
      el.addEventListener("pointermove", (e) => this.moveTooltip(e.clientX, e.clientY));
      el.addEventListener("pointerleave", () => this.hideTooltip());
    }
    return el;
  }

  private renderBag(): void {
    const grid = $("bag-grid");
    grid.replaceChildren();
    if (!this.self) return;
    this.self.inv.forEach((item, i) => {
      const el = this.slotEl(item);
      if (item && this.offeredUids.has(item.uid)) el.classList.add("offered");
      el.draggable = Boolean(item);
      el.addEventListener("click", (e) => {
        if (!item) return;
        this.hideTooltip();
        if (this.bagClickOverride) return this.bagClickOverride(i);
        if (e.shiftKey && this.shop) this.send({ t: "sell", slot: i });
        else this.send({ t: "use", slot: i });
      });
      el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (!item) return;
        this.hideTooltip();
        if (this.shop) this.send({ t: "sell", slot: i });
        else this.send({ t: "drop", slot: i });
      });
      el.addEventListener("dragstart", () => (this.dragFrom = i));
      el.addEventListener("dragover", (e) => {
        e.preventDefault();
        el.classList.add("dragover");
      });
      el.addEventListener("dragleave", () => el.classList.remove("dragover"));
      el.addEventListener("drop", (e) => {
        e.preventDefault();
        el.classList.remove("dragover");
        if (this.dragFrom !== null && this.dragFrom !== i) this.send({ t: "swap", from: this.dragFrom, to: i });
        this.dragFrom = null;
      });
      grid.appendChild(el);
    });
  }

  private renderChar(): void {
    const s = this.self;
    if (!s) return;
    $("char-title").textContent = `${s.name} · ${CLASSES[s.cls].name} · Lv ${s.lv}`;
    const slots = $("equip-slots");
    slots.replaceChildren();
    for (const slot of EQUIP_SLOTS) {
      const wrap = document.createElement("div");
      wrap.className = "slot-wrap";
      const el = this.slotEl(s.equip[slot]);
      if (s.equip[slot]) el.addEventListener("click", () => {
        this.hideTooltip();
        this.send({ t: "unequip", slot });
      });
      const label = document.createElement("span");
      label.textContent = EQUIP_LABEL[slot];
      wrap.append(el, label);
      slots.appendChild(wrap);
    }
    $("char-points").textContent = String(s.statPoints);
    const stats = $("char-stats");
    stats.replaceChildren();
    for (const id of STAT_IDS) {
      const row = document.createElement("div");
      row.className = "stat-row";
      const label = document.createElement("div");
      label.innerHTML = `${STAT_INFO[id].name}<small>${STAT_INFO[id].blurb}</small>`;
      const val = document.createElement("b");
      val.textContent = String(s.stats[id]);
      const btn = document.createElement("button");
      btn.textContent = "+";
      btn.disabled = s.statPoints <= 0;
      btn.addEventListener("click", () => this.send({ t: "stat", stat: id }));
      row.append(label, val, btn);
      stats.appendChild(row);
    }
    const d = s.derived;
    $("char-derived").innerHTML =
      `<span>Health</span><b>${d.maxHp}</b><span>Damage</span><b>${d.damage}</b>` +
      `<span>Armour</span><b>${d.armor}</b><span>Speed</span><b>${d.speed}</b>` +
      (d.blockChance ? `<span>Block</span><b>${Math.round(d.blockChance * 100)}%</b>` : "") +
      `<span>Kills</span><b>${s.kills}</b>`;
  }

  openShop(shop: ShopView | null): void {
    this.shop = shop;
    if (!shop) {
      $("win-shop").classList.add("hidden");
      return;
    }
    this.renderShop();
    $("win-shop").classList.remove("hidden");
    $("win-bag").classList.remove("hidden");
  }

  private renderShop(): void {
    const shop = this.shop;
    if (!shop) return;
    $("shop-title").textContent = shop.name;
    $("shop-greeting").textContent = `"${shop.greeting}"`;
    const list = $("shop-stock");
    list.replaceChildren();
    for (const entry of shop.stock) {
      const row = document.createElement("div");
      row.className = "shop-item";
      const tpl = itemTemplate(entry.item.tpl);
      const info = document.createElement("div");
      const restricted = tpl?.cls && this.self && tpl.cls !== this.self.cls ? ` · ${CLASSES[tpl.cls].name} only` : "";
      info.innerHTML = `<div>${itemName(entry.item)}</div><small>${describe(entry.item)}${restricted}</small>`;
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = `${entry.price}g`;
      btn.disabled = (this.self?.gold ?? 0) < entry.price;
      btn.addEventListener("click", () => this.send({ t: "buy", shop: shop.id, idx: entry.idx }));
      row.append(this.slotEl(entry.item), info, btn);
      list.appendChild(row);
    }
  }

  // ── tooltip ─────────────────────────────────────────────────────────────────

  private showTooltip(item: Item, x: number, y: number): void {
    const tip = $("tooltip");
    const tpl = itemTemplate(item.tpl);
    const color = RARITY_INFO[item.rarity].color;
    const cls = tpl?.cls ? `<div class="muted">${CLASSES[tpl.cls].name} weapon</div>` : "";
    tip.innerHTML =
      `<div class="name" style="color:${color}">${itemName(item)}</div>` +
      `<div class="muted" style="text-transform:capitalize">${item.rarity} · item level ${item.lvl}</div>${cls}` +
      `<div>${describe(item)}</div><div class="muted">Sells for ${Math.max(1, Math.round(itemValue(item) * 0.45))}g</div>`;
    tip.classList.remove("hidden");
    this.moveTooltip(x, y);
  }

  private moveTooltip(x: number, y: number): void {
    const tip = $("tooltip");
    tip.style.left = `${Math.min(innerWidth - 250, x + 14)}px`;
    tip.style.top = `${Math.min(innerHeight - 120, y + 14)}px`;
  }

  hideTooltip(): void {
    $("tooltip").classList.add("hidden");
  }

  // ── minimap ─────────────────────────────────────────────────────────────────

  refreshBag(): void {
    this.renderBag();
  }

  private minimapKey = "";

  drawMinimap(map: MapDef, px: number, py: number, facing: number, dots: MinimapDot[], objective: { x: number; y: number } | null = null, scale = 1.25): void {
    const ctx = this.minimapCtx;
    const size = 168;
    const half = size / 2;
    // scale = tiles per pixel
    const key = `${map.id}|${scale}`;
    if (!this.minimapBase || this.minimapKey !== key || Math.hypot(px - this.minimapCenter.x, py - this.minimapCenter.y) > 6 * scale) {
      this.minimapKey = key;
      this.minimapCenter = { x: Math.round(px), y: Math.round(py) };
      const img = ctx.createImageData(size, size);
      for (let j = 0; j < size; j += 1) {
        for (let i = 0; i < size; i += 1) {
          const tx = this.minimapCenter.x + (i - half) * scale;
          const ty = this.minimapCenter.y + (j - half) * scale;
          const t = map.tileAt(tx, ty);
          const c = MINIMAP_COLORS[t] ?? (t >= 20 ? PROP_COLOR : [143, 209, 106]);
          const o = (j * size + i) * 4;
          img.data[o] = c[0];
          img.data[o + 1] = c[1];
          img.data[o + 2] = c[2];
          img.data[o + 3] = 255;
        }
      }
      this.minimapBase = img;
    }
    const ox = (this.minimapCenter.x - px) / scale;
    const oy = (this.minimapCenter.y - py) / scale;
    ctx.clearRect(0, 0, size, size);
    ctx.putImageData(this.minimapBase, Math.round(ox), Math.round(oy));
    for (const d of dots) {
      const dx = half + (d.x - px) / scale;
      const dy = half + (d.y - py) / scale;
      if (dx < 0 || dy < 0 || dx > size || dy > size) continue;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(dx, dy, d.size, 0, Math.PI * 2);
      ctx.fill();
    }
    // Quest objective: a golden star, or an arrow at the rim when it's off the map.
    if (objective) {
      let ox = (objective.x - px) / scale;
      let oy = (objective.y - py) / scale;
      const d = Math.hypot(ox, oy);
      const edge = half - 8;
      const inside = d <= edge;
      if (!inside) {
        ox = (ox / d) * edge;
        oy = (oy / d) * edge;
      }
      ctx.save();
      ctx.translate(half + ox, half + oy);
      ctx.fillStyle = "#ffc94d";
      ctx.strokeStyle = "#8a5a1a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (inside) {
        for (let i = 0; i < 10; i += 1) {
          const r = i % 2 ? 3 : 7;
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
      } else {
        ctx.rotate(Math.atan2(oy, ox));
        ctx.moveTo(7, 0);
        ctx.lineTo(-4, 5);
        ctx.lineTo(-4, -5);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // Player arrow
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(facing + Math.PI / 2);
    ctx.fillStyle = "#ff6f8e";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
}

export function describe(item: Item): string {
  const tpl = itemTemplate(item.tpl);
  const parts: string[] = [];
  if (item.dmg) parts.push(`+${item.dmg} damage`);
  if (item.armor) parts.push(`+${item.armor} armour`);
  if (item.hp) parts.push(`+${item.hp} health`);
  if (item.str) parts.push(`+${item.str} strength`);
  if (tpl?.heal) parts.push(`Restores ${tpl.heal} health`);
  if (tpl?.kind === "junk") parts.push("A curiosity. Vendors like these.");
  return parts.join(" · ") || "—";
}
