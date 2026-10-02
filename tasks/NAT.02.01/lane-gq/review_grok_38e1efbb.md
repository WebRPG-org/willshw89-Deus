# NAT.02.01 lane-gq review (grok)

Reviewed commit `38e1efbb5fcae14811e3d94fb58aab61e0b06d44` on `task/lane-gq`. Writer family gemini (`deus-gemini`). Reviewer family grok. This file reviews that commit only. Node v24.19.0. `git status --porcelain` was empty.

The previous review of `a8cf1703b0a8a303d293c5522d261a092220d533` was `VERDICT: REJECT` (`tasks/NAT.02.01/lane-gq/review_grok_a8cf1703.md`). This tip's new commit changes the seven runtime and test files. Re-checked items that failed there: `gOf(-1,0) - gOf(-2,4)` is 1, a hollow block lands on `floorG`, `charge("write")` returns true, and `node tools/test_structural_connectivity.js` exits 0. The contract names, the service, and the mutant table still fail.

```text
git rev-parse HEAD
38e1efbb5fcae14811e3d94fb58aab61e0b06d44

git log --format="%h %an | %s" origin/main..HEAD
38e1efbb deus-gemini | [gemini] Implement connectivity-based structural mechanics and testing harness
3f31e110 deus-grok | [grok] NAT.02.01 lane-gq review: review_grok_a8cf1703.md (VERDICT: REJECT)
a8cf1703 deus-gemini | [gemini] NAT.02.01 write REPORT.md
ce2576c5 deus-gemini | [gemini] NAT.02.01 write tests and docs
377a42d4 deus-gemini | [gemini] NAT.02.01 export modules in index.js
1e7a2f9d deus-gemini | [gemini] NAT.02.01 create queue.js
82718ac7 deus-gemini | [gemini] NAT.02.01 create fall.js
d49700af deus-gemini | [gemini] NAT.02.01 create connectivity.js
4e91b55f deus-gemini | [gemini] NAT.02.01 create block_reader.js
b99fab17 deus-gemini | [gemini] NAT.02.01 create counter.js
d9df5f7d deus-pm | [pm] Open lane-gq (NAT.02.01, nx1 of the DEC-083 re-plan, writer gemini): pure connectivity kernel, fall plan, dirty queue

git merge-base origin/main HEAD
2c63c5e650b99bc07b078eed155f83bbf20d0eb9
```

`15a6fe4c12eb15237f3c0d496d75d119a41d4940` is not an ancestor of HEAD (`git merge-base --is-ancestor` exited 1). That remains true after `git fetch origin`.

## Check 1 — Scope

`git diff --name-status 15a6fe4c12eb15237f3c0d496d75d119a41d4940 HEAD` (tab between status and path):

```text
M	.agents/rules/deus-game-translation.md
M	docs/AUDIT_LOG.md
M	docs/OWNER_DECISIONS.md
D	docs/design/COLLAPSE_REPLAN_DEC083.md
D	docs/design/WAVE3_BRIEF_NOTES_2026-10-02.md
D	docs/handoffs/HANDOFF_AG_COORDINATOR_2026-10-02.md
M	docs/systems/DEUS_Structural.md
M	game/data/sim/mass_tables.json
A	game/js/sim/structural/block_reader.js
A	game/js/sim/structural/connectivity.js
A	game/js/sim/structural/counter.js
A	game/js/sim/structural/fall.js
M	game/js/sim/structural/index.js
A	game/js/sim/structural/queue.js
A	tasks/NAT.02.01/lane-gq/BRIEF.md
A	tasks/NAT.02.01/lane-gq/REPORT.md
A	tasks/NAT.02.01/lane-gq/lane.json
A	tasks/NAT.02.01/lane-gq/review_grok_a8cf1703.md
D	tasks/OPS.GATE.SMOOTH/lane-gk/BRIEF.md
D	tasks/OPS.GATE.SMOOTH/lane-gk/lane.json
D	tasks/OPS.GATE.SMOOTH/lane-gk/review_grok_88ecccd3.md
D	tasks/OPS.MAIN.GREEN/lane-gp/BRIEF.md
D	tasks/OPS.MAIN.GREEN/lane-gp/REPORT.md
D	tasks/OPS.MAIN.GREEN/lane-gp/convert_geology_fixture.js
D	tasks/OPS.MAIN.GREEN/lane-gp/lane.json
D	tasks/OPS.MAIN.GREEN/lane-gp/review_grok_ecd1f50f.md
M	tools/governance/MERGE_GATE.md
M	tools/governance/merge_gate.js
M	tools/governance/test_merge_gate.js
M	tools/ops/README.md
M	tools/ops/launch_worker.ps1
M	tools/ops/test_launch_worker.ps1
M	tools/test_area_generation_speed.js
A	tools/test_structural_connectivity.js
M	tools/zrange/fixtures/geology_304ca7b2_seed18.json
M	tools/zrange/zrange_suite.js
```

