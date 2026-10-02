#!/usr/bin/env node
"use strict";

// OPS.PRUNE.06: repository/document checks, not runtime/playability certification.
// Default: validate this checkout, then spawn every negative proof (must exit 1).
// --mutant=<name>: corrupt only the reader's in-memory snapshot; never edit files.
// --check-only: baseline only, for an isolated review clone.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const BASE = "9271173f2b6a11bf624edfac54df28fe7471357b";
const INVENTORY = "tasks/OPS.PRUNE.06/lane-cu/preservation_inventory.json";
const RETARGETED_INVENTORY = "tasks/OPS.PRUNE.06/lane-cu/retargeted_files.json";
const LIVE = "Anim Camera Colonists ColonyOverseer Combat DayNight Doors Ecology Environment Factions Fire Floors History Interact Items Jobs Levels Look NaturalConnections Objects Ownership Select Sheet Speech Stance Talk Test Tiles TimeSpeed Walls Wildlife World WorldGen".split(" ");
const ARCHIVED = ["DEUS_PHYSICAL_WORLD_SIMULATION_SPEC.md", "DEUS_VerticalBiomes.md",
    ..."CultureGrowth Dialogue FarmView FireSafety Goals Gumps History_Profile Outposts ProfileTabs Roads Skills Tech AssetInventory".split(" ").map(n => `UF_${n}.md`)];
const PROTECTED = ["docs/systems/UF_Households.md",
    ..."CombatU7 DepthDemo LayerOverlays MintingEngine Taming TamedPartyCombat WorldItems".split(" ").map(n => `docs/systems/DEUS_${n}.md`),
    "game/js/plugins/UF_Households.js"];
const RECONCILED = ["docs/archive/systems/UF_Colonists.md", "docs/archive/systems/DEUS_Colonists_reflex_20260924.md"];
const MOVES = new Map([
    ...LIVE.map(n => [`docs/systems/UF_${n}.md`, `docs/systems/DEUS_${n}.md`]),
    ...ARCHIVED.map(n => [`docs/systems/${n}`, `docs/archive/systems/${n}`])
]);
const TARGETS = new Set([...MOVES.values(), ...RECONCILED, ...PROTECTED]);

const CORRECTED_CITATIONS = [
    { target: "DEUS_History.md", stale: "1161", valid: "1163", pattern: /currentYear|100 real hours/i, desc: "year takes over 100 real hours" },
    { target: "DEUS_History.md", stale: "102", valid: "104", pattern: /Historical subject identity/i, desc: "historical subject identity" },
    { target: "DEUS_History.md", stale: "106", valid: "108", pattern: /grave|ruin|burial/i, desc: "physical grave ownership gate" },
    { target: "DEUS_History.md", stale: "93", valid: "95", pattern: /graveyard|physical grave|not evidence/i, desc: "graveyard is not evidence of a physical grave" },
    { target: "DEUS_History.md", stale: "192-201", valid: "196-203", pattern: /Seed|Repeat|Simulation/i, desc: "demographic trajectories deterministic table" },
    { target: "DEUS_History.md", stale: "194-201", valid: "196-203", pattern: /Seed|Repeat|Simulation/i, desc: "demographic trajectories deterministic table" },
    { target: "DEUS_History.md", stale: "207", valid: "209", pattern: /Both repeats|matching state/i, desc: "repeat output checksums match" },
    { target: "DEUS_History.md", stale: "27", valid: "29", pattern: /Final integration artifact|Worker timings/i, desc: "age-500 simulation timing provenance" },
    { target: "DEUS_History.md", stale: "31-44", valid: "33-46", pattern: /Seed\s*\|\s*Age\s*\|\s*Living|Worker ms/i, desc: "integration matrix timing table" },
    { target: "DEUS_Ecology.md", stale: "8", valid: "10", pattern: /bucket|census|director/i, desc: "census and bucket director" },
    { target: "DEUS_Floors.md", stale: "44", valid: "50", pattern: /kindAt/i, desc: "kindAt definition" },
    { target: "DEUS_World.md", stale: "151", valid: "181", pattern: /selection_square/i, desc: "selection_square failure" }
];

