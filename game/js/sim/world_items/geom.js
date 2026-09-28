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

// Continuous global coordinates (gx, gy). 1 tile = 48 px = 8 cells of 6 px.
function toGlobal(tile, cell) {
    if (typeof tile !== "number" || !Number.isFinite(tile)) fail("E_GLOBAL", "tile must be finite number: " + tile);
    if (typeof cell !== "number" || !Number.isFinite(cell)) fail("E_GLOBAL", "cell must be finite number: " + cell);
    return tile + (cell / C.CELLS_PER_TILE);
}

function fromGlobal(g) {
    if (typeof g !== "number" || !Number.isFinite(g)) fail("E_GLOBAL", "global coordinate must be finite number: " + g);
    let tile = Math.floor(g);
    let frac = g - tile;
    let cell = Math.round(frac * C.CELLS_PER_TILE);
    if (cell >= C.CELLS_PER_TILE) {
        tile += 1;
        cell = 0;
    }
    return { tile: tile, cell: cell };
}

function toPx(g) {
    const fg = fromGlobal(g);
    return anchorPx(fg.tile, fg.cell);
}

function fromPx(px) {
    const d = decodePx(px);
    return toGlobal(d.tile, d.cell);
}

// Region mapping (default 256 tiles per region, 3x3 regions in 768x768 world)
function regionOf(tileX, tileY, regionSize) {
    const size = regionSize || C.REGION_TILES || 256;
    const rx = Math.floor(tileX / size);
    const ry = Math.floor(tileY / size);
    const lx = ((tileX % size) + size) % size;
    const ly = ((tileY % size) + size) % size;
    return { rx: rx, ry: ry, lx: lx, ly: ly };
}

function isCrossRegion(tileX1, tileY1, tileX2, tileY2, regionSize) {
    const size = regionSize || C.REGION_TILES || 256;
    const r1 = regionOf(tileX1, tileY1, size);
    const r2 = regionOf(tileX2, tileY2, size);
    return r1.rx !== r2.rx || r1.ry !== r2.ry;
}

module.exports = {
    snapPx, decodePx, anchorPx, drawKey, drawCompare, containsPx, squares555, shadowPx, withFacing,
    toGlobal, fromGlobal, toPx, fromPx, regionOf, isCrossRegion
};
