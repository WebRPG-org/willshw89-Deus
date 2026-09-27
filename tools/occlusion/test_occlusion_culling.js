#!/usr/bin/env node
"use strict";

// WG.00.21. The occlusion rule in DEUS_Depth, headless.
// A lower cell is drawn only when every level between the view and it is open,
// and the walk stops at the first opaque surface, inside MaxDepth.
//
//   node tools/occlusion/test_occlusion_culling.js
//   node tools/occlusion/test_occlusion_culling.js --provoke=<check>
//   node tools/occlusion/test_occlusion_culling.js --provoke-all
//
// Exit 0: every check passed, or (with --provoke) the named check failed.
// Exit 1: a check failed, or a provocation did not make its check fail.
// Exit 2: the plugin is not wired (harness).

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const DEPTH = path.join(ROOT, "game", "js", "plugins", "DEUS_Depth.js");
const O = require(DEPTH);

const CHECKS = ["covered_not_drawn", "exposed_drawn", "cost_proportional", "no_full_scan", "switch_and_pan"];
const args = process.argv.slice(2);
const provokeArg = (args.find(a => a.startsWith("--provoke=")) || "").slice("--provoke=".length);
const provokeAll = args.includes("--provoke-all");

function oracle(viewZ, maxDepth, zMin, zMax, bounds, isOpen) {
    const b = O.boundsOf(bounds);
    const keys = new Set();
    let columns = 0;
    let levels = 0;
    for (let y = b.y0; y <= b.y1; y++) {
        for (let x = b.x0; x <= b.x1; x++) {
            columns++;
            if (!isOpen(x, y, viewZ)) continue;
            for (let d = 1; d <= maxDepth; d++) {
                const z = viewZ - d;
                if (z < zMin || z > zMax) break;
                levels++;
                keys.add(z + "," + x + "," + y);
                if (!isOpen(x, y, z)) break;
            }
        }
    }
    return { keys, columns, levels, cells: b.cells };
}

// View z = 2. One shaft at (1, 1): z 2 and z 1 open, z 0 a floor. Every other column is solid.
function holeOpen(x, y, z) {
    if (x === 1 && y === 1) return z === 2 || z === 1;
    return false;
}

function ent(kind, id, x, y, z, tint) {
    return { kind, id, x, y, z, tint: tint == null ? 0xffffff : tint, updates: 0, rendered: false };
}

function holeWorld(provoke) {
    const bounds = { minX: 0, minY: 0, maxX: 4, maxY: 3 };
    return {
        viewZ: 2,
        maxDepth: 2,
        zMin: -16,
        zMax: 15,
        size: 64,
        bounds,
        shapeStamp: 1,
        isOpen: holeOpen,
        provoke: provoke || "",
        units: [
            ent("units", "exposed-unit", 1, 1, 1, 0x112233),
            ent("units", "covered-unit", 3, 1, 1, 0x445566),
            ent("units", "deep-unit", 1, 1, -1, 0xffffff),
            ent("units", "view-unit", 1, 1, 2, 0xffffff)
        ],
        objects: [ent("objects", "exposed-object", 1, 1, 1), ent("objects", "covered-object", 3, 1, 1)],
        items: [ent("items", "exposed-item", 1, 1, 0), ent("items", "covered-item", 3, 2, 0)],
        walls: [ent("walls", "exposed-wall", 1, 1, 0), ent("walls", "covered-wall", 0, 0, 1)],
        ramps: [ent("ramps", "exposed-ramp", 1, 1, 0), ent("ramps", "covered-ramp", 2, 2, 1)],
        effects: [ent("effects", "exposed-effect", 1, 1, 1), ent("effects", "covered-effect", 4, 2, 1)]
    };
}

function byId(world, id) {
    const kinds = ["units", "objects", "items", "walls", "ramps", "effects"];
    for (let k = 0; k < kinds.length; k++) {
        const list = world[kinds[k]];
        for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    }
    return null;
}

function checkCovered(provoke) {
    const world = holeWorld(provoke);
    O.step(world);
    O.step(world);
    O.step(world);
    const coveredIds = ["covered-unit", "covered-object", "covered-item", "covered-wall", "covered-ramp", "covered-effect", "deep-unit"];
    const bad = [];
    for (let i = 0; i < coveredIds.length; i++) {
        const e = byId(world, coveredIds[i]);
        if (!e || e.updates !== 0 || e.rendered) bad.push(coveredIds[i] + " updates " + (e && e.updates) + " rendered " + (e && e.rendered));
    }
    const exposed = byId(world, "exposed-unit");
    if (!exposed || exposed.updates !== 3) bad.push("exposed-unit updates " + (exposed && exposed.updates));
    return { ok: bad.length === 0, detail: bad.join("; ") || "covered entities stayed at 0 updates across 3 frames; exposed-unit updated 3" };
}

