"use strict";

// WG.65.04 world-wide spawn density for the sky view (DEC-080 items 1 and 5). One cheap pass over every (area, z)
// of the world, computed from the seed alone: no terrain is built (DEC-065), no live state is read, the core does no
// file IO and never calls Math.random or the clock. Each count is a pure function of (seed, area, z) and the config
// (DEC-073 item 1; docs/design/SPAWNER_DEC073.md section 5 rule 1), so it is the same whatever order areas are asked
// for and whether or not their terrain exists.
//
// The counts are designations: the approximate number of prey and monsters an (area, z) holds when full, not units.
// Caps come from the catalog's ecology.levels budgets and wildlife.savageryScale (configFromCatalog). Two inputs
// belong to other lanes and are injectable: savageryAt (the worldgen region field) and tierAt (the danger field,
// lane-fc, NAT.07.02). Until those exist the defaults are stand-ins: a seeded coarse savagery field, and a tier from
// the distance in areas to the nearest start. T0 holds no monsters (the predator-free ring around starts, DEC-050).

const TIERS = 5;
const SAVAGERY = ["tame", "wild", "primeval"];
const MAX_AREAS = 4096;     // per side; keeps index math and typed arrays small
const MAX_COUNT = 0xFFFF;   // counts are stored in Uint16Array

// Stand-in knobs (PM_DEFAULT for the reviewer and PM to change). Budgets and savagery scales are not here: they are data.
const DEFAULTS = Object.freeze({
    fill: Object.freeze([0.5, 1]),                         // share of an area's prey budget it holds, before savagery
    tierMonsterScale: Object.freeze([0, 0.25, 0.5, 0.75, 1]), // share of the monster budget per danger tier T0..T4
    tierStepAreas: 1,                                      // stand-in tier: one tier per area of distance from a start
    fieldCellAreas: 8,                                     // stand-in savagery field: lattice spacing in areas
    savageryCuts: Object.freeze([0.3, 0.75])               // field value below cut 0 is tame, below cut 1 wild, else primeval
});

// Salts keep the per-purpose hash streams apart.
const SALT_FILL = 0x46494C4C;      // "FILL"
const SALT_MONSTER = 0x4D4F4E53;   // "MONS"
const SALT_SAVAGERY = 0x53415647;  // "SAVG"

function fail(code, msg) {
    const e = new Error(code + ": " + msg);
    e.code = code;
    throw e;
}
function isUInt32(n) {
    return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 0xFFFFFFFF;
}
function isCount(n) {
    return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= MAX_COUNT;
}
function isUnit(n) {
    return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;
}

// murmur3 finaliser: a bijection on uint32 (the same mix as game/js/sim/placement/encounters.js).
function mix32(h) {
    h ^= h >>> 16;
    h = Math.imul(h, 0x85EBCA6B);
    h ^= h >>> 13;
    h = Math.imul(h, 0xC2B2AE35);
    h ^= h >>> 16;
    return h >>> 0;
}

// (seed, salt, a, b, c) folded through mix32 one input at a time, never by plain XOR, so area (1, 0) and area (0, 1)
// get different streams. Negative z folds to its uint32 two's complement, which is distinct per z.
function hash(seed, salt, a, b, c) {
    let h = mix32((seed ^ 0x9E3779B9) >>> 0);
    h = mix32((h ^ salt) >>> 0);
    /*MUTANT xor_key*/ h = mix32((h ^ (a >>> 0)) >>> 0);
    h = mix32((h ^ (b >>> 0)) >>> 0);
    h = mix32((h ^ (c >>> 0)) >>> 0);
    return h;
}
function unit(seed, salt, a, b, c) {
    return hash(seed, salt, a, b, c) / 4294967296;
}

// Build a config from the parsed catalog (game/data/UF_WorldCatalog.json): ecology.levels budgets per z and
// wildlife.savageryScale. `knobs` overrides the stand-in DEFAULTS. Pure: the caller loads the catalog.
function configFromCatalog(catalog, knobs) {
    const levels = catalog && catalog.ecology && catalog.ecology.levels;
    const scale = catalog && catalog.wildlife && catalog.wildlife.savageryScale;
    if (!levels || typeof levels !== "object") fail("E_CONFIG", "catalog ecology.levels missing");
    if (!scale || typeof scale !== "object") fail("E_CONFIG", "catalog wildlife.savageryScale missing");
    const budgets = {};
    for (const k of Object.keys(levels)) {
        const z = Number(k);
        const row = levels[k];
        if (!Number.isInteger(z) || String(z) !== k) fail("E_CONFIG", "ecology.levels key " + k + " is not an integer z");
        if (!row || !isCount(row.creatureCap) || !isCount(row.monsterCap) || row.monsterCap > row.creatureCap) {
            fail("E_CONFIG", "ecology.levels." + k + " needs integer creatureCap >= monsterCap >= 0");
        }
        budgets[k] = { creatureCap: row.creatureCap, monsterCap: row.monsterCap };
    }
    const savageryScale = {};
    for (const s of SAVAGERY) {
        if (typeof scale[s] !== "number" || !Number.isFinite(scale[s]) || scale[s] < 0) fail("E_CONFIG", "wildlife.savageryScale." + s);
        savageryScale[s] = scale[s];
    }
    return makeConfig(budgets, savageryScale, knobs);
}

