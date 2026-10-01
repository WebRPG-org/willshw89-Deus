// The temperate bestiary v3 (humanoid-shape) jobs not yet launched. The narrow-silhouette clause stays: humanoids keep width <= 48 so
// they clear the 48x96 doors (Owner 2026-10-01: "keep the height anchors, its so all the humanoids fit inside all doors"; ART-SCALE-1b).
const launched = new Set((require("fs").readFileSync(__dirname + "/ids.txt", "utf8").match(/^[a-z0-9-]+(?==)/gm)) || []);
module.exports = require("./bestiary_jobs.js").filter(j => j.args.mode === "v3" && !launched.has(j.tag));
