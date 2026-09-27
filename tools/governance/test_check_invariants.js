#!/usr/bin/env node
"use strict";

/**
 * tools/governance/test_check_invariants.js
 *
 * OPS.70.01. The real tree passes. Every active check FAILs on its mutant fixture
 * (INV-CORE-05: the suite must be able to fail). A registry the catalogue does not
 * match exits 1.
 *
 * Output: PASS <name> / FAIL <name>: <detail>, then RESULT: <n> passed, <m> failed.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REPO = path.resolve(__dirname, "..", "..");
const CHECKER = path.join(__dirname, "check_invariants.js");
const FIX = path.join(__dirname, "fixtures", "invariants");

// Status locked to the registry row, plus a token that must appear in the detail.
// fixture: the active check has a mutant tree under fixtures/invariants/<id>.
const EXPECTED = {
    "INV-CORE-01": { status: "PASS", token: "DEUS_", fixture: true },
    "INV-CORE-02": { status: "NOT-MECHANICAL", token: "architecture audit" },
    "INV-CORE-03": { status: "NOT-MECHANICAL", token: "PERF_QUIET_WORLD" },
    "INV-CORE-04": { status: "NOT-MECHANICAL", token: "save/load" },
    "INV-CORE-05": { status: "NOT-MECHANICAL", token: "fixtures/invariants" },
    "INV-GEO-01": { status: "SUPERSEDED-PENDING-OWNER", token: "DEC-013" },
    "INV-GEO-02": { status: "SUPERSEDED-PENDING-OWNER", token: "DEC-013" },
    "INV-GEO-03": { status: "PASS", token: "M_AIR", fixture: true },
    "INV-GEO-04": { status: "PASS", token: "bedrock", fixture: true },
    "INV-GEO-05": { status: "SUPERSEDED-PENDING-OWNER", token: "DEC-019" },
    "INV-FLD-01": { status: "SUPERSEDED-PENDING-OWNER", token: "DEC-013" },
    "INV-FLD-02": { status: "PASS", token: "exited 0", fixture: true },
    "INV-FLD-03": { status: "PASS", token: "fluidIn", fixture: true },
    "INV-SIM-01": { status: "PASS", token: "this._year = 0", fixture: true },
    "INV-SIM-02": { status: "NOT-MECHANICAL", token: "opts.domain" },
    "INV-SIM-03": { status: "PASS", token: "E_SEALED", fixture: true },
    "INV-ART-01": { status: "SUPERSEDED-PENDING-OWNER", token: "AS-GEN-004" },
    "INV-ART-02": { status: "NOT-MECHANICAL", token: "visual inspection" },
    "INV-ART-03": { status: "SUPERSEDED-PENDING-OWNER", token: "AS-CHMAP-001" },
    "INV-ART-04": { status: "NOT-MECHANICAL", token: "#08080C" },
    "INV-ART-05": { status: "SUPERSEDED-PENDING-OWNER", token: "DEC-007" },
    "INV-GOV-01": { status: "SUPERSEDED-PENDING-OWNER", token: "0028-AC" },
    "INV-GOV-02": { status: "PASS", token: "whitelist", fixture: true },
    "INV-GOV-03": { status: "NOT-MECHANICAL", token: "reading order" },
    "INV-GOV-04": { status: "NOT-MECHANICAL", token: "mailboxes" },
    "INV-GOV-05": { status: "PASS", token: "4.1", fixture: true },
    "INV-SOC-01": { status: "NOT-MECHANICAL", token: "SOC.10.01" },
    "INV-SOC-02": { status: "NOT-MECHANICAL", token: "SOC.13.01" },
    "INV-SOC-03": { status: "NOT-MECHANICAL", token: "SOC.20.01" },
    "INV-SOC-04": { status: "NOT-MECHANICAL", token: "SOC.21.01" },
    "INV-SOC-05": { status: "NOT-MECHANICAL", token: "SOC.30.01" },
    "INV-SOC-06": { status: "NOT-MECHANICAL", token: "SOC.31.01" },
    "INV-SOC-07": { status: "NOT-MECHANICAL", token: "SOC.40.01" },
    "INV-SOC-08": { status: "NOT-MECHANICAL", token: "SOC.40.02" },
    "INV-SOC-09": { status: "NOT-MECHANICAL", token: "SOC.11.01" }
};

let passed = 0;
let failed = 0;

function check(name, ok, detail) {
    if (ok) {
        passed++;
        console.log("PASS " + name);
    } else {
        failed++;
        console.log("FAIL " + name + (detail ? ": " + detail : ""));
    }
}

function run(args, timeout) {
    return spawnSync(process.execPath, [CHECKER, ...args], {
        cwd: REPO,
        encoding: "utf8",
        timeout: timeout || 600000,
        maxBuffer: 32 * 1024 * 1024,
        windowsHide: true
    });
}

function tail(r) {
    return ((r.stderr || "") + "\n" + (r.stdout || "")).trim().split(/\r?\n/).slice(-12).join(" | ");
}

function parseTable(stdout) {
    const rows = [];
    let summary = null;
    for (const line of String(stdout || "").split(/\r?\n/)) {
        if (!line.trim()) continue;
        const s = line.match(/^SUMMARY active=(\d+) pass=(\d+) fail=(\d+) not-mechanical=(\d+) superseded-pending-owner=(\d+)\s*$/);
        if (s) {
            summary = {
                active: Number(s[1]), pass: Number(s[2]), fail: Number(s[3]),
                notMechanical: Number(s[4]), superseded: Number(s[5])
            };
            continue;
        }
        const m = line.match(/^(INV-[A-Z]+-\d+|\(catalogue\)|\(registry\))\s+(PASS|FAIL|NOT-MECHANICAL|SUPERSEDED-PENDING-OWNER)\s+(.*)$/);
        if (m) rows.push({ id: m[1], status: m[2], detail: m[3] });
    }
    return { rows, summary };
}

function registryIds() {
    const text = fs.readFileSync(path.join(REPO, "docs", "INVARIANT_REGISTRY.md"), "utf8");
    const ids = [];
    for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\|\s*\*\*(INV-[A-Z]+-\d+)\*\*\s*\|/);
        if (m) ids.push(m[1]);
    }
    return ids;
}

function parseJson(stdout) {
    try {
        return JSON.parse(stdout);
    } catch (e) {
        return null;
    }
}

const expectedIds = Object.keys(EXPECTED);
const regIds = registryIds();
check("catalogue_matches_registry_order", expectedIds.join("|") === regIds.join("|"),
    "expected " + expectedIds.length + " registry " + regIds.length);

const full = run([]);
const table = parseTable(full.stdout);
check("real_tree_exit_0", full.status === 0, "exit " + full.status + " " + tail(full));
check("real_tree_summary", !!table.summary && table.summary.fail === 0 && table.summary.pass === table.summary.active,
    JSON.stringify(table.summary));

const gotIds = table.rows.map(row => row.id);
check("real_tree_row_order", gotIds.join("|") === regIds.join("|"), gotIds.join("|"));

const byId = new Map(table.rows.map(row => [row.id, row]));
let active = 0;
let notMechanical = 0;
let superseded = 0;
for (const id of expectedIds) {
    const want = EXPECTED[id];
    const got = byId.get(id);
    check("status_" + id, !!got && got.status === want.status && got.detail.includes(want.token),
        got ? got.status + " " + got.detail.slice(0, 80) : "missing row");
    if (want.status === "PASS" || want.status === "FAIL") active++;
    else if (want.status === "NOT-MECHANICAL") notMechanical++;
    else if (want.status === "SUPERSEDED-PENDING-OWNER") superseded++;
}
check("summary_counts", !!table.summary &&
    table.summary.active === active &&
    table.summary.pass === active &&
    table.summary.fail === 0 &&
    table.summary.notMechanical === notMechanical &&
    table.summary.superseded === superseded,
    JSON.stringify(table.summary) + " want active " + active + " not-mechanical " + notMechanical + " superseded " + superseded);

for (const id of expectedIds) {
    if (!EXPECTED[id].fixture) continue;
    const dir = path.join(FIX, id);
    const exists = fs.existsSync(dir) && fs.statSync(dir).isDirectory();
    check("fixture_present_" + id, exists, dir);
    if (!exists) continue;
    const mutant = run(["--json", "--only", id, "--root", dir], 60000);
    const body = parseJson(mutant.stdout);
    const row = body && body.rows && body.rows.find(item => item.id === id);
    check("mutant_fails_" + id,
        mutant.status === 1 && body && body.ok === false && row && row.status === "FAIL" && String(row.detail).startsWith("defect:"),
        "exit " + mutant.status + " " + (row ? row.status + " " + row.detail : tail(mutant)));
}

const unknown = run(["--json", "--registry", path.join(FIX, "registry_unknown_id.md")], 60000);
const unknownBody = parseJson(unknown.stdout);
check("unknown_registry_id_fails",
    unknown.status === 1 && unknownBody && unknownBody.rows.some(row => row.id === "INV-ZZZ-99" && row.status === "FAIL") &&
    unknownBody.rows.some(row => row.id === "(catalogue)" && row.status === "FAIL"),
    "exit " + unknown.status + " " + tail(unknown));

const duplicate = run(["--json", "--registry", path.join(FIX, "registry_duplicate.md")], 120000);
const duplicateBody = parseJson(duplicate.stdout);
check("duplicate_registry_id_fails",
    duplicate.status === 1 && duplicateBody && duplicateBody.rows.some(row => row.id === "(registry)" && /duplicate registry id INV-CORE-01/.test(row.detail)),
    "exit " + duplicate.status + " " + tail(duplicate));

const empty = run(["--json", "--registry", path.join(FIX, "registry_empty.md")], 60000);
const emptyBody = parseJson(empty.stdout);
check("empty_registry_fails",
    empty.status === 1 && emptyBody && emptyBody.rows.some(row => row.id === "(catalogue)" && row.status === "FAIL"),
    "exit " + empty.status + " " + tail(empty));

const usage = run(["--only", "INV-NOPE"], 30000);
check("unknown_only_is_usage", usage.status === 2 && /not a row of the registry/.test(usage.stderr || ""),
    "exit " + usage.status + " " + tail(usage));

const help = run(["--help"], 30000);
check("help_exits_0", help.status === 0 && /usage:/.test(help.stdout || ""), "exit " + help.status);

console.log("RESULT: " + passed + " passed, " + failed + " failed");
process.exit(failed > 0 ? 1 : 0);
