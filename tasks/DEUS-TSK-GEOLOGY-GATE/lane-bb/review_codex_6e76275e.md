# Independent Codex closure re-review — Lane BB

- **VERDICT: CLEAN PASS**

All five manifest gates pass, and all three requested cuts/caves mutants exit 1 through named failed checks. BB-CODEX-03-R1 and BB-CODEX-05 are resolved. The three specified `startArea` cache repairs reproduce the previously failing foreign checksums correctly. No new blocking regression was found in the inspected incremental and cumulative changes. This verdict covers the assigned closure review; native visual acceptance and Owner slice approval remain separate.

Date: 2026-09-30 (America/Chicago)  
Task: DEUS-TSK-GEOLOGY-GATE  
Reviewer: Codex, OpenAI family, independent of implementer Grok, xAI family  
Worktree: `C:\Users\snewt\.deus_worktrees\lane-bb`  
Branch: `task/lane-bb`  
Target: `6e76275ea0ffd2b04b76966564c069caaa3b7f9c`  
Previous reviewed target: `bbedd4de0446015f729756f557dac65621559849`  
Cumulative comparison base: `6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0`  
Environment: Windows PowerShell, Node `v24.19.0`.

## What changed

- Only `tasks/DEUS-TSK-GEOLOGY-GATE/lane-bb/review_codex_6e76275e.md` was created by this review. Runtime, test, data, manifest, status, decision-log and art files were not edited.
- The explicit report-only instruction supersedes the general STATUS claim, decision-log and commit workflow. No Git mutation, merge, push, WBS transition or implementation self-certification was performed.
- HEAD and the actual merge-base with local `main` matched the supplied target and base. Tracked files were unchanged before and after test execution. The nine pre-existing untracked files, including the previous review and FIX4 brief, were left untouched.
- Inspected `git diff bbedd4de 6e76275e` and the cumulative runtime/test changes from the supplied merge-base, together with the relevant task briefs, prior findings and system contracts. The incremental range contains the runtime repair commit `2578d2c9`; the target commit itself records its report.
- Two read-only Codex subreviews checked descriptor/cache behavior and cumulative harness assertions. Their executed probes are identified below. The primary reviewer independently ran every requested gate and mutant, and the exact new range regression against both revisions.

## Closure decisions

| Finding or repair | Decision | Evidence from this review |
|---|---|---|
| BB-CODEX-03-R1 — foreign target Z range replaced by host range | **Resolved** | The exact new assertion fails against `bbedd4de` with the original outer-level exceptions and passes against `6e76275e`. The target's bounds control allocation, indexing, cache identity and cap materialization. |
| BB-CODEX-05 — stale `old_gen_cut` anchor | **Resolved** | The anchor at `tools/test_strata_cuts_and_caves.js:105` injects successfully. The completed command exits 1 with `old_generator_unchanged` and `carve_only_removes` failures. |
| `startArea` identity in kind grids, volumes and water models | **Resolved for the specified caches and foreign-checksum contract** | All four previously observed warm-host mismatches recur on `bbedd4de` and match the target's native checksum after the repair. A separate inherited live-baseline cache limitation is bounded below. |
| BB-CODEX-01 — omitted live description in biome readers | **Remains resolved** | Live readers still pass the state into `kindGrid`; the geology gate passes its below-core `coupled_outer_substrate` check at -3, -9 and -16. |
| BB-CODEX-02 — absent coupling aliases a true volume key | **Remains resolved** | `volumeOf` still uses `couplingActive(desc)`. The foundation gate passes the actual save/load `flag_absent_volume_cache` guard with distinct coupled and uncoupled hashes. |
| BB-CODEX-03 — original area-count and Z0 foreign sampling defect | **Remains resolved, including R1 above** | The full cuts/caves gate passes `foreign_geometry_checksum` in both directions between 2x1 and 1x1 worlds at Z=-1,0,+1. |
| BB-CODEX-04 — `no_features` and `error_injected` controls | **Remains resolved** | Both inject and finish with Node exit 1 through named failures; neither exits 2 for a missing source anchor. |

### Foreign-range repair

