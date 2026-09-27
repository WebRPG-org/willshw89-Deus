# SOC.20.01 lane-bl Report: Faction Institutional Skeleton & Office Schema

**Writer:** gemini (gemini-3.8-flash thinking HIGH)  
**Task:** SOC.20.01  
**Lane:** lane-bl  
**Branch:** task/lane-bl  
**Base:** main `a768eba377deab388e5def474a0bb1752fd732c3`  
**Reviewer:** grok (independent review disposition below)  
**Status:** Complete / Review Remediated / Gate Verified. This report does not self-certify or mark the task DONE.

---

## Review Finding Disposition (Grok Review 786b5084 Remediation)

### Blocker Findings

1. **BLOCKER 1: Canonical records answer open owner questions (cardinality, concurrency, succession method, aliases).**
   - **Remedy:** In all 16 canonical office files (`game/data/society/offices/*.json`), set `holder.cardinality: "UNDECIDED"`, `holder.maxHolders: null`, `holder.allowConcurrentOffices: null`, `successionPolicy.method: "OPEN_POLICY"`, and `successionPolicy.appointmentAuthority: null`. In `game/data/society/office_schema.json`, added `"HEALER"` to the `canonicalFunction` enum alongside `HEALER_DIRECTOR`, `LEADER`, `EXECUTIVE`, `STEWARD`, and `ADMIN`. In `game/data/society/offices/manifest.json`, set `aliases: []` across all offices to keep functional equivalence open rather than prematurely decided. In `docs/systems/DEUS_FactionOffices.md`, documented that these pairs remain open questions. In `tools/society/test_offices.js`, added assertions proving that `HEALER`, `EXECUTIVE`, and `ADMIN` all validate without error and that open policies are maintained across records.

2. **BLOCKER 2: Race-specific office names authored and assigned to wrong peoples.**
   - **Remedy:** In all 16 canonical office files, removed non-canonical keys (`orc`, `goblin`) and added all 9 canonical SRD ancestries per DEC-025 (`human`, `dwarf`, `elf`, `halfling`, `dragonborn`, `gnome`, `half-elf`, `half-orc`, `tiefling`). Removed all invented race-specific titles (`High King`, `Jarl`, `Chief`, `Swindle Factor`, `Nugget Puncher`, etc.) per DEC-015 point 4; mapped every canonical ancestry to the neutral `defaultTitle` of the respective office. In `test_offices.js`, added cross-office catalogue verification and targeted failing fixtures for missing canonical ancestries, non-canonical ancestries, and invented race titles.

### Major Findings

1. **MAJOR 1: Vacancy, holder, capability, and cardinality consistency (fail-closed vacancy semantics).**
   - **Remedy:** Implemented fail-closed validation rules in `validateOffice` (`tools/society/test_offices.js`):
     - `VACANT`, `SUSPENDED`, and `DORMANT` statuses mandate `isVacant: true`, `operationalCapability: 0.0`, `primaryHolderId: null`, `actingHolderId: null`, and `coHolderIds: []`. Any active/deceased holder or non-zero capability causes immediate validation failure.
     - `OCCUPIED` mandates `isVacant: false`, `operationalCapability: 1.0`, and non-null `primaryHolderId`.
     - `ACTING` mandates `isVacant: false`, `operationalCapability: 0.5..0.75`, and non-null `actingHolderId`.
     - `SINGLE` cardinality mandates empty `coHolderIds` and `maxHolders: 1 | null`.
     - Active holder count is checked against `maxHolders`.
     - Added targeted failing provocations for all vacancy, capability, and cardinality rules.

