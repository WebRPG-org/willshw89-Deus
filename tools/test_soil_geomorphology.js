//=============================================================================
// test_soil_geomorphology.js - Comprehensive Geomorphology & Soil Test Suite
// Project DEUS - NAT.04.01
// Authority: DEC-037, DEC-038, DEC-039, DEC-040
//=============================================================================

const fs = require('fs');
const path = require('path');
const {
    VOLUME_PER_STRATUM,
    WATER_DENSITY_CP_PER_CUFT,
    MAX_WATER_MASS_PER_STRATUM,
    MUTANTS,
    encodeStratumId,
    decodeStratumId,
    canonicalEdgeKey,
    getDownwardNeighborId,
    getUpwardNeighborId,
    SoilStratum,
    GeomorphologyEngine,
    HORIZON_SPECS,
    getHorizons,
    createStratum,
    createAquifer,
    simulateWaterTransfer,
    clampMoisture,
    createSediment,
    checkCollapse,
    weatherRock,
    serializeStratum,
    deserializeStratum
} = require('../game/js/sim/geomorphology/index.js');

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, testName, detail) {
    if (actual === expected) {
        console.log(`PASS: ${testName} - ${detail}`);
        passed++;
    } else {
        console.error(`FAIL: ${testName} - ${detail}. Expected ${expected}, got ${actual}`);
        failed++;
    }
}

function assertTrue(condition, testName, detail) {
    if (condition) {
        console.log(`PASS: ${testName} - ${detail}`);
        passed++;
    } else {
        console.error(`FAIL: ${testName} - ${detail}`);
        failed++;
    }
}

function assertFalse(condition, testName, detail) {
    if (!condition) {
        console.log(`PASS: ${testName} - ${detail}`);
        passed++;
    } else {
        console.error(`FAIL: ${testName} - ${detail}`);
        failed++;
    }
}

// 1. Horizon Stratification & Soil Composition
function test_soil_horizon_stratification() {
    const horizons = getHorizons();
    assertEqual(horizons.length, 3, 'test_soil_horizon_stratification', 'Horizon count should be 3');
    assertEqual(horizons[0].name, 'O/A', 'test_soil_horizon_stratification', 'First horizon should be O/A');
    assertEqual(horizons[1].name, 'B', 'test_soil_horizon_stratification', 'Second horizon should be B');
    assertEqual(horizons[2].name, 'C', 'test_soil_horizon_stratification', 'Third horizon should be C');
    assertEqual(horizons[0].bulkDensity, 3750, 'test_soil_horizon_stratification', 'O/A bulk density should be 3750 cp/cu ft');
    assertEqual(horizons[1].bulkDensity, 4750, 'test_soil_horizon_stratification', 'B bulk density should be 4750 cp/cu ft');
    assertEqual(horizons[2].bulkDensity, 6000, 'test_soil_horizon_stratification', 'C bulk density should be 6000 cp/cu ft');
    
    // Verify composition sums to 10,000 basis points for each horizon
    for (const h of horizons) {
        const sum = h.sand + h.silt + h.clay + h.organic;
        assertEqual(sum, 10000, 'test_soil_horizon_stratification', `${h.name} composition should sum to 10000 bp`);
    }
    assertTrue(horizons[0].organic >= 2000, 'test_soil_horizon_stratification', 'O/A organic content should be >= 2000 bp');
}

