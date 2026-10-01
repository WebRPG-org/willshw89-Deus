# Independent Codex review — WG.CELL-WRITE / lane-dc

Date: 2026-10-01 (America/Chicago; execution timestamps below are UTC).
Reviewer: Codex, OpenAI provider, GPT-6 / Codex family, independent of the Grok / xAI writer.
Role: independent reviewer; a read-only Codex subagent supplied supporting source analysis, not a separate model-family approval.
Branch: `task/lane-dc`.
Reviewed target: `5fad5559cc533756ccaa951f099539dfa1f0eeaa`.
Writer implementation: `8dadcf340bc87ffafa21018e5e8b31750fa6a090`.
Fixture/harness commit: `9b2073bb79551bc8e694390c4eda3bf3fd4ff9fc`.
Pre-optimization launch base: `07a944291879018ac0ddf369e78f72c3cd87f0ab`.
Cumulative comparison: `git diff 7f91efbb..5fad5559`.
Environment: Windows, PowerShell, Node `v24.19.0`.

## What changed

- This review adds only `tasks/WG.CELL-WRITE/lane-dc/review_codex_5fad5559.md` to the branch. Reviewer test scratch work stays under the lane's allowed task directory and is not part of the review commit.
- Initial `git log -n 5 --oneline` confirmed the requested target and writer commits. Initial status had no tracked changes and one pre-existing untracked reviewer launch prompt, `launches/20261001_094236_prompt.txt`; that file is preserved. Both unstaged and staged diffs were empty.
- The explicit allowed-path and review-only commit instructions take precedence over general STATUS/decision-log claim edits. No tracked runtime, harness, fixture, system documentation, manifest, art, shared status, or decision record at the reviewed target was changed by the reviewer. No push, merge, fetch, WBS closure, or merge-gate execution was performed.
- Read the BRIEF, launch record, writer report, all committed text evidence, and applicable governance/system rules. Opened both committed smoke screenshots.

## Findings

### DC-CODEX-01 — MAJOR: the required speed gate fails on the reviewed target

The fresh-clone execution of `node tools/test_area_generation_speed.js` at the exact reviewed SHA exited **1**. Three independent cold first-area samples were **5130.4, 6289.5, and 5332.9 ms**, with median **5332.9 ms**. This exceeds the required **5000 ms** limit by **332.9 ms**. `no_rest_parameter_hash_on_generator_path` and `core_checksums_bit_identical` passed in the same run.

Evidence: `BRIEF.md:75` fixes the operation and limit; `tools/test_area_generation_speed.js:19` defines the unchanged limit, `:239` creates the three fresh VM trials, and `:330` reports the failed median assertion. The exact output is copied below. The test ran from **2026-10-01T14:45:36.268Z to 2026-10-01T14:49:27.781Z**, with a clean clone before and after, normal arguments, and no timeout or signal.

This is an acceptance failure, not evidence of changed terrain. The host was shared: a read-only process inventory observed another lane's strata/foundation processes (PIDs 42020, 41768, 26664, 28360), created at 14:43:45–14:43:46 UTC, before this speed run, and still present afterward. They were not started or stopped by this reviewer. Contention is a plausible contributor; causation and an otherwise idle-machine median were not established. The BRIEF explicitly acknowledges timing sensitivity, but does not waive this gate. The writer's recorded 3944.3 ms passing median cannot replace the independent failing result.

The completed independent base replay measured **10427.9, 10086.9, 10393.5 ms**, median **10393.5 ms**. The raw base/tip median ratio is **1.949x**, below the BRIEF's 2x title claim. Both runs used the same machine and unchanged harness operation; outside workload was not controlled, so this comparison does not isolate the code's intrinsic speedup. It also does not independently reproduce the writer's 4.390x result. The absolute 5000 ms failure alone is sufficient to reject this target's gate evidence.

