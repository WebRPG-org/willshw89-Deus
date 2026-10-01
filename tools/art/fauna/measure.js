// Drawn bounding box (opaque pixels) of each rotation. Usage: node measure.js tag ...  -> per tag: canvas, max w, max h, and S/W/E/N boxes
const { readPNG } = require("C:/Users/snewt/OneDrive/Desktop/UF/tools/png_read.js");
const DIRS = ["south", "west", "east", "north", "south-west", "south-east", "north-west", "north-east"];
for (const tag of process.argv.slice(2)) { let mw = 0, mh = 0; const o = [];
  for (const d of DIRS) { const p = readPNG(__dirname + "/chars/" + tag + "/" + d + ".png"); let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) if ((p.px(x, y)[3] ?? 255) >= 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const w = x1 - x0 + 1, h = y1 - y0 + 1; mw = Math.max(mw, w); mh = Math.max(mh, h); if (DIRS.indexOf(d) < 4) o.push(d[0].toUpperCase() + d.slice(1, 2) + " " + w + "x" + h); }
  const p = readPNG(__dirname + "/chars/" + tag + "/south.png"); console.log(tag.padEnd(14), "canvas " + p.width, "max " + mw + "x" + mh, "|", o.join("  ")); }
