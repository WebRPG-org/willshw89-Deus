const fs = require('fs');
const path = require('path');
const { readPNG } = require('../png_read.js');
const { writePNG } = require('../png_util.js');

const ROOT = path.join(__dirname, '..', '..');
const STAGING = path.join(ROOT, 'art', 'staging', 'racial_banners');
const DEST_DIR = path.join(ROOT, 'game', 'img', 'characters');

const RACES = [
    { id: 'dragonborn', name: 'Dragonborn', title: 'Dragonborn War Banner' },
    { id: 'dwarf', name: 'Dwarf', title: 'Dwarven War Banner' },
    { id: 'elf', name: 'Elf', title: 'Elven War Banner' },
    { id: 'gnome', name: 'Gnome', title: 'Gnomish War Banner' },
    { id: 'halfling', name: 'Halfling', title: 'Halfling War Banner' },
    { id: 'half_elf', name: 'Half_Elf', title: 'Half-Elven War Banner' },
    { id: 'half_orc', name: 'Half_Orc', title: 'Half-Orc War Banner' },
    { id: 'human', name: 'Human', title: 'Human War Banner' },
    { id: 'tiefling', name: 'Tiefling', title: 'Tiefling War Banner' }
];

const FRAME_W = 48;
const FRAME_H = 96;
const SHEET_COLS = 3;
const SHEET_ROWS = 4;
const SHEET_W = FRAME_W * SHEET_COLS; // 144
const SHEET_H = FRAME_H * SHEET_ROWS; // 384

// Crop center 48x96 from a 96x96 image
function cropCenter48x96(srcImg) {
    const out = Buffer.alloc(FRAME_W * FRAME_H * 4);
    const startX = 24; // center 48 from 96: 24..71
    for (let y = 0; y < FRAME_H; y++) {
        for (let x = 0; x < FRAME_W; x++) {
            const srcIdx = (y * srcImg.width + (startX + x)) * 4;
            const dstIdx = (y * FRAME_W + x) * 4;
            out[dstIdx] = srcImg.data[srcIdx];
            out[dstIdx + 1] = srcImg.data[srcIdx + 1];
            out[dstIdx + 2] = srcImg.data[srcIdx + 2];
            out[dstIdx + 3] = srcImg.data[srcIdx + 3];
        }
    }
    return out;
}

// Blit a 48x96 frame onto sheet at col, row
function blitFrame(sheetBuf, frameBuf, col, row) {
    const startX = col * FRAME_W;
    const startY = row * FRAME_H;
    for (let y = 0; y < FRAME_H; y++) {
        for (let x = 0; x < FRAME_W; x++) {
            const srcIdx = (y * FRAME_W + x) * 4;
            const dstIdx = ((startY + y) * SHEET_W + (startX + x)) * 4;
            sheetBuf[dstIdx] = frameBuf[srcIdx];
            sheetBuf[dstIdx + 1] = frameBuf[srcIdx + 1];
            sheetBuf[dstIdx + 2] = frameBuf[srcIdx + 2];
            sheetBuf[dstIdx + 3] = frameBuf[srcIdx + 3];
        }
    }
}

console.log('Assembling 9 racial banners into 144x384 character sheets...');

for (const race of RACES) {
    const rotDir = path.join(STAGING, race.id, 'extracted', 'Idle', 'rotations');
    const southPath = path.join(rotDir, 'south.png');
    const westPath = path.join(rotDir, 'west.png');
    const eastPath = path.join(rotDir, 'east.png');
    const northPath = path.join(rotDir, 'north.png');

    if (!fs.existsSync(southPath)) {
        console.error(`Missing rotations for ${race.id} at ${rotDir}`);
        continue;
    }

    const southImg = readPNG(southPath);
    const westImg = readPNG(westPath);
    const eastImg = readPNG(eastPath);
    const northImg = readPNG(northPath);

    const southFrame = cropCenter48x96(southImg);
    const westFrame = cropCenter48x96(westImg);
    const eastFrame = cropCenter48x96(eastImg);
    const northFrame = cropCenter48x96(northImg);

    const sheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4);

    // Row 0 (Down/South)
    for (let c = 0; c < SHEET_COLS; c++) blitFrame(sheetBuf, southFrame, c, 0);
    // Row 1 (Left/West)
    for (let c = 0; c < SHEET_COLS; c++) blitFrame(sheetBuf, westFrame, c, 1);
    // Row 2 (Right/East)
    for (let c = 0; c < SHEET_COLS; c++) blitFrame(sheetBuf, eastFrame, c, 2);
    // Row 3 (Up/North)
    for (let c = 0; c < SHEET_COLS; c++) blitFrame(sheetBuf, northFrame, c, 3);

    const destPngName = `!$UF_Banner_${race.name}.png`;
    const destJsonName = `!$UF_Banner_${race.name}.json`;
    const destPngPath = path.join(DEST_DIR, destPngName);
    const destJsonPath = path.join(DEST_DIR, destJsonName);

    writePNG(destPngPath, SHEET_W, SHEET_H, sheetBuf);

    const sidecar = {
        frameWidth: FRAME_W,
        frameHeight: FRAME_H,
        anchor: [24, 96],
        cellWidth: 48,
        cellHeight: 96,
        race: race.id,
        title: race.title,
        isBanner: true,
        isObjectCharacter: true
    };
    fs.writeFileSync(destJsonPath, JSON.stringify(sidecar, null, 2));

    console.log(`Delivered ${destPngName} (144x384) + sidecar for ${race.title}`);
}
