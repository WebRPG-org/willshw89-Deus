#!/usr/bin/env node
"use strict";

// Production-path occlusion checks. One throwaway NW.js launch runs the real
// planes, sprites and tile paint. Planner unit tests stay in test_occlusion_culling.js.

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
    const plugins = (context.$plugins || []).filter(p => p.name !== "TEST_OcclusionLive" && p.name !== "DEUS_LayerOverlays");
    const overlay = { name: "DEUS_LayerOverlays", status: true, description: "WG.00.21 live occlusion", parameters: {} };
    const testAt = plugins.findIndex(p => p.name === "DEUS_Test");
    if (testAt >= 0) plugins.splice(testAt, 0, overlay);
    else plugins.push(overlay);
    plugins.push({ name: "TEST_OcclusionLive", status: true, description: "WG.00.21 disposable live occlusion", parameters: {} });
    fs.writeFileSync(pluginsPath, "var $plugins = " + JSON.stringify(plugins, null, 2) + ";\n");
    fs.writeFileSync(path.join(dest, "js", "plugins", "TEST_OcclusionLive.js"),
        "// Disposable. Not part of the game.\n(" + installLive.toString() + ")();\n");
    return dest;
}

function installLive() {
    const prevBoot = Scene_Boot.prototype.startNormalGame;
    Scene_Boot.prototype.startNormalGame = function() {
        window.UF = window.UF || {};
        window.UF.NewGameSetup = Object.assign({}, window.UF.NewGameSetup, { seed: 20260927 });
        return prevBoot.apply(this, arguments);
    };
    UF.Test.suite("occlusion_live", async t => {
        const STONE = ["stone", "stone", "stone", "stone", "stone"];
        const AIR = ["air", "air", "air", "air", "air"];
        const FLOOR = ["stone", "air", "air", "air", "air"];
        const boot = await t.waitUntil(() => !!(window.UF && UF.World && UF.World.state && UF.Levels && UF.Depth && UF.Depth.root && UF.Depth.root() && UF.Depth.occlusion && window.$gameMap && SceneManager._scene instanceof Scene_Map && UF.Culling && UF.Culling.bounds() && UF.Objects && UF.Items), 120000, "the map, depth, objects, items and culling").then(() => true, e => String(e && e.message || e));
        if (boot !== true) { t.check("boot", false, boot); return; }
        const W = UF.World, L = UF.Levels, D = UF.Depth, O = UF.Objects, I = UF.Items;
        if (UF.Time && UF.Time.pause) UF.Time.pause();
        if (UF.Time && UF.Time.setForTest) UF.Time.setForTest(12, 0);
        const size = W.state.size | 0;
        const wrap = v => ((v % size) + size) % size;
        const center = { x: (size / 2 + 48) | 0, y: (size / 2 + 48) | 0 };
        L.setView(2, { center: center });
        const viewed = await t.waitUntil(() => !L.switching() && L.view() === 2 && SceneManager._scene instanceof Scene_Map, 30000, "view 2").then(() => true, e => String(e && e.message || e));
        if (viewed !== true) { t.check("boot", false, viewed); return; }
        await t.waitFrames(4);
        const area = { x: W.viewLevel().x, y: W.viewLevel().y };
        if (UF.Environment && UF.Environment.setWeather) UF.Environment.setWeather(area, "clear");
        if (window.$gameScreen) $gameScreen.changeWeather("none", 0, 0);
        t.check("boot", D.config.maxDepth === 2 && L.view() === 2, "maxDepth " + D.config.maxDepth + " view " + L.view() + " seed " + W.state.seed + " center " + center.x + "," + center.y);
        const refOf = (x, y, z) => ({ area: { x: area.x, y: area.y }, x: wrap(x), y: wrap(y), z: z });
        const paint = (x, y, z, m, connector) => L.setStrata(refOf(x, y, z), { m: m, connector: connector || "none" }, { cause: "occlusion live" });
        const shape = (x, y, z) => L.shapeAt(refOf(x, y, z));
        const open = (x, y, z) => shape(x, y, z) === "open";
        const root = () => D.root();
        const planeZ = z => { const r = root(); return r ? r.planes.find(p => p.level && p.level.z === z) || null : null; };
        const view = () => L.view();
        function reached(x, y, z) {
            const vz = view();
            if (z >= vz || !open(x, y, vz)) return false;
            for (let d = 1; d <= D.config.maxDepth; d++) {
                const zz = vz - d;
                if (!W.isLevel(zz)) return false;
                if (zz === z) return true;
                if (!open(x, y, zz)) return false;
            }
            return false;
        }
        const b0 = UF.Culling.bounds();
        let refused = 0, wrote = 0;
        for (let y = Math.floor(b0.minY) - 2; y <= Math.floor(b0.maxY) + 2; y++) {
            for (let x = Math.floor(b0.minX) - 2; x <= Math.floor(b0.maxX) + 2; x++) {
                if (paint(x, y, view(), STONE)) wrote++;
                else refused++;
            }
        }
        const settled = await t.waitUntil(() => D.stats().occlusion.exposedCells === 0 && D.stats().occlusion.frameVisits === 0, 15000, "a covered viewport").then(() => true, () => false);
        t.check("viewport_covered", wrote > 0 && refused === 0 && settled, wrote + " solid, " + refused + " refused, exposed " + D.stats().occlusion.exposedCells);
        if (!(wrote > 0 && refused === 0 && settled)) return;
        const cx = wrap(Math.floor($gameMap.displayX() + $gameMap.screenTileX() / 2));
        const cy = wrap(Math.floor($gameMap.displayY() + $gameMap.screenTileY() / 2));
        const A = { x: cx, y: cy }, B = { x: wrap(cx + 1), y: cy }, Dcol = { x: cx, y: wrap(cy + 1) };
        const Ccol = { x: wrap(cx + 2), y: cy }, R = { x: wrap(cx + 1), y: wrap(cy + 1) };
        const vz = view();
        // A and D: open through view-1 onto a floor at view-2. B: floor at view-1. C: solid at the view.
        const carved = [];
        function carve(ok) { carved.push(ok); return ok; }
        carve(paint(A.x, A.y, vz, AIR));
        carve(paint(A.x, A.y, vz - 1, AIR));
        carve(paint(A.x, A.y, vz - 2, FLOOR));
        carve(paint(Dcol.x, Dcol.y, vz, AIR));
        carve(paint(Dcol.x, Dcol.y, vz - 1, AIR));
        carve(paint(Dcol.x, Dcol.y, vz - 2, FLOOR));
        carve(paint(B.x, B.y, vz, AIR));
        carve(paint(B.x, B.y, vz - 1, FLOOR));
        carve(paint(Ccol.x, Ccol.y, vz - 1, STONE));
        carve(paint(R.x, R.y, vz, AIR));
        carve(paint(R.x, R.y, vz - 1, AIR));
        carve(paint(R.x, R.y, vz - 2, FLOOR, "ramp"));
        const win = root().planes[0].entityWindow();
        const marginX = wrap(Math.floor(UF.Culling.bounds().maxX) + 1);
        const marginY = wrap(cy + 1);
        const inWin = (x, y) => root().planes[0].inEntityWindow(win, x, y, size);
        const marginInside = inWin(marginX, cy) && inWin(marginX, marginY);
        carve(paint(marginX, cy, vz, AIR));
        carve(paint(marginX, cy, vz - 1, FLOOR));
        if (carved.some(ok => !ok)) { t.check("fixture", false, "a fixture column was refused"); return; }
        for (const cell of [A, B, Dcol, Ccol, R, { x: marginX, y: cy }, { x: marginX, y: marginY }]) {
            for (let z = vz; z >= vz - 2; z--) if (O.setIn) O.setIn({ x: area.x, y: area.y, z: z }, wrap(cell.x), wrap(cell.y), null);
        }
        const types = O.types ? O.types() : [];
        const tree = types.find(tt => tt.image) || null;
        const exposedObj = tree ? !!O.setIn({ x: area.x, y: area.y, z: vz - 1 }, B.x, B.y, tree.id) : false;
        const coveredObj = tree ? !!O.setIn({ x: area.x, y: area.y, z: vz - 1 }, Ccol.x, Ccol.y, tree.id) : false;
        const exposedItem = I.create("stone", 2, { area: { x: area.x, y: area.y, z: vz - 2 }, x: A.x, y: A.y });
        const coveredItem = I.create("stone", 2, { area: { x: area.x, y: area.y, z: vz - 2 }, x: B.x, y: B.y });
        const keepItem = I.create("stone", 2, { area: { x: area.x, y: area.y, z: vz - 2 }, x: Dcol.x, y: Dcol.y });
        const img = { characterName: "People1", characterIndex: 0 };
        const sheet = ImageManager.loadCharacter("People1");
        const sheetReady = await t.waitUntil(() => sheet.isReady() || sheet.isError(), 20000, "People1").then(() => sheet.isReady(), () => false);
        if (!sheetReady) { t.check("boot", false, "People1 sheet did not load"); return; }
        const addU = (name, x, y, z) => W.addUnit({ name: name, image: img, area: { x: area.x, y: area.y }, x: x, y: y, z: z, dir: 2, exact: true, data: { kind: "test", through: true, hp: 6, maxHp: 10 } });
        await t.waitFrames(3);
        const alloc0 = D.stats().occlusion.allocs;
        const coveredUnit = addU("OCC_COVERED", Ccol.x, Ccol.y, vz - 1);
        const coveredDeep = addU("OCC_BURIED", B.x, B.y, vz - 2);
        await t.waitFrames(3);
        const allocAfterCovered = D.stats().occlusion.allocs;
        const exposedUnit = addU("OCC_EXPOSED", B.x, B.y, vz - 1);
        const deepUnit = addU("OCC_DEEP", A.x, A.y, vz - 2);
        const marginUnit = addU("OCC_MARGIN", marginX, cy, vz - 1);
        const marginCoveredUnit = addU("OCC_MARGIN_COVERED", marginX, marginY, vz - 1);
        await t.waitFrames(4);
        const p1 = planeZ(vz - 1), p2 = planeZ(vz - 2);
        const hasUnit = (p, u) => !!(p && u && p._units && p._units.get(u.id) && p._units.get(u.id).visible);
        const hasItem = (p, it) => !!(p && it && p._items && p._items.get(it.id) && p._items.get(it.id).visible);
        const objAt = (p, x, y) => {
            if (!p || !p._objectLayer || !p._objectLayer._byCell || !p.map) return null;
            return p._objectLayer._byCell.get(y * p.map.width + x) || null;
        };
        const wallAt = (p, x, y) => p && p._walls ? p._walls.get(x + "," + y) || null : null;
        const rampAt = (p, x, y) => p && p._walls ? p._walls.get("c:" + x + "," + y) || null : null;
        function texel(p, x, y) {
            const gx = Math.round(($gameMap.adjustX(x) + 0.5) * 48), gy = Math.round(($gameMap.adjustY(y) + 0.5) * 48);
            const s = p.scale.x || 1;
            const lx = Math.floor((gx + 0.5 - p.x) / s), ly = Math.floor((gy + 0.5 - p.y) / s);
            const lower = p._tilemap._lowerLayer.bitmap, upper = p._tilemap._upperLayer.bitmap;
            const ua = upper.getAlphaPixel(lx, ly), la = lower.getAlphaPixel(lx, ly);
            return ua > 0 ? ua : la;
        }
        function windowCells(tm) {
            const margin = tm._margin || 20;
            const w = tm.width + margin * 2, h = tm.height + margin * 2;
            return { cols: Math.ceil(w / tm.tileWidth) + 1, rows: Math.ceil(h / tm.tileHeight) + 1, sx: tm._lastStartX, sy: tm._lastStartY };
        }
        function oraclePaint(p) {
            const tm = p._tilemap, g = windowCells(tm);
            let n = 0;
            for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) {
                const mx = g.sx + x, my = g.sy + y;
                if (reached(mx, my, p.level.z) && !open(mx, my, p.level.z)) n++;
            }
            return n;
        }
        const r = root();
        const coveredBits = [];
        if (hasUnit(p1, coveredUnit)) coveredBits.push("covered unit");
        if (hasUnit(p2, coveredDeep) || hasUnit(p1, coveredDeep)) coveredBits.push("buried unit");
        if (coveredObj && objAt(p1, Ccol.x, Ccol.y)) coveredBits.push("covered object");
        if (hasItem(p2, coveredItem)) coveredBits.push("covered item");
        if (wallAt(p1, Ccol.x, Ccol.y)) coveredBits.push("covered cliff");
        if (hasUnit(p1, marginCoveredUnit)) coveredBits.push("covered margin unit");
        if (allocAfterCovered !== alloc0) coveredBits.push("alloc " + alloc0 + "->" + allocAfterCovered);
        const exposedBits = [];
        if (!hasUnit(p1, exposedUnit)) exposedBits.push("exposed unit");
        if (!hasUnit(p2, deepUnit)) exposedBits.push("deep exposed unit");
        if (exposedObj && !objAt(p1, B.x, B.y)) exposedBits.push("exposed object");
        if (!hasItem(p2, exposedItem)) exposedBits.push("exposed item");
        if (!hasItem(p2, keepItem)) exposedBits.push("second shaft item");
        if (!rampAt(p2, R.x, R.y)) exposedBits.push("exposed ramp");
        if (!hasUnit(p1, marginUnit)) exposedBits.push("open margin unit");
        const eu = exposedUnit && p1 ? p1._units.get(exposedUnit.id) : null;
        if (eu && (eu.scale.x !== 1 || eu.scale.y !== 1 || (eu.filters && eu.filters.length) || p1.alpha !== 1)) exposedBits.push("not 1:1");
        let effectBad = "";
        const bus = UF.LayerOverlays;
        if (!bus || typeof bus.noteSpells !== "function") effectBad = "LayerOverlays not live";
        else {
            bus.noteSpells([{ x: Ccol.x, y: Ccol.y, z: vz - 1 }, { x: B.x, y: B.y, z: vz - 1 }]);
            await t.waitFrames(2);
            const bag = p1 && p1._ufLayerOverlays;
            const slot = bag && exposedUnit ? bag.slots.get(exposedUnit.id) : null;
            const coveredSlot = bag && coveredUnit ? bag.slots.get(coveredUnit.id) : null;
            const spells = bag && bag.spellSprites ? bag.spellSprites.filter(s => s && s.visible) : [];
            if (!slot || !slot.fill || !slot.fill.visible) effectBad += " exposed bar missing";
            if (coveredSlot && coveredSlot.fill && coveredSlot.fill.visible) effectBad += " covered bar drawn";
            if (spells.length !== 1) effectBad += " spells " + spells.length;
        }
        const paintBad = [];
        if (p1 && p2) {
            p1._tilemap.refresh();
            p2._tilemap.refresh();
            await t.waitFrames(2);
            const a1 = oraclePaint(p1), a2 = oraclePaint(p2);
            if (p1._tilemap.lastPainted !== a1) paintBad.push("depth1 spots " + p1._tilemap.lastPainted + " want " + a1);
            if (p2._tilemap.lastPainted !== a2) paintBad.push("depth2 spots " + p2._tilemap.lastPainted + " want " + a2);
            if (!(p1._tilemap.lastPainted < p1._tilemap.lastWindow)) paintBad.push("depth1 painted the window");
            if (texel(p2, A.x, A.y) === 0) paintBad.push("exposed floor unpainted");
            if (texel(p2, B.x, B.y) !== 0) paintBad.push("covered floor painted");
            if (texel(p1, Ccol.x, Ccol.y) !== 0) paintBad.push("covered cliff cell painted");
        } else paintBad.push("planes missing");
        const marginExcluded = !!(r && !r.cellExposed(vz - 1, marginX, cy) && !r.cellExposed(vz - 1, marginX, marginY));
        t.check("covered_not_drawn", coveredBits.length === 0 && marginInside && marginExcluded, (coveredBits.join(", ") || "covered sprites absent") + "; margin (" + marginX + "," + cy + ")/(" + marginX + "," + marginY + ") inside window " + marginInside + " outside the camera walk " + marginExcluded);
        t.check("exposed_drawn", exposedBits.length === 0, exposedBits.join(", ") || "exposed unit, object, item and ramp are on the planes at 1:1");
        t.check("live_paint", paintBad.length === 0, paintBad.join("; ") || "paint spots match the exposed opaque cells");
        t.check("live_effects", effectBad === "", effectBad || "exposed bar and one spell; covered bar absent");
        const full0 = D.stats().occlusion.fullScans;
        let steadyVisits = 0, steadyPaint = 0;
        const paints0 = D.stats().paints;
        for (let i = 0; i < 3; i++) {
            await t.waitFrames(1);
            steadyVisits += D.stats().occlusion.frameVisits;
            steadyPaint += D.stats().paints - paints0;
        }
        t.check("no_full_scan", steadyVisits === 0 && D.stats().occlusion.fullScans === full0, "steady visits " + steadyVisits + " fullScans " + D.stats().occlusion.fullScans);
        const dx0 = $gameMap.displayX();
        paint(A.x, A.y, vz - 1, FLOOR);
        await t.waitFrames(3);
        const closed = !hasItem(planeZ(vz - 2), exposedItem) && hasItem(planeZ(vz - 2), keepItem) && $gameMap.displayX() === dx0;
        paint(A.x, A.y, vz - 1, AIR);
        await t.waitFrames(3);
        const reopened = hasItem(planeZ(vz - 2), exposedItem) && hasItem(planeZ(vz - 2), keepItem) && $gameMap.displayX() === dx0;
        t.check("cover_reopen", closed && reopened, "closed " + closed + " reopened " + reopened + " display " + dx0);
        async function mutant(name, broken) {
            D.occlusion.setProvoke(name);
            D.touch();
            if (root()) for (const p of root().planes) if (p.level && p.refresh) p.refresh();
            await t.waitFrames(3);
            const bad = broken();
            D.occlusion.setProvoke("");
            D.touch();
            if (root()) for (const p of root().planes) if (p.level && p.refresh) p.refresh();
            await t.waitFrames(3);
            return bad;
        }
        const caught = [];
        const mCover = await mutant("covered_not_drawn", () => hasUnit(planeZ(vz - 1), coveredUnit) || wallAt(planeZ(vz - 1), Ccol.x, Ccol.y));
        if (!mCover) caught.push("covered_not_drawn");
        const mExpose = await mutant("exposed_drawn", () => !hasUnit(planeZ(vz - 1), exposedUnit));
        if (!mExpose) caught.push("exposed_drawn");
        const mCost = await mutant("cost_proportional", () => {
            const p = planeZ(vz - 1);
            return !!(p && p._tilemap.lastWindow > 0 && p._tilemap.lastPainted > oraclePaint(p));
        });
        if (!mCost) caught.push("cost_proportional");
        const mScan = await mutant("no_full_scan", () => D.stats().occlusion.frameVisits > 1000);
        if (!mScan) caught.push("no_full_scan");
        D.occlusion.setProvoke("switch_and_pan");
        paint(A.x, A.y, vz - 1, FLOOR);
        await t.waitFrames(3);
        const mSwitch = hasItem(planeZ(vz - 2), exposedItem);
        D.occlusion.setProvoke("");
        await t.waitFrames(3);
        paint(A.x, A.y, vz - 1, AIR);
        await t.waitFrames(3);
        if (!mSwitch) caught.push("switch_and_pan");
        t.check("live_mutants", caught.length === 0 && hasItem(planeZ(vz - 2), exposedItem), caught.length ? "still held: " + caught.join(", ") : "each live guard failed its check when provoked");
        const beforePan = hasUnit(planeZ(vz - 1), exposedUnit);
        $gameMap.scrollRight(30);
        await t.waitFrames(4);
        const afterPan = hasUnit(planeZ(vz - 1), exposedUnit);
        L.setView(vz - 1, { center: { x: B.x, y: B.y } });
        await t.waitUntil(() => !L.switching() && L.view() === vz - 1, 30000, "view moved onto the unit").then(() => true, () => false);
        await t.waitFrames(3);
        const afterSwitch = !!planeZ(vz - 1) && planeZ(vz - 1)._units && exposedUnit && planeZ(vz - 1)._units.has(exposedUnit.id);
        t.check("switch_and_pan", beforePan && !afterPan && !afterSwitch, "before " + beforePan + " after pan " + afterPan + " after view " + afterSwitch);
    }, { isDefault: false });
}

function run() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "deus_occlusion_live_"));
    try {
        const dest = stageGame(root);
        const env = Object.assign({}, process.env, { DEUS_TEST_YEAR: "0", DEUS_Z_RANGE: "legacy" });
        delete env.UF_OCCLUSION_PROVOKE;
        delete env.UF_TEST_PROVOKE;
        const child = spawnSync(process.execPath, [RUN_TESTS, "occlusion_live", "--game", dest], {
            env: env, encoding: "utf8", timeout: 240000, cwd: ROOT, maxBuffer: 16 * 1024 * 1024
        });
        const text = (child.stdout || "") + (child.stderr || "");
        return { status: child.status, text: text, error: child.error ? String(child.error.message || child.error) : "" };
    } finally {
        removeTree(root);
    }
}

if (require.main === module) {
    const result = run();
    process.stdout.write(result.text || "");
    if (result.error) console.error(result.error);
    process.exit(result.status == null ? 2 : result.status);
}

module.exports = { run };
