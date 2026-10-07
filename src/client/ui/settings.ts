// Settings: volumes, graphics quality, camera feel and interface options, saved in this browser.

import type { Audio } from "../audio";

export interface Settings {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
  quality: "auto" | "low" | "high";
  camSpeed: number;
  nameplates: boolean;
  uiScale: number;
  fps: boolean;
}

const KEY = "balathor.v2.settings";
const DEFAULTS: Settings = { master: 0.8, music: 0.5, sfx: 0.8, muted: false, quality: "auto", camSpeed: 1, nameplates: true, uiScale: 1, fps: false };

export function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Settings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private mode / storage blocked: settings just don't persist.
  }
}

export class SettingsUI {
  readonly s = loadSettings();
  private root: HTMLElement;
  private fpsEl: HTMLElement;
  private frames = 0;
  private fpsAt = 0;
  /** Called when something the game needs to react to changes. */
  onChange: (s: Settings) => void = () => {};

  constructor(private audio: Audio) {
    this.root = document.createElement("div");
    this.root.id = "win-settings";
    this.root.className = "window card hidden";
    this.root.innerHTML = `
      <header><h3>⚙️ Settings</h3><button class="x">✕</button></header>
      <div class="settings">
        <h4>Sound</h4>
        <label>Master <input type="range" min="0" max="1" step="0.05" data-k="master"></label>
        <label>Music <input type="range" min="0" max="1" step="0.05" data-k="music"></label>
        <label>Effects <input type="range" min="0" max="1" step="0.05" data-k="sfx"></label>
        <label class="row"><input type="checkbox" data-k="muted"> Mute everything</label>
        <h4>Graphics</h4>
        <label>Quality <select data-k="quality"><option value="auto">Auto</option><option value="low">Low (faster)</option><option value="high">High (god rays, MSAA)</option></select></label>
        <small class="tip">Quality changes apply after a reload.</small>
        <label class="row"><input type="checkbox" data-k="fps"> Show FPS</label>
        <h4>Controls & interface</h4>
        <label>Camera speed <input type="range" min="0.3" max="2.5" step="0.1" data-k="camSpeed"></label>
        <label>Interface size <input type="range" min="0.75" max="1.3" step="0.05" data-k="uiScale"></label>
        <label class="row"><input type="checkbox" data-k="nameplates"> Show nameplates</label>
        <h4>Keys</h4>
        <p class="tip keys">WASD move · Shift sprint · Space jump · F / click attack · 1-5 abilities · Q potion · E interact · I bag · C character · T talents · L quests · P professions · K leaderboards · M mount · H decorate (home) · J warp (space) · Enter chat · Esc close</p>
      </div>`;
    document.getElementById("hud")!.appendChild(this.root);
    this.fpsEl = document.createElement("div");
    this.fpsEl.className = "fps hidden";
    document.body.appendChild(this.fpsEl);
    this.root.querySelector(".x")!.addEventListener("click", () => this.hide());
    for (const input of this.root.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-k]")) {
      const k = input.dataset.k as keyof Settings;
      if (input instanceof HTMLInputElement && input.type === "checkbox") input.checked = Boolean(this.s[k]);
      else input.value = String(this.s[k]);
      input.addEventListener("input", () => {
        const v = input instanceof HTMLInputElement && input.type === "checkbox" ? input.checked : input instanceof HTMLInputElement ? Number(input.value) : input.value;
        (this.s as unknown as Record<string, unknown>)[k] = v;
        if (k === "quality") {
          try {
            localStorage.setItem("balathor.v2.quality", String(v));
          } catch {
            // ignore
          }
        }
        save(this.s);
        this.apply();
      });
      input.addEventListener("keydown", (e) => e.stopPropagation());
    }
    this.apply();
  }

  get open(): boolean {
    return !this.root.classList.contains("hidden");
  }

  toggle(): void {
    this.root.classList.toggle("hidden");
  }

  hide(): void {
    this.root.classList.add("hidden");
  }

  apply(): void {
    this.audio.volumes = { master: this.s.master, music: this.s.music, sfx: this.s.sfx };
    this.audio.muted = this.s.muted;
    this.audio.applyVolumes();
    const hud = document.getElementById("hud");
    if (hud) (hud.style as unknown as { zoom: string }).zoom = String(this.s.uiScale);
    document.body.classList.toggle("no-plates", !this.s.nameplates);
    this.fpsEl.classList.toggle("hidden", !this.s.fps);
    this.onChange(this.s);
  }

  tick(now: number): void {
    if (!this.s.fps) return;
    this.frames += 1;
    if (now - this.fpsAt >= 1000) {
      this.fpsEl.textContent = `${this.frames} fps`;
      this.frames = 0;
      this.fpsAt = now;
    }
  }
}
