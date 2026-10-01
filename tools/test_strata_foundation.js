#!/usr/bin/env node
"use strict";

/**
 * tools/test_strata_foundation.js
 *
 * DEUS-TSK-FABLE-19A: the five-strata geometry authority in DEUS_Levels.js (docs/DEUS_TSK_FABLE_19_HANDOFF.md,
 * docs/systems/UF_Levels.md section Strata). Runs the real plugins (DEUS_World, DEUS_WorldGen, DEUS_Tiles,
 * DEUS_Objects, DEUS_Levels, DEUS_Floors) in a Node vm, makes a New Game world, and compares with the levels code from
 * before the strata (DEUS_Levels.js and DEUS_Floors.js at commit 2d5fc47, read with git) run the same way.
 *
 * Checks (each can print FAIL; the mutants below prove it):
 *   storage_budget                strata + connectors + cached shape grids of one area's five levels <= 3.5 MB (flat Uint8Arrays)
 *   generation_deterministic      old-generator (coupling off) checksums equal the pre-strata code's; the new game's own
 *                                 checksums repeat and differ for seed + 1 (underground -2/-1 are the column rule)
 *   baseline_roundtrip            old-generator legacy views equal the pre-strata arrays byte for byte; a new game's
 *                                 -2 and -1 share the shallow-band substrate (docs/systems/DEUS_VerticalBiomes.md)
 *   solid_open_columns            every generated solid cell is 5 solid strata at full HP, open air 5 air, floor S0, ramp S0..S2
 *   fills_0_to_5                  fills 5/5 .. 0/5: shape, surfaceHeightAt, elevation, HEIGHT_k_OF_5, isSolid, solidFraction
 *   floor_on_substrate            0/5 over solid -> floor on that S4; 0/5 at zMin (nothing below) -> open; below zMin a floor
 *   legacy_shapes_match           shapeCodeAt of every cell equals the pre-strata code; materials match on the old generator
 *   surface_elevation_matches     the stood-on stratum's elevation is (S - zMin) x STRATA_PER_LAYER (S0 of level S)
 *   headroom_walkability          a floor under less than 4 strata of headroom is refused (shape and World.walkable)
 *   damage_single_stratum         damage on S2 lowers its HP; destroying it leaves S1 and S3 intact at full HP
 *   destruction_changes_shape     destroying a floor's S0 changes the derived shape, emits levels:cellChanged
 *   damage_crosses_levels_box     a box from Z-1:S4 to Z0:S0 destroys exactly those two strata
 *   sphere_aoe                    a sphere hits the strata its radius reaches at UF.Space.STRATUM_FEET, linear falloff
 *   resistance_and_hooks          resist by damage type, a material hook replaces the damage, "*" hooks, fluid hooks
 *   events_on_destruction         levels:strataDamaged / strataDestroyed / strataChanged / cellChanged payloads
 *   overburden                    hasOpaqueOverburden over the whole area matches the column; decks, gaps; Floors hook
 *   shape_grids_coherent          with edits on three levels in place, every cached shape grid equals a fresh derivation
 *   migration_no_data_loss        a real pre-strata save loads: every changed cell derives its legacy shape/material/flag
 *   migration_profiles            solid -> 5/5, open -> 0/5, floor -> S0, ramp -> 3/5, stairs -> S0 + connector, pools kept
 *   unknown_format_diagnostics    unknown schema, junk legacy entries, a corrupt strata record: console.error, nothing guessed
 *   save_load_strata_hp           strata and HP survive DataManager save/load
 *   unchanged_terrain_regenerates only changed cells are saved; a fresh new game regenerates the new game; a flag-absent
 *                                 save regenerates the old roll; setting a cell back to its baseline drops the record
 *   flag_absent_volume_cache      generator 5, same seed: a flag-absent save loaded while a coupled volume is cached
 *                                 regenerates the uncoupled checksum (the absent flag is not a coupled cache key)
 *   fluid_adapter                 0..7 <-> 0..5 tables, passage bits, FLUID_k_OF_5, deterministic
 *   no_allocation_queries         2,000,000 adapter queries: no garbage collection, heap growth < 1 B per query
 *   query_cost                    ns per shapeCodeAt, pre-strata code vs strata (same cells; reported, bound 2000 ns)
 *   no_errors                     no console.error beyond the ones the diagnostic checks provoke on purpose
 *
 * Usage: node tools/test_strata_foundation.js [--seed=20260923] [--mutant=<name>] [--legacy=<file>] [--quiet]
 * Negative controls (Rule 4; each must exit 1): MUTANTS patch DEUS_Levels.js. EXPECTATION_MUTANTS keep the plugins
 * and restore a stale expectation (old zMin, 1 ft blast, coupled world judged as the pre-strata reference).
 * Exit: 0 all checks passed, 1 a check failed, 2 harness problem.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const v8 = require("v8");
const { performance, PerformanceObserver } = require("perf_hooks");
const { execFileSync, spawnSync } = require("child_process");
const simHook = require("./lib/vm_sim_require"); // WG.00.44: UF.Sim.require and a 1x1 grid in the vm

// The allocation check needs global.gc: run again with --expose-gc when it's missing.
if (typeof global.gc !== "function") {
    const r = spawnSync(process.execPath, ["--expose-gc", __filename, ...process.argv.slice(2)], { stdio: "inherit" });
    process.exit(r.status === null ? 2 : r.status);
}

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const LEGACY_COMMIT = "2d5fc47";
const arg = (name, fallback) => {
    const a = process.argv.find(x => x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : fallback;
};
const SEED = parseInt(arg("seed", "20260923"), 10) >>> 0;
const SEED2 = (SEED + 7) >>> 0;
const mutant = arg("mutant", "");
const quiet = process.argv.includes("--quiet");

// Mutants: exact source edits of DEUS_Levels.js, applied in memory. A missing target is a harness problem (exit 2).
const MUTANTS = {
    storage_fat: ["const n = b.size * b.size, m = new Uint8Array(n * STRATA), conn", "const n = b.size * b.size, m = new Uint8Array(n * STRATA * 3), conn"],
    lost_fluid: ["if (water && water[i] && fill < 2) { m[o + 1] = fluid; m[o + 2] = fluid; }", "/* MUTANT lost_fluid */"],
    no_headroom: ["return pack(head >= 4 ? FLOOR : SOLID,", "return pack(head >= 0 ? FLOOR : SOLID, /* MUTANT no_headroom */"],
    floor_needs_no_support: ["if (sup < 0) return pack(OPEN, false, STONE);", "if (sup < 0) return pack(FLOOR, false, STONE); /* MUTANT */"],
    damage_neighbour: ["            } else rec[REC_HP + s] = hp;", "            } else { rec[REC_HP + s] = hp; if (s < 4 && SOLID_B[rec[REC_M + s + 1]]) rec[REC_HP + s + 1] = hp; } /* MUTANT */"],
    no_cross_z: ["const levelOfElevation = e => Math.floor(e / STRATA) + ZR.zMin;", "const levelOfElevation = e => Math.ceil(e / STRATA) + ZR.zMin; /* MUTANT */"],
    resist_ignored: ["ctx.effective = damage * (mat.resist[damageType] !== undefined ? mat.resist[damageType] : 1);", "ctx.effective = damage; /* MUTANT */"],
    hooks_ignored: ["        runHooks(mat.key, ctx);\n        runHooks(\"*\", ctx);", "        /* MUTANT hooks_ignored */"],
    no_destroy_event: ["emit(\"levels:strataDestroyed\",", "(() => {})(\"levels:strataDestroyed\","],
    overburden_one_level: ["for (let z = qZ + 1, top = Math.min(ZR.zMax, colTop); z <= top; z++) {", "for (let z = qZ + 1, top = Math.min(ZR.zMax, colTop, qZ + 1); z <= top; z++) {"],
    overburden_no_gap: ["if (f < STRATA && (solidMaskOf(rdM, rdO) >> f) !== 0) return true;", "/* MUTANT overburden_no_gap */"],
    hp_not_saved: ["for (let k = 0; k < REC; k++) s += HEX[r[k] >> 4] + HEX[r[k] & 15];", "for (let k = 0; k < REC; k++) { const v = k >= REC_HP && r[k] ? 255 : r[k]; s += HEX[v >> 4] + HEX[v & 15]; }"],
    migration_drops_constructed: ["const byte = (LEGACY_TO_M[p >> 4] || M_STONE) | ((p & 8) ? M_BUILT : 0);", "const byte = (LEGACY_TO_M[p >> 4] || M_STONE); /* MUTANT */"],
    migration_ramp_flat: ["const fill = s === SOLID ? STRATA : s === RAMP ? 3 : (s === FLOOR || s >= STAIR_UP) ? 1 : 0;\n        for (let k = 0; k < fill; k++) { r[REC_M + k] = byte;", "const fill = s === SOLID ? STRATA : s === RAMP ? 1 : (s === FLOOR || s >= STAIR_UP) ? 1 : 0;\n        for (let k = 0; k < fill; k++) { r[REC_M + k] = byte;"],
    unknown_schema_accepted: ["const schemaKnown = st => st.strataSchemaVersion === undefined || st.strataSchemaVersion === STRATA_SCHEMA;", "const schemaKnown = st => true; /* MUTANT */"],
    junk_applied: ["if (!ok) { keep(L, ak, k, p); continue; }", "if (!ok) { rec.invalid++; todo.push({ z, ax: a.x, ay: a.y, i: i | 0, p: p | 0 }); continue; }"],
    baseline_records_kept: ["putDelta(st, z, ax, ay, i, sameAsBaseline(b, i, rec) ? null : rec);", "putDelta(st, z, ax, ay, i, rec); /* MUTANT */"],
    fluid_table_wrong: ["const FLUID_TO_STRATA = Object.freeze([0, 1, 1, 2, 3, 4, 4, 5]);", "const FLUID_TO_STRATA = Object.freeze([0, 1, 2, 2, 3, 4, 4, 5]);"],
    alloc_in_query: ["        qX |= 0; qY |= 0;", "        qX |= 0; qY |= 0; qLeak = { a, b };"],
    slow_query: ["    const queriedPacked = () => { stats.shapeReads++;", "    const queriedPacked = () => { for (let spin = 0; spin < 50; spin++) Math.sqrt(spin); stats.shapeReads++;"],
    stale_grid: ["        (L.strata[key] = L.strata[key] || {})[i] = encodeRecord(r);\n        refreshPacked(st, z, ax, ay, i);", "        (L.strata[key] = L.strata[key] || {})[i] = encodeRecord(r); /* MUTANT stale_grid */"],
    stale_neighbours: ["for (let zz = Math.max(r.zMin, z - 1); zz <= Math.min(r.zMax, z + 1); zz++) {", "for (let zz = z; zz <= z; zz++) { /* MUTANT stale_neighbours */"],
    error_injected: ["    function migrateSaveToFiveStrata(st) {", "    function migrateSaveToFiveStrata(st) {\n        console.error(\"MUTANT error_injected\");"]
};
const EXTRA_DECL = { alloc_in_query: ["    let qSt = null,", "    let qLeak = null;\n    let qSt = null,"] };
// Expectation mutants do not touch the plugins. Each one puts back a rule the docs retired, and the live world must fail it.
const EXPECTATION_MUTANTS = {
    old_zmin: "default-range elevations use Z_RANGES.legacy.zMin (the pre-WG.00.17 (S + 2) x 5 frame)",
    legacy_as_default: "the legacy-range proof is judged with Z_RANGES.default.zMin",
    blast_1ft: "the sphere is judged at a 1 ft stratum (the pre-WG.00.17 blast table)",
    coupled_vs_pre_strata: "the coupling-on new game is required to match the pre-strata -2/-1 bytes",
    old_save_as_new_game: "a flag-absent save is required to regenerate a coupling-on new game",
    shallow_band_split: "a new game's Z-2 is required to differ from Z-1 (the old deep-set split)"
};
if (mutant && !MUTANTS[mutant] && !EXPECTATION_MUTANTS[mutant]) {
    console.log(`HARNESS unknown mutant "${mutant}"; known: ${Object.keys(MUTANTS).join(", ")}; ${Object.keys(EXPECTATION_MUTANTS).join(", ")}`);
    console.log("RESULT: 0 passed, 0 failed (exit 2)");
    process.exit(2);
}

