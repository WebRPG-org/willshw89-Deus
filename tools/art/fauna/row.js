// Lay PNGs left to right on a grass-grey board, bottoms aligned, optional integer scale. Usage: node row.js out.png scale f1 f2 ...
const { readPNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_read.js");
const { writePNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_util.js");
const [out, sc, ...fs] = process.argv.slice(2), s = +sc, ps = fs.map(f => readPNG(f));
const W = ps.reduce((a, p) => a + p.width * s + 8, 8), H = Math.max(...ps.map(p => p.height * s)) + 16, b = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) { b[i * 4] = 120; b[i * 4 + 1] = 140; b[i * 4 + 2] = 110; b[i * 4 + 3] = 255; }
let ox = 8; for (const p of ps) { const oy = H - 8 - p.height * s; for (let y = 0; y < p.height * s; y++) for (let x = 0; x < p.width * s; x++) { const q = p.px(Math.floor(x / s), Math.floor(y / s)); if ((q[3] ?? 255) < 128) continue; const k = ((oy + y) * W + ox + x) * 4; b[k] = q[0]; b[k + 1] = q[1]; b[k + 2] = q[2]; } ox += p.width * s + 8; }
writePNG(out, W, H, b); console.log(out, W, H);