`resolveDescZRange` at `game/js/plugins/DEUS_Levels.js:852` handles flat bounds, parsed persisted `zRange`, and the legacy fallback for a complete older descriptor. `generateBaseline` uses the resolved minimum at line 878. `volumeOf` resolves the same descriptor at line 2531, includes its bounds in the key at line 2538, allocates the range-sized volume at lines 2552–2553, and passes the range to `materializeCaps` at line 2554. Numeric-seed descriptors in `baseline` and `checksumOf` also retain the live state's persisted range.

The committed guard at `tools/test_strata_cuts_and_caves.js:446` creates actual seed-18 New Games, generator 5, size 256: a default target (-16..15) and a legacy host (-2..2). It checks both ranges, seed/size/generator, nonempty native hashes, foreign equality, caught exceptions and VM error arrays. The assertion is also called by the normal manifest gate at line 579.

The primary reviewer's before/after run used that exact guard and substituted the two production files through read-only `git show` calls. Results:

| Target Z | Native target, both revisions | Foreign through legacy host at `bbedd4de` | Foreign through legacy host at `6e76275e` |
|---:|---|---|---|
| -3 | `938f9dc5` | Throws `Cannot read properties of undefined (reading 'size')` | `938f9dc5` |
| +2 | `9998ffb2` | `9998ffb2` | `9998ffb2` |
| +3 | `7d1ab9f7` | Throws the same exception | `7d1ab9f7` |

The assertion produced one named failure before and zero after. The wrapper exited 0 because it explicitly required that fail-before/pass-after outcome.

The cache subreview additionally executed **90 comparisons with no failures or VM errors** using synthetic seed-20260923, size-64, 2x1, coupled descriptors. Eighty-four comparisons covered all 12 directed host/target pairs among ranges -2..2, -16..15, -4..4 and -3..3, sampling core levels, target extrema and +3 where applicable. Six compared warm-host versus native `startArea` variants under generators 4 and 5 at Z=-1,0,+1. This supplements the committed guard's one-direction New Game coverage; it is not a native-engine test.

### Cache identity repair

The keys at `DEUS_Levels.js:171,2538` and `DEUS_WorldGen.js:480` now include `startArea.x/y`. `dims` carries the start coordinates into the water-model key. The cache subreview ran this exact previous-review fixture against both revisions: seed 20260923, size 64, 2x1 areas, legacy range, coupling true, host start x=0 warmed before explicitly sampling target start x=1.

| Generator | Z | Native target | Foreign at `bbedd4de` | Foreign at `6e76275e` |
|---:|---:|---|---|---|
| 4 | -1 | `6d96e9be` | `7bfa68b2` | `6d96e9be` |
| 4 | 0 | `bef8fc4d` | `3a7ab71d` | `bef8fc4d` |
| 5 | -1 | `833e72c7` | `d53ccb53` | `833e72c7` |
| 5 | 0 | `cae6e5ee` | `caf9667e` | `cae6e5ee` |

The before/after expectation had zero failures, zero VM errors and exit 0. Production files were substituted only in memory. No committed regression specifically isolates these start-area keys; this session's adversarial probes supply that additional evidence.

## Cumulative diff assessment

- Description propagation remains explicit through substrate painting, level arrays, feature carving and checksum area loops. Ground checksum sampling passes the target description and excludes the host's mutable holes. Only ground/water/peak fields are hashed from `cellInfo`; its live geology metadata is not evidence of foreign geology isolation.
- The earlier cap-alias repair remains exercised by the passing roof-breach, restoration and save/load checks. It preserves the legacy cap fallback while using materialized outer strata for taller ranges.
- Foundation retains exact pre-strata checksums and shape/material/water/biome comparisons through uncoupled fixtures. Coupled fixtures retain exact shape/water and surface comparisons, with the documented shared shallow-band requirement. Range-relative elevations and independently calculated sphere damage follow `DEUS_ZRange.md` and the 2 ft stratum scale; legacy-range checks remain.
- Geology retains its nine original assertions, loads the real World authority, fails closed on plugin-load errors, and adds the below-core substrate regression.
- The cuts/caves old-generator reference is the accepted post-WG.00.15 revision `42c3bc9a`. Passing this check establishes that reference comparison, not universal compatibility with worlds predating WG.00.15.
- Historical capacity changes only its pinned candidate, source hash and byte count. The subreview inspected the candidate-to-candidate runtime diff: it adds the world-range validator. Identity checks, behavior contracts and targeted mutation diagnostics remain. Its frozen bootstrap does not test a complete current-game geology integration.
- Static source inspection found all 28 cuts/caves mutants' 32 anchors exactly once and all 23 foundation source anchors present. Foundation's `hooks_ignored` anchor has two matches, as at the merge-base; its first-match replacement behavior is inherited. Static insertion-point validation is not execution of the complete mutation matrices.