let passed = 0, failed = 0;
const failures = [];
function check(name, ok, detail = "") {
    if (ok) passed++;
    else { failed++; failures.push(name); }
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " - " + detail : ""}`);
    return !!ok;
}
function harnessProblem(msg) {
    console.log(`HARNESS ${msg}`);
    console.log(`RESULT: ${passed} passed, ${failed} failed (exit 2)`);
    process.exit(2);
}
function guard(name, fn) {
    try { return fn(); } catch (e) { check(name, false, `threw ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`); return null; }
}

//-----------------------------------------------------------------------------
// Sources: the working tree (strata) and the pre-strata commit (legacy).

const FILES = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Tiles.js", "DEUS_Objects.js", "DEUS_Levels.js", "DEUS_Floors.js"];
function currentSources() {
    const s = {};
    for (const f of FILES) s[f] = fs.readFileSync(path.join(PLUGINS, f), "utf8");
    if (MUTANTS[mutant]) {
        const [find, replace] = MUTANTS[mutant];
        if (!s["DEUS_Levels.js"].includes(find)) harnessProblem(`mutant ${mutant}: target not found in DEUS_Levels.js`);
        s["DEUS_Levels.js"] = s["DEUS_Levels.js"].replace(find, replace);
        if (EXTRA_DECL[mutant]) {
            const [f2, r2] = EXTRA_DECL[mutant];
            if (!s["DEUS_Levels.js"].includes(f2)) harnessProblem(`mutant ${mutant}: declaration target not found`);
            s["DEUS_Levels.js"] = s["DEUS_Levels.js"].replace(f2, r2);
        }
    }
    return s;
}
function legacySources() {
    const s = {};
    for (const f of FILES) s[f] = fs.readFileSync(path.join(PLUGINS, f), "utf8");
    const file = arg("legacy", "");
    try {
        s["DEUS_Levels.js"] = file ? fs.readFileSync(file, "utf8") : execFileSync("git", ["show", `${LEGACY_COMMIT}:game/js/plugins/DEUS_Levels.js`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 });
        if (!file) s["DEUS_Floors.js"] = execFileSync("git", ["show", `${LEGACY_COMMIT}:game/js/plugins/DEUS_Floors.js`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 });
    } catch (e) {
        harnessProblem(`can't read the pre-strata DEUS_Levels.js (git show ${LEGACY_COMMIT}; or pass --legacy=<file>): ${e.message}`);
    }
    if (s["DEUS_Levels.js"].includes("function derivePacked(")) harnessProblem("the legacy DEUS_Levels.js already has strata");
    return s;
}

//-----------------------------------------------------------------------------
// The vm: RMMZ stubs only where the plugins touch the engine (as tools/test_volumetric_terrain_column.js).

function setup(sources, tag, zRange) {
    const list = {};
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, "game/js/plugins.js"), "utf8"), list);
    const ns = {}, warnings = [], errors = [];
    const canvasCtx = () => ({
        imageSmoothingEnabled: false, createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData() {}, drawImage() {}, fillRect() {}, clearRect() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    });
    const env = {
        window: null, UF: ns, DEUS: ns, Math, performance, setTimeout, clearTimeout,
        console: {
            log: (...a) => { if (!quiet && process.env.DEUS_VM_LOG) console.log(`  [VM ${tag}]`, ...a); },
            warn: (...a) => warnings.push(a.map(String).join(" ")),
            error: (...a) => errors.push(a.map(x => (x && x.stack) || String(x)).join(" "))
        },
        document: { createElement: () => ({ width: 0, height: 0, getContext: canvasCtx }) },
        PluginManager: { parameters: name => (list.$plugins && list.$plugins.find(p => p.name === name) || {}).parameters || {}, registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false, createGameObjects() {} },
        Input: { keyMapper: {} }, TouchInput: { _currentState: {} }, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        ImageManager: { loadTileset() { return null; } },
        Utils: { isOptionValid: () => false, encodeURI: s => s },
        Tilemap: function() {},
        $dataTilesets: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/Tilesets.json"), "utf8")),
        $ufWorldCatalog: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/UF_WorldCatalog.json"), "utf8")),
        $ufTime: { year: 1, monthIndex: 0, day: 1, hour: 8, minute: 0 },
        $gameSystem: {}, $gameScreen: { weatherType: () => "none", weatherPower: () => 0, changeWeather() {} },
        $gameTimer: {}, $gameSwitches: {}, $gameVariables: {}, $gameSelfSwitches: {}, $gameActors: {}, $gameParty: {}
    };
    // Only a requested range is visible. The host environment is not copied, so an ambient DEUS_Z_RANGE cannot move the default world.
    if (zRange) env.process = { env: { DEUS_Z_RANGE: String(zRange) } };
    env.window = env;
    env.$deusWorldCatalog = env.$ufWorldCatalog;
    env.Tilemap.TILE_ID_A1 = 2048;
    env.Tilemap.TILE_ID_A2 = 2816;
    env.Tilemap.isTileA1 = id => id >= 2048 && id < 2816;
    env.Tilemap.isWaterTile = id => env.Tilemap.isTileA1(id);
    for (const name of ["Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_Map", "Game_Player", "Game_CharacterBase", "Game_Event", "Spriteset_Map", "Spriteset_Base"]) {
        env[name] = vm.runInNewContext(`(function ${name}(){})`);
        env[name].prototype.initialize = function() {};
    }
    env.Scene_Boot.prototype.start = function() {};
    env.Scene_Boot.prototype.isReady = function() { return true; };
    env.Spriteset_Map.prototype.createCharacters = function() {};
    env.Sprite = vm.runInNewContext(`(function Sprite(bitmap) {
        this.anchor = { x: 0, y: 0, set(a, b) { this.x = a; this.y = b; } };
        this.children = []; this.parent = null; this.visible = true; this.bitmap = bitmap || null; this.x = 0; this.y = 0; this.z = 0;
    })`);
    Object.assign(env.Sprite.prototype, { update() {}, addChild(c) { c.parent = this; this.children.push(c); return c; } });
    env.Bitmap = vm.runInNewContext(`(function Bitmap(w, h) {
        this.width = w || 0; this.height = h || 0;
        this.context = { imageSmoothingEnabled: false, drawImage() {}, putImageData() {}, fillRect() {} };
        this._baseTexture = { update() {} };
    })`);
    Object.assign(env.Bitmap.prototype, { isReady() { return true; }, isError() { return false; }, clear() {}, clearRect() {}, fillRect() {}, blt() {} });
    env.Bitmap.load = () => ({ isReady: () => false, isError: () => false });
    Object.assign(env.Game_Map.prototype, {
        mapId() { return this._mapId || 0; }, width: () => 256, height: () => 256, update() {}, tileId: () => 0, tilesetFlags: () => [],
        isPassable: () => true, checkPassage: () => true,
        displayX() { return 0; }, displayY() { return 0; }, screenTileX: () => 17, screenTileY: () => 13,
        adjustX(x) { return x; }, adjustY(y) { return y; },
        roundXWithDirection: (x, d) => x + (d === 6 ? 1 : d === 4 ? -1 : 0), roundYWithDirection: (y, d) => y + (d === 2 ? 1 : d === 8 ? -1 : 0),
        eventsXy: () => [], eventsXyNt: () => []
    });
    Object.assign(env.Game_Player.prototype, { isTransferring: () => false, direction: () => 2, locate(x, y) { this.x = x; this.y = y; } });
    env.$gameMap = new env.Game_Map();
    env.$gameMap._events = [];
    env.$gamePlayer = new env.Game_Player();
    env.$gamePlayer.x = 128;
    env.$gamePlayer.y = 128;
    simHook.install(env);
    const ctx = vm.createContext(env);
    const section = (src, a, b) => {
        const i = src.indexOf(a), j = src.indexOf(b, i + a.length);
        if (i < 0 || j <= i) harnessProblem(`engine source section missing: ${a}`);
        return src.slice(i, j);
    };
    const core = fs.readFileSync(path.join(ROOT, "game/js/rmmz_core.js"), "utf8");
    const mgr = fs.readFileSync(path.join(ROOT, "game/js/rmmz_managers.js"), "utf8");
    const deus = fs.readFileSync(path.join(PLUGINS, "DEUS_Core.js"), "utf8");
    vm.runInContext(section(mgr, "DataManager.makeSaveContents =", "DataManager.correctDataErrors ="), ctx, { filename: "rmmz_managers.js" });
    vm.runInContext(section(core, "function JsonEx()", "//-----------------------------------------------------------------------------"), ctx, { filename: "rmmz_core.js JsonEx" });
    vm.runInContext(section(core, "Tilemap.TILE_ID_B =", "Tilemap.Layer ="), ctx, { filename: "rmmz_core.js Tilemap constants" });
    vm.runInContext(section(deus, "window.DEUS = window.DEUS || {};", "//-----------------------------------------------------------------------------"), ctx, { filename: "DEUS_Core.js events" });
    for (const f of FILES) vm.runInContext(sources[f], ctx, { filename: `${tag}/${f}` });
    env.DataManager.onLoad(env.$dataTilesets);
    new env.Scene_Boot().start();
    env.__warnings = warnings;
    env.__errors = errors;
    return env;
}
function newWorld(env, seed) {
    env.UF.NewGameSetup = { seed, year: 1, levelsGen: 4 };   // 19A's comparisons are generator 4's (19B's generator 5: test_strata_cuts_and_caves.js)
    const t0 = performance.now();
    env.UF.World.newWorld(seed);
    return performance.now() - t0;
}
// A new game copies VERTICAL_BIOME_COUPLING onto the state (default true). False is the pre-WG.00.15 province roll.
function newWorldUncoupled(env, seed) {
    const Levels = env.UF.Levels;
    const prev = Levels.VERTICAL_BIOME_COUPLING;
    Levels.VERTICAL_BIOME_COUPLING = false;
    try { return newWorld(env, seed); }
    finally { Levels.VERTICAL_BIOME_COUPLING = prev; }
}
// A save through RMMZ's own DataManager (the functions the plugins alias), as a JSON string, and a load of one.
function saveJson(env) {
    const c = env.DataManager.makeSaveContents();
    return env.JsonEx.stringify({ ufWorld: c.ufWorld });
}
function loadJson(env, json, edit) {
    const c = env.JsonEx.parse(json);
    if (edit) edit(c.ufWorld);
    const contents = { system: env.$gameSystem, screen: env.$gameScreen, timer: env.$gameTimer, switches: env.$gameSwitches,
        variables: env.$gameVariables, selfSwitches: env.$gameSelfSwitches, actors: env.$gameActors, party: env.$gameParty,
        map: env.$gameMap, player: env.$gamePlayer, ufWorld: c.ufWorld };
    env.DataManager.extractSaveContents(contents);
    return env.UF.World.state;
}

