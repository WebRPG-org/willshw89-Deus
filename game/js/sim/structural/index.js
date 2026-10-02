"use strict";

/**
 * game/js/sim/structural/index.js
 *
 * Public API for Project DEUS Structural Mechanics & Cascading Collapse (NAT.02.01).
 * Rooted support topology (lane-en): docs/systems/DEUS_Structural.md.
 *
 * The tick path (held search, fall scan, dirty queue, structural service) keeps its
 * working state on the job and walks it with index loops. Voxel keys are numbers.
 * A generator, a rest list, or a "x,y,g" string would allocate on every charge.
 * Numeric keys are safe for x,y in [-131072, 131071] and g in [-32768, 32767].
 */

const { evalCellSupport } = require("./support.js");
const { executeCollapse, CELL_VOLUME_CUFT } = require("./collapse.js");
const rooted = require("./rooted.js");
const reader = require("./reader.js");
const levelsReader = require("./levels_reader.js");
const commit = require("./commit.js");
const occupants = require("./occupants.js");

const connectivity = require("./connectivity.js");
const counter = require("./counter.js");

const DEFAULTS = connectivity.DEFAULTS;
const STRATA = 5;

// 18 + 18 + 16 bits. Multiplication, not shifts: JS shifts truncate to 32 bits.
const KEY_X = 262144;
const KEY_XB = 131072;
const KEY_GB = 32768;

const EMPTY_OPTS = Object.freeze({});
const ALWAYS_COUNTER = { charge: function () { return true; } };

const HELD_DX = [0, 0, 1, 0, -1, 0];
const HELD_DY = [0, -1, 0, 1, 0, 0];
const HELD_DG = [-1, 0, 0, 0, 0, 1];

const MARK_DX = [0, 0, 0, 1, 0, -1, 0];
const MARK_DY = [0, 0, -1, 0, 1, 0, 0];
const MARK_DG = [0, -1, 0, 0, 0, 0, 1];

const FALL_OPT_KEYS = { counter: 1, maxFallVoxels: 1 };
const SERVICE_OPT_KEYS = {
    readsPerTick: 1,
    maxActiveJobs: 1,
    maxCommitsPerTick: 1,
    maxVisits: 1,
    maxFallVoxels: 1
};

function vkey(x, y, g) {
    return ((g + KEY_GB) * KEY_X + (y + KEY_XB)) * KEY_X + (x + KEY_XB);
}

function xykey(x, y) {
    return (y + KEY_XB) * KEY_X + (x + KEY_XB);
}

function compareXYZ(a, b) {
    return (a[2] - b[2]) || (a[1] - b[1]) || (a[0] - b[0]);
}

function compareItem(a, b) {
    return (a.tick - b.tick) || (a.g - b.g) || (a.y - b.y) || (a.x - b.x);
}

function compareFallG(a, b) {
    const ag = a.vacated.length > 0 ? a.vacated[0][2] : 0;
    const bg = b.vacated.length > 0 ? b.vacated[0][2] : 0;
    return ag - bg;
}

function compareColOrder(i, j) {
    return compareColOrder.g[i] - compareColOrder.g[j];
}

function requirePlain(opts, message) {
    if (opts === undefined || opts === null) return EMPTY_OPTS;
    if (typeof opts !== "object") throw new TypeError(message);
    return opts;
}

function rejectUnknown(opts, allowed, prefix) {
    if (opts === EMPTY_OPTS) return;
    const keys = Object.keys(opts);
    for (let i = 0; i < keys.length; i++) {
        if (!allowed[keys[i]]) throw new TypeError(prefix + keys[i] + '"');
    }
}

function snapshotOps(ops) {
    return { read: ops.read, visit: ops.visit, total: ops.total };
}

function charge(job, counter, kind) {
    if (!counter.charge(kind)) return false;
    job.ops[kind] += 1;
    job.ops.total += 1;
    return true;
}

function canonOf(reader, x, y) {
    if (!reader.canon) return null;
    const c = reader.canon(x, y);
    return c || null;
}

function removeAt(arr, i) {
    for (let j = i + 1; j < arr.length; j++) arr[j - 1] = arr[j];
    arr.length--;
}

function boxSorted(xs, ys, gs, n) {
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = [xs[i], ys[i], gs[i]];
    out.sort(compareXYZ);
    return out;
}

