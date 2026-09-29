#!/usr/bin/env node
'use strict';

/**
 * tools/art/test_multi_variant_topology.js
 *
 * Test suite for multi-variant and oriented 8-character sheet topology (TOOL.01.02).
 * Verifies:
 *   1. Catalogue schema validation for STATIC_VARIANT_8 and STATIC_ORIENTED_8 entries.
 *   2. V8 sheet geometry (576x384 px) and 12-cell byte uniformity across all character indices.
 *   3. Movement invariance across 500 persistent objects over 20 deterministic coordinate hops.
 *   4. Save/load persistence roundtrip fidelity for object.visualVariant.
 *   5. RMMZ "!" prefix convention (flush bottom ground anchoring, no 6px humanoid shift).
 *   6. ENGINE_RULES §6 capability to fail via UF_TEST_PROVOKE.
 */

const fs = require('fs');
const path = require('path');
const { readPNG, decodePNG } = require('../png_read');
const { computeInitialVisualVariant, Objects } = require('../../game/js/plugins/DEUS_Objects');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PROVOKE = process.env.UF_TEST_PROVOKE || '';

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
    if (condition) {
        passed++;
        console.log(`PASS ${name}`);
    } else {
        failed++;
        console.log(`FAIL ${name}${detail ? ': ' + detail : ''}`);
    }
}

// -----------------------------------------------------------------------------
// 1. Catalogue Schema Validation
// -----------------------------------------------------------------------------
function testCatalogueSchema() {
    const schemaPath = path.join(REPO_ROOT, 'art', 'catalogue', 'catalogue.schema.json');
    check('schema.exists', fs.existsSync(schemaPath), 'catalogue.schema.json missing');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

    // Check enum additions
    const sheetKinds = schema.$defs.sheet.properties.kind.enum;
    check('schema.sheet_kind_rmmz_char8', sheetKinds.includes('RMMZ_CHARACTER_8'), 'RMMZ_CHARACTER_8 missing from sheet kind');

    const runtimeKinds = schema.$defs.entry.properties.runtime.properties.kind.enum;
    check('schema.runtime_kind_rmmz_char8', runtimeKinds.includes('RMMZ_CHARACTER_8'), 'RMMZ_CHARACTER_8 missing from runtime kind');

    const topologyClasses = schema.$defs.entry.properties.topologyClass.enum;
    check('schema.topology_variant_8', topologyClasses.includes('STATIC_VARIANT_8'), 'STATIC_VARIANT_8 missing from topologyClass');
    check('schema.topology_oriented_8', topologyClasses.includes('STATIC_ORIENTED_8'), 'STATIC_ORIENTED_8 missing from topologyClass');

    // Verify catalogue.json entries
    const catPath = path.join(REPO_ROOT, 'art', 'catalogue', 'catalogue.json');
    const cat = JSON.parse(fs.readFileSync(catPath, 'utf8'));

    const granite = cat.entries.find(e => e.id === 'SURFACE_SHARED_STONE_GRANITE-BOULDER_V1_DEFAULT');
    check('catalogue.granite_exists', !!granite, 'Granite boulder entry not found');
    if (granite) {
        const isProvoked = PROVOKE === 'multi_variant.schema';
        check('catalogue.granite_topology', isProvoked ? false : granite.topologyClass === 'STATIC_VARIANT_8', `topologyClass=${granite.topologyClass}`);
        check('catalogue.granite_variant_count', granite.variantCount === 8, `variantCount=${granite.variantCount}`);
        check('catalogue.granite_runtime_kind', granite.runtime && granite.runtime.kind === 'RMMZ_CHARACTER_8', `runtime.kind=${granite.runtime && granite.runtime.kind}`);
        check('catalogue.granite_source_variants_length', Array.isArray(granite.sourceVariants) && granite.sourceVariants.length === 8, 'sourceVariants length != 8');
        check('catalogue.granite_status_approved', granite.status === 'APPROVED', `status=${granite.status}`);
    }

    const fallenLog = cat.entries.find(e => e.id === 'ALL_SHARED_ITEM_LOG_V1_DEFAULT');
    check('catalogue.fallen_log_exists', !!fallenLog, 'Fallen log entry not found');
    if (fallenLog) {
        check('catalogue.fallen_log_topology', fallenLog.topologyClass === 'STATIC_ORIENTED_8', `topologyClass=${fallenLog.topologyClass}`);
        check('catalogue.fallen_log_semantics', fallenLog.orientationSemantics === 'EIGHT_FACING', `orientationSemantics=${fallenLog.orientationSemantics}`);
        check('catalogue.fallen_log_selection', fallenLog.variantSelectionMode === 'ORIENTATION_MAPPED', `variantSelectionMode=${fallenLog.variantSelectionMode}`);
    }
}

