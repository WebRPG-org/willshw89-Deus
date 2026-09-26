#!/usr/bin/env node
'use strict';
/**
 * tools/art/validate_asset_standard.js
 *
 * WG.20.01 coverage report for the DEUS asset standard.
 * Reads the catalogue, UF_AssetStandard.json, the spell-visual schema, the SRD spell list
 * and (read only) game/data/srd51/creatures.json for the dimorphic-name check.
 * It does not create or modify files, and it does not read or draw pixels (DEC-007).
 *
 *   node tools/art/validate_asset_standard.js [--json] [--category CAT] [--strict]
 *        [--catalogue path] [--standard path] [--spell-schema path] [--spells path]
 *        [--creatures path]
 *        [--biome-registry path]   (repeatable; default is the two DEUS biome registries, read only)
 *
 * Default exit is 0 when the files parse. --strict exits 1 when any rule result is a violation.
 * Exit 2 is a usage or read error.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const ID_RE = /^[A-Z0-9]+(-[A-Z0-9]+)*(_[A-Z0-9]+(-[A-Z0-9]+)*){5}$/;
const ART_KEY_RE = /^[a-z0-9_]+__[a-z]+(?:-[a-z]+)*$/;
const LAYER_FILE_RE = /^\$UF_Layer_[a-z0-9_]+__[a-z]+(?:-[a-z]+)*\.png$/;
const CHAR_FILE_RE = /^[$][A-Za-z0-9_]+\.png$/;
const OBJECT_FILE_RE = /^![A-Za-z0-9_]+\.png$/;
const FACE_FILE_RE = /^UF_Faces_[a-z0-9-]+_\d+\.png$/;
const RACE_WORDS = ['elven', 'dwarven', 'orcish', 'gnomish'];
const DIR_CATS = { CHARACTER: 1, CREATURE: 1, EQUIPMENT: 1 };
const FRAME_CATS = { CHARACTER: 1, CREATURE: 1, EQUIPMENT: 1 };
const PORTRAIT_CATS = { ITEM: 1, EQUIPMENT: 1, CREATURE: 1, TREE: 1, VEIN: 1, FLORA: 1, STONE: 1, STRUCTURE: 1, FURNITURE: 1, WORKSHOP: 1 };
const PORTRAIT_FILE_RE = /^UF_Portrait_[a-z0-9_]+(?:__[a-z]+(?:-[a-z]+)*)?\.png$/;
const SEXED_KEY_RE = /^[a-z0-9_]+__[a-z]+(?:-[a-z]+)*__(adult-male|adult-female|child)$/;

// A9b constants. The JSON must match these. A loosened copy in the JSON fails.
const DIR_TOKENS = [
    { id: 'D', facing: 'S' },
    { id: 'L', facing: 'W' },
    { id: 'R', facing: 'E' },
    { id: 'U', facing: 'N' }
];
const SOURCE_CAP = 2048;
const RMMZ_NATIVE = {
    charset: [576, 384],
    faces: [576, 288],
    'sv-battler': [576, 384],
    'tileset-b-e': [768, 768],
    balloon: [384, 720],
    window: [192, 192]
};
const PAPER_DOLL = { w: 768, h: 1440, cols: 16, rows: 30, cell: 48, actionRows: 30 };
const DIMORPHIC_SRD = ['Lion', 'Deer', 'Elk', 'Giant Elk', 'Boar', 'Giant Boar', 'Goat', 'Giant Goat', 'Draft Horse', 'Riding Horse', 'Warhorse', 'Pony', 'Elephant', 'Mammoth', 'Baboon', 'Ape'];
const DIMORPHIC_LIVESTOCK = ['Cattle', 'Sheep', 'Pig', 'Chicken', 'Duck'];
const GEN_CATEGORIES = ['humanoid-layer', 'face-layer', 'creature', 'terrain-tile', 'building-piece', 'item-icon', 'portrait', 'effect', 'ui'];
const GARB_BODIES = ['adult-male', 'adult-female', 'child'];
const SEX_PARTS = ['preset-head'];
const KIT_LAYERS = ['kit-monk-wraps', 'kit-monk-sash', 'kit-wizard-robe', 'kit-cleric-tabard', 'kit-sorcerer-mantle', 'kit-druid-mantle', 'kit-bard-cape', 'kit-warlock-cloak', 'kit-wizard-hat', 'kit-wizard-hood', 'kit-warlock-hood', 'kit-druid-circlet', 'kit-bard-cap', 'kit-monk-topknot'];
const HELD_ITEMS = ['wizard-staff', 'druid-staff', 'warlock-orb', 'cleric-mace', 'cleric-censer', 'bard-lute'];
const MARTIAL_CLASSES = ['barbarian', 'fighter', 'paladin', 'ranger', 'rogue'];
const CHARSET_ORDER = ['base-body-race-garb', 'race-features', 'preset-head', 'kit-body-hugging', 'kit-long', 'armour', 'kit-mantle', 'kit-cape-cloak', 'headwear', 'held-and-weapon', 'hand-glow'];
const PORTRAIT_STYLE_REF = 'tasks/WG.20.01/lane-al/refs/OWNER_PORTRAIT_STYLE_REF_01.png';
const PORTRAIT_STYLE_SHA256 = 'b1c0c721bcbd7eca39b69488073b4d0beff73fb590cb39dcd9c74a86ccafb984';
const RETIRED_FACE_LAYER_IDS = [
    'FA.BG.ELF.F.07.NEUTRAL.C0',
    'FA.FRAME.HUMAN.M.01.NEUTRAL.C0',
    'FA.BODY.HUMAN.M.01.NEUTRAL.C0',
    'FA.OVERLAY.HUMAN.M.01.NEUTRAL.C0',
    'FA.HAIR.HUMAN.M.01.NEUTRAL.C0'
];
const ANCHOR_REJECT = ['clipping', 'wrong-proportions', 'wrong-size', 'head-drift'];
const ANCHOR_LANDMARKS = ['feet-bottom-centre', 'head-centre', 'main-hand', 'off-hand'];
const ANCHOR_DETECTION = ['transparent-pixel-mask', 'silhouette', 'foot-line', 'head-outline'];
const EXAMPLE_SLOT_ID = 'CH.HAIR.ELF.F.07.WALK.D.F2';
const EXAMPLE_SHEET_ID = 'paperdoll:elf:f:hair:07';
const EXAMPLE_SHEET_FILE = 'art/approved/paperdoll/CH_HAIR_ELF_F_07.png';
const ID_GRAMMAR = {
    'charset-layer': '^CH\\.(BODY-ELDER|BODY-CHILD|BODY|HAIR-BACK|HAIR|BALD|BEARD|EYES|EARS|HORNS|TAIL|SCALES|GARB|ARMOR|LEGS|TORSO|HEAD|BACK|CAPE|ROBE|CLASS|KIT|RACEGARB|MONK)\\.(HUMAN|ELF|HALFLING|DWARF|GNOME|DRAGONBORN|HALF-ELF|HALF-ORC|TIEFLING)\\.(M|F|C)\\.[0-9]{2}\\.(IDLE|WALK|MELEE-SWING|THRUST|BOW-DRAW|BOW-LOOSE|XBOW-AIM|XBOW-FIRE|XBOW-RELOAD|THROWN|CAST-ONE-HAND|CAST-TWO-HAND|CAST-FOCUS|HAMMER|SAW|CHOP|DIG|STIR|CARRY|KNEEL|HURT|DODGE|PARRY|DEATH|SNEAK|CLIMB|PRONE|UNCONSCIOUS|SLEEP|SIT|MONK-IDLE)\\.(D|L|R|U)\\.F[0-3]$',
    face: '^FA\\.(BG|FRAME|BODY|FEATURES|HAIR|GEAR|OVERLAY|PRESET)\\.(HUMAN|ELF|HALFLING|DWARF|GNOME|DRAGONBORN|HALF-ELF|HALF-ORC|TIEFLING)\\.(M|F|C)\\.[0-9]{2}\\.(NEUTRAL|HAPPY|ANGRY|SAD|SURPRISED|HURT|DETERMINED|AFRAID)\\.C[0-7]$',
    creature: '^CR\\.[A-Z][A-Z0-9-]*\\.(M|F|N)\\.(BASE|TAMED|SADDLE)\\.[A-Z][A-Z0-9-]*\\.(D|L|R|U)\\.F[0-3]$',
    icon: '^IC\\.[A-Z][A-Z0-9-]*\\.[A-Z][A-Z0-9-]*\\.[A-Z][A-Z0-9-]*$',
    portrait: '^PO\\.[A-Z][A-Z0-9-]*\\.[A-Z][A-Z0-9-]*\\.[A-Z0-9-]+$',
    tile: '^TL\\.(VOLCANIC|WET|ARID|TEMPERATE|COLD|WILD)\\.(DEEP|CAVERN|LOWLAND|UPLAND|HIGHLAND|AIR)\\.[A-Z][A-Z0-9-]*\\.[0-9]{2}\\.(SPRING|SUMMER|AUTUMN|WINTER)$',
    building: '^BD\\.(HUMAN-FRONTIER|DWARF-STONEHOLD|ELF-GLADE|HALFLING-HOMESTEAD|DRAGONBORN-CITADEL|GOBLIN-SALVAGE)\\.(FOUNDATION|WALL-TOP|WALL|ROOF-EDGE|ROOF-FILL|DOOR|WINDOW|FLOOR|PILLAR|CONNECTOR|FURNITURE|WORKSTATION)\\.(INTACT|RUINED|CHARRED)\\.[0-9]{2}$',
    effect: '^FX\\.(CAST|DELIVERY|IMPACT|AURA)\\.[A-Z][A-Z0-9-]*\\.[A-Z][A-Z0-9-]*\\.F[0-9]{1,2}$',
    ui: '^UI\\.(DEUS-DARK|DEUS|RACE-HALF-ELF|RACE-HALF-ORC|RACE-DRAGONBORN|RACE-HALFLING|RACE-HUMAN|RACE-DWARF|RACE-GNOME|RACE-TIEFLING|RACE-ELF)\\.(WINDOW|BUTTON|CURSOR|TITLE|LOADING|FONT|PAUSE|TEXT)\\.(NORMAL|HOVER|PRESSED|DEFAULT|DISABLED)$',
    'ground-mark': '^GM\\.(SNOW|MUD|SAND|BLOOD|WET)\\.(BOOT|BARE|PAW|HOOF|PATH)\\.(D|L|R|U)\\.F[0-2]$',
    glow: '^GL\\.[A-Z][A-Z0-9-]*\\.F[0-9]{2}$',
    decal: '^DC\\.(VOLCANIC|WET|ARID|TEMPERATE|COLD|WILD)\\.(PEBBLE|TUFT|CRACK|LEAF)\\.[0-9]{2}$',
    'wang-tile': '^WG\\.(VOLCANIC|WET|ARID|TEMPERATE|COLD|WILD)\\.[A-Z][A-Z0-9-]*\\.[A-Z][A-Z0-9-]*\\.[0-9]{2}$',
    'world-sprite': '^WS\\.[A-Z][A-Z0-9-]*\\.(12|24|48)\\.(D|L|R|U)$',
    container: '^CN\\.[A-Z][A-Z0-9-]*\\.(OPEN|CLOSED|WINDOW)\\.(D|L|R|U)$',
    damage: '^DM\\.[A-Z][A-Z0-9-]*\\.(GROUND|WALL|OBJECT)\\.S[1-4]$',
    construction: '^CS\\.(HUMAN-FRONTIER|DWARF-STONEHOLD|ELF-GLADE|HALFLING-HOMESTEAD|DRAGONBORN-CITADEL|GOBLIN-SALVAGE)\\.(GHOST|BLUEPRINT|FOUNDATION|SCAFFOLD|PARTIAL|PROP|ANIM)\\.[0-9]{2}$',
    'cross-layer': '^XL\\.(COLLAPSE|BREACH|CAVEIN)\\.S[1-4]\\.[0-9]{2}$',
    season: '^SE\\.(TERRAIN|VEGETATION|BUILDING|OBJECT)\\.(VOLCANIC|WET|ARID|TEMPERATE|COLD|WILD)\\.(SPRING|SUMMER|AUTUMN|WINTER)\\.[0-9]{2}$',
    'work-anim': '^WK\\.(FARM|MINE|CHOP|BUILD|CRAFT|CARRY|FISH|COOK)\\.(D|L|R|U)\\.F[0-5]$',
    depth: '^DP\\.(CLIFF|SHADOW|RIM|RAMP|SLOPE|OVERLAY)\\.(VOLCANIC|WET|ARID|TEMPERATE|COLD|WILD)\\.[A-Z0-9-]+$',
    placeable: '^PL\\.[A-Z][A-Z0-9-]*\\.(D|L|R|U)$',
    marker: '^CB\\.(SELECT|FACTION|SUMMON|LOWHP)\\.[A-Z][A-Z0-9-]*$',
    font: '^FN\\.[A-Z0-9]+\\.(DAMAGE|STATUS)$',
    'range-marker': '^RG\\.(SQUARE|LINE|CONE|SPHERE|CYLINDER)\\.[0-9]{2}$',
    'hit-spark': '^SP\\.(SLASH|PIERCE|BLUDGEON)\\.F[0-2]$',
    'weapon-angle': '^WP\\.[A-Z0-9-]+\\.(UPRIGHT|BAKED)\\.F[0-7]$',
    'held-item': '^HI\\.(WIZARD-STAFF|DRUID-STAFF|WARLOCK-ORB|CLERIC-MACE|CLERIC-CENSER|BARD-LUTE)\\.(UPRIGHT|A45|A90)\\.F[0-7]$'
};

function readJson(file) {
    const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(text);
}

function clone(v) { return JSON.parse(JSON.stringify(v)); }

function result(ruleId, status, reason) {
    return { ruleId, result: status, reason: reason || '' };
}

function sameSet(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    const s = new Set(a);
    return b.every(x => s.has(x));
}

function sameList(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

function frameOf(entry) {
    if (Array.isArray(entry.framePx) && entry.framePx.length === 2) return entry.framePx;
    const slot = entry.slot;
    const frames = entry.frames;
    if (!slot || !frames) return null;
    const cols = frames.cols;
    const rows = frames.rows;
    if (!cols || !rows) return null;
    if (slot.w % cols !== 0 || slot.h % rows !== 0) return null;
    return [slot.w / cols, slot.h / rows];
}

function isCritter(entry) {
    if (entry.category !== 'CREATURE') return false;
    if (entry.sizeClass === 'Tiny' || entry.sizeClass === 'Small') return true;
    if (entry.frameClass === 'TINY' || entry.frameClass === 'SMALL') return true;
    return false;
}

function isBeast(entry) {
    return entry.category === 'CREATURE' && !isCritter(entry);
}

function raceSpecificItemId(id, races) {
    const s = String(id || '').toLowerCase();
    if (s.indexOf('__') !== -1) return true;
    if (RACE_WORDS.some(w => s.indexOf(w) !== -1)) return true;
    const parts = s.split(/[_-]/);
    return parts.some(p => races.indexOf(p) !== -1);
}

function bandVocab(entry, standard) {
    const bands = new Set(standard.bands.map(b => b.id).concat(standard.sharedTokens.band));
    const biomes = new Set(standard.biomes.concat(standard.sharedTokens.biome, standard.transitions));
    const legacyB = new Set(standard.legacyBands);
    const legacyM = new Set(standard.legacyBiomes);
    if (!entry.band || !entry.biome) {
        return result('AS-GLOBAL-019', 'unknown', 'band or biome is absent');
    }
    const bOk = bands.has(entry.band);
    const mOk = biomes.has(entry.biome);
    if (bOk && mOk) return result('AS-GLOBAL-019', 'pass', entry.band + '/' + entry.biome);
    if (legacyB.has(entry.band) || legacyM.has(entry.biome)) {
        return result('AS-GLOBAL-019', 'unknown', 'legacy catalogue vocabulary ' + entry.band + '/' + entry.biome);
    }
    return result('AS-GLOBAL-019', 'violate', 'band/biome ' + entry.band + '/' + entry.biome + ' is not a DEC-030 token');
}

function checkEntry(entry, standard) {
    const out = [];
    const id = entry && entry.id;
    if (!id || !ID_RE.test(id)) out.push(result('AS-GLOBAL-010', 'violate', 'id is not BAND_BIOME_CATEGORY_TYPE_VARIANT_STATE'));
    else out.push(result('AS-GLOBAL-010', 'pass', id));
    out.push(bandVocab(entry, standard));

    if (DIR_CATS[entry.category]) {
        const facings = entry.frames && entry.frames.facings;
        if (!Array.isArray(facings) || facings.length === 0) {
            out.push(result('AS-GLOBAL-022', 'unknown', 'no facings declared'));
            out.push(result('AS-GLOBAL-023', 'unknown', 'no facings declared'));
        } else if (facings.some(f => standard.diagonalFacings.indexOf(f) !== -1)) {
            out.push(result('AS-GLOBAL-022', 'violate', 'diagonals are not a four-direction sheet'));
            out.push(result('AS-GLOBAL-023', 'violate', 'legacy 8-way facings ' + facings.join(',')));
        } else if (facings.length === 4 && standard.directions.every(d => facings.indexOf(d) !== -1)) {
            out.push(result('AS-GLOBAL-022', 'pass', facings.join(',')));
            out.push(result('AS-GLOBAL-023', 'pass', 'no diagonal facings'));
        } else {
            out.push(result('AS-GLOBAL-022', 'violate', 'facings ' + facings.join(',')));
            out.push(result('AS-GLOBAL-023', 'pass', 'no diagonal facings'));
        }
    }

    if (FRAME_CATS[entry.category]) {
        const expected = Object.prototype.hasOwnProperty.call(standard.frameClassPx, entry.frameClass)
            ? standard.frameClassPx[entry.frameClass] : undefined;
        const actual = frameOf(entry);
        if (expected === undefined) {
            /* not a sized character frame */
        } else if (expected === null) {
            if (!actual) out.push(result('AS-CRIT-004', 'unknown', 'Huge/Gargantuan frame size is open and no frame is declared'));
            else if (actual[0] % standard.gridPx !== 0 || actual[1] % standard.gridPx !== 0) {
                out.push(result('AS-GLOBAL-001', 'violate', 'frame ' + actual.join('x') + ' is not a multiple of 48'));
            } else out.push(result('AS-CRIT-004', 'unknown', 'exact Huge/Gargantuan frame is open'));
        } else if (!actual) {
            out.push(result('AS-CRIT-004', 'unknown', 'frame size cannot be derived'));
        } else if (actual[0] !== expected[0] || actual[1] !== expected[1]) {
            out.push(result('AS-CRIT-004', 'violate', 'frame ' + actual.join('x') + ' is not ' + expected.join('x')));
        } else out.push(result('AS-CRIT-004', 'pass', actual.join('x')));
    }

    if (entry.category === 'FACE') {
        const actual = frameOf(entry);
        const cols = entry.frames && entry.frames.cols;
        const rows = entry.frames && entry.frames.rows;
        if (!actual) out.push(result('AS-GLOBAL-014', 'unknown', 'face cell cannot be derived'));
        else if (actual[0] === 144 && actual[1] === 144 && cols === 4 && rows === 2) {
            out.push(result('AS-GLOBAL-014', 'pass', '144 in a 4x2 sheet'));
        } else out.push(result('AS-GLOBAL-014', 'violate', 'face cell/grid ' + (actual && actual.join('x')) + ' ' + cols + 'x' + rows));
    }

    if (entry.paperDoll) {
        const z = standard.paperDollZ[entry.paperDoll.layer];
        if (z === undefined) out.push(result('AS-HUM-004', 'violate', 'unknown paperDoll layer ' + entry.paperDoll.layer));
        else if (entry.paperDoll.zOrder !== z) out.push(result('AS-HUM-004', 'violate', entry.paperDoll.layer + ' zOrder ' + entry.paperDoll.zOrder + ' is not ' + z));
        else out.push(result('AS-HUM-004', 'pass', entry.paperDoll.layer + ' z' + z));
    } else if (entry.category === 'EQUIPMENT') {
        const status = entry.status === 'MISSING' ? 'unknown' : 'violate';
        out.push(result('AS-HUM-004', status, 'equipment entry has no paperDoll'));
    }

    if (entry.category === 'CREATURE') {
        if (!Array.isArray(entry.declaredRows)) out.push(result('AS-CRIT-001', 'unknown', 'animation rows are not on the catalogue entry'));
        else {
            const missing = standard.critterRows.filter(r => entry.declaredRows.indexOf(r) === -1);
            if (missing.length) out.push(result('AS-CRIT-001', 'violate', 'missing ' + missing.join(',')));
            else out.push(result('AS-CRIT-001', 'pass', standard.critterRows.join(',')));
        }
    }
    if (isBeast(entry)) {
        if (!Array.isArray(entry.declaredAttacks)) out.push(result('AS-BEAST-001', 'unknown', 'natural attacks are not declared'));
        else if (!Array.isArray(entry.declaredRows)) out.push(result('AS-BEAST-001', 'unknown', 'rows are not declared'));
        else {
            const missing = entry.declaredAttacks.filter(a => entry.declaredRows.indexOf('attack-' + a) === -1);
            if (missing.length) out.push(result('AS-BEAST-001', 'violate', 'missing attack-' + missing.join(', attack-')));
            else out.push(result('AS-BEAST-001', 'pass', entry.declaredAttacks.join(',')));
        }
    }
    if (entry.category === 'CHARACTER') {
        if (!Array.isArray(entry.declaredRows)) out.push(result('AS-HUM-009', 'unknown', 'action rows are not on the catalogue entry'));
        else {
            const missing = standard.humanoidRows.filter(r => entry.declaredRows.indexOf(r) === -1);
            if (missing.length) out.push(result('AS-HUM-009', 'violate', 'missing ' + missing.join(',')));
            else out.push(result('AS-HUM-009', 'pass', 'humanoid rows'));
        }
    }

    if (entry.runtime && entry.runtime.file) {
        const base = path.basename(String(entry.runtime.file));
        if (entry.category === 'EQUIPMENT') {
            if (LAYER_FILE_RE.test(base)) out.push(result('AS-STYLE-001', 'pass', base));
            else out.push(result('AS-STYLE-001', 'violate', base + ' is not $UF_Layer_<itemId>__<race>.png'));
        } else if (entry.category === 'CHARACTER' || entry.category === 'CREATURE') {
            if (CHAR_FILE_RE.test(base) || OBJECT_FILE_RE.test(base)) out.push(result('AS-STYLE-001', 'pass', base));
            else out.push(result('AS-STYLE-001', 'violate', base + ' is not a $ or ! sheet name'));
        } else if (entry.category === 'FACE') {
            if (FACE_FILE_RE.test(base)) out.push(result('AS-STYLE-001', 'pass', base));
            else out.push(result('AS-STYLE-001', 'violate', base + ' is not UF_Faces_<race>_<n>.png'));
        }
    }

    if (Object.prototype.hasOwnProperty.call(entry, 'animation') || Object.prototype.hasOwnProperty.call(entry, 'exception')) {
        out.push(animationResult(entry, standard));
    }
    if (PORTRAIT_CATS[entry.category]) {
        if (entry.icon || entry.portrait) out.push.apply(out, checkPortrait(entry, standard));
        else out.push(result('AS-PORT-001', 'unknown', 'icon and portrait are not on the catalogue entry'));
    }
    if (entry.category === 'CREATURE' || entry.category === 'CHARACTER') out.push(sizeResult(entry, standard));
    return { id: id || '', category: entry.category || '', results: out };
}

