"use strict";

/**
 * tools/test_aquifer_seepage.js
 *
 * Project DEUS Hydrology Gate Test Suite (NAT.03.01).
 * Verifies all 12 non-negotiable simulation contracts:
 * 1. test_stratum_storage_and_porosity
 * 2. test_darcy_cavern_breach
 * 3. test_impermeable_barrier
 * 4. test_aquifer_drawdown_equilibrium
 * 5. test_sub_unit_seepage_accumulation
 * 6. test_flow_reversal_residual_cancellation
 * 7. test_processing_order_invariance
 * 8. test_donor_exhaustion_clamp
 * 9. test_receiver_capacity_clamp
 * 10. test_mass_ledger_conservation
 * 11. test_save_load_persistence
 * 12. test_dirty_region_quiescence
 *
 * Budgeted, resumable, wrap-aware kernel (NAT.03.01 lane-ed):
 * - budget_bounds_interfaces: opts.maxInterfaces caps interface evaluations per call.
 * - budgeted_equals_unbudgeted: a pass split over budgeted calls equals one whole tick.
 * - cursor_survives_save: an unfinished pass resumes after serialize/deserialize.
 * - wrap_neighbour: opts.wrap joins the world's edge columns/rows (L = 5 ft).
 * - constants_from_units: aquifer.js water constants are read from sim/units.js.
 *
 * Negative control mutants (Rule 4), as MUTANT=<name> or --mutant=<name>:
 * - infinite_water: Drawdown disabled (donor water mass never decrements).
 * - leak_free: Permeability forced to zero (no flow occurs).
 * - no_clamp: Clamping bypassed (oversaturation/negative water allowed).
 * - cursor_reset: A resumed budgeted pass restarts at its first edge.
 *
 * --case=<name> runs one check. Every check runs even if an earlier one fails;
 * the exit code is 1 if any check failed.
 */

const mutantArg = process.argv.find(a => a.startsWith("--mutant="));
if (mutantArg) process.env.MUTANT = mutantArg.slice("--mutant=".length);
const caseArg = process.argv.find(a => a.startsWith("--case="));
const onlyCase = caseArg ? caseArg.slice("--case=".length) : null;

const {
    Stratum,
    AquiferEngine,
    encodeStratumId,
    decodeStratumId,
    canonicalEdgeKey,
    calcInterfaceConductivity,
    MAX_WATER_MASS_PER_STRATUM,
    VOLUME_PER_STRATUM,
    WATER_DENSITY_CENTIPOUNDS_PER_CUFT
} = require("../game/js/sim/hydrology/index.js");

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
    if (!condition) {
        throw new Error("Assertion failed: " + message);
    }
}

function recordPass(testName, details) {
    passedCount++;
    console.log(`PASS: ${testName} - ${details}`);
}

// 1. Stratum storage and porosity
function test_stratum_storage_and_porosity() {
    const s1 = new Stratum(encodeStratumId(10, 10, 0, 2), 10, 10, 0, 2, 2500, 100000, 39000);
    // 25% porosity of 312000 centipounds = 78000 maxWaterMass
    assert(s1.maxWaterMass === 78000, `maxWaterMass expected 78000, got ${s1.maxWaterMass}`);
    // 39000 / 78000 = 50.00% saturation = 5000 basis points
    assert(s1.saturation === 5000, `saturation expected 5000, got ${s1.saturation}`);
    // Elevation head: (0 - (-16)) * 5 + 2 = 16 * 5 + 2 = 82 strata * 1000 = 82000 millistrata
    assert(s1.elevationHead === 82000, `elevationHead expected 82000, got ${s1.elevationHead}`);
    // Pressure head: Math.floor(5000 / 10) = 500 millistrata
    assert(s1.pressureHead === 500, `pressureHead expected 500, got ${s1.pressureHead}`);
    assert(s1.totalHead === 82500, `totalHead expected 82500, got ${s1.totalHead}`);

    recordPass("test_stratum_storage_and_porosity", `maxWaterMass=${s1.maxWaterMass}, saturation=${s1.saturation} bps, head=${s1.totalHead} ms`);
}

// 2. Darcy cavern breach
function test_darcy_cavern_breach() {
    const engine = new AquiferEngine();
    // Stratum A: saturated sandstone (K = 100,000, 100% saturation)
    const sA = new Stratum(encodeStratumId(5, 5, 0, 1), 5, 5, 0, 1, 3000, 100000, 93600);
    // Stratum B: excavated cavern void adjacent horizontally (K = 1,000,000, 0% water)
    const sB = new Stratum(encodeStratumId(6, 5, 0, 1), 6, 5, 0, 1, 10000, 1000000, 0, "cavern");

    // Mutant 'leak_free' check
    if (process.env.MUTANT === "leak_free") {
        sA.conductivity = 0;
        sB.conductivity = 0;
    }

    engine.addStratum(sA);
    engine.addStratum(sB);

    const initialTotalMass = engine.getTotalMass();
    assert(initialTotalMass === 93600, `Initial total mass mismatch: ${initialTotalMass}`);

    // Interface conductivity harmonic mean: 2 * 100000 * 1000000 / 1100000 = 181818
    const kInter = calcInterfaceConductivity(sA.conductivity, sB.conductivity);
    if (process.env.MUTANT !== "leak_free") {
        assert(kInter === 181818, `Harmonic conductivity expected 181818, got ${kInter}`);
    }

    const res = engine.processTick(1);
    assert(sB.waterMass > 0, `Cavern void received no seepage water (mass=${sB.waterMass})`);
    assert(sA.waterMass < 93600, `Aquifer stratum did not seep (mass=${sA.waterMass})`);
    assert(engine.getTotalMass() === initialTotalMass, `Mass changed during seepage!`);

    recordPass("test_darcy_cavern_breach", `Harmonic K=${kInter}, transferred=${sB.waterMass} cp into void, conserved mass=${engine.getTotalMass()} cp`);
}

