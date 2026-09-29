//=============================================================================
// soil.js - Lean Geomorphology & Soil Simulation Kernel
// Project DEUS - NAT.04.01 (lane-by)
// Authority: DEC-037, DEC-038, DEC-039, DEC-040
//=============================================================================

const VOLUME_PER_STRATUM = 50.0; // 5 ft x 5 ft x 2 ft = 50 cu ft
const WATER_DENSITY_CP_PER_CUFT = 6240; // 62.4 lb/cu ft = 6240 centipounds / cu ft
const MAX_WATER_MASS_PER_STRATUM = Math.floor(VOLUME_PER_STRATUM * WATER_DENSITY_CP_PER_CUFT); // 312,000 cp

// Mutation flags (governed by DEC-034 / DEC-035; activated via process.env.MUTANT or CLI flags)
const MUTANTS = {
    no_donor_debit: false,
    reverse_drainage: false,
    bypass_pore_clamp: false,
    discard_signed_residuals: false,
    unbalanced_weathering: false
};

if (typeof process !== 'undefined' && process.argv) {
    for (const arg of process.argv) {
        if (arg.startsWith('--mutant=')) {
            const m = arg.split('=')[1];
            if (MUTANTS[m] !== undefined) {
                MUTANTS[m] = true;
            }
        }
    }
}
if (typeof process !== 'undefined' && process.env && process.env.MUTANT) {
    if (MUTANTS[process.env.MUTANT] !== undefined) {
        MUTANTS[process.env.MUTANT] = true;
    }
}

function encodeStratumId(x, y, z, s) {
    return `${x | 0},${y | 0},${z | 0},${s | 0}`;
}

function decodeStratumId(id) {
    const parts = id.split(',').map(Number);
    return { x: parts[0], y: parts[1], z: parts[2], s: parts[3] };
}

function canonicalEdgeKey(idA, idB) {
    const [id1, id2] = idA < idB ? [idA, idB] : [idB, idA];
    return `${id1}:${id2}`;
}

function getDownwardNeighborId(x, y, z, s) {
    if (s > 0) {
        return encodeStratumId(x, y, z, s - 1);
    } else {
        return encodeStratumId(x, y, z - 1, 4);
    }
}

function getUpwardNeighborId(x, y, z, s) {
    if (s < 4) {
        return encodeStratumId(x, y, z, s + 1);
    } else {
        return encodeStratumId(x, y, z + 1, 0);
    }
}

class SoilStratum {
    constructor(x, y, z, s, horizon, sand, silt, clay, organic, bulkDensity, porosity, fieldCapacity, initialMoistureBp = 0, loose = false, angleRepose = 34) {
        this.id = encodeStratumId(x, y, z, s);
        this.x = x | 0;
        this.y = y | 0;
        this.z = z | 0;
        this.s = s | 0;
        this.horizon = horizon;
        this.sand = sand | 0;
        this.silt = silt | 0;
        this.clay = clay | 0;
        this.organic = organic | 0;
        this.bulkDensity = Math.round(bulkDensity); // centipounds per cu ft
        this.porosity = porosity | 0; // basis points (0..10000)
        this.fieldCapacity = fieldCapacity | 0; // basis points (0..10000)
        this.loose = Boolean(loose);
        this.angleRepose = Number(angleRepose);
        this.particles = 5000;

        // Primary physical mass state in integer centipounds (DEC-040)
        this.solidMassCp = Math.round(this.bulkDensity * VOLUME_PER_STRATUM);
        this.looseMassCp = 0;
        
        // Water mass state
        const maxWater = this.getMaxWaterMass();
        this.waterMassCp = Math.min(maxWater, Math.max(0, Math.round(maxWater * ((initialMoistureBp || 0) / 10000))));
    }

    get moisture() {
        const max = this.getMaxWaterMass();
        if (max <= 0) return 0;
        if (MUTANTS.bypass_pore_clamp) {
            return Math.max(0, Math.round((this.waterMassCp / max) * 10000));
        }
        return Math.min(10000, Math.max(0, Math.round((this.waterMassCp / max) * 10000)));
    }