//-----------------------------------------------------------------------------

const SOLID = 1, FLOOR = 2, OPEN = 3, RAMP = 4, STAIR_UP = 5;
const MB = 3.5e6;
const errorsExpected = [];

console.log(`=== DEUS-TSK-FABLE-19A strata foundation: seed ${SEED} (second seed ${SEED2})${mutant ? `, MUTANT ${mutant}` : ""} ===`);
const T0 = performance.now();
const env = setup(currentSources(), "strata");
const W = env.UF.World, L = env.UF.Levels, F = env.UF.Floors;
if (!W || !L || !F || typeof L.setStrata !== "function") harnessProblem("plugins did not load (World/Levels/Floors with strata)");
const tNew = newWorld(env, SEED);
const legacy = setup(legacySources(), "legacy");
const LW = legacy.UF.World, LL = legacy.UF.Levels;
const tOld = newWorld(legacy, SEED);
// The pre-WG.00.15 roll (docs/systems/DEUS_VerticalBiomes.md: a world whose flag is off keeps the 4x4 province bytes).
const uncoupled = setup(currentSources(), "uncoupled");
const tUn = newWorldUncoupled(uncoupled, SEED);
const UL = uncoupled.UF.Levels;
const U = uncoupled.UF.World;
// The legacy frame, requested by name. Elevations there are the pre-WG.00.17 numbers (zMin -2).
const legacyRange = setup(currentSources(), "legacy-range", "legacy");
const tLeg = newWorld(legacyRange, SEED);
const LegL = legacyRange.UF.Levels, LegW = legacyRange.UF.World;
const st = W.state, size = st.size, n = size * size, a = { x: st.startArea.x, y: st.startArea.y };
console.log(`INFO newWorld ${tNew.toFixed(0)} ms with strata, ${tOld.toFixed(0)} ms pre-strata, ${tUn.toFixed(0)} ms uncoupled, ${tLeg.toFixed(0)} ms legacy range; area ${a.x},${a.y}, ${size}x${size}`);
console.log(`INFO zRange new game ${W.zRange().zMin}..${W.zRange().zMax} (Z_RANGES.default), legacy proof ${LegW.zRange().zMin}..${LegW.zRange().zMax} (Z_RANGES.legacy); stratum ${env.UF.Space.STRATUM_FEET} ft, ${env.UF.Space.STRATA_PER_LAYER} strata/layer, cell ${env.UF.Space.GRID_SIZE_FEET} ft`);
console.log(`INFO coupling new game ${st.verticalBiomeCoupling}, old-generator world ${U.state.verticalBiomeCoupling}`);
const LEVELS = [-2, -1, 0, 1, 2];
const ref = (x, y, z) => ({ area: { x: a.x, y: a.y }, x, y, z });
const bytes = s => s.bytes.join(",");

// Truth from the pre-strata vm: its generated arrays per level.
const oldB = {};
for (const z of LEVELS) oldB[z] = LL.baseline(z, a.x, a.y);
const S = L.surfaceGrid(a.x, a.y);

// Fixture cells from the pre-strata arrays (the strata vm is never used to pick its own test cells).
function findCell(pred, from = 0) {
    for (let i = from; i < n; i++) {
        const x = i % size, y = (i / size) | 0;
        if (x < 8 || y < 8 || x >= size - 8 || y >= size - 8) continue;
        if (pred(i, x, y)) return { x, y, i };
    }
    return null;
}
const shp = (z, i) => oldB[z].shape[i];
const around = (z, x, y, code) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (shp(z, (y + dy) * size + x + dx) !== code) return false; return true; };
const valley = findCell((i, x, y) => S[i] === 0 && shp(0, i) === FLOOR && shp(1, i) === OPEN && shp(2, i) === OPEN && shp(-1, i) === SOLID && around(0, x, y, FLOOR));
const valley2 = valley && findCell((i, x, y) => S[i] === 0 && shp(0, i) === FLOOR && shp(1, i) === OPEN && shp(-1, i) === SOLID && around(0, x, y, FLOOR) && Math.abs(x - valley.x) > 12, valley.i + 1);
const deepRock = findCell((i, x, y) => shp(-2, i) === SOLID && shp(-1, i) === SOLID && shp(0, i) === SOLID && around(-1, x, y, SOLID) && around(0, x, y, SOLID));
const pool = findCell(i => shp(-1, i) === FLOOR && oldB[-1].water && oldB[-1].water[i] && oldB[-1].material[i] !== undefined);
const cave = findCell((i, x, y) => shp(-1, i) === FLOOR && !(oldB[-1].water && oldB[-1].water[i]) && around(-1, x, y, FLOOR));
const cave2 = cave && findCell((i, x, y) => shp(-1, i) === FLOOR && !(oldB[-1].water && oldB[-1].water[i]) && around(-1, x, y, FLOOR) && Math.abs(x - cave.x) + Math.abs(y - cave.y) > 10, cave.i + 1);
const hillTop = findCell((i, x, y) => S[i] === 1 && shp(1, i) === FLOOR && shp(0, i) === SOLID && shp(2, i) === OPEN && around(1, x, y, FLOOR));
const deep2 = findCell(i => shp(-2, i) === FLOOR && !(oldB[-2].water && oldB[-2].water[i]));
const fixtures = { valley, valley2, deepRock, pool, cave, cave2, hillTop, deep2 };
const missing = Object.keys(fixtures).filter(k => !fixtures[k]);
if (missing.length) harnessProblem(`no fixture cell for ${missing.join(", ")} in seed ${SEED}`);
console.log(`INFO fixtures ${Object.entries(fixtures).map(([k, c]) => `${k} (${c.x},${c.y})`).join(", ")}`);

// Events, recorded from here on.
const events = [];
for (const name of ["levels:strataChanged", "levels:strataDamaged", "levels:strataDestroyed", "levels:shapeChanged", "levels:cellChanged"]) {
    env.UF.Events.on(name, (...args) => events.push({ name, args }));
}
const eventsSince = (k, name) => events.slice(k).filter(e => e.name === name);
const snapshot = c => LEVELS.map(z => L.strataAt(ref(c.x, c.y, z)));
const restore = (c, snap) => LEVELS.forEach((z, k) => { const b = snap[k]; L.setStrata(ref(c.x, c.y, z), { m: b.bytes, hp: b.hp, connector: b.connector || 0 }); });
const matOf = key => L.STRATA_MATERIALS.find(m => m.key === key);

// Elevation and blast geometry from the live scale (docs/systems/DEUS_ZRange.md section 7):
// e = (z - zMin) x STRATA_PER_LAYER + s; a stratum's middle is (e + 0.5) x STRATUM_FEET.
// Expectation mutants substitute a retired input; the worlds themselves are not changed.
function liveSpace(worldEnv) {
    const Wr = worldEnv.UF.World, Sp = worldEnv.UF.Space, r = Wr.zRange();
    return { zMin: r.zMin, zMax: r.zMax, strata: Sp.STRATA_PER_LAYER, feet: Sp.STRATUM_FEET, cell: Sp.GRID_SIZE_FEET };
}
function expectSpace(worldEnv, role) {
    const sp = liveSpace(worldEnv);
    if (role === "default" && mutant === "old_zmin") sp.zMin = worldEnv.UF.World.Z_RANGES.legacy.zMin;
    if (role === "legacy" && mutant === "legacy_as_default") sp.zMin = worldEnv.UF.World.Z_RANGES.default.zMin;
    if (mutant === "blast_1ft") sp.feet = 1;
    return sp;
}
const elevOf = (sp, z, s) => (z - sp.zMin) * sp.strata + s;
const spNew = expectSpace(env, "default");
const spOld = expectSpace(legacyRange, "legacy");
function sameBytes(x, y) {
    if (!x !== !y) return false;
    if (!x) return true;
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
    return true;
}
function codesIn(arr, lo, hi) {
    if (!arr || !arr.length) return false;
    for (let i = 0; i < arr.length; i++) if (arr[i] < lo || arr[i] > hi) return false;
    return true;
}
// The new game's strata bytes, copied before any edit. A later load replaces the state; the copy is the new-game baseline.
const coupledM = {};
for (const z of LEVELS) coupledM[z] = Buffer.from(L.baseline(z, a.x, a.y).strata.m);
const provinceWorld = () => mutant === "coupled_vs_pre_strata" ? L : UL;

//---------------------------------------------------------------- storage_budget
guard("storage_budget", () => {
    const b0 = L.baseline(-1, a.x, a.y);
    for (const z of LEVELS) L.shapeCodeAt(a.x, a.y, 0, 0, z);   // every level's cached shape grid built
    const lazyBefore = ["shape", "material", "water"].every(k => { const d = Object.getOwnPropertyDescriptor(L.baseline(1, a.x, a.y), k); return !d || typeof d.get === "function"; });
    const mem = L.strataMemory(a.x, a.y);
    const flat = LEVELS.every(z => { const b = L.baseline(z, a.x, a.y); return Object.prototype.toString.call(b.strata.m) === "[object Uint8Array]"; })
        && LEVELS.every(z => L.baseline(z, a.x, a.y).strata.m.length === n * 5);
    const core = mem.strata + mem.connectors + mem.shapeGrids;
    check("storage_budget", core <= MB && flat && lazyBefore && !b0.strata.hp && mem.shapeGrids === 5 * n,
        `strata ${mem.strata} B + connectors ${mem.connectors} B + cached shape grids ${mem.shapeGrids} B = ${core} B (${(core / 1048576).toFixed(2)} MiB) for the 5 levels of area ${a.x},${a.y}, limit ${MB} B; ` +
        `also held: biome ${mem.biome} B, shared surface grid ${mem.surface} B, legacy views built so far ${mem.legacyViews} B, total ${mem.total} B; ` +
        `flat Uint8Array ${n}x5 per level ${flat}; baseline HP implicit (full) ${!b0.strata.hp}; +1 legacy views not built before a read ${lazyBefore}`);
});