function sizeResult(entry, standard) {
    const size = entry.sizeClass;
    if (!size) return result('AS-SIZE-001', 'unknown', 'size class is not on the entry');
    let shape = entry.bodyShape;
    if (!shape) {
        if (size === 'Tiny' || size === 'Small' || size === 'Medium') shape = 'square';
        else return result('AS-SIZE-001', 'unknown', 'body shape is not declared');
    }
    const row = (standard.sizeFrames || []).find(r => r.size === size && r.shape === shape);
    if (!row) return result('AS-SIZE-001', 'violate', size + ' ' + shape + ' has no frame');
    const actual = frameOf(entry);
    if (!actual) return result('AS-SIZE-001', 'unknown', 'frame size cannot be derived');
    if (actual[0] !== row.px[0] || actual[1] !== row.px[1]) {
        return result('AS-SIZE-001', 'violate', 'frame ' + actual.join('x') + ' is not ' + row.px.join('x') + ' for ' + size + ' ' + shape);
    }
    return result('AS-SIZE-001', 'pass', row.squares[0] + 'x' + row.squares[1]);
}

function animationResult(asset, standard) {
    const frames = asset.animation && asset.animation.frames;
    if (frames > 0) return result('AS-ANIM-001', 'pass', frames + ' frames');
    if (asset.exception && standard.staticExceptions.indexOf(asset.exception) !== -1) {
        return result('AS-ANIM-001', 'pass', 'exception ' + asset.exception);
    }
    if (asset.exception) return result('AS-ANIM-001', 'violate', 'unknown exception ' + asset.exception);
    return result('AS-ANIM-001', 'violate', 'no animation and no listed exception');
}

function checkLayer(layer, standard) {
    const out = [];
    const pose = standard.poseGrid.find(p => p.id === layer.pose);
    const expect = pose ? pose.frames : null;
    if (!pose) out.push(result('AS-HUM-016', 'violate', 'unknown pose ' + layer.pose));
    else if (layer.frameCount !== expect || !Array.isArray(layer.frames) || layer.frames.length !== expect) {
        out.push(result('AS-HUM-016', 'violate', 'frame count ' + layer.frameCount + ' is not ' + expect));
    } else if (!layer.framePx || layer.framePx[0] !== layer.bodyFramePx[0] || layer.framePx[1] !== layer.bodyFramePx[1]) {
        out.push(result('AS-HUM-016', 'violate', 'layer frame size does not match the body'));
    } else if (!layer.deforming) {
        let bad = '';
        for (let i = 0; i < layer.frames.length; i++) {
            const a = layer.frames[i] && layer.frames[i].anchor;
            if (!a || !Number.isInteger(a.x) || !Number.isInteger(a.y)) bad = 'frame ' + i + ' has no anchor';
            else if (standard.angles.indexOf(a.angle) === -1) bad = 'frame ' + i + ' angle ' + a.angle;
            if (bad) break;
        }
        if (bad) out.push(result('AS-HUM-016', 'violate', bad));
        else out.push(result('AS-HUM-016', 'pass', pose.id + ' x' + expect));
    } else out.push(result('AS-HUM-016', 'pass', 'deforming piece uses per-pose frames'));

    if (layer.deforming) {
        const need = standard.poseGrid.map(p => p.id);
        const have = Array.isArray(layer.poses) ? layer.poses : [];
        const missing = need.filter(id => have.indexOf(id) === -1);
        if (missing.length) out.push(result('AS-HUM-017', 'violate', 'deforming piece missing ' + missing.join(',')));
        else out.push(result('AS-HUM-017', 'pass', layer.deformingKind || 'deforming'));
    } else out.push(result('AS-HUM-017', 'pass', 'not a deforming piece'));
    return out;
}

function faceHasLayers(face) {
    return !!(face && (face.builtFromLayers === true || (Array.isArray(face.layers) && face.layers.length > 0)));
}

function checkFace(face, standard) {
    const out = [];
    const layered = faceHasLayers(face);
    if (!face || face.raceBackground !== 'in-composition' || !face.rampId || layered) {
        out.push(result('AS-FACE-001', 'violate', 'race background is not painted into the portrait'));
    } else out.push(result('AS-FACE-001', 'pass', face.rampId));

    const expr = (face && face.expressions) || [];
    const cell = (face && face.cell) || [];
    const sheet = (face && face.sheet) || [];
    const complete = !!(face && face.completeImage === true && face.builtFromLayers === false && !layered
        && cell[0] === 144 && cell[1] === 144 && face.cols === 4 && face.rows === 2
        && sheet[0] === 576 && sheet[1] === 288 && expr.length === 8);
    if (!complete) out.push(result('AS-FACE-002', 'violate', 'faceset is not one complete sheet of 8 expressions'));
    else out.push(result('AS-FACE-002', 'pass', 'one complete faceset'));

    if (expr.length !== standard.expressions.length || expr.some((e, i) => e !== standard.expressions[i])) {
        out.push(result('AS-FACE-003', 'violate', 'expressions ' + expr.join(',')));
    } else out.push(result('AS-FACE-003', 'pass', '8 expressions'));

    const anchors = (face && face.anchors) || {};
    const names = Object.keys(standard.faceAnchors);
    let anchorOk = cell[0] === 144 && cell[1] === 144 && face.cols === 4 && face.rows === 2;
    if (anchorOk) {
        for (const name of names) {
            const p = anchors[name];
            if (!Array.isArray(p) || p.length !== 2 || !Number.isInteger(p[0]) || !Number.isInteger(p[1])) anchorOk = false;
            else if (p[0] < 0 || p[1] < 0 || p[0] > 143 || p[1] > 143) anchorOk = false;
        }
    }
    if (!anchorOk) out.push(result('AS-FACE-004', 'violate', '144 cell or anchors incomplete'));
    else out.push(result('AS-FACE-004', 'pass', 'anchors on 144'));
    if (cell[0] === 144 && cell[1] === 144 && face.cols === 4 && face.rows === 2) out.push(result('AS-GLOBAL-014', 'pass', '4x2 of 144'));
    else out.push(result('AS-GLOBAL-014', 'violate', 'face sheet geometry'));
    return out;
}

function checkItem(item, standard) {
    const out = [];
    if (raceSpecificItemId(item.id, standard.races)) out.push(result('AS-ITEM-001', 'violate', item.id + ' is a race-specific item id'));
    else out.push(result('AS-ITEM-001', 'pass', item.id));
    const key = String(item.artKey || '');
    const race = key.split('__')[1];
    if (ART_KEY_RE.test(key) && key.indexOf(item.id + '__') === 0 && standard.races.indexOf(race) !== -1 && !raceSpecificItemId(item.id, standard.races)) {
        out.push(result('AS-ITEM-002', 'pass', key));
    } else out.push(result('AS-ITEM-002', 'violate', 'art key ' + key));
    return out;
}

function checkIcon(icon, standard) {
    const out = [];
    const cell = standard.icon.cell;
    if (icon.w !== cell[0] || icon.h !== cell[1]) out.push(result('AS-ICON-001', 'violate', icon.w + 'x' + icon.h));
    else out.push(result('AS-ICON-001', 'pass', cell.join('x')));
    const baked = icon.rarity === 'redraw' || /_(rare|uncommon|epic|legendary)$/i.test(icon.id || '');
    if (baked) out.push(result('AS-ICON-003', 'violate', 'rarity is drawn into the icon'));
    else out.push(result('AS-ICON-003', 'pass', icon.rarity || 'overlay'));
    return out;
}

function checkNode(node, standard) {
    const statesOk = sameSet(node.states, standard.resourceStates);
    const biomesOk = Array.isArray(node.variants) && standard.biomes.every(b => node.variants.indexOf(b) !== -1);
    const harvestOk = node.harvestFrames > 0 && !!node.drop;
    if (statesOk && biomesOk && harvestOk) return [result('AS-NODE-001', 'pass', node.kind)];
    return [result('AS-NODE-001', 'violate', 'node ' + (node.kind || '') + ' is missing a state, biome, harvest or drop')];
}

function checkRemains(remains, standard) {
    const need = standard.remains;
    const ok = remains && remains.bodies && remains.skeleton && remains.blood && remains.scorch && remains.rubble && remains.debris
        && sameSet(remains.tileVariants, need.tileVariants) && sameSet(remains.buildingVariants, need.buildingVariants);
    return [result('AS-REMAIN-001', ok ? 'pass' : 'violate', ok ? 'remains set' : 'remains set is incomplete')];
}

function checkHaul(haul, standard) {
    const ok = haul && haul.carry === 'drawn' && haul.cart === true && sameSet(haul.fills, standard.stockpileFills);
    return [result('AS-HAUL-001', ok ? 'pass' : 'violate', ok ? 'carry drawn' : 'carry is not drawn or fills are incomplete')];
}

function checkVehicles(veh, standard) {
    const ok = veh && standard.vehicles.every(k => (veh.kinds || []).indexOf(k) !== -1)
        && sameSet(veh.directions, standard.directions) && veh.ridingRaces === standard.races.length;
    return [result('AS-VEH-001', ok ? 'pass' : 'violate', ok ? 'vehicles and riding poses' : 'vehicle set or riding directions are incomplete')];
}

function checkNight(night) {
    if (!night || night.dynamicLight && night.dynamicLight.blur === true) {
        return [result('AS-LIGHT-001', 'violate', 'dynamic light blur is on')];
    }
    const mode = night.dynamicLight && night.dynamicLight.mode;
    const allowed = night.dynamicLight && night.dynamicLight.allowedModes;
    const ok = night.palette && night.drawnLights && night.torchGlow === 'drawn' && night.windowGlow === 'drawn'
        && night.litBuilding && mode === 'off' && allowed && allowed.indexOf('per-pixel') !== -1 && night.dynamicLight.blur === false;
    return [result('AS-LIGHT-001', ok ? 'pass' : 'violate', ok ? 'night hook off, blur false' : 'night set is incomplete or blur is allowed')];
}

function checkName(rec) {
    const base = path.basename(String(rec.runtimeFile || ''));
    if (rec.category === 'EQUIPMENT') {
        if (LAYER_FILE_RE.test(base)) return [result('AS-STYLE-001', 'pass', base)];
        return [result('AS-STYLE-001', 'violate', base + ' is not $UF_Layer_<itemId>__<race>.png')];
    }
    return [result('AS-STYLE-001', 'violate', 'unsupported name record')];
}

function checkUi(px, standard) {
    if (typeof px !== 'number' || px < standard.uiMinPx) return [result('AS-UI-003', 'violate', 'glyph ' + px + ' px is under ' + standard.uiMinPx)];
    return [result('AS-UI-003', 'pass', px + ' px')];
}

function checkMap(banners, standard) {
    if (!sameSet(banners, standard.banners)) return [result('AS-MAP-001', 'violate', 'banner set does not match the six profiles')];
    return [result('AS-MAP-001', 'pass', banners.length + ' banners')];
}

function checkProps(props, standard) {
    if (!sameSet(props, standard.readableProps)) return [result('AS-PROP-001', 'violate', 'readable prop set is incomplete')];
    return [result('AS-PROP-001', 'pass', props.join(','))];
}

function spellMatches(spell, derivation) {
    if (!spell || spell.kind !== derivation.kind) return false;
    if (derivation.exclude && derivation.exclude[spell.name]) return false;
    const name = spell.name || '';
    const desc = (spell.data && spell.data.description) || '';
    if ((derivation.namePrefixes || []).some(p => name.indexOf(p) === 0)) return true;
    if ((derivation.named || []).indexOf(name) !== -1) return true;
    return (derivation.descriptionPatterns || []).some(p => new RegExp(p, 'i').test(desc));
}

function checkSummons(spellEntries, table, derivation) {
    const out = [];
    const byId = new Map((table || []).map(row => [row.spellId, row]));
    const derived = (spellEntries || []).filter(s => spellMatches(s, derivation));
    const missing = derived.filter(s => !byId.has(s.id));
    if (missing.length) out.push(result('AS-SUMMON-001', 'violate', 'unmapped ' + missing.map(s => s.id).join(',')));
    else out.push(result('AS-SUMMON-001', 'pass', derived.length + ' spells mapped'));
    const bad = (table || []).filter(row => !row.summonIn || !row.dismiss || !row.controllerMarker);
    if (bad.length) out.push(result('AS-SUMMON-002', 'violate', 'missing summon parts on ' + bad.map(r => r.spellId).join(',')));
    else if ((table || []).length === 0) out.push(result('AS-SUMMON-002', 'violate', 'summon table is empty'));
    else out.push(result('AS-SUMMON-002', 'pass', 'summon-in, dismiss, controller marker'));
    return out;
}

function checkMatrix(matrix, standard) {
    const expect = standard.races.length * standard.armorWeights.length;
    if (!Array.isArray(matrix) || matrix.length !== expect) {
        return [result('AS-HUM-015', 'violate', 'armour matrix length ' + (matrix ? matrix.length : 0) + ' is not ' + expect)];
    }
    const keys = new Set();
    for (const row of matrix) {
        if (!row || String(row.outfitId || '').indexOf('outfit_class_') === 0) {
            return [result('AS-HUM-015', 'violate', 'class outfit is still required')];
        }
        const weight = row.armorWeight || row.silhouette;
        if (standard.armorWeights.indexOf(weight) === -1 || row.outfitId !== 'outfit_armor_' + weight) {
            return [result('AS-HUM-015', 'violate', 'not an armour weight ' + row.outfitId)];
        }
        if (row.spriteDraw !== 'armour-layer') return [result('AS-HUM-015', 'violate', row.artKey + ' is not an armour layer')];
        if (!ART_KEY_RE.test(row.artKey) || keys.has(row.artKey)) {
            return [result('AS-HUM-015', 'violate', 'bad or duplicate art key ' + row.artKey)];
        }
        keys.add(row.artKey);
        if (standard.races.indexOf(row.race) === -1) return [result('AS-HUM-015', 'violate', 'bad race ' + row.race)];
        if (!row.slots || !row.slots.length || !row.layers || !row.layers.length) {
            return [result('AS-HUM-015', 'violate', row.artKey + ' has no slots or layers')];
        }
        if (row.fallbackArtKey !== row.outfitId + '__human') {
            return [result('AS-HUM-015', 'violate', 'fallback is not __human')];
        }
        if (row.pixels !== 'custom-per-race') {
            return [result('AS-HUM-015', 'violate', row.artKey + ' pixels are not custom per race')];
        }
    }
    const garbs = standard.raceGarbs || [];
    if (garbs.length !== standard.races.length * 2) {
        return [result('AS-HUM-015', 'violate', 'race garbs ' + garbs.length)];
    }
    const seenGarb = {};
    for (let i = 0; i < garbs.length; i++) {
        const row = garbs[i];
        if (!row || standard.races.indexOf(row.race) === -1 || (row.sex !== 'male' && row.sex !== 'female')) {
            return [result('AS-HUM-015', 'violate', 'race garb row')];
        }
        if (row.classId || String(row.garbId || '').indexOf('class') !== -1) {
            return [result('AS-HUM-015', 'violate', 'race garb is a class outfit')];
        }
        if (row.pixels !== 'custom-per-race' || !ART_KEY_RE.test(row.artKey)) {
            return [result('AS-HUM-015', 'violate', 'race garb art key')];
        }
        const key = row.race + ':' + row.sex;
        if (seenGarb[key]) return [result('AS-HUM-015', 'violate', 'duplicate race garb ' + key)];
        seenGarb[key] = true;
    }
    if (Object.keys(seenGarb).length !== standard.races.length * 2) {
        return [result('AS-HUM-015', 'violate', 'race garb coverage')];
    }
    return [result('AS-HUM-015', 'pass', expect + ' armour variants, 18 race garbs')];
}

function checkLife(templates) {
    const child = templates && templates.child;
    const elder = templates && templates.elder;
    const adult = templates && templates.adult;
    const work = ['hammer', 'saw', 'chop', 'dig', 'stir', 'carry'];
    const hasWork = t => t && t.workRows === true && Array.isArray(t.requiredRows) && work.every(r => t.requiredRows.indexOf(r) !== -1);
    if (!adult || !hasWork(child) || !hasWork(elder) || elder.stooped !== true) {
        return [result('AS-HUM-019', 'violate', 'child or working stooped elder template is missing')];
    }
    return [result('AS-HUM-019', 'pass', 'child, adult, working elder')];
}

