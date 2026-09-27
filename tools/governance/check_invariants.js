#!/usr/bin/env node
"use strict";

/**
 * tools/governance/check_invariants.js
 *
 * OPS.70.01. One row per invariant in docs/INVARIANT_REGISTRY.md.
 *
 * Status
 *   PASS                        the mechanical check holds on --root
 *   FAIL                        the mechanical check does not hold
 *   NOT-MECHANICAL              a process, review, or visual rule with no closed tree check
 *   SUPERSEDED-PENDING-OWNER    the registry row conflicts with a later Owner decision;
 *                               the checker does not decide which side binds
 *
 * Exit 0 when every active row (PASS or FAIL) is PASS and the catalogue matches the
 * registry. Skipped rows are printed and do not fail the run. Exit 1 on a FAIL row.
 * Exit 2 on usage, a missing root, or an unreadable registry.
 *
 * The registry defaults to docs/INVARIANT_REGISTRY.md beside this script, not beside
 * --root. A fixture root is a partial tree; it does not carry the registry.
 *
 *   node tools/governance/check_invariants.js [--root dir] [--registry file] [--only INV-ID] [--json]
 *
 * No new dependencies. Cited suites run with a timeout under --root.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const CITED_TIMEOUT_MS = 360000;
const TEXT_EXT = new Set([".js", ".mjs", ".cjs", ".json", ".html", ".css", ".txt", ".md", ".svg"]);
const ENGINE_REQUIRED = [
    "game/js/main.js",
    "game/js/rmmz_core.js",
    "game/js/rmmz_managers.js",
    "game/js/rmmz_objects.js",
    "game/js/rmmz_scenes.js",
    "game/js/rmmz_sprites.js",
    "game/js/rmmz_windows.js",
    "game/js/libs/pixi.js",
    "game/js/libs/pako.min.js",
    "game/js/libs/localforage.min.js",
    "game/js/libs/effekseer.min.js",
    "game/js/libs/vorbisdecoder.js"
];
const ENGINE_MARKERS = ["DEUS_", "window.UF", "UF."];
const AIR_STOP = "if (rdM[rdO + s] !== M_AIR) return h";

function oneLine(s) {
    return String(s).replace(/\s+/g, " ").trim();
}

function okResult(detail) {
    return { ok: true, detail: oneLine(detail) };
}

function badResult(detail) {
    const d = oneLine(detail);
    const tagged = d.startsWith("defect:") || d.startsWith("absent:") ? d : "defect: " + d;
    return { ok: false, detail: tagged };
}

function isFile(root, rel) {
    try {
        return fs.statSync(path.join(root, ...rel.split("/"))).isFile();
    } catch (e) {
        return false;
    }
}

function readRel(root, rel) {
    if (!isFile(root, rel)) return null;
    return fs.readFileSync(path.join(root, ...rel.split("/")), "utf8");
}

function load(root, rel) {
    const text = readRel(root, rel);
    if (text === null) return badResult("absent: " + rel);
    return { ok: true, text };
}

function missingNeedle(src, pairs) {
    let at = 0;
    for (const [label, needle] of pairs) {
        const i = src.indexOf(needle, at);
        if (i < 0) return label;
        at = i + needle.length;
    }
    return null;
}

function sliceBetween(src, start, end) {
    const a = src.indexOf(start);
    if (a < 0) return null;
    const b = src.indexOf(end, a + start.length);
    if (b < 0) return null;
    return src.slice(a, b);
}

function extractBraced(src, from) {
    const brace = src.indexOf("{", from);
    if (brace < 0) return null;
    let depth = 0;
    for (let i = brace; i < src.length; i++) {
        const c = src[i];
        if (c === "{") depth++;
        else if (c === "}") {
            depth--;
            if (depth === 0) return src.slice(brace + 1, i);
        }
    }
    return null;
}

function extractFunction(src, name) {
    const m = new RegExp("function\\s+" + name + "\\s*\\(").exec(src);
    if (!m) return null;
    return extractBraced(src, m.index);
}

function extractMethod(src, anchor, signature) {
    const c = src.indexOf(anchor);
    if (c < 0) return null;
    const s = src.indexOf(signature, c);
    if (s < 0) return null;
    return extractBraced(src, s);
}

function stripLineComments(src) {
    return src.replace(/\/\/[^\n]*/g, "");
}

