const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/snewt/DEUS_backups/pixellab_2026-09-30/tiles_pro';
const folder = '0c163850-6cd2-418e-b646-b4dadaae2173'; // Dry grass
const html = ['<html><body style=\"background:#333; color:white; font-family:sans-serif;\">'];
html.push('<h3>PixelLab 16-Tile Layout</h3><div style=\"display:grid; grid-template-columns:repeat(4, 50px); gap:5px;\">');

for(let i=0; i<16; i++) {
    const file = path.join(dir, folder + '__' + String(i).padStart(2, '0') + '.png');
    const b64 = fs.readFileSync(file).toString('base64');
    html.push('<div><img src=\"data:image/png;base64,' + b64 + '\" width=\"48\" height=\"48\"/><br/>' + i + '</div>');
}
html.push('</div></body></html>');
fs.writeFileSync('C:/Users/snewt/.gemini/antigravity/brain/793a3102-02aa-4045-adad-e3420f033e81/layout_preview.html', html.join('\n'));
console.log('Saved layout_preview.html');
