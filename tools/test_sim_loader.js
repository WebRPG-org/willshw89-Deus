#!/usr/bin/env node
"use strict";
// WG.00.44: UF.Sim.require (one loader for game/js/sim), the matter-opener registry, and the vm hook every
// plugin-loading harness installs (tools/lib/vm_sim_require.js), found by tools/lib/vm_harness_scan.js.
//
//   node tools/test_sim_loader.js                       every check; exit 0 only when all pass
//   node tools/test_sim_loader.js --only=a,b            the named checks only
//   node tools/test_sim_loader.js --mutant=<name>       a mutant; its named check must FAIL (exit 1)
//   node tools/test_sim_loader.js --keep                keep the NW.js snapshot (its path is printed)
//
// Mutants change source in memory only (DEUS_World.js text before the vm runs it, or a fresh copy of a tools/lib
// module); no file is rewritten.
//   return_null_on_missing  UF.Sim.require returns null for a missing module      -> missing_module_throws
//   fixed_list_scan         the scan is a fixed list of known harnesses           -> every_vm_harness_installs_hook
//   unpinned_grid           the hook leaves PluginManager alone                   -> grid_pinned_by_hook
//   hook_wrong_sandbox / hook_unreachable / hook_after_eval: plant invalid installs
//                                                                            -> every_vm_harness_installs_hook

const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const Module = require("module");
const { spawnSync } = require("child_process");
const simHook = require("./lib/vm_sim_require");

const ROOT = path.resolve(__dirname, "..");
const GAME = path.join(ROOT, "game");
const WORLD_FILE = path.join(GAME, "js", "plugins", "DEUS_World.js");
const HOOK_FILE = path.join(__dirname, "lib", "vm_sim_require.js");
const SCAN_FILE = path.join(__dirname, "lib", "vm_harness_scan.js");
const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\\nw.exe"; // as tools/run_tests.js

