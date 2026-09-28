# Grok review — SOC.11.01 lane-bn (2014 SRD 5.1 classes)

Reviewed writer tip:

`8934d1ac4caf130e2fe5e4c007d1761dcae8c10a`

Cross-family review. The writer is Claude Opus 5.5. The reviewer is Grok. The tip matches the brief: twelve data-only 2014 SRD 5.1 classes, a closed schema, source-traced documentation, and a validator whose negative fixtures fail on purpose. Both recorded gates exit 0. All 84 provocations exit 1 with exactly their declared rules. An independent read of the tracked `game/data/srd51/` entries agrees with the committed file. No primary ability was invented. The eleven `parsed` class records were not treated as page-verified.

## Identity

| Field | Value |
|---|---|
| Reviewer | Grok, independent cross-family reviewer for lane-bn |
| Writer | Claude Opus 5.5 (`deus-claude <willshw89@gmail.com>`, co-authored by Claude Opus 5.5) |
| Branch | `task/lane-bn` |
| Writer tip | `8934d1ac4caf130e2fe5e4c007d1761dcae8c10a` |
| Writer subject | `[fable] SOC.11.01 integrate canonical SRD classes` |
| Writer author date | 2026-09-27T18:39:56-05:00 |
| Writer parent | `37dbc3ae695dbb187468e4d6d164f072c636fd56` |
| BRIEF base | `6c0e33c1a7b53f2d8d55a75565906bf1b2db43a7` |
| `git merge-base 6c0e33c1a7b53f2d8d55a75565906bf1b2db43a7 8934d1ac4caf130e2fe5e4c007d1761dcae8c10a` | `6c0e33c1a7b53f2d8d55a75565906bf1b2db43a7` |
| `git merge-base origin/main 8934d1ac4caf130e2fe5e4c007d1761dcae8c10a` | `6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0` |

`origin/main` is behind the brief base. The reviewed range is the brief base through the writer tip: `6c0e33c1a7b53f2d8d55a75565906bf1b2db43a7..8934d1ac4caf130e2fe5e4c007d1761dcae8c10a`.

Worktree `HEAD` at review time was `b49297b8be48d4bb01e10871dcbed67d6391fa6e`, the ops launch prompt after the tip. `git diff --name-status 8934d1ac4caf130e2fe5e4c007d1761dcae8c10a HEAD` is only `A tasks/SOC.11.01/lane-bn/launches/20260927_184431_prompt.txt`. Gates and the source comparison read the tip's data, schema, test, builder, and system document. `git status --porcelain` was empty before this review file.

This review does not edit the class data, the schema, the test, the builder, the system document, the WBS, or status.

## Scope

`git diff --name-status 6c0e33c1a7b53f2d8d55a75565906bf1b2db43a7 8934d1ac4caf130e2fe5e4c007d1761dcae8c10a`: 11 files, all added.

| Path | In `lane.json` allowedPaths |
|---|---|
| `docs/systems/DEUS_SRD_Classes.md` | yes |
| `game/data/society/srd_classes.json` | yes |
| `game/data/society/srd_classes.schema.json` | yes |
| `tasks/SOC.11.01/lane-bn/BRIEF.md` | yes (`tasks/SOC.11.01/**`) |
| `tasks/SOC.11.01/lane-bn/REPORT.md` | yes |
| `tasks/SOC.11.01/lane-bn/SOURCE_GAPS.md` | yes |
| `tasks/SOC.11.01/lane-bn/build_srd_classes.js` | yes |
| `tasks/SOC.11.01/lane-bn/lane.json` | yes |
| `tasks/SOC.11.01/lane-bn/launches/20260927_181600_prompt.txt` | yes |
| `tasks/SOC.11.01/lane-bn/launches/20260927_181644_prompt.txt` | yes |
| `tools/society/test_srd_classes.js` | yes |

The writer commit itself, `git diff-tree --name-status -r 8934d1ac4caf130e2fe5e4c007d1761dcae8c10a`, adds the seven implementation files: the system document, both class files, `REPORT.md`, `SOURCE_GAPS.md`, `build_srd_classes.js`, and `tools/society/test_srd_classes.js`.

Forbidden-path diff of the same range was empty (exit 0):

```
git diff --name-only 6c0e33c1a7b53f2d8d55a75565906bf1b2db43a7 8934d1ac4caf130e2fe5e4c007d1761dcae8c10a -- art game/img game/audio game/data/srd51 docs/STATUS.md docs/OWNER_DECISIONS.md docs/society docs/WORK_QUEUE.md game/js
```

No art path, audio path, plugin, or `game/data/srd51/**` file is in the diff. `game/js` does not reference `srd_classes.json`. `node tools/check_deus_syntax.js` syntax-checks the 60 existing `game/js/plugins/DEUS_*.js` files and does not load this data. The deliverable is data, a schema, a document, and a node validator.

`node tasks/SOC.11.01/lane-bn/build_srd_classes.js --check` printed `srd_classes.json matches a fresh build` and exited 0. The committed bytes are the builder's output.

## Commands and exits

Run from `C:\Users\snewt\.deus_worktrees\lane-bn` on 2026-09-27, foreground, against the tip's files.

### `node tools/society/test_srd_classes.js`

Exit 0. Last lines:

```
SRD CLASSES PASSED: 45 rules, 84 fixtures each tripping its target (2856 ms).
```

All 45 baseline rules printed `[PASS]`, including `SCHEMA_KEYWORDS`, `SCHEMA_STRICT`, `SCHEMA_VALID`, `ID_IDENTITY`, `ID_SRD_ENTRY`, `SOURCE_HASHES`, `SRC_TRACE`, `SRC_BINDING`, `LICENSE`, `CLASS_META`, `HIT_DIE`, `HIT_POINTS`, `SAVING_THROWS`, `LEVELS_COMPLETE`, `FEATURES_COMPLETE`, `FEATURES_PLACED`, `UNAVAILABLE_REGISTRY`, `PRIMARY_ABILITY_UNAVAILABLE`, `DASH_IS_NONE`, `ADVANCEMENT`, `PROFICIENCY_BONUS`, `FEATURE_LABELS`, `SLOT_REFS`, `SOURCE_DISCREPANCIES`, `CLASS_COLUMNS`, `SUBCLASS_PROGRESSION`, `SPELL_PRESENCE`, `SPELL_START`, `SPELL_ABILITY`, `SPELL_LIST`, `SPELL_MODEL`, `SPELL_PROGRESSION`, `SPELL_PREPARATION`, `SPELL_RECOVERY`, `SPELL_RITUAL`, `SPELL_FOCUS`, `PROF_ARMOR`, `PROF_WEAPONS`, `PROF_TOOLS`, `PROF_SKILLS`, `RACE_POLICY`, `NO_RACE_LOCKS`, `NO_AFFINITY`, `DOC_SUMMARY`, and `DOC_RULES`.

Summary line from the run: `classes 12, level rows 240, feature slots 247, race-class pairs with no lock 108/108`.

Every one of the 84 in-process fixtures printed `[PASS]` and tripped its target plus only the rules named in `also`. Coverage printed `[PASS]` for all 45 rules.

### `node tools/check_deus_syntax.js`

Exit 0. Exact line: `Checked 60 DEUS plugin files. Errors: 0`.

### `node tools/society/test_srd_classes.js --provoke-all`

Exit 0. Each of the 84 fixtures ran in its own process. Each printed `[PASS] exit 1 <name> -> [declared rules]`. Final line:

```
PROVOCATIONS 84/84 exited 1 with exactly their declared rules failing
```

## Independent source check

The validator re-derives the file from `game/data/srd51/`. A separate read of those entries, `identity.js` `CLASS_IDS`, `person_identity.schema.json`, `docs/OWNER_DECISIONS.md` DEC-036, and the committed JSON was used so a shared parser mistake would still show up. Results below are from that read.

### Classes, ids, levels

The catalogue has exactly twelve `kind: "class"` entries, in `CLASS_IDS` order: barbarian, bard, cleric, druid, fighter, monk, paladin, ranger, rogue, sorcerer, warlock, wizard. The data file uses those ids in that order. The person-identity schema enum, with `NONE` removed, is the same set. Each class has levels 1 through 20, 20 source table rows, and row width equal to its column count. Total level rows 240. Total feature slots 247. Every `features[]` record copies the source feature name, level, and index.

### Hit dice, hit points, saving throws

| Class | Source hit die | Level 1 | Later levels | Saves |
|---|---|---|---|---|
| Barbarian | `1d12` | `12 + your Constitution modifier` | `1d12 (or 7)` | Strength, Constitution |
| Bard | `1d8` | `8 + your Constitution modifier` | `1d8 (or 5)` | Dexterity, Charisma |
| Cleric | `1d8` | `8 + your Constitution modifier` | `1d8 (or 5)` | Wisdom, Charisma |
| Druid | `1d8` | `8 + your Constitution modifier` | `1d8 (or 5)` | Intelligence, Wisdom |
| Fighter | `1d10` | `10 + your Constitution modifier` | `1d10 (or 6)` | Strength, Constitution |
| Monk | `1d8` | `8 + your Constitution modifier` | `1d8 (or 5)` | Strength, Dexterity |
| Paladin | `1d10` | `10 + your Constitution modifier` | `1d10 (or 6)` | Wisdom, Charisma |
| Ranger | `1d10` | `10 + your Constitution modifier` | `1d10 (or 6)` | Strength, Dexterity |
| Rogue | `1d8` | `8 + your Constitution modifier` | `1d8 (or 5)` | Dexterity, Intelligence |
| Sorcerer | `1d6` | `6 + your Constitution modifier` | `1d6 (or 4)` | Constitution, Charisma |
| Warlock | `1d8` | `8 + your Constitution modifier` | `1d8 (or 5)` | Wisdom, Charisma |
| Wizard | `1d6` | `6 + your Constitution modifier` | `1d6 (or 4)` | Intelligence, Wisdom |

The parenthetical fixed value is the die average rounded up: d6 = 4, d8 = 5, d10 = 6, d12 = 7. `srd:rule:beyond-1st-level` contains the sentence `which is the average result of the die roll (rounded up)`. The data stores those source numbers. First-level base equals the die size on all twelve.

### Proficiencies

Armor tokens map onto equipment categories `light`, `medium`, `heavy`, and `shield` (13 armor entries). `All armor` is light, medium, and heavy. `shields` is separate. Monk, sorcerer, and wizard armor text is `None`, stored as `[]`. Druid keeps the source parenthetical `druids will not wear armor or use shields made of metal`.

Named weapons resolve one-to-one: hand crossbows to `srd:weapon:crossbow-hand`, light crossbows to `srd:weapon:crossbow-light`, and the druid, bard, rogue, sorcerer, and wizard weapon lists to the matching equipment ids. Category phrases stay `simple` or `martial`.

Tools: bard chooses 3 from group `Musical instrument`; monk chooses 1 from `Artisan's tools` or `Musical instrument` (the source apostrophe is U+2019); druid fixes `srd:tool:herbalism-kit`; rogue fixes `srd:tool:thieves-tools`; every other class is `None` as `[]`.

Skills match the source sentences. Bard is `Choose any three` (`from: "ANY"`). The other eleven lists are the named skills. Both the builder split and the validator split produce the same list on every class, and each named skill occurs as a bullet in `srd:rule:using-ability-scores-ability-checks`.

### Spellcasting and subclass choice

| Class | Feature | Ability sentence in the source | Model | Preparation | Recovery | Ritual | Focus | Subclass choice |
|---|---|---|---|---|---|---|---|---|
| Barbarian | none | — | per-level `null` | — | — | — | — | Primal Path 3; features 3, 6, 10, 14; `srd:subclass:path-of-the-berserker` |
| Bard | Spellcasting 1 | Charisma … bard spells | 9 slot columns, cantrips, spells known | KNOWN | long rest | KNOWN | musical instrument | Bard College 3; features 3, 6, 14; `srd:subclass:college-of-lore` |
| Cleric | Spellcasting 1 | Wisdom … cleric spells | 9 slot columns, cantrips | PREPARED FULL Wisdom | long rest | PREPARED | holy symbol | Divine Domain 1; features 1, 2, 6, 8, 17; `srd:subclass:life-domain` |
| Druid | Spellcasting 1 | Wisdom … druid spells | 9 slot columns, cantrips | PREPARED FULL Wisdom | long rest | PREPARED | druidic focus | Druid Circle 2; features 2, 6, 10, 14; `srd:subclass:circle-of-the-land` |
| Fighter | none | — | per-level `null` | — | — | — | — | Martial Archetype 3; features 3, 7, 10, 15, 18; `srd:subclass:champion` |
| Monk | none | — | per-level `null` | — | — | — | — | Monastic Tradition 3; features 3, 6, 11, 17; `srd:subclass:way-of-the-open-hand` |
| Paladin | Spellcasting 2 | Charisma … paladin spells | 5 slot columns | PREPARED HALF_ROUNDED_DOWN Charisma | long rest | NONE | holy symbol | Sacred Oath 3; features 3, 7, 15, 20; `srd:subclass:oath-of-devotion` |
| Ranger | Spellcasting 2 | Wisdom … ranger spells | 5 slot columns, spells known | KNOWN | long rest | NONE | NONE | Ranger Archetype 3; features 3, 7, 11, 15; `srd:subclass:hunter` |
| Rogue | none | — | per-level `null` | — | — | — | — | Roguish Archetype 3; features 3, 9, 13, 17; `srd:subclass:thief` |
| Sorcerer | Spellcasting 1 | Charisma … sorcerer spells | 9 slot columns, cantrips, spells known | KNOWN | long rest | NONE | arcane focus | Sorcerous Origin 1; features 1, 6, 14, 18; `srd:subclass:draconic-bloodline` |
| Warlock | Pact Magic 1 | Charisma … warlock spells | PACT_SLOTS, max slot level 5 | KNOWN | short or long rest | NONE | arcane focus | Otherworldly Patron 1; features 1, 6, 10, 14; `srd:subclass:the-fiend` |
| Wizard | Spellcasting 1 | Intelligence … wizard spells | 9 slot columns, cantrips | PREPARED FULL Intelligence, from the spellbook | long rest | IN_SPELLBOOK | arcane focus | Arcane Tradition 2; features 2, 6, 10, 14; `srd:subclass:school-of-evocation` |

Paladin and ranger level 1 slot cells are em dashes. Paladin and ranger level 2 are two 1st-level slots. Warlock level 1 is 2 cantrips, 2 spells known, 1 pact slot of 1st level, and invocations null. Warlock level 20 is 4 cantrips, 15 spells known, 4 pact slots of 5th level, and 8 invocations. Wizard level 1 is 3 cantrips and two 1st-level slots. Bard level 20 is 4 cantrips, 22 spells known, and a 9th-level slot. An independent cell parser matched every class-column value and every spell-slot cell on all 20 levels of all 12 classes.

`featureLevels` are the subclass-choice level plus later class-table rows whose label is a subclass feature (`Druid Circle feature`, `Divine Domain feature`, and the same pattern on the other classes). They are the class table's rows. Subclass feature text, including Circle of the Land's Circle Spells, stays on the subclass entry and is referenced by id.

The catalogue has one subclass per class (12). Fighter's subclass is Champion. Rogue's is Thief. No Eldritch Knight, Arcane Trickster, or Oathbreaker record exists in the tracked class list, and none was added.

The only table-label discrepancy is Wizard level 20: the Features cell is `Signature Spell` and the feature heading is `Signature Spells`. The slot is `FEATURE_GAINED` with ref `Signature Spells`, and `sourceDiscrepancies` records that pair. Mystic Arcanum's later rows (13, 15, 17) cite the feature sentence that names those character levels (`one 7th-level spell at 13th level`, and the same sentence for 15th and 17th).

### Null, empty, and unavailable

Class tables contain 486 em dashes and no cell whose text is `0`. Monk level 1 Ki is an em dash and the data value is `null`. Sorcerer level 1 sorcery points and warlock level 1 invocations are the same. A numeric zero is not used in place of a dash. `None` proficiency text is `[]`. Classes without Spellcasting or Pact Magic use `spellcasting.status: "NONE"` and per-level `spellcasting: null`. Ritual and focus use `NONE` only where that subsection is absent. The file contains twelve booleans, all `primaryAbility.search.caseInsensitive: true`, and no `false`.

### Source hashes, paths, and quotes

`sources.*.contentSha256` was recomputed as SHA-256 of `JSON.stringify` of the parsed file. Each matches:

| Key | contentSha256 |
|---|---|
| character_options | `85936cdc8956944538f2b528b1f7817e02e5442fc256679f778c791c63cebbfe` |
| rules | `966f9735e40db81c6096817a217c5e48c99471c701372f14f6a43c2f15a20ed9` |
| spells | `7f422404bbb9a40ad11065307b30a87e8d81db328bf7a440f7d4f7af0ba31584` |
| equipment | `6d28eb81146bf6443594a1ab64ff73b55ee889d84c15e5399ac32497c44b0f5b` |
| creatures | `3c8ba1810214dc0f48fdbd7311fa2b24c49f8104863c13c79add79ecad708870` |
| magic_items | `9d0e950de7e0be1fab315a262b41a139a6b25d26ad94df60d212fc4879d2b8ca` |

Every file's `pdfSha256` is the catalogue metadata hash `2504d2a0abb0a4d491a939be4f17910a2dde0312570ab8d208080225ccf0a1f0` (`SRD_CC_v5.1.pdf`). Paths are the six `game/data/srd51/*.json` files. The license object equals `character_options.json` `metadata.license`.

An independent walk resolved all 144 `src` objects. Each path exists on the named entry. A string value contains the quote. A non-string value's JSON equals the quote. Whole-field quotes used for hit die, hit points, saving throws, proficiencies, and the class-table caption are the field itself.

Character Advancement columns are `Experience Points`, `Level`, `Proficiency Bonus`. All 20 rows match the data, from level 1 at 0 XP and bonus 2 through level 20 at 355000 XP and bonus 6. `tables[0]` of `srd:rule:beyond-1st-level` is that table.

### Schema and documentation

The schema is draft 2020-12. Every object schema sets `additionalProperties` to `false`. The keywords it uses are the keywords the validator implements. The class summary table in `docs/systems/DEUS_SRD_Classes.md` matches the twelve data rows, and the rule table lists the same 45 rule ids.

### Race-class policy

`raceClassPolicy.rule` is `NO_LOCKS` and `decision` is `DEC-036`. The nine race ids are the nine `kind: "race"` entries, in catalogue order: dwarf, elf, halfling, dragonborn, human, gnome, half-elf, half-orc, tiefling. That is 108 race-class pairs. DEC-036 in `docs/OWNER_DECISIONS.md` states `Every race can take every class without exception`. Outside `raceClassPolicy`, the file has no eligibility-style key and no string naming a race, subrace, or `srd:race:` / `srd:subrace:` id. The four subraces (high elf, hill dwarf, lightfoot, rock gnome) do not appear. Affinity weights from DEC-036 are absent. No plugin reads the file, so the policy is a property of this data, not a scheduler change.

### What stayed out

The data file has no `startingEquipment` field. Each class entry in the catalogue still has that list; `SOURCE_GAPS.md` G4 records the omission. The word `multiclass` occurs only inside the repeated unavailable-fact reason, which names `srd:rule:beyond-1st-level-multiclassing` (pages 56–58, tables Multiclassing Prerequisites, Multiclassing Proficiencies, and Multiclass Spellcaster) and says that optional rule was not used. No multiclass prerequisite, proficiency, or slot table was copied. No feat was added.

Three further tables remain on the class entries and are not columns of this file: Cleric `Destroy Undead` (CR by level, already visible as the class-table labels `Destroy Undead (CR 1/2)` through `(CR 4)`), Druid `Beast Shapes` (max CR and movement limits at 2nd, 4th, and 8th), and Sorcerer `Creating Spell Slots` (sorcery-point costs 2, 3, 5, 6, 7). Sidebars `Sacred Plants and Wood`, `Druids and the Gods`, `Breaking Your Oath`, `Your Pact Boon`, and `Your Spellbook` likewise stay in the catalogue. That matches the brief's field list and G4's decision to reference feature text by `sourceIndex` rather than copy it. Subclass features were not copied; each class stores the SRD subclass id.

## Primary ability

`primaryAbility` is unavailable in the tracked sources. This review does not assign one.

A case-insensitive search of the raw text of all six srd51 content files found:

| Probe | Matches |
|---|---|
| `primary abilit` | 0 |
| `primary ability` | 0 |
| `primary abilities` | 0 |
| `quick build` | 0 |
| `highest ability score` | 0 |
| `key ability` | 0 |
| `main ability` | 0 |
| `spellcasting ability` | 192 |

No class `data` key is named like a primary ability. The 192 `spellcasting ability` hits are the caster sentences already stored on `spellcasting.ability`, with a quote that starts at that sentence. The only class-to-ability table in the tracked rules is Multiclassing Prerequisites, on the optional multiclassing entry. It was not copied into `primaryAbility`. Each of the twelve records is `{ status: "UNAVAILABLE", reason, search }` with pattern `primary abilit`, all six files, `caseInsensitive: true`, and `matches: 0`. `unavailableFacts` lists that field for all twelve classes and no other field.

## Readiness

Catalogue readiness, copied onto `source.readiness`:

| Class | Readiness | Pages | Verification |
|---|---|---|---|
| Barbarian | parsed | 8–9 | none |
| Bard | verified | 11–13 | mark present; text SHA-256 matches the entry |
| Cleric | parsed | 15–17 | none |
| Druid | parsed | 19–23 | none |
| Fighter | parsed | 24–25 | none |
| Monk | parsed | 26–28 | none |
| Paladin | parsed | 30–34 | none |
| Ranger | parsed | 35–37 | none |
| Rogue | parsed | 39–40 | none |
| Sorcerer | parsed | 42–44 | none |
| Warlock | parsed | 46–51 | none |
| Wizard | parsed | 52–55 | none |

Eleven records are `parsed`. One is `verified`. `docs/SRD5_1_COVERAGE_MANIFEST.md` defines `parsed` as filled by the stager and not compared with the page, and `verified` as compared with the rendered page. Bard's mark in `tools/srd_extract/verification/verified.json` is the only class mark. Its note says class-table rows 1, 2, 3, 7, 10, 11, and 20, the hit die, saving throws, and armor and skill proficiencies were checked, and feature texts on pages 12 and 13 were not compared. The catalogue hash still matches, so the tag is current. This lane copies the tags. It does not write `verified.json`. This review does not promote any `parsed` record to `verified`, and it does not treat bard feature text as fully page-checked.

## Findings

None. No defect against the brief was found in the writer tip.

## Owner-gated source gaps

These are limits of the tracked authority. They are recorded by the writer. They are not corrected here, and no missing fact was filled in.

1. **Primary ability (G1).** The brief asks for primary abilities. The six tracked srd51 files do not state one, under the probes above. Leaving `primaryAbility` as `UNAVAILABLE` is the brief's rule for a missing fact. An owner ruling is still required if a primary ability is wanted from some other source.
2. **Page verification (G3).** Eleven class entries are `parsed`. Bard is `verified` only to the extent of its mark, which leaves feature text on pages 12 and 13 unchecked. Verification writes outside this lane's paths. The file is not a runtime consumer. It should not be treated as page-checked gameplay authority until that pass exists.
3. **Left in the catalogue on purpose (G4).** Optional multiclassing, starting equipment, feature and subclass text, spell-list contents, and wizard spellbook sizes are in the SRD extraction and are referenced rather than copied. The same is true of the Destroy Undead, Beast Shapes, and Creating Spell Slots tables.

## Verdict

VERDICT: PASS
