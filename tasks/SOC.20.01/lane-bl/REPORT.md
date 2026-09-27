# SOC.20.01 lane-bl Report: Faction Institutional Skeleton & Office Schema

**Writer:** gemini (gemini-3.8-flash thinking HIGH)  
**Task:** SOC.20.01  
**Lane:** lane-bl  
**Branch:** task/lane-bl  
**Base:** main `a768eba377deab388e5def474a0bb1752fd732c3`  
**Reviewer:** grok (independent review to follow)  
**Status:** Complete / Gate Verified. This report does not self-certify or mark the task DONE.

---

## What changed

| File | Role / Change Reason |
| :--- | :--- |
| `game/data/society/office_schema.json` | JSON Schema (Draft 2020-12) establishing the faction office as a durable institutional entity independent of any living holder (INV-SOC-03 / FACTION-001). Structures jurisdiction, authority scopes, vacancy state, holder cardinality, and succession policy data without deciding open owner questions. Rejects Current Duty and extra properties. |
| `game/data/society/offices/manifest.json` | Institutional registry indexing all 16 canonical offices (8 Founder Core + 5 Institutional Expansion + 3 Subordinate Expansion). |
| `game/data/society/offices/leader.json` | Canonical office definition: Governance / Sovereign command (`LEADER`, aliases `EXECUTIVE`). |
| `game/data/society/offices/treasurer.json` | Canonical office definition: Financial oversight / Budgets / Wage payroll (`TREASURER`). |
| `game/data/society/offices/mint_master.json` | Canonical office definition: Bullion assaying / Physical currency minting (`MINT_MASTER`). |
| `game/data/society/offices/marshal.json` | Canonical office definition: Defense / Garrison / Military mobilization (`MARSHAL`). |
| `game/data/society/offices/quartermaster.json` | Canonical office definition: Physical stockpiles / Tool allocation (`QUARTERMASTER`). |
| `game/data/society/offices/master_of_works.json` | Canonical office definition: Infrastructure / Public works / Construction (`MASTER_OF_WORKS`). |
| `game/data/society/offices/provisioner.json` | Canonical office definition: Granaries / Food security / Harvest quotas (`PROVISIONER`). |
| `game/data/society/offices/recorder.json` | Canonical office definition: Faction annals / Census / Land deeds (`RECORDER`). |
| `game/data/society/offices/steward.json` | Canonical office definition: Internal civil administration / Labor coordination (`STEWARD`, aliases `ADMIN`). |
| `game/data/society/offices/healer_director.json` | Canonical office definition: Public health / Infirmary triage / Quarantine (`HEALER_DIRECTOR`, aliases `HEALER`). |
| `game/data/society/offices/magistrate.json` | Canonical office definition: Justice / Dispute arbitration / Law enforcement (`MAGISTRATE`). |
| `game/data/society/offices/envoy.json` | Canonical office definition: Inter-faction diplomacy / Treaties / Trade caravans (`ENVOY`). |
| `game/data/society/offices/trade_master.json` | Canonical office definition: Market licensing / Tariffs / Trade post regulation (`TRADE_MASTER`). |
| `game/data/society/offices/tax_collector.json` | Canonical office definition: Subordinate expansion under Treasury for tax assessment and levies (`TAX_COLLECTOR`). |
| `game/data/society/offices/paymaster.json` | Canonical office definition: Subordinate expansion under Treasury for wage disbursements (`PAYMASTER`). |
| `game/data/society/offices/clerk.json` | Canonical office definition: Subordinate expansion under Records/Administration for ledger entries (`CLERK`). |
| `docs/systems/DEUS_FactionOffices.md` | Authoritative system specification detailing the four structural pillars, architectural invariants (INV-SOC-03, INV-SOC-01, INV-SOC-02), vacancy lifecycle, degradation mechanics, canonical catalogue, and open owner question preservation. |
| `tools/society/test_offices.js` | Dependency-free deterministic validator and test suite verifying schema integrity, canonical office records, manifest, architectural invariants, and 43 targeted failing provocations. |

---

## How I tested it

Executed both lane gates in the foreground within the workspace directory:
1. `node tools/society/test_offices.js`
2. `node tools/check_deus_syntax.js`

In addition, ran regression checks against the person identity suite:
- `node tools/society/test_person_identity.js --module`

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
  [PASS] manifest_valid: 16 canonical offices listed in manifest.json
  [PASS] inv_faction_001_occupied: Occupied office is valid with active capability 1.0
  [PASS] inv_faction_001_vacancy_survival: Office survives holder death intact as VACANT entity with preserved jurisdiction
  [PASS] inv_faction_001_acting_assumption: Deputy assumption valid with degraded capability 0.5
  [PASS] inv_soc_02_duty_rejected: Current Duty rejected as office property
  [PASS] open_question_cardinality: Supports UNDECIDED, SINGLE, MULTIPLE, and COLLEGIATE holder cardinality
  [PASS] open_question_succession_open: successionPolicy.cultureOutcomeOpen is explicitly asserted true
  [PASS] open_question_aliases: Recognizes EXECUTIVE, ADMIN, and HEALER_DIRECTOR canonical functions

