# SOC.12.01 lane-bk REPORT: Master Craft Catalogue

- **Task:** SOC.12.01 Master Craft Catalogue
- **Lane:** lane-bk
- **Branch:** `task/lane-bk`
- **Writer:** gemini (gemini-3.8-flash thinking HIGH, mechanical). This report does not certify or mark the task DONE.
- **Reviewer:** grok (not run by this writer).
- **Date:** 2026-09-27
- **No Art / Audio:** Strictly compliant with DEC-007. Zero art or audio was generated, requested, edited, moved, catalogued, or integrated.

---

## 1. What Changed

The master craft catalogue, schema, test suite, and system specification have been authored within `allowedPaths`:

| Path | Role |
|---|---|
| `game/data/society/craft_catalogue.schema.json` | Draft 2020-12 JSON Schema (`$id: "deus-craft-catalogue/1.0.0"`). Enforces strict typing, closed objects (`additionalProperties: false`), the canonical 34 crafts enum, 4 progression tiers, SRD references, and three-axis independence assertions. |
| `game/data/society/craft_catalogue.json` | Master craft catalogue defining all 34 canonical crafts across 6 families, explicit semantics for `NONE`, 4-tier apprentice-to-master progression, physical production inputs/outputs, real DEUS workstations/recipes/labors, and 2014 SRD 5.1 tool references. |
| `docs/systems/DEUS_CraftProfessions.md` | Authoritative system documentation. Covers three-axis preservation (INV-SOC-01, INV-SOC-02), the 34 crafts, `NONE` semantics, progression formulas, physical conservation (INV-ECON-01), 2014 SRD integration, calling resolution rules, open Owner questions, and follow-ups. |
| `tools/society/test_craft_catalogue.js` | Deterministic headless test suite. Validates Draft 2020-12 schema, craft count & bijection, family distribution, three-axis independence, progression invariants, DEUS catalog alignment, SRD tool references, calling mappings, Faction Plan knowledge closure, and 19 killed mutants. |
| `tasks/SOC.12.01/lane-bk/build_craft_catalogue.js` | Deterministic assembly tool for generating and validating `craft_catalogue.json`. |
| `tasks/SOC.12.01/lane-bk/REPORT.md` | This report. |

### 1.1 The 34 Canonical Crafts
Every craft from `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md` §2 and `game/data/society/person_identity.schema.json` is fully catalogued across six families:
- **Extractive (7):** `FARMER`, `MINER`, `LOGGER`, `QUARRYMAN`, `HUNTER`, `FISHER`, `FORAGER`.
- **Pyrometallurgical & Smiths (4):** `SMELTER`, `BLACKSMITH`, `ARMORER`, `WEAPONSMITH`.
- **Construction & Woodcraft (4):** `CARPENTER`, `MASON`, `WOODCARVER`, `THATCHER`.
- **Organic & Textiles (5):** `LEATHERWORKER`, `TANNER`, `TAILOR`, `WEAVER`, `SPINNER`.
- **Sustenance & Processing (5):** `COOK`, `BREWER`, `MILLER`, `BUTCHER`, `BAKER`.
- **Artisan & Specialized (9):** `POTTER`, `GLASSWORKER`, `JEWELER`, `FLETCHER`, `BOWYER`, `HERBALIST`, `ALCHEMIST`, `SCRIBE`, `MERCHANT`.

### 1.2 Preservation of the Three Independent Axes
- **INV-SOC-01:** Holding a craft does not mandate or restrict civic office or combat class.
- **INV-SOC-02:** Current Duty is a transient operational task dispatched by the central duty scheduler (SOC.13), not an identity axis or craft substitute.
- **NONE Axis Semantics:** `NONE` is explicitly modeled as a valid value representing unspecialized commoners, children, non-working elders, or pure civic leaders. Persons with `craft: "NONE"` perform essential tasks (`HAUL_RESOURCE`, `BASIC_FORAGE`, `EMERGENCY_DEFENSE`, `CIVIC_OFFICE_WORK`).

### 1.3 Apprentice-to-Master Progression Model
Standardized 4-tier competence ladder without ungrounded mechanics:
- **Rank 1 (`APPRENTICE`):** 0.75x speed multiplier, `STANDARD` quality tier access, 250 downtime training days (2014 SRD baseline for acquiring tool proficiency under an instructor).
- **Rank 2 (`JOURNEYMAN`):** 1.00x baseline speed multiplier, `SUPERIOR` quality tier access, 500 downtime training days.
- **Rank 3 (`ARTISAN`):** 1.25x speed multiplier, `EXCELLENT` quality tier access, 1000 downtime training days.
- **Rank 4 (`MASTER`):** 1.50x speed multiplier, `MASTERWORK` quality tier access, 1500 downtime training days.
- Recipe execution work ticks: $\text{Effective Work} = \lceil W_{\text{base}} / \text{EfficiencyMultiplier} \rceil$.

