"use strict";
// SIM.40.05 decay clock (design R-01.2). Host-agnostic: no file IO, no host global, no randomness.
// Instants are year-ticks. Remaining life is millionths. The calendar scale is not an input.

const R = 1000000;
const YT_PER_SY = 2400;
const LIFE_INF = 0xFFFFFFFF;
const LIFE_MAX = 0xFFFFFFFE;
const MAX = Number.MAX_SAFE_INTEGER;
const POROUS = { MUDBRICK: 1, BRICK: 1, RUBBLESTONE: 1 };

function fail(code, msg) {
    const e = new Error(msg);
    e.code = code;
    throw e;
}
function isUInt(n) {
    return typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
}
function mul(a, b) {
    if (!isUInt(a) || !isUInt(b)) fail("E_RANGE", "mul");
    if (a !== 0 && b > Math.floor(MAX / a)) fail("E_EXACT", "mul");
    return a * b;
}
function floorDiv(a, b) {
    if (!isUInt(a) || !isUInt(b) || b === 0) fail("E_RANGE", "floorDiv");
    return Math.floor(a / b);
}
function ceilDiv(a, b) {
    if (!isUInt(a) || !isUInt(b) || b === 0) fail("E_RANGE", "ceilDiv");
    if (a === 0) return 0;
    if (a > MAX - (b - 1)) fail("E_EXACT", "ceilDiv");
    return Math.floor((a + b - 1) / b);
}

function lifeYt(lifeMilli, fieldNum, fieldDen, ft8, root8, fire8) {
    if (lifeMilli === null) return LIFE_INF;
    if (!isUInt(lifeMilli) || lifeMilli === 0) fail("E_LIFE", "life");
    if (!isUInt(fieldNum) || !isUInt(fieldDen) || fieldNum === 0 || fieldDen === 0) fail("E_RANGE", "scale");
    if (!isUInt(ft8) || !isUInt(root8) || !isUInt(fire8) || ft8 === 0 || root8 === 0 || fire8 === 0) fail("E_RANGE", "modifier");
    // lifeYt = ceil(lifeYears * 2400 * fieldNum * 512 / (fieldDen * ft8 * root8 * fire8))
    // lifeYears = lifeMilli / 1000, so the integer form is
    // ceil(lifeMilli * 12 * fieldNum * 512 / (5 * fieldDen * ft8 * root8 * fire8)).
    const num = mul(mul(mul(lifeMilli, 12), fieldNum), 512);
    const den = mul(mul(mul(mul(5, fieldDen), ft8), root8), fire8);
    const y = ceilDiv(num, den);
    if (y < 1 || y > LIFE_MAX) fail("E_LIFE_YT", "lifeYt " + y);
    return y;
}

function remAt(clock, t) {
    if (!clock || !isUInt(t) || !isUInt(clock.t0) || !isUInt(clock.rem0)) fail("E_RANGE", "rem");
    if (clock.rem0 > R) fail("E_RANGE", "rem0");
    if (clock.lifeYt === LIFE_INF) return clock.rem0;
    if (!isUInt(clock.lifeYt) || clock.lifeYt < 1 || clock.lifeYt > LIFE_MAX) fail("E_RANGE", "lifeYt");
    if (t < clock.t0) return clock.rem0;
    let dt = t - clock.t0;
    if (dt > clock.lifeYt) dt = clock.lifeYt;
    const lost = floorDiv(mul(dt, R), clock.lifeYt);
    return clock.rem0 > lost ? clock.rem0 - lost : 0;
}

function cross(clock, p) {
    if (!isUInt(p) || p > R) fail("E_RANGE", "cross");
    if (clock.lifeYt === LIFE_INF) return null;
    if (p >= clock.rem0) return clock.t0;
    const num = mul(clock.rem0 - p, clock.lifeYt);
    const add = ceilDiv(num, R);
    if (clock.t0 > MAX - add) fail("E_EXACT", "cross");
    return clock.t0 + add;
}

function failYt(clock) {
    if (clock.lifeYt === LIFE_INF) return null;
    return cross(clock, 0);
}

