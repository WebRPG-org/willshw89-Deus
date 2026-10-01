// Humanoid-shape (v3) bestiary jobs with the door-width rule on every one: width <= 48 so they clear 48x96 doors (DEC-072 amendment,
// Owner 2026-10-01 "keep the height anchors, its so all the humanoids fit inside all doors"; ART-SCALE-1b). Two groups:
//  - not yet launched: the remaining v3 jobs, all with the narrow clause;
//  - narrow regens of batch-0 pieces measured wider than 48: grimlock 66, bugbear 68, ghoul 62, duergar 59, ghast 57.
const fs = require("fs");
const launched = new Set((fs.readFileSync(__dirname + "/ids.txt", "utf8").match(/^[a-z0-9-]+(?==)/gm)) || []);
const NARROW = " Upright, arms close to its sides, weapon held close to the body, a narrow silhouette no wider than its shoulders.";
const add = d => / narrow silhouette/.test(d) ? d.replace(/ Upright, arms close to its sides, a narrow silhouette\./, NARROW) : d.replace(" Classic 1990s", NARROW + " Classic 1990s");
const ALL = require("./bestiary_jobs.js").filter(j => j.args.mode === "v3");
const rest = ALL.filter(j => !launched.has(j.tag)).map(j => ({ tag: j.tag, args: { ...j.args, description: add(j.args.description) } }));
const WIDE = ["grimlock", "bugbear", "ghoul", "duergar", "ghast"];
const regen = ALL.filter(j => WIDE.includes(j.tag)).map(j => ({ tag: j.tag + "-n", args: { ...j.args, name: "DEUS " + j.tag + "-n", description: add(j.args.description) } }));
// Huge giants are the giant tier under the 96x96 cap, not door-goers: they keep their natural width.
const GIANT = ["hill-giant", "stone-giant", "cloud-giant"];
const plain = Object.fromEntries(ALL.map(j => [j.tag, j.args.description]));
module.exports = regen.concat(rest).map(j => GIANT.includes(j.tag) ? { tag: j.tag, args: { ...j.args, description: plain[j.tag] } } : j);
