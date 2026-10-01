#!/usr/bin/env node
"use strict";
// SIM.00.02a: the shared simulation tick (game/js/sim/host/tick.js, hosted by DEUS_World.js as UF.Sim.onTick /
// tickCount / tickStats). One tick is 36 game-seconds of the absolute game minute; it moves only on time:minute.
//
//   node tools/test_sim_tick.js                     every check, every mutant on its checks, then the NW.js suite
//   node tools/test_sim_tick.js --only=a,b          the named checks only (no mutant section)
//   node tools/test_sim_tick.js --mutant=<name>     every headless check under one mutant; exit 1 when its check is red
//   node tools/test_sim_tick.js --no-nw             skip the NW.js check (it needs nw.exe and takes a few minutes)
//   node tools/test_sim_tick.js --keep              keep the NW.js snapshot (its path is printed)
//
// Headless checks run DEUS_Core and DEUS_World (and, for history_does_not_tick, the New Game plugins of
// tools/test_new_game_year0.js) in a vm with the WG.00.44 hook. Mutants change source in memory only: DEUS_World.js
// text before the vm runs it, or tick.js compiled afresh from edited text and served by the sandbox's sim host.
// No file is rewritten.

const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const Module = require("module");
const { performance } = require("perf_hooks");
const { spawnSync } = require("child_process");
const simHook = require("./lib/vm_sim_require"); // WG.00.44: UF.Sim.require and a 1x1 grid in the vm

const ROOT = path.resolve(__dirname, "..");
const GAME = path.join(ROOT, "game");
const PLUGINS = path.join(GAME, "js", "plugins");
const TICK_FILE = path.join(GAME, "js", "sim", "host", "tick.js");
const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\\nw.exe"; // as tools/run_tests.js
const SEED = 424242;
const NEW_GAME_PLUGINS = ["DEUS_Core", "DEUS_World", "DEUS_WorldGen", "DEUS_Factions", "DEUS_History", "DEUS_Levels",
    "DEUS_Dnd5e", "DEUS_Callings", "DEUS_HistoricalDemographics"];

// Each edit's anchor must occur exactly once. world: DEUS_World.js; tick: game/js/sim/host/tick.js.
const ARM_AFTER = "        emit(\"world:created\", this.state);\n        armSimClock();\n";
const SUBSCRIBE = "    if (window.UF.Events && UF.Events.on) UF.Events.on(\"time:minute\", onSimMinute);\n";
const MUTANTS = {
    frame_hook: { kills: ["no_frame_hook"], why: "a Scene_Map frame hook also calls the minute handler every frame",
        world: [[SUBSCRIBE, SUBSCRIBE + "    { const _u = Scene_Map.prototype.update; Scene_Map.prototype.update = function() { _u.call(this); onSimMinute(); }; }\n"]] },
    drop_remainder: { kills: ["tick_from_game_minutes"], why: "the seconds past the last whole tick are dropped",
        tick: [["remainder = seconds % spt;", "remainder = 0;"]] },
    unsaved_accumulator: { kills: ["save_resume_exact"], why: "the save keeps the tick count but not the remainder or the owed ticks",
        tick: [["armed, origin, last, remainder, owed, ticks,", "armed, origin, last, remainder: 0, owed: 0, ticks,"]] },
    count_events: { kills: ["multi_minute_advance"], why: "each time:minute event counts as 60 s, whatever it carried",
        world: [["if (m !== null) runSimTicks(simClock.advanceToMinute(m));", "runSimTicks(simClock.advanceToMinute(simClock.stats().lastMinute + 1));"]] },
    uncapped_catchup: { kills: ["bulk_advance_bounded"], why: "a bulk advance hands out every due tick at once",
        tick: [["const n = owed < cap ? owed : cap;", "const n = owed;"]] },
    // Not named by the brief; one per check the five above leave unguarded.
    arm_early: { kills: ["history_does_not_tick"], why: "the clock is armed before world:created, so history pre-simulation ticks",
        world: [[ARM_AFTER, "        armSimClock();\n        emit(\"world:created\", this.state);\n"]] },
    frame_rate_ticks: { kills: ["paused_zero", "speed_scales"], why: "a fixed 10 Hz frame accumulator (a minute every 10 frames) instead of time:minute",
        world: [[SUBSCRIBE, "    { let f = 0; const _u = Scene_Map.prototype.update; Scene_Map.prototype.update = function() { _u.call(this); " +
            "if (simClock && ++f % 10 === 0) runSimTicks(simClock.advanceToMinute(simClock.stats().lastMinute + 1)); }; }\n"]] },
    calendar_required: { kills: ["calendar_stub"], why: "any $ufTime is read as a full calendar",
        world: [["if (!t || typeof t.day !== \"number\" || typeof t.hour !== \"number\" || typeof t.minute !== \"number\") return null;", "if (!t) return null;"]] },
    unordered_handlers: { kills: ["handlers_ordered"], why: "handlers run in registration order",
        world: [["\n            .sort((a, b) => a.order - b.order || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));", ";"]] }
};

