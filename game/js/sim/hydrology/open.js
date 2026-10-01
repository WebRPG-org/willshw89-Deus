"use strict";

/**
 * game/js/sim/hydrology/open.js
 *
 * Project DEUS open-fluid store (NAT.03.02 contract checkpoint, lane-ea).
 * Open water and lava are stored as integer centipounds (cp, DEC-038) per
 * (area, z) cell, sparse: a cell exists only while it holds fluid. Depth, height
 * and type are views derived from cp and the host's open strata; there is no
 * depth-unit store. Capacity is open strata x units.STRATUM_FT3 x the class's
 * density; water's density comes from sim/units.js, any other class's from the
 * host. Flow is DEUS_Fluid.stepArea's gravity-then-equalize rule ported to cp,
 * across wrapped area seams, under one work budget. Fluid enters only from a
 * registered, finite source that is debited by the same amount (DEC-040).
 *
 * Host-agnostic: no window, RMMZ or UF references, no randomness, no clock.
 * Contract and simplifications: docs/systems/DEUS_WaterAuthority.md.
 */

const units = require("../units.js");

const DEPTH_VIEW_MAX = 7;    // DEUS_Fluid's 0..7 depth scale; a view, never a store
const DEFAULT_BUDGET = 512;  // work units per step (brief NAT.03.02 lane-ea: budget 512)
// Surfaces within one millistratum (the aquifer head unit, DESIGN-D2 3.2) count as
// level: equalization stops there instead of trading single cp for many steps.
const MILLISTRATA_PER_STRATUM = 1000;
const SAVE_VERSION = 1;

const STRATA = units.STRATA_PER_Z;
const FULL_MASK = (1 << STRATA) - 1;
const BOTTOM_BIT = 1;                 // stratum 0, the bottom of a z cell
const TOP_BIT = 1 << (STRATA - 1);    // stratum STRATA - 1, the top
const LATERAL = Object.freeze([[0, -1], [1, 0], [0, 1], [-1, 0]]);   // N E S W, as DEUS_Fluid
const NEIGHBOURS_3D = Object.freeze([[0, 0, 1], [0, 0, -1], [0, -1, 0], [1, 0, 0], [0, 1, 0], [-1, 0, 0]]);

// A visit of a queued cell runs these phases in order, one work unit for the
// visit and one per host probe. The cursor keeps the phase across steps.
const PHASE_VISIT = 0;
const PHASE_DOWN = 1;
const PHASE_LATERAL = 2;
const PHASE_END = PHASE_LATERAL + LATERAL.length;

function fail(code, message) {
    const e = new Error(code + ": " + message);
    e.code = code;
    throw e;
}

function isAmount(v) { return Number.isSafeInteger(v) && v >= 0; }
function requireAmount(v, where) { if (!isAmount(v)) fail("E_AMOUNT", where + " must be a nonnegative safe integer cp, got " + String(v)); }

function popcount(mask) {
    let n = 0;
    for (let m = mask; m; m &= m - 1) n++;
    return n;
}

function lowestBit(mask) {
    for (let s = 0; s < STRATA; s++) if (mask & (1 << s)) return s;
    return -1;
}

/**
 * Surface level of cp of one class in a cell, in units of 1/cap stratum above the
 * cell floor. Fluid fills the open strata from the bottom up (a cell is one
 * compartment). Empty: the bottom of the lowest open stratum. Strictly
 * increasing in cp. -1 when no stratum is open.
 */
function levelOf(cp, mask, cap) {
    let rest = cp, top = -1;
    for (let s = 0; s < STRATA; s++) {
        if (!(mask & (1 << s))) continue;
        if (rest === 0) return top >= 0 ? top : s * cap;
        if (rest <= cap) return s * cap + rest;
        rest -= cap;
        top = (s + 1) * cap;
    }
    return top;
}

