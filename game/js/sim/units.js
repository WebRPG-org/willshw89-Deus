"use strict";

// NAT.02.MASS part 1: pure shared units, with no engine or catalogue imports.
// Authoritative stored masses are nonnegative safe-integer Number cp values.
const CP_PER_LB = 100;
const CELL_FT = 5;
const STRATUM_FT = 2;
const STRATA_PER_Z = 5;
const STRATUM_FT3 = CELL_FT * CELL_FT * STRATUM_FT;
const WATER_CP_PER_FT3 = 6240;
const WATER_CP_PER_STRATUM = WATER_CP_PER_FT3 * STRATUM_FT3;
const WATER_CP_PER_Z_CELL = WATER_CP_PER_STRATUM * STRATA_PER_Z;
const CP_PER_GALLON = 834; // Display only; never a storage or transfer quantum.
const MAX_CP = BigInt(Number.MAX_SAFE_INTEGER);

function requireAmount(value, name) {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new RangeError(`${name} must be a nonnegative safe integer`);
    }
}

function checkedCp(value, name) {
    if (value < 0n || value > MAX_CP) {
        throw new RangeError(`${name} result is outside 0..Number.MAX_SAFE_INTEGER cp`);
    }
    return Number(value);
}

// Decimal strings preserve catalogue precision. Number inputs mean their
// shortest decimal spelling, including scientific notation for tiny values.
// Scientific notation in strings is intentionally not part of the API.
function decimalRatio(value) {
    let text;
    if (typeof value === "number") {
        if (!Number.isFinite(value) || value < 0) {
            throw new RangeError("mass must be finite and nonnegative");
        }
        text = String(value);
    } else if (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value)) {
        text = value;
    } else {
        throw new TypeError("mass must be a nonnegative Number or plain decimal string");
    }
    const [mantissa, exponent = "0"] = text.split("e");
    const [whole, fraction = ""] = mantissa.split(".");
    const shift = Number(exponent) - fraction.length;
    const digits = BigInt(whole + fraction);
    return shift >= 0
        ? [digits * 10n ** BigInt(shift), 1n]
        : [digits, 10n ** BigInt(-shift)];
}

function massToCp(value, scale) {
    const [digits, decimalDenominator] = decimalRatio(value);
    // 1 lb = 0.45359237 kg exactly; all arithmetic before storage is BigInt.
    const numerator = digits * scale;
    const denominator = decimalDenominator * 45359237n;
    const quotient = numerator / denominator;
    const remainder = numerator % denominator;
    const rounded = quotient + (remainder * 2n >= denominator ? 1n : 0n);
    return checkedCp(rounded, "mass conversion");
}

function kgToCp(kg) { return massToCp(kg, 10000000000n); }
function gToCp(g) { return massToCp(g, 10000000n); }

function addCp(a, b) {
    requireAmount(a, "addCp a");
    requireAmount(b, "addCp b");
    return checkedCp(BigInt(a) + BigInt(b), "addCp");
}

function subCp(a, b) {
    requireAmount(a, "subCp a");
    requireAmount(b, "subCp b");
    return checkedCp(BigInt(a) - BigInt(b), "subCp");
}

function mulCp(a, b) {
    requireAmount(a, "mulCp a");
    requireAmount(b, "mulCp multiplier");
    return checkedCp(BigInt(a) * BigInt(b), "mulCp");
}

// Largest remainder (Hamilton) allocation. Equal remainders favour the lower
// input index; callers must supply recipients in a stable order. No mutation.
function apportion(totalCp, weights) {
    requireAmount(totalCp, "apportion totalCp");
    if (!Array.isArray(weights)) throw new TypeError("apportion weights must be an array");
    let weightTotal = 0n;
    for (let i = 0; i < weights.length; i++) {
        requireAmount(weights[i], `apportion weights[${i}]`);
        weightTotal += BigInt(weights[i]);
    }
    if (totalCp === 0) return weights.map(() => 0);
    if (weightTotal === 0n) throw new RangeError("positive mass requires positive total weight");
    let allocated = 0n;
    const shares = weights.map((weight, index) => {
        const numerator = BigInt(totalCp) * BigInt(weight);
        const amount = numerator / weightTotal;
        allocated += amount;
        return { index, amount: Number(amount), remainder: numerator % weightTotal };
    });
    const result = shares.map(share => share.amount);
    shares.sort((a, b) => a.remainder === b.remainder
        ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
    const leftover = Number(BigInt(totalCp) - allocated);
    for (let i = 0; i < leftover; i++) result[shares[i].index]++;
    return result;
}

// DEC-038 item 7: NW v1 envelope, not an engine size limit. Check a caller's
// maximum mass per stratum plus its separate reservoirs without scanning a
// world. Material/core bounds belong to their future importers, not this table.
const WORLD_BOUND = Object.freeze({ cellsX: 768, cellsY: 768, zLevels: 32 });
function checkWorldBound(maxCpPerStratum, extraReservoirCp = 0) {
    requireAmount(maxCpPerStratum, "WORLD_BOUND maxCpPerStratum");
    requireAmount(extraReservoirCp, "WORLD_BOUND extraReservoirCp");
    const strata = BigInt(WORLD_BOUND.cellsX) * BigInt(WORLD_BOUND.cellsY)
        * BigInt(WORLD_BOUND.zLevels) * BigInt(STRATA_PER_Z);
    return checkedCp(strata * BigInt(maxCpPerStratum) + BigInt(extraReservoirCp), "WORLD_BOUND");
}
const WORLD_BOUND_WATER_CP = checkWorldBound(WATER_CP_PER_STRATUM);

module.exports = Object.freeze({
    CP_PER_LB, CELL_FT, STRATUM_FT, STRATA_PER_Z, STRATUM_FT3,
    WATER_CP_PER_FT3, WATER_CP_PER_STRATUM, WATER_CP_PER_Z_CELL, CP_PER_GALLON,
    kgToCp, gToCp, addCp, subCp, mulCp, apportion,
    WORLD_BOUND, WORLD_BOUND_WATER_CP, checkWorldBound
});