    set moisture(bp) {
        const max = this.getMaxWaterMass();
        if (MUTANTS.bypass_pore_clamp) {
            this.waterMassCp = Math.max(0, Math.round(max * ((bp || 0) / 10000)));
            return;
        }
        this.waterMassCp = Math.min(max, Math.max(0, Math.round(max * ((bp || 0) / 10000))));
    }

    get mass() {
        return this.solidMassCp + this.looseMassCp + this.waterMassCp;
    }

    set mass(val) {
        // Compatibility setter: adjusts solid mass
        this.solidMassCp = Math.max(0, Math.round(val));
        this.bulkDensity = Math.round(this.solidMassCp / VOLUME_PER_STRATUM);
    }

    getMaxWaterMass() {
        return Math.floor(VOLUME_PER_STRATUM * (this.porosity / 10000) * WATER_DENSITY_CP_PER_CUFT);
    }

    getCurrentWaterMass() {
        return this.waterMassCp;
    }

    getFieldCapacityWaterMass() {
        return Math.floor(this.getMaxWaterMass() * (this.fieldCapacity / 10000));
    }

    getAvailablePoreCapacity() {
        return Math.max(0, this.getMaxWaterMass() - this.waterMassCp);
    }

    getExcessDrainableWater() {
        return Math.max(0, this.waterMassCp - this.getFieldCapacityWaterMass());
    }

    serialize() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            z: this.z,
            s: this.s,
            horizon: this.horizon,
            sand: this.sand,
            silt: this.silt,
            clay: this.clay,
            organic: this.organic,
            bulkDensity: this.bulkDensity,
            porosity: this.porosity,
            fieldCapacity: this.fieldCapacity,
            waterMassCp: this.waterMassCp,
            solidMassCp: this.solidMassCp,
            looseMassCp: this.looseMassCp,
            loose: this.loose,
            angleRepose: this.angleRepose,
            particles: this.particles
        };
    }

    static deserialize(data) {
        const s = new SoilStratum(
            data.x, data.y, data.z, data.s,
            data.horizon,
            data.sand, data.silt, data.clay, data.organic,
            data.bulkDensity, data.porosity, data.fieldCapacity,
            0, data.loose, data.angleRepose
        );
        s.waterMassCp = data.waterMassCp !== undefined ? data.waterMassCp : 0;
        s.solidMassCp = data.solidMassCp !== undefined ? data.solidMassCp : Math.round(s.bulkDensity * VOLUME_PER_STRATUM);
        s.looseMassCp = data.looseMassCp !== undefined ? data.looseMassCp : 0;
        s.particles = data.particles !== undefined ? data.particles : 5000;
        return s;
    }
}

class GeomorphologyEngine {
    constructor() {
        this.strata = new Map(); // id -> SoilStratum
        this.signedResidualMap = new Map(); // canonicalEdgeKey -> fractional remainder (DEC-038)
        this.dirtyColumns = new Set(); // stratum IDs requiring hydration or slope checks
        
        // Ledger mass accounts in integer centipounds (DEC-040)
        this.ledgerMassSoilWater = 0;
        this.ledgerMassSediment = 0;
        this.ledgerMassRock = 0;
        this.reservoirCeramicCp = 0;
        this.reservoirAshGasCp = 0;
        this.reservoirSuspendedSediment = 0;

        // Statistics for performance observability
        this.stats = {
            ticksExecuted: 0,
            strataVisited: 0,
            waterTransfers: 0,
            sedimentTransfers: 0,
            quiescentTicks: 0
        };
    }

    addStratum(stratum) {
        this.strata.set(stratum.id, stratum);
        return stratum;
    }

    getStratum(id) {
        return this.strata.get(id) || null;
    }

    markDirty(x, y, z, s) {
        this.dirtyColumns.add(encodeStratumId(x, y, z, s));
    }

    getHighestStratumAt(x, y) {
        let highest = null;
        let highestElev = -Infinity;
        for (const stratum of this.strata.values()) {
            if (stratum.x === x && stratum.y === y) {
                const elev = (stratum.z - (-16)) * 10 + stratum.s * 2;
                if (elev > highestElev) {
                    highestElev = elev;
                    highest = stratum;
                }
            }
        }
        return highest;
    }

