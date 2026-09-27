"use strict";
// SIM.50.02 cross-layer water. Headless, seeded, deterministic.
//   node tools/sim/test_water_dynamics.js
// Runs at -16..+15 and -4..+4. Exit 0 only when every check passes.
// Mutants that must fail: create water, delete evaporation, flood a solid
// cell, full-world scan, ignore permeability, gravity off.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const FIXTURE = path.join(ROOT, "tools", "sim", "fixtures", "water_dynamics", "ranges.json");

let failed = 0;
function check(name, ok, detail) {
    if (ok) console.log("PASS " + name + (detail ? " — " + detail : ""));
    else {
        failed++;
        console.log("FAIL " + name + (detail ? ": " + detail : ""));
    }
}

const live = [];
const _setInterval = global.setInterval;
const _setTimeout = global.setTimeout;
global.setInterval = function (fn, ms) {
    const id = _setInterval(fn, ms);
    live.push(["i", id]);
    return id;
};
global.setTimeout = function (fn, ms) {
    const id = _setTimeout(fn, ms);
    live.push(["t", id]);
    return id;
};
function stopTimers() {
    for (let i = 0; i < live.length; i++) {
        if (live[i][0] === "i") clearInterval(live[i][1]);
        else clearTimeout(live[i][1]);
    }
    live.length = 0;
}

const fx = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const bits = fx.passage;
check("fixture_passage_bits", bits && bits.capacity === 7 && bits.down === 8 && bits.up === 16 && bits.side === 32
    && fx.ranges && fx.ranges.length === 2 && fx.longTicks > 0,
    "capacity " + (bits && bits.capacity) + " down " + (bits && bits.down));

function openShaft() { return bits.capacity | bits.down | bits.up | bits.side; }
function basin() { return bits.capacity | bits.up | bits.side; }
function capPass(cap) { return (cap & 7) | bits.up | bits.side; }

const handlers = Object.create(null);
const events = {
    on: function (name, fn) { (handlers[name] = handlers[name] || []).push(fn); },
    emit: function (name, payload) {
        const list = handlers[name] || [];
        for (let i = 0; i < list.length; i++) list[i](payload);
    }
};
const geom = new Map();
const state = { size: fx.behaviorSize };
const rangeBox = { zMin: -16, zMax: 15 };

global.window = global;
global.DEUS = global.UF = {
    Events: events,
    World: {
        state: state,
        zRange: function () { return { zMin: rangeBox.zMin, zMax: rangeBox.zMax }; }
    },
    Levels: {
        getStrataFluidPassage: function (ax, ay, x, y, z) {
            const g = geom.get((x | 0) + "," + (y | 0) + "," + (z | 0));
            return g ? g.pass : 0;
        },
        dominantMaterial: function (ax, ay, x, y, z) {
            const g = geom.get((x | 0) + "," + (y | 0) + "," + (z | 0));
            return g && g.material ? g.material : "granite";
        }
    }
};

const fluid = require(path.join(ROOT, "game", "js", "plugins", "DEUS_Fluid.js"));
const hydroMod = require(path.join(ROOT, "game", "js", "sim", "hydro", "index.js"));
const { createMaterials } = require(path.join(ROOT, "game", "js", "sim", "materials.js"));
const catalogue = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "sim", "materials.json"), "utf8"));
const mats = createMaterials({ catalogue: catalogue, masses: {}, interactions: {} });

function perm(id) {
    return hydroMod.permOf(mats.material(id));
}

check("require_binds", !!(global.UF && global.UF.Fluid === fluid && typeof fluid.tick === "function"),
    "UF.Fluid is the module export");
const hydro = fluid.hydro();
check("hydro_loaded", !!hydro && typeof hydro.mass === "function" && typeof hydro.defineAquifer === "function",
    hydro ? "session" : "missing");

check("perm_granite_blocks", perm("granite") === 0, "granite " + perm("granite"));
check("perm_soil_seeps", perm("soil") > 0 && perm("soil") < 6, "soil " + perm("soil"));
check("perm_sandstone_seeps", perm("sandstone") > 0 && perm("sandstone") < 6, "sandstone " + perm("sandstone"));
check("perm_air_open", perm("air") === 6, "air " + perm("air"));
check("seep_quantum_blocks", hydroMod.seepQuantum(0, 8) === 0 && hydroMod.seepQuantum(6, 1) === 0
    && hydroMod.seepQuantum(perm("soil"), 1) === (perm("soil") >= 4 ? (perm("soil") >= 5 ? 2 : 1) : 0),
    "soil visit1 " + hydroMod.seepQuantum(perm("soil"), 1));
