// tools/test_sparse_outer_save.js — WG.00.43 sparse outer save (lane-da).
// A New Game keeps level entries for the core (-2..+2) only. Viewing a layer writes none.
// A checksum-only outer entry is empty. Load migration rule "WG.00.43" strips those once.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const FIXTURE = path.join(ROOT, "tools", "fixtures", "levels", "save_32_entries_seed18.json");
const LEVELS_FILE = path.join(ROOT, "game", "js", "plugins", "DEUS_Levels.js");
const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice("--mutant=".length);
const capture = process.argv.includes("--capture");

// Per-layer baseline checksums of a seed-18 New Game at -16..+15, copied from st.levels[z].checksum
// at the lane base (before this lane's save change). z = -16 + index. Do not regenerate these here.
const BASE_LAYER_CHECKSUMS = ["dc2a7d91","93f6b5c4","93f6b5c4","93f6b5c4","93f6b5c4","93f6b5c4","93f6b5c4","93f6b5c4","93f6b5c4","93f6b5c4","93f6b5c4","93f6b5c4","93f6b5c4","93f6b5c4","95c997d4","1ed786a5","1f5c2a72","eaf389b9","9998ffb2","00f6a75c","00f6a75c","e8e6b0cc","ac65d04d","7a3adb63","d1f8fbe8","2dc1e0f8","3ae53d0e","8e8f1879","41ba9dc5","41ba9dc5","41ba9dc5","41ba9dc5"];

const MUTANTS = {
    checksum_all_levels: [
        "const entryLevels = CORE_LEVELS;",
        "const entryLevels = allLevels;"
    ],
    drop_ignores_checksum: [
        'if (k !== "z" && k !== "gen" && k !== "checksum" && k !== "strata") return false;',
        'if (k !== "z" && k !== "gen" && k !== "strata") return false;'
    ],
    strip_all_outer: [
        "if (checksumOnlyEntry(st.levels[key])) { delete st.levels[key]; stripped++; }",
        "if (st.levels[key]) { delete st.levels[key]; stripped++; }"
    ],
    strip_caps_only: [
        'if (k !== "z" && k !== "gen" && k !== "checksum" && k !== "strata") return false;',
        'if (k !== "z" && k !== "gen" && k !== "checksum" && k !== "strata" && k !== "caps") return false;'
    ],
    // setView no longer walks areas. The mutant writes a checksum entry for an outer z at the view move itself.
    entry_on_view: [
        "if ($gamePlayer.isTransferring() || pending) return false;\n        const c = opts.center || null;",
        "if ($gamePlayer.isTransferring() || pending) return false;\n        if (W.state && W.state.levels && (z < CORE.zMin || z > CORE.zMax)) {\n            const key = String(z);\n            const viewSt = W.state;\n            if (!viewSt.levels[key]) viewSt.levels[key] = { z: z, gen: levelGen(viewSt, 0), checksum: checksumOf(z), strata: {} };\n            else if (!viewSt.levels[key].checksum) viewSt.levels[key].checksum = checksumOf(z);\n        }\n        const c = opts.center || null;"
    ],
    outer_baseline_shift: [
        "uniformStore(b, z < CORE.zMin ? STONE_CELL : AIR_CELL, size);",
        "uniformStore(b, z < CORE.zMin && z !== -9 ? STONE_CELL : AIR_CELL, size);"
    ]
};

function levelsSource() {
    let source = fs.readFileSync(LEVELS_FILE, "utf8");
    if (!mutant) return source;
    const pair = MUTANTS[mutant];
    if (!pair) {
        console.error(`HARNESS unknown mutant ${mutant}`);
        process.exit(2);
    }
    if (!source.includes(pair[0])) {
        console.error(`HARNESS mutant ${mutant}: target not found`);
        process.exit(2);
    }
    return source.replace(pair[0], pair[1]);
}

const cat = JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/UF_WorldCatalog.json"), "utf8"));

