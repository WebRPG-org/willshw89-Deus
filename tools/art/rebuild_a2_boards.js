'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readPNG } = require('../png_read');
const { writePNG } = require('../png_util');

const ROOT = path.resolve(__dirname, '../..');
const REGISTRY_FILE = 'C:/Users/snewt/DEUS_backups/pixellab_2026-09-30/qa_pass_objects.json';
const OUT_DIR = path.join(ROOT, 'tasks', 'PRUNE', 'readonly', 'A2_boards');

if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Simple 3x5 bitmap font for ASCII digits and letters
const FONT_3X5 = {
    '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [7, 1, 7, 4, 7], '3': [7, 1, 7, 1, 7],
    '4': [5, 5, 7, 1, 1], '5': [7, 4, 7, 1, 7], '6': [7, 4, 7, 5, 7], '7': [7, 1, 2, 2, 2],
    '8': [7, 5, 7, 5, 7], '9': [7, 5, 7, 1, 7],
    'a': [7, 5, 7, 5, 5], 'b': [6, 5, 7, 5, 7], 'c': [7, 4, 4, 4, 7], 'd': [6, 5, 5, 5, 7],
    'e': [7, 4, 7, 4, 7], 'f': [7, 4, 7, 4, 4], 'g': [7, 4, 5, 5, 7], 'h': [5, 5, 7, 5, 5],
    'i': [7, 2, 2, 2, 7], 'j': [1, 1, 1, 5, 7], 'k': [5, 5, 6, 5, 5], 'l': [4, 4, 4, 4, 7],
    'm': [5, 7, 5, 5, 5], 'n': [6, 5, 5, 5, 5], 'o': [7, 5, 5, 5, 7], 'p': [7, 5, 7, 4, 4],
    'r': [7, 5, 6, 5, 5], 's': [7, 4, 7, 1, 7], 't': [7, 2, 2, 2, 2], 'u': [5, 5, 5, 5, 7],
    'v': [5, 5, 5, 5, 2], 'w': [5, 5, 5, 7, 5], 'x': [5, 5, 2, 5, 5], 'y': [5, 5, 7, 1, 7],
    'z': [7, 1, 2, 4, 7], '-': [0, 0, 7, 0, 0], '#': [5, 7, 5, 7, 5], ' ': [0, 0, 0, 0, 0],
    '.': [0, 0, 0, 0, 2], ':': [0, 2, 0, 2, 0]
};

function drawChar(buf, bufW, bufH, char, startX, startY, scale = 1, r = 255, g = 255, b = 255) {
    const glyph = FONT_3X5[char.toLowerCase()] || FONT_3X5[' '];
    for (let row = 0; row < 5; row++) {
        const bits = glyph[row];
        for (let col = 0; col < 3; col++) {
            if ((bits & (1 << (2 - col))) !== 0) {
                for (let sy = 0; sy < scale; sy++) {
                    for (let sx = 0; sx < scale; sx++) {
                        const px = startX + col * scale + sx;
                        const py = startY + row * scale + sy;
                        if (px >= 0 && px < bufW && py >= 0 && py < bufH) {
                            const idx = (py * bufW + px) * 4;
                            buf[idx] = r;
                            buf[idx + 1] = g;
                            buf[idx + 2] = b;
                            buf[idx + 3] = 255;
                        }
                    }
                }
            }
        }
    }
}

function drawString(buf, bufW, bufH, str, startX, startY, scale = 1, r = 255, g = 255, b = 255) {
    let curX = startX;
    for (let i = 0; i < str.length; i++) {
        drawChar(buf, bufW, bufH, str[i], curX, startY, scale, r, g, b);
        curX += (3 * scale) + scale; // 3px glyph + 1px spacing
    }
}

// 1. Classification function based on visual taxonomy per MSG-PRUNE-PM-027
function classifyItem(item) {
    const words = (item.subjectWords || []).map(w => w.toLowerCase());
    const wSet = new Set(words);

    if (wSet.has('fireball') || wSet.has('flame') || (wSet.has('fire') && !wSet.has('hearth') && !wSet.has('ring') && !wSet.has('coal'))) {
        return 'effects';
    }
    if (wSet.has('bone') || wSet.has('skull') || wSet.has('skeleton') || wSet.has('rib') || wSet.has('carcass')) {
        return 'bones_and_skulls';
    }
    if (wSet.has('cactus') || wSet.has('succulent') || wSet.has('agave')) {
        return 'cacti';
    }
    if (wSet.has('lily') || wSet.has('water lily') || wSet.has('weed') || wSet.has('algae') || wSet.has('lotus')) {
        return 'water_plants';
    }
    if (wSet.has('mushroom') || wSet.has('fungus') || wSet.has('toadstool') || wSet.has('spore')) {
        return 'mushrooms';
    }
    if (wSet.has('flower') || wSet.has('daisy') || wSet.has('blossom') || wSet.has('petal') || wSet.has('heather') || wSet.has('wildflower') || wSet.has('rose') || wSet.has('dandelion')) {
        return 'flowers';
    }
    if (wSet.has('reed') || wSet.has('cattail') || wSet.has('rush') || wSet.has('sedge') || wSet.has('straw') || wSet.has('turf') || wSet.has('clover') || (wSet.has('grass') && !wSet.has('dry grass'))) {
        return 'grasses_reeds_cattails';
    }
    if (wSet.has('stump') || wSet.has('log') || wSet.has('trunk') || wSet.has('fallen')) {
        return 'stumps_and_logs';
    }
    if (wSet.has('tree') || wSet.has('pine') || wSet.has('oak') || wSet.has('birch') || wSet.has('willow') || wSet.has('sapling')) {
        return 'trees';
    }
    if (wSet.has('bush') || wSet.has('shrub') || wSet.has('berry') || wSet.has('bramble') || wSet.has('thorn') || wSet.has('hedge') || wSet.has('fern')) {
        return 'bushes_and_shrubs';
    }
    if (wSet.has('ore') || wSet.has('iron') || wSet.has('copper') || wSet.has('gold') || wSet.has('coal') || wSet.has('crystal') || wSet.has('ember') || wSet.has('vein')) {
        return 'ore_veins_and_crystals';
    }
    if (wSet.has('well') || wSet.has('pillar') || wSet.has('statue') || wSet.has('lamp') || wSet.has('chest') || wSet.has('boat') || wSet.has('hearth') || wSet.has('fence') || wSet.has('tent') || wSet.has('ruin') || wSet.has('wall') || wSet.has('brick') || wSet.has('barrel') || wSet.has('crate')) {
        return 'man_made';
    }
    if (wSet.has('puddle') || wSet.has('mud') || wSet.has('clay') || wSet.has('sand') || wSet.has('gravel') || wSet.has('mound') || wSet.has('dirt') || wSet.has('path') || wSet.has('patch') || wSet.has('moss')) {
        return 'ground_patches';
    }
    if (wSet.has('boulder') || wSet.has('rock') || wSet.has('pebble') || wSet.has('stone') || wSet.has('outcrop') || wSet.has('crag') || wSet.has('cliff')) {
        return 'boulders_and_rocks';
    }

    // Default by board origin if words are sparse
    const boardPrefix = (item.board || '').split(' ')[0];
    if (['obj_001', 'obj_002', 'obj_003'].includes(boardPrefix)) return 'boulders_and_rocks';
    if (['obj_004', 'obj_005', 'obj_006'].includes(boardPrefix)) return 'ore_veins_and_crystals';
    if (['obj_007', 'obj_008'].includes(boardPrefix)) return 'stumps_and_logs';
    if (['obj_009', 'obj_010', 'obj_011'].includes(boardPrefix)) return 'bushes_and_shrubs';

    return 'boulders_and_rocks';
}

console.log('Loading registry:', REGISTRY_FILE);
const rawRegistry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
console.log(`Loaded ${rawRegistry.items.length} items from QA registry.`);

// Process and inspect each item
const items = [];
let totalPixelsOutside = 0;

for (const it of rawRegistry.items) {
    const imgPath = it.images && it.images[0];
    if (!imgPath || !fs.existsSync(imgPath)) {
        console.error('Missing image on disk:', it.pixellabId, imgPath);
        continue;
    }

    const png = readPNG(imgPath);
    const w = png.width;
    const h = png.height;

    // Check square background (4 corners alpha > 200)
    const c1 = png.px(0, 0);
    const c2 = png.px(w - 1, 0);
    const c3 = png.px(0, h - 1);
    const c4 = png.px(w - 1, h - 1);
    const hasSquareBg = (c1[3] > 200 && c2[3] > 200 && c3[3] > 200 && c4[3] > 200);

    // Check electric cyan: high blue, high green, low red
    let hasElectricCyan = false;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const p = png.px(x, y);
            if (p[3] > 50 && p[2] > 200 && p[1] > 200 && p[0] < 80) {
                hasElectricCyan = true;
                break;
            }
        }
        if (hasElectricCyan) break;
    }

    const group = classifyItem(it);
    const isLarge = (w > 48 || h > 48);

    items.push({
        pixellabId: it.pixellabId,
        board: it.board,
        statedSize: it.size,
        w, h,
        png,
        isLarge,
        hasSquareBg,
        hasElectricCyan,
        group,
        subjectWords: it.subjectWords || []
    });
}

console.log(`Successfully parsed ${items.length} items. Large: ${items.filter(i => i.isLarge).length}`);

// Group definitions
const GROUPS_ORDER = [
    'boulders_and_rocks',
    'ore_veins_and_crystals',
    'stumps_and_logs',
    'trees',
    'bushes_and_shrubs',
    'flowers',
    'grasses_reeds_cattails',
    'mushrooms',
    'ground_patches',
    'bones_and_skulls',
    'water_plants',
    'cacti',
    'man_made',
    'effects'
];

// Split into:
// 1. Regular items by group
// 2. Large items by group (or aggregated)
// 3. Flagged items sheet
const standardItemsByGroup = {};
const largeItems = items.filter(i => i.isLarge);
const flaggedItems = items.filter(i => i.hasSquareBg || i.hasElectricCyan);

for (const g of GROUPS_ORDER) {
    standardItemsByGroup[g] = items.filter(i => !i.isLarge && i.group === g);
}

const generatedSheets = [];

// Helper to render sheet
function buildSheet(sheetFilename, title, sheetItems, isLargeMode) {
    const cols = isLargeMode ? 3 : 6;
    const cellW = isLargeMode ? 320 : 120;
    const cellH = isLargeMode ? 340 : 130;
    const marginX = 30;
    const headerH = 60;
    const rows = Math.ceil(sheetItems.length / cols) || 1;

    const sheetW = marginX * 2 + cols * cellW;
    const sheetH = headerH + rows * cellH + 30;

    // Allocate buffer filled with mid-grey (#808080)
    const buf = Buffer.alloc(sheetW * sheetH * 4);
    for (let i = 0; i < buf.length; i += 4) {
        buf[i] = 128;     // R
        buf[i + 1] = 128; // G
        buf[i + 2] = 128; // B
        buf[i + 3] = 255; // A
    }

    // Title banner
    drawString(buf, sheetW, sheetH, title, marginX, 20, 2, 255, 255, 255);
    drawString(buf, sheetW, sheetH, `COUNT: ${sheetItems.length} | SCALE: 2X NATIVE | BOUNDS CHECK: ENFORCED`, marginX, 42, 1, 220, 220, 220);

    for (let idx = 0; idx < sheetItems.length; idx++) {
        const item = sheetItems[idx];
        const col = idx % cols;
        const row = Math.floor(idx / cols);

        const cellX = marginX + col * cellW;
        const cellY = headerH + row * cellH;

        // Draw cell border
        for (let x = cellX; x < cellX + cellW - 4; x++) {
            const topIdx = (cellY * sheetW + x) * 4;
            const botIdx = ((cellY + cellH - 4) * sheetW + x) * 4;
            buf[topIdx] = buf[topIdx+1] = buf[topIdx+2] = 100; buf[topIdx+3] = 255;
            buf[botIdx] = buf[botIdx+1] = buf[botIdx+2] = 100; buf[botIdx+3] = 255;
        }
        for (let y = cellY; y < cellY + cellH - 4; y++) {
            const leftIdx = (y * sheetW + cellX) * 4;
            const rightIdx = (y * sheetW + cellX + cellW - 4) * 4;
            buf[leftIdx] = buf[leftIdx+1] = buf[leftIdx+2] = 100; buf[leftIdx+3] = 255;
            buf[rightIdx] = buf[rightIdx+1] = buf[rightIdx+2] = 100; buf[rightIdx+3] = 255;
        }

        // Render sprite at 2x scale centered in cell sprite area
        const spriteAreaH = cellH - 35;
        const renderW = item.w * 2;
        const renderH = item.h * 2;

        const spriteOffsetX = cellX + Math.floor((cellW - renderW) / 2);
        const spriteOffsetY = cellY + Math.floor((spriteAreaH - renderH) / 2) + 4;

        // Draw sprite pixels
        for (let sy = 0; sy < item.h; sy++) {
            for (let sx = 0; sx < item.w; sx++) {
                const pxColor = item.png.px(sx, sy);
                if (pxColor[3] === 0) continue; // transparent

                for (let dy = 0; dy < 2; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        const targetX = spriteOffsetX + sx * 2 + dx;
                        const targetY = spriteOffsetY + sy * 2 + dy;

                        // STRICT BOUNDS CHECK: Must land strictly inside cell
                        if (targetX < cellX || targetX >= cellX + cellW || targetY < cellY || targetY >= cellY + cellH) {
                            totalPixelsOutside++;
                            throw new Error(`CRITICAL OVERFLOW: Item ${item.pixellabId} pixel at (${targetX}, ${targetY}) outside cell [${cellX}, ${cellY}, ${cellW}, ${cellH}]`);
                        }

                        const targetIdx = (targetY * sheetW + targetX) * 4;
                        // Alpha blend
                        const alpha = pxColor[3] / 255;
                        buf[targetIdx] = Math.round(pxColor[0] * alpha + buf[targetIdx] * (1 - alpha));
                        buf[targetIdx + 1] = Math.round(pxColor[1] * alpha + buf[targetIdx + 1] * (1 - alpha));
                        buf[targetIdx + 2] = Math.round(pxColor[2] * alpha + buf[targetIdx + 2] * (1 - alpha));
                        buf[targetIdx + 3] = 255;
                    }
                }
            }
        }

        // Label at bottom of cell
        const numStr = `#${idx + 1} (${item.w}x${item.h})`;
        const idPrefix = item.pixellabId.substring(0, 8);
        drawString(buf, sheetW, sheetH, numStr, cellX + 6, cellY + cellH - 26, 1, 240, 240, 240);
        drawString(buf, sheetW, sheetH, idPrefix, cellX + 6, cellY + cellH - 14, 1, 200, 200, 160);
    }

    const outPath = path.join(OUT_DIR, sheetFilename);
    writePNG(outPath, sheetW, sheetH, buf);
    const stat = fs.statSync(outPath);
    const hash = crypto.createHash('sha256').update(fs.readFileSync(outPath)).digest('hex');

    generatedSheets.push({
        filename: sheetFilename,
        title,
        count: sheetItems.length,
        isLarge: isLargeMode,
        mtime: stat.mtime.toISOString(),
        sha256: hash,
        items: sheetItems
    });
    console.log(`Generated ${sheetFilename}: ${sheetItems.length} items (${sheetW}x${sheetH} px) [SHA: ${hash.substring(0, 12)}]`);
}

// 1. Build Standard Sheets (max 48 per sheet)
let sheetIndex = 1;
for (const g of GROUPS_ORDER) {
    const gItems = standardItemsByGroup[g];
    if (!gItems || gItems.length === 0) continue;

    const CHUNK_SIZE = 48;
    for (let c = 0; c < gItems.length; c += CHUNK_SIZE) {
        const chunk = gItems.slice(c, c + CHUNK_SIZE);
        const part = Math.floor(c / CHUNK_SIZE) + 1;
        const totalParts = Math.ceil(gItems.length / CHUNK_SIZE);
        const padIndex = String(sheetIndex).padStart(2, '0');
        const filename = `sheet_${padIndex}_${g}_part${part}.png`;
        const title = `${g.toUpperCase().replace(/_/g, ' ')} (PART ${part}/${totalParts})`;

        buildSheet(filename, title, chunk, false);
        sheetIndex++;
    }
}

