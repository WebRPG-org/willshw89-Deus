#!/usr/bin/env node
"use strict";

// Same-seed, same-fixture base/tip comparison of the tile+plane frame and of
// exposed plane texels. Evidence is copied into the lane folder. The throwaway
// copies are deleted.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const GAME = path.join(ROOT, "game");
const RUN_TESTS = path.join(ROOT, "tools", "run_tests.js");
const BASE = "ecc7b8984a0ab1a919595c792f98a60f18872f73";
const EVIDENCE = path.join(ROOT, "tasks", "WG.00.21", "lane-be", "evidence");
const HEAVY = new Set(["img", "audio", "effects"]);

function isLink(p) {
    try {
        if (fs.lstatSync(p).isSymbolicLink()) return true;
        fs.readlinkSync(p);
        return true;
    } catch (e) { return false; }
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
function stageGame(root, depthSource) {
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
    if (depthSource) fs.writeFileSync(path.join(dest, "js", "plugins", "DEUS_Depth.js"), depthSource);
    const pluginsPath = path.join(dest, "js", "plugins.js");
    const context = {};
    require("vm").runInNewContext(fs.readFileSync(pluginsPath, "utf8"), context);
    const plugins = (context.$plugins || []).filter(p => p.name !== "TEST_OcclusionEqual");
    plugins.push({ name: "TEST_OcclusionEqual", status: true, description: "WG.00.21 base/tip frame", parameters: {} });
    fs.writeFileSync(pluginsPath, "var $plugins = " + JSON.stringify(plugins, null, 2) + ";\n");
    fs.writeFileSync(path.join(dest, "js", "plugins", "TEST_OcclusionEqual.js"),
        "// Disposable. Not part of the game.\n(" + installEqual.toString() + ")();\n");
    return dest;
}

function installEqual() {
    const prevBoot = Scene_Boot.prototype.startNormalGame;
    Scene_Boot.prototype.startNormalGame = function() {
        window.UF = window.UF || {};
        window.UF.NewGameSetup = Object.assign({}, window.UF.NewGameSetup, { seed: 20260927 });
        return prevBoot.apply(this, arguments);
    };
    UF.Test.suite("occlusion_equal", async t => {
        const FLOOR = ["stone", "air", "air", "air", "air"];
        const AIR = ["air", "air", "air", "air", "air"];
        const boot = await t.waitUntil(() => !!(window.UF && UF.World && UF.World.state && UF.Levels && UF.Depth && UF.Depth.root && UF.Depth.root() && window.$gameMap && SceneManager._scene instanceof Scene_Map), 120000, "the map and the planes").then(() => true, e => String(e && e.message || e));
        if (boot !== true) { t.check("boot", false, boot); return; }
        const W = UF.World, L = UF.Levels, D = UF.Depth;
        if (UF.Time && UF.Time.pause) UF.Time.pause();
        if (UF.Time && UF.Time.setForTest) UF.Time.setForTest(12, 0);
        const size = W.state.size | 0;
        const wrap = v => ((v % size) + size) % size;
        const center = { x: (size / 2 + 48) | 0, y: (size / 2 + 48) | 0 };
        L.setView(2, { center: center });
        const viewed = await t.waitUntil(() => !L.switching() && L.view() === 2, 30000, "view 2").then(() => true, e => String(e && e.message || e));
        if (viewed !== true) { t.check("boot", false, viewed); return; }
        await t.waitFrames(4);
        const area = { x: W.viewLevel().x, y: W.viewLevel().y };
        if (UF.Environment && UF.Environment.setWeather) UF.Environment.setWeather(area, "clear");
        if (window.$gameScreen) $gameScreen.changeWeather("none", 0, 0);
        Object.assign(D.config.entities, { objects: false, items: false, units: false, walls: false });
        D.touch();
        const paint = (x, y, z, m) => L.setStrata({ area: area, x: wrap(x), y: wrap(y), z: z }, { m: m, connector: "none" }, { cause: "occlusion equal" });
        const vz = 2;
        let refused = 0;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++) {
            const x = center.x + dx, y = center.y + dy;
            if (!paint(x, y, vz, FLOOR)) refused++;
            if (!paint(x, y, vz - 1, FLOOR)) refused++;
            if (!paint(x, y, vz - 2, FLOOR)) refused++;
        }
        const shaft = { x: center.x, y: center.y };
        const hole = { x: center.x + 1, y: center.y };
        if (!paint(shaft.x, shaft.y, vz, AIR) || !paint(shaft.x, shaft.y, vz - 1, AIR) || !paint(shaft.x, shaft.y, vz - 2, FLOOR)) refused++;
        if (!paint(hole.x, hole.y, vz, AIR) || !paint(hole.x, hole.y, vz - 1, FLOOR)) refused++;
        t.check("fixture", refused === 0 && W.state.seed === 20260927, "refused " + refused + " seed " + W.state.seed);
        if (refused) return;
        await t.waitFrames(6);
        const main = SceneManager._scene._spriteset._tilemap;
        const r = D.root();
        const hidden = [];
        for (const c of main.children) if (c !== main._lowerLayer && c !== main._upperLayer && c !== r && c.visible) { c.visible = false; hidden.push(c); }
        const frame = Bitmap.snap(main);
        for (const c of hidden) c.visible = true;
        function hashRect(bmp, x, y, w, h) {
            const d = bmp.context.getImageData(x, y, w, h).data;
            let acc = 2166136261;
            for (let i = 0; i < d.length; i += 4) {
                acc ^= d[i]; acc = Math.imul(acc, 16777619);
                acc ^= d[i + 1]; acc = Math.imul(acc, 16777619);
                acc ^= d[i + 2]; acc = Math.imul(acc, 16777619);
                acc ^= d[i + 3]; acc = Math.imul(acc, 16777619);
            }
            return { hash: acc >>> 0, x: x, y: y, w: w, h: h };
        }
        const cropX = Math.max(0, Math.round($gameMap.adjustX(center.x - 4) * 48));
        const cropY = Math.max(0, Math.round($gameMap.adjustY(center.y - 3) * 48));
        const cropW = Math.min(frame.width - cropX, Math.round(9 * 48));
        const cropH = Math.min(frame.height - cropY, Math.round(7 * 48));
        const crop = hashRect(frame, cropX, cropY, cropW, cropH);
        function texel(p, x, y) {
            if (!p) return null;
            const gx = Math.round(($gameMap.adjustX(x) + 0.5) * 48), gy = Math.round(($gameMap.adjustY(y) + 0.5) * 48);
            const s = p.scale.x || 1;
            const lx = Math.floor((gx + 0.5 - p.x) / s), ly = Math.floor((gy + 0.5 - p.y) / s);
            const lower = p._tilemap._lowerLayer.bitmap, upper = p._tilemap._upperLayer.bitmap;
            const ua = upper.getAlphaPixel(lx, ly);
            return { color: ua > 0 ? upper.getPixel(lx, ly) : lower.getPixel(lx, ly), alpha: ua > 0 ? ua : lower.getAlphaPixel(lx, ly) };
        }
        const p1 = r.planes.find(p => p.level && p.level.z === vz - 1) || null;
        const p2 = r.planes.find(p => p.level && p.level.z === vz - 2) || null;
        const exposed = [
            { name: "hole-floor", plane: p1, x: hole.x, y: hole.y },
            { name: "shaft-floor", plane: p2, x: shaft.x, y: shaft.y }
        ].map(s => ({ name: s.name, z: s.plane ? s.plane.level.z : null, x: s.x, y: s.y, texel: texel(s.plane, s.x, s.y) }));
        const fs = require("fs"), pathMod = require("path");
        const outDir = pathMod.join(nw.__dirname, "test_output");
        fs.mkdirSync(outDir, { recursive: true });
        const png = pathMod.join(outDir, "equal_frame.png");
        fs.writeFileSync(png, frame.canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, ""), "base64");
        const report = {
            seed: W.state.seed, center: center, frameHash: crop.hash, crop: crop,
            width: frame.width, height: frame.height, exposed: exposed, png: png
        };
        UF.Test.write("EQUAL " + JSON.stringify(report));
        t.check("frame_captured", report.frameHash > 0 && crop.w > 100 && crop.h > 100 && exposed.every(s => s.texel && s.texel.alpha === 255), "hash " + report.frameHash + " crop " + crop.w + "x" + crop.h + " " + exposed.map(s => s.name + " " + (s.texel ? s.texel.color + "/" + s.texel.alpha : "none")).join(", "));
    }, { isDefault: false });
}