// Derived 0..7 depth from the fluid's physical thickness (cp / cap strata), so
// a full two-foot cavity reads shallower than a full ten-foot cell, and equal
// volumes of water and lava read alike. Half-up; 1 for any fluid present.
function depthViewOf(cp, cap) {
    if (cp === 0) return 0;
    const whole = STRATA * cap;
    const v = Math.floor((2 * DEPTH_VIEW_MAX * cp + whole) / (2 * whole));
    return v < 1 ? 1 : v;
}

function cellKey(ax, ay, x, y, z) { return ax + "," + ay + "," + x + "," + y + "," + z; }
function parseKey(key) {
    const p = key.split(",").map(Number);
    return { ax: p[0], ay: p[1], x: p[2], y: p[3], z: p[4] };
}
function canonicalSeamKey(a, b) { return a < b ? a + "|" + b : b + "|" + a; }

function readHost(host) {
    if (!host || typeof host.openMask !== "function") fail("E_HOST", "host.openMask(ax, ay, x, y, z) is required");
    const w = { size: host.size, areasX: host.areasX, areasY: host.areasY, zMin: host.zMin, zMax: host.zMax };
    for (const k of ["size", "areasX", "areasY"]) if (!Number.isSafeInteger(w[k]) || w[k] < 1) fail("E_HOST", "host." + k + " must be a positive integer");
    if (!Number.isSafeInteger(w.zMin) || !Number.isSafeInteger(w.zMax) || w.zMin > w.zMax) fail("E_HOST", "host.zMin..zMax must be an integer range");
    return w;
}

// Densities in cp per cubic foot. Water's is the shared table's; another class
// (lava) must come from the host's material data. No class gets a default here.
function readDensities(given) {
    const d = { water: units.WATER_CP_PER_FT3 };
    const g = given || {};
    for (const cls of Object.keys(g).sort()) {
        const v = g[cls];
        if (!/^[a-z][a-z0-9_]*$/.test(cls)) fail("E_CLASS", "fluid class names are lower-case identifiers, got " + cls);
        if (!Number.isSafeInteger(v) || v < 1) fail("E_CALIBRATION", "density of " + cls + " must be a positive integer cp/ft3");
        if (cls === "water" && v !== d.water) fail("E_CALIBRATION", "water density comes from sim/units.js (" + d.water + "), not the host (" + v + ")");
        d[cls] = v;
    }
    return d;
}

/**
 * createOpenFluid(options) -> store
 *   options.host       { size, areasX, areasY, zMin, zMax, openMask(ax, ay, x, y, z) -> 0..31 }
 *                      openMask bit s is set when stratum s (0 = bottom) of that cell is open.
 *   options.densities  { lava: cp/ft3, ... } for every class other than water.
 *   options.budget     work units per step; default DEFAULT_BUDGET.
 */
