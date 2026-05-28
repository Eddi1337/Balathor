import assert from "node:assert/strict";
import crypto from "node:crypto";
import net from "node:net";

export function maskedFrame(text) {
  const payload = Buffer.from(text);
  const mask = crypto.randomBytes(4);
  const header = Buffer.alloc(payload.length < 126 ? 2 : 4);

  header[0] = 0x81;
  if (payload.length < 126) {
    header[1] = 0x80 | payload.length;
  } else {
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
  }

  const masked = Buffer.from(payload);
  for (let i = 0; i < masked.length; i += 1) {
    masked[i] ^= mask[i % 4];
  }

  return Buffer.concat([header, mask, masked]);
}

function decodeServerFrames(buffer) {
  const payloads = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const opcode = buffer[offset] & 0x0f;
    let length = buffer[offset + 1] & 0x7f;
    let headerLength = 2;

    if (length === 126) {
      if (offset + 4 > buffer.length) {
        break;
      }
      length = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (offset + 10 > buffer.length) {
        break;
      }
      length = Number(buffer.readBigUInt64BE(offset + 2));
      headerLength = 10;
    }

    const payloadStart = offset + headerLength;
    const payloadEnd = payloadStart + length;
    if (payloadEnd > buffer.length) {
      break;
    }

    if (opcode === 1) {
      payloads.push(buffer.subarray(payloadStart, payloadEnd));
    }
    offset = payloadEnd;
  }

  return {
    payloads,
    remaining: buffer.subarray(offset)
  };
}

/**
 * Minimal join flow: create account + hello, returns collected messages and an open socket.
 */
export function connectAndJoin(port, { username, password }) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const key = crypto.randomBytes(16).toString("base64");
    let buffer = Buffer.alloc(0);
    let upgraded = false;
    let sentHello = false;
    const messages = [];
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("connectAndJoin timed out"));
    }, 8000);

    socket.on("connect", () => {
      socket.write([
        "GET /ws HTTP/1.1",
        "Host: 127.0.0.1",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Key: ${key}`,
        "Sec-WebSocket-Version: 13",
        "",
        ""
      ].join("\r\n"));
    });

    socket.on("data", (data) => {
      buffer = Buffer.concat([buffer, data]);

      if (!upgraded) {
        const marker = buffer.indexOf("\r\n\r\n");
        if (marker === -1) {
          return;
        }
        buffer = buffer.subarray(marker + 4);
        upgraded = true;
        socket.write(
          maskedFrame(
            JSON.stringify({
              type: "auth",
              action: "create",
              username,
              password
            })
          )
        );
      }

      const decoded = decodeServerFrames(buffer);
      buffer = decoded.remaining;
      for (const payload of decoded.payloads) {
        messages.push(JSON.parse(payload.toString("utf8")));
      }

      if (!sentHello && messages.some((m) => m.type === "auth" && m.ok && m.hasCharacter === false)) {
        sentHello = true;
        socket.write(
          maskedFrame(
            JSON.stringify({
              type: "hello",
              name: username,
              classId: "ranger",
              torsoStyle: "tunic",
              weaponStyle: "classic",
              torsoColor: "#5cc8ff",
              weaponColor: "#ffd166",
              primary: "#5cc8ff",
              accent: "#ffd166"
            })
          )
        );
      }

      if (messages.some((m) => m.type === "welcome")) {
        clearTimeout(timeout);
        resolve({ socket, messages });
      }
    });

    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

export function latestSelfPlayer(messages, username) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.type !== "snapshot" || !Array.isArray(message.players)) {
      continue;
    }
    const player = message.players.find((p) => p.name === username);
    if (player) {
      return player;
    }
  }
  return null;
}

export async function waitForSnapshot(socket, messages, username, predicate, timeoutMs = 4000) {
  const start = Date.now();
  let buffer = Buffer.alloc(0);

  return new Promise((resolve, reject) => {
    function onData(data) {
      buffer = Buffer.concat([buffer, data]);
      const decoded = decodeServerFrames(buffer);
      buffer = decoded.remaining;
      for (const payload of decoded.payloads) {
        messages.push(JSON.parse(payload.toString("utf8")));
      }
      const player = latestSelfPlayer(messages, username);
      if (player && (!predicate || predicate(player))) {
        cleanup();
        resolve(player);
      } else if (Date.now() - start > timeoutMs) {
        cleanup();
        reject(new Error("waitForSnapshot timed out"));
      }
    }

    function cleanup() {
      socket.off("data", onData);
      clearInterval(timer);
    }

    socket.on("data", onData);
    const timer = setInterval(() => {
      if (Date.now() - start > timeoutMs) {
        cleanup();
        reject(new Error("waitForSnapshot timed out"));
      }
    }, 100);
  });
}

export function assertPlayerMoved(before, after, minDelta = 0.05) {
  assert.ok(before && after, "expected before/after player snapshots");
  const moved =
    Math.hypot(after.x - before.x, after.y - before.y) >= minDelta ||
    Math.abs(after.x - before.x) >= minDelta ||
    Math.abs(after.y - before.y) >= minDelta;
  assert.equal(moved, true, `player did not move enough: (${before.x},${before.y}) -> (${after.x},${after.y})`);
}
