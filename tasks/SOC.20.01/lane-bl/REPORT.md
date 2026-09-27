# SOC.20.01 lane-bl Report: Faction Institutional Skeleton & Office Schema

**Writer:** gemini (gemini-3.8-flash thinking HIGH)  
**Task:** SOC.20.01  
**Lane:** lane-bl  
**Branch:** task/lane-bl  
**Base:** main `a768eba377deab388e5def474a0bb1752fd732c3`  
**Reviewer:** grok (re-review findings disposition below)  
**Status:** Complete / Re-Review Remediated / Gate Verified. This report does not self-certify or mark the task DONE.

---

## Re-Review Finding Disposition (Grok Review a7ba49a5 / Commit 10debc5d Remediation)

### 1. Deceased Holder Operational Capability Rejection (Finding 1)
- **Problem Identified:** `validateOffice` previously allowed an office with `vacancyReason: "HOLDER_DECEASED"` to retain `primaryHolderId` and operational capability 1.0 when `status: "OCCUPIED"`.
- **Remedy:** Implemented fail-closed deceased-holder consistency rules in `validateOffice` (`tools/society/test_offices.js`):
  - When `vacancyReason === "HOLDER_DECEASED"`:
    - If `status === "OCCUPIED"` or `operationalCapability >= 1.0`, emits `semantic-deceased-holder-full-capability` on `vacancyState.operationalCapability`.
    - If `holder.primaryHolderId !== null`, emits `semantic-deceased-primary-holder-retained` on `holder.primaryHolderId`.
  - In `ACTING` interim command, `primaryHolderId` must remain `null` while `actingHolderId` is assigned to a living deputy at degraded capability (`0.5..0.75`).
  - Added targeted failing provocations `provocation_deceased_holder_full_capability_retained` and `provocation_deceased_holder_acting_retains_primary`, each isolated to 0 other errors.

### 2. Complete Canonical Ancestry-Title Coverage Even When Omitted (Finding 2)
- **Problem Identified:** `titles.required` in `office_schema.json` only required `defaultTitle`, and `validateCatalogue` ran ancestry checks conditionally on `office.titles.culturalTitles`. Deleting `culturalTitles` bypassed validation.
- **Remedy:**
  - In `game/data/society/office_schema.json`, added `culturalTitles` to `titles.required`: `"required": ["defaultTitle", "culturalTitles"]`.
  - In `validateCatalogue`, if `office.titles.culturalTitles` is omitted, validation immediately emits `catalogue-missing-canonical-ancestry`.
  - Added targeted failing provocation `provocation_missing_cultural_titles` (fails on `required`) and targeted catalogue fixture `fixture_catalogue_omitted_cultural_titles` (fails on `catalogue-missing-canonical-ancestry`). Omission cannot bypass validation.

### 3. Reciprocal Multi-Office Hierarchy Cycle Rejection (Finding 3 / Minor 1)
- **Problem Identified:** `validateOffice` rejected only self-parent and self-subordinate pointers, while `validateCatalogue` verified only direct parent/subordinate consistency. Reciprocal multi-office cycles (e.g. 2-cycle or 3-cycle) passed validation.
- **Remedy:**
  - Implemented catalogue-wide parent-pointer DFS cycle detection in `validateCatalogue` (`tools/society/test_offices.js`).
  - Any circular path across the hierarchy graph is detected and rejected with `catalogue-hierarchy-cycle`.
  - Added targeted failing fixture `fixture_catalogue_hierarchy_cycle` demonstrating rejection of reciprocal 2-office cycles.

