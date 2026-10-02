"use strict";

// WG.62.03 void manifold. A cell is open or solid from (seed, gx, gy, z) alone.
// The field is 3D simplex at world coordinates, so a cave that crosses a chunk
// or an area edge is the same value from both sides. No chunk has to be
// generated to finish its neighbour (that continuation is what cascades).
//
// Bands follow DEC-038. Sky (+12..+15) is never open. Shafts are kind "shaft"
// and may reach zMin; the bedrock stratum at zMin is the applier's rule.
// This module does not write strata. GEN=5 baselines stay on the Levels carve.
//
// chunkCarveMask samples the low-frequency gate at the four corners, the four
// edge midpoints and the centre of the 32×32. That is the cheap predicate.
// A miss means the gate cannot clear its threshold anywhere in the chunk
// (the pad is the simplex slope over the farthest cell). On a miss the chunk
// is UNIFORM. On a hit the mask is the per-cell kind.

const Z_MIN = -16;
const Z_MAX = 15;
const Z_SKY = 12;
const CHUNK = 32;
const AREA = 256;

const KIND = Object.freeze({ none: 0, cave: 1, ravine: 2, shaft: 3, chamber: 4 });
const KIND_NAME = Object.freeze(["none", "cave", "ravine", "shaft", "chamber"]);

// Gate frequency is low so nine samples plus a slope pad can reject a chunk.
// Worms and sheets are higher frequency and run only after the gate passes,
// which is what keeps an uncarved chunk off the full 32×32 walk.
const DIST_F = 1 / 72;
const DIST_PAD = 0.35;
const DIST_PAD_FINE = 0.18;
const RAVINE_PAD_FINE = 0.22;
const FINE_AT = [0, 8, 16, 24, 31];
const SAMPLE_DX = [0, 31, 0, 31, 0, 31, 16, 16, 16];
const SAMPLE_DY = [0, 0, 31, 31, 16, 16, 0, 31, 16];

// Shaft lattice. About one column in seven cells, vertical, so a deep layer
// stays under the 8% MIXED cap (64 chunks, five MIXED is the line).
const SHAFT_GAP = 96;
const SHAFT_MOD = 7;
const SHAFT_R2_DEEP = 1.44;
const SHAFT_R2_MOUTH = 4.41;

// Caverns (−10..−5): the primary belt. Target ≤ 25% MIXED chunks on seed 18.
// The gate is high so the belt is a few districts, not a layer-wide sheet.
const CAVERN_GATE = 0.83;
const WORM_F = 1 / 22;
const WORM_FZ = 1 / 14;
const WORM_THICK = 0.15;
const CHEESE_F = 1 / 32;
const CHEESE_FZ = 1 / 26;
const CHEESE_GATE = 0.86;
const CHEESE_THRESH = 0.66;
const FRACTURE_F = 1 / 17;
const FRACTURE_FZ = 1 / 13;
const FRACTURE_GATE = 0.84;
const FRACTURE_THICK = 0.022;

// Deep Earth side pockets stay inside the shaft's chunk. A free sheet here
// would mark extra chunks and blow the 8% MIXED cap.
const DEEP_SHEET_R2 = 20.25;
const DEEP_FRACTURE_THICK = 0.04;
const POCKET_R2 = 12.25;
const POCKET_THRESH = 0.05;

// Lowlands (−4..+1): ravines, karst, and the shaft mouth (the cliff portal).
const RAVINE_GF = 1 / 84;
const RAVINE_GATE = 0.58;
const RAVINE_PAD = 0.40;
const RAVINE_RF = 1 / 44;
const RAVINE_WIDTH = 0.030;
const KARST_F = 1 / 26;
const KARST_FZ = 1 / 18;
const KARST_GATE = 0.74;
const KARST_THRESH = 0.58;

