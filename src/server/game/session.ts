// One connected client. Owns the socket, auth state, rate limiting and the per-client
// replication cache (what this client was last told about each entity).

import type { WebSocket } from "ws";
import type { FxEvent, NetEntity, S2C } from "../../shared/protocol";
import type { Player } from "./entities";

const MSG_BUDGET_PER_SEC = 60;
const MAX_BUFFERED_BYTES = 512 * 1024;

export class Session {
  accountId: number | null = null;
  username: string | null = null;
  player: Player | null = null;
  authPending = false;
  /** Last replicated value per entity id (shared objects from Entity.net()). */
  known = new Map<string, NetEntity>();
  fx: FxEvent[] = [];
  private tokens = MSG_BUDGET_PER_SEC;
  private lastRefill = Date.now();
  readonly ip: string;
  closed = false;

  constructor(readonly id: string, readonly ws: WebSocket, ip: string) {
    this.ip = ip;
  }

  /** Token bucket: returns false when the client is flooding. */
  allowMessage(): boolean {
    const now = Date.now();
    this.tokens = Math.min(MSG_BUDGET_PER_SEC, this.tokens + ((now - this.lastRefill) / 1000) * MSG_BUDGET_PER_SEC);
    this.lastRefill = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }

  send(msg: S2C): void {
    if (this.closed || this.ws.readyState !== this.ws.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  sendRaw(json: string): void {
    if (this.closed || this.ws.readyState !== this.ws.OPEN) return;
    this.ws.send(json);
  }

  /** True when the socket is backed up; snapshots are skipped rather than queued. */
  get congested(): boolean {
    return this.ws.bufferedAmount > MAX_BUFFERED_BYTES;
  }

  toast(text: string, kind: "info" | "good" | "bad" = "info"): void {
    this.send({ t: "toast", text, kind });
  }

  flushFx(): void {
    if (!this.fx.length) return;
    this.send({ t: "fx", ev: this.fx });
    this.fx = [];
  }
}