### 4. Targeted Failing Fixtures for All Uncovered Production Validator Rules (Finding 3 / Minor 2)
- **Problem Identified:** 15 validator rules lacked targeted failing fixtures, and uppercase duty tokens in `degradationEffects` passed case-sensitive search while lowercase failed pattern.
- **Remedy:**
  - In `validateOffice`, updated degradation effects check to search case-insensitively for `"DUTY"`. Added `provocation_duty_phrase_in_degradation_effects` testing schema-valid `"CURRENT_DUTY_DEFEND_GATE"` against `semantic-duty-in-degradation-effects`, and `provocation_invalid_token_pattern_in_degradation_effects` testing invalid syntax against `pattern`.
  - Added `provocation_office_id_max_length_exceeded` testing 67-character `officeId` against `maxLength`.
  - Added isolated catalogue fixtures in Section 9 of `test_offices.js` for all uncovered catalogue rules:
    - `fixture_catalogue_missing_parent` -> `catalogue-missing-parent`
    - `fixture_catalogue_missing_subordinate` -> `catalogue-missing-subordinate`
    - `fixture_catalogue_parent_mismatch` -> `catalogue-parent-mismatch`
    - `fixture_catalogue_decided_max_holders` -> `catalogue-decided-max-holders`
    - `fixture_catalogue_decided_concurrent_offices` -> `catalogue-decided-concurrent-offices`
    - `fixture_catalogue_decided_succession_method` -> `catalogue-decided-succession-method`
    - `fixture_catalogue_decided_appointment_authority` -> `catalogue-decided-appointment-authority`
    - `fixture_catalogue_culture_outcome_not_open` -> `catalogue-culture-outcome-not-open`
    - `fixture_catalogue_invented_age_gate` -> `catalogue-invented-age-gate`
    - `fixture_catalogue_invented_craft_gate` -> `catalogue-invented-craft-gate`
    - `fixture_catalogue_invented_class_gate` -> `catalogue-invented-class-gate`
    - `fixture_catalogue_invented_level_gate` -> `catalogue-invented-level-gate`
    - `fixture_catalogue_invented_baseline_hours` -> `catalogue-invented-baseline-hours`
    - `fixture_catalogue_hierarchy_cycle` -> `catalogue-hierarchy-cycle`
    - `fixture_catalogue_omitted_cultural_titles` -> `catalogue-missing-canonical-ancestry`
  - Every fixture explicitly verifies isolation: fails on the intended rule, and passes when only that rule is disabled (`otherErrors.length === 0`).

---

## What changed

| File | Role / Change Reason |
| :--- | :--- |
| `game/data/society/office_schema.json` | Updated `titles` definition: added `culturalTitles` to `required` array (`["defaultTitle", "culturalTitles"]`). |
| `docs/systems/DEUS_FactionOffices.md` | Authoritative system specification updated: documented deceased-holder fail-closed semantics, mandatory cultural titles coverage, and acyclic catalogue hierarchy tree enforcement. |
| `tools/society/test_offices.js` | Updated test suite and validator: added deceased holder checks, case-insensitive duty detection in `degradationEffects`, required culturalTitles check in `validateCatalogue`, parent-pointer DFS cycle detection, 21 isolated catalogue fixtures, and 69 targeted failing provocations. |

---

## How I tested it

Executed both lane gates in the foreground within the workspace directory:
1. `node tools/society/test_offices.js`
2. `node tools/check_deus_syntax.js`

Executed programmatic verification of Grok re-review probes:
- Probe 1 (`OCCUPIED` + `HOLDER_DECEASED` + capability 1.0 + `PERSON_184`): rejected with `semantic-deceased-holder-full-capability`.
- Probe 2 (`ACTING` + `HOLDER_DECEASED` + capability 0.6 + primary `PERSON_184` + acting `PERSON_227`): rejected with `semantic-deceased-primary-holder-retained`.
- Probe 3 (Omitted `culturalTitles` map): rejected with `required` in `validateOffice` and `catalogue-missing-canonical-ancestry` in `validateCatalogue`.
- Probe 4 (Reciprocal 2-office and 3-office cycles): rejected with `catalogue-hierarchy-cycle`.

---

## Evidence

