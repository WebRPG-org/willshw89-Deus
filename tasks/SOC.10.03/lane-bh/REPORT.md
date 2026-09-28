# SOC.10.03 lane-bh REPORT

- **Task:** SOC.10.03 Nine Race Development Plan Data Slots
- **Lane:** lane-bh
- **Branch:** `task/lane-bh`
- **Writer:** grok (grok-4.7, mechanical, effort high). This report does not certify the task. Gemini reviews it.
- **Base:** `ecc7b8984a0ab1a919595c792f98a60f18872f73` (origin/main named in the brief). Lane open commit `9cd449a9886e497cd9df21f4c58f64ceda3ed536`.
- **Date:** 2026-09-27
- **No art** (DEC-007): no image or audio was generated, requested, edited, or integrated.

## 1. What changed

Nine race plans. Each file is the bytes of `game/data/plans/TEMPLATE.plan.json` with two lines replaced: `documentRole` is `racePlan`, and `planId` is the provisional PM slug. Stages, buildings, roles, institutions, unlocks, build orders, occupation mix (including the template class shares), knowledge graph, expansion, and failure values are the template values. No race-specific number was chosen. No class or race-class affinity field was added.

`raceId`, `displayName`, `lore`, `values`, every architecture-bible cultural string, and `architecture.homeLayerBand` are the sentinel `OWNER_TODO`.

Schema, template, and `tools/plans/validate_faction_plan.js` were read and left as they are.

| File | planId (provisional slug) | documentRole | raceId | homeLayerBand |
|---|---|---|---|---|
| `game/data/plans/human.plan.json` | `human` | `racePlan` | `OWNER_TODO` | `OWNER_TODO` |
| `game/data/plans/elf.plan.json` | `elf` | `racePlan` | `OWNER_TODO` | `OWNER_TODO` |
| `game/data/plans/halfling.plan.json` | `halfling` | `racePlan` | `OWNER_TODO` | `OWNER_TODO` |
| `game/data/plans/dwarf.plan.json` | `dwarf` | `racePlan` | `OWNER_TODO` | `OWNER_TODO` |
| `game/data/plans/gnome.plan.json` | `gnome` | `racePlan` | `OWNER_TODO` | `OWNER_TODO` |
| `game/data/plans/dragonborn.plan.json` | `dragonborn` | `racePlan` | `OWNER_TODO` | `OWNER_TODO` |
| `game/data/plans/half-elf.plan.json` | `half-elf` | `racePlan` | `OWNER_TODO` | `OWNER_TODO` |
| `game/data/plans/half-orc.plan.json` | `half-orc` | `racePlan` | `OWNER_TODO` | `OWNER_TODO` |
| `game/data/plans/tiefling.plan.json` | `tiefling` | `racePlan` | `OWNER_TODO` | `OWNER_TODO` |
| `tools/plans/test_race_plans.js` | Gate. See §2. | | | |

DEUS_FactionPlans.md §15 question 12 (the canonical race id strings) stays open for the Owner. The `planId` strings above are the provisional file slugs from this brief. They are not a ruling on that question. `raceId` is `OWNER_TODO` on every file.

`tools/plans/test_race_plans.js` checks:

- (a) the directory's `*.plan.json` set, aside from `TEMPLATE.plan.json`, is exactly these nine names. Mutants: missing `gnome.plan.json`, extra `goblin.plan.json`, gnome swapped for goblin (same count, different set).
- (b) each file passes `validatePlan` and the validator CLI exits 0. Mutant: hamlet `populationMin` 17 (template regression threshold stays 16) fails validation, in process and as a CLI exit 1.
- (c) each file is structurally equal to the template once `documentRole` and `planId` are set aside. Mutants: `preferFreshWaterWithinCells` 26 (validator still accepts it; cultural sentinel check does not treat it as culture), and an added `raceClassAffinity` key.
- (d) every cultural path exported by the validator, plus `architecture.homeLayerBand`, is `OWNER_TODO`. Mutants: `lore` set to a filled string, and `homeLayerBand` set to `surface`. Both are legal on a race plan under the current validator; this gate rejects them.
- (e) `planId` values are unique and none is `TEMPLATE`. Mutants: a duplicated id, and a `TEMPLATE` id. A separate check requires `planId` to equal the file slug (mutant `mankind`) and `documentRole` to be `racePlan` (mutant `template`).

Provocation documents are built in memory (and one temp file for the CLI exit). Fixture JSON under `tools/plans/fixtures/` belongs to SOC.10.02 and was not edited.

## 2. Gate evidence

Commands are the four `gateTests` in `tasks/SOC.10.03/lane-bh/lane.json`, plus one validator run per race file. Run in the foreground from the worktree root on 2026-09-27. Node `v24.19.0`. Output below is the run taken immediately before this report was committed. These commands do not read `REPORT.md`.

