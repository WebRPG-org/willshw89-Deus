# WG.20.01 lane-al report

Writer: grok. Reviewer: gemini, not this lane. This report does not certify the work.

No art was generated. No image prompts. Deliverables are markdown, JSON and Node.

## Files

- `docs/art/DEUS_ASSET_STANDARD.md` — normative standard, 119 rule ids, appendices A–C.
- `game/data/UF_AssetStandard.json` — `schemaVersion` `deus-asset-standard/1.1.0`. Same 119 rule ids. `outfitMatrix` length 135. `summons` length 29.
- `game/data/UF_SpellVisualTable.schema.json` — JSON Schema draft 2020-12 (`$schema` is `https://json-schema.org/draft/2020-12/schema`). Six example rows: Fire Bolt, Fireball, Cone of Cold, Lightning Bolt, Shield, Cure Wounds. Not the 319-spell table.
- `tools/art/validate_asset_standard.js` — coverage checker. Reads the catalogue, the standard, the spell schema and `game/data/srd51/spells.json`. Does not write files and does not read pixels.
- `tools/art/test_validate_asset_standard.js` and `tools/art/fixtures/asset_standard/**` — each check has a passing case and a mutant that the check must reject.
- `tasks/WG.20.01/lane-al/BRIEF_ADDENDUM_A1.md` — Owner addenda A1–A9. A1–A6 were already in the standard at the PM merge. This resume adds A7–A9 and the later amendments, in the Addendum A1 section below.

`art/catalogue/**` was not modified.

## Addenda applied

- **A1 (12:41 CT).** 9 races × 15 outfits = 135 art variants of race-neutral outfit ids. Shared light / medium / heavy silhouettes. Pose grid is marked **PM-proposed, Owner may amend**. Weapon angles are eight pre-drawn cels. Deforming pieces (cape, long robe, large shield, bow mid-draw) have a frame for every pose.
- **A2 (12:42 CT).** Per-race face background. Seven-layer stack. Expressions 0–7 in fixed order on the 144 px, 4×2 sheet. Anchors recorded; collar line y = 108 matches the current portrait baker.
- **A3 (12:43 CT).** One item id per SRD item. Art key `<itemId>__<race>`, fallback `__human`, then nothing. The 135 outfits are variants, not new items.
- **A4 (12:46 CT).** One 32×32 icon grid, 16 columns. Rarity is an overlay. Resource nodes have four states, a harvest animation, a drop, and six biome variants. Animation is the default. Static assets name a closed exception. Clock is 150 ms.
- **A5 (12:49 CT).** 29 entity spells derived from `game/data/srd51/spells.json` (see below). Each has summon-in, dismiss and a controller marker.
- **A6 (12:52 CT).** Remains, drawn carry (replaces V89 for this standard), vehicles and riding poses, body-variety loci, child and working stooped elder, drawn night plus an optional crisp tint hook with blur forced off, world map / minimap / banners, readable props, accessibility minimum 16 px, file-name patterns and a style-bible spec with no image.

## Summon derivation

Source: `game/data/srd51/spells.json`, `kind === "spell"` (319). Fields: `name`, `data.description`, `data.atHigherLevels`. Creature ids: `game/data/srd51/creatures.json` by exact name.

Include when the name starts with `Conjure `, `Animate ` or `Wall of `, or the name is in the named list in the standard, or the description matches `you conjure` or `you summon`. Exclude Gate (a portal), Magnificent Mansion (a dwelling) and Web (a cube of webbing), because those sentences do not create a creature or a field token.

Count: **29**. Category spells keep one slot and the sim picks the stat block at cast. Find Familiar's 15 forms and Find Steed's 5 forms are creature ids that exist in `creatures.json`. Create Undead's higher-level sentence names ghast, wight and mummy.

## Reconciliation

Owner rulings win. The full conflict list is Appendix A in the standard and the copy below. In short: DEC-030's six biomes, five depth bands and 15 transitions replace five biomes, 25 sets and 10 transitions. DEC-013's 32 layers, 5 ft cell, 10 ft layer and nine races stay; its band ranges do not. DEC-011 forbids filters; the 12:52 night hook is the only tint, and blur stays off. Four directions (12:38) replace 8-way sheets. Spell composition (12:39) replaces per-spell animations. Carry is drawn. `uf.hex` is the runtime palette now; the master palette is the target (ADR-002). The scale chart is the registry plus the strip (DEC-016).

The charter's 58 logical-action tokens are mapped onto the required rows. The brief's "45" is the subset that also sits on families F01–F14. The crosswalk's 7×17 spell taxonomy is kept as aliases of the four-phase composition. The material heading says 18 and the list names 20; icon slots use the 20 names.

## Catalogue coverage

`node tools/art/validate_asset_standard.js --json` against `art/catalogue/catalogue.json`. The shell redirect stored UTF-16; the summary object is the same as the text run below. Default exit is 0. `--strict` would exit 1 because of the 11 legacy filenames. Nothing was written under `art/` or `game/img/`.

Entry status is violate if any rule violates, otherwise unknown if any rule is unknown, otherwise pass. Most entries are unknown because animation rows are not on the catalogue record, or because the band id is still a DEC-013 token (`LOWER2`, `TEMP`, and the rest). That is a coverage gap, not a pass.

```
entries 10089 pass 216 violate 11 unknown 9862
rule-results pass 10926 violate 11 unknown 9921
global-violations 0
```

Per category (entries, pass, violate, unknown):

| Category | Entries | Pass | Violate | Unknown |
|---|---:|---:|---:|---:|
| CHARACTER | 47 | 0 | 0 | 47 |
| CONNECTOR | 42 | 7 | 0 | 35 |
| CREATURE | 48 | 0 | 0 | 48 |
| DECAY | 100 | 0 | 0 | 100 |
| EDGE | 3480 | 0 | 0 | 3480 |
| EFFECT | 4 | 4 | 0 | 0 |
| EQUIPMENT | 34 | 27 | 7 | 0 |
| FACE | 52 | 48 | 4 | 0 |
| FLORA | 22 | 0 | 0 | 22 |
| FURNITURE | 9 | 9 | 0 | 0 |
| HANGING | 30 | 0 | 0 | 30 |
| ITEM | 61 | 61 | 0 | 0 |
| LIGHT | 20 | 0 | 0 | 20 |
| RAMP | 2900 | 0 | 0 | 2900 |
| RAMPSIDE | 2900 | 0 | 0 | 2900 |
| REMAINS | 4 | 3 | 0 | 1 |
| RIMSHADOW | 20 | 0 | 0 | 20 |
| SHADE | 25 | 0 | 0 | 25 |
| STONE | 12 | 6 | 0 | 6 |
| STRUCTURE | 21 | 21 | 0 | 0 |
| TERRAIN | 42 | 14 | 0 | 28 |
| TOP | 145 | 0 | 0 | 145 |
| TREE | 16 | 0 | 0 | 16 |
| VEIN | 4 | 4 | 0 | 0 |
| WALLFACE | 30 | 0 | 0 | 30 |
| WATER | 10 | 1 | 0 | 9 |
| WORKSHOP | 11 | 11 | 0 | 0 |

The 11 violations are all **AS-STYLE-001**, legacy filenames that predate `<itemId>__<race>` and `UF_Faces_<race>_<n>`:

- `$UF_Layer_bow_short.png`, `$UF_Layer_club.png`, `$UF_Layer_shield_wood.png`, `$UF_Layer_spear.png`, `$UF_Layer_stone_axe.png`, `$UF_Layer_stone_knife.png`, `$UF_Layer_stone_pick.png`
- `UF_Faces_Human_Female_Adult.png`, `UF_Faces_Human_Female_Elder.png`, `UF_Faces_Human_Male_Adult.png`, `UF_Faces_Human_Male_Elder.png`

Globals all passed: 135 outfits, child and working elder, 29 summon spells, spell-schema examples, six banners, four readable props, night hook off with blur false, remains set.

## Gate output

`node tools/art/test_validate_asset_standard.js`

```
RESULT: 94 passed, 0 failed
```

The run printed `PASS` for every good case and every mutant (94 lines) and then that result line. Exit 0.

`node tools/check_deus_syntax.js`

```
Checked 52 DEUS plugin files. Errors: 0
```

Exit 0. This lane did not edit any plugin.

## Appendix A (copy)

Owner rulings win.

1. Five biomes (identity standard line 49; palette standard line 44; worldgen WBS OD-6) vs DEC-030's six: VOLCANIC, WET, ARID, TEMPERATE, COLD, WILD.
2. The lattice and the overworld production charter count a different six (Temperate, Wetland, Arid, Highland, Cold, Volcanic). Highland is a depth band. WILD is a biome. DEC-030 wins.
3. DEC-013's 25 pipeline biomes vs DEC-030's 30.
4. Ten transitions (identity standard line 286) vs fifteen DEC-030 pairs. The lattice's fifteen pairs are the wrong set.
5. The five-Z model (Z+2..Z−2) vs 32 layers. A 9-layer test may remain. It is not the world.
6. DEC-013 band ranges (Lower-2 −16..−9 through Upper-2 +10..+15), still in `geometry.json`, vs DEC-030 Deep Earth through Highlands, air reserved at +12..+15.
7. V64 / OSRS combat text in VISION and several design docs vs DEC-027. SRD 5.1 wins. V64 is retired.
8. Eight-way sheets (VISION V3, AR-600, RMMZ asset spec lines 49 and 101, generator prompts rule 10) vs Owner 12:38. Four directions, rows S, W, E, N. Diagonals are mined, not standard. Movement code that stays 8-direction is not a sheet rule.
9. Alpha, tint, ColorMatrix, LUT seasons, additive VFX and blur vs DEC-011. Drawn frames and ramps win. The 12:52 night hook allows optional per-pixel or per-tile tint, blur off, default off.
10. Invisible at 20% alpha and poisoned as a tint pulse (charter and crosswalk) vs a drawn contour and a drawn ramp.
11. Giant sockets "scaled by 2.0×" vs authored large frames.
12. The generator's east-from-west mirror vs authored asymmetrical gear.
13. F14 left unsplit vs a requirement that sleep, prone, unconscious and dead are different frames. The family id is still open.
14. `DEUS_Anim` ignores `carry` (V89) vs A6. Carry is drawn. The plugin was not edited.
15. Face layout of adult/elder by sex vs the eight expression indexes.
16. Eleven painted face cultures vs nine races. Classification of the extra cultures is open.
17. `uf.hex` is canonical for runtime now. The master hex is the target. The catalogue path points at the master file. Ramp ids are the vocabulary.
18. Crosswalk 7×17 spell profiles vs the four-phase composition. Older names are aliases.
19. Material heading says 18. The list names 20. Icons use the 20.
20. Worldgen WBS `BIOME_Z_...` vs catalogue `BAND_BIOME_...`. This standard uses the six-field catalogue pattern with DEC-030 tokens.
21. `geometry.json` marks `LARGE_LONG` proposed. The lane brief requires 96×48. This standard adopts 96×48 and does not edit geometry.
22. No snow biome (identity standard line 42) vs a required drawn snow weather overlay. Weather is not a biome. The look of COLD is open.
23. Charter: children do not do heavy labour. The child template still has the work rows.
24. WG.00.01 visual charter, WG.00.02 48 px 1:1, WG.00.03 42 px human, WG.00.04 five biomes (superseded), WG.00.05 palette target.

## Appendix B (copy)

Not answered.

1. Face cultures that are not the nine races (goblin, orc, lizardfolk, kobold, undead, starborn, swarm, automaton-like-starborn, plus skin aliases serpentkin, demon, swarmer, dark_dwarf, dark_gnome): full humanoid paper-doll, or the monster set?
2. How many age steps, and is there a teen stage? Child, adult and a stooped working elder are required. Infant and adolescent stay in the charter and are not frozen here.
3. Dedicated WBS leaves for this standard and the per-category follow-ups. No id is minted.
4. Also open: the look of COLD and of WILD; where `HIGH_*` ramps go; Huge and Gargantuan frame multiples; balding-mask count; dragonborn scale-colour steps; whether DEC-016's chart means a different file; which race lives on which layer; whether `TALL_MEDIUM` and the small-race readability floor turn on; whether F14 stays one family id; how remembered fog is drawn without a desaturation filter.

Four directions are decided. They are not an open question.

## Appendix C (copy)

| What exists | Count | Notes |
|---|---:|---|
| Catalogue sheets / entries | 207 / 10089 | Ids match the six-field shape. Bands are pre-DEC-030. 9792 MISSING, 196 EXISTING_UNAPPROVED, 52 STAND_IN, 49 STOCK. |
| Character / creature / equipment / face | 47 / 48 / 34 / 52 | Character, creature and equipment facings in the catalogue are already S, W, E, N. |
| Paper-doll rows | 34 | legs 1, torso 2, head 3, back 4, shield 5, held 6. Human male T0 × 28, human female T0 × 6. |
| Sidecars | 688 JSON | 157 have eight facings. Legacy. Mine S, W, E, N. |
| `$gen_*` PNGs | 474 files, 242 names | Pool is 116 human keys. Baker order: skin, cloth, hair, beard. East is mirrored. |
| `UF_Faces_*` | 37 PNGs | Old layout, not the eight expressions. |
| `$UF_Layer_*` | 24 PNGs | No `__<race>` suffix. |

Reusable: 48 px grid, 3×4 S/W/E/N charsets, 144 face cells, paper-doll z-order, 18-slot order, 42 px human, SRD ids. Legacy: 8-way sidecars, `$gen_*` mirrors, layer names without a race, old face layout, DEC-013 band ids.

## Follow-ups

No WBS ids. No art.

- `PROPOSED-AL-01` — regenerate catalogue ids onto DEC-030 bands and biomes.
- `PROPOSED-AL-02` — mine the 157 eight-way sidecars down to S, W, E, N.
- `PROPOSED-AL-03` — generator parts for nine races, hair-back, greying ramps, racial parts, no east mirror.
- `PROPOSED-AL-04` — body templates beyond human T0, and the 135 outfit layers.
- `PROPOSED-AL-05` — rename layer and face files to the patterns in AS-STYLE-001.
- `PROPOSED-AL-06` — fill the 319 spell-visual rows. Stay out of Lane V's `docs/schemas/spells/**` and `tools/spells/**`.
- `PROPOSED-AL-07` — add the new ramp ids to the palette registry.
- `PROPOSED-AL-08` — faction piece kits for the six profiles.
- `PROPOSED-AL-09` — resource-node states for six biomes.
- `PROPOSED-AL-10` — child and working-elder templates.
- `PROPOSED-AL-11` — the WBS leaves in Appendix B item 3, when the Owner wants them.

## Addendum A1

Resume on `task/lane-al` after the PM merge `ad674159` (writer tip `dc6696e9` is an ancestor). No art was generated. No image prompt was run. `promptSpecTemplates` is a field list with sources. `prosePrompt` is null.

A1 through A6 were already encoded (135 outfits, face stack, race-neutral item ids, icon grid, 29 summon rows, remains, carry, vehicles, child and working elder, night hook, map, props, file names). This pass keeps those gates and applies A7, A8 and A9. Later rulings amend earlier sentences. They do not delete the old rule ids.

- **A1, amended by A9.** The 135 outfit ids stay race-neutral. Pixels are custom per race (`pixels: custom-per-race`). The silhouette name is the slot pattern. Weapons, tools and accessories are one silhouette, a race ramp and a decal slot (**AS-GEAR-001**).
- **A7 (12:56 and 12:57 CT).** Eleven player-selectable window skins: `deus`, `deus-dark`, and one per race. RMMZ 192×192 regions, opaque pixels. Religion pieces with an open deity list (no invented pantheon). Farming stages, food, underground kit, traps, lore visuals, optional event scenes, designation overlays. Marketing is a later note, `required: false`.
- **A8 (12:59, 13:01, 13:02, 13:03 CT).** Tamed and bound art, cages and pens. No creature equipment slots, no barding, no crafted creature gear. Collar, saddle and harness are visual markers with no slot and no stats; whether they are wanted at all is Appendix B. Variety floors for six biomes and for `DEEP` and `CAVERN`. Hair 12 per body type, 3 balding overlays, 8 facial-hair parts plus `dwarf-plait`, face-gene counts. Seasons on variety pieces are palette-swap frames (PM, Owner may amend). Every non-face entity needs an icon and a 144×144 portrait.
- **A9 (13:14 through 13:24 CT).** Head grid of 12 frames and a head anchor on every body frame (236 frames). Elder reuses adult garb, gear and hair via offsets. Mirror is an offline W-to-E bake of a symmetric, light-neutral layer. Pose rows prone, unconscious, sleep, sit, sneak, climb. **AS-BIOME-005** flags a canonical biome set that is not the six DEC-030 ids. Creature squares from 1×1 through 4×4, largest sheet 768×768. Slot templates and a 2048 atlas (42×42). Pipeline rejects off-size output and does not scale. Field templates, generation log, yield, template versions, generator adapters, routing and a golden test set are schemas. Generators are `unassigned`. Style tune is optional and later. No registry, catalogue or tool file outside `allowedPaths` was edited.

`game/data/DEUS_BiomeRegistry.json` and `docs/art/DEUS_BiomeRegistry.json` still list `TEMP`, `WET`, `ARID`, `HIGH`, `VOLC`. Catalogue `biomes.canonical` is the same five, and all 10,089 entry biome tokens are `SHARED`. The checker reports those three lists. It does not rewrite them. Mapping `HIGH` and `WILD` is Appendix B, not a guess in this lane.

Catalogue rows that have no icon or portrait field are `unknown` for **AS-PORT-001**, not a pass. That moved 139 former passes (items, equipment that already passed, structures, furniture, workshops, veins, and the stone rows that had passed) into unknown. The 11 filename violations are unchanged.

### Catalogue coverage (this pass)

`node tools/art/validate_asset_standard.js` against `art/catalogue/catalogue.json`. Exit 0. `--json` carries the same summary object. `--strict` would exit 1 because violations are non-zero (11 filenames plus 3 biome-set globals). Nothing was written under `art/` or `game/img/`.

```
entries 10089 pass 77 violate 11 unknown 10001
rule-results pass 10985 violate 11 unknown 10195
global-violations 3
global violate AS-BIOME-005 game/data/DEUS_BiomeRegistry.json canonical TEMP,WET,ARID,HIGH,VOLC
global violate AS-BIOME-005 docs/art/DEUS_BiomeRegistry.json canonical TEMP,WET,ARID,HIGH,VOLC
global violate AS-BIOME-005 catalogue canonical TEMP,WET,ARID,HIGH,VOLC
```

| Category | Entries | Pass | Violate | Unknown |
|---|---:|---:|---:|---:|
| CHARACTER | 47 | 0 | 0 | 47 |
| CONNECTOR | 42 | 7 | 0 | 35 |
| CREATURE | 48 | 0 | 0 | 48 |
| DECAY | 100 | 0 | 0 | 100 |
| EDGE | 3480 | 0 | 0 | 3480 |
| EFFECT | 4 | 4 | 0 | 0 |
| EQUIPMENT | 34 | 0 | 7 | 27 |
| FACE | 52 | 48 | 4 | 0 |
| FLORA | 22 | 0 | 0 | 22 |
| FURNITURE | 9 | 0 | 0 | 9 |
| HANGING | 30 | 0 | 0 | 30 |
| ITEM | 61 | 0 | 0 | 61 |
| LIGHT | 20 | 0 | 0 | 20 |
| RAMP | 2900 | 0 | 0 | 2900 |
| RAMPSIDE | 2900 | 0 | 0 | 2900 |
| REMAINS | 4 | 3 | 0 | 1 |
| RIMSHADOW | 20 | 0 | 0 | 20 |
| SHADE | 25 | 0 | 0 | 25 |
| STONE | 12 | 0 | 0 | 12 |
| STRUCTURE | 21 | 0 | 0 | 21 |
| TERRAIN | 42 | 14 | 0 | 28 |
| TOP | 145 | 0 | 0 | 145 |
| TREE | 16 | 0 | 0 | 16 |
| VEIN | 4 | 0 | 0 | 4 |
| WALLFACE | 30 | 0 | 0 | 30 |
| WATER | 10 | 1 | 0 | 9 |
| WORKSHOP | 11 | 0 | 0 | 11 |

The other global checks passed, including 135 outfits, 29 summon spells, 11 skins, gene counts, the 12-frame head grid, 236 elder offsets, and the field templates.

### Gate output (this pass)

`node tools/art/test_validate_asset_standard.js`

```
RESULT: 171 passed, 0 failed
```

Exit 0. Each check printed `PASS` for the good record and for the mutant (171 lines) before that result line.

`node tools/check_deus_syntax.js`

```
Checked 52 DEUS plugin files. Errors: 0
```

Exit 0. This pass did not edit a plugin.

### Follow-ups added

- `PROPOSED-AL-12` — biome registry and catalogue canonical-set fix to the six DEC-030 ids. Do not guess `HIGH` → `COLD` or a source token for `WILD` here.
- `PROPOSED-AL-13` — sizing manifest, blank template generator, slot map, atlas packer and lookup file.
- `PROPOSED-AL-14` — generation log, yield store, and routing re-benchmark on the golden test set.
- `PROPOSED-AL-15` — icon and 144 px portrait for every non-face entity.
- `PROPOSED-AL-16` — the 11 window skins and the hair, balding and face-gene part expansion.

## Addendum A9b

Resume on `task/lane-al` at `5acdaefa`, the addendum brief on top of `origin/main` `2fb1bc92`. This pass is Owner items 12–15 only. The A1–A9 rules already on main stay. No art was generated. No image prompt was run. No PNG was written.

- **Item 12 (13:30–13:37 CT).** **AS-SRC-001**, **AS-REPO-001**, **AS-PREVIEW-001**, **AS-GEN-005**. A paper-doll layer is one sheet per design: all 30 action rows, 16 by 30 squares, 768 by 1440. RMMZ-native sizes stay: charset 576 by 384, faces 576 by 288, SV battler 576 by 384, tileset B–E 768 by 768, balloon 384 by 720, window 192 by 192. No source side is over 2048 px. Large and larger creature rows stay strips. The blank template committed here is that geometry plus the 480-cell slot map for `paperdoll:elf:f:hair:07`. The pixels are not in the repo (DEC-007). Approved art is Git LFS under `art/approved/**`. Raw generations, rejects and logs stay out. Putting those patterns into Git is `PROPOSED-AL-17`. Every generated asset is previewed in an animated in-game 1:1 scene and needs an Owner yea before merge. One generator per category, and one generator id per layered set. A named roster is 2 or 3 generators. The roster in this file is empty (`unassigned`), the same posture as **AS-GEN-004**. A set that mixes two ids fails now.
- **Item 13 (13:50 CT).** **AS-SEX-001**, **AS-SEX-002**. Each of the nine races has a male and a female adult body, a male and a female elder body, and its own child body. Hair, beards and face bases are per sex. The 135 outfits are drawn on `adult-male`, `adult-female` and `child` (`outfitId__race__body`). Elder garb stays the adult sheet of the same sex (**AS-ELDER-001**). A creature is `sexVariant` `none` or `dimorphic`. Dimorphic requires a male set and a female set, each with `base`, `tamed` and `saddle`. A sex set on a `none` creature fails. Exact-name check of `game/data/srd51/creatures.json` (317 entries): Lion, Deer, Elk, Giant Elk, Boar, Giant Boar, Goat, Giant Goat, Draft Horse, Riding Horse, Warhorse, Pony, Elephant, Mammoth, Baboon and Ape are in that file once each, and each is a beast. Cattle, Sheep, Pig, Chicken and Duck are not in that file. Wolf is the `none` sample. Adding another dimorphic name is Appendix B.
- **Item 14 (13:56 CT).** **AS-ID-001**. Every slot has a permanent unique human-readable id. The committed example is `CH.HAIR.ELF.F.07.WALK.D.F2` at column 2, row 1. Grammars cover charset layers, faces, creatures (including sex), icons, portraits, tiles, buildings, effects and UI. Retired id `CH.HAIR.ELF.F.06.WALK.D.F0` stays reserved. The runtime and the packer resolve by id only. Each id links to a catalogue id, a sheet, a cell, an anchor and a provenance record (attempts, reviewer, Owner decision, timestamps). Blank cells are `pending`. The checker counts 495 ids: the 480 sheet cells plus 15 grammar samples.
- **Item 15 (14:09 and 14:10 CT).** **AS-ANCHOR-001**, **AS-EQUIP-001**. The tool detects feet, head, main hand and off hand and shifts the frame by whole pixels onto the slot anchor. That shift is not scaling. Clipping, wrong proportions, wrong size and head drift are rejected and generated again. All 236 body frames store main-hand, off-hand, a grip angle and a draw-order flag. Down is in front. Up is behind. The side facings in this file are a baseline `in-front`, the same kind of baseline as the elder stoop offsets. A weapon or shield is drawn once per grip pose and pinned by the compositor. The hand numbers are the **AS-HUM-002** stand-down baseline.

`slotId` is now required on every prompt-spec template (**AS-PROMPT-001**). The other template fields are unchanged. No registry, catalogue or tool file outside `allowedPaths` was edited.

### Catalogue coverage (this pass)

`node tools/art/validate_asset_standard.js` against `art/catalogue/catalogue.json`. Exit 0. Per-entry counts match the A9 table above: 10089 entries, 77 pass, 11 violate, 10001 unknown. The 11 filename violations are unchanged. New rules are global passes. `--strict` would exit 1 because violations are non-zero (11 filenames plus 3 biome-set globals). Nothing was written under `art/` or `game/img/`.

```
entries 10089 pass 77 violate 11 unknown 10001
rule-results pass 10985 violate 11 unknown 10195
global-violations 3
global violate AS-BIOME-005 game/data/DEUS_BiomeRegistry.json canonical TEMP,WET,ARID,HIGH,VOLC
global violate AS-BIOME-005 docs/art/DEUS_BiomeRegistry.json canonical TEMP,WET,ARID,HIGH,VOLC
global violate AS-BIOME-005 catalogue canonical TEMP,WET,ARID,HIGH,VOLC
```

New global passes from this pass: **AS-SRC-001** (768 by 1440, cap 2048, RMMZ sizes), **AS-REPO-001**, **AS-PREVIEW-001**, **AS-GEN-005**, **AS-SEX-001**, **AS-SEX-002** (21 dimorphic creatures), **AS-ID-001** (495 slot ids), **AS-ANCHOR-001**, **AS-EQUIP-001** (236 body frames).

### Gate output (this pass)

`node tools/art/test_validate_asset_standard.js`

```
RESULT: 217 passed, 0 failed
```

Exit 0. Each new check printed `PASS` for the good record and for the mutant before that result line. The count was 171 at the A9 tip. This pass adds 46 (23 killed mutants).

`node tools/check_deus_syntax.js`

```
Checked 52 DEUS plugin files. Errors: 0
```

Exit 0. This pass did not edit a plugin.

### Follow-ups added

- `PROPOSED-AL-17` — Git LFS for `art/approved/**`, and exclude rules for `art/raw/**`, `art/rejects/**` and `art/logs/**`. Those paths are outside this lane.
- `PROPOSED-AL-18` — the animated in-game 1:1 preview sent to the Owner before merge.
- `PROPOSED-AL-19` — the anchor tool: landmark detection, whole-pixel shift, and pinning weapons and shields.
- `PROPOSED-AL-13` already names the slot-map generator and the packer. It now also means the 768 by 1440 sheet and lookup by slot id. The other blank maps (every race, layer and dimorphic set) stay on that follow-up.

Appendix B items 9 and 10 are open and were not answered: further dimorphic creatures, and the picture in the fourth cell of bow-loose, dodge and parry. The schema header at the end of A9b was `deus-asset-standard/1.2.0`.

## Addendum A9c

Resume on `task/lane-al` at `b38c9901065c2a16e07777159a7939c80c4f75d6`, the A9c brief on top of the A9b tip `d9579630163b9262b133d722b5ba530083abbcd8`. This pass is Owner items 16–37 and section F only. A1–A9b rules stay. The A1 addendum file was not edited. No art was generated. No image prompt was run. No PNG was written. `art/palette/**` was read and not written.

Schema header is now `deus-asset-standard/1.3.0` in the markdown and the JSON. New rules are **AS-LOOK-001** through **AS-VIS-001** (22 rules) in §2.18. Each rule carries a note for the future Deus Art manual.

- **Item 16.** Readable high-contrast fantasy. Ultima VII oblique stays. Head about 1/5 of body height (proportion, not a height split). The checker tests the ratio on all nine races.
- **Item 17.** Oblique top face and front face. Map order is row, then Z layer. Four directions. Eight-direction sheets stay declined. Diagonal movement stays free.
- **Item 18.** Furniture and placeables have four facings. Symmetric reuse is by flag only. Category `PLACEABLE`.
- **Items 19 and 34.** 48 px PixelLab tiles-pro Wang tiles on a custom dual-grid renderer. 24 px detail decals (pebbles, tufts, cracks, leaves). 3–5 ground types per biome, chained, with 2–3 plain variants. Trial findings are recorded: size 42, skeleton-v3 on create-character-v3 bodies, layer propagation to armour/helmet/hair, south walk 2 px low, rotate-tool angles, straight-on Ultima VII view. Small item world sprites stay an open test. A 64 px tile was not adopted. Native 1:1. No A2 autotile path.
- **Item 20.** Ground marks: boot, bare, paw, hoof; snow, mud, sand, blood, wet; four directions; three fade steps; a path may become a road.
- **Item 21.** Every light source has a glow id, a master-palette colour and a radius, on the additive light layer. No blur.
- **Item 22.** Depth ramps, cliff faces, hard dithered shadows, 1 px ledge rims, ramps, 24 px half-steps. Depth-demo toggles are recorded. Renderer code is not this lane.
- **Item 23.** Oblique world sprite beside the icon and the 144 portrait, with anchor, footprint and sim hook.
- **Section F.** Seasons, 4-stage damage, and work rows (farm, mine, chop, build, craft, carry, fish, cook) on the layered system. Chop and carry were already rows.
- **Item 24.** Placement fields: 6 px cells, sizes 12/24/48 at true size, quarter surfaces, footprint-then-height draw order, SRD weight, passability, 100,000 item benchmark.
- **Item 25.** Containers: movable window, free-placed contents, backpack 1 cu ft / 30 lb, open and closed in four facings, open animation, window background. Starter types are backpack, chest, barrel, crate and sack.
- **Item 26.** 1 Z layer = 5 ft = 48 px. Four quarters of 1.25 ft = 12 px. Torch 4+4 tiles. Walk 4 px/frame, run 6, diagonal 3. Tick is one 6 s round. The historical domain is unchanged.
- **Item 27.** Integer scale only, 2× default, nearest-neighbour, letterbox or more map. Depth demo toggles 1×/2×/3×.
- **Item 28.** Cross-layer collapse, 4-stage wall breaches, cave-ins, through the mass ledger.
- **Item 29.** Quarters replace the old strata split. `stratumPx` is `[12, 12, 12, 12]`.
- **Item 30.** Construction category: palette-swap ghost, blueprint, foundation, scaffolding, partial build, site props, build animation.
- **Items 31–32.** Grayscale value step 3 (4 for a 12 px item) on a 0–15 luma scale. Saturated controlled palette, no gray mush. Brightest colours reserved. Mood from light and grading. The table-with-items reference is reviewed at true 2×. No image was generated.
- **Item 33, LOCKED, including the 15:05 CT PM revision.** Top-left light. 1 px self-tinted outline on characters and items, none on terrain. One master: the S/T file's 226 colours are `masterPalette.colours`. Thirty reserved slots make 256 slots. `uf.hex` is 256 lines, 250 unique, zero overlap, and is not a second master. Caps are 16 / 32 / 48. Walk is 3 frames played 1, 2, 1, 0. Idle 4, attack 6, cast 6, work 6, death 6. Additive glow is the only maximum brightness. Fixed grading. 32 px icons. Shape-coded markers.
- **Item 35.** Separate weapon sprite, six-frame attack, swing types, hit spark, 1–2 px knockback, drawn 10 to 20 percent larger, not scaled.
- **Item 36.** PM defaults the Owner may override. Screen sizes and SRD footprints. Nine race heights, with half-elf and tiefling at 42. Doors 1 tile by at least 1.5 layers. West-from-east mirroring is allowed for bodies, gear layers and creatures. Weapons and shields stay on hand anchors. Fortress view is 1× plus a colour-coded minimap. One pixel font.
- **Item 37.** Faces: armour and helmet only. Charsets: armour, helmet, weapon and shield. Other gear is item, icon, portrait or world sprite. PM assumption, flagged: class garb is in the race and class base body. Children have no class.

Geometry in `geometry`: `layerFt` 5, `layerPx` 48, `strataPerLayer` 4, `stratumPx` `[12, 12, 12, 12]`. The committed paper-doll example stays 768 by 1440.

Sheet estimate, replacing 30 × 3.5 × 4 = 420 cells. The 30 rows at the item 33 budgets, with unnamed rows left at their A9 counts, are 564 cells. Section F adds 144. A full layer design is **708** cells. Bounding sheet 1152 by 1728, under 2048. Base bodies: 216 adult + 216 elder + 9 child = **441**. Armour 81. Helmets 81. Elder armour and helmet add 0 (offset reuse). Separate class-garb sheets go from 324 to 0. Drawn body, armour and helmet designs: **603** sheets × 708 cells. Hair and beard counts are unchanged from **AS-GENE-001**. The 216 elder sheets are flagged in Appendix B and were not reduced. The PM re-runs the cost on 708, not on 420.

New slot grammars (item 14 shape) and one blank sample each: ground-mark, glow, decal, wang-tile, world-sprite, container, damage, construction, cross-layer, season, work-anim, depth, placeable, marker, font, range-marker, hit-spark. The checker counts 512 slot ids (480 example cells + 32 grammar samples). It resolves by id only.

No registry, catalogue file or tool file outside `allowedPaths` was edited. The three **AS-BIOME-005** violations are the same five-biome files as A9b.

### Catalogue coverage (this pass)

`node tools/art/validate_asset_standard.js` against `art/catalogue/catalogue.json`. Exit 0. Per-entry counts match A9b. New rules are global passes. `--strict` would exit 1 because violations are non-zero (11 filenames plus 3 biome-set globals). Nothing was written under `art/` or `game/img/`.

```
entries 10089 pass 77 violate 11 unknown 10001
rule-results pass 10985 violate 11 unknown 10195
global-violations 3
global violate AS-BIOME-005 game/data/DEUS_BiomeRegistry.json canonical TEMP,WET,ARID,HIGH,VOLC
global violate AS-BIOME-005 docs/art/DEUS_BiomeRegistry.json canonical TEMP,WET,ARID,HIGH,VOLC
global violate AS-BIOME-005 catalogue canonical TEMP,WET,ARID,HIGH,VOLC
```

New global passes: the 22 A9c rules, including **AS-LOCK-001**, **AS-SCALE-001**, **AS-QTR-001** and **AS-VIS-001**.

### Gate output (this pass)

`node tools/art/test_validate_asset_standard.js`

```
RESULT: 333 passed, 0 failed
```

Exit 0. The count was 217 at the A9b tip. This pass adds the A9c killed mutants, the canonical-palette file check, and the phrase checks.

`node tools/check_deus_syntax.js`

```
Checked 52 DEUS plugin files. Errors: 0
```

Exit 0. This pass did not edit a plugin.

### Follow-ups added

- `PROPOSED-AL-20` — the 48 px dual-grid Wang renderer and the depth-demo toggles. Already queued on the AA / depth-demo lane. Not this lane.
- `PROPOSED-AL-21` — point runtime colour at the canonical 226. `art/palette/**` is outside this lane. The active list already lives in `UF_AssetStandard.json`.
- `PROPOSED-AL-22` — per-row anchor correction for the south walk row, and rotate-tool weapon angles. No art in that follow-up until the Owner allows generation.

Appendix B items 11–13 are open and were not answered: whether 216 elder class bodies should shrink, the open small-item world-sprite test, and the picture in the fourth walk cell of the committed example sheet. World item placement and U7 melee runtime stay on their own queued lanes. The schema header is `deus-asset-standard/1.3.0` in the markdown and the JSON.
