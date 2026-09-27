# DEUS — Faction Institutional Skeleton & Office Schema

**Authoritative System Specification & Architectural Standard**  
**Document ID:** `DEUS-FACTION-OFFICE-v1.0`  
**Task:** `SOC.20.01` (lane-bl)  
**Schema Version:** `deus-office-schema/1.0.0`  
**Integration Authority:** Gemini / Antigravity (DEUS Coordinator)  
**Authority & Foundations:** `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md` §3 & §6, `docs/systems/DEUS_PersonIdentity.md`, `docs/systems/DEUS_FactionPlans.md` §4.3, `docs/INVARIANT_REGISTRY.md` (INV-SOC-03 / FACTION-001, INV-SOC-01, INV-SOC-02, INV-SOC-04 / FACTION-002), DEC-007 (Art Freeze).

---

## 1. Executive Mandate & Institutional Principle

> **Invariant FACTION-001 (INV-SOC-03):** An office exists independently of its current holder. Government authority, institutional jurisdiction, and public obligations reside in the `Office` entity, NEVER solely as loose boolean flags on individual citizens.

In Project DEUS, civilized societies and factions are built upon durable institutional structures. When a sovereign or officer dies during a siege, resigns, or is incapacitated, the government does not vanish. The office survives as a distinct institutional entity in the faction's institutional database:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            OFFICE: TREASURER                                │
├───────────────────────┬─────────────────────────────┬───────────────────────┤
│ Office ID:            │ Canonical Function:         │ Department:           │
│ `OFFICE_TREASURER`    │ `TREASURER`                 │ `FINANCE`             │
├───────────────────────┴─────────────────────────────┴───────────────────────┤
│ Cultural Titles:      High Purser (Human), Keeper of the Vault (Dwarf),     │
│                       Purser of the Grove (Elf), Bursar (Halfling)          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Jurisdiction:         Scope: FACTION | Domains: [TREASURY_CHEST,            │
│                       TAX_DISTRICTS, PAYROLL_OFFICE]                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Authority Scopes:     [BUDGET_DISBURSE, TAX_ASSESS, WAGE_PAY,               │
│                       FINANCIAL_AUDIT]                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Vacancy State:        Status: OCCUPIED (or VACANT, ACTING)                  │
│                       Operational Capability: 1.0 (0.0 when vacant)         │
│                       Degradation Effects: [WAGE_PAYROLL_FROZEN, ...]       │
├─────────────────────────────────────────────────────────────────────────────┤
│ Holder:               Primary: Person #184 (Aldric) | Acting: Person #227   │
│                       Cardinality: SINGLE (supports MULTIPLE/UNDECIDED)     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Succession Policy:    Method: APPOINTMENT | Authority: OFFICE_LEADER        │
│                       Interregnum: ACTING_DEPUTY | Culture Outcomes: OPEN   │
└─────────────────────────────────────────────────────────────────────────────┘
```

When Person #184 (Aldric) dies:
1. `OFFICE_TREASURER` remains intact and fully defined.
2. Its status transitions to `VACANT` (or `ACTING` if held by deputy Person #227).
3. Operational capability drops to `0.0` (or `0.5` for acting).
4. Automated payroll disbursements, tax audits, and budget disbursements freeze or suffer degradation until succession policy resolves a new holder.

---

## 2. Separation from Person Identity and Current Duty

### 2.1 The Three Independent Identity Axes Preserved (INV-SOC-01)
`docs/systems/DEUS_PersonIdentity.md` establishes that a colonist's identity consists of three independent axes:
1. **Craft:** Economic / productive trade (e.g. `BLACKSMITH`, `FARMER`, `CARPENTER`, or `NONE`).
2. **Civic Office:** Institutional role (e.g. `TREASURER`, `MARSHAL`, `LEADER`, or `NONE`).
3. **Class:** Martial discipline from canonical 2014 SRD (e.g. `srd:class:fighter` 3, or `NONE`).

The `Office` entity does **not** mutate, couple, or override a person's Craft or Class. When a citizen is appointed to an office:
- Their personal `civicOffice` field points to the office entity token.
- Their `craft` remains unchanged (Aldric remains a Master Blacksmith).
- Their `class` remains unchanged (Aldric remains Fighter 3).

### 2.2 Operational State vs. Office Entity (INV-SOC-02)
`CurrentDuty` describes temporary operational tasks assigned by the Central Duty Scheduler (e.g. `FORGE_PICKAXES`, `DEFEND_WEST_GATE`, `AUDIT_LEDGER`, `SLEEP`).
- Current Duty is **not** stored on the Office entity.
- The Office entity stores formal authority scopes and institutional jurisdiction, which the Duty Scheduler queries when dispatching public duty assignments.

---

## 3. The Four Structural Pillars of an Office Record

Every office document validates against `game/data/society/office_schema.json` and embodies four structural pillars:

### Pillar I: Durable Institutional Entity & Identity
- `schemaVersion`: `"deus-office-schema/1.0.0"`
- `officeId`: Unique stable alphanumeric identifier (e.g. `OFFICE_LEADER`, `OFFICE_TREASURER`).
- `canonicalFunction`: Functional semantic category from the canonical catalogue (e.g. `LEADER`, `TREASURER`, `MINT_MASTER`).
- `department`: Institutional branch (`GOVERNANCE`, `ADMINISTRATION`, `FINANCE`, `DEFENSE`, `LOGISTICS`, `INFRASTRUCTURE`, `SUSTENANCE`, `RECORDS`, `JUSTICE`, `HEALTH`, `DIPLOMACY`, `COMMERCE`).
- `titles`: Default functional title and cultural/species title mapping (`defaultTitle` + `culturalTitles`).

### Pillar II: Jurisdiction & Authority Scopes
- `jurisdiction`:
  - `scope`: Geographic / organizational scale (`FACTION`, `SETTLEMENT`, `REGIONAL`, `DEPARTMENTAL`).
  - `factionId`: Associated faction identifier (or `null` for canonical templates).
  - `settlementId`: Associated settlement identifier (or `null` for faction-wide offices).
  - `domains`: Array of institutional operational zones:
    `SOVEREIGNTY`, `DEFENSE_PERIMETER`, `TREASURY_CHEST`, `MINES_AND_WORKS`, `COMMUNAL_GRANARY`, `MARKETPLACE_DISTRICT`, `MILITIA_GARRISON`, `ARCHIVES`, `INFIRMARY`, `WORKSHOPS`, `CIVIL_RECORDS`, `FOREIGN_ENVOYS`, `FOUNDRY_MINT`, `TAX_DISTRICTS`, `PAYROLL_OFFICE`.
  - `geographicBounds`: Optional spatial bounding tag.
- `authorityScopes`:
  Closed set of formal authorizations granted to the office:
  - Governance: `COMMAND_SOVEREIGN`, `EMERGENCY_DECREE`, `DIPLOMATIC_TREATY`
  - Administration: `CIVIL_ADMINISTRATION`, `LABOR_ALLOCATION`, `CENSUS_MAINTAIN`
  - Finance: `BUDGET_DISBURSE`, `COIN_MINT`, `TAX_ASSESS`, `TAX_COLLECT`, `WAGE_PAY`, `FINANCIAL_AUDIT`
  - Defense: `MILITARY_MOBILIZATION`, `DEFENSE_PATROL`, `GARRISON_COMMAND`
  - Logistics: `STOCKPILE_ALLOCATION`, `TOOL_DISTRIBUTION`
  - Infrastructure: `CONSTRUCTION_ORDER`, `INFRASTRUCTURE_PLAN`
  - Sustenance: `FOOD_RATIONING`, `HARVEST_QUOTA`
  - Records: `CHRONICLE_RECORD`, `ARCHIVE_MAINTAIN`
  - Justice: `DISPUTE_ARBITRATION`, `LAW_ENFORCEMENT`, `PUNISHMENT_SENTENCE`
  - Health: `QUARANTINE_ORDER`, `INFIRMARY_DIRECT`
  - Commerce: `TRADE_LICENSE`, `TARIFF_LEVY`, `MARKET_REGULATE`

### Pillar III: Vacancy State & Administrative Degradation
- `vacancyState`:
  - `status`: `"OCCUPIED" | "VACANT" | "ACTING" | "SUSPENDED" | "DORMANT"`
  - `isVacant`: Boolean flag (`true` when status is `VACANT`, `SUSPENDED`, or `DORMANT`).
  - `sinceYear`: In-game year when the current vacancy state began (minimum 0).
  - `sinceTick`: In-game tick when the current vacancy state began.
  - `vacancyReason`: Explicit cause of vacancy (`"UNASSIGNED" | "HOLDER_DECEASED" | "HOLDER_DISMISSED" | "HOLDER_RESIGNED" | "HOLDER_INCAPACITATED" | "OFFICE_CREATED" | null`).
  - `operationalCapability`: Floating-point scalar between `0.0` (complete operational paralysis) and `1.0` (peak efficiency).
  - `degradationEffects`: Explicit array of administrative penalties active while the office is vacant or degraded.

### Pillar IV: Succession Policy Data
- `successionPolicy`:
  - `method`: Formal succession mechanism (`"APPOINTMENT" | "HEREDITARY" | "SENIORITY" | "ELECTION" | "COUNCIL_SELECTION" | "AUTOMATIC_DEPUTY" | "LOT" | "OPEN_POLICY"`).
  - `appointmentAuthority`: Office ID or entity with appointment power (e.g. `OFFICE_LEADER`, `OFFICE_TREASURER`).
  - `orderOfPrecedence`: Array of designated fallback candidates or offices (e.g. `["DEPUTY", "OFFICE_STEWARD"]`).
  - `eligibilityCriteria`: Declarative qualification rules (minimum age, required crafts, required classes, minimum level, faction membership requirement).
  - `interregnumPolicy`: Policy governing operations during a vacancy (`"ACTING_DEPUTY" | "REVERT_TO_SOVEREIGN" | "COUNCIL_STEWARDSHIP" | "FREEZE_OPERATIONS" | "IMMEDIATE_SUCCESSION"`).
  - `cultureOutcomeOpen`: Boolean constant (`true`). Explicitly preserves culture-specific succession outcomes as an open Owner question.

---

## 4. Preservation of Open Owner Questions

Per Owner directives and BRIEF specifications, this schema explicitly **does not decide** open Owner questions:

### 4.1 Question 1: Holder Cardinality & Multi-Hat Holding
- **The Question:** Can an office be held by multiple co-holders (e.g. dual consuls, collegiate board of elders)? Can one person concurrently hold multiple offices (as seen in the Year-0 Founder illustration where Founder B holds both Treasurer and Mint Master)?
- **Schema Resolution:**
  - The `holder` object provides a `cardinality` enum (`SINGLE`, `MULTIPLE`, `COLLEGIATE`, `UNDECIDED`).
  - Supports `primaryHolderId`, `actingHolderId`, and an array of `coHolderIds`.
  - Includes `allowConcurrentOffices: true | false | null`, permitting multi-hat founder combinations without hardcoding a singular constraint.
  - Neither the schema nor the validator enforces a strict single-holder-per-person global lock.

### 4.2 Question 2: Culture-Specific Succession Outcomes
- **The Question:** Does each race/culture have hardcoded succession outcomes (e.g. Dwarven clan councils, Elven hereditary bloodlines, Orcish martial contests)?
- **Schema Resolution:**
  - The schema requires `successionPolicy.cultureOutcomeOpen: true`.
  - Canonical office templates provide baseline administrative policies (e.g. appointment by sovereign or deputy interregnum) while leaving race-specific succession law to future leaves (`SOC.23.02` and Owner decisions).

### 4.3 Question 3: Functional Aliases & Office Pairs
- **The Question:** Are `EXECUTIVE` and `LEADER` one office or two? Are `STEWARD` and `ADMIN` one office or two? Is `HEALER` synonymous with `HEALER_DIRECTOR`?
- **Schema Resolution:**
  - The canonical function enum includes both tokens for each pair (`LEADER` and `EXECUTIVE`, `STEWARD` and `ADMIN`, `HEALER_DIRECTOR`).
  - Canonical office records define `OFFICE_LEADER` (canonicalFunction `LEADER`, noting `EXECUTIVE` as alias), `OFFICE_STEWARD` (canonicalFunction `STEWARD`, noting `ADMIN` as alias), and `OFFICE_HEALER_DIRECTOR` (canonicalFunction `HEALER_DIRECTOR`, noting `HEALER` as alias).
  - A validator check confirms that both variations are recognized by the schema without collision.

### 4.4 Question 4: Subordinate Delegation & Workload Splitting
- **The Question:** At what exact transaction threshold does an office split off subordinate deputies?
- **Schema Resolution:**
  - The schema specifies `subordinateOffices` and `parentOfficeId` relationships (e.g. `OFFICE_TREASURER` links to `OFFICE_TAX_COLLECTOR` and `OFFICE_PAYMASTER`).
  - Stores `workloadProfile` (`baselineHoursPerWeek` and `criticalityTier`), leaving runtime workload calculation and threshold triggers to `SOC.22.01` and `SOC.22.02`.

---

## 5. The 16 Canonical Office Records

All 16 canonical offices are located in `game/data/society/offices/` and indexed in `manifest.json`:

| File | Office ID | Canonical Function | Department | Criticality Tier | Authority Scopes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `leader.json` | `OFFICE_LEADER` | `LEADER` | `GOVERNANCE` | `CORE_FOUNDER` | `COMMAND_SOVEREIGN`, `EMERGENCY_DECREE`, `DIPLOMATIC_TREATY`, `CIVIL_ADMINISTRATION` |
| `treasurer.json` | `OFFICE_TREASURER` | `TREASURER` | `FINANCE` | `CORE_FOUNDER` | `BUDGET_DISBURSE`, `TAX_ASSESS`, `WAGE_PAY`, `FINANCIAL_AUDIT` |
| `mint_master.json` | `OFFICE_MINT_MASTER` | `MINT_MASTER` | `FINANCE` | `CORE_FOUNDER` | `COIN_MINT`, `FINANCIAL_AUDIT` |
| `marshal.json` | `OFFICE_MARSHAL` | `MARSHAL` | `DEFENSE` | `CORE_FOUNDER` | `MILITARY_MOBILIZATION`, `DEFENSE_PATROL`, `GARRISON_COMMAND` |
| `quartermaster.json` | `OFFICE_QUARTERMASTER` | `QUARTERMASTER` | `LOGISTICS` | `CORE_FOUNDER` | `STOCKPILE_ALLOCATION`, `TOOL_DISTRIBUTION` |
| `master_of_works.json` | `OFFICE_MASTER_OF_WORKS` | `MASTER_OF_WORKS` | `INFRASTRUCTURE` | `CORE_FOUNDER` | `CONSTRUCTION_ORDER`, `INFRASTRUCTURE_PLAN`, `LABOR_ALLOCATION` |
| `provisioner.json` | `OFFICE_PROVISIONER` | `PROVISIONER` | `SUSTENANCE` | `CORE_FOUNDER` | `FOOD_RATIONING`, `HARVEST_QUOTA` |
| `recorder.json` | `OFFICE_RECORDER` | `RECORDER` | `RECORDS` | `CORE_FOUNDER` | `CHRONICLE_RECORD`, `ARCHIVE_MAINTAIN`, `CENSUS_MAINTAIN` |
| `steward.json` | `OFFICE_STEWARD` | `STEWARD` | `ADMINISTRATION` | `PRIMARY_GOVERNANCE` | `CIVIL_ADMINISTRATION`, `LABOR_ALLOCATION`, `CENSUS_MAINTAIN` |
| `healer_director.json` | `OFFICE_HEALER_DIRECTOR` | `HEALER_DIRECTOR` | `HEALTH` | `SPECIALIZED_DEPARTMENT` | `QUARANTINE_ORDER`, `INFIRMARY_DIRECT` |
| `magistrate.json` | `OFFICE_MAGISTRATE` | `MAGISTRATE` | `JUSTICE` | `SPECIALIZED_DEPARTMENT` | `DISPUTE_ARBITRATION`, `LAW_ENFORCEMENT`, `PUNISHMENT_SENTENCE` |
| `envoy.json` | `OFFICE_ENVOY` | `ENVOY` | `DIPLOMACY` | `SPECIALIZED_DEPARTMENT` | `DIPLOMATIC_TREATY` |
| `trade_master.json` | `OFFICE_TRADE_MASTER` | `TRADE_MASTER` | `COMMERCE` | `SPECIALIZED_DEPARTMENT` | `TRADE_LICENSE`, `TARIFF_LEVY`, `MARKET_REGULATE` |
| `tax_collector.json` | `OFFICE_TAX_COLLECTOR` | `TAX_COLLECTOR` | `FINANCE` | `SUBORDINATE_EXPANSION` | `TAX_COLLECT`, `TAX_ASSESS` |
| `paymaster.json` | `OFFICE_PAYMASTER` | `PAYMASTER` | `FINANCE` | `SUBORDINATE_EXPANSION` | `WAGE_PAY`, `FINANCIAL_AUDIT` |
| `clerk.json` | `OFFICE_CLERK` | `CLERK` | `RECORDS` | `SUBORDINATE_EXPANSION` | `CHRONICLE_RECORD`, `ARCHIVE_MAINTAIN`, `CENSUS_MAINTAIN` |

---

## 6. Vacancy Lifecycle & Degradation Model

The transition model follows discrete institutional states:

```text
 ┌──────────┐  Holder assigned   ┌──────────┐
 │  VACANT  │ ─────────────────> │ OCCUPIED │
 └──────────┘                    └──────────┘
      ▲                               │
      │   Holder dies / dismissed     │
      │   (no deputy available)       ▼
      │                          ┌──────────┐
      └───────────────────────── │  ACTING  │ (Deputy assumes interim command)
                                 └──────────┘
