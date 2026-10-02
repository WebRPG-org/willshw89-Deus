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
    
    // 3. validate_art ACCEPTS every master
    const tempDir = path.join(__dirname, 'temp_templates');
    try {
        execSync(`node tools/art/make_blank_templates.js --catalogue art/catalogue/catalogue.json --out tools/art/temp_templates`, { cwd: path.join(__dirname, '../../'), stdio: 'pipe' });
    } catch (e) {}
    
    for (const entryId of checkedMasters) {
        try {
            execSync(`node tools/art/validate_art.js art/approved/${entryId}.png --entry ${entryId} --catalogue art/catalogue/catalogue.json --approvals art/APPROVALS.md --templates tools/art/temp_templates`, { cwd: path.join(__dirname, '../../'), stdio: 'pipe' });
        } catch (e) {
            fail(`validate_art rejected ${entryId}:\n` + e.stdout.toString() + e.stderr.toString());
        }
    }
    
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
        if (sidecar.frameWidth !== repEntry.slot.w) fail(`Sidecar frameWidth ${sidecar.frameWidth} != slot w ${repEntry.slot.w}`);
        if (sidecar.frameHeight !== repEntry.slot.h) fail(`Sidecar frameHeight ${sidecar.frameHeight} != slot h ${repEntry.slot.h}`);
        if (sidecar.anchor[0] !== repEntry.anchor.x || sidecar.anchor[1] !== repEntry.anchor.y) fail(`Sidecar anchor [${sidecar.anchor}] != catalogue anchor [${repEntry.anchor.x},${repEntry.anchor.y}]`);
        
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
    
    if (failures > 0) {
        console.error(`${failures} check(s) failed.`);
        process.exit(1);
    } else {
        console.log("All checks passed.");
    }
}

check();