function posix(root, file) {
    return path.relative(root, file).split(path.sep).join("/");
}

function walk(dir, out) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        let st;
        try {
            st = fs.statSync(p);
        } catch (e) {
            continue;
        }
        if (st.isDirectory()) walk(p, out);
        else if (st.isFile()) out.push(p);
    }
}

function engineFiles(root) {
    const out = [];
    const js = path.join(root, "game", "js");
    if (!fs.existsSync(js)) return out;
    for (const name of fs.readdirSync(js)) {
        if (name === "main.js" || /^rmmz_.*\.js$/i.test(name)) out.push(path.join(js, name));
    }
    walk(path.join(js, "libs"), out);
    return out;
}

function checkCore01(root) {
    const absent = ENGINE_REQUIRED.filter(rel => !isFile(root, rel));
    if (absent.length) return badResult("absent: " + absent.join(", "));
    const hits = [];
    for (const file of engineFiles(root)) {
        if (!TEXT_EXT.has(path.extname(file).toLowerCase())) continue;
        let text;
        try {
            text = fs.readFileSync(file, "utf8");
        } catch (e) {
            return badResult("absent: " + posix(root, file));
        }
        for (const marker of ENGINE_MARKERS) {
            if (text.includes(marker)) {
                hits.push(posix(root, file) + " contains " + marker);
                break;
            }
        }
    }
    if (hits.length) return badResult(hits.slice(0, 5).join("; "));
    return okResult(
        "Read-only scan of game/js/main.js, game/js/rmmz_*.js, and text files under game/js/libs: " +
        "none contain DEUS_, window.UF, or UF. Open Owner question: DEC-012 places simulation in plain " +
        "modules under game/js/sim, while the registry also says all DEUS logic resides in " +
        "game/js/plugins/DEUS_*.js. This pass is the read-only sentence. tools/verify_engine_read_only.js " +
        "is cited by the registry and is not in the tree; this scan is the check."
    );
}

function checkGeo03(root) {
    const loaded = load(root, "game/js/plugins/DEUS_Levels.js");
    if (!loaded.ok) return loaded;
    const src = loaded.text;
    const decl = "const M_AIR = 0, M_STONE = 1, M_SOIL = 2, M_WOOD = 3, M_WATER = 4, M_LAVA = 5;";
    if (!src.includes(decl)) return badResult("M_AIR is not declared as 0 beside non-zero M_WATER and M_LAVA");
    const objects = [
        '{ id: M_AIR, key: "air", solid: false, fluid: false, maxHP: 0, support: 0, debris: null, resist: {} }',
        '{ id: M_WATER, key: "water", solid: false, fluid: true, maxHP: 0, support: 0, debris: null, resist: {} }',
        '{ id: M_LAVA, key: "lava", solid: false, fluid: true, maxHP: 0, support: 0, debris: null, resist: {} }'
    ];
    for (const obj of objects) {
        if (!src.includes(obj)) return badResult("STRATA_MATERIALS is missing the " + obj.slice(11, 28) + " row");
    }
    const byte = "const validMaterialByte = v => Number.isInteger(v) && v >= 0 && v <= 255 && (v === 0 || SOLID_B[v] === 1 || FLUID_B[v] === 1);";
    if (!src.includes(byte)) return badResult("validMaterialByte does not treat byte 0 as air");
    for (const name of ["continuousAirHeight", "airRunAt"]) {
        const body = extractFunction(src, name);
        if (body === null) return badResult(name + " is missing");
        if (!stripLineComments(body).includes(AIR_STOP)) {
            return badResult(name + " does not stop the air run on !== M_AIR");
        }
    }
    return okResult(
        "M_AIR is 0. Water and lava are fluids with other ids. validMaterialByte treats byte 0 as air. " +
        "continuousAirHeight and airRunAt stop on any byte that is not M_AIR, so a fluid is not clearance."
    );
}

