# SRD race prompts (PixelLab Characters generator; Owner-generated under DEC-007)

Owner, 2026-09-29: "Small races are 48x48. Human size races are 48x76. Large races are 48x96. Generate a prompt for male and female of every SRD race." Style: V152 / AS-LOOK-002 (English / British Isles feel with Ultima VII and EverQuest). Living beings are generated only by the Owner (DEC-007); agents never run these prompts.

## Canvas tiers (Owner rule, 2026-09-29: "Humans, elves, tieflings, half elves - med. dwarf, halfling, gnome - small. Dragonborn, half-orc - large")
| Tier | Canvas | Figure height inside the canvas | Races |
|---|---|---|---|
| Small | 48×48 | 34–40 px (dwarf 40–44 px, broad), feet on row 47 | Dwarf, Halfling, Gnome |
| Medium | 48×76 | 60–68 px, feet on row 75 | Human, Elf, Half-Elf, Tiefling |
| Large | 48×96 | 80–90 px, feet on row 95 | Dragonborn, Half-Orc |

RMMZ sheet layout: 3 columns × 4 rows of the canvas per direction block (walk S/W/E/N), so a 48×76 sheet is 144×304, a 48×96 sheet 144×384, a 48×48 sheet 144×192; the eight-direction charset uses the project's 8-dir layout (AS-CHMAP-001). Post-process snaps the palette and anchors the feet; prompts carry no pixel numbers.

## Settings (every prompt)
View **high top-down**. Directions: S, SW, W, NW, N, NE, E, SE. Clips: idle 4 frames, walk 4 frames, the rest 6 (AS-CHMAP-001). Outline: 1 px self-tinted on the figure, none on the ground contact. Detail: medium. Palette: DEUS master (snapped after generation). No text, no weapons, no props in the base; equipment comes as layers.

Style tail, appended to every base prompt:
`, empty hands, standing relaxed, high top-down view, readable high-contrast fantasy pixel art in the DEUS master palette; world feel: English folklore, in the spirit of Ultima VII and EverQuest`

Motif line: each base prompt also carries its people's motif from `docs/art/RACE_MOTIFS.md` (e.g. `; motif: the hedgerow folk, red cap, acorn, hawthorn bank`) before the style tail.

Animation prompt, per clip: `{facing}. {motion}. High top-down view, readable high-contrast fantasy pixel art; same figure, same clothes, same palette.`

## Human (48×76)
- **Male:** `human man, medieval English peasant, undyed brown wool tunic to mid-thigh over grey hose, rope belt, soft leather turnshoes, plain linen coif, weathered face and hands` + tail
- **Female:** `human woman, medieval English villager, ankle-length undyed wool kirtle with a laced front, linen apron, white linen wimple and veil, soft leather shoes, work-worn hands` + tail

## Elf (48×76)
- **Male:** `elf man, one of the fair folk of British and Irish lore, tall and slender, pale with a faint moss-green cast, long straight ash-blond hair, old unreadable eyes, high cheekbones, pointed ears, fitted grey-green wool tunic with a hooded cloak of undyed wool, soft deerskin boots` + tail
- **Female:** `elf woman, one of the fair folk of British and Irish lore, tall and slender, pale, long straight silver-fair hair worn loose under a thin circlet of braided rush, old unreadable eyes, pointed ears, long dress of grey-green wool with a hooded cloak, soft deerskin boots` + tail

## Half-Elf (48×76)
- **Male:** `half-elf man, border folk between the villages and the fair folk, slight build, sun-browned skin, dark hair cut short, faintly pointed ears, blue-grey wool tunic over hose, leather belt with a small pouch, turnshoes` + tail
- **Female:** `half-elf woman, border folk, slight and quick, sun-browned skin, dark hair in a single braid, faintly pointed ears, russet wool kirtle with a hooded grey cloak, leather belt with a small pouch, turnshoes` + tail

## Dwarf (48×48, broad; the tallest of the small tier)
- **Male:** `dwarf man, smith and miner of the northern isles, short and very broad, thick dark beard braided with iron rings, weathered ruddy face, coarse blue-grey wool tunic under a leather smith's apron, heavy hobnailed boots` + tail
- **Female:** `dwarf woman, smith of the northern isles, short and very broad, thick dark hair in two heavy braids, weathered ruddy face, coarse blue-grey wool dress under a leather apron, heavy hobnailed boots` + tail

