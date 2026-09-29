#!/usr/bin/env node
'use strict';

/**
 * tools/art/build_retro_boards.js
 *
 * Generates the 5 retro 8x8 review boards for inducted V8 sets
 * per PM Directive 0157-C:
 * "Build 8x8 boards for them, 8 sets per board (5 boards),
 * to art/staging/boards/retro_<n>_board.png, and list them in the next outbox report."
 *
 * Layout matches PM standard review board (1612x1206 px):
 * - 8 rows per board
 * - Columns 0..7: 3x scaled variants (144x144 cells, 150px pitch) with ground bar
 * - Right side: 1:1 scale strip (48x48 cells, 50px pitch) with ground bar
 */

const fs = require('fs');
const path = require('path');
const { readPNG } = require('../png_read');
const { writePNG } = require('../png_util');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(REPO_ROOT, 'art', 'staging', 'boards');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 5 Boards of 8 sets each (40 total inducted assets)
const BOARDS = [
    {
        name: 'retro_1_board.png',
        title: 'Retro Board 1: Surface Flora & Bushes',
        sets: [
            '!UF_BerryBush_V8.png',
            '!UF_BerryBushBare_V8.png',
            '!UF_DesertShrub_V8.png',
            '!UF_Fern_V8.png',
            '!UF_FlowersBlue_V8.png',
            '!UF_FlowersPurple_V8.png',
            '!UF_FlowersWhite_V8.png',
            '!UF_Flowers_V8.png'
        ]
    },
    {
        name: 'retro_2_board.png',
        title: 'Retro Board 2: Grass, Wetland & Underworld Flora',
        sets: [
            '!UF_GrassTuft_V8.png',
            '!UF_LilyPad_V8.png',
            '!UF_Reeds_V8.png',
            '!UF_SnowBush_V8.png',
            '!UF_ForestMushrooms_V8.png',
            '!UF_GlowCaps_V8.png',
            '!UF_WildWheat_V8.png',
            '!UF_WildHemp_V8.png'
        ]
    },
    {
        name: 'retro_3_board.png',
        title: 'Retro Board 3: Wild Crops, Trees & Remains',
        sets: [
            '!UF_WildHerbs_V8.png',
            '!UF_WildRoots_V8.png',
            '!UF_Sapling_V8.png',
            '!UF_TreeStump_V8.png',
            '!UF_FallenLog_V8.png',
            '!UF_BonesPile_V8.png',
            '!UF_Rubble_V8.png',
            '!UF_PeatMound_V8.png'
        ]
    },
    {
        name: 'retro_4_board.png',
        title: 'Retro Board 4: Rocks, Soils & Minerals',
        sets: [
            '!UF_GraniteBoulder_V8.png',
            '!UF_RocksSmall_V8.png',
            '!UF_Gravel_V8.png',
            '!UF_SandDeposit_V8.png',
            '!UF_ClayDeposit_V8.png',
            '!UF_Stalagmite_V8.png',
            '!UF_Crystal_V8.png',
            '!UF_CrystalSmall_V8.png'
        ]
    },
    {
        name: 'retro_5_board.png',
        title: 'Retro Board 5: Ores, Crystals & Structures',
        sets: [
            '!UF_CopperOutcrop_V8.png',
            '!UF_GoldOutcrop_V8.png',
            '!UF_IronOutcrop_V8.png',
            '!UF_SilverOutcrop_V8.png',
            '!UF_TinOutcrop_V8.png',
            '!UF_CoalOutcrop_V8.png',
            '!UF_SulfurCrust_V8.png',
            '!UF_Hearth_V8.png'
        ]
    }
];

const BOARD_W = 1612;
const BOARD_H = 1206;
const BG_COLOR = [43, 47, 51, 255];
const GROUND_COLOR = [79, 107, 58, 255];

class BoardCanvas {
    constructor(w, h, bg = BG_COLOR) {
        this.width = w;
        this.height = h;
        this.data = Buffer.alloc(w * h * 4);
        for (let i = 0; i < w * h; i++) {
            this.data[i * 4 + 0] = bg[0];
            this.data[i * 4 + 1] = bg[1];
            this.data[i * 4 + 2] = bg[2];
            this.data[i * 4 + 3] = bg[3];
        }
    }