//---------------------------------------------------------------- generation_deterministic, baseline_roundtrip, solid_open_columns
// Checksums. z === 0 is the live world's WorldGen lattice (no seed argument): no seed+1 test there.
function checksumOf(Lx, state, z) {
    const gen = state.levels[String(z)].gen;
    const own = Lx.checksum(z), rep = Lx.checksum(z, SEED, gen), other = Lx.checksum(z, SEED + 1, gen), own2 = Lx.checksum(z, SEED2, gen);
    const stored = state.levels[String(z)].checksum;
    const stable = own === rep && own === stored && own !== "n/a" && (z === 0 || own !== other);
    return { gen, own, rep, other, own2, stored, stable };
}
guard("generation_deterministic", () => {
    const rows = [];
    let ok = st.verticalBiomeCoupling === true && U.state.verticalBiomeCoupling === false;
    if (!ok) rows.push(`flags new ${st.verticalBiomeCoupling} / old-generator ${U.state.verticalBiomeCoupling} (want true / false)`);
    const pre = {}, pre2 = {};
    for (const z of LEVELS) {
        const gen = st.levels[String(z)].gen;
        pre[z] = LL.checksum(z);
        pre2[z] = LL.checksum(z, SEED2, gen);
    }
    const provL = provinceWorld();
    const provState = provL === L ? st : U.state;
    for (const z of LEVELS) {
        const A = checksumOf(provL, provState, z);
        const match = A.own === pre[z] && (z === 0 || A.own2 === pre2[z]);
        if (!A.stable || !match) ok = false;
        rows.push(z === 0
            ? `old-generator 0: ${A.own}/${pre[z]}${match ? "" : " DIFFERENT"} (WorldGen lattice)`
            : `old-generator ${z}: ${A.own}/${pre[z]}${match ? "" : " DIFFERENT"}, repeat ${A.rep === A.own ? "same" : "DIFFERENT"}, seed+1 ${A.own !== A.other ? "differs" : "SAME"}, seed ${SEED2} ${A.own2 === pre2[z] ? "same" : `DIFFERENT ${A.own2}/${pre2[z]}`}`);
    }
    for (const z of LEVELS) {
        const A = checksumOf(L, st, z);
        // Coupling names -2/-1 only. The ground, +1 and +2 stay the pre-strata checksum (DEUS_VerticalBiomes.md).
        const surface = z < 0 || A.own === pre[z];
        if (!A.stable || !surface) ok = false;
        const underground = z < 0 ? `, new-generator ${A.own} (not required to equal pre-strata ${pre[z]})` : "";
        rows.push(`new game ${z}: repeat ${A.rep === A.own ? "same" : "DIFFERENT"}, seed+1 ${z === 0 ? "n/a" : (A.own !== A.other ? "differs" : "SAME")}${z >= 0 ? `, pre-strata ${A.own === pre[z] ? "same" : "DIFFERENT"}` : ""}${underground}`);
    }
    check("generation_deterministic", ok, `checksums: ${rows.join("; ")}`);
});
function viewDiffs(Lx, levels, keys) {
    const bad = [];
    for (const z of levels) {
        const b = Lx.baseline(z, a.x, a.y), o = oldB[z];
        for (const k of keys) {
            const x = b[k], y = o[k];
            if (!x !== !y) { bad.push(`${z}.${k} present ${!!x}/${!!y}`); continue; }
            if (!x) continue;
            let diff = 0;
            for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) diff++;
            if (diff || x.length !== y.length) bad.push(`${z}.${k} ${diff} cells differ`);
        }
    }
    return bad;
}
guard("baseline_roundtrip", () => {
    const provL = provinceWorld();
    const bad = viewDiffs(provL, LEVELS, ["shape", "material", "water", "biome"]);
    // The new game keeps the pre-strata shapes and water. Coupling does not carve. Surface levels keep their grids.
    bad.push(...viewDiffs(L, LEVELS, ["shape", "water"]).map(s => `new game ${s}`));
    bad.push(...viewDiffs(L, [0, 1, 2], ["material", "biome"]).map(s => `new game ${s}`));
    const b2 = L.baseline(-2, a.x, a.y).biome, b1 = L.baseline(-1, a.x, a.y).biome;
    const u2 = UL.baseline(-2, a.x, a.y).biome, u1 = UL.baseline(-1, a.x, a.y).biome;
    // Z-1 and Z-2 are both shallow (-8..-1): one substrate id per column. The old Z-2 roll is the deep set, codes 5..8.
    const coupledShallow = sameBytes(b2, b1) && codesIn(b2, 1, 4) && codesIn(b1, 1, 4);
    const oldSplit = !sameBytes(u2, u1) && codesIn(u2, 5, 8) && codesIn(u1, 1, 4);
    const bandOk = (mutant === "shallow_band_split" ? !coupledShallow : coupledShallow) && oldSplit;
    if (!bandOk) bad.push(`bands coupled -2/-1 ${coupledShallow ? "one shallow grid" : "NOT one shallow grid"} (want ${mutant === "shallow_band_split" ? "the old Z-1/Z-2 split" : "one shallow grid"}), old-generator -2 deep / -1 shallow ${oldSplit}`);
    check("baseline_roundtrip", !bad.length, bad.length ? bad.join("; ") : `old-generator shape, material, water and biome equal the pre-strata arrays byte for byte (${n} cells, 5 levels); new game shapes and water match, and -2/-1 are one shallow-band grid`);
});
guard("solid_open_columns", () => {
    const counts = { solid: 0, open: 0, floor: 0, ramp: 0, stairs: 0, pools: 0 }, bad = [];
    for (const z of LEVELS) {
        const b = L.baseline(z, a.x, a.y), m = b.strata.m, o = oldB[z];
        for (let i = 0; i < n; i++) {
            const s = o.shape[i], p = i * 5, mm = [m[p], m[p + 1], m[p + 2], m[p + 3], m[p + 4]];
            const solidN = mm.filter(v => v >= 1 && v <= 3).length, fluidN = mm.filter(v => v === 4 || v === 5).length;
            const water = o.water && o.water[i];
            let good;
            if (s === SOLID) { good = solidN === 5; counts.solid++; }
            else if (s === OPEN) { good = mm.every(v => v === 0); counts.open++; }
            else if (s === FLOOR) { good = mm[0] >= 1 && mm[0] <= 3 && solidN === 1 && (water ? fluidN === 2 && mm[1] === (z === -2 ? 5 : 4) : fluidN === 0); counts.floor++; if (water) counts.pools++; }
            else if (s === RAMP) { good = solidN === 3 && mm[0] && mm[1] && mm[2] && !mm[3] && !mm[4]; counts.ramp++; }
            else { good = solidN === 1 && mm[0] >= 1; counts.stairs++; }
            if (!good && bad.length < 5) bad.push(`${z} (${i % size},${(i / size) | 0}) code ${s}: [${mm}]`);
            if (!good) counts.bad = (counts.bad || 0) + 1;
        }
    }
    const hpFull = [-1, 0].every(z => { const r = L.strataAt(ref(deepRock.x, deepRock.y, z)); return r.hp.every(h => h === 255); });
    check("solid_open_columns", !counts.bad && hpFull && counts.solid > 0 && counts.open > 0 && counts.ramp > 0 && counts.pools > 0,
        `5 levels: solid ${counts.solid} (5/5 solid strata), open ${counts.open} (5/5 air), floor ${counts.floor} (S0; ${counts.pools} pools with S1..S2 water/lava), ramp ${counts.ramp} (S0..S2), stairs ${counts.stairs} (S0); wrong ${counts.bad || 0}${bad.length ? `: ${bad.join("; ")}` : ""}; solid strata at full HP (255) ${hpFull}`);
});