function typeOf(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    if (Number.isInteger(v)) return 'integer';
    return typeof v;
}

function typeOk(t, v) {
    const vt = typeOf(v);
    if (t === 'number') return vt === 'number' || vt === 'integer';
    if (t === 'integer') return vt === 'integer';
    return t === vt;
}

function schemaErrors(schema, data) {
    const errs = [];
    const resolve = ref => ref.replace(/^#\//, '').split('/').reduce((s, k) => (s ? s[k] : s), schema);
    const walk = (s, v, p) => {
        if (!s) return;
        if (s.$ref) return walk(resolve(s.$ref), v, p);
        if (s.type) {
            const ts = Array.isArray(s.type) ? s.type : [s.type];
            if (!ts.some(t => typeOk(t, v))) { errs.push(p + ': ' + typeOf(v) + ' is not ' + ts.join('|')); return; }
        }
        if (Object.prototype.hasOwnProperty.call(s, 'const') && JSON.stringify(v) !== JSON.stringify(s.const)) {
            errs.push(p + ': not ' + JSON.stringify(s.const));
        }
        if (s.enum && !s.enum.some(x => JSON.stringify(x) === JSON.stringify(v))) errs.push(p + ': ' + JSON.stringify(v) + ' is not in the enum');
        if (v === null) return;
        if (typeof v === 'string') {
            if (s.pattern && !new RegExp(s.pattern).test(v)) errs.push(p + ': does not match ' + s.pattern);
            if (s.minLength !== undefined && v.length < s.minLength) errs.push(p + ': shorter than ' + s.minLength);
        }
        if (typeof v === 'number' && s.minimum !== undefined && v < s.minimum) errs.push(p + ': ' + v + ' < ' + s.minimum);
        if (Array.isArray(v)) {
            if (s.minItems !== undefined && v.length < s.minItems) errs.push(p + ': fewer than ' + s.minItems);
            if (s.items) v.forEach((x, i) => walk(s.items, x, p + '[' + i + ']'));
        }
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            for (const r of s.required || []) if (!Object.prototype.hasOwnProperty.call(v, r)) errs.push(p + ': missing ' + r);
            if (s.properties) {
                for (const [k, sub] of Object.entries(s.properties)) {
                    if (Object.prototype.hasOwnProperty.call(v, k)) walk(sub, v[k], p + '.' + k);
                }
            }
            if (s.additionalProperties === false) {
                for (const k of Object.keys(v)) {
                    if (!s.properties || !Object.prototype.hasOwnProperty.call(s.properties, k)) errs.push(p + ': unexpected ' + k);
                }
            }
        }
    };
    walk(schema, data, '$');
    return errs;
}

function checkSpellTable(table, schema, standard) {
    const out = [];
    const errs = schemaErrors(schema, table);
    const damageErr = errs.filter(e => e.indexOf('damageTypes') !== -1 || e.indexOf('.impact') !== -1);
    const other = errs.filter(e => damageErr.indexOf(e) === -1);
    if (damageErr.length) out.push(result('AS-FX-003', 'violate', damageErr[0]));
    else {
        let bad = '';
        for (const row of table.rows || []) {
            for (const d of row.damageTypes || []) {
                if (standard.damageTypes.indexOf(d) === -1) bad = d;
            }
            if (row.impact && standard.damageTypes.indexOf(row.impact) === -1) bad = row.impact;
        }
        if (bad) out.push(result('AS-FX-003', 'violate', 'unknown damage type ' + bad));
        else out.push(result('AS-FX-003', 'pass', 'damage types'));
    }
    if (other.length) out.push(result('AS-FX-005', 'violate', other[0]));
    else if (!damageErr.length) out.push(result('AS-FX-005', 'pass', 'schema'));
    else out.push(result('AS-FX-005', 'pass', 'schema aside from damage'));
    return out;
}

function entryStatus(results) {
    if (results.some(r => r.result === 'violate')) return 'violate';
    if (results.some(r => r.result === 'unknown')) return 'unknown';
    return 'pass';
}

function summarize(perEntry, globals) {
    const byCategory = {};
    const totals = { entries: perEntry.length, pass: 0, violate: 0, unknown: 0 };
    const rules = { pass: 0, violate: 0, unknown: 0 };
    for (const e of perEntry) {
        const st = entryStatus(e.results);
        totals[st]++;
        if (!byCategory[e.category]) byCategory[e.category] = { entries: 0, pass: 0, violate: 0, unknown: 0 };
        byCategory[e.category].entries++;
        byCategory[e.category][st]++;
        for (const r of e.results) rules[r.result]++;
    }
    const globalViolations = (globals || []).filter(r => r.result === 'violate');
    return { totals, byCategory, rules, globals: globals || [], globalViolations: globalViolations.length };
}

function checkSkins(ui, standard) {
    if (!ui || ui.playerSelectable !== true || ui.opacity !== 'opaque' || !ui.sheet) {
        return [result('AS-UI-004', 'violate', 'skins are not player-selectable opaque sheets')];
    }
    const skins = ui.skins || [];
    if (skins.length < (ui.minCount || 11)) return [result('AS-UI-004', 'violate', 'skin count ' + skins.length)];
    const ids = skins.map(sk => sk.id);
    if (ids.indexOf('deus') === -1 || ids.indexOf('deus-dark') === -1) {
        return [result('AS-UI-004', 'violate', 'Deus or Deus Dark is missing')];
    }
    for (const race of standard.races) {
        if (ids.indexOf('race-' + race) === -1) return [result('AS-UI-004', 'violate', 'missing race skin ' + race)];
    }
    const layout = ui.layout || {};
    const regions = ['background', 'pattern', 'frame', 'cursor', 'pause', 'textColours'];
    for (const name of regions) {
        if (!Array.isArray(layout[name]) || layout[name].length !== 4) return [result('AS-UI-004', 'violate', 'layout ' + name)];
    }
    if (ui.sheet[0] !== 192 || ui.sheet[1] !== 192) return [result('AS-UI-004', 'violate', 'window sheet is not 192 by 192')];
    const fonts = ui.fonts || [];
    const buttons = ui.buttons || [];
    const screens = ui.screens || [];
    if (fonts.length < 2 || buttons.length < 3 || screens.indexOf('title') === -1 || screens.indexOf('loading') === -1) {
        return [result('AS-UI-004', 'violate', 'fonts, buttons or screens')];
    }
    return [result('AS-UI-004', 'pass', skins.length + ' skins')];
}

function checkReligion(rel) {
    const need = ['holy-symbol', 'altar', 'shrine', 'aura', 'spellbook', 'scroll'];
    if (!rel || !sameSet(rel.pieces, need) || rel.aura !== 'drawn-frames' || rel.mundaneDistinct !== true) {
        return [result('AS-REL-001', 'violate', 'religion pieces or aura')];
    }
    for (const deity of rel.deities || []) {
        if (!deity.holySymbolId) return [result('AS-REL-001', 'violate', 'deity ' + (deity.id || '') + ' has no holy symbol')];
    }
    return [result('AS-REL-001', 'pass', 'religion pieces')];
}

function checkFarm(farm) {
    if (!farm || !sameSet(farm.stages, ['sown', 'growing', 'mature', 'harvested']) || !sameSet(farm.livestock, ['young', 'adult']) || farm.pens !== true || farm.tamedVariants !== true) {
        return [result('AS-FARM-001', 'violate', 'farming set')];
    }
    return [result('AS-FARM-001', 'pass', 'farming')];
}

function checkFood(food) {
    if (!food || !sameSet(food.states, ['raw', 'cooked']) || !sameSet(food.classes, ['meal', 'ingredient']) || !sameSet(food.displays, ['table', 'stockpile']) || food.icon !== true) {
        return [result('AS-FOOD-001', 'violate', 'food set')];
    }
    return [result('AS-FOOD-001', 'pass', 'food')];
}

function checkClosed(ruleId, have, need, label) {
    if (!sameSet(have, need)) return [result(ruleId, 'violate', label)];
    return [result(ruleId, 'pass', label)];
}

function checkScenes(scenes) {
    if (!scenes || scenes.required !== false || !sameSet(scenes.ids, ['founding', 'coronation', 'disaster', 'war'])) {
        return [result('AS-SCENE-001', 'violate', 'event scenes are a required set or the ids changed')];
    }
    return [result('AS-SCENE-001', 'pass', 'optional event scenes')];
}

function checkMarketing(marketing) {
    if (!marketing || marketing.required !== false || (marketing.pieces && marketing.pieces.length)) {
        return [result('AS-MKTG-001', 'violate', 'marketing is a required set')];
    }
    return [result('AS-MKTG-001', 'pass', 'marketing is later')];
}

function checkTame(rec) {
    const out = [];
    const artOk = rec && sameSet(rec.art, ['tamed-variant', 'captured-bound-pose', 'cage', 'pen'])
        && sameSet(rec.outcomes, ['pet', 'mount', 'livestock', 'work-animal', 'prisoner', 'recruit'])
        && sameSet(rec.visualMarkers, ['collar', 'saddle', 'harness']);
    out.push(result('AS-TAME-001', artOk ? 'pass' : 'violate', artOk ? 'tamed, bound, cage, pen' : 'domestication art set'));
    const slots = rec && rec.creatureEquipmentSlots;
    const gearOk = rec && (!slots || slots.length === 0) && rec.barding === false && rec.craftedCreatureGear === false
        && rec.visualMarkersHaveSlot === false && rec.visualMarkersHaveStats === false;
    out.push(result('AS-TAME-002', gearOk ? 'pass' : 'violate', gearOk ? 'no creature equipment' : 'creature equipment slot, barding or gear stats'));
    return out;
}

function checkVariety(variety, standard) {
    const out = [];
    if (!variety || !variety.surface || !variety.floors || !variety.underground) {
        return [result('AS-VAR-001', 'violate', 'variety block'), result('AS-VAR-002', 'violate', 'variety block')];
    }
    const floors = variety.floors;
    let countBad = '';
    let seasonBad = '';
    for (const biome of standard.biomes) {
        const row = variety.surface[biome];
        if (!row || row.trees < floors.trees || row.bushes < floors.bushes || row.harvestableBushes < floors.harvestableBushes
            || row.scatter < floors.scatter || row.rocks < floors.rocks || row.ore < floors.ore
            || row.waterEdge < floors.waterEdge || row.landmarks < floors.landmarks || row.harvestStates !== true) {
            countBad = biome;
            break;
        }
        if (row.seasons !== 'palette-swap') seasonBad = biome + ' seasons';
        else if (row.flip && row.directionalLighting) seasonBad = biome + ' flips a lit piece';
    }
    const bands = variety.undergroundBands || [];
    if (!countBad) {
        for (const band of bands) {
            const row = variety.underground[band];
            if (!row || row.caveFormations < floors.caveFormations || row.fungiOrCrystals < floors.fungiOrCrystals || row.ore < floors.undergroundOre) {
                countBad = band;
                break;
            }
        }
    }
    out.push(result('AS-VAR-001', countBad ? 'violate' : 'pass', countBad ? countBad + ' is under the floor' : 'variety floors'));
    out.push(result('AS-VAR-002', seasonBad ? 'violate' : 'pass', seasonBad || 'palette-swap seasons'));
    return out;
}

function checkGenes(genes, standard) {
    if (!genes || genes.drivesArt !== false || genes.simGenetics !== 'stats-only' || genes.partLibrary !== 'retired') {
        return [result('AS-GENE-001', 'violate', 'genetics still select art')];
    }
    const inheritance = genes.inheritance || {};
    if (inheritance.owner !== 'sim' || inheritance.drivesArt !== false || inheritance.artSelection !== false) {
        return [result('AS-GENE-001', 'violate', 'inheritance selects art')];
    }
    const loci = standard && standard.geneticsLoci;
    if (!loci || loci.drivesArt !== false || loci.status !== 'retired') {
        return [result('AS-GENE-001', 'violate', 'genetics loci still select art')];
    }
    const pool = genes.presets;
    if (!pool || pool.adultMale !== 8 || pool.adultFemale !== 8 || pool.elderPerSex !== 2 || pool.childPerSex !== 2) {
        return [result('AS-GENE-001', 'violate', 'preset counts')];
    }
    if (pool.perRace !== 24 || pool.total !== standard.races.length * 24 || pool.paletteSwaps !== 3 || pool.expressions !== 8 || pool.facesetPx !== 144) {
        return [result('AS-GENE-001', 'violate', 'preset pool size')];
    }
    if (pool.faceset !== 'one-complete-image' || pool.builtFromLayers !== false || pool.raceBackground !== 'in-composition') {
        return [result('AS-GENE-001', 'violate', 'faceset is still a layer stack')];
    }
    if (pool.expressionsFrom !== 'complete-image' || pool.identityKept !== true || pool.charsetPaletteSwapWhen !== 'in-game') {
        return [result('AS-GENE-001', 'violate', 'expression or charset colour rule')];
    }
    if (pool.portraitColourVariantRule !== 'palette-swap-when-ramps-map-else-separate-generation') {
        return [result('AS-GENE-001', 'violate', 'portrait colour rule')];
    }
    if (pool.factionFaces !== false || pool.factions !== 'trim-banners-buildings') {
        return [result('AS-GENE-001', 'violate', 'preset colour or faction')];
    }
    if (!sameSet(pool.playerPicks, ['preset', 'colour-variant'])) {
        return [result('AS-GENE-001', 'violate', 'player pick')];
    }
    const buckets = ['adult-male', 'adult-female', 'elder-male', 'elder-female', 'child-male', 'child-female'];
    const needCount = { 'adult-male': 8, 'adult-female': 8, 'elder-male': 2, 'elder-female': 2, 'child-male': 2, 'child-female': 2 };
    const seen = new Set();
    for (let r = 0; r < standard.races.length; r++) {
        const race = standard.races[r];
        const block = genes.byRace && genes.byRace[race];
        if (!block || block.charset !== true || block.faceset !== true || block.expressions !== 8) {
            return [result('AS-GENE-001', 'violate', race + ' preset look')];
        }
        if (block.completeImage !== true || block.builtFromLayers !== false || block.raceBackground !== 'in-composition') {
            return [result('AS-GENE-001', 'violate', race + ' faceset is built from layers')];
        }
        for (let b = 0; b < buckets.length; b++) {
            const ids = block.ids && block.ids[buckets[b]];
            if (!ids || ids.length !== needCount[buckets[b]]) return [result('AS-GENE-001', 'violate', race + ' ' + buckets[b])];
            for (let i = 0; i < ids.length; i++) {
                const id = ids[i];
                if (seen.has(id) || id !== 'preset:' + race + ':' + buckets[b] + ':' + String(i + 1).padStart(2, '0')) {
                    return [result('AS-GENE-001', 'violate', 'preset id ' + id)];
                }
                const rec = genes.portraitRecords && genes.portraitRecords[id];
                const method = rec && rec.colourVariantMethod;
                if (method !== 'palette-swap' && method !== 'separate-generation') {
                    return [result('AS-GENE-001', 'violate', 'colour method ' + id)];
                }
                seen.add(id);
            }
        }
    }
    if (seen.size !== pool.total) return [result('AS-GENE-001', 'violate', 'preset total ' + seen.size)];
    const methods = genes.portraitRecords || {};
    if (Object.keys(methods).length !== seen.size) return [result('AS-GENE-001', 'violate', 'portrait record count')];
    let separate = 0;
    let swap = 0;
    const methodIds = Object.keys(methods);
    for (let i = 0; i < methodIds.length; i++) {
        if (!seen.has(methodIds[i])) return [result('AS-GENE-001', 'violate', 'extra portrait record')];
        const method = methods[methodIds[i]] && methods[methodIds[i]].colourVariantMethod;
        if (method === 'separate-generation') separate++;
        else if (method === 'palette-swap') swap++;
    }
    const sizing = standard.a9c && standard.a9c.sizing;
    const variantSheets = separate * pool.paletteSwaps;
    const sheets = pool.total + variantSheets;
    if (!sizing || sizing.portraitSeparateGenerationPresets !== separate || sizing.portraitPaletteSwapPresets !== swap) {
        return [result('AS-GENE-001', 'violate', 'portrait method tally')];
    }
    if (sizing.presetFacesetBaseSheets !== pool.total || sizing.portraitVariantSheets !== variantSheets || sizing.presetFacesetSheets !== sheets) {
        return [result('AS-GENE-001', 'violate', 'faceset sheet tally')];
    }
    if (sizing.faceLayerSheets !== 0 || sizing.expressionCells !== sheets * 8 || sizing.portraitGenerationCalls !== sheets * 8) {
        return [result('AS-GENE-001', 'violate', 'faceset generation tally')];
    }
    if (sizing.portraitSourceImages !== sheets || sizing.portraitExpressionPasses !== sheets * 7) {
        return [result('AS-GENE-001', 'violate', 'expression pass tally')];
    }
    return [result('AS-GENE-001', 'pass', pool.total + ' presets')];
}

function checkPortrait(entity, standard) {
    const out = [];
    const icon = entity && entity.icon;
    const portrait = entity && entity.portrait;
    let ok = !!(icon && icon.w === 32 && icon.h === 32 && icon.rarity !== 'redraw'
        && portrait && portrait.w === 144 && portrait.h === 144 && portrait.background && portrait.rarity !== 'redraw');
    if (ok && entity.raceNeutral) {
        const byRace = entity.portraitsByRace || {};
        ok = standard.races.every(race => byRace[race] && byRace[race].w === 144 && byRace[race].h === 144 && byRace[race].rarity !== 'redraw');
    }
    out.push(result('AS-PORT-001', ok ? 'pass' : 'violate', ok ? 'icon and portrait' : 'icon and portrait are both required'));
    const file = portrait && portrait.file;
    if (file) {
        const base = path.basename(String(file));
        if (PORTRAIT_FILE_RE.test(base)) out.push(result('AS-STYLE-001', 'pass', base));
        else out.push(result('AS-STYLE-001', 'violate', base + ' is not a portrait file name'));
    }
    return out;
}

function checkHeadLayer(layer) {
    const frames = (layer && layer.frames) || [];
    const dirs = ['S', 'W', 'E', 'N'];
    const seen = {};
    let bad = frames.length === 12 ? '' : 'frame count ' + frames.length;
    for (const frame of frames) {
        const key = frame && (frame.dir + ':' + frame.headState);
        if (!frame || dirs.indexOf(frame.dir) === -1 || [0, 1, 2].indexOf(frame.headState) === -1) bad = bad || 'frame dir or head state';
        else if (seen[key]) bad = bad || 'duplicate ' + key;
        else if (!frame.anchor || !Number.isInteger(frame.anchor.x) || !Number.isInteger(frame.anchor.y)) bad = bad || 'anchor';
        else seen[key] = true;
    }
    if (!bad) {
        for (const dir of dirs) {
            for (const state of [0, 1, 2]) {
                if (!seen[dir + ':' + state]) bad = 'missing ' + dir + ':' + state;
            }
        }
    }
    const extras = (layer && layer.extras) || [];
    if (layer && !layer.longHair && extras.length) bad = bad || 'extras on a short-hair grid';
    for (const extra of extras) {
        if (!extra || (extra.pose !== 'death' && extra.pose !== 'dodge')) bad = bad || 'extra pose ' + (extra && extra.pose);
    }
    if (bad) return [result('AS-HEAD-001', 'violate', bad)];
    return [result('AS-HEAD-001', 'pass', '12 head frames')];
}

function expectedBodyFrames(standard) {
    let n = 0;
    for (const pose of standard.poseGrid) n += pose.frames * standard.directions.length;
    return n;
}

