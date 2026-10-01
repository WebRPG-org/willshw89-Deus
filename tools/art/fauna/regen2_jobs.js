// Fresh regens of the long animals at the 96x96-cap sizes (DEC-072 amendment, ART-SCALE-1b). The first regen used
// style_character_id, which keeps the style source's drawn size (only the canvas grew), so these are drawn fresh with no style
// reference. Sizes from today's measured size->length ratios (horse template ~0.79, aurochs ~0.9, deer ~0.92, spider ~0.96).
const R = require("./regen_jobs.js"), by = Object.fromEntries(R.map(j => [j.tag, j]));
const fresh = (tag, from, size) => { const a = { ...by[from].args, name: "DEUS " + tag, size }; delete a.style_character_id; return { tag, args: a }; };
module.exports = [
  fresh("stag-f", "stag-r", 68), fresh("hind-f", "hind-r", 62), fresh("wild-horse-f", "wild-horse-r", 92), fresh("mare-f", "mare-r", 86),
  fresh("aurochs-f", "aurochs-r", 92), fresh("aurochs-cow-f", "aurochs-cow-r", 86), fresh("spider-f", "spider-r", 72), fresh("sand-stalker-f", "sand-stalker-r", 84),
];
