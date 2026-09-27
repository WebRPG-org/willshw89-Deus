// Gate for DEUS-TSK-DEPTH-DEMO. Headless. Each check passes on the real module
// and fails on a mutant of that check. A mutant that still passes means the check was weakened.
"use strict";

const fs = require("fs");
const path = require("path");
const Cues = require("../../game/js/plugins/DEUS_DepthCues.js");
const Demo = require("../../game/js/plugins/DEUS_DepthDemo.js");

const root = path.join(__dirname, "..", "..");
const dataPath = path.join(root, "game", "data", "DEUS_DepthDemo.json");
const json = JSON.parse(fs.readFileSync(dataPath, "utf8"));

let passed = 0;
let failed = 0;
let killed = 0;
const lines = [];

function check(name, goodFn, mutantFn) {
    let good = false;
    let mutant = true;
    let err = "";
    try {
        good = goodFn() === true;
    } catch (e) {
        good = false;
        err = e.message || String(e);
    }
    try {
        mutant = mutantFn() === true;
    } catch (e) {
        mutant = true;
        err += " mutant threw " + (e.message || e);
    }
    if (good && mutant === false) {
        passed++;
        killed++;
        lines.push("PASS " + name);
        lines.push("KILLED " + name);
    } else {
        failed++;
        lines.push("FAIL " + name + " good=" + good + " mutantStillPassed=" + mutant + (err ? " " + err : ""));
    }
}

function torchScene(surfaceZ) {
    const width = 16;
    const height = 12;
    const columns = [];
    const z = surfaceZ === undefined ? 0 : surfaceZ;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            columns.push({ x: x, y: y, surfaceZ: z, quarter: 4, material: "stone", color: [96, 140, 72] });
        }
    }
    return {
        id: "torch",
        viewZ: 0,
        width: width,
        height: height,
        columns: columns,
        units: [],
        spells: [],
        selection: [],
        lights: [{ id: "torch", kind: "torch", x: 2, y: 2, z: 0, brightPx: 192, dimPx: 192 }],
        phase: "day",
        weather: "none",
        cutaway: []
    };
}

function dimOf(px, py, steps) {
    if (steps === 2) return ((px + py) & 1) + 1;
    return ((px + 2 * py) % 3) + 1;
}

check("defaults_all_off", function () {
    return defaultsOff(Cues);
}, function () {
    const mutant = Object.assign({}, Cues, {
        defaultState: function () {
            const state = Cues.defaultState();
            state.toggles.paletteShift = true;
            return state;
        }
    });
    return defaultsOff(mutant);
});

function defaultsOff(mod) {
    const state = mod.defaultState();
    if (!mod.isDefaultState(state)) return false;
    if (state.scale !== 1 || state.lightMode !== "off" || state.blur !== false) return false;
    if (state.dayLengthMinutes !== null || state.dimSteps !== 0) return false;
    if (state.cameraX !== 0 || state.cameraY !== 0) return false;
    for (let i = 0; i < mod.TOGGLE_NAMES.length; i++) {
        if (state.toggles[mod.TOGGLE_NAMES[i]] !== false) return false;
    }
    return true;
}

check("each_toggle_on_off", function () {
    return eachToggle(Cues);
}, function () {
    return eachToggle(Object.assign({}, Cues, {
        setToggle: function (state, name, on) {
            if (!Object.prototype.hasOwnProperty.call(state.toggles, name)) return { ok: false, reason: "unknown-toggle" };
            return { ok: true };
        }
    }));
});

function eachToggle(mod) {
    const state = mod.defaultState();
    for (let i = 0; i < mod.TOGGLE_NAMES.length; i++) {
        const name = mod.TOGGLE_NAMES[i];
        if (state.toggles[name] !== false) return false;
        if (!mod.setToggle(state, name, true).ok || state.toggles[name] !== true) return false;
        if (!mod.setToggle(state, name, false).ok || state.toggles[name] !== false) return false;
    }
    if (mod.setToggle(state, "no-such", true).ok) return false;
    return true;
}

check("integer_scale_only", function () {
    return integerScale(Cues);
}, function () {
    return integerScale(Object.assign({}, Cues, {
        setScale: function (state, scale) {
            state.scale = scale;
            return { ok: true };
        }
    }));
});

