// ART-COUNCIL-14/15 YES WITH FIX corrections by tooling (DEC-069 item 2; zero generations), in Grok's words, all 8 rotations:
//  14.8 wild sheep: "Flatten the fleece to 3 browns, delete the checker, lightest brown only on the upper-left of the fleece."
//  14.10 rat: "Add one light-grey pixel on the upper-left of the body and one dark pixel under the belly, all directions."
//  15.9 restless dead: "Flatten the robe to 2 browns, light on the upper-left shoulder only."
// Writes chars/<tag>-fix/<dir>.png. Fleece/robe = warm brown pixels (r > b, not near-black, not bone-pale); face, legs, horns,
// bones and skin keep their pixels.
const { readPNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_read.js");
const { writePNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_util.js");
const fs = require("fs"), D = __dirname, DIRS = ["south", "west", "east", "north", "south-west", "south-east", "north-west", "north-east"];
const L = q => 0.299 * q[0] + 0.587 * q[1] + 0.114 * q[2];
const load = f => { const p = readPNG(f); const px = []; for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) { const q = p.px(x, y); px.push([q[0], q[1], q[2], (q[3] ?? 255) >= 128 ? 255 : 0]); } return { W: p.width, H: p.height, px }; };
const save = (I, f) => { const b = Buffer.alloc(I.W * I.H * 4); I.px.forEach((q, i) => { b.set(q, i * 4); }); writePNG(f, I.W, I.H, b); };
const warm = q => q[3] && q[0] > q[2] + 12 && q[0] >= q[1] - 4 && L(q) > 40 && L(q) < 175 && !(q[0] > 150 && q[1] > 130 && q[2] > 100);
function flatten(tag, n, lightRegion) { const O = D + "/chars/" + tag + "-fix"; fs.mkdirSync(O, { recursive: true });
  for (const d of DIRS) { const I = load(D + "/chars/" + tag + "/" + d + ".png"); const idx = []; I.px.forEach((q, i) => { if (warm(q)) idx.push(i); });
    if (!idx.length) { save(I, O + "/" + d + ".png"); continue; }
    const ls = idx.map(i => L(I.px[i])).sort((a, b) => a - b), cut = k => ls[Math.min(ls.length - 1, Math.floor(ls.length * k / n))];
    // n bands by luminance quantiles; each band gets its median colour
    const bands = Array.from({ length: n }, () => []); idx.forEach(i => { const l = L(I.px[i]); let b = 0; while (b < n - 1 && l > cut(b + 1)) b++; bands[b].push(i); });
    const med = bands.map(bs => { const s = bs.map(i => I.px[i]).sort((a, b) => L(a) - L(b)); return s.length ? s[s.length >> 1].slice() : null; });
    // "delete the checker": two passes of a 3x3 majority filter on the band index, inside the warm region only
    const band = new Int8Array(I.W * I.H).fill(-1); bands.forEach((bs, b) => bs.forEach(i => { band[i] = b; }));
    for (let pass = 0; pass < 2; pass++) { const nb = band.slice(); for (const i of idx) { const x = i % I.W, y = (i / I.W) | 0, cnt = new Array(n).fill(0);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= I.W || yy >= I.H) continue; const v = band[yy * I.W + xx]; if (v >= 0) cnt[v]++; }
        let best = band[i]; for (let b = 0; b < n; b++) if (cnt[b] > cnt[best]) best = b; nb[i] = best; } band.set(nb); }
    bands.forEach(bs => bs.length = 0); idx.forEach(i => bands[band[i]].push(i));
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; idx.forEach(i => { const x = i % I.W, y = (i / I.W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    bands.forEach((bs, b) => bs.forEach(i => { const x = i % I.W, y = (i / I.W) | 0; let c = med[b];
      if (b === n - 1 && !lightRegion(x, y, x0, y0, x1, y1)) c = med[n - 2] || c; // the lightest band only in its allowed region
      I.px[i] = c.slice(); }));
    save(I, O + "/" + d + ".png"); }
  console.log(tag, "->", tag + "-fix"); }
// sheep: 3 browns, lightest only in the upper-left of the fleece box
flatten("wild-sheep", 3, (x, y, x0, y0, x1, y1) => x < x0 + (x1 - x0) * 0.55 && y < y0 + (y1 - y0) * 0.5);
// restless dead: 2 browns plus a light step kept only on the upper-left shoulder (top third, left half of the robe)
flatten("restless-dead4", 3, (x, y, x0, y0, x1, y1) => x < x0 + (x1 - x0) * 0.5 && y < y0 + (y1 - y0) * 0.33);
// rat: one light-grey pixel at the upper-left of the body, one dark pixel under the belly
(function rat() { const O = D + "/chars/rat-half-fix"; fs.mkdirSync(O, { recursive: true });
  for (const d of DIRS) { const I = load(D + "/chars/rat-half/" + d + ".png"); const op = []; I.px.forEach((q, i) => { if (q[3]) op.push(i); });
    const greys = op.map(i => I.px[i]).filter(q => Math.abs(q[0] - q[1]) < 18 && Math.abs(q[1] - q[2]) < 18).sort((a, b) => L(a) - L(b));
    const light = greys.length ? greys[greys.length - 1] : [170, 165, 160, 255], dark = greys.length ? greys[0] : [50, 45, 45, 255];
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; op.forEach(i => { const x = i % I.W, y = (i / I.W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    const inside = (x, y) => x >= 0 && y >= 0 && x < I.W && y < I.H && I.px[y * I.W + x][3];
    // upper-left body pixel: first opaque pixel scanning diagonals from the box's upper-left corner, one step inward
    let done = false; for (let s = 0; s < I.W + I.H && !done; s++) for (let k = 0; k <= s && !done; k++) { const x = x0 + k + 1, y = y0 + (s - k) + 1; if (inside(x, y) && inside(x - 1, y) && inside(x, y - 1)) { I.px[y * I.W + x] = light.slice(); done = true; } }
    // under the belly: the lowest opaque pixel of the middle columns, one row up (inside the body)
    const cx = Math.round((x0 + x1) / 2); for (let y = y1; y >= y0; y--) if (inside(cx, y) && inside(cx, y - 1)) { I.px[(y - 1) * I.W + cx] = dark.slice(); break; }
    save(I, O + "/" + d + ".png"); }
  console.log("rat-half -> rat-half-fix"); })();
