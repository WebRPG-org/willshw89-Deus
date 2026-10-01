#!/usr/bin/env node
"use strict";

// WG.00.42: run the real World/WorldGen plugins and registered worldgen checks in
// isolated VMs. RMMZ rendering and Levels are fixtures; this is not F5 evidence.
// Mutations are in-memory source edits. Every mutant runs ALL three checks and
// must fail exactly its target, so collateral failures cannot count as kills.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const simHook = require("./lib/vm_sim_require"); // WG.00.44: UF.Sim.require and a 1x1 grid in the vm

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game/js/plugins");
const SOURCE = fs.readFileSync(path.join(PLUGINS, "DEUS_WorldGen.js"), "utf8");
const WORLD = fs.readFileSync(path.join(PLUGINS, "DEUS_World.js"), "utf8");
const CORE = fs.readFileSync(path.join(ROOT, "game/js/rmmz_core.js"), "utf8");
const CATALOG = fs.readFileSync(path.join(ROOT, "game/data/DEUS_WorldCatalog.json"), "utf8");
const SEED = 20260930;
const SIZE = 64;

function section(source, from, to) {
    const start = source.indexOf(from), end = source.indexOf(to, start + from.length);
    assert(start >= 0 && end > start, `missing runtime source section: ${from}`);
    return source.slice(start, end);
}

function fixture(source) {
    const suites = new Map();
    const env = {
        console, require, process: { env: {}, cwd: () => path.join(ROOT, "game") },
        nw: { __dirname: path.join(ROOT, "game") }, performance,
        PluginManager: { parameters: () => ({}), registerCommand() {} },
        DataManager: {
            _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false,
            makeSaveContents: () => ({}), extractSaveContents() {}
        },
        SceneManager: { _scene: null }, Input: { keyMapper: {} },
        Tilemap: function() {}, $deusWorldCatalog: JSON.parse(CATALOG),
        $gameMap: { mapId: () => 0, tilesetId: () => 2 },
        $gamePlayer: { locate() {} }
    };
    env.window = env;
    for (const name of ["Scene_Boot", "Scene_Map", "Game_Map", "Game_Player", "Game_Event", "Game_CharacterBase", "Spriteset_Map"]) {
        env[name] = function() {};
    }
    env.Scene_Boot.prototype.start = function() {};
    simHook.install(env);
    const context = vm.createContext(env);
    vm.runInContext(section(CORE, "Tilemap.TILE_ID_B =", "Tilemap.Layer ="), context);
    vm.runInContext(WORLD, context, { filename: "DEUS_World.js" });
    // Register only WorldGen's checks; the World boot hook isn't part of this fixture.
    env.Scene_Boot.prototype.start = function() {};
    vm.runInContext(source, context, { filename: "DEUS_WorldGen.js" });
    const W = env.UF.World, G = env.UF.WorldGen;
    W.state = {
        seed: SEED, size: SIZE, areasX: 2, areasY: 2, startArea: { x: 1, y: 1 },
        zRange: { zMin: -2, zMax: 2 }, units: {}, diffs: {}, objectDiffs: {}
    };
    env.UF.Tiles = {
        TILESET_ID: 2,
        groundBase: id => {
            const index = env.$deusWorldCatalog.groundKinds.findIndex(g => g.id === id);
            return index < 0 ? null : env.Tilemap.TILE_ID_A2 + index * 48;
        }
    };
    const levels = { view: 0, surface: 0, currentArea: true };
    env.UF.Levels = {
        view: () => levels.view,
        setView: z => { levels.view = z; return true; },
        groundVolumetric: () => false,
        surfaceElevationAt: () => levels.surface,
        shapeCodeAt: () => 2,
        cellAt: () => ({ water: null, biome: { id: "shallow_cave" } }),
        standableShape: () => true
    };
    W.currentArea = () => levels.currentArea ? { x: 1, y: 1 } : null;
    // Keep the underground key test independent of Year-0 settlement simulation.
    G.undergroundYear0 = null;
    env.UF.Test = { active: true, suite: (name, fn) => suites.set(name, fn) };
    new env.Scene_Boot().start();
    assert(suites.has("worldgen"), "real worldgen suite must register");
    return { env, W, G, levels, suite: suites.get("worldgen") };
}

// Stop a registered suite at an observed check, without rewriting its body or
// treating unrelated checks (images, full-size world density) as lane results.
async function through(f, target, overrides = {}) {
    const stop = Symbol("target reached"), seen = new Map();
    try {
        await f.suite({
            waitUntil: async predicate => assert(predicate(), "fixture must already be on Ground"),
            ...overrides,
            check(name, ok, detail) {
                seen.set(name, { ok: !!ok, detail });
                if (name === target) throw stop;
            }
        });
    } catch (error) {
        if (error !== stop) throw error;
    }
    assert(seen.has(target), `runtime check ${target} was not reached`);
    return { result: seen.get(target), seen };
}

