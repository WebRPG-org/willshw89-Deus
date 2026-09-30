#!/usr/bin/env node
"use strict";

/**
 * tools/test_deep_cuts_and_mountain_cap_wg0041.js
 *
 * Automated gate tests for WG.00.41 (lane-cm):
 * 1. DEC-030 mountain cap ceiling: no natural rock on Z=+12..+15 across four seeds (open air only).
 * 2. Subterranean deep cuts: abyssal cuts plunge sheerly down through subterranean levels Z = -3..-15,
 *    stopping at bedrock Z = -16 S0 with 4 ft headroom (S1..S4 = air).
 * 3. Same-seed determinism in 32-layer world (-16..+15): two VMs generate byte-identical baselines.
 * 4. Cross-world determinism: seed 18 regenerated inside a VM that already holds another world (seed 3, both the
 *    default -16..+15 range and the legacy -2..+2 range), given seed 18's own world description, checksums the same
 *    as a fresh seed-18 world on every sampled level from Deep Earth to the open air.
 *
 * Usage: node tools/test_deep_cuts_and_mountain_cap_wg0041.js            run the checks (exit 0 pass, 1 fail, 2 harness)
 *        node tools/test_deep_cuts_and_mountain_cap_wg0041.js --mutant=X   run with one mutant (must exit 1)
 *        node tools/test_deep_cuts_and_mountain_cap_wg0041.js --mutants    run every mutant; exit 0 only if all are caught
 * Mutants: roof_stretch_to_15, deep_cuts_skipped, per_vm_random_roll, host_seed_leak (see MUTANTS).
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");

const FILES = [
    "DEUS_World.js",
    "DEUS_WorldGen.js",
    "DEUS_Tiles.js",
    "DEUS_Objects.js",
    "DEUS_Levels.js",
    "DEUS_Floors.js"
];

const MUTANTS = {
    // Each mutant breaks one promise of WG.00.41; the named check must then fail (exit 1). A missing anchor is a harness problem (exit 2).
    roof_stretch_to_15: { find: "const maxRockLevel = Math.min(r.zMax, 11);", repl: "const maxRockLevel = r.zMax;", catches: "no_rock_z12_to_z15_*" },
    deep_cuts_skipped: { find: "materializeDeepCuts(v, core, r, size);", repl: "/* mutant: deep cuts skipped */", catches: "deep_cuts_plunge_to_bedrock" },
    per_vm_random_roll: { find: "uniformStore(b, z < CORE.zMin ? STONE_CELL : AIR_CELL, size);", repl: "uniformStore(b, z < CORE.zMin ? STONE_CELL : AIR_CELL, size); if (z < CORE.zMin) storeSetStratum(b, Math.floor(Math.random() * size), Math.floor(Math.random() * size), Math.floor(Math.random() * STRATA), M_AIR);", catches: "same_seed_determinism_32_layers, cross_world_*" },
    host_seed_leak: { find: "const s = desc.seed !== undefined ? desc.seed : (typeof seed === \"number\" ? seed : 0);", repl: "const s = (st && st.seed !== undefined) ? st.seed : (desc.seed !== undefined ? desc.seed : 0);", catches: "cross_world_*" },
};
const argMutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9) || null;
if (argMutant && !MUTANTS[argMutant]) { console.error("HARNESS: unknown mutant " + argMutant + " (known: " + Object.keys(MUTANTS).join(", ") + ")"); process.exit(2); }
if (process.argv.includes("--mutants")) {
    const { spawnSync } = require("child_process");
    let caught = 0;
    for (const name of Object.keys(MUTANTS)) {
        const r = spawnSync(process.execPath, [__filename, "--mutant=" + name], { encoding: "utf8" });
        const fails = (r.stdout || "").split("\n").filter(l => l.startsWith("FAIL ")).map(l => l.slice(5).split(" - ")[0]);
        const ok = r.status === 1 && fails.length > 0;
        if (ok) caught++;
        console.log((ok ? "CAUGHT " : "MISSED ") + name + " - exit " + r.status + (fails.length ? "; failed: " + fails.join(", ") : "") + (r.status === 2 ? "; " + String(r.stderr).trim().slice(0, 200) : "") + " (expected: " + MUTANTS[name].catches + ")");
    }
    console.log("\nMUTANTS: " + caught + "/" + Object.keys(MUTANTS).length + " caught");
    process.exit(caught === Object.keys(MUTANTS).length ? 0 : 1);
}

