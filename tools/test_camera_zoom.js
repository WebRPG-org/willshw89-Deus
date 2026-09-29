//=============================================================================
// test_camera_zoom.js - Automated Headless Test Suite for DEUS_Camera Zoom Slider
//=============================================================================
"use strict";

const fs = require("fs");
const path = require("path");

console.log("=== DEUS Camera Dynamic Zoom (0.5x - 3.0x) Headless Verification Suite ===");

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
    if (condition) {
        passed++;
        console.log(`PASS camera.${name} - ${detail}`);
        return true;
    } else {
        failed++;
        console.error(`FAIL camera.${name} - ${detail}`);
        return false;
    }
}

// 1. Mock minimal RMMZ browser environment
global.window = global;
global.Graphics = { boxWidth: 816, boxHeight: 624, width: 816, height: 624 };
global.TouchInput = {
    x: 0,
    y: 0,
    wheelY: 0,
    isTriggered: () => false,
    isPressed: () => false,
    clear: () => {}
};
global.Input = {
    keyMapper: {},
    isPressed: () => false,
    isTriggered: () => false
};
global.SoundManager = {
    playCursor: () => {},
    playSave: () => {}
};
global.PluginManager = {
    parameters: () => ({}),
    loadScript: () => {},
    _scripts: []
};

class MockBitmap {
    constructor(w, h) {
        this.width = w;
        this.height = h;
        this.fontSize = 12;
        this.fontBold = false;
        this.textColor = "#ffffff";
        this.outlineColor = "#000000";
        this.outlineWidth = 2;
    }
    clear() {}
    fillRect() {}
    strokeRect() {}
    drawText() {}
}

class MockSprite {
    constructor(bitmap) {
        this.bitmap = bitmap || new MockBitmap(1, 1);
        this.x = 0;
        this.y = 0;
        this.width = bitmap ? bitmap.width : 0;
        this.height = bitmap ? bitmap.height : 0;
        this.scale = { x: 1, y: 1, set(sx, sy) { this.x = sx; this.y = sy; } };
        this.visible = true;
    }
    update() {}
    setFrame(x, y, w, h) { this.width = w; this.height = h; }
}

global.Bitmap = MockBitmap;
global.Sprite = MockSprite;

// Mock Game_Map
function MockGame_Map() {
    this._displayX = 10;
    this._displayY = 10;
}
MockGame_Map.prototype.tileWidth = () => 48;
MockGame_Map.prototype.tileHeight = () => 48;
MockGame_Map.prototype.mapId = () => 1;
MockGame_Map.prototype.displayX = function() { return this._displayX; };
MockGame_Map.prototype.displayY = function() { return this._displayY; };
MockGame_Map.prototype.setDisplayPos = function(x, y) { this._displayX = x; this._displayY = y; };
MockGame_Map.prototype.screenTileX = function() { return Graphics.width / this.tileWidth(); };
MockGame_Map.prototype.screenTileY = function() { return Graphics.height / this.tileHeight(); };
MockGame_Map.prototype.canvasToMapX = function(x) { return Math.floor(this._displayX + x / this.tileWidth()); };
MockGame_Map.prototype.canvasToMapY = function(y) { return Math.floor(this._displayY + y / this.tileHeight()); };
MockGame_Map.prototype.roundX = x => x;
MockGame_Map.prototype.roundY = y => y;

global.Game_Map = MockGame_Map;
global.$gameMap = new MockGame_Map();
global.$dataMap = { width: 100, height: 100 };

// Mock Game_CharacterBase
function MockGame_CharacterBase() {
    this._x = 15;
    this._y = 15;
}
MockGame_CharacterBase.prototype.scrolledX = function() { return this._x - $gameMap.displayX(); };
MockGame_CharacterBase.prototype.scrolledY = function() { return this._y - $gameMap.displayY(); };
MockGame_CharacterBase.prototype.isNearTheScreen = function() {
    const gw = Graphics.width;
    const gh = Graphics.height;
    const tw = $gameMap.tileWidth();
    const th = $gameMap.tileHeight();
    const px = this.scrolledX() * tw + tw / 2 - gw / 2;
    const py = this.scrolledY() * th + th / 2 - gh / 2;
    return px >= -gw && px <= gw && py >= -gh && py <= gh;
};
global.Game_CharacterBase = MockGame_CharacterBase;

// Mock Spriteset_Map
function MockSpriteset_Map() {
    this._tilemap = {
        scale: { x: 1, y: 1, set(x, y) { this.x = x; this.y = y; } },
        width: 816,
        height: 624,
        refreshCalled: false,
        refresh() { this.refreshCalled = true; }
    };
}
MockSpriteset_Map.prototype.update = function() {};
global.Spriteset_Map = MockSpriteset_Map;

