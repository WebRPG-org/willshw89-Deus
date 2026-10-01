# NAT.02.MASS lane-do Z-range gate repair — 2026-10-01

Writer: Codex. Review and integration: pending independent family review and PM merge gate.

The earlier `5255f1a5` fixture remains the 1 ft blast and legacy-save reference. Later world-generation commits changed the core cells and object census before this lane's mass conversion. The pinned `geology_304ca7b2_seed18.json` reference records each Z configuration's core hashes and New Game / 1500-update census from the committed `zrange-tip` reports at `6e002849`; `git diff --name-only 6e002849..304ca7b2` shows only the independent review file, so game code is identical at the reference commit. The reference has no elapsed-time fields.

`sparse_memory` now predicts the exact mixed outer chunks from cap columns and eligible deep-cut columns, and still checks the memory bound and the single-chunk split/revert. `old_layers_identical` and `matter_unchanged` compare each Z configuration with its pinned post-geology reference. The matter comparison includes outer strata as well as core strata, cap rock, objects, items, units and ledger checksums.

## Observed checks

- `node tools/test_zrange.js --jobs=3 --evidence=tasks/NAT.02.MASS/lane-do/evidence/zrange-fix`: exit 0, `RESULT: 10 passed, 0 failed (exit 0)`. The driver copied each phase's report, results text and play screenshots into the evidence subfolders. Its aggregate JSON report was copied from the system temp directory to `zrange_report.json` here.
- `node tools/test_zrange.js --provoke=outer_dense,generator_changed,matter_destroyed --jobs=3`: exit 0, `PROVOCATIONS: 3/3 caught`. The respective named checks became `FAIL sparse_memory`, `FAIL old_layers_identical`, and `FAIL matter_unchanged`. The matter mutant changed `strata.1` from 390890 to 390885 at New Game and after 1500 updates, and changed the ledger checksum from `ce5a214c` to `e146d5a0`.
- `node tools/check_deus_syntax.js`: exit 0, 62 DEUS plugin files, 0 errors.
- `node tools/zrange/scan_z_literals.js`: exit 0, 139 allowed lines, 0 not allowed, 0 stale entries.
- `node --check` on the three edited JS files and `git diff --check`: exit 0.
- Separate JSON comparison: each run's outer census equals the pinned reference at New Game and after 1500 updates for all three ranges. This covers the small outer-census comparison added after the full NW.js run.

All six screenshots copied by this run were opened. At +4 and +15, the walker stands on a rectangular wooden deck against a black field. At -4 and -16, the walker stands inside a dark stone room. At +2, the deck sits among grass, trees and many standing people; at -2, the walker stands in a dark blue stone chamber. The level plates show the named Z values. Game code has not changed in this repair. Native editor F5 and F8 were not run; DEC-059 keeps the editor closed during the natural-world build.

## GAME TRANSLATION

WBS / Lane: NAT.02.MASS / lane-do. Approved scope: Owner's 2026-10-01 direct request to repair the three checks. Writer SHA: the commit containing this report (exact SHA in the writer handoff). Evidence date: 2026-10-01. Translation class: C, foundational test tooling.

- Player / World Effect: no new runtime behavior; the gate now detects changes to generated layers, sparse storage, and matter census against the current world reference.
- Trigger: running `node tools/test_zrange.js` in the test harness.
- Runtime Authority: `UF.Levels` owns strata/chunks; `UF.World` owns Z range and world state; `game/js/sim/ledger.js` supplies the test's mass ledger.
- Simulation Path: `tools/zrange/zrange_suite.js` samples the running game; `tools/test_zrange.js` evaluates the samples against `tools/zrange/fixtures/geology_304ca7b2_seed18.json`.
- Engine Bridge: existing `UF.Levels` / `UF.World` RMMZ plugins are exercised by `tools/run_tests.js` in NW.js snapshots; this repair adds no bridge.
- Visible Result: test play phases show extreme levels and movement; the six screenshots from this run described above were inspected, while a new editor F5 playtest was not performed.
- Persistence: the existing sparse-save and legacy-save checks both passed in the full suite; no save schema changed here.
- Failure Without This Lane: a red gate from obsolete assumptions prevents review of the mass lane and obscures future actual Z-range regressions.
- Automated Proof: the full 10/0 run and all three caught provocations listed above; the copied JSON report holds the run's per-range data.
- In-Game Proof: NW.js snapshot play phase passed in all three ranges. Native RMMZ editor F5: NOT RUN.
- CONSUMED BY GAME SYSTEMS: the gate checks the `UF.Levels` chunk/strata data used by world rendering and save/load, and the ledger projection of the census; corruption would change visible terrain or persisted mass. `extreme_layers_work` and `legacy_save_loads` are the existing consumer integration checks.

GAME BRIDGE STATUS: Simulation implemented: YES, pre-existing engine behavior under test. Engine bridge implemented: YES, pre-existing NW.js/RMMZ plugins. Presentation implemented: YES, pre-existing extreme-layer view. Input/player interaction implemented: YES, pre-existing movement in the play check. Save/load implemented: YES, pre-existing and checked here. Playable verification performed: NO, native editor F5 not run. Remaining step before lane closure: independent family review, fresh-clone manifest gates, and PM merge gate; native editor proof remains open under the project's broader playtest rules.
