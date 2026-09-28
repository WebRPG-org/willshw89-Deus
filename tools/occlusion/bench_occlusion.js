#!/usr/bin/env node
"use strict";

// WG.00.21. NW.js benchmark in a throwaway copy of game/ under %TEMP%.
// Solid viewport: a 32-layer world (DEUS_Z_RANGE=default) against the same
// scene at 5 layers (legacy). Open shaft: one dug column. The copy is deleted
// before this process exits.
//
// Counts are the acceptance. Frame time is a 30 s solid stress plus an 8 s open
// stress, fixed seed 20260927. lastUpdateMs is recorded and is not the acceptance.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const GAME = path.join(ROOT, "game");
const RUN_TESTS = path.join(ROOT, "tools", "run_tests.js");
const HEAVY = new Set(["img", "audio", "effects"]);

function isLink(p) {
    try {
        if (fs.lstatSync(p).isSymbolicLink()) return true;
        fs.readlinkSync(p);
        return true;
    } catch (e) {
        return false;
    }
}
function removeTree(dir) {
    if (!fs.existsSync(dir)) return;
    if (isLink(dir)) { fs.unlinkSync(dir); return; }
    for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        if (isLink(p)) fs.unlinkSync(p);
        else if (fs.statSync(p).isDirectory()) removeTree(p);
        else fs.rmSync(p, { force: true });
    }
    fs.rmdirSync(dir);
}
function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        if (entry.name === "save" || entry.name === "test_output" || entry.name === "node_modules") continue;
        const from = path.join(src, entry.name);
        const to = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDir(from, to);
        else fs.copyFileSync(from, to);
    }
}
function stageGame(root) {
    const dest = path.join(root, "game");
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(GAME, { withFileTypes: true })) {
        if (entry.name === "save" || entry.name === "test_output" || entry.name === "node_modules") continue;
        const from = path.join(GAME, entry.name);
        const to = path.join(dest, entry.name);
        if (entry.isDirectory() && HEAVY.has(entry.name)) fs.symlinkSync(from, to, "junction");
        else if (entry.isDirectory()) copyDir(from, to);
        else fs.copyFileSync(from, to);
    }
    const pluginsPath = path.join(dest, "js", "plugins.js");
    const context = {};
    require("vm").runInNewContext(fs.readFileSync(pluginsPath, "utf8"), context);
    const plugins = (context.$plugins || []).filter(p => p.name !== "TEST_OcclusionBench");
    plugins.push({ name: "TEST_OcclusionBench", status: true, description: "WG.00.21 disposable bench", parameters: {} });
    fs.writeFileSync(pluginsPath, "var $plugins = " + JSON.stringify(plugins, null, 2) + ";\n");
    fs.writeFileSync(path.join(dest, "js", "plugins", "TEST_OcclusionBench.js"),
        "// Disposable. Not part of the game.\n(" + installBench.toString() + ")();\n");
    return dest;
}

