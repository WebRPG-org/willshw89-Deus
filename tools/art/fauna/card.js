// Card board for one creature: RMMZ example (2x) | U7 example (as stored) | our 8 rotations at 1x on a 48-grid strip, then at 3x.
// Usage: node card.js <tag> <rmmzFile> <u7File> <out.png>
const { readPNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_read.js");
const { writePNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_util.js");
const [tag, rf, uf, out] = process.argv.slice(2), DIRS = ["south", "west", "east", "north", "south-west", "south-east", "north-west", "north-east"];
const R = readPNG(rf), U = readPNG(uf), C = DIRS.map(d => readPNG(__dirname + "/chars/" + tag + "/" + d + ".png")), cw = C[0].width, ch = C[0].height;
const W = Math.max(R.width * 2 + U.width + 48, 8 * (cw * 3 + 8)) + 16, H = 16 + Math.max(R.height * 2, U.height, ch) + 16 + ch * 3 + 16, b = Buffer.alloc(W * H * 4);
const fill = (x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const k = (y * W + x) * 4; b[k] = c[0]; b[k + 1] = c[1]; b[k + 2] = c[2]; b[k + 3] = 255; } };
fill(0, 0, W, H, [118, 138, 104]);
const blit = (p, ox, oy, s) => { for (let y = 0; y < p.height * s; y++) for (let x = 0; x < p.width * s; x++) { const q = p.px(Math.floor(x / s), Math.floor(y / s)); if ((q[3] ?? 255) < 128) continue; const k = ((oy + y) * W + ox + x) * 4; b[k] = q[0]; b[k + 1] = q[1]; b[k + 2] = q[2]; } };
blit(R, 8, 8, 2); blit(U, 8 + R.width * 2 + 24, 8, 1);
const sx = 8 + R.width * 2 + 24 + U.width + 24; // 1x strip with 48-px cell grid shading
C.slice(0, 4).forEach((p, i) => { fill(sx + i * Math.max(cw, 48), 8, Math.max(cw, 48), Math.max(ch, 48), i % 2 ? [128, 148, 112] : [108, 128, 96]); blit(p, sx + i * Math.max(cw, 48), 8, 1); });
const y3 = 16 + Math.max(R.height * 2, U.height, ch) + 8; C.forEach((p, i) => blit(p, 8 + i * (cw * 3 + 8), y3, 3));
writePNG(out, W, H, b); console.log(out, W, H);
