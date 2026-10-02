const fs = require('fs');
const { decodePNG } = require('../../tools/png_read');
const { writePNG } = require('../../tools/png_util');
const dir = 'C:/Users/snewt/DEUS_backups/pixellab_2026-09-30/tiles_pro';
const fileBase = dir + '/0c163850-6cd2-418e-b646-b4dadaae2173__';
const out = Buffer.alloc(48 * 4 * 48 * 4 * 4);
for (let i = 0; i <= 15; i++) {
    const file = fileBase + String(i).padStart(2, '0') + '.png';
    const img = decodePNG(fs.readFileSync(file));
    const tx = (i % 4) * 48;
    const ty = Math.floor(i / 4) * 48;
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const srcI = (y * 48 + x) * 4;
            const dstI = ((ty + y) * (48 * 4) + (tx + x)) * 4;
            out[dstI] = img.data[srcI];
            out[dstI+1] = img.data[srcI+1];
            out[dstI+2] = img.data[srcI+2];
            out[dstI+3] = img.data[srcI+3];
            // Draw a black pixel if it's the edge of the tile so we can see
            if (x===0 || y===0 || x===47 || y===47) {
                 out[dstI] = 0; out[dstI+1] = 0; out[dstI+2] = 0; out[dstI+3] = 255;
            }
            // Draw the index
        }
    }
}
writePNG('preview_16.png', 48 * 4, 48 * 4, out);
