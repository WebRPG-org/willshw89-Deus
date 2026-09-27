# Grok review — SOC.12.01 lane-bk (Master Craft Catalogue)

Reviewed commit:

`991820ec1b411243e32d39347c2762efd58f0be8`

The tip fails. Craft closure, calling rows, knowledge nodes, path scope, and the three-axis flags match the canonical sources, and both lane gates exit 0. The committed catalogue also requires a progression model the person spec and the skills standard do not contain, and most production rows do not match the recipes they cite.

## Identity

| Field | Value |
|---|---|
| Reviewer | Grok, independent reviewer for lane-bk |
| Writer | Gemini (`deus-gemini <willshw89@gmail.com>`) |
| Branch | `task/lane-bk` |
| Writer tip | `991820ec1b411243e32d39347c2762efd58f0be8` |
| Writer subject | `[gemini] SOC.12.01 Master Craft Catalogue` |
| Writer author date | 2026-09-27 17:19:11 -0500 |
| Writer parent | `549bdf851e4341284ccdfc61d450e1f0fab80507` |
| BRIEF base | `a768eba377deab388e5def474a0bb1752fd732c3` |
| `git merge-base main 991820ec1b411243e32d39347c2762efd58f0be8` | `a768eba377deab388e5def474a0bb1752fd732c3` (exit 0) |
| `git merge-base origin/main 991820ec1b411243e32d39347c2762efd58f0be8` | `6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0` (exit 0) |

`origin/main` is behind local `main`. The lane parent is the BRIEF base `a768eba3`, so the reviewed range is `a768eba3..991820ec`. A diff from `6b8ac5e6` would also include the two main commits that opened this lane and is not the lane diff.

Worktree `HEAD` at review time was `d9477c4b216045e5cc8fa26a84123809353cdb53`, the ops launch prompt after the tip. `git diff --name-status 991820ec1b411243e32d39347c2762efd58f0be8 HEAD` (exit 0) is only `A tasks/SOC.12.01/lane-bk/launches/20260927_172427_prompt.txt`. Gates and probes read the tip's catalogue, schema, test, and document. `git status --short` on the catalogue path was empty after the probes.

This review does not edit the catalogue, the schema, the test, the WBS, or status.

## Scope

`git diff --name-status a768eba377deab388e5def474a0bb1752fd732c3 991820ec1b411243e32d39347c2762efd58f0be8` (exit 0), 10 paths, every one `A`:

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
| `tools/society/test_craft_catalogue.js` | yes |

The writer commit itself, `git diff --name-status 549bdf851e4341284ccdfc61d450e1f0fab80507 991820ec1b411243e32d39347c2762efd58f0be8` (exit 0), adds the six implementation files: the system document, both catalogue files, `REPORT.md`, `build_craft_catalogue.js`, and `tools/society/test_craft_catalogue.js`. `BRIEF.md`, `lane.json`, and the two earlier launch prompts are the PM/ops commits below the tip.

Forbidden-path diffs of the same range were empty (exit 0):

```
git diff --name-only a768eba377deab388e5def474a0bb1752fd732c3 991820ec1b411243e32d39347c2762efd58f0be8 -- art game/img game/audio docs/STATUS.md docs/OWNER_DECISIONS.md docs/society docs/WORK_QUEUE.md game/js/plugins.js game/js/plugins
```

`git diff --name-only a768eba3 991820ec -- "*WBS*"` was empty (exit 0). `docs/society/DEUS_SOCIETY_WBS.md` line 63 still shows SOC.12.01 as `PLANNED`. No art or audio path is in the diff. Requiring `build_craft_catalogue.js` through a mocked `fs.writeFileSync` reproduced the committed `craft_catalogue.json` bytes (`BUILDER_MATCH true`) and left the worktree clean.

## Commands and exits

Run from `C:\Users\snewt\.deus_worktrees\lane-bk` on 2026-09-27.

### `node tools/society/test_craft_catalogue.js`

Exit 0. Summary line: `CRAFT CATALOGUE PASSED: 21 baseline checks, 19 mutants killed (28.2 ms).`

