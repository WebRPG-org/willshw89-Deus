"use strict";
// DEUS-TSK-WORLD-ITEMS gate. One PASS or FAIL line per check, then RESULT.
// Mutants are in-memory copies. Files on disk are not edited.
//   node tools/world_items/test_world_items.js

const fs = require("fs");
const path = require("path");
const Module = require("module");

const ROOT = path.join(__dirname, "..", "..");
const SIM = path.join(ROOT, "game", "js", "sim", "world_items");
const { createLedger, defaultConfig } = require(path.join(ROOT, "game", "js", "sim", "ledger.js"));
const real = require(path.join(SIM, "index.js"));
const catalog = require(path.join(SIM, "catalog.js"));

let passed = 0;
let failed = 0;
const names = [];

function check(name, ok, why) {
    names.push(name);
    if (ok) {
        passed++;
        console.log("PASS " + name);
    } else {
        failed++;
        console.log("FAIL " + name + (why ? ": " + why : ""));
    }
}

function massMatchesWeight(rows) {
    return rows.every(function (r) { return r.massCp === Math.floor((r.weightOz * 25 + 2) / 4); });
}

{
    const rows = catalog.all();
    const wrong = rows.filter(function (r) { return r.massCp !== Math.floor((r.weightOz * 25 + 2) / 4); });
    check("world_item_mass_matches_weight", wrong.length === 0 && massMatchesWeight(rows)
        && catalog.item("longsword").massCp === 300
        && catalog.item("key_brass").massCp === 6
        && catalog.item("sack").massCp === 50
        && catalog.massCp(2) === 13,
        wrong.map(function (r) { return r.typeId; }).join(","));
}

function loadMutant(file, from, to) {
    const src = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    const n = src.split(from).length - 1;
    if (n !== 1) throw new Error("anchor count " + n + " for " + from);
    const m = new Module(file);
    m.filename = file;
    m.paths = Module._nodeModulePaths(path.dirname(file));
    m._compile(src.replace(from, to), file);
    return m.exports;
}

const worldSrc = path.join(SIM, "world.js");
const geomSrc = path.join(SIM, "geom.js");
const pathSrc = path.join(SIM, "pathing.js");
const sumSrc = path.join(SIM, "summary.js");
const catalogSrc = path.join(SIM, "catalog.js");
const mutNoFactor = loadMutant(catalogSrc, "weightOz * CP_PER_LB", "weightOz");
check("no_25_over_4_mutant_killed", !massMatchesWeight(mutNoFactor.all()));

const mutNest = loadMutant(worldSrc, "t += totalOz(item.contents[i]); // NEST_RECURSE", "t += 0; // NEST_RECURSE");
const mutLoad = loadMutant(worldSrc, "if (total > cap) { // LOAD_LIMIT", "if (false) { // LOAD_LIMIT");
const mutSaveDirty = loadMutant(worldSrc, "if (item.rev <= item.savedRev) continue; // SAVE_DIRTY_ONLY", "if (false && item.rev <= item.savedRev) continue; // SAVE_DIRTY_ONLY");
const mutSaveEmit = loadMutant(worldSrc, "out.items.push(serialize(item)); // SAVE_EMIT", "void serialize(item); // SAVE_EMIT");
const mutClutter = loadMutant(worldSrc, "item.condition <= 0", "item.condition < 0");
const mutLedger = loadMutant(worldSrc, "if (state.ledger) applyPlan(state.ledger, plan); // LEDGER_POST", "if (false) applyPlan(state.ledger, plan); // LEDGER_POST");
const mutPick = loadMutant(worldSrc, "stack.reverse(); // PICK_TOPMOST", "/* PICK_TOPMOST */");
const mutTrap = loadMutant(worldSrc, "trap.dc - 5", "trap.dc - 99");
const mutStow = loadMutant(worldSrc, "return item.exteriorCuIn; // STOW_EXTERIOR", "return item.exteriorCuIn + 99999; // STOW_EXTERIOR");
const mutKey = loadMutant(worldSrc, "if (actorHasKey(actor, container.lock.keyId)) { // KEY_OPENS", "if (false && actorHasKey(actor, container.lock.keyId)) { // KEY_OPENS");
const mutArmor = loadMutant(worldSrc, "unit.armorState = item.armorCategory; // ARMOR_ONLY", "unit.armorState = unit.armorState; // ARMOR_ONLY");
const mutCarry = loadMutant(worldSrc, "item.haulAnim = C.CARRY_ANIM; // CARRY_CLIP", "item.haulAnim = \"WALK\"; // CARRY_CLIP");
const mutZoom = loadMutant(worldSrc, "if (factor !== 3 && factor !== 4) fail(\"E_ZOOM\", \"hold-to-zoom is integer 3 or 4\"); // ZOOM_3_4", "if (factor !== 3 && factor !== 4 && factor !== 2) fail(\"E_ZOOM\", \"hold-to-zoom is integer 3 or 4\"); // ZOOM_3_4");
const mutBudget = loadMutant(worldSrc, "if (item.parentId) continue; // BUDGET_NEST", "if (false && item.parentId) continue; // BUDGET_NEST");
const mutSnap = loadMutant(geomSrc, "Math.floor(q + 0.5)", "Math.floor(q)");
const mutHeight = loadMutant(geomSrc, "item.heightQuarters * C.QUARTER_PX", "0");
const mutCorner = loadMutant(pathSrc, "if (blocked(x + dx, y) || blocked(x, y + dy)) return false; // CORNER_GATE", "if (false) return false; // CORNER_GATE");
const mutSeed = loadMutant(sumSrc, "spec.seed | 0", "0");
const mutDiag = loadMutant(pathSrc, "C.WALK_DIAGONAL_PX", "4");

function ledgerWorld(mod) {
    const ledger = createLedger(defaultConfig());
    const world = mod.createWorld({ seed: 7, ledger: ledger });
    return { ledger: ledger, world: world };
}

