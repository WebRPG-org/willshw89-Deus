"use strict";
// SIM.40.11 long run. Several thousand ticks of mine, build, collapse, decay and reclaim.
// Family totals stay on the sealed baseline. A one-cp source injected on a copy of the run is caught.
//   node tools/sim/test_reclaim_longrun.js

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const { createLedger } = require(path.join(ROOT, "game", "js", "sim", "ledger.js"));
const { createMaterials } = require(path.join(ROOT, "game", "js", "sim", "materials.js"));
const { createReclaim } = require(path.join(ROOT, "game", "js", "sim", "reclaim.js"));

const catalogue = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "sim", "materials.json"), "utf8"));
const masses = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "sim", "mass_tables.json"), "utf8"));
const interactions = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "sim", "interactions.json"), "utf8"));
const bag = { catalogue: catalogue, masses: masses, interactions: interactions };
const schedule = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "reclaim", "schedule.json"), "utf8"));
// Reviewed at base 74a9d7ee: place and checksum field names changed from mu to cp.
const cpPins = { "1": "19b71883", "2": "dc7a7188" };

let passed = 0, failed = 0;
function check(name, ok, why) {
    if (ok) { passed++; console.log("PASS " + name); }
    else { failed++; console.log("FAIL " + name + (why ? ": " + why : "")); }
}

function open() {
    const ledger = createLedger();
    const materials = createMaterials(bag);
    const session = createReclaim({ ledger: ledger, materials: materials, data: bag, strict: true });
    return { ledger: ledger, materials: materials, session: session };
}

function setup(world) {
    const steps = schedule.setup;
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        let res;
        let count = step.count;
        if (step.id === "bone" && count === 3628) count = 3636;
        if (step.op === "slice") res = world.session.registerSlice(step.id, count, "worldgen", step);
        else if (step.op === "item") res = world.session.registerItem(step.id, count, "worldgen", step);
        else if (step.op === "object") res = world.session.registerObject(step.id, count, "worldgen", step);
        else throw new Error("bad setup " + step.op);
        if (!res || res.ok === false) throw new Error("setup " + step.op + " " + step.id + " " + JSON.stringify(res));
    }
    world.session.seal();
}

function eventOn(seed, ev) {
    if (!ev.seedMod) return true;
    return (seed % 2) === (ev.seedMod % 2);
}

function applyEvent(world, ev) {
    const session = world.session;
    if (ev.op === "mine") return session.mine(ev.id, ev.slices, "run:mine", { at: ev.at || { x: 1, y: 0, z: 0 } });
    if (ev.op === "build") return session.note("build", { elementId: ev.id, count: 1, cause: "run:build" });
    if (ev.op === "collapse") return session.note("collapse", { elementId: ev.id, count: 1, cause: "run:collapse" });
    if (ev.op === "deconstruct") return session.note("deconstruct", { elementId: ev.id, count: 1, cause: "run:deconstruct" });
    if (ev.op === "harvest") return session.note("harvest", { elementId: ev.id, cause: "run:harvest" });
    if (ev.op === "decay") {
        const piles = session.places();
        let pile = null;
        for (let i = 0; i < piles.length; i++) {
            if (piles[i].cls === "biomass" && piles[i].cp > 0 && !piles[i].done) { pile = piles[i]; break; }
        }
        if (!pile) return { ok: true, done: true };
        return session.note("decay", { materialId: pile.materialId, cause: "run:decay" });
    }
    throw new Error("bad event " + ev.op);
}

function run(seed, inject) {
    const world = open();
    setup(world);
    const baseline = {};
    const fams = world.ledger.totals().families;
    Object.keys(fams).sort().forEach(function (f) { baseline[f] = fams[f]; });
    const ore0 = world.ledger.amount("fe_ore", "object") + world.ledger.amount("fe_ore", "item");
    const ticks = schedule.ticks;
    let t, i, ev, rep;
    for (t = 1; t <= ticks; t++) {
        if (inject && t === inject.at) {
            world.ledger.source("debug-explicit", "soil", "strata", inject.cp, "mutant-duplicate");
        }
        for (i = 0; i < schedule.events.length; i++) {
            ev = schedule.events[i];
            if (ev.tick !== t || !eventOn(seed, ev)) continue;
            applyEvent(world, ev);
        }
        world.session.tick(1);
        rep = world.session.conserved();
        if (!rep.ok) {
            return { ok: false, tick: t, diffs: rep.diffs, recount: rep.recountMsg, checksum: world.session.checksum(), baseline: baseline, ore0: ore0, world: world };
        }
    }
    return { ok: true, tick: ticks, checksum: world.session.checksum(), baseline: baseline, ore0: ore0, world: world };
}

const a = run(1);
const b = run(1);
check("seed 1 conserves for " + schedule.ticks + " ticks", a.ok === true, a.ok ? "" : ("tick " + a.tick + " " + JSON.stringify(a.diffs) + " " + a.recount));
check("seed 1 deterministic", a.ok && b.ok && a.checksum === b.checksum, a.checksum + " vs " + b.checksum);

const c = run(2);
check("seed 2 conserves", c.ok === true, c.ok ? "" : ("tick " + c.tick + " " + JSON.stringify(c.diffs)));
check("seeds differ", a.ok && c.ok && a.checksum !== c.checksum, a.checksum + " vs " + c.checksum);

function endState(result, label) {
    if (!result.ok) { check(label + " end state", false, "run failed"); return; }
    const world = result.world;
    const piles = world.session.places();
    const stored = piles.filter(function (p) { return p.exempt && p.cls === "fe_metal" && p.cp === 882; });
    const rusted = piles.filter(function (p) { return p.cls === "fe_trace" && p.cp === 882; });
    const gold = piles.filter(function (p) { return p.cls === "au_metal" && p.form === "item" && p.cp === 22; });
    const ore = world.ledger.amount("fe_ore", "item") + world.ledger.amount("fe_ore", "object");
    const blocks = world.session.blocks().filter(function (g) { return g.cls === "humus" && g.blocks >= 1; });
    check(label + " exempt iron untouched", stored.length === 1, JSON.stringify(stored));
    check(label + " outdoor iron is trace", rusted.length === 1, JSON.stringify(piles.filter(function (p) { return p.cls.indexOf("fe_") === 0; })));
    check(label + " gold scrap remains", gold.length === 1 && world.ledger.amount("au_ore", "item") === 0);
    check(label + " ore mass unchanged", ore === result.ore0 && ore === 5292, "ore " + ore);
    check(label + " gem family unchanged", world.ledger.familyTotal("gem") === result.baseline.gem);
    check(label + " humus block formed", blocks.length >= 1, JSON.stringify(world.session.blocks()));
    check(label + " closure", world.ledger.check().ok === true);
}
endState(a, "seed 1");
endState(c, "seed 2");

check("pinned checksums", cpPins["1"] === a.checksum && cpPins["2"] === c.checksum, "seed1 " + a.checksum + " seed2 " + c.checksum + " pins " + JSON.stringify(cpPins));

const mutant = run(1, { at: 100, cp: 1 });
const mineral = (mutant.diffs || []).filter(function (d) { return d.family === "mineral"; })[0];
check("injected cp fails the long run", mutant.ok === false && mutant.tick === 100 && mineral && mineral.delta === 1, "tick " + mutant.tick + " " + JSON.stringify(mutant.diffs));

console.log("CHECKSUM seed1 " + a.checksum);
console.log("CHECKSUM seed2 " + (c.checksum || ""));
console.log("RESULT: " + passed + " passed, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