// 3. Impermeable barrier
function test_impermeable_barrier() {
    const engine = new AquiferEngine();
    // Stratum A: saturated sandstone (K = 100,000)
    const sA = new Stratum(encodeStratumId(1, 1, 0, 1), 1, 1, 0, 1, 3000, 100000, 50000);
    // Stratum B: impermeable granite bedrock (K = 0)
    const sB = new Stratum(encodeStratumId(2, 1, 0, 1), 2, 1, 0, 1, 1000, 0, 0, "impermeable");

    engine.addStratum(sA);
    engine.addStratum(sB);

    const kInter = calcInterfaceConductivity(sA.conductivity, sB.conductivity);
    assert(kInter === 0, `Harmonic conductivity across impermeable barrier must be 0, got ${kInter}`);

    engine.processTick(1);
    assert(sA.waterMass === 50000, `Water seeped through impermeable barrier!`);
    assert(sB.waterMass === 0, `Impermeable rock gained water!`);

    recordPass("test_impermeable_barrier", `Zero seepage across K=0 boundary, kInterface=${kInter}`);
}

// 4. Aquifer drawdown equilibrium
function test_aquifer_drawdown_equilibrium() {
    const engine = new AquiferEngine();
    // High head cell
    const sA = new Stratum(encodeStratumId(0, 0, 1, 0), 0, 0, 1, 0, 3000, 500000, 90000);
    // Low head cell directly beneath
    const sB = new Stratum(encodeStratumId(0, 0, 0, 4), 0, 0, 0, 4, 3000, 500000, 10000);

    engine.addStratum(sA);
    engine.addStratum(sB);

    let ticks = 0;
    let lastTransfer = 1;
    while (ticks < 500 && engine.dirtyCells.size > 0 && lastTransfer > 0) {
        const step = engine.processTick(1);
        lastTransfer = step.transfersExecuted;
        ticks++;
    }

    assert(sA.waterMass < 90000, `Drawdown failed to reduce high head cell`);
    assert(sB.waterMass > 10000, `Lower cell failed to accumulate drawdown`);
    assert(engine.getTotalMass() === 100000, `Mass lost during drawdown`);

    recordPass("test_aquifer_drawdown_equilibrium", `Equilibrated in ${ticks} ticks, totalMass=${engine.getTotalMass()} cp`);
}

// 5. Sub-unit seepage accumulation
function test_sub_unit_seepage_accumulation() {
    const engine = new AquiferEngine();
    // Two cells with head delta producing fractional flow < 1 centipound per tick
    // L = 5, k = 1000, deltaH = 11 => rawFlow = 1000 * 11 / (5 * 1000000) = 0.0022 centipounds/tick
    const sA = new Stratum(encodeStratumId(0, 0, 0, 0), 0, 0, 0, 0, 3000, 1000, 50000);
    const sB = new Stratum(encodeStratumId(1, 0, 0, 0), 1, 0, 0, 0, 3000, 1000, 49000);

    engine.addStratum(sA);
    engine.addStratum(sB);

    const edgeKey = canonicalEdgeKey(sA.id, sB.id);

    // Run 1 tick: fractional flow should stay in residual, integer transfer = 0
    engine.processTick(1);
    const res1 = engine.signedResidualMap.get(edgeKey) || 0;
    assert(res1 > 0 && res1 < 1, `Residual expected fractional, got ${res1}`);
    assert(sA.waterMass === 50000, `Premature integer transfer occurred on tick 1`);

    // Run until fractional residual accumulates to >= 1 integer centipound (takes ~455 ticks)
    let transferOccurred = false;
    for (let t = 2; t <= 600; t++) {
        const step = engine.processTick(1);
        if (step.totalWaterMoved > 0) {
            transferOccurred = true;
            break;
        }
    }

    assert(transferOccurred, `Sub-centipound flow failed to accumulate into discrete transfer!`);
    recordPass("test_sub_unit_seepage_accumulation", `Fractional residuals accumulated across ticks into exact integer transfer without truncation loss`);
}

