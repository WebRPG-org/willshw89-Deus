#!/usr/bin/env node
"use strict";

/**
 * tools/worldgen/test_vertical_biome_coupling.js
 *
 * WG.00.15. Headless. Twenty seeds, both Z ranges (-16..+15 and -4..+4).
 * Underground substrate at each depth matches the surface column and the
 * DEC-013 band table in docs/systems/DEUS_VerticalBiomes.md. The oracle below
 * is that table, not UF.Levels.COLUMN_RULES. Same seed twice, two runtimes,
 * same ids. Survey cap 64 finds a 0/-1/-2 chain on the audit seed where 12
 * did not. Generation time (Levels genMs) with coupling on stays within 10%
 * of coupling off.
 *
 * Mutants, each must fail its check: independent roll, cap 12, nondeterminism.
 *
 * Usage: node tools/worldgen/test_vertical_biome_coupling.js
 *        --perf   generation ratio only
 *        --smoke  one seed, skip determinism, performance and mutants
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { performance } = require("perf_hooks");
const simHook = require("../lib/vm_sim_require"); // WG.00.44: UF.Sim.require and a 1x1 grid in the vm

const ROOT = path.resolve(__dirname, "..", "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const SMOKE = process.argv.includes("--smoke");
const CHAIN_ONLY = process.argv.includes("--chain");
const SEEDS = SMOKE ? [1] : Array.from({ length: 20 }, (_, i) => i + 1);
const CHAIN_SEED = 12;
const RANGES = ["default", "test"];
const BIOME_PLUGINS = ["DEUS_Core", "DEUS_World", "DEUS_WorldGen", "DEUS_Levels"];
const CHAIN_PLUGINS = ["DEUS_Core", "DEUS_World", "DEUS_WorldGen", "DEUS_Factions", "DEUS_History", "DEUS_Levels",
    "DEUS_Dnd5e", "DEUS_Callings", "DEUS_HistoricalDemographics", "DEUS_Jobs", "DEUS_NaturalConnections"];

// Spec. Keep in step with docs/systems/DEUS_VerticalBiomes.md. Do not read the plugin table as the oracle.
const RULES = [
    { kind: "volcanic", shallow: "shallow_cave", deep: "deep_mine_belt" },
    { kind: "wet_water", shallow: "clay_bed", deep: "deep_salt_cavern" },
    { kind: "wet_land", shallow: "clay_bed", deep: "fossil_bed" },
    { kind: "mountain", shallow: "chalk_karst", deep: "deep_mine_belt" },
    { kind: "cold", shallow: "chalk_karst", deep: "crystal_cavern" },
    { kind: "arid", shallow: "shallow_cave", deep: "deep_salt_cavern" },
    { kind: "forest", shallow: "rooted_loam", deep: "crystal_cavern" },
    { kind: "temperate", shallow: "rooted_loam", deep: "deep_mine_belt" }
];

function readPlugin(name) {
    return fs.readFileSync(path.join(PLUGINS, name + ".js"), "utf8");
}
function tilemapStatics() {
    const core = fs.readFileSync(path.join(ROOT, "game", "js", "rmmz_core.js"), "utf8");
    const start = core.indexOf("Tilemap.TILE_ID_B = 0;");
    const table = core.indexOf("Tilemap.WATERFALL_AUTOTILE_TABLE = [");
    const end = core.indexOf("];", table) + 2;
    if (start < 0 || table < 0 || end < 2) throw new Error("rmmz_core.js Tilemap statics not found");
    return "function Tilemap() {}\n" + core.slice(start, end);
}
function applyOverrides(src, overrides, file) {
    for (const [anchor, replacement] of Object.entries(overrides || {})) {
        const hits = src.split(anchor).length - 1;
        if (hits !== 1) throw new Error(`Override anchor found ${hits} times in ${file}: ${anchor}`);
        src = src.replace(anchor, () => replacement);
    }
    return src;
}
function loadRuntime(pluginNames, rangeName, overridesByPlugin) {
    const ns = {};
    const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));
    const env = {
        window: null, UF: ns, DEUS: ns, Math, performance, process: { env: { DEUS_Z_RANGE: rangeName } },
        $ufWorldCatalog: catalog, $deusWorldCatalog: catalog,
        PluginManager: { parameters: () => ({}), registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false,
            makeSaveContents: () => ({}), extractSaveContents() {} },
        Input: { keyMapper: {} }, TouchInput: {}, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 }, $gameMap: { mapId: () => 0 }, $gamePlayer: {},
        $gameSystem: {}, $gameMessage: { isBusy: () => false }, ImageManager: {}, Utils: { isOptionValid: () => false },
        document: { title: "" }, addEventListener() {},
        console: { log() {}, warn() {}, error(...a) { env._errors.push(a.map(x => (x && x.stack) || String(x)).join(" ")); } },
        _errors: []
    };
    env.window = env;
    const sources = pluginNames.map(n => applyOverrides(readPlugin(n), (overridesByPlugin || {})[n], n + ".js"));
    const classes = new Set(["Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_DEUSTime"]);
    const protoRe = /\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype(?:\.([A-Za-z0-9_]+))?/g;
    for (const s of sources) for (const m of s.matchAll(protoRe)) classes.add(m[1]);
    for (const c of classes) env[c] = function() {};
    for (const s of sources) for (const m of s.matchAll(protoRe)) {
        if (m[2]) env[m[1]].prototype[m[2]] = function() {};
    }
    simHook.install(env);
    const ctx = vm.createContext(env);
    vm.runInContext(["Math", "Object", "Array", "Number", "String", "Boolean", "Map", "Set", "JSON", "Date",
        "Uint8Array", "Uint16Array", "Int16Array", "Int32Array", "Float32Array", "performance", "window", "process"]
        .map(n => `const ${n} = globalThis.${n};`).join("\n"), ctx);
    vm.runInContext(tilemapStatics(), ctx, { filename: "rmmz_core.js#Tilemap-statics" });
    pluginNames.forEach((n, i) => vm.runInContext(sources[i], ctx, { filename: n + ".js", timeout: 120000 }));
    env._ctx = ctx;
    return env;
}
function boot(env) {
    const scene = new env.Scene_Boot();
    if (typeof scene.start === "function") scene.start();
}
function mountainLevel(env) {
    const cl = env.$ufWorldCatalog.climate || {};
    return cl.mountainLevel || 0.74;
}
function kindOf(col, mtn) {
    if (col.v > 0.62) return 0;
    if (col.water) return 1;
    if (col.r > 0.6 && col.d < 0.35) return 2;
    if (col.e >= mtn) return 3;
    if (col.t < 0.25) return 4;
    if (col.r < 0.28) return 5;
    if (col.r > 0.45) return 6;
    return 7;
}
function bandRole(z) {
    if (z >= -16 && z <= -9) return "deep";
    if (z >= -8 && z <= -1) return "shallow";
    return null;
}
function undergroundZs(env) {
    const r = env.UF.World.zRange();
    const zs = [];
    for (let z = r.zMin; z <= -1; z++) if (bandRole(z)) zs.push(z);
    return zs;
}
function expectId(col, z, mtn) {
    const role = bandRole(z);
    if (!role) return null;
    return RULES[kindOf(col, mtn)][role];
}

/**
 * Lattice over the start area. Returns problems, a signature, kinds seen, and how many
 * cells disagreed (for the coupling-off control).
 */