2. **MAJOR 2: Parent and subordinate links in catalogue disagree; Mint placed under Treasurer.**
   - **Remedy:** Reconciled bidirectional hierarchy across all 16 office records:
     - Established `OFFICE_MINT_MASTER` as a peer founder office directly under `OFFICE_LEADER` (`parentOfficeId: "OFFICE_LEADER"`, subordinates `[]`). Removed mint from `OFFICE_TREASURER` subordinates and order of precedence.
     - `OFFICE_TREASURER` subordinates are strictly `["OFFICE_TAX_COLLECTOR", "OFFICE_PAYMASTER"]`.
     - `OFFICE_RECORDER` subordinates are strictly `["OFFICE_CLERK"]`.
     - Removed `OFFICE_CLERK` from `OFFICE_STEWARD` subordinates.
     - Reconciled `OFFICE_LEADER` subordinates to list all 12 top-level offices (`STEWARD`, `TREASURER`, `MINT_MASTER`, `MARSHAL`, `QUARTERMASTER`, `MASTER_OF_WORKS`, `PROVISIONER`, `RECORDER`, `HEALER_DIRECTOR`, `MAGISTRATE`, `ENVOY`, `TRADE_MASTER`).
     - Added `validateCatalogue` in `test_offices.js` with a targeted failing fixture testing mismatched parent/subordinate links.

3. **MAJOR 3: Eligibility criteria invent class gates, craft gates, and an age of majority (INV-SOC-01 breach).**
   - **Remedy:** Stripped all invented craft gates, class gates, class level gates, and age of majority from all 16 canonical records (`minAge: null`, `requiredCrafts: []`, `requiredClasses: []`, `minLevel: null`). This upholds Invariant INV-SOC-01 (strict independence of Craft, Civic Office, and Class).

4. **MAJOR 4: Quartermaster and Mint Master jurisdiction domain leak (INV-SOC-06 breach).**
   - **Remedy:** Removed `"TREASURY_CHEST"` from `OFFICE_QUARTERMASTER` (retaining `["WORKSHOPS"]`) and from `OFFICE_MINT_MASTER` (retaining `["FOUNDRY_MINT"]`). Enforced Invariant INV-SOC-06 (strict separation between monetary balance and physical goods/assaying). Added catalogue validator rule and targeted failing fixture confirming `TREASURY_CHEST` is excluded from Quartermaster and Mint Master domains.

### Minor Findings

1. **MINOR 1: Kill counter was hardcoded ratio; match helper allowed loose matching.**
   - **Remedy:** Refactored `test_offices.js` provocation loop with an authentic kill counter (`killedCount++` only on matched error rule and property). Tightened error matching to exact rule and property path. Added targeted failing provocations covering all live checks (missing canonicalFunction, fractional sinceYear, negative sinceTick, nested additionalProperties, acting mismatch, and all fail-closed vacancy checks), increasing total provocations to 64.

2. **MINOR 2: Workload baseline hours and degradation effects duty phrases.**
   - **Remedy:** Updated `office_schema.json` to make `workloadProfile.baselineHoursPerWeek` nullable (`type: ["number", "null"]`), and set `baselineHoursPerWeek: null` across all 16 canonical records to avoid inventing concrete unsourced weekly hours. Added `pattern: "^[A-Z0-9_]+$"` in schema and semantic rejection in validator for duty phrases in `degradationEffects`. Replaced paymaster and marshal effects with neutral administrative degradation tokens.

---

## What changed