// 2. Capillary Rise & Closed-Mass Hydrology Coupling
function test_capillary_rise_closed_mass() {
    const eng = new GeomorphologyEngine();
    // Donor stratum beneath: saturated C-horizon at z=-1, s=4 (moisture 8000 bp)
    const donor = new SoilStratum(0, 0, -1, 4, 'C', 6000, 2500, 1500, 0, 6000, 3000, 2500, 8000);
    // Receiver stratum above: dry O/A topsoil at z=0, s=0 (moisture 1000 bp, below field capacity 3500 bp)
    const receiver = new SoilStratum(0, 0, 0, 0, 'O/A', 4000, 3000, 1000, 2000, 3750, 4500, 3500, 1000);
    
    eng.addStratum(donor);
    eng.addStratum(receiver);
    eng.markDirty(0, 0, 0, 0);

    const totalWaterBefore = donor.getCurrentWaterMass() + receiver.getCurrentWaterMass();
    eng.processMoistureTick(1);
    const totalWaterAfter = donor.getCurrentWaterMass() + receiver.getCurrentWaterMass();

    // Mass conservation invariant (DEC-040)
    assertEqual(totalWaterAfter, totalWaterBefore, 'test_capillary_rise_closed_mass', 'Capillary transfer must strictly conserve water mass (zero creation)');
    assertTrue(receiver.getCurrentWaterMass() <= receiver.getFieldCapacityWaterMass(), 'test_capillary_rise_closed_mass', 'Capillary wicking must not exceed field capacity');
    assertTrue(receiver.getCurrentWaterMass() > 0, 'test_capillary_rise_closed_mass', 'Receiver must have gained water');
}

// 3. Gravitational Drainage Downward Percolation
function test_gravity_downward_drainage() {
    const eng = new GeomorphologyEngine();
    // Upper stratum with moisture above field capacity (9000 bp > 3500 bp field capacity)
    const upper = new SoilStratum(1, 0, 0, 2, 'O/A', 4000, 3000, 1000, 2000, 3750, 4500, 3500, 9000);
    // Lower stratum directly below: z=0, s=1 (empty pore space)
    const lower = new SoilStratum(1, 0, 0, 1, 'O/A', 4000, 3000, 1000, 2000, 3750, 4500, 3500, 0);
    
    eng.addStratum(upper);
    eng.addStratum(lower);
    eng.markDirty(1, 0, 0, 2);

    const waterBefore = upper.getCurrentWaterMass() + lower.getCurrentWaterMass();
    eng.processMoistureTick(1);
    const waterAfter = upper.getCurrentWaterMass() + lower.getCurrentWaterMass();

    assertEqual(waterAfter, waterBefore, 'test_gravity_downward_drainage', 'Gravity drainage must conserve water mass');
    assertTrue(lower.getCurrentWaterMass() > 0, 'test_gravity_downward_drainage', 'Downward neighbor (s-1) must receive percolating water');
    assertTrue(upper.getCurrentWaterMass() < waterBefore, 'test_gravity_downward_drainage', 'Upper stratum excess water must drain downward');
}

// 4. Downward Drainage Across Z Boundaries
function test_gravity_drainage_across_z_boundary() {
    const eng = new GeomorphologyEngine();
    // Stratum at bottom of cell z=0 (s=0) with excess moisture
    const upperZ = new SoilStratum(2, 0, 0, 0, 'O/A', 4000, 3000, 1000, 2000, 3750, 4500, 3500, 9000);
    // Stratum at top of cell z=-1 (s=4)
    const lowerZ = new SoilStratum(2, 0, -1, 4, 'B', 3000, 4000, 2500, 500, 4750, 3800, 4000, 0);

    eng.addStratum(upperZ);
    eng.addStratum(lowerZ);
    eng.markDirty(2, 0, 0, 0);

    eng.processMoistureTick(1);
    assertTrue(lowerZ.getCurrentWaterMass() > 0, 'test_gravity_drainage_across_z_boundary', 'Water must drain across Z boundary from s=0 down to z-1, s=4');
}

// 5. Signed Residual Moisture Conservation (DEC-038)
function test_signed_residual_sub_centipound_accumulation() {
    const eng = new GeomorphologyEngine();
    const donor = new SoilStratum(3, 0, 0, 1, 'C', 6000, 2500, 1500, 0, 6000, 3000, 2500, 8000);
    const receiver = new SoilStratum(3, 0, 0, 2, 'O/A', 4000, 3000, 1000, 2000, 3750, 4500, 3500, 1000);
    eng.addStratum(donor);
    eng.addStratum(receiver);

    const edgeKey = canonicalEdgeKey(donor.id, receiver.id);
    // Exercise engine fractional transfer accumulation
    let totalIntTransferred = 0;
    for (let t = 0; t < 10; t++) {
        const rawFractionalFlow = 0.35; // 0.35 centipounds per tick
        const intFlow = eng.accumulateFractionalTransfer(edgeKey, rawFractionalFlow);
        totalIntTransferred += intFlow;
    }

    const finalResidual = eng.signedResidualMap.get(edgeKey) || 0;
    // 10 * 0.35 = 3.5 cp total -> 3 int transfers + 0.5 residual
    assertEqual(totalIntTransferred, 3, 'test_signed_residual_sub_centipound_accumulation', '10 ticks of 0.35 cp must yield exactly 3 integer centipounds');
    assertTrue(Math.abs(finalResidual - 0.5) < 1e-6, 'test_signed_residual_sub_centipound_accumulation', 'Final signed residual must hold exactly 0.5 cp remainder');
}