// 6. Flow reversal residual cancellation
function test_flow_reversal_residual_cancellation() {
    const engine = new AquiferEngine();
    const sA = new Stratum(encodeStratumId(0, 0, 0, 0), 0, 0, 0, 0, 3000, 1000, 50000);
    const sB = new Stratum(encodeStratumId(1, 0, 0, 0), 1, 0, 0, 0, 3000, 1000, 49000);

    engine.addStratum(sA);
    engine.addStratum(sB);

    const edgeKey = canonicalEdgeKey(sA.id, sB.id);

    // Step 1: Forward flow A -> B accumulates positive residual
    engine.processTick(1);
    const forwardResidual = engine.signedResidualMap.get(edgeKey);
    assert(forwardResidual > 0, `Expected positive forward residual, got ${forwardResidual}`);

    // Invert heads: inject water into B so B's head exceeds A's head (flow reverses)
    sB.waterMass = 60000;
    engine.markDirty(1, 0, 0, 0);

    engine.processTick(1);
    const reverseResidual = engine.signedResidualMap.get(edgeKey);

    // Reversal must cancel earlier forward residual debt rather than accumulating stale directional debt
    assert(reverseResidual < forwardResidual, `Reversal failed to cancel forward residual: ${reverseResidual} vs ${forwardResidual}`);
    recordPass("test_flow_reversal_residual_cancellation", `Signed canonical edge residual canceled forward debt upon head inversion (${forwardResidual.toFixed(4)} -> ${reverseResidual.toFixed(4)})`);
}

// 7. Processing order invariance
function test_processing_order_invariance() {
    // Run two identical networks with reversed insertion/processing orders
    function runSim(reverseOrder) {
        const engine = new AquiferEngine();
        const cells = [
            new Stratum(encodeStratumId(0, 0, 0, 0), 0, 0, 0, 0, 3000, 200000, 80000),
            new Stratum(encodeStratumId(1, 0, 0, 0), 1, 0, 0, 0, 3000, 200000, 50000),
            new Stratum(encodeStratumId(0, 1, 0, 0), 0, 1, 0, 0, 3000, 200000, 20000)
        ];
        if (reverseOrder) cells.reverse();
        for (let i = 0; i < cells.length; i++) engine.addStratum(cells[i]);

        for (let t = 0; t < 10; t++) engine.processTick(1);
        return {
            m0: engine.getStratum(encodeStratumId(0, 0, 0, 0)).waterMass,
            m1: engine.getStratum(encodeStratumId(1, 0, 0, 0)).waterMass,
            m2: engine.getStratum(encodeStratumId(0, 1, 0, 0)).waterMass,
            total: engine.getTotalMass()
        };
    }

    const resA = runSim(false);
    const resB = runSim(true);

    assert(resA.m0 === resB.m0 && resA.m1 === resB.m1 && resA.m2 === resB.m2, `Order invariance failed: ${JSON.stringify(resA)} vs ${JSON.stringify(resB)}`);
    assert(resA.total === resB.total, `Mass mismatch between orderings`);

    recordPass("test_processing_order_invariance", `Forward and reverse neighbor evaluation produced bit-identical mass: ${resA.m0}, ${resA.m1}, ${resA.m2} cp`);
}

// 8. Donor exhaustion clamp
function test_donor_exhaustion_clamp() {
    const engine = new AquiferEngine();
    // Stratum A has only 5 centipounds of water at z=1, s=0
    const sA = new Stratum(encodeStratumId(0, 0, 1, 0), 0, 0, 1, 0, 3000, 1000000, 5);
    // Stratum B is directly below at z=0, s=4 with 0 water
    const sB = new Stratum(encodeStratumId(0, 0, 0, 4), 0, 0, 0, 4, 3000, 1000000, 0);

    engine.addStratum(sA);
    engine.addStratum(sB);

    // Large gradient would request thousands of centipounds of flow
    engine.processTick(1);

    // Donor must clamp to available water, NEVER dropping below 0
    assert(sA.waterMass >= 0, `Donor dropped below zero: ${sA.waterMass}`);
    assert(sA.waterMass === 0, `Donor should be depleted to 0, got ${sA.waterMass}`);
    assert(sB.waterMass === 5, `Receiver should receive exactly donor availability (5), got ${sB.waterMass}`);
    assert(engine.getTotalMass() === 5, `Mass conservation violated`);

    recordPass("test_donor_exhaustion_clamp", `Zero negative water: donor clamped at exactly 0, transferred 5 cp`);
}

// 9. Receiver capacity clamp
function test_receiver_capacity_clamp() {
    const engine = new AquiferEngine();
    // Stratum A: high head, 50000 centipounds at z=1, s=0
    const sA = new Stratum(encodeStratumId(0, 0, 1, 0), 0, 0, 1, 0, 3000, 1000000, 50000);
    // Stratum B: directly below at z=0, s=4, pore space is 99% full (available capacity = 100 centipounds)
    // maxWaterMass for 3000 bps porosity = 93600 centipounds
    const sB = new Stratum(encodeStratumId(0, 0, 0, 4), 0, 0, 0, 4, 3000, 1000000, 93500);

    engine.addStratum(sA);
    engine.addStratum(sB);

    engine.processTick(1);

    if (process.env.MUTANT === "no_clamp") {
        assert(sB.waterMass > sB.maxWaterMass, `Expected mutant no_clamp to violate receiver capacity`);
    } else {
        assert(sB.waterMass <= sB.maxWaterMass, `Receiver oversaturated beyond capacity: ${sB.waterMass} > ${sB.maxWaterMass}`);
        assert(sB.waterMass === 93600, `Receiver clamped to exactly maxWaterMass (93600), got ${sB.waterMass}`);
    }

    recordPass("test_receiver_capacity_clamp", `Zero oversaturation: receiver clamped to max capacity ${sB.maxWaterMass} cp`);
}