async function startInMiddle(source) {
    for (const notes of ["tagged", "untagged", "mixed", "empty", "absent"]) {
        const f = fixture(source), start = f.env.$deusWorldCatalog.start;
        if (notes === "untagged") start.pair.forEach(e => { delete e.note; });
        if (notes === "mixed") delete start.pair[0].note;
        if (notes === "empty") start.pair = [];
        if (notes === "absent") delete start.pair;
        const { result } = await through(f, "start_in_middle");
        assert(result.ok, `${notes} catalog pair: ${result.detail}`);
    }
    const installed = fixture(source);
    installed.env.UF.Colonists = {};
    assert((await through(installed, "start_in_middle")).result.ok, "Colonists owns the start when installed");
    for (const defect of ["position", "name", "note", "glade", "extra_colonist"]) {
        const f = fixture(source), build = f.W.buildArea;
        f.W.buildArea = function(...args) {
            const map = build.apply(this, args);
            if (defect === "position") map.events[1].x++;
            if (defect === "name") map.events[1].name = "TEST_WRONG";
            if (defect === "note") map.events[1].note = "";
            if (defect === "glade") map.note = "";
            if (defect === "extra_colonist") map.events.push({ note: "<colonist: TEST_EXTRA>" });
            return map;
        };
        assert(!(await through(f, "start_in_middle")).result.ok, `start check must reject ${defect}`);
    }
    return "tagged/untagged/mixed/empty/absent pair and Colonists paths pass; five corrupt starts rejected";
}

async function groundTimeout(source) {
    const stuck = fixture(source);
    stuck.levels.view = 1;
    let requested = null, builds = 0, waitCalls = 0;
    stuck.env.UF.Levels.setView = z => { requested = z; return false; };
    const build = stuck.W.buildArea;
    stuck.W.buildArea = function(...args) { builds++; return build.apply(this, args); };
    const timeout = new Error("timed out after 10000 ms waiting for Ground view for worldgen checks");
    await assert.rejects(through(stuck, "tileset_id", {
        waitUntil: async (predicate, ms, description) => {
            waitCalls++;
            assert.equal(ms, 10000);
            assert.equal(description, "Ground view for worldgen checks");
            assert.equal(predicate(), false, "an outgoing current area is not Ground readiness");
            throw timeout;
        }
    }), error => error === timeout, "original timeout must bubble to the suite runner");
    assert.equal(requested, 0);
    assert.equal(waitCalls, 1);
    assert.equal(builds, 0, "timeout must stop before any later builds or checks");

    const switching = fixture(source);
    switching.levels.view = -1;
    let successWaits = 0;
    switching.env.UF.Levels.setView = z => { assert.equal(z, 0); return true; };
    const ready = await through(switching, "tileset_id", {
        waitUntil: async predicate => {
            successWaits++;
            assert.equal(predicate(), false);
            switching.levels.view = 0;
            switching.levels.currentArea = false;
            assert.equal(predicate(), false, "Ground without a current area is not ready");
            switching.levels.currentArea = true;
            assert.equal(predicate(), true);
        }
    });
    assert(ready.result.ok, ready.result.detail);
    assert.equal(successWaits, 1);
    const ground = fixture(source);
    assert((await through(ground, "tileset_id", {
        waitUntil: async () => assert.fail("already on Ground must not wait")
    })).result.ok);
    return "stale view rejected; identical timeout propagated before builds; successful switch and Ground fast path pass";
}