function checkExposed(provoke) {
    const world = holeWorld(provoke);
    const before = oracle(world.viewZ, world.maxDepth, world.zMin, world.zMax, world.bounds, world.isOpen);
    const step = O.step(world);
    const got = new Set(step.drawn.map(d => d.z + "," + d.x + "," + d.y + ":" + d.id));
    const wantIds = ["exposed-unit", "exposed-object", "exposed-item", "exposed-wall", "exposed-ramp", "exposed-effect"];
    const bad = [];
    if (step.drawn.length !== wantIds.length) bad.push("drew " + step.drawn.length + " want " + wantIds.length);
    for (let i = 0; i < wantIds.length; i++) {
        const id = wantIds[i];
        const d = step.drawn.find(row => row.id === id);
        const e = byId(world, id);
        if (!d) { bad.push("missing " + id); continue; }
        if (!before.keys.has(d.z + "," + d.x + "," + d.y)) bad.push(id + " not in the oracle");
        if (d.scale !== 1 || d.alpha !== 1 || d.filters !== null) bad.push(id + " scale " + d.scale + " alpha " + d.alpha);
        if (d.tint !== e.tint) bad.push(id + " tint " + d.tint);
        if (!got.has(d.z + "," + d.x + "," + d.y + ":" + id)) bad.push("set " + id);
    }
    const view = byId(world, "view-unit");
    if (!view || view.updates !== 0 || step.drawn.some(d => d.id === "view-unit")) bad.push("viewed level was touched");
    if (step.drawn.some(d => d.id === "covered-unit" || d.id === "deep-unit")) bad.push("a covered entity was drawn");
    return { ok: bad.length === 0, detail: bad.join("; ") || "exposed entities drawn at 1:1 with their own tint; viewed level not in this pass" };
}

function solidInput(zMin, zMax, size, maxDepth, bounds) {
    return {
        viewZ: 0,
        maxDepth: maxDepth,
        zMin,
        zMax,
        size,
        bounds,
        shapeStamp: 1,
        isOpen: function () { return false; },
        provoke: "",
        _cache: null
    };
}

function checkCost(provoke) {
    const bounds = { minX: 2, minY: 3, maxX: 18, maxY: 16 };
    const a = solidInput(-16, 15, 256, 2, bounds);
    const b = solidInput(-2, 2, 256, 2, bounds);
    const big = solidInput(-16, 15, 512, 2, bounds);
    const deep = solidInput(-16, 15, 256, 32, bounds);
    a.provoke = provoke;
    b.provoke = provoke;
    big.provoke = provoke;
    deep.provoke = provoke;
    const pa = O.plan(a);
    const pb = O.plan(b);
    const pBig = O.plan(big);
    const pDeep = O.plan(deep);
    const expect = oracle(0, 2, -16, 15, bounds, function () { return false; });
    const bad = [];
    if (pa.frameVisits !== pb.frameVisits) bad.push("32-layer visits " + pa.frameVisits + " vs 5-layer " + pb.frameVisits);
    if (pa.levelVisits !== 0 || pb.levelVisits !== 0) bad.push("solid level visits " + pa.levelVisits + " / " + pb.levelVisits);
    if (pa.exposedCells !== 0 || pb.exposedCells !== 0) bad.push("solid exposed " + pa.exposedCells);
    if (pa.frameVisits !== expect.cells) bad.push("visits " + pa.frameVisits + " want the bounds " + expect.cells + " not the map");
    if (pBig.frameVisits !== pa.frameVisits) bad.push("a larger map changed the visits (" + pBig.frameVisits + ")");
    if (pDeep.frameVisits !== pa.frameVisits || pDeep.levelVisits !== 0) bad.push("maxDepth 32 on solid visited " + pDeep.frameVisits + " / levels " + pDeep.levelVisits);
    if (pa.fullScans !== 0) bad.push("fullScans " + pa.fullScans);

    const shaftBounds = { minX: 0, minY: 0, maxX: 7, maxY: 7 };
    function shaftOpen(x, y, z) { return x === 3 && y === 3 && z <= 4; }
    const shaft = {
        viewZ: 4, maxDepth: 4, zMin: -16, zMax: 15, size: 64, bounds: shaftBounds, shapeStamp: 7,
        isOpen: shaftOpen, provoke: provoke, _cache: null
    };
    const ps = O.plan(shaft);
    const wantShaft = oracle(4, 4, -16, 15, shaftBounds, shaftOpen);
    if (provoke !== "cost_proportional" && provoke !== "no_full_scan") {
        if (ps.exposedCells !== wantShaft.keys.size) bad.push("shaft exposed " + ps.exposedCells + " want " + wantShaft.keys.size);
        if (ps.levelVisits !== wantShaft.levels) bad.push("shaft level visits " + ps.levelVisits + " want " + wantShaft.levels);
        if (ps.levelVisits > wantShaft.cells * 4) bad.push("shaft walked past maxDepth");
    }
    return { ok: bad.length === 0, detail: bad.join("; ") || "solid 32-layer visits " + pa.frameVisits + " = 5-layer " + pb.frameVisits + " (bounds cells only); shaft level visits " + ps.levelVisits };
}

