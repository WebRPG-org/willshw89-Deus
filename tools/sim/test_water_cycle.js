"use strict";

/**
 * tools/sim/test_water_cycle.js
 *
 * NAT.03.03 lane-eb: water return (game/js/sim/hydrology/cycle.js, composed by
 * index.js). Headless; no RMMZ.
 *
 *   node tools/sim/test_water_cycle.js                 named checks, then the mutant sweep
 *   node tools/sim/test_water_cycle.js --checks-only   named checks only
 *   node tools/sim/test_water_cycle.js --only <check>  one check (no sweep)
 *
 * Every check loads its own copy of the modules (vm, this realm, private require
 * cache), so a mutant is a source edit of cycle.js / index.js that never touches
 * the files on disk. A mutant counts as killed only when its named check fails by
 * assertion. Exit 1 on any failed check or surviving mutant.
 *
 * The surface provider here is a test fixture: a set of sky-exposed receiver
 * cells, each with a capacity and the water standing on it. Binding the provider
 * to the open-fluid store is lane-ec.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.join(__dirname, "..", "..");
const HYD = path.join(ROOT, "game", "js", "sim", "hydrology");
const CYCLE_JS = path.join(HYD, "cycle.js");
const INDEX_JS = path.join(HYD, "index.js");
const OPEN_JS = path.join(HYD, "open.js");
const UNITS_JS = path.join(ROOT, "game", "js", "sim", "units.js");
const DATA_JSON = path.join(ROOT, "game", "data", "sim", "hydrology.json");

// Test fixture, not game data: molten-rock density in cp/ft3, as in test_water_open_cp.js.
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
        cycle: () => load(CYCLE_JS),
        open: () => load(OPEN_JS),
        units: () => load(UNITS_JS)
    };
}

// --- Fixtures -----------------------------------------------------------------------
// Host: cells are solid (mask 0) unless opened. calls counts every openMask probe.
function makeHost(spec) {
    const masks = new Map();
    const host = {
        size: spec.size, areasX: spec.areasX || 1, areasY: spec.areasY || 1,
        zMin: spec.zMin === undefined ? 0 : spec.zMin, zMax: spec.zMax === undefined ? 0 : spec.zMax,
        calls: 0,
        openMask(ax, ay, x, y, z) { host.calls++; return masks.get(ax + "," + ay + "," + x + "," + y + "," + z) || 0; },
        set(ax, ay, x, y, z, mask) { masks.set(ax + "," + ay + "," + x + "," + y + "," + z, mask); }
    };
    return host;
}
const FULL = 31;
const R = (ax, ay, x, y, z) => ({ ax, ay, x, y, z });
const keyOf = r => r.ax + "," + r.ay + "," + r.x + "," + r.y + "," + r.z;

// Surface provider: entries [ax, ay, x, y, z, cap, water], listed per area in the
// order given. calls counts every provider call.
function makeSurface(entries) {
    const lists = new Map(), cells = new Map(), order = [];
    for (const [ax, ay, x, y, z, cap, water] of entries) {
        const ak = ax + "," + ay;
        if (!lists.has(ak)) lists.set(ak, []);
        lists.get(ak).push({ x, y, z });
        const k = keyOf(R(ax, ay, x, y, z));
        cells.set(k, { cap, water });
        order.push(k);
    }
    const cell = ref => {
        const c = cells.get(keyOf(ref));
        assert.ok(c, "the cycle asked about a cell that is not a receiver: " + keyOf(ref));
        return c;
    };
    const s = {
        calls: 0,
        receivers(ax, ay) { s.calls++; return lists.get(ax + "," + ay) || []; },
        room(ref) { s.calls++; const c = cell(ref); return c.cap - c.water; },
        credit(ref, cp) { s.calls++; const c = cell(ref); const got = Math.min(cp, c.cap - c.water); c.water += got; return got; },
        waterAt(ref) { s.calls++; return cell(ref).water; },
        debit(ref, cp) { s.calls++; const c = cell(ref); const got = Math.min(cp, c.water); c.water -= got; return got; },
        // Test-side reads and edits (not provider calls).
        keys: () => order.slice(),
        water: k => cells.get(k).water,
        setCap(k, cap) { cells.get(k).cap = cap; },
        total() { let t = 0; for (const c of cells.values()) t += c.water; return t; },
        snapshot: () => order.map(k => [cells.get(k).cap, cells.get(k).water]),
        restore(snap) { order.forEach((k, i) => { cells.get(k).cap = snap[i][0]; cells.get(k).water = snap[i][1]; }); }
    };
    return s;
}

function authority(T, host, surface, waterReturn, extra) {
    const opts = Object.assign({ host, densities: { lava: LAVA_CP_PER_FT3 } }, extra || {});
    if (surface) opts.surface = surface;
    if (waterReturn) opts.waterReturn = waterReturn;
    return T.index().createWaterAuthority(opts);
}

function waterHeld(auth) {
    const w = auth.totals().water;
    return w.open + w.sources + w.return;
}

const rains = records => records.filter(r => r.cause === "rain");

// --- Named checks -------------------------------------------------------------------
const CHECKS = {};

CHECKS.exit_rains_remote_nonlake = T => {
    const U = T.units();
    const host = makeHost({ size: 4, areasX: 3, areasY: 3 });
    const LAKE = R(0, 0, 1, 1, 0), MID = R(1, 1, 2, 2, 0), FAR_A = R(2, 2, 0, 3, 0), FAR_B = R(2, 2, 3, 0, 0);
    const surface = makeSurface([
        [0, 0, 1, 1, 0, U.WATER_CP_PER_Z_CELL, 2 * U.WATER_CP_PER_STRATUM],   // the only lake
        [1, 1, 2, 2, 0, U.WATER_CP_PER_STRATUM, 0],                            // dry ground
        [2, 2, 0, 3, 0, U.WATER_CP_PER_STRATUM, 0],                            // dry ground, the far corner area
        [2, 2, 3, 0, 0, U.WATER_CP_PER_STRATUM, 0]
    ]);
    const auth = authority(T, host, surface);
    // The caller debits its own accounts: water leaving through a bottom outlet
    // of area (0,0), and a water holding that could not be placed.
    const outside = { "0,0,3,3,0": 6147, "holding:pool-1": 3000 };
    const start = surface.total() + outside["0,0,3,3,0"] + outside["holding:pool-1"];
    const exitRec = auth.credit(6147, "exit", { cls: "water", key: "0,0,3,3,0" });
    outside["0,0,3,3,0"] -= 6147;
    const holdRec = auth.credit(3000, "exit", { cls: "water", key: "holding:pool-1" });
    outside["holding:pool-1"] -= 3000;
    assert.deepStrictEqual([exitRec.cause, exitRec.from, exitRec.to, exitRec.cls], ["exit", "0,0,3,3,0", "return", "water"], "fluid -> return record");
    assert.deepStrictEqual([holdRec.cause, holdRec.from, holdRec.to], ["exit", "holding:pool-1", "return"], "holding -> return record");
    assert.strictEqual(auth.totals().water.return, 9147, "both exits counted in the return inventory");
    const all = [];
    for (let i = 0; i < 140 && auth.totals().water.return > 0; i++) {
        const r = auth.step();
        for (const rec of r.records) all.push(rec);
        const outsideLeft = outside["0,0,3,3,0"] + outside["holding:pool-1"];
        assert.strictEqual(surface.total() + auth.totals().water.return + outsideLeft, start, "water conserved, step " + i);
    }
    assert.strictEqual(auth.totals().water.return, 0, "all return water rained back");
    const far = surface.water(keyOf(FAR_A));
    assert.ok(far > 0, "the dry receiver in the far area (2,2) got rain: " + far + " cp");
    assert.ok(surface.water(keyOf(FAR_B)) > 0 && surface.water(keyOf(MID)) > 0, "every dry receiver got rain");
    assert.ok(rains(all).some(r => r.to === keyOf(FAR_A) && r.from === "return" && r.cls === "water"), "a rain record return -> " + keyOf(FAR_A));
    assert.ok(surface.water(keyOf(LAKE)) > 2 * U.WATER_CP_PER_STRATUM, "the lake is one receiver among the others");
    const rained = rains(all).reduce((s, r) => s + r.cp, 0);
    assert.strictEqual(rained, 9147, "rain records carry every credited cp");
    return "9147 cp from an outlet and a holding in area (0,0) rained on 4 receivers; far dry receiver got " + far + " cp";
};

CHECKS.full_receivers_retain = T => {
    const host = makeHost({ size: 4, areasX: 2 });
    const entries = [];
    for (let x = 0; x < 4; x++) entries.push([0, 0, x, 0, 0, 1000, 1000]);
    for (let x = 0; x < 2; x++) entries.push([1, 0, x, 3, 0, 1000, 1000]);
    const surface = makeSurface(entries);
    const auth = authority(T, host, surface, { evaporationCpPerReceiver: 0 });
    const before = surface.snapshot();
    auth.credit(50000, "exit", { cls: "water", key: "holding:h1" });
    const delay = auth.returnStatus().tuning.delayTicks;
    for (let i = 0; i < delay + 30; i++) {
        surface.calls = 0;
        const r = auth.step();
        assert.strictEqual(rains(r.records).length, 0, "no rain into full receivers, step " + i);
        assert.strictEqual(auth.totals().water.return, 50000, "the return inventory keeps every cp, step " + i);
        assert.ok(surface.calls <= 2 + entries.length, "one lap per step at most: " + surface.calls + " provider calls");
    }
    assert.deepStrictEqual(surface.snapshot(), before, "full receivers unchanged");
    assert.strictEqual(auth.returnStatus().ready, 50000, "all 50000 cp due and waiting");
    // Room opens on one receiver: exactly that room rains, the rest stays counted.
    surface.setCap("1,0,1,3,0", 1700);
    const got = [];
    for (let i = 0; i < 3; i++) for (const rec of auth.step().records) got.push(rec);
    assert.strictEqual(surface.water("1,0,1,3,0"), 1700, "the receiver filled to its new room");
    assert.strictEqual(rains(got).reduce((s, r) => s + r.cp, 0), 700, "700 cp rained");
    assert.strictEqual(auth.totals().water.return, 49300, "49300 cp still counted");
    return delay + 30 + " steps against 6 full receivers kept 50000 cp; 700 cp of room took 700 cp";
};

CHECKS.lava_never_returns = T => {
    const U = T.units();
    const host = makeHost({ size: 4 });
    host.set(0, 0, 1, 1, 0, FULL);
    const surface = makeSurface([[0, 0, 2, 2, 0, U.WATER_CP_PER_STRATUM, 4000], [0, 0, 3, 3, 0, U.WATER_CP_PER_STRATUM, 0]]);
    const auth = authority(T, host, surface, { evaporationPeriodTicks: 20 });
    auth.registerGeologicalSources([{ id: "magma", cls: "lava", cp: 9000000 }]);
    const lavaCp = 2 * U.STRATUM_FT3 * LAVA_CP_PER_FT3;
    auth.release("magma", R(0, 0, 1, 1, 0), lavaCp);
    const t0 = JSON.stringify(auth.totals());
    for (const [cause, key] of [["exit", "holding:magma-hold"], ["exit", "0,0,1,1,0"], ["steam", "contact:0,0,1,1,0"]]) {
        assert.throws(() => auth.credit(1000, cause, { cls: "lava", key }), e => e.code === "E_CLASS", "lava credit refused (" + cause + " from " + key + ")");
    }
    assert.throws(() => auth.credit(1000, "exit", { key: "holding:untyped" }), e => e.code === "E_CLASS", "an untyped holding is refused");
    assert.strictEqual(JSON.stringify(auth.totals()), t0, "refused credits change nothing");
    assert.strictEqual(auth.totals().water.return, 0, "no return water from lava");
    assert.strictEqual(auth.credit(500, "exit", { cls: "water", key: "holding:w" }).cp, 500, "water is still accepted");
    const all = [];
    for (let i = 0; i < 400; i++) for (const rec of auth.step().records) all.push(rec);
    assert.ok(all.some(r => r.cause === "evaporation") && all.some(r => r.cause === "rain"), "the cycle ran");
    assert.ok(all.every(r => r.cls === "water" || (r.from !== "return" && r.to !== "return")), "no lava record touches the return inventory");
    assert.ok(all.filter(r => r.from === "return" || r.to === "return").every(r => r.cls === "water"), "return records are water");
    assert.strictEqual(auth.fluidAt(R(0, 0, 1, 1, 0)).cp, lavaCp, "the lava keeps its cp");
    assert.strictEqual(auth.totals().lava.open + auth.totals().lava.sources, 9000000, "lava totals exact");
    return "lava from a holding, a cell and steam refused (E_CLASS); 400 steps of evaporation and rain left lava " + lavaCp + " cp";
};

CHECKS.evaporation_save_load_cycle = T => {
    const U = T.units();
    const host = makeHost({ size: 4, areasX: 2, areasY: 2, zMin: -1, zMax: 0 });
    for (let ax = 0; ax < 2; ax++) for (let x = 0; x < 4; x++) host.set(ax, 0, x, 0, 0, FULL);
    host.set(1, 0, 2, 0, -1, FULL);
    const spec = [
        [0, 0, 0, 2, 0, U.WATER_CP_PER_Z_CELL, 900000], [0, 0, 3, 3, 0, U.WATER_CP_PER_STRATUM, 0],
        [1, 0, 1, 3, 0, U.WATER_CP_PER_STRATUM, 0],
        [1, 1, 2, 2, 0, U.WATER_CP_PER_Z_CELL, 600000], [1, 1, 0, 1, 0, U.WATER_CP_PER_STRATUM, 0], [1, 1, 3, 3, 0, U.WATER_CP_PER_STRATUM, 0]
    ];
    const TUNE = { evaporationPeriodTicks: 60, evaporationCpPerReceiver: 2000 };
    const N = 420, BUDGET = 6;
    const fresh = () => {
        const surface = makeSurface(spec);
        const a = authority(T, host, surface, TUNE);
        a.registerGeologicalSources([{ id: "w", cls: "water", cp: 3000000 }]);
        a.release("w", R(0, 0, 0, 0, 0), 1200000);
        return { a, surface };
    };
    const held = s => waterHeld(s.a) + s.surface.total() + s.outside;
    const run = (s, from, to, log) => {
        for (let i = from; i < to; i++) {
            if (i === 15) { log.push(["credit", s.a.credit(7000, "exit", { cls: "water", key: "holding:h" })]); s.outside -= 7000; }
            if (i === 130) { log.push(["credit", s.a.credit(2500, "steam", { cls: "water", key: "contact:t" })]); s.outside -= 2500; }
            const r = s.a.step(BUDGET);
            log.push([r.work, r.probes, r.queued, r.records, s.a.totals(), s.surface.total()]);
            assert.strictEqual(held(s), s.start, "water conserved at step " + i);
        }
    };
    const begin = s => { s.outside = 9500; s.start = held(s); return s; };
    const ref = begin(fresh()), refLog = [];
    run(ref, 0, N, refLog);
    const refEnd = JSON.stringify(ref.a.serialize());
    const recs = refLog.filter(e => typeof e[0] === "number").flatMap(e => e[3]);
    assert.ok(recs.some(r => r.cause === "evaporation") && recs.some(r => r.cause === "rain"), "evaporation and rain both ran");
    let midPass = 0, pending = 0;
    for (const k of [37, 63, 124, 163, 250, 303]) {   // 63, 124 and 303 fall inside a pass
        const s = begin(fresh()), log = [];
        run(s, 0, k, log);
        const text = JSON.stringify(s.a.serialize());
        const saved = JSON.parse(text);
        if (saved.cycle.evap[1] === 1) midPass++;
        if (saved.cycle.total > 0) pending++;
        const snap = s.surface.snapshot();
        const surface = makeSurface(spec);
        surface.restore(snap);
        const b = { a: authority(T, host, surface, TUNE), surface, outside: s.outside, start: s.start };
        b.a.deserialize(saved);
        assert.strictEqual(JSON.stringify(b.a.serialize()), text, "save(load(save)) is identical at k=" + k);
        run(b, k, N, log);
        assert.deepStrictEqual(log, refLog, "run(" + N + ") vs load(save(run(" + k + "))) then run(" + (N - k) + ")");
        assert.strictEqual(JSON.stringify(b.a.serialize()), refEnd, "final state at k=" + k);
    }
    assert.ok(midPass > 0, "a save point falls inside an evaporation pass");
    assert.ok(pending > 0, "a save point holds return water");
    // A tampered return total is refused and changes nothing.
    const bad = JSON.parse(refEnd);
    bad.cycle.total += 1;
    const keep = JSON.stringify(ref.a.serialize());
    assert.throws(() => ref.a.deserialize(bad), e => e.code === "E_SAVE_TOTALS", "a minted return total is refused");
    assert.strictEqual(JSON.stringify(ref.a.serialize()), keep, "the refused load changed nothing");
    const other = authority(T, host, makeSurface(spec), { evaporationPeriodTicks: 61, evaporationCpPerReceiver: 2000 });
    assert.throws(() => other.deserialize(JSON.parse(refEnd)), e => e.code === "E_CALIBRATION", "a save under other tuning is refused");
    return N + "-step evaporation/rain/flow continuation exact from 6 save points (" + midPass + " mid-pass, " + pending + " with return water)";
};

CHECKS.rotation_deterministic = T => {
    // Two receivers in some areas, none in others; one full receiver.
    const entries = [
        [0, 0, 1, 0, 0, 100000, 0], [0, 0, 2, 3, 0, 100000, 0],
        [2, 0, 0, 0, 0, 0, 0],                                   // full (no room)
        [0, 1, 3, 1, 0, 100000, 0],
        [2, 1, 1, 1, 0, 100000, 0], [2, 1, 2, 2, 0, 100000, 0],
        [1, 2, 0, 3, 0, 100000, 0]
    ];
    const order = entries.map(e => keyOf(R(e[0], e[1], e[2], e[3], e[4])));
    const runOnce = permute => {
        const host = makeHost({ size: 4, areasX: 3, areasY: 3 });
        const surface = makeSurface(entries);
        const auth = authority(T, host, surface, { evaporationCpPerReceiver: 0 });
        const per = auth.returnStatus().tuning.rainCpPerVisit;
        const delay = auth.returnStatus().tuning.delayTicks;
        const batch = (parts) => { for (const [cp, key] of permute ? parts.slice().reverse() : parts) auth.credit(cp, "exit", { cls: "water", key }); };
        const rainLog = [];
        const steps = n => { for (let i = 0; i < n; i++) for (const r of rains(auth.step().records)) rainLog.push([r.to, r.cp, r.row]); };
        batch([[2 * per, "holding:a"], [per + 100, "holding:b"]]);   // 3 * per + 100
        steps(delay + 1);
        const first = rainLog.length;
        batch([[2 * per, "holding:c"]]);
        steps(delay + 1);
        const second = rainLog.length;
        batch([[5 * per, "holding:d"], [per, "holding:e"]]);         // more than one lap
        steps(delay + 3);
        return { rainLog, first, second, per };
    };
    const a = runOnce(false), b = runOnce(true);
    const P = a.per;
    const open = order.filter((k, i) => entries[i][5] > 0);   // receivers with room, in rotation order
    const expected = [
        // batch 1 from the start of the rotation
        [open[0], P], [open[1], P], [open[2], P], [open[3], 100],
        // batch 2 continues after the last receiver visited
        [open[4], P], [open[5], P],
        // batch 3 wraps past the last area back to the first
        [open[0], P], [open[1], P], [open[2], P], [open[3], P], [open[4], P], [open[5], P]
    ];
    assert.deepStrictEqual(a.rainLog.map(e => [e[0], e[1]]), expected, "rain follows the rotation across areas, skipping the full receiver");
    assert.deepStrictEqual([a.first, a.second], [4, 6], "batch boundaries");
    assert.deepStrictEqual(b.rainLog, a.rainLog, "credit order within a tick does not change the rain");
    assert.deepStrictEqual(runOnce(false).rainLog, a.rainLog, "a second run is identical");
    return a.rainLog.length + " rain visits in rotation order over 6 receivers in 5 areas (full receiver skipped, wraps)";
};

CHECKS.due_not_early = T => {
    const data = JSON.parse(fs.readFileSync(DATA_JSON, "utf8"));
    assert.strictEqual(data.waterReturn.delayTicks, 100, "settled delay in hydrology.json");
    const firstRain = (waterReturn, creditAtStep, maxSteps) => {
        const host = makeHost({ size: 4 });
        const surface = makeSurface([[0, 0, 0, 0, 0, 1000000, 500], [0, 0, 1, 1, 0, 1000000, 0]]);
        const auth = authority(T, host, surface, waterReturn);
        for (let i = 0; i < maxSteps; i++) {
            if (i === creditAtStep) auth.credit(4000, "exit", { cls: "water", key: "holding:h" });
            const r = auth.step();
            if (rains(r.records).length) return { i, auth };
        }
        return { i: -1, auth };
    };
    const off = { evaporationCpPerReceiver: 0 };
    assert.strictEqual(firstRain(off, 0, 300).i, 100, "credit before step 0 rains at step 100");
    assert.strictEqual(firstRain(off, 137, 400).i, 237, "credit before step 137 rains at step 237");
    assert.strictEqual(firstRain({ evaporationCpPerReceiver: 0, delayTicks: 7 }, 3, 50).i, 10, "a 7-tick delay rains 7 steps later");
    // Evaporation credited during step 10 (the first pass) is due at step 110.
    const ev = firstRain({ evaporationPeriodTicks: 10 }, -1, 300);
    assert.strictEqual(ev.i, 110, "evaporated water rains 100 steps after the pass");
    const st = firstRain(off, 0, 60).auth.returnStatus();
    assert.deepStrictEqual([st.ready, st.pending, st.nextDue], [0, 4000, 100], "status: 4000 cp pending, due at tick 100");
    return "rain first at step 100, 237, 10 (delay 7) and 110 (evaporation at step 10)";
};

CHECKS.rain_charges_budget = T => {
    const host = makeHost({ size: 12, areasX: 2, zMin: -1, zMax: 0 });
    for (let ax = 0; ax < 2; ax++) for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
        host.set(ax, 0, x, y, 0, FULL);
        if ((x + y) % 3 === 0) host.set(ax, 0, x, y, -1, FULL);
    }
    const entries = [];
    for (let i = 0; i < 40; i++) entries.push([0, 0, i % 12, Math.floor(i / 12), 0, 10, 10]);   // 40 full receivers
    for (let i = 0; i < 3; i++) entries.push([1, 0, i, 11, 0, 10000000, 0]);                   // 3 with room
    let defaultFull = false;
    for (const budget of [1, 2, 3, 7, 64, undefined]) {
        const surface = makeSurface(entries);
        const auth = authority(T, host, surface, { evaporationCpPerReceiver: 0 });
        auth.registerGeologicalSources([{ id: "w", cls: "water", cp: 1e9 }]);
        for (let y = 0; y < 12; y += 2) auth.release("w", R(0, 0, 5, y, 0), 1560000);
        auth.credit(200000, "exit", { cls: "water", key: "holding:h" });
        const cap = budget === undefined ? 512 : budget;
        let rained = 0;
        for (let i = 0; i < 260; i++) {
            host.calls = 0; surface.calls = 0;
            const r = auth.step(budget);
            const calls = host.calls + surface.calls;
            assert.ok(r.work <= cap, "work " + r.work + " exceeds budget " + cap);
            assert.ok(calls <= cap, "host + surface calls " + calls + " exceed budget " + cap + " (step " + i + ")");
            assert.strictEqual(r.probes, calls, "every host and provider call is reported");
            assert.ok(r.probes <= r.work, "every call costs work");
            if (r.work === 512) defaultFull = true;
            rained += rains(r.records).reduce((s, x) => s + x.cp, 0);
        }
        assert.strictEqual(rained + auth.totals().water.return, 200000, "rain + return = credited");
        // A rain visit needs the area list read, the room probe and the credit: 3 units.
        if (cap >= 3) assert.ok(rained > 0, "rain progresses under budget " + cap);
    }
    assert.ok(defaultFull, "the default budget is shared and spent in full");
    return "work and host + provider calls <= budget for 1, 2, 3, 7, 64 and 512 with 40 full receivers";
};

CHECKS.transfer_records_balance = T => {
    const U = T.units();
    const host = makeHost({ size: 4, areasX: 2 });
    for (let ax = 0; ax < 2; ax++) for (let x = 0; x < 4; x++) { host.set(ax, 0, x, 0, 0, FULL); host.set(ax, 0, x, 1, 0, FULL); }
    const surface = makeSurface([
        [0, 0, 0, 3, 0, U.WATER_CP_PER_Z_CELL, 400000], [0, 0, 2, 3, 0, U.WATER_CP_PER_STRATUM, 0],
        [1, 0, 1, 2, 0, U.WATER_CP_PER_STRATUM, 3000], [1, 0, 3, 3, 0, U.WATER_CP_PER_STRATUM, 0]
    ]);
    const initial = new Map(surface.keys().map(k => [k, surface.water(k)]));
    const auth = authority(T, host, surface, { evaporationPeriodTicks: 20, evaporationCpPerReceiver: 2000 });
    const recs = [];
    const take = r => { if (Array.isArray(r)) recs.push(...r); else if (r) recs.push(r); };
    take(auth.registerGeologicalSources([{ id: "w", cls: "water", cp: 2000000 }, { id: "l", cls: "lava", cp: 800000 }]));
    take(auth.release("w", R(0, 0, 0, 0, 0), 1000000));
    take(auth.release("l", R(1, 0, 3, 1, 0), 500000));
    const outside = new Map([["water|holding:h1", 0], ["water|contact:c1", 0]]);
    for (let i = 0; i < 320; i++) {
        if (i === 5) { take(auth.credit(12345, "exit", { cls: "water", key: "holding:h1" })); outside.set("water|holding:h1", -12345); }
        if (i === 60) { take(auth.credit(999, "steam", { cls: "water", key: "contact:c1" })); outside.set("water|contact:c1", -999); }
        take(auth.step(16).records);
    }
    recs.forEach((r, i) => assert.strictEqual(r.row, i + 1, "rows rise by one across open and return records"));
    const acc = new Map();
    const add = (k, v) => acc.set(k, (acc.get(k) || 0) + v);
    for (const r of recs) {
        assert.ok(Number.isSafeInteger(r.cp) && r.cp > 0, "record cp is a positive integer");
        add(r.cls + "|" + r.from, -r.cp);
        add(r.cls + "|" + r.to, r.cp);
    }
    let net = 0;
    for (const [k, v] of acc) {
        net += v;
        const [cls, account] = [k.slice(0, k.indexOf("|")), k.slice(k.indexOf("|") + 1)];
        let actual;
        if (account === "geology") actual = -(cls === "water" ? 2000000 : 800000);
        else if (account.startsWith("src:")) actual = auth.sourceRemaining(account.slice(4));
        else if (account === "return") actual = auth.totals().water.return;
        else if (outside.has(k)) actual = outside.get(k);
        else if (initial.has(account)) actual = surface.water(account) - initial.get(account);
        else {
            const p = account.split(",").map(Number);
            const f = auth.fluidAt(R(p[0], p[1], p[2], p[3], p[4]));
            actual = f && f.cls === cls ? f.cp : 0;
        }
        assert.strictEqual(v, actual, "records for " + k + " sum to " + v + ", the account changed by " + actual);
    }
    assert.strictEqual(net, 0, "records move cp, never make or lose it");
    const causes = new Set(recs.map(r => r.cause));
    for (const c of ["register", "release", "equalize", "exit", "steam", "evaporation", "rain"]) assert.ok(causes.has(c), "the scenario produced a '" + c + "' record");
    return recs.length + " records over " + acc.size + " accounts balance; rows 1.." + recs.length;
};

// Guard for an authority created without the new options (brief, REQUIRED CHANGE 1).
CHECKS.no_surface_is_base = T => {
    const U = T.units();
    const host = makeHost({ size: 4, areasX: 2 });
    for (let ax = 0; ax < 2; ax++) for (let x = 0; x < 4; x++) host.set(ax, 0, x, 0, 0, FULL);
    const BASE_METHODS = ["schema", "classes", "registerGeologicalSources", "release", "step", "wake", "fluidAt", "depthView",
        "typeView", "capacityAt", "totals", "sourceRemaining", "queued", "serialize", "deserialize"];
    const base = authority(T, host, null);
    assert.deepStrictEqual(Object.keys(base), BASE_METHODS, "the checkpoint authority's members");
    const store = T.open().createOpenFluid({ host, densities: { lava: LAVA_CP_PER_FT3 } });
    const drive = (target, register, step) => {
        const log = [register([{ id: "w", cls: "water", cp: 9000000 }])];
        log.push(target.release("w", R(0, 0, 0, 0, 0), U.WATER_CP_PER_Z_CELL));
        for (let i = 0; i < 40; i++) { const r = step(5); log.push([r.work, r.probes, r.queued, r.records]); }
        return log;
    };
    const viaAuthority = drive(base, m => base.registerGeologicalSources(m), b => base.step(b));
    const viaStore = drive(store, m => store.registerSources(m), b => store.step(b));
    assert.deepStrictEqual(viaAuthority, viaStore, "the authority without a surface steps exactly as the open store");
    assert.deepStrictEqual(Object.keys(base.totals().water), ["open", "sources"], "totals keep their base shape");
    assert.deepStrictEqual(Object.keys(base.serialize()), ["schema", "open"], "the save keeps its base shape");
    assert.strictEqual(JSON.stringify(base.serialize().open), JSON.stringify(store.serialize()), "the save payload is the store's");
    assert.throws(() => authority(T, host, null, { delayTicks: 7 }), e => e.code === "E_HOST", "return tuning without a surface is refused");
    // With a surface, no return water and no evaporation, open flow is unchanged too.
    const quiet = authority(T, host, makeSurface([[1, 0, 3, 3, 0, 1000, 0]]), { evaporationCpPerReceiver: 0 });
    const viaQuiet = drive(quiet, m => quiet.registerGeologicalSources(m), b => quiet.step(b));
    assert.deepStrictEqual(viaQuiet, viaStore, "an idle return cycle takes no work and no rows from open flow");
    const withCycle = quiet.serialize();
    assert.throws(() => base.deserialize(withCycle), e => e.code === "E_SAVE", "a save holding a return payload is not loaded without a surface");
    return "members, steps, records, totals and save of the checkpoint unchanged without a surface";
};

// --- Mutants (each must turn its named check red by assertion) -------------------------
const MUTANTS = [
    { name: "lakes_only", check: "exit_rains_remote_nonlake", file: CYCLE_JS,
        edits: [["                const give = Math.min(room, tuning.rainCpPerVisit, C.ready);",
            "                const give = surface.waterAt(ref) > 0 ? Math.min(room, tuning.rainCpPerVisit, C.ready) : 0;"]] },
    { name: "drop_on_full", check: "full_receivers_retain", file: CYCLE_JS,
        edits: [["                const give = Math.min(room, tuning.rainCpPerVisit, C.ready);", "                const give = Math.min(tuning.rainCpPerVisit, C.ready);"],
            ["                    takeReady(got);", "                    takeReady(give);"]] },
    { name: "lava_as_water", check: "lava_never_returns", file: CYCLE_JS,
        edits: [["        if (f.cls !== WATER) fail(\"E_CLASS\",", "        if (false) fail(\"E_CLASS\","]] },
    { name: "free_probe", check: "rain_charges_budget", file: CYCLE_JS,
        edits: [["                work++; probes++;\n                const room =", "                probes++;\n                const room ="]] },
    // Provocations for the named checks no brief mutant names.
    { name: "rain_cursor_not_saved", check: "evaporation_save_load_cycle", file: CYCLE_JS,
        edits: [["            rain: [C.rain.p, C.rain.i],", "            rain: [0, 0],"]] },
    { name: "cursor_reset", check: "rotation_deterministic", file: CYCLE_JS,
        edits: [["            const startI = C.rain.i;", "            C.rain.p = 0; C.rain.i = 0;\n            const startI = C.rain.i;"]] },
    { name: "due_one_early", check: "due_not_early", file: CYCLE_JS,
        edits: [["        const at = C.tick + tuning.delayTicks;", "        const at = C.tick + tuning.delayTicks - 1;"]] },
    { name: "evaporation_unrecorded", check: "transfer_records_balance", file: CYCLE_JS,
        edits: [["                    out.push(stamp({ row: 0, cls: WATER, cp: got, cause: \"evaporation\", from: cellKey(ref), to: RETURN }));\n", ""]] },
    { name: "credit_without_surface", check: "no_surface_is_base", file: INDEX_JS,
        edits: [["        queued: () => store.queued(),\n        serialize: () => ({ schema: WATER_AUTHORITY_SCHEMA, open: store.serialize() }),",
            "        queued: () => store.queued(),\n        credit: () => null,\n        serialize: () => ({ schema: WATER_AUTHORITY_SCHEMA, open: store.serialize() }),"]] }
];

// --- Runner ----------------------------------------------------------------------------
function runCheck(name, overrides) {
    try {
        const detail = CHECKS[name](loadTree(overrides));
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
