# Grok review — SOC.12.01 lane-bk (Master Craft Catalogue)

Reviewed commit:

`5dfd72a9ff5f6bc7c6befbfe17a2f25ffaf38fc7`

The corrected tip passes. The failure at `1c6c2747f853c730a84c7bb1079bd5984e60c65d` is closed in the committed catalogue: production rows match the recipes they cite, SRD rule ids and pages are the repository extracts, progression uses the person-spec tier names and the skills-standard quality names, callings are a bijection, and duty strings are real job types. Both lane gates exit 0. Every named validator check has a mutant that actually kills it. Two test holes remain. Neither one is present in the committed catalogue.

## Identity

| Field | Value |
|---|---|
| Reviewer | Grok, independent reviewer for lane-bk |
| Writer | Gemini (`deus-gemini <willshw89@gmail.com>`) |
| Branch | `task/lane-bk` |
| Writer tip | `5dfd72a9ff5f6bc7c6befbfe17a2f25ffaf38fc7` |
| Writer subject | `[gemini] SOC.12.01 fix-review` |
| Writer author date | 2026-09-27T18:01:27-05:00 |
| Writer parent | `29448f921750458995ccb7c0510b8658c78f3863` |
| Prior failure review | `1c6c2747f853c730a84c7bb1079bd5984e60c65d` `[grok] SOC.12.01 review 991820ec` |
| Failed writer tip | `991820ec1b411243e32d39347c2762efd58f0be8` |
| BRIEF base | `a768eba377deab388e5def474a0bb1752fd732c3` |
| `git merge-base main 5dfd72a9ff5f6bc7c6befbfe17a2f25ffaf38fc7` | `a768eba377deab388e5def474a0bb1752fd732c3` (exit 0) |
| `git merge-base origin/main 5dfd72a9ff5f6bc7c6befbfe17a2f25ffaf38fc7` | `6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0` (exit 0) |

`origin/main` is behind local `main`. The lane parent is the BRIEF base, so the reviewed range is `a768eba377deab388e5def474a0bb1752fd732c3..5dfd72a9ff5f6bc7c6befbfe17a2f25ffaf38fc7`.

Worktree `HEAD` at review time was `3526b2f8e1a683c437b5da0f80a68636154f0cc4`, the ops launch prompt after the tip. `git diff --name-status 5dfd72a9ff5f6bc7c6befbfe17a2f25ffaf38fc7 HEAD` (exit 0) is only `A tasks/SOC.12.01/lane-bk/launches/20260927_181349_prompt.txt`. Gates and probes read the tip's catalogue, schema, test, builder, and system document. `git status --porcelain` was empty after the probes (exit 0).

This review does not edit the catalogue, the schema, the test, the builder, the system document, the WBS, or status.

## Scope

`git diff --name-status a768eba377deab388e5def474a0bb1752fd732c3 5dfd72a9ff5f6bc7c6befbfe17a2f25ffaf38fc7` (exit 0): 13 files, 5408 insertions. Every path is `A`.

| Path | In `lane.json` allowedPaths |
|---|---|
| `docs/systems/DEUS_CraftProfessions.md` | yes |
| `game/data/society/craft_catalogue.json` | yes |
| `game/data/society/craft_catalogue.schema.json` | yes |
| `tasks/SOC.12.01/lane-bk/BRIEF.md` | yes (`tasks/SOC.12.01/**`) |
| `tasks/SOC.12.01/lane-bk/REPORT.md` | yes |
| `tasks/SOC.12.01/lane-bk/build_craft_catalogue.js` | yes |
| `tasks/SOC.12.01/lane-bk/lane.json` | yes |
| `tasks/SOC.12.01/lane-bk/launches/20260927_170653_prompt.txt` | yes |
| `tasks/SOC.12.01/lane-bk/launches/20260927_170712_prompt.txt` | yes |
| `tasks/SOC.12.01/lane-bk/launches/20260927_172427_prompt.txt` | yes |
| `tasks/SOC.12.01/lane-bk/launches/20260927_174426_prompt.txt` | yes |
| `tasks/SOC.12.01/lane-bk/review_grok_991820ec.md` | yes |
| `tools/society/test_craft_catalogue.js` | yes |

The fix commit itself, `git diff --name-status 29448f921750458995ccb7c0510b8658c78f3863 5dfd72a9ff5f6bc7c6befbfe17a2f25ffaf38fc7` (exit 0), modifies the six implementation files: the system document, both catalogue files, `REPORT.md`, `build_craft_catalogue.js`, and `tools/society/test_craft_catalogue.js`.

Forbidden-path diffs of the same range were empty (exit 0):

```
git diff --name-only a768eba377deab388e5def474a0bb1752fd732c3 5dfd72a9ff5f6bc7c6befbfe17a2f25ffaf38fc7 -- art game/img game/audio docs/STATUS.md docs/OWNER_DECISIONS.md docs/society docs/WORK_QUEUE.md game/js/plugins.js game/js/plugins
```

`git diff --name-only a768eba377deab388e5def474a0bb1752fd732c3 5dfd72a9ff5f6bc7c6befbfe17a2f25ffaf38fc7 -- "*WBS*"` was empty (exit 0). `docs/society/DEUS_SOCIETY_WBS.md` line 63 still shows SOC.12.01 as `PLANNED`. No art or audio path is in the diff.

Requiring `build_craft_catalogue.js` through a mocked `fs.writeFileSync` reproduced the committed `craft_catalogue.json` bytes (`BUILDER_MATCH true`, 84181 bytes) and left the worktree file unchanged.

## Commands and exits

Run from `C:\Users\snewt\.deus_worktrees\lane-bk` on 2026-09-27. The catalogue was loaded and mutated in memory. Schema results below are `schemaErrors` return counts from `tools/society/test_craft_catalogue.js`, executed with `main()` replaced so the probe could clone the parsed catalogue.

### `node tools/society/test_craft_catalogue.js`

Exit 0. Summary line: `CRAFT CATALOGUE PASSED: 23 baseline checks, 26 mutants killed (35.8 ms).`

All 23 baseline names printed `[PASS]`: `schema_validates`, `catalogue_has_34_crafts`, `craft_ids_match_canonical_set`, `none_semantics_explicitly_defined`, `family_distribution_exact`, `three_axes_independent`, `duty_scheduler_isolated`, `progression_four_tiers_per_craft`, `progression_ranks_monotone`, `progression_efficiency_monotone`, `progression_quality_access_stepped`, `progression_downtime_days_monotone`, `production_resource_classes_valid`, `production_workstations_valid`, `production_recipes_valid`, `production_labors_valid`, `production_items_valid`, `production_recipes_reconciled`, `srd51_tools_grounded`, `srd51_rules_grounded`, `srd51_crafting_rate_standard`, `calling_mappings_consistent`, `faction_knowledge_closure`.

All 26 mutants printed `[PASS]`. The killed-by list on each line is the checks that actually failed. `mutant_invalid_labor` printed `killed by production_labors_valid` only.

### `node tools/check_deus_syntax.js`

Exit 0. `Checked 60 DEUS plugin files. Errors: 0`. The script runs `node -c` on `game/js/plugins/DEUS_*.js` only. It does not parse the catalogue, the schema, or `test_craft_catalogue.js`.

### Independent provocations

| Probe | Checks that failed | Schema errors |
|---|---|---|
| Append labor id `not_a_labor` on FARMER | `production_labors_valid`, `production_recipes_reconciled` (labors without recipes) | 0 |
| Append output id `not_an_item` on FARMER | `production_items_valid`, `production_recipes_reconciled` | 0 |
| Set FARMER master `downtimeTrainingDays` to 10 | `progression_downtime_days_monotone` | 0 |
| Set `dutyIsolationRule` to `""` | `schema_validates`, `duty_scheduler_isolated` | 1 |
| Replace one `craftingRate` with `10 gp per day` | `srd51_crafting_rate_standard` | 0 |
| Add calling `shepherd` on FARMER | `calling_mappings_consistent` | 0 |
| Set `dutyIsolationRule` to `duty overwrites craft` | `duty_scheduler_isolated` | 0 |
| Set one `downtimeActivity` to `srd:rule:does-not-exist` | `srd51_rules_grounded` | 0 |
| Set one `qualityTierAccess` to `SUPERIOR` | `schema_validates`, `progression_quality_access_stepped` | 1 |
| Set every master `qualityTierAccess` to `FINE` | `progression_quality_access_stepped` | 0 |
| Append output `sword_long` on ARMORER | `production_recipes_reconciled` | 0 |
| Drop SMELTER output `charcoal` | `production_recipes_reconciled` | 0 |
| Clear SMELTER `associatedLabors` | `production_recipes_reconciled` (missing `furnace_operator`) | 0 |
| Set COOK workstations to `workbench` | `production_recipes_reconciled` (station `fire` unsatisfied) | 0 |
| Give FARMER output `log` with `associatedRecipes: []` | `production_recipes_reconciled` | 0 |
| Give FARMER input `log` with `associatedRecipes: []` | `production_recipes_reconciled` | 0 |
| Replace `crafts` with 34 copies of FARMER | `craft_ids_match_canonical_set`, `family_distribution_exact`, `calling_mappings_consistent` | 0 |
| Append labor id `soldier` on SMELTER | none | 0 |
| Append workstation `workbench` on BLACKSMITH | none | 0 |
| Set every multiplier sequence to 1, 1.1, 1.2, 1.3 | none | 0 |
| Set every day sequence to 1, 2, 3, 4 | none | 0 |
| Set every `downtimeTrainingDays` to 250 | none | 0 |
| Set one `sourceCitation` to `SRD 5.1 pp. 150, 187` | none | 0 |
| Append `HAUL_RESOURCE` to `allowedDutyAssignments` | none | 0 |
| Set `dutyIsolationRule` to `The scheduler does not wait; duty may overwrite and derive craft.` | none | 0 |
| Set one `downtimeActivity` to existing id `srd:rule:races-racial-traits` | none | 0 |

Coverage walk of the 26 mutants: every one of the 23 baseline check names is killed by at least one mutant. `mutant_invalid_labor` declares `production_recipes_reconciled` in `kills` and does not kill it. The runner marks a mutant passed when at least one declared check fails (`killed.length > 0`), so that declaration does not fail the gate.

## Prior failure disposition

Checked against `tasks/SOC.12.01/lane-bk/review_grok_991820ec.md` at `1c6c2747`.

| Prior finding | Result on this tip |
|---|---|
| BLOCKER — progression numbers and quality names `SUPERIOR` / `EXCELLENT`, plus a tick formula | Closed. Quality enum is `CRUDE`, `STANDARD`, `FINE`, `MASTERWORK` (`craft_catalogue.schema.json` `$defs.qualityTier`). `SUPERIOR` fails schema validation. The committed ladder is apprentice 1.00 / `STANDARD` / 250, journeyman 1.25 / `STANDARD` / 500, artisan 1.50 / `FINE` / 1000, master 1.75 / `MASTERWORK` / 1500, one signature on all 34 crafts. Those rate points sit in the illustrative bands of `docs/systems/DEUS_SKILLS_AND_PROFICIENCY_STANDARD.md` §5 (1.0×, 1.15–1.30×, 1.30–1.60×, 1.60–2.00×). Tier names match `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md` §2. The 250-day figure is the Training sentence of `srd:rule:adventuring-between-adventures`. `DEUS_CraftProfessions.md` §5 and §10 mark the point multipliers, the 500/1000/1500 day counts, and the promotion trigger as open owner decisions. The gate accepts other monotone ladders (probes above). The long-sword tick formula is gone from the system document. |
| BLOCKER — cited production rows contradict `recipes.list` | Closed. See the recipe section. |
| MAJOR — downtime ids and pages 150 and 187 | Closed. Every craft uses `srd:rule:adventuring-between-adventures`, whose `source.pages` are `[88, 89]`. Tool citations are page 70, or 70–71 for `srd:tool:herbalism-kit`, matching `equipment.json`. No catalogue citation uses page 150 or 187. |
| MAJOR — four checks had no failing fixture; extra callings and any duty sentence passed | Closed for the named cases. `shepherd`, `duty overwrites craft`, a missing rule id, an inverted day ladder, a bad labor id, and a bad crafting-rate string each fail a check. All 23 checks are killed by some mutant. |
| MINOR — scribe apostrophe U+2019 | Closed. Catalogue and `srd:tool:calligraphers-supplies` both use U+0027. `Smith’s tools` uses U+2019 on both sides, matching `equipment.json`. Tool-name mismatches: 0. |
| MINOR — calling counts 24 crafts and 20 Question 5 callings | Closed. §8.1 is 26 callings to 25 crafts. §8.2 names the 21 Question 5 tokens. None of those 21 keys are in `callingMappings` or `Identity.CALLING_CRAFT`. |
| MINOR — invented `HAUL_RESOURCE` duty tokens | Closed in the data. `allowedDutyAssignments` is `haul`, `gather`, `fetch`, `move`, `wander`, `sleep`, `eat`, `drink`. All eight are in the built-in job list in `game/js/plugins/DEUS_Jobs.js` (the `builtIn` array at the jobs suite). The isolation sentence forbids `currentDuty`, transient duty, and live job objects from overwriting or deriving craft. No craft object carries `civicOffice`, `class`, `currentDuty`, or `duty`. |

## What held

**Recipes.** `DEUS_WorldCatalog.json` has 41 recipes, 9 labors, and 61 item types. Fourteen crafts cite 36 recipes. No recipe is cited by two crafts. The other five recipes (`stone_knife`, `stone_axe`, `stone_pick`, `sift_sand`, `dig_clay`) are uncited. For every cited craft, the input id set equals the union of `recipe.inputs` keys, the output id set equals the union of `recipe.outputs` keys, and the labor id set equals the set of non-empty `recipe.labor` values.

| Craft | Recipes | Inputs | Outputs | Labor | Station |
|---|---|---|---|---|---|
| `LOGGER` | `split_firewood` | `log` | `firewood` | — | `at` null; workstations empty |
| `SMELTER` | `charcoal`, `bar_iron`, `bar_copper` | `firewood`, `ore_iron`, `ore_copper`, `charcoal` | `charcoal`, `bar_iron`, `bar_copper` | `furnace_operator` | `furnace` |
| `BLACKSMITH` | `forge_hardware` | `bar_iron` | `hardware_iron` | — | `smithy` |
| `ARMORER` | `helmet_iron`, `mail_iron`, `greaves_iron`, `shield_iron` | `bar_iron`, `leather`, `log` | `helmet_iron`, `mail_iron`, `greaves_iron`, `shield_iron` | `armorsmith` | `smithy` |
| `WEAPONSMITH` | six weapon recipes | `bar_iron`, `bar_copper`, `log`, `leather`, `fiber` | `spear`, `dagger_iron`, `sword_short`, `sword_long`, `axe_iron`, `mace` | `weaponsmith` | `smithy` |
| `CARPENTER` | `club`, `spear_stone`, `shield_wood`, `plane_planks` | `log`, `stone`, `leather`, `fiber` | `club`, `spear`, `shield_wood`, `plank_dressed` | `carpenter` | `workbench` |
| `MASON` | `chisel_stone_block` | `stone` | `stone_block` | — | `mason_bench` |
| `LEATHERWORKER` | `sling`, `helmet_leather`, `armor_leather`, `leggings_leather` | `leather`, `fiber` | those four outputs | `leatherworker` | `workbench` |
| `TANNER` | `leather` | `hide` | `leather` | `tanner` | `at` tag `tannery`; object `tanning_rack` carries that tag and is the only such object |
| `TAILOR` | `fiber_wrap`, `hide_cloak` | `fiber`, `hide` | `fiber_wrap`, `hide_cloak` | — | `at` null; workstations empty |
| `COOK` | `cook_meat`, `cook_fish` | `meat_raw`, `fish` | `meat_cooked` | — | `at` tag `fire`; `kitchen_hearth` and `campfire` carry it |
| `POTTER` | `fire_brick`, `lime_mortar` | `clay`, `stone`, `sand` | `brick_clay`, `mortar_lime` | — | `pottery_kiln` |
| `FLETCHER` | `arrows_stone`, `arrows_bone`, `arrows_iron` | `log`, `feathers`, `stone`, `bone`, `bar_iron` | `arrows` | `fletcher` | `at` tag `fletcher`; object `fletcher_bench` |
| `BOWYER` | `bow_short`, `bow_long` | `log`, `fiber` | `bow_short`, `bow_long` | `bowyer` | `at` tag `bowyer`; object `bowyer_bench` |