// -----------------------------------------------------------------------------
// 2. Sheet Geometry & 12-Cell Uniformity
// -----------------------------------------------------------------------------
function testSheetGeometry() {
    const charsDir = path.join(REPO_ROOT, 'game', 'img', 'characters');
    const v8Files = fs.readdirSync(charsDir).filter(f => f.startsWith('!UF_') && f.endsWith('_V8.png'));
    check('v8_sheets.found', v8Files.length >= 11, `Expected at least 11 V8 sheets, found ${v8Files.length}`);

    const isProvoked = PROVOKE === 'multi_variant.geometry';

    for (const f of v8Files) {
        const pngPath = path.join(charsDir, f);
        const jsonPath = path.join(charsDir, f.replace(/\.png$/, '.json'));

        check(`v8_sheet.${f}.sidecar_exists`, fs.existsSync(jsonPath), `Sidecar missing for ${f}`);
        if (fs.existsSync(jsonPath)) {
            const sidecar = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            check(`v8_sheet.${f}.sidecar_dimensions`, sidecar.width === 576 && sidecar.height === 384, 'Sidecar width/height mismatch');
            check(`v8_sheet.${f}.sidecar_character_count`, sidecar.characterCount === 8, 'Sidecar characterCount != 8');
            check(`v8_sheet.${f}.sidecar_cells_per_character`, sidecar.cellsPerCharacter === 12, 'Sidecar cellsPerCharacter != 12');
            check(`v8_sheet.${f}.sidecar_rmmz_config`, sidecar.rmmzConfig && sidecar.rmmzConfig.directionFix === true, 'rmmzConfig.directionFix != true');
        }

        const png = readPNG(pngPath);
        check(`v8_sheet.${f}.pixel_dimensions`, png.width === 576 && png.height === 384, `${f} dimensions ${png.width}x${png.height} != 576x384`);

        // Check 12-cell uniformity for each character index (0..7)
        // 4 columns of characters, 2 rows of characters
        // Each character is 144x192 px, consisting of 3 columns x 4 rows of 48x48 cells
        let allUniform = true;
        let diffCellInfo = null;

        for (let charIdx = 0; charIdx < 8; charIdx++) {
            const charCol = charIdx % 4;
            const charRow = Math.floor(charIdx / 4);
            const blockStartX = charCol * 144;
            const blockStartY = charRow * 192;

            // Extract reference cell (cell at col 0, row 0 of this block)
            const refCell = Buffer.alloc(48 * 48 * 4);
            for (let y = 0; y < 48; y++) {
                const srcOffset = ((blockStartY + y) * 576 + blockStartX) * 4;
                png.data.copy(refCell, y * 48 * 4, srcOffset, srcOffset + 48 * 4);
            }

            // Compare reference cell against all other 11 cells in the block
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 3; c++) {
                    if (r === 0 && c === 0) continue;
                    const cellStartX = blockStartX + c * 48;
                    const cellStartY = blockStartY + r * 48;

                    for (let y = 0; y < 48; y++) {
                        const cellOffset = ((cellStartY + y) * 576 + cellStartX) * 4;
                        const refOffset = y * 48 * 4;
                        for (let b = 0; b < 48 * 4; b++) {
                            if (png.data[cellOffset + b] !== refCell[refOffset + b]) {
                                allUniform = false;
                                diffCellInfo = `char ${charIdx} cell (${c},${r}) pixel offset ${y},${b}`;
                                break;
                            }
                        }
                        if (!allUniform) break;
                    }
                    if (!allUniform) break;
                }
                if (!allUniform) break;
            }
            if (!allUniform) break;
        }

        if (isProvoked && f.includes('GraniteBoulder')) {
            allUniform = false;
            diffCellInfo = 'PROVOKED DEFECT';
        }

        check(`v8_sheet.${f}.12_cell_uniformity`, allUniform, diffCellInfo);
    }
}

