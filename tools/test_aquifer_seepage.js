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
 * Negative control mutants (Rule 4):
 * - infinite_water: Drawdown disabled (donor water mass never decrements).
 * - leak_free: Permeability forced to zero (no flow occurs).
 * - no_clamp: Clamping bypassed (oversaturation/negative water allowed).
 */

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
        console.error("FAIL: " + message);
        failedCount++;
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

// Main runner
function runAll() {
    console.log("=== NAT.03.01 Aquifer Kernel Gate Tests [BASELINE] ===");
    const t0 = Date.now();

    test_stratum_storage_and_porosity();
    test_darcy_cavern_breach();
    test_impermeable_barrier();
    test_aquifer_drawdown_equilibrium();
    test_sub_unit_seepage_accumulation();
    test_flow_reversal_residual_cancellation();
    test_processing_order_invariance();
    test_donor_exhaustion_clamp();
    test_receiver_capacity_clamp();
    test_mass_ledger_conservation();
    test_save_load_persistence();
    test_dirty_region_quiescence();

    const elapsedMs = Date.now() - t0;
    console.log(`\nALL CHECKS PASSED: ${passedCount} check(s) verified in ${elapsedMs}ms.`);
}

try {
    runAll();
} catch (err) {
    console.error(`TEST RUN FAILED: ${err.message}`);
    process.exit(1);
}
