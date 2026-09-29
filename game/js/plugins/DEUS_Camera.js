//=============================================================================
// DEUS_Camera.js - Dynamic 0.5x to 3.0x view scale & interactive zoom slider HUD
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Camera] Dynamic 0.5x to 3.0x view scale with interactive zoom slider HUD, mouse wheel, presets, and tilemap scaling.
 * @author DEUS project
 * @orderAfter DEUS_ColonyOverseer
 *
 * @help
 * Camera View Scale:
 * - Dynamic zoom range from 0.5x (strategic wide view) to 3.0x (extreme pixel closeup).
 * - Interactive on-screen slider HUD with steppers, presets, dragging, and minimize toggle.
 * - Mouse wheel zooming and keyboard shortcuts (+ / - / 0).
 * - Real-time tilemap scaling and viewport culling.
 *
 * API:
 *   UF.Camera.zoom()          -> current float zoom (0.50 .. 3.00)
 *   UF.Camera.setZoom(scale)  -> sets zoom clamped to [0.5, 3.0]
 *   UF.Camera.zoomIn(step)    -> zoom in by step (default 0.05)
 *   UF.Camera.zoomOut(step)   -> zoom out by step (default 0.05)
 *   UF.Camera.resetZoom()     -> reset zoom to 1.0x
 *   UF.Camera.toggleSlider()  -> toggle slider HUD visibility
 *   UF.Camera.levels          -> [1.0, 0.75, 0.5] for discrete level compatibility
 *   UF.Camera.level()         -> current level index
 *   UF.Camera.setLevel(i)     -> sets zoom to levels[i]
 */