// 6. Receiver-Side Pore Space Clamping
function test_receiver_side_clamping_pore_space() {
    const stratum = new SoilStratum(4, 0, 0, 0, 'O/A', 4000, 3000, 1000, 2000, 3750, 4500, 3500, 5000);
    // Inject water past pore space
    simulateWaterTransfer(stratum, 8000); // 5000 bp + 8000 bp = 13000 bp
    clampMoisture(stratum);
    assertTrue(stratum.moisture <= 10000, 'test_receiver_side_clamping_pore_space', 'Receiver pore space must clamp moisture to <= 10000 bp');
}

// 7. Angle of Repose Thresholds & Moist Cohesion
function test_angle_of_repose_thresholds() {
    const gravel = createSediment('gravel');
    const drySand = createSediment('sand');
    const moistLoam = createSediment('loam', { moisture: 2000 });
    const dryLoam = createSediment('loam', { moisture: 0 });
    const mud = createSediment('mud');

    assertEqual(gravel.angleRepose, 35, 'test_angle_of_repose_thresholds', 'Gravel repose angle should be 35 degrees');
    assertEqual(drySand.angleRepose, 34, 'test_angle_of_repose_thresholds', 'Dry sand repose angle should be 34 degrees');
    assertEqual(moistLoam.angleRepose, 45, 'test_angle_of_repose_thresholds', 'Moist loam repose angle should be 45 degrees due to capillary cohesion');
    assertEqual(dryLoam.angleRepose, 30, 'test_angle_of_repose_thresholds', 'Dry loam repose angle should be 30 degrees');
    assertEqual(mud.angleRepose, 20, 'test_angle_of_repose_thresholds', 'Mud repose angle should be 20 degrees due to liquefaction');

    assertTrue(checkCollapse(gravel, 40), 'test_angle_of_repose_thresholds', 'Gravel should collapse at 40 degrees');
    assertFalse(checkCollapse(gravel, 30), 'test_angle_of_repose_thresholds', 'Gravel should not collapse at 30 degrees');
    assertFalse(checkCollapse(moistLoam, 40), 'test_angle_of_repose_thresholds', 'Moist loam should not collapse at 40 degrees');
}

// 8. Slope Stability Cascade & Sediment Conservation
function test_slope_stability_cascade_conservation() {
    const eng = new GeomorphologyEngine();
    // High column at (0, 0) with loose dry sand at elevation 40 ft (z=2, s=0)
    const highStratum = new SoilStratum(0, 0, 2, 0, 'O/A', 4000, 3000, 1000, 2000, 3750, 4500, 3500, 0, true, 34);
    highStratum.looseMassCp = 50000;
    // Lower neighbor column at (1, 0) at elevation 0 ft (z=-2, s=0)
    const lowStratum = new SoilStratum(1, 0, -2, 0, 'O/A', 4000, 3000, 1000, 2000, 3750, 4500, 3500, 0, true, 34);
    lowStratum.looseMassCp = 0;

    eng.addStratum(highStratum);
    eng.addStratum(lowStratum);
    eng.markDirty(0, 0, 2, 0);

    const totalSedimentBefore = highStratum.looseMassCp + lowStratum.looseMassCp;
    eng.processSlopeStability(1);
    const totalSedimentAfter = highStratum.looseMassCp + lowStratum.looseMassCp;

    assertEqual(totalSedimentAfter, totalSedimentBefore, 'test_slope_stability_cascade_conservation', 'Slope cascade must 100% conserve sediment mass');
    assertTrue(lowStratum.looseMassCp > 0, 'test_slope_stability_cascade_conservation', 'Lower cell must receive collapsed sediment');
    assertTrue(eng.ledgerMassSediment > 0, 'test_slope_stability_cascade_conservation', 'Sediment ledger must record relocated mass');
}

