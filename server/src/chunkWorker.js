"use strict";

const { parentPort } = require("node:worker_threads");
const { generateChunk } = require("./world");

if (!parentPort) {
  throw new Error("chunkWorker must run as a worker thread");
}

parentPort.on("message", (job) => {
  const id = job?.id;
  const cx = Number(job?.cx);
  const cy = Number(job?.cy);
  const key = typeof job?.key === "string" ? job.key : `${cx},${cy}`;
  try {
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
      throw new Error("Invalid chunk coordinates");
    }
    parentPort.postMessage({ id, key, chunk: generateChunk(cx, cy) });
  } catch (error) {
    parentPort.postMessage({
      id,
      key,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
