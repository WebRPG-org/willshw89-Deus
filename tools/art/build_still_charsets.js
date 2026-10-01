#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { decodePNG } = require('../png_read');
const { writePNG } = require('../png_util');

const catalogue = JSON.parse(fs.readFileSync(path.join(__dirname, '../../art/catalogue/catalogue.json'), 'utf8'));
const mapping = JSON.parse(fs.readFileSync(path.join(__dirname, 'still_charsets.json'), 'utf8'));
const approvals = fs.readFileSync(path.join(__dirname, '../../art/APPROVALS.md'), 'utf8');

const approvedDir = path.join(__dirname, '../../art/approved');
const charsetsDir = path.join(__dirname, '../../game/img/characters');

function getSha256(filePath) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function buildSheet() {
    for (const item of mapping) {
        if (item.isV8) {
            const fw = item.frameWidth, fh = item.frameHeight;
            const sheetW = fw * 12;
            const sheetH = fh * 8;
            const outBuf = Buffer.alloc(sheetW * sheetH * 4);
            
            for (let blockIndex = 0; blockIndex < 8; blockIndex++) {
                const entryId = item.entries[blockIndex % item.entries.length];
                const masterPath = path.join(approvedDir, entryId + '.png');
                const masterImg = decodePNG(fs.readFileSync(masterPath));
                if (masterImg.width !== fw || masterImg.height !== fh) {
                    console.error(`Master ${entryId} dimensions ${masterImg.width}x${masterImg.height} do not match mapping ${fw}x${fh}`);
                    process.exit(1);
                }
                
                const blockStartX = (blockIndex % 4) * 3 * fw;
                const blockStartY = Math.floor(blockIndex / 4) * 4 * fh;
                
                for (let cellY = 0; cellY < 4; cellY++) {
                    for (let cellX = 0; cellX < 3; cellX++) {
                        const cellStartX = blockStartX + cellX * fw;
                        const cellStartY = blockStartY + cellY * fh;
                        
                        for (let y = 0; y < fh; y++) {
                            for (let x = 0; x < fw; x++) {
                                const masterIdx = (y * fw + x) * 4;
                                const outIdx = ((cellStartY + y) * sheetW + cellStartX + x) * 4;
                                outBuf[outIdx] = masterImg.data[masterIdx];
                                outBuf[outIdx+1] = masterImg.data[masterIdx+1];
                                outBuf[outIdx+2] = masterImg.data[masterIdx+2];
                                outBuf[outIdx+3] = masterImg.data[masterIdx+3];
                            }
                        }
                    }
                }
            }
            writePNG(path.join(charsetsDir, item.sprite + '.png'), sheetW, sheetH, outBuf);
            
            // For V8, the sidecar may need to be slightly different, but the brief says "The sidecar keeps the existing...". We can base it on the first entry.
            writeSidecar(item, item.entries[0], getSha256(path.join(approvedDir, item.entries[0] + '.png')));
            
        } else {
            const fw = item.frameWidth, fh = item.frameHeight;
            const sheetW = fw * 3;
            const sheetH = fh * 4;
            const outBuf = Buffer.alloc(sheetW * sheetH * 4);
            
            const masterPath = path.join(approvedDir, item.entryId + '.png');
            const masterImg = decodePNG(fs.readFileSync(masterPath));
            if (masterImg.width !== fw || masterImg.height !== fh) {
                console.error(`Master ${item.entryId} dimensions ${masterImg.width}x${masterImg.height} do not match mapping ${fw}x${fh}`);
                process.exit(1);
            }
            
            for (let cellY = 0; cellY < 4; cellY++) {
                for (let cellX = 0; cellX < 3; cellX++) {
                    const cellStartX = cellX * fw;
                    const cellStartY = cellY * fh;
                    
                    for (let y = 0; y < fh; y++) {
                        for (let x = 0; x < fw; x++) {
                            const masterIdx = (y * fw + x) * 4;
                            const outIdx = ((cellStartY + y) * sheetW + cellStartX + x) * 4;
                            outBuf[outIdx] = masterImg.data[masterIdx];
                            outBuf[outIdx+1] = masterImg.data[masterIdx+1];
                            outBuf[outIdx+2] = masterImg.data[masterIdx+2];
                            outBuf[outIdx+3] = masterImg.data[masterIdx+3];
                        }
                    }
                }
            }
            writePNG(path.join(charsetsDir, item.sprite + '.png'), sheetW, sheetH, outBuf);
            writeSidecar(item, item.entryId, getSha256(masterPath));
        }
    }
}

function writeSidecar(item, repEntryId, masterSha256) {
    const sidecarPath = path.join(charsetsDir, item.sprite + '.json');
    let oldSidecar = {};
    if (fs.existsSync(sidecarPath)) {
        oldSidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
    }
    
    const entry = catalogue.entries.find(e => e.id === repEntryId);
    
    let id = item.sprite;
    if (id.startsWith('!$')) id = id.slice(2);
    else if (id.startsWith('!')) id = id.slice(1);
    if (id.endsWith('_V8')) id = id.slice(0, -3); // Just in case, usually sidecars match filename without extension, but internal `id` might not have _V8. Or maybe they do. Let's keep `oldSidecar.id`.
    
    const sidecar = {
        id: oldSidecar.id || id,
        name: oldSidecar.name || (oldSidecar.id || id),
        frameWidth: item.frameWidth,
        frameHeight: item.frameHeight,
        anchor: [entry.anchor.x, entry.anchor.y],
        footprint: oldSidecar.footprint || (entry.footprint ? [entry.footprint.w, entry.footprint.h] : [1, 1]),
        passable: oldSidecar.passable !== undefined ? oldSidecar.passable : false,
        under: oldSidecar.under !== undefined ? oldSidecar.under : false,
        facings: oldSidecar.facings || ["S"],
        animations: { stand: [1] },
        generator: "PixelLab (PM, DEC-063)",
        standard: "RMMZ reference, Ultima VII style (DEC-063)",
        master: `art/approved/${repEntryId}.png`,
        masterSha256: masterSha256
    };
    
    // Copy missing things if needed
    if (oldSidecar.frameMs !== undefined) sidecar.frameMs = oldSidecar.frameMs;
    
    fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2) + "\n");
}

buildSheet();
console.log("Done building still charsets.");
