#!/usr/bin/env node
"use strict";

/**
 * tools/test_deep_cuts_and_mountain_cap_wg0041.js
 *
 * Automated gate tests for WG.00.41 (lane-cm), all in the -16..+15 world unless stated:
 * 1. no_rock_z12_to_z15_seed_*: DEC-030 keeps +12..+15 open air (every stratum air) in the start area of four seeds.
 * 2. highlands_reached: the roof stretch still raises natural rock into the Highlands: across the four seeds the
 *    highest natural solid level is between +7 and +11 (never above +11).
 * 3. Deep cuts, judged against a snapshot of the same world generated WITHOUT the deep-cut pass (so which columns hold
 *    core fluid is decided before the operation, not read back from its output):
 *    - deep_cuts_to_bedrock: every cut whose core column holds no water or lava is air on Z=-3..-15, and at Z=-16
 *      keeps its original solid S0 with four open strata above it (S1..S4, 8 ft at 2 ft per stratum);
 *    - deep_cuts_core_opening: the same cuts are open through the core, from elevation fromE-1 down to -2 S0;
 *    - deep_cuts_fluid_guard: every cut whose core column holds water or lava is left exactly as it was on every
 *      level from -16 to +2 (DEC-001: fluid never rests on air); at least one such column must exist in seed 18.
 * 4. same_seed_determinism_32_layers: two fresh VMs generate byte-identical baselines on all 32 levels.
 * 5. cross_world_*: seed 18 regenerated inside a VM that already holds another world (seed 3, in the -16..+15 and the
 *    legacy -2..+2 ranges), given seed 18's own world description, checksums the same as a fresh seed-18 world on
 *    15 sampled levels from Deep Earth to the open air.
 *
 * Usage: node tools/test_deep_cuts_and_mountain_cap_wg0041.js            run the checks (exit 0 pass, 1 fail, 2 harness)
 *        node tools/test_deep_cuts_and_mountain_cap_wg0041.js --mutant=X   run with one mutant (must exit 1)
 *        node tools/test_deep_cuts_and_mountain_cap_wg0041.js --mutants    unmutated baseline must pass, then every mutant
 *                                                                           must fail exactly its designated checks
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { performance } = require("perf_hooks");
const simHook = require("./lib/vm_sim_require"); // WG.00.44: UF.Sim.require and a 1x1 grid in the vm

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

// Each mutant breaks one promise of WG.00.41 in DEUS_Levels.js; it must fail its designated checks and nothing else.
// A missing or repeated anchor is a harness problem (exit 2).
const MUTANTS = {
    roof_stretch_to_15: { find: "const maxRockLevel = Math.min(r.zMax, 11);", repl: "const maxRockLevel = r.zMax;", catches: [/^no_rock_z12_to_z15_seed_/, /^highlands_reached$/] },
    no_stretch: { find: "const maxRockLevel = Math.min(r.zMax, 11);", repl: "const maxRockLevel = CORE.zMax;", catches: [/^highlands_reached$/] },
    deep_cuts_skipped: { find: "materializeDeepCuts(v, core, r, size);", repl: "/* mutant: deep cuts skipped */", catches: [/^deep_cuts_to_bedrock$/, /^deep_cuts_core_opening$/] },
    core_opening_skipped: { find: "for (let e = fromE - 1; e >= 0; e--) {", repl: "for (let e = -1; e >= 0; e--) {", catches: [/^deep_cuts_core_opening$/] },
    fluid_guard_removed: { find: "if (FLUID_B[rdM[rdO + s]] === 1) { fluid = true; break; }", repl: "/* mutant: fluid guard removed */", catches: [/^deep_cuts_fluid_guard$/] },
    per_vm_random_roll: { find: "uniformStore(b, z < CORE.zMin ? STONE_CELL : AIR_CELL, size);", repl: "uniformStore(b, z < CORE.zMin ? STONE_CELL : AIR_CELL, size); if (z === -11) for (let k = 0; k < 8; k++) storeSetStratum(b, k, 0, 0, 1 + Math.floor(Math.random() * 250));", catches: [/^same_seed_determinism_32_layers$/, /^cross_world_/] },
    host_seed_leak: { find: "const s = desc.seed !== undefined ? desc.seed : (typeof seed === \"number\" ? seed : 0);", repl: "const s = (st && st.seed !== undefined) ? st.seed : (desc.seed !== undefined ? desc.seed : 0);", catches: [/^cross_world_/] },
};
// Test-only variant (not a mutant): the same world generated without the deep-cut pass, the "before" snapshot.
const VARIANTS = { nocut: { find: "materializeDeepCuts(v, core, r, size);", repl: "/* variant: no deep cuts (before snapshot) */" } };
const argMutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9) || null;
if (argMutant && !MUTANTS[argMutant]) { console.error("HARNESS: unknown mutant " + argMutant + " (known: " + Object.keys(MUTANTS).join(", ") + ")"); process.exit(2); }