    accumulateFractionalTransfer(edgeKey, rawFlow) {
        let grossFlow = rawFlow;
        if (!MUTANTS.discard_signed_residuals) {
            grossFlow += (this.signedResidualMap.get(edgeKey) || 0);
        }
        const intTransfer = Math.trunc(grossFlow);
        if (!MUTANTS.discard_signed_residuals) {
            this.signedResidualMap.set(edgeKey, grossFlow - intTransfer);
        } else {
            this.signedResidualMap.set(edgeKey, 0);
        }
        return intTransfer;
    }

    processMoistureTick(dt = 1, ledger = null) {
        this.stats.ticksExecuted++;
        if (this.dirtyColumns.size === 0) {
            this.stats.quiescentTicks++;
            return;
        }

        const activeIds = Array.from(this.dirtyColumns);
        this.dirtyColumns.clear();

        for (const id of activeIds) {
            this.stats.strataVisited++;
            const stratum = this.getStratum(id);
            if (!stratum) continue;

            // 1. Capillary Wicking (Upward draw from underlying stratum/aquifer)
            // Capillary draw operates only if receiver is below field capacity
            const receiverDeficitCp = stratum.getFieldCapacityWaterMass() - stratum.getCurrentWaterMass();
            if (receiverDeficitCp > 0) {
                const belowId = getDownwardNeighborId(stratum.x, stratum.y, stratum.z, stratum.s);
                const belowStratum = this.getStratum(belowId);
                if (belowStratum) {
                    // Donor available water: water above retention threshold (or field capacity)
                    const donorAvailCp = Math.max(0, belowStratum.getCurrentWaterMass());
                    if (donorAvailCp > 0) {
                        // Capillary flux rate: 2000 cp per unit dt, scaled by deficit
                        const conductivityFactor = Math.min(1.0, receiverDeficitCp / (stratum.getFieldCapacityWaterMass() || 1));
                        const rawFlow = Math.min(
                            receiverDeficitCp,
                            donorAvailCp,
                            Math.round(2000 * conductivityFactor * dt)
                        );

                        if (rawFlow > 0) {
                            const edgeKey = canonicalEdgeKey(stratum.id, belowId);
                            const intTransfer = this.accumulateFractionalTransfer(edgeKey, rawFlow);

                            if (intTransfer > 0) {
                                if (!MUTANTS.no_donor_debit) {
                                    belowStratum.waterMassCp -= intTransfer;
                                }
                                stratum.waterMassCp += intTransfer;
                                this.ledgerMassSoilWater += intTransfer;
                                this.stats.waterTransfers++;
                                if (ledger) {
                                    ledger.ledgerMassSoilWater = (ledger.ledgerMassSoilWater || 0) + intTransfer;
                                }
                            }
                        }
                    }
                }
            }

            // 2. Gravitational Drainage (Downward percolation of excess water above field capacity)
            const excessDrainCp = stratum.getExcessDrainableWater();
            if (excessDrainCp > 0) {
                // Downward neighbor (unless mutant reverse_drainage is active)
                const targetId = MUTANTS.reverse_drainage
                    ? getUpwardNeighborId(stratum.x, stratum.y, stratum.z, stratum.s)
                    : getDownwardNeighborId(stratum.x, stratum.y, stratum.z, stratum.s);
                
                const targetStratum = this.getStratum(targetId);
                if (targetStratum) {
                    const availableCapacity = targetStratum.getAvailablePoreCapacity();
                    if (availableCapacity > 0) {
                        const rawDrain = Math.min(excessDrainCp, availableCapacity);
                        const edgeKey = canonicalEdgeKey(stratum.id, targetId);
                        const intTransfer = this.accumulateFractionalTransfer(edgeKey, rawDrain);

                        if (intTransfer > 0) {
                            stratum.waterMassCp -= intTransfer;
                            targetStratum.waterMassCp += intTransfer;
                            this.stats.waterTransfers++;
                            // Target received water, queue it for percolation on subsequent tick
                            this.dirtyColumns.add(targetStratum.id);
                        }
                    }
                }
                // If stratum still holds excess water (e.g. lower stratum is saturated), keep dirty
                if (stratum.getExcessDrainableWater() > 0) {
                    this.dirtyColumns.add(stratum.id);
                }
            }
        }
    }