function integerScale(mod) {
    const state = mod.defaultState();
    if (state.scale !== 1) return false;
    const bad = [0, 4, 1.5, -1, 2.5, NaN];
    for (let i = 0; i < bad.length; i++) {
        if (mod.setScale(state, bad[i]).ok) return false;
        if (state.scale !== 1) return false;
    }
    if (!mod.setScale(state, 2).ok || state.scale !== 2) return false;
    if (!mod.setScale(state, 3).ok || state.scale !== 3) return false;
    if (!mod.setScale(state, 1).ok || state.scale !== 1) return false;
    const a = mod.scaleSample(0, 0, 2);
    const b = mod.scaleSample(1, 1, 2);
    const c = mod.scaleSample(2, 3, 2);
    if (!a || a.x !== 0 || a.y !== 0) return false;
    if (!b || b.x !== 0 || b.y !== 0) return false;
    if (!c || c.x !== 1 || c.y !== 1) return false;
    if (mod.scaleSample(1.5, 0, 2) !== null) return false;
    const src = new Uint8Array([1, 2, 3, 4]);
    const exp = mod.nearestExpand(src, 2, 2, 2);
    const expect = [1, 1, 2, 2, 1, 1, 2, 2, 3, 3, 4, 4, 3, 3, 4, 4];
    if (!exp || exp.length !== 16) return false;
    for (let i = 0; i < 16; i++) if (exp[i] !== expect[i]) return false;
    if (mod.nearestExpand(src, 2, 2, 1.5) !== null) return false;
    return true;
}

check("blur_rejected", function () {
    return blurRejected(Cues);
}, function () {
    return blurRejected(Object.assign({}, Cues, {
        setBlur: function (state, on) {
            state.blur = on === true;
            return { ok: true };
        }
    }));
});

function blurRejected(mod) {
    const state = mod.defaultState();
    if (state.blur !== false) return false;
    if (mod.setBlur(state, true).ok || state.blur !== false) return false;
    if (!mod.setBlur(state, false).ok) return false;
    if (mod.setLightMode(state, "bloom").ok || state.lightMode !== "off") return false;
    if (!mod.setLightMode(state, "per-pixel").ok || state.lightMode !== "per-pixel") return false;
    if (!mod.setLightMode(state, "per-tile").ok || state.lightMode !== "per-tile") return false;
    if (!mod.setLightMode(state, "off").ok || state.lightMode !== "off") return false;
    return true;
}

check("ramps_baked_match_json", function () {
    return rampsMatch(Cues, json);
}, function () {
    const bad = JSON.parse(JSON.stringify(json));
    bad.ramps[4].dark = bad.ramps[4].dark + 1;
    return rampsMatch(Cues, bad);
});

function rampsMatch(mod, data) {
    const baked = mod.bakeAllRamps();
    if (!data.ramps || baked.length !== 32 || data.ramps.length !== 32) return false;
    for (let i = 0; i < 32; i++) {
        const a = baked[i];
        const b = data.ramps[i];
        if (a.z !== b.z || a.stepsDown !== b.stepsDown || a.cool !== b.cool || a.desat !== b.desat || a.dark !== b.dark) return false;
    }
    const book = mod.bakeSwatchBook();
    if (!data.swatches || book.length !== data.swatches.length) return false;
    for (let s = 0; s < book.length; s++) {
        if (book[s].name !== data.swatches[s].name) return false;
        for (let layer = 0; layer < 32; layer++) {
            const got = book[s].layers[layer];
            const want = data.swatches[s].layers[layer];
            if (!want || got[0] !== want[0] || got[1] !== want[1] || got[2] !== want[2]) return false;
        }
    }
    return true;
}

check("ramps_deterministic", function () {
    return rampStable(Cues);
}, function () {
    let n = 0;
    return rampStable(Object.assign({}, Cues, {
        bakeSwatch: function (rgb) {
            const stack = Cues.bakeSwatch(rgb);
            const copy = stack.map(function (px) { return [px[0], px[1], px[2]]; });
            copy[1][0] = (copy[1][0] + (n++ & 1)) & 255;
            return copy;
        }
    }));
});

function rampStable(mod) {
    const rgb = mod.SWATCHES[3].rgb;
    return JSON.stringify(mod.bakeSwatch(rgb)) === JSON.stringify(mod.bakeSwatch(rgb));
}

check("ramps_darker_cooler_desat", function () {
    return rampLook(Cues);
}, function () {
    return rampLook(Object.assign({}, Cues, {
        bakeSwatch: function (rgb) {
            const stack = [];
            for (let i = 0; i < 32; i++) stack.push([rgb[0], rgb[1], rgb[2]]);
            return stack;
        }
    }));
});

