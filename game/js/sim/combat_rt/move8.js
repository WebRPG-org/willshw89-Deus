"use strict";
// Eight-direction character steps on a square tile grid.
// Orthogonal walk is 4 px/frame, run is 6 px/frame, diagonal is 3 px on each axis.
// Terrain destinations stay on whole tiles. A diagonal does not cross a blocked corner.

const C = require("./constants");

function directionOf(dx, dy) {
    const sx = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
    const sy = dy === 0 ? 0 : (dy > 0 ? 1 : -1);
    for (let i = 0; i < C.DIR_DELTA.length; i++) {
        const d = C.DIR_DELTA[i];
        if (d.dx === sx && d.dy === sy) return d;
    }
    return null;
}

function byId(id) {
    for (let i = 0; i < C.DIR_DELTA.length; i++) if (C.DIR_DELTA[i].id === id) return C.DIR_DELTA[i];
    return null;
}

function stepPixels(diagonal, run) {
    if (diagonal) return C.DIAGONAL_PX;
    return run ? C.RUN_PX : C.WALK_PX;
}

function walkPixels(frames, diagonal, run) {
    const step = stepPixels(!!diagonal, !!run);
    const n = frames | 0;
    const total = n * step;
    return {
        step: step,
        frames: n,
        total: total,
        tiles: Math.floor(total / C.TILE_PX),
        offset: total % C.TILE_PX,
        integer: Number.isInteger(step) && Number.isInteger(total)
    };
}

function allowsDiagonal(x, y, dx, dy, passable) {
    const open = typeof passable === "function" ? passable : function () { return true; };
    if (!dx || !dy) return !!open(x + dx, y + dy);
    if (!open(x + dx, y + dy)) return false;
    if (!open(x + dx, y)) return false;
    if (!open(x, y + dy)) return false;
    return true;
}

function sheetRow(dir) {
    const i = C.DIRECTIONS.indexOf(dir);
    return i < 0 ? 0 : i;
}

function numpad(dir) {
    const d = byId(dir);
    return d ? d.numpad : 2;
}

module.exports = {
    directionOf, byId, stepPixels, walkPixels, allowsDiagonal, sheetRow, numpad
};