//---------------------------------------------------------------- fills and derived shapes
// k solid strata from S0 on +1. k = 0 is air over the valley floor (its S4 is air): nothing to stand on, elevation -1.
function fillsProof(Lx, sp, c) {
    const r1 = { area: a, x: c.x, y: c.y, z: 1 }, rows = [];
    let ok = true;
    for (let k = 5; k >= 0; k--) {
        const m = [0, 1, 2, 3, 4].map(s => s < k ? "stone" : "air");
        const set = Lx.setStrata(r1, { m });
        const want = { shape: k === 5 ? "solid" : k === 0 ? "open" : "floor", top: k - 1, elev: k ? elevOf(sp, 1, k - 1) : -1, state: `HEIGHT_${k}_OF_5`, solid: k === 5, frac: k / 5 };
        const got = { shape: Lx.shapeAt(r1), top: Lx.surfaceHeightAt(r1), elev: Lx.worldStrataElevationAt(r1), state: Lx.heightStateAt(r1), solid: Lx.isSolid(r1), frac: Lx.solidFraction(r1) };
        const good = set && JSON.stringify(got) === JSON.stringify(want) && Lx.shapeAt(a, c.x, c.y, 1) === want.shape && Lx.shapeCodeAt(a.x, a.y, c.x, c.y, 1) === Lx.SHAPES[want.shape];
        if (!good) ok = false;
        rows.push(`${k}/5 ${good ? "ok" : `WRONG ${JSON.stringify(got)} want ${JSON.stringify(want)}${set ? "" : ` (refused: ${Lx.lastRefusal().reason})`}`}`);
    }
    return { ok, rows };
}
guard("fills_0_to_5", () => {
    const main = fillsProof(L, spNew, valley);
    const old = fillsProof(LegL, spOld, valley);
    const ranges = JSON.stringify(W.zRange()) === JSON.stringify(W.Z_RANGES.default) && JSON.stringify(LegW.zRange()) === JSON.stringify(LegW.Z_RANGES.legacy);
    check("fills_0_to_5", main.ok && old.ok && ranges, `+1 over the valley cell (${valley.x},${valley.y}) (ground below a floor, S4 air): default zMin ${spNew.zMin} [${main.rows.join(", ")}]; legacy zMin ${spOld.zMin} [${old.rows.join(", ")}]; ranges ${ranges}`);
});
// 0/5 over solid ground stands on that cell's S4. At zMin there is nothing below (open, elevation -1). Below the core the outer level is solid stone.
function floorProof(Lx, sp, c, deep) {
    const r0 = { area: a, x: c.x, y: c.y, z: 0 }, r1 = { area: a, x: c.x, y: c.y, z: 1 };
    const openOverAir = Lx.shapeAt(r1);
    Lx.setStrata(r0, { m: ["stone", "stone", "stone", "stone", "stone"] });
    const onSolid = { shape: Lx.shapeAt(r1), top: Lx.surfaceHeightAt(r1), elev: Lx.worldStrataElevationAt(r1), mat: Lx.cellAt(r1).material };
    Lx.setStrata(r0, { m: ["soil", "air", "air", "air", "air"] });
    const r2 = { area: a, x: deep.x, y: deep.y, z: -2 };
    const before2 = Lx.strataAt(r2);
    Lx.setStrata(r2, { m: ["air", "air", "air", "air", "air"] });
    const deepest = Lx.shapeAt(r2), deepElev = Lx.worldStrataElevationAt(r2);
    Lx.setStrata(r2, { m: before2.bytes, hp: before2.hp });
    Lx.setStrata(r1, { m: ["air", "air", "air", "air", "air"] });
    const wantSolid = elevOf(sp, 0, sp.strata - 1);
    const atBottom = -2 === sp.zMin;
    const wantDeep = { shape: atBottom ? "open" : "floor", elev: atBottom ? -1 : elevOf(sp, -2, 0) - 1 };
    const ok = openOverAir === "open" && onSolid.shape === "floor" && onSolid.top === -1 && onSolid.elev === wantSolid && onSolid.mat === "stone" && deepest === wantDeep.shape && deepElev === wantDeep.elev;
    return { ok, openOverAir, onSolid, deepest, deepElev, wantSolid, wantDeep };
}
guard("floor_on_substrate", () => {
    const main = floorProof(L, spNew, valley, deep2);
    const old = floorProof(LegL, spOld, valley, deep2);
    const ok = main.ok && old.ok;
    check("floor_on_substrate", ok, `default zMin ${spNew.zMin}: 0/5 over air ${main.openOverAir}; over solid ground ${JSON.stringify(main.onSolid)} (want floor, top -1, elevation ${main.wantSolid} = ground S4, stone); 0/5 at -2 ${main.deepest}, elevation ${main.deepElev} (want ${main.wantDeep.shape}, ${main.wantDeep.elev}); ` +
        `legacy zMin ${spOld.zMin}: over solid ${JSON.stringify(old.onSolid)} (want ${old.wantSolid}); at -2 ${old.deepest}, elevation ${old.deepElev} (want ${old.wantDeep.shape}, ${old.wantDeep.elev})`);
});
guard("legacy_shapes_match", () => {
    let diff = 0, cells = 0;
    const ex = [];
    for (const z of LEVELS) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        cells++;
        const s = L.shapeCodeAt(a.x, a.y, x, y, z), o = LL.shapeCodeAt(a.x, a.y, x, y, z);
        if (s !== o) { diff++; if (ex.length < 5) ex.push(`${z} (${x},${y}) ${s}/${o}`); }
    }
    const matL = provinceWorld();
    const mats = [];
    for (const z of LEVELS) for (let i = 0; i < n; i += 97) {
        const x = i % size, y = (i / size) | 0, p = matL.cellAt(ref(x, y, z)), q = LL.cellAt(ref(x, y, z));
        if (p.shape !== "open" && (p.material !== q.material || p.constructed !== q.constructed || p.liquid !== q.liquid)) mats.push(`${z} (${x},${y}) ${p.material}/${q.material} ${p.liquid}/${q.liquid}`);
    }
    const surfaceMats = [];
    for (const z of [0, 1, 2]) for (let i = 0; i < n; i += 97) {
        const x = i % size, y = (i / size) | 0, p = L.cellAt(ref(x, y, z)), q = LL.cellAt(ref(x, y, z));
        if (p.shape !== "open" && (p.material !== q.material || p.constructed !== q.constructed || p.liquid !== q.liquid)) surfaceMats.push(`${z} (${x},${y}) ${p.material}/${q.material}`);
    }
    check("legacy_shapes_match", diff === 0 && mats.length === 0 && surfaceMats.length === 0, `shapeCodeAt new game/pre-strata over ${cells} cells (5 levels): ${diff} differ${ex.length ? ` (${ex.join("; ")})` : ""}; ` +
        `cellAt material/constructed/liquid on every 97th cell of the ${matL === L ? "new game" : "old-generator world"}: ${mats.length} differ${mats.length ? ` (${mats.slice(0, 4).join("; ")})` : ""}; ` +
        `new game surface levels: ${surfaceMats.length} differ`);
});
function surfaceProof(Lx, sp) {
    let checked = 0, bad = 0;
    const ex = [];
    for (let i = 0; i < n; i++) {
        const x = i % size, y = (i / size) | 0, s = S[i], code = shp(s, i);
        if (code !== FLOOR) continue;
        checked++;
        const e = Lx.worldStrataElevationAt(a, x, y, s), top = Lx.surfaceHeightAt(a, x, y, s), want = elevOf(sp, s, 0);
        if (e !== want || top !== 0) { bad++; if (ex.length < 4) ex.push(`(${x},${y}) S ${s}: ${e}/${top} want ${want}/0`); }
    }
    return { checked, bad, ex, ok: checked > 1000 && bad === 0 };
}
guard("surface_elevation_matches", () => {
    const main = surfaceProof(L, spNew), old = surfaceProof(LegL, spOld);
    const legacyNumbers = spOld.zMin === LegW.Z_RANGES.legacy.zMin;
    check("surface_elevation_matches", main.ok && old.ok && legacyNumbers, `${main.checked} columns whose surface level S holds a floor: stood-on stratum is S0, elevation (S - zMin) x ${spNew.strata}; ` +
        `default zMin ${spNew.zMin} wrong ${main.bad}${main.ex.length ? ` (${main.ex.join("; ")})` : ""}; legacy zMin ${spOld.zMin} wrong ${old.bad}${old.ex.length ? ` (${old.ex.join("; ")})` : ""} (legacy zMin is Z_RANGES.legacy ${legacyNumbers})`);
});
guard("headroom_walkability", () => {
    const c = valley2, r0 = ref(c.x, c.y, 0), r1 = ref(c.x, c.y, 1), rows = [];
    const walk = () => W.walkable(a.x, a.y, c.x, c.y, { z: 0 });
    const base = { shape: L.shapeAt(r0), walk: walk() };
    L.setStrata(r1, { m: ["stone", "air", "air", "air", "air"] });           // a slab on +1: 4 strata of headroom on the ground
    const slab4 = { shape: L.shapeAt(r0), walk: walk() };
    L.setStrata(r0, { m: ["soil", "soil", "air", "air", "air"] });            // ground fill 2 under the slab: 3 strata
    const low3 = { shape: L.shapeAt(r0), walk: walk() };
    L.setStrata(r1, { m: ["air", "air", "air", "air", "air"] });              // slab gone: 3 + open above
    const open = { shape: L.shapeAt(r0), walk: walk(), top: L.surfaceHeightAt(r0) };
    L.setStrata(r0, { m: ["soil", "air", "air", "air", "air"] });
    const back = { shape: L.shapeAt(r0), walk: walk(), recorded: L.strataAt(r0).changed || L.strataAt(r1).changed };
    const ok = base.shape === "floor" && base.walk && slab4.shape === "floor" && low3.shape === "solid" && !low3.walk && open.shape === "floor" && open.top === 1 && back.shape === "floor" && back.walk && !back.recorded;
    check("headroom_walkability", ok, `ground (${c.x},${c.y}): as generated ${JSON.stringify(base)}; slab on +1 S0 (headroom 4) ${JSON.stringify(slab4)}; ground 2/5 under the slab (headroom 3) ${JSON.stringify(low3)} (want solid, not walkable); ` +
        `slab removed ${JSON.stringify(open)}; back to the baseline ${JSON.stringify(back)} (no saved record)`);
});

