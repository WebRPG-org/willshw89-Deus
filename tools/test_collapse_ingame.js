#!/usr/bin/env node
"use strict";

/**
 * tools/test_collapse_ingame.js
 *
 * NAT.02.01.BRIDGE (lane-nx3): the first live collapse, in the real game (NW.js), on a snapshot copy of game/
 * (robocopy to %TEMP%; nothing under game/ is written). The snapshot's plugins.js gets DEUS_Structural (the PM registers
 * it in the real plugins.js on integration) and one test-only plugin, DEUS_TestCollapse.js, holding the suite
 * "collapse_cave_in". The world seed is fixed (DEUS_World parameter Seed, default 18).
 *
 * The suite builds, next to the player on the ground level: a 3 x 3 block of rock (all five strata of level 0) with an
 * open trench around it, over a cave on level -1 whose only rock under the block is a pillar under its centre. A TEST
 * unit stands in the cave under the block, and an item lies there. The checks wait for the queue to empty (the block is
 * held by the pillar), take a screenshot, destroy the pillar's upper four strata with UF.Levels.applyVolumeDamage (the
 * damage API, as mining or a blast would), and let the game clock run. No harness code calls the structure: the fall
 * comes from the events, the shared tick and the plugin.
 *
 * Checks (each prints PASS or FAIL):
 *   structural_registered  UF.Structural is live and "structure" is a handler of the shared tick
 *   scene_built            the block, trench, cave and pillar are written, the unit and the item are placed
 *   held_by_pillar         the queue empties with nothing committed: the block stands on its pillar
 *   cave_in_falls          after the pillar is destroyed, one fall is committed: the block drops 8 ft into the cave
 *                          (level -1 under it is solid rock, level 0 keeps a 2 ft floor)
 *   unit_crushed           the TEST unit under the block died, cause "crushed"
 *   item_kept              the item is not destroyed: same count, on a cell a unit can stand on
 *   fell_event_once        one structure:fell event, cause structural:fall
 *   no_errors              no window error, rejection or console.error during the suite
 *
 * Screenshots (test_output/collapse_cave_in.*.png), the camera on the player 4 cells south of the block: before (ground
 * level, the block standing), before_below (level -1, the cave and its pillar), after (ground level, the block dropped to
 * a 2 ft floor), after_below (level -1, the cave filled with the fallen rock).
 *   tick_cost_bounded      over the last 64 serviced ticks, a tick's own work (its time minus the time its commit spent
 *                          in UF.Levels.setStrata and the listeners of the events it fires) took at most 50 ms. The
 *                          detail reports the whole tick, the commit, and the listeners' time per event name: the
 *                          engine's write path is measured here, not judged
 *
 * Usage: node tools/test_collapse_ingame.js [--mutant=no_subscribe|no_budget] [--seed=<n>] [--evidence=<dir>] [--keep]
 *   --mutant=no_subscribe  the snapshot's DEUS_Structural does not subscribe to events: cave_in_falls must fail
 *   --mutant=no_budget     the read budget is unlimited: tick_cost_bounded must fail
 * Exit: 0 all passed, 1 a check failed, 2 harness problem.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SUITE = "collapse_cave_in";
const PLUGIN = "DEUS_TestCollapse";
const arg = (name, fallback) => {
    const a = process.argv.find(x => x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : fallback;
};
const flag = name => process.argv.includes(`--${name}`);
const CHECKS = ["structural_registered", "scene_built", "held_by_pillar", "cave_in_falls", "unit_crushed", "item_kept", "fell_event_once",
    "tick_cost_bounded", "no_errors"];
const MUTANTS = {
    no_subscribe: { check: "cave_in_falls", file: "DEUS_Structural.js", from: "const SUBSCRIBE = true;", to: "const SUBSCRIBE = false; /* MUTANT */" },
    no_budget: { check: "tick_cost_bounded", file: "DEUS_Structural.js", from: "const READS_PER_TICK = 512;", to: "const READS_PER_TICK = 1e9; /* MUTANT */" }
};

//-----------------------------------------------------------------------------
// The suite (runs inside NW.js; written into the snapshot as a plugin)