if (process.argv.includes("--mutants")) {
    const { spawnSync } = require("child_process");
    const run = args => spawnSync(process.execPath, [__filename, ...args], { encoding: "utf8", maxBuffer: 64 << 20 });
    const parse = r => ({
        status: r.status, stderr: String(r.stderr || ""),
        done: /^RESULT: /m.test(r.stdout || ""),
        fails: String(r.stdout || "").split("\n").filter(l => l.startsWith("FAIL ")).map(l => l.slice(5).split(" - ")[0].trim())
    });
    const base = parse(run([]));
    if (base.status !== 0 || !base.done || base.fails.length) {
        console.log("BASELINE NOT CLEAN - exit " + base.status + (base.fails.length ? "; failing: " + base.fails.join(", ") : "") + (base.done ? "" : "; no RESULT line"));
        process.exit(2);
    }
    console.log("BASELINE clean: exit 0, no failures");
    let caught = 0;
    for (const [name, m] of Object.entries(MUTANTS)) {
        const p = parse(run(["--mutant=" + name]));
        const designated = p.fails.filter(n => m.catches.some(re => re.test(n)));
        const unrelated = p.fails.filter(n => !m.catches.some(re => re.test(n)));
        const ok = p.status === 1 && p.done && designated.length > 0 && unrelated.length === 0;
        if (ok) caught++;
        console.log((ok ? "CAUGHT " : "MISSED ") + name + " - exit " + p.status + (p.done ? "" : " (no RESULT line)") +
            "; designated failures: " + (designated.join(", ") || "none") +
            (unrelated.length ? "; UNRELATED failures: " + unrelated.join(", ") : "") +
            (p.status === 2 ? "; " + p.stderr.trim().slice(0, 200) : ""));
    }
    console.log("\nMUTANTS: " + caught + "/" + Object.keys(MUTANTS).length + " caught (each by its designated checks only)");
    process.exit(caught === Object.keys(MUTANTS).length ? 0 : 1);
}

function pluginSource(f, variant) {
    let src = fs.readFileSync(path.join(PLUGINS, f), "utf8");
    if (f !== "DEUS_Levels.js") return src;
    const apply = (label, m) => {
        const n = src.split(m.find).length - 1;
        if (n !== 1) { console.error("HARNESS: " + label + " anchor found " + n + " times (want 1): " + m.find); process.exit(2); }
        src = src.replace(m.find, m.repl);
    };
    if (argMutant) apply("mutant " + argMutant, MUTANTS[argMutant]);
    if (variant) {
        if (!VARIANTS[variant]) { console.error("HARNESS: unknown variant " + variant); process.exit(2); }
        // A mutant that already rewrote the variant's anchor (deep_cuts_skipped) leaves nothing to apply.
        if (src.includes(VARIANTS[variant].find)) apply("variant " + variant, VARIANTS[variant]);
    }
    return src;
}

