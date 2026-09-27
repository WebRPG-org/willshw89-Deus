"use strict";
// SIM.50.12. One regression per living-world audit finding F-01..F-05, at the
// default range -16..+15 and the test range -4..+4 (tools/sim/fixtures/living_world/ranges.json).
//   node tools/sim/test_living_world_rules.js
// The plugins run in a vm sandbox (no NW.js). Exit 0 only when every check passes.
// A 5-level 1 ft world, an ore sprout row, and a fluid bind that does not publish
// window.UF are rejected here, so a pre-fix tree fails these checks.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const FIXTURE = path.join(ROOT, "tools", "sim", "fixtures", "living_world", "ranges.json");
const ORE_TAG = "mythril_vein";

let failed = 0;
function check(name, ok, detail) {
    if (ok) console.log("PASS " + name + (detail ? " — " + detail : ""));
    else {
        failed++;
        console.log("FAIL " + name + ": " + detail);
    }
}
function run(name, fn) {
    try {
        const r = fn();
        check(name, !!(r && r.ok), r && r.detail ? r.detail : "");
    } catch (e) {
        check(name, false, e && e.stack ? e.stack.split("\n").slice(0, 5).join(" | ") : String(e));
    }
}

function readFixture() {
    const fx = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
    const ranges = fx.ranges || [];
    const feet = fx.feet || {};
    const core = fx.core || {};
    const ok = ranges.length === 2
        && ranges[0].label === "-16..+15" && ranges[0].zMin === -16 && ranges[0].zMax === 15
        && ranges[1].label === "-4..+4" && ranges[1].zMin === -4 && ranges[1].zMax === 4
        && feet.cell === 5 && feet.stratum === 2 && feet.strataPerLayer === 5 && feet.layer === 10
        && core.zMin === -2 && core.zMax === 2
        && fx.mapSize === 16
        && Array.isArray(fx.oreIds) && fx.oreIds.length === 3;
    return { fx: fx, ok: ok };
}

function levelsOf(range) {
    const list = [];
    for (let z = range.zMin; z <= range.zMax; z++) list.push(z);
    return list;
}

function trackTimers(sandbox) {
    const timers = [];
    sandbox.setInterval = function (fn, ms) {
        const id = setInterval(fn, ms);
        timers.push(["i", id]);
        return id;
    };
    sandbox.clearInterval = function (id) { clearInterval(id); };
    sandbox.setTimeout = function (fn, ms) {
        const id = setTimeout(fn, ms);
        timers.push(["t", id]);
        return id;
    };
    sandbox.clearTimeout = function (id) { clearTimeout(id); };
    sandbox.__timers = timers;
}
function stopTimers(sandbox) {
    const timers = sandbox && sandbox.__timers;
    if (!timers) return;
    for (let i = 0; i < timers.length; i++) {
        if (timers[i][0] === "i") clearInterval(timers[i][1]);
        else clearTimeout(timers[i][1]);
    }
    timers.length = 0;
}

function stubClass(methods) {
    function Ctor() {}
    Ctor.prototype = methods || {};
    return Ctor;
}

function engineSandbox() {
    const sandbox = {
        console: console,
        performance: { now: function () { return 0; } },
        process: process,
        require: require,
        Buffer: Buffer
    };
    trackTimers(sandbox);
    sandbox.window = sandbox;
    sandbox.PluginManager = { parameters: function () { return {}; } };
    sandbox.Game_Player = stubClass({
        moveStraight: function () {}, moveDiagonally: function () {}, performTransfer: function () {},
        isCollidedWithEvents: function () { return false; }, setupForNewGame: function () {},
        isTransferring: function () { return false; }, locate: function () {}, center: function () {},
        direction: function () { return 2; }, reserveTransfer: function () {}
    });
    sandbox.Game_Event = stubClass({
        isCollidedWithEvents: function () { return false; },
        isCollidedWithPlayerCharacters: function () { return false; }
    });
    sandbox.Game_CharacterBase = stubClass({ isCollidedWithEvents: function () { return false; } });
    sandbox.Game_Character = stubClass({});
    sandbox.Scene_Map = stubClass({
        isReady: function () { return true; }, start: function () {}, onTransfer: function () {},
        shouldAutosave: function () { return false; }, update: function () {},
        createDisplayObjects: function () {}, isAnyWindowUnderMouse: function () { return false; },
        isActive: function () { return true; }, isBusy: function () { return false; }
    });
    sandbox.Scene_Boot = stubClass({ start: function () {}, isReady: function () { return true; } });
    sandbox.Spriteset_Map = stubClass({
        createTilemap: function () {}, createCharacters: function () {}, update: function () {}, updateParallax: function () {}
    });
    sandbox.Game_Map = stubClass({
        setup: function () {}, update: function () {}, parallaxName: function () { return ""; },
        tileId: function () { return 0; }, isPassable: function () { return true; }, mapId: function () { return 1; },
        tilesetFlags: function () { return []; }
    });
    sandbox.SceneManager = { goto: function () {}, _scene: null, isSceneChanging: function () { return false; } };
    sandbox.$gamePlayer = new sandbox.Game_Player();
    sandbox.$gamePlayer.x = 0;
    sandbox.$gamePlayer.y = 0;
    sandbox.$dataMap = { width: 16, height: 16, data: [], ufObjects: [] };
    sandbox.$gameMap = new sandbox.Game_Map();
    sandbox.$gameMap._events = [];
    sandbox.$gameMessage = { isBusy: function () { return false; } };
    sandbox.Graphics = { frameCount: 0 };
    sandbox.Input = { keyMapper: {} };
    sandbox.Window_Selectable = function Window_Selectable() {};
    sandbox.JsonEx = { parse: JSON.parse, stringify: JSON.stringify };
    sandbox.ImageManager = { loadBitmap: function () { return {}; } };
    sandbox.Bitmap = function Bitmap() {};
    sandbox.Sprite = function Sprite() {};
    sandbox.Tilemap = function Tilemap() {};
    sandbox.Tilemap.isWaterTile = function () { return false; };
    sandbox.DataManager = {
        extractSaveContents: function () {},
        makeSaveContents: function () { return {}; },
        createGameObjects: function () {},
        correctDataErrors: function () {}
    };
    sandbox.Utils = { isNwjs: function () { return false; }, isOptionValid: function () { return false; } };
    return sandbox;
}