const args = process.argv.slice(2);
const arg = name => { const a = args.find(x => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : null; };
const only = arg("only") ? arg("only").split(",") : null;
const mutantArg = arg("mutant");
const keep = args.includes("--keep");
const noNw = args.includes("--no-nw");
if (mutantArg && !MUTANTS[mutantArg]) {
    console.error(`HARNESS unknown mutant "${mutantArg}" (known: ${Object.keys(MUTANTS).join(", ")})`);
    process.exit(2);
}

// LF throughout, so the multi-line mutant anchors also match a CRLF checkout (merge_gate's fresh clones).
const read = file => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
function applyEdits(src, edits, what) {
    for (const [from, to] of edits || []) {
        const n = src.split(from).length - 1;
        if (n !== 1) throw new Error(`HARNESS ${what}: anchor found ${n} times: ${from.trim().slice(0, 70)}`);
        src = src.replace(from, () => to);
    }
    return src;
}
function freshModule(file, src) {
    const m = new Module(file, module);
    m.filename = file;
    m.paths = Module._nodeModulePaths(path.dirname(file));
    m._compile(src, file);
    return m.exports;
}
let catalog = null;
const worldCatalog = () => catalog || (catalog = JSON.parse(read(path.join(GAME, "data", "UF_WorldCatalog.json"))));

/**
 * The named plugins in a fresh vm (engine classes are stubs that throw if constructed or called, except
 * Scene_Map.prototype.update, the frame DEUS_Core's clock hangs on). Returns helpers around the sandbox.
 */
function loadRuntime({ plugins = ["DEUS_Core", "DEUS_World"], coreParams = {}, mutant = null, setup = null } = {}) {
    const m = mutant ? MUTANTS[mutant] : null;
    const ns = {}, errors = [], commands = {};
    const env = {
        window: null, UF: ns, DEUS: ns, Math, performance,
        PluginManager: { parameters: name => (name === "DEUS_Core" ? coreParams : {}), registerCommand(p, c, fn) { commands[`${p}:${c}`] = fn; } },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false,
            makeSaveContents: () => ({}), extractSaveContents() {}, createGameObjects() {} },
        Input: { keyMapper: {} }, TouchInput: {}, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 }, $gameMap: { mapId: () => 0 }, $gamePlayer: {},
        $gameSystem: {}, $gameMessage: { isBusy: () => false }, ImageManager: {}, Utils: { isOptionValid: () => false },
        document: { title: "" }, addEventListener() {},
        console: { log() {}, warn() {}, error: (...a) => errors.push(a.map(x => (x && x.stack) || String(x)).join(" ")) }
    };
    if (plugins.length > 2) { env.$ufWorldCatalog = worldCatalog(); env.$deusWorldCatalog = env.$ufWorldCatalog; }
    env.window = env;
    const sources = plugins.map(n => {
        const src = read(path.join(PLUGINS, n + ".js"));
        return n === "DEUS_World" && m ? applyEdits(src, m.world, `mutant ${mutant}`) : src;
    });
    const classes = new Set(["Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle"]);
    const protoRe = /\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype(?:\.([A-Za-z0-9_]+))?/g;
    for (const s of sources) for (const x of s.matchAll(protoRe)) classes.add(x[1]);
    for (const c of classes) env[c] = function() { throw new Error(`Unexpected engine construction ${c}`); };
    for (const s of sources) for (const x of s.matchAll(protoRe)) {
        if (x[2]) env[x[1]].prototype[x[2]] = () => { throw new Error(`Unexpected engine method ${x[1]}.${x[2]}`); };
    }
    env.Scene_Map.prototype.update = function() {}; // the base frame: DEUS_Core's wrapper adds $ufTime.update()
    simHook.install(env);
    if (m && m.tick) {
        const mutated = freshModule(TICK_FILE, applyEdits(read(TICK_FILE), m.tick, `mutant ${mutant}`));
        const real = env.DEUS_SIM_HOST;
        env.DEUS_SIM_HOST = Object.freeze({ require: f => (path.resolve(f) === TICK_FILE ? mutated : real.require(f)), cwd: real.cwd, dirname: null, log: null });
    }
    if (setup) setup(env);
    const ctx = vm.createContext(env);
    vm.runInContext(["Math", "Object", "Array", "Number", "String", "Boolean", "Map", "Set", "JSON", "Date",
        "Uint8Array", "Uint16Array", "Int32Array", "Float32Array", "performance", "window"]
        .map(n => `const ${n} = globalThis.${n};`).join("\n"), ctx);
    if (plugins.length > 2) vm.runInContext(tilemapStatics(), ctx, { filename: "rmmz_core.js#Tilemap-statics" });
    plugins.forEach((n, i) => vm.runInContext(sources[i], ctx, { filename: n + ".js", timeout: 120000 }));
    const sim = () => env.UF.Sim || {};
    const scene = Object.create(env.Scene_Map.prototype);
    const rt = {
        env, errors, commands, sim,
        clock: () => env.$ufTime,
        abs: () => { const t = env.$ufTime; return (t.day - 1) * 1440 + t.hour * 60 + t.minute; },
        frames(n) { for (let i = 0; i < n; i++) env.Scene_Map.prototype.update.call(scene); },
        minutes: 0,
        hasTick: () => typeof sim().tickCount === "function" && typeof sim().tickStats === "function" && typeof sim().onTick === "function"
    };
    if (env.UF.Events) env.UF.Events.on("time:minute", () => { rt.minutes++; });
    return rt;
}

