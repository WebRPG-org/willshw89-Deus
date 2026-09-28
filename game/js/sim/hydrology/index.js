"use strict";

/**
 * game/js/sim/hydrology/index.js
 *
 * Project DEUS Hydrology Subsystem Entry Point (NAT.03.01).
 * Exposes unified API for strata aquifer storage, Darcy seepage,
 * canonical edge residuals, and double-sided clamping.
 */

const aquifer = require("./aquifer.js");

module.exports = {
    Stratum: aquifer.Stratum,
    AquiferEngine: aquifer.AquiferEngine,
    encodeStratumId: aquifer.encodeStratumId,
    decodeStratumId: aquifer.decodeStratumId,
    canonicalEdgeKey: aquifer.canonicalEdgeKey,
    calcInterfaceConductivity: aquifer.calcInterfaceConductivity,
    MAX_WATER_MASS_PER_STRATUM: aquifer.MAX_WATER_MASS_PER_STRATUM,
    VOLUME_PER_STRATUM: aquifer.VOLUME_PER_STRATUM,
    WATER_DENSITY_CENTIPOUNDS_PER_CUFT: aquifer.WATER_DENSITY_CENTIPOUNDS_PER_CUFT
};
