#!/usr/bin/env node
'use strict';

/**
 * tools/art/build_art_review_board.js
 *
 * Implements Owner Directive: DEUS — ARTISTIC CONSISTENCY REQUIREMENT §5
 * "MAKE CONSISTENCY VISIBLE TO THE REVIEWER"
 *
 * Generates a unified review board image containing:
 * A. All 8 candidate variants at native 48x48 resolution.
 * B. Nearest-neighbor enlarged (2x, 96x96) views for pixel/facet inspection.
 * C. Approved reference benchmarks (Scale Character, Ground Terrain, Geology Ref, Loose Item Ref).
 * D. Composed World Scene Preview: candidate variants placed on live game terrain beside the scale character.
 *
 * Dependency-free: uses tools/png_read.js and tools/png_util.js.
 */

const fs = require('fs');
const path = require('path');
const { readPNG } = require('../png_read');
const { writePNG } = require('../png_util');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const LANE_CD_ROOT = 'C:/Users/snewt/.deus_worktrees/lane-cd';

function resolveRefPath(relPath) {
    const p1 = path.join(REPO_ROOT, relPath);
    if (fs.existsSync(p1)) return p1;
    const p2 = path.join(LANE_CD_ROOT, relPath);
    if (fs.existsSync(p2)) return p2;
    return p1;
}

// Default canonical approved reference paths
const DEFAULT_REFS = {
    terrain: resolveRefPath(path.join('game', 'img', 'tilesets', 'Outside_A2.png')),
    character: resolveRefPath(path.join('game', 'img', 'characters', '$UF_Stock_Actor1_0.png')),
    boulder: resolveRefPath(path.join('art', 'masters', 'source_sets', 'SURFACE_SHARED_STONE_GRANITE-BOULDER_V1_DEFAULT', 'variant_0.png')),
    rocks: resolveRefPath(path.join('art', 'masters', 'source_sets', 'ALL_SHARED_STONE_ROCKS-SMALL_V1_DEFAULT', 'variant_0.png'))
};

// Canvas drawing helper
class BoardCanvas {
    constructor(width, height, bg = [24, 24, 30, 255]) {
        this.width = width;
        this.height = height;
        this.data = Buffer.alloc(width * height * 4);
        for (let i = 0; i < width * height; i++) {
            this.data[i * 4 + 0] = bg[0];
            this.data[i * 4 + 1] = bg[1];
            this.data[i * 4 + 2] = bg[2];
            this.data[i * 4 + 3] = bg[3];
        }
    }

    drawPixel(x, y, r, g, b, a) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        if (a === 0) return;
        const idx = (y * this.width + x) * 4;
        if (a === 255) {
            this.data[idx] = r;
            this.data[idx + 1] = g;
            this.data[idx + 2] = b;
            this.data[idx + 3] = 255;
        } else {
            const alpha = a / 255;
            const inv = 1 - alpha;
            this.data[idx] = Math.round(r * alpha + this.data[idx] * inv);
            this.data[idx + 1] = Math.round(g * alpha + this.data[idx + 1] * inv);
            this.data[idx + 2] = Math.round(b * alpha + this.data[idx + 2] * inv);
            this.data[idx + 3] = 255;
        }
    }

    drawSubImage(img, srcX, srcY, srcW, srcH, destX, destY, scale = 1) {
        for (let dy = 0; dy < srcH; dy++) {
            for (let dx = 0; dx < srcW; dx++) {
                const sx = srcX + dx;
                const sy = srcY + dy;
                if (sx >= img.width || sy >= img.height) continue;
                const [r, g, b, a] = img.px(sx, sy);
                if (a === 0) continue;
                for (let py = 0; py < scale; py++) {
                    for (let px = 0; px < scale; px++) {
                        this.drawPixel(destX + dx * scale + px, destY + dy * scale + py, r, g, b, a);
                    }
                }
            }
        }
    }

    drawRect(x, y, w, h, color) {
        for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
                this.drawPixel(x + px, y + py, color[0], color[1], color[2], color[3] || 255);
            }
        }
    }

    drawBorder(x, y, w, h, color) {
        for (let px = 0; px < w; px++) {
            this.drawPixel(x + px, y, color[0], color[1], color[2], 255);
            this.drawPixel(x + px, y + h - 1, color[0], color[1], color[2], 255);
        }
        for (let py = 0; py < h; py++) {
            this.drawPixel(x, y + py, color[0], color[1], color[2], 255);
            this.drawPixel(x + w - 1, y + py, color[0], color[1], color[2], 255);
        }
    }
}