// Uplands (+2..+6) and Highlands (+7..+11).
const UPLAND_GATE = 0.72;
const UPLAND_THICK = 0.095;
const HANG_GATE = 0.80;
const HANG_WIDTH = 0.038;
const HIGH_GATE = 0.80;
const HIGH_F = 1 / 20;
const HIGH_FZ = 1 / 16;
const HIGH_THRESH = 0.50;

const F3 = 1 / 3;
const G3 = 1 / 6;
const GX = new Float64Array([1, -1, 1, -1, 1, -1, 1, -1, 0, 0, 0, 0]);
const GY = new Float64Array([1, 1, -1, -1, 0, 0, 0, 0, 1, -1, 1, -1]);
const GZ = new Float64Array([0, 0, 0, 0, 1, 1, -1, -1, 1, 1, -1, -1]);

let permSeed = 0xffffffff;
const perm = new Uint8Array(512);
const perm12 = new Uint8Array(512);

function buildPerm(seed) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let a = seed | 0;
    for (let i = 255; i > 0; i--) {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        const j = Math.floor(u * (i + 1));
        const s = p[i];
        p[i] = p[j];
        p[j] = s;
    }
    for (let i = 0; i < 512; i++) {
        const v = p[i & 255];
        perm[i] = v;
        perm12[i] = v % 12;
    }
    permSeed = seed;
}

function n3(seed, x, y, z) {
    seed >>>= 0;
    if (seed !== permSeed) buildPerm(seed);
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    const t = (i + j + k) * G3;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const z0 = z - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
        if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
        else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let n = 0;
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 > 0) {
        const g = perm12[ii + perm[jj + perm[kk]]];
        t0 *= t0;
        n += t0 * t0 * (GX[g] * x0 + GY[g] * y0 + GZ[g] * z0);
    }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 > 0) {
        const g = perm12[ii + i1 + perm[jj + j1 + perm[kk + k1]]];
        t1 *= t1;
        n += t1 * t1 * (GX[g] * x1 + GY[g] * y1 + GZ[g] * z1);
    }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 > 0) {
        const g = perm12[ii + i2 + perm[jj + j2 + perm[kk + k2]]];
        t2 *= t2;
        n += t2 * t2 * (GX[g] * x2 + GY[g] * y2 + GZ[g] * z2);
    }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 > 0) {
        const g = perm12[ii + 1 + perm[jj + 1 + perm[kk + 1]]];
        t3 *= t3;
        n += t3 * t3 * (GX[g] * x3 + GY[g] * y3 + GZ[g] * z3);
    }
    return 32 * n;
}

function mix32(h) {
    h >>>= 0;
    h ^= h >>> 16;
    h = Math.imul(h, 0x7feb352d) >>> 0;
    h ^= h >>> 15;
    h = Math.imul(h, 0x846ca68b) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
}

function bandOf(z) {
    if (z >= Z_SKY) return "sky";
    if (z >= 7) return "highlands";
    if (z >= 2) return "uplands";
    if (z >= -4) return "lowlands";
    if (z >= -10) return "caverns";
    if (z >= Z_MIN) return "deep";
    return "below";
}

function shaftHash(seed, lx, ly) {
    return mix32((seed ^ 0x51a7c0e) + Math.imul(lx + 0x10000, 0x85ebca6b) + Math.imul(ly + 0x20000, 0xc2b2ae35));
}

function shaftOn(seed, lx, ly) {
    return (shaftHash(seed, lx, ly) % SHAFT_MOD) === 0;
}

function shaftCenter(seed, lx, ly) {
    const h = shaftHash(seed, lx, ly);
    const fx = (h & 1023) / 1023;
    const fy = ((h >>> 10) & 1023) / 1023;
    return {
        x: lx * SHAFT_GAP + fx * (SHAFT_GAP - 1) + 0.5,
        y: ly * SHAFT_GAP + fy * (SHAFT_GAP - 1) + 0.5
    };
}

function shaftRadius2(z) {
    if (z <= -5 && z >= Z_MIN) return SHAFT_R2_DEEP;
    if (z <= 0 && z >= -4) return SHAFT_R2_MOUTH;
    return -1;
}