### 1.4 Real DEUS Production Chain Linkage
- **Workstations:** Grounded in real `DEUS_WorldCatalog.json` object IDs (`furnace`, `smithy`, `workbench`, `pottery_kiln`, `mason_bench`, `tanning_rack`, `bowyer_bench`, `fletcher_bench`, `kitchen_hearth`, `farm_plot`, etc.).
- **Resources:** Aligned with `DEUS_ResourceRegistry.json` core resource classes (`FOOD`, `WOOD`, `STONE`, `IRON`, `COPPER`, `GOLD`, `SILVER`, `PLATINUM`, `FIBER`, `WATER`).
- **Items:** All inputs and outputs exist in `DEUS_WorldCatalog.json` `items.types`.
- **Recipes & Labors:** Recipes referenced exist in `recipes.list`; labors referenced exist in `labors.list`.

### 1.5 2014 SRD 5.1 Tool Integration & Faction Plan Closure
- 14 crafts map to authentic 2014 SRD artisan tools/kits in `game/data/srd51/equipment.json` (`srd:tool:smiths-tools`, `carpenters-tools`, `masons-tools`, `woodcarvers-tools`, `leatherworkers-tools`, `weavers-tools`, `cooks-utensils`, `brewers-supplies`, `potters-tools`, `glassblowers-tools`, `jewelers-tools`, `herbalism-kit`, `alchemists-supplies`, `calligraphers-supplies`).
- Standard 5 gp market value per 8-hour day crafting throughput with half-value raw materials expenditure.
- Two-way closure with `game/data/plans/TEMPLATE.plan.json`: every craft is unlocked by exactly one of the 14 `kind: "craft"` knowledge nodes (`craft.survival`, `craft.field`, `craft.wood`, `craft.stone`, `craft.ore`, `craft.smith`, `craft.hide`, `craft.fiber`, `craft.sustenance`, `craft.learning`, `craft.bow`, `craft.kiln`, `craft.trade`, `craft.fine`).

---

## 2. Gate Evidence

Both `gateTests` defined in `tasks/SOC.12.01/lane-bk/lane.json` were executed in the foreground from the project root. Both exited 0.

### 2.1 `node tools/society/test_craft_catalogue.js`