async function levelKeys(source) {
    const f = fixture(source), { W, G } = f;
    assert.equal(W.levelKey(1, 1, 0), "1,1", "preserve Ground key spelling");
    assert.equal(W.levelKey(1, 1, 2), "1,1,2");
    assert.equal(W.levelKey(1, 1, -2), "1,1,-2");
    const saved = new Map();
    for (const [ax, ay] of [[1, 1], [0, 1]]) {
        for (const z of [0, 1, 2, -1, -2]) {
            f.levels.surface = Math.max(z, 0);
            const map = W.buildArea(ax, ay, z), key = W.levelKey(ax, ay, z);
            assert(Array.isArray(G.kitLog[key]), `kit log missing at ${key}`);
            assert(G.stats[key], `stats missing at ${key}`);
            const count = map.ufObjects.reduce((sum, type) => sum + (type ? 1 : 0), 0);
            assert(count > 0, `nonempty object fixture required at ${key}`);
            assert.equal(Object.values(G.stats[key]).reduce((a, b) => a + b, 0), count, `stats match generated grid at ${key}`);
            for (const entry of G.kitLog[key]) {
                assert.equal(f.env.$deusWorldCatalog.objects[map.ufObjects[entry.y * SIZE + entry.x] - 1].id, entry.id);
            }
            for (const [oldKey, snapshot] of saved) {
                assert.equal(G.kitLog[oldKey], snapshot.log, `build ${key} overwrote kit log ${oldKey}`);
                assert.equal(G.stats[oldKey], snapshot.stats, `build ${key} overwrote stats ${oldKey}`);
            }
            saved.set(key, { log: G.kitLog[key], stats: G.stats[key], json: JSON.stringify([G.kitLog[key], G.stats[key]]) });
        }
    }
    assert(G.kitLog["1,1"].length > 0, "Ground kit fixture must contain placements");
    assert.equal(Object.keys(G.stats).length, 10);
    assert.equal(Object.keys(G.kitLog).length, 10);
    // Derived diagnostics are rebuilt from world state, not serialized as save truth.
    W.state = JSON.parse(JSON.stringify(W.state));
    f.levels.surface = 0;
    W.buildArea(1, 1, 0);
    assert.equal(JSON.stringify([G.kitLog["1,1"], G.stats["1,1"]]), saved.get("1,1").json);

    // Exercise the real stats/kitLog readers with a distinguishable key authority.
    // This catches hardcoded reader spelling even when today's Ground key matches it.
    const readers = fixture(source), reads = { stats: [], kitLog: [] };
    readers.W.levelKey = (ax, ay, z) => `TEST_LEVEL:${ax},${ay},${z}`;
    for (const collection of Object.keys(reads)) {
        readers.G[collection] = new Proxy({}, {
            get(target, key) { reads[collection].push(key); return target[key]; }
        });
    }
    const result = await through(readers, "kit_seeded");
    assert(result.seen.get("objects_placed").ok, result.seen.get("objects_placed").detail);
    for (const [collection, keys] of Object.entries(reads)) {
        assert(keys.length >= 2, `${collection} consumers must run`);
        assert(keys.every(key => key === "TEST_LEVEL:1,1,0"), `${collection} readers bypassed W.levelKey: ${keys}`);
    }
    return "10 area/level records isolated; counts and placements match grids; JSON rebuild and real suite readers pass";
}

const CHECKS = [
    { name: "start_in_middle", run: startInMiddle },
    { name: "ground_timeout", run: groundTimeout },
    { name: "level_keys", run: levelKeys }
];
const MUTANTS = [
    {
        name: "M1_pair_requires_colonist_tags", target: "start_in_middle",
        from: "colonistEvents.length === expectedColonists",
        to: "colonistEvents.length === expected.length"
    },
    {
        name: "M2_ground_timeout_swallowed", target: "ground_timeout",
        from: '10000, "Ground view for worldgen checks");',
        to: '10000, "Ground view for worldgen checks").catch(() => {});'
    },
    {
        name: "M3_surface_keys_omit_z", target: "level_keys",
        from: "const key = W.levelKey(ctx.areaX, ctx.areaY, z);",
        to: "const key = `${ctx.areaX},${ctx.areaY}`;"
    }
];

async function runChecks(source, label) {
    const failed = [];
    for (const check of CHECKS) {
        try {
            const detail = await check.run(source);
            console.log(`PASS ${label}.${check.name}: ${detail}`);
        } catch (error) {
            failed.push(check.name);
            console.log(`FAIL ${label}.${check.name}: ${error.message}`);
        }
    }
    return failed;
}

async function main() {
    const args = process.argv.slice(2);
    assert(args.every(arg => arg === "--mutants"), "usage: node tools/test_worldgen_quickfixes.js [--mutants]");
    console.log(`WG.00.42 WorldGen quick fixes; seed=${SEED}, size=${SIZE}; headless VM`);
    const failed = await runChecks(SOURCE, "baseline");
    console.log(`RESULT: ${CHECKS.length - failed.length} passed, ${failed.length} failed`);
    if (failed.length) { process.exitCode = 1; return; }
    if (!args.includes("--mutants")) return;
    let killed = 0;
    for (const mutant of MUTANTS) {
        assert.equal(SOURCE.split(mutant.from).length - 1, 1, `unique mutation anchor required: ${mutant.name}`);
        const failures = await runChecks(SOURCE.replace(mutant.from, mutant.to), mutant.name);
        const isolated = failures.length === 1 && failures[0] === mutant.target;
        if (isolated) killed++;
        console.log(`${isolated ? "KILLED" : "FAIL"} ${mutant.name}: expected only ${mutant.target}; failed=${failures.join(",") || "none"}`);
    }
    console.log(`MUTANTS: ${killed}/${MUTANTS.length} killed only by targeted checks`);
    if (killed !== MUTANTS.length) process.exitCode = 1;
}

main().catch(error => { console.error(error.stack); process.exitCode = 1; });
