#!/usr/bin/env node
"use strict";

/**
 * tools/test_structural_runtime.js
 *
 * NAT.02.01.BRIDGE (lane-nx3). The DEUS_Structural plugin against real World, Objects, Items, Levels, Floors and Fluid
 * in a node vm (the harness of tools/test_structure_fluid.js), with the real event bus and the real shared tick:
 * ticks come only from time:minute, as in the game. No check calls a fall directly: every scenario removes a support
 * through UF.Levels (applyVolumeDamage or setStrata), and the plugin does the rest on its tick.
 *
 *   node tools/test_structural_runtime.js               all checks, then every mutant in a child process
 *   node tools/test_structural_runtime.js --no-sweep    all checks only
 *   node tools/test_structural_runtime.js --mutant=NAME the checks against a mutated plugin (exit 1 when one fails)
 *
 * A sandbox of 37 x 37 cells is painted first (levels -2 and -1 stone, 0 a stone deck, +1 and +2 air), so every
 * scenario stands on known ground. The world is the legacy range -2..2, so the anchors are the stone of level -2, S0.
 *
 * Checks:
 *   plugin_loads                 UF.Structural has its API; "structure" is a handler of the shared tick
 *   subscribed_to_events         it listens to levels:strataChanged, objects:changed and objects:levelChanged
 *   no_frame_hook                loading it changes no update method of Game_Map, Scene_Map, Spriteset_Map, the
 *                                characters or SceneManager
 *   setup_held                   the painted sandbox and the five supported scenario pieces are checked held: the
 *                                queue drains and nothing in the scenarios moves
 *   explain_held                 explain() on a supported block says held, with the anchor on level -2, S0
 *   handlers_enqueue_seeds       mining a support queues seeds during the write
 *   handlers_read_nothing        the handlers read no block, and no tick runs during the write
 *   cave_in_falls                two 3x3 blocks held only by a mined column fall 8 ft onto the deck, exactly
 *   one_commit_per_tick          two single blocks cut free by one mined column are both decided in one tick; their
 *                                falls are committed on two different ticks, and no tick commits twice
 *   structure_fell_once_per_fall one structure:fell event per committed fall
 *   fall_moves_matter_only       solid strata (material byte and HP) are the same multiset before and after; no
 *                                item appears; no uncovered UF.Matter call during the falls
 *   crushed_unit_dies            the unit under the block dies with cause "crushed"; the unit beside it lives
 *   items_relocate_not_destroyed the item under the block moves to a standable cell nearby, with the same count
 *   never_falls_on_budget        a 16 x 16 slab needs more than one tick to check: at least one tick before its fall
 *                                spends the whole budget and commits nothing (pending is not falls)
 *   per_tick_bound               every tick without a commit reads at most 512 blocks; a commit leaves a debt
 *   big_piece_lands              the slab lands rigid on the deck (18 ft)
 *   slab_into_pool_conserves_water  a slab falling into a sealed pool: water mass and volume unchanged, the water is
 *                                pushed up into the vacated cell
 *   fall_writes_no_fluid         no UF.Fluid.setCell call happens during the structure tick
 *   save_load_restarts_checks    the save holds the queued seeds (v 1); a load without them leaves the cut piece in
 *                                place; a load with them makes it fall
 *   observe_mode_commits_nothing mode "observe" decides "falls" and moves nothing
 *   explain_falls                explain() on that cut piece says falls, 8 ft
 *   idle_zero_work               10,000 ticks with an empty queue: no service, no block read, no unit, item, object
 *                                or strata lookup inside the tick
 *   no_errors                    no console.error from the plugin or the engine during the run
 *
 * Mutants (exact text edits of DEUS_Structural.js, compiled in memory; each must match exactly once):
 *   no_subscribe     -> subscribed_to_events        the event handlers are not registered
 *   drop_events      -> handlers_enqueue_seeds      a removed block queues nothing
 *   frame_hook       -> no_frame_hook               the service also runs from Game_Map.update
 *   convert_to_item  -> fall_moves_matter_only      each fallen block also drops a stone item (the old rubble)
 *   uncapped_commit  -> one_commit_per_tick         any number of commits per tick
 *   no_budget        -> never_falls_on_budget       the read budget is unlimited
 *   crush_survives   -> crushed_unit_dies           a crushed unit takes dice instead of dying
 *   items_destroyed  -> items_relocate_not_destroyed  items under a fall are removed
 *   save_nothing     -> save_load_restarts_checks   the save section holds no seeds
 *   observe_commits  -> observe_mode_commits_nothing  observe mode commits anyway
 *   idle_service     -> idle_zero_work              an idle tick still runs the service
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const PLUGIN_PATH = path.join(PLUGINS, "DEUS_Structural.js");
const simHook = require("./lib/vm_sim_require");

const args = process.argv.slice(2);
const MUTANT_ARG = (args.find(a => a.startsWith("--mutant=")) || "").slice("--mutant=".length);
const SWEEP = !MUTANT_ARG && !args.includes("--no-sweep");
const SEED = 20260923;

const MUTANTS = [
    { name: "no_subscribe", check: "subscribed_to_events",
        edits: [["const SUBSCRIBE = true;", "const SUBSCRIBE = false;"]] },
    { name: "drop_events", check: "handlers_enqueue_seeds",
        edits: [["if (was) removed(a.x, a.y, ref.x, ref.y, M.gOf(ref.z, s));", "if (was) { /* MUTANT: removal dropped */ }"]] },
    { name: "frame_hook", check: "no_frame_hook",
        edits: [["if (UF.Sim && typeof UF.Sim.onTick === \"function\") UF.Sim.onTick(\"structure\", TICK_ORDER, onTick);",
            "if (typeof Game_Map !== \"undefined\") { const _mu = Game_Map.prototype.update; Game_Map.prototype.update = function() { _mu.apply(this, arguments); onTick(-1); }; } /* MUTANT */\n" +
            "    if (UF.Sim && typeof UF.Sim.onTick === \"function\") UF.Sim.onTick(\"structure\", TICK_ORDER, onTick);"]] },
    { name: "convert_to_item", check: "fall_moves_matter_only",
        edits: [["        stats.commits++;\n",
            "        stats.commits++;\n        for (const v of plan.vacated) UF.Items.drop({ x: plan.area.x, y: plan.area.y, z: sim().zOfG(v.g) }, v.x, v.y, \"stone\", 1); /* MUTANT */\n"]] },
    { name: "uncapped_commit", check: "one_commit_per_tick",
        edits: [["const COMMITS_PER_TICK = 1;", "const COMMITS_PER_TICK = 1e9;"]] },
    { name: "no_budget", check: "never_falls_on_budget",
        edits: [["const READS_PER_TICK = 512;", "const READS_PER_TICK = 1e9;"]] },
    { name: "crush_survives", check: "crushed_unit_dies",
        edits: [["const CRUSH_LETHAL = true;", "const CRUSH_LETHAL = false;"]] },
    { name: "items_destroyed", check: "items_relocate_not_destroyed",
        edits: [["if (I.putDown(p.id, { x: ax, y: ay, z: p.to.z }, p.to.x, p.to.y)) stats.itemsMoved++;", "if (I.remove(p.id)) stats.itemsMoved++; /* MUTANT */"]] },
    { name: "save_nothing", check: "save_load_restarts_checks",
        edits: [["return { v: SAVE_VERSION, seeds };", "return { v: SAVE_VERSION, seeds: [] }; /* MUTANT */"]] },
    { name: "observe_commits", check: "observe_mode_commits_nothing",
        edits: [["if (Structural.mode !== \"live\") { stats.observed++; return false; }", "if (false) { stats.observed++; return false; } /* MUTANT */"]] },
    { name: "idle_service", check: "idle_zero_work",
        edits: [["            stats.idleTicks++;\n            return;\n", "            stats.idleTicks++; /* MUTANT: no early return */\n"]] }
];

