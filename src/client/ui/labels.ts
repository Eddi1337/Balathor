// DOM overlay for things that float over the 3D world: nameplates + HP bars, damage numbers
// and speech bubbles. Positions are projected from world space each frame.

import * as THREE from "three";

export interface PlateOpts {
  name: string;
  kind: "player" | "npc" | "mob" | "boss" | "self";
  hp?: number;
  mhp?: number;
  showBar: boolean;
  /** Quest marker over villagers: "!" (quest) or "?" (hand in). */
  marker?: string;
  /** Emote icon over players. */
  emote?: string;
}

interface Plate {
  el: HTMLDivElement;
  top: HTMLDivElement;
  nm: HTMLDivElement;
  bar: HTMLDivElement;
  fill: HTMLDivElement;
  last: string;
}

interface Floater {
  el: HTMLDivElement;
  world: THREE.Vector3;
  until: number;
}

const tmp = new THREE.Vector3();

export class Labels {
  private root = document.getElementById("overlay-labels")!;
  private plates = new Map<string, Plate>();
  private floaters: Floater[] = [];
  private bubbles = new Map<string, Floater>();

  constructor(private camera: THREE.Camera) {}

  private project(v: THREE.Vector3): { x: number; y: number; visible: boolean } {
    tmp.copy(v).project(this.camera);
    return {
      x: (tmp.x * 0.5 + 0.5) * innerWidth,
      y: (-tmp.y * 0.5 + 0.5) * innerHeight,
      visible: tmp.z < 1 && tmp.z > -1 && Math.abs(tmp.x) < 1.2 && Math.abs(tmp.y) < 1.2
    };
  }

  plate(id: string, pos: THREE.Vector3, o: PlateOpts): void {
    let p = this.plates.get(id);
    if (!p) {
      const el = document.createElement("div");
      el.className = "plate";
      const top = document.createElement("div");
      const nm = document.createElement("div");
      const bar = document.createElement("div");
      const fill = document.createElement("div");
      bar.appendChild(fill);
      el.append(top, nm, bar);
      this.root.appendChild(el);
      p = { el, top, nm, bar, fill, last: "" };
      this.plates.set(id, p);
    }
    const s = this.project(pos);
    if (!s.visible) {
      p.el.style.display = "none";
      return;
    }
    p.el.style.display = "";
    p.el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) translate(-50%, -100%)`;
    const key = `${o.name}|${o.kind}|${o.showBar}|${o.hp}|${o.mhp}|${o.marker ?? ""}|${o.emote ?? ""}`;
    if (key !== p.last) {
      p.last = key;
      if (o.marker) {
        p.top.className = `marker ${o.marker === "?" ? "ready" : ""}`;
        p.top.textContent = o.marker;
      } else if (o.emote) {
        p.top.className = "emote";
        p.top.textContent = o.emote;
      } else {
        p.top.className = "";
        p.top.textContent = "";
      }
      p.nm.textContent = o.name;
      p.nm.className = `nm ${o.kind === "self" ? "" : o.kind}`;
      p.bar.className = `mini ${o.kind === "boss" ? "boss" : ""}`;
      p.bar.style.display = o.showBar ? "" : "none";
      if (o.showBar && o.mhp) p.fill.style.width = `${Math.max(0, Math.min(100, ((o.hp ?? 0) / o.mhp) * 100))}%`;
    }
  }

  removePlate(id: string): void {
    const p = this.plates.get(id);
    if (!p) return;
    p.el.remove();
    this.plates.delete(id);
    this.bubbles.get(id)?.el.remove();
    this.bubbles.delete(id);
  }

  hidePlatesExcept(keep: Set<string>): void {
    for (const [id, p] of this.plates) if (!keep.has(id)) {
      p.el.remove();
      this.plates.delete(id);
    }
  }

  floatText(pos: THREE.Vector3, text: string, cls: string): void {
    const el = document.createElement("div");
    el.className = `dmg ${cls}`;
    el.textContent = text;
    const world = pos.clone();
    world.x += (Math.random() - 0.5) * 0.5;
    this.root.appendChild(el);
    this.floaters.push({ el, world, until: performance.now() + (cls.includes("lvl") ? 1800 : 900) });
  }

  bubble(id: string, pos: THREE.Vector3, text: string): void {
    this.bubbles.get(id)?.el.remove();
    const el = document.createElement("div");
    el.className = "bubble";
    el.textContent = text;
    this.root.appendChild(el);
    this.bubbles.set(id, { el, world: pos.clone(), until: performance.now() + 4500 });
  }

  /** Bubbles follow their speaker; call with the speaker's current head position. */
  moveBubble(id: string, pos: THREE.Vector3): void {
    const b = this.bubbles.get(id);
    if (b) b.world.copy(pos);
  }

  update(now: number): void {
    this.floaters = this.floaters.filter((f) => {
      if (now > f.until) {
        f.el.remove();
        return false;
      }
      const s = this.project(f.world);
      f.el.style.left = `${s.x}px`;
      f.el.style.top = `${s.y}px`;
      f.el.style.display = s.visible ? "" : "none";
      return true;
    });
    for (const [id, b] of this.bubbles) {
      if (now > b.until) {
        b.el.remove();
        this.bubbles.delete(id);
        continue;
      }
      const s = this.project(b.world);
      b.el.style.left = `${s.x}px`;
      b.el.style.top = `${s.y - 30}px`;
      b.el.style.display = s.visible ? "" : "none";
    }
  }
}
