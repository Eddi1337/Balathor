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

function loadWiredMobileJoystick() {
  const main = fs.readFileSync(path.join(root, "client/src/main.js"), "utf8");
  const start = main.indexOf("function wireMobileControls() {");
  const end = main.indexOf("\nfunction send(message) {", start);
  assert.notEqual(start, -1, "main.js should expose wireMobileControls");
  assert.notEqual(end, -1, "wireMobileControls should end before send");

  const canvasHandlers = {};
  const windowHandlers = {};
  const inputSnapshots = [];
  const arcs = [];
  const state = {
    joined: true,
    menuOpen: false,
    input: { up: false, down: false, left: false, right: false, engage: false, fire: false, repair: false }
  };
  const jctx = {
    beginPath() {},
    clearRect() {},
    fill() {},
    stroke() {},
    arc(...args) {
      arcs.push(args);
    }
  };
  const context = vm.createContext({
    BalathorMobileTouch: loadBalathorMobileTouch(),
    joystickCanvas: {
      width: 140,
      height: 140,
      addEventListener(type, fn) {
        canvasHandlers[type] = fn;
      },
      getBoundingClientRect() {
        return { left: 0, top: 0, width: 140, height: 140 };
      },
      getContext() {
        return jctx;
      }
    },
    window: {
      addEventListener(type, fn) {
        windowHandlers[type] = fn;
      }
    },
    state,
    cancelBenchSitClient() {},
    clearMovementInput() {
      Object.assign(state.input, { up: false, down: false, left: false, right: false, engage: false, fire: false, repair: false });
      inputSnapshots.push({ ...state.input });
    },
    sendInput() {
      inputSnapshots.push({ ...state.input });
    }
  });
  vm.runInContext(`${main.slice(start, end)}\nwireMobileControls();`, context);
  return { arcs, canvasHandlers, inputSnapshots, state, windowHandlers };
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

test("touch helpers keep tracking the joystick finger during multi-touch gestures", () => {
  const touch = loadBalathorMobileTouch();
  const touches = [
    { identifier: 11, clientX: 12, clientY: 14 },
    { identifier: 22, clientX: 90, clientY: 92 }
  ];

  assert.equal(touch.touchWithIdentifier(touches, 22).clientX, 90);
  assert.equal(touch.touchWithIdentifier(touches, 99), null);
  const point = touch.pointerPoint({ touches }, 22);
  assert.equal(point.clientX, 90);
  assert.equal(point.clientY, 92);
});

test("mobile touch pointer drag moves the joystick knob and resets movement on release", () => {
  const { arcs, canvasHandlers, inputSnapshots, state, windowHandlers } = loadWiredMobileJoystick();
  const event = (values) => ({ preventDefault() {}, ...values });

  canvasHandlers.pointerdown(event({ pointerType: "touch", pointerId: 7, clientX: 70, clientY: 70 }));
  windowHandlers.pointermove(event({ pointerType: "touch", pointerId: 7, clientX: 110, clientY: 70 }));

  assert.equal(state.input.right, true, "dragging the inner circle right should request rightward movement");
  assert.equal(state.input.left, false);
  assert.ok(arcs.some(([x, y, radius]) => x === 104 && y === 70 && radius === 22), "inner circle should render at its clamped rightward position");

  windowHandlers.pointerup(event({ pointerType: "touch", pointerId: 7, clientX: 110, clientY: 70 }));
  assert.equal(state.input.right, false, "releasing the joystick should stop movement");
  assert.equal(inputSnapshots.at(-1).right, false);
});

test("main.js keeps pointer and legacy touch joystick sessions separate", () => {
  const main = fs.readFileSync(path.join(root, "client/src/main.js"), "utf8");
  const joystickWiring = main.slice(main.indexOf("function wireMobileControls()"), main.indexOf("function send(message)"));
  assert.match(joystickWiring, /activeInputMode !== "pointer"/);
  assert.match(joystickWiring, /activeInputMode !== "touch"/);
  assert.match(joystickWiring, /touchWithIdentifier\(event\.touches, activeTouchIdentifier\)/);
  assert.match(joystickWiring, /touchWithIdentifier\(event\.changedTouches, activeTouchIdentifier\)/);
  assert.doesNotMatch(joystickWiring, /state\.menuOpen \|\| event\.pointerType === "touch"/);
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

test("client HTML exposes the compact canvas joystick and mobileTouch bundle", () => {
  const html = fs.readFileSync(path.join(root, "client/index.html"), "utf8");
  assert.match(html, /id="joystick"/);
  assert.match(html, /class="mobile-joystick"/);
  assert.match(html, /width="140" height="140"/);
  assert.match(html, /mobile-primary-label/);
  assert.match(html, /src="\.\/src\/mobileTouch\.js"/);
});

test("mobile joystick keeps an always-visible CSS fallback behind the canvas", () => {
  const styles = fs.readFileSync(path.join(root, "client/styles.css"), "utf8");
  const joystickRule = styles.match(/\.mobile-joystick \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(joystickRule, /border: 2px solid/);
  assert.match(joystickRule, /border-radius: 50%/);
  assert.match(joystickRule, /background:\s*\n\s*radial-gradient/);
  assert.match(joystickRule, /box-shadow:/);
  assert.match(joystickRule, /touch-action: none/);
});

test("main.js wires the compact canvas joystick with touch tracking", () => {
  const main = fs.readFileSync(path.join(root, "client/src/main.js"), "utf8");
  assert.match(main, /const joystickCanvas = document\.querySelector\("#joystick"\)/);
  assert.match(main, /function wireMobileControls\(\)/);
  assert.match(main, /drawJoystick/);
  assert.match(main, /joystickCanvas\.addEventListener\("touchstart"/);
  assert.match(main, /window\.addEventListener\("touchmove"/);
  assert.match(main, /window\.addEventListener\("touchend"/);
  const joystickWiring = main.slice(main.indexOf("function wireMobileControls()"), main.indexOf("function send(message)"));
  assert.doesNotMatch(joystickWiring, /state\.menuOpen \|\| event\.pointerType === "touch"/);
  assert.doesNotMatch(main, /lostpointercapture/);
  assert.match(main, /BalathorMobileTouch\?\.wireInstantTap/);
});

test("window close and compact HUD controls use instant tap activation on mobile", () => {
  const main = fs.readFileSync(path.join(root, "client/src/main.js"), "utf8");
  assert.match(main, /wireTapActivate\(partyPanelMin,/);
  assert.match(main, /wireTapActivate\(progressionToggle,/);
  for (const closeControl of [
    "equipmentClose",
    "bagsClose",
    "questClose",
    "talentClose",
    "shopClose",
    "shipTerminalClose",
    "teleportMenuCloseBtn",
    "questOfferCloseBtn",
    "traderClose",
    "buyHouseClose",
    "companionOfferClose",
    "friendsWindowClose",
    "tradeClose"
  ]) {
    assert.match(main, new RegExp(`wireTapActivate\\(${closeControl},`));
  }
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
      WORLD_DB_PATH: `/tmp/balathor-mobile-touch-world-${process.pid}.sqlite`,
      DISCORD_AUTH_WEBHOOK_URL: ""
    },
    stdio: "ignore"
  });

  try {
    let serverReady = false;
    for (let i = 0; i < 100; i += 1) {
      try {
        const health = await fetch(`http://127.0.0.1:${serverPort}/health`);
        if (health.ok) {
          serverReady = true;
          break;
        }
      } catch {
        /* retry */
      }
      await delay(80);
    }
    assert.equal(serverReady, true, "server should be healthy before the protocol test connects");

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
