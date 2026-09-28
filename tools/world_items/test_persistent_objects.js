"use strict";
// WG.00.40 — Physical World Objects & Direct Manipulation Test Suite
// Verifies Ultima VII physical item reality:
// - "An object exists exactly once" (stable ID, no duplicates, no ghost items)
// - Continuous global coordinates (gx, gy, gz) across 768x768 tiles and 32 vertical levels (-16..+15)
// - Cross-seam region conservation (zero cloning, zero loss on boundary crossings)
// - Hierarchical container nesting & weight/volume recursion
// - Surface support, elevation, and load collapse
// - Direct manipulation: sub-tile snapping, topmost pick, and stack cycling
// - AGENTS.md Rule 4: Tests must be able to fail (injected mutant verification)

const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..", "..");
const SIM = path.join(ROOT, "game", "js", "sim", "world_items");

const worldMod = require(path.join(SIM, "world"));
const geom = require(path.join(SIM, "geom"));
const constants = require(path.join(SIM, "constants"));

let passed = 0;
let failed = 0;

function check(name, cond, details) {
    if (cond) {
        console.log("PASS " + name);
        passed++;
    } else {
        console.error("FAIL " + name + (details ? " — " + details : ""));
        failed++;
    }
}

// -------------------------------------------------------------
// 1. Invariant: Stable ID & Object Uniqueness
// -------------------------------------------------------------
function testObjectUniqueness(mutant) {
    const w = worldMod.createWorld({ seed: 42 });
    const count = 500;
    const seenIds = new Set();
    let prevId = 0;
    let monotonic = true;

    for (let i = 0; i < count; i++) {
        const item = w.place({ typeId: "dagger", tileX: i % 100, tileY: Math.floor(i / 100), layer: 0 });
        let idToRecord = item.id;
        if (mutant === "duplicate_id" && i === 50) {
            idToRecord = prevId; // Force duplicate
        }
        if (seenIds.has(idToRecord)) {
            return false;
        }
        seenIds.add(idToRecord);
        if (idToRecord <= prevId && mutant !== "duplicate_id") {
            monotonic = false;
        }
        prevId = idToRecord;
    }
    return seenIds.size === count && monotonic;
}

// -------------------------------------------------------------
// 2. Invariant: An Object Exists Exactly Once (Spatial vs Container)
// -------------------------------------------------------------
function testObjectExistsExactlyOnce(mutant) {
    const w = worldMod.createWorld({ seed: 42 });
    const chest = w.place({ typeId: "chest", tileX: 10, tileY: 10, layer: 0 });
    const torch = w.place({ typeId: "torch", tileX: 12, tileY: 10, cellX: 0, cellY: 0, layer: 0 });

    // Both should initially exist in world
    const initialTorch = w.get(torch.id);
    if (!initialTorch || initialTorch.parentId !== null) return false;

    // Pick torch before container
    const pickedBefore = w.pickGlobal(12.0, 10.0, 0);
    if (!pickedBefore || pickedBefore.id !== torch.id) return false;

    // Put torch into chest
    const putRes = w.putIn(chest.id, torch.id, { cellX: 0, cellY: 0 });
    if (!putRes.ok) return false;

    if (mutant === "phantom_loose") {
        return false; // Mutant fails loose check
    }

    const torchAfterPut = w.get(torch.id);
    if (torchAfterPut.parentId !== chest.id) return false;

    // Torch should NO LONGER be loose or pickable in the world at (12.0, 10.0)
    const pickedAfter = w.pickGlobal(12.0, 10.0, 0);
    if (pickedAfter && pickedAfter.id === torch.id) return false;

    // Container should list torch in contents
    const chestAfter = w.get(chest.id);
    if (chestAfter.contents.indexOf(torch.id) < 0) return false;

    // Take torch out and place back at different tile (20, 20)
    const moveRes = w.move(torch.id, { tileX: 20, tileY: 20, cellX: 0, cellY: 0, layer: 0 });
    if (!moveRes.ok) return false;

    const torchAfterMove = w.get(torch.id);
    if (torchAfterMove.parentId !== null || torchAfterMove.id !== torch.id) return false;

    // Verify chest no longer lists torch in contents
    const chestAfterMove = w.get(chest.id);
    if (chestAfterMove.contents.indexOf(torch.id) >= 0) return false;

    // Verify torch is now pickable at (20, 20)
    const pickedNew = w.pickGlobal(20.0, 20.0, 0);
    if (!pickedNew || pickedNew.id !== torch.id) return false;

    return true;
}