// Nearest lattice shaft within r2, or null. r2 is compared to distance squared
// from the cell centre to the shaft centre.
function nearestShaft(seed, gx, gy, r2) {
    const cx = Math.floor(gx / SHAFT_GAP);
    const cy = Math.floor(gy / SHAFT_GAP);
    const px = gx + 0.5, py = gy + 0.5;
    let best = null;
    for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
            const lx = cx + ox, ly = cy + oy;
            if (!shaftOn(seed, lx, ly)) continue;
            const c = shaftCenter(seed, lx, ly);
            const dx = px - c.x, dy = py - c.y;
            const d2 = dx * dx + dy * dy;
            if (d2 <= r2 && (!best || d2 < best.d2)) best = { x: c.x, y: c.y, d2: d2 };
        }
    }
    return best;
}

function onShaft(seed, gx, gy, z) {
    const r2 = shaftRadius2(z);
    if (r2 < 0) return false;
    return nearestShaft(seed, gx, gy, r2) !== null;
}

function district(seed, gx, gy, z, ox, oy, oz) {
    return n3(seed, gx * DIST_F + ox, gy * DIST_F + oy, z * DIST_F * 1.65 + oz);
}

function gateHigh(seed, gx0, gy0, z, ox, oy, oz, gate, pad) {
    let hi = -2;
    for (let i = 0; i < 9; i++) {
        const v = district(seed, gx0 + SAMPLE_DX[i], gy0 + SAMPLE_DY[i], z, ox, oy, oz);
        if (v > hi) hi = v;
    }
    return hi + pad > gate;
}

function gateHighFine(seed, gx0, gy0, z, ox, oy, oz, gate) {
    let hi = -2;
    for (let yi = 0; yi < FINE_AT.length; yi++) {
        for (let xi = 0; xi < FINE_AT.length; xi++) {
            const v = district(seed, gx0 + FINE_AT[xi], gy0 + FINE_AT[yi], z, ox, oy, oz);
            if (v > hi) hi = v;
        }
    }
    return hi + DIST_PAD_FINE > gate;
}

function ravineGate(seed, gx, gy) {
    return n3(seed, gx * RAVINE_GF + 3.1, gy * RAVINE_GF + 11.7, 2.4);
}

function ravineMaybe(seed, gx0, gy0, fine) {
    let hi = -2;
    if (fine) {
        for (let yi = 0; yi < FINE_AT.length; yi++) {
            for (let xi = 0; xi < FINE_AT.length; xi++) {
                const v = ravineGate(seed, gx0 + FINE_AT[xi], gy0 + FINE_AT[yi]);
                if (v > hi) hi = v;
            }
        }
        return hi + RAVINE_PAD_FINE > RAVINE_GATE;
    }
    for (let i = 0; i < 9; i++) {
        const v = ravineGate(seed, gx0 + SAMPLE_DX[i], gy0 + SAMPLE_DY[i]);
        if (v > hi) hi = v;
    }
    return hi + RAVINE_PAD > RAVINE_GATE;
}

function ravineCell(seed, gx, gy, z) {
    if (z > 1 || z < -4) return false;
    if (ravineGate(seed, gx, gy) < RAVINE_GATE) return false;
    const ridge = n3(seed, gx * RAVINE_RF + 19.2, gy * RAVINE_RF + 4.6, 7.7);
    if (Math.abs(ridge) >= RAVINE_WIDTH) return false;
    const depth = n3(seed, gx * RAVINE_GF + 28.0, gy * RAVINE_GF + 9.4, 5.5);
    const t = Math.max(0, Math.min(1, (depth + 1) * 0.5));
    const floor = 1 - Math.round(t * 5);
    return z >= floor;
}

function karstCell(seed, gx, gy, z) {
    if (z > -1 || z < -4) return false;
    if (district(seed, gx, gy, z, 14.2, 6.6, 3.3) < KARST_GATE) return false;
    const c = n3(seed, gx * KARST_F + 8.4, gy * KARST_F + 2.2, z * KARST_FZ + 1.1);
    return c > KARST_THRESH;
}