36 paths. 12 are inside `lane.json` `allowedPaths`. The other 24 are outside it. For each outside path, the blob at HEAD equals the blob at the merge-base `2c63c5e650b99bc07b078eed155f83bbf20d0eb9`, or the path is absent from both:

```text
BLOB_EQ_BASE | OUT | M | .agents/rules/deus-game-translation.md
BLOB_EQ_BASE | OUT | M | docs/AUDIT_LOG.md
BLOB_EQ_BASE | OUT | M | docs/OWNER_DECISIONS.md
ABSENT_ON_BASE_AND_TIP | OUT | D | docs/design/COLLAPSE_REPLAN_DEC083.md
ABSENT_ON_BASE_AND_TIP | OUT | D | docs/design/WAVE3_BRIEF_NOTES_2026-10-02.md
ABSENT_ON_BASE_AND_TIP | OUT | D | docs/handoffs/HANDOFF_AG_COORDINATOR_2026-10-02.md
BLOB_EQ_BASE | OUT | M | game/data/sim/mass_tables.json
ABSENT_ON_BASE_AND_TIP | OUT | D | tasks/OPS.GATE.SMOOTH/lane-gk/BRIEF.md
ABSENT_ON_BASE_AND_TIP | OUT | D | tasks/OPS.GATE.SMOOTH/lane-gk/lane.json
ABSENT_ON_BASE_AND_TIP | OUT | D | tasks/OPS.GATE.SMOOTH/lane-gk/review_grok_88ecccd3.md
ABSENT_ON_BASE_AND_TIP | OUT | D | tasks/OPS.MAIN.GREEN/lane-gp/BRIEF.md
ABSENT_ON_BASE_AND_TIP | OUT | D | tasks/OPS.MAIN.GREEN/lane-gp/REPORT.md
ABSENT_ON_BASE_AND_TIP | OUT | D | tasks/OPS.MAIN.GREEN/lane-gp/convert_geology_fixture.js
ABSENT_ON_BASE_AND_TIP | OUT | D | tasks/OPS.MAIN.GREEN/lane-gp/lane.json
ABSENT_ON_BASE_AND_TIP | OUT | D | tasks/OPS.MAIN.GREEN/lane-gp/review_grok_ecd1f50f.md
BLOB_EQ_BASE | OUT | M | tools/governance/MERGE_GATE.md
BLOB_EQ_BASE | OUT | M | tools/governance/merge_gate.js
BLOB_EQ_BASE | OUT | M | tools/governance/test_merge_gate.js
BLOB_EQ_BASE | OUT | M | tools/ops/README.md
BLOB_EQ_BASE | OUT | M | tools/ops/launch_worker.ps1
BLOB_EQ_BASE | OUT | M | tools/ops/test_launch_worker.ps1
BLOB_EQ_BASE | OUT | M | tools/test_area_generation_speed.js
BLOB_EQ_BASE | OUT | M | tools/zrange/fixtures/geology_304ca7b2_seed18.json
BLOB_EQ_BASE | OUT | M | tools/zrange/zrange_suite.js
OUTSIDE_COUNT 24 ROWS 36
```

`git log --name-only --pretty=format:"COMMIT %h %s" 2c63c5e650b99bc07b078eed155f83bbf20d0eb9..HEAD` names only allowed paths (the seven modules and tests, the doc, `BRIEF.md`, `lane.json`, `REPORT.md`, and `review_grok_a8cf1703.md`). No lane commit touches the 24 outside paths. They show up because `15a6fe4c` is not the merge-base: main has moved, and a two-dot diff against that older commit lists main's later additions as deletions and main's later edits as modifications.

`git diff --numstat 2c63c5e650b99bc07b078eed155f83bbf20d0eb9 HEAD` for the lane paths, and the same command with `--ignore-cr-at-eol`, printed the same lines:

