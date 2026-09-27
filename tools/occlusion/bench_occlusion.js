#!/usr/bin/env node
"use strict";

// WG.00.21. NW.js benchmark in a throwaway copy of game/ under %TEMP%.
// Solid viewport: a 32-layer world (DEUS_Z_RANGE=default) against the same
// scene at 5 layers (legacy). Open shaft: one dug column. The copy is deleted
// before this process exits.
//
// Counts are the acceptance. Milliseconds are one run on this machine.

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
        "// Disposable. Not part of the game.\n(" + runtimeBench.toString() + ")();\n");
    return dest;
}

function runtimeBench() {
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
        const sample = async n => {
            const frames = [];
            let prev = snap();
            for (let i = 0; i < n; i++) {
                await t.waitFrames(1);
                const now = snap();
                frames.push({
                    visits: now.visits, levels: now.levels, exposed: now.exposed, ms: now.ms,
                    paintDelta: now.paints - prev.paints, touchDelta: now.touches - prev.touches,
                    skippedDelta: now.skipped - prev.skipped, full: now.full
                });
                prev = now;
            }
            return frames;
        };
        const steady = await sample(8);
        const dx0 = $gameMap.displayX();
        $gameMap.scrollRight(3);
        const pan = await sample(8);
        const moved = ($gameMap.displayX() - dx0 + $gameMap.width()) % $gameMap.width();
        t.check("camera_panned", moved >= 2, "display moved " + moved);
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
        const img = { characterName: "People1", characterIndex: 0 };
        const place = (name, x, z) => W.addUnit({ name: name, image: img, area: { x: area.x, y: area.y }, x: x, y: cy, z: z, dir: 2, exact: true, data: { kind: "test", through: true } });
        const eu = W.isLevel(view - 1) ? place("OCC_EX", cx, view - 1) : null;
        const cu = W.isLevel(view - 1) ? place("OCC_CV", nx, view - 1) : null;
        let du = null;
        if (W.isLevel(view - 3)) du = place("OCC_DEEP", cx, view - 3);
        await t.waitFrames(3);
        const plane = root.planes.find(p => p.level && p.level.z === view - 1) || null;
        const has = (p, u) => !!(p && u && p._units && p._units.has(u.id));
        let deepSprite = false;
        if (du) for (let i = 0; i < root.planes.length; i++) if (has(root.planes[i], du)) deepSprite = true;
        const openSteady = await sample(6);
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
            frames: openSteady
        };
        t.check("open_exposed", openReport.exposedCell === true && openReport.exposedSprite === true, JSON.stringify({ cell: openReport.exposedCell, sprite: openReport.exposedSprite }));
        t.check("open_covered", openReport.coveredCell === false && openReport.coveredSprite === false, JSON.stringify({ cell: openReport.coveredCell, sprite: openReport.coveredSprite }));
        t.check("open_deep", !du || (openReport.deepExposed === false && deepSprite === false), JSON.stringify({ exposed: openReport.deepExposed, sprite: deepSprite }));
        t.check("no_full_scan", steady.every(f => f.full === 0) && pan.every(f => f.full === 0), "fullScans " + D.stats().occlusion.fullScans);
        const zero = (frames, key) => frames.every(f => f[key] === 0);
        t.check("solid_steady", zero(steady, "visits") && zero(steady, "levels") && zero(steady, "paintDelta") && zero(steady, "touchDelta"), "steady " + JSON.stringify(steady));
        t.check("solid_pan", zero(pan, "levels") && zero(pan, "paintDelta"), "pan " + JSON.stringify(pan));
        const report = {
            zRange: W.zRange(), levelCount: W.levelCount(), maxDepth: D.config.maxDepth, view: view,
            solid: { wrote: wrote, steady: steady, pan: pan, moved: moved },
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
    if (!run.bench) return { range: run.range, status: run.status, bench: false };
    const b = run.bench;
    const steadyMs = median(b.solid.steady.map(f => f.ms));
    const panMs = median(b.solid.pan.map(f => f.ms));
    const openMs = median(b.open.frames.map(f => f.ms));
    const sum = (frames, key) => frames.reduce((n, f) => n + (f[key] || 0), 0);
    return {
        range: run.range,
        levels: b.levelCount,
        z: b.zRange,
        maxDepth: b.maxDepth,
        steadyVisits: sum(b.solid.steady, "visits"),
        steadyLevels: sum(b.solid.steady, "levels"),
        steadyPaint: sum(b.solid.steady, "paintDelta"),
        steadyTouch: sum(b.solid.steady, "touchDelta"),
        steadyMs,
        panLevels: sum(b.solid.pan, "levels"),
        panPaint: sum(b.solid.pan, "paintDelta"),
        panVisits: sum(b.solid.pan, "visits"),
        panMs,
        openExposed: b.open.exposedCells,
        openMs,
        exposedSprite: b.open.exposedSprite,
        coveredSprite: b.open.coveredSprite,
        deepExposed: b.open.deepExposed,
        deepSprite: b.open.deepSprite
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
            && a.steadyVisits === 0 && b.steadyVisits === 0
            && a.steadyLevels === 0 && b.steadyLevels === 0
            && a.steadyPaint === 0 && b.steadyPaint === 0
            && a.steadyTouch === 0 && b.steadyTouch === 0
            && a.panLevels === 0 && b.panLevels === 0
            && a.panPaint === 0 && b.panPaint === 0
            && a.panVisits > 0 && b.panVisits > 0
            && Math.abs(a.panVisits - b.panVisits) <= Math.max(40, 0.15 * Math.max(a.panVisits, b.panVisits))
            && a.maxDepth === 2 && b.maxDepth === 2
            && a.levels === 5 && b.levels === 32
            && a.exposedSprite === true && a.coveredSprite === false
            && b.exposedSprite === true && b.coveredSprite === false
            && a.openExposed === b.openExposed
            && b.deepExposed === false && b.deepSprite === false;
        const ms = (x, y) => (x == null || y == null) ? null : Math.abs(x - y);
        const steadyGap = ms(a.steadyMs, b.steadyMs);
        const panGap = ms(a.panMs, b.panMs);
        // One run, shared machine. Identical counts are the bound. Milliseconds
        // are accepted within 2 ms or 100% of the smaller, whichever is larger.
        const msOk = (gap, x, y) => {
            if (gap == null) return false;
            const base = Math.max(0.001, Math.min(x, y));
            return gap <= 2 || gap <= base;
        };
        const timeOk = msOk(steadyGap, a.steadyMs, b.steadyMs) && msOk(panGap, a.panMs, b.panMs);
        console.log("COMPARE steadyMs " + a.steadyMs + " vs " + b.steadyMs + " gap " + steadyGap
            + "; panMs " + a.panMs + " vs " + b.panMs + " gap " + panGap
            + "; openExposed " + a.openExposed + " vs " + b.openExposed
            + "; counts " + (countsOk ? "equal" : "DIFFER") + "; time " + (timeOk ? "within tolerance" : "OUTSIDE"));
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