function loadScript(sandbox, file) {
    const src = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", file), "utf8");
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: file, timeout: 30000 });
}

function loadEngine(range, mapSize) {
    const extra = {};
    let lastErr = null;
    for (let attempt = 0; attempt < 8; attempt++) {
        const sandbox = engineSandbox();
        const names = Object.keys(extra);
        for (let i = 0; i < names.length; i++) sandbox[names[i]] = extra[names[i]];
        try {
            loadScript(sandbox, "DEUS_World.js");
            loadScript(sandbox, "DEUS_Levels.js");
            const World = sandbox.UF && sandbox.UF.World;
            const Levels = sandbox.UF && sandbox.UF.Levels;
            if (!World || !Levels) throw new Error("World or Levels did not publish");
            World.state = {
                seed: 18, size: mapSize, areasX: 1, areasY: 1, version: 5,
                zRange: { zMin: range.zMin, zMax: range.zMax },
                startArea: { x: 99, y: 99 }, levels: {}, diffs: {}, objectDiffs: {}, units: {}
            };
            return { sandbox: sandbox, World: World, Levels: Levels };
        } catch (e) {
            lastErr = e;
            const msg = String(e && e.message || e);
            const m = /^(?:ReferenceError: )?(\w+) is not defined/.exec(msg);
            if (!m || extra[m[1]]) break;
            extra[m[1]] = function Missing() {};
        }
    }
    const err = new Error("engine did not load at " + range.label + ": " + (lastErr && lastErr.message));
    err.cause = lastErr;
    throw err;
}

// --- F-01. The vertical model is the saved range, five 2 ft strata, a 10 ft layer. No cap at 24. ---

function judgeF01(World, Levels, range) {
    const problems = [];
    const want = levelsOf(range);
    const got = World.levels ? World.levels().slice() : (World.LEVELS ? World.LEVELS.slice() : []);
    if (got.length !== want.length || got.some(function (z, i) { return z !== want[i]; })) {
        problems.push("levels " + got.join(",") + " want " + want.join(","));
    }
    const live = World.zRange ? World.zRange() : null;
    if (!live || live.zMin !== range.zMin || live.zMax !== range.zMax) {
        problems.push("zRange " + JSON.stringify(live));
    }
    if (typeof World.isLevel === "function") {
        for (let z = range.zMin; z <= range.zMax; z++) if (!World.isLevel(z)) problems.push("isLevel " + z + " false");
        if (World.isLevel(range.zMin - 1) || World.isLevel(range.zMax + 1)) problems.push("isLevel outside the range");
    } else problems.push("no isLevel");
    const space = World.Space || {};
    if (space.GRID_SIZE_FEET !== 5 || space.STRATUM_FEET !== 2 || space.STRATA_PER_LAYER !== 5 || space.Z_STEP_FEET !== 10) {
        problems.push("feet cell " + space.GRID_SIZE_FEET + " stratum " + space.STRATUM_FEET + " per " + space.STRATA_PER_LAYER + " step " + space.Z_STEP_FEET);
    }
    if (space.STRATA_PER_LAYER * space.STRATUM_FEET !== space.Z_STEP_FEET) problems.push("layer feet not strata x stratum");
    if (typeof World.mapIdSlot === "function") {
        const slots = got.map(function (z) { return World.mapIdSlot(z); });
        if (new Set(slots).size !== got.length) problems.push("map slots collide");
    } else problems.push("no mapIdSlot");
    const elevBits = [];
    if (!Levels || typeof Levels.worldStrataElevationAt !== "function") {
        problems.push("no worldStrataElevationAt");
    } else {
        for (let z = range.zMin; z <= range.zMax && z < -2; z++) {
            const elev = Levels.worldStrataElevationAt(0, 0, 1, 1, z);
            const expect = (z - range.zMin) * 5 + 4;
            if (z === range.zMin || expect > 24) elevBits.push(z + "=" + elev);
            if (elev !== expect) problems.push("elevation z " + z + " " + elev + " want " + expect);
            if (expect > 24 && elev <= 24) problems.push("elevation capped at 24");
        }
    }
    const elevNote = elevBits.length ? " elevation " + elevBits.join(",") : "";
    return { ok: problems.length === 0, detail: problems.join("; ") || ("levels " + got.length + " feet 5/2/10" + elevNote) };
}

