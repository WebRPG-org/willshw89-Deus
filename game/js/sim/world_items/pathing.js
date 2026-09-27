"use strict";
// 8-way tile pathing for units. Terrain, walls and caves stay on the square grid:
// the caller marks whole tiles blocked. A diagonal step is refused when either
// orthogonal neighbour is blocked (PM default: do not cut a blocking corner).
// Movement8D on main is an RMMZ character plugin, so the sim keeps this adapter.

const C = require("./constants");

const DIR8 = {
    2: { dx: 0, dy: 1 },
    4: { dx: -1, dy: 0 },
    6: { dx: 1, dy: 0 },
    8: { dx: 0, dy: -1 },
    1: { dx: -1, dy: 1 },
    3: { dx: 1, dy: 1 },
    7: { dx: -1, dy: -1 },
    9: { dx: 1, dy: -1 }
};

const STEPS = [
    { dx: 1, dy: 0, cost: 10 },
    { dx: -1, dy: 0, cost: 10 },
    { dx: 0, dy: 1, cost: 10 },
    { dx: 0, dy: -1, cost: 10 },
    { dx: 1, dy: 1, cost: 14 },
    { dx: 1, dy: -1, cost: 14 },
    { dx: -1, dy: 1, cost: 14 },
    { dx: -1, dy: -1, cost: 14 }
];

function fail(code, msg) {
    const err = new Error(code + ": " + msg);
    err.code = code;
    throw err;
}

function frameStep(dir, mode) {
    const d = DIR8[dir];
    if (!d) fail("E_DIR", "direction " + dir + " is not one of 8");
    if (mode !== "walk" && mode !== "run") fail("E_GAIT", "gait must be walk or run");
    const diag = d.dx !== 0 && d.dy !== 0;
    const px = diag ? (mode === "run" ? C.RUN_DIAGONAL_PX : C.WALK_DIAGONAL_PX) : (mode === "run" ? C.RUN_CARDINAL_PX : C.WALK_CARDINAL_PX); // WALK_DIAG
    return { dx: px * d.dx, dy: px * d.dy };
}

function canStep(x, y, nx, ny, blocked) {
    const dx = nx - x;
    const dy = ny - y;
    if (dx === 0 && dy === 0) return false;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return false;
    if (blocked(nx, ny)) return false;
    if (dx !== 0 && dy !== 0) {
        if (blocked(x + dx, y) || blocked(x, y + dy)) return false; // CORNER_GATE
    }
    return true;
}

function heuristic(ax, ay, bx, by) {
    const dx = Math.abs(ax - bx);
    const dy = Math.abs(ay - by);
    const lo = dx < dy ? dx : dy;
    const hi = dx < dy ? dy : dx;
    return lo * 14 + (hi - lo) * 10;
}

function findPath(opts) {
    const sx = opts.start.x | 0;
    const sy = opts.start.y | 0;
    const gx = opts.goal.x | 0;
    const gy = opts.goal.y | 0;
    const blocked = opts.blocked;
    const maxNodes = opts.maxNodes || 8192;
    if (sx === gx && sy === gy) return { tiles: [{ x: sx, y: sy }], cost: 0 };
    if (blocked(gx, gy)) return null;

    const open = [];
    const gScore = new Map();
    const parent = new Map();
    const closed = new Set();
    const startKey = sx + "," + sy;
    gScore.set(startKey, 0);
    open.push({ f: heuristic(sx, sy, gx, gy), g: 0, x: sx, y: sy });
    let expanded = 0;

    function better(a, b) {
        if (a.f !== b.f) return a.f < b.f;
        if (a.g !== b.g) return a.g < b.g;
        if (a.x !== b.x) return a.x < b.x;
        return a.y < b.y;
    }
    function siftUp(i) {
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (!better(open[i], open[p])) break;
            const tmp = open[i]; open[i] = open[p]; open[p] = tmp;
            i = p;
        }
    }
    function siftDown(i) {
        for (;;) {
            let s = i;
            const l = i * 2 + 1;
            const r = l + 1;
            if (l < open.length && better(open[l], open[s])) s = l;
            if (r < open.length && better(open[r], open[s])) s = r;
            if (s === i) break;
            const tmp = open[i]; open[i] = open[s]; open[s] = tmp;
            i = s;
        }
    }

    while (open.length) {
        const cur = open[0];
        open[0] = open[open.length - 1];
        open.pop();
        if (open.length) siftDown(0);
        const key = cur.x + "," + cur.y;
        if (closed.has(key)) continue;
        if (gScore.get(key) !== cur.g) continue;
        if (cur.x === gx && cur.y === gy) {
            const tiles = [{ x: gx, y: gy }];
            let k = key;
            while (parent.has(k)) {
                k = parent.get(k);
                const parts = k.split(",");
                tiles.push({ x: parseInt(parts[0], 10), y: parseInt(parts[1], 10) });
            }
            tiles.reverse();
            return { tiles: tiles, cost: cur.g };
        }
        closed.add(key);
        expanded++;
        if (expanded > maxNodes) return null;
        for (let i = 0; i < STEPS.length; i++) {
            const step = STEPS[i];
            const nx = cur.x + step.dx;
            const ny = cur.y + step.dy;
            if (!canStep(cur.x, cur.y, nx, ny, blocked)) continue;
            const nk = nx + "," + ny;
            if (closed.has(nk)) continue;
            const ng = cur.g + step.cost;
            const prev = gScore.get(nk);
            if (prev !== undefined && ng >= prev) continue;
            gScore.set(nk, ng);
            parent.set(nk, key);
            open.push({ f: ng + heuristic(nx, ny, gx, gy), g: ng, x: nx, y: ny });
            siftUp(open.length - 1);
        }
    }
    return null;
}

module.exports = { DIR8, frameStep, canStep, findPath };
