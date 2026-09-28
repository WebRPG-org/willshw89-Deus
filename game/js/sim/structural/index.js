"use strict";

/**
 * game/js/sim/structural/index.js
 *
 * Public API for Project DEUS Structural Mechanics & Cascading Collapse (NAT.02.01).
 */

const { evalCellSupport } = require("./support.js");
const { executeCollapse, CELL_VOLUME_CUFT } = require("./collapse.js");

module.exports = {
    evalCellSupport,
    executeCollapse,
    CELL_VOLUME_CUFT
};