All 21 baseline names printed `[PASS]`: `schema_validates`, `catalogue_has_34_crafts`, `craft_ids_match_canonical_set`, `none_semantics_explicitly_defined`, `family_distribution_exact`, `three_axes_independent`, `duty_scheduler_isolated`, `progression_four_tiers_per_craft`, `progression_ranks_monotone`, `progression_efficiency_monotone`, `progression_quality_access_stepped`, `progression_downtime_days_monotone`, `production_resource_classes_valid`, `production_workstations_valid`, `production_recipes_valid`, `production_labors_valid`, `production_items_valid`, `srd51_tools_grounded`, `srd51_crafting_rate_standard`, `calling_mappings_consistent`, `faction_knowledge_closure`.

All 19 mutants printed `[PASS]` and named the checks in their `kills` lists.

### `node tools/check_deus_syntax.js`

Exit 0. `Checked 60 DEUS plugin files. Errors: 0`. The script runs `node -c` on `game/js/plugins/DEUS_*.js` only. It does not parse the catalogue, the schema, or `test_craft_catalogue.js`.

### Independent provocations

The test's `runCatalogueChecks` and `schemaErrors` were loaded from `tools/society/test_craft_catalogue.js` with `main()` replaced so the probe could mutate a clone. The on-disk catalogue was not edited.

| Probe | Checks that failed |
|---|---|
| Append labor id `not_a_labor` on FARMER | `production_labors_valid` |
| Append output id `not_an_item` on FARMER | `production_items_valid` |
| Set FARMER master `downtimeTrainingDays` to 10 | `progression_downtime_days_monotone` |
| Set `dutyIsolationRule` to `""` | `schema_validates`, `duty_scheduler_isolated` |
| Replace one `craftingRate` with `10 gp per day` | `srd51_crafting_rate_standard` |
| Add calling `shepherd` on FARMER | none |
| Replace `dutyIsolationRule` with `duty overwrites craft` | none |
| Set one `downtimeActivity` to `srd:rule:does-not-exist` | none |
| Set every multiplier sequence to 1, 1.1, 1.2, 1.3 | none |
| Set one craft's quality access to STANDARD, FINE, FINE, MASTERWORK | `schema_validates`, `progression_quality_access_stepped` |
| Replace `crafts` with 34 copies of FARMER | schema error count 0; test then fails `craft_ids_match_canonical_set`, `family_distribution_exact`, `calling_mappings_consistent` |

## What held

**34-craft closure.** `craft_catalogue.json` lists the same 34 ids, in the same order, as `person_identity.schema.json` `properties.craft.enum` with `NONE` removed. Family counts are extractive 7, pyrometallurgical and smiths 4, construction and woodcraft 4, organic and textiles 5, sustenance and processing 5, artisan and specialized 9, matching `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md` §2.

**Knowledge nodes.** All 34 `knowledgeNode` values match `game/data/plans/TEMPLATE.plan.json` craft unlocks. The plan has 34 craft unlocks, no duplicate craft id, and no craft outside the person enum. The groups match `docs/systems/DEUS_FactionPlans.md` §8, including `craft.survival` (forager, hunter, cook) through `craft.fine` (jeweler, glassworker, alchemist).

**Callings in the data.** `callingMappings` has the same 26 keys and the same 26 values as `Identity.CALLING_CRAFT` in `game/js/sim/society/identity.js`. Those 26 callings land on 25 crafts. The 21 Question 5 callings from `docs/systems/DEUS_PersonIdentity.md` are absent from `callingMappings`. The precedence text matches that document's three steps, and it says duty is not read.

**Three-axis data.** Every craft sets `independentOfCivicOffice`, `independentOfClass`, and `dutyDecoupled` to true. No craft object carries `civicOffice`, `class`, `currentDuty`, or `duty`. `NONE` is a separate `noneSemantics` object with those same three flags true. The office and class enums were not rewritten.

**Id existence.** Every cited `primaryResourceClasses` key exists in `DEUS_ResourceRegistry.json` `coreResourceClasses`. Every cited workstation exists in `DEUS_WorldCatalog.json` `objects`. Every cited recipe id exists in `recipes.list` (41 recipes). Every cited labor id exists in `labors.list` (9 labors). Every cited input and output exists in `items.types` (61 items). Every non-null `toolProficiency` exists as `kind: "tool"` in `game/data/srd51/equipment.json`.

**SRD crafting sentences that do appear in the rules file.** `srd:rule:adventuring-between-adventures` (`game/data/srd51/rules.json`, source pages 88–89) contains the downtime crafting rule: 5 gp of market value per day, raw materials worth half that value, and the plate-armor example of 1,500 gp, 300 days, or 100 days for three proficient crafters. The same entry's Training subsection says training lasts 250 days and costs 1 gp per day to learn a language or gain a tool proficiency.