function f01(eng, range) {
    const World = eng.World;
    const saved = process.env.DEUS_Z_RANGE;
    let envRange = null;
    try {
        const prev = World.state;
        // Boot caches the empty state. A different object drops that cache, then no state reads DEUS_Z_RANGE.
        World.state = {};
        World.zRange();
        process.env.DEUS_Z_RANGE = range.label;
        World.state = null;
        envRange = World.zRange();
        World.state = prev;
    } finally {
        if (saved === undefined) delete process.env.DEUS_Z_RANGE;
        else process.env.DEUS_Z_RANGE = saved;
    }
    const judged = judgeF01(World, eng.Levels, range);
    if (!envRange || envRange.zMin !== range.zMin || envRange.zMax !== range.zMax) {
        return { ok: false, detail: "DEUS_Z_RANGE " + range.label + " read " + JSON.stringify(envRange) + (judged.detail ? "; " + judged.detail : "") };
    }
    if (!judged.ok) return judged;
    return { ok: true, detail: "env " + range.label + " and state; " + judged.detail };
}

function syntheticF01() {
    const fake = {
        zRange: function () { return { zMin: -2, zMax: 2 }; },
        levels: function () { return [-2, -1, 0, 1, 2]; },
        isLevel: function (z) { return z >= -2 && z <= 2; },
        mapIdSlot: function (z) { return z; },
        Space: { GRID_SIZE_FEET: 5, STRATUM_FEET: 1, STRATA_PER_LAYER: 5, Z_STEP_FEET: 5 }
    };
    const judged = judgeF01(fake, null, { label: "-16..+15", zMin: -16, zMax: 15 });
    return { ok: judged.ok === false, detail: judged.ok ? "the 5-level 1 ft model was accepted" : "rejected (" + judged.detail + ")" };
}

// --- F-02. Outer rock is uniform, path scratch follows the route, fluid grids follow writes. ---

function f02(eng, range, mapSize) {
    const World = eng.World;
    const Levels = eng.Levels;
    const problems = [];
    const count = range.zMax - range.zMin + 1;
    if (typeof Levels.chunkInfo !== "function" || typeof Levels.strataMemory !== "function") {
        return { ok: false, detail: "no chunk store (chunkInfo / strataMemory missing)" };
    }
    let below = 0;
    for (let z = range.zMin; z < -2; z++) {
        below++;
        const info = Levels.chunkInfo(0, 0, z);
        if (!info || info.uniform !== info.chunks || info.baselineMixed !== 0 || info.split !== 0) {
            problems.push("z " + z + " not uniform " + JSON.stringify(info && { chunks: info.chunks, uniform: info.uniform, mixed: info.baselineMixed, split: info.split }));
        }
    }
    const mem = Levels.strataMemory(0, 0);
    if (!mem || mem.levels !== count) problems.push("strataMemory levels " + (mem && mem.levels));
    if (mem && mem.dir !== count * 2) problems.push("directory bytes " + (mem && mem.dir) + " want " + (count * 2));
    let mixedLevels = 0;
    if (mem) {
        for (let z = range.zMin; z <= range.zMax; z++) {
            const row = mem.perLevel[z];
            if (!row) { problems.push("no memory row " + z); continue; }
            if (z < -2 && (row.strata !== 0 || row.connectors !== 0 || row.mixedChunks !== 0)) {
                problems.push("z " + z + " holds strata arrays " + row.strata);
            }
            if (row.mixedChunks > 0) mixedLevels++;
        }
    }
    // Five core levels can be mixed. A few cap levels above +2 may be too. Every level mixed is the dense model.
    if (mixedLevels > 8) problems.push("mixed levels " + mixedLevels + " of " + count);
    const path = World.findPath({ x: 0, y: 0, z: 0 }, 1, 1, 2, 1, { z: 0, resolveBlocked: false, maxNodes: 64 });
    const scratch = World.pathScratchStats ? World.pathScratchStats() : null;
    if (!scratch) problems.push("no pathScratchStats (scratch is not bounded per reached layer)");
    else {
        const last = scratch.lastSearchLayers || [];
        if (last.length !== 1 || last[0] !== 0) problems.push("search layers " + last.join(","));
        if (!(scratch.layersAllocated >= 1 && scratch.layersAllocated < count)) {
            problems.push("scratch layers " + scratch.layersAllocated + " of " + count);
        }
        if (!(scratch.bytes < scratch.bytesPerLayer * count)) {
            problems.push("scratch bytes " + scratch.bytes + " per layer " + scratch.bytesPerLayer + " levels " + count);
        }
    }
    if (!path || path.length !== 1) problems.push("path " + (World.lastPath ? World.lastPath.reason : "none"));
    const fluid = fluidGrids(range);
    if (!fluid.ok) problems.push(fluid.detail);
    const detail = problems.join("; ") || (
        "below-core " + below + " uniform; mixed levels " + mixedLevels + "; scratch " +
        (scratch ? scratch.layersAllocated + "/" + count : "?") + "; " + (fluid.detail || "")
    );
    return { ok: problems.length === 0, detail: detail };
}

