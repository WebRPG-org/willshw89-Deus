// Half size by 2x2 majority (Owner 2026-10-01 "Half size" for small pieces): each output pixel is the most common opaque colour of its
// 2x2 block if at least 2 of the 4 are opaque, else transparent; ties go to the darker colour so outlines survive. No other resampling.
// Usage: node halve.js <tag> <outTag>  -> chars/<outTag>/<dir>.png for all 8 rotations
const { readPNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_read.js");
const { writePNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_util.js");
const fs = require("fs"), [tag, outTag] = process.argv.slice(2), O = __dirname + "/chars/" + outTag; fs.mkdirSync(O, { recursive: true });
const L = q => 0.299 * q[0] + 0.587 * q[1] + 0.114 * q[2];
for (const d of ["south", "west", "east", "north", "south-west", "south-east", "north-west", "north-east"]) {
  const p = readPNG(__dirname + "/chars/" + tag + "/" + d + ".png"), W = p.width >> 1, H = p.height >> 1, b = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const qs = []; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const q = p.px(2 * x + dx, 2 * y + dy); if ((q[3] ?? 255) >= 128) qs.push(q); }
    if (qs.length < 2) continue; const c = {}; for (const q of qs) { const k = q[0] + "," + q[1] + "," + q[2]; c[k] = (c[k] || 0) + 1; }
    const best = Object.entries(c).sort((a, b2) => b2[1] - a[1] || L(a[0].split(",").map(Number)) - L(b2[0].split(",").map(Number)))[0][0].split(",").map(Number);
    const k = (y * W + x) * 4; b[k] = best[0]; b[k + 1] = best[1]; b[k + 2] = best[2]; b[k + 3] = 255; }
  writePNG(O + "/" + d + ".png", W, H, b); }
fs.writeFileSync(O + "/meta.json", JSON.stringify({ tag: outTag, from: tag, tool: "halve.js (2x2 majority)" })); console.log(outTag, "from", tag);