function checkGeo04(root) {
    const loaded = load(root, "game/js/plugins/DEUS_Levels.js");
    if (!loaded.ok) return loaded;
    const region = sliceBetween(loaded.text, "no floating natural mass", "Descriptors: the floor levels");
    if (region === null) return badResult("the floating-mass removal block is missing");
    const miss = missingNeedle(region, [
        ["bedrock seed", "for (let i = 0; i < n; i++) push(i);"],
        ["area-edge seed", "push(e * n + (size - 1) * size + k);"],
        ["unconnected test", "if (sol[v] !== 1) continue;"],
        ["clear unconnected solid to air", "setE(i, e, M_AIR);"]
    ]);
    if (miss) return badResult("floating-mass block is missing " + miss);
    return okResult(
        "Natural carve deletes solid strata the flood from bedrock (elevation 0) and the area edge never reaches, by setE to M_AIR."
    );
}

function runCited(root, rel, stdoutNeedles) {
    const script = path.join(root, ...rel.split("/"));
    console.error("check_invariants: running " + rel);
    const started = Date.now();
    const r = spawnSync(process.execPath, [script], {
        cwd: root,
        encoding: "utf8",
        timeout: CITED_TIMEOUT_MS,
        maxBuffer: 32 * 1024 * 1024,
        windowsHide: true
    });
    const ms = Date.now() - started;
    if ((r.error && r.error.code === "ETIMEDOUT") || r.status === null) {
        return badResult(rel + " timed out after " + CITED_TIMEOUT_MS + "ms");
    }
    if (r.status !== 0) {
        const tail = oneLine((r.stderr || r.stdout || "").trim().split(/\r?\n/).slice(-2).join(" ")).slice(0, 160);
        return badResult(rel + " exited " + r.status + (tail ? " (" + tail + ")" : ""));
    }
    const out = r.stdout || "";
    for (const needle of stdoutNeedles) {
        if (!out.includes(needle)) return badResult(rel + " exited 0 without " + JSON.stringify(needle));
    }
    return { ok: true, detail: rel + " exited 0 in " + ms + "ms" };
}

function checkFld02(root) {
    const fluid = load(root, "game/js/plugins/DEUS_Fluid.js");
    if (!fluid.ok) return fluid;
    const suite = load(root, "tools/test_strata_fluid_reconciliation.js");
    if (!suite.ok) return suite;
    const fluidMiss = missingNeedle(fluid.text, [
        ["upward excess move", "const move = Math.min(excess, spaceAbove);"],
        ["upward excess decrement", "excess -= move;"],
        ["lateral excess move", "const move = Math.min(excess, nCap - nDepth);"],
        ["lateral excess decrement", "excess -= move;"]
    ]);
    if (fluidMiss) return badResult("DEUS_Fluid.js reconcile path is missing " + fluidMiss);
    const assertLine = 'assert("closed_loop_mass_conserved", finalSum === initialSum';
    if (!suite.text.includes(assertLine)) {
        return badResult("the cited suite is missing closed_loop_mass_conserved comparing finalSum to initialSum");
    }
    const run = runCited(root, "tools/test_strata_fluid_reconciliation.js", [
        "closed_loop_mass_conserved",
        "ALL FLUID <-> STRATA RECONCILIATION CHECKS PASSED"
    ]);
    if (!run.ok) return run;
    return okResult(
        "Over-capacity fluid is moved upward and sideways (excess -= move) before the cell is reduced. " +
        run.detail + ", and its output records closed_loop_mass_conserved."
    );
}