function makeConfig(budgets, savageryScale, knobs) {
    const k = Object.assign({}, DEFAULTS, knobs || {});
    if (!Array.isArray(k.fill) || k.fill.length !== 2 || !isUnit(k.fill[0]) || !isUnit(k.fill[1]) || k.fill[0] > k.fill[1]) {
        fail("E_CONFIG", "fill must be [lo, hi] within 0..1");
    }
    if (!Array.isArray(k.tierMonsterScale) || k.tierMonsterScale.length !== TIERS || !k.tierMonsterScale.every(isUnit)) {
        fail("E_CONFIG", "tierMonsterScale must list " + TIERS + " values within 0..1");
    }
    if (!Number.isInteger(k.tierStepAreas) || k.tierStepAreas < 1) fail("E_CONFIG", "tierStepAreas must be a positive integer");
    if (!Number.isInteger(k.fieldCellAreas) || k.fieldCellAreas < 1) fail("E_CONFIG", "fieldCellAreas must be a positive integer");
    const cuts = k.savageryCuts;
    if (!Array.isArray(cuts) || cuts.length !== 2 || !isUnit(cuts[0]) || !isUnit(cuts[1]) || cuts[0] > cuts[1]) {
        fail("E_CONFIG", "savageryCuts must be [lo, hi] within 0..1");
    }
    const zs = Object.keys(budgets).map(Number).sort((a, b) => a - b);
    if (!zs.length) fail("E_CONFIG", "no level budgets");
    return Object.freeze({
        budgets: Object.freeze(budgets),
        budgetZs: Object.freeze(zs),
        savageryScale: Object.freeze(savageryScale),
        fill: k.fill, tierMonsterScale: k.tierMonsterScale, tierStepAreas: k.tierStepAreas,
        fieldCellAreas: k.fieldCellAreas, savageryCuts: cuts
    });
}

// The budget row for z: its own row, else the nearest defined z (a level deeper than the deepest row uses the
// deepest row, and so on up). Stand-in until per-band densities are set (SPAWNER_DEC073 section 6, Q4).
function budgetFor(cfg, z) {
    const own = cfg.budgets[String(z)];
    if (own) return own;
    const zs = cfg.budgetZs;
    const near = z < zs[0] ? zs[0] : z > zs[zs.length - 1] ? zs[zs.length - 1] : nearestZ(zs, z);
    return cfg.budgets[String(near)];
}
function nearestZ(zs, z) {
    let best = zs[0];
    for (const v of zs) if (Math.abs(v - z) < Math.abs(best - z) || (Math.abs(v - z) === Math.abs(best - z) && Math.abs(v) < Math.abs(best))) best = v;
    return best;
}

