#!/usr/bin/env node
"use strict";

/**
 * tools/dev/sim_forward.js — dev-only simulate-forward (SIM.10.02, INV-SIM-01).
 *
 * Copies a JSON save, or builds a seeded standard Year-0 world the way the
 * headless new-game harness does, then runs UF.HistoricalDemographics forward
 * N years on the copy. The input file is never written. This file is not a
 * plugin and is not called from New Game.
 *
 *   node tools/dev/sim_forward.js --seed 424242 --years 3 --output out.json
 *   node tools/dev/sim_forward.js --input save.json --years 3 --output out.json
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function findRoot() {
    const starts = [__dirname];
    const cwd = path.resolve(process.cwd());
    if (cwd !== path.resolve(__dirname)) starts.push(cwd);
    for (const start of starts) {
        let dir = path.resolve(start);
        for (let i = 0; i < 12; i++) {
            if (fs.existsSync(path.join(dir, "game", "js", "plugins", "DEUS_HistoricalDemographics.js"))) return dir;
            const parent = path.dirname(dir);
            if (parent === dir) break;
            dir = parent;
        }
    }
    throw new Error("cannot find the game plugins from " + __dirname);
}

const ROOT = findRoot();
// WG.00.44 hook, from the root found above: test_sim_forward_guard runs mutated copies of this file from a temp folder.
const simHook = require(path.join(ROOT, "tools", "lib", "vm_sim_require"));
const FORMAT = "deus.sim_forward.v1";
const PLUGINS = ["DEUS_Core", "DEUS_World", "DEUS_WorldGen", "DEUS_Factions", "DEUS_History", "DEUS_Levels", "DEUS_Dnd5e", "DEUS_Callings", "DEUS_HistoricalDemographics"];
const SEED_MAX = 0x7fffffff;
const YEARS_MAX = 10000;
const MAX_SAVE_BYTES = 64 * 1024 * 1024;

let headless = null;

function usage() {
    return [
        "Usage: node tools/dev/sim_forward.js (--input <save.json> | --seed <n>) --years <n> --output <out.json>",
        "Copies a save, or a seeded Year-0 world, and runs the demographic history forward on the copy.",
        "Refuses to write the input path. Dev-only: not part of the game, and not run at New Game."
    ].join("\n");
}

function parseBound(value, min, max, label) {
    if (value === undefined || !/^\d+$/.test(value)) throw new Error(label + " must be an integer " + min + ".." + max);
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(label + " must be an integer " + min + ".." + max);
    return n;
}

function parseArgs(argv) {
    const out = { input: null, output: null, seed: null, years: null, help: false };
    for (let i = 0; i < argv.length; i++) {
        const key = argv[i];
        if (key === "--help" || key === "-h") { out.help = true; continue; }
        if (key !== "--input" && key !== "--output" && key !== "--seed" && key !== "--years") throw new Error("unknown argument " + key);
        const value = argv[++i];
        if (value === undefined) throw new Error("missing value for " + key);
        if (key === "--input") out.input = value;
        else if (key === "--output") out.output = value;
        else if (key === "--seed") out.seed = parseBound(value, 0, SEED_MAX, "seed");
        else out.years = parseBound(value, 0, YEARS_MAX, "years");
    }
    return out;
}

function sameFile(a, b) {
    if (!a || !b) return false;
    const left = path.resolve(a);
    const right = path.resolve(b);
    const fold = process.platform === "win32" ? (s) => s.toLowerCase() : (s) => s;
    if (fold(left) === fold(right)) return true;
    try {
        if (fs.existsSync(left) && fs.existsSync(right) && fs.statSync(left).isFile() && fs.statSync(right).isFile()) {
            return fold(fs.realpathSync(left)) === fold(fs.realpathSync(right));
        }
    } catch (e) { /* unresolved paths are not the same file */ }
    return false;
}

// Single refusal site. The guard test's overwrite mutant removes this throw.
function assertDistinctPaths(inputPath, outputPath) {
    if (inputPath && sameFile(inputPath, outputPath)) {
        throw new Error("refusing to write over the input save");
    }
}

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function decodeSave(bytes) {
    let text = bytes.toString("utf8");
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    try { return JSON.parse(text); }
    catch (e) { throw new Error("input save is not JSON"); }
}

