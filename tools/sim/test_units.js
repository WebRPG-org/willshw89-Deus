#!/usr/bin/env node
"use strict";

// NAT.02.MASS part 1. Mutants change source in an isolated VM only;
// production code has no test switches and no file is rewritten by this suite.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "../..");
const unitsPath = path.join(root, "game/js/sim/units.js");
const MAX = Number.MAX_SAFE_INTEGER;
const rangeError = error => error && error.name === "RangeError";
const typeError = error => error && error.name === "TypeError";

function spaceFromSource() {
    const file = path.join(root, "game/js/plugins/DEUS_World.js");
    const source = fs.readFileSync(file, "utf8");
    // Execute the actual Space definition and its derived Z height. This is
    // a source-contract check, not an RMMZ boot or a consumer bridge test.
    const block = source.match(/    const Space = \{[\s\S]*?    Space\.Z_STEP_FEET = [^;]+;/g);
    assert.equal(block && block.length, 1, "exactly one UF.Space definition");
    return vm.runInNewContext(block[0] + "\nSpace;", {}, { timeout: 1000 });
}

const checks = {
    units_geometry_matches_space(u) {
        const space = spaceFromSource();
        assert.equal(u.CP_PER_LB, 100);
        assert.equal(u.CELL_FT, space.GRID_SIZE_FEET);
        assert.equal(u.CELL_FT, space.FEET_PER_CELL);
        assert.equal(u.STRATUM_FT, space.STRATUM_FEET);
        assert.equal(u.STRATA_PER_Z, space.STRATA_PER_LAYER);
        assert.equal(u.STRATUM_FT * u.STRATA_PER_Z, space.Z_STEP_FEET);
        assert.equal(u.STRATUM_FT3, 50);
        assert.equal(u.STRATUM_FT3, u.CELL_FT ** 2 * u.STRATUM_FT);
        assert.equal(u.WATER_CP_PER_FT3, 6240);
        assert.equal(u.WATER_CP_PER_STRATUM, space.GRID_SIZE_FEET ** 2 * space.STRATUM_FEET * 6240);
        assert.equal(u.WATER_CP_PER_Z_CELL, 1560000);
        assert(Object.isFrozen(u), "public unit table must be immutable");
    },
    kg_to_cp_rule(u) {
        for (const [kg, cp] of [[3894, 858480], [3256, 717825], [4106, 905218]]) {
            assert.equal(u.kgToCp(kg), cp, `${kg} kg`);
        }
        assert.equal(u.gToCp(4000), 882, "bar_iron");
        assert.equal(u.kgToCp(0), 0);
        assert.equal(u.gToCp(0), 0);
        assert.equal(u.kgToCp("0.45359237"), 100);
        assert.equal(u.gToCp("453.59237"), 100);
        // Exact half-centipound ties and their two neighbours. Pinned
        // catalogue integers alone do not distinguish half up from half down.
        for (const [convert, cases] of [
            [u.kgToCp, [["0.002267961849", 0], ["0.00226796185", 1], ["0.002267961851", 1], ["0.00680388555", 2]]],
            [u.gToCp, [["2.267961849", 0], ["2.26796185", 1], ["2.267961851", 1], ["6.80388555", 2]]]
        ]) for (const [value, expected] of cases) {
            assert.equal(convert(value), expected, value);
            assert.equal(convert(Number(value)), expected, `number ${value}`);
        }
        assert.equal(u.kgToCp(1e-7), 0);
        assert.equal(u.kgToCp(Number.MIN_VALUE), 0);
        assert.equal(u.gToCp(1e16), 2204622621848776);
        // Exact decimal corresponding to the largest storable cp balance.
        assert.equal(u.kgToCp("40855968570201.9984383867"), MAX);
        assert.throws(() => u.kgToCp("40855968570202.0029743104"), rangeError);
        for (const convert of [u.kgToCp, u.gToCp]) {
            for (const bad of [-1, NaN, Infinity, -Infinity]) assert.throws(() => convert(bad), rangeError);
            for (const bad of [null, true, {}, [], 1n, "", " 1", "1 ", "0x10", "1e3", "-1", "1/2", ".5", "1."]) {
                assert.throws(() => convert(bad), typeError);
            }
            assert.throws(() => convert(Number.MAX_VALUE), rangeError);
        }
    },
    apportion_exact(u) {
        const apportion = (total, weights) => Array.from(u.apportion(total, weights));
        assert.deepEqual(apportion(10, [1, 1, 1]), [4, 3, 3]);
        assert.deepEqual(apportion(2, [1, 1, 1, 1]), [1, 1, 0, 0]);
        assert.deepEqual(apportion(7, [0, 2, 1]), [0, 5, 2]);
        assert.deepEqual(apportion(10, [1, 2, 3]), [2, 3, 5]);
        assert.deepEqual(apportion(0, []), []);
        assert.deepEqual(apportion(0, [0, 0]), [0, 0]);
        assert.deepEqual(apportion(MAX, [MAX, MAX, MAX]), [3002399751580331, 3002399751580330, 3002399751580330]);
        assert.deepEqual(apportion(MAX, [MAX, MAX - 1]), [4503599627370496, 4503599627370495]);
        const frozen = Object.freeze([9, 7, 5, 0]);
        for (let total = 0; total <= 200; total++) {
            const parts = apportion(total, frozen);
            assert.equal(parts.reduce((a, b) => a + BigInt(b), 0n), BigInt(total));
            assert(parts.every(n => Number.isSafeInteger(n) && n >= 0));
            assert.equal(parts[3], 0);
            for (let i = 0; i < parts.length; i++) {
                assert(parts[i] === Math.floor(total * frozen[i] / 21) || parts[i] === Math.ceil(total * frozen[i] / 21));
            }
            assert.deepEqual(apportion(total, frozen), parts, "stable allocation");
        }
        for (const weights of [[], [0], [0, 0]]) assert.throws(() => u.apportion(1, weights), rangeError);
        for (const weights of [[-1], [0.5], [NaN], [MAX + 1], Array(2)]) assert.throws(() => u.apportion(10, weights), rangeError);
        assert.throws(() => u.apportion(1, "1,2"), typeError);
        for (const total of [-1, 0.5, NaN, MAX + 1]) assert.throws(() => u.apportion(total, [1]), rangeError);
    },
    overflow_refused(u) {
        assert.equal(u.addCp(MAX, 0), MAX);
        assert.equal(u.addCp(MAX - 1, 1), MAX);
        assert.equal(u.subCp(MAX, MAX), 0);
        assert.equal(u.subCp(MAX, 1), MAX - 1);
        assert.equal(u.mulCp(MAX, 1), MAX);
        assert.equal(u.mulCp(MAX, 0), 0);
        assert.equal(u.mulCp(94906265, 94906265), 9007199136250225);
        // Exercise all three guards even if one assertion fails.
        const failures = [];
        for (const [name, invoke] of [
            ["addCp overflow", () => u.addCp(MAX, 1)],
            ["subCp underflow", () => u.subCp(0, 1)],
            ["mulCp overflow", () => u.mulCp(94906266, 94906266)]
        ]) {
            try { assert.throws(invoke, rangeError, name); }
            catch (error) { failures.push(error.message); }
        }
        assert.equal(failures.length, 0, failures.join("; "));
        for (const operation of [u.addCp, u.subCp, u.mulCp]) {
            for (const bad of [-1, 0.1, Infinity, NaN, MAX + 1, "1", null, 1n]) {
                assert.throws(() => operation(bad, 0), rangeError);
                assert.throws(() => operation(0, bad), rangeError);
            }
        }
    },
    water_stratum_is_312000(u) {
        assert.equal(u.WATER_CP_PER_STRATUM, 312000);
        assert.equal(u.WATER_CP_PER_FT3 * u.STRATUM_FT3, 312000);
        assert.equal(u.WATER_CP_PER_STRATUM * u.STRATA_PER_Z, 1560000);
    },
    gallons_are_derived(u) {
        assert.equal(u.CP_PER_GALLON, 834);
        const displayGallons = u.WATER_CP_PER_STRATUM / u.CP_PER_GALLON;
        assert.equal(displayGallons, 374.1007194244604);
        assert.notEqual(Math.floor(displayGallons) * u.CP_PER_GALLON, u.WATER_CP_PER_STRATUM);
        // Changing the display constant must not change physical capacities.
        const changed = evaluate(replaceOnce(fs.readFileSync(unitsPath, "utf8"), "const CP_PER_GALLON = 834;", "const CP_PER_GALLON = 835;"));
        assert.equal(changed.WATER_CP_PER_STRATUM, u.WATER_CP_PER_STRATUM);
        assert.equal(changed.WATER_CP_PER_Z_CELL, u.WATER_CP_PER_Z_CELL);
    },
    world_bound_safe(u) {
        assert.equal(u.WORLD_BOUND.cellsX, 768);
        assert.equal(u.WORLD_BOUND.cellsY, 768);
        assert.equal(u.WORLD_BOUND.zLevels, 32);
        assert(Object.isFrozen(u.WORLD_BOUND));
        assert.equal(u.checkWorldBound(u.WATER_CP_PER_STRATUM), 29444014080000);
        assert.equal(u.WORLD_BOUND_WATER_CP, 29444014080000);
        // Arbitrary conservative test envelope, not a new material density.
        assert.equal(u.checkWorldBound(10000000, 123), 943718400000123);
        const strata = 768n * 768n * 32n * 5n;
        const limit = Number(BigInt(MAX) / strata);
        const used = BigInt(limit) * strata;
        assert.equal(u.checkWorldBound(limit, Number(BigInt(MAX) - used)), MAX);
        assert.throws(() => u.checkWorldBound(limit + 1), rangeError);
        assert.throws(() => u.checkWorldBound(limit, Number(BigInt(MAX) - used) + 1), rangeError);
        assert.throws(() => u.checkWorldBound(-1), rangeError);
        assert.throws(() => u.checkWorldBound(1, -1), rangeError);
    }
};

function evaluate(source) {
    const context = { module: { exports: {} } };
    vm.runInNewContext(source, context, { filename: unitsPath, timeout: 1000 });
    return context.module.exports;
}

function replaceOnce(source, before, after) {
    assert.equal(source.split(before).length - 1, 1, `mutation target: ${before}`);
    return source.replace(before, after);
}

const mutants = [
    {
        name: "density_6250", kills: ["water_stratum_is_312000", "units_geometry_matches_space"],
        change: source => replaceOnce(source, "const WATER_CP_PER_FT3 = 6240;", "const WATER_CP_PER_FT3 = 6250;")
    },
    {
        name: "round_half_down", kills: ["kg_to_cp_rule"],
        change: source => replaceOnce(source, "remainder * 2n >= denominator", "remainder * 2n > denominator")
    },
    {
        name: "apportion_drops_remainder", kills: ["apportion_exact"],
        change: source => replaceOnce(source, "i < leftover", "i < 0")
    },
    {
        name: "overflow_guard_removed", kills: ["overflow_refused"],
        change(source) {
            for (const [operator, name] of [["+", "addCp"], ["-", "subCp"], ["*", "mulCp"]]) {
                source = replaceOnce(source, `return checkedCp(BigInt(a) ${operator} BigInt(b), "${name}");`, `return Number(BigInt(a) ${operator} BigInt(b));`);
            }
            return source;
        }
    }
];

function runCheck(name, units, label = "") {
    try {
        checks[name](units);
        console.log(`PASS ${label}${name}`);
        return "pass";
    } catch (error) {
        console.log(`FAIL ${label}${name}: ${error.message}`);
        return error.code === "ERR_ASSERTION" ? "assertion" : "error";
    }
}

function main(args) {
    if (args.some(arg => arg !== "--mutation-sweep") || args.length > 1) {
        console.error("Usage: node tools/sim/test_units.js [--mutation-sweep]");
        return 1;
    }
    let units;
    try { units = require(unitsPath); }
    catch (error) {
        for (const name of Object.keys(checks)) console.log(`FAIL ${name}: ${error.code || error.name} ${error.message.split("\n")[0]}`);
        console.log(`RESULT: 0 passed, ${Object.keys(checks).length} failed (module load; absence only)`);
        return 1;
    }
    let failed = 0;
    for (const name of Object.keys(checks)) if (runCheck(name, units) !== "pass") failed++;
    console.log(`RESULT: ${Object.keys(checks).length - failed} passed, ${failed} failed`);
    if (failed || !args.includes("--mutation-sweep")) return failed ? 1 : 0;
    const source = fs.readFileSync(unitsPath, "utf8");
    let killed = 0;
    for (const mutant of mutants) {
        try {
            const changed = evaluate(mutant.change(source));
            const results = mutant.kills.map(name => runCheck(name, changed, `${mutant.name}::`));
            if (results.every(result => result === "assertion")) {
                killed++;
                console.log(`KILLED ${mutant.name}`);
            } else {
                console.log(`SURVIVED/INVALID ${mutant.name}: all named checks must fail by assertion`);
            }
        } catch (error) {
            // A broken rewrite, syntax error or load error is not a kill.
            console.log(`INVALID ${mutant.name}: ${error.message}`);
        }
    }
    console.log(`MUTATION RESULT: ${killed}/${mutants.length} killed; ${mutants.length - killed} survived/invalid`);
    return killed === mutants.length ? 0 : 1;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { main };