function rampLook(mod) {
    for (let s = 0; s < mod.SWATCHES.length; s++) {
        const rgb = mod.SWATCHES[s].rgb;
        const stack = mod.bakeSwatch(rgb);
        if (stack.length !== 32) return false;
        if (stack[0][0] !== rgb[0] || stack[0][1] !== rgb[1] || stack[0][2] !== rgb[2]) return false;
        const top = mod.metrics(rgb);
        let prev = top;
        for (let i = 1; i < stack.length; i++) {
            const m = mod.metrics(stack[i]);
            if (prev.luma1024 > 0 && m.luma1024 >= prev.luma1024) return false;
            if (m.sat > prev.sat) return false;
            if (top.warmth > 0 && m.warmth > prev.warmth) return false;
            prev = m;
        }
        if (top.luma1024 > 0 && prev.luma1024 >= top.luma1024) return false;
        if (top.sat > 0 && prev.sat > top.sat) return false;
        if (top.warmth > 0 && prev.warmth >= top.warmth) return false;
        if (top.sat === 0 && prev.sat !== 0) return false;
    }
    const params = mod.bakeAllRamps();
    for (let i = 1; i < params.length; i++) {
        if (params[i].dark <= params[i - 1].dark) return false;
        if (params[i].cool >= params[i - 1].cool) return false;
        if (params[i].desat >= params[i - 1].desat) return false;
    }
    const identity = mod.rampParams(15);
    if (!identity || identity.cool !== 0 || identity.desat !== 0 || identity.dark !== 256) return false;
    const same = mod.applyRamp([10, 20, 30], 0);
    if (!same || same[0] !== 10 || same[1] !== 20 || same[2] !== 30) return false;
    return true;
}

check("parallax_whole_pixels", function () {
    return parallaxOk(Cues);
}, function () {
    return parallaxOk(Object.assign({}, Cues, {
        parallaxOffset: function () { return { x: 0.5, y: 0 }; }
    }));
});

function parallaxOk(mod) {
    const off = mod.defaultState();
    for (let z = -16; z <= 15; z++) {
        const p = mod.parallaxOffset(z, 0, off);
        if (p.x !== 0 || p.y !== 0) return false;
    }
    const on = mod.defaultState();
    if (!mod.setToggle(on, "parallax", true).ok) return false;
    if (mod.setParallaxStep(on, 1.5).ok) return false;
    if (on.parallaxStepPx !== 1) return false;
    const below = mod.parallaxOffset(-2, 1, on);
    if (below.x !== 3 || below.y !== 3 || !Number.isInteger(below.x) || !Number.isInteger(below.y)) return false;
    const same = mod.parallaxOffset(1, 1, on);
    const above = mod.parallaxOffset(4, 1, on);
    if (same.x !== 0 || same.y !== 0 || above.x !== 0 || above.y !== 0) return false;
    return true;
}

check("shadows_hard_dither", function () {
    return shadowsOk(Cues, Demo.buildDemoScene());
}, function () {
    return shadowsOk(Object.assign({}, Cues, {
        shadowCoverage: function () { return 0.5; }
    }), Demo.buildDemoScene());
});

function shadowsOk(mod, scene) {
    const off = mod.defaultState();
    if (mod.dropShadows(scene, off).length !== 0) return false;
    const on = mod.defaultState();
    mod.setToggle(on, "dropShadows", true);
    const bands = mod.dropShadows(scene, on);
    if (!bands.length) return false;
    for (let i = 0; i < bands.length; i++) {
        const band = bands[i];
        if (!Number.isInteger(band.x) || !Number.isInteger(band.y) || !Number.isInteger(band.w) || !Number.isInteger(band.h)) return false;
        if (band.depthPx !== 2 || band.dither !== "checker" || band.w < 2) return false;
        const left = mod.shadowCoverage(bands, band.x, band.y);
        const right = mod.shadowCoverage(bands, band.x + 1, band.y);
        if (left !== 0 && left !== 1) return false;
        if (right !== 0 && right !== 1) return false;
        if (left === right) return false;
    }
    if (mod.shadowCoverage(bands, 1.5, 0) !== null) return false;
    return true;
}

check("cliff_faces_one_tile", function () {
    return cliffsOk(Cues, Demo.buildDemoScene());
}, function () {
    return cliffsOk(Object.assign({}, Cues, {
        cliffFaces: function (scene, state) {
            const faces = Cues.cliffFaces(scene, state);
            return faces.map(function (face) {
                const copy = Object.assign({}, face);
                if (copy.dropPx >= 48) copy.strips = 4;
                return copy;
            });
        }
    }), Demo.buildDemoScene());
});