// --- Block fixture (spatial queries write into scratch, not fresh cells) ---

function createBlockFixture(spec) {
    spec = spec || {};
    const b = spec.bounds;
    if (!b) throw new TypeError("structural/block_reader: fixture needs bounds {x0, y0, x1, y1}");
    const x0 = b.x0, y0 = b.y0, x1 = b.x1, y1 = b.y1;
    const zMin = spec.zMin === undefined ? -2 : spec.zMin;
    const zMax = spec.zMax === undefined ? 2 : spec.zMax;
    const wrap = spec.wrap === true;
    const floor = spec.floor !== false;
    const cells = new Map();
    const pending = new Set();
    const anchors = new Set();
    const canonOut = { x: 0, y: 0 };
    const neighBuf = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const neighOut = new Array(6);
    let reads = 0;
    const floorG = floor ? reader.gOf(zMin, 0) : null;
    const topG = reader.gOf(zMax, STRATA - 1);

    function place(x, y) {
        if (wrap) {
            const w = x1 - x0 + 1;
            const h = y1 - y0 + 1;
            let nx = (x - x0) % w;
            if (nx < 0) nx += w;
            let ny = (y - y0) % h;
            if (ny < 0) ny += h;
            canonOut.x = x0 + nx;
            canonOut.y = y0 + ny;
        } else {
            canonOut.x = x;
            canonOut.y = y;
        }
        return canonOut;
    }

    function outOfBounds(x, y, g) {
        if (g > topG) return false;
        if (floorG !== null && g < floorG) return true;
        if (!wrap && (x < x0 || x > x1 || y < y0 || y > y1)) return true;
        return false;
    }

    const api = {
        get floorG() { return floorG; },
        get topG() { return topG; },
        get reads() { return reads; },
        // Same object every call. Copy x and y out before the next canon, state, or set.
        canon(x, y) {
            return place(x, y);
        },
        state(x, y, g) {
            reads++;
            const c = place(x, y);
            x = c.x;
            y = c.y;
            if (g > topG) return "air";
            if (outOfBounds(x, y, g)) return "unknown";
            const k = vkey(x, y, g);
            if (pending.has(k)) return "unknown";
            return cells.has(k) ? "solid" : "air";
        },
        neighbors(x, y, g) {
            let n = 0;
            for (let i = 0; i < 6; i++) {
                let nx = x + HELD_DX[i];
                let ny = y + HELD_DY[i];
                const ng = g + HELD_DG[i];
                const c = place(nx, ny);
                nx = c.x;
                ny = c.y;
                if (floorG !== null && ng < floorG) continue;
                if (ng > topG) continue;
                const t = neighBuf[n];
                t[0] = nx;
                t[1] = ny;
                t[2] = ng;
                neighOut[n] = t;
                n++;
            }
            neighOut.length = n;
            return neighOut;
        },
        key(x, y, g) {
            const c = place(x, y);
            return c.x + "," + c.y + "," + g;
        },
        anchor(x, y, g) {
            reads++;
            const c = place(x, y);
            return anchors.has(vkey(c.x, c.y, g));
        },
        set(x, y, g) {
            const c = place(x, y);
            const k = vkey(c.x, c.y, g);
            cells.set(k, true);
            pending.delete(k);
            return api;
        },
        clear(x, y, g) {
            const c = place(x, y);
            const k = vkey(c.x, c.y, g);
            cells.delete(k);
            pending.delete(k);
            anchors.delete(k);
            return api;
        },
        markUnknown(x, y, g) {
            const c = place(x, y);
            pending.add(vkey(c.x, c.y, g));
            return api;
        },
        pin(x, y, g) {
            const c = place(x, y);
            anchors.add(vkey(c.x, c.y, g));
            return api;
        },
        fillBox(bx0, by0, bg0, bx1, by1, bg1) {
            for (let x = bx0; x <= bx1; x++) {
                for (let y = by0; y <= by1; y++) {
                    for (let g = bg0; g <= bg1; g++) api.set(x, y, g);
                }
            }
            return api;
        }
    };
    return api;
}

// --- Held search (explicit program counter; one step runs until the counter refuses) ---

function HeldJob() {}

function noteRead(job, k) {
    if (!job.read.has(k)) job.readList.push(k);
    job.read.add(k);
}

