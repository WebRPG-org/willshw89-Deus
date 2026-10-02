'use strict';
const fs = require('fs');
const path = require('path');
const { readPNG } = require('../png_read');

const REGISTRY_FILE = 'C:/Users/snewt/DEUS_backups/pixellab_2026-09-30/qa_pass_objects.json';
const reg = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));

function analyzeSprite(png) {
    const w = png.width, h = png.height;
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let opaqueCount = 0;

    let greenCount = 0;
    let purpleCount = 0;
    let blueCount = 0;
    let redCount = 0;
    let yellowCount = 0;
    let whiteCount = 0;
    let woodCount = 0;
    let boneCount = 0;
    let stoneCount = 0;
    let cyanCount = 0;
    let flameCount = 0;
    let waterCount = 0;

    // To check top vs bottom color distribution
    let topGreen = 0, botWood = 0, botStone = 0;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const p = png.px(x, y);
            if (p[3] < 50) continue; // transparent

            opaqueCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;

            const r = p[0], g = p[1], b = p[2];
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
            const lum = (r + g + b) / 3;

            // Cyan check (flag b)
            if (b > 180 && g > 180 && r < 110 && (g + b - 2 * r > 150)) {
                cyanCount++;
            }

            // Flame / fire
            if (r > 180 && g > 40 && g < 180 && b < 60) {
                flameCount++;
            }

            // Water blue
            if (b > 140 && g > 90 && r < 100 && b > r * 1.5) {
                waterCount++;
            }

            // Foliage green
            if (g > 65 && g > r * 1.15 && g > b * 1.15 && sat > 0.2) {
                greenCount++;
                if (y < h * 0.6) topGreen++;
            }

            // Flower colors
            if ((r > 60 && b > 85 && b > g * 1.25) || (r > 90 && b > 110 && g < 80)) {
                purpleCount++;
            } else if (b > 110 && b > r * 1.3 && b > g * 1.15) {
                blueCount++;
            } else if (r > 130 && r > g * 1.4 && r > b * 1.3) {
                redCount++;
            } else if (r > 140 && g > 115 && b < 80 && sat > 0.35) {
                yellowCount++;
            } else if (r > 190 && g > 190 && b > 190 && sat < 0.15) {
                whiteCount++;
            }

            // Wood brown
            if (r > 60 && r < 160 && g > 35 && g < 110 && b > 15 && b < 75 && r > g * 1.15 && g > b * 1.1) {
                woodCount++;
                if (y >= h * 0.4) botWood++;
            }

            // Bone / ivory
            if (r > 170 && r < 240 && g > 160 && g < 230 && b > 140 && b < 210 && sat < 0.22 && Math.abs(r - g) < 25 && Math.abs(g - b) < 35) {
                boneCount++;
            }

            // Neutral stone grey
            if (sat < 0.2 && lum > 30 && lum < 190) {
                stoneCount++;
                if (y >= h * 0.4) botStone++;
            }
        }
    }

    if (opaqueCount === 0) {
        return { group: 'effects', flags: [], reason: 'empty sprite' };
    }

    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;
    const fillRatio = opaqueCount / (bboxW * bboxH);
    const aspect = bboxW / bboxH;

    // Check corners for square background (flag a)
    let cornerOpaque = 0;
    if (png.px(0, 0)[3] > 100) cornerOpaque++;
    if (png.px(w - 1, 0)[3] > 100) cornerOpaque++;
    if (png.px(0, h - 1)[3] > 100) cornerOpaque++;
    if (png.px(w - 1, h - 1)[3] > 100) cornerOpaque++;

    // Border perimeter fill ratio
    let borderOpaque = 0;
    const totalBorder = 2 * (w + h) - 4;
    for (let x = 0; x < w; x++) {
        if (png.px(x, 0)[3] > 100) borderOpaque++;
        if (png.px(x, h - 1)[3] > 100) borderOpaque++;
    }
    for (let y = 1; y < h - 1; y++) {
        if (png.px(0, y)[3] > 100) borderOpaque++;
        if (png.px(w - 1, y)[3] > 100) borderOpaque++;
    }
    const borderRatio = borderOpaque / totalBorder;

    const flags = [];
    if (cornerOpaque >= 2 || borderRatio > 0.45) {
        flags.push('SQUARE_BG');
    }
    if (cyanCount > 15) {
        flags.push('CYAN_VEIN');
    }

    const flowerPetalCount = purpleCount + blueCount + redCount + yellowCount + (greenCount > 30 ? whiteCount : 0);
    const flowerRatio = flowerPetalCount / opaqueCount;
    const greenRatio = greenCount / opaqueCount;
    const woodRatio = woodCount / opaqueCount;
    const boneRatio = boneCount / opaqueCount;
    const stoneRatio = stoneCount / opaqueCount;
    const flameRatio = flameCount / opaqueCount;
    const waterRatio = waterCount / opaqueCount;

    // Classification Decision Tree
    let group = 'boulders_and_rocks';
    let reason = '';

    if (flameRatio > 0.25 || flameCount > 50) {
        group = 'effects';
        reason = `flame/fire pixels (${Math.round(flameRatio * 100)}% flame)`;
    } else if (waterRatio > 0.25 && greenRatio > 0.1) {
        group = 'water_plants';
        reason = `aquatic vegetation in blue water (${waterCount} water px, ${greenCount} green px)`;
    } else if (greenRatio > 0.15 && (flowerRatio > 0.08 || flowerPetalCount > 40)) {
        group = 'flowers';
        reason = `flowering plant with distinct petals (${flowerPetalCount} petal px, ${greenCount} foliage px)`;
    } else if (flowerPetalCount > 60 && greenRatio > 0.05) {
        group = 'flowers';
        reason = `dense flower cluster (${flowerPetalCount} petal px)`;
    } else if (boneRatio > 0.35 && stoneRatio < 0.4 && greenRatio < 0.1) {
        group = 'bones_and_skulls';
        reason = `ivory/bone skeletal structure (${boneCount} bone px)`;
    } else if (topGreen > 40 && botWood > 30 && aspect < 0.85) {
        group = 'trees';
        reason = `vertical tree trunk with upper canopy (aspect ${aspect.toFixed(2)}, ${botWood} wood px, ${topGreen} canopy px)`;
    } else if (woodRatio > 0.4 && greenRatio < 0.25) {
        group = 'stumps_and_logs';
        reason = `wooden log / stump timber (${Math.round(woodRatio * 100)}% wood)`;
    } else if (greenRatio > 0.45 && aspect > 0.7 && aspect < 1.4) {
        group = 'bushes_and_shrubs';
        reason = `dense rounded green foliage shrub (${Math.round(greenRatio * 100)}% foliage)`;
    } else if (greenRatio > 0.25 && aspect < 0.65) {
        group = 'grasses_reeds_cattails';
        reason = `tall vertical green blades / stalks (aspect ${aspect.toFixed(2)})`;
    } else if (cyanCount > 25 || (stoneRatio > 0.3 && (purpleCount > 25 || redCount > 25 || yellowCount > 25))) {
        group = 'ore_veins_and_crystals';
        reason = `crystal facets / ore vein specks in rock matrix`;
    } else if (aspect > 1.6 && fillRatio < 0.45 && bboxH < 18) {
        group = 'ground_patches';
        reason = `flat low-profile ground scatter / puddle (h=${bboxH}, aspect ${aspect.toFixed(2)})`;
    } else {
        // Distinguish man_made vs natural rocks
        // Check for man_made traits: straight lines, symmetry, wood+stone construction (wells, chests, pillars)
        if (woodRatio > 0.15 && stoneRatio > 0.15) {
            group = 'man_made';
            reason = `composite wood and masonry structure (well/chest/mechanism)`;
        } else if (stoneRatio > 0.5) {
            group = 'boulders_and_rocks';
            reason = `natural stone / boulder geometry (${Math.round(stoneRatio * 100)}% stone)`;
        } else {
            group = 'boulders_and_rocks';
            reason = `earthen / geological formation`;
        }
    }

    return { group, flags, reason, w, h };
}

// Test on sample items from sheet 1
console.log('Testing visual classifier on sheet 01 items...');
for (let i = 0; i < 20; i++) {
    const it = reg.items[i];
    const png = readPNG(it.images[0]);
    const res = analyzeSprite(png);
    console.log(`Item #${i+1} (${it.pixellabId.substring(0,8)}): ${res.group} | [${res.flags.join(',')}] | ${res.reason}`);
}
