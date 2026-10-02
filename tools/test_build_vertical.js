#!/usr/bin/env node
"use strict";

/**
 * tools/test_build_vertical.js
 *
 * NAT.02.06 (lane-nx5): build above and below (DEC-083 rule 4, docs/design/COLLAPSE_REPLAN_DEC083.md section 5 "nx5").
 * A new block is accepted when it attaches to a block the structure holds, and refused otherwise; placing it never
 * drops anything else; floors and roofs are built on any level; a builder reaches the tile above or below it.
 *
 *   node tools/test_build_vertical.js               the headless checks, then every mutant in a child process
 *   node tools/test_build_vertical.js --no-sweep    the headless checks only
 *   node tools/test_build_vertical.js --mutant=NAME the checks against mutated plugins (exit 1 when one fails)
 *   node tools/test_build_vertical.js --ingame [--evidence=<dir>] [--seed=<n>] [--keep]
 *                                                   the in-engine scenario build_room_above (NW.js, on a snapshot copy)
 *
 * Headless: real World, WorldGen, Tiles, Objects, Items, Jobs, Levels, Floors, Fluid, Structural, Interact and
 * Colonists in a node vm (the harness of tools/test_structural_runtime.js), with the real event bus and shared tick.
 * A sandbox of 37 x 37 cells is painted first (levels -2 and -1 stone, 0 a stone deck, +1 and +2 air). The world is the
 * legacy range -2..2, so the anchors are the stone of level -2, S0. Jobs are run by UF.Jobs.update; a TEST colonist is
 * put on its stand cell (the vm moves no unit by itself), never on another level than the job chose.
 *
 * Checks:
 *   boot                          the plugins load; UF.Floors.attachment / canPlaceSlab / placement, UF.Jobs.standForReach
 *                                 and UF.Structural.explain exist; the sandbox drains held
 *   attached_down_accepted        a slab on level +1 over a wall (level 0) is accepted, attached down to a wall voxel
 *   attached_side_accepted        a slab beside a held slab is accepted, attached sideways on its own level
 *   attached_up_accepted          a slab under a held hanging block (its only solid neighbour is above) is accepted and
 *                                 written as S0 only: the hanging block's S1..S4 stay
 *   unattached_refused            a slab in open air is refused ("attaches to nothing") by canPlaceSlab, canLay, setFloor
 *                                 and the floor job, and nothing is written
 *   unheld_refused                a slab whose only solid neighbour is a piece the structure would drop is refused
 *                                 ("attaches to nothing that is held")
 *   can_lay_any_level             UF.Floors.canLay accepts an attached cell on level +1 and on level -1 (the old
 *                                 "level floor construction is not available" refusal is gone)
 *   builder_stands_below_to_roof  a colonist on level 0 builds the roof slab on level +1 from a stand on level 0, and
 *                                 never changes level
 *   build_refuses_unattached_wall a wall job in open air on level +2 is refused ("attaches to nothing") and places nothing
 *   room_above_built              the whole 5 x 5 roof (walls first, then inward) and a wall ring on it are built by jobs
 *                                 from level 0; every wall job's stand is on level 0
 *   deck_over_walls_holds         after the structure drains, nothing fell: no commit, no structure:fell, every deck slab
 *                                 and wall voxel is explained held
 *   placing_drops_nothing         the strata census of the sandbox equals the census before plus exactly the placed slabs;
 *                                 the structure committed no fall and the units did not move
 *   matter_note_build_once        every placement (slab or wall) issued UF.Matter.note("build") exactly once; item use is
 *                                 covered
 *   menu_build_above_below        "Build above/below" is offered on level 0 and on level +2; its "Roof above" row designates
 *                                 a floor job on the level above; an unattached row is disabled with its reason
 *   look_line_from_explain        the Look action pins the cell's lines plus "Structure: held: ..." from UF.Structural.explain
 *   colonists_airborne_rule       a colony wall step on level +1: a cell on the deck ring is "todo"; a cell in open air
 *                                 is "skipped" (UF.Colonists._internal.buildCells)
 *   no_errors                     no console.error from the plugins during the run
 *
 * Mutants (exact text edits of the plugins, compiled in memory; each edit must match exactly once):
 *   attach_any        -> unattached_refused            a block with no solid neighbour is accepted
 *   solid_is_enough   -> unheld_refused                any solid neighbour attaches, held or not
 *   whole_cell_write  -> placing_drops_nothing         a slab is written as a whole floor cell (S1..S4 become air)
 *   slab_high         -> deck_over_walls_holds         the slab is written to S4 instead of S0
 *   old_refusal       -> can_lay_any_level             canLay refuses every level but the ground again
 *   double_note       -> matter_note_build_once        the floor job notes "build" twice
 *   no_reach          -> builder_stands_below_to_roof  standForReach only finds stands on the target's own level
 *   no_attach_build   -> build_refuses_unattached_wall the build job skips the attachment rule
 *   airborne_old      -> colonists_airborne_rule       the old "unsupported airborne construction" rule is back
 *   no_menu           -> menu_build_above_below        the "Build above/below" option is not offered
 *   no_look_line      -> look_line_from_explain        the structure line is empty
 *
 * In-engine (--ingame): a snapshot copy of game/ in %TEMP% (robocopy; nothing under game/ is written), DEUS_Structural
 * registered in the snapshot's plugins.js (the PM registers it in the real one), and one test-only plugin holding the
 * suite "build_room_above". The suite builds a 5 x 5 wall ring on the ground next to the player, puts a TEST colonist
 * inside, designates the roof through the "Build above/below" menu, lets the colonist build it from below, designates a
 * wall ring on the deck through UF.Interact.buildOptions, lets the colonist build it from below too, and takes
 * screenshots of level 0 and level +1. Checks: structural_registered, ring_built, roof_built_from_below,
 * walls_built_from_below, nothing_fell, unattached_refused, look_line, no_errors. Exit: 0 all passed, 1 a check
 * failed, 2 harness problem.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const simHook = require("./lib/vm_sim_require");

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
    const a = args.find(x => x.startsWith("--" + name + "="));
    return a ? a.slice(name.length + 3) : fallback;
};
const MUTANT_ARG = argOf("mutant", "");
const INGAME = args.includes("--ingame");
const SWEEP = !MUTANT_ARG && !args.includes("--no-sweep");
const SEED = 20260923;

const MUTANTS = [
    { name: "attach_any", check: "unattached_refused", file: "DEUS_Floors.js",
        edits: [["if (!solid) return { ok: false, reason: \"attaches to nothing\", checked };", "if (!solid) return { ok: true, reason: \"\", checked }; /* MUTANT */"]] },
    { name: "solid_is_enough", check: "unheld_refused", file: "DEUS_Floors.js",
        edits: [["if (!checked) return { ok: true, reason: \"\", via, verdict: \"solid\", checked: false };", "if (true) return { ok: true, reason: \"\", via, verdict: \"solid\", checked: false }; /* MUTANT */"]] },
    { name: "whole_cell_write", check: "placing_drops_nothing", file: "DEUS_Floors.js",
        edits: [["return L.setStrata(r, { m, hp }, { cause: cause || \"floors:slab\" });", "return L.setShape(r, \"floor\", { constructed: true, material: material }); /* MUTANT */"]] },
    { name: "slab_high", check: "deck_over_walls_holds", file: "DEUS_Floors.js",
        edits: [["        m[0] = id | M_BUILT;\n        hp[0] = 255;\n", "        m[4] = id | M_BUILT; /* MUTANT */\n        hp[4] = 255;\n"]] },
    { name: "old_refusal", check: "can_lay_any_level", file: "DEUS_Floors.js",
        edits: [["        if (!supportedArea(area)) return { ok: false, reason: \"no such level\" };\n        if (!inBounds(area, x, y)) return { ok: false, reason: \"off the map\" };\n        if (isWater(area, x, y)) return { ok: false, reason: \"water\" };\n        const O = Objects(), o = O && O.atIn(area, x, y);\n        const isDomesticObject",
            "        if (!supportedArea(area) || zOf(area) !== 0) return { ok: false, reason: \"level floor construction is not available\" }; /* MUTANT */\n        if (!inBounds(area, x, y)) return { ok: false, reason: \"off the map\" };\n        if (isWater(area, x, y)) return { ok: false, reason: \"water\" };\n        const O = Objects(), o = O && O.atIn(area, x, y);\n        const isDomesticObject"]] },
    { name: "double_note", check: "matter_note_build_once", file: "DEUS_Floors.js",
        edits: [["                job.result = { kind: p.kind, item: p.item, count: need, slab };", "                matterNote(\"build\", { elementId: p.kind, item: p.item, count: need, cause: \"floors:lay\" }); /* MUTANT */\n                job.result = { kind: p.kind, item: p.item, count: need, slab };"]] },
    { name: "no_reach", check: "builder_stands_below_to_roof", file: "DEUS_Jobs.js",
        edits: [["        if (Math.abs(tz - uz) > REACH_LEVELS) return null;", "        if (tz !== uz) return null; /* MUTANT */"]] },
    { name: "no_attach_build", check: "build_refuses_unattached_wall", file: "DEUS_Jobs.js",
        edits: [["        return F && typeof F.placement === \"function\" ? F.placement(target, t) : { ok: true, reason: \"\" };", "        return { ok: true, reason: \"\" }; /* MUTANT */"]] },
    { name: "airborne_old", check: "colonists_airborne_rule", file: "DEUS_Colonists.js",
        edits: [["            else if (zOf(c) !== 0 && !placeableOffGround(c, x, y, t)) state = step.exact ? \"blocked\" : \"skipped\";",
            "            else if (zOf(c) !== 0 && (!World().walkable || !World().walkable(c.area.x, c.area.y, x, y, { z: zOf(c), ground: true }))) state = step.exact ? \"blocked\" : \"skipped\"; /* MUTANT */"]] },
    { name: "no_menu", check: "menu_build_above_below", file: "DEUS_Interact.js",
        edits: [["        if (window.UF.Floors && typeof UF.Floors.canLay === \"function\") add(\"build_vertical\"", "        if (false) add(\"build_vertical\""]] },
    { name: "no_look_line", check: "look_line_from_explain", file: "DEUS_Interact.js",
        edits: [["        return `Structure: ${e.reason}`;", "        return \"\"; /* MUTANT */"]] }
];

