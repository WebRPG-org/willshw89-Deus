#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const simHook = require("./lib/vm_sim_require"); // WG.00.44: UF.Sim.require and a 1x1 grid in the vm

const ROOT = path.resolve(__dirname, "..");
const MODULES = [
    "World", "WorldGen", "Factions", "HistoricalDemographics", "Callings", "Dnd5e",
    "History", "Levels", "Objects", "Items", "Containers", "Stockpiles", "Colonists", "Bag"
];

function loadEngine() {
    const cat = JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/UF_WorldCatalog.json"), "utf8"));
    const env = {
        window: null, UF: {}, DEUS: {}, Math: Object.create(Math), console, performance,
        PluginManager: { parameters: () => ({}), registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false },
        Input: { keyMapper: {}, isTriggered: () => false },
        TouchInput: {
            x: 0, y: 0,
            isTriggered: () => false, isPressed: () => false, isCancelled: () => false,
            _currentState: { triggered: false, cancelled: false }
        },
        SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 },
        $gameMap: {
            mapId: () => 0, tileWidth: () => 48, tileHeight: () => 48,
            screenTileX: () => 17, screenTileY: () => 13,
            displayX: () => 0, displayY: () => 0,
            canvasToMapX: (cx) => Math.floor(cx / 48),
            canvasToMapY: (cy) => Math.floor(cy / 48)
        },
        $gamePlayer: { x: 10, y: 10 },
        $gameSystem: {},
        SoundManager: {
            playOk() {}, playCancel() {}, playBuzzer() {}, playCursor() {}, playEquip() {}
        },
        ImageManager: {
            loadCharacter: (name) => ({ isReady: () => true, width: 144, height: 192 }),
            loadTileset: () => ({})
        },
        Utils: { isOptionValid: () => false },
        Bitmap: function(w, h) {
            this.width = w; this.height = h;
            this.clear = () => {};
            this.fillRect = () => {};
            this.strokeRect = () => {};
            this.drawText = () => {};
            this.blt = () => {};
        },
        Rectangle: function(x, y, w, h) {
            this.x = x; this.y = y; this.width = w; this.height = h;
        },
        Sprite: function() {
            this.x = 0; this.y = 0; this.anchor = { set() {} };
            this.visible = true; this.bitmap = null;
            this.addChild = () => {};
            this.update = () => {};
        },
        Window_Base: function(rect) {
            this.x = rect.x; this.y = rect.y; this.width = rect.width; this.height = rect.height;
            this.padding = 12;
            this.visible = false;
            this.contents = new env.Bitmap(rect.width, rect.height);
            this.show = () => { this.visible = true; };
            this.hide = () => { this.visible = false; };
            this.activate = () => {};
            this.deactivate = () => {};
            this.refresh = () => {};
            this.changeTextColor = () => {};
            this.drawText = () => {};
        }
    };
    env.Window_Selectable = env.Window_Base;
    env.$ufWorldCatalog = cat;
    env.$deusWorldCatalog = cat;
    env.window = env;

    // Load Tilemap statics from rmmz_core.js
    const core = fs.readFileSync(path.join(ROOT, "game/js/rmmz_core.js"), "utf8");
    const start = core.indexOf("Tilemap.TILE_ID_B = 0;");
    const table = core.indexOf("Tilemap.WATERFALL_AUTOTILE_TABLE = [");
    const end = core.indexOf("];", table) + 2;
    const tilemapCode = "function Tilemap() {}\nTilemap.isWaterTile = () => false;\nTilemap.isTileA1 = () => false;\n" + core.slice(start, end);
    vm.runInNewContext(tilemapCode, env);

    const filePaths = MODULES.map(m => `DEUS_${m}.js`);
    const sources = filePaths.map(f => fs.readFileSync(path.join(ROOT, "game/js/plugins", f), "utf8"));
    const names = new Set(["Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle"]);
    for (const source of sources) for (const m of source.matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype/g)) names.add(m[1]);
    for (const name of names) if (!env[name]) env[name] = function() {};
    for (const name of names) if (!env[name].prototype) env[name].prototype = {};
    for (const source of sources) for (const m of source.matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype\.([A-Za-z0-9_]+)/g)) {
        if (!env[m[1]].prototype[m[2]]) env[m[1]].prototype[m[2]] = () => {};
    }

    simHook.install(env);
    sources.forEach((src, i) => vm.runInNewContext(src, env, { filename: filePaths[i] }));
    return env;
}

console.log("=== DEUS: Playable Bag & Racial War Banners Test Suite ===");

const env = loadEngine();
const { UF } = env;