function createOpenFluid(options) {
    const opts = options || {};
    const host = opts.host;
    const world = readHost(host);
    const densities = readDensities(opts.densities);
    const classes = Object.keys(densities).sort();
    const caps = {};
    for (const cls of classes) caps[cls] = units.mulCp(units.STRATUM_FT3, densities[cls]);
    const defaultBudget = opts.budget === undefined ? DEFAULT_BUDGET : opts.budget;
    if (!isAmount(defaultBudget)) fail("E_BUDGET", "budget must be a nonnegative integer");

    let S = emptyState();

    function emptyState() {
        const open = {}, src = {};
        for (const cls of classes) { open[cls] = 0; src[cls] = 0; }
        return {
            areas: new Map(),      // "ax,ay" -> Map(z -> Map(y * size + x -> { cls, cp }))
            queue: [], head: 0,    // queued cell keys, FIFO
            inQueue: new Set(),
            cursor: null,          // { phase, mask, changed } of queue[head] while its visit is unfinished
            sources: new Map(),    // id -> { cls, cp, registered }
            open, src,             // per-class running totals, cp
            row: 0                 // last transfer record row
        };
    }

    // --- Geometry ---------------------------------------------------------
    function requireRef(ref, where) {
        const r = ref || {};
        const ok = [r.ax, r.ay, r.x, r.y, r.z].every(Number.isSafeInteger)
            && r.ax >= 0 && r.ax < world.areasX && r.ay >= 0 && r.ay < world.areasY
            && r.x >= 0 && r.x < world.size && r.y >= 0 && r.y < world.size
            && r.z >= world.zMin && r.z <= world.zMax;
        if (!ok) fail("E_REF", where + ": not a cell of this world: " + JSON.stringify(ref));
        return { ax: r.ax, ay: r.ay, x: r.x, y: r.y, z: r.z };
    }

    // Emerys wraps on every horizontal edge: stepping off an area enters its
    // neighbour area, and off the outer edge of the area grid, the far side.
    function neighbour(c, dx, dy) {
        let ax = c.ax, ay = c.ay, x = c.x + dx, y = c.y + dy;
        if (x < 0) { x += world.size; ax = (ax + world.areasX - 1) % world.areasX; }
        else if (x >= world.size) { x -= world.size; ax = (ax + 1) % world.areasX; }
        if (y < 0) { y += world.size; ay = (ay + world.areasY - 1) % world.areasY; }
        else if (y >= world.size) { y -= world.size; ay = (ay + 1) % world.areasY; }
        return { ax, ay, x, y, z: c.z };
    }

    function probe(c) {
        const m = host.openMask(c.ax, c.ay, c.x, c.y, c.z);
        if (!Number.isInteger(m) || m < 0 || m > FULL_MASK) fail("E_HOST", "openMask returned " + String(m) + " at " + cellKey(c.ax, c.ay, c.x, c.y, c.z));
        return m;
    }

    function capacityOf(mask, cls) { return popcount(mask) * caps[cls]; }

    // --- Sparse cells -----------------------------------------------------
    function cellAt(c) {
        const a = S.areas.get(c.ax + "," + c.ay);
        const level = a && a.get(c.z);
        return (level && level.get(c.y * world.size + c.x)) || null;
    }

    function compatible(cell, cls) {
        return !cell || cell.cls === cls;
    }

    function credit(c, cls, cp) {
        const ak = c.ax + "," + c.ay;
        let a = S.areas.get(ak);
        if (!a) S.areas.set(ak, a = new Map());
        let level = a.get(c.z);
        if (!level) a.set(c.z, level = new Map());
        const idx = c.y * world.size + c.x;
        const cell = level.get(idx);
        if (!cell) { level.set(idx, { cls, cp }); return; }
        if (cell.cls !== cls) fail("E_MIX", cls + " cannot enter a cell holding " + cell.cls);
        cell.cp = units.addCp(cell.cp, cp);
    }

    function debit(c, cell, cp) {
        cell.cp = units.subCp(cell.cp, cp);
        if (cell.cp > 0) return;
        const ak = c.ax + "," + c.ay, a = S.areas.get(ak), level = a.get(c.z);
        level.delete(c.y * world.size + c.x);
        if (level.size === 0) a.delete(c.z);
        if (a.size === 0) S.areas.delete(ak);
    }

    function record(out, rec) {
        rec.row = ++S.row;
        out.push(rec);
        return rec;
    }

    // One cell-to-cell move: the donor is debited exactly what the receiver is credited.
    function move(out, from, fromCell, to, cp, cause) {
        const cls = fromCell.cls;
        debit(from, fromCell, cp);
        credit(to, cls, cp);
        const fk = cellKey(from.ax, from.ay, from.x, from.y, from.z), tk = cellKey(to.ax, to.ay, to.x, to.y, to.z);
        const rec = { row: 0, cls, cp, cause, from: fk, to: tk };
        if (from.ax !== to.ax || from.ay !== to.ay) rec.seam = canonicalSeamKey(fk, tk);
        record(out, rec);
    }

    // --- Queue ------------------------------------------------------------
    function enqueue(key) {
        if (S.inQueue.has(key)) return;
        S.inQueue.add(key);
        S.queue.push(key);
    }

    // Queue a cell and those of its six neighbours that hold fluid: a dry cell
    // never pushes, so it needs no visit until fluid reaches it.
    function wakeAround(c) {
        if (cellAt(c)) enqueue(cellKey(c.ax, c.ay, c.x, c.y, c.z));
        for (const d of NEIGHBOURS_3D) {
            const z = c.z + d[2];
            if (z < world.zMin || z > world.zMax) continue;
            const n = d[2] ? { ax: c.ax, ay: c.ay, x: c.x, y: c.y, z } : neighbour(c, d[0], d[1]);
            if (cellAt(n)) enqueue(cellKey(n.ax, n.ay, n.x, n.y, n.z));
        }
    }

    // --- Flow (DEUS_Fluid.stepArea ported to cp) ----------------------------
    // Priority 1: gravity. Fluid on an open bottom stratum falls into the cell
    // below when that cell's top stratum is open, up to the room below.
    function flowDown(out, c, cell, belowMask) {
        const b = { ax: c.ax, ay: c.ay, x: c.x, y: c.y, z: c.z - 1 };
        const below = cellAt(b);
        if (!compatible(below, cell.cls)) return false;   // unlike fluids never share
        const room = capacityOf(belowMask, cell.cls) - (below ? below.cp : 0);
        const cp = Math.min(cell.cp, room);
        if (cp <= 0) return false;
        move(out, c, cell, b, cp, "gravity");
        wakeAround(c);
        enqueue(cellKey(b.ax, b.ay, b.x, b.y, b.z));
        return true;
    }

    // Priority 2: equalization with one orthogonal neighbour through the strata
    // open in both cells, when its surface is more than a millistratum lower.
    // The visited cell only gives. It gives the most cp that
    // leaves the receiver's surface no higher than its own, keeps what lies below
    // the shared opening, and fits the receiver.
    function flowLateral(out, c, cell, mask, n, nMask) {
        const face = mask & nMask;
        if (!face) return false;
        const other = cellAt(n);
        if (!compatible(other, cell.cls)) return false;   // unlike fluids never share
        const cap = caps[cell.cls];
        const have = cell.cp, ocp = other ? other.cp : 0;
        const keep = popcount(mask & ((1 << lowestBit(face)) - 1)) * cap;
        if (have <= keep || (levelOf(have, mask, cap) - levelOf(ocp, nMask, cap)) * MILLISTRATA_PER_STRATUM <= cap) return false;
        let lo = 0, hi = Math.min(have - keep, capacityOf(nMask, cell.cls) - ocp);
        while (lo < hi) {
            const mid = lo + Math.ceil((hi - lo) / 2);
            if (levelOf(ocp + mid, nMask, cap) <= levelOf(have - mid, mask, cap)) lo = mid;
            else hi = mid - 1;
        }
        if (lo <= 0) return false;
        move(out, c, cell, n, lo, "equalize");
        wakeAround(c);
        enqueue(cellKey(n.ax, n.ay, n.x, n.y, n.z));
        return true;
    }

    /**
     * Run queued visits until the queue empties or the budget is spent. A visit
     * costs one unit, and each host probe one more; an unfinished visit keeps its
     * cursor and resumes on the next step. Returns { work, probes, records, queued }.
     */
    function step(budgetArg) {
        const budget = budgetArg === undefined ? defaultBudget : budgetArg;
        if (!isAmount(budget)) fail("E_BUDGET", "budget must be a nonnegative integer");
        const out = [];
        let work = 0, probes = 0;
        while (S.head < S.queue.length && work < budget) {
            const key = S.queue[S.head];
            const c = parseKey(key);
            const cur = S.cursor || (S.cursor = { phase: PHASE_VISIT, mask: 0, changed: false });
            while (cur.phase < PHASE_END && work < budget) {
                const cell = cellAt(c);
                if (cur.phase === PHASE_VISIT) {
                    work++;
                    if (!cell) { cur.phase = PHASE_END; break; }
                    cur.mask = probe(c); probes++;
                    cur.phase = PHASE_DOWN;
                    continue;
                }
                if (!cell) { cur.phase = PHASE_END; break; }
                if (cur.phase === PHASE_DOWN) {
                    cur.phase++;
                    if (!(cur.mask & BOTTOM_BIT) || c.z <= world.zMin) continue;
                    work++;
                    const bm = probe({ ax: c.ax, ay: c.ay, x: c.x, y: c.y, z: c.z - 1 }); probes++;
                    if ((bm & TOP_BIT) && flowDown(out, c, cell, bm)) cur.changed = true;
                    continue;
                }
                const d = LATERAL[cur.phase - PHASE_LATERAL];
                cur.phase++;
                const n = neighbour(c, d[0], d[1]);
                work++;
                const nm = probe(n); probes++;
                if (flowLateral(out, c, cell, cur.mask, n, nm)) cur.changed = true;
            }
            if (cur.phase < PHASE_END) break;    // budget spent mid-visit
            S.head++;
            S.inQueue.delete(key);
            S.cursor = null;
            if (cur.changed && cellAt(c)) enqueue(key);
        }
        if (S.head > 0 && S.head >= S.queue.length) { S.queue = []; S.head = 0; }
        else if (S.head >= 4096) { S.queue = S.queue.slice(S.head); S.head = 0; }
        return { work, probes, records: out, queued: S.queue.length - S.head };
    }

    // --- Sources and the only credit from outside --------------------------
    /**
     * Register finite geological inventories once (D1's manifest). Each entry
     * { id, cls, cp } opens a source account holding cp. All or nothing; an id
     * already registered is refused, so re-materializing a chunk cannot credit
     * its source twice. Returns the registration records.
     */
    function registerSources(manifest) {
        const list = Array.isArray(manifest) ? manifest : (manifest && manifest.sources);
        if (!Array.isArray(list)) fail("E_MANIFEST", "expected an array of { id, cls, cp } or { sources: [...] }");
        const seen = new Set();
        for (const s of list) {
            if (!s || typeof s.id !== "string" || !s.id.length) fail("E_MANIFEST", "a source needs a string id");
            if (seen.has(s.id) || S.sources.has(s.id)) fail("E_SOURCE_DUP", "source " + s.id + " is already registered");
            if (!caps[s.cls]) fail("E_CLASS", "source " + s.id + ": no density for class " + String(s.cls));
            requireAmount(s.cp, "source " + s.id + " cp");
            seen.add(s.id);
        }
        const out = [];
        for (const s of list) {
            S.sources.set(s.id, { cls: s.cls, cp: s.cp, registered: s.cp });
            S.src[s.cls] = units.addCp(S.src[s.cls], s.cp);
            record(out, { row: 0, cls: s.cls, cp: s.cp, cause: "register", from: "geology", to: "src:" + s.id });
        }
        return out;
    }

    /**
     * Move up to cp from a registered source into one cell. Bounded by the
     * source's remainder and the cell's room; refused (null) when the cell holds
     * another fluid. Returns the transfer record, or null when nothing moved.
     */
    function release(sourceId, ref, cp, cause) {
        const src = S.sources.get(sourceId);
        if (!src) fail("E_NO_SOURCE", "no registered source " + String(sourceId) + "; fluid is never placed without a debited source");
        requireAmount(cp, "release cp");
        const c = requireRef(ref, "release");
        const cell = cellAt(c);
        if (!compatible(cell, src.cls)) return null;
        const room = capacityOf(probe(c), src.cls) - (cell ? cell.cp : 0);
        const amount = Math.min(cp, src.cp, room);
        if (amount <= 0) return null;
        src.cp = units.subCp(src.cp, amount);
        S.src[src.cls] = units.subCp(S.src[src.cls], amount);
        credit(c, src.cls, amount);
        S.open[src.cls] = units.addCp(S.open[src.cls], amount);
        enqueue(cellKey(c.ax, c.ay, c.x, c.y, c.z));
        const out = [];
        return record(out, { row: 0, cls: src.cls, cp: amount, cause: cause || "release", from: "src:" + sourceId, to: cellKey(c.ax, c.ay, c.x, c.y, c.z) });
    }

    // The host reports changed geometry at a cell: its fluid and its neighbours'
    // may move again. An unfinished visit of one of them restarts from its own probe.
    function wake(ref) {
        const c = requireRef(ref, "wake");
        wakeAround(c);
        if (S.cursor && touches(parseKey(S.queue[S.head]), c)) S.cursor = null;
    }
    // h is c or one of its six neighbours.
    function touches(h, c) {
        if (h.ax === c.ax && h.ay === c.ay && h.x === c.x && h.y === c.y) return Math.abs(h.z - c.z) <= 1;
        if (h.z !== c.z) return false;
        for (const d of LATERAL) {
            const n = neighbour(c, d[0], d[1]);
            if (n.ax === h.ax && n.ay === h.ay && n.x === h.x && n.y === h.y) return true;
        }
        return false;
    }

    // --- Views (derived, never stored) --------------------------------------
    function fluidAt(ref) {
        const c = requireRef(ref, "fluidAt");
        const cell = cellAt(c);
        if (!cell) return null;
        const cap = caps[cell.cls], mask = probe(c);
        return {
            cls: cell.cls,
            cp: cell.cp,
            typeView: cell.cls,
            depthView: depthViewOf(cell.cp, cap),
            thicknessFt: cell.cp * units.STRATUM_FT / cap,
            surfaceFt: levelOf(cell.cp, mask, cap) * units.STRATUM_FT / cap
        };
    }
    function depthView(ref) {
        const cell = cellAt(requireRef(ref, "depthView"));
        return cell ? depthViewOf(cell.cp, caps[cell.cls]) : 0;
    }
    function typeView(ref) {
        const cell = cellAt(requireRef(ref, "typeView"));
        return cell ? cell.cls : null;
    }
    function capacityAt(ref, cls) {
        const c = requireRef(ref, "capacityAt");
        if (!caps[cls]) fail("E_CLASS", "no density for class " + String(cls));
        return capacityOf(probe(c), cls);
    }

    function totals() {
        const t = {};
        for (const cls of classes) t[cls] = { open: S.open[cls], sources: S.src[cls] };
        return t;
    }
    function sourceRemaining(id) {
        const s = S.sources.get(id);
        return s ? s.cp : null;
    }

    // --- Persistence --------------------------------------------------------
    function cellsSorted() {
        const rows = [];
        for (const [ak, a] of S.areas) {
            const [ax, ay] = ak.split(",").map(Number);
            for (const [z, level] of a) {
                for (const [idx, cell] of level) rows.push([ax, ay, idx % world.size, Math.floor(idx / world.size), z, cell.cls, cell.cp]);
            }
        }
        rows.sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[4] - q[4] || p[3] - q[3] || p[2] - q[2]);
        return rows;
    }

    // Everything that affects later steps: cells, sources, queue order, the
    // unfinished visit and the record row. Plain JSON-safe data.
    function serialize() {
        const t = {};
        for (const cls of classes) t[cls] = [S.open[cls], S.src[cls]];
        return {
            v: SAVE_VERSION,
            world: { size: world.size, areasX: world.areasX, areasY: world.areasY, zMin: world.zMin, zMax: world.zMax },
            densities: Object.assign({}, densities),
            row: S.row,
            sources: Array.from(S.sources, ([id, s]) => [id, s.cls, s.cp, s.registered]),
            cells: cellsSorted(),
            queue: S.queue.slice(S.head),
            cursor: S.cursor ? [S.cursor.phase, S.cursor.mask, S.cursor.changed ? 1 : 0] : null,
            totals: t
        };
    }

    // Replaces the state with a saved one, or throws and changes nothing.
    function deserialize(data) {
        const d = data || {};
        if (d.v !== SAVE_VERSION) fail("E_SAVE", "unsupported open-fluid save version " + String(d.v));
        for (const k of Object.keys(world)) if (!d.world || d.world[k] !== world[k]) fail("E_WORLD", "save world." + k + " " + String(d.world && d.world[k]) + " differs from the host's " + world[k]);
        const dk = Object.keys(d.densities || {}).sort();
        if (dk.join() !== classes.join() || dk.some(k => d.densities[k] !== densities[k])) fail("E_CALIBRATION", "save densities " + JSON.stringify(d.densities) + " differ from " + JSON.stringify(densities));
        const N = emptyState();
        if (!isAmount(d.row)) fail("E_SAVE", "row");
        N.row = d.row;
        const sum = {};
        for (const cls of classes) sum[cls] = [0, 0];
        for (const s of d.sources || []) {
            const [id, cls, cp, registered] = s;
            if (typeof id !== "string" || !caps[cls] || !isAmount(cp) || !isAmount(registered) || cp > registered || N.sources.has(id)) fail("E_SAVE", "bad source " + JSON.stringify(s));
            N.sources.set(id, { cls, cp, registered });
            sum[cls][1] += cp;
        }
        const saveS = S;
        S = N;
        try {
            for (const row of d.cells || []) {
                const [ax, ay, x, y, z, cls, cp] = row;
                const c = requireRef({ ax, ay, x, y, z }, "saved cell");
                if (!caps[cls] || !isAmount(cp) || cp === 0 || cellAt(c)) fail("E_SAVE", "bad cell " + JSON.stringify(row));
                credit(c, cls, cp);
                sum[cls][0] += cp;
            }
            for (const cls of classes) {
                const t = d.totals && d.totals[cls];
                if (!t || t[0] !== sum[cls][0] || t[1] !== sum[cls][1]) fail("E_SAVE_TOTALS", cls + " totals " + JSON.stringify(t) + " differ from the saved accounts " + JSON.stringify(sum[cls]));
                N.open[cls] = sum[cls][0];
                N.src[cls] = sum[cls][1];
            }
            for (const key of d.queue || []) {
                if (typeof key !== "string" || N.inQueue.has(key)) fail("E_SAVE", "bad queue entry " + String(key));
                const q = requireRef(parseKey(key), "saved queue entry");
                if (cellKey(q.ax, q.ay, q.x, q.y, q.z) !== key) fail("E_SAVE", "queue entry " + key + " is not canonical");
                enqueue(key);
            }
            if (d.cursor) {
                const [phase, mask, changed] = d.cursor;
                if (!N.queue.length || !Number.isInteger(phase) || phase < PHASE_VISIT || phase >= PHASE_END || !Number.isInteger(mask) || mask < 0 || mask > FULL_MASK) fail("E_SAVE", "bad cursor");
                N.cursor = { phase, mask, changed: changed === 1 };
            }
        } catch (e) {
            S = saveS;
            throw e;
        }
    }

    return {
        classes: classes.slice(),
        capPerStratum: cls => caps[cls],
        registerSources, release, step, wake,
        fluidAt, depthView, typeView, capacityAt,
        totals, sourceRemaining,
        queued: () => S.queue.length - S.head,
        serialize, deserialize
    };
}

module.exports = {
    createOpenFluid,
    levelOf,
    depthViewOf,
    DEPTH_VIEW_MAX,
    DEFAULT_BUDGET,
    SAVE_VERSION
};
