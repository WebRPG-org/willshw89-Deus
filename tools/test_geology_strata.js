"use strict";
// tools/test_geology_strata.js - Geological stratum checks (Z=0, Z=-1, Z=-2).
// Physical stone properties, stratum mapping, determinism, depth bands, and Levels integration.
//
// The plugins run in a Node vm. DEUS_World.js loads before DEUS_WorldGen.js and DEUS_Levels.js,
// because Levels reads UF.World.Z_RANGES.legacy and UF.Space at load (WG.00.17, bdf45b4c).
// The world state is the one this suite was written against (seed 1074124084, 256, one area,
// no zRange). DEUS_World reads a state with no zRange as the legacy range -2..+2
// (docs/systems/DEUS_ZRange.md). Those nine checks are unchanged. A tenth check loads a
// coupled seed-18 world on the default range and reads substrate biomes below Z-2.
//
// Usage: node tools/test_geology_strata.js [--mutant | --mutant=no_world]
//   --mutant            surface stone diversity must be < 2 (a healthy catalog fails; exit 1)
//   --mutant=no_world   do not load DEUS_World.js (the load guard must exit 1)
// Exit: 0 all checks passed, 1 a check failed or a plugin failed to load.

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const simHook = require("./lib/vm_sim_require"); // WG.00.44: UF.Sim.require and a 1x1 grid in the vm

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const SEED = 1074124084;

const argValue = name => {
    const a = process.argv.find(x => x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : "";
};
// Bare --mutant is the diversity mutant. --mutant=no_world is a different argv entry.
const isMutant = process.argv.includes("--mutant");
const mutantName = argValue("mutant");

const PLUGIN_FILES = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Levels.js"];

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) {
        passed++;
        console.log(`PASS geology.${name}${detail ? " - " + detail : ""}`);
    } else {
        failed++;
        console.log(`FAIL geology.${name}${detail ? " - " + detail : ""}`);
    }
}
function harnessFail(msg) {
    failed++;
    console.log(`HARNESS ${msg}`);
    console.log(`RESULT: ${passed} passed, ${failed} failed (exit 1)`);
    process.exit(1);
}

if (mutantName && mutantName !== "no_world") {
    harnessFail(`unknown mutant "${mutantName}"; known: no_world (bare --mutant is the diversity mutant)`);
}
if (mutantName === "no_world") console.log("MUTANT no_world: DEUS_World.js is not loaded; plugin load must fail");
if (isMutant) console.log("MUTANT --mutant: surface stone diversity must be < 2; a healthy world must fail");

//-----------------------------------------------------------------------------
// Sandbox. RMMZ stubs only where these three plugins touch the engine at load
// (the same shape as setup() in tools/test_strata_foundation.js).

function section(src, a, b, label) {
    const i = src.indexOf(a), j = src.indexOf(b, i + a.length);
    if (i < 0 || j <= i) harnessFail(`engine source section missing (${label}): ${a}`);
    return src.slice(i, j);
}

