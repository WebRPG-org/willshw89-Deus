// tools/test_equipment_drag.js - Headless test suite for drag-and-drop equipment slots and slot compatibility (Owner Request)
"use strict";

const assert = require("assert");
const path = require("path");
const fs = require("fs");

console.log("=== DEUS EQUIPMENT DRAG & DROP AND SLOT COMPATIBILITY TEST SUITE ===");

// 1. Mock window & UF globals
global.window = global;
global.UF = global.UF || {};
global.$dataItems = [];
global.Sprite = class { constructor() {} };
global.Bitmap = class { constructor() {} };
global.Graphics = { width: 816, height: 624 };
global.SoundManager = { playEquip: () => {} };
global.Spriteset_Map = class { createCharacters() {} };
global.Scene_Boot = class { start() {} };

// Load DEUS_Items.js
const itemsCode = fs.readFileSync(path.join(__dirname, "../game/js/plugins/DEUS_Items.js"), "utf8");
eval(itemsCode);

const Items = UF.Items;
assert(Items, "UF.Items should be defined");
assert(typeof Items.isSlotCompatible === "function", "Items.isSlotCompatible should be a function");

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

// Section A: Slot Compatibility Checks
test("slot_compat_mainhand_weapon", () => {
    assert.strictEqual(Items.isSlotCompatible({ weapon: true }, "mainHand"), true);
    assert.strictEqual(Items.isSlotCompatible({ tags: ["sword"] }, "mainHand"), true);
    assert.strictEqual(Items.isSlotCompatible({ tags: ["axe"] }, "mainHand"), true);
    assert.strictEqual(Items.isSlotCompatible({ slot: "weapon" }, "mainHand"), true);
    assert.strictEqual(Items.isSlotCompatible({ slot: "helmet" }, "mainHand"), false);
});

test("slot_compat_offhand_shield_or_torch", () => {
    assert.strictEqual(Items.isSlotCompatible({ shield: true }, "offHand"), true);
    assert.strictEqual(Items.isSlotCompatible({ tags: ["shield"] }, "offHand"), true);
    assert.strictEqual(Items.isSlotCompatible({ tags: ["torch"] }, "offHand"), true);
    assert.strictEqual(Items.isSlotCompatible({ weapon: true }, "offHand"), true); // Dual wielding / offhand weapon
    assert.strictEqual(Items.isSlotCompatible({ slot: "ring" }, "offHand"), false);
});

test("slot_compat_head_helmet", () => {
    assert.strictEqual(Items.isSlotCompatible({ slot: "helmet" }, "head"), true);
    assert.strictEqual(Items.isSlotCompatible({ tags: ["cowl"] }, "head"), true);
    assert.strictEqual(Items.isSlotCompatible({ tags: ["hat"] }, "head"), true);
    assert.strictEqual(Items.isSlotCompatible({ weapon: true }, "head"), false);
});

test("slot_compat_body_armor", () => {
    assert.strictEqual(Items.isSlotCompatible({ slot: "armor" }, "body"), true);
    assert.strictEqual(Items.isSlotCompatible({ tags: ["cuirass"] }, "body"), true);
    assert.strictEqual(Items.isSlotCompatible({ armor: { slot: "torso" } }, "body"), true);
    assert.strictEqual(Items.isSlotCompatible({ tags: ["boots"] }, "body"), false);
});

test("slot_compat_feet_boots", () => {
    assert.strictEqual(Items.isSlotCompatible({ slot: "boots" }, "feet"), true);
    assert.strictEqual(Items.isSlotCompatible({ tags: ["shoes"] }, "feet"), true);
    assert.strictEqual(Items.isSlotCompatible({ armor: { slot: "legs" } }, "feet"), true);
    assert.strictEqual(Items.isSlotCompatible({ weapon: true }, "feet"), false);
});

