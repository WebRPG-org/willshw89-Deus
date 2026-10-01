"use strict";

// NAT.07.03 encounter tables (DESIGN-D4 section 5, DEC-057). Host-agnostic: buildTables and pick do no file IO,
// keep no state and never call Math.random. One weighted table per (biome cell, danger tier, kind):
//   wander  - seeded bestiary rows, rolled by the spawner;
//   lair    - lair-placement rows, anchored to a lair site, never a wandering spawn;
//   feature - feature-only rows (the elementals), summoned by their element source, never tier-rolled.
// SUMMON-ONLY, EXCLUDE and PEOPLE rows are in no table. The Sky's tables are built and marked unusedV1:
// the Sky has no spawns in v1 (DESIGN-D4 section 4). Weights are integers from encounter_weights.json.
// See docs/systems/DEUS_Encounters.md.

const FAMILIES = ["VOLCANIC", "WET", "ARID", "TEMPERATE", "COLD", "WILD"];
const BANDS = ["Deep Earth", "Caverns", "Lowlands", "Uplands", "Highlands"];
const SKY = "Sky";
const TIERS = ["T0", "T1", "T2", "T3", "T4"];
const KINDS = ["wander", "lair", "feature"];
const PLACEMENTS = { seeded: true, lair: true, summon: true, none: true };
const MAX_TOTAL = 0x200000; // keeps h * total below 2^53 in pick

// Cell ids 0..29 are family * 5 + band in DEC-030 order; the Sky is 30.
const CELLS = [];
for (const f of FAMILIES) for (const b of BANDS) CELLS.push(f + "/" + b);
CELLS.push(SKY);

function fail(code, msg) {
    const e = new Error(code + ": " + msg);
    e.code = code;
    throw e;
}
function isPosInt(n) {
    return typeof n === "number" && Number.isSafeInteger(n) && n > 0;
}
function isUInt32(n) {
    return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 0xFFFFFFFF;
}

function cellId(cell) {
    const i = CELLS.indexOf(cell);
    if (i < 0) fail("E_CELL", "unknown cell " + cell);
    return i;
}
function tierIndex(tier) {
    const i = TIERS.indexOf(tier);
    if (i < 0) fail("E_TIER", "unknown tier " + tier);
    return i;
}

function checkWeights(w) {
    if (!w || typeof w !== "object") fail("E_WEIGHTS", "no weights");
    const fw = w.frequencyWeight;
    if (!fw || typeof fw !== "object") fail("E_WEIGHTS", "frequencyWeight missing");
    for (const f of ["common", "uncommon", "rare", "lair"]) {
        if (!isPosInt(fw[f])) fail("E_WEIGHTS", "frequencyWeight." + f + " must be a positive integer");
    }
    const gw = w.tierGapWeight;
    if (!Array.isArray(gw) || gw.length < 1 || gw.length > TIERS.length) fail("E_WEIGHTS", "tierGapWeight must list 1 to 5 weights");
    for (let i = 0; i < gw.length; i++) {
        if (!isPosInt(gw[i])) fail("E_WEIGHTS", "tierGapWeight[" + i + "] must be a positive integer");
    }
    const fo = w.featureOnly;
    if (!fo || !Array.isArray(fo.ids)) fail("E_WEIGHTS", "featureOnly.ids missing");
    const seen = {};
    for (const id of fo.ids) {
        if (typeof id !== "string" || seen[id]) fail("E_WEIGHTS", "featureOnly id " + id);
        seen[id] = true;
    }
}

// Which table kind a row goes to, or null for a row that is never in a table.
function kindOf(row, featureIds) {
    if (!PLACEMENTS[row.placement]) fail("E_ROW", row.id + " placement " + row.placement);
    if (row.placement === "none") return null;
    /*MUTANT summon_leak*/ if (row.placement === "summon") return null;
    if (row.role === "PEOPLE") return null;
    if (featureIds[row.id]) return "feature";
    return row.placement === "lair" ? "lair" : "wander";
}

function emptyTable(cell, tier, kind) {
    return {
        key: cell + "|" + tier + "|" + kind,
        cell: cell,
        cellId: cellId(cell),
        tier: tier,
        tierIndex: tierIndex(tier),
        kind: kind,
        unusedV1: cell === SKY,
        total: 0,
        entries: []
    };
}

function freezeTable(t) {
    for (const e of t.entries) Object.freeze(e);
    Object.freeze(t.entries);
    return Object.freeze(t);
}

