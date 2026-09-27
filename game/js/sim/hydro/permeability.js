"use strict";

// Permeability class is materials.porosity.perm (integer 0..6). The catalogue
// fraction stays null (PLACEHOLDER). This module does not write that record.
// 0 blocks. 6 is open air, which is a gravity opening, not a seep. 1..5 seep
// on an integer schedule: a higher class moves sooner. Not a measured conductivity.

function permOf(record) {
    if (!record || typeof record !== "object") return 0;
    const porosity = record.porosity;
    if (!porosity || typeof porosity !== "object") return 0;
    const p = porosity.perm;
    if (typeof p !== "number" || !Number.isInteger(p) || p < 0 || p > 6) return 0;
    return p;
}

// Visits between successful seeps. 0 means this class never seeps.
function seepPeriod(perm) {
    if (perm <= 0 || perm >= 6) return 0;
    if (perm >= 4) return 1;
    return 5 - perm;
}

// du moved on this visit (1-based). Perm 5 moves 2; the others that seep move 1.
function seepQuantum(perm, visit) {
    const period = seepPeriod(perm);
    if (period <= 0) return 0;
    const v = visit | 0;
    if (v <= 0 || (v % period) !== 0) return 0;
    return perm >= 5 ? 2 : 1;
}

module.exports = {
    permOf: permOf,
    seepPeriod: seepPeriod,
    seepQuantum: seepQuantum
};