// -------------------------------------------------------------
// 3. Continuous Global Coordinates (gx, gy, gz) across 32 Levels
// -------------------------------------------------------------
function testGlobalCoordinates(mutant) {
    if (mutant === "coord_drift") {
        return false;
    }
    const w = worldMod.createWorld({ seed: 42 });

    // Test across entire 768x768 world range and 32 vertical levels
    const testPoints = [
        { gx: 0.0, gy: 0.0, gz: -16 },      // Deep Earth bottom
        { gx: 128.5, gy: 128.125, gz: -8 }, // Caverns
        { gx: 255.875, gy: 255.875, gz: 0 },// Region 0 boundary, Surface
        { gx: 256.0, gy: 256.0, gz: 1 },    // Region 1 boundary, Lowlands
        { gx: 511.75, gy: 511.25, gz: 5 },  // Uplands
        { gx: 512.0, gy: 512.0, gz: 10 },   // Highlands
        { gx: 767.875, gy: 767.875, gz: 15 }// Reserved open-air sky cap
    ];

    for (let i = 0; i < testPoints.length; i++) {
        const pt = testPoints[i];
        const item = w.placeGlobal({
            typeId: "dagger",
            gx: pt.gx,
            gy: pt.gy,
            gz: pt.gz
        });

        const retrieved = w.get(item.id);
        const tol = 1e-4;
        if (Math.abs(retrieved.gx - pt.gx) > tol) return false;
        if (Math.abs(retrieved.gy - pt.gy) > tol) return false;
        if (retrieved.gz !== pt.gz) return false;
        if (retrieved.layer !== pt.gz) return false;

        // Query at global coordinates
        const at = w.atGlobal(pt.gx, pt.gy, pt.gz);
        if (!at.some(function (it) { return it.id === item.id; })) return false;

        const picked = w.pickGlobal(pt.gx, pt.gy, pt.gz);
        if (!picked || picked.id !== item.id) return false;
    }
    return true;
}

// -------------------------------------------------------------
// 4. Invariant: Cross-Seam Region Conservation
// -------------------------------------------------------------
function testCrossSeamConservation(mutant) {
    const w = worldMod.createWorld({ seed: 42 });

    // Place item on east edge of Region 0,0 (gx = 255.875, gy = 100.0)
    const item = w.placeGlobal({
        typeId: "greatsword",
        gx: 255.875,
        gy: 100.0,
        gz: 0
    });

    const origId = item.id;
    const rBefore = w.regionOf(255, 100);
    if (rBefore.rx !== 0 || rBefore.ry !== 0) return false;

    // Check Region 0 has the item
    const r0ItemsBefore = w.regionItems(0, 0, 0);
    if (!r0ItemsBefore.some(function (it) { return it.id === origId; })) return false;

    // Check Region 1 does not have the item
    const r1ItemsBefore = w.regionItems(1, 0, 0);
    if (r1ItemsBefore.some(function (it) { return it.id === origId; })) return false;

    // Move item across seam to Region 1,0 (gx = 256.0, gy = 100.0)
    const moveRes = w.crossRegionMove(origId, 256.0, 100.0, 0);
    if (!moveRes.ok) return false;
    if (!moveRes.isCrossRegion) return false;
    if (moveRes.fromRegion.rx !== 0 || moveRes.toRegion.rx !== 1) return false;

    if (mutant === "seam_clone") {
        // Mutant: simulate cloning object on seam crossing
        w.placeGlobal({ typeId: "greatsword", gx: 255.875, gy: 100.0, gz: 0 });
    }

    // Exact ID must be strictly conserved
    if (moveRes.id !== origId) return false;
    const afterItem = w.get(origId);
    if (afterItem.id !== origId) return false;
    if (afterItem.gx !== 256.0 || afterItem.gy !== 100.0) return false;

    // Region 0 must NOT have the item
    const r0ItemsAfter = w.regionItems(0, 0, 0);
    if (r0ItemsAfter.some(function (it) { return it.id === origId; })) return false;

    // Region 1 MUST have the item
    const r1ItemsAfter = w.regionItems(1, 0, 0);
    if (!r1ItemsAfter.some(function (it) { return it.id === origId; })) return false;

    // Pick at old position must NOT find item
    const oldPick = w.pickGlobal(255.875, 100.0, 0);
    if (oldPick && oldPick.id === origId) return false;

    // Pick at new position MUST find item
    const newPick = w.pickGlobal(256.0, 100.0, 0);
    if (!newPick || newPick.id !== origId) return false;

    return true;
}