function tilemapStatics() {
    const core = read(path.join(GAME, "js", "rmmz_core.js"));
    const start = core.indexOf("Tilemap.TILE_ID_B = 0;");
    const table = core.indexOf("Tilemap.WATERFALL_AUTOTILE_TABLE = [");
    const end = core.indexOf("];", table) + 2;
    if (start < 0 || table < 0 || end < 2) throw new Error("rmmz_core.js Tilemap statics not found");
    return "function Tilemap() {}\n" + core.slice(start, end);
}

/** A Core+World runtime with a new world; null plus a reason when the tick API is missing (the lane base). */
function newWorldRuntime(opts) {
    const rt = loadRuntime(opts);
    rt.env.UF.World.newWorld(SEED);
    return rt;
}
const NO_TICK = "UF.Sim.onTick / tickCount / tickStats missing after DEUS_World.js loads";
const ticksFor = minutes => Math.floor(minutes * 60 / 36);
function pureClock(mutant) {
    const m = mutant ? MUTANTS[mutant] : null;
    const mod = m && m.tick ? freshModule(TICK_FILE, applyEdits(read(TICK_FILE), m.tick, `mutant ${mutant}`)) : require(TICK_FILE);
    return mod.createTickClock({ secondsPerTick: 36, maxTicksPerAdvance: 100 });
}
const thrown = fn => { try { fn(); return null; } catch (e) { return e; } };