// Stand-in savagery: bilinear value noise over a lattice every fieldCellAreas areas, smoothstepped. Region trait, so
// it does not depend on z. Returns an index into SAVAGERY.
function defaultSavagery(cfg, seed, ax, ay) {
    const s = cfg.fieldCellAreas;
    const lx = Math.floor(ax / s), ly = Math.floor(ay / s);
    const fx = smooth((ax - lx * s) / s), fy = smooth((ay - ly * s) / s);
    const v00 = unit(seed, SALT_SAVAGERY, lx, ly, 0), v10 = unit(seed, SALT_SAVAGERY, lx + 1, ly, 0);
    const v01 = unit(seed, SALT_SAVAGERY, lx, ly + 1, 0), v11 = unit(seed, SALT_SAVAGERY, lx + 1, ly + 1, 0);
    const v = (v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy;
    return v < cfg.savageryCuts[0] ? 0 : v < cfg.savageryCuts[1] ? 1 : 2;
}
function smooth(t) {
    return t * t * (3 - 2 * t);
}

// Stand-in tier: Chebyshev distance in (area, z) to the nearest start, one tier per tierStepAreas, capped at T4.
// With no starts every (area, z) is T2.
function defaultTier(cfg, starts, ax, ay, z) {
    if (!starts.length) return 2;
    let d = Infinity;
    for (const s of starts) {
        const dd = Math.max(Math.abs(ax - s.ax), Math.abs(ay - s.ay), Math.abs(z - s.z));
        if (dd < d) d = dd;
    }
    /*MUTANT tier_off_by_one*/ return Math.min(TIERS - 1, Math.floor(d / cfg.tierStepAreas));
}

function checkWorld(world) {
    if (!world || typeof world !== "object") fail("E_WORLD", "world must be { areasX, areasY, zMin, zMax }");
    const { areasX, areasY, zMin, zMax } = world;
    for (const [n, v] of [["areasX", areasX], ["areasY", areasY]]) {
        if (!Number.isInteger(v) || v < 1 || v > MAX_AREAS) fail("E_WORLD", n + " must be an integer 1.." + MAX_AREAS);
    }
    if (!Number.isInteger(zMin) || !Number.isInteger(zMax) || zMin > zMax || zMax - zMin + 1 > 256) {
        fail("E_WORLD", "zMin..zMax must be integers with zMin <= zMax and at most 256 levels");
    }
    const starts = [];
    for (const s of world.starts || []) {
        if (!s || !Number.isInteger(s.ax) || !Number.isInteger(s.ay)) fail("E_WORLD", "a start needs integer ax, ay");
        const z = s.z == null ? 0 : s.z;
        if (!Number.isInteger(z)) fail("E_WORLD", "a start z must be an integer");
        starts.push({ ax: s.ax, ay: s.ay, z: z });
    }
    if (world.savageryAt != null && typeof world.savageryAt !== "function") fail("E_WORLD", "savageryAt must be a function");
    if (world.tierAt != null && typeof world.tierAt !== "function") fail("E_WORLD", "tierAt must be a function");
    return { areasX, areasY, zMin, zMax, starts, savageryAt: world.savageryAt || null, tierAt: world.tierAt || null };
}

function savageryIndex(cfg, w, seed, ax, ay) {
    if (!w.savageryAt) return defaultSavagery(cfg, seed, ax, ay);
    const s = w.savageryAt(ax, ay);
    const i = SAVAGERY.indexOf(s);
    if (i < 0) fail("E_INJECT", "savageryAt(" + ax + ", " + ay + ") returned " + s + "; want tame, wild or primeval");
    return i;
}
function tierIndex(cfg, w, ax, ay, z) {
    if (!w.tierAt) return defaultTier(cfg, w.starts, ax, ay, z);
    const t = w.tierAt(ax, ay, z);
    if (!Number.isInteger(t) || t < 0 || t >= TIERS) fail("E_INJECT", "tierAt(" + ax + ", " + ay + ", " + z + ") returned " + t + "; want 0.." + (TIERS - 1));
    return t;
}

// The counts for one (area, z), given its savagery index and tier. Both are capped by the level budget.
function counts(cfg, seed, ax, ay, z, sav, tier) {
    const b = budgetFor(cfg, z);
    const scale = cfg.savageryScale[SAVAGERY[sav]];
    const preyCap = b.creatureCap - b.monsterCap;
    const f = cfg.fill[0] + (cfg.fill[1] - cfg.fill[0]) * unit(seed, SALT_FILL, ax, ay, z);
    /*MUTANT prey_uncapped*/ const prey = Math.min(preyCap, Math.round(preyCap * f * scale));
    const g = cfg.fill[0] + (cfg.fill[1] - cfg.fill[0]) * unit(seed, SALT_MONSTER, ax, ay, z);
    /*MUTANT t0_monsters*/ const monsters = Math.min(b.monsterCap, Math.round(b.monsterCap * cfg.tierMonsterScale[tier] * g * scale));
    return { prey: prey, monsters: monsters };
}

// One (area, z) on its own. Gives exactly what computeGlobalDensity stores for it.
function densityAt(seed, world, cfg, ax, ay, z) {
    if (!isUInt32(seed)) fail("E_SEED", "seed must be a uint32");
    if (!cfg || !cfg.budgets) fail("E_CONFIG", "config missing; build it with configFromCatalog");
    const w = checkWorld(world);
    if (!Number.isInteger(ax) || !Number.isInteger(ay) || ax < 0 || ay < 0 || ax >= w.areasX || ay >= w.areasY) fail("E_RANGE", "area out of the world");
    if (!Number.isInteger(z) || z < w.zMin || z > w.zMax) fail("E_RANGE", "z out of the world");
    const sav = savageryIndex(cfg, w, seed, ax, ay);
    const tier = tierIndex(cfg, w, ax, ay, z);
    const c = counts(cfg, seed, ax, ay, z, sav, tier);
    return { ax: ax, ay: ay, z: z, prey: c.prey, monsters: c.monsters, total: c.prey + c.monsters, tier: tier, savagery: SAVAGERY[sav] };
}

// Every (area, z) of the world. Flat typed arrays indexed by ((z - zMin) * areasY + ay) * areasX + ax.
// Returns { seed, areasX, areasY, zMin, zMax, prey, monsters, tier, savagery (per area), totals, byLevel, checksum }.
function computeGlobalDensity(seed, world, cfg) {
    if (!isUInt32(seed)) fail("E_SEED", "seed must be a uint32");
    if (!cfg || !cfg.budgets) fail("E_CONFIG", "config missing; build it with configFromCatalog");
    const w = checkWorld(world);
    const areas = w.areasX * w.areasY;
    const nz = w.zMax - w.zMin + 1;
    const prey = new Uint16Array(areas * nz);
    const monsters = new Uint16Array(areas * nz);
    const tier = new Uint8Array(areas * nz);
    const savagery = new Uint8Array(areas);
    for (let ay = 0; ay < w.areasY; ay++) {
        for (let ax = 0; ax < w.areasX; ax++) savagery[ay * w.areasX + ax] = savageryIndex(cfg, w, seed, ax, ay);
    }
    const byLevel = [];
    let totalPrey = 0, totalMonsters = 0;
    let sum = mix32((seed ^ 0x5EED) >>> 0);
    for (let zi = 0; zi < nz; zi++) {
        const z = w.zMin + zi;
        let lp = 0, lm = 0;
        for (let ay = 0; ay < w.areasY; ay++) {
            for (let ax = 0; ax < w.areasX; ax++) {
                const a = ay * w.areasX + ax;
                const i = zi * areas + a;
                const t = tierIndex(cfg, w, ax, ay, z);
                const c = counts(cfg, seed, ax, ay, z, savagery[a], t);
                prey[i] = c.prey;
                monsters[i] = c.monsters;
                tier[i] = t;
                lp += c.prey;
                lm += c.monsters;
                sum = mix32((sum ^ (c.prey | (c.monsters << 16))) >>> 0);
            }
        }
        byLevel.push({ z: z, prey: lp, monsters: lm });
        totalPrey += lp;
        totalMonsters += lm;
    }
    return {
        seed: seed, areasX: w.areasX, areasY: w.areasY, zMin: w.zMin, zMax: w.zMax,
        prey: prey, monsters: monsters, tier: tier, savagery: savagery,
        totals: { prey: totalPrey, monsters: totalMonsters, creatures: totalPrey + totalMonsters },
        byLevel: byLevel,
        checksum: sum
    };
}

// Read one (area, z) back out of a computeGlobalDensity result.
function at(result, ax, ay, z) {
    if (!result || !result.prey) fail("E_RESULT", "not a density result");
    if (!Number.isInteger(ax) || !Number.isInteger(ay) || ax < 0 || ay < 0 || ax >= result.areasX || ay >= result.areasY) return null;
    if (!Number.isInteger(z) || z < result.zMin || z > result.zMax) return null;
    const a = ay * result.areasX + ax;
    const i = (z - result.zMin) * result.areasX * result.areasY + a;
    const p = result.prey[i], m = result.monsters[i];
    return { ax: ax, ay: ay, z: z, prey: p, monsters: m, total: p + m, tier: result.tier[i], savagery: SAVAGERY[result.savagery[a]] };
}

// Node / NW.js helper: the config from the shipped catalog.
function loadDefaultConfig(knobs) {
    const fs = require("fs");
    const path = require("path");
    const file = path.join(__dirname, "..", "..", "..", "data", "UF_WorldCatalog.json");
    return configFromCatalog(JSON.parse(fs.readFileSync(file, "utf8")), knobs);
}

module.exports = {
    TIERS: TIERS,
    SAVAGERY: SAVAGERY,
    DEFAULTS: DEFAULTS,
    mix32: mix32,
    configFromCatalog: configFromCatalog,
    budgetFor: budgetFor,
    densityAt: densityAt,
    computeGlobalDensity: computeGlobalDensity,
    at: at,
    loadDefaultConfig: loadDefaultConfig
};