function samePos(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i].seedKey !== b[i].seedKey || a[i].xPx !== b[i].xPx || a[i].yPx !== b[i].yPx) return false;
        if (a[i].cellX !== b[i].cellX || a[i].cellY !== b[i].cellY) return false;
    }
    return true;
}

function cutsCorner(path, blocked) {
    if (!path) return false;
    const tiles = path.tiles;
    for (let i = 1; i < tiles.length; i++) {
        const a = tiles[i - 1];
        const b = tiles[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (dx !== 0 && dy !== 0 && (blocked(a.x + dx, a.y) || blocked(a.x, a.y + dy))) return true;
    }
    return false;
}

function destruction(mod, mode) {
    const pair = ledgerWorld(mod);
    const world = pair.world;
    const ledger = pair.ledger;
    const chest = world.place({ typeId: "chest", tileX: 3, tileY: 3, layer: 0 });
    const sack = world.place({ typeId: "sack", tileX: 0, tileY: 0, layer: 0 });
    const rations = world.place({ typeId: "rations", tileX: 0, tileY: 1, layer: 0, condition: 4 });
    const dagger = world.place({ typeId: "dagger", tileX: 1, tileY: 0, layer: 0 });
    const orgBefore = null;
    if (!world.putIn(sack.id, rations.id, { cellX: 0, cellY: 0 }).ok) return "put-rations";
    if (!world.putIn(chest.id, sack.id, { cellX: 0, cellY: 0 }).ok) return "put-sack";
    if (!world.putIn(chest.id, dagger.id, { cellX: 4, cellY: 0 }).ok) return "put-dagger";
    const beforeOrg = ledger.familyTotal ? null : null;
    ledger.seal();
    const organic = ledger.familyTotal("organic");
    const fe = ledger.familyTotal("fe");
    world.destroyContainer(chest.id, { mode: mode });
    if (ledger.familyTotal("organic") !== organic) return "organic";
    if (ledger.familyTotal("fe") !== fe) return "fe";
    try {
        ledger.assertBalanced(world.ledgerRecount());
    } catch (err) {
        return err.code || "throw";
    }
    void orgBefore;
    void beforeOrg;
    return "ok";
}

// --- units and snap ---
check("units_tile_48", real.constants.TILE_PX === 48 && real.constants.LAYER_PX === 48 && real.constants.LAYER_FT === 5);
check("units_quarter_12", real.constants.QUARTER_PX === 12 && real.constants.QUARTER_FT === 1.25 && real.constants.QUARTERS_PER_LAYER === 4);
check("units_cell_6", real.constants.CELL_PX === 6 && real.constants.CELLS_PER_TILE === 8 && real.constants.TILE_PX / real.constants.CELL_PX === 8);
check("units_tick_6s", real.constants.TICK_SEC === 6 && real.constants.TICKS_PER_MINUTE === 10);
check("snap_6", real.geom.snapPx(0) === 0 && real.geom.snapPx(2) === 0 && real.geom.snapPx(3) === 6 && real.geom.snapPx(7) === 6 && real.geom.snapPx(9) === 12 && real.geom.snapPx(51) === 54);
check("snap_6_mutant_killed", mutSnap.snapPx(3) !== 6 && mutSnap.snapPx(3) === 0);

const dragWorld = real.createWorld({ seed: 1 });
const preview = dragWorld.dragPreview(7, 4);
check("drag_preview_snaps", preview.xPx === 6 && preview.yPx === 6 && preview.cellPx === 6);

// --- seeded re-placement ---
{
    const w = real.createWorld({ seed: 11 });
    w.addManifest(2, 3, 0, { longsword: 12, dagger: 5 });
    w.addManifest(2, 3, 0, { dagger: 2 });
    const once = w.expandChunk(2, 3, 0);
    w.collapseChunk(2, 3, 0);
    const twice = w.expandChunk(2, 3, 0);
    check("seeded_replace", once.length === 19 && samePos(once, twice));
    const movedKey = twice[0].seedKey;
    w.move(twice[0].id, { tileX: twice[0].tileX, tileY: twice[0].tileY, cellX: (twice[0].cellX + 1) % 5, cellY: twice[0].cellY, layer: 0 });
    const moved = w.chunkPositions(2, 3, 0).filter(function (p) { return p.seedKey === movedKey; })[0];
    w.collapseChunk(2, 3, 0);
    w.expandChunk(2, 3, 0);
    const again = w.chunkPositions(2, 3, 0).filter(function (p) { return p.seedKey === movedKey; })[0];
    const others = w.chunkPositions(2, 3, 0).filter(function (p) { return p.seedKey !== movedKey; });
    const otherOnce = twice.filter(function (p) { return p.seedKey !== movedKey; });
    check("seeded_edit_kept", again.cellX === moved.cellX && again.xPx === moved.xPx && samePos(others, otherOnce));
}
{
    let differ = false;
    for (let i = 0; i < 8; i++) {
        const spec = { cx: 1, cy: 4, layer: 0, typeId: "longsword", index: i, sizePx: 24, chunkTiles: 16 };
        const a = real.summary.seededAnchor(Object.assign({ seed: 11 }, spec));
        const b = real.summary.seededAnchor(Object.assign({ seed: 99 }, spec));
        if (a.xPx !== b.xPx || a.yPx !== b.yPx || a.cellX !== b.cellX || a.cellY !== b.cellY) differ = true;
    }
    check("seeded_differs_by_seed", differ);
    const spec = { cx: 1, cy: 4, layer: 0, typeId: "longsword", index: 0, sizePx: 24, chunkTiles: 16 };
    const m1 = mutSeed.seededAnchor(Object.assign({ seed: 11 }, spec));
    const m2 = mutSeed.seededAnchor(Object.assign({ seed: 99 }, spec));
    check("seeded_replace_mutant_killed", m1.xPx === m2.xPx && m1.yPx === m2.yPx && m1.cellX === m2.cellX && m1.cellY === m2.cellY);
}
{
    const w = real.createWorld({ seed: 4, nearTiles: 8 });
    w.addManifest(0, 0, 0, { dagger: 5 });
    check("far_stays_summarized", w.chunkPositions(0, 0, 0).length === 0 && w.placedCount() === 5 && w.budgetCount() === 1);
    w.setViewer(8, 8, 0);
    const near = w.chunkPositions(0, 0, 0);
    w.setViewer(80, 80, 0);
    const far = w.chunkPositions(0, 0, 0).length === 0;
    w.setViewer(8, 8, 0);
    check("viewer_expands_near", near.length === 5 && far && samePos(near, w.chunkPositions(0, 0, 0)));
}

// --- surfaces, spill, collapse, draw ---
{
    const pair = ledgerWorld(real);
    const w = pair.world;
    const table = w.place({ typeId: "table_wood", tileX: 4, tileY: 4, layer: 0, loadLimitLb: 10, collapseLb: 30 });
    const shelf = w.place({ typeId: "shelf_wood", tileX: 6, tileY: 4, layer: 0 });
    const high = w.place({ typeId: "shelf_high", tileX: 8, tileY: 4, layer: 0 });
    const a = w.place({ typeId: "shield", tileX: 0, tileY: 0, layer: 0 });
    const b = w.place({ typeId: "shield", tileX: 1, tileY: 0, layer: 0 });
    const plate = w.place({ typeId: "plate", tileX: 2, tileY: 0, layer: 0 });
    const torch = w.place({ typeId: "torch", tileX: 6, tileY: 4, cellX: 1, cellY: 1, layer: 0, surfaceId: shelf.id });
    const mug = w.place({ typeId: "torch", tileX: 8, tileY: 4, cellX: 1, cellY: 1, layer: 0, surfaceId: high.id });
    pair.ledger.seal();
    w.move(a.id, { tileX: 4, tileY: 4, cellX: 0, cellY: 0, layer: 0, surfaceId: table.id });
    w.move(b.id, { tileX: 4, tileY: 4, cellX: 2, cellY: 0, layer: 0, surfaceId: table.id });
    const on = [w.get(a.id), w.get(b.id)].filter(function (it) { return it.surfaceId === table.id; });
    check("load_spill", on.length === 1 && on[0].heightQuarters === 1 && on[0].heightOffsetPx === 12);
    const spilled = [w.get(a.id), w.get(b.id)].filter(function (it) { return it.surfaceId === null; });
    check("load_spill_drops_height", spilled.length === 1 && spilled[0].heightQuarters === 0);
    check("shelf_quarters", w.get(torch.id).heightQuarters === 2 && w.get(torch.id).heightOffsetPx === 24);
    check("shelf_high_quarters", w.get(mug.id).heightQuarters === 3 && w.get(mug.id).heightOffsetPx === 36);
    w.move(plate.id, { tileX: 4, tileY: 4, cellX: 0, cellY: 0, layer: 0, surfaceId: table.id });
    const broken = w.get(table.id);
    const plateNow = w.get(plate.id);
    let balanced = false;
    try { pair.ledger.assertBalanced(w.ledgerRecount()); balanced = true; } catch (err) { balanced = false; }
    check("load_collapse", broken.broken === true && broken.ledgerForm === "ruin" && plateNow.surfaceId === null && plateNow.heightQuarters === 0 && balanced);
}
{
    const pair = ledgerWorld(mutLoad);
    const w = pair.world;
    const table = w.place({ typeId: "table_wood", tileX: 4, tileY: 4, layer: 0, loadLimitLb: 10, collapseLb: 30 });
    const a = w.place({ typeId: "shield", tileX: 0, tileY: 0, layer: 0 });
    const b = w.place({ typeId: "shield", tileX: 1, tileY: 0, layer: 0 });
    pair.ledger.seal();
    w.move(a.id, { tileX: 4, tileY: 4, cellX: 0, cellY: 0, layer: 0, surfaceId: table.id });
    w.move(b.id, { tileX: 4, tileY: 4, cellX: 2, cellY: 0, layer: 0, surfaceId: table.id });
    const on = [w.get(a.id), w.get(b.id)].filter(function (it) { return it.surfaceId === table.id; });
    check("load_spill_mutant_killed", on.length !== 1);
}
{
    const w = real.createWorld({ seed: 2 });
    let threw = false;
    try { w.place({ typeId: "dagger", tileX: 0, tileY: 0, layer: 0, scale: 2 }); } catch (err) { threw = err.code === "E_SCALE"; }
    check("no_scale", threw);
    const sword = w.place({ typeId: "longsword", tileX: 1, tileY: 1, layer: 0 });
    const tiny = w.place({ typeId: "dagger", tileX: 1, tileY: 2, layer: 0 });
    const draw = w.drawList({ x0: 0, y0: 0, x1: 400, y1: 400, layer: 0 });
    const swordDraw = draw.filter(function (d) { return d.id === sword.id; })[0];
    const tinyDraw = draw.filter(function (d) { return d.id === tiny.id; })[0];
    const blob = JSON.stringify(draw);
    check("true_size_slot_only", swordDraw.w === 24 && swordDraw.h === 24 && swordDraw.scale === 1 && tinyDraw.w === 12 && tinyDraw.shadowPx === 1 && swordDraw.shadowPx === 2 && blob.indexOf(".png") < 0 && blob.indexOf("img/") < 0 && swordDraw.slotId === "WS.LONGSWORD.24.D");
}

{
    const south = { id: 1, yPx: 48, sizePx: 12, heightQuarters: 0, layer: 0 };
    const north = { id: 2, yPx: 0, sizePx: 12, heightQuarters: 3, layer: 0 };
    const lowLayer = { id: 3, yPx: 10, sizePx: 12, heightQuarters: 0, layer: 0 };
    const highLayer = { id: 4, yPx: 10, sizePx: 12, heightQuarters: 0, layer: 1 };
    check("draw_bottom_then_height", real.geom.drawCompare(north, south) < 0);
    check("draw_row_then_layer", real.geom.drawCompare(lowLayer, highLayer) < 0);
    const high = { id: 1, yPx: 0, sizePx: 12, heightQuarters: 2, layer: 0 };
    const low = { id: 2, yPx: 0, sizePx: 12, heightQuarters: 0, layer: 0 };
    const order = [low, high].sort(real.geom.drawCompare);
    const bad = [low, high].sort(mutHeight.drawCompare);
    check("draw_height_offset", order[order.length - 1].id === 1);
    check("draw_height_offset_mutant_killed", bad[bad.length - 1].id !== 1);
}

// --- nested weight and volume ---
{
    const w = real.createWorld({ seed: 3 });
    const sack = w.place({ typeId: "sack", tileX: 0, tileY: 0, layer: 0 });
    const rations = w.place({ typeId: "rations", tileX: 1, tileY: 0, layer: 0, condition: 4 });
    const dagger = w.place({ typeId: "dagger", tileX: 1, tileY: 1, layer: 0 });
    const sword = w.place({ typeId: "longsword", tileX: 2, tileY: 0, layer: 0 });
    w.putIn(sack.id, rations.id, { cellX: 0, cellY: 0 });
    w.putIn(sack.id, dagger.id, { cellX: 2, cellY: 0 });
    const tight = w.place({ typeId: "backpack", tileX: 3, tileY: 0, layer: 0, capLb: 6 });
    w.putIn(tight.id, sack.id, { cellX: 0, cellY: 0 });
    const rejected = w.putIn(tight.id, sword.id, { cellX: 4, cellY: 0 });
    const pack = w.place({ typeId: "backpack", tileX: 4, tileY: 0, layer: 0 });
    const sack2 = w.place({ typeId: "sack", tileX: 0, tileY: 2, layer: 0 });
    const rations2 = w.place({ typeId: "rations", tileX: 1, tileY: 2, layer: 0, condition: 4 });
    const dagger2 = w.place({ typeId: "dagger", tileX: 1, tileY: 3, layer: 0 });
    w.putIn(sack2.id, rations2.id, { cellX: 0, cellY: 0 });
    w.putIn(sack2.id, dagger2.id, { cellX: 2, cellY: 0 });
    const nested = w.putIn(pack.id, sack2.id, { cellX: 0, cellY: 0 });
    w.addUnit({ id: "u", str: 10, race: "human", sex: "male", tileX: 4, tileY: 1, layer: 0, slotByArmor: { UNARMORED: "CH.HUMAN.M.UNARMORED", LIGHT: "CH.HUMAN.M.LIGHT" } });
    const worn = w.equip("u", pack.id, "pack");
    // Backpack 5 lb + sack 0.5 lb + rations 2 lb + dagger 1 lb = 8.5 lb = 136 oz.
    // Tare-only would be 5 + 0.5 = 88 oz. The sword stays out: the sack already fills the 1 cu ft.
    check("nested_weight", w.totalOz(sack.id) === 56 && rejected.ok === false && rejected.reason === "weight" && nested.ok === true && worn.ok === true && w.carriedOz("u") === 136 && w.carryCapOz("u") === 2400);
}
{
    const w = mutNest.createWorld({ seed: 3 });
    const sack = w.place({ typeId: "sack", tileX: 0, tileY: 0, layer: 0 });
    const rations = w.place({ typeId: "rations", tileX: 1, tileY: 0, layer: 0, condition: 4 });
    const dagger = w.place({ typeId: "dagger", tileX: 1, tileY: 1, layer: 0 });
    w.putIn(sack.id, rations.id, { cellX: 0, cellY: 0 });
    w.putIn(sack.id, dagger.id, { cellX: 2, cellY: 0 });
    check("nested_weight_mutant_killed", w.totalOz(sack.id) !== 56);
}
{
    const w = real.createWorld({ seed: 3 });
    const chest = w.place({ typeId: "chest", tileX: 0, tileY: 0, layer: 0, capCuFt: 1 });
    const pack = w.place({ typeId: "backpack", tileX: 1, tileY: 0, layer: 0 });
    const sword = w.place({ typeId: "longsword", tileX: 2, tileY: 0, layer: 0 });
    w.putIn(pack.id, sword.id, { cellX: 0, cellY: 0 });
    const put = w.putIn(chest.id, pack.id, { cellX: 0, cellY: 0 });
    check("nested_volume_is_exterior", put.ok === true);
    const bad = mutStow.createWorld({ seed: 3 });
    const chestB = bad.place({ typeId: "chest", tileX: 0, tileY: 0, layer: 0, capCuFt: 1 });
    const packB = bad.place({ typeId: "backpack", tileX: 1, tileY: 0, layer: 0 });
    check("nested_volume_mutant_killed", bad.putIn(chestB.id, packB.id, { cellX: 0, cellY: 0 }).ok === false);
}

// --- locks, traps, windows, shop, budget ---
{
    const w = real.createWorld({ seed: 5 });
    const chest = w.place({ typeId: "chest", tileX: 2, tileY: 2, layer: 0 });
    w.setLock(chest.id, { dc: 15, keyId: "key.brass" });
    const keyActor = { keys: ["key.brass"] };
    const keyed = w.tryUnlock(chest.id, keyActor, function () { throw new Error("rng"); });
    check("lock_key", keyed.ok === true && keyed.reason === "key" && w.get(chest.id).lock.locked === false);
    const w2 = real.createWorld({ seed: 5 });
    const chest2 = w2.place({ typeId: "chest", tileX: 2, tileY: 2, layer: 0 });
    w2.setLock(chest2.id, { dc: 15, keyId: "key.brass" });
    const noTools = w2.tryUnlock(chest2.id, { keys: [] }, function () { return 0; });
    const tools = { tools: { thieves: true }, dexMod: 0, thievesProf: false };
    const fail = w2.tryUnlock(chest2.id, tools, function () { return 0.45; });
    const skilled = { tools: { thieves: true }, dexMod: 3, thievesProf: true, profBonus: 2 };
    const ok = w2.tryUnlock(chest2.id, skilled, function () { return 0.45; });
    check("lock_tools", noTools.ok === false && noTools.reason === "no-tools" && fail.ok === false && fail.total === 10 && ok.ok === true && ok.total === 15);
}
{
    const w = mutKey.createWorld({ seed: 5 });
    const chest = w.place({ typeId: "chest", tileX: 2, tileY: 2, layer: 0 });
    w.setLock(chest.id, { dc: 15, keyId: "key.brass" });
    const keyed = w.tryUnlock(chest.id, { keys: ["key.brass"] }, function () { return 0; });
    check("lock_key_mutant_killed", keyed.reason !== "key");
}
{
    const w = real.createWorld({ seed: 5 });
    const chest = w.place({ typeId: "chest", tileX: 2, tileY: 2, layer: 0 });
    w.setTrap(chest.id, { dc: 15, damage: "1d6" });
    const thief = { tools: { thieves: true }, dexMod: 0 };
    const by5 = w.tryDisarm(chest.id, thief, function () { return 0.45; });
    const wB = real.createWorld({ seed: 5 });
    const chestB = wB.place({ typeId: "chest", tileX: 2, tileY: 2, layer: 0 });
    wB.setTrap(chestB.id, { dc: 15, damage: "1d6" });
    const by4 = wB.tryDisarm(chestB.id, thief, function () { return 0.5; });
    const wC = real.createWorld({ seed: 5 });
    const chestC = wC.place({ typeId: "chest", tileX: 2, tileY: 2, layer: 0 });
    wC.setTrap(chestC.id, { dc: 15, damage: "1d6" });
    const made = wC.tryDisarm(chestC.id, thief, function () { return 0.7; });
    check("trap_margin", by5.ok === false && by5.total === 10 && by5.triggered === true && by4.triggered === false && by4.total === 11 && made.ok === true && made.triggered === false && wC.get(chestC.id).trap.disarmed === true);
    const m = mutTrap.createWorld({ seed: 5 });
    const chestM = m.place({ typeId: "chest", tileX: 2, tileY: 2, layer: 0 });
    m.setTrap(chestM.id, { dc: 15, damage: "1d6" });
    const missed = m.tryDisarm(chestM.id, thief, function () { return 0.45; });
    check("trap_margin_mutant_killed", missed.total === 10 && missed.triggered === false);
}
{
    const w = real.createWorld({ seed: 6 });
    const chest = w.place({ typeId: "chest", tileX: 2, tileY: 2, layer: 0, ownerId: "npc", shop: true });
    const sack = w.place({ typeId: "sack", tileX: 0, tileY: 0, layer: 0 });
    const a = w.place({ typeId: "dagger", tileX: 1, tileY: 0, layer: 0 });
    const b = w.place({ typeId: "dagger", tileX: 1, tileY: 1, layer: 0 });
    const c = w.place({ typeId: "torch", tileX: 1, tileY: 2, layer: 0 });
    w.putIn(sack.id, a.id, { cellX: 0, cellY: 0 });
    w.putIn(chest.id, sack.id, { cellX: 1, cellY: 1 });
    w.putIn(chest.id, b.id, { cellX: 3, cellY: 5 });
    w.putIn(chest.id, c.id, { cellX: 3, cellY: 5 });
    check("budget_one_object", w.budgetCount() === 1 && w.placedCount() === 5);
    const mb = mutBudget.createWorld({ seed: 6 });
    const chestM = mb.place({ typeId: "chest", tileX: 2, tileY: 2, layer: 0 });
    const d1 = mb.place({ typeId: "dagger", tileX: 0, tileY: 0, layer: 0 });
    const d2 = mb.place({ typeId: "torch", tileX: 0, tileY: 1, layer: 0 });
    const d3 = mb.place({ typeId: "club", tileX: 0, tileY: 2, layer: 0 });
    mb.putIn(chestM.id, d1.id, { cellX: 0, cellY: 0 });
    mb.putIn(chestM.id, d2.id, { cellX: 2, cellY: 0 });
    mb.putIn(chestM.id, d3.id, { cellX: 4, cellY: 0 });
    check("budget_one_object_mutant_killed", mb.budgetCount() !== 1);
    w.setLock(chest.id, { dc: 12, keyId: "key.brass" });
    const lockedWin = w.doubleClick(chest.id);
    check("locked_window_hides", lockedWin.showContents === false && w.interiorDraw(chest.id).length === 0);
    w.tryUnlock(chest.id, { keys: ["key.brass"] }, function () { throw new Error("rng"); });
    const openWin = w.doubleClick(chest.id);
    const sackWin = w.doubleClick(sack.id);
    const wins = w.windows();
    w.moveWindow(openWin.id, 120, 64);
    const moved = w.windows().filter(function (win) { return win.id === openWin.id; })[0];
    const inside = w.interiorDraw(chest.id);
    const stacked = inside.filter(function (d) { return d.xPx === 18 && d.yPx === 30; });
    check("container_windows", wins.length === 2 && sackWin.containerId === sack.id && moved.x === 120 && moved.y === 64 && stacked.length === 2 && openWin.backgroundSlotId === "CN.CHEST.OPEN.D");
    const facing = w.setFacing(chest.id, "U");
    check("container_four_facings", facing === "CN.CHEST.OPEN.U" && real.constants.FACINGS.length === 4);
    const stolen = w.steal(b.id, { actorId: "pc" });
    const bought = w.steal(c.id, { actorId: "pc", permit: true });
    check("shop_steal", stolen.theft === true && stolen.from === "npc" && w.get(b.id).parentId === null && bought.theft === false && bought.ownerId === "pc");
}

// --- mass ---
{
    const pair = ledgerWorld(real);
    const sword = pair.world.place({ typeId: "longsword", tileX: 0, tileY: 0, layer: 0 });
    pair.ledger.seal();
    let balanced = false;
    try { pair.ledger.assertBalanced(pair.world.ledgerRecount()); balanced = true; } catch (e) { balanced = false; }
    check("world_item_ledger_cp", sword.massCp === 300 && pair.ledger.amount("steel", "item") === 300 && balanced);
}
check("mass_burn", destruction(real, "burn") === "ok", destruction(real, "burn"));
check("mass_spill", destruction(real, "spill") === "ok", destruction(real, "spill"));
check("mass_burn_mutant_killed", destruction(mutLedger, "burn") === "E_UNBALANCED", destruction(mutLedger, "burn"));
check("mass_spill_mutant_killed", destruction(mutLedger, "spill") === "E_UNBALANCED", destruction(mutLedger, "spill"));

// --- decay / clutter ---
{
    const pair = ledgerWorld(real);
    const rations = pair.world.place({ typeId: "rations", tileX: 1, tileY: 1, layer: 0, condition: 1 });
    pair.ledger.seal();
    const result = pair.world.tick();
    let balanced = false;
    try { pair.ledger.assertBalanced(pair.world.ledgerRecount()); balanced = true; } catch (err) { balanced = false; }
    let gone = false;
    try { pair.world.get(rations.id); } catch (err) { gone = err.code === "E_ID"; }
    check("clutter_rot", result.removed === 1 && gone && balanced && pair.world.ticks() === 1);
}
{
    const pair = ledgerWorld(mutClutter);
    pair.world.place({ typeId: "rations", tileX: 1, tileY: 1, layer: 0, condition: 1 });
    pair.ledger.seal();
    const result = pair.world.tick();
    check("clutter_rot_mutant_killed", result.removed === 0);
}

// --- save ---
{
    const w = real.createWorld({ seed: 51 });
    const sword = w.place({ typeId: "longsword", tileX: 2, tileY: 3, layer: 0 });
    const blob = JSON.parse(JSON.stringify(w.saveChanges()));
    const before = JSON.stringify(w.saveChanges());
    const itemBefore = JSON.stringify(w.get(sword.id));
    const old = JSON.parse(JSON.stringify(blob));
    old.v = 1;
    let oldCode = "";
    try { w.loadChanges(old); } catch (e) { oldCode = e.code || ""; }
    const legacyField = JSON.parse(JSON.stringify(blob));
    legacyField.items[0].massMu = legacyField.items[0].massCp;
    let fieldCode = "";
    try { w.loadChanges(legacyField); } catch (e) { fieldCode = e.code || ""; }
    check("world_item_old_save_refused", blob.v === 2 && oldCode === "E_SAVE" && fieldCode === "E_SAVE"
        && JSON.stringify(w.saveChanges()) === before && JSON.stringify(w.get(sword.id)) === itemBefore,
        oldCode + "," + fieldCode);
}
{
    function roundTrip(mod) {
        const w = mod.createWorld({ seed: 5 });
        const dagger = w.place({ typeId: "dagger", tileX: 1, tileY: 1, layer: 0 });
        const chest = w.place({ typeId: "chest", tileX: 2, tileY: 2, layer: 0 });
        w.putIn(chest.id, dagger.id, { cellX: 3, cellY: 2 });
        w.move(chest.id, { tileX: 4, tileY: 5, cellX: 0, cellY: 0, layer: 0 });
        const blob = JSON.parse(JSON.stringify(w.saveChanges()));
        if (blob.items.length !== 1) return false;
        const w2 = mod.createWorld({ seed: 5 });
        w2.loadChanges(blob);
        const got = w2.get(chest.id);
        const child = w2.get(dagger.id);
        return blob.v === 2 && blob.items[0].massCp === catalog.item("chest").massCp
            && blob.items[0].contents[0].massCp === catalog.item("dagger").massCp
            && !JSON.stringify(blob).includes('"massMu"')
            && got.tileX === 4 && got.tileY === 5 && child.parentId === chest.id
            && child.massCp === catalog.item("dagger").massCp
            && child.interiorX === 18 && child.interiorY === 12 && w2.budgetCount() === 1;
    }
    check("save_roundtrip", roundTrip(real));
    check("save_roundtrip_mutant_killed", roundTrip(mutSaveEmit) === false);
}
{
    const w = real.createWorld({ seed: 8 });
    const a = w.place({ typeId: "dagger", tileX: 0, tileY: 0, layer: 0 });
    const b = w.place({ typeId: "torch", tileX: 1, tileY: 0, layer: 0 });
    const c = w.place({ typeId: "club", tileX: 2, tileY: 0, layer: 0 });
    const first = w.saveChanges();
    const second = w.saveChanges();
    w.move(a.id, { tileX: 3, tileY: 1, cellX: 2, cellY: 1, layer: 0 });
    const third = JSON.parse(JSON.stringify(w.saveChanges()));
    const text = JSON.stringify(third);
    const w2 = real.createWorld({ seed: 8 });
    w2.loadChanges(first);
    w2.loadChanges(third);
    const fourth = w2.saveChanges();
    check("save_change_only", first.items.length === 3 && second.items.length === 0 && third.items.length === 1 && third.items[0].id === a.id && text.indexOf('"id":' + b.id) < 0 && text.indexOf('"id":' + c.id) < 0 && w2.get(a.id).tileX === 3 && w2.get(b.id).tileX === 1 && fourth.items.length === 0);
    const m = mutSaveDirty.createWorld({ seed: 8 });
    m.place({ typeId: "dagger", tileX: 0, tileY: 0, layer: 0 });
    m.place({ typeId: "torch", tileX: 1, tileY: 0, layer: 0 });
    m.saveChanges();
    check("save_change_only_mutant_killed", m.saveChanges().items.length !== 0);
}

// --- picking, hover, zoom, glow ---
{
    const w = real.createWorld({ seed: 9 });
    const high = w.place({ typeId: "dagger", tileX: 2, tileY: 2, cellX: 1, cellY: 1, layer: 0, heightQuarters: 2 });
    const low = w.place({ typeId: "torch", tileX: 2, tileY: 2, cellX: 1, cellY: 1, layer: 0, heightQuarters: 0 });
    const x = w.get(high.id).xPx + 1;
    const y = w.get(high.id).yPx + 1;
    const top = w.pick(x, y, 0);
    const next = w.pick(x, y, 0, { cycle: 1 });
    const back = w.pick(x, y, 0, { cycle: 1 });
    const hover = w.hover(x, y, 0);
    const draw = w.drawList({ x0: 0, y0: 0, x1: 300, y1: 300, layer: 0 });
    const outlined = draw.filter(function (d) { return d.id === high.id; })[0];
    check("pick_topmost", top.itemId === high.id && top.depth === 2 && top.name === "Dagger");
    check("pick_cycle", next.itemId === low.id && back.itemId === high.id);
    check("hover_outline", hover.outlinePx === 1 && hover.name === "Dagger" && outlined.outlinePx === 1);
    const m = mutPick.createWorld({ seed: 9 });
    const mh = m.place({ typeId: "dagger", tileX: 2, tileY: 2, cellX: 1, cellY: 1, layer: 0, heightQuarters: 2 });
    m.place({ typeId: "torch", tileX: 2, tileY: 2, cellX: 1, cellY: 1, layer: 0, heightQuarters: 0 });
    const mx = m.get(mh.id).xPx + 1;
    const my = m.get(mh.id).yPx + 1;
    check("pick_topmost_mutant_killed", m.pick(mx, my, 0).itemId !== mh.id);
    const cycled = m.pick(mx, my, 0, { cycle: 1 });
    check("pick_cycle_mutant_killed", m.pick(mx, my, 0).itemId !== mh.id || cycled.itemId === mh.id);
}
{
    const w = real.createWorld({ seed: 9 });
    w.setZoomHold(true, 3);
    const z3 = w.zoom();
    w.setZoomHold(true, 4);
    const z4 = w.zoom();
    let threw = false;
    try { w.setZoomHold(true, 2); } catch (err) { threw = err.code === "E_ZOOM"; }
    w.setZoomHold(false);
    check("zoom_3_4", z3 === 3 && z4 === 4 && threw && w.zoom() === null);
    const m = mutZoom.createWorld({ seed: 9 });
    let mutThrew = false;
    try { m.setZoomHold(true, 2); } catch (err) { mutThrew = true; }
    check("zoom_3_4_mutant_killed", mutThrew === false && m.zoom() === 2);
}
{
    const w = real.createWorld({ seed: 9 });
    w.addGlow({ tileX: 0, tileY: 0, layer: 0, brightTiles: 4, dimTiles: 4 });
    const at = w.place({ typeId: "dagger", tileX: 0, tileY: 0, layer: 0 });
    const bright = w.place({ typeId: "dagger", tileX: 4, tileY: 0, layer: 0 });
    const dim = w.place({ typeId: "dagger", tileX: 5, tileY: 0, layer: 0 });
    const diag = w.place({ typeId: "dagger", tileX: 4, tileY: 4, layer: 0 });
    const dark = w.place({ typeId: "dagger", tileX: 9, tileY: 0, layer: 0 });
    const draw = w.drawList({ x0: 0, y0: 0, x1: 20 * 48, y1: 20 * 48, layer: 0 });
    function glow(id) { return draw.filter(function (d) { return d.id === id; })[0].glow; }
    check("nearby_glow", glow(at.id) === "bright" && glow(bright.id) === "bright" && glow(dim.id) === "dim" && glow(diag.id) === "dim" && glow(dark.id) === null);
}

// --- pathing and carry / armor ---
{
    const blocked = function (x, y) { return x === 2 && y === 1; };
    const path = real.pathing.findPath({ start: { x: 1, y: 1 }, goal: { x: 2, y: 2 }, blocked: blocked });
    const open = real.pathing.findPath({ start: { x: 0, y: 0 }, goal: { x: 1, y: 1 }, blocked: function () { return false; } });
    check("corner_no_cut", path && !cutsCorner(path, blocked) && path.tiles.length === 3);
    check("eight_way_step", open && open.tiles.length === 2 && open.cost === 14);
    const bad = mutCorner.findPath({ start: { x: 1, y: 1 }, goal: { x: 2, y: 2 }, blocked: blocked });
    check("corner_no_cut_mutant_killed", cutsCorner(bad, blocked));
    const step = real.pathing.frameStep(6, "walk");
    const run = real.pathing.frameStep(6, "run");
    const diag = real.pathing.frameStep(9, "walk");
    const diagRun = real.pathing.frameStep(9, "run");
    check("walk_pixels", step.dx === 4 && step.dy === 0 && run.dx === 6 && diag.dx === 3 && diag.dy === -3 && diagRun.dx === 4 && diagRun.dy === -4);
    const mutStep = mutDiag.frameStep(9, "walk");
    check("walk_pixels_mutant_killed", mutStep.dx !== 3 || mutStep.dy !== -3);
}
{
    const w = real.createWorld({ seed: 10 });
    w.setBounds({ x0: 0, y0: 0, x1: 6, y1: 6 });
    w.place({ typeId: "dagger", tileX: 2, tileY: 1, layer: 0 });
    const through = w.findPath(2, 0, 2, 2, 0);
    check("small_item_passable", through && through.tiles.some(function (t) { return t.x === 2 && t.y === 1; }));
    const chest = w.place({ typeId: "chest", tileX: 4, tileY: 1, layer: 0 });
    const around = w.findPath(4, 0, 4, 2, 0);
    check("large_item_blocks", w.tileBlocked(4, 1, 0) === true && around && !around.tiles.some(function (t) { return t.x === 4 && t.y === 1; }));
    w.setBlocked(5, 1, 0, true);
    const wall = w.findPath(5, 0, 5, 2, 0);
    check("terrain_square_block", wall && !wall.tiles.some(function (t) { return t.x === 5 && t.y === 1; }));
    w.place({ typeId: "greatsword", tileX: 0, tileY: 5, layer: 0 });
    check("greatsword_blocks", w.tileBlocked(0, 5, 0) === true);
    void chest;
}
{
    const w = real.createWorld({ seed: 10 });
    const sword = w.place({ typeId: "greatsword", tileX: 0, tileY: 5, layer: 0 });
    w.addUnit({
        id: "porter", str: 18, race: "human", sex: "female", tileX: 0, tileY: 5, layer: 0,
        slotByArmor: {
            UNARMORED: "CH.HUMAN.F.UNARMORED",
            ROBE: "CH.HUMAN.F.ROBE",
            LIGHT: "CH.HUMAN.F.LIGHT",
            MEDIUM: "CH.HUMAN.F.MEDIUM",
            HEAVY: "CH.HUMAN.F.HEAVY"
        }
    });
    const before = w.mapSprite("porter");
    const haul = w.beginHaul("porter", sword.id);
    check("haul_carry", haul.ok === true && haul.anim === "CARRY" && w.tileBlocked(0, 5, 0) === false && w.get(sword.id).haulAnim === "CARRY");
    const hand = w.place({ typeId: "longsword", tileX: 1, tileY: 5, layer: 0 });
    const leather = w.place({ typeId: "leather", tileX: 1, tileY: 4, layer: 0 });
    const ring = w.place({ typeId: "key_brass", tileX: 1, tileY: 3, layer: 0 });
    w.equip("porter", hand.id, "mainHand");
    const afterWeapon = w.mapSprite("porter");
    w.equip("porter", ring.id, "ring");
    const afterRing = w.mapSprite("porter");
    w.equip("porter", leather.id, "armor");
    const afterArmor = w.mapSprite("porter");
    check("armor_only_sprite", before.armorState === "UNARMORED" && before.slotId === "CH.HUMAN.F.UNARMORED" && afterWeapon.armorState === "UNARMORED" && afterWeapon.slotId === before.slotId && afterRing.slotId === before.slotId && afterArmor.armorState === "LIGHT" && afterArmor.slotId === "CH.HUMAN.F.LIGHT" && real.constants.ARMOR_STATES.length === 5);
    const weak = real.createWorld({ seed: 10 });
    weak.addUnit({ id: "weak", str: 1, race: "human", sex: "male", tileX: 0, tileY: 0, layer: 0 });
    const plate = weak.place({ typeId: "plate", tileX: 0, tileY: 0, layer: 0 });
    check("carry_str_15", weak.equip("weak", plate.id, "armor").reason === "encumbered" && weak.carryCapOz("weak") === 15 * 16);
}
{
    const w = mutCarry.createWorld({ seed: 10 });
    const sword = w.place({ typeId: "dagger", tileX: 0, tileY: 0, layer: 0 });
    w.addUnit({ id: "porter", str: 10, race: "human", sex: "male", tileX: 0, tileY: 0, layer: 0 });
    check("haul_carry_mutant_killed", w.beginHaul("porter", sword.id).anim !== "CARRY");
    const a = mutArmor.createWorld({ seed: 10 });
    a.addUnit({ id: "u", str: 10, race: "human", sex: "male", tileX: 0, tileY: 0, layer: 0, slotByArmor: { UNARMORED: "SLOT.U", LIGHT: "SLOT.L" } });
    const leather = a.place({ typeId: "leather", tileX: 1, tileY: 0, layer: 0 });
    a.equip("u", leather.id, "armor");
    check("armor_only_sprite_mutant_killed", a.mapSprite("u").armorState !== "LIGHT");
}

// --- source guards ---
{
    const files = fs.readdirSync(SIM).filter(function (name) { return name.endsWith(".js"); });
    let random = false;
    let pix = false;
    for (let i = 0; i < files.length; i++) {
        const text = fs.readFileSync(path.join(SIM, files[i]), "utf8");
        if (text.indexOf("Math.random") >= 0) random = true;
        if (/pixellab|image_gen|dall-e/i.test(text)) pix = true;
    }
    const plugin = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "DEUS_WorldItems.js"), "utf8");
    const bridge = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "DEUS_Containers.js"), "utf8");
    check("no_random_no_art_gen", !random && !pix && !/pixellab|image_gen/i.test(plugin) && bridge.indexOf("srdBackpack") >= 0);
    const loaded = require(path.join(ROOT, "game", "js", "plugins", "DEUS_WorldItems.js"));
    const bound = loaded.bind(loaded.createWorld({ seed: 1 }));
    const box = bound.place({ typeId: "chest", tileX: 1, tileY: 1, layer: 0 });
    check("plugin_binds_sim", loaded.constants.CELL_PX === 6 && loaded.blocksTile(box.tileX, box.tileY, 0) === true);
}

const need = [
    "seeded_replace", "load_spill", "nested_weight", "lock_key", "trap_margin",
    "mass_burn", "mass_spill", "save_roundtrip", "save_change_only", "pick_topmost", "pick_cycle", "snap_6"
];
for (let i = 0; i < need.length; i++) {
    check("gate_" + need[i] + "_has_mutant", names.indexOf(need[i]) >= 0 && names.indexOf(need[i] + "_mutant_killed") >= 0);
}

console.log("RESULT: " + passed + " passed, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
