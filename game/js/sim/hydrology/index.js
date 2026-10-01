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
 *
 * NAT.03.03 (lane-eb) adds water return (cycle.js) to an authority created with
 * a surface provider. Without one the authority is the NAT.03.02 checkpoint,
 * unchanged.
 */

const aquifer = require("./aquifer.js");
const open = require("./open.js");
const cycle = require("./cycle.js");

const WATER_AUTHORITY_SCHEMA = "deus.water.authority/1";

function fail(code, message) {
    const e = new Error(code + ": " + message);
    e.code = code;
    throw e;
}

/**
 * createWaterAuthority({ host, densities, budget, surface, waterReturn }) -> authority
 * The single entry point for fluid state (DESIGN-D2 section 3.2). It holds the
 * open-fluid store and, when options.surface (the sky-exposed water provider) is
 * given, the water-return inventory; groundwater exchange, lava sources and
 * scheduling join it in later NAT.03 lanes. No camera, RMMZ or UF references;
 * the host supplies geometry.
 */
function createWaterAuthority(options) {
    const store = open.createOpenFluid(options);
    const opts = options || {};
    if (opts.surface === undefined) {
        if (opts.waterReturn !== undefined) fail("E_HOST", "options.waterReturn needs options.surface");
        return checkpointAuthority(store);
    }
    const ret = cycle.createCycle({ host: opts.host, surface: opts.surface, tuning: opts.waterReturn });
    return returnAuthority(store, ret, opts.budget === undefined ? open.DEFAULT_BUDGET : opts.budget);
}

// The NAT.03.02 contract checkpoint: the open-fluid store alone.
function checkpointAuthority(store) {
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
            if (data.cycle !== undefined) fail("E_SAVE", "the save holds return water; load it into an authority created with a surface provider");
            store.deserialize(data.open);
        }
    };
}

// The open-fluid store and the water-return cycle under one step budget and one
// record sequence: every record the authority returns takes the next row.
function returnAuthority(store, ret, defaultBudget) {
    const stampAll = recs => { for (const rec of recs) ret.stamp(rec); return recs; };
    return {
        schema: WATER_AUTHORITY_SCHEMA,
        classes: store.classes,
        registerGeologicalSources: manifest => stampAll(store.registerSources(manifest)),
        release(sourceId, ref, cp, cause) {
            const rec = store.release(sourceId, ref, cp, cause);
            return rec && ret.stamp(rec);
        },
        /**
         * One simulation tick. Open flow and water return share the budget; the
         * one served first alternates by tick, so neither waits on the other for
         * more than a tick. Returns { work, probes, records, queued }: probes
         * count host and surface-provider calls, queued the open-fluid visits.
         */
        step(budgetArg) {
            const budget = budgetArg === undefined ? defaultBudget : budgetArg;
            if (!Number.isSafeInteger(budget) || budget < 0) fail("E_BUDGET", "budget must be a nonnegative integer");
            const records = [];
            let work = 0, probes = 0;
            const runOpen = () => {
                const r = store.step(budget - work);
                work += r.work; probes += r.probes;
                for (const rec of r.records) records.push(ret.stamp(rec));
            };
            const runReturn = () => {
                const r = ret.service(budget - work, records);
                work += r.work; probes += r.probes;
            };
            if (ret.tick() % 2 === 0) { runOpen(); runReturn(); } else { runReturn(); runOpen(); }
            ret.endTick();
            return { work, probes, records, queued: store.queued() };
        },
        wake: ref => store.wake(ref),
        fluidAt: ref => store.fluidAt(ref),
        depthView: ref => store.depthView(ref),
        typeView: ref => store.typeView(ref),
        capacityAt: (ref, cls) => store.capacityAt(ref, cls),
        totals() {
            const t = store.totals();
            t.water.return = ret.total();
            return t;
        },
        sourceRemaining: id => store.sourceRemaining(id),
        queued: () => store.queued(),
        credit: (cp, cause, from) => ret.credit(cp, cause, from),
        returnStatus: () => ret.status(),
        serialize: () => ({ schema: WATER_AUTHORITY_SCHEMA, open: store.serialize(), cycle: ret.serialize() }),
        // All or nothing: the return payload is validated before the open store
        // loads, and committed only after it loaded.
        deserialize(data) {
            if (!data || data.schema !== WATER_AUTHORITY_SCHEMA) fail("E_SAVE", "unsupported water authority schema " + String(data && data.schema));
            const next = ret.parse(data.cycle);
            store.deserialize(data.open);
            ret.commit(next);
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
