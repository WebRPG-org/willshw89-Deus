#!/usr/bin/env node
"use strict";
/**
 * tools/test_natural_connections_no_mint.js (NAT.03.02 lane-el)
 *
 * Production World, WorldGen, Tiles, Objects, Levels, Floors, Fluid, Jobs and NaturalConnections in one
 * VM, on a generated world. RMMZ classes are doubles; no rendering. By default Fluid runs its 0..7 solver
 * alone (no require(), so sim/hydro stays off, as in tools/test_strata_fluid_reconciliation.js): cell water
 * is then the whole store and a debit can be matched to a credit. --hydro gives the VM require(), so Fluid
 * loads sim/hydro as the game does; seepage then moves water into hydro stores, so that mode checks only
 * that water reached the lower level at some step and that Fluid's counted mass is kept (slow: minutes).
 *
 * Checks:
 *   authoritative_flow_conserved  guard (base and tip): water put at a generated passage's upper
 *                                 entrance through UF.Fluid reaches the level below through UF.Fluid
 *                                 when UF.Fluid alone is stepped; the upper level's debit equals the
 *                                 lower levels' credit, in Fluid depth units, and the area total is kept.
 *   control_open_column_flows     harness control: the same measurement on a cell whose strata are open
 *                                 between the two levels. Shows the measurement can pass.
 *
 * Usage:
 *   node tools/test_natural_connections_no_mint.js [--case=<name>] [--mutant=<name>] [--seed=<n>] [--hydro]
 * Mutants (each must turn the named check red):
 *   disable_all_flow  -> authoritative_flow_conserved (and control_open_column_flows)
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createRequire } = require("module");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const argv = process.argv.slice(2);
const opt = name => (argv.find(a => a.startsWith(`--${name}=`)) || "").slice(name.length + 3);
const mutant = opt("mutant"), selected = opt("case");
const HYDRO = argv.includes("--hydro");
const SEED = Number(opt("seed")) || 20260919;   // the in-game natural_connections suite's fixed seed
const MUTANTS = { disable_all_flow: true };
if (mutant && !MUTANTS[mutant]) { console.error(`Unknown mutant "${mutant}". Known: ${Object.keys(MUTANTS).join(", ")}`); process.exit(2); }

const FILES = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Tiles.js", "DEUS_Objects.js", "DEUS_Levels.js", "DEUS_Floors.js",
    "DEUS_Fluid.js", "DEUS_Jobs.js", "DEUS_NaturalConnections.js"];

function buildEnvironment(seed) {
    const list = {};
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, "game/js/plugins.js"), "utf8"), list);
    const ns = {}, warnings = [], errors = [];
    const canvasCtx = () => ({
        imageSmoothingEnabled: false, createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData() {}, drawImage() {}, fillRect() {}, clearRect() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    });
    const env = {
        window: null, UF: ns, DEUS: ns, Math, performance, setTimeout, clearTimeout, setInterval, clearInterval,
        console: {
            log: () => {},
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
    // NW.js gives plugins require(); DEUS_Fluid loads ../sim/hydro with it, as in the game.
    if (HYDRO) env.require = createRequire(path.join(PLUGINS, "DEUS_Fluid.js"));
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
    env.Scene_Map.prototype.update = function() {};
    env.Scene_Map.prototype.createAllWindows = function() {};
    env.Scene_Map.prototype.isActive = function() { return true; };
    env.Spriteset_Map.prototype.createCharacters = function() {};
    env.Spriteset_Map.prototype.update = function() {};
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
    env.$gameMessage = { isBusy: () => false };
    const ctx = vm.createContext(env);
    const section = (src, a, b) => {
        const i = src.indexOf(a), j = src.indexOf(b, i + a.length);
        if (i < 0 || j <= i) throw new Error(`engine source section missing: ${a}`);
        return src.slice(i, j);
    };
    const core = fs.readFileSync(path.join(ROOT, "game/js/rmmz_core.js"), "utf8");
    const mgr = fs.readFileSync(path.join(ROOT, "game/js/rmmz_managers.js"), "utf8");
    const deus = fs.readFileSync(path.join(PLUGINS, "DEUS_Core.js"), "utf8");
    vm.runInContext(section(mgr, "DataManager.makeSaveContents =", "DataManager.correctDataErrors ="), ctx, { filename: "rmmz_managers.js" });
    vm.runInContext(section(core, "function JsonEx()", "//-----------------------------------------------------------------------------"), ctx, { filename: "rmmz_core.js JsonEx" });
    vm.runInContext(section(core, "Tilemap.TILE_ID_B =", "Tilemap.Layer ="), ctx, { filename: "rmmz_core.js Tilemap constants" });
    vm.runInContext(section(deus, "window.DEUS = window.DEUS || {};", "//-----------------------------------------------------------------------------"), ctx, { filename: "DEUS_Core.js events" });
    for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(PLUGINS, f), "utf8"), ctx, { filename: f });
    env.DataManager.onLoad(env.$dataTilesets);
    new env.Scene_Boot().start();
    env.UF.NewGameSetup = { seed, year: 1 };
    env.UF.World.newWorld(seed);
    if (mutant === "disable_all_flow") env.UF.Fluid._configure({ _mutantNoGravity: true });
    env.__warnings = warnings;
    env.__errors = errors;
    return env;
}

let passed = 0, failed = 0;
function check(name, fn) {
    if (selected && selected !== name) return;
    try {
        const detail = fn();
        passed++;
        console.log(`PASS natural_connections_no_mint.${name}${detail ? `: ${detail}` : ""}`);
    } catch (e) {
        failed++;
        console.error(`FAIL natural_connections_no_mint.${name}: ${e && e.message || e}`);
    }
}

const env = buildEnvironment(SEED);
const U = env.UF, F = U.Fluid, L = U.Levels, N = U.NaturalConnections;
const AREA = { x: 0, y: 0 };
const WINDOW = 12, BELOW = 3, STEPS = 400, BUDGET = 512, DEPTH = 6;

// Fluid depth units in a box around (x, y): levels z..z-BELOW, per level.
function windowSums(x, y, z) {
    const size = U.World.state.size, out = {};
    for (let dz = 0; dz <= BELOW; dz++) {
        let s = 0;
        for (let yy = Math.max(0, y - WINDOW); yy <= Math.min(size - 1, y + WINDOW); yy++)
            for (let xx = Math.max(0, x - WINDOW); xx <= Math.min(size - 1, x + WINDOW); xx++) s += F.depthAt(0, 0, xx, yy, z - dz);
        out[z - dz] = s;
    }
    return out;
}
// Put DEPTH units at the upper cell through UF.Fluid, step UF.Fluid alone, and measure.
function pour(upper, lower) {
    F.reset();
    const before = windowSums(upper.x, upper.y, upper.z), mass0 = F.diagnostics(0, 0).totalWaterMass;
    F.setCell(AREA, upper.x, upper.y, upper.z, "water", DEPTH);
    const placed = F.depthAt(0, 0, upper.x, upper.y, upper.z);
    const start = windowSums(upper.x, upper.y, upper.z);
    let lowerSeen = 0;
    for (let i = 0; i < STEPS; i++) {
        F.step(AREA, BUDGET);
        if (HYDRO && i % 10 === 9) lowerSeen = Math.max(lowerSeen, windowSums(upper.x, upper.y, upper.z)[lower.z] - start[lower.z]);
    }
    const after = windowSums(upper.x, upper.y, upper.z), diag = F.diagnostics(0, 0);
    let credit = 0;
    for (let dz = 1; dz <= BELOW; dz++) credit += after[upper.z - dz] - start[upper.z - dz];
    const debit = start[upper.z] - after[upper.z];
    const inWindow = Object.values(after).reduce((a, b) => a + b, 0);
    const result = { placed, debit, credit, lowerSeen, landing: F.depthAt(0, 0, lower.x, lower.y, lower.z), lowerLevel: after[lower.z] - start[lower.z],
        canPassDown: F.fluidCanPassDown(0, 0, upper.x, upper.y, upper.z), passage: L.getStrataFluidPassage(0, 0, upper.x, upper.y, upper.z),
        upperStrata: (L.strataAt({ area: AREA, x: upper.x, y: upper.y, z: upper.z }) || {}).materials,
        conserved: diag.totalWaterMass === mass0 + placed && (HYDRO || diag.totalWaterVolume === inWindow) && before[upper.z] === 0 };
    result.ok = HYDRO ? placed === DEPTH && Math.max(lowerSeen, result.lowerLevel) > 0 && result.conserved
        : placed === DEPTH && result.lowerLevel > 0 && credit > 0 && debit === credit && result.conserved;
    F.reset();
    return result;
}
const ends = link => link.a.z > link.b.z ? { upper: link.a, lower: link.b } : { upper: link.b, lower: link.a };

check("authoritative_flow_conserved", () => {
    const s = N.state(), links = s && Array.isArray(s.links) ? s.links : [];
    if (!links.length) throw new Error(`seed ${SEED}: no natural passage was generated (${s && s.status}: ${s && s.reason})`);
    const bad = [], kinds = {};
    for (const link of links) {
        const { upper, lower } = ends(link), r = pour(upper, lower);
        kinds[link.kind] = (kinds[link.kind] || 0) + 1;
        if (!r.ok) bad.push(`${link.id} (${link.kind}) upper (${upper.x},${upper.y},${upper.z}) strata ${JSON.stringify(r.upperStrata)} ` +
            `passage bits ${r.passage} canPassDown ${r.canPassDown}: placed ${r.placed}, upper-level debit ${r.debit}, lower-level credit ${r.credit}, ` +
            `landing depth ${r.landing}${HYDRO ? `, lower level max seen ${r.lowerSeen}` : ""}, conserved ${r.conserved}`);
    }
    const summary = `seed ${SEED}, ${links.length} links ${JSON.stringify(kinds)}, Fluid stepped ${STEPS}x${BUDGET}, hydro ${F.hydro() ? "loaded" : "absent"}`;
    if (bad.length) throw new Error(`${bad.length}/${links.length} passages moved no water to the landing level through UF.Fluid (${summary})\n  ` + bad.join("\n  "));
    return `${links.length}/${links.length} passages: upper-level debit equals lower-level credit (${summary})`;
});

// Not a passage: a cell whose strata are open between z=0 and z=-1, to show the measurement can pass.
check("control_open_column_flows", () => {
    const x = 40, y = 40, set = (z, m) => L.setStrata({ area: AREA, x, y, z }, { m, hp: m.map(v => v === "air" ? 0 : 255) });
    const saved = [0, -1].map(z => L.strataAt({ area: AREA, x, y, z }).materials.slice());
    set(0, ["air", "air", "air", "air", "air"]);
    set(-1, ["stone", "air", "air", "air", "air"]);
    try {
        const r = pour({ x, y, z: 0 }, { x, y, z: -1 });
        if (!r.ok)
            throw new Error(`open column: placed ${r.placed}, debit ${r.debit}, credit ${r.credit}, landing ${r.landing}, canPassDown ${r.canPassDown}, conserved ${r.conserved}`);
        return `open column (${x},${y}) 0 -> -1: debit ${r.debit} = credit ${r.credit}, landing depth ${r.landing}`;
    } finally {
        set(0, saved[0]); set(-1, saved[1]);
    }
});

if (env.__errors.length) { failed++; console.error(`FAIL natural_connections_no_mint.no_errors: ${env.__errors.slice(0, 3).join(" | ")}`); }
console.log(`RESULT: ${passed} passed, ${failed} failed${mutant ? ` (mutant ${mutant})` : ""}`);
process.exitCode = failed ? 1 : 0;