(() => {
    "use strict";

    const MIN_ZOOM = 0.50;
    const MAX_ZOOM = 3.00;
    const DEFAULT_ZOOM = 1.00;
    const LEVELS = [1.00, 0.75, 0.50];
    const WHEEL_COOLDOWN = 4; // frames between wheel zoom ticks

    const STORAGE_KEY = "deus_zoom_scale";
    const LEGACY_STORAGE_KEY = "deus_canonical_view_scale";

    let savedZoom = DEFAULT_ZOOM;
    try {
        if (typeof localStorage !== "undefined") {
            const s = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
            if (s && !isNaN(Number(s))) {
                const val = Number(s);
                if (val >= MIN_ZOOM && val <= MAX_ZOOM) {
                    savedZoom = Math.round(val * 1000) / 1000;
                }
            }
        }
    } catch (e) {}

    let currentZoom = savedZoom;
    let wheelCooldown = 0;

    const Camera = {
        MIN_ZOOM,
        MAX_ZOOM,
        DEFAULT_ZOOM,
        levels: LEVELS.slice(),
        officialScale: DEFAULT_ZOOM,
        sliderVisible: true,
        calibratorVisible: true,
        sliderX: undefined,
        sliderY: undefined,
        sliderMinimized: false,

        /** Returns current active zoom scale (clamped to 0.5 .. 3.0) */
        zoom: () => currentZoom,

        /** Returns current level index (or closest matching index in levels) */
        level: () => {
            let best = 0, diff = 999;
            for (let i = 0; i < LEVELS.length; i++) {
                const d = Math.abs(LEVELS[i] - currentZoom);
                if (d < diff) { diff = d; best = i; }
            }
            return best;
        },

        /** Set discrete level index (0 = 1.0x, 1 = 0.75x, 2 = 0.5x) */
        setLevel(i) {
            i = Math.max(0, Math.min(LEVELS.length - 1, i | 0));
            return this.setZoom(LEVELS[i]);
        },

        /** Set continuous zoom scale (clamped to 0.50x .. 3.00x). Keeps center point fixed. */
        setZoom(scale, emitEvent = true) {
            const raw = Number(scale);
            if (isNaN(raw)) return false;
            const val = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(raw * 1000) / 1000));
            if (Math.abs(currentZoom - val) < 0.0001) return false;

            const onMap = window.$gameMap && $gameMap.mapId() > 0 && typeof $gameMap.displayX === "function" && $dataMap;
            const cx = onMap ? $gameMap.displayX() + $gameMap.screenTileX() / 2 : 0;
            const cy = onMap ? $gameMap.displayY() + $gameMap.screenTileY() / 2 : 0;

            currentZoom = val;
            this.officialScale = val;

            try {
                if (typeof localStorage !== "undefined") {
                    localStorage.setItem(STORAGE_KEY, String(val));
                }
            } catch (e) {}

            if (onMap) {
                $gameMap.setDisplayPos(cx - $gameMap.screenTileX() / 2, cy - $gameMap.screenTileY() / 2);
            }

            // Immediately adjust tilemap if present
            if (window.SceneManager && SceneManager._scene && SceneManager._scene._spriteset && SceneManager._scene._spriteset.updateUfZoom) {
                SceneManager._scene._spriteset.updateUfZoom();
            }

            if (emitEvent && window.UF && UF.Events && UF.Events.emit) {
                UF.Events.emit("camera:zoomChanged", val);
            }
            return true;
        },

        zoomOut(step = 0.05) {
            return this.setZoom(this.zoom() - step);
        },

        zoomIn(step = 0.05) {
            return this.setZoom(this.zoom() + step);
        },

        resetZoom() {
            return this.setZoom(DEFAULT_ZOOM);
        },

        toggleSlider() {
            this.sliderVisible = !this.sliderVisible;
            this.calibratorVisible = this.sliderVisible;
            const scene = SceneManager._scene;
            if (scene && scene._deusZoomSlider) {
                scene._deusZoomSlider.visible = this.sliderVisible;
            }
            return this.sliderVisible;
        },

        toggleCalibrator() {
            return this.toggleSlider();
        },

        saveOfficialScale(val) {
            return this.setZoom(val);
        },

        clearOfficialScale() {
            return this.resetZoom();
        }
    };

    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Camera = Camera;

    //-------------------------------------------------------------------------
    // Map math: screen tile metrics and canvas-to-map mapping scaled by zoom

    const _Game_Map_screenTileX = Game_Map.prototype.screenTileX;
    Game_Map.prototype.screenTileX = function() {
        return _Game_Map_screenTileX.call(this) / Camera.zoom();
    };

    const _Game_Map_screenTileY = Game_Map.prototype.screenTileY;
    Game_Map.prototype.screenTileY = function() {
        return _Game_Map_screenTileY.call(this) / Camera.zoom();
    };

    const _Game_Map_canvasToMapX = Game_Map.prototype.canvasToMapX;
    Game_Map.prototype.canvasToMapX = function(x) {
        return _Game_Map_canvasToMapX.call(this, x / Camera.zoom());
    };

    const _Game_Map_canvasToMapY = Game_Map.prototype.canvasToMapY;
    Game_Map.prototype.canvasToMapY = function(y) {
        return _Game_Map_canvasToMapY.call(this, y / Camera.zoom());
    };

    // Replaced: same as core, but measured in zoomed-out screen space, so events
    // anywhere in the visible area keep running their movement and updates.
    Game_CharacterBase.prototype.isNearTheScreen = function() {
        const z = Camera.zoom();
        const gw = Graphics.width / z;
        const gh = Graphics.height / z;
        const tw = $gameMap.tileWidth();
        const th = $gameMap.tileHeight();
        const px = this.scrolledX() * tw + tw / 2 - gw / 2;
        const py = this.scrolledY() * th + th / 2 - gh / 2;
        return px >= -gw && px <= gw && py >= -gh && py <= gh;
    };

    //-------------------------------------------------------------------------
    // Drawing: scale the tilemap (it holds the ground and all character sprites)

    const _Spriteset_Map_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        this.updateUfZoom();
        _Spriteset_Map_update.call(this);
    };

    Spriteset_Map.prototype.updateUfZoom = function() {
        const tilemap = this._tilemap;
        if (!tilemap) return;
        const z = Camera.zoom();
        if (Math.abs(tilemap.scale.x - z) > 1e-6 || Math.abs(tilemap.scale.y - z) > 1e-6) {
            tilemap.scale.set(z, z);
        }
        const w = Math.ceil(Graphics.width / z);
        const h = Math.ceil(Graphics.height / z);
        if (tilemap.width !== w || tilemap.height !== h) {
            tilemap.width = w;
            tilemap.height = h;
            tilemap.refresh();
        }
    };

    //-------------------------------------------------------------------------
    // Input handling: Mouse wheel and Keyboard shortcuts for Zoom
    //-------------------------------------------------------------------------

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        this.updateCameraZoomInput();
    };

    Scene_Map.prototype.updateCameraZoomInput = function() {
        if (wheelCooldown > 0) wheelCooldown--;

        // Check if mouse is over another interactive window (e.g. inventory or chat)
        if (this.isAnyWindowActive && this.isAnyWindowActive()) return;

        const isShift = (typeof TouchInput._shiftKey !== "undefined" ? TouchInput._shiftKey : false) || Input.isPressed("shift");
        const step = isShift ? 0.01 : 0.05;

        // Mouse Wheel Zooming
        if (wheelCooldown === 0 && typeof TouchInput.wheelY === "number" && TouchInput.wheelY !== 0) {
            if (TouchInput.wheelY < 0) {
                // Wheel up -> Zoom in
                if (Camera.zoomIn(step)) wheelCooldown = WHEEL_COOLDOWN;
            } else if (TouchInput.wheelY > 0) {
                // Wheel down -> Zoom out
                if (Camera.zoomOut(step)) wheelCooldown = WHEEL_COOLDOWN;
            }
        }
    };

    // Register Keyboard shortcuts in Input.keyMapper if not present
    if (typeof Input !== "undefined" && Input.keyMapper) {
        Input.keyMapper[187] = "zoomIn";       // '=' / '+' key
        Input.keyMapper[107] = "zoomIn";       // Numpad '+'
        Input.keyMapper[189] = "zoomOut";      // '-' / '_' key
        Input.keyMapper[109] = "zoomOut";      // Numpad '-'
        Input.keyMapper[96]  = "zoomReset";    // Numpad '0'
        Input.keyMapper[48]  = "zoomReset";    // '0' key
    }

    const _Scene_Map_updateScene = Scene_Map.prototype.updateScene;
    Scene_Map.prototype.updateScene = function() {
        _Scene_Map_updateScene.call(this);
        if (Input.isTriggered("zoomIn")) {
            Camera.zoomIn(Input.isPressed("shift") ? 0.01 : 0.05);
            SoundManager.playCursor();
        } else if (Input.isTriggered("zoomOut")) {
            Camera.zoomOut(Input.isPressed("shift") ? 0.01 : 0.05);
            SoundManager.playCursor();
        } else if (Input.isTriggered("zoomReset")) {
            Camera.resetZoom();
            SoundManager.playCursor();
        }
    };

    //-------------------------------------------------------------------------
    // Interactive Zoom Slider HUD Sprite: Sprite_UFZoomSlider
    //-------------------------------------------------------------------------

    const CAL_W = 280;
    const CAL_H = 108;
    const MIN_W = 110;
    const MIN_H = 24;

    const PRESETS = [
        { label: "0.5x",  val: 0.50 },
        { label: "0.75x", val: 0.75 },
        { label: "1.0x",  val: 1.00 },
        { label: "1.5x",  val: 1.50 },
        { label: "2.0x",  val: 2.00 },
        { label: "3.0x",  val: 3.00 }
    ];

    class Sprite_UFZoomSlider extends Sprite {
        constructor() {
            const bmp = new Bitmap(CAL_W, CAL_H);
            super(bmp);
            this.width = CAL_W;
            this.height = CAL_H;
            this._calW = CAL_W;
            this._calH = CAL_H;
            this._minW = MIN_W;
            this._minH = MIN_H;
            this.z = 95; // above normal game map layers

            this._minimized = !!Camera.sliderMinimized;
            this._draggingSlider = false;
            this._draggingWindow = false;
            this._dragOffsetX = 0;
            this._dragOffsetY = 0;
            this._lastZoom = -1;

            this.initPosition();
            this.redraw();
        }

        initPosition() {
            if (Camera.sliderX !== undefined && Camera.sliderY !== undefined) {
                this.x = Camera.sliderX;
                this.y = Camera.sliderY;
            } else {
                const gw = (window.Graphics && (Graphics.width || Graphics.boxWidth)) || 816;
                this.x = Math.max(10, gw - CAL_W - 14);
                this.y = 48; // directly beneath top HUD menu bar
            }
        }

        update() {
            super.update();
            this.visible = Camera.sliderVisible;
            if (!this.visible) return;

            const z = Camera.zoom();
            if (z !== this._lastZoom) {
                this.redraw();
            }

            this.handleInteraction();
        }

        redraw() {
            const b = this.bitmap;
            b.clear();

            const z = Camera.zoom();
            this._lastZoom = z;

            if (this._minimized) {
                this.setFrame(0, 0, MIN_W, MIN_H);
                b.fillRect(0, 0, MIN_W, MIN_H, "rgba(8, 12, 20, 0.92)");
                b.strokeRect(0, 0, MIN_W, MIN_H, "rgba(56, 189, 248, 0.85)");
                b.fillRect(1, 1, MIN_W - 2, 1, "rgba(160, 240, 255, 0.40)");

                b.fontSize = 11;
                b.fontBold = true;
                b.outlineColor = "rgba(0, 0, 0, 0.95)";
                b.outlineWidth = 3;
                b.textColor = "#38bdf8";
                b.drawText(`🔍 ${z.toFixed(2)}x ▾`, 4, 1, MIN_W - 8, MIN_H - 2, "center");
                return;
            }

            this.setFrame(0, 0, CAL_W, CAL_H);

            // Window Background & Border
            b.fillRect(0, 0, CAL_W, CAL_H, "rgba(8, 12, 20, 0.94)");
            b.strokeRect(0, 0, CAL_W, CAL_H, "rgba(56, 189, 248, 0.85)");
            b.fillRect(1, 1, CAL_W - 2, 1, "rgba(160, 240, 255, 0.40)");

            // Title Bar (Row 0, y: 1..21)
            b.fillRect(1, 1, CAL_W - 2, 21, "rgba(15, 23, 42, 0.90)");
            b.fontSize = 11;
            b.fontBold = true;
            b.outlineColor = "rgba(0, 0, 0, 0.95)";
            b.outlineWidth = 3;
            b.textColor = "#fbbf24"; // amber gold
            b.drawText(`ZOOM: ${z.toFixed(2)}x`, 10, 2, 140, 18, "left");

            // Reset [1x] button in title bar
            this.drawButton(CAL_W - 54, 2, 24, 18, "1x", "#38bdf8", "rgba(30, 41, 59, 0.70)", "rgba(71, 85, 105, 0.60)", 10);

            // Minimize [_] button in title bar
            this.drawButton(CAL_W - 26, 2, 22, 18, "—", "#94a3b8", "rgba(30, 41, 59, 0.70)", "rgba(71, 85, 105, 0.60)", 10);

            // Stepper & Slider Track (Row 1, y: 28..48)
            // Button [-]
            this.drawButton(8, 28, 24, 20, "−", "#38bdf8");

            // Slider Track
            const trackX = 36, trackY = 34, trackW = 208, trackH = 8;
            b.fillRect(trackX, trackY, trackW, trackH, "rgba(30, 41, 59, 0.95)");
            b.strokeRect(trackX, trackY, trackW, trackH, "rgba(71, 85, 105, 0.70)");

            const ratio = Math.max(0, Math.min(1, (z - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)));
            const fillW = Math.round(ratio * trackW);
            if (fillW > 0) {
                b.fillRect(trackX + 1, trackY + 1, fillW - 1, trackH - 2, "rgba(14, 165, 233, 0.85)");
            }

            // Slider Knob
            const thumbX = Math.round(trackX + ratio * trackW) - 6;
            const thumbY = trackY - 5;
            b.fillRect(thumbX, thumbY, 12, 18, "#ffffff");
            b.strokeRect(thumbX, thumbY, 12, 18, "#38bdf8");
            b.fillRect(thumbX + 5, thumbY + 3, 2, 12, "#0284c7");

            // Button [+]
            this.drawButton(248, 28, 24, 20, "+", "#38bdf8");

            // Preset Buttons (Row 2, y: 54..74)
            const presetBtnW = 40;
            const presetGap = 4;
            const startX = 8;
            for (let i = 0; i < PRESETS.length; i++) {
                const p = PRESETS[i];
                const bx = startX + i * (presetBtnW + presetGap);
                const active = Math.abs(z - p.val) < 0.015;
                const bg = active ? "rgba(14, 165, 233, 0.35)" : "rgba(15, 23, 42, 0.75)";
                const border = active ? "#38bdf8" : "rgba(71, 85, 105, 0.50)";
                const textCol = active ? "#ffffff" : "#94a3b8";

                this.drawButton(bx, 54, presetBtnW, 20, p.label, textCol, bg, border, 10);
            }

            // Metrics Display (Row 3, y: 80..102)
            const tw = window.$gameMap ? $gameMap.tileWidth() : 48;
            const tilePx = Math.round(tw * z);
            const cols = window.$gameMap ? $gameMap.screenTileX().toFixed(1) : (Graphics.width / (tw * z)).toFixed(1);
            const rows = window.$gameMap ? $gameMap.screenTileY().toFixed(1) : (Graphics.height / (tw * z)).toFixed(1);

            b.fontSize = 11;
            b.fontBold = false;
            b.textColor = "#a7f3d0"; // mint green
            b.drawText(`Tile: ${tilePx}px`, 10, 82, 70, 18, "left");

            b.textColor = "#fde047"; // soft yellow
            b.drawText(`Unit: ~${Math.round(44 * z)}px`, 84, 82, 85, 18, "left");

            b.textColor = "#cbd5e1"; // slate light
            b.drawText(`Grid: ${cols}x${rows}`, 174, 82, 96, 18, "right");
        }

        drawButton(x, y, w, h, text, textCol = "#38bdf8", bg = "rgba(15, 23, 42, 0.85)", border = "rgba(71, 85, 105, 0.70)", fontSize = 11) {
            const b = this.bitmap;
            b.fillRect(x, y, w, h, bg);
            b.strokeRect(x, y, w, h, border);
            b.fontSize = fontSize;
            b.fontBold = true;
            b.textColor = textCol;
            b.outlineColor = "rgba(0, 0, 0, 0.95)";
            b.outlineWidth = 3;
            b.drawText(text, x, y, w, h, "center");
        }

        handleInteraction() {
            const w = this._minimized ? MIN_W : CAL_W;
            const h = this._minimized ? MIN_H : CAL_H;
            const mx = TouchInput.x;
            const my = TouchInput.y;
            const lx = mx - this.x;
            const ly = my - this.y;
            const isOver = lx >= 0 && lx < w && ly >= 0 && ly < h;

            // Handle Minimized Click
            if (this._minimized) {
                if (TouchInput.isTriggered() && isOver) {
                    this._minimized = false;
                    Camera.sliderMinimized = false;
                    this.redraw();
                    SoundManager.playCursor();
                    TouchInput.clear();
                }
                return;
            }

            // Window Dragging via Title Bar (ly <= 22)
            if (TouchInput.isTriggered() && isOver && ly <= 22 && lx < CAL_W - 56) {
                this._draggingWindow = true;
                this._dragOffsetX = lx;
                this._dragOffsetY = ly;
            }

            if (this._draggingWindow) {
                if (TouchInput.isPressed()) {
                    const gw = (window.Graphics && (Graphics.width || Graphics.boxWidth)) || 816;
                    const gh = (window.Graphics && (Graphics.height || Graphics.boxHeight)) || 624;
                    this.x = Math.max(0, Math.min(gw - CAL_W, mx - this._dragOffsetX));
                    this.y = Math.max(0, Math.min(gh - CAL_H, my - this._dragOffsetY));
                    Camera.sliderX = this.x;
                    Camera.sliderY = this.y;
                    TouchInput.clear();
                    return;
                } else {
                    this._draggingWindow = false;
                }
            }

            // Slider Track Dragging (trackX: 36, trackW: 208, y: 26..50)
            const trackX = 36, trackW = 208;
            if (TouchInput.isTriggered() && isOver && ly >= 26 && ly <= 50 && lx >= trackX - 8 && lx <= trackX + trackW + 8) {
                this._draggingSlider = true;
            }

            if (this._draggingSlider) {
                if (TouchInput.isPressed()) {
                    const norm = Math.max(0, Math.min(1, (lx - trackX) / trackW));
                    const newZ = MIN_ZOOM + norm * (MAX_ZOOM - MIN_ZOOM);
                    Camera.setZoom(newZ);
                    TouchInput.clear();
                    return;
                } else {
                    this._draggingSlider = false;
                }
            }

            // Button Clicks
            if (TouchInput.isTriggered() && isOver) {
                const isShift = (typeof TouchInput._shiftKey !== "undefined" ? TouchInput._shiftKey : false) || Input.isPressed("shift");
                const step = isShift ? 0.01 : 0.05;

                // Title bar: Reset [1x] button
                if (lx >= CAL_W - 54 && lx <= CAL_W - 30 && ly >= 2 && ly <= 20) {
                    Camera.resetZoom();
                    SoundManager.playCursor();
                    TouchInput.clear();
                    return;
                }

                // Title bar: Minimize [_] button
                if (lx >= CAL_W - 26 && lx <= CAL_W - 4 && ly >= 2 && ly <= 20) {
                    this._minimized = true;
                    Camera.sliderMinimized = true;
                    this.redraw();
                    SoundManager.playCursor();
                    TouchInput.clear();
                    return;
                }

                // [-] Stepper button
                if (lx >= 8 && lx <= 32 && ly >= 28 && ly <= 48) {
                    Camera.zoomOut(step);
                    SoundManager.playCursor();
                    TouchInput.clear();
                    return;
                }

                // [+] Stepper button
                if (lx >= 248 && lx <= 272 && ly >= 28 && ly <= 48) {
                    Camera.zoomIn(step);
                    SoundManager.playCursor();
                    TouchInput.clear();
                    return;
                }

                // Preset Buttons
                const presetBtnW = 40;
                const presetGap = 4;
                const startX = 8;
                if (ly >= 54 && ly <= 74) {
                    for (let i = 0; i < PRESETS.length; i++) {
                        const bx = startX + i * (presetBtnW + presetGap);
                        if (lx >= bx && lx < bx + presetBtnW) {
                            Camera.setZoom(PRESETS[i].val);
                            SoundManager.playCursor();
                            TouchInput.clear();
                            return;
                        }
                    }
                }

                // Consumed click on slider HUD body
                TouchInput.clear();
            }
        }
    }

    Camera.SliderSprite = Sprite_UFZoomSlider;
    Camera.CalibratorSprite = Sprite_UFZoomSlider;
    const Sprite_DeusScaleCalibrator = Sprite_UFZoomSlider;

    // Attach Zoom Slider to Scene_Map
    const _Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function() {
        _Scene_Map_createDisplayObjects.call(this);
        this._deusZoomSlider = new Sprite_UFZoomSlider();
        this._deusScaleCalibrator = this._deusZoomSlider;
        this.addChild(this._deusZoomSlider);
    };

    // Block map interaction when hovering or clicking over Slider HUD
    const _Scene_Map_isAnyWindowUnderMouse = Scene_Map.prototype.isAnyWindowUnderMouse;
    Scene_Map.prototype.isAnyWindowUnderMouse = function() {
        if (_Scene_Map_isAnyWindowUnderMouse && _Scene_Map_isAnyWindowUnderMouse.call(this)) return true;
        const s = this._deusZoomSlider || this._deusScaleCalibrator;
        if (s && s.visible) {
            const w = s._minimized ? s._minW : s._calW;
            const h = s._minimized ? s._minH : s._calH;
            if (TouchInput.x >= s.x && TouchInput.x < s.x + w && TouchInput.y >= s.y && TouchInput.y < s.y + h) {
                return true;
            }
        }
        return false;
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "camera")

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF && window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        UF.Test.suite("camera", async t => {
            // Locate player so view is stable
            if (UF.World && UF.World.state && UF.World.currentArea && UF.World.isStartArea && UF.World.isStartArea(UF.World.currentArea().x, UF.World.currentArea().y)) {
                const off = UF.World.templateOffset();
                $gamePlayer.locate(off.x + 15, off.y + 16);
                await t.waitFrames(5);
            }

            // 1. Verify zoom limits and initial state
            t.check("min_zoom_0_5", Camera.MIN_ZOOM === 0.50, `Camera.MIN_ZOOM is ${Camera.MIN_ZOOM}`);
            t.check("max_zoom_3_0", Camera.MAX_ZOOM === 3.00, `Camera.MAX_ZOOM is ${Camera.MAX_ZOOM}`);
            t.check("zoom_range_valid", Camera.zoom() >= 0.50 && Camera.zoom() <= 3.00, `Camera.zoom() is ${Camera.zoom()}`);

            // 2. Test continuous zoom set
            Camera.setZoom(0.50);
            await t.waitFrames(5);
            t.check("zoom_at_0_5x", Math.abs(Camera.zoom() - 0.50) < 0.001, `Camera.zoom() at min is ${Camera.zoom()}`);

            const scene = SceneManager._scene;
            const tilemap = scene && scene._spriteset && scene._spriteset._tilemap;
            t.check("tilemap_scale_at_0_5x", !!tilemap && Math.abs(tilemap.scale.x - 0.50) < 1e-6,
                `tilemap scale is ${tilemap ? tilemap.scale.x : "null"}`);

            Camera.setZoom(3.00);
            await t.waitFrames(5);
            t.check("zoom_at_3_0x", Math.abs(Camera.zoom() - 3.00) < 0.001, `Camera.zoom() at max is ${Camera.zoom()}`);
            t.check("tilemap_scale_at_3_0x", !!tilemap && Math.abs(tilemap.scale.x - 3.00) < 1e-6,
                `tilemap scale is ${tilemap ? tilemap.scale.x : "null"}`);

            // 3. Test clamping out-of-range values
            Camera.setZoom(0.10);
            t.check("clamped_min_0_5x", Math.abs(Camera.zoom() - 0.50) < 0.001, `Camera.zoom() clamped to ${Camera.zoom()}`);
            Camera.setZoom(5.00);
            t.check("clamped_max_3_0x", Math.abs(Camera.zoom() - 3.00) < 0.001, `Camera.zoom() clamped to ${Camera.zoom()}`);

            // 4. Test zoomIn / zoomOut
            Camera.setZoom(1.00);
            Camera.zoomIn(0.10);
            t.check("zoomIn_step", Math.abs(Camera.zoom() - 1.10) < 0.001, `zoomIn(0.10) -> ${Camera.zoom()}`);
            Camera.zoomOut(0.20);
            t.check("zoomOut_step", Math.abs(Camera.zoom() - 0.90) < 0.001, `zoomOut(0.20) -> ${Camera.zoom()}`);

            // 5. Test discrete levels compatibility
            Camera.setLevel(0);
            t.check("setLevel_0_1x", Math.abs(Camera.zoom() - 1.00) < 0.001, `setLevel(0) is ${Camera.zoom()}`);
            Camera.setLevel(2);
            t.check("setLevel_2_0_5x", Math.abs(Camera.zoom() - 0.50) < 0.001, `setLevel(2) is ${Camera.zoom()}`);

            // 6. Test screen metrics and mouse coordinate mapping at 1x
            Camera.resetZoom();
            await t.waitFrames(5);
            t.check("resetZoom_1x", Math.abs(Camera.zoom() - 1.00) < 0.001, `resetZoom is ${Camera.zoom()}`);

            const expectedCols = Math.round((Graphics.width / $gameMap.tileWidth()) * 16) / 16;
            t.check("screen_cols_1x", Math.abs($gameMap.screenTileX() - expectedCols) < 0.01,
                `screenTileX is ${$gameMap.screenTileX()} (expected ${expectedCols})`);

            const mx = $gameMap.canvasToMapX(Graphics.width / 2), my = $gameMap.canvasToMapY(Graphics.height / 2);
            const ex = $gameMap.roundX(Math.floor($gameMap.displayX() + Graphics.width / 2 / $gameMap.tileWidth()));
            const ey = $gameMap.roundY(Math.floor($gameMap.displayY() + Graphics.height / 2 / $gameMap.tileHeight()));
            t.check("mouse_mapping_1x", mx === ex && my === ey, `canvas center -> cell (${mx},${my}), expected (${ex},${ey})`);

            // 7. Verify slider HUD exists and is attached
            const slider = scene && (scene._deusZoomSlider || scene._deusScaleCalibrator);
            t.check("slider_hud_exists", !!slider && slider instanceof Sprite_UFZoomSlider, "Zoom slider HUD sprite instantiated");
            t.check("slider_hud_visible", !!slider && slider.visible, "Zoom slider HUD sprite is visible");

            // 8. Verify hover over slider blocks map clicks
            if (slider) {
                TouchInput._x = slider.x + 20;
                TouchInput._y = slider.y + 20;
                t.check("slider_blocks_map_clicks", scene.isAnyWindowUnderMouse() === true, "isAnyWindowUnderMouse is true over slider");
            }

            t.screenshot("zoom_slider_1x");
            await t.waitFrames(5);
        });
    }

    // Dynamically load DEUS_Minimap if not already loaded
    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || (!PluginManager._scripts.includes("DEUS_Minimap") && !PluginManager._scripts.includes("DEUS_Minimap.js"))) {
            PluginManager.loadScript("DEUS_Minimap");
        }
    }
})();