//---------------------------------------------------------------- damage
const rockSnap = snapshot(deepRock);   // the ground cell of deepRock is hill rock: always stone (z < S)
guard("damage_single_stratum", () => {
    const r = ref(deepRock.x, deepRock.y, 0);
    const k = events.length;
    const part = L.applyStrataDamage(r.area, r.x, r.y, 0, 2, 30, "dig");       // stone 120 HP, dig x1: 30 HP = 63.75 steps -> 64
    const mid = L.strataAt(r);
    const kill = L.applyStrataDamage(r.area, r.x, r.y, 0, 2, 200, "dig");
    const after = L.strataAt(r);
    const ok = part.ok && part.hit && part.hpBefore === 255 && part.hpAfter === 191 && mid.materials[2] === "stone" && mid.hp[2] === 191 &&
        mid.hp[1] === 255 && mid.hp[3] === 255 && kill.destroyed && after.materials.join() === "stone,stone,air,stone,stone" &&
        after.hp.join() === "255,255,0,255,255" && L.remainingStructuralHP(r) === 480 && L.maxStructuralHP(r) === 480 &&
        Math.abs(L.effectiveSupport(r) - 0.8) < 1e-9 && L.shapeAt(r) === "solid" && eventsSince(k, "levels:strataDestroyed").length === 1;
    check("damage_single_stratum", ok, `hill rock on the ground (${r.x},${r.y}): 30 dig on S2 -> HP ${part.hpBefore} -> ${part.hpAfter} (want 191), S1 ${mid.hp[1]}, S3 ${mid.hp[3]}; ` +
        `200 more -> destroyed ${kill.destroyed}: [${after.materials}] HP [${after.hp}]; HP left ${L.remainingStructuralHP(r)}/${L.maxStructuralHP(r)}, support ${L.effectiveSupport(r).toFixed(2)}; ` +
        `shape ${L.shapeAt(r)} (S0..S1 solid under a 1-stratum gap: headroom 1)`);
    restore(deepRock, rockSnap);
});
guard("destruction_changes_shape", () => {
    const r = ref(cave.x, cave.y, -1), k = events.length;
    const before = L.shapeAt(r), mat = L.strataAt(r).materials[0];
    const hit = L.applyStrataDamage(r.area, r.x, r.y, -1, 0, 1000, "blast");
    const after = L.shapeAt(r), top = L.surfaceHeightAt(r), elev = L.worldStrataElevationAt(r), below = L.shapeAt(ref(cave.x, cave.y, -2));
    const cc = eventsSince(k, "levels:cellChanged").filter(e => e.args[0].z === -1 && e.args[0].x === r.x && e.args[0].y === r.y);
    // Standing on the cell below's S4 when that is solid: elevationOf(-1, 0) - 1. Nothing solid below: -1.
    const elevWant = below === "solid" ? elevOf(liveSpace(env), -1, 0) - 1 : -1;
    const ok = before === "floor" && hit.destroyed && top === -1 && after === (below === "solid" ? "floor" : "open") && elev === elevWant && cc.length >= 1;
    check("destruction_changes_shape", ok, `cave floor at -1 (${r.x},${r.y}), S0 ${mat}: ${before} -> S0 destroyed -> ${after} (the cell below is ${below}: standing on its top at elevation ${elev}); ` +
        `levels:cellChanged ${cc.length}`);
    L.setStrata(r, { m: [mat, "air", "air", "air", "air"] });
});
guard("damage_crosses_levels_box", () => {
    const c = deepRock, k = events.length;
    const sum = L.applyVolumeDamage(a, c.x, c.y, -1, 4, c.x, c.y, 0, 0, 500, "blast");
    const lo = L.strataAt(ref(c.x, c.y, -1)), hi = L.strataAt(ref(c.x, c.y, 0)), m1 = rockSnap[1].materials;
    const ok = sum.ok && sum.strataDestroyed === 2 && sum.levels.join() === "-1,0" && lo.materials.join() === `${m1.slice(0, 4)},air` &&
        hi.materials.join() === "air,stone,stone,stone,stone" && hi.hp.slice(1).every(h => h === 255) && lo.hp.slice(0, 4).every(h => h === 255) &&
        eventsSince(k, "levels:strataDestroyed").length === 2;
    check("damage_crosses_levels_box", ok, `box (${c.x},${c.y}) from Z-1:S4 to Z0:S0, 500 blast: destroyed ${sum.strataDestroyed} on levels [${sum.levels}]; -1 [${lo.materials}] HP [${lo.hp}], ground [${hi.materials}] HP [${hi.hp}]`);
    restore(c, rockSnap);
});
// Vertical distance from ground S0, same column: |(z * STRATA_PER_LAYER + s) * STRATUM_FEET|. zMin cancels.
// HP loss is ceil(damage x (1 - dist/radius) x dig resist x 255 / maxHP). The next cell's middle is one cell across.
function sphereProof(Lx, sp, c) {
    const radius = 3, damage = 240, snap = LEVELS.map(z => Lx.strataAt({ area: a, x: c.x, y: c.y, z }));
    const exp = {}, got = {};
    let geometric = 0, destroyed = 0;
    for (const z of [-1, 0]) {
        const before = snap[LEVELS.indexOf(z)];
        for (let s = 0; s < sp.strata; s++) {
            const dist = Math.abs((z * sp.strata + s) * sp.feet), key = `${z}:${s}`;
            const M = Lx.STRATA_MATERIALS.find(m => m.key === before.materials[s]);
            if (dist <= radius && M && M.solid && M.maxHP > 0) {
                geometric++;
                const resist = M.resist.dig !== undefined ? M.resist.dig : 1;
                const dmg = damage * (1 - dist / radius) * resist;
                exp[key] = dmg > 0 ? Math.max(0, 255 - Math.ceil(dmg * 255 / M.maxHP - 1e-9)) : 255;
                if (exp[key] === 0) destroyed++;
            } else exp[key] = before.hp[s];
        }
    }
    const sum = Lx.applyVolumeDamage({ center: { area: a, x: c.x, y: c.y, z: 0, s: 0 }, radius, damage, damageType: "dig", falloff: "linear" });
    for (const z of [-1, 0]) {
        const now = Lx.strataAt({ area: a, x: c.x, y: c.y, z });
        for (let s = 0; s < sp.strata; s++) got[`${z}:${s}`] = now.hp[s];
    }
    LEVELS.forEach((z, k) => { const b = snap[k]; Lx.setStrata({ area: a, x: c.x, y: c.y, z }, { m: b.bytes, hp: b.hp, connector: b.connector || 0 }); });
    const neighborOut = sp.cell > radius;
    const ok = sum.ok && JSON.stringify(got) === JSON.stringify(exp) && sum.levels.join() === "-1,0" && sum.strataHit === geometric && sum.strataDestroyed === destroyed && sum.cells === 2 && neighborOut;
    return { ok, got, exp, sum, geometric, destroyed, neighborOut };
}
guard("sphere_aoe", () => {
    const c = deepRock;
    const main = sphereProof(L, spNew, c);
    const old = sphereProof(LegL, spOld, c);
    const ok = main.ok && old.ok;
    check("sphere_aoe", ok, `sphere r 3 ft at the ground's S0 over (${c.x},${c.y}), 240 dig, linear, stratum ${spNew.feet} ft: ` +
        `default HP ${JSON.stringify(main.got)} want ${JSON.stringify(main.exp)} (0 = destroyed); ${main.sum.strataHit} strata hit (want ${main.geometric}), ${main.sum.strataDestroyed} destroyed (want ${main.destroyed}), cells written ${main.sum.cells} (want 2: this column's -1 and ground; the next cell's middle is ${spNew.cell} ft, outside the radius ${main.neighborOut}), levels [${main.sum.levels}]; ` +
        `legacy range ${old.sum.strataHit} hit (want ${old.geometric}), cells ${old.sum.cells}, HP match ${JSON.stringify(old.got) === JSON.stringify(old.exp)}`);
});
guard("resistance_and_hooks", () => {
    const r = ref(deepRock.x, deepRock.y, 0), w = ref(valley.x, valley.y, 1);
    const fireStone = L.applyStrataDamage(r.area, r.x, r.y, 0, 4, 100, "fire");
    L.setStrata(w, { m: ["wood", "air", "air", "air", "air"] });
    const fireWood = L.applyStrataDamage(w.area, w.x, w.y, 1, 0, 10, "fire");
    const seen = [];
    const off = L.registerDamageResponse("stone", ctx => { seen.push(ctx.material + ":" + ctx.damageType); return 0; });
    const hooked = L.applyStrataDamage(r.area, r.x, r.y, 0, 3, 500, "blast");
    off();
    const offAll = L.registerDamageResponse("*", ctx => ctx.effective * 2);
    const doubled = L.applyStrataDamage(r.area, r.x, r.y, 0, 3, 12, "dig");
    offAll();
    const fl = [];
    const offFluid = L.registerDamageResponse("fluid", ctx => { fl.push(ctx.material); return 999; });
    const p = ref(pool.x, pool.y, -1), poolBefore = L.strataAt(p);
    const onWater = L.applyStrataDamage(p.area, p.x, p.y, -1, 1, 50, "impact");
    offFluid();
    const poolAfter = L.strataAt(p);
    const ok = fireStone.effective === 10 && fireStone.hpAfter === 255 - Math.ceil(10 * 255 / 120) && fireWood.effective === 20 && fireWood.hpAfter === 255 - Math.ceil(20 * 255 / 60) &&
        hooked.effective === 0 && hooked.hpAfter === 255 && seen.join() === "stone:blast" && doubled.effective === 24 && doubled.hpAfter === 255 - Math.ceil(24 * 255 / 120) &&
        onWater.fluid && !onWater.hit && fl.join() === "water" && bytes(poolAfter) === bytes(poolBefore);
    check("resistance_and_hooks", ok, `fire on stone x0.1: ${fireStone.effective} -> HP ${fireStone.hpAfter}; fire on wood x2: ${fireWood.effective} -> HP ${fireWood.hpAfter}; ` +
        `a stone hook returning 0: effective ${hooked.effective}, HP ${hooked.hpAfter}, saw ${seen}; a "*" hook doubling 12 dig: ${doubled.effective} -> HP ${doubled.hpAfter}; ` +
        `impact on a pool's water stratum: fluid ${onWater.fluid}, hit ${onWater.hit}, fluid hook saw [${fl}], strata unchanged ${bytes(poolAfter) === bytes(poolBefore)}`);
    restore(deepRock, rockSnap);
    L.setStrata(w, { m: ["air", "air", "air", "air", "air"] });
});
guard("events_on_destruction", () => {
    const r = ref(cave2.x, cave2.y, -1), k = events.length, mat = L.strataAt(r).materials[0];
    L.applyStrataDamage(r.area, r.x, r.y, -1, 0, 5, "dig", { source: "TEST_pick" });
    const k2 = events.length;
    L.applyStrataDamage(r.area, r.x, r.y, -1, 0, 1000, "dig", { source: "TEST_pick" });
    const dmg = eventsSince(k, "levels:strataDamaged"), des = eventsSince(k, "levels:strataDestroyed"), chg = eventsSince(k, "levels:strataChanged");
    const cell = eventsSince(k2, "levels:cellChanged").filter(e => e.args[0].z === -1), shape = eventsSince(k2, "levels:shapeChanged").filter(e => e.args[0].z === -1);
    const d = des[0] && des[0].args[0];
    const hpOnly = eventsSince(k, "levels:cellChanged").length - eventsSince(k2, "levels:cellChanged").length === 0;
    const ok = dmg.length === 2 && des.length === 1 && chg.length === 2 && cell.length === 1 && !!d && d.x === r.x && d.y === r.y && d.z === -1 && d.stratum === 0 &&
        d.material === mat && d.debris && d.source === "TEST_pick" && d.damageType === "dig" && dmg[0].args[0].destroyed === false && hpOnly && shape.length <= 1;
    check("events_on_destruction", ok, `cave floor (${r.x},${r.y}) at -1: a small hit then a destroying one: strataDamaged ${dmg.length}, strataDestroyed ${des.length} ${JSON.stringify(d)}, ` +
        `strataChanged ${chg.length}, cellChanged at -1 after the destroying hit ${cell.length} (none for the HP-only hit ${hpOnly}), shapeChanged ${shape.length}`);
    L.setStrata(r, { m: [mat, "air", "air", "air", "air"] });
});

//---------------------------------------------------------------- overburden
guard("overburden", () => {
    let bad = 0, cells = 0;
    const ex = [];
    for (const z of LEVELS) for (let i = 0; i < n; i += 3) {
        const x = i % size, y = (i / size) | 0;
        let want = false;
        for (let u = z + 1; u <= 2; u++) if (shp(u, i) !== OPEN) want = true;   // pre-strata shapes: anything but open has solid strata
        cells++;
        if (L.hasOpaqueOverburden(a, x, y, z) !== want) { bad++; if (ex.length < 4) ex.push(`${z} (${x},${y})`); }
    }
    const c = valley, r0 = ref(c.x, c.y, 0);
    const sky = L.hasOpaqueOverburden(r0);
    L.setStrata(ref(c.x, c.y, 2), { m: ["wood", "air", "air", "air", "air"] }, { constructed: true });   // a deck two levels up
    LL.setShape(ref(c.x, c.y, 2), "floor", { constructed: true, material: "wood" });                    // the same deck, pre-strata
    const deck2 = L.hasOpaqueOverburden(r0), deckFloors = F.hasOpaqueOverburden(a, c.x, c.y, 0), roofed = F.isRoofed(a, c.x, c.y, 0), oldRoofed = legacy.UF.Floors.isRoofed(a, c.x, c.y, 0);
    L.setStrata(ref(c.x, c.y, 2), { m: ["air", "air", "air", "air", "air"] });
    LL.setShape(ref(c.x, c.y, 2), "open");
    L.setStrata(r0, { m: ["soil", "air", "air", "air", "stone"] });        // a lintel inside the cell above an air gap
    const gap = L.hasOpaqueOverburden(r0), gapTop = L.hasOpaqueOverburden(ref(c.x, c.y, 1));
    L.setStrata(r0, { m: ["soil", "air", "air", "air", "air"] });
    const under = F.isRoofed(a, deepRock.x, deepRock.y, -1) && F.hasOpaqueOverburden(a, deepRock.x, deepRock.y, -1);
    const ok = bad === 0 && cells > 100000 && !sky && deck2 && deckFloors && roofed && !oldRoofed && gap && !gapTop && under;
    check("overburden", ok, `hasOpaqueOverburden on every 3rd cell of 5 levels (${cells}) vs "a non-open cell anywhere above": ${bad} wrong${ex.length ? ` (${ex.join("; ")})` : ""}; ` +
        `valley ground: open sky ${sky}; under a deck on +2 with +1 open ${deck2} (Floors.hasOpaqueOverburden ${deckFloors}, Floors.isRoofed ${roofed}; the pre-strata isRoofed ${oldRoofed}: it looked one level up only); ` +
        `a stone S4 over an air gap in the cell ${gap} (+1 above it: ${gapTop}); deep rock at -1 roofed ${under}`);
});

//---------------------------------------------------------------- shape_grids_coherent
guard("shape_grids_coherent", () => {
    for (const z of LEVELS) L.shapeCodeAt(a.x, a.y, 0, 0, z);   // every level's grid built
    const c = valley2, snap = snapshot(c);
    // Edits whose derivation reaches the levels above and below: the ground dug out, -1 filled to 2/5, a +1 slab.
    L.setStrata(ref(c.x, c.y, 0), { m: ["air", "air", "air", "air", "air"] });
    L.setStrata(ref(c.x, c.y, -1), { m: ["stone", "stone", "air", "air", "air"] });
    L.setStrata(ref(c.x, c.y, 1), { m: ["wood", "air", "air", "air", "air"] }, { constructed: true });
    L.applyStrataDamage(a, deepRock.x, deepRock.y, 0, 0, 1000, "blast");
    const mid = L.verifyPackedGrids(a.x, a.y);
    const shapes = [-1, 0, 1, 2].map(z => L.shapeAt(ref(c.x, c.y, z))).join("/");
    restore(c, snap);
    restore(deepRock, rockSnap);
    const after = L.verifyPackedGrids(a.x, a.y);
    check("shape_grids_coherent", mid.grids === 5 && mid.cells === 5 * n && mid.mismatches === 0 && after.mismatches === 0 && shapes === "floor/open/floor/open",
        `cached grids ${mid.grids}, ${mid.cells} cells re-derived with the edits in place: ${mid.mismatches} differ${mid.examples.length ? ` ${JSON.stringify(mid.examples)}` : ""}; ` +
        `column (${c.x},${c.y}) -1/0/+1/+2 ${shapes} (want floor/open/floor/open: -1 2/5, the ground dug out over it, a deck on +1, sky); after restoring: ${after.mismatches} differ`);
});