function pushNode(job, x, y, g) {
    const k = vkey(x, y, g);
    if (job.visited.has(k)) return;
    job.visited.add(k);
    const sp = job.sp++;
    job.stackX[sp] = x;
    job.stackY[sp] = y;
    job.stackG[sp] = g;
    job.stackDir[sp] = 0;
}

function solidAt(job, x, y, g) {
    const o = job.overlay;
    if (o && o.x === x && o.y === y && o.g === g) return "solid";
    return job.reader.state(x, y, g);
}

function finishHeld(job, result) {
    job.result = result;
    job.done = true;
}

function stepHeld(job, counter) {
    if (job.error) throw job.error;
    if (job.done) return true;
    if (!counter || typeof counter.charge !== "function") {
        throw new TypeError("structural/connectivity: step needs an ops counter");
    }
    try {
        while (!job.done) {
            const pc = job.pc;
            if (pc === 0) {
                let sx = job.seedX, sy = job.seedY, sg = job.seedG;
                const c = canonOf(job.reader, sx, sy);
                if (c) { sx = c.x; sy = c.y; }
                job.sx = sx;
                job.sy = sy;
                job.sg = sg;
                job.pc = 1;
            } else if (pc === 1) {
                if (!charge(job, counter, "read")) return false;
                noteRead(job, vkey(job.sx, job.sy, job.sg));
                if (solidAt(job, job.sx, job.sy, job.sg) !== "solid") {
                    finishHeld(job, {
                        verdict: "not_solid", reason: "seed_not_solid", anchor: null,
                        visited: 0, component: null, watch: null, ops: job.ops
                    });
                    return true;
                }
                pushNode(job, job.sx, job.sy, job.sg);
                job.pc = 2;
            } else if (pc === 2) {
                if (job.sp === 0) { job.pc = 3; continue; }
                job.pc = job.stackDir[job.sp - 1] === 0 ? 4 : 5;
            } else if (pc === 4) {
                if (!charge(job, counter, "visit")) return false;
                const sp = job.sp - 1;
                if (job.visited.size > job.maxVisits) {
                    finishHeld(job, {
                        verdict: "held", reason: "too_large", anchor: null,
                        visited: job.visited.size, component: null, watch: null, ops: job.ops
                    });
                    return true;
                }
                const x = job.stackX[sp], y = job.stackY[sp], g = job.stackG[sp];
                let anchor = false;
                let isFloor = false;
                if (job.reader.floorG !== null && g === job.reader.floorG) {
                    isFloor = true;
                    anchor = true;
                } else {
                    anchor = job.reader.anchor(x, y, g);
                }
                if (anchor === true) {
                    finishHeld(job, {
                        verdict: "held",
                        reason: isFloor ? "floor" : "certified",
                        anchor: [x, y, g],
                        visited: job.visited.size,
                        component: null,
                        watch: null,
                        ops: job.ops
                    });
                    return true;
                }
                if (anchor === "pending") {
                    const w = job.wn++;
                    job.wx[w] = x;
                    job.wy[w] = y;
                    job.wg[w] = g;
                }
                const cn = job.cn++;
                job.cx[cn] = x;
                job.cy[cn] = y;
                job.cg[cn] = g;
                job.pc = 5;
            } else if (pc === 5) {
                const sp = job.sp - 1;
                if (job.stackDir[sp] < 6) {
                    const di = job.stackDir[sp]++;
                    let nx = job.stackX[sp] + HELD_DX[di];
                    let ny = job.stackY[sp] + HELD_DY[di];
                    const ng = job.stackG[sp] + HELD_DG[di];
                    const c = canonOf(job.reader, nx, ny);
                    if (c) { nx = c.x; ny = c.y; }
                    const nk = vkey(nx, ny, ng);
                    if (!job.visited.has(nk)) {
                        job.nx = nx;
                        job.ny = ny;
                        job.ng = ng;
                        job.nk = nk;
                        job.pc = 6;
                    }
                } else {
                    job.sp--;
                    job.pc = 2;
                }
            } else if (pc === 6) {
                if (!charge(job, counter, "read")) return false;
                noteRead(job, job.nk);
                const nSol = solidAt(job, job.nx, job.ny, job.ng);
                if (nSol === "unknown") {
                    const w = job.wn++;
                    job.wx[w] = job.nx;
                    job.wy[w] = job.ny;
                    job.wg[w] = job.ng;
                } else if (nSol === "solid") {
                    pushNode(job, job.nx, job.ny, job.ng);
                }
                job.pc = 2;
            } else if (pc === 3) {
                if (job.wn > 0) {
                    finishHeld(job, {
                        verdict: "held", reason: "unknown_edge", anchor: null,
                        visited: job.visited.size, component: null,
                        watch: boxSorted(job.wx, job.wy, job.wg, job.wn),
                        ops: job.ops
                    });
                } else {
                    finishHeld(job, {
                        verdict: "falls", reason: "no_anchor", anchor: null,
                        visited: job.visited.size,
                        component: boxSorted(job.cx, job.cy, job.cg, job.cn),
                        watch: null,
                        ops: job.ops
                    });
                }
                return true;
            }
        }
        return true;
    } catch (e) {
        job.error = e;
        throw e;
    }
}

