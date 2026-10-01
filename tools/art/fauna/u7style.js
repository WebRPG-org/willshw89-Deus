// Matte a U7 dataset sprite (flat grey background) to transparent and trim it. Usage: node u7style.js <in.png> <out.png>
const { readPNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_read.js");
const { writePNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_util.js");
const [f, out] = process.argv.slice(2), p = readPNG(f), g = p.px(0, 0); let x0 = p.width, y0 = p.height, x1 = -1, y1 = -1;
const fg = (x, y) => { const q = p.px(x, y); return Math.abs(q[0] - g[0]) + Math.abs(q[1] - g[1]) + Math.abs(q[2] - g[2]) >= 10; };
for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) if (fg(x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
const w = x1 - x0 + 1, h = y1 - y0 + 1, b = Buffer.alloc(w * h * 4);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const q = p.px(x0 + x, y0 + y), k = (y * w + x) * 4; b[k] = q[0]; b[k + 1] = q[1]; b[k + 2] = q[2]; b[k + 3] = fg(x0 + x, y0 + y) ? 255 : 0; }
writePNG(out, w, h, b); console.log(out, w + "x" + h, "from", p.width + "x" + p.height);