//---------------------------------------------------------------- migration from a pre-strata save
// Legacy changes made by the pre-strata code itself (its setShape), saved through DataManager, loaded by the strata code.
const legacyChanges = [
    { what: "dig a -1 rock cell to a soil floor", c: deepRock, z: -1, shape: "floor", opts: { material: "soil" } },
    { what: "wall up a -1 cave floor", c: cave, z: -1, shape: "solid", opts: { material: "stone" } },
    { what: "wooden deck on +1 over the valley", c: valley, z: 1, shape: "floor", opts: { constructed: true, material: "wood" } },
    { what: "constructed ramp on +1", c: valley2, z: 1, shape: "ramp", opts: { constructed: true, material: "stone" } },
    { what: "stairs up at -1", c: cave2, z: -1, shape: "stairUp", opts: { material: "stone" } },
    { what: "wooden deck over a -1 pool", c: pool, z: -1, shape: "floor", opts: { constructed: true, material: "wood" } },
    { what: "a hole in a +1 hilltop (open over solid ground)", c: hillTop, z: 1, shape: "open", opts: {} },
    { what: "ground cell walled with soil", c: valley2, z: 0, shape: "solid", opts: { material: "soil" } }
];
let legacyJson = null;
guard("migration_no_data_loss", () => {
    for (const ch of legacyChanges) {
        const ok = LL.setShape({ area: a, x: ch.c.x, y: ch.c.y, z: ch.z }, ch.shape, ch.opts);
        if (!ok) harnessProblem(`the pre-strata setShape refused "${ch.what}": ${JSON.stringify(LL.lastRefusal())}`);
        ch.legacy = LL.cellAt({ area: a, x: ch.c.x, y: ch.c.y, z: ch.z });
    }
    legacyJson = saveJson(legacy);
    const saved = JSON.parse(legacyJson).ufWorld;
    const legacyCells = LEVELS.reduce((k, z) => k + Object.values((saved.levels[String(z)] || {}).cells || {}).reduce((m, c) => m + Object.keys(c).length, 0), 0);
    const errs0 = env.__errors.length;
    const st2 = loadJson(env, legacyJson);
    const rec = (st2.migrations || []).filter(m => m.rule === "strata").pop();
    const rows = [];
    let lost = 0;
    for (const ch of legacyChanges) {
        const r = ref(ch.c.x, ch.c.y, ch.z), now = L.cellAt(r), old = ch.legacy;
        const expectShape = ch.shape === "open" ? "floor" : old.shape;         // open over solid ground: a floor on its top
        const same = now.shape === expectShape && (old.shape === "open" || (now.material === old.material && now.constructed === old.constructed)) && now.water === old.water;
        if (!same) lost++;
        rows.push(`${ch.what}: ${old.shape}/${old.material}${old.constructed ? "/built" : ""}${old.water ? "/water" : ""} -> ${now.shape}/${now.material}${now.constructed ? "/built" : ""}${now.water ? "/water" : ""}${same ? "" : " LOST"}`);
    }
    const noCells = LEVELS.every(z => st2.levels[String(z)].cells === undefined);
    const verify = L.verifyLevels(st2);
    const ok = lost === 0 && !!rec && rec.converted === legacyCells && rec.invalid === 0 && rec.shapeChanged === 1 && st2.strataSchemaVersion === 1 && noCells &&
        verify.length === 0 && env.__errors.length === errs0;
    check("migration_no_data_loss", ok, `pre-strata save (${legacyJson.length} chars, ${legacyCells} changed cells) loaded through DataManager.extractSaveContents: ${rows.join("; ")}; ` +
        `record ${JSON.stringify(rec)}; strataSchemaVersion ${st2.strataSchemaVersion}; levels[z].cells gone ${noCells}; checksums verified (${verify.length} mismatches)`);
});
guard("migration_profiles", () => {
    const get = ch => L.strataAt(ref(ch.c.x, ch.c.y, ch.z));
    const [dig, wall, deck, ramp, stairs, poolDeck, hole, groundWall] = legacyChanges.map(get);
    const all = (s, m, hp) => s.materials.every(x => x === m) && s.hp.every(h => h === hp);
    const rows = {
        solid_5_of_5: all(wall, "stone", 255) && all(groundWall, "soil", 255) && wall.fill === 5,
        open_0_of_5: hole.materials.every(x => x === "air") && hole.hp.every(h => h === 0),
        floor_S0: dig.materials.join() === "soil,air,air,air,air" && dig.hp.join() === "255,0,0,0,0",
        deck_constructed: deck.materials[0] === "wood" && deck.constructed[0] && deck.fill === 1,
        ramp_3_of_5: ramp.materials.slice(0, 3).every(x => x === "stone") && ramp.fill === 3 && ramp.connector === "ramp" && ramp.constructed[2],
        stairs_S0_connector: stairs.fill === 1 && stairs.connector === "stairUp",
        pool_kept: poolDeck.materials.join() === "wood,water,water,air,air" && poolDeck.constructed[0]
    };
    check("migration_profiles", Object.values(rows).every(Boolean), Object.entries(rows).map(([k, v]) => `${k} ${v ? "ok" : "WRONG"}`).join(", ") +
        `; e.g. ramp [${ramp.materials}] ${ramp.connector}, pool deck [${poolDeck.materials}]`);
});
guard("unknown_format_diagnostics", () => {
    if (!legacyJson) throw new Error("no pre-strata save (migration_no_data_loss failed first)");
    // (a) a strata schema this build doesn't know: nothing read, nothing written, cells left in place
    let e0 = env.__errors.length;
    const stA = loadJson(env, legacyJson, w => { w.strataSchemaVersion = 99; });
    const aErr = env.__errors.slice(e0).some(s => /unknown strata schema version 99/.test(s));
    const aKept = LEVELS.some(z => stA.levels[String(z)].cells && Object.keys(stA.levels[String(z)].cells).length);
    const aRefused = L.setShape(ref(valley.x, valley.y, 1), "floor") === false && /schema/.test(L.lastRefusal().reason);
    const aDmg = L.applyStrataDamage(a, deepRock.x, deepRock.y, -1, 0, 10, "dig");
    errorsExpected.push(...env.__errors.slice(e0));
    // (b) junk in the legacy cells: kept aside, reported, never applied; the good entries converted
    e0 = env.__errors.length;
    const stB = loadJson(env, legacyJson, w => {
        const c = w.levels["-1"].cells[`${a.x},${a.y}`];
        c.abc = 5; c[String(n + 5)] = 18; c[String(deepRock.i + 1)] = "x"; c[String(deepRock.i + 2)] = 0x39;   // shape code 1 with material 3: unknown
        w.levels["1"].cells["nope"] = { 1: 2 };
    });
    const rB = (stB.migrations || []).filter(m => m.rule === "strata").pop();
    const bErr = env.__errors.slice(e0).some(s => /could not be read; they are kept/.test(s));
    const bKept = stB.levels["-1"].unmigratedCells && Object.keys(stB.levels["-1"].unmigratedCells[`${a.x},${a.y}`] || {}).length === 4 && !!stB.levels["1"].unmigratedCells.nope;
    const bGood = L.shapeAt(ref(deepRock.x, deepRock.y, -1)) === "floor" && L.shapeAt(ref(deepRock.x + 1, deepRock.y, -1)) === "solid";
    errorsExpected.push(...env.__errors.slice(e0));
    // (c) a corrupt record in a strata save: skipped with an error, the others read
    const good = saveJson(env);
    e0 = env.__errors.length;
    const stC = loadJson(env, good, w => { const k = Object.keys(w.levels["-1"].strata)[0]; const cells = w.levels["-1"].strata[k]; cells[Object.keys(cells)[0]] = "zz"; });
    const cErr = env.__errors.slice(e0).some(s => /could not be read and were skipped/.test(s));
    const cStill = L.shapeAt(ref(cave.x, cave.y, -1)) === "solid" || L.shapeAt(ref(deepRock.x, deepRock.y, -1)) === "floor";
    errorsExpected.push(...env.__errors.slice(e0));
    const ok = aErr && aKept && aRefused && !aDmg.ok && rB && rB.invalid === 5 && bErr && bKept && bGood && cErr && cStill && stC.strataSchemaVersion === 1;
    check("unknown_format_diagnostics", ok, `(a) strataSchemaVersion 99: console.error ${aErr}, legacy cells left in place ${aKept}, setShape refused ${aRefused}, damage refused ${!aDmg.ok}; ` +
        `(b) 5 junk legacy entries: invalid ${rB && rB.invalid}, console.error ${bErr}, kept in unmigratedCells ${bKept}, good entries applied ${bGood}; ` +
        `(c) a corrupt strata record: console.error ${cErr}, the other records read ${cStill}`);
    loadJson(env, legacyJson);   // the plain migrated world again for what follows
});
guard("save_load_strata_hp", () => {
    const r1 = ref(deepRock.x, deepRock.y, 0), r2 = ref(valley.x, valley.y, 1);
    L.applyStrataDamage(r1.area, r1.x, r1.y, 0, 3, 40, "dig");
    L.applyStrataDamage(r1.area, r1.x, r1.y, 0, 4, 999, "dig");
    L.setStrata(r2, { m: ["stone", "water", "air", "air", "air"], hp: [77, 0, 0, 0, 0] });
    const before = [r1, r2].map(r => ({ s: L.strataAt(r), shape: L.shapeAt(r) }));
    const json = saveJson(env);
    const st3 = loadJson(env, json);
    const after = [r1, r2].map(r => ({ s: L.strataAt(r), shape: L.shapeAt(r) }));
    const same = JSON.stringify(before) === JSON.stringify(after);
    const rec = st3.levels["0"].strata[`${a.x},${a.y}`][r1.y * size + r1.x];
    check("save_load_strata_hp", same && after[0].s.hp[3] < 255 && after[0].s.materials[4] === "air" && after[1].s.hp[0] === 77 && typeof rec === "string" && rec.length === 22,
        `ground rock (${r1.x},${r1.y}) after dig: [${after[0].s.materials}] HP [${after[0].s.hp}]; +1 (${r2.x},${r2.y}): [${after[1].s.materials}] HP [${after[1].s.hp}]; same after save/load ${same}; ` +
        `saved record "${rec}" (22 hex digits = connector + 5 materials + 5 HP)`);
});
guard("unchanged_terrain_regenerates", () => {
    const st3 = W.state;
    const records = LEVELS.reduce((k, z) => k + Object.values(st3.levels[String(z)].strata || {}).reduce((m, c) => m + Object.keys(c).length, 0), 0);
    let changed = 0;
    for (const z of LEVELS) for (let i = 0; i < n; i++) {
        const s = L.strataAt(ref(i % size, (i / size) | 0, z));
        if (s.changed) changed++;
    }
    const fresh = setup(currentSources(), "fresh");
    newWorld(fresh, SEED);
    const sameNew = LEVELS.every(z => Buffer.compare(Buffer.from(fresh.UF.Levels.baseline(z, a.x, a.y).strata.m), coupledM[z]) === 0);
    // The loaded save was written by the pre-strata plugins: no verticalBiomeCoupling flag, so the old roll (DEUS_VerticalBiomes.md).
    const loadedM = LEVELS.map(z => Buffer.from(L.baseline(z, a.x, a.y).strata.m));
    const oldRollM = LEVELS.map(z => Buffer.from(UL.baseline(z, a.x, a.y).strata.m));
    const flagAbsent = st3.verticalBiomeCoupling === undefined;
    const sameOld = flagAbsent && loadedM.every((buf, i) => Buffer.compare(buf, oldRollM[i]) === 0);
    const sameBase = mutant === "old_save_as_new_game"
        ? flagAbsent && loadedM.every((buf, i) => Buffer.compare(buf, coupledM[LEVELS[i]]) === 0)
        : sameNew && sameOld;
    const r = ref(valley.x, valley.y, 1);
    L.setStrata(r, { m: ["air", "air", "air", "air", "air"] });
    const dropped = st3.levels["1"].strata[`${a.x},${a.y}`] === undefined || st3.levels["1"].strata[`${a.x},${a.y}`][r.y * size + r.x] === undefined;
    check("unchanged_terrain_regenerates", records === changed && records > 0 && records < 20 && sameBase && dropped,
        `saved strata records ${records} = cells differing from their baseline ${changed} (of ${5 * n}); a fresh new game equals the new-game baselines ${sameNew}; ` +
        `flag-absent save (flag ${st3.verticalBiomeCoupling === undefined ? "absent" : st3.verticalBiomeCoupling}) equals the old roll ${sameOld}` +
        `${mutant === "old_save_as_new_game" ? "; mutant requires that save to equal the new game " + sameBase : ""}; ` +
        `+1 (${r.x},${r.y}) set back to its baseline (5 air): record dropped ${dropped}`);
});
// Generator 5 keeps a volume cache keyed by seed and geometry. An absent coupling flag must not reuse a coupled volume.
guard("flag_absent_volume_cache", () => {
    const seed = 20260923;
    const vm = setup(currentSources(), "gen5-cache", "legacy");
    const Lv = vm.UF.Levels, Wv = vm.UF.World;
    vm.UF.NewGameSetup = { seed, year: 1, levelsGen: 5 };
    const make = coupling => {
        const st = {
            version: 4,
            zRange: { zMin: -2, zMax: 2 },
            seed,
            areasX: 1,
            areasY: 1,
            size: 64,
            startArea: { x: 0, y: 0 },
            units: {},
            nextUnitId: 1,
            diffs: {},
            objectDiffs: {},
            levels: {}
        };
        if (coupling !== undefined) st.verticalBiomeCoupling = coupling;
        Wv.state = st;
        vm.UF.Events.emit("world:initializing", st);
        return st;
    };
    Lv.discardBaselineCache();
    make(true);
    const coupled = Lv.checksum(-1);
    Lv.discardBaselineCache();
    make(false);
    const uncoupled = Lv.checksum(-1);
    Lv.discardBaselineCache();
    make(true);
    const warmed = Lv.checksum(-1);
    const json = saveJson(vm);
    const loaded = loadJson(vm, json, w => { delete w.verticalBiomeCoupling; });
    const warm = Lv.checksum(-1);
    const flagAbsent = loaded.verticalBiomeCoupling === undefined;
    const couplingOff = Lv.verticalCouplingOn() === false;
    const gen5 = !!(loaded.levels && loaded.levels["-1"] && loaded.levels["-1"].gen === 5);
    Lv.discardBaselineCache();
    const cold = Lv.checksum(-1);
    const separated = coupled !== "n/a" && uncoupled !== "n/a" && coupled !== uncoupled;
    const ok = separated && flagAbsent && couplingOff && gen5 && warmed === coupled && warm === uncoupled && cold === uncoupled;
    check("flag_absent_volume_cache", ok,
        `generator 5, seed ${seed}, 64x64, legacy range: coupled ${coupled}, explicit uncoupled ${uncoupled}, coupled again ${warmed}; ` +
        `flag-absent load while that coupled volume is cached ${warm} (flag ${flagAbsent ? "absent" : loaded.verticalBiomeCoupling}, verticalCouplingOn ${Lv.verticalCouplingOn()}, gen5 ${gen5}), ` +
        `same load after discardBaselineCache ${cold}`);
});
guard("fluid_adapter", () => {
    const f2s = [0, 1, 2, 3, 4, 5, 6, 7].map(L.fluidDepthToStrata), s2f = [0, 1, 2, 3, 4, 5].map(L.strataToFluidDepth);
    const round = [0, 1, 2, 3, 4, 5].every(k => L.fluidDepthToStrata(L.strataToFluidDepth(k)) === k);
    const P = L.FLUID_PASS, p = ref(pool.x, pool.y, -1), rock = ref(deepRock.x - 1, deepRock.y, -1), sky = ref(valley2.x + 1, valley2.y, 2);
    const pp = L.getStrataFluidPassage(p), pr = L.getStrataFluidPassage(rock), ps = L.getStrataFluidPassage(sky);
    const repeat = [0, 1, 2].every(() => L.getStrataFluidPassage(p) === pp && L.getStrataFluidPassage(sky) === ps);
    const ok = f2s.join() === "0,1,1,2,3,4,4,5" && s2f.join() === "0,1,3,4,6,7" && round && pr === 0 &&
        (pp & P.CAPACITY_MASK) === 6 && (pp & P.DOWN) === 0 && (pp & P.SIDE) !== 0 && L.fluidStateAt(p) === "FLUID_2_OF_5" &&
        (ps & P.CAPACITY_MASK) === 7 && (ps & P.UP) !== 0 && (ps & P.DOWN) !== 0 && repeat;
    check("fluid_adapter", ok, `DEUS_Fluid depth 0..7 -> strata [${f2s}], strata 0..5 -> depth [${s2f}], round trip ${round}; passage bits: pool at -1 ${pp} (capacity ${pp & 7}, down ${!!(pp & P.DOWN)}, ${L.fluidStateAt(p)}), ` +
        `rock ${pr}, +2 sky ${ps} (capacity ${ps & 7}, up ${!!(ps & P.UP)}, down ${!!(ps & P.DOWN)}); repeated calls equal ${repeat}`);
});

