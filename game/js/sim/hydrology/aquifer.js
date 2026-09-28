"use strict";

/**
 * game/js/sim/hydrology/aquifer.js
 *
 * Project DEUS Lean Aquifer & Water Table Kernel (NAT.03.01).
 * Authority: DEC-038 (Ratified: 5 biomes + continuous wildness, 5 strata per Z,
 * integer head datum, harmonic conductivity, signed canonical edge residuals,
 * double-sided fluid capacity clamping).
 *
 * Host-agnostic simulation module: no browser/DOM globals, no Math.random() at runtime,
 * strictly deterministic, exact integer centipound mass conservation.
 */

// Volume and mass constants
const VOLUME_PER_STRATUM = 50; // cu ft (5 ft x 5 ft x 2 ft)
const WATER_DENSITY_CENTIPOUNDS_PER_CUFT = 6240; // 62.4 lbs/cu ft = 6240 centipounds/cu ft
const MAX_WATER_MASS_PER_STRATUM = VOLUME_PER_STRATUM * WATER_DENSITY_CENTIPOUNDS_PER_CUFT; // 312,000 centipounds
const POROSITY_MAX = 10000; // basis points (10000 = 100.00%)
const SATURATION_MAX = 10000; // basis points (10000 = 100.00%)
const MILLISTRATA_PER_STRATUM = 1000; // 1000 millistrata = 1 stratum = 2 ft
const DATUM_Z = -16; // Bedrock datum Z
const DATUM_S = 0;   // Bedrock datum stratum

/**
 * Encode stratum coordinates (x, y, z, s) into canonical string ID.
 * Supports continuous coordinates x, y in [0..255] or world grid, z in [-16..15], s in [0..4].
 */
function encodeStratumId(x, y, z, s) {
    return `${x},${y},${z},${s}`;
}

/**
 * Decode canonical stratum string ID into [x, y, z, s].
 */
function decodeStratumId(id) {
    const parts = id.split(",").map(Number);
    return parts; // [x, y, z, s]
}

/**
 * Calculate canonical undirected edge key: always min(idA, idB) + ":" + max(idA, idB).
 */
function canonicalEdgeKey(idA, idB) {
    return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
}

/**
 * Calculate harmonic mean interface conductivity between two media.
 * If either conductivity is 0, interface conductivity is 0 (impermeable barrier).
 */
function calcInterfaceConductivity(kA, kB) {
    if (kA === 0 || kB === 0) return 0;
    return Math.floor((2 * kA * kB) / (kA + kB));
}

/**
 * Stratum represents a 2-ft vertical layer in a 10-ft Z cell.
 */
class Stratum {
    constructor(id, x, y, z, s, porosity = 3000, conductivity = 100000, waterMass = 0, type = "porous_rock") {
        this.id = id;
        this.x = x;
        this.y = y;
        this.z = z;
        this.s = s;
        this.type = type; // "porous_rock" | "void" | "cavern" | "surface_water" | "impermeable"
        this.porosity = porosity; // integer basis points (0..10000)
        this.conductivity = conductivity; // integer (0..1000000)
        this.waterMass = waterMass; // integer centipounds

        // Capacity depends on type
        if (this.type === "void" || this.type === "cavern") {
            this.maxWaterMass = MAX_WATER_MASS_PER_STRATUM; // open free-fluid capacity
        } else if (this.type === "surface_water") {
            this.maxWaterMass = MAX_WATER_MASS_PER_STRATUM;
        } else {
            // Porous rock capacity is bounded by porosity
            this.maxWaterMass = Math.floor((this.porosity * MAX_WATER_MASS_PER_STRATUM) / POROSITY_MAX);
        }
    }

    get saturation() {
        if (this.maxWaterMass <= 0) return 0;
        return Math.min(SATURATION_MAX, Math.floor((this.waterMass * SATURATION_MAX) / this.maxWaterMass));
    }

    get elevationHead() {
        return ((this.z - DATUM_Z) * 5 + this.s) * MILLISTRATA_PER_STRATUM;
    }

    get pressureHead() {
        return Math.floor(this.saturation / 10);
    }

    get totalHead() {
        return this.elevationHead + this.pressureHead;
    }

    getAvailableFluidCapacity() {
        return Math.max(0, this.maxWaterMass - this.waterMass);
    }

    addWater(amount) {
        this.waterMass += amount;
    }

    removeWater(amount) {
        this.waterMass -= amount;
    }
}

/**
 * AquiferEngine coordinates the discrete cell-to-cell Darcy transfer,
 * canonical undirected edge residual tracking, and dirty-region event loops.
 */