function checkBodyAnchors(frames, standard) {
    const expect = expectedBodyFrames(standard);
    if (!Array.isArray(frames) || frames.length !== expect) {
        return [result('AS-HEAD-001', 'violate', 'body frames ' + (frames ? frames.length : 0) + ' is not ' + expect)];
    }
    for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const anchor = frame && frame.headAnchor;
        if (!Array.isArray(anchor) || anchor.length !== 2 || !Number.isInteger(anchor[0]) || !Number.isInteger(anchor[1])) {
            return [result('AS-HEAD-001', 'violate', 'frame ' + i + ' has no head anchor')];
        }
        if ([0, 1, 2].indexOf(frame.headState) === -1) return [result('AS-HEAD-001', 'violate', 'frame ' + i + ' head state')];
    }
    return [result('AS-HEAD-001', 'pass', expect + ' head anchors')];
}

function checkElder(rec, standard) {
    if (!rec || rec.body !== 'redraw-stooped' || rec.garbSheet !== 'adult' || rec.gearSheet !== 'adult' || rec.hairSheet !== 'adult') {
        return [result('AS-ELDER-001', 'violate', 'elder garb, gear or hair is not the adult sheet')];
    }
    const frames = rec.frames || [];
    const expect = expectedBodyFrames(standard);
    if (rec.frameCount !== expect || frames.length !== expect) {
        return [result('AS-ELDER-001', 'violate', 'offset table ' + frames.length + ' is not ' + expect)];
    }
    const seen = new Set();
    for (const frame of frames) {
        if (!Array.isArray(frame.torso) || frame.torso.length !== 2 || !Array.isArray(frame.head) || frame.head.length !== 2) {
            return [result('AS-ELDER-001', 'violate', 'frame ' + frame.frame + ' offset')];
        }
        if (seen.has(frame.frame)) return [result('AS-ELDER-001', 'violate', 'duplicate offset ' + frame.frame)];
        seen.add(frame.frame);
    }
    for (let i = 0; i < expect; i++) {
        if (!seen.has(i)) return [result('AS-ELDER-001', 'violate', 'missing offset ' + i)];
    }
    return [result('AS-ELDER-001', 'pass', 'adult layers on elder offsets')];
}

function checkGear(rows) {
    if (!Array.isArray(rows) || !rows.length) return [result('AS-GEAR-001', 'violate', 'no gear rows')];
    const silhouettes = {};
    for (const row of rows) {
        if (row.kind === 'outfit') {
            if (row.custom !== true) return [result('AS-GEAR-001', 'violate', row.itemId + ' outfit is not custom per race')];
            continue;
        }
        if (['weapon', 'tool', 'accessory'].indexOf(row.kind) === -1) return [result('AS-GEAR-001', 'violate', 'kind ' + row.kind)];
        if (row.perRaceSilhouette) return [result('AS-GEAR-001', 'violate', row.itemId + ' has a per-race silhouette')];
        if (!row.rampId || !row.decalSlot || !Number.isInteger(row.decalSlot.x) || !Number.isInteger(row.decalSlot.y)) {
            return [result('AS-GEAR-001', 'violate', row.itemId + ' ramp or decal slot')];
        }
        if (!silhouettes[row.itemId]) silhouettes[row.itemId] = row.silhouetteId;
        else if (silhouettes[row.itemId] !== row.silhouetteId) return [result('AS-GEAR-001', 'violate', row.itemId + ' silhouette split')];
    }
    return [result('AS-GEAR-001', 'pass', 'one silhouette plus custom outfits')];
}

function checkMirror(layer) {
    const frames = (layer && layer.frames) || [];
    const mirrored = frames.some(frame => frame && frame.mirrored);
    if (layer && layer.mirrorBake === 'runtime') return [result('AS-MIRROR-001', 'violate', 'runtime flip')];
    if (mirrored && !layer.symmetric) return [result('AS-MIRROR-001', 'violate', 'mirrored frame on a layer that is not symmetric')];
    if (layer && layer.symmetric && layer.directionalLighting) return [result('AS-MIRROR-001', 'violate', 'symmetric layer has directional lighting')];
    if (layer && layer.symmetric && layer.mirrorBake !== 'offline-w-to-e') {
        return [result('AS-MIRROR-001', 'violate', 'symmetric mirror is not an offline W to E bake')];
    }
    return [result('AS-MIRROR-001', 'pass', layer && layer.symmetric ? 'offline symmetric bake' : 'not mirrored')];
}

function checkPoses(standard) {
    const need = ['prone', 'unconscious', 'sleep', 'sit', 'sneak', 'climb'];
    const rows = standard.humanoidRows || [];
    const grid = (standard.poseGrid || []).map(pose => pose.id);
    const missingRows = need.filter(id => rows.indexOf(id) === -1);
    const missingGrid = need.filter(id => grid.indexOf(id) === -1);
    const map = standard.poseConditions || {};
    let mapBad = '';
    if (!map.prone || map.prone.kind !== 'condition' || map.prone.id !== 'prone') mapBad = 'prone';
    if (!map.unconscious || map.unconscious.kind !== 'condition' || map.unconscious.id !== 'unconscious') mapBad = mapBad || 'unconscious';
    for (const id of ['sleep', 'sit', 'sneak', 'climb']) {
        if (!map[id] || map[id].kind !== 'activity') mapBad = mapBad || id;
    }
    if (missingRows.length || missingGrid.length || mapBad) {
        return [result('AS-POSE-001', 'violate', 'rows ' + missingRows.join(',') + ' grid ' + missingGrid.join(',') + ' map ' + mapBad)];
    }
    return [result('AS-POSE-001', 'pass', 'six pose rows')];
}

function checkBiomeRegistry(doc, standard, label) {
    const list = doc && doc.canonicalBiomes;
    const norm = String(label || 'registry').replace(/\\/g, '/');
    const name = norm.indexOf('/docs/') !== -1 ? 'docs/art/DEUS_BiomeRegistry.json'
        : norm.indexOf('/game/') !== -1 ? 'game/data/DEUS_BiomeRegistry.json'
        : path.basename(norm);
    if (!Array.isArray(list) || !sameSet(list, standard.biomes)) {
        return [result('AS-BIOME-005', 'violate', name + ' canonical ' + (Array.isArray(list) ? list.join(',') : 'missing'))];
    }
    return [result('AS-BIOME-005', 'pass', name)];
}

function checkCatalogueBiomes(catalogue, standard) {
    if (!catalogue || !catalogue.biomes || !catalogue.biomes.canonical) {
        return [result('AS-BIOME-005', 'pass', 'catalogue has no canonical biome list')];
    }
    const list = catalogue.biomes.canonical;
    if (!sameSet(list, standard.biomes)) return [result('AS-BIOME-005', 'violate', 'catalogue canonical ' + list.join(','))];
    return [result('AS-BIOME-005', 'pass', 'catalogue canonical set')];
}

function stripPx(footprint, standard) {
    const template = standard.slotTemplates['action-row'];
    const footprintW = footprint && footprint[0] ? footprint[0] : 1;
    const footprintH = footprint && footprint[1] ? footprint[1] : 1;
    return [template.frames * footprintW * template.cell, template.directions * footprintH * template.cell];
}

function checkSheet(sheet, standard) {
    if (!sheet || !standard.slotTemplates[sheet.template]) return [result('AS-SLOT-001', 'violate', 'unknown template')];
    if (sheet.template === 'action-row') {
        const expect = stripPx(sheet.footprint, standard);
        if (sheet.scaled || sheet.w !== expect[0] || sheet.h !== expect[1]) {
            return [result('AS-SLOT-001', 'violate', 'action row ' + sheet.w + 'x' + sheet.h)];
        }
        return [result('AS-SLOT-001', 'pass', expect.join('x'))];
    }
    const template = standard.slotTemplates[sheet.template];
    if (sheet.w !== template.w || sheet.h !== template.h) {
        return [result('AS-SLOT-001', 'violate', sheet.template + ' ' + sheet.w + 'x' + sheet.h)];
    }
    return [result('AS-SLOT-001', 'pass', sheet.template)];
}

function checkAtlas(atlas) {
    if (!atlas || atlas.size !== 2048 || !atlas.squares || atlas.squares[0] !== 42 || atlas.squares[1] !== 42 || atlas.cell !== 48) {
        return [result('AS-SLOT-001', 'violate', 'atlas grid')];
    }
    if (atlas.squares[0] * atlas.cell !== 2016) return [result('AS-SLOT-001', 'violate', 'atlas content px')];
    if (!atlas.paddingPx || atlas.paddingPx[0] !== 1 || atlas.paddingPx[1] !== 2 || atlas.gridSnapped !== true) {
        return [result('AS-SLOT-001', 'violate', 'padding')];
    }
    if (atlas.terrainSizeIfBenchmarked !== 4096 || !atlas.lookupFile) return [result('AS-SLOT-001', 'violate', 'terrain atlas or lookup')];
    return [result('AS-SLOT-001', 'pass', '2048 atlas, 42 by 42')];
}

function checkPipeline(rec) {
    if (!rec || rec.scaled || rec.resized || (rec.accepted && (rec.offSize || rec.offPalette || rec.offAnchor))) {
        return [result('AS-PIPE-001', 'violate', 'scaled or accepted off-size output')];
    }
    if (rec.crop !== 'transparent-margins-only' || rec.missingFrom !== 'empty-slots') {
        return [result('AS-PIPE-001', 'violate', 'crop or MISSING rule')];
    }
    return [result('AS-PIPE-001', 'pass', 'exact size, no scaling')];
}

function checkPromptTemplates(block) {
    const cats = ['humanoid-layer', 'face-layer', 'creature', 'terrain-tile', 'building-piece', 'item-icon', 'portrait', 'effect', 'ui'];
    const fields = ['pixelSize', 'frameGrid', 'facing', 'poseFrameIndex', 'anchor', 'paletteRampHex', 'outlineRules', 'shadingRules', 'lightDirection', 'layerRole', 'catalogueId', 'slotId', 'referenceImages', 'negativeConstraints'];
    if (!block || block.policy !== 'field-list-only' || block.prosePrompt) {
        return [result('AS-PROMPT-001', 'violate', 'template is a runnable prompt')];
    }
    const have = block.categories || {};
    for (const cat of cats) {
        const row = have[cat];
        if (!row || !row.fields) return [result('AS-PROMPT-001', 'violate', 'missing ' + cat)];
        if (row.promptText) return [result('AS-PROMPT-001', 'violate', cat + ' has prompt text')];
        for (const field of fields) {
            if (!row.fields[field]) return [result('AS-PROMPT-001', 'violate', cat + ' missing ' + field)];
        }
    }
    return [result('AS-PROMPT-001', 'pass', 'field templates')];
}

function checkGenerationLog(row, schema) {
    const need = (schema && schema.requiredFields) || [];
    for (const key of need) {
        if (!row || row[key] === undefined || row[key] === null || row[key] === '') {
            return [result('AS-GEN-001', 'violate', 'missing ' + key)];
        }
    }
    if (!schema || schema.outcomes.indexOf(row.outcome) === -1) return [result('AS-GEN-001', 'violate', 'outcome')];
    if (row.outcome === 'fail' && (!row.reasons || !row.reasons.length)) return [result('AS-GEN-001', 'violate', 'fail without reasons')];
    for (const reason of row.reasons || []) {
        if (schema.reasonCodes.indexOf(reason) === -1) return [result('AS-GEN-001', 'violate', 'reason ' + reason)];
    }
    return [result('AS-GEN-001', 'pass', row.outcome)];
}

function checkYield(row) {
    const need = ['generator', 'category', 'template', 'firstPassAcceptance', 'usableSlotsPerGeneration', 'regenerationsPerSlot', 'costPerUsableSlot', 'timePerUsableSlot'];
    for (const key of need) {
        if (!row || row[key] === undefined || row[key] === null) return [result('AS-GEN-002', 'violate', 'missing ' + key)];
    }
    return [result('AS-GEN-002', 'pass', row.generator + ' ' + row.category)];
}

function checkPromptVersion(row) {
    if (!row || !row.version) return [result('AS-GEN-003', 'violate', 'no version')];
    if (row.status === 'promoted' && row.abYieldBeatsCurrent !== true) {
        return [result('AS-GEN-003', 'violate', 'promoted without a better yield')];
    }
    return [result('AS-GEN-003', 'pass', row.status || 'version')];
}

function checkGenerators(standard) {
    const generators = standard.generators || {};
    const adapters = standard.generatorAdapters || {};
    const routing = standard.routingPolicy || {};
    const golden = standard.goldenTestSet || {};
    const tune = standard.styleTune || {};
    const fields = generators.fields || [];
    if (fields.indexOf('id') === -1 || fields.indexOf('version') === -1) return [result('AS-GEN-004', 'violate', 'generator fields')];
    if (adapters.from !== 'shared-prompt-spec' || adapters.perGenerator !== true) return [result('AS-GEN-004', 'violate', 'adapters')];
    if (routing.objective !== 'pixellab-primary' || routing.bakeOff !== false || routing.primary !== 'pixellab'
        || routing.standby !== 'retro-diffusion' || routing.conceptsOnly !== 'nano-banana-pro'
        || routing.rebenchmark !== 'periodic' || routing.testSet !== 'goldenTestSet') {
        return [result('AS-GEN-004', 'violate', 'routing')];
    }
    if (golden.fixed !== true || !sameSet(golden.checks, ['palette', 'outline', 'anchor', 'style'])) {
        return [result('AS-GEN-004', 'violate', 'golden test set')];
    }
    if (tune.status !== 'optional-later' || tune.requiresOwnerDecision !== true) {
        return [result('AS-GEN-004', 'violate', 'style tune is not optional')];
    }
    const ids = new Set((generators.entries || []).map(entry => entry.id));
    for (const assignment of routing.assignments || []) {
        if (!ids.has(assignment.generator)) return [result('AS-GEN-004', 'violate', 'routing names an unknown generator')];
    }
    return [result('AS-GEN-004', 'pass', 'generator policy')];
}

function intPair(p) {
    return Array.isArray(p) && p.length === 2 && Number.isInteger(p[0]) && Number.isInteger(p[1]);
}

function overSourceCap(w, h) {
    return !Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > SOURCE_CAP || h > SOURCE_CAP;
}

function checkSourceSheet(sheet) {
    if (!sheet || !sheet.kind) return [result('AS-SRC-001', 'violate', 'sheet kind')];
    if (overSourceCap(sheet.w, sheet.h)) return [result('AS-SRC-001', 'violate', 'over 2048 px')];
    if (sheet.kind === 'paper-doll-layer') {
        if (sheet.w !== PAPER_DOLL.w || sheet.h !== PAPER_DOLL.h || sheet.cols !== PAPER_DOLL.cols || sheet.rows !== PAPER_DOLL.rows || sheet.cell !== PAPER_DOLL.cell) {
            return [result('AS-SRC-001', 'violate', 'paper-doll sheet ' + sheet.w + 'x' + sheet.h)];
        }
        return [result('AS-SRC-001', 'pass', '768x1440')];
    }
    if (sheet.kind === 'rmmz-native') {
        const native = RMMZ_NATIVE[sheet.template];
        if (!native || sheet.w !== native[0] || sheet.h !== native[1]) {
            return [result('AS-SRC-001', 'violate', 'RMMZ size ' + (sheet.template || ''))];
        }
        return [result('AS-SRC-001', 'pass', sheet.template)];
    }
    if (sheet.kind === 'creature-strip') {
        const fp = sheet.footprint || [1, 1];
        const large = fp[0] > 1 || fp[1] > 1;
        if (large && sheet.stacked === true) return [result('AS-SRC-001', 'violate', 'stacked large creature sheet')];
        return [result('AS-SRC-001', 'pass', 'creature strip')];
    }
    return [result('AS-SRC-001', 'violate', 'sheet kind ' + sheet.kind)];
}

function checkSourcePolicy(standard) {
    const policy = standard && standard.sourceSheets;
    if (!policy || policy.maxPx !== SOURCE_CAP) return [result('AS-SRC-001', 'violate', 'cap')];
    const paper = policy.paperDoll;
    if (!paper || paper.w !== PAPER_DOLL.w || paper.h !== PAPER_DOLL.h || paper.cols !== PAPER_DOLL.cols || paper.rows !== PAPER_DOLL.rows || paper.cell !== PAPER_DOLL.cell || paper.actionRows !== PAPER_DOLL.actionRows || paper.oneSheetPerLayerDesign !== true) {
        return [result('AS-SRC-001', 'violate', 'paper-doll policy')];
    }
    if (policy.largeCreatureRows !== 'strips') return [result('AS-SRC-001', 'violate', 'large creature rows')];
    const native = policy.rmmzNative || {};
    const keys = Object.keys(RMMZ_NATIVE);
    for (let i = 0; i < keys.length; i++) {
        const row = native[keys[i]];
        if (!row || row.w !== RMMZ_NATIVE[keys[i]][0] || row.h !== RMMZ_NATIVE[keys[i]][1]) {
            return [result('AS-SRC-001', 'violate', 'native ' + keys[i])];
        }
    }
    const samples = policy.samples || {};
    const named = ['paperDoll', 'charset', 'gargantuanStrip'];
    for (let i = 0; i < named.length; i++) {
        const got = checkSourceSheet(samples[named[i]]);
        if (got[0].result !== 'pass') return got;
    }
    return [result('AS-SRC-001', 'pass', '768x1440, cap 2048, RMMZ sizes')];
}

function checkRepoPolicy(policy) {
    if (!policy || policy.pixelsInRepo !== false) return [result('AS-REPO-001', 'violate', 'pixels are in the repo')];
    if (!sameSet(policy.committed, ['blank-template-geometry', 'slot-map'])) {
        return [result('AS-REPO-001', 'violate', 'committed set')];
    }
    if (!sameSet(policy.gitLfs, ['approved-art'])) return [result('AS-REPO-001', 'violate', 'git LFS set')];
    if (!sameSet(policy.excluded, ['raw-generations', 'rejects', 'logs'])) {
        return [result('AS-REPO-001', 'violate', 'excluded set')];
    }
    if (!sameSet(policy.lfsPatterns, ['art/approved/**'])) return [result('AS-REPO-001', 'violate', 'LFS pattern')];
    if (!sameSet(policy.excludePatterns, ['art/raw/**', 'art/rejects/**', 'art/logs/**'])) {
        return [result('AS-REPO-001', 'violate', 'exclude pattern')];
    }
    return [result('AS-REPO-001', 'pass', 'slot map in repo, approved art on LFS, raw out')];
}

function checkOwnerPreview(preview) {
    if (!preview || preview.required !== true) return [result('AS-PREVIEW-001', 'violate', 'preview is not required')];
    if (preview.scene !== 'in-game-1:1-animated' || preview.scale !== '1:1' || preview.animated !== true) {
        return [result('AS-PREVIEW-001', 'violate', 'scene is not an animated 1:1 in-game preview')];
    }
    if (preview.channel !== 'owner-chat' || preview.before !== 'merge') {
        return [result('AS-PREVIEW-001', 'violate', 'preview is not before merge')];
    }
    if (!sameSet(preview.decision, ['yea', 'nay'])) return [result('AS-PREVIEW-001', 'violate', 'decision is not yea or nay')];
    return [result('AS-PREVIEW-001', 'pass', 'owner yea or nay before merge')];
}