function surveyColumns(env, seed) {
    boot(env);
    env.UF.Levels.VERTICAL_BIOME_COUPLING = true;
    const before = env.UF.Levels.stats().genMs;
    const world = env.UF.World.newWorld(seed);
    const genMs = env.UF.Levels.stats().genMs - before;
    const problems = [];
    if (world.verticalBiomeCoupling !== true) problems.push(`flag ${world.verticalBiomeCoupling} (expected true)`);
    if (!(genMs > 0)) problems.push("generation did not run at new game");
    const L = env.UF.Levels, G = env.UF.WorldGen, mtn = mountainLevel(env);
    const zs = undergroundZs(env);
    const ax = world.startArea.x, ay = world.startArea.y;
    const parts = [];
    const kinds = new Set();
    let cells = 0, mismatches = 0;
    for (let y = 8; y < world.size; y += 16) for (let x = 8; x < world.size; x += 16) {
        const gx = ax * world.size + x, gy = ay * world.size + y;
        const col = G.columnClimate(gx, gy);
        if (!col) { problems.push(`no column at ${gx},${gy}`); continue; }
        const kind = kindOf(col, mtn);
        kinds.add(RULES[kind].kind);
        const ids = [];
        for (const z of zs) {
            const got = L.biomeAt({ area: { x: ax, y: ay }, x, y, z });
            const id = got && got.id;
            const want = expectId(col, z, mtn);
            cells++;
            if (id !== want) {
                mismatches++;
                if (problems.length < 6) problems.push(`seed ${seed} (${x},${y},z${z}) ${id} (expected ${want}, ${RULES[kind].kind})`);
            }
            ids.push(id || "-");
        }
        const shallow = ids.filter((_, i) => bandRole(zs[i]) === "shallow");
        const deep = ids.filter((_, i) => bandRole(zs[i]) === "deep");
        if (shallow.length && shallow.some(id => id !== shallow[0])) {
            if (problems.length < 6) problems.push(`seed ${seed} (${x},${y}) shallow band split ${shallow.join(",")}`);
        }
        if (deep.length && deep.some(id => id !== deep[0])) {
            if (problems.length < 6) problems.push(`seed ${seed} (${x},${y}) deep band split ${deep.join(",")}`);
        }
        if (shallow.length && deep.length && shallow[0] === deep[0]) {
            if (problems.length < 6) problems.push(`seed ${seed} (${x},${y}) shallow and deep are both ${shallow[0]}`);
        }
        parts.push(ids.join("."));
    }
    if (env._errors.length) problems.push(`console errors: ${env._errors[0].split("\n")[0]}`);
    return { problems, signature: parts.join("|"), kinds, cells, mismatches, genMs, range: `${world.zRange.zMin}..${world.zRange.zMax}` };
}