function wormCell(seed, gx, gy, z) {
    if (district(seed, gx, gy, z, 4.2, 8.8, 1.4) < CAVERN_GATE) return false;
    const a = n3(seed, gx * WORM_F + 0.17, gy * WORM_F + 3.4, z * WORM_FZ + 0.6);
    if (Math.abs(a) >= WORM_THICK) return false;
    const b = n3(seed, gx * WORM_F + 21.5, gy * WORM_F + 12.8, z * WORM_FZ + 9.3);
    return Math.abs(b) < WORM_THICK;
}

function cheeseCell(seed, gx, gy, z) {
    if (district(seed, gx, gy, z, 4.2, 8.8, 1.4) < CHEESE_GATE) return false;
    const c = n3(seed, gx * CHEESE_F + 5.5, gy * CHEESE_F + 16.2, z * CHEESE_FZ + 2.8);
    return c > CHEESE_THRESH;
}

function fractureCell(seed, gx, gy, z, gate, thick) {
    if (district(seed, gx, gy, z, 4.2, 8.8, 1.4) < gate) return false;
    const f = n3(seed, gx * FRACTURE_F + 11.1, gy * FRACTURE_F * 0.72 + 3.3, z * FRACTURE_FZ + 6.6);
    return Math.abs(f) < thick;
}

function sameChunk(ax, ay, bx, by) {
    return (Math.floor(ax / CHUNK) === Math.floor(bx / CHUNK)) && (Math.floor(ay / CHUNK) === Math.floor(by / CHUNK));
}

// Beside a shaft, and only in that shaft's chunk. A pocket or sheet that
// crossed into the next chunk would count as another MIXED chunk.
function deepBeside(seed, gx, gy, r2) {
    const hit = nearestShaft(seed, gx, gy, r2);
    if (!hit || hit.d2 <= SHAFT_R2_DEEP) return null;
    if (!sameChunk(gx + 0.5, gy + 0.5, hit.x, hit.y)) return null;
    return hit;
}

function deepPocket(seed, gx, gy, z) {
    if (!deepBeside(seed, gx, gy, POCKET_R2)) return false;
    const n = n3(seed, gx * 0.19 + 2.4, gy * 0.19 + 7.1, z * 0.23 + 1.8);
    return n > POCKET_THRESH;
}

function deepSheet(seed, gx, gy, z) {
    if (!deepBeside(seed, gx, gy, DEEP_SHEET_R2)) return false;
    const f = n3(seed, gx * FRACTURE_F + 11.1, gy * FRACTURE_F * 0.72 + 3.3, z * FRACTURE_FZ + 6.6);
    return Math.abs(f) < DEEP_FRACTURE_THICK;
}

function uplandCave(seed, gx, gy, z) {
    if (z < 3 || z > 6) return false;
    if (district(seed, gx, gy, z, 18.4, 2.7, 9.1) < UPLAND_GATE) return false;
    const a = n3(seed, gx * WORM_F + 33.0, gy * WORM_F + 1.2, z * WORM_FZ + 4.4);
    if (Math.abs(a) >= UPLAND_THICK) return false;
    const b = n3(seed, gx * WORM_F + 6.6, gy * WORM_F + 27.5, z * WORM_FZ + 14.0);
    return Math.abs(b) < UPLAND_THICK;
}

function hangingValley(seed, gx, gy, z) {
    if (z < 2 || z > 4) return false;
    if (district(seed, gx, gy, z, 22.0, 15.5, 4.4) < HANG_GATE) return false;
    const ridge = n3(seed, gx * RAVINE_RF + 40.2, gy * RAVINE_RF + 8.8, 3.3);
    return Math.abs(ridge) < HANG_WIDTH;
}