function setup(zRange = "-16..15", variant = null) {
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
    simHook.install(env);
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
        vm.runInContext(pluginSource(f, variant), ctx, { filename: f });
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
// Material bytes as DEUS_Levels defines them (SOLID_B / FLUID_B): id in the low 6 bits, 0x40 never set on a valid byte,
// 0x80 the constructed flag. Solid: stone 1, soil 2, wood 3. Fluid: water 4, lava 5, never constructed. Air is exactly 0.
const M_AIR = 0;
const isSolid = m => (m & 0x40) === 0 && [1, 2, 3].includes(m & 0x3f);
const isFluid = m => (m & 0xc0) === 0 && (m === 4 || m === 5);

//-----------------------------------------------------------------------------
// Checks 1 and 2: +12..+15 hold no natural solid (DEC-030), and the roof stretch still reaches the Highlands.
{
    const highest = {};
    for (const seed of SEEDS) {
        const env = setup("-16..15");
        env.UF.World.newWorld(seed);
        const st = env.UF.World.state;
        const a = st.startArea;
        const n = st.size * st.size;
        let above11 = 0;
        highest[seed] = 2;
        for (let z = 3; z <= 15; z++) {
            const m = env.UF.Levels.baseline(z, a.x, a.y).strata.m;
            let any = false;
            for (let i = 0; i < n * 5; i++) {
                if (z >= 12 && m[i] !== M_AIR) above11++;   // open air: anything but air fails (DEC-030; DEC-001 keeps fluid off air)
                if (isSolid(m[i])) { any = true; if (z < 12) break; }
            }
            if (any) highest[seed] = Math.max(highest[seed], z);
        }
        check(`no_rock_z12_to_z15_seed_${seed}`, above11 === 0, `seed ${seed}: ${above11} strata other than air on +12..+15 in the start area (want 0)`);
    }
    const tops = Object.values(highest), top = Math.max(...tops);
    check("highlands_reached", top >= 7 && top <= 11 && tops.every(t => t <= 11),
        `highest natural solid level per seed: ${SEEDS.map(s => s + ": +" + highest[s]).join(", ")} (want the highest between +7 and +11, none above +11)`);
}

//-----------------------------------------------------------------------------
// Check 3: deep cuts, judged against a "before" snapshot generated without the deep-cut pass.
{
    const after = setup("-16..15");
    after.UF.World.newWorld(18);
    const before = setup("-16..15", "nocut");
    before.UF.World.newWorld(18);
    const a = after.UF.World.state.startArea;
    const levelA = z => after.UF.Levels.baseline(z, a.x, a.y).strata.m;
    const levelB = z => before.UF.Levels.baseline(z, a.x, a.y).strata.m;
    const cuts = after.UF.Levels.baseline(-2, a.x, a.y).deepCuts || [];
    const cutsB = before.UF.Levels.baseline(-2, a.x, a.y).deepCuts || [];
    const fluidBefore = i => { const out = []; for (let z = -2; z <= 2; z++) { const m = levelB(z); for (let s = 0; s < 5; s++) if (isFluid(m[i * 5 + s])) out.push(z + ":S" + s); } return out; };

    let carved = 0, openCore = 0, guarded = 0, guardedChanged = 0;
    const bedErr = [], coreErr = [], guardErr = [];
    for (const dc of cuts) {
        const i = dc.i, fromE = dc.fromE;
        if (fluidBefore(i).length) {
            // Guarded: the whole column from -16 to +2 is exactly as it was before the deep-cut pass.
            let same = true;
            for (let z = -16; z <= 2 && same; z++) {
                const ma = levelA(z), mb = levelB(z);
                for (let s = 0; s < 5; s++) if (ma[i * 5 + s] !== mb[i * 5 + s]) { same = false; guardErr.push(`cell ${i} Z=${z} S${s}: ${mb[i * 5 + s]} -> ${ma[i * 5 + s]}`); break; }
            }
            if (same) guarded++; else guardedChanged++;
            continue;
        }
        // Carved below the core: Z=-3..-15 all air; Z=-16 keeps its original solid S0 with S1..S4 open.
        let ok = true;
        for (let z = -3; z >= -15; z--) {
            const m = levelA(z);
            for (let s = 0; s < 5; s++) if (m[i * 5 + s] !== M_AIR) { ok = false; bedErr.push(`cell ${i} Z=${z} S${s} is ${m[i * 5 + s]}`); }
        }
        const ma = levelA(-16), mb = levelB(-16);
        if (!isSolid(ma[i * 5]) || ma[i * 5] !== mb[i * 5]) { ok = false; bedErr.push(`cell ${i} Z=-16 S0 is ${ma[i * 5]} (was ${mb[i * 5]}; want the same solid)`); }
        for (let s = 1; s < 5; s++) if (ma[i * 5 + s] !== M_AIR) { ok = false; bedErr.push(`cell ${i} Z=-16 S${s} is ${ma[i * 5 + s]} (want open)`); }
        if (ok) carved++;
        // Open through the core: elevations fromE-1 .. 0 (-2 S0) are air.
        let open = true;
        for (let e = fromE - 1; e >= 0; e--) {
            const z = -2 + Math.floor(e / 5), s = e % 5, m = levelA(z)[i * 5 + s];
            if (m !== M_AIR) { open = false; coreErr.push(`cell ${i} Z=${z} S${s} is ${m}`); }
        }
        if (open) openCore++;
    }
    const unguarded = cuts.length - guarded - guardedChanged;
    check("deep_cuts_to_bedrock", cuts.length > 0 && cuts.length === cutsB.length && carved > 0 && carved === unguarded && bedErr.length === 0,
        `seed 18: ${cuts.length} deep cuts (${cutsB.length} before), ${unguarded} over no core fluid, ${carved} carved to bedrock with four open strata (8 ft) above it; problems ${bedErr.length}${bedErr.length ? " (" + bedErr.slice(0, 3).join("; ") + ")" : ""}`);
    check("deep_cuts_core_opening", unguarded > 0 && openCore === unguarded && coreErr.length === 0,
        `seed 18: ${openCore}/${unguarded} unguarded cuts open through the core from fromE-1 to -2 S0; obstructing strata ${coreErr.length}${coreErr.length ? " (" + coreErr.slice(0, 3).join("; ") + ")" : ""}`);
    check("deep_cuts_fluid_guard", guarded >= 1 && guardedChanged === 0,
        `seed 18: ${guarded + guardedChanged} cuts sit over core water or lava (decided before the pass); ${guarded} left exactly as they were from -16 to +2, ${guardedChanged} changed${guardErr.length ? " (" + guardErr.slice(0, 3).join("; ") + ")" : ""}`);
}

//-----------------------------------------------------------------------------
// Check 4: same-seed determinism across two fresh VMs, all 32 levels, material bytes.
{
    const env1 = setup("-16..15");
    env1.UF.World.newWorld(18);
    const a1 = env1.UF.World.state.startArea;
    const env2 = setup("-16..15");
    env2.UF.World.newWorld(18);
    const a2 = env2.UF.World.state.startArea;
    let differ = null;
    for (let z = -16; z <= 15 && !differ; z++) {
        const b1 = env1.UF.Levels.baseline(z, a1.x, a1.y), b2 = env2.UF.Levels.baseline(z, a2.x, a2.y);
        if (Buffer.compare(Buffer.from(b1.strata.m.buffer, b1.strata.m.byteOffset, b1.strata.m.byteLength),
                           Buffer.from(b2.strata.m.buffer, b2.strata.m.byteOffset, b2.strata.m.byteLength)) !== 0) differ = z;
    }
    check("same_seed_determinism_32_layers", differ === null, differ === null ? "32 levels byte-identical across two fresh VMs" : `level ${differ} differs between two fresh VMs`);
}

//-----------------------------------------------------------------------------
// Check 5: cross-world determinism. A world regenerated inside a VM that already holds another world must come out
// exactly as it does fresh, when given its own world description (seed, size, areas, start area, coupling, Z range).
{
    const SAMPLE = [-16, -15, -11, -8, -3, -2, -1, 0, 1, 2, 3, 8, 11, 12, 15];
    const native = setup("-16..15");
    native.UF.World.newWorld(18);
    const desc = JSON.parse(JSON.stringify(native.UF.World.state));
    const want = {};
    for (const z of SAMPLE) want[z] = native.UF.Levels.checksum(z);
    for (const [label, range] of [["default", "-16..15"], ["legacy", "legacy"]]) {
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
