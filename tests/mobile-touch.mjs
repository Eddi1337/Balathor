import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { test } from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import {
  assertPlayerMoved,
  connectAndJoin,
  latestSelfPlayer,
  maskedFrame,
  waitForSnapshot
} from "./lib/wsHelpers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadBalathorMobileTouch() {
  const code = fs.readFileSync(path.join(root, "client/src/mobileTouch.js"), "utf8");
  const ctx = {
    globalThis: {},
    performance: { now: () => 1000 },
    window: {}
  };
  vm.runInContext(code, vm.createContext(ctx));
  return ctx.globalThis.BalathorMobileTouch;
}

test("joystick math maps drag to movement keys", () => {
  const touch = loadBalathorMobileTouch();
  const maxDist = 40;
  const right = touch.clampKnobOffset(30, 0, maxDist);
  const dirs = touch.joystickDirectionsFromKnob(right.knobX, right.knobY, maxDist);
  assert.equal(dirs.right, true);
  assert.equal(dirs.left, false);
  assert.equal(dirs.up, false);
  assert.equal(dirs.down, false);

  const up = touch.clampKnobOffset(0, -30, maxDist);
  const upDirs = touch.joystickDirectionsFromKnob(up.knobX, up.knobY, maxDist);
  assert.equal(upDirs.up, true);
  assert.equal(upDirs.down, false);

  const center = touch.joystickDirectionsFromKnob(0, 0, maxDist);
  assert.equal(center.left, false);
  assert.equal(center.right, false);
  assert.equal(center.up, false);
  assert.equal(center.down, false);
});

test("instant tap fires on touch pointerdown without waiting for pointerup", () => {
  const touch = loadBalathorMobileTouch();
  let calls = 0;
  const handlers = {};
  const el = {
    addEventListener(type, fn, opts) {
      handlers[type] = { fn, opts };
    }
  };

  touch.wireInstantTap(el, () => {
    calls += 1;
  });

  handlers.pointerdown.fn({
    pointerType: "touch",
    preventDefault() {},
    stopPropagation() {}
  });
  assert.equal(calls, 1);

  handlers.click.fn({ pointerType: "touch" });
  assert.equal(calls, 1, "synthetic click should be ignored for touch");
});

test("client HTML exposes DOM joystick and mobileTouch bundle", () => {
  const html = fs.readFileSync(path.join(root, "client/index.html"), "utf8");
  assert.match(html, /id="joystickShell"/);
  assert.match(html, /id="joystickKnob"/);
  assert.match(html, /mobile-joystick-knob/);
  assert.match(html, /src="\.\/src\/mobileTouch\.js"/);
});

test("main.js wires shell joystick and does not rely on lostpointercapture reset", () => {
  const main = fs.readFileSync(path.join(root, "client/src/main.js"), "utf8");
  assert.match(main, /const joystickShell = document\.querySelector\("#joystickShell"\)/);
  assert.match(main, /function wireMobileControls\(\)/);
  assert.match(main, /paintJoystickKnob/);
  assert.match(main, /joystickShell\.addEventListener\(\s*"touchstart"/);
  assert.doesNotMatch(main, /lostpointercapture/);
  assert.match(main, /BalathorMobileTouch\?\.wireInstantTap/);
});

test("idle animations start after a longer standing-still delay", () => {
  const main = fs.readFileSync(path.join(root, "client/src/main.js"), "utf8");
  const startMatch = main.match(/const IDLE_ANIM_START_MS = (\d+)/);
  const cycleMatch = main.match(/const IDLE_ANIM_CYCLE_MS = (\d+)/);
  assert.ok(startMatch);
  assert.ok(cycleMatch);
  assert.ok(Number(startMatch[1]) >= 15000, "idle start delay should be at least 15s");
  assert.ok(Number(cycleMatch[1]) >= 8000, "idle cycle delay should be at least 8s");
});

test("server accepts joystick-style input and moves the player", async () => {
  const basePort = 19000 + (process.pid % 800);
  const serverPort = basePort;
  const accountPath = `/tmp/balathor-mobile-touch-${process.pid}.json`;
  const username = `MobTouch${process.pid}`;
  const password = "mobile-touch-test";

  const server = spawn(process.execPath, ["server/src/index.js"], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(serverPort),
      ACCOUNT_STORE_PATH: accountPath,
      WORLD_DB_PATH: `/tmp/balathor-mobile-touch-world-${process.pid}.sqlite`
    },
    stdio: "ignore"
  });

  try {
    for (let i = 0; i < 40; i += 1) {
      try {
        const health = await fetch(`http://127.0.0.1:${serverPort}/health`);
        if (health.ok) {
          break;
        }
      } catch {
        /* retry */
      }
      await delay(80);
    }

    const { socket, messages } = await connectAndJoin(serverPort, { username, password });
    const before = await waitForSnapshot(socket, messages, username);

    for (let i = 0; i < 12; i += 1) {
      socket.write(
        maskedFrame(
          JSON.stringify({
            type: "input",
            seq: i,
            keys: { up: false, down: false, left: false, right: true, engage: false, fire: false, repair: false }
          })
        )
      );
      await delay(50);
    }

    const after = await waitForSnapshot(
      socket,
      messages,
      username,
      (player) => Math.hypot(player.x - before.x, player.y - before.y) > 0.05
    );
    assertPlayerMoved(before, after);
    socket.end();
  } finally {
    server.kill("SIGTERM");
  }
});
