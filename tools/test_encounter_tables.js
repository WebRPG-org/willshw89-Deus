// tools/test_encounter_tables.js - checks for the encounter tables (NAT.07.03, lane-fd).
//
// Usage: node tools/test_encounter_tables.js [--root <dir>] [--no-mutants] [--mutant <name>]
//
// Builds the tables with game/js/sim/placement/encounters.js from game/data/srd_adaptation/creatures.json and
// game/data/ecology/encounter_weights.json, and compares them with tables this file computes itself from the
// same two files (it does not reuse the module's code). Then, unless --no-mutants, it copies the three files to a
// temp folder, applies each mutant, reruns itself there and requires the mutant's named checks to turn FAIL with
// exit 1. --mutant <name> runs only that mutant and prints the rerun's full output.
// Exit 0 only when every check passes and every mutant is killed.
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; };
const ROOT = path.resolve(opt("--root", path.join(__dirname, "..")));
const RUN_MUTANTS = !args.includes("--no-mutants");
const ONLY_MUTANT = opt("--mutant", null);

const P = {
    module: "game/js/sim/placement/encounters.js",
    weights: "game/data/ecology/encounter_weights.json",
    bestiary: "game/data/srd_adaptation/creatures.json"
};

// Pinned from the design, not read from the module: DEC-030 cells, the five tiers, the three kinds,
// and the four elementals that DESIGN-D4 makes feature-only (settled for this lane in the brief).
const FAMILIES = ["VOLCANIC", "WET", "ARID", "TEMPERATE", "COLD", "WILD"];
const BANDS = ["Deep Earth", "Caverns", "Lowlands", "Uplands", "Highlands"];
const CELLS30 = [];
for (const f of FAMILIES) for (const b of BANDS) CELLS30.push(`${f}/${b}`);
const ALL_CELLS = CELLS30.concat(["Sky"]);
const TIERS = ["T0", "T1", "T2", "T3", "T4"];
const KINDS = ["wander", "lair", "feature"];
const ELEMENTALS = ["air", "earth", "fire", "water"].map(e => `srd:creature:${e}-elemental`);
const NEVER_ROLES = ["SUMMON-ONLY", "EXCLUDE", "PEOPLE"];
const NEVER_PLACEMENTS = ["summon", "none"];
const tierNum = t => TIERS.indexOf(t);

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")); }

// The oracle: what each table must hold, computed from the bestiary rows and the weights file.
function expectedTables(B, W) {
    const feature = new Set(W.featureOnly.ids);
    const out = {};
    for (const c of ALL_CELLS) { out[c] = {}; for (const t of TIERS) { out[c][t] = {}; for (const k of KINDS) out[c][t][k] = []; } }
    const rows = B.entries.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    for (const r of rows) {
        if (NEVER_ROLES.includes(r.role) || NEVER_PLACEMENTS.includes(r.placement)) continue;
        const kind = feature.has(r.id) ? "feature" : r.placement === "lair" ? "lair" : "wander";
        const cells = [...new Set(r.cells.map(c => `${c.family}/${c.band}`))];
        if (r.sky) cells.push("Sky");
        for (const c of cells) {
            for (let t = 0; t < TIERS.length; t++) {
                const gap = t - tierNum(r.tier);
                if (gap < 0 || gap >= W.tierGapWeight.length) continue;
                out[c][TIERS[t]][kind].push({ id: r.id, tier: r.tier, weight: W.frequencyWeight[r.frequency] * W.tierGapWeight[gap] });
            }
        }
    }
    return out;
}
const eqEntries = (a, b) => JSON.stringify(a.map(e => [e.id, e.tier, e.weight])) === JSON.stringify(b.map(e => [e.id, e.tier, e.weight]));