### Gate 1: `node tools/society/test_offices.js`
```text
=== FACTION INSTITUTIONAL SKELETON & OFFICE SCHEMA (SOC.20.01) ===
  [PASS] schema_loaded: C:\Users\snewt\.deus_worktrees\lane-bl\game\data\society\office_schema.json
  [PASS] schema_defs_intact: 10 definitions found
  [PASS] canonical_OFFICE_LEADER: Valid (GOVERNANCE, CORE_FOUNDER)
  [PASS] canonical_OFFICE_TREASURER: Valid (FINANCE, CORE_FOUNDER)
  [PASS] canonical_OFFICE_MINT_MASTER: Valid (FINANCE, CORE_FOUNDER)
  [PASS] canonical_OFFICE_MARSHAL: Valid (DEFENSE, CORE_FOUNDER)
  [PASS] canonical_OFFICE_QUARTERMASTER: Valid (LOGISTICS, CORE_FOUNDER)
  [PASS] canonical_OFFICE_MASTER_OF_WORKS: Valid (INFRASTRUCTURE, CORE_FOUNDER)
  [PASS] canonical_OFFICE_PROVISIONER: Valid (SUSTENANCE, CORE_FOUNDER)
  [PASS] canonical_OFFICE_RECORDER: Valid (RECORDS, CORE_FOUNDER)
  [PASS] canonical_OFFICE_STEWARD: Valid (ADMINISTRATION, PRIMARY_GOVERNANCE)
  [PASS] canonical_OFFICE_HEALER_DIRECTOR: Valid (HEALTH, SPECIALIZED_DEPARTMENT)
  [PASS] canonical_OFFICE_MAGISTRATE: Valid (JUSTICE, SPECIALIZED_DEPARTMENT)
  [PASS] canonical_OFFICE_ENVOY: Valid (DIPLOMACY, SPECIALIZED_DEPARTMENT)
  [PASS] canonical_OFFICE_TRADE_MASTER: Valid (COMMERCE, SPECIALIZED_DEPARTMENT)
  [PASS] canonical_OFFICE_TAX_COLLECTOR: Valid (FINANCE, SUBORDINATE_EXPANSION)
  [PASS] canonical_OFFICE_PAYMASTER: Valid (FINANCE, SUBORDINATE_EXPANSION)
  [PASS] canonical_OFFICE_CLERK: Valid (RECORDS, SUBORDINATE_EXPANSION)
  [PASS] catalogue_relational_integrity: All 16 offices possess consistent parent/subordinate links, INV-SOC-06 domain separation, and open owner questions preservation
  [PASS] manifest_valid: 16 canonical offices listed with open aliases preserved
  [PASS] inv_faction_001_occupied: Occupied office is valid with active capability 1.0
  [PASS] inv_faction_001_vacancy_survival: Office survives holder death intact as VACANT entity with preserved jurisdiction
  [PASS] inv_faction_001_acting_assumption: Deputy assumption valid with degraded capability 0.5
  [PASS] inv_soc_02_duty_rejected: Current Duty rejected as office property
  [PASS] open_question_cardinality: Supports UNDECIDED, SINGLE, MULTIPLE, and COLLEGIATE holder cardinality
  [PASS] open_question_succession_open: successionPolicy.cultureOutcomeOpen is explicitly asserted true
  [PASS] open_question_functions: All 19 canonical functions (including HEALER) validate successfully

--- Targeted Failing Fixtures for Production Rules ---
  [PASS] fixture_catalogue_mismatched_parent_subordinate: Detected subordinate mismatch when parent omits subordinate (isolated: catalogue-subordinate-mismatch, passes when disabled)
  [PASS] fixture_catalogue_quartermaster_treasury_chest: Detected INV-SOC-06 violation: Quartermaster holding TREASURY_CHEST (isolated: catalogue-inv-soc-06-treasury-chest-leak, passes when disabled)
  [PASS] fixture_catalogue_missing_canonical_ancestry: Detected missing canonical ancestry (half-elf) (isolated: catalogue-missing-canonical-ancestry, passes when disabled)
  [PASS] fixture_catalogue_noncanonical_ancestry: Detected non-canonical ancestry key (goblin) (isolated: catalogue-noncanonical-ancestry-key, passes when disabled)
  [PASS] fixture_catalogue_invented_race_title: Detected invented race title 'Jarl' violating DEC-015 (isolated: catalogue-invented-race-title, passes when disabled)
  [PASS] fixture_catalogue_decided_cardinality: Detected premature decision of holder cardinality (SINGLE instead of UNDECIDED) (isolated: catalogue-decided-cardinality, passes when disabled)
  [PASS] fixture_catalogue_missing_parent: Detected missing parent office not found in catalogue (isolated: catalogue-missing-parent, passes when disabled)
  [PASS] fixture_catalogue_missing_subordinate: Detected missing subordinate office not found in catalogue (isolated: catalogue-missing-subordinate, passes when disabled)
  [PASS] fixture_catalogue_parent_mismatch: Detected parent mismatch when office lists subordinate pointing to another parent (isolated: catalogue-parent-mismatch, passes when disabled)
  [PASS] fixture_catalogue_decided_max_holders: Detected premature decision of maxHolders in canonical record (isolated: catalogue-decided-max-holders, passes when disabled)
  [PASS] fixture_catalogue_decided_concurrent_offices: Detected premature decision of allowConcurrentOffices in canonical record (isolated: catalogue-decided-concurrent-offices, passes when disabled)
  [PASS] fixture_catalogue_decided_succession_method: Detected premature decision of succession method in canonical record (isolated: catalogue-decided-succession-method, passes when disabled)
  [PASS] fixture_catalogue_decided_appointment_authority: Detected premature decision of appointmentAuthority in canonical record (isolated: catalogue-decided-appointment-authority, passes when disabled)
  [PASS] fixture_catalogue_culture_outcome_not_open: Detected cultureOutcomeOpen set to false in canonical record (isolated: catalogue-culture-outcome-not-open, passes when disabled)
  [PASS] fixture_catalogue_invented_age_gate: Detected invented minAge gate in canonical record (isolated: catalogue-invented-age-gate, passes when disabled)
  [PASS] fixture_catalogue_invented_craft_gate: Detected invented requiredCrafts gate in canonical record (isolated: catalogue-invented-craft-gate, passes when disabled)
  [PASS] fixture_catalogue_invented_class_gate: Detected invented requiredClasses gate in canonical record (isolated: catalogue-invented-class-gate, passes when disabled)
  [PASS] fixture_catalogue_invented_level_gate: Detected invented minLevel gate in canonical record (isolated: catalogue-invented-level-gate, passes when disabled)
  [PASS] fixture_catalogue_invented_baseline_hours: Detected invented baselineHoursPerWeek in canonical record (isolated: catalogue-invented-baseline-hours, passes when disabled)
  [PASS] fixture_catalogue_hierarchy_cycle: Detected reciprocal multi-office hierarchy cycle (isolated: catalogue-hierarchy-cycle, passes when disabled)
  [PASS] fixture_catalogue_omitted_cultural_titles: Detected omitted culturalTitles map in canonical office (isolated: catalogue-missing-canonical-ancestry, passes when disabled)

--- Targeted Failing Provocations (Binding Rule) ---
  [PASS] provocation_missing_office_id: Killed: [required] officeId -> Missing required property: officeId
  [PASS] provocation_bad_office_id_pattern: Killed: [pattern] officeId -> String does not match pattern ^[A-Za-z][A-Za-z0-9_.:-]*$
  [PASS] provocation_office_id_max_length_exceeded: Killed: [maxLength] officeId -> String length 67 > maxLength 64
  [PASS] provocation_missing_schema_version: Killed: [required] schemaVersion -> Missing required property: schemaVersion
  [PASS] provocation_bad_schema_version: Killed: [const] schemaVersion -> Expected constant "deus-office-schema/1.0.0", got "2.0.0"
  [PASS] provocation_missing_canonical_function: Killed: [required] canonicalFunction -> Missing required property: canonicalFunction
  [PASS] provocation_unknown_canonical_function: Killed: [enum] canonicalFunction -> Value "ARCH_LICH_KING" not in enum: [LEADER, EXECUTIVE, STEWARD, ADMIN, TREASURER, MINT_MASTER, MARSHAL, QUARTERMASTER, MASTER_OF_WORKS, PROVISIONER, RECORDER, MAGISTRATE, HEALER_DIRECTOR, HEALER, ENVOY, TRADE_MASTER, TAX_COLLECTOR, PAYMASTER, CLERK]
  [PASS] provocation_unknown_department: Killed: [enum] department -> Value "ALCHEMY_GUILD_DEPARTMENT" not in enum: [GOVERNANCE, ADMINISTRATION, FINANCE, DEFENSE, LOGISTICS, INFRASTRUCTURE, SUSTENANCE, RECORDS, JUSTICE, HEALTH, DIPLOMACY, COMMERCE]
  [PASS] provocation_missing_titles: Killed: [required] titles -> Missing required property: titles
  [PASS] provocation_missing_cultural_titles: Killed: [required] titles.culturalTitles -> Missing required property: culturalTitles
  [PASS] provocation_empty_default_title: Killed: [minLength] titles.defaultTitle -> String length 0 < minLength 1
  [PASS] provocation_missing_jurisdiction: Killed: [required] jurisdiction -> Missing required property: jurisdiction
  [PASS] provocation_invalid_jurisdiction_scope: Killed: [enum] jurisdiction.scope -> Value "MULTIVERSE_LEVEL" not in enum: [FACTION, SETTLEMENT, REGIONAL, DEPARTMENTAL]
  [PASS] provocation_empty_jurisdiction_domains: Killed: [minItems] jurisdiction.domains -> Array length 0 < minItems 1
  [PASS] provocation_unknown_jurisdiction_domain: Killed: [enum] jurisdiction.domains[0] -> Value "ASTRAL_PLANE" not in enum: [SOVEREIGNTY, DEFENSE_PERIMETER, TREASURY_CHEST, MINES_AND_WORKS, COMMUNAL_GRANARY, MARKETPLACE_DISTRICT, MILITIA_GARRISON, ARCHIVES, INFIRMARY, WORKSHOPS, CIVIL_RECORDS, FOREIGN_ENVOYS, FOUNDRY_MINT, TAX_DISTRICTS, PAYROLL_OFFICE]
  [PASS] provocation_duplicate_jurisdiction_domains: Killed: [uniqueItems] jurisdiction.domains[1] -> Duplicate item found in array: SOVEREIGNTY
  [PASS] provocation_missing_authority_scopes: Killed: [required] authorityScopes -> Missing required property: authorityScopes
  [PASS] provocation_empty_authority_scopes: Killed: [minItems] authorityScopes -> Array length 0 < minItems 1
  [PASS] provocation_unknown_authority_scope: Killed: [enum] authorityScopes[0] -> Value "TELEPORT_FACTION_CITIZENS" not in enum: [COMMAND_SOVEREIGN, EMERGENCY_DECREE, DIPLOMATIC_TREATY, CIVIL_ADMINISTRATION, LABOR_ALLOCATION, CENSUS_MAINTAIN, BUDGET_DISBURSE, COIN_MINT, TAX_ASSESS, TAX_COLLECT, WAGE_PAY, FINANCIAL_AUDIT, MILITARY_MOBILIZATION, DEFENSE_PATROL, GARRISON_COMMAND, STOCKPILE_ALLOCATION, TOOL_DISTRIBUTION, CONSTRUCTION_ORDER, INFRASTRUCTURE_PLAN, FOOD_RATIONING, HARVEST_QUOTA, CHRONICLE_RECORD, ARCHIVE_MAINTAIN, DISPUTE_ARBITRATION, LAW_ENFORCEMENT, PUNISHMENT_SENTENCE, QUARANTINE_ORDER, INFIRMARY_DIRECT, TRADE_LICENSE, TARIFF_LEVY, MARKET_REGULATE]
  [PASS] provocation_duplicate_authority_scopes: Killed: [uniqueItems] authorityScopes[1] -> Duplicate item found in array: COMMAND_SOVEREIGN
  [PASS] provocation_missing_vacancy_state: Killed: [required] vacancyState -> Missing required property: vacancyState
  [PASS] provocation_unknown_vacancy_status: Killed: [enum] vacancyState.status -> Value "VANISHED_INTO_THIN_AIR" not in enum: [OCCUPIED, VACANT, ACTING, SUSPENDED, DORMANT]
  [PASS] provocation_inconsistent_vacant_flag_occupied: Killed: [semantic-occupied-mismatch] vacancyState.isVacant -> isVacant must be false when status is OCCUPIED
  [PASS] provocation_inconsistent_vacant_flag_vacant: Killed: [semantic-vacancy-mismatch] vacancyState.isVacant -> isVacant must be true when status is VACANT
  [PASS] provocation_inconsistent_vacant_flag_acting: Killed: [semantic-acting-mismatch] vacancyState.isVacant -> isVacant must be false when status is ACTING
  [PASS] provocation_inconsistent_vacant_flag_suspended: Killed: [semantic-suspended-mismatch] vacancyState.isVacant -> isVacant must be true when status is SUSPENDED
  [PASS] provocation_inconsistent_vacant_flag_dormant: Killed: [semantic-dormant-mismatch] vacancyState.isVacant -> isVacant must be true when status is DORMANT
  [PASS] provocation_vacant_retains_primary_holder: Killed: [semantic-vacant-primary-holder-retained] holder.primaryHolderId -> A vacant office cannot retain a primaryHolderId
  [PASS] provocation_vacant_retains_acting_holder: Killed: [semantic-vacant-acting-holder-retained] holder.actingHolderId -> A vacant office cannot retain an actingHolderId
  [PASS] provocation_vacant_retains_co_holders: Killed: [semantic-vacant-co-holders-retained] holder.coHolderIds -> A vacant office cannot retain coHolderIds
  [PASS] provocation_vacant_retains_capability: Killed: [semantic-vacant-capability-excess] vacancyState.operationalCapability -> A vacant/suspended/dormant office cannot retain operational capability > 0.0
  [PASS] provocation_occupied_missing_primary_holder: Killed: [semantic-occupied-missing-holder] holder.primaryHolderId -> An OCCUPIED office must have a non-null primaryHolderId
  [PASS] provocation_occupied_bad_capability: Killed: [semantic-occupied-capability-mismatch] vacancyState.operationalCapability -> An OCCUPIED office must have operationalCapability 1.0
  [PASS] provocation_acting_missing_acting_holder: Killed: [semantic-acting-missing-holder] holder.actingHolderId -> An ACTING office must have a non-null actingHolderId
  [PASS] provocation_acting_bad_capability_low: Killed: [semantic-acting-capability-range] vacancyState.operationalCapability -> An ACTING office must have operationalCapability between 0.5 and 0.75
  [PASS] provocation_acting_bad_capability_high: Killed: [semantic-acting-capability-range] vacancyState.operationalCapability -> An ACTING office must have operationalCapability between 0.5 and 0.75
  [PASS] provocation_deceased_holder_full_capability_retained: Killed: [semantic-deceased-holder-full-capability] vacancyState.operationalCapability -> An office cannot retain full operational capability (1.0) or OCCUPIED status when vacancyReason is HOLDER_DECEASED
  [PASS] provocation_deceased_holder_acting_retains_primary: Killed: [semantic-deceased-primary-holder-retained] holder.primaryHolderId -> An office cannot retain a primaryHolderId when vacancyReason is HOLDER_DECEASED
  [PASS] provocation_single_cardinality_with_co_holders: Killed: [semantic-single-cardinality-coholders] holder.coHolderIds -> Single cardinality office cannot have co-holders
  [PASS] provocation_single_cardinality_bad_max_holders: Killed: [semantic-single-cardinality-max-holders] holder.maxHolders -> Single cardinality office maxHolders must be 1 or null
  [PASS] provocation_max_holders_exceeded: Killed: [semantic-max-holders-exceeded] holder.maxHolders -> Holder count (2) exceeds maxHolders (1)
  [PASS] provocation_duty_phrase_in_degradation_effects: Killed: [semantic-duty-in-degradation-effects] vacancyState.degradationEffects[0] -> degradationEffects cannot contain duty phrases or colon syntax
  [PASS] provocation_invalid_token_pattern_in_degradation_effects: Killed: [pattern] vacancyState.degradationEffects[0] -> String does not match pattern ^[A-Z0-9_]+$
  [PASS] provocation_out_of_range_capability_negative: Killed: [minimum] vacancyState.operationalCapability -> Number -0.25 < minimum 0
  [PASS] provocation_out_of_range_capability_excess: Killed: [maximum] vacancyState.operationalCapability -> Number 1.25 > maximum 1
  [PASS] provocation_negative_since_year: Killed: [minimum] vacancyState.sinceYear -> Number -10 < minimum 0
  [PASS] provocation_fractional_since_year: Killed: [type] vacancyState.sinceYear -> Expected type ["integer","null"], got number
  [PASS] provocation_negative_since_tick: Killed: [minimum] vacancyState.sinceTick -> Number -1 < minimum 0
  [PASS] provocation_unknown_vacancy_reason: Killed: [enum] vacancyState.vacancyReason -> Value "ABDUCTED_BY_ASTRAL_BEINGS" not in enum: [UNASSIGNED, HOLDER_DECEASED, HOLDER_DISMISSED, HOLDER_RESIGNED, HOLDER_INCAPACITATED, OFFICE_CREATED, ]
  [PASS] provocation_missing_holder: Killed: [required] holder -> Missing required property: holder
  [PASS] provocation_unknown_holder_cardinality: Killed: [enum] holder.cardinality -> Value "PENTARCHY_ONLY" not in enum: [SINGLE, MULTIPLE, COLLEGIATE, UNDECIDED]
  [PASS] provocation_invalid_max_holders_zero: Killed: [minimum] holder.maxHolders -> Number 0 < minimum 1
  [PASS] provocation_duplicate_co_holders: Killed: [uniqueItems] holder.coHolderIds[1] -> Duplicate item found in array: PERSON_1
  [PASS] provocation_duplicate_deputies: Killed: [uniqueItems] holder.deputyIds[1] -> Duplicate item found in array: DEP_1
  [PASS] provocation_nested_additional_properties: Killed: [additionalProperties] holder.craft -> Forbidden extra property: craft
  [PASS] provocation_missing_succession_policy: Killed: [required] successionPolicy -> Missing required property: successionPolicy
  [PASS] provocation_unknown_succession_method: Killed: [enum] successionPolicy.method -> Value "TRIAL_BY_ANARCHY" not in enum: [APPOINTMENT, HEREDITARY, SENIORITY, ELECTION, COUNCIL_SELECTION, AUTOMATIC_DEPUTY, LOT, OPEN_POLICY]
  [PASS] provocation_unknown_interregnum_policy: Killed: [enum] successionPolicy.interregnumPolicy -> Value "PERMANENT_CHAOS" not in enum: [ACTING_DEPUTY, REVERT_TO_SOVEREIGN, COUNCIL_STEWARDSHIP, FREEZE_OPERATIONS, IMMEDIATE_SUCCESSION]
  [PASS] provocation_culture_outcome_not_open: Killed: [const] successionPolicy.cultureOutcomeOpen -> Expected constant true, got false
  [PASS] provocation_negative_min_age: Killed: [minimum] successionPolicy.eligibilityCriteria.minAge -> Number -5 < minimum 0
  [PASS] provocation_out_of_range_min_level_zero: Killed: [minimum] successionPolicy.eligibilityCriteria.minLevel -> Number 0 < minimum 1
  [PASS] provocation_out_of_range_min_level_excess: Killed: [maximum] successionPolicy.eligibilityCriteria.minLevel -> Number 25 > maximum 20
  [PASS] provocation_circular_parent_office: Killed: [semantic-circular-parent] parentOfficeId -> An office cannot be its own parentOfficeId
  [PASS] provocation_self_subordinate_office: Killed: [semantic-self-subordinate] subordinateOffices -> An office cannot list itself in subordinateOffices
  [PASS] provocation_unknown_criticality_tier: Killed: [enum] workloadProfile.criticalityTier -> Value "MYTHICAL_IMMORTAL" not in enum: [CORE_FOUNDER, PRIMARY_GOVERNANCE, SPECIALIZED_DEPARTMENT, SUBORDINATE_EXPANSION]
  [PASS] provocation_negative_baseline_hours: Killed: [minimum] workloadProfile.baselineHoursPerWeek -> Number -20 < minimum 0
  [PASS] provocation_duty_in_office: Killed: [semantic-duty-in-office] duty -> Current Duty is operational state and must not be a property of an Office
  [PASS] provocation_current_duty_in_office: Killed: [semantic-duty-in-office] currentDuty -> Current Duty is operational state and must not be a property of an Office
  [PASS] provocation_extra_forbidden_property: Killed: [additionalProperties] unauthorizedExtraProperty -> Forbidden extra property: unauthorizedExtraProperty

==================================================
TEST SUMMARY: 117 PASS, 0 FAIL
PROVOCATIONS KILLED: 69/69
==================================================
```
Exit code: 0.

