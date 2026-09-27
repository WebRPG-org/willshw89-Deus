"use strict";
// SIM.50.13 F-05 / D-4. The fluid solver must be on window.UF after DEUS_Core's
// require() load, including every map and layer load, and flood fills must not
// create water.
//   node tools/sim/test_fluid_attach.js
// The real load order is simulated: the file is evaluated inside a CommonJS
// wrapper BEFORE window.UF exists, then Core's two assignment lines run.
// An in-memory mutant of bindSharedNamespace (no window assign) must leave
// window.UF.Fluid unset, so this file can fail. Exit 0 only when every check passes.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const SRC = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "DEUS_Fluid.js"), "utf8");
const Z_MIN = -16;
const Z_MAX = 15;
const SIZE = 8;

let failed = 0;
function check(name, ok, detail) {
    if (ok) console.log("PASS " + name + (detail ? " — " + detail : ""));
    else {
        failed++;
        console.log("FAIL " + name + ": " + detail);
    }
}

function freshSandbox() {
    const timers = [];
    const sandbox = {
        console: console,
        performance: { now: () => 0 },
        setInterval(fn, ms) {
            const id = setInterval(fn, ms);
            timers.push(["i", id]);
            return id;
        },
        clearInterval(id) { clearInterval(id); },
        setTimeout(fn, ms) {
            const id = setTimeout(fn, ms);
            timers.push(["t", id]);
            return id;
        },
        clearTimeout(id) { clearTimeout(id); }
    };
    sandbox.window = sandbox;
    function Game_Map() {}
    Game_Map.prototype.update = function() {};
    Game_Map.prototype.setup = function(mapId) { sandbox.__setups = (sandbox.__setups || 0) + 1; sandbox.__lastMap = mapId; };
    sandbox.Game_Map = Game_Map;
    sandbox.__timers = timers;
    return sandbox;
}

function stopTimers(sandbox) {
    for (const [kind, id] of sandbox.__timers) {
        if (kind === "i") clearInterval(id);
        else clearTimeout(id);
    }
    sandbox.__timers.length = 0;
}

function loadAsRequire(src, sandbox) {
    vm.createContext(sandbox);
    const module = { exports: {} };
    const wrapper = "(function (exports, require, module, __filename, __dirname) {\n" + src + "\n})";
    const fn = vm.runInContext(wrapper, sandbox, { filename: "DEUS_Fluid.js", timeout: 10000 });
    fn(module.exports, function refused() { throw new Error("require refused"); }, module, "DEUS_Fluid.js", ROOT);
    return module.exports;
}

function coreAssign(sandbox) {
    // DEUS_Core.js after the companion require(): a new object only if Fluid did not publish one.
    vm.runInContext("window.DEUS = window.DEUS || {}; window.UF = window.DEUS;", sandbox);
}

function makeEvents() {
    const names = [];
    const handlers = Object.create(null);
    return {
        names: names,
        on(name, fn) {
            names.push(name);
            (handlers[name] = handlers[name] || []).push(fn);
        },
        off() {},
        emit(name) {
            const args = Array.prototype.slice.call(arguments, 1);
            const list = handlers[name] || [];
            for (let i = 0; i < list.length; i++) list[i].apply(null, args);
        }
    };
}

function installWorld(sandbox, events) {
    const ns = sandbox.UF;
    ns.Events = events;
    ns.World = {
        state: { size: SIZE },
        zRange() { return { zMin: Z_MIN, zMax: Z_MAX }; }
    };
}

// Levels.getFloodGrid's choice: the solver's grid when Fluid is bound, otherwise the
// legacy fill, which paints water on z = -1 and z = -2 with no source volume.
function levelsFlood(sandbox, area, z, legacy) {
    const ns = sandbox.window.UF;
    if (ns && ns.Fluid && typeof ns.Fluid.getFloodGrid === "function") {
        const fg = ns.Fluid.getFloodGrid(area, z);
        if (fg) return "solver";
    }
    if (z !== -1 && z !== -2) return "none";
    legacy.volume += 7;
    legacy.calls++;
    return "legacy";
}

function scanWater(fluid) {
    let water = 0;
    for (let z = Z_MIN; z <= Z_MAX; z++) {
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                if (fluid.typeAt(0, 0, x, y, z) === "water") water += fluid.depthAt(0, 0, x, y, z);
            }
        }
    }
    return water;
}