function compareToOracle(built, exp, bad, label) {
    for (const c of ALL_CELLS) for (const t of TIERS) for (const k of KINDS) {
        const tb = built.tables[c] && built.tables[c][t] && built.tables[c][t][k];
        if (!tb) { bad.push(`${label}: no table ${c}|${t}|${k}`); continue; }
        const want = exp[c][t][k];
        const sum = want.reduce((a, e) => a + e.weight, 0);
        if (!eqEntries(tb.entries, want)) bad.push(`${label}: ${c}|${t}|${k} has ${tb.entries.length} entries, oracle ${want.length} (or weights/order differ)`);
        else if (tb.total !== sum) bad.push(`${label}: ${c}|${t}|${k} total ${tb.total}, oracle ${sum}`);
    }
}

function eachTable(built, fn) {
    for (const c of ALL_CELLS) for (const t of TIERS) for (const k of KINDS) {
        const tb = built.tables[c] && built.tables[c][t] && built.tables[c][t][k];
        if (tb) fn(tb, c, t, k);
    }
}

// The child-process half of pick_deterministic: a fresh process, Math.random disabled, the same draws.
const CHILD_DRAWS = `
const M = require(process.argv[1]);
Math.random = function () { throw new Error("Math.random called"); };
const built = M.loadDefault();
const out = [];
for (const cell of ["TEMPERATE/Lowlands", "WET/Caverns", "COLD/Highlands"]) {
  for (const tier of ["T0", "T2", "T4"]) {
    const tb = built.tables[cell][tier].wander;
    for (let i = 0; i < 200; i++) out.push(M.pick(tb, 20261001, i));
  }
}
process.stdout.write(JSON.stringify(out));
`;
function parentDraws(M, built) {
    const out = [];
    for (const cell of ["TEMPERATE/Lowlands", "WET/Caverns", "COLD/Highlands"]) {
        for (const tier of ["T0", "T2", "T4"]) {
            const tb = built.tables[cell][tier].wander;
            for (let i = 0; i < 200; i++) out.push(M.pick(tb, 20261001, i));
        }
    }
    return out;
}
const throwsCode = (fn, code) => { try { fn(); return false; } catch (e) { return !code || e.code === code; } };