const CHECKS = ["plugin_loads", "subscribed_to_events", "no_frame_hook", "setup_held", "explain_held", "handlers_enqueue_seeds",
    "handlers_read_nothing", "cave_in_falls", "one_commit_per_tick", "structure_fell_once_per_fall", "fall_moves_matter_only",
    "crushed_unit_dies", "items_relocate_not_destroyed", "never_falls_on_budget", "per_tick_bound", "big_piece_lands",
    "slab_into_pool_conserves_water", "fall_writes_no_fluid", "save_load_restarts_checks", "observe_mode_commits_nothing",
    "explain_falls", "idle_zero_work", "no_errors"];

let passes = 0;
let fails = 0;
const seen = new Set();
function check(name, cond, detail) {
    seen.add(name);
    const extra = detail ? " - " + detail : "";
    if (cond) {
        passes++;
        console.log("PASS: " + name + extra);
    } else {
        fails++;
        console.log("FAIL: " + name + extra);
    }
    return !!cond;
}

function pluginSource(mutantName) {
    let source = fs.readFileSync(PLUGIN_PATH, "utf8");
    if (!mutantName) return source;
    const mut = MUTANTS.find(m => m.name === mutantName);
    if (!mut) {
        console.error("unknown mutant \"" + mutantName + "\"; known: " + MUTANTS.map(m => m.name).join(", "));
        process.exit(2);
    }
    for (const [from, to] of mut.edits) {
        const n = source.split(from).length - 1;
        if (n !== 1) {
            console.error("mutant " + mutantName + ": the edit matched " + n + " times");
            process.exit(2);
        }
        source = source.replace(from, () => to);
    }
    return source;
}

function loadRules() {
    const dir = path.join(ROOT, "game", "data", "srd51");
    const srd = {
        creatures: JSON.parse(fs.readFileSync(path.join(dir, "creatures.json"), "utf8")),
        equipment: JSON.parse(fs.readFileSync(path.join(dir, "equipment.json"), "utf8")),
        rules: JSON.parse(fs.readFileSync(path.join(dir, "rules.json"), "utf8")),
        characterOptions: JSON.parse(fs.readFileSync(path.join(dir, "character_options.json"), "utf8"))
    };
    return require(path.join(ROOT, "game", "js", "sim", "rules", "rules.js")).createRules(srd);
}

//-----------------------------------------------------------------------------
// The vm: the harness of tools/test_structure_fluid.js, plus DEUS_Items and DEUS_Structural

const FRAME_OWNERS = ["Game_Map", "Scene_Map", "Spriteset_Map", "Spriteset_Base", "Game_Player", "Game_CharacterBase", "Game_Event"];
function frameMethods(env) {
    const out = {};
    for (const name of FRAME_OWNERS) {
        const proto = env[name] && env[name].prototype;
        if (!proto) continue;
        for (const k of Object.getOwnPropertyNames(proto)) if (typeof proto[k] === "function") out[name + ".prototype." + k] = proto[k];
    }
    for (const k of Object.keys(env.SceneManager)) if (typeof env.SceneManager[k] === "function") out["SceneManager." + k] = env.SceneManager[k];
    return out;
}

