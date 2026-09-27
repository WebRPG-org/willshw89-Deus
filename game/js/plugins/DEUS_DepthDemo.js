//=============================================================================
// DEUS_DepthDemo.js - Owner-review demo for depth cues. Defaults are DEC-011.
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Depth Demo] Toggleable depth presentation. Every cue starts off.
 * @author DEUS project
 * @base DEUS_DepthCues
 * @orderAfter DEUS_DepthCues
 *
 * @help
 * DEUS-TSK-DEPTH-DEMO. Load after DEUS_DepthCues. Do not register this file
 * from a lane; the PM adds it to plugins.js at merge.
 *
 * Console (after registration):
 *   DEUS.DepthDemo.setToggle("paletteShift", true)
 *   DEUS.DepthDemo.setScale(2)
 *   DEUS.DepthDemo.setLightMode("per-tile")
 *   DEUS.DepthDemo.reset()
 *
 * Defaults draw nothing over the map: scale 1, light off, no filters.
 * Integer scale, when it is not 1, sizes the finished canvas in whole
 * multiples with nearest sampling. The map tilemap scale stays 1.
 */

(function (root) {
    "use strict";

    const Cues = (typeof module !== "undefined" && module.exports)
        ? require("./DEUS_DepthCues.js")
        : root.DEUS.DepthCues;

    const GROUND = [96, 140, 72];
    const STONE = [128, 124, 116];
    const WOOD = [148, 104, 64];

    function colorFor(material) {
        if (material === "wood") return [WOOD[0], WOOD[1], WOOD[2]];
        if (material === "stone") return [STONE[0], STONE[1], STONE[2]];
        return [GROUND[0], GROUND[1], GROUND[2]];
    }

    function buildDemoScene() {
        const width = 8;
        const height = 6;
        const columns = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let surfaceZ = 1;
                let quarter = 4;
                let material = "stone";
                if (y === 5) surfaceZ = 0;
                if (x === 3 && y === 2) surfaceZ = 0;
                if (x === 5 && y === 3) quarter = 2;
                if (x === 6 && y === 3) {
                    material = "wood";
                    surfaceZ = 2;
                }
                if (x === 4 && y === 4) surfaceZ = -1;
                columns.push({
                    x: x,
                    y: y,
                    surfaceZ: surfaceZ,
                    quarter: quarter,
                    material: material,
                    color: colorFor(material)
                });
            }
        }
        return {
            id: "depth-demo",
            viewZ: 1,
            width: width,
            height: height,
            columns: columns,
            units: [
                { id: "u-high", x: 1, y: 1, z: 1, quarter: 4, hp: 4 },
                { id: "u-low", x: 3, y: 5, z: 0, quarter: 4, hp: 2 },
                { id: "u-pit", x: 3, y: 2, z: 0, quarter: 4, hp: 3 }
            ],
            spells: [
                { id: "spark", casterId: "u-high", casterZ: 1, x: 3, y: 2, z: 0, kind: "spark" },
                { id: "fall", casterId: "u-high", casterZ: 1, x: 4, y: 4, z: -1, kind: "spark" }
            ],
            selection: ["u-high", "u-low"],
            lights: [
                { id: "torch", kind: "torch", x: 1, y: 1, z: 1, brightPx: 192, dimPx: 192 },
                { id: "fire", kind: "fire", x: 6, y: 4, z: 1, brightPx: 192, dimPx: 192 }
            ],
            phase: "day",
            weather: "rain",
            cutaway: [{ x: 2, y: 1 }]
        };
    }

    function buildBenchmarkScene() {
        const width = 19;
        const height = 15;
        const columns = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const surfaceZ = ((x + y * 3) % 32) - 16;
                const quarter = ((x * 2 + y) % 4) + 1;
                const material = ((x + y) % 7) === 0 ? "wood" : "stone";
                columns.push({
                    x: x,
                    y: y,
                    surfaceZ: surfaceZ,
                    quarter: quarter,
                    material: material,
                    color: colorFor(material)
                });
            }
        }
        const units = [];
        for (let i = 0; i < 512; i++) {
            units.push({
                id: "b" + i,
                x: i % width,
                y: Math.floor(i / width) % height,
                z: (i % 32) - 16,
                quarter: (i % 4) + 1,
                hp: i % 5
            });
        }
        const lights = [];
        for (let i = 0; i < 8; i++) {
            lights.push({
                id: "t" + i,
                kind: i % 2 === 0 ? "torch" : "fire",
                x: 2 + (i % 4) * 4,
                y: 2 + Math.floor(i / 4) * 6,
                z: (i % 5) - 2,
                brightPx: 192,
                dimPx: 192
            });
        }
        return {
            id: "depth-bench",
            viewZ: 0,
            width: width,
            height: height,
            columns: columns,
            units: units,
            spells: [
                { id: "sp0", casterId: "b0", casterZ: 0, x: 4, y: 4, z: -2, kind: "spark" }
            ],
            selection: ["b0", "b1", "b32"],
            lights: lights,
            phase: "night",
            weather: "rain",
            cutaway: [{ x: 1, y: 1 }, { x: 2, y: 1 }]
        };
    }

    function benchmarkCases() {
        const singles = Cues.TOGGLE_NAMES.map(function (name) {
            return { id: "toggle-" + name, toggles: [name] };
        });
        return [
            { id: "all-off" }
        ].concat(singles).concat([
            { id: "light-per-tile", lightMode: "per-tile" },
            { id: "light-per-pixel", lightMode: "per-pixel" },
            { id: "dim-2", lightMode: "per-tile", dimSteps: 2 },
            { id: "dim-3", lightMode: "per-tile", dimSteps: 3 },
            { id: "day-length-36", dayLengthMinutes: 36 },
            { id: "scale-2", scale: 2 },
            { id: "scale-3", scale: 3 },
            { id: "glows-lower-lit", toggles: ["glowsLightLower"], lightMode: "per-tile", dimSteps: 2 },
            { id: "look", toggles: ["paletteShift", "cliffFaces", "dropShadows", "depthMarkers"] },
            { id: "look-parallax", toggles: ["paletteShift", "cliffFaces", "dropShadows", "depthMarkers", "parallax"] },
            { id: "look-light-tile", toggles: ["paletteShift", "cliffFaces", "dropShadows", "glowsLightLower"], lightMode: "per-tile", dimSteps: 3 },
            { id: "look-light-pixel", toggles: ["paletteShift", "cliffFaces", "dropShadows", "glowsLightLower"], lightMode: "per-pixel", dimSteps: 3 },
            { id: "all-tile-1x", allToggles: true, lightMode: "per-tile", dimSteps: 3, dayLengthMinutes: 36, scale: 1 },
            { id: "all-pixel-2x", allToggles: true, lightMode: "per-pixel", dimSteps: 3, dayLengthMinutes: 36, scale: 2 },
            { id: "all-pixel-3x", allToggles: true, lightMode: "per-pixel", dimSteps: 3, dayLengthMinutes: 48, scale: 3 },
            { id: "night-torch-fire-tile", lightMode: "per-tile", dimSteps: 2 },
            { id: "night-torch-fire-pixel", lightMode: "per-pixel", dimSteps: 3 }
        ]);
    }

    function stateFromCase(spec) {
        const state = Cues.defaultState();
        const names = spec.allToggles ? Cues.TOGGLE_NAMES : (spec.toggles || []);
        for (let i = 0; i < names.length; i++) Cues.setToggle(state, names[i], true);
        if (spec.scale) Cues.setScale(state, spec.scale);
        if (spec.lightMode) Cues.setLightMode(state, spec.lightMode);
        if (spec.dimSteps) Cues.setDimSteps(state, spec.dimSteps);
        if (spec.dayLengthMinutes) Cues.setDayLength(state, spec.dayLengthMinutes);
        return state;
    }

    function roundMs(ms) {
        return Math.round(ms * 1000) / 1000;
    }

    function benchmark(options) {
        const opts = options || {};
        const iters = opts.iters || 4;
        const pixelIters = opts.pixelIters || 2;
        const scene = opts.scene || buildBenchmarkScene();
        const cases = benchmarkCases();
        const rows = [];
        for (let i = 0; i < cases.length; i++) {
            const spec = cases[i];
            const state = stateFromCase(spec);
            const heavy = state.lightMode === "per-pixel" || state.scale > 1;
            const n = heavy ? pixelIters : iters;
            Cues.rasterFrame(scene, state);
            const t0 = process.hrtime.bigint();
            let last = null;
            for (let k = 0; k < n; k++) last = Cues.rasterFrame(scene, state);
            const elapsed = Number(process.hrtime.bigint() - t0) / 1e6;
            rows.push({
                id: spec.id,
                scale: state.scale,
                lightMode: state.lightMode,
                dimSteps: state.dimSteps,
                dayLengthMinutes: state.dayLengthMinutes,
                frameMs: roundMs(elapsed / n),
                bufferBytes: last.bufferBytes,
                checksum: last.checksum
            });
        }
        return {
            layers: Cues.GEOMETRY.layerCount,
            zMin: Cues.GEOMETRY.zMin,
            zMax: Cues.GEOMETRY.zMax,
            units: scene.units.length,
            viewTiles: [scene.width, scene.height],
            rows: rows
        };
    }

    function assetNeeds() {
        return [
            { slot: "DP.CLIFF.TEMPERATE.TILE", need: "RMMZ cliff tile per biome. One tile, not quarter-height front strips.", when: "cliffFaces" },
            { slot: "DP.WALL.WOOD.TILE", need: "RMMZ wall tile per material. One tile for a full-layer drop.", when: "cliffFaces" },
            { slot: "DP.RAMP.TEMPERATE.TILE", need: "Half-step ramp, 2 quarters, 24 px, one tile.", when: "cliffFaces" },
            { slot: "DP.LEDGE.RIM", need: "1 px lip highlight on the top edge of a drop. Part of the cliff tile.", when: "cliffFaces" },
            { slot: "DP.SHADOW.CHECKER", need: "Hard 2 px dithered drop shadow. Binary coverage, no blur.", when: "dropShadows" },
            { slot: "RAMP_LAYER_-16_TO_+15", need: "32 baked palette variants. Darker, cooler, less saturated per layer down. No runtime colour matrix.", when: "paletteShift" },
            { slot: "GL.TORCH.F00", need: "Additive torch glow, pixel-stepped, radius 192 px, binary alpha, no blur.", when: "dynamicLight" },
            { slot: "GL.FIRE.F00", need: "Additive fire glow, same rules as the torch, stored with its glow id.", when: "dynamicLight" },
            { slot: "GL.WINDOW.F00", need: "Drawn window glow named by AS-LIGHT-001. Radius is a whole-pixel count on the glow id.", when: "dynamicLight" },
            { slot: "RAMP_NIGHT", need: "Precomputed night grade plus lit building variants. The hook stays off until dynamic light is on.", when: "dynamicLight" },
            { slot: "UI.LAYER.MARKER", need: "16 px layer marker glyphs, one label per Z from -16 to +15.", when: "depthMarkers" },
            { slot: "FX.WEATHER.LAYER", need: "Weather sprites drawn only on the exposed surface of a column.", when: "weatherByLayer" }
        ];
    }

    function bundleData() {
        return {
            schema: "deus-depth-demo/1",
            geometry: {
                tilePx: Cues.GEOMETRY.tilePx,
                layerFt: Cues.GEOMETRY.layerFt,
                layerPx: Cues.GEOMETRY.layerPx,
                quarterPx: Cues.GEOMETRY.quarterPx,
                quarterFt: Cues.GEOMETRY.quarterFt,
                quartersPerLayer: Cues.GEOMETRY.quartersPerLayer,
                stratumPx: [12, 12, 12, 12],
                zMin: Cues.GEOMETRY.zMin,
                zMax: Cues.GEOMETRY.zMax,
                layerCount: Cues.GEOMETRY.layerCount,
                cellFt: Cues.GEOMETRY.cellFt,
                halfStepPx: Cues.GEOMETRY.halfStepPx,
                torchBrightPx: Cues.GEOMETRY.torchBrightPx,
                torchDimPx: Cues.GEOMETRY.torchDimPx
            },
            defaults: Cues.defaultState(),
            ramps: Cues.bakeAllRamps(),
            night: Cues.nightParams(),
            swatches: Cues.bakeSwatchBook(),
            demoScene: buildDemoScene(),
            assetNeeds: assetNeeds(),
            retiredSlots: Cues.RETIRED_SLOTS.slice(),
            scales: [1, 2, 3],
            lightModes: ["off", "per-tile", "per-pixel"]
        };
    }

    function loadBundledJson() {
        if (typeof module === "undefined" || !module.exports) return null;
        const fs = require("fs");
        const path = require("path");
        const file = path.join(__dirname, "..", "..", "data", "DEUS_DepthDemo.json");
        return JSON.parse(fs.readFileSync(file, "utf8"));
    }

    const live = {
        state: Cues.defaultState(),
        scene: null,
        data: null
    };

    function currentState() {
        return live.state;
    }

    function reset() {
        live.state = Cues.defaultState();
        return live.state;
    }

    function setToggle(name, on) {
        return Cues.setToggle(live.state, name, on);
    }

    function setScale(scale) {
        return Cues.setScale(live.state, scale);
    }

    function setLightMode(mode) {
        return Cues.setLightMode(live.state, mode);
    }

    function setDayLength(minutes) {
        return Cues.setDayLength(live.state, minutes);
    }

    function setDimSteps(steps) {
        return Cues.setDimSteps(live.state, steps);
    }

    let savedCanvas = null;

    function applyCanvasScale(scale) {
        if (typeof document === "undefined") return { applied: false, scale: scale };
        const canvas = document.querySelector("canvas");
        if (!canvas) return { applied: false, scale: scale };
        if (scale === 1) {
            if (savedCanvas) {
                canvas.style.imageRendering = savedCanvas.imageRendering;
                canvas.style.width = savedCanvas.width;
                canvas.style.height = savedCanvas.height;
                savedCanvas = null;
            }
            return { applied: false, scale: 1 };
        }
        if (!Cues.scaleAllowed(scale)) return { applied: false, scale: scale };
        if (!savedCanvas) {
            savedCanvas = {
                imageRendering: canvas.style.imageRendering,
                width: canvas.style.width,
                height: canvas.style.height
            };
        }
        const baseW = canvas.width;
        const baseH = canvas.height;
        canvas.style.imageRendering = "pixelated";
        canvas.style.width = (baseW * scale) + "px";
        canvas.style.height = (baseH * scale) + "px";
        return { applied: true, scale: scale, nearest: true };
    }

    function hudLines(state) {
        const on = [];
        const names = Cues.TOGGLE_NAMES;
        for (let i = 0; i < names.length; i++) {
            if (state.toggles[names[i]]) on.push(names[i]);
        }
        if (state.scale !== 1) on.push("scale " + state.scale + "x");
        if (state.lightMode !== "off") on.push("light " + state.lightMode);
        if (state.dimSteps) on.push("dim " + state.dimSteps);
        if (state.dayLengthMinutes) on.push("day " + state.dayLengthMinutes + " min");
        return on;
    }

    function cssColor(rgb) {
        return "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
    }

    // Placeholder rectangles only. No image files. Opaque pixels or empty.
    function paintOverlay(bitmap, scene, state) {
        bitmap.clear();
        const plan = Cues.framePlan(scene, state);
        const tiles = plan.tiles;
        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            bitmap.fillRect(tile.x * 48, tile.y * 48, 48, 48, cssColor(tile.rgb));
        }
        const faces = plan.faces;
        for (let i = 0; i < faces.length; i++) {
            const face = faces[i];
            const x = face.x * 48;
            const y = face.y * 48;
            if (face.edge === "n") bitmap.fillRect(x, y, 48, 8, "#2a2a30");
            else if (face.edge === "s") bitmap.fillRect(x, y + 40, 48, 8, "#2a2a30");
            else if (face.edge === "w") bitmap.fillRect(x, y, 8, 48, "#2a2a30");
            else bitmap.fillRect(x + 40, y, 8, 48, "#2a2a30");
            if (face.edge === "n") bitmap.fillRect(x, y, 48, face.rimPx, "#d0d4dc");
            else if (face.edge === "s") bitmap.fillRect(x, y + 47, 48, face.rimPx, "#d0d4dc");
            else if (face.edge === "w") bitmap.fillRect(x, y, face.rimPx, 48, "#d0d4dc");
            else bitmap.fillRect(x + 47, y, face.rimPx, 48, "#d0d4dc");
        }
        const bands = plan.shadows;
        for (let i = 0; i < bands.length; i++) {
            const band = bands[i];
            for (let y = 0; y < band.h; y++) {
                for (let x = 0; x < band.w; x++) {
                    if (((band.x + x + band.y + y) & 1) === 0) {
                        bitmap.fillRect(band.x + x, band.y + y, 1, 1, "#101014");
                    }
                }
            }
        }
        if (state.lightMode !== "off") {
            for (let i = 0; i < scene.columns.length; i++) {
                const col = scene.columns[i];
                const cls = Cues.tileLightClass(scene, state, col.x, col.y, col.surfaceZ);
                if (cls === "unlit") continue;
                bitmap.fillRect(col.x * 48 + 20, col.y * 48 + 20, 8, 8, cls === "bright" ? "#fff2c8" : "#8a7040");
            }
        }
        const units = plan.units;
        for (let i = 0; i < units.length; i++) {
            bitmap.fillRect(units[i].x + 16, units[i].y + 12, 16, 24, "#c4a574");
        }
        const bars = plan.hpBars;
        for (let i = 0; i < bars.length; i++) {
            bitmap.fillRect(bars[i].x, bars[i].y, bars[i].w, bars[i].h, cssColor(bars[i].color));
        }
        if (state.toggles.depthMarkers) {
            const markers = plan.markers;
            for (let i = 0; i < markers.length && i < 20; i++) {
                bitmap.drawText(markers[i].text, markers[i].x, markers[i].y, 72, 16, "left");
            }
        }
        const lines = hudLines(state);
        for (let i = 0; i < lines.length; i++) {
            bitmap.drawText(lines[i], 400, 8 + i * 18, 280, 16, "left");
        }
    }

    function overlayTick(scene) {
        const state = live.state;
        applyCanvasScale(state.scale);
        const spriteset = scene._spriteset;
        if (!spriteset) return;
        if (Cues.isDefaultState(state)) {
            if (scene._deusDepthDemo) {
                spriteset.removeChild(scene._deusDepthDemo);
                scene._deusDepthDemo = null;
            }
            return;
        }
        if (typeof Bitmap !== "function" || typeof Sprite !== "function") return;
        let sprite = scene._deusDepthDemo;
        if (!sprite) {
            sprite = new Sprite(new Bitmap(Graphics.boxWidth || 816, Graphics.boxHeight || 624));
            sprite.bitmap.smooth = false;
            spriteset.addChild(sprite);
            scene._deusDepthDemo = sprite;
        }
        const stamp = JSON.stringify(state);
        if (sprite._deusStamp === stamp) return;
        sprite._deusStamp = stamp;
        const demo = live.scene || buildDemoScene();
        paintOverlay(sprite.bitmap, demo, state);
    }

    function installMap(target) {
        if (!target || typeof target.Scene_Map !== "function") return false;
        if (target.__DEUS_DEPTH_DEMO) return true;
        target.__DEUS_DEPTH_DEMO = true;
        const prev = target.Scene_Map.prototype.update;
        target.Scene_Map.prototype.update = function () {
            prev.call(this);
            try {
                overlayTick(this);
            } catch (err) {
                if (!installMap.logged) installMap.logged = String(err && err.message || err);
            }
        };
        return true;
    }

    function loadJsonXhr() {
        if (typeof XMLHttpRequest !== "function") return;
        const xhr = new XMLHttpRequest();
        xhr.open("GET", "data/DEUS_DepthDemo.json");
        xhr.overrideMimeType("application/json");
        xhr.onload = function () {
            if (xhr.status === 200 || xhr.status === 0) {
                try { live.data = JSON.parse(xhr.responseText); } catch (err) { live.data = null; }
            }
        };
        xhr.send();
    }

    const api = {
        Cues: Cues,
        buildDemoScene: buildDemoScene,
        buildBenchmarkScene: buildBenchmarkScene,
        benchmarkCases: benchmarkCases,
        stateFromCase: stateFromCase,
        benchmark: benchmark,
        assetNeeds: assetNeeds,
        bundleData: bundleData,
        loadBundledJson: loadBundledJson,
        currentState: currentState,
        reset: reset,
        setToggle: setToggle,
        setScale: setScale,
        setLightMode: setLightMode,
        setDayLength: setDayLength,
        setDimSteps: setDimSteps,
        applyCanvasScale: applyCanvasScale,
        hudLines: hudLines,
        installMap: installMap
    };

    if (typeof module !== "undefined" && module.exports) module.exports = api;
    root.DEUS = root.DEUS || {};
    root.DEUS.DepthDemo = api;
    if (root.UF) root.UF.DepthDemo = api;
    live.scene = buildDemoScene();
    if (typeof root.Scene_Map === "function") installMap(root);
    if (typeof document !== "undefined") loadJsonXhr();
})(typeof window !== "undefined" ? window : globalThis);
