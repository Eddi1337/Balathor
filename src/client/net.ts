// Typed WebSocket connection to the game server with automatic reconnect.

import type { C2S, S2C } from "../shared/protocol";

type Handler = (msg: S2C) => void;

export class Net {
  private ws: WebSocket | null = null;
  private handler: Handler = () => {};
  private retry = 0;
  private closedByUser = false;
  onOpen: () => void = () => {};
  onClose: () => void = () => {};
  rttMs = 0;

  constructor(private url: string) {}

  static defaultUrl(): string {
    const override = new URLSearchParams(location.search).get("server");
    if (override) return override;
    return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
  }

  on(handler: Handler): void {
    this.handler = handler;
  }

  connect(): void {
    this.closedByUser = false;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.onOpen();
    };
    ws.onmessage = (ev) => {
      let msg: S2C;
      try {
        msg = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      if (msg.t === "pong") this.rttMs = performance.now() - msg.c;
      this.handler(msg);
    };
    ws.onclose = () => {
      this.ws = null;
      this.onClose();
      if (this.closedByUser) return;
      const delay = [500, 1000, 2000, 4000, 8000][Math.min(this.retry, 4)];
      this.retry += 1;
      setTimeout(() => this.connect(), delay);
    };
  }

  get open(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  send(msg: C2S): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }
}
