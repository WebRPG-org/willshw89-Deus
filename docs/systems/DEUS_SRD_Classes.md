# DEUS SRD classes (SOC.11.01)

`game/data/society/srd_classes.json` holds the twelve 2014 SRD 5.1 classes as data: hit dice, hit points, saving throws, armor, weapon, tool and skill proficiencies, spellcasting, and a row per level from 1 to 20. The shape is `game/data/society/srd_classes.schema.json`. The validator and gate is `tools/society/test_srd_classes.js`.

The file is data only. No plugin loads it and it has no runtime behavior. Class ids are the person-identity class ids (`game/js/sim/society/identity.js` `CLASS_IDS`, `game/data/society/person_identity.schema.json`), and each one is also the id of the class entry in the SRD catalogue. Nothing here gates a class by race. Every race may take every class (DEC-036).

Content comes only from the tracked SRD 5.1 catalogue in `game/data/srd51/`. The frozen legacy folder `game/data/srd5_1/` (including `classes_reference.json`) is not read.

## Files

| Path | Role |
|---|---|
| `game/data/society/srd_classes.json` | The twelve classes. |
| `game/data/society/srd_classes.schema.json` | Draft 2020-12 schema. Every object is closed (`additionalProperties: false`). |
| `tools/society/test_srd_classes.js` | Validator, negative fixtures, provocations. |
| `tasks/SOC.11.01/lane-bn/build_srd_classes.js` | Builds the data file from the sources. `--check` compares the committed file with a fresh build. |

## Sources and traceability

| Source key | File | Used for |
|---|---|---|
| `character_options` | `game/data/srd51/character_options.json` | Class and subclass entries, race entries. |
| `rules` | `game/data/srd51/rules.json` | Character Advancement table, rounded-up hit point rule, skill list. |
| `spells` | `game/data/srd51/spells.json` | Class spell list ids. |
| `equipment` | `game/data/srd51/equipment.json` | Armor categories, weapon ids, tool ids and tool groups. |
| `creatures` | `game/data/srd51/creatures.json` | Searched only, for the unavailable-fact probe. |
| `magic_items` | `game/data/srd51/magic_items.json` | Searched only, for the unavailable-fact probe. |

`sources.<key>.contentSha256` is the SHA-256 of `JSON.stringify(JSON.parse(file))`, so a CRLF checkout hashes the same as an LF one. `pdfSha256` is the hash of `SRD_CC_v5.1.pdf` that the catalogue was extracted from. When any source file changes, `SOURCE_HASHES` fails until the data file is rebuilt and reviewed.

Every derived fact that is not a table cell carries a `src` object:

```json
{ "file": "character_options", "entry": "srd:class:bard", "path": ["data", "features", 0, "text"],
  "quote": "Charisma is your spellcasting ability for your bard spells" }
```

`path` is a JSON path inside the named entry. When the value there is a string, it must contain `quote`. Otherwise `quote` must equal the value's JSON. Per-level values carry no `src`. They come from the class table named by `tableSrc`, row `level - 1`, and the validator re-reads every cell. `features[].sourceIndex` is the index in the entry's `data.features`.

## Absent, none, zero, and unavailable

These are kept apart. None of them is written as another.

| In the data | Meaning |
|---|---|
| `null` in a per-level value | The SRD class table prints an em dash (—) in that cell: nothing at that level. It is never written as `0`. |
| `[]` | The SRD states the list is empty, for example armor "None". |
| `"status": "NONE"` with a `basis` | The SRD class has no such feature or subsection: `NO_SPELLCASTING_FEATURE`, `NO_RITUAL_CASTING_SUBSECTION`, `NO_SPELLCASTING_FOCUS_SUBSECTION`. |
| per-level `"spellcasting": null` | The class has no spellcasting feature (`spellcasting.status` is `NONE`). |
| `"status": "UNAVAILABLE"` | The tracked extraction does not state the fact. The record says what was searched. Listed in `unavailableFacts`. |
| A key missing from a per-level spellcasting object | The class table has no such column. `spellcasting.progressionColumns` lists the keys that exist. |

No `false` stands for an absent fact anywhere in the file.

### Unavailable facts

| Field | Classes | Evidence |
|---|---|---|
| `primaryAbility` | all twelve | A case-insensitive search of all six srd51 content files for `primary abilit` finds nothing. The only SRD table that pairs classes with ability scores is Multiclassing Prerequisites (`srd:rule:beyond-1st-level-multiclassing`). It belongs to the optional multiclassing rule and does not name a primary ability, so it is not used. |

The spellcasting ability of each caster is stated by the SRD and is recorded in `spellcasting.ability`.

## Record

Top level:

| Field | Content |
|---|---|
| `license` | The CC-BY-4.0 block copied from the catalogue metadata. |
| `sources` | The six srd51 files, their content hashes and the PDF hash. |
| `identity` | Where the class ids come from. |
| `characterAdvancement` | Levels 1..20 with experience points and proficiency bonus, from the SRD Character Advancement table. |
| `raceClassPolicy` | `NO_LOCKS`, `DEC-036`, the nine SRD race ids. |
| `unavailableFacts` | Every `UNAVAILABLE` field and its classes. |
| `sourceDiscrepancies` | Class-table labels that do not match their feature heading. |
| `classes` | Twelve class records in identity order. |

Class record:

| Field | Content |
|---|---|
| `id`, `name`, `source` | Identity id, SRD name, entry id, pages, heading, catalogue readiness. |
| `hitDie` | `die` (`d6`..`d12`) and `sides`. |
| `hitPoints` | `firstLevel.base` plus the named modifier. `laterLevels.roll` or `laterLevels.fixed` plus the named modifier. |
| `primaryAbility` | `UNAVAILABLE` (see above). |
| `savingThrows.abilities` | The two saving throw proficiencies. |
| `proficiencies.armor` | `grants[]`: each SRD token and the equipment armor categories it covers. "All armor" covers every non-shield category in `equipment.json`. `qualifier` keeps a parenthetical (the druid's metal rule) or is `null`. |
| `proficiencies.weapons` | `grants[]`: a weapon category (`simple`, `martial`) or an SRD weapon id (`srd:weapon:*`). |
| `proficiencies.tools` | `fixed[]` SRD tool ids, and `choice` (`count` and SRD tool groups) or `null`. |
| `proficiencies.skills` | `choose` and `from` (skill names, or `ANY` for "Choose any three"). |
| `spellcasting` | `NONE`, or `PRESENT` with the feature, its level, ability, spell list id, slot model, preparation, slot recovery, ritual casting, and focus. |
| `subclass` | The feature that grants the subclass, its level, the levels that grant subclass features, and the SRD subclass ids. Subclass features are not copied. |
| `tableSrc` | The class table. |
| `classColumns` | Class-specific table columns (Rages, Martial Arts, Sneak Attack, …) with a key and a value type. |
| `features` | Every class feature heading, its level, and its source index. Feature text stays in the catalogue. |
| `levels[20]` | `proficiencyBonus`, `features[]` slots, `classColumns` values, and `spellcasting` values. |

Value types for class columns: `COUNT` (integer), `COUNT_OR_UNLIMITED` (integer or `UNLIMITED`), `BONUS` ("+2" is `2`), `FEET_BONUS` ("+10 ft." is `10`), `DICE` ("1d6" kept as text). The validator infers each column's type from its twenty cells.

Spellcasting slot models: `SPELL_LEVEL_SLOTS` has `slots[maxSlotLevel]`, slots per spell level 1..9 or 1..5. `PACT_SLOTS` (warlock) has `pactSlots.count` and `pactSlots.slotLevel`. Preparation is `KNOWN`, or `PREPARED` with `ability`, `classLevel` (`FULL` or `HALF_ROUNDED_DOWN`), and `minimum`. Slot recovery is `LONG_REST` or `SHORT_OR_LONG_REST`. Ritual casting is `NONE` or `PRESENT`, with `spellSource` set to `KNOWN`, `PREPARED` or `IN_SPELLBOOK`.

### Feature slots

Each level lists the labels of the SRD table's Features cell, in order. Each label is one slot:

| Kind | Rule | Example |
|---|---|---|
| `FEATURE_GAINED` | The label names a feature whose level is this level. A parenthetical becomes `detail`. | Barbarian 1 `Rage`, Bard 1 `Bardic Inspiration (d6)` |
| `FEATURE_ADVANCED` | The label names a feature gained earlier, and that feature's text names this level. | Barbarian 8 `Ability Score Improvement`, Fighter 11 `Extra Attack (2)` |
| `FEATURE_IMPROVED` | "X improvement(s)". `refs` are the features named X, or starting with "X ", that were gained earlier and whose text names this level. | Paladin 18 `Aura improvements`: Aura of Protection, Aura of Courage |
| `SUBCLASS_FEATURE` | "X feature", where X ends the subclass-choice feature's name and that feature's text names this level. | Barbarian 6 `Path feature`: Primal Path |

Every class feature is gained by exactly one `FEATURE_GAINED` slot at its own level.

### Source discrepancies

| Class | Level | Table label | Feature heading |
|---|---|---|---|
| Wizard | 20 | Signature Spell | Signature Spells |

The slot is `FEATURE_GAINED` with `refs: ["Signature Spells"]`. The source text is not corrected.

## Class summary

The validator (`DOC_SUMMARY`) compares this table with the data.

| Id | Name | Hit die | Saving throws | Spellcasting ability | Slots | Spells | Subclass choice (level) |
|---|---|---|---|---|---|---|---|
| `srd:class:barbarian` | Barbarian | d12 | Strength, Constitution | NONE | NONE | NONE | Primal Path (3) |
| `srd:class:bard` | Bard | d8 | Dexterity, Charisma | Charisma | SPELL_LEVEL_SLOTS 9 | KNOWN | Bard College (3) |
| `srd:class:cleric` | Cleric | d8 | Wisdom, Charisma | Wisdom | SPELL_LEVEL_SLOTS 9 | PREPARED | Divine Domain (1) |
| `srd:class:druid` | Druid | d8 | Intelligence, Wisdom | Wisdom | SPELL_LEVEL_SLOTS 9 | PREPARED | Druid Circle (2) |
| `srd:class:fighter` | Fighter | d10 | Strength, Constitution | NONE | NONE | NONE | Martial Archetype (3) |
| `srd:class:monk` | Monk | d8 | Strength, Dexterity | NONE | NONE | NONE | Monastic Tradition (3) |
| `srd:class:paladin` | Paladin | d10 | Wisdom, Charisma | Charisma | SPELL_LEVEL_SLOTS 5 | PREPARED | Sacred Oath (3) |
| `srd:class:ranger` | Ranger | d10 | Strength, Dexterity | Wisdom | SPELL_LEVEL_SLOTS 5 | KNOWN | Ranger Archetype (3) |
| `srd:class:rogue` | Rogue | d8 | Dexterity, Intelligence | NONE | NONE | NONE | Roguish Archetype (3) |
| `srd:class:sorcerer` | Sorcerer | d6 | Constitution, Charisma | Charisma | SPELL_LEVEL_SLOTS 9 | KNOWN | Sorcerous Origin (1) |
| `srd:class:warlock` | Warlock | d8 | Wisdom, Charisma | Charisma | PACT_SLOTS 5 | KNOWN | Otherworldly Patron (1) |
| `srd:class:wizard` | Wizard | d6 | Intelligence, Wisdom | Intelligence | SPELL_LEVEL_SLOTS 9 | PREPARED | Arcane Tradition (2) |

## Race-class policy

`raceClassPolicy` records `NO_LOCKS` under DEC-036 ("Every race can take every class without exception"). It lists the nine SRD races, which gives 108 race-class pairs. The validator fails if any key outside that block reads as an eligibility condition (race, species, ancestry, lineage, prerequisite, requirement, eligibility, allowed, forbidden, restriction, lock), or any value names an SRD race or subrace. Affinity tables and job-pick weights belong to SOC.11.02 and are not in this file (`NO_AFFINITY`).

## Not integrated

All of these are in the SRD catalogue. They are left out of this file on purpose:

- The multiclassing rule, including its prerequisites, proficiencies, and spell-slot table. It is an optional rule in the SRD.
- Starting equipment.
- Feature and subclass texts. They are referenced by `sourceIndex` and by SRD subclass id, not copied.
- Spell list contents. They are referenced by `spellcasting.spellList`.
- Wizard spellbook sizes and spells learned per level. They are stated in the Spellcasting text and not structured here.

## Readiness

Eleven class entries are `parsed` in the catalogue and Bard is `verified` (`source.readiness`). Under the Owner's readiness policy (2026-09-22), a record must be verified against the rendered page before it becomes authoritative gameplay input. That verification writes outside this task's paths, so it was not done here (see `tasks/SOC.11.01/lane-bn/REPORT.md`).

## Validator

```text
node tools/society/test_srd_classes.js                     gate: baseline, fixtures, coverage
node tools/society/test_srd_classes.js --data <file>       validate another data file
node tools/society/test_srd_classes.js --list-provocations
node tools/society/test_srd_classes.js --provoke <name>    one fixture as a real failing run (exit 1)
node tools/society/test_srd_classes.js --provoke-all       every fixture in its own process
```

A gate run passes only when:

- every rule passes on the committed files;
- every negative fixture trips its target rule and exactly the other rules it declares;
- every rule is the target of at least one fixture.

The validator implements the JSON Schema keywords the schema uses. `SCHEMA_KEYWORDS` fails on any other keyword, so an unenforced keyword cannot pass silently.

## Validator rules

| Rule | Group | Checks | Targeted fixtures |
|---|---|---|---|
| `SCHEMA_KEYWORDS` | schema | The schema uses only keywords this validator enforces. | `schema_unsupported_keyword`, `schema_additional_properties_schema` |
| `SCHEMA_STRICT` | schema | Every object schema closes its property set (additionalProperties false). | `schema_open_object` |
| `SCHEMA_VALID` | schema | The data validates against the schema. | `data_extra_class_key`, `data_wrong_type`, `data_missing_required`, `data_detail_on_subclass_slot` |
| `ID_IDENTITY` | id | Class ids and their order equal identity.js CLASS_IDS, which equals the person-identity schema enum without NONE. | `id_renamed_class`, `id_order_swapped`, `id_identity_module_drift` |
| `ID_SRD_ENTRY` | id | Each class id names an SRD 5.1 class entry, and every SRD class entry appears once. | `id_source_entry_points_elsewhere`, `id_srd_gains_a_class` |
| `SOURCE_HASHES` | source | sources lists the six srd51 content files with their current content hash and PDF hash. | `source_hash_stale`, `source_file_changed` |
| `SRC_TRACE` | source | Every src resolves to an srd51 entry path whose text contains the quote (or whose JSON equals it). | `trace_quote_not_in_source`, `trace_sentence_invented`, `trace_path_dangling` |
| `SRC_BINDING` | source | Each src points at its own class entry and field; a src that stands for a whole field quotes it exactly. | `src_bound_to_other_class`, `src_bound_to_other_field`, `src_partial_quote` |
| `LICENSE` | source | license equals the SRD 5.1 license block of the source catalogue. | `license_attribution_dropped` |
| `CLASS_META` | source | name, pages, heading, and readiness equal the SRD entry. | `class_readiness_upgraded`, `class_pages_wrong` |
| `HIT_DIE` | source | The hit die equals the SRD entry. | `hit_die_d10_barbarian` |
| `HIT_POINTS` | source | Hit points equal the SRD text; the first-level base is the die size and the fixed value is the die average rounded up. | `hit_points_fixed_rounded_down` |
| `SAVING_THROWS` | source | Saving throw proficiencies equal the SRD entry. | `saving_throws_swapped` |
| `LEVELS_COMPLETE` | completeness | Each class has exactly levels 1..20 in order, matching 20 SRD table rows. | `levels_level_20_missing` |
| `FEATURES_COMPLETE` | completeness | features lists every SRD class feature with its level and source index, in source order. | `features_list_missing_one` |
| `FEATURES_PLACED` | completeness | Every SRD class feature is gained by exactly one FEATURE_GAINED slot, at its own level. | `features_gained_twice`, `features_rage_not_gained` |
| `UNAVAILABLE_REGISTRY` | completeness | unavailableFacts lists exactly the fields marked UNAVAILABLE, per class, with the same reason. | `unavailable_not_registered` |
| `PRIMARY_ABILITY_UNAVAILABLE` | unavailable | primaryAbility is UNAVAILABLE, and a case-insensitive search of all six srd51 files for its probe finds nothing. | `unavailable_fact_now_in_source`, `unavailable_probe_weakened`, `unavailable_claimed_as_value` |
| `DASH_IS_NONE` | unavailable | An em-dash table cell is null in the data (never 0), and null appears only where the table prints an em dash. | `dash_as_zero_ki`, `dash_as_zero_slot`, `value_as_null` |
| `ADVANCEMENT` | progression | characterAdvancement equals the SRD Character Advancement table. | `advancement_xp_changed` |
| `PROFICIENCY_BONUS` | progression | Each level's proficiency bonus equals the class table and the Character Advancement table. | `proficiency_bonus_level_5`, `proficiency_bonus_table_drift` |
| `FEATURE_LABELS` | progression | Each level's slot labels equal the SRD Features cell, in order; an em dash is an empty list. | `labels_invented_slot`, `labels_emptied_level` |
| `SLOT_REFS` | progression | Each slot's kind, refs, and detail follow from the SRD feature texts (gained, advanced where the text names the level, improved, subclass). | `slot_wrong_kind`, `slot_ref_not_named_by_text`, `slot_detail_dropped` |
| `SOURCE_DISCREPANCIES` | progression | sourceDiscrepancies lists exactly the table labels that name no feature, each tied to a feature gained at that level whose name extends the label. | `discrepancy_record_removed`, `discrepancy_record_invented` |
| `CLASS_COLUMNS` | progression | Class-specific table columns are declared with their inferred type, and each level's values parse from the table cell. | `class_column_rages_capped`, `class_column_type_changed` |
| `SUBCLASS_PROGRESSION` | progression | The subclass choice feature, its level, the subclass feature levels, and the SRD subclass ids follow from the sources. | `subclass_level_dropped`, `subclass_invented` |
| `SPELL_PRESENCE` | spellcasting | Spellcasting is PRESENT exactly for classes with a Spellcasting or Pact Magic feature (name, index, level), otherwise NONE with null per-level data. | `spell_barbarian_casts`, `spell_wizard_none` |
| `SPELL_START` | spellcasting | No level before the spellcasting feature has any spellcasting value, and the feature's level has at least one slot. | `spell_start_moved` |
| `SPELL_ABILITY` | spellcasting | The spellcasting ability is the one the feature text names for this class's spells. | `spell_ability_wrong` |
| `SPELL_LIST` | spellcasting | Each caster names the one SRD spell list for its class; the SRD has no spell list for a non-caster. | `spell_list_swapped` |
| `SPELL_MODEL` | spellcasting | slotModel, maxSlotLevel, and progressionColumns follow from the class table columns. | `spell_model_warlock_standard`, `spell_model_paladin_nine` |
| `SPELL_PROGRESSION` | spellcasting | Each level's cantrips known, spells known, and slots equal the class table, with exactly the table's columns. | `spell_slot_changed`, `spell_cantrips_invented` |
| `SPELL_PREPARATION` | spellcasting | PREPARED classes carry the preparation formula from the text; KNOWN classes have the Spells Known subsection. | `spell_prepared_full_level`, `spell_known_as_prepared` |
| `SPELL_RECOVERY` | spellcasting | Slot recovery is the rest the feature text names. | `spell_recovery_long` |
| `SPELL_RITUAL` | spellcasting | Ritual casting is PRESENT only with a Ritual Casting subsection, with the spell source its sentence names; otherwise NONE. | `spell_ritual_invented`, `spell_ritual_source` |
| `SPELL_FOCUS` | spellcasting | A spellcasting focus is PRESENT only with a Spellcasting Focus subsection, naming its item; otherwise NONE. | `spell_focus_invented` |
| `PROF_ARMOR` | proficiency | Armor proficiencies equal the SRD text: each token maps to equipment armor categories; 'None' is an empty list; a parenthetical is kept as the qualifier. | `armor_wizard_light`, `armor_all_without_heavy`, `armor_druid_qualifier_dropped`, `armor_none_as_null` |
| `PROF_WEAPONS` | proficiency | Weapon proficiencies equal the SRD text: categories, or named weapons resolved to SRD weapon ids. | `weapons_monk_martial`, `weapons_wrong_equipment` |
| `PROF_TOOLS` | proficiency | Tool proficiencies equal the SRD text: fixed SRD tool ids, or a choice of a count from SRD tool groups. | `tools_rogue_dropped`, `tools_choice_count` |
| `PROF_SKILLS` | proficiency | Skill proficiencies equal the SRD text, and every named skill is in the SRD skill list. | `skills_count`, `skills_not_srd` |
| `RACE_POLICY` | no-lock | raceClassPolicy is NO_LOCKS under DEC-036 and lists exactly the SRD races; DEC-036 in OWNER_DECISIONS.md states the no-lock rule. | `race_policy_race_dropped`, `race_policy_decision_missing` |
| `NO_RACE_LOCKS` | no-lock | Outside raceClassPolicy, no key reads as an eligibility condition and no value names a race or subrace, so all race-class pairs stay legal. | `race_lock_key`, `race_lock_value`, `race_lock_id` |
| `NO_AFFINITY` | no-lock | The class data carries no affinity, weight, or favouring values; those belong to SOC.11.02. | `affinity_weight_added` |
| `DOC_SUMMARY` | doc | The class summary table in docs/systems/DEUS_SRD_Classes.md equals the data. | `doc_summary_wrong_die` |
| `DOC_RULES` | doc | The doc's rule table lists exactly the validator's rules. | `doc_rule_missing` |

## Regenerating

After a reviewed change to the srd51 catalogue:

```text
node tasks/SOC.11.01/lane-bn/build_srd_classes.js
node tools/society/test_srd_classes.js
```

The builder fails if a table label, proficiency phrase, or spellcasting sentence can no longer be read. It never guesses a value.