// bestiary: the parsed game/data/srd_adaptation/creatures.json; weights: the parsed encounter_weights.json.
function buildTables(bestiary, weights) {
    if (!bestiary || !Array.isArray(bestiary.entries)) fail("E_BESTIARY", "no entries");
    checkWeights(weights);
    const fw = weights.frequencyWeight;
    const gw = weights.tierGapWeight;

    const featureIds = {};
    for (const id of weights.featureOnly.ids) featureIds[id] = true;
    const byId = {};
    for (const row of bestiary.entries) {
        if (!row || typeof row.id !== "string" || byId[row.id]) fail("E_ROW", "bad or repeated id " + (row && row.id));
        byId[row.id] = row;
    }
    for (const id of weights.featureOnly.ids) {
        const row = byId[id];
        if (!row) fail("E_WEIGHTS", "featureOnly id not in the bestiary: " + id);
        if (row.placement !== "seeded" || row.role === "PEOPLE") fail("E_WEIGHTS", "featureOnly id is not a seeded creature: " + id);
    }

    const tables = {};
    for (const cell of CELLS) {
        tables[cell] = {};
        for (const tier of TIERS) {
            tables[cell][tier] = {};
            for (const kind of KINDS) tables[cell][tier][kind] = emptyTable(cell, tier, kind);
        }
    }

    const rows = bestiary.entries.slice().sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
    for (const row of rows) {
        const kind = kindOf(row, featureIds);
        if (kind === null) continue;
        const rowTier = tierIndex(row.tier);
        if (!Object.prototype.hasOwnProperty.call(fw, row.frequency)) fail("E_ROW", row.id + " frequency " + row.frequency);
        const cells = [];
        for (const c of row.cells || []) {
            const name = c.family + "/" + c.band;
            cellId(name);
            if (cells.indexOf(name) < 0) cells.push(name);
        }
        if (row.sky === true) cells.push(SKY);
        for (const cell of cells) {
            for (let t = 0; t < TIERS.length; t++) {
                /*MUTANT tier_plus_one*/ const ceiling = t;
                if (rowTier > ceiling) continue;
                const gap = ceiling - rowTier;
                if (gap >= gw.length) continue;
                const table = tables[cell][TIERS[t]][kind];
                const weight = fw[row.frequency] * gw[gap];
                table.entries.push({ id: row.id, tier: row.tier, weight: weight });
                table.total += weight;
                if (table.total > MAX_TOTAL) fail("E_WEIGHTS", table.key + " total weight above " + MAX_TOTAL);
            }
        }
    }

    for (const cell of CELLS) {
        for (const tier of TIERS) {
            for (const kind of KINDS) freezeTable(tables[cell][tier][kind]);
            Object.freeze(tables[cell][tier]);
        }
        Object.freeze(tables[cell]);
    }
    return Object.freeze({
        schemaVersion: 1,
        weightsStatus: typeof weights.status === "string" ? weights.status : null,
        cells: CELLS.slice(),
        tiers: TIERS.slice(),
        kinds: KINDS.slice(),
        tables: Object.freeze(tables)
    });
}

function tableFor(built, cell, tier, kind) {
    cellId(cell);
    tierIndex(tier);
    if (KINDS.indexOf(kind) < 0) fail("E_KIND", "unknown kind " + kind);
    return built.tables[cell][tier][kind];
}

// murmur3 finaliser: a bijection on uint32.
function mix32(h) {
    h ^= h >>> 16;
    h = Math.imul(h, 0x85EBCA6B);
    h ^= h >>> 13;
    h = Math.imul(h, 0xC2B2AE35);
    h ^= h >>> 16;
    return h >>> 0;
}

// The draw key of DESIGN-D4 section 5 (seed, cell, tier, spawn index), plus the table kind, folded through mix32
// one input at a time. A plain XOR of the four would give cell 1 tier 0 the same draws as cell 0 tier 1.
function drawKey(seed, table, spawnIndex) {
    let h = mix32((seed ^ 0x9E3779B9) >>> 0);
    h = mix32((h ^ table.cellId) >>> 0);
    h = mix32((h ^ table.tierIndex) >>> 0);
    h = mix32((h ^ KINDS.indexOf(table.kind)) >>> 0);
    h = mix32((h ^ spawnIndex) >>> 0);
    return h;
}

// One deterministic integer-weighted draw. Returns a bestiary id, or null when the table is empty.
// Throws E_UNUSED_V1 on a Sky table.
function pick(table, seed, spawnIndex) {
    if (!table || !Array.isArray(table.entries)) fail("E_TABLE", "not a table");
    if (!isUInt32(seed)) fail("E_RANGE", "seed must be a uint32");
    if (!isUInt32(spawnIndex)) fail("E_RANGE", "spawnIndex must be a uint32");
    if (table.unusedV1) fail("E_UNUSED_V1", table.key + " is not used in v1 (the Sky has no spawns)");
    if (table.total === 0) return null;
    const r = Math.floor(drawKey(seed, table, spawnIndex) * table.total / 4294967296);
    let acc = 0;
    for (const e of table.entries) {
        acc += e.weight;
        if (r < acc) return e.id;
    }
    fail("E_TABLE", table.key + " weights do not sum to its total");
}

// Node / NW.js helper: build from the shipped data files.
function loadDefault() {
    const fs = require("fs");
    const path = require("path");
    const dataDir = path.join(__dirname, "..", "..", "..", "data");
    const bestiary = JSON.parse(fs.readFileSync(path.join(dataDir, "srd_adaptation", "creatures.json"), "utf8"));
    const weights = JSON.parse(fs.readFileSync(path.join(dataDir, "ecology", "encounter_weights.json"), "utf8"));
    return buildTables(bestiary, weights);
}

module.exports = {
    FAMILIES: FAMILIES,
    BANDS: BANDS,
    CELLS: CELLS,
    TIERS: TIERS,
    KINDS: KINDS,
    cellId: cellId,
    buildTables: buildTables,
    tableFor: tableFor,
    pick: pick,
    loadDefault: loadDefault
};
