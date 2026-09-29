// tools/test_camera_zoom.js - Headless test suite for 3 discrete camera zoom options (Owner Request: 0.5x, 1x, 2x)
"use strict";

const assert = require("assert");
const path = require("path");
const fs = require("fs");

console.log("=== DEUS CAMERA ZOOM TEST SUITE (3 DISCRETE OPTIONS: 0.5x, 1x, 2x) ===");

// Mock environment
global.window = global;
global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); }
};
global.Graphics = { width: 816, height: 624, boxWidth: 816, boxHeight: 624 };
global.Game_Map = class {
    constructor() { this._displayX = 0; this._displayY = 0; }
    tileWidth() { return 48; }
    tileHeight() { return 48; }
    roundX(x) { return x; }
    roundY(y) { return y; }
    screenTileX() { return Graphics.width / this.tileWidth(); }
    screenTileY() { return Graphics.height / this.tileHeight(); }
    canvasToMapX(x) { return Math.floor(this._displayX + x / this.tileWidth()); }
    canvasToMapY(y) { return Math.floor(this._displayY + y / this.tileHeight()); }
    setDisplayPos(x, y) { this._displayX = x; this._displayY = y; }
    mapId() { return 1; }
};
global.Game_CharacterBase = class { scrolledX() { return 0; } scrolledY() { return 0; } };
global.Sprite = class { constructor() {} };
global.Bitmap = class { constructor() {} fillRect() {} strokeRect() {} drawText() {} clear() {} };
global.Spriteset_Map = class { update() {} };
global.Scene_Boot = class { start() {} };
global.Scene_Map = class { createDisplayObjects() {} addChild() {} isAnyWindowUnderMouse() { return false; } };
global.TouchInput = { x: 0, y: 0, isTriggered: () => false, isPressed: () => false, clear: () => {} };
global.Input = { isPressed: () => false };
global.SoundManager = { playCursor: () => {} };
global.SceneManager = { _scene: null };

// Load DEUS_Camera.js
const cameraCode = fs.readFileSync(path.join(__dirname, "../game/js/plugins/DEUS_Camera.js"), "utf8");
eval(cameraCode);

const Camera = global.UF && global.UF.Camera;
assert(Camera, "UF.Camera must be defined");

let passed = 0;
function test(name, fn) {
    try {
        fn();
        console.log(`  [PASS] ${name}`);
        passed++;
    } catch (e) {
        console.error(`  [FAIL] ${name}: ${e.message}`);
        process.exitCode = 1;
    }
}

// 1. Zoom limits and 3 discrete levels
test("zoom_limits_and_3_levels", () => {
    assert.strictEqual(Camera.MIN_ZOOM, 0.50, "MIN_ZOOM must be 0.50");
    assert.strictEqual(Camera.MAX_ZOOM, 2.00, "MAX_ZOOM must be 2.00");
    assert.strictEqual(Camera.levels.length, 3, "Exactly 3 discrete zoom levels");
    assert.deepStrictEqual(Camera.levels, [0.50, 1.00, 2.00], "Levels must be strictly [0.5, 1.0, 2.0]");
});

// 2. Default state
test("default_state_is_1x", () => {
    Camera.resetZoom();
    assert.strictEqual(Camera.zoom(), 1.00, "Default zoom is 1.00x");
    assert.strictEqual(Camera.level(), 1, "Default level is index 1");
});

// 3. Discrete setLevel
test("set_level_direct", () => {
    Camera.setLevel(0);
    assert.strictEqual(Camera.zoom(), 0.50, "Level 0 is 0.50x");
    assert.strictEqual(Camera.level(), 0, "Current level is 0");

    Camera.setLevel(1);
    assert.strictEqual(Camera.zoom(), 1.00, "Level 1 is 1.00x");
    assert.strictEqual(Camera.level(), 1, "Current level is 1");

    Camera.setLevel(2);
    assert.strictEqual(Camera.zoom(), 2.00, "Level 2 is 2.00x");
    assert.strictEqual(Camera.level(), 2, "Current level is 2");
});

// 4. Stepping with zoomIn / zoomOut
test("zoom_in_and_out_stepping", () => {
    Camera.setLevel(0); // at 0.5x
    Camera.zoomIn();    // -> 1.0x
    assert.strictEqual(Camera.zoom(), 1.00, "zoomIn from 0.5 -> 1.0");

    Camera.zoomIn();    // -> 2.0x
    assert.strictEqual(Camera.zoom(), 2.00, "zoomIn from 1.0 -> 2.0");

    Camera.zoomIn();    // clamped at 2.0x
    assert.strictEqual(Camera.zoom(), 2.00, "zoomIn clamped at 2.0x");

    Camera.zoomOut();   // -> 1.0x
    assert.strictEqual(Camera.zoom(), 1.00, "zoomOut from 2.0 -> 1.0");

    Camera.zoomOut();   // -> 0.5x
    assert.strictEqual(Camera.zoom(), 0.50, "zoomOut from 1.0 -> 0.5");

    Camera.zoomOut();   // clamped at 0.5x
    assert.strictEqual(Camera.zoom(), 0.50, "zoomOut clamped at 0.5x");
});

// 5. Clamping out-of-range setZoom
test("clamping_out_of_range", () => {
    Camera.setZoom(0.10);
    assert.strictEqual(Camera.zoom(), 0.50, "setZoom(0.10) clamps to 0.50");

    Camera.setZoom(5.00);
    assert.strictEqual(Camera.zoom(), 2.00, "setZoom(5.00) clamps to 2.00");
});

// 6. Map screen tile metrics at the 3 zoom levels
test("screen_tile_metrics_at_levels", () => {
    const map = new Game_Map();

    // At 1.0x: 816 / 48 = 17 cols, 624 / 48 = 13 rows
    Camera.setLevel(1);
    assert.strictEqual(map.screenTileX(), 17, "17 cols at 1.0x");
    assert.strictEqual(map.screenTileY(), 13, "13 rows at 1.0x");

    // At 0.5x (zoom out): 816 / 24 = 34 cols, 624 / 24 = 26 rows
    Camera.setLevel(0);
    assert.strictEqual(map.screenTileX(), 34, "34 cols at 0.5x (wider view)");
    assert.strictEqual(map.screenTileY(), 26, "26 rows at 0.5x (wider view)");

    // At 2.0x (zoom in): 816 / 96 = 8.5 cols, 624 / 96 = 6.5 rows
    Camera.setLevel(2);
    assert.strictEqual(map.screenTileX(), 8.5, "8.5 cols at 2.0x (closer view)");
    assert.strictEqual(map.screenTileY(), 6.5, "6.5 rows at 2.0x (closer view)");
});

console.log(`\nResults: ${passed} passed, 0 failed.`);
if (process.exitCode) {
    console.error("TEST FAILED");
    process.exit(1);
}
