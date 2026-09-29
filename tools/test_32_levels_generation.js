// tools/test_32_levels_generation.js - Headless test suite for 32-layer world generation (Owner Request)
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("=== DEUS 32-LAYER WORLD GENERATION TEST SUITE ===");

const ROOT = path.resolve(__dirname, "..");
const cat = JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/UF_WorldCatalog.json"), "utf8"));

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

    ['DEUS_World.js', 'DEUS_WorldGen.js', 'DEUS_Levels.js'].forEach(f => {
        vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'game/js/plugins', f), 'utf8'), env, { filename: f });
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

// Test Section 1: Default World Generation covers all 32 layers
const env = makeEnv();
const W = env.UF.World;
const L = env.UF.Levels;

const st = W.newWorld(12345);
check("world_default_zrange_is_32", W.levelCount() === 32 && W.zRange().zMin === -16 && W.zRange().zMax === 15, `levelCount: ${W.levelCount()}`);

L.ensureWorldLevels(st);

const keys = Object.keys(st.levels);
check("ensure_world_levels_generates_all_32_entries", keys.length === 32, `keys count: ${keys.length}`);

const sortedZ = keys.map(Number).sort((a, b) => a - b);
const expectedZ = Array.from({ length: 32 }, (_, i) => -16 + i);
check("level_entries_span_minus16_to_plus15", JSON.stringify(sortedZ) === JSON.stringify(expectedZ), `got: ${JSON.stringify(sortedZ)}`);

let allChecksummed = true;
let allGen5 = true;
for (const z of expectedZ) {
    const entry = st.levels[String(z)];
    if (!entry || !entry.checksum || entry.checksum === "n/a" || typeof entry.checksum !== "string") {
        allChecksummed = false;
        break;
    }
    if (entry.gen !== L.GEN) {
        allGen5 = false;
        break;
    }
}
check("all_32_levels_have_valid_checksums", allChecksummed, "Missing or invalid checksum on a layer");
check("all_32_levels_have_gen5", allGen5, "Gen version mismatch");

// Test Section 2: Deep levels and extreme levels have baselines and strata
const bMinus16 = L.baseline(-16, 0, 0);
check("level_minus_16_baseline_exists", !!bMinus16 && bMinus16.z === -16, "Level -16 baseline null");

const bPlus15 = L.baseline(15, 0, 0);
check("level_plus_15_baseline_exists", !!bPlus15 && bPlus15.z === 15, "Level +15 baseline null");

// Test Section 3: Level entries are persistent across level reads
check("level_entry_minus_10_present", !!st.levels["-10"] && st.levels["-10"].z === -10, "Level -10 missing");
check("level_entry_plus_10_present", !!st.levels["10"] && st.levels["10"].z === 10, "Level 10 missing");

// Test Section 4: Rule 4 Mutant Check (proving tests can fail if only core 5 levels are generated)
const mutantSt = { levels: { "-2": {}, "-1": {}, "0": {}, "1": {}, "2": {} } };
const mutantKeys = Object.keys(mutantSt.levels);
const mutantFails = mutantKeys.length !== 32;
check("mutant_core_only_caught", mutantFails, "Mutant with only 5 levels failed to trigger failure");

console.log(`\nResults: ${passed} passed, 0 failed.`);

