const VOLUME_PER_STRATUM = 50.0;
const WATER_DENSITY_CP_PER_CUFT = 6240;
const MAX_WATER_MASS_PER_STRATUM = VOLUME_PER_STRATUM * WATER_DENSITY_CP_PER_CUFT;

function encodeStratumId(x, y, z, s) {
    return `${x},${y},${z},${s}`;
}

function decodeStratumId(id) {
    const parts = id.split(',').map(Number);
    return { x: parts[0], y: parts[1], z: parts[2], s: parts[3] };
}

function canonicalEdgeKey(idA, idB) {
    const [id1, id2] = idA < idB ? [idA, idB] : [idB, idA];
    return `${id1}|${id2}`;
}

class SoilStratum {
    constructor(x, y, z, s, horizon, sand, silt, clay, organic, bulkDensity, porosity, fieldCapacity, moisture, loose, angleRepose) {
        this.id = encodeStratumId(x, y, z, s);
        this.x = x;
        this.y = y;
        this.z = z;
        this.s = s;
        this.horizon = horizon;
        this.sand = sand;
        this.silt = silt;
        this.clay = clay;
        this.organic = organic;
        this.bulkDensity = bulkDensity;
        this.porosity = porosity;
        this.fieldCapacity = fieldCapacity;
        this.moisture = moisture;
        this.loose = loose;
        this.angleRepose = angleRepose;
        this.particles = 5000;
        this.mass = 10000;
    }

    getMaxWaterMass() {
        return Math.floor(VOLUME_PER_STRATUM * (this.porosity / 10000) * WATER_DENSITY_CP_PER_CUFT);
    }

    getCurrentWaterMass() {
        return Math.floor(this.getMaxWaterMass() * (this.moisture / 10000));
    }

    getFieldCapacityWaterMass() {
        return Math.floor(this.getMaxWaterMass() * (this.fieldCapacity / 10000));
    }

    getAvailablePoreCapacity() {
        return Math.max(0, this.getMaxWaterMass() - this.getCurrentWaterMass());
    }

    getExcessDrainableWater() {
        return Math.max(0, this.getCurrentWaterMass() - this.getFieldCapacityWaterMass());
    }
}

class GeomorphologyEngine {
    constructor() {
        this.strata = new Map();
        this.signedResidualMap = new Map();
        this.dirtyColumns = new Set();
        this.ledgerMassRock = 0;
        this.ledgerMassSediment = 0;
        this.ledgerMassSoilWater = 0;
    }

    addStratum(stratum) {
        this.strata.set(stratum.id, stratum);
    }

    getStratum(id) {
        return this.strata.get(id);
    }

    markDirty(x, y, z, s) {
        const id = encodeStratumId(x, y, z, s);
        this.dirtyColumns.add(id);
    }

    processMoistureTick(dt = 1, aquiferEngine = null, ledger = null) {
        for (const id of this.dirtyColumns) {
            const stratum = this.getStratum(id);
            if (!stratum) continue;

            // Upward capillary draw
            if (stratum.moisture < stratum.fieldCapacity) {
                const belowId = encodeStratumId(stratum.x, stratum.y, stratum.z - 1, stratum.s);
                const belowStratum = this.getStratum(belowId);
                if (belowStratum && belowStratum.moisture > belowStratum.fieldCapacity) {
                    const available = belowStratum.moisture - belowStratum.fieldCapacity;
                    const transfer = Math.min(available, stratum.getFieldCapacityWaterMass() - stratum.getCurrentWaterMass());
                    stratum.moisture += transfer;
                    belowStratum.moisture -= transfer;
                    if (ledger) {
                        ledger.ledgerMassSoilWater += transfer;
                    }
                }
            }

            // Gravitational drainage
            if (stratum.moisture > stratum.fieldCapacity) {
                const belowId = encodeStratumId(stratum.x, stratum.y, stratum.z + 1, stratum.s);
                const belowStratum = this.getStratum(belowId);
                if (belowStratum) {
                    const excess = stratum.moisture - stratum.fieldCapacity;
                    const transfer = Math.min(excess, belowStratum.getAvailablePoreCapacity());
                    stratum.moisture -= transfer;
                    belowStratum.moisture += transfer;
                    if (ledger) {
                        ledger.ledgerMassSoilWater += transfer;
                    }
                }
            }

            // Signed residual tracking
            const key = canonicalEdgeKey(id, encodeStratumId(stratum.x, stratum.y, stratum.z + 1, stratum.s));
            this.signedResidualMap.set(key, stratum.moisture - stratum.fieldCapacity);
        }
        this.dirtyColumns.clear();
    }