function cliffsOk(mod, scene) {
    const off = mod.defaultState();
    if (mod.cliffFaces(scene, off).length !== 0) return false;
    const on = mod.defaultState();
    mod.setToggle(on, "cliffFaces", true);
    const faces = mod.cliffFaces(scene, on);
    if (!faces.length) return false;
    let half = 0;
    let wood = 0;
    for (let i = 0; i < faces.length; i++) {
        const face = faces[i];
        if (face.strips !== 1 || face.oblique !== false || face.rimPx !== 1) return false;
        if (face.projection !== "rmmz-topdown-34") return false;
        if (face.tileSlot === "DP.CLIFF.TEMPERATE.FACE") return false;
        if (!Number.isInteger(face.dropPx) || face.dropPx % 12 !== 0) return false;
        if (face.halfStep && face.dropPx !== 24) return false;
        if (face.halfStep) half++;
        if (face.tileSlot === mod.WALL_SLOT) wood++;
    }
    return half >= 1 && wood >= 1;
}

check("geometry_5ft_48px", function () {
    return geomOk(Cues);
}, function () {
    return geomOk(Object.assign({}, Cues, {
        GEOMETRY: Object.assign({}, Cues.GEOMETRY, { layerFt: 10, layerPx: 96 })
    }));
});

function geomOk(mod) {
    const g = mod.GEOMETRY;
    if (g.layerFt !== 5 || g.layerPx !== 48 || g.tilePx !== 48 || g.quarterPx !== 12) return false;
    if (g.quarterFt !== 1.25 || g.quartersPerLayer !== 4 || g.halfStepPx !== 24) return false;
    if (g.stratumPx.length !== 4 || g.stratumPx[0] !== 12 || g.stratumPx[3] !== 12) return false;
    if (g.zMin !== -16 || g.zMax !== 15 || g.layerCount !== 32) return false;
    if (g.torchBrightPx !== 192 || g.torchDimPx !== 192) return false;
    if (g.layerFt === 10 || g.layerPx === 96) return false;
    return true;
}

check("legacy_10ft_flagged", function () {
    return legacyOk(Cues.scanLegacyLayerFeet);
}, function () {
    return legacyOk(function () { return []; });
});

function legacyOk(scan) {
    const files = {};
    for (let i = 0; i < Cues.LEGACY_PATHS.length; i++) {
        const rel = Cues.LEGACY_PATHS[i];
        files[rel] = fs.readFileSync(path.join(root, rel), "utf8");
    }
    const flags = scan(files);
    const names = flags.map(function (flag) { return flag.file; });
    if (names.indexOf("game/js/plugins/DEUS_World.js") < 0) return false;
    if (names.indexOf("game/js/plugins/DEUS_Levels.js") < 0) return false;
    if (names.indexOf("art/catalogue/geometry.json") < 0) return false;
    for (let i = 0; i < flags.length; i++) {
        if (flags[i].file.indexOf("Dnd5e") >= 0) return false;
    }
    if (!/Z_STEP_FEET:\s*10/.test(files["game/js/plugins/DEUS_World.js"])) return false;
    return true;
}

check("unit_height_whole_pixels", function () {
    return heightOk(Cues);
}, function () {
    return heightOk(Object.assign({}, Cues, {
        unitOrigin: function (unit, scene, state) {
            const origin = Cues.unitOrigin(unit, scene, state);
            if (state.toggles.unitHeightShift) origin.y -= unit.quarter * 10;
            return origin;
        }
    }));
});

function heightOk(mod) {
    const scene = { viewZ: 0 };
    const unit = { id: "a", x: 2, y: 3, z: 0, quarter: 2, hp: 4 };
    const off = mod.defaultState();
    const a = mod.unitOrigin(unit, scene, off);
    if (a.x !== 96 || a.y !== 144) return false;
    const on = mod.defaultState();
    mod.setToggle(on, "unitHeightShift", true);
    const b = mod.unitOrigin(unit, scene, on);
    if (b.y !== 144 - 24 || b.x !== 96) return false;
    if (!Number.isInteger(b.x) || !Number.isInteger(b.y)) return false;
    return true;
}

check("camera_ease_whole_pixels", function () {
    return easeOk(Cues);
}, function () {
    return easeOk(Object.assign({}, Cues, {
        cameraEase: function () { return { x: 0, y: 0.5 }; },
        setCamera: function (state, x) {
            state.cameraX = x;
            return { ok: true };
        }
    }));
});

function easeOk(mod) {
    const off = mod.defaultState();
    const still = mod.cameraEase(off, 0, 3, 1, 4);
    if (!still || still.x !== 0 || still.y !== 0) return false;
    const on = mod.defaultState();
    mod.setToggle(on, "cameraLayerEasing", true);
    const a = mod.cameraEase(on, 0, 2, 0, 4);
    const b = mod.cameraEase(on, 0, 2, 2, 4);
    const c = mod.cameraEase(on, 0, 2, 4, 4);
    if (!a || a.x !== 0 || a.y !== -24) return false;
    if (!b || b.y !== -12) return false;
    if (!c || c.y !== 0) return false;
    if (mod.cameraEase(on, 0, 2, 0.5, 4) !== null) return false;
    const state = mod.defaultState();
    if (mod.setCamera(state, 1.5, 0).ok || state.cameraX !== 0) return false;
    if (!mod.setCamera(state, -4, 8).ok || state.cameraX !== -4 || state.cameraY !== 8) return false;
    return true;
}

