#!/usr/bin/env node
"use strict";

// WG.65.04 world-wide spawn density (game/js/sim/spawner/global_density.js). Headless: no RMMZ boot, no terrain.
// Every run also runs the mutation sweep. Mutants change the source in an isolated VM only; no file is rewritten.
// Usage: node tools/sim/test_global_spawn_density.js [--print-golden]
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const modPath = path.join(root, "game/js/sim/spawner/global_density.js");
const indexPath = path.join(root, "game/js/sim/spawner/index.js");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "game/data/UF_WorldCatalog.json"), "utf8"));

// The full DEC-013 world: 32 levels (DEUS_World Z_RANGES.default), on the 100 x 100 area map the brief asks for.
const BIG = { areasX: 100, areasY: 100, zMin: -16, zMax: 15, starts: [{ ax: 10, ay: 10, z: 0 }, { ax: 50, ay: 60, z: -8 }, { ax: 90, ay: 20, z: 5 }] };
const SMALL = { areasX: 24, areasY: 24, zMin: -4, zMax: 4, starts: [{ ax: 5, ay: 5, z: 0 }, { ax: 18, ay: 12, z: -2 }] };
const SEEDS = [1, 20260919, 0xFFFFFFFF];

// Pinned from this module at tip (WG.65.04). A change here means every world's density changed: say why in the report.
const GOLDEN = {
    1: { checksum: 4120152335, prey: 9632458, monsters: 969411 },
    20260919: { checksum: 2449104381, prey: 10044715, monsters: 1010212 },
    4294967295: { checksum: 4194788654, prey: 10039248, monsters: 1008693 }
};
// Seed 20260919 on BIG. (10, 10, 0) and (50, 60, -8) and (90, 20, 5) are starts (T0, no monsters).
const GOLDEN_CELLS = [
    { ax: 10, ay: 10, z: 0, prey: 119, monsters: 0, tier: 0, savagery: "tame" },
    { ax: 11, ay: 10, z: 0, prey: 115, monsters: 2, tier: 1, savagery: "wild" },
    { ax: 0, ay: 0, z: -16, prey: 36, monsters: 6, tier: 4, savagery: "wild" },
    { ax: 99, ay: 99, z: 15, prey: 7, monsters: 0, tier: 4, savagery: "tame" },
    { ax: 50, ay: 60, z: -8, prey: 28, monsters: 0, tier: 0, savagery: "wild" },
    { ax: 37, ay: 81, z: -1, prey: 45, monsters: 3, tier: 4, savagery: "wild" },
    { ax: 64, ay: 3, z: 2, prey: 8, monsters: 0, tier: 4, savagery: "tame" },
    { ax: 90, ay: 20, z: 5, prey: 17, monsters: 0, tier: 0, savagery: "wild" }
];

// Independent oracle: murmur3 fmix32 in BigInt, and the count formula from the module header, written out again.
function fmix32Big(x) {
    const M = 0xFFFFFFFFn;
    let h = BigInt(x >>> 0);
    h ^= h >> 16n; h = (h * 0x85EBCA6Bn) & M;
    h ^= h >> 13n; h = (h * 0xC2B2AE35n) & M;
    h ^= h >> 16n;
    return Number(h);
}
function hashBig(seed, salt, a, b, c) {
    let h = fmix32Big((seed ^ 0x9E3779B9) >>> 0);
    for (const v of [salt, a, b, c]) h = fmix32Big((h ^ (v >>> 0)) >>> 0);
    return h;
}

function sameArray(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}
function codeOf(fn) {
    try { fn(); } catch (e) { return e.code || e.name; }
    return "no throw";
}
function levels(cat) {
    return cat.ecology.levels;
}

