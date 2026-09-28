#!/usr/bin/env node
"use strict";

/**
 * tools/test_structural_collapse.js
 *
 * Gate test suite for Project DEUS Structural Support & Cascading Collapse Engine (NAT.02.01).
 * Verifies:
 * - Vertical compressive load propagation.
 * - Horizontal tensile cantilever limits.
 * - Cascading structural collapse of unsupported spans.
 * - Exact mass conservation via the ledger.
 * - Negative controls (mutants) demonstrating tests are able to fail (AGENTS.md Rule 4).
 */

const { evalCellSupport, executeCollapse, CELL_VOLUME_CUFT } = require("../game/js/sim/structural/index.js");

let passes = 0;
let failures = 0;

function check(desc, condition, detail) {
    if (condition) {
        passes++;
        console.log(`PASS: ${desc} - ${detail || "OK"}`);
    } else {
        failures++;
        console.error(`FAIL: ${desc} - ${detail || "Condition false"}`);
    }
}

function createCell(x, y, solid, supported, material) {
    return {
        position: { x, y },
        solid,
        supported,
        material: material || { density: 165.0, tensileYield: 1000 },
        type: solid ? "solid" : "open_air"
    };
}

function runTests(mutant = null) {
    console.log(`=== NAT.02.01 Structural Collapse Gate Tests ${mutant ? `[MUTANT: ${mutant}]` : "[BASELINE]"} ===`);

    const granite = { density: 165.0, tensileYield: 5000 }; // max span = 5000 / (165 * 10) = 3 cells

    // 1. Vertical compressive support
    const bottom = createCell(0, 0, true, true, granite);
    const top = createCell(0, 1, true, false, granite);
    top.neighborBelow = bottom;

    const resVert = evalCellSupport(top, granite, bottom, null);
    check(
        "test_vertical_compressive_support",
        resVert.supported === true && resVert.mode === "vertical",
        `Pillar cell supported vertically: ${resVert.supported}`
    );

    // 2. Short cantilever beam (span = 1 <= maxSpan 3)
    const anchor = createCell(0, 0, true, true, granite);
    const cantileverShort = createCell(1, 0, true, false, granite);
    cantileverShort.neighborHoriz = anchor;

    const resShort = evalCellSupport(cantileverShort, granite, null, anchor);
    check(
        "test_cantilever_short_supported",
        resShort.supported === true && resShort.mode === "cantilever" && resShort.span === 1,
        `1-cell cantilever supported: ${resShort.supported}, span=${resShort.span}`
    );

    // 3. Long cantilever beam (span = 6 > maxSpan 3)
    const cantileverLong = createCell(6, 0, true, false, granite);
    cantileverLong.neighborHoriz = anchor;

    let resLong = evalCellSupport(cantileverLong, granite, null, anchor);
    if (mutant === "infinite_cantilever") {
        resLong = { supported: true, mode: "cantilever", span: 6 }; // Mutant forced pass
    }

    check(
        "test_cantilever_long_unsupported",
        resLong.supported === false && resLong.mode === "unsupported",
        `6-cell cantilever unsupported: ${!resLong.supported}, mode=${resLong.mode}`
    );

    // 4. Cascading collapse execution
    const anchorGrounded = createCell(0, 0, true, true, granite);
    anchorGrounded.groundAnchor = true;

    const mockCells = [
        anchorGrounded,                        // Supported grounded anchor
        createCell(1, 0, true, true, granite),  // Supported cantilever
        createCell(5, 0, true, true, granite),  // Unsupported over-extended cell 1
        createCell(6, 0, true, true, granite)   // Unsupported over-extended cell 2
    ];
    // Attach neighbors
    mockCells[1].neighborHoriz = mockCells[0];
    mockCells[2].neighborHoriz = mockCells[0]; // span 5 -> unsupported
    mockCells[3].neighborHoriz = mockCells[2]; // rests on unsupported cell 2 -> cascade

    const ledger = {
        solid: 100000.0,
        rubble: 0.0,
        transferMass(from, to, mass) {
            this[from] = (this[from] || 0) - mass;
            this[to] = (this[to] || 0) + mass;
        }
    };

    let collapseResult = executeCollapse(mockCells, {}, ledger);
    if (mutant === "no_collapse") {
        collapseResult = { collapsedCount: 0, displacedMass: 0, rubbleItemsCreated: 0 };
    }

    check(
        "test_cascading_collapse_execution",
        collapseResult.collapsedCount === 2 && collapseResult.rubbleItemsCreated === 2,
        `Collapsed count: ${collapseResult.collapsedCount}, Rubble items created: ${collapseResult.rubbleItemsCreated}`
    );

    // 5. Mass ledger conservation
    const expectedMass = 2 * CELL_VOLUME_CUFT * granite.density; // 2 * 50 * 165 = 16,500 lbs
    check(
        "test_mass_conservation_ledger",
        Math.abs(collapseResult.displacedMass - expectedMass) < 0.01 &&
        Math.abs(ledger.items_rubble - expectedMass) < 0.01,
        `Displaced mass: ${collapseResult.displacedMass} lbs, Rubble in ledger: ${ledger.items_rubble} lbs (expected ${expectedMass} lbs)`
    );
}

const mutantArg = process.argv.find(a => a.startsWith("--mutant="));
const mutant = mutantArg ? mutantArg.split("=")[1] : null;

runTests(mutant);

if (failures > 0) {
    console.error(`\nFAILED: ${failures} check(s) failed.`);
    process.exit(1);
} else {
    console.log(`\nALL CHECKS PASSED: ${passes} check(s) verified.`);
    process.exit(0);
}
