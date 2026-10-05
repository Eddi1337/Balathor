// Builds the server (Node ESM bundle) and the browser client (ESM bundle + static files).
// Flags: --watch rebuilds on change; --serve also (re)starts the server after each build.
import { build, context } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";

const watch = process.argv.includes("--watch");
const serve = process.argv.includes("--serve");
const prod = process.env.NODE_ENV === "production";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist/public", { recursive: true });

const copyStatic = () => cpSync("src/client/static", "dist/public", { recursive: true });

let serverProcess = null;
const restartServer = {
  name: "restart-server",
  setup(b) {
    b.onEnd((result) => {
      if (!serve || result.errors.length) return;
      serverProcess?.kill();
      serverProcess = spawn(process.execPath, ["dist/server/main.js"], { stdio: "inherit" });
    });
  }
};
const recopyStatic = {
  name: "copy-static",
  setup(b) {
    b.onEnd(() => copyStatic());
  }
};

const serverOptions = {
  entryPoints: ["src/server/main.ts"],
  outfile: "dist/server/main.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  // ws optionally loads native addons; they are not installed.
  external: ["bufferutil", "utf-8-validate"],
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  plugins: [restartServer]
};

const clientOptions = {
  entryPoints: ["src/client/main.ts"],
  outfile: "dist/public/game.js",
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "es2022",
  minify: prod,
  sourcemap: !prod,
  define: { "process.env.NODE_ENV": JSON.stringify(prod ? "production" : "development") },
  plugins: [recopyStatic]
};

if (watch) {
  const [s, c] = await Promise.all([context(serverOptions), context(clientOptions)]);
  await Promise.all([s.watch(), c.watch()]);
  console.log("[build] watching for changes…");
} else {
  await Promise.all([build(serverOptions), build(clientOptions)]);
  copyStatic();
  console.log("[build] done");
}
