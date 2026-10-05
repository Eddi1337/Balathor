// Shared test helpers: boot the built server and drive it with a protocol-level client.

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";

export function freePort() {
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
}

export async function startServer(extraEnv = {}) {
  const port = await freePort();
  const dataDir = mkdtempSync(join(tmpdir(), "balathor-v2-test-"));
  const proc = spawn(process.execPath, ["dist/server/main.js"], {
    env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", DATA_DIR: dataDir, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"]
  });
  for (let i = 0; i < 100; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  return {
    port,
    stop() {
      proc.kill("SIGTERM");
      rmSync(dataDir, { recursive: true, force: true });
    }
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Client {
  constructor(port) {
    this.port = port;
    this.messages = [];
    this.waiters = [];
    this.entities = new Map();
    this.pos = null;
    this.self = null;
    this.id = null;
  }
  open() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://127.0.0.1:${this.port}/ws`);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        this.messages.push(msg);
        if (msg.t === "s") {
          this.pos = { x: msg.x, y: msg.y };
          for (const e of msg.add ?? []) this.entities.set(e.id, e);
          for (const [id, patch] of msg.upd ?? []) Object.assign(this.entities.get(id) ?? {}, patch);
          for (const id of msg.del ?? []) this.entities.delete(id);
        } else if (msg.t === "self") {
          this.self = msg.self;
        } else if (msg.t === "welcome") {
          this.id = msg.id;
          this.pos = { x: msg.x, y: msg.y };
        }
        this.waiters = this.waiters.filter((w) => {
          if (!w.pred(msg)) return true;
          w.resolve(msg);
          return false;
        });
      };
    });
  }
  send(msg) {
    this.ws.send(JSON.stringify(msg));
  }
  wait(pred, ms = 4000, label = "message") {
    const found = this.messages.find(pred);
    if (found) return Promise.resolve(found);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${label}`)), ms);
      this.waiters.push({ pred, resolve: (m) => (clearTimeout(timer), resolve(m)) });
    });
  }
  next(pred, ms, label) {
    this.messages = [];
    return this.wait(pred, ms, label);
  }
  /** Register + create a character and wait until in the world. */
  async join(user, name, cls = "ranger") {
    await this.open();
    await this.wait((m) => m.t === "hello", 3000, "hello");
    this.send({ t: "auth", mode: "register", user, pass: "test-password-1" });
    const auth = await this.wait((m) => m.t === "auth", 8000, "auth");
    if (!auth.ok) throw new Error(`auth failed: ${auth.err}`);
    this.send({ t: "create", name, cls, look: {} });
    await this.wait((m) => m.t === "welcome", 4000, "welcome");
    await this.wait((m) => m.t === "self", 4000, "self");
  }
  async chat(text, settle = 900) {
    this.send({ t: "chat", text });
    await sleep(settle);
  }
  /** Wait for a fresh self state matching pred. */
  selfWhere(pred, ms = 4000, label = "self state") {
    if (this.self && pred(this.self)) return Promise.resolve(this.self);
    return this.wait((m) => m.t === "self" && pred(m.self), ms, label).then((m) => m.self);
  }
  npc(defId) {
    return [...this.entities.values()].find((e) => e.k === "n" && e.npc === defId);
  }
  close() {
    this.ws.close();
  }
}
