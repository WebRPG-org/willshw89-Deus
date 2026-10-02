#!/usr/bin/env node
'use strict';

/**
 * tools/art/pack_16_to_rmmz_a2.js
 *
 * Maps a 16-edge Wang tile directory into the 48-pattern RMMZ A2 autotile matrix (96x144 pixels).
 *
 * Wang tile ID bitmask: 1=N, 2=E, 4=S, 8=W.
 */

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('../png_read');
const { writePNG } = require('../png_util');

// MAPPING[sy][sx] maps a 24x24 quarter in the 96x144 A2 matrix
// to the required [wangId, qx, qy] from the 16-edge Wang tile set.
// A2 matrix is 4 columns (sx=0..3) x 6 rows (sy=0..5) of 24x24 quarters.
const MAPPING = [
    // sy=0: Island TL, Island TR, Outer TL, Outer TR
    [ [0,0,0], [0,1,0], [6,0,0], [12,1,0] ],
    // sy=1: Island BL, Island BR, Outer BL, Outer BR
    [ [0,0,1], [0,1,1], [3,0,1], [9,1,1] ],
    // sy=2: Inner TL, Top Edge, Top Edge, Inner TR
    [ [14,1,0], [10,0,0], [10,1,0], [14,0,0] ],
    // sy=3: Left Edge, Solid, Solid, Right Edge
    [ [5,0,0], [15,0,0], [15,1,0], [5,1,0] ],
    // sy=4: Left Edge, Solid, Solid, Right Edge
    [ [5,0,1], [15,0,1], [15,1,1], [5,1,1] ],
    // sy=5: Inner BL, Bot Edge, Bot Edge, Inner BR
    [ [11,1,1], [10,0,1], [10,1,1], [11,0,1] ]
];

function packToA2(inputDir, outputFile) {
    if (!fs.existsSync(inputDir)) {
        console.error(`Input directory does not exist: ${inputDir}`);
        process.exit(1);
    }

    // Read the 16 Wang tiles
    const wangTiles = {};
    for (let i = 0; i < 16; i++) {
        let file = path.join(inputDir, `${i}.png`);
        if (!fs.existsSync(file)) {
            file = path.join(inputDir, `${String(i).padStart(2, '0')}.png`);
        }
        if (!fs.existsSync(file)) {
            file = path.join(inputDir, `tile_${i}.png`);
        }
        if (!fs.existsSync(file)) {
            // Some tiles like 1,2,4,8,7,13 might be missing if artists only provided the required ones?
            // A2 mapping actually only uses 0,3,5,6,9,10,11,12,14,15. 
            // We should only fail if a REQUIRED tile is missing.
            continue;
        }

        const buf = fs.readFileSync(file);
        const img = decodePNG(buf, file);
        if (img.width !== 48 || img.height !== 48) {
            console.error(`Tile ${file} is ${img.width}x${img.height}. Expected 48x48.`);
            process.exit(1);
        }
        wangTiles[i] = img.data;
    }

    // Allocate 96x144 RGBA buffer for A2
    const block = Buffer.alloc(96 * 144 * 4);

    for (let sy = 0; sy < 6; sy++) {
        for (let sx = 0; sx < 4; sx++) {
            const [wangId, qx, qy] = MAPPING[sy][sx];
            const sourceTile = wangTiles[wangId];
            if (!sourceTile) {
                console.error(`Missing required Wang tile ID ${wangId} for A2 quarter sx=${sx}, sy=${sy}`);
                process.exit(1);
            }
            
            const srcX = qx * 24;
            const srcY = qy * 24;
            
            const destX = sx * 24;
            const destY = sy * 24;

            // Copy 24x24 quarter
            for (let y = 0; y < 24; y++) {
                for (let x = 0; x < 24; x++) {
                    const si = ((srcY + y) * 48 + (srcX + x)) * 4;
                    const di = ((destY + y) * 96 + (destX + x)) * 4;
                    block[di]     = sourceTile[si];
                    block[di + 1] = sourceTile[si + 1];
                    block[di + 2] = sourceTile[si + 2];
                    block[di + 3] = sourceTile[si + 3];
                }
            }
        }
    }

    writePNG(outputFile, 96, 144, block);
    console.log(`Successfully wrote A2 matrix to ${outputFile}`);
}

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("Usage: node pack_16_to_rmmz_a2.js <input_dir> <output_file.png>");
        process.exit(1);
    }
    packToA2(args[0], args[1]);
}

module.exports = { packToA2, MAPPING };
