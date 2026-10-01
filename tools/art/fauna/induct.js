// lane-gf (ART.FAUNA.01) induction step: for each council-passed creature, build its RMMZ sheet into the lane worktree, archive the
// eight rotations as masters with a source record, and point the UF_WorldCatalog wildlife record at the sheet (no tint).
// Usage: node induct.js <worktree>
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const WT = process.argv[2], D = __dirname, DIRS = ["south", "west", "east", "north", "south-west", "south-east", "north-west", "north-east"];
const ID = Object.fromEntries((fs.readFileSync(D + "/ids.txt", "utf8").match(/[a-z0-9-]+=[0-9a-f-]{36}/g) || []).map(s => s.split("=")));
ID.wolf = "8cf30e75-34c1-4b9c-855e-beb1ebfd5e3b";
const SET = [ // [tag with the final pixels, species id in UF_WorldCatalog, sheet name, source character tag, mode, applied correction]
  ["wolf", "wolf", "Wolf", "wolf", "pro quadruped dog", null],
  ["fox", "fox", "Fox", "fox", "pro quadruped dog", null],
  ["boar", "boar", "Boar", "boar", "pro quadruped bear", null],
  ["hare", "hare", "Hare", "hare", "pro quadruped cat", null],
  ["fowl", "fowl", "Fowl", "fowl", "pro", null],
  ["hawk", "hawk", "Hawk", "hawk", "pro", null],
  ["songbird-half", "songbird", "Songbird", "songbird", "pro", "halved 2x2 majority (scratchpad halve.js)"],
  ["bat-half", "bat", "Bat", "bat", "pro", "halved 2x2 majority (scratchpad halve.js)"],
  ["spider2", "giant_spider", "GiantSpider", "spider2", "pro", null],
  ["wild-sheep-fix", "wild_sheep", "WildSheep", "wild-sheep", "pro quadruped dog", "ART-COUNCIL-14.8 fix (Grok): fleece to 3 browns, checker removed (3x3 majority), lightest brown upper-left only (fix14.js)"],
  ["rat-half-fix", "rat", "Rat", "rat", "pro quadruped cat", "halved 2x2 majority; ART-COUNCIL-14.10 fix (Grok): light-grey pixel upper-left of the body, dark pixel under the belly (fix14.js)"],
  ["restless-dead4-fix", "restless_dead", "RestlessDead", "restless-dead4", "v3 humanoid", "ART-COUNCIL-15.9 fix (Grok): robe flattened to 2 browns, light step on the upper-left shoulder only (fix14.js)"],
];
const catFile = path.join(WT, "game/data/UF_WorldCatalog.json"); let cat = fs.readFileSync(catFile, "utf8"); const out = [];
for (const [tag, sp, name, src, mode, fix] of SET) {
  const sheet = `$DEUS_Creature_${name}`, sheetPath = path.join(WT, "game/img/characters", sheet + ".png");
  const r = execFileSync("node", [path.join(D, "build_sheet.js"), tag, sheetPath], { encoding: "utf8" }).trim();
  const mdir = path.join(WT, "art/fauna", sp); fs.mkdirSync(mdir, { recursive: true });
  for (const d of DIRS) fs.copyFileSync(path.join(D, "chars", tag, d + ".png"), path.join(mdir, d + ".png"));
  const meta = JSON.parse(fs.readFileSync(path.join(D, "chars", src, "meta.json"), "utf8") || "{}");
  fs.writeFileSync(path.join(mdir, "source.json"), JSON.stringify({ species: sp, sheet: `game/img/characters/${sheet}.png`, generator: "PixelLab Create Character", mode, view: "high top-down", pixellabCharacterId: ID[src] || meta.id || null, canvas: meta.size || null, correction: fix, council: "ART-COUNCIL-14/15 (art/COUNCIL_RECORD.md)", decisions: ["DEC-071", "DEC-072", "DEC-056"], date: "2026-10-01" }, null, 2) + "\n");
  // catalog record: the first "image" after "id": "<sp>" inside that object; drop its "tint" line
  const at = cat.indexOf(`"id": "${sp}"`); if (at < 0) throw new Error("no catalog record " + sp);
  const end = cat.indexOf("\n      }", at); const block = cat.slice(at, end < 0 ? at + 4000 : end);
  const im = block.match(/"image": "[^"]+"/); if (!im) throw new Error("no image in " + sp);
  let nb = block.replace(im[0], `"image": "${sheet}"`).replace(/\n\s*"tint": "#[0-9a-fA-F]{6}",?/, "");
  cat = cat.slice(0, at) + nb + cat.slice(at + block.length);
  out.push(sp + ": " + r.replace(/ ->.*/, "") + " | catalog " + im[0] + " -> " + sheet);
}
JSON.parse(cat); fs.writeFileSync(catFile, cat); console.log(out.join("\n"));