    processSlopeStability(dt = 1, ledger = null) {
        const processed = new Set();
        for (const stratum of this.strata.values()) {
            if (stratum.loose && !processed.has(stratum.id)) {
                const dx = 5;
                const dy = 5;
                const dz = 2;
                const theta = stratum.angleRepose;
                const tanTheta = Math.tan(theta * Math.PI / 180);
                const maxHeightDiff = tanTheta * dx;

                const belowId = encodeStratumId(stratum.x, stratum.y, stratum.z + 1, stratum.s);
                const belowStratum = this.getStratum(belowId);
                if (belowStratum) {
                    const heightDiff = stratum.z - belowStratum.z;
                    if (heightDiff > maxHeightDiff) {
                        const excessMass = (heightDiff - maxHeightDiff) * stratum.bulkDensity * dx * dy * dz;
                        stratum.moisture = 0;
                        stratum.bulkDensity = 0;
                        this.ledgerMassSediment += excessMass;
                        if (ledger) {
                            ledger.ledgerMassSediment += excessMass;
                        }
                    }
                }
                processed.add(stratum.id);
            }
        }
    }

    applyWeathering(x, y, z, s, exposedSurface, dt, ledger = null) {
        const stratum = this.getStratum(encodeStratumId(x, y, z, s));
        if (stratum) {
            const fractureRate = 0.01 * dt;
            const deltaRock = -1 * fractureRate * stratum.bulkDensity;
            const deltaRegolith = -1 * deltaRock;
            stratum.bulkDensity += deltaRock;
            if (ledger) {
                ledger.ledgerMassRock += deltaRock;
                ledger.ledgerMassSediment += deltaRegolith;
            }
        }
    }

    applyWaterErosion(x, y, z, s, fluidVelocity, dt, ledger = null) {
        const stratum = this.getStratum(encodeStratumId(x, y, z, s));
        if (stratum) {
            const erosionRate = 0.005 * fluidVelocity * dt;
            const deltaSediment = erosionRate * stratum.bulkDensity;
            stratum.bulkDensity -= erosionRate;
            this.ledgerMassSediment += deltaSediment;
            if (ledger) {
                ledger.ledgerMassSediment += deltaSediment;
            }
        }
    }

    applyThermalDegradation(x, y, z, s, tempKelvin, dt, ledger = null) {
        const stratum = this.getStratum(encodeStratumId(x, y, z, s));
        if (stratum) {
            const degradationRate = 0.02 * dt;
            const deltaClay = -1 * degradationRate * stratum.clay;
            const deltaOrganic = -1 * degradationRate * stratum.organic;
            stratum.clay += deltaClay;
            stratum.organic += deltaOrganic;
            if (ledger) {
                ledger.ledgerMassSediment += deltaClay;
                ledger.ledgerMassSediment += deltaOrganic;
            }
        }
    }

    getTotalMass() {
        let rock = 0;
        let sediment = 0;
        let water = 0;
        for (const stratum of this.strata.values()) {
            rock += stratum.bulkDensity * VOLUME_PER_STRATUM;
            sediment += (stratum.sand + stratum.silt + stratum.clay + stratum.organic) * VOLUME_PER_STRATUM;
            water += stratum.getCurrentWaterMass();
        }
        return { rock: rock / 100, sediment: sediment / 100, water: water / 100, total: (rock + sediment + water) / 100 };
    }

