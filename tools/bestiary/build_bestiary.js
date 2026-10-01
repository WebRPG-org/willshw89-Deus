// tools/bestiary/build_bestiary.js - generate the DEUS bestiary adaptation layer (NAT.07.01).
//
// Usage: node tools/bestiary/build_bestiary.js [--check] [--root <dir>]
//
// Reads the 317 srd:creature: rows of the pinned bestiary source (docs/design/bestiary/BESTIARY_grok_heavy.md,
// hash in docs/design/bestiary/SOURCE.json), joins each row to its record in game/data/srd51/creatures.json
// (name, challenge rating) and to the catalog species of game/js/sim/rules/species_map.js (bodies[]), and writes
// game/data/srd_adaptation/creatures.json: one row per SRD creature, keyed by its srd: id. srd51 is read, never
// written. Sections A to C of the source are not inputs (docs/systems/DEUS_Bestiary.md).
// --check rebuilds in memory and compares with the file on disk (CRLF folded to LF) instead of writing.
// Exit codes: 0 written / up to date, 1 refused (bad input) or --check found a difference, 2 inputs missing.
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; };
const ROOT = path.resolve(opt("--root", path.join(__dirname, "..", "..")));

const P = {
    source: "docs/design/bestiary/BESTIARY_grok_heavy.md",
    pin: "docs/design/bestiary/SOURCE.json",
    srd: "game/data/srd51/creatures.json",
    species: "game/js/sim/rules/species_map.js",
    out: "game/data/srd_adaptation/creatures.json"
};

const FAMILIES = ["VOLCANIC", "WET", "ARID", "TEMPERATE", "COLD", "WILD"];  // DEC-030 / DEC-050 item 3
const BANDS = ["Deep Earth", "Caverns", "Lowlands", "Uplands", "Highlands"];
const TIERS = ["T0", "T1", "T2", "T3", "T4"];
const ROLES = ["MONSTER", "WILDLIFE", "PEOPLE", "SUMMON-ONLY", "EXCLUDE"];
const FREQUENCIES = ["common", "uncommon", "rare", "lair"];

// Danger tier from challenge rating: DESIGN-D4 section 4 (approved under DEC-058). Every one of the 317 source rows agrees.
const TIER_BANDS = [
    { tier: "T0", crMin: 0, crMax: 0.25 },
    { tier: "T1", crMin: 0.5, crMax: 2 },
    { tier: "T2", crMin: 3, crMax: 6 },
    { tier: "T3", crMin: 7, crMax: 12 },
    { tier: "T4", crMin: 13, crMax: null }
];

// Placement rule per row, read off the source's role and frequency labels (DEC-057; DESIGN-D4 section 5).
const PLACEMENT_RULES = {
    seeded: "Rolled by the seeded spawner in each of the row's cells, filtered by the cell's danger tier; frequency weights the draw.",
    lair: "Source frequency 'lair': anchored to a lair site in one of the row's cells; never a wandering spawn.",
    summon: "Source role SUMMON-ONLY: enters the world only when summoned; never rolled by the seeded spawner. Its cells say where it belongs.",
    none: "Source role EXCLUDE: no cell; never placed."
};
function placementFor(role, frequency) {
    if (role === "EXCLUDE") return "none";
    if (role === "SUMMON-ONLY") return "summon";
    if (frequency === "lair") return "lair";
    return "seeded";
}

// The world is Emerys (DEC-054). Source notes are copied with the old spelling corrected.
const WORLD_NAME_FIX = [/\bEmrys\b/g, "Emerys"];

const lf = s => String(s).replace(/\r\n/g, "\n");
const sha256 = s => crypto.createHash("sha256").update(s, "utf8").digest("hex");

class Refusal extends Error {}

function tierFromCr(cr) {
    for (const b of TIER_BANDS) if (cr >= b.crMin && (b.crMax === null || cr <= b.crMax)) return b.tier;
    return null;
}

const CELL = `(?:(?:${FAMILIES.join("|")})/(?:${BANDS.join("|")})|Sky)`;
const ROW_RE = new RegExp(`^(srd:creature:[a-z0-9-]+) (${ROLES.join("|")}) (T[0-4]) (${CELL}(?:,${CELL})*|-) (${FREQUENCIES.join("|")}|-) (\\S.*)$`);

// Parse the creature rows: every line that starts with "srd:creature:" before the first "## " heading.
function parseSource(text) {
    const rows = [];
    const lines = lf(text).split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^## /.test(line)) break;
        if (!line.startsWith("srd:creature:")) continue;
        const m = ROW_RE.exec(line);
        if (!m) throw new Refusal(`source line ${i + 1} is not a bestiary row: ${line}`);
        const cellTokens = m[4] === "-" ? [] : m[4].split(",");
        if (new Set(cellTokens).size !== cellTokens.length) throw new Refusal(`source line ${i + 1}: a cell is listed twice`);
        rows.push({
            id: m[1], role: m[2], tier: m[3],
            cells: cellTokens.filter(c => c !== "Sky").map(c => { const k = c.indexOf("/"); return { family: c.slice(0, k), band: c.slice(k + 1) }; }),
            sky: cellTokens.includes("Sky"),
            frequency: m[5] === "-" ? null : m[5],
            note: m[6],
            line: i + 1
        });
    }
    return rows;
}

function cellKey(c) { return c.family + "/" + c.band; }