```
=== DEUS MASTER CRAFT CATALOGUE (SOC.12.01) ===

--- Section 1: Baseline Catalogue & Schema Checks ---
  [PASS] schema_validates: catalogue matches JSON schema
  [PASS] catalogue_has_34_crafts: found 34 crafts (expected 34)
  [PASS] craft_ids_match_canonical_set: exact 1:1 match with person identity schema 34 crafts
  [PASS] none_semantics_explicitly_defined: {"civicOfficeIndependent":true,"classIndependent":true,"dutyDecoupled":true}
  [PASS] family_distribution_exact: {"extractive":7,"pyrometallurgical_and_smiths":4,"construction_and_woodcraft":4,"organic_and_textiles":5,"sustenance_and_processing":5,"artisan_and_specialized":9}
  [PASS] three_axes_independent: all crafts assert axis independence and contain no office/class/duty couplings
  [PASS] duty_scheduler_isolated: calling resolution rules explicitly isolate duty from craft identity
  [PASS] progression_four_tiers_per_craft: every craft defines exactly 4 tiers
  [PASS] progression_ranks_monotone: ranks are 1, 2, 3, 4 strictly monotone
  [PASS] progression_efficiency_monotone: efficiency multipliers strictly increasing
  [PASS] progression_quality_access_stepped: quality access hierarchy is STANDARD -> SUPERIOR -> EXCELLENT -> MASTERWORK
  [PASS] progression_downtime_days_monotone: training days non-decreasing across tiers
  [PASS] production_resource_classes_valid: all resource classes exist in DEUS_ResourceRegistry
  [PASS] production_workstations_valid: all workstations exist in DEUS_WorldCatalog objects
  [PASS] production_recipes_valid: all recipes exist in DEUS_WorldCatalog recipes.list
  [PASS] production_labors_valid: all labors exist in DEUS_WorldCatalog labors.list
  [PASS] production_items_valid: all inputs and outputs exist in DEUS_WorldCatalog items.types
  [PASS] srd51_tools_grounded: all non-null toolProficiencies exist in srd51/equipment.json
  [PASS] srd51_crafting_rate_standard: every craft cites 5 gp market value per 8-hour day rate
  [PASS] calling_mappings_consistent: callingMappings match Identity.CALLING_CRAFT exactly
  [PASS] faction_knowledge_closure: two-way closure between craft catalogue and TEMPLATE.plan.json craft nodes

--- Section 2: Rule 4 Targeted Failing Fixtures (Mutants) ---
  [PASS] mutant mutant_drop_craft killed by catalogue_has_34_crafts, craft_ids_match_canonical_set
  [PASS] mutant mutant_duplicate_craft killed by craft_ids_match_canonical_set
  [PASS] mutant mutant_alien_craft killed by craft_ids_match_canonical_set, schema_validates
  [PASS] mutant mutant_corrupt_none_semantics killed by none_semantics_explicitly_defined, schema_validates
  [PASS] mutant mutant_family_distribution killed by family_distribution_exact
  [PASS] mutant mutant_couple_office killed by three_axes_independent, schema_validates
  [PASS] mutant mutant_couple_class killed by three_axes_independent, schema_validates
  [PASS] mutant mutant_progression_tier_count killed by progression_four_tiers_per_craft, schema_validates
  [PASS] mutant mutant_progression_rank_order killed by progression_ranks_monotone
  [PASS] mutant mutant_progression_efficiency_inverted killed by progression_efficiency_monotone
  [PASS] mutant mutant_progression_quality_degraded killed by progression_quality_access_stepped
  [PASS] mutant mutant_invalid_workstation killed by production_workstations_valid
  [PASS] mutant mutant_invalid_resource_class killed by production_resource_classes_valid
  [PASS] mutant mutant_invalid_recipe killed by production_recipes_valid
  [PASS] mutant mutant_invalid_input_item killed by production_items_valid
  [PASS] mutant mutant_invalid_srd_tool killed by srd51_tools_grounded
  [PASS] mutant mutant_calling_map_mismatch killed by calling_mappings_consistent
  [PASS] mutant mutant_knowledge_node_mismatch killed by faction_knowledge_closure
  [PASS] mutant mutant_schema_extra_property killed by schema_validates

==================================================
CRAFT CATALOGUE PASSED: 21 baseline checks, 19 mutants killed (37.2 ms).
==================================================
EXIT_CODE: 0
```

### 2.2 `node tools/check_deus_syntax.js`

```
Checked 60 DEUS plugin files. Errors: 0
EXIT_CODE: 0
```

### 2.3 Ancillary Regression Checks

- `node tools/society/test_person_identity.js`:
  ```
  PERSON IDENTITY PASSED: 56 checks, 8 mutants killed.
  EXIT_CODE: 0
  ```
- `node tools/plans/test_faction_plan_schema.js`:
  ```
  55 passed, 0 failed.
  EXIT_CODE: 0
  ```

---

## 3. Limitations and Open Owner Questions (OWNER_TODO)

These questions represent architectural boundaries preserved without inventing unauthorized owner values:

1. **Multi-Craft Vocation Policy:** Can an individual colonist hold secondary craft proficiencies or cross-train, or does the `craft` axis remain strictly singular? (Current schema enforces a single craft token).
2. **Apprentice Promotion Criteria:** What live simulation metric triggers promotion from Apprentice to Journeyman? (e.g. cumulative work ticks completed, total economic value produced, or formal institutional appointment by a master).
3. **Craft Atrophy / Skill Decay:** Does prolonged inactivity or military mobilization degrade craft competence over multi-year periods, or is craft rank permanent?
4. **Tool Durability & Maintenance:** Do artisan tools experience wear and require blacksmith sharpening or replacement?
5. **Resolution of the 20 Unmapped Callings:** Owner confirmation to activate proposed mappings in `Identity.CALLING_CRAFT` for `laborer`, `shepherd`, `stonecutter`, `physician`, etc.

---

## 4. PROPOSED-BK Follow-ups

- **PROPOSED-BK-01:** Integrate `craft_catalogue.json` into the SOC.13 Central Duty Scheduler candidate weighting.
- **PROPOSED-BK-02:** Update `UF_Look` and the colonist inspection sheet to render craft display names and progression titles (e.g. "Master Blacksmith").
- **PROPOSED-BK-03:** Hook the 4 quality tiers (`STANDARD`, `SUPERIOR`, `EXCELLENT`, `MASTERWORK`) into the combat equipment stats multiplier pipeline in `UF_Combat`.
- **PROPOSED-BK-04:** Implement guild institution entities under SOC.20 that issue formal mastership charters and regulate guild apprenticeship contracts.
