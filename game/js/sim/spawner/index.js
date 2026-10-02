"use strict";
// Spawner sim modules (DEC-073, DEC-080). Plugins load this through UF.Sim.require("spawner") (it resolves spawner/index.js); tests require it.
// WG.65.04: world-wide spawn density from the seed, for the sky view. See global_density.js.

const globalDensity = require("./global_density");

module.exports = {
    globalDensity: globalDensity,
    computeGlobalDensity: globalDensity.computeGlobalDensity,
    densityAt: globalDensity.densityAt,
    configFromCatalog: globalDensity.configFromCatalog,
    loadDefaultConfig: globalDensity.loadDefaultConfig,
    at: globalDensity.at
};
