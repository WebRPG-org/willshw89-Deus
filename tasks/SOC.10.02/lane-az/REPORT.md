# SOC.10.02 lane-az REPORT

- **Task:** SOC.10.02 Faction Development Plan spec and JSON schema
- **Lane:** lane-az
- **Branch:** `task/lane-az`
- **Writer:** grok (grok-4.7). This report does not certify the task. Gemini reviews it.
- **Base:** `2755f61947610723723384ad39ad3fbc92d4679f` (origin/main at lane open)
- **Date:** 2026-09-27
- **No art** (DEC-007): no image or audio was generated, requested, edited, or integrated.

## 1. What changed

| Path | What it is |
|---|---|
| `docs/systems/DEUS_FactionPlans.md` | Spec. Six stages, prerequisites, four build orders, occupation mix on the SOC.10.01 axes plus obligation, craft and construction knowledge, architectural slots linked to the building-bible template and a DEC-013 band id, expansion, regression, and collapse. |
| `game/data/plans/faction_plan.schema.json` | JSON Schema draft 2020-12, `$id` `deus-faction-plan/1.0.0`. Closed objects. `NONE` is legal on `craft`, `civicOffice`, and `class`. |
| `game/data/plans/TEMPLATE.plan.json` | One structurally complete plan. Every cultural string, including `homeLayerBand`, is `OWNER_TODO`. |
| `tools/plans/validate_faction_plan.js` | Dependency-free CLI (Node `fs` and `path` only). Exit 0 on success, 1 on errors, 2 on usage. Schema walker plus 29 cross-record rules. |
| `tools/plans/test_faction_plan_schema.js` | Template passes. Each fixture fails, and passes when its named rule is disabled. |
| `tools/plans/fixtures/*.json` | 33 mutants, including the brief's five: missing stage, unknown prerequisite, bad band, occupation mix that does not sum, template lore filled with invented prose. |

No nine race plans (SOC.10.03). No plugin edits. No WBS edits. No gate-tool edits.

The template's population figures, distances, day counts, and shares are engineering baselines so the file validates. They are listed as open Owner questions in the spec §15 and below. The home-layer band on the template is `OWNER_TODO`. DEC-013's race-to-band assignment is not answered here.

## 2. Gate evidence

Commands are the three `gateTests` in `tasks/SOC.10.02/lane-az/lane.json`, run in the foreground from the worktree root on 2026-09-27. Node `v24.19.0`. Output below is the run taken immediately before this report was committed. These commands do not read `REPORT.md`.

```
$ node tools/plans/test_faction_plan_schema.js
PASS schema keywords are implemented
PASS template validates
PASS NONE is legal on craft, civicOffice, and class
PASS craft set has no SOLDIER id
PASS craft set is NONE plus the 34 person-spec crafts
PASS class set is NONE plus the 12 SRD classes
PASS DEC-013 band ids
PASS six stages in order
PASS obligation statuses
PASS template sentinels and DEC-013 geometry
PASS template population baseline
PASS template colonization distances
PASS camp carries the eight founder institutions
PASS every cultural leaf on the template is OWNER_TODO
PASS plan data has no art-generation prompt
PASS each stage adapts all four postures
PASS food collapse refuses treasury
PASS three collapse kinds
PASS mutant bad-band kills bandId (bad-band)
PASS mutant build-order-not-adapted kills posturesDiffer (build-order-not-adapted)
PASS mutant collapse-coverage kills collapseCoverage (collapse-coverage)
PASS mutant collapse-food kills collapseFood (collapse-food)
PASS mutant document-role kills documentRole (document-role)
PASS mutant expansion-distance kills expansionDistance (expansion-distance)
PASS mutant knowledge-closure kills knowledgeClosure (knowledge-closure)
PASS mutant knowledge-cycle kills knowledgeAcyclic (knowledge-cycle)
PASS mutant missing-stage kills stagesPresent (missing-stage)
PASS mutant mix-craft-locked kills mixCraftUnlocked (mix-craft-locked)
PASS mutant occupation-mix-sum kills occupationMixSum (occupation-mix-sum)
PASS mutant office-mix kills officeMixMatches (office-mix)
PASS mutant population-not-monotone kills populationMonotone (population-not-monotone)
PASS mutant priority-not-permutation kills buildOrderPermutation (priority-not-permutation)
PASS mutant priority-unbuilt kills priorityHasBuilding (priority-unbuilt)
PASS mutant regression-not-adjacent kills regressionAdjacent (regression-not-adjacent)
PASS mutant regression-threshold kills regressionThreshold (regression-threshold)
PASS mutant requirements-not-cumulative kills requirementsCumulative (requirements-not-cumulative)
PASS mutant role-headcount kills roleHeadcount (role-headcount)
PASS mutant role-not-unlocked kills roleCraftUnlocked (role-not-unlocked)
PASS mutant role-office kills roleOfficeInstituted (role-office)
PASS mutant schema-closed kills schema (schema)
PASS mutant soft-home-band kills softHomeBand (soft-home-band)
PASS mutant stage-buildings-unlocked kills stageBuildingsUnlocked (stage-buildings-unlocked)
PASS mutant stage-prerequisite-chain kills stagePrerequisiteChain (stage-prerequisite-chain)
PASS mutant stages-unordered kills stagesOrdered (stages-unordered)
PASS mutant template-band-assigned kills templateBand (template-band-assigned)
PASS mutant template-cultural-filled kills templateCultural (template-cultural-filled)
PASS mutant unknown-building kills prerequisitesResolve (unknown-prerequisite)
PASS mutant unknown-institution kills prerequisitesResolve (unknown-prerequisite)
PASS mutant unknown-knowledge kills prerequisitesResolve (unknown-prerequisite)
PASS mutant unknown-stage kills prerequisitesResolve (unknown-prerequisite)
PASS mutant unlock-coverage kills unlockCoverage (unlock-coverage)
PASS every rule has a killed mutant
PASS cli template exits 0
PASS cli usage exits 2
PASS cli mutant exits 1
55 passed, 0 failed
EXIT=0

$ node tools/plans/validate_faction_plan.js game/data/plans/TEMPLATE.plan.json
OK game/data/plans/TEMPLATE.plan.json
EXIT=0

$ node tools/check_deus_syntax.js
Checked 58 DEUS plugin files. Errors: 0
EXIT=0
```

