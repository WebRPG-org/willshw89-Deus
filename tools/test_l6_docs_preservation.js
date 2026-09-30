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
const LIVE = "Anim Camera Colonists ColonyOverseer Combat DayNight Doors Ecology Environment Factions Fire Floors History Interact Items Jobs Levels Look NaturalConnections Objects Ownership Select Sheet Speech Stance Talk Test Tiles TimeSpeed Walls Wildlife World WorldGen".split(" ");
const ARCHIVED = ["DEUS_PHYSICAL_WORLD_SIMULATION_SPEC.md", "DEUS_VerticalBiomes.md",
    ..."CultureGrowth Dialogue FarmView FireSafety Goals Gumps History_Profile Outposts ProfileTabs Roads Skills Tech AssetInventory".split(" ").map(n => `UF_${n}.md`)];
const PROTECTED = ["docs/systems/UF_Households.md",
    ..."CombatU7 DepthDemo LayerOverlays MintingEngine Taming TamedPartyCombat WorldItems Minimap".split(" ").map(n => `docs/systems/DEUS_${n}.md`),
    "game/js/plugins/UF_Households.js"];
const RECONCILED = ["docs/archive/systems/UF_Colonists.md", "docs/archive/systems/DEUS_Colonists_reflex_20260924.md"];
const MOVES = new Map([
    ...LIVE.map(n => [`docs/systems/UF_${n}.md`, `docs/systems/DEUS_${n}.md`]),
    ...ARCHIVED.map(n => [`docs/systems/${n}`, `docs/archive/systems/${n}`])
]);
const TARGETS = new Set([...MOVES.values(), ...RECONCILED, ...PROTECTED]);
const MUTANTS = {
    missing_live: { file: "docs/systems/DEUS_World.md", value: () => null, error: "missing live:" },
    missing_archive: { file: "docs/archive/systems/UF_Roads.md", value: () => null, error: "missing preserved:" },
    archive_content: { file: "docs/archive/systems/UF_Roads.md", value: s => s + "\ncorrupted archive\n", error: "content changed:" },
    missing_households: { file: PROTECTED[0], value: () => null, error: "missing preserved:" },
    protected_content: { file: PROTECTED[0], value: s => s + "\nchanged\n", error: "content changed:" },
    missing_l4: { file: "docs/systems/DEUS_Minimap.md", value: () => null, error: "missing preserved:" },
    corrupt_path: { file: "docs/systems/README.md", value: s => s.replace("(DEUS_World.md)", "(DEUS_Wor1d.md)"), error: "broken Markdown link:" },
    stale_path: { file: "docs/systems/README.md", value: s => s + "\n[world](UF_World.md)\n", error: "stale documentation path:" },
    external_link: { file: "docs/ENGINE_RULES.md", value: s => s + "\n[world](systems/DEUS_Wor1d.md)\n", error: "broken Markdown link:" },
    reference_link: { file: "docs/ENGINE_RULES.md", value: s => s + "\n[world][l6]\n[l6]: systems/DEUS_Wor1d.md\n", error: "broken Markdown link:" },
    corrupt_anchor: { file: "docs/systems/README.md", value: s => s.replace("(DEUS_World.md)", "(DEUS_World.md#missing-l6-heading)"), error: "broken Markdown anchor:" },
    lost_live_text: { file: "docs/systems/DEUS_World.md", value: () => "# DEUS_World\n", error: "live text lost:" },
    lost_colonists_reflex: { file: "docs/systems/DEUS_Colonists.md", value: s => s.replace(/safeCellNear/g, "lostReflex"), error: "Colonists reflex text lost:" },
    missing_inventory_row: { file: INVENTORY, value: s => { const x = JSON.parse(s); x.live.pop(); return JSON.stringify(x); }, error: "live inventory mismatch" }
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
    try { decoded = decodeURIComponent(url); } catch { return { target: "INVALID_ENCODING", anchor: "" }; }
    if (/^(?:https?:|mailto:|data:)/i.test(decoded)) return null;
    const [raw, anchor = ""] = decoded.split("#");
    const clean = raw.split("?")[0].replace(/\\/g, "/");
    let target;
    if (!clean) target = from;
    else if (clean.includes("/docs/")) target = "docs/" + clean.split("/docs/").pop();
    else if (clean.startsWith("docs/")) target = clean;
    else target = path.posix.normalize(path.posix.join(path.posix.dirname(from), clean));
    return { target, anchor };
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
    for (const p of files) {
        // Immutable source/evidence records retain historical paths, per preservation scope.
        if (/^(?:docs\/archive\/|archive\/|tasks\/)/.test(p) || PROTECTED.includes(p)) continue;
        const s = read(p); if (s === null) continue;
        documents++;
        // Code-spanned paths are the repository's most common documentation references.
        for (const old of MOVES.keys()) check(!s.includes(old), `stale documentation path: ${p} -> ${old}`);
        const withoutCode = s.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, "");
        const urls = [
            ...Array.from(withoutCode.matchAll(/\]\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)/g), m => m[1]),
            ...Array.from(withoutCode.matchAll(/^\s*\[[^\]]+\]:\s*<?([^\s>]+)>?/gm), m => m[1])
        ];
        for (const url of urls) {
            const link = resolveLink(p, url); if (!link) continue;
            const related = /^(?:docs\/systems\/|docs\/archive\/systems\/)/.test(link.target) || TARGETS.has(link.target) || p.startsWith("docs/systems/");
            if (!related) continue; // Not a general-purpose audit of unrelated historical links.
            links++;
            check(!MOVES.has(link.target), `stale documentation path: ${p} -> ${url}`);
            const destination = read(link.target);
            check(destination !== null, `broken Markdown link: ${p} -> ${url}`);
            if (destination !== null && link.anchor && link.target.endsWith(".md")) {
                check(anchors(destination).includes(link.anchor), `broken Markdown anchor: ${p} -> ${url}`);
            }
        }
    }
    console.log(`Inventory: 33 live, 15 archived, 9 protected docs + Households plugin, 2 Colonists source snapshots`);
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