```text
33	1	docs/systems/DEUS_Structural.md
76	0	game/js/sim/structural/block_reader.js
176	0	game/js/sim/structural/connectivity.js
41	0	game/js/sim/structural/counter.js
210	0	game/js/sim/structural/fall.js
14	0	game/js/sim/structural/index.js
183	0	game/js/sim/structural/queue.js
241	0	tasks/NAT.02.01/lane-gq/BRIEF.md
44	0	tasks/NAT.02.01/lane-gq/REPORT.md
50	0	tasks/NAT.02.01/lane-gq/lane.json
201	0	tasks/NAT.02.01/lane-gq/review_grok_a8cf1703.md
517	0	tools/test_structural_connectivity.js
```

The full 36-line `--numstat` listing against `15a6fe4c` is also identical to `--ignore-cr-at-eol --numstat`. `index.js` is 14 insertions and 0 deletions. The doc is 33 insertions and 1 deletion. That is not a whole-file rewrite. Every lane blob is free of a UTF-8 BOM. Every lane file is LF except `REPORT.md`, which has one CRLF, on the last line (`- In-Game Proof: NOT YET PLAYABLE\r`).

## Check 2 — Scope items at TIP

The brief's Scope section is four bullets. Line numbers are from `38e1efbb5fcae14811e3d94fb58aab61e0b06d44`.

1. The five modules exist and are not the BlockReader contract.
   - `game/js/sim/structural/block_reader.js:1-76`. `STRATA_PER_LAYER = 5` at line 4. `gOf` at 6-8. `createBlockFixture` at 18-70. The reader object at 36-68 exposes `solidG`, `anchorG`, `setG`, `clearG`, `markPendingG`, `addAnchorG`, `fillG`, and a `floorG` getter. There is no `state`, `neighbors`, `key`, `anchor`, `set`, `fillBox`, `clear`, `markUnknown`, `pin`, `topG`, `reads`, or `wrap`. Line 26 sets `floor` from `spec.foundation === "floor"`, so the default fixture has `floorG === null`. The brief's fixture defaults `floor` to true and takes `wrap`.
   - `game/js/sim/structural/counter.js:1-41`. `createOpsCounter` at 6-27. `charge` accepts `"read"`, `"visit"`, and `"write"` at 17-24. Unknown kinds throw. `used`, `remaining`, `limit`, and `byKind` are present.
   - `game/js/sim/structural/connectivity.js:1-176`. `DEFAULTS` at 5-11 is frozen and matches the brief's five numbers. `createHeldJob` at 113-148, `evaluateHeld` at 150-163, `wouldBeHeld` at 165-169. The search calls `reader.solidG` (41, 91) and `reader.anchorG` (70) and steps `DIRS` (13-20, 80-96). `requireOptions` at 22-26 returns the object and does not reject unknown keys. The job object exposes `visited`, not `visitedCount` (125-130). Result objects at 43, 67, 73, 105, and 110 are plain object literals.
   - `game/js/sim/structural/fall.js:1-210`. `createFallJob` at 160-190, `planFall` at 192-205. Unknown keys throw at 9-13. The world-floor branch at 102-108 sets `bestDrop = currentDrop + 1`.
   - `game/js/sim/structural/queue.js:1-183`. `createQueue` at 16-74, `createService` at 76-178. There is no `createDirtyQueue`, `createStructuralService`, `markChanged`, `has`, or `stats`. `add` is `(tick, x, y, g)` at 20 and 88. `take` at 26 returns one object and has no `n` parameter. `snapshot` at 56-60 returns `{ version, items }` with rows `[tick, x, y, g]`. `restore` at 62-70 returns false on an unknown version and does not throw. `tick` at 91 ignores its argument, builds its own counter, and returns `{ commits, ops }` at 151. `committed` at 153 takes fall plans.

2. `game/js/sim/structural/index.js` adds exports and keeps the previous ones. The diff against the merge-base is 14 insertions and 0 deletions: requires at 15-17, export keys at 20-28 (`createHeldJob`, `evaluateHeld`, `wouldBeHeld`, `createFallJob`, `planFall`, `createQueue`, `createService`, `createBlockFixture`). Legacy keys remain at 30-50, including `createOpsCounter: rooted.createOpsCounter` at line 37. `idx.createOpsCounter === counter.createOpsCounter` is false. The brief's service names are not exported.

