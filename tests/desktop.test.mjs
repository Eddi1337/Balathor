// The desktop wrapper's files are valid and its package config points at real files.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

test("desktop client files parse and are all packaged", () => {
  for (const f of ["desktop/main.cjs", "desktop/preload.cjs"]) execFileSync(process.execPath, ["--check", f]);
  const pkg = JSON.parse(readFileSync("desktop/package.json", "utf8"));
  assert.equal(pkg.main, "main.cjs");
  for (const f of pkg.build.files) assert.ok(existsSync(`desktop/${f}`), `${f} exists`);
});
