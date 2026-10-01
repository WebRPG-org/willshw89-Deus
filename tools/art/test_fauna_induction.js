#!/usr/bin/env node
// ART.FAUNA.01 (lane-gf) gate: the inducted creature sheets and their catalog records.
// The induction registry is art/fauna/<species>/source.json (one folder per inducted species). For each species:
//   masters_complete      the eight rotation PNGs and source.json are in art/fauna/<species>/
//   sheet_exists          game/img/characters/$DEUS_Creature_<Name>.png (the path named in source.json) exists
//   sheet_grid            3 x 4 frames; frame width and height are 48-multiples and at most 96 (DEC-072 amendment)
//   columns_identical     in each row the three walk columns are the same still frame (DEC-071: no animation)
//   frames_opaque         every row (S, W, E, N) draws something
//   bottom_aligned        each row's lowest opaque pixel sits on the frame's bottom two rows (feet on the tile, RMMZ anchor)
//   catalog_points_at_sheet  the runtime wildlife record (game/data/DEUS_WorldCatalog.json, loaded by DEUS_WorldGen.js) uses the
//                         sheet and carries no tint
//   catalogs_in_step      the game/data/UF_WorldCatalog.json record (read by the catalogue builder) matches the DEUS one
// Usage: node tools/art/test_fauna_induction.js [--mutant <name>] [--mutants]
//   --mutant runs the checks on in-memory data with one planted fault; --mutants runs every mutant and exits 1 unless each
//   turns exactly its named check red.
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const { readPNG } = require(path.join(ROOT, "tools", "png_read.js"));
const DIRS = ["south", "west", "east", "north", "south-west", "south-east", "north-west", "north-east"];

function load() {
  const base = path.join(ROOT, "art", "fauna"), species = fs.existsSync(base) ? fs.readdirSync(base).filter(d => fs.existsSync(path.join(base, d, "source.json"))).sort() : [];
  const recordsOf = file => { const cat = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", file), "utf8")), out = {};
    (function walk(o) { if (!o || typeof o !== "object") return; if (o.id && o.image && o.biomes && (o.kind || o.combat)) out[o.id] = o; for (const k in o) walk(o[k]); })(cat); return out; };
  const records = recordsOf("DEUS_WorldCatalog.json"), uf = recordsOf("UF_WorldCatalog.json");
  return species.map(sp => {
    const dir = path.join(base, sp), src = JSON.parse(fs.readFileSync(path.join(dir, "source.json"), "utf8"));
    const sheetPath = path.join(ROOT, src.sheet), sheet = fs.existsSync(sheetPath) ? readPNG(sheetPath) : null;
    const px = sheet ? (x, y) => sheet.px(x, y) : null;
    return { sp, src, masters: DIRS.filter(d => fs.existsSync(path.join(dir, d + ".png"))), sheetName: path.basename(src.sheet, ".png"),
      sheet: sheet ? { w: sheet.width, h: sheet.height, px } : null, record: records[sp] ? { image: records[sp].image, tint: records[sp].tint } : null, recordUF: uf[sp] ? { image: uf[sp].image, tint: uf[sp].tint } : null };
  });
}