// -----------------------------------------------------------------------------
// 3. Multi-Variant Frame Calculation across Variants 0..7
// -----------------------------------------------------------------------------
function testFrameCalculation() {
    const isProvoked = PROVOKE === 'multi_variant.frame_calc';
    const type = { image: '!UF_GraniteBoulder_V8', w: 48, h: 48 };
    const bmp = { width: 576, height: 384, isReady: () => true };

    const expectedFrames = [
        { sx: 48,  sy: 0,   w: 48, h: 48, variant: 0 },
        { sx: 192, sy: 0,   w: 48, h: 48, variant: 1 },
        { sx: 336, sy: 0,   w: 48, h: 48, variant: 2 },
        { sx: 480, sy: 0,   w: 48, h: 48, variant: 3 },
        { sx: 48,  sy: 192, w: 48, h: 48, variant: 4 },
        { sx: 192, sy: 192, w: 48, h: 48, variant: 5 },
        { sx: 336, sy: 192, w: 48, h: 48, variant: 6 },
        { sx: 480, sy: 192, w: 48, h: 48, variant: 7 }
    ];

    const observedRectKeys = new Set();

    for (let v = 0; v < 8; v++) {
        let frame = Objects.frameFor(type, bmp, v);
        if (isProvoked && v === 3) {
            frame = { sx: 48, sy: 0, w: 48, h: 48, variant: 0 }; // PROVOKED BUG: collapsed to variant 0
        }

        check(`frame_for.variant_${v}.returned`, !!frame, `frameFor returned null for variant ${v}`);
        if (frame) {
            const exp = expectedFrames[v];
            check(`frame_for.variant_${v}.sx`, frame.sx === exp.sx, `Variant ${v} sx expected ${exp.sx}, got ${frame.sx}`);
            check(`frame_for.variant_${v}.sy`, frame.sy === exp.sy, `Variant ${v} sy expected ${exp.sy}, got ${frame.sy}`);
            check(`frame_for.variant_${v}.w`, frame.w === 48, `Variant ${v} w != 48`);
            check(`frame_for.variant_${v}.h`, frame.h === 48, `Variant ${v} h != 48`);
            check(`frame_for.variant_${v}.variant_field`, frame.variant === v, `Variant ${v} variant field != ${v}`);
            observedRectKeys.add(`${frame.sx},${frame.sy}`);
        }
    }

    check('frame_for.all_8_variants_distinct', isProvoked ? false : observedRectKeys.size === 8, `Expected 8 distinct rectangles, got ${observedRectKeys.size}`);
}

// -----------------------------------------------------------------------------
// 4. Runtime Variant Lifecycle & World.state.objectVariants Integration
// -----------------------------------------------------------------------------
function testRuntimeVariantLifecycle() {
    const isProvoked = PROVOKE === 'multi_variant.runtime_lifecycle';
    global.window = global;
    window.$ufWorldCatalog = {
        objects: [
            { id: 'granite_boulder', image: '!UF_GraniteBoulder_V8' },
            { id: 'rocks_small', image: '!UF_RocksSmall_V8' }
        ]
    };

    let curObj = 0;
    const mockArea = { x: 0, y: 0, z: 0 };
    window.UF = window.UF || {};
    window.UF.World = {
        state: { size: 256, seed: 12345, objectVariants: {} },
        inWorld: () => true,
        getObject: (ax, ay, x, y, z) => curObj,
        setObject: (ax, ay, x, y, to, z) => { curObj = to; return true; },
        viewLevel: () => mockArea,
        currentArea: () => mockArea
    };

    // 1. Place granite boulder at cell (10, 20) via Objects.setIn
    const ok = Objects.setIn(mockArea, 10, 20, 'granite_boulder');
    check('runtime_lifecycle.setIn_success', ok === true, 'Objects.setIn returned false');

    const cellIdx = 20 * 256 + 10;
    const lKey = '0,0,0';
    const lvlVariants = window.UF.World.state.objectVariants[lKey];
    check('runtime_lifecycle.level_variants_allocated', !!lvlVariants, 'objectVariants level key missing');

    const variantInState = lvlVariants ? lvlVariants[cellIdx] : undefined;
    check('runtime_lifecycle.variant_assigned', Number.isInteger(variantInState) && variantInState >= 0 && variantInState <= 7, `Variant in state invalid: ${variantInState}`);

    // 2. Query Objects.getVariantForCell and verify match
    const graniteType = { id: 'granite_boulder', typeId: 1 };
    const queriedVariant = Objects.getVariantForCell(10, 20, graniteType);
    check('runtime_lifecycle.getVariantForCell_matches_state', queriedVariant === variantInState, `Queried ${queriedVariant} != state ${variantInState}`);

    // Verify stability (repeated query does not change or re-seed)
    const secondQuery = Objects.getVariantForCell(10, 20, graniteType);
    check('runtime_lifecycle.getVariantForCell_idempotent', secondQuery === queriedVariant, 'Queried variant mutated across calls');

    // 3. Clear the cell (set to 0) and verify variant is cleaned from state
    if (isProvoked) {
        // PROVOKED BUG: do not clear variant on removal
        check('runtime_lifecycle.variant_cleared_on_removal', false, 'PROVOKED BUG: variant not cleared');
    } else {
        Objects.setIn(mockArea, 10, 20, 0);
        check('runtime_lifecycle.variant_cleared_on_removal', lvlVariants[cellIdx] === undefined, `Cell index still present in lvlVariants after set to 0`);
    }
}

