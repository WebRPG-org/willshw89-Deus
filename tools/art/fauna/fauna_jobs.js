// Group 7 fauna (DEC-071): PixelLab Create Character, high top-down, correct size, 8 still directions, no animation.
// v3 (humanoid shapes): outline "selective outline", detail "high detail". Pro (quadrupeds and other bodies): those two are stated in the text.
const T = " Classic 1990s RPG pixel art in the style of Ultima VII, high top-down view, lit from the upper left, highly detailed, crisp pixel clusters, selective outline in its own darkest colours (no black outline), restrained natural earthy colours, standing still, no ground, no shadow, no text.";
const Q = (tag, template, size, d) => ({ tag, args: { name: "DEUS " + tag, description: d + T, body_type: "quadruped", template, mode: "pro", size, view: "high top-down" } });
const P = (tag, size, d) => ({ tag, args: { name: "DEUS " + tag, description: d + T, mode: "pro", size, view: "high top-down" } });
const V = (tag, size, d) => ({ tag, args: { name: "DEUS " + tag, description: d + T, mode: "v3", size, view: "high top-down", outline: "selective outline", detail: "high detail" } });
module.exports = [
  Q("deer", "horse", 48, "A red deer stag of English woodland: slender legs, russet-brown coat with a paler rump and belly, short tail, branching antlers, dark muzzle."),
  Q("boar", "bear", 48, "A wild boar of English woodland: stocky barrel body on short legs, coarse bristly dark brown-grey hair with a crest of bristles along the spine, long snout, small curved tusks, small ears, thin tail."),
  Q("aurochs", "horse", 80, "An aurochs, a huge wild ox: massive shoulders, deep chest, dark brown-black coat with a pale stripe along the spine, pale muzzle, long forward-curving pale horns with dark tips, tufted tail."),
  Q("wild-horse", "horse", 80, "A wild horse of English moorland: sturdy pony build, dun-brown coat, dark legs, a dark stripe along the back, short upright dark mane, dark tail, no tack, no saddle."),
  Q("wild-sheep", "dog", 40, "A wild sheep of English hills: compact body, thick shaggy dark brown and tan fleece, slender dark legs, short tail, a dark face, small curled horns."),
  Q("hare", "cat", 32, "A brown hare of English meadows: long hind legs, long black-tipped ears, golden-brown speckled fur, pale belly, short white tail."),
  Q("rat", "cat", 32, "A brown rat: a small rodent with a low long body, grey-brown fur, pale belly, pink feet, small round ears, and a long thin bare pink tail."),
  Q("fox", "dog", 40, "A red fox of English woodland: russet-orange fur, white chest and throat, white tip on a full bushy tail, black legs, black-backed pointed ears, narrow muzzle."),
  Q("wildcat", "cat", 40, "A wildcat of English forests: a sturdy tabby cat, grey-brown fur with dark stripes, a thick blunt ringed tail with a black tip, pale throat."),
  P("fowl", 32, "A wild ground fowl, a non-humanoid bird standing on two legs: a plump red-brown hen-like bird with mottled brown and gold feathers, a small red comb and wattle, short tail feathers, yellow legs."),
  P("hawk", 32, "A hawk, a non-humanoid bird of prey in flight, wings spread wide: brown back and wings, pale barred chest and underwings, banded tail, hooked yellow beak."),
  P("songbird", 32, "A small songbird, a non-humanoid bird standing on two thin legs: a robin-sized bird, olive-brown back, orange-red breast, pale belly, short thin beak, folded wings."),
  P("bat", 32, "A cave bat, a non-humanoid animal in flight with leathery wings spread wide: dark brown furry body, black membranous wings with visible finger bones, small pointed ears."),
  P("serpent", 32, "A serpent, a non-humanoid legless snake coiled on the ground with its head raised: olive-brown scales with a dark zigzag pattern along the back, pale belly scales, flicking forked tongue."),
  V("restless-dead", 48, "A restless dead of English folklore, a revenant risen from a barrow: a gaunt corpse with grey-green withered skin stretched over bones, sunken dark eye sockets with faint pale pinpoints, wisps of lank hair, a torn and earth-stained burial shroud, bare bony feet, arms hanging forward."),
  V("bog-horror", 72, "A bog horror of the English fens: a hulking hunched creature made of black peat and mud, draped in dripping bog weed, reeds and tangled roots, long trailing arms, two small pale glowing eyes, moss and a few pale marsh flowers on its back."),
];