function worldFromSave(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("save is not a JSON object");
    if (typeof value.format === "string") {
        if (value.format !== FORMAT) throw new Error("unsupported save format " + value.format);
        if (!value.world || typeof value.world !== "object") throw new Error("snapshot is missing world");
        return value.world;
    }
    if (value.ufWorld && typeof value.ufWorld === "object") return value.ufWorld;
    if (value.history && value.history.demographics) return value;
    throw new Error("save has no world with a history.demographics ledger");
}

function tilemapStatics() {
    const core = fs.readFileSync(path.join(ROOT, "game", "js", "rmmz_core.js"), "utf8");
    const start = core.indexOf("Tilemap.TILE_ID_B = 0;");
    const table = core.indexOf("Tilemap.WATERFALL_AUTOTILE_TABLE = [");
    const end = core.indexOf("];", table) + 2;
    if (start < 0 || table < 0 || end < 2) throw new Error("rmmz_core.js Tilemap statics not found");
    return "function Tilemap() {}\n" + core.slice(start, end);
}

function loadHeadless() {
    if (headless) return headless;
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
    const sources = PLUGINS.map((name) => fs.readFileSync(path.join(ROOT, "game", "js", "plugins", name + ".js"), "utf8"));
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
    if (errors.length) throw new Error("plugin load error: " + errors[0].split("\n")[0]);
    headless = { env, errors };
    return headless;
}

function freshYear0(seed) {
    const { env, errors } = loadHeadless();
    errors.length = 0;
    // Standard New Game payload. The year stays 0 here; N is applied later, on the copy.
    env.UF.NewGameSetup = { year: 0, seed: seed, faction: "human", worldSize: 256, fogOfWar: false };
    if (!env.$ufTime) throw new Error("headless clock is missing");
    env.$ufTime.year = 777;
    const world = env.UF.World.newWorld(seed);
    if (errors.length) throw new Error("year-0 world failed: " + errors[0].split("\n")[0]);
    const history = world && world.history;
    const demo = history && history.demographics;
    if (!history || history.simulated !== false || !demo || demo.yearsSimulated !== 0 || demo.currentYear !== 0 || demo.startYear !== 0) {
        throw new Error("seeded world is not a Year-0 new game");
    }
    if (env.$ufTime.year !== 0) throw new Error("seeded world moved the new-game clock off year 0");
    return world;
}

function census(world, summary) {
    const demo = world.history.demographics;
    const popBy = {};
    for (const site of demo.sites) popBy[site.factionId] = (popBy[site.factionId] || 0) + site.population;
    const byFaction = {};
    for (const id of Object.keys(popBy).sort()) byFaction[id] = popBy[id];
    const list = world.factions && Array.isArray(world.factions.list) ? world.factions.list : [];
    const factions = list.length || Object.keys(demo.factions).length;
    let livingFactions = 0;
    if (list.length) {
        for (const faction of list) if ((popBy[faction.id] || 0) > 0) livingFactions++;
    } else {
        livingFactions = Object.values(popBy).filter((n) => n > 0).length;
    }
    return {
        year: summary.currentYear,
        population: summary.living,
        factions: factions,
        livingFactions: livingFactions,
        byFaction: byFaction
    };
}

// Projects the ledger onto the save fields History.materialize already publishes.
// Does not place units. history.rulers and world.units stay as they were loaded.
function publish(world, demographics) {
    const popBy = {};
    for (const site of demographics.sites) popBy[site.factionId] = (popBy[site.factionId] || 0) + site.population;
    const list = world.factions && world.factions.list;
    if (Array.isArray(list)) {
        for (const faction of list) {
            if (Object.prototype.hasOwnProperty.call(popBy, faction.id)) faction.population = popBy[faction.id];
        }
    }
    demographics.living = demographics.people.filter((p) => p.died === null).map((p) => p.id);
    demographics.graveyard = demographics.people.filter((p) => p.died !== null).map((p) => p.id);
    world.history.years = demographics.yearsSimulated;
    world.history.worldAge = demographics.yearsSimulated;
    world.history.simulated = demographics.yearsSimulated > 0;
    world.history.events = demographics.events.map((event) => ({
        year: event.year,
        type: event.type,
        factions: [event.factionId],
        site: demographics.sites[event.siteId].sourceSiteId,
        personIds: event.personIds.slice(),
        text: event.text
    }));
}