// Mock Scene_Map & Scene_Boot
function MockScene_Map() {
    this._children = [];
    this._spriteset = new MockSpriteset_Map();
}
MockScene_Map.prototype.addChild = function(child) { this._children.push(child); };
MockScene_Map.prototype.createDisplayObjects = function() {};
MockScene_Map.prototype.update = function() {};
MockScene_Map.prototype.updateScene = function() {};
MockScene_Map.prototype.isAnyWindowUnderMouse = function() { return false; };
global.Scene_Map = MockScene_Map;

function MockScene_Boot() {}
MockScene_Boot.prototype.start = function() {};
global.Scene_Boot = MockScene_Boot;

global.SceneManager = {
    _scene: new MockScene_Map()
};

// Mock localStorage
const storageStore = {};
global.localStorage = {
    getItem: k => storageStore[k] || null,
    setItem: (k, v) => { storageStore[k] = String(v); },
    removeItem: k => { delete storageStore[k]; }
};

// 2. Load DEUS_Camera.js
const cameraPath = path.resolve(__dirname, "../game/js/plugins/DEUS_Camera.js");
require(cameraPath);

const Camera = window.UF && window.UF.Camera;

// 3. Run verification tests
console.log("\n--- Testing Camera Constants & Defaults ---");
check("constants_exist", !!Camera, "UF.Camera object exists");
check("min_zoom_is_0_5", Camera.MIN_ZOOM === 0.50, `MIN_ZOOM = ${Camera.MIN_ZOOM} (0.5x)`);
check("max_zoom_is_3_0", Camera.MAX_ZOOM === 3.00, `MAX_ZOOM = ${Camera.MAX_ZOOM} (3.0x)`);
check("default_zoom_is_1_0", Camera.DEFAULT_ZOOM === 1.00, `DEFAULT_ZOOM = ${Camera.DEFAULT_ZOOM}`);
check("initial_zoom_in_range", Camera.zoom() >= 0.50 && Camera.zoom() <= 3.00, `Initial zoom is ${Camera.zoom()}`);

console.log("\n--- Testing Continuous Zoom Setting & Clamping ---");
// 0.5x min zoom
Camera.setZoom(0.50);
check("set_zoom_min", Math.abs(Camera.zoom() - 0.50) < 0.001, `zoom at min is ${Camera.zoom()}`);

// 3.0x max zoom
Camera.setZoom(3.00);
check("set_zoom_max", Math.abs(Camera.zoom() - 3.00) < 0.001, `zoom at max is ${Camera.zoom()}`);

// Clamp lower bound
Camera.setZoom(0.15);
check("clamped_lower", Math.abs(Camera.zoom() - 0.50) < 0.001, `0.15 clamped to ${Camera.zoom()}`);

// Clamp upper bound
Camera.setZoom(4.25);
check("clamped_upper", Math.abs(Camera.zoom() - 3.00) < 0.001, `4.25 clamped to ${Camera.zoom()}`);

// Arbitrary in-between zoom (1.65x)
Camera.setZoom(1.65);
check("set_zoom_mid", Math.abs(Camera.zoom() - 1.65) < 0.001, `mid-range zoom is ${Camera.zoom()}`);

console.log("\n--- Testing Zoom Steppers & Reset ---");
Camera.setZoom(1.00);
Camera.zoomIn(0.25);
check("zoomIn_step", Math.abs(Camera.zoom() - 1.25) < 0.001, `zoomIn(0.25) -> ${Camera.zoom()}`);

Camera.zoomOut(0.50);
check("zoomOut_step", Math.abs(Camera.zoom() - 0.75) < 0.001, `zoomOut(0.50) -> ${Camera.zoom()}`);

Camera.resetZoom();
check("resetZoom", Math.abs(Camera.zoom() - 1.00) < 0.001, `resetZoom() -> ${Camera.zoom()}`);

console.log("\n--- Testing Discrete Levels Backward Compatibility ---");
check("levels_defined", Array.isArray(Camera.levels) && Camera.levels.length >= 3, `levels: ${Camera.levels.join(", ")}`);
Camera.setLevel(0);
check("setLevel_0", Math.abs(Camera.zoom() - 1.00) < 0.001, `setLevel(0) -> ${Camera.zoom()}`);
Camera.setLevel(1);
check("setLevel_1", Math.abs(Camera.zoom() - 0.75) < 0.001, `setLevel(1) -> ${Camera.zoom()}`);
Camera.setLevel(2);
check("setLevel_2", Math.abs(Camera.zoom() - 0.50) < 0.001, `setLevel(2) -> ${Camera.zoom()}`);

console.log("\n--- Testing Screen Math Scaling ---");
// At 1.0x:
Camera.setZoom(1.00);
const baseCols = $gameMap.screenTileX();
const baseRows = $gameMap.screenTileY();
check("screen_metrics_1x", Math.abs(baseCols - 816 / 48) < 0.01, `1.0x screenTileX = ${baseCols}`);

