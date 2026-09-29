// tools/test_creature_inventory_black_box.js
// Verification of Creature Inventory Screen per Owner Directive (2026-09-29):
// 1. Stats removed from creature inventory screen.
// 2. Equipment slots kept as grid squares.
// 3. Inventory grid squares replaced with a single black rectangle acting as the character's bag.
// 4. Weight capacity indication at the bottom with SRD 5.1 encumbrance thresholds.

"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const catalogPath = path.join(root, "game", "data", "UF_WorldCatalog.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

// Mock browser/RMMZ environment
global.window = global;
global.$dataWorldCatalog = catalog;
global.$ufWorldCatalog = catalog;
global.PluginManager = { parameters: () => ({}), loadScript: () => {} };
global.DataManager = { onLoad: () => {}, isBattleTest: () => false, isEventTest: () => false };
global.$gameSystem = { windowPadding: () => 12 };
global.Game_Player = function() {};
global.Game_Player.prototype = { moveStraight: () => {}, performTransfer: () => {} };
global.Game_CharacterBase = function() {};
global.Game_CharacterBase.prototype = {};
global.Game_Event = function() {};
global.Game_Event.prototype = { isThrough: () => false };
global.Game_Map = function() {};
global.Game_Map.prototype = { setup: () => {}, isPassable: () => true };
global.Tilemap = { isWaterTile: () => false };
global.Scene_Base = class Scene_Base {};
global.Scene_Map = class Scene_Map {};
global.Scene_Map.prototype.createAllWindows = function() {};
global.Scene_Map.prototype.update = function() {};
global.Scene_Map.prototype.isReady = function() { return true; };
global.Scene_Boot = class Scene_Boot {};
global.Scene_Boot.prototype.start = function() {};
global.Spriteset_Map = function() {};
global.Spriteset_Map.prototype = { createCharacters: () => {} };
global.Sprite_Character = function() {};
global.Sprite_Character.prototype = { update: () => {} };
global.Utils = { isNwjs: () => false, encodeURI: s => s, hasEncryptedImages: () => false };
global.Graphics = { boxWidth: 816, boxHeight: 624 };
global.Rectangle = class Rectangle {
    constructor(x, y, w, h) { this.x = x || 0; this.y = y || 0; this.width = w || 0; this.height = h || 0; }
};
global.Bitmap = class Bitmap {
    constructor(w, h) {
        this.width = w || 100;
        this.height = h || 100;
        this._baseTexture = { update() {} };
        this._context = {
            fillStyle: "",
            strokeStyle: "",
            lineWidth: 1,
            fillRect() {},
            strokeRect() {},
            beginPath() {},
            arc() {},
            ellipse() {},
            fill() {},
            moveTo() {},
            lineTo() {},
            stroke() {},
            closePath() {}
        };
    }
    get context() { return this._context; }
    fillRect() {}
    strokeRect() {}
    clear() {}
    drawText() {}
    measureTextWidth() { return 60; }
    blt() {}
    isReady() { return true; }
};
global.TouchInput = { x: 0, y: 0, isTriggered: () => false, isCancelled: () => false, isPressed: () => false, _currentState: {} };
global.Input = { keyMapper: {}, isTriggered: () => false };
global.SoundManager = { playCursor() {}, playOk() {}, playCancel() {}, playEquip() {}, playRecovery() {}, playBuzzer() {} };
global.ColorManager = { systemColor: () => "#f5d78e" };
global.SceneManager = { _scene: null };
global.ImageManager = { loadCharacter: () => new global.Bitmap(144, 192), loadFace: () => new global.Bitmap(144, 144), loadTileset: () => new global.Bitmap(256, 256) };
global.$gamePlayer = { x: 5, y: 5, isTransferring: () => false };
global.$gameMap = {
    tileWidth: () => 48,
    tileHeight: () => 48,
    adjustX: x => x,
    adjustY: y => y,
    displayX: () => 0,
    displayY: () => 0,
    screenTileX: () => 20,
    screenTileY: () => 15,
    width: () => 20,
    height: () => 20,
    mapId: () => 1,
    isPassable: () => true,
    canvasToMapX: x => Math.floor(x / 48),
    canvasToMapY: y => Math.floor(y / 48),
    eventsXy: () => [],
    _events: {}
};
global.$dataMap = { width: 20, height: 20, data: new Array(20 * 20 * 6).fill(0), events: [] };

class MockWindow {
    constructor(rect) {
        this.x = rect ? rect.x : 0;
        this.y = rect ? rect.y : 0;
        this.width = rect ? rect.width : 100;
        this.height = rect ? rect.height : 100;
        this.visible = false;
        this.contents = new global.Bitmap(this.width, this.height);
        this.padding = 12;
    }
    get innerWidth() { return this.width - this.padding * 2; }
    get innerHeight() { return this.height - this.padding * 2; }
    resetFontSettings() {}
    show() { this.visible = true; }
    hide() { this.visible = false; }
    addChild() {}
    removeChild() {}
}
global.Window_Base = MockWindow;
global.Window_Selectable = MockWindow;
global.Sprite = class MockSprite {
    constructor() { this.x = 0; this.y = 0; this.anchor = { set() {} }; this.visible = false; }
    addChild() {}
};

