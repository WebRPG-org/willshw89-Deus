# SOC.10.03 independent Codex review v2

Date: 2026-09-27
Writer: Grok
Reviewed commit: cbaf4e6105b682ab208ba4d4423eab16a64281d3
Branch: task/lane-bh
Reviewer: Codex

## Commit identity and review isolation

The exact full writer hash exists as a commit. Before review, the source checkout and fetched remote branch were at 1aac953132438c3b8eb77633497818cf9e3aecfc. `git show -s --format='%H %P'` shows its sole parent is cbaf4e6105b682ab208ba4d4423eab16a64281d3. `git merge-base --is-ancestor cbaf4e6105b682ab208ba4d4423eab16a64281d3 origin/task/lane-bh` exited 0.

A fresh local clone was created with `git clone --no-hardlinks --no-checkout . C:/Users/snewt/AppData/Local/Temp/deus-bh-review-cbaf4e61-v2`, then checked out using `git checkout --detach cbaf4e6105b682ab208ba4d4423eab16a64281d3`. The clone-local tracking ref was deliberately pinned with `git update-ref refs/remotes/origin/task/lane-bh cbaf4e6105b682ab208ba4d4423eab16a64281d3`; this is a local snapshot ref, not a claim that the live remote reverted to the writer tip. Before reviewing:
```
$ git rev-parse HEAD origin/task/lane-bh
cbaf4e6105b682ab208ba4d4423eab16a64281d3
cbaf4e6105b682ab208ba4d4423eab16a64281d3
```

`git merge-base HEAD origin/main` returned ecc7b8984a0ab1a919595c792f98a60f18872f73. Fetching the real remote main in the source checkout produced origin/main 6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0 and the same merge base with the writer. The review excludes the previous review commit. That file is preserved.

## Scope table

The merge-base-to-writer diff contains 13 added paths. Every path matches lane.json allowedPaths; an independent assertion checked all 13. The writer commit itself adds 11 of these; BRIEF.md and lane.json were already in the lane-opening predecessor.