function assertVolume(name, fluid, expected, legacy) {
    const scanned = scanWater(fluid);
    const diag = fluid.diagnostics().totalWaterVolume;
    check(name, scanned === expected && diag === expected && legacy.volume === 0 && legacy.calls === 0,
        "scanned " + scanned + " diagnostics " + diag + " legacyCalls " + legacy.calls + " legacyVolume " + legacy.volume + " expected " + expected);
}

// --- Mutant: a bind that does not publish window.UF must stay unbound after Core's lines. ---
{
    const assignments = ["window.DEUS = window.UF = {};", "window.UF = window.DEUS;", "window.DEUS = window.UF;"];
    const missing = assignments.filter(line => !SRC.includes(line));
    check("mutant_site_present", missing.length === 0, missing.length ? "missing " + missing.join(" | ") : "three bind assignments");
    let mutantSrc = SRC;
    for (const line of assignments) mutantSrc = mutantSrc.replace(line, "");
    const sandbox = freshSandbox();
    let exported = null;
    let loadError = null;
    try { exported = loadAsRequire(mutantSrc, sandbox); }
    catch (e) { loadError = e; }
    coreAssign(sandbox);
    stopTimers(sandbox);
    const bound = !!(sandbox.window.UF && sandbox.window.UF.Fluid);
    check("mutant_require_does_not_bind", !loadError && exported && typeof exported.tick === "function" && !bound,
        loadError ? String(loadError && loadError.stack || loadError) : "window.UF.Fluid set: " + bound);
}

// --- Real file, require() before window.UF exists, then Core's assignment. ---
const sandbox = freshSandbox();
const exported = loadAsRequire(SRC, sandbox);
const beforeCore = !!(sandbox.window.UF && sandbox.window.UF.Fluid === exported);
coreAssign(sandbox);
const afterCore = sandbox.window.UF && sandbox.window.UF.Fluid === exported && sandbox.window.DEUS === sandbox.window.UF;
check("require_binds_before_core_lines", beforeCore, "window.UF.Fluid is the module export before Core runs: " + beforeCore);
check("require_survives_core_assign", !!afterCore, "same object after window.DEUS = window.DEUS || {}; window.UF = window.DEUS: " + !!afterCore);

const events = makeEvents();
installWorld(sandbox, events);
// Map loads for several layers, then the layer-built events World emits from loadMapData / rebindSpriteset.
const maps = [1, 2, 91, 92, 93];
for (const id of maps) sandbox.Game_Map.prototype.setup(id);
for (const z of [0, -1, -2, 1, -16, 15]) {
    if (z === 0) events.emit("world:areaBuilt", { x: 0, y: 0 });
    else events.emit("world:levelBuilt", { x: 0, y: 0, z: z });
}
const listenerCount = events.names.length;
sandbox.Game_Map.prototype.setup(94);
events.emit("world:levelBuilt", { x: 0, y: 0, z: -1 });
const required = ["levels:cellChanged", "levels:shapeChanged", "levels:strataChanged", "levels:strataDestroyed", "doors:opened", "doors:closed", "doors:broken", "world:areaBuilt", "world:levelBuilt"];
const missingHooks = required.filter(n => events.names.indexOf(n) < 0);
check("hooks_on_first_map_load", missingHooks.length === 0 && sandbox.window.UF.Fluid === exported,
    missingHooks.length ? "missing " + missingHooks.join(",") : "listeners " + events.names.length);
check("hooks_not_stacked", events.names.length === listenerCount,
    "before second load " + listenerCount + " after " + events.names.length + " (" + events.names.join(",") + ")");

// --- Volume across attach and flood fills. ---
const fluid = sandbox.window.UF.Fluid;
const legacy = { volume: 0, calls: 0 };
const area = { x: 0, y: 0 };
function floodAll() {
    const vias = [];
    for (let z = Z_MIN; z <= Z_MAX; z++) vias.push(levelsFlood(sandbox, area, z, legacy));
    return vias;
}

const beforePlace = scanWater(fluid);
floodAll();
check("volume_before_place", beforePlace === 0 && legacy.volume === 0, "scanned " + beforePlace + " legacy " + legacy.volume);

// A surface pool. Gravity carries it to the bottom layer; lateral equalization is the flood.
const placed = [
    [2, 2, 0, 7],
    [3, 2, 0, 5],
    [2, 3, 0, 4],
    [4, 4, 0, 6]
];
let expected = 0;
for (const cell of placed) {
    fluid.setCell(area, cell[0], cell[1], cell[2], "water", cell[3]);
    expected += cell[3];
}
assertVolume("volume_after_place", fluid, expected, legacy);