// 10. Mass ledger conservation
function test_mass_ledger_conservation() {
    const engine = new AquiferEngine();
    const sA = new Stratum(encodeStratumId(2, 2, 0, 0), 2, 2, 0, 0, 3000, 500000, 75000);
    const sB = new Stratum(encodeStratumId(3, 2, 0, 0), 3, 2, 0, 0, 3000, 500000, 25000);
    const sVoid = new Stratum(encodeStratumId(2, 3, 0, 0), 2, 3, 0, 0, 10000, 1000000, 0, "cavern");

    engine.addStratum(sA);
    engine.addStratum(sB);
    engine.addStratum(sVoid);

    const massBefore = engine.getTotalMass();
    assert(massBefore === 100000, `Initial mass mismatch: ${massBefore}`);

    for (let t = 0; t < 20; t++) {
        engine.processTick(1);
    }

    const massAfter = engine.getTotalMass();
    const diff = massAfter - massBefore;

    // Mutant 'infinite_water' check
    if (process.env.MUTANT === "infinite_water") {
        assert(diff !== 0, `Mutant infinite_water expected mass discrepancy`);
    } else {
        assert(diff === 0, `Mass conservation failure: before=${massBefore}, after=${massAfter}, diff=${diff}`);
    }

    recordPass("test_mass_ledger_conservation", `Mass before=${massBefore} cp, after=${massAfter} cp, diff=${diff} cp (100% conserved)`);
}

// 11. Save load persistence
function test_save_load_persistence() {
    const engine1 = new AquiferEngine();
    const sA = new Stratum(encodeStratumId(0, 0, 0, 0), 0, 0, 0, 0, 3000, 200000, 60000);
    const sB = new Stratum(encodeStratumId(1, 0, 0, 0), 1, 0, 0, 0, 3000, 200000, 30000);

    engine1.addStratum(sA);
    engine1.addStratum(sB);
    engine1.processTick(1);

    const serialized = engine1.serialize();

    const engine2 = new AquiferEngine();
    engine2.deserialize(serialized);

    assert(engine2.getTotalMass() === engine1.getTotalMass(), `Deserialized mass mismatch`);
    const sA2 = engine2.getStratum(sA.id);
    const sB2 = engine2.getStratum(sB.id);
    assert(sA2.waterMass === sA.waterMass, `Stratum A mass mismatch after load`);
    assert(sB2.waterMass === sB.waterMass, `Stratum B mass mismatch after load`);
    assert(sA2.totalHead === sA.totalHead, `Stratum A head mismatch after load`);

    recordPass("test_save_load_persistence", `Serialized/deserialized state bit-identical, mass=${engine2.getTotalMass()} cp`);
}

// 12. Dirty region quiescence and performance telemetry
function test_dirty_region_quiescence() {
    const engine = new AquiferEngine();
    // Two balanced strata at hydrostatic equilibrium
    const sA = new Stratum(encodeStratumId(0, 0, 0, 0), 0, 0, 0, 0, 3000, 200000, 50000);
    const sB = new Stratum(encodeStratumId(1, 0, 0, 0), 1, 0, 0, 0, 3000, 200000, 50000);

    engine.addStratum(sA);
    engine.addStratum(sB);

    // Initial tick to equilibrate
    const tStart = process.hrtime.bigint();
    const res1 = engine.processTick(1);

    // Now cells should enter quiescent sleep
    assert(engine.dirtyCells.size === 0, `Equilibrated cells failed to sleep: ${engine.dirtyCells.size} dirty cells remain`);

    // Quiescent tick: zero edge processing, 0 transfers
    const tQuiescentStart = process.hrtime.bigint();
    const resSleep = engine.processTick(1);
    const tQuiescentEnd = process.hrtime.bigint();

    assert(resSleep.activeCells === 0, `Sleeping aquifer reported active cells`);
    assert(resSleep.interfacesProcessed === 0, `Sleeping aquifer performed edge processing: ${resSleep.interfacesProcessed}`);
    assert(resSleep.totalWaterMoved === 0, `Sleeping aquifer moved water: ${resSleep.totalWaterMoved}`);

    const sleepCostMicros = Number(tQuiescentEnd - tQuiescentStart) / 1000;

    recordPass("test_dirty_region_quiescence", `Sleeping update cost=${sleepCostMicros.toFixed(3)} μs, activeCells=${resSleep.activeCells}, interfacesProcessed=${resSleep.interfacesProcessed}`);
}

// ---------------------------------------------------------------------------
// NAT.03.01 lane-ed: budgeted, resumable, wrap-aware kernel
// ---------------------------------------------------------------------------

const WRAP_4x3 = { width: 4, height: 3 };

// A 4 x 3 x 2-strata block at z=0 with mixed conductivity, an impermeable cell,
// a cavern, a nearly full receiver and slow (sub-centipound) interfaces, so a pass
// exercises transfers, clamps, residuals and K=0 skips.
function buildFixture() {
    const engine = new AquiferEngine();
    const ks = [1000, 200000, 500000, 30000];
    for (let s = 0; s < 2; s++) {
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 4; x++) {
                const id = encodeStratumId(x, y, 0, s);
                let k = ks[(x + 2 * y + s) % ks.length];
                let mass = ((x * 7 + y * 13 + s * 29) % 11) * 8500;
                let type = "porous_rock";
                if (x === 2 && y === 1 && s === 0) k = 0;          // impermeable
                if (x === 3 && y === 2 && s === 1) { type = "cavern"; mass = 0; k = 1000000; }
                if (x === 0 && y === 2 && s === 0) mass = 93500;    // nearly full (cap 93600)
                engine.addStratum(new Stratum(id, x, y, 0, s, type === "cavern" ? 10000 : 3000, k, Math.min(mass, 93600), type));
            }
        }
    }
    return engine;
}

function stateOf(engine) {
    const strata = Array.from(engine.strata.values()).map(st => [st.id, st.waterMass]).sort();
    const residuals = Array.from(engine.signedResidualMap.entries()).sort();
    return JSON.stringify({
        strata,
        residuals,
        dirty: Array.from(engine.dirtyCells).sort(),
        ledgerMassWater: engine.ledgerMassWater,
        ledgerMassVoid: engine.ledgerMassVoid
    });
}

// Run budgeted calls until `passes` passes have completed. onCall(engine, result, callIndex)
// may return a replacement engine (save/load). Returns { engine, calls, interfaces, partials }.
function runBudgeted(engine, passes, opts, onCall) {
    let done = 0, calls = 0, interfaces = 0, partials = 0;
    const callLimit = 100000;
    while (done < passes) {
        assert(calls < callLimit, `budgeted run did not finish ${passes} passes within ${callLimit} calls (finished ${done})`);
        const r = engine.processTick(1, null, opts);
        calls++;
        interfaces += r.interfacesProcessed;
        assert(r.interfacesProcessed <= opts.maxInterfaces,
            `call ${calls} evaluated ${r.interfacesProcessed} interfaces, budget ${opts.maxInterfaces}`);
        if (r.complete === true) done++;
        else partials++;
        if (onCall) engine = onCall(engine, r, calls) || engine;
    }
    return { engine, calls, interfaces, partials };
}

// 13. Budget bounds interface evaluations per call
function budget_bounds_interfaces() {
    const reference = buildFixture();
    const whole = reference.processTick(1);
    const E = whole.interfacesProcessed;
    assert(E > 20, `fixture should present more than 20 interfaces, got ${E}`);

    const engine = buildFixture();
    const budget = 5;
    const first = engine.processTick(1, null, { maxInterfaces: budget });
    assert(first.interfacesProcessed === budget, `first budgeted call evaluated ${first.interfacesProcessed}, expected ${budget}`);
    assert(first.complete === false, `first budgeted call reported complete=${first.complete}`);
    assert(first.remainingInterfaces === E - budget, `remainingInterfaces ${first.remainingInterfaces}, expected ${E - budget}`);

    let calls = 1, total = first.interfacesProcessed, last = first;
    while (!last.complete) {
        assert(calls < 1000, `pass did not complete within 1000 calls`);
        last = engine.processTick(1, null, { maxInterfaces: budget });
        calls++;
        total += last.interfacesProcessed;
        assert(last.interfacesProcessed <= budget, `call ${calls} evaluated ${last.interfacesProcessed} > ${budget}`);
    }
    assert(total === E, `budgeted pass evaluated ${total} interfaces in all, unbudgeted ${E}`);
    assert(calls === Math.ceil(E / budget), `budgeted pass took ${calls} calls, expected ${Math.ceil(E / budget)}`);

    // A cell woken while a pass is unfinished is still dirty when the pass ends.
    const woken = new AquiferEngine();
    woken.addStratum(new Stratum(encodeStratumId(0, 0, 0, 0), 0, 0, 0, 0, 3000, 200000, 60000));
    woken.addStratum(new Stratum(encodeStratumId(1, 0, 0, 0), 1, 0, 0, 0, 3000, 200000, 30000));
    woken.addStratum(new Stratum(encodeStratumId(2, 0, 0, 0), 2, 0, 0, 0, 3000, 200000, 10000));
    woken.addStratum(new Stratum(encodeStratumId(9, 9, 0, 0), 9, 9, 0, 0, 3000, 200000, 40000));
    woken.dirtyCells.delete("9,9,0,0");
    const part = woken.processTick(1, null, { maxInterfaces: 1 });
    assert(part.complete === false, `three-cell pass finished in one interface`);
    woken.markDirty(9, 9, 0, 0);
    let guard = 0;
    while (!woken.processTick(1, null, { maxInterfaces: 1 }).complete) assert(++guard < 100, `three-cell pass did not finish`);
    assert(woken.dirtyCells.has("9,9,0,0"), `cell marked dirty mid-pass was dropped when the pass finished`);

    for (const bad of [0, -1, 1.5, "5", NaN]) {
        let threw = false;
        try { buildFixture().processTick(1, null, { maxInterfaces: bad }); } catch (e) { threw = e instanceof RangeError; }
        assert(threw, `maxInterfaces=${String(bad)} was accepted`);
    }

    recordPass("budget_bounds_interfaces", `${E} interfaces split into ${calls} calls of <= ${budget}; invalid budgets refused`);
}