function checkGeneratorCap(roster, sets) {
    if (!roster || roster.perCategory !== true || roster.mixWithinLayeredSet !== false || roster.bakeOff !== false) {
        return [result('AS-GEN-005', 'violate', 'generator cap')];
    }
    if (roster.primary !== 'pixellab' || roster.standby !== 'retro-diffusion' || roster.conceptsOnly !== 'nano-banana-pro') {
        return [result('AS-GEN-005', 'violate', 'generator roles')];
    }
    if (roster.status !== 'assigned') return [result('AS-GEN-005', 'violate', 'roster status')];
    const ids = roster.ids || [];
    if (!sameSet(ids, ['pixellab'])) return [result('AS-GEN-005', 'violate', 'production roster')];
    const cats = roster.categories || {};
    const catKeys = Object.keys(cats);
    if (!sameSet(catKeys, GEN_CATEGORIES)) return [result('AS-GEN-005', 'violate', 'category list')];
    const seenIds = new Set(ids);
    for (let i = 0; i < GEN_CATEGORIES.length; i++) {
        const value = cats[GEN_CATEGORIES[i]];
        if (Array.isArray(value)) return [result('AS-GEN-005', 'violate', 'category has more than one generator')];
        if (value !== 'pixellab' || !seenIds.has(value)) return [result('AS-GEN-005', 'violate', 'category generator is outside the roster')];
        if (value === roster.standby || value === roster.conceptsOnly) return [result('AS-GEN-005', 'violate', 'standby or concepts generator is assigned')];
    }
    if (!Array.isArray(sets) || !sets.length) return [result('AS-GEN-005', 'violate', 'no layered sets')];
    let paper = false;
    let family = false;
    const setIds = new Set();
    for (let i = 0; i < sets.length; i++) {
        const set = sets[i];
        if (!set || !set.id || setIds.has(set.id)) return [result('AS-GEN-005', 'violate', 'layered set id')];
        setIds.add(set.id);
        if (set.kind === 'paper-doll') paper = true;
        else if (set.kind === 'creature-family') family = true;
        else return [result('AS-GEN-005', 'violate', 'layered set kind')];
        const members = set.memberGeneratorIds;
        if (!Array.isArray(members) || !members.length) return [result('AS-GEN-005', 'violate', 'layered set members')];
        for (let m = 0; m < members.length; m++) {
            if (members[m] !== set.generatorId) return [result('AS-GEN-005', 'violate', set.id + ' mixes generators')];
        }
        if (set.generatorId !== 'pixellab' || set.generatorId !== cats[set.category]) {
            return [result('AS-GEN-005', 'violate', set.id + ' does not use the category generator')];
        }
    }
    if (!paper || !family) return [result('AS-GEN-005', 'violate', 'missing paper-doll or creature family')];
    return [result('AS-GEN-005', 'pass', 'one generator per layered set')];
}

function sexSetOk(sexes) {
    if (!sexes || !sexes.male || !sexes.female) return false;
    const keys = ['base', 'tamed', 'saddle'];
    for (const sex of ['male', 'female']) {
        for (let i = 0; i < keys.length; i++) {
            if (sexes[sex][keys[i]] !== true) return false;
        }
    }
    return true;
}

function creatureSlug(name) {
    return String(name || '').toLowerCase().replace(/ /g, '-');
}

function creatureRecords(doc) {
    if (Array.isArray(doc)) return doc;
    if (doc && Array.isArray(doc.entries)) return doc.entries;
    return null;
}

function checkSexedBodies(block, standard) {
    if (!block || !standard) return [result('AS-SEX-001', 'violate', 'sexed bodies')];
    if (!sameSet(block.races, standard.races)) return [result('AS-SEX-001', 'violate', 'races')];
    if (!sameSet(block.adult, ['male', 'female']) || !sameSet(block.elder, ['male', 'female'])) {
        return [result('AS-SEX-001', 'violate', 'adult or elder sex')];
    }
    if (block.child !== 'own-body' || block.childScaledFromAdult !== false) {
        return [result('AS-SEX-001', 'violate', 'child body')];
    }
    if (!sameSet(block.perSexParts, SEX_PARTS)) return [result('AS-SEX-001', 'violate', 'per-sex parts')];
    if (!sameSet(block.garbOnBodies, GARB_BODIES) || !sameSet(block.armourOnBodies, GARB_BODIES)) {
        return [result('AS-SEX-001', 'violate', 'garb or armour bodies')];
    }
    if (block.elderGarb !== 'adult-same-sex-offset') return [result('AS-SEX-001', 'violate', 'elder garb')];
    if (block.classGarb !== 'none' || block.elderBaseBodies !== 'race-and-sex') {
        return [result('AS-SEX-001', 'violate', 'class garb is still in the base body')];
    }
    const templates = block.templates || {};
    for (let i = 0; i < standard.races.length; i++) {
        const race = standard.races[i];
        const row = templates[race];
        if (!row) return [result('AS-SEX-001', 'violate', race + ' templates')];
        if (row['adult-male'] !== 'body:' + race + ':adult-male') return [result('AS-SEX-001', 'violate', race + ' adult male')];
        if (row['adult-female'] !== 'body:' + race + ':adult-female') return [result('AS-SEX-001', 'violate', race + ' adult female')];
        if (row['elder-male'] !== 'body:' + race + ':elder-male') return [result('AS-SEX-001', 'violate', race + ' elder male')];
        if (row['elder-female'] !== 'body:' + race + ':elder-female') return [result('AS-SEX-001', 'violate', race + ' elder female')];
        if (row.child !== 'body:' + race + ':child') return [result('AS-SEX-001', 'violate', race + ' child')];
        if (row['face-male'] !== 'face:' + race + ':male' || row['face-female'] !== 'face:' + race + ':female') {
            return [result('AS-SEX-001', 'violate', race + ' face base')];
        }
    }
    const dwarfPx = block.bodyPx && block.bodyPx.dwarf;
    const dwarfAges = ['adult-male', 'adult-female', 'elder-male', 'elder-female'];
    if (!dwarfPx) return [result('AS-SEX-001', 'violate', 'dwarf body px')];
    for (let i = 0; i < dwarfAges.length; i++) {
        if (dwarfPx[dwarfAges[i]] !== 36) return [result('AS-SEX-001', 'violate', 'dwarf ' + dwarfAges[i] + ' px')];
    }
    const matrix = standard.outfitMatrix || [];
    const expect = standard.races.length * standard.armorWeights.length;
    if (matrix.length !== expect) return [result('AS-SEX-001', 'violate', 'outfit matrix')];
    for (let i = 0; i < matrix.length; i++) {
        const row = matrix[i];
        for (let b = 0; b < GARB_BODIES.length; b++) {
            const key = row.outfitId + '__' + row.race + '__' + GARB_BODIES[b];
            if (!SEXED_KEY_RE.test(key)) return [result('AS-SEX-001', 'violate', 'garb key ' + key)];
        }
    }
    return [result('AS-SEX-001', 'pass', 'male and female bodies, child body, garb on each')];
}

function checkCreatureSex(registry, creatureDoc) {
    if (!registry) return [result('AS-SEX-002', 'violate', 'creature sex registry')];
    if (!sameSet(registry.flags, ['none', 'dimorphic'])) return [result('AS-SEX-002', 'violate', 'sexVariant flag')];
    if (registry.unlistedAre !== 'none') return [result('AS-SEX-002', 'violate', 'unlisted creatures')];
    const dimorphic = registry.dimorphic || [];
    const required = DIMORPHIC_SRD.concat(DIMORPHIC_LIVESTOCK);
    if (dimorphic.length !== required.length || !sameSet(dimorphic.map(entry => entry.name), required)) {
        return [result('AS-SEX-002', 'violate', 'dimorphic list')];
    }
    const names = [];
    for (let i = 0; i < dimorphic.length; i++) {
        const entry = dimorphic[i];
        names.push(entry.name);
        if (entry.sexVariant !== 'dimorphic' || !entry.pair || typeof entry.pair !== 'string') {
            return [result('AS-SEX-002', 'violate', entry.name + ' flag')];
        }
        if (!sexSetOk(entry.sexes)) return [result('AS-SEX-002', 'violate', entry.name + ' sex sets')];
        const slug = creatureSlug(entry.name);
        if (DIMORPHIC_SRD.indexOf(entry.name) !== -1) {
            if (entry.srd !== true || entry.inCreaturesJson !== true || entry.id !== 'srd:creature:' + slug) {
                return [result('AS-SEX-002', 'violate', entry.name + ' srd id')];
            }
        } else if (entry.srd !== false || entry.inCreaturesJson !== false || entry.id !== 'livestock:' + slug) {
            return [result('AS-SEX-002', 'violate', entry.name + ' livestock id')];
        }
    }
    const noneSamples = registry.noneSamples || [];
    if (!noneSamples.length) return [result('AS-SEX-002', 'violate', 'no none sample')];
    for (let i = 0; i < noneSamples.length; i++) {
        const entry = noneSamples[i];
        if (!entry || entry.sexVariant !== 'none' || entry.sexes !== null || names.indexOf(entry.name) !== -1) {
            return [result('AS-SEX-002', 'violate', (entry && entry.name) + ' is none but has a sex set')];
        }
    }
    if (creatureDoc) {
        const records = creatureRecords(creatureDoc);
        if (!records) return [result('AS-SEX-002', 'violate', 'creatures file')];
        if (!registry.derivation || registry.derivation.srdFileCount !== records.length) {
            return [result('AS-SEX-002', 'violate', 'srd file count')];
        }
        const counts = {};
        for (let i = 0; i < records.length; i++) {
            const name = records[i] && records[i].name;
            counts[name] = (counts[name] || 0) + 1;
        }
        for (let i = 0; i < DIMORPHIC_SRD.length; i++) {
            if (counts[DIMORPHIC_SRD[i]] !== 1) return [result('AS-SEX-002', 'violate', DIMORPHIC_SRD[i] + ' in creatures.json')];
        }
        for (let i = 0; i < DIMORPHIC_LIVESTOCK.length; i++) {
            if (counts[DIMORPHIC_LIVESTOCK[i]]) return [result('AS-SEX-002', 'violate', DIMORPHIC_LIVESTOCK[i] + ' is not an SRD row')];
        }
    }
    return [result('AS-SEX-002', 'pass', required.length + ' dimorphic creatures')];
}

function grammarMap() {
    const out = {};
    const keys = Object.keys(ID_GRAMMAR);
    for (let i = 0; i < keys.length; i++) out[keys[i]] = new RegExp(ID_GRAMMAR[keys[i]]);
    return out;
}

function matchesGrammar(id, regs) {
    const keys = Object.keys(regs);
    for (let i = 0; i < keys.length; i++) {
        if (regs[keys[i]].test(id)) return keys[i];
    }
    return '';
}

function blankProvenance(p) {
    return !!(p && p.status === 'blank' && Array.isArray(p.attempts) && p.attempts.length === 0
        && p.ownerApproval === 'pending' && p.reviewerModel === null
        && p.timestamps && p.timestamps.generated === null && p.timestamps.reviewed === null && p.timestamps.owner === null);
}

function acceptedProvenance(p) {
    if (!p || p.status !== 'accepted' || p.ownerApproval !== 'yea' || !p.reviewerModel) return false;
    if (!p.timestamps || !p.timestamps.generated || !p.timestamps.owner) return false;
    if (!Array.isArray(p.attempts) || !p.attempts.length) return false;
    return p.attempts.some(attempt => attempt && attempt.promptSpecId && attempt.generator && attempt.generatorVersion
        && attempt.seed !== undefined && attempt.seed !== null && attempt.validation && attempt.validation.outcome === 'pass');
}

function anchorsWritten(value) {
    if (!value) return false;
    const keys = ['feet', 'head', 'mainHand', 'offHand'];
    for (let i = 0; i < keys.length; i++) {
        if (!intPair(value[keys[i]])) return false;
    }
    return true;
}

function checkSlotRecord(rec, regs, live, retired) {
    if (!rec || !rec.id || live.has(rec.id)) return 'duplicate id ' + (rec && rec.id);
    if (retired.has(rec.id)) return 'retired id ' + rec.id;
    if (!matchesGrammar(rec.id, regs)) return 'grammar ' + rec.id;
    if (!rec.catalogueId || !ID_RE.test(rec.catalogueId)) return 'catalogue link ' + rec.id;
    if (!rec.sheetFile) return 'sheet file ' + rec.id;
    const anchor = rec.anchor || (rec.cell && rec.cell.anchor);
    if (!intPair(anchor)) return 'anchor ' + rec.id;
    const provenance = rec.provenance;
    if (provenance && provenance.status === 'blank') {
        if (!blankProvenance(provenance) || rec.detectedAnchors !== null) return 'blank provenance ' + rec.id;
    } else if (provenance && provenance.status === 'accepted') {
        if (!acceptedProvenance(provenance) || !anchorsWritten(rec.detectedAnchors)) return 'accepted provenance ' + rec.id;
    } else {
        return 'provenance ' + rec.id;
    }
    live.add(rec.id);
    return '';
}

function checkSlotIds(slotMap, standard) {
    if (!slotMap || slotMap.resolveBy !== 'slot-id-only' || slotMap.packerResolveBy !== 'slot-id-only') {
        return [result('AS-ID-001', 'violate', 'resolve by pixel position')];
    }
    const tokens = slotMap.directionTokens || [];
    if (tokens.length !== DIR_TOKENS.length) return [result('AS-ID-001', 'violate', 'direction tokens')];
    for (let i = 0; i < DIR_TOKENS.length; i++) {
        if (!tokens[i] || tokens[i].id !== DIR_TOKENS[i].id || tokens[i].facing !== DIR_TOKENS[i].facing) {
            return [result('AS-ID-001', 'violate', 'direction token ' + DIR_TOKENS[i].id)];
        }
    }
    const declared = slotMap.grammar || {};
    const keys = Object.keys(ID_GRAMMAR);
    if (Object.keys(declared).length !== keys.length) return [result('AS-ID-001', 'violate', 'grammar keys')];
    for (let i = 0; i < keys.length; i++) {
        if (declared[keys[i]] !== ID_GRAMMAR[keys[i]]) return [result('AS-ID-001', 'violate', 'grammar ' + keys[i])];
    }
    const rows = (standard && standard.humanoidRows) || [];
    if (rows.length !== PAPER_DOLL.rows) return [result('AS-ID-001', 'violate', 'action rows ' + rows.length)];
    const regs = grammarMap();
    for (let i = 0; i < rows.length; i++) {
        const probe = 'CH.HAIR.ELF.F.07.' + String(rows[i]).toUpperCase() + '.D.F0';
        if (!regs['charset-layer'].test(probe)) return [result('AS-ID-001', 'violate', 'row token ' + rows[i])];
    }
    const retiredList = slotMap.retiredIds || [];
    if (!retiredList.length) return [result('AS-ID-001', 'violate', 'no retired ids')];
    const retired = new Set();
    for (let i = 0; i < retiredList.length; i++) {
        if (!matchesGrammar(retiredList[i], regs) || retired.has(retiredList[i])) {
            return [result('AS-ID-001', 'violate', 'retired grammar ' + retiredList[i])];
        }
        retired.add(retiredList[i]);
    }
    const live = new Set();
    const sheet = slotMap.sheet;
    if (!sheet || sheet.id !== EXAMPLE_SHEET_ID || sheet.file !== EXAMPLE_SHEET_FILE || sheet.pixels !== 'not-in-repo') {
        return [result('AS-ID-001', 'violate', 'example sheet')];
    }
    if (sheet.cols !== PAPER_DOLL.cols || sheet.rows !== PAPER_DOLL.rows) {
        return [result('AS-ID-001', 'violate', 'example sheet grid')];
    }
    const cells = sheet.cells || [];
    if (cells.length !== PAPER_DOLL.cols * PAPER_DOLL.rows) return [result('AS-ID-001', 'violate', 'cell count ' + cells.length)];
    const seenPos = new Set();
    let example = false;
    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const pos = cell && (cell.col + ',' + cell.row);
        if (!cell || seenPos.has(pos)) return [result('AS-ID-001', 'violate', 'cell ' + pos)];
        if (!Number.isInteger(cell.col) || !Number.isInteger(cell.row) || cell.col < 0 || cell.row < 0 || cell.col >= PAPER_DOLL.cols || cell.row >= PAPER_DOLL.rows) {
            return [result('AS-ID-001', 'violate', 'cell range ' + pos)];
        }
        const expectId = 'CH.HAIR.ELF.F.07.' + String(rows[cell.row]).toUpperCase() + '.' + DIR_TOKENS[Math.floor(cell.col / 4)].id + '.F' + (cell.col % 4);
        if (cell.id !== expectId) return [result('AS-ID-001', 'violate', 'cell id ' + pos)];
        if (cell.sheetFile !== EXAMPLE_SHEET_FILE) return [result('AS-ID-001', 'violate', 'cell sheet ' + pos)];
        const bad = checkSlotRecord(cell, regs, live, retired);
        if (bad) return [result('AS-ID-001', 'violate', bad)];
        seenPos.add(pos);
        if (cell.id === EXAMPLE_SLOT_ID) example = true;
    }
    for (let r = 0; r < PAPER_DOLL.rows; r++) {
        for (let c = 0; c < PAPER_DOLL.cols; c++) {
            if (!seenPos.has(c + ',' + r)) return [result('AS-ID-001', 'violate', 'missing cell ' + c + ',' + r)];
        }
    }
    if (!example) return [result('AS-ID-001', 'violate', 'missing ' + EXAMPLE_SLOT_ID)];
    const samples = slotMap.grammarSamples || [];
    const seenCats = new Set();
    for (let i = 0; i < samples.length; i++) {
        const sample = samples[i];
        if (!sample || !ID_GRAMMAR[sample.category]) return [result('AS-ID-001', 'violate', 'sample category')];
        if (!regs[sample.category].test(sample.id)) return [result('AS-ID-001', 'violate', 'sample grammar ' + sample.id)];
        const bad = checkSlotRecord(sample, regs, live, retired);
        if (bad) return [result('AS-ID-001', 'violate', bad)];
        seenCats.add(sample.category);
    }
    for (let i = 0; i < keys.length; i++) {
        if (!seenCats.has(keys[i])) return [result('AS-ID-001', 'violate', 'no sample for ' + keys[i])];
    }
    return [result('AS-ID-001', 'pass', live.size + ' slot ids')];
}

function checkAnchorAlignment(rec) {
    if (!rec || rec.shift !== 'whole-pixels' || rec.scaling !== false || rec.trimTransparentMargins !== true || rec.writesDetectedAnchorsToSlot !== true) {
        return [result('AS-ANCHOR-001', 'violate', 'shift is not whole pixels')];
    }
    if (rec.generatorProvidesAnchors !== false) return [result('AS-ANCHOR-001', 'violate', 'generator anchors')];
    if (!sameSet(rec.rejectRegenerate, ANCHOR_REJECT) || !sameSet(rec.landmarks, ANCHOR_LANDMARKS) || !sameSet(rec.detection, ANCHOR_DETECTION)) {
        return [result('AS-ANCHOR-001', 'violate', 'landmarks or reject list')];
    }
    if (rec.optionalPoseReference !== true || !rec.typicalCorrectionPx || rec.typicalCorrectionPx[0] !== 1 || rec.typicalCorrectionPx[1] !== 2) {
        return [result('AS-ANCHOR-001', 'violate', 'pose reference')];
    }
    const frame = rec.sample;
    if (!frame || !Number.isInteger(frame.shiftX) || !Number.isInteger(frame.shiftY)) {
        return [result('AS-ANCHOR-001', 'violate', 'sample shift')];
    }
    if (frame.accepted === true) {
        if (frame.clipping || frame.wrongProportions || frame.wrongSize || frame.headDrift) {
            return [result('AS-ANCHOR-001', 'violate', 'accepted a frame that should be regenerated')];
        }
        if (!anchorsWritten(frame.detectedAnchors) || !anchorsWritten(frame.slotAnchors)) {
            return [result('AS-ANCHOR-001', 'violate', 'detected anchors were not written')];
        }
        const keys = ['feet', 'head', 'mainHand', 'offHand'];
        for (let i = 0; i < keys.length; i++) {
            const detected = frame.detectedAnchors[keys[i]];
            const slot = frame.slotAnchors[keys[i]];
            if (detected[0] !== slot[0] || detected[1] !== slot[1]) {
                return [result('AS-ANCHOR-001', 'violate', keys[i] + ' missed the slot anchor')];
            }
        }
    } else if (!frame.reason) {
        return [result('AS-ANCHOR-001', 'violate', 'rejected frame has no reason')];
    }
    return [result('AS-ANCHOR-001', 'pass', 'whole-pixel anchor alignment')];
}

