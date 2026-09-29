#!/usr/bin/env node
'use strict';

/**
 * tools/art/assemble_v8_sheet.js
 *
 * Compiles 8 static 48x48 pixel art frames into a single 576x384 px 8-character
 * RPG Maker MZ sheet (!UF_<Asset>_V8.png) for STATIC_VARIANT_8 or STATIC_ORIENTED_8.
 *
 * Each of the 8 character blocks (144x192 px) has its 48x48 frame duplicated across
 * all 12 cells (3 columns x 4 rows), ensuring the prop's appearance is visually invariant
 * under any direction or animation triggers in RMMZ.
 *
 * Dependency-free: uses tools/png_read.js and tools/png_util.js.
 */

const fs = require('fs');
const path = require('path');
const { readPNG, decodePNG } = require('../png_read');
const { writePNG } = require('../png_util');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_PALETTE_PATH = path.join(REPO_ROOT, 'art', 'palette', 'deus_master_world_palette_v1.hex');

const SHEET_WIDTH = 576;
const SHEET_HEIGHT = 384;
const BLOCK_WIDTH = 144;
const BLOCK_HEIGHT = 192;
const CELL_WIDTH = 48;
const CELL_HEIGHT = 48;
const COLS_PER_BLOCK = 3;
const ROWS_PER_BLOCK = 4;
const TOTAL_VARIANTS = 8;

function loadPalette(palettePath) {
    const raw = fs.readFileSync(palettePath, 'utf8').trim().split(/\r?\n/);
    const colors = [];
    const hexSet = new Set();
    for (const line of raw) {
        const t = line.trim().toUpperCase();
        if (/^#[0-9A-F]{6}$/.test(t)) {
            hexSet.add(t);
            colors.push({
                hex: t,
                r: parseInt(t.slice(1, 3), 16),
                g: parseInt(t.slice(3, 5), 16),
                b: parseInt(t.slice(5, 7), 16)
            });
        }
    }
    return { colors, hexSet };
}

function snapRgb(r, g, b, paletteColors) {
    let bestDist = Infinity;
    let best = paletteColors[0];
    for (let i = 0; i < paletteColors.length; i++) {
        const c = paletteColors[i];
        const dr = r - c.r;
        const dg = g - c.g;
        const db = b - c.b;
        // Weighted perceptual Euclidean distance (2*R^2 + 4*G^2 + 3*B^2)
        const dist = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
        if (dist < bestDist) {
            bestDist = dist;
            best = c;
            if (dist === 0) break;
        }
    }
    return best;
}

/**
 * Process a single 48x48 frame:
 * - Validates dimensions
 * - Anchors to ground (y=47) if requested
 * - Snaps to master palette
 * - Enforces binary alpha
 */
function processFrame(img, palette, anchorGround = true) {
    if (img.width !== CELL_WIDTH || img.height !== CELL_HEIGHT) {
        throw new Error(`Frame dimension mismatch: expected ${CELL_WIDTH}x${CELL_HEIGHT}, got ${img.width}x${img.height}`);
    }

    // Find bounding box for ground anchoring
    let maxY = -1;
    for (let y = 0; y < CELL_HEIGHT; y++) {
        for (let x = 0; x < CELL_WIDTH; x++) {
            const a = img.data[(CELL_WIDTH * y + x) * 4 + 3];
            if (a > 127) {
                if (y > maxY) maxY = y;
            }
        }
    }

    const shiftY = (anchorGround && maxY >= 0 && maxY < 47) ? (47 - maxY) : 0;
    const processed = Buffer.alloc(CELL_WIDTH * CELL_HEIGHT * 4);

    for (let y = 0; y < CELL_HEIGHT; y++) {
        for (let x = 0; x < CELL_WIDTH; x++) {
            const srcY = y - shiftY;
            const destIdx = (CELL_WIDTH * y + x) * 4;
            if (srcY >= 0 && srcY < CELL_HEIGHT) {
                const srcIdx = (CELL_WIDTH * srcY + x) * 4;
                const a = img.data[srcIdx + 3];
                if (a > 127) {
                    const r = img.data[srcIdx];
                    const g = img.data[srcIdx + 1];
                    const b = img.data[srcIdx + 2];
                    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
                    let finalR = r, finalG = g, finalB = b;
                    if (!palette.hexSet.has(hex)) {
                        const sn = snapRgb(r, g, b, palette.colors);
                        finalR = sn.r;
                        finalG = sn.g;
                        finalB = sn.b;
                    }
                    processed[destIdx] = finalR;
                    processed[destIdx + 1] = finalG;
                    processed[destIdx + 2] = finalB;
                    processed[destIdx + 3] = 255;
                } else {
                    processed[destIdx + 3] = 0;
                }
            } else {
                processed[destIdx + 3] = 0;
            }
        }
    }

    return processed;
}

/**
 * Compiles 8 frames into a 576x384 sheet buffer.
 */