const CHECKS = ["boot", "attached_down_accepted", "attached_side_accepted", "attached_up_accepted", "unattached_refused", "unheld_refused",
    "can_lay_any_level", "builder_stands_below_to_roof", "build_refuses_unattached_wall", "room_above_built", "deck_over_walls_holds",
    "placing_drops_nothing", "matter_note_build_once", "menu_build_above_below", "look_line_from_explain", "colonists_airborne_rule", "no_errors"];

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

function pluginSource(file, mutantName) {
    let source = fs.readFileSync(path.join(PLUGINS, file), "utf8");
    if (!mutantName) return source;
    const mut = MUTANTS.find(m => m.name === mutantName);
    if (!mut) {
        console.error("unknown mutant \"" + mutantName + "\"; known: " + MUTANTS.map(m => m.name).join(", "));
        process.exit(2);
    }
    if (mut.file !== file) return source;
    for (const [from, to] of mut.edits) {
        const n = source.split(from).length - 1;
        if (n !== 1) {
            console.error("mutant " + mutantName + ": the edit matched " + n + " times in " + file);
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
// The vm: the harness of tools/test_structural_runtime.js, plus Jobs, Interact and Colonists

function buildEnvironment(seed, mutantName) {
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
        Input: { keyMapper: {} }, TouchInput: { _currentState: {}, x: 0, y: 0 }, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        ImageManager: { loadTileset() { return null; }, loadCharacter() { return null; }, loadFace() { return null; } },
        Utils: { isOptionValid: () => false, encodeURI: s => s },
        Tilemap: function () {},
        $dataTilesets: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/Tilesets.json"), "utf8")),
        $ufWorldCatalog: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/UF_WorldCatalog.json"), "utf8")),
        $ufTime: { year: 1, monthIndex: 0, day: 1, hour: 8, minute: 0 },
        $gameSystem: { windowPadding: () => 12 }, $gameScreen: { weatherType: () => "none", weatherPower: () => 0, changeWeather() {} },
        $gameTimer: {}, $gameSwitches: {}, $gameVariables: {}, $gameSelfSwitches: {}, $gameActors: {}, $gameParty: {}, $dataMap: null
    };
    env.window = env;
    env.globalThis = env;
    env.DEUS = env.UF;
    env.$deusWorldCatalog = env.$ufWorldCatalog;
    env.Tilemap.TILE_ID_A1 = 2048;
    env.Tilemap.TILE_ID_A2 = 2816;
    env.Tilemap.isTileA1 = id => id >= 2048 && id < 2816;
    env.Tilemap.isWaterTile = id => env.Tilemap.isTileA1(id);
    for (const name of ["Window_Base", "Window_Selectable", "Window_Command", "Scene_Map", "Scene_Boot", "Scene_Base", "Rectangle", "Game_Map", "Game_Player",
        "Game_CharacterBase", "Game_Character", "Game_Event", "Spriteset_Map", "Spriteset_Base", "Sprite_Character", "Window_Message", "Scene_Title", "Game_Interpreter"]) {
        env[name] = vm.runInNewContext("(function " + name + "(){})");
        env[name].prototype.initialize = function () {};
    }
    env.Scene_Boot.prototype.start = function () {};
    env.Scene_Boot.prototype.isReady = function () { return true; };
    env.Spriteset_Map.prototype.createCharacters = function () {};
    env.Spriteset_Map.prototype.update = function () {};
    env.Scene_Map.prototype.update = function () {};
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
    Object.assign(env.Bitmap.prototype, { isReady() { return true; }, isError() { return false; }, clear() {}, clearRect() {}, fillRect() {}, blt() {},
        measureTextWidth: s => String(s).length * 8, destroy() {} });
    env.Bitmap.load = () => ({ isReady: () => false, isError: () => false });
    Object.assign(env.Game_Map.prototype, {
        mapId() { return this._mapId || 0; }, width: () => 256, height: () => 256, update() {}, tileId: () => 0, tilesetFlags: () => [],
        isPassable: () => true, checkPassage: () => true, isValid: (x, y) => x >= 0 && y >= 0 && x < 256 && y < 256,
        displayX() { return 0; }, displayY() { return 0; }, screenTileX: () => 17, screenTileY: () => 13,
        adjustX(x) { return x; }, adjustY(y) { return y; }, tileWidth: () => 48, tileHeight: () => 48,
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
    const pluginFiles = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Tiles.js", "DEUS_Objects.js", "DEUS_Items.js", "DEUS_Jobs.js", "DEUS_Levels.js",
        "DEUS_Floors.js", "DEUS_Fluid.js", "DEUS_Structural.js", "DEUS_Interact.js", "DEUS_Colonists.js"];
    env.__loaded = [];
    env.__loadErrors = [];
    for (const file of pluginFiles) {
        try {
            vm.runInContext(pluginSource(file, mutantName), ctx, { filename: file });
            env.__loaded.push(file);
        } catch (e) {
            env.__loadErrors.push(file + ": " + (e && e.stack ? e.stack.split("\n").slice(0, 2).join(" | ") : String(e)));
        }
    }
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
const HANG = ["air", "stone", "stone", "stone", "stone"];
const SX0 = 36, SX1 = 72, SY0 = 36, SY1 = 72;
const M_HANG = "air/stone/stone/stone/stone";

function paint(L, x, y, z, m) {
    const hp = m.map(k => (k === "air" || k === "water" || k === "lava") ? 0 : 255);
    return L.setStrata({ area: AREA, x, y, z }, { m, hp, connector: 0 }, { cause: "test" });
}
function mats(L, x, y, z) {
    const st = L.strataAt({ area: AREA, x, y, z });
    return st ? st.materials.join("/") : "null";
}
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
function drain(env, cap) {
    const S = env.UF.Structural, t0 = env.UF.Sim.tickCount();
    let ticks = 0;
    while (ticks < cap) {
        const s = S.stats();
        if (s.queued === 0 && s.active === 0 && s.debt === 0) break;
        runTicks(env, 1);
        ticks = env.UF.Sim.tickCount() - t0;
    }
    const s = S.stats();
    return { ticks, done: s.queued === 0 && s.active === 0 && s.debt === 0 };
}
// Solid strata of the sandbox, by position: "x,y,z,s" -> "byte:hp".
function strataMap(L) {
    const out = new Map();
    for (let z = -2; z <= 2; z++) for (let y = SY0; y <= SY1; y++) for (let x = SX0; x <= SX1; x++) {
        const st = L.strataAt({ area: AREA, x, y, z });
        if (!st) continue;
        for (let s = 0; s < 5; s++) if (st.hp[s] > 0 && ["stone", "soil", "wood"].includes(st.materials[s])) out.set(x + "," + y + "," + z + "," + s, st.bytes[s] + ":" + st.hp[s]);
    }
    return out;
}

//-----------------------------------------------------------------------------
// The headless run

function run(mutantName) {
    let env;
    try {
        env = buildEnvironment(SEED, mutantName);
    } catch (e) {
        check("boot", false, "the vm did not boot: " + (e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : String(e)));
        return;
    }
    const UF = env.UF, W = UF.World, L = UF.Levels, O = UF.Objects, I = UF.Items, J = UF.Jobs, Fl = UF.Floors, S = UF.Structural, Ix = UF.Interact, C = UF.Colonists;
    const errorsAtBoot = env.__errors.length;

    // Test-side doubles: SRD rules (DEUS_Combat publishes them in the game), a death hook, a matter spy.
    UF.Rules = loadRules();
    const deaths = [];
    UF.Combat = {
        onUnitDeath(u) { deaths.push({ id: u.id, cause: u.data && u.data.deathCause }); if (u.data) u.data.dead = true; W.removeUnit(u.id); return true; },
        addPopup() {}
    };
    let coverDepth = 0;
    const notes = [];
    UF.Matter = {
        note(kind, detail) { if (kind !== "tick") notes.push({ kind, detail: detail || {}, covered: coverDepth > 0 }); return { ok: true }; },
        cover(fn) { coverDepth++; try { return fn(); } finally { coverDepth--; } },
        covered() { return coverDepth > 0; }
    };
    let fellEvents = 0;
    UF.Events.on("structure:fell", () => { fellEvents++; });
    if (C && typeof C.setEnabled === "function") C.setEnabled(false);
    const wallId = O.type("wall_wood") ? "wall_wood" : (O.types().find(t => t.build && t.tags && t.tags.includes("wall")) || {}).id;
    const wallType = wallId ? O.type(wallId) : null;

    const apiOk = !!Fl && typeof Fl.attachment === "function" && typeof Fl.canPlaceSlab === "function" && typeof Fl.placement === "function" &&
        !!J && typeof J.standForReach === "function" && !!S && typeof S.explain === "function" && !!Ix && typeof Ix.verticalOptions === "function" &&
        !!C && !!C._internal && typeof C._internal.buildCells === "function" && !!wallType;

    //------------------------------------------------------------ the sandbox
    if (UF.Fluid && typeof UF.Fluid.reset === "function") UF.Fluid.reset();
    if (apiOk) {
        for (let y = SY0; y <= SY1; y++) for (let x = SX0; x <= SX1; x++) {
            for (const z of [-2, -1, 0, 1, 2]) W.setObject(0, 0, x, y, 0, z);
            paint(L, x, y, -2, STONE);
            paint(L, x, y, -1, STONE);
            paint(L, x, y, 0, DECK);
            paint(L, x, y, 1, AIR);
            paint(L, x, y, 2, AIR);
        }
        // The hanging row on level +1: column Q (60,64) solid on levels 0 and +1, then P, A and B east of it, S1..S4 only.
        // A's S0 (62,64) has one solid neighbour, the block above it; B (63,64) hangs on A alone.
        paint(L, 60, 64, 0, STONE);
        paint(L, 60, 64, 1, STONE);
        paint(L, 61, 64, 1, HANG);
        paint(L, 62, 64, 1, HANG);
        paint(L, 63, 64, 1, HANG);
    }
    const setup = apiOk ? drain(env, 4000) : { done: false, ticks: 0 };
    const s0 = apiOk ? S.stats() : null;
    check("boot", apiOk && env.__loadErrors.length === 0 && setup.done && s0.commits === 0,
        "loaded " + env.__loaded.length + " plugins" + (env.__loadErrors.length ? "; load errors: " + env.__loadErrors.join(" || ") : "") +
        "; API " + apiOk + "; sandbox drained " + setup.done + " in " + setup.ticks + " ticks, held " + (s0 ? s0.verdicts.held : "-") + ", commits " + (s0 ? s0.commits : "-"));
    if (!apiOk) return;

    // The census and the unit list from here on; every placement is recorded.
    const before = strataMap(L);
    const placed = [];          // { kind: "slab" | "wall", x, y, z }
    const ref = (x, y, z) => ({ area: AREA, x, y, z });
    const la = z => ({ x: 0, y: 0, z });

    // The wall ring on level 0: 5 x 5 at (44..48, 44..48), interior 45..47.
    const RX0 = 44, RX1 = 48, RY0 = 44, RY1 = 48;
    const ring = [];
    for (let y = RY0; y <= RY1; y++) for (let x = RX0; x <= RX1; x++) if (x === RX0 || x === RX1 || y === RY0 || y === RY1) ring.push({ x, y });
    const ringPlaced = ring.filter(c => O.setIn(la(0), c.x, c.y, wallId)).length;
    drain(env, 400);
    const colonist = W.addUnit({ name: "TEST_builder", area: AREA, z: 0, x: 46, y: 46, exact: true,
        data: { kind: "colonist", hp: 20, maxHp: 20, inventory: [], equipment: {}, workRate: 1 } });

    // Runs a job with the TEST colonist: the colonist is put on the job's stand cell each update. Returns the levels it stood on.
    const jobItemNotes = [];   // UF.Matter "item" notes made while a job ran (the test's own drops are not the jobs')
    function runJob(job, unit, cap) {
        const levels = new Set(), n0 = notes.length;
        try { return runJobInner(job, unit, cap, levels); } finally { for (const n of notes.slice(n0)) if (n.kind === "item") jobItemNotes.push(n); }
    }
    function runJobInner(job, unit, cap, levels) {
        for (let i = 0; i < (cap || 4000) && job && (job.state === "open" || job.state === "travel" || job.state === "work"); i++) {
            if (job.state === "open") { if (!J.assign(job.id, unit.id)) break; continue; }
            if (job.stand && (unit.x !== job.stand.x || unit.y !== job.stand.y || (unit.z || 0) !== job.stand.z)) W.moveUnitToLevel(unit, job.stand.z, job.stand.x, job.stand.y);
            levels.add(unit.z || 0);
            J.update();
        }
        return levels;
    }
    function giveLogs(unit, n) {
        const got = I.drop(la(unit.z || 0), unit.x, unit.y, "log", n);
        for (const it of got || []) I.pickUp(it.id, unit.id);
        return I.count(unit.id, "log");
    }
    const floorSpec = { kind: "floor_wood", item: "log", count: 1, force: true };

    //------------------------------------------------------------ down, side, up
    const cDown = Fl.canPlaceSlab(ref(RX0, RY0, 1));
    check("attached_down_accepted", cDown.ok && cDown.attach && cDown.attach.via.z === 0 && cDown.attach.via.s === 4 && cDown.attach.verdict === "held" && cDown.attach.checked === true,
        "ring walls placed " + ringPlaced + "/" + ring.length + "; slab over (" + RX0 + "," + RY0 + ") level 1: " + JSON.stringify({ ok: cDown.ok, reason: cDown.reason, via: cDown.attach && cDown.attach.via, verdict: cDown.attach && cDown.attach.verdict }));

    //------------------------------------------------------------ the builder stands below to roof
    giveLogs(colonist, 1);
    const roof0 = J.create({ type: "floor", target: { area: AREA, x: RX0, y: RY0, z: 1 }, params: Object.assign({ as: "roof" }, floorSpec), owner: null });
    const notes0 = notes.length;
    const roofLevels = runJob(roof0, colonist);
    const roofNotes = notes.slice(notes0).filter(n => n.kind === "build");
    const roofCell = L.strataAt(ref(RX0, RY0, 1));
    if (roof0 && roof0.state === "done") placed.push({ kind: "slab", x: RX0, y: RY0, z: 1, notes: roofNotes.length });
    check("builder_stands_below_to_roof", !!roof0 && roof0.state === "done" && roof0.stand && roof0.stand.z === 0 && roofLevels.size === 1 && roofLevels.has(0) &&
        roofCell.materials[0] === "wood" && roofCell.constructed[0] === true && I.count(colonist.id, "log") === 0,
        roof0 ? "job " + roof0.state + (roof0.reason ? " (" + roof0.reason + ")" : "") + "; stand " + JSON.stringify(roof0.stand) + "; builder stood on levels " + [...roofLevels].join(",") +
            "; level 1 (" + RX0 + "," + RY0 + ") " + roofCell.materials.join("/") + " constructed " + roofCell.constructed[0] + "; logs left " + I.count(colonist.id, "log") : "no job");

    // Outside the ring, north of the new slab: below it is the deck's air (level 0, S4), so its only solid neighbour is the slab.
    const sideCell = { x: RX0, y: RY0 - 1 };
    const cSide = Fl.canPlaceSlab(ref(sideCell.x, sideCell.y, 1));
    check("attached_side_accepted", cSide.ok && cSide.attach && cSide.attach.via.z === 1 && cSide.attach.via.s === 0 &&
        cSide.attach.via.x === RX0 && cSide.attach.via.y === RY0 && cSide.attach.verdict === "held",
        "slab at (" + sideCell.x + "," + sideCell.y + ") level 1: " + JSON.stringify({ ok: cSide.ok, reason: cSide.reason, via: cSide.attach && cSide.attach.via }));

    const cUp = Fl.canPlaceSlab(ref(62, 64, 1));
    const upPlaced = cUp.ok && Fl.setFloor(la(1), 62, 64, "floor_stone");
    if (upPlaced) placed.push({ kind: "slab", x: 62, y: 64, z: 1, notes: 0, direct: true });
    const upCell = L.strataAt(ref(62, 64, 1));
    check("attached_up_accepted", cUp.ok && cUp.attach && cUp.attach.via.x === 62 && cUp.attach.via.y === 64 && cUp.attach.via.z === 1 && cUp.attach.via.s === 1 && upPlaced &&
        upCell.materials.join("/") === "stone/stone/stone/stone/stone" && upCell.constructed[0] === true && upCell.constructed[1] === false,
        JSON.stringify({ ok: cUp.ok, reason: cUp.reason, via: cUp.attach && cUp.attach.via, placed: upPlaced }) + "; cell now " + upCell.materials.join("/") +
        " constructed " + upCell.constructed.join(","));

    //------------------------------------------------------------ refused: unattached, unheld
    const openAir = { x: 66, y: 40, z: 2 };
    const openBefore = mats(L, openAir.x, openAir.y, openAir.z);
    const cOpen = Fl.canPlaceSlab(ref(openAir.x, openAir.y, openAir.z));
    const layOpen = Fl.canLay(la(openAir.z), openAir.x, openAir.y, true);
    const setOpen = Fl.setFloor(la(openAir.z), openAir.x, openAir.y, "floor_wood");
    giveLogs(colonist, 1);
    const openJob = J.create({ type: "floor", target: { area: AREA, x: openAir.x, y: openAir.y, z: openAir.z }, params: Object.assign({}, floorSpec), owner: null });
    W.moveUnitToLevel(colonist, 1, 66, 41);   // within a level of it (the deck at level 1 is air: the vm stands it there for the plan only)
    const openAssigned = J.assign(openJob.id, colonist.id);
    W.moveUnitToLevel(colonist, 0, 46, 46);
    check("unattached_refused", !cOpen.ok && cOpen.reason === "attaches to nothing" && !layOpen.ok && layOpen.reason === "attaches to nothing" && setOpen === false &&
        !!openAssigned && openJob.state === "failed" && openJob.reason === "attaches to nothing" && mats(L, openAir.x, openAir.y, openAir.z) === openBefore,
        "canPlaceSlab " + JSON.stringify({ ok: cOpen.ok, reason: cOpen.reason }) + "; canLay " + JSON.stringify(layOpen.ok) + " " + layOpen.reason + "; setFloor " + setOpen +
        "; job " + (openJob && openJob.state) + " (" + (openJob && openJob.reason) + "); cell " + mats(L, openAir.x, openAir.y, openAir.z));

    // A piece the structure would drop: painted with the structure's events off, then removed the same way.
    S.enabled = false;
    paint(L, 68, 68, 2, STONE);
    const exFloat = S.explain({ area: AREA, x: 68, y: 68, z: 2, s: 0 });
    const cFloat = Fl.canPlaceSlab(ref(67, 68, 2));
    paint(L, 68, 68, 2, AIR);
    S.enabled = true;
    check("unheld_refused", exFloat.verdict === "falls" && !cFloat.ok && cFloat.reason === "attaches to nothing that is held" && mats(L, 67, 68, 2) === "air/air/air/air/air",
        "the piece: " + exFloat.verdict + " (" + exFloat.reason + "); slab beside it: " + JSON.stringify({ ok: cFloat.ok, reason: cFloat.reason }));

    //------------------------------------------------------------ floors on any level
    // Level -1: a shaft cell whose S0 is air, beside rock (attached sideways).
    paint(L, 40, 40, -1, AIR);
    drain(env, 200);
    const lay1 = Fl.canLay(la(1), sideCell.x, sideCell.y, true);
    const layM1 = Fl.canLay(la(-1), 40, 40, true);
    check("can_lay_any_level", lay1.ok && layM1.ok, "level 1 (" + sideCell.x + "," + sideCell.y + "): " + JSON.stringify(lay1.ok) + " " + (lay1.reason || "") +
        "; level -1 (40,40): " + JSON.stringify(layM1.ok) + " " + (layM1.reason || ""));
    paint(L, 40, 40, -1, STONE);
    drain(env, 200);

    //------------------------------------------------------------ a wall in open air: refused by the build job
    const wallAir = { x: 66, y: 44, z: 2 };
    I.drop(la(2), wallAir.x, wallAir.y, "wood", 10);
    I.drop(la(2), wallAir.x, wallAir.y, "log", 10);
    for (const id of Object.keys((wallType.build && wallType.build.items) || {})) I.drop(la(2), wallAir.x, wallAir.y, id, 10);
    const wallJob = J.create({ type: "build", target: { area: AREA, x: wallAir.x, y: wallAir.y, z: wallAir.z }, params: { objectId: wallId }, owner: null });
    W.moveUnitToLevel(colonist, 1, wallAir.x, wallAir.y + 1);
    J.assign(wallJob.id, colonist.id);
    runJob(wallJob, colonist, 2000);
    W.moveUnitToLevel(colonist, 0, 46, 46);
    const airObject = O.typeIdIn(la(2), wallAir.x, wallAir.y);
    for (const it of I.atIn(la(2), wallAir.x, wallAir.y)) I.remove(it.id);
    check("build_refuses_unattached_wall", wallJob.state === "failed" && wallJob.reason === "attaches to nothing" && !airObject,
        "job " + wallJob.state + " (" + wallJob.reason + "); object at (" + wallAir.x + "," + wallAir.y + ") level 2: " + (airObject || "none"));
    if (airObject) O.setIn(la(2), wallAir.x, wallAir.y, null);

    //------------------------------------------------------------ the room above: roof from below, then walls on it from below
    const roofCells = [];
    for (let y = RY0; y <= RY1; y++) for (let x = RX0; x <= RX1; x++) if (!(x === RX0 && y === RY0)) roofCells.push({ x, y });
    const roofJobs = roofCells.map(c => J.create({ type: "floor", target: { area: AREA, x: c.x, y: c.y, z: 1 }, params: Object.assign({ as: "roof" }, floorSpec), owner: null }));
    const roofTrace = [];
    for (let guard = 0; guard < roofJobs.length * 3; guard++) {
        const left = roofJobs.filter(j => j.state === "open");
        if (!left.length) break;
        giveLogs(colonist, 1);
        const n0 = notes.length;
        const job = J.take(colonist.id, j => j.type === "floor" && roofJobs.includes(j));
        if (!job) { roofTrace.push("none takeable: " + left.map(j => j.target.x + "," + j.target.y + " " + j.reason).slice(0, 3).join("; ")); break; }
        const lv = runJob(job, colonist);
        if (job.state === "done") placed.push({ kind: "slab", x: job.target.x, y: job.target.y, z: 1, notes: notes.slice(n0).filter(n => n.kind === "build").length, levels: [...lv] });
        else roofTrace.push(job.target.x + "," + job.target.y + " " + job.state + " " + job.reason);
    }
    // Spare logs from the giveLogs above are dropped where the builder stands, so the census of items stays readable.
    for (const it of I.all().filter(i => i.holder === colonist.id)) I.putDown(it.id, la(colonist.z || 0), colonist.x, colonist.y);
    const roofDone = roofJobs.filter(j => j.state === "done").length;
    // A wall ring on the deck at level 1, over the walls of level 0; its items lie on the deck; built from level 0.
    const wallJobs = [];
    for (const c of ring) {
        for (const id of Object.keys((wallType.build && wallType.build.items) || {})) I.drop(la(1), c.x, c.y, id, wallType.build.items[id]);
        wallJobs.push(J.create({ type: "build", target: { area: AREA, x: c.x, y: c.y, z: 1 }, params: { objectId: wallId }, owner: null }));
    }
    const wallStands = [];
    for (const job of wallJobs) {
        const n0 = notes.length;
        J.assign(job.id, colonist.id);
        const lv = runJob(job, colonist);
        wallStands.push(job.stand ? job.stand.z : null);
        if (job.state === "done") placed.push({ kind: "wall", x: job.target.x, y: job.target.y, z: 1, notes: notes.slice(n0).filter(n => n.kind === "build").length, levels: [...lv] });
        else roofTrace.push("wall " + job.target.x + "," + job.target.y + " " + job.state + " " + job.reason);
    }
    const wallsDone = wallJobs.filter(j => j.state === "done" && O.typeIdIn(la(1), j.target.x, j.target.y) === wallType.typeId).length;
    check("room_above_built", roofDone === roofJobs.length && wallsDone === wallJobs.length && wallStands.every(z => z === 0) &&
        placed.filter(p => p.levels).every(p => p.levels.length === 1 && p.levels[0] === 0),
        "roof " + (roofDone + 1) + "/25 slabs; walls on the deck " + wallsDone + "/" + wallJobs.length + "; wall stands on levels " + [...new Set(wallStands)].join(",") +
        (roofTrace.length ? "; " + roofTrace.slice(0, 4).join(" | ") : ""));

    //------------------------------------------------------------ nothing fell
    const sBeforeDrain = S.stats();
    const drained = drain(env, 2000);
    const sAfter = S.stats();
    const deckHeld = [];
    for (let y = RY0; y <= RY1; y++) for (let x = RX0; x <= RX1; x++) deckHeld.push(S.explain({ area: AREA, x, y, z: 1, s: 0 }).verdict);
    const wallVoxel = S.explain({ area: AREA, x: RX1, y: RY1, z: 1, s: 3 });
    check("deck_over_walls_holds", drained.done && sAfter.commits === 0 && fellEvents === 0 && deckHeld.every(v => v === "held") && wallVoxel.verdict === "held" &&
        wallVoxel.block.source === "object",
        "drained " + drained.done + " in " + drained.ticks + " ticks; commits " + sAfter.commits + ", falls decided " + sAfter.verdicts.falls + ", structure:fell " + fellEvents +
        "; deck slabs held " + deckHeld.filter(v => v === "held").length + "/25 (" + [...new Set(deckHeld)].join(",") + "); wall voxel on the deck: " + wallVoxel.verdict +
        " (" + (wallVoxel.block && wallVoxel.block.source) + "); checks since the sandbox: " + (sAfter.verdicts.held - sBeforeDrain.verdicts.held) + " more held");

    const after = strataMap(L);
    const slabKeys = new Set(placed.filter(p => p.kind === "slab").map(p => p.x + "," + p.y + "," + p.z + ",0"));
    const lost = [...before.keys()].filter(k => after.get(k) !== before.get(k));
    const added = [...after.keys()].filter(k => !before.has(k));
    const unexpected = added.filter(k => !slabKeys.has(k));
    const missingSlabs = [...slabKeys].filter(k => !after.has(k));
    const builderOk = !!W.unit(colonist.id) && deaths.length === 0;
    check("placing_drops_nothing", lost.length === 0 && unexpected.length === 0 && missingSlabs.length === 0 && added.length === slabKeys.size && sAfter.commits === 0 && builderOk &&
        mats(L, 61, 64, 1) === M_HANG && mats(L, 63, 64, 1) === M_HANG,
        "strata before " + before.size + ", after " + after.size + "; changed or gone " + lost.length + (lost.length ? " (" + lost.slice(0, 4).join(" ") + ")" : "") +
        "; added " + added.length + " (placed slabs " + slabKeys.size + ", unexpected " + unexpected.length + (unexpected.length ? ": " + unexpected.slice(0, 4).join(" ") : "") +
        "); commits " + sAfter.commits + "; builder alive " + builderOk + "; P " + mats(L, 61, 64, 1) + ", B " + mats(L, 63, 64, 1));

    const jobPlacements = placed.filter(p => !p.direct);
    const buildNotes = notes.filter(n => n.kind === "build");
    const uncoveredItems = jobItemNotes.filter(n => !n.covered);
    check("matter_note_build_once", jobPlacements.length > 0 && jobPlacements.every(p => p.notes === 1) && buildNotes.length === jobPlacements.length && uncoveredItems.length === 0,
        jobPlacements.length + " placements by jobs (" + jobPlacements.filter(p => p.kind === "slab").length + " slabs, " + jobPlacements.filter(p => p.kind === "wall").length +
        " walls); notes per placement " + [...new Set(jobPlacements.map(p => p.notes))].join(",") + "; build notes " + buildNotes.length +
        " (causes " + [...new Set(buildNotes.map(n => n.detail.cause))].join(",") + "); item notes during the jobs " + jobItemNotes.length + ", uncovered " + uncoveredItems.length);

    //------------------------------------------------------------ the menu, the Look line
    env.$gameMap._mapId = W.areaMapId(0, 0, 0);   // the ground of area (0,0) on screen, for optionsFor
    const view = W.viewLevel();
    const t0opts = Ix.verticalOptions({ area: AREA, x: 50, y: 50, z: 0 });
    const roofRow = t0opts.find(o => o.id === "vertical:roof");
    const t2opts = Ix.verticalOptions({ area: AREA, x: 66, y: 40, z: 2 });
    const hereRow2 = t2opts.find(o => o.id === "vertical:floor");
    const t1opts = Ix.verticalOptions({ area: AREA, x: RX0 + 1, y: RY0 - 1, z: 1 });
    const hereRow1 = t1opts.find(o => o.id === "vertical:floor");
    // optionsFor reads the level on screen; the vm's view is level `view.z`.
    const viewOpts = Ix.optionsFor(50, 50);
    const offered = viewOpts.some(o => o.id === "build_vertical");
    const sub = offered ? viewOpts.find(o => o.id === "build_vertical").run() : null;
    let made = null;
    const roofBeside = { x: RX1 + 1, y: RY0 };
    const besideRow = Ix.verticalOptions({ area: AREA, x: roofBeside.x, y: roofBeside.y, z: 0 }).find(o => o.id === "vertical:roof");
    if (besideRow && besideRow.enabled) made = besideRow.run();
    check("menu_build_above_below", offered && !!sub && Array.isArray(sub.submenu) && sub.header === "Build above/below" && !!roofRow && roofRow.level === 1 &&
        !!hereRow2 && hereRow2.enabled === false && /attaches to nothing/.test(hereRow2.label) && !!hereRow1 && hereRow1.enabled === true &&
        !!made && made.type === "floor" && made.target.z === 1 && made.params.as === "roof",
        "view level " + JSON.stringify(view) + "; offered " + offered + "; level 0 (50,50): " + t0opts.map(o => o.label).join(" / ") + "; level 2 (66,40): " + t2opts.map(o => o.label).join(" / ") +
        "; level 1 (" + (RX0 + 1) + "," + (RY0 - 1) + "): " + t1opts.map(o => o.label + (o.enabled ? "" : " [off]")).join(" / ") +
        "; roof over (" + roofBeside.x + "," + roofBeside.y + ") designated " + (made ? "job #" + made.id + " " + made.type + " z " + made.target.z + " as " + made.params.as : "none"));
    if (made) J.cancel(made.id, "test");

    let pinned = null;
    UF.Look = { describeCell: () => ["TEST what", "TEST land", ""], show(x, y, s, lines) { pinned = { x, y, lines }; return true; }, unitAt: () => null };
    const line = Ix.structureLine({ area: AREA, x: 46, y: 46, z: 1 });
    const lookOpt = Ix.optionsFor(46, 46).find(o => o.id === "look");
    if (lookOpt) lookOpt.run();
    const pinnedLine = pinned && pinned.lines ? pinned.lines[pinned.lines.length - 1] : "";
    check("look_line_from_explain", /^Structure: held: a chain of \d+ solid blocks reaches the bottom of the world/.test(line) && !!pinned && /^Structure: held: /.test(pinnedLine) &&
        pinned.lines[0] === "TEST what",
        "deck (46,46) level 1: \"" + line + "\"; Look pinned " + (pinned ? JSON.stringify(pinned.lines) : "nothing"));
    delete UF.Look;
    env.$gameMap._mapId = 0;

    //------------------------------------------------------------ the colonists' airborne rule
    const colony = { plan: [], siteId: "TEST_site", site: { x: 46, y: 46 }, area: { x: 0, y: 0 }, z: 1, radius: 8, stockpiles: [], log: [] };
    // (49,46) beside the deck's east wall column on level 1: the wall on the deck at (48,46) holds it sideways.
    // (66,52) in open air on level 1 far from everything.
    const step = { build: wallId, cells: [[49 - 46, 0], [66 - 46, 52 - 46]], exact: false };
    let cells = [];
    if (!W.state.colony) W.state.colony = { settlements: {} };   // colonyState() hands back a passed colony only when one exists
    try { cells = C._internal.buildCells(step, colony); } catch (e) { cells = [{ error: String(e && e.message) }]; }
    const at = (x, y) => cells.find(c => c.x === x && c.y === y);
    check("colonists_airborne_rule", !!at(49, 46) && at(49, 46).state === "todo" && !!at(66, 52) && at(66, 52).state === "skipped",
        JSON.stringify(cells.map(c => c.error ? c : { x: c.x, y: c.y, state: c.state })));

    const errs = env.__errors.slice(errorsAtBoot);
    check("no_errors", errs.length === 0 && !S.stats().lastError,
        errs.length ? errs.slice(0, 3).join(" | ").slice(0, 600) : "none" + (S.stats().lastError ? "; lastError " + S.stats().lastError : ""));
}

//-----------------------------------------------------------------------------
// In-engine: build_room_above (NW.js, on a snapshot copy of game/)

const SUITE = "build_room_above";
const TEST_PLUGIN = "DEUS_TestBuildVertical";
const INGAME_CHECKS = ["structural_registered", "ring_built", "roof_built_from_below", "walls_built_from_below", "nothing_fell", "unattached_refused", "look_line", "no_errors"];

function suitePlugin() {
    "use strict";
    const T = window.UF && window.UF.Test;
    if (!T || !T.active) return;
    T.suite("build_room_above", async t => {
        const W = UF.World, L = UF.Levels, O = UF.Objects, I = UF.Items, J = UF.Jobs, S = UF.Structural, Fl = UF.Floors, Ix = UF.Interact;
        const wallId = O.type("wall_wood") ? "wall_wood" : (O.types().find(t => t.build && t.tags && t.tags.includes("wall")) || {}).id;
        const wallType = wallId ? O.type(wallId) : null;
        const errors0 = t.errorsSoFar().length, consoleErrors = [], realConsoleError = console.error;
        console.error = function(...a) {
            consoleErrors.push(a.map(x => (x && x.stack) || String(x)).join(" ").slice(0, 300));
            return realConsoleError.apply(this, a);
        };
        const settled = () => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted() && !$gamePlayer.isTransferring() && !L.switching();
        await t.waitUntil(settled, 30000, "the map to settle");
        const tickNames = UF.Sim && UF.Sim.tickStats ? UF.Sim.tickStats().handlers : [];
        t.check("structural_registered", !!S && S.enabled === true && S.mode === "live" && tickNames.includes("structure") && !!Fl && typeof Fl.attachment === "function" &&
            !!J && typeof J.standForReach === "function", `UF.Structural ${!!S}; tick handlers ${tickNames.join(",")}; Floors.attachment ${!!(Fl && Fl.attachment)}`);
        if (!S || !Fl || !Ix) return;
        if (UF.Colonists && UF.Colonists.setEnabled) UF.Colonists.setEnabled(false);
        if (window.$colonyManager) $colonyManager.cameraFollowUnit = null;
        if (L.view() !== 0) {
            L.setView(0);
            await t.waitUntil(() => settled() && L.view() === 0, 20000, "the ground").catch(() => {});
        }
        const v = W.viewLevel(), area = { x: v.x, y: v.y }, size = W.state.size, zr = W.zRange();
        // A flat clear 9 x 9 spot: standable ground, no object, no water, no unit, an empty level above; searched outward from the player.
        const la = z => ({ x: area.x, y: area.y, z });
        const clear = (x0, y0) => {
            for (let y = y0 - 4; y <= y0 + 4; y++) for (let x = x0 - 4; x <= x0 + 4; x++) {
                if (x < 2 || y < 2 || x > size - 3 || y > size - 3) return false;
                if (!J.standable(la(0), x, y)) return false;
                if (O.atIn(la(0), x, y) || O.atIn(la(1), x, y)) return false;
                const up = L.strataAt({ area, x, y, z: 1 });
                if (!up || up.materials.some(m => m !== "air")) return false;
                const g = L.strataAt({ area, x, y, z: 0 });
                if (!g || g.materials[0] === "air" || g.materials.slice(1).some(m => m !== "air")) return false;
            }
            return true;
        };
        const px = $gamePlayer.x, py = $gamePlayer.y;
                            let cx = px + 3, cy = py + 3;
          const ring = [];
          for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) === 2) ring.push({ x, y });
        let ringPlaced = 0;
        if (cx >= 0) for (const c of ring) if (O.setIn(la(0), c.x, c.y, wallId)) ringPlaced++;
        const builder = cx >= 0 ? W.addUnit({ name: "TEST_builder", image: { characterName: "People1", characterIndex: 0 }, area, z: 0, x: cx, y: cy, exact: true,
            data: { kind: "colonist", faction: W.state.factions && W.state.factions.playerId, hp: 20, maxHp: 20, inventory: [], equipment: {}, workRate: 4 } }) : null;
        t.check("ring_built", cx >= 0 && ringPlaced === ring.length && !!builder, `spot (${cx},${cy}) from the player (${px},${py}); walls ${ringPlaced}/${ring.length} (${wallId}); builder ${builder && builder.id}`);
        if (cx < 0 || !builder) return;

        const s0 = S.stats();
        let fell = 0;
        const onFell = () => { fell++; };
        UF.Events.on("structure:fell", onFell);
        if (UF.Time) { if (UF.Time.paused) UF.Time.resume(); UF.Time.setLevel(Math.min(2, UF.Time.speeds.length - 1)); }
        const look = async (z) => {
            if (L.view() !== z) {
                L.setView(z, { center: { x: cx, y: cy + 3 } });
                await t.waitUntil(() => settled() && L.view() === z, 20000, `level ${z}`).catch(() => {});
            }
            $gamePlayer.locate(cx, cy + 4);
            await t.waitFrames(20);
        };
        // Runs one job with the TEST builder, who walks there itself; logs are put in its pack first.
        const work = async (job, label) => {
            if (!job) return null;
            const spec = Fl.playerCultureFloor();
            if (job.type === "floor" && I.count(builder.id, job.params.item) < (job.params.count || 1)) {
                const got = I.drop(la(builder.z || 0), builder.x, builder.y, job.params.item, job.params.count || 1);
                for (const it of got || []) I.pickUp(it.id, builder.id);
            }
            if (!J.assign(job.id, builder.id)) return job;
            const levels = new Set([builder.z || 0]);
            await t.waitUntil(() => { levels.add(builder.z || 0); return job.state === "done" || job.state === "failed"; }, 30000, label).catch(() => {});
            job._levels = [...levels];
            return job;
        };
        // The roof: every cell of the 5 x 5 through the menu, the corners first, then the ring, then inward (each must attach when taken).
        const roofOrder = [];
        for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) roofOrder.push({ x, y, r: Math.max(Math.abs(x - cx), Math.abs(y - cy)) });
        roofOrder.sort((a, b) => b.r - a.r || a.y - b.y || a.x - b.x);
        const roofJobs = [];
        for (const c of roofOrder) {
            const row = Ix.verticalOptions({ area, x: c.x, y: c.y, z: 0 }).find(o => o.id === "vertical:roof");
            const job = row && row.enabled ? row.run() : null;
            await work(job, `the roof over (${c.x},${c.y})`);
            roofJobs.push({ c, job, label: row ? row.label : "no row" });
        }
        const roofDone = roofJobs.filter(r => r.job && r.job.state === "done");
        const roofBelow = roofDone.filter(r => r.job.stand && r.job.stand.z === 0 && r.job._levels.length === 1 && r.job._levels[0] === 0);
        const bad = roofJobs.filter(r => !r.job || r.job.state !== "done").slice(0, 3).map(r => `(${r.c.x},${r.c.y}) ${r.job ? r.job.state + " " + r.job.reason : r.label}`);
        t.check("roof_built_from_below", roofDone.length === 25 && roofBelow.length === 25,
            `${roofDone.length}/25 roof slabs done; ${roofBelow.length} worked from level 0 without changing level${bad.length ? "; " + bad.join("; ") : ""}`);
        // The walls of the room above, through the build menu on the cell of level 1, materials laid on the deck.
        const wallJobs = [];
        for (const c of ring) {
            for (const id of Object.keys((wallType.build && wallType.build.items) || {})) I.drop(la(1), c.x, c.y, id, wallType.build.items[id]);
            const opt = Ix.buildOptions({ area: { x: area.x, y: area.y }, x: c.x, y: c.y, z: 1 }).find(o => o.id === "build:" + wallId);
            const job = opt && opt.enabled ? opt.run() : null;
            await work(job, `the wall at (${c.x},${c.y}) level 1`);
            wallJobs.push({ c, job });
        }
        const wallsDone = wallJobs.filter(w => w.job && w.job.state === "done" && O.typeIdIn(la(1), w.c.x, w.c.y) === wallType.typeId);
        const wallsBelow = wallsDone.filter(w => w.job.stand && w.job.stand.z === 0 && w.job._levels.every(z => z === 0));
        const wbad = wallJobs.filter(w => !w.job || w.job.state !== "done").slice(0, 3).map(w => `(${w.c.x},${w.c.y}) ${w.job ? w.job.state + " " + w.job.reason : "no job"}`);
        t.check("walls_built_from_below", wallsDone.length === ring.length && wallsBelow.length === ring.length,
            `${wallsDone.length}/${ring.length} walls on the deck; ${wallsBelow.length} built from level 0${wbad.length ? "; " + wbad.join("; ") : ""}`);

        const drained = () => { const s = S.stats(); return s.queued === 0 && s.active === 0 && s.debt === 0; };
        if (UF.Time) UF.Time.setLevel(UF.Time.speeds.length - 1);
        await t.waitUntil(drained, 40000, "the structure checks").catch(() => {});
        if (UF.Time) UF.Time.pause();
        const s1 = S.stats();
        const held = [];
        for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) held.push(S.explain({ area, x, y, z: 1, s: 0 }).verdict);
        t.check("nothing_fell", drained() && s1.commits === s0.commits && fell === 0 && held.every(h => h === "held"),
            `drained ${drained()}; commits ${s0.commits} -> ${s1.commits}; structure:fell ${fell}; deck slabs held ${held.filter(h => h === "held").length}/25; held verdicts ${s0.verdicts.held} -> ${s1.verdicts.held}`);

        const far = { x: cx + 6, y: cy - 6 };
        const farRow = Ix.verticalOptions({ area, x: far.x, y: far.y, z: 1 }).find(o => o.id === "vertical:floor");
        t.check("unattached_refused", !!farRow && farRow.enabled === false && /attaches to nothing/.test(farRow.label),
            `level 1 (${far.x},${far.y}): ${farRow ? farRow.label + (farRow.enabled ? "" : " [disabled]") : "no row"}`);
        const line = Ix.structureLine({ area, x: cx, y: cy, z: 1 });
        t.check("look_line", /^Structure: held: a chain of \d+ solid blocks reaches the bottom of the world/.test(line), `deck centre (${cx},${cy}) level 1: "${line}"`);

        await look(0);
        t.screenshot("level0");
        await look(1);
        t.screenshot("level1");
        await look(0);
        UF.Events.off("structure:fell", onFell);
        console.error = realConsoleError;
        const errs = t.errorsSoFar().slice(errors0).concat(consoleErrors);
        t.check("no_errors", errs.length === 0, errs.slice(0, 4).join(" | ") || "none");
    }, { isDefault: false });
}