function buildEnvironment(seed, source) {
    const list = {};
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, "game/js/plugins.js"), "utf8"), list);
    const warnings = [];
    const errors = [];
    const canvasCtx = () => ({
        imageSmoothingEnabled: false,
        createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData() {}, drawImage() {}, fillRect() {}, clearRect() {},
        getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    });
    const env = {
        window: null, UF: {}, DEUS: null, Math: Math, performance: performance,
        setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval, clearInterval: clearInterval,
        process: { env: { DEUS_Z_RANGE: "legacy" }, argv: [], cwd: () => path.join(ROOT, "game"), version: process.version },
        console: {
            log() {},
            warn: (...a) => warnings.push(a.map(String).join(" ")),
            error: (...a) => errors.push(a.map(x => (x && x.stack) || String(x)).join(" "))
        },
        document: { createElement: () => ({ width: 0, height: 0, getContext: canvasCtx }) },
        PluginManager: { parameters: name => (list.$plugins && list.$plugins.find(p => p.name === name) || {}).parameters || {}, registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false, createGameObjects() {} },
        Input: { keyMapper: {} }, TouchInput: { _currentState: {} }, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        ImageManager: { loadTileset() { return null; } },
        Utils: { isOptionValid: () => false, encodeURI: s => s },
        Tilemap: function () {},
        $dataTilesets: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/Tilesets.json"), "utf8")),
        $ufWorldCatalog: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/UF_WorldCatalog.json"), "utf8")),
        $ufTime: { year: 1, monthIndex: 0, day: 1, hour: 8, minute: 0 },
        $gameSystem: {}, $gameScreen: { weatherType: () => "none", weatherPower: () => 0, changeWeather() {} },
        $gameTimer: {}, $gameSwitches: {}, $gameVariables: {}, $gameSelfSwitches: {}, $gameActors: {}, $gameParty: {}
    };
    env.window = env;
    env.globalThis = env;
    env.DEUS = env.UF;
    env.$deusWorldCatalog = env.$ufWorldCatalog;
    env.Tilemap.TILE_ID_A1 = 2048;
    env.Tilemap.TILE_ID_A2 = 2816;
    env.Tilemap.isTileA1 = id => id >= 2048 && id < 2816;
    env.Tilemap.isWaterTile = id => env.Tilemap.isTileA1(id);
    for (const name of ["Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_Map", "Game_Player", "Game_CharacterBase", "Game_Event", "Spriteset_Map", "Spriteset_Base"]) {
        env[name] = vm.runInNewContext("(function " + name + "(){})");
        env[name].prototype.initialize = function () {};
    }
    env.Scene_Boot.prototype.start = function () {};
    env.Scene_Boot.prototype.isReady = function () { return true; };
    env.Spriteset_Map.prototype.createCharacters = function () {};
    env.Sprite = vm.runInNewContext("(function Sprite(bitmap) {\n" +
        "this.anchor = { x: 0, y: 0, set(a, b) { this.x = a; this.y = b; } };\n" +
        "this.children = []; this.parent = null; this.visible = true; this.bitmap = bitmap || null; this.x = 0; this.y = 0; this.z = 0;\n" +
        "})");
    Object.assign(env.Sprite.prototype, { update() {}, addChild(c) { c.parent = this; this.children.push(c); return c; } });
    env.Bitmap = vm.runInNewContext("(function Bitmap(w, h) {\n" +
        "this.width = w || 0; this.height = h || 0;\n" +
        "this.context = { imageSmoothingEnabled: false, drawImage() {}, putImageData() {}, fillRect() {} };\n" +
        "this._baseTexture = { update() {} };\n" +
        "})");
    Object.assign(env.Bitmap.prototype, { isReady() { return true; }, isError() { return false; }, clear() {}, clearRect() {}, fillRect() {}, blt() {} });
    env.Bitmap.load = () => ({ isReady: () => false, isError: () => false });
    Object.assign(env.Game_Map.prototype, {
        mapId() { return this._mapId || 0; }, width: () => 256, height: () => 256, update() {}, tileId: () => 0, tilesetFlags: () => [],
        isPassable: () => true, checkPassage: () => true,
        displayX() { return 0; }, displayY() { return 0; }, screenTileX: () => 17, screenTileY: () => 13,
        adjustX(x) { return x; }, adjustY(y) { return y; },
        roundXWithDirection: (x, d) => x + (d === 6 ? 1 : d === 4 ? -1 : 0),
        roundYWithDirection: (y, d) => y + (d === 2 ? 1 : d === 8 ? -1 : 0),
        eventsXy: () => [], eventsXyNt: () => []
    });
    Object.assign(env.Game_Player.prototype, { isTransferring: () => false, direction: () => 2, locate(x, y) { this.x = x; this.y = y; } });
    env.$gameMap = new env.Game_Map();
    env.$gameMap._events = [];
    env.$gamePlayer = new env.Game_Player();
    env.$gamePlayer.x = 128;
    env.$gamePlayer.y = 128;
    simHook.install(env);
    const ctx = vm.createContext(env);
    const section = (src, a, b) => {
        const i = src.indexOf(a);
        const j = src.indexOf(b, i + a.length);
        if (i < 0 || j <= i) throw new Error("engine source section missing: " + a);
        return src.slice(i, j);
    };
    const core = fs.readFileSync(path.join(ROOT, "game/js/rmmz_core.js"), "utf8");
    const mgr = fs.readFileSync(path.join(ROOT, "game/js/rmmz_managers.js"), "utf8");
    const deus = fs.readFileSync(path.join(PLUGINS, "DEUS_Core.js"), "utf8");
    vm.runInContext(section(mgr, "DataManager.makeSaveContents =", "DataManager.correctDataErrors ="), ctx, { filename: "rmmz_managers.js" });
    vm.runInContext(section(core, "function JsonEx()", "//-----------------------------------------------------------------------------"), ctx, { filename: "rmmz_core.js JsonEx" });
    vm.runInContext(section(core, "Tilemap.TILE_ID_B =", "Tilemap.Layer ="), ctx, { filename: "rmmz_core.js Tilemap constants" });
    vm.runInContext(section(deus, "window.DEUS = window.DEUS || {};", "//-----------------------------------------------------------------------------"), ctx, { filename: "DEUS_Core.js events" });
    const pluginFiles = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Tiles.js", "DEUS_Objects.js", "DEUS_Items.js", "DEUS_Levels.js", "DEUS_Floors.js", "DEUS_Fluid.js"];
    for (const file of pluginFiles) vm.runInContext(fs.readFileSync(path.join(PLUGINS, file), "utf8"), ctx, { filename: file });

    // The structure tick handler is wrapped so the spies can tell work done inside it.
    env.__inTick = false;
    const realOnTick = env.UF.Sim.onTick;
    env.UF.Sim.onTick = function (name, order, fn) {
        if (name !== "structure") return realOnTick.apply(this, arguments);
        return realOnTick.call(this, name, order, function (t) {
            env.__inTick = true;
            try { return fn(t); } finally { env.__inTick = false; }
        });
    };
    env.__frameBefore = frameMethods(env);
    env.__listenersBefore = {};
    for (const ev of ["levels:strataChanged", "objects:changed", "objects:levelChanged"]) env.__listenersBefore[ev] = (env.UF.Events._listeners[ev] || []).length;
    vm.runInContext(source, ctx, { filename: "DEUS_Structural.js" });
    env.__frameAfter = frameMethods(env);
    env.__listenersAfter = {};
    for (const ev in env.__listenersBefore) env.__listenersAfter[ev] = (env.UF.Events._listeners[ev] || []).length;

    env.DataManager.onLoad(env.$dataTilesets);
    env.UF.NewGameSetup = { seed: seed, year: 1 };
    new env.Scene_Boot().start();
    if (!env.UF.World.state || env.UF.World.state.seed !== seed) env.UF.World.newWorld(seed);
    env.__warnings = warnings;
    env.__errors = errors;
    return env;
}

