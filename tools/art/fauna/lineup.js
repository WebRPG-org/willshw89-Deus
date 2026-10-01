// True-scale lineup (DEC-072): each creature's east-facing sprite trimmed to its opaque box, all on one ground line, shown at an
// integer scale, with a 48 px tile grid behind and a 72 px human height mark. Usage: node lineup.js <out.png> <scale> <dir> tag ...
const { readPNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_read.js");
const { writePNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_util.js");
const [out, sc, dir, ...tags] = process.argv.slice(2), s = +sc;
const items = tags.map(t => { const p = readPNG(__dirname + "/chars/" + t + "/" + dir + ".png"); let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) if ((p.px(x, y)[3] ?? 255) >= 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { p, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }; });
const gap = 6, top = 104, W = (items.reduce((a, i) => a + i.w + gap, gap) + 24) * s, H = (top + 12) * s, b = Buffer.alloc(W * H * 4), base = top;
const put = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const k = (y * W + x) * 4; b[k] = c[0]; b[k + 1] = c[1]; b[k + 2] = c[2]; b[k + 3] = 255; };
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const tx = Math.floor(x / s / 48), ty = Math.floor((base * s - y) / s / 48); put(x, y, y >= base * s ? [96, 84, 66] : ((tx + ty) & 1 ? [124, 144, 110] : [116, 136, 102])); }
for (const [hgt, col] of [[48, [230, 230, 120]], [72, [250, 120, 100]], [96, [120, 170, 250]]]) for (let x = 0; x < 20 * s; x++) for (let t = 0; t < s; t++) put(x, (base - hgt) * s + t, col);
let ox = 24; for (const it of items) { for (let y = 0; y < it.h * s; y++) for (let x = 0; x < it.w * s; x++) { const q = it.p.px(it.x0 + Math.floor(x / s), it.y0 + Math.floor(y / s)); if ((q[3] ?? 255) < 128) continue; put(ox * s + x, (base - it.h) * s + y, q); } ox += it.w + gap; }
writePNG(out, W, H, b); console.log(out, W, H, items.map((it, k) => tags[k] + " " + it.w + "x" + it.h).join(", "));