## Tiefling (48×76)
- **Male:** `tiefling man, carrying the demon influence of medieval English church carving and bestiary devils, soot-dark skin with ember-red undertones, two curved goat horns, small bat-like ears, a thin tail, sharp features, black wool tunic with a red hood, leather belt, turnshoes` + tail
- **Female:** `tiefling woman, carrying the demon influence of medieval church carving and bestiary devils, soot-dark skin with ember-red undertones, two curved goat horns swept back, small bat-like ears, a thin tail, sharp features, long black wool dress with a deep red hooded cloak, turnshoes` + tail

## Halfling (48×48)
- **Male:** `halfling man, English village folk, short and round-faced, curly brown hair, bare hairy feet, green wool waistcoat over a linen shirt, brown breeches, a cloth cap` + tail
- **Female:** `halfling woman, English hedgerow folk, short and round-faced, curly brown hair under a linen cap, bare feet, apple-green wool dress with a linen apron, a small shawl` + tail

## Gnome (48×48)
- **Male:** `gnome man, English hedgerow folk, very small and wiry, large nose, bright eyes, white beard, red felt cap, brown leather jerkin over a linen shirt, patched breeches, small leather boots` + tail
- **Female:** `gnome woman, English hedgerow folk, very small and wiry, large nose, bright eyes, grey hair in a bun under a red felt cap, brown wool dress with a patched apron, small leather boots` + tail

## Half-Orc (48×96)
- **Male:** `half-orc man, border warrior of the marches, tall and heavily built, grey-green skin, small lower tusks, broad flat nose, close-cropped black hair, scarred forearms, sleeveless leather jerkin over a coarse wool tunic, wool hose, heavy boots` + tail
- **Female:** `half-orc woman, border woman of the marches, tall and heavily built, grey-green skin, small lower tusks, broad features, black hair in a tight braid, coarse wool tunic with a leather belt, wool hose, heavy boots` + tail

## Dragonborn (48×96)
- **Male:** `dragonborn man, a heraldic wyrm-blooded warrior of English and Welsh legend, tall and long-limbed, deep red scales, a long serpentine neck and narrow wedge-shaped head with back-swept horns, slit pupils, a long thick tail, wearing a plain wool tunic and a leather belt, bare clawed feet` + tail
- **Female:** `dragonborn woman, a heraldic wyrm-blooded warrior of English and Welsh legend, tall and long-limbed, deep green scales, a long serpentine neck and narrow wedge-shaped head with slender back-swept horns, slit pupils, a long thick tail, wearing a plain wool dress with a leather belt, bare clawed feet` + tail

## Armour states (PixelLab States of each base; AS-CHMAP-001; motifs and colours in `docs/art/RACE_OUTFITS.md`)
Owner, 2026-09-29: one motif per people for basic clothes, robes, light, medium and heavy armour (the SRD categories), a colour scheme per people, everything oriented towards readability. The base is the basic-clothes state. Each State prompt: `same figure, same face, same palette, now wearing ` + the line below + the motif line + the style tail. No hex values, no pixel counts; the post-process snap enforces the scheme (`RACE_OUTFITS.md` §3) and the board is judged against rules R1–R8.