//-----------------------------------------------------------------------------
// Helpers

const AREA = { x: 0, y: 0 };
const STONE = ["stone", "stone", "stone", "stone", "stone"];
const AIR = ["air", "air", "air", "air", "air"];
const DECK = ["stone", "air", "air", "air", "air"];
const SX0 = 36, SX1 = 72, SY0 = 36, SY1 = 72;

function paint(L, x, y, z, m) {
    const hp = m.map(k => (k === "air" || k === "water" || k === "lava") ? 0 : 255);
    return L.setStrata({ area: AREA, x, y, z }, { m, hp, connector: 0 }, { cause: "test" });
}
function mats(L, x, y, z) {
    const st = L.strataAt({ area: AREA, x, y, z });
    return st ? st.materials.join("/") : "null";
}
const M_STONE = "stone/stone/stone/stone/stone";
const M_DECK = "stone/air/air/air/air";
const M_AIR = "air/air/air/air/air";

function advanceMinute(env) {
    const t = env.$ufTime;
    t.minute++;
    if (t.minute >= 60) { t.minute = 0; t.hour++; }
    if (t.hour >= 24) { t.hour = 0; t.day++; }
    env.UF.Events.emit("time:minute");
}
function runTicks(env, n) {
    const S = env.UF.Sim, target = S.tickCount() + n;
    let guard = 0;
    while (S.tickCount() < target && guard++ < 2 * n + 10) advanceMinute(env);
}
// Ticks until the queue, the checks and the debt are empty. Returns { ticks, history } (every serviced tick seen).
function drain(env, cap) {
    const S = env.UF.Structural, history = [];
    let last = env.UF.Sim.tickCount(), ticks = 0;   // only the ticks this drain runs
    const take = () => {
        for (const h of S.stats().history) if (h.tick > last) { history.push(h); last = h.tick; }
    };
    const t0 = env.UF.Sim.tickCount();
    while (ticks < cap) {
        const s = S.stats();
        if (s.queued === 0 && s.active === 0 && s.debt === 0) break;
        runTicks(env, 1);
        ticks = env.UF.Sim.tickCount() - t0;
        take();
    }
    const s = S.stats();
    return { ticks, history, done: s.queued === 0 && s.active === 0 && s.debt === 0 };
}
function census(L, x0, y0, x1, y1) {
    const counts = {};
    for (let z = -2; z <= 2; z++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const st = L.strataAt({ area: AREA, x, y, z });
        if (!st) continue;
        for (let s = 0; s < 5; s++) {
            if (st.hp[s] > 0 && ["stone", "soil", "wood"].includes(st.materials[s])) {
                const k = st.bytes[s] + ":" + st.hp[s];
                counts[k] = (counts[k] || 0) + 1;
            }
        }
    }
    return JSON.stringify(Object.keys(counts).sort().reduce((o, k) => (o[k] = counts[k], o), {}));
}
function itemBooks(I) {
    const all = I.all();
    return { n: all.length, count: all.reduce((a, it) => a + it.count, 0) };
}

//-----------------------------------------------------------------------------
// The run