function fluidSandbox(range) {
    const sandbox = { console: console, performance: { now: function () { return 0; } } };
    trackTimers(sandbox);
    sandbox.window = sandbox;
    sandbox.Game_Map = stubClass({ setup: function () {}, update: function () {} });
    const levels = [];
    for (let z = range.zMin; z <= range.zMax; z++) levels.push(z);
    return { sandbox: sandbox, levels: levels };
}

function fluidGrids(range) {
    const box = fluidSandbox(range);
    const sandbox = box.sandbox;
    const src = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "DEUS_Fluid.js"), "utf8");
    try {
        vm.createContext(sandbox);
        vm.runInContext(src, sandbox, { filename: "DEUS_Fluid.js", timeout: 10000 });
    } catch (e) {
        stopTimers(sandbox);
        return { ok: false, detail: "fluid load " + (e && e.message) };
    }
    const fluid = sandbox.UF && sandbox.UF.Fluid;
    if (!fluid || typeof fluid.depthAt !== "function" || typeof fluid.diagnostics !== "function" || typeof fluid.setCell !== "function") {
        stopTimers(sandbox);
        return { ok: false, detail: "fluid solver missing diagnostics/setCell" };
    }
    sandbox.UF.World = {
        state: { size: 8 },
        zRange: function () { return { zMin: range.zMin, zMax: range.zMax }; }
    };
    try {
        for (let z = range.zMin; z <= range.zMax; z++) fluid.depthAt(0, 0, 1, 1, z);
        const before = fluid.diagnostics();
        fluid.setCell({ x: 0, y: 0 }, 1, 1, range.zMin, "water", 3);
        const after = fluid.diagnostics();
        fluid.depthAt(0, 0, 1, 1, range.zMax);
        const read = fluid.diagnostics();
        const ok = before.gridsAllocated === 0 && after.gridsAllocated === 1 && read.gridsAllocated === 1
            && after.totalWaterVolume === 3;
        return {
            ok: ok,
            detail: "grids before " + before.gridsAllocated + " after write " + after.gridsAllocated + " after read " + read.gridsAllocated + " volume " + after.totalWaterVolume
        };
    } finally {
        stopTimers(sandbox);
    }
}

// --- F-03. Loose stones never become ore, on every z of the range. ---

const ORE_IDS = null; // filled from the fixture in main

function loadEcology(seed, range, oreIds) {
    const src = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "DEUS_Ecology.js"), "utf8");
    const objects = new Map();
    const placed = [];
    const cellKey = function (z, x, y) { return (z | 0) + "," + (x | 0) + "," + (y | 0); };
    const ore = {};
    for (let i = 0; i < oreIds.length; i++) ore[oreIds[i]] = true;
    const O = {
        type: function (id) {
            if (id === ORE_TAG || ore[id]) return { id: id, tags: ["ore", "mineral"] };
            if (id === "granite_boulder" || id === "rocks_small") return { id: id, tags: ["stone"] };
            return { id: id, tags: ["plant"] };
        },
        atIn: function (area, x, y) {
            const id = objects.get(cellKey(area && area.z, x, y));
            return id ? { id: id } : null;
        },
        setIn: function (area, x, y, id) {
            const z = area && area.z ? area.z : 0;
            placed.push({ z: z, x: x, y: y, id: id });
            if (id) objects.set(cellKey(z, x, y), id);
            else objects.delete(cellKey(z, x, y));
            return true;
        },
        isConstructedOrPaved: function () { return false; },
        hourNow: function () { return 0; }
    };
    const levels = levelsOf(range);
    const W = {
        state: { seed: seed, size: 48, areasX: 1, areasY: 1, ecology: null, zRange: { zMin: range.zMin, zMax: range.zMax } },
        currentArea: function () { return { x: 0, y: 0, z: 0 }; },
        walkable: function () { return true; },
        standerAt: function () { return null; },
        units: function () { return []; },
        unitsInArea: function () { return []; },
        isLevel: function (z) { return z >= range.zMin && z <= range.zMax; },
        levels: function () { return levels; },
        zRange: function () { return { zMin: range.zMin, zMax: range.zMax }; },
        levelCount: function () { return levels.length; }
    };
    const sandbox = {
        console: console,
        performance: { now: function () { return 0; } },
        setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval, clearInterval: clearInterval
    };
    sandbox.window = sandbox;
    sandbox.DEUS = { World: W, Objects: O, Events: { on: function () {}, emit: function () {} }, Levels: { shapeAt: function () { return "floor"; }, waterAt: function () { return false; } } };
    sandbox.UF = sandbox.DEUS;
    function Game_Map() {}
    Game_Map.prototype.update = function () {};
    Game_Map.prototype.setup = function () {};
    sandbox.Game_Map = Game_Map;
    sandbox.DataManager = { extractSaveContents: function () {}, makeSaveContents: function () { return { ufWorld: W.state }; } };
    function Scene_Boot() {}
    Scene_Boot.prototype.start = function () {};
    sandbox.Scene_Boot = Scene_Boot;
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: "DEUS_Ecology.js", timeout: 10000 });
    return { E: sandbox.UF.Ecology, O: O, objects: objects, placed: placed, cellKey: cellKey };
}