Required disposition: return the failing performance gate to the writer/PM for a reproducible pass under the existing contract and independent re-review. The 5000 ms threshold and frozen fixture remain unchanged.

### Source, fixture, scope, and role assessment

No additional blocking source defect was found:

- All **20 changed paths** in `7f91efbb..5fad5559` match the supplied whitelist; a machine comparison against those paths exited 0 with `OutsideAllowedPaths: 0`.
- The Levels diff is 69 added / 20 removed lines in the seeded hash/noise implementation and its callers. `DEUS_Levels.js:328` preserves the original four-byte little-endian mixing with unsigned coercion. The multiplication split is exact modulo 2^32: `16777619 = 403 + 256 * 65536`, and the finalizer constant is `15469 + 11291 * 65536`. Intermediate integer products remain exactly representable.
- The province offset retains three hash inputs; province/gen-2 rolls retain six; each noise corner retains four. Current feature `rnd` callers use 2–5 tail arguments and current `rint`/`rfl` callers use 2–4, preserving the old input order and count (`DEUS_Levels.js:204`, `:648`, `:377`, `:2725`). The bounded `floorN` replacement matches `Math.floor` within signed 32-bit coordinates, well beyond the current generator coordinates. These private helpers are not unrestricted replacements for arbitrary future arities or out-of-range coordinates.
- Generation order, complete `volumeOf` construction, caches, checksum accumulation, save schema, other CELL contracts, engine core, and WorldGen's noise implementation are unchanged. There is no deferred/lazy-area work in the diff.
- The speed harness creates a fresh VM/world per sample and times the first `baseline(0,0,0)`. Source inspection confirms generator 5 at this target. Fixture sampling checks seed, grid, centered start area and Z range, passes the generator explicitly to `checksum`, rejects collapsed generator/grid checksum vectors, and compares all 20 cases against the frozen fixture. Capture is explicit; normal and mutant runs do not rewrite expectations.
- The fixture names generators 1–5, both required seeds, both required grids, all area coordinates, and core levels -2..+2. Its recorded source is the actual launch base `07a94429`. Git reports the same Levels blob `14d9ff5da41af959e4e346c05aed24d24c0acc94` at `7f91efbb`, `07a94429`, and `9b2073bb`; the optimized blob `e87ff4e0cfa55f42efbb8d553ecc7375b47f7442` is identical at `8dadcf34` and `5fad5559`. The independent base replay is recorded below.
- `5fad5559` is a PM-tagged commit changing only `lane.json`'s reviewer from `gemini` to `codex`. Writer, whitelist, and all five 900-second gates are unchanged. This recorded PM update and the explicit Owner assignment supersede the older Gemini references in the BRIEF; reviewer and writer remain different families.
- Lane-db's hook was absent from the reviewed target and from inspected local `main`/`origin/main` (`e89b9f80` at inspection). The conditional hook handoff and exact combined-candidate gate union remain the integrator's obligations when those lanes combine. This review covers `5fad5559`, not a later merge result.

The supporting read-only subagent also executed short extracted old/new helper comparisons: 90,000 hash cases, 15,000 noise cases, and 100,000 feature-wrapper cases, all exit 0. These supplement the source reasoning and do not replace the primary reviewer's manifest gates.

## How I tested it

Every manifest command runs synchronously in its **own fresh full checkout** at the reviewed SHA. Clone settings match the merge gate: local shared object store, `--no-checkout`, detached checkout, `core.autocrlf=false`, `core.eol=lf`, `core.safecrlf=false`; no sparse checkout or harness modifications. A foreground Node wrapper uses `spawnSync` with **900000 ms timeout**, records the actual child exit/status/signal and UTC times, and checks clone status before/after. Top-level reviewer test commands run sequentially. The strata command starts and joins its own built-in nested suites. All scratch files are under `tasks/WG.CELL-WRITE/lane-dc/reviewer_scratch/`.