function parseEqual(text) {
    const line = text.split(/\r?\n/).filter(l => l.indexOf("EQUAL ") >= 0).pop();
    if (!line) return null;
    return JSON.parse(line.slice(line.indexOf("EQUAL ") + 6));
}
function runOne(label, depthSource, root) {
    const dest = stageGame(path.join(root, label), depthSource);
    const env = Object.assign({}, process.env, { DEUS_TEST_YEAR: "0", DEUS_Z_RANGE: "legacy" });
    delete env.UF_TEST_PROVOKE;
    delete env.UF_OCCLUSION_PROVOKE;
    const child = spawnSync(process.execPath, [RUN_TESTS, "occlusion_equal", "--game", dest], {
        env: env, encoding: "utf8", timeout: 240000, cwd: ROOT, maxBuffer: 16 * 1024 * 1024
    });
    const text = (child.stdout || "") + "\n" + (child.stderr || "");
    return { label: label, status: child.status, text: text, equal: parseEqual(text), game: dest };
}

function main() {
    const shown = spawnSync("git", ["show", BASE + ":game/js/plugins/DEUS_Depth.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
    if (shown.status !== 0 || !shown.stdout) {
        console.error("HARNESS: could not read base DEUS_Depth.js");
        return 2;
    }
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "deus_occlusion_equal_"));
    fs.mkdirSync(EVIDENCE, { recursive: true });
    try {
        const base = runOne("base", shown.stdout, root);
        console.log("--- base exit " + base.status + " ---");
        process.stdout.write(base.text);
        const tip = runOne("tip", null, root);
        console.log("--- tip exit " + tip.status + " ---");
        process.stdout.write(tip.text);
        if (base.equal && base.equal.png && fs.existsSync(base.equal.png)) fs.copyFileSync(base.equal.png, path.join(EVIDENCE, "base_frame.png"));
        if (tip.equal && tip.equal.png && fs.existsSync(tip.equal.png)) fs.copyFileSync(tip.equal.png, path.join(EVIDENCE, "tip_frame.png"));
        const result = {
            base: base.equal, tip: tip.equal,
            frameEqual: !!(base.equal && tip.equal && base.equal.frameHash === tip.equal.frameHash),
            exposedEqual: false
        };
        if (base.equal && tip.equal) {
            result.exposedEqual = base.equal.exposed.length === tip.equal.exposed.length && base.equal.exposed.every((s, i) => {
                const o = tip.equal.exposed[i];
                return o && s.name === o.name && s.texel && o.texel && s.texel.color === o.texel.color && s.texel.alpha === o.texel.alpha;
            });
        }
        fs.writeFileSync(path.join(EVIDENCE, "equality.json"), JSON.stringify(result, null, 2));
        console.log("EQUAL_FRAME " + result.frameEqual + " EQUAL_EXPOSED " + result.exposedEqual);
        console.log("EVIDENCE " + EVIDENCE);
        if (base.status !== 0 || tip.status !== 0 || !result.frameEqual || !result.exposedEqual) return 1;
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