HeldJob.prototype.step = function (counter) { return stepHeld(this, counter); };

function createHeldJob(reader, seed, opts) {
    opts = requirePlain(opts, "structural/connectivity: opts must be an object");
    const job = new HeldJob();
    job.reader = reader;
    job.seedX = seed.x;
    job.seedY = seed.y;
    job.seedG = seed.g;
    job.maxVisits = opts.maxVisits !== undefined ? opts.maxVisits : DEFAULTS.maxVisits;
    job.overlay = opts.overlay || null;
    job.ops = { read: 0, visit: 0, total: 0 };
    job.done = false;
    job.result = null;
    job.error = null;
    job.visited = new Set();
    job.read = new Set();
    job.readList = [];
    job.stackX = [];
    job.stackY = [];
    job.stackG = [];
    job.stackDir = [];
    job.sp = 0;
    job.cx = [];
    job.cy = [];
    job.cg = [];
    job.cn = 0;
    job.wx = [];
    job.wy = [];
    job.wg = [];
    job.wn = 0;
    job.pc = 0;
    return job;
}

function evaluateHeld(reader, seed, opts) {
    opts = requirePlain(opts, "structural/connectivity: opts must be an object");
    const job = createHeldJob(reader, seed, opts);
    const unlimited = !opts.counter;
    const c = unlimited ? ALWAYS_COUNTER : opts.counter;
    while (!job.step(c)) {
        if (!unlimited) {
            return { verdict: "pending", reason: "budget", job: job, ops: snapshotOps(job.ops) };
        }
    }
    return job.result;
}

const heldScratch = { maxVisits: undefined, overlay: null, counter: undefined };

function wouldBeHeld(reader, addr, opts) {
    opts = requirePlain(opts, "structural/connectivity: opts must be an object");
    heldScratch.maxVisits = opts.maxVisits;
    heldScratch.counter = opts.counter;
    heldScratch.overlay = addr;
    return evaluateHeld(reader, addr, heldScratch);
}

// --- Rigid fall (same pause rule: a refused charge retries the same read) ---

function FallJob() {}

function sortCol(col) {
    const order = col.order;
    const n = col.n;
    order.length = n;
    for (let i = 0; i < n; i++) order[i] = i;
    compareColOrder.g = col.g;
    order.sort(compareColOrder);
}

function buildColumns(job) {
    const component = job.component;
    const src = job.reader;
    const piece = job.piece;
    const cols = job.cols;
    const index = job.colMap;
    for (let i = 0; i < component.length; i++) {
        const b = component[i];
        let x = b[0];
        let y = b[1];
        const g = b[2];
        const c = canonOf(src, x, y);
        if (c) { x = c.x; y = c.y; }
        piece.add(vkey(x, y, g));
        const k = xykey(x, y);
        let col = index.get(k);
        if (!col) {
            col = { x: [], y: [], g: [], n: 0, order: [] };
            index.set(k, col);
            cols.push(col);
        }
        col.x.push(x);
        col.y.push(y);
        col.g.push(g);
        col.n++;
    }
    for (let i = 0; i < cols.length; i++) sortCol(cols[i]);
}