function runChecks() {
    const results = [];
    const named = ["tier_ceiling", "no_summon_exclude_people", "lairs_only_in_lair_tables", "elementals_feature_only",
        "t0_nonempty", "sky_tables_marked_unused_v1", "pick_deterministic", "weights_from_data", "module_syntax"];

    // Setup. A missing module or data file fails every check (this is the state on main before the lane).
    let M = null, W = null, B = null, built = null, setupErr = null;
    try { B = readJson(P.bestiary); } catch (e) { setupErr = `bestiary unreadable: ${e.message}`; }
    if (!setupErr) { try { W = readJson(P.weights); } catch (e) { setupErr = `weights file missing or unreadable (${P.weights}): ${e.message.split("\n")[0]}`; } }
    if (!setupErr) { try { M = require(path.join(ROOT, P.module)); } catch (e) { setupErr = `module missing or broken (${P.module}): ${e.message.split("\n")[0]}`; } }
    if (!setupErr) { try { built = M.buildTables(B, W); } catch (e) { setupErr = `buildTables threw: ${e.message}`; } }
    if (setupErr) {
        for (const n of named) { console.log(`FAIL ::${n}: ${setupErr}`); results.push({ name: n, ok: false }); }
        return results;
    }
    const byId = new Map(B.entries.map(r => [r.id, r]));
    const exp = expectedTables(B, W);

    const checks = [];
    const check = (name, fn) => checks.push({ name, fn });

    check("tier_ceiling", bad => {
        let n = 0;
        eachTable(built, (tb, c, t, k) => {
            if (tb.tier !== t || tb.cell !== c || tb.kind !== k) bad.push(`${c}|${t}|${k} labelled ${tb.cell}|${tb.tier}|${tb.kind}`);
            for (const e of tb.entries) {
                n++;
                const row = byId.get(e.id);
                if (!row) { bad.push(`${c}|${t}|${k}: ${e.id} is not in the bestiary`); continue; }
                if (e.tier !== row.tier) bad.push(`${c}|${t}|${k}: ${e.id} says ${e.tier}, bestiary ${row.tier}`);
                const gap = tierNum(t) - tierNum(row.tier);
                if (gap < 0) bad.push(`${c}|${t}|${k}: ${e.id} is ${row.tier}, above the table's ceiling`);
                else if (gap >= W.tierGapWeight.length) bad.push(`${c}|${t}|${k}: ${e.id} is ${gap} tiers below; tierGapWeight has ${W.tierGapWeight.length}`);
            }
        });
        if (n === 0) bad.push("no entries in any table");
    });

    check("no_summon_exclude_people", bad => {
        const never = B.entries.filter(r => NEVER_ROLES.includes(r.role) || NEVER_PLACEMENTS.includes(r.placement));
        if (never.length < 62) bad.push(`only ${never.length} SUMMON-ONLY/EXCLUDE/PEOPLE rows in the bestiary; the check would be weak`);
        const neverIds = new Set(never.map(r => r.id));
        eachTable(built, (tb, c, t, k) => {
            for (const e of tb.entries) if (neverIds.has(e.id)) bad.push(`${c}|${t}|${k}: ${e.id} (${byId.get(e.id).role}, ${byId.get(e.id).placement})`);
        });
    });

    check("lairs_only_in_lair_tables", bad => {
        const lairIds = new Set(B.entries.filter(r => r.placement === "lair").map(r => r.id));
        if (lairIds.size === 0) bad.push("no lair rows in the bestiary");
        let inLair = 0;
        eachTable(built, (tb, c, t, k) => {
            for (const e of tb.entries) {
                if (k === "lair" && !lairIds.has(e.id)) bad.push(`${c}|${t}|lair holds non-lair ${e.id}`);
                if (k !== "lair" && lairIds.has(e.id)) bad.push(`${c}|${t}|${k} holds lair row ${e.id}`);
                if (k === "lair") inLair++;
            }
        });
        for (const id of lairIds) {
            const r = byId.get(id);
            const cells = r.cells.map(x => `${x.family}/${x.band}`).concat(r.sky ? ["Sky"] : []);
            for (const c of cells) if (!built.tables[c][r.tier].lair.entries.some(e => e.id === id)) bad.push(`${id} missing from ${c}|${r.tier}|lair`);
        }
        for (const c of ALL_CELLS) if (built.tables[c].T0.lair.entries.length) bad.push(`${c}|T0|lair is not empty (DESIGN-D4: no lairs at T0)`);
        if (inLair === 0) bad.push("every lair table is empty");
    });

    check("elementals_feature_only", bad => {
        const listed = new Set(W.featureOnly.ids);
        for (const id of ELEMENTALS) {
            const r = byId.get(id);
            if (!r) { bad.push(`${id} is not in the bestiary`); continue; }
            if (!listed.has(id)) bad.push(`${id} is not in ${P.weights} featureOnly.ids`);
            const cells = r.cells.map(x => `${x.family}/${x.band}`).concat(r.sky ? ["Sky"] : []);
            for (const c of cells) if (!built.tables[c][r.tier].feature.entries.some(e => e.id === id)) bad.push(`${id} missing from ${c}|${r.tier}|feature`);
        }
        eachTable(built, (tb, c, t, k) => {
            for (const e of tb.entries) {
                if (k !== "feature" && (listed.has(e.id) || ELEMENTALS.includes(e.id))) bad.push(`${c}|${t}|${k} holds feature-only ${e.id}`);
                if (k === "feature" && !listed.has(e.id)) bad.push(`${c}|${t}|feature holds ${e.id}, which is not feature-only`);
            }
        });
    });

    check("t0_nonempty", bad => {
        for (const c of CELLS30) {
            const tb = built.tables[c].T0.wander;
            if (!tb.entries.length || !(tb.total > 0)) { bad.push(`${c}|T0|wander is empty`); continue; }
            const id = M.pick(tb, 1, 0);
            if (!tb.entries.some(e => e.id === id)) bad.push(`${c}|T0|wander pick gave ${id}, not one of its entries`);
        }
    });

    check("sky_tables_marked_unused_v1", bad => {
        let skyEntries = 0;
        for (const t of TIERS) for (const k of KINDS) {
            const tb = built.tables.Sky && built.tables.Sky[t] && built.tables.Sky[t][k];
            if (!tb) { bad.push(`no Sky|${t}|${k} table`); continue; }
            if (tb.unusedV1 !== true) bad.push(`Sky|${t}|${k} unusedV1 is ${tb.unusedV1}`);
            skyEntries += tb.entries.length;
            if (!throwsCode(() => M.pick(tb, 1, 0), "E_UNUSED_V1")) bad.push(`pick on Sky|${t}|${k} did not throw E_UNUSED_V1`);
        }
        if (skyEntries === 0) bad.push("the Sky tables are empty stubs; they should hold the sky rows, marked unused");
        for (const c of CELLS30) for (const t of TIERS) for (const k of KINDS) {
            if (built.tables[c][t][k].unusedV1 !== false) bad.push(`${c}|${t}|${k} unusedV1 is ${built.tables[c][t][k].unusedV1}, want false`);
        }
    });

    check("pick_deterministic", bad => {
        // Same inputs, same draws: in a second build, and in a fresh process with Math.random disabled.
        const again = M.buildTables(JSON.parse(JSON.stringify(B)), JSON.parse(JSON.stringify(W)));
        if (JSON.stringify(again) !== JSON.stringify(built)) bad.push("two builds from the same data differ");
        const mine = parentDraws(M, built);
        const theirs = parentDraws(M, again);
        if (JSON.stringify(mine) !== JSON.stringify(theirs)) bad.push("draws differ between two builds");
        const ch = spawnSync(process.execPath, ["-e", CHILD_DRAWS, path.join(ROOT, P.module)], { encoding: "utf8" });
        if (ch.status !== 0) bad.push(`child process failed: ${(ch.stderr || "").split("\n").find(l => /Error/.test(l)) || ch.status}`);
        else if (ch.stdout !== JSON.stringify(mine)) bad.push("a fresh process gives different draws");
        // Draws vary with the index and the seed, and land only on the table's entries.
        const tb = built.tables["TEMPERATE/Lowlands"].T2.wander;
        const ids = new Set(tb.entries.map(e => e.id));
        const seqA = [], seqB = [];
        for (let i = 0; i < 1000; i++) { seqA.push(M.pick(tb, 7, i)); seqB.push(M.pick(tb, 8, i)); }
        if (new Set(seqA).size < 2) bad.push("1000 draws on TEMPERATE/Lowlands|T2|wander gave one creature");
        if (JSON.stringify(seqA) === JSON.stringify(seqB)) bad.push("seeds 7 and 8 give the same draws");
        if (seqA.some(id => !ids.has(id))) bad.push("a draw is not an entry of its table");
        // The draw follows the integer weights: total variation distance over 200000 draws below 0.02.
        const N = 200000, count = new Map();
        for (let i = 0; i < N; i++) { const id = M.pick(tb, 99, i); count.set(id, (count.get(id) || 0) + 1); }
        let tvd = 0;
        for (const e of tb.entries) tvd += Math.abs((count.get(e.id) || 0) / N - e.weight / tb.total);
        tvd /= 2;
        if (!(tvd < 0.02)) bad.push(`draw frequencies are ${tvd.toFixed(4)} from the weights (want < 0.02)`);
        // Empty tables give null; bad arguments throw.
        const empty = { key: "test|T0|wander", cellId: 0, tierIndex: 0, kind: "wander", unusedV1: false, total: 0, entries: [] };
        if (M.pick(empty, 1, 0) !== null) bad.push("an empty table did not give null");
        for (const [s, i] of [[-1, 0], [4294967296, 0], [1.5, 0], [1, -1], [1, 0.5], ["1", 0]]) {
            if (!throwsCode(() => M.pick(tb, s, i))) bad.push(`pick(seed ${JSON.stringify(s)}, index ${JSON.stringify(i)}) did not throw`);
        }
    });

    check("weights_from_data", bad => {
        if (W.status !== "PM_DEFAULT") bad.push(`weights status ${W.status}, want PM_DEFAULT`);
        if (built.weightsStatus !== W.status) bad.push(`tables report weights status ${built.weightsStatus}`);
        for (const [k, v] of Object.entries(W.frequencyWeight)) if (!Number.isSafeInteger(v) || v < 1) bad.push(`frequencyWeight.${k} = ${v}`);
        for (const v of W.tierGapWeight) if (!Number.isSafeInteger(v) || v < 1) bad.push(`tierGapWeight value ${v}`);
        compareToOracle(built, exp, bad, "shipped weights");
        eachTable(built, (tb, c, t, k) => { for (const e of tb.entries) if (!Number.isSafeInteger(e.weight) || e.weight < 1) bad.push(`${c}|${t}|${k}: ${e.id} weight ${e.weight}`); });
        // Change the data and the tables must follow it.
        const W2 = JSON.parse(JSON.stringify(W));
        W2.frequencyWeight.common += 5; W2.frequencyWeight.rare += 2; W2.tierGapWeight = [7, 3];
        let built2 = null;
        try { built2 = M.buildTables(B, W2); } catch (e) { bad.push(`changed weights: buildTables threw ${e.message}`); }
        if (built2) {
            compareToOracle(built2, expectedTables(B, W2), bad, "changed weights");
            if (JSON.stringify(built2.tables) === JSON.stringify(built.tables)) bad.push("changed weights gave the same tables");
        }
        // Bad weights are refused, not used.
        const broken = [
            ["common 0", w => { w.frequencyWeight.common = 0; }],
            ["rare 1.5", w => { w.frequencyWeight.rare = 1.5; }],
            ["uncommon \"3\"", w => { w.frequencyWeight.uncommon = "3"; }],
            ["lair missing", w => { delete w.frequencyWeight.lair; }],
            ["tierGapWeight []", w => { w.tierGapWeight = []; }],
            ["featureOnly unknown id", w => { w.featureOnly.ids = w.featureOnly.ids.concat(["srd:creature:no-such-thing"]); }]
        ];
        for (const [label, fn] of broken) {
            const w = JSON.parse(JSON.stringify(W)); fn(w);
            if (!throwsCode(() => M.buildTables(B, w))) bad.push(`weights with ${label} were accepted`);
        }
    });

    check("module_syntax", bad => {
        // tools/check_deus_syntax.js covers game/js/plugins only, so the sim module is checked here.
        const r = spawnSync(process.execPath, ["--check", path.join(ROOT, P.module)], { encoding: "utf8" });
        if (r.status !== 0) bad.push((r.stderr || "").trim().split("\n").slice(0, 3).join(" | "));
    });

    for (const c of checks) {
        const bad = [];
        try { c.fn(bad); } catch (e) { bad.push(`threw: ${e.message}`); }
        results.push({ name: c.name, ok: bad.length === 0 });
        if (bad.length === 0) console.log(`PASS ::${c.name}`);
        else console.log(`FAIL ::${c.name}: ${bad.length} problem(s); ${bad.slice(0, 3).join("; ")}${bad.length > 3 ? "; ..." : ""}`);
    }
    return results;
}