`pottery_kiln` also carries the tag `fire`. Cook does not list it. Potter's recipes set `at` to the object id `pottery_kiln`. The cook row satisfies `at: "fire"` through the two kitchen fires.

The twenty crafts with `associatedRecipes: []` have empty `inputs`, empty `outputs`, and empty `associatedLabors`. `pouch`, `rations`, `common_clothes`, `gem_cut`, and resource class `STEEL` do not appear on any production row. `DEUS_CraftProfessions.md` §3 tables match those JSON fields on all 34 crafts (0 row mismatches).

**SRD.** `srd:rule:adventuring-between-adventures` is the downtime entry. Its text includes the crafting sentence (5 gp total market value per day of downtime, raw materials worth half that value, plate at 1,500 gp) and the sentence that at least 8 hours of each downtime day must be spent on the activity. The Training subsection states 250 days and 1 gp per day. Tool ids exist as `kind: "tool"` in `game/data/srd51/equipment.json`, and each stored `toolName` equals that entry's `name`. `craftingRate` on every craft contains `5 gp market value per 8-hour day` and `88-89`.

**Callings and knowledge.** `callingMappings` has the same 26 keys and the same 26 values as `Identity.CALLING_CRAFT`. No duplicate calling. The 34 `knowledgeNode` values match `TEMPLATE.plan.json` craft unlocks both ways. The §9 groups match those plan nodes, including `craft.survival` (forager, hunter, cook) through `craft.fine` (jeweler, glassworker, alchemist).

**Axes and closure.** Craft ids equal `person_identity.schema.json` `properties.craft.enum` with `NONE` removed, in the same order. Family counts are 7, 4, 4, 5, 5, 9. Every craft sets the three independence flags true. `NONE` is a separate `noneSemantics` object with those flags true.

**Schema behavior.** `schemaErrors` on the committed catalogue returns 0. `additionalProperties: false` rejects an unexpected top-level property (the `mutant_schema_extra_property` kill). The quality enum rejects `SUPERIOR`. `minItems` / `maxItems` of 34 and the per-item craft-id enum accept 34 copies of `FARMER`; `craft_ids_match_canonical_set` rejects that file. The committed file is the bijection, so the gate's id check is what holds the set.

## Findings

### BLOCKER

None.

### MAJOR

None.

### MINOR

1. `production_recipes_reconciled` accepts a superset of labors and a superset of workstations. Appending the real labor `soldier` to `SMELTER`, and appending the real workstation `workbench` to `BLACKSMITH`, failed no check and produced 0 schema errors. Missing a required labor, an extra output, and a station that lacks the recipe tag do fail the check. The committed rows are still exact on labor sets and on the stations in the table above. `MUTANTS` lists `production_recipes_reconciled` in `mutant_invalid_labor.kills`, and `REPORT.md` §4 repeats that claim. The executed kill list is only `production_labors_valid`. The runner treats one real kill as success, so the extra declaration stays green.

2. Three fields the pass text treats as grounded are not what the checks read. `duty_scheduler_isolated` is a pair of regular expressions. The committed rule is the isolation sentence, and `duty overwrites craft` fails the check. The sentence `The scheduler does not wait; duty may overwrite and derive craft.` passes, because it contains `does not` and `overwrite`. `sourceCitation` set to `SRD 5.1 pp. 150, 187` passes every check; the rate check looks at `craftingRate`, and the committed citations are the real pages. `allowedDutyAssignments` accepts `HAUL_RESOURCE`; the committed eight ids are the job types above. `srd51_rules_grounded` accepts any id that exists in `rules.json`, including `srd:rule:races-racial-traits`. The committed `downtimeActivity` is `srd:rule:adventuring-between-adventures`.

## Verdict

The catalogue, the schema, the system document, and the gates match the brief, the lane contract, the world-catalog recipes, the SRD extracts, the calling table, and the prior failure review. The two minors are holes in checks whose committed inputs are already the canonical values.

VERDICT: CLEAN PASS
