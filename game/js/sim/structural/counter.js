"use strict";

/**
 * Operations counter for bounded structural checks (DEC-083 connectivity).
 */
function createOpsCounter(limit) {
    if (!(limit === Infinity || (Number.isInteger(limit) && limit >= 0))) {
        throw new RangeError(`structural/counter: limit must be a non-negative integer or Infinity (got ${String(limit)})`);
    }
    const byKind = { read: 0, visit: 0 };
    let used = 0;
    return {
        get limit() { return limit; },
        get used() { return used; },
        get remaining() { return limit - used; },
        byKind,
        charge(kind) {
            if (kind !== "read" && kind !== "visit") {
                throw new Error(`structural/counter: unknown op kind "${kind}"`);
            }
            if (used >= limit) return false;
            used += 1;
            byKind[kind] += 1;
            return true;
        }
    };
}

const BUDGET = Symbol("BUDGET");

function* charge(ctx, kind) {
    while (!ctx.counter.charge(kind)) yield BUDGET;
    ctx.ops[kind] += 1;
    ctx.ops.total += 1;
}

module.exports = {
    createOpsCounter,
    charge,
    BUDGET
};