function finishFall(job) {
    const component = job.component;
    const piece = job.piece;
    const drop = job.bestDrop;
    const vacated = [];
    const filled = [];
    for (let i = 0; i < component.length; i++) {
        const b = component[i];
        const x = b[0], y = b[1], g = b[2];
        if (!piece.has(vkey(x, y, g - drop))) filled.push([x, y, g - drop]);
        if (!piece.has(vkey(x, y, g + drop))) vacated.push([x, y, g]);
    }
    vacated.sort(compareXYZ);
    filled.sort(compareXYZ);
    job.result = {
        ok: true,
        drop: drop,
        blocks: component.length,
        vacated: vacated,
        filled: filled,
        contact: job.contact,
        ops: job.ops
    };
    job.done = true;
}

function stepFall(job, counter) {
    if (job.error) throw job.error;
    if (job.done) return true;
    if (!counter || typeof counter.charge !== "function") {
        throw new TypeError("structural/fall: step needs an ops counter");
    }
    try {
        while (!job.done) {
            const pc = job.pc;
            if (pc === 0) {
                if (job.component.length > job.maxFallVoxels) {
                    job.result = { ok: false, reason: "too_large", ops: job.ops };
                    job.done = true;
                    return true;
                }
                buildColumns(job);
                job.bestDrop = Infinity;
                job.contact = null;
                job.depth = 0;
                job.colIndex = 0;
                job.pc = 1;
            } else if (pc === 1) {
                if (job.colIndex >= job.cols.length) {
                    job.depth++;
                    job.colIndex = 0;
                }
                if (job.colIndex === 0) {
                    let any = false;
                    const depth = job.depth;
                    const cols = job.cols;
                    for (let i = 0; i < cols.length; i++) {
                        if (depth < cols[i].n) { any = true; break; }
                    }
                    if (!any) { job.pc = 3; continue; }
                }
                const col = job.cols[job.colIndex];
                if (job.depth >= col.n) {
                    job.colIndex++;
                    continue;
                }
                const oi = col.order[job.depth];
                job.bx = col.x[oi];
                job.by = col.y[oi];
                job.bg = col.g[oi];
                job.g = job.bg - 1;
                job.currentDrop = 0;
                job.pc = 2;
            } else if (pc === 2) {
                if (job.currentDrop > job.bestDrop) {
                    job.colIndex++;
                    job.pc = 1;
                    continue;
                }
                if (!charge(job, counter, "read")) return false;
                const sol = job.reader.state(job.bx, job.by, job.g);
                if (sol === "unknown") {
                    job.result = { ok: false, reason: "unknown_below", ops: job.ops };
                    job.done = true;
                    return true;
                }
                if (sol === "solid" && !job.piece.has(vkey(job.bx, job.by, job.g))) {
                    if (job.currentDrop < job.bestDrop) {
                        job.bestDrop = job.currentDrop;
                        job.contact = [job.bx, job.by, job.g];
                    }
                    job.colIndex++;
                    job.pc = 1;
                    continue;
                }
                if (job.reader.floorG !== null && job.g === job.reader.floorG) {
                    if (job.currentDrop + 1 < job.bestDrop) {
                        job.bestDrop = job.currentDrop + 1;
                        job.contact = null;
                    }
                    job.colIndex++;
                    job.pc = 1;
                    continue;
                }
                job.g--;
                job.currentDrop++;
            } else if (pc === 3) {
                if (job.bestDrop === 0) {
                    job.result = { ok: false, reason: "no_room", ops: job.ops };
                    job.done = true;
                    return true;
                }
                finishFall(job);
                return true;
            }
        }
        return true;
    } catch (e) {
        job.error = e;
        throw e;
    }
}

FallJob.prototype.step = function (counter) { return stepFall(this, counter); };

function createFallJob(src, component, opts) {
    opts = requirePlain(opts, "structural/fall: opts must be an object");
    rejectUnknown(opts, FALL_OPT_KEYS, 'structural/fall: unknown option "');
    const job = new FallJob();
    job.reader = src;
    job.component = component;
    job.maxFallVoxels = opts.maxFallVoxels !== undefined ? opts.maxFallVoxels : DEFAULTS.maxFallVoxels;
    job.ops = { read: 0, visit: 0, total: 0 };
    job.done = false;
    job.result = null;
    job.error = null;
    job.piece = new Set();
    job.cols = [];
    job.colMap = new Map();
    job.pc = 0;
    job.bestDrop = Infinity;
    job.contact = null;
    return job;
}