const checks = {
    // Budgets and savagery scales are the catalog's; levels the catalog does not list use the nearest listed level.
    config_from_catalog(env) {
        const { g, cfg } = env;
        const lv = levels(catalog);
        for (const k of Object.keys(lv)) {
            assert.deepEqual({ ...g.budgetFor(cfg, Number(k)) }, { creatureCap: lv[k].creatureCap, monsterCap: lv[k].monsterCap }, "z " + k);
        }
        for (const s of ["tame", "wild", "primeval"]) assert.equal(cfg.savageryScale[s], catalog.wildlife.savageryScale[s], s);
        const zs = Object.keys(lv).map(Number);
        const lo = Math.min(...zs), hi = Math.max(...zs);
        assert.deepEqual({ ...g.budgetFor(cfg, -16) }, { ...g.budgetFor(cfg, lo) }, "deeper than the deepest row");
        assert.deepEqual({ ...g.budgetFor(cfg, 15) }, { ...g.budgetFor(cfg, hi) }, "higher than the highest row");
        assert.equal(codeOf(() => g.configFromCatalog({ wildlife: catalog.wildlife })), "E_CONFIG");
        assert.equal(codeOf(() => g.configFromCatalog({ ecology: { levels: { "0": { creatureCap: 5, monsterCap: 9 } } }, wildlife: catalog.wildlife })), "E_CONFIG");
    },

    mix32_reference(env) {
        for (const x of [0, 1, 2, 0x9E3779B9, 0x7FFFFFFF, 0xFFFFFFFF, 123456789]) assert.equal(env.g.mix32(x), fmix32Big(x), "mix32(" + x + ")");
        assert.equal(env.g.mix32(1), 0x514E28B7, "published fmix32(1)");
    },

    // The count formula against the oracle, with the two stand-in fields injected so only the formula is tested.
    counts_match_oracle(env) {
        const { g, cfg } = env;
        const world = { ...SMALL, tierAt: (ax, ay, z) => (ax + 2 * ay + (z & 7)) % 5, savageryAt: (ax, ay) => ["tame", "wild", "primeval"][(ax * 7 + ay) % 3] };
        const SALT_FILL = 0x46494C4C, SALT_MONSTER = 0x4D4F4E53;
        const tierScale = [0, 0.25, 0.5, 0.75, 1];
        let n = 0;
        for (const seed of SEEDS) {
            for (let z = SMALL.zMin; z <= SMALL.zMax; z += 2) {
                for (let ay = 0; ay < SMALL.areasY; ay += 3) {
                    for (let ax = 0; ax < SMALL.areasX; ax += 5) {
                        const d = g.densityAt(seed, world, cfg, ax, ay, z);
                        const lv = levels(catalog);
                        const key = lv[String(z)] ? String(z) : String(z < 0 ? -2 : 2);
                        const cap = lv[key].creatureCap, mcap = lv[key].monsterCap;
                        const sc = catalog.wildlife.savageryScale[world.savageryAt(ax, ay)];
                        const f = 0.5 + 0.5 * hashBig(seed, SALT_FILL, ax, ay, z) / 4294967296;
                        const m = 0.5 + 0.5 * hashBig(seed, SALT_MONSTER, ax, ay, z) / 4294967296;
                        const prey = Math.min(cap - mcap, Math.round((cap - mcap) * f * sc));
                        const mon = Math.min(mcap, Math.round(mcap * tierScale[world.tierAt(ax, ay, z)] * m * sc));
                        assert.equal(d.prey, prey, `prey seed ${seed} (${ax},${ay},${z})`);
                        assert.equal(d.monsters, mon, `monsters seed ${seed} (${ax},${ay},${z})`);
                        n++;
                    }
                }
            }
        }
        assert(n >= 300, "sampled " + n);
    },

    deterministic(env) {
        const { g, cfg } = env;
        const a = g.computeGlobalDensity(20260919, SMALL, cfg);
        const b = g.computeGlobalDensity(20260919, SMALL, cfg);
        assert.equal(a.checksum, b.checksum);
        assert(sameArray(a.prey, b.prey) && sameArray(a.monsters, b.monsters) && sameArray(a.tier, b.tier) && sameArray(a.savagery, b.savagery));
    },

    seeds_differ(env) {
        const { g, cfg } = env;
        const a = g.computeGlobalDensity(1, SMALL, cfg);
        const b = g.computeGlobalDensity(2, SMALL, cfg);
        assert.notEqual(a.checksum, b.checksum);
        let same = 0;
        for (let i = 0; i < a.prey.length; i++) if (a.prey[i] === b.prey[i]) same++;
        assert(same < a.prey.length * 0.2, `seeds 1 and 2 share ${same} of ${a.prey.length} prey counts`);
    },

    // The brief's "matches expected seeds": pinned totals and checksums for three seeds on the 100 x 100 x 32 world.
    golden_seeds(env) {
        const { g, cfg } = env;
        for (const seed of SEEDS) {
            const r = g.computeGlobalDensity(seed, BIG, cfg);
            const want = GOLDEN[seed];
            assert.deepEqual({ checksum: r.checksum, prey: r.totals.prey, monsters: r.totals.monsters }, want, "seed " + seed);
        }
        const r = g.computeGlobalDensity(20260919, BIG, cfg);
        for (const c of GOLDEN_CELLS) {
            const got = g.at(r, c.ax, c.ay, c.z);
            assert.deepEqual({ prey: got.prey, monsters: got.monsters, tier: got.tier, savagery: got.savagery },
                { prey: c.prey, monsters: c.monsters, tier: c.tier, savagery: c.savagery }, `cell (${c.ax},${c.ay},${c.z})`);
        }
        assert(GOLDEN_CELLS.length >= 6, "golden cells pinned");
    },

    // An area's counts do not depend on which other areas exist or the order they are asked for (DEC-070 condition C:
    // the same whether an area is built at New Game or later).
    single_equals_batch(env) {
        const { g, cfg } = env;
        const r = g.computeGlobalDensity(77, SMALL, cfg);
        const order = [];
        for (let z = SMALL.zMin; z <= SMALL.zMax; z++) for (let ay = 0; ay < SMALL.areasY; ay++) for (let ax = 0; ax < SMALL.areasX; ax++) order.push([ax, ay, z]);
        let s = 12345;
        for (let i = order.length - 1; i > 0; i--) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; const j = s % (i + 1); [order[i], order[j]] = [order[j], order[i]]; }
        for (const [ax, ay, z] of order) {
            assert.deepEqual(g.densityAt(77, SMALL, cfg, ax, ay, z), g.at(r, ax, ay, z), `(${ax},${ay},${z})`);
        }
        const big = g.computeGlobalDensity(77, { ...SMALL, areasX: 60, areasY: 50, zMin: -9, zMax: 9 }, cfg);
        for (const [ax, ay, z] of order) assert.deepEqual(g.at(big, ax, ay, z), g.at(r, ax, ay, z), `world size changed (${ax},${ay},${z})`);
    },

    // Area (a, b) and area (b, a) draw from different streams (no plain XOR of the inputs).
    index_mixing(env) {
        const { g, cfg } = env;
        const world = { areasX: 60, areasY: 60, zMin: 0, zMax: 0, tierAt: () => 4, savageryAt: () => "wild" };
        const r = g.computeGlobalDensity(9, world, cfg);
        let pairs = 0, same = 0;
        for (let ay = 0; ay < 60; ay++) for (let ax = ay + 1; ax < 60; ax++) {
            pairs++;
            const p = g.at(r, ax, ay, 0), q = g.at(r, ay, ax, 0);
            if (p.prey === q.prey && p.monsters === q.monsters) same++;
        }
        assert(same < pairs * 0.1, `${same} of ${pairs} mirrored areas are identical`);
    },

    caps_respected(env) {
        const { g, cfg } = env;
        for (const sav of ["tame", "wild", "primeval"]) {
            const r = g.computeGlobalDensity(5, { ...SMALL, zMin: -6, zMax: 6, savageryAt: () => sav, tierAt: () => 4 }, cfg);
            let atCap = 0;
            for (let z = r.zMin; z <= r.zMax; z++) {
                const b = g.budgetFor(cfg, z);
                for (let ay = 0; ay < r.areasY; ay++) for (let ax = 0; ax < r.areasX; ax++) {
                    const c = g.at(r, ax, ay, z);
                    assert(c.prey >= 0 && c.prey <= b.creatureCap - b.monsterCap, `prey ${c.prey} over cap at z ${z} (${sav})`);
                    assert(c.monsters >= 0 && c.monsters <= b.monsterCap, `monsters ${c.monsters} over cap at z ${z} (${sav})`);
                    assert(c.total <= b.creatureCap);
                    if (c.prey === b.creatureCap - b.monsterCap) atCap++;
                }
            }
            if (sav === "primeval") assert(atCap > 0, "primeval reaches the prey cap somewhere");
        }
    },

    // The stand-in fill: with savagery scale 1 every prey count lies in [round(cap * 0.5), cap].
    fill_range(env) {
        const { g, cfg } = env;
        const r = g.computeGlobalDensity(11, { ...SMALL, savageryAt: () => "wild" }, cfg);
        let lowHalf = 0, n = 0;
        for (let z = r.zMin; z <= r.zMax; z++) {
            const b = g.budgetFor(cfg, z), cap = b.creatureCap - b.monsterCap;
            for (let ay = 0; ay < r.areasY; ay++) for (let ax = 0; ax < r.areasX; ax++) {
                const p = g.at(r, ax, ay, z).prey;
                assert(p >= Math.round(cap * 0.5) && p <= cap, `prey ${p} outside fill range at z ${z}`);
                if (p < cap * 0.75) lowHalf++;
                n++;
            }
        }
        assert(lowHalf > n * 0.3 && lowHalf < n * 0.7, `fill is spread (${lowHalf} of ${n} in the lower half)`);
    },

    // Default tier: Chebyshev distance in (area, z) to the nearest start, one tier per area, T4 at most; no starts gives T2.
    tier_from_starts(env) {
        const { g, cfg } = env;
        const world = { areasX: 20, areasY: 20, zMin: -3, zMax: 3, starts: [{ ax: 8, ay: 8, z: 0 }] };
        const r = g.computeGlobalDensity(3, world, cfg);
        for (let z = -3; z <= 3; z++) for (let ay = 0; ay < 20; ay++) for (let ax = 0; ax < 20; ax++) {
            const d = Math.max(Math.abs(ax - 8), Math.abs(ay - 8), Math.abs(z));
            assert.equal(g.at(r, ax, ay, z).tier, Math.min(4, d), `(${ax},${ay},${z})`);
        }
        const none = g.computeGlobalDensity(3, { ...world, starts: [] }, cfg);
        assert(Array.from(none.tier).every(t => t === 2), "no starts gives T2");
        const shifted = g.computeGlobalDensity(3, { ...world, starts: [{ ax: 8, ay: 8 }] }, cfg);
        assert.equal(g.at(shifted, 8, 8, 0).tier, 0, "a start without z sits at z 0");
    },

    // T0 (the start ring) holds no monsters; every start's own area has none.
    t0_no_monsters(env) {
        const { g, cfg } = env;
        const r = g.computeGlobalDensity(20260919, BIG, cfg);
        for (const s of BIG.starts) {
            const c = g.at(r, s.ax, s.ay, s.z);
            assert.equal(c.tier, 0, "start tier");
            assert.equal(c.monsters, 0, `monsters at start (${s.ax},${s.ay},${s.z})`);
            assert(c.prey > 0, "a start still has prey");
        }
        let t0 = 0;
        for (let i = 0; i < r.tier.length; i++) if (r.tier[i] === 0) { t0++; assert.equal(r.monsters[i], 0, "T0 monsters at index " + i); }
        assert.equal(t0, BIG.starts.length, "only the start areas are T0 with one area per tier");
        const calm = g.computeGlobalDensity(4, { ...SMALL, tierAt: () => 0 }, cfg);
        assert.equal(calm.totals.monsters, 0, "an all-T0 world has no monsters");
        const wild = g.computeGlobalDensity(4, { ...SMALL, tierAt: () => 4 }, cfg);
        assert(wild.totals.monsters > 0, "an all-T4 world has monsters");
    },

    savagery_scales(env) {
        const { g, cfg } = env;
        const t = {};
        for (const sav of ["tame", "wild", "primeval"]) t[sav] = g.computeGlobalDensity(8, { ...SMALL, tierAt: () => 3, savageryAt: () => sav }, cfg).totals;
        assert(t.tame.prey < t.wild.prey && t.wild.prey < t.primeval.prey, JSON.stringify(t));
        assert(t.tame.monsters < t.wild.monsters && t.wild.monsters <= t.primeval.monsters, JSON.stringify(t));
        const r = g.computeGlobalDensity(8, BIG, cfg);
        const h = [0, 0, 0];
        for (const s of r.savagery) h[s]++;
        assert(h.every(v => v > 0), "the stand-in field yields all three savagery tiers on 100 x 100: " + h);
        let smooth = 0;
        for (let ay = 0; ay < 100; ay++) for (let ax = 1; ax < 100; ax++) if (r.savagery[ay * 100 + ax] === r.savagery[ay * 100 + ax - 1]) smooth++;
        assert(smooth > 99 * 100 * 0.8, "neighbouring areas mostly share savagery (a coarse field, not noise): " + smooth);
    },

    totals_consistent(env) {
        const { g, cfg } = env;
        const r = g.computeGlobalDensity(21, SMALL, cfg);
        let p = 0, m = 0;
        for (let i = 0; i < r.prey.length; i++) { p += r.prey[i]; m += r.monsters[i]; }
        assert.equal(r.totals.prey, p);
        assert.equal(r.totals.monsters, m);
        assert.equal(r.totals.creatures, p + m);
        assert.equal(r.byLevel.length, SMALL.zMax - SMALL.zMin + 1);
        assert.equal(r.byLevel.reduce((s, l) => s + l.prey, 0), p);
        assert.equal(r.byLevel.reduce((s, l) => s + l.monsters, 0), m);
        assert.deepEqual(r.byLevel.map(l => l.z), Array.from({ length: 9 }, (_, i) => i - 4));
    },

    // Pure: no Math.random, no clock, no host globals, no file IO in the core.
    no_random_no_clock(env) {
        const { g, cfg, realm } = env;
        const saved = { random: realm.Math.random, Date: realm.Date };
        const want = g.computeGlobalDensity(31, SMALL, cfg).checksum;
        realm.Math.random = () => { throw new Error("Math.random called"); };
        realm.Date = new Proxy(saved.Date, { construct() { throw new Error("new Date called"); }, apply() { throw new Error("Date() called"); }, get(t, k) { if (k === "now") return () => { throw new Error("Date.now called"); }; return t[k]; } });
        let got;
        try { got = g.computeGlobalDensity(31, SMALL, cfg).checksum; }
        catch (e) { assert.fail("core used " + e.message); }
        finally { realm.Math.random = saved.random; realm.Date = saved.Date; }
        assert.equal(got, want);
    },

    no_host_needed(env) {
        // A context with only `module`: no require, window, UF, $gameMap or terrain builder.
        const ctx = vm.createContext({ module: { exports: {} } });
        vm.runInContext(env.source, ctx, { filename: modPath, timeout: 5000 });
        const bare = ctx.module.exports;
        const cfg = bare.configFromCatalog(JSON.parse(JSON.stringify({ ecology: { levels: levels(catalog) }, wildlife: catalog.wildlife })));
        let got;
        try { got = bare.computeGlobalDensity(20260919, SMALL, cfg).checksum; }
        catch (e) { assert.fail("the core needs a host: " + e.message); }
        assert.equal(got, env.g.computeGlobalDensity(20260919, SMALL, env.cfg).checksum);
    },

    input_validation(env) {
        const { g, cfg } = env;
        assert.equal(codeOf(() => g.computeGlobalDensity(-1, SMALL, cfg)), "E_SEED");
        assert.equal(codeOf(() => g.computeGlobalDensity(1.5, SMALL, cfg)), "E_SEED");
        assert.equal(codeOf(() => g.computeGlobalDensity(1, { ...SMALL, areasX: 0 }, cfg)), "E_WORLD");
        assert.equal(codeOf(() => g.computeGlobalDensity(1, { ...SMALL, zMin: 3, zMax: 2 }, cfg)), "E_WORLD");
        assert.equal(codeOf(() => g.computeGlobalDensity(1, { ...SMALL, starts: [{ ax: 1 }] }, cfg)), "E_WORLD");
        assert.equal(codeOf(() => g.computeGlobalDensity(1, SMALL, null)), "E_CONFIG");
        assert.equal(codeOf(() => g.computeGlobalDensity(1, { ...SMALL, tierAt: () => 5 }, cfg)), "E_INJECT");
        assert.equal(codeOf(() => g.computeGlobalDensity(1, { ...SMALL, savageryAt: () => "calm" }, cfg)), "E_INJECT");
        assert.equal(codeOf(() => g.densityAt(1, SMALL, cfg, SMALL.areasX, 0, 0)), "E_RANGE");
        assert.equal(codeOf(() => g.densityAt(1, SMALL, cfg, 0, 0, SMALL.zMax + 1)), "E_RANGE");
        assert.equal(codeOf(() => g.configFromCatalog(catalog, { fill: [0.9, 0.1] })), "E_CONFIG");
        assert.equal(codeOf(() => g.configFromCatalog(catalog, { tierMonsterScale: [0, 1] })), "E_CONFIG");
        const r = g.computeGlobalDensity(1, SMALL, cfg);
        assert.equal(g.at(r, -1, 0, 0), null);
        assert.equal(g.at(r, 0, 0, SMALL.zMin - 1), null);
    },

    // The brief's speed bar: 100 x 100 areas x 32 levels from the seed alone. Method: wall clock (process.hrtime.bigint)
    // around computeGlobalDensity, best of 3 runs after one warm-up, in this Node process.
    perf_100x100(env) {
        const { g, cfg } = env;
        g.computeGlobalDensity(1, BIG, cfg);
        let best = Infinity;
        for (let i = 0; i < 3; i++) {
            const t0 = process.hrtime.bigint();
            const r = g.computeGlobalDensity(1000 + i, BIG, cfg);
            const ms = Number(process.hrtime.bigint() - t0) / 1e6;
            if (ms < best) best = ms;
            assert.equal(r.prey.length, 100 * 100 * 32);
        }
        console.log(`  perf: 100 x 100 areas x 32 levels (320000 (area, z)) best of 3 = ${best.toFixed(1)} ms`);
        assert(best < 1000, `took ${best.toFixed(1)} ms; the budget is 1000 ms`);
    }
};