function checkFld03(root) {
    const loaded = load(root, "game/js/plugins/DEUS_Levels.js");
    if (!loaded.ok) return loaded;
    const miss = missingNeedle(loaded.text, [
        ["fluidIn predicate", "const fluidIn = (i, e0, e1) => { for (let e = e0; e < e1; e++) if (FLUID_B[getE(i, e)] === 1) return true; return false; };"],
        ["shaft refuses fluid", "if (fluidIn(i, sh.from, hi)) return;"],
        ["shaft carves solid only", "for (let e = sh.from; e < hi; e++) if (SOLID_B[getE(i, e)] === 1) { setE(i, e, M_AIR); changed = true; }"],
        ["skylight refuses fluid", "if (!solidE(i, nd.F - 1) || fluidIn(i, nd.F, top[i])) return;"],
        ["skylight carves solid only", "for (let e = nd.F; e < top[i]; e++) if (SOLID_B[getE(i, e)] === 1) { setE(i, e, M_AIR); changed = true; }"],
        ["cut detects fluid", "for (let e = F; e < top[i]; e++) if (FLUID_B[getE(i, e)] === 1) fluid = true;"],
        ["cut refuses fluid", "if (fluid) continue;"],
        ["cut carves after the refusal", "for (let e = F; e < top[i]; e++) setE(i, e, M_AIR);"]
    ]);
    if (miss) return badResult("natural voids are missing " + miss);
    return okResult(
        "fluidIn refuses a shaft or skylight whose column has FLUID_B set, and a natural cut does the same before it writes M_AIR. The carve itself writes M_AIR only into solid strata."
    );
}

function checkSim01(root) {
    const menus = load(root, "game/js/plugins/DEUS_FactionMenus.js");
    if (!menus.ok) return menus;
    const core = load(root, "game/js/plugins/DEUS_Core.js");
    if (!core.ok) return core;
    const init = extractMethod(menus.text, "class Window_NewGameSetup extends Window_Selectable", "initialize(rect)");
    if (init === null) return badResult("Window_NewGameSetup.initialize is missing");
    const year = init.match(/this\._year\s*=\s*([^;\n]+);/);
    if (!year) return badResult("Window_NewGameSetup.initialize does not assign this._year");
    if (year[1].trim() !== "0") return badResult("standard New Game default year is " + year[1].trim());
    const setup = "const setupYear = window.UF && UF.NewGameSetup ? UF.NewGameSetup.year : undefined;";
    const assign = "this.year = Number.isInteger(setupYear) && setupYear >= 0 ? setupYear : 0;";
    if (!core.text.includes(setup) || !core.text.includes(assign)) {
        return badResult("Game_UFTime does not fall back to World Year 0 when no setup year is set");
    }
    return okResult(
        "Window_NewGameSetup.initialize assigns this._year = 0. Game_UFTime keeps a non-negative setup year and uses 0 when none is set."
    );
}

function checkSim03(root) {
    const loaded = load(root, "game/js/sim/ledger.js");
    if (!loaded.ok) return loaded;
    const miss = missingNeedle(loaded.text, [
        ["balanced recipe", 'for (const f of famNames) if (bal[f] !== 0) fail("E_FAMILY", where + " (" + r.id + ") is not balanced for family " + f + " (inputs minus outputs = " + bal[f] + ")");'],
        ["sealed register refused", 'if (S.sealed) fail("E_SEALED", where + ": the ledger is sealed; after seal() matter changes only by transform, recipe, source or sink");'],
        ["transform refuses new ore", 'if (td.ore && toCls !== fromCls) fail("E_ORE_OUTPUT", where + ": the output " + toCls + " is an ore class; ore is never produced (LIFE-002, cause " + show(cause) + ")");'],
        ["transform keeps the family", 'if (fd.compKey !== td.compKey) fail("E_FAMILY", where + ": " + fromCls + " and " + toCls + " differ in element/family (cause " + show(cause) + ")");'],
        ["transform moves the same amount", "const moves = [[kf, -amount], [kt, amount]];"],
        ["source refuses ore", 'if (cd.ore) fail("E_ORE_OUTPUT", where + ": " + cls + " is an ore class; no source may produce ore (LIFE-002, cause " + show(cause) + ")");'],
        ["finite source must be allowed", 'if (cd.finite && !sd.allowFinite) fail("E_FINITE_SOURCE", where + ": " + cls + " is finite and source " + name + " has no allowFinite (cause " + show(cause) + ")");'],
        ["family closure", 'if (now !== st.base[f] + src - snk) out.push({ family: f, sealed: st.base[f], sources: src, sinks: snk, expected: st.base[f] + src - snk, actual: now });']
    ]);
    if (miss) return badResult("mass ledger is missing " + miss);
    return okResult(
        "game/js/sim/ledger.js: after seal(), register is refused (E_SEALED); transforms move one amount inside one family and never mint ore; " +
        "recipes balance per family; a finite class accepts a source only when that source sets allowFinite; closure is sealed + sources - sinks."
    );
}

