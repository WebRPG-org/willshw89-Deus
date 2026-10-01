# BRIEF: Lane CT (G05) — Rule-4 Test Failure Path Hardening (16 Files)

- **Task ID**: OPS.PRUNE.05
- **Lane**: lane-ct
- **Branch**: `task/lane-ct`
- **Writer**: codex
- **Reviewer**: grok
- **Directed by**: PM Directives MSG-PRUNE-PM-041 & MSG-PRUNE-PM-059
- **Allowed Paths**:
  - `docs/STATUS.md`
  - `tasks/OPS.PRUNE.05/lane-ct/**`
  - `tools/ops/active_lanes.json`
  - `tools/ops/pm_launch/test_top_models_effort.ps1`
  - `tools/test_all_animated_objects_live.js`
  - `tools/test_all_faction_menus.js`
  - `tools/test_creatures_ingame.js`
  - `tools/test_dwarves_ingame.js`
  - `tools/test_elves_ingame.js`
  - `tools/test_golden_art_review_live.js`
  - `tools/test_light_wall_occlusion_live.js`
  - `tools/test_sack_ui_and_loose_items.js`
  - `tools/test_standard_4d_ingame.js`
  - `tools/test_standard_8d_ingame.js`
  - `tools/test_temperate_arid_transition_live.js`
  - `tools/test_tilesets_live.js`
  - `tools/test_title_menu.js`
  - `tools/test_underground_room.js`
  - `tools/test_water_ingame.js`

## Objective & Binding Rules (MSG-PRUNE-PM-041 & Rule 4)

1. **Exact 16-File Scope (Sole Owner)**:
   - Remediate the failure paths of exactly 16 test harnesses identified in `tasks/PRUNE/readonly/R3_master_census.md` Section 1.
   - Do NOT prune, archive, or delete any files in this lane. Fix failure paths only.
   - `lane-ct` is the sole owner of these 16 files (G12 will exclude them).

2. **The 16 Files & Specific Defects**:
   1. `tools/test_all_animated_objects_live.js`: Launches live NW.js playtest via spawnSync but never checks child exit code, testResult.status, or test_output/results.txt. Must verify status !== 0 or results.txt contains FAIL/ERROR triggers non-zero exit.
   2. `tools/test_all_faction_menus.js`: Try/catch block swallows run_tests.js faction_menus execution failures and exits 0 unconditionally. Catch block must rethrow or exit(1).
   3. `tools/test_creatures_ingame.js`: Try/catch block swallows run_tests.js wildlife failures without setting non-zero exit code. Must propagate exit code.
   4. `tools/test_dwarves_ingame.js`: Try/catch block swallows run_tests.js smoke failures and exits 0. Must propagate non-zero exit code on failure.
   5. `tools/test_elves_ingame.js`: Try/catch block swallows run_tests.js smoke failures and exits 0. Must propagate non-zero exit code on failure.
   6. `tools/test_golden_art_review_live.js`: Rule 4 violation: hardcoded `true` assertion (`t.check("grass_batch1_rendered", true, ...)`). Must assert actual canvas content or screenshot presence; must propagate harness errors.
   7. `tools/test_light_wall_occlusion_live.js`: Injects test assertions but never checks `testResult.status` from `childProcess.spawnSync`. Must fail if child exits non-zero or fails.
   8. `tools/test_sack_ui_and_loose_items.js`: Empty 0-byte file stub that exits 0 unconditionally. Must implement concrete assertions testing `DEUS_Bag.js` contracts or fail appropriately.
   9. `tools/test_standard_4d_ingame.js`: Swallows harness errors and exits 0 unconditionally with no assertions. Must check child process status, results, and generated screenshot existence.
   10. `tools/test_standard_8d_ingame.js`: Swallows harness errors and exits 0 unconditionally with no assertions. Must check child process status, results, and generated screenshot existence.
   11. `tools/test_temperate_arid_transition_live.js`: Rule 4 violation: hardcoded `true` assertion (`t.check('temperate_arid_transition_verified', true, ...)`). Must verify actual tile metadata or map transition pixels.
   12. `tools/test_tilesets_live.js`: Swallows harness errors and exits 0 unconditionally without checking child process exit code. Must inspect child status and generated artifacts.
   13. `tools/test_title_menu.js`: Swallows errors and exits 0 unconditionally without checking screenshot capture result. Must verify title menu image artifact was created and non-empty.
   14. `tools/test_underground_room.js`: Swallows harness errors and exits 0 unconditionally without checking child process status or screenshot generation. Must inspect child exit and artifacts.
   15. `tools/test_water_ingame.js`: Swallows errors and exits 0 unconditionally without checking child process status or screenshot generation. Must inspect child exit and artifacts.
   16. `tools/ops/pm_launch/test_top_models_effort.ps1`: Prints status without test assertions or failure exits. Must add real assertions comparing model effort settings and exit with code 1 upon contract violations.

3. **Rule 4: Tests Must Be Able to Fail**:
   - Each negative fixture or failure path must break the contract under test and make the ordinary verifier fail.
   - A forced unconditional `exit(1)` is NOT a failure path. The failure must stem from a genuine failed check or assertion.
   - Verify that running each test against invalid or missing input prints `FAIL` and exits with code 1.

4. **Quality Gates**:
   - `node tools/check_deus_syntax.js` (0 errors)
   - `node tools/test_control_board.js` (CLEAN PASS, 0 errors)
   - `node tools/test_palette.js` (CLEAN PASS)
   - `node tools/governance/test_check_claims.js` (CLEAN PASS)

## GAME TRANSLATION

- **Player / World Effect**: Guarantees that automated verification and regression test harnesses for in-game mechanics (animated world objects, faction menus, wildlife, faction racial showcases, lighting/wall occlusion, inventory sacks, 4D/8D sprite rendering, biome transitions, tilesets, title screen, underground rooms, and water physics) actually fail when bugs occur, preventing broken world behavior from reaching the player.
- **Trigger**: Automated test execution, pre-merge validation gates, and CI regression runs.
- **Runtime Authority**: Test harness suite in `tools/`.
- **Simulation Path**: `tools/test_*.js` -> launches headless Node VM or NW.js engine instance -> asserts simulation/presentation contracts -> validates exit codes and artifact outputs.
- **Engine Bridge**: `tools/run_tests.js` and `game/js/plugins/DEUS_Test.js`.
- **Visible Result**: Test runners accurately distinguish broken features from working features; dev console and automated logs report real test failures when underlying systems break.
- **Persistence**: Code changes to test harnesses tracked in git repository.
- **Failure Without This Lane**: 16 test harnesses silently pass and report "all green" even when the engine is completely broken, game crashes, or visual assets fail to render.
- **Automated Proof**: Verification script demonstrating each of the 16 harnesses exits non-zero when subjected to defect-inducing fixtures.
- **In-Game Proof**: In-engine test runs (`npm test` / `run_tests.js`) reliably fail when injected with deliberate code faults.

### Translation Status
- Simulation implemented: NOT APPLICABLE (Test harness governance & hardening)
- Engine bridge implemented: YES (Harnesses interface with `DEUS_Test.js`)
- Presentation implemented: NOT APPLICABLE
- Input/player interaction implemented: NOT APPLICABLE
- Save/load implemented: NOT APPLICABLE
- Playable verification performed: YES (Live test harnesses run in NW.js and verify in-game moments)