function weatherHollow(seed, gx, gy, z) {
    if (z < 7 || z > 11) return false;
    if (district(seed, gx, gy, z, 9.9, 21.3, 12.6) < HIGH_GATE) return false;
    const c = n3(seed, gx * HIGH_F + 4.4, gy * HIGH_F + 13.3, z * HIGH_FZ + 2.2);
    return c > HIGH_THRESH;
}

// Halo of cave around a shaft, cavern z only, and only in the shaft's chunk.
function shaftHalo(seed, gx, gy, z) {
    if (z < -10 || z > -5) return false;
    const hit = nearestShaft(seed, gx, gy, 8.5);
    if (!hit || hit.d2 <= SHAFT_R2_DEEP) return false;
    return sameChunk(gx + 0.5, gy + 0.5, hit.x, hit.y);
}

function kindAt(seed, gx, gy, z) {
    seed >>>= 0;
    gx |= 0;
    gy |= 0;
    z |= 0;
    if (z < Z_MIN || z >= Z_SKY) return KIND.none;
    if (onShaft(seed, gx, gy, z)) return z <= -5 ? KIND.shaft : KIND.ravine;
    const band = bandOf(z);
    if (band === "caverns") {
        if (shaftHalo(seed, gx, gy, z)) return KIND.cave;
        if (cheeseCell(seed, gx, gy, z)) return KIND.chamber;
        if (wormCell(seed, gx, gy, z)) return KIND.cave;
        if (fractureCell(seed, gx, gy, z, FRACTURE_GATE, FRACTURE_THICK)) return KIND.cave;
        return KIND.none;
    }
    if (band === "deep") {
        if (deepPocket(seed, gx, gy, z)) return KIND.cave;
        if (deepSheet(seed, gx, gy, z)) return KIND.cave;
        return KIND.none;
    }
    if (band === "lowlands") {
        if (ravineCell(seed, gx, gy, z)) return KIND.ravine;
        if (karstCell(seed, gx, gy, z)) return KIND.cave;
        return KIND.none;
    }
    if (band === "uplands") {
        if (hangingValley(seed, gx, gy, z)) return KIND.ravine;
        if (uplandCave(seed, gx, gy, z)) return KIND.cave;
        return KIND.none;
    }
    if (band === "highlands") {
        if (weatherHollow(seed, gx, gy, z)) return KIND.cave;
        return KIND.none;
    }
    return KIND.none;
}

function voidAt(seed, gx, gy, z) {
    const k = kindAt(seed, gx, gy, z);
    return { open: k !== KIND.none, kind: KIND_NAME[k] };
}

function shaftTouches(seed, gx0, gy0, z) {
    const r2 = shaftRadius2(z);
    // The halo and the deep pocket sit a few cells off the column. Pad the
    // touch test so a chunk that contains either is not early-out.
    const pad = z <= -5 && z >= -10 ? 4 : (z <= -11 ? 4 : 1);
    const reach2 = r2 < 0 ? -1 : (Math.sqrt(r2) + pad);
    if (reach2 < 0 && !(z <= -5 && z >= Z_MIN)) return false;
    const use = reach2 < 0 ? pad : reach2;
    const x0 = gx0 - use, x1 = gx0 + (CHUNK - 1) + use;
    const y0 = gy0 - use, y1 = gy0 + (CHUNK - 1) + use;
    const lx0 = Math.floor(x0 / SHAFT_GAP), lx1 = Math.floor(x1 / SHAFT_GAP);
    const ly0 = Math.floor(y0 / SHAFT_GAP), ly1 = Math.floor(y1 / SHAFT_GAP);
    for (let ly = ly0; ly <= ly1; ly++) {
        for (let lx = lx0; lx <= lx1; lx++) {
            if (!shaftOn(seed, lx, ly)) continue;
            const c = shaftCenter(seed, lx, ly);
            const qx = Math.max(gx0 + 0.5, Math.min(gx0 + (CHUNK - 1) + 0.5, c.x));
            const qy = Math.max(gy0 + 0.5, Math.min(gy0 + (CHUNK - 1) + 0.5, c.y));
            const dx = c.x - qx, dy = c.y - qy;
            if (dx * dx + dy * dy <= use * use) return true;
        }
    }
    return false;
}