### Gate 2: `node tools/check_deus_syntax.js`
```text
Checked 60 DEUS plugin files. Errors: 0
```
Exit code: 0.

---

## Not done / Known limitations

1. **Runtime Plugin Integration:** This task delivers the schema, data definitions, and deterministic validator for durable office entities (`SOC.20.01`). Runtime assignment of colonists to offices, death-triggered vacancy handling, and succession execution are owned by subsequent leaves (`SOC.23.01`, `SOC.23.02`, `SOC.23.03`).
2. **Dynamic Workload Accounting:** Office records declare criticality tiers and nullable baseline hours, but real-time workload calculation (transactions per hour) is scheduled for `SOC.22.01`.
3. **No Art or Audio:** In strict compliance with DEC-007, no art or audio files were created, modified, requested, or catalogued.

---

## Open Owner Questions Preserved

1. **Holder Cardinality:** Can an office be held by multiple co-holders simultaneously (e.g. dual consuls)? Can one person concurrently hold multiple offices (as in Year-0 multi-hat founders)?  
   *Preservation:* Canonical records maintain `holder.cardinality: "UNDECIDED"`, `maxHolders: null`, and `allowConcurrentOffices: null`. The schema explicitly supports `SINGLE`, `MULTIPLE`, `COLLEGIATE`, and `UNDECIDED` without predetermining policy.