function checkEquipmentAnchors(standard) {
    const policy = standard && standard.equipmentAnchors;
    if (!policy || policy.weaponDrawn !== 'upright-sprite-plus-baked-angles' || policy.pinnedBy !== 'compositor') {
        return [result('AS-EQUIP-001', 'violate', 'weapon is not pinned by the compositor')];
    }
    if (policy.grip !== 'fixed-upright-right-hand' || policy.runtimeRotation !== false || policy.bodyAttackRow !== false) {
        return [result('AS-EQUIP-001', 'violate', 'melee body swing')];
    }
    if (policy.redrawPerFrame !== false || policy.redrawPerRace !== false || policy.redrawPerBody !== false) {
        return [result('AS-EQUIP-001', 'violate', 'weapon redrawn per frame or body')];
    }
    if (!sameSet(policy.gripAngles, standard.angles) || !sameSet(policy.drawOrderValues, ['in-front', 'behind'])) {
        return [result('AS-EQUIP-001', 'violate', 'grip angles or draw order')];
    }
    if (!policy.directionDrawOrder || policy.directionDrawOrder.S !== 'in-front' || policy.directionDrawOrder.N !== 'behind') {
        return [result('AS-EQUIP-001', 'violate', 'down and up draw order')];
    }
    const frames = standard.elderReuse && standard.elderReuse.frames;
    const expect = expectedBodyFrames(standard);
    if (!frames || frames.length !== expect) return [result('AS-EQUIP-001', 'violate', 'body frames ' + (frames ? frames.length : 0))];
    for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        if (!frame || !intPair(frame.mainHand) || !intPair(frame.offHand)) {
            return [result('AS-EQUIP-001', 'violate', 'frame ' + i + ' hand anchor')];
        }
        if (standard.angles.indexOf(frame.gripAngle) === -1) return [result('AS-EQUIP-001', 'violate', 'frame ' + i + ' grip angle')];
        if (frame.drawOrder !== 'in-front' && frame.drawOrder !== 'behind') {
            return [result('AS-EQUIP-001', 'violate', 'frame ' + i + ' draw order')];
        }
        if (['S', 'W', 'E', 'N'].indexOf(frame.dir) === -1) return [result('AS-EQUIP-001', 'violate', 'frame ' + i + ' direction')];
        if (frame.dir === 'S' && frame.drawOrder !== 'in-front') return [result('AS-EQUIP-001', 'violate', 'frame ' + i + ' down is not in front')];
        if (frame.dir === 'N' && frame.drawOrder !== 'behind') return [result('AS-EQUIP-001', 'violate', 'frame ' + i + ' up is not behind')];
    }
    return [result('AS-EQUIP-001', 'pass', expect + ' body frames')];
}

function colourValue(hex) {
    const text = String(hex || '').toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(text)) return null;
    const n = parseInt(text.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return Math.round((0.299 * r + 0.587 * g + 0.114 * b) / 255 * 15);
}

function colourChannel(hex) {
    const n = parseInt(String(hex).slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    if (r > g + 30 && r > b) return 'R';
    if (g > r + 30 && g > b) return 'G';
    return 'other';
}

function redGreenPair(a, b) {
    const ca = colourChannel(a);
    const cb = colourChannel(b);
    return (ca === 'R' && cb === 'G') || (ca === 'G' && cb === 'R');
}

function paletteSet(standard) {
    const colours = standard && standard.masterPalette && standard.masterPalette.colours;
    return new Set(Array.isArray(colours) ? colours : []);
}

function sumFrames(rows) {
    if (!Array.isArray(rows)) return null;
    let n = 0;
    for (let i = 0; i < rows.length; i++) {
        if (!rows[i] || !Number.isInteger(rows[i].frames)) return null;
        n += rows[i].frames;
    }
    return n;
}

function rowFrames(rows, id) {
    if (!Array.isArray(rows)) return null;
    for (let i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i].id === id) return rows[i].frames;
    }
    return null;
}

function classFrames(rows, name) {
    if (!Array.isArray(rows)) return false;
    const found = rows.filter(row => row && row.class === name);
    if (!found.length) return false;
    return found.every(row => row.frames === { idle: 4, walk: 3, attack: 6, cast: 6, work: 6, death: 6 }[name]);
}

function noteOk(manual, key) {
    return !!(manual && typeof manual[key] === 'string' && manual[key].length > 20);
}

function portraitStyleOk(lock) {
    const portrait = lock && lock.portrait;
    if (!portrait || portrait.assetClass !== 'character-faceset' || portrait.colourCap !== 64) return false;
    if (portrait.source !== 'master-plus-portrait-skin-hair-ramp' || portrait.shading !== 'painterly-soft') return false;
    if (portrait.outlineRequired !== false || portrait.selfTintedOutlineRequired !== false || portrait.blackContour !== 'allowed') return false;
    if (portrait.mapSpritesKeepCaps !== true || portrait.mapSpritesKeepOutline !== true || portrait.grayscale !== true) return false;
    if (portrait.styleRef !== PORTRAIT_STYLE_REF || portrait.styleRefSha256 !== PORTRAIT_STYLE_SHA256) return false;
    const style = portrait.style || [];
    if (!sameSet(style, ['painterly-pixel', 'soft-detailed-shading', 'warm-light', 'plain-dark-background'])) return false;
    const ramp = portrait.rampExtension;
    if (!ramp || ramp.id !== 'RAMP_PORTRAIT_SKIN_HAIR' || ramp.status !== 'allowed-when-master-is-short' || !Array.isArray(ramp.colours)) return false;
    try {
        const bytes = fs.readFileSync(path.join(ROOT, portrait.styleRef));
        const hash = crypto.createHash('sha256').update(bytes).digest('hex');
        return hash === portrait.styleRefSha256;
    } catch (e) {
        return false;
    }
}

function viewTextOk(text) {
    if (typeof text !== 'string' || !text) return false;
    const banned = [
        /oblique/i,
        /diagonal\s+movement/i,
        /diagonal\s+glid/i,
        /diagonal\s+step/i,
        /px\s+per\s+axis/i,
        /diagonalPxPerAxis/,
        /diagonalMovement/,
        /top-and-front/,
        /ultima-vii-oblique/
    ];
    for (let i = 0; i < banned.length; i++) {
        if (banned[i].test(text)) return false;
    }
    const re = /5-5-5/g;
    let n = 0;
    let m;
    while ((m = re.exec(text))) {
        n++;
        const w = text.slice(Math.max(0, m.index - 240), Math.min(text.length, m.index + 240));
        if (!/spell/i.test(w) || !/area/i.test(w) || !/range/i.test(w)) return false;
        if (/movement/i.test(w) && !/orthogonal/i.test(w)) return false;
    }
    return n >= 1;
}

function viewDocOk(text) {
    return viewTextOk(text)
        && text.indexOf('RMMZ standard top-down 3/4') !== -1
        && text.indexOf('orthogonal only') !== -1
        && text.indexOf('4-way on the grid') !== -1
        && (text.indexOf('row, then by Z layer') !== -1 || text.indexOf('row-then-layer') !== -1);
}

function standardDocText() {
    try {
        return fs.readFileSync(path.join(ROOT, 'docs', 'art', 'DEUS_ASSET_STANDARD.md'), 'utf8');
    } catch (e) {
        return '';
    }
}

function rowById(rows, id) {
    if (!Array.isArray(rows)) return null;
    for (let i = 0; i < rows.length; i++) if (rows[i] && rows[i].id === id) return rows[i];
    return null;
}

function droppedOk(proj, retired) {
    const rows = proj && proj.dropped;
    const need = {
        'quarter-front': 'rmmz-tile',
        'side-wall': 'none',
        'side-roof': 'none',
        'corner-joint': 'none',
        'tall-split': 'single-sprite'
    };
    if (!Array.isArray(rows)) return false;
    const seen = {};
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.status !== 'removed' || need[row.id] !== row.replacement || !Array.isArray(row.retiredSlotIds)) return false;
        seen[row.id] = true;
        if (row.id === 'quarter-front') {
            if (row.retiredSlotIds.length !== 1 || row.retiredSlotIds[0] !== 'DP.CLIFF.TEMPERATE.FACE') return false;
            if (!retired || retired.indexOf('DP.CLIFF.TEMPERATE.FACE') === -1) return false;
        } else if (row.retiredSlotIds.length !== 0) return false;
    }
    const ids = Object.keys(need);
    for (let i = 0; i < ids.length; i++) if (!seen[ids[i]]) return false;
    return true;
}

function categoryOk(standard, ruleId) {
    const rows = standard && standard.a9c && standard.a9c.catalogueCategories;
    const samples = standard && standard.slotMap && standard.slotMap.grammarSamples;
    if (!Array.isArray(rows) || !Array.isArray(samples)) return false;
    const mine = rows.filter(row => row && row.ruleId === ruleId);
    if (!mine.length) return false;
    const seen = new Set(samples.map(sample => sample && sample.id));
    for (let i = 0; i < mine.length; i++) {
        const row = mine[i];
        if (!row.id || !row.slotGrammar || !ID_GRAMMAR[row.slotGrammar]) return false;
        if (!row.sizing || row.sizing.nativeScale !== 1 || row.sizing.scaled === true) return false;
        if (!seen.has(row.sampleSlotId)) return false;
        if (!new RegExp(ID_GRAMMAR[row.slotGrammar]).test(row.sampleSlotId)) return false;
    }
    return true;
}

