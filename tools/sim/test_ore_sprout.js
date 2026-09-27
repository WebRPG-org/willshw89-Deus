"use strict";
// SIM.50.13 F-03. Loose stones must never mature into ore.
//   node tools/sim/test_ore_sprout.js
// Loads game/js/plugins/DEUS_Ecology.js in a vm sandbox (no NW.js) and runs a seeded
// beat loop. Ore object ids are ironstone, copper_outcrop and gold_outcrop, plus any
// type whose catalog tags include "ore". Exit 0 only when every check passes.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const SRC = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "DEUS_Ecology.js"), "utf8");
const ORE_IDS = Object.freeze(["ironstone", "copper_outcrop", "gold_outcrop"]);
const ORE = new Set(ORE_IDS);
const BEATS = 1500;
const SEEDS = Object.freeze([5013, 501313]);
const SIZE = 48;

let failed = 0;
function check(name, ok, detail) {
    if (ok) console.log("PASS " + name + (detail ? " — " + detail : ""));
    else {
        failed++;
        console.log("FAIL " + name + ": " + detail);
    }
}

function loadEcology(seed) {
    const objects = new Map();
    const placed = [];
    const cellKey = (z, x, y) => (z | 0) + "," + (x | 0) + "," + (y | 0);
    const O = {
        type(id) {
            if (id === "mythril_vein") return { id: id, tags: ["ore", "mineral"] };
            if (ORE.has(id)) return { id: id, tags: ["ore", "mineral"] };
            if (id === "granite_boulder" || id === "rocks_small") return { id: id, tags: ["stone"] };
            return { id: id, tags: ["plant"] };
        },
        atIn(area, x, y) {
            const id = objects.get(cellKey(area && area.z, x, y));
            return id ? { id: id } : null;
        },
        setIn(area, x, y, id) {
            const z = area && area.z ? area.z : 0;
            placed.push({ z: z, x: x, y: y, id: id });
            if (id) objects.set(cellKey(z, x, y), id);
            else objects.delete(cellKey(z, x, y));
            return true;
        },
        isConstructedOrPaved() { return false; },
        hourNow() { return 0; }
    };
    const W = {
        state: { seed: seed, size: SIZE, areasX: 1, areasY: 1, ecology: null },
        currentArea() { return { x: 0, y: 0 }; },
        walkable() { return true; },
        standerAt() { return null; },
        units() { return []; },
        unitsInArea() { return []; }
    };
    const sandbox = {
        console: console,
        performance: { now: () => 0 },
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval
    };
    sandbox.window = sandbox;
    sandbox.DEUS = {
        World: W,
        Objects: O,
        Events: { on() {}, emit() {} },
        Levels: {
            shapeAt() { return "floor"; },
            waterAt() { return false; }
        }
    };
    sandbox.UF = sandbox.DEUS;
    function Game_Map() {}
    Game_Map.prototype.update = function() {};
    Game_Map.prototype.setup = function() {};
    sandbox.Game_Map = Game_Map;
    sandbox.DataManager = {
        extractSaveContents() {},
        makeSaveContents() { return { ufWorld: W.state }; }
    };
    function Scene_Boot() {}
    Scene_Boot.prototype.start = function() {};
    sandbox.Scene_Boot = Scene_Boot;
    vm.createContext(sandbox);
    vm.runInContext(SRC, sandbox, { filename: "DEUS_Ecology.js", timeout: 10000 });
    return { E: sandbox.UF.Ecology, O: O, W: W, objects: objects, placed: placed, cellKey: cellKey };
}

function orePlacements(placed) {
    return placed.filter(p => p.id && (ORE.has(p.id) || p.id === "mythril_vein"));
}

// --- Tables: loose-stone rows keep a non-ore stone and list no ore id. ---
{
    const eco = loadEcology(1);
    const defs = eco.E.sproutDefs();
    let rockRows = 0;
    let oreInTables = [];
    let weightMismatch = [];
    for (const z of Object.keys(defs)) {
        for (const row of defs[z]) {
            if (!row.weights || row.weights.length !== row.matures.length) weightMismatch.push(z + ":" + row.sprout);
            for (const id of row.matures) if (ORE.has(id)) oreInTables.push(z + ":" + row.sprout + "->" + id);
            if (row.sprout === "rocks_small") {
                rockRows++;
                if (row.matures.length !== 1 || row.matures[0] !== "granite_boulder") {
                    oreInTables.push(z + ":rocks_small matures " + JSON.stringify(row.matures));
                }
            }
        }
    }
    check("sprout_tables_no_ore", rockRows === 3 && oreInTables.length === 0 && weightMismatch.length === 0,
        "rock rows " + rockRows + "; ore entries [" + oreInTables.join(", ") + "]; bad weights [" + weightMismatch.join(", ") + "]");
}