function pluginSource(f) {
    let src = fs.readFileSync(path.join(PLUGINS, f), "utf8");
    if (argMutant && f === "DEUS_Levels.js") {
        const m = MUTANTS[argMutant], n = src.split(m.find).length - 1;
        if (n !== 1) { console.error("HARNESS: mutant " + argMutant + " anchor found " + n + " times (want 1): " + m.find); process.exit(2); }
        src = src.replace(m.find, m.repl);
    }
    return src;
}

function setup(zRange = "-16..15") {
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
    const ctx = vm.createContext(env);
    const rmmzMgr = fs.readFileSync(path.join(ROOT, "game/js/rmmz_managers.js"), "utf8");
    const rmmzCore = fs.readFileSync(path.join(ROOT, "game/js/rmmz_core.js"), "utf8");
    const deus = fs.readFileSync(path.join(PLUGINS, "DEUS_Core.js"), "utf8");
    const section = (src, a, b) => {
        const i = src.indexOf(a), j = src.indexOf(b, i + a.length);
        return src.slice(i, j);
    };
    vm.runInContext(section(rmmzMgr, "DataManager.makeSaveContents =", "DataManager.correctDataErrors ="), ctx);
    vm.runInContext(section(rmmzCore, "function JsonEx()", "//-----------------------------------------------------------------------------"), ctx);
    vm.runInContext(section(rmmzCore, "Tilemap.TILE_ID_B =", "Tilemap.Layer ="), ctx);
    vm.runInContext(section(deus, "window.DEUS = window.DEUS || {};", "//-----------------------------------------------------------------------------"), ctx);
    for (const f of FILES) {
        vm.runInContext(pluginSource(f), ctx, { filename: f });
    }
    return env;
}