const STALE_LOCATORS = new Map();
const SEMANTIC_LINE_CHECKS = new Map();
for (const c of CORRECTED_CITATIONS) {
    STALE_LOCATORS.set(`${c.target}:${c.stale}`, `stale line locator: ${c.target}:${c.stale} was corrected to ${c.valid} (${c.desc})`);
    const validStart = parseInt(c.valid.split("-")[0], 10);
    SEMANTIC_LINE_CHECKS.set(`${c.target}:${c.valid}`, { pattern: c.pattern, desc: c.desc });
    SEMANTIC_LINE_CHECKS.set(`${c.target}:${validStart}`, { pattern: c.pattern, desc: c.desc });
}

const MUTANTS = {
    missing_live: { file: "docs/systems/DEUS_World.md", value: () => null, error: "missing live:" },
    missing_archive: { file: "docs/archive/systems/UF_Roads.md", value: () => null, error: "missing preserved:" },
    archive_content: { file: "docs/archive/systems/UF_Roads.md", value: s => s + "\ncorrupted archive\n", error: "content changed:" },
    missing_households: { file: PROTECTED[0], value: () => null, error: "missing preserved:" },
    protected_content: { file: PROTECTED[0], value: s => s + "\nchanged\n", error: "content changed:" },
    missing_l4: { file: "docs/systems/DEUS_CombatU7.md", value: () => null, error: "missing preserved:" },
    corrupt_path: { file: "docs/systems/README.md", value: s => s.replace("(DEUS_World.md)", "(DEUS_Wor1d.md)"), error: "broken Markdown link:" },
    stale_path: { file: "docs/systems/README.md", value: s => s + "\n[world](UF_World.md)\n", error: "stale documentation path:" },
    external_link: { file: "docs/ENGINE_RULES.md", value: s => s + "\n[world](systems/DEUS_Wor1d.md)\n", error: "broken Markdown link:" },
    reference_link: { file: "docs/ENGINE_RULES.md", value: s => s + "\n[world][l6]\n[l6]: systems/DEUS_Wor1d.md\n", error: "broken Markdown link:" },
    corrupt_anchor: { file: "docs/systems/README.md", value: s => s.replace("(DEUS_World.md)", "(DEUS_World.md#missing-l6-heading)"), error: "broken Markdown anchor:" },
    lost_live_text: { file: "docs/systems/DEUS_World.md", value: () => "# DEUS_World\n", error: "live text lost:" },
    lost_colonists_reflex: { file: "docs/systems/DEUS_Colonists.md", value: s => s.replace(/safeCellNear/g, "lostReflex"), error: "Colonists reflex text lost:" },
    missing_inventory_row: { file: INVENTORY, value: s => { const x = JSON.parse(s); x.live.pop(); return JSON.stringify(x); }, error: "live inventory mismatch" },
    engine_rules_typo: { file: "docs/ENGINE_RULES.md", value: s => s.replace("DEUS_World.md", "DEUS_Wor1d.md"), error: "broken-reference diagnostic:" },
    unscanned_inventory_file: { file: "docs/ENGINE_RULES.md", value: s => s, error: "unvalidated inventoried file:" },
    stale_history_1161: { file: "docs/adr/ADR-003_sim_render_split_and_lod.md", value: s => s.replace("DEUS_History.md:1163", "DEUS_History.md:1161"), error: "stale-reference diagnostic:" },
    stale_history_192: { file: "docs/adr/ADR-003_sim_render_split_and_lod.md", value: s => s.replace("DEUS_History.md:196-203", "DEUS_History.md:192-201"), error: "stale-reference diagnostic:" },
    stale_shorthand_3144: { file: "docs/adr/ADR-003_sim_render_split_and_lod.md", value: s => s.replace("`:33-46`", "`:31-44`"), error: "stale-reference diagnostic:" },
    stale_shorthand_108: { file: "docs/adr/ADR-003_sim_render_split_and_lod.md", value: s => s.replace("`:108`", "`:106`"), error: "stale-reference diagnostic:" },
    stale_shorthand_209: { file: "docs/adr/ADR-003_sim_render_split_and_lod.md", value: s => s.replace("`:209`", "`:207`"), error: "stale-reference diagnostic:" },
    stale_history_locator: { file: "docs/adr/ADR-003_sim_render_split_and_lod.md", value: s => s.replace("DEUS_History.md:108", "DEUS_History.md:106"), error: "stale-reference diagnostic:" },
    stale_ecology_locator: { file: "docs/audits/LIVING_WORLD_GAP_AUDIT.md", value: s => s.replace("DEUS_Ecology.md:10", "DEUS_Ecology.md:8"), error: "stale-reference diagnostic:" },
    stale_floors_locator: { file: "docs/design/ECOLOGY.md", value: s => s.replace("DEUS_Floors.md:50", "DEUS_Floors.md:44"), error: "stale-reference diagnostic:" }
};
const args = process.argv.slice(2);
const mutantArg = args.find(a => a.startsWith("--mutant="));
const mutant = mutantArg && mutantArg.slice(9);
if (args.some(a => a !== "--check-only" && a !== "--list-mutants" && !a.startsWith("--mutant=")) || (mutantArg && !MUTANTS[mutant])) {
    console.error("FAIL unknown argument or mutant");
    process.exit(1);
}
if (args.includes("--list-mutants")) {
    console.log(Object.keys(MUTANTS).join("\n"));
    process.exit(0);
}
const normalize = s => s.replace(/\r\n/g, "\n");
const hash = s => crypto.createHash("sha256").update(normalize(s)).digest("hex");
const cache = new Map();
function read(p) {
    if (!cache.has(p)) {
        const disk = path.join(ROOT, p);
        let s = fs.existsSync(disk) && fs.statSync(disk).isFile() ? fs.readFileSync(disk, "utf8") : null;
        if (mutant && MUTANTS[mutant].file === p) s = MUTANTS[mutant].value(s);
        cache.set(p, s);
    }
    return cache.get(p);
}
const git = a => execFileSync("git", a, { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
let checks = 0;
const errors = [];
function check(ok, message) { checks++; if (!ok) errors.push(message); }
function sameList(actual, expected, label) {
    check(JSON.stringify(actual.slice().sort()) === JSON.stringify(expected.slice().sort()), `${label} inventory mismatch`);
}
// Compare retained prose modulo names/paths changed by this documentation task.
// Archive hashes and the link checks separately protect the path-sensitive data.
function prose(s) {
    return normalize(s).replace(/(?:\.\.\/)*(?:docs\/)?(?:archive\/)?systems\//g, "")
        .replace(/\bUF_/g, "DEUS_").replace(/\bUF\./g, "DEUS.").trim();
}
function preservedLines(source, target, label, skip = 1) {
    const actual = prose(target || "");
    const lost = normalize(source).split("\n").slice(skip).filter(l => l.trim() && !actual.includes(prose(l)));
    check(lost.length === 0, `${label}: ${lost.length} lines; first: ${(lost[0] || "").slice(0, 180)}`);
}
function resolveLink(from, url) {
    let decoded;
    try { decoded = decodeURIComponent(url); } catch { return { target: "INVALID_ENCODING", anchor: "", line: null, endLine: null, rawLine: null }; }
    if (/^(?:https?:|mailto:|data:)/i.test(decoded)) return null;
    let [raw, hashPart = ""] = decoded.split("#");
    const clean = raw.split("?")[0].replace(/\\/g, "/");
    let line = null;
    let endLine = null;
    let rawLine = null;
    const lineMatch = clean.match(/:(\d+(?:-\d+)?)$/);
    let pathOnly = clean;
    if (lineMatch) {
        rawLine = lineMatch[1];
        const parts = rawLine.split("-");
        line = parseInt(parts[0], 10);
        endLine = parts.length > 1 ? parseInt(parts[1], 10) : line;
        pathOnly = clean.slice(0, lineMatch.index);
    }
    let target;
    if (!pathOnly) target = from;
    else if (pathOnly.includes("/docs/")) target = "docs/" + pathOnly.split("/docs/").pop();
    else if (pathOnly.startsWith("docs/")) target = pathOnly;
    else target = path.posix.normalize(path.posix.join(path.posix.dirname(from), pathOnly));
    return { target, anchor: hashPart, line, endLine, rawLine };
}
function anchors(text) {
    const counts = new Map();
    return normalize(text).split("\n").filter(l => /^#{1,6}\s/.test(l)).map(l => {
        const slug = l.replace(/^#{1,6}\s+/, "").replace(/\s+#+\s*$/, "").toLowerCase()
            .replace(/[^\p{L}\p{N}_\-\s]/gu, "").replace(/\s/g, "-");
        const n = counts.get(slug) || 0; counts.set(slug, n + 1);
        return slug + (n ? `-${n}` : "");
    });
}
function validate() {
    const inventory = JSON.parse(read(INVENTORY));
    check(inventory.baselineCommit === BASE, "baseline commit mismatch");
    sameList(inventory.live.map(r => `${r.source}->${r.target}`), LIVE.map(n => `docs/systems/UF_${n}.md->docs/systems/DEUS_${n}.md`), "live");
    sameList(inventory.archived.map(r => `${r.source}->${r.target}`), ARCHIVED.map(n => `docs/systems/${n}->docs/archive/systems/${n}`), "archive");
    sameList(inventory.protected.map(r => r.path), PROTECTED, "protected");
    sameList(inventory.reconciliation.map(r => r.target), RECONCILED, "reconciliation");

    const retargetedFiles = JSON.parse(read(RETARGETED_INVENTORY));
    check(Array.isArray(retargetedFiles) && retargetedFiles.length > 0, "retargeted files inventory missing or empty");

    for (const n of LIVE) {
        const target = `docs/systems/DEUS_${n}.md`, source = `docs/systems/UF_${n}.md`;
        const s = read(target);
        check(s !== null, `missing live: ${target}`);
        check(s !== null && new RegExp(`^# DEUS_${n}\\b`).test(s), `canonical heading missing: ${target}`);
        check(read(source) === null, `legacy live path remains: ${source}`);
        preservedLines(git(["show", `${BASE}:${source}`]), s, `live text lost: ${target}`);
    }
    for (const source of MOVES.keys()) check(read(source) === null, `source not moved: ${source}`);
    for (const r of [...inventory.archived, ...inventory.reconciliation, ...inventory.protected]) {
        const p = r.target || r.path, s = read(p);
        check(s !== null, `missing preserved: ${p}`);
        if (s !== null) check(hash(s) === r.sha256, `content changed: ${p}`);
        check(hash(git(["show", `${BASE}:${r.source || r.path}`])) === r.sha256, `baseline hash mismatch: ${p}`);
    }
    // The newer introductory paragraph was reconciled; all its detailed sections remain.
    preservedLines(git(["show", `${BASE}:docs/systems/DEUS_Colonists.md`]), read("docs/systems/DEUS_Colonists.md"), "Colonists reflex text lost", 4);
    const files = [...new Set(git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"]).split("\0").filter(p => p.endsWith(".md")))];
    let documents = 0, links = 0;
    const scannedFiles = new Set();
    for (const p of files) {
        // Immutable source/evidence records retain historical paths, per preservation scope.
        if (/^(?:docs\/archive\/|archive\/|tasks\/)/.test(p) || PROTECTED.includes(p)) continue;
        if (mutant === "unscanned_inventory_file" && p === "docs/ENGINE_RULES.md") continue;
        const s = read(p); if (s === null) continue;
        documents++;
        scannedFiles.add(p);
        // Code-spanned paths are the repository's most common documentation references.
        for (const old of MOVES.keys()) check(!s.includes(old), `stale documentation path: ${p} -> ${old}`);
        const withoutCode = s.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, "");
        const urls = [
            ...Array.from(withoutCode.matchAll(/\]\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)/g), m => m[1]),
            ...Array.from(withoutCode.matchAll(/^\s*\[[^\]]+\]:\s*<?([^\s>]+)>?/gm), m => m[1])
        ];
        // Also extract code-spanned and plain path references
        const docRefRegex = /(?:[`(\[<]?)(?:(?:\.\.\/)*(?:docs\/)?(?:archive\/)?systems\/([A-Za-z0-9_.-]+\.md)(?::\d+(?:-\d+)?)?(?:#[a-zA-Z0-9_-]+)?)(?:[`\)\]>]?)/g;
        let refMatch;
        while ((refMatch = docRefRegex.exec(withoutCode)) !== null) {
            urls.push(refMatch[0].replace(/^[`(\[<]/, '').replace(/[`\)\]>]$/, ''));
        }
        // Also extract same-line shorthand citations (e.g. `docs/systems/DEUS_History.md:29`, `:33-46`)
        for (const line of withoutCode.split("\n")) {
            const fileMatches = [...line.matchAll(/(?:(?:\.\.\/)*(?:docs\/)?(?:[A-Za-z0-9_.-]+\/)*([A-Za-z0-9_.-]+\.[A-Za-z0-9]+))(?::\d+(?:-\d+)?)?/g)];
            const shMatches = [...line.matchAll(/`:(?<spec>\d+(?:-\d+)?)`/g)];
            if (shMatches.length > 0 && fileMatches.length > 0) {
                for (const sh of shMatches) {
                    const prev = fileMatches.filter(m => m.index < sh.index);
                    if (prev.length > 0) {
                        const last = prev[prev.length - 1];
                        const fn = last[1];
                        if (fn.endsWith('.md')) {
                            const fullPath = last[0].replace(/:\d+(?:-\d+)?$/, '');
                            urls.push(`${fullPath}:${sh.groups.spec}`);
                        }
                    }
                }
            }
        }

        const uniqueUrls = [...new Set(urls)];
        for (const url of uniqueUrls) {
            const link = resolveLink(p, url); if (!link) continue;
            const related = /^(?:docs\/systems\/|docs\/archive\/systems\/)/.test(link.target) || TARGETS.has(link.target) || p.startsWith("docs/systems/");
            if (!related) continue; // Not a general-purpose audit of unrelated historical links.
            const baseName = path.basename(link.target);
            const isRetargeted = baseName.startsWith("DEUS_") ||
                link.target.includes("archive/systems") ||
                MOVES.has(link.target) ||
                TARGETS.has(link.target);
            if (!isRetargeted) continue;

            links++;
            check(!MOVES.has(link.target), `stale documentation path: ${p} -> ${url}`);
            const destination = read(link.target);
            check(destination !== null, `broken-reference diagnostic: broken Markdown link: ${p} -> ${url}`);
            if (destination !== null) {
                if (link.anchor && link.target.endsWith(".md")) {
                    check(anchors(destination).includes(link.anchor), `broken Markdown anchor: ${p} -> ${url}`);
                }
                if (link.line !== null) {
                    const targetLines = normalize(destination).split("\n");
                    check(link.line >= 1 && link.line <= targetLines.length, `broken-reference diagnostic: line out of bounds: ${p} -> ${url} (max ${targetLines.length})`);
                    if (link.endLine !== null) {
                        check(link.endLine >= link.line && link.endLine <= targetLines.length, `broken-reference diagnostic: range end out of bounds: ${p} -> ${url} (max ${targetLines.length})`);
                    }
                    const exactKey = `${baseName}:${link.rawLine}`;
                    const lineKey = `${baseName}:${link.line}`;
                    const staleMsg = STALE_LOCATORS.get(exactKey) || STALE_LOCATORS.get(lineKey);
                    if (staleMsg) {
                        check(false, `stale-reference diagnostic: stale line locator: ${p} -> ${url} (${staleMsg})`);
                    }
                    const checkSpec = SEMANTIC_LINE_CHECKS.get(exactKey) || SEMANTIC_LINE_CHECKS.get(lineKey);
                    if (checkSpec) {
                        const targetSlice = targetLines.slice(link.line - 1, link.endLine || link.line).join("\n");
                        check(checkSpec.pattern.test(targetSlice), `stale-reference diagnostic: stale line locator content: ${p} -> ${url} (expected ${checkSpec.desc})`);
                    }
                }
            }
        }
    }

    // GAP A: Enforce coverage of every inventoried file
    for (const rf of retargetedFiles) {
        check(read(rf) !== null, `missing inventoried file: ${rf}`);
        check(scannedFiles.has(rf), `unvalidated inventoried file: ${rf}`);
    }

    console.log(`Inventory: 33 live, 15 archived, 9 protected docs + Households plugin, 2 Colonists source snapshots, ${retargetedFiles.length} retargeted scope files (100% coverage enforced)`);
    console.log(`Links: ${documents} mutable Markdown documents scanned; ${links} relevant destinations checked`);
}
try { validate(); } catch (e) { errors.push(`validator exception: ${e.message}`); }
if (!mutant && !args.includes("--check-only") && !errors.length) {
    for (const [name, spec] of Object.entries(MUTANTS)) {
        const child = spawnSync(process.execPath, [__filename, `--mutant=${name}`], { cwd: ROOT, encoding: "utf8", timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
        const output = (child.stdout || "") + (child.stderr || "");
        const ok = !child.error && child.status === 1 && output.includes(spec.error);
        check(ok, `mutant ${name} did not fail for ${spec.error}; exit=${child.status}; ${child.error || output}`);
        console.log(`${ok ? "PASS" : "FAIL"} mutant ${name}: exit ${child.status}; expected diagnostic ${spec.error}`);
    }
}
for (const error of errors) console.error(`FAIL ${error}`);
console.log(`RESULT: ${checks - errors.length} passed, ${errors.length} failed${mutant ? ` (mutant ${mutant})` : ""}`);
process.exitCode = errors.length ? 1 : 0;