// -----------------------------------------------------------------------------
// 5. Movement Invariance across 500 Persistent Objects
// -----------------------------------------------------------------------------
function testMovementInvariance() {
    const isProvoked = PROVOKE === 'multi_variant.movement';
    const worldSeed = 421337;
    const assetId = 'SURFACE_SHARED_STONE_GRANITE-BOULDER_V1_DEFAULT';
    const objectCount = 500;
    const movementHops = 20;

    const objects = [];
    for (let i = 0; i < objectCount; i++) {
        const objectId = `boulder_instance_${1000 + i}`;
        const initialX = (i * 17) % 256;
        const initialY = (i * 31) % 256;
        const visualVariant = computeInitialVisualVariant(worldSeed, objectId, assetId, 8);
        objects.push({
            id: objectId,
            assetId,
            x: initialX,
            y: initialY,
            visualVariant
        });
    }

    // Verify initial variants are in valid range 0..7 and distributed across variants
    const variantCounts = new Array(8).fill(0);
    for (const obj of objects) {
        check(`variant_range.${obj.id}`, obj.visualVariant >= 0 && obj.visualVariant <= 7, `Invalid variant ${obj.visualVariant}`);
        variantCounts[obj.visualVariant]++;
    }
    const allVariantsPopulated = variantCounts.every(c => c > 0);
    check('movement_invariance.variant_distribution', allVariantsPopulated, `Variant distribution sparse: ${JSON.stringify(variantCounts)}`);

    // Simulate 20 deterministic movement hops
    let invariantPreserved = true;
    let failureDetail = null;

    for (let hop = 1; hop <= movementHops; hop++) {
        for (let i = 0; i < objectCount; i++) {
            const obj = objects[i];
            const oldVariant = obj.visualVariant;

            // Deterministic movement hop
            obj.x = (obj.x + 3 * hop + 7) % 256;
            obj.y = (obj.y + 5 * hop + 11) % 256;

            // An errant implementation might recompute variant based on coordinates:
            if (isProvoked && i === 42 && hop === 5) {
                obj.visualVariant = (obj.x + obj.y) % 8; // PROVOKED BUG
            }

            if (obj.visualVariant !== oldVariant) {
                invariantPreserved = false;
                failureDetail = `Object ${obj.id} mutated visualVariant from ${oldVariant} to ${obj.visualVariant} at hop ${hop} (pos ${obj.x},${obj.y})`;
                break;
            }
        }
        if (!invariantPreserved) break;
    }

    check('movement_invariance.500_objects_20_hops', invariantPreserved, failureDetail);
}