function suitePlugin() {
    "use strict";
    const T = window.UF && window.UF.Test;
    if (!T || !T.active) return;
    T.suite("collapse_cave_in", async t => {
        const W = UF.World, L = UF.Levels, O = UF.Objects, I = UF.Items, S = UF.Structural;
        const errors0 = t.errorsSoFar().length, consoleErrors = [], realConsoleError = console.error;
        console.error = function(...a) {
            consoleErrors.push(a.map(x => (x && x.stack) || String(x)).join(" ").slice(0, 300));
            return realConsoleError.apply(this, a);
        };
        const settled = () => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted() && !$gamePlayer.isTransferring() && !L.switching();
        await t.waitUntil(settled, 30000, "the map to settle");
        const tickNames = UF.Sim && UF.Sim.tickStats ? UF.Sim.tickStats().handlers : [];
        const s0 = S ? S.stats() : null;
        t.check("structural_registered", !!S && S.enabled === true && S.mode === "live" && tickNames.includes("structure"),
            `UF.Structural ${!!S}; tick handlers ${tickNames.join(",")}` + (s0 ? `; since the New Game: ${s0.ticks} ticks serviced, ${s0.idleTicks} idle, ${s0.reads} reads, ` +
                `${s0.enqueued} seeds, ${s0.commits} commits, slowest tick ${s0.maxTickMs} ms` : ""));
        if (!S) return;

        // Quiet the world around the scene: no colonist plans, normal time until the scene is built.
        if (UF.Colonists && UF.Colonists.setEnabled) UF.Colonists.setEnabled(false);
        if (window.$colonyManager) $colonyManager.cameraFollowUnit = null;
        if (L.view() !== 0) {
            L.setView(0);
            await t.waitUntil(() => settled() && L.view() === 0, 20000, "the ground").catch(() => {});
        }
        const v = W.viewLevel(), area = { x: v.x, y: v.y }, size = W.state.size, zr = W.zRange();
        // A clear spot: no unit on levels 0 and -1 within 6 cells of the block, searched outward from the player.
        const px = $gamePlayer.x, py = $gamePlayer.y, nearUnits = W.unitsInArea(area.x, area.y, 0).concat(W.unitsInArea(area.x, area.y, -1));
        let cx = -1, cy = -1;
        for (let r = 8; r <= 60 && cx < 0; r += 4) {
            for (const [dx, dy] of [[r, 0], [0, r], [-r, 0], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]]) {
                const x = px + dx, y = py + dy;
                if (x < 10 || y < 10 || x > size - 11 || y > size - 11) continue;
                if (nearUnits.some(u => Math.max(Math.abs(u.x - x), Math.abs(u.y - y)) <= 6)) continue;
                cx = x; cy = y; break;
            }
        }
        if (cx < 0) { cx = Math.max(10, Math.min(size - 11, px + 8)); cy = Math.max(10, Math.min(size - 11, py)); }
        const ref = (x, y, z) => ({ area, x, y, z });
        const STONE = ["stone", "stone", "stone", "stone", "stone"], AIR = ["air", "air", "air", "air", "air"], DECK = ["stone", "air", "air", "air", "air"];
        const paint = (x, y, z, m) => L.setStrata(ref(x, y, z), { m, hp: m.map(k => k === "stone" ? 255 : 0), connector: 0 }, { cause: "test" });
        const mats = (x, y, z) => { const s = L.strataAt(ref(x, y, z)); return s ? s.materials.join("/") : "null"; };

        let painted = 0, refused = [];
        const tPaint = performance.now();
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
            const x = cx + dx, y = cy + dy, r = Math.max(Math.abs(dx), Math.abs(dy));
            for (const z of [-1, 0, 1]) if (z >= zr.zMin && z <= zr.zMax) O.setIn({ x: area.x, y: area.y, z }, x, y, null);
            for (const u of W.unitsInArea(area.x, area.y, 0).concat(W.unitsInArea(area.x, area.y, -1))) {
                if (u.x === x && u.y === y && !(u.data && u.data.kind === "player")) W.removeUnit(u.id);
            }
            const plan = r <= 1
                ? [[-1, dx === 0 && dy === 0 ? STONE : DECK], [0, STONE], [1, AIR]]   // the cave, the pillar, the block
                : r === 2 ? [[-1, STONE], [0, AIR], [1, AIR]]                          // the trench round the block
                    : [[-1, STONE]];                                                   // rock round the cave
            for (const [z, m] of plan) {
                if (z < zr.zMin || z > zr.zMax) continue;
                if (paint(x, y, z, m)) painted++;
                else refused.push(`(${x},${y},${z}) ${L.lastRefusal() && L.lastRefusal().reason}`);
            }
        }
        const paintMs = performance.now() - tPaint;
        const unit = W.addUnit({ name: "TEST_cavein", image: { characterName: "People1", characterIndex: 2 }, area, z: -1, x: cx + 1, y: cy, exact: true,
            data: { kind: "test", hp: 20, maxHp: 20 } });
        const items = I.drop({ x: area.x, y: area.y, z: -1 }, cx - 1, cy, "stone", 2, null, { mat: "granite" });
        const item = items && items[0];
        t.check("scene_built", refused.length === 0 && painted > 0 && !!unit && unit.z === -1 && !!item && mats(cx, cy, 0) === STONE.join("/"),
            `${painted} cells written in ${paintMs.toFixed(0)} ms (UF.Levels.setStrata, ${(paintMs / Math.max(1, painted)).toFixed(1)} ms a cell), refused ${refused.slice(0, 3).join("; ") || "none"}; block at (${cx},${cy}); unit ${unit && unit.id} at z ${unit && unit.z}; item ${item && item.id}; z range ${zr.zMin}..${zr.zMax}`);

        // Run the clock fast so the shared tick turns (1 tick = 36 game seconds).
        if (UF.Time) { if (UF.Time.paused) UF.Time.resume(); UF.Time.setLevel(UF.Time.speeds.length - 1); }
        const drained = () => { const s = S.stats(); return s.queued === 0 && s.active === 0 && s.debt === 0; };
        const c0 = S.stats().commits;
        await t.waitUntil(drained, 40000, "the checks of the built scene").catch(() => {});
        const sHeld = S.stats();
        t.check("held_by_pillar", drained() && sHeld.commits === c0 && mats(cx, cy, 0) === STONE.join("/") && mats(cx + 1, cy + 1, 0) === STONE.join("/"),
            `queue ${sHeld.queued}, active ${sHeld.active}; commits ${c0} -> ${sHeld.commits}; held verdicts ${sHeld.verdicts.held}; ticks serviced ${sHeld.ticks}`);
        if (UF.Time) UF.Time.pause();
        // The camera follows the player: stand it 4 cells south of the block (natural ground, outside the painted ring).
        const look = async (z, label) => {
            if (L.view() !== z) {
                L.setView(z, { center: { x: cx, y: cy + 4 } });
                await t.waitUntil(() => settled() && L.view() === z, 20000, label).catch(() => {});
            }
            $gamePlayer.locate(cx, cy + 4);
            await t.waitFrames(20);
        };
        await look(0, "the ground");
        t.screenshot("before");
        await look(-1, "the cave level");
        t.screenshot("before_below");
        await look(0, "the ground again");

        // The cause: damage destroys the pillar's upper four strata. Nothing else is called.
        let fell = 0, fellCause = null;
        const onFell = p => { fell++; fellCause = p && p.cause; };
        UF.Events.on("structure:fell", onFell);
        // Time every event's listeners from here to the fall (the engine's write path is measured, not judged).
        const evMs = {}, realEmit = UF.Events.emit;
        UF.Events.emit = function(name, ...a) {
            const t0 = performance.now();
            try { return realEmit.call(this, name, ...a); } finally { const e = evMs[name] || (evMs[name] = { n: 0, ms: 0 }); e.n++; e.ms += performance.now() - t0; }
        };
        const dmg = L.applyVolumeDamage(area, cx, cy, -1, 1, cx, cy, -1, 4, 100000, "impact");
        if (UF.Time) UF.Time.resume();
        await t.waitUntil(() => S.stats().commits > sHeld.commits && drained(), 40000, "the fall").catch(() => {});
        if (UF.Time) UF.Time.pause();
        const sAfter = S.stats();
        const blockDown = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            blockDown.push(mats(cx + dx, cy + dy, -1) === STONE.join("/") && mats(cx + dx, cy + dy, 0) === DECK.join("/"));
        }
        t.check("cave_in_falls", blockDown.every(Boolean) && sAfter.commits - sHeld.commits === 1 && sAfter.lastFall && sAfter.lastFall.drop === 4,
            `destroyed ${dmg && dmg.strataDestroyed} strata; ${blockDown.filter(Boolean).length}/9 cells dropped; commits ${sHeld.commits} -> ${sAfter.commits}; ` +
            `last fall ${JSON.stringify(sAfter.lastFall)}; (cx,cy) z-1 ${mats(cx, cy, -1)} z0 ${mats(cx, cy, 0)}${sAfter.lastError ? "; error " + sAfter.lastError : ""}`);
        const d = unit && unit.data;
        t.check("unit_crushed", !!d && d.deathCause === "crushed" && (!W.unit(unit.id) || d.dead === true || d.hp <= 0),
            `deathCause ${d && d.deathCause}; in world ${!!(unit && W.unit(unit.id))}; dead ${d && d.dead}; hp ${d && d.hp}; crushed ${sAfter.crushed}`);
        const it = item ? I.get(item.id) : null;
        t.check("item_kept", !!it && it.count === 2 && L.standableShape(ref(it.x, it.y, it.z)),
            it ? `item at (${it.x},${it.y}) z ${it.z}, count ${it.count}, standable ${L.standableShape(ref(it.x, it.y, it.z))}` : "the item is gone");
        t.check("fell_event_once", fell === 1 && fellCause === "structural:fall", `structure:fell ${fell}, cause ${fellCause}`);
        UF.Events.off("structure:fell", onFell);
        UF.Events.emit = realEmit;
        const evTop = Object.keys(evMs).filter(k => k !== "time:minute").sort((a, b) => evMs[b].ms - evMs[a].ms).slice(0, 6)
            .map(k => `${k} ${evMs[k].n}x ${evMs[k].ms.toFixed(0)} ms`).join(", ");

        await look(0, "the ground");
        t.screenshot("after");
        await look(-1, "the cave level");
        t.screenshot("after_below");
        await look(0, "the ground again");
        const sEnd = S.stats();
        const own = sEnd.history.reduce((m, h) => Math.max(m, h.ms - (h.commitMs || 0)), 0);
        t.check("tick_cost_bounded", own <= 50, `slowest structure tick without its commit's writes ${own.toFixed(2)} ms (limit 50; last ${sEnd.history.length} serviced ticks); ` +
            `slowest tick with them ${sEnd.maxTickMs} ms; listeners during the fall: ${evTop}; the fall tick: ` +
            JSON.stringify(sEnd.history.filter(h => h.commits > 0).slice(-1)[0] || null) + `; serviced ticks ${sEnd.ticks}, reads ${sEnd.reads}`);

        console.error = realConsoleError;
        const errs = t.errorsSoFar().slice(errors0).concat(consoleErrors);
        t.check("no_errors", errs.length === 0, errs.slice(0, 4).join(" | ") || "none");
    }, { isDefault: false });
}

