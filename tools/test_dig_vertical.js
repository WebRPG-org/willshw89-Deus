#!/usr/bin/env node
"use strict";

// NAT.02.05: real Levels, Fluid, Structural, Jobs and their event/tick bridge.
// The existing structural VM bootstrap is reused without running its suite.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createRequire } = require("module");
const root = path.resolve(__dirname, "..");
const runtimePath = path.join(__dirname, "test_structural_runtime.js");
const runtimeSource = fs.readFileSync(runtimePath, "utf8");
if (!/\nmain\(\);\s*$/.test(runtimeSource)) throw new Error("structural VM bootstrap changed");
const bootstrap = { exports: {} };
new Function("require", "__dirname", "__filename", "process", "module",
    runtimeSource.replace(/^#![^\n]*\n/, "").replace(/\nmain\(\);\s*$/, "\nmodule.exports = { buildEnvironment, loadRules, paint, runTicks, drain, AREA, STONE, AIR, DECK };"))(
    createRequire(runtimePath), __dirname, runtimePath, process, bootstrap);
const { buildEnvironment, loadRules, paint, runTicks, drain, AREA, STONE, AIR, DECK } = bootstrap.exports;
const pluginDir = path.join(root, "game/js/plugins");
let passed = 0, failed = 0;
function check(name, ok, detail) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? " - " + detail : ""}`);
    if (ok) passed++; else failed++;
}
const mats = (L, x, y, z) => L.strataAt({ area: AREA, x, y, z }).materials.join("/");
function tickUntil(env, condition, limit = 500) {
    for (let n = 0; n < limit && !condition(); n++) env.UF.Jobs.update();
    return condition();
}
function set(L, x, y, z, m) { return paint(L, x, y, z, m); }
function fixture(env, x, y) {
    const L = env.UF.Levels;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        set(L, x + dx, y + dy, -2, STONE);
        set(L, x + dx, y + dy, -1, AIR);
        set(L, x + dx, y + dy, 0, AIR);
        set(L, x + dx, y + dy, 1, AIR);
        set(L, x + dx, y + dy, 2, AIR);
    }
    // Center floor: supported through the eastern deck and its column.
    set(L, x, y, 0, DECK);
    set(L, x + 1, y, -1, STONE);
    set(L, x + 1, y, 0, DECK);
}

const source = fs.readFileSync(path.join(pluginDir, "DEUS_Structural.js"), "utf8");
const env = buildEnvironment(20260923, source);
const U = env.UF, W = U.World, L = U.Levels, F = U.Fluid;
U.Rules = loadRules();
U.Combat = { onUnitDeath(u) { W.removeUnit(u.id); return true; }, addPopup() {} };
let mineNotes = 0;
U.Matter = { note(kind) { if (kind === "mine") mineNotes++; return { ok: true }; }, cover(fn) { return fn(); } };
let jobsSource = fs.readFileSync(path.join(pluginDir, "DEUS_Jobs.js"), "utf8");
if (process.argv.includes("--mutant=skip_floor_queue")) {
    const needle = 'UF.Events.on("levels:strataChanged", queueFloorCheck)';
    if (jobsSource.split(needle).length !== 2) throw new Error("mutant edit did not match once");
    jobsSource = jobsSource.replace(needle, "void queueFloorCheck");
}
vm.runInContext(jobsSource, env, { filename: "DEUS_Jobs.js" });
const J = U.Jobs;
check("handlers", !!J.handler("dig_down") && !!J.handler("mine_ceiling") && typeof J.verticalStratum === "function");

// A floor mined under the worker: exactly S0 is removed, one matter note, and
// the occupant reaches the lower level on the shared tick.
fixture(env, 45, 45);
drain(env, 200);
const worker = W.addUnit({ name: "TEST_digger", area: AREA, x: 45, y: 45, z: 0, exact: true, data: { kind: "test", hp: 100, workRate: 180 } });
const down = J.create({ type: "dig_down", target: { area: AREA, x: 45, y: 45, z: 0 }, owner: worker.id });
const beforeDown = mats(L, 45, 45, 0), notes0 = mineNotes;
tickUntil(env, () => down.state === "done" || down.state === "failed");
check("dig_down_one_stratum", down.state === "done" && beforeDown === "stone/air/air/air/air" &&
    mats(L, 45, 45, 0) === "air/air/air/air/air" && down.result.stratum === 0,
    `${down.state} ${mats(L, 45, 45, 0)} ${JSON.stringify(down.result)}`);
check("mine_note_once", mineNotes - notes0 === 1, `notes ${mineNotes - notes0}`);
runTicks(env, 1);
check("mined_floor_occupant_falls", W.unit(worker.id) && W.unit(worker.id).z === -1,
    `worker z ${W.unit(worker.id) && W.unit(worker.id).z}`);

// A ceiling is removed from the level below, without clearing neighboring strata.
fixture(env, 55, 45);
set(L, 55, 45, 1, DECK);
set(L, 56, 45, 0, STONE);
set(L, 56, 45, 1, DECK);
drain(env, 200);
const ceilingWorker = W.addUnit({ name: "TEST_ceiling", area: AREA, x: 55, y: 45, z: 0, exact: true, data: { kind: "test", hp: 100, workRate: 180 } });
const ceiling = J.create({ type: "mine_ceiling", target: { area: AREA, x: 55, y: 45, z: 0 }, owner: ceilingWorker.id });
tickUntil(env, () => ceiling.state === "done" || ceiling.state === "failed");
check("mine_ceiling_one_stratum", ceiling.state === "done" && mats(L, 55, 45, 1) === "air/air/air/air/air" &&
    mats(L, 56, 45, 1) === "stone/air/air/air/air", `${ceiling.state} ${mats(L, 55, 45, 1)}`);

// Cut the one top stratum joining a ceiling to its anchored pillar. The
// unsupported neighboring slab drops; the worker does not need to mine it.
fixture(env, 95, 45);
set(L, 95, 45, 1, DECK);
set(L, 96, 45, 0, STONE);
set(L, 96, 45, 1, DECK);
drain(env, 200);
const supportWorker = W.addUnit({ name: "TEST_support", area: AREA, x: 96, y: 45, z: 1, exact: true, data: { kind: "test", hp: 100, workRate: 180 } });
const commits0 = U.Structural.stats().commits;
const supportJob = J.create({ type: "dig_down", target: { area: AREA, x: 96, y: 45, z: 1 }, owner: supportWorker.id });
tickUntil(env, () => supportJob.state === "done" || supportJob.state === "failed");
drain(env, 200);
check("last_support_mined_drops_ceiling", supportJob.state === "done" && U.Structural.stats().commits > commits0 &&
    mats(L, 95, 45, 1) === "air/air/air/air/air" && L.strataAt({ area: AREA, x: 95, y: 45, z: 0 }).materials[1] === "stone",
    `${supportJob.state} commits ${commits0}->${U.Structural.stats().commits}; upper ${mats(L, 95, 45, 1)} lower ${mats(L, 95, 45, 0)}`);

// The world floor S0 is never a mining target.
set(L, 65, 45, -2, DECK);
set(L, 65, 45, -1, AIR);
const bottom = { area: AREA, x: 65, y: 45, z: -2 };
check("world_floor_undiggable", J.verticalStratum("dig_down", bottom) === null && mats(L, 65, 45, -2) === "stone/air/air/air/air");

// Damage through the deck uses the same surface-loss bridge as mining.
fixture(env, 75, 45);
drain(env, 200);
const blastUnit = W.addUnit({ name: "TEST_blast", area: AREA, x: 75, y: 45, z: 0, exact: true, data: { kind: "test", hp: 100 } });
const blast = L.applyVolumeDamage(AREA, 75, 45, 0, 0, 75, 45, 0, 0, 100000, "impact");
runTicks(env, 1);
check("volume_damage_drops_occupant", blast.ok && blast.strataDestroyed === 1 && W.unit(blastUnit.id) && W.unit(blastUnit.id).z === -1,
    `destroyed ${blast.strataDestroyed}, z ${W.unit(blastUnit.id) && W.unit(blastUnit.id).z}`);

// A shallow water cell loses its deck and drains down through Fluid's normal passage.
fixture(env, 85, 45);
drain(env, 200);
F.reset();
F.setCell(AREA, 85, 45, 0, "water", 1);
const wetWorker = W.addUnit({ name: "TEST_wet", area: AREA, x: 85, y: 45, z: 0, exact: true, data: { kind: "test", hp: 100, workRate: 180 } });
const wetJob = J.create({ type: "dig_down", target: { area: AREA, x: 85, y: 45, z: 0 }, owner: wetWorker.id });
tickUntil(env, () => wetJob.state === "done" || wetJob.state === "failed");
for (let i = 0; i < 40; i++) F.tick(100000);
const upper = { depth: F.depthAt(0, 0, 85, 45, 0), type: F.typeAt(0, 0, 85, 45, 0) };
const lower = { depth: F.depthAt(0, 0, 85, 45, -1), type: F.typeAt(0, 0, 85, 45, -1) };
check("mined_floor_drains_water", wetJob.state === "done" && lower.depth > 0 && lower.type === "water",
    `${wetJob.state} upper ${JSON.stringify(upper)} lower ${JSON.stringify(lower)}`);

check("no_console_errors", env.__errors.length === 0, env.__errors.slice(0, 2).join(" | "));
console.log(`RESULT: ${failed ? "FAIL" : "PASS"} (${passed} passed, ${failed} failed)`);
process.exitCode = failed ? 1 : 0;