function buildReviewBoard(variantDir, outputPath, options = {}) {
    // 1. Load candidate variants 0..7
    const variants = [];
    for (let i = 0; i < 8; i++) {
        const vPath = path.join(variantDir, `variant_${i}.png`);
        if (!fs.existsSync(vPath)) {
            throw new Error(`Missing variant file: ${vPath}`);
        }
        variants.push(readPNG(vPath));
    }

    // 2. Load approved references
    const terrainImg = readPNG(options.terrain || DEFAULT_REFS.terrain);
    // Outside_A2 has 48x48 grass at top-left (0, 0, 48, 48)
    const charImg = readPNG(options.character || DEFAULT_REFS.character);
    // Actor character: first facing south cell is at 0, 0, 48, 48
    let boulderImg = null;
    let rocksImg = null;
    if (fs.existsSync(DEFAULT_REFS.boulder)) {
        boulderImg = readPNG(DEFAULT_REFS.boulder);
    }
    if (fs.existsSync(DEFAULT_REFS.rocks)) {
        rocksImg = readPNG(DEFAULT_REFS.rocks);
    }

    // Board layout:
    // Width: 800 px
    // Height:
    // - Header & Category References: y = 0..64 (height 64)
    // - Section A: Native 48x48 variants 0..7: y = 70..130 (height 60)
    // - Section B: 2x Zoom (96x96) variants 0..7: y = 140..350 (height 210, 2 rows of 4)
    // - Section C: Composed World Scene Preview: y = 360..520 (height 160)
    // Total Height: 540 px
    const BOARD_W = 800;
    const BOARD_H = 540;
    const board = new BoardCanvas(BOARD_W, BOARD_H, [18, 18, 22, 255]);

    // Section 1: Header & Category References (y = 8)
    // Reference 1: Terrain Tile
    board.drawBorder(20, 8, 50, 50, [60, 60, 75]);
    board.drawSubImage(terrainImg, 0, 0, 48, 48, 21, 9, 1);

    // Reference 2: Scale Character
    board.drawBorder(80, 8, 50, 50, [60, 60, 75]);
    board.drawSubImage(charImg, 0, 0, 48, 48, 81, 9, 1);

    // Reference 3: Approved Stone (Granite)
    if (boulderImg) {
        board.drawBorder(140, 8, 50, 50, [60, 60, 75]);
        board.drawSubImage(boulderImg, 0, 0, 48, 48, 141, 9, 1);
    }

    // Reference 4: Approved Loose Stone
    if (rocksImg) {
        board.drawBorder(200, 8, 50, 50, [60, 60, 75]);
        board.drawSubImage(rocksImg, 0, 0, 48, 48, 201, 9, 1);
    }

    // Section A: Native 48x48 Variants (y = 70)
    const nativeStartY = 70;
    for (let i = 0; i < 8; i++) {
        const nx = 20 + i * 95;
        board.drawBorder(nx, nativeStartY, 50, 50, [70, 70, 90]);
        // Checkerboard / subtle background inside box to check alpha
        for (let cy = 0; cy < 48; cy += 8) {
            for (let cx = 0; cx < 48; cx += 8) {
                const c = ((cx / 8 + cy / 8) % 2 === 0) ? [28, 28, 34] : [36, 36, 44];
                board.drawRect(nx + 1 + cx, nativeStartY + 1 + cy, 8, 8, c);
            }
        }
        board.drawSubImage(variants[i], 0, 0, 48, 48, nx + 1, nativeStartY + 1, 1);
    }

    // Section B: 2x Nearest-Neighbor Enlarged Views (y = 135)
    // Row 0: variants 0..3, Row 1: variants 4..7
    for (let i = 0; i < 8; i++) {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const zx = 20 + col * 190;
        const zy = 135 + row * 105;
        board.drawBorder(zx, zy, 98, 98, [80, 80, 100]);
        for (let cy = 0; cy < 96; cy += 12) {
            for (let cx = 0; cx < 96; cx += 12) {
                const c = ((cx / 12 + cy / 12) % 2 === 0) ? [28, 28, 34] : [36, 36, 44];
                board.drawRect(zx + 1 + cx, zy + 1 + cy, 12, 12, c);
            }
        }
        board.drawSubImage(variants[i], 0, 0, 48, 48, zx + 1, zy + 1, 2);
    }

    // Section C: Composed World Scene Preview (y = 360)
    // 16 tiles wide x 3 tiles high = 768 x 144 px
    const sceneX = 16;
    const sceneY = 360;
    board.drawBorder(sceneX - 1, sceneY - 1, 768 + 2, 144 + 2, [100, 110, 130]);
    // 1. Fill scene with terrain tiles
    for (let ty = 0; ty < 3; ty++) {
        for (let tx = 0; tx < 16; tx++) {
            board.drawSubImage(terrainImg, 0, 0, 48, 48, sceneX + tx * 48, sceneY + ty * 48, 1);
        }
    }

    // 2. Place Scale Character on tile (1, 1)
    board.drawSubImage(charImg, 0, 0, 48, 48, sceneX + 1 * 48, sceneY + 1 * 48, 1);

    // 3. Place Approved Reference Boulder on tile (3, 1)
    if (boulderImg) {
        board.drawSubImage(boulderImg, 0, 0, 48, 48, sceneX + 3 * 48, sceneY + 1 * 48, 1);
    }

    // 4. Place Candidate Variants 0..7 across tiles 5..12 on middle row (y=1) or alternating
    for (let i = 0; i < 8; i++) {
        const tx = 5 + i;
        const ty = 1 + (i % 2 === 0 ? 0 : 0); // row 1
        board.drawSubImage(variants[i], 0, 0, 48, 48, sceneX + tx * 48, sceneY + ty * 48, 1);
    }

    // 5. Place Loose Stones Reference on tile (14, 1)
    if (rocksImg) {
        board.drawSubImage(rocksImg, 0, 0, 48, 48, sceneX + 14 * 48, sceneY + 1 * 48, 1);
    }

    // Write review board image
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    writePNG(outputPath, BOARD_W, BOARD_H, board.data);
    return { width: BOARD_W, height: BOARD_H, outputPath };
}

module.exports = { buildReviewBoard };

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node build_art_review_board.js <variantDir> <outputPath>');
        process.exit(1);
    }
    const res = buildReviewBoard(args[0], args[1]);
    console.log(`Generated review board: ${res.outputPath} (${res.width}x${res.height})`);
}