function checkScan(provoke) {
    const world = holeWorld(provoke);
    const first = O.step(world);
    const second = O.step(world);
    const third = O.step(world);
    const bad = [];
    if (!first.plan.rebuilt || first.plan.frameVisits <= 0) bad.push("first frame did not build (" + first.plan.frameVisits + ")");
    if (second.plan.frameVisits !== 0 || second.plan.fullScans !== 0 || second.plan.rebuilt) bad.push("second frame visits " + second.plan.frameVisits + " fullScans " + second.plan.fullScans + " rebuilt " + second.plan.rebuilt);
    if (third.plan.frameVisits !== 0 || third.plan.fullScans !== 0) bad.push("third frame visits " + third.plan.frameVisits);
    if (second.plan.frameLevelVisits !== 0) bad.push("second frame still walked levels");
    return { ok: bad.length === 0, detail: bad.join("; ") || "steady frames walk 0 cells; fullScans 0" };
}

function checkSwitch(provoke) {
    const world = holeWorld(provoke);
    O.step(world);
    const unit = byId(world, "exposed-unit");
    const afterFirst = unit.updates;
    world.isOpen = function () { return false; };
    world.shapeStamp = 2;
    O.step(world);
    const afterClose = unit.updates;
    world.isOpen = holeOpen;
    world.shapeStamp = 3;
    world.bounds = { minX: 20, minY: 20, maxX: 24, maxY: 23 };
    O.step(world);
    const afterPan = unit.updates;
    world.bounds = { minX: 0, minY: 0, maxX: 4, maxY: 3 };
    world.viewZ = 0;
    world.shapeStamp = 4;
    O.step(world);
    const afterSwitch = unit.updates;
    const bad = [];
    if (afterFirst !== 1) bad.push("first update " + afterFirst);
    if (afterClose !== 1) bad.push("still updated after the cover closed (" + afterClose + ")");
    if (afterPan !== 1) bad.push("still updated after the pan (" + afterPan + ")");
    if (afterSwitch !== 1) bad.push("still updated after the view moved above it (" + afterSwitch + ")");
    if (unit.rendered) bad.push("rendered after the switch");
    return { ok: bad.length === 0, detail: bad.join("; ") || "cover, pan and view change each drop the unit; updates stay 1" };
}

const checks = {
    covered_not_drawn: checkCovered,
    exposed_drawn: checkExposed,
    cost_proportional: checkCost,
    no_full_scan: checkScan,
    switch_and_pan: checkSwitch
};

function wiring() {
    const src = fs.readFileSync(DEPTH, "utf8");
    const problems = [];
    if (O.DEFAULT_MAX_DEPTH !== 2) problems.push("DEFAULT_MAX_DEPTH " + O.DEFAULT_MAX_DEPTH);
    if (src.indexOf("maxDepth: 2") < 0) problems.push("config maxDepth default missing");
    if (src.indexOf("Math.min(2,") < 0) problems.push("MaxDepth clamp missing");
    if (src.indexOf("@default 2") < 0) problems.push("parameter default missing");
    if (src.indexOf("Occlusion.plan") < 0) problems.push("renderer does not call Occlusion.plan");
    if (src.indexOf("cellExposed") < 0) problems.push("renderer has no cellExposed");
    return problems;
}

function runOne(name, provoke) {
    return checks[name](provoke);
}

function main() {
    if (provokeAll && provokeArg) {
        console.error("HARNESS: pass --provoke=name or --provoke-all, not both");
        return 2;
    }
    if (provokeArg && CHECKS.indexOf(provokeArg) < 0) {
        console.error("HARNESS: unknown check " + provokeArg + " (" + CHECKS.join(", ") + ")");
        return 2;
    }
    const wired = wiring();
    if (wired.length && !provokeArg && !provokeAll) {
        console.error("HARNESS: " + wired.join("; "));
        return 2;
    }
    if (provokeAll) {
        let missed = 0;
        for (let i = 0; i < CHECKS.length; i++) {
            const name = CHECKS[i];
            const child = spawnSync(process.execPath, [__filename, "--provoke=" + name], { encoding: "utf8" });
            const out = (child.stdout || "") + (child.stderr || "");
            process.stdout.write(out);
            if (child.status !== 0 || out.indexOf("CAUGHT " + name) < 0) {
                missed++;
                console.log("MISSED " + name + " exit " + child.status);
            }
        }
        console.log(missed ? "RESULT: " + (CHECKS.length - missed) + " provocations caught, " + missed + " missed" : "RESULT: " + CHECKS.length + " provocations caught, 0 missed");
        return missed ? 1 : 0;
    }
    if (provokeArg) {
        const result = runOne(provokeArg, provokeArg);
        if (!result.ok) {
            console.log("CAUGHT " + provokeArg + ": " + result.detail);
            return 0;
        }
        console.log("MISSED " + provokeArg + ": the check still passed (" + result.detail + ")");
        return 1;
    }
    let failed = 0;
    for (let i = 0; i < CHECKS.length; i++) {
        const name = CHECKS[i];
        const result = runOne(name, "");
        if (result.ok) console.log("PASS " + name);
        else { failed++; console.log("FAIL " + name + ": " + result.detail); }
    }
    console.log("RESULT: " + (CHECKS.length - failed) + " passed, " + failed + " failed");
    return failed ? 1 : 0;
}

process.exit(main());
