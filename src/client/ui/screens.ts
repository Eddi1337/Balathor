// Title (login / register) and character-creation screens.

import type { Appearance, C2S } from "../../shared/protocol";
import { CLASSES, CLASS_IDS, type ClassId } from "../../shared/game/classes";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const PALETTES: Record<"body" | "accent" | "skin" | "hair", string[]> = {
  body: ["#6dbb6a", "#7b6cf0", "#5b8def", "#ff8fb1", "#ffb38a", "#f2b950", "#7ed6b4", "#c98bd8", "#e57a5a", "#6c5f7d"],
  accent: ["#7a5234", "#ffd166", "#d9dde6", "#ffffff", "#ff6f8e", "#8fd3ff", "#3b2f4a", "#b9a3ff"],
  skin: ["#ffe3cf", "#ffd9b8", "#f2c09a", "#d99a6c", "#b5764a", "#8a5634", "#a6e3c9", "#c9d6ff"],
  hair: ["#5a3a2a", "#2b2238", "#f2d17a", "#e57a5a", "#ff8fb1", "#b9a3ff", "#8fd3ff", "#ffffff", "#7ed6b4"]
};
const HAIR_STYLES = ["Tidy", "Tufts", "Ponytail", "Spiky", "Buns"];
const CLASS_ICONS: Record<ClassId, string> = { ranger: "🏹", mage: "🔮", knight: "🛡️" };

export class Screens {
  cls: ClassId = "ranger";
  look: Appearance = { body: CLASSES.ranger.colors.body, accent: CLASSES.ranger.colors.accent, skin: "#ffd9b8", hair: "#5a3a2a", hairStyle: 0 };
  onLookChange: (cls: ClassId, look: Appearance) => void = () => {};
  private pendingMode: "login" | "register" = "login";

  constructor(private send: (msg: C2S) => void) {
    const form = $<HTMLFormElement>("auth-form");
    form.querySelectorAll<HTMLButtonElement>("button[data-mode]").forEach((btn) =>
      btn.addEventListener("click", () => (this.pendingMode = btn.dataset.mode as "login" | "register"))
    );
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const user = $<HTMLInputElement>("auth-user").value.trim();
      const pass = $<HTMLInputElement>("auth-pass").value;
      this.setAuthStatus(this.pendingMode === "register" ? "Creating your account…" : "Logging in…", false);
      this.setAuthBusy(true);
      this.send({ t: "auth", mode: this.pendingMode, user, pass });
    });
    this.buildCreator();
  }

  showAuth(): void {
    $("screen-auth").classList.remove("hidden");
    $("screen-create").classList.add("hidden");
    setTimeout(() => $<HTMLInputElement>("auth-user").focus(), 50);
  }

  showCreate(): void {
    $("screen-auth").classList.add("hidden");
    $("screen-create").classList.remove("hidden");
    this.onLookChange(this.cls, this.look);
  }

  hideAll(): void {
    $("screen-auth").classList.add("hidden");
    $("screen-create").classList.add("hidden");
  }

  setAuthStatus(text: string, error = true): void {
    const el = $("auth-status");
    el.textContent = text;
    el.style.color = error ? "" : "var(--ink-soft)";
  }

  setAuthBusy(busy: boolean): void {
    document.querySelectorAll<HTMLButtonElement>("#auth-form button").forEach((b) => (b.disabled = busy));
  }

  setCreateStatus(text: string): void {
    $("create-status").textContent = text;
    $<HTMLButtonElement>("create-go").disabled = false;
  }

  private buildCreator(): void {
    const picker = $("class-picker");
    for (const id of CLASS_IDS) {
      const def = CLASSES[id];
      const card = document.createElement("button");
      card.type = "button";
      card.className = `class-card ${id === this.cls ? "selected" : ""}`;
      card.innerHTML = `<span class="icon">${CLASS_ICONS[id]}</span><b>${def.name}</b><small>${def.blurb}</small>`;
      card.addEventListener("click", () => {
        this.cls = id;
        this.look.body = def.colors.body;
        this.look.accent = def.colors.accent;
        picker.querySelectorAll(".class-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        this.refreshSwatches();
        this.onLookChange(this.cls, this.look);
      });
      picker.appendChild(card);
    }
    this.refreshSwatches();
    $("create-go").addEventListener("click", () => {
      const name = $<HTMLInputElement>("create-name").value.trim();
      if (!/^[A-Za-z][A-Za-z0-9 '-]{1,15}$/.test(name)) {
        this.setCreateStatus("Names are 2-16 letters and start with a letter.");
        return;
      }
      $<HTMLButtonElement>("create-go").disabled = true;
      $("create-status").textContent = "";
      this.send({ t: "create", name, cls: this.cls, look: { ...this.look } });
    });
  }

  private refreshSwatches(): void {
    document.querySelectorAll<HTMLDivElement>(".swatch-row").forEach((row) => {
      const key = row.dataset.look as keyof Appearance;
      row.replaceChildren();
      if (key === "hairStyle") {
        HAIR_STYLES.forEach((label, i) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = `swatch text ${this.look.hairStyle === i ? "selected" : ""}`;
          b.textContent = label;
          b.addEventListener("click", () => {
            this.look.hairStyle = i;
            this.refreshSwatches();
            this.onLookChange(this.cls, this.look);
          });
          row.appendChild(b);
        });
        return;
      }
      for (const color of PALETTES[key as "body" | "accent" | "skin" | "hair"]) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = `swatch ${this.look[key] === color ? "selected" : ""}`;
        b.style.background = color;
        b.title = color;
        b.addEventListener("click", () => {
          (this.look as unknown as Record<string, string>)[key] = color;
          this.refreshSwatches();
          this.onLookChange(this.cls, this.look);
        });
        row.appendChild(b);
      }
    });
  }
}
