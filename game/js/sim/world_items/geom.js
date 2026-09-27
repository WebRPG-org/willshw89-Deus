"use strict";
// Placement geometry. Logic is on 6 px cells. Drawn coordinates are whole pixels.

const C = require("./constants");

function fail(code, msg) {
    const err = new Error(code + ": " + msg);
    err.code = code;
    throw err;
}

function snapPx(px) {
    if (typeof px !== "number" || !Number.isFinite(px)) fail("E_PX", "pixel is not finite: " + px);
    const q = px / C.CELL_PX;
    const n = Math.floor(q + 0.5); // SNAP_HALF_UP
    const out = n * C.CELL_PX;
    if (!Number.isSafeInteger(out)) fail("E_PX", "snapped pixel is out of range");
    return out;
}

function decodePx(px) {
    const s = snapPx(px);
    const tile = Math.floor(s / C.TILE_PX);
    const local = s - tile * C.TILE_PX;
    return { px: s, tile: tile, cell: local / C.CELL_PX };
}

function anchorPx(tile, cell) {
    return tile * C.TILE_PX + cell * C.CELL_PX;
}

// Map order is row, then layer. Inside that: footprint bottom line, then height offset.
function drawKey(item) {
    const bottomLine = item.yPx + item.sizePx - 1;
    const row = Math.floor(bottomLine / C.TILE_PX);
    const heightPx = item.heightQuarters * C.QUARTER_PX; // HEIGHT_KEY
    return [row, item.layer | 0, bottomLine, heightPx, item.id | 0];
}

function drawCompare(a, b) {
    const ka = drawKey(a);
    const kb = drawKey(b);
    for (let i = 0; i < ka.length; i++) {
        if (ka[i] < kb[i]) return -1;
        if (ka[i] > kb[i]) return 1;
    }
    return 0;
}

function containsPx(item, x, y) {
    return x >= item.xPx && y >= item.yPx && x < item.xPx + item.sizePx && y < item.yPx + item.sizePx;
}

// SRD 5-5-5 distance in squares: max(dx, dy) + floor(min(dx, dy) / 2).
function squares555(dx, dy) {
    const ax = Math.abs(dx) | 0;
    const ay = Math.abs(dy) | 0;
    const hi = ax > ay ? ax : ay;
    const lo = ax > ay ? ay : ax;
    return hi + Math.floor(lo / 2);
}

function shadowPx(sizePx) {
    if (sizePx === 12) return C.SHADOW_PX[12];
    if (sizePx === 24) return C.SHADOW_PX[24];
    return C.SHADOW_PX[48];
}

function withFacing(slotId, facing) {
    const parts = String(slotId).split(".");
    parts[parts.length - 1] = facing;
    return parts.join(".");
}

module.exports = {
    snapPx, decodePx, anchorPx, drawKey, drawCompare, containsPx, squares555, shadowPx, withFacing
};
