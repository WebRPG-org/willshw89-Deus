#!/usr/bin/env node
"use strict";

/**
 * tools/sim/test_underground_year0.js
 *
 * SIM.10.05. A standard New Game on the 32-layer world (INV-SIM-01, year 0).
 * The four peoples DEUS_Factions founds below ground — dwarves and gnomes on -1,
 * tieflings and dragonborn on -2 — each start with a walk to fungal forage, a walk
 * to drinkable water, and, where the species has no darkvision, a walk to a glow-cap.
 * Nothing in that set is created: the forage is fungus the level already grew, moved
 * onto floor the camp can already walk. The layer mapping is the current one (OQ-23).
 *
 * The mutation nulls WorldGen.undergroundYear0. The same checks must then fail.
 *
 * Usage: node tools/sim/test_underground_year0.js
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { performance } = require("perf_hooks");

const ROOT = path.resolve(__dirname, "..", "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const ARG_SEEDS = process.argv.slice(2).map(Number).filter(n => Number.isInteger(n) && n > 0);
const SEEDS = ARG_SEEDS.length ? ARG_SEEDS : Array.from({ length: 20 }, (_, i) => i + 1);
const LAYER = { dwarf: -1, gnome: -1, dragonborn: -2, tiefling: -2 };
const PLUGINS_USED = ["DEUS_Core", "DEUS_World", "DEUS_WorldGen", "DEUS_Factions", "DEUS_History", "DEUS_Levels",
    "DEUS_Dnd5e", "DEUS_Callings", "DEUS_HistoricalDemographics"];

function readPlugin(name) {
    return fs.readFileSync(path.join(PLUGINS, name + ".js"), "utf8");
}
function tilemapStatics() {
    const core = fs.readFileSync(path.join(ROOT, "game", "js", "rmmz_core.js"), "utf8");
    const start = core.indexOf("Tilemap.TILE_ID_B = 0;");
    const table = core.indexOf("Tilemap.WATERFALL_AUTOTILE_TABLE = [");
    const end = core.indexOf("];", table) + 2;
    if (start < 0 || table < 0 || end < 2) throw new Error("rmmz_core.js Tilemap statics not found");
    return "function Tilemap() {}\n" + core.slice(start, end);
}
function applyOverrides(src, overrides, file) {
    for (const [anchor, replacement] of Object.entries(overrides || {})) {
        const hits = src.split(anchor).length - 1;
        if (hits !== 1) throw new Error(`Override anchor found ${hits} times in ${file}: ${anchor}`);
        src = src.replace(anchor, () => replacement);
    }
    return src;
}
function loadRuntime(overridesByPlugin) {
    const ns = {};
    const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "UF_WorldCatalog.json"), "utf8"));
    const env = {
        window: null, UF: ns, DEUS: ns, Math, performance,
        $ufWorldCatalog: catalog, $deusWorldCatalog: catalog,
        PluginManager: { parameters: () => ({}), registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false,
            makeSaveContents: () => ({}), extractSaveContents() {} },
        Input: { keyMapper: {} }, TouchInput: {}, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 }, $gameMap: { mapId: () => 0 }, $gamePlayer: {},
        $gameSystem: {}, $gameMessage: { isBusy: () => false }, ImageManager: {}, Utils: { isOptionValid: () => false },
        document: { title: "" }, addEventListener() {},
        console: { log() {}, warn() {}, error(...a) { env._errors.push(a.map(x => (x && x.stack) || String(x)).join(" ")); } },
        _errors: []
    };
    env.window = env;
    const sources = PLUGINS_USED.map(n => applyOverrides(readPlugin(n), (overridesByPlugin || {})[n], n + ".js"));
    const classes = new Set(["Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_DEUSTime"]);
    const protoRe = /\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype(?:\.([A-Za-z0-9_]+))?/g;
    for (const s of sources) for (const m of s.matchAll(protoRe)) classes.add(m[1]);
    for (const c of classes) env[c] = function() {};
    for (const s of sources) for (const m of s.matchAll(protoRe)) {
        if (m[2]) env[m[1]].prototype[m[2]] = function() {};
    }
    const ctx = vm.createContext(env);
    vm.runInContext(["Math", "Object", "Array", "Number", "String", "Boolean", "Map", "Set", "JSON", "Date",
        "Uint8Array", "Uint16Array", "Int16Array", "Int32Array", "Float32Array", "performance", "window"]
        .map(n => `const ${n} = globalThis.${n};`).join("\n"), ctx);
    vm.runInContext(tilemapStatics(), ctx, { filename: "rmmz_core.js#Tilemap-statics" });
    PLUGINS_USED.forEach((n, i) => vm.runInContext(sources[i], ctx, { filename: n + ".js", timeout: 120000 }));
    return env;
}

const speciesRef = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "srd5_1", "species_reference.json"), "utf8"));
function needsLight(speciesId) {
    const id = String(speciesId || "").toLowerCase().replace(/-/g, "_");
    const row = (speciesRef.species || []).find(s => s.id === id);
    return !row || row.darkvisionFeet === 0;
}

function survey(env, seed) {
    if (env.UF.Levels && typeof env.UF.Levels.invalidateFloods === "function") env.UF.Levels.invalidateFloods();
    if (env.UF.World && typeof env.UF.World.clearPeekCache === "function") env.UF.World.clearPeekCache();
    env._errors.length = 0;
    env.UF.NewGameSetup = { year: 0, seed, faction: "human" };
    const world = env.UF.World.newWorld(seed);
    const L = env.UF.Levels, W = env.UF.World, cat = env.$ufWorldCatalog;
    const objects = cat.objects || [];
    const foodTypes = new Set();
    const itemFood = new Set((((cat.items || {}).types) || []).filter(t => t && t.food).map(t => t.id));
    let glowType = 0;
    objects.forEach((o, i) => {
        if (!o) return;
        if (o.id === "glow_caps") glowType = i + 1;
        if (!(o.tags || []).includes("fungus")) return;
        const yieldsFood = Object.values(o.actions || {}).some(a => Object.keys(a.yields || {}).some(id => itemFood.has(id)));
        if (yieldsFood) foodTypes.add(i + 1);
    });
    const size = world.size;
    const built = new Map();
    const levelGrid = (ax, ay, z) => {
        const key = `${ax},${ay},${z}`;
        if (built.has(key)) return built.get(key);
        const map = W.peekArea(ax, ay, z);
        const walk = new Uint8Array(size * size);
        const drink = new Uint8Array(size * size);
        const food = new Uint8Array(size * size);
        const glow = new Uint8Array(size * size);
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            const i = y * size + x;
            const shape = L.shapeCodeAt(ax, ay, x, y, z);
            const stand = shape === 2 || shape >= 4;
            const lava = L.isLavaAt(ax, ay, z, x, y);
            const fluid = L.fluidStateAt(ax, ay, x, y, z);
            const pooled = !!(fluid && fluid !== "FLUID_0_OF_5");
            const typeId = map.ufObjects[i];
            const entry = typeId ? objects[typeId - 1] : null;
            const blocked = !!(entry && entry.passable !== true);
            if (stand && !lava && !pooled && !blocked) walk[i] = 1;
            if (L.isWaterAt(ax, ay, z, x, y) && !lava) drink[i] = 1;
            if (foodTypes.has(typeId)) food[i] = 1;
            if (typeId === glowType) glow[i] = 1;
        }
        const g = { walk, drink, food, glow };
        built.set(key, g);
        return g;
    };
    function reach(g, sx, sy, kind) {
        if (sx < 0 || sy < 0 || sx >= size || sy >= size || !g.walk[sy * size + sx]) return "start-blocked";
        const seen = new Uint8Array(size * size);
        const q = [sy * size + sx];
        seen[sy * size + sx] = 1;
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (let h = 0; h < q.length; h++) {
            const i = q[h];
            if (kind === "food" && g.food[i]) return null;
            if (kind === "glow" && g.glow[i]) return null;
            if (kind === "water" && g.drink[i]) return null;
            const x = i % size, y = (i - x) / size;
            if (kind === "water") {
                for (const [dx, dy] of dirs) {
                    const nx = x + dx, ny = y + dy;
                    if (nx >= 0 && ny >= 0 && nx < size && ny < size && g.drink[ny * size + nx]) return null;
                }
            }
            for (const [dx, dy] of dirs) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
                const ni = ny * size + nx;
                if (seen[ni] || !g.walk[ni]) continue;
                seen[ni] = 1;
                q.push(ni);
            }
        }
        return "dead-end";
    }
    const problems = [];
    const note = (ok, msg) => { if (!ok) problems.push(msg); };
    const zr = world.zRange || {};
    note(zr.zMin === -16 && zr.zMax === 15, `zRange ${zr.zMin}..${zr.zMax} (expected -16..15, 32 layers)`);
    note(env.$ufTime && env.$ufTime.year === 0, `clock year ${env.$ufTime && env.$ufTime.year} (expected 0)`);
    note(env._errors.length === 0, `console errors: ${env._errors.length ? env._errors[0].split("\n")[0] : 0}`);
    const under = (world.factions.list || []).filter(f => f.home && f.home.z < 0);
    const species = under.map(f => f.species).sort();
    note(species.join(",") === "dragonborn,dwarf,gnome,tiefling", `underground species ${species.join(",")} (expected the four, current layers)`);
    for (const f of under) {
        note(f.home.z === LAYER[f.species], `${f.species} layer ${f.home.z} (expected ${LAYER[f.species]})`);
        const units = Object.values(world.units).filter(u => u.data && u.data.faction === f.id && !u.data.dead && (u.z === f.home.z));
        note(units.length >= 8, `${f.species} living founders on z ${f.home.z}: ${units.length} (expected at least 8)`);
        const g = levelGrid(f.home.area.x, f.home.area.y, f.home.z);
        for (const u of units) {
            const who = `${f.species}@${u.x},${u.y},z${u.z}`;
            const food = reach(g, u.x, u.y, "food");
            const water = reach(g, u.x, u.y, "water");
            note(!food, `${who} fungal forage ${food || "reachable"}`);
            note(!water, `${who} drinkable water ${water || "reachable"}`);
            if (needsLight(f.species)) {
                const light = reach(g, u.x, u.y, "glow");
                note(!light, `${who} glow-cap light ${light || "reachable"}`);
            }
        }
    }
    return { seed, problems, factions: under.length };
}

function runSeeds(env, seeds) {
    const failed = [];
    for (const seed of seeds) {
        const t0 = performance.now();
        let result;
        try { result = survey(env, seed); }
        catch (e) { result = { seed, problems: [`threw ${e && e.stack || e}`], factions: 0 }; }
        const tag = result.problems.length ? "FAIL" : "PASS";
        if (result.problems.length) failed.push(result);
        console.log(`  [${tag}] seed ${seed} (${Math.round(performance.now() - t0)} ms, ${result.factions} underground): ${result.problems.length ? result.problems.slice(0, 4).join(" | ") : "food, water, light, paths"}`);
    }
    return failed;
}

function main() {
    console.log("=== UNDERGROUND YEAR-0 VIABILITY (SIM.10.05) ===");
    const t0 = performance.now();
    const env = loadRuntime();
    console.log(`\n--- ${SEEDS.length} seeds, year 0, 32 layers, human player so all four underground peoples found ---`);
    const failed = runSeeds(env, SEEDS);
    const runMutant = !ARG_SEEDS.length;
    let mutantCaught = true;
    if (runMutant) {
        console.log(`\n--- mutation: WorldGen.undergroundYear0 removed ---`);
        const mutant = loadRuntime({
            DEUS_WorldGen: { "const year0 = WorldGen.undergroundYear0;": "const year0 = null;" }
        });
        const mutantFailed = runSeeds(mutant, [1, 7, 18]);
        mutantCaught = mutantFailed.length > 0;
        console.log(`  [${mutantCaught ? "PASS" : "FAIL"}] mutation_fails: ${mutantFailed.length} of 3 seeds failed without the fix (expected at least 1)`);
    }
    const problems = failed.length + (mutantCaught ? 0 : 1);
    console.log(`\n${problems ? "FAIL" : "PASS"} ${failed.length} seed failure(s), mutation ${mutantCaught ? "caught" : "MISSED"} (${Math.round(performance.now() - t0)} ms)`);
    process.exit(problems ? 1 : 0);
}

main();
