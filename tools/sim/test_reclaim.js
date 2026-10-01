"use strict";
// SIM.40.11 reclaim and ledger-post tests.
//   node tools/sim/test_reclaim.js
// Exit 0 only when every check passes. A mutated copy of reclaim.js must fail.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const { createLedger } = require(path.join(ROOT, "game", "js", "sim", "ledger.js"));
const { createMaterials } = require(path.join(ROOT, "game", "js", "sim", "materials.js"));
const { createReclaim } = require(path.join(ROOT, "game", "js", "sim", "reclaim.js"));

const catalogue = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "sim", "materials.json"), "utf8"));
const masses = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "sim", "mass_tables.json"), "utf8"));
const interactions = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "sim", "interactions.json"), "utf8"));
const ledgerDefaults = require(path.join(ROOT, "game", "js", "sim", "ledger_defaults.js"));
const bag = { catalogue: catalogue, masses: masses, interactions: interactions };
function adaptForReclaim(raw) {
    const b = JSON.parse(JSON.stringify(raw));
    for (const id of Object.keys(b.masses.objects || {})) {
        const o = b.masses.objects[id];
        if (o.massCp != null && o.massMu == null) o.massMu = o.massCp;
        if (o.lines) for (const ln of o.lines) if (ln.cp != null && ln.mu == null) ln.mu = ln.cp;
        if (o.bill) for (const bl of o.bill) if (bl.cp != null && bl.mu == null) bl.mu = bl.cp;
        if (o.yield && o.yield.postings) for (const p of o.yield.postings) if (p.cp != null && p.mu == null) p.mu = p.cp;
        if (o.collapse && o.collapse.postings) for (const p of o.collapse.postings) if (p.cp != null && p.mu == null) p.mu = p.cp;
    }
    for (const id of Object.keys(b.masses.items || {})) {
        const it = b.masses.items[id];
        if (it.massCp != null && it.massMu == null) it.massMu = it.massCp;
    }
    return b;
}
const reclaimBag = adaptForReclaim(bag);
const SRC = fs.readFileSync(path.join(ROOT, "game", "js", "sim", "reclaim.js"), "utf8").replace(/\r\n/g, "\n");

let passed = 0, failed = 0;
function check(name, ok, why) {
    if (ok) { passed++; console.log("PASS " + name); }
    else { failed++; console.log("FAIL " + name + (why ? ": " + why : "")); }
}
function loadReclaim(src) {
    const ctx = vm.createContext({});
    vm.runInContext("Math.random = function () { throw new Error('RANDOM'); };", ctx);
    const module = { exports: {} };
    const fn = vm.runInContext("(function (module, exports) {\n" + src + "\n})", ctx, { filename: "reclaim.js" });
    fn(module, module.exports);
    return module.exports;
}
function open() {
    const ledger = createLedger();
    const materials = createMaterials(bag);
    const session = createReclaim({ ledger: ledger, materials: materials, data: reclaimBag, strict: true });
    return { ledger: ledger, materials: materials, session: session };
}
function codeOf(fn) {
    try { fn(); return ""; }
    catch (e) { return e.code || ""; }
}
function placeMu(session, cls, form) {
    let s = 0;
    const list = session.places();
    for (let i = 0; i < list.length; i++) if (list[i].cls === cls && list[i].form === form) s += list[i].mu;
    return s;
}