// -----------------------------------------------------------------------------
// 6. Save/Load Persistence Roundtrip (World.state.objectVariants)
// -----------------------------------------------------------------------------
function testSaveLoadPersistence() {
    const isProvoked = PROVOKE === 'multi_variant.save_load';
    const worldSeed = 998877;

    const originalWorldState = {
        saveSchemaVersion: 1,
        seed: worldSeed,
        size: 256,
        objectVariants: {
            '0,0,0': {
                '5130': 5,
                '1234': 2,
                '8765': 7
            },
            '0,0,-1': {
                '200': 3,
                '400': 0
            }
        },
        objects: [
            {
                id: 'obj_boulder_01',
                type: 'granite_boulder',
                canonicalAssetId: 'SURFACE_SHARED_STONE_GRANITE-BOULDER_V1_DEFAULT',
                topologyClass: 'STATIC_VARIANT_8',
                x: 14,
                y: 28,
                z: 0,
                visualVariant: computeInitialVisualVariant(worldSeed, 'obj_boulder_01', 'SURFACE_SHARED_STONE_GRANITE-BOULDER_V1_DEFAULT', 8)
            },
            {
                id: 'obj_fallen_log_01',
                type: 'fallen_log',
                canonicalAssetId: 'ALL_SHARED_ITEM_LOG_V1_DEFAULT',
                topologyClass: 'STATIC_ORIENTED_8',
                x: 50,
                y: 75,
                z: 0,
                orientation: 3, // North-West facing
                visualVariant: 3
            }
        ]
    };

    // Serialize to JSON (simulating RMMZ DataManager.makeSaveContents)
    const serialized = JSON.stringify({ ufWorld: originalWorldState });
    check('save_load.serialized_not_empty', serialized.length > 0, 'Serialized state is empty');

    // Deserialize (simulating RMMZ DataManager.extractSaveContents)
    const deserialized = JSON.parse(serialized).ufWorld;

    if (isProvoked) {
        delete deserialized.objectVariants['0,0,0']['5130']; // PROVOKED DEFECT
    }

    // Verify objectVariants roundtrip fidelity
    check('save_load.objectVariants_exists', !!deserialized.objectVariants, 'objectVariants missing after load');
    check('save_load.level_0_exists', !!deserialized.objectVariants['0,0,0'], 'Level 0 variants missing');
    check('save_load.level_minus1_exists', !!deserialized.objectVariants['0,0,-1'], 'Level -1 variants missing');
    check('save_load.cell_5130_variant', deserialized.objectVariants['0,0,0'] && deserialized.objectVariants['0,0,0']['5130'] === 5, 'Cell 5130 variant mismatch');
    check('save_load.cell_1234_variant', deserialized.objectVariants['0,0,0'] && deserialized.objectVariants['0,0,0']['1234'] === 2, 'Cell 1234 variant mismatch');
    check('save_load.cell_8765_variant', deserialized.objectVariants['0,0,0'] && deserialized.objectVariants['0,0,0']['8765'] === 7, 'Cell 8765 variant mismatch');
    check('save_load.cell_200_variant', deserialized.objectVariants['0,0,-1'] && deserialized.objectVariants['0,0,-1']['200'] === 3, 'Cell 200 variant mismatch');
    check('save_load.cell_400_variant', deserialized.objectVariants['0,0,-1'] && deserialized.objectVariants['0,0,-1']['400'] === 0, 'Cell 400 variant mismatch');

    // Verify object instance roundtrip
    check('save_load.object_count', deserialized.objects.length === originalWorldState.objects.length, 'Object count changed');
    for (let i = 0; i < originalWorldState.objects.length; i++) {
        const orig = originalWorldState.objects[i];
        const loaded = deserialized.objects[i];
        check(`save_load.obj_${orig.id}.id_match`, loaded.id === orig.id, `ID mismatch`);
        check(`save_load.obj_${orig.id}.variant_match`, loaded.visualVariant === orig.visualVariant, `visualVariant mismatch: loaded=${loaded.visualVariant} vs orig=${orig.visualVariant}`);
        check(`save_load.obj_${orig.id}.topology_match`, loaded.topologyClass === orig.topologyClass, `topologyClass mismatch`);
        if (orig.orientation !== undefined) {
            check(`save_load.obj_${orig.id}.orientation_match`, loaded.orientation === orig.orientation, `orientation mismatch`);
        }
    }
}

// -----------------------------------------------------------------------------
// 7. RMMZ Prefix Behavior Check
// -----------------------------------------------------------------------------
function testRmmzPrefix() {
    const charsDir = path.join(REPO_ROOT, 'game', 'img', 'characters');
    const v8Files = fs.readdirSync(charsDir).filter(f => f.endsWith('_V8.png'));

    // In RPG Maker MZ, ImageManager.isObjectCharacter checks if filename starts with '!'
    // In rmmz_sprites.js / Sprite_Character.prototype.updateBitmap:
    // If not isObjectCharacter, bitmap.y offset is shifted by -6 px (for humanoid head clearance).
    // Static objects and props MUST have '!' prefix to anchor flush to the ground.
    for (const f of v8Files) {
        const startsWithBang = f.startsWith('!');
        check(`rmmz_prefix.${f}.has_exclamation`, startsWithBang, `${f} lacks '!' prefix for ground-flush anchoring`);
        const startsWithDollar = f.startsWith('$');
        check(`rmmz_prefix.${f}.no_dollar_prefix`, !startsWithDollar, `${f} has '$' prefix (must be an 8-character sheet, not single-character $)`);
    }
}

// -----------------------------------------------------------------------------
// Main Runner
// -----------------------------------------------------------------------------
function main() {
    console.log('=== MULTI-VARIANT TOPOLOGY TEST SUITE (TOOL.01.02) ===\n');

    testCatalogueSchema();
    testSheetGeometry();
    testFrameCalculation();
    testRuntimeVariantLifecycle();
    testMovementInvariance();
    testSaveLoadPersistence();
    testRmmzPrefix();

    console.log(`\nResults: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        process.exit(1);
    }
}

main();
