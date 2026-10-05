// End-to-end protocol smoke test: boots the built server on a random port with a temp
// database and plays through register → create → move → attack → chat → relog.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";

let server;
let port;
let dataDir;

function freePort() {
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
}

before(async () => {
  port = await freePort();
  dataDir = mkdtempSync(join(tmpdir(), "balathor-v2-test-"));
  server = spawn(process.execPath, ["dist/server/main.js"], {
    env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", DATA_DIR: dataDir, TICK_RATE: "20", SNAPSHOT_RATE: "10" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  for (let i = 0; i < 100; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not start");
});

after(() => {
  server?.kill("SIGTERM");
  rmSync(dataDir, { recursive: true, force: true });
});

class Client {
  constructor() {
    this.messages = [];
    this.waiters = [];
    this.entities = new Map();
    this.pos = null;
  }
  open() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
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
  close() {
    this.ws.close();
  }
}

const user = `smoke${Date.now() % 1e7}`;
const pass = "very-secret-1";
const charName = `Smokey${String.fromCharCode(97 + (Date.now() % 26))}`;
let lastPos;

test("health endpoint reports a populated world", async () => {
  const health = await (await fetch(`http://127.0.0.1:${port}/health`)).json();
  assert.equal(health.ok, true);
  assert.equal(health.version, "v2");
  assert.ok(health.mobs > 500, `expected a populated island, got ${health.mobs} mobs`);
});

test("serves the client with gzip and ETag revalidation", async () => {
  const res = await fetch(`http://127.0.0.1:${port}/game.js`, { headers: { "accept-encoding": "gzip" } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-encoding"), "gzip");
  const etag = res.headers.get("etag");
  const again = await fetch(`http://127.0.0.1:${port}/game.js`, { headers: { "if-none-match": etag } });
  assert.equal(again.status, 304);
  const index = await (await fetch(`http://127.0.0.1:${port}/`)).text();
  assert.match(index, /game\.js/);
});

test("register, create a character and enter the world", async () => {
  const c = new Client();
  await c.open();
  await c.wait((m) => m.t === "hello", 2000, "hello");

  c.send({ t: "auth", mode: "login", user, pass });
  const bad = await c.next((m) => m.t === "auth", 6000, "auth failure");
  assert.equal(bad.ok, false);

  c.send({ t: "auth", mode: "register", user, pass });
  const ok = await c.next((m) => m.t === "auth", 6000, "auth ok");
  assert.equal(ok.ok, true);
  assert.equal(ok.hasCharacter, false);

  c.send({ t: "create", name: "1bad", cls: "ranger", look: {} });
  const rejected = await c.next((m) => m.t === "toast", 3000, "bad-name toast");
  assert.match(rejected.text, /Names/);

  c.send({ t: "create", name: charName, cls: "ranger", look: { body: "#ff8fb1", accent: "#ffffff", skin: "#ffd9b8", hair: "#5a3a2a", hairStyle: 2 } });
  const welcome = await c.wait((m) => m.t === "welcome", 4000, "welcome");
  const self = (await c.wait((m) => m.t === "self", 4000, "self")).self;
  assert.equal(self.name, charName);
  assert.equal(self.cls, "ranger");
  assert.equal(self.lv, 1);
  assert.equal(self.look.body, "#ff8fb1");
  assert.ok(self.equip.weapon, "starter weapon equipped");
  assert.ok(self.inv.some((it) => it && it.tpl === "potion_small"), "starter tonics in bag");

  // The first snapshot includes ourselves and the town NPCs.
  await c.wait((m) => m.t === "s" && m.add?.some((e) => e.id === welcome.id), 3000, "self snapshot");
  await c.wait(() => [...c.entities.values()].some((e) => e.k === "n"), 3000, "npcs in view");
  assert.ok([...c.entities.values()].some((e) => e.k === "n" && e.npc === "npc_rin"), "Guide Rin is nearby");

  // Walk south (+y) for a second; the authoritative position must move.
  const start = { ...c.pos };
  c.send({ t: "in", seq: 1, mx: 0, my: 1, f: Math.PI / 2 });
  await new Promise((r) => setTimeout(r, 1000));
  c.send({ t: "in", seq: 2, mx: 0, my: 0, f: Math.PI / 2 });
  await new Promise((r) => setTimeout(r, 300));
  assert.ok(c.pos.y - start.y > 2, `moved south (from ${start.y} to ${c.pos.y})`);
  lastPos = { ...c.pos };

  // Attack: a ranger looses an arrow, which ends on its own.
  c.messages = [];
  c.send({ t: "attack", a: Math.PI / 2 });
  const proj = await c.wait((m) => m.t === "fx" && m.ev.some((e) => e.e === "proj"), 2000, "projectile");
  const pid = proj.ev.find((e) => e.e === "proj").pid;
  await c.wait((m) => m.t === "fx" && m.ev.some((e) => e.e === "projEnd" && e.pid === pid), 3000, "projectile end");

  // Chat is echoed to nearby players (including us) and commands answer privately.
  c.send({ t: "chat", text: "hello hearthmoor" });
  await c.wait((m) => m.t === "chat" && m.text === "hello hearthmoor" && m.name === charName, 2000, "chat echo");
  await new Promise((r) => setTimeout(r, 800));
  c.send({ t: "chat", text: "/where" });
  await c.wait((m) => m.t === "chat" && m.kind === "system" && /zone level/.test(m.text), 2000, "/where reply");

  // Using a potion at full health is refused politely; stats can't be spent without points.
  c.send({ t: "use", slot: self.inv.findIndex((it) => it && it.tpl === "potion_small") });
  await c.wait((m) => m.t === "toast" && /full health/.test(m.text), 2000, "full health toast");

  // Inventory management: swap slots round-trips through a fresh self state.
  c.messages = [];
  c.send({ t: "swap", from: 0, to: 5 });
  const swapped = (await c.wait((m) => m.t === "self", 2000, "self after swap")).self;
  assert.equal(swapped.inv[5]?.tpl, "potion_small");
  c.close();
  await new Promise((r) => setTimeout(r, 300));
});

test("logging back in resumes the saved character where it left", async () => {
  const c = new Client();
  await c.open();
  c.send({ t: "auth", mode: "login", user, pass });
  const ok = await c.wait((m) => m.t === "auth", 6000, "auth");
  assert.equal(ok.ok, true);
  assert.equal(ok.hasCharacter, true);
  c.send({ t: "play" });
  const welcome = await c.wait((m) => m.t === "welcome", 3000, "welcome");
  const self = (await c.wait((m) => m.t === "self", 3000, "self")).self;
  assert.equal(self.name, charName);
  assert.equal(self.inv[5]?.tpl, "potion_small", "inventory persisted");
  assert.ok(Math.hypot(welcome.x - lastPos.x, welcome.y - lastPos.y) < 1.5, "position persisted");
  c.close();
});

test("a second registration with the same name or character name is refused", async () => {
  const c = new Client();
  await c.open();
  c.send({ t: "auth", mode: "register", user, pass });
  const dup = await c.wait((m) => m.t === "auth", 6000, "dup auth");
  assert.equal(dup.ok, false);
  c.send({ t: "auth", mode: "register", user: `${user}b`, pass });
  await c.next((m) => m.t === "auth" && m.ok, 6000, "second account");
  c.send({ t: "create", name: charName.toLowerCase(), cls: "knight", look: {} });
  const taken = await c.wait((m) => m.t === "toast", 3000, "name taken toast");
  assert.match(taken.text, /taken/);
  c.close();
});
