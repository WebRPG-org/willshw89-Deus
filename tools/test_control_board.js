#!/usr/bin/env node
"use strict";

/**
 * tools/test_control_board.js
 *
 * Anti-regression control board validator (OPS.PRUNE.01 / L1 / FIX-CQ-7).
 * Validates docs/STATUS.md against live repository state with section-bound rigor:
 *   1. Section 1 (Live Systems): Every enabled plugin in plugins.js and every DEUS_Core companion.
 *   2. Section 2 (Frozen Systems): Postponed/unwired plugins under DEC-037 phase lock.
 *   3. Section 3 (In Review): Every active task branch and reference branch from tools/ops/active_lanes.json.
 *   4. Section 4 (Defect / Unproved): Preserved defects and quarantined contracts.
 *   5. Section 5 (Archived Systems): Every archived file (must not exist on original path, must exist in archive, must have ruling).
 *   6. Anti-Junk Guard: Every .js in game/js/plugins must be enabled or explicitly authorized in Section 1, 2, or 5.
 *   7. Supports mutation modes (--mutate=<name> or --mutant=<name>) to prove ability to fail.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const STATUS_PATH = path.join(ROOT, "docs", "STATUS.md");
const PLUGINS_JS = path.join(ROOT, "game", "js", "plugins.js");
const PLUGINS_DIR = path.join(ROOT, "game", "js", "plugins");
const ACTIVE_LANES_PATH = path.join(ROOT, "tools", "ops", "active_lanes.json");

const MUTANTS = [
    "missing_live_plugin",
    "misclassified_plugin",
    "missing_archive_ruling",
    "rogue_plugin_in_comment",
    "archived_file_exists",
    "missing_in_archive",
    "unlisted_plugin_in_dir",
    "missing_active_lane"
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

console.log("=== Control Board & Anti-Regression Verification (FIX-CQ-7) ===");
if (activeMutant) {
    console.log(`[MUTANT MODE ACTIVE: ${activeMutant}]`);
}

// 1. Verify docs/STATUS.md exists and parse sections
if (!fs.existsSync(STATUS_PATH)) {
    console.error(`Missing ${STATUS_PATH}`);
    process.exit(1);
}
let statusText = fs.readFileSync(STATUS_PATH, "utf8");

// Fail-closed discovery: verify required sections exist
const section1Match = statusText.match(/##\s+1\.\s+Live Systems([\s\S]*?)(?=##\s+2\.|$)/i);
const section2Match = statusText.match(/##\s+2\.\s+Frozen Systems([\s\S]*?)(?=##\s+3\.|$)/i);
const section3Match = statusText.match(/##\s+3\.\s+In Review([\s\S]*?)(?=##\s+4\.|$)/i);
const section4Match = statusText.match(/##\s+4\.\s+Defect \/ Unproved([\s\S]*?)(?=##\s+5\.|$)/i);
const section5Match = statusText.match(/##\s+5\.\s+Archived Systems([\s\S]*?)(?=(?:\n---\s*\n|##\s+Stand-ins|$))/i);

check("STATUS.md contains Section 1 (Live Systems)", Boolean(section1Match));
check("STATUS.md contains Section 2 (Frozen Systems)", Boolean(section2Match));
check("STATUS.md contains Section 3 (In Review)", Boolean(section3Match));
check("STATUS.md contains Section 4 (Defect / Unproved)", Boolean(section4Match));
check("STATUS.md contains Section 5 (Archived Systems)", Boolean(section5Match));

if (!section1Match || !section2Match || !section3Match || !section4Match || !section5Match) {
    console.error("FAIL: Control board is missing required sections. Aborting verification.");
    process.exit(1);
}

let sec1Text = section1Match[1];
let sec2Text = section2Match[1];
let sec3Text = section3Match[1];
let sec4Text = section4Match[1];
let sec5Text = section5Match[1];

// Apply section-specific mutations
if (activeMutant === "missing_live_plugin") {
    sec1Text = sec1Text.replace(/DEUS_Core/g, "DEUS_Core_MUTATED_OUT");
}
if (activeMutant === "misclassified_plugin") {
    // Remove from section 1 and place into section 4
    sec1Text = sec1Text.replace(/DEUS_Core/g, "MUTATED_AWAY");
    sec4Text += "\n| DEUS_Core | misclassified | Live plugin wrongly placed in defect section | OPEN |\n";
}
if (activeMutant === "missing_archive_ruling") {
    // Remove ruling from an archived row in section 5
    sec5Text = sec5Text.replace(/\|\s*Owner 2026-09-30 prune ruling\s*\|/, "| |");
}
if (activeMutant === "rogue_plugin_in_comment") {
    statusText += "\n<!-- DEUS_RogueScript.js is mentioned only in a comment -->\n";
}

// 2. Read game/js/plugins.js (Fail closed on empty or invalid plugins)
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
    console.error("FAIL: plugins.js has no enabled plugins. Discovery failed.");
    process.exit(1);
}

// Check 1: All enabled plugins in plugins.js must be in Section 1 (Live Systems)
let missingLive = [];
for (const p of enabledPlugins) {
    if (!hasToken(sec1Text, p)) {
        missingLive.push(p);
    }
}
check(
    "All enabled plugins in plugins.js are listed in Section 1 (Live Systems)",
    missingLive.length === 0,
    missingLive.length ? `Missing from Section 1: ${missingLive.join(", ")}` : ""
);

// Check 2: Core companions in DEUS_Core.js must all be in Section 1 (Live Systems)
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
        .map(l => l.replace(/["',]/g, "").trim())
        .filter(Boolean);
}

check("DEUS_Core companions discovery found items (>0)", companionPlugins.length > 0, `Count: ${companionPlugins.length}`);
if (companionPlugins.length === 0) {
    console.error("FAIL: DEUS_Core.js companions discovery failed closed.");
    process.exit(1);
}

let missingCompanions = [];
for (const comp of companionPlugins) {
    if (!hasToken(sec1Text, comp)) {
        missingCompanions.push(comp);
    }
}
check(
    `All DEUS_Core companion plugins (${companionPlugins.length}) are listed in Section 1 (Live Systems)`,
    missingCompanions.length === 0,
    missingCompanions.length ? `Missing from Section 1: ${missingCompanions.join(", ")}` : ""
);

// Check 3: Active lanes and reference branches from tools/ops/active_lanes.json listed in Section 3 (In Review)
if (!fs.existsSync(ACTIVE_LANES_PATH)) {
    console.error(`Missing active lanes data file: ${ACTIVE_LANES_PATH}`);
    process.exit(1);
}
let activeLanesData = null;
try {
    activeLanesData = JSON.parse(fs.readFileSync(ACTIVE_LANES_PATH, "utf8"));
} catch (e) {
    console.error(`Invalid JSON in ${ACTIVE_LANES_PATH}: ${e.message}`);
    process.exit(1);
}

const activeLanes = activeLanesData.activeLanes || [];
const referenceBranches = activeLanesData.referenceBranches || [];
check("active_lanes.json discovery found active lanes (>0)", activeLanes.length > 0, `Count: ${activeLanes.length}`);

if (activeMutant === "missing_active_lane") {
    activeLanes.push("task/lane-mutant-unlisted");
}

let missingActiveLanes = [];
for (const b of activeLanes) {
    const laneName = b.replace("task/", "");
    if (!hasToken(sec3Text, b) && !hasToken(sec3Text, laneName)) {
        missingActiveLanes.push(b);
    }
}
check(
    `All declared active task branches (${activeLanes.length}) are listed in Section 3 (In Review)`,
    missingActiveLanes.length === 0,
    missingActiveLanes.length ? `Missing from Section 3: ${missingActiveLanes.join(", ")}` : ""
);

let missingRefBranches = [];
for (const b of referenceBranches) {
    const laneName = b.replace("task/", "");
    if (!hasToken(sec3Text, b) && !hasToken(sec3Text, laneName)) {
        missingRefBranches.push(b);
    }
}
check(
    `All declared reference branches (${referenceBranches.length}) are listed in Section 3 (In Review)`,
    missingRefBranches.length === 0,
    missingRefBranches.length ? `Missing from Section 3: ${missingRefBranches.join(", ")}` : ""
);

// Check 4: Section 5 (Archived Systems) parse and validation
// Every row must have: Original Path | Archive Path | Ruling
const sec5Lines = sec5Text.split("\n");
let archivedRows = [];
let missingRulings = [];

for (const line of sec5Lines) {
    if (!line.includes("|")) continue;
    const parts = line.split("|").map(s => s.trim());
    // Format: | Original Path | Archive Path | Ruling |
    // When split by |, indices are: 0: "", 1: orig, 2: arch, 3: ruling, 4: ""
    if (parts.length >= 4 && !parts[1].startsWith("---") && !parts[1].toLowerCase().includes("original path")) {
        const orig = parts[1].replace(/`/g, "");
        const arch = parts[2].replace(/`/g, "");
        const ruling = parts[3].replace(/`/g, "");
        if (orig && arch) {
            if (!ruling || ruling.length === 0) {
                missingRulings.push(orig);
            }
            archivedRows.push({ orig, arch, ruling });
        }
    }
}

check("Section 5 (Archived Systems) discovery found archived rows (>0)", archivedRows.length > 0, `Count: ${archivedRows.length}`);
check(
    "All archived rows in Section 5 contain explicit rulings",
    missingRulings.length === 0,
    missingRulings.length ? `Missing ruling for: ${missingRulings.join(", ")}` : ""
);

if (activeMutant === "archived_file_exists") {
    archivedRows.push({ orig: "game/js/plugins/DEUS_Core.js", arch: "archive/plugins/DEUS_Core.js", ruling: "fake" });
}
if (activeMutant === "missing_in_archive") {
    archivedRows.push({ orig: "game/js/plugins/non_existent_fake_orig.js", arch: "archive/plugins/non_existent_fake_arch.js", ruling: "fake" });
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
    `All items declared in Section 5 (${archivedRows.length}) have been moved off their original paths`,
    existingArchived.length === 0,
    existingArchived.length ? `Still exists on disk: ${existingArchived.join(", ")}` : ""
);
check(
    `All archive destinations declared in Section 5 (${archivedRows.length}) exist on disk`,
    missingInArchive.length === 0,
    missingInArchive.length ? `Missing from archive on disk: ${missingInArchive.join(", ")}` : ""
);

// Check 5: Anti-Junk Guard with Section-Bound Authorization
// Every .js in game/js/plugins must be enabled OR explicitly named in Section 1, 2, or 5.
// Mentioning a file in comments or other sections does NOT authorize it!
const allPluginFiles = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith(".js"));
if (activeMutant === "unlisted_plugin_in_dir") {
    allPluginFiles.push("unauthorized_rogue_script.js");
}
if (activeMutant === "rogue_plugin_in_comment") {
    allPluginFiles.push("DEUS_RogueScript.js");
}

// Build set of authorized plugin names from valid sections:
// Section 1: enabled plugins, companions, and active live list
// Section 2: frozen plugins
// Section 5: archived plugins (orig path base names)
const authorizedPlugins = new Set(enabledPlugins);
for (const c of companionPlugins) authorizedPlugins.add(c);

// Extract all plugin names mentioned in tables or lists in Section 1, 2, and 5 (excluding HTML comments)
function extractAuthorizedTokens(sectionText) {
    // Strip HTML comments first so comments never authorize files
    const clean = sectionText.replace(/<!--[\s\S]*?-->/g, "");
    const tokens = new Set();
    const matches = clean.match(/[a-zA-Z0-9_-]+\.js\b|[A-Z][a-zA-Z0-9_]+/g) || [];
    for (const m of matches) {
        tokens.add(m.replace(/\.js$/, ""));
    }
    return tokens;
}

const sec1Tokens = extractAuthorizedTokens(sec1Text);
const sec2Tokens = extractAuthorizedTokens(sec2Text);
const sec5Tokens = extractAuthorizedTokens(sec5Text);

let unlistedFiles = [];
for (const f of allPluginFiles) {
    const baseName = f.replace(/\.js$/, "");
    const isEnabled = enabledPlugins.includes(baseName);
    const isAuthorizedInSec1 = sec1Tokens.has(baseName) || sec1Tokens.has(f);
    const isAuthorizedInSec2 = sec2Tokens.has(baseName) || sec2Tokens.has(f);
    const isAuthorizedInSec5 = sec5Tokens.has(baseName) || sec5Tokens.has(f);

    if (!isEnabled && !isAuthorizedInSec1 && !isAuthorizedInSec2 && !isAuthorizedInSec5) {
        unlistedFiles.push(f);
    }
}
check(
    "Anti-Junk Guard: No unlisted or unauthorized .js files in game/js/plugins (Section-bound, comments excluded)",
    unlistedFiles.length === 0,
    unlistedFiles.length ? `Unauthorized files: ${unlistedFiles.join(", ")}` : ""
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