function badQuantum(p, visit) { return p === 0 ? 1 : hydroMod.seepQuantum(p, visit); }
check("mutant_seep_quantum_fails", badQuantum(0, 4) !== 0 && hydroMod.seepQuantum(0, 4) === 0,
    "mutant " + badQuantum(0, 4));

function ticksNeeded(materialPerm, du) {
    if (hydroMod.seepPeriod(materialPerm) <= 0) return -1;
    let got = 0;
    let visit = 0;
    while (got < du && visit < 1000) {
        visit++;
        const q = hydroMod.seepQuantum(materialPerm, visit);
        if (q > 0) got += Math.min(q, du - got);
    }
    return visit;
}

function install(range, size) {
    rangeBox.zMin = range.zMin;
    rangeBox.zMax = range.zMax;
    state.size = size;
    geom.clear();
    fluid.reset();
    fluid._configure({ _mutantNoGravity: false });
}

function carve(x, y, z, pass, material) {
    geom.set((x | 0) + "," + (y | 0) + "," + (z | 0), { pass: pass, material: material || "air" });
}

function mass() { return hydro.mass(); }

function rockWater() {
    let n = 0;
    for (let z = rangeBox.zMin; z <= rangeBox.zMax; z++) {
        for (let y = 0; y < state.size; y++) {
            for (let x = 0; x < state.size; x++) {
                if ((fluid.fluidCapacityAt(0, 0, x, y, z) | 0) <= 0) n += fluid.depthAt(0, 0, x, y, z) | 0;
            }
        }
    }
    return n;
}

function tickN(n) {
    for (let i = 0; i < n; i++) fluid.tick(512);
}

function untilQuiet(limit) {
    let steps = 0;
    let peakExam = 0;
    let peakProc = 0;
    for (; steps < limit; steps++) {
        fluid.tick(512);
        const c = hydro.cost();
        if (c.examined > peakExam) peakExam = c.examined;
        if (c.processed > peakProc) peakProc = c.processed;
        if (fluid.diagnostics().activeQueueLength === 0) break;
    }
    return {
        steps: steps,
        quiet: fluid.diagnostics().activeQueueLength === 0,
        peakExam: peakExam,
        peakProc: peakProc
    };
}

function tag(range, name) { return name + " " + range.label; }

function carveColumn(x, y, top, bottom, passTop) {
    for (let z = bottom; z <= top; z++) {
        carve(x, y, z, z === bottom ? basin() : openShaft(), "air");
    }
    if (passTop) carve(x, y, top, passTop, "air");
}

function runRange(range) {
    const layers = range.zMax - range.zMin + 1;
    check(tag(range, "layer_count"), layers === range.layers, "layers " + layers);

    install(range, fx.behaviorSize);
    for (let z = range.zMin; z <= range.zMax; z++) fluid.depthAt(0, 0, 1, 1, z);
    const before = fluid.diagnostics();
    check(tag(range, "sparse_read"), before.gridsAllocated === 0, "grids " + before.gridsAllocated);
    carve(1, 1, 0, basin(), "air");
    fluid.setCell({ x: 0, y: 0 }, 1, 1, 0, "water", 3);
    const after = fluid.diagnostics();
    for (let z = range.zMin; z <= range.zMax; z++) fluid.depthAt(0, 0, 2, 2, z);
    const read = fluid.diagnostics();
    check(tag(range, "sparse_one_write"), after.gridsAllocated === 1 && read.gridsAllocated === 1 && after.totalWaterVolume === 3,
        "grids " + after.gridsAllocated + " after read " + read.gridsAllocated + " volume " + after.totalWaterVolume);

    // Seepage: porous plug vs granite, same tick budget. Plug cell stays dry.
    const soilPerm = perm("soil");
    const du = 5;
    const need = ticksNeeded(soilPerm, du);
    install(range, fx.behaviorSize);
    carve(2, 2, 1, basin(), "air");
    carve(2, 2, 0, 0, "soil");
    carve(2, 2, -1, basin(), "air");
    fluid.setCell({ x: 0, y: 0 }, 2, 2, 1, "water", du);
    tickN(need);
    const seepMass = mass();
    check(tag(range, "seepage_porous"),
        fluid.depthAt(0, 0, 2, 2, -1) === du && fluid.depthAt(0, 0, 2, 2, 1) === 0
        && fluid.depthAt(0, 0, 2, 2, 0) === 0 && seepMass.total === du && rockWater() === 0
        && need > 0,
        "ticks " + need + " cave " + fluid.depthAt(0, 0, 2, 2, -1) + " plug " + fluid.depthAt(0, 0, 2, 2, 0)
        + " total " + seepMass.total + " soilPerm " + soilPerm);

    install(range, fx.behaviorSize);
    carve(2, 2, 1, basin(), "air");
    carve(2, 2, 0, 0, "granite");
    carve(2, 2, -1, basin(), "air");
    fluid.setCell({ x: 0, y: 0 }, 2, 2, 1, "water", du);
    tickN(need + 5);
    check(tag(range, "seepage_impermeable"),
        fluid.depthAt(0, 0, 2, 2, 1) === du && fluid.depthAt(0, 0, 2, 2, -1) === 0
        && fluid.depthAt(0, 0, 2, 2, 0) === 0 && mass().total === du && rockWater() === 0,
        "source " + fluid.depthAt(0, 0, 2, 2, 1) + " cave " + fluid.depthAt(0, 0, 2, 2, -1));

    install(range, fx.behaviorSize);
    hydro.configure({ ignorePerm: true });
    carve(2, 2, 1, basin(), "air");
    carve(2, 2, 0, 0, "granite");
    carve(2, 2, -1, basin(), "air");
    fluid.setCell({ x: 0, y: 0 }, 2, 2, 1, "water", du);
    tickN(need + 5);
    check(tag(range, "mutant_ignore_perm_fails"),
        fluid.depthAt(0, 0, 2, 2, 1) !== du && mass().total === du && rockWater() === 0
        && (fluid.depthAt(0, 0, 2, 2, -1) > 0 || mass().aquifers > 0),
        "source " + fluid.depthAt(0, 0, 2, 2, 1) + " cave " + fluid.depthAt(0, 0, 2, 2, -1)
        + " aquifer " + mass().aquifers + " (water left the cell above the granite)");

    const fasterId = perm("sand") > perm("soil") ? "sand" : (perm("sandstone") !== perm("soil") ? "sandstone" : null);
    if (fasterId && perm(fasterId) > 0 && perm(fasterId) < 6) {
        const slowNeed = ticksNeeded(soilPerm, 2);
        const fastNeed = ticksNeeded(perm(fasterId), 2);
        install(range, fx.behaviorSize);
        carve(2, 3, 1, basin(), "air");
        carve(2, 3, 0, 0, fasterId);
        carve(2, 3, -1, basin(), "air");
        fluid.setCell({ x: 0, y: 0 }, 2, 3, 1, "water", 2);
        tickN(fastNeed);
        const fastCave = fluid.depthAt(0, 0, 2, 3, -1);
        check(tag(range, "seepage_by_material"),
            fastNeed < slowNeed && fastCave === 2,
            fasterId + " perm " + perm(fasterId) + " ticks " + fastNeed + " soil ticks " + slowNeed + " cave " + fastCave);
    } else {
        check(tag(range, "seepage_by_material"), false, "no faster porous material than soil");
    }

    // One soil visit does not move du (period 2). The saved visit count makes the next tick move it.
    // A save with that count removed waits another visit, so the resume check would fail.
    function seepOnce() {
        install(range, fx.behaviorSize);
        carve(2, 4, 1, basin(), "air");
        carve(2, 4, 0, 0, "soil");
        carve(2, 4, -1, basin(), "air");
        fluid.setCell({ x: 0, y: 0 }, 2, 4, 1, "water", 1);
        fluid.tick(512);
        return JSON.parse(JSON.stringify(fluid.makeSaveContents()));
    }
    const seepSave = seepOnce();
    const visitKept = !!(seepSave.hydro && Array.isArray(seepSave.hydro.visits) && seepSave.hydro.visits.length > 0)
        && fluid.depthAt(0, 0, 2, 4, 1) === 1;
    fluid.extractSaveContents(seepSave);
    fluid.tick(512);
    check(tag(range, "seep_visit_resumes"),
        visitKept && fluid.depthAt(0, 0, 2, 4, -1) === 1 && fluid.depthAt(0, 0, 2, 4, 1) === 0 && mass().total === 1,
        "cave " + fluid.depthAt(0, 0, 2, 4, -1) + " source " + fluid.depthAt(0, 0, 2, 4, 1));
    const dropped = seepOnce();
    if (dropped.hydro) delete dropped.hydro.visits;
    fluid.extractSaveContents(dropped);
    fluid.tick(512);
    check(tag(range, "mutant_drop_seep_visits_fails"),
        fluid.depthAt(0, 0, 2, 4, 1) === 1 && fluid.depthAt(0, 0, 2, 4, -1) === 0,
        "source " + fluid.depthAt(0, 0, 2, 4, 1) + " cave " + fluid.depthAt(0, 0, 2, 4, -1)
        + " (resume check would fail)");

    // Waterfall through one opening, then a drop across the whole range.
    install(range, fx.behaviorSize);
    carve(4, 1, 0, openShaft(), "air");
    carve(4, 1, -1, basin(), "air");
    fluid.setCell({ x: 0, y: 0 }, 4, 1, 0, "water", 7);
    const fall = untilQuiet(layers * 4 + 20);
    check(tag(range, "waterfall_opening"),
        fall.quiet && fluid.depthAt(0, 0, 4, 1, -1) === 7 && fluid.depthAt(0, 0, 4, 1, 0) === 0
        && mass().total === 7 && rockWater() === 0,
        "quiet " + fall.quiet + " steps " + fall.steps + " bottom " + fluid.depthAt(0, 0, 4, 1, -1));

    install(range, fx.behaviorSize);
    fluid._configure({ _mutantNoGravity: true });
    carve(4, 1, 0, openShaft(), "air");
    carve(4, 1, -1, basin(), "air");
    fluid.setCell({ x: 0, y: 0 }, 4, 1, 0, "water", 7);
    tickN(8);
    check(tag(range, "mutant_no_gravity_waterfall_fails"),
        fluid.depthAt(0, 0, 4, 1, 0) === 7 && fluid.depthAt(0, 0, 4, 1, -1) === 0,
        "top " + fluid.depthAt(0, 0, 4, 1, 0) + " bottom " + fluid.depthAt(0, 0, 4, 1, -1));
    fluid._configure({ _mutantNoGravity: false });

    install(range, fx.behaviorSize);
    carveColumn(4, 4, range.zMax, range.zMin);
    fluid.setCell({ x: 0, y: 0 }, 4, 4, range.zMax, "water", 7);
    const tall = untilQuiet(layers * 4 + 30);
    let mid = 0;
    for (let z = range.zMin + 1; z <= range.zMax; z++) mid += fluid.depthAt(0, 0, 4, 4, z) | 0;
    const grids = fluid.diagnostics().gridsAllocated;
    check(tag(range, "waterfall_range"),
        tall.quiet && fluid.depthAt(0, 0, 4, 4, range.zMin) === 7 && mid === 0
        && mass().total === 7 && rockWater() === 0 && grids === layers,
        "steps " + tall.steps + " bottom " + fluid.depthAt(0, 0, 4, 4, range.zMin) + " mid " + mid + " grids " + grids);

    // Spring stops when the aquifer is empty.
    install(range, fx.behaviorSize);
    carve(2, 2, 0, basin(), "air");
    hydro.defineAquifer("karst", 4);
    hydro.defineSpring({ ax: 0, ay: 0, x: 2, y: 2, z: 0, aquifer: "karst", rate: 1 });
    let springOk = true;
    let springDetail = "";
    for (let i = 0; i < 4; i++) {
        fluid.tick(512);
        if (mass().total !== 4) { springOk = false; springDetail = "tick " + (i + 1) + " total " + mass().total; break; }
    }
    const fed = fluid.depthAt(0, 0, 2, 2, 0);
    const left = hydro.storedAt("karst");
    tickN(6);
    check(tag(range, "spring_stops"),
        springOk && fed === 4 && left === 0 && fluid.depthAt(0, 0, 2, 2, 0) === 4
        && hydro.storedAt("karst") === 0 && mass().total === 4 && rockWater() === 0,
        springDetail || ("depth " + fluid.depthAt(0, 0, 2, 2, 0) + " aquifer " + hydro.storedAt("karst")));

    install(range, fx.behaviorSize);
    hydro.configure({ createWater: true });
    carve(2, 2, 0, basin(), "air");
    hydro.defineAquifer("karst", 3);
    hydro.defineSpring({ ax: 0, ay: 0, x: 2, y: 2, z: 0, aquifer: "karst", rate: 1 });
    tickN(3);
    const created = mass();
    check(tag(range, "mutant_create_water_fails"),
        created.total > 3 && created.aquifers === 3 && created.grid > 0,
        "total " + created.total + " aquifer " + created.aquifers + " grid " + created.grid);

    // Lake fills from the atmosphere, then dries by evaporation.
    install(range, fx.behaviorSize);
    carve(3, 3, 0, basin(), "air");
    hydro.defineLake({ id: "pond", evap: 0, cells: [{ ax: 0, ay: 0, x: 3, y: 3, z: 0 }] });
    hydro.seedAtmosphere(9);
    hydro.setSeasonInput(function () { return { precipitation: 3 }; });
    tickN(3);
    const filled = mass();
    check(tag(range, "lake_fills"),
        fluid.depthAt(0, 0, 3, 3, 0) === 7 && filled.atmosphere === 2 && filled.total === 9 && rockWater() === 0,
        "depth " + fluid.depthAt(0, 0, 3, 3, 0) + " atmo " + filled.atmosphere + " total " + filled.total);
    hydro.setEvap("pond", 1);
    hydro.setSeasonInput(function () { return { precipitation: 0 }; });
    tickN(7);
    const dried = mass();
    check(tag(range, "lake_dries_evap"),
        fluid.depthAt(0, 0, 3, 3, 0) === 0 && dried.atmosphere === 9 && dried.total === 9 && rockWater() === 0,
        "depth " + fluid.depthAt(0, 0, 3, 3, 0) + " atmo " + dried.atmosphere);

    install(range, fx.behaviorSize);
    hydro.configure({ deleteEvap: true });
    carve(3, 3, 0, basin(), "air");
    hydro.defineLake({ id: "pond", evap: 1, cells: [{ ax: 0, ay: 0, x: 3, y: 3, z: 0 }] });
    hydro.setSeasonInput(function () { return { precipitation: 0 }; });
    fluid.setCell({ x: 0, y: 0 }, 3, 3, 0, "water", 4);
    fluid.tick(512);
    const deleted = mass();
    check(tag(range, "mutant_delete_evap_fails"),
        deleted.total === 3 && deleted.atmosphere === 0 && fluid.depthAt(0, 0, 3, 3, 0) === 3,
        "total " + deleted.total + " atmo " + deleted.atmosphere + " depth " + fluid.depthAt(0, 0, 3, 3, 0));

    // Infiltration through a porous column into a counted aquifer. Plugs stay dry.
    install(range, fx.behaviorSize);
    carve(5, 5, 0, basin(), "air");
    for (let z = range.zMin; z <= -1; z++) carve(5, 5, z, 0, "soil");
    fluid.setCell({ x: 0, y: 0 }, 5, 5, 0, "water", 6);
    const infilNeed = ticksNeeded(soilPerm, 6);
    tickN(infilNeed);
    const infil = mass();
    let plugWet = 0;
    for (let z = range.zMin; z <= -1; z++) plugWet += fluid.depthAt(0, 0, 5, 5, z) | 0;
    check(tag(range, "lake_dries_infiltration"),
        fluid.depthAt(0, 0, 5, 5, 0) === 0 && plugWet === 0 && infil.grid === 0
        && infil.aquifers === 6 && infil.total === 6 && rockWater() === 0 && infilNeed > 0,
        "ticks " + infilNeed + " grid " + infil.grid + " aquifer " + infil.aquifers + " plugs " + plugWet);

    // Flood when one cell cannot hold the inflow. Excess stays in the atmosphere.
    install(range, fx.behaviorSize);
    carve(6, 6, 0, basin(), "air");
    carve(7, 6, 0, basin(), "air");
    hydro.defineLake({ id: "flood", evap: 0, cells: [{ ax: 0, ay: 0, x: 6, y: 6, z: 0 }] });
    hydro.seedAtmosphere(20);
    let shot = 1;
    hydro.setSeasonInput(function () {
        if (shot <= 0) return { precipitation: 0 };
        shot--;
        return { precipitation: 20 };
    });
    fluid.tick(512);
    const flood = mass();
    check(tag(range, "flood_lateral"),
        fluid.depthAt(0, 0, 6, 6, 0) === 7 && fluid.depthAt(0, 0, 7, 6, 0) === 7
        && flood.atmosphere === 6 && flood.total === 20 && rockWater() === 0,
        "a " + fluid.depthAt(0, 0, 6, 6, 0) + " b " + fluid.depthAt(0, 0, 7, 6, 0) + " atmo " + flood.atmosphere);

    install(range, fx.behaviorSize);
    carve(6, 1, 0, basin(), "air");
    carve(6, 1, 1, basin(), "air");
    hydro.defineLake({ id: "rise", evap: 0, cells: [{ ax: 0, ay: 0, x: 6, y: 1, z: 0 }] });
    hydro.seedAtmosphere(10);
    let upShot = 1;
    hydro.setSeasonInput(function () {
        if (upShot <= 0) return { precipitation: 0 };
        upShot--;
        return { precipitation: 10 };
    });
    fluid.tick(512);
    const rose = mass();
    check(tag(range, "flood_up_layer"),
        fluid.depthAt(0, 0, 6, 1, 0) === 7 && fluid.depthAt(0, 0, 6, 1, 1) === 3
        && rose.atmosphere === 0 && rose.total === 10 && rockWater() === 0,
        "low " + fluid.depthAt(0, 0, 6, 1, 0) + " high " + fluid.depthAt(0, 0, 6, 1, 1));

    install(range, fx.behaviorSize);
    hydro.defineLake({ id: "rock", evap: 0, cells: [{ ax: 0, ay: 0, x: 1, y: 1, z: 0 }] });
    hydro.seedAtmosphere(4);
    hydro.setSeasonInput(function () { return { precipitation: 4 }; });
    fluid.tick(512);
    check(tag(range, "flood_refuses_solid"),
        rockWater() === 0 && fluid.depthAt(0, 0, 1, 1, 0) === 0 && mass().atmosphere === 4 && mass().total === 4,
        "rock " + rockWater() + " atmo " + mass().atmosphere);

    install(range, fx.behaviorSize);
    hydro.configure({ floodSolid: true });
    hydro.defineLake({ id: "rock", evap: 0, cells: [{ ax: 0, ay: 0, x: 1, y: 1, z: 0 }] });
    hydro.seedAtmosphere(4);
    hydro.setSeasonInput(function () { return { precipitation: 4 }; });
    fluid.tick(512);
    check(tag(range, "mutant_flood_solid_fails"),
        rockWater() > 0,
        "rock " + rockWater() + " (solid-cell check would fail)");

    // Lava is not water and does not seep.
    install(range, fx.behaviorSize);
    carve(1, 2, 0, basin(), "air");
    carve(1, 2, -1, 0, "soil");
    carve(1, 2, -2, basin(), "air");
    fluid.setCell({ x: 0, y: 0 }, 1, 2, 0, "lava", 4);
    tickN(need + 2);
    check(tag(range, "lava_not_seeped"),
        fluid.depthAt(0, 0, 1, 2, 0) === 4 && fluid.typeAt(0, 0, 1, 2, 0) === "lava"
        && fluid.depthAt(0, 0, 1, 2, -2) === 0 && mass().total === 0
        && fluid.diagnostics().totalLavaVolume === 4,
        "lava " + fluid.depthAt(0, 0, 1, 2, 0) + " cave " + fluid.depthAt(0, 0, 1, 2, -2));

    // Capacity shrink. Leftover du is counted, not dropped.
    install(range, fx.behaviorSize);
    carve(3, 4, range.zMax, basin(), "air");
    fluid.setCell({ x: 0, y: 0 }, 3, 4, range.zMax, "water", 7);
    carve(3, 4, range.zMax, capPass(2), "air");
    events.emit("levels:cellChanged", { area: { x: 0, y: 0 }, x: 3, y: 4, z: range.zMax });
    const disp = mass();
    check(tag(range, "displaced_counted"),
        fluid.depthAt(0, 0, 3, 4, range.zMax) === 2 && disp.displaced === 5 && disp.total === 7 && rockWater() === 0,
        "depth " + fluid.depthAt(0, 0, 3, 4, range.zMax) + " displaced " + disp.displaced + " total " + disp.total);

    // Old saves: records only. A hydro blob round-trips. The season function does not.
    install(range, fx.behaviorSize);
    fluid.extractSaveContents([[0, 0, 0, 2, 2, 1, 5]]);
    check(tag(range, "old_save_array"),
        fluid.depthAt(0, 0, 2, 2, 0) === 5 && mass().total === 5 && mass().atmosphere === 0 && mass().aquifers === 0,
        "depth " + fluid.depthAt(0, 0, 2, 2, 0) + " total " + mass().total);

    install(range, fx.behaviorSize);
    fluid.extractSaveContents({ fluidSchemaVersion: 1, records: [[0, 0, 0, 1, 1, 1, 4]] });
    check(tag(range, "old_save_object"),
        fluid.depthAt(0, 0, 1, 1, 0) === 4 && mass().total === 4 && !fluid.makeSaveContents().hydro,
        "depth " + fluid.depthAt(0, 0, 1, 1, 0));

    install(range, fx.behaviorSize);
    carve(3, 3, 0, basin(), "air");
    carve(2, 2, 0, basin(), "air");
    hydro.defineAquifer("karst", 6);
    hydro.defineSpring({ ax: 0, ay: 0, x: 2, y: 2, z: 0, aquifer: "karst", rate: 1 });
    hydro.defineLake({ id: "pond", evap: 1, cells: [{ ax: 0, ay: 0, x: 3, y: 3, z: 0 }] });
    hydro.seedAtmosphere(3);
    fluid.setCell({ x: 0, y: 0 }, 3, 3, 0, "water", 2);
    const beforeSave = mass();
    const saved = JSON.parse(JSON.stringify(fluid.makeSaveContents()));
    const recordOk = saved.fluidSchemaVersion === 1 && Array.isArray(saved.records)
        && saved.records.some(function (r) { return r.length === 7 && r[2] === 0 && r[3] === 3 && r[4] === 3 && r[5] === 1 && r[6] === 2; })
        && saved.hydro && saved.hydro.atmosphere === 3;
    fluid.extractSaveContents(saved);
    const afterLoad = mass();
    check(tag(range, "save_roundtrip"),
        recordOk && afterLoad.total === beforeSave.total && afterLoad.aquifers === 6 && afterLoad.atmosphere === 3
        && fluid.depthAt(0, 0, 3, 3, 0) === 2,
        "before " + beforeSave.total + " after " + afterLoad.total + " version " + saved.fluidSchemaVersion);

    install(range, fx.behaviorSize);
    carve(3, 3, 0, basin(), "air");
    hydro.defineLake({ id: "pond", evap: 0, cells: [{ ax: 0, ay: 0, x: 3, y: 3, z: 0 }] });
    hydro.seedAtmosphere(5);
    hydro.setSeasonInput(function () { return { precipitation: 5 }; });
    const withSeason = fluid.makeSaveContents();
    fluid.extractSaveContents(JSON.parse(JSON.stringify(withSeason)));
    fluid.tick(512);
    check(tag(range, "season_not_saved"),
        mass().atmosphere === 5 && fluid.depthAt(0, 0, 3, 3, 0) === 0,
        "atmo " + mass().atmosphere + " depth " + fluid.depthAt(0, 0, 3, 3, 0)
        + " (default precipitation is 0; DEC-026 not chosen)");

    // Closed system. Tick-counted precipitation is a test driver, not a calendar.
    function runClosed() {
        install(range, fx.behaviorSize);
        carve(1, 1, 1, openShaft(), "air");
        carve(1, 1, 0, basin(), "air");
        hydro.defineAquifer("gw", 8);
        hydro.defineSpring({ ax: 0, ay: 0, x: 1, y: 1, z: 1, aquifer: "gw", rate: 1 });
        carve(2, 2, 0, basin(), "air");
        for (let z = range.zMin; z <= -1; z++) carve(2, 2, z, 0, "soil");
        fluid.setCell({ x: 0, y: 0 }, 2, 2, 0, "water", 5);
        carve(3, 3, 0, basin(), "air");
        carve(4, 3, 0, basin(), "air");
        hydro.defineLake({
            id: "basin",
            evap: 1,
            cells: [{ ax: 0, ay: 0, x: 3, y: 3, z: 0 }]
        });
        hydro.seedAtmosphere(12);
        hydro.setSeasonInput(function (ctx) {
            const wet = ctx && ((ctx.tick % 20) < 5);
            return { precipitation: wet ? 1 : 0 };
        });
        const start = mass().total;
        let bad = "";
        const full = fx.behaviorSize * fx.behaviorSize * layers;
        for (let i = 0; i < fx.longTicks; i++) {
            fluid.tick(512);
            const m = mass();
            const c = hydro.cost();
            if (m.total !== start || rockWater() !== 0 || c.examined >= full || c.processed >= full) {
                bad = "tick " + (i + 1) + " total " + m.total + " rock " + rockWater()
                    + " examined " + c.examined + " processed " + c.processed + " full " + full;
                break;
            }
        }
        const sigCells = [];
        for (let z = range.zMin; z <= range.zMax; z++) {
            for (let y = 0; y < fx.behaviorSize; y++) {
                for (let x = 0; x < fx.behaviorSize; x++) {
                    const d = fluid.depthAt(0, 0, x, y, z) | 0;
                    if (d > 0) sigCells.push([x, y, z, fluid.typeAt(0, 0, x, y, z), d]);
                }
            }
        }
        return { ok: bad === "" && start === 25, detail: bad || ("checkpoints " + fx.longTicks + " total " + start), sig: JSON.stringify({ cells: sigCells, mass: mass() }) };
    }
    const longA = runClosed();
    const longB = runClosed();
    check(tag(range, "mass_checkpoints"), longA.ok && longB.ok && longA.sig === longB.sig,
        longA.ok && longB.ok ? longA.detail + " sigMatch " + (longA.sig === longB.sig) : (longA.detail + " | " + longB.detail));

    // Per-tick cost. The 32-layer world uses the large map.
    const costSize = layers === 32 ? fx.costSize : fx.behaviorSize;
    install(range, costSize);
    const full = costSize * costSize * layers;
    carveColumn(4, 4, range.zMax, range.zMin);
    fluid.setCell({ x: 0, y: 0 }, 4, 4, range.zMax, "water", 7);
    const active = untilQuiet(layers * 4 + 30);
    const settledProc = fluid.tick(512);
    const settled = hydro.cost();
    const settledQueue = fluid.diagnostics().activeQueueLength;
    const costBottom = fluid.depthAt(0, 0, 4, 4, range.zMin);
    check(tag(range, "cost_bound"),
        active.quiet && active.peakProc > 0 && active.peakProc < full && active.peakExam < full
        && settledProc === 0 && settled.examined === 0 && settled.processed === 0 && settledQueue === 0
        && rockWater() === 0 && mass().total === 7 && costBottom === 7,
        "activeExamined " + active.peakExam + " activeProcessed " + active.peakProc
        + " settledExamined " + settled.examined + " settledProcessed " + settled.processed
        + " steps " + active.steps + " bottom " + costBottom
        + " full " + full + " size " + costSize + " layers " + layers);
    if (layers === 32 && costSize === 32) {
        console.log("COST-32 activeExamined " + active.peakExam + " activeProcessed " + active.peakProc
            + " settledExamined " + settled.examined + " settledProcessed " + settled.processed
            + " steps " + active.steps + " bottom " + costBottom
            + " full " + full + " grids " + fluid.diagnostics().gridsAllocated);
    }

    install(range, costSize);
    hydro.configure({ fullScan: true });
    fluid.tick(512);
    const scanned = hydro.cost();
    check(tag(range, "mutant_full_scan_fails"),
        scanned.examined >= full,
        "examined " + scanned.examined + " full " + full + " (cost bound would fail)");
}

check("season_default_zero", hydroMod.defaultSeason().precipitation === 0, "precipitation 0");

for (let i = 0; i < fx.ranges.length; i++) runRange(fx.ranges[i]);

stopTimers();
console.log("RESULT: " + (failed === 0 ? "PASS" : "FAIL") + " (" + failed + " failed)");
process.exit(failed === 0 ? 0 : 1);
