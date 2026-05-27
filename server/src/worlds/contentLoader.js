"use strict";

const fs = require("node:fs");
const path = require("node:path");

const CONTENT_ROOT = path.resolve(__dirname, "../../..", "content");

function readJson(relativePath) {
  const full = path.join(CONTENT_ROOT, relativePath);
  if (!fs.existsSync(full)) {
    return null;
  }
  const raw = fs.readFileSync(full, "utf8");
  return JSON.parse(raw);
}

function listJsonFiles(relativeDir) {
  const full = path.join(CONTENT_ROOT, relativeDir);
  if (!fs.existsSync(full)) {
    return [];
  }
  return fs
    .readdirSync(full, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(full, entry.name));
}

function getContentRoot() {
  return CONTENT_ROOT;
}

module.exports = {
  CONTENT_ROOT,
  readJson,
  listJsonFiles,
  getContentRoot
};