function planFall(src, component, opts) {
    opts = requirePlain(opts, "structural/fall: opts must be an object");
    const job = createFallJob(src, component, opts);
    const unlimited = !opts.counter;
    const c = unlimited ? ALWAYS_COUNTER : opts.counter;
    while (!job.step(c)) {
        if (!unlimited) return { pending: true, job: job, ops: snapshotOps(job.ops) };
    }
    return job.result;
}

// --- Dirty queue and the per-tick service ---

const QUEUE_VERSION = 1;

function createDirtyQueue() {
    const items = [];
    const byKey = new Map();
    const scratch = [];

    function addRaw(x, y, g, tick) {
        const key = vkey(x, y, g);
        const existing = byKey.get(key);
        if (!existing) {
            const item = { x: x, y: y, g: g, tick: tick, key: key };
            byKey.set(key, item);
            items.push(item);
        } else if (tick < existing.tick) {
            existing.tick = tick;
        }
    }

    function sortItems() {
        const m = items.length;
        scratch.length = m;
        for (let i = 0; i < m; i++) scratch[i] = items[i];
        scratch.sort(compareItem);
    }

    function compact() {
        let w = 0;
        for (let i = 0; i < items.length; i++) {
            if (byKey.has(items[i].key)) items[w++] = items[i];
        }
        items.length = w;
    }

    function takeCount(n) {
        const m = items.length;
        if (m === 0) return 0;
        sortItems();
        const count = n < m ? n : m;
        for (let i = 0; i < count; i++) byKey.delete(scratch[i].key);
        compact();
        return count;
    }

    return {
        add(addr, tick) {
            addRaw(addr[0], addr[1], addr[2], tick);
        },
        addRaw: addRaw,
        has(addr) {
            return byKey.has(vkey(addr[0], addr[1], addr[2]));
        },
        get size() { return items.length; },
        take(n) {
            const m = items.length;
            if (m === 0) return [];
            sortItems();
            const count = n < m ? n : m;
            const out = new Array(count);
            for (let i = 0; i < count; i++) {
                const it = scratch[i];
                out[i] = [it.x, it.y, it.g, it.tick];
                byKey.delete(it.key);
            }
            compact();
            return out;
        },
        takeOne(out) {
            if (items.length === 0) return false;
            sortItems();
            const it = scratch[0];
            out[0] = it.x;
            out[1] = it.y;
            out[2] = it.g;
            out[3] = it.tick;
            byKey.delete(it.key);
            compact();
            return true;
        },
        snapshot() {
            sortItems();
            const seeds = new Array(items.length);
            for (let i = 0; i < items.length; i++) {
                const it = scratch[i];
                seeds[i] = [it.x, it.y, it.g, it.tick];
            }
            return { v: QUEUE_VERSION, seeds: seeds };
        },
        restore(data) {
            if (!data || data.v !== QUEUE_VERSION) throw new Error("Unknown queue snapshot version");
            const seeds = data.seeds;
            for (let i = 0; i < seeds.length; i++) {
                const item = seeds[i];
                const x = item[0], y = item[1], g = item[2], tick = item[3];
                const key = vkey(x, y, g);
                const existing = byKey.get(key);
                if (!existing) addRaw(x, y, g, tick);
                else existing.tick = tick;
            }
            return true;
        }
    };
}

function createReusableCounter() {
    const byKind = { read: 0, visit: 0, write: 0 };
    let used = 0;
    let limit = 0;
    return {
        get limit() { return limit; },
        get used() { return used; },
        get remaining() { return limit - used; },
        byKind: byKind,
        reset(next) {
            limit = next;
            used = 0;
            byKind.read = 0;
            byKind.visit = 0;
            byKind.write = 0;
        },
        charge(kind) {
            if (kind !== "read" && kind !== "visit" && kind !== "write") {
                throw new Error('structural/counter: unknown op kind "' + kind + '"');
            }
            if (used >= limit) return false;
            used += 1;
            byKind[kind] += 1;
            return true;
        }
    };
}