--- Targeted Failing Provocations (Binding Rule) ---
  [PASS] provocation_missing_office_id: Killed: [required] officeId -> Missing required property: officeId
  [PASS] provocation_bad_office_id_pattern: Killed: [pattern] officeId -> String does not match pattern ^[A-Za-z][A-Za-z0-9_.:-]*$
  [PASS] provocation_missing_schema_version: Killed: [required] schemaVersion -> Missing required property: schemaVersion
  [PASS] provocation_bad_schema_version: Killed: [const] schemaVersion -> Expected constant "deus-office-schema/1.0.0", got "2.0.0"
  [PASS] provocation_unknown_canonical_function: Killed: [enum] canonicalFunction -> Value "ARCH_LICH_KING" not in enum: [LEADER, EXECUTIVE, STEWARD, ADMIN, TREASURER, MINT_MASTER, MARSHAL, QUARTERMASTER, MASTER_OF_WORKS, PROVISIONER, RECORDER, MAGISTRATE, HEALER_DIRECTOR, ENVOY, TRADE_MASTER, TAX_COLLECTOR, PAYMASTER, CLERK]
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
  [PASS] provocation_out_of_range_capability_negative: Killed: [minimum] vacancyState.operationalCapability -> Number -0.25 < minimum 0
  [PASS] provocation_out_of_range_capability_excess: Killed: [maximum] vacancyState.operationalCapability -> Number 1.25 > maximum 1
  [PASS] provocation_negative_since_year: Killed: [minimum] vacancyState.sinceYear -> Number -10 < minimum 0
  [PASS] provocation_unknown_vacancy_reason: Killed: [enum] vacancyState.vacancyReason -> Value "ABDUCTED_BY_ASTRAL_BEINGS" not in enum: [UNASSIGNED, HOLDER_DECEASED, HOLDER_DISMISSED, HOLDER_RESIGNED, HOLDER_INCAPACITATED, OFFICE_CREATED, ]
  [PASS] provocation_missing_holder: Killed: [required] holder -> Missing required property: holder
  [PASS] provocation_unknown_holder_cardinality: Killed: [enum] holder.cardinality -> Value "PENTARCHY_ONLY" not in enum: [SINGLE, MULTIPLE, COLLEGIATE, UNDECIDED]
  [PASS] provocation_invalid_max_holders_zero: Killed: [minimum] holder.maxHolders -> Number 0 < minimum 1
  [PASS] provocation_duplicate_co_holders: Killed: [uniqueItems] holder.coHolderIds[1] -> Duplicate item found in array: PERSON_1
  [PASS] provocation_duplicate_deputies: Killed: [uniqueItems] holder.deputyIds[1] -> Duplicate item found in array: DEP_1
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
  [PASS] provocation_duty_in_office: Killed: [semantic-duty-in-office] currentDuty -> Current Duty is operational state and must not be a property of an Office
  [PASS] provocation_extra_forbidden_property: Killed: [additionalProperties] unauthorizedExtraProperty -> Forbidden extra property: unauthorizedExtraProperty

==================================================
TEST SUMMARY: 69 PASS, 0 FAIL
PROVOCATIONS KILLED: 43/43
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
2. **Dynamic Workload Accounting:** Office records declare baseline hours and criticality tiers, but real-time workload calculation (transactions per hour) is scheduled for `SOC.22.01`.
3. **No Art or Audio:** In strict compliance with DEC-007, no art or audio files were created, modified, requested, or catalogued.

---

## Open Owner Questions Preserved

1. **Holder Cardinality:** Can an office be held by multiple co-holders simultaneously (e.g. dual consuls)? Can one person concurrently hold multiple offices (as in Year-0 multi-hat founders)?  
   *Preservation:* `holder.cardinality` supports `SINGLE`, `MULTIPLE`, `COLLEGIATE`, and `UNDECIDED`. `allowConcurrentOffices` explicitly supports multi-hat holding without forcing a premature constraint.
2. **Culture-Specific Succession Outcomes:** Does each faction race enforce a specific succession method (hereditary monarchy, clan election, martial contest)?  
   *Preservation:* `successionPolicy.cultureOutcomeOpen` is asserted `true`. Offices declare administrative defaults while leaving race-specific succession law open to Owner decision / `SOC.23.02`.
3. **Canonical Function Aliasing:** Are `LEADER` / `EXECUTIVE` and `STEWARD` / `ADMIN` single unified offices with multiple title synonyms, or distinct offices?  
   *Preservation:* Schema and validator accept both tokens in each pair. Canonical records use `LEADER` and `STEWARD` while explicitly acknowledging `EXECUTIVE` and `ADMIN` as recognized aliases.
4. **Subordinate Office Split Triggers:** What quantitative workload threshold triggers an automatic council proposal to appoint a dedicated Tax Collector, Paymaster, or Clerk?  
   *Preservation:* Subordinate links and parent office IDs are established structurally; runtime triggers are deferred to `SOC.22.02`.