// --- A save that already scheduled ore must not place it. Tagged ore is refused too. ---
{
    const eco = loadEcology(2);
    const st = eco.E.state();
    const scheduled = ORE_IDS.concat(["mythril_vein"]);
    scheduled.forEach((id, i) => {
        eco.O.setIn({ x: 0, y: 0, z: 0 }, 10 + i, 10, "rocks_small");
        st.sprouts.push({
            id: "legacy_" + id,
            area: { x: 0, y: 0 },
            x: 10 + i,
            y: 10,
            z: 0,
            sproutType: "rocks_small",
            matureType: id,
            createdBeat: 0,
            matureBeat: 1
        });
    });
    eco.placed.length = 0;
    const res = eco.E.stepBeat({ force: true });
    const left = scheduled.map((id, i) => {
        const cell = eco.objects.get(eco.cellKey(0, 10 + i, 10));
        return id + "=" + (cell || "missing");
    });
    const stayed = scheduled.every((id, i) => eco.objects.get(eco.cellKey(0, 10 + i, 10)) === "rocks_small");
    check("legacy_ore_not_placed", res.matured === 0 && orePlacements(eco.placed).length === 0 && stayed,
        "matured " + res.matured + "; ore writes " + orePlacements(eco.placed).length + "; cells " + left.join(", "));
}

// --- The non-ore stone outcome still matures. ---
{
    const eco = loadEcology(3);
    const st = eco.E.state();
    eco.O.setIn({ x: 0, y: 0, z: 0 }, 20, 20, "rocks_small");
    st.sprouts.push({
        id: "legacy_granite",
        area: { x: 0, y: 0 },
        x: 20,
        y: 20,
        z: 0,
        sproutType: "rocks_small",
        matureType: "granite_boulder",
        createdBeat: 0,
        matureBeat: 1
    });
    const res = eco.E.stepBeat({ force: true });
    const cell = eco.objects.get(eco.cellKey(0, 20, 20));
    check("granite_boulder_still_matures", res.matured >= 1 && cell === "granite_boulder",
        "matured " + res.matured + "; cell " + cell);
}

// --- Seeded long run: every beat, no sprout is born as ore and no ore is written. ---
function runSeed(seed, beats) {
    const eco = loadEcology(seed);
    let rockSprouts = 0;
    let badRock = null;
    let granite = 0;
    let otherMature = 0;
    const oreHits = [];
    for (let b = 0; b < beats; b++) {
        const from = eco.placed.length;
        eco.E.stepBeat({ force: true });
        for (const s of eco.E.sprouts()) {
            if (s.sproutType === "rocks_small") {
                rockSprouts++;
                if (s.matureType !== "granite_boulder") badRock = s.matureType;
            }
            if (ORE.has(s.matureType) || s.matureType === "mythril_vein") oreHits.push("sprout " + s.matureType + " beat " + b);
        }
        for (let i = from; i < eco.placed.length; i++) {
            const id = eco.placed[i].id;
            if (ORE.has(id) || id === "mythril_vein") oreHits.push("placed " + id + " beat " + b);
            else if (id === "granite_boulder") granite++;
            else if (id && id !== "rocks_small" && id !== "sapling" && id !== "bush" && id !== "cave_mushrooms" && id !== "crystal_small" && id !== "glow_caps") otherMature++;
        }
    }
    let gridOre = 0;
    for (const id of eco.objects.values()) if (ORE.has(id) || id === "mythril_vein") gridOre++;
    return { placed: eco.placed.map(p => p.id), rockSprouts, badRock, granite, otherMature, oreHits, gridOre };
}

const longA = runSeed(SEEDS[0], BEATS);
const longB = runSeed(SEEDS[1], BEATS);
check("long_run_no_ore",
    longA.oreHits.length === 0 && longB.oreHits.length === 0 && longA.gridOre === 0 && longB.gridOre === 0 && !longA.badRock && !longB.badRock,
    "beats " + BEATS + " seeds " + SEEDS.join(",") +
        "; ore hits " + (longA.oreHits.concat(longB.oreHits).slice(0, 4).join("; ") || "0") +
        "; bad rock mature " + (longA.badRock || longB.badRock || "none") +
        "; grid ore " + longA.gridOre + "/" + longB.gridOre);

check("long_run_still_sprouts",
    longA.granite > 0 && longB.granite > 0 && longA.otherMature > 0 && longB.otherMature > 0 && longA.rockSprouts > 0 && longB.rockSprouts > 0,
    "granite " + longA.granite + "/" + longB.granite +
        "; other matures " + longA.otherMature + "/" + longB.otherMature +
        "; loose-stone sprouts seen " + longA.rockSprouts + "/" + longB.rockSprouts);

const det1 = runSeed(SEEDS[0], 200);
const det2 = runSeed(SEEDS[0], 200);
check("long_run_seeded",
    det1.placed.length > 0 && det1.placed.join(",") === det2.placed.join(",") && det1.placed.join(",") !== longB.placed.slice(0, det1.placed.length).join(","),
    "seed " + SEEDS[0] + " placements " + det1.placed.length + " identical across two runs; differs from seed " + SEEDS[1]);

console.log("RESULT: " + (failed === 0 ? "PASS" : "FAIL") + " (" + failed + " failed)");
process.exit(failed === 0 ? 0 : 1);
