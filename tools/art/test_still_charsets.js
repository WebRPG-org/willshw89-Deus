#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('../png_read');
const { execSync } = require('child_process');
const { parseLedger } = require('./validate_art');

const charsetsDir = path.join(__dirname, '../../game/img/characters');
const approvedDir = path.join(__dirname, '../../art/approved');
const catalogue = JSON.parse(fs.readFileSync(path.join(__dirname, '../../art/catalogue/catalogue.json'), 'utf8'));
const mapping = JSON.parse(fs.readFileSync(path.join(__dirname, 'still_charsets.json'), 'utf8'));

function getSha256(buf) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buf).digest('hex');
}

// Size exceptions (DEC-016 amendment, Owner 2026-10-01: "I will solve size mismatches when I see them in the game"). An entry listed
// here is accepted although its drawn size misses its catalogue slot or envelope: validate_art may refuse it ONLY with the listed
// codes. Any other refusal (alpha, palette, template, approval) still fails. Because validate_art stops at the first refusal, an
// exception entry's alpha and palette are checked here directly. The sheet and sidecar then follow the mapping's frame (and its
// optional "anchor") instead of the catalogue slot.
const SIZE_EXCEPTIONS = {
    'SURFACE_SHARED_TREE_FRUIT-TREE_B-V1_DEFAULT': ['DIMS_MISMATCH', 'SCALE_OUT_OF_ENVELOPE'],       // drawn 95x98, frame 96x144
    'SURFACE_SHARED_TREE_FRUIT-TREE-BARE_B-V1_DEFAULT': ['DIMS_MISMATCH', 'SCALE_OUT_OF_ENVELOPE'],  // drawn 94x98, frame 96x144
    'SURFACE_SHARED_FLORA_FLOWERS_B-V1_DEFAULT': ['SCALE_OUT_OF_ENVELOPE'],                          // 21 tall, envelope 20
    'SURFACE_SHARED_FLORA_FLOWERS-PURPLE_B-V1_DEFAULT': ['SCALE_OUT_OF_ENVELOPE'],
    'SURFACE_SHARED_FLORA_FLOWERS-BLUE_B-V1_DEFAULT': ['SCALE_OUT_OF_ENVELOPE'],
    'SURFACE_SHARED_FLORA_GRASS-TUFT_B-V4_DEFAULT': ['SCALE_OUT_OF_ENVELOPE']                         // 19 tall, envelope minimum 20
};