function checkA9c(standard) {
    const out = [];
    const a = standard && standard.a9c;
    const g = standard && standard.geometry;
    const pal = standard && standard.masterPalette;
    const manual = a && a.artManual;
    const layout = standard && standard.slotMap && standard.slotMap.frameLayout;

    const proportion = a && a.proportion;
    let proportionOk = !!(proportion && proportion.target === '1/5' && proportion.min === 0.18 && proportion.max === 0.22
        && proportion.chibi === false && proportion.tone === 'readable-high-contrast-fantasy'
        && proportion.feelReference === 'ultima-vii' && proportion.view === 'rmmz-top-down-3-4' && noteOk(manual, '16')
        && Array.isArray(proportion.samples) && proportion.samples.length >= 9);
    if (proportionOk) {
        for (let i = 0; i < proportion.samples.length; i++) {
            const row = proportion.samples[i];
            if (!row || !Number.isInteger(row.bodyPx) || !Number.isInteger(row.headPx) || row.bodyPx < 1) {
                proportionOk = false;
                break;
            }
            const ratio = row.headPx / row.bodyPx;
            if (ratio < proportion.min || ratio > proportion.max) {
                proportionOk = false;
                break;
            }
        }
    }
    out.push(result('AS-LOOK-001', proportionOk ? 'pass' : 'violate', proportionOk ? 'head about 1/5' : 'proportion or art direction'));

    const proj = a && a.projection;
    const retired = standard && standard.slotMap && standard.slotMap.retiredIds;
    const docOk = viewDocOk(JSON.stringify(standard)) && viewDocOk(standardDocText());
    const projOk = !!(proj && proj.view === 'rmmz-top-down-3-4' && proj.drawOrder === 'row-then-layer'
        && sameSet(proj.directions, ['S', 'W', 'E', 'N']) && proj.sprites === '4-direction'
        && proj.eightDirection === 'declined' && proj.movement === 'orthogonal-4-way'
        && proj.cliffWall === 'rmmz-tile' && proj.quarterHeightFrontFaces === false
        && proj.sideWall === false && proj.sideRoof === false && proj.cornerJoint === false
        && proj.tallObjectSplit === false && droppedOk(proj, retired)
        && noteOk(manual, '17') && noteOk(manual, '38') && docOk);
    out.push(result('AS-PROJ-001', projOk ? 'pass' : 'violate', projOk ? 'RMMZ top-down 3/4, orthogonal 4-way' : 'projection'));

    const furn = a && a.furniture;
    let furnOk = !!(furn && furn.facings === 4 && sameSet(furn.directions, ['S', 'W', 'E', 'N'])
        && furn.reuse === 'symmetric-flag-only' && noteOk(manual, '18') && categoryOk(standard, 'AS-FURN-001')
        && Array.isArray(furn.samples) && furn.samples.length >= 2);
    if (furnOk) {
        for (let i = 0; i < furn.samples.length; i++) {
            const row = furn.samples[i];
            if (!row || !sameSet(row.facings, ['S', 'W', 'E', 'N'])) furnOk = false;
            else if (row.symmetric === true && row.reuse !== 'flagged') furnOk = false;
            else if (row.symmetric !== true && row.uniqueViews !== 4) furnOk = false;
            else if (row.symmetric !== true && row.reuse === 'flagged') furnOk = false;
        }
    }
    out.push(result('AS-FURN-001', furnOk ? 'pass' : 'violate', furnOk ? '4 facings, reuse by flag' : 'furniture facings'));

    const terr = a && a.terrain;
    const trial = terr && terr.trial;
    const terrOk = !!(terr && terr.tilePx === 48 && terr.family === 'pixellab-tiles-pro-wang' && terr.renderer === 'dual-grid'
        && terr.a2Autotile === false && terr.decalsPx === 24 && sameSet(terr.decals, ['pebbles', 'tufts', 'cracks', 'leaves'])
        && terr.groundTypesMin === 3 && terr.groundTypesMax === 5 && terr.plainVariantsMin === 2 && terr.plainVariantsMax === 3
        && terr.nativeScale === 1 && terr.scaled === false && noteOk(manual, '19') && noteOk(manual, '34')
        && categoryOk(standard, 'AS-TERR-001')
        && trial && trial.characterRequestPx === 42 && trial.characterTallPx[0] === 42 && trial.characterTallPx[1] === 43
        && trial.animation === 'skeleton-v3-on-create-character-v3' && sameSet(trial.layerPropagation, ['armour', 'helmet', 'preset-head', 'class-kit'])
        && trial.weaponsShields === 'anchored-sprites' && trial.southWalk && trial.southWalk.offsetPx[0] === 0 && trial.southWalk.offsetPx[1] === 2
        && trial.weaponAngles === 'two-authored-plus-lossless-90' && trial.view === 'rmmz-top-down-3-4'
        && trial.smallItemWorldSprites === 'open-test'
        && Array.isArray(terr.biomes) && sameSet(terr.biomes.map(row => row && row.id), ['VOLCANIC', 'WET', 'ARID', 'TEMPERATE', 'COLD', 'WILD']));
    let groundsOk = terrOk;
    if (groundsOk) {
        for (let i = 0; i < terr.biomes.length; i++) {
            const biome = terr.biomes[i];
            const types = biome && biome.groundTypes;
            if (!types || types.length < 3 || types.length > 5) groundsOk = false;
            else {
                for (let t = 0; t < types.length; t++) {
                    const n = biome.plainVariants && biome.plainVariants[types[t]];
                    if (n < 2 || n > 3) groundsOk = false;
                }
                if (!Array.isArray(biome.transitionPairs) || biome.transitionPairs.length < types.length - 1) groundsOk = false;
            }
        }
    }
    out.push(result('AS-TERR-001', groundsOk ? 'pass' : 'violate', groundsOk ? '48 px Wang dual-grid, trial recorded' : 'terrain'));

    const marks = a && a.groundMarks;
    const marksOk = !!(marks && sameSet(marks.kinds, ['boot', 'bare', 'paw', 'hoof']) && sameSet(marks.surfaces, ['snow', 'mud', 'sand', 'blood', 'wet'])
        && marks.directions === 4 && marks.fadeStepsMin === 2 && marks.fadeStepsMax === 3 && marks.fadeSteps === 3
        && marks.path && marks.path.mayBecomeRoad === true && marks.nativeScale === 1 && noteOk(manual, '20')
        && categoryOk(standard, 'AS-TRACK-001'));
    out.push(result('AS-TRACK-001', marksOk ? 'pass' : 'violate', marksOk ? 'ground marks' : 'ground marks'));

    const lights = a && a.lights;
    const set = paletteSet(standard);
    let glowOk = !!(lights && Array.isArray(lights.sources) && lights.sources.length >= 1 && lights.layer === 'additive'
        && lights.pixelStepped === true && lights.blur === false && noteOk(manual, '21') && categoryOk(standard, 'AS-GLOW-001'));
    if (glowOk) {
        const ids = new Set();
        for (let i = 0; i < lights.sources.length; i++) {
            const src = lights.sources[i];
            if (!src || !src.id || ids.has(src.id) || !src.glowId || src.glowId === src.id) glowOk = false;
            else if (!set.has(src.colour) || !Number.isInteger(src.radiusPx) || src.radiusPx < 1) glowOk = false;
            else ids.add(src.id);
        }
    }
    out.push(result('AS-GLOW-001', glowOk ? 'pass' : 'violate', glowOk ? 'glow id, colour, radius' : 'glow'));

    const depth = a && a.depth;
    const depthCat = rowById(a && a.catalogueCategories, 'DEPTH');
    const depthSize = rowById(a && a.sizingManifest, 'DEPTH');
    const toggles = ['whole-pixel-parallax', 'unit-height-shift', 'camera-layer-easing', 'dithered-cutaways', 'cross-layer-effects', 'glows-light-lower-layers', 'weather-by-exposed-layer'];
    const depthOk = !!(depth && depth.palettePerLayer === true && depth.cliffWall === 'rmmz-tile'
        && depth.quarterHeightFrontFaces === false
        && depth.dropShadow === 'hard-dithered' && depth.ledgeRimPx === 1 && depth.halfStepQuarters === 2 && depth.halfStepPx === 24
        && depth.overlayOutline === true && depth.terrainOutline === false && sameSet(depth.toggles, toggles)
        && depth.rendererInLane === false && noteOk(manual, '22') && categoryOk(standard, 'AS-DEPTH-001')
        && depthCat && depthCat.sampleSlotId === 'DP.CLIFF.TEMPERATE.TILE'
        && depthCat.sizing && depthCat.sizing.form === 'rmmz-tile'
        && depthCat.sizing.px && depthCat.sizing.px[0] === 48 && depthCat.sizing.px[1] === 48
        && depthSize && depthSize.form === 'rmmz-tile'
        && depthSize.px && depthSize.px[0] === 48 && depthSize.px[1] === 48);
    out.push(result('AS-DEPTH-001', depthOk ? 'pass' : 'violate', depthOk ? 'depth look and demo toggles' : 'depth'));

    const world = a && a.worldItems;
    let worldOk = !!(world && world.view === 'rmmz-top-down-3-4' && sameSet(world.alongside, ['icon', 'portrait-144'])
        && world.placement === 'pixel-offset' && sameSet(world.hosts, ['tile', 'surface', 'container'])
        && sameSet(world.fields, ['anchor', 'footprint', 'simHook']) && world.nativeScale === 1 && world.scaled === false
        && noteOk(manual, '23') && categoryOk(standard, 'AS-WITEM-001')
        && Array.isArray(world.samples) && world.samples.length >= 1);
    if (worldOk) {
        for (let i = 0; i < world.samples.length; i++) {
            const row = world.samples[i];
            if (!row || [12, 24, 48].indexOf(row.sizePx) === -1 || row.scaled === true) worldOk = false;
            else if (!row.anchor || !row.footprint || !row.simHook) worldOk = false;
        }
    }
    out.push(result('AS-WITEM-001', worldOk ? 'pass' : 'violate', worldOk ? 'world sprite slot' : 'world sprite'));

    const feat = a && a.features;
    const workIds = ['farm', 'mine', 'chop', 'build', 'craft', 'carry', 'fish', 'cook'];
    let featOk = !!(feat && sameSet(feat.seasons, ['spring', 'summer', 'autumn', 'winter'])
        && sameSet(feat.seasonHosts, ['terrain', 'vegetation', 'building', 'object'])
        && feat.damageStagesMin === 3 && feat.damageStages === 4
        && sameSet(feat.work, workIds) && feat.workFrames === 6 && feat.workDirections === 4
        && feat.onLayeredSystem === true && noteOk(manual, 'F') && categoryOk(standard, 'AS-FEAT-001'));
    out.push(result('AS-FEAT-001', featOk ? 'pass' : 'violate', featOk ? 'seasons, damage, work' : 'feature art'));

    const play = a && a.placement;
    const playOk = !!(play && play.near === 'full-detail' && play.far === 'summarized-counts' && play.seed === 'fixed'
        && play.storage === 'chunk-and-layer' && play.clutterCleanup === true && play.saves === 'change-only'
        && play.stressItems === 100000 && play.cellPx === 6 && play.cellsPerTileSide === 8
        && sameSet(play.sizePx, [12, 24, 48]) && play.scaled === false
        && play.tableTopQuarters === 1 && play.shelfQuarters[0] === 2 && play.shelfQuarters[1] === 3
        && play.itemDrawOrder === 'footprint-bottom-then-height' && play.insideOrder === 'row-then-layer'
        && play.weight === 'srd-pounds' && play.massLedger === true && play.smallShadowPx[0] === 1 && play.smallShadowPx[1] === 2
        && play.receivesGlow === true && play.movement === 'tile-to-tile'
        && play.passablePx.indexOf(12) !== -1 && play.passablePx.indexOf(24) !== -1 && play.blockingPx.indexOf(48) !== -1
        && noteOk(manual, '24') && categoryOk(standard, 'AS-PLAY-001'));
    out.push(result('AS-PLAY-001', playOk ? 'pass' : 'violate', playOk ? 'placement fields' : 'placement'));

    const cont = a && a.containers;
    let contOk = !!(cont && cont.window === 'movable' && cont.interior === 'free-placed' && cont.grid === false
        && sameSet(cont.drag, ['container', 'map', 'paper-doll']) && cont.nesting === 'one-window-each'
        && cont.multipleWindows === true && cont.example && cont.example.id === 'backpack'
        && cont.example.volumeCuFt === 1 && cont.example.weightLb === 30 && cont.locks === 'srd'
        && cont.spill === 'mass-ledger' && cont.shopStock === true && cont.countsAs === 'one-object'
        && cont.openClosed === true && cont.facings === 4 && cont.openAnimation === true && cont.windowBackground === true
        && cont.raceVariants === 'where-sensible' && noteOk(manual, '25') && categoryOk(standard, 'AS-CONT-001')
        && Array.isArray(cont.types) && cont.types.length >= 1);
    if (contOk) {
        for (let i = 0; i < cont.types.length; i++) {
            const row = cont.types[i];
            if (!row || !row.openSlot || !row.closedSlot || !sameSet(row.facings, ['S', 'W', 'E', 'N']) || !row.openAnimation || !row.windowBackground) {
                contOk = false;
            }
        }
    }
    out.push(result('AS-CONT-001', contOk ? 'pass' : 'violate', contOk ? 'containers' : 'containers'));

    const scale = a && a.scale;
    const scaleOk = !!(g && g.cellFt === 5 && g.cellPx === 48 && g.layerFt === 5 && g.layerPx === 48
        && g.zLayers === 32 && g.zMin === -16 && g.zMax === 15 && (g.zMax - g.zMin + 1) === 32
        && g.tilePx === 48 && Array.isArray(g.tilePxNotAdopted) && g.tilePxNotAdopted.indexOf(64) !== -1
        && g.tilePx !== 64 && scale && scale.diagonals === '5-5-5'
        && scale.diagonalScope === 'spell-areas-and-ranges' && scale.unitMovement === 'orthogonal'
        && scale.diagonalPxPerAxis === undefined
        && scale.torchBrightFt === 20 && scale.torchDimFt === 20
        && scale.torchBrightTiles === 4 && scale.torchDimTiles === 4 && scale.falling === '1d6 per 2 layers'
        && scale.carry === 'Str × 15 lb' && scale.walkPxPerFrame === 4 && scale.runPxPerFrame === 6
        && scale.fps === 60 && scale.tickSeconds === 6 && scale.ticksPerGameMinute === 10
        && scale.dayLengthRealMinutes && scale.dayLengthRealMinutes[0] === 24 && scale.dayLengthRealMinutes[1] === 48
        && scale.brightLight === 'solid-glow' && scale.dimLight === 'dither-2-3' && scale.gradients === false
        && scale.positions === 'whole-pixels' && scale.historicalDomain === 'unchanged'
        && noteOk(manual, '26'));
    out.push(result('AS-SCALE-001', scaleOk ? 'pass' : 'violate', scaleOk ? '5 ft layer, 48 px' : 'world scale'));

    const render = a && a.render;
    const renderOk = !!(render && render.integerOnly === true && render.defaultScale === 2 && render.smoothing === false
        && render.nearestNeighbour === true && render.minTilesAcross === 20
        && render.auto && render.auto['1080p'] === 2 && render.auto['1440p'] === 3 && render.auto['4k'] === 3
        && render.playerOverride === true && render.camera === 'whole-art-pixels' && render.uiScale === 'same-factor'
        && sameSet(render.extraSpace, ['letterbox', 'more-map']) && render.stretch === false
        && sameSet(render.depthDemoScales, [1, 2, 3]) && noteOk(manual, '27'));
    out.push(result('AS-RENDER-001', renderOk ? 'pass' : 'violate', renderOk ? 'integer scale, 2x default' : 'render scale'));

    const cross = a && a.crossLayer;
    const crossOk = !!(cross && sameSet(cross.kinds, ['ground-collapse', 'wall-breach', 'cave-in'])
        && cross.wallBreachStagesMin === 3 && cross.wallBreachStagesMax === 4 && cross.wallBreachStages === 4
        && cross.massLedger === true && noteOk(manual, '28') && categoryOk(standard, 'AS-XLAYER-001'));
    out.push(result('AS-XLAYER-001', crossOk ? 'pass' : 'violate', crossOk ? 'cross-layer damage' : 'cross-layer'));

    const quarterOk = !!(g && g.strataPerLayer === 4 && g.stratumFt === 1.25 && g.quarterFt === 1.25 && g.quarterPx === 12
        && Array.isArray(g.stratumPx) && g.stratumPx.length === 4 && g.stratumPx.every(n => n === 12)
        && g.quarterPx * 4 === g.layerPx && g.heightUnit === 'quarter'
        && JSON.stringify(g).toLowerCase().indexOf('fifth') === -1
        && a && a.quarters && a.quarters.halfStepPx === 24 && a.quarters.headRule === 'proportion-not-a-split'
        && noteOk(manual, '29'));
    out.push(result('AS-QTR-001', quarterOk ? 'pass' : 'violate', quarterOk ? 'four quarters of 12 px' : 'quarters'));

    const site = a && a.construction;
    const siteOk = !!(site && site.ghost === 'palette-swap' && site.alphaGhost === false
        && sameSet(site.pieces, ['blueprint', 'foundation', 'scaffolding', 'partial', 'prop', 'anim'])
        && noteOk(manual, '30') && categoryOk(standard, 'AS-SITE-001'));
    out.push(result('AS-SITE-001', siteOk ? 'pass' : 'violate', siteOk ? 'construction category' : 'construction'));

    const read = a && a.readability;
    let readOk = !!(read && pal && read.minValueStep === 3 && read.smallItemMinValueStep === 4 && read.valueLevels === 16
        && read.backgrounds === 'calmer' && read.mood === 'lighting-glow-grading' && read.silhouette === true
        && read.ui && read.ui.hoverOutlinePx === 1 && read.ui.tooltip === true && read.ui.dragSnapPx === 6
        && read.ui.picking === 'topmost-first' && read.ui.stackCycle === 'modifier' && sameSet(read.ui.holdZoom, [3, 4])
        && read.reference && read.reference.name === 'pixellab-table-with-items' && read.reference.reviewScale === '2x-integer'
        && read.reference.imageGenerated === false && noteOk(manual, '31')
        && Array.isArray(read.records) && read.records.length >= 2);
    if (readOk) {
        for (let i = 0; i < read.records.length; i++) {
            const row = read.records[i];
            const step = row && row.sizePx === 12 ? read.smallItemMinValueStep : read.minValueStep;
            const subject = colourValue(row && row.subjectHex);
            const ground = colourValue(row && row.groundHex);
            if (subject === null || ground === null || !set.has(row.subjectHex) || !set.has(row.groundHex)) readOk = false;
            else if (Math.abs(subject - ground) < step) readOk = false;
        }
    }
    out.push(result('AS-READ-001', readOk ? 'pass' : 'violate', readOk ? 'grayscale step' : 'readability'));

    const rules = a && a.paletteRules;
    const palOk = !!(rules && rules.length === 5 && rules[0] === 'saturated-controlled'
        && rules[1] === 'value-first' && rules[2] === 'brightest-reserved' && rules[3] === 'mood-from-lighting'
        && rules[4] === 'grayscale-before-approval' && a.palette && a.palette.grayMush === false
        && sameSet(a.palette.brightestReserved, ['interactables', 'characters', 'spell-effects', 'loot', 'danger'])
        && a.palette.backgroundsCalmer === true && noteOk(manual, '32'));
    out.push(result('AS-PAL-001', palOk ? 'pass' : 'violate', palOk ? 'palette rules' : 'palette rules'));

    const lock = a && a.styleLock;
    const perDir = layout && sumFrames(layout.rows);
    const featureSum = layout && sumFrames(layout.featureRows);
    const lockOk = !!(lock && pal && lock.status === 'LOCKED' && lock.pmMayRevise === true
        && lock.pmRevision === '2026-09-26 15:05 CT' && lock.ownerNotice === true
        && lock.light === 'top-left' && lock.outlinePx === 1 && lock.outline === 'self-tinted-dark'
        && lock.terrainOutline === false && lock.shrinkTo64 === false
        && pal.activeCount === 226 && pal.reservedSlots === 30 && pal.slotCount === 256 && pal.shrinkTo64 === false
        && pal.canonical === true && Array.isArray(pal.colours) && pal.colours.length === 226
        && new Set(pal.colours).size === 226 && pal.legacyLineCount === 256 && pal.legacyUniqueCount === 250
        && pal.legacyOverlap === 0
        && lock.caps && lock.caps.itemOrIcon === 16 && lock.caps.characterOrCreatureSheet === 32 && lock.caps.tileset === 48
        && lock.caps.portrait === 64 && portraitStyleOk(lock)
        && layout && layout.replacesAverage === 3.5 && layout.oldCells === 420 && layout.playbackWalk
        && layout.playbackWalk.length === 4 && layout.playbackWalk[0] === 1 && layout.playbackWalk[1] === 2
        && layout.playbackWalk[2] === 1 && layout.playbackWalk[3] === 0
        && rowFrames(layout.rows, 'walk') === 3 && rowFrames(layout.rows, 'idle') === 4
        && rowFrames(layout.rows, 'melee-swing') === 6 && rowFrames(layout.rows, 'thrust') === 6
        && rowFrames(layout.rows, 'death') === 6 && classFrames(layout.rows, 'cast') && classFrames(layout.rows, 'work')
        && Array.isArray(layout.featureRows) && layout.featureRows.length === 6
        && layout.featureRows.every(row => row && row.frames === 6 && row.class === 'work'
            && ['farm', 'mine', 'build', 'craft', 'fish', 'cook'].indexOf(row.id) !== -1)
        && perDir * 4 === layout.cells30 && featureSum * 4 === layout.featureCells
        && layout.item33Cells === 708 && layout.cells30 + layout.featureCells === layout.item33Cells
        && layout.droppedMeleeBodyCells === 48 && layout.drawnBodyCells === 516
        && layout.cells30 - layout.droppedMeleeBodyCells === layout.drawnBodyCells
        && layout.drawnBodyCells + layout.featureCells === layout.cellsPerFullSheet
        && layout.cellsPerFullSheet === 660
        && layout.boundingPx && layout.boundingPx[0] === 1152 && layout.boundingPx[1] === 1632
        && layout.boundingPx[0] <= 2048 && layout.boundingPx[1] <= 2048
        && lock.extensionRows === 'rmmz-compatible' && lock.additiveGlow === 'max-brightness-only'
        && sameSet(lock.grading, ['dawn', 'day', 'dusk', 'night', 'underground'])
        && lock.iconPx === 32 && lock.markers && lock.markers.colourBlindSafe === true && lock.markers.colourOnly === false
        && noteOk(manual, '33') && categoryOk(standard, 'AS-LOCK-001'));
    let capsOk = lockOk && Array.isArray(lock.colourUse);
    if (capsOk) {
        const needKind = { item: 16, character: 32, tileset: 48, portrait: 64 };
        const extension = new Set((lock.portrait.rampExtension && lock.portrait.rampExtension.colours) || []);
        const seenKind = {};
        for (let i = 0; i < lock.colourUse.length; i++) {
            const row = lock.colourUse[i];
            const cap = row && needKind[row.kind];
            if (!cap || !Array.isArray(row.colours) || row.colours.length < 1 || row.colours.length > cap) capsOk = false;
            else {
                seenKind[row.kind] = true;
                for (let c = 0; c < row.colours.length; c++) {
                    const hex = row.colours[c];
                    if (row.kind === 'portrait') {
                        if (!set.has(hex) && !extension.has(hex)) capsOk = false;
                    } else if (!set.has(hex)) capsOk = false;
                }
            }
        }
        if (!seenKind.item || !seenKind.character || !seenKind.tileset || !seenKind.portrait) capsOk = false;
    }
    let markerOk = capsOk && lock.markers && Array.isArray(lock.markers.shapes);
    if (markerOk) {
        const roles = lock.markers.shapes.map(row => row && row.role);
        const shapes = lock.markers.shapes.map(row => row && row.shape);
        markerOk = sameSet(roles, ['selection', 'faction', 'summon-controller', 'low-hp'])
            && new Set(shapes).size === 4 && shapes.every(shape => typeof shape === 'string' && shape.length > 0);
    }
    out.push(result('AS-LOCK-001', markerOk ? 'pass' : 'violate', markerOk ? 'locked style defaults' : 'style lock'));

    const melee = a && a.melee;
    const swingRow = layout && rowById(layout.rows, 'melee-swing');
    const thrustRow = layout && rowById(layout.rows, 'thrust');
    const keptRows = ['bow-draw', 'bow-loose', 'xbow-aim', 'xbow-fire', 'xbow-reload', 'cast-one-hand', 'cast-two-hand', 'cast-focus', 'hammer', 'saw', 'chop', 'dig', 'stir', 'carry', 'kneel'];
    let keptOk = !!(layout && Array.isArray(layout.rows));
    if (keptOk) {
        for (let i = 0; i < keptRows.length; i++) {
            const row = rowById(layout.rows, keptRows[i]);
            if (!row || row.bodyDrawn === false) keptOk = false;
        }
    }
    const meleeOk = !!(melee && melee.weapon === 'separate-sprite' && melee.pin === 'one-grip-anchor'
        && melee.body === 'mostly-still' && melee.grip === 'fixed-upright-right-hand'
        && melee.runtimeRotation === false && melee.authoredAngles === 2 && melee.bakedFrames === 8
        && melee.lossless === '90-degree-turns-and-flips' && melee.uprightSprite === true
        && sameList(melee.arc, ['up', '45-forward', 'level', 'back'])
        && melee.frames === 6 && melee.bodyAttackRow === false
        && sameSet(melee.frameNames, ['wind-up', 'raise', '45-forward', 'level', 'strike', 'recovery'])
        && melee.strikeFrame === 4 && melee.strikeHeldLonger === true
        && melee.swingTypes && melee.swingTypes['overhead-chop'] && melee.swingTypes['side-slash']
        && melee.swingTypes.thrust && melee.swingTypes['two-hand'] && melee.swingTypes['two-hand'].pace === 'heavier-slower'
        && melee.swingTypes['overhead-chop'].bodyFrames === false
        && melee.hitSpark === 'strike-frame' && melee.knockbackPx[0] === 1 && melee.knockbackPx[1] === 2
        && melee.strikeHoldFrames === 12 && melee.otherHoldFrames === 6 && melee.strikeHoldFrames > melee.otherHoldFrames
        && melee.oversizeMin === 1.1 && melee.oversizeMax === 1.2 && melee.scaled === false
        && melee.sample && melee.sample.scaled === false
        && melee.sample.drawnPx >= Math.round(melee.sample.basePx * 1.1) && melee.sample.drawnPx <= Math.round(melee.sample.basePx * 1.2)
        && swingRow && thrustRow && swingRow.bodyDrawn === false && thrustRow.bodyDrawn === false
        && swingRow.frames === 6 && thrustRow.frames === 6 && keptOk
        && manual && manual['39'] && manual['39'].indexOf('PixelLab') !== -1 && manual['39'].indexOf('Retro Diffusion') !== -1
        && noteOk(manual, '35') && noteOk(manual, '39') && categoryOk(standard, 'AS-MELEE-001'));
    out.push(result('AS-MELEE-001', meleeOk ? 'pass' : 'violate', meleeOk ? 'weapon rotation, body still' : 'melee'));

    const pm = a && a.pmDefaults;
    const heights = {
        human: 42, elf: 42, 'half-elf': 42, tiefling: 42, dwarf: 36,
        halfling: 33, gnome: 33, 'half-orc': 44, dragonborn: 44
    };
    let pmOk = !!(pm && pm.ownerMayOverride === true && pm.tinyPx === 24 && pm.smallPx === 36 && pm.mediumPx === 42
        && pm.largeTall && pm.largeTall[0] === 48 && pm.largeTall[1] === 96
        && pm.largeLong && pm.largeLong[0] === 96 && pm.largeLong[1] === 48
        && pm.hugePx === 144 && pm.gargantuanPx === 192
        && pm.footprints && pm.footprints.Tiny && pm.footprints.Tiny.sharesSquare === true
        && pm.footprints.Small.squares === 1 && pm.footprints.Medium.squares === 1
        && pm.footprints.Large.squares[0] === 2 && pm.footprints.Huge.squares[0] === 3
        && pm.footprints.Gargantuan.squares[0] === 4
        && pm.doors && pm.doors.widthTiles === 1 && pm.doors.minHeightLayers === 1.5 && pm.doors.minHeightPx === 72
        && pm.walls === 'whole-layers' && pm.floors === '1-layer'
        && pm.mirror && pm.mirror.westFromEast === true
        && sameSet(pm.mirror.subjects, ['bodies', 'gear-layers', 'creatures'])
        && pm.mirror.weapons === 'hand-anchor' && pm.mirror.shields === 'hand-anchor'
        && pm.mirror.runtimeFlip === false && pm.mirror.asymmetric === 'own-west-view'
        && pm.fortress && pm.fortress.scale === 1 && pm.fortress.minimap === 'colour-coded-tiles' && pm.fortress.downscaleBlur === false
        && pm.rangeMarkers === 'whole-squares' && pm.font && pm.font.count === 1 && pm.font.native === true
        && pm.font.scale === 'whole-pixel' && pm.font.colour === 'damage-type'
        && noteOk(manual, '36') && categoryOk(standard, 'AS-PM-001')
        && Array.isArray(pm.races) && pm.races.length === 9);
    if (pmOk) {
        const seenRace = {};
        for (let i = 0; i < pm.races.length; i++) {
            const row = pm.races[i];
            if (!row || heights[row.id] !== row.px) pmOk = false;
            else if (row.id === 'halfling' || row.id === 'gnome') {
                if (row.min !== 32 || row.max !== 34) pmOk = false;
            }
            seenRace[row.id] = true;
        }
        const ids = Object.keys(heights);
        for (let i = 0; i < ids.length; i++) if (!seenRace[ids[i]]) pmOk = false;
        if (!pm.mirror.samples) pmOk = false;
        else {
            const body = pm.mirror.samples.body;
            const weapon = pm.mirror.samples.weapon;
            const asymmetric = pm.mirror.samples.asymmetricGear;
            if (!body || body.westView !== 'mirror-from-east') pmOk = false;
            if (!weapon || weapon.westView !== 'hand-anchor' || weapon.mirroredOntoHand === true) pmOk = false;
            if (!asymmetric || asymmetric.asymmetric !== true || asymmetric.westView !== 'own') pmOk = false;
        }
    }
    out.push(result('AS-PM-001', pmOk ? 'pass' : 'violate', pmOk ? 'PM defaults, Owner may override' : 'PM defaults'));

    const vis = a && a.visibleGear;
    const sizing = a && a.sizing;
    const kits = a && a.classKits;
    const allowedDrawn = CHARSET_ORDER.concat(KIT_LAYERS, ['weapon', 'shield', 'race-garb']);
    let visOk = !!(vis && sizing && kits && vis.classOutfits === 'none'
        && vis.raceGarbs === 18 && sameList(vis.charsetOrder, CHARSET_ORDER)
        && sameSet(vis.anchored, ['weapon', 'shield', 'held-class-item'])
        && Array.isArray(vis.faceGear) && vis.faceGear.length === 0
        && vis.facesetGear === 'none'
        && sameSet(vis.notDrawn, ['generic-cloak', 'boots', 'gloves', 'belts', 'rings', 'amulets', 'collar', 'class-outfit'])
        && vis.otherGear === 'item-icon-portrait-world-sprite' && vis.childClass === false && vis.childGarb === 'in-child-body'
        && vis.outfitIdsRemain === 'icon-only' && sameSet(vis.armourLayers, ['light', 'medium', 'heavy'])
        && sameSet(vis.deformingKept, ['large-shield', 'bow-draw']) && sameSet(vis.deformingDropped, ['generic-cape'])
        && vis.elderOffsetsApplyTo && sameSet(vis.elderOffsetsApplyTo, ['armour', 'helmet', 'preset-head'])
        && vis.elderBaseBodies === 'race-and-sex' && typeof vis.elderFlag === 'string' && vis.elderFlag.indexOf('18') !== -1
        && noteOk(manual, '37') && noteOk(manual, '40') && noteOk(manual, '41') && noteOk(manual, '42')
        && manual['42'].indexOf('864') !== -1 && manual['42'].indexOf('OWNER_PORTRAIT_STYLE_REF_01') !== -1
        && sizing.adultBaseSheets === 18 && sizing.elderBaseSheets === 18 && sizing.childBaseSheets === 9
        && sizing.baseBodySheets === 45 && sizing.raceGarbDesigns === 18
        && sizing.kitLayers === 14 && sizing.kitBodyTemplates === 18 && sizing.kitSheets === 252
        && sizing.elderKitSheets === 0 && sizing.childKitSheets === 0
        && sizing.heldClassItems === 6 && sizing.heldAuthoredAngles === 2 && sizing.heldBakedFrames === 8
        && sizing.monkIdleFrames === 4 && sizing.monkIdleDirections === 4 && sizing.monkIdleCells === 288
        && sizing.armourSheets === 81 && sizing.helmetSheets === 81
        && sizing.elderArmourExtraSheets === 0 && sizing.retiredClassGarbDesigns === 108 && sizing.retiredClassGarbSheets === 324
        && sizing.presetLooks === 216 && sizing.presetPaletteSwapSheets === 0
        && sizing.presetCharsetHeads === 216 && sizing.presetFacesetBaseSheets === 216
        && sizing.faceLayerSheets === 0 && sizing.portraitSeparateGenerationPresets === 216
        && sizing.portraitPaletteSwapPresets === 0 && sizing.portraitVariantSheets === 648
        && sizing.presetFacesetSheets === 864 && sizing.expressionCells === 6912
        && sizing.portraitSourceImages === 864 && sizing.portraitExpressionPasses === 6048
        && sizing.portraitGenerationCalls === 6912
        && sizing.droppedMeleeBodyCells === 48 && sizing.cellsPerFullSheet === 660
        && sizing.cellsPerFullSheet === (layout && layout.cellsPerFullSheet)
        && Array.isArray(a.sizingManifest) && a.sizingManifest.length >= 18
        && Array.isArray(vis.layerSamples) && Array.isArray(standard.outfitMatrix)
        && categoryOk(standard, 'AS-VIS-001') && categoryOk(standard, 'AS-GENE-001'));
    if (visOk) {
        const layers = kits.layers || [];
        visOk = layers.length === 14 && sameSet(layers.map(row => row && row.id), KIT_LAYERS);
        const kitClass = {};
        for (let i = 0; i < layers.length; i++) {
            const row = layers[i];
            if (!row || !row.classId || !row.group) visOk = false;
            else kitClass[row.classId] = true;
            if (row && MARTIAL_CLASSES.indexOf(row.classId) !== -1) visOk = false;
        }
        if (MARTIAL_CLASSES.some(id => kitClass[id])) visOk = false;
        if (!kits.monk || kits.monk.heldItem !== false || kits.monk.idleFrames !== 4 || kits.monk.topknot !== 'head-overlay') visOk = false;
        if (!kits.headwear || kits.headwear.oneSlot !== true || kits.headwear.sorcerer !== 'bare') visOk = false;
        const held = kits.held || [];
        visOk = visOk && held.length === 6 && sameSet(held.map(row => row && row.id), HELD_ITEMS);
        for (let i = 0; i < held.length; i++) {
            const row = held[i];
            if (!row || row.authoredAngles !== 2 || row.bakedFrames !== 8 || row.runtimeRotation !== false) visOk = false;
        }
        const lute = held.filter(row => row && row.id === 'bard-lute')[0];
        const orb = held.filter(row => row && row.id === 'warlock-orb')[0];
        if (!lute || lute.mount !== 'back-slung' || !orb || orb.anchor !== 'offset') visOk = false;
        const accents = kits.accents || [];
        const ground = colourValue('#333B45');
        const usedClass = {};
        if (accents.length !== standard.classes.length) visOk = false;
        for (let i = 0; i < accents.length; i++) {
            const row = accents[i];
            if (!row || standard.classes.indexOf(row.classId) === -1 || usedClass[row.classId]) visOk = false;
            else usedClass[row.classId] = true;
            if (!row || !set.has(row.hex) || row.colourOnly !== false || row.secondChannel !== 'silhouette') visOk = false;
            const value = row && colourValue(row.hex);
            if (value === null || value !== row.value || Math.abs(value - ground) < 3) visOk = false;
        }
        for (let i = 0; i < accents.length; i++) {
            for (let j = i + 1; j < accents.length; j++) {
                if (accents[i].hex === accents[j].hex) visOk = false;
                else if (accents[i].value === accents[j].value && redGreenPair(accents[i].hex, accents[j].hex)) visOk = false;
            }
        }
        const flags = standard.slotMap && standard.slotMap.asymmetricGear;
        const needPiece = { 'kit-wizard-hat': 1, 'kit-bard-cap': 1, 'kit-warlock-cloak': 1 };
        if (!Array.isArray(flags)) visOk = false;
        else {
            for (let i = 0; i < flags.length; i++) {
                const flag = flags[i];
                if (!flag || flag.asymmetric !== true || !needPiece[flag.piece]) visOk = false;
                else if (!ID_GRAMMAR['charset-layer'] || !new RegExp(ID_GRAMMAR['charset-layer']).test(flag.id)) visOk = false;
                else delete needPiece[flag.piece];
            }
            if (Object.keys(needPiece).length) visOk = false;
        }
        for (let i = 0; i < vis.layerSamples.length; i++) {
            const row = vis.layerSamples[i];
            if (!row) visOk = false;
            else if (row.drawn === true && allowedDrawn.indexOf(row.layer) === -1) visOk = false;
            else if (vis.notDrawn.indexOf(row.layer) !== -1 && row.drawn !== false) visOk = false;
        }
        for (let i = 0; i < standard.outfitMatrix.length; i++) {
            const row = standard.outfitMatrix[i];
            if (!row || !Array.isArray(row.drawnDeforming)) visOk = false;
            else if (String(row.outfitId || '').indexOf('outfit_class_') === 0) visOk = false;
            else if (String(row.outfitId || '').indexOf('outfit_armor_') === 0 && row.spriteDraw !== 'armour-layer') visOk = false;
        }
        const outfitList = standard.outfits || [];
        for (let i = 0; i < outfitList.length; i++) {
            const row = outfitList[i];
            if (row && row.kind === 'class' && (row.spriteDraw !== 'none' || row.requiredArtVariants !== 0)) visOk = false;
        }
        const face = vis.faceSample;
        if (!face || face.completeImage !== true || face.builtFromLayers !== false || face.raceBackground !== 'in-composition') visOk = false;
        if (!face || faceHasLayers(face) || face.expressions !== 8) visOk = false;
        if (!face || !face.cell || face.cell[0] !== 144 || face.cell[1] !== 144) visOk = false;
        if (!face || !face.sheet || face.sheet[0] !== 576 || face.sheet[1] !== 288) visOk = false;
        if (!face || !Array.isArray(face.gearKinds) || face.gearKinds.length !== 0) visOk = false;
        const retiredFace = standard.slotMap && standard.slotMap.retiredIds;
        if (!Array.isArray(retiredFace) || RETIRED_FACE_LAYER_IDS.some(id => retiredFace.indexOf(id) === -1)) visOk = false;
        const faceSlots = (standard.slotMap.grammarSamples || []).filter(sample => sample && sample.category === 'face');
        if (!faceSlots.length || faceSlots.some(sample => String(sample.id || '').indexOf('FA.PRESET.') !== 0)) visOk = false;
        const faceLayers = standard.faceLayers;
        if (!faceLayers || Array.isArray(faceLayers) || faceLayers.status !== 'retired') visOk = false;
        const presetRow = (a.sizingManifest || []).filter(row => row && row.id === 'PRESET')[0];
        if (!presetRow || presetRow.builtFromLayers !== false || presetRow.faceLayerSheets !== 0 || presetRow.facesetSheets !== 864) visOk = false;
    }
    out.push(result('AS-VIS-001', visOk ? 'pass' : 'violate', visOk ? 'race garb and class kits' : 'visible gear'));
    return out;
}

