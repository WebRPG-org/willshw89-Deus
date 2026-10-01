// Round 3: troll and restless-dead refits (48x96), the AS-SEX-002 pairs styled off their partner (style_character_id, Pro), and the
// four catalogue creatures of other biomes (arctic fox, jackal, ice wraith, sand stalker; UF_WorldCatalog wildlife records).
const T = " Classic 1990s RPG pixel art in the style of Ultima VII, high top-down view, lit from the upper left, highly detailed, crisp pixel clusters, selective outline in its own darkest colours (no black outline), restrained natural earthy colours, standing still, no ground, no shadow, no text.";
const id = t => (require("fs").readFileSync(__dirname + "/ids.txt", "utf8").match(new RegExp("\b" + t + "=([0-9a-f-]+)")) || [])[1];
const V = (tag, size, d) => ({ tag, args: { name: "DEUS " + tag, description: d + T, mode: "v3", size, view: "high top-down", outline: "selective outline", detail: "high detail" } });
const Q = (tag, template, size, d, sty) => ({ tag, args: Object.assign({ name: "DEUS " + tag, description: d + T, body_type: "quadruped", template, mode: "pro", size, view: "high top-down" }, sty ? { style_character_id: id(sty) } : {}) });
const P = (tag, size, d, sty) => ({ tag, args: Object.assign({ name: "DEUS " + tag, description: d + T, mode: "pro", size, view: "high top-down" }, sty ? { style_character_id: id(sty) } : {}) });
const TROLL = "A tall gaunt troll of the English hills: lanky and narrow-shouldered, very long thin arms hanging straight down close to its sides, long thin legs, grey-green warty hide, lank dark hair, heavy brow, long nose, a ragged brown hide loincloth, bare feet.";
module.exports = [
  V("troll4", 96, TROLL + " A narrow upright silhouette: elbows tucked in, hands resting against its thighs."),
  V("troll5", 88, TROLL),
  V("restless-dead3", 76, "A restless dead of English folklore, a revenant risen from a barrow: a gaunt corpse with grey-green withered skin stretched over bones, sunken dark eye sockets with faint pale pinpoints, wisps of lank hair, a torn and earth-stained burial shroud, bare bony feet, arms hanging at its sides."),
  V("ice-wraith", 76, "An ice wraith of the frozen north: a gaunt spectral figure of frost and pale blue ice, a tattered hooded shroud of rime hanging in icicle points, thin clawed hands at its sides, cold pale blue glowing eyes in a shadowed hood, its lower body fading into drifting frost."),
  Q("doe", "horse", 48, "A red deer hind (doe) of English woodland, the female of the stag: no antlers, slender legs, russet-brown coat with a paler rump and belly, short tail, large ears, dark muzzle.", "deer"),
  Q("sow", "bear", 48, "A wild sow, the female wild boar of English woodland: stocky body on short legs, coarse bristly dark brown-grey hair, smaller crest, long snout, no visible tusks, small ears, thin tail.", "boar"),
  Q("mare", "horse", 60, "A wild mare of English moorland, the female of the stallion: slighter sturdy pony build, the same dun-brown coat in every direction, dark legs, a dark stripe along the back, short upright dark mane, dark tail, no tack.", "wild-horse2"),
  Q("aurochs-cow", "horse", 54, "An aurochs cow, the female wild ox: lighter build than the bull, reddish-brown coat, pale muzzle, a pale stripe along the spine, shorter pale upward-curving horns with dark tips, tufted tail.", "aurochs2"),
  Q("ewe", "dog", 40, "A wild ewe, the female wild sheep of English hills: compact body, thick shaggy dark brown and tan fleece, slender dark legs, short tail, a dark face, no horns.", "wild-sheep"),
  P("rooster", 32, "A wild cockerel, the male ground fowl, a non-humanoid bird standing on two legs: a proud red-gold bird with glossy dark green-black curved tail feathers, a tall red comb and wattles, golden neck hackles, yellow legs.", "fowl"),
  Q("arctic-fox", "dog", 40, "An arctic fox of the frozen north: thick white winter fur with faint grey-blue shading, short rounded ears, short muzzle, a full bushy white tail, dark eyes and nose."),
  Q("jackal", "dog", 40, "A jackal of the dry lands: lean and long-legged, sandy-golden fur with a dark grizzled saddle on the back, large pointed ears, narrow muzzle, a black-tipped bushy tail."),
  P("sand-stalker", 54, "A sand stalker, a non-humanoid desert predator: a long low sand-coloured scorpion-like creature with a segmented pale ochre carapace, two grasping pincers in front, six jointed legs, and a curved tail ending in a dark stinger held over its back."),
];
