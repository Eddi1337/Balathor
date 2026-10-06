// Minigame UI: the tracker (title, timer, progress, quit), the little game windows (darts, Hold'em,
// memory tiles, the appraiser, the mining rig / hull patching timing bars, the trophy pedestal)
// and the leaderboards (K).

import type { C2S, MgView, SelfState } from "../../shared/protocol";
import { GAMES, TROPHIES, type GameId } from "../../shared/game/minigames";

function el(tag: string, cls: string, html = ""): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  e.innerHTML = html;
  return e;
}

function shell(id: string, title: string): { root: HTMLElement; body: HTMLElement; setTitle(t: string): void } {
  const root = el("div", "window card hidden");
  root.id = id;
  const header = el("header", "", `<h3>${title}</h3>`);
  const x = el("button", "x", "✕");
  header.appendChild(x);
  const body = el("div", "");
  root.append(header, body);
  document.getElementById("hud")!.appendChild(root);
  x.addEventListener("click", () => root.classList.add("hidden"));
  return { root, body, setTitle: (t) => ((header.querySelector("h3") as HTMLElement).textContent = t) };
}

export class MinigameUI {
  private tracker: HTMLElement;
  private game = shell("win-mg", "Minigame");
  private boards = shell("win-boards", "🏆 Leaderboards");
  view: MgView | null = null;
  /** Local clock reading matching the session's start (for wobble / needle games). */
  private t0 = 0;
  private self: SelfState | null = null;
  private raf = 0;
  private canvas: HTMLCanvasElement | null = null;

  constructor(private send: (m: C2S) => void) {
    this.tracker = el("div", "mg-tracker card hidden");
    document.getElementById("hud")!.appendChild(this.tracker);
    this.game.root.querySelector(".x")!.addEventListener("click", () => {
      if (this.view && this.view.game !== "pedestal") this.send({ t: "mg", op: "quit" });
    });
  }

  setSelf(s: SelfState): void {
    this.self = s;
  }

  get windowOpen(): boolean {
    return !this.game.root.classList.contains("hidden") || !this.boards.root.classList.contains("hidden");
  }

  closeWindows(): void {
    this.boards.root.classList.add("hidden");
    if (!this.game.root.classList.contains("hidden")) {
      this.game.root.classList.add("hidden");
      if (this.view && GAMES[this.view.game as GameId]?.kind === "overlay") this.send({ t: "mg", op: "quit" });
    }
  }

  /** A new session state from the server (null = ended). */
  set(v: MgView | null): void {
    const first = !this.view || !v || this.view.game !== v.game;
    this.view = v;
    if (!v) {
      this.tracker.classList.add("hidden");
      this.game.root.classList.add("hidden");
      cancelAnimationFrame(this.raf);
      return;
    }
    const kind = GAMES[v.game as GameId]?.kind;
    // The wobble / needle clock starts when the session does (the server allows a little slack).
    if (first) this.t0 = performance.now();
    this.renderTracker();
    if (kind === "overlay" || v.game === "pedestal") {
      this.game.setTitle(v.title);
      this.game.root.classList.remove("hidden");
      this.renderGame(first);
    }
  }

  private renderTracker(): void {
    const v = this.view;
    if (!v || v.game === "pedestal") {
      this.tracker.classList.add("hidden");
      return;
    }
    this.tracker.classList.remove("hidden");
    this.tracker.innerHTML = `<b>${v.title}</b><span class="mg-time"></span><div class="mg-text">${v.text}</div>`;
    const quit = el("button", "btn small", "Quit");
    quit.addEventListener("click", () => this.send({ t: "mg", op: "quit" }));
    this.tracker.appendChild(quit);
    this.tracker.dataset.ends = String(performance.now() + v.ms);
    this.tracker.dataset.timed = v.ms > 0 ? "1" : "";
  }

  /** Called every frame: timers and animated widgets. */
  update(now: number): void {
    if (!this.view) return;
    const tm = this.tracker.querySelector(".mg-time") as HTMLElement | null;
    if (tm && this.tracker.dataset.timed) {
      const left = Math.max(0, (Number(this.tracker.dataset.ends) - now) / 1000);
      tm.textContent = `⏱ ${left >= 60 ? `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")}` : left.toFixed(1)}`;
    }
  }

  private elapsed(): number {
    return performance.now() - this.t0;
  }

