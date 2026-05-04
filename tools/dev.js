const { spawn } = require("node:child_process");
const net = require("node:net");

const processes = [];

let shuttingDown = false;

main().catch((error) => {
  console.error(error.message);
  shutdown(1);
});

async function main() {
  const serverHost = process.env.HOST || "127.0.0.1";
  const clientHost = process.env.CLIENT_HOST || "127.0.0.1";
  const serverPort = await choosePort(Number(process.env.PORT || 8080), serverHost, Boolean(process.env.PORT));
  const clientPort = await choosePort(Number(process.env.CLIENT_PORT || 3000), clientHost, Boolean(process.env.CLIENT_PORT));
  const gameServerUrl = process.env.GAME_SERVER_URL || `ws://localhost:${serverPort}/ws`;

  processes.push(
    spawn(process.execPath, ["server/src/index.js"], {
      stdio: "inherit",
      env: {
        ...process.env,
        HOST: serverHost,
        PORT: String(serverPort)
      }
    }),
    spawn(process.execPath, ["client/dev-server.js"], {
      stdio: "inherit",
      env: {
        ...process.env,
        CLIENT_HOST: clientHost,
        CLIENT_PORT: String(clientPort),
        GAME_SERVER_URL: gameServerUrl
      }
    })
  );

  for (const child of processes) {
    child.on("exit", (code, signal) => {
      if (!shuttingDown && code !== 0) {
        console.error(`Child process exited with ${signal || code}`);
        shutdown(code || 1);
      }
    });
  }

  console.log(`Balathor server: ${gameServerUrl}`);
  console.log(`Balathor client: http://localhost:${clientPort}`);
}

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const child of processes) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  setTimeout(() => process.exit(code), 200).unref();
}

async function choosePort(preferredPort, host, explicit) {
  if (explicit) {
    return preferredPort;
  }

  for (let port = preferredPort; port < preferredPort + 50; port += 1) {
    if (await canListen(port, host)) {
      return port;
    }
  }

  throw new Error(`No open port found from ${preferredPort} to ${preferredPort + 49}`);
}

function canListen(port, host) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, host);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