## How I tested it

Commands ran in the requested worktree against unchanged tracked sources. Immediately after each requested Node command, PowerShell executed `Write-Output "EXIT=$LASTEXITCODE"`. The table records that Node status, not the PowerShell wrapper's final exit status. Independent suites ran concurrently; reported timings are VM execution times, not native frame-rate measurements.

### Five manifest gates

| Command | Observed result | Node exit |
|---|---|---:|
| `node tools/test_strata_foundation.js` | 27 passed, 0 failed | 0 |
| `node tools/test_geology_strata.js` | 10 passed, 0 failed | 0 |
| `node tools/test_strata_cuts_and_caves.js` | 30 passed, 0 failed; nested foundation 27/0; nested fluid 36/0 with 5/5 mutants detected | 0 |
| `node tools/check_deus_syntax.js` | 60 DEUS plugin files checked, 0 syntax errors | 0 |
| `node tools/test_historical_carrying_capacity.js` | 23 contracts, 5 packet checks and 8 targeted mutants passed | 0 |

### Requested mutation checks

| Command | Observed result | Node exit |
|---|---|---:|
| `node tools/test_strata_cuts_and_caves.js --mutant=old_gen_cut` | 26 passed, 2 failed: `old_generator_unchanged`, `carve_only_removes` | 1 |
| `node tools/test_strata_cuts_and_caves.js --mutant=no_features` | 12 passed, 16 failed, including depth exposure, caves, roof breach, connectivity and ground holes | 1 |
| `node tools/test_strata_cuts_and_caves.js --mutant=error_injected` | 26 passed, 2 failed: `foreign_z_range_checksum`, `no_errors` | 1 |

Mutant runs intentionally omit the nested foundation/fluid suites, as implemented by the harness. Their 28 checks therefore differ from the normal run's 30. `error_injected` is also detected by the new regression because those New Games log the injected console error. `no_features` includes guard-caught missing-fixture exceptions as well as direct behavioral failures; it does not fail at source injection.

Additional checks: the exact range regression against both revisions; the subreview's descriptor and start-area probes; static source-anchor inspection; `git diff --check bbedd4de 6e76275e` with no output; unchanged tracked-source and HEAD checks.

## Evidence

Screenshots: none produced. Native F5/F8 and visual acceptance were not evaluated.

Selected log excerpts copied from the actual primary-reviewer runs:

```text
REVISION bbedd4de
FAIL foreign_z_range_checksum - generator 5, seed 18, size 256; default -16..15 (15258 ms) checksummed inside legacy host -2..2 (17604 ms); -3: 938f9dc5 via host undefined ERROR foreign Cannot read properties of undefined (reading 'size'); 2: 9998ffb2 via host 9998ffb2; 3: 7d1ab9f7 via host undefined ERROR foreign Cannot read properties of undefined (reading 'size')
GUARD_FAILURES=1
REVISION 6e76275e
PASS foreign_z_range_checksum - generator 5, seed 18, size 256; default -16..15 (17339 ms) checksummed inside legacy host -2..2 (16688 ms); -3: 938f9dc5 via host 938f9dc5; 2: 9998ffb2 via host 9998ffb2; 3: 7d1ab9f7 via host 7d1ab9f7
GUARD_FAILURES=0
BEFORE_AFTER_EXPECTATION=true
EXIT=0
```

```text
node tools/test_strata_foundation.js
PASS flag_absent_volume_cache - generator 5, seed 20260923, 64x64, legacy range: coupled 57a53a88, explicit uncoupled d5c6326e, coupled again 57a53a88; flag-absent load while that coupled volume is cached d5c6326e (flag absent, verticalCouplingOn false, gen5 true), same load after discardBaselineCache d5c6326e
PASS no_errors - none beyond the 3 the diagnostic check provoked
RESULT: 27 passed, 0 failed (exit 0)
EXIT=0
```

