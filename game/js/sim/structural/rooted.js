"use strict";

/**
 * game/js/sim/structural/rooted.js
 *
 * Rooted support topology for Project DEUS (NAT.02.01 part 1, lane-en).
 * Design: SIM.40.01 §4.1-4.2, §4.6, §5.3 as merged by DESIGN-D3 §3.2.
 *
 * Pure: geometry comes only through a StrataReader (reader.js). Nothing is written, no fluid is
 * read and no load is computed (load is lane-eo).
 *
 * Member: a maximal vertical run of load-bearing voxels in one column whose faces are in full
 * contact (actual occupied geometry, partial deposits included). Members cross layer boundaries.
 *
 * Support rule (merged D3): a member is supported only through a certified path to a real
 * foundation:
 *   - foundation: its bottom face bears on a certified foundation (dist 0);
 *   - vertical:   its bottom rests, through a loose stack in full contact, on a supported member;
 *                 the distance is carried unchanged (vertical edges cost 0);
 *   - lateral:    a cardinal neighbour member overlapping its occupied extent is supported at
 *                 dist d and d + 1 <= spanEff of this member. Distance is carried to the anchor.
 * dist is the least such value; paths are deterministic and cycle-free, so a floating ring of
 * members never supports itself. Stored solid/supported flags are never read. Unknown terrain is
 * pending: never air, never support. Every member, bearing and lateral-path visit charges the one
 * structural counter (Bs, merged D3 §3.2); a job stops when the counter refuses and resumes later.
 */

const { STRATA_PER_LAYER, gOf, zOfG, sOfG } = require("./reader.js");

const S_MAX = 12; // SIM.40.01 §4.3: every span is capped, so every search is bounded
const MAX_MEMBER_STRATA = 160; // 32 layers × 5 strata (-16..+15); a taller column is a reader fault
const SPAN_THICKNESS = Object.freeze([1, 2, 3, 5, 10, 20, 40]); // spanBase columns (strata)
const DIRS = Object.freeze([
    Object.freeze({ dir: "N", dx: 0, dy: -1 }),
    Object.freeze({ dir: "E", dx: 1, dy: 0 }),
    Object.freeze({ dir: "S", dx: 0, dy: 1 }),
    Object.freeze({ dir: "W", dx: -1, dy: 0 })
]);
const OPPOSITE = Object.freeze({ N: "S", E: "W", S: "N", W: "E" });
const OP_KINDS = Object.freeze(["member", "bearing", "lateral"]);
const CLASSES = new Set(["natural", "assembly", "loose", "fluid"]);
const BUDGET = "budget";

const PENDING_V = Object.freeze({ kind: "pending" });
const AIR_V = Object.freeze({ kind: "air" });

// ---------------------------------------------------------------------------
// Span and HP band (SIM.40.01 §4.3-4.4)
// ---------------------------------------------------------------------------

/** HP band 1..8 of a voxel with 1..255 HP. */
function bandOf(hp) {
    if (!Number.isInteger(hp) || hp < 1 || hp > 255) {
        throw new RangeError(`structural/rooted: hp must be an integer 1..255 (got ${String(hp)})`);
    }
    return (hp + 31) >> 5;
}

/** spanBase for a member of t whole strata of one material; below one stratum spans nothing. */
function spanBaseFor(material, t) {
    let col = -1;
    for (let i = 0; i < SPAN_THICKNESS.length; i++) if (t >= SPAN_THICKNESS[i]) col = i;
    return col < 0 ? 0 : material.spanBase[col];
}

/** Effective span: floor(spanBase × band / 8). */
function spanEffOf(spanBase, band) {
    return Math.floor(spanBase * band / 8);
}

// ---------------------------------------------------------------------------
// The structural counter (Bs)
// ---------------------------------------------------------------------------

/**
 * One counter per simulation tick, shared by all structural work (merged D3: Bs = 512 initially,
 * a versioned tuning value owned by the calibration file, not by this module).
 */
function createOpsCounter(limit) {
    if (!(limit === Infinity || (Number.isInteger(limit) && limit >= 0))) {
        throw new RangeError(`structural/rooted: counter limit must be a non-negative integer or Infinity (got ${String(limit)})`);
    }
    const byKind = { member: 0, bearing: 0, lateral: 0 };
    let used = 0;
    return {
        get limit() { return limit; },
        get used() { return used; },
        get remaining() { return limit - used; },
        byKind,
        charge(kind) {
            if (!Object.prototype.hasOwnProperty.call(byKind, kind)) {
                throw new Error(`structural/rooted: unknown op kind "${kind}"`);
            }
            if (used >= limit) return false;
            used += 1;
            byKind[kind] += 1;
            return true;
        }
    };
}

function* charge(ctx, kind) {
    while (!ctx.counter.charge(kind)) yield BUDGET;
    ctx.ops[kind] += 1;
    ctx.ops.total += 1;
}

// ---------------------------------------------------------------------------
// Reads (every read is charged before the reader is called)
// ---------------------------------------------------------------------------

function notePending(ctx, x, y, g, what) {
    ctx.pendingSeen = true;
    if (ctx.pendingAt.length < 8) ctx.pendingAt.push({ x, y, z: zOfG(g), s: sOfG(g), what });
}

function materialOf(ctx, key) {
    const cached = ctx.materials.get(key);
    if (cached) return cached;
    const raw = ctx.reader.material(key);
    if (!raw || typeof raw !== "object") throw new Error(`structural/rooted: no material record for "${key}"`);
    if (!CLASSES.has(raw.class)) throw new Error(`structural/rooted: material "${key}" has no valid class (got ${String(raw.class)})`);
    let spanBase = null;
    if (raw.class === "natural" || raw.class === "assembly") {
        if (!Array.isArray(raw.spanBase) || raw.spanBase.length !== SPAN_THICKNESS.length) {
            throw new Error(`structural/rooted: material "${key}" has no spanBase[${SPAN_THICKNESS.length}]`);
        }
        for (const v of raw.spanBase) {
            if (!Number.isInteger(v) || v < 0 || v > S_MAX) {
                throw new Error(`structural/rooted: material "${key}" spanBase entry ${String(v)} is not an integer 0..${S_MAX}`);
            }
        }
        spanBase = Object.freeze(raw.spanBase.slice());
    }
    if (raw.ratedLoadKg !== undefined && raw.ratedLoadKg !== null && !(Number.isInteger(raw.ratedLoadKg) && raw.ratedLoadKg >= 0)) {
        throw new Error(`structural/rooted: material "${key}" ratedLoadKg is not a non-negative integer`);
    }
    const m = Object.freeze({
        key: String(key),
        cls: raw.class,
        spanBase,
        ratedLoadKg: Number.isInteger(raw.ratedLoadKg) ? raw.ratedLoadKg : 0
    });
    ctx.materials.set(key, m);
    return m;
}

function normaliseVoxel(ctx, raw, x, y, g) {
    const where = `(${x},${y},${zOfG(g)},${sOfG(g)})`;
    if (raw === null || typeof raw !== "object") throw new Error(`structural/rooted: reader.voxel${where} returned no record`);
    if (raw.pending === true) { notePending(ctx, x, y, g, "voxel"); return PENDING_V; }
    if (raw.material === null || raw.material === undefined) return AIR_V;
    const mat = materialOf(ctx, raw.material);
    if (mat.cls === "fluid") return AIR_V;
    const lo = raw.lo, hi = raw.hi;
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 0 || hi > ctx.H || lo >= hi) {
        throw new Error(`structural/rooted: voxel${where} has no valid occupied span lo/hi (got ${String(raw.lo)}/${String(raw.hi)})`);
    }
    if (mat.cls === "loose") return { kind: "loose", mat, lo, hi };
    if (!Number.isInteger(raw.hp) || raw.hp < 0 || raw.hp > 255) {
        throw new Error(`structural/rooted: voxel${where} has no valid hp (got ${String(raw.hp)})`);
    }
    if (raw.hp === 0) return AIR_V; // a destroyed voxel is no longer part of a member (SIM.40.01 §4.4)
    return { kind: "solid", mat, lo, hi, hp: raw.hp, band: bandOf(raw.hp) };
}

function* readVoxel(ctx, kind, x, y, g) {
    yield* charge(ctx, kind);
    return normaliseVoxel(ctx, ctx.reader.voxel(x, y, zOfG(g), sOfG(g)), x, y, g);
}

function* readFoundation(ctx, kind, x, y, g) {
    yield* charge(ctx, kind);
    const r = ctx.reader.foundation(x, y, zOfG(g), sOfG(g));
    if (r === true || r === false) return r;
    if (r && r.pending === true) { notePending(ctx, x, y, g, "foundation"); return "pending"; }
    throw new Error(`structural/rooted: reader.foundation(${x},${y},${zOfG(g)},${sOfG(g)}) returned ${String(r)}; expected true, false or pending`);
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

function tooTall(n, x, y) {
    if (n > MAX_MEMBER_STRATA) throw new Error(`structural/rooted: column (${x},${y}) is taller than ${MAX_MEMBER_STRATA} strata; the reader is unbounded`);
}

function vkey(x, y, g) {
    return `${x},${y},${g}`;
}

function summarise(ctx, node) {
    const per = new Map();
    for (const e of node.voxels) {
        let acc = per.get(e.v.mat.key);
        if (!acc) { acc = { mat: e.v.mat, sub: 0, band: 8 }; per.set(e.v.mat.key, acc); }
        acc.sub += e.v.hi - e.v.lo;
        if (e.v.band < acc.band) acc.band = e.v.band;
    }
    let gov = null;
    for (const acc of per.values()) {
        acc.t = Math.floor(acc.sub / ctx.H);
        acc.spanBase = spanBaseFor(acc.mat, acc.t);
        if (gov === null ||
            acc.spanBase > gov.spanBase ||
            (acc.spanBase === gov.spanBase && acc.mat.ratedLoadKg > gov.mat.ratedLoadKg) ||
            (acc.spanBase === gov.spanBase && acc.mat.ratedLoadKg === gov.mat.ratedLoadKg && acc.mat.key < gov.mat.key)) {
            gov = acc;
        }
    }
    node.governing = gov.mat.key;
    node.thickness = gov.t;
    node.spanBase = gov.spanBase;
    node.band = gov.band;
    node.spanEff = spanEffOf(gov.spanBase, gov.band);
}

/** The member holding solid voxel v at (x, y, g). Walks the column down and up through full contact. */
function* discover(ctx, x, y, g, v) {
    const known = ctx.owner.get(vkey(x, y, g));
    if (known) return known;
    const H = ctx.H;
    const voxels = [{ g, v }];
    let pending = false;

    let lo = g, cur = v;
    while (cur.lo === 0) {
        const f = yield* readFoundation(ctx, "member", x, y, lo);
        if (f === true) break;
        if (f === "pending") { pending = true; break; }
        const below = yield* readVoxel(ctx, "member", x, y, lo - 1);
        if (below.kind === "pending") { pending = true; break; }
        if (below.kind !== "solid" || below.hi !== H) break;
        lo -= 1; cur = below; voxels.unshift({ g: lo, v: below });
        tooTall(voxels.length, x, y);
    }
    let hi = g;
    cur = v;
    while (cur.hi === H) {
        const above = yield* readVoxel(ctx, "member", x, y, hi + 1);
        if (above.kind === "pending") { pending = true; break; }
        if (above.kind !== "solid" || above.lo !== 0) break;
        hi += 1; cur = above; voxels.push({ g: hi, v: above });
        tooTall(voxels.length, x, y);
    }

    const first = voxels[0], last = voxels[voxels.length - 1];
    const node = {
        key: vkey(x, y, first.g),
        x, y, g0: first.g, g1: last.g,
        bot: first.g * H + first.v.lo,
        top: last.g * H + last.v.hi,
        lo0: first.v.lo,
        voxels, pending,
        below: null, restedBy: [], lat: [], latKeys: new Set(),
        allow: -1, latProbed: false, dist: Infinity, pred: null, done: false,
        governing: null, thickness: 0, spanBase: 0, band: 0, spanEff: 0
    };
    for (const e of voxels) ctx.owner.set(vkey(x, y, e.g), node);
    if (!pending) summarise(ctx, node);
    ctx.nodes.push(node);
    return node;
}

function link(X, N, dir) {
    const k = `${dir}|${N.key}`;
    if (X.latKeys.has(k)) return;
    X.latKeys.add(k);
    X.lat.push({ dir, node: N });
    N.latKeys.add(`${OPPOSITE[dir]}|${X.key}`);
    N.lat.push({ dir: OPPOSITE[dir], node: X });
}

/** Bearing probe: foundation under the member, or a loose stack in full contact onto a member. */
function* probeBelow(ctx, X) {
    const H = ctx.H;
    if (X.lo0 !== 0) { X.below = { state: "none" }; return; }
    let g = X.g0;
    for (;;) {
        const f = yield* readFoundation(ctx, "bearing", X.x, X.y, g);
        if (f === "pending") { X.below = { state: "pending" }; return; }
        if (f === true) { X.below = { state: "foundation", loose: X.g0 - g }; return; }
        const v = yield* readVoxel(ctx, "bearing", X.x, X.y, g - 1);
        if (v.kind === "pending") { X.below = { state: "pending" }; return; }
        if (v.kind === "air" || v.hi !== H) { X.below = { state: "none" }; return; }
        if (v.kind === "solid") {
            const B = yield* discover(ctx, X.x, X.y, g - 1, v);
            X.below = { state: "rests", on: B, loose: X.g0 - g };
            B.restedBy.push(X);
            return;
        }
        if (v.lo !== 0) { X.below = { state: "none" }; return; } // loose voxel not resting on its own bottom face
        tooTall(X.g0 - g + 1, X.x, X.y);
        g -= 1;
    }
}

/** Lateral probe: members in the four cardinal columns whose occupied extent overlaps X's. */
function* probeLateral(ctx, X) {
    for (const d of DIRS) {
        let nx = X.x + d.dx, ny = X.y + d.dy;
        if (ctx.canon) {
            const c = ctx.canon(nx, ny);
            if (!c || !Number.isInteger(c.x) || !Number.isInteger(c.y)) throw new Error(`structural/rooted: reader.canon(${nx},${ny}) returned no integer {x, y}`);
            nx = c.x; ny = c.y;
        }
        let g = X.g0;
        while (g <= X.g1) {
            const v = yield* readVoxel(ctx, "lateral", nx, ny, g);
            if (v.kind === "solid") {
                const a = g * ctx.H + v.lo, b = g * ctx.H + v.hi;
                if (Math.min(b, X.top) > Math.max(a, X.bot)) {
                    const N = yield* discover(ctx, nx, ny, g, v);
                    link(X, N, d.dir);
                    g = Math.max(g, N.g1) + 1;
                    continue;
                }
            }
            g += 1;
        }
    }
}

// ---------------------------------------------------------------------------
// The search
// ---------------------------------------------------------------------------

/**
 * Phase A: collect every member that can lie on a valid path from M. A lateral departure from X
 * leaves min(allowance, spanEff(X)) - 1 lateral hops for the rest of the path, so the region is
 * bounded by the spans (at most S_MAX hops) and holds every valid path exactly.
 */
function* explore(ctx, M) {
    M.allow = Infinity;
    const queue = [M];
    let head = 0;
    while (head < queue.length) {
        const X = queue[head++];
        yield* charge(ctx, "member");
        if (X.pending) continue;
        if (X.below === null) yield* probeBelow(ctx, X);
        if (X.below.state === "rests") {
            const B = X.below.on;
            if (B.allow < X.allow) { B.allow = X.allow; queue.push(B); }
        }
        const out = Math.min(X.allow, X.spanEff) - 1;
        if (out < 0) continue;
        if (!X.latProbed) { X.latProbed = true; yield* probeLateral(ctx, X); }
        for (const e of X.lat) {
            const N = e.node;
            if (N.allow < out) { N.allow = out; queue.push(N); }
        }
    }
}

/** Phase B: least distances from the certified foundations, over the collected region. */
function* settle(ctx) {
    const buckets = [];
    const push = (n, d) => { (buckets[d] || (buckets[d] = [])).push(n); };
    for (const n of ctx.nodes) {
        if (!n.pending && n.below !== null && n.below.state === "foundation") { n.dist = 0; push(n, 0); }
    }
    for (let d = 0; d < buckets.length; d++) {
        const bucket = buckets[d];
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
            const N = bucket[i];
            if (N.done || N.dist !== d) continue;
            N.done = true;
            for (const X of N.restedBy) {
                yield* charge(ctx, "bearing");
                if (!X.pending && d < X.dist) { X.dist = d; X.pred = { node: N, via: "D" }; bucket.push(X); }
            }
            for (const e of N.lat) {
                yield* charge(ctx, "lateral");
                const X = e.node;
                if (X.pending) continue;
                const cand = d + 1;
                if (cand <= X.spanEff && cand < X.dist) { X.dist = cand; X.pred = { node: N, via: OPPOSITE[e.dir] }; push(X, cand); }
            }
        }
    }
}

/**
 * The witness path from M to its foundation. Each member keeps the predecessor that first gave it
 * its final distance. A predecessor was always finalised earlier, so the path is acyclic, and the
 * choice is deterministic (processing order: foundations in discovery order, vertical before
 * lateral, neighbours in discovery order N, E, S, W).
 */
function* trace(ctx, M) {
    const path = [];
    let X = M, anchor = null;
    for (;;) {
        if (anchor === null && X.dist === 0) anchor = X;
        if (X.pred === null) {
            path.push({ key: X.key, via: "F" });
            return { path, anchor, foundation: X };
        }
        yield* charge(ctx, X.pred.via === "D" ? "bearing" : "lateral");
        path.push({ key: X.key, via: X.pred.via });
        X = X.pred.node;
    }
}

function memberView(n) {
    return Object.freeze({
        key: n.key, x: n.x, y: n.y, g0: n.g0, g1: n.g1,
        z0: zOfG(n.g0), s0: sOfG(n.g0), z1: zOfG(n.g1), s1: sOfG(n.g1),
        bottom: n.bot, top: n.top
    });
}

function makeResult(ctx, M, verdict, extra) {
    const span = M && !M.pending ? Object.freeze({
        governing: M.governing, thickness: M.thickness, spanBase: M.spanBase, band: M.band, spanEff: M.spanEff
    }) : null;
    return Object.freeze(Object.assign({
        verdict,
        reason: null,
        mode: null,
        dist: null,
        rootDir: null,
        anchor: null,
        foundation: null,
        path: null,
        member: M ? memberView(M) : null,
        span,
        pendingAt: Object.freeze(ctx.pendingAt.slice()),
        ops: Object.freeze(Object.assign({}, ctx.ops))
    }, extra || {}));
}

function* run(ctx, at) {
    const g = gOf(at.z, at.s);
    const v = yield* readVoxel(ctx, "member", at.x, at.y, g);
    if (v.kind === "pending") return makeResult(ctx, null, "pending", { reason: "pending_terrain" });
    if (v.kind !== "solid") {
        throw new Error(`structural/rooted: (${at.x},${at.y},${at.z},${at.s}) holds no load-bearing solid (${v.kind})`);
    }
    const M = yield* discover(ctx, at.x, at.y, g, v);
    if (M.pending) return makeResult(ctx, M, "pending", { reason: "pending_terrain" });

    yield* explore(ctx, M);
    yield* settle(ctx);

    if (M.dist !== Infinity) {
        const w = yield* trace(ctx, M);
        const first = w.path[0].via;
        return makeResult(ctx, M, "supported", {
            mode: first === "F" ? "foundation" : first === "D" ? "vertical" : "lateral",
            dist: M.dist,
            rootDir: first,
            anchor: w.anchor.key,
            foundation: w.foundation.key,
            path: Object.freeze(w.path.map(p => Object.freeze(p)))
        });
    }
    if (ctx.pendingSeen) return makeResult(ctx, M, "pending", { reason: "pending_terrain" });
    return makeResult(ctx, M, "unsupported", { reason: "no_root" });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function validateReader(reader) {
    if (!reader || typeof reader !== "object") throw new TypeError("structural/rooted: a StrataReader is required");
    for (const fn of ["voxel", "foundation", "material"]) {
        if (typeof reader[fn] !== "function") throw new TypeError(`structural/rooted: reader.${fn} must be a function`);
    }
    if (!Number.isInteger(reader.subunits) || reader.subunits < 1) {
        throw new TypeError(`structural/rooted: reader.subunits must be a positive integer (got ${String(reader.subunits)})`);
    }
}

function validateAt(at) {
    if (!at || typeof at !== "object") throw new TypeError("structural/rooted: a voxel address {x, y, z, s} is required");
    for (const k of ["x", "y", "z", "s"]) {
        if (!Number.isInteger(at[k])) throw new TypeError(`structural/rooted: address ${k} must be an integer (got ${String(at[k])})`);
    }
    if (at.s < 0 || at.s >= STRATA_PER_LAYER) throw new RangeError(`structural/rooted: stratum s must be 0..${STRATA_PER_LAYER - 1} (got ${at.s})`);
}

/**
 * A resumable evaluation of the member holding solid voxel `at` = {x, y, z, s}.
 * job.step(counter) runs until it finishes or the counter refuses a charge; it returns job.done.
 * The job keeps its cursor between steps. Its result is valid for the geometry it read: a caller
 * that lets the world change between steps must discard the job (revision checks are S-CORE work).
 */
function createRootedJob(reader, at) {
    validateReader(reader);
    validateAt(at);
    const ctx = {
        reader,
        H: reader.subunits,
        canon: typeof reader.canon === "function" ? reader.canon.bind(reader) : null,
        counter: null,
        materials: new Map(),
        owner: new Map(),
        nodes: [],
        pendingSeen: false,
        pendingAt: [],
        ops: { member: 0, bearing: 0, lateral: 0, total: 0 }
    };
    const at0 = Object.freeze({ x: at.x, y: at.y, z: at.z, s: at.s });
    const gen = run(ctx, at0);
    let result = null, error = null, done = false;
    return {
        at: at0,
        get done() { return done; },
        get result() { return result; },
        get ops() { return Object.assign({}, ctx.ops); },
        step(counter) {
            if (error) throw error;
            if (done) return true;
            if (!counter || typeof counter.charge !== "function") throw new TypeError("structural/rooted: step needs an ops counter");
            ctx.counter = counter;
            try {
                const r = gen.next();
                if (r.done) { done = true; result = r.value; }
            } catch (e) {
                error = e;
                throw e;
            } finally {
                ctx.counter = null;
            }
            return done;
        }
    };
}

/**
 * Evaluate one member. With no counter the evaluation is unbounded; with a counter that runs out
 * the verdict is pending with reason "budget" and the unfinished job is returned for later ticks.
 */
function evaluateMember(reader, at, opts) {
    const counter = (opts && opts.counter) || createOpsCounter(Infinity);
    const job = createRootedJob(reader, at);
    if (job.step(counter)) return job.result;
    return Object.freeze({ verdict: "pending", reason: "budget", job, ops: job.ops });
}

module.exports = {
    S_MAX,
    SPAN_THICKNESS,
    DIRS,
    OP_KINDS,
    bandOf,
    spanBaseFor,
    spanEffOf,
    createOpsCounter,
    createRootedJob,
    evaluateMember
};
