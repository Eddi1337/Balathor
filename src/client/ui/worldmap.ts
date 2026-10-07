// The world map (N): the whole current map drawn from the shared world generator, with you, your
// party and points of interest. Moderators can click anywhere on it to teleport there.

import type { MapDef } from "../../shared/world/maps";
import { Tile } from "../../shared/world/tiles";

const SIZE = 520;
/** The map is sampled at half resolution (4x fewer world lookups) and scaled up. */
const RES = 260;

const COLORS: Record<number, string> = {
  [Tile.GRASS]: "#8fd16a", [Tile.MEADOW]: "#a6de7a", [Tile.FLOWERS]: "#bee18c", [Tile.DARK_GRASS]: "#6cbd5c",
  [Tile.SAND]: "#f5e1a6", [Tile.SHALLOW]: "#8cd2dc", [Tile.WATER]: "#5cb2e8", [Tile.SNOW]: "#f4f8ff",
  [Tile.ASH]: "#9a8a8e", [Tile.MUD]: "#9a8a5c", [Tile.PATH]: "#ecd09a", [Tile.COBBLE]: "#d9cfc4",
  [Tile.PLAZA]: "#f0e2cf", [Tile.WALL]: "#968c82", [Tile.BUILDING]: "#e57a5a", [Tile.FOUNTAIN]: "#8fe3ff",
  [Tile.FLOOR]: "#d8b48a", [Tile.FIELD]: "#b98f5e", [Tile.RIVER]: "#66cde6", [Tile.VOID]: "#0e102a",
  [Tile.FORCEFIELD]: "#3c468c", [Tile.METAL_FLOOR]: "#c8d0de", [Tile.METAL_WALL]: "#465068", [Tile.GLASS]: "#7fc8f0",
  [Tile.PAD]: "#7fe8ff", [Tile.CONSOLE]: "#6a7488", [Tile.PLANTER]: "#7fe0a8", [Tile.ROCK]: "#7a7c88"
};

export class WorldMap {
  private root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private base: HTMLCanvasElement;
  private mapId = "";
  private row = 0;
  private extent = 100;
  private center = { x: 0, y: 0 };
  /** Clicked a spot on the map (world coordinates); null = clicking does nothing. */
  onPick: ((x: number, y: number) => void) | null = null;

  constructor() {
    this.root = document.createElement("div");
    this.root.id = "win-worldmap";
    this.root.className = "window card hidden";
    this.root.innerHTML = `<header><h3>🗺️ World map</h3><button class="x">✕</button></header><canvas width="${SIZE}" height="${SIZE}"></canvas><p class="tip wm-tip"></p>`;
    document.getElementById("hud")!.appendChild(this.root);
    this.canvas = this.root.querySelector("canvas")!;
    this.base = document.createElement("canvas");
    this.base.width = this.base.height = RES;
    this.root.querySelector(".x")!.addEventListener("click", () => this.hide());
    this.canvas.addEventListener("click", (e) => {
      if (!this.onPick) return;
      const r = this.canvas.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * SIZE;
      const py = ((e.clientY - r.top) / r.height) * SIZE;
      const k = (this.extent * 2) / SIZE;
      this.onPick(this.center.x - this.extent + px * k, this.center.y - this.extent + py * k);
    });
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

  /** Draw a few rows per frame (the whole island is a lot of tiles). */
  update(map: MapDef, me: { x: number; y: number }, dots: { x: number; y: number; color: string; size: number }[], canTeleport: boolean): void {
    if (!this.open) return;
    if (map.id !== this.mapId) {
      this.mapId = map.id;
      this.row = 0;
      // Decks and interiors start at 0,0; open maps are centred on the origin.
      const boxed = map.kind === "interior" || map.kind === "deck" || map.kind === "cave";
      this.extent = boxed ? map.bounds / 2 + 2 : map.bounds;
      this.center = boxed ? { x: map.bounds / 2, y: map.bounds / 2 } : { x: 0, y: 0 };
      const ctx = this.base.getContext("2d")!;
      ctx.fillStyle = "#2a2f4a";
      ctx.fillRect(0, 0, RES, RES);
    }
    const ctx = this.base.getContext("2d")!;
    const kr = (this.extent * 2) / RES;
    const until = performance.now() + 12;
    while (this.row < RES && performance.now() < until) {
      const img = ctx.createImageData(RES, 1);
      const ty = this.center.y - this.extent + (this.row + 0.5) * kr;
      for (let i = 0; i < RES; i += 1) {
        const t = (map.sampleTile ?? map.tileAt)(this.center.x - this.extent + (i + 0.5) * kr, ty);
        const hex = COLORS[t] ?? (t >= 20 ? "#468c50" : "#8fd16a");
        img.data[i * 4] = parseInt(hex.slice(1, 3), 16);
        img.data[i * 4 + 1] = parseInt(hex.slice(3, 5), 16);
        img.data[i * 4 + 2] = parseInt(hex.slice(5, 7), 16);
        img.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, this.row);
      this.row += 1;
    }
    const k = (this.extent * 2) / SIZE;
    const out = this.canvas.getContext("2d")!;
    out.imageSmoothingEnabled = false;
    out.drawImage(this.base, 0, 0, SIZE, SIZE);
    const toPx = (x: number, y: number) => [(x - this.center.x + this.extent) / k, (y - this.center.y + this.extent) / k];
    for (const d of dots) {
      const [x, y] = toPx(d.x, d.y);
      out.fillStyle = d.color;
      out.beginPath();
      out.arc(x, y, Math.max(2, d.size), 0, Math.PI * 2);
      out.fill();
    }
    const [mx, my] = toPx(me.x, me.y);
    out.fillStyle = "#fff";
    out.strokeStyle = "#e0405e";
    out.lineWidth = 3;
    out.beginPath();
    out.arc(mx, my, 6, 0, Math.PI * 2);
    out.fill();
    out.stroke();
    this.canvas.style.cursor = canTeleport ? "crosshair" : "default";
    (this.root.querySelector(".wm-tip") as HTMLElement).textContent = `${map.name}${this.row < RES ? " · drawing…" : ""}${canTeleport ? " · click anywhere to teleport there (moderator)" : ""}`;
  }
}