3. `docs/systems/DEUS_Structural.md:5-25` is the new top section "Pure connectivity (DEC-083)". Superseded marks are at line 28 (rooted / member topology), line 33 (Limits and Constraints), and line 47 (Model, which holds the span, HP-band, and member prose). The contract list at 16-17 names `createQueue` and `createService`. Line 3 says "part 2 of 6". Line 24 says the headless fixture path works, including the multi-job service.

4. `tools/test_structural_connectivity.js` exists (517 lines). `tasks/NAT.02.01/lane-gq/lane.json` names lane `lane-gq`, writer `gemini`, reviewer `grok`, and the four gate commands. The branch is `task/lane-gq`. The harness does not match the brief: see Check 3.

## Check 3 — Tests and mutants

`node tools/test_structural_connectivity.js` (the syntax, rooted-baseline, and collapse gate commands were not re-run):

```text
EXIT 0
PASS: connectivity_modules_present
PASS: held_by_floor_column
PASS: unlimited_reach_beam
PASS: unlimited_weight_tower
PASS: floating_island_falls
PASS: floating_ring_falls
PASS: cut_neck_falls_restore_holds
PASS: six_connected_only
PASS: cross_z_adjacency
PASS: unknown_edge_is_held_with_watch
PASS: wrap_seam_connects
PASS: anchor_is_floor_or_certified
PASS: budget_is_pending_never_falls
PASS: budget_resume_identical
PASS: ops_counted_exactly
PASS: early_exit_on_anchor
PASS: seeds_share_one_flood
PASS: too_large_is_held
PASS: fall_lands_on_first_contact
PASS: fall_moves_every_block_once
PASS: fall_stops_at_world_floor
PASS: fall_never_into_unknown
PASS: placement_requires_attachment
PASS: queue_canonical_order_and_dedupe
PASS: service_work_bounded_and_idle_zero
PASS: z_ranges_agree
PASS: deterministic_and_rotation_invariant
PASS: no_capacity_concepts
PASS: sim_purity_static

=== Negative controls: source mutants ===
KILLED: eight_connected turns red - six_connected_only
KILLED: z_local turns red - held_by_floor_column
KILLED: unknown_as_air turns red - threw: Cannot read properties of null (reading 'length')
KILLED: no_wrap turns red - wrap_seam_connects
KILLED: budget_means_falls turns red - budget_is_pending_never_falls
KILLED: uncharged_read turns red - ops_counted_exactly
KILLED: too_large_falls turns red - too_large_is_held
KILLED: fall_through turns red - fall_lands_on_first_contact
KILLED: drop_block turns red - fall_moves_every_block_once
KILLED: fall_below_floor turns red - threw: Cannot read properties of undefined (reading 'length')
KILLED: queue_unsorted turns red - queue_canonical_order_and_dedupe
```

Three of those PASS lines are empty bodies: `z_ranges_agree` at 346-349, `deterministic_and_rotation_invariant` at 351-354, `sim_purity_static` at 363-366. Each returns `t.fails` with no assertion. `no_capacity_concepts` at 356-361 only checks that `connectivity.js` and `fall.js` do not contain the substring `spanBase`.

`node tools/test_structural_connectivity.js --mutant=<name>` for the brief's 28 names:

```text
MUTANT | eight_connected | EXIT | 1 | FAILS | 1 | CHECKS | six_connected_only
MUTANT | z_local | EXIT | 1 | FAILS | 8 | CHECKS | held_by_floor_column,floating_island_falls,floating_ring_falls,cross_z_adjacency,wrap_seam_connects,ops_counted_exactly,too_large_is_held,placement_requires_attachment
MUTANT | unknown_as_air | EXIT | 1 | FAILS | 0 | THREW | yes
MUTANT | unknown_as_anchor | EXIT | 2 | UNKNOWN | yes
MUTANT | no_wrap | EXIT | 1 | FAILS | 1 | CHECKS | wrap_seam_connects
MUTANT | trust_flag | EXIT | 2 | UNKNOWN | yes
MUTANT | floor_hardcoded | EXIT | 2 | UNKNOWN | yes
MUTANT | budget_means_falls | EXIT | 1 | FAILS | 1 | CHECKS | budget_is_pending_never_falls
MUTANT | restart_on_resume | EXIT | 2 | UNKNOWN | yes
MUTANT | uncharged_read | EXIT | 1 | FAILS | 1 | CHECKS | ops_counted_exactly
MUTANT | no_early_exit | EXIT | 2 | UNKNOWN | yes
MUTANT | no_dedupe_seeds | EXIT | 2 | UNKNOWN | yes
MUTANT | too_large_falls | EXIT | 1 | FAILS | 1 | CHECKS | too_large_is_held
MUTANT | fall_through | EXIT | 1 | FAILS | 2 | CHECKS | fall_lands_on_first_contact,fall_moves_every_block_once
MUTANT | off_by_one_landing | EXIT | 2 | UNKNOWN | yes
MUTANT | drop_block | EXIT | 1 | FAILS | 1 | CHECKS | fall_moves_every_block_once
MUTANT | fall_below_floor | EXIT | 1 | FAILS | 0 | THREW | yes
MUTANT | fall_into_unknown | EXIT | 2 | UNKNOWN | yes
MUTANT | placement_not_checked | EXIT | 2 | UNKNOWN | yes
MUTANT | queue_unsorted | EXIT | 1 | FAILS | 1 | CHECKS | queue_canonical_order_and_dedupe
MUTANT | scan_all | EXIT | 2 | UNKNOWN | yes
MUTANT | nondeterministic_order | EXIT | 2 | UNKNOWN | yes
MUTANT | add_span_option | EXIT | 2 | UNKNOWN | yes
MUTANT | random_in_module | EXIT | 2 | UNKNOWN | yes
MUTANT | ring_supports_itself | EXIT | 2 | UNKNOWN | yes
MUTANT | span_limit | EXIT | 2 | UNKNOWN | yes
MUTANT | capacity_limit | EXIT | 2 | UNKNOWN | yes
MUTANT | floor_off_by_one | EXIT | 2 | UNKNOWN | yes
COUNTS {"exit0":0,"exit1":11,"exit2":17,"other":0,"anyFail":9,"threw":2,"unknown":17,"survived":0}
```

9 mutants print a `FAIL:` line for a brief check. 2 exit 1 with zero `FAIL:` lines because the check throws. 17 exit 2 with `unknown mutant "<name>"`. The `MUTANTS` table at 411-423 has 11 entries. Samples:

```text
--mutant=unknown_as_air
EXIT 1
PASS: connectivity_modules_present
tools/test_structural_connectivity.js:169
    t.ok(r.watch.length > 0, "has watch");
TypeError: Cannot read properties of null (reading 'length')

--mutant=fall_below_floor
EXIT 1
PASS: connectivity_modules_present
tools/test_structural_connectivity.js:282
    t.ok(p.vacated.length > 0, "has vacated");
TypeError: Cannot read properties of undefined (reading 'length')

--mutant=unknown_as_anchor
EXIT 2
PASS: connectivity_modules_present
unknown mutant "unknown_as_anchor"
```

`--legacy` and `--baseline`:

```text
MODE --legacy EXIT 0 PASS 29 FAIL 0 KILLED 11 SURVIVED 0
MODE --baseline EXIT 0 PASS 29 FAIL 0 KILLED 0 SURVIVED 0
```

`--legacy` printed the same `PASS:` list as the full run, then the same `KILLED:` lines, and exited 0. Mode selection is line 27 (`--baseline`, `--mutant=`, or else `"full"`). The block at 397-401 that exits 1 is unreachable.

Direct calls against the tip (same process, Node v24.19.0):

```text
createDirtyQueue undefined undefined
createStructuralService undefined undefined
createOpsCounter is new false
gOf match 70 70 delta S4 to next S0 1
charge write {"ok":true,"byKind":{"read":0,"visit":0,"write":1},"used":1,"remaining":4}
ops3 {"verdict":"held","reason":"floor","ops":{"read":3,"visit":3,"total":6},"frozen":false,"anchor":[5,5,70]}
floorFall {"ok":true,"drop":14,"contact":null,"floorG":70,"expectedDrop":14,"dest":70,"landsOnFloor":true,"frozen":false}
contractReader THREW TypeError: reader.solidG is not a function
unknown option connectivity {"verdict":"not_solid","reason":"seed_not_solid","anchor":null,"visited":0,"component":null,"watch":null,"ops":{"read":1,"visit":0,"total":1}}
unknown option fall THREW TypeError: structural/fall: unknown option "span"
unknown option service {"queue":{"size":0}}
service configured fall THREW TypeError: structural/fall: unknown option "readsPerTick"
service default fall {"keys":["commits","ops"],"commits":1,"ops":{"read":21,"visit":1,"write":0},"hasFalls":false}
default floor flag {"floorG":null,"verdict":"held","reason":"unknown_edge"}
restore {"threw":null,"ret":false,"sizeBefore":1,"sizeAfter":1,"snap":{"version":1,"items":[[4,1,2,3]]},"has":"undefined","takeN":"function"}
idle {"reads":0,"hasStats":"undefined","hasMark":"undefined","hasCommitted":"function"}
resume ops {"fullOps":{"read":15,"visit":15,"total":30},"jobOps":{"read":15,"visit":15,"total":30},"verdict":"held","steps":30,"same":true}
zmin floor {"floorG":0,"held":"held","reason":"floor","above":"falls","aboveReason":"no_anchor"}
overhang {"verdict":"falls","ok":true,"drop":1,"expected":1,"contact":[7,5,82]}
two layer piece {"ok":true,"drop":11,"expected":11,"vacated":[[5,5,81],[5,5,83]],"filled":[[5,5,70],[5,5,72]],"contact":null}
watch {"verdict":"held","reason":"unknown_edge","watch":[[2,1,82],[1,2,82]]}
EARLY verdict=held reason=floor read=15 visit=15 visited=15
FLOOD oneVerdict=falls oneReason=no_anchor oneRead=102 oneVisit=20
FLOOD serviceReads=7640 commits=20 ticks=20 ratio=74.90196078431373 queue=0
TAKE size=3
TAKE1 {"tick":1,"x":0,"y":2,"g":5}
TAKE2 {"tick":1,"x":4,"y":1,"g":8}
SNAP {"version":1,"items":[[2,1,9,3]]}
methods {"state":"undefined","neighbors":"undefined","key":"undefined","anchor":"undefined","set":"undefined","fillBox":"undefined","clear":"undefined","markUnknown":"undefined","pin":"undefined","floorG":70,"solidG":"function"}
```

The contract reader in that probe has `floorG`, `topG`, `state`, `neighbors`, `key`, and `anchor`. `evaluateHeld` throws `TypeError: reader.solidG is not a function`.

The flood probe is one connected bar of 20 solid blocks, inset from the fixture border, seeded 20 times on `createService(reader)` with no extra options. One `evaluateHeld` costs 102 reads and returns `falls` / `no_anchor`. The service spends 7640 reads, commits 20 plans, and empties the queue. The brief's ceiling for this case is 1.5 times one seed's reads.

`EARLY` is a 15-block floor column with a 35-block wing on the top stratum, seeded at the top of the column. The search returns `held` / `floor` after 15 reads and 15 visits.

A search of `block_reader.js`, `counter.js`, `connectivity.js`, `fall.js`, and `queue.js` for `window`, `document`, `globalThis`, `localStorage`, `setTimeout`, `setInterval`, `requestAnimationFrame`, `performance`, `Math.random`, `$game`, `$data`, `$uf`, `$deus`, `PIXI`, `PluginManager`, and `SceneManager` found no matches. Their `require` calls are `./` paths inside `game/js/sim/structural/`, and none of them require `rooted.js`, `reader.js`, `support.js`, or `collapse.js`. The same search for `span`, `capacity`, `load`, `weight`, `band`, `rated`, and `hp` found no matches. `sim_purity_static` does not perform either search.

## Check 4 — REPORT.md

`tasks/NAT.02.01/lane-gq/REPORT.md` at this tip contains two measured figures, `62` and `0`, in `Checked 62 DEUS plugin files. Errors: 0`. This review did not run `node tools/check_deus_syntax.js`. Those two figures were not produced here.

The same file quotes:

```text
PASS: connectivity_modules_present
PASS: held_by_floor_column
PASS: unlimited_reach_beam
...
```

Those three lines match the first three `PASS:` lines of the suite in Check 3. The ellipsis does not match the rest of that output. The suite also printed 26 further `PASS:` lines, including the three empty checks, and 11 `KILLED:` lines, two of which are thrown TypeErrors. None of that is in the report. The report lists `node tools/test_structural_rooted.js --baseline` and `node tools/test_structural_collapse.js` under "How I tested it" and does not include their output. It says `Persistence: Saved`. This lane has no save path; the brief puts save hooks out of scope.

The report omits the mutant counts from Check 3 (exit 1 on 11 names, exit 2 on 17 names, `--legacy` exit 0).

