#!/usr/bin/env node
"use strict";

/**
 * tools/test_structure_fluid.js
 *
 * NAT.02.01 part 3. A falling slab and a mined floor against real Fluid.
 *
 *   node tools/test_structure_fluid.js
 *   node tools/test_structure_fluid.js --no-sweep
 *   node tools/test_structure_fluid.js --mutant=NAME
 *
 * The three mutants are text edits of commit.js, compiled in memory. Each edit
 * must match exactly once. Child processes exit 1 when a check fails.
 * World, Levels and Fluid boot through the node vm harness in
 * tools/test_strata_fluid_reconciliation.js. The fall commit is the only writer
 * under test; it receives Fluid.setCell as a spy and must not call it.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const Module = require("module");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const STRUCT = path.join(ROOT, "game", "js", "sim", "structural");
const COMMIT_PATH = path.join(STRUCT, "commit.js");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const simHook = require("./lib/vm_sim_require");

const args = process.argv.slice(2);
const MUTANT_ARG = (args.find(a => a.startsWith("--mutant=")) || "").slice("--mutant=".length);
const SWEEP = !MUTANT_ARG && !args.includes("--no-sweep");

const MUTANTS = [
    { name: "fall_deletes_displaced", from: "const DELETE_DISPLACED = false;", to: "const DELETE_DISPLACED = true;" },
    { name: "fill_before_vacate", from: "const ORDER_VACATE_FIRST = true;", to: "const ORDER_VACATE_FIRST = false;" },
    { name: "skip_event", from: "const EMIT_STRUCTURE_FELL = true;", to: "const EMIT_STRUCTURE_FELL = false;" }
];

const STONE = ["stone", "stone", "stone", "stone", "stone"];
const AIR = ["air", "air", "air", "air", "air"];
const DECK = ["stone", "air", "air", "air", "air"];
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const AREA = { x: 0, y: 0 };

let passes = 0;
let fails = 0;
function check(name, cond, detail) {
    const extra = detail ? " - " + detail : "";
    if (cond) {
        passes++;
        console.log("PASS: " + name + extra);
    } else {
        fails++;
        console.error("FAIL: " + name + extra);
    }
    return !!cond;
}

function compileCommit(mutantName) {
    let source = fs.readFileSync(COMMIT_PATH, "utf8");
    if (mutantName) {
        const mut = MUTANTS.find(m => m.name === mutantName);
        if (!mut) {
            console.error("unknown mutant \"" + mutantName + "\"; known: " + MUTANTS.map(m => m.name).join(", "));
            process.exit(2);
        }
        const parts = source.split(mut.from);
        if (parts.length !== 2) {
            console.error("mutant " + mutantName + " matched " + (parts.length - 1) + " times");
            process.exit(2);
        }
        source = parts.join(mut.to);
    }
    const m = new Module(COMMIT_PATH);
    m.filename = COMMIT_PATH;
    m.paths = Module._nodeModulePaths(STRUCT);
    m._compile(source, COMMIT_PATH);
    return m.exports.commitFall;
}

function buildEnvironment(seed) {
    const list = {};
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, "game/js/plugins.js"), "utf8"), list);
    const warnings = [];
    const errors = [];
    const canvasCtx = () => ({
        imageSmoothingEnabled: false,
        createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData() {}, drawImage() {}, fillRect() {}, clearRect() {},
        getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    });
    const env = {
        window: null, UF: {}, DEUS: null, Math: Math, performance: performance,
        setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval, clearInterval: clearInterval,
        process: { env: { DEUS_Z_RANGE: "legacy" }, argv: [], cwd: () => path.join(ROOT, "game"), version: process.version },
        console: {
            log() {},
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
        Tilemap: function () {},
        $dataTilesets: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/Tilesets.json"), "utf8")),
        $ufWorldCatalog: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/UF_WorldCatalog.json"), "utf8")),
        $ufTime: { year: 1, monthIndex: 0, day: 1, hour: 8, minute: 0 },
        $gameSystem: {}, $gameScreen: { weatherType: () => "none", weatherPower: () => 0, changeWeather() {} },
        $gameTimer: {}, $gameSwitches: {}, $gameVariables: {}, $gameSelfSwitches: {}, $gameActors: {}, $gameParty: {}
    };
    env.window = env;
    env.globalThis = env;
    env.DEUS = env.UF;
    env.$deusWorldCatalog = env.$ufWorldCatalog;
    env.Tilemap.TILE_ID_A1 = 2048;
    env.Tilemap.TILE_ID_A2 = 2816;
    env.Tilemap.isTileA1 = id => id >= 2048 && id < 2816;
    env.Tilemap.isWaterTile = id => env.Tilemap.isTileA1(id);
    for (const name of ["Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_Map", "Game_Player", "Game_CharacterBase", "Game_Event", "Spriteset_Map", "Spriteset_Base"]) {
        env[name] = vm.runInNewContext("(function " + name + "(){})");
        env[name].prototype.initialize = function () {};
    }
    env.Scene_Boot.prototype.start = function () {};
    env.Scene_Boot.prototype.isReady = function () { return true; };
    env.Spriteset_Map.prototype.createCharacters = function () {};
    env.Sprite = vm.runInNewContext("(function Sprite(bitmap) {\n" +
        "this.anchor = { x: 0, y: 0, set(a, b) { this.x = a; this.y = b; } };\n" +
        "this.children = []; this.parent = null; this.visible = true; this.bitmap = bitmap || null; this.x = 0; this.y = 0; this.z = 0;\n" +
        "})");
    Object.assign(env.Sprite.prototype, { update() {}, addChild(c) { c.parent = this; this.children.push(c); return c; } });
    env.Bitmap = vm.runInNewContext("(function Bitmap(w, h) {\n" +
        "this.width = w || 0; this.height = h || 0;\n" +
        "this.context = { imageSmoothingEnabled: false, drawImage() {}, putImageData() {}, fillRect() {} };\n" +
        "this._baseTexture = { update() {} };\n" +
        "})");
    Object.assign(env.Bitmap.prototype, { isReady() { return true; }, isError() { return false; }, clear() {}, clearRect() {}, fillRect() {}, blt() {} });
    env.Bitmap.load = () => ({ isReady: () => false, isError: () => false });
    Object.assign(env.Game_Map.prototype, {
        mapId() { return this._mapId || 0; }, width: () => 256, height: () => 256, update() {}, tileId: () => 0, tilesetFlags: () => [],
        isPassable: () => true, checkPassage: () => true,
        displayX() { return 0; }, displayY() { return 0; }, screenTileX: () => 17, screenTileY: () => 13,
        adjustX(x) { return x; }, adjustY(y) { return y; },
        roundXWithDirection: (x, d) => x + (d === 6 ? 1 : d === 4 ? -1 : 0),
        roundYWithDirection: (y, d) => y + (d === 2 ? 1 : d === 8 ? -1 : 0),
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
        const i = src.indexOf(a);
        const j = src.indexOf(b, i + a.length);
        if (i < 0 || j <= i) throw new Error("engine source section missing: " + a);
        return src.slice(i, j);
    };
    const core = fs.readFileSync(path.join(ROOT, "game/js/rmmz_core.js"), "utf8");
    const mgr = fs.readFileSync(path.join(ROOT, "game/js/rmmz_managers.js"), "utf8");
    const deus = fs.readFileSync(path.join(PLUGINS, "DEUS_Core.js"), "utf8");
    vm.runInContext(section(mgr, "DataManager.makeSaveContents =", "DataManager.correctDataErrors ="), ctx, { filename: "rmmz_managers.js" });
    vm.runInContext(section(core, "function JsonEx()", "//-----------------------------------------------------------------------------"), ctx, { filename: "rmmz_core.js JsonEx" });
    vm.runInContext(section(core, "Tilemap.TILE_ID_B =", "Tilemap.Layer ="), ctx, { filename: "rmmz_core.js Tilemap constants" });
    vm.runInContext(section(deus, "window.DEUS = window.DEUS || {};", "//-----------------------------------------------------------------------------"), ctx, { filename: "DEUS_Core.js events" });
    const pluginFiles = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Tiles.js", "DEUS_Objects.js", "DEUS_Levels.js", "DEUS_Floors.js", "DEUS_Fluid.js"];
    for (let i = 0; i < pluginFiles.length; i++) {
        const file = pluginFiles[i];
        vm.runInContext(fs.readFileSync(path.join(PLUGINS, file), "utf8"), ctx, { filename: file });
    }
    env.DataManager.onLoad(env.$dataTilesets);
    env.UF.NewGameSetup = { seed: seed, year: 1 };
    new env.Scene_Boot().start();
    if (!env.UF.World.state || env.UF.World.state.seed !== seed) env.UF.World.newWorld(seed);
    env.__warnings = warnings;
    env.__errors = errors;
    return env;
}

function paint(Levels, x, y, z, materials) {
    const hp = materials.map(k => (k === "air" || k === "water" || k === "lava") ? 0 : 255);
    return Levels.setStrata({ area: AREA, x: x, y: y, z: z }, { m: materials, hp: hp, connector: 0 });
}

function seal(Levels, x, y, zs) {
    for (let i = 0; i < zs.length; i++) {
        for (let d = 0; d < DIRS.length; d++) {
            if (paint(Levels, x + DIRS[d][0], y + DIRS[d][1], zs[i], STONE) !== true) return false;
        }
    }
    return true;
}

function clearObjects(World, x, y, zs) {
    const cells = [[x, y]];
    for (let d = 0; d < DIRS.length; d++) cells.push([x + DIRS[d][0], y + DIRS[d][1]]);
    for (let i = 0; i < cells.length; i++) {
        for (let k = 0; k < zs.length; k++) {
            World.getObject(0, 0, cells[i][0], cells[i][1], zs[k]);
            World.setObject(0, 0, cells[i][0], cells[i][1], 0, zs[k]);
        }
    }
}

function columnPlan(x, y) {
    const vacated = [];
    const filled = [];
    for (let s = 0; s < 5; s++) {
        vacated.push({ x: x, y: y, z: 1, s: s });
        filled.push({ x: x, y: y, z: 0, s: s });
    }
    return { area: AREA, drop: 5, vacated: vacated, filled: filled };
}

function books(Fluid) {
    const d = Fluid.diagnostics();
    return {
        water: d.totalWaterMass,
        lava: d.totalLavaMass,
        waterVol: d.totalWaterVolume,
        lavaVol: d.totalLavaVolume,
        queue: d.activeQueueLength
    };
}

function fall(commitFall, Levels, Fluid, plan) {
    let direct = 0;
    let fell = 0;
    let res;
    try {
        res = commitFall(plan, {
            levels: {
                strataAt(ref) { return Levels.strataAt(ref); },
                setStrata(ref, spec, opts) { return Levels.setStrata(ref, spec, opts); }
            },
            events: {
                emit(name) { if (name === "structure:fell") fell++; }
            },
            fluid: {
                setCell(area, x, y, z, type, depth) {
                    direct++;
                    return Fluid.setCell(area, x, y, z, type, depth);
                }
            }
        });
    } catch (e) {
        res = { ok: false, reason: e && e.stack ? e.stack : String(e) };
    }
    return { res: res, direct: direct, fell: fell };
}

function placePool(Levels, Fluid, x, y, type) {
    const sealed = seal(Levels, x, y, [0, 1]);
    const slab = paint(Levels, x, y, 1, STONE);
    const pool = paint(Levels, x, y, 0, AIR);
    const cap = Fluid.fluidCapacityAt(0, 0, x, y, 0);
    const above = Fluid.fluidCapacityAt(0, 0, x, y, 1);
    Fluid.setCell(AREA, x, y, 0, type, cap);
    return {
        sealed: sealed,
        slab: slab,
        pool: pool,
        cap: cap,
        above: above,
        depth: Fluid.depthAt(0, 0, x, y, 0),
        type: Fluid.typeAt(0, 0, x, y, 0)
    };
}

function describe(Fluid, x, y, before, after) {
    return "water " + before.water + "->" + after.water +
        " lava " + before.lava + "->" + after.lava +
        " volW " + before.waterVol + "->" + after.waterVol +
        " volL " + before.lavaVol + "->" + after.lavaVol +
        " z0 " + Fluid.depthAt(0, 0, x, y, 0) + "/" + Fluid.typeAt(0, 0, x, y, 0) +
        " z1 " + Fluid.depthAt(0, 0, x, y, 1) + "/" + Fluid.typeAt(0, 0, x, y, 1);
}

function runFluid(commitFall) {
    let env;
    try {
        env = buildEnvironment(20260923);
    } catch (e) {
        check("fluid_vm_boots", false, e && e.stack ? e.stack : String(e));
        return;
    }
    const bootErrors = env.__errors || [];
    check("fluid_vm_boots", bootErrors.length === 0 && env.UF && env.UF.Fluid && env.UF.Levels, bootErrors.slice(0, 2).join(" | "));
    if (!env.UF || !env.UF.Fluid || !env.UF.Levels || !env.UF.World) return;

    const Fluid = env.UF.Fluid;
    const Levels = env.UF.Levels;
    const World = env.UF.World;
    const zr = World.zRange();
    check("fluid_legacy_world", zr.zMin === -2 && zr.zMax === 2, zr.zMin + ".." + zr.zMax);
    Fluid.reset();

    const water = placePool(Levels, Fluid, 20, 20, "water");
    check("water_pool_ready", water.sealed && water.slab === true && water.pool === true && water.cap === 7 && water.above === 0 && water.depth === 7 && water.type === "water",
        "cap " + water.cap + " above " + water.above + " depth " + water.depth + " type " + water.type);
    const waterBefore = books(Fluid);
    const waterFall = fall(commitFall, Levels, Fluid, columnPlan(20, 20));
    const waterAfter = books(Fluid);
    const waterStranded = (waterAfter.water - waterAfter.waterVol) - (waterBefore.water - waterBefore.waterVol);
    check("slab_into_pool_conserves_water",
        waterFall.res.ok === true &&
        waterAfter.water === waterBefore.water &&
        waterAfter.lava === waterBefore.lava &&
        waterStranded === 0 &&
        Fluid.depthAt(0, 0, 20, 20, 1) === 7 &&
        Fluid.depthAt(0, 0, 20, 20, 0) === 0 &&
        Fluid.typeAt(0, 0, 20, 20, 1) === "water",
        (waterFall.res.ok ? "" : waterFall.res.reason + " ") + describe(Fluid, 20, 20, waterBefore, waterAfter));

    const lava = placePool(Levels, Fluid, 24, 24, "lava");
    check("lava_pool_ready", lava.sealed && lava.slab === true && lava.pool === true && lava.cap === 7 && lava.above === 0 && lava.depth === 7 && lava.type === "lava",
        "cap " + lava.cap + " depth " + lava.depth + " type " + lava.type);
    const lavaBefore = books(Fluid);
    const lavaFall = fall(commitFall, Levels, Fluid, columnPlan(24, 24));
    const lavaAfter = books(Fluid);
    const lavaStranded = (lavaAfter.lava - lavaAfter.lavaVol) - (lavaBefore.lava - lavaBefore.lavaVol);
    check("slab_into_pool_conserves_lava",
        lavaFall.res.ok === true &&
        lavaAfter.lava === lavaBefore.lava &&
        lavaAfter.water === lavaBefore.water &&
        lavaStranded === 0 &&
        Fluid.depthAt(0, 0, 24, 24, 1) === 7 &&
        Fluid.depthAt(0, 0, 24, 24, 0) === 0 &&
        Fluid.typeAt(0, 0, 24, 24, 1) === "lava" &&
        Fluid.typeAt(0, 0, 20, 20, 1) === "water",
        (lavaFall.res.ok ? "" : lavaFall.res.reason + " ") + describe(Fluid, 24, 24, lavaBefore, lavaAfter) +
        " waterCell " + Fluid.typeAt(0, 0, 20, 20, 1));

    check("water_and_lava_stay_unmixed",
        Fluid.typeAt(0, 0, 20, 20, 1) === "water" &&
        Fluid.typeAt(0, 0, 24, 24, 1) === "lava" &&
        Fluid.typeAt(0, 0, 20, 20, 0) !== "lava" &&
        Fluid.typeAt(0, 0, 24, 24, 0) !== "water");

    Fluid.reset();
    clearObjects(World, 28, 28, [0, -1, -2]);
    const lakeSealed = seal(Levels, 28, 28, [0, -1]);
    const lakeBed = paint(Levels, 28, 28, -2, STONE);
    const lakeBelow = paint(Levels, 28, 28, -1, AIR);
    const lakeFloor = paint(Levels, 28, 28, 0, DECK);
    const lakeCap = Fluid.fluidCapacityAt(0, 0, 28, 28, 0);
    Fluid.setCell(AREA, 28, 28, 0, "water", lakeCap);
    const held = Fluid.fluidCanPassDown(0, 0, 28, 28, 0) === false;
    const stoppedBelow = Fluid.fluidCanPassDown(0, 0, 28, 28, -1) === false;
    check("lake_is_held", lakeSealed && lakeBed === true && lakeBelow === true && lakeFloor === true && lakeCap === 6 && Fluid.depthAt(0, 0, 28, 28, 0) === 6 && held && stoppedBelow,
        "cap " + lakeCap + " depth " + Fluid.depthAt(0, 0, 28, 28, 0) + " down " + Fluid.fluidCanPassDown(0, 0, 28, 28, 0));
    const mined = Levels.setStrata({ area: AREA, x: 28, y: 28, z: 0 }, { m: AIR, hp: [0, 0, 0, 0, 0], connector: 0 }, { cause: "mine" });
    const opened = Fluid.fluidCanPassDown(0, 0, 28, 28, 0) === true;
    const lakeBefore = books(Fluid);
    const sourceBefore = Fluid.depthAt(0, 0, 28, 28, 0);
    const processed = Fluid.tick(100000);
    const lakeAfter = books(Fluid);
    check("floor_mined_lake_drains_down",
        mined === true && opened &&
        sourceBefore > Fluid.depthAt(0, 0, 28, 28, 0) &&
        Fluid.depthAt(0, 0, 28, 28, -1) > 0 &&
        Fluid.depthAt(0, 0, 28, 28, 0) === 0 &&
        Fluid.depthAt(0, 0, 28, 28, -1) === sourceBefore &&
        lakeAfter.water === lakeBefore.water &&
        lakeAfter.lava === lakeBefore.lava,
        "processed " + processed + " source " + sourceBefore + "->" + Fluid.depthAt(0, 0, 28, 28, 0) +
        " below " + Fluid.depthAt(0, 0, 28, 28, -1) +
        " mass " + lakeBefore.water + "->" + lakeAfter.water +
        " down " + Fluid.fluidCanPassDown(0, 0, 28, 28, 0));

    Fluid.reset();
    clearObjects(World, 16, 16, [0, -1]);
    const wakeSrc = paint(Levels, 16, 16, 0, DECK);
    const wakeDst = paint(Levels, 16, 16, -1, AIR);
    Fluid.reset();
    const queueBefore = Fluid.diagnostics().activeQueueLength;
    const woke = fall(commitFall, Levels, Fluid, {
        area: AREA,
        drop: 1,
        vacated: [{ x: 16, y: 16, z: 0, s: 0 }],
        filled: [{ x: 16, y: 16, z: -1, s: 4 }]
    });
    const queueAfter = Fluid.diagnostics().activeQueueLength;
    check("vacate_wakes_neighbours",
        wakeSrc === true && wakeDst === true && woke.res.ok === true && queueBefore === 0 && queueAfter >= 7,
        "queue " + queueBefore + "->" + queueAfter + (woke.res.ok ? "" : " " + woke.res.reason));

    const direct = waterFall.direct + lavaFall.direct + woke.direct;
    check("no_fluid_write_by_fall", direct === 0, "direct calls " + direct);
    check("structure_fell_once", waterFall.fell === 1 && lavaFall.fell === 1 && woke.fell === 1,
        "water " + waterFall.fell + " lava " + lavaFall.fell + " wake " + woke.fell);
}

function tail(text) {
    return (text || "").split(/\r?\n/).filter(Boolean).slice(-25).join("\n");
}

function sweep() {
    for (let i = 0; i < MUTANTS.length; i++) {
        const name = MUTANTS[i].name;
        const child = spawnSync(process.execPath, [__filename, "--mutant=" + name, "--no-sweep"], {
            cwd: ROOT,
            encoding: "utf8",
            timeout: 240000
        });
        const status = child.status;
        check("mutant_killed_" + name, status === 1, status === 1 ? "" : "exit " + status + "\n" + tail(child.stdout) + "\n" + tail(child.stderr));
    }
}

let commitFall;
try {
    commitFall = compileCommit(MUTANT_ARG);
} catch (e) {
    console.error(e && e.stack ? e.stack : String(e));
    process.exit(2);
}

try {
    runFluid(commitFall);
} catch (e) {
    check("fluid_checks_threw", false, e && e.stack ? e.stack : String(e));
}

if (SWEEP) sweep();

console.log(fails ? "\nRESULT: FAIL (" + fails + " problem(s))" : "\nRESULT: PASS (" + passes + " checks)");
process.exit(fails ? 1 : 0);