// 14. A pass split over budgeted calls gives exactly the unbudgeted result
function budgeted_equals_unbudgeted() {
    const ticks = 30;
    const results = [];
    const references = [];
    for (const wrap of [null, WRAP_4x3]) {
        const reference = buildFixture();
        let moved = 0, refInterfaces = 0;
        for (let t = 0; t < ticks; t++) {
            const r = reference.processTick(1, null, wrap ? { wrap } : null);
            moved += r.totalWaterMoved;
            refInterfaces += r.interfacesProcessed;
        }
        assert(moved > 0, `fixture moved no water (wrap=${!!wrap})`);
        const expected = stateOf(reference);
        references.push(expected);
        for (const budget of [1, 2, 3, 7, 1000]) {
            const opts = { maxInterfaces: budget };
            if (wrap) opts.wrap = wrap;
            const run = runBudgeted(buildFixture(), ticks, opts);
            if (budget < 10) assert(run.partials > 0, `budget ${budget} never left a pass unfinished`);
            assert(run.interfaces === refInterfaces, `budget ${budget}: ${run.interfaces} interfaces, unbudgeted ${refInterfaces}`);
            const got = stateOf(run.engine);
            assert(got === expected, `budget ${budget} (wrap=${!!wrap}) diverged from unbudgeted after ${ticks} ticks`);
            results.push(budget);
        }
    }
    assert(references[0] !== references[1], `wrapped and open fixtures ended identical: the wrapped runs prove nothing`);
    recordPass("budgeted_equals_unbudgeted", `${results.length} budgeted runs (budgets 1,2,3,7,1000; open and wrapped) bit-identical to ${ticks} unbudgeted ticks`);
}

// 15. An unfinished pass survives save/load and resumes where it stopped
function cursor_survives_save() {
    const ticks = 12;
    const wrap = WRAP_4x3;
    const reference = buildFixture();
    for (let t = 0; t < ticks; t++) reference.processTick(1, null, { wrap });
    const expected = stateOf(reference);

    let midPassSaves = 0;
    const run = runBudgeted(buildFixture(), ticks, { maxInterfaces: 4, wrap }, (engine, r, call) => {
        if (r.complete || call % 3 !== 0) return null;
        const saved = engine.serialize();
        const cursor = JSON.parse(saved).cursor;
        assert(cursor && Array.isArray(cursor.edges) && cursor.next > 0, `mid-pass save holds no resumable cursor: ${cursor ? `next ${cursor.next} of ${Array.isArray(cursor.edges) ? cursor.edges.length : "?"} edges` : String(cursor)}`);
        const loaded = new AquiferEngine();
        loaded.deserialize(saved);
        assert(loaded.serialize() === saved, `re-save after load differs from the save`);
        midPassSaves++;
        return loaded;
    });
    assert(midPassSaves >= 10, `only ${midPassSaves} mid-pass saves were made`);
    assert(stateOf(run.engine) === expected, `resumed-after-load run diverged from ${ticks} unbudgeted ticks`);

    // A save between passes has no cursor; a save without the cursor field (older
    // format) loads as "no unfinished pass" and ticks as before.
    const between = buildFixture();
    between.processTick(1);
    const plain = JSON.parse(between.serialize());
    assert(plain.cursor === null, `save between passes has cursor ${JSON.stringify(plain.cursor)}`);
    delete plain.cursor;
    const legacy = new AquiferEngine();
    legacy.deserialize(JSON.stringify(plain));
    assert(legacy.passCursor === null, `legacy save loaded with an unfinished pass`);
    const legacyStep = legacy.processTick(1);
    const betweenStep = between.processTick(1);
    assert(legacyStep.complete === true && stateOf(legacy) === stateOf(between), `legacy save ticks differently`);
    assert(legacyStep.interfacesProcessed === betweenStep.interfacesProcessed, `legacy save evaluated a different pass`);

    recordPass("cursor_survives_save", `${midPassSaves} mid-pass save/load round trips; result bit-identical to ${ticks} unbudgeted ticks; cursor-less save loads`);
}