## 3. Open Owner questions

Copied from the spec §15. This lane does not answer them.

1. Which race occupies which DEC-013 home-layer band? The template leaves `architecture.homeLayerBand` as `OWNER_TODO`.
2. Which of the 25 biomes sit in which band?
3. Are the numeric layer ends the PM default in DEC-013, or the different table on WG.62.02? The schema stores band ids only.
4. Are the template baselines the numbers you want (population 8 / 16 / 40 / 120 / 400 / 1200; colonization distances 0 / 0 / 48 / 192 / 768 / 3072 cells; separations 0 / 0 / 16 / 32 / 64 / 128; the day counts in `failure`; the `perMyriad` shares)?
5. When threat and famine both hold, which build order applies?
6. Can one person hold two Office entities? The person spec's founder example stacks two offices; SOC.10.01 stores one `civicOffice` field. The camp mix is one office each.
7. Should INV-SOC-07's list gain `ELITE_RETINUE`? The person spec and SOC.40.01 already name it. The schema includes it. The invariant file was not edited.
8. The person spec says a professional's craft is soldiering. There is no `SOLDIER` craft id. Should one be added?
9. How long is a plan settlement-day in world beats?
10. DEC-014 is open. Rebellion, epidemic, and succession numbers are not in this plan.
11. TECH_TREE.md node names are unapproved. This plan uses its own knowledge ids.
12. Which id strings are the nine races for SOC.10.03? The count is nine (DEC-013). V87 names eleven peoples. Race id is not an enum here.
13. The schema requires the four posture orders on a stage to differ. Say if two postures should be allowed to share an order.

## 4. Follow-ups

Proposals only. No new WBS ids. Existing rows are named where one already covers the work.

| Id | Proposal |
|---|---|
| PROPOSED-AZ-01 | Runtime that reads a plan and turns the active posture into build jobs (`docs/design/AUTONOMOUS_CIVILIZATION.md`), including which posture wins when two conditions hold. |
| PROPOSED-AZ-02 | Deep-history generation under the plan (V141). |
| PROPOSED-AZ-03 | Nine race plan files with cultural strings left `OWNER_TODO`. Existing row SOC.10.03. |
| PROPOSED-AZ-04 | Duty scheduler (existing SOC.13.01) reads the mix. Mobilization changes Current Duty, not the shares. |
| PROPOSED-AZ-05 | Workload office split (existing SOC.22.01, SOC.22.02) creates subordinate offices. The stage list only classifies. |
| PROPOSED-AZ-06 | After the Owner assigns bands, placement writes `architecture.homeLayerBand`. Existing row WG.62.02. |
| PROPOSED-AZ-07 | A faction Building tech runtime may map these knowledge ids. It does not rename them onto the TECH_TREE.md proposals. |
| PROPOSED-AZ-08 | Map the eight terrain classes onto world tiles. Biome-to-band assignment stays with the Owner. |
| PROPOSED-AZ-09 | Owner writes cultural strings and any per-race architectural bible. Bible section 6 stays out (DEC-007). |
| PROPOSED-AZ-10 | Person-record runtime for the three axes. Existing row SOC.10.01. |
| PROPOSED-AZ-11 | Define the settlement-day in world beats and drive the failure counters from that clock. |