    processSlopeStability(dt = 1, ledger = null) {
        if (this.dirtyColumns.size === 0) {
            this.stats.quiescentTicks++;
            return;
        }

        const candidateIds = Array.from(this.dirtyColumns);
        const nextDirty = new Set();

        for (const id of candidateIds) {
            this.stats.strataVisited++;
            const stratum = this.getStratum(id);
            if (!stratum || !stratum.loose) continue;

            const sourceElev = (stratum.z - (-16)) * 10 + stratum.s * 2 + 2;

            // Angle of repose with capillary cohesion / saturation liquefaction
            let theta = stratum.angleRepose;
            if (stratum.horizon === 'O/A' || stratum.clay > 1500) {
                if (stratum.moisture > 1000 && stratum.moisture < 8000) {
                    theta = Math.max(theta, 45); // capillary cohesion
                } else if (stratum.moisture >= 8000) {
                    theta = Math.min(theta, 20); // mudslide risk
                }
            }

            const tanTheta = Math.tan((theta * Math.PI) / 180);
            const maxStableHeightDiff = tanTheta * 5; // 5 ft lattice spacing

            // 4 cardinal horizontal neighbors
            const neighbors = [
                { dx: 1, dy: 0 },
                { dx: -1, dy: 0 },
                { dx: 0, dy: 1 },
                { dx: 0, dy: -1 }
            ];

            for (const { dx, dy } of neighbors) {
                const nx = stratum.x + dx;
                const ny = stratum.y + dy;
                const neighborSurface = this.getHighestStratumAt(nx, ny);
                const neighborElev = neighborSurface 
                    ? (neighborSurface.z - (-16)) * 10 + neighborSurface.s * 2 + 2 
                    : 0;

                const heightDiff = sourceElev - neighborElev;
                if (heightDiff > maxStableHeightDiff) {
                    const excessHeight = heightDiff - maxStableHeightDiff;
                    const excessVolume = Math.min(VOLUME_PER_STRATUM, excessHeight * 5 * 5 * 0.5);
                    const excessMass = Math.round(excessVolume * stratum.bulkDensity);

                    const availableLoose = stratum.looseMassCp > 0 ? stratum.looseMassCp : stratum.solidMassCp;
                    if (excessMass > 0 && availableLoose > 0) {
                        const transferMass = Math.min(excessMass, availableLoose);
                        if (stratum.looseMassCp >= transferMass) {
                            stratum.looseMassCp -= transferMass;
                        } else {
                            stratum.solidMassCp -= transferMass;
                            stratum.bulkDensity = Math.round(stratum.solidMassCp / VOLUME_PER_STRATUM);
                        }

                        // Deposit into neighbor column
                        let target = neighborSurface;
                        if (!target || target.s === 4) {
                            const tz = neighborSurface ? neighborSurface.z + 1 : stratum.z;
                            target = new SoilStratum(
                                nx, ny, tz, 0,
                                stratum.horizon,
                                stratum.sand, stratum.silt, stratum.clay, stratum.organic,
                                stratum.bulkDensity, stratum.porosity, stratum.fieldCapacity,
                                0, true, stratum.angleRepose
                            );
                            this.addStratum(target);
                        }
                        target.looseMassCp = (target.looseMassCp || 0) + transferMass;
                        this.ledgerMassSediment += transferMass;
                        this.stats.sedimentTransfers++;
                        if (ledger) {
                            ledger.ledgerMassSediment = (ledger.ledgerMassSediment || 0) + transferMass;
                        }

                        nextDirty.add(target.id);
                        nextDirty.add(stratum.id);
                    }
                }
            }
        }

        for (const nid of nextDirty) {
            this.dirtyColumns.add(nid);
        }
    }

