# SOC.12.01 lane-bk REPORT: Master Craft Catalogue (Review Fix Disposition)

- **Task:** SOC.12.01 Master Craft Catalogue
- **Lane:** lane-bk
- **Branch:** `task/lane-bk`
- **Writer:** gemini (gemini-3.8-flash thinking HIGH, mechanical). This report does not certify or mark the task DONE.
- **Reviewer:** grok (review findings from commit `991820ec1b411243e32d39347c2762efd58f0be8` addressed in full).
- **Date:** 2026-09-27
- **No Art / Audio:** Strictly compliant with DEC-007. Zero art or audio was generated, requested, edited, moved, catalogued, or integrated.

---

## 1. Review Findings Disposition

All blocker, major, and minor findings raised in `tasks/SOC.12.01/lane-bk/review_grok_991820ec.md` have been fixed within `allowedPaths`:

| ID | Severity | Finding Summary | Resolution / Disposition |
|---|---|---|---|
| **FINDING-01** | **BLOCKER** | Progression numbers (`efficiencyMultiplier`, `downtimeTrainingDays`) and invented quality tiers (`SUPERIOR`, `EXCELLENT`) formed an ungrounded mechanic contradictory to repository standards. | Replaced invented quality tier names in schema, catalogue, builder, and tests with canonical quality tiers from `DEUS_SKILLS_AND_PROFICIENCY_STANDARD.md` §6: `CRUDE`, `STANDARD`, `FINE`, `MASTERWORK`. Realigned speed multipliers to the illustrative tiers of §5 (1.00×, 1.25×, 1.50×, 1.75×). Removed the invented work-tick formula and fabricated long sword $W_{\text{base}} = 180$ example (actual catalog recipe `sword_long` is `work: 12`). Explicitly documented all higher-tier training day ladders (500, 1000, 1500) and promotion criteria as open Owner decisions (`OWNER_TODO`). |
| **FINDING-02** | **BLOCKER** | Production rows contradicted `DEUS_WorldCatalog.json` `recipes.list`: 16 rows cited recipes with mismatched inputs/outputs/stations, 11 rows claimed unproducible outputs (`pouch`, `rations`, `common_clothes`, `gem_cut`), unreferenced `STEEL` was listed on smith rows. | Reconciled all 34 production rows with the exact recipes they cite. The 13 craft rows citing active recipes (`SMELTER`, `BLACKSMITH`, `ARMORER`, `WEAPONSMITH`, `CARPENTER`, `MASON`, `POTTER`, `TANNER`, `LEATHERWORKER`, `BOWYER`, `FLETCHER`, `COOK`, `TAILOR`) reflect the exact union of recipe inputs, outputs, stations, and labors. `LOGGER` cites `split_firewood` with exact inputs `["log"]` and outputs `["firewood"]`. The remaining 20 crafts cite zero recipes (`associatedRecipes: []`) and claim zero inputs or outputs (`inputs: []`, `outputs: []`), eliminating all unproducible output claims. Removed `STEEL` from `SMELTER`, `BLACKSMITH`, `ARMORER`, and `WEAPONSMITH`. |
| **FINDING-03** | **MAJOR** | `downtimeActivity` IDs were invented strings not in `game/data/srd51/rules.json`, and cited page numbers (150, 187) did not match repository SRD sources. | Grounded `downtimeActivity` across all crafts in the authentic repository rule ID: `srd:rule:adventuring-between-adventures` (pages 88–89 in `rules.json`). Corrected all page citations to `pp. 70, 88-89` (or `pp. 70-71, 88-89` for herbalism kit, `pp. 88-89` for non-tooled crafts). Corrected crafting rate string to cite `2014 SRD pp. 88-89`. |
| **FINDING-04** | **MAJOR** | Test suite lacked targeted failing fixtures for four checks (`duty_scheduler_isolated`, `progression_downtime_days_monotone`, `production_labors_valid`, `srd51_crafting_rate_standard`) and accepted extra callings or rewritten duty semantics. | Added targeted failing fixtures (mutants) for all four uncovered checks. Upgraded `duty_scheduler_isolated` to require strict negative assertion (`under no circumstance / never / prohibits` and `overwrite / derive / substitute`). Upgraded `calling_mappings_consistent` to verify bidirectional bijection (rejecting any extra calling outside `Identity.CALLING_CRAFT`). Added `srd51_rules_grounded` and `production_recipes_reconciled` with dedicated mutants. Total mutants increased from 19 to 26, covering 100% of baseline checks. |
| **FINDING-05** | **MINOR** | Scribe tool name used curly apostrophe (`Calligrapher’s supplies`, U+2019) differing from `game/data/srd51/equipment.json` (`Calligrapher's supplies`, U+0027). | Changed to exact ASCII apostrophe `Calligrapher's supplies` (`\u0027`) matching `equipment.json`. |
| **FINDING-06** | **MINOR** | Calling count in `DEUS_CraftProfessions.md` stated "24 Crafts" (actual is 25 distinct crafts) and Question 5 count stated 20 (actual is 21). | Updated Section 8.1 title to "26 Callings Mapping to 25 Crafts" and Section 8.2 / schema text to 21 unmapped Question 5 callings. |
| **FINDING-07** | **MINOR** | `noneSemantics.allowedDutyAssignments` used invented uppercase tokens (`HAUL_RESOURCE`, etc.) with no repository source. | Replaced with real operational job types recognized in DEUS (`haul`, `gather`, `fetch`, `move`, `wander`, `sleep`, `eat`, `drink`) and explicitly documented that formal duty scheduler vocabulary is deferred to SOC.13. |

---

## 2. What Changed

All changes are strictly contained within `allowedPaths`:

| Path | Summary of Changes |
|---|---|
| `game/data/society/craft_catalogue.schema.json` | Updated `$defs.qualityTier` to canonical `["CRUDE", "STANDARD", "FINE", "MASTERWORK"]`. |
| `game/data/society/craft_catalogue.json` | Regenerated via deterministic builder. Reconciled all 34 crafts: canonical quality tiers, grounded SRD downtime rule IDs (`srd:rule:adventuring-between-adventures`) and pages (88–89), exact recipe input/output reconciliation, removal of `STEEL`, removal of unproducible claims on 20 crafts, ASCII apostrophe on Scribe tool, and real job types on `noneSemantics`. |
| `tasks/SOC.12.01/lane-bk/build_craft_catalogue.js` | Updated assembly script with reconciled definitions, correct SRD rule IDs and citations, canonical progression tiers, and real job types. Reproduces committed JSON bytes (`BUILDER_MATCH: true`). |
| `docs/systems/DEUS_CraftProfessions.md` | Updated system specification: Section 3 production tables reconciled with `recipes.list`, Section 4 real job types, Section 5 progression model aligned to `DEUS_SKILLS_AND_PROFICIENCY_STANDARD.md` with explicit `OWNER_TODO` flags, Section 7 authentic SRD rule and page citations, Section 8 calling counts (25 crafts, 21 Question 5 callings), Section 9 knowledge nodes, Section 10 open questions, and Section 11 follow-ups. |
| `tools/society/test_craft_catalogue.js` | Enhanced test harness: added `production_recipes_reconciled` and `srd51_rules_grounded`; upgraded `duty_scheduler_isolated` and `calling_mappings_consistent`; expanded mutants from 19 to 26 so every single check has at least one targeted failing fixture. |
| `tasks/SOC.12.01/lane-bk/REPORT.md` | This report. |

---

## 3. Foreground Gate Execution Evidence

Both lane gates were executed in the foreground from the repository root:

### 3.1 Gate 1: `node tools/society/test_craft_catalogue.js`
- **Command:** `node tools/society/test_craft_catalogue.js`
- **Exit Code:** `0`
- **Output:**
```
=== DEUS MASTER CRAFT CATALOGUE (SOC.12.01) ===

--- Section 1: Baseline Catalogue & Schema Checks ---
  [PASS] schema_validates: catalogue matches JSON schema
  [PASS] catalogue_has_34_crafts: found 34 crafts (expected 34)
  [PASS] craft_ids_match_canonical_set: exact 1:1 match with person identity schema 34 crafts
  [PASS] none_semantics_explicitly_defined: {"civicOfficeIndependent":true,"classIndependent":true,"dutyDecoupled":true}
  [PASS] family_distribution_exact: {"extractive":7,"pyrometallurgical_and_smiths":4,"construction_and_woodcraft":4,"organic_and_textiles":5,"sustenance_and_processing":5,"artisan_and_specialized":9}
  [PASS] three_axes_independent: all crafts assert axis independence and contain no office/class/duty couplings
  [PASS] duty_scheduler_isolated: calling resolution rules explicitly isolate duty from craft identity with strict negative assertion
  [PASS] progression_four_tiers_per_craft: every craft defines exactly 4 tiers
  [PASS] progression_ranks_monotone: ranks are 1, 2, 3, 4 strictly monotone
  [PASS] progression_efficiency_monotone: efficiency multipliers strictly increasing
  [PASS] progression_quality_access_stepped: quality access conforms to DEUS standard: STANDARD -> STANDARD -> FINE -> MASTERWORK
  [PASS] progression_downtime_days_monotone: training days non-decreasing across tiers
  [PASS] production_resource_classes_valid: all resource classes exist in DEUS_ResourceRegistry
  [PASS] production_workstations_valid: all workstations exist in DEUS_WorldCatalog objects
  [PASS] production_recipes_valid: all recipes exist in DEUS_WorldCatalog recipes.list
  [PASS] production_labors_valid: all labors exist in DEUS_WorldCatalog labors.list
  [PASS] production_items_valid: all inputs and outputs exist in DEUS_WorldCatalog items.types
  [PASS] production_recipes_reconciled: all cited recipes reconciled with inputs, outputs, stations, and labors; empty rows claim zero outputs
  [PASS] srd51_tools_grounded: all non-null toolProficiencies exist in srd51/equipment.json
  [PASS] srd51_rules_grounded: all downtimeActivity rule IDs exist in srd51/rules.json
  [PASS] srd51_crafting_rate_standard: every craft cites 5 gp market value per 8-hour day rate and pp. 88-89
  [PASS] calling_mappings_consistent: callingMappings match Identity.CALLING_CRAFT exactly without extra callings
  [PASS] faction_knowledge_closure: two-way closure between craft catalogue and TEMPLATE.plan.json craft nodes

--- Section 2: Rule 4 Targeted Failing Fixtures (Mutants) ---
  [PASS] mutant mutant_drop_craft killed by catalogue_has_34_crafts, craft_ids_match_canonical_set
  [PASS] mutant mutant_duplicate_craft killed by craft_ids_match_canonical_set
  [PASS] mutant mutant_alien_craft killed by craft_ids_match_canonical_set, schema_validates
  [PASS] mutant mutant_corrupt_none_semantics killed by none_semantics_explicitly_defined, schema_validates
  [PASS] mutant mutant_family_distribution killed by family_distribution_exact
  [PASS] mutant mutant_couple_office killed by three_axes_independent, schema_validates
  [PASS] mutant mutant_couple_class killed by three_axes_independent, schema_validates
  [PASS] mutant mutant_duty_isolation_rewritten killed by duty_scheduler_isolated
  [PASS] mutant mutant_progression_tier_count killed by progression_four_tiers_per_craft, schema_validates
  [PASS] mutant mutant_progression_rank_order killed by progression_ranks_monotone
  [PASS] mutant mutant_progression_efficiency_inverted killed by progression_efficiency_monotone
  [PASS] mutant mutant_progression_quality_degraded killed by progression_quality_access_stepped
  [PASS] mutant mutant_progression_downtime_inverted killed by progression_downtime_days_monotone
  [PASS] mutant mutant_invalid_workstation killed by production_workstations_valid
  [PASS] mutant mutant_invalid_resource_class killed by production_resource_classes_valid
  [PASS] mutant mutant_invalid_recipe killed by production_recipes_valid, production_recipes_reconciled
  [PASS] mutant mutant_invalid_labor killed by production_labors_valid
  [PASS] mutant mutant_invalid_input_item killed by production_items_valid, production_recipes_reconciled
  [PASS] mutant mutant_recipe_reconciliation_mismatch killed by production_recipes_reconciled
  [PASS] mutant mutant_invalid_srd_tool killed by srd51_tools_grounded
  [PASS] mutant mutant_invalid_srd_rule_id killed by srd51_rules_grounded
  [PASS] mutant mutant_invalid_crafting_rate killed by srd51_crafting_rate_standard
  [PASS] mutant mutant_calling_map_mismatch killed by calling_mappings_consistent
  [PASS] mutant mutant_extra_calling killed by calling_mappings_consistent
  [PASS] mutant mutant_knowledge_node_mismatch killed by faction_knowledge_closure
  [PASS] mutant mutant_schema_extra_property killed by schema_validates

==================================================
CRAFT CATALOGUE PASSED: 23 baseline checks, 26 mutants killed (37.9 ms).
==================================================
```

### 3.2 Gate 2: `node tools/check_deus_syntax.js`
- **Command:** `node tools/check_deus_syntax.js`
- **Exit Code:** `0`
- **Output:**
```
Checked 60 DEUS plugin files. Errors: 0
```

### 3.3 Builder Byte Reproducibility Evidence
- **Command:** `node -e "const fs = require('fs'); const cur = fs.readFileSync('game/data/society/craft_catalogue.json', 'utf8'); require('./tasks/SOC.12.01/lane-bk/build_craft_catalogue.js'); const after = fs.readFileSync('game/data/society/craft_catalogue.json', 'utf8'); console.log('BUILDER_MATCH:', cur === after);"`
- **Exit Code:** `0`
- **Output:**
```
Successfully wrote craft_catalogue.json with 34 crafts to C:\Users\snewt\.deus_worktrees\lane-bk\game\data\society\craft_catalogue.json
BUILDER_MATCH: true
```

### 3.4 Ancillary Regression Test Evidence
- **Command:** `node tools/society/test_person_identity.js`
  - **Exit Code:** `0`
  - **Output:** `PERSON IDENTITY PASSED: 56 checks, 8 mutants killed.`
- **Command:** `node tools/plans/test_faction_plan_schema.js`
  - **Exit Code:** `0`
  - **Output:** `55 passed, 0 failed.`

---

## 4. Rule 4 Mutant Coverage Crosswalk

Every baseline validator check in `tools/society/test_craft_catalogue.js` is covered by at least one targeted failing mutant in `MUTANTS`:

| Baseline Check Name | Description | Targeted Mutants That Kill It |
|---|---|---|
| `schema_validates` | Conforms to Draft 2020-12 schema | `mutant_schema_extra_property`, `mutant_alien_craft`, `mutant_corrupt_none_semantics`, `mutant_couple_office`, `mutant_couple_class`, `mutant_progression_tier_count` |
| `catalogue_has_34_crafts` | Contains exactly 34 crafts | `mutant_drop_craft` |
| `craft_ids_match_canonical_set` | Exact 1:1 match with person identity schema | `mutant_drop_craft`, `mutant_duplicate_craft`, `mutant_alien_craft` |
| `none_semantics_explicitly_defined` | Complete specification of NONE semantics | `mutant_corrupt_none_semantics` |
| `family_distribution_exact` | 7, 4, 4, 5, 5, 9 family count distribution | `mutant_family_distribution` |
| `three_axes_independent` | No office/class/duty couplings on craft entries | `mutant_couple_office`, `mutant_couple_class` |
| `duty_scheduler_isolated` | Resolution rules explicitly forbid duty overwriting craft | `mutant_duty_isolation_rewritten` |
| `progression_four_tiers_per_craft` | Every craft has exactly 4 progression tiers | `mutant_progression_tier_count` |
| `progression_ranks_monotone` | Ranks strictly monotone 1, 2, 3, 4 | `mutant_progression_rank_order` |
| `progression_efficiency_monotone` | Efficiency multipliers strictly increasing | `mutant_progression_efficiency_inverted` |
| `progression_quality_access_stepped` | Quality access sequence `STANDARD -> STANDARD -> FINE -> MASTERWORK` | `mutant_progression_quality_degraded` |
| `progression_downtime_days_monotone` | Training days non-decreasing across tiers | `mutant_progression_downtime_inverted` |
| `production_resource_classes_valid` | Resource classes exist in Resource Registry | `mutant_invalid_resource_class` |
| `production_workstations_valid` | Workstations exist in World Catalog objects | `mutant_invalid_workstation` |
| `production_recipes_valid` | Recipes exist in World Catalog `recipes.list` | `mutant_invalid_recipe` |
| `production_labors_valid` | Labors exist in World Catalog `labors.list` | `mutant_invalid_labor` |
| `production_items_valid` | Inputs and outputs exist in World Catalog `items.types` | `mutant_invalid_input_item` |
| `production_recipes_reconciled` | Cited recipes strictly reconciled with inputs/outputs/stations/labors; zero unproducible outputs | `mutant_recipe_reconciliation_mismatch`, `mutant_invalid_recipe`, `mutant_invalid_labor`, `mutant_invalid_input_item` |
| `srd51_tools_grounded` | Tool proficiencies exist in `srd51/equipment.json` | `mutant_invalid_srd_tool` |
| `srd51_rules_grounded` | Downtime activity rule IDs exist in `srd51/rules.json` | `mutant_invalid_srd_rule_id` |
| `srd51_crafting_rate_standard` | 5 gp market value per 8-hour day rate and pp. 88-89 | `mutant_invalid_crafting_rate` |
| `calling_mappings_consistent` | Exact 1:1 match with `Identity.CALLING_CRAFT`, zero extra callings | `mutant_calling_map_mismatch`, `mutant_extra_calling` |
| `faction_knowledge_closure` | Two-way closure with `TEMPLATE.plan.json` craft nodes | `mutant_knowledge_node_mismatch` |

---

## 5. Limitations and Open Owner Questions (OWNER_TODO)

These questions represent architectural boundaries preserved without inventing unauthorized owner values:

1. **Multi-Craft Vocation Policy:** Can an individual colonist hold secondary craft proficiencies or cross-train, or does the `craft` axis remain strictly singular? (Current schema enforces a single craft token).
2. **Apprentice Promotion Criteria & Downtime Day Ladder:** What exact live simulation metric triggers promotion from Apprentice to Journeyman, Artisan, and Master? Options: cumulative successful craft ticks, produced item value thresholds, or formal guild recognition. The higher-tier training days (500, 1000, 1500) remain provisional.
3. **Live Craft Execution Tick Formula:** Exact speed multiplier implementation when craft labor plugins are created.
4. **Craft Atrophy / Skill Decay:** Does prolonged inactivity or military mobilization degrade craft competence over multi-year periods, or is craft rank permanent?
5. **Tool Durability & Maintenance:** Do artisan tools experience wear and require blacksmith repair/replacement?
6. **Resolution of the 21 Unmapped Callings:** Owner confirmation to activate proposed mappings in `Identity.CALLING_CRAFT` for `laborer`, `shepherd`, `stonecutter`, `physician`, etc.
7. **Future Recipe Content Expansions:** Expanding `recipes.list` to cover items for the 20 crafts currently lacking distinct production recipes (e.g. glass phials for `GLASSWORKER`, potions for `ALCHEMIST`, woven cloth for `WEAVER`, gem cuts for `JEWELER`).

---

## 6. PROPOSED-BK Follow-ups

- **PROPOSED-BK-01:** Integrate `craft_catalogue.json` into the SOC.13 Central Duty Scheduler candidate weighting.
- **PROPOSED-BK-02:** Update `UF_Look` and the colonist inspection sheet to render craft display names and progression titles (e.g. "Master Blacksmith").
- **PROPOSED-BK-03:** Hook the quality tiers (`STANDARD`, `FINE`, `MASTERWORK`) into the combat equipment stats multiplier pipeline in `UF_Combat`.
- **PROPOSED-BK-04:** Implement guild institution entities under SOC.20 that issue formal mastership charters and regulate guild apprenticeship contracts.