function paletteSet() {
    const hex = fs.readFileSync(path.join(__dirname, '../../art/palette/deus_master_world_palette_v1.hex'), 'utf8');
    return new Set(hex.split(/\r?\n/).map(s => s.trim().replace(/^#/, '').toLowerCase()).filter(s => /^[0-9a-f]{6}$/.test(s)));
}

// Alpha is 0 or 255 and every opaque colour is in the master palette (what validate_art checks after its size checks).
function pixelProblems(png, palette) {
    let semi = 0, off = 0;
    for (let i = 0; i < png.width * png.height; i++) {
        const a = png.data[i * 4 + 3];
        if (a !== 0 && a !== 255) semi++;
        if (a === 255) {
            const h = [0, 1, 2].map(k => png.data[i * 4 + k].toString(16).padStart(2, '0')).join('');
            if (!palette.has(h)) off++;
        }
    }
    return { semi, off };
}

function check() {
    let failures = 0;
    const fail = (msg) => { console.error("FAIL:", msg); failures++; };

    // 2. every master in the mapping has a YEA ledger row for its entry id
    const approvalsText = fs.readFileSync(path.join(__dirname, '../../art/APPROVALS.md'), 'utf8');
    const ledger = parseLedger(approvalsText, 'art/APPROVALS.md');
    const checkedMasters = new Set();
    
    for (const item of mapping) {
        const entries = item.isV8 ? item.entries : [item.entryId];
        for (const entryId of entries) {
            const masterPath = path.join(approvedDir, entryId + '.png');
            const buf = fs.readFileSync(masterPath);
            const sha = getSha256(buf);
            
            const yeaRow = ledger.rows.find(r => r.decision === 'YEA' && r.sha256 === sha && r.ids.includes(entryId));
            if (!yeaRow) {
                fail(`No YEA ledger row for master ${entryId} with sha256 ${sha}`);
            }
            checkedMasters.add(entryId);
        }
    }
    
    // 3. validate_art ACCEPTS every master (a size exception may be refused only with its listed codes)
    const os = require('os');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'still-charsets-templates-'));
    const palette = paletteSet();
    try {
        execSync(`node tools/art/make_blank_templates.js --catalogue art/catalogue/catalogue.json --out "${tempDir}"`, { cwd: path.join(__dirname, '../../'), stdio: 'pipe' });
    } catch (e) {}

    for (const entryId of checkedMasters) {
        try {
            execSync(`node tools/art/validate_art.js art/approved/${entryId}.png --entry ${entryId} --catalogue art/catalogue/catalogue.json --approvals art/APPROVALS.md --templates "${tempDir}"`, { cwd: path.join(__dirname, '../../'), stdio: 'pipe' });
        } catch (e) {
            const text = e.stdout.toString() + e.stderr.toString();
            const codes = [...text.matchAll(/^REFUSE ([A-Z_]+)/gm)].map(m => m[1]);
            const allowed = SIZE_EXCEPTIONS[entryId];
            if (allowed && codes.length && codes.every(c => allowed.includes(c))) {
                const p = pixelProblems(decodePNG(fs.readFileSync(path.join(approvedDir, entryId + '.png'))), palette);
                if (p.semi || p.off) fail(`size exception ${entryId}: ${p.semi} semi-transparent and ${p.off} off-palette pixel(s)`);
                else console.log(`NOTE: size exception ${entryId}: validate_art refused ${codes.join(', ')} (allowed, DEC-016 amendment); alpha and palette checked directly`);
            } else {
                fail(`validate_art rejected ${entryId}:\n` + text);
            }
        }
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    // 1, 4, 5, 7. Sheets and Sidecars
    for (const item of mapping) {
        const sheetPath = path.join(charsetsDir, item.sprite + '.png');
        if (!fs.existsSync(sheetPath)) { fail(`Sheet ${sheetPath} missing`); continue; }
        const sheetImg = decodePNG(fs.readFileSync(sheetPath));
        
        const sidecarPath = path.join(charsetsDir, item.sprite + '.json');
        if (!fs.existsSync(sidecarPath)) { fail(`Sidecar ${sidecarPath} missing`); continue; }
        const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
        
        const fw = item.frameWidth, fh = item.frameHeight;
        
        // 5. Sidecar properties
        const repEntry = catalogue.entries.find(e => e.id === (item.isV8 ? item.entries[0] : item.entryId));
        // A size exception follows the mapping's frame and optional anchor; every other entry follows the catalogue slot and anchor.
        const exc = !item.isV8 && SIZE_EXCEPTIONS[item.entryId];
        const wantW = exc ? item.frameWidth : repEntry.slot.w, wantH = exc ? item.frameHeight : repEntry.slot.h;
        const wantAnchor = exc && item.anchor ? item.anchor : [repEntry.anchor.x, repEntry.anchor.y];
        if (sidecar.frameWidth !== wantW) fail(`Sidecar frameWidth ${sidecar.frameWidth} != slot w ${wantW}`);
        if (sidecar.frameHeight !== wantH) fail(`Sidecar frameHeight ${sidecar.frameHeight} != slot h ${wantH}`);
        if (sidecar.anchor[0] !== wantAnchor[0] || sidecar.anchor[1] !== wantAnchor[1]) fail(`Sidecar anchor [${sidecar.anchor}] != expected anchor [${wantAnchor}]`);
        
        // 4. Sheet size
        if (item.isV8) {
            if (sheetImg.width !== fw * 12 || sheetImg.height !== fh * 8) fail(`V8 sheet ${item.sprite} size ${sheetImg.width}x${sheetImg.height} is not ${fw*12}x${fh*8}`);
            
            // 7. tuft V8 sheet holds only the three tuft masters, and all three are present
            const presentEntries = new Set();
            for (let blockIndex = 0; blockIndex < 8; blockIndex++) {
                const entryId = item.entries[blockIndex % item.entries.length];
                presentEntries.add(entryId);
                
                const masterImg = decodePNG(fs.readFileSync(path.join(approvedDir, entryId + '.png')));
                
                const blockStartX = (blockIndex % 4) * 3 * fw;
                const blockStartY = Math.floor(blockIndex / 4) * 4 * fh;
                
                // Check all cells in block (4 rows x 3 cols)
                let matches = true;
                for (let y = 0; y < 4 * fh && matches; y++) {
                    for (let x = 0; x < 3 * fw && matches; x++) {
                        const mIdx = ((y % fh) * fw + (x % fw)) * 4;
                        const sIdx = ((blockStartY + y) * sheetImg.width + blockStartX + x) * 4;
                        if (masterImg.data[mIdx] !== sheetImg.data[sIdx] ||
                            masterImg.data[mIdx+1] !== sheetImg.data[sIdx+1] ||
                            masterImg.data[mIdx+2] !== sheetImg.data[sIdx+2] ||
                            masterImg.data[mIdx+3] !== sheetImg.data[sIdx+3]) {
                            matches = false;
                        }
                    }
                }
                if (!matches) fail(`V8 Block ${blockIndex} of ${item.sprite} does not match master ${entryId}`);
            }
            if (presentEntries.size !== item.entries.length) fail(`V8 sheet ${item.sprite} does not contain all entries`);
            
        } else {
            if (sheetImg.width !== fw * 3 || sheetImg.height !== fh * 4) fail(`$ sheet ${item.sprite} size ${sheetImg.width}x${sheetImg.height} is not ${fw*3}x${fh*4}`);
            
            const masterImg = decodePNG(fs.readFileSync(path.join(approvedDir, item.entryId + '.png')));
            let matches = true;
            for (let y = 0; y < 4 * fh && matches; y++) {
                for (let x = 0; x < 3 * fw && matches; x++) {
                    const mIdx = ((y % fh) * fw + (x % fw)) * 4;
                    const sIdx = (y * sheetImg.width + x) * 4;
                    if (masterImg.data[mIdx] !== sheetImg.data[sIdx] ||
                        masterImg.data[mIdx+1] !== sheetImg.data[sIdx+1] ||
                        masterImg.data[mIdx+2] !== sheetImg.data[sIdx+2] ||
                        masterImg.data[mIdx+3] !== sheetImg.data[sIdx+3]) {
                        matches = false;
                    }
                }
            }
            if (!matches) fail(`Sheet ${item.sprite} does not match master ${item.entryId}`);
        }
    }
    
    // 6. Tree becomes own stump
    const worldCatalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../../game/data/DEUS_WorldCatalog.json'), 'utf8'));
    const treeToStump = {
        oak: 'oak_stump',
        tree_swamp: 'swamp_stump',
        dead_tree: 'dead_stump',
        birch: 'birch_stump',
        pine: 'pine_stump',
        fruit_tree: 'fruit_stump',
        fruit_tree_bare: 'fruit_stump'
    };
    
    for (const [treeId, stumpId] of Object.entries(treeToStump)) {
        const treeObj = worldCatalog.objects.find(o => o.id === treeId);
        if (!treeObj) { fail(`Tree ${treeId} not found in catalog`); continue; }
        if (!treeObj.actions || !treeObj.actions.chop || treeObj.actions.chop.becomes !== stumpId) {
            fail(`Tree ${treeId} does not become ${stumpId}`);
        }
        
        const stumpObj = worldCatalog.objects.find(o => o.id === stumpId);
        if (!stumpObj) { fail(`Stump ${stumpId} not found in catalog`); continue; }
        const stumpSprite = path.join(charsetsDir, stumpObj.image + '.png');
        if (!fs.existsSync(stumpSprite)) fail(`Stump sprite ${stumpSprite} does not exist`);
    }
    
    // 8. every mapped sprite is drawn by a world object; the sapling points at its new sprite and no tile (DEUS_Objects frameFor draws tile first)
    for (const item of mapping) {
        if (!worldCatalog.objects.some(o => o.image === item.sprite)) fail(`No world object uses ${item.sprite}`);
    }
    const sapling = worldCatalog.objects.find(o => o.id === 'sapling');
    if (!sapling || sapling.image !== '!$UF_Sapling' || sapling.tile) fail('the sapling object must use image !$UF_Sapling and no tile');

    if (failures > 0) {
        console.error(`${failures} check(s) failed.`);
        process.exit(1);
    } else {
        console.log("All checks passed.");
    }
}

check();