class AquiferEngine {
    constructor() {
        this.strata = new Map(); // id -> Stratum
        this.signedResidualMap = new Map(); // edgeKey -> float signed residual
        this.dirtyCells = new Set(); // Set of active cell IDs
        this.ledgerMassWater = 0; // Authoritative groundwater mass in centipounds
        this.ledgerMassVoid = 0;  // Authoritative free fluid mass in centipounds
    }

    addStratum(stratum) {
        this.strata.set(stratum.id, stratum);
        if (stratum.type === "void" || stratum.type === "cavern") {
            this.ledgerMassVoid += stratum.waterMass;
        } else {
            this.ledgerMassWater += stratum.waterMass;
        }
        this.dirtyCells.add(stratum.id);
    }

    getStratum(id) {
        return this.strata.get(id);
    }

    markDirty(x, y, z, s) {
        const id = encodeStratumId(x, y, z, s);
        if (this.strata.has(id)) {
            this.dirtyCells.add(id);
            // Wake immediate neighbors
            const neighbors = this.getNeighbors(id);
            for (let i = 0; i < neighbors.length; i++) {
                this.dirtyCells.add(neighbors[i]);
            }
        }
    }

    getNeighbors(id) {
        const [x, y, z, s] = decodeStratumId(id);
        const neighbors = [];

        // Horizontal neighbors (L = 5 ft)
        neighbors.push(encodeStratumId(x + 1, y, z, s));
        neighbors.push(encodeStratumId(x - 1, y, z, s));
        neighbors.push(encodeStratumId(x, y + 1, z, s));
        neighbors.push(encodeStratumId(x, y - 1, z, s));

        // Vertical neighbors (L = 2 ft)
        if (s === 0) {
            if (z > DATUM_Z) neighbors.push(encodeStratumId(x, y, z - 1, 4));
        } else {
            neighbors.push(encodeStratumId(x, y, z, s - 1));
        }

        if (s === 4) {
            if (z < 15) neighbors.push(encodeStratumId(x, y, z + 1, 0));
        } else {
            neighbors.push(encodeStratumId(x, y, z, s + 1));
        }

        return neighbors.filter(nid => this.strata.has(nid));
    }

    isHorizontalNeighbor(idA, idB) {
        const [xA, yA, zA, sA] = decodeStratumId(idA);
        const [xB, yB, zB, sB] = decodeStratumId(idB);
        return zA === zB && sA === sB && (Math.abs(xA - xB) + Math.abs(yA - yB) === 1);
    }

