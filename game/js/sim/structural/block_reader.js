"use strict";

const Z_BASE = 16;
const STRATA_PER_LAYER = 5;

function gOf(z, s) {
    return STRATA_PER_LAYER * (z + Z_BASE) + s;
}

function zOfG(g) {
    return Math.floor(g / STRATA_PER_LAYER) - Z_BASE;
}

function sOfG(g) {
    return g - STRATA_PER_LAYER * Math.floor(g / STRATA_PER_LAYER);
}

function createBlockFixture(spec) {
    spec = spec || {};
    const b = spec.bounds;
    if (!b) throw new TypeError("structural/block_reader: fixture needs bounds {x0, y0, x1, y1}");
    const x0 = b.x0, y0 = b.y0, x1 = b.x1, y1 = b.y1;
    const zMin = spec.zMin === undefined ? -2 : spec.zMin;
    const zMax = spec.zMax === undefined ? 2 : spec.zMax;
    const wrap = spec.wrap === true;
    const floor = spec.floor !== false; // default true

    const cells = new Map();
    const pending = new Set();
    const anchors = new Set();

    let reads = 0;

    const key = (x, y, g) => `${x},${y},${g}`;
    const inBoundsX = x => x >= x0 && x <= x1;
    const inBoundsY = y => y >= y0 && y <= y1;

    function canon(x, y) {
        if (wrap) {
            const w = x1 - x0 + 1;
            const h = y1 - y0 + 1;
            let nx = (x - x0) % w;
            if (nx < 0) nx += w;
            let ny = (y - y0) % h;
            if (ny < 0) ny += h;
            return { x: x0 + nx, y: y0 + ny };
        }
        return { x, y };
    }

    const floorG = floor ? gOf(zMin, 0) : null;
    const topG = gOf(zMax, STRATA_PER_LAYER - 1);
    
    function outOfBounds(x, y, g) {
        if (g > topG) return false; // Above topG is air, not unknown
        if (floorG !== null && g < floorG) return true;
        if (!wrap && (!inBoundsX(x) || !inBoundsY(y))) return true;
        return false;
    }

    const reader = {
        get floorG() { return floorG; },
        get topG() { return topG; },
        get reads() { return reads; },
        
        state(x, y, g) {
            reads++;
            let c = canon(x, y);
            x = c.x; y = c.y;
            if (g > topG) return "air";
            if (outOfBounds(x, y, g)) return "unknown";
            if (pending.has(key(x, y, g))) return "unknown";
            return cells.has(key(x, y, g)) ? "solid" : "air";
        },
        
        neighbors(x, y, g) {
            let n = [];
            // DOWN, N, E, S, W, UP
            const dirs = [
                { dx: 0, dy: 0, dg: -1 },
                { dx: 0, dy: -1, dg: 0 },
                { dx: 1, dy: 0, dg: 0 },
                { dx: 0, dy: 1, dg: 0 },
                { dx: -1, dy: 0, dg: 0 },
                { dx: 0, dy: 0, dg: 1 }
            ];
            for (const d of dirs) {
                let nx = x + d.dx, ny = y + d.dy, ng = g + d.dg;
                let c = canon(nx, ny);
                nx = c.x; ny = c.y;
                if (reader.floorG !== null && ng < reader.floorG) continue;
                if (ng > reader.topG) continue;
                n.push([nx, ny, ng]);
            }
            return n;
        },
        
        key(x, y, g) {
            let c = canon(x, y);
            return `${c.x},${c.y},${g}`;
        },
        
        anchor(x, y, g) {
            reads++;
            let c = canon(x, y);
            return anchors.has(key(c.x, c.y, g));
        },
        
        set(x, y, g) {
            let c = canon(x, y);
            cells.set(key(c.x, c.y, g), true);
            pending.delete(key(c.x, c.y, g));
            return reader;
        },
        
        clear(x, y, g) {
            let c = canon(x, y);
            cells.delete(key(c.x, c.y, g));
            pending.delete(key(c.x, c.y, g));
            anchors.delete(key(c.x, c.y, g));
            return reader;
        },
        
        markUnknown(x, y, g) {
            let c = canon(x, y);
            pending.add(key(c.x, c.y, g));
            return reader;
        },
        
        pin(x, y, g) {
            let c = canon(x, y);
            anchors.add(key(c.x, c.y, g));
            return reader;
        },
        
        fillBox(bx0, by0, bg0, bx1, by1, bg1) {
            for (let x = bx0; x <= bx1; x++) {
                for (let y = by0; y <= by1; y++) {
                    for (let g = bg0; g <= bg1; g++) {
                        reader.set(x, y, g);
                    }
                }
            }
            return reader;
        }
    };
    return reader;
}

module.exports = {
    createBlockFixture,
    gOf, zOfG, sOfG
};
