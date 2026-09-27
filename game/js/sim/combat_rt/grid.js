"use strict";

const C = require("./constants");

function footprint(size) {
    return C.FOOTPRINT[size] || C.FOOTPRINT.Medium;
}

function footprintSquares(unit, x, y) {
    const fp = footprint(unit.size);
    const x0 = x === undefined ? unit.x : x;
    const y0 = y === undefined ? unit.y : y;
    const out = [];
    for (let dy = 0; dy < fp.h; dy++) {
        for (let dx = 0; dx < fp.w; dx++) out.push({ x: x0 + dx, y: y0 + dy, z: unit.z });
    }
    return out;
}

function squaresApart(a, b) {
    const as = footprintSquares(a);
    const bs = footprintSquares(b);
    let best = Infinity;
    for (let i = 0; i < as.length; i++) {
        for (let k = 0; k < bs.length; k++) {
            const d = Math.max(Math.abs(as[i].x - bs[k].x), Math.abs(as[i].y - bs[k].y));
            if (d < best) best = d;
        }
    }
    return best;
}

// SRD 5-5-5: every diagonal costs the same 5 feet as an orthogonal square.
function feetOfSquares(squares) {
    return 5 * squares;
}

function feetBetween(dx, dy) {
    return 5 * Math.max(Math.abs(dx | 0), Math.abs(dy | 0));
}

function disk(cx, cy, z, radius) {
    const r = radius | 0;
    const out = [];
    for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
            if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) <= r) out.push({ x: x, y: y, z: z });
        }
    }
    return out;
}

function wholeSquares(list) {
    for (let i = 0; i < list.length; i++) {
        const s = list[i];
        if (!Number.isInteger(s.x) || !Number.isInteger(s.y) || !Number.isInteger(s.z)) return false;
    }
    return true;
}

module.exports = {
    footprint, footprintSquares, squaresApart, feetOfSquares, feetBetween, disk, wholeSquares
};