function assembleV8Buffer(frameBuffers) {
    if (frameBuffers.length !== TOTAL_VARIANTS) {
        throw new Error(`Expected exactly ${TOTAL_VARIANTS} frames, got ${frameBuffers.length}`);
    }

    const sheetBuf = Buffer.alloc(SHEET_WIDTH * SHEET_HEIGHT * 4);

    for (let varIdx = 0; varIdx < TOTAL_VARIANTS; varIdx++) {
        const frame = frameBuffers[varIdx];
        const blockCol = varIdx % 4;
        const blockRow = Math.floor(varIdx / 4);
        const blockOriginX = blockCol * BLOCK_WIDTH;
        const blockOriginY = blockRow * BLOCK_HEIGHT;

        // Stamp frame into all 12 cells of this character block
        for (let cellRow = 0; cellRow < ROWS_PER_BLOCK; cellRow++) {
            for (let cellCol = 0; cellCol < COLS_PER_BLOCK; cellCol++) {
                const cellOriginX = blockOriginX + cellCol * CELL_WIDTH;
                const cellOriginY = blockOriginY + cellRow * CELL_HEIGHT;

                for (let py = 0; py < CELL_HEIGHT; py++) {
                    for (let px = 0; px < CELL_WIDTH; px++) {
                        const srcIdx = (CELL_WIDTH * py + px) * 4;
                        const destX = cellOriginX + px;
                        const destY = cellOriginY + py;
                        const destIdx = (SHEET_WIDTH * destY + destX) * 4;

                        sheetBuf[destIdx] = frame[srcIdx];
                        sheetBuf[destIdx + 1] = frame[srcIdx + 1];
                        sheetBuf[destIdx + 2] = frame[srcIdx + 2];
                        sheetBuf[destIdx + 3] = frame[srcIdx + 3];
                    }
                }
            }
        }
    }

    return sheetBuf;
}

/**
 * Main assemble pipeline
 */
function assembleV8Sheet(opts) {
    const {
        inputFrames,      // Array of 8 paths or Buffers
        outPng,           // Output PNG path
        outJson,          // Output JSON sidecar path (optional)
        palettePath = DEFAULT_PALETTE_PATH,
        anchorGround = true,
        topologyClass = 'STATIC_VARIANT_8',
        assetName = path.basename(outPng, '.png'),
        provenance = []
    } = opts;

    if (!inputFrames || inputFrames.length !== TOTAL_VARIANTS) {
        throw new Error(`assembleV8Sheet requires 8 input frames, got ${inputFrames ? inputFrames.length : 0}`);
    }

    const palette = loadPalette(palettePath);
    const processedFrames = [];

    for (let i = 0; i < TOTAL_VARIANTS; i++) {
        const item = inputFrames[i];
        let img;
        if (typeof item === 'string') {
            img = readPNG(item);
        } else if (Buffer.isBuffer(item)) {
            if (item.length === CELL_WIDTH * CELL_HEIGHT * 4) {
                img = { width: CELL_WIDTH, height: CELL_HEIGHT, data: item };
            } else {
                img = decodePNG(item);
            }
        } else if (item.data && item.width) {
            img = item;
        } else {
            throw new Error(`Invalid frame input at index ${i}`);
        }
        processedFrames.push(processFrame(img, palette, anchorGround));
    }

    const sheetBuffer = assembleV8Buffer(processedFrames);

    // Ensure output directories exist
    fs.mkdirSync(path.dirname(outPng), { recursive: true });
    writePNG(outPng, SHEET_WIDTH, SHEET_HEIGHT, sheetBuffer);

    let sidecar = null;
    if (outJson) {
        fs.mkdirSync(path.dirname(outJson), { recursive: true });
        sidecar = {
            sheet: path.basename(outPng),
            width: SHEET_WIDTH,
            height: SHEET_HEIGHT,
            characterCount: TOTAL_VARIANTS,
            blockWidth: BLOCK_WIDTH,
            blockHeight: BLOCK_HEIGHT,
            cellWidth: CELL_WIDTH,
            cellHeight: CELL_HEIGHT,
            cellsPerCharacter: COLS_PER_BLOCK * ROWS_PER_BLOCK,
            topologyClass,
            rmmzConfig: {
                isObjectCharacter: true,
                shiftY: 0,
                directionFix: true,
                walkAnime: false,
                stepAnime: false
            },
            variants: processedFrames.map((_, idx) => ({
                index: idx,
                sourceMaster: typeof inputFrames[idx] === 'string' ? path.relative(REPO_ROOT, inputFrames[idx]).replace(/\\/g, '/') : null,
                provenance: provenance[idx] || null
            }))
        };
        fs.writeFileSync(outJson, JSON.stringify(sidecar, null, 2) + '\n', 'utf8');
    }

    return { sheetBuffer, processedFrames, sidecar };
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    let inputs = null;
    let outPng = null;
    let outJson = null;
    let palettePath = DEFAULT_PALETTE_PATH;
    let topologyClass = 'STATIC_VARIANT_8';

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--inputs' && args[i + 1]) {
            inputs = args[++i].split(',').map(s => s.trim());
        } else if (args[i] === '--out-png' && args[i + 1]) {
            outPng = args[++i];
        } else if (args[i] === '--out-json' && args[i + 1]) {
            outJson = args[++i];
        } else if (args[i] === '--palette' && args[i + 1]) {
            palettePath = args[++i];
        } else if (args[i] === '--topology' && args[i + 1]) {
            topologyClass = args[++i];
        }
    }

    if (!inputs || !outPng) {
        console.error('Usage: node tools/art/assemble_v8_sheet.js --inputs <f0,f1,...,f7> --out-png <sheet.png> [--out-json <sidecar.json>] [--palette <pal.hex>] [--topology <STATIC_VARIANT_8|STATIC_ORIENTED_8>]');
        process.exit(1);
    }

    try {
        assembleV8Sheet({ inputFrames: inputs, outPng, outJson, palettePath, topologyClass });
        console.log(`Successfully compiled V8 sheet -> ${outPng}`);
        if (outJson) console.log(`Wrote sidecar -> ${outJson}`);
    } catch (e) {
        console.error('Error assembling sheet:', e.message);
        process.exit(1);
    }
}

module.exports = {
    assembleV8Sheet,
    assembleV8Buffer,
    processFrame,
    loadPalette,
    SHEET_WIDTH,
    SHEET_HEIGHT,
    BLOCK_WIDTH,
    BLOCK_HEIGHT,
    CELL_WIDTH,
    CELL_HEIGHT,
    TOTAL_VARIANTS
};