check("depth_markers", function () {
    return markersOk(Cues);
}, function () {
    return markersOk(Object.assign({}, Cues, {
        layerMarkers: function () { return [{ z: 0, x: 0.5, y: 0, glyphPx: 16 }]; }
    }));
});

function markersOk(mod) {
    const off = mod.defaultState();
    if (mod.layerMarkers(off).length !== 0) return false;
    const on = mod.defaultState();
    mod.setToggle(on, "depthMarkers", true);
    const markers = mod.layerMarkers(on);
    if (markers.length !== 32) return false;
    if (markers[0].z !== 15 || markers[31].z !== -16) return false;
    for (let i = 0; i < markers.length; i++) {
        if (!Number.isInteger(markers[i].x) || !Number.isInteger(markers[i].y) || markers[i].glyphPx !== 16) return false;
    }
    return true;
}

check("cutaway_binary", function () {
    return cutawayOk(Cues, Demo.buildDemoScene());
}, function () {
    return cutawayOk(Object.assign({}, Cues, {
        cutawayCoverage: function () { return 0.25; }
    }), Demo.buildDemoScene());
});

function cutawayOk(mod, scene) {
    const off = mod.defaultState();
    if (mod.cutawayCells(scene, off).length !== 0) return false;
    const on = mod.defaultState();
    mod.setToggle(on, "ditheredCutaways", true);
    const cells = mod.cutawayCells(scene, on);
    if (cells.length !== 1) return false;
    const left = mod.cutawayCoverage(cells, cells[0].x, cells[0].y);
    const right = mod.cutawayCoverage(cells, cells[0].x + 1, cells[0].y);
    if ((left !== 0 && left !== 1) || (right !== 0 && right !== 1) || left === right) return false;
    if (mod.cutawayCoverage(cells, 0, 0) !== 0) return false;
    return true;
}

check("weather_exposed_layer", function () {
    return weatherOk(Cues, Demo.buildDemoScene());
}, function () {
    return weatherOk(Object.assign({}, Cues, {
        weatherParticles: function (scene, state) {
            const parts = Cues.weatherParticles(scene, state);
            return parts.map(function (part) { return { x: part.x, y: part.y, z: part.z - 1, kind: part.kind }; });
        }
    }), Demo.buildDemoScene());
});

function weatherOk(mod, scene) {
    const off = mod.defaultState();
    if (mod.weatherParticles(scene, off).length !== 0) return false;
    const on = mod.defaultState();
    mod.setToggle(on, "weatherByLayer", true);
    const parts = mod.weatherParticles(scene, on);
    if (parts.length !== scene.columns.length) return false;
    for (let i = 0; i < parts.length; i++) {
        if (parts[i].z !== scene.columns[i].surfaceZ) return false;
        if (!Number.isInteger(parts[i].x) || !Number.isInteger(parts[i].y)) return false;
    }
    return true;
}

check("light_crisp_no_gradient", function () {
    return lightOk(Cues);
}, function () {
    return lightOk(Object.assign({}, Cues, {
        lightPixels: function (scene, state, rect) {
            const buf = Cues.lightPixels(scene, state, rect);
            if (buf.length > 10) buf[10] = 40;
            return buf;
        }
    }));
});

function lightOk(mod) {
    const scene = torchScene(0);
    const state = mod.defaultState();
    if (mod.tileLightClass(scene, state, 2, 2, 0) !== "unlit") return false;
    mod.setLightMode(state, "per-pixel");
    mod.setDimSteps(state, 3);
    const rect = { x: 120, y: 120, w: 400, h: 1, z: 0 };
    const buf = mod.lightPixels(scene, state, rect);
    if (!buf || buf.length !== 400) return false;
    let sawDim = false;
    for (let i = 0; i < buf.length; i++) {
        const px = 120 + i;
        const dist2 = (px - 120) * (px - 120);
        let expect = 0;
        if (dist2 <= 192 * 192) expect = 255;
        else if (dist2 <= 384 * 384) {
            expect = dimOf(px, 120, 3);
            sawDim = true;
        }
        if (buf[i] !== expect) return false;
        if (buf[i] !== 255 && buf[i] !== 0 && (buf[i] < 1 || buf[i] > 3)) return false;
    }
    if (!sawDim) return false;
    mod.setLightMode(state, "per-tile");
    if (mod.tileLightClass(scene, state, 2, 2, 0) !== "bright") return false;
    if (mod.tileLightClass(scene, state, 6, 2, 0) !== "bright") return false;
    if (mod.tileLightClass(scene, state, 7, 2, 0) !== "dim") return false;
    if (mod.tileLightClass(scene, state, 11, 2, 0) !== "unlit") return false;
    mod.setDimSteps(state, 0);
    if (mod.tileLightClass(scene, state, 7, 2, 0) !== "unlit") return false;
    if (mod.tileLightClass(scene, state, 2, 2, 0) !== "bright") return false;
    return true;
}