    applyWeathering(x, y, z, s, exposedSurface, dt = 1, ledger = null) {
        const stratum = this.getStratum(encodeStratumId(x, y, z, s));
        if (!stratum || !exposedSurface) return;

        // Mechanical weathering: exposed bedrock fractures into regolith sediment
        const fractureRate = 0.01 * dt;
        const rockLossCp = Math.round(stratum.solidMassCp * fractureRate);
        if (rockLossCp <= 0) return;

        stratum.solidMassCp -= rockLossCp;
        stratum.bulkDensity = Math.round(stratum.solidMassCp / VOLUME_PER_STRATUM);

        if (!MUTANTS.unbalanced_weathering) {
            stratum.looseMassCp = (stratum.looseMassCp || 0) + rockLossCp;
        }

        this.ledgerMassRock -= rockLossCp;
        this.ledgerMassSediment += rockLossCp;
        if (ledger) {
            ledger.ledgerMassRock = (ledger.ledgerMassRock || 0) - rockLossCp;
            ledger.ledgerMassSediment = (ledger.ledgerMassSediment || 0) + rockLossCp;
        }
    }

    applyWaterErosion(x, y, z, s, fluidVelocity, dt = 1, ledger = null) {
        const stratum = this.getStratum(encodeStratumId(x, y, z, s));
        if (!stratum || fluidVelocity <= 0) return;

        const erosionRate = Math.min(0.05, 0.005 * fluidVelocity * dt);
        const erodedMassCp = Math.round(stratum.solidMassCp * erosionRate);
        if (erodedMassCp <= 0) return;

        stratum.solidMassCp -= erodedMassCp;
        stratum.bulkDensity = Math.round(stratum.solidMassCp / VOLUME_PER_STRATUM);
        stratum.particles = Math.max(0, Math.round(stratum.particles * (1 - erosionRate)));

        this.reservoirSuspendedSediment += erodedMassCp;
        this.ledgerMassSediment += erodedMassCp;
        if (ledger) {
            ledger.ledgerMassSoil = (ledger.ledgerMassSoil || 0) - erodedMassCp;
            ledger.ledgerMassSediment = (ledger.ledgerMassSediment || 0) + erodedMassCp;
        }
    }

    applyThermalDegradation(x, y, z, s, tempKelvin, dt = 1, ledger = null) {
        const stratum = this.getStratum(encodeStratumId(x, y, z, s));
        if (!stratum) return;

        // Thermal degradation only occurs above 400 Kelvin
        if (tempKelvin < 400) return;

        const intensity = Math.min(0.1, ((tempKelvin - 400) / 1000) * 0.02 * dt);
        const organicFraction = stratum.organic / 10000;
        const organicLossCp = Math.round(stratum.solidMassCp * organicFraction * intensity);
        
        const clayFraction = stratum.clay / 10000;
        const clayBakedCp = Math.round(stratum.solidMassCp * clayFraction * intensity);

        const totalLossCp = organicLossCp + clayBakedCp;
        if (totalLossCp <= 0) return;

        stratum.solidMassCp -= totalLossCp;
        stratum.bulkDensity = Math.round(stratum.solidMassCp / VOLUME_PER_STRATUM);

        stratum.organic = Math.max(0, Math.round(stratum.organic * (1 - intensity)));
        stratum.clay = Math.max(0, Math.round(stratum.clay * (1 - intensity)));
        const rem = stratum.sand + stratum.silt + stratum.clay + stratum.organic;
        if (rem > 0) {
            stratum.sand = Math.round((stratum.sand / rem) * 10000);
            stratum.silt = Math.round((stratum.silt / rem) * 10000);
            const diff = 10000 - (stratum.sand + stratum.silt + stratum.clay + stratum.organic);
            stratum.sand += diff;
        }

        this.reservoirAshGasCp += organicLossCp;
        this.reservoirCeramicCp += clayBakedCp;
        if (ledger) {
            ledger.ledgerMassSoil = (ledger.ledgerMassSoil || 0) - totalLossCp;
            ledger.ledgerMassCeramic = (ledger.ledgerMassCeramic || 0) + clayBakedCp;
            ledger.ledgerMassAshGas = (ledger.ledgerMassAshGas || 0) + organicLossCp;
        }
    }