```

1. **`OCCUPIED`:**
   - `isVacant: false`, `operationalCapability: 1.0`.
   - All authority scopes active.
   - `primaryHolderId` references active person.
2. **`ACTING`:**
   - `isVacant: false`, `operationalCapability: 0.5..0.75`.
   - `actingHolderId` references deputy.
   - Routine administrative actions proceed with minor latency.
3. **`VACANT`:**
   - `isVacant: true`, `operationalCapability: 0.0`.
   - `primaryHolderId: null`, `actingHolderId: null`.
   - Associated authority actions freeze; active degradation effects trigger across the faction.

---

## 7. Deterministic Verification & Gate Criteria

The test suite in `tools/society/test_offices.js` enforces deterministic validation across:
1. **Schema Integrity:** Verifies `office_schema.json` against JSON Schema Draft 2020-12 constraints.
2. **Canonical Office Coverage:** Validates all 16 canonical records in `game/data/society/offices/`.
3. **Invariant FACTION-001 (INV-SOC-03):** Proves an office entity survives holder removal and maintains its institutional jurisdiction.
4. **Three-Axis Separation (INV-SOC-01 & INV-SOC-02):** Proves the office entity rejects current duty or personal craft mutations.
5. **Targeted Failing Provocations:** Every validator rule is paired with a distinct failing mutation/fixture that demonstrates positive failure when the constraint is breached.