2. **Culture-Specific Succession Outcomes & Cultural Titles:** Does each faction race enforce a specific succession method (hereditary monarchy, clan election, martial contest)? What are the specific cultural titles for each race?  
   *Preservation:* `successionPolicy.cultureOutcomeOpen` is asserted `true` and records use `method: "OPEN_POLICY"` with `appointmentAuthority: null`. Cultural titles cover all 9 canonical SRD ancestries (DEC-025) using neutral default titles, precluding unapproved racial lore (DEC-015).
3. **Canonical Function Aliasing:** Are `LEADER` / `EXECUTIVE`, `STEWARD` / `ADMIN`, and `HEALER` / `HEALER_DIRECTOR` single unified offices or distinct offices?  
   *Preservation:* Schema and validator accept all tokens in each pair (`LEADER`, `EXECUTIVE`, `STEWARD`, `ADMIN`, `HEALER_DIRECTOR`, `HEALER`). Canonical records do not declare premature equivalence; manifest lists `aliases: []`.
4. **Subordinate Office Split Triggers:** What quantitative workload threshold triggers an automatic council proposal to appoint a dedicated Tax Collector, Paymaster, or Clerk?  
   *Preservation:* Subordinate links and parent office IDs are established structurally; runtime triggers and threshold formulas are deferred to `SOC.22.01` and `SOC.22.02`.