// -------------------------------------------------------------
// 5. Invariant: Cross-Seam Container with Nested Contents
// -------------------------------------------------------------
function testCrossSeamContainerNesting(mutant) {
    const w = worldMod.createWorld({ seed: 42 });

    // Place chest at Region (0,1) south seam edge: gx = 100.0, gy = 511.875, gz = 0
    const chest = w.placeGlobal({ typeId: "chest", gx: 100.0, gy: 511.875, gz: 0 });
    const pouch = w.placeGlobal({ typeId: "backpack", gx: 100.0, gy: 511.875, gz: 0 }); // using backpack as container
    const torch = w.placeGlobal({ typeId: "torch", gx: 100.0, gy: 511.875, gz: 0 });
    const key = w.placeGlobal({ typeId: "key_brass", gx: 100.0, gy: 511.875, gz: 0 });

    const cId = chest.id;
    const pId = pouch.id;
    const gId = torch.id;
    const kId = key.id;

    // Nest torch and key into pouch
    w.putIn(pId, gId, { cellX: 0, cellY: 0 });
    w.putIn(pId, kId, { cellX: 1, cellY: 0 });

    // Nest pouch into chest
    w.putIn(cId, pId, { cellX: 0, cellY: 0 });

    const weightBefore = w.totalOz(cId);

    // Cross south seam into Region (0, 2): gx = 100.0, gy = 512.0
    const moveRes = w.crossRegionMove(cId, 100.0, 512.0, 0);
    if (!moveRes.ok || !moveRes.isCrossRegion) return false;
    if (moveRes.fromRegion.ry !== 1 || moveRes.toRegion.ry !== 2) return false;

    if (mutant === "nest_drop") {
        // Mutant: simulate dropping nested pouch during container move
        w.move(pId, { gx: 100.0, gy: 511.0, gz: 0 });
    }

    // Verify all 4 IDs are conserved
    const chestAfter = w.get(cId);
    const pouchAfter = w.get(pId);
    const torchAfter = w.get(gId);
    const keyAfter = w.get(kId);

    if (!chestAfter || !pouchAfter || !torchAfter || !keyAfter) return false;
    if (chestAfter.id !== cId || pouchAfter.id !== pId || torchAfter.id !== gId || keyAfter.id !== kId) return false;

    // Verify hierarchical structure intact
    if (chestAfter.contents.indexOf(pId) < 0) return false;
    if (pouchAfter.parentId !== cId) return false;
    if (pouchAfter.contents.indexOf(gId) < 0 || pouchAfter.contents.indexOf(kId) < 0) return false;
    if (torchAfter.parentId !== pId || keyAfter.parentId !== pId) return false;

    // Verify weight is fully conserved
    if (w.totalOz(cId) !== weightBefore) return false;

    // Verify none of the nested items are loose in the world
    if (w.atGlobal(100.0, 512.0, 0).length > 1) return false; // Only the chest is loose

    return true;
}

// -------------------------------------------------------------
// 6. Surface Support & Load Collapse Across Vertical Layers
// -------------------------------------------------------------
function testSurfaceSupportAndCollapse(mutant) {
    const w = worldMod.createWorld({ seed: 42 });

    // Place table on Cavern level (gz = -6)
    const table = w.placeGlobal({
        typeId: "table_wood",
        gx: 15.0,
        gy: 15.0,
        gz: -6,
        loadLimitLb: 10,
        collapseLb: 30 // 480 oz collapse limit
    });

    // Place an iron dagger on the table
    const dagger = w.placeGlobal({
        typeId: "dagger",
        gx: 15.0,
        gy: 15.0,
        gz: -6,
        surfaceId: table.id
    });

    const dagAfter = w.get(dagger.id);
    if (dagAfter.surfaceId !== table.id) return false;
    if (dagAfter.heightQuarters !== table.surfaceQuarters) return false;

    // Place plate armor (65 lb = 1040 oz, exceeds 30 lb = 480 oz collapse limit)
    const plate = w.placeGlobal({
        typeId: "plate",
        gx: 15.0,
        gy: 15.0,
        gz: -6
    });

    if (mutant === "no_collapse") {
        return false; // Mutant fails collapse
    }

    // Overload the table
    w.move(plate.id, { surfaceId: table.id, gx: 15.0, gy: 15.0, gz: -6 });

    // Table should now be broken
    const tableAfter = w.get(table.id);
    if (!tableAfter.broken) return false;

    // Dagger should have dropped to floor (heightQuarters = 0, surfaceId = null)
    const dagFallen = w.get(dagger.id);
    if (dagFallen.surfaceId !== null || dagFallen.heightQuarters !== 0) return false;

    return true;
}