## Findings

### BLOCKER — Progression numbers and quality names are a new mechanic

`docs/society/DEUS_PERSON_AND_INSTITUTIONS.md` §2 names four stages and stops there: Novice/Apprentice, Journeyman/Competent, Artisan, Master Craftsperson. It gives no speed, no quality enum, and no day counts.

`docs/systems/DEUS_SKILLS_AND_PROFICIENCY_STANDARD.md` §6 defines the quality tiers as `CRUDE`, `STANDARD`, `FINE`, and `MASTERWORK`. Section 5's illustrative rate table sets untrained/novice work rate at `1.0×` with a `STANDARD` floor, and master (level 9+) at `1.60×` to `2.00×` with `FINE` and a chance of `MASTERWORK`. `docs/OWNER_DECISIONS.md` has no craft-rate or quality-tier ruling.

The catalogue requires a different model on all 34 crafts. `build_craft_catalogue.js` stamps one signature onto every craft, and the committed JSON has that single signature:

| Rank | Tier | `efficiencyMultiplier` | `qualityTierAccess` | `downtimeTrainingDays` |
|---|---|---|---|---|
| 1 | APPRENTICE | 0.75 | STANDARD | 250 |
| 2 | JOURNEYMAN | 1 | SUPERIOR | 500 |
| 3 | ARTISAN | 1.25 | EXCELLENT | 1000 |
| 4 | MASTER | 1.5 | MASTERWORK | 1500 |

`craft_catalogue.schema.json` `$defs.qualityTier` allows only `STANDARD`, `SUPERIOR`, `EXCELLENT`, and `MASTERWORK`. A probe that used the skills-standard names `FINE` and `MASTERWORK` failed `schema_validates`. `$defs.progressionTier` requires `efficiencyMultiplier` and `downtimeTrainingDays`. The system document §5 states the work-tick formula `ceil(W_base / efficiencyMultiplier)` and works an example of a long sword at `W_base = 180`. `recipes.list` entry `sword_long` has `work: 12` at the smithy.

The 250-day figure is the SRD training duration for gaining a tool proficiency, in `srd:rule:adventuring-between-adventures`, together with a 1 gp per day cost. The catalogue stores 250 as rank-1 `downtimeTrainingDays` on every craft, including the nine crafts whose `toolProficiency` is null, and stores 500, 1000, and 1500 for the later ranks. Those three day counts are not in that rule. Section 10 leaves the promotion trigger as an owner question and leaves the multipliers, quality names, and day counts in the required data.

The lane prompt says to represent apprentice-to-master progression without inventing unresolved owner values or new game mechanics, and to record ambiguities as owner questions. The four tier names follow the person spec. The rates, the `SUPERIOR` / `EXCELLENT` tiers, the day ladder, and the tick formula do not.

The gate does not lock the numbers. Replacing every multiplier with `1, 1.1, 1.2, 1.3` failed no check. It does lock the invented quality names.

### BLOCKER — Cited production rows do not match the world-catalog recipes

Id existence passed, as listed above. The relationship did not. Of 34 crafts:

- 5 match the cited recipes' input set, output set, and station tag: `SMELTER`, `ARMORER`, `TANNER`, `FLETCHER`, `BOWYER`.
- 2 match outputs and station and omit a recipe input: `WEAPONSMITH` (cited recipes consume `fiber`), `CARPENTER` (cited recipes consume `stone`).
- 16 cite at least one real recipe whose inputs, outputs, or station tag differ from the row.
- 11 name outputs and cite zero recipes.

There is no recipe in `recipes.list` whose output is `pouch`, `rations`, `common_clothes`, or `gem_cut`.

Rows that cite a recipe and contradict it:

| Craft | What the row says | What `recipes.list` says |
|---|---|---|
| `MINER` | Inputs `stone_pick`. Outputs include `ore_iron`, `ore_copper`, `gold`, `stone`, `gem_rough`, `clay`, `sand`. Recipes `dig_clay`, `sift_sand`. No workstation. | `dig_clay`: `stone` → `clay` at `workbench`, work 60. `sift_sand`: `stone` → `sand` at `workbench`, work 60. |
| `GLASSWORKER` | Furnace. Inputs `sand`, `charcoal`. Output `sand`. Description is glass vessels. Recipe `sift_sand`. | `sift_sand` consumes `stone` at a `workbench`. `furnace` tags are `building`, `workplace`, `furnace`. |
| `SPINNER` | Inputs `wool`, `fiber`. Output `fiber`. Description is yarn. Recipe `fiber_wrap`. | `fiber_wrap`: 6 `fiber` → `fiber_wrap`, `at` null, work 180. |
| `ALCHEMIST` | Inputs `clay`, `sand`, `charcoal`, `ore_iron`, `ore_copper`. Outputs `sand`, `charcoal`. Stations `apothecary_bench`, `furnace`. | `charcoal`: 3 `firewood` → 2 `charcoal` at `furnace`. `sift_sand` is at `workbench`. `apothecary_bench` tags are `herbalist` and `apothecary`. |
| `BUTCHER` | Stations `kitchen_counter`, `workbench`. Outputs `meat_cooked`, `bone`, `hide`. Recipe `cook_meat`. | `cook_meat`: `meat_raw` → `meat_cooked` at `fire`, work 90. `kitchen_counter` tags have no `fire`. `campfire` and `kitchen_hearth` do. |
| `COOK` | Outputs `meat_cooked` and `rations`. Inputs add `berries`, `root`, `firewood`. | `cook_meat` and `cook_fish` output `meat_cooked` only. |
| `LOGGER` | Inputs `stone_axe`, `axe_iron`. Outputs `log`, `firewood`. Recipe `split_firewood`. | `split_firewood`: 1 `log` → 3 `firewood`. |
| `QUARRYMAN` | Outputs `stone` and `sand`. Inputs are picks and axes. Recipe `sift_sand`. | `sift_sand` consumes `stone` and outputs `sand`. |
| `LEATHERWORKER` | Outputs include `pouch`. | The cited leather recipes do not output `pouch`. No catalog recipe does. |
| `TAILOR`, `WEAVER` | Outputs include `common_clothes`. | No catalog recipe outputs `common_clothes`. |
| `BLACKSMITH` | Inputs include `charcoal`. Labors `armorsmith` and `weaponsmith`. | Cited smithy recipes consume `fiber` and do not consume `charcoal`. Their `labor` is `weaponsmith`. |

`SMELTER`, `BLACKSMITH`, `ARMORER`, and `WEAPONSMITH` also list resource class `STEEL`. The recipes those rows cite output iron and copper bars, hardware, arms, and armor. They do not output a steel item. `STEEL` does exist as a registry class.

The 11 rows with outputs and `associatedRecipes: []` are `FARMER`, `HUNTER`, `FISHER`, `FORAGER`, `BREWER`, `MILLER`, `BAKER`, `JEWELER`, `HERBALIST`, `SCRIBE`, and `MERCHANT`. `BREWER`, `MILLER`, `BAKER`, and `HERBALIST` all output `rations`. `SCRIBE` outputs `pouch`. `MERCHANT` lists `gold_coin` as an input and as the output. `JEWELER` outputs `gem_cut`. The world catalog has no recipe for those four item ids. The document's production tables state these inputs and outputs as the craft chains. The gate's production checks only ask whether each string occurs somewhere in the catalog, so this committed file passes `production_recipes_valid`, `production_items_valid`, `production_workstations_valid`, and `production_labors_valid`.

24 of 34 crafts have an empty `associatedLabors` array, so the labor check does not inspect them. The catalog's labor ids are `furnace_operator`, `weaponsmith`, `armorsmith`, `bowyer`, `fletcher`, `tanner`, `leatherworker`, `carpenter`, and `soldier`.

### MAJOR — Downtime rule ids and the cited pages are not the SRD catalogue's ids and pages

Every craft sets `downtimeActivity` to one of:

- `srd:rule:downtime-activities-practicing-a-profession`
- `srd:rule:downtime-activities-crafting`

`game/data/srd51/rules.json` has neither id. Downtime crafting, practicing a profession, and training are subsections of `srd:rule:adventuring-between-adventures`, source pages `[88, 89]`. A probe that changed one `downtimeActivity` to another missing id failed no check. The committed file therefore passes the gate with both missing ids.