function makeEnv(zRange) {
    const env = {
        window: null, UF: {}, DEUS: {}, Math: Object.create(Math), console, performance,
        PluginManager: { parameters: () => ({}), registerCommand: () => {} },
        DataManager: {
            _databaseFiles: [], onLoad: () => {}, isBattleTest: () => false, isEventTest: () => false,
            createGameObjects() {}
        },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        Input: { keyMapper: {} }, TouchInput: {},
        ImageManager: { loadTileset: () => ({}), loadCharacter: () => ({}), loadParallax() {}, isBigCharacter: () => true },
        SceneManager: { _scene: null, goto() {} },
        Utils: { isOptionValid: () => false, encodeURI: s => s },
        Tilemap: function() {},
        $dataTilesets: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/Tilesets.json"), "utf8")),
        $ufWorldCatalog: cat,
        $deusWorldCatalog: cat,
        $ufTime: { year: 1, monthIndex: 0, day: 1, hour: 8, minute: 0 },
        $gameSystem: {}, $gameScreen: { weatherType: () => "none", weatherPower: () => 0, changeWeather() {} },
        $gameTimer: {}, $gameSwitches: {}, $gameVariables: {}, $gameSelfSwitches: {}, $gameActors: {}, $gameParty: {},
        process: { env: zRange ? { DEUS_Z_RANGE: zRange } : {} }
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
    env.Scene_Map.prototype.start = function() {};
    env.Scene_Map.prototype.update = function() {};
    env.Scene_Map.prototype.onTransfer = function() {};
    env.Scene_Map.prototype.shouldAutosave = function() { return false; };
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
        displayX() { return this._displayX || 0; }, displayY() { return this._displayY || 0; },
        setDisplayPos(x, y) { this._displayX = x; this._displayY = y; },
        screenTileX: () => 17, screenTileY: () => 13, autoplay() {}, events: () => [],
        isLoopHorizontal: () => false, isLoopVertical: () => false
    });
    Object.assign(env.Game_Player.prototype, {
        isTransferring() { return !!this._transferring; }, direction() { return 2; },
        locate(x, y) { this.x = x; this.y = y; }, setDirection() {},
        reserveTransfer() { this._transferring = false; }
    });
    env.$gameMap = new env.Game_Map();
    env.$gamePlayer = new env.Game_Player();
    env.$gamePlayer.x = 128;
    env.$gamePlayer.y = 128;
    env.DataManager.makeSaveContents = function() {
        return {
            system: env.$gameSystem, screen: env.$gameScreen, timer: env.$gameTimer,
            switches: env.$gameSwitches, variables: env.$gameVariables, selfSwitches: env.$gameSelfSwitches,
            actors: env.$gameActors, party: env.$gameParty, map: env.$gameMap, player: env.$gamePlayer
        };
    };
    env.DataManager.extractSaveContents = function(contents) {
        env.$gameSystem = contents.system;
        env.$gameScreen = contents.screen;
        env.$gameTimer = contents.timer;
        env.$gameSwitches = contents.switches;
        env.$gameVariables = contents.variables;
        env.$gameSelfSwitches = contents.selfSwitches;
        env.$gameActors = contents.actors;
        env.$gameParty = contents.party;
        env.$gameMap = contents.map;
        env.$gamePlayer = contents.player;
    };
    const core = fs.readFileSync(path.join(ROOT, "game/js/rmmz_core.js"), "utf8");
    const tileStart = core.indexOf("Tilemap.TILE_ID_B =");
    const tileEnd = core.indexOf("Tilemap.Layer =", tileStart);
    if (tileStart < 0 || tileEnd < 0) throw new Error("Tilemap autotile table not found");
    vm.runInNewContext(core.slice(tileStart, tileEnd), env, { filename: "rmmz_core.js Tilemap" });
    const levels = levelsSource();
    for (const f of ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Levels.js", "DEUS_Fluid.js"]) {
        const src = f === "DEUS_Levels.js" ? levels : fs.readFileSync(path.join(ROOT, "game/js/plugins", f), "utf8");
        vm.runInNewContext(src, env, { filename: f });
    }
    return env;
}

function newGame(env, seed) {
    const st = env.UF.World.newWorld(seed);
    if (st.verticalBiomeCoupling === undefined) st.verticalBiomeCoupling = true;
    const ok = env.UF.Levels.ensureWorldLevels(st);
    if (!ok) throw new Error("ensureWorldLevels returned false");
    return st;
}

function sortedKeys(levels) {
    return Object.keys(levels).map(Number).sort((a, b) => a - b);
}

function terrainRangeBytes(env) {
    const c = env.DataManager.makeSaveContents();
    const fluid = c.deusFluid !== undefined ? c.deusFluid : (c.ufFluid !== undefined ? c.ufFluid : null);
    const levelsB = Buffer.byteLength(JSON.stringify(c.ufWorld.levels), "utf8");
    const rangeB = Buffer.byteLength(JSON.stringify(c.ufWorld.zRange), "utf8");
    const fluidB = Buffer.byteLength(JSON.stringify(fluid), "utf8");
    return { levelsB, rangeB, fluidB, total: levelsB + rangeB + fluidB };
}