| Command | Result | Exit | UTC start | Elapsed |
|---|---|---:|---|---:|
| `node tools/check_deus_syntax.js` | 62 plugin files, 0 errors | 0 | 14:45:09.828 | 6.586 s |
| `node tools/test_area_generation_speed.js` | Median 5332.9 ms; speed FAIL; static and all 20 fixture cases PASS | 1 | 14:45:36.268 | 231.440 s |
| `node tools/test_strata_cuts_and_caves.js` | 30 passed, 0 failed; nested foundation 27/0; nested fluid 36/0 and 5/5 mutants detected | 0 | 14:49:45.829 | 147.973 s |
| `node tools/test_deep_cuts_and_mountain_cap_wg0041.js` | 11 passed, 0 failed | 0 | 14:52:31.304 | 39.417 s |
| `node tools/test_sparse_outer_save.js` | 7 passed, 0 failed; all 32 layer checksums unchanged | 0 | 14:53:32.242 | 19.378 s |

| Additional command | Production source | Result | Exit | UTC start | Elapsed |
|---|---|---|---:|---|---:|
| `node tools/test_area_generation_speed.js --mutant=hash_changed` | Reviewed target; mutation only in memory | Named checksum guard FAIL; static check PASS; speed deliberately skipped by the mutant mode | 1 (expected) | 14:54:06.616 | 157.556 s |
| `node tools/test_area_generation_speed.js` | Pre-optimization base with the new test/fixture present | Both required named checks FAIL; median 10393.5 ms; all 20 checksum cases PASS | 1 (expected) | 14:57:45.438 | 616.465 s |
| `node tools/test_sparse_outer_save.js` | Untouched pre-optimization base | 7 passed, 0 failed; seed-18 1x1 world's 32 pinned layer checksums unchanged | 0 | 15:08:39.723 | 43.280 s |

Pre-optimization replay: fresh clone at `07a944291879018ac0ddf369e78f72c3cd87f0ab`, with only the new harness and frozen fixture copied byte-for-byte from `5fad5559`. Production files remain at the base; no expectation capture/regeneration is invoked. The only clone status entries before and after are those two new files. The two named base failures are assertion failures, not a missing module or setup error. The separate sparse base clone is clean before and after. Every other clone is also clean before and after its run. All eight commands completed within 900 seconds, with no timeout or signal.

## Evidence

Selected primary-reviewer output, copied from the actual runs:

```text
Checked 62 DEUS plugin files. Errors: 0

PASS no_rest_parameter_hash_on_generator_path
one_area_volume_ms sample 1 5130.4 ms
one_area_volume_ms sample 2 6289.5 ms
one_area_volume_ms sample 3 5332.9 ms
one_area_volume_ms samples 5130.4 6289.5 5332.9 median 5332.9
FAIL one_area_volume_ms - median 5332.9 ms, limit 5000
PASS core_checksums_bit_identical
RESULT fail 1

PASS fluid_suite - node tools/test_strata_fluid_reconciliation.js: exit 0 in 138 s; PASSED: 36; FAILED: 0; MUTANT VERIFICATION: 5/5 mutants detected.
PASS foundation_suite - node tools/test_strata_foundation.js: exit 0 in 148 s; RESULT: 27 passed, 0 failed (exit 0)
PASS no_errors - none
RESULT: 30 passed, 0 failed (exit 0)

RESULT: 11 passed, 0 failed (exit 0)

PASS all_32_layers_reconstructible_unchanged - 32 baseline checksums match the lane-base constants
RESULT: 7 passed, 0 failed
```

Requested mutant, actual child exit 1:

```text
area generation speed mutant hash_changed
PASS no_rest_parameter_hash_on_generator_path
one_area_volume_ms SKIP mutant (the mutant's named check is core_checksums_bit_identical)
FAIL core_checksums_bit_identical - g1_s18_1x1 z -2 11dc84dd != f6aad9f4; g1_s18_1x1 z -1 91587e37 != 2ab1e64b; g2_s18_1x1 z -2 7a907a8b != 57f31d52; g2_s18_1x1 z -1 1bc0cfbb != 7d96f971; g3_s18_1x1 z -2 6cd8e088 != 9978c5f8; g3_s18_1x1 z -1 5532e97f != 17ea0567; g4_s18_1x1 z -2 6cd8e088 != 9978c5f8; g4_s18_1x1 z -1 18ac30f7 != f023c77b
RESULT fail 1
```

Pre-optimization base, actual child exit 1:

```text
FAIL no_rest_parameter_hash_on_generator_path - line 205: spread into hash32; line 205: rest rand/rnd/rint/rfl; line 324: rest-parameter hash32; line 324: spread into hash32; line 617: spread into hash32; line 617: rest rand/rnd/rint/rfl
one_area_volume_ms sample 1 10427.9 ms
one_area_volume_ms sample 2 10086.9 ms
one_area_volume_ms sample 3 10393.5 ms
one_area_volume_ms samples 10427.9 10086.9 10393.5 median 10393.5
FAIL one_area_volume_ms - median 10393.5 ms, limit 5000
PASS core_checksums_bit_identical
RESULT fail 2
```

The independent sparse base run also printed `PASS all_32_layers_reconstructible_unchanged - 32 baseline checksums match the lane-base constants` and `RESULT: 7 passed, 0 failed`, with actual child exit 0. The fixture guard and sparse keep-green guard therefore pass both before and after the optimization; the base's new static/speed checks and the requested mutant fail through their named assertions.

Committed writer evidence was inspected separately from the new reviewer runs. `evidence/fail-before.txt` records both named base failures with the checksum guard green; `pass-after.txt` records the writer's 3944.3 ms median; `mutant-hash_changed.txt` records the guard red. `capture-fixture.txt` identifies the 20 captured cases and source SHA. Sparse base/tip, strata, and deep-cut logs agree with their reported assertions.

Both committed smoke images were opened in this review. `evidence/f5-base-smoke.map.png` shows a grass field with rows of units and green bars, a red/gold banner near the center, trees and stumps, Ground/paused/1x Speed controls, 1.0x Normal zoom, and a dark minimap with 3% explored / 1793 cells. `evidence/f5-tip-smoke.map.png` shows the same visible layout and controls. Neither image displays seed, generation timing, or console errors.

The accompanying writer timing files show seed 18 and `DataManager.setupNewGame` exit at +17159.9 ms (base) and +16750.9 ms (tip). The report distinguishes that small NW.js improvement from its 4.390x Node-VM claim. The committed timing excerpts do not include the complete smoke assertion summary or complete console log; the 122/0 smoke result and absence of console errors are writer-reported, not independently rerun or established by those excerpts. The described retained `game/test_output` directory was absent when inspected.

## GAME TRANSLATION

Class **C — foundational / indirect**. WBS WG.00.45 is implemented through WG.CELL-WRITE, lane-dc. The report contains the required ten-field translation and six bridge-status fields; the review assesses them as follows.

| Field | Reviewed chain and evidence |
|---|---|
| Player / World Effect | Regenerates the same terrain with less hash overhead; the absolute Node speed gate remains failed in this review. |
| Trigger | Existing New Game path through `DataManager.setupNewGame`, `Game_Player.setupForNewGame`, and `World.newWorld`. |
| Runtime Authority | `UF.Levels` in `DEUS_Levels.js`; no second generation or cell authority added. |
| Simulation Path | `ensureWorldLevels` / `baseline` -> complete `volumeOf` -> fixed-arity hash/noise -> unchanged cell/strata output. |
| Engine Bridge | Existing `world:initializing`/`world:created` consumers; writer's snapshot timing reaches map 1000. |
| Visible Result | Same ground scene in the two images opened by the reviewer; screenshots alone establish neither elapsed time nor console cleanliness. |
| Persistence | Regenerated baselines remain compatible with saved checksums; independent core fixture, 32-layer sparse checks, and strata VM save/load pass. |
| Failure Without This Lane | Old rest/spread/closure implementation remains; independently replayed base results are recorded in the test section. |
| Automated Proof | Exact reviewed-target gates and requested before/mutant runs above; speed acceptance is separate from output compatibility. |
| In-Game Proof | Writer's committed NW.js snapshot images and timing excerpts inspected. Reviewer did not launch NW.js or native editor F5/F8. |