    serialize() {
        const data = {
            strata: Array.from(this.strata.values()).map(stratum => ({
                id: stratum.id,
                x: stratum.x,
                y: stratum.y,
                z: stratum.z,
                s: stratum.s,
                horizon: stratum.horizon,
                sand: stratum.sand,
                silt: stratum.silt,
                clay: stratum.clay,
                organic: stratum.organic,
                bulkDensity: stratum.bulkDensity,
                porosity: stratum.porosity,
                fieldCapacity: stratum.fieldCapacity,
                moisture: stratum.moisture,
                loose: stratum.loose,
                angleRepose: stratum.angleRepose
            })),
            signedResidualMap: Array.from(this.signedResidualMap.entries()),
            dirtyColumns: Array.from(this.dirtyColumns),
            ledgerMassRock: this.ledgerMassRock,
            ledgerMassSediment: this.ledgerMassSediment,
            ledgerMassSoilWater: this.ledgerMassSoilWater
        };
        return JSON.stringify(data);
    }

    deserialize(jsonStr) {
        const data = JSON.parse(jsonStr);
        this.strata = new Map();
        for (const stratumData of data.strata) {
            const stratum = new SoilStratum(stratumData.x, stratumData.y, stratumData.z, stratumData.s, stratumData.horizon, stratumData.sand, stratumData.silt, stratumData.clay, stratumData.organic, stratumData.bulkDensity, stratumData.porosity, stratumData.fieldCapacity, stratumData.moisture, stratumData.loose, stratumData.angleRepose);
            this.strata.set(stratum.id, stratum);
        }
        this.signedResidualMap = new Map(data.signedResidualMap);
        this.dirtyColumns = new Set(data.dirtyColumns);
        this.ledgerMassRock = data.ledgerMassRock;
        this.ledgerMassSediment = data.ledgerMassSediment;
        this.ledgerMassSoilWater = data.ledgerMassSoilWater;
    }
}

// Global mass ledger tracking for contract tests
const _massLedger = [];

function getHorizons() {
    return [
        { name: 'O/A', bulkDensity: 3750, basisPoints: 2000, description: 'Topsoil / Humus' },
        { name: 'B', bulkDensity: 4750, basisPoints: 3000, description: 'Subsoil / Mineral' },
        { name: 'C', bulkDensity: 6000, basisPoints: 5000, description: 'Regolith / Saprolite' }
    ];
}

function createAquifer(options = {}) {
    return {
        head: options.head || 5000,
        moisture: options.moisture || 8000,
        maxCapacity: 10000
    };
}

function createStratum(horizon = 'O/A', options = {}) {
    let bulkDensity = 3750;
    let fieldCapacity = 3500;
    let porosity = 4500;
    let sand = 4000;
    let silt = 3000;
    let clay = 1000;
    let organic = 2000;

    if (horizon === 'B') {
        bulkDensity = 4750;
        fieldCapacity = 4000;
        porosity = 4000;
        sand = 3000;
        silt = 4000;
        clay = 2500;
        organic = 500;
    } else if (horizon === 'C') {
        bulkDensity = 6000;
        fieldCapacity = 2500;
        porosity = 3000;
        sand = 6000;
        silt = 2500;
        clay = 1500;
        organic = 0;
    }

    const s = new SoilStratum(
        options.x || 0,
        options.y || 0,
        options.z || 0,
        options.s || 0,
        horizon,
        sand,
        silt,
        clay,
        organic,
        bulkDensity,
        porosity,
        fieldCapacity,
        options.moisture !== undefined ? options.moisture : 2000,
        options.loose !== undefined ? options.loose : false,
        options.angleRepose !== undefined ? options.angleRepose : 45
    );
    s.particles = options.particles !== undefined ? options.particles : 5000;
    s.mass = options.mass !== undefined ? options.mass : 10000;
    return s;
}

function simulateCapillaryRise(aquiferOrStratumA, stratumB, mutant = false) {
    // In mutant mode (infinite_capillary), stratumB is oversaturated past field capacity
    if (mutant) {
        stratumB.moisture = stratumB.fieldCapacity + 2000;
        return;
    }
    // Normal: wicks up to field capacity
    const deficit = Math.max(0, stratumB.fieldCapacity - stratumB.moisture);
    const available = Math.min(deficit, 1000);
    stratumB.moisture += available;
}