// The function wrapper keeps the module's declarations local, as require does, and binds the context's own Math,
// Number, Object, Array, typed arrays and the rest (the same objects, so the Math.random trap still sees them). Without it every global
// lookup goes through the contextified global, and the unmutated module runs about 40 times slower than under require.
function evaluate(source) {
    const ctx = vm.createContext({ module: { exports: {} } });
    const bound = "module, Math, Number, Object, Array, String, Error, Uint8Array, Uint16Array, Infinity";
    vm.runInContext("(function (" + bound + ") {\n" + source + "\n})(" + bound + ");", ctx, { filename: modPath, timeout: 5000 });
    return { g: ctx.module.exports, realm: vm.runInContext("globalThis", ctx) };
}

function replaceOnce(source, before, after) {
    assert.equal(source.split(before).length - 1, 1, `mutation target: ${before}`);
    return source.replace(before, after);
}

const mutants = [
    {
        name: "xor_key", kills: ["index_mixing", "counts_match_oracle", "golden_seeds"],
        change: s => replaceOnce(replaceOnce(replaceOnce(s,
            "/*MUTANT xor_key*/ h = mix32((h ^ (a >>> 0)) >>> 0);", "h = mix32((h ^ (a >>> 0) ^ (b >>> 0) ^ (c >>> 0)) >>> 0);"),
            "h = mix32((h ^ (b >>> 0)) >>> 0);", ""),
            "h = mix32((h ^ (c >>> 0)) >>> 0);", "")
    },
    {
        name: "tier_off_by_one", kills: ["tier_from_starts", "t0_no_monsters"],
        change: s => replaceOnce(s, "return Math.min(TIERS - 1, Math.floor(d / cfg.tierStepAreas));", "return Math.min(TIERS - 1, Math.floor(d / cfg.tierStepAreas) + 1);")
    },
    {
        name: "prey_uncapped", kills: ["caps_respected", "counts_match_oracle"],
        change: s => replaceOnce(s, "const prey = Math.min(preyCap, Math.round(preyCap * f * scale));", "const prey = Math.round(preyCap * f * scale);")
    },
    {
        name: "t0_monsters", kills: ["t0_no_monsters", "counts_match_oracle"],
        change: s => replaceOnce(s, "cfg.tierMonsterScale[tier] * g * scale", "Math.max(0.25, cfg.tierMonsterScale[tier]) * g * scale")
    },
    {
        name: "global_rng", kills: ["deterministic", "no_random_no_clock", "counts_match_oracle"],
        change: s => replaceOnce(s, "unit(seed, SALT_FILL, ax, ay, z)", "Math.random()")
    },
    {
        name: "seed_ignored", kills: ["seeds_differ", "golden_seeds"],
        change: s => replaceOnce(s, "let h = mix32((seed ^ 0x9E3779B9) >>> 0);", "let h = mix32((0 ^ 0x9E3779B9) >>> 0);")
    },
    {
        name: "deep_levels_use_surface", kills: ["config_from_catalog", "counts_match_oracle"],
        change: s => replaceOnce(s, "z < zs[0] ? zs[0] :", "z < zs[0] ? 0 :")
    },
    {
        name: "savagery_ignored", kills: ["savagery_scales", "counts_match_oracle"],
        change: s => replaceOnce(s, "const scale = cfg.savageryScale[SAVAGERY[sav]];", "const scale = 1;")
    },
    {
        name: "batch_flattens_z", kills: ["single_equals_batch"],
        change: s => replaceOnce(s, "const t = tierIndex(cfg, w, ax, ay, z);", "const t = tierIndex(cfg, w, ax, ay, 0);")
    },
    {
        name: "batch_depends_on_world_width", kills: ["single_equals_batch"],
        change: s => replaceOnce(s, "const c = counts(cfg, seed, ax, ay, z, savagery[a], t);", "const c = counts(cfg, seed, a, 0, z, savagery[a], t);")
    },
    {
        name: "totals_drop_level", kills: ["totals_consistent"],
        change: s => replaceOnce(s, "totalPrey += lp;", "if (zi > 0) totalPrey += lp;")
    },
    {
        name: "no_inject_check", kills: ["input_validation"],
        change: s => replaceOnce(s, "if (!Number.isInteger(t) || t < 0 || t >= TIERS) fail(", "if (false) fail(")
    },
    {
        name: "catalog_scale_ignored", kills: ["config_from_catalog"],
        change: s => replaceOnce(s, "savageryScale[s] = scale[s];", "savageryScale[s] = 1;")
    },
    {
        name: "host_global", kills: ["no_host_needed"],
        change: s => replaceOnce(s, "function counts(cfg, seed, ax, ay, z, sav, tier) {", "function counts(cfg, seed, ax, ay, z, sav, tier) {\n    if (typeof window === \"undefined\") throw new Error(\"no host\");")
    },
    {
        // A per-cell pass over four 256-cell rows of every (area, z): the first step towards building terrain (DEC-065).
        name: "per_cell_rows", kills: ["perf_100x100"],
        change: s => replaceOnce(s, "function counts(cfg, seed, ax, ay, z, sav, tier) {", "function counts(cfg, seed, ax, ay, z, sav, tier) {\n" +
            "    let acc = 0; for (let k = 0; k < 1024; k++) acc ^= unit(seed, k, ax, ay, z) < 0.5 ? 1 : 0; if (acc > 1) fail(\"E_X\", \"x\");")
    }
];