function installBench() {
    const prevBoot = Scene_Boot.prototype.startNormalGame;
    Scene_Boot.prototype.startNormalGame = function() {
        window.UF = window.UF || {};
        window.UF.NewGameSetup = Object.assign({}, window.UF.NewGameSetup, { seed: 20260927 });
        return prevBoot.apply(this, arguments);
    };
    UF.Test.suite("occlusion_bench", async t => {
        const STONE = ["stone", "stone", "stone", "stone", "stone"];
        const AIR = ["air", "air", "air", "air", "air"];
        const FLOOR = ["stone", "air", "air", "air", "air"];
        const boot = await t.waitUntil(() => !!(window.UF && UF.World && UF.World.state && UF.Levels && UF.Depth && UF.Depth.root && UF.Depth.root() && window.$gameMap && SceneManager._scene instanceof Scene_Map && UF.Culling && UF.Culling.bounds()), 120000, "the map, depth and culling").then(() => true, e => String(e && e.message || e));
        if (boot !== true) { t.check("boot", false, boot); return; }
        const W = UF.World, L = UF.Levels, D = UF.Depth;
        const area = W.viewLevel();
        const view = L.view();
        if (UF.Time && UF.Time.pause) UF.Time.pause();
        if (UF.Time && UF.Time.setForTest) UF.Time.setForTest(12, 0);
        if (UF.Environment && UF.Environment.setWeather) UF.Environment.setWeather({ x: area.x, y: area.y }, "clear");
        t.check("boot", D.config.maxDepth === 2 && !!area, "maxDepth " + D.config.maxDepth + " view " + view + " range " + JSON.stringify(W.zRange()) + " levels " + W.levelCount());
        const size = W.state.size | 0;
        const wrap = v => ((v % size) + size) % size;
        const paint = (x, y, z, m) => L.setStrata({ area: { x: area.x, y: area.y }, x: x, y: y, z: z }, { m: m, connector: "none" }, { cause: "occlusion bench" });
        const b0 = UF.Culling.bounds();
        let wrote = 0, refused = 0;
        for (let y = Math.floor(b0.minY) - 5; y <= Math.floor(b0.maxY) + 5; y++) {
            for (let x = Math.floor(b0.minX) - 5; x <= Math.floor(b0.maxX) + 5; x++) {
                if (paint(wrap(x), wrap(y), view, STONE)) wrote++;
                else refused++;
            }
        }
        t.check("solid_written", wrote > 0 && refused === 0, wrote + " solid cells, " + refused + " refused");
        const settled = await t.waitUntil(() => D.stats().occlusion.exposedCells === 0 && D.stats().occlusion.frameVisits === 0, 15000, "a solid viewport").then(() => true, () => false);
        t.check("solid_settled", settled, "exposed " + D.stats().occlusion.exposedCells + " visits " + D.stats().occlusion.frameVisits);
        const snap = () => {
            const s = D.stats(), o = s.occlusion;
            return { paints: s.paints, touches: o.spriteTouches, visits: o.frameVisits, levels: o.frameLevelVisits, exposed: o.exposedCells, ms: s.lastUpdateMs, full: o.fullScans, skipped: o.skippedPaints };
        };
        const visibleNow = () => {
            const r = D.root();
            let n = 0;
            if (!r) return 0;
            for (let i = 0; i < r.planes.length; i++) {
                const p = r.planes[i];
                if (!p.level) continue;
                n += p._units.size + p._items.size + p._walls.size;
                if (p._objectLayer && p._objectLayer.count) n += p._objectLayer.count();
            }
            return n;
        };
        function pack(frames) {
            const gaps = [], ticks = [], updates = [];
            let visits = 0, levels = 0, paint = 0, touch = 0, full = 0;
            for (let i = 0; i < frames.length; i++) {
                const f = frames[i];
                if (Number.isFinite(f.gap)) gaps.push(f.gap);
                if (Number.isFinite(f.tick)) ticks.push(f.tick);
                if (Number.isFinite(f.ms)) updates.push(f.ms);
                visits += f.visits || 0; levels += f.levels || 0; paint += f.paintDelta || 0; touch += f.touchDelta || 0;
                if (f.full) full = f.full;
            }
            const asc = a => a.slice().sort((x, y) => x - y);
            const mid = a => { const s = asc(a); return s.length ? s[Math.floor(s.length / 2)] : null; };
            const avg = a => a.length ? a.reduce((n, v) => n + v, 0) / a.length : null;
            const worst = a => a.length ? Math.max.apply(null, a) : null;
            return {
                n: frames.length, gapAvg: avg(gaps), gapMedian: mid(gaps), gapWorst: worst(gaps),
                tickAvg: avg(ticks), tickMedian: mid(ticks), tickWorst: worst(ticks),
                updateMsMedian: mid(updates), visits: visits, levels: levels, paint: paint, touch: touch, full: full,
                visible: visibleNow(), exposed: D.stats().occlusion.exposedCells
            };
        }
        const sample = async n => {
            const frames = [];
            let prev = snap();
            let prevT = performance.now();
            for (let i = 0; i < n; i++) {
                await t.waitFrames(1);
                const nowT = performance.now();
                const now = snap();
                frames.push({
                    visits: now.visits, levels: now.levels, exposed: now.exposed, ms: now.ms, gap: nowT - prevT,
                    tick: Graphics._fpsCounter && Number.isFinite(Graphics._fpsCounter.duration) ? Graphics._fpsCounter.duration : null,
                    paintDelta: now.paints - prev.paints, touchDelta: now.touches - prev.touches, full: now.full
                });
                prev = now; prevT = nowT;
            }
            return frames;
        };
        const stressFor = async ms => {
            const frames = [];
            const end = performance.now() + ms;
            let prev = snap();
            let prevT = performance.now();
            while (performance.now() < end) {
                await t.waitFrames(1);
                const nowT = performance.now();
                const now = snap();
                frames.push({
                    visits: now.visits, levels: now.levels, ms: now.ms, gap: nowT - prevT,
                    tick: Graphics._fpsCounter && Number.isFinite(Graphics._fpsCounter.duration) ? Graphics._fpsCounter.duration : null,
                    paintDelta: now.paints - prev.paints, touchDelta: now.touches - prev.touches, full: now.full
                });
                prev = now; prevT = nowT;
            }
            return pack(frames);
        };
        const solidStress = await stressFor(30000);
        const dx0 = $gameMap.displayX();
        $gameMap.scrollRight(3);
        const pan = await sample(8);
        const moved = ($gameMap.displayX() - dx0 + $gameMap.width()) % $gameMap.width();
        t.check("camera_panned", moved >= 2, "display moved " + moved);
        const panHit = pan.reduce((a, f) => (f.visits > a.visits ? f : a), pan[0]);
        const cx = wrap(Math.floor($gameMap.displayX() + $gameMap.screenTileX() / 2));
        const cy = wrap(Math.floor($gameMap.displayY() + $gameMap.screenTileY() / 2));
        const nx = wrap(cx + 1);
        const hole = [];
        hole.push(paint(cx, cy, view, AIR));
        if (W.isLevel(view - 1)) hole.push(paint(cx, cy, view - 1, AIR));
        if (W.isLevel(view - 2)) hole.push(paint(cx, cy, view - 2, FLOOR));
        if (W.isLevel(view - 1)) hole.push(paint(nx, cy, view - 1, FLOOR));
        await t.waitFrames(4);
        const root = D.root();
        if (window.UF.Objects && UF.Objects.setIn) {
            for (let z = view; z >= view - 2; z--) if (W.isLevel(z)) {
                UF.Objects.setIn({ x: area.x, y: area.y, z: z }, cx, cy, null);
                UF.Objects.setIn({ x: area.x, y: area.y, z: z }, nx, cy, null);
            }
        }
        const img = { characterName: "People1", characterIndex: 0 };
        const place = (name, x, z) => W.addUnit({ name: name, image: img, area: { x: area.x, y: area.y }, x: x, y: cy, z: z, dir: 2, exact: true, data: { kind: "test", through: true } });
        const eu = W.isLevel(view - 1) ? place("OCC_EX", cx, view - 1) : null;
        const cu = W.isLevel(view - 1) ? place("OCC_CV", nx, view - 1) : null;
        let du = null;
        if (W.isLevel(view - 3)) du = place("OCC_DEEP", cx, view - 3);
        await t.waitFrames(3);
        for (const p of root.planes) if (p.level && p._tilemap) p._tilemap.refresh();
        await t.waitFrames(2);
        const plane = root.planes.find(p => p.level && p.level.z === view - 1) || null;
        const has = (p, u) => !!(p && u && p._units && p._units.has(u.id));
        let deepSprite = false;
        if (du) for (let i = 0; i < root.planes.length; i++) if (has(root.planes[i], du)) deepSprite = true;
        let spots = 0, windowCells = 0;
        for (let i = 0; i < root.planes.length; i++) {
            const tm = root.planes[i].level && root.planes[i]._tilemap;
            if (!tm) continue;
            spots += tm.lastPainted || 0;
            windowCells += tm.lastWindow || 0;
        }
        const openStress = await stressFor(8000);
        const openReport = {
            holeOk: hole.every(Boolean),
            exposedCell: W.isLevel(view - 1) ? root.cellExposed(view - 1, cx, cy) : null,
            coveredCell: W.isLevel(view - 1) ? root.cellExposed(view - 1, nx, cy) : null,
            exposedSprite: has(plane, eu),
            coveredSprite: has(plane, cu),
            deepLevel: W.isLevel(view - 3),
            deepExposed: du ? root.cellExposed(view - 3, cx, cy) : null,
            deepSprite: deepSprite,
            exposedCells: D.stats().occlusion.exposedCells,
            spots: spots, windowCells: windowCells, visible: visibleNow(),
            stress: openStress
        };
        t.check("open_exposed", openReport.exposedCell === true && openReport.exposedSprite === true, JSON.stringify({ cell: openReport.exposedCell, sprite: openReport.exposedSprite }));
        t.check("open_covered", openReport.coveredCell === false && openReport.coveredSprite === false, JSON.stringify({ cell: openReport.coveredCell, sprite: openReport.coveredSprite }));
        t.check("open_deep", !du || (openReport.deepExposed === false && deepSprite === false), JSON.stringify({ exposed: openReport.deepExposed, sprite: deepSprite }));
        t.check("open_paint", spots > 0 && spots < windowCells, "spots " + spots + " window " + windowCells + " visible " + openReport.visible);
        t.check("no_full_scan", solidStress.full === 0 && solidStress.visits === 0 && pan.every(f => f.full === 0), "fullScans " + D.stats().occlusion.fullScans + " solid visits " + solidStress.visits);
        t.check("solid_steady", solidStress.visits === 0 && solidStress.levels === 0 && solidStress.paint === 0 && solidStress.touch === 0 && solidStress.visible === 0 && solidStress.n >= 100, "solid " + JSON.stringify(solidStress));
        t.check("solid_pan", pan.every(f => f.levels === 0 && f.paintDelta === 0) && panHit.visits > 0, "pan hit visits " + panHit.visits + " levels " + panHit.levels);
        const report = {
            seed: W.state.seed, zRange: W.zRange(), levelCount: W.levelCount(), maxDepth: D.config.maxDepth, view: view,
            solid: { wrote: wrote, stress: solidStress, panVisits: panHit.visits, panLevels: panHit.levels, panPaint: panHit.paintDelta, moved: moved },
            open: openReport
        };
        UF.Test.write("BENCH " + JSON.stringify(report));
    }, { isDefault: false });
}

