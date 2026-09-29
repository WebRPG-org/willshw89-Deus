"use strict";

/**
 * game/js/sim/geomorphology/index.js
 *
 * Public API for Project DEUS Geomorphology & Soil Kernel (NAT.04.01).
 */

const {
    SoilStratum,
    GeomorphologyEngine,
    encodeStratumId,
    decodeStratumId,
    canonicalEdgeKey,
    VOLUME_PER_STRATUM,
    WATER_DENSITY_CP_PER_CUFT,
    MAX_WATER_MASS_PER_STRATUM
} = require("./soil.js");

module.exports = {
    SoilStratum,
    GeomorphologyEngine,
    encodeStratumId,
    decodeStratumId,
    canonicalEdgeKey,
    VOLUME_PER_STRATUM,
    WATER_DENSITY_CP_PER_CUFT,
    MAX_WATER_MASS_PER_STRATUM
};
