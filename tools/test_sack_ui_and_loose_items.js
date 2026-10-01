#!/usr/bin/env node
'use strict';
// Headless Bag consumer contracts. Item/Sheet services are controlled doubles;
// the Bag implementation is loaded unchanged. This is not visual Playtest proof.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const { runMain } = require('./test_all_animated_objects_live');

runMain(() => {
    const unit = { id: 7, name: 'TEST_carrier', data: { dnd: { abilities: { STR: 12 } }, equipment: { hand: 12 } } };
    const loose = { id: 11, type: 'TEST_stone', count: 3 };
    const equipped = { id: 12, type: 'TEST_tool', count: 1 };
    const ground = { id: 13, type: 'TEST_stone', count: 2 };
    const inventory = [loose, equipped];
    const pickups = [], draws = [], opened = [];
    const sheet = { visible: false, _activeTab: 0, switchTab(n) { this._activeTab = n; } };
    class WindowBase {
        constructor() { this.contents = { clear() {}, blt() {}, strokeRect() {} }; }
        show() { this.visible = true; }
        hide() { this.visible = false; }
        activate() {}
        deactivate() {}
        changeTextColor() {}
        drawText() {}
    }
    const env = {
        console, Window_Base: WindowBase,
        Input: { keyMapper: { 73: 'existing_inventory' } },
        SceneManager: { _scene: {} },
        UF: {
            World: { unit: id => id === unit.id ? unit : null, units: () => [unit] },
            Items: {
                inventoryOf: id => id === unit.id ? inventory : [],
                type: type => ({ weight: type === 'TEST_stone' ? 2.5 : 1 }),
                get: id => [loose, equipped, ground].find(it => it.id === id),
                pickUp(id, holder) {
                    pickups.push([id, holder]);
                    if (id !== ground.id || holder !== unit.id || inventory.includes(ground)) return false;
                    inventory.push(ground);
                    return true;
                }
            },
            Sheet: {
                window: () => sheet,
                open: id => { opened.push(id); sheet.visible = true; },
                close: () => { sheet.visible = false; },
                drawItemIn: (contents, rect, type, count) => draws.push({ rect, type, count })
            }
        }
    };
    env.window = env;
    const plugin = path.resolve(__dirname, '../game/js/plugins/DEUS_Bag.js');
    vm.runInNewContext(fs.readFileSync(plugin, 'utf8'), env, { filename: plugin, timeout: 5000 });
    let passed = 0;
    function check(name, fn) { fn(); passed++; console.log(`PASS sack.${name}`); }
    check('hotkeys_preserve_existing_binding', () => {
        assert.equal(env.Input.keyMapper[66], 'bag');
        assert.equal(env.Input.keyMapper[73], 'existing_inventory');
    });
    check('bag_opens_selected_inventory_tab', () => {
        env.UF.Bag.open(unit.id);
        assert.deepEqual(opened, [unit.id]);
        assert.equal(sheet.visible, true);
        assert.equal(sheet._activeTab, 1);
    });
    check('toggle_closes_then_reopens_inventory', () => {
        env.UF.Bag.toggle(unit.id); assert.equal(sheet.visible, false);
        env.UF.Bag.toggle(unit.id); assert.equal(sheet.visible, true); assert.equal(sheet._activeTab, 1);
    });
    const bag = new env.Window_UFBag();
    bag.openFor(unit.id);
    check('loose_items_drawn_equipment_excluded', () => {
        assert.deepEqual(Array.from(bag._bagItems, it => it.id), [loose.id]);
        assert.equal(draws.length, 1); assert.equal(draws[0].count, 3);
    });
    check('weight_and_strength_capacity', () => {
        const weight = bag.calculateCarriedWeight(unit);
        assert.equal(weight.current, 8.5); assert.equal(weight.max, 180);
    });
    check('reposition_clamps_inside_sack', () => {
        assert.equal(bag.handleDrop({ kind: 'bag', item: loose }, -1000, 10000), true);
        assert.equal(loose.bagX, 37); assert.equal(loose.bagY, 110);
    });
    check('world_pickup_routes_identity_to_items', () => {
        assert.equal(bag.handleDrop({ kind: 'world', itemId: ground.id, item: ground }, 90, 150), true);
        assert.deepEqual(pickups, [[ground.id, unit.id]]);
        assert.equal(bag._bagItems.includes(ground), true);
    });
    check('rejected_pickup_does_not_report_success', () => {
        const before = inventory.length;
        assert.equal(bag.handleDrop({ kind: 'world', itemId: -1 }, 90, 150), false);
        assert.equal(inventory.length, before);
    });
    check('hit_test_returns_loose_item', () => {
        assert.equal(bag.itemAtCoords(bag.x + ground.bagX + 1, bag.y + ground.bagY + 1).item.id, ground.id);
        assert.equal(bag.itemAtCoords(-1000, -1000), null);
    });
    check('close_hides_bag', () => { bag.close(); assert.equal(bag.isOpen(), false); });
    console.log(`RESULT: ${passed} passed, 0 failed (exit 0)`);
});