function median(nums) {
    const s = nums.filter(n => Number.isFinite(n)).sort((a, b) => a - b);
    if (!s.length) return null;
    return s[Math.floor(s.length / 2)];
}
function parseBench(text) {
    const line = text.split(/\r?\n/).filter(l => l.indexOf("BENCH ") >= 0).pop();
    if (!line) return null;
    return JSON.parse(line.slice(line.indexOf("BENCH ") + 6));
}
function runRange(range, root) {
    const dest = stageGame(root);
    const env = Object.assign({}, process.env, { DEUS_Z_RANGE: range, DEUS_TEST_YEAR: "0" });
    const started = Date.now();
    const child = spawnSync(process.execPath, [RUN_TESTS, "occlusion_bench", "--game", dest], {
        env, encoding: "utf8", timeout: 260000, cwd: ROOT, maxBuffer: 16 * 1024 * 1024
    });
    const text = (child.stdout || "") + "\n" + (child.stderr || "");
    return { range, status: child.status, ms: Date.now() - started, text, bench: parseBench(text), error: child.error ? String(child.error.message || child.error) : "" };
}

function summarise(run) {
    if (!run.bench || !run.bench.solid || !run.bench.solid.stress) return { range: run.range, status: run.status, bench: false };
    const b = run.bench, s = b.solid.stress, o = b.open.stress || {};
    return {
        range: run.range, seed: b.seed, levels: b.levelCount, z: b.zRange, maxDepth: b.maxDepth,
        steadyVisits: s.visits, steadyLevels: s.levels, steadyPaint: s.paint, steadyTouch: s.touch,
        steadyN: s.n, steadyVisible: s.visible,
        gapMedian: s.gapMedian, gapAvg: s.gapAvg, gapWorst: s.gapWorst,
        tickMedian: s.tickMedian, tickAvg: s.tickAvg, tickWorst: s.tickWorst,
        updateMsMedian: s.updateMsMedian,
        panLevels: b.solid.panLevels, panPaint: b.solid.panPaint, panVisits: b.solid.panVisits,
        openExposed: b.open.exposedCells, openSpots: b.open.spots, openWindow: b.open.windowCells,
        openVisible: b.open.visible, openGapMedian: o.gapMedian, openGapAvg: o.gapAvg, openGapWorst: o.gapWorst,
        exposedSprite: b.open.exposedSprite, coveredSprite: b.open.coveredSprite,
        deepExposed: b.open.deepExposed, deepSprite: b.open.deepSprite
    };
}

