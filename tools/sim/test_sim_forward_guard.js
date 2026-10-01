#!/usr/bin/env node
"use strict";

/**
 * tools/sim/test_sim_forward_guard.js — SIM.10.02 guard.
 *
 * (a) Runs tools/dev/sim_forward.js on the Year-0 fixture and checks the copy,
 *     the summary, and that the input bytes do not change.
 * (b) Proves New Game never calls simulate-forward: nothing under game/ names
 *     the tool, and a standard headless New Game stays at year 0 with
 *     history.simulated false.
 * (c) Mutants that write the input, drop the overwrite refusal, skip the
 *     demographic step, call simulate from the new-game path, or reference
 *     the tool from game/ must fail those checks.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const os = require("os");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const simHook = require("../lib/vm_sim_require"); // WG.00.44: UF.Sim.require and a 1x1 grid in the vm

const ROOT = path.resolve(__dirname, "..", "..");
const TOOL = path.join(ROOT, "tools", "dev", "sim_forward.js");
const FIXTURE = path.join(ROOT, "tools", "sim", "fixtures", "sim_forward", "year0_seed_424242.json");
const PLUGINS = ["DEUS_Core", "DEUS_World", "DEUS_WorldGen", "DEUS_Factions", "DEUS_History", "DEUS_Levels", "DEUS_Dnd5e", "DEUS_Callings", "DEUS_HistoricalDemographics"];
const NEW_GAME_ANCHOR = "try { generated = History.generate(state, targetYear === undefined ? {} : { targetYear }); }";
const TEXT_EXT = new Set([".js", ".json", ".md", ".html", ".css", ".txt", ".mjs", ".cjs", ".xml", ".csv", ".yml", ".yaml"]);
const SEED = 424242;

function sha256(bytes) {
    return crypto.createHash("sha256").update(bytes).digest("hex");
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function replaceOnce(src, anchor, replacement, label) {
    const hits = src.split(anchor).length - 1;
    if (hits !== 1) throw new Error(label + " anchor found " + hits + " times");
    return src.replace(anchor, () => replacement);
}

function childEnv() {
    const env = Object.assign({}, process.env);
    delete env.FORCE_COLOR;
    delete env.NO_COLOR;
    return env;
}

function runCli(script, args) {
    return spawnSync(process.execPath, [script, ...args], {
        cwd: ROOT, encoding: "utf8", windowsHide: true, env: childEnv(),
        timeout: 120000, maxBuffer: 8 * 1024 * 1024
    });
}

function sameBytes(before, file) {
    try { return before.equals(fs.readFileSync(file)); }
    catch (e) { return false; }
}

function summaryOf(stdout) {
    const take = (re) => {
        const m = String(stdout || "").match(re);
        return m ? m[1] : null;
    };
    const num = (re) => {
        const raw = take(re);
        return raw === null ? null : Number(raw);
    };
    return {
        years: num(/years_run=(\d+)/),
        yearBefore: num(/year_before=(\d+)/),
        yearAfter: num(/year_after=(\d+)/),
        popBefore: num(/population_before=(\d+)/),
        popAfter: num(/population_after=(\d+)/),
        facBefore: num(/factions_before=(\d+)/),
        facAfter: num(/factions_after=(\d+)/),
        output: take(/output=([^\r\n]+)/)
    };
}

function ledgerFingerprint(demo) {
    const view = {
        startYear: demo.startYear,
        currentYear: demo.currentYear,
        yearsSimulated: demo.yearsSimulated,
        people: demo.people,
        sites: demo.sites,
        events: demo.events,
        partnerships: demo.partnerships,
        rulers: demo.rulers,
        factions: demo.factions,
        dynasties: demo.dynasties
    };
    return sha256(JSON.stringify(view));
}

function livingIds(demo, dead) {
    return demo.people.filter((p) => dead ? p.died !== null : p.died === null).map((p) => p.id);
}

function tilemapStatics() {
    const core = fs.readFileSync(path.join(ROOT, "game", "js", "rmmz_core.js"), "utf8");
    const start = core.indexOf("Tilemap.TILE_ID_B = 0;");
    const table = core.indexOf("Tilemap.WATERFALL_AUTOTILE_TABLE = [");
    const end = core.indexOf("];", table) + 2;
    if (start < 0 || table < 0 || end < 2) throw new Error("rmmz_core.js Tilemap statics not found");
    return "function Tilemap() {}\n" + core.slice(start, end);
}

function loadRuntime(editHistory) {
    const errors = [];
    const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));
    const ns = {};
    const env = {
        window: null, UF: ns, DEUS: ns, Math, performance,
        $ufWorldCatalog: catalog, $deusWorldCatalog: catalog,
        PluginManager: { parameters: () => ({}), registerCommand() {} },
        DataManager: {
            _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false,
            makeSaveContents: () => ({}), extractSaveContents() {}
        },
        Input: { keyMapper: {} }, TouchInput: {}, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        $gameMap: { mapId: () => 0 }, $gamePlayer: {}, $gameSystem: {},
        $gameMessage: { isBusy: () => false }, ImageManager: {},
        Utils: { isOptionValid: () => false },
        document: { title: "" }, addEventListener() {},
        console: {
            log() {}, warn() {},
            error: (...args) => errors.push(args.map((x) => (x && x.stack) || String(x)).join(" "))
        }
    };
    env.window = env;
    const sources = PLUGINS.map((name) => {
        let src = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", name + ".js"), "utf8");
        if (name === "DEUS_History" && editHistory) src = editHistory(src);
        return src;
    });
    const classes = new Set(["Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle"]);
    const protoRe = /\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype(?:\.([A-Za-z0-9_]+))?/g;
    for (const source of sources) for (const m of source.matchAll(protoRe)) classes.add(m[1]);
    for (const name of classes) env[name] = function() { throw new Error("Unexpected engine construction " + name); };
    for (const source of sources) for (const m of source.matchAll(protoRe)) {
        if (m[2]) env[m[1]].prototype[m[2]] = () => { throw new Error("Unexpected engine method " + m[1] + "." + m[2]); };
    }
    simHook.install(env);
    const ctx = vm.createContext(env);
    vm.runInContext(["Math", "Object", "Array", "Number", "String", "Boolean", "Map", "Set", "JSON", "Date",
        "Uint8Array", "Uint16Array", "Int32Array", "Float32Array", "performance", "window"]
        .map((name) => "const " + name + " = globalThis." + name + ";").join("\n"), ctx);
    vm.runInContext(tilemapStatics(), ctx, { filename: "rmmz_core.js#Tilemap-statics" });
    PLUGINS.forEach((name, i) => vm.runInContext(sources[i], ctx, { filename: name + ".js", timeout: 60000 }));
    return { env, errors };
}

function runStandardNewGame(loaded) {
    loaded.errors.length = 0;
    loaded.env.UF.NewGameSetup = { year: 0, seed: SEED, faction: "human", worldSize: 256, fogOfWar: false };
    loaded.env.$ufTime.year = 777;
    const world = loaded.env.UF.World.newWorld(SEED);
    const history = (world && world.history) || {};
    const demo = history.demographics || {};
    return {
        clock: loaded.env.$ufTime ? loaded.env.$ufTime.year : null,
        simulated: history.simulated,
        years: history.years,
        worldAge: history.worldAge,
        currentYear: demo.currentYear,
        yearsSimulated: demo.yearsSimulated,
        startYear: demo.startYear,
        errors: loaded.errors.slice()
    };
}

function year0Pass(report) {
    return report.clock === 0 && report.simulated === false && report.years === 0 && report.worldAge === 0
        && report.currentYear === 0 && report.yearsSimulated === 0 && report.startYear === 0 && report.errors.length === 0;
}

function referencesTool(text) {
    return text.includes("sim_forward") || text.includes("DEUS_SimForward");
}

function scanGame(root) {
    const hits = [];
    const game = path.join(root, "game");
    if (!fs.existsSync(game)) return hits;
    const walk = (dir) => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            if (ent.isSymbolicLink()) continue;
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) {
                if (ent.name === "node_modules" || ent.name === ".git") continue;
                walk(full);
                continue;
            }
            if (ent.name.includes("sim_forward") || ent.name.includes("DEUS_SimForward")) hits.push(full);
            if (!TEXT_EXT.has(path.extname(ent.name).toLowerCase())) continue;
            if (referencesTool(fs.readFileSync(full, "utf8"))) hits.push(full);
        }
    };
    walk(game);
    return hits;
}

function judgeForward(outputPath, stdout, years, reference, startPop) {
    const problems = [];
    let output;
    try { output = JSON.parse(fs.readFileSync(outputPath, "utf8")); }
    catch (e) { return { ok: false, problems: ["output is not JSON"] }; }
    const world = output.world;
    const demo = world && world.history && world.history.demographics;
    if (output.format !== "deus.sim_forward.v1") problems.push("format");
    if (output.yearsRun !== years) problems.push("yearsRun");
    if (!demo) problems.push("no demographics");
    else {
        if (demo.yearsSimulated !== reference.yearsSimulated) problems.push("yearsSimulated " + demo.yearsSimulated + " != " + reference.yearsSimulated);
        if (demo.currentYear !== reference.currentYear) problems.push("currentYear " + demo.currentYear + " != " + reference.currentYear);
        if (ledgerFingerprint(demo) !== ledgerFingerprint(reference)) problems.push("ledger hash");
        if (JSON.stringify(demo.living) !== JSON.stringify(livingIds(demo, false))) problems.push("living index");
        if (JSON.stringify(demo.graveyard) !== JSON.stringify(livingIds(demo, true))) problems.push("graveyard index");
        if (world.history.events.length !== demo.events.length) problems.push("chronicle length");
        if (years > 0 && world.history.simulated !== true) problems.push("simulated flag");
        if (years === 0 && world.history.simulated !== false) problems.push("year-0 simulated flag");
        const pop = {};
        for (const site of demo.sites) pop[site.factionId] = (pop[site.factionId] || 0) + site.population;
        for (const faction of (world.factions && world.factions.list) || []) {
            if (faction.population !== pop[faction.id]) problems.push("faction population " + faction.id);
        }
    }
    const sum = summaryOf(stdout);
    if (sum.years !== years) problems.push("summary years_run");
    if (sum.yearBefore === null || sum.yearAfter !== sum.yearBefore + years) problems.push("summary year");
    if (demo && sum.popAfter !== demo.people.filter((p) => p.died === null).length) problems.push("summary population");
    if (demo && sum.popBefore !== startPop) problems.push("summary population_before " + sum.popBefore + " != " + startPop);
    if (demo && sum.facAfter !== world.factions.list.length) problems.push("summary factions");
    if (sum.facBefore !== sum.facAfter) problems.push("faction roster changed");
    if (sum.output !== path.resolve(outputPath)) problems.push("summary output path");
    if (output.clock && demo && output.clock.year !== demo.currentYear) problems.push("clock");
    return { ok: problems.length === 0, problems, summary: sum };
}

function main() {
    const problems = [];
    const check = (name, pass, msg) => {
        console.log("  [" + (pass ? "PASS" : "FAIL") + "] " + name + ": " + msg);
        if (!pass) problems.push(name);
    };
    if (!fs.existsSync(FIXTURE)) {
        console.error("Missing fixture " + FIXTURE);
        process.exit(1);
    }
    const fixtureBytes = fs.readFileSync(FIXTURE);
    const fixtureHash = sha256(fixtureBytes);
    const fixture = JSON.parse(fixtureBytes.toString("utf8"));
    const baseline = fixture.world.history.demographics;
    const startPop = baseline.people.filter((p) => p.died === null).length;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sim1002-"));
    try {
        console.log("=== SIM.10.02 sim_forward guard ===");
        console.log("fixture " + FIXTURE);
        console.log("fixture sha256 " + fixtureHash + " (" + fixtureBytes.length + " bytes)");

        const toolApi = require(TOOL);
        check("require_does_not_run_the_cli", toolApi && toolApi.FORMAT === "deus.sim_forward.v1" && typeof toolApi.advanceCopy === "function",
            "requiring the CLI exports the library and does not simulate");
        let unknown = false;
        try { toolApi.parseArgs(["--nope"]); } catch (e) { unknown = /unknown argument/.test(e.message); }
        check("parse_rejects_unknown_argument", unknown, unknown ? "unknown argument rejected" : "unknown argument was accepted");

        console.log("\n--- Section A: CLI on the Year-0 fixture ---");
        const loaded = loadRuntime(null);
        const referenceOf = (years) => {
            const demo = clone(baseline);
            if (years) loaded.env.UF.HistoricalDemographics.simulate(demo, years);
            return demo;
        };
        const ref3 = referenceOf(3);
        check("reference_population_grows", ref3.people.filter((p) => p.died === null).length > startPop && ref3.yearsSimulated === 3 && ref3.currentYear === 3,
            "independent 3-year simulate: living " + startPop + " -> " + ref3.people.filter((p) => p.died === null).length
            + ", year " + ref3.currentYear + ", yearsSimulated " + ref3.yearsSimulated);

        const input = path.join(tmp, "input.json");
        const output = path.join(tmp, "forward3.json");
        fs.copyFileSync(FIXTURE, input);
        const beforeInput = fs.readFileSync(input);
        const child = runCli(TOOL, ["--input", input, "--years", "3", "--output", output]);
        check("cli_forward_exits_0", child.status === 0 && !child.error, "exit " + child.status + (child.stderr ? " stderr " + child.stderr.trim().split("\n")[0] : ""));
        check("input_bytes_unchanged", sameBytes(beforeInput, input) && sha256(fs.readFileSync(input)) === fixtureHash,
            "input sha256 " + sha256(fs.readFileSync(input)));
        const judged = child.status === 0 ? judgeForward(output, child.stdout, 3, ref3, startPop) : { ok: false, problems: ["cli did not exit 0"] };
        check("forward_matches_demographic_simulate", judged.ok,
            judged.ok ? "population " + judged.summary.popBefore + " -> " + judged.summary.popAfter + ", factions " + judged.summary.facBefore + " -> " + judged.summary.facAfter
                : judged.problems.join("; "));
        check("repo_fixture_untouched_after_forward", sha256(fs.readFileSync(FIXTURE)) === fixtureHash, fixtureHash);

        const zeroOut = path.join(tmp, "forward0.json");
        const zeroChild = runCli(TOOL, ["--input", input, "--years", "0", "--output", zeroOut]);
        const zeroJudge = zeroChild.status === 0 ? judgeForward(zeroOut, zeroChild.stdout, 0, referenceOf(0), startPop) : { ok: false, problems: ["exit " + zeroChild.status] };
        check("zero_years_keeps_year_0", zeroChild.status === 0 && zeroJudge.ok && sameBytes(beforeInput, input),
            zeroJudge.ok ? "simulated false, population " + zeroJudge.summary.popAfter : (zeroJudge.problems || []).join("; ") + " " + (zeroChild.stderr || ""));

        const resumeA = path.join(tmp, "resume2.json");
        const resumeB = path.join(tmp, "resume4.json");
        const first = runCli(TOOL, ["--input", input, "--years", "2", "--output", resumeA]);
        const mid = fs.readFileSync(resumeA);
        const second = runCli(TOOL, ["--input", resumeA, "--years", "2", "--output", resumeB]);
        const ref4 = referenceOf(4);
        const resumeJudge = second.status === 0 ? judgeForward(resumeB, second.stdout, 2, ref4, JSON.parse(mid.toString("utf8")).after.population) : { ok: false, problems: ["exit " + second.status] };
        check("resume_two_plus_two_matches_four", first.status === 0 && second.status === 0 && sameBytes(mid, resumeA) && resumeJudge.ok,
            resumeJudge.ok ? "year " + resumeJudge.summary.yearAfter + ", population " + resumeJudge.summary.popAfter : (resumeJudge.problems || []).join("; "));

        const refuseTarget = path.join(tmp, "refuse.json");
        fs.copyFileSync(FIXTURE, refuseTarget);
        const refuseBefore = fs.readFileSync(refuseTarget);
        const refused = runCli(TOOL, ["--input", refuseTarget, "--years", "1", "--output", refuseTarget]);
        check("refuses_to_write_over_input", refused.status !== 0 && /refusing to write over the input save/.test(refused.stderr || "") && sameBytes(refuseBefore, refuseTarget),
            "exit " + refused.status + ", stderr " + String(refused.stderr || "").trim().split("\n").pop());

        const help = runCli(TOOL, ["--help"]);
        check("help_exits_0", help.status === 0 && /--input/.test(help.stdout || "") && /--seed/.test(help.stdout || ""),
            "exit " + help.status);
        const missing = runCli(TOOL, []);
        check("missing_args_exit_1", missing.status === 1, "exit " + missing.status);

        const seeded = path.join(tmp, "seed0.json");
        const seedChild = runCli(TOOL, ["--seed", String(SEED), "--years", "0", "--output", seeded]);
        const seedSame = seedChild.status === 0 && fs.readFileSync(seeded).equals(fixtureBytes);
        check("seed_year0_matches_fixture", seedSame,
            seedChild.status === 0 ? "seed snapshot " + (seedSame ? "byte-matches the fixture" : "differs from the fixture (" + fs.statSync(seeded).size + " bytes)") : "exit " + seedChild.status + " " + String(seedChild.stderr || "").trim());

        const seeded3 = path.join(tmp, "seed3.json");
        const seed3Child = runCli(TOOL, ["--seed", String(SEED), "--years", "3", "--output", seeded3]);
        const seed3Judge = seed3Child.status === 0 ? judgeForward(seeded3, seed3Child.stdout, 3, ref3, startPop) : { ok: false, problems: ["exit " + seed3Child.status + " " + String(seed3Child.stderr || "").trim()] };
        check("seed_then_forward_matches_fixture_forward", seed3Judge.ok,
            seed3Judge.ok ? "same 3-year ledger as the fixture copy" : seed3Judge.problems.join("; "));

        console.log("\n--- Section B: New Game never calls simulate-forward ---");
        const hits = scanGame(ROOT);
        check("game_tree_does_not_reference_the_tool", hits.length === 0,
            hits.length ? hits.slice(0, 8).join(", ") : "no sim_forward or DEUS_SimForward reference under game/");
        const fresh = runStandardNewGame(loaded);
        check("standard_new_game_is_year_0_unsimulated", year0Pass(fresh),
            "clock " + fresh.clock + ", simulated " + fresh.simulated + ", yearsSimulated " + fresh.yearsSimulated
            + ", currentYear " + fresh.currentYear + ", errors " + fresh.errors.length);

        const decoyRoot = path.join(tmp, "decoy");
        fs.mkdirSync(path.join(decoyRoot, "game", "js"), { recursive: true });
        fs.writeFileSync(path.join(decoyRoot, "game", "js", "note.js"), "this history text does not name the dev tool\n");
        check("scanner_ignores_unrelated_game_text", scanGame(decoyRoot).length === 0, "unrelated file not flagged");

        console.log("\n--- Section C: mutants ---");
        const toolSrc = fs.readFileSync(TOOL, "utf8");
        const writeScript = path.join(tmp, "mutant_write.js");
        fs.writeFileSync(writeScript, replaceOnce(toolSrc, "commitOutput(outputPath, text);", "commitOutput(inputPath, text);", "write"));
        const writeInput = path.join(tmp, "write_input.json");
        const writeOutput = path.join(tmp, "write_output.json");
        fs.copyFileSync(FIXTURE, writeInput);
        const writeBefore = fs.readFileSync(writeInput);
        const writeChild = runCli(writeScript, ["--input", writeInput, "--years", "1", "--output", writeOutput]);
        const writeSame = sameBytes(writeBefore, writeInput);
        check("mutant_write_in_place_caught", !writeSame,
            writeSame ? "input still byte-identical (exit " + writeChild.status + " " + String(writeChild.stderr || "").trim().split("\n").pop() + ")" : "input bytes changed");

        const refuseScript = path.join(tmp, "mutant_refuse.js");
        fs.writeFileSync(refuseScript, replaceOnce(toolSrc, 'throw new Error("refusing to write over the input save");', "return;", "refuse"));
        const refuseInput = path.join(tmp, "refuse_mutant.json");
        fs.copyFileSync(FIXTURE, refuseInput);
        const refuseMutBefore = fs.readFileSync(refuseInput);
        const refuseMutChild = runCli(refuseScript, ["--input", refuseInput, "--years", "1", "--output", refuseInput]);
        const refuseMutSame = sameBytes(refuseMutBefore, refuseInput);
        check("mutant_overwrite_refusal_removed_caught", !refuseMutSame,
            refuseMutSame ? "same path still left the input byte-identical (exit " + refuseMutChild.status + " " + String(refuseMutChild.stderr || "").trim().split("\n").pop() + ")" : "same path overwrote the input");

        const skipScript = path.join(tmp, "mutant_skip.js");
        fs.writeFileSync(skipScript, replaceOnce(toolSrc, "UF.HistoricalDemographics.simulate(demographics, years);", "void demographics;", "skip"));
        const skipOut = path.join(tmp, "skip.json");
        const skipChild = runCli(skipScript, ["--input", input, "--years", "3", "--output", skipOut]);
        const skipJudge = skipChild.status === 0 && fs.existsSync(skipOut) ? judgeForward(skipOut, skipChild.stdout, 3, ref3, startPop) : { ok: false, problems: ["no forward output"] };
        check("mutant_skip_simulate_caught", skipJudge.ok === false, skipJudge.ok ? "skipped simulate still matched the 3-year ledger" : "forward check failed (" + (skipJudge.problems || []).join("; ") + ")");

        const mutantGame = loadRuntime((src) => replaceOnce(src, NEW_GAME_ANCHOR,
            "try { generated = History.generate(state, targetYear === undefined ? {} : { targetYear }); if (generated && generated.demographics) { UF.HistoricalDemographics.simulate(generated.demographics, 2); generated.simulated = true; } }",
            "new game"));
        const mutantReport = runStandardNewGame(mutantGame);
        check("mutant_new_game_calls_simulate_caught", !year0Pass(mutantReport),
            "clock " + mutantReport.clock + ", simulated " + mutantReport.simulated + ", yearsSimulated " + mutantReport.yearsSimulated
            + ", currentYear " + mutantReport.currentYear);

        const hookedRoot = path.join(tmp, "hooked");
        fs.mkdirSync(path.join(hookedRoot, "game", "js", "plugins"), { recursive: true });
        fs.writeFileSync(path.join(hookedRoot, "game", "js", "plugins", "DEUS_Hook.js"), 'require("tools/dev/sim_forward.js");\n');
        const hookedHits = scanGame(hookedRoot);
        check("mutant_game_references_tool_caught", hookedHits.length === 1, hookedHits.length ? hookedHits[0] : "scanner missed the tool reference");

        check("repo_fixture_untouched_at_end", sha256(fs.readFileSync(FIXTURE)) === fixtureHash, fixtureHash);
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }

    console.log("\n==================================================");
    if (problems.length) {
        console.error("SIM.10.02 GUARD FAILED:");
        for (const name of problems) console.error("  " + name);
        console.log("==================================================");
        process.exit(1);
    }
    console.log("SIM.10.02 GUARD PASSED");
    console.log("==================================================");
}

main();