// At 0.5x: screen shows 2x more tiles in both directions
Camera.setZoom(0.50);
const wideCols = $gameMap.screenTileX();
check("screen_metrics_0_5x", Math.abs(wideCols - baseCols * 2) < 0.01, `0.5x screenTileX = ${wideCols} (2x view)`);

// At 3.0x: screen shows 1/3 the tiles
Camera.setZoom(3.00);
const closeCols = $gameMap.screenTileX();
check("screen_metrics_3_0x", Math.abs(closeCols - baseCols / 3) < 0.01, `3.0x screenTileX = ${closeCols} (1/3 view)`);

console.log("\n--- Testing Viewport Culling with Dynamic Zoom ---");
const char = new MockGame_CharacterBase();
// Place character at scroll distance 25 tiles (25 * 48 = 1200px from camera center)
// At 1.0x (half width 408): px = 30 * 48 + 24 - 408 = 1056px > 816px -> OUT OF VIEW
Camera.setZoom(1.00);
char._x = $gameMap.displayX() + 30;
char._y = $gameMap.displayY() + 6;
const visibleAt1x = char.isNearTheScreen();
check("culling_hidden_at_1x", visibleAt1x === false, "Entity at 1440px is culled at 1.0x");

// At 0.5x: gw = 816 / 0.5 = 1632px -> 1056px <= 1632px -> IN VIEW
Camera.setZoom(0.50);
const visibleAt05x = char.isNearTheScreen();
check("culling_visible_at_0_5x", visibleAt05x === true, "Entity at 1440px is preserved in view at 0.5x");

console.log("\n--- Testing Tilemap Scaling in Spriteset_Map ---");
const spriteset = new MockSpriteset_Map();
Camera.setZoom(2.50);
spriteset.updateUfZoom();
check("tilemap_scale_set", Math.abs(spriteset._tilemap.scale.x - 2.50) < 1e-6, `tilemap scale is ${spriteset._tilemap.scale.x}`);
check("tilemap_width_scaled", spriteset._tilemap.width === Math.ceil(816 / 2.50), `tilemap width is ${spriteset._tilemap.width}`);
check("tilemap_refreshed", spriteset._tilemap.refreshCalled === true, "tilemap.refresh() called on dimension update");

console.log("\n--- Testing Interactive Slider HUD Sprite ---");
const SliderClass = Camera.SliderSprite;
check("slider_class_exists", typeof SliderClass === "function", "Sprite_UFZoomSlider class defined");

const sliderInstance = new SliderClass();
check("slider_instantiated", sliderInstance.width === 280 && sliderInstance.height === 108, `Slider dimensions: ${sliderInstance.width}x${sliderInstance.height}`);

// Test Scene_Map attachment
const sceneMap = new MockScene_Map();
sceneMap.createDisplayObjects();
check("slider_attached_to_scene", !!sceneMap._deusZoomSlider, "Slider attached to Scene_Map display objects");

// Test click isolation: isAnyWindowUnderMouse
TouchInput.x = sceneMap._deusZoomSlider.x + 10;
TouchInput.y = sceneMap._deusZoomSlider.y + 10;
check("slider_blocks_map_clicks", sceneMap.isAnyWindowUnderMouse() === true, "isAnyWindowUnderMouse is true when hovering over slider HUD");

TouchInput.x = 0;
TouchInput.y = 0;
check("slider_allows_clicks_outside", sceneMap.isAnyWindowUnderMouse() === false, "isAnyWindowUnderMouse is false outside slider HUD");

// Test track dragging simulation:
// trackX = 36, trackW = 208. Clicking at 36 + 208 = 244 should set max zoom 3.0x
TouchInput.isTriggered = () => true;
TouchInput.isPressed = () => true;
TouchInput.x = sliderInstance.x + 36 + 208; // right edge of track
TouchInput.y = sliderInstance.y + 36;
sliderInstance.handleInteraction();
check("slider_drag_sets_max_zoom", Math.abs(Camera.zoom() - 3.00) < 0.01, `Dragging slider to right sets zoom to ${Camera.zoom()}`);

// Clicking at 36 should set min zoom 0.50x
TouchInput.x = sliderInstance.x + 36; // left edge of track
sliderInstance.handleInteraction();
check("slider_drag_sets_min_zoom", Math.abs(Camera.zoom() - 0.50) < 0.01, `Dragging slider to left sets zoom to ${Camera.zoom()}`);

// Reset zoom to 1.0
Camera.resetZoom();
check("final_reset_to_1x", Math.abs(Camera.zoom() - 1.00) < 0.001, `Final reset -> ${Camera.zoom()}`);

// Summary
console.log(`\n=== Verification Complete: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