function oreInDefs(defs, oreIds, range) {
    const hits = [];
    if (!defs) return ["no sproutDefs"];
    const keys = Object.keys(defs);
    for (let k = 0; k < keys.length; k++) {
        const z = Number(keys[k]);
        if (z < range.zMin || z > range.zMax) hits.push("row z " + keys[k] + " outside " + range.label);
        const rows = defs[keys[k]] || [];
        for (let r = 0; r < rows.length; r++) {
            const matures = rows[r].matures || [];
            for (let m = 0; m < matures.length; m++) {
                if (oreIds.indexOf(matures[m]) >= 0 || matures[m] === ORE_TAG) hits.push(keys[k] + ":" + rows[r].sprout + "->" + matures[m]);
            }
        }
    }
    return hits;
}

function f03(range, oreIds) {
    const problems = [];
    if (!(range.zMin <= -2 && range.zMax >= 2)) problems.push("range does not cover the sprout axes  -2..+2");
    const eco = loadEcology(5012, range, oreIds);
    if (!eco.E || typeof eco.E.sproutDefs !== "function" || typeof eco.E.stepBeat !== "function") {
        return { ok: false, detail: "ecology has no sproutDefs/stepBeat" };
    }
    const hits = oreInDefs(eco.E.sproutDefs(), oreIds, range);
    if (hits.length) problems.push("tables " + hits.join(", "));
    const scheduled = oreIds.concat([ORE_TAG]);
    const zs = [range.zMin, 0, range.zMax];
    const st = eco.E.state();
    scheduled.forEach(function (id, i) {
        zs.forEach(function (z, k) {
            eco.O.setIn({ x: 0, y: 0, z: z }, 4 + i, 4 + k, "rocks_small");
            st.sprouts.push({
                id: "legacy_" + id + "_" + z, area: { x: 0, y: 0 }, x: 4 + i, y: 4 + k, z: z,
                sproutType: "rocks_small", matureType: id, createdBeat: 0, matureBeat: 1
            });
        });
    });
    eco.placed.length = 0;
    const matured = eco.E.stepBeat({ force: true });
    const oreWrites = eco.placed.filter(function (p) { return p.id && (oreIds.indexOf(p.id) >= 0 || p.id === ORE_TAG); });
    if (!matured || matured.matured !== 0 || oreWrites.length !== 0) {
        problems.push("scheduled ore matured " + (matured && matured.matured) + " writes " + oreWrites.length);
    }
    const stayed = scheduled.every(function (id, i) {
        return zs.every(function (z, k) { return eco.objects.get(eco.cellKey(z, 4 + i, 4 + k)) === "rocks_small"; });
    });
    if (!stayed) problems.push("loose stone was replaced");
    const rock = loadEcology(3, range, oreIds);
    const rst = rock.E.state();
    rock.O.setIn({ x: 0, y: 0, z: 0 }, 20, 20, "rocks_small");
    rst.sprouts.push({
        id: "legacy_granite", area: { x: 0, y: 0 }, x: 20, y: 20, z: 0,
        sproutType: "rocks_small", matureType: "granite_boulder", createdBeat: 0, matureBeat: 1
    });
    const grew = rock.E.stepBeat({ force: true });
    if (!grew || grew.matured < 1 || rock.objects.get(rock.cellKey(0, 20, 20)) !== "granite_boulder") {
        problems.push("granite did not mature");
    }
    const seeds = [5012, 501201];
    let oreHits = 0;
    let beats = 0;
    for (let s = 0; s < seeds.length; s++) {
        const runEco = loadEcology(seeds[s], range, oreIds);
        for (let b = 0; b < 160; b++) {
            beats++;
            const from = runEco.placed.length;
            runEco.E.stepBeat({ force: true });
            const sprouts = runEco.E.sprouts();
            for (let i = 0; i < sprouts.length; i++) {
                const id = sprouts[i].matureType;
                if (oreIds.indexOf(id) >= 0 || id === ORE_TAG) oreHits++;
                if (sprouts[i].z < range.zMin || sprouts[i].z > range.zMax) oreHits++;
            }
            for (let i = from; i < runEco.placed.length; i++) {
                const id = runEco.placed[i].id;
                if (oreIds.indexOf(id) >= 0 || id === ORE_TAG) oreHits++;
            }
        }
    }
    if (oreHits !== 0) problems.push("long run ore hits " + oreHits);
    return {
        ok: problems.length === 0,
        detail: problems.join("; ") || ("scheduled ore refused at " + zs.join(",") + "; beats " + beats + "; ore hits 0")
    };
}

function syntheticF03(oreIds) {
    const hits = oreInDefs({ 0: [{ sprout: "rocks_small", matures: ["ironstone"], weights: [1] }] }, oreIds, { label: "-16..+15", zMin: -16, zMax: 15 });
    return { ok: hits.length > 0, detail: hits.length ? "rejected (" + hits.join(", ") + ")" : "an ironstone row was accepted" };
}

// --- F-04. Mine, dig, quarry and a wall collapse post balanced mass at z in the range. ---

function placeMu(session, cls, form) {
    let s = 0;
    const list = session.places();
    for (let i = 0; i < list.length; i++) if (list[i].cls === cls && list[i].form === form) s += list[i].mu;
    return s;
}