function showGround(env) {
    const W = env.UF.World;
    const st = W.state;
    const ax = st.startArea ? st.startArea.x : 0;
    const ay = st.startArea ? st.startArea.y : 0;
    env.$gameMap._mapId = W.areaMapId(ax, ay, 0);
    return W.viewLevel();
}

// setView leaves a switch pending until Scene_Map starts. Settle it so the next setView can run.
function settleSwitch(env) {
    const scene = new env.Scene_Map();
    scene.start();
}

function loadWorld(env, ufWorld) {
    const contents = env.DataManager.makeSaveContents();
    contents.ufWorld = ufWorld;
    env.DataManager.extractSaveContents(contents);
    return env.UF.World.state;
}

function findSolid(L, z) {
    for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
            if (L.shapeAt(0, 0, x, y, z) === "solid") return { x, y };
        }
    }
    return null;
}

const CORE = [-2, -1, 0, 1, 2];
let passed = 0;
let failed = 0;
const failures = [];

function check(name, ok, detail) {
    if (ok) passed++;
    else { failed++; failures.push(name); }
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " - " + detail : ""}`);
    return !!ok;
}

function runCapture() {
    console.log("CAPTURE seed 18 at the lane base");
    const env32 = makeEnv("-16..15");
    const st = newGame(env32, 18);
    const L = env32.UF.Levels;
    const keys = sortedKeys(st.levels);
    console.log(`CAPTURE keys ${keys.length}: ${keys.join(",")}`);
    const sums = [];
    for (let z = -16; z <= 15; z++) {
        const entry = st.levels[String(z)];
        sums.push(entry && entry.checksum ? entry.checksum : null);
    }
    console.log("CAPTURE_CHECKSUMS " + JSON.stringify(sums));
    const wide = terrainRangeBytes(env32);
    console.log(`CAPTURE_TERRAIN_RANGE -16..+15 levels=${wide.levelsB} zRange=${wide.rangeB} fluid=${wide.fluidB} total=${wide.total}`);

    const env9 = makeEnv("-4..4");
    newGame(env9, 18);
    const narrow = terrainRangeBytes(env9);
    console.log(`CAPTURE_TERRAIN_RANGE -4..+4 levels=${narrow.levelsB} zRange=${narrow.rangeB} fluid=${narrow.fluidB} total=${narrow.total}`);
    console.log(`CAPTURE_TERRAIN_RANGE_DIFF ${wide.total - narrow.total}`);

    const cell = findSolid(L, -10);
    if (!cell) throw new Error("no solid cell on -10");
    const dug = L.setShape({ area: { x: 0, y: 0 }, x: cell.x, y: cell.y, z: -10 }, "floor", { material: "stone" });
    if (!dug) throw new Error("setShape floor on -10 failed: " + JSON.stringify(L.lastRefusal()));
    const capOk = L.setCap({ area: { x: 0, y: 0 }, x: 2, y: 2 }, { material: "stone", thickness: 3, hp: 200 });
    let capNote = "The +15 cap record was stored by UF.Levels.setCap, which writes writeCap's 6-hex-digit save format.";
    if (!capOk) {
        const top = st.levels["15"];
        top.caps = { "0,0": { "2": "0103c8" } };
        capNote = "setCap returned false (" + JSON.stringify(L.lastRefusal()) + "). The +15 cap record was written by hand in writeCap's 6-hex-digit format: material 01 (stone), thickness 03, hp c8.";
    }
    const outer = keys.filter(z => z < -2 || z > 2);
    const checksumOnly = outer.filter(z => {
        const e = st.levels[String(z)];
        const strataEmpty = !e.strata || Object.keys(e.strata).length === 0;
        return strataEmpty && !e.caps;
    });
    const fixture = {
        notes: "Captured at the lane base of task/lane-da, before the WG.00.43 save change, from a seed-18 New Game at -16..+15. ensureWorldLevels wrote 32 entries, each with a checksum. One outer entry (z=-10, area 0,0, cell " + cell.x + "," + cell.y + ") then received one real strata change through UF.Levels.setShape to floor. At -16..+15 every generated cap fits under zMax (docs/systems/DEUS_ZRange.md section 6), so generation saves no cap at +15. " + capNote + " Strata on the +15 entry stay empty, so the entry is caps-only. The other " + checksumOnly.length + " outer entries are the checksum-only entries New Game wrote. verticalBiomeCoupling was set true before ensureWorldLevels, matching the world:initializing listener.",
        seed: 18,
        zRange: { zMin: -16, zMax: 15 },
        strataSchemaVersion: st.strataSchemaVersion,
        version: st.version,
        strataChange: { z: -10, ax: 0, ay: 0, x: cell.x, y: cell.y, shape: "floor" },
        capsOnly: { z: 15, ax: 0, ay: 0, x: 2, y: 2, via: capOk ? "setCap" : "hand" },
        checksumOnlyOuter: checksumOnly.map(String),
        levels: JSON.parse(JSON.stringify(st.levels))
    };
    fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
    fs.writeFileSync(FIXTURE, JSON.stringify(fixture, null, 2) + "\n");
    console.log(`CAPTURE wrote ${FIXTURE}`);
    console.log(`CAPTURE checksum-only outer ${checksumOnly.length}; caps via ${capOk ? "setCap" : "hand"}; strata cell ${cell.x},${cell.y}`);
    const cap = st.levels["15"].caps;
    console.log("CAPTURE caps " + JSON.stringify(cap));
    console.log("CAPTURE -10 strata keys " + JSON.stringify(Object.keys(st.levels["-10"].strata || {})));
}

function migrationsOf(st, rule) {
    return (st.migrations || []).filter(m => m && m.rule === rule);
}

function runChecks() {
    if (!Array.isArray(BASE_LAYER_CHECKSUMS) || BASE_LAYER_CHECKSUMS.length !== 32) {
        console.error("HARNESS BASE_LAYER_CHECKSUMS is not the 32 lane-base checksums");
        process.exit(2);
    }
    if (!fs.existsSync(FIXTURE)) {
        console.error("HARNESS fixture missing: " + FIXTURE);
        process.exit(2);
    }
    const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
    console.log(`sparse outer save${mutant ? " mutant " + mutant : ""}`);

    const env = makeEnv("-16..15");
    const L = env.UF.Levels;
    const st = newGame(env, 18);
    const keys = sortedKeys(st.levels);
    const gen = L.GEN;

    // Terrain+range on untouched seed-18 worlds: New Game only, before any view or change/revert.
    const envWide = makeEnv("-16..15");
    newGame(envWide, 18);
    const envNarrow = makeEnv("-4..4");
    newGame(envNarrow, 18);
    const wide = terrainRangeBytes(envWide);
    const narrow = terrainRangeBytes(envNarrow);
    const diff = wide.total - narrow.total;
    console.log(`INFO terrain+range -16..+15 ${wide.total} (levels ${wide.levelsB} zRange ${wide.rangeB} fluid ${wide.fluidB}) -4..+4 ${narrow.total} (levels ${narrow.levelsB} zRange ${narrow.rangeB} fluid ${narrow.fluidB}) diff ${diff}`);
    check("fresh_save_terrain_range_bound", diff <= 256, `diff ${diff} B (bound 256) untouched seed 18 before view or change`);

    const sumDetail = [];
    let sumsOk = true;
    for (let z = -16; z <= 15; z++) {
        const now = L.checksum(z, 18, gen);
        const want = BASE_LAYER_CHECKSUMS[z + 16];
        if (now !== want) { sumsOk = false; sumDetail.push(`${z}:${now}!=${want}`); }
    }
    check("all_32_layers_reconstructible_unchanged", sumsOk && sumDetail.length === 0,
        sumsOk ? "32 baseline checksums match the lane-base constants" : sumDetail.slice(0, 4).join("; "));

    for (let z = -16; z <= 15; z++) {
        const b = L.baseline(z, 0, 0);
        if (!b || b.z !== z) { check("all_32_layers_reconstructible_unchanged", false, `baseline ${z} missing`); break; }
    }

    check("new_game_core_entries_only", JSON.stringify(keys) === JSON.stringify(CORE) && st.levels["15"] === undefined,
        `keys ${JSON.stringify(keys)}`);

    const view = showGround(env);
    const toMinus = L.setView(-10);
    settleSwitch(env);
    const toPlus = L.setView(12);
    const b10 = L.baseline(-10, 0, 0);
    const b12 = L.baseline(12, 0, 0);
    const saveContents = env.DataManager.makeSaveContents();
    const savedLevels = saveContents && saveContents.ufWorld && saveContents.ufWorld.levels;
    const afterView = savedLevels ? sortedKeys(savedLevels) : null;
    check("view_does_not_save",
        !!view && toMinus === true && toPlus === true && b10 && b10.z === -10 && b12 && b12.z === 12
            && !!savedLevels && JSON.stringify(afterView) === JSON.stringify(CORE),
        `view ${JSON.stringify(view)} setView -10 ${toMinus} +12 ${toPlus} baselines ${b10 && b10.z},${b12 && b12.z} makeSaveContents().ufWorld.levels ${JSON.stringify(afterView)}`);

    const cellA = findSolid(L, -8);
    let caseA = false;
    let caseADetail = "no solid cell on -8";
    if (cellA) {
        const dug = L.setShape({ area: { x: 0, y: 0 }, x: cellA.x, y: cellA.y, z: -8 }, "floor", { material: "stone" });
        const mid = st.levels["-8"];
        const back = L.setShape({ area: { x: 0, y: 0 }, x: cellA.x, y: cellA.y, z: -8 }, "solid", { material: "stone" });
        caseA = dug === true && !!mid && back === true && st.levels["-8"] === undefined;
        caseADetail = `cell ${cellA.x},${cellA.y} dug ${dug} hadEntry ${!!mid} revert ${back} entryAfter ${st.levels["-8"] ? JSON.stringify(Object.keys(st.levels["-8"])) : "gone"}`;
    }

    const host = makeEnv("-16..15");
    const hostSt = newGame(host, 18);
    const overlay = JSON.parse(JSON.stringify(hostSt));
    overlay.levels = JSON.parse(JSON.stringify(fixture.levels));
    overlay.strataSchemaVersion = fixture.strataSchemaVersion;
    overlay.version = fixture.version || 4;
    overlay.migrations = (overlay.migrations || []).filter(m => !m || m.rule !== "WG.00.43");
    overlay.zRange = { zMin: -16, zMax: 15 };
    overlay.seed = 18;
    const beforeReal = {};
    for (const key of ["-10", "15"]) beforeReal[key] = JSON.stringify(overlay.levels[key]);
    const loaded = loadWorld(host, overlay);
    const outerAfter = sortedKeys(loaded.levels).filter(z => z < -2 || z > 2);
    const marks = migrationsOf(loaded, "WG.00.43");
    const realSame = ["-10", "15"].every(k => JSON.stringify(loaded.levels[k]) === beforeReal[k]);
    check("migration_keeps_real_outer_change",
        !!(loaded.levels["-10"] && loaded.levels["15"] && loaded.levels["15"].caps) && realSame,
        `present -10 ${!!loaded.levels["-10"]} 15 ${!!loaded.levels["15"]} byteIdentical ${realSame}`);

    const snap = JSON.parse(JSON.stringify(loaded));
    const sc = fixture.strataChange;
    const HL = host.UF.Levels;
    const keptChecksum = !!(loaded.levels["-10"] && Object.prototype.hasOwnProperty.call(loaded.levels["-10"], "checksum"));
    const reverted = HL.setShape({ area: { x: sc.ax, y: sc.ay }, x: sc.x, y: sc.y, z: sc.z }, "solid", { material: "stone" });
    const caseB = reverted === true && loaded.levels[String(sc.z)] === undefined;
    check("revert_drops_outer_entry",
        caseA && caseB && keptChecksum,
        `caseA (${caseADetail}) caseB revert ${reverted} entryAfter ${loaded.levels[String(sc.z)] ? JSON.stringify(Object.keys(loaded.levels[String(sc.z)])) : "gone"} keptChecksumBeforeRevert ${keptChecksum}`);

    const again = loadWorld(host, snap);
    const marks2 = migrationsOf(again, "WG.00.43");
    const outer2 = sortedKeys(again.levels).filter(z => z < -2 || z > 2);
    check("migration_strips_checksum_only_entries",
        JSON.stringify(outerAfter) === JSON.stringify([-10, 15]) && marks.length === 1 && marks[0].rule === "WG.00.43"
            && marks2.length === 1 && JSON.stringify(outer2) === JSON.stringify([-10, 15])
            && JSON.stringify(again.levels["-10"]) === beforeReal["-10"] && JSON.stringify(again.levels["15"]) === beforeReal["15"],
        `first outer ${JSON.stringify(outerAfter)} migrations ${JSON.stringify(marks)}; second outer ${JSON.stringify(outer2)} migrations ${marks2.length}`);

    console.log(`RESULT: ${passed} passed, ${failed} failed${failures.length ? " (" + failures.join(", ") + ")" : ""}`);
    process.exit(failed ? 1 : 0);
}

try {
    if (capture) runCapture();
    else runChecks();
} catch (e) {
    console.error("HARNESS " + (e && e.stack ? e.stack : e));
    process.exit(2);
}