  private renderGame(first: boolean): void {
    const v = this.view!;
    const body = this.game.body;
    const ui = (v.ui ?? {}) as Record<string, unknown>;
    if (v.game === "darts" || v.game === "rig" || v.game === "repair") {
      if (first || !this.canvas) {
        body.replaceChildren();
        this.canvas = document.createElement("canvas");
        this.canvas.width = 280;
        this.canvas.height = v.game === "darts" ? 280 : 90;
        this.canvas.className = "mg-canvas";
        body.append(el("p", "tip mg-blurb", GAMES[v.game as GameId].blurb), this.canvas, el("div", "mg-status", ""));
        const btn = el("button", "btn primary big", v.game === "darts" ? "🎯 Throw!" : v.game === "rig" ? "⛏️ Pulse!" : "🔨 Hammer!");
        btn.addEventListener("click", () => this.send({ t: "mg", op: "act", action: v.game === "darts" ? "throw" : "pulse", value: Math.round(this.elapsed()) }));
        this.canvas.addEventListener("click", () => btn.click());
        body.appendChild(btn);
        cancelAnimationFrame(this.raf);
        const loop = () => {
          this.raf = requestAnimationFrame(loop);
          this.drawTiming();
        };
        loop();
      }
      const status = body.querySelector(".mg-status") as HTMLElement;
      status.textContent =
        v.game === "darts" ? `Darts left: ${ui.throws ?? 3} · Score: ${ui.total ?? 0}${ui.last ? ` · Last: ${(ui.last as { pts: number }).pts}` : ""}` : `Tries left: ${ui.left ?? 5} · Hits: ${ui.hits ?? 0}`;
      return;
    }
    cancelAnimationFrame(this.raf);
    this.canvas = null;
    if (v.game !== "memory") body.replaceChildren();
    if (v.game === "holdem") {
      const card = (c: string) => `<span class="pcard ${c === "?" ? "back" : /[♥♦]/.test(c) ? "red" : ""}">${c === "?" ? "🂠" : c.replace("T", "10")}</span>`;
      body.innerHTML = `
        <div class="holdem">
          <div class="row"><small>House</small>${(ui.house as string[]).map(card).join("")}${ui.house2 ? `<small>${ui.house2}</small>` : ""}</div>
          <div class="row board">${(ui.board as string[]).map(card).join("")}</div>
          <div class="row"><small>You</small>${(ui.you as string[]).map(card).join("")}${ui.you2 ? `<small>${ui.you2}</small>` : ""}</div>
          <p class="tip">${v.text}</p>
        </div>`;
      if (ui.stage === "flop") {
        const raise = el("button", "btn primary", "Raise 20g");
        raise.addEventListener("click", () => this.send({ t: "mg", op: "act", action: "raise" }));
        const fold = el("button", "btn", "Fold");
        fold.addEventListener("click", () => this.send({ t: "mg", op: "act", action: "fold" }));
        const row = el("div", "mg-actions");
        row.append(raise, fold);
        body.appendChild(row);
      }
      return;
    }
    if (v.game === "memory") {
      // Update the board in place so clicks never land on a tile that's being replaced.
      const existing = body.querySelector(".memory-grid");
      if (existing && !first) {
        (ui.shown as string[]).forEach((icon, i) => {
          const b = existing.children[i] as HTMLElement;
          b.textContent = icon || "❔";
          b.classList.toggle("up", Boolean(icon));
        });
        (body.querySelector(".tip") as HTMLElement).textContent = `Flips: ${ui.flips ?? 0}`;
        return;
      }
      body.replaceChildren();
      const grid = el("div", "memory-grid");
      (ui.shown as string[]).forEach((icon, i) => {
        const b = el("button", `memory-tile${icon ? " up" : ""}`, icon || "❔");
        b.addEventListener("click", () => this.send({ t: "mg", op: "act", action: "flip", value: i }));
        grid.appendChild(b);
      });
      body.append(el("p", "tip", `Flips: ${ui.flips ?? 0}`), grid);
      return;
    }
    if (v.game === "appraiser") {
      body.appendChild(el("p", "tip", `${v.text} (${ui.items} items in your bag)`));
      const input = el("input", "mg-input") as HTMLInputElement;
      input.type = "number";
      input.min = "0";
      input.placeholder = "Your guess in gold";
      const go = el("button", "btn primary", "Guess");
      go.addEventListener("click", () => this.send({ t: "mg", op: "act", action: "guess", value: Number(input.value) }));
      input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") go.click();
      });
      const row = el("div", "mg-actions");
      row.append(input, go);
      body.appendChild(row);
      setTimeout(() => input.focus(), 50);
      return;
    }
    if (v.game === "pedestal") {
      const owned = (ui.trophies as string[]) ?? [];
      body.appendChild(el("p", "tip", owned.length ? "Pick a trophy to wear as your title:" : "No trophies yet. Win minigames to earn them!"));
      const grid = el("div", "trophy-grid");
      for (const [id, t] of Object.entries(TROPHIES)) {
        const has = owned.includes(id);
        const b = el("button", `trophy${has ? "" : " locked"}`, `<span class="ico">${has ? t.icon : "🔒"}</span><small>${t.name}</small>`) as HTMLButtonElement;
        b.disabled = !has;
        b.addEventListener("click", () => {
          this.send({ t: "mg", op: "title", action: id });
          this.game.root.classList.add("hidden");
          this.view = null;
        });
        grid.appendChild(b);
      }
      const none = el("button", "btn small", "Remove title");
      none.addEventListener("click", () => {
        this.send({ t: "mg", op: "title", action: "" });
        this.game.root.classList.add("hidden");
        this.view = null;
      });
      body.append(grid, none);
    }
  }

  private drawTiming(): void {
    const v = this.view;
    const c = this.canvas;
    if (!v || !c) return;
    const ctx = c.getContext("2d")!;
    const t = this.elapsed() / 1000;
    const ui = (v.ui ?? {}) as Record<string, number | null | object>;
    const seed = Number(ui.seed) || 0;
    ctx.clearRect(0, 0, c.width, c.height);
    if (v.game === "darts") {
      const cx = c.width / 2;
      const cy = c.height / 2;
      const R = c.width / 2 - 8;
      const rings: [number, string][] = [[0.9, "#ffe8d6"], [0.62, "#ff8fb1"], [0.42, "#fff1e6"], [0.22, "#7fc8ff"], [0.08, "#ffd166"]];
      for (const [r, col] of rings) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy, r * R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#3b2f4a33";
        ctx.stroke();
      }
      const last = ui.last as { x: number; y: number } | null;
      if (last) {
        ctx.fillStyle = "#3b2f4a";
        ctx.beginPath();
        ctx.arc(cx + last.x * R, cy + last.y * R, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      // The wobbling aim (the server uses the same formula).
      const ax = Math.sin(t * 1.9 + seed) * 0.75 + Math.sin(t * 4.3 + seed * 2) * 0.2;
      const ay = Math.cos(t * 1.5 + seed * 3) * 0.75 + Math.sin(t * 3.7 + seed) * 0.2;
      ctx.strokeStyle = "#e0405e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx + ax * R, cy + ay * R, 9, 0, Math.PI * 2);
      ctx.moveTo(cx + ax * R - 14, cy + ay * R);
      ctx.lineTo(cx + ax * R + 14, cy + ay * R);
      ctx.moveTo(cx + ax * R, cy + ay * R - 14);
      ctx.lineTo(cx + ax * R, cy + ay * R + 14);
      ctx.stroke();
      return;
    }
    // Needle games: a bar with a sweet spot and a swinging needle.
    const zone = Number(ui.zone) || 0.5;
    const needle = (Math.sin(t * 2.6 + seed) + 1) / 2;
    const w = c.width - 20;
    ctx.fillStyle = "#3b2f4a22";
    ctx.fillRect(10, 30, w, 30);
    ctx.fillStyle = v.game === "rig" ? "#9dffb8" : "#ffd166";
    ctx.fillRect(10 + (zone - 0.09) * w, 30, 0.18 * w, 30);
    ctx.fillStyle = "#3b2f4a";
    ctx.fillRect(10 + needle * w - 2, 22, 4, 46);
  }

  // ── leaderboards ───────────────────────────────────────────────────────────

  toggleBoards(): void {
    const r = this.boards.root;
    r.classList.toggle("hidden");
    if (r.classList.contains("hidden")) return;
    const body = this.boards.body;
    body.replaceChildren();
    const tabs = el("div", "board-tabs");
    const list = el("div", "board-list", "<p class='tip'>Pick a game.</p>");
    for (const [id, g] of Object.entries(GAMES)) {
      if (!g.board) continue;
      const b = el("button", "btn small", `${g.icon} ${g.name}`);
      b.addEventListener("click", () => {
        tabs.querySelectorAll(".btn").forEach((x) => x.classList.remove("primary"));
        b.classList.add("primary");
        list.innerHTML = "<p class='tip'>Loading…</p>";
        this.send({ t: "mg", op: "board", game: id });
      });
      tabs.appendChild(b);
    }
    body.append(tabs, list);
    (tabs.firstElementChild as HTMLElement | null)?.click();
    const mine = this.self?.trophies.length ?? 0;
    body.appendChild(el("p", "tip", `You have ${mine} of ${Object.keys(TROPHIES).length} trophies.`));
  }

  showBoard(game: string, rows: { name: string; score: number }[]): void {
    const list = this.boards.body.querySelector(".board-list") as HTMLElement | null;
    if (!list) return;
    const g = GAMES[game as GameId];
    list.innerHTML = rows.length
      ? `<ol class="board-rows">${rows.map((r) => `<li><span>${r.name}</span><b>${r.score} ${g.board?.unit ?? ""}</b></li>`).join("")}</ol>`
      : "<p class='tip'>No scores yet. Be the first!</p>";
  }
}