// 16. Wrapped horizontal neighbours across the world seam
function wrap_neighbour() {
    const wrap = { width: 4, height: 4 };
    const pairMass = [60000, 30000];

    // Reference: an ordinary adjacent pair (x=1 and x=2), no wrap.
    const ref = new AquiferEngine();
    ref.addStratum(new Stratum(encodeStratumId(1, 0, 0, 0), 1, 0, 0, 0, 3000, 200000, pairMass[0]));
    ref.addStratum(new Stratum(encodeStratumId(2, 0, 0, 0), 2, 0, 0, 0, 3000, 200000, pairMass[1]));
    const refStep = ref.processTick(1);
    assert(refStep.totalWaterMoved > 0, `reference pair moved no water`);

    for (const [a, b, label] of [[[3, 0], [0, 0], "x seam"], [[0, 3], [0, 0], "y seam"]]) {
        const make = () => {
            const e = new AquiferEngine();
            e.addStratum(new Stratum(encodeStratumId(a[0], a[1], 0, 0), a[0], a[1], 0, 0, 3000, 200000, pairMass[0]));
            e.addStratum(new Stratum(encodeStratumId(b[0], b[1], 0, 0), b[0], b[1], 0, 0, 3000, 200000, pairMass[1]));
            return e;
        };
        const idA = encodeStratumId(a[0], a[1], 0, 0);
        const idB = encodeStratumId(b[0], b[1], 0, 0);

        const open = make();
        const openStep = open.processTick(1);
        assert(openStep.totalWaterMoved === 0, `${label}: water crossed the seam without opts.wrap`);

        const wrapped = make();
        assert(wrapped.getNeighbors(idA, wrap).indexOf(idB) >= 0, `${label}: ${idB} is not a wrapped neighbour of ${idA}`);
        assert(wrapped.isHorizontalNeighbor(idA, idB, wrap) === true, `${label}: wrapped pair is not horizontal`);
        assert(wrapped.isHorizontalNeighbor(idA, idB) === false, `${label}: open grid joins the seam`);
        const step = wrapped.processTick(1, null, { wrap });
        assert(step.interfacesProcessed === 1, `${label}: wrapped pass evaluated ${step.interfacesProcessed} interfaces, expected 1`);
        assert(step.totalWaterMoved === refStep.totalWaterMoved,
            `${label}: wrapped transfer ${step.totalWaterMoved} cp, adjacent L=5 pair ${refStep.totalWaterMoved} cp`);
        assert(wrapped.getStratum(idA).waterMass === pairMass[0] - refStep.totalWaterMoved, `${label}: donor mass wrong`);
        assert(wrapped.getTotalMass() === pairMass[0] + pairMass[1], `${label}: mass not conserved`);
    }

    // One axis wraps, the other does not.
    const xOnly = { width: 4 };
    const probe = new AquiferEngine();
    probe.addStratum(new Stratum(encodeStratumId(0, 0, 0, 0), 0, 0, 0, 0));
    probe.addStratum(new Stratum(encodeStratumId(3, 0, 0, 0), 3, 0, 0, 0));
    probe.addStratum(new Stratum(encodeStratumId(0, 3, 0, 0), 0, 3, 0, 0));
    const nb = probe.getNeighbors(encodeStratumId(0, 0, 0, 0), xOnly);
    assert(nb.indexOf("3,0,0,0") >= 0 && nb.indexOf("0,3,0,0") < 0, `width-only wrap gave neighbours ${JSON.stringify(nb)}`);

    // markDirty wakes the neighbour across the seam.
    const woke = new AquiferEngine();
    woke.addStratum(new Stratum(encodeStratumId(0, 0, 0, 0), 0, 0, 0, 0));
    woke.addStratum(new Stratum(encodeStratumId(3, 0, 0, 0), 3, 0, 0, 0));
    woke.dirtyCells.clear();
    woke.markDirty(0, 0, 0, 0, wrap);
    assert(woke.dirtyCells.has("3,0,0,0"), `markDirty did not wake the wrapped neighbour`);

    // An unfinished pass refuses to resume under a different wrap.
    const mixed = buildFixture();
    mixed.processTick(1, null, { maxInterfaces: 3, wrap: WRAP_4x3 });
    let threw = false;
    try { mixed.processTick(1, null, { maxInterfaces: 3 }); } catch (e) { threw = e instanceof RangeError; }
    assert(threw, `a wrapped pass resumed without its wrap`);

    recordPass("wrap_neighbour", `x and y seams carry ${refStep.totalWaterMoved} cp like an adjacent L=5 pair; none without opts.wrap; width-only wrap; markDirty wakes across the seam`);
}