const api = createMaterials(bag);
check("catalogue validates", api.validate(bag, ledgerDefaults).length === 0, api.validate(bag, ledgerDefaults).slice(0, 4).join(" | "));
check("reclaim has no host calls", !/\brequire\s*\(|\bDate\b|\bMath\.random\b|\bconsole\b/.test(SRC));
check("vm load", typeof loadReclaim(SRC).createReclaim === "function");

{
    const w = open();
    w.session.registerSlice("limestone", 5, "worldgen");
    w.session.seal();
    const before = w.ledger.familyTotal("mineral");
    const slice = w.materials.massOf("limestone", "strata", 1);
    const r = w.session.mine("limestone", 4, "jobs:mine", { legacyYields: { stone: 2 }, at: { x: 3, y: 4, z: 0 } });
    const kept = placeMu(w.session, "stone", "strata");
    const items = placeMu(w.session, "stone", "item");
    const rubble = placeMu(w.session, "rubble", "strata");
    check("mine four slices", r && r.ok === true && w.session.conserved().ok && w.ledger.check().ok, JSON.stringify(r));
    check("mine keeps one floor slice", kept === slice, "kept " + kept + " slice " + slice);
    check("mine posts the slice mass", items + rubble === slice * 4, "items " + items + " rubble " + rubble);
    check("legacy two stone is not the ledger mass", items !== 2 * 15000);
    check("mine family constant", w.ledger.familyTotal("mineral") === before && before > 0);
}

{
    const w = open();
    w.session.registerSlice("soil", 4, "worldgen");
    w.session.seal();
    const before = w.ledger.amount("soil", "strata");
    const r = w.session.mine("soil", 4, "jobs:mine", { legacyYields: { stone: 1 } });
    check("soil mine stays soil", r && r.ok === true && w.ledger.amount("soil", "strata") === before && w.ledger.amount("stone", "item") === 0 && w.session.conserved().ok, JSON.stringify(r));
}

{
    const w = open();
    w.session.registerSlice("limestone", 1, "worldgen");
    w.session.registerSlice("wood", 1, "worldgen");
    w.session.seal();
    const mineL = w.session.mine("limestone", 1, "jobs:mine");
    const mineW = w.session.mine("wood", 1, "jobs:chop");
    const built = w.session.note("build", { elementId: "campfire", count: 1, cause: "jobs:build" });
    const afterBuild = w.session.conserved();
    const collapsed = w.session.note("collapse", { elementId: "campfire", count: 1, cause: "walls:collapse" });
    check("build campfire", mineL.ok && mineW.ok && built.ok && afterBuild.ok, JSON.stringify(built));
    check("collapse campfire", collapsed.ok && w.session.conserved().ok, JSON.stringify(collapsed) + " " + w.session.conserved().recountMsg);
}

{
    const w = open();
    w.session.registerObject("wall_wood", 1, "worldgen");
    w.session.seal();
    const r = w.session.note("deconstruct", { elementId: "wall_wood", count: 1, cause: "objects:remove" });
    check("deconstruct wall", r.ok && placeMu(w.session, "wood", "item") === 1764 && placeMu(w.session, "wood", "object") === 0 && w.session.conserved().ok, JSON.stringify(r));
}

{
    const w = open();
    w.session.registerObject("ironstone", 1, "worldgen");
    w.session.seal();
    const ore = w.ledger.familyTotal("fe");
    const r = w.session.note("harvest", { elementId: "ironstone", cause: "objects:mine" });
    w.session.tick(40);
    check("ore harvest keeps the gram", r.ok && w.ledger.familyTotal("fe") === ore && w.ledger.amount("fe_ore", "item") === 5292 && w.ledger.amount("fe_ore", "object") === 0 && w.session.conserved().ok, JSON.stringify(r) + " " + w.session.conserved().recountMsg);
}

{
    const w = open();
    const openWorld = w.session.note("object", { phase: "before", toId: "ironstone", fromId: null, cause: "worldgen" });
    w.session.registerSlice("limestone", 1, "worldgen");
    w.session.seal();
    const sealed = w.session.note("object", { phase: "before", toId: "ironstone", fromId: "rocks_small", cause: "ecology:mature" });
    check("unsealed ore placement is registration phase", openWorld.ok === true && openWorld.refuse !== true);
    check("sealed ore placement is refused", sealed.refuse === true && sealed.code === "E_ORE_OUTPUT" && w.session.conserved().ok, JSON.stringify(sealed));
}

{
    const w = open();
    w.session.registerItem("gold", 1, "worldgen");
    w.session.registerItem("bar_iron", 1, "worldgen", { exempt: true, at: { x: 0, y: 0, z: 0 } });
    w.session.registerItem("bar_iron", 1, "worldgen", { exempt: false, at: { x: 2, y: 0, z: 0 } });
    w.session.registerItem("gem_rough", 1, "worldgen");
    w.session.seal();
    const au = w.ledger.familyTotal("au");
    const fe = w.ledger.familyTotal("fe");
    const gem = w.ledger.familyTotal("gem");
    w.session.tick(12);
    const piles = w.session.places();
    const stored = piles.filter(function (p) { return p.exempt && p.cls === "fe_metal"; });
    const rusted = piles.filter(function (p) { return p.cls === "fe_trace"; });
    const gold = piles.filter(function (p) { return p.cls === "au_metal" && p.form === "item"; });
    check("exempt iron stays metal", stored.length === 1 && stored[0].mu === 882 && rusted.length === 1 && rusted[0].mu === 882, JSON.stringify(piles));
    check("gold stays scrap", gold.length === 1 && gold[0].mu === 22 && w.ledger.amount("au_ore", "item") === 0);
    check("finite families constant", w.ledger.familyTotal("au") === au && w.ledger.familyTotal("fe") === fe && w.ledger.familyTotal("gem") === gem && w.session.conserved().ok);
}

{
    const w = open();
    w.session.registerItem("bone", 3636, "worldgen", { at: { x: 5, y: 5, z: 0 } });
    w.session.seal();
    const organic = w.ledger.familyTotal("organic");
    const mat = w.session.places()[0].materialId;
    let guard = 0, last;
    while (guard < 8 && w.session.places().some(function (p) { return p.mu > 0 && !p.done && p.cls === "biomass"; })) {
        last = w.session.note("decay", { materialId: mat, cause: "decay:bone" });
        guard++;
    }
    const blocks = w.session.blocks().filter(function (b) { return b.cls === "humus" && b.x === 5; });
    check("bone rots to one humus block", guard >= 1 && last && last.ok !== false && blocks.length === 1 && blocks[0].blocks === 1 && blocks[0].remainder === (3636 * 110 - 399919), JSON.stringify(last) + " " + JSON.stringify(blocks));
    check("bone family constant", w.ledger.familyTotal("organic") === organic && w.session.conserved().ok);
}

{
    const w = open();
    w.session.registerSlice("rubble", 2, "worldgen", { outdoor: true, exempt: false });
    w.session.seal();
    const mineral = w.ledger.familyTotal("mineral");
    w.session.tick(8);
    const stone = w.session.places().filter(function (p) { return p.cls === "stone" && p.form === "strata" && p.done; });
    check("rubble reclaims to stone", stone.length === 1 && stone[0].mu === w.materials.massOf("rubble", "strata", 2) && w.ledger.familyTotal("mineral") === mineral && w.session.conserved().ok, JSON.stringify(w.session.places()));
}

{
    const w = open();
    w.session.registerSlice("wood", 1, "worldgen");
    w.session.seal();
    const organic = w.ledger.familyTotal("organic");
    w.session.mine("wood", 1, "jobs:chop", { at: { x: 1, y: 1, z: 0 } });
    w.session.tick(6);
    const humus = placeMu(w.session, "humus", "strata");
    check("wood reclaim reaches humus", humus > 0 && w.ledger.familyTotal("organic") === organic && w.session.conserved().ok, "humus " + humus);
}

{
    const w = open();
    w.session.registerSlice("limestone", 1, "worldgen");
    w.session.seal();
    w.session.mine("limestone", 1, "jobs:mine");
    const snap = w.session.snapshot();
    const sum = w.session.checksum();
    w.session.tick(3);
    w.session.restore(snap);
    check("snapshot restore", w.session.checksum() === sum && w.session.conserved().ok);
    const bad = w.session.snapshot();
    bad.places[0].mu += 1;
    w.session.restore(bad);
    check("tampered place fails recount", w.session.conserved().ok === false);
    w.session.restore(snap);
    check("good snapshot again", w.session.checksum() === sum && w.session.conserved().ok);
}

{
    const w = open();
    w.session.registerSlice("limestone", 1, "worldgen");
    w.session.seal();
    w.ledger.source("debug-explicit", "soil", "strata", 1, "inject-duplicate");
    const drift = w.session.conserved();
    const mineral = drift.diffs.filter(function (d) { return d.family === "mineral"; })[0];
    check("duplicated gram is caught", drift.ok === false && mineral && mineral.delta === 1, JSON.stringify(drift.diffs));
}
{
    const w = open();
    w.session.registerHolding("soil", "strata", 10, "worldgen", { materialId: "soil", pathId: "soil", exempt: true });
    w.session.seal();
    w.ledger.sink("debug-explicit", "soil", "strata", 1, "inject-leak");
    const drift = w.session.conserved();
    const mineral = drift.diffs.filter(function (d) { return d.family === "mineral"; })[0];
    check("leaked gram is caught", drift.ok === false && mineral && mineral.delta === -1, JSON.stringify(drift.diffs));
}

{
    const w = open();
    w.session.registerSlice("limestone", 1, "worldgen");
    w.session.seal();
    const before = w.ledger.familyTotal("mineral");
    let threw = "";
    try { w.session.note("deck", { material: "stone", count: 4, cause: "floors:deck" }); }
    catch (e) { threw = e.code; }
    check("sealed unpaid deck", threw === "E_UNPAID" && w.ledger.familyTotal("mineral") === before && w.session.conserved().ok, threw);
    let itemCode = "";
    try { w.session.note("item", { op: "appear", type: "stone", count: 2, cause: "items:create" }); }
    catch (e) { itemCode = e.code; }
    check("undeclared item creates nothing", itemCode === "E_UNDECLARED" && w.session.conserved().ok, itemCode);
}

{
    const Mut = loadReclaim(SRC.replace(
        "ledger.transform(fromCls, fromForm, toCls, toForm, n, cause);",
        "ledger.transform(fromCls, fromForm, toCls, toForm, n, cause);\n        ledger.source(\"debug-explicit\", \"soil\", \"strata\", 1, \"mutant-leak\");"
    ));
    const ledger = createLedger();
    const materials = createMaterials(bag);
    const session = Mut.createReclaim({ ledger: ledger, materials: materials, data: reclaimBag, strict: true });
    session.registerSlice("limestone", 1, "worldgen");
    session.seal();
    let caught = false;
    try {
        session.mine("limestone", 1, "mutant");
        caught = session.conserved().ok === false;
    } catch (e) { caught = true; }
    check("mutant leak gram fails the run", caught === true);
}
{
    const Mut = loadReclaim(SRC.replace(
        "function ledgerAmount(amount) { return amount; }",
        "function ledgerAmount(amount) { return amount + 1; }"
    ));
    const ledger = createLedger();
    const materials = createMaterials(bag);
    const session = Mut.createReclaim({ ledger: ledger, materials: materials, data: reclaimBag, strict: true });
    session.registerSlice("limestone", 1, "worldgen");
    session.registerHolding("stone", "strata", 1, "spare", { materialId: "limestone", pathId: "limestone", exempt: true });
    session.seal();
    let caught = false;
    try {
        session.mine("limestone", 1, "mutant");
        caught = session.conserved().ok === false;
    } catch (e) { caught = true; }
    check("mutant duplicated gram fails the run", caught === true);
}

{
    function run() {
        const w = open();
        w.session.registerSlice("limestone", 1, "worldgen");
        w.session.registerItem("bone", 2, "worldgen");
        w.session.seal();
        w.session.mine("limestone", 1, "jobs:mine");
        w.session.tick(5);
        return w.session.checksum();
    }
    check("same seed same checksum", run() === run() && run().length === 8);
}

{
    const jobs = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "DEUS_Jobs.js"), "utf8");
    const objects = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "DEUS_Objects.js"), "utf8");
    const floors = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "DEUS_Floors.js"), "utf8");
    const items = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "DEUS_Items.js"), "utf8");
    const walls = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "DEUS_Walls.js"), "utf8");
    check("jobs posts mine build and tick", jobs.indexOf('matterNote("mine"') >= 0 && jobs.indexOf('matterNote("build"') >= 0 && jobs.indexOf('matterNote("tick"') >= 0);
    check("objects guard ore and post harvest", objects.indexOf('matterNote("object"') >= 0 && objects.indexOf("before.refuse") >= 0 && objects.indexOf('matterNote("harvest"') >= 0);
    check("floors post build deconstruct and deck", floors.indexOf('matterNote("build"') >= 0 && floors.indexOf('matterNote("deconstruct"') >= 0 && floors.indexOf('matterNote("deck"') >= 0);
    check("items post appear and remove", items.indexOf('op: "appear"') >= 0 && items.indexOf('op: "remove"') >= 0);
    check("walls post collapse", walls.indexOf('matterNote("collapse"') >= 0 && walls.indexOf("collapse,") >= 0);
}

{
    const w = open();
    w.session.seal();
    const threw = codeOf(function () { w.session.mine("tin", 1, "jobs:mine"); });
    check("unmapped tin is not invented", threw === "E_OPEN", threw);
}

console.log("RESULT: " + passed + " passed, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
