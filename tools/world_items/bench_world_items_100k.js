"use strict";
// 100,000 placed items. Far chunks stay summarized. The near window is expanded.
// Change-only save stores dirty chunks, not one record per item.
//   node tools/world_items/bench_world_items_100k.js

const { createWorld } = require("../../game/js/sim/world_items");

const PLACED = 100000;
const PER_CHUNK = 100;
const CHUNKS = PLACED / PER_CHUNK;
const FRAME_BUDGET_MS = 16;
const MEMORY_BUDGET = 16 * 1024 * 1024;
const HEAP_BUDGET = 64 * 1024 * 1024;
const SUMMARY_SAVE_BUDGET = 256 * 1024;
const DELTA_SAVE_BUDGET = 32 * 1024;

function median(xs) {
    const s = xs.slice().sort(function (a, b) { return a - b; });
    return s[(s.length / 2) | 0];
}

function now() {
    return Number(process.hrtime.bigint()) / 1e6;
}

const heap0 = process.memoryUsage().heapUsed;
const world = createWorld({ seed: 20260926, nearTiles: 8, chunkTiles: 16 });
for (let i = 0; i < CHUNKS; i++) {
    world.addManifest(i, 0, 0, { longsword: PER_CHUNK });
}
world.setViewer(8, 8, 0);

const samples = [];
for (let i = 0; i < 21; i++) {
    const t0 = now();
    world.drawList({ x0: 0, y0: 0, x1: 16 * 48, y1: 16 * 48, layer: 0 });
    samples.push(now() - t0);
}
const frameMs = median(samples);

const summaryBytes = world.memoryBytes();
const baseSave = world.saveChanges();
const baseText = JSON.stringify(baseSave);

const positions = world.chunkPositions(0, 0, 0);
for (let i = 0; i < 20 && i < positions.length; i++) {
    const p = positions[i];
    world.move(p.id, { tileX: p.tileX, tileY: p.tileY, cellX: (p.cellX + 1) % 5, cellY: p.cellY, layer: 0 });
}
const deltaText = JSON.stringify(world.saveChanges());
const heap1 = process.memoryUsage().heapUsed;

const mat0 = now();
for (let i = 0; i < CHUNKS; i++) world.expandChunk(i, 0, 0);
const materializeMs = now() - mat0;
const peakBytes = world.memoryBytes();
for (let i = 1; i < CHUNKS; i++) world.collapseChunk(i, 0, 0);

const placed = world.placedCount();
const framePass = frameMs <= FRAME_BUDGET_MS;
const memPass = summaryBytes <= MEMORY_BUDGET;
const heapPass = (heap1 - heap0) <= HEAP_BUDGET;
const summaryPass = baseText.length <= SUMMARY_SAVE_BUDGET;
const deltaPass = deltaText.length <= DELTA_SAVE_BUDGET;
const countPass = placed === PLACED;
const ok = framePass && memPass && heapPass && summaryPass && deltaPass && countPass;

console.log("BENCH placed=" + placed + " detailed_near=" + positions.length + " summary_chunks=" + CHUNKS);
console.log("BENCH frame_ms=" + frameMs.toFixed(3) + " median of 21 viewport draws");
console.log("BENCH memory_bytes=" + summaryBytes);
console.log("BENCH heap_delta_bytes=" + (heap1 - heap0));
console.log("BENCH save_summary_bytes=" + baseText.length);
console.log("BENCH save_delta_bytes=" + deltaText.length);
console.log("BENCH materialize_ms=" + materializeMs.toFixed(1) + " peak_memory_bytes=" + peakBytes);
console.log("BENCH budget frame_ms <= " + FRAME_BUDGET_MS + " " + (framePass ? "PASS" : "FAIL"));
console.log("BENCH budget memory_bytes <= " + MEMORY_BUDGET + " " + (memPass ? "PASS" : "FAIL"));
console.log("BENCH budget heap_delta_bytes <= " + HEAP_BUDGET + " " + (heapPass ? "PASS" : "FAIL"));
console.log("BENCH budget save_summary_bytes <= " + SUMMARY_SAVE_BUDGET + " " + (summaryPass ? "PASS" : "FAIL"));
console.log("BENCH budget save_delta_bytes <= " + DELTA_SAVE_BUDGET + " " + (deltaPass ? "PASS" : "FAIL"));
console.log("BENCH budget placed == " + PLACED + " " + (countPass ? "PASS" : "FAIL"));
console.log("BENCH RESULT: " + (ok ? "PASS" : "FAIL"));
process.exit(ok ? 0 : 1);