| File | Role / Change Reason |
| :--- | :--- |
| `game/data/society/office_schema.json` | Updated schema: added `HEALER` to `canonicalFunction` enum, made `workloadProfile.baselineHoursPerWeek` nullable, and constrained `degradationEffects` items pattern to `^[A-Z0-9_]+$`. |
| `game/data/society/offices/manifest.json` | Updated manifest: cleared decided aliases to `aliases: []` across all 16 canonical offices to preserve open question status. |
| `game/data/society/offices/leader.json` | Remediated canonical record: neutral titles across 9 canonical SRD ancestries, `cardinality: UNDECIDED`, `allowConcurrentOffices: null`, `method: OPEN_POLICY`, `minAge: null`, `baselineHoursPerWeek: null`, and reconciled all 12 subordinate offices. |
| `game/data/society/offices/treasurer.json` | Remediated canonical record: neutral titles, `cardinality: UNDECIDED`, `allowConcurrentOffices: null`, `method: OPEN_POLICY`, removed `OFFICE_MINT_MASTER` from subordinates and precedence, parent set to `OFFICE_LEADER`, subordinates set to tax collector and paymaster. |
| `game/data/society/offices/mint_master.json` | Remediated canonical record: peer founder office under `OFFICE_LEADER`, removed `TREASURY_CHEST` from domains (INV-SOC-06), neutral titles, `cardinality: UNDECIDED`, `method: OPEN_POLICY`, craft/class gates removed (INV-SOC-01). |
| `game/data/society/offices/marshal.json` | Remediated canonical record: neutral titles, `cardinality: UNDECIDED`, `method: OPEN_POLICY`, class gates removed, parent `OFFICE_LEADER`, neutral degradation tokens. |
| `game/data/society/offices/quartermaster.json` | Remediated canonical record: removed `TREASURY_CHEST` from domains (INV-SOC-06), neutral titles, `cardinality: UNDECIDED`, `method: OPEN_POLICY`, parent `OFFICE_LEADER`. |
| `game/data/society/offices/master_of_works.json` | Remediated canonical record: neutral titles, `cardinality: UNDECIDED`, `method: OPEN_POLICY`, craft gates removed (INV-SOC-01), parent `OFFICE_LEADER`. |
| `game/data/society/offices/provisioner.json` | Remediated canonical record: neutral titles, `cardinality: UNDECIDED`, `method: OPEN_POLICY`, craft gates removed (INV-SOC-01), parent `OFFICE_LEADER`. |
| `game/data/society/offices/recorder.json` | Remediated canonical record: neutral titles, `cardinality: UNDECIDED`, `method: OPEN_POLICY`, craft gates removed, subordinates `["OFFICE_CLERK"]`, parent `OFFICE_LEADER`. |
| `game/data/society/offices/steward.json` | Remediated canonical record: neutral titles, `cardinality: UNDECIDED`, `method: OPEN_POLICY`, removed `OFFICE_CLERK` from subordinates, parent `OFFICE_LEADER`. |
| `game/data/society/offices/healer_director.json` | Remediated canonical record: neutral titles, `cardinality: UNDECIDED`, `method: OPEN_POLICY`, craft and class gates removed (INV-SOC-01), parent `OFFICE_LEADER`. |
| `game/data/society/offices/magistrate.json` | Remediated canonical record: neutral titles, `cardinality: UNDECIDED`, `method: OPEN_POLICY`, craft gates removed (INV-SOC-01), parent `OFFICE_LEADER`. |
| `game/data/society/offices/envoy.json` | Remediated canonical record: neutral titles, `cardinality: UNDECIDED`, `method: OPEN_POLICY`, class gates removed (INV-SOC-01), parent `OFFICE_LEADER`. |
| `game/data/society/offices/trade_master.json` | Remediated canonical record: neutral titles, `cardinality: UNDECIDED`, `method: OPEN_POLICY`, craft gates removed (INV-SOC-01), parent `OFFICE_LEADER`. |
| `game/data/society/offices/tax_collector.json` | Remediated canonical record: neutral titles, `cardinality: UNDECIDED`, `method: OPEN_POLICY`, craft gates removed, parent `OFFICE_TREASURER`. |
| `game/data/society/offices/paymaster.json` | Remediated canonical record: neutral titles, `cardinality: UNDECIDED`, `method: OPEN_POLICY`, craft gates removed, parent `OFFICE_TREASURER`, neutral degradation tokens. |
| `game/data/society/offices/clerk.json` | Remediated canonical record: neutral titles, `cardinality: UNDECIDED`, `method: OPEN_POLICY`, craft gates removed, parent `OFFICE_RECORDER`. |
| `docs/systems/DEUS_FactionOffices.md` | Authoritative system specification updated to reflect fail-closed vacancy semantics, reconciled parent/subordinate hierarchy, INV-SOC-06 domain separation, 9 canonical SRD ancestries neutral coverage, and preservation of open owner questions. |
| `tools/society/test_offices.js` | Test suite and validator rewritten: fail-closed vacancy rules, cross-office relational validator `validateCatalogue`, authentic kill counter, exact error matching, 6 targeted failing fixtures for catalogue production rules, and 64 targeted failing provocations. |