// ---- mutants ----
const COPY = [P.module, P.weights, P.bestiary];
function copyInto(dst) {
    for (const rel of COPY) {
        const to = path.join(dst, rel);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(path.join(ROOT, rel), to);
    }
}
const editJson = (root, rel, fn) => {
    const f = path.join(root, rel);
    const doc = JSON.parse(fs.readFileSync(f, "utf8"));
    fn(doc);
    fs.writeFileSync(f, JSON.stringify(doc, null, 1) + "\n", "utf8");
};
const editText = (root, rel, from, to) => {
    const f = path.join(root, rel);
    const text = fs.readFileSync(f, "utf8");
    if (!text.includes(from)) throw new Error(`mutant patch target not found in ${rel}: ${from}`);
    fs.writeFileSync(f, text.replace(from, to), "utf8");
};

const MUTANTS = [
    // The brief's two.
    { name: "tier_plus_one", red: ["tier_ceiling"],
      apply: r => editText(r, P.module, "/*MUTANT tier_plus_one*/ const ceiling = t;", "/*MUTANT tier_plus_one*/ const ceiling = t + 1;") },
    { name: "summon_leak", red: ["no_summon_exclude_people"],
      apply: r => editText(r, P.module, "/*MUTANT summon_leak*/ if (row.placement === \"summon\") return null;", "/*MUTANT summon_leak*/") },
    // Beyond the brief: one per remaining check, so each is seen able to fail.
    { name: "lair_wanders", red: ["lairs_only_in_lair_tables"],
      apply: r => editText(r, P.module, "return row.placement === \"lair\" ? \"lair\" : \"wander\";", "return \"wander\";") },
    { name: "elementals_rolled", red: ["elementals_feature_only"],
      apply: r => editJson(r, P.weights, w => { w.featureOnly.ids = []; }) },
    { name: "t0_dropped", red: ["t0_nonempty"],
      apply: r => editText(r, P.module, "if (rowTier > ceiling) continue;", "if (rowTier > ceiling || ceiling === 0) continue;") },
    { name: "sky_live", red: ["sky_tables_marked_unused_v1"],
      apply: r => editText(r, P.module, "unusedV1: cell === SKY,", "unusedV1: false,") },
    { name: "pick_random", red: ["pick_deterministic"],
      apply: r => editText(r, P.module, "drawKey(seed, table, spawnIndex) * table.total", "Math.floor(Math.random() * 4294967296) * table.total") },
    { name: "weights_hardcoded", red: ["weights_from_data"],
      apply: r => editText(r, P.module, "const weight = fw[row.frequency] * gw[gap];", "const weight = fw[row.frequency] * [32, 4, 1][gap];") },
    { name: "syntax_break", red: ["module_syntax"],
      apply: r => fs.appendFileSync(path.join(r, P.module), "\nfunction (\n") }
];