function createStructuralService(src, opts) {
    opts = requirePlain(opts, "structural/queue: opts must be an object");
    rejectUnknown(opts, SERVICE_OPT_KEYS, 'structural/queue: unknown option "');
    const readsPerTick = opts.readsPerTick !== undefined ? opts.readsPerTick : DEFAULTS.readsPerTick;
    const maxActiveJobs = opts.maxActiveJobs !== undefined ? opts.maxActiveJobs : DEFAULTS.maxActiveJobs;
    const maxCommitsPerTick = opts.maxCommitsPerTick !== undefined ? opts.maxCommitsPerTick : DEFAULTS.maxCommitsPerTick;
    const queue = createDirtyQueue();
    const activeJobs = [];
    const readyFalls = [];
    const settledFalls = new Set();
    const opsTotal = { read: 0, visit: 0, write: 0, total: 0 };
    const opsLast = { read: 0, visit: 0, write: 0, total: 0 };
    const commits = [];
    const result = { falls: commits, held: 0, unknownEdge: 0, pending: 0, ops: opsLast };
    const localCounter = createReusableCounter();
    const seedScratch = [0, 0, 0, 0];
    const seedObj = { x: 0, y: 0, g: 0 };
    const fallOpts = {};
    const heldOpts = {};
    if (opts.maxFallVoxels !== undefined) fallOpts.maxFallVoxels = opts.maxFallVoxels;
    if (opts.maxVisits !== undefined) heldOpts.maxVisits = opts.maxVisits;
    let epoch = 0;
    let ticks = 0;
    let fallsCommitted = 0;
    let heldResults = 0;

    function noteSettled(component) {
        for (let i = 0; i < component.length; i++) {
            const b = component[i];
            settledFalls.add(vkey(b[0], b[1], b[2]));
        }
    }

    function acceptHeld(res, seed, counter, pendingBox) {
        if (res.verdict === "falls") {
            noteSettled(res.component);
            const fallJob = createFallJob(src, res.component, fallOpts);
            if (fallJob.step(counter)) {
                if (fallJob.result.ok) readyFalls.push(fallJob.result);
            } else {
                activeJobs.push({ type: "fall", job: fallJob, seed: seed });
                pendingBox.n++;
            }
        } else if (res.verdict === "held") {
            heldResults++;
            pendingBox.held++;
            if (res.reason === "unknown_edge") pendingBox.unknown++;
        }
    }

    const svc = {
        queue: queue,
        markChanged(addrs, tick) {
            for (let i = 0; i < addrs.length; i++) {
                const addr = addrs[i];
                let x = addr[0];
                let y = addr[1];
                const g = addr[2];
                const c = canonOf(src, x, y);
                if (c) { x = c.x; y = c.y; }
                for (let d = 0; d < 7; d++) {
                    queue.addRaw(x + MARK_DX[d], y + MARK_DY[d], g + MARK_DG[d], tick);
                }
            }
        },
        // The returned object is reused on the next tick. Read it before calling tick again.
        tick(tickNo, counter) {
            ticks++;
            opsLast.read = 0;
            opsLast.visit = 0;
            opsLast.write = 0;
            opsLast.total = 0;
            commits.length = 0;
            const own = !counter;
            if (own) {
                localCounter.reset(readsPerTick);
                counter = localCounter;
            }
            const pendingBox = { n: 0, held: 0, unknown: 0 };

            for (let i = activeJobs.length - 1; i >= 0; i--) {
                const info = activeJobs[i];
                const done = info.job.step(counter);
                if (!done) {
                    pendingBox.n++;
                } else {
                    removeAt(activeJobs, i);
                    const res = info.job.result;
                    if (info.type === "held") {
                        if (res.verdict === "falls") {
                            noteSettled(res.component);
                            const fallJob = createFallJob(src, res.component, fallOpts);
                            activeJobs.push({ type: "fall", job: fallJob, seed: info.seed });
                            pendingBox.n++;
                        } else if (res.verdict === "held") {
                            heldResults++;
                            pendingBox.held++;
                            if (res.reason === "unknown_edge") pendingBox.unknown++;
                        }
                    } else if (info.type === "fall") {
                        if (res.ok) readyFalls.push(res);
                    }
                }
            }

            while (activeJobs.length < maxActiveJobs && queue.size > 0 && counter.remaining > 0) {
                if (!queue.takeOne(seedScratch)) break;
                const x = seedScratch[0], y = seedScratch[1], g = seedScratch[2];
                const seed = [x, y, g, seedScratch[3]];
                if (settledFalls.has(vkey(x, y, g))) continue;
                counter.charge("read");
                if (src.state(x, y, g) !== "solid") continue;
                seedObj.x = x;
                seedObj.y = y;
                seedObj.g = g;
                const heldJob = createHeldJob(src, seedObj, heldOpts);
                if (heldJob.step(counter)) {
                    acceptHeld(heldJob.result, seed, counter, pendingBox);
                } else {
                    activeJobs.push({ type: "held", job: heldJob, seed: seed });
                    pendingBox.n++;
                }
            }

            if (readyFalls.length > 0) {
                readyFalls.sort(compareFallG);
                const n = readyFalls.length < maxCommitsPerTick ? readyFalls.length : maxCommitsPerTick;
                for (let i = 0; i < n; i++) {
                    const p = readyFalls[i];
                    commits.push({ id: "f_" + ticks + "_" + i, component: p.vacated, plan: p });
                }
                if (n > 0) {
                    let w = 0;
                    for (let i = n; i < readyFalls.length; i++) readyFalls[w++] = readyFalls[i];
                    readyFalls.length = w;
                }
                fallsCommitted += n;
            }

            const byKind = counter.byKind;
            opsLast.read = byKind.read;
            opsLast.visit = byKind.visit;
            opsLast.write = byKind.write;
            opsLast.total = byKind.read + byKind.visit + byKind.write;
            opsTotal.read += opsLast.read;
            opsTotal.visit += opsLast.visit;
            opsTotal.write += opsLast.write;
            opsTotal.total += opsLast.total;

            result.held = pendingBox.held;
            result.unknownEdge = pendingBox.unknown;
            result.pending = pendingBox.n + activeJobs.length;
            return result;
        },
        committed(changedAddrs, tickNo) {
            epoch++;
            readyFalls.length = 0;
            settledFalls.clear();
            if (!changedAddrs || changedAddrs.length === 0) return;
            const changed = new Set();
            for (let i = 0; i < changedAddrs.length; i++) {
                const addr = changedAddrs[i];
                changed.add(vkey(addr[0], addr[1], addr[2]));
            }
            for (let i = activeJobs.length - 1; i >= 0; i--) {
                const info = activeJobs[i];
                let touched = false;
                if (info.type === "held" && info.job.read) {
                    const list = info.job.readList;
                    for (let r = 0; r < list.length; r++) {
                        if (changed.has(list[r])) { touched = true; break; }
                    }
                } else if (info.type === "fall") {
                    touched = true;
                }
                if (touched) {
                    const seed = info.seed;
                    removeAt(activeJobs, i);
                    queue.addRaw(seed[0], seed[1], seed[2], tickNo);
                }
            }
            svc.markChanged(changedAddrs, tickNo);
        },
        stats() {
            return {
                queued: queue.size,
                activeJobs: activeJobs.length,
                epoch: epoch,
                opsLastTick: { read: opsLast.read, visit: opsLast.visit, write: opsLast.write, total: opsLast.total },
                opsTotal: { read: opsTotal.read, visit: opsTotal.visit, write: opsTotal.write, total: opsTotal.total },
                ticks: ticks,
                falls: fallsCommitted,
                held: heldResults
            };
        }
    };
    return svc;
}