---

## How I tested it

Executed both lane gates in the foreground within the workspace directory:
1. `node tools/society/test_offices.js`
2. `node tools/check_deus_syntax.js`

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
  [PASS] fixture_catalogue_mismatched_parent_subordinate: Detected subordinate mismatch when parent omits subordinate
  [PASS] fixture_catalogue_quartermaster_treasury_chest: Detected INV-SOC-06 violation: Quartermaster holding TREASURY_CHEST
  [PASS] fixture_catalogue_missing_canonical_ancestry: Detected missing canonical ancestry (half-elf)
  [PASS] fixture_catalogue_noncanonical_ancestry: Detected non-canonical ancestry key (goblin)
  [PASS] fixture_catalogue_invented_race_title: Detected invented race title 'Jarl' violating DEC-015
  [PASS] fixture_catalogue_decided_cardinality: Detected premature decision of holder cardinality (SINGLE instead of UNDECIDED)

--- Targeted Failing Provocations (Binding Rule) ---
  [PASS] provocation_missing_office_id: Killed: [required] officeId -> Missing required property: officeId
  [PASS] provocation_bad_office_id_pattern: Killed: [pattern] officeId -> String does not match pattern ^[A-Za-z][A-Za-z0-9_.:-]*$
  [PASS] provocation_missing_schema_version: Killed: [required] schemaVersion -> Missing required property: schemaVersion
  [PASS] provocation_bad_schema_version: Killed: [const] schemaVersion -> Expected constant "deus-office-schema/1.0.0", got "2.0.0"
  [PASS] provocation_missing_canonical_function: Killed: [required] canonicalFunction -> Missing required property: canonicalFunction
  [PASS] provocation_unknown_canonical_function: Killed: [enum] canonicalFunction -> Value "ARCH_LICH_KING" not in enum: [LEADER, EXECUTIVE, STEWARD, ADMIN, TREASURER, MINT_MASTER, MARSHAL, QUARTERMASTER, MASTER_OF_WORKS, PROVISIONER, RECORDER, MAGISTRATE, HEALER_DIRECTOR, HEALER, ENVOY, TRADE_MASTER, TAX_COLLECTOR, PAYMASTER, CLERK]
  [PASS] provocation_unknown_department: Killed: [enum] department -> Value "ALCHEMY_GUILD_DEPARTMENT" not in enum: [GOVERNANCE, ADMINISTRATION, FINANCE, DEFENSE, LOGISTICS, INFRASTRUCTURE, SUSTENANCE, RECORDS, JUSTICE, HEALTH, DIPLOMACY, COMMERCE]
  [PASS] provocation_missing_titles: Killed: [required] titles -> Missing required property: titles
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
  [PASS] provocation_single_cardinality_with_co_holders: Killed: [semantic-single-cardinality-coholders] holder.coHolderIds -> Single cardinality office cannot have co-holders
  [PASS] provocation_single_cardinality_bad_max_holders: Killed: [semantic-single-cardinality-max-holders] holder.maxHolders -> Single cardinality office maxHolders must be 1 or null
  [PASS] provocation_max_holders_exceeded: Killed: [semantic-max-holders-exceeded] holder.maxHolders -> Holder count (2) exceeds maxHolders (1)
  [PASS] provocation_duty_phrase_in_degradation_effects: Killed: [pattern] vacancyState.degradationEffects[0] -> String does not match pattern ^[A-Z0-9_]+$
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
TEST SUMMARY: 97 PASS, 0 FAIL
PROVOCATIONS KILLED: 64/64
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