- **Human** — ROBE: `an ankle-length oatmeal wool clerk's gown with wide sleeves, a deep hood lined woad blue, a rope girdle` · LIGHT: `a brown leather jack with brass studs in rows over the tunic, a leather cap, bracers, a belt with an empty sheath, the blue hood down on the shoulders` · MEDIUM: `a mail shirt showing at collar and sleeves under a woad-blue surcoat, leather bracers, an iron kettle hat` · HEAVY: `a full mail hauberk and coif under a woad-blue tabard bearing a small gold crowned lion, an iron kettle hat, boots`
- **Elf** — ROBE: `a long grey-green over-robe open at the front, wide sleeves, a hood that hangs still, one pale line of braided rush at the hem` · LIGHT: `a moss-dyed deerskin jerkin laced at the front, deerskin bracers, hood up` · MEDIUM: `dark patinated bronze scale in plain rows over a grey-green gambeson, no pauldrons, a pale rush hem band` · HEAVY: `blackened mail and coif under a grey-green surcoat bearing a small silver crescent moon and leaf, a plain conical helm with no visor, no bright steel`
- **Half-Elf** — ROBE: `an ankle-length russet robe split for walking, a satchel strap across the chest, a pale blue-grey hood` · LIGHT: `a leather jack with brass studs and deerskin bracers, the pale hood up` · MEDIUM: `a mail shirt hidden under a russet jerkin so the mail shows only at collar and sleeves, leather bracers, the pale hood` · HEAVY: `iron strips riveted on russet leather, an iron kettle hat, the pale hood over the shoulders, small pale clasped hands beneath a star on the chest`
- **Dwarf** — ROBE: `a heavy square-cut blue-grey wool gown with a hood and an apron front, bronze clasps` · LIGHT: `a heavy leather doublet with bronze rivets, a leather cap, bracers` · MEDIUM: `bronze scale in lamellar rows over the blue-grey tunic, an iron nasal helm` · HEAVY: `vertical iron splint strips with bronze edging, an iron spangenhelm with a nasal, the beard out over the chest, a small bronze hammer and pick on a cobalt square`
- **Gnome** — ROBE: `a patched brown wool gown with a collar and no hood, the red felt cap, dried herbs at the belt` · LIGHT: `a quilted jack of patched cloth with the quilting lines showing, leather bracers, the red cap` · MEDIUM: `a mail shirt a size too big with the sleeves rolled, over the patched jack, the red cap` · HEAVY: `iron rings sewn on leather, a small iron kettle hat with a red band, a small brass cogwheel with a gem on the chest`
- **Halfling** — ROBE: `an apple-green wool gown with a linen collar and a wheat-gold hem band, a shawl, bare feet` · LIGHT: `a leather waistcoat-jack over the linen shirt with gold stitching, bracers, bare feet` · MEDIUM: `a bright steel breastplate strapped over the green waistcoat, leather bracers, a cloth cap, bare feet` · HEAVY: `mail and coif, an iron kettle hat, a green tabard bearing a small gold wheat sheaf, boots`
- **Half-Orc** — ROBE: `a heavy charcoal wool robe with a hide mantle at the shoulders, bone toggles, hood back` · LIGHT: `a thick boiled-leather cuirass, sleeveless, arms bare, raw-leather bracers, bone studs` · MEDIUM: `a boar-hide harness of thick pelt over the shoulders and chest, raw-leather straps, a bone-plate chest piece` · HEAVY: `iron rings on charcoal leather, an iron spangenhelm with a boar-tusk lashing and no visor, bone-white edging, a small bone-white fist between tusks on the chest`
- **Dragonborn** — ROBE: `a long terracotta hall robe with a bronze-and-gold border at hem and cuffs, a high collar behind the neck, no hood, open at the tail` · LIGHT: `dark terracotta leather cut for the tail with bronze studs in rows, bronze bracers` · MEDIUM: `plain bronze scale rows over terracotta cloth, a bronze gorget on the long neck` · HEAVY: `a black-iron harness with bronze edging, segmented tail armour, a helm shaped to the wedge head with horn cut-outs, a small coiled gold dragon on the chest`
- **Tiefling** — ROBE: `a long black chantry robe with a deep hood cut for the horns, ember-orange lining at hood and sleeve ends, a dull-gold clasp, the tail from the slit` · LIGHT: `a black leather hooded jack with ember-orange stitching and horn cut-outs` · MEDIUM: `a blackened mail shirt under a black surcoat with an ember-orange hem band, an ash-grey coif cut around the horns` · HEAVY: `blackened plate with ember-orange edging, a helm with horn cut-outs, a small flame within a ring of horns in dull gold on the chest`

## Variants
A second appearance of the same race and sex is a new generation with one changed line (age, hair, a patched garment, mud, a scar), never a rotation of the first. Armour states (ROBE, LIGHT, MEDIUM, HEAVY) are PixelLab States of the base per AS-CHMAP-001.

## Sign-off
Each generated set comes to the PM as a board (eight directions at 3x and 1:1 on the grass swatch, idle and walk frames side by side) and then to the Owner; a YEA is a row in `art/APPROVALS.md`.