function main() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "deus_occlusion_"));
    console.log("CLONE " + root);
    try {
        const legacyRoot = path.join(root, "legacy");
        const defRoot = path.join(root, "default");
        fs.mkdirSync(legacyRoot);
        fs.mkdirSync(defRoot);
        const legacy = runRange("legacy", legacyRoot);
        console.log("--- legacy exit " + legacy.status + " (" + (legacy.ms / 1000).toFixed(1) + " s) ---");
        process.stdout.write(legacy.text);
        const def = runRange("default", defRoot);
        console.log("--- default exit " + def.status + " (" + (def.ms / 1000).toFixed(1) + " s) ---");
        process.stdout.write(def.text);
        const a = summarise(legacy);
        const b = summarise(def);
        console.log("SUMMARY legacy " + JSON.stringify(a));
        console.log("SUMMARY default " + JSON.stringify(b));
        const countsOk = legacy.status === 0 && def.status === 0 && a.bench !== false && b.bench !== false
            && a.seed === 20260927 && b.seed === 20260927
            && a.steadyVisits === 0 && b.steadyVisits === 0
            && a.steadyLevels === 0 && b.steadyLevels === 0
            && a.steadyPaint === 0 && b.steadyPaint === 0
            && a.steadyTouch === 0 && b.steadyTouch === 0
            && a.steadyVisible === 0 && b.steadyVisible === 0
            && a.steadyN >= 100 && b.steadyN >= 100
            && a.panLevels === 0 && b.panLevels === 0
            && a.panPaint === 0 && b.panPaint === 0
            && a.panVisits > 0 && b.panVisits > 0
            && Math.abs(a.panVisits - b.panVisits) <= Math.max(40, 0.15 * Math.max(a.panVisits, b.panVisits))
            && a.maxDepth === 2 && b.maxDepth === 2
            && a.levels === 5 && b.levels === 32
            && a.exposedSprite === true && a.coveredSprite === false
            && b.exposedSprite === true && b.coveredSprite === false
            && a.openExposed === b.openExposed
            && a.openSpots === b.openSpots && a.openSpots > 0 && a.openSpots < a.openWindow
            && a.openVisible === b.openVisible
            && b.deepExposed === false && b.deepSprite === false;
        const gapOf = (x, y) => (x == null || y == null) ? null : Math.abs(x - y);
        // Frame intervals are about 16 ms. Two launches on a shared machine may differ by a few
        // milliseconds. 20% of the smaller median, or 3 ms, is the room for that noise. It does
        // not accept a large relative change of a sub-millisecond depth-update sample. lastUpdateMs
        // is recorded and is not the acceptance.
        const frameOk = (x, y) => {
            const gap = gapOf(x, y);
            if (gap == null || !(x > 0) || !(y > 0)) return false;
            return gap <= Math.max(3, 0.20 * Math.min(x, y));
        };
        const worstOk = (x, y) => {
            const gap = gapOf(x, y);
            if (gap == null) return false;
            return gap <= Math.max(20, 0.50 * Math.min(x, y));
        };
        const timeOk = frameOk(a.gapMedian, b.gapMedian) && frameOk(a.gapAvg, b.gapAvg)
            && frameOk(a.openGapMedian, b.openGapMedian) && worstOk(a.gapWorst, b.gapWorst);
        console.log("COMPARE gapMedian " + a.gapMedian + " vs " + b.gapMedian
            + " avg " + a.gapAvg + " vs " + b.gapAvg
            + " worst " + a.gapWorst + " vs " + b.gapWorst
            + "; openGap " + a.openGapMedian + " vs " + b.openGapMedian
            + "; spots " + a.openSpots + " vs " + b.openSpots
            + " visible " + a.openVisible + " vs " + b.openVisible
            + "; updateMs " + a.updateMsMedian + " vs " + b.updateMsMedian + " (not the acceptance)"
            + "; counts " + (countsOk ? "equal" : "DIFFER") + "; frame time " + (timeOk ? "within tolerance" : "OUTSIDE"));
        if (!countsOk || !timeOk) return 1;
        return 0;
    } finally {
        removeTree(root);
        console.log("REMOVED " + root);
    }
}

if (require.main === module) {
    try { process.exitCode = main(); }
    catch (e) { console.error("HARNESS: " + (e && e.stack || e)); process.exitCode = 2; }
}