// Re-attach on another map and another layer. Attaching must not change the volume.
const volBeforeAttach = scanWater(fluid);
sandbox.Game_Map.prototype.setup(200);
events.emit("world:areaBuilt", { x: 1, y: 0 });
events.emit("world:levelBuilt", { x: 1, y: 0, z: -1 });
events.emit("world:levelBuilt", { x: 1, y: 0, z: -2 });
const attachVias = floodAll();
assertVolume("volume_after_attach", fluid, expected, legacy);
check("flood_uses_solver", attachVias.every(v => v === "solver") && scanWater(fluid) === volBeforeAttach,
    "vias " + attachVias.filter((v, i, a) => a.indexOf(v) === i).join(",") + " volume " + scanWater(fluid));

// One flood-fill read per layer, asserting equality after each, then the solver's own flow.
let floodStable = true;
let floodDetail = "";
for (let z = Z_MIN; z <= Z_MAX; z++) {
    const via = levelsFlood(sandbox, area, z, legacy);
    const now = scanWater(fluid);
    if (via !== "solver" || now !== expected || legacy.volume !== 0) {
        floodStable = false;
        floodDetail = "z " + z + " via " + via + " volume " + now + " legacy " + legacy.volume;
        break;
    }
}
check("volume_across_flood_fills", floodStable, floodDetail || ("layers " + (Z_MAX - Z_MIN + 1) + " volume " + expected));

let flowStable = true;
let flowDetail = "";
let steps = 0;
for (; steps < 40; steps++) {
    fluid.tick(100000);
    const now = scanWater(fluid);
    const diag = fluid.diagnostics().totalWaterVolume;
    if (now !== expected || diag !== expected) {
        flowStable = false;
        flowDetail = "step " + steps + " scanned " + now + " diagnostics " + diag;
        break;
    }
    if (fluid.diagnostics().activeQueueLength === 0) break;
}
if (flowStable && fluid.diagnostics().activeQueueLength !== 0) {
    flowStable = false;
    flowDetail = "queue still " + fluid.diagnostics().activeQueueLength + " after " + steps + " ticks";
}
// The fallen water is no longer only on z = 0: the bottom layer holds it, and the total is the placed total.
let bottom = 0;
for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    if (fluid.typeAt(0, 0, x, y, Z_MIN) === "water") bottom += fluid.depthAt(0, 0, x, y, Z_MIN);
}
check("volume_across_flow", flowStable && bottom === expected, flowDetail || ("ticks " + steps + " bottom " + bottom + " expected " + expected));

// A replaced namespace (Core's assign onto a new object) is repaired by the next map load, without new water.
const api = sandbox.window.UF.Fluid;
const world = sandbox.window.UF.World;
sandbox.DEUS = {};
sandbox.UF = sandbox.DEUS;
const reboundEvents = makeEvents();
sandbox.UF.Events = reboundEvents;
sandbox.UF.World = world;
const lost = !sandbox.UF.Fluid;
sandbox.Game_Map.prototype.setup(300);
events.emit("world:levelBuilt", { x: 0, y: 0, z: -2 });
const restored = sandbox.UF.Fluid === api && scanWater(api) === expected && legacy.volume === 0;
const reboundMissing = required.filter(n => reboundEvents.names.indexOf(n) < 0);
check("reattach_on_map_load", lost && restored && reboundMissing.length === 0,
    "was unbound " + lost + "; restored " + restored + "; missing " + reboundMissing.join(","));

stopTimers(sandbox);

// --- Classic script, the plugins.js path: an existing namespace keeps its identity. ---
{
    const classic = freshSandbox();
    const marker = { marker: true };
    classic.DEUS = marker;
    classic.UF = marker;
    vm.createContext(classic);
    vm.runInContext(SRC, classic, { filename: "DEUS_Fluid.js", timeout: 10000 });
    stopTimers(classic);
    check("classic_script_binds", classic.UF === marker && marker.Fluid && typeof marker.Fluid.tick === "function",
        "identity kept: " + (classic.UF === marker) + " Fluid set: " + !!(marker.Fluid && marker.Fluid.tick));
}

console.log("RESULT: " + (failed === 0 ? "PASS" : "FAIL") + " (" + failed + " failed)");
process.exit(failed === 0 ? 0 : 1);