function advanceCopy(world, years, UF) {
    const demographics = world.history && world.history.demographics;
    if (!demographics) throw new Error("save has no history.demographics ledger to advance");
    const before = census(world, UF.HistoricalDemographics.summary(demographics));
    UF.HistoricalDemographics.simulate(demographics, years);
    publish(world, demographics);
    const after = census(world, UF.HistoricalDemographics.summary(demographics));
    return { before, after };
}

function commitOutput(targetPath, text) {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = targetPath + ".tmp";
    fs.writeFileSync(tmp, text);
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    fs.renameSync(tmp, targetPath);
}

function printSummary(yearsRun, before, after, outputPath) {
    console.log("sim_forward: years_run=" + yearsRun);
    console.log("sim_forward: year_before=" + before.year + " year_after=" + after.year);
    console.log("sim_forward: population_before=" + before.population + " population_after=" + after.population);
    console.log("sim_forward: factions_before=" + before.factions + " factions_after=" + after.factions);
    console.log("sim_forward: living_factions_before=" + before.livingFactions + " living_factions_after=" + after.livingFactions);
    console.log("sim_forward: output=" + path.resolve(outputPath));
}

function main(argv) {
    const args = parseArgs(argv);
    if (args.help) {
        console.log(usage());
        return;
    }
    if (args.years === null || !args.output) throw new Error("pass --years and --output");
    if ((args.input ? 1 : 0) + (args.seed !== null ? 1 : 0) !== 1) throw new Error("pass exactly one of --input or --seed");
    const outputPath = path.resolve(args.output);
    const inputPath = args.input ? path.resolve(args.input) : null;
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) throw new Error("output path is a directory");
    let inputBytes = null;
    if (inputPath) {
        if (!fs.existsSync(inputPath)) throw new Error("input save not found");
        if (!fs.statSync(inputPath).isFile()) throw new Error("input save is not a file");
        assertDistinctPaths(inputPath, outputPath);
        inputBytes = Buffer.from(fs.readFileSync(inputPath));
        if (inputBytes.length > MAX_SAVE_BYTES) throw new Error("input save is larger than " + MAX_SAVE_BYTES + " bytes");
    }
    const { env } = loadHeadless();
    let source;
    if (inputPath) source = worldFromSave(decodeSave(inputBytes));
    else source = freshYear0(args.seed);
    const sourceYears = source.history && source.history.demographics ? source.history.demographics.yearsSimulated : null;
    const world = cloneJson(source);
    const advanced = advanceCopy(world, args.years, env.UF);
    if (!source.history || !source.history.demographics || source.history.demographics.yearsSimulated !== sourceYears) {
        throw new Error("source world was modified");
    }
    if (inputPath && !fs.readFileSync(inputPath).equals(inputBytes)) throw new Error("input save changed before the output was written");
    const snapshot = {
        format: FORMAT,
        seed: world.seed,
        yearsRun: args.years,
        before: advanced.before,
        after: advanced.after,
        clock: { year: advanced.after.year },
        world: world
    };
    const text = JSON.stringify(snapshot) + "\n";
    // Single write. The guard test's in-place mutant retargets this call.
    commitOutput(outputPath, text);
    printSummary(args.years, advanced.before, advanced.after, outputPath);
}

if (require.main === module) {
    try { main(process.argv.slice(2)); }
    catch (e) {
        console.error("sim_forward: " + (e && e.message ? e.message : e));
        process.exit(1);
    }
}

module.exports = { FORMAT, parseArgs, worldFromSave, loadHeadless, advanceCopy, sameFile, main };
