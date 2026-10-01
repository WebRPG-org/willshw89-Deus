// Council board, one row per piece (Owner 2026-10-01: "Every card should come with a RMMZ sheet example, and a U7 example"):
//   [number tab] [RMMZ stock example: the 4 facings S W E N of the sheet it replaces, 1x] [U7 example as stored] [ours: S W E N SW SE NW NE at 2x]
// Usage: node council_board.js <out.png> <rows.json>  rows: [{n, tag, rmmz, u7}]  (rmmz: rmmz/<species>.png, a 3x4 RMMZ block; u7: u7/<file>.png)
const { readPNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_read.js");
const { writePNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_util.js");
const fs = require("fs"), [out, rf] = process.argv.slice(2), ROWS = JSON.parse(fs.readFileSync(rf, "utf8")), D = __dirname;
const DIRS = ["south", "west", "east", "north", "south-west", "south-east", "north-west", "north-east"];
// 3x5 digit font for the row number tab
const FONT = { 0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111", 4: "101101111001001", 5: "111100111001111", 6: "111100111101111", 7: "111001001001001", 8: "111101111101111", 9: "111101111001111" };
const rows = ROWS.map(r => { const C = DIRS.map(d => readPNG(D + "/chars/" + r.tag + "/" + d + ".png")), R = readPNG(D + "/" + r.rmmz), U = readPNG(D + "/" + r.u7);
  const fw = R.width / 3, fh = R.height / 4; return { r, C, R, U, fw, fh, h: Math.max(C[0].height * 2, U.height, fh) }; });
const cellW = Math.max(...rows.map(x => x.C[0].width * 2)) + 6, rmW = Math.max(...rows.map(x => x.fw * 4)) + 12, u7W = Math.max(...rows.map(x => x.U.width)) + 12;
const W = 40 + rmW + u7W + 8 * cellW + 8, H = rows.reduce((a, x) => a + x.h + 10, 10), b = Buffer.alloc(W * H * 4);
const put = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const k = (y * W + x) * 4; b[k] = c[0]; b[k + 1] = c[1]; b[k + 2] = c[2]; b[k + 3] = 255; };
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, [118, 138, 104]);
const blit = (p, ox, oy, s, sx = 0, sy = 0, sw = p.width, sh = p.height) => { for (let y = 0; y < sh * s; y++) for (let x = 0; x < sw * s; x++) { const q = p.px(sx + Math.floor(x / s), sy + Math.floor(y / s)); if ((q[3] ?? 255) < 128) continue; put(ox + x, oy + y, q); } };
let oy = 10; for (const x of rows) { const bot = oy + x.h; // bottoms aligned within the row
  for (let y = oy; y < bot; y++) for (let i = 0; i < 34; i++) put(4 + i, y, [92, 108, 82]);
  String(x.r.n).split("").forEach((ch, k) => { const g = FONT[ch]; for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === "1") for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) put(8 + k * 12 + i * 3 + a, oy + 4 + j * 3 + c, [250, 245, 220]); });
  for (let f = 0; f < 4; f++) blit(x.R, 40 + f * x.fw, bot - x.fh, 1, x.fw, f * x.fh, x.fw, x.fh); // middle frame of each facing row
  blit(x.U, 40 + rmW, bot - x.U.height, 1);
  x.C.forEach((p, i) => { const cx = 40 + rmW + u7W + i * cellW; for (let y = bot - p.height * 2; y < bot; y++) for (let xx = cx; xx < cx + p.width * 2; xx++) put(xx, y, (((xx - cx) >> 5) + ((bot - y) >> 5)) & 1 ? [124, 144, 110] : [118, 138, 104]); blit(p, cx, bot - p.height * 2, 2); });
  oy = bot + 10; }
writePNG(out, W, H, b); console.log(out, W, H);
