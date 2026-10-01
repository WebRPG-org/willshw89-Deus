// Regens to the revised sizing (Owner 2026-10-01: "just regen anything that needs regen"; DEC-072 amendment: everything within
// 96x96, humanoids <= 48 wide for 48x96 doors; targets from ART-SCALE-1b, Gemini, cross-checked with Grok's ART-SCALE-1).
// Long animals go to 96x96 frames at proper length, each styled from its current pick (style_character_id) so the look carries over.
// PixelLab size -> drawn side length measured today: horse template ~0.79, aurochs ~0.9, deer ~0.92, spider ~0.95, sand stalker ~0.89.
const fs = require("fs");
const ID = Object.fromEntries((fs.readFileSync(__dirname + "/ids.txt", "utf8").match(/[a-z0-9-]+=[0-9a-f-]{36}/g) || []).map(s => s.split("=")));
const J1 = Object.fromEntries(require("./fauna_jobs.js").map(j => [j.tag, j]));
const J2 = Object.fromEntries(require("./fauna_jobs2.js").map(j => [j.tag, j]));
const J3 = Object.fromEntries(require("./fauna_jobs3.js").map(j => [j.tag, j]));
const NARROW = " Upright, arms close to its sides, a narrow silhouette no wider than its shoulders.";
const re = (tag, src, size, styleTag) => { const a = { ...src.args, name: "DEUS " + tag, size }; delete a.style_character_id; if (styleTag) { if (!ID[styleTag]) throw new Error("no id for " + styleTag); a.style_character_id = ID[styleTag]; } return { tag, args: a }; };
module.exports = [
  // long animals -> 96x96 (target side length in the comment)
  re("stag-r", J1["deer"], 68, "deer"),               // ~62 long
  re("hind-r", J3["doe"], 62, "doe"),                 // ~56 long
  re("wild-horse-r", J2["wild-horse2"], 92, "wild-horse2"), // ~72 long
  re("mare-r", J3["mare"], 86, "mare"),               // ~68 long
  re("aurochs-r", J2["aurochs2"], 92, "aurochs2"),    // ~83 long
  re("aurochs-cow-r", J3["aurochs-cow"], 86, "aurochs-cow"), // ~77 long
  re("spider-r", J2["spider2"], 72, "spider2"),       // ~68 span
  re("sand-stalker-r", J3["sand-stalker"], 84, "sand-stalker"), // ~74 long
  // small animals a step down so they read under the foxes (fresh: a style source must not be larger than the new size)
  re("wildcat-r", J1["wildcat"], 36),                 // ~32
  // humanoids <= 48 wide, about 90 tall (the Owner kept troll5 and bog-horror3; same descriptions plus the narrow clause)
  { tag: "troll-r1", args: { ...J3["troll5"].args, name: "DEUS troll-r1", size: 96, description: J3["troll5"].args.description.replace(/ Classic 1990s/, NARROW + " Classic 1990s") } },
  { tag: "troll-r2", args: { ...J3["troll5"].args, name: "DEUS troll-r2", size: 92, description: J3["troll5"].args.description.replace(/ Classic 1990s/, NARROW + " Classic 1990s") } },
  { tag: "bog-horror-r1", args: { ...J2["bog-horror3"].args, name: "DEUS bog-horror-r1", size: 96, description: J2["bog-horror3"].args.description.replace(/ Classic 1990s/, NARROW + " Classic 1990s") } },
  { tag: "bog-horror-r2", args: { ...J2["bog-horror3"].args, name: "DEUS bog-horror-r2", size: 92, description: J2["bog-horror3"].args.description.replace(/ Classic 1990s/, NARROW + " Classic 1990s") } },
];