```text
node tools/test_geology_strata.js
PASS geology.coupled_outer_substrate - seed 18 (100, 100), coupling on, -16..15; Z-3: columnBiomeId rooted_loam, biomeAt rooted_loam (want rooted_loam); Z-9: columnBiomeId deep_mine_belt, biomeAt deep_mine_belt (want deep_mine_belt); Z-16: columnBiomeId deep_mine_belt, biomeAt deep_mine_belt (want deep_mine_belt)
RESULT: 10 passed, 0 failed (exit 0)
EXIT=0
```

```text
node tools/test_strata_cuts_and_caves.js
PASS foreign_geometry_checksum - generator 4, size 64, coupling on, legacy range; -1: 2x1 6d96e9be via 1x1 6d96e9be; 1x1 bc3d0827 via 2x1 bc3d0827; 0: 2x1 bef8fc4d via 1x1 bef8fc4d; 1x1 fb1dd0ca via 2x1 fb1dd0ca; 1: 2x1 d5336e37 via 1x1 d5336e37; 1x1 3cbb08dd via 2x1 3cbb08dd
PASS foreign_z_range_checksum - generator 5, seed 18, size 256; default -16..15 (15221 ms) checksummed inside legacy host -2..2 (15832 ms); -3: 938f9dc5 via host 938f9dc5; 2: 9998ffb2 via host 9998ffb2; 3: 7d1ab9f7 via host 7d1ab9f7
PASS save_load - generator-5 world saved (634 chars of world state) and loaded: checksums verified (0 mismatches), the dug cave floor (223,46,-1) kept [air,air,air,air,air] (changed true); loaded into a fresh vm that had another world: its checksums regenerate and the dig is there true
PASS fluid_suite - node tools/test_strata_fluid_reconciliation.js: exit 0 in 362 s; PASSED: 36; FAILED: 0; MUTANT VERIFICATION: 5/5 mutants detected.
PASS foundation_suite - node tools/test_strata_foundation.js: exit 0 in 405 s; RESULT: 27 passed, 0 failed (exit 0)
PASS no_errors - none
RESULT: 30 passed, 0 failed (exit 0)
EXIT=0
```

```text
node tools/check_deus_syntax.js
Checked 60 DEUS plugin files. Errors: 0
EXIT=0
```

Selected JSON fields from `node tools/test_historical_carrying_capacity.js`:

```text
"status": "PASS",
"packetPassed": 5,
"packetFailed": 0,
"passed": 23,
"failed": 0,
"mutantsPassed": 8,
"mutantsFailed": 0
EXIT=0
```

```text
node tools/test_strata_cuts_and_caves.js --mutant=old_gen_cut
RESULT: 26 passed, 2 failed (exit 1) - old_generator_unchanged, carve_only_removes
EXIT=1

node tools/test_strata_cuts_and_caves.js --mutant=no_features
RESULT: 12 passed, 16 failed (exit 1) - different_seeds_differ, carve_only_removes, partial_heights, z0_to_z1_exposure, z1_to_z2_exposure, feature_reaches_z2, shallow_more_common, caves_on_all_levels, cave_overburden, cave_void_minimum, roof_breach, clearance_4_5_more, multi_z_connectivity, shafts_keep_fluid, ground_holes, save_load
EXIT=1

node tools/test_strata_cuts_and_caves.js --mutant=error_injected
FAIL no_errors - MUTANT error_injected | MUTANT error_injected | MUTANT error_injected
RESULT: 26 passed, 2 failed (exit 1) - foreign_z_range_checksum, no_errors
EXIT=1
```

### Reproduce the exact range regression without writing files

This runs the committed guard against the previous and target runtime. It requires one named assertion failure before the fix and none afterward. Run from the reviewed worktree:

```powershell
@'
const fs=require('fs'),path=require('path'),Module=require('module'),cp=require('child_process');
const filename=path.resolve('tools/test_strata_cuts_and_caves.js'),raw=fs.readFileSync(filename,'utf8');
const prefixMarker='console.log(`=== DEUS-TSK-FABLE-19B',startMarker='function foreignZRangeChecksum() {',endMarker='const src = currentSources();';
for(const marker of [prefixMarker,startMarker,endMarker])if(!raw.includes(marker))throw Error('missing '+marker);
const prefix=raw.slice(0,raw.indexOf(prefixMarker)),guard=raw.slice(raw.indexOf(startMarker),raw.indexOf(endMarker));
const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));
mod._compile(prefix+'\nmodule.exports={currentSources,run(src){const extraEnvs=[];const before=failed;'+guard+'foreignZRangeChecksum();return failed-before;}};',filename);
const h=mod.exports;let ok=true;
for(const revision of ['bbedd4de','6e76275e']){
  const src=h.currentSources();
  for(const f of ['DEUS_Levels.js','DEUS_WorldGen.js'])src[f]=cp.execFileSync('git',['show',revision+':game/js/plugins/'+f],{encoding:'utf8',maxBuffer:64<<20});
  console.log('REVISION '+revision);
  const failures=h.run(src);console.log('GUARD_FAILURES='+failures);
  if(failures!==(revision==='bbedd4de'?1:0))ok=false;
  global.gc();
}
console.log('BEFORE_AFTER_EXPECTATION='+ok);process.exitCode=ok?0:1;
'@ | node --expose-gc -
Write-Output "EXIT=$LASTEXITCODE"
```

## Not done / known problems

- Native RMMZ editor F5 Playtest, F8 console smoke, visual presentation and screenshot acceptance were **not run / not checked**. VM error checks do not substitute for those gates. No image or art was generated.
- The complete cuts/caves 28-mutant matrix and foundation source/expectation mutation matrices were not rerun. Only the three requested cuts/caves mutants were executed directly; nested fluid and historical-capacity mutants ran through their normal gates. Static anchor inspection does not establish that every unexecuted mutant is killed.
- **Inherited, nonblocking synthetic-state limitation:** `baseline()` still omits `startArea` from its own Map key (`DEUS_Levels.js:1078`). Range resynchronization resets slot caches, not that Map (`:306–316`); explicit clearing is at `:184–187`. A read-only subreview switched between same-seed, same-dimension synthetic states differing only in start area and observed `sameObject=true`, `staleMatchesNative=false`, `coldMatchesNative=true`. Thus arbitrary live-state replacement can retain an old baseline until cache discard. No normal gameplay route was established: `World.newWorld()` centers `startArea` from the area counts (`DEUS_World.js:535`), and no ordinary mutation of that field was found. Explicit foreign checksums bypass this Map and passed the repaired contract. This observation does not reopen BB-CODEX-03-R1 or the three specified cache repairs.
- The descriptor probes cover valid object-form ranges. Exhaustive malformed-input validation, every range representation and all seeds were not tested.
- The prior audit's unrelated open findings remain outside this task. `docs/STATUS.md`, decision logs and WBS state were deliberately not updated under the report-only instruction.
- No commit was created. This report is the only review artifact written; no merge or task-state transition was performed.

## Try it in RMMZ

These are proposed follow-up steps, not steps executed in this review.

1. Open `game/game.rmmzproject`, start F5 Playtest and create a seed-18 New Game with the default range.
2. In F8, confirm `UF.World.zRange()` is -16..15. Inspect generated terrain around core/outer boundaries, and check for startup or level-switch exceptions.
3. Check `UF.Levels.checksum(z)` at z=-3,+2,+3. For the reviewed default catalog and generator-5 world, expect `938f9dc5`, `9998ffb2`, `7d1ab9f7` respectively.
4. Save to a disposable test slot, reload and inspect terrain and console output. Use the read-only Node reproduction above for the two-world foreign-range contract.

Expected: default-range terrain/checksums regenerate consistently, save/load retains changes, and no new native console exception occurs. These native expectations still require observation.

## Decisions needed

- No implementer correction is required for the assigned closure findings on this target.
- Coordinator integration and WBS decisions remain with the designated authority under DEC-034 / `CANONICAL_ROLES.md`; Owner slice approval remains separate.
- Any future support for arbitrary live worlds with non-centered start areas should address the inherited baseline-Map identity limitation and add a persistent regression for that contract.

Independent execution evidence complete: 2026-09-30T00:07:57.3442562-05:00 — Codex / OpenAI family. All requested test processes had completed before this report was written.