function setup() {
    const list = {};
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, "game/js/plugins.js"), "utf8"), list);
    const catalogData = JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/UF_WorldCatalog.json"), "utf8"));
    const canvasCtx = () => ({
        imageSmoothingEnabled: false,
        createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData() {}, drawImage() {}, fillRect() {}, clearRect() {},
        getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    });
    const env = {
        window: null, Math, performance, setTimeout, clearTimeout, console,
        document: { createElement: () => ({ width: 0, height: 0, getContext: canvasCtx }) },
        PluginManager: {
            parameters: name => (list.$plugins && list.$plugins.find(p => p.name === name) || {}).parameters || {},
            registerCommand() {}
        },
        DataManager: {
            _databaseFiles: [],
            onLoad() {},
            isBattleTest: () => false,
            isEventTest: () => false,
            createGameObjects() {},
            loadMapData() {},
            makeSaveContents() { return {}; },
            extractSaveContents() {}
        },
        Input: { keyMapper: {} },
        TouchInput: { isTriggered: () => false, clear: () => {}, _currentState: {} },
        SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        ImageManager: {
            loadTileset() { return { isReady: () => true, isError: () => false }; },
            loadParallax() { return null; },
            loadCharacter() { return null; }
        },
        Utils: { isOptionValid: () => false, encodeURI: s => s },
        SoundManager: { playCursor: () => {} },
        Tilemap: function Tilemap() {},
        $dataTilesets: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/Tilesets.json"), "utf8")),
        $ufWorldCatalog: catalogData,
        $deusWorldCatalog: null,
        $gameSystem: {},
        $gameScreen: { weatherType: () => "none", weatherPower: () => 0, changeWeather() {} },
        $gameTimer: {}, $gameSwitches: {}, $gameVariables: {}, $gameSelfSwitches: {},
        $gameActors: {}, $gameParty: {}
    };
    env.window = env;
    env.$deusWorldCatalog = env.$ufWorldCatalog;
    for (const name of ["Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_Map", "Game_Player", "Game_CharacterBase", "Game_Event", "Spriteset_Map", "Spriteset_Base"]) {
        env[name] = vm.runInNewContext(`(function ${name}(){})`);
        env[name].prototype.initialize = function() {};
    }
    env.Scene_Boot.prototype.start = function() {};
    env.Scene_Boot.prototype.isReady = function() { return true; };
    env.Scene_Map.prototype.createDisplayObjects = function() {};
    env.Scene_Map.prototype.isAnyWindowUnderMouse = function() { return false; };
    env.Scene_Map.prototype.isReady = function() { return true; };
    env.Spriteset_Map.prototype.createCharacters = function() {};
    env.Spriteset_Map.prototype.createTilemap = function() {};
    env.Spriteset_Map.prototype.update = function() {};
    env.Spriteset_Map.prototype.updateParallax = function() {};
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
    Object.assign(env.Bitmap.prototype, {
        isReady() { return true; }, isError() { return false; }, clear() {}, clearRect() {}, fillRect() {},
        strokeRect() {}, blt() {}, drawText() {}
    });
    env.Bitmap.load = () => ({ isReady: () => false, isError: () => false });
    Object.assign(env.Game_Map.prototype, {
        setup() {}, update() {},
        mapId() { return this._mapId || 0; }, width: () => 256, height: () => 256,
        tileId: () => 0, tilesetFlags: () => [],
        isPassable: () => true, checkPassage: () => true,
        displayX() { return 0; }, displayY() { return 0; }, screenTileX: () => 17, screenTileY: () => 13,
        adjustX(x) { return x; }, adjustY(y) { return y; },
        roundXWithDirection: (x, d) => x + (d === 6 ? 1 : d === 4 ? -1 : 0),
        roundYWithDirection: (y, d) => y + (d === 2 ? 1 : d === 8 ? -1 : 0),
        eventsXy: () => [], eventsXyNt: () => [], events: () => []
    });
    Object.assign(env.Game_Player.prototype, {
        isTransferring: () => false, direction: () => 2,
        locate(x, y) { this.x = x; this.y = y; },
        setupForNewGame() {}, performTransfer() {}, moveStraight() {}, moveDiagonally() {}
    });
    Object.assign(env.Game_Event.prototype, { isCollidedWithEvents() {}, isCollidedWithPlayerCharacters() {} });
    Object.assign(env.Game_CharacterBase.prototype, { isCollidedWithEvents() {} });
    env.$gameMap = new env.Game_Map();
    env.$gameMap._events = [];
    env.$gamePlayer = new env.Game_Player();
    env.$gamePlayer.x = 128;
    env.$gamePlayer.y = 128;

    simHook.install(env);

    const ctx = vm.createContext(env);
    const core = fs.readFileSync(path.join(ROOT, "game/js/rmmz_core.js"), "utf8");
    vm.runInContext(section(core, "Tilemap.TILE_ID_B =", "Tilemap.Layer =", "Tilemap constants"), ctx, { filename: "rmmz_core.js Tilemap constants" });

    for (const file of PLUGIN_FILES) {
        if (mutantName === "no_world" && file === "DEUS_World.js") continue;
        const src = fs.readFileSync(path.join(PLUGINS, file), "utf8");
        try {
            vm.runInContext(src, ctx, { filename: file });
        } catch (e) {
            harnessFail(`plugin failed to load: ${file}: ${e && e.message ? e.message : e}`);
        }
    }
    return env;
}