function hpByte(maxHP, rem) {
    if (!isUInt(maxHP) || maxHP < 1 || maxHP > 255) fail("E_RANGE", "maxHP");
    if (!isUInt(rem) || rem > R) fail("E_RANGE", "hp");
    return ceilDiv(mul(maxHP, rem), R);
}

function thresholdRem(k, maxHP) {
    if (!isUInt(k) || !isUInt(maxHP) || maxHP < 1) fail("E_RANGE", "threshold");
    return floorDiv(mul(k, R), maxHP);
}

function rebase(clock, t1, newLifeYt) {
    if (!isUInt(t1)) fail("E_RANGE", "t1");
    if (newLifeYt !== LIFE_INF && (!isUInt(newLifeYt) || newLifeYt < 1 || newLifeYt > LIFE_MAX)) fail("E_LIFE_YT", "rebase");
    if (clock.lifeYt !== LIFE_INF) {
        const f = failYt(clock);
        if (t1 >= f) return { ok: false, code: "E_ALREADY_FAILED", failYt: f };
    }
    if (t1 < clock.t0) return { ok: true, clock: { t0: clock.t0, rem0: clock.rem0, lifeYt: newLifeYt } };
    return { ok: true, clock: { t0: t1, rem0: remAt(clock, t1), lifeYt: newLifeYt } };
}

function applyDamage(clock, t1, k, maxHP) {
    if (!isUInt(t1) || !isUInt(k) || k > 255) fail("E_RANGE", "damage");
    if (clock.lifeYt !== LIFE_INF) {
        const f = failYt(clock);
        if (t1 >= f) return { ok: false, code: "E_ALREADY_FAILED", failYt: f };
    }
    const cur = t1 < clock.t0 ? clock.rem0 : remAt(clock, t1);
    const cap = thresholdRem(k, maxHP);
    const rem0 = cur < cap ? cur : cap;
    const t0 = t1 < clock.t0 ? clock.t0 : t1;
    return { ok: true, clock: { t0: t0, rem0: rem0, lifeYt: clock.lifeYt } };
}

function applyRepair(clock, t1) {
    if (!isUInt(t1)) fail("E_RANGE", "repair");
    if (t1 < clock.t0) return { ok: true, clock: { t0: clock.t0, rem0: R, lifeYt: clock.lifeYt } };
    return { ok: true, clock: { t0: t1, rem0: R, lifeYt: clock.lifeYt } };
}

function ft8Of(dc, ftMilli, wR, layer) {
    if (!isUInt(ftMilli) || ftMilli > 1000) fail("E_RANGE", "ft");
    let ft = ftMilli;
    if (typeof layer === "number" && Number.isSafeInteger(layer) && layer <= -1) ft = 0;
    if (POROUS[dc]) return ceilDiv(8000 + 16 * ft, 1000);
    if (dc === "ASHLAR") {
        if (ft === 0) return 8;
        if (!isUInt(wR) || wR > 100) fail("E_RANGE", "wR");
        return ceilDiv(800000 + 16 * ft * (100 - wR), 100000);
    }
    return 8;
}

function root8Of(dc, roots) {
    if (!roots) return 8;
    if (POROUS[dc]) return 16;
    if (dc === "ASHLAR") return 12;
    return 8;
}

function fire8Of(dc, charred) {
    if (charred && (dc === "TIMBER" || dc === "LIGHTWOOD")) return 12;
    return 8;
}

module.exports = {
    R: R,
    YT_PER_SY: YT_PER_SY,
    LIFE_INF: LIFE_INF,
    LIFE_MAX: LIFE_MAX,
    floorDiv: floorDiv,
    ceilDiv: ceilDiv,
    mul: mul,
    lifeYt: lifeYt,
    remAt: remAt,
    cross: cross,
    failYt: failYt,
    hpByte: hpByte,
    thresholdRem: thresholdRem,
    rebase: rebase,
    applyDamage: applyDamage,
    applyRepair: applyRepair,
    ft8Of: ft8Of,
    root8Of: root8Of,
    fire8Of: fire8Of
};