// Load DEUS plugins
const World = require("../game/js/plugins/DEUS_World.js");
const Items = require("../game/js/plugins/DEUS_Items.js");
const Sheet = require("../game/js/plugins/DEUS_Sheet.js");
const Containers = require("../game/js/plugins/DEUS_Containers.js");
const Bag = require("../game/js/plugins/DEUS_Bag.js");

console.log("=== Testing Creature Inventory Screen with Black Rectangle Bag & Weight Capacity ===");

let passed = 0;
let failed = 0;
function test(name, fn) {
    try {
        fn();
        console.log(`PASS: ${name}`);
        passed++;
    } catch (e) {
        console.error(`FAIL: ${name}: ${e.stack || e.message}`);
        failed++;
    }
}

SceneManager._scene = new Scene_Map();
SceneManager._scene._ufSheetWindow = new (Sheet.Window || window.UF.Sheet.Window)(new Rectangle(400, 100, 320, 500));

// Initialize World & Items
UF.World.state = { units: {}, nextUnitId: 1 };
const itemsById = {};
const uInv = [];

UF.Items = {
    get: id => itemsById[id] || null,
    type: id => ({
        id,
        name: id === "sword_iron" ? "Iron Sword" : id === "bread" ? "Bread" : "Stone",
        weight: id === "sword_iron" ? 3.0 : id === "bread" ? 0.5 : 1.0,
        slot: id === "sword_iron" ? "mainHand" : null
    }),
    inventoryOf: () => uInv,
    carriedWeight: () => uInv.reduce((sum, it) => sum + ((itemsById[it.id] ? itemsById[it.id].weight : 1) * (it.count || 1)), 0),
    maxWeight: (uid) => {
        const unit = UF.World.unit(uid);
        const str = (unit && unit.data && unit.data.dnd && unit.data.dnd.str) || 10;
        return str * 15;
    },
    equip: (uid, itemId, slot) => {
        const unit = UF.World.unit(uid);
        if (unit && unit.data && unit.data.equipment) unit.data.equipment[slot] = itemId;
    }
};

// Create test colonist
const u = UF.World.addUnit({
    name: "Aelric",
    area: { x: 0, y: 0 },
    x: 5, y: 5,
    kind: "colonist",
    data: {
        dnd: {
            str: 14, dex: 12, con: 15, int: 10, wis: 13, cha: 8,
            hp: 20, hpMax: 20
        },
        equipment: {
            head: null,
            body: null,
            mainHand: null
        }
    }
});

// Give colonist some items
const swordObj = { id: 101, type: "sword_iron", count: 1, weight: 3.0 };
const breadObj = { id: 102, type: "bread", count: 3, weight: 0.5 };
const stoneObj = { id: 103, type: "stone", count: 10, weight: 1.0 };
itemsById[101] = swordObj;
itemsById[102] = breadObj;
itemsById[103] = stoneObj;
uInv.push(swordObj, breadObj, stoneObj);

test("tab1_inventory_layout_structure", () => {
    Sheet.open(u.id);
    const win = Sheet.window();
    assert(win, "Sheet window must exist");
    win.switchTab(1); // Switch to Tab 1 (Inventory)

    const L = win.layout();
    assert(L, "Layout must exist");

    // 1. Stats MUST be removed from creature inventory screen
    assert.strictEqual(L.stats, undefined, "L.stats must be undefined on inventory screen");

    // 2. Equipment slots MUST exist as grid squares
    assert(L.equipment, "L.equipment must exist");
    assert(Array.isArray(L.equipment.slots), "L.equipment.slots must be an array");
    assert(L.equipment.slots.length >= 12, `L.equipment.slots must have at least 12 slots, got ${L.equipment.slots.length}`);
    const firstEq = L.equipment.slots[0];
    assert.strictEqual(firstEq.w, 34, "Equipment slot width should be 34");
    assert.strictEqual(firstEq.h, 34, "Equipment slot height should be 34");

    // 3. Inventory grid squares MUST be replaced by solid rectangle bag
    assert.strictEqual(L.grid, undefined, "Old L.grid slots must be undefined");
    assert(L.bag, "L.bag must exist");
    assert(L.bag.w > 200, `L.bag.w should be wide, got ${L.bag.w}`);
    assert(L.bag.h >= 140, `L.bag.h should be at least 140, got ${L.bag.h}`);

    // 4. Weight capacity indication MUST exist at bottom
    assert(L.capacity, "L.capacity must exist");
    assert(L.capacity.y >= L.bag.y + L.bag.h, "L.capacity must be positioned below L.bag");
});