function jobSandbox(range) {
    const sandbox = engineSandbox();
    const levels = levelsOf(range);
    const ns = {};
    sandbox.DEUS = ns;
    sandbox.UF = ns;
    ns.Events = { on: function () {}, emit: function () {} };
    ns.World = {
        state: { seed: 1, size: 16, areasX: 1, areasY: 1, version: 5, units: {}, zRange: { zMin: range.zMin, zMax: range.zMax } },
        zRange: function () { return { zMin: range.zMin, zMax: range.zMax }; },
        isLevel: function (z) { return z >= range.zMin && z <= range.zMax; },
        levels: function () { return levels; },
        currentArea: function () { return { x: 0, y: 0 }; },
        unit: function () { return null; },
        viewLevel: function () { return { x: 0, y: 0, z: 0 }; }
    };
    ns.Levels = {
        shapeAt: function () { return "solid"; },
        setShape: function () { return true; },
        cellAt: function () { return { material: "stone" }; },
        waterAt: function () { return false; }
    };
    ns.Items = {
        drop: function () { return []; },
        materialOf: function () { return null; },
        get: function () { return null; },
        type: function () { return null; }
    };
    return sandbox;
}

function loadJobs(sandbox) {
    loadScript(sandbox, "DEUS_Jobs.js");
    loadScript(sandbox, "DEUS_Walls.js");
    return { Jobs: sandbox.UF && sandbox.UF.Jobs, Walls: sandbox.UF && sandbox.UF.Walls };
}

function openMatter() {
    const ledgerPath = path.join(ROOT, "game", "js", "sim", "ledger.js");
    const materialsPath = path.join(ROOT, "game", "js", "sim", "materials.js");
    const reclaimPath = path.join(ROOT, "game", "js", "sim", "reclaim.js");
    if (!fs.existsSync(ledgerPath) || !fs.existsSync(materialsPath) || !fs.existsSync(reclaimPath)) return null;
    const ledgerMod = require(ledgerPath);
    const materialsMod = require(materialsPath);
    const reclaimMod = require(reclaimPath);
    const bag = {
        catalogue: JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "sim", "materials.json"), "utf8")),
        masses: JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "sim", "mass_tables.json"), "utf8")),
        interactions: JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "sim", "interactions.json"), "utf8"))
    };
    const ledger = ledgerMod.createLedger();
    const materials = materialsMod.createMaterials(bag);
    const session = reclaimMod.createReclaim({ ledger: ledger, materials: materials, data: bag, strict: true });
    return { ledger: ledger, materials: materials, session: session, install: reclaimMod.install, bag: bag };
}

function installWatched(install, sandbox, session) {
    install(sandbox, session);
    const raw = sandbox.UF.Matter;
    const seen = [];
    sandbox.UF.Matter = {
        note: function (kind, detail) {
            seen.push({
                kind: kind,
                z: detail && detail.at ? detail.at.z : null,
                slices: detail && detail.slices,
                material: detail && (detail.material || detail.elementId)
            });
            return raw.note(kind, detail);
        },
        cover: function (fn) { return raw.cover(fn); },
        covered: function () { return raw.covered(); }
    };
    return seen;
}

function runMine(sandbox, matter, type, z, material) {
    const session = matter.session;
    sandbox.UF.Levels.cellAt = function () { return { material: material === "soil" ? "soil" : "stone" }; };
    const count = material === "soil" ? 4 : 5;
    const reg = session.registerSlice(material, count, "worldgen", { at: { x: 1, y: 1, z: z } });
    if (!reg || reg.ok === false) return { ok: false, detail: material + " register " + JSON.stringify(reg) };
    session.seal();
    const seen = installWatched(matter.install, sandbox, session);
    const beforeSoil = matter.ledger.amount("soil", "strata");
    const beforeMineral = matter.ledger.familyTotal("mineral");
    const slice = matter.materials.massOf(material, "strata", 1);
    const handler = sandbox.UF.Jobs.handler(type);
    if (!handler || typeof handler.apply !== "function") return { ok: false, detail: "no " + type + " handler" };
    const job = { type: type, target: { area: { x: 0, y: 0 }, x: 1, y: 1, z: z } };
    handler.apply(job, { id: 1 });
    const posts = seen.filter(function (s) { return s.kind === "mine" && s.z === z && s.slices === 4 && s.material === (material === "soil" ? "soil" : "limestone"); });
    const cons = session.conserved();
    if (posts.length !== 1) return { ok: false, detail: type + " z " + z + " posts " + JSON.stringify(seen) };
    if (!cons || cons.ok !== true) return { ok: false, detail: type + " z " + z + " not conserved " + (cons && cons.recountMsg) };
    if (matter.ledger.familyTotal("mineral") !== beforeMineral) return { ok: false, detail: type + " z " + z + " mineral changed" };
    if (material === "soil") {
        const stone = matter.ledger.amount("stone", "item");
        if (matter.ledger.amount("soil", "strata") !== beforeSoil || stone !== 0) {
            return { ok: false, detail: "soil dig created stone " + stone };
        }
        return { ok: true, detail: "soil z " + z + " stayed soil" };
    }
    const kept = placeMu(session, "stone", "strata");
    const moved = placeMu(session, "stone", "item") + placeMu(session, "rubble", "strata");
    if (kept !== slice || moved !== slice * 4) {
        return { ok: false, detail: type + " z " + z + " kept " + kept + " moved " + moved + " slice " + slice };
    }
    return { ok: true, detail: type + " z " + z + " 4 slices moved, 1 kept" };
}

