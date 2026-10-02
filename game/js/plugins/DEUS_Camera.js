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
    const MAX_ZOOM = 2.00;
    const DEFAULT_ZOOM = 1.00;
    const LEVELS = [0.50, 1.00, 2.00];
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

        /** Returns current active zoom scale (0.5, 1.0, or 2.0) */
        zoom: () => currentZoom,

        /** Returns current level index (0 = 0.5x, 1 = 1.0x, 2 = 2.0x) */
        level: () => {
            let best = 1, diff = 999;
            for (let i = 0; i < LEVELS.length; i++) {
                const d = Math.abs(LEVELS[i] - currentZoom);
                if (d < diff) { diff = d; best = i; }
            }
            return best;
        },

        /** Set discrete level index (0 = 0.5x, 1 = 1.0x, 2 = 2.0x) */
        setLevel(i) {
            i = Math.max(0, Math.min(LEVELS.length - 1, i | 0));
            return this.setZoom(LEVELS[i]);
        },

        /** Set zoom scale (clamped to 0.50x .. 2.00x). Keeps center point fixed. */
        setZoom(scale, emitEvent = true) {
            const raw = Number(scale);
            if (isNaN(raw)) return false;
            const val = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(raw * 1000) / 1000));
            if (Math.abs(currentZoom - val) < 0.0001) return false;

            const onMap = window.$gameMap && $gameMap.mapId() > 0 && typeof $gameMap.displayX === "function" && window.$dataMap;
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

        zoomOut() {
            const idx = this.level();
            if (idx > 0) return this.setLevel(idx - 1);
            return false;
        },

        zoomIn() {
            const idx = this.level();
            if (idx < LEVELS.length - 1) return this.setLevel(idx + 1);
            return false;
        },

        resetZoom() {
            return this.setLevel(1);
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
        if (this._ufDepth && this._ufLastDepthZoom !== z) {
            this._ufLastDepthZoom = z;
            this._ufDepth._maskX = NaN;
            this._ufDepth._maskCols = -1;
            for (const p of this._ufDepth.planes) {
                p._entityDirty = true;
                if (p._tilemap) {
                    p._tilemap._needsRepaint = true;
                    p._tilemap.refresh();
                }
            }
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

    const CAL_W = 192;
    const CAL_H = 62;
    const MIN_W = 100;
    const MIN_H = 24;

    const PRESETS = [
        { label: "0.5x", val: 0.50, sub: "Out" },
        { label: "1.0x", val: 1.00, sub: "Normal" },
        { label: "2.0x", val: 2.00, sub: "In" }
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

            // Title Bar (Row 0, y: 1..20)
            b.fillRect(1, 1, CAL_W - 2, 20, "rgba(15, 23, 42, 0.90)");
            b.fontSize = 11;
            b.fontBold = true;
            b.outlineColor = "rgba(0, 0, 0, 0.95)";
            b.outlineWidth = 3;
            b.textColor = "#fbbf24"; // amber gold
            b.drawText(`ZOOM: ${z.toFixed(1)}x`, 8, 1, 120, 18, "left");

            // Minimize [_] button in title bar
            this.drawButton(CAL_W - 24, 2, 20, 16, "—", "#94a3b8", "rgba(30, 41, 59, 0.70)", "rgba(71, 85, 105, 0.60)", 10);

            // Three Discrete Zoom Option Buttons (Row 1, y: 24..54)
            const btnW = 56;
            const btnH = 30;
            const btnY = 24;
            const startX = 8;
            const gap = 4;

            for (let i = 0; i < PRESETS.length; i++) {
                const p = PRESETS[i];
                const bx = startX + i * (btnW + gap);
                const active = Math.abs(z - p.val) < 0.015;
                const bg = active ? "rgba(14, 165, 233, 0.45)" : "rgba(15, 23, 42, 0.75)";
                const border = active ? "#38bdf8" : "rgba(71, 85, 105, 0.50)";
                const textCol = active ? "#ffffff" : "#94a3b8";

                b.fillRect(bx, btnY, btnW, btnH, bg);
                b.strokeRect(bx, btnY, btnW, btnH, border);
                if (active) {
                    b.fillRect(bx + 1, btnY + 1, btnW - 2, 1, "rgba(255, 255, 255, 0.50)");
                }

                b.fontSize = 11;
                b.fontBold = active;
                b.textColor = textCol;
                b.drawText(p.label, bx, btnY + 1, btnW, 15, "center");

                b.fontSize = 9;
                b.fontBold = false;
                b.textColor = active ? "#fde047" : "#64748b";
                b.drawText(p.sub, bx, btnY + 15, btnW, 13, "center");
            }
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

            // Button Clicks
            if (TouchInput.isTriggered() && isOver) {
                // Title bar: Minimize [_] button
                if (lx >= CAL_W - 26 && lx <= CAL_W - 2 && ly >= 1 && ly <= 20) {
                    this._minimized = true;
                    Camera.sliderMinimized = true;
                    this.redraw();
                    SoundManager.playCursor();
                    TouchInput.clear();
                    return;
                }

                // 3 Discrete Preset Buttons (Row 1, y: 24..56)
                const btnW = 56;
                const startX = 8;
                const gap = 4;
                if (ly >= 24 && ly <= 56) {
                    for (let i = 0; i < PRESETS.length; i++) {
                        const bx = startX + i * (btnW + gap);
                        if (lx >= bx && lx < bx + btnW) {
                            Camera.setLevel(i);
                            SoundManager.playCursor();
                            TouchInput.clear();
                            return;
                        }
                    }
                }

                // Consumed click on HUD body
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

            // 1. Verify zoom limits and 3 discrete levels
            t.check("min_zoom_0_5", Camera.MIN_ZOOM === 0.50, `Camera.MIN_ZOOM is ${Camera.MIN_ZOOM}`);
            t.check("max_zoom_2_0", Camera.MAX_ZOOM === 2.00, `Camera.MAX_ZOOM is ${Camera.MAX_ZOOM}`);
            t.check("levels_count_3", Camera.levels.length === 3, `Camera.levels length is ${Camera.levels.length}`);
            t.check("levels_strictly_3", Camera.levels[0] === 0.50 && Camera.levels[1] === 1.00 && Camera.levels[2] === 2.00, "levels strictly [0.5, 1.0, 2.0]");

            // 2. Test discrete level switching
            Camera.setLevel(0);
            t.check("setLevel_0_0_5x", Math.abs(Camera.zoom() - 0.50) < 0.001, `setLevel(0) is ${Camera.zoom()}`);
            Camera.setLevel(1);
            t.check("setLevel_1_1_0x", Math.abs(Camera.zoom() - 1.00) < 0.001, `setLevel(1) is ${Camera.zoom()}`);
            Camera.setLevel(2);
            t.check("setLevel_2_2_0x", Math.abs(Camera.zoom() - 2.00) < 0.001, `setLevel(2) is ${Camera.zoom()}`);

            // 3. Test zoomIn / zoomOut stepping across the 3 options
            Camera.setLevel(0); // at 0.5x
            Camera.zoomIn();    // -> 1.0x
            t.check("zoomIn_from_0_5_to_1_0", Math.abs(Camera.zoom() - 1.00) < 0.001, `zoomIn -> ${Camera.zoom()}`);
            Camera.zoomIn();    // -> 2.0x
            t.check("zoomIn_from_1_0_to_2_0", Math.abs(Camera.zoom() - 2.00) < 0.001, `zoomIn -> ${Camera.zoom()}`);
            Camera.zoomIn();    // clamped at 2.0x
            t.check("zoomIn_clamped_at_2_0", Math.abs(Camera.zoom() - 2.00) < 0.001, `zoomIn clamped -> ${Camera.zoom()}`);

            Camera.zoomOut();   // -> 1.0x
            t.check("zoomOut_from_2_0_to_1_0", Math.abs(Camera.zoom() - 1.00) < 0.001, `zoomOut -> ${Camera.zoom()}`);
            Camera.zoomOut();   // -> 0.5x
            t.check("zoomOut_from_1_0_to_0_5", Math.abs(Camera.zoom() - 0.50) < 0.001, `zoomOut -> ${Camera.zoom()}`);
            Camera.zoomOut();   // clamped at 0.5x
            t.check("zoomOut_clamped_at_0_5", Math.abs(Camera.zoom() - 0.50) < 0.001, `zoomOut clamped -> ${Camera.zoom()}`);

            // Reset back to 1.0x
            Camera.resetZoom();
            t.check("resetZoom_1x", Math.abs(Camera.zoom() - 1.00) < 0.001, `resetZoom is ${Camera.zoom()}`);

            const expectedCols = Math.round((Graphics.width / $gameMap.tileWidth()) * 16) / 16;
            t.check("screen_cols_1x", Math.abs($gameMap.screenTileX() - expectedCols) < 0.01,
                `screenTileX is ${$gameMap.screenTileX()} (expected ${expectedCols})`);

            const mx = $gameMap.canvasToMapX(Graphics.width / 2), my = $gameMap.canvasToMapY(Graphics.height / 2);
            const ex = $gameMap.roundX(Math.floor($gameMap.displayX() + Graphics.width / 2 / $gameMap.tileWidth()));
            const ey = $gameMap.roundY(Math.floor($gameMap.displayY() + Graphics.height / 2 / $gameMap.tileHeight()));
            t.check("mouse_mapping_1x", mx === ex && my === ey, `canvas center -> cell (${mx},${my}), expected (${ex},${ey})`);

            // 4. Verify HUD sprite exists and is attached
            const scene = SceneManager._scene;
            const slider = scene && (scene._deusZoomSlider || scene._deusScaleCalibrator);
            t.check("slider_hud_exists", !!slider && slider instanceof Sprite_UFZoomSlider, "Zoom HUD sprite instantiated");
            t.check("slider_hud_visible", !!slider && slider.visible, "Zoom HUD sprite is visible");

            t.screenshot("zoom_3_options");
            await t.waitFrames(5);
        });
    }


})();
