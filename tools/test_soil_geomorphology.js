const path = require('path');
const fs = require('fs');

const geomorphologyPath = path.resolve(__dirname, '../game/js/sim/geomorphology/index.js');
const soilPath = path.resolve(__dirname, '../game/js/sim/geomorphology/soil.js');

let geomorphologyModule;
let soilModule;

try {
    geomorphologyModule = require(geomorphologyPath);
} catch (e) {
    console.error('FAIL: Initialization - Failed to load geomorphology module');
    process.exit(1);
}

try {
    soilModule = require(soilPath);
} catch (e) {
    console.error('FAIL: Initialization - Failed to load soil module');
    process.exit(1);
}

function runTests() {
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

    function test_soil_horizon_stratification() {
        const horizons = soilModule.getHorizons();
        assertEqual(horizons.length, 3, 'test_soil_horizon_stratification', 'Horizon count should be 3');
        assertEqual(horizons[0].name, 'O/A', 'test_soil_horizon_stratification', 'First horizon should be O/A');
        assertEqual(horizons[1].name, 'B', 'test_soil_horizon_stratification', 'Second horizon should be B');
        assertEqual(horizons[2].name, 'C', 'test_soil_horizon_stratification', 'Third horizon should be C');
        assertEqual(horizons[0].bulkDensity, 3750, 'test_soil_horizon_stratification', 'O/A bulk density should be 3750 cp/cu ft');
        assertEqual(horizons[1].bulkDensity, 4750, 'test_soil_horizon_stratification', 'B bulk density should be 4750 cp/cu ft');
        assertEqual(horizons[2].bulkDensity, 6000, 'test_soil_horizon_stratification', 'C bulk density should be 6000 cp/cu ft');
        const totalBasisPoints = horizons.reduce((sum, horizon) => sum + horizon.basisPoints, 0);
        assertEqual(totalBasisPoints, 10000, 'test_soil_horizon_stratification', 'Total basis points should sum to 10000');
    }

    function test_capillary_rise_from_aquifer() {
        const aquifer = soilModule.createAquifer();
        const upperStratum = soilModule.createStratum('O/A');
        soilModule.simulateCapillaryRise(aquifer, upperStratum);
        assertTrue(upperStratum.moisture <= upperStratum.fieldCapacity, 'test_capillary_rise_from_aquifer', 'Capillary rise should not exceed field capacity');
    }

    function test_gravity_percolation_field_capacity() {
        const stratum = soilModule.createStratum('O/A');
        stratum.moisture = stratum.fieldCapacity + 100;
        soilModule.simulateGravityPercolation(stratum);
        assertTrue(stratum.moisture <= stratum.fieldCapacity, 'test_gravity_percolation_field_capacity', 'Gravity percolation should reduce moisture to field capacity');
    }

    function test_signed_residual_moisture_conservation() {
        const stratum = soilModule.createStratum('O/A');
        const initialMoisture = stratum.moisture;
        soilModule.simulateWaterTransfer(stratum, 50);
        soilModule.simulateWaterTransfer(stratum, -50);
        assertEqual(stratum.moisture, initialMoisture, 'test_signed_residual_moisture_conservation', 'Signed residual moisture should be conserved with zero integer truncation loss');
    }

    function test_receiver_side_clamping_pore_space() {
        const stratum = soilModule.createStratum('O/A');
        stratum.moisture = 15000;
        soilModule.clampMoisture(stratum);
        assertTrue(stratum.moisture <= 10000, 'test_receiver_side_clamping_pore_space', 'Receiver pore space should clamp moisture to 10000 bp');
    }

    function test_angle_of_repose_gravel_sand() {
        const sediment = soilModule.createSediment('gravel');
        const slopeAngle = 50;
        const collapse = soilModule.checkCollapse(sediment, slopeAngle);
        assertTrue(collapse, 'test_angle_of_repose_gravel_sand', 'Gravel sediment should collapse at 50 degrees');
    }

    function test_angle_of_repose_moist_cohesion() {
        const drySand = soilModule.createSediment('sand', { moisture: 0 });
        const moistLoam = soilModule.createSediment('loam', { moisture: 5000 });
        const slopeAngle = 40;
        const dryCollapse = soilModule.checkCollapse(drySand, slopeAngle);
        const moistCollapse = soilModule.checkCollapse(moistLoam, slopeAngle);
        assertTrue(dryCollapse, 'test_angle_of_repose_moist_cohesion', 'Dry sand should collapse at 40 degrees');
        assertFalse(moistCollapse, 'test_angle_of_repose_moist_cohesion', 'Moist loam should not collapse at 40 degrees due to capillary cohesion');
    }

    function test_weathering_mass_balance() {
        const initialRockMass = 10000;
        const weatheredRegolith = soilModule.weatherRock(initialRockMass);
        const totalMass = weatheredRegolith.regolithMass + weatheredRegolith.emittedGasesMass;
        assertEqual(totalMass, initialRockMass, 'test_weathering_mass_balance', 'Weathering should conserve mass with 100% integer centipound closed-mass conservation');
    }

    function test_water_erosion_sediment_wash() {
        const stratum = soilModule.createStratum('O/A');
        stratum.moisture = 8000;
        const initialParticles = stratum.particles;
        soilModule.simulateWaterErosion(stratum);
        assertTrue(stratum.particles < initialParticles, 'test_water_erosion_sediment_wash', 'Water erosion should reduce topsoil particles');
    }

    function test_lava_thermal_degradation() {
        const stratum = soilModule.createStratum('O/A');
        const initialMass = stratum.mass;
        soilModule.simulateLavaThermalDegradation(stratum);
        const finalMass = stratum.mass;
        assertTrue(finalMass < initialMass, 'test_lava_thermal_degradation', 'Lava thermal degradation should reduce stratum mass');
        const ledger = soilModule.getMassLedger();
        const totalMass = ledger.reduce((sum, entry) => sum + entry.massChange, 0);
        assertEqual(totalMass, 0, 'test_lava_thermal_degradation', 'Thermal degradation should have closed-mass ledger accounting');
    }

    function test_dirty_region_quiescence() {
        const region = soilModule.createRegion();
        soilModule.simulateQuiescence(region);
        assertTrue(region.transfers === 0, 'test_dirty_region_quiescence', 'Undisturbed region should have 0 transfers');
        assertTrue(region.dirtyCells === 0, 'test_dirty_region_quiescence', 'Undisturbed region should consume 0 dirty cells');
    }

    function test_save_load_serialization() {
        const stratum = soilModule.createStratum('O/A');
        stratum.moisture = 5000;
        stratum.particles = 3000;
        const serialized = soilModule.serializeStratum(stratum);
        const deserialized = soilModule.deserializeStratum(serialized);
        assertEqual(deserialized.moisture, stratum.moisture, 'test_save_load_serialization', 'Moisture should be preserved after serialization/deserialization');
        assertEqual(deserialized.particles, stratum.particles, 'test_save_load_serialization', 'Particles should be preserved after serialization/deserialization');
    }

    function runMutantTests() {
        const mutants = {
            'infinite_capillary': false,
            'no_drain': false,
            'dry_spill': false
        };

        const args = process.argv.slice(2);
        for (let arg of args) {
            if (arg.startsWith('--mutant=')) {
                const mutant = arg.split('=')[1];
                if (mutants[mutant] !== undefined) {
                    mutants[mutant] = true;
                }
            }
        }

        if (mutants['infinite_capillary']) {
            const aquifer = soilModule.createAquifer();
            const upperStratum = soilModule.createStratum('O/A');
            soilModule.simulateCapillaryRise(aquifer, upperStratum, true);
            assertTrue(upperStratum.moisture > upperStratum.fieldCapacity, 'mutant_infinite_capillary', 'Infinite capillary rise should exceed field capacity');
            process.exit(1);
        }

        if (mutants['no_drain']) {
            const stratum = soilModule.createStratum('O/A');
            stratum.moisture = 8000;
            soilModule.simulateGravityPercolation(stratum, false);
            assertTrue(stratum.moisture > stratum.fieldCapacity, 'mutant_no_drain', 'No drain should trap excess water');
            process.exit(1);
        }

        if (mutants['dry_spill']) {
            const sediment = soilModule.createSediment('loam', { moisture: 0 });
            const slopeAngle = 0;
            const collapse = soilModule.checkCollapse(sediment, slopeAngle, true);
            assertTrue(collapse, 'mutant_dry_spill', 'Dry spill should force collapse at 0 degrees');
            process.exit(1);
        }
    }

    test_soil_horizon_stratification();
    test_capillary_rise_from_aquifer();
    test_gravity_percolation_field_capacity();
    test_signed_residual_moisture_conservation();
    test_receiver_side_clamping_pore_space();
    test_angle_of_repose_gravel_sand();
    test_angle_of_repose_moist_cohesion();
    test_weathering_mass_balance();
    test_water_erosion_sediment_wash();
    test_lava_thermal_degradation();
    test_dirty_region_quiescence();
    test_save_load_serialization();

    runMutantTests();

    console.log(`RESULT: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests();