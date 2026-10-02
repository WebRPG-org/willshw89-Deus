# WG.CELL-WRITE lane-dd independent review

Reviewer: Codex. Writer: Grok. Reviewed writer tip: `a30315dd66aa391b4649793f2501df8bd5f6af62`. Reviewed tip after the reviewer's harness fix: `fb7ce875cc27ff8f43f488c85553b59f3ae837de`. Review time: 2026-10-01T23:21:17-05:00.

## Scope and integration check

- `git merge-base origin/main HEAD` was `d874e0beadf20ed2a031cdd522c54e8bfc634095`. `git diff --name-status <merge-base> HEAD` listed only `DEUS_Levels.js`, the two allowed system docs, the new lazy test and fixture, and files under `tasks/WG.CELL-WRITE/lane-dd/`. No path outside the launch's allowedPaths changed.
- `git fetch origin` exited 0. `git merge-tree --write-tree origin/main HEAD` exited 0 and returned `fa6e17fd272504344bcbe5755ff2828207fc745c`; `origin/main` was `3947eb5f3d6fabe243f500a630dda3d5a22514b5`. This is a merge simulation, not an integration or gate run.
- I read `BRIEF.md`, `REPORT.md`, the Levels implementation diff, the new harness, the fixture, and both system-doc diffs. The area output remains lazy and the checksum chain's lattice-before-strata order is preserved in `checksumOf`.

## Tests run in this review

- `node tools/test_lazy_area_generation.js`: exit 0, 15 passed, 0 failed after the harness fix. It reported eight generated home areas on the 3x3 New Game, no (1,0), and `lazy_equals_eager` passed for seeds 18 and 20260927 against the frozen checksum fixtures. The new `legacy_multi_area_migrates_after_verify` check passed: all nine saved sums matched the fixture, the migration was written once, and a flipped legacy checksum was reported without migration.
- `node tools/test_lazy_area_generation.js --from-rev=d8acc310`: exit 1, 4 passed, 10 failed. `ensure_generates_start_area_only` observed 45 baselines at the base. This run preceded the added migration check; the baseline's ten failures were named behavioral/API failures, not a missing module.
- Original named mutants `eager_ensure`, `record_not_saved`, `silent_replace`, `event_not_held`, `view_gated_generation`, `event_per_cache_fill`, `order_dependent_noise`, and `regenerate_twice`: each exited 1 on its named check. After I changed `regenerate_twice` to force a real second `generateBaseline` pass instead of copying the stats record, it again exited 1 on both `new_game_3x3_areas_attributed` and `new_game_3x3_cost_bound` (46.5 s).
- New mutant `legacy_migration_skipped`: exit 1 on `legacy_multi_area_migrates_after_verify` (0 passed, 1 failed). `node --check tools/test_lazy_area_generation.js`: exit 0.
- I opened `evidence/f5-tip-1x1-smoke-smoke.map.png` and `evidence/f5-tip-3x3-smoke-harness.on_failure.png`. Both show the Ground map with units and a banner. The 3x3 image is visibly darker; it does not establish that the test suite completed. I also read the paired base and tip 3x3 smoke results: both exited 2 after an 11,000 ms wait for 60 frames while `Scene_Map` was active. The tip 1x1 smoke result recorded 122 passed, 0 failed. I did not rerun NW.js in this review.

## Findings

- **MINOR — 3x3 in-engine suite remains incomplete.** The base and tip result files both say `HARNESS timed out after 11000 ms waiting for 60 frames` with `Scene_Map` active (`evidence/f5-base-3x3-smoke-results.txt`, `evidence/f5-tip-3x3-smoke-results.txt`). The screenshots show a ground map, but no completed 3x3 vertical suite. This is present at the base and outside the lane's allowed test-harness path; it limits playable proof rather than identifying a lane-dd regression.
- **MINOR — legacy migration coverage was missing; fixed in this review.** Before `fb7ce875`, `legacy_single_checksum_verifies` called `verifyLevels` directly and did not exercise `extractSaveContents` or `migrateLegacyAreaSums`. The added test covers a valid 3x3 migration, a repeated load, and a mismatched legacy checksum. Its `legacy_migration_skipped` mutant failed as intended. The existing `regenerate_twice` mutant now performs the second generation it claimed to model.

## Game translation

Class C, foundational. `DEUS_Levels.js` owns the lazy baseline request, core `areaSums`, and `levels:areaGenerated` event. WorldGen and Factions request home floors at simulation tick 0; the headless test observed nine homes in eight generated areas, with the non-home area absent. The existing `uf_levels_terrain` bridge painted the 1x1 ground in the writer's NW.js smoke evidence, which I inspected. A 3x3 map reached `Scene_Map` in that evidence but did not complete its suite. Event consumers and playable 3x3 grid integration are deferred to the lanes named in `REPORT.md`. Disk save/load was not checked; the headless `extractSaveContents` path was checked. Simulation scope passes; 3x3 player-facing status remains not yet playable on this evidence.

## Remaining limits

The other manifest gates and a fresh isolated clone were not run in this review; merge_gate is the integration authority. The writer's report lists base-and-tip vertical-suite failures and the 3x3 frame timeout, so those results are not claimed as lane-dd passes. No art was generated, requested, or integrated.

VERDICT: PASS WITH MINORS