const checks = {
    // FAILS on main: no tick module, no UF.Sim.tickCount.
    tick_from_game_minutes(mutant) {
        const c = pureClock(mutant);
        c.arm(0);
        const pure = [1, 2, 3].map(mn => c.advanceToMinute(mn));
        const pureStats = c.stats();
        const rt = newWorldRuntime({ mutant });
        if (!rt.hasTick()) return [false, `pure clock gave ${pure.join("+")}; ${NO_TICK}`];
        const t0 = rt.sim().tickCount();
        const per = [];
        for (let i = 0; i < 3; i++) { rt.clock().advanceMinute(1); per.push(rt.sim().tickCount()); }
        const s = rt.sim().tickStats();
        const ok = pure.join() === "1,2,2" && pureStats.remainderSeconds === 0 && t0 === 0 && per.join() === "1,3,5" &&
            s.remainderSeconds === 0 && s.owed === 0 && s.lastMinute - s.originMinute === 3 && rt.errors.length === 0;
        return [ok, `pure clock: minutes 1,2,3 -> ${pure.join(", ")} ticks (remainder ${pureStats.remainderSeconds} s); game: tickCount ${t0} at world start, ` +
            `after each advanceMinute(1): ${per.join(", ")} (expected 1, 3, 5), remainder ${s.remainderSeconds} s, owed ${s.owed}; console errors ${rt.errors.length}`];
    },

    // FAILS on main.
    multi_minute_advance(mutant) {
        const rt = newWorldRuntime({ mutant });
        if (!rt.hasTick()) return [false, NO_TICK];
        const e0 = rt.minutes;
        rt.clock().advanceMinute(6);
        const one = rt.sim().tickCount(), events = rt.minutes - e0;
        const add = rt.commands["DEUS_Core:AddTime"];
        if (add) add({ minutes: "6" });
        const two = rt.sim().tickCount();
        const s = rt.sim().tickStats();
        const ok = one === 10 && events === 1 && !!add && two === 20 && s.remainderSeconds === 0 && s.owed === 0 && rt.errors.length === 0;
        return [ok, `advanceMinute(6): ${one} ticks from ${events} time:minute event (expected 10 from 1); then AddTime 6 (plugin command): ` +
            `${two} (expected 20); remainder ${s.remainderSeconds} s, owed ${s.owed}`];
    },

    history_does_not_tick(mutant) {
        const t0 = performance.now();
        const rt = loadRuntime({ plugins: NEW_GAME_PLUGINS, mutant });
        if (!rt.hasTick()) return [false, NO_TICK];
        const env = rt.env;
        env.UF.NewGameSetup = { faction: "human", fogOfWar: false, seed: SEED, worldSize: 256, year: 3 };
        // The shipped year-3 New Game takes History's demographics path, which moves no calendar minute. The
        // second-by-second pre-simulation (iterateWorldHistory, DEUS_History.js:3491 on the founders path) advances
        // the calendar 6 minutes per step, so it runs here inside world:created too, after History's own listener,
        // caught as DEUS_History.js:3492 catches it (at a1e879a5 it throws a ReferenceError for WORK_BEATS_PER_SHARED,
        // DEUS_History.js:2591, after 60 steps; the minutes before that are what this check needs).
        let demoMinutes = null, iterErr = null, atCreated = null;
        env.UF.Events.on("world:created", state => {
            demoMinutes = rt.minutes - e0;
            try { env.UF.History.iterateWorldHistory(state, 3); } catch (e) { iterErr = e; }
            atCreated = { ticks: env.UF.Sim.tickCount(), armed: env.UF.Sim.tickStats().armed };
        });
        const e0 = rt.minutes;
        const state = env.UF.World.newWorld(SEED);
        const during = rt.minutes - e0;
        const after = env.UF.Sim.tickCount(), s = env.UF.Sim.tickStats();
        const absNow = rt.abs();
        rt.clock().advanceMinute(6);
        const live = env.UF.Sim.tickCount();
        const h = state.history || {};
        const ok = h.years === 3 && during > demoMinutes && atCreated && atCreated.ticks === 0 && atCreated.armed === false &&
            after === 0 && s.armed && s.owed === 0 && s.lastMinute === absNow && s.originMinute === absNow && live === 10;
        return [ok, `year-3 New Game (history years ${h.years}): ${demoMinutes} time:minute events from the demographics history, ` +
            `${during} in all during world:created with iterateWorldHistory(state, 3) (${iterErr ? "stopped by " + String(iterErr).split("\n")[0] : "ran to the end"}); tickCount ${atCreated && atCreated.ticks} ` +
            `and armed ${atCreated && atCreated.armed} at the end of world:created, ${after} when newWorld returned (armed ${s.armed} at minute ${s.lastMinute}, ` +
            `calendar minute ${absNow}, owed ${s.owed}); advanceMinute(6) afterwards -> ${live} (expected 10); ${rt.errors.length} console errors${rt.errors.length ? " (" + rt.errors[0].split("\n").slice(0, 3).join(" | ") + ")" : ""}; ` +
            `${(performance.now() - t0).toFixed(0)} ms`];
    },

    bulk_advance_bounded(mutant) {
        const c = pureClock(mutant);
        c.arm(0);
        const first = c.advanceToMinute(1440);
        const drains = [];
        for (let i = 0; i < 30 && c.owed() > 0; i++) drains.push(c.drain());
        const pureTotal = c.tickCount();
        const rt = newWorldRuntime({ mutant });
        if (!rt.hasTick()) return [false, `pure clock: first call ${first}, total ${pureTotal}; ${NO_TICK}`];
        rt.clock().advanceMinute(1440);
        const call = rt.sim().tickCount(), owed1 = rt.sim().tickStats().owed;
        let k = 0, maxStep = call, prev = call;
        while (rt.sim().tickStats().owed > 0 && k < 100) {
            rt.clock().advanceMinute(1);
            k++;
            const now = rt.sim().tickCount();
            maxStep = Math.max(maxStep, now - prev);
            prev = now;
        }
        const s = rt.sim().tickStats();
        const fromBulk = s.ticks - ticksFor(k); // 1440 game minutes = 86,400 s = exactly 2,400 ticks
        const ok = first <= 100 && drains.every(n => n <= 100) && pureTotal === 2400 && c.owed() === 0 && c.drain() === 0 &&
            call <= 100 && owed1 === 2400 - call && s.owed === 0 && maxStep <= 100 && s.ticks === ticksFor(1440 + k) && fromBulk === 2400 && s.catchUps > 0;
        return [ok, `pure clock: advanceToMinute(1440) -> ${first}, then ${drains.length} drains of at most ${Math.max(0, ...drains)}: ${pureTotal} in total ` +
            `(expected 2400), owed ${c.owed()}; game: advanceMinute(1440) ran ${call} ticks in that call, owed ${owed1}; drained over ${k} more minutes ` +
            `(largest step ${maxStep}): ${s.ticks} ticks = ${fromBulk} from the bulk advance + ${ticksFor(k)} from those minutes; catch-ups ${s.catchUps}`];
    },

    paused_zero(mutant) {
        const rt = newWorldRuntime({ mutant });
        if (!rt.hasTick()) return [false, NO_TICK];
        rt.frames(60);
        const t = rt.clock();
        t.isPaused = true;
        const c0 = rt.sim().tickCount(), m0 = rt.abs(), a0 = rt.sim().tickStats().advances;
        rt.frames(600);
        const c1 = rt.sim().tickCount(), m1 = rt.abs(), a1 = rt.sim().tickStats().advances;
        t.isPaused = false;
        rt.frames(600);
        const s = rt.sim().tickStats();
        const ok = c0 > 0 && c1 === c0 && m1 === m0 && a1 === a0 && s.ticks > c1 && s.owed === 0 && s.ticks === ticksFor(rt.abs() - s.originMinute);
        return [ok, `60 running frames: ${c0} ticks; 600 paused frames: ticks ${c0} -> ${c1}, calendar minute ${m0} -> ${m1}, advances ${a0} -> ${a1}; ` +
            `600 running frames after: ${s.ticks} ticks over ${rt.abs() - s.originMinute} game minutes (expected ${ticksFor(rt.abs() - s.originMinute)})`];
    },

    speed_scales(mutant) {
        const run = timeSpeed => {
            const rt = newWorldRuntime({ mutant, coreParams: timeSpeed ? { TimeSpeed: timeSpeed } : {} });
            if (!rt.hasTick()) return null;
            const a = rt.abs();
            rt.frames(600);
            return { minutes: rt.abs() - a, ticks: rt.sim().tickCount(), owed: rt.sim().tickStats().owed };
        };
        const slow = run(null), fast = run("0.05");
        if (!slow || !fast) return [false, NO_TICK];
        const exact = r => r.ticks === ticksFor(r.minutes) && r.owed === 0;
        const ok = exact(slow) && exact(fast) && fast.minutes > 2 * slow.minutes && fast.ticks > 2 * slow.ticks;
        return [ok, `600 frames at the default TimeSpeed (1/6 s per game minute): ${slow.minutes} minutes, ${slow.ticks} ticks (expected ${ticksFor(slow.minutes)}); ` +
            `at TimeSpeed 0.05: ${fast.minutes} minutes, ${fast.ticks} ticks (expected ${ticksFor(fast.minutes)})`];
    },

    handlers_ordered(mutant) {
        const rt = newWorldRuntime({ mutant });
        if (!rt.hasTick()) return [false, NO_TICK];
        const sim = rt.sim(), log = [];
        for (const [name, order] of [["b", 10], ["a", 10], ["c", -5], ["d", 2.5]]) sim.onTick(name, order, tick => log.push(name + tick));
        rt.clock().advanceMinute(3);
        const want = [1, 2, 3, 4, 5].map(t => ["c", "d", "a", "b"].map(n => n + t).join(" ")).join(" ");
        const dup = thrown(() => sim.onTick("a", 0, () => {}));
        const badOrder = thrown(() => sim.onTick("e", NaN, () => {}));
        const badFn = thrown(() => sim.onTick("f", 1, null));
        const badName = thrown(() => sim.onTick("", 1, () => {}));
        const s = sim.tickStats();
        const ok = log.join(" ") === want && !!dup && /already registered/.test(dup.message) && !!badOrder && badOrder.name === "TypeError" &&
            !!badFn && badFn.name === "TypeError" && !!badName && badName.name === "TypeError" && s.handlers.join() === "c,d,a,b" && s.domain === "action";
        return [ok, `registered b(10) a(10) c(-5) d(2.5); 5 ticks ran: ${log.join(" ")}; duplicate "a": ${dup ? dup.message : "accepted"}; ` +
            `order NaN: ${badOrder && badOrder.name}; no fn: ${badFn && badFn.name}; empty name: ${badName && badName.name}; ` +
            `tickStats().handlers ${s.handlers.join(",")}, domain ${s.domain}`];
    },

    save_resume_exact(mutant) {
        const a = newWorldRuntime({ mutant });
        if (!a.hasTick()) return [false, NO_TICK];
        a.clock().advanceMinute(1);     // 1 tick, 24 s over
        a.clock().advanceMinute(1440);  // 100 ticks run, 2,301 owed
        const save = JSON.parse(JSON.stringify(a.env.DataManager.makeSaveContents()));
        const savedTick = save.ufWorld && save.ufWorld.simTick;
        const b = loadRuntime({ mutant });
        b.env.DataManager.extractSaveContents(JSON.parse(JSON.stringify(save)));
        const strip = s => { const o = Object.assign({}, s); delete o.handlers; return JSON.stringify(o); };
        const atLoad = strip(a.sim().tickStats()) === strip(b.sim().tickStats());
        const steps = rt => { for (let i = 0; i < 30; i++) rt.clock().advanceMinute(1); rt.clock().advanceMinute(7); rt.commands["DEUS_Core:AddTime"]({ minutes: "50" }); };
        steps(a);
        steps(b);
        const sa = a.sim().tickStats(), sb = b.sim().tickStats();
        const later = strip(sa) === strip(sb);
        const exact = sb.ticks + sb.owed === ticksFor(b.abs() - sb.originMinute);
        // A save from before SIM.00.02a: the clock arms at the loaded calendar minute.
        const old = JSON.parse(JSON.stringify(save));
        delete old.ufWorld.simTick;
        const c = loadRuntime({ mutant });
        c.env.DataManager.extractSaveContents(old);
        const sc = c.sim().tickStats();
        const legacy = sc.armed && sc.ticks === 0 && sc.lastMinute === c.abs() && sc.originMinute === c.abs();
        const ok = !!savedTick && atLoad && later && exact && sb.remainderSeconds === sa.remainderSeconds && legacy &&
            a.errors.length + b.errors.length + c.errors.length === 0;
        return [ok, `saved ufWorld.simTick ${JSON.stringify(savedTick)}; loaded clock equals the saved one: ${atLoad}; after 30 x 1 min, 7 min and AddTime 50 ` +
            `in both: original ${sa.ticks} ticks/${sa.owed} owed/${sa.remainderSeconds} s, loaded ${sb.ticks}/${sb.owed}/${sb.remainderSeconds} s; ` +
            `loaded ticks+owed = floor(elapsed/36 s): ${exact}; a save without simTick arms at its minute ${c.abs()}: ${legacy}`];
    },

    no_frame_hook(mutant) {
        const rt = newWorldRuntime({ mutant });
        if (!rt.hasTick()) return [false, NO_TICK];
        const a0 = rt.sim().tickStats().advances, e0 = rt.minutes;
        rt.frames(600);
        const runAdv = rt.sim().tickStats().advances - a0, runEvents = rt.minutes - e0;
        rt.clock().isPaused = true;
        const a1 = rt.sim().tickStats().advances;
        rt.frames(300);
        const pausedAdv = rt.sim().tickStats().advances - a1;
        const ok = runEvents > 0 && runAdv === runEvents && pausedAdv === 0;
        return [ok, `600 running Scene_Map frames: ${runEvents} time:minute events, ${runAdv} clock advances (expected one per event); ` +
            `300 paused frames: ${pausedAdv} advances (expected 0)`];
    },

    // Many harnesses stub the calendar as $ufTime = { year: 1 } (tools/test_history_materialization_and_world_age.js:46):
    // a world must still be created, with the clock armed at minute 0 and nothing ticking.
    calendar_stub(mutant) {
        const rt = loadRuntime({ plugins: ["DEUS_World"], mutant, setup: env => { env.$ufTime = { year: 1 }; } });
        if (!rt.hasTick()) return [false, NO_TICK];
        const err = thrown(() => rt.env.UF.World.newWorld(SEED));
        const s = rt.sim().tickStats();
        const ok = !err && s.armed && s.originMinute === 0 && s.ticks === 0;
        return [ok, `DEUS_World alone with $ufTime = { year: 1 }: newWorld ${err ? "threw " + err.message : "ran"}; armed ${s.armed} at minute ${s.originMinute}, ${s.ticks} ticks`];
    },

    nwjs_new_game() {
        if (!fs.existsSync(NW)) return [false, `nw.exe not found at ${NW}`];
        const snap = fs.mkdtempSync(path.join(os.tmpdir(), "sim0002a-nw-"));
        const game = path.join(snap, "game");
        const skip = new Set([path.join(GAME, "save"), path.join(GAME, "test_output"), path.join(GAME, "game_runtime.log")]);
        try {
            fs.cpSync(GAME, game, { recursive: true, filter: src => !skip.has(src) });
            fs.writeFileSync(path.join(game, "js", "plugins", "TEST_SimTickConsole.js"), CONSOLE_PLUGIN);
            fs.writeFileSync(path.join(game, "js", "plugins", "TEST_SimTickSuite.js"), SUITE_PLUGIN);
            const pluginsJs = path.join(game, "js", "plugins.js");
            const text = read(pluginsJs).replace(/^\uFEFF/, "");
            const list = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
            list.unshift({ name: "TEST_SimTickConsole", status: true, description: "[TEST_SimTickConsole]", parameters: {} });
            fs.writeFileSync(pluginsJs, `// Generated by RPG Maker.\n// Do not edit this file directly.\nvar $plugins =\n[\n${list.map(p => JSON.stringify(p)).join(",\n")}\n];\n`);
            const add = spawnSync(process.execPath, [path.join(__dirname, "add_test_plugin.js"), pluginsJs, "DEUS_Test", "TEST_SimTickSuite"], { encoding: "utf8" });
            if (add.status !== 0) return [false, `add_test_plugin failed: ${add.stderr || add.stdout}`];
            const run = spawnSync(process.execPath, [path.join(__dirname, "run_tests.js"), "sim_tick", "--game", game],
                { encoding: "utf8", timeout: 420000, env: Object.assign({}, process.env, { DEUS_TEST_YEAR: "0" }) });
            const resultsFile = path.join(game, "test_output", "results.txt");
            const results = fs.existsSync(resultsFile) ? read(resultsFile) : "";
            const passes = (results.match(/^PASS sim_tick\./gm) || []).length;
            const fails = results.split(/\r?\n/).filter(l => /^(FAIL|ERROR|HARNESS)/.test(l) && !/^HARNESS New Game year /.test(l));
            const shot = path.join(game, "test_output", "sim_tick.map.png");
            const out = path.join(ROOT, "tasks", "SIM.00.02a", "lane-dm", "evidence");
            if (fs.existsSync(shot) && args.includes("--save-evidence")) {
                fs.mkdirSync(out, { recursive: true });
                fs.copyFileSync(shot, path.join(out, "sim_tick.map.png"));
                fs.writeFileSync(path.join(out, "nwjs_results.txt"), results);
            }
            const ok = run.status === 0 && /^RESULT: \d+ passed, 0 failed/m.test(results) && passes >= 7 && fails.length === 0;
            if (keep) console.log(`  kept snapshot: ${snap}`);
            const lines = results.split(/\r?\n/).filter(l => /^(PASS|FAIL) sim_tick\./.test(l)).map(l => l.slice(0, 220));
            return [ok, `run_tests exit ${run.status}; ${passes} sim_tick PASS lines; ${fails.length ? "problems: " + fails.slice(0, 4).join(" | ") : "no FAIL/ERROR lines"}` +
                (lines.length ? "\n      " + lines.join("\n      ") : "")];
        } finally {
            if (!keep) fs.rmSync(snap, { recursive: true, force: true });
        }
    }
};