function run(mutantName) {
    let env;
    try {
        env = buildEnvironment(SEED, pluginSource(mutantName));
    } catch (e) {
        check("plugin_loads", false, "the vm did not boot: " + (e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : String(e)));
        return;
    }
    const UF = env.UF, W = UF.World, L = UF.Levels, O = UF.Objects, I = UF.Items, F = UF.Fluid, S = UF.Structural;
    const errorsAtBoot = env.__errors.length;

    // Test-side doubles: SRD rules (DEUS_Combat publishes them in the game), a death hook, a matter spy.
    UF.Rules = loadRules();
    const deaths = [];
    UF.Combat = {
        onUnitDeath(u) {
            deaths.push({ id: u.id, cause: u.data && u.data.deathCause });
            if (u.data) u.data.dead = true;
            W.removeUnit(u.id);
            return true;
        },
        addPopup() {}
    };
    let coverDepth = 0, matterUncovered = 0;
    UF.Matter = {
        note() { if (coverDepth === 0) matterUncovered++; return { ok: true }; },
        cover(fn) { coverDepth++; try { return fn(); } finally { coverDepth--; } },
        covered() { return coverDepth > 0; }
    };
    let fellEvents = 0;
    UF.Events.on("structure:fell", () => { fellEvents++; });

    // Spies: lookups made inside the structure tick.
    const spy = { strataAt: 0, objectsAtIn: 0, unitsInArea: 0, units: 0, itemsAtIn: 0, fluidSetCell: 0 };
    const wrap = (obj, name, key) => {
        const real = obj[name];
        obj[name] = function () { if (env.__inTick) spy[key]++; return real.apply(this, arguments); };
    };
    wrap(L, "strataAt", "strataAt");
    wrap(O, "atIn", "objectsAtIn");
    wrap(W, "unitsInArea", "unitsInArea");
    wrap(W, "units", "units");
    wrap(I, "atIn", "itemsAtIn");
    // Fluid moves its own water when the strata change (its levels:* listeners): those calls come from DEUS_Fluid.js.
    // A call from anywhere else inside the structure tick is a fall writing fluid.
    const realSetCell = F.setCell;
    const fluidCallers = [];
    F.setCell = function () {
        if (env.__inTick) {
            const caller = (String(new Error().stack).split("\n")[2] || "").trim();
            if (/DEUS_Fluid\.js/.test(caller)) spy.fluidOwn++;
            else { spy.fluidSetCell++; fluidCallers.push(caller); }
        }
        return realSetCell.apply(this, arguments);
    };
    spy.fluidOwn = 0;

    //------------------------------------------------------------ boot
    const st0 = S && S.stats ? S.stats() : null;
    const handlers = UF.Sim.tickStats().handlers;
    check("plugin_loads", !!S && typeof S.explain === "function" && typeof S.stats === "function" && S.enabled === true && S.mode === "live" &&
        handlers.includes("structure") && UF.Sim.tickStats().armed === true,
        "handlers " + handlers.join(",") + "; armed " + UF.Sim.tickStats().armed);
    const subs = ["levels:strataChanged", "objects:changed", "objects:levelChanged"].map(ev => ev + " +" + (env.__listenersAfter[ev] - env.__listenersBefore[ev]));
    check("subscribed_to_events", subs.every(s => s.endsWith("+1")), subs.join(", "));
    const changedFrame = Object.keys(Object.assign({}, env.__frameBefore, env.__frameAfter)).filter(k => env.__frameBefore[k] !== env.__frameAfter[k]);
    check("no_frame_hook", changedFrame.length === 0, changedFrame.length ? "changed: " + changedFrame.join(", ") : Object.keys(env.__frameBefore).length + " methods unchanged");
    if (!S || !st0) return;

    //------------------------------------------------------------ the sandbox and the five scenarios, all held
    F.reset();
    for (let y = SY0; y <= SY1; y++) for (let x = SX0; x <= SX1; x++) {
        for (const z of [-2, -1, 0, 1, 2]) W.setObject(0, 0, x, y, 0, z);
        paint(L, x, y, -2, STONE);
        paint(L, x, y, -1, STONE);
        paint(L, x, y, 0, DECK);
        paint(L, x, y, 1, AIR);
        paint(L, x, y, 2, AIR);
    }
    // S1 cave-in: two 3x3 blocks on level +1 held only by the column at (47,45), levels 0 and +1.
    paint(L, 47, 45, 0, STONE);
    paint(L, 47, 45, 1, STONE);
    for (let y = 44; y <= 46; y++) for (let x = 44; x <= 46; x++) paint(L, x, y, 1, STONE);
    for (let y = 44; y <= 46; y++) for (let x = 48; x <= 50; x++) paint(L, x, y, 1, STONE);
    // S2 a 16x16 slab (S0 only) on level +2, held by the column at (54,60), levels 0 to +2.
    for (const z of [0, 1, 2]) paint(L, 54, 60, z, STONE);
    for (let y = 52; y <= 67; y++) for (let x = 38; x <= 53; x++) paint(L, x, y, 2, DECK);
    // S3 a sealed pool at (62,45) on level 0 under a slab held by (63,45) on level +1.
    paint(L, 62, 45, 0, AIR);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) paint(L, 62 + dx, 45 + dy, 0, STONE);
    paint(L, 62, 45, 1, STONE);
    paint(L, 63, 45, 1, STONE);
    // S4 save and load, S5 observe and explain: a block on level +1 held by its east neighbour column.
    for (const y of [56, 64]) {
        paint(L, 63, y, 0, STONE);
        paint(L, 63, y, 1, STONE);
        paint(L, 62, y, 1, STONE);
    }
    // S6 one commit per tick: two single blocks on level +1, either side of the column at (67,68), levels 0 and +1.
    paint(L, 67, 68, 0, STONE);
    for (const x of [66, 67, 68]) paint(L, x, 68, 1, STONE);
    const setup = drain(env, 4000);
    const afterSetup = S.stats();
    const scenarioCells = [[45, 45, 1, M_STONE], [49, 45, 1, M_STONE], [47, 45, 1, M_STONE], [40, 60, 2, M_DECK], [53, 67, 2, M_DECK],
        [62, 45, 1, M_STONE], [62, 56, 1, M_STONE], [62, 64, 1, M_STONE], [66, 68, 1, M_STONE], [68, 68, 1, M_STONE], [45, 45, 0, M_DECK], [40, 60, 0, M_DECK]];
    const moved = scenarioCells.filter(([x, y, z, m]) => mats(L, x, y, z) !== m);
    check("setup_held", setup.done && moved.length === 0 && afterSetup.verdicts.held > 0,
        "drained " + setup.done + " in " + setup.ticks + " ticks; held " + afterSetup.verdicts.held + ", falls " + afterSetup.verdicts.falls +
        ", commits " + afterSetup.commits + (afterSetup.lastFall ? " (last " + JSON.stringify(afterSetup.lastFall) + ")" : "") +
        "; scenario cells moved: " + (moved.map(c => c.slice(0, 3).join(",")).join(" ") || "none"));

    const ex = S.explain({ area: AREA, x: 62, y: 64, z: 1, s: 0 });
    check("explain_held", ex.verdict === "held" && ex.anchor && ex.anchor.z === -2 && ex.anchor.s === 0 && /^held/.test(ex.reason),
        JSON.stringify({ verdict: ex.verdict, anchor: ex.anchor, chain: ex.chain, reads: ex.reads, reason: ex.reason }));

    //------------------------------------------------------------ S1: cave-in, crush, items, one commit per tick
    const u1 = W.addUnit({ name: "TEST_crushed", area: AREA, z: 0, x: 45, y: 45, exact: true, data: { kind: "test", hp: 100 } });
    const u2 = W.addUnit({ name: "TEST_beside", area: AREA, z: 0, x: 53, y: 45, exact: true, data: { kind: "test", hp: 100 } });
    const dropped = I.drop({ x: 0, y: 0, z: 0 }, 45, 45, "stone", 3, null, { mat: "granite" });
    const item = dropped && dropped[0];
    drain(env, 200);
    const unitsReady = !!(u1 && u2 && W.unit(u1.id) && W.unit(u2.id) && item);
    const s1Before = S.stats();
    const queuedBefore = s1Before.queued;
    const tickBefore = UF.Sim.tickCount();
    const dmg = L.applyVolumeDamage(AREA, 47, 45, 1, 0, 47, 45, 1, 4, 100000, "impact");
    const s1Mid = S.stats();
    check("handlers_enqueue_seeds", s1Mid.queued > queuedBefore && s1Mid.enqueued > s1Before.enqueued,
        "queue " + queuedBefore + " -> " + s1Mid.queued + "; destroyed " + (dmg && dmg.strataDestroyed));
    check("handlers_read_nothing", s1Mid.reads === s1Before.reads && UF.Sim.tickCount() === tickBefore && s1Mid.ticks === s1Before.ticks,
        "reads " + s1Before.reads + " -> " + s1Mid.reads + "; ticks " + tickBefore + " -> " + UF.Sim.tickCount());
    const censusBefore = census(L, SX0, SY0, SX1, SY1);
    const booksBefore = itemBooks(I);
    const matterBefore = matterUncovered, fellBefore = fellEvents, commitsBefore = s1Mid.commits;
    const cave = drain(env, 400);
    const s1After = S.stats();
    const landed = [];
    for (const x0 of [44, 48]) for (let y = 44; y <= 46; y++) for (let x = x0; x <= x0 + 2; x++) {
        landed.push(mats(L, x, y, 0) === M_STONE && mats(L, x, y, 1) === M_DECK);
    }
    check("cave_in_falls", unitsReady && landed.length === 18 && landed.every(Boolean) && mats(L, 47, 45, 1) === M_AIR,
        "landed " + landed.filter(Boolean).length + "/18; (45,45) z0 " + mats(L, 45, 45, 0) + " z1 " + mats(L, 45, 45, 1) +
        "; commits " + commitsBefore + " -> " + s1After.commits + " in " + cave.ticks + " ticks" + (s1After.lastError ? "; error " + s1After.lastError : ""));
    check("structure_fell_once_per_fall", fellEvents - fellBefore === s1After.commits - commitsBefore && fellEvents - fellBefore === 2,
        "structure:fell " + (fellEvents - fellBefore) + ", commits " + (s1After.commits - commitsBefore));
    const censusAfter = census(L, SX0, SY0, SX1, SY1);
    const booksAfter = itemBooks(I);
    check("fall_moves_matter_only", censusAfter === censusBefore && booksAfter.n === booksBefore.n && booksAfter.count === booksBefore.count &&
        matterUncovered === matterBefore,
        "census " + (censusAfter === censusBefore ? "same" : censusBefore + " -> " + censusAfter) + "; items " + JSON.stringify(booksBefore) +
        " -> " + JSON.stringify(booksAfter) + "; uncovered matter calls " + (matterUncovered - matterBefore));
    const d1 = deaths.find(d => u1 && d.id === u1.id);
    check("crushed_unit_dies", !!d1 && d1.cause === "crushed" && !W.unit(u1.id) && !!W.unit(u2.id) && s1After.crushed >= 1,
        "deaths " + JSON.stringify(deaths) + "; beside alive " + !!(u2 && W.unit(u2.id)) + (u1 && W.unit(u1.id) ? "; crushed unit hp " + W.unit(u1.id).data.hp : ""));
    const it = item ? I.get(item.id) : null;
    const inBlock = it && it.x >= 44 && it.x <= 46 && it.y >= 44 && it.y <= 46;
    const itStand = it && L.standableShape({ area: AREA, x: it.x, y: it.y, z: it.z });
    check("items_relocate_not_destroyed", !!it && it.count === 3 && !inBlock && itStand && Math.max(Math.abs(it.x - 45), Math.abs(it.y - 45)) <= 3,
        it ? "item at (" + it.x + "," + it.y + ") z " + it.z + " count " + it.count + ", standable " + itStand : "the item is gone");

    //------------------------------------------------------------ S6: two falls decided in one tick, committed on two
    const s6Before = S.stats();
    L.setStrata({ area: AREA, x: 67, y: 68, z: 1 }, { m: AIR, hp: [0, 0, 0, 0, 0] }, { cause: "mine" });
    const pair = drain(env, 200);
    const s6After = S.stats();
    const pairCommits = pair.history.filter(h => h.commits > 0);
    const pairLanded = [66, 68].every(x => mats(L, x, 68, 0) === M_STONE && mats(L, x, 68, 1) === M_DECK);
    check("one_commit_per_tick", pairLanded && s6After.commits - s6Before.commits === 2 && pairCommits.length === 2 && pair.history.every(h => h.commits <= 1) &&
        s6After.deferred > s6Before.deferred,
        "commits per serviced tick: " + pair.history.map(h => h.commits).join("") + "; deferred " + (s6After.deferred - s6Before.deferred) + "; landed " + pairLanded);

    //------------------------------------------------------------ S2: a slab too big for one tick
    const s2Before = S.stats();
    L.applyVolumeDamage(AREA, 54, 60, 2, 0, 54, 60, 2, 4, 100000, "impact");
    const slab = drain(env, 400);
    const s2After = S.stats();
    const firstCommit = slab.history.findIndex(h => h.commits > 0);
    const beforeCommit = firstCommit < 0 ? slab.history : slab.history.slice(0, firstCommit);
    check("never_falls_on_budget", firstCommit >= 1 && beforeCommit.every(h => h.commits === 0) && beforeCommit.some(h => h.reads >= 512) &&
        s2After.commits - s2Before.commits === 1,
        "serviced ticks before the commit " + (firstCommit < 0 ? "none (no commit)" : firstCommit) + "; reads per tick " + slab.history.map(h => h.reads).join(","));
    const overBudget = slab.history.filter(h => h.commits === 0 && h.reads > 512);
    const commitTick = firstCommit >= 0 ? slab.history[firstCommit] : null;
    check("per_tick_bound", overBudget.length === 0 && !!commitTick && commitTick.debt > 0,
        "ticks over 512 without a commit: " + overBudget.length + "; debt after the commit " + (commitTick ? commitTick.debt : "n/a"));
    let flat = 0, total = 0;
    for (let y = 52; y <= 67; y++) for (let x = 38; x <= 53; x++) {
        total++;
        if (mats(L, x, y, 0) === "stone/stone/air/air/air" && mats(L, x, y, 2) === M_AIR) flat++;
    }
    check("big_piece_lands", flat === total && s2After.lastFall && s2After.lastFall.drop === 9 && s2After.lastFall.blocks === 256,
        flat + "/" + total + " cells; last fall " + JSON.stringify(s2After.lastFall));

    //------------------------------------------------------------ S3: a slab into a sealed pool
    const cap = F.fluidCapacityAt(0, 0, 62, 45, 0);
    F.setCell(AREA, 62, 45, 0, "water", cap);
    const books = () => { const d = F.diagnostics(); return { mass: d.totalWaterMass, vol: d.totalWaterVolume }; };
    const w0 = books();
    const spySet0 = spy.fluidSetCell;
    L.setStrata({ area: AREA, x: 63, y: 45, z: 1 }, { m: AIR, hp: [0, 0, 0, 0, 0] }, { cause: "mine" });
    drain(env, 200);
    const w1 = books();
    check("slab_into_pool_conserves_water", cap > 0 && w1.mass === w0.mass && w1.vol === w0.vol && mats(L, 62, 45, 0) === M_STONE &&
        F.depthAt(0, 0, 62, 45, 0) === 0 && F.depthAt(0, 0, 62, 45, 1) > 0,
        "cap " + cap + "; water mass " + w0.mass + " -> " + w1.mass + ", volume " + w0.vol + " -> " + w1.vol + "; z0 " + mats(L, 62, 45, 0) +
        " depth " + F.depthAt(0, 0, 62, 45, 0) + "; z1 depth " + F.depthAt(0, 0, 62, 45, 1));
    check("fall_writes_no_fluid", spy.fluidSetCell - spySet0 === 0,
        "UF.Fluid.setCell inside the structure tick: " + (spy.fluidSetCell - spySet0) + " from outside DEUS_Fluid" +
        (fluidCallers.length ? " (" + fluidCallers.slice(0, 2).join("; ") + ")" : "") + ", " + spy.fluidOwn + " from Fluid's own listeners");

    //------------------------------------------------------------ S4: save and load keep the checks
    L.setStrata({ area: AREA, x: 63, y: 56, z: 1 }, { m: AIR, hp: [0, 0, 0, 0, 0] }, { cause: "mine" });
    const queuedSave = S.stats().queued;
    let saveOk = false, emptyHeld = false, restored = -1, fellAfterLoad = false, saveDetail = "";
    try {
        const saved = env.JsonEx.parse(env.JsonEx.stringify(env.DataManager.makeSaveContents()));
        const sec = saved.deusStructural;
        saveOk = !!sec && sec.v === 1 && Array.isArray(sec.seeds) && sec.seeds.length === queuedSave && queuedSave > 0;
        const without = env.JsonEx.parse(env.JsonEx.stringify(saved));
        delete without.deusStructural;
        env.DataManager.extractSaveContents(without);
        drain(env, 50);
        runTicks(env, 20);
        emptyHeld = mats(L, 62, 56, 1) === M_STONE && S.stats().queued === 0;
        env.DataManager.extractSaveContents(env.JsonEx.parse(env.JsonEx.stringify(saved)));
        restored = S.stats().queued;
        const loadDrain = drain(env, 200);
        fellAfterLoad = mats(L, 62, 56, 1) === M_DECK && mats(L, 62, 56, 0) === M_STONE;   // dropped 4 strata: S0 stays on +1
        const sl = S.stats();
        saveDetail = "seeds saved " + (sec ? sec.seeds.length : "none") + " of " + queuedSave + " queued; without the section the block " +
            (emptyHeld ? "stays" : "moved") + "; restored " + restored + "; after the load it " + (fellAfterLoad ? "fell" : "did not fall") +
            (fellAfterLoad ? "" : " (drain " + JSON.stringify({ done: loadDrain.done, ticks: loadDrain.ticks }) + ", verdicts " + JSON.stringify(sl.verdicts) +
                ", holds " + JSON.stringify(sl.holds) + ", last " + JSON.stringify(sl.lastVerdict) + ", error " + sl.lastError +
                ", explain " + S.explain({ area: AREA, x: 62, y: 56, z: 1, s: 0 }).reason + ")");
    } catch (e) {
        saveDetail = "threw " + (e && e.stack ? e.stack.split("\n").slice(0, 2).join(" | ") : String(e));
    }
    check("save_load_restarts_checks", saveOk && emptyHeld && restored === queuedSave && fellAfterLoad, saveDetail);

    //------------------------------------------------------------ S5: observe mode and explain
    S.mode = "observe";
    const s5Before = S.stats();
    L.setStrata({ area: AREA, x: 63, y: 64, z: 1 }, { m: AIR, hp: [0, 0, 0, 0, 0] }, { cause: "mine" });
    drain(env, 200);
    const s5After = S.stats();
    check("observe_mode_commits_nothing", s5After.commits === s5Before.commits && s5After.observed > s5Before.observed && mats(L, 62, 64, 1) === M_STONE,
        "commits " + s5Before.commits + " -> " + s5After.commits + "; observed " + s5Before.observed + " -> " + s5After.observed + "; block " + mats(L, 62, 64, 1));
    const exf = S.explain({ area: AREA, x: 62, y: 64, z: 1, s: 0 });
    check("explain_falls", exf.verdict === "falls" && exf.dropFeet === 8 && exf.size === 5 && /^falls/.test(exf.reason),
        JSON.stringify({ verdict: exf.verdict, size: exf.size, drop: exf.drop, dropFeet: exf.dropFeet, reason: exf.reason }));
    S.mode = "live";

    //------------------------------------------------------------ idle: 10,000 ticks
    const idleDrain = drain(env, 500);
    const i0 = S.stats();
    const spy0 = Object.assign({}, spy);
    const tick0 = UF.Sim.tickCount();
    runTicks(env, 10000);
    const i1 = S.stats();
    const ran = UF.Sim.tickCount() - tick0;
    const lookups = ["strataAt", "objectsAtIn", "unitsInArea", "units", "itemsAtIn"].map(k => k + " " + (spy[k] - spy0[k]));
    check("idle_zero_work", idleDrain.done && ran >= 10000 && i1.ticks === i0.ticks && i1.reads === i0.reads && i1.idleTicks - i0.idleTicks >= 10000 &&
        ["strataAt", "objectsAtIn", "unitsInArea", "units", "itemsAtIn"].every(k => spy[k] === spy0[k]),
        ran + " ticks; serviced " + (i1.ticks - i0.ticks) + ", idle " + (i1.idleTicks - i0.idleTicks) + ", reads " + (i1.reads - i0.reads) + "; lookups in the tick: " + lookups.join(", "));

    const errs = env.__errors.slice(errorsAtBoot);
    check("no_errors", errs.length === 0 && !S.stats().lastError && env.__errors.length === 0,
        errs.length || env.__errors.length ? (env.__errors.slice(0, 3).join(" | ")).slice(0, 600) : "none" + (S.stats().lastError ? "; lastError " + S.stats().lastError : ""));
}