function checkGov02(root) {
    const loaded = load(root, "tools/governance/check_claims.js");
    if (!loaded.ok) return loaded;
    const miss = missingNeedle(loaded.text, [
        ["frozen path refused", "if (frozen) { fail(`${ch.path}: frozen / read-only (${frozen.raw})`); continue; }"],
        ["whitelist membership allows the path", "if (lanes.some(l => l.globs.some(g => g.re.test(ch.path)))) continue;"],
        ["path outside the whitelist refused", "fail(`${ch.path}: outside the ${held} whitelist; ${owners.length ? `it belongs to ${owners.join(\", \")}` : \"no lane owns it\"}`);"]
    ]);
    if (miss) return badResult("check_claims.js rule 4.4 is missing " + miss);
    return okResult(
        "check_claims.js checkWhitelist refuses a frozen path and a path outside the committer's whitelist. That is the repo check for one writer per file set."
    );
}

function checkGov05(root) {
    const loaded = load(root, "tools/governance/check_claims.js");
    if (!loaded.ok) return loaded;
    const miss = missingNeedle(loaded.text, [
        ["evidence requires a reachable commit or a test run", "const ok = missing.length === 0 && (commits.some(c => c.reachable) || testRun);"],
        ["closure without evidence is refused", "if (!ev.ok) R.fail(\"4.1\", `${where}: ${ev.why}`);"]
    ]);
    if (miss) return badResult("check_claims.js rule 4.1 is missing " + miss);
    return okResult(
        "check_claims.js evidenceOf accepts a closure only with a reachable commit or a cited script plus a passing log, and requireEvidence records a 4.1 failure otherwise."
    );
}

function skip(id, status, detail) {
    return { id, status, detail: oneLine(detail) };
}

function active(id, run) {
    return { id, run };
}

