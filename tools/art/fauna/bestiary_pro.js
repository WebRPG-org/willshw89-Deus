// The temperate bestiary Pro beasts, sized to the DEC-072 amendment classes (ART-SCALE-1b), commonest first. Anything planned at
// <= 40 px is drawn at double size and halved after collection (halve.js), because tiny canvases squash the shape (Owner 2026-10-01:
// "If something appears smushed like the snake or the cat, thats no good"). HALVE lists the tags to halve.
const J = require("./bestiary_jobs.js").filter(j => j.args.mode === "pro");
module.exports = J.map(j => j.args.size <= 40 ? { tag: j.tag + "-x2", halveTo: j.tag, args: { ...j.args, name: "DEUS " + j.tag + "-x2", size: j.args.size * 2, description: j.args.description.replace(" standing still,", " natural true-to-life proportions, not squashed or stretched, standing still,") } } : j);
module.exports.HALVE = module.exports.filter(j => j.halveTo).map(j => [j.tag, j.halveTo]);