const MUTANTS = {
    return_null_on_missing: "missing_module_throws",
    fixed_list_scan: "every_vm_harness_installs_hook",
    unpinned_grid: "grid_pinned_by_hook",
    hook_wrong_sandbox: "every_vm_harness_installs_hook",
    hook_unreachable: "every_vm_harness_installs_hook",
    hook_after_eval: "every_vm_harness_installs_hook"
};
const args = process.argv.slice(2);
const arg = name => { const a = args.find(x => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : null; };
const mutant = arg("mutant");
if (mutant && !MUTANTS[mutant]) {
    console.error(`HARNESS unknown mutant "${mutant}" (known: ${Object.keys(MUTANTS).join(", ")})`);
    process.exit(2);
}
const only = arg("only") ? arg("only").split(",") : null;
const keep = args.includes("--keep") || process.env.WG0044_KEEP_NW_SNAPSHOT === "1";

// The harnesses the plan names (WORK-GATE wave 2B, lane-db change 1) and the ones the rule must leave out.
const KNOWN_HITS = ["tools/test_new_game_year0.js", "tools/test_worldgen_quickfixes.js", "tools/sim/test_underground_year0.js",
    "tools/test_fluid_correctness_lane_cw.js", "tools/worldgen/test_vertical_biome_coupling.js", "tools/society/test_person_identity.js",
    "tools/sim/test_sim_forward_guard.js", "tools/dev/sim_forward.js", "tools/bench_underground_gen.js", "tools/bench_vertical_worldgen.js"];
const KNOWN_NOT_HITS = ["tools/test_autonomous_project_dispatch.js", "tools/test_project_construction_loop.js",
    "tools/test_settlement_projects.js", "tools/test_survival_needs_loop.js", "tools/sim/test_units.js",
    "tools/bench_history_demographics.js"];

const read = file => fs.readFileSync(file, "utf8");
function replaceOnce(source, from, to, what) {
    const n = source.split(from).length - 1;
    if (n !== 1) throw new Error(`HARNESS ${what}: target found ${n} times`);
    return source.replace(from, to);
}

/** A tools/lib module compiled afresh from (possibly mutated) text, so the real file and require cache stay untouched. */
function freshModule(file, edit) {
    const m = new Module(file, module);
    m.filename = file;
    m.paths = Module._nodeModulePaths(path.dirname(file));
    m._compile(edit ? edit(read(file)) : read(file), file);
    return m.exports;
}

function loadHook() {
    if (mutant !== "unpinned_grid") return simHook;
    return freshModule(HOOK_FILE, src => replaceOnce(src, `if (grid === "pinned") {`, "if (false) {", "mutant unpinned_grid"));
}

function loadScan() {
    const scan = freshModule(SCAN_FILE);
    if (mutant !== "fixed_list_scan") return scan;
    // The old way: a fixed list of known harnesses, kept to the ones that exist under the root.
    return Object.assign({}, scan, {
        scan: opts => {
            const root = path.resolve((opts && opts.root) || ROOT);
            const hits = KNOWN_HITS.filter(f => fs.existsSync(path.join(root, f))).map(file => ({ file, targets: [] }));
            return { root, scanned: hits.length, hits };
        }
    });
}

function worldSource(edit) {
    let src = read(WORLD_FILE);
    if (mutant === "return_null_on_missing") {
        src = replaceOnce(src, "        const file = simResolve(name);\n",
            "        let file;\n        try { file = simResolve(name); } catch (_) { return null; }\n", "mutant return_null_on_missing");
    }
    return edit ? edit(src) : src;
}

/** The globals DEUS_World.js needs to load on its own (the subset of tools/test_32_levels_generation.js it uses). */
function makeEnv(parameters) {
    const env = {
        window: null, UF: {}, DEUS: {}, Math: Object.create(Math), console, performance,
        PluginManager: { parameters: name => (parameters && parameters[name]) || {}, registerCommand: () => {} },
        DataManager: { _databaseFiles: [], onLoad: () => {}, isBattleTest: () => false, isEventTest: () => false },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        Input: { keyMapper: {} }, TouchInput: {},
        ImageManager: { loadTileset: () => ({}), loadCharacter: () => ({}), isBigCharacter: () => true },
        SceneManager: { _scene: null, goto() {} },
        Utils: { isOptionValid: () => false, encodeURI: s => s },
        Tilemap: function() {},
        $gameSystem: {}, $gameScreen: {}, $gameTimer: {}, $gameSwitches: {}, $gameVariables: {}, $gameSelfSwitches: {},
        $gameActors: {}, $gameParty: {}
    };
    env.window = env;
    for (const name of ["Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_Map", "Game_Player",
        "Game_CharacterBase", "Game_Character", "Game_Event", "Spriteset_Map", "Spriteset_Base", "Sprite", "Bitmap"]) {
        env[name] = vm.runInNewContext(`(function ${name}(){})`);
    }
    return env;
}

/** DEUS_World.js evaluated in a fresh, hooked context. Returns the sandbox. */
function loadWorld({ hookOpts = {}, parameters = null, edit = null, before = null } = {}) {
    const env = makeEnv(parameters);
    const originalManager = env.PluginManager;
    simHook.install(env, hookOpts);
    if (mutant === "unpinned_grid") {
        // Remove the real hook's pin before exercising the mutated hook. Keep the normal load path unconditional.
        Object.defineProperty(env, "PluginManager", { value: originalManager, writable: true, configurable: true });
        loadHook().install(env, hookOpts);
    }
    if (before) before(env);
    vm.createContext(env);
    vm.runInContext(worldSource(edit), env, { filename: "DEUS_World.js" });
    return env;
}

const thrown = fn => { try { fn(); return null; } catch (e) { return e; } };

/** Every whole-target evaluation needs a prior install on the same sandbox. */
function installsHook(scanMod, source) {
    return scanMod.classify(source).hit && scanMod.hookFailures(source).length === 0;
}

const PLANTED = `"use strict";
// TEST_ fixture (WG.00.44): a whole-plugin vm harness. It is written to a temporary root, never into tools/.
const fs = require("fs"), path = require("path"), vm = require("vm");
const env = { PluginManager: { parameters: () => ({}) } };
env.window = env;
vm.createContext(env);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "game", "js", "plugins", "DEUS_World.js"), "utf8"), env);
`;
const PLANTED_HOOKED = PLANTED.replace(`env.window = env;\n`, `env.window = env;\nconst simHook = require("./lib/vm_sim_require");\nsimHook.install(env);\n`);

const HOOK_PROVOCATIONS = {
    hook_wrong_sandbox: PLANTED_HOOKED.replace("simHook.install(env);", "simHook.install({});"),
    hook_unreachable: PLANTED_HOOKED.replace("simHook.install(env);", "if (false) simHook.install(env);"),
    hook_after_eval: PLANTED_HOOKED.replace("simHook.install(env);\n", "") + "\nsimHook.install(env);\n"
};

/** Small programs, not filename exceptions: each is classified by its evaluated source. */
function scannerFixtures() {
    const pre = 'const vm = require("vm"), fs = require("fs");\n';
    const readWhole = 'fs.readFileSync("game/js/plugins/DEUS_World.js", "utf8")';
    const source = pre + 'const src = ' + readWhole + ';\n';
    const cases = {
        wrapped_whole: [true, source + 'vm.runInNewContext(`(function(){\\n${src}\\n})();`, {});'],
        wrapped_partial: [false, source + 'vm.runInNewContext(`${src.slice(1)}`, {});'],
        hash_only_with_vm: [false, source + 'require("crypto").createHash("sha256").update(src).digest("hex"); vm.runInNewContext("1+1", {});'],
        hash_and_whole_eval: [true, source + 'require("crypto").createHash("sha256").update(src).digest("hex"); vm.runInNewContext(src, {});'],
        mention_not_read: [false, pre + 'const name = "DEUS_World.js"; vm.runInNewContext("1+1", {});'],
        two_sources_partial_only: [false, source + 'const other = fs.readFileSync("helpers.js", "utf8"); vm.runInNewContext(other + src.slice(1, 30), {});'],
        script_evaluated: [true, source + 'const script = new vm.Script(src); script.runInNewContext({});'],
        script_compiled_only: [false, source + 'const script = new vm.Script(src);'],
        helper_return: [true, pre + 'function readWorld(){ return ' + readWhole + '; } vm.runInNewContext(readWorld(), {});'],
        alias_full: [true, source + 'const a = src, b = a; vm.runInNewContext(b, {});']
    };
    for (const [name, want, suffix] of [
        ['slice_empty', true, '.slice()'],
        ['slice_zero', true, '.slice(0)'],
        ['slice_length', true, '.slice(0, src.length)'],
        ['slice_infinity', true, '.slice(0, Infinity)'],
        ['slice_start', false, '.slice(1)'],
        ['slice_end', false, '.slice(0, -1)'],
        ['substring_full', true, '.substring(0)'],
        ['substring_partial', false, '.substring(1)'],
        ['substr_full', true, '.substr(0)'],
        ['substr_partial', false, '.substr(1, 10)'],
        ['match_whole', true, '.match(/^[\\s\\S]*$/)[0]'],
        ['match_partial', false, '.match(/const Space = [\\s\\S]*?Space\\.Z_STEP_FEET/)[0]']
    ]) {
        cases[name + '_separated'] = [want, source + 'const part = src' + suffix + '; vm.runInNewContext(part, {});'];
        const inlineSuffix = suffix.replace('src.length', readWhole + '.length');
        cases[name + '_chained'] = [want, pre + 'vm.runInNewContext(' + readWhole + inlineSuffix + ', {});'];
    }
    cases.exec_whole = [true, source + 'const all = /^[\\s\\S]*$/.exec(src); vm.runInNewContext(all[0], {});'];
    cases.exec_partial = [false, source + 'const part = /const Space = [\\s\\S]*?Space\\.Z_STEP_FEET/.exec(src); vm.runInNewContext(part[0], {});'];
    return cases;
}

const checks = {
    vm_loader_loads_ledger() {
        const env = loadWorld();
        const sim = env.UF && env.UF.Sim;
        if (!sim || typeof sim.require !== "function") return [false, "UF.Sim.require is missing after DEUS_World.js loads"];
        const ledgerFile = path.join(GAME, "js", "sim", "ledger.js");
        const resolved = sim.resolve("ledger");
        const ledger = sim.require("ledger");
        const hydro = sim.resolve("hydro");
        const sameObject = ledger === require(ledgerFile);
        const ok = resolved === ledgerFile && sameObject && typeof ledger.createLedger === "function" &&
            sim.resolve("ledger.js") === ledgerFile && hydro === path.join(GAME, "js", "sim", "hydro", "index.js") &&
            env.require === undefined;
        return [ok, `resolve("ledger") = ${resolved}; exports createLedger: ${typeof ledger.createLedger}; same object as Node's require: ${sameObject}; ` +
            `resolve("hydro") = ${hydro}; sandbox require left alone: ${env.require === undefined}`];
    },

    missing_module_throws() {
        const env = loadWorld();
        const sim = env.UF && env.UF.Sim;
        if (!sim || typeof sim.require !== "function") return [false, "UF.Sim.require is missing after DEUS_World.js loads"];
        const name = "no_such_module_wg0044";
        let got;
        const err = thrown(() => { got = sim.require(name); });
        const expect = [path.join(GAME, "js", "sim", `${name}.js`), path.join(GAME, "js", "sim", name, "index.js")];
        const named = !!err && expect.every(p => String(err.message).includes(p) && (err.tried || []).includes(p));
        const bad = thrown(() => sim.require("../plugins/DEUS_World"));
        // No hook and no require (a plain browser): still a throw, never null.
        // This browser-only probe evaluates just the loader block, not the whole target plugin.
        // Every whole-plugin load in this harness still has an unconditional hook.
        const source = worldSource();
        const start = source.indexOf("    const SIM_NAME =");
        const end = source.indexOf("    // World creation", start);
        if (start < 0 || end <= start) throw new Error("HARNESS missing Sim block boundaries");
        const bare = { UF: {} };
        bare.window = bare;
        vm.runInNewContext(source.slice(start, end), bare);
        let bareGot;
        const bareErr = thrown(() => { bareGot = bare.UF.Sim.require("ledger"); });
        const ok = named && err.code === "DEUS_SIM_MODULE_MISSING" && got === undefined &&
            !!bad && bad.name === "TypeError" && !!bareErr && bareErr.code === "DEUS_SIM_MODULE_MISSING" && bareGot === undefined;
        return [ok, err ? `threw ${err.code}: ${err.message}; "../plugins/DEUS_World" -> ${bad && bad.name}; no host -> ${bareErr ? bareErr.message : "returned " + bareGot}`
            : `returned ${got === null ? "null" : typeof got} instead of throwing`];
    },

    every_vm_harness_installs_hook() {
        const scanMod = loadScan();
        const real = scanMod.scan({ root: ROOT });
        const missing = real.hits.flatMap(h => (h.hookFailures || scanMod.hookFailures(read(path.join(ROOT, h.file)),
            { root: ROOT, filename: path.join(ROOT, h.file) }))
            .map(problem => h.file + ": " + JSON.stringify(problem)));
        // Each fixture is discovered by the real directory scan. The mutant path plants a bad install
        // as a required harness, so the named check itself (not only an inverted assertion) turns red.
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wg0044-plant-"));
        const fixtureResults = [];
        try {
            fs.mkdirSync(path.join(tmp, "tools"));
            const fixtures = { missing: [PLANTED, false], hooked: [PLANTED_HOOKED, true],
                context_alias: [PLANTED_HOOKED.replace("vm.createContext(env);", "const ctx = vm.createContext(env);")
                    .replace('"utf8"), env);', '"utf8"), ctx);'), true],
                wrong_context_alias: [PLANTED_HOOKED.replace("vm.createContext(env);", "const ctx = vm.createContext({});")
                    .replace('"utf8"), env);', '"utf8"), ctx);'), false],
                shadowed_sandbox: [PLANTED_HOOKED.replace("simHook.install(env);", "{ const env = {}; simHook.install(env); }"), false],
                reassigned_sandbox: [PLANTED_HOOKED.replace("const env =", "let env =")
                    .replace("simHook.install(env);", "simHook.install(env); env = {};"), false],
                dormant_install: [PLANTED_HOOKED.replace("simHook.install(env);", "function neverCalled() { simHook.install(env); }"), false],
                conditional_install: [PLANTED_HOOKED.replace("simHook.install(env);", "if (process.env.TEST_HOOK) simHook.install(env);"), false],
                ...Object.fromEntries(Object.entries(HOOK_PROVOCATIONS).map(([k, src]) => [k, [src, false]])) };
            for (const [name, [source, expected]] of Object.entries(fixtures)) {
                const file = "tools/test_" + name + ".js";
                fs.writeFileSync(path.join(tmp, file), source);
                const found = scanMod.scan({ root: tmp }).hits.some(h => h.file === file);
                const accepted = installsHook(scanMod, source);
                fixtureResults.push({ name, found, accepted, expected });
            }
            if (HOOK_PROVOCATIONS[mutant]) {
                const file = "tools/test_required_provocation.js";
                fs.writeFileSync(path.join(tmp, file), HOOK_PROVOCATIONS[mutant]);
                const hit = scanMod.scan({ root: tmp }).hits.find(h => h.file === file);
                if (!hit) missing.push(mutant + ": planted target evaluation not discovered");
                else missing.push(...scanMod.hookFailures(read(path.join(tmp, file)))
                    .map(problem => mutant + ": " + JSON.stringify(problem)));
            }
        } finally {
            fs.rmSync(tmp, { recursive: true, force: true });
        }
        const ok = real.hits.length > 0 && missing.length === 0 &&
            fixtureResults.every(r => r.found && r.accepted === r.expected);
        return [ok, real.hits.length + " hits in " + real.scanned + " files; hook proof failures: " +
            (missing.join(" | ") || "none") + "; fixtures: " + JSON.stringify(fixtureResults)];
    },

    scan_finds_known_harnesses() {
        const scanMod = loadScan();
        const files = scanMod.scan({ root: ROOT }).hits.map(h => h.file);
        const absent = KNOWN_HITS.filter(f => !files.includes(f));
        const wrong = KNOWN_NOT_HITS.filter(f => files.includes(f));
        // The rule on small fixtures: a module-name list, an evaluation kept in a const and a mutant's whole-source transform are hits; a slice, a
        // comment-only mention and a file without vm are not.
        const cases = {
            module_list: [true, `const vm = require("vm"), fs = require("fs");\nconst MODULES = ["Core", "Levels"];\nconst ctx = vm.createContext({});\nfor (const m of MODULES) vm.runInContext(fs.readFileSync("game/js/plugins/DEUS_" + m + ".js", "utf8"), ctx);\n`],
            assigned_eval: [true, `const vm = require("vm"), fs = require("fs");\nconst src = fs.readFileSync("game/js/plugins/DEUS_Levels.js", "utf8");\nconst result = vm.runInNewContext(src, {});\nconst head = result.slice(0, 1);\n`],
            mutant_transform: [true,`const vm = require("node:vm"), fs = require("fs");\nconst src = fs.readFileSync("game/js/plugins/DEUS_Fluid.js", "utf8");\nvm.runInNewContext(src.replace("a", "b"), {});\n`],
            source_slice: [false, `const vm = require("vm"), fs = require("fs");\nfunction space() {\n    const file = "game/js/plugins/DEUS_World.js";\n    const source = fs.readFileSync(file, "utf8");\n    const block = source.match(/const Space = \\{[\\s\\S]*?\\};/);\n    return vm.runInNewContext(block[0], {});\n}\n`],
            comment_only: [false, `const vm = require("vm");\n// stands in for DEUS_World ("DEUS_World.js")\nvm.runInNewContext("1 + 1", {});\n`],
            no_vm: [false, `const fs = require("fs");\nconst src = fs.readFileSync("game/js/plugins/DEUS_World.js", "utf8");\nconsole.log(src.length);\n`]
        };
        Object.assign(cases, scannerFixtures());
        const ruleWrong = Object.entries(cases).filter(([, [want, src]]) => scanMod.classify(src).hit !== want).map(([k]) => k);
        const ok = files.length > 0 && absent.length === 0 && wrong.length === 0 && ruleWrong.length === 0;
        return [ok, `${files.length} hits; known hits missing: ${absent.join(", ") || "none"}; excluded files found: ${wrong.join(", ") || "none"}; ` +
            `fixtures: ${Object.keys(cases).length}; classified wrong: ${ruleWrong.join(", ") || "none"}`];
    },

    opener_registry() {
        const env = loadWorld();
        const sim = env.UF && env.UF.Sim;
        if (!sim || typeof sim.registerMatterOpener !== "function" || typeof sim.matterOpeners !== "function") {
            return [false, "UF.Sim.registerMatterOpener / matterOpeners missing after DEUS_World.js loads"];
        }
        // A later plugin registers at load time, before UF.Levels exists (DEUS_WorldGen is plugins.js index 6).
        vm.runInContext(`UF.Sim.registerMatterOpener("water", () => "w"); UF.Sim.registerMatterOpener("core", () => "c");
            UF.Sim.registerMatterOpener("Air", () => "a"); globalThis.__levelsAtRegister = typeof UF.Levels;`, env);
        const list = sim.matterOpeners();
        const names = list.map(o => o.name);
        const dup = thrown(() => sim.registerMatterOpener("core", () => "again"));
        const badFn = thrown(() => sim.registerMatterOpener("x", null));
        const badName = thrown(() => sim.registerMatterOpener("", () => 0));
        list.length = 0;
        const after = sim.matterOpeners();
        const ok = names.join() === "Air,core,water" && after.map(o => o.fn()).join() === "a,c,w" &&
            !!dup && /already registered/.test(dup.message) && after.length === 3 &&
            !!badFn && badFn.name === "TypeError" && !!badName && badName.name === "TypeError" &&
            Object.isFrozen(after[0]) && env.__levelsAtRegister === "undefined";
        return [ok, `order ${names.join(", ")}; duplicate "core": ${dup ? dup.message : "accepted"}; bad fn: ${badFn && badFn.name}; ` +
            `empty name: ${badName && badName.name}; registry after a caller emptied its copy: ${after.length}; UF.Levels at register: ${env.__levelsAtRegister}`];
    },

    grid_pinned_by_hook() {
        // A fixture copy of DEUS_World.js whose JS fallback is a 3x3 grid (what lane-de's flip will do).
        const three = src => replaceOnce(replaceOnce(src, `areasX: num("AreasX", 1),`, `areasX: num("AreasX", 3),`, "fixture AreasX"),
            `areasY: num("AreasY", 1),`, `areasY: num("AreasY", 3),`, "fixture AreasY");
        const grid = env => `${env.UF.World.config.areasX}x${env.UF.World.config.areasY}`;
        const pinned = grid(loadWorld({ edit: three }));
        const shipped = grid(loadWorld({ edit: three, hookOpts: { grid: "shipped" } }));
        const explicit = grid(loadWorld({ edit: three, parameters: { DEUS_World: { AreasX: "2" } } }));
        const late = grid(loadWorld({ edit: three, before: env => { env.PluginManager = { parameters: () => ({}), registerCommand() {} }; } }));
        const legacy = grid(loadWorld({ edit: three, parameters: { UF_World: { AreasX: "4", AreasY: "" } } }));
        const real = grid(loadWorld());
        const badGrid = thrown(() => loadHook().install({}, { grid: "3x3" }));
        const ok = pinned === "1x1" && shipped === "3x3" && explicit === "2x1" && late === "1x1" && legacy === "4x1" && real === "1x1" && !!badGrid;
        return [ok, `fallback-3 fixture: {} -> ${pinned}, grid "shipped" -> ${shipped}, AreasX "2" -> ${explicit}, ` +
            `PluginManager set after install -> ${late}, legacy UF_World AreasX "4" -> ${legacy}; real DEUS_World.js -> ${real}; grid "3x3" refused: ${!!badGrid}`];
    },

    nwjs_loader() {
        if (!fs.existsSync(NW)) return [false, `nw.exe not found at ${NW}`];
        const snap = fs.mkdtempSync(path.join(os.tmpdir(), "wg0044-nw-"));
        const game = path.join(snap, "game");
        const skip = new Set([path.join(GAME, "save"), path.join(GAME, "test_output"), path.join(GAME, "game_runtime.log")]);
        try {
            fs.cpSync(GAME, game, { recursive: true, filter: src => !skip.has(src) });
            fs.writeFileSync(path.join(game, "js", "plugins", "TEST_SimLoaderConsole.js"), CONSOLE_PLUGIN);
            fs.writeFileSync(path.join(game, "js", "plugins", "TEST_SimLoaderSuite.js"), SUITE_PLUGIN);
            // The console recorder goes first (before DEUS_Core), the suite last (after DEUS_Test).
            const pluginsJs = path.join(game, "js", "plugins.js");
            const text = read(pluginsJs).replace(/^\uFEFF/, "");
            const list = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
            list.unshift({ name: "TEST_SimLoaderConsole", status: true, description: "[TEST_SimLoaderConsole]", parameters: {} });
            fs.writeFileSync(pluginsJs, `// Generated by RPG Maker.\n// Do not edit this file directly.\nvar $plugins =\n[\n${list.map(p => JSON.stringify(p)).join(",\n")}\n];\n`);
            const add = spawnSync(process.execPath, [path.join(__dirname, "add_test_plugin.js"), pluginsJs, "DEUS_Test", "TEST_SimLoaderSuite"], { encoding: "utf8" });
            if (add.status !== 0) return [false, `add_test_plugin failed: ${add.stderr || add.stdout}`];
            const run = spawnSync(process.execPath, [path.join(__dirname, "run_tests.js"), "sim_loader", "--game", game], { encoding: "utf8", timeout: 420000 });
            const resultsFile = path.join(game, "test_output", "results.txt");
            const results = fs.existsSync(resultsFile) ? read(resultsFile) : "";
            const logFile = path.join(game, "game_runtime.log");
            const log = fs.existsSync(logFile) ? read(logFile) : "";
            const expected = path.join(game, "js", "sim", "ledger.js");
            const logLine = log.split(/\r?\n/).find(l => l.includes(`[SIM] UF.Sim.require("ledger") resolved `)) || "";
            const resolved = logLine.split(" resolved ")[1] || "";
            const samePath = resolved !== "" && path.resolve(resolved).toLowerCase() === expected.toLowerCase();
            const passes = (results.match(/^PASS sim_loader\./gm) || []).length;
            const fails = results.split(/\r?\n/).filter(l => /^(FAIL|ERROR|HARNESS)/.test(l));
            const ok = run.status === 0 && /^RESULT: \d+ passed, 0 failed/m.test(results) && passes >= 5 && fails.length === 0 && samePath;
            if (keep) console.log(`  kept snapshot: ${snap}`);
            return [ok, `run_tests exit ${run.status}; ${passes} sim_loader PASS lines; ${fails.length ? "problems: " + fails.slice(0, 4).join(" | ") : "no FAIL/ERROR lines"}; ` +
                `log: ${logLine ? logLine.trim() : "no [SIM] ledger line"}; expected ${expected}`];
        } finally {
            if (!keep) fs.rmSync(snap, { recursive: true, force: true });
        }
    }
};

// Loaded first in the snapshot: records every console.error from then on, for the suite's no_console_errors check.
const CONSOLE_PLUGIN = `// TEST_SimLoaderConsole (WG.00.44, tools/test_sim_loader.js writes it into a snapshot only).
(() => {
    const seen = window.__wg0044ConsoleErrors = [];
    const original = console.error;
    console.error = function(...a) { seen.push(a.map(String).join(" ")); return original.apply(this, a); };
})();
`;

// Loaded after DEUS_Test in the snapshot. In the game, UF.Sim.require resolves from the game folder (NW.js's working
// directory) and writes the resolved path to game_runtime.log.
const SUITE_PLUGIN = `// TEST_SimLoaderSuite (WG.00.44, tools/test_sim_loader.js writes it into a snapshot only).
(() => {
    if (!window.DEUS || !DEUS.Test) return;
    DEUS.Test.suite("sim_loader", async t => {
        const sim = window.UF && UF.Sim;
        t.check("uf_sim_present", !!(sim && typeof sim.require === "function" && typeof sim.matterOpeners === "function"), "UF.Sim from DEUS_World.js");
        if (!sim || typeof sim.require !== "function") return;
        const expected = require("path").join(process.cwd(), "js", "sim", "ledger.js");
        let file = null, mod = null, err = null;
        try { file = sim.resolve("ledger"); mod = sim.require("ledger"); } catch (e) { err = e; }
        t.check("ledger_resolved_from_game_folder", file === expected, "resolved " + file + ", expected " + expected + (err ? ", error " + err.message : ""));
        t.check("ledger_loaded", !!(mod && typeof mod.createLedger === "function"), "createLedger: " + (mod && typeof mod.createLedger));
        let missing = null, got;
        try { got = sim.require("no_such_module_wg0044"); } catch (e) { missing = e; }
        t.check("missing_module_throws", !!missing && missing.code === "DEUS_SIM_MODULE_MISSING", missing ? missing.message : "returned " + got);
        await t.waitFrames(30);
        t.screenshot("map");
        const errors = (window.__wg0044ConsoleErrors || []).concat(t.errorsSoFar());
        t.check("no_console_errors", errors.length === 0, errors.length ? errors.slice(0, 5).join(" | ") : "none since TEST_SimLoaderConsole loaded (plugins.js index 0)");
    }, { isDefault: false });
})();
`;

let failed = 0, ran = 0;
const names = Object.keys(checks).filter(n => !only || only.includes(n));
if (only) {
    const unknown = only.filter(n => !checks[n]);
    if (unknown.length) { console.error(`HARNESS unknown check ${unknown.join(", ")}`); process.exit(2); }
}
if (mutant) console.log(`MUTANT ${mutant} (expected to fail ${MUTANTS[mutant]})`);
for (const name of names) {
    let ok, detail;
    try {
        [ok, detail] = checks[name]();
    } catch (e) {
        ok = false;
        detail = `threw ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`;
    }
    ran++;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"} ${name} - ${detail}`);
}
console.log(`RESULT: ${ran - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