//-----------------------------------------------------------------------------
// Snapshot, run, results

function log(...a) { if (!flag("quiet")) console.log(...a); }

function makeSnapshot(tag, mutantName, seed) {
    const dir = path.join(os.tmpdir(), "deus_collapse_ingame", `${tag}_${process.pid}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const rc = spawnSync("robocopy", [path.join(ROOT, "game"), dir, "/E", "/NDL", "/NFL", "/NJH", "/NJS", "/NC", "/NS", "/NP", "/XD", "test_output", "save"], { stdio: "ignore" });
    if (rc.status === null || rc.status >= 8) throw new Error(`robocopy failed (${rc.status})`);
    if (!fs.existsSync(path.join(dir, "js", "plugins", "DEUS_Structural.js"))) throw new Error("DEUS_Structural.js is not in the snapshot");
    if (mutantName) {
        const m = MUTANTS[mutantName];
        const p = path.join(dir, "js", "plugins", m.file);
        const src = fs.readFileSync(p, "utf8");
        const n = src.split(m.from).length - 1;
        if (n !== 1) throw new Error(`mutant ${mutantName}: target occurs ${n} times in ${m.file}`);
        fs.writeFileSync(p, src.replace(m.from, () => m.to));
    }
    fs.writeFileSync(path.join(dir, "js", "plugins", `${PLUGIN}.js`),
        `// Test-only plugin written by tools/test_collapse_ingame.js into a snapshot copy. Never part of the game.\n(${suitePlugin.toString()})();\n`);
    const pj = path.join(dir, "js", "plugins.js");
    const text = fs.readFileSync(pj, "utf8").replace(/^﻿/, "");
    const plugins = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
    const world = plugins.find(p => p.name === "DEUS_World");
    if (!world) throw new Error("DEUS_World is not in plugins.js");
    world.parameters = Object.assign({}, world.parameters, { Seed: String(seed) });
    const testAt = plugins.findIndex(p => p.name === "DEUS_Test" && p.status);
    if (testAt < 0) throw new Error("DEUS_Test is not registered");
    if (!plugins.some(p => p.name === "DEUS_Structural")) {
        plugins.splice(testAt, 0, { name: "DEUS_Structural", status: true, description: "[DEUS Structural] snapshot registration by tools/test_collapse_ingame.js", parameters: {} });
    }
    plugins.push({ name: PLUGIN, status: true, description: "[test only] NAT.02.01.BRIDGE collapse suite", parameters: {} });
    fs.writeFileSync(pj, `// Generated by RPG Maker.\n// Do not edit this file directly.\nvar $plugins =\n[\n${plugins.map(p => JSON.stringify(p)).join(",\n")}\n];\n`);
    return dir;
}

function runSnapshot(dir) {
    const r = spawnSync(process.execPath, [path.join(ROOT, "tools", "run_tests.js"), SUITE, "--game", dir], { encoding: "utf8", timeout: 600000 });
    const resultsFile = path.join(dir, "test_output", "results.txt");
    const text = fs.existsSync(resultsFile) ? fs.readFileSync(resultsFile, "utf8") : "";
    const checks = {};
    for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^(PASS|FAIL) collapse_cave_in\.(\S+)/);
        if (m) checks[m[2]] = m[1] === "PASS";
    }
    const resultLine = (text.match(/^RESULT: .*$/m) || [""])[0];
    return { status: r.status, text, checks, resultLine, stderr: (r.stderr || "") + (r.stdout || "") };
}