// 2. Build Large Sheets (max 9 per sheet for >48px items)
if (largeItems.length > 0) {
    const LARGE_CHUNK = 9;
    for (let c = 0; c < largeItems.length; c += LARGE_CHUNK) {
        const chunk = largeItems.slice(c, c + LARGE_CHUNK);
        const part = Math.floor(c / LARGE_CHUNK) + 1;
        const totalParts = Math.ceil(largeItems.length / LARGE_CHUNK);
        const padIndex = String(sheetIndex).padStart(2, '0');
        const filename = `sheet_${padIndex}_large_objects_part${part}.png`;
        const title = `LARGE OBJECTS OVERFLOW-FREE (PART ${part}/${totalParts})`;

        buildSheet(filename, title, chunk, true);
        sheetIndex++;
    }
}

// 3. Build Flagged Sheet
if (flaggedItems.length > 0) {
    const padIndex = String(sheetIndex).padStart(2, '0');
    const filename = `sheet_${padIndex}_flagged_items.png`;
    const title = `FLAGGED ITEMS (SQUARE BG / ELECTRIC CYAN)`;
    buildSheet(filename, title, flaggedItems, false);
    sheetIndex++;
}

console.log(`\nAll sheets built. Total overflow pixels: ${totalPixelsOutside} (MUST BE 0).`);

// 4. Generate updated index.md and manifest.md
let indexMd = `# Project DEUS - Task Packet A2: Owner Sign-Off Visual Contact Sheets (A2-FIX-2 Rebuild)\n\n`;
indexMd += `**Authority:** DEC-007, DEC-046 Static-First Amendment (\`e9e402ca\`), MSG-PRUNE-PM-027 (A2-FIX-2), MSG-PRUNE-PM-040\n`;
indexMd += `**Rebuild Timestamp:** ${new Date().toISOString()}\n`;
indexMd += `**Total Objects Catalogued:** ${items.length}\n`;
indexMd += `**Total Sheets Generated:** ${generatedSheets.length}\n`;
indexMd += `**Pixel Overflow Count:** ${totalPixelsOutside} (Strictly 0; verified by cell boundary asserts)\n\n`;
indexMd += `## Master Sheet Manifest\n\n`;
indexMd += `| Sheet # | Filename | Category / Title | Count | Cell Type | Dimensions | mtime | sha256 |\n`;
indexMd += `|---|---|---|---|---|---|---|---|\n`;

for (let i = 0; i < generatedSheets.length; i++) {
    const s = generatedSheets[i];
    indexMd += `| ${i + 1} | \`${s.filename}\` | **${s.title}** | ${s.count} | ${s.isLarge ? 'Large (320x340)' : 'Standard (120x130)'} | ${s.isLarge ? '1000x' : '760x'} | \`${s.mtime}\` | \`${s.sha256}\` |\n`;
}

indexMd += `\n---\n\n## Per-Sheet Detailed Item Mapping\n\n`;
for (const s of generatedSheets) {
    indexMd += `### ${s.filename} - ${s.title} (${s.count} items)\n\n`;
    indexMd += `| # | PixelLab ID | Native Size | Stated Board | Subject Words | Flags |\n`;
    indexMd += `|---|---|---|---|---|---|\n`;
    for (let idx = 0; idx < s.items.length; idx++) {
        const it = s.items[idx];
        const flags = [];
        if (it.isLarge) flags.push('LARGE');
        if (it.hasSquareBg) flags.push('SQUARE_BG');
        if (it.hasElectricCyan) flags.push('CYAN_VEIN');
        indexMd += `| ${idx + 1} | \`${it.pixellabId}\` | ${it.w}x${it.h}px | \`${it.board}\` | ${it.subjectWords.join(', ')} | ${flags.join(', ') || 'NONE'} |\n`;
    }
    indexMd += `\n`;
}

const indexPath = path.join(OUT_DIR, 'index.md');
fs.writeFileSync(indexPath, indexMd, 'utf8');
const indexStat = fs.statSync(indexPath);
const indexSha = crypto.createHash('sha256').update(fs.readFileSync(indexPath)).digest('hex');

console.log(`\nWrote ${indexPath} (${indexStat.size} bytes, sha256: ${indexSha})`);
console.log(`REBUILD COMPLETE: 0 pixels outside cells.`);

