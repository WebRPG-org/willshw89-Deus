// lane-gf: PM YEA rows in art/APPROVALS.md and the DEUS_Wildlife.md note. Usage: node induct_docs.js <worktree>
const fs = require("fs"), path = require("path"), WT = process.argv[2];
const ROWS = [
  ["wolf", "Wolf", "4 of 4 YES"], ["fox", "Fox", "4 of 4 YES"], ["boar", "Boar", "4 of 4 YES"], ["hare", "Hare", "4 of 4 YES"],
  ["fowl", "Fowl (hen)", "4 of 4 YES"], ["hawk", "Hawk", "4 of 4 YES"], ["songbird", "Songbird", "4 of 4 YES"], ["bat", "Bat", "4 of 4 YES"],
  ["giant_spider", "GiantSpider", "4 of 4 YES"], ["wild_sheep", "WildSheep", "3 YES + Grok YES WITH FIX, fix applied by tooling"],
  ["rat", "Rat", "3 YES + Grok YES WITH FIX, fix applied by tooling"], ["restless_dead", "RestlessDead", "3 YES + Grok YES WITH FIX, fix applied by tooling"],
];
const sheetOf = n => "$DEUS_Creature_" + n.replace(/ \(hen\)/, "");
const ap = path.join(WT, "art/APPROVALS.md"); let t = fs.readFileSync(ap, "utf8"); if (!t.endsWith("\n")) t += "\n";
for (const [sp, name, vote] of ROWS) t += `| 2026-10-01 | \`creature_${sp}\` | ${name.replace(/([a-z])([A-Z])/g, "$1 $2")}: eight-way still sprite (PixelLab Create Character, high top-down), RMMZ sheet, rows S/W/E/N, still frame in all three columns (DEC-071, DEC-072) | \`art/fauna/${sp}/\`, \`game/img/characters/${sheetOf(name)}.png\` | PM YEA (DEC-056): ART-COUNCIL-14/15 ${vote} (art/COUNCIL_RECORD.md); inducted by lane-gf (ART.FAUNA.01) on the Owner's instruction "induct all of these into the game once the art council apporves them" |\n`;
fs.writeFileSync(ap, t);
const wd = path.join(WT, "docs/systems/DEUS_Wildlife.md"); let w = fs.readFileSync(wd, "utf8"); if (!w.endsWith("\n")) w += "\n";
w += `
## Creature art (ART.FAUNA.01, 2026-10-01)

Twelve species draw original sheets instead of stock RMMZ sprites: wolf, fox, boar, hare, fowl, hawk, songbird, bat, giant_spider, wild_sheep, rat and restless_dead. Each is \`game/img/characters/$DEUS_Creature_<Name>.png\`, an RMMZ single-character sheet (3 columns x 4 rows; rows S, W, E, N; the still frame repeats in all three walk columns, DEC-071), in the smallest 48-multiple frame up to 96x96 that holds the creature (DEC-072). Their catalog records carry no \`tint\`, so the drawing check expects white for them (\`speciesById(...).tintValue\`). The eight rotations and the source record of each are in \`art/fauna/<species>/\`; \`tools/art/test_fauna_induction.js\` checks the sheets and records. The other species keep stock art until their redraws pass the council.
`;
fs.writeFileSync(wd, w); console.log("APPROVALS +" + ROWS.length + " rows; DEUS_Wildlife.md note added");
