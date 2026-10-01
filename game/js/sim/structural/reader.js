"use strict";

/**
 * game/js/sim/structural/reader.js
 *
 * StrataReader contract for rooted support (NAT.02.01 part 1, lane-en; merged D3 §3.2),
 * plus a pure fixture reader for tests.
 *
 * A StrataReader answers three questions and writes nothing:
 *
 *   reader.subunits                 positive integer: height resolution of one 2 ft stratum.
 *   reader.voxel(x, y, z, s)        the actual occupied geometry of one voxel:
 *       { pending: true }                          unavailable terrain (never air, never support)
 *       { material: null }                         air
 *       { material, lo, hi, hp }                   occupied from subunit lo up to hi (0 <= lo < hi <= subunits);
 *                                                  hp 0..255 for load-bearing material (0 = destroyed)
 *   reader.foundation(x, y, z, s)   true when the bottom face of the voxel bears on a certified real
 *                                   foundation; false when it does not; { pending: true } when unknown.
 *   reader.material(key)            the catalogue record: { class, spanBase[7], ratedLoadKg? }.
 *   reader.canon(x, y)              optional: canonical {x, y} for wrapped worlds.
 *
 * Classes: "natural" and "assembly" form members; "loose" bears only as a stack; "fluid" is read as
 * no solid geometry (this lane reads no fluid). Stored legacy flags on a record (solid, supported)
 * are caches of old predicates; rooted.js never reads them.
 *
 * Addresses: global stratum index g = 5 × (z + 16) + s (merged D3 §3.2).
 */

const STRATA_PER_LAYER = 5;
const Z_BASE = 16;
const SUBUNITS = 24; // fixture resolution: one subunit is 1 inch of a 2 ft stratum

const PENDING = Object.freeze({ pending: true });
const AIR = Object.freeze({ material: null });

function gOf(z, s) {
    return STRATA_PER_LAYER * (z + Z_BASE) + s;
}

function zOfG(g) {
    return Math.floor(g / STRATA_PER_LAYER) - Z_BASE;
}

function sOfG(g) {
    return g - STRATA_PER_LAYER * Math.floor(g / STRATA_PER_LAYER);
}

/**
 * Fixture catalogue. Spans and rated loads are SIM.40.01 §2.3 (granite, limestone); granite and
 * limestone stay in pure fixture readers (lane-en brief, open questions settled). `legacy` holds
 * the inputs of the old support.js predicate for the test adapter only.
 */
const FIXTURE_MATERIALS = Object.freeze({
    granite: Object.freeze({
        key: "granite", class: "natural",
        spanBase: Object.freeze([2, 3, 3, 4, 6, 9, 12]), ratedLoadKg: 77880,
        legacy: Object.freeze({ density: 165, tensileYield: 5000 })
    }),
    limestone: Object.freeze({
        key: "limestone", class: "natural",
        spanBase: Object.freeze([1, 2, 3, 3, 5, 7, 11]), ratedLoadKg: 65120,
        legacy: Object.freeze({ density: 143.6, tensileYield: 3000 })
    }),
    rubble: Object.freeze({ key: "rubble", class: "loose" }),
    water: Object.freeze({ key: "water", class: "fluid" })
});

function requireInt(name, v) {
    if (!Number.isInteger(v)) throw new TypeError(`structural/reader: ${name} must be an integer (got ${String(v)})`);
    return v;
}

/**
 * A bounded, fully known fixture world.
 * spec: { bounds: {x0, y0, x1, y1}, zMin = -2, zMax = 2, subunits = 24,
 *         foundation: "floor" | false, materials: {...extra} }
 * Columns outside bounds and voxels below zMin are pending. Above zMax is open sky (air).
 * "floor" certifies the bottom face of (zMin, s0) in every in-bounds column; without it the
 * playable lower bound is not bedrock (merged D3 §3.2).
 */
function createFixtureReader(spec) {
    spec = spec || {};
    const b = spec.bounds;
    if (!b) throw new TypeError("structural/reader: fixture needs bounds {x0, y0, x1, y1}");
    const x0 = requireInt("bounds.x0", b.x0), y0 = requireInt("bounds.y0", b.y0);
    const x1 = requireInt("bounds.x1", b.x1), y1 = requireInt("bounds.y1", b.y1);
    const zMin = requireInt("zMin", spec.zMin === undefined ? -2 : spec.zMin);
    const zMax = requireInt("zMax", spec.zMax === undefined ? 2 : spec.zMax);
    const subunits = requireInt("subunits", spec.subunits === undefined ? SUBUNITS : spec.subunits);
    const floor = spec.foundation === "floor";
    const materials = Object.assign({}, FIXTURE_MATERIALS, spec.materials || {});
    const cells = new Map();
    const pending = new Set();
    const foundations = new Set();

    const key = (x, y, z, s) => `${x},${y},${z},${s}`;
    const inBounds = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
    const unknown = (x, y, z, s) => !inBounds(x, y) || z < zMin || pending.has(key(x, y, z, s));

    const reader = {
        subunits, zMin, zMax,
        voxel(x, y, z, s) {
            if (unknown(x, y, z, s)) return PENDING;
            if (z > zMax) return AIR;
            return cells.get(key(x, y, z, s)) || AIR;
        },
        foundation(x, y, z, s) {
            if (unknown(x, y, z, s)) return PENDING;
            return foundations.has(key(x, y, z, s)) || (floor && z === zMin && s === 0);
        },
        material(k) {
            const m = materials[k];
            if (!m) throw new Error(`structural/reader: fixture has no material "${k}"`);
            return m;
        },

        // Fixture writers (tests only).
        set(x, y, z, s, material, opts) {
            opts = opts || {};
            const m = reader.material(material);
            const rec = {
                material,
                lo: opts.lo === undefined ? 0 : opts.lo,
                hi: opts.hi === undefined ? subunits : opts.hi,
                supported: opts.supported === undefined ? true : opts.supported // legacy stored flag
            };
            if (m.class !== "loose") rec.hp = opts.hp === undefined ? 255 : opts.hp;
            cells.set(key(x, y, z, s), Object.freeze(rec));
            return reader;
        },
        setG(x, y, g, material, opts) {
            return reader.set(x, y, zOfG(g), sOfG(g), material, opts);
        },
        fillG(x, y, g0, g1, material, opts) {
            for (let g = g0; g <= g1; g++) reader.setG(x, y, g, material, opts);
            return reader;
        },
        clearG(x, y, g) {
            cells.delete(key(x, y, zOfG(g), sOfG(g)));
            return reader;
        },
        markPendingG(x, y, g) {
            pending.add(key(x, y, zOfG(g), sOfG(g)));
            return reader;
        },
        addFoundationG(x, y, g) {
            foundations.add(key(x, y, zOfG(g), sOfG(g)));
            return reader;
        }
    };
    return reader;
}

module.exports = {
    STRATA_PER_LAYER,
    Z_BASE,
    SUBUNITS,
    PENDING,
    AIR,
    FIXTURE_MATERIALS,
    gOf,
    zOfG,
    sOfG,
    createFixtureReader
};
