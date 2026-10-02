#!/usr/bin/env node
"use strict";

// OPS.PRUNE.02 / MSG-PRUNE-PM-059. Read-only repository gate.
// Mutants alter an in-memory inventory, never the checkout or another lane's files.
// --mutant NAME exits 1 for a detected violation; --mutants requires a clean
// baseline and checks child exit codes AND the intended failure diagnostics.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const LIVE = "game/js/plugins/";
const ARCHIVE = "archive/" + LIVE;
const STEMS = [
    "Anim", "Camera", "Colonists", "ColonyOverseer", "Combat", "Core", "DayNight",
    "Doors", "Ecology", "Environment", "FactionMenus", "Factions", "Fire", "Floors",
    "Fog", "Generator", "History", "Interact", "Items", "Jobs", "Levels", "Look",
    "Movement8D", "NaturalConnections", "Objects", "Ownership",
    "Perspective25D", "Select", "Sheet", "Speech", "Stance", "Talk", "Test", "Tiles",
    "TimeSpeed", "Visuals", "Walls", "Wildlife", "World", "WorldGen"
];
const SHIMS = STEMS.map(stem => `UF_${stem}.js`);
const PROTECTED = ["UF_Households.js", "UF_Time.js"];
// Owner confirmation, 2026-09-30 (MSG-PRUNE-PM-059): these five canonical
// companion loaders belong to L9; L2 archives the 41 forwarder shims only.
const CANONICAL_COMPANION_LOADERS = new Set([
    "game/js/plugins/DEUS_Camera.js",
    "game/js/plugins/DEUS_ColonyOverseer.js",
    "game/js/plugins/DEUS_Core.js",
    "game/js/plugins/DEUS_History.js",
    "game/js/plugins/DEUS_Items.js"
]);
const MUTANTS = ["moved-protected", "shim-survived", "broken-retarget"];
const LOAD_SCRIPT = /\bPluginManager\s*(?:\.\s*loadScript|\[\s*["']loadScript["']\s*\])\s*\(/;
const CODE_EXT = /\.(?:js|cjs|mjs|ts|py|ps1|sh|bat|cmd)$/i;

function readTree(dir, accept) {
    const files = new Map();
    function visit(relative) {
        for (const entry of fs.readdirSync(path.join(ROOT, relative), { withFileTypes: true })) {
            const file = relative + "/" + entry.name;
            if (entry.isDirectory()) visit(file);
            else if (entry.isFile() && accept(file)) files.set(file, fs.readFileSync(path.join(ROOT, file), "utf8"));
        }
    }
    visit(dir);
    return files;
}

function inventory() {
    return {
        live: readTree(LIVE.slice(0, -1), file => file.endsWith(".js")),
        archived: readTree(ARCHIVE.slice(0, -1), file => file.endsWith(".js")),
        tools: readTree("tools", file => CODE_EXT.test(file))
    };
}

function references(source) {
    const hits = [];
    for (const [i, line] of source.split(/\r?\n/).entries()) {
        if (/^\s*(?:\/\/|\*|#)/.test(line)) continue;
        // Literal paths cover require/import, VM source reads, path.join parts,
        // loader arrays and injected snapshot scripts. No code is executed.
        for (const match of line.matchAll(/(["'`])([^"'`\r\n]*)\1/g)) {
            const value = match[2].replace(/\\/g, "/");
            const basename = value.slice(value.lastIndexOf("/") + 1);
            // Bare plugin parameter names and UF namespace keys are retained.
            // Extensionless module specifiers and local source-loader arguments
            // are paths; generic bare strings are not imports.
            if (!basename.endsWith(".js") && !/(?:(?:require(?:\.resolve)?|import|read|file|readPlugin|loadPlugin)\(\s*|\b(?:from|import)\s+|\bname\s*:\s*|["']name["']\s*:\s*)$/.test(line.slice(0, match.index))) continue;
            const name = basename.endsWith(".js") ? basename : basename + ".js";
            if (SHIMS.includes(name)) hits.push({ line: i + 1, text: line.trim(), value, name });
        }
    }
    return hits;
}

function historicalRecord(file, hit) {
    // These paths name pre-rename implementations, not archived forwarders.
    if (file === "tools/fix_colonists_checks.js") {
        return hit.text === 'fixFile(path.join(__dirname, "..", "archive", "plugins_uf_pre_rename", "' + "UF_Colonists" + '.js"));';
    }
    if (file === "tools/fixtures/UF_ZZ_OldSaveFixture.js") {
        return ["Factions", "History"].some(stem => hit.text ===
            `"js/plugins/UF_${stem}.js": md5(path.join(base, "js", "plugins", "UF_${stem}.js")),`);
    }
    return false;
}

function check(state) {
    const failures = [], deferred = [];
    const fail = (code, detail) => failures.push(`FAIL ${code}: ${detail}`);
    for (const [file, source] of state.live) {
        if (CANONICAL_COMPANION_LOADERS.has(file)) continue;
        if (LOAD_SCRIPT.test(source)) fail("loadscript-call", file);
    }
    for (const name of SHIMS) {
        if (!state.archived.has(ARCHIVE + name)) fail("missing-archive", name);
        if (state.live.has(LIVE + name)) fail("shim-survived", name);
    }
    for (const name of PROTECTED) {
        if (!state.live.has(LIVE + name)) fail("moved-protected", name);
    }
    for (const [file, source] of state.tools) {
        for (const hit of references(source)) {
            if (historicalRecord(file, hit)) continue;
            // Explicit Owner exclusion, owned by L3/lane-cp. Match only this
            // original require, not the entire file or other legacy references.
            if (file === "tools/test_time_domains_proof.js" &&
                hit.text === 'require("../game/js/plugins/' + "UF_World" + '.js");') {
                deferred.push(`${file}:${hit.line} ${hit.value} (L3/lane-cp)`);
                continue;
            }
            fail("broken-retarget", `${file}:${hit.line} ${hit.value}`);
        }
    }
    return { failures, deferred };
}

function inject(state, name, protectedName) {
    if (name === "moved-protected") {
        state.archived.set(ARCHIVE + protectedName, state.live.get(LIVE + protectedName));
        state.live.delete(LIVE + protectedName);
    } else if (name === "shim-survived") {
        // Non-UF name also proves the gate scans all plugin files.
        state.live.set(LIVE + "TEST_SurvivingForwarder.js", state.archived.get(ARCHIVE + SHIMS[0]));
    } else if (name === "broken-retarget") {
        state.tools.set("tools/TEST_BrokenRetarget.js", `require("../${ARCHIVE}${SHIMS[0]}");`);
    }
}

function printResult(result) {
    for (const item of result.deferred) console.log("DEFERRED " + item);
    for (const item of result.failures) console.error(item);
    console.log(`RESULT: ${result.failures.length === 0 ? "PASS" : "FAIL"}; ${SHIMS.length} required archives; ${PROTECTED.length} protected plugins; ${result.failures.length} violations; ${result.deferred.length} L3 deferrals`);
    return result.failures.length ? 1 : 0;
}

function runMutants() {
    const baseline = check(inventory());
    const baselineExit = printResult(baseline);
    const cases = [
        { name: "moved-protected", protectedName: PROTECTED[0], expected: "FAIL moved-protected: " + PROTECTED[0] },
        { name: "moved-protected", protectedName: PROTECTED[1], expected: "FAIL moved-protected: " + PROTECTED[1] },
        { name: "shim-survived", expected: "FAIL loadscript-call: " + LIVE + "TEST_SurvivingForwarder.js" },
        { name: "broken-retarget", expected: "FAIL broken-retarget: tools/TEST_BrokenRetarget.js:" }
    ];
    let killed = 0;
    for (const test of cases) {
        const args = [__filename, "--mutant", test.name];
        if (test.protectedName) args.push("--protected", test.protectedName);
        const child = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", timeout: 60000 });
        const output = (child.stdout || "") + (child.stderr || "");
        const ok = !child.error && !child.signal && child.status === 1 && output.includes(test.expected);
        if (ok) killed++;
        console.log(`${ok ? "KILLED" : "SURVIVED"} ${test.name}${test.protectedName ? " / " + test.protectedName : ""} EXIT=${child.status}`);
        if (!ok) console.error(child.error || output);
    }
    console.log(`MUTANTS: ${killed}/${cases.length} scenarios killed (${MUTANTS.length} names)`);
    return baselineExit || (killed === cases.length ? 0 : 1);
}

function main(args) {
    if (args.length === 1 && args[0] === "--mutants") return runMutants();
    let mutant = null, protectedName = PROTECTED[0];
    if (args.length) {
        if ((args.length !== 2 && args.length !== 4) || args[0] !== "--mutant" || !MUTANTS.includes(args[1])) {
            throw Error("Usage: node tools/test_no_loadscript_shims.js [--mutants | --mutant " + MUTANTS.join("|") + "]");
        }
        mutant = args[1];
        if (args.length === 4) {
            if (mutant !== "moved-protected" || args[2] !== "--protected" || !PROTECTED.includes(args[3])) throw Error("Invalid protected mutant target");
            protectedName = args[3];
        }
    }
    const state = inventory();
    if (mutant) inject(state, mutant, protectedName);
    return printResult(check(state));
}

if (require.main === module) {
    try { process.exitCode = main(process.argv.slice(2)); }
    catch (error) { console.error("ERROR: " + error.message); process.exitCode = 2; }
}

module.exports = { check, inventory, references };
