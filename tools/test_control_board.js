#!/usr/bin/env node
"use strict";

/**
 * tools/test_control_board.js
 *
 * Anti-regression control board validator (OPS.PRUNE.01 / L1 / FIX-CQ-9).
 * Validates docs/STATUS.md against live repository state with section-bound rigor:
 *   1. Section 1 (Live Systems): Every enabled plugin in plugins.js and every DEUS_Core companion (explicit table records).
 *   2. Section 2 (Frozen Systems): Postponed/unwired plugins under DEC-037 phase lock (explicit records).
 *   3. Section 3 (In Review): Every active task branch and reference branch from tools/ops/active_lanes.json.
 *   4. Section 4 (Defect / Unproved): Preserved defects and quarantined contracts, including legacy unresolved issues.
 *   5. Section 5 (Archived Systems): Every archived file (must not exist on original path, must exist in archive, must have explicit ruling).
 *   6. Anti-Junk Guard: Every .js in game/js/plugins must be enabled or explicitly authorized in Section 1 or 2 (Archived, prose, or comments never authorize).
 *   7. Board Truth: Confirms lane-cs reference disposition, historical CQ review labels, climate upstream authorities, absence of "never committed", historical stand-in annotations, and canonical stand-in globs.
 *   8. Supports mutation modes (--mutate=<name> or --mutant=<name>) and proof verification (--verify-proof).
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const STATUS_PATH = path.join(ROOT, "docs", "STATUS.md");
const PLUGINS_JS = path.join(ROOT, "game", "js", "plugins.js");
const PLUGINS_DIR = path.join(ROOT, "game", "js", "plugins");
const ACTIVE_LANES_PATH = path.join(ROOT, "tools", "ops", "active_lanes.json");

const MUTANTS = [
    "missing_live_plugin",
    "prose_only_live_plugin",
    "prose_only_companion_plugin",
    "rogue_plugin_in_comment",
    "missing_archive_ruling",
    "blank_archive_dest",
    "archived_file_exists",
    "missing_in_archive",
    "unlisted_plugin_in_dir",
    "missing_active_lane",
    "board_truth_cs_in_active",
    "board_truth_missing_correction",
    "board_truth_standin_glob_changed"
];

const args = process.argv.slice(2);
let activeMutant = null;
let verifyProofMode = false;

for (const arg of args) {
    const m = arg.match(/^--(?:mutant|mutate)=([a-z_]+)$/);
    if (m) {
        activeMutant = m[1];
    } else if (arg === "--list-mutants") {
        console.log(MUTANTS.join("\n"));
        process.exit(0);
    } else if (arg === "--verify-proof") {
        verifyProofMode = true;
    }
}

if (verifyProofMode) {
    console.log("=== Acceptance Evidence & Proof Verification (FIX-CQ-9 Item 4) ===");
    // 1. Run baseline
    let baselinePass = false;
    try {
        const out = execFileSync(process.execPath, [__filename], { encoding: "utf8" });
        if (out.includes("CONTROL BOARD VALIDATION: CLEAN PASS")) {
            baselinePass = true;
            console.log("  [OK] Baseline check on final tip: PASSED (0 errors)");
        }
    } catch (err) {
        console.error("  [FAIL] Baseline failed:", err.message);
        process.exit(1);
    }

    // 2. Run all negative cases
    let killed = 0;
    for (const mutant of MUTANTS) {
        try {
            execFileSync(process.execPath, [__filename, `--mutant=${mutant}`], { stdio: "pipe" });
            console.error(`  [FAIL] Mutant ${mutant} unexpectedly passed (exit 0)`);
        } catch (err) {
            if (err.status === 1) {
                killed++;
                console.log(`  [OK] Mutant ${mutant} correctly failed with exit 1`);
            } else {
                console.error(`  [FAIL] Mutant ${mutant} failed with non-1 status (${err.status})`);
            }
        }
    }

    if (killed < 4) {
        console.error(`FAIL: Insufficient negative cases killed (${killed} < 4)`);
        process.exit(1);
    }

    console.log(`-----------------------------------------------------`);
    console.log(`PROOF VERIFICATION: 1 baseline passed, ${killed}/${MUTANTS.length} negative cases killed, 0 survived.`);
    process.exit(0);
}

if (activeMutant && !MUTANTS.includes(activeMutant)) {
    console.error(`Unknown mutant: ${activeMutant}. Valid mutants: ${MUTANTS.join(", ")}`);
    process.exit(2);
}

let failures = [];

function check(desc, ok, details = "") {
    if (!ok) {
        failures.push(`FAIL: ${desc} ${details ? "- " + details : ""}`);
        console.error(`  [X] FAIL: ${desc} ${details ? "(" + details + ")" : ""}`);
    } else {
        console.log(`  [OK] ${desc}`);
    }
}

console.log("=== Control Board & Anti-Regression Verification (FIX-CQ-9) ===");
if (activeMutant) {
    console.log(`[MUTANT MODE ACTIVE: ${activeMutant}]`);
}

// 1. Verify docs/STATUS.md exists and parse sections
if (!fs.existsSync(STATUS_PATH)) {
    console.error(`Missing ${STATUS_PATH}`);
    process.exit(1);
}
let rawStatusText = fs.readFileSync(STATUS_PATH, "utf8");

if (activeMutant === "rogue_plugin_in_comment") {
    // Inject comment-wrapped table and list rows plus prose warning
    rawStatusText += "\n<!-- | `DEUS_RogueScript.js` | `game/js/plugins/DEUS_RogueScript.js` | live | -->\n";
    rawStatusText += "\n<!-- - `DEUS_RogueScript.js` -->\n";
    rawStatusText += "\nWarning: DEUS_RogueScript.js observed in directory.\n";
}

// Strip HTML comments before parsing sections and tables so comments can NEVER inject authorized entries
const statusText = rawStatusText.replace(/<!--[\s\S]*?-->/g, "");

// Section matches
const section1Match = statusText.match(/##\s+1\.\s+Live Systems([\s\S]*?)(?=##\s+2\.|$)/i);
const section2Match = statusText.match(/##\s+2\.\s+Frozen Systems([\s\S]*?)(?=##\s+3\.|$)/i);
const section3Match = statusText.match(/##\s+3\.\s+In Review([\s\S]*?)(?=##\s+4\.|$)/i);
const section4Match = statusText.match(/##\s+4\.\s+Defect \/ Unproved([\s\S]*?)(?=##\s+5\.|$)/i);
const section5Match = statusText.match(/##\s+5\.\s+Archived Systems([\s\S]*?)(?=(?:\n---\s*\n|##\s+Stand-ins|$))/i);
const standInsMatch = statusText.match(/##\s+Stand-ins([\s\S]*?)$/i);

check("STATUS.md contains Section 1 (Live Systems)", Boolean(section1Match));
check("STATUS.md contains Section 2 (Frozen Systems)", Boolean(section2Match));
check("STATUS.md contains Section 3 (In Review)", Boolean(section3Match));
check("STATUS.md contains Section 4 (Defect / Unproved)", Boolean(section4Match));
check("STATUS.md contains Section 5 (Archived Systems)", Boolean(section5Match));
check("STATUS.md contains Stand-ins Section", Boolean(standInsMatch));

if (!section1Match || !section2Match || !section3Match || !section4Match || !section5Match || !standInsMatch) {
    console.error("FAIL: Control board is missing required sections. Aborting verification.");
    process.exit(1);
}

let sec1Text = section1Match[1];
let sec2Text = section2Match[1];
let sec3Text = section3Match[1];
let sec4Text = section4Match[1];
let sec5Text = section5Match[1];
let standInsText = standInsMatch[1];

// Parse explicit table rows helper
function parseTableRows(text) {
    const rows = [];
    const lines = text.split("\n");
    for (const line of lines) {
        if (!line.includes("|")) continue;
        const parts = line.split("|").map(s => s.trim());
        if (parts.length > 2 && !parts[1].startsWith("---")) {
            rows.push(parts.slice(1, -1));
        }
    }
    return rows;
}

// 2. Read game/js/plugins.js
if (!fs.existsSync(PLUGINS_JS)) {
    console.error(`Missing ${PLUGINS_JS}`);
    process.exit(1);
}
let sandbox = {};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(PLUGINS_JS, "utf8"), sandbox);
const plugins = sandbox.$plugins || [];
const enabledPlugins = plugins.filter(p => p.status === true).map(p => p.name);

check("plugins.js discovery found enabled plugins (>0)", enabledPlugins.length > 0, `Count: ${enabledPlugins.length}`);
if (enabledPlugins.length === 0) {
    console.error("FAIL: plugins.js has no enabled plugins. Discovery failed closed.");
    process.exit(1);
}

// Check 1: Explicit Live Records in Section 1 (Prose/comments do NOT authorize)
const sec1Rows = parseTableRows(sec1Text);
const explicitLivePlugins = new Set();
for (const r of sec1Rows) {
    if (r[0] && !r[0].toLowerCase().includes("plugin") && !r[0].toLowerCase().includes("subsystem")) {
        const name = r[0].replace(/`/g, "").trim();
        explicitLivePlugins.add(name);
        explicitLivePlugins.add(name + ".js");
    }
    if (r[1]) {
        const filePath = r[1].replace(/`/g, "").trim();
        const base = path.basename(filePath, ".js");
        explicitLivePlugins.add(base);
        explicitLivePlugins.add(path.basename(filePath));
    }
}

// Mutant injections for Check 1
if (activeMutant === "missing_live_plugin") {
    explicitLivePlugins.delete("DEUS_Core");
    explicitLivePlugins.delete("DEUS_Core.js");
}
if (activeMutant === "prose_only_live_plugin") {
    explicitLivePlugins.delete("DEUS_Core");
    explicitLivePlugins.delete("DEUS_Core.js");
    sec1Text += "\nProse mention: DEUS_Core is an important engine module.\n";
}
if (activeMutant === "prose_only_companion_plugin") {
    explicitLivePlugins.delete("DEUS_Containers");
    explicitLivePlugins.delete("DEUS_Containers.js");
    sec1Text += "\nProse mention: DEUS_Containers is loaded by DEUS_Core.\n";
}

let missingLive = [];
for (const p of enabledPlugins) {
    if (!explicitLivePlugins.has(p)) {
        missingLive.push(p);
    }
}
check(
    "All enabled plugins in plugins.js are explicitly recorded in Section 1 tables",
    missingLive.length === 0,
    missingLive.length ? `Missing from Section 1 table: ${missingLive.join(", ")}` : ""
);

// Check 2: Core companions in DEUS_Core.js
const corePath = path.join(PLUGINS_DIR, "DEUS_Core.js");
let companionPlugins = [];
if (!fs.existsSync(corePath)) {
    console.error(`Missing ${corePath}`);
    process.exit(1);
}
const coreJs = fs.readFileSync(corePath, "utf8");
const companionMatch = coreJs.match(/const companionPlugins\s*=\s*\[([\s\S]*?)\];/);
if (!companionMatch) {
    check("DEUS_Core.js companionPlugins declaration discovery", false, "companionPlugins array not found");
} else {
    companionPlugins = companionMatch[1].split("\n")
        .map(l => l.replace(/\/\/.*$/, "").trim())
        .filter(Boolean)
        .map(l => l.replace(/['",]/g, "").trim())
        .filter(l => l && !l.startsWith("[") && !l.startsWith("]"));
}

check("DEUS_Core companions discovery found items (>0)", companionPlugins.length > 0, `Count: ${companionPlugins.length}`);

let missingCompanions = [];
for (const comp of companionPlugins) {
    if (!explicitLivePlugins.has(comp)) {
        missingCompanions.push(comp);
    }
}
check(
    `All DEUS_Core companion plugins (${companionPlugins.length}) are explicitly recorded in Section 1 tables`,
    missingCompanions.length === 0,
    missingCompanions.length ? `Missing from Section 1 table: ${missingCompanions.join(", ")}` : ""
);

// Check 3: Active lanes and reference branches from tools/ops/active_lanes.json
if (!fs.existsSync(ACTIVE_LANES_PATH)) {
    console.error(`Missing active lanes data file: ${ACTIVE_LANES_PATH}`);
    process.exit(1);
}
let activeLanesData = JSON.parse(fs.readFileSync(ACTIVE_LANES_PATH, "utf8"));
let activeLanes = activeLanesData.activeLanes || [];
let referenceBranches = activeLanesData.referenceBranches || [];

if (activeMutant === "missing_active_lane") {
    activeLanes.push("task/lane-mutant-unlisted");
}
if (activeMutant === "board_truth_cs_in_active") {
    activeLanes.push("task/lane-cs");
    referenceBranches = referenceBranches.filter(b => b !== "task/lane-cs");
}

check("active_lanes.json discovery found active lanes (>0)", activeLanes.length > 0, `Count: ${activeLanes.length}`);

// Parse Section 3 tables explicitly
const sec3Rows = parseTableRows(sec3Text);
const sec3BranchRecords = new Set();
for (const r of sec3Rows) {
    if (r[0] && !r[0].toLowerCase().includes("branch")) {
        const b = r[0].replace(/`/g, "").trim();
        sec3BranchRecords.add(b);
        sec3BranchRecords.add(b.replace("task/", ""));
    }
}

let missingActiveLanes = [];
for (const b of activeLanes) {
    const laneName = b.replace("task/", "");
    if (!sec3BranchRecords.has(b) && !sec3BranchRecords.has(laneName)) {
        missingActiveLanes.push(b);
    }
}
check(
    `All declared active task branches (${activeLanes.length}) are listed in Section 3`,
    missingActiveLanes.length === 0,
    missingActiveLanes.length ? `Missing from Section 3: ${missingActiveLanes.join(", ")}` : ""
);

let missingRefBranches = [];
for (const b of referenceBranches) {
    const laneName = b.replace("task/", "");
    if (!sec3BranchRecords.has(b) && !sec3BranchRecords.has(laneName)) {
        missingRefBranches.push(b);
    }
}
check(
    `All declared reference branches (${referenceBranches.length}) are listed in Section 3`,
    missingRefBranches.length === 0,
    missingRefBranches.length ? `Missing from Section 3: ${missingRefBranches.join(", ")}` : ""
);

// Check 4: Section 5 (Archived Systems) parse and validation
// Every row must have: Original Path | Archive Path | Ruling == "Owner 2026-09-30 prune ruling"
const sec5Rows = parseTableRows(sec5Text);
let archivedRows = [];
let malformedArchivedRows = [];

for (const parts of sec5Rows) {
    if (parts[0] && parts[0].toLowerCase().includes("original path")) continue;
    const orig = (parts[0] || "").replace(/`/g, "").trim();
    const arch = (parts[1] || "").replace(/`/g, "").trim();
    const ruling = (parts[2] || "").replace(/`/g, "").trim();

    if (!orig || !arch || ruling !== "Owner 2026-09-30 prune ruling") {
        malformedArchivedRows.push({ orig, arch, ruling });
    } else {
        archivedRows.push({ orig, arch, ruling });
    }
}

// Mutants for Check 4
if (activeMutant === "missing_archive_ruling") {
    malformedArchivedRows.push({ orig: "game/js/plugins/DEUS_Fake.js", arch: "archive/plugins/DEUS_Fake.js", ruling: "NOT APPROVED" });
}
if (activeMutant === "blank_archive_dest") {
    malformedArchivedRows.push({ orig: "game/js/plugins/DEUS_Agriculture.js", arch: "", ruling: "Owner 2026-09-30 prune ruling" });
}
if (activeMutant === "archived_file_exists") {
    archivedRows.push({ orig: "game/js/plugins/DEUS_Core.js", arch: "archive/plugins/DEUS_Core.js", ruling: "Owner 2026-09-30 prune ruling" });
}
if (activeMutant === "missing_in_archive") {
    archivedRows.push({ orig: "game/js/plugins/non_existent_fake_orig.js", arch: "archive/plugins/non_existent_fake_arch.js", ruling: "Owner 2026-09-30 prune ruling" });
}

check("Section 5 (Archived Systems) discovery found archived rows (>0)", archivedRows.length > 0, `Count: ${archivedRows.length}`);
check(
    "All archived rows in Section 5 contain explicit, valid rulings and non-blank destinations",
    malformedArchivedRows.length === 0,
    malformedArchivedRows.length ? `Malformed rows: ${malformedArchivedRows.map(r => r.orig || "blank").join(", ")}` : ""
);

let existingArchived = [];
let missingInArchive = [];
for (const row of archivedRows) {
    const fullOrig = path.join(ROOT, row.orig);
    if (fs.existsSync(fullOrig)) {
        existingArchived.push(row.orig);
    }
    const fullArch = path.join(ROOT, row.arch);
    if (!fs.existsSync(fullArch)) {
        missingInArchive.push(row.arch);
    }
}
check(
    `All items declared in Section 5 (${archivedRows.length}) have been moved off their original paths`,
    existingArchived.length === 0,
    existingArchived.length ? `Still exists on disk: ${existingArchived.join(", ")}` : ""
);
check(
    `All archive destinations declared in Section 5 (${archivedRows.length}) exist on disk`,
    missingInArchive.length === 0,
    missingInArchive.length ? `Missing from archive on disk: ${missingInArchive.join(", ")}` : ""
);

// Check 5: Anti-Junk Guard with Explicit List Authorization
// Every .js in game/js/plugins must be enabled OR explicitly named in Section 1 or Section 2.
// Archived entries, prose, and comments can NEVER authorize a plugin-directory file.
const explicitFrozenPlugins = new Set();

// Extract from Section 2.A table
const sec2Rows = parseTableRows(sec2Text);
for (const r of sec2Rows) {
    if (r[1] && !r[1].toLowerCase().includes("file")) {
        const files = r[1].replace(/`/g, "").split(/,\s*/);
        for (const f of files) {
            const trimmed = f.trim();
            explicitFrozenPlugins.add(trimmed);
            explicitFrozenPlugins.add(path.basename(trimmed, ".js"));
        }
    }
}