// 9. Mechanical Weathering Closed-Mass Balance (DEC-040)
function test_weathering_closed_mass_balance() {
    const eng = new GeomorphologyEngine();
    const rock = new SoilStratum(5, 0, 0, 0, 'C', 6000, 2500, 1500, 0, 6000, 3000, 2500, 0);
    const initialMass = rock.solidMassCp;
    eng.addStratum(rock);

    eng.applyWeathering(5, 0, 0, 0, true, 1);
    const finalMass = rock.solidMassCp + rock.looseMassCp;

    assertEqual(finalMass, initialMass, 'test_weathering_closed_mass_balance', 'Weathering must conserve 100% of mass into regolith sediment');
    assertTrue(rock.looseMassCp > 0, 'test_weathering_closed_mass_balance', 'Fractured rock must be deposited as loose regolith');
    assertEqual(eng.ledgerMassRock + eng.ledgerMassSediment, 0, 'test_weathering_closed_mass_balance', 'Ledger net delta must equal 0 (closed-mass invariant)');
}

// 10. Water Erosion Sediment Wash
function test_water_erosion_sediment_wash() {
    const eng = new GeomorphologyEngine();
    const soil = new SoilStratum(6, 0, 0, 0, 'O/A', 4000, 3000, 1000, 2000, 3750, 4500, 3500, 2000);
    const initialMass = soil.solidMassCp;
    const initialParticles = soil.particles;
    eng.addStratum(soil);

    eng.applyWaterErosion(6, 0, 0, 0, 10, 1); // Fluid velocity = 10 ft/s

    assertTrue(soil.particles < initialParticles, 'test_water_erosion_sediment_wash', 'Water erosion must strip topsoil particles');
    assertTrue(eng.reservoirSuspendedSediment > 0, 'test_water_erosion_sediment_wash', 'Eroded mass must transfer to suspended sediment reservoir');
    assertEqual(soil.solidMassCp + eng.reservoirSuspendedSediment, initialMass, 'test_water_erosion_sediment_wash', 'Total mass between soil and sediment must be conserved');
}

// 11. Thermal Degradation / Lava Interaction (Closed Mass)
function test_thermal_degradation_closed_mass() {
    const eng = new GeomorphologyEngine();
    const soil = new SoilStratum(7, 0, 0, 0, 'O/A', 4000, 3000, 1000, 2000, 3750, 4500, 3500, 0);
    const initialMass = soil.solidMassCp;
    eng.addStratum(soil);

    // Below 400 K: zero degradation
    eng.applyThermalDegradation(7, 0, 0, 0, 300, 1);
    assertEqual(soil.solidMassCp, initialMass, 'test_thermal_degradation_closed_mass', 'Zero thermal degradation should occur at normal ambient temperature (300 K)');

    // Contact with molten lava at 1200 K
    eng.applyThermalDegradation(7, 0, 0, 0, 1200, 1);
    const finalTotal = soil.solidMassCp + eng.reservoirCeramicCp + eng.reservoirAshGasCp;

    assertEqual(finalTotal, initialMass, 'test_thermal_degradation_closed_mass', 'Lava thermal degradation must 100% conserve mass into ceramic and ash/gas reservoirs');
    assertTrue(eng.reservoirCeramicCp > 0, 'test_thermal_degradation_closed_mass', 'Clay must bake into ceramic brick reservoir');
    assertTrue(eng.reservoirAshGasCp > 0, 'test_thermal_degradation_closed_mass', 'Organic fraction must vaporize into ash and atmospheric gas reservoir');
}

