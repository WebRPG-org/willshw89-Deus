#!/usr/bin/env node
"use strict";

/**
 * tools/test_structural_rooted.js
 *
 * Gate suite for rooted support topology (NAT.02.01 part 1, lane-en).
 *
 *   node tools/test_structural_rooted.js                 presence, baseline checks, legacy controls, mutants
 *   node tools/test_structural_rooted.js --baseline      baseline checks only
 *   node tools/test_structural_rooted.js --legacy        the three rooted-bearing checks against the legacy
 *                                                        predicate (support.js evalCellSupport); exit 1 = rejected
 *   node tools/test_structural_rooted.js --mutant=NAME   every check against one source mutant of rooted.js;
 *                                                        exit 1 when any check fails
 *
 * Mutants are text edits of rooted.js compiled in memory; production code carries no mutant hooks.
 * Every edit must match exactly once, so a stale mutant fails the harness instead of passing silently.
 * The legacy predicate runs unchanged through an adapter that only maps fixture voxels to its inputs.
 */

const fs = require("fs");
const path = require("path");
const Module = require("module");

const ROOT = path.join(__dirname, "..");
const STRUCT = path.join(ROOT, "game", "js", "sim", "structural");
const ROOTED_PATH = path.join(STRUCT, "rooted.js");
const READER_PATH = path.join(STRUCT, "reader.js");
const INDEX_PATH = path.join(STRUCT, "index.js");
const SUPPORT_PATH = path.join(STRUCT, "support.js");

// ---------------------------------------------------------------------------
// rooted_modules_present (absence check: fails at the lane base)
// ---------------------------------------------------------------------------

function checkModulesPresent() {
    const fails = [];
    for (const p of [ROOTED_PATH, READER_PATH]) {
        if (!fs.existsSync(p)) fails.push(`missing ${path.relative(ROOT, p).replace(/\\/g, "/")}`);
    }
    if (fails.length) return fails;
    try {
        const idx = require(INDEX_PATH);
        for (const fn of ["evaluateMember", "createRootedJob", "createOpsCounter", "createFixtureReader", "bandOf", "spanBaseFor", "evalCellSupport", "executeCollapse"]) {
            if (typeof idx[fn] !== "function") fails.push(`index.js does not export ${fn}()`);
        }
    } catch (e) {
        fails.push(`index.js does not load: ${e.message}`);
    }
    return fails;
}

const args = process.argv.slice(2);
const MODE = args.includes("--baseline") ? "baseline"
    : args.includes("--legacy") ? "legacy"
    : (args.find(a => a.startsWith("--mutant=")) ? "mutant" : "full");
const MUTANT_ARG = (args.find(a => a.startsWith("--mutant=")) || "").slice("--mutant=".length);

const presence = checkModulesPresent();
if (presence.length) {
    console.error(`FAIL: rooted_modules_present - ${presence.join("; ")}`);
    console.error("\nRESULT: FAIL (rooted support modules are absent; no other check can run)");
    process.exit(1);
}
console.log("PASS: rooted_modules_present - rooted.js and reader.js exist; index.js exports the rooted API");

const R = require(READER_PATH);
const { gOf, zOfG, sOfG } = R;
const G = (z, s) => gOf(z, s);
const F0 = G(-2, 0); // bottom stratum of the fixture world (zMin = -2)
const B0 = G(0, 0);

function world(opts) {
    return R.createFixtureReader(Object.assign({ bounds: { x0: 0, y0: 0, x1: 19, y1: 19 }, foundation: "floor" }, opts || {}));
}

function at(x, y, g) {
    return { x, y, z: zOfG(g), s: sOfG(g) };
}

// ---------------------------------------------------------------------------
// Module loading: real, mutant (source edits) and legacy (adapter)
// ---------------------------------------------------------------------------

function loadFromSource(src, filename) {
    const m = new Module(filename, module);
    m.filename = filename;
    m.paths = Module._nodeModulePaths(path.dirname(filename));
    m._compile(src, filename);
    return m.exports;
}

function rootedApi(name, mod) {
    return {
        name,
        rooted: mod,
        evaluate: (reader, a, opts) => mod.evaluateMember(reader, a, opts)
    };
}

/** The legacy predicate, unchanged, fed from the fixture's stored flags (the legacy world state). */
function legacyApi() {
    const { evalCellSupport } = require(SUPPORT_PATH);
    const solidRec = r => r && r.pending !== true && r.material !== null && r.material !== undefined;
    return {
        name: "legacy",
        rooted: null,
        evaluate(reader, a) {
            const raw = reader.voxel(a.x, a.y, a.z, a.s);
            const mat = reader.material(raw.material);
            const cellData = { position: { x: a.x, y: a.y }, groundAnchor: reader.foundation(a.x, a.y, a.z, a.s) === true };
            const g = gOf(a.z, a.s);
            const rb = reader.voxel(a.x, a.y, zOfG(g - 1), sOfG(g - 1));
            const neighborBelow = solidRec(rb) ? { solid: true, supported: rb.supported === true } : null;
            let neighborHoriz = null;
            for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                const rh = reader.voxel(a.x + dx, a.y + dy, a.z, a.s);
                if (solidRec(rh)) {
                    neighborHoriz = { solid: true, supported: rh.supported === true, position: { x: a.x + dx, y: a.y + dy } };
                    break;
                }
            }
            const res = evalCellSupport(cellData, mat.legacy || mat, neighborBelow, neighborHoriz);
            return { verdict: res.supported ? "supported" : "unsupported", mode: res.mode, legacy: true };
        }
    };
}

const MUTANTS = [
    {
        name: "unknown_as_air", note: "unavailable terrain is read as air",
        kills: ["rooted_unknown_is_pending"],
        edits: [
            ['if (raw.pending === true) { notePending(ctx, x, y, g, "voxel"); return PENDING_V; }', "if (raw.pending === true) return AIR_V;"],
            ['if (r && r.pending === true) { notePending(ctx, x, y, g, "foundation"); return "pending"; }', "if (r && r.pending === true) return false;"]
        ]
    },
    {
        name: "reset_distance", note: "lateral distance restarts at each member",
        kills: ["rooted_distance_carried"],
        edits: [
            ["const out = Math.min(X.allow, X.spanEff) - 1;", "const out = X.spanEff - 1;"],
            ["const cand = d + 1;", "const cand = 1;"]
        ]
    },
    {
        name: "trust_flag", note: "a neighbour's stored supported flag is accepted as bearing",
        kills: ["rooted_bearing_needs_root"],
        edits: [
            ['const v = yield* readVoxel(ctx, "bearing", X.x, X.y, g - 1);',
             'const v = yield* readVoxel(ctx, "bearing", X.x, X.y, g - 1); ' +
             'if (v.kind === "solid" || v.kind === "loose") { const raw = ctx.reader.voxel(X.x, X.y, zOfG(g - 1), sOfG(g - 1)); ' +
             'if (raw.supported === true) { X.below = { state: "foundation", loose: 0 }; return; } }']
        ]
    },
    {
        name: "x_only", note: "lateral paths are searched along x only",
        kills: ["rooted_rotation_invariant"],
        edits: [["for (const d of DIRS) {", "for (const d of DIRS) { if (d.dy !== 0) continue;"]]
    },
    {
        name: "unknown_as_support", note: "unavailable terrain is read as support",
        kills: ["rooted_unknown_is_pending"],
        edits: [
            ['if (r && r.pending === true) { notePending(ctx, x, y, g, "foundation"); return "pending"; }', "if (r && r.pending === true) return true;"],
            ['if (below.kind === "pending") { pending = true; break; }', 'if (below.kind === "pending") break;'],
            ['if (v.kind === "pending") { X.below = { state: "pending" }; return; }', 'if (v.kind === "pending") { X.below = { state: "foundation", loose: 0 }; return; }']
        ]
    },
    {
        name: "whole_cell", note: "any occupied voxel is read as a full cell",
        kills: ["rooted_partial_geometry"],
        edits: [["const lo = raw.lo, hi = raw.hi;", "const lo = 0, hi = ctx.H;"]]
    },
    {
        name: "z_local", note: "members stop at layer boundaries",
        kills: ["rooted_cross_z_member"],
        edits: [['if (below.kind !== "solid" || below.hi !== H) break;', 'if (below.kind !== "solid" || below.hi !== H || lo % STRATA_PER_LAYER === 0) break;']]
    },
    {
        name: "no_band", note: "HP band does not reduce the span",
        kills: ["rooted_hp_band_span"],
        edits: [["return Math.floor(spanBase * band / 8);", "return spanBase;"]]
    },
    {
        name: "flat_span", note: "spanBase ignores thickness",
        kills: ["rooted_catalogue_span"],
        edits: [["return col < 0 ? 0 : material.spanBase[col];", "return col < 0 ? 0 : material.spanBase[0];"]]
    },
    {
        name: "missing_defaults", note: "a missing spanBase defaults to zero instead of failing",
        kills: ["rooted_missing_data_errors"],
        edits: [["const raw = ctx.reader.material(key);",
                 "const raw0 = ctx.reader.material(key); const raw = raw0 && raw0.spanBase === undefined && (raw0.class === \"natural\" || raw0.class === \"assembly\") ? Object.assign({}, raw0, { spanBase: [0, 0, 0, 0, 0, 0, 0] }) : raw0;"]]
    },
    {
        name: "uncharged_read", note: "voxel reads are not charged to Bs",
        kills: ["rooted_ops_counted"],
        edits: [["    yield* charge(ctx, kind);\n    return normaliseVoxel(", "    return normaliseVoxel("]]
    },
    {
        name: "uncharged_relax", note: "lateral-path relaxations are not charged to Bs",
        kills: ["rooted_ops_counted"],
        edits: [['yield* charge(ctx, "lateral");', "/* uncharged */"]]
    }
];

function loadMutant(mut) {
    let src = fs.readFileSync(ROOTED_PATH, "utf8").replace(/\r\n/g, "\n");
    for (const [find, repl] of mut.edits) {
        const n = src.split(find).length - 1;
        if (n !== 1) throw new Error(`mutant ${mut.name}: edit target found ${n} times (expected 1): ${find.slice(0, 70)}`);
        src = src.replace(find, () => repl);
    }
    return loadFromSource(src, ROOTED_PATH);
}

// ---------------------------------------------------------------------------
// Checks. Each returns a list of failed assertions (empty = PASS).
// ---------------------------------------------------------------------------