function saveEvidence(dir, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const out = path.join(dir, "test_output");
    if (!fs.existsSync(out)) return [];
    const copied = [];
    for (const f of fs.readdirSync(out)) {
        if (f === "results.txt" || (f.startsWith(`${SUITE}.`) && f.endsWith(".png"))) {
            fs.copyFileSync(path.join(out, f), path.join(dest, f));
            copied.push(f);
        }
    }
    return copied;
}

function main() {
    const mutantName = arg("mutant", "");
    if (mutantName && !MUTANTS[mutantName]) {
        console.error(`unknown mutant "${mutantName}"; known: ${Object.keys(MUTANTS).join(", ")}`);
        process.exit(2);
    }
    const seed = Number(arg("seed", "18"));
    let dir;
    try { dir = makeSnapshot(mutantName ? `mutant_${mutantName}` : "tip", mutantName, seed); } catch (e) { console.error(`HARNESS: ${e.message}`); process.exit(2); }
    log(`running suite ${SUITE} on ${dir}${mutantName ? ` (mutant ${mutantName})` : ""}, seed ${seed}`);
    const t0 = Date.now();
    const r = runSnapshot(dir);
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    const evidence = arg("evidence", "");
    if (evidence) log(`evidence copied: ${saveEvidence(dir, path.resolve(evidence)).join(", ")}`);
    if (!flag("keep")) fs.rmSync(dir, { recursive: true, force: true });
    else log(`snapshot kept: ${dir}`);
    for (const line of r.text.split(/\r?\n/)) if (/^(PASS|FAIL|ERROR|HARNESS|RESULT|SHOT)/.test(line)) console.log(line);
    if (!r.resultLine) { console.error(`HARNESS: no RESULT line (run_tests exit ${r.status}) ${r.stderr.slice(0, 600)}`); process.exit(2); }
    const missing = CHECKS.filter(c => !(c in r.checks));
    const failed = CHECKS.filter(c => r.checks[c] === false);
    if (mutantName) {
        const want = MUTANTS[mutantName].check;
        const caught = r.checks[want] === false;
        console.log(`MUTANT ${mutantName}: ${caught ? "CAUGHT" : "NOT CAUGHT"} by ${want} (failing: ${failed.join(", ") || "none"}; ${secs} s)`);
        process.exit(1);
    }
    if (missing.length) { console.error(`HARNESS: checks that never ran: ${missing.join(", ")}`); process.exit(2); }
    console.log(`SUMMARY: ${CHECKS.length - failed.length}/${CHECKS.length} checks passed${failed.length ? `; failed: ${failed.join(", ")}` : ""}; ${secs} s`);
    process.exit(failed.length ? 1 : 0);
}

main();