// 12. Dirty Region Quiescence & Performance
function test_dirty_region_quiescence() {
    const eng = new GeomorphologyEngine();
    // Add 100 undisturbed strata
    for (let i = 0; i < 100; i++) {
        eng.addStratum(new SoilStratum(i, 0, 0, 0, 'O/A', 4000, 3000, 1000, 2000, 3750, 4500, 3500, 2000));
    }

    eng.processMoistureTick(1);
    eng.processSlopeStability(1);

    assertEqual(eng.stats.strataVisited, 0, 'test_dirty_region_quiescence', 'Undisturbed strata must not be visited during quiescent ticks');
    assertEqual(eng.stats.waterTransfers, 0, 'test_dirty_region_quiescence', 'Zero water transfers should occur in quiescent region');
    assertEqual(eng.stats.sedimentTransfers, 0, 'test_dirty_region_quiescence', 'Zero sediment transfers should occur in quiescent region');
    assertTrue(eng.stats.quiescentTicks >= 2, 'test_dirty_region_quiescence', 'Quiescent ticks must be registered');
}

// 13. Persistence & Serialization Roundtrip
function test_save_load_serialization_roundtrip() {
    const eng1 = new GeomorphologyEngine();
    const s1 = new SoilStratum(8, 9, 1, 2, 'O/A', 4000, 3000, 1000, 2000, 3750, 4500, 3500, 2500, true, 45);
    s1.looseMassCp = 1200;
    s1.particles = 4200;
    eng1.addStratum(s1);
    eng1.signedResidualMap.set('edge:test', 0.42);
    eng1.markDirty(8, 9, 1, 2);
    eng1.ledgerMassSediment = 500;

    const savedJson = eng1.serialize();

    const eng2 = new GeomorphologyEngine();
    eng2.deserialize(savedJson);

    const s2 = eng2.getStratum(s1.id);
    assertTrue(Boolean(s2), 'test_save_load_serialization_roundtrip', 'Stratum must exist after reload');
    assertEqual(s2.waterMassCp, s1.waterMassCp, 'test_save_load_serialization_roundtrip', 'Water mass must be preserved');
    assertEqual(s2.solidMassCp, s1.solidMassCp, 'test_save_load_serialization_roundtrip', 'Solid mass must be preserved');
    assertEqual(s2.looseMassCp, s1.looseMassCp, 'test_save_load_serialization_roundtrip', 'Loose sediment mass must be preserved');
    assertEqual(s2.particles, s1.particles, 'test_save_load_serialization_roundtrip', 'Particle count must be preserved');
    assertEqual(s2.loose, s1.loose, 'test_save_load_serialization_roundtrip', 'Loose state must be preserved');
    assertEqual(s2.angleRepose, s1.angleRepose, 'test_save_load_serialization_roundtrip', 'Repose angle must be preserved');
    assertEqual(eng2.signedResidualMap.get('edge:test'), 0.42, 'test_save_load_serialization_roundtrip', 'Signed residuals must be preserved');
    assertTrue(eng2.dirtyColumns.has(s1.id), 'test_save_load_serialization_roundtrip', 'Dirty state must be preserved');
}

// 14. Total Mass Verification (Centipounds)
function test_total_mass_calculation() {
    const eng = new GeomorphologyEngine();
    const dryRock = new SoilStratum(10, 0, 0, 0, 'C', 6000, 2500, 1500, 0, 6000, 3000, 2500, 0);
    eng.addStratum(dryRock);

    const report = eng.getTotalMass();
    // 50 cu ft * 6000 cp/cu ft = 300,000 cp
    assertEqual(report.rock, 300000, 'test_total_mass_calculation', 'Solid rock mass should be exactly 300000 cp');
    assertEqual(report.total, 300000, 'test_total_mass_calculation', 'Total mass should match exact centipounds');
}

function runAll() {
    test_soil_horizon_stratification();
    test_capillary_rise_closed_mass();
    test_gravity_downward_drainage();
    test_gravity_drainage_across_z_boundary();
    test_signed_residual_sub_centipound_accumulation();
    test_receiver_side_clamping_pore_space();
    test_angle_of_repose_thresholds();
    test_slope_stability_cascade_conservation();
    test_weathering_closed_mass_balance();
    test_water_erosion_sediment_wash();
    test_thermal_degradation_closed_mass();
    test_dirty_region_quiescence();
    test_save_load_serialization_roundtrip();
    test_total_mass_calculation();

    console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        process.exit(1);
    }
}

runAll();