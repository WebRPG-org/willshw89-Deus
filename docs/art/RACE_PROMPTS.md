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
`, empty hands, standing relaxed, high top-down view, readable high-contrast fantasy pixel art in the DEUS master palette; world feel: medieval English countryside and old British Isles material culture, in the spirit of Ultima VII and EverQuest`

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
- **Male:** `dwarf man, smith and miner of the northern isles, short and very broad, thick dark beard braided with iron rings, weathered ruddy face, coarse dark-red wool tunic under a leather smith's apron, heavy hobnailed boots` + tail
- **Female:** `dwarf woman, smith of the northern isles, short and very broad, thick dark hair in two heavy braids, weathered ruddy face, coarse dark-green wool dress under a leather apron, heavy hobnailed boots` + tail

## Tiefling (48×76)
- **Male:** `tiefling man, carrying the demon influence of medieval English church carving and bestiary devils, soot-dark skin with ember-red undertones, two curved goat horns, small bat-like ears, a thin tail, sharp features, black wool tunic with a red hood, leather belt, turnshoes` + tail
- **Female:** `tiefling woman, carrying the demon influence of medieval church carving and bestiary devils, soot-dark skin with ember-red undertones, two curved goat horns swept back, small bat-like ears, a thin tail, sharp features, long black wool dress with a deep red hooded cloak, turnshoes` + tail

## Halfling (48×48)
- **Male:** `halfling man, English village folk, short and round-faced, curly brown hair, bare hairy feet, green wool waistcoat over a linen shirt, brown breeches, a cloth cap` + tail
- **Female:** `halfling woman, English hedgerow folk, short and round-faced, curly brown hair under a linen cap, bare feet, blue wool dress with a linen apron, a small shawl` + tail

## Gnome (48×48)
- **Male:** `gnome man, English hedgerow folk, very small and wiry, large nose, bright eyes, white beard, red felt cap, brown leather jerkin over a linen shirt, patched breeches, small leather boots` + tail
- **Female:** `gnome woman, English hedgerow folk, very small and wiry, large nose, bright eyes, grey hair in a bun under a red felt cap, brown wool dress with a patched apron, small leather boots` + tail

## Half-Orc (48×96)
- **Male:** `half-orc man, border warrior of the marches, tall and heavily built, grey-green skin, small lower tusks, broad flat nose, close-cropped black hair, scarred forearms, sleeveless leather jerkin over a coarse wool tunic, wool hose, heavy boots` + tail
- **Female:** `half-orc woman, border woman of the marches, tall and heavily built, grey-green skin, small lower tusks, broad features, black hair in a tight braid, coarse wool tunic with a leather belt, wool hose, heavy boots` + tail

## Dragonborn (48×96)
- **Male:** `dragonborn man, a heraldic wyrm-blooded warrior of English and Welsh legend, tall and long-limbed, deep red scales, a long serpentine neck and narrow wedge-shaped head with back-swept horns, slit pupils, a long thick tail, wearing a plain wool tunic and a leather belt, bare clawed feet` + tail
- **Female:** `dragonborn woman, a heraldic wyrm-blooded warrior of English and Welsh legend, tall and long-limbed, deep green scales, a long serpentine neck and narrow wedge-shaped head with slender back-swept horns, slit pupils, a long thick tail, wearing a plain wool dress with a leather belt, bare clawed feet` + tail

## Variants
A second appearance of the same race and sex is a new generation with one changed line (age, hair, a patched garment, mud, a scar), never a rotation of the first. Armour states (ROBE, LIGHT, MEDIUM, HEAVY) are PixelLab States of the base per AS-CHMAP-001.

## Sign-off
Each generated set comes to the PM as a board (eight directions at 3x and 1:1 on the grass swatch, idle and walk frames side by side) and then to the Owner; a YEA is a row in `art/APPROVALS.md`.