function collectGlobals(standard, spells, schema, creatures) {
    const out = [];
    out.push.apply(out, checkMatrix(standard.outfitMatrix, standard));
    out.push.apply(out, checkLife(standard.bodyTemplates));
    const entries = spells && spells.entries ? spells.entries : spells;
    out.push.apply(out, checkSummons(entries, standard.summons, standard.summonDerivation));
    const examples = schema && schema.examples ? schema.examples : [];
    for (const ex of examples) out.push.apply(out, checkSpellTable(ex, schema, standard));
    out.push.apply(out, checkMap(standard.banners, standard));
    out.push.apply(out, checkProps(standard.readableProps, standard));
    out.push.apply(out, checkNight(standard.night));
    out.push.apply(out, checkRemains(standard.remains, standard));
    out.push.apply(out, checkSkins(standard.uiSkins, standard));
    out.push.apply(out, checkReligion(standard.religion));
    out.push.apply(out, checkFarm(standard.farming));
    out.push.apply(out, checkFood(standard.food));
    out.push.apply(out, checkClosed('AS-DUNG-001', standard.dungeonKit, ['cave-wall', 'mine-support', 'tunnel', 'underground-water', 'crystal', 'ruin'], 'dungeon kit'));
    out.push.apply(out, checkClosed('AS-TRAP-001', standard.traps, ['pit', 'spikes', 'pressure-plate', 'door-locked', 'door-broken', 'poison-gas', 'web', 'quicksand'], 'traps'));
    out.push.apply(out, checkClosed('AS-LORE-001', standard.loreVisuals, ['historical-portrait', 'era-ruin', 'artifact', 'history-log'], 'lore'));
    out.push.apply(out, checkClosed('AS-ZONE-001', standard.designations, ['dig', 'build', 'stockpile', 'route', 'blueprint-ghost'], 'designations'));
    out.push.apply(out, checkScenes(standard.eventScenes));
    out.push.apply(out, checkMarketing(standard.marketing));
    out.push.apply(out, checkTame(standard.domestication));
    out.push.apply(out, checkVariety(standard.variety, standard));
    out.push.apply(out, checkGenes(standard.genes, standard));
    out.push.apply(out, checkPortrait(standard.portraitSample, standard));
    out.push.apply(out, checkHeadLayer(standard.headGrid.sample));
    out.push.apply(out, checkHeadLayer(standard.headGrid.longHairSample));
    out.push.apply(out, checkBodyAnchors(standard.elderReuse.frames, standard));
    out.push.apply(out, checkElder(standard.elderReuse, standard));
    out.push.apply(out, checkGear(standard.gearPolicy.rows));
    out.push.apply(out, checkPoses(standard));
    out.push.apply(out, checkSheet(standard.sheetSample, standard));
    out.push.apply(out, checkSheet(standard.actionRowSample, standard));
    out.push.apply(out, checkAtlas(standard.runtimeAtlas));
    out.push.apply(out, checkPipeline(standard.pipelineSample));
    out.push.apply(out, checkPromptTemplates(standard.promptSpecTemplates));
    out.push.apply(out, checkGenerationLog(standard.generationLogSample, standard.generationLog));
    out.push.apply(out, checkYield(standard.yieldSample));
    out.push.apply(out, checkPromptVersion(standard.promptVersionSample));
    out.push.apply(out, checkGenerators(standard));
    out.push.apply(out, checkSourcePolicy(standard));
    out.push.apply(out, checkRepoPolicy(standard.repoStorage));
    out.push.apply(out, checkOwnerPreview(standard.ownerPreview));
    out.push.apply(out, checkGeneratorCap(standard.generatorRoster, standard.layeredSets));
    out.push.apply(out, checkSexedBodies(standard.sexedBodies, standard));
    out.push.apply(out, checkCreatureSex(standard.creatureSex, creatures));
    out.push.apply(out, checkSlotIds(standard.slotMap, standard));
    out.push.apply(out, checkAnchorAlignment(standard.anchorTool));
    out.push.apply(out, checkEquipmentAnchors(standard));
    out.push.apply(out, checkA9c(standard));
    return out;
}

function run(opts) {
    const standard = readJson(opts.standard);
    const catalogue = readJson(opts.catalogue);
    const schema = readJson(opts.spellSchema);
    const spells = readJson(opts.spells);
    const creatures = readJson(opts.creatures);
    let entries = catalogue.entries || [];
    if (opts.category) entries = entries.filter(e => e.category === opts.category);
    const perEntry = entries.map(e => checkEntry(e, standard));
    const globals = collectGlobals(standard, spells, schema, creatures);
    const registryPaths = opts.biomeRegistries && opts.biomeRegistries.length ? opts.biomeRegistries : [
        path.join(ROOT, 'game', 'data', 'DEUS_BiomeRegistry.json'),
        path.join(ROOT, 'docs', 'art', 'DEUS_BiomeRegistry.json')
    ];
    for (let i = 0; i < registryPaths.length; i++) {
        let doc = null;
        try { doc = readJson(registryPaths[i]); }
        catch (e) { doc = null; }
        globals.push.apply(globals, checkBiomeRegistry(doc, standard, registryPaths[i]));
    }
    globals.push.apply(globals, checkCatalogueBiomes(catalogue, standard));
    const summary = summarize(perEntry, globals);
    const violations = summary.totals.violate + summary.globalViolations;
    return { summary, perEntry, violations };
}

function parseArgs(argv) {
    const opts = {
        json: false,
        strict: false,
        category: '',
        standard: path.join(ROOT, 'game', 'data', 'UF_AssetStandard.json'),
        catalogue: path.join(ROOT, 'art', 'catalogue', 'catalogue.json'),
        spellSchema: path.join(ROOT, 'game', 'data', 'UF_SpellVisualTable.schema.json'),
        spells: path.join(ROOT, 'game', 'data', 'srd51', 'spells.json'),
        creatures: path.join(ROOT, 'game', 'data', 'srd51', 'creatures.json'),
        biomeRegistries: []
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--json') opts.json = true;
        else if (a === '--strict') opts.strict = true;
        else if (a === '--category') opts.category = argv[++i];
        else if (a === '--standard') opts.standard = argv[++i];
        else if (a === '--catalogue') opts.catalogue = argv[++i];
        else if (a === '--spell-schema') opts.spellSchema = argv[++i];
        else if (a === '--spells') opts.spells = argv[++i];
        else if (a === '--creatures') opts.creatures = argv[++i];
        else if (a === '--biome-registry') opts.biomeRegistries.push(argv[++i]);
        else throw new Error('unknown argument ' + a);
    }
    return opts;
}

function printReport(payload, asJson) {
    if (asJson) {
        const compact = payload.perEntry.map(e => ({
            id: e.id,
            category: e.category,
            status: entryStatus(e.results),
            violations: e.results.filter(r => r.result === 'violate').map(r => ({ ruleId: r.ruleId, reason: r.reason })),
            unknown: e.results.filter(r => r.result === 'unknown').map(r => r.ruleId)
        }));
        process.stdout.write(JSON.stringify({ summary: payload.summary, entries: compact }) + '\n');
        return;
    }
    const t = payload.summary.totals;
    console.log('entries ' + t.entries + ' pass ' + t.pass + ' violate ' + t.violate + ' unknown ' + t.unknown);
    const cats = Object.keys(payload.summary.byCategory).sort();
    for (const c of cats) {
        const row = payload.summary.byCategory[c];
        console.log('category ' + c + ' entries ' + row.entries + ' pass ' + row.pass + ' violate ' + row.violate + ' unknown ' + row.unknown);
    }
    console.log('rule-results pass ' + payload.summary.rules.pass + ' violate ' + payload.summary.rules.violate + ' unknown ' + payload.summary.rules.unknown);
    console.log('global-violations ' + payload.summary.globalViolations);
    for (const g of payload.summary.globals) console.log('global ' + g.result + ' ' + g.ruleId + ' ' + g.reason);
}

function main(argv, hooks) {
    let opts;
    try { opts = parseArgs(argv); }
    catch (e) {
        console.error(e.message);
        if (hooks && hooks.noExit) return 2;
        process.exit(2);
    }
    let payload;
    try { payload = run(opts); }
    catch (e) {
        console.error(e && e.stack ? e.stack : e);
        if (hooks && hooks.noExit) return 2;
        process.exit(2);
    }
    printReport(payload, opts.json);
    const code = opts.strict && (payload.violations > 0) ? 1 : 0;
    if (hooks && hooks.noExit) return code;
    process.exit(code);
}

module.exports = {
    checkEntry, checkLayer, checkFace, checkItem, checkIcon, checkNode, checkRemains,
    checkHaul, checkVehicles, checkNight, checkName, checkUi, checkMap, checkProps,
    checkSummons, checkMatrix, checkLife, checkSpellTable, schemaErrors, spellMatches,
    animationResult, collectGlobals, run, main, readJson, clone, entryStatus,
    checkSkins, checkReligion, checkFarm, checkFood, checkClosed, checkScenes, checkMarketing,
    checkTame, checkVariety, checkGenes, checkPortrait, checkHeadLayer, checkBodyAnchors,
    checkElder, checkGear, checkMirror, checkPoses, checkBiomeRegistry, checkCatalogueBiomes,
    checkSheet, checkAtlas, checkPipeline, checkPromptTemplates, checkGenerationLog, checkYield,
    checkPromptVersion, checkGenerators, sizeResult,
    checkSourceSheet, checkSourcePolicy, checkRepoPolicy, checkOwnerPreview, checkGeneratorCap,
    checkSexedBodies, checkCreatureSex, checkSlotIds, checkAnchorAlignment, checkEquipmentAnchors,
    checkA9c, colourValue, viewTextOk, viewDocOk,
    ID_GRAMMAR, DIR_TOKENS, RMMZ_NATIVE, PAPER_DOLL, SOURCE_CAP, DIMORPHIC_SRD, DIMORPHIC_LIVESTOCK,
    GEN_CATEGORIES, EXAMPLE_SLOT_ID, EXAMPLE_SHEET_ID, EXAMPLE_SHEET_FILE, ANCHOR_REJECT,
    ANCHOR_LANDMARKS, ANCHOR_DETECTION
};

if (require.main === module) main(process.argv.slice(2));
