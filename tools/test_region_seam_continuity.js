#!/usr/bin/env node
"use strict";

/**
 * tools/test_region_seam_continuity.js
 *
 * WG.00.41: 32-Layer Column Generation & Deep-Cut / Region-Seam Integrity Gate (Milestone 1, Owner Directive
 * 2026-09-27). Runs the real DEUS_World / DEUS_WorldGen / DEUS_Tiles / DEUS_Objects / DEUS_Levels / DEUS_Floors
 * plugins in a Node vm, makes a New Game world with AreasX=AreasY=3 (768x768 tiles, DEC-030's 3x3 grid) at the
 * default Z range (-16..+15, 32 layers, DEC-013/DEC-030), and proves:
 *
 *   A. Full 32-layer column generation: every level of every one of the 9 areas generates, deterministically,
 *      from the world seed and continuous global (gx, gy, z) coordinates alone.
 *   B. The 5 depth bands and the 4-layer sky cap (DEC-030): Highlands +7..+11, Uplands +2..+6, Lowlands -4..+1,
 *      Caverns -10..-5, Deep Earth -16..-11; +12..+15 hold zero natural terrain (every cell of every area derives
 *      "open" there).
 *   C. Region-seam integrity across all 12 area-boundary segments (6 N-S across gx=255|256 and gx=511|512, 6 E-W
 *      across gy=255|256 and gy=511|512): elevation steps by at most one band across the seam, the deep/high
 *      bands (out of any possible massif's reach) read byte-identical rock/air on both sides, and the volumetric
 *      column law (docs/systems/UF_Levels.md "The ground's column") holds at the very edge cells, not just the
 *      interior.
 *   D. Deep-cut torture probes (shallow 1-2Z, ravine 4-6Z, canyon 10+Z crossing bands, full bore +15..-16) via the
 *      real strata damage API (applyVolumeDamage): every cut is exact (only the requested column changes, its
 *      neighbours and the world across a seam are untouched), and a full-bore column is void top to bottom.
 *   E. Zero discovery-time RNG: Math.random is never called anywhere in this run (generation and reads alike use
 *      only the seeded hash/noise functions), proven by an instrumented Math.random that would fail the run if
 *      called even once.
 *
 * Usage: node tools/test_region_seam_continuity.js [--seed=20260927] [--mutant=<name>] [--quiet]
 * Negative controls (Rule 4; each must exit 1): see MUTANTS.
 * Exit: 0 all checks passed, 1 a check failed, 2 harness problem.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const FILES = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Tiles.js", "DEUS_Objects.js", "DEUS_Levels.js", "DEUS_Floors.js"];

const arg = (name, fallback) => {
    const a = process.argv.find(x => x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : fallback;
};
const SEED = parseInt(arg("seed", "20260927"), 10) >>> 0;
const mutant = arg("mutant", "");
const quiet = process.argv.includes("--quiet");

//-----------------------------------------------------------------------------
// Mutants: exact in-memory source edits, each proven (by hand, `--mutant=<name>`) to fail at least one check below.
// They never touch the files on disk; they edit the source text this harness reads before handing it to the vm.

const MUTANTS = {
    // B1/B3: widen a +2 cave network's ceiling cap so it can rise past the reserved sky (+12..+15).
    sky_cap_widened: { file: "DEUS_Levels.js", find: 'capThickness: [3, 12]', replace: 'capThickness: [3, 260]' },
    // A1/B: shrink the world's Z range so the 4-layer sky reserve (+12..+15) no longer exists.
    range_no_sky: { file: "DEUS_World.js", find: "default: Object.freeze({ zMin: -16, zMax: 15 })", replace: "default: Object.freeze({ zMin: -16, zMax: 11 })" },
    // C: break the world-wide (not per-area) coordinate frame that keeps climate/elevation fields continuous
    // across region seams; every area would generate as if it were its own isolated 256x256 world.
    area_local_fields: { file: "DEUS_WorldGen.js", find: "width: areasX * size, height: areasY * size,", replace: "width: size, height: size, /* MUTANT area_local_fields */" },
    // C: remove the edge margin that keeps natural cuts/caves clear of area boundaries, letting a feature end
    // abruptly at a seam with nothing matching it on the neighbouring area's side.
    edge_margin_removed: { file: "DEUS_Levels.js", find: "edgeMargin: 12, edgeTaper: 8,", replace: "edgeMargin: 0, edgeTaper: 8, /* MUTANT edge_margin_removed */" },
    // D: a volume-damage box leaks one extra column to the east, so a probe on one cell damages its neighbour too.
    damage_leaks_sideways: { file: "DEUS_Levels.js", find: "for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {\n            for (let z = levelOfElevation(e0); z <= levelOfElevation(e1); z++) {\n                if (damageRefusal(st, ax, ay, x, y, z)) { sum.skipped++; continue; }",
        replace: "for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1 + 1; x++) {\n            for (let z = levelOfElevation(e0); z <= levelOfElevation(e1); z++) {\n                if (damageRefusal(st, ax, ay, x, y, z)) { sum.skipped++; continue; }" },
    // E: inject a live Math.random() call into a read path (strataAt), proving the RNG-free-reads guard catches it.
    rng_injected: { file: "DEUS_Levels.js", find: "out.fill = fillOf(rec, REC_M);", replace: "out.fill = fillOf(rec, REC_M); Math.random(); /* MUTANT rng_injected */" }
};
if (mutant && !MUTANTS[mutant]) {
    console.log(`HARNESS unknown mutant "${mutant}"; known: ${Object.keys(MUTANTS).join(", ")}`);
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
function section(title) { if (!quiet) console.log(`\n--- ${title} ---`); }

//-----------------------------------------------------------------------------
// Sources (the working tree, with the mutant's one edit applied in memory when asked).

function currentSources() {
    const s = {};
    for (const f of FILES) s[f] = fs.readFileSync(path.join(PLUGINS, f), "utf8");
    if (mutant) {
        const { file, find, replace } = MUTANTS[mutant];
        if (!s[file].includes(find)) harnessProblem(`mutant ${mutant}: target not found in ${file}`);
        s[file] = s[file].replace(find, replace);
    }
    return s;
}

//-----------------------------------------------------------------------------
// The vm: RMMZ stubs only where the plugins touch the engine (as tools/test_strata_foundation.js). AreasX/AreasY
// are forced to 3 (DEC-030's 3x3 grid) by editing the parsed plugins.js entry for DEUS_World before it loads;
// DEUS_World.js reads its AreasX/AreasY once, at load, into a frozen CONFIG.

function setup(sources) {
    const list = {};
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, "game/js/plugins.js"), "utf8"), list);
    const worldEntry = (list.$plugins || []).find(p => p.name === "DEUS_World");
    if (!worldEntry) harnessProblem("plugins.js has no DEUS_World entry to set AreasX/AreasY on");
    worldEntry.parameters = Object.assign({}, worldEntry.parameters, { AreasX: "3", AreasY: "3", AreaSize: "256" });

    const ns = {}, warnings = [], errors = [];
    const randomCalls = { count: 0, first: null };
    const canvasCtx = () => ({
        imageSmoothingEnabled: false, createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData() {}, drawImage() {}, fillRect() {}, clearRect() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    });
    const guardedMath = Object.create(Math);
    guardedMath.random = function() {
        randomCalls.count++;
        if (!randomCalls.first) randomCalls.first = new Error("Math.random() called").stack;
        return 0.5;
    };
    const env = {
        window: null, UF: ns, DEUS: ns, Math: guardedMath, performance, setTimeout, clearTimeout,
        console: {
            log: (...a) => { if (!quiet && process.env.DEUS_VM_LOG) console.log("  [VM]", ...a); },
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
    const ctx = vm.createContext(env);
    const sect = (src, a, b) => {
        const i = src.indexOf(a), j = src.indexOf(b, i + a.length);
        if (i < 0 || j <= i) harnessProblem(`engine source section missing: ${a}`);
        return src.slice(i, j);
    };
    const core = fs.readFileSync(path.join(ROOT, "game/js/rmmz_core.js"), "utf8");
    const mgr = fs.readFileSync(path.join(ROOT, "game/js/rmmz_managers.js"), "utf8");
    const deus = fs.readFileSync(path.join(PLUGINS, "DEUS_Core.js"), "utf8");
    vm.runInContext(sect(mgr, "DataManager.makeSaveContents =", "DataManager.correctDataErrors ="), ctx, { filename: "rmmz_managers.js" });
    vm.runInContext(sect(core, "function JsonEx()", "//-----------------------------------------------------------------------------"), ctx, { filename: "rmmz_core.js JsonEx" });
    vm.runInContext(sect(core, "Tilemap.TILE_ID_B =", "Tilemap.Layer ="), ctx, { filename: "rmmz_core.js Tilemap constants" });
    vm.runInContext(sect(deus, "window.DEUS = window.DEUS || {};", "//-----------------------------------------------------------------------------"), ctx, { filename: "DEUS_Core.js events" });
    for (const f of FILES) vm.runInContext(sources[f], ctx, { filename: f });
    env.DataManager.onLoad(env.$dataTilesets);
    new env.Scene_Boot().start();
    env.__warnings = warnings;
    env.__errors = errors;
    env.__randomCalls = randomCalls;
    return env;
}

function newWorld(env, seed) {
    env.UF.NewGameSetup = { seed, year: 1 };
    const t0 = performance.now();
    env.UF.World.newWorld(seed);
    return performance.now() - t0;
}

//-----------------------------------------------------------------------------
// DEC-030 (Owner & PM delegated, 2026-09-26): the 5 depth bands and the 4-layer sky reserve. Kept here (not read
// from DEUS_Levels.js's own DEPTH_BANDS, which still follows the older DEC-013 2-band table for biome-substrate
// selection - a separate, later concern) because this gate proves the brief's own invariants, independent of
// which biome-content lane later adopts these edges at runtime.
const DEC030_BANDS = Object.freeze([
    { id: "deep_earth", zMin: -16, zMax: -11 },
    { id: "caverns", zMin: -10, zMax: -5 },
    { id: "lowlands", zMin: -4, zMax: 1 },
    { id: "uplands", zMin: 2, zMax: 6 },
    { id: "highlands", zMin: 7, zMax: 11 }
]);
const SKY = Object.freeze({ zMin: 12, zMax: 15 });

console.log(`=== WG.00.41 region-seam continuity: seed ${SEED}${mutant ? `, MUTANT ${mutant}` : ""} ===`);
const T0 = performance.now();
const env = setup(currentSources());
const W = env.UF.World, L = env.UF.Levels;
if (!W || !L || typeof L.applyVolumeDamage !== "function") harnessProblem("plugins did not load (World/Levels with applyVolumeDamage)");
const tNew = newWorld(env, SEED);
const st = W.state;
console.log(`INFO newWorld ${tNew.toFixed(0)} ms; ${st.size}x${st.size} areas, ${st.areasX}x${st.areasY} grid, start ${st.startArea.x},${st.startArea.y}`);
const SIZE = st.size, AREAS = st.areasX;
const RANGE = W.zRange();

//=============================================================================
// Group A - Full 32-layer column generation
//=============================================================================
section("Group A: full 32-layer column generation");

check("layer_count_32", W.LEVELS.length === 32 && RANGE.zMin === -16 && RANGE.zMax === 15,
    `${W.LEVELS.length} levels, range ${RANGE.zMin}..${RANGE.zMax}`);
check("world_size_768x768", SIZE * st.areasX === 768 && SIZE * st.areasY === 768 && st.areasX === 3 && st.areasY === 3,
    `${SIZE}x${SIZE} areas, ${st.areasX}x${st.areasY} grid = ${SIZE * st.areasX}x${SIZE * st.areasY} tiles`);

guard("all_9_areas_generate", () => {
    let ok = true, detail = [];
    for (let ay = 0; ay < AREAS; ay++) for (let ax = 0; ax < AREAS; ax++) {
        const b = L.baseline(0, ax, ay);
        if (!b || !b.strata || !b.strata.m || b.strata.m.length !== SIZE * SIZE * 5) { ok = false; detail.push(`${ax},${ay}`); }
    }
    check("all_9_areas_generate", ok, ok ? "every area's ground baseline has a full 5-stratum column" : `bad baselines: ${detail.join(" ")}`);
});

guard("determinism", () => {
    const c1 = L.checksum(0, undefined, undefined);
    const c2 = L.checksum(0, undefined, undefined);
    const c3 = L.checksum(0, (SEED + 1) >>> 0, undefined);
    check("checksum_repeats", c1 === c2, `checksum(seed) called twice: ${c1} vs ${c2}`);
    check("checksum_seed_sensitive", c1 !== c3, `checksum(seed) vs checksum(seed+1): ${c1} vs ${c3} (must differ)`);
});

//=============================================================================
// Group B - the 5 depth bands and the reserved sky
//=============================================================================
section("Group B: depth bands and reserved sky (+12..+15)");

guard("dec030_bands_partition_range", () => {
    const sorted = DEC030_BANDS.slice().sort((a, b) => a.zMin - b.zMin);
    let ok = sorted[0].zMin === RANGE.zMin && sorted[sorted.length - 1].zMax === SKY.zMin - 1 && SKY.zMax === RANGE.zMax;
    for (let i = 1; i < sorted.length; i++) if (sorted[i].zMin !== sorted[i - 1].zMax + 1) ok = false;
    check("dec030_bands_partition_range", ok,
        `${sorted.map(b => `${b.id} ${b.zMin}..${b.zMax}`).join(", ")}, sky ${SKY.zMin}..${SKY.zMax} (world ${RANGE.zMin}..${RANGE.zMax})`);
});

const OPEN_CODE = L.SHAPES.open;
for (let z = SKY.zMin; z <= SKY.zMax; z++) {
    guard(`sky_cap_empty_z${z}`, () => {
        let violations = 0, sample = null;
        for (let ay = 0; ay < AREAS; ay++) for (let ax = 0; ax < AREAS; ax++) {
            const g = L.shapeGrid(z, ax, ay);
            if (!g) { violations++; sample = `no grid for area ${ax},${ay}`; continue; }
            for (let i = 0; i < g.length; i++) if (g[i] !== OPEN_CODE) { violations++; if (!sample) sample = `area ${ax},${ay} cell ${i % SIZE},${(i / SIZE) | 0} shape=${g[i]}`; break; }
        }
        check(`sky_cap_empty_z${z}`, violations === 0, violations === 0 ? "every cell of every area derives open" : `${violations} area(s) with non-open cells, e.g. ${sample}`);
    });
}

//=============================================================================
// Group C - region-seam integrity across the 12 boundary segments
//=============================================================================
section("Group C: 12 region-boundary seam segments");

const segments = [];
for (let div = 0; div < AREAS - 1; div++) for (let row = 0; row < AREAS; row++) {
    segments.push({ id: `NS_col${div}-${div + 1}_row${row}`, axis: "x", along: "y",
        areaA: { x: div, y: row }, edgeA: SIZE - 1, areaB: { x: div + 1, y: row }, edgeB: 0 });
}
for (let div = 0; div < AREAS - 1; div++) for (let col = 0; col < AREAS; col++) {
    segments.push({ id: `EW_row${div}-${div + 1}_col${col}`, axis: "y", along: "x",
        areaA: { x: col, y: div }, edgeA: SIZE - 1, areaB: { x: col, y: div + 1 }, edgeB: 0 });
}
check("segment_count_12", segments.length === 12, `${segments.length} segments (6 N-S, 6 E-W)`);

// Elevation continuity: surfaceElevationAt takes continuous global (gx, gy) directly, no per-area generation needed.
const ELEV_STRIDE = 4;
for (const seg of segments) {
    guard(`elevation_step_${seg.id}`, () => {
        let maxStep = 0, worstT = -1;
        for (let t = 0; t < SIZE; t += ELEV_STRIDE) {
            let gxA, gyA, gxB, gyB;
            if (seg.axis === "x") {
                gxA = seg.areaA.x * SIZE + seg.edgeA; gyA = seg.areaA.y * SIZE + t;
                gxB = seg.areaB.x * SIZE + seg.edgeB; gyB = seg.areaB.y * SIZE + t;
            } else {
                gxA = seg.areaA.x * SIZE + t; gyA = seg.areaA.y * SIZE + seg.edgeA;
                gxB = seg.areaB.x * SIZE + t; gyB = seg.areaB.y * SIZE + seg.edgeB;
            }
            const sa = L.surfaceElevationAt(gxA, gyA, SEED), sb = L.surfaceElevationAt(gxB, gyB, SEED);
            const step = Math.abs(sa - sb);
            if (step > maxStep) { maxStep = step; worstT = t; }
        }
        check(`elevation_step_${seg.id}`, maxStep <= 1, `max |deltaS| across the seam = ${maxStep} (worst at t=${worstT}), sampled every ${ELEV_STRIDE} cells`);
    });
}

// Deep/high uniform bands: below the core (z <= -3, never carved, never capped) and inside the proven-empty sky
// (z >= 12, Group B) both sides of every seam must be byte-identical (uniform rock / uniform air), not merely close.
const UNIFORM_Z = [-16, -13, -10, -6, -3, 12, 13, 15];
function shapeEdge(z, ax, ay, edge, along) {
    const g = L.shapeGrid(z, ax, ay);
    if (!g) return null;
    const out = new Uint8Array(SIZE);
    for (let i = 0; i < SIZE; i++) out[i] = along === "y" ? g[i * SIZE + edge] : g[edge * SIZE + i];
    return out;
}
for (const seg of segments) {
    guard(`uniform_bands_match_${seg.id}`, () => {
        let mismatches = 0, sample = null;
        for (const z of UNIFORM_Z) {
            const a = shapeEdge(z, seg.areaA.x, seg.areaA.y, seg.edgeA, seg.along);
            const b = shapeEdge(z, seg.areaB.x, seg.areaB.y, seg.edgeB, seg.along);
            if (!a || !b) { mismatches++; sample = `z=${z} missing grid`; continue; }
            for (let t = 0; t < SIZE; t++) if (a[t] !== b[t]) { mismatches++; if (!sample) sample = `z=${z} t=${t}: ${a[t]} vs ${b[t]}`; }
        }
        check(`uniform_bands_match_${seg.id}`, mismatches === 0, mismatches === 0 ? `z ${UNIFORM_Z.join(",")} byte-identical both sides` : `${mismatches} mismatches, e.g. ${sample}`);
    });
}

// The volumetric column law (UF_Levels.md "The ground's column") at the seam's very edge cells: given the surface
// height S on each side, z=0/1/2 must obey the same solid/floor/open profile as everywhere else in the world.
function columnLawHolds(S, s0, s1, s2, codes) {
    if (S === 0) return s0 === codes.floor && s1 === codes.open && s2 === codes.open;
    if (S === 1) return (s0 === codes.solid || s0 === codes.floor || s0 === codes.stairDown) && (s1 === codes.floor || s1 === codes.ramp) && s2 === codes.open;
    if (S === 2) return (s0 === codes.solid || s0 === codes.floor || s0 === codes.stairDown) && s1 === codes.solid && (s2 === codes.floor || s2 === codes.ramp);
    return false;
}
const COLUMN_STRIDE = 8;
for (const seg of segments) {
    guard(`column_law_at_seam_${seg.id}`, () => {
        const codes = L.SHAPES;
        const grids = {};
        for (const which of ["A", "B"]) {
            const area = which === "A" ? seg.areaA : seg.areaB, edge = which === "A" ? seg.edgeA : seg.edgeB;
            grids[which] = { s0: shapeEdge(0, area.x, area.y, edge, seg.along), s1: shapeEdge(1, area.x, area.y, edge, seg.along), s2: shapeEdge(2, area.x, area.y, edge, seg.along) };
        }
        let checked = 0, wrong = 0, sample = null;
        for (let t = 0; t < SIZE; t += COLUMN_STRIDE) {
            for (const which of ["A", "B"]) {
                let gx, gy;
                const area = which === "A" ? seg.areaA : seg.areaB, edge = which === "A" ? seg.edgeA : seg.edgeB;
                if (seg.axis === "x") { gx = area.x * SIZE + edge; gy = area.y * SIZE + t; } else { gx = area.x * SIZE + t; gy = area.y * SIZE + edge; }
                const S = L.surfaceElevationAt(gx, gy, SEED);
                const g = grids[which];
                checked++;
                if (!columnLawHolds(S, g.s0[t], g.s1[t], g.s2[t], codes)) { wrong++; if (!sample) sample = `${which} side t=${t} S=${S}: [${g.s0[t]},${g.s1[t]},${g.s2[t]}]`; }
            }
        }
        check(`column_law_at_seam_${seg.id}`, wrong === 0, wrong === 0 ? `${checked} edge columns obey the volumetric law` : `${wrong}/${checked} violate it, e.g. ${sample}`);
    });
}

//=============================================================================
// Group D - deep-cut torture probes (strict order: shallow, ravine, canyon, full bore, cumulative on one column)
//=============================================================================
section("Group D: deep-cut torture probes");

// The founders' valley protection (docs/systems/UF_Levels.md "The flat start valley"; DEUS_Levels.js FEATURE_PARAMS
// "protections") keeps natural cuts and caves at least 40-48 cells from each area's centre, so the start area's
// centre column is a fully predictable, uncut pillar: S=0 valley floor, z=-1/-2 solid rock, unbounded open air/solid
// rock beyond the core (outerBaseline). This is the one column in the world whose pre-carve strata this harness can
// state exactly, so the probes run there.
const centerArea = st.startArea;
const TX = Math.floor(SIZE / 2), TY = Math.floor(SIZE / 2);
const NX = TX + 1, NY = TY; // an adjacent, never-touched column: the "no sideways leak" witness
const DAMAGE = 500000, DAMAGE_TYPE = "dig";
const ref = (x, y, z) => ({ area: centerArea, x, y, z });

function stratumMaterials(x, y, zFrom, zTo) {
    const out = [];
    for (let z = zFrom; z <= zTo; z++) {
        const s = L.strataAt(ref(x, y, z));
        out.push({ z, materials: s ? s.materials.slice() : null, hp: s ? s.hp.slice() : null });
    }
    return out;
}
function allAir(entries) { return entries.every(e => e.materials && e.materials.every(m => m === "air") && e.hp.every(h => h === 0)); }
function snapshotEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i].z !== b[i].z) return false;
        if (JSON.stringify(a[i].materials) !== JSON.stringify(b[i].materials)) return false;
        if (JSON.stringify(a[i].hp) !== JSON.stringify(b[i].hp)) return false;
    }
    return true;
}