// Loaded first in the snapshot: records every console.error from then on, for the suite's no_console_errors check.
const CONSOLE_PLUGIN = `// TEST_SimTickConsole (SIM.00.02a, tools/test_sim_tick.js writes it into a snapshot only).
(() => {
    const seen = window.__sim0002aConsoleErrors = [];
    const original = console.error;
    console.error = function(...a) { seen.push(a.map(String).join(" ")); return original.apply(this, a); };
})();
`;

// Loaded after DEUS_Test in the snapshot: a Year 0 New Game, then the clock running, paused, at x4 and an AddTime of 60.
const SUITE_PLUGIN = `// TEST_SimTickSuite (SIM.00.02a, tools/test_sim_tick.js writes it into a snapshot only).
(() => {
    if (!window.DEUS || !DEUS.Test) return;
    DEUS.Test.suite("sim_tick", async t => {
        const sim = window.UF && UF.Sim;
        const ok = !!(sim && typeof sim.tickCount === "function" && typeof sim.tickStats === "function");
        t.check("uf_sim_tick_present", ok, "UF.Sim.tickCount / tickStats from DEUS_World.js");
        if (!ok) return;
        const T = UF.Time || {};
        const pause = on => { if (on && T.pause) T.pause(); else if (!on && T.resume) T.resume(); $ufTime.isPaused = on; };
        const abs = () => ($ufTime.day - 1) * 1440 + $ufTime.hour * 60 + $ufTime.minute;
        let minutes = 0;
        UF.Events.on("time:minute", () => { minutes++; });
        pause(false);
        if (T.setLevel) T.setLevel(0);
        const c0 = sim.tickCount(), m0 = abs(), a0 = sim.tickStats().advances, e0 = minutes;
        await t.waitFrames(180);
        const c1 = sim.tickCount(), m1 = abs(), a1 = sim.tickStats().advances, e1 = minutes;
        t.check("ticks_rise_while_running", c1 > c0 && m1 > m0, "180 frames at x1: tickCount " + c0 + " -> " + c1 + ", game minute " + m0 + " -> " + m1);
        t.check("advances_only_on_minutes", e1 - e0 > 0 && a1 - a0 === e1 - e0, (e1 - e0) + " time:minute events, " + (a1 - a0) + " clock advances (no frame hook: one per event)");
        pause(true);
        const c2 = sim.tickCount(), m2 = abs(), a2 = sim.tickStats().advances;
        await t.waitFrames(180);
        const c3 = sim.tickCount(), m3 = abs(), a3 = sim.tickStats().advances;
        t.check("ticks_fixed_while_paused", c3 === c2 && m3 === m2 && a3 === a2, "180 paused frames: tickCount " + c2 + " -> " + c3 + ", game minute " + m2 + " -> " + m3 + ", advances " + a2 + " -> " + a3);
        const before = sim.tickCount(), owed = sim.tickStats().owed;
        PluginManager.callCommand(null, "DEUS_Core", "AddTime", { minutes: "60" });
        const after = sim.tickCount(), owedAfter = sim.tickStats().owed;
        t.check("addtime_60_adds_100", owed === 0 && owedAfter === 0 && after - before === 100, "paused, AddTime 60 (plugin command): tickCount " + before + " -> " + after + ", owed " + owed + " -> " + owedAfter);
        // Speed is game updates per displayed frame, and waitFrames counts game updates, so each window is 2 s of
        // wall-clock time. How many updates a machine fits in 2 s is its frame rate, not the tick's business: the check
        // is that x4 runs more game minutes than x1 and that, in each window, ticks follow the minutes exactly.
        const waitMs = ms => { const end = performance.now() + ms; return t.waitUntil(() => performance.now() >= end, ms + 10000, ms + " ms"); };
        const window2s = async () => {
            const s = sim.tickStats(), n = abs(), f = Graphics.frameCount;
            await waitMs(2000);
            const e = sim.tickStats();
            return { minutes: abs() - n, ticks: e.ticks - s.ticks, want: Math.floor((s.remainderSeconds + (abs() - n) * 60) / 36), owed: e.owed, updates: Graphics.frameCount - f };
        };
        pause(false);
        const x1 = await window2s();
        if (T.setLevel) T.setLevel(2);
        const x4 = await window2s();
        x4.multiplier = T.multiplier ? T.multiplier() : null;
        if (T.setLevel) T.setLevel(0);
        const exact = w => w.ticks === w.want && w.owed === 0;
        const show = w => w.updates + " game updates, " + w.minutes + " min, " + w.ticks + " ticks (expected " + w.want + ")";
        t.check("speed_scales", x4.multiplier > 1 && x4.minutes > x1.minutes && exact(x1) && exact(x4), "2 s at x1: " + show(x1) + "; 2 s at x" + x4.multiplier + ": " + show(x4));
        const st = sim.tickStats();
        t.check("ticks_match_elapsed", st.ticks + st.owed === Math.floor((st.lastMinute - st.originMinute) * 60 / 36), "ticks " + st.ticks + " + owed " + st.owed + " over " + (st.lastMinute - st.originMinute) + " game minutes since minute " + st.originMinute);
        pause(true);
        const scene = SceneManager._scene;
        const w = new Window_Base(new Rectangle(0, 0, 640, scene.calcWindowHeight ? scene.calcWindowHeight(3, false) : 140));
        w.drawText("TEST_ SIM.00.02a  UF.Sim.tickCount() = " + sim.tickCount(), 0, 0, 600);
        w.drawText("owed " + st.owed + ", remainder " + st.remainderSeconds + " s, catch-ups " + st.catchUps + ", advances " + st.advances, 0, 36, 600);
        w.drawText("game minute " + abs() + " (armed at " + st.originMinute + "), clock " + $ufTime.timeString + " day " + $ufTime.day + ", paused", 0, 72, 600);
        scene.addChild(w);
        await t.waitFrames(10);
        t.screenshot("map");
        const errors = (window.__sim0002aConsoleErrors || []).concat(t.errorsSoFar());
        t.check("no_console_errors", errors.length === 0, errors.length ? errors.slice(0, 5).join(" | ") : "none since TEST_SimTickConsole loaded (plugins.js index 0)");
    }, { isDefault: false });
})();
`;

