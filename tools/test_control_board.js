#!/usr/bin/env node
"use strict";

/**
 * tools/test_control_board.js
 *
 * Anti-regression control board validator (OPS.PRUNE.01 / L1).
 * Validates docs/STATUS.md against live repository state:
 *   1. Every enabled plugin in game/js/plugins.js must be listed in Live Systems.
 *   2. Every DEUS_Core companion plugin must be listed in Live Companions.
 *   3. Every active local task/* branch must be listed in In Review.
 *   4. Every row in Archived Systems must NOT exist at its original path on disk.
 *   5. Every file in game/js/plugins must be either enabled in plugins.js or named on the board.
 *   6. Supports mutant modes (--mutate=<name> or --mutant=<name>) to prove ability to fail.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const STATUS_PATH = path.join(ROOT, "docs", "STATUS.md");
const PLUGINS_JS = path.join(ROOT, "game", "js", "plugins.js");
const PLUGINS_DIR = path.join(ROOT, "game", "js", "plugins");

const MUTANTS = [
    "missing_live_plugin",
    "archived_file_exists",
    "missing_archive_file",
    "unlisted_plugin_in_dir",
    "missing_task_branch"
];

const args = process.argv.slice(2);
let activeMutant = null;
for (const arg of args) {
    const m = arg.match(/^--(?:mutant|mutate)=([a-z_]+)$/);
    if (m) {
        activeMutant = m[1];
    } else if (arg === "--list-mutants") {
        console.log(MUTANTS.join("\n"));
        process.exit(0);
    }
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

function hasToken(text, token) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|[^a-zA-Z0-9_-])${escaped}(?:$|[^a-zA-Z0-9_-])`);
    return re.test(text);
}

console.log("=== Control Board & Anti-Regression Verification ===");
if (activeMutant) {
    console.log(`[MUTANT MODE ACTIVE: ${activeMutant}]`);
}

// 1. Verify docs/STATUS.md exists
if (!fs.existsSync(STATUS_PATH)) {
    console.error(`Missing ${STATUS_PATH}`);
    process.exit(1);
}
let statusText = fs.readFileSync(STATUS_PATH, "utf8");

// Apply data mutation if mutant mode requests it
if (activeMutant === "missing_live_plugin") {
    // Deliberately strip all mentions of DEUS_Core from the board to prove failure detection
    statusText = statusText.replace(/DEUS_Core/g, "DEUS_Core_MUTATED_OUT");
}

// 2. Read game/js/plugins.js
let sandbox = {};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(PLUGINS_JS, "utf8"), sandbox);
const plugins = sandbox.$plugins || [];
const enabledPlugins = plugins.filter(p => p.status === true).map(p => p.name);

console.log(`Found ${enabledPlugins.length} enabled plugins in plugins.js.`);

// Check 1: All enabled plugins in plugins.js must be in STATUS.md
let missingLive = [];
for (const p of enabledPlugins) {
    if (!hasToken(statusText, p)) {
        missingLive.push(p);
    }
}
check(
    "All enabled plugins in plugins.js are listed on the control board",
    missingLive.length === 0,
    missingLive.length ? `Missing: ${missingLive.join(", ")}` : ""
);

// Check 2: Core companions in DEUS_Core.js must all be listed
const corePath = path.join(PLUGINS_DIR, "DEUS_Core.js");
let companionPlugins = [];
if (fs.existsSync(corePath)) {
    const coreJs = fs.readFileSync(corePath, "utf8");
    const companionMatch = coreJs.match(/const companionPlugins\s*=\s*\[([\s\S]*?)\];/);
    if (companionMatch) {
        companionPlugins = companionMatch[1].split("\n")
            .map(l => l.replace(/\/\/.*$/, "").trim())
            .filter(Boolean)
            .map(l => l.replace(/["',]/g, "").trim())
            .filter(Boolean);
    }
}

let missingCompanions = [];
for (const comp of companionPlugins) {
    if (!hasToken(statusText, comp)) {
        missingCompanions.push(comp);
    }
}
check(
    `All DEUS_Core companion plugins (${companionPlugins.length}) are listed on the control board`,
    missingCompanions.length === 0,
    missingCompanions.length ? `Missing: ${missingCompanions.join(", ")}` : ""
);

// Check 3: Active task/* branches listed in In Review
let taskBranches = [];
try {
    const rawBranches = execSync("git branch --list task/*", { cwd: ROOT }).toString();
    taskBranches = rawBranches.split("\n")
        .map(b => b.replace(/^[*+\s]+/, "").trim())
        .filter(b => b.startsWith("task/"));
} catch (e) {
    console.warn("Could not read local git branches:", e.message);
}

if (activeMutant === "missing_task_branch") {
    // Inject a non-existent task branch into the checked set
    taskBranches.push("task/mutant-unlisted-lane");
}

let missingBranches = [];
for (const b of taskBranches) {
    const laneName = b.replace("task/", "");
    if (!hasToken(statusText, b) && !hasToken(statusText, laneName)) {
        missingBranches.push(b);
    }
}
check(
    `All open task/* branches (${taskBranches.length}) are accounted for in In Review`,
    missingBranches.length === 0,
    missingBranches.length ? `Missing: ${missingBranches.join(", ")}` : ""
);

// Check 4: Parse Archived Systems table; original paths must NOT exist
const lines = statusText.split("\n");
let inArchivedSection = false;
let archivedRows = [];

for (const line of lines) {
    if (/^##\s+5\.\s+Archived/i.test(line)) {
        inArchivedSection = true;
        continue;
    }
    if (inArchivedSection && /^##\s+/i.test(line)) {
        inArchivedSection = false;
        break;
    }
    if (inArchivedSection && line.includes("|")) {
        const parts = line.split("|").map(s => s.trim()).filter(Boolean);
        // Expect format: | Original Path | Archive Path | Ruling |
        if (parts.length >= 2 && !parts[0].startsWith("---") && !parts[0].toLowerCase().includes("original path")) {
            const orig = parts[0].replace(/`/g, "");
            const arch = parts[1].replace(/`/g, "");
            archivedRows.push({ orig, arch });
        }
    }
}

if (activeMutant === "archived_file_exists") {
    // Inject a file that genuinely exists on disk into the archived list
    archivedRows.push({ orig: "game/js/plugins/DEUS_Core.js", arch: "archive/plugins/DEUS_Core.js" });
}
if (activeMutant === "missing_archive_file" || activeMutant === "missing_in_archive") {
    // Inject a file whose archive destination does not exist on disk
    archivedRows.push({ orig: "game/js/plugins/non_existent_fake_orig.js", arch: "archive/plugins/non_existent_fake_arch.js" });
}

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
    `All items declared in Archived Systems (${archivedRows.length}) have been moved off their original paths`,
    existingArchived.length === 0,
    existingArchived.length ? `Still exists on disk: ${existingArchived.join(", ")}` : ""
);
check(
    `All archive destinations declared in Archived Systems (${archivedRows.length}) exist on disk`,
    missingInArchive.length === 0,
    missingInArchive.length ? `Missing from archive on disk: ${missingInArchive.join(", ")}` : ""
);

// Check 5: Anti-Junk Guard — every .js in game/js/plugins must be accounted for
const allPluginFiles = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith(".js"));
if (activeMutant === "unlisted_plugin_in_dir") {
    // Inject an unlisted rogue plugin into the scanned directory list
    allPluginFiles.push("unauthorized_rogue_script.js");
}

let unlistedFiles = [];
for (const f of allPluginFiles) {
    const baseName = f.replace(/\.js$/, "");
    const isEnabled = enabledPlugins.includes(baseName);
    const isNamedOnBoard = hasToken(statusText, f) || hasToken(statusText, baseName);
    if (!isEnabled && !isNamedOnBoard) {
        unlistedFiles.push(f);
    }
}
check(
    "Anti-Junk Guard: No unlisted or unauthorized .js files in game/js/plugins",
    unlistedFiles.length === 0,
    unlistedFiles.length ? `Unaccounted files: ${unlistedFiles.join(", ")}` : ""
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