// Registry order. A row here is either a mechanical run() or a skipped status.
const CATALOGUE = [
    active("INV-CORE-01", checkCore01),
    skip("INV-CORE-02", "NOT-MECHANICAL",
        "Single ownership of World, Entities, Fluid, Jobs, and Items is an architecture audit. The tree has no map from each state to one subsystem that a scan can accept or reject."),
    skip("INV-CORE-03", "NOT-MECHANICAL",
        "The cited enforcement is the PERF_QUIET_WORLD frame-time benchmark. A source pattern for 'scans the whole world in one frame' is not closed enough to accept or reject."),
    skip("INV-CORE-04", "NOT-MECHANICAL",
        "The cited enforcement is a save/load round trip. Stable integer identity for every entity, with no live object reference crossing a save, is not a closed tree scan."),
    skip("INV-CORE-05", "NOT-MECHANICAL",
        "The rule covers every suite in the repo. This process does not mutation-test every suite. tools/governance/fixtures/invariants proves this checker can fail; that is the local proof, and the repo-wide rule stays a quality-policy audit."),
    skip("INV-GEO-01", "SUPERSEDED-PENDING-OWNER",
        "Open Owner question. Registry: five 1 ft strata in a 5 ft cube. Later decision DEC-013 D-2 and merged WG.00.17: five 2 ft slices in a 10 ft layer, and DEC-013's 32 Z layers. Check skipped."),
    skip("INV-GEO-02", "SUPERSEDED-PENDING-OWNER",
        "Open Owner question. Registry: five macro-Z levels Z-2, Z-1, Z0, Z+1, Z+2. Later decision DEC-013 and merged WG.00.17: 32 Z layers, default zMin -16 and zMax 15, with the coordinate split still OPEN in DEC-013. Check skipped."),
    active("INV-GEO-03", checkGeo03),
    active("INV-GEO-04", checkGeo04),
    skip("INV-GEO-05", "SUPERSEDED-PENDING-OWNER",
        "Open Owner question. Registry: flat top-down 2D, with 2.5D height offsets retired. Later decision DEC-019 requires a fixed pixel offset per stratum. docs/art/DEUS_ASSET_STANDARD.md AS-TERR-001 keeps the RMMZ top-down 3/4 view. Check skipped."),
    skip("INV-FLD-01", "SUPERSEDED-PENDING-OWNER",
        "Open Owner question. Registry: five depth states map 1:1 onto 1 ft strata. Later decision DEC-013 D-2: a stratum is 2 ft. Check skipped."),
    active("INV-FLD-02", checkFld02),
    active("INV-FLD-03", checkFld03),
    active("INV-SIM-01", checkSim01),
    skip("INV-SIM-02", "NOT-MECHANICAL",
        "Open Owner question. UF_Time.schedule uses opts.domain || \"engine\", and UF.Time.after(ticks, fn) schedules a naked engine timer. A scan that required an explicit domain on every timer would reject this tree, and UF_Time.js is outside this lane. Whether that legacy path remains allowed is unanswered here."),
    active("INV-SIM-03", checkSim03),
    skip("INV-ART-01", "SUPERSEDED-PENDING-OWNER",
        "Open Owner question. Registry: Nano Banana Pro (gemini-3-pro-image) only. Later Owner ruling AS-GEN-004 and AS-GEN-005 in docs/art/DEUS_ASSET_STANDARD.md, mirrored in game/data/UF_AssetStandard.json: PixelLab is the primary generator, Retro Diffusion is standby, Nano Banana Pro is concepts only. DEC-007 also suspends generation. Check skipped."),
    skip("INV-ART-02", "NOT-MECHANICAL",
        "The cited enforcement is visual inspection (AGENTS.md Rule 12). A text ban on scale, sway, stretch, or shaders false-hits ordinary placement. There is no closed repo check."),
    skip("INV-ART-03", "SUPERSEDED-PENDING-OWNER",
        "Open Owner question. Registry: every charset is a 3x4 sheet (3 Down, 3 Left, 3 Right, 3 Up). Later Owner ruling AS-CHMAP-001, recorded in game/data/UF_AssetStandard.json item 43: character map sprites are whole PixelLab v3 characters with animations in eight directions. Check skipped."),
    skip("INV-ART-04", "NOT-MECHANICAL",
        "The flat near-black cap (#08080C to #121218) on a 48x96 wall is a visual property (AGENTS.md Rule 13). tools/clean_packed_sheet.js records the convention. Pixel inspection of every wall is not this check."),
    skip("INV-ART-05", "SUPERSEDED-PENDING-OWNER",
        "Open Owner question. Registry: autonomous production applies to non-living assets, and living beings need an explicit Owner request. Later decision DEC-007 suspends every autonomous-generation mandate, including AGENTS.md Rules 11 and 13, until the Owner rewrites them. Check skipped."),
    skip("INV-GOV-01", "SUPERSEDED-PENDING-OWNER",
        "Open Owner question. Registry: Gemini / Antigravity is the sole integrator into main. Later Owner directive 0028-AC, recorded in docs/worldgen/DEUS_WORLDGEN_WBS.md revision 24 and tools/governance/README.md: the PM launches workers and merges. Check skipped."),
    active("INV-GOV-02", checkGov02),
    skip("INV-GOV-03", "NOT-MECHANICAL",
        "Reviewers forming a conclusion from the diff and the spec before reading author explanations is a workflow rule. merge_gate.js checks reviewer family, which is a different rule. There is no repo check of reading order."),
    skip("INV-GOV-04", "NOT-MECHANICAL",
        "Durable task state (docs/AGENT_COMMUNICATION_PROTOCOL.md) means defects and task state survive a crash because they were committed or written to docs/agents/mailboxes. A directory listing is not that proof."),
    active("INV-GOV-05", checkGov05),
    skip("INV-SOC-01", "NOT-MECHANICAL",
        "Three independent identity axes are specified in docs/society/DEUS_PERSON_AND_INSTITUTIONS.md and SOC.10.01. The tree has no executable check that Craft, civic office, and SRD class stay independent."),
    skip("INV-SOC-02", "NOT-MECHANICAL",
        "Current duty as operational state is specified by SOC.13.01. The tree has no duty-scheduler check that separates duty from an identity axis."),
    skip("INV-SOC-03", "NOT-MECHANICAL",
        "An office surviving its holder is specified by SOC.20.01 and SOC.23.01. The tree has no executable vacancy check."),
    skip("INV-SOC-04", "NOT-MECHANICAL",
        "Workload-driven offices are specified by SOC.21.01 and SOC.22.02. The tree has no executable workload-index check."),
    skip("INV-SOC-05", "NOT-MECHANICAL",
        "Conserved minting of assayed metal into coin is specified by SOC.30.01. The tree has no executable mint check."),
    skip("INV-SOC-06", "NOT-MECHANICAL",
        "Treasury versus stores is specified by SOC.31.01 and SOC.32.01. The tree has no executable separation check."),
    skip("INV-SOC-07", "NOT-MECHANICAL",
        "Military participation by service status (NONE, RESERVE, MILITIA, GUARD, PROFESSIONAL) is specified by SOC.40.01. The tree has no executable ratio check."),
    skip("INV-SOC-08", "NOT-MECHANICAL",
        "Mobilization's economic and harvest cost is specified by SOC.40.02 and SOC.42.01. The tree has no executable cost check."),
    skip("INV-SOC-09", "NOT-MECHANICAL",
        "Class mechanics are specified to come from the 2014 SRD 5.1 by SOC.11.01 and docs/SRD5_1_INTEGRATION.md. The registry's reference copy is untracked, so exclusivity is not a closed tree scan.")
];

