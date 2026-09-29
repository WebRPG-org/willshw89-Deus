const fs = require('fs');
const path = require('path');
const { readPNG } = require('../png_read.js');
const { writePNG } = require('../png_util.js');

const ROOT = path.join(__dirname, '..', '..');
const STAGING = path.join(ROOT, 'art', 'staging', 'batch_10_items');
const DEST_DIR = path.join(ROOT, 'game', 'img', 'characters');

const ITEMS = [
    { file: 'bread_loaf.png', id: 'bread_loaf', sheet: '!$UF_Item_BreadLoaf', name: 'Loaf of Bread' },
    { file: 'campfire.png', id: 'campfire', sheet: '!$UF_Item_Campfire', name: 'Campfire' },
    { file: 'firewood.png', id: 'firewood', sheet: '!$UF_Item_Firewood', name: 'Firewood' },
    { file: 'meat_cooked.png', id: 'meat_cooked', sheet: '!$UF_Item_MeatCooked', name: 'Cooked Meat' },
    { file: 'meat_raw.png', id: 'meat_raw', sheet: '!$UF_Item_MeatRaw', name: 'Raw Meat' },
    { file: 'ore_copper.png', id: 'ore_copper', sheet: '!$UF_Item_OreCopper', name: 'Copper Ore' },
    { file: 'ore_iron.png', id: 'ore_iron', sheet: '!$UF_Item_OreIron', name: 'Iron Ore' },
    { file: 'stone_axe.png', id: 'stone_axe', sheet: '!$UF_Item_StoneAxe', name: 'Stone Axe' },
    { file: 'stone_knife.png', id: 'stone_knife', sheet: '!$UF_Item_StoneKnife', name: 'Stone Knife' },
    { file: 'stone_pick.png', id: 'stone_pick', sheet: '!$UF_Item_StonePick', name: 'Stone Pickaxe' }
];

const FRAME_W = 48;
const FRAME_H = 48;
const SHEET_COLS = 3;
const SHEET_ROWS = 4;
const SHEET_W = FRAME_W * SHEET_COLS; // 144
const SHEET_H = FRAME_H * SHEET_ROWS; // 192

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

async function assemble() {
    console.log(`Assembling 10 PixelLab items into RMMZ character sheets...`);
    for (const it of ITEMS) {
        const srcPath = path.join(STAGING, it.file);
        if (!fs.existsSync(srcPath)) {
            console.error(`Missing source: ${srcPath}`);
            continue;
        }

        const srcImg = await readPNG(srcPath);
        if (srcImg.width !== 48 || srcImg.height !== 48) {
            console.error(`Unexpected dimensions ${srcImg.width}x${srcImg.height} for ${it.file}`);
            continue;
        }

        const sheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4);
        // Fill all 12 cells (3 cols x 4 rows)
        for (let row = 0; row < SHEET_ROWS; row++) {
            for (let col = 0; col < SHEET_COLS; col++) {
                blitFrame(sheetBuf, srcImg.data, col, row);
            }
        }

        const destPng = path.join(DEST_DIR, `${it.sheet}.png`);
        const destJson = path.join(DEST_DIR, `${it.sheet}.json`);

        await writePNG(destPng, SHEET_W, SHEET_H, sheetBuf);

        const sidecar = {
            id: it.sheet.replace(/^!\$/, ''),
            name: it.name,
            frameWidth: 48,
            frameHeight: 48,
            anchor: [24, 47],
            footprint: [1, 1],
            facings: ["S"],
            animations: {
                stand: [1]
            },
            layer: "item",
            source: "PixelLab original 16-bit pixel art (48x48)"
        };

        fs.writeFileSync(destJson, JSON.stringify(sidecar, null, 2) + '\n');
        console.log(`Delivered: ${it.sheet}.png + .json`);
    }
    console.log(`All 10 items assembled successfully!`);
}

assemble().catch(err => {
    console.error(err);
    process.exit(1);
});