A byte compare in the same run found each race file identical to `TEMPLATE.plan.json` except the `documentRole` line and the `planId` line.

```
$ node tools/plans/test_race_plans.js
PASS exactly the nine race plans
PASS mutant missing gnome.plan.json
PASS mutant extra goblin.plan.json
PASS mutant swapped gnome for goblin
PASS each documentRole is racePlan
PASS each planId is its provisional slug
PASS each race plan validates
PASS structurally equal except documentRole and planId
PASS cultural fields and homeLayerBand are OWNER_TODO
PASS planIds are unique and none is TEMPLATE
PASS cli each race plan exits 0
PASS documentRole and planId may differ from the template
PASS mutant documentRole template
PASS mutant planId not the slug
PASS mutant changed populationMin fails validation
PASS mutant changed preferFreshWaterWithinCells
PASS mutant added raceClassAffinity
PASS mutant filled cultural string
PASS mutant homeLayerBand assigned
PASS mutant duplicate planId
PASS mutant planId TEMPLATE
PASS mutant cli exits 1
22 passed, 0 failed
EXIT=0

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
Checked 60 DEUS plugin files. Errors: 0
EXIT=0

$ node tools/plans/validate_faction_plan.js game/data/plans/human.plan.json
OK game/data/plans/human.plan.json
EXIT=0

$ node tools/plans/validate_faction_plan.js game/data/plans/elf.plan.json
OK game/data/plans/elf.plan.json
EXIT=0

$ node tools/plans/validate_faction_plan.js game/data/plans/halfling.plan.json
OK game/data/plans/halfling.plan.json
EXIT=0

$ node tools/plans/validate_faction_plan.js game/data/plans/dwarf.plan.json
OK game/data/plans/dwarf.plan.json
EXIT=0

$ node tools/plans/validate_faction_plan.js game/data/plans/gnome.plan.json
OK game/data/plans/gnome.plan.json
EXIT=0

$ node tools/plans/validate_faction_plan.js game/data/plans/dragonborn.plan.json
OK game/data/plans/dragonborn.plan.json
EXIT=0

$ node tools/plans/validate_faction_plan.js game/data/plans/half-elf.plan.json
OK game/data/plans/half-elf.plan.json
EXIT=0

$ node tools/plans/validate_faction_plan.js game/data/plans/half-orc.plan.json
OK game/data/plans/half-orc.plan.json
EXIT=0

$ node tools/plans/validate_faction_plan.js game/data/plans/tiefling.plan.json
OK game/data/plans/tiefling.plan.json
EXIT=0
```

## 3. Open Owner questions

This lane does not answer these. The other questions in DEUS_FactionPlans.md §15 stay open as written there.

1. Which race occupies which DEC-013 home-layer band? DEC-013 item 5 fixes the count at nine races and leaves the race-to-home-layer-range mapping `OPEN`. Every race file leaves `architecture.homeLayerBand` as `OWNER_TODO`.
4. Are the template baselines the numbers you want: population 8 / 16 / 40 / 120 / 400 / 1200; colonization distances 0 / 0 / 48 / 192 / 768 / 3072 cells; separations 0 / 0 / 16 / 32 / 64 / 128 cells; regression at 30 days; food collapse at 14 days; population collapse below 2 for 10 days; vacant offices for 60 days; and the `perMyriad` shares in the template? These nine files copy those baselines. A race-specific number was not chosen.
12. Which id strings are the nine races for SOC.10.03? DEC-013 fixes the count. V87 names eleven peoples. The schema does not enum race ids. **This question stays open.** The nine `planId` values are the provisional PM slugs listed in §1. `raceId` remains `OWNER_TODO`.

DEC-015 item 4 stands: race-specific cultural lore, names, and values remain Owner-authored. Those strings are `OWNER_TODO` here.

## 4. Follow-ups

Proposals only. No new WBS ids.

| Id | Proposal |
|---|---|
| PROPOSED-BH-01 | When the Owner answers §15 question 12, write each `raceId`. If the canonical id differs from the provisional slug, rename `planId` and the file. |
| PROPOSED-BH-02 | When the Owner answers §15 question 1, write `architecture.homeLayerBand`. Related: PROPOSED-AZ-06 and existing row WG.62.02. |
| PROPOSED-BH-03 | Owner replaces `displayName`, `lore`, `values`, and the architecture-bible text fields. Related: PROPOSED-AZ-09. Bible section 6 stays out (DEC-007). |
| PROPOSED-BH-04 | Per-race replacement of the copied baseline numbers waits on §15 question 4. |
| PROPOSED-BH-05 | Race-class affinity stays out of these files until the separate Owner affinity table is recorded and a schema task adds a field for it. The plan schema is closed; an extra affinity key fails validation. |
