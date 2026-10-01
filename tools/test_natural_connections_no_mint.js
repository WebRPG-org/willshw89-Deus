#!/usr/bin/env node
"use strict";
/**
 * tools/test_natural_connections_no_mint.js (NAT.03.02 lane-el; BRIEF.md and BRIEF_AMENDMENT_1.md)
 *
 * Production World, WorldGen, Tiles, Objects, Levels, Floors, Fluid, Jobs and NaturalConnections in one
 * VM, on a generated world. RMMZ classes are doubles; no rendering. Fluid runs its 0..7 solver alone (no
 * require(), so sim/hydro stays off, as in tools/test_strata_fluid_reconciliation.js): cell water is then
 * the whole store and a debit can be matched to a credit.
 *
 * PM ruling (BRIEF_AMENDMENT_1, option 1): a floored natural passage is not a drain. Water crosses a level
 * only through UF.Fluid's own faces; NaturalConnections moves none and keeps no water store of its own.
 *
 * Checks:
 *   authoritative_flow_conserved   guard (base and tip): 6 water put with UF.Fluid.setCell at each saved
 *                                  link's upper endpoint, UF.Fluid.step alone 400 times: the upper endpoint's
 *                                  level keeps all 6 (no debit; the pour spreads sideways on that level through
 *                                  UF.Fluid's lateral faces) and the landing and the levels below gain 0. The same pour on an
 *                                  open-column control cell (not a passage) shows upper debit 6 = lower credit 6.
 *   floored_passage_is_not_a_drain the same pour on seeds that between them have both link kinds
 *                                  (cliff_cave_passage, natural_passage): landing stays 0, upper level stays 6.
 *   link_does_not_mint             water at every upper entrance through UF.Fluid, then one frame-30
 *                                  Scene_Map.update (the game's tick path): no landing gains water by any
 *                                  reader, and no baseline water cell or Fluid total changes.
 *   waterAt_not_wrapped            UF.Levels.waterAt is still DEUS_Levels' own function after boot.
 *   private_store_gone             UF.NaturalConnections has no hasFluid/addFluid/clearFluids/updateFluids, and
 *                                  a frame-30 Scene_Map.update changes no fluid state and emits no
 *                                  naturalConnections:fluidFlow or fluids:flow event.
 *   legacy_payload_round_trip      a save holding the legacy ufWorld.naturalConnections.fluids payload loads
 *                                  and saves again with the payload unchanged, never read as water and never
 *                                  credited into UF.Fluid; authoritative water is unchanged.
 *   creatures_still_stepped        a creature (no job, no goal) on a passage entrance with a free landing is
 *                                  moved to the landing's z by one frame-30 Scene_Map.update.
 *
 * Usage:
 *   node tools/test_natural_connections_no_mint.js [--case=<name>] [--mutant=<name>]
 * Mutants (each must turn the named check red):
 *   disable_all_flow       Fluid gravity off             -> authoritative_flow_conserved (open-column control)
 *   fake_passage_flow      +1 water hand-written at one passage landing after stepping
 *                                                        -> floored_passage_is_not_a_drain
 *   credit_legacy_payload  on load, the legacy payload's cells are credited into UF.Fluid
 *                                                        -> legacy_payload_round_trip
 *   drop_legacy_payload    on load, ufWorld.naturalConnections.fluids is deleted
 *                                                        -> legacy_payload_round_trip
 *   drop_step_creatures    the frame-30 block no longer calls stepCreatures()
 *                                                        -> creatures_still_stepped
 * The last three alter only the plugin source string inside the VM, never the file.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const simHook = require("./lib/vm_sim_require"); // WG.00.44: UF.Sim.require and a 1x1 grid in the vm

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const argv = process.argv.slice(2);
const opt = name => (argv.find(a => a.startsWith(`--${name}=`)) || "").slice(name.length + 3);
const mutant = opt("mutant"), selected = opt("case");
const SEED = 20260919;          // the in-game natural_connections suite's fixed seed: cliff_cave_passage links only
const SEED_NATURAL = 7;         // makes natural_passage chains (0/-1 and -1/-2) as well as cliff caves in this harness

// A legacy payload is credited or dropped by an extra extractSaveContents alias, as a careless loader would add.
const LOAD_ALIAS = body => `{ const _mutantLoad = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function(contents) { _mutantLoad.call(this, contents); const s = state(); ${body} }; }
    `;
const SOURCE_MUTANTS = {
    credit_legacy_payload: src => insertBefore(src, "    const _boot = Scene_Boot.prototype.start;", LOAD_ALIAS(
        `const cells = s && s.fluids && s.fluids.cells || {};
        for (const k of Object.keys(cells)) { const m = /^(-?\\d+),(-?\\d+):(-?\\d+):(\\d+),(\\d+)$/.exec(k);
            if (m) UF.Fluid.setCell({ x: +m[1], y: +m[2] }, +m[4], +m[5], +m[3], cells[k].type || "water", 1); }`)),
    drop_legacy_payload: src => insertBefore(src, "    const _boot = Scene_Boot.prototype.start;", LOAD_ALIAS("if (s) delete s.fluids;")),
    drop_step_creatures: src => {
        const i = src.indexOf("Graphics.frameCount % 30 === 0"), j = src.indexOf("stepCreatures();", i);
        if (i < 0 || j < 0) throw new Error("mutation target missing: frame-30 stepCreatures() call");
        return src.slice(0, j) + ";" + src.slice(j + "stepCreatures();".length);   // an empty statement keeps the source valid
    }
};
const MUTANTS = { disable_all_flow: true, fake_passage_flow: true, ...SOURCE_MUTANTS };
if (mutant && !MUTANTS[mutant]) { console.error(`Unknown mutant "${mutant}". Known: ${Object.keys(MUTANTS).join(", ")}`); process.exit(2); }
function insertBefore(src, anchor, text) {
    const i = src.indexOf(anchor);
    if (i < 0) throw new Error(`mutation target missing: ${anchor.trim()}`);
    return src.slice(0, i) + text + src.slice(i);
}

const FILES = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Tiles.js", "DEUS_Objects.js", "DEUS_Levels.js", "DEUS_Floors.js",
    "DEUS_Fluid.js", "DEUS_Jobs.js", "DEUS_NaturalConnections.js"];

function buildEnvironment(seed) {
    const list = {};
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, "game/js/plugins.js"), "utf8"), list);
    const ns = {}, warnings = [], errors = [];
    const canvasCtx = () => ({
        imageSmoothingEnabled: false, createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData() {}, drawImage() {}, fillRect() {}, clearRect() {}, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    });
    const env = {
        window: null, UF: ns, DEUS: ns, Math, performance, setTimeout, clearTimeout, setInterval, clearInterval,
        console: {
            log: () => {},
            warn: (...a) => warnings.push(a.map(String).join(" ")),
            error: (...a) => errors.push(a.map(x => (x && x.stack) || String(x)).join(" "))
        },
        document: { createElement: () => ({ width: 0, height: 0, getContext: canvasCtx }) },
        PluginManager: { parameters: name => (list.$plugins && list.$plugins.find(p => p.name === name) || {}).parameters || {}, registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false, createGameObjects() {} },
        Input: { keyMapper: {}, isTriggered: () => false, isPressed: () => false }, TouchInput: { _currentState: {} },
        SceneManager: { _scene: null, isSceneChanging: () => false },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        ImageManager: { loadTileset() { return null; } },
        Utils: { isOptionValid: () => false, encodeURI: s => s },
        Tilemap: function() {},
        $dataTilesets: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/Tilesets.json"), "utf8")),
        $ufWorldCatalog: JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/UF_WorldCatalog.json"), "utf8")),
        $ufTime: { year: 1, monthIndex: 0, day: 1, hour: 8, minute: 0 },
        $gameSystem: {}, $gameScreen: { weatherType: () => "none", weatherPower: () => 0, changeWeather() {} },
        $gameTimer: {}, $gameSwitches: {}, $gameVariables: {}, $gameSelfSwitches: {}, $gameActors: {}, $gameParty: {}
    };
    env.window = env;
    env.$deusWorldCatalog = env.$ufWorldCatalog;
    env.Tilemap.TILE_ID_A1 = 2048;
    env.Tilemap.TILE_ID_A2 = 2816;
    env.Tilemap.isTileA1 = id => id >= 2048 && id < 2816;
    env.Tilemap.isWaterTile = id => env.Tilemap.isTileA1(id);
    for (const name of ["Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle", "Game_Map", "Game_Player", "Game_CharacterBase", "Game_Event", "Spriteset_Map", "Spriteset_Base"]) {
        env[name] = vm.runInNewContext(`(function ${name}(){})`);
        env[name].prototype.initialize = function() {};
    }
    env.Scene_Boot.prototype.start = function() {};
    env.Scene_Boot.prototype.isReady = function() { return true; };
    env.Scene_Map.prototype.update = function() {};
    env.Scene_Map.prototype.createAllWindows = function() {};
    env.Scene_Map.prototype.isActive = function() { return true; };
    env.Scene_Map.prototype.isBusy = function() { return false; };
    env.Spriteset_Map.prototype.createCharacters = function() {};
    env.Spriteset_Map.prototype.update = function() {};
    env.Sprite = vm.runInNewContext(`(function Sprite(bitmap) {
        this.anchor = { x: 0, y: 0, set(a, b) { this.x = a; this.y = b; } };
        this.children = []; this.parent = null; this.visible = true; this.bitmap = bitmap || null; this.x = 0; this.y = 0; this.z = 0;
    })`);
    Object.assign(env.Sprite.prototype, { update() {}, addChild(c) { c.parent = this; this.children.push(c); return c; } });
    env.Bitmap = vm.runInNewContext(`(function Bitmap(w, h) {
        this.width = w || 0; this.height = h || 0;
        this.context = { imageSmoothingEnabled: false, drawImage() {}, putImageData() {}, fillRect() {} };
        this._baseTexture = { update() {} };
    })`);
    Object.assign(env.Bitmap.prototype, { isReady() { return true; }, isError() { return false; }, clear() {}, clearRect() {}, fillRect() {}, blt() {} });
    env.Bitmap.load = () => ({ isReady: () => false, isError: () => false });
    Object.assign(env.Game_Map.prototype, {
        mapId() { return this._mapId || 0; }, width: () => 256, height: () => 256, update() {}, tileId: () => 0, tilesetFlags: () => [],
        isPassable: () => true, checkPassage: () => true, isEventRunning: () => false,
        displayX() { return 0; }, displayY() { return 0; }, screenTileX: () => 17, screenTileY: () => 13,
        adjustX(x) { return x; }, adjustY(y) { return y; },
        roundXWithDirection: (x, d) => x + (d === 6 ? 1 : d === 4 ? -1 : 0), roundYWithDirection: (y, d) => y + (d === 2 ? 1 : d === 8 ? -1 : 0),
        eventsXy: () => [], eventsXyNt: () => []
    });
    Object.assign(env.Game_Player.prototype, { isTransferring: () => false, direction: () => 2, locate(x, y) { this.x = x; this.y = y; } });
    env.$gameMap = new env.Game_Map();
    env.$gameMap._events = [];
    env.$gamePlayer = new env.Game_Player();
    env.$gamePlayer.x = 128;
    env.$gamePlayer.y = 128;
    env.$gameMessage = { isBusy: () => false };
    simHook.install(env);
    const ctx = vm.createContext(env);
    const section = (src, a, b) => {
        const i = src.indexOf(a), j = src.indexOf(b, i + a.length);
        if (i < 0 || j <= i) throw new Error(`engine source section missing: ${a}`);
        return src.slice(i, j);
    };
    const core = fs.readFileSync(path.join(ROOT, "game/js/rmmz_core.js"), "utf8");
    const mgr = fs.readFileSync(path.join(ROOT, "game/js/rmmz_managers.js"), "utf8");
    const deus = fs.readFileSync(path.join(PLUGINS, "DEUS_Core.js"), "utf8");
    vm.runInContext(section(mgr, "DataManager.makeSaveContents =", "DataManager.correctDataErrors ="), ctx, { filename: "rmmz_managers.js" });
    vm.runInContext(section(core, "function JsonEx()", "//-----------------------------------------------------------------------------"), ctx, { filename: "rmmz_core.js JsonEx" });
    vm.runInContext(section(core, "Tilemap.TILE_ID_B =", "Tilemap.Layer ="), ctx, { filename: "rmmz_core.js Tilemap constants" });
    vm.runInContext(section(deus, "window.DEUS = window.DEUS || {};", "//-----------------------------------------------------------------------------"), ctx, { filename: "DEUS_Core.js events" });
    for (const f of FILES) {
        let src = fs.readFileSync(path.join(PLUGINS, f), "utf8");
        if (f === "DEUS_NaturalConnections.js" && SOURCE_MUTANTS[mutant]) src = SOURCE_MUTANTS[mutant](src);
        vm.runInContext(src, ctx, { filename: f });
    }
    // DEUS_Levels' own waterAt, before any plugin's boot hook can replace it.
    env.__levelsWaterAt = env.UF.Levels.waterAt;
    env.DataManager.onLoad(env.$dataTilesets);
    new env.Scene_Boot().start();
    env.UF.NewGameSetup = { seed, year: 1 };
    env.UF.World.newWorld(seed);
    if (mutant === "disable_all_flow") env.UF.Fluid._configure({ _mutantNoGravity: true });
    env.__warnings = warnings;
    env.__errors = errors;
    return env;
}

let passed = 0, failed = 0;
function check(name, fn) {
    if (selected && selected !== name) return;
    try {
        const detail = fn();
        passed++;
        console.log(`PASS natural_connections_no_mint.${name}${detail ? `: ${detail}` : ""}`);
    } catch (e) {
        failed++;
        console.error(`FAIL natural_connections_no_mint.${name}: ${e && e.message || e}`);
    }
}

const AREA = { x: 0, y: 0 };
const WINDOW = 12, BELOW = 3, STEPS = 400, BUDGET = 512, DEPTH = 6;
const envs = {};
const world = seed => envs[seed] || (envs[seed] = buildEnvironment(seed));
const ends = link => link.a.z > link.b.z ? { upper: link.a, lower: link.b } : { upper: link.b, lower: link.a };
const cellKey = r => `${r.area ? r.area.x : 0},${r.area ? r.area.y : 0}:${r.z}:${r.x},${r.y}`;
const savedLinks = env => { const s = env.UF.NaturalConnections.state(); return s && Array.isArray(s.links) ? s.links : []; };

// Fluid depth units in a box around (x, y): levels z..z-BELOW, per level.
function windowSums(env, x, y, z) {
    const U = env.UF, size = U.World.state.size, out = {};
    for (let dz = 0; dz <= BELOW; dz++) {
        let s = 0;
        for (let yy = Math.max(0, y - WINDOW); yy <= Math.min(size - 1, y + WINDOW); yy++)
            for (let xx = Math.max(0, x - WINDOW); xx <= Math.min(size - 1, x + WINDOW); xx++) s += U.Fluid.depthAt(0, 0, xx, yy, z - dz);
        out[z - dz] = s;
    }
    return out;
}
// Put DEPTH units at the upper cell through UF.Fluid, step UF.Fluid alone, and measure. fake: the
// fake_passage_flow mutant hand-writes +1 water at the landing after stepping.
function pour(env, upper, lower, fake) {
    const F = env.UF.Fluid, L = env.UF.Levels;
    F.reset();
    const mass0 = F.diagnostics(0, 0).totalWaterMass, before = windowSums(env, upper.x, upper.y, upper.z);
    F.setCell(AREA, upper.x, upper.y, upper.z, "water", DEPTH);
    const placed = F.depthAt(0, 0, upper.x, upper.y, upper.z);
    const start = windowSums(env, upper.x, upper.y, upper.z);
    for (let i = 0; i < STEPS; i++) F.step(AREA, BUDGET);
    if (fake) F.setCell(AREA, lower.x, lower.y, lower.z, "water", F.depthAt(0, 0, lower.x, lower.y, lower.z) + 1);
    const after = windowSums(env, upper.x, upper.y, upper.z), diag = F.diagnostics(0, 0);
    let credit = 0;
    for (let dz = 1; dz <= BELOW; dz++) credit += after[upper.z - dz] - start[upper.z - dz];
    const inWindow = Object.values(after).reduce((a, b) => a + b, 0);
    const r = { placed, debit: start[upper.z] - after[upper.z], credit,
        upperCell: F.depthAt(0, 0, upper.x, upper.y, upper.z), landing: F.depthAt(0, 0, lower.x, lower.y, lower.z),
        canPassDown: F.fluidCanPassDown(0, 0, upper.x, upper.y, upper.z), passage: L.getStrataFluidPassage(0, 0, upper.x, upper.y, upper.z),
        upperStrata: (L.strataAt({ area: AREA, x: upper.x, y: upper.y, z: upper.z }) || {}).materials,
        conserved: diag.totalWaterMass === mass0 + placed && diag.totalWaterVolume === inWindow && before[upper.z] === 0 };
    F.reset();
    return r;
}
const describe = r => `placed ${r.placed}, upper cell ${r.upperCell}, upper-level debit ${r.debit}, lower-level credit ${r.credit}, ` +
    `landing ${r.landing}, strata ${JSON.stringify(r.upperStrata)}, passage bits ${r.passage}, canPassDown ${r.canPassDown}, conserved ${r.conserved}`;
// A floored passage: the upper endpoint's level keeps all 6 (no debit) and nothing reaches the landing or the levels
// below (no credit). The endpoint cell itself is not required to keep 6: UF.Fluid's own lateral faces spread the
// pour over its level (6 -> 1..3 at the endpoint), which is not a passage crossing.
const floored = r => r.placed === DEPTH && r.debit === 0 && r.credit === 0 && r.landing === 0 && r.conserved;
function pourLinks(env, links, fakeFirst) {
    const bad = [], kinds = {};
    links.forEach((link, i) => {
        const { upper, lower } = ends(link), r = pour(env, upper, lower, fakeFirst && i === 0);
        kinds[link.kind] = (kinds[link.kind] || 0) + 1;
        if (!floored(r)) bad.push(`${link.id} (${link.kind}) upper (${upper.x},${upper.y},${upper.z}) -> landing (${lower.x},${lower.y},${lower.z}): ${describe(r)}`);
    });
    return { bad, kinds };
}
const FLOORED_SUMMARY = `${DEPTH} water by UF.Fluid.setCell, UF.Fluid.step x${STEPS} (budget ${BUDGET}) alone, hydro absent`;

check("authoritative_flow_conserved", () => {
    const env = world(SEED), U = env.UF, L = U.Levels, links = savedLinks(env), problems = [];
    if (!links.length) throw new Error(`seed ${SEED}: no natural passage was generated`);
    const { bad, kinds } = pourLinks(env, links, false);
    if (bad.length) problems.push(`${bad.length}/${links.length} floored passages moved water:\n  ${bad.join("\n  ")}`);
    // Open-column control, not a passage: strata open between z=0 and z=-1, so UF.Fluid's own DOWN face carries it.
    const x = 40, y = 40, set = (z, m) => L.setStrata({ area: AREA, x, y, z }, { m, hp: m.map(v => v === "air" ? 0 : 255) });
    const saved = [0, -1].map(z => L.strataAt({ area: AREA, x, y, z }).materials.slice());
    let c;
    set(0, ["air", "air", "air", "air", "air"]);
    set(-1, ["stone", "air", "air", "air", "air"]);
    try { c = pour(env, { x, y, z: 0 }, { x, y, z: -1 }, false); } finally { set(0, saved[0]); set(-1, saved[1]); }
    const controlOk = c.placed === DEPTH && c.debit === DEPTH && c.credit === DEPTH && c.conserved;
    if (!controlOk) problems.push(`open-column control (${x},${y}) 0 -> -1 did not carry the pour: ${describe(c)}`);
    const summary = `seed ${SEED}, ${links.length} links ${JSON.stringify(kinds)}, ${FLOORED_SUMMARY}`;
    const passages = `${links.length - bad.length}/${links.length} floored passages: upper debit 0, lower credit 0`;
    if (problems.length) throw new Error(`${passages}; ${problems.join("; ")} (${summary})`);
    return `${passages}; open-column control: upper debit ${c.debit} = lower credit ${c.credit} (${summary})`;
});

check("floored_passage_is_not_a_drain", () => {
    const out = [], allKinds = {}, problems = [];
    for (const seed of [SEED, SEED_NATURAL]) {
        const env = world(seed), links = savedLinks(env);
        const { bad, kinds } = pourLinks(env, links, mutant === "fake_passage_flow" && seed === SEED);
        for (const k of Object.keys(kinds)) allKinds[k] = (allKinds[k] || 0) + kinds[k];
        out.push(`seed ${seed}: ${links.length - bad.length}/${links.length} ${JSON.stringify(kinds)}`);
        if (bad.length) problems.push(`seed ${seed}: ${bad.length} passages drained:\n  ${bad.join("\n  ")}`);
    }
    for (const kind of ["cliff_cave_passage", "natural_passage"]) if (!allKinds[kind]) problems.push(`no ${kind} link on the seeds tested`);
    if (problems.length) throw new Error(`${out.join("; ")}; ${problems.join("; ")}`);
    return `landing 0, upper level ${DEPTH} at every link: ${out.join("; ")} (${FLOORED_SUMMARY})`;
});

// Every fluid record a reader could see: Fluid totals, every Levels baseline water array and the private record.
function fluidState(env, withPrivate = true) {
    const U = env.UF, st = U.World.state, diag = U.Fluid.diagnostics(0, 0), base = [];
    for (let z = -16; z < 0; z++) {
        if (!U.World.inWorld(0, 0, z)) continue;
        const b = U.Levels.baseline(z, 0, 0);
        if (b && b.water) { let n = 0, h = 0; for (let i = 0; i < b.water.length; i++) if (b.water[i]) { n++; h = (Math.imul(h, 31) + i) | 0; } base.push(`${z}:${n}:${h}`); }
    }
    const nc = st.naturalConnections || {};
    const out = { mass: diag.totalWaterMass, volume: diag.totalWaterVolume, base };
    if (withPrivate) out.fluids = nc.fluids === undefined ? null : nc.fluids;
    return JSON.stringify(out);
}
function frame30(env) {
    env.Graphics.frameCount = Math.ceil((env.Graphics.frameCount + 1) / 30) * 30;
    new env.Scene_Map().update();
}
function watch(env) {
    const seen = [];
    for (const name of ["naturalConnections:fluidFlow", "fluids:flow"]) env.UF.Events.on(name, () => seen.push(name));
    return seen;
}
const waterReaders = (env, r) => {
    const U = env.UF, N = U.NaturalConnections;
    return { isWater: !!N.isWater(r), waterAt: !!U.Levels.waterAt(r), fluid: U.Fluid.depthAt(0, 0, r.x, r.y, r.z) };
};

// Runs before the mint checks: at the base they leave minted baseline water on the natural landings.
check("creatures_still_stepped", () => {
    // A landing a creature may take: standable, dry, walkable and unoccupied (NaturalConnections' free()).
    const landingFree = (env, r) => { const W = env.UF.World, L = env.UF.Levels;
        return (r.z === 0 || (L.standableShape(r) && !L.waterAt(r))) && !env.UF.Fluid.depthAt(0, 0, r.x, r.y, r.z) &&
            W.walkable(r.area.x, r.area.y, r.x, r.y, { z: r.z }) && W.cellFree(r.area.x, r.area.y, r.x, r.y, 0, r.z); };
    let env = null, link = null;
    for (const seed of [SEED, SEED_NATURAL]) {
        const e = world(seed);
        link = savedLinks(e).find(l => landingFree(e, ends(l).lower) && landingFree(e, ends(l).upper));
        if (link) { env = e; break; }
    }
    if (!link) throw new Error(`setup: no link on seeds ${SEED}, ${SEED_NATURAL} has a free entrance and landing`);
    const W = env.UF.World;
    const { upper, lower } = ends(link);
    const wolf = W.addUnit({ name: "TEST_Wolf", area: { x: 0, y: 0 }, x: upper.x, y: upper.y, z: upper.z, exact: true,
        image: { characterName: "$Wolf", characterIndex: 0 }, data: { kind: "creature", species: "wolf" } });
    try {
        const at = `(${wolf.x},${wolf.y},${wolf.z})`;
        if (wolf.x !== upper.x || wolf.y !== upper.y || wolf.z !== upper.z) throw new Error(`setup: wolf seated at ${at}, not the entrance`);
        frame30(env);
        if (wolf.z !== lower.z || wolf.x !== lower.x || wolf.y !== lower.y)
            throw new Error(`after a frame-30 Scene_Map.update (frame ${env.Graphics.frameCount}) the creature is at (${wolf.x},${wolf.y},${wolf.z}), not the landing (${lower.x},${lower.y},${lower.z})`);
        return `seed ${env.UF.World.state.seed} ${link.id}: creature on ${at} moved to the landing z=${lower.z} by one frame-30 Scene_Map.update (frame ${env.Graphics.frameCount})`;
    } finally { W.removeUnit(wolf.id); }
});

// Seed 20260919's landings already read wet in this harness (Levels' flood fill reaches its -1 caves from Ground
// water); seed 7's natural chains were chosen dry, so a reader of minted water shows there.
const short = text => text.length > 400 ? `${text.slice(0, 400)}...` : text;
check("link_does_not_mint", () => {
    const out = [], problems = [];
    let dryLandings = 0;
    for (const seed of [SEED, SEED_NATURAL]) {
        const env = world(seed), U = env.UF, F = U.Fluid, links = savedLinks(env);
        if (!links.length) { problems.push(`seed ${seed}: no natural passage was generated`); continue; }
        F.reset();
        for (const l of links) { const u = ends(l).upper; F.setCell(AREA, u.x, u.y, u.z, "water", DEPTH); }
        const wetUpper = links.filter(l => U.NaturalConnections.isWater(ends(l).upper)).length;
        const landings = links.map(l => ends(l).lower), before = landings.map(r => waterReaders(env, r)), state0 = fluidState(env);
        frame30(env);
        const after = landings.map(r => waterReaders(env, r)), state1 = fluidState(env);
        F.reset();
        const dry = before.filter(w => !w.isWater && !w.waterAt && !w.fluid).length;
        dryLandings += dry;
        const minted = landings.map((r, i) => JSON.stringify(after[i]) !== JSON.stringify(before[i]) ?
            `${links[i].id} landing (${r.x},${r.y},${r.z}) ${JSON.stringify(before[i])} -> ${JSON.stringify(after[i])}` : null).filter(Boolean);
        out.push(`seed ${seed}: ${links.length} upper entrances wet, ${dry} landings dry before`);
        if (wetUpper !== links.length) problems.push(`seed ${seed} setup: only ${wetUpper}/${links.length} upper entrances read as water after UF.Fluid.setCell`);
        if (minted.length) problems.push(`seed ${seed}: ${minted.length}/${links.length} landings gained water:\n  ${minted.slice(0, 6).join("\n  ")}`);
        if (state1 !== state0) problems.push(`seed ${seed}: fluid records changed: ${short(state0)} -> ${short(state1)}`);
    }
    if (!dryLandings) problems.push("setup: no landing was dry before the update, so a mint could not show");
    if (problems.length) throw new Error(`after a frame-30 Scene_Map.update (${out.join("; ")}): ${problems.join("; ")}`);
    return `after a frame-30 Scene_Map.update no landing gained water by isWater, Levels.waterAt or UF.Fluid, and no Fluid total, baseline water cell or private record changed (${out.join("; ")})`;
});

check("waterAt_not_wrapped", () => {
    const env = world(SEED), L = env.UF.Levels;
    if (L.waterAt !== env.__levelsWaterAt) throw new Error(`UF.Levels.waterAt was replaced after boot: ${String(L.waterAt).slice(0, 160).replace(/\s+/g, " ")}`);
    return "UF.Levels.waterAt is DEUS_Levels' own function after Scene_Boot.start";
});

check("private_store_gone", () => {
    const env = world(SEED), U = env.UF, F = U.Fluid, N = U.NaturalConnections, links = savedLinks(env), problems = [];
    const api = ["hasFluid", "addFluid", "clearFluids", "updateFluids"].filter(k => k in N);
    if (api.length) problems.push(`UF.NaturalConnections still has ${api.join(", ")}`);
    F.reset();
    for (const l of links) { const u = ends(l).upper; F.setCell(AREA, u.x, u.y, u.z, "water", DEPTH); }
    const seen = watch(env), state0 = fluidState(env);
    frame30(env);
    const state1 = fluidState(env);
    F.reset();
    if (state1 !== state0) problems.push(`a frame-30 Scene_Map.update changed fluid state: ${state0} -> ${state1}`);
    if (seen.length) problems.push(`it emitted ${seen.length} events (${[...new Set(seen)].join(", ")})`);
    if (problems.length) throw new Error(problems.join("; "));
    return `no private store API; a frame-30 Scene_Map.update with water at ${links.length} upper entrances changed no fluid state and emitted no fluid-flow event`;
});

check("legacy_payload_round_trip", () => {
    const env = world(SEED), U = env.UF, F = U.Fluid, N = U.NaturalConnections, links = savedLinks(env), problems = [];
    F.reset();
    // Cells the authorities call dry, so a reader of the payload would show.
    const cells = [];
    for (const l of links) for (const e of [ends(l).upper, ends(l).lower]) {
        const w = waterReaders(env, e);
        if (!w.isWater && !w.waterAt && !w.fluid && cells.length < 2) cells.push(e);
    }
    if (cells.length < 2) throw new Error(`setup: fewer than 2 dry passage endpoints (${cells.length})`);
    const payload = { cells: {} };
    cells.forEach((c, i) => { payload.cells[cellKey(c)] = { type: "water", time: 7 + i }; });
    const golden = JSON.stringify(payload);
    const authority0 = fluidState(env, false);
    const contents = env.JsonEx.parse(env.JsonEx.stringify(env.DataManager.makeSaveContents()));
    contents.ufWorld.naturalConnections.fluids = JSON.parse(golden);
    env.DataManager.extractSaveContents(contents);
    const loaded = U.World.state.naturalConnections.fluids;
    if (JSON.stringify(loaded) !== golden) problems.push(`after load the payload is ${JSON.stringify(loaded)}, expected ${golden}`);
    const read = cells.map(c => ({ c, w: waterReaders(env, c) })).filter(x => x.w.isWater || x.w.waterAt || x.w.fluid);
    if (read.length) problems.push(`payload cells read as water: ${read.map(x => `(${x.c.x},${x.c.y},${x.c.z}) ${JSON.stringify(x.w)}`).join(", ")}`);
    frame30(env);
    const authority1 = fluidState(env, false);
    if (authority1 !== authority0) problems.push(`authoritative water changed: ${authority0} -> ${authority1}`);
    const saved = env.JsonEx.parse(env.JsonEx.stringify(env.DataManager.makeSaveContents())).ufWorld.naturalConnections.fluids;
    if (JSON.stringify(saved) !== golden) problems.push(`saved again, the payload is ${JSON.stringify(saved)}, expected ${golden}`);
    F.reset();
    if (problems.length) throw new Error(problems.join("; "));
    return `payload of ${cells.length} cells loaded and saved unchanged, read as water by none of isWater/Levels.waterAt/UF.Fluid; Fluid totals and baseline water unchanged`;
});

const errs = Object.values(envs).flatMap(e => e.__errors);
if (errs.length) { failed++; console.error(`FAIL natural_connections_no_mint.no_errors: ${errs.slice(0, 3).join(" | ")}`); }
console.log(`RESULT: ${passed} passed, ${failed} failed${mutant ? ` (mutant ${mutant})` : ""}`);
process.exitCode = failed ? 1 : 0;