(function assertCatalogue() {
    const seen = new Set();
    for (const entry of CATALOGUE) {
        if (seen.has(entry.id)) throw new Error("duplicate catalogue id " + entry.id);
        seen.add(entry.id);
        if (entry.run && entry.status) throw new Error(entry.id + " is both active and skipped");
        if (!entry.run && entry.status !== "NOT-MECHANICAL" && entry.status !== "SUPERSEDED-PENDING-OWNER") {
            throw new Error(entry.id + " has no check");
        }
    }
})();

function parseRegistry(text) {
    const rows = [];
    const dupes = [];
    const seen = new Set();
    for (const line of String(text).split(/\r?\n/)) {
        const m = line.match(/^\|\s*\*\*(INV-[A-Z]+-\d+)\*\*\s*\|/);
        if (!m) continue;
        if (seen.has(m[1])) dupes.push(m[1]);
        else {
            seen.add(m[1]);
            rows.push({ id: m[1] });
        }
    }
    return { rows, dupes };
}

function runEntry(entry, root) {
    if (!entry.run) return { id: entry.id, status: entry.status, detail: entry.detail };
    const result = entry.run(root);
    return { id: entry.id, status: result.ok ? "PASS" : "FAIL", detail: result.detail };
}

function evaluate(root, parsed, only) {
    const byId = new Map(CATALOGUE.map(entry => [entry.id, entry]));
    const regIds = new Set(parsed.rows.map(row => row.id));
    const rows = [];
    if (!only && parsed.dupes.length) {
        rows.push({
            id: "(registry)",
            status: "FAIL",
            detail: "defect: duplicate registry id " + [...new Set(parsed.dupes)].join(", ")
        });
    }
    const source = only ? parsed.rows.filter(row => row.id === only) : parsed.rows;
    for (const row of source) {
        const entry = byId.get(row.id);
        if (!entry) rows.push({ id: row.id, status: "FAIL", detail: "defect: no check defined for this registry row" });
        else rows.push(runEntry(entry, root));
    }
    if (!only) {
        const extras = CATALOGUE.map(entry => entry.id).filter(id => !regIds.has(id));
        if (extras.length) {
            rows.push({ id: "(catalogue)", status: "FAIL", detail: "defect: not in the registry: " + extras.join(", ") });
        }
    }
    return rows;
}