function f04(range) {
    const problems = [];
    const notes = [];
    let sandbox = null;
    try {
        sandbox = jobSandbox(range);
        const api = loadJobs(sandbox);
        if (!api.Jobs || typeof api.Jobs.handler !== "function") return { ok: false, detail: "Jobs did not publish" };
        const matter = openMatter();
        if (!matter) return { ok: false, detail: "no ledger/reclaim; mining does not post mass" };
        const cases = [
            ["mine", range.zMin, "limestone"],
            ["mine", 0, "limestone"],
            ["mine", range.zMax, "limestone"],
            ["mine", -1, "soil"],
            ["quarry", range.zMin, "limestone"]
        ];
        for (let i = 0; i < cases.length; i++) {
            const one = openMatter();
            const r = runMine(sandbox, one, cases[i][0], cases[i][1], cases[i][2]);
            if (!r.ok) problems.push(r.detail);
            else notes.push(r.detail);
        }
        const fall = openMatter();
        fall.session.registerSlice("limestone", 1, "worldgen");
        fall.session.registerSlice("wood", 1, "worldgen");
        fall.session.seal();
        const mineL = fall.session.mine("limestone", 1, "jobs:mine");
        const mineW = fall.session.mine("wood", 1, "jobs:chop");
        const built = fall.session.note("build", { elementId: "campfire", count: 1, cause: "jobs:build" });
        if (!api.Walls || typeof api.Walls.collapse !== "function") problems.push("Walls.collapse missing");
        else {
            const seen = installWatched(fall.install, sandbox, fall.session);
            const collapsed = api.Walls.collapse("campfire", 1, "walls:collapse");
            const cons = fall.session.conserved();
            const posted = seen.some(function (s) { return s.kind === "collapse"; });
            if (!mineL.ok || !mineW.ok || !built.ok || !collapsed || collapsed.ok !== true || !posted || !cons.ok) {
                problems.push("collapse " + JSON.stringify(collapsed) + " built " + JSON.stringify(built));
            } else notes.push("campfire collapse conserved");
        }
    } finally {
        if (sandbox) stopTimers(sandbox);
    }
    return { ok: problems.length === 0, detail: problems.join("; ") || notes.join("; ") };
}

// --- F-05. require() publishes the solver, and flood fills do not create water. ---

function loadFluidRequire(src, sandbox) {
    vm.createContext(sandbox);
    const module = { exports: {} };
    const wrapper = "(function (exports, require, module, __filename, __dirname) {\n" + src + "\n})";
    const fn = vm.runInContext(wrapper, sandbox, { filename: "DEUS_Fluid.js", timeout: 10000 });
    fn(module.exports, function () { throw new Error("require refused"); }, module, "DEUS_Fluid.js", ROOT);
    return module.exports;
}

function freshFluidBox() {
    const sandbox = { console: console, performance: { now: function () { return 0; } } };
    trackTimers(sandbox);
    sandbox.window = sandbox;
    function Game_Map() {}
    Game_Map.prototype.update = function () {};
    Game_Map.prototype.setup = function () {};
    sandbox.Game_Map = Game_Map;
    return sandbox;
}

function makeEvents() {
    const names = [];
    const handlers = Object.create(null);
    return {
        names: names,
        on: function (name, fn) {
            names.push(name);
            (handlers[name] = handlers[name] || []).push(fn);
        },
        emit: function (name) {
            const list = handlers[name] || [];
            const args = Array.prototype.slice.call(arguments, 1);
            for (let i = 0; i < list.length; i++) list[i].apply(null, args);
        }
    };
}

function scanWater(fluid, range) {
    let water = 0;
    for (let z = range.zMin; z <= range.zMax; z++) {
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
            if (fluid.typeAt(0, 0, x, y, z) === "water") water += fluid.depthAt(0, 0, x, y, z);
        }
    }
    return water;
}

