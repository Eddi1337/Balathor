import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const basePort = 21000 + (process.pid % 1000);
const serverPort = basePort;
const clientPort = basePort + 1000;
const localGameServerUrl = `ws://127.0.0.1:${serverPort}/ws`;

function spawnService(command, args, env) {
  return spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: "ignore"
  });
}

async function fetchReady(url, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      lastError = new Error(`${url} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(80);
  }
  throw lastError;
}

function assertIncludesAll(body, expected, surface) {
  for (const text of expected) {
    assert.match(body, new RegExp(text), `${surface} should include ${text}`);
  }
}

test("local server serves healthy desktop and mobile UI surfaces", async (t) => {
  const server = spawnService(process.execPath, ["server/src/index.js"], {
    HOST: "127.0.0.1",
    PORT: String(serverPort),
    ACCOUNT_STORE_PATH: `/tmp/balathor-ui-accounts-${process.pid}.json`,
    WORLD_DB_PATH: `/tmp/balathor-ui-world-${process.pid}.sqlite`,
    DISCORD_AUTH_WEBHOOK_URL: ""
  });
  const client = spawnService(process.execPath, ["client/dev-server.js"], {
    CLIENT_HOST: "127.0.0.1",
    CLIENT_PORT: String(clientPort),
    GAME_SERVER_URL: localGameServerUrl
  });

  t.after(() => {
    server.kill("SIGTERM");
    client.kill("SIGTERM");
  });

  const serverHealth = await (await fetchReady(`http://127.0.0.1:${serverPort}/health`)).json();
  assert.equal(serverHealth.ok, true);

  const clientHealth = await (await fetchReady(`http://127.0.0.1:${clientPort}/health`)).json();
  assert.deepEqual(clientHealth, { ok: true, gameServerUrl: localGameServerUrl });

  const config = await (await fetchReady(`http://127.0.0.1:${clientPort}/config.json`)).json();
  assert.deepEqual(config, { gameServerUrl: localGameServerUrl });
  assert.doesNotMatch(config.gameServerUrl, /edmundmurphy\.com/i);

  const desktopResponse = await fetchReady(`http://127.0.0.1:${clientPort}/`, {
    headers: { "user-agent": "Balathor local desktop UI test" }
  });
  assert.match(desktopResponse.headers.get("content-type"), /^text\/html/);
  const desktopHtml = await desktopResponse.text();
  assertIncludesAll(desktopHtml, [
    "id=\"game\"",
    "id=\"accountForm\"",
    "id=\"characterForm\"",
    "id=\"equipmentPanel\"",
    "id=\"bagsPanel\"",
    "id=\"chat\"",
    "src=\"\\./src/main\\.js\""
  ], "desktop UI");

  const mobileResponse = await fetchReady(`http://127.0.0.1:${clientPort}/`, {
    headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148" }
  });
  const mobileHtml = await mobileResponse.text();
  assertIncludesAll(mobileHtml, [
    "id=\"mobileContextDock\"",
    "id=\"mobileControls\"",
    "id=\"joystickShell\"",
    "id=\"joystickKnob\"",
    "src=\"\\./src/mobileTouch\\.js\"",
    "src=\"\\./src/mobileUi\\.js\""
  ], "mobile UI");

  const assets = [
    ["/styles.css", /^text\/css/, /mobile-controls/],
    ["/src/main.js", /^text\/javascript/, /wireMobileControls/],
    ["/src/mobileTouch.js", /^text\/javascript/, /BalathorMobileTouch/],
    ["/src/mobileUi.js", /^text\/javascript/, /mobileContextDock/]
  ];
  for (const [pathname, contentType, expected] of assets) {
    const response = await fetchReady(`http://127.0.0.1:${clientPort}${pathname}`);
    assert.match(response.headers.get("content-type"), contentType, `${pathname} should have the correct MIME type`);
    assert.match(await response.text(), expected, `${pathname} should contain its expected UI code`);
  }
});
