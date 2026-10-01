// tools/test_32_levels_generation.js - Headless checks for 32-layer generation and a core-only save (WG.00.43).
// --mutant=checksum_all_levels rewrites ensureWorldLevels so it stores an entry for every level, then the vm loads it.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("=== DEUS 32-LAYER WORLD GENERATION TEST SUITE ===");

const ROOT = path.resolve(__dirname, "..");
const cat = JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/UF_WorldCatalog.json"), "utf8"));
const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice("--mutant=".length);

function levelsSource() {
    let source = fs.readFileSync(path.join(ROOT, "game/js/plugins/DEUS_Levels.js"), "utf8");
    if (!mutant) return source;
    if (mutant !== "checksum_all_levels") {
        console.error(`HARNESS unknown mutant ${mutant}`);
        process.exit(2);
    }
    const from = "const entryLevels = CORE_LEVELS;";
    const to = "const entryLevels = allLevels;";
    if (!source.includes(from)) {
        console.error("HARNESS mutant checksum_all_levels: target not found");
        process.exit(2);
    }
    return source.replace(from, to);
}

function makeEnv() {
    const env = {
        window: null, UF: {}, DEUS: {}, Math: Object.create(Math), console, performance,
        PluginManager: { parameters: () => ({}), registerCommand: () => {} },
        DataManager: { _databaseFiles: [], onLoad: () => {}, isBattleTest: () => false, isEventTest: () => false },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        Input: { keyMapper: {} }, TouchInput: {},
        ImageManager: { loadTileset: () => ({}), loadCharacter: () => ({}), isBigCharacter: () => true },
        SceneManager: { _scene: null, goto() {} },
        Utils: { isOptionValid: () => false, encodeURI: s => s },
        Tilemap: function() {},
        $dataTilesets: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/Tilesets.json"), "utf8")),
        $ufWorldCatalog: cat,
        $deusWorldCatalog: cat,
        $ufTime: { year: 1, monthIndex: 0, day: 1, hour: 8, minute: 0 },
        $gameSystem: {}, $gameScreen: { weatherType: () => "none", weatherPower: () => 0, changeWeather() {} },
        $gameTimer: {}, $gameSwitches: {}, $gameVariables: {}, $gameSelfSwitches: {}, $gameActors: {}, $gameParty: {}
    };
    env.window = env;
    env.Tilemap.TILE_ID_A1 = 2048;
    env.Tilemap.TILE_ID_A2 = 2816;
    env.Tilemap.isTileA1 = id => id >= 2048 && id < 2816;
    env.Tilemap.isWaterTile = id => env.Tilemap.isTileA1(id);
    for (const name of ["Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_Map", "Game_Player", "Game_CharacterBase", "Game_Character", "Game_Event", "Spriteset_Map", "Spriteset_Base"]) {
        env[name] = vm.runInNewContext(`(function ${name}(){})`);
        env[name].prototype.initialize = function() {};
    }
    env.Game_Character.prototype = Object.create(env.Game_CharacterBase.prototype);
    env.Game_Player.prototype = Object.create(env.Game_Character.prototype);
    env.Game_Event.prototype = Object.create(env.Game_Character.prototype);
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
        isPassable: () => true, checkPassage: () => true
    });
    env.$gameMap = new env.Game_Map();
    env.$gamePlayer = new env.Game_Player();

    const levels = levelsSource();
    ['DEUS_World.js', 'DEUS_WorldGen.js', 'DEUS_Levels.js'].forEach(f => {
        const src = f === 'DEUS_Levels.js' ? levels : fs.readFileSync(path.join(ROOT, 'game/js/plugins', f), 'utf8');
        vm.runInNewContext(src, env, { filename: f });
    });
    return env;
}

let passed = 0;
function check(name, condition, detail) {
    if (!condition) {
        console.error(`  [FAIL] ${name}: ${detail}`);
        process.exit(1);
    }
    console.log(`  [PASS] ${name}`);
    passed++;
}

const CORE_LEVELS = [-2, -1, 0, 1, 2];
const ALL_LEVELS = Array.from({ length: 32 }, (_, i) => -16 + i);

// Seed 12345, the suite's own seed. The default Z range inside this vm is -16..+15.
const env = makeEnv();
const W = env.UF.World;
const L = env.UF.Levels;

const st = W.newWorld(12345);
check("world_default_zrange_is_32", W.levelCount() === 32 && W.zRange().zMin === -16 && W.zRange().zMax === 15, `levelCount: ${W.levelCount()}`);

L.ensureWorldLevels(st);

const keys = Object.keys(st.levels).map(Number).sort((a, b) => a - b);
check("core_entries_only", JSON.stringify(keys) === JSON.stringify(CORE_LEVELS), `keys: ${JSON.stringify(keys)}`);

let reconstructible = true;
for (const z of ALL_LEVELS) {
    const b = L.baseline(z, 0, 0);
    if (!b || b.z !== z) { reconstructible = false; break; }
}
check("all_32_levels_reconstructible", reconstructible, "a baseline was missing or named the wrong level");

let checksumsOk = true;
let gensOk = true;
for (const z of CORE_LEVELS) {
    const entry = st.levels[String(z)];
    if (!entry || typeof entry.checksum !== "string" || entry.checksum === "n/a") checksumsOk = false;
    if (!entry || entry.gen !== L.GEN) gensOk = false;
}
check("core_levels_have_valid_checksums", checksumsOk, "a core entry has no string checksum other than n/a");
check("core_levels_have_gen", gensOk, `a core entry's gen is not ${L.GEN}`);

const bMinus16 = L.baseline(-16, 0, 0);
check("level_minus_16_baseline_exists", !!bMinus16 && bMinus16.z === -16, "Level -16 baseline null");

const bPlus15 = L.baseline(15, 0, 0);
check("level_plus_15_baseline_exists", !!bPlus15 && bPlus15.z === 15, "Level +15 baseline null");

L.baseline(-10, 0, 0);
check("no_entry_for_unchanged_minus_10", st.levels["-10"] === undefined, `entry ${JSON.stringify(st.levels["-10"] && Object.keys(st.levels["-10"]))}`);

L.baseline(10, 0, 0);
check("no_entry_for_unchanged_plus_10", st.levels["10"] === undefined, `entry ${JSON.stringify(st.levels["10"] && Object.keys(st.levels["10"]))}`);

console.log(`\nResults: ${passed} passed, 0 failed.`);
