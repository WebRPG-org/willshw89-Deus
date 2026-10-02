const fs = require('fs');
const { decodePNG } = require('../png_read');
const dir = 'C:/Users/snewt/DEUS_backups/pixellab_2026-09-30/tiles_pro';
const fileBase = dir + '/0c163850-6cd2-418e-b646-b4dadaae2173__';

const solidImg = decodePNG(fs.readFileSync(fileBase + '15.png'));
const emptyImg = decodePNG(fs.readFileSync(fileBase + '00.png'));

for (let i = 0; i <= 15; i++) {
    const file = fileBase + String(i).padStart(2, '0') + '.png';
    const img = decodePNG(fs.readFileSync(file));
    let tEdge = 0, bEdge = 0, lEdge = 0, rEdge = 0;
    
    // Check middle 16 pixels of each edge
    for (let p = 16; p <= 31; p++) {
        const check = (x, y) => {
            const idx = (y * 48 + x) * 4;
            const ds = Math.abs(img.data[idx] - solidImg.data[idx]) + Math.abs(img.data[idx+1] - solidImg.data[idx+1]) + Math.abs(img.data[idx+2] - solidImg.data[idx+2]);
            const de = Math.abs(img.data[idx] - emptyImg.data[idx]) + Math.abs(img.data[idx+1] - emptyImg.data[idx+1]) + Math.abs(img.data[idx+2] - emptyImg.data[idx+2]);
            return ds < de ? 1 : 0; 
        };
        tEdge += check(p, 0);
        bEdge += check(p, 47);
        lEdge += check(0, p);
        rEdge += check(47, p);
    }
    
    const T = tEdge > 8 ? 'S' : 'E';
    const B = bEdge > 8 ? 'S' : 'E';
    const L = lEdge > 8 ? 'S' : 'E';
    const R = rEdge > 8 ? 'S' : 'E';
    
    let mask = 0;
    if (T === 'S') mask |= 1;
    if (R === 'S') mask |= 2;
    if (B === 'S') mask |= 4;
    if (L === 'S') mask |= 8;
    
    console.log(String(i).padStart(2, '0') + ': Mask=' + mask + ' (' + T + R + B + L + ')');
}
