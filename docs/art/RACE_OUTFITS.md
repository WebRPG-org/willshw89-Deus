# Race outfits — one motif per people for each of the five outfit tiers, with a colour scheme per people

Owner, 2026-09-29: "each race should have their own motif for Basic clothes, robes, light armor, medium armor, and heavy armor. Consult SRD"; "Every race should also have a color scheme"; "Everything should be oriented towards readability". This file is the one place for all three. It sits under `docs/art/RACE_MOTIFS.md` (the people's motif) and VISION V152 (the English / British Isles feel), and it resolves the SOP's reserved ids: `MOTIF_RACE_<RACE>` × `MOTIF_ARMOR_<WEIGHT>` (AS-HUM-015) becomes the outfit table in §4, and `RAMP_RACE_<RACE>` (AS-GLOBAL-004, "filling their hex is a follow-up") is filled by the schemes in §3. Everything marked **PM-proposed** waits for the Owner's word, as AS-HUM-016 does.

Sources read for this file: the SRD armour list in `game/data/srd5_1/armor.json` (12 armours and the shield), the clothing entries in `game/data/srd51/equipment.json` (common, costume, fine, traveler's clothes; robes), the coverage and material profiles in `docs/art/SRD_CHARACTER_PRESENTATION_CROSSWALK.md` §5–6, AS-CHMAP-001 (the five states), AS-ITEM-001/002 (race-neutral items, custom pixels per race), AS-READ-001 (the grayscale step) and the master palette `art/palette/deus_master_world_palette_v1.hex` (226 colours).

## 1. The five tiers and what the SRD puts in them

| Tier (AS-CHMAP-001 state) | SRD items | What it must read as at 1× | Icon rows (AS-HUM-015) |
|---|---|---|---|
| **UNARMORED** (basic clothes) | Clothes, common; Clothes, traveler's | the everyday base of that people: soft cloth, natural shoulders, the identity colour at full strength | none (the base) |
| **ROBE** | Robes | a column: hem to the ankle, sleeves, hood or collar; the caster (AS-CHMAP-001) | none |
| **LIGHT** | Padded, Leather, Studded leather | a fitted torso with a belt line, leather or quilt values, bracers; head as UNARMORED | `outfit_armor_light__<race>` |
| **MEDIUM** | Hide, Chain shirt, Scale mail, Breastplate, Half plate | shoulders widened, a chest block of metal, scale or hide; limbs still cloth or leather; a cap or coif, face visible | `outfit_armor_medium__<race>` |
| **HEAVY** | Ring mail, Chain mail, Splint, Plate | the widest shoulders, the head in a helm or coif, metal over the limbs, the darkest outline; the only tier that carries the people's device | `outfit_armor_heavy__<race>` |

The state depicts the **category**, not the item: AS-CHMAP-001 says the armour state follows the worn armour category, and AS-ITEM-001 keeps one Plate Armor for everyone. So each people draws its category as the one SRD armour its folk would make, called the **archetype** below; the other items in that category wear the same drawing, and the armour icon shows the archetype. Clothes, fine and Clothes, costume are not states (fine clothes are a portrait matter, AS-VIS-001). Shields stay items and are never drawn on the map sprite (AS-HUM-017). Sex changes the cut inside the same motif (tunic and hose / kirtle and apron), never the colours or the archetype.

## 2. Readability rules (Owner: "Everything should be oriented towards readability")

These are drawing rules for the PixelLab States and acceptance rules for the PM's board review. **PM-proposed, Owner may amend.**

- **R1 Tier by silhouette.** The five states of one people must be tellable apart at 1× on the grass swatch by shape before colour. Shoulders: UNARMORED, ROBE and LIGHT keep the body width; MEDIUM adds 1 px each side on the Small canvas and 2 px on Medium and Large; HEAVY adds 2 px (Small) or 3 px (Medium, Large). Hem: ROBE reaches the ankle; every other tier ends above the knee over hose, or is a dress on the female base. Head: UNARMORED, ROBE and LIGHT show the people's head (cap, coif or hood allowed); MEDIUM adds a cap or coif with the face visible; HEAVY covers the head with a helm or coif. Race features that project (horns, tusks, ears, beard, tail, scales, hairy feet) stay visible on every tier.
- **R2 Tier by value.** The torso block of adjacent tiers differs by at least 2 grayscale levels (the AS-READ-001 formula, mean of the torso region on the south idle frame), or by the shoulder step in R1. Working ranges: cloth v5–v10 by people, leather and hide v3–v6, blackened iron and steel v2–v5, bronze v6–v10, bright steel v8–v10 with one 1-px specular line.
- **R3 Identity by hue, legibility by value.** Each people has an **identity hue** (always present, small: a hood, cap, sash, hem band or trim) and a **value accent** that does the AS-READ-001 work against the ground: at least 3 levels from the mean value of every typical ground ramp, at least 4 on the Small canvas (the 12 px rule's spirit: less area needs more contrast). They may be the same colour.
- **R4 Same-tier distinctness.** Within one canvas tier (Small: dwarf, halfling, gnome; Medium: human, elf, half-elf, tiefling; Large: dragonborn, half-orc) no two peoples share an identity hue family while their dominant values sit within 2 levels. Across tiers the canvas and silhouette already separate them, so a shared hue is allowed (halfling wheat gold and dragonborn gold; dwarf bronze and dragonborn bronze).
- **R5 The device only where there is room.** The heraldic device from `RACE_MOTIFS.md` appears on the HEAVY chest (at most 5×5 px), on shields (items) and on banners. Never on UNARMORED, ROBE, LIGHT or MEDIUM; those carry the colour, not the charge.
- **R6 One outline.** The 1 px self-tinted outline of the base stays on every state; HEAVY's is the darkest. No glow, no gradient, no specular larger than 1 px.
- **R7 The face stays.** No accent covers the face; face and hands keep skin values on every tier except under the HEAVY helm.
- **R8 Palette.** Every colour is a master-palette entry (AS-GLOBAL-004). Prompts state no hex values and no pixel counts; the post-process snap and the checker enforce the scheme, and the board is judged against it.

## 3. Colour schemes (fills `RAMP_RACE_<RACE>`)

Roles: **Dominant** (the largest cloth area), **Secondary** (hose, cloak, apron, second garment), **Identity hue** (R3), **Value accent** (R3), **Metal** (that people's armour metal at its base value) and **Leather**. All entries are master-palette colours; `v` is the AS-READ-001 grayscale level (0–15). Ground means used by the check: fertile grass 5, dry grass 5, loam 4, woodland floor 4, fieldstone 5, wet mud 3, coarse sand 6, granite 5, basalt 3.

| People | Canvas | Dominant | Secondary | Identity hue | Value accent | Metal | Leather |
|---|---|---|---|---|---|---|---|
| Human | Medium | `#BAB095` v10 oatmeal wool | `#6E7A85` v7 grey hose | `#356782` v5 woad blue | `#EDE9DE` v14 linen white | `#97A3AF` v9 bright steel | `#734F2D` v5 |
| Elf | Medium | `#5D7C68` v7 grey-green | `#435A4B` v5 moss | `#5D7C68` v7 grey-green (the cloth itself) | `#E2EFF8` v14 birch white | `#3E3E44` v4 blackened iron | `#6F5F34` v6 dark bronze-brown |
| Half-Elf | Medium | `#834A34` v5 russet | `#597C93` v7 blue-grey | `#91B3CD` v10 pale blue-grey (the hood) | `#91B3CD` v10 | `#5A5D63` v5 iron | `#734F2D` v5 |
| Tiefling | Medium | `#212325` v2 soot | `#59594F` v5 ash grey | `#F26018` v8 ember orange | `#DC906B` v10 ember light | `#3E3E44` v4 blackened steel | `#312820` v2 |
| Dwarf | Small | `#3C474F` v4 blue-grey wool | `#27272B` v2 iron black | `#A2713F` v7 bronze | `#D0995C` v10 polished bronze | `#5A5D63` v5 iron | `#583224` v4 |
| Halfling | Small | `#6C935D` v8 apple green | `#CAC0AF` v11 linen | `#F7C03D` v11 wheat gold | `#F7C03D` v11 | `#97A3AF` v9 bright steel | `#8A7653` v7 |
| Gnome | Small | `#6B5A3E` v5 earth brown | `#5B7353` v6 moss | `#B5280D` v5 cap red | `#CAC0AF` v11 linen shirt | `#59594F` v5 dull iron | `#583224` v4 |
| Half-Orc | Large | `#27272B` v2 charcoal | `#734F2D` v5 raw leather | `#C8C3B7` v11 bone | `#C8C3B7` v11 | `#212325` v2 blackened iron | `#4E2E23` v3 |
| Dragonborn | Large | `#6D1109` v3 scale (or `#26421C` green; the individual's scale) | `#A16147` v7 terracotta cloth | `#BE891B` v8 gold | `#FFB833` v11 gold highlight | `#212325` v2 black iron, `#A2713F` v7 bronze edging | `#4E2E23` v3 |

Check: `node tools/art/check_race_schemes.js` (exit 1 on any failure). Run 2026-09-29: every palette entry is in the master; every value accent clears every ground by ≥5 (Medium/Large need 3, Small needs 4); no same-tier pair clashes under R4. Dusk lavender (`#5E6A88` v6) stays an optional hood lining for the elf, not a scheme role. Heraldic tinctures on banners are unchanged (`RACE_MOTIFS.md`).

Changes to earlier files that this scheme makes: the dwarf palette in `RACE_MOTIFS.md` drops dark red and dark green for blue-grey, iron black and bronze (four peoples already lean on red: gnome cap, half-orc banner, dragonborn scale, tiefling ember); the dwarf prompts in `RACE_PROMPTS.md` change "dark-red wool tunic" and "dark-green wool dress" to blue-grey; the halfling woman's "blue wool dress" becomes apple green. The gnome's red cap is kept as the identity hue and the linen shirt does the value work. **All PM-proposed.**

## 4. Outfit motifs by people

Materials name the crosswalk §6 profiles. "Archetype" is the SRD item the state is drawn as; the other items in the category wear the same drawing.

### Human — the English village and its lord
| Tier | Archetype | The drawing | Materials | Colours | Readability |
|---|---|---|---|---|---|
| UNARMORED | Clothes, common | Man: oatmeal wool tunic to mid-thigh, grey hose, rope belt, linen coif. Woman: kirtle, linen apron, wimple and veil. A woad-blue hood or a woad-blue panel on the kirtle. | WOOL, LINEN, LEATHER | dominant oatmeal, hose grey, identity woad, accent linen | the white coif or wimple is the value accent on every human |
| ROBE | Robes | The clerk's gown: ankle-length oatmeal or grey wool gown, wide sleeves, a deep hood lined woad blue, rope girdle. No hat. | WOOL, LINEN | as above | hem hides the feet; the hood carries the blue |
| LIGHT | Studded leather (the jack) | A leather jack over the tunic with brass studs in rows; leather cap or the coif; bracers; belt with an empty sheath. Padded = the same jack quilted; Leather = plain. Blue hood down on the shoulders. | LEATHER, LINEN, BRONZE (studs) | leather v5, studs one pixel v9 | fitted torso, belt line |
| MEDIUM | Chain shirt under a woad-blue surcoat (the man-at-arms) | Mail at collar and sleeves, blue surcoat over the torso, leather bracers, kettle hat. Scale mail = bronze fish-scale torso; Breastplate and Half plate = bright steel torso with the surcoat as a hem band. | STEEL, WOOL, LEATHER, IRON (hat) | surcoat woad, mail steel v9, hat iron v5 | shoulders +2; the blue block is the tell |
| HEAVY | Chain mail (hauberk and coif) under a tabard | Blue tabard with the crowned gold lion on the chest; kettle hat or great helm; boots. Plate = white harness in bright steel with the same tabard. Ring mail = the hauberk with visible rings; Splint = strips over the tabard hem. | STEEL, WOOL, GOLD (device) | tabard woad, lion gold `#BE891B`/`#FFB833` | widest; face in shadow; the only bright-steel Medium-canvas heavy |
| Never | | plate as daily wear, pauldrons, spikes, black leather, saturated primaries | | | |

### Elf — the fair folk of the greenwood
| Tier | Archetype | The drawing | Materials | Colours | Readability |
|---|---|---|---|---|---|
| UNARMORED | Clothes, common | Man: fitted grey-green tunic to the knee, undyed grey hooded cloak, braided-rush circlet, deerskin boots. Woman: long grey-green dress, the same cloak and circlet. Pale hair and a birch-white collar. | WOOL, LEATHER (deerskin), rush | dominant and identity grey-green, moss second, accent birch white | the pale hair and collar are the value accent; the cloak hangs still |
| ROBE | Robes | The greenwood mantle: a long grey-green over-robe open at the front over tunic or dress, wide sleeves, a hood that hangs still, one line of pale braided rush at the hem; dusk-lavender lining shows only inside the hood. | WOOL, rush | as above | tall column; nothing glows |
| LIGHT | Leather | A moss-dyed deerskin jerkin laced at the front, deerskin bracers, hood up. Studded = horn studs, never brass; Padded = a quilted grey-green jack. | LEATHER, HORN | leather `#6F5F34`, horn studs v8 | slim; belt line visible |
| MEDIUM | Scale mail, dark patinated bronze | Plain fish-scale rows (never leaf shapes) over the grey-green gambeson, no pauldrons, a pale rush hem band. Chain shirt = blackened mail; Breastplate and Half plate = blackened iron. | BRONZE (patinated), IRON, WOOL | bronze `#6F5F34` with v7 edges | shoulders +2; the dark scale block is the tell |
| HEAVY | Chain mail, blackened | Blackened mail and coif under a grey-green surcoat with the white hart on the chest; a plain conical helm with no visor (ears show). Plate = blackened plate, slim, no bright steel anywhere. | IRON (blackened), WOOL | surcoat grey-green, hart `#E2EFF8` | the one slim, dark heavy on the Medium canvas |
| Never | | glowing runes, leaf-shaped armour, silver filigree, bright mithral shine, crystal | | | |

### Half-Elf — the border people
| Tier | Archetype | The drawing | Materials | Colours | Readability |
|---|---|---|---|---|---|
| UNARMORED | Clothes, traveler's | Human cut: russet tunic and hose (man) or russet kirtle (woman), a pale blue-grey hood, leather belt with a pouch, turnshoes. | WOOL, LEATHER | dominant russet, hose blue-grey, identity and accent the pale hood | the pale hood is both identity and value accent |
| ROBE | Robes | The traveller's robe: ankle-length russet robe split front and back for walking, a satchel strap across the chest, the pale hood; boots show in the walk. | WOOL, LEATHER | as above | column with a strap line |
| LIGHT | Studded leather | A human leather jack with brass studs and elven deerskin bracers; hood up. | LEATHER, BRONZE (studs) | leather v5 | fitted; the mixed kit is the motif |
| MEDIUM | Chain shirt under a russet jerkin | Mail shows only at collar and sleeves (the scout hides the shine), leather bracers, the pale hood. Hide = a russet hide jerkin with a fur collar; Breastplate = blackened iron under the jerkin. | STEEL, LEATHER, HIDE | mail v9 at the edges only | shoulders +2 |
| HEAVY | Splint | Iron strips riveted on russet leather, a kettle hat, the pale hood over the shoulders, the leaf-and-spearhead in pale on the chest strip. Plate = human bright plate with a russet tabard. Ring and Chain mail = russet-backed. | IRON, LEATHER | strips `#5A5D63`, device `#91B3CD` | the only strip-on-leather heavy on the Medium canvas |
| Never | | a third invented style; anything neither human nor elf would make | | | |

### Dwarf — the smiths of the northern isles
| Tier | Archetype | The drawing | Materials | Colours | Readability |
|---|---|---|---|---|---|
| UNARMORED | Clothes, common | Broad blue-grey wool tunic (or dress), a leather smith's apron, hobnailed boots; bronze belt buckle and beard or braid rings; iron-black hair. | WOOL, LEATHER, BRONZE | dominant blue-grey, second iron black, identity bronze, accent polished bronze | the apron is the signature garment |
| ROBE | Robes | The priest-smith's gown: heavy blue-grey wool, square-cut, a hood, an apron front, bronze clasps. | WOOL, BRONZE | as above | short and broad; still a column |
| LIGHT | Leather | The smith's heavy leather doublet with bronze rivets, leather cap, bracers. Studded = the rivets; Padded = quilted wool under the apron. | LEATHER, BRONZE | leather `#583224` | broad; belt line |
| MEDIUM | Scale mail, bronze | Bronze lamellar rows over the blue-grey tunic, an iron nasal helm. Breastplate = bronze; Chain shirt = iron mail; Hide = a sealskin jerkin. | BRONZE, IRON | scale `#A2713F` with `#D0995C` edges | shoulders +1 (Small canvas) |
| HEAVY | Splint | Vertical iron strips with bronze edging, an iron spangenhelm with a nasal, the beard out over the chest; the hammer in bronze on a cobalt square. Plate = iron plate with bronze edging, blocky. Chain mail = iron mail (beard into the coif). | IRON, BRONZE | strips `#5A5D63`, edging bronze, device on `#356182` | the beard on the chest is the tell; never a horned helm |
| Never | | gold-and-gem opulence, tartan, horned helms, a short human | | | |

### Gnome — the hedgerow folk
| Tier | Archetype | The drawing | Materials | Colours | Readability |
|---|---|---|---|---|---|
| UNARMORED | Clothes, common | Red felt cap, brown leather jerkin over a linen shirt, patched breeches, small boots. Woman: brown dress, patched linen apron, the red cap. | WOOL, LINEN, LEATHER | dominant earth brown, second moss, identity cap red, accent linen | the cap is always on; the linen does the value work |
| ROBE | Robes | The hedge-wise gown: brown or moss wool gown patched at the hem, a collar (no hood: it would hide the cap), dried herbs at the belt. | WOOL | as above | tiny column |
| LIGHT | Padded | A quilted jack of patched cloth, quilting lines showing, leather bracers, the red cap. Leather = a small leather jerkin; Studded = iron nail-heads. | LINEN, LEATHER, IRON | quilt brown, lines v3 | fitted; belt line |
| MEDIUM | Chain shirt, traded | A mail shirt a size too big, sleeves rolled, over the patched jack; the red cap. Hide = a badger-pelt jerkin; Breastplate = a dull iron plate strapped over. | IRON, HIDE | dull iron `#59594F` | shoulders +1; the badger stripe is a value tell for hide |
| HEAVY | Ring mail | Iron rings sewn on leather, a small iron kettle hat with a red band, the gold acorn on brown at the chest. Plate = small dull iron plate, blocky. Chain and Splint = ringed or stripped over the same leather. | IRON, LEATHER, GOLD (device) | rings v5 on leather v4, band `#B5280D` | the red band keeps the identity under the helm |
| Never | | gears, goggles, clockwork, garden-gnome kitsch | | | |

### Halfling — the village at harvest
| Tier | Archetype | The drawing | Materials | Colours | Readability |
|---|---|---|---|---|---|
| UNARMORED | Clothes, common | Linen shirt, apple-green waistcoat, brown breeches, bare hairy feet, cloth cap; wheat-gold buttons and cap band. Woman: apple-green dress, linen apron, shawl, a gold hair ribbon. | LINEN, WOOL | dominant apple green, second linen, identity and accent wheat gold | bright and high-value; feet bare on every tier but HEAVY |
| ROBE | Robes | The parson's or goodwife's gown: apple-green wool with a linen collar and a wheat-gold hem band, a shawl. | WOOL, LINEN | as above | round column; bare feet |
| LIGHT | Leather | A leather waistcoat-jack over the shirt (the waistcoat silhouette stays), gold stitching, bracers. Padded = quilted waistcoat; Studded = brass studs. | LEATHER, LINEN | leather `#8A7653` | fitted; the waistcoat line is the tell |
| MEDIUM | Breastplate | A bright steel breastplate strapped over the green waistcoat, leather bracers, cloth cap. Chain shirt = under the waistcoat; Hide = a sheepskin jerkin; Scale = bronze. | STEEL, LEATHER, HIDE | steel `#97A3AF` | shoulders +1 |
| HEAVY | Chain mail | Mail and coif, a kettle hat, a green tabard with the gold wheat sheaf; boots (the one shod tier). Plate = bright steel, round-bellied cuirass. | STEEL, WOOL, GOLD (device) | tabard green, sheaf gold | the small bright round heavy |
| Never | | grim colours, tall thin forms, martial props on the house | | | |

### Half-Orc — the marcher folk
| Tier | Archetype | The drawing | Materials | Colours | Readability |
|---|---|---|---|---|---|
| UNARMORED | Clothes, common | Sleeveless leather jerkin over a charcoal wool tunic, wool hose, heavy boots; bone toggles and a tusk lashing at the belt; forearms bare and scarred. | WOOL, LEATHER, BONE | dominant charcoal, second raw leather, identity and accent bone | the bone toggles are the value accent on the dark cloth |
| ROBE | Robes | The marcher hermit's robe: heavy charcoal wool, a hide mantle at the shoulders, bone toggles, hood back so the tusks show. | WOOL, HIDE, BONE | as above | wide column |
| LIGHT | Leather | A thick boiled-leather cuirass, sleeveless, arms bare, raw-leather bracers. Studded = bone studs; Padded = a quilted charcoal jack. | LEATHER, BONE | leather `#4E2E23` | belt line; bare arms |
| MEDIUM | Hide | The boar-hide harness: thick pelt over shoulders and chest, raw-leather straps, a bone-plate chest piece. Chain shirt = under the hide; Breastplate = blackened iron; Scale = iron. | HIDE, LEATHER, BONE, IRON | fur v4–v5, bone plate v11 | shoulders +2; fur texture is the tell |
| HEAVY | Ring mail | Iron rings on charcoal leather, an iron spangenhelm with a boar-tusk decal and no visor, bone-white edging, the boar's head in bone on the chest. Plate = blackened iron plate, square and wide. | IRON (blackened), LEATHER, BONE | rings `#212325`, edging `#C8C3B7` | the widest dark heavy; tusks always visible |
| Never | | skull piles, spikes, scrap-metal chaos (goblin), the green-skinned savage | | | |

### Dragonborn — the heraldic wyrm made flesh
| Tier | Archetype | The drawing | Materials | Colours | Readability |
|---|---|---|---|---|---|
| UNARMORED | Clothes, common | Plain terracotta wool tunic (or dress) with a leather belt, bare clawed feet, scales at neck, tail and limbs, a bronze-and-gold collar band and arm-ring. | WOOL, LEATHER, BRONZE, GOLD | dominant the scale, second terracotta, identity gold, accent gold highlight | the collar band is the value accent |
| ROBE | Robes | The hall robe: long terracotta robe with a bronze-and-gold border at hem and cuffs, a high collar behind the neck, no hood (horns), open at the tail. | WOOL, BRONZE, GOLD | as above | tall column |
| LIGHT | Studded leather | Dark terracotta leather cut for the tail, bronze studs in rows, bronze bracers. Leather = plain; Padded = quilted terracotta. | LEATHER, BRONZE | leather `#4E2E23`, studs bronze | slim and tall |
| MEDIUM | Scale mail, bronze | Plain bronze rows echoing the body's own scales over terracotta, a bronze gorget on the long neck. Chain shirt = blackened; Breastplate and Half plate = bronze with a gold rim. | BRONZE, GOLD, WOOL | scale `#A2713F` | shoulders +2 |
| HEAVY | Plate | A black-iron harness with bronze edging, segmented tail armour, a helm shaped to the wedge head with horn cut-outs, the gold dragon on the chest. Splint = iron splints with bronze rivets; Chain and Ring mail = blackened with a terracotta tabard. | IRON (black), BRONZE, GOLD | plate `#212325`, edging `#A2713F`, device `#BE891B` | the tall black-and-bronze heavy; tail and horns are the tell |
| Never | | the broad-chested western dragon-man, feathers, neon, a human helm | | | |

### Tiefling — the devil on the church wall
| Tier | Archetype | The drawing | Materials | Colours | Readability |
|---|---|---|---|---|---|
| UNARMORED | Clothes, common | Black wool tunic (or long dress), an ember-orange hood that sits behind the horns, leather belt, ash-grey hose, turnshoes; tail visible. | WOOL, LEATHER | dominant soot, second ash, identity ember, accent ember light | the hood is the identity; its lining and the cuffs are the value accent |
| ROBE | Robes | The chantry robe: long black robe, a deep hood cut for the horns, ember lining at hood and sleeve ends, a dull-gold clasp, the tail from the slit. | WOOL, GOLD (dull) | as above | column; the ember edge reads at 1× |
| LIGHT | Leather | A black leather hooded jack with ember stitching and horn cut-outs. Studded = dull-gold studs; Padded = black quilt with ember lining. | LEATHER, GOLD | leather `#312820` | slim; belt line |
| MEDIUM | Chain shirt, blackened | Under a black surcoat with an ember hem band, an ash-grey coif cut around the horns. Breastplate = blackened steel with an ember rim; Scale = blackened. | STEEL (blackened), WOOL | mail `#3E3E44`, band `#F26018` | shoulders +2 |
| HEAVY | Plate, blackened | Blackened steel with ember-orange edging, a helm with horn cut-outs, the crossed horns over flame in dull gold on the chest. Chain mail = black mail, black surcoat, ember band. | STEEL (blackened), GOLD (dull `#9C8449`) | plate `#3E3E44`, edging `#F26018` | the dark heavy with the warm edge; horns are the tell |
| Never | | purple skin, glamour, neon magic, spikes | | | |

## 5. The nine heavies at a glance

| People | Canvas | Metal | Edge or cloth | The tell |
|---|---|---|---|---|
| Human | Medium | bright steel | woad tabard, gold lion | kettle hat or great helm |
| Halfling | Small | bright steel | green tabard, gold sheaf | small and round; the only shod halfling |
| Elf | Medium | blackened | grey-green surcoat, white hart | slim; ears out of a plain helm |
| Tiefling | Medium | blackened steel | ember edging, dull-gold horns device | horns through the helm |
| Half-Elf | Medium | iron strips on russet leather | pale hood | strip texture, no full metal |
| Dwarf | Small | iron splint | bronze edging, hammer on cobalt | the beard on the chest |
| Gnome | Small | ring mail | red helm band, gold acorn | tiny; rings on leather |
| Half-Orc | Large | blackened iron rings | bone edging, boar's head | widest; tusks |
| Dragonborn | Large | black iron plate | bronze edging, gold dragon | tail armour, horn cut-outs |

## 6. Prompt lines

Each base prompt in `docs/art/RACE_PROMPTS.md` already ends with the people's motif line and the AS-LOOK-002 style tail. Armour states are PixelLab States of that base; each State prompt is `same figure, same face, same palette, now wearing ` plus the tier's drawing line from §4, then the tail. The lines are in `RACE_PROMPTS.md` → Armour states. Prompts carry no hex values and no pixel counts (R8).

## 7. Checks

- `tools/art/check_race_schemes.js` (exists, run 2026-09-29, exit 0): every scheme entry is a master-palette colour; the value accent clears every typical ground ramp by the R3 step; no R4 clash. It fails with exit 1 on any breach.
- `tools/art/check_outfit_tiers.js` (**proposed, not written**): on a generated set, measure the torso mean value per state on the south idle frame and the shoulder width per state, and fail on any adjacent pair that breaks both R1 and R2; measure the identity-hue presence (at least 4 px of the identity colour) on every state; fail on a device pixel group on any state but HEAVY.
- The PM's board review (DEC-007 amendment, PM visual review) checks R1–R7 by eye and names the rule when it rejects.

## 8. Decisions needed from the Owner

1. The nine colour schemes (§3), which fill `RAMP_RACE_<RACE>`.
2. The dwarf palette change (dark red and dark green → blue-grey, iron black, bronze) and the halfling woman's dress (blue → apple green).
3. The archetype picks (§4) and the device-only-on-HEAVY rule (R5).
4. The checker thresholds: R2 two levels, R3 three levels (four on Small), R4 same family within two levels.
5. Whether Clothes, fine gets a portrait-only treatment or nothing.