function makeSnapshot(seed) {
    const dir = path.join(os.tmpdir(), "deus_build_vertical", "tip_" + process.pid);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const rc = spawnSync("robocopy", [path.join(ROOT, "game"), dir, "/E", "/NDL", "/NFL", "/NJH", "/NJS", "/NC", "/NS", "/NP", "/XD", "test_output", "save"], { stdio: "ignore" });
    if (rc.status === null || rc.status >= 8) throw new Error("robocopy failed (" + rc.status + ")");
    fs.writeFileSync(path.join(dir, "js", "plugins", TEST_PLUGIN + ".js"),
        "// Test-only plugin written by tools/test_build_vertical.js into a snapshot copy. Never part of the game.\n(" + suitePlugin.toString() + ")();\n");
    const pj = path.join(dir, "js", "plugins.js");
    const text = fs.readFileSync(pj, "utf8").replace(/^﻿/, "");
    const plugins = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
    const world = plugins.find(p => p.name === "DEUS_World");
    if (!world) throw new Error("DEUS_World is not in plugins.js");
    world.parameters = Object.assign({}, world.parameters, { Seed: String(seed) });
    const testAt = plugins.findIndex(p => p.name === "DEUS_Test" && p.status);
    if (testAt < 0) throw new Error("DEUS_Test is not registered");
    if (!plugins.some(p => p.name === "DEUS_Structural")) {
        plugins.splice(testAt, 0, { name: "DEUS_Structural", status: true, description: "[DEUS Structural] snapshot registration by tools/test_build_vertical.js", parameters: {} });
    }
    plugins.push({ name: TEST_PLUGIN, status: true, description: "[test only] NAT.02.06 build_room_above suite", parameters: {} });
    fs.writeFileSync(pj, "// Generated by RPG Maker.\n// Do not edit this file directly.\nvar $plugins =\n[\n" + plugins.map(p => JSON.stringify(p)).join(",\n") + "\n];\n");
    return dir;
}