**CONSUMED BY GAME SYSTEMS:** Levels baseline generation feeds existing World/WorldGen map construction, terrain inspection and movement, and baseline regeneration during loading. A hash drift would change cave/terrain cells or trigger saved-checksum mismatches. The core fixture, sparse 32-layer guard, and strata save/load tests exercise these contracts. Node timing does not establish a proportional player-visible New Game speedup.

| Status | Assessment |
|---|---|
| Simulation implemented | YES for the reviewed hash change and unchanged sampled output; performance acceptance remains failed. |
| Engine bridge implemented | YES, existing runtime consumers are retained; supported by source and writer snapshot artifacts. |
| Presentation implemented | YES for the existing scene visible in inspected images; no new presentation work in this lane. |
| Input/player interaction implemented | NO new input in scope; existing interaction was not exercised by the reviewer. |
| Save/load implemented | YES for baseline/checksum compatibility and the executed VM round trips; disk-backed RMMZ save/load not checked. |
| Playable verification performed | NO by this reviewer. Writer reports NW.js smoke; screenshots/timing inspected, full smoke/console proof not independently reproduced. |

## Not done / known problems

- DC-CODEX-01 remains open. Four required gates pass; the speed gate fails. No production repair was attempted by the reviewer.
- Native RMMZ editor F5, F8 console, a played walking/digging session, and disk-backed `saveGame`/`loadGame` were not run. These results do not close the whole Natural World phase or unrelated audit findings.
- Full-range `git diff --check` reports CRLF/trailing-whitespace diagnostics in the two committed timing text files; the focused check of those files exits 1. The runtime, harness, fixture and system-document diff check exits 0. This is a nonblocking evidence-format observation, not an explanation for the speed failure.
- No combined lane-db/lane-dc candidate was tested. A later integration change needs the handoff, union of gates, and fresh review required by the BRIEF.
- Automatic approval review rejected the command to remove completed temporary reviewer clones with the reason `blocked by policy`. The eight clones, raw logs, exit/timestamp JSON records, and foreground runner remain untracked under the allowed `reviewer_scratch/` directory. They are not staged or included in the review commit. The pre-existing reviewer launch prompt is preserved.

## Try it in RMMZ

Proposed follow-up, not executed by this reviewer; coordinate reopening with the PM's standing editor-closed build rule.

1. Create a seed-18 New Game with Z range -16..+15.
2. Wait for the ground map and inspect the console for startup errors.
3. Inspect terrain and perform a save/reload in a disposable slot.

Expected: the existing terrain and saved changes remain consistent. The assigned speed acceptance is the Node cold-volume test, not the screenshot or an inferred frame-rate claim.

## Decisions needed

- Writer/PM disposition of DC-CODEX-01 and an independent passing review before integration. The reviewer has not changed the agreed scope, budget, gate, or fixture.
- Integration remains with the authorized PM through the normal merge gate; this review performs no merge or push.

Independent execution complete: **2026-10-01T15:10:22Z**. Every reviewer-started test command and its joined children has finished. A final process inventory found no Node process whose command names `reviewer_scratch`. The same-family supporting subagent is finished. Review scope remains the exact target stated above; no production repair or integration was performed.

VERDICT: REJECT speed gate median 5332.9 ms exceeds 5000 ms
