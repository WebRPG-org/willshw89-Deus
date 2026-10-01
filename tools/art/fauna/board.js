// Stack creatures as rows of their 8 rotations (S W E N SW SE NW NE) at an integer scale on 48-px checker cells. Usage: node board.js out.png scale tag ...
const { readPNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_read.js");
const { writePNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_util.js");
const [out, sc, ...tags] = process.argv.slice(2), s = +sc, DIRS = ["south", "west", "east", "north", "south-west", "south-east", "north-west", "north-east"];
const rows = tags.map(t => DIRS.map(d => readPNG(__dirname + "/chars/" + t + "/" + d + ".png"))), cell = Math.max(...rows.flat().map(p => p.width)) * s + 8;
const W = 8 * cell + 8, H = rows.reduce((a, r) => a + r[0].height * s + 8, 8), b = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) { b[i * 4] = 118; b[i * 4 + 1] = 138; b[i * 4 + 2] = 104; b[i * 4 + 3] = 255; }
let oy = 8; for (const r of rows) { const h = r[0].height * s; r.forEach((p, i) => { const ox = 8 + i * cell;
  for (let y = 0; y < h; y++) for (let x = 0; x < p.width * s; x++) { const q = p.px(Math.floor(x / s), Math.floor(y / s)), k = ((oy + y) * W + ox + x) * 4; const chk = ((Math.floor(x / s / 24) + Math.floor(y / s / 24)) & 1) ? 6 : 0;
    if ((q[3] ?? 255) < 128) { b[k] = 118 + chk; b[k + 1] = 138 + chk; b[k + 2] = 104 + chk; continue; } b[k] = q[0]; b[k + 1] = q[1]; b[k + 2] = q[2]; } }); oy += h + 8; }
writePNG(out, W, H, b); console.log(out, W, H);