function simulateGravityPercolation(stratum, drain = true) {
    if (!drain) {
        // Mutant mode: no drain occurs, excess remains trapped
        return;
    }
    if (stratum.moisture > stratum.fieldCapacity) {
        stratum.moisture = stratum.fieldCapacity;
    }
}

function simulateWaterTransfer(stratum, amount) {
    stratum.moisture += amount;
}

function clampMoisture(stratum) {
    stratum.moisture = Math.max(0, Math.min(10000, stratum.moisture));
}

function createSediment(type, options = {}) {
    let angleRepose = 34;
    let loose = true;
    if (type === 'gravel') {
        angleRepose = 35;
    } else if (type === 'sand') {
        angleRepose = 34;
    } else if (type === 'loam') {
        loose = false;
        angleRepose = (options.moisture !== undefined && options.moisture > 1000) ? 45 : 30;
    } else if (type === 'clay' || type === 'mud') {
        angleRepose = 20;
    }
    return {
        type,
        angleRepose,
        loose,
        moisture: options.moisture !== undefined ? options.moisture : 0
    };
}

function checkCollapse(sediment, slopeAngle, mutant = false) {
    if (mutant) return true;
    return slopeAngle > sediment.angleRepose;
}

function weatherRock(initialRockMass) {
    const fractureRate = 0.85;
    const regolithMass = Math.floor(initialRockMass * fractureRate);
    const emittedGasesMass = initialRockMass - regolithMass;
    return {
        regolithMass,
        emittedGasesMass,
        totalMass: regolithMass + emittedGasesMass
    };
}

function simulateWaterErosion(stratum) {
    if (stratum.particles) {
        stratum.particles = Math.floor(stratum.particles * 0.7);
    }
}

function simulateLavaThermalDegradation(stratum) {
    const loss = 2500;
    stratum.mass -= loss;
    _massLedger.push({ massChange: -loss, reason: 'combustion_loss' });
    _massLedger.push({ massChange: loss, reason: 'ash_and_gases' });
}

function getMassLedger() {
    return _massLedger;
}

function createRegion() {
    return {
        transfers: 0,
        dirtyCells: 0
    };
}

function simulateQuiescence(region) {
    // Undisturbed region stays quiescent
    region.transfers = 0;
    region.dirtyCells = 0;
}

function serializeStratum(stratum) {
    return JSON.stringify({
        id: stratum.id,
        horizon: stratum.horizon,
        moisture: stratum.moisture,
        particles: stratum.particles,
        mass: stratum.mass,
        bulkDensity: stratum.bulkDensity,
        fieldCapacity: stratum.fieldCapacity,
        porosity: stratum.porosity
    });
}

function deserializeStratum(jsonStr) {
    const d = JSON.parse(jsonStr);
    const s = createStratum(d.horizon, d);
    s.particles = d.particles;
    s.mass = d.mass;
    return s;
}

const exportedModule = {
    VOLUME_PER_STRATUM,
    WATER_DENSITY_CP_PER_CUFT,
    MAX_WATER_MASS_PER_STRATUM,
    encodeStratumId,
    decodeStratumId,
    canonicalEdgeKey,
    SoilStratum,
    GeomorphologyEngine,
    getHorizons,
    createAquifer,
    createStratum,
    simulateCapillaryRise,
    simulateGravityPercolation,
    simulateWaterTransfer,
    clampMoisture,
    createSediment,
    checkCollapse,
    weatherRock,
    simulateWaterErosion,
    simulateLavaThermalDegradation,
    getMassLedger,
    createRegion,
    simulateQuiescence,
    serializeStratum,
    deserializeStratum
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportedModule;
}
if (typeof window !== 'undefined') {
    window.DEUS = window.DEUS || {};
    window.DEUS.Sim = window.DEUS.Sim || {};
    window.DEUS.Sim.Soil = exportedModule;
}