function asserter() {
    const fails = [];
    return {
        fails,
        ok(cond, msg) { if (!cond) fails.push(msg); },
        eq(actual, expected, msg) {
            if (actual !== expected) fails.push(`${msg}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
        }
    };
}

function expectVerdict(t, r, verdict, label) {
    t.eq(r && r.verdict, verdict, `${label} verdict`);
}

const CHECKS = {};

/** Merged D3 test 1 (second half): disconnected support cycles fail. */
CHECKS.rooted_floating_ring_fails = function (api) {
    const t = asserter();
    const L = G(1, 2);
    const ring = [[9, 9], [10, 9], [11, 9], [9, 10], [11, 10], [9, 11], [10, 11], [11, 11]];

    // A ring of mutually adjacent members high in the air: every member has a neighbour, none has a root.
    const fx = world();
    for (const [x, y] of ring) fx.setG(x, y, L, "granite");
    for (const [x, y] of ring) expectVerdict(t, api.evaluate(fx, at(x, y, L)), "unsupported", `ring t=1 member (${x},${y})`);

    // The same ring two strata thick (spanBase 3).
    const fx2 = world();
    for (const [x, y] of ring) fx2.fillG(x, y, L, L + 1, "granite");
    for (const [x, y] of ring) expectVerdict(t, api.evaluate(fx2, at(x, y, L + 1)), "unsupported", `ring t=2 member (${x},${y})`);

    // One wall touches (9,9): support reaches 2 members out and does not travel round the cycle.
    const fx3 = world();
    for (const [x, y] of ring) fx3.setG(x, y, L, "granite");
    fx3.fillG(8, 9, F0, L, "granite");
    const want = { "9,9": 1, "10,9": 2, "9,10": 2 };
    for (const [x, y] of ring) {
        const r = api.evaluate(fx3, at(x, y, L));
        const k = `${x},${y}`;
        if (want[k] !== undefined) {
            expectVerdict(t, r, "supported", `anchored ring (${k})`);
            t.eq(r.dist, want[k], `anchored ring (${k}) dist`);
        } else {
            expectVerdict(t, r, "unsupported", `anchored ring (${k})`);
        }
    }
    return t.fails;
};

/** A vertical contact counts only through a certified path to a real foundation. */
CHECKS.rooted_bearing_needs_root = function (api) {
    const t = asserter();

    // A: X rests on rubble resting on a floating block. Every stored flag says solid and supported.
    const a = world();
    a.setG(5, 5, B0, "granite").setG(5, 5, B0 + 1, "rubble").setG(5, 5, B0 + 2, "granite");
    expectVerdict(t, api.evaluate(a, at(5, 5, B0 + 2)), "unsupported", "X on rubble on a floating block");
    expectVerdict(t, api.evaluate(a, at(5, 5, B0)), "unsupported", "the floating block");

    // F: X directly above a partial deposit (top half empty) on a rooted pillar: no contact, no bearing.
    const f = world();
    f.fillG(7, 7, F0, B0 - 1, "granite").setG(7, 7, B0, "granite", { hi: 12 }).setG(7, 7, B0 + 1, "granite");
    expectVerdict(t, api.evaluate(f, at(7, 7, B0 + 1)), "unsupported", "X above the empty half of a deposit");

    // B: the same stack on a pillar from the foundation.
    const b = world();
    b.fillG(5, 5, F0, B0, "granite").setG(5, 5, B0 + 1, "rubble").setG(5, 5, B0 + 2, "granite");
    const rb = api.evaluate(b, at(5, 5, B0 + 2));
    expectVerdict(t, rb, "supported", "X on rubble on a rooted pillar");
    t.eq(rb.mode, "vertical", "X on rubble on a rooted pillar mode");
    t.eq(rb.dist, 0, "X on rubble on a rooted pillar dist");
    t.eq(rb.anchor, `5,5,${B0 + 2}`, "X on rubble on a rooted pillar anchor (itself: it bears vertically)");
    t.eq(rb.foundation, `5,5,${F0}`, "X on rubble on a rooted pillar foundation");
    t.eq(JSON.stringify(rb.path && rb.path.map(p => p.via)), JSON.stringify(["D", "F"]), "X on rubble on a rooted pillar witness");

    // C: X on rubble on the foundation.
    const c = world();
    c.setG(5, 5, F0, "rubble").setG(5, 5, F0 + 1, "granite");
    const rc = api.evaluate(c, at(5, 5, F0 + 1));
    expectVerdict(t, rc, "supported", "X on rubble on the foundation");
    t.eq(rc.mode, "foundation", "X on rubble on the foundation mode");

    // D: X on rubble on a 1-cell ledge: supported, and the ledge's distance is carried up.
    const d = world();
    d.fillG(5, 5, F0, B0, "granite").setG(6, 5, B0, "granite").setG(6, 5, B0 + 1, "rubble").setG(6, 5, B0 + 2, "granite");
    const rd = api.evaluate(d, at(6, 5, B0 + 2));
    expectVerdict(t, rd, "supported", "X on rubble on a ledge");
    t.eq(rd.mode, "vertical", "X on rubble on a ledge mode");
    t.eq(rd.dist, 1, "X on rubble on a ledge dist (carried)");
    return t.fails;
};

/** Members cross layer boundaries: S4 of z and S0 of z+1 are contiguous (SIM.40.01 §4.6). */
CHECKS.rooted_cross_z_member = function (api) {
    const t = asserter();

    // A floating column from (z0, s3) to (z1, s1): one member, unsupported from either end.
    const a = world();
    a.fillG(10, 10, G(0, 3), G(1, 1), "granite");
    const up = api.evaluate(a, at(10, 10, G(1, 1)));
    const lo = api.evaluate(a, at(10, 10, G(0, 3)));
    expectVerdict(t, up, "unsupported", "floating cross-layer column, upper voxel");
    expectVerdict(t, lo, "unsupported", "floating cross-layer column, lower voxel");
    const key = `10,10,${G(0, 3)}`;
    t.eq(up.member && up.member.key, key, "upper voxel member key");
    t.eq(lo.member && lo.member.key, key, "lower voxel member key");
    t.eq(up.member && up.member.z0, 0, "member z0");
    t.eq(up.member && up.member.z1, 1, "member z1");

    // A pillar from the foundation through layers -2, -1 and 0: one member on the foundation.
    const b = world();
    b.fillG(5, 5, F0, G(0, 1), "granite");
    for (const g of [G(0, 1), G(-1, 4), F0]) {
        const r = api.evaluate(b, at(5, 5, g));
        expectVerdict(t, r, "supported", `pillar voxel g=${g}`);
        t.eq(r.mode, "foundation", `pillar voxel g=${g} mode`);
        t.eq(r.member && r.member.key, `5,5,${F0}`, `pillar voxel g=${g} member key`);
        t.eq(r.member && r.member.g1, G(0, 1), `pillar voxel g=${g} member top`);
    }

    // A two-voxel ledge across the layer boundary beside a wall: thickness 2, spanBase 3.
    const c = world();
    c.fillG(12, 10, F0, G(0, 4), "granite").fillG(13, 10, G(0, 4), G(1, 0), "granite");
    const rc = api.evaluate(c, at(13, 10, G(1, 0)));
    expectVerdict(t, rc, "supported", "cross-layer ledge");
    t.eq(rc.dist, 1, "cross-layer ledge dist");
    t.eq(rc.span && rc.span.thickness, 2, "cross-layer ledge thickness");
    t.eq(rc.span && rc.span.spanBase, 3, "cross-layer ledge spanBase");
    return t.fails;
};

/** Merged D3 test 1 (first half): rotated cantilevers agree. */
CHECKS.rooted_rotation_invariant = function (api) {
    const t = asserter();
    const C = 10;
    // Offsets from the wall at (C, C); expected dist or "over"/"none" (unsupported).
    const shape = [
        { o: [1, 0], dist: 1 }, { o: [2, 0], dist: 2 }, { o: [3, 0], dist: null },
        { o: [0, -1], dist: 1 }, { o: [-1, -1], dist: 2 }, { o: [-2, -1], dist: null }, { o: [-1, -2], dist: null }
    ];
    const rot = (k, dx, dy) => {
        for (let i = 0; i < k; i++) { const nx = -dy; dy = dx; dx = nx; }
        return [dx, dy];
    };
    const seen = [];
    for (let k = 0; k < 4; k++) {
        const fx = world();
        fx.fillG(C, C, F0, B0, "granite");
        for (const s of shape) { const [dx, dy] = rot(k, s.o[0], s.o[1]); fx.setG(C + dx, C + dy, B0, "granite"); }
        const row = [];
        for (const s of shape) {
            const [dx, dy] = rot(k, s.o[0], s.o[1]);
            const r = api.evaluate(fx, at(C + dx, C + dy, B0));
            const label = `rotation ${k * 90} offset (${s.o})`;
            if (s.dist === null) {
                expectVerdict(t, r, "unsupported", label);
            } else {
                expectVerdict(t, r, "supported", label);
                t.eq(r.dist, s.dist, `${label} dist`);
                t.eq(r.mode, "lateral", `${label} mode`);
            }
            row.push(`${r.verdict}/${r.dist}/${r.reason}/${r.span ? r.span.spanEff : "-"}`);
        }
        seen.push(row.join(" "));
    }
    for (let k = 1; k < 4; k++) t.eq(seen[k], seen[0], `rotation ${k * 90} agrees with rotation 0`);
    return t.fails;
};

/** Distance is measured to the anchor, not reset at each member (granite fixture reader). */
CHECKS.rooted_distance_carried = function (api) {
    const t = asserter();

    // A: a 1-stratum granite ledge (spanBase 2) three cells long.
    const a = world();
    a.fillG(5, 5, F0, B0, "granite").setG(6, 5, B0, "granite").setG(7, 5, B0, "granite").setG(8, 5, B0, "granite");
    const r6 = api.evaluate(a, at(6, 5, B0)), r7 = api.evaluate(a, at(7, 5, B0)), r8 = api.evaluate(a, at(8, 5, B0));
    expectVerdict(t, r6, "supported", "ledge cell 1");
    t.eq(r6.dist, 1, "ledge cell 1 dist");
    expectVerdict(t, r7, "supported", "ledge cell 2");
    t.eq(r7.dist, 2, "ledge cell 2 dist");
    t.eq(r7.anchor, `5,5,${F0}`, "ledge cell 2 anchor (the wall)");
    t.eq(JSON.stringify(r7.path && r7.path.map(p => p.key)), JSON.stringify([`7,5,${B0}`, `6,5,${B0}`, `5,5,${F0}`]), "ledge cell 2 witness path");
    expectVerdict(t, r8, "unsupported", "ledge cell 3");
    t.eq(r8.reason, "no_root", "ledge cell 3 reason");

    // B: thick members (t=5, spanBase 4) lead out; a thin member (spanBase 2) at distance 3 fails although
    // its neighbour is supported, and a thick member beyond it cannot borrow through it.
    const b = world();
    b.fillG(10, 10, F0, G(0, 4), "granite")
        .fillG(11, 10, G(0, 0), G(0, 4), "granite")
        .fillG(12, 10, G(0, 0), G(0, 4), "granite")
        .setG(13, 10, G(0, 0), "granite")
        .fillG(14, 10, G(0, 0), G(0, 4), "granite");
    const b12 = api.evaluate(b, at(12, 10, B0)), b13 = api.evaluate(b, at(13, 10, B0)), b14 = api.evaluate(b, at(14, 10, B0));
    expectVerdict(t, b12, "supported", "thick member at distance 2");
    t.eq(b12.dist, 2, "thick member at distance 2 dist");
    t.eq(b12.span && b12.span.spanEff, 4, "thick member spanEff");
    expectVerdict(t, b13, "unsupported", "thin member at distance 3");
    expectVerdict(t, b14, "unsupported", "thick member behind the thin one");
    return t.fails;
};

/** HP band and effective span (SIM.40.01 §4.4). */
CHECKS.rooted_hp_band_span = function (api) {
    const t = asserter();
    const M = api.rooted;
    if (M) {
        for (const [hp, band] of [[1, 1], [32, 1], [33, 2], [100, 4], [224, 7], [225, 8], [255, 8]]) t.eq(M.bandOf(hp), band, `bandOf(${hp})`);
        for (const bad of [0, 256, 3.5]) {
            let threw = false;
            try { M.bandOf(bad); } catch (e) { threw = true; }
            t.ok(threw, `bandOf(${bad}) throws`);
        }
        for (const [base, band, eff] of [[2, 8, 2], [2, 4, 1], [2, 3, 0], [12, 1, 1], [12, 8, 12]]) t.eq(M.spanEffOf(base, band), eff, `spanEffOf(${base}, ${band})`);
    }
    const ledge = (nearHp, farHp) => {
        const fx = world();
        fx.fillG(5, 5, F0, B0, "granite").setG(6, 5, B0, "granite", { hp: nearHp }).setG(7, 5, B0, "granite", { hp: farHp });
        return [api.evaluate(fx, at(6, 5, B0)), api.evaluate(fx, at(7, 5, B0))];
    };
    let [n, f] = ledge(255, 255);
    expectVerdict(t, f, "supported", "sound far cell at distance 2");
    [n, f] = ledge(255, 100);
    expectVerdict(t, f, "unsupported", "far cell at band 4 (spanEff 1) at distance 2");
    t.eq(f.span && f.span.band, 4, "far cell band");
    t.eq(f.span && f.span.spanEff, 1, "far cell spanEff");
    expectVerdict(t, n, "supported", "sound near cell");
    [n, f] = ledge(20, 255);
    expectVerdict(t, n, "unsupported", "near cell at band 1 (spanEff 0)");
    expectVerdict(t, f, "unsupported", "far cell behind a failed near cell");
    [n, f] = ledge(100, 255);
    expectVerdict(t, n, "supported", "near cell at band 4 at distance 1");
    expectVerdict(t, f, "supported", "far cell through a band-4 near cell");

    // A destroyed voxel (hp 0) splits a pillar; the part above it has no root.
    const d = world();
    d.fillG(9, 9, F0, B0, "granite").setG(9, 9, G(-1, 0), "granite", { hp: 0 });
    const rd = api.evaluate(d, at(9, 9, B0));
    expectVerdict(t, rd, "unsupported", "pillar above a destroyed voxel");
    t.eq(rd.member && rd.member.g0, G(-1, 1), "member above a destroyed voxel starts above it");
    return t.fails;
};

/** Merged D3 test 3 (fail-closed half): unknown terrain is pending, never air and never support. */
CHECKS.rooted_unknown_is_pending = function (api) {
    const t = asserter();
    const pend = (r, label) => {
        t.eq(r && r.verdict, "pending", `${label} verdict`);
        t.eq(r && r.reason, "pending_terrain", `${label} reason`);
    };

    // A: a ledge at the edge of known terrain; its only possible support is unavailable.
    const a = world();
    a.setG(0, 10, B0, "granite");
    pend(api.evaluate(a, at(0, 10, B0)), "ledge beside unavailable terrain");

    // B: a block whose voxel below is unavailable.
    const b = world();
    b.setG(5, 5, B0, "granite").markPendingG(5, 5, B0 - 1);
    pend(api.evaluate(b, at(5, 5, B0)), "block above unavailable terrain");

    // C: a block whose voxel above is unavailable (its own extent is unknown).
    const c = world();
    c.setG(7, 7, B0, "granite").markPendingG(7, 7, B0 + 1);
    pend(api.evaluate(c, at(7, 7, B0)), "block below unavailable terrain");

    // E: the playable lower bound is not bedrock without a foundation contract.
    const e = world({ foundation: false });
    e.fillG(5, 5, F0, B0, "granite");
    pend(api.evaluate(e, at(5, 5, B0)), "pillar on the lower bound without a foundation contract");

    // D: unknown terrain does not poison a certified path.
    const d = world();
    d.fillG(11, 5, F0, B0, "granite").setG(12, 5, B0, "granite").markPendingG(13, 5, B0);
    const rd = api.evaluate(d, at(12, 5, B0));
    t.eq(rd.verdict, "supported", "ledge with a wall and an unavailable neighbour verdict");
    t.eq(rd.dist, 1, "ledge with a wall and an unavailable neighbour dist");

    // An unavailable starting voxel is pending.
    const s = world();
    s.markPendingG(3, 3, B0);
    let rs = null;
    try { rs = api.evaluate(s, at(3, 3, B0)); } catch (err) { t.ok(false, `unavailable starting voxel threw: ${err.message}`); }
    if (rs) pend(rs, "unavailable starting voxel");
    return t.fails;
};

/** spanBase columns from the catalogue rows of the fixture readers (SIM.40.01 §2.3, §4.1). */
CHECKS.rooted_catalogue_span = function (api) {
    const t = asserter();
    const M = api.rooted;
    if (M) {
        const g = R.FIXTURE_MATERIALS.granite, l = R.FIXTURE_MATERIALS.limestone;
        for (const [tk, v] of [[0, 0], [1, 2], [2, 3], [3, 3], [4, 3], [5, 4], [9, 4], [10, 6], [19, 6], [20, 9], [39, 9], [40, 12], [45, 12]]) t.eq(M.spanBaseFor(g, tk), v, `granite spanBase t=${tk}`);
        for (const [tk, v] of [[1, 1], [2, 2], [3, 3], [4, 3], [5, 3], [10, 5], [20, 7], [40, 11]]) t.eq(M.spanBaseFor(l, tk), v, `limestone spanBase t=${tk}`);
    }
    // Same geometry, different rock: granite reaches 2 cells, limestone 1.
    const fx = world();
    fx.fillG(5, 5, F0, B0, "granite").setG(6, 5, B0, "granite").setG(7, 5, B0, "granite");
    fx.fillG(5, 8, F0, B0, "limestone").setG(6, 8, B0, "limestone").setG(7, 8, B0, "limestone");
    expectVerdict(t, api.evaluate(fx, at(7, 5, B0)), "supported", "granite ledge cell 2");
    expectVerdict(t, api.evaluate(fx, at(6, 8, B0)), "supported", "limestone ledge cell 1");
    const rl = api.evaluate(fx, at(7, 8, B0));
    expectVerdict(t, rl, "unsupported", "limestone ledge cell 2");

    // Governing material: the largest spanBase of each material's own thickness; ties by rated load.
    const gv = world();
    gv.setG(10, 10, B0, "granite").setG(10, 10, B0 + 1, "limestone");
    gv.setG(12, 12, B0, "granite").fillG(12, 12, B0 + 1, B0 + 2, "limestone");
    gv.fillG(14, 14, G(0, 0), G(1, 4), "limestone");
    gv.setG(16, 16, B0, "granite").setG(16, 16, B0 + 1, "granite", { hi: 12 });
    const r1 = api.evaluate(gv, at(10, 10, B0)), r2 = api.evaluate(gv, at(12, 12, B0));
    const r3 = api.evaluate(gv, at(14, 14, B0)), r4 = api.evaluate(gv, at(16, 16, B0));
    t.eq(r1.span && r1.span.governing, "granite", "granite+limestone governing");
    t.eq(r1.span && r1.span.spanBase, 2, "granite+limestone spanBase");
    t.eq(r2.span && r2.span.governing, "granite", "granite+2 limestone governing (tie on spanBase, granite rated higher)");
    t.eq(r3.span && r3.span.thickness, 10, "limestone t=10 thickness");
    t.eq(r3.span && r3.span.spanBase, 5, "limestone t=10 spanBase");
    t.eq(r4.span && r4.span.thickness, 1, "1.5 strata of granite counts as t=1");
    return t.fails;
};

/** Missing coordinates or material properties are errors, not defaults. */
CHECKS.rooted_missing_data_errors = function (api) {
    const t = asserter();
    const throws = (fn, label) => {
        let threw = false;
        try { fn(); } catch (e) { threw = true; }
        t.ok(threw, `${label} throws`);
    };
    const fx = world({ materials: { nospan: { key: "nospan", class: "natural" } } });
    fx.fillG(5, 5, F0, B0, "granite").setG(8, 8, B0, "nospan").setG(9, 9, B0, "rubble");
    throws(() => api.evaluate(fx, { x: 5, y: 5, s: 0 }), "missing z");
    throws(() => api.evaluate(fx, { x: 5.5, y: 5, z: 0, s: 0 }), "fractional x");
    throws(() => api.evaluate(fx, { x: 5, y: 5, z: 0, s: 5 }), "stratum 5");
    throws(() => api.evaluate(fx, at(8, 8, B0)), "material without spanBase");
    throws(() => api.evaluate(fx, at(3, 3, B0)), "air voxel");
    throws(() => api.evaluate(fx, at(9, 9, B0)), "loose voxel");

    const wrap = (over) => Object.assign(Object.create(null), {
        subunits: fx.subunits,
        voxel: fx.voxel, foundation: fx.foundation, material: fx.material
    }, over);
    throws(() => api.evaluate(wrap({ voxel: () => ({ material: "granite", lo: 0, hi: 24 }) }), at(5, 5, B0)), "voxel without hp");
    throws(() => api.evaluate(wrap({ voxel: () => ({ material: "granite", hp: 255 }) }), at(5, 5, B0)), "voxel without lo/hi");
    throws(() => api.evaluate(wrap({ foundation: () => undefined }), at(5, 5, B0)), "foundation answer missing");
    throws(() => api.evaluate(wrap({ subunits: undefined }), at(5, 5, B0)), "reader without subunits");
    return t.fails;
};

/** Actual occupied geometry, partial deposits included, not a whole-cell SOLID flag. */
CHECKS.rooted_partial_geometry = function (api) {
    const t = asserter();

    // A: a half-height deposit on the floor bears nothing above its empty half.
    const a = world();
    a.setG(5, 5, F0, "granite", { hi: 12 }).setG(5, 5, F0 + 1, "granite");
    const dep = api.evaluate(a, at(5, 5, F0));
    expectVerdict(t, dep, "supported", "deposit on the foundation");
    t.eq(dep.member && dep.member.top, F0 * a.subunits + 12, "deposit occupied top");
    expectVerdict(t, api.evaluate(a, at(5, 5, F0 + 1)), "unsupported", "block above the deposit's empty half");

    // B: occupancy that does not reach the voxel's bottom face has no contact below.
    const b = world();
    b.setG(8, 8, F0, "granite", { hi: 12 }).setG(10, 8, F0, "granite", { lo: 6 });
    expectVerdict(t, api.evaluate(b, at(8, 8, F0)), "supported", "bottom-half voxel on the foundation");
    expectVerdict(t, api.evaluate(b, at(10, 8, F0)), "unsupported", "voxel with a gap under it");

    // C: lateral support needs overlapping occupied extents.
    const c = world();
    c.fillG(12, 12, F0, B0 - 1, "granite").setG(12, 12, B0, "granite", { hi: 12 });
    c.setG(13, 12, B0, "granite", { lo: 12 }).setG(13, 12, B0 + 1, "granite");
    c.fillG(15, 15, F0, B0 - 1, "granite").setG(15, 15, B0, "granite", { hi: 12 });
    c.setG(16, 15, B0, "granite", { lo: 6 }).setG(16, 15, B0 + 1, "granite");
    expectVerdict(t, api.evaluate(c, at(13, 12, B0 + 1)), "unsupported", "ledge touching the wall's top only at an edge");
    const rc = api.evaluate(c, at(16, 15, B0 + 1));
    expectVerdict(t, rc, "supported", "ledge overlapping the wall by 6 subunits");
    t.eq(rc.dist, 1, "overlapping ledge dist");

    // D: fluid is not solid geometry.
    const d = world();
    d.setG(3, 3, F0, "water").setG(3, 3, F0 + 1, "granite");
    expectVerdict(t, api.evaluate(d, at(3, 3, F0 + 1)), "unsupported", "block on water");
    return t.fails;
};

/** Every member, bearing and lateral-path visit charges the one structural counter (Bs). */
CHECKS.rooted_ops_counted = function (api) {
    const t = asserter();
    const M = api.rooted;
    if (!M) { t.ok(false, "no rooted module"); return t.fails; }

    // 1. Exact counts, derived by hand from the algorithm (see docs/systems/DEUS_Structural.md, Checks).
    //    Single voxel on the foundation: member 4 (start read, foundation in the walk, read above, queue
    //    visit), bearing 1 (foundation probe), lateral 4 (one read per cardinal column).
    const one = world();
    one.setG(5, 5, F0, "granite");
    const r1 = api.evaluate(one, at(5, 5, F0));
    t.eq(JSON.stringify(r1.ops), JSON.stringify({ member: 4, bearing: 1, lateral: 4, total: 9 }), "single voxel ops");
    //    Ledge (6,5,F0+1) beside a 2-voxel wall: member 10, bearing 3, lateral 15 (4 ledge-side reads,
    //    8 wall-side reads, 2 relaxations, 1 witness step).
    const ledge = world();
    ledge.fillG(5, 5, F0, F0 + 1, "granite").setG(6, 5, F0 + 1, "granite");
    const r2 = api.evaluate(ledge, at(6, 5, F0 + 1));
    t.eq(JSON.stringify(r2.ops), JSON.stringify({ member: 10, bearing: 3, lateral: 15, total: 28 }), "ledge ops");

    // 2. Every reader call is preceded by its own charge on the caller's counter.
    const big = world();
    big.fillG(10, 10, F0, G(0, 4), "granite").fillG(11, 10, G(0, 0), G(0, 4), "granite")
        .fillG(12, 10, G(0, 0), G(0, 4), "granite").setG(13, 10, G(0, 0), "granite").fillG(14, 10, G(0, 0), G(0, 4), "granite")
        .setG(11, 9, B0 + 5, "rubble").setG(11, 9, B0 + 6, "granite").fillG(11, 9, F0, B0 + 4, "granite");
    const counter = M.createOpsCounter(Infinity);
    let calls = 0, last = 0, unpaid = 0;
    const spy = Object.assign(Object.create(null), {
        subunits: big.subunits,
        material: big.material,
        voxel(x, y, z, s) { calls++; if (counter.used <= last) unpaid++; last = counter.used; return big.voxel(x, y, z, s); },
        foundation(x, y, z, s) { calls++; if (counter.used <= last) unpaid++; last = counter.used; return big.foundation(x, y, z, s); }
    });
    const rs = api.evaluate(spy, at(12, 10, B0), { counter });
    t.eq(unpaid, 0, "reader calls without a charge");
    t.ok(calls > 0 && counter.used >= calls, `counter ${counter.used} covers ${calls} reader calls`);
    t.eq(counter.used, rs.ops.total, "caller's counter equals the job's ops");
    t.eq(counter.byKind.member + counter.byKind.bearing + counter.byKind.lateral, counter.used, "kinds sum to the total");
    for (const k of ["member", "bearing", "lateral"]) t.ok(counter.byKind[k] > 0, `kind ${k} charged`);

    // 3. Budget: a job stops when the counter refuses, resumes on the next counter and ends identically.
    const full = api.evaluate(big, at(13, 10, B0));
    const T = full.ops.total;
    for (const k of [1, 2, 3, 7, 50, T - 1, T]) {
        const job = M.createRootedJob(big, at(13, 10, B0));
        let steps = 0, over = false;
        while (!job.done && steps <= T + 1) {
            const c = M.createOpsCounter(k);
            job.step(c);
            steps++;
            if (c.used > k) over = true;
        }
        t.ok(!over, `budget ${k}: no step exceeds its counter`);
        t.eq(steps, Math.ceil(T / k), `budget ${k}: steps`);
        t.eq(JSON.stringify(job.result), JSON.stringify(full), `budget ${k}: result equals the unbounded run`);
    }
    const partial = api.evaluate(big, at(13, 10, B0), { counter: M.createOpsCounter(5) });
    t.eq(partial.verdict, "pending", "exhausted counter verdict");
    t.eq(partial.reason, "budget", "exhausted counter reason");
    t.ok(partial.job && partial.job.step(M.createOpsCounter(Infinity)) === true, "unfinished job resumes");
    t.eq(partial.job && JSON.stringify(partial.job.result), JSON.stringify(full), "resumed result equals the unbounded run");

    // 4. One counter is shared: two evaluations accumulate on it.
    const shared = M.createOpsCounter(Infinity);
    const s1 = api.evaluate(big, at(11, 10, B0), { counter: shared });
    const s2 = api.evaluate(big, at(11, 9, B0 + 6), { counter: shared });
    t.eq(shared.used, s1.ops.total + s2.ops.total, "shared counter accumulates");
    t.eq(s2.mode, "vertical", "rubble-borne member mode");
    const zero = M.createOpsCounter(0);
    t.eq(zero.charge("member"), false, "a spent counter refuses");
    let threw = false;
    try { zero.charge("other"); } catch (e) { threw = true; }
    t.ok(threw, "unknown op kind throws");
    return t.fails;
};

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

function runChecks(api, names, quiet) {
    const out = {};
    for (const name of names) {
        let fails;
        try {
            fails = CHECKS[name](api);
        } catch (e) {
            fails = [`threw: ${e.message}`];
        }
        out[name] = fails;
        if (!quiet) {
            if (fails.length === 0) console.log(`PASS: ${name}`);
            else console.error(`FAIL: ${name} [${api.name}] - ${fails.slice(0, 4).join("; ")}${fails.length > 4 ? ` (+${fails.length - 4} more)` : ""}`);
        }
    }
    return out;
}

const ALL = Object.keys(CHECKS);
const LEGACY_CHECKS = ["rooted_floating_ring_fails", "rooted_bearing_needs_root", "rooted_cross_z_member"];
const real = rootedApi("rooted", require(ROOTED_PATH));

if (MODE === "legacy") {
    const res = runChecks(legacyApi(), LEGACY_CHECKS);
    const failed = LEGACY_CHECKS.filter(n => res[n].length);
    console.log(`\nRESULT: legacy predicate ${failed.length}/${LEGACY_CHECKS.length} checks failed`);
    process.exit(failed.length ? 1 : 0);
}

if (MODE === "mutant") {
    const mut = MUTANTS.find(m => m.name === MUTANT_ARG);
    if (!mut) { console.error(`unknown mutant "${MUTANT_ARG}"; known: ${MUTANTS.map(m => m.name).join(", ")}`); process.exit(2); }
    const res = runChecks(rootedApi(mut.name, loadMutant(mut)), ALL);
    const failed = ALL.filter(n => res[n].length);
    console.log(`\nRESULT: mutant ${mut.name} - ${failed.length}/${ALL.length} checks failed`);
    process.exit(failed.length ? 1 : 0);
}

console.log("=== NAT.02.01 rooted support: baseline ===");
const base = runChecks(real, ALL);
let bad = ALL.filter(n => base[n].length).length;

if (MODE === "full") {
    console.log("\n=== Negative control: legacy predicate (support.js evalCellSupport, unchanged) ===");
    const legacy = runChecks(legacyApi(), LEGACY_CHECKS, true);
    for (const n of LEGACY_CHECKS) {
        if (legacy[n].length) console.log(`REJECTED: legacy turns ${n} red - ${legacy[n][0]}`);
        else { console.error(`SURVIVED: legacy passes ${n}`); bad++; }
    }

    console.log("\n=== Negative controls: source mutants of rooted.js ===");
    for (const mut of MUTANTS) {
        let res;
        try {
            res = runChecks(rootedApi(mut.name, loadMutant(mut)), ALL, true);
        } catch (e) {
            console.error(`BROKEN: mutant ${mut.name} - ${e.message}`);
            bad++;
            continue;
        }
        const red = ALL.filter(n => res[n].length);
        for (const n of mut.kills) {
            if (res[n].length) console.log(`KILLED: ${mut.name} (${mut.note}) turns ${n} red - ${res[n][0]}`);
            else { console.error(`SURVIVED: ${mut.name} (${mut.note}) leaves ${n} green`); bad++; }
        }
        console.log(`        ${mut.name}: red checks = ${red.join(", ") || "none"}`);
    }
}

console.log(bad ? `\nRESULT: FAIL (${bad} problem(s))` : `\nRESULT: PASS (${ALL.length + 1} checks; legacy and ${MUTANTS.length} mutants rejected)`);
process.exit(bad ? 1 : 0);
