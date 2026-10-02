"use strict";

/**
 * game/js/sim/structural/index.js
 *
 * Public API for Project DEUS Structural Mechanics & Cascading Collapse (NAT.02.01).
 * Rooted support topology (lane-en): docs/systems/DEUS_Structural.md.
 */

const { evalCellSupport } = require("./support.js");
const { executeCollapse, CELL_VOLUME_CUFT } = require("./collapse.js");
const rooted = require("./rooted.js");
const reader = require("./reader.js");
const levelsReader = require("./levels_reader.js");
const commit = require("./commit.js");
const occupants = require("./occupants.js");

module.exports = {
    evalCellSupport,
    executeCollapse,
    CELL_VOLUME_CUFT,

    // Rooted support (pure; reads geometry through a StrataReader)
    evaluateMember: rooted.evaluateMember,
    createRootedJob: rooted.createRootedJob,
    createOpsCounter: rooted.createOpsCounter,
    bandOf: rooted.bandOf,
    spanBaseFor: rooted.spanBaseFor,
    spanEffOf: rooted.spanEffOf,
    S_MAX: rooted.S_MAX,
    SPAN_THICKNESS: rooted.SPAN_THICKNESS,

    // StrataReader contract helpers and the fixture reader
    createFixtureReader: reader.createFixtureReader,
    FIXTURE_MATERIALS: reader.FIXTURE_MATERIALS,
    READER_PENDING: reader.PENDING,
    gOf: reader.gOf,
    zOfG: reader.zOfG,
    sOfG: reader.sOfG,

    // Levels reader, fall commit and occupant plan (NAT.02.01 part 3)
    createLevelsReader: levelsReader.createLevelsReader,
    commitFall: commit.commitFall,
    planOccupants: occupants.planOccupants
};
