"use strict";

/**
 * game/js/sim/structural/collapse.js
 *
 * Project DEUS Cascading Collapse Engine (NAT.02.01).
 * Identifies unsupported solid cells, executes downward cascading failure,
 * converts collapsed strata into loose rubble item entities, and guarantees
 * exact mass conservation via the ledger.
 */

const { evalCellSupport } = require("./support.js");

const CELL_VOLUME_CUFT = 50.0; // 5 ft x 5 ft x 2 ft stratum

/**
 * Executes cascading collapse on a collection of cells.
 * @param {Array<Object>} cells - Candidate cells in volume
 * @param {Object} worldState - World simulation state
 * @param {Object} ledger - Authoritative mass ledger
 * @returns {{ collapsedCount: number, displacedMass: number, rubbleItemsCreated: number }}
 */
function executeCollapse(cells, worldState, ledger) {
    if (!cells || !cells.length) {
        return { collapsedCount: 0, displacedMass: 0, rubbleItemsCreated: 0 };
    }

    let collapsedCount = 0;
    let displacedMass = 0;
    let rubbleItemsCreated = 0;

    // Iterative cascade: cells that lose support may cause adjacent/above cells to collapse
    let changed = true;
    let iterations = 0;
    const MAX_CASCADE_ITERATIONS = 32;

    while (changed && iterations < MAX_CASCADE_ITERATIONS) {
        changed = false;
        iterations++;

        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (!cell.solid || !cell.supported) continue;

            // Re-evaluate support with updated neighbor state
            const support = evalCellSupport(cell, cell.material, cell.neighborBelow, cell.neighborHoriz);
            if (!support.supported) {
                cell.supported = false;
                cell.solid = false;
                cell.type = "open_air";

                // Calculate exact mass converted from solid to rubble
                const density = (cell.material && cell.material.density) || 165.0; // lbs/cu ft default rock
                const mass = CELL_VOLUME_CUFT * density;

                displacedMass += mass;
                collapsedCount++;

                // Ledger mass conservation: transfer mass from solid environmental terrain to loose rubble items
                if (ledger) {
                    if (typeof ledger.transferMass === "function") {
                        ledger.transferMass("terrain_solid", "items_rubble", mass);
                    } else {
                        ledger.rubble = (ledger.rubble || 0) + mass;
                        if (ledger.solid != null) ledger.solid -= mass;
                    }
                }

                rubbleItemsCreated++;
                changed = true;
            }
        }
    }

    return {
        collapsedCount,
        displacedMass,
        rubbleItemsCreated
    };
}

module.exports = {
    CELL_VOLUME_CUFT,
    executeCollapse
};