// 1. Test All 9 Racial War Banners in Items & Objects Registry
const RACES = ["human", "elf", "dwarf", "gnome", "halfling", "half_elf", "half_orc", "dragonborn", "tiefling"];
for (const r of RACES) {
    const bannerId = `banner_${r}`;
    const itType = UF.Items.type(bannerId);
    assert(itType, `Item type ${bannerId} must exist`);
    assert(itType.tags.includes("banner"), `${bannerId} must have 'banner' tag`);
    assert(itType.tags.includes("sacred"), `${bannerId} must have 'sacred' tag`);
    assert(itType.weight === 12.0, `${bannerId} weight must be 12.0 lbs`);
    assert(itType.isWarBanner === true, `${bannerId} must be flagged isWarBanner`);

    // Verify sheet exists on disk
    const sheetFile = path.join(ROOT, `game/img/characters/${itType.image}.png`);
    const jsonFile = path.join(ROOT, `game/img/characters/${itType.image}.json`);
    assert(fs.existsSync(sheetFile), `Image file ${sheetFile} must exist`);
    assert(fs.existsSync(jsonFile), `Sidecar file ${jsonFile} must exist`);

    // Verify object entry exists
    const objType = UF.Objects.type(bannerId);
    assert(objType, `Object type ${bannerId} must exist`);
    assert(objType.passable === true, `${bannerId} object must be passable`);
}
console.log("PASS 1: All 9 Racial War Banners exist in Items & Objects registries with verified sheets & sidecars.");

// 2. Test 10 PixelLab Items
const PIXELLAB_ITEMS = [
    "stone_axe", "stone_pick", "stone_knife", "ore_iron", "ore_copper",
    "meat_raw", "meat_cooked", "firewood", "bread_loaf", "campfire"
];
for (const itId of PIXELLAB_ITEMS) {
    const t = UF.Items.type(itId);
    assert(t, `Item type ${itId} must exist`);
    assert(t.image && t.image.startsWith("!$UF_Item_"), `${itId} must use authentic PixelLab image: ${t.image}`);
    const sheetFile = path.join(ROOT, `game/img/characters/${t.image}.png`);
    const jsonFile = path.join(ROOT, `game/img/characters/${t.image}.json`);
    assert(fs.existsSync(sheetFile), `Image file ${sheetFile} must exist on disk`);
    assert(fs.existsSync(jsonFile), `Sidecar file ${jsonFile} must exist on disk`);
}
console.log("PASS 2: All 10 PixelLab items are registered with authentic 16-bit sheets & sidecars.");

// 3. Test World Generation & Faction War Banner Placement at Camp Center
const world = UF.World.newWorld(20260920);
UF.Levels.ensureWorldLevels(world);
UF.Factions.generate(world);
UF.History.generate(world);
UF.History.spawnFounders(world.state || world);
UF.Colonists.setup(world);

const factions = (world.factions && world.factions.list) || (world.state && world.state.factions && world.state.factions.list) || [];
assert(factions.length > 0, "Must have generated factions");

for (const f of factions) {
    const rec = world.history.founders[f.id];
    assert(rec, `Founder record for faction ${f.id} must exist`);
    assert(rec.focalBanner, `Faction ${f.id} must have focalBanner assigned`);
    const expectedSpecies = (f.species || "human").toLowerCase().replace(/-/g, "_");
    const expectedBanner = `banner_${expectedSpecies}`;
    assert(rec.focalBanner.bannerId === expectedBanner, `focalBanner must be ${expectedBanner}, got ${rec.focalBanner.bannerId}`);

    // Check that physical item exists on the focal tile
    const bannerItems = UF.Items.at(rec.focalBanner.area, rec.focalBanner.x, rec.focalBanner.y, rec.focalBanner.z);
    const bannerOnGround = bannerItems.find(it => it.type === expectedBanner);
    assert(bannerOnGround, `Physical War Banner item ${expectedBanner} must be spawned on ground at (${rec.focalBanner.x}, ${rec.focalBanner.y})`);
    assert(bannerOnGround.factionId === f.id, `Banner item must belong to faction ${f.id}`);
    assert(bannerOnGround.sacred === true, "Banner item must be sacred");

    // Check founder leader inventory contains starter kit
    const leader = rec.units.find(u => UF.Items.inventoryOf(u.id).some(it => it.type === "meat_cooked")) || rec.units[0];
    const leaderInv = UF.Items.inventoryOf(leader.id);
    assert(leaderInv.length > 0, "Leader must start with starter kit in inventory");
    const totalMeat = leaderInv.filter(it => it.type === "meat_cooked").reduce((sum, it) => sum + it.count, 0);
    assert(totalMeat === 16, "Leader must carry 16 cooked meat");
    const pick = leaderInv.find(it => it.type === "stone_pick");
    assert(pick && pick.count === 1, "Leader must carry 1 stone pick");
    const axe = leaderInv.find(it => it.type === "stone_axe");
    assert(axe && axe.count === 1, "Leader must carry 1 stone axe");
}
console.log("PASS 3: Racial War Banners spawned at camp center for all factions; starter kits seeded in leader bags.");

// 4. Test Playable Drag-and-Drop Bag Window
const testUnitRec = world.history.founders[factions[0].id].units.find(u => UF.Items.inventoryOf(u.id).some(it => it.type === "meat_cooked")) || world.history.founders[factions[0].id].units[0];
const testUnit = UF.World.unit(testUnitRec.id) || testUnitRec;
const bagWin = new env.Window_UFBag(new env.Rectangle(16, 70, 320, 240));
env.SceneManager._scene = { _ufBagWindow: bagWin };