function runChecks(names, mutant) {
    const out = {};
    for (const name of names) {
        let ok, detail;
        try {
            [ok, detail] = checks[name](mutant);
        } catch (e) {
            ok = false;
            detail = `threw ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`;
        }
        out[name] = { ok, detail };
    }
    return out;
}

const HEADLESS = Object.keys(checks).filter(n => n !== "nwjs_new_game");
// Red for the mutant's reason: not a harness error (an anchor missing from the source, for one).
const redByMutant = r => !r.ok && !/HARNESS/.test(r.detail);
let failed = 0, ran = 0;
if (mutantArg) {
    const m = MUTANTS[mutantArg];
    console.log(`MUTANT ${mutantArg} (${m.why}; expected to fail ${m.kills.join(", ")})`);
    const res = runChecks(HEADLESS, mutantArg);
    for (const [name, r] of Object.entries(res)) console.log(`${r.ok ? "PASS" : "FAIL"} ${name} - ${r.detail}`);
    const red = m.kills.filter(k => redByMutant(res[k]));
    console.log(`RESULT: ${Object.values(res).filter(r => r.ok).length} passed, ${Object.values(res).filter(r => !r.ok).length} failed; ` +
        `named check${m.kills.length > 1 ? "s" : ""} red: ${red.join(", ") || "none"}`);
    process.exit(red.length === m.kills.length ? 1 : 0);
}
if (only) {
    const unknown = only.filter(n => !checks[n]);
    if (unknown.length) { console.error(`HARNESS unknown check ${unknown.join(", ")}`); process.exit(2); }
}
const names = Object.keys(checks).filter(n => (only ? only.includes(n) : !(noNw && n === "nwjs_new_game")));
const base = runChecks(names, null);
for (const [name, r] of Object.entries(base)) {
    ran++;
    if (!r.ok) failed++;
    console.log(`${r.ok ? "PASS" : "FAIL"} ${name} - ${r.detail}`);
}
if (!only) {
    // Rule 4: every mutant must turn each of its named checks red, each green without it.
    for (const [name, m] of Object.entries(MUTANTS)) {
        const res = runChecks(m.kills, name);
        const state = k => (!base[k].ok ? "already red without the mutant" : res[k].ok ? "stayed green"
            : redByMutant(res[k]) ? "red" : `harness error (${res[k].detail.slice(0, 120)})`);
        const caught = m.kills.every(k => base[k].ok && redByMutant(res[k]));
        ran++;
        if (!caught) failed++;
        console.log(`${caught ? "PASS" : "FAIL"} mutant_${name} - ${m.why}: ${m.kills.map(k => `${k} ${state(k)}`).join(", ")}`);
    }
}
console.log(`RESULT: ${ran - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