    setPixel(x, y, r, g, b, a = 255) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        const idx = (y * this.width + x) * 4;
        this.data[idx + 0] = r;
        this.data[idx + 1] = g;
        this.data[idx + 2] = b;
        this.data[idx + 3] = a;
    }

    fillRect(x, y, w, h, color) {
        for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
                this.setPixel(x + dx, y + dy, color[0], color[1], color[2], color[3] || 255);
            }
        }
    }
}

function extractVariantsFromV8(sheetImg) {
    const variants = [];
    for (let i = 0; i < 8; i++) {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const originX = col * 144;
        const originY = row * 192;
        const frameBuf = Buffer.alloc(48 * 48 * 4);
        for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
                const [r, g, b, a] = sheetImg.px(originX + x, originY + y);
                const destIdx = (y * 48 + x) * 4;
                frameBuf[destIdx + 0] = r;
                frameBuf[destIdx + 1] = g;
                frameBuf[destIdx + 2] = b;
                frameBuf[destIdx + 3] = a;
            }
        }
        variants.push(frameBuf);
    }
    return variants;
}

function buildSingleBoard(boardDef) {
    console.log(`Building ${boardDef.name}: ${boardDef.title}...`);
    const canvas = new BoardCanvas(BOARD_W, BOARD_H);

    for (let r = 0; r < boardDef.sets.length; r++) {
        const sheetFilename = boardDef.sets[r];
        const sheetPath = path.join(REPO_ROOT, 'game', 'img', 'characters', sheetFilename);
        if (!fs.existsSync(sheetPath)) {
            console.warn(`WARNING: File not found: ${sheetPath}`);
            continue;
        }

        const sheetImg = readPNG(sheetPath);
        const variants = extractVariantsFromV8(sheetImg);

        for (let c = 0; c < 8; c++) {
            const frame = variants[c];

            // 1. Draw 3x cell
            const cell3xX = 6 + c * 150;
            const cell3xY = 6 + r * 150;

            // Draw ground bar (height 12 px, from y = 138 to 149)
            canvas.fillRect(cell3xX, cell3xY + 132, 144, 12, GROUND_COLOR);

            // Draw scaled 3x sprite
            for (let dy = 0; dy < 48; dy++) {
                for (let dx = 0; dx < 48; dx++) {
                    const srcIdx = (dy * 48 + dx) * 4;
                    const a = frame[srcIdx + 3];
                    if (a > 127) {
                        const rVal = frame[srcIdx + 0];
                        const gVal = frame[srcIdx + 1];
                        const bVal = frame[srcIdx + 2];
                        for (let sy = 0; sy < 3; sy++) {
                            for (let sx = 0; sx < 3; sx++) {
                                canvas.setPixel(cell3xX + dx * 3 + sx, cell3xY + dy * 3 + sy, rVal, gVal, bVal, 255);
                            }
                        }
                    }
                }
            }

            // 2. Draw 1:1 strip cell
            const cell1xX = 1206 + c * 50;
            const cell1xY = 6 + r * 150;

            // Draw ground bar (height 4 px, from y = 44 to 47)
            canvas.fillRect(cell1xX, cell1xY + 44, 48, 4, GROUND_COLOR);

            // Draw 1x sprite
            for (let dy = 0; dy < 48; dy++) {
                for (let dx = 0; dx < 48; dx++) {
                    const srcIdx = (dy * 48 + dx) * 4;
                    const a = frame[srcIdx + 3];
                    if (a > 127) {
                        canvas.setPixel(cell1xX + dx, cell1xY + dy, frame[srcIdx + 0], frame[srcIdx + 1], frame[srcIdx + 2], 255);
                    }
                }
            }
        }
    }

    const outPath = path.join(OUTPUT_DIR, boardDef.name);
    writePNG(outPath, BOARD_W, BOARD_H, canvas.data);
    console.log(`Saved ${outPath} (${BOARD_W}x${BOARD_H})`);
}

function main() {
    for (const b of BOARDS) {
        buildSingleBoard(b);
    }
    console.log('All 5 retro review boards built successfully.');
}

main();