test("slot_compat_accessories", () => {
    assert.strictEqual(Items.isSlotCompatible({ slot: "ring" }, "ring1"), true);
    assert.strictEqual(Items.isSlotCompatible({ slot: "ring" }, "ring2"), true);
    assert.strictEqual(Items.isSlotCompatible({ tags: ["amulet"] }, "neck"), true);
    assert.strictEqual(Items.isSlotCompatible({ tags: ["belt"] }, "belt"), true);
    assert.strictEqual(Items.isSlotCompatible({ tags: ["cloak"] }, "cloak"), true);
    assert.strictEqual(Items.isSlotCompatible({ tags: ["gloves"] }, "hands"), true);
    assert.strictEqual(Items.isSlotCompatible({ tags: ["bracers"] }, "bracers"), true);
});

// Section B: Equip / Unequip and Legacy Alias Sync
const mockUnits = {
    101: { id: 101, data: { equipment: {} } },
    102: {
        id: 102,
        data: {
            equipment: {
                mainHand: "iron_sword_1",
                weapon: "iron_sword_1",
                tool: "iron_sword_1",
                body: "chain_mail_1",
                clothes: "chain_mail_1",
                torso: "chain_mail_1"
            }
        }
    }
};

global.UF.World = {
    unit: (id) => mockUnits[id]
};

test("equip_syncs_legacy_aliases", () => {
    const mockUnit = mockUnits[101];
    
    // Equip sword in mainHand (unitId, itemId, slot)
    Items.equip(101, "iron_sword_1", "mainHand");
    assert.strictEqual(mockUnit.data.equipment.mainHand, "iron_sword_1");
    assert.strictEqual(mockUnit.data.equipment.weapon, "iron_sword_1", "weapon alias must match mainHand");
    assert.strictEqual(mockUnit.data.equipment.tool, "iron_sword_1", "tool alias must match mainHand");

    // Equip shield in offHand
    Items.equip(101, "wood_shield_1", "offHand");
    assert.strictEqual(mockUnit.data.equipment.offHand, "wood_shield_1");
    assert.strictEqual(mockUnit.data.equipment.shield, "wood_shield_1", "shield alias must match offHand");

    // Equip mail in body
    Items.equip(101, "chain_mail_1", "body");
    assert.strictEqual(mockUnit.data.equipment.body, "chain_mail_1");
    assert.strictEqual(mockUnit.data.equipment.clothes, "chain_mail_1", "clothes alias must match body");
    assert.strictEqual(mockUnit.data.equipment.torso, "chain_mail_1", "torso alias must match body");

    // Equip boots in feet
    Items.equip(101, "leather_boots_1", "feet");
    assert.strictEqual(mockUnit.data.equipment.feet, "leather_boots_1");
    assert.strictEqual(mockUnit.data.equipment.legs, "leather_boots_1", "legs alias must match feet");
    assert.strictEqual(mockUnit.data.equipment.boots, "leather_boots_1", "boots alias must match feet");
});

test("unequip_cleans_legacy_aliases", () => {
    const mockUnit = mockUnits[102];

    Items.unequip(102, "mainHand");
    assert.strictEqual(mockUnit.data.equipment.mainHand, undefined);
    assert.strictEqual(mockUnit.data.equipment.weapon, undefined, "unequip mainHand must clean weapon alias");
    assert.strictEqual(mockUnit.data.equipment.tool, undefined, "unequip mainHand must clean tool alias");
    assert.strictEqual(mockUnit.data.equipment.body, "chain_mail_1", "other slots unaffected");

    Items.unequip(102, "body");
    assert.strictEqual(mockUnit.data.equipment.body, undefined);
    assert.strictEqual(mockUnit.data.equipment.clothes, undefined, "unequip body must clean clothes alias");
    assert.strictEqual(mockUnit.data.equipment.torso, undefined, "unequip body must clean torso alias");
});

console.log(`\nResults: ${passed} passed, 0 failed.`);
if (process.exitCode) {
    console.error("TEST FAILED");
    process.exit(1);
}