function f05(range, src) {
    const sandbox = freshFluidBox();
    try {
        const exported = loadFluidRequire(src, sandbox);
        const beforeCore = !!(sandbox.window.UF && sandbox.window.UF.Fluid === exported);
        vm.runInContext("window.DEUS = window.DEUS || {}; window.UF = window.DEUS;", sandbox);
        const afterCore = sandbox.window.UF && sandbox.window.UF.Fluid === exported && sandbox.window.DEUS === sandbox.window.UF;
        if (!beforeCore || !afterCore) {
            return { ok: false, detail: "require bind before " + beforeCore + " after " + !!afterCore };
        }
        const events = makeEvents();
        sandbox.UF.Events = events;
        sandbox.UF.World = {
            state: { size: 8 },
            zRange: function () { return { zMin: range.zMin, zMax: range.zMax }; }
        };
        sandbox.Game_Map.prototype.setup(1);
        const fluid = sandbox.UF.Fluid;
        const legacy = { volume: 0, calls: 0 };
        function via(z) {
            const ns = sandbox.window.UF;
            if (ns && ns.Fluid && typeof ns.Fluid.getFloodGrid === "function") {
                const fg = ns.Fluid.getFloodGrid({ x: 0, y: 0 }, z);
                if (fg) return "solver";
            }
            if (z === -1 || z === -2) { legacy.volume += 7; legacy.calls++; return "legacy"; }
            return "none";
        }
        for (let z = range.zMin; z <= range.zMax; z++) via(z);
        if (legacy.calls !== 0 || scanWater(fluid, range) !== 0) {
            return { ok: false, detail: "flood before place created " + legacy.volume };
        }
        const placed = [[2, 2, 0, 7], [3, 2, 0, 5], [2, 3, 0, 4], [4, 4, 0, 6]];
        let expected = 0;
        for (let i = 0; i < placed.length; i++) {
            fluid.setCell({ x: 0, y: 0 }, placed[i][0], placed[i][1], placed[i][2], "water", placed[i][3]);
            expected += placed[i][3];
        }
        let floodDetail = "";
        for (let z = range.zMin; z <= range.zMax; z++) {
            const how = via(z);
            const now = scanWater(fluid, range);
            if (how !== "solver" || now !== expected || legacy.volume !== 0) {
                floodDetail = "z " + z + " " + how + " volume " + now + " legacy " + legacy.volume;
                break;
            }
        }
        if (floodDetail) return { ok: false, detail: floodDetail };
        const cap = (range.zMax - range.zMin + 1) + 8;
        let steps = 0;
        for (; steps < cap; steps++) {
            fluid.tick(100000);
            const now = scanWater(fluid, range);
            if (now !== expected || fluid.diagnostics().totalWaterVolume !== expected) {
                return { ok: false, detail: "tick " + steps + " volume " + now };
            }
            if (fluid.diagnostics().activeQueueLength === 0) break;
        }
        if (fluid.diagnostics().activeQueueLength !== 0) return { ok: false, detail: "queue still open after " + steps };
        let bottom = 0;
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
            if (fluid.typeAt(0, 0, x, y, range.zMin) === "water") bottom += fluid.depthAt(0, 0, x, y, range.zMin);
        }
        if (bottom !== expected) return { ok: false, detail: "bottom " + bottom + " expected " + expected };
        return { ok: true, detail: "bound before Core; volume " + expected + " across " + (range.zMax - range.zMin + 1) + " layers; bottom " + bottom };
    } finally {
        stopTimers(sandbox);
    }
}

function mutantF05(src) {
    const lines = ["window.DEUS = window.UF = {};", "window.UF = window.DEUS;", "window.DEUS = window.UF;"];
    const missing = lines.filter(function (line) { return src.indexOf(line) < 0; });
    if (missing.length) return { ok: false, detail: "bind lines missing " + missing.join(" | ") };
    let mutant = src;
    for (let i = 0; i < lines.length; i++) mutant = mutant.replace(lines[i], "");
    const sandbox = freshFluidBox();
    try {
        const exported = loadFluidRequire(mutant, sandbox);
        vm.runInContext("window.DEUS = window.DEUS || {}; window.UF = window.DEUS;", sandbox);
        const bound = !!(sandbox.window.UF && sandbox.window.UF.Fluid);
        const ok = exported && typeof exported.tick === "function" && !bound;
        return { ok: ok, detail: ok ? "mutant left window.UF.Fluid unset" : "mutant bound " + bound };
    } finally {
        stopTimers(sandbox);
    }
}

function main() {
    const loaded = readFixture();
    if (!loaded.ok) {
        check("fixture", false, "ranges.json is not the -16..+15 and -4..+4 pair with 2 ft strata");
        console.log("RESULT: FAIL (" + failed + " failed)");
        process.exit(1);
    }
    const fx = loaded.fx;
    console.log("PRE-FIX " + fx.recordedPreFixCommit);
    const oreIds = fx.oreIds.slice();
    const fluidSrc = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "DEUS_Fluid.js"), "utf8");
    run("F-01 rejects the 5-level 1 ft model", syntheticF01);
    run("F-03 rejects an ore sprout row", function () { return syntheticF03(oreIds); });
    run("F-05 mutant bind stays unset", function () { return mutantF05(fluidSrc); });
    for (let i = 0; i < fx.ranges.length; i++) {
        const range = fx.ranges[i];
        let eng = null;
        try {
            eng = loadEngine(range, fx.mapSize);
        } catch (e) {
            check("F-01 " + range.label, false, e && e.message ? e.message : String(e));
            check("F-02 " + range.label, false, e && e.message ? e.message : String(e));
        }
        if (eng) {
            try {
                run("F-01 " + range.label, function () { return f01(eng, range); });
                run("F-02 " + range.label, function () { return f02(eng, range, fx.mapSize); });
            } finally {
                stopTimers(eng.sandbox);
            }
        }
        run("F-03 " + range.label, function () { return f03(range, oreIds); });
        run("F-04 " + range.label, function () { return f04(range); });
        run("F-05 " + range.label, function () { return f05(range, fluidSrc); });
    }
    console.log("RESULT: " + (failed === 0 ? "PASS" : "FAIL") + " (" + failed + " failed)");
    process.exit(failed === 0 ? 0 : 1);
}

main();
