# SOC.11.01 lane-bn report: 2014 SRD class integration

Writer: Fable (claude). Reviewer: Grok (not run by this writer). Base: `37dbc3ae` (lane launch commit on `task/lane-bn`; the BRIEF names main `6c0e33c1` as base, and the three commits after it touch only `tasks/SOC.11.01/`). This report does not mark the task DONE. No art or audio was touched.

## What changed

| Path | Role |
|---|---|
| `game/data/society/srd_classes.json` | The twelve SRD 5.1 classes, keyed by the identity class ids. 240 level rows, 247 feature slots. |
| `game/data/society/srd_classes.schema.json` | Strict draft 2020-12 schema. Every object is closed. |
| `docs/systems/DEUS_SRD_Classes.md` | Shape, conventions, traceability, class summary, rule table. |
| `tools/society/test_srd_classes.js` | Validator and gate: 45 rules, 84 targeted negative fixtures, provocation runner. |
| `tasks/SOC.11.01/lane-bn/build_srd_classes.js` | Builds the data file from the sources. `--check` compares it with a fresh build. |
| `tasks/SOC.11.01/lane-bn/SOURCE_GAPS.md` | Facts the tracked SRD does not state, and out-of-scope needs. |
| `tasks/SOC.11.01/lane-bn/REPORT.md` | This file. |

The builder reads `game/data/srd51/{character_options,rules,spells,equipment}.json` and the identity ids (`game/js/sim/society/identity.js` `CLASS_IDS`). It hard-codes only three things: the class-column type table, the one recorded label discrepancy, and the text of the unavailable-fact reason. The validator re-derives every value from the sources by its own code path. It infers the column types itself, and derives slot kinds and proficiency grants separately from the builder.

Per class the data holds:

- hit die and hit points;
- saving throws;
- armor, weapon, tool and skill proficiencies, resolved to SRD equipment ids and categories;
- spellcasting: ability, spell list id, slot model, preparation formula, slot recovery, ritual casting, focus;
- the subclass choice feature, its level, and the subclass feature levels;
- class-specific table columns;
- every class feature heading;
- twenty level rows: proficiency bonus, feature slots, column values, spell progression.

The character-level XP and proficiency-bonus table is recorded once at the top level.

Absent, none, zero, and unavailable are kept apart:

- An em-dash table cell is `null` and is never written as `0`.
- A source "None" is `[]`.
- A missing feature or subsection is `status: "NONE"` with a `basis`.
- A fact the extraction does not state is `status: "UNAVAILABLE"`, recorded with the search that proves it.

Only `primaryAbility` is unavailable (see Not done 1).

Every derived fact has a `src` (file key, srd51 entry id, JSON path, verbatim quote). Two rules check them. `SRC_TRACE` proves that each quote is found at its path. `SRC_BINDING` proves that each src points at its own class entry and field, and that whole-field quotes equal the field.

No-lock rule: `raceClassPolicy` is `NO_LOCKS` under DEC-036, with the nine SRD race ids. The validator scans every key and value outside that block for eligibility-style keys and for race or subrace names and ids. None is found, so 108 of 108 race-class pairs carry no lock. No affinity or weight data is present.

## How I tested it

All commands were run in the foreground from the worktree after the last edit. Outputs are copied below.

1. `node tools/society/test_srd_classes.js`: gate 1.
2. `node tools/check_deus_syntax.js`: gate 2.
3. `node tools/society/test_srd_classes.js --provoke-all`: each of the 84 fixtures run as its own process through `--provoke <name>`. Each must exit 1, and its failing rules must be exactly the declared set.
4. `node tools/society/test_srd_classes.js --data game/data/society/srd_classes.json` returned `VALID: 45 rules pass`, exit 0. A copy written to `%TEMP%` with monk level-1 Ki `null` changed to `0` and a `raceRestriction` key added returned `INVALID: SCHEMA_VALID, DASH_IS_NONE, CLASS_COLUMNS, NO_RACE_LOCKS`, exit 1.
5. `node tasks/SOC.11.01/lane-bn/build_srd_classes.js --check`: `srd_classes.json matches a fresh build`.
6. Fresh clones of the base `37dbc3ae` with `core.autocrlf=true` and with `core.autocrlf=false`. The six new files were copied in, and converted to CRLF in the `true` clone. Raw bytes showed the `true` clone checked out CRLF (`{\r\n`) and the `false` clone LF. In both clones:
   - gate 1 exited 0 (`45 rules, 84 fixtures`);
   - gate 2 exited 0 (`60 DEUS plugin files. Errors: 0`);
   - `--provoke-all` returned 84/84, exit 0;
   - `build --check` matched.
   This was a pre-commit simulation. The PM's fresh-clone run of the committed branch is still the authoritative check.

While writing the fixtures I checked each one's tripped rule set against its declaration. When they differed I read the cause and corrected the declaration, or narrowed the rule. The narrowing: the spellcasting facet rules now defer to `SPELL_PRESENCE` when the data says `NONE`. One gap came out of that review. `SRC_TRACE` alone accepted a src that pointed at another class's table, so I added `SRC_BINDING` and three fixtures for it.

## Evidence

### Gate 1: `node tools/society/test_srd_classes.js`

```text
=== SRD CLASSES (SOC.11.01) ===
data game\data\society\srd_classes.json, schema game\data\society\srd_classes.schema.json, doc docs\systems\DEUS_SRD_Classes.md

--- 1. Baseline: every rule on the committed files ---
  [PASS] SCHEMA_KEYWORDS
  [PASS] SCHEMA_STRICT
  [PASS] SCHEMA_VALID
  [PASS] ID_IDENTITY
  [PASS] ID_SRD_ENTRY
  [PASS] SOURCE_HASHES
  [PASS] SRC_TRACE
  [PASS] SRC_BINDING
  [PASS] LICENSE
  [PASS] CLASS_META
  [PASS] HIT_DIE
  [PASS] HIT_POINTS
  [PASS] SAVING_THROWS
  [PASS] LEVELS_COMPLETE
  [PASS] FEATURES_COMPLETE
  [PASS] FEATURES_PLACED
  [PASS] UNAVAILABLE_REGISTRY
  [PASS] PRIMARY_ABILITY_UNAVAILABLE
  [PASS] DASH_IS_NONE
  [PASS] ADVANCEMENT
  [PASS] PROFICIENCY_BONUS
  [PASS] FEATURE_LABELS
  [PASS] SLOT_REFS
  [PASS] SOURCE_DISCREPANCIES
  [PASS] CLASS_COLUMNS
  [PASS] SUBCLASS_PROGRESSION
  [PASS] SPELL_PRESENCE
  [PASS] SPELL_START
  [PASS] SPELL_ABILITY
  [PASS] SPELL_LIST
  [PASS] SPELL_MODEL
  [PASS] SPELL_PROGRESSION
  [PASS] SPELL_PREPARATION
  [PASS] SPELL_RECOVERY
  [PASS] SPELL_RITUAL
  [PASS] SPELL_FOCUS
  [PASS] PROF_ARMOR
  [PASS] PROF_WEAPONS
  [PASS] PROF_TOOLS
  [PASS] PROF_SKILLS
  [PASS] RACE_POLICY
  [PASS] NO_RACE_LOCKS
  [PASS] NO_AFFINITY
  [PASS] DOC_SUMMARY
  [PASS] DOC_RULES
  classes 12, level rows 240, feature slots 247, race-class pairs with no lock 108/108

--- 2. Negative fixtures: each trips exactly its target plus declared rules ---
  [PASS] schema_unsupported_keyword -> SCHEMA_KEYWORDS
  [PASS] schema_additional_properties_schema -> SCHEMA_KEYWORDS (+SCHEMA_STRICT)
  [PASS] schema_open_object -> SCHEMA_STRICT
  [PASS] data_extra_class_key -> SCHEMA_VALID
  [PASS] data_wrong_type -> SCHEMA_VALID (+HIT_DIE)
  [PASS] data_missing_required -> SCHEMA_VALID (+SAVING_THROWS, SRC_BINDING, DOC_SUMMARY)
  [PASS] data_detail_on_subclass_slot -> SCHEMA_VALID (+SLOT_REFS)
  [PASS] id_renamed_class -> ID_IDENTITY (+ID_SRD_ENTRY, SCHEMA_VALID, DOC_SUMMARY, UNAVAILABLE_REGISTRY)
  [PASS] id_order_swapped -> ID_IDENTITY
  [PASS] id_identity_module_drift -> ID_IDENTITY
  [PASS] id_source_entry_points_elsewhere -> ID_SRD_ENTRY
  [PASS] id_srd_gains_a_class -> ID_SRD_ENTRY (+SOURCE_HASHES)
  [PASS] source_hash_stale -> SOURCE_HASHES
  [PASS] source_file_changed -> SOURCE_HASHES
  [PASS] trace_quote_not_in_source -> SRC_TRACE (+SRC_BINDING)
  [PASS] trace_sentence_invented -> SRC_TRACE
  [PASS] trace_path_dangling -> SRC_TRACE (+SRC_BINDING)
  [PASS] src_bound_to_other_class -> SRC_BINDING
  [PASS] src_bound_to_other_field -> SRC_BINDING
  [PASS] src_partial_quote -> SRC_BINDING
  [PASS] license_attribution_dropped -> LICENSE
  [PASS] class_readiness_upgraded -> CLASS_META
  [PASS] class_pages_wrong -> CLASS_META
  [PASS] hit_die_d10_barbarian -> HIT_DIE (+DOC_SUMMARY)
  [PASS] hit_points_fixed_rounded_down -> HIT_POINTS
  [PASS] saving_throws_swapped -> SAVING_THROWS (+DOC_SUMMARY)
  [PASS] levels_level_20_missing -> LEVELS_COMPLETE (+SCHEMA_VALID, PROFICIENCY_BONUS, FEATURE_LABELS, CLASS_COLUMNS, FEATURES_PLACED)
  [PASS] features_list_missing_one -> FEATURES_COMPLETE
  [PASS] features_gained_twice -> FEATURES_PLACED (+SLOT_REFS)
  [PASS] features_rage_not_gained -> FEATURES_PLACED (+SLOT_REFS)
  [PASS] unavailable_not_registered -> UNAVAILABLE_REGISTRY
  [PASS] unavailable_fact_now_in_source -> PRIMARY_ABILITY_UNAVAILABLE
  [PASS] unavailable_probe_weakened -> PRIMARY_ABILITY_UNAVAILABLE
  [PASS] unavailable_claimed_as_value -> PRIMARY_ABILITY_UNAVAILABLE (+SCHEMA_VALID, UNAVAILABLE_REGISTRY)
  [PASS] dash_as_zero_ki -> DASH_IS_NONE (+CLASS_COLUMNS)
  [PASS] dash_as_zero_slot -> DASH_IS_NONE (+SPELL_PROGRESSION)
  [PASS] value_as_null -> DASH_IS_NONE (+CLASS_COLUMNS)
  [PASS] advancement_xp_changed -> ADVANCEMENT
  [PASS] proficiency_bonus_level_5 -> PROFICIENCY_BONUS
  [PASS] proficiency_bonus_table_drift -> PROFICIENCY_BONUS (+ADVANCEMENT, SOURCE_HASHES)
  [PASS] labels_invented_slot -> FEATURE_LABELS (+SLOT_REFS)
  [PASS] labels_emptied_level -> FEATURE_LABELS (+FEATURES_PLACED)
  [PASS] slot_wrong_kind -> SLOT_REFS
  [PASS] slot_ref_not_named_by_text -> SLOT_REFS
  [PASS] slot_detail_dropped -> SLOT_REFS
  [PASS] discrepancy_record_removed -> SOURCE_DISCREPANCIES (+SLOT_REFS)
  [PASS] discrepancy_record_invented -> SOURCE_DISCREPANCIES
  [PASS] class_column_rages_capped -> CLASS_COLUMNS
  [PASS] class_column_type_changed -> CLASS_COLUMNS
  [PASS] subclass_level_dropped -> SUBCLASS_PROGRESSION
  [PASS] subclass_invented -> SUBCLASS_PROGRESSION
  [PASS] spell_barbarian_casts -> SPELL_PRESENCE (+SCHEMA_VALID, DOC_SUMMARY)
  [PASS] spell_wizard_none -> SPELL_PRESENCE (+DOC_SUMMARY)
  [PASS] spell_start_moved -> SPELL_START (+SPELL_PRESENCE)
  [PASS] spell_ability_wrong -> SPELL_ABILITY (+DOC_SUMMARY)
  [PASS] spell_list_swapped -> SPELL_LIST
  [PASS] spell_model_warlock_standard -> SPELL_MODEL (+DOC_SUMMARY)
  [PASS] spell_model_paladin_nine -> SPELL_MODEL (+DOC_SUMMARY)
  [PASS] spell_slot_changed -> SPELL_PROGRESSION
  [PASS] spell_cantrips_invented -> SPELL_PROGRESSION
  [PASS] spell_prepared_full_level -> SPELL_PREPARATION
  [PASS] spell_known_as_prepared -> SPELL_PREPARATION (+DOC_SUMMARY, SCHEMA_VALID, SRC_BINDING)
  [PASS] spell_recovery_long -> SPELL_RECOVERY
  [PASS] spell_ritual_invented -> SPELL_RITUAL (+SRC_BINDING)
  [PASS] spell_ritual_source -> SPELL_RITUAL
  [PASS] spell_focus_invented -> SPELL_FOCUS (+SRC_BINDING)
  [PASS] armor_wizard_light -> PROF_ARMOR
  [PASS] armor_all_without_heavy -> PROF_ARMOR
  [PASS] armor_druid_qualifier_dropped -> PROF_ARMOR
  [PASS] armor_none_as_null -> PROF_ARMOR (+SCHEMA_VALID)
  [PASS] weapons_monk_martial -> PROF_WEAPONS
  [PASS] weapons_wrong_equipment -> PROF_WEAPONS
  [PASS] tools_rogue_dropped -> PROF_TOOLS
  [PASS] tools_choice_count -> PROF_TOOLS
  [PASS] skills_count -> PROF_SKILLS
  [PASS] skills_not_srd -> PROF_SKILLS
  [PASS] race_policy_race_dropped -> RACE_POLICY
  [PASS] race_policy_decision_missing -> RACE_POLICY
  [PASS] race_lock_key -> NO_RACE_LOCKS (+SCHEMA_VALID)
  [PASS] race_lock_value -> NO_RACE_LOCKS
  [PASS] race_lock_id -> NO_RACE_LOCKS (+PROF_ARMOR)
  [PASS] affinity_weight_added -> NO_AFFINITY (+SCHEMA_VALID)
  [PASS] doc_summary_wrong_die -> DOC_SUMMARY
  [PASS] doc_rule_missing -> DOC_RULES

--- 3. Coverage: every rule is the target of a fixture ---
  [PASS] SCHEMA_KEYWORDS: 2 fixture(s)
  [PASS] SCHEMA_STRICT: 1 fixture(s)
  [PASS] SCHEMA_VALID: 4 fixture(s)
  [PASS] ID_IDENTITY: 3 fixture(s)
  [PASS] ID_SRD_ENTRY: 2 fixture(s)
  [PASS] SOURCE_HASHES: 2 fixture(s)
  [PASS] SRC_TRACE: 3 fixture(s)
  [PASS] SRC_BINDING: 3 fixture(s)
  [PASS] LICENSE: 1 fixture(s)
  [PASS] CLASS_META: 2 fixture(s)
  [PASS] HIT_DIE: 1 fixture(s)
  [PASS] HIT_POINTS: 1 fixture(s)
  [PASS] SAVING_THROWS: 1 fixture(s)
  [PASS] LEVELS_COMPLETE: 1 fixture(s)
  [PASS] FEATURES_COMPLETE: 1 fixture(s)
  [PASS] FEATURES_PLACED: 2 fixture(s)
  [PASS] UNAVAILABLE_REGISTRY: 1 fixture(s)
  [PASS] PRIMARY_ABILITY_UNAVAILABLE: 3 fixture(s)
  [PASS] DASH_IS_NONE: 3 fixture(s)
  [PASS] ADVANCEMENT: 1 fixture(s)
  [PASS] PROFICIENCY_BONUS: 2 fixture(s)
  [PASS] FEATURE_LABELS: 2 fixture(s)
  [PASS] SLOT_REFS: 3 fixture(s)
  [PASS] SOURCE_DISCREPANCIES: 2 fixture(s)
  [PASS] CLASS_COLUMNS: 2 fixture(s)
  [PASS] SUBCLASS_PROGRESSION: 2 fixture(s)
  [PASS] SPELL_PRESENCE: 2 fixture(s)
  [PASS] SPELL_START: 1 fixture(s)
  [PASS] SPELL_ABILITY: 1 fixture(s)
  [PASS] SPELL_LIST: 1 fixture(s)
  [PASS] SPELL_MODEL: 2 fixture(s)
  [PASS] SPELL_PROGRESSION: 2 fixture(s)
  [PASS] SPELL_PREPARATION: 2 fixture(s)
  [PASS] SPELL_RECOVERY: 1 fixture(s)
  [PASS] SPELL_RITUAL: 2 fixture(s)
  [PASS] SPELL_FOCUS: 1 fixture(s)
  [PASS] PROF_ARMOR: 4 fixture(s)
  [PASS] PROF_WEAPONS: 2 fixture(s)
  [PASS] PROF_TOOLS: 2 fixture(s)
  [PASS] PROF_SKILLS: 2 fixture(s)
  [PASS] RACE_POLICY: 2 fixture(s)
  [PASS] NO_RACE_LOCKS: 3 fixture(s)
  [PASS] NO_AFFINITY: 1 fixture(s)
  [PASS] DOC_SUMMARY: 1 fixture(s)
  [PASS] DOC_RULES: 1 fixture(s)

============================================================
SRD CLASSES PASSED: 45 rules, 84 fixtures each tripping its target (2833 ms).
============================================================
EXIT_SRD_CLASSES:0
```

### Gate 2: `node tools/check_deus_syntax.js`

```text
Checked 60 DEUS plugin files. Errors: 0
EXIT_SYNTAX:0
```

### Provocations: `node tools/society/test_srd_classes.js --provoke-all`

```text
  [PASS] exit 1 schema_unsupported_keyword -> ["SCHEMA_KEYWORDS"]
  [PASS] exit 1 schema_additional_properties_schema -> ["SCHEMA_KEYWORDS","SCHEMA_STRICT"]
  [PASS] exit 1 schema_open_object -> ["SCHEMA_STRICT"]
  [PASS] exit 1 data_extra_class_key -> ["SCHEMA_VALID"]
  [PASS] exit 1 data_wrong_type -> ["SCHEMA_VALID","HIT_DIE"]
  [PASS] exit 1 data_missing_required -> ["SCHEMA_VALID","SRC_BINDING","SAVING_THROWS","DOC_SUMMARY"]
  [PASS] exit 1 data_detail_on_subclass_slot -> ["SCHEMA_VALID","SLOT_REFS"]
  [PASS] exit 1 id_renamed_class -> ["SCHEMA_VALID","ID_IDENTITY","ID_SRD_ENTRY","UNAVAILABLE_REGISTRY","DOC_SUMMARY"]
  [PASS] exit 1 id_order_swapped -> ["ID_IDENTITY"]
  [PASS] exit 1 id_identity_module_drift -> ["ID_IDENTITY"]
  [PASS] exit 1 id_source_entry_points_elsewhere -> ["ID_SRD_ENTRY"]
  [PASS] exit 1 id_srd_gains_a_class -> ["ID_SRD_ENTRY","SOURCE_HASHES"]
  [PASS] exit 1 source_hash_stale -> ["SOURCE_HASHES"]
  [PASS] exit 1 source_file_changed -> ["SOURCE_HASHES"]
  [PASS] exit 1 trace_quote_not_in_source -> ["SRC_TRACE","SRC_BINDING"]
  [PASS] exit 1 trace_sentence_invented -> ["SRC_TRACE"]
  [PASS] exit 1 trace_path_dangling -> ["SRC_TRACE","SRC_BINDING"]
  [PASS] exit 1 src_bound_to_other_class -> ["SRC_BINDING"]
  [PASS] exit 1 src_bound_to_other_field -> ["SRC_BINDING"]
  [PASS] exit 1 src_partial_quote -> ["SRC_BINDING"]
  [PASS] exit 1 license_attribution_dropped -> ["LICENSE"]
  [PASS] exit 1 class_readiness_upgraded -> ["CLASS_META"]
  [PASS] exit 1 class_pages_wrong -> ["CLASS_META"]
  [PASS] exit 1 hit_die_d10_barbarian -> ["HIT_DIE","DOC_SUMMARY"]
  [PASS] exit 1 hit_points_fixed_rounded_down -> ["HIT_POINTS"]
  [PASS] exit 1 saving_throws_swapped -> ["SAVING_THROWS","DOC_SUMMARY"]
  [PASS] exit 1 levels_level_20_missing -> ["SCHEMA_VALID","LEVELS_COMPLETE","FEATURES_PLACED","PROFICIENCY_BONUS","FEATURE_LABELS","CLASS_COLUMNS"]
  [PASS] exit 1 features_list_missing_one -> ["FEATURES_COMPLETE"]
  [PASS] exit 1 features_gained_twice -> ["FEATURES_PLACED","SLOT_REFS"]
  [PASS] exit 1 features_rage_not_gained -> ["FEATURES_PLACED","SLOT_REFS"]
  [PASS] exit 1 unavailable_not_registered -> ["UNAVAILABLE_REGISTRY"]
  [PASS] exit 1 unavailable_fact_now_in_source -> ["PRIMARY_ABILITY_UNAVAILABLE"]
  [PASS] exit 1 unavailable_probe_weakened -> ["PRIMARY_ABILITY_UNAVAILABLE"]
  [PASS] exit 1 unavailable_claimed_as_value -> ["SCHEMA_VALID","UNAVAILABLE_REGISTRY","PRIMARY_ABILITY_UNAVAILABLE"]
  [PASS] exit 1 dash_as_zero_ki -> ["DASH_IS_NONE","CLASS_COLUMNS"]
  [PASS] exit 1 dash_as_zero_slot -> ["DASH_IS_NONE","SPELL_PROGRESSION"]
  [PASS] exit 1 value_as_null -> ["DASH_IS_NONE","CLASS_COLUMNS"]
  [PASS] exit 1 advancement_xp_changed -> ["ADVANCEMENT"]
  [PASS] exit 1 proficiency_bonus_level_5 -> ["PROFICIENCY_BONUS"]
  [PASS] exit 1 proficiency_bonus_table_drift -> ["SOURCE_HASHES","ADVANCEMENT","PROFICIENCY_BONUS"]
  [PASS] exit 1 labels_invented_slot -> ["FEATURE_LABELS","SLOT_REFS"]
  [PASS] exit 1 labels_emptied_level -> ["FEATURES_PLACED","FEATURE_LABELS"]
  [PASS] exit 1 slot_wrong_kind -> ["SLOT_REFS"]
  [PASS] exit 1 slot_ref_not_named_by_text -> ["SLOT_REFS"]
  [PASS] exit 1 slot_detail_dropped -> ["SLOT_REFS"]
  [PASS] exit 1 discrepancy_record_removed -> ["SLOT_REFS","SOURCE_DISCREPANCIES"]
  [PASS] exit 1 discrepancy_record_invented -> ["SOURCE_DISCREPANCIES"]
  [PASS] exit 1 class_column_rages_capped -> ["CLASS_COLUMNS"]
  [PASS] exit 1 class_column_type_changed -> ["CLASS_COLUMNS"]
  [PASS] exit 1 subclass_level_dropped -> ["SUBCLASS_PROGRESSION"]
  [PASS] exit 1 subclass_invented -> ["SUBCLASS_PROGRESSION"]
  [PASS] exit 1 spell_barbarian_casts -> ["SCHEMA_VALID","SPELL_PRESENCE","DOC_SUMMARY"]
  [PASS] exit 1 spell_wizard_none -> ["SPELL_PRESENCE","DOC_SUMMARY"]
  [PASS] exit 1 spell_start_moved -> ["SPELL_PRESENCE","SPELL_START"]
  [PASS] exit 1 spell_ability_wrong -> ["SPELL_ABILITY","DOC_SUMMARY"]
  [PASS] exit 1 spell_list_swapped -> ["SPELL_LIST"]
  [PASS] exit 1 spell_model_warlock_standard -> ["SPELL_MODEL","DOC_SUMMARY"]
  [PASS] exit 1 spell_model_paladin_nine -> ["SPELL_MODEL","DOC_SUMMARY"]
  [PASS] exit 1 spell_slot_changed -> ["SPELL_PROGRESSION"]
  [PASS] exit 1 spell_cantrips_invented -> ["SPELL_PROGRESSION"]
  [PASS] exit 1 spell_prepared_full_level -> ["SPELL_PREPARATION"]
  [PASS] exit 1 spell_known_as_prepared -> ["SCHEMA_VALID","SRC_BINDING","SPELL_PREPARATION","DOC_SUMMARY"]
  [PASS] exit 1 spell_recovery_long -> ["SPELL_RECOVERY"]
  [PASS] exit 1 spell_ritual_invented -> ["SRC_BINDING","SPELL_RITUAL"]
  [PASS] exit 1 spell_ritual_source -> ["SPELL_RITUAL"]
  [PASS] exit 1 spell_focus_invented -> ["SRC_BINDING","SPELL_FOCUS"]
  [PASS] exit 1 armor_wizard_light -> ["PROF_ARMOR"]
  [PASS] exit 1 armor_all_without_heavy -> ["PROF_ARMOR"]
  [PASS] exit 1 armor_druid_qualifier_dropped -> ["PROF_ARMOR"]
  [PASS] exit 1 armor_none_as_null -> ["SCHEMA_VALID","PROF_ARMOR"]
  [PASS] exit 1 weapons_monk_martial -> ["PROF_WEAPONS"]
  [PASS] exit 1 weapons_wrong_equipment -> ["PROF_WEAPONS"]
  [PASS] exit 1 tools_rogue_dropped -> ["PROF_TOOLS"]
  [PASS] exit 1 tools_choice_count -> ["PROF_TOOLS"]
  [PASS] exit 1 skills_count -> ["PROF_SKILLS"]
  [PASS] exit 1 skills_not_srd -> ["PROF_SKILLS"]
  [PASS] exit 1 race_policy_race_dropped -> ["RACE_POLICY"]
  [PASS] exit 1 race_policy_decision_missing -> ["RACE_POLICY"]
  [PASS] exit 1 race_lock_key -> ["SCHEMA_VALID","NO_RACE_LOCKS"]
  [PASS] exit 1 race_lock_value -> ["NO_RACE_LOCKS"]
  [PASS] exit 1 race_lock_id -> ["PROF_ARMOR","NO_RACE_LOCKS"]
  [PASS] exit 1 affinity_weight_added -> ["SCHEMA_VALID","NO_AFFINITY"]
  [PASS] exit 1 doc_summary_wrong_die -> ["DOC_SUMMARY"]
  [PASS] exit 1 doc_rule_missing -> ["DOC_RULES"]
PROVOCATIONS 84/84 exited 1 with exactly their declared rules failing
EXIT_PROVOKE_ALL:0
```

No screenshot. The deliverable is data, with no runtime or visual surface.

## Not done / known problems

1. **Primary ability is unavailable** for all twelve classes. The tracked SRD 5.1 extraction never states one. A case-insensitive search of all six srd51 content files for `primary abilit` finds 0 matches. The Multiclassing Prerequisites table is an optional-rule prerequisite, not a primary ability, and was not substituted. See `SOURCE_GAPS.md` G1.
2. **11 of 12 class records are `parsed`, not `verified`.** Under the 2026-09-22 readiness policy they must be verified against the rendered pages before they become authoritative gameplay input. Verification writes outside this lane's paths. See G3.
3. **Deliberately not integrated:**
   - multiclassing, an optional rule;
   - starting equipment;
   - feature and subclass texts, which are referenced, not copied;
   - spell list contents, which are referenced by id;
   - wizard spellbook sizes.
   See G4.
4. **No runtime consumer, and nothing loads the file.** The Definition of Done items for an RMMZ Playtest (F5), screenshot, and dev console do not apply to a data-only package. Not checked.
5. **Hash coupling.** `sources.*.contentSha256` pins the six srd51 files. Any later srd51 change fails `SOURCE_HASHES` until the data file is rebuilt with the builder and reviewed. That is intended, but it means a merge that also touches srd51 needs a rebuild.
6. **Scope of the lock scan.** The no-lock guarantee covers this file only. It does not constrain how SOC.11.02 or a future scheduler uses the class ids.
7. **`docs/STATUS.md` was not edited**, per the brief (no WBS or status edits). The coordinator records the lane state.

## Try it in RMMZ

Nothing to try in the editor. No plugin loads this file. To inspect:

1. `node tools/society/test_srd_classes.js`
2. `node tools/society/test_srd_classes.js --provoke dash_as_zero_ki`

Expected: step 1 ends with `SRD CLASSES PASSED` and exit 0. Step 2 prints `[FAIL] DASH_IS_NONE` and `[FAIL] CLASS_COLUMNS`, and exits 1.

## Decisions needed

1. Primary ability: keep `UNAVAILABLE`, name an approved source, or define a DEUS rule outside the SRD layer (G1).
2. Whether to schedule verification of the eleven `parsed` class entries before a runtime consumer adopts this file (G3).