| Changed path | Allowed path match | Review result |
|---|---|---|
| game/data/plans/human.plan.json | exact | Read, parsed, full byte comparison passed |
| game/data/plans/elf.plan.json | exact | Read, parsed, full byte comparison passed |
| game/data/plans/halfling.plan.json | exact | Read, parsed, full byte comparison passed |
| game/data/plans/dwarf.plan.json | exact | Read, parsed, full byte comparison passed |
| game/data/plans/gnome.plan.json | exact | Read, parsed, full byte comparison passed |
| game/data/plans/dragonborn.plan.json | exact | Read, parsed, full byte comparison passed |
| game/data/plans/half-elf.plan.json | exact | Read, parsed, full byte comparison passed |
| game/data/plans/half-orc.plan.json | exact | Read, parsed, full byte comparison passed |
| game/data/plans/tiefling.plan.json | exact | Read, parsed, full byte comparison passed |
| tools/plans/test_race_plans.js | exact | Full source reviewed; conditions and failure exits inspected |
| tasks/SOC.10.03/lane-bh/BRIEF.md | tasks/SOC.10.03/** | Read; acceptance authority |
| tasks/SOC.10.03/lane-bh/lane.json | tasks/SOC.10.03/** | Read; all four gates rerun |
| tasks/SOC.10.03/lane-bh/REPORT.md | tasks/SOC.10.03/** | Read including all embedded evidence |

## Acceptance assessment

| Requirement | Evidence and assessment |
|---|---|
| Exactly nine specified race slots | Directory set gate passes, including missing/extra/swapped-name provocations. Exact slugs: human, elf, halfling, dwarf, gnome, dragonborn, half-elf, half-orc, tiefling. |
| Schema and semantic conformance | Each of the nine passes validatePlan and validator CLI through the race gate. Existing schema suite passes all 55 checks. |
| Template identity except documentRole/planId | Independent fs.readFileSync comparison of every complete race file against the template with just those two lines replaced passes. Each has 6 stages, 20 buildings and 30 knowledge nodes. All numeric values, roles, institutions, unlocks, priorities, mixes, expansion and failure data are therefore unchanged. |
| Race document identity | All documentRole values are racePlan; each planId equals its filename slug, is unique and is not TEMPLATE. Wrong-role and wrong-slug provocations are rejected. |
| Cultural OWNER_TODO fields | All 19 CULTURAL_PATHS plus architecture.homeLayerBand remain OWNER_TODO. Exported paths cover the four top-level cultural fields and every architecture.cultural leaf. Filled-lore and assigned-band provocations fail the lane check despite being legal race-plan schema values. |
| Provisional ids and Owner questions | REPORT §1 and §3 explicitly keep canonical race ids (§15 question 12) and home bands (question 1) open; baseline numbers (question 4) remain open. DEC-013 fixes nine races; DEC-015 reserves cultural choices to the Owner. No Owner decision was invented. |
| No added class or affinity data | Complete byte identity proves no added field or changed class mix. Added raceClassAffinity provocation is rejected by structural comparison. |
| Checks can fail | All required categories have conditional mutant assertions. Independent on-disk numeric drift made the actual race gate exit 1 (details below). No swallowed failure or hardcoded overall success was found. |
| Report/evidence/follow-ups | REPORT contains all nine validator outputs, all four gate outputs and exit codes, open questions and PROPOSED-BH-01 through -05. The task tree at the writer contains only BRIEF.md, lane.json and REPORT.md; no separate screenshot evidence exists. Rerun results agree with the embedded evidence. |
| Regressions and protected dependencies | Template, schema, validator and existing schema test have no diff against the merge base. Existing schema and plugin syntax gates pass. No runtime/plugin registration changes. |
| NO ART | Diff contains only plan JSON, test JavaScript and task Markdown/JSON. No art/image/audio asset, prompt field or generation integration added. No art was generated during this review. |
| Independent Gemini pass and DONE transition | External integration gate remains pending; this Codex review does not impersonate Gemini, mark DONE, merge, or certify Owner approval. |

## Gate evidence

Run in the fresh detached clone on 2026-09-27 using Node v24.19.0. Each command ran in the foreground, with EXIT captured immediately from $LASTEXITCODE. Raw output:
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
v24.19.0
```

The final `git status --short` in that run emitted no paths.

## Independent failure provocation

An inline Node script independently asserted the allowed-path set and read all nine complete files, comparing their bytes to TEMPLATE.plan.json with only the two permitted identity-line replacements. Output:
```
SCOPE: 13 / 13 allowed paths
human, elf, halfling, dwarf, gnome, dragonborn, half-elf, half-orc, tiefling:
each exact bytes except two identity lines; 6 stages, 20 buildings, 30 knowledge nodes
```

The same script saved the original human.plan.json bytes, temporarily set expansion.preferFreshWaterWithinCells to 26, and ran `node tools/plans/test_race_plans.js` through spawnSync. It restored the original bytes in finally. Raw failure lines and summary:
```
19 passed, 3 failed
FAIL structurally equal except documentRole and planId - human differs at /expansion/preferFreshWaterWithinCells
FAIL mutant documentRole template - role 1 struct differs at /expansion/preferFreshWaterWithinCells valid document-role /planId
FAIL mutant planId not the slug - slug check, structural check, and uniqueness disagreed
EXIT=1
```

The additional two failures occur because those mutant controls are cloned from the deliberately drifted human plan; the primary structural failure rejects the numeric drift. The wrapper asserted status 1 and the structural FAIL message, then exited 0. After restoration, `git status --short` was empty. No implementation fix was made.

## Findings ranked BLOCKER / MAJOR / MINOR

- BLOCKER: None found in the reviewed scope.
- MAJOR: None found in the reviewed scope.
- MINOR: None found in the reviewed scope.

## Limits and remaining gates

RMMZ editor F5, F8, save/load and screenshots were not checked in this session. This mechanical lane delivers structural data slots and an offline gate, with no runtime consumer or visual acceptance requirement; no claim of observed in-game behavior is made. Owner cultural authoring, canonical race ids and home-band assignments remain open as required. Independent Gemini integration sign-off and task closure remain pending.

VERDICT: CLEAN PASS