function noiseMaybe(seed, gx0, gy0, z, fine) {
    const band = bandOf(z);
    const dist = fine ? gateHighFine : gateHigh;
    const pad = fine ? DIST_PAD_FINE : DIST_PAD;
    if (band === "caverns") {
        const gate = Math.min(CAVERN_GATE, CHEESE_GATE, FRACTURE_GATE);
        return dist(seed, gx0, gy0, z, 4.2, 8.8, 1.4, gate, pad);
    }
    if (band === "deep") return false;
    if (band === "lowlands") {
        if (ravineMaybe(seed, gx0, gy0, fine)) return true;
        return dist(seed, gx0, gy0, z, 14.2, 6.6, 3.3, KARST_GATE, pad);
    }
    if (band === "uplands") {
        if (dist(seed, gx0, gy0, z, 18.4, 2.7, 9.1, UPLAND_GATE, pad)) return true;
        return dist(seed, gx0, gy0, z, 22.0, 15.5, 4.4, HANG_GATE, pad);
    }
    if (band === "highlands") {
        return dist(seed, gx0, gy0, z, 9.9, 21.3, 12.6, HIGH_GATE, pad);
    }
    return false;
}

const NO_HIT = Object.freeze({ hit: false, mixed: false, mask: null, open: 0 });

function chunkCarveMask(seed, ax, ay, z, cx, cy, areaSize) {
    seed >>>= 0;
    ax |= 0;
    ay |= 0;
    z |= 0;
    cx |= 0;
    cy |= 0;
    const size = areaSize | 0 || AREA;
    if (z < Z_MIN || z >= Z_SKY) return NO_HIT;
    const gx0 = ax * size + cx * CHUNK;
    const gy0 = ay * size + cy * CHUNK;
    const shaft = shaftTouches(seed, gx0, gy0, z);
    // Coarse nine-sample reject, then a 5×5 reject. The fine pad is smaller
    // because those samples sit closer together. Both have to be clear
    // before the chunk is treated as solid.
    if (!shaft && !noiseMaybe(seed, gx0, gy0, z, false)) return NO_HIT;
    if (!shaft && !noiseMaybe(seed, gx0, gy0, z, true)) return NO_HIT;
    let mask = null;
    let open = 0;
    for (let ly = 0; ly < CHUNK; ly++) {
        const gy = gy0 + ly;
        for (let lx = 0; lx < CHUNK; lx++) {
            const k = kindAt(seed, gx0 + lx, gy, z);
            if (k === KIND.none) continue;
            if (!mask) mask = new Uint8Array(CHUNK * CHUNK);
            mask[ly * CHUNK + lx] = k;
            open++;
        }
    }
    if (!open) return { hit: true, mixed: false, mask: null, open: 0 };
    return { hit: true, mixed: true, mask: mask, open: open };
}

function mixedFraction(seed, ax, ay, z, areaSize) {
    const size = areaSize | 0 || AREA;
    const n = Math.max(1, Math.ceil(size / CHUNK));
    let mixed = 0;
    const total = n * n;
    for (let cy = 0; cy < n; cy++) {
        for (let cx = 0; cx < n; cx++) {
            if (chunkCarveMask(seed, ax, ay, z, cx, cy, size).mixed) mixed++;
        }
    }
    return total ? mixed / total : 0;
}

module.exports = {
    voidAt: voidAt,
    kindAt: kindAt,
    chunkCarveMask: chunkCarveMask,
    mixedFraction: mixedFraction,
    bandOf: bandOf,
    simplex3: n3,
    KIND: KIND,
    KIND_NAME: KIND_NAME,
    CHUNK: CHUNK,
    AREA: AREA,
    Z_MIN: Z_MIN,
    Z_MAX: Z_MAX,
    Z_SKY: Z_SKY
};