function countRows(rows) {
    const c = { active: 0, pass: 0, fail: 0, notMechanical: 0, superseded: 0 };
    for (const row of rows) {
        if (row.status === "PASS") { c.active++; c.pass++; }
        else if (row.status === "FAIL") { c.active++; c.fail++; }
        else if (row.status === "NOT-MECHANICAL") c.notMechanical++;
        else if (row.status === "SUPERSEDED-PENDING-OWNER") c.superseded++;
    }
    return c;
}

function pad(s, n) {
    if (s.length >= n) return s + " ";
    return s + " ".repeat(n - s.length);
}

function emit(rows, asJson) {
    const c = countRows(rows);
    if (asJson) {
        console.log(JSON.stringify({
            ok: c.fail === 0,
            rows,
            counts: {
                active: c.active,
                pass: c.pass,
                fail: c.fail,
                notMechanical: c.notMechanical,
                supersededPendingOwner: c.superseded
            }
        }));
        return;
    }
    console.log(pad("ID", 14) + pad("STATUS", 28) + "DETAIL");
    for (const row of rows) console.log(pad(row.id, 14) + pad(row.status, 28) + row.detail);
    console.log(
        "SUMMARY active=" + c.active +
        " pass=" + c.pass +
        " fail=" + c.fail +
        " not-mechanical=" + c.notMechanical +
        " superseded-pending-owner=" + c.superseded
    );
}

function parseArgs(argv) {
    const out = { root: null, registry: null, only: null, json: false, help: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--json") out.json = true;
        else if (a === "--help" || a === "-h") out.help = true;
        else if (a === "--root" || a === "--registry" || a === "--only") {
            const value = argv[i + 1];
            if (!value || value.startsWith("--")) return { error: a + " needs a value" };
            out[a.slice(2)] = value;
            i++;
        } else return { error: "unknown argument " + a };
    }
    return out;
}

function isDir(p) {
    try {
        return fs.statSync(p).isDirectory();
    } catch (e) {
        return false;
    }
}

function main(argv) {
    const args = parseArgs(argv);
    if (args.error) {
        console.error("check_invariants: " + args.error);
        console.error("usage: node tools/governance/check_invariants.js [--root dir] [--registry file] [--only INV-ID] [--json]");
        return 2;
    }
    if (args.help) {
        console.log("usage: node tools/governance/check_invariants.js [--root dir] [--registry file] [--only INV-ID] [--json]");
        console.log("Exit 0 when every active check passes. NOT-MECHANICAL and SUPERSEDED-PENDING-OWNER rows are reported and do not fail the run.");
        return 0;
    }
    const root = path.resolve(args.root || path.join(__dirname, "..", ".."));
    const registryPath = path.resolve(args.registry || path.join(__dirname, "..", "..", "docs", "INVARIANT_REGISTRY.md"));
    if (!isDir(root)) {
        console.error("check_invariants: root is not a directory: " + root);
        return 2;
    }
    let text;
    try {
        text = fs.readFileSync(registryPath, "utf8");
    } catch (e) {
        console.error("check_invariants: cannot read registry: " + registryPath);
        return 2;
    }
    const parsed = parseRegistry(text);
    if (args.only && !parsed.rows.some(row => row.id === args.only) && !parsed.dupes.includes(args.only)) {
        console.error("check_invariants: " + args.only + " is not a row of the registry");
        return 2;
    }
    const rows = evaluate(root, parsed, args.only);
    emit(rows, args.json);
    return rows.some(row => row.status === "FAIL") ? 1 : 0;
}

if (require.main === module) {
    try {
        process.exit(main(process.argv.slice(2)));
    } catch (e) {
        console.error(e && e.stack ? e.stack : e);
        process.exit(2);
    }
}

module.exports = { main, parseRegistry, CATALOGUE };