    getTotalMass() {
        let totalRock = 0;
        let totalSediment = 0;
        let totalWater = 0;

        for (const stratum of this.strata.values()) {
            totalRock += stratum.solidMassCp;
            totalWater += stratum.waterMassCp;
            totalSediment += (stratum.looseMassCp || 0);
        }

        const ceramic = this.reservoirCeramicCp || 0;
        const ashGas = this.reservoirAshGasCp || 0;
        const suspended = this.reservoirSuspendedSediment || 0;

        return {
            rock: totalRock,
            sediment: totalSediment + suspended,
            water: totalWater,
            ceramic,
            ashGas,
            total: totalRock + totalSediment + totalWater + ceramic + ashGas + suspended
        };
    }

    serialize() {
        const strataList = [];
        for (const s of this.strata.values()) {
            strataList.push(s.serialize());
        }
        return JSON.stringify({
            strata: strataList,
            residuals: Array.from(this.signedResidualMap.entries()),
            dirtyColumns: Array.from(this.dirtyColumns),
            ledgerMassSoilWater: this.ledgerMassSoilWater,
            ledgerMassSediment: this.ledgerMassSediment,
            ledgerMassRock: this.ledgerMassRock,
            reservoirCeramicCp: this.reservoirCeramicCp,
            reservoirAshGasCp: this.reservoirAshGasCp,
            reservoirSuspendedSediment: this.reservoirSuspendedSediment
        });
    }

    deserialize(jsonStr) {
        const data = JSON.parse(jsonStr);
        this.strata.clear();
        for (const sData of data.strata) {
            const s = SoilStratum.deserialize(sData);
            this.strata.set(s.id, s);
        }
        this.signedResidualMap = new Map(data.residuals || []);
        this.dirtyColumns = new Set(data.dirtyColumns || []);
        this.ledgerMassSoilWater = data.ledgerMassSoilWater || 0;
        this.ledgerMassSediment = data.ledgerMassSediment || 0;
        this.ledgerMassRock = data.ledgerMassRock || 0;
        this.reservoirCeramicCp = data.reservoirCeramicCp || 0;
        this.reservoirAshGasCp = data.reservoirAshGasCp || 0;
        this.reservoirSuspendedSediment = data.reservoirSuspendedSediment || 0;
    }
}

// Canonical Horizon Definitions
const HORIZON_SPECS = {
    'O/A': {
        name: 'O/A',
        bulkDensity: 3750,
        porosity: 4500,
        fieldCapacity: 3500,
        sand: 4000,
        silt: 3000,
        clay: 1000,
        organic: 2000,
        basisPoints: 2000
    },
    'B': {
        name: 'B',
        bulkDensity: 4750,
        porosity: 3800,
        fieldCapacity: 4000,
        sand: 3000,
        silt: 4000,
        clay: 2500,
        organic: 500,
        basisPoints: 3000
    },
    'C': {
        name: 'C',
        bulkDensity: 6000,
        porosity: 3000,
        fieldCapacity: 2500,
        sand: 6000,
        silt: 2500,
        clay: 1500,
        organic: 0,
        basisPoints: 5000
    }
};

function getHorizons() {
    return [HORIZON_SPECS['O/A'], HORIZON_SPECS['B'], HORIZON_SPECS['C']];
}

function createStratum(horizon, options = {}) {
    const spec = HORIZON_SPECS[horizon] || HORIZON_SPECS['O/A'];
    const sand = options.sand !== undefined ? options.sand : spec.sand;
    const silt = options.silt !== undefined ? options.silt : spec.silt;
    const clay = options.clay !== undefined ? options.clay : spec.clay;
    const organic = options.organic !== undefined ? options.organic : spec.organic;
    const bulkDensity = options.bulkDensity !== undefined ? options.bulkDensity : spec.bulkDensity;
    const porosity = options.porosity !== undefined ? options.porosity : spec.porosity;
    const fieldCapacity = options.fieldCapacity !== undefined ? options.fieldCapacity : spec.fieldCapacity;

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
        options.angleRepose !== undefined ? options.angleRepose : 34
    );
    if (options.particles !== undefined) s.particles = options.particles;
    if (options.mass !== undefined) s.solidMassCp = options.mass;
    return s;
}