function assertPluginsLoaded(env) {
    const missing = [];
    const uf = env.UF;
    const world = uf && uf.World;
    const space = uf && uf.Space;
    const worldGen = uf && uf.WorldGen;
    const levels = uf && uf.Levels;
    if (!world || !world.Z_RANGES || !world.Z_RANGES.legacy) missing.push("UF.World.Z_RANGES.legacy");
    if (!space || typeof space.GRID_SIZE_FEET !== "number" || typeof space.STRATUM_FEET !== "number") missing.push("UF.Space.GRID_SIZE_FEET/STRATUM_FEET");
    if (!worldGen || typeof worldGen.geologyAt !== "function" || typeof worldGen.cellInfo !== "function") missing.push("UF.WorldGen.geologyAt/cellInfo");
    if (!levels || typeof levels.stratumAt !== "function" || typeof levels.cellAt !== "function") missing.push("UF.Levels.stratumAt/cellAt");
    if (missing.length) harnessFail(`plugins did not load: missing ${missing.join(", ")}`);
}

// The suite's world: same fields the old stub held. No zRange, so the live range is legacy -2..+2.
function installWorld(env) {
    env.UF.World.state = {
        seed: SEED,
        size: 256,
        areasX: 1,
        areasY: 1,
        startArea: { x: 0, y: 0 },
        version: 4,
        levels: {},
        units: {},
        diffs: {},
        objectDiffs: {}
    };
    const range = env.UF.World.zRange();
    console.log(`INFO world seed ${SEED}, size 256, areas 1x1, zRange ${range.zMin}..${range.zMax} (state has no zRange: legacy)`);
    console.log(`INFO space ${env.UF.Space.GRID_SIZE_FEET} ft cell, ${env.UF.Space.STRATUM_FEET} ft stratum`);
}

const loadedAt = Date.now();
const sandbox = setup();
assertPluginsLoaded(sandbox);
console.log(`INFO plugins loaded: ${PLUGIN_FILES.join(", ")} (${Date.now() - loadedAt} ms)`);
installWorld(sandbox);

const WorldGen = sandbox.UF.WorldGen;
const Levels = sandbox.UF.Levels;
const stones = sandbox.$ufWorldCatalog.materials.stones;

console.log("=== Running Geological Strata Test Suite ===");

// 1. API Existence
check("api_present", typeof WorldGen.geologyAt === "function" && typeof Levels.stratumAt === "function",
    "WorldGen.geologyAt and Levels.stratumAt are defined");

// 2. Surface Geology (Z=0) Physical Mapping
const surfaceSamples = [];
const stoneCounts = {};
for (let y = 16; y < 240; y += 16) {
    for (let x = 16; x < 240; x += 16) {
        const g = WorldGen.geologyAt(x, y, 0);
        if (g) {
            surfaceSamples.push(g);
            stoneCounts[g.stone] = (stoneCounts[g.stone] || 0) + 1;
        }
    }
}

const allValidStones = surfaceSamples.every(s => stones[s.stone] && s.name === stones[s.stone].name);
const stoneTypesFound = Object.keys(stoneCounts).length;
check("surface_strata_valid", surfaceSamples.length > 100 && allValidStones && (isMutant ? stoneTypesFound < 2 : stoneTypesFound >= 4),
    `sampled ${surfaceSamples.length} cells: ${stoneTypesFound} stone types found (${Object.keys(stoneCounts).join(", ")}), all match catalog`);

// 3. Determinism
const c1 = WorldGen.geologyAt(128, 128, 0);
const c2 = WorldGen.geologyAt(128, 128, 0);
check("determinism", !!c1 && !!c2 && c1.stone === c2.stone && c1.density === c2.density,
    `cell (128,128) produced identical stone '${c1 ? c1.stone : "none"}' across repeated calls`);