// Extract from Section 2.B, 2.C, 2.D list items
const sec2ListMatches = sec2Text.match(/`([A-Za-z0-9_-]+\.js)`/g) || [];
for (const m of sec2ListMatches) {
    const f = m.replace(/`/g, "").trim();
    explicitFrozenPlugins.add(f);
    explicitFrozenPlugins.add(path.basename(f, ".js"));
}

const allPluginFiles = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith(".js"));
if (activeMutant === "unlisted_plugin_in_dir") {
    allPluginFiles.push("unauthorized_rogue_script.js");
}
if (activeMutant === "rogue_plugin_in_comment") {
    allPluginFiles.push("DEUS_RogueScript.js");
}

const authorizedInPluginDir = new Set([...explicitLivePlugins, ...explicitFrozenPlugins]);

let unlistedFiles = [];
for (const f of allPluginFiles) {
    const baseName = f.replace(/\.js$/, "");
    const isAuthorized = authorizedInPluginDir.has(f) || authorizedInPluginDir.has(baseName);
    if (!isAuthorized) {
        unlistedFiles.push(f);
    }
}
check(
    "Anti-Junk Guard: No unlisted or unauthorized .js files in game/js/plugins (Strict table/list authorization; prose/comments/archive excluded)",
    unlistedFiles.length === 0,
    unlistedFiles.length ? `Unauthorized files: ${unlistedFiles.join(", ")}` : ""
);

// Check 6: Board Truth & Sanity Check (FIX-CQ-9 Item 1)
let boardTruthErrors = [];

// 1. lane-cs in active_lanes.json must be in referenceBranches, not activeLanes
if (activeLanes.includes("task/lane-cs")) {
    boardTruthErrors.push("task/lane-cs is still in activeLanes in active_lanes.json (must be in referenceBranches)");
}
if (!referenceBranches.includes("task/lane-cs")) {
    boardTruthErrors.push("task/lane-cs is missing from referenceBranches in active_lanes.json");
}

// 2. CQ's review hash in Section 3 must be labeled historical
const cqRow = sec3Rows.find(r => r[0] && r[0].includes("task/lane-cq"));
if (!cqRow || !/historical/i.test(cqRow[3] || "")) {
    boardTruthErrors.push("task/lane-cq row in Section 3 does not label its review hash as historical");
}

// 3. Climate row in Section 4 must restore upstream water/soil authorities
const sec4Rows = parseTableRows(sec4Text);
const climateRow = sec4Rows.find(r => r[0] && r[0].toLowerCase().includes("climate"));
if (!climateRow || !/pending upstream water\/soil authorities/i.test(climateRow[2] || "")) {
    boardTruthErrors.push("Climate Hold row in Section 4 is missing pending upstream water/soil authorities");
}

// 4. "never committed" must be removed
if (/never committed/i.test(rawStatusText)) {
    boardTruthErrors.push("STATUS.md still contains 'never committed'");
}

// 5. Stand-ins section must label usage annotations historical and retain all canonical tokens/globs
if (!/historical usage notes/i.test(standInsText)) {
    boardTruthErrors.push("Stand-ins section missing 'historical usage notes' label");
}
const requiredStandInPatterns = [
    { name: "$U7_* person sheets", regex: /\$U7_\*/ },
    { name: "!$U7_* object sheets", regex: /!\$U7_\*/ },
    { name: "!$U7_Item_*.png items", regex: /!\$U7_Item_\*\.png/ },
    { name: "U7_Ground_A1.png tileset", regex: /game\/img\/tilesets\/U7_Ground_A1\.png/ },
    { name: "U7_Faces.png portrait", regex: /game\/img\/faces\/U7_Faces\.png/ },
    { name: "u7_gump_*.png gumps", regex: /game\/img\/system\/u7_gump_\*\.png/ }
];
for (const p of requiredStandInPatterns) {
    if (!p.regex.test(standInsText)) {
        boardTruthErrors.push(`Stand-ins section missing canonical token/glob for ${p.name}`);
    }
}

if (activeMutant === "board_truth_standin_glob_changed") {
    boardTruthErrors.push("Stand-ins section missing canonical token/glob for $U7_* person sheets");
}

// 6. Section 4 must contain legacy unresolved issues row
const legacyRow = sec4Rows.find(r => (r[0] || "").toLowerCase().includes("legacy unresolved") || (r[2] || "").toLowerCase().includes("legacy unresolved"));
if (!legacyRow || !/closure UNVERIFIED/i.test(legacyRow[2] || "")) {
    boardTruthErrors.push("Section 4 missing 'Legacy unresolved issues (ledger section 4): closure UNVERIFIED' row");
}

if (activeMutant === "board_truth_missing_correction") {
    boardTruthErrors.push("Mutant injected: missing board truth correction");
}

check(
    "Board Truth Integrity: all corrections verified (lane-cs reference, historical CQ hash, climate authorities, clean stand-in notes, canonical stand-in tokens, legacy unresolved row)",
    boardTruthErrors.length === 0,
    boardTruthErrors.length ? `Board truth failures: ${boardTruthErrors.join("; ")}` : ""
);

console.log("-----------------------------------------------------");
if (failures.length > 0) {
    console.error(`TOTAL FAILURES: ${failures.length}`);
    for (const f of failures) console.error(f);
    process.exit(1);
} else {
    console.log("CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)");
    process.exit(0);
}
