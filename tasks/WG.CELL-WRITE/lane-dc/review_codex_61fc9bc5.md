# Independent Codex review — WG.CELL-WRITE / lane-dc idle-host rerun

Date: 2026-10-01 (execution times below are UTC). Reviewer: Codex, OpenAI / Codex model family. Writer: Grok / xAI model family. Branch: `task/lane-dc`. Reviewed writer SHA: `61fc9bc58ecc24a3192bf0442515942452fd1e17`.

This review follows the Codex rejection at `af0dd96a` of target `5fad5559` after an independent 5,332.9 ms speed median. The writer reran the unchanged gate and committed its result at `61fc9bc5`. The previous review's source, fixture, scope, and smoke-artifact assessment still applies: the `DEUS_Levels.js` blob (`e87ff4e0`), speed harness blob (`d424e6a0`), and frozen fixture blob (`ecf12a1b`) are identical at `5fad5559` and `61fc9bc5`.

## What changed

- `61fc9bc5` changes only `docs/systems/DEUS_Levels.md`, `tasks/WG.CELL-WRITE/lane-dc/REPORT.md`, and `tasks/WG.CELL-WRITE/lane-dc/evidence/idle-host-speed.txt`, all within the brief's allowed paths. `git diff --check 61fc9bc5^ 61fc9bc5` exited 0.
- The new committed evidence records `node tools/test_area_generation_speed.js`, exit 0, samples 2,796.2 / 3,320.4 / 3,228.3 ms, median 3,228.3 ms, and a passing 20-case checksum guard. Its reported head `a4587142` precedes this documentation/evidence commit; the production and harness blobs at the reviewed SHA are unchanged. The system document and report repeat those numbers accurately. The writer's recorded base median 17,315.3 ms divided by the new median is 5.3636.
- This review adds only `tasks/WG.CELL-WRITE/lane-dc/review_codex_61fc9bc5.md` to the branch. Existing untracked launch prompts and reviewer scratch files were preserved.

## Findings

The prior speed-gate finding is resolved **for this exact reviewed tip**. In a fresh clean clone at `61fc9bc5`, the independent normal run printed three cold first-area samples of **2,798.6, 3,187.3, and 3,166.9 ms**; median **3,166.9 ms**, below the brief's 5,000 ms limit. The static no-rest check and all 20 frozen generator/seed/grid checksum cases passed. The command exited **0**. The clone remained clean after the run.

A fresh clone at pre-optimization base `07a94429`, overlaid only with the byte-identical current test harness and fixture, printed samples **11,447.1, 12,004.2, and 12,625.1 ms**; median **12,004.2 ms**. Both required fail-before checks failed by name, the 20-case checksum guard passed, and the command exited **1**. The same first-area operation on this machine is **3.7905×** faster by these base/tip medians. These were sequential runs, not a continuously controlled host-load experiment.

The independent `--mutant=hash_changed` run exited **1** because `core_checksums_bit_identical` failed, while the static check passed. Its speed check was deliberately skipped as specified by the harness's mutant mode. Thus the frozen checksum guard can detect changed generator output.

The pre-run process inventory showed no other lane gate process. It did show an unrelated `run_batches.js bestiary_v3_narrow.js` Node process, plus a mail watcher and Codex processes; their load was not continuously monitored. The prior 5,332.9 ms failure under shared-host contention shows this wall-clock gate is sensitive to host load. The passing result does not promise every later host run will pass.

## How I tested it

Each manifest gate ran in its own fresh shared-object-store clone, detached at the exact reviewed SHA, with `core.autocrlf=false`, `core.eol=lf`, and `core.safecrlf=false`. The foreground runner used a 900-second child timeout, recorded exit code and clone status, and finished all children before this review. The speed clone was separately created with the same checkout settings and run in the foreground. No gate timed out.