function median(xs) {
    const s = xs.slice().sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function runRange(rangeName, label) {
    console.log(`\n--- ${label} (${rangeName}) ---`);
    const env = loadRuntime(BIOME_PLUGINS, rangeName);
    boot(env);
    if (env.UF.Levels.VERTICAL_BIOME_COUPLING !== true) throw new Error("default coupling flag is not on");
    env.UF.World.newWorld(99);
    const failed = [];
    const signatures = {};
    const genMs = {};
    const kinds = new Set();
    for (const seed of SEEDS) {
        const t0 = performance.now();
        const result = surveyColumns(env, seed);
        for (const k of result.kinds) kinds.add(k);
        signatures[seed] = result.signature;
        genMs[seed] = result.genMs;
        const tag = result.problems.length ? "FAIL" : "PASS";
        if (result.problems.length) failed.push({ seed, problems: result.problems });
        console.log(`  [${tag}] seed ${seed} (${Math.round(performance.now() - t0)} ms, gen ${Math.round(result.genMs)} ms, ${result.range}): ${result.problems.length ? result.problems[0] : `${result.cells} cells`}`);
    }
    const missing = RULES.map(r => r.kind).filter(k => !kinds.has(k));
    if (missing.length) {
        failed.push({ seed: 0, problems: [`kinds not seen: ${missing.join(", ")}`] });
        console.log(`  [FAIL] kinds: missing ${missing.join(", ")}`);
    } else console.log(`  [PASS] kinds: ${RULES.map(r => r.kind).join(", ")}`);
    return { failed, signatures, genMs, kinds };
}

function checkDeterminism(rangeName, signatures) {
    const env = loadRuntime(BIOME_PLUGINS, rangeName);
    const bad = [];
    for (const seed of SEEDS) {
        const again = surveyColumns(env, seed);
        if (again.signature !== signatures[seed]) bad.push(seed);
    }
    console.log(`  [${bad.length ? "FAIL" : "PASS"}] determinism ${rangeName}: ${bad.length ? `seeds ${bad.join(", ")} differed` : `${SEEDS.length} seeds matched a second runtime`}`);
    return bad;
}

function checkCouplingOff(rangeName) {
    const env = loadRuntime(BIOME_PLUGINS, rangeName);
    boot(env);
    env.UF.Levels.VERTICAL_BIOME_COUPLING = false;
    const world = env.UF.World.newWorld(1);
    if (world.verticalBiomeCoupling !== false) return ["off-switch did not stick"];
    const L = env.UF.Levels, G = env.UF.WorldGen, mtn = mountainLevel(env);
    const zs = undergroundZs(env);
    let cells = 0, mismatches = 0;
    const ax = world.startArea.x, ay = world.startArea.y;
    for (let y = 8; y < world.size; y += 32) for (let x = 8; x < world.size; x += 32) {
        const col = G.columnClimate(ax * world.size + x, ay * world.size + y);
        for (const z of zs) {
            const got = L.biomeAt({ area: { x: ax, y: ay }, x, y, z });
            cells++;
            if (!got || got.id !== expectId(col, z, mtn)) mismatches++;
        }
    }
    const ok = world.verticalBiomeCoupling === false && mismatches > cells * 0.25;
    console.log(`  [${ok ? "PASS" : "FAIL"}] coupling off restores the independent roll: ${mismatches}/${cells} sampled cells differ from the column rule`);
    return ok ? [] : [`coupling off still matched the column rule (${mismatches}/${cells})`];
}

function timeMode(env, seed, on) {
    env.UF.Levels.discardBaselineCache();
    env.UF.Levels.VERTICAL_BIOME_COUPLING = on;
    const before = env.UF.Levels.stats().genMs;
    env.UF.World.newWorld(seed);
    return env.UF.Levels.stats().genMs - before;
}
function timePair(rangeName, seeds) {
    const env = loadRuntime(BIOME_PLUGINS, rangeName);
    boot(env);
    timeMode(env, 99, true);
    timeMode(env, 99, false);
    const on = {}, off = {};
    for (const seed of seeds) {
        const ons = [], offs = [];
        for (let k = 0; k < 3; k++) {
            ons.push(timeMode(env, seed, true));
            offs.push(timeMode(env, seed, false));
        }
        on[seed] = median(ons);
        off[seed] = median(offs);
    }
    return { on, off };
}

function checkPerformance() {
    const seeds = [1, 2, 3];
    const problems = [];
    for (const rangeName of RANGES) {
        const { on, off } = timePair(rangeName, seeds);
        const ratios = seeds.map(s => on[s] / off[s]);
        const med = median(ratios);
        const line = seeds.map(s => `${s} on ${Math.round(on[s])} / off ${Math.round(off[s])} (${(on[s] / off[s]).toFixed(3)})`).join("; ");
        const ok = med <= 1.10;
        if (!ok) problems.push(`${rangeName} median ${med.toFixed(3)}`);
        console.log(`  [${ok ? "PASS" : "FAIL"}] perf ${rangeName}: median ratio ${med.toFixed(3)} (limit 1.10); ${line}`);
    }
    return problems;
}

function chainProblems(saved) {
    const problems = [];
    const links = saved && saved.links || [];
    const chain = saved && saved.chains && saved.chains[0];
    if (!saved || saved.status !== "ready" || !chain) problems.push(`no chain (${saved && saved.status}: ${saved && saved.reason}) tested ${saved && saved.survey && saved.survey.tested}`);
    if (!saved || !(saved.survey.foundAt > 12)) problems.push(`foundAt ${saved && saved.survey && saved.survey.foundAt} (the chain has to land past the old cap of 12)`);
    if (saved && saved.survey && saved.survey.foundAt > 64) problems.push(`foundAt ${saved.survey.foundAt} past 64`);
    if (!links.some(l => l.a.z === 0 && l.b.z === -1 && l.b.z - l.a.z === -1)) problems.push("no 0 to -1 link");
    if (!links.some(l => l.a.z === -1 && l.b.z === -2)) problems.push("no -1 to -2 link");
    return problems;
}

function runChain(overrides, seed = CHAIN_SEED) {
    const env = loadRuntime(CHAIN_PLUGINS, "default", overrides);
    boot(env);
    env.UF.NewGameSetup = { year: 0, seed, faction: "human" };
    const t0 = performance.now();
    const world = env.UF.World.newWorld(seed);
    const saved = world.naturalConnections;
    const problems = chainProblems(saved);
    if (env._errors.length) problems.push(`console errors: ${env._errors[0].split("\n")[0]}`);
    return { problems, saved, ms: performance.now() - t0, cap: env.UF.NaturalConnections.SURVEY.testedCap, env, world };
}

function couplingMismatch(overrides) {
    const env = loadRuntime(BIOME_PLUGINS, "default", overrides);
    const result = surveyColumns(env, 1);
    return result.mismatches;
}

function determinismDiffers(overrides) {
    const a = loadRuntime(BIOME_PLUGINS, "default", overrides);
    const b = loadRuntime(BIOME_PLUGINS, "default", overrides);
    const sa = surveyColumns(a, 4).signature;
    const sb = surveyColumns(b, 4).signature;
    return sa !== sb;
}

function main() {
    console.log("=== VERTICAL BIOME COUPLING (WG.00.15) ===");
    if (process.argv.includes("--perf")) {
        console.log(checkPerformance().join(" | ") || "perf ok");
        process.exit(0);
    }
    const t0 = performance.now();
    const problems = [];
    const sigs = {};
    if (!CHAIN_ONLY) for (const rangeName of RANGES) {
        const run = runRange(rangeName, rangeName === "default" ? "-16..+15" : "-4..+4");
        if (run.failed.length) problems.push(...run.failed.map(f => `${rangeName} seed ${f.seed}: ${f.problems[0]}`));
        sigs[rangeName] = run.signatures;
    }
    if (!SMOKE) {
        console.log("\n--- determinism ---");
        for (const rangeName of RANGES) {
            const bad = checkDeterminism(rangeName, sigs[rangeName]);
            if (bad.length) problems.push(`determinism ${rangeName}: ${bad.join(",")}`);
        }
        console.log("\n--- coupling switch ---");
        const offProblems = checkCouplingOff("default");
        if (offProblems.length) problems.push(...offProblems);
        console.log("\n--- generation time versus coupling off ---");
        const perf = checkPerformance();
        if (perf.length) problems.push(...perf);
    }
    console.log("\n--- survey cap 12 -> 64 ---");
    const chain = runChain();
    const chainTag = chain.problems.length ? "FAIL" : "PASS";
    const foundAt = chain.saved && chain.saved.survey && chain.saved.survey.foundAt;
    const chains = chain.saved && chain.saved.chains ? chain.saved.chains.length : 0;
    console.log(`  [${chainTag}] seed ${CHAIN_SEED} cap ${chain.cap} foundAt ${foundAt} chains ${chains} (${Math.round(chain.ms)} ms): ${chain.problems.length ? chain.problems[0] : "0/-1/-2 chain"}`);
    if (chain.problems.length) problems.push(...chain.problems);

    console.log("\n--- mutants (each must fail) ---");
    if (SMOKE) {
        console.log("  [SKIP] --smoke");
        console.log(`\n${problems.length ? "FAIL" : "PASS"} ${problems.length} problem(s) (${Math.round(performance.now() - t0)} ms)`);
        process.exit(problems.length ? 1 : 0);
    }
    const mutants = [
        ["independent_roll", () => couplingMismatch({ DEUS_Levels: { "const useColumn = couplingActive();": "const useColumn = false;" } }) > 0],
        ["cap_12", () => runChain({ DEUS_NaturalConnections: { "testedCap: 64": "testedCap: 12" } }).problems.length > 0],
        ["nondeterminism", () => determinismDiffers({ DEUS_Levels: { "const kindJitter = 0;": "const kindJitter = Math.random() < 0.5 ? 1 : 0;" } })]
    ];
    for (const [name, caught] of mutants) {
        let ok = false, err = "";
        try { ok = caught(); } catch (e) { err = e && e.stack || String(e); }
        console.log(`  [${ok ? "PASS" : "FAIL"}] mutant ${name}${err ? `: ${err.split("\n")[0]}` : ""}`);
        if (!ok) problems.push(`mutant ${name} was not caught${err ? `: ${err.split("\n")[0]}` : ""}`);
    }
    console.log(`\n${problems.length ? "FAIL" : "PASS"} ${problems.length} problem(s) (${Math.round(performance.now() - t0)} ms)`);
    if (problems.length) for (const p of problems) console.log(`  - ${p}`);
    process.exit(problems.length ? 1 : 0);
}

main();