check("glows_light_lower_layers", function () {
    return lowerOk(Cues);
}, function () {
    return lowerOk(Object.assign({}, Cues, {
        tileLightClass: function () { return "bright"; }
    }));
});

function lowerOk(mod) {
    const scene = torchScene(0);
    scene.lights[0].z = 1;
    const state = mod.defaultState();
    mod.setLightMode(state, "per-tile");
    if (mod.tileLightClass(scene, state, 2, 2, 0) !== "unlit") return false;
    mod.setToggle(state, "glowsLightLower", true);
    if (mod.tileLightClass(scene, state, 2, 2, 0) !== "bright") return false;
    const canopy = torchScene(1);
    canopy.lights[0].z = 1;
    if (mod.tileLightClass(canopy, state, 2, 2, 0) !== "unlit") return false;
    return true;
}

check("glow_sprites_additive", function () {
    return glowOk(Cues, Demo.buildDemoScene());
}, function () {
    return glowOk(Object.assign({}, Cues, {
        glowSprites: function (scene, state) {
            const rows = Cues.glowSprites(scene, state);
            return rows.map(function (row) { return Object.assign({}, row, { blur: true }); });
        }
    }), Demo.buildDemoScene());
});

function glowOk(mod, scene) {
    const off = mod.defaultState();
    if (mod.glowSprites(scene, off).length !== 0) return false;
    const on = mod.defaultState();
    mod.setLightMode(on, "per-tile");
    const rows = mod.glowSprites(scene, on);
    if (rows.length < 2) return false;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.blur !== false || row.blend !== "additive" || row.alpha !== "binary") return false;
        if (row.radiusPx !== 192 || !Number.isInteger(row.x) || !Number.isInteger(row.y)) return false;
    }
    return true;
}

check("night_ramp_baked", function () {
    return nightOk(Cues);
}, function () {
    return nightOk(Object.assign({}, Cues, {
        applyNight: function (rgb) { return [rgb[0], rgb[1], rgb[2]]; }
    }));
});

function nightOk(mod) {
    const rgb = mod.SWATCHES[0].rgb;
    const a = mod.applyNight(rgb);
    const b = mod.applyNight(rgb);
    if (!a || a.join() !== b.join()) return false;
    if (mod.metrics(a).luma1024 >= mod.metrics(rgb).luma1024) return false;
    const params = mod.nightParams();
    if (!params || params.id !== "RAMP_NIGHT") return false;
    return true;
}

check("day_length_and_dim_steps", function () {
    return dayOk(Cues);
}, function () {
    return dayOk(Object.assign({}, Cues, {
        setDayLength: function (state, minutes) {
            state.dayLengthMinutes = minutes;
            return { ok: true };
        }
    }));
});

function dayOk(mod) {
    const state = mod.defaultState();
    if (state.dayLengthMinutes !== null) return false;
    if (mod.setDayLength(state, 23).ok || mod.setDayLength(state, 49).ok || mod.setDayLength(state, 24.5).ok) return false;
    if (state.dayLengthMinutes !== null) return false;
    if (!mod.setDayLength(state, 24).ok) return false;
    const day = mod.dayLengthFraction(24);
    const mid = mod.dayLengthFraction(36);
    const max = mod.dayLengthFraction(48);
    if (!day || day.msNum / day.msDen !== 100) return false;
    if (!mid || mid.msNum / mid.msDen !== 150) return false;
    if (!max || max.msNum / max.msDen !== 200) return false;
    if (!mod.setDayLength(state, null).ok || state.dayLengthMinutes !== null) return false;
    if (mod.setDimSteps(state, 1).ok || mod.setDimSteps(state, 4).ok || mod.setDimSteps(state, 2.5).ok) return false;
    if (!mod.setDimSteps(state, 2).ok || state.dimSteps !== 2) return false;
    if (!mod.setDimSteps(state, 3).ok || state.dimSteps !== 3) return false;
    if (!mod.setDimSteps(state, 0).ok || state.dimSteps !== 0) return false;
    return true;
}