//---------------------------------------------------------------- no_allocation_queries, query_cost
const allocDone = guard("no_allocation_queries", () => {
    const cells = [];
    for (let k = 0; k < 64; k++) cells.push([(valley.x + k * 3) % size, (valley.y + k * 5) % size]);
    const areaObj = { x: a.x, y: a.y }, refObj = ref(valley.x, valley.y, 0);
    const run = N => {
        let acc = 0;
        for (let k = 0; k < N; k++) {
            const c = cells[k & 63], z = (k % 5) - 2;
            acc += L.shapeCodeAt(a.x, a.y, c[0], c[1], z);
            acc += L.surfaceHeightAt(areaObj, c[0], c[1], z);
            if (L.hasOpaqueOverburden(areaObj, c[0], c[1], z)) acc++;
            acc += L.getStrataFluidPassage(a.x, a.y, c[0], c[1], z);
            acc += L.shapeCodeAt(refObj);
        }
        return acc;
    };
    run(200000); run(200000);   // warm up (optimised code, caches)
    // Three measured windows of 400,000 rounds, each after a full collection. The first code optimised inside a window
    // adds a one-off heap growth (measured 2026-09-24: about 1.2 MB once, then 8 KB per 2,000,000 calls, the same as an
    // empty loop), so the steadiest window is judged; a per-call allocation grows every window and collects inside them.
    const gcTimes = [], windows = [];
    const obs = new PerformanceObserver(list => { for (const e of list.getEntries()) gcTimes.push(e.startTime); });
    obs.observe({ entryTypes: ["gc"] });
    let acc = 0;
    for (let w = 0; w < 3; w++) {
        global.gc();
        const t0 = performance.now(), h0 = v8.getHeapStatistics().used_heap_size;
        acc += run(400000);
        const h1 = v8.getHeapStatistics().used_heap_size;
        windows.push({ t0, t1: performance.now(), grew: h1 - h0 });
    }
    return new Promise(resolve => setImmediate(() => {
        obs.disconnect();
        const gcs = gcTimes.filter(t => windows.some(w => t >= w.t0 && t <= w.t1)).length;
        const least = Math.min(...windows.map(w => w.grew));
        check("no_allocation_queries", gcs === 0 && least < 2000000,
            `3 windows of 400,000 rounds x 5 queries (shapeCodeAt numeric and ref, surfaceHeightAt, hasOpaqueOverburden, getStrataFluidPassage; checksum ${acc}): garbage collections inside the windows ${gcs} (want 0), heap growth ${windows.map(w => w.grew).join(" / ")} B, least ${least} (limit 2,000,000 = 1 B per query; one 16 B object per query would be 32 MB)`);
        resolve();
    }));
});

async function finish() {
    await Promise.resolve(allocDone);
    guard("query_cost", () => {
        const pts = [];
        for (let k = 0; k < 4096; k++) pts.push([(k * 37) % size, (k * 61) % size, (k % 5) - 2]);
        const time = (Lx, N) => {
            let acc = 0;
            for (let k = 0; k < 20000; k++) { const p = pts[k & 4095]; acc += Lx.shapeCodeAt(a.x, a.y, p[0], p[1], p[2]); }
            const t0 = performance.now();
            for (let k = 0; k < N; k++) { const p = pts[k & 4095]; acc += Lx.shapeCodeAt(a.x, a.y, p[0], p[1], p[2]); }
            return { ns: (performance.now() - t0) * 1e6 / N, acc };
        };
        const N = 1000000, now = time(L, N), old = time(LL, N);
        check("query_cost", now.ns < 2000, `shapeCodeAt (ax, ay, x, y, z) on 4096 cells over the 5 levels, ${N} calls after a warm-up: strata ${now.ns.toFixed(0)} ns/call, pre-strata ${old.ns.toFixed(0)} ns/call (bound 2000 ns; the per-frame budget is measured in game)`);
    });
    const unexpected = env.__errors.filter(e => !errorsExpected.includes(e));
    check("no_errors", unexpected.length === 0, unexpected.length ? unexpected.slice(0, 3).join(" | ") : `none beyond the ${errorsExpected.length} the diagnostic check provoked`);
    console.log(`TIME ${((performance.now() - T0) / 1000).toFixed(1)} s`);
    console.log(`RESULT: ${passed} passed, ${failed} failed (exit ${failed ? 1 : 0})${failed ? ` - ${failures.join(", ")}` : ""}`);
    process.exit(failed ? 1 : 0);
}
finish();