function main() {
    const t0 = Date.now();
    run(MUTANT_ARG || null);
    const missing = CHECKS.filter(c => !seen.has(c));
    if (missing.length) {
        console.log("FAIL: checks_ran - never ran: " + missing.join(", "));
        fails++;
    }
    console.log("\nRESULT: " + (fails ? "FAIL" : "PASS") + " (" + passes + " passed, " + fails + " failed; " + ((Date.now() - t0) / 1000).toFixed(1) + " s)" +
        (MUTANT_ARG ? " mutant " + MUTANT_ARG : ""));
    if (MUTANT_ARG || !SWEEP) process.exit(fails ? 1 : 0);

    console.log("\n=== Mutants: each must turn its check red ===");
    let caught = 0;
    for (const m of MUTANTS) {
        const r = spawnSync(process.execPath, [__filename, "--mutant=" + m.name], { encoding: "utf8", timeout: 600000 });
        const out = (r.stdout || "") + (r.stderr || "");
        const failed = (out.match(/^FAIL: (\S+)/gm) || []).map(s => s.slice(6));
        const ok = r.status === 1 && failed.includes(m.check);
        if (ok) caught++;
        console.log((ok ? "CAUGHT" : "NOT CAUGHT") + ": " + m.name + " -> " + m.check + " (exit " + r.status + "; failing: " + (failed.join(", ") || "none") + ")");
    }
    console.log("MUTANTS: " + caught + "/" + MUTANTS.length + " caught");
    process.exit(fails || caught !== MUTANTS.length ? 1 : 0);
}

main();