check("letterbox_no_stretch", function () {
    return fitOk(Cues);
}, function () {
    return fitOk(Object.assign({}, Cues, {
        fitFrame: function () { return { ok: true, mode: "stretch", stretched: true, scale: 1.5 }; },
        recommendScale: function () { return 2; },
        defaultState: Cues.defaultState
    }));
});

function fitOk(mod) {
    const box = mod.fitFrame(200, 100, 48, 48, 2);
    if (!box || !box.ok || box.stretched !== false || box.mode !== "letterbox") return false;
    if (box.letterbox.l + box.outW + box.letterbox.r !== 200) return false;
    const more = mod.fitFrame(80, 80, 48, 48, 2);
    if (!more || !more.ok || more.mode !== "more-map" || more.stretched !== false) return false;
    if (mod.fitFrame(100, 100, 48, 48, 1.5).ok) return false;
    if (mod.recommendScale(1920) !== 2 || mod.recommendScale(2560) !== 3 || mod.recommendScale(3840) !== 3) return false;
    if (mod.recommendScale(1280) !== 1) return false;
    if (mod.defaultState().scale !== 1) return false;
    return true;
}

check("hp_spell_selection_compat", function () {
    return compatOk(Cues, Demo);
}, function () {
    return compatOk(Object.assign({}, Cues, {
        hpBars: function (scene, state) {
            return Cues.hpBars(scene, state).filter(function (bar) { return bar.z === scene.viewZ; });
        }
    }), Demo);
});

function compatOk(mod, demo) {
    const scene = demo.buildDemoScene();
    const off = mod.defaultState();
    const low = findBar(mod.hpBars(scene, off), "u-low");
    if (!low || low.z !== 0 || low.w !== 48 || low.h !== 4 || low.paletteShifted !== false) return false;
    if (low.color.join() !== mod.UI_HP.join(",")) return false;
    if (!Number.isInteger(low.x) || !Number.isInteger(low.y)) return false;
    const on = mod.defaultState();
    for (let i = 0; i < mod.TOGGLE_NAMES.length; i++) mod.setToggle(on, mod.TOGGLE_NAMES[i], true);
    const lowOn = findBar(mod.hpBars(scene, on), "u-low");
    if (!lowOn || lowOn.z !== 0 || lowOn.paletteShifted !== false) return false;
    if (lowOn.color.join() !== mod.UI_HP.join(",")) return false;
    const fallOff = findSpell(mod.spellDraws(scene, off), "fall");
    if (!fallOff || fallOff.z !== -1 || fallOff.between.length !== 0 || fallOff.blur !== false) return false;
    const fallOn = findSpell(mod.spellDraws(scene, on), "fall");
    if (!fallOn || fallOn.between.length !== 1 || fallOn.between[0] !== 0) return false;
    const spark = findSpell(mod.spellDraws(scene, off), "spark");
    if (!spark || spark.z !== 0) return false;
    const sel = mod.selectionView(scene);
    if (sel.ids.join(",") !== "u-high,u-low") return false;
    if (!sel.byLayer["1"] || sel.byLayer["1"][0] !== "u-high") return false;
    if (!sel.byLayer["0"] || sel.byLayer["0"][0] !== "u-low") return false;
    return true;
}

function findBar(bars, id) {
    for (let i = 0; i < bars.length; i++) if (bars[i].unitId === id) return bars[i];
    return null;
}

function findSpell(spells, id) {
    for (let i = 0; i < spells.length; i++) if (spells[i].id === id) return spells[i];
    return null;
}

check("whole_pixel_plan", function () {
    return planOk(Cues, Demo);
}, function () {
    return planOk(Object.assign({}, Cues, {
        framePlan: function () {
            return {
                filters: [1],
                blur: false,
                smooth: false,
                oblique: false,
                scale: 3,
                parallax: [{ z: 0, x: 0.5, y: 0 }]
            };
        }
    }), Demo);
});

function planOk(mod, demo) {
    const state = mod.defaultState();
    for (let i = 0; i < mod.TOGGLE_NAMES.length; i++) mod.setToggle(state, mod.TOGGLE_NAMES[i], true);
    mod.setScale(state, 3);
    mod.setLightMode(state, "per-pixel");
    mod.setDimSteps(state, 3);
    mod.setCamera(state, -2, 4);
    let plan;
    try {
        plan = mod.framePlan(demo.buildDemoScene(), state);
    } catch (e) {
        return false;
    }
    if (!plan || plan.filters !== null || plan.blur !== false || plan.smooth !== false || plan.oblique !== false) return false;
    if (plan.scale !== 3 || !plan.parallax || plan.parallax.length !== 32) return false;
    const viewZ = demo.buildDemoScene().viewZ;
    for (let i = 0; i < plan.parallax.length; i++) {
        const row = plan.parallax[i];
        if (!Number.isInteger(row.x) || !Number.isInteger(row.y)) return false;
        if (row.z >= viewZ && (row.x !== 0 || row.y !== 0)) return false;
        if (row.z < viewZ && row.x === 0 && row.y === 0) return false;
    }
    return true;
}