let passed = 0, failed = 0;
const failures = [];
function check(name, ok, detail = "") {
    if (ok) passed++;
    else { failed++; failures.push(name); }
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " - " + detail : ""}`);
    return !!ok;
}

const SEEDS = [18, 3, 21, 4];

//-----------------------------------------------------------------------------
// Check 1: No natural rock on +12..+15 across four seeds (DEC-030)
for (const seed of SEEDS) {
    const env = setup("-16..15");
    env.UF.World.newWorld(seed);
    const st = env.UF.World.state;
    const a = st.startArea;
    const size = st.size;
    const M_AIR = 0;

    let rockCount = 0;
    for (let z = 12; z <= 15; z++) {
        const b = env.UF.Levels.baseline(z, a.x, a.y);
        const m = b.strata.m;
        for (let i = 0; i < size * size; i++) {
            for (let s = 0; s < 5; s++) {
                const mat = m[i * 5 + s];
                if (mat !== M_AIR) {
                    rockCount++;
                }
            }
        }
    }
    check(`no_rock_z12_to_z15_seed_${seed}`, rockCount === 0, `seed ${seed}: found ${rockCount} non-air strata on levels +12..+15 (want 0)`);
}

//-----------------------------------------------------------------------------
// Check 2: Deep cut columns plunge through subterranean levels Z=-3..-15 down to bedrock Z=-16, except where the
// column holds water or lava in the core (-2..+2): DEC-001 keeps fluid off air, so materializeDeepCuts leaves those
// columns uncut, and the check requires them untouched (still solid at Z=-3..-15, the fluid still in place).
{
    const env = setup("-16..15");
    env.UF.World.newWorld(18);
    const st = env.UF.World.state;
    const a = st.startArea;
    const FLUID = new Set([4, 5]); // M_WATER, M_LAVA
    const core0 = env.UF.Levels.baseline(-2, a.x, a.y);
    const deepCuts = core0.deepCuts || [];
    const coreFluid = i => { const out = []; for (let z = -2; z <= 2; z++) { const m = env.UF.Levels.baseline(z, a.x, a.y).strata.m; for (let s = 0; s < 5; s++) if (FLUID.has(m[i * 5 + s])) out.push(z + ":" + s); } return out; };

    let carved = 0, guarded = 0;
    const errors = [];
    for (const dc of deepCuts) {
        const i = dc.i;
        const fluid = coreFluid(i);
        if (fluid.length) {
            // Guarded column: Z=-3..-15 stay solid and the fluid stays.
            let solid = true;
            for (let z = -3; z >= -15 && solid; z--) {
                const m = env.UF.Levels.baseline(z, a.x, a.y).strata.m;
                for (let s = 0; s < 5; s++) if (m[i * 5 + s] === 0) { solid = false; errors.push(`guarded cell ${i} (fluid at ${fluid.join(",")}) was cut at Z=${z} S${s}`); break; }
            }
            if (solid) guarded++;
            continue;
        }
        // Cut column: Z=-3..-15 all air; bedrock Z=-16 S0 solid with S1..S4 air (4 ft headroom).
        let ok = true;
        for (let z = -3; z >= -15; z--) {
            const m = env.UF.Levels.baseline(z, a.x, a.y).strata.m;
            for (let s = 0; s < 5; s++) if (m[i * 5 + s] !== 0) { ok = false; errors.push(`cut cell ${i} Z=${z} S${s} is not air`); }
        }
        const mBed = env.UF.Levels.baseline(-16, a.x, a.y).strata.m;
        if (mBed[i * 5] === 0) { ok = false; errors.push(`cut cell ${i} Z=-16 S0 is air (bedrock missing)`); }
        for (let s = 1; s < 5; s++) if (mBed[i * 5 + s] !== 0) { ok = false; errors.push(`cut cell ${i} Z=-16 S${s} not air (headroom)`); }
        if (ok) carved++;
    }
    check("deep_cuts_plunge_to_bedrock", carved > 0 && carved + guarded === deepCuts.length && errors.length === 0,
        `seed 18: deepCuts=${deepCuts.length}, carved to bedrock=${carved}, left uncut over core fluid (DEC-001)=${guarded}, errors=${errors.length}${errors.length ? " (" + errors.slice(0, 3).join("; ") + ")" : ""}`);
}

//-----------------------------------------------------------------------------
// Check 3: Deterministic same-seed baselines in 32-layer world
{
    const env1 = setup("-16..15");
    env1.UF.World.newWorld(18);
    const st1 = env1.UF.World.state;
    const a1 = st1.startArea;

    const env2 = setup("-16..15");
    env2.UF.World.newWorld(18);
    const st2 = env2.UF.World.state;
    const a2 = st2.startArea;

    let match = true;
    for (let z = -16; z <= 15; z++) {
        const b1 = env1.UF.Levels.baseline(z, a1.x, a1.y);
        const b2 = env2.UF.Levels.baseline(z, a2.x, a2.y);
        if (Buffer.compare(Buffer.from(b1.strata.m.buffer, b1.strata.m.byteOffset, b1.strata.m.byteLength),
                           Buffer.from(b2.strata.m.buffer, b2.strata.m.byteOffset, b2.strata.m.byteLength)) !== 0) {
            match = false;
            break;
        }
    }
    check("same_seed_determinism_32_layers", match, "32-layer world baselines match byte-for-byte across two fresh VMs");
}

//-----------------------------------------------------------------------------
// Check 4: Cross-world determinism. A world regenerated inside a VM that already holds another world must come out
// exactly as it does fresh, when it is given its own world description (seed, size, areas, start area, coupling,
// Z range). Sampled levels cover Deep Earth, the deep-cut floor, the Caverns, the core, the mountain cap and open air.
{
    const SAMPLE = [-16, -15, -11, -8, -3, -2, -1, 0, 1, 2, 3, 8, 11, 12, 15];
    const native = setup("-16..15");
    native.UF.World.newWorld(18);
    const desc = JSON.parse(JSON.stringify(native.UF.World.state));
    const want = {};
    for (const z of SAMPLE) want[z] = native.UF.Levels.checksum(z);
    const hosts = [["default", "-16..15"], ["legacy", "legacy"]];
    for (const [label, range] of hosts) {
        const host = setup(range);
        host.UF.World.newWorld(3);
        const bad = [];
        let thrown = null;
        for (const z of SAMPLE) {
            let got;
            try { got = host.UF.Levels.checksum(z, desc.seed, undefined, desc); } catch (e) { thrown = "z " + z + ": " + e.message; break; }
            if (got === "n/a" || got !== want[z]) bad.push("z " + z + ": " + got + " vs " + want[z]);
        }
        const hostSeed = host.UF.World.state.seed;
        check("cross_world_" + label + "_host", !thrown && bad.length === 0 && hostSeed === 3,
            "seed 18 inside a seed-" + hostSeed + " " + label + "-range host, " + SAMPLE.length + " levels: " +
            (thrown ? "threw at " + thrown : bad.length ? bad.length + " differ (" + bad.slice(0, 3).join("; ") + ")" : "all match the fresh world"));
    }
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed (exit ${failed === 0 ? 0 : 1})`);
process.exit(failed === 0 ? 0 : 1);
