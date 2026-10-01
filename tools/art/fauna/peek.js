// Compose stock RMMZ character sheets onto one grey board at 1x for viewing. Usage: node peek.js out.png file1 file2 ...
const { readPNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_read.js");
const { writePNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_util.js");
const [out, ...fs] = process.argv.slice(2), ps = fs.map(f => readPNG(f));
const W = Math.max(...ps.map(p => p.width)), H = ps.reduce((a, p) => a + p.height + 8, 0), b = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) { b[i * 4] = 120; b[i * 4 + 1] = 140; b[i * 4 + 2] = 110; b[i * 4 + 3] = 255; }
let oy = 0; for (const p of ps) { for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) { const q = p.px(x, y); if ((q[3] ?? 255) < 128) continue; const k = ((oy + y) * W + x) * 4; b[k] = q[0]; b[k + 1] = q[1]; b[k + 2] = q[2]; } oy += p.height + 8; }
writePNG(out, W, H, b); console.log(out, W, H);