check("json_defaults_and_scene", function () {
    return jsonOk(json, Demo);
}, function () {
    const bad = JSON.parse(JSON.stringify(json));
    bad.defaults.toggles.paletteShift = true;
    return jsonOk(bad, Demo);
});

function jsonOk(data, demo) {
    if (!data || data.schema !== "deus-depth-demo/1") return false;
    if (!data.defaults || data.defaults.scale !== 1 || data.defaults.lightMode !== "off" || data.defaults.blur !== false) return false;
    if (data.defaults.dayLengthMinutes !== null || data.defaults.dimSteps !== 0) return false;
    const names = Object.keys(data.defaults.toggles);
    for (let i = 0; i < names.length; i++) if (data.defaults.toggles[names[i]] !== false) return false;
    if (JSON.stringify(demo.buildDemoScene()) !== JSON.stringify(data.demoScene)) return false;
    if (!data.retiredSlots || data.retiredSlots.indexOf("DP.CLIFF.TEMPERATE.FACE") < 0) return false;
    if (!data.assetNeeds || data.assetNeeds.length < 8) return false;
    return true;
}

check("no_art_generation", function () {
    return sourceClean(readPlugins());
}, function () {
    return sourceClean(readPlugins() + "\nbitmap.filters = [blur]; fs.writeFileSync('x.png'); PixelLab");
});

function readPlugins() {
    return fs.readFileSync(path.join(root, "game", "js", "plugins", "DEUS_DepthCues.js"), "utf8")
        + fs.readFileSync(path.join(root, "game", "js", "plugins", "DEUS_DepthDemo.js"), "utf8");
}

function sourceClean(src) {
    if (/writeFileSync/.test(src)) return false;
    if (/\.png/.test(src)) return false;
    if (/PixelLab/i.test(src)) return false;
    if (/\.filters\s*=/.test(src)) return false;
    if (/ColorMatrix/.test(src)) return false;
    return true;
}

let benchResult = null;
function ensureBench() {
    if (!benchResult) benchResult = Demo.benchmark({ iters: 2, pixelIters: 1 });
    return benchResult;
}

check("benchmark_covers_toggles", function () {
    return benchOk(ensureBench());
}, function () {
    const bad = JSON.parse(JSON.stringify(ensureBench()));
    bad.rows = bad.rows.filter(function (row) { return row.id !== "toggle-paletteShift"; });
    return benchOk(bad);
});

function benchOk(result) {
    if (!result || result.layers !== 32 || result.zMin !== -16 || result.zMax !== 15) return false;
    if (result.units < 512) return false;
    const ids = result.rows.map(function (row) { return row.id; });
    for (let i = 0; i < Cues.TOGGLE_NAMES.length; i++) {
        if (ids.indexOf("toggle-" + Cues.TOGGLE_NAMES[i]) < 0) return false;
    }
    const need = ["all-off", "light-per-tile", "light-per-pixel", "dim-2", "dim-3", "day-length-36", "scale-2", "scale-3", "look", "look-parallax", "look-light-tile", "look-light-pixel", "all-tile-1x", "all-pixel-2x", "all-pixel-3x"];
    for (let i = 0; i < need.length; i++) if (ids.indexOf(need[i]) < 0) return false;
    const pixels = 19 * 15 * 48 * 48;
    for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows[i];
        if (!Number.isFinite(row.frameMs) || row.frameMs < 0) return false;
        if (!Number.isInteger(row.bufferBytes) || row.bufferBytes < 0) return false;
    }
    let pixel = null;
    let off = null;
    for (let i = 0; i < result.rows.length; i++) {
        if (result.rows[i].id === "light-per-pixel") pixel = result.rows[i];
        if (result.rows[i].id === "all-off") off = result.rows[i];
    }
    if (!pixel || pixel.bufferBytes !== pixels) return false;
    if (!off || off.bufferBytes !== 0) return false;
    return true;
}

for (let i = 0; i < lines.length; i++) console.log(lines[i]);
console.log("RESULT: " + passed + " passed, " + failed + " failed, " + killed + " mutants killed");
process.exit(failed === 0 ? 0 : 1);