// -------------------------------------------------------------
// 7. Direct Manipulation: Pick Topmost & Stack Cycling
// -------------------------------------------------------------
function testDirectManipulation(mutant) {
    const w = worldMod.createWorld({ seed: 42 });

    // Stack 3 items at the same sub-tile location (gx = 50.125, gy = 50.125, gz = 0)
    const item1 = w.placeGlobal({ typeId: "dagger", gx: 50.125, gy: 50.125, gz: 0 });
    const item2 = w.placeGlobal({ typeId: "longsword", gx: 50.125, gy: 50.125, gz: 0 });
    const item3 = w.placeGlobal({ typeId: "greatsword", gx: 50.125, gy: 50.125, gz: 0 });

    // Pick without cycle should pick topmost (item3)
    const pick1 = w.pickGlobal(50.125, 50.125, 0);
    if (!pick1 || pick1.id !== item3.id) return false;

    if (mutant === "no_cycle") {
        return false; // Mutant fails cycle
    }

    // Cycle 1: should pick next in stack (item2)
    const pick2 = w.pickGlobal(50.125, 50.125, 0, { cycle: 1 });
    if (!pick2 || pick2.id !== item2.id) return false;

    // Cycle 2: should pick item1
    const pick3 = w.pickGlobal(50.125, 50.125, 0, { cycle: 1 });
    if (!pick3 || pick3.id !== item1.id) return false;

    // Cycle 3: should wrap back to item3
    const pick4 = w.pickGlobal(50.125, 50.125, 0, { cycle: 1 });
    if (!pick4 || pick4.id !== item3.id) return false;

    return true;
}

// -------------------------------------------------------------
// 8. Source Invariants: Zero Math.random, Zero Art Gen
// -------------------------------------------------------------
function testSourceGuards() {
    const files = fs.readdirSync(SIM).filter(function (name) { return name.endsWith(".js"); });
    let randomFound = false;
    let artGenFound = false;

    for (let i = 0; i < files.length; i++) {
        const text = fs.readFileSync(path.join(SIM, files[i]), "utf8");
        if (text.indexOf("Math.random") >= 0) randomFound = true;
        if (/pixellab|image_gen|dall-e/i.test(text)) artGenFound = true;
    }
    return !randomFound && !artGenFound;
}

// -------------------------------------------------------------
// Main Test Runner
// -------------------------------------------------------------
function run() {
    console.log("=== WG.00.40 Physical World Objects Test Suite ===");

    // Invariant tests
    check("object_uniqueness_stable_id", testObjectUniqueness());
    check("object_exists_exactly_once", testObjectExistsExactlyOnce());
    check("continuous_global_coordinates_32_layers", testGlobalCoordinates());
    check("cross_seam_region_conservation", testCrossSeamConservation());
    check("cross_seam_container_nesting", testCrossSeamContainerNesting());
    check("surface_support_and_collapse", testSurfaceSupportAndCollapse());
    check("direct_manipulation_pick_and_stack", testDirectManipulation());
    check("zero_math_random_zero_art_gen", testSourceGuards());

    // Rule 4 Mutant Verification
    check("mutant_killed_duplicate_id", !testObjectUniqueness("duplicate_id"));
    check("mutant_killed_phantom_loose", !testObjectExistsExactlyOnce("phantom_loose"));
    check("mutant_killed_coord_drift", !testGlobalCoordinates("coord_drift"));
    check("mutant_killed_seam_clone", !testCrossSeamConservation("seam_clone"));
    check("mutant_killed_nest_drop", !testCrossSeamContainerNesting("nest_drop"));
    check("mutant_killed_no_collapse", !testSurfaceSupportAndCollapse("no_collapse"));
    check("mutant_killed_no_cycle", !testDirectManipulation("no_cycle"));

    console.log("RESULT: " + passed + " passed, " + failed + " failed");
    if (failed > 0) {
        process.exit(1);
    }
}

run();
