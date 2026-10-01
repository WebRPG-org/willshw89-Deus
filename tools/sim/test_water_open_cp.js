"use strict";

/**
 * tools/sim/test_water_open_cp.js
 *
 * NAT.03.02 lane-ea: water authority entry point and the open-fluid cp store
 * (game/js/sim/hydrology/index.js, open.js). Headless; no RMMZ.
 *
 *   node tools/sim/test_water_open_cp.js                 named checks, then the mutant sweep
 *   node tools/sim/test_water_open_cp.js --checks-only   named checks only
 *   node tools/sim/test_water_open_cp.js --only <check>  one check (no sweep)
 *
 * Every check loads its own copy of the modules (vm, this realm, private
 * require cache), so a mutant is a source edit of open.js / index.js that
 * never touches the files on disk. A mutant counts as killed only when its
 * named check fails by assertion. Exit 1 on any failed check or surviving mutant.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.join(__dirname, "..", "..");
const HYD = path.join(ROOT, "game", "js", "sim", "hydrology");
const OPEN_JS = path.join(HYD, "open.js");
const INDEX_JS = path.join(HYD, "index.js");
const AQUIFER_JS = path.join(HYD, "aquifer.js");
const UNITS_JS = path.join(ROOT, "game", "js", "sim", "units.js");

// Baseline export list of hydrology/index.js at the lane base 54d8e533
// (tasks/NAT.03.02/lane-ea/evidence/baseline_index_exports.json): name -> aquifer.js export.
const BASELINE_EXPORTS = Object.freeze([
    "Stratum", "AquiferEngine", "encodeStratumId", "decodeStratumId", "canonicalEdgeKey",
    "calcInterfaceConductivity", "MAX_WATER_MASS_PER_STRATUM", "VOLUME_PER_STRATUM",
    "WATER_DENSITY_CENTIPOUNDS_PER_CUFT"
]);

// Test fixture, not game data: a molten-rock density in cp/ft3 (160 lb/ft3,
// about 2,560 kg/m3). The host supplies lava's density; open.js has none.
const LAVA_CP_PER_FT3 = 16000;

// --- Isolated module loading ----------------------------------------------------
function loadTree(overrides) {
    const cache = new Map();
    function load(file) {
        const abs = path.resolve(file);
        if (cache.has(abs)) return cache.get(abs).exports;
        const src = overrides && overrides[abs] !== undefined ? overrides[abs] : fs.readFileSync(abs, "utf8");
        const mod = { exports: {} };
        cache.set(abs, mod);
        const fn = vm.runInThisContext("(function (exports, require, module, __filename, __dirname) {" + src + "\n})", { filename: abs });
        const req = spec => spec.startsWith(".")
            ? load(path.resolve(path.dirname(abs), spec.endsWith(".js") ? spec : spec + ".js"))
            : require(spec);
        fn(mod.exports, req, mod, abs, path.dirname(abs));
        return mod.exports;
    }
    return {
        index: () => load(INDEX_JS),
        open: () => load(OPEN_JS),
        aquifer: () => load(AQUIFER_JS),
        units: () => load(UNITS_JS)
    };
}

// --- Host fixture ---------------------------------------------------------------
// Cells are solid (mask 0) unless opened. calls counts every openMask probe.
function makeHost(spec) {
    const masks = new Map();
    const host = {
        size: spec.size, areasX: spec.areasX || 1, areasY: spec.areasY || 1,
        zMin: spec.zMin === undefined ? 0 : spec.zMin, zMax: spec.zMax === undefined ? 0 : spec.zMax,
        calls: 0,
        openMask(ax, ay, x, y, z) { host.calls++; return masks.get(ax + "," + ay + "," + x + "," + y + "," + z) || 0; },
        set(ax, ay, x, y, z, mask) { masks.set(ax + "," + ay + "," + x + "," + y + "," + z, mask); },
        each(fn) {
            for (let ax = 0; ax < host.areasX; ax++) for (let ay = 0; ay < host.areasY; ay++)
                for (let z = host.zMin; z <= host.zMax; z++) for (let y = 0; y < host.size; y++) for (let x = 0; x < host.size; x++) fn({ ax, ay, x, y, z });
        }
    };
    return host;
}
const FULL = 31;
const R = (ax, ay, x, y, z) => ({ ax, ay, x, y, z });
const keyOf = r => r.ax + "," + r.ay + "," + r.x + "," + r.y + "," + r.z;

function authority(T, host, extra) {
    return T.index().createWaterAuthority(Object.assign({ host, densities: { lava: LAVA_CP_PER_FT3 } }, extra || {}));
}

// Test-only full scan: the open cp actually held, per class, read cell by cell.
function scanOpen(auth, host) {
    const t = {};
    const calls = host.calls;
    host.each(r => { const f = auth.fluidAt(r); if (f) t[f.cls] = (t[f.cls] || 0) + f.cp; });
    host.calls = calls;
    return t;
}

function settle(auth, budget, maxSteps) {
    const records = [];
    for (let i = 0; i < maxSteps; i++) {
        const r = auth.step(budget);
        for (const rec of r.records) records.push(rec);
        if (r.queued === 0) return { steps: i + 1, records };
    }
    assert.fail("did not settle within " + maxSteps + " steps (queued " + auth.queued() + ")");
}

// A basin over two areas and three levels: a raised floor, a shaft, a cavity
// with a lip, and a pool that crosses the seam between areas 0 and 1.
function basinWorld() {
    const host = makeHost({ size: 6, areasX: 2, areasY: 1, zMin: -2, zMax: 1 });
    for (let ax = 0; ax < 2; ax++) for (let y = 1; y <= 4; y++) for (let x = 0; x < 6; x++) host.set(ax, 0, x, y, 0, FULL);
    host.set(0, 0, 2, 2, 0, 0b11100);      // raised floor
    host.set(0, 0, 3, 3, 0, 0b11000);
    host.set(1, 0, 2, 2, -1, FULL);        // shaft below area 1
    host.set(1, 0, 2, 2, -2, FULL);
    host.set(1, 0, 2, 3, -2, FULL);
    host.set(1, 0, 3, 3, -2, 0b00011);     // low passage
    for (let x = 0; x < 6; x++) host.set(0, 0, x, 2, 1, FULL);   // a ledge level above
    return host;
}

// --- Named checks -------------------------------------------------------------------
const CHECKS = {};

CHECKS.aquifer_exports_preserved = T => {
    const idx = T.index(), aq = T.aquifer();
    for (const name of BASELINE_EXPORTS) {
        assert.ok(Object.prototype.hasOwnProperty.call(idx, name), "index.js lost the baseline export " + name);
        assert.ok(Object.prototype.hasOwnProperty.call(aq, name), "aquifer.js has no " + name);
        assert.strictEqual(idx[name], aq[name], name + " is no longer a re-export of aquifer.js#" + name);
    }
    // Default behavior through the entry point: one Darcy transfer, mass kept.
    const eng = new idx.AquiferEngine();
    const a = new idx.Stratum(idx.encodeStratumId(0, 0, 0, 0), 0, 0, 0, 0, 3000, 100000, 50000);
    const b = new idx.Stratum(idx.encodeStratumId(1, 0, 0, 0), 1, 0, 0, 0, 3000, 100000, 0);
    eng.addStratum(a); eng.addStratum(b);
    for (let i = 0; i < 50; i++) eng.processTick(1);
    assert.strictEqual(eng.getTotalMass(), 50000, "aquifer mass through index.js");
    assert.ok(b.waterMass > 0, "aquifer flow through index.js");
    return BASELINE_EXPORTS.length + " baseline exports re-exported unchanged";
};

CHECKS.cp_exact_conservation = T => {
    const host = basinWorld();
    const auth = authority(T, host);
    auth.registerGeologicalSources([{ id: "w1", cls: "water", cp: 9000000 }, { id: "l1", cls: "lava", cp: 3000000 }]);
    const registered = { water: 9000000, lava: 3000000 };
    auth.release("w1", R(0, 0, 0, 1, 0), 1500000);
    auth.release("w1", R(0, 0, 5, 4, 0), 1234567);
    auth.release("w1", R(0, 0, 1, 2, 1), 777777);
    auth.release("l1", R(1, 0, 4, 1, 0), 1100001);
    let moved = 0, causes = new Set();
    for (let i = 0; i < 4000; i++) {
        const r = auth.step(97);
        for (const rec of r.records) { moved += rec.cp; causes.add(rec.cause); }
        const scan = scanOpen(auth, host), t = auth.totals();
        for (const cls of ["water", "lava"]) {
            assert.strictEqual(scan[cls] || 0, t[cls].open, cls + " open cp read cell by cell vs running total, step " + i);
            assert.strictEqual(t[cls].open + t[cls].sources, registered[cls], cls + " open + source cp vs registered, step " + i);
        }
        if (r.queued === 0) break;
    }
    assert.strictEqual(auth.queued(), 0, "basin settles");
    assert.ok(causes.has("gravity") && causes.has("equalize"), "both flow rules ran: " + Array.from(causes));
    assert.ok(moved > 0, "cp moved");
    return "water 9000000 cp, lava 3000000 cp exact every step; " + moved + " cp moved";
};

CHECKS.cavity_height_depth = T => {
    const U = T.units();
    const host = makeHost({ size: 9 });
    host.set(0, 0, 0, 0, 0, 0b10000);   // a two-foot cavity at the top of the cell
    host.set(0, 0, 2, 0, 0, FULL);      // a ten-foot cell
    host.set(0, 0, 4, 0, 0, 0b11000);   // floor raised three strata
    host.set(0, 0, 6, 0, 0, FULL);      // water, two strata
    host.set(0, 0, 8, 0, 0, FULL);      // lava, the same volume
    const auth = authority(T, host);
    const lavaCap = U.STRATUM_FT3 * LAVA_CP_PER_FT3;
    auth.registerGeologicalSources([{ id: "w", cls: "water", cp: 100000000 }, { id: "l", cls: "lava", cp: 100000000 }]);
    assert.strictEqual(auth.capacityAt(R(0, 0, 0, 0, 0), "water"), U.WATER_CP_PER_STRATUM, "cavity capacity = one stratum");
    assert.strictEqual(auth.capacityAt(R(0, 0, 2, 0, 0), "water"), U.WATER_CP_PER_Z_CELL, "open cell capacity = five strata");
    assert.strictEqual(auth.capacityAt(R(0, 0, 2, 0, 0), "lava"), 5 * lavaCap, "lava capacity from host density");
    auth.release("w", R(0, 0, 0, 0, 0), U.WATER_CP_PER_Z_CELL);   // more than fits: clamped
    auth.release("w", R(0, 0, 2, 0, 0), U.WATER_CP_PER_Z_CELL);
    auth.release("w", R(0, 0, 4, 0, 0), U.WATER_CP_PER_STRATUM / 2);
    auth.release("w", R(0, 0, 6, 0, 0), 2 * U.WATER_CP_PER_STRATUM);
    auth.release("l", R(0, 0, 8, 0, 0), 2 * lavaCap);
    const cav = auth.fluidAt(R(0, 0, 0, 0, 0)), full = auth.fluidAt(R(0, 0, 2, 0, 0));
    const lip = auth.fluidAt(R(0, 0, 4, 0, 0)), w2 = auth.fluidAt(R(0, 0, 6, 0, 0)), l2 = auth.fluidAt(R(0, 0, 8, 0, 0));
    assert.strictEqual(cav.cp, U.WATER_CP_PER_STRATUM, "cavity holds one stratum of cp");
    assert.strictEqual(cav.depthView, 1, "full 2-ft cavity depth view");
    assert.strictEqual(full.depthView, 7, "full 10-ft cell depth view");
    assert.notStrictEqual(cav.depthView, full.depthView, "a full cavity must not read as a full cell");
    assert.strictEqual(cav.thicknessFt, 2, "cavity thickness ft");
    assert.strictEqual(full.thicknessFt, 10, "cell thickness ft");
    assert.strictEqual(cav.surfaceFt, 10, "cavity surface sits at the top of the cell");
    assert.strictEqual(lip.surfaceFt, 7, "half a stratum on a floor raised 6 ft stands at 7 ft");
    assert.strictEqual(lip.thicknessFt, 1, "half a stratum is 1 ft");
    assert.strictEqual(lip.depthView, 1, "1 ft of water");
    assert.notStrictEqual(l2.cp, w2.cp, "equal volumes of lava and water differ in cp");
    assert.strictEqual(l2.depthView, w2.depthView, "equal volumes give equal depth views");
    assert.strictEqual(w2.depthView, 3, "two strata: round(7 * 2 / 5)");
    assert.strictEqual(l2.thicknessFt, w2.thicknessFt, "equal volumes give equal thickness");
    assert.strictEqual(auth.depthView(R(0, 0, 8, 0, 0)), 3, "depthView(ref)");
    assert.strictEqual(auth.typeView(R(0, 0, 8, 0, 0)), "lava", "typeView(ref)");
    return "cavity d1 / 2 ft, cell d7 / 10 ft, lip surface 7 ft, lava=water volume d3";
};

CHECKS.unlike_fluids_kept = T => {
    const U = T.units();
    const host = makeHost({ size: 4, zMin: 0, zMax: 1 });
    host.set(0, 0, 0, 0, 0, FULL);      // water, full, beside
    host.set(0, 0, 1, 0, 0, FULL);      // a lava cell with no other open neighbour
    host.set(0, 0, 1, 0, 1, FULL);      // water above the lava cell
    const auth = authority(T, host);
    auth.registerGeologicalSources([{ id: "w", cls: "water", cp: 50000000 }, { id: "l", cls: "lava", cp: 50000000 }]);
    auth.release("l", R(0, 0, 1, 0, 0), 2 * U.STRATUM_FT3 * LAVA_CP_PER_FT3);
    auth.release("w", R(0, 0, 0, 0, 0), U.WATER_CP_PER_Z_CELL);
    auth.release("w", R(0, 0, 1, 0, 1), U.WATER_CP_PER_STRATUM * 3);
    assert.strictEqual(auth.release("w", R(0, 0, 1, 0, 0), 1000), null, "water is not placed into lava");
    const before = auth.totals();
    const { records } = settle(auth, 512, 200);
    const after = auth.totals();
    assert.deepStrictEqual(after, before, "per-class totals unchanged");
    assert.strictEqual(auth.typeView(R(0, 0, 1, 0, 0)), "lava", "the lava cell stays lava");
    assert.strictEqual(auth.fluidAt(R(0, 0, 1, 0, 0)).cp, 2 * U.STRATUM_FT3 * LAVA_CP_PER_FT3, "lava cp untouched");
    assert.strictEqual(auth.fluidAt(R(0, 0, 0, 0, 0)).cp, U.WATER_CP_PER_Z_CELL, "water beside lava does not cross it");
    assert.strictEqual(auth.fluidAt(R(0, 0, 1, 0, 1)).cp, U.WATER_CP_PER_STRATUM * 3, "water above lava stays above");
    assert.ok(records.every(r => r.to !== "0,0,1,0,0"), "no transfer into the lava cell");
    return "lava cell and both water bodies unchanged after settling";
};

CHECKS.wrap_seam_flow = T => {
    const U = T.units();
    // Emerys' 3 x 3 areas. Three corridors, each two cells, crossing a seam.
    const host = makeHost({ size: 4, areasX: 3, areasY: 3 });
    const pairs = [
        [R(2, 1, 3, 1, 0), R(0, 1, 0, 1, 0)],   // outer east edge -> west edge
        [R(0, 0, 3, 2, 0), R(1, 0, 0, 2, 0)],   // internal seam
        [R(1, 2, 2, 3, 0), R(1, 0, 2, 0, 0)]    // outer south edge -> north edge
    ];
    for (const [a, b] of pairs) { host.set(a.ax, a.ay, a.x, a.y, a.z, FULL); host.set(b.ax, b.ay, b.x, b.y, b.z, FULL); }
    const auth = authority(T, host);
    auth.registerGeologicalSources([{ id: "w", cls: "water", cp: 10 * U.WATER_CP_PER_Z_CELL }]);
    for (const [a] of pairs) auth.release("w", a, U.WATER_CP_PER_Z_CELL);
    const { records } = settle(auth, 512, 50);
    for (const [a, b] of pairs) {
        const fa = auth.fluidAt(a), fb = auth.fluidAt(b);
        assert.ok(fb && fb.cp > 0, "water crossed the seam into " + keyOf(b));
        assert.strictEqual(fa.cp + fb.cp, U.WATER_CP_PER_Z_CELL, "pair " + keyOf(a) + " keeps its cp");
        assert.strictEqual(fa.cp, fb.cp, "levels equalize across the seam");
        assert.ok(records.some(r => r.seam && r.from === keyOf(a) && r.to === keyOf(b)), "a seam record for " + keyOf(a));
    }
    return "outer east, internal and outer south seams each split " + U.WATER_CP_PER_Z_CELL + " cp evenly";
};

CHECKS.seam_once = T => {
    const U = T.units();
    // Donor in area (1,0) at x=0, receiver in area (0,0) at x=3: the donor's key sorts after the receiver's.
    const A = R(1, 0, 0, 0, 0), B = R(0, 0, 3, 0, 0);
    const expected = keyOf(B) + "|" + keyOf(A);
    const results = [];
    for (const order of [[A, B], [B, A]]) {
        const host = makeHost({ size: 4, areasX: 2 });
        host.set(A.ax, A.ay, A.x, A.y, A.z, FULL); host.set(B.ax, B.ay, B.x, B.y, B.z, FULL);
        const auth = authority(T, host);
        auth.registerGeologicalSources([{ id: "w", cls: "water", cp: 4 * U.WATER_CP_PER_STRATUM }]);
        for (const r of order) auth.release("w", r, r === A ? 3 * U.WATER_CP_PER_STRATUM : U.WATER_CP_PER_STRATUM);
        const step = auth.step(512);
        const seams = step.records.filter(r => r.seam);
        assert.strictEqual(seams.length, 1, "one seam record in the step (order " + order.map(keyOf).join(" then ") + ")");
        const rec = seams[0];
        assert.strictEqual(rec.seam, expected, "canonical seam key, lower cell key first");
        assert.strictEqual(rec.from, keyOf(A), "the higher side gives");
        assert.strictEqual(rec.cp, U.WATER_CP_PER_STRATUM, "one stratum of cp crosses");
        assert.strictEqual(auth.fluidAt(A).cp, 2 * U.WATER_CP_PER_STRATUM, "donor debited once");
        assert.strictEqual(auth.fluidAt(B).cp, 2 * U.WATER_CP_PER_STRATUM, "receiver credited once");
        assert.strictEqual(settle(auth, 512, 10).records.length, 0, "nothing further crosses");
        results.push(JSON.stringify(auth.serialize().open.cells));
    }
    assert.strictEqual(results[0], results[1], "visit order does not change the result");
    return "one record " + expected + ", debit = credit = " + U.WATER_CP_PER_STRATUM + " cp, order-independent";
};

CHECKS.budget_bound = T => {
    const U = T.units();
    const open = T.open();
    assert.strictEqual(open.DEFAULT_BUDGET, 512, "settled default budget");
    const host = makeHost({ size: 12, areasX: 2, zMin: -1, zMax: 0 });
    for (let ax = 0; ax < 2; ax++) for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
        host.set(ax, 0, x, y, 0, FULL);
        if ((x + y) % 3 === 0) host.set(ax, 0, x, y, -1, FULL);
    }
    let lastWork = -1;
    for (const budget of [1, 2, 3, 7, 64, undefined]) {
        const auth = authority(T, host);
        auth.registerGeologicalSources([{ id: "w", cls: "water", cp: 1e9 }]);
        for (let y = 0; y < 12; y += 2) auth.release("w", R(0, 0, 5, y, 0), U.WATER_CP_PER_Z_CELL);
        const cap = budget === undefined ? 512 : budget;
        let steps = 0;
        while (auth.queued() > 0) {
            host.calls = 0;
            const r = auth.step(budget);
            assert.ok(r.work <= cap, "work " + r.work + " exceeds budget " + cap);
            assert.ok(host.calls <= cap, "host probes " + host.calls + " exceed budget " + cap + " (step " + steps + ")");
            assert.strictEqual(r.probes, host.calls, "every host probe is reported");
            assert.ok(r.work > 0, "a queued step makes progress");
            if (steps === 0) lastWork = r.work;
            assert.ok(++steps < 200000, "budget " + cap + " never settles");
        }
        if (budget === undefined) assert.strictEqual(lastWork, 512, "the default budget is spent in full on a large queue");
    }
    return "work and host probes <= budget for 1, 2, 3, 7, 64 and the default 512";
};

CHECKS.no_source_no_mint = T => {
    const U = T.units();
    const host = makeHost({ size: 3 });
    host.set(0, 0, 0, 0, 0, FULL);
    host.set(0, 0, 1, 0, 0, FULL);
    const auth = authority(T, host);
    const zero = JSON.stringify(auth.totals());
    assert.throws(() => auth.release("nowhere", R(0, 0, 0, 0, 0), 1000), e => e.code === "E_NO_SOURCE", "unregistered source refused");
    assert.strictEqual(JSON.stringify(auth.totals()), zero, "refused release changes nothing");
    assert.strictEqual(auth.fluidAt(R(0, 0, 0, 0, 0)), null, "no fluid appeared");
    auth.registerGeologicalSources([{ id: "spring", cls: "water", cp: 1000 }]);
    assert.throws(() => auth.registerGeologicalSources([{ id: "other", cls: "water", cp: 5 }, { id: "spring", cls: "water", cp: 1000 }]),
        e => e.code === "E_SOURCE_DUP", "re-registration refused");
    assert.strictEqual(auth.sourceRemaining("other"), null, "a refused manifest registers nothing");
    assert.throws(() => auth.registerGeologicalSources([{ id: "x", cls: "steam", cp: 5 }]), e => e.code === "E_CLASS", "a class without density refused");
    assert.strictEqual(auth.release("spring", R(0, 0, 2, 0, 0), 500), null, "nothing placed into solid rock");
    const rec = auth.release("spring", R(0, 0, 0, 0, 0), 5000);
    assert.strictEqual(rec.cp, 1000, "release bounded by the source's remainder");
    assert.strictEqual(rec.from, "src:spring", "the record names the debited source");
    assert.strictEqual(auth.release("spring", R(0, 0, 0, 0, 0), 1), null, "an exhausted source gives nothing");
    assert.deepStrictEqual(auth.totals().water, { open: 1000, sources: 0 }, "1000 cp moved, none made");
    settle(auth, 64, 100);
    // A save whose cells hold more than its accounts is refused, and the state is kept.
    const save = JSON.parse(JSON.stringify(auth.serialize()));
    save.open.cells[0][6] += 1;
    const keep = JSON.stringify(auth.serialize());
    assert.throws(() => auth.deserialize(save), e => e.code === "E_SAVE_TOTALS", "a tampered save is refused");
    assert.strictEqual(JSON.stringify(auth.serialize()), keep, "the refused load changed nothing");
    assert.deepStrictEqual(auth.totals().water, { open: 1000, sources: 0 }, "still 1000 cp");
    return "unknown source, re-registration, solid target, exhaustion and tampered save all mint 0 cp";
};

CHECKS.quiescent_zero = T => {
    const U = T.units();
    const host = basinWorld();
    const auth = authority(T, host);
    auth.registerGeologicalSources([{ id: "w", cls: "water", cp: 5000000 }]);
    auth.release("w", R(0, 0, 0, 1, 0), 3000000);
    auth.release("w", R(0, 0, 1, 2, 1), 400000);
    const { steps, records } = settle(auth, 512, 500);
    assert.ok(records.length > 0, "the scenario moved water before settling");
    assert.ok(scanOpen(auth, host).water > 0, "water still stands");
    // Settled means level: open neighbours holding water differ by at most a millistratum.
    let pairs = 0;
    for (let ax = 0; ax < 2; ax++) for (let y = 1; y <= 4; y++) for (let x = 0; x < 6; x++) {
        const a = auth.fluidAt(R(ax, 0, x, y, 0)), b = auth.fluidAt(R(ax, 0, (x + 1) % 6, y, 0));
        if (!a || !b || host.openMask(ax, 0, x, y, 0) !== FULL || host.openMask(ax, 0, (x + 1) % 6, y, 0) !== FULL) continue;
        pairs++;
        assert.ok(Math.abs(a.surfaceFt - b.surfaceFt) <= U.STRATUM_FT / 1000, "surfaces " + a.surfaceFt + " / " + b.surfaceFt + " ft at " + ax + "," + x + "," + y);
    }
    assert.ok(pairs > 10, "level pairs checked: " + pairs);
    for (let i = 0; i < 10; i++) {
        host.calls = 0;
        const r = auth.step();
        assert.strictEqual(r.work, 0, "settled step work");
        assert.strictEqual(host.calls, 0, "settled step probes the host");
        assert.strictEqual(r.records.length, 0, "settled step records");
        assert.strictEqual(r.queued, 0, "settled queue");
    }
    host.calls = 0;
    auth.wake(R(1, 0, 5, 5, 1));     // a change far from any fluid
    assert.strictEqual(auth.queued(), 0, "a dry change queues nothing");
    assert.strictEqual(auth.step().work, 0, "and costs nothing");
    return "settled in " + steps + " steps; 10 further steps cost 0 work, 0 probes";
};

CHECKS.no_unit_constants = T => {
    const U = T.units();
    // (a) No unit, density, gallon or depth-quantum literal in the authority's sources.
    const forbidden = new Set([U.CELL_FT, U.CP_PER_LB, U.STRATUM_FT3, U.WATER_CP_PER_FT3, U.WATER_CP_PER_STRATUM,
        U.WATER_CP_PER_Z_CELL, U.CP_PER_GALLON, 62.4, Math.floor(U.WATER_CP_PER_Z_CELL / 7), Math.ceil(U.WATER_CP_PER_Z_CELL / 7), LAVA_CP_PER_FT3]);
    for (const file of [OPEN_JS, INDEX_JS]) {
        const src = T.source(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").replace(/"(?:[^"\\]|\\.)*"/g, "\"\"");
        const hits = (src.match(/\b\d[\d_]*(?:\.\d+)?(?:e\d+)?\b/g) || []).map(Number).filter(n => forbidden.has(n));
        assert.deepStrictEqual(hits, [], path.basename(file) + " holds unit literals");
    }
    // (b) Capacity follows sim/units.js: a different water density changes it.
    const unitsSrc = fs.readFileSync(UNITS_JS, "utf8");
    const alt = unitsSrc.replace("const WATER_CP_PER_FT3 = 6240;", "const WATER_CP_PER_FT3 = 6250;");
    assert.notStrictEqual(alt, unitsSrc, "units.js density line found");
    const T2 = T.withOverrides({ [path.resolve(UNITS_JS)]: alt });
    const host = makeHost({ size: 2 });
    host.set(0, 0, 0, 0, 0, FULL);
    const a2 = authority(T2, host);
    assert.strictEqual(a2.capacityAt(R(0, 0, 0, 0, 0), "water"), 5 * 50 * 6250, "capacity from the units table");
    assert.strictEqual(a2.capacityAt(R(0, 0, 0, 0, 0), "lava"), 5 * 50 * LAVA_CP_PER_FT3, "lava capacity from the host density");
    // (c) Lava has no built-in density.
    const bare = T.index().createWaterAuthority({ host });
    assert.throws(() => bare.registerGeologicalSources([{ id: "v", cls: "lava", cp: 1 }]), e => e.code === "E_CLASS", "no default lava density");
    assert.throws(() => T.index().createWaterAuthority({ host, densities: { water: 6000 } }), e => e.code === "E_CALIBRATION", "water density is not the host's");
    return "no unit literals; capacity follows units.js (6250 -> " + 5 * 50 * 6250 + " cp) and host lava density";
};

CHECKS.serialize_roundtrip_exact = T => {
    const U = T.units();
    const host = basinWorld();
    const N = 90, BUDGET = 5;
    const fresh = () => {
        const a = authority(T, host);
        a.registerGeologicalSources([{ id: "w", cls: "water", cp: 8000000 }, { id: "l", cls: "lava", cp: 2000000 }]);
        a.release("w", R(0, 0, 0, 1, 0), 2500000);
        a.release("l", R(1, 0, 5, 4, 0), 900000);
        return a;
    };
    // The same commands at the same global steps in every run.
    const run = (a, from, to, log) => {
        for (let i = from; i < to; i++) {
            if (i === 20) log.push(["release", a.release("w", R(1, 0, 0, 1, 0), 700000)]);
            const r = a.step(BUDGET);
            log.push([r.work, r.probes, r.queued, r.records]);
        }
    };
    const ref = fresh(), refLog = [];
    run(ref, 0, N, refLog);
    const refEnd = JSON.stringify(ref.serialize());
    let cursors = 0;
    for (const k of [1, 7, 23, 41, 66]) {
        const a = fresh(), log = [];
        run(a, 0, k, log);
        const text = JSON.stringify(a.serialize());
        const saved = JSON.parse(text);
        if (saved.open.cursor) cursors++;
        const b = authority(T, host);
        b.deserialize(saved);
        assert.strictEqual(JSON.stringify(b.serialize()), text, "save(load(save)) is identical at k=" + k);
        run(b, k, N, log);
        assert.deepStrictEqual(log, refLog, "run(" + N + ") vs load(save(run(" + k + "))) then run(" + (N - k) + ")");
        assert.strictEqual(JSON.stringify(b.serialize()), refEnd, "final state at k=" + k);
    }
    assert.ok(cursors > 0, "at least one save point falls inside an unfinished visit");
    const wrong = authority(T, host, { densities: { lava: LAVA_CP_PER_FT3 + 1 } });
    assert.throws(() => wrong.deserialize(JSON.parse(refEnd)), e => e.code === "E_CALIBRATION", "a save under another density table is refused");
    return N + "-step continuation exact from 5 save points (" + cursors + " mid-visit)";
};

// --- Mutants (each must turn its named check red by assertion) -------------------------
const MUTANTS = [
    { name: "drop_cp", check: "cp_exact_conservation", file: OPEN_JS,
        edits: [["        credit(to, cls, cp);\n", "        credit(to, cls, cp > 1 ? cp - 1 : cp);\n"]] },
    { name: "no_wrap", check: "wrap_seam_flow", file: OPEN_JS,
        edits: [["        if (x < 0) { x += world.size;", "        if (x < 0 || x >= world.size || y < 0 || y >= world.size) return c;\n        if (x < 0) { x += world.size;"]] },
    { name: "free_probe", check: "budget_bound", file: OPEN_JS,
        edits: [["                work++;\n                const nm = probe(n); probes++;", "                const nm = probe(n); probes++;"]] },
    { name: "depth_quantum", check: "cavity_height_depth", file: OPEN_JS,
        edits: [["    const v = Math.floor((2 * DEPTH_VIEW_MAX * cp + whole) / (2 * whole));", "    const v = Math.round(cp / Math.floor(units.WATER_CP_PER_Z_CELL / DEPTH_VIEW_MAX));"]] },
    { name: "overwrite_type", check: "unlike_fluids_kept", file: OPEN_JS,
        edits: [["        return !cell || cell.cls === cls;", "        return true;"],
            ["        if (cell.cls !== cls) fail(\"E_MIX\", cls + \" cannot enter a cell holding \" + cell.cls);", "        cell.cls = cls;"]] },
    // Provocations for the checks the brief names no mutant for.
    { name: "seam_key_directional", check: "seam_once", file: OPEN_JS,
        edits: [["rec.seam = canonicalSeamKey(fk, tk);", "rec.seam = fk + \"|\" + tk;"]] },
    { name: "mint_without_source", check: "no_source_no_mint", file: OPEN_JS,
        edits: [["        if (!src) fail(\"E_NO_SOURCE\",", "        if (!src) { credit(requireRef(ref, \"release\"), \"water\", cp); S.open.water += cp; return null; }\n        if (!src) fail(\"E_NO_SOURCE\","]] },
    { name: "always_requeue", check: "quiescent_zero", file: OPEN_JS,
        edits: [["            if (cur.changed && cellAt(c)) enqueue(key);", "            if (cellAt(c)) enqueue(key);"]] },
    { name: "density_literal", check: "no_unit_constants", file: OPEN_JS,
        edits: [["    const d = { water: units.WATER_CP_PER_FT3 };", "    const d = { water: 6240 };"]] },
    { name: "cursor_not_saved", check: "serialize_roundtrip_exact", file: OPEN_JS,
        edits: [["            cursor: S.cursor ? [S.cursor.phase, S.cursor.mask, S.cursor.changed ? 1 : 0] : null,", "            cursor: null,"]] },
    { name: "export_dropped", check: "aquifer_exports_preserved", file: INDEX_JS,
        edits: [["    canonicalEdgeKey: aquifer.canonicalEdgeKey,\n", ""]] }
];

// --- Runner ----------------------------------------------------------------------------
function harness(overrides) {
    const T = loadTree(overrides);
    T.source = file => (overrides && overrides[path.resolve(file)] !== undefined ? overrides[path.resolve(file)] : fs.readFileSync(file, "utf8"));
    T.withOverrides = more => harness(Object.assign({}, overrides || {}, more));
    return T;
}

function runCheck(name, overrides) {
    try {
        const detail = CHECKS[name](harness(overrides));
        return { ok: true, detail };
    } catch (e) {
        return { ok: false, assertion: e instanceof assert.AssertionError, error: e };
    }
}

function main() {
    const argv = process.argv.slice(2);
    const only = argv.indexOf("--only") >= 0 ? argv[argv.indexOf("--only") + 1] : null;
    const names = only ? [only] : Object.keys(CHECKS);
    if (only && !CHECKS[only]) { console.error("no check " + only); process.exit(2); }
    let passed = 0, failed = 0;
    for (const name of names) {
        const t0 = Date.now(), r = runCheck(name);
        if (r.ok) { passed++; console.log("PASS " + name + " - " + r.detail + " (" + (Date.now() - t0) + " ms)"); }
        else { failed++; console.log("FAIL " + name + " - " + (r.error && r.error.message ? r.error.message.split("\n")[0] : String(r.error))); }
    }
    console.log("RESULT: " + passed + " passed, " + failed + " failed");
    let survivors = 0;
    if (!only && argv.indexOf("--checks-only") < 0) {
        for (const m of MUTANTS) {
            // Line endings normalized: a Windows clone may check the sources out with CRLF.
            let src = fs.readFileSync(m.file, "utf8").replace(/\r\n/g, "\n"), bad = null;
            for (const [from, to] of m.edits) {
                const n = src.split(from).length - 1;
                if (n !== 1) { bad = "edit target found " + n + " times: " + JSON.stringify(from.slice(0, 60)); break; }
                src = src.replace(from, () => to);
            }
            if (bad) { survivors++; console.log("INVALID " + m.name + " - " + bad); continue; }
            const r = runCheck(m.check, { [path.resolve(m.file)]: src });
            if (!r.ok && r.assertion) console.log("KILLED " + m.name + " -> " + m.check + " - " + r.error.message.split("\n")[0]);
            else { survivors++; console.log("SURVIVED " + m.name + " -> " + m.check + (r.ok ? " (check passed)" : " (failed without an assertion: " + r.error.message.split("\n")[0] + ")")); }
        }
        console.log("MUTANTS: " + (MUTANTS.length - survivors) + "/" + MUTANTS.length + " killed");
    }
    process.exit(failed || survivors ? 1 : 0);
}

main();