function createAquifer(options = {}) {
    // Aquifer donor stratum representing saturated rock layer beneath
    return createStratum('C', {
        x: options.x || 0,
        y: options.y || 0,
        z: options.z !== undefined ? options.z : -1,
        s: options.s !== undefined ? options.s : 4,
        moisture: options.moisture !== undefined ? options.moisture : 8000,
        porosity: 3000,
        fieldCapacity: 2500
    });
}

// Public Delegation Helpers (Directly execute GeomorphologyEngine)
function simulateCapillaryRise(aquiferDonor, upperStratum, dt = 1) {
    const eng = new GeomorphologyEngine();
    eng.addStratum(aquiferDonor);
    eng.addStratum(upperStratum);
    eng.markDirty(upperStratum.x, upperStratum.y, upperStratum.z, upperStratum.s);
    eng.processMoistureTick(dt);
}

function simulateGravityPercolation(stratum, dt = 1) {
    const eng = new GeomorphologyEngine();
    eng.addStratum(stratum);
    const belowId = getDownwardNeighborId(stratum.x, stratum.y, stratum.z, stratum.s);
    const pos = decodeStratumId(belowId);
    const belowStratum = createStratum(stratum.horizon, {
        x: pos.x, y: pos.y, z: pos.z, s: pos.s,
        moisture: 0
    });
    eng.addStratum(belowStratum);
    eng.markDirty(stratum.x, stratum.y, stratum.z, stratum.s);
    eng.processMoistureTick(dt);
    return belowStratum;
}

function simulateWaterTransfer(stratum, amountBp) {
    const max = stratum.getMaxWaterMass();
    const massDelta = Math.round(max * (amountBp / 10000));
    stratum.waterMassCp = Math.max(0, stratum.waterMassCp + massDelta);
}

function clampMoisture(stratum) {
    if (MUTANTS.bypass_pore_clamp) return;
    const max = stratum.getMaxWaterMass();
    stratum.waterMassCp = Math.min(max, Math.max(0, stratum.waterMassCp));
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

function checkCollapse(sediment, slopeAngle) {
    return slopeAngle > sediment.angleRepose;
}

function weatherRock(initialRockMassCp) {
    const eng = new GeomorphologyEngine();
    const s = createStratum('C', {
        bulkDensity: Math.round(initialRockMassCp / VOLUME_PER_STRATUM)
    });
    s.solidMassCp = initialRockMassCp;
    eng.addStratum(s);
    eng.applyWeathering(s.x, s.y, s.z, s.s, true, 1);
    return {
        regolithMass: s.looseMassCp,
        remainingRockMass: s.solidMassCp,
        totalMass: s.solidMassCp + s.looseMassCp
    };
}

function simulateWaterErosion(stratum) {
    const eng = new GeomorphologyEngine();
    eng.addStratum(stratum);
    eng.applyWaterErosion(stratum.x, stratum.y, stratum.z, stratum.s, 10, 1);
}

function simulateLavaThermalDegradation(stratum) {
    const eng = new GeomorphologyEngine();
    eng.addStratum(stratum);
    eng.applyThermalDegradation(stratum.x, stratum.y, stratum.z, stratum.s, 1200, 1);
}

function serializeStratum(stratum) {
    return JSON.stringify(stratum.serialize());
}

function deserializeStratum(jsonStr) {
    return SoilStratum.deserialize(JSON.parse(jsonStr));
}

function createRegion() {
    return new GeomorphologyEngine();
}

function simulateQuiescence(engine) {
    engine.processMoistureTick(1);
    engine.processSlopeStability(1);
}

// Module export definitions
const exportedModule = {
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
    simulateCapillaryRise,
    simulateGravityPercolation,
    simulateWaterTransfer,
    clampMoisture,
    createSediment,
    checkCollapse,
    weatherRock,
    simulateWaterErosion,
    simulateLavaThermalDegradation,
    serializeStratum,
    deserializeStratum,
    createRegion,
    simulateQuiescence
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportedModule;
}

if (typeof window !== 'undefined') {
    window.DEUS = window.DEUS || {};
    window.DEUS.Sim = window.DEUS.Sim || {};
    window.DEUS.Sim.Soil = exportedModule;
}