function runIngame() {
    const seed = Number(argOf("seed", "18"));
    let dir;
    try { dir = makeSnapshot(seed); } catch (e) { console.error("HARNESS: " + e.message); process.exit(2); }
    console.log("running suite " + SUITE + " on " + dir + ", seed " + seed);
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [path.join(ROOT, "tools", "run_tests.js"), SUITE, "--game", dir], { encoding: "utf8", timeout: 600000 });
    const resultsFile = path.join(dir, "test_output", "results.txt");
    const text = fs.existsSync(resultsFile) ? fs.readFileSync(resultsFile, "utf8") : "";
    const checks = {};
    for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^(PASS|FAIL) build_room_above\.(\S+)/);
        if (m) checks[m[2]] = m[1] === "PASS";
    }
    const evidence = argOf("evidence", "");
    if (evidence) {
        const dest = path.resolve(evidence);
        fs.mkdirSync(dest, { recursive: true });
        const out = path.join(dir, "test_output");
        const copied = [];
        if (fs.existsSync(out)) for (const f of fs.readdirSync(out)) {
            if (f === "results.txt" || (f.startsWith(SUITE + ".") && f.endsWith(".png"))) { fs.copyFileSync(path.join(out, f), path.join(dest, f)); copied.push(f); }
        }
        console.log("evidence copied: " + copied.join(", "));
    }
    if (!args.includes("--keep")) fs.rmSync(dir, { recursive: true, force: true });
    else console.log("snapshot kept: " + dir);
    for (const line of text.split(/\r?\n/)) if (/^(PASS|FAIL|ERROR|HARNESS|RESULT|SHOT)/.test(line)) console.log(line);
    if (!/^RESULT: /m.test(text)) {
        console.error("HARNESS: no RESULT line (run_tests exit " + r.status + ") " + ((r.stderr || "") + (r.stdout || "")).slice(0, 600));
        process.exit(2);
    }
    const missing = INGAME_CHECKS.filter(c => !(c in checks));
    const failed = INGAME_CHECKS.filter(c => checks[c] === false);
    if (missing.length) { console.error("HARNESS: checks that never ran: " + missing.join(", ")); process.exit(2); }
    console.log("SUMMARY: " + (INGAME_CHECKS.length - failed.length) + "/" + INGAME_CHECKS.length + " checks passed" + (failed.length ? "; failed: " + failed.join(", ") : "") +
        "; " + ((Date.now() - t0) / 1000).toFixed(0) + " s");
    process.exit(failed.length ? 1 : 0);
}

//-----------------------------------------------------------------------------

function main() {
    if (INGAME) return runIngame();
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
