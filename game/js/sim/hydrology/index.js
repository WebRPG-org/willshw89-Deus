"use strict";

/**
 * game/js/sim/hydrology/index.js
 *
 * Project DEUS Hydrology Subsystem Entry Point (NAT.03.01).
 * Exposes unified API for strata aquifer storage, Darcy seepage,
 * canonical edge residuals, and double-sided clamping.
 *
 * NAT.03.02 (lane-ea) adds the water authority entry point, createWaterAuthority,
 * over the open-fluid cp store in open.js. The aquifer exports keep their names
 * and targets. Contract: docs/systems/DEUS_WaterAuthority.md.
 */

const aquifer = require("./aquifer.js");
const open = require("./open.js");

const WATER_AUTHORITY_SCHEMA = "deus.water.authority/1";

/**
 * createWaterAuthority({ host, densities, budget }) -> authority
 * The single entry point for fluid state (DESIGN-D2 section 3.2). At this
 * checkpoint it holds the open-fluid store; groundwater exchange, water return,
 * lava sources and scheduling join it in later NAT.03 lanes. No camera, RMMZ or
 * UF references; the host supplies geometry.
 */
function createWaterAuthority(options) {
    const store = open.createOpenFluid(options);
    return {
        schema: WATER_AUTHORITY_SCHEMA,
        classes: store.classes,
        registerGeologicalSources: manifest => store.registerSources(manifest),
        release: (sourceId, ref, cp, cause) => store.release(sourceId, ref, cp, cause),
        step: budget => store.step(budget),
        wake: ref => store.wake(ref),
        fluidAt: ref => store.fluidAt(ref),
        depthView: ref => store.depthView(ref),
        typeView: ref => store.typeView(ref),
        capacityAt: (ref, cls) => store.capacityAt(ref, cls),
        totals: () => store.totals(),
        sourceRemaining: id => store.sourceRemaining(id),
        queued: () => store.queued(),
        serialize: () => ({ schema: WATER_AUTHORITY_SCHEMA, open: store.serialize() }),
        deserialize(data) {
            if (!data || data.schema !== WATER_AUTHORITY_SCHEMA) {
                const e = new Error("E_SAVE: unsupported water authority schema " + String(data && data.schema));
                e.code = "E_SAVE";
                throw e;
            }
            store.deserialize(data.open);
        }
    };
}

module.exports = {
    Stratum: aquifer.Stratum,
    AquiferEngine: aquifer.AquiferEngine,
    encodeStratumId: aquifer.encodeStratumId,
    decodeStratumId: aquifer.decodeStratumId,
    canonicalEdgeKey: aquifer.canonicalEdgeKey,
    calcInterfaceConductivity: aquifer.calcInterfaceConductivity,
    MAX_WATER_MASS_PER_STRATUM: aquifer.MAX_WATER_MASS_PER_STRATUM,
    VOLUME_PER_STRATUM: aquifer.VOLUME_PER_STRATUM,
    WATER_DENSITY_CENTIPOUNDS_PER_CUFT: aquifer.WATER_DENSITY_CENTIPOUNDS_PER_CUFT,
    createWaterAuthority,
    WATER_AUTHORITY_SCHEMA
};
