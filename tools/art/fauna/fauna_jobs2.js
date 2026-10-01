// Round 2 (DEC-072 frames: long animals within 96x48, tall humanoids within 48x96, humans 72 tall): fresh generations sized to fit.
const J = require("./fauna_jobs.js"), base = Object.fromEntries(J.map(j => [j.tag, j]));
const T = " Classic 1990s RPG pixel art in the style of Ultima VII, high top-down view, lit from the upper left, highly detailed, crisp pixel clusters, selective outline in its own darkest colours (no black outline), restrained natural earthy colours, standing still, no ground, no shadow, no text.";
const re = (tag, src, size, d) => { const a = { ...base[src].args, name: "DEUS " + tag, size }; if (d) a.description = d + T; return { tag, args: a }; };
const V = (tag, size, d) => ({ tag, args: { name: "DEUS " + tag, description: d + T, mode: "v3", size, view: "high top-down", outline: "selective outline", detail: "high detail" } });
module.exports = [
  re("wild-horse2", "wild-horse", 60, "A wild horse of English moorland: sturdy pony build, the same dun-brown coat in every direction, dark legs, a dark stripe along the back, short upright dark mane, dark tail, no tack, no saddle."),
  re("aurochs2", "aurochs", 54),
  { tag: "spider2", args: { name: "DEUS spider2", description: "A giant woodland spider, a non-humanoid animal with eight long jointed legs spread around a round black-brown hairy abdomen and a smaller head with fangs, dull reddish marking on the abdomen." + T, mode: "pro", size: 54, view: "high top-down" } },
  V("troll2", 96, "A tall gaunt troll of the English hills: lanky and narrow-shouldered, very long thin arms hanging straight down close to its sides, long thin legs, grey-green warty hide, lank dark hair, heavy brow, long nose, a ragged brown hide loincloth, bare feet."),
  V("troll3", 88, "A tall lean troll of the English hills, narrow build: long arms held close against its body, stooped neck, long thin legs, grey-green warty hide, lank dark hair, heavy brow, a ragged brown hide loincloth, bare feet."),
  V("restless-dead2", 80, base["restless-dead"].args.description.replace(/ Classic 1990s.*$/, "")),
  V("bog-horror2", 96, "A tall narrow bog horror of the English fens: a thin upright figure of black peat and mud, draped in dripping bog weed, reeds and tangled roots hanging straight down, long thin arms close to its sides, two small pale glowing eyes."),
  V("bog-horror3", 88, "A bog horror of the English fens, tall and slim: a stooped upright shape of wet black peat with long strands of bog weed and reeds hanging from its head and shoulders like a cloak, thin arms at its sides, two small pale glowing eyes."),
];
