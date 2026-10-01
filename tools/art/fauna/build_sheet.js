// Build an RMMZ single-character sheet ($ prefix) from a creature's eight still rotations (DEC-071 stills, DEC-072 frames).
// Layout: 3 columns x 4 rows; rows = down (S), left (W), right (E), up (N); the still frame fills all three walk columns (no
// animation). Frame = the smallest 48-multiple box (max 96x96) that holds the largest of the four facings; each facing is
// bottom-aligned (feet on the frame's bottom row) and centred horizontally, which is how RMMZ anchors a character on its tile.
// Usage: node build_sheet.js <tag> <out.png>   -> prints the frame size. Diagonals stay in chars/<tag>/ for the 8-way plugin later.
const { readPNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_read.js");
const { writePNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_util.js");
const [tag, out] = process.argv.slice(2), ROWS = ["south", "west", "east", "north"];
const boxes = ROWS.map(d => { const p = readPNG(__dirname + "/chars/" + tag + "/" + d + ".png"); let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) if ((p.px(x, y)[3] ?? 255) >= 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { p, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }; });
const up48 = n => Math.min(96, Math.max(48, Math.ceil(n / 48) * 48));
const mw = Math.max(...boxes.map(b => b.w)), mh = Math.max(...boxes.map(b => b.h));
if (mw > 96 || mh > 96) throw new Error(tag + " exceeds 96x96: " + mw + "x" + mh);
const FW = up48(mw), FH = up48(mh), W = FW * 3, H = FH * 4, buf = Buffer.alloc(W * H * 4);
boxes.forEach((b, r) => { const ox = Math.floor((FW - b.w) / 2), oy = FH - b.h; // bottom-aligned, centred
  for (let c = 0; c < 3; c++) for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const q = b.p.px(b.x0 + x, b.y0 + y); if ((q[3] ?? 255) < 128) continue;
    const k = ((r * FH + oy + y) * W + c * FW + ox + x) * 4; buf[k] = q[0]; buf[k + 1] = q[1]; buf[k + 2] = q[2]; buf[k + 3] = 255; } });
writePNG(out, W, H, buf); console.log(tag, "frame " + FW + "x" + FH, "sheet " + W + "x" + H, "largest facing " + mw + "x" + mh, "->", out);