`sourceCitation` is `SRD 5.1 pp. 68, 187` on tooled crafts and `SRD 5.1 pp. 150, 187` on the others. The crafting-rate string repeats `2014 SRD p. 187`. In `game/data/srd51/rules.json` and `equipment.json`, no entry's `source.pages` contains 150 or 187. Pages 150 and 187 do occur in `game/data/srd51/spells.json` (`srd:spell:goodberry` is page 150; `srd:spell:thaumaturgy` is page 187). The downtime rule's pages are 88 and 89. Tool rows in `equipment.json` record page 70, and the herbalism kit records pages 70–71. `game/data/srd5_1/tools.json` is a second extract: its metadata `sourcePage` is 68 and its ids are `alchemists_supplies`, `calligraphers_supplies`, and the same underscore form, not `srd:tool:*`. The catalogue stores the `equipment.json` ids and cites page 68 from the other file. The test never opens `rules.json` or `srd5_1/tools.json`.

`docs/systems/DEUS_CraftProfessions.md` §7 says 14 DEUS crafts map to SRD tools. The following list in that section, and the committed `toolProficiency` fields, cover 25 crafts and 14 distinct `srd:tool:*` ids. The nine null-tool crafts match the document's extractive and simple-tool list.

### MAJOR — The gate misses four of its own checks and accepts several false catalogues

`tasks/SOC.12.01/lane-bk/BRIEF.md` requires every validator check to have a targeted failing fixture. These four checks have no entry in `MUTANTS[].kills`:

- `duty_scheduler_isolated`
- `progression_downtime_days_monotone`
- `production_labors_valid`
- `srd51_crafting_rate_standard`

Each one fails when provoked directly (see the table above). The suite can still go green if the check is deleted, because nothing is required to kill it.

`calling_mappings_consistent` walks `Identity.CALLING_CRAFT` and does not reject extra catalogue callings. Adding `shepherd` → `FARMER` failed nothing, so an activation of Question 5 would still pass. `duty_scheduler_isolated` is true for any non-empty string, including `duty overwrites craft`. `schema_validates` accepts 34 copies of `FARMER` (zero schema errors). The report says the schema enforces the canonical 34-craft set. The schema's craft-id enum constrains each element, and `minItems` / `maxItems` constrain the length. The bijection is only in the test.

The hand-rolled validator implements the keywords this schema actually uses (`type`, `const`, `enum`, `required`, `properties`, `additionalProperties: false`, numeric and string bounds, array bounds, `$ref`). Closed objects are real. Nested production ids, SRD rule ids, and unique craft ids are not schema constraints.

### MINOR — Scribe tool name uses a different apostrophe

`srd:tool:calligraphers-supplies` in `equipment.json` is `Calligrapher's supplies` (U+0027). The catalogue stores `Calligrapher’s supplies` (U+2019). The other stored tool names match the equipment entry code points. `srd51_tools_grounded` compares ids only.

### MINOR — Calling counts in the system document

`DEUS_CraftProfessions.md` §8.1 is titled as 26 callings mapping to 24 crafts. `Identity.CALLING_CRAFT` has 26 keys and 25 distinct craft values. Section 8.2 and `noneSemantics` prose say 20 unmapped Question 5 callings. The person-identity question lists 21 tokens: `laborer`, `shepherd`, `stonecutter`, `construction_worker`, `engineer`, `road_builder`, `physician`, `medic`, `surgeon`, `veterinarian`, `dresser`, `shopkeeper`, `broker`, `scholar`, `sage`, `bookkeeper`, `beekeeper`, `cheesewright`, `stone_carver`, `paperwright`, `engraver`. The proposed table still names all 21, and the JSON does not map them.

### MINOR — NONE duty ids have no source

`noneSemantics.allowedDutyAssignments` is `HAUL_RESOURCE`, `BASIC_FORAGE`, `EMERGENCY_DEFENSE`, `CIVIC_OFFICE_WORK`, `SLEEP`, `REST_RECREATION`. Those strings occur in the new catalogue, the builder, the system document, and `REPORT.md`. They are not job, labor, or duty ids elsewhere in the repository. The person spec says a person with `Craft: NONE` is valid. It does not name this duty vocabulary. SOC.13.01 is the duty scheduler and is still `PLANNED`.

## Verdict

Two blockers remain: the required progression model, and production rows that do not match the cited world-catalog recipes. SRD downtime ids, page citations, and the missing fixtures are majors. Craft-id closure, the calling table as data, knowledge-node closure, the three-axis flags, and the art/audio and WBS boundaries held.

VERDICT: FAIL