function runCheck(name, env, label = "") {
    try {
        checks[name](env);
        console.log(`PASS ${label}${name}`);
        return "pass";
    } catch (error) {
        console.log(`FAIL ${label}${name}: ${error.message.split("\n")[0]}`);
        return error.code === "ERR_ASSERTION" ? "assertion" : "error";
    }
}

function printGolden(g, cfg) {
    const out = {};
    for (const seed of SEEDS) {
        const r = g.computeGlobalDensity(seed, BIG, cfg);
        out[seed] = { checksum: r.checksum, prey: r.totals.prey, monsters: r.totals.monsters };
    }
    console.log(JSON.stringify(out, null, 4));
    const r = g.computeGlobalDensity(20260919, BIG, cfg);
    const cells = [[10, 10, 0], [11, 10, 0], [0, 0, -16], [99, 99, 15], [50, 60, -8], [37, 81, -1], [64, 3, 2], [90, 20, 5]];
    console.log(JSON.stringify(cells.map(([ax, ay, z]) => { const c = g.at(r, ax, ay, z); return { ax, ay, z, prey: c.prey, monsters: c.monsters, tier: c.tier, savagery: c.savagery }; })));
}

function main(args) {
    if (args.length > 1 || args.some(a => a !== "--print-golden")) {
        console.error("Usage: node tools/sim/test_global_spawn_density.js [--print-golden]");
        return 1;
    }
    let g, idx, source;
    try {
        g = require(modPath);
        idx = require(indexPath);
        source = fs.readFileSync(modPath, "utf8");
    } catch (error) {
        for (const name of Object.keys(checks)) console.log(`FAIL ${name}: ${error.code || error.name} ${error.message.split("\n")[0]}`);
        console.log(`RESULT: 0 passed, ${Object.keys(checks).length} failed (module load)`);
        return 1;
    }
    const cfg = g.loadDefaultConfig();
    if (args.includes("--print-golden")) { printGolden(g, cfg); return 0; }

    let failed = 0;
    // The spawner index exports the same functions (UF.Sim.require("spawner") and tests see one module).
    try {
        assert.equal(idx.globalDensity, g);
        for (const k of ["computeGlobalDensity", "densityAt", "configFromCatalog", "loadDefaultConfig", "at"]) assert.equal(idx[k], g[k], k);
        console.log("PASS index_exports");
    } catch (e) { failed++; console.log("FAIL index_exports: " + e.message); }

    const env = { g, cfg, realm: globalThis, source };
    for (const name of Object.keys(checks)) if (runCheck(name, env) !== "pass") failed++;
    const total = Object.keys(checks).length + 1;
    console.log(`RESULT: ${total - failed} passed, ${failed} failed`);
    if (failed) return 1;

    let killed = 0;
    for (const mutant of mutants) {
        try {
            const m = evaluate(mutant.change(source));
            const mcfg = m.g.configFromCatalog(JSON.parse(JSON.stringify({ ecology: { levels: levels(catalog) }, wildlife: catalog.wildlife })));
            const menv = { g: m.g, cfg: mcfg, realm: m.realm, source: mutant.change(source) };
            const results = mutant.kills.map(name => runCheck(name, menv, `${mutant.name}::`));
            if (results.every(r => r === "assertion")) { killed++; console.log(`KILLED ${mutant.name}`); }
            else console.log(`SURVIVED/INVALID ${mutant.name}: every named check must fail by assertion`);
        } catch (error) {
            console.log(`INVALID ${mutant.name}: ${error.message.split("\n")[0]}`);
        }
    }
    console.log(`MUTATION RESULT: ${killed}/${mutants.length} killed; ${mutants.length - killed} survived/invalid`);
    return killed === mutants.length ? 0 : 1;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { main };