    /**
     * Process one discrete simulation tick across active dirty cells only.
     * Evaluates canonical undirected edges, signed residuals, and double-sided clamping.
     */
    processTick(dt = 1, ledger = null) {
        if (this.dirtyCells.size === 0) {
            return {
                activeCells: 0,
                interfacesProcessed: 0,
                transfersExecuted: 0,
                totalWaterMoved: 0
            };
        }

        // Collect unique canonical edges touching currently dirty cells
        const activeEdges = new Set();
        for (const cellId of this.dirtyCells) {
            const neighbors = this.getNeighbors(cellId);
            for (let i = 0; i < neighbors.length; i++) {
                const edgeKey = canonicalEdgeKey(cellId, neighbors[i]);
                activeEdges.add(edgeKey);
            }
        }

        let totalWaterMoved = 0;
        let transfersExecuted = 0;
        const stillDirty = new Set();

        // Process edges in deterministic sorted order
        const sortedEdgeKeys = Array.from(activeEdges).sort();

        for (let i = 0; i < sortedEdgeKeys.length; i++) {
            const edgeKey = sortedEdgeKeys[i];
            const [idA, idB] = edgeKey.split(":");
            const stratumA = this.strata.get(idA);
            const stratumB = this.strata.get(idB);
            if (!stratumA || !stratumB) continue;

            const kA = stratumA.conductivity;
            const kB = stratumB.conductivity;
            const kInterface = calcInterfaceConductivity(kA, kB);

            if (kInterface === 0) continue; // Impermeable barrier

            const deltaH = stratumA.totalHead - stratumB.totalHead;
            if (deltaH === 0 && (!this.signedResidualMap.has(edgeKey) || this.signedResidualMap.get(edgeKey) === 0)) {
                continue;
            }

            const L = this.isHorizontalNeighbor(idA, idB) ? 5 : 2;

            // Darcy flux scaled to integer centipounds per tick
            // Raw flow rate in canonical direction A -> B:
            const rawFlow = (kInterface * deltaH) / (L * 1000000);

            // Accumulate onto canonical undirected signed residual
            const oldResidual = this.signedResidualMap.get(edgeKey) || 0;
            const signedGrossFlow = rawFlow * dt + oldResidual;
            const integerFlow = Math.trunc(signedGrossFlow);
            const newResidual = signedGrossFlow - integerFlow;
            this.signedResidualMap.set(edgeKey, newResidual);

            if (integerFlow === 0) {
                // If there's an ongoing head difference or fractional residual, keep cells dirty
                if (Math.abs(deltaH) > 0) {
                    stillDirty.add(idA);
                    stillDirty.add(idB);
                }
                continue;
            }

            // Transfer direction:
            // integerFlow > 0 means canonical A -> B (A is donor, B is receiver)
            // integerFlow < 0 means canonical B -> A (B is donor, A is receiver)
            let donor, receiver, desiredTransfer;
            if (integerFlow > 0) {
                donor = stratumA;
                receiver = stratumB;
                desiredTransfer = integerFlow;
            } else {
                donor = stratumB;
                receiver = stratumA;
                desiredTransfer = -integerFlow;
            }

            // Check negative control mutant 'no_clamp'
            let transfer;
            if (process.env.MUTANT === "no_clamp") {
                transfer = desiredTransfer; // bypass clamping
            } else {
                // Generalized double-sided clamping invariant:
                const donorAvail = Math.max(0, donor.waterMass);
                const receiverCap = receiver.getAvailableFluidCapacity();
                transfer = Math.min(desiredTransfer, donorAvail, receiverCap);
            }

            if (transfer > 0) {
                // Check negative control mutant 'infinite_water'
                if (process.env.MUTANT !== "infinite_water") {
                    donor.removeWater(transfer);
                }
                receiver.addWater(transfer);

                // Update ledger categories
                if (donor.type === "void" || donor.type === "cavern") {
                    this.ledgerMassVoid -= transfer;
                } else {
                    this.ledgerMassWater -= transfer;
                }

                if (receiver.type === "void" || receiver.type === "cavern") {
                    this.ledgerMassVoid += transfer;
                } else {
                    this.ledgerMassWater += transfer;
                }

                totalWaterMoved += transfer;
                transfersExecuted++;

                // Cells are dirty as long as water moves
                stillDirty.add(donor.id);
                stillDirty.add(receiver.id);
            }
        }

        this.dirtyCells = stillDirty;

        return {
            activeCells: this.dirtyCells.size,
            interfacesProcessed: sortedEdgeKeys.length,
            transfersExecuted,
            totalWaterMoved
        };
    }

    getTotalMass() {
        let total = 0;
        for (const stratum of this.strata.values()) {
            total += stratum.waterMass;
        }
        return total;
    }

    serialize() {
        const strataData = [];
        for (const s of this.strata.values()) {
            strataData.push({
                id: s.id,
                x: s.x,
                y: s.y,
                z: s.z,
                s: s.s,
                type: s.type,
                porosity: s.porosity,
                conductivity: s.conductivity,
                waterMass: s.waterMass
            });
        }
        const residualsData = Array.from(this.signedResidualMap.entries());
        const dirtyData = Array.from(this.dirtyCells);
        return JSON.stringify({
            strata: strataData,
            residuals: residualsData,
            dirty: dirtyData,
            ledgerMassWater: this.ledgerMassWater,
            ledgerMassVoid: this.ledgerMassVoid
        });
    }

    deserialize(jsonStr) {
        const data = JSON.parse(jsonStr);
        this.strata.clear();
        this.signedResidualMap.clear();
        this.dirtyCells.clear();
        this.ledgerMassWater = data.ledgerMassWater;
        this.ledgerMassVoid = data.ledgerMassVoid;

        for (let i = 0; i < data.strata.length; i++) {
            const d = data.strata[i];
            const s = new Stratum(d.id, d.x, d.y, d.z, d.s, d.porosity, d.conductivity, d.waterMass, d.type);
            this.strata.set(s.id, s);
        }

        for (let i = 0; i < data.residuals.length; i++) {
            this.signedResidualMap.set(data.residuals[i][0], data.residuals[i][1]);
        }

        for (let i = 0; i < data.dirty.length; i++) {
            this.dirtyCells.add(data.dirty[i]);
        }
    }
}

module.exports = {
    Stratum,
    AquiferEngine,
    encodeStratumId,
    decodeStratumId,
    canonicalEdgeKey,
    calcInterfaceConductivity,
    MAX_WATER_MASS_PER_STRATUM,
    VOLUME_PER_STRATUM,
    WATER_DENSITY_CENTIPOUNDS_PER_CUFT
};
