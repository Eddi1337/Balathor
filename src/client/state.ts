// Client-side mirror of replicated entities. Remote entities are rendered slightly in the
// past and interpolated between snapshots; the local player is predicted (see main.ts).

import type { NetEntity, S2C, SelfState } from "../shared/protocol";

export interface Sample {
  t: number;
  x: number;
  y: number;
  f: number;
}

export interface ClientEntity {
  id: string;
  data: NetEntity;
  samples: Sample[];
  /** Rendered (interpolated) position. */
  rx: number;
  ry: number;
  rf: number;
  bornAt: number;
  /** Set when the server removed it; kept briefly for a fade-out. */
  removedAt: number;
}

export const INTERP_DELAY_MS = 160;

export class ClientState {
  entities = new Map<string, ClientEntity>();
  self: SelfState | null = null;
  selfId: string | null = null;
  mapId = "overworld";
  serverX = 0;
  serverY = 0;
  ack = 0;
  worldTime = 0.35;
  worldTimeAt = performance.now();
  dayLengthMs = 24 * 60 * 1000;
  /** Entity ids added in the last applied snapshot (for spawn effects). */
  onAdd: (e: ClientEntity) => void = () => {};
  onRemove: (e: ClientEntity) => void = () => {};

  applySnapshot(msg: Extract<S2C, { t: "s" }>): void {
    const now = performance.now();
    this.serverX = msg.x;
    this.serverY = msg.y;
    this.ack = msg.ack;
    if (msg.add) {
      for (const net of msg.add) {
        const existing = this.entities.get(net.id);
        if (existing) {
          existing.data = net;
          existing.removedAt = 0;
          existing.samples.push({ t: now, x: net.x, y: net.y, f: "f" in net ? net.f : 0 });
          continue;
        }
        const e: ClientEntity = {
          id: net.id,
          data: net,
          samples: [{ t: now, x: net.x, y: net.y, f: "f" in net ? net.f : 0 }],
          rx: net.x,
          ry: net.y,
          rf: "f" in net ? net.f : 0,
          bornAt: now,
          removedAt: 0
        };
        this.entities.set(net.id, e);
        this.onAdd(e);
      }
    }
    if (msg.upd) {
      for (const [id, patch] of msg.upd) {
        const e = this.entities.get(id);
        if (!e) continue;
        Object.assign(e.data, patch);
        if ("x" in patch || "y" in patch || "f" in patch) {
          const d = e.data as { x: number; y: number; f?: number };
          e.samples.push({ t: now, x: d.x, y: d.y, f: d.f ?? 0 });
          if (e.samples.length > 8) e.samples.splice(0, e.samples.length - 8);
        }
      }
    }
    if (msg.del) {
      for (const id of msg.del) {
        const e = this.entities.get(id);
        if (!e) continue;
        e.removedAt = now;
        this.onRemove(e);
      }
    }
  }

  /** Interpolate remote entities to (now - delay). */
  interpolate(now: number): void {
    const t = now - INTERP_DELAY_MS;
    for (const e of this.entities.values()) {
      if (e.id === this.selfId) continue;
      const s = e.samples;
      if (s.length === 1 || t <= s[0].t) {
        e.rx = s[0].x;
        e.ry = s[0].y;
        e.rf = lerpAngle(e.rf, s[0].f, 0.25);
        continue;
      }
      let i = s.length - 1;
      while (i > 0 && s[i - 1].t > t) i -= 1;
      const a = s[Math.max(0, i - 1)];
      const b = s[i];
      if (t >= b.t) {
        // Past the newest sample: hold (no extrapolation; avoids overshoot jitter).
        e.rx = b.x;
        e.ry = b.y;
        e.rf = lerpAngle(e.rf, b.f, 0.3);
      } else {
        const k = (t - a.t) / Math.max(1, b.t - a.t);
        e.rx = a.x + (b.x - a.x) * k;
        e.ry = a.y + (b.y - a.y) * k;
        e.rf = lerpAngle(e.rf, a.f + angleDiff(a.f, b.f) * k, 0.35);
      }
      // Drop samples older than the one we interpolate from.
      if (i > 1) s.splice(0, i - 1);
    }
  }

  /** Forget entities whose removal fade has finished. */
  purge(now: number, fadeMs: number, onPurge: (e: ClientEntity) => void): void {
    for (const [id, e] of this.entities) {
      if (e.removedAt && now - e.removedAt > fadeMs) {
        this.entities.delete(id);
        onPurge(e);
      }
    }
  }

  clear(onPurge: (e: ClientEntity) => void): void {
    for (const e of this.entities.values()) onPurge(e);
    this.entities.clear();
  }

  currentWorldTime(now = performance.now()): number {
    return (this.worldTime + (now - this.worldTimeAt) / this.dayLengthMs) % 1;
  }
}

export function angleDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function lerpAngle(a: number, b: number, k: number): number {
  return a + angleDiff(a, b) * k;
}