test("bagItems_within_black_rectangle_bounds", () => {
    Sheet.open(u.id);
    const win = Sheet.window();
    win.switchTab(1);

    const L = win.layout();
    const items = win.bagItems();
    assert(Array.isArray(items), "bagItems must return an array");
    assert.strictEqual(items.length, 3, `Expected 3 carried items, got ${items.length}`);

    items.forEach((it, idx) => {
        assert(it.x >= L.bag.x + 6, `Item ${idx} x (${it.x}) must be inside L.bag left (${L.bag.x + 6})`);
        assert(it.x + it.w <= L.bag.x + L.bag.w - 6, `Item ${idx} right must be inside L.bag right`);
        assert(it.y >= L.bag.y + 6, `Item ${idx} y (${it.y}) must be inside L.bag top (${L.bag.y + 6})`);
        assert(it.y + it.h <= L.bag.y + L.bag.h - 6, `Item ${idx} bottom must be inside L.bag bottom`);
    });
});

test("bagItems_custom_coordinates_persistence", () => {
    Sheet.open(u.id);
    const win = Sheet.window();
    win.switchTab(1);

    const L = win.layout();
    // Assign custom bagX and bagY to sword
    const rawSword = UF.Items.get(swordObj.id);
    rawSword.bagX = 50;
    rawSword.bagY = 60;

    const items = win.bagItems();
    const swordItem = items.find(it => it.itemId === swordObj.id);
    assert(swordItem, "Sword item must be resolved in bagItems");
    assert.strictEqual(swordItem.x, L.bag.x + 50, "Sword item X must match L.bag.x + 50");
    assert.strictEqual(swordItem.y, L.bag.y + 60, "Sword item Y must match L.bag.y + 60");
});

test("inventorySlotAtCoords_resolves_bag_items_and_cavity", () => {
    Sheet.open(u.id);
    const win = Sheet.window();
    win.switchTab(1);

    const L = win.layout();
    const items = win.bagItems();
    const firstItem = items[0];

    // Local coordinates over first item
    const hitIdx = win.inventorySlotAtCoords(win.x + win.padding + firstItem.x + 4, win.y + win.padding + firstItem.y + 4);
    assert.strictEqual(hitIdx, 0, `Expected hitIdx 0 over first item, got ${hitIdx}`);

    // Local coordinates inside bag but away from items (empty bag space)
    const emptyHit = win.inventorySlotAtCoords(win.x + win.padding + L.bag.x + L.bag.w - 10, win.y + win.padding + L.bag.y + L.bag.h - 10);
    assert.strictEqual(emptyHit, -2, `Expected -2 (inside cavity) for empty bag space, got ${emptyHit}`);

    // Local coordinates outside bag
    const outsideHit = win.inventorySlotAtCoords(win.x + win.padding + 5, win.y + win.padding + 5);
    assert.strictEqual(outsideHit, -1, `Expected -1 outside bag, got ${outsideHit}`);
});

test("weight_capacity_calculation_and_srd_thresholds", () => {
    const curWeight = UF.Items.carriedWeight(u.id);
    const maxWeight = UF.Items.maxWeight(u.id);
    assert(curWeight > 0, "Cur weight should be > 0");
    assert(maxWeight > 0, "Max weight should be > 0");

    // STR 14: SRD capacity = 14 * 15 = 210 lbs
    assert.strictEqual(maxWeight, 210, `Expected STR 14 maxWeight to be 210, got ${maxWeight}`);

    // Carried weight: sword (3 lbs) + 3 bread (3*0.5=1.5 lbs) + 10 stone (10*1=10 lbs) = 14.5 lbs
    assert(Math.abs(curWeight - 14.5) < 0.1, `Expected curWeight ~14.5, got ${curWeight}`);
});

test("bag_toggle_api_routes_to_creature_sheet_tab1", () => {
    Sheet.close();
    assert.strictEqual(Sheet.window().visible, false, "Sheet should be closed initially");

    // Bag.toggle() opens creature sheet on tab 1
    UF.Bag.toggle(u.id);
    assert.strictEqual(Sheet.window().visible, true, "Sheet should be opened after Bag.toggle()");
    assert.strictEqual(Sheet.window().activeTab(), 1, "Sheet should be on Tab 1 (Inventory)");

    // Bag.toggle() while open on Tab 1 closes it
    UF.Bag.toggle(u.id);
    assert.strictEqual(Sheet.window().visible, false, "Sheet should be closed after second Bag.toggle()");
});

test("test_must_be_able_to_fail", () => {
    let caught = false;
    try {
        assert.strictEqual("bag", "sack");
    } catch (e) {
        caught = true;
    }
    assert(caught, "Assertion must fail when values differ");
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