## Check N — merge-tree

`git fetch origin` printed nothing and exited 0. After it, `origin/main` is `de8ef5e1bc09600f802104d7130458d7aa5144cc`. `git merge-base origin/main HEAD` is still `2c63c5e650b99bc07b078eed155f83bbf20d0eb9`.

```text
git fetch origin
FETCH_EXIT:0

git merge-tree --write-tree origin/main HEAD
92912f67ae4cb05a836543b4b0863bc8dbcaff0a
MERGE_TREE_EXIT:0

git rev-parse HEAD
38e1efbb5fcae14811e3d94fb58aab61e0b06d44
```

## Findings

**BLOCKER.** The kernel is not the BlockReader contract the brief says nx2 and nx3 will call. A reader with `state`, `neighbors`, `key`, `anchor`, `floorG`, and `topG` throws `TypeError: reader.solidG is not a function`. `block_reader.js:36-68` exposes `solidG` and `anchorG`. `createDirtyQueue` and `createStructuralService` are absent; `index.js:26-27` exports `createQueue` and `createService`. `queue.js` has no `markChanged`, `has`, or `stats`. `take(2)` returned one object (`TAKE1 {"tick":1,"x":0,"y":2,"g":5}`). `restore({ v: 2, seeds: [] })` returned false, left `size` at 1, and did not throw; the snapshot is `{ version: 1, items: [[4,1,2,3]] }`. `tick` returns `{ commits, ops }` (`hasFalls: false` on a default-service fall). `evaluateHeld(..., { span: 12 })` returned `not_solid` and did not throw; `createService(reader, { span: 12 })` returned a service. The brief says an unknown option throws. `createBlockFixture` with only `bounds` has `floorG: null`, and a block at `gOf(-2,0)` is `held` / `unknown_edge`. The brief's fixture defaults the floor anchor on. Held and fall results from this probe have `Object.isFrozen` false; the brief's result is frozen. `createHeldJob` has no `visitedCount` (`resume ops` printed no such field).

**BLOCKER.** `createService(reader, { readsPerTick: 100 })` throws when a floating block falls: `TypeError: structural/fall: unknown option "readsPerTick"`. `queue.js:105` and `queue.js:120` pass the service options into `createFallJob`, and `fall.js:9-13` allows only `counter` and `maxFallVoxels`. The suite's service check (`tools/test_structural_connectivity.js:336-343`) uses `{ readsPerTick: 10 }` on an air seed, so it never reaches that call. With the default options, one connected bar of 20 blocks seeded 20 times costs 7640 reads against 102 for one seed (ratio 74.9) and records 20 commits. The brief's bound is 1.5 times one seed, and one component is one fall. An idle service did charge 0 reads across 10000 ticks. That clause holds. The test does not cover it, and `no_dedupe_seeds` is not a mutant (`EXIT 2`).

**BLOCKER.** The named checks and mutants do not do what the brief requires, and the suite still exits 0. `z_ranges_agree` (346-349), `deterministic_and_rotation_invariant` (351-354), and `sim_purity_static` (363-366) contain no assertion. `seeds_share_one_flood` (242-249) never calls the service. `--legacy` exits 0 (29 PASS, 11 KILLED). The brief requires exit 1 for the legacy controls. Of the 28 mutant names, 17 exit 2 (`unknown mutant`), 9 print a `FAIL:` line, and 2 exit 1 by TypeError with zero `FAIL:` lines (`unknown_as_air` at test line 169, `fall_below_floor` at test line 282). The in-suite loop counts those throws as `KILLED` and the process exits 0.

**MINOR.** `docs/systems/DEUS_Structural.md:3` says "part 2 of 6". The brief says part 2 of 3. Line 24 says the headless path works, including the multi-job service. The configured service throws on a fall (the second blocker). Line 38 still says the part that exists now is the rooted support evaluator.

**MINOR.** `tasks/NAT.02.01/lane-gq/REPORT.md` quotes `Checked 62 DEUS plugin files. Errors: 0`, which this review did not produce, and an ellipsis in place of the suite log from Check 3. It also says `Persistence: Saved`. The file's last line is CRLF (`CR_INDEX 1661`, text `- In-Game Proof: NOT YET PLAYABLE\r`). No lane blob has a BOM. The other lane files are LF. The modified files are not whole-file rewrites (Check 1 numstat).

VERDICT: REJECT