function occupancyOf(entries) {
    const occ = {};
    for (const f of FAMILIES) for (const b of BANDS) { occ[f + "/" + b] = {}; for (const t of TIERS) occ[f + "/" + b][t] = 0; }
    occ.Sky = {}; for (const t of TIERS) occ.Sky[t] = 0;
    for (const e of entries) {
        for (const c of e.cells) occ[cellKey(c)][e.tier]++;
        if (e.sky) occ.Sky[e.tier]++;
    }
    return occ;
}

function countBy(entries, key) {
    const out = {};
    for (const e of entries) { const k = String(e[key]); out[k] = (out[k] || 0) + 1; }
    return Object.keys(out).sort().reduce((o, k) => (o[k] = out[k], o), {});
}

function readFile(rel) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) { const e = new Error(`missing input ${rel}`); e.missing = true; throw e; }
    return fs.readFileSync(file, "utf8");
}

function build() {
    const sourceText = readFile(P.source);
    const pin = JSON.parse(readFile(P.pin));
    const sourceSha = sha256(lf(sourceText));
    if (sourceSha !== pin.sha256) throw new Refusal(`${P.source} hashes to ${sourceSha}, not the pinned ${pin.sha256}; stop and ask the PM`);

    const srd = JSON.parse(readFile(P.srd));
    const srdById = new Map();
    for (const e of srd.entries) srdById.set(e.id, e);

    readFile(P.species);
    const speciesFile = path.join(ROOT, P.species);
    delete require.cache[require.resolve(speciesFile)];
    const SPECIES_MAP = require(speciesFile).SPECIES_MAP;

    const rows = parseSource(sourceText);
    const seen = new Set();
    for (const r of rows) {
        if (seen.has(r.id)) throw new Refusal(`source lists ${r.id} twice`);
        seen.add(r.id);
        if (!srdById.has(r.id)) throw new Refusal(`source row ${r.id} (line ${r.line}) has no srd51 record`);
    }
    for (const id of srdById.keys()) if (!seen.has(id)) throw new Refusal(`srd51 record ${id} has no source row`);

    const bodiesById = new Map();
    for (const s of SPECIES_MAP) {
        if (!srdById.has(s.srdId)) throw new Refusal(`species_map ${s.species} points at ${s.srdId}, which is not in srd51`);
        if (!bodiesById.has(s.srdId)) bodiesById.set(s.srdId, []);
        bodiesById.get(s.srdId).push({ species: s.species, kind: s.kind });
    }

    const entries = rows.map(r => {
        const rec = srdById.get(r.id);
        const ch = rec.data && rec.data.challenge;
        if (!ch || typeof ch.rating !== "number") throw new Refusal(`${r.id} has no challenge rating in srd51`);
        const tier = tierFromCr(ch.rating);
        if (tier !== r.tier) throw new Refusal(`${r.id}: source tier ${r.tier} but CR ${ch.ratingText} gives ${tier}`);
        if ((r.role === "EXCLUDE") !== (r.cells.length === 0 && !r.sky)) throw new Refusal(`${r.id}: EXCLUDE rows and only EXCLUDE rows have no cell`);
        if ((r.role === "EXCLUDE") !== (r.frequency === null)) throw new Refusal(`${r.id}: EXCLUDE rows and only EXCLUDE rows have no frequency`);
        return {
            id: r.id,
            name: rec.name,
            role: r.role,
            tier,
            cr: { rating: ch.rating, text: ch.ratingText },
            cells: r.cells,
            sky: r.sky,
            frequency: r.frequency,
            placement: placementFor(r.role, r.frequency),
            bodies: bodiesById.get(r.id) || [],
            note: r.note.replace(WORLD_NAME_FIX[0], WORLD_NAME_FIX[1]),
            sourceLine: r.line
        };
    });

    const doc = {
        metadata: {
            schemaVersion: 1,
            generator: "tools/bestiary/build_bestiary.js",
            task: "NAT.07.01",
            note: "DEUS bestiary adaptation layer (DEC-050 item 3, DEC-053 item 2, DEC-057): one row per SRD 5.1 creature, keyed by its srd: id. Generated; do not hand-edit. srd51 is never edited. Not loaded by any plugin yet; runtime spawning is a later leaf.",
            source: { file: P.source, sha256: sourceSha, rows: rows.length },
            joins: { srd: P.srd, species: P.species },
            license: srd.metadata && srd.metadata.license,
            tierBands: TIER_BANDS,
            placementRules: PLACEMENT_RULES,
            counts: {
                entries: entries.length,
                byRole: countBy(entries, "role"),
                byTier: countBy(entries, "tier"),
                byPlacement: countBy(entries, "placement")
            },
            occupancy: occupancyOf(entries)
        },
        entries
    };
    return JSON.stringify(doc, null, 1) + "\n";
}

module.exports = { parseSource, tierFromCr, placementFor, occupancyOf, TIER_BANDS, PLACEMENT_RULES, FAMILIES, BANDS, TIERS };

if (require.main === module) {
    let text;
    try {
        text = build();
    } catch (e) {
        console.error("build_bestiary: " + e.message);
        process.exit(e instanceof Refusal ? 1 : e.missing ? 2 : 1);
    }
    const outFile = path.join(ROOT, P.out);
    if (args.includes("--check")) {
        const onDisk = fs.existsSync(outFile) ? lf(fs.readFileSync(outFile, "utf8")) : null;
        if (onDisk === text) { console.log(`build_bestiary --check: ${P.out} is up to date`); process.exit(0); }
        console.error(`build_bestiary --check: ${P.out} ${onDisk === null ? "is missing" : "differs from a fresh build"}`);
        process.exit(1);
    }
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, text, "utf8");
    console.log(`build_bestiary: wrote ${P.out}`);
}
