#!/usr/bin/env node
"use strict";

/**
 * tools/test_structural_levels.js
 *
 * NAT.02.01 part 3. The Levels reader, the fall commit and the occupant plan.
 *
 *   node tools/test_structural_levels.js
 *   node tools/test_structural_levels.js --pure          reader, commit and occupants only
 *   node tools/test_structural_levels.js --no-sweep      skip the mutant child processes
 *   node tools/test_structural_levels.js --mutant=NAME   one source mutant; exit 1 when a check fails
 *
 * Mutants are text edits compiled in memory. Each edit must match exactly once.
 * The world census and the real Levels checks use the node vm harness from
 * tools/test_strata_fluid_reconciliation.js (World, Levels, Objects, Fluid).
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const Module = require("module");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const STRUCT = path.join(ROOT, "game", "js", "sim", "structural");
const READER_PATH = path.join(STRUCT, "reader.js");
const LEVELS_PATH = path.join(STRUCT, "levels_reader.js");
const COMMIT_PATH = path.join(STRUCT, "commit.js");
const OCC_PATH = path.join(STRUCT, "occupants.js");
const INDEX_PATH = path.join(STRUCT, "index.js");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");
const simHook = require("./lib/vm_sim_require");

const args = process.argv.slice(2);
const MUTANT_ARG = (args.find(a => a.startsWith("--mutant=")) || "").slice("--mutant=".length);
const PURE = args.includes("--pure");
const SWEEP = !MUTANT_ARG && !args.includes("--no-sweep");
const RUN_VM = !MUTANT_ARG && !PURE;

const FILES = ["levels_reader.js", "commit.js", "occupants.js"];
const MUTANTS = [
    { name: "unknown_as_air", file: "levels_reader.js", from: "const UNKNOWN_IS_UNKNOWN = true;", to: "const UNKNOWN_IS_UNKNOWN = false;" },
    { name: "no_wrap", file: "levels_reader.js", from: "const WRAP_EDGES = true;", to: "const WRAP_EDGES = false;" },
    { name: "ignore_objects", file: "levels_reader.js", from: "const OBJECT_VOXELS = true;", to: "const OBJECT_VOXELS = false;" },
    { name: "floor_not_anchor", file: "levels_reader.js", from: "const FLOOR_IS_ANCHOR = true;", to: "const FLOOR_IS_ANCHOR = false;" },
    { name: "zero_hp_solid", file: "levels_reader.js", from: "return id >= 1 && id <= 3 && (hp | 0) > 0;", to: "return id >= 1 && id <= 3;" },
    { name: "fill_before_vacate", file: "commit.js", from: "const ORDER_VACATE_FIRST = true;", to: "const ORDER_VACATE_FIRST = false;" },
    { name: "skip_event", file: "commit.js", from: "const EMIT_STRUCTURE_FELL = true;", to: "const EMIT_STRUCTURE_FELL = false;" },
    { name: "drop_byte", file: "commit.js", from: "const PRESERVE_BYTE = true;", to: "const PRESERVE_BYTE = false;" },
    { name: "drop_hp", file: "commit.js", from: "const PRESERVE_HP = true;", to: "const PRESERVE_HP = false;" },
    { name: "keep_connector", file: "commit.js", from: "const CLEAR_CONNECTOR = true;", to: "const CLEAR_CONNECTOR = false;" },
    { name: "no_rollback", file: "commit.js", from: "const ROLLBACK_ON_REFUSAL = true;", to: "const ROLLBACK_ON_REFUSAL = false;" },
    { name: "fall_deletes_displaced", file: "commit.js", from: "const DELETE_DISPLACED = false;", to: "const DELETE_DISPLACED = true;" },
    { name: "destroy_items", file: "occupants.js", from: "const ITEMS_SURVIVE = true;", to: "const ITEMS_SURVIVE = false;" },
    { name: "no_min_fall", file: "occupants.js", from: "const MIN_FALL_FEET = 10;", to: "const MIN_FALL_FEET = 0;" }
];

let passes = 0;
let fails = 0;
function check(name, cond, detail) {
    const extra = detail ? " - " + detail : "";
    if (cond) {
        passes++;
        console.log("PASS: " + name + extra);
    } else {
        fails++;
        console.error("FAIL: " + name + extra);
    }
    return !!cond;
}

function compile(filename, source) {
    const m = new Module(filename);
    m.filename = filename;
    m.paths = Module._nodeModulePaths(path.dirname(filename));
    m._compile(source, filename);
    return m.exports;
}

function loadApi(mutantName) {
    const sources = {};
    for (let i = 0; i < FILES.length; i++) {
        sources[FILES[i]] = fs.readFileSync(path.join(STRUCT, FILES[i]), "utf8");
    }
    if (mutantName) {
        const mut = MUTANTS.find(m => m.name === mutantName);
        if (!mut) {
            console.error("unknown mutant \"" + mutantName + "\"; known: " + MUTANTS.map(m => m.name).join(", "));
            process.exit(2);
        }
        const parts = sources[mut.file].split(mut.from);
        if (parts.length !== 2) {
            console.error("mutant " + mutantName + " matched " + (parts.length - 1) + " times in " + mut.file);
            process.exit(2);
        }
        sources[mut.file] = parts.join(mut.to);
    }
    const levels = compile(LEVELS_PATH, sources["levels_reader.js"]);
    const commit = compile(COMMIT_PATH, sources["commit.js"]);
    const occupants = compile(OCC_PATH, sources["occupants.js"]);
    return {
        createLevelsReader: levels.createLevelsReader,
        commitFall: commit.commitFall,
        planOccupants: occupants.planOccupants,
        gOf: levels.gOf,
        zOfG: levels.zOfG,
        sOfG: levels.sOfG,
        isSolidByte: levels.isSolidByte,
        NEIGHBOURS: levels.NEIGHBOURS
    };
}

function presence() {
    const missing = [];
    for (const p of [LEVELS_PATH, COMMIT_PATH, OCC_PATH, INDEX_PATH, READER_PATH]) {
        if (!fs.existsSync(p)) missing.push(path.relative(ROOT, p).replace(/\\/g, "/"));
    }
    if (missing.length) return missing;
    try {
        const idx = require(INDEX_PATH);
        for (const fn of ["createLevelsReader", "commitFall", "planOccupants", "gOf", "zOfG", "sOfG"]) {
            if (typeof idx[fn] !== "function") missing.push("index.js does not export " + fn);
        }
    } catch (e) {
        missing.push("index.js does not load: " + e.message);
    }
    return missing;
}

const absent = presence();
if (absent.length) {
    console.error("FAIL: structural_levels_present - " + absent.join("; "));
    console.error("\nRESULT: FAIL (levels reader modules are absent)");
    process.exit(1);
}
console.log("PASS: structural_levels_present - levels_reader.js, commit.js, occupants.js; index.js exports them");
passes++;

const api = loadApi(MUTANT_ARG || null);

function noEngineNames() {
    const bad = [];
    for (let i = 0; i < FILES.length; i++) {
        const src = fs.readFileSync(path.join(STRUCT, FILES[i]), "utf8");
        if (/\bwindow\b/.test(src) || /\bUF\b/.test(src)) bad.push(FILES[i]);
    }
    return bad;
}

function stoneBytes(n, byte, hp) {
    const bytes = [0, 0, 0, 0, 0];
    const h = [0, 0, 0, 0, 0];
    const b = byte === undefined ? 1 : byte;
    const hit = hp === undefined ? 255 : hp;
    for (let s = 0; s < n; s++) {
        bytes[s] = b;
        h[s] = hit;
    }
    return { bytes: bytes, hp: h };
}

function grid(spec) {
    spec = spec || {};
    const size = spec.size || 8;
    const areasX = spec.areasX || 1;
    const areasY = spec.areasY || 1;
    const zMin = spec.zMin;
    const zMax = spec.zMax;
    const cells = new Map();
    const objs = new Map();
    let writes = 0;
    const key = (ax, ay, x, y, z) => ax + "," + ay + "," + x + "," + y + "," + z;
    return {
        writes: () => writes,
        set(ax, ay, x, y, z, row) { cells.set(key(ax, ay, x, y, z), row); },
        object(ax, ay, x, y, z, type) { objs.set(key(ax, ay, x, y, z), type); },
        reader(extra) {
            return api.createLevelsReader(Object.assign({
                levels: {
                    strataAt(ref) {
                        const ax = ref.area ? ref.area.x | 0 : 0;
                        const ay = ref.area ? ref.area.y | 0 : 0;
                        return cells.get(key(ax, ay, ref.x | 0, ref.y | 0, ref.z | 0)) || null;
                    },
                    setStrata() { writes++; return true; }
                },
                objects: {
                    atIn(area, x, y) {
                        return objs.get(key(area.x | 0, area.y | 0, x | 0, y | 0, area.z | 0)) || null;
                    }
                },
                isKnown: spec.isKnown || null,
                world: { size: size, areasX: areasX, areasY: areasY, zMin: zMin, zMax: zMax },
                cache: false
            }, extra || {}));
        }
    };
}

function verdict(reader, ax, ay, x, y, g) {
    const start = reader.block(ax, ay, x, y, g);
    if (!start.solid) return start.state === "unknown" ? "unknown" : "air";
    const seen = new Set();
    const stack = [{ ax: ax, ay: ay, x: x, y: y, g: g }];
    let unknown = false;
    while (stack.length) {
        const n = stack.pop();
        const id = n.ax + "," + n.ay + "," + n.x + "," + n.y + "," + n.g;
        if (seen.has(id)) continue;
        seen.add(id);
        const b = reader.block(n.ax, n.ay, n.x, n.y, n.g);
        if (!b.solid) {
            if (b.state === "unknown") unknown = true;
            continue;
        }
        if (b.anchor) return "held";
        const nb = reader.neighbours(n.ax, n.ay, n.x, n.y, n.g);
        for (let i = 0; i < nb.length; i++) if (!nb[i].outside) stack.push(nb[i]);
    }
    return unknown ? "unknown" : "falls";
}

function makeStore() {
    const cells = new Map();
    const calls = [];
    let refuseAt = 0;
    const key = (area, x, y, z) => {
        const ax = area ? (area.x !== undefined ? area.x : area.ax) | 0 : 0;
        const ay = area ? (area.y !== undefined ? area.y : area.ay) | 0 : 0;
        return ax + "," + ay + "," + (x | 0) + "," + (y | 0) + "," + (z | 0);
    };
    const materialOf = byte => ["air", "stone", "soil", "wood", "water", "lava"][byte & 0x3f] || "air";
    function put(x, y, z, bytes, hp, connector) {
        const h = hp || bytes.map(b => {
            const id = b & 0x3f;
            return id >= 1 && id <= 3 ? 255 : 0;
        });
        cells.set(key({ x: 0, y: 0 }, x, y, z), { bytes: bytes.slice(), hp: h.slice(), connector: connector || null });
    }
    const levels = {
        strataAt(ref) {
            const row = cells.get(key(ref.area, ref.x, ref.y, ref.z));
            if (!row) return null;
            return {
                bytes: row.bytes.slice(),
                hp: row.hp.slice(),
                materials: row.bytes.map(materialOf),
                constructed: row.bytes.map(b => (b & 0x80) !== 0),
                connector: row.connector
            };
        },
        setStrata(ref, spec, opts) {
            calls.push({
                x: ref.x | 0, y: ref.y | 0, z: ref.z | 0,
                cause: opts && opts.cause,
                connector: spec.connector
            });
            if (refuseAt && calls.length === refuseAt) return false;
            const k = key(ref.area, ref.x, ref.y, ref.z);
            if (!cells.has(k)) return false;
            cells.set(k, {
                bytes: spec.m.slice(),
                hp: spec.hp.slice(),
                connector: spec.connector ? spec.connector : null
            });
            return true;
        }
    };
    return {
        calls: calls,
        put: put,
        levels: levels,
        row: (x, y, z) => cells.get(key({ x: 0, y: 0 }, x, y, z)),
        snap() {
            const o = {};
            for (const [k, v] of cells) o[k] = { bytes: v.bytes.slice(), hp: v.hp.slice(), connector: v.connector };
            return JSON.stringify(o);
        },
        refuse(n) { refuseAt = n; }
    };
}

function solidMultiset(store, coords) {
    const counts = {};
    for (let i = 0; i < coords.length; i++) {
        const row = store.row(coords[i][0], coords[i][1], coords[i][2]);
        if (!row) continue;
        for (let s = 0; s < 5; s++) {
            if (!api.isSolidByte(row.bytes[s], row.hp[s])) continue;
            const k = row.bytes[s] + ":" + row.hp[s];
            counts[k] = (counts[k] || 0) + 1;
        }
    }
    const ordered = {};
    const keys = Object.keys(counts).sort();
    for (let i = 0; i < keys.length; i++) ordered[keys[i]] = counts[keys[i]];
    return JSON.stringify(ordered);
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

function runPure() {
    const named = noEngineNames();
    check("sim_modules_do_not_name_engine", named.length === 0, named.join(", "));

    check("g_of_stratum", api.gOf(0, 0) === 80 && api.gOf(-2, 4) === 74 && api.zOfG(84) === 0 && api.sOfG(84) === 4);
    check("neighbour_order", api.NEIGHBOURS.map(d => d.name).join(",") === "down,north,east,south,west,up");
    let rejected = false;
    try { api.createLevelsReader({}); } catch (e) { rejected = e instanceof TypeError; }
    check("reader_requires_levels", rejected);

    const world = grid({ zMin: -1, zMax: 1 });
    world.set(0, 0, 1, 1, 0, stoneBytes(5));
    world.set(0, 0, 2, 1, 0, stoneBytes(1, 2, 10));
    world.set(0, 0, 3, 1, 0, stoneBytes(1, 0x83, 40));
    world.set(0, 0, 4, 1, 0, { bytes: [4, 5, 1, 0, 0], hp: [0, 0, 0, 0, 0] });
    world.set(0, 0, 5, 1, -1, stoneBytes(5));
    const reader = world.reader();
    const stone = reader.block(0, 0, 1, 1, api.gOf(0, 0));
    const soil = reader.block(0, 0, 2, 1, api.gOf(0, 0));
    const wood = reader.block(0, 0, 3, 1, api.gOf(0, 0));
    const water = reader.block(0, 0, 4, 1, api.gOf(0, 0));
    const lava = reader.block(0, 0, 4, 1, api.gOf(0, 1));
    const dead = reader.block(0, 0, 4, 1, api.gOf(0, 2));
    const floor = reader.block(0, 0, 5, 1, api.gOf(-1, 0));
    const above = reader.block(0, 0, 5, 1, api.gOf(-1, 1));
    check("stone_soil_wood_are_solid", stone.solid && stone.material === "stone" && soil.solid && soil.material === "soil" && soil.hp === 10 && wood.solid && wood.material === "wood" && wood.constructed === true && wood.hp === 40);
    check("fluids_and_zero_hp_are_not_solid", !water.solid && water.state === "air" && !lava.solid && !dead.solid && dead.state === "air");
    check("world_floor_is_anchor", floor.anchor === true && above.anchor === false && stone.anchor === false);
    check("reader_does_not_write", world.writes() === 0);

    const names = reader.neighbours(0, 0, 1, 1, api.gOf(0, 2)).map(n => n.name + ":" + n.x + "," + n.y + "," + n.g);
    const g = api.gOf(0, 2);
    check("six_neighbours", names.join("|") === [
        "down:1,1," + (g - 1),
        "north:1,0," + g,
        "east:2,1," + g,
        "south:1,2," + g,
        "west:0,1," + g,
        "up:1,1," + (g + 1)
    ].join("|"));

    const wrapWorld = grid({ size: 4, areasX: 2, areasY: 1, zMin: 0, zMax: 0 });
    wrapWorld.set(1, 0, 3, 0, 0, stoneBytes(1));
    wrapWorld.set(0, 0, 0, 0, 0, stoneBytes(1, 3));
    const wrapped = wrapWorld.reader();
    const across = wrapped.block(0, 0, -1, 0, api.gOf(0, 0));
    const nb = wrapped.neighbours(0, 0, 0, 0, api.gOf(0, 0));
    const west = nb.filter(n => n.name === "west")[0];
    check("torus_wraps_area_edges", across.solid === true && across.material === "stone" && west.outside === false && west.ax === 1 && west.x === 3);

    const unknownWorld = grid({
        zMin: 0, zMax: 1,
        isKnown: (ax, ay, z) => z === 0
    });
    unknownWorld.set(0, 0, 1, 1, 0, { bytes: [0, 1, 0, 0, 0], hp: [0, 255, 0, 0, 0] });
    const unknownReader = unknownWorld.reader();
    const floating = unknownReader.block(0, 0, 1, 1, api.gOf(0, 1));
    const hidden = unknownReader.block(0, 0, 1, 1, api.gOf(1, 0));
    check("unknown_is_not_air_or_anchor", floating.solid === true && floating.anchor === false && hidden.state === "unknown" && hidden.solid === false && hidden.anchor === false);
    check("unknown_edge_is_held", verdict(unknownReader, 0, 0, 1, 1, api.gOf(0, 1)) === "unknown");

    const room = grid({ zMin: -1, zMax: 1 });
    room.set(0, 0, 2, 2, -1, stoneBytes(5));
    room.set(0, 0, 2, 2, 0, stoneBytes(0));
    room.set(0, 0, 2, 2, 1, stoneBytes(1, 3, 20));
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) room.set(0, 0, 2 + dx, 2 + dy, 1, stoneBytes(0));
    room.object(0, 0, 2, 2, 0, { id: "wall_wood", tags: ["building", "wall"], material: "wood" });
    const roomReader = room.reader();
    const deck = api.gOf(1, 0);
    const wallTop = roomReader.block(0, 0, 2, 2, api.gOf(0, 4));
    const wallBase = roomReader.block(0, 0, 2, 2, api.gOf(0, 0));
    check("wall_object_fills_open_strata", wallBase.solid && wallBase.source === "object" && wallTop.solid && wallTop.source === "object" && wallBase.anchor === false);
    check("wall_and_deck_room_held", verdict(roomReader, 0, 0, 2, 2, deck) === "held");
    const anchoredWalls = room.reader({ anchors: true });
    check("anchors_switch_certifies_object_voxels", anchoredWalls.block(0, 0, 2, 2, api.gOf(0, 2)).anchor === true);
    const pinned = room.reader({ pinned: (ax, ay, x, y, g) => g === deck });
    check("pinned_block_is_anchor", pinned.block(0, 0, 2, 2, deck).anchor === true);

    const loose = grid({ zMin: -1, zMax: 1 });
    loose.set(0, 0, 4, 4, 1, stoneBytes(1, 1, 255));
    loose.set(0, 0, 4, 4, 0, stoneBytes(0));
    loose.set(0, 0, 4, 4, -1, stoneBytes(0));
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) loose.set(0, 0, 4 + dx, 4 + dy, 1, stoneBytes(0));
    check("disconnected_deck_falls", verdict(loose.reader(), 0, 0, 4, 4, api.gOf(1, 0)) === "falls");
    loose.set(0, 0, 5, 5, 1, stoneBytes(1));
    check("diagonal_does_not_hold", verdict(loose.reader(), 0, 0, 4, 4, api.gOf(1, 0)) === "falls");

    const mask = roomReader.stratumMask(0, 0, 2, 2, -1);
    const openMask = roomReader.stratumMask(0, 0, 2, 2, 0);
    check("stratum_mask_ignores_objects", mask && mask.solid === 31 && mask.natural === 31 && openMask && openMask.solid === 0);

    const store = makeStore();
    store.put(1, 2, 1, [0x83, 0, 0, 0, 0], [40, 0, 0, 0, 0], "stairUp");
    store.put(1, 2, 0, [1, 1, 1, 1, 0], [255, 255, 255, 255, 0], null);
    const beforeSet = solidMultiset(store, [[1, 2, 1], [1, 2, 0]]);
    const events = [];
    const matterCalls = [];
    let fluidCalls = 0;
    const io = {
        levels: store.levels,
        events: { emit(name, payload) { events.push({ name: name, payload: payload }); } },
        matter: {
            note() { matterCalls.push("note"); },
            registerMatterParticipant() { matterCalls.push("register"); }
        },
        fluid: { setCell() { fluidCalls++; } }
    };
    const moved = api.commitFall({
        area: { x: 0, y: 0 },
        drop: 1,
        vacated: [{ x: 1, y: 2, z: 1, s: 0 }],
        filled: [{ x: 1, y: 2, z: 0, s: 4 }],
        contact: { x: 1, y: 2, z: 0, s: 4 }
    }, io);
    const src = store.row(1, 2, 1);
    const dst = store.row(1, 2, 0);
    check("commit_ok", moved.ok === true && moved.cause === "structural:fall" && moved.writes.length === 2);
    check("vacate_before_fill", store.calls.length === 2 && store.calls[0].z === 1 && store.calls[0].cause === "structural:fall" && store.calls[1].z === 0 && moved.writes[0].role === "vacate" && moved.writes[1].role === "fill");
    check("moved_byte_and_hp_kept", src.bytes.join(",") === "0,0,0,0,0" && dst.bytes[4] === 0x83 && dst.hp[4] === 40 && dst.bytes[0] === 1 && dst.hp[0] === 255);
    check("source_connector_cleared", src.connector == null && store.calls[0].connector === 0);
    check("census_bytes_match", solidMultiset(store, [[1, 2, 1], [1, 2, 0]]) === beforeSet);
    check("one_structure_fell", events.length === 1 && events[0].name === "structure:fell" && events[0].payload.cause === "structural:fall" && events[0].payload.cells.length === 2 && moved.event && moved.event.contact.z === 0);
    check("no_matter_and_no_fluid_write", matterCalls.length === 0 && fluidCalls === 0);

    const ordered = makeStore();
    ordered.put(1, 0, 0, [1, 1, 0, 0, 0], null, null);
    ordered.put(2, 1, 0, [1, 0, 0, 0, 0], null, null);
    ordered.put(0, 0, 1, [1, 0, 0, 0, 0], null, null);
    ordered.put(0, 0, 0, [0, 0, 0, 0, 0], null, null);
    ordered.put(2, 1, -1, [0, 0, 0, 0, 0], null, null);
    ordered.put(5, 0, 0, [0, 0, 0, 0, 0], null, null);
    const orderIo = { levels: ordered.levels, events: { emit() {} }, fluid: { setCell() {} }, matter: { note() {} } };
    const orderRes = api.commitFall({
        area: { x: 0, y: 0 },
        vacated: [
            { x: 0, y: 0, z: 1, s: 0 },
            { x: 2, y: 1, z: 0, s: 0 },
            { x: 1, y: 0, z: 0, s: 1 }
        ],
        filled: [
            { x: 0, y: 0, z: 0, s: 4 },
            { x: 2, y: 1, z: -1, s: 4 },
            { x: 5, y: 0, z: 0, s: 1 }
        ]
    }, orderIo);
    const gotOrder = ordered.calls.map(c => c.z + "," + c.y + "," + c.x).join(" ");
    check("cells_written_z_y_x", orderRes.ok === true && gotOrder === "0,0,1 0,1,2 1,0,0 -1,1,2 0,0,0 0,0,5", gotOrder);

    const dropped = makeStore();
    dropped.put(3, 3, 1, [1, 0, 0, 0, 0], null, null);
    dropped.put(3, 3, 0, [0, 0, 0, 0, 0], null, null);
    const dropRes = api.commitFall({ area: { x: 0, y: 0 }, drop: 1, blocks: [{ x: 3, y: 3, z: 1, s: 0 }] }, { levels: dropped.levels, events: { emit() {} } });
    check("drop_fills_the_stratum_below", dropRes.ok === true && dropped.row(3, 3, 0).bytes[4] === 1 && dropped.row(3, 3, 1).bytes[0] === 0);

    const occupied = makeStore();
    occupied.put(0, 0, 1, [1, 0, 0, 0, 0], null, null);
    occupied.put(0, 0, 0, [0, 0, 0, 0, 1], null, null);
    const occ = api.commitFall({
        area: { x: 0, y: 0 },
        vacated: [{ x: 0, y: 0, z: 1, s: 0 }],
        filled: [{ x: 0, y: 0, z: 0, s: 4 }]
    }, { levels: occupied.levels, events: { emit() {} } });
    check("occupied_landing_refused", occ.ok === false && occupied.calls.length === 0 && occupied.row(0, 0, 1).bytes[0] === 1);

    const twice = makeStore();
    twice.put(0, 0, 0, [1, 1, 0, 0, 0], null, null);
    const dup = api.commitFall({
        area: { x: 0, y: 0 },
        vacated: [{ x: 0, y: 0, z: 0, s: 0 }, { x: 0, y: 0, z: 0, s: 0 }],
        filled: [{ x: 0, y: 0, z: 0, s: 2 }, { x: 1, y: 0, z: 0, s: 2 }]
    }, { levels: twice.levels, events: { emit() {} } });
    check("stratum_vacated_twice_refused", dup.ok === false && twice.calls.length === 0);

    const rollback = makeStore();
    rollback.put(0, 0, 1, [1, 0, 0, 0, 0], [9, 0, 0, 0, 0], "stairUp");
    rollback.put(0, 0, 0, [0, 0, 0, 0, 0], null, null);
    rollback.put(4, 4, 0, [2, 0, 0, 0, 0], null, null);
    rollback.put(4, 4, -1, [0, 0, 0, 0, 0], null, null);
    const before = rollback.snap();
    rollback.refuse(2);
    const rolledEvents = [];
    const rolled = api.commitFall({
        area: { x: 0, y: 0 },
        vacated: [{ x: 0, y: 0, z: 1, s: 0 }, { x: 4, y: 4, z: 0, s: 0 }],
        filled: [{ x: 0, y: 0, z: 0, s: 4 }, { x: 4, y: 4, z: -1, s: 4 }]
    }, { levels: rollback.levels, events: { emit(name, payload) { rolledEvents.push(name); } } });
    check("rollback_restores_in_reverse", rolled.ok === false && rolled.restored === true && rolled.event == null && rolledEvents.length === 0 && rollback.snap() === before && rollback.calls.length === 3);

    const first = makeStore();
    first.put(0, 0, 0, [1, 0, 0, 0, 0], null, null);
    first.put(0, 0, -1, [0, 0, 0, 0, 0], null, null);
    const firstSnap = first.snap();
    first.refuse(1);
    const refused = api.commitFall({
        area: { x: 0, y: 0 },
        vacated: [{ x: 0, y: 0, z: 0, s: 0 }],
        filled: [{ x: 0, y: 0, z: -1, s: 4 }]
    }, { levels: first.levels, events: { emit() {} } });
    check("first_refusal_writes_nothing", refused.ok === false && refused.writes.length === 0 && first.snap() === firstSnap);

    const rules = loadRules();
    const die10 = rules.fallingDamage(10);
    const die25 = rules.fallingDamage(25);
    const die30 = rules.fallingDamage(30);
    function stand(map) {
        return {
            derivesSolid(x, y, z) { return !!map.solid[x + "," + y + "," + z]; },
            standable(x, y, z) { return !!map.stand[x + "," + y + "," + z]; },
            hasStandingSurface(x, y, z) { return !!map.surface[x + "," + y + "," + z]; }
        };
    }
    const crushed = api.planOccupants({
        zMin: -2, zMax: 2, dropFeet: 0, levelFeet: 10, rules: rules,
        queries: stand({
            solid: { "10,10,0": true },
            stand: { "13,10,0": true },
            surface: { "1,1,0": true }
        }),
        units: [{ id: "u1", x: 10, y: 10, z: 0 }, { id: "safe", x: 1, y: 1, z: 0 }],
        items: [{ id: "i1", x: 10, y: 10, z: 0 }],
        objects: [{ id: "table", x: 10, y: 10, z: 0, tags: ["furniture"], ruin: "splinters" }]
    });
    check("crush_minimum_is_one_die", crushed.units.length === 1 && crushed.units[0].id === "u1" && crushed.units[0].effect === "crush" && crushed.units[0].cause === "crushed" && crushed.units[0].kill === false && crushed.units[0].damage.count === die10.count && crushed.units[0].damage.feet === 10 && crushed.units[0].damage.type === die10.type && crushed.units[0].to.x === 13);
    check("items_relocate_objects_break", crushed.items.length === 1 && crushed.items[0].destroyed === false && crushed.items[0].effect === "relocate" && crushed.items[0].to.x === 13 && crushed.objects.length === 1 && crushed.objects[0].effect === "break" && crushed.objects[0].ruin === "splinters");

    const heavy = api.planOccupants({
        zMin: 0, zMax: 2, dropFeet: 25, rules: rules,
        queries: stand({ solid: { "0,0,0": true }, stand: {}, surface: {} }),
        units: [{ id: "u2", x: 0, y: 0, z: 0 }]
    });
    check("crush_uses_drop_dice_or_kills", heavy.units[0].kill === true && heavy.units[0].to == null && heavy.units[0].damage.count === die25.count && heavy.units[0].damage.feet === 25);

    const rider = api.planOccupants({
        zMin: 0, zMax: 4, dropFeet: 0, levelFeet: 10, rules: rules,
        queries: stand({ solid: {}, stand: { "2,2,0": true }, surface: { "2,2,3": false } }),
        units: [{ id: "rider", x: 2, y: 2, z: 3 }],
        items: [{ id: "coin", x: 2, y: 2, z: 3 }]
    });
    check("rider_falls_to_the_column", rider.units.length === 1 && rider.units[0].effect === "fall" && rider.units[0].cause === "fall" && rider.units[0].kill === false && rider.units[0].to.z === 0 && rider.units[0].damage.count === die30.count && rider.units[0].damage.feet === 30 && rider.items[0].destroyed === false && rider.items[0].to.z === 0);

    const nowhere = api.planOccupants({
        zMin: 0, zMax: 0, rules: rules,
        queries: stand({ solid: { "1,1,0": true }, stand: {}, surface: {} }),
        items: [{ id: "gem", x: 1, y: 1, z: 0 }]
    });
    check("item_with_nowhere_to_stand_is_kept", nowhere.items[0].destroyed === false && nowhere.items[0].to != null);

    const piece = api.planOccupants({
        zMin: -2, zMax: 2, rules: rules,
        vacated: [{ x: 4, y: 4, z: 1 }],
        filled: [{ x: 4, y: 4, z: 1 }, { x: 4, y: 4, z: -1 }, { x: 4, y: 4, z: 0 }],
        queries: stand({
            solid: {},
            stand: { "5,4,1": true },
            surface: { "4,4,1": true, "8,8,0": true }
        }),
        objects: [
            { id: "door", x: 4, y: 4, z: 1, tags: ["door"], ruin: "rubble" },
            { id: "wall", x: 8, y: 8, z: 0, structural: true, tags: ["wall"], ruin: "rubble" }
        ]
    });
    const door = piece.objects.filter(o => o.id === "door")[0];
    check("structural_object_removed_to_landing", piece.objects.length === 1 && door.effect === "remove" && door.placeAt.z === -1 && door.ruin === "rubble");

    const up = api.planOccupants({
        zMin: 0, zMax: 2, rules: rules,
        queries: stand({ solid: { "0,0,0": true }, stand: { "0,0,1": true }, surface: {} }),
        units: [{ id: "u3", x: 0, y: 0, z: 0 }]
    });
    check("survivor_steps_up_before_down", up.units[0].kill === false && up.units[0].to.z === 1);
}

function buildEnvironment(seed) {
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
    const pluginFiles = ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Tiles.js", "DEUS_Objects.js", "DEUS_Levels.js", "DEUS_Floors.js", "DEUS_Fluid.js"];
    for (let i = 0; i < pluginFiles.length; i++) {
        const file = pluginFiles[i];
        vm.runInContext(fs.readFileSync(path.join(PLUGINS, file), "utf8"), ctx, { filename: file });
    }
    env.DataManager.onLoad(env.$dataTilesets);
    env.UF.NewGameSetup = { seed: seed, year: 1 };
    new env.Scene_Boot().start();
    if (!env.UF.World.state || env.UF.World.state.seed !== seed) env.UF.World.newWorld(seed);
    env.__warnings = warnings;
    env.__errors = errors;
    return env;
}

function installVmReader(env) {
    if (env.__structuralLevelsReader) return;
    function wrap(source, readerExpr) {
        return "(function(){\nvar module={exports:{}};\nvar exports=module.exports;\nfunction require(name){\nif(name===\"./reader.js\") return " + readerExpr + ";\nthrow new Error(\"unexpected require \"+name);\n}\n" + source + "\nreturn module.exports;\n})()";
    }
    env.__structuralReader = vm.runInContext(wrap(fs.readFileSync(READER_PATH, "utf8"), "null"), env, { filename: "reader.js" });
    env.__structuralLevelsReader = vm.runInContext(wrap(fs.readFileSync(LEVELS_PATH, "utf8"), "globalThis.__structuralReader"), env, { filename: "levels_reader.js" });
}

function runCensus(env) {
    installVmReader(env);
    const src = [
        "(function(){",
        "var W=UF.World, zr=W.zRange(), size=W.state.size|0, zMin=zr.zMin|0, zMax=zr.zMax|0;",
        "var reader=globalThis.__structuralLevelsReader.createLevelsReader({",
        "levels:UF.Levels, objects:UF.Objects,",
        "isKnown:function(ax,ay,z){return W.inWorld(ax,ay,z);},",
        "world:{size:size, areasX:W.state.areasX|0, areasY:W.state.areasY|0, zMin:zMin, zMax:zMax},",
        "cache:false});",
        "var nz=zMax-zMin+1, n=size*size;",
        "var solid=new Uint8Array(nz*n), natural=new Uint8Array(nz*n), unknown=new Uint8Array(nz*n);",
        "var naturalCells=0, anchors=0, unknownCells=0, t0=Date.now();",
        "for(var z=zMin;z<=zMax;z++){",
        "var base=(z-zMin)*n;",
        "for(var y=0;y<size;y++){",
        "var row=base+y*size;",
        "for(var x=0;x<size;x++){",
        "var mask=reader.stratumMask(0,0,x,y,z), i=row+x;",
        "if(!mask){unknown[i]=1; unknownCells++; continue;}",
        "solid[i]=mask.solid; natural[i]=mask.natural;",
        "if(natural[i]) naturalCells++;",
        "if(z===zMin && (solid[i]&1)) anchors++;",
        "}}}",
        "var seen=new Uint8Array(nz*n), stack=[];",
        "function tryPush(z,x,y,s){",
        "if(z<zMin||z>zMax||s<0||s>4) return;",
        "var xx=x, yy=y;",
        "if(xx<0) xx+=size; else if(xx>=size) xx-=size;",
        "if(yy<0) yy+=size; else if(yy>=size) yy-=size;",
        "var cell=(z-zMin)*n+yy*size+xx;",
        "if(unknown[cell]) return;",
        "if(((solid[cell]>>s)&1)===0) return;",
        "if(((seen[cell]>>s)&1)!==0) return;",
        "seen[cell]|=1<<s; stack.push(cell*5+s);",
        "}",
        "for(var y2=0;y2<size;y2++) for(var x2=0;x2<size;x2++) if(solid[y2*size+x2]&1) tryPush(zMin,x2,y2,0);",
        "if(unknownCells){",
        "for(var z3=zMin;z3<=zMax;z3++) for(var y3=0;y3<size;y3++) for(var x3=0;x3<size;x3++){",
        "var cell3=(z3-zMin)*n+y3*size+x3;",
        "if(!solid[cell3]) continue;",
        "var touch=false;",
        "for(var d=0;d<6 && !touch;d++){",
        "var ox=[0,0,1,0,-1,0][d], oy=[0,-1,0,1,0,0][d], oz=[-1,0,0,0,0,1][d];",
        "var nx=x3+ox, ny=y3+oy, nz2=z3+oz;",
        "if(nx<0) nx+=size; else if(nx>=size) nx-=size;",
        "if(ny<0) ny+=size; else if(ny>=size) ny-=size;",
        "if(nz2<zMin||nz2>zMax) continue;",
        "if(unknown[(nz2-zMin)*n+ny*size+nx]) touch=true;",
        "}",
        "if(touch) for(var s3=0;s3<5;s3++) if((solid[cell3]>>s3)&1) tryPush(z3,x3,y3,s3);",
        "}}",
        "while(stack.length){",
        "var v=stack.pop(), s=v%5, cell=(v/5)|0;",
        "var zz=zMin+((cell/n)|0), rem=cell-(zz-zMin)*n, yy=(rem/size)|0, xx=rem-yy*size;",
        "if(s>0) tryPush(zz,xx,yy,s-1);",
        "if(s<4) tryPush(zz,xx,yy,s+1);",
        "tryPush(zz,xx,yy-1,s); tryPush(zz,xx+1,yy,s); tryPush(zz,xx,yy+1,s); tryPush(zz,xx-1,yy,s);",
        "if(s===0) tryPush(zz-1,xx,yy,4);",
        "if(s===4) tryPush(zz+1,xx,yy,0);",
        "}",
        "var bad=0, example=null;",
        "for(var c=0;c<solid.length;c++){",
        "var left=natural[c]&(~seen[c])&31;",
        "if(!left) continue;",
        "if(!example){",
        "var z4=zMin+((c/n)|0), rem4=c-(z4-zMin)*n, y4=(rem4/size)|0, x4=rem4-y4*size, s4=0;",
        "while(((left>>s4)&1)===0) s4++;",
        "example={x:x4,y:y4,z:z4,s:s4};",
        "}",
        "bad++;",
        "}",
        "return {bad:bad, example:example, ms:Date.now()-t0, naturalCells:naturalCells, anchors:anchors, unknownCells:unknownCells, zMin:zMin, zMax:zMax, size:size};",
        "})()"
    ].join("\n");
    return vm.runInContext(src, env, { filename: "structural-census.js" });
}

function liveReader(env) {
    const W = env.UF.World;
    const zr = W.zRange();
    return api.createLevelsReader({
        levels: { strataAt: ref => env.UF.Levels.strataAt(ref) },
        objects: { atIn: (area, x, y) => env.UF.Objects.atIn(area, x, y) },
        isKnown: (ax, ay, z) => env.UF.World.inWorld(ax, ay, z),
        world: { size: W.state.size, areasX: W.state.areasX, areasY: W.state.areasY, zMin: zr.zMin, zMax: zr.zMax },
        cache: false
    });
}

function paint(Levels, area, x, y, z, materials) {
    const hp = materials.map(k => (k === "air" || k === "water" || k === "lava") ? 0 : 255);
    return Levels.setStrata({ area: area, x: x, y: y, z: z }, { m: materials, hp: hp, connector: 0 });
}

function runVm() {
    const seeds = [20260923, 17, 8675309];
    let env;
    try {
        env = buildEnvironment(seeds[0]);
    } catch (e) {
        check("levels_vm_boots", false, e && e.stack ? e.stack : String(e));
        return;
    }
    const bootErrors = env.__errors || [];
    check("levels_vm_boots", bootErrors.length === 0, bootErrors.slice(0, 2).join(" | "));
    if (!env.UF || !env.UF.World || !env.UF.World.state) {
        check("levels_world_ready", false, "World.state missing");
        return;
    }
    const W = env.UF.World;
    const zr = W.zRange();
    const gen = W.state.levels && W.state.levels["0"] && W.state.levels["0"].gen;
    check("generator_5_legacy_world", gen === 5 && zr.zMin === -2 && zr.zMax === 2 && W.state.areasX === 1, "gen " + gen + " z " + zr.zMin + ".." + zr.zMax + " areas " + W.state.areasX);
    for (let i = 0; i < seeds.length; i++) {
        if (i > 0) W.newWorld(seeds[i]);
        const result = runCensus(env);
        const detail = result.naturalCells + " natural cells, " + result.anchors + " anchors, " + result.bad + " unanchored, " + result.unknownCells + " unknown, " + result.ms + "ms" + (result.example ? " e.g. " + JSON.stringify(result.example) : "");
        check("baseline_census_seed_" + seeds[i], result.bad === 0 && result.naturalCells > 0 && result.anchors > 0, detail);
    }

    const Levels = env.UF.Levels;
    const area = { x: 0, y: 0 };
    const stone = ["stone", "stone", "stone", "stone", "stone"];
    const air = ["air", "air", "air", "air", "air"];
    const reader = liveReader(env);
    paint(Levels, area, 6, 6, -2, stone);
    paint(Levels, area, 6, 6, -1, stone);
    paint(Levels, area, 6, 6, 0, air);
    paint(Levels, area, 6, 6, 1, ["wood", "air", "air", "air", "air"]);
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) paint(Levels, area, 6 + dx, 6 + dy, 1, air);
    const placed = env.UF.Objects.setIn({ x: 0, y: 0, z: 0 }, 6, 6, "wall_wood");
    const wall = reader.block(0, 0, 6, 6, api.gOf(0, 4));
    check("real_wall_object_is_solid", placed === true && wall.solid === true && wall.source === "object", "placed " + placed + " source " + wall.source);
    check("real_wall_and_deck_held", verdict(reader, 0, 0, 6, 6, api.gOf(1, 0)) === "held");
    check("real_floor_stratum_is_anchor", reader.block(0, 0, 6, 6, api.gOf(-2, 0)).anchor === true);

    paint(Levels, area, 8, 8, -2, air);
    paint(Levels, area, 8, 8, -1, air);
    paint(Levels, area, 8, 8, 0, air);
    paint(Levels, area, 8, 8, 1, ["wood", "air", "air", "air", "air"]);
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) paint(Levels, area, 8 + dx, 8 + dy, 1, air);
    check("real_deck_without_support_falls", verdict(reader, 0, 0, 8, 8, api.gOf(1, 0)) === "falls");

    const wrote = Levels.setStrata({ area: area, x: 12, y: 12, z: 0 }, {
        m: [0x83, 0, 0, 0, 0], hp: [40, 0, 0, 0, 0], connector: "stairUp"
    });
    Levels.setStrata({ area: area, x: 12, y: 12, z: -1 }, {
        m: [1, 1, 1, 1, 0], hp: [255, 255, 255, 255, 0], connector: 0
    });
    const beforeSrc = Levels.strataAt({ area: area, x: 12, y: 12, z: 0 });
    const beforeDst = Levels.strataAt({ area: area, x: 12, y: 12, z: -1 });
    const notes = [];
    const previousMatter = env.UF.Matter;
    env.UF.Matter = {
        note() { notes.push("note"); },
        registerMatterParticipant() { notes.push("register"); }
    };
    const fell = [];
    const strataEvents = [];
    function onStrata(ref, info) {
        strataEvents.push({ x: ref.x, y: ref.y, z: ref.z, cause: info && info.cause });
    }
    env.UF.Events.on("levels:strataChanged", onStrata);
    let directFluid = 0;
    const committed = api.commitFall({
        area: area,
        drop: 1,
        vacated: [{ x: 12, y: 12, z: 0, s: 0 }],
        filled: [{ x: 12, y: 12, z: -1, s: 4 }],
        contact: { x: 12, y: 12, z: -1, s: 4 }
    }, {
        levels: { strataAt: ref => Levels.strataAt(ref), setStrata: (ref, spec, opts) => Levels.setStrata(ref, spec, opts) },
        events: { emit(name, payload) { fell.push({ name: name, payload: payload }); env.UF.Events.emit(name, payload); } },
        fluid: { setCell() { directFluid++; } },
        matter: env.UF.Matter
    });
    env.UF.Events.off("levels:strataChanged", onStrata);
    env.UF.Matter = previousMatter;
    const afterSrc = Levels.strataAt({ area: area, x: 12, y: 12, z: 0 });
    const afterDst = Levels.strataAt({ area: area, x: 12, y: 12, z: -1 });
    check("real_commit_moves_constructed_byte", wrote === true && committed.ok === true && beforeSrc.connector === "stairUp" && afterSrc.bytes[0] === 0 && afterSrc.connector == null && afterDst.bytes[4] === 0x83 && afterDst.hp[4] === 40 && afterDst.constructed[4] === true && beforeDst.bytes[0] === afterDst.bytes[0]);
    const ours = strataEvents.filter(e => e.x === 12 && e.y === 12);
    check("real_commit_events_once", fell.length === 1 && fell[0].name === "structure:fell" && fell[0].payload.cause === "structural:fall" && ours.length === 2 && ours.every(e => e.cause === "structural:fall"));
    check("real_commit_posts_no_matter", notes.length === 0 && directFluid === 0);

    const rbSrc = { area: area, x: 14, y: 14, z: 0 };
    const rbDst = { area: area, x: 14, y: 14, z: -1 };
    const rbSrc2 = { area: area, x: 15, y: 14, z: 0 };
    const rbDst2 = { area: area, x: 15, y: 14, z: -1 };
    Levels.setStrata(rbSrc, { m: [1, 0, 0, 0, 0], hp: [11, 0, 0, 0, 0], connector: "stairDown" });
    Levels.setStrata(rbDst, { m: [0, 0, 0, 0, 0], hp: [0, 0, 0, 0, 0], connector: 0 });
    Levels.setStrata(rbSrc2, { m: [1, 0, 0, 0, 0], hp: [11, 0, 0, 0, 0], connector: 0 });
    Levels.setStrata(rbDst2, { m: [0, 0, 0, 0, 0], hp: [0, 0, 0, 0, 0], connector: 0 });
    const snapSrc = JSON.stringify(Levels.strataAt(rbSrc));
    const snapDst = JSON.stringify(Levels.strataAt(rbDst));
    let n = 0;
    const rolled = api.commitFall({
        area: area,
        vacated: [{ x: 14, y: 14, z: 0, s: 0 }, { x: 15, y: 14, z: 0, s: 0 }],
        filled: [{ x: 14, y: 14, z: -1, s: 4 }, { x: 15, y: 14, z: -1, s: 4 }]
    }, {
        levels: {
            strataAt(ref) { return Levels.strataAt(ref); },
            setStrata(ref, spec, opts) {
                n++;
                if (n === 2) return false;
                return Levels.setStrata(ref, spec, opts);
            }
        },
        events: { emit() {} }
    });
    check("real_commit_rollback", rolled.ok === false && rolled.restored === true && JSON.stringify(Levels.strataAt(rbSrc)) === snapSrc && JSON.stringify(Levels.strataAt(rbDst)) === snapDst);
}

function tail(text) {
    return (text || "").split(/\r?\n/).filter(Boolean).slice(-25).join("\n");
}

function sweep() {
    for (let i = 0; i < MUTANTS.length; i++) {
        const name = MUTANTS[i].name;
        const child = spawnSync(process.execPath, [__filename, "--mutant=" + name, "--pure"], {
            cwd: ROOT,
            encoding: "utf8",
            timeout: 180000
        });
        const status = child.status;
        check("mutant_killed_" + name, status === 1, status === 1 ? "" : "exit " + status + "\n" + tail(child.stdout) + "\n" + tail(child.stderr));
    }
}

try {
    runPure();
} catch (e) {
    check("pure_checks_threw", false, e && e.stack ? e.stack : String(e));
}

if (RUN_VM) {
    try {
        runVm();
    } catch (e) {
        check("vm_checks_threw", false, e && e.stack ? e.stack : String(e));
    }
}

if (SWEEP) sweep();

console.log(fails ? "\nRESULT: FAIL (" + fails + " problem(s))" : "\nRESULT: PASS (" + passes + " checks)");
process.exit(fails ? 1 : 0);