function runMutants() {
    let killedAll = true;
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "encounter-mut-"));
    try {
        const chosen = ONLY_MUTANT ? MUTANTS.filter(m => m.name === ONLY_MUTANT) : MUTANTS;
        if (!chosen.length) { console.log(`FAIL ::mutant_${ONLY_MUTANT}_killed: no such mutant`); return false; }
        for (const m of chosen) {
            const root = path.join(base, m.name);
            copyInto(root);
            let problem = null;
            try { m.apply(root); } catch (e) { problem = `could not apply: ${e.message}`; }
            if (!problem) {
                const r = spawnSync(process.execPath, [__filename, "--root", root, "--no-mutants"], { encoding: "utf8" });
                const out = r.stdout || "";
                if (ONLY_MUTANT) console.log(`--- rerun under mutant ${m.name}, exit ${r.status} ---\n${out.trim()}\n---`);
                const failed = new Set([...out.matchAll(/^FAIL ::(\w+)/gm)].map(x => x[1]));
                const missRed = m.red.filter(n => !failed.has(n));
                if (r.status !== 1) problem = `test exit ${r.status}, want 1`;
                else if (missRed.length) problem = `still green: ${missRed.join(", ")}`;
                if (!problem) console.log(`PASS ::mutant_${m.name}_killed (exit 1; red: ${[...failed].join(", ")})`);
            }
            if (problem) { killedAll = false; console.log(`FAIL ::mutant_${m.name}_killed: ${problem}`); }
        }
    } finally {
        fs.rmSync(base, { recursive: true, force: true });
    }
    return killedAll;
}

console.log(`test_encounter_tables: root ${ROOT}`);
const results = runChecks();
let ok = results.every(r => r.ok);
if (RUN_MUTANTS) {
    if (!ok) console.log("mutant sweep skipped: the checks must pass on the real files first");
    else ok = runMutants() && ok;
}
console.log(ok ? "test_encounter_tables: all checks passed" : "test_encounter_tables: FAILED");
process.exit(ok ? 0 : 1);
