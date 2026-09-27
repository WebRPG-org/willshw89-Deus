//=============================================================================
// DEUS_DepthCues.js - Pixel-perfect depth cues for the depth presentation demo
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Depth Cues] Baked depth ramps, cliffs, shadows, parallax, light and integer scale. Every cue off by default.
 * @author DEUS project
 * @base DEUS_Depth
 * @orderAfter DEUS_Depth
 * @orderAfter DEUS_Levels
 * @orderAfter DEUS_World
 *
 * @help
 * DEUS-TSK-DEPTH-DEMO. Headless math for the Owner depth demo.
 * System doc: docs/systems/DEUS_DepthDemo.md.
 *
 * DEC-011 stays the default: no blur, no filter, no fractional scale, no parallax
 * until a toggle is turned on. This file does not edit DEUS_Depth. It does not
 * write images. Placeholder slots only; the Owner draws the art.
 *
 * Geometry used here (A9c items 26 and 29): 1 layer = 5 ft = 48 px,
 * 4 quarters of 12 px. Core files that still use a 10 ft layer are flagged,
 * not changed.
 */

(function (root) {
    "use strict";

    const GEOMETRY = Object.freeze({
        tilePx: 48,
        layerFt: 5,
        layerPx: 48,
        quarterPx: 12,
        quarterFt: 1.25,
        quartersPerLayer: 4,
        stratumPx: Object.freeze([12, 12, 12, 12]),
        zMin: -16,
        zMax: 15,
        layerCount: 32,
        cellFt: 5,
        halfStepPx: 24,
        torchBrightPx: 192,
        torchDimPx: 192,
        torchBrightTiles: 4,
        torchDimTiles: 4,
        walkPxPerFrame: 4,
        runPxPerFrame: 6,
        diagonalPxPerAxis: 3,
        lightFrom: "top-left",
        projection: "rmmz-topdown-34"
    });

    const TOGGLE_NAMES = Object.freeze([
        "paletteShift",
        "cliffFaces",
        "dropShadows",
        "parallax",
        "depthMarkers",
        "unitHeightShift",
        "cameraLayerEasing",
        "ditheredCutaways",
        "crossLayerEffects",
        "glowsLightLower",
        "weatherByLayer"
    ]);

    const LIGHT_MODES = Object.freeze(["off", "per-tile", "per-pixel"]);
    const SCALES = Object.freeze([1, 2, 3]);
    const CLIFF_SLOT = "DP.CLIFF.TEMPERATE.TILE";
    const WALL_SLOT = "DP.WALL.WOOD.TILE";
    const RAMP_SLOT = "DP.RAMP.TEMPERATE.TILE";
    const RETIRED_SLOTS = Object.freeze(["DP.CLIFF.TEMPERATE.FACE"]);
    const GLOW_TORCH = "GL.TORCH.F00";
    const GLOW_FIRE = "GL.FIRE.F00";

    // Placeholder colours for the demo composite. Not artwork.
    const SWATCHES = Object.freeze([
        Object.freeze({ name: "ground", rgb: Object.freeze([96, 140, 72]) }),
        Object.freeze({ name: "stone", rgb: Object.freeze([128, 124, 116]) }),
        Object.freeze({ name: "wood", rgb: Object.freeze([148, 104, 64]) }),
        Object.freeze({ name: "ember", rgb: Object.freeze([200, 80, 40]) }),
        Object.freeze({ name: "neutral", rgb: Object.freeze([128, 128, 128]) }),
        Object.freeze({ name: "warmRed", rgb: Object.freeze([220, 60, 50]) }),
        Object.freeze({ name: "leaf", rgb: Object.freeze([70, 130, 60]) }),
        Object.freeze({ name: "coolBlue", rgb: Object.freeze([80, 90, 160]) })
    ]);

    const UI_HP = Object.freeze([200, 40, 48]);

    function defaultState() {
        const toggles = {};
        for (let i = 0; i < TOGGLE_NAMES.length; i++) toggles[TOGGLE_NAMES[i]] = false;
        return {
            toggles: toggles,
            scale: 1,
            lightMode: "off",
            blur: false,
            dayLengthMinutes: null,
            dimSteps: 0,
            parallaxStepPx: 1,
            cameraX: 0,
            cameraY: 0
        };
    }

    function isDefaultState(state) {
        if (!state || state.scale !== 1 || state.lightMode !== "off" || state.blur !== false) return false;
        if (state.dayLengthMinutes !== null || state.dimSteps !== 0) return false;
        if (state.cameraX !== 0 || state.cameraY !== 0) return false;
        for (let i = 0; i < TOGGLE_NAMES.length; i++) {
            if (state.toggles[TOGGLE_NAMES[i]] !== false) return false;
        }
        return true;
    }

    function setToggle(state, name, on) {
        if (!state || !state.toggles || !Object.prototype.hasOwnProperty.call(state.toggles, name)) {
            return { ok: false, reason: "unknown-toggle" };
        }
        if (typeof on !== "boolean") return { ok: false, reason: "unknown-toggle" };
        state.toggles[name] = on;
        return { ok: true };
    }

    function scaleAllowed(scale) {
        return scale === 1 || scale === 2 || scale === 3;
    }

    function setScale(state, scale) {
        if (!scaleAllowed(scale)) return { ok: false, reason: "scale" };
        state.scale = scale;
        return { ok: true };
    }

    function setLightMode(state, mode) {
        if (LIGHT_MODES.indexOf(mode) < 0) return { ok: false, reason: "light-mode" };
        state.lightMode = mode;
        return { ok: true };
    }

    function setBlur(state, on) {
        if (on === true) return { ok: false, reason: "blur" };
        if (on !== false) return { ok: false, reason: "blur" };
        state.blur = false;
        return { ok: true };
    }

    function setDayLength(state, minutes) {
        if (minutes === null) {
            state.dayLengthMinutes = null;
            return { ok: true };
        }
        if (!Number.isInteger(minutes) || minutes < 24 || minutes > 48) {
            return { ok: false, reason: "day-length" };
        }
        state.dayLengthMinutes = minutes;
        return { ok: true };
    }

    // Real milliseconds per 6 s sim tick, as an exact rational (minutes * 25 / 6).
    function dayLengthFraction(minutes) {
        if (!Number.isInteger(minutes)) return null;
        return { minutes: minutes, msNum: minutes * 25, msDen: 6 };
    }

    function setDimSteps(state, steps) {
        if (steps !== 0 && steps !== 2 && steps !== 3) return { ok: false, reason: "dim-steps" };
        state.dimSteps = steps;
        return { ok: true };
    }

    function setCamera(state, x, y) {
        if (!Number.isInteger(x) || !Number.isInteger(y)) return { ok: false, reason: "camera" };
        state.cameraX = x;
        state.cameraY = y;
        return { ok: true };
    }

    function setParallaxStep(state, px) {
        if (!Number.isInteger(px) || px < 0 || px > 8) return { ok: false, reason: "parallax-step" };
        state.parallaxStepPx = px;
        return { ok: true };
    }

    function rampParams(z) {
        if (!Number.isInteger(z) || z < GEOMETRY.zMin || z > GEOMETRY.zMax) return null;
        const stepsDown = GEOMETRY.zMax - z;
        return {
            z: z,
            stepsDown: stepsDown,
            cool: stepsDown * 4,
            desat: Math.min(220, stepsDown * 6),
            dark: 256 - stepsDown * 5
        };
    }

    function bakeAllRamps() {
        const out = [];
        for (let z = GEOMETRY.zMin; z <= GEOMETRY.zMax; z++) out.push(rampParams(z));
        return out;
    }

    function clampByte(v) {
        if (v < 0) return 0;
        if (v > 255) return 255;
        return v;
    }

    function metrics(rgb) {
        const r = rgb[0], g = rgb[1], b = rgb[2];
        return {
            luma1024: r * 306 + g * 601 + b * 117,
            sat: Math.max(r, g, b) - Math.min(r, g, b),
            warmth: r - b
        };
    }

    // Ideal per-step colour before the integer monotone repair. Identity at 0.
    function idealRamp(rgb, steps) {
        if (steps === 0) return [rgb[0], rgb[1], rgb[2]];
        const r0 = rgb[0], g0 = rgb[1], b0 = rgb[2];
        const luma0 = (r0 * 306 + g0 * 601 + b0 * 117 + 512) >> 10;
        const cool = steps * 4;
        const rC = (r0 * (256 - cool) + luma0 * cool + 128) >> 8;
        const half = cool >> 1;
        const gC = (g0 * (256 - half) + luma0 * half + 128) >> 8;
        const bC = b0;
        const luma1 = (rC * 306 + gC * 601 + bC * 117 + 512) >> 10;
        const w = Math.min(220, steps * 6);
        const inv = 256 - w;
        let r = (rC * inv + luma1 * w + 128) >> 8;
        let g = (gC * inv + luma1 * w + 128) >> 8;
        let b = (bC * inv + luma1 * w + 128) >> 8;
        const dark = 256 - steps * 5;
        r = (r * dark + 128) >> 8;
        g = (g * dark + 128) >> 8;
        b = (b * dark + 128) >> 8;
        return [clampByte(r), clampByte(g), clampByte(b)];
    }

    // Keep each step darker, not more saturated, and (for a warm source) not warmer.
    function forceMonotone(prev, cur, warmSource) {
        let r = cur[0], g = cur[1], b = cur[2];
        for (let n = 0; n < 96; n++) {
            const pm = metrics(prev);
            const m = metrics([r, g, b]);
            const lumaBad = pm.luma1024 > 0 && m.luma1024 >= pm.luma1024;
            const satBad = m.sat > pm.sat;
            const warmBad = warmSource && m.warmth > pm.warmth;
            if (!lumaBad && !satBad && !warmBad) return [r, g, b];
            if (lumaBad) {
                if (r > 0) r--;
                else if (g > 0) g--;
                else if (b > 0) b--;
                else return [0, 0, 0];
            } else if (warmBad && r > 0) {
                r--;
            } else if (satBad) {
                if (r >= g && r >= b && r > 0) r--;
                else if (g >= b && g > 0) g--;
                else if (b > 0) b--;
                else return [r, g, b];
            } else {
                return [r, g, b];
            }
        }
        return [r, g, b];
    }

    function bakeSwatch(rgb) {
        const warm = metrics(rgb).warmth > 0;
        const out = [[rgb[0], rgb[1], rgb[2]]];
        for (let steps = 1; steps <= 31; steps++) {
            out.push(forceMonotone(out[steps - 1], idealRamp(rgb, steps), warm));
        }
        return out;
    }

    function applyRamp(rgb, stepsDown) {
        if (!Number.isInteger(stepsDown) || stepsDown < 0 || stepsDown > 31) return null;
        if (stepsDown === 0) return [rgb[0], rgb[1], rgb[2]];
        return bakeSwatch(rgb)[stepsDown];
    }

    function applyRampAtLayer(rgb, z) {
        const params = rampParams(z);
        if (!params) return null;
        return applyRamp(rgb, params.stepsDown);
    }

    function bakeSwatchBook() {
        const book = [];
        for (let i = 0; i < SWATCHES.length; i++) {
            const sw = SWATCHES[i];
            book.push({ name: sw.name, rgb: [sw.rgb[0], sw.rgb[1], sw.rgb[2]], layers: bakeSwatch(sw.rgb) });
        }
        return book;
    }

    // Fixed night grade (AS-LIGHT-001 RAMP_NIGHT). One baked shift, not a colour matrix.
    function nightParams() {
        return { id: "RAMP_NIGHT", cool: 40, desat: 48, dark: 160, redCut: 12 };
    }

    function applyNight(rgb) {
        const r0 = rgb[0], g0 = rgb[1], b0 = rgb[2];
        const luma = (r0 * 306 + g0 * 601 + b0 * 117 + 512) >> 10;
        const w = 48;
        const inv = 256 - w;
        let r = (r0 * inv + luma * w + 128) >> 8;
        let g = (g0 * inv + luma * w + 128) >> 8;
        let b = (b0 * inv + luma * w + 128) >> 8;
        const dark = 160;
        r = (r * dark + 128) >> 8;
        g = (g * dark + 128) >> 8;
        b = (b * dark + 128) >> 8;
        r = clampByte(r - 12);
        return [clampByte(r), clampByte(g), clampByte(b)];
    }

    function columnAt(scene, x, y) {
        if (!scene || x < 0 || y < 0 || x >= scene.width || y >= scene.height) return null;
        return scene.columns[y * scene.width + x] || null;
    }

    function surfacePx(col) {
        return (col.surfaceZ - GEOMETRY.zMin) * GEOMETRY.layerPx + col.quarter * GEOMETRY.quarterPx;
    }

    function isOpen(scene, x, y, z) {
        const col = columnAt(scene, x, y);
        if (!col) return true;
        return z > col.surfaceZ;
    }

    function tileSlotForDrop(material, dropQuarters) {
        if (dropQuarters === 2) return RAMP_SLOT;
        if (material === "wood" && dropQuarters >= 4) return WALL_SLOT;
        return CLIFF_SLOT;
    }

    function cliffFaces(scene, state) {
        if (!state.toggles.cliffFaces) return [];
        const dirs = [
            { edge: "n", dx: 0, dy: -1 },
            { edge: "e", dx: 1, dy: 0 },
            { edge: "s", dx: 0, dy: 1 },
            { edge: "w", dx: -1, dy: 0 }
        ];
        const faces = [];
        for (let y = 0; y < scene.height; y++) {
            for (let x = 0; x < scene.width; x++) {
                const here = columnAt(scene, x, y);
                if (!here) continue;
                const herePx = surfacePx(here);
                for (let d = 0; d < dirs.length; d++) {
                    const dir = dirs[d];
                    const nx = x + dir.dx;
                    const ny = y + dir.dy;
                    const neighbor = columnAt(scene, nx, ny);
                    if (!neighbor) continue;
                    const drop = herePx - surfacePx(neighbor);
                    if (drop < GEOMETRY.quarterPx) continue;
                    if (drop % GEOMETRY.quarterPx !== 0) continue;
                    const dropQuarters = drop / GEOMETRY.quarterPx;
                    const slot = tileSlotForDrop(here.material, dropQuarters);
                    faces.push({
                        x: nx,
                        y: ny,
                        z: neighbor.surfaceZ,
                        edge: dir.edge,
                        higherZ: here.surfaceZ,
                        lowerZ: neighbor.surfaceZ,
                        dropPx: drop,
                        dropQuarters: dropQuarters,
                        strips: 1,
                        oblique: false,
                        projection: GEOMETRY.projection,
                        tileSlot: slot,
                        halfStep: dropQuarters === 2,
                        rimPx: 1,
                        material: here.material || "stone"
                    });
                }
            }
        }
        return faces;
    }

    function dropShadows(scene, state) {
        if (!state.toggles.dropShadows) return [];
        // Light is top-left, so a higher neighbour on the north or west casts a 2 px band.
        const bands = [];
        const casters = [
            { dx: 0, dy: -1, axis: "h" },
            { dx: -1, dy: 0, axis: "v" }
        ];
        for (let y = 0; y < scene.height; y++) {
            for (let x = 0; x < scene.width; x++) {
                const here = columnAt(scene, x, y);
                if (!here) continue;
                for (let c = 0; c < casters.length; c++) {
                    const cast = casters[c];
                    const neighbor = columnAt(scene, x + cast.dx, y + cast.dy);
                    if (!neighbor) continue;
                    const drop = surfacePx(neighbor) - surfacePx(here);
                    if (drop < GEOMETRY.quarterPx) continue;
                    if (cast.axis === "h") {
                        bands.push({
                            x: x * GEOMETRY.tilePx + 1,
                            y: y * GEOMETRY.tilePx + 1,
                            w: GEOMETRY.tilePx - 2,
                            h: 2,
                            z: here.surfaceZ,
                            dither: "checker",
                            depthPx: 2
                        });
                    } else {
                        bands.push({
                            x: x * GEOMETRY.tilePx + 1,
                            y: y * GEOMETRY.tilePx + 1,
                            w: 2,
                            h: GEOMETRY.tilePx - 2,
                            z: here.surfaceZ,
                            dither: "checker",
                            depthPx: 2
                        });
                    }
                }
            }
        }
        return bands;
    }

    function shadowCoverage(bands, px, py) {
        if (!Number.isInteger(px) || !Number.isInteger(py)) return null;
        let on = 0;
        for (let i = 0; i < bands.length; i++) {
            const band = bands[i];
            if (px >= band.x && px < band.x + band.w && py >= band.y && py < band.y + band.h) {
                on = ((px + py) & 1) === 0 ? 1 : 0;
            }
        }
        return on;
    }

    function parallaxOffset(z, viewZ, state) {
        if (!state.toggles.parallax) return { x: 0, y: 0 };
        const depth = viewZ - z;
        if (depth <= 0) return { x: 0, y: 0 };
        const step = state.parallaxStepPx;
        return { x: depth * step, y: depth * step };
    }

    function cameraEase(state, fromZ, toZ, frameIndex, frameCount) {
        if (!state.toggles.cameraLayerEasing) return { x: 0, y: 0 };
        if (!Number.isInteger(fromZ) || !Number.isInteger(toZ)) return null;
        if (!Number.isInteger(frameIndex) || !Number.isInteger(frameCount) || frameCount <= 0) return null;
        const travel = Math.abs(toZ - fromZ) * GEOMETRY.quarterPx;
        let done = Math.floor(frameIndex * travel / frameCount);
        if (done < 0) done = 0;
        if (done > travel) done = travel;
        const left = travel - done;
        const sign = toZ >= fromZ ? -1 : 1;
        return { x: 0, y: sign * left };
    }

    function unitOrigin(unit, scene, state) {
        const shift = parallaxOffset(unit.z, scene.viewZ, state);
        const lift = state.toggles.unitHeightShift ? unit.quarter * GEOMETRY.quarterPx : 0;
        return {
            x: unit.x * GEOMETRY.tilePx + shift.x + state.cameraX,
            y: unit.y * GEOMETRY.tilePx + shift.y + state.cameraY - lift,
            z: unit.z
        };
    }

    function hpBars(scene, state) {
        const bars = [];
        for (let i = 0; i < scene.units.length; i++) {
            const unit = scene.units[i];
            const origin = unitOrigin(unit, scene, state);
            bars.push({
                unitId: unit.id,
                z: unit.z,
                x: origin.x,
                y: origin.y - 8,
                w: 48,
                h: 4,
                fill: unit.hp,
                color: [UI_HP[0], UI_HP[1], UI_HP[2]],
                paletteShifted: false
            });
        }
        return bars;
    }

    function spellDraws(scene, state) {
        const spells = scene.spells || [];
        const out = [];
        for (let i = 0; i < spells.length; i++) {
            const spell = spells[i];
            const shift = parallaxOffset(spell.z, scene.viewZ, state);
            const between = [];
            if (state.toggles.crossLayerEffects) {
                const lo = Math.min(spell.casterZ, spell.z);
                const hi = Math.max(spell.casterZ, spell.z);
                for (let z = lo + 1; z < hi; z++) {
                    if (isOpen(scene, spell.x, spell.y, z)) between.push(z);
                }
            }
            out.push({
                id: spell.id,
                x: spell.x * GEOMETRY.tilePx + shift.x + state.cameraX,
                y: spell.y * GEOMETRY.tilePx + shift.y + state.cameraY,
                z: spell.z,
                casterZ: spell.casterZ,
                between: between,
                blur: false
            });
        }
        return out;
    }

    function selectionView(scene) {
        const ids = (scene.selection || []).slice();
        const byLayer = {};
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            let unit = null;
            for (let u = 0; u < scene.units.length; u++) {
                if (scene.units[u].id === id) unit = scene.units[u];
            }
            if (!unit) continue;
            const key = String(unit.z);
            if (!byLayer[key]) byLayer[key] = [];
            byLayer[key].push(id);
        }
        return { ids: ids, byLayer: byLayer };
    }

    function layerMarkers(state) {
        if (!state.toggles.depthMarkers) return [];
        const markers = [];
        let row = 0;
        for (let z = GEOMETRY.zMax; z >= GEOMETRY.zMin; z--) {
            const label = z > 0 ? "+" + z : String(z);
            markers.push({
                z: z,
                text: "z=" + label,
                x: 4,
                y: 4 + row * 16,
                glyphPx: 16
            });
            row++;
        }
        return markers;
    }

    function cutawayCells(scene, state) {
        if (!state.toggles.ditheredCutaways) return [];
        const cells = scene.cutaway || [];
        const out = [];
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            out.push({
                x: cell.x * GEOMETRY.tilePx,
                y: cell.y * GEOMETRY.tilePx,
                w: GEOMETRY.tilePx,
                h: GEOMETRY.tilePx,
                z: scene.viewZ,
                dither: "checker"
            });
        }
        return out;
    }

    function cutawayCoverage(cells, px, py) {
        if (!Number.isInteger(px) || !Number.isInteger(py)) return null;
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (px >= cell.x && px < cell.x + cell.w && py >= cell.y && py < cell.y + cell.h) {
                return ((px + py) & 1) === 0 ? 1 : 0;
            }
        }
        return 0;
    }

    function weatherParticles(scene, state) {
        if (!state.toggles.weatherByLayer) return [];
        if (!scene.weather || scene.weather === "none") return [];
        const out = [];
        for (let i = 0; i < scene.columns.length; i++) {
            const col = scene.columns[i];
            out.push({
                x: col.x * GEOMETRY.tilePx + 8,
                y: col.y * GEOMETRY.tilePx + 4,
                z: col.surfaceZ,
                kind: scene.weather
            });
        }
        return out;
    }

    function lightAnchor(light) {
        return {
            x: light.x * GEOMETRY.tilePx + 24,
            y: light.y * GEOMETRY.tilePx + 24
        };
    }

    function lightReaches(scene, state, light, tx, ty, tz) {
        if (!Number.isInteger(tz) || tz > light.z) return false;
        if (tz === light.z) return true;
        if (!state.toggles.glowsLightLower) return false;
        for (let z = tz + 1; z <= light.z; z++) {
            if (!isOpen(scene, tx, ty, z)) return false;
        }
        return true;
    }

    function classifyDistance(dist2, light, dimSteps) {
        const bright = light.brightPx * light.brightPx;
        const dim = (light.brightPx + light.dimPx) * (light.brightPx + light.dimPx);
        if (dist2 <= bright) return "bright";
        if (dimSteps > 0 && dist2 <= dim) return "dim";
        return "unlit";
    }

    function tileLightClass(scene, state, tx, ty, tz) {
        if (state.lightMode === "off") return "unlit";
        let best = "unlit";
        const lights = scene.lights || [];
        const cx = tx * GEOMETRY.tilePx + 24;
        const cy = ty * GEOMETRY.tilePx + 24;
        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];
            if (!lightReaches(scene, state, light, tx, ty, tz)) continue;
            const anchor = lightAnchor(light);
            const dx = cx - anchor.x;
            const dy = cy - anchor.y;
            const cls = classifyDistance(dx * dx + dy * dy, light, state.dimSteps);
            if (cls === "bright") return "bright";
            if (cls === "dim") best = "dim";
        }
        return best;
    }

    function dimValue(px, py, dimSteps) {
        if (dimSteps === 2) return ((px + py) & 1) + 1;
        if (dimSteps === 3) return ((px + 2 * py) % 3) + 1;
        return 0;
    }

    function lightPixels(scene, state, rect) {
        const w = rect.w;
        const h = rect.h;
        const out = new Uint8Array(w * h);
        if (state.lightMode !== "per-pixel") return out;
        const lights = scene.lights || [];
        const usable = [];
        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];
            const anchor = lightAnchor(light);
            usable.push({
                light: light,
                ax: anchor.x,
                ay: anchor.y,
                bright2: light.brightPx * light.brightPx,
                dim2: (light.brightPx + light.dimPx) * (light.brightPx + light.dimPx)
            });
        }
        const layerZ = rect.z === undefined || rect.z === null ? scene.viewZ : rect.z;
        const useDim = state.dimSteps === 2 || state.dimSteps === 3;
        const live = [];
        for (let i = 0; i < usable.length; i++) {
            if (usable[i].light.z === layerZ || state.toggles.glowsLightLower) live.push(usable[i]);
        }
        for (let y = 0; y < h; y++) {
            const py = rect.y + y;
            const row = y * w;
            const ty = Math.floor(py / GEOMETRY.tilePx);
            for (let x = 0; x < w; x++) {
                const px = rect.x + x;
                const tx = Math.floor(px / GEOMETRY.tilePx);
                let cls = 0;
                for (let i = 0; i < live.length; i++) {
                    const item = live[i];
                    if (!lightReaches(scene, state, item.light, tx, ty, layerZ)) continue;
                    const dx = px - item.ax;
                    const dy = py - item.ay;
                    const dist2 = dx * dx + dy * dy;
                    if (dist2 <= item.bright2) {
                        cls = 255;
                        break;
                    }
                    if (useDim && cls === 0 && dist2 <= item.dim2) cls = 2;
                }
                if (cls === 2) cls = dimValue(px, py, state.dimSteps);
                out[row + x] = cls;
            }
        }
        return out;
    }

    function glowSprites(scene, state) {
        if (state.lightMode === "off") return [];
        const lights = scene.lights || [];
        const out = [];
        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];
            const anchor = lightAnchor(light);
            out.push({
                id: light.id,
                slot: light.kind === "fire" ? GLOW_FIRE : GLOW_TORCH,
                blend: "additive",
                blur: false,
                alpha: "binary",
                radiusPx: light.brightPx,
                x: anchor.x,
                y: anchor.y,
                z: light.z
            });
        }
        return out;
    }

    function scaleSample(screenX, screenY, scale) {
        if (!scaleAllowed(scale)) return null;
        if (!Number.isInteger(screenX) || !Number.isInteger(screenY)) return null;
        if (screenX < 0 || screenY < 0) return null;
        return { x: Math.floor(screenX / scale), y: Math.floor(screenY / scale) };
    }

    function nearestExpand(src, width, height, scale) {
        if (!scaleAllowed(scale)) return null;
        const outW = width * scale;
        const outH = height * scale;
        const out = new Uint8Array(outW * outH);
        for (let y = 0; y < outH; y++) {
            const sy = Math.floor(y / scale);
            const srcRow = sy * width;
            const dstRow = y * outW;
            for (let x = 0; x < outW; x++) {
                out[dstRow + x] = src[srcRow + Math.floor(x / scale)];
            }
        }
        return out;
    }

    function fitFrame(screenW, screenH, artW, artH, scale) {
        if (!scaleAllowed(scale)) return { ok: false, reason: "scale" };
        if (!Number.isInteger(screenW) || !Number.isInteger(screenH) || !Number.isInteger(artW) || !Number.isInteger(artH)) {
            return { ok: false, reason: "size" };
        }
        const outW = artW * scale;
        const outH = artH * scale;
        if (outW <= screenW && outH <= screenH) {
            const left = Math.floor((screenW - outW) / 2);
            const top = Math.floor((screenH - outH) / 2);
            const mode = outW === screenW && outH === screenH ? "exact" : "letterbox";
            return {
                ok: true,
                mode: mode,
                scale: scale,
                outW: outW,
                outH: outH,
                letterbox: {
                    l: left,
                    t: top,
                    r: screenW - outW - left,
                    b: screenH - outH - top
                },
                stretched: false
            };
        }
        return {
            ok: true,
            mode: "more-map",
            scale: scale,
            tilesX: Math.max(1, Math.floor(screenW / (GEOMETRY.tilePx * scale))),
            tilesY: Math.max(1, Math.floor(screenH / (GEOMETRY.tilePx * scale))),
            stretched: false
        };
    }

    // Production hint from AS-RENDER-001. The demo does not apply it (default scale stays 1).
    function recommendScale(screenW) {
        if (!Number.isInteger(screenW) || screenW < 1) return null;
        if (screenW >= 2560) return 3;
        if (screenW >= 1920) return 2;
        return 1;
    }

    function paletteTiles(scene, state) {
        const tiles = [];
        for (let i = 0; i < scene.columns.length; i++) {
            const col = scene.columns[i];
            const source = col.color || SWATCHES[0].rgb;
            const rgb = state.toggles.paletteShift ? applyRampAtLayer(source, col.surfaceZ) : [source[0], source[1], source[2]];
            let shown = rgb;
            if (state.lightMode !== "off" && scene.phase === "night") {
                const cls = tileLightClass(scene, state, col.x, col.y, col.surfaceZ);
                if (cls === "unlit") shown = applyNight(rgb);
            }
            tiles.push({ x: col.x, y: col.y, z: col.surfaceZ, rgb: shown, baked: state.toggles.paletteShift === true });
        }
        return tiles;
    }

    function framePlan(scene, state) {
        const plan = {
            projection: GEOMETRY.projection,
            oblique: false,
            filters: null,
            smooth: false,
            blur: false,
            scale: state.scale,
            lightMode: state.lightMode,
            viewZ: scene.viewZ,
            parallax: [],
            faces: cliffFaces(scene, state),
            shadows: dropShadows(scene, state),
            markers: layerMarkers(state),
            cutaway: cutawayCells(scene, state),
            weather: weatherParticles(scene, state),
            units: [],
            hpBars: hpBars(scene, state),
            spells: spellDraws(scene, state),
            selection: selectionView(scene),
            glows: glowSprites(scene, state),
            tiles: paletteTiles(scene, state)
        };
        for (let z = GEOMETRY.zMin; z <= GEOMETRY.zMax; z++) {
            const offset = parallaxOffset(z, scene.viewZ, state);
            plan.parallax.push({ z: z, x: offset.x, y: offset.y });
        }
        for (let i = 0; i < scene.units.length; i++) {
            const unit = scene.units[i];
            const origin = unitOrigin(unit, scene, state);
            plan.units.push({ id: unit.id, x: origin.x, y: origin.y, z: origin.z, quarter: unit.quarter });
        }
        assertWholePixels(plan);
        return plan;
    }

    function assertWholePixels(value) {
        const bad = [];
        walkPixels(value, "", bad);
        if (bad.length) throw new Error("fractional pixel " + bad.slice(0, 3).join(", "));
    }

    function walkPixels(value, path, bad) {
        if (typeof value === "number") {
            if (!Number.isInteger(value)) bad.push(path || "number");
            return;
        }
        if (!value || typeof value !== "object") return;
        if (typeof value.length === "number" && typeof value !== "string") {
            for (let i = 0; i < value.length; i++) walkPixels(value[i], path + "[" + i + "]", bad);
            return;
        }
        const keys = Object.keys(value);
        for (let i = 0; i < keys.length; i++) walkPixels(value[keys[i]], path + "." + keys[i], bad);
    }

    function fnvBytes(seed, bytes) {
        let h = seed >>> 0;
        for (let i = 0; i < bytes.length; i++) {
            h ^= bytes[i];
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h >>> 0;
    }

    function shadowMask(scene, state, width, height) {
        const mask = new Uint8Array(width * height);
        const bands = dropShadows(scene, state);
        for (let i = 0; i < bands.length; i++) {
            const band = bands[i];
            for (let y = 0; y < band.h; y++) {
                const py = band.y + y;
                if (py < 0 || py >= height) continue;
                for (let x = 0; x < band.w; x++) {
                    const px = band.x + x;
                    if (px < 0 || px >= width) continue;
                    mask[py * width + px] = ((px + py) & 1) === 0 ? 1 : 0;
                }
            }
        }
        return mask;
    }

    function rasterFrame(scene, state) {
        const width = scene.width * GEOMETRY.tilePx;
        const height = scene.height * GEOMETRY.tilePx;
        let bytes = 0;
        let checksum = 2166136261;
        framePlan(scene, state);
        const lightZs = [];
        if (state.lightMode !== "off") {
            if (state.toggles.glowsLightLower) {
                for (let z = scene.viewZ; z >= GEOMETRY.zMin; z--) lightZs.push(z);
            } else {
                lightZs.push(scene.viewZ);
            }
        }
        if (state.lightMode === "per-pixel") {
            for (let i = 0; i < lightZs.length; i++) {
                const buf = lightPixels(scene, state, { x: 0, y: 0, w: width, h: height, z: lightZs[i] });
                bytes += buf.length;
                checksum = fnvBytes(checksum, buf);
            }
        } else if (state.lightMode === "per-tile") {
            const buf = new Uint8Array(scene.width * scene.height * lightZs.length);
            for (let i = 0; i < lightZs.length; i++) {
                const z = lightZs[i];
                const base = i * scene.width * scene.height;
                for (let y = 0; y < scene.height; y++) {
                    for (let x = 0; x < scene.width; x++) {
                        const cls = tileLightClass(scene, state, x, y, z);
                        buf[base + y * scene.width + x] = cls === "bright" ? 255 : cls === "dim" ? 1 : 0;
                    }
                }
            }
            bytes += buf.length;
            checksum = fnvBytes(checksum, buf);
        }
        if (state.toggles.dropShadows) {
            const mask = shadowMask(scene, state, width, height);
            bytes += mask.length;
            checksum = fnvBytes(checksum, mask);
        }
        if (state.toggles.paletteShift) {
            const buf = new Uint8Array(scene.columns.length * 3);
            for (let i = 0; i < scene.columns.length; i++) {
                const col = scene.columns[i];
                const source = col.color || SWATCHES[0].rgb;
                const rgb = applyRampAtLayer(source, col.surfaceZ);
                buf[i * 3] = rgb[0];
                buf[i * 3 + 1] = rgb[1];
                buf[i * 3 + 2] = rgb[2];
            }
            bytes += buf.length;
            checksum = fnvBytes(checksum, buf);
        }
        if (state.toggles.ditheredCutaways) {
            const buf = new Uint8Array(width * height);
            const cells = cutawayCells(scene, state);
            for (let i = 0; i < cells.length; i++) {
                const cell = cells[i];
                for (let y = 0; y < cell.h; y++) {
                    for (let x = 0; x < cell.w; x++) {
                        const px = cell.x + x;
                        const py = cell.y + y;
                        buf[py * width + px] = ((px + py) & 1) === 0 ? 1 : 0;
                    }
                }
            }
            bytes += buf.length;
            checksum = fnvBytes(checksum, buf);
        }
        if (state.scale > 1) {
            const src = new Uint8Array(width * height);
            for (let i = 0; i < src.length; i += 48) src[i] = (i / 48) & 255;
            const expanded = nearestExpand(src, width, height, state.scale);
            bytes += expanded.length;
            checksum = fnvBytes(checksum, expanded);
        }
        return { bufferBytes: bytes, checksum: checksum };
    }

    function scanLegacyLayerFeet(files) {
        const flags = [];
        const world = files["game/js/plugins/DEUS_World.js"] || "";
        if (/Z_STEP_FEET:\s*10/.test(world)) {
            flags.push({
                file: "game/js/plugins/DEUS_World.js",
                symbol: "UF.Space.Z_STEP_FEET",
                value: "10",
                rule: "A9c item 26: 1 layer = 5 ft = 48 px"
            });
        }
        if (/STRATA_PER_LAYER:\s*5/.test(world) && /STRATUM_FEET:\s*2/.test(world)) {
            flags.push({
                file: "game/js/plugins/DEUS_World.js",
                symbol: "UF.Space.STRATA_PER_LAYER*STRATUM_FEET",
                value: "5*2=10",
                rule: "A9c item 29: 4 quarters of 12 px, not 5 strata of 2 ft"
            });
        }
        const levels = files["game/js/plugins/DEUS_Levels.js"] || "";
        if (/a level is 10 ft/.test(levels) || /const STRATA = 5/.test(levels)) {
            flags.push({
                file: "game/js/plugins/DEUS_Levels.js",
                symbol: "STRATA",
                value: "5",
                rule: "DEUS_Levels still stores five 2 ft strata, so a level is 10 ft"
            });
        }
        const geo = files["art/catalogue/geometry.json"] || "";
        if (/"layerFt":\s*10/.test(geo)) {
            flags.push({
                file: "art/catalogue/geometry.json",
                symbol: "layerFt",
                value: "10",
                rule: "Catalogue still records layerFt 10 and layerPx 96, not 5 ft and 48 px"
            });
        }
        return flags;
    }

    const LEGACY_PATHS = Object.freeze([
        "game/js/plugins/DEUS_World.js",
        "game/js/plugins/DEUS_Levels.js",
        "art/catalogue/geometry.json"
    ]);

    const api = {
        GEOMETRY: GEOMETRY,
        TOGGLE_NAMES: TOGGLE_NAMES,
        LIGHT_MODES: LIGHT_MODES,
        SCALES: SCALES,
        CLIFF_SLOT: CLIFF_SLOT,
        WALL_SLOT: WALL_SLOT,
        RAMP_SLOT: RAMP_SLOT,
        RETIRED_SLOTS: RETIRED_SLOTS,
        GLOW_TORCH: GLOW_TORCH,
        GLOW_FIRE: GLOW_FIRE,
        SWATCHES: SWATCHES,
        UI_HP: UI_HP,
        LEGACY_PATHS: LEGACY_PATHS,
        defaultState: defaultState,
        isDefaultState: isDefaultState,
        setToggle: setToggle,
        scaleAllowed: scaleAllowed,
        setScale: setScale,
        setLightMode: setLightMode,
        setBlur: setBlur,
        setDayLength: setDayLength,
        dayLengthFraction: dayLengthFraction,
        setDimSteps: setDimSteps,
        setCamera: setCamera,
        setParallaxStep: setParallaxStep,
        rampParams: rampParams,
        bakeAllRamps: bakeAllRamps,
        metrics: metrics,
        idealRamp: idealRamp,
        applyRamp: applyRamp,
        applyRampAtLayer: applyRampAtLayer,
        bakeSwatch: bakeSwatch,
        bakeSwatchBook: bakeSwatchBook,
        nightParams: nightParams,
        applyNight: applyNight,
        columnAt: columnAt,
        surfacePx: surfacePx,
        isOpen: isOpen,
        cliffFaces: cliffFaces,
        dropShadows: dropShadows,
        shadowCoverage: shadowCoverage,
        parallaxOffset: parallaxOffset,
        cameraEase: cameraEase,
        unitOrigin: unitOrigin,
        hpBars: hpBars,
        spellDraws: spellDraws,
        selectionView: selectionView,
        layerMarkers: layerMarkers,
        cutawayCells: cutawayCells,
        cutawayCoverage: cutawayCoverage,
        weatherParticles: weatherParticles,
        lightAnchor: lightAnchor,
        lightReaches: lightReaches,
        tileLightClass: tileLightClass,
        lightPixels: lightPixels,
        glowSprites: glowSprites,
        scaleSample: scaleSample,
        nearestExpand: nearestExpand,
        fitFrame: fitFrame,
        recommendScale: recommendScale,
        framePlan: framePlan,
        rasterFrame: rasterFrame,
        scanLegacyLayerFeet: scanLegacyLayerFeet
    };

    if (typeof module !== "undefined" && module.exports) module.exports = api;
    root.DEUS = root.DEUS || {};
    root.DEUS.DepthCues = api;
    if (root.UF) root.UF.DepthCues = api;
})(typeof window !== "undefined" ? window : globalThis);