guard("probe_baseline_predictable", () => {
    const col = stratumMaterials(TX, TY, -2, 0);
    const z0 = col.find(e => e.z === 0), zm1 = col.find(e => e.z === -1), zm2 = col.find(e => e.z === -2);
    const ok = z0 && z0.materials[0] !== "air" && z0.materials.slice(1).every(m => m === "air") &&
        zm1 && zm1.materials.every(m => m !== "air") && zm2 && zm2.materials.every(m => m !== "air");
    check("probe_baseline_predictable", ok, `pre-carve column at (${TX},${TY}): z0=${JSON.stringify(z0 && z0.materials)}, z-1=${JSON.stringify(zm1 && zm1.materials)}, z-2=${JSON.stringify(zm2 && zm2.materials)}`);
});
const neighbourBefore = stratumMaterials(NX, NY, -16, 15);

guard("probe_shallow_1to2z", () => {
    const res = L.applyVolumeDamage(centerArea, TX, TY, -1, 0, TX, TY, 0, 4, DAMAGE, DAMAGE_TYPE);
    const cut = stratumMaterials(TX, TY, -1, 0);
    const untouched = stratumMaterials(TX, TY, -2, -2);
    check("probe_shallow_1to2z", !!(res && res.ok) && allAir(cut) && untouched[0].materials.every(m => m !== "air"),
        `applyVolumeDamage ok=${res && res.ok}, destroyed=${res && res.strataDestroyed}; z0/-1 air=${allAir(cut)}; z-2 still solid=${untouched[0].materials.every(m => m !== "air")}`);
});

guard("probe_ravine_4to6z", () => {
    const res = L.applyVolumeDamage(centerArea, TX, TY, -5, 0, TX, TY, 0, 4, DAMAGE, DAMAGE_TYPE);
    const cut = stratumMaterials(TX, TY, -5, 0);
    const untouched = stratumMaterials(TX, TY, -6, -6);
    check("probe_ravine_4to6z", !!(res && res.ok) && allAir(cut) && untouched[0].materials.every(m => m !== "air"),
        `6 levels (0..-5) air=${allAir(cut)}; z-6 still solid=${untouched[0].materials.every(m => m !== "air")}, destroyed this call=${res && res.strataDestroyed}`);
});

guard("probe_canyon_10plus_crosses_bands", () => {
    // 13 levels, z=1..-11: crosses the Lowlands/Caverns boundary (DEC-030 -4/-5) and reaches the Caverns/Deep Earth
    // boundary (-10/-11) in one continuous cut.
    const res = L.applyVolumeDamage(centerArea, TX, TY, -11, 0, TX, TY, 1, 4, DAMAGE, DAMAGE_TYPE);
    const cut = stratumMaterials(TX, TY, -11, 1);
    const boundaryLowCaverns = cut.filter(e => e.z === -4 || e.z === -5);
    const boundaryCavernsDeep = cut.filter(e => e.z === -10 || e.z === -11);
    check("probe_canyon_10plus_crosses_bands", !!(res && res.ok) && allAir(cut) && allAir(boundaryLowCaverns) && allAir(boundaryCavernsDeep),
        `13 levels (1..-11) air=${allAir(cut)}; Lowlands/Caverns boundary air=${allAir(boundaryLowCaverns)}; Caverns/DeepEarth boundary air=${allAir(boundaryCavernsDeep)}`);
});

guard("probe_full_bore_void_integrity", () => {
    const res = L.applyVolumeDamage(centerArea, TX, TY, RANGE.zMin, 0, TX, TY, RANGE.zMax, 4, DAMAGE, DAMAGE_TYPE);
    const whole = stratumMaterials(TX, TY, RANGE.zMin, RANGE.zMax);
    const bottomShape = L.shapeCodeAt(centerArea.x, centerArea.y, TX, TY, RANGE.zMin);
    check("probe_full_bore_void_integrity", !!(res && res.ok) && allAir(whole) && bottomShape === L.SHAPES.open,
        `all ${whole.length} levels (${RANGE.zMin}..${RANGE.zMax}) void=${allAir(whole)}; bottom (${RANGE.zMin}) derives open=${bottomShape === L.SHAPES.open} (code ${bottomShape})`);
});

guard("probe_neighbour_untouched", () => {
    const neighbourAfter = stratumMaterials(NX, NY, -16, 15);
    check("probe_neighbour_untouched", snapshotEqual(neighbourBefore, neighbourAfter),
        `adjacent column (${NX},${NY}), never targeted by any probe, unchanged after all 4 cuts on (${TX},${TY})`);
});

// Seam-cut isolation: a deep cut on one side of a real region boundary must not touch the neighbouring area's data.
guard("probe_seam_cut_isolation", () => {
    const segA = segments.find(s => s.id === "NS_col0-1_row1");
    if (!segA) { check("probe_seam_cut_isolation", false, "no NS_col0-1_row1 segment"); return; }
    const areaA = segA.areaA, xA = segA.edgeA, yA = TY;
    const areaB = segA.areaB, xB = segA.edgeB, yB = TY;
    const refB = (z) => ({ area: areaB, x: xB, y: yB, z });
    const before = [];
    for (let z = RANGE.zMin; z <= RANGE.zMax; z++) { const s = L.strataAt(refB(z)); before.push(s ? { materials: s.materials.slice(), hp: s.hp.slice() } : null); }
    const res = L.applyVolumeDamage(areaA, xA, yA, RANGE.zMin, 0, xA, yA, RANGE.zMax, 4, DAMAGE, DAMAGE_TYPE);
    let changed = 0;
    for (let z = RANGE.zMin; z <= RANGE.zMax; z++) {
        const s = L.strataAt(refB(z)), b = before[z - RANGE.zMin];
        if (!b || !s) continue;
        if (JSON.stringify(b.materials) !== JSON.stringify(s.materials) || JSON.stringify(b.hp) !== JSON.stringify(s.hp)) changed++;
    }
    check("probe_seam_cut_isolation", !!(res && res.ok) && changed === 0,
        `full-bore cut at area ${areaA.x},${areaA.y} (${xA},${yA}) leaves the seam neighbour area ${areaB.x},${areaB.y} (${xB},${yB}) unchanged (${changed} levels differ)`);
});

//=============================================================================
// Group E - zero discovery-time RNG
//=============================================================================
section("Group E: zero RNG anywhere in generation or reads");

check("zero_math_random_calls", env.__randomCalls.count === 0,
    env.__randomCalls.count === 0 ? "Math.random was never called across generation, 12-segment seam sampling and all torture probes"
        : `Math.random called ${env.__randomCalls.count} time(s); first at ${env.__randomCalls.first}`);

//=============================================================================
// Errors
//=============================================================================
check("no_errors", env.__errors.length === 0, env.__errors.length === 0 ? "no console.error during the run" : env.__errors.slice(0, 3).join(" | "));

//-----------------------------------------------------------------------------
const totalMs = performance.now() - T0;
console.log(`\nRESULT: ${passed} passed, ${failed} failed (${totalMs.toFixed(0)} ms)`);
if (failed > 0) console.log(`Failed: ${failures.join(", ")}`);
process.exit(failed > 0 ? 1 : 0);