| Command | Result | Exit |
|---|---|---:|
| `node tools/check_deus_syntax.js` | 62 plugin files, 0 errors | 0 |
| `node tools/test_area_generation_speed.js` | Median 3,166.9 ms; static and 20-case checksum checks pass | 0 |
| `node tools/test_strata_cuts_and_caves.js` | 30 passed, 0 failed; nested fluid and foundation suites pass | 0 |
| `node tools/test_deep_cuts_and_mountain_cap_wg0041.js` | 11 passed, 0 failed | 0 |
| `node tools/test_sparse_outer_save.js` | 7 passed, 0 failed; 32 baseline layer checksums match | 0 |
| `node tools/test_area_generation_speed.js --mutant=hash_changed` | Named checksum check fails | 1, expected |
| Base production plugin with current speed harness and fixture: `node tools/test_area_generation_speed.js` | Static and speed checks fail; fixture guard passes; median 12,004.2 ms | 1, expected |

Runner records for syntax, strata, deep, sparse, mutant, and base are under untracked `tasks/WG.CELL-WRITE/lane-dc/reviewer_scratch/61fc-*.json` and `.log`. The normal speed output was observed directly in the foreground tool session. Its clone was clean before and after. The base clone shows only the two intentional test/fixture overlays as untracked files. The other fresh clones were clean before and after their commands. The base run finished at `2026-10-01T19:46:43.270Z`; the mutant finished at `2026-10-01T19:35:19.290Z`. A final process inventory found no reviewer gate process still running.

## Evidence

Selected output copied from the independent runs:

```text
PASS no_rest_parameter_hash_on_generator_path
one_area_volume_ms sample 1 2798.6 ms
one_area_volume_ms sample 2 3187.3 ms
one_area_volume_ms sample 3 3166.9 ms
one_area_volume_ms samples 2798.6 3187.3 3166.9 median 3166.9
PASS one_area_volume_ms - median 3166.9 ms, limit 5000
PASS core_checksums_bit_identical
RESULT pass

FAIL no_rest_parameter_hash_on_generator_path - line 205: spread into hash32; line 205: rest rand/rnd/rint/rfl; line 324: rest-parameter hash32; line 324: spread into hash32; line 617: spread into hash32; line 617: rest rand/rnd/rint/rfl
one_area_volume_ms samples 11447.1 12004.2 12625.1 median 12004.2
FAIL one_area_volume_ms - median 12004.2 ms, limit 5000
PASS core_checksums_bit_identical
RESULT fail 2

FAIL core_checksums_bit_identical - g1_s18_1x1 z -2 11dc84dd != f6aad9f4; g1_s18_1x1 z -1 91587e37 != 2ab1e64b
RESULT fail 1
```

## GAME TRANSLATION

Class C, foundational / indirect. The existing New Game path calls `World.newWorld`, then `UF.Levels` builds the same area baselines with the fixed-arity generator hash. The core fixture, sparse-save checks, strata save/load test, and mutant show why output compatibility matters to terrain and saved-world consumers. This commit changes only measurement documentation and evidence, so it adds no runtime bridge or presentation. The earlier review inspected the writer's smoke screenshots and timing excerpts; I did not produce or reopen screenshots, launch native RMMZ F5/F8, or run a new NW.js smoke session in this rerun. The node speedup is not a claim of a proportional in-game New Game speedup.

## Not done / known problems

- The speed gate may fail on a busy shared host, as the prior independent run did. Recheck host activity when the integrator executes the gate.
- The lane-db/lane-dc handoff and combined-candidate union of gates remain for the authorized integrator when those branches combine. This review covers only `61fc9bc5`.
- Native RMMZ editor F5/F8 and disk-backed save/load were not rerun. The previous smoke artifacts and their limits are recorded in `review_codex_5fad5559.md`.
- The reviewer scratch clones and two pre-existing untracked launch prompts remain in the worktree and are not part of this review commit.

## Try it in RMMZ

1. Open a seed-18 New Game with Z range -16..+15 and wait for the ground map.
2. Inspect the F8 console, then save and reload a disposable slot.

Expected: the same terrain and saved changes as before the hash optimization, without a startup error. These native-editor steps were not performed in this rerun.

## Decisions needed

- The PM performs the normal `merge_gate` and the combined-candidate checks required by the brief when lane-db joins; this review does not merge, push, or close the WBS leaf.

VERDICT: CLEAN PASS