// 4. Physical Properties Attached
check("physical_properties_attached", c1 && typeof c1.density === "number" && typeof c1.compressiveStrength === "number" && typeof c1.workability === "number",
    `stone ${c1 ? c1.name : "none"}: density ${c1 ? c1.density : "n/a"}, compressiveStrength ${c1 ? c1.compressiveStrength : "n/a"}, workability ${c1 ? c1.workability : "n/a"}`);

// 5. Upper Earth Strata (Z=-1)
const upperEarthSample = WorldGen.geologyAt(64, 64, -1);
check("upper_earth_strata", !!upperEarthSample && upperEarthSample.depthBand === "upper_earth" && ["limestone", "sandstone", "slate"].includes(upperEarthSample.stone),
    `Z=-1 stratum: stone '${upperEarthSample ? upperEarthSample.stone : "none"}', depthBand '${upperEarthSample ? upperEarthSample.depthBand : "none"}'`);

// 6. Deep Earth Strata (Z=-2)
const deepEarthSample = WorldGen.geologyAt(64, 64, -2);
check("deep_earth_strata", !!deepEarthSample && deepEarthSample.depthBand === "deep" && ["granite", "marble", "basalt", "limestone", "slate"].includes(deepEarthSample.stone),
    `Z=-2 stratum: stone '${deepEarthSample ? deepEarthSample.stone : "none"}', depthBand '${deepEarthSample ? deepEarthSample.depthBand : "none"}'`);

// 7. Levels.stratumAt Integration
const refStratum = Levels.stratumAt({ area: { x: 0, y: 0 }, x: 128, y: 128, z: 0 });
check("levels_stratum_at", !!refStratum && refStratum.stone === c1.stone,
    `Levels.stratumAt matches WorldGen.geologyAt: ${refStratum ? refStratum.stone : "none"}`);

// 8. WorldGen.cellInfo Integration
const cellInfo = WorldGen.cellInfo(128, 128, 0);
check("cell_info_contains_geology", !!cellInfo && !!cellInfo.geology && cellInfo.geology.stone === c1.stone,
    `WorldGen.cellInfo(128,128,0) includes geology: stone '${cellInfo && cellInfo.geology ? cellInfo.geology.stone : "none"}'`);

// 9. Levels.cellAt Integration
const levelCell = Levels.cellAt({ area: { x: 0, y: 0 }, x: 64, y: 64, z: -1 });
check("levels_cell_at_contains_stratum", !!levelCell && !!levelCell.stratum,
    `Levels.cellAt(64,64,-1) includes stratum: stone '${levelCell && levelCell.stratum ? levelCell.stratum.stone : "none"}'`);

// 10. Coupled outer substrate (BB-CODEX-01). kindGrid needs the loaded world. Below the core, the
// baseline has no biome array, so columnBiomeId and biomeAt both read that grid. Seed 18, (100, 100),
// default range: shallow rooted_loam at -3, deep_mine_belt at -9 and -16.
try {
    sandbox.UF.World.state = {
        seed: 18,
        size: 256,
        areasX: 1,
        areasY: 1,
        startArea: { x: 0, y: 0 },
        version: 4,
        verticalBiomeCoupling: true,
        zRange: { zMin: -16, zMax: 15 },
        levels: { "0": { z: 0, gen: 4, checksum: null, strata: {} } },
        units: {},
        diffs: {},
        objectDiffs: {}
    };
    const want = { "-3": "rooted_loam", "-9": "deep_mine_belt", "-16": "deep_mine_belt" };
    const rows = [];
    let outerOk = true;
    for (const z of [-3, -9, -16]) {
        const id = Levels.columnBiomeId(100, 100, z);
        const at = Levels.biomeAt({ area: { x: 0, y: 0 }, x: 100, y: 100, z });
        const got = at && at.id;
        if (id !== want[z] || got !== want[z]) outerOk = false;
        rows.push(`Z${z}: columnBiomeId ${id == null ? "null" : id}, biomeAt ${got == null ? "null" : got} (want ${want[z]})`);
    }
    check("coupled_outer_substrate", outerOk, `seed 18 (100, 100), coupling on, -16..15; ${rows.join("; ")}`);
} catch (e) {
    check("coupled_outer_substrate", false, `threw ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`);
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