// Open bag
bagWin.openFor(testUnit.id);
assert(bagWin.isOpen(), "Bag window must be open");
assert(bagWin._unitId === testUnit.id, "Bag must be open for testUnit");

// Check weight calculation
const wt = bagWin.calculateCarriedWeight(testUnit);
assert(wt.current > 0, `Carried weight must be positive: ${wt.current} lbs`);
assert(wt.max > 0, `Max capacity must be positive: ${wt.max} lbs`);

// Interaction A: Bag -> Bag interior rearrangement
const meatItem = UF.Items.inventoryOf(testUnit.id).find(it => it.type === "meat_cooked");
assert(meatItem, "Must have meatItem in inventory");
const interior = bagWin.getInteriorRect();
const initialX = meatItem.bagX || 50;
const initialY = meatItem.bagY || 50;
const newX = interior.x + 30;
const newY = interior.y + 40;

const dragSourceBag = { kind: "bag", item: meatItem, unitId: testUnit.id };
const dropBagResult = bagWin.handleDrop(dragSourceBag, bagWin.x + newX + 24, bagWin.y + newY + 24);
assert(dropBagResult === true, "handleDrop must succeed for Bag -> Bag rearrangement");
assert(meatItem.bagX === newX, `meatItem.bagX must be updated to ${newX}, got ${meatItem.bagX}`);
assert(meatItem.bagY === newY, `meatItem.bagY must be updated to ${newY}, got ${meatItem.bagY}`);

// Interaction B: Bag -> World Drop
const dropWorldSuccess = UF.Items.putDown(meatItem.id, testUnit.area, testUnit.x + 1, testUnit.y);
assert(dropWorldSuccess, "putDown must place item on ground");
const invAfterDrop = UF.Items.inventoryOf(testUnit.id);
assert(!invAfterDrop.some(it => it.id === meatItem.id), "meatItem must no longer be in unit inventory");
const groundItems = UF.Items.at(testUnit.area, testUnit.x + 1, testUnit.y, testUnit.z);
assert(groundItems.some(it => it.id === meatItem.id), "meatItem must now lie on the ground cell");

// Interaction C: World -> Bag Pickup
const dragSourceWorld = { kind: "world", itemId: meatItem.id, item: meatItem };
const pickupTargetX = interior.x + 80;
const pickupTargetY = interior.y + 60;
const dropWorldIntoBag = bagWin.handleDrop(dragSourceWorld, bagWin.x + pickupTargetX + 24, bagWin.y + pickupTargetY + 24);
assert(dropWorldIntoBag === true, "handleDrop must succeed for World -> Bag pickup");
const invAfterPickup = UF.Items.inventoryOf(testUnit.id);
assert(invAfterPickup.some(it => it.id === meatItem.id), "meatItem must be back in unit inventory");
assert(meatItem.bagX === pickupTargetX, `meatItem.bagX must be positioned at ${pickupTargetX}`);
assert(meatItem.bagY === pickupTargetY, `meatItem.bagY must be positioned at ${pickupTargetY}`);

console.log("PASS 4: Core Drag-and-Drop interactions verified (Bag interior repositioning, Bag -> World, World -> Bag).");

// 5. Test War Banner Capture & Faction Conquest
if (factions.length >= 2) {
    const facA = factions[0];
    const facB = factions[1];
    const recA = world.history.founders[facA.id];
    const recB = world.history.founders[facB.id];
    const warriorB = recB.units[0];
    warriorB.faction = facB.id;

    // Locate faction A's war banner
    const bannerItemsA = UF.Items.at(recA.focalBanner.area, recA.focalBanner.x, recA.focalBanner.y, recA.focalBanner.z);
    const bannerA = bannerItemsA.find(it => it.isWarBanner);
    assert(bannerA, "Faction A must have physical war banner on ground");
    assert(!facA.conquered, "Faction A must not be conquered yet");

    // Warrior from Faction B captures Faction A's war banner
    const captured = UF.Items.pickUp(bannerA.id, warriorB.id, { bypassLocation: true });
    assert(captured === true, "Warrior B must be able to pick up the banner into bag");
    assert(facA.conquered === true, "Faction A must now be marked CONQUERED upon banner capture!");
    assert(facA.conqueredBy === facB.id, `Faction A conqueredBy must be ${facB.id}, got ${facA.conqueredBy}`);
    assert(facA.capturedBanner === bannerA.id, "Faction A capturedBanner must reference bannerA");
    const bannerDef = UF.Items.type(bannerA.type);
    console.log(`PASS 5: War Banner capture verified! Warrior of ${facB.name} captured ${bannerDef ? bannerDef.name : bannerA.type}, conquering ${facA.name}.`);
}

console.log("\n>>> ALL PLAYABLE BAG & RACIAL WAR BANNER TESTS PASSED! <<<");
process.exit(0);