const alpha = q => (q[3] === undefined ? 255 : q[3]) >= 128;
function checks(S) {
  const R = {}, fail = (name, msg) => { (R[name] = R[name] || []).push(msg); }, mark = name => { R[name] = R[name] || []; };
  ["masters_complete", "sheet_exists", "sheet_grid", "columns_identical", "frames_opaque", "bottom_aligned", "catalog_points_at_sheet", "catalogs_in_step"].forEach(mark);
  if (!S.length) fail("masters_complete", "no inducted species under art/fauna");
  for (const s of S) {
    if (s.masters.length !== 8) fail("masters_complete", `${s.sp}: ${s.masters.length}/8 rotations`);
    if (!s.sheet) { fail("sheet_exists", `${s.sp}: ${s.src.sheet} missing`); continue; }
    const { w, h, px } = s.sheet, fw = w / 3, fh = h / 4;
    if (w % 3 || h % 4 || fw % 48 || fh % 48 || fw > 96 || fh > 96 || fw < 48 || fh < 48) { fail("sheet_grid", `${s.sp}: sheet ${w}x${h}, frame ${fw}x${fh}`); continue; }
    for (let r = 0; r < 4; r++) {
      let diff = 0, any = false, low = -1;
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const a = px(x, r * fh + y), b = px(fw + x, r * fh + y), c = px(2 * fw + x, r * fh + y);
        if (alpha(a) !== alpha(b) || alpha(a) !== alpha(c) || (alpha(a) && (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2] || a[0] !== c[0] || a[1] !== c[1] || a[2] !== c[2]))) diff++;
        if (alpha(a)) { any = true; low = Math.max(low, y); } }
      if (diff) fail("columns_identical", `${s.sp}: row ${r} has ${diff} differing pixels across the walk columns`);
      if (!any) fail("frames_opaque", `${s.sp}: row ${r} is empty`);
      else if (low < fh - 2) fail("bottom_aligned", `${s.sp}: row ${r} lowest opaque pixel at y ${low} of ${fh}`);
    }
    if (!s.record) fail("catalog_points_at_sheet", `${s.sp}: no UF_WorldCatalog wildlife record`);
    else if (s.record.image !== s.sheetName || s.record.tint) fail("catalog_points_at_sheet", `${s.sp}: image ${s.record.image}, tint ${s.record.tint || "none"} (want ${s.sheetName}, no tint)`);
    if (JSON.stringify(s.record) !== JSON.stringify(s.recordUF)) fail("catalogs_in_step", `${s.sp}: DEUS ${JSON.stringify(s.record)} vs UF ${JSON.stringify(s.recordUF)}`);
  }
  return R;
}

// Mutants plant their fault in the first species (sorted) so a run is reproducible; clone() keeps the real data intact.
const clone = S => S.map(s => ({ ...s, masters: s.masters.slice(), record: s.record ? { ...s.record } : null, recordUF: s.recordUF ? { ...s.recordUF } : null, sheet: s.sheet ? { ...s.sheet } : null }));
const MUTANTS = {
  masters_complete: S => { S[0].masters.pop(); },
  sheet_exists: S => { S[0].sheet = null; },
  sheet_grid: S => { S[0].sheet.w += 3; },
  columns_identical: S => { const s = S[0].sheet, fw = s.w / 3, orig = s.px; s.px = (x, y) => (x === fw + 1 && y === s.h / 4 - 3) ? [1, 2, 3, 255] : orig(x, y); },
  frames_opaque: S => { const s = S[0].sheet, fh = s.h / 4, orig = s.px; s.px = (x, y) => (y >= fh && y < 2 * fh) ? [0, 0, 0, 0] : orig(x, y); },
  bottom_aligned: S => { const s = S[0].sheet, fh = s.h / 4, orig = s.px; s.px = (x, y) => { const r = Math.floor(y / fh), yy = y - r * fh; return yy + 6 < fh ? orig(x, y + 6) : [0, 0, 0, 0]; }; },
  catalog_points_at_sheet: S => { S[0].record.tint = "#7a5a40"; S[0].recordUF.tint = "#7a5a40"; },
  catalogs_in_step: S => { S[0].recordUF.image = "$UF_Stock_Nature_0"; },
};

function report(R, label) { let bad = 0; for (const [k, v] of Object.entries(R)) { const ok = !v.length; if (!ok) bad++; console.log(`  [${ok ? "PASS" : "FAIL"}] ${k}${ok ? "" : ": " + v.slice(0, 4).join("; ")}`); } console.log(`${label}: ${Object.keys(R).length - bad} passed, ${bad} failed`); return bad; }

const args = process.argv.slice(2), S = load();
if (args.includes("--mutants")) {
  let missed = 0; for (const [name, plant] of Object.entries(MUTANTS)) { const T = clone(S); plant(T); const R = checks(T); const red = Object.keys(R).filter(k => R[k].length);
    const ok = red.length === 1 && red[0] === name; if (!ok) missed++; console.log(`  mutant ${name}: red [${red.join(", ")}] ${ok ? "CAUGHT" : "NOT ISOLATED"}`); }
  console.log(`MUTANTS: ${Object.keys(MUTANTS).length - missed}/${Object.keys(MUTANTS).length} caught in isolation`); process.exit(missed ? 1 : 0);
}
const mi = args.indexOf("--mutant"); let T = S;
if (mi >= 0) { const name = args[mi + 1]; if (!MUTANTS[name]) { console.error("unknown mutant " + name); process.exit(2); } T = clone(S); MUTANTS[name](T); console.log("MUTANT " + name); }
console.log(`fauna induction: ${S.length} species (${S.map(s => s.sp).join(", ")})`);
process.exit(report(checks(T), "RESULT") ? 1 : 0);