// 17. Water constants come from sim/units.js
function constants_from_units() {
    const Module = require("module");
    const units = require("../game/js/sim/units.js");
    const aquiferPath = require.resolve("../game/js/sim/hydrology/aquifer.js");
    const unitsPath = require.resolve("../game/js/sim/units.js");

    assert(VOLUME_PER_STRATUM === units.STRATUM_FT3, `VOLUME_PER_STRATUM ${VOLUME_PER_STRATUM} != units.STRATUM_FT3 ${units.STRATUM_FT3}`);
    assert(WATER_DENSITY_CENTIPOUNDS_PER_CUFT === units.WATER_CP_PER_FT3, `WATER_DENSITY ${WATER_DENSITY_CENTIPOUNDS_PER_CUFT} != units.WATER_CP_PER_FT3`);
    assert(MAX_WATER_MASS_PER_STRATUM === units.WATER_CP_PER_STRATUM, `MAX_WATER_MASS_PER_STRATUM ${MAX_WATER_MASS_PER_STRATUM} != units.WATER_CP_PER_STRATUM`);
    assert(MAX_WATER_MASS_PER_STRATUM === 312000 && VOLUME_PER_STRATUM === 50 && WATER_DENSITY_CENTIPOUNDS_PER_CUFT === 6240,
        `constant values changed`);

    // Load a fresh aquifer.js against a units table with different values: an
    // imported constant follows the table, a local literal does not.
    const savedAquifer = require.cache[aquiferPath];
    const savedUnits = require.cache[unitsPath];
    const stub = new Module(unitsPath);
    stub.filename = unitsPath;
    stub.loaded = true;
    stub.exports = Object.freeze(Object.assign({}, units, {
        STRATUM_FT3: 51, WATER_CP_PER_FT3: 6241, WATER_CP_PER_STRATUM: 51 * 6241
    }));
    let fresh;
    try {
        delete require.cache[aquiferPath];
        require.cache[unitsPath] = stub;
        fresh = require(aquiferPath);
    } finally {
        if (savedAquifer) require.cache[aquiferPath] = savedAquifer; else delete require.cache[aquiferPath];
        if (savedUnits) require.cache[unitsPath] = savedUnits; else delete require.cache[unitsPath];
    }
    assert(fresh.VOLUME_PER_STRATUM === 51, `aquifer VOLUME_PER_STRATUM ignores units.js (got ${fresh.VOLUME_PER_STRATUM})`);
    assert(fresh.WATER_DENSITY_CENTIPOUNDS_PER_CUFT === 6241, `aquifer WATER_DENSITY ignores units.js (got ${fresh.WATER_DENSITY_CENTIPOUNDS_PER_CUFT})`);
    assert(fresh.MAX_WATER_MASS_PER_STRATUM === 51 * 6241, `aquifer MAX_WATER_MASS_PER_STRATUM ignores units.js (got ${fresh.MAX_WATER_MASS_PER_STRATUM})`);
    const cavern = new fresh.Stratum("0,0,0,0", 0, 0, 0, 0, 10000, 1000000, 0, "cavern");
    assert(cavern.maxWaterMass === 51 * 6241, `Stratum capacity ignores units.js (got ${cavern.maxWaterMass})`);

    const index = require("../game/js/sim/hydrology/index.js");
    const aquifer = require("../game/js/sim/hydrology/aquifer.js");
    for (const name of ["MAX_WATER_MASS_PER_STRATUM", "VOLUME_PER_STRATUM", "WATER_DENSITY_CENTIPOUNDS_PER_CUFT", "Stratum", "AquiferEngine"]) {
        assert(index[name] === aquifer[name], `index.js re-export ${name} differs from aquifer.js`);
    }

    recordPass("constants_from_units", `312000 cp = 50 ft3 x 6240 cp/ft3 read from units.js; a stub table (51 x 6241) changes aquifer constants and capacity; index.js re-exports intact`);
}

// Main runner
const CHECKS = [
    test_stratum_storage_and_porosity,
    test_darcy_cavern_breach,
    test_impermeable_barrier,
    test_aquifer_drawdown_equilibrium,
    test_sub_unit_seepage_accumulation,
    test_flow_reversal_residual_cancellation,
    test_processing_order_invariance,
    test_donor_exhaustion_clamp,
    test_receiver_capacity_clamp,
    test_mass_ledger_conservation,
    test_save_load_persistence,
    test_dirty_region_quiescence,
    budget_bounds_interfaces,
    budgeted_equals_unbudgeted,
    cursor_survives_save,
    wrap_neighbour,
    constants_from_units
];

function runAll() {
    console.log("=== NAT.03.01 Aquifer Kernel Gate Tests ===" + (process.env.MUTANT ? ` [MUTANT=${process.env.MUTANT}]` : ""));
    const t0 = Date.now();
    const selected = onlyCase ? CHECKS.filter(fn => fn.name === onlyCase) : CHECKS;
    if (selected.length === 0) {
        console.error(`FAIL: no check named ${onlyCase}`);
        return false;
    }
    for (const check of selected) {
        try {
            check();
        } catch (err) {
            failedCount++;
            console.error(`FAIL: ${check.name} - ${err.message}`);
        }
    }
    const elapsedMs = Date.now() - t0;
    if (failedCount > 0) {
        console.log(`\nRESULT: ${passedCount} passed, ${failedCount} failed in ${elapsedMs}ms.`);
        return false;
    }
    console.log(`\nALL CHECKS PASSED: ${passedCount} check(s) verified in ${elapsedMs}ms.`);
    return true;
}

if (!runAll()) process.exit(1);
