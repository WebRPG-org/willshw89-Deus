"use strict";

const Z_BASE = 16;
const STRATA_PER_LAYER = 64;

function gOf(z, s) {
    return STRATA_PER_LAYER * (z + Z_BASE) + s;
}

function zOfG(g) {
    return Math.floor(g / STRATA_PER_LAYER) - Z_BASE;
}

function sOfG(g) {
    return g - STRATA_PER_LAYER * Math.floor(g / STRATA_PER_LAYER);
}

function createFixtureReader(spec) {
    spec = spec || {};
    const b = spec.bounds;
    if (!b) throw new TypeError("structural/block_reader: fixture needs bounds {x0, y0, x1, y1}");
    const x0 = b.x0, y0 = b.y0, x1 = b.x1, y1 = b.y1;
    const zMin = spec.zMin === undefined ? -2 : spec.zMin;
    const zMax = spec.zMax === undefined ? 2 : spec.zMax;
    
    const floor = spec.foundation === "floor";
    const cells = new Map();
    const pending = new Set();
    const anchors = new Set();

    const key = (x, y, g) => `${x},${y},${g}`;
    const inBounds = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
    const canonFn = spec.canon;
    const unknown = (x, y, g) => !inBounds(x, y) || zOfG(g) < zMin || pending.has(key(x, y, g));

    const reader = {
        zMin, zMax,
        get floorG() { return floor ? gOf(zMin, 0) : null; },
        canon: canonFn ? (x, y) => canonFn(x, y) : undefined,
        solidG(x, y, g) {
            if (unknown(x, y, g)) return "pending";
            if (zOfG(g) > zMax) return false;
            return cells.has(key(x, y, g));
        },
        anchorG(x, y, g) {
            if (unknown(x, y, g)) return "pending";
            return anchors.has(key(x, y, g)) || (floor && g === gOf(zMin, 0));
        },
        setG(x, y, g) {
            cells.set(key(x, y, g), true);
            return reader;
        },
        clearG(x, y, g) {
            cells.delete(key(x, y, g));
            return reader;
        },
        markPendingG(x, y, g) {
            pending.add(key(x, y, g));
            return reader;
        },
        addAnchorG(x, y, g) {
            anchors.add(key(x, y, g));
            return reader;
        },
        fillG(x, y, g0, g1) {
            for (let g = g0; g <= g1; g++) reader.setG(x, y, g);
            return reader;
        }
    };
    return reader;
}

module.exports = {
    createFixtureReader,
    gOf, zOfG, sOfG
};