module.exports = {
    createHeldJob: createHeldJob,
    evaluateHeld: evaluateHeld,
    wouldBeHeld: wouldBeHeld,
    createFallJob: createFallJob,
    planFall: planFall,
    createDirtyQueue: createDirtyQueue,
    createStructuralService: createStructuralService,
    createBlockFixture: createBlockFixture,
    createOpsCounter: counter.createOpsCounter,

    evalCellSupport: evalCellSupport,
    executeCollapse: executeCollapse,
    CELL_VOLUME_CUFT: CELL_VOLUME_CUFT,

    evaluateMember: rooted.evaluateMember,
    createRootedJob: rooted.createRootedJob,
    bandOf: rooted.bandOf,
    spanBaseFor: rooted.spanBaseFor,
    spanEffOf: rooted.spanEffOf,
    S_MAX: rooted.S_MAX,
    SPAN_THICKNESS: rooted.SPAN_THICKNESS,

    createFixtureReader: reader.createFixtureReader,
    FIXTURE_MATERIALS: reader.FIXTURE_MATERIALS,
    READER_PENDING: reader.PENDING,
    gOf: reader.gOf,
    zOfG: reader.zOfG,
    sOfG: reader.sOfG,

    createLevelsReader: levelsReader.createLevelsReader,
    commitFall: commit.commitFall,
    planOccupants: occupants.planOccupants
};
