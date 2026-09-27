# Independent Review: Lane AR (Task SIM.10.02)

**Reviewer:** Gemini (non-author independent review)  
**Writer:** Grok (grok-4.7 xhigh)  
**Target Commit (FINAL SHA):** `67995fe8c91663029610e6313eb05be06d8a664e`  
**Merge Base:** `a6be423d54bd2f7d4b5a5f24f51bae73f978c4de` (`origin/main`)  
**Lane:** `lane-ar`  
**Branch:** `task/lane-ar`  

---

## 1. SHA and Branch Verification

```
git rev-parse HEAD origin/task/lane-ar
67995fe8c91663029610e6313eb05be06d8a664e
67995fe8c91663029610e6313eb05be06d8a664e

git log -12 --format="%H %an %s"
67995fe8c91663029610e6313eb05be06d8a664e deus-grok [grok] SIM.10.02 Add dev-only simulate-forward CLI
8e519fc519a51c84361cb9b150446bae4661b5b4 deus-pm [pm] Open lane-ar (SIM.10.02): BRIEF.md and lane.json
a6be423d54bd2f7d4b5a5f24f51bae73f978c4de deus-pm [pm] Retire Lane AD claim (merged); mark AN/AO/AP writers done
72c69b2f02adccad9a14653f5a5dd9db884a2f8e deus-pm Merge task/lane-ad: SIM.40.11 reclaim + ledger matter posts (PM merge; Gemini 3.8 Flash thinking HIGH final gate per Owner DEC-034, VERDICT: CLEAN PASS at 22ca41636638d47426f6f1d35b74586873c3800d / review d3beb517fd0218d1a86feca7cb5784f6c10ce46a; writer grok tip 22ca41636638d47426f6f1d35b74586873c3800d)
d3beb517fd0218d1a86feca7cb5784f6c10ce46a deus-gemini [gemini] SIM.40.11 review 22ca4163: VERDICT: CLEAN PASS
aa0385e3f7d0da79d9d666b591505071592798e0 deus-pm [pm] Retire Lane AE claim (merged); record Lane AD SIM.40.11 writer done at 22ca4163
2f97fae4199b1905484ba1343d5af899cd850e04 deus-pm Merge task/lane-ae: SIM.50.13 ore sprout + fluid attach fixes (PM merge; Gemini 3.8 Flash thinking HIGH final gate per Owner DEC-034, VERDICT: CLEAN PASS at ed0515bc44ce14a12e1c3760e3e2c3725e55e444 / review 0560a18bd5b103ac02db2b67563e16b8f87439a0; writer grok tip ed0515bc44ce14a12e1c3760e3e2c3725e55e444)
22ca41636638d47426f6f1d35b74586873c3800d deus-grok [grok] SIM.40.11 Post matter moves and outdoor reclamation through the mass ledger
0560a18bd5b103ac02db2b67563e16b8f87439a0 deus-gemini [gemini] SIM.50.13 review ed0515bc: CLEAN PASS
91840b91f17bc6f4bf8c622266890a820b3709c9 snewt [gemini] Record Lane AE SIM.50.13 Grok writer completion at ed0515bc; review pending
6056283a5c483c92c98c2fb32205fedfa36a1d76 snewt [gemini] 0122-DR: Record DEC-034 Owner Flash final merge gate ruling
ed0515bc44ce14a12e1c3760e3e2c3725e55e444 deus-grok [grok] SIM.50.13 Stop loose stones maturing into ore and bind the fluid solver
```

Target commit tip is verified as `67995fe8c91663029610e6313eb05be06d8a664e`.

---

## 2. Scope and Allowed Paths Verification

Merge base with `origin/main`: `a6be423d54bd2f7d4b5a5f24f51bae73f978c4de`.

### Raw `git diff --name-status a6be423d54bd2f7d4b5a5f24f51bae73f978c4de 67995fe8c91663029610e6313eb05be06d8a664e`

```
A	docs/systems/DEUS_SimForward.md
A	tasks/SIM.10.02/lane-ar/BRIEF.md
A	tasks/SIM.10.02/lane-ar/REPORT.md
A	tasks/SIM.10.02/lane-ar/lane.json
A	tools/dev/sim_forward.js
A	tools/sim/fixtures/sim_forward/year0_seed_424242.json
A	tools/sim/test_sim_forward_guard.js
```

### Scope Comparison Table

| Path | Status | Allowed by lane.json | Notes |
|---|---|---|---|
| `docs/systems/DEUS_SimForward.md` | Added | Yes (`docs/systems/DEUS_SimForward.md`) | Documentation for dev-only CLI usage and invariants |
| `tasks/SIM.10.02/lane-ar/BRIEF.md` | Added | Yes (`tasks/SIM.10.02/**`) | Lane brief |
| `tasks/SIM.10.02/lane-ar/REPORT.md` | Added | Yes (`tasks/SIM.10.02/**`) | Writer report |
| `tasks/SIM.10.02/lane-ar/lane.json` | Added | Yes (`tasks/SIM.10.02/**`) | Lane configuration |
| `tools/dev/sim_forward.js` | Added | Yes (`tools/dev/sim_forward.js`) | Standalone dev-only simulate-forward CLI |
| `tools/sim/fixtures/sim_forward/year0_seed_424242.json` | Added | Yes (`tools/sim/fixtures/sim_forward/**`) | Seed 424242 Year-0 snapshot fixture |
| `tools/sim/test_sim_forward_guard.js` | Added | Yes (`tools/sim/test_sim_forward_guard.js`) | Guard test verifying isolation, copy invariance, and mutants |

### Prohibited Path Verification
- `docs/STATUS.md`: NOT modified.
- `docs/OWNER_DECISIONS.md`: NOT modified.
- WBS files (`DEUS_WORLDGEN_WBS.md`, etc.): NOT modified.
- `game/js/plugins.js`: NOT modified.
- `game/js/plugins/DEUS_Core.js`: NOT modified.
- `game/**`: NOT modified (0 engine or plugin changes; completely isolated dev tool).
- `art/**` / `game/img/**`: NOT modified (0 art generated/modified, adhering to DEC-007).
- No files modified outside `allowedPaths`.

---

## 3. Fresh Clone Gate Test Execution

All gate tests were executed in a fresh isolated temporary clone (`.review_tmp_clone`) detached at `67995fe8c91663029610e6313eb05be06d8a664e`. The clone was deleted after verification.

### Test A: `node tools/sim/test_sim_forward_guard.js`
```
=== SIM.10.02 sim_forward guard ===
fixture C:\Users\snewt\.deus_worktrees\lane-ar\.review_tmp_clone\tools\sim\fixtures\sim_forward\year0_seed_424242.json
fixture sha256 fa6000640426ec85de5e6d00bfae17d65a7001a3b7c77a04e7e993970a5f1a45 (278561 bytes)
  [PASS] require_does_not_run_the_cli: requiring the CLI exports the library and does not simulate
  [PASS] parse_rejects_unknown_argument: unknown argument rejected

--- Section A: CLI on the Year-0 fixture ---
  [PASS] reference_population_grows: independent 3-year simulate: living 72 -> 87, year 3, yearsSimulated 3
  [PASS] cli_forward_exits_0: exit 0
  [PASS] input_bytes_unchanged: input sha256 fa6000640426ec85de5e6d00bfae17d65a7001a3b7c77a04e7e993970a5f1a45
  [PASS] forward_matches_demographic_simulate: population 72 -> 87, factions 9 -> 9
  [PASS] repo_fixture_untouched_after_forward: fa6000640426ec85de5e6d00bfae17d65a7001a3b7c77a04e7e993970a5f1a45
  [PASS] zero_years_keeps_year_0: simulated false, population 72
  [PASS] resume_two_plus_two_matches_four: year 4, population 89
  [PASS] refuses_to_write_over_input: exit 1, stderr sim_forward: refusing to write over the input save
  [PASS] help_exits_0: exit 0
  [PASS] missing_args_exit_1: exit 1
  [PASS] seed_year0_matches_fixture: seed snapshot byte-matches the fixture
  [PASS] seed_then_forward_matches_fixture_forward: same 3-year ledger as the fixture copy

--- Section B: New Game never calls simulate-forward ---
  [PASS] game_tree_does_not_reference_the_tool: no sim_forward or DEUS_SimForward reference under game/
  [PASS] standard_new_game_is_year_0_unsimulated: clock 0, simulated false, yearsSimulated 0, currentYear 0, errors 0
  [PASS] scanner_ignores_unrelated_game_text: unrelated file not flagged

--- Section C: mutants ---
  [PASS] mutant_write_in_place_caught: input bytes changed
  [PASS] mutant_overwrite_refusal_removed_caught: same path overwrote the input
  [PASS] mutant_skip_simulate_caught: forward check failed (yearsSimulated 0 != 3; currentYear 0 != 3; ledger hash; simulated flag; summary year)
  [PASS] mutant_new_game_calls_simulate_caught: clock 0, simulated true, yearsSimulated 2, currentYear 2
  [PASS] mutant_game_references_tool_caught: C:\Users\snewt\AppData\Local\Temp\sim1002-YZaBnh\hooked\game\js\plugins\DEUS_Hook.js
  [PASS] repo_fixture_untouched_at_end: fa6000640426ec85de5e6d00bfae17d65a7001a3b7c77a04e7e993970a5f1a45

==================================================
SIM.10.02 GUARD PASSED
==================================================
EXIT: 0
```

### Test B: `node tools/test_new_game_year0.js`
```
=== DEUS NEW GAME YEAR 0 TEST SUITE (INV-SIM-01 / ATK-YEAR0-001) ===

--- Section A: setup window and embark payload (DEUS_FactionMenus.js) ---
  [PASS] window_default_year_is_0: Window_NewGameSetup.currentYear() === 0 (expected 0)
  [PASS] embark_year_is_0: UF.NewGameSetup.year === 0 on untouched embark (expected 0)
  [PASS] fallback_embark_year_is_0: Fallback UF.NewGameSetup.year === 0 when window is null (expected 0)
  [PASS] key_left_at_0_stays_0: Left arrow at year 0 -> year 0, box "0", 0 cursor sounds (expected 0, "0", 0)
  [PASS] key_shift_left_clamps_to_0: Shift+Left from year 5 -> year 0, box "0" (expected 0, "0")
  [PASS] key_pagedown_clamps_to_0: PageDown from 3 -> 0, again -> 0 (expected 0, 0)
  [PASS] key_left_reaches_0_from_1: Left arrow from year 1 -> 0 (expected 0)
  [PASS] key_right_left_round_trip: 0 -> Right -> 1 -> Left -> 0 (expected 1, 0)
  [PASS] key_shift_right_clamps_999: Shift+Right from 995 -> 999 (expected 999)
  [PASS] set_year_0_is_0: setYear(0) -> 0, box "0" (expected 0, "0")
  [PASS] set_year_negative_clamps_0: setYear(-10) -> 0 (expected 0)
  [PASS] set_year_non_numeric_is_0: setYear("abc"/undefined/null/"") -> 0/0/0/0 (expected 0/0/0/0)
  [PASS] set_year_over_999_clamps: setYear(1200) -> 999 (expected 999)
  [PASS] typed_0_sets_year_0: Typing "0" over 42 -> _year 0, currentYear 0 (expected 0, 0)
  [PASS] blur_empty_box_is_0: Clearing the box then leaving it -> 0, box "0" (expected 0, "0")
  [PASS] blur_negative_or_garbage_is_0: Leaving the box holding "-5"/"abc" -> 0/0 (expected 0/0)
  [PASS] box_0_overrides_stale_year: Box "0" with stale _year 42 -> currentYear 0 (expected 0)
  [PASS] embark_payload_shape: Untouched payload {"faction":"human","year":0,"seed":1184261701,"worldSize":256,"fogOfWar":false} (expected keys faction,fogOfWar,seed,worldSize,year; integer year 0; seed 1..2147483646)
  [PASS] embark_payload_json_round_trip: JSON round trip of payload -> year 0 (expected 0, key present)
  [PASS] embark_calls_setup_new_game_once: DataManager.setupNewGame called 1 times on one embark (expected 1)
  [PASS] typed_then_decremented_embarks_0: Typed 3, Left x4, Start -> payload year 0 (expected 0)
  [PASS] embark_with_box_still_focused_is_0: Typed 12 then 0, Start without leaving the box -> payload year 0, box destroyed true (expected 0, true)

--- Section B: clock save/load keeps year 0 (DEUS_Core.js) ---
  [PASS] save_writes_year_0: makeSaveContents at year 0 -> deusTime.year 0, ufTime.year 0 (expected 0, 0)
  [PASS] load_restores_year_0: extractSaveContents of a year-0 save over clock year 7 -> 0 (expected 0)
  [PASS] legacy_uftime_save_restores_year_0: extractSaveContents of a legacy ufTime-only year-0 save -> 0 (expected 0)
  [PASS] core_loaded_without_errors: console.error calls while loading DEUS_Core: 0 (expected 0)

--- Section C: headless New Game fed the Section A payload (DEUS_Core.js, DEUS_History.js) ---
  [PASS] new_game_pipeline_ran: world:created listeners built history (true) with 0 console errors
  [PASS] new_game_clock_year_is_0: Clock year after a Year 0 New Game: 0 (expected 0)
  [PASS] new_game_save_year_is_0: deusTime.year in the first save of a Year 0 New Game: 0 (expected 0)
  [PASS] clock_constructor_keeps_year_0: new Game_DEUSTime() with UF.NewGameSetup.year 0: year 0 (expected 0)
  history after New Game: {"startYear":0,"years":0,"worldAge":0,"clockYear0":0,"demographicsCurrentYear":0,"demographicsStartYear":0,"units":72} (2519 ms)

--- Section D: Rule 4 mutation checks ---
  [PASS] mutant default_year_1 caught: 5 failing checks, targeted: window_default_year_is_0, embark_year_is_0
  [PASS] mutant fallback_year_1 caught: 1 failing checks, targeted: fallback_embark_year_is_0
  [PASS] mutant change_year_floor_1 caught: 6 failing checks, targeted: key_left_reaches_0_from_1
  [PASS] mutant change_year_no_floor caught: 4 failing checks, targeted: key_left_at_0_stays_0, key_shift_left_clamps_to_0
  [PASS] mutant set_year_floor_1 (pre-hardening code) caught: 4 failing checks, targeted: set_year_0_is_0
  [PASS] mutant current_year_ignores_box_0 (pre-hardening code) caught: 1 failing checks, targeted: box_0_overrides_stale_year
  [PASS] mutant typed_year_floor_1 caught: 2 failing checks, targeted: typed_0_sets_year_0
  [PASS] mutant blur_floor_1 caught: 2 failing checks, targeted: blur_empty_box_is_0, blur_negative_or_garbage_is_0
  [PASS] mutant payload_year_as_string caught: 6 failing checks, targeted: embark_payload_shape
  [PASS] mutant payload_drops_year_0 caught: 6 failing checks, targeted: embark_payload_json_round_trip
  [PASS] mutant save_coerces_year_0_to_1 caught: 2 failing checks, targeted: save_writes_year_0
  [PASS] mutant load_coerces_year_0_to_1 caught: 2 failing checks, targeted: load_restores_year_0, legacy_uftime_save_restores_year_0
  [PASS] mutant core_restores_or_1 (pre-ATK-YEAR0-002 code) caught: 1 failing checks, targeted: clock_constructor_keeps_year_0
  [PASS] mutant history_founds_year_0_at_1 caught: 2 failing checks, targeted: new_game_clock_year_is_0, new_game_save_year_is_0
  [PASS] mutant history_clock_floor_1 caught: 2 failing checks, targeted: new_game_clock_year_is_0, new_game_save_year_is_0
  [PASS] section_c_checks_can_pass: with the clock fed the setup year, 4/4 Section C checks pass (clock year 0, save year 0; 2803 ms)

==================================================
SETUP CONTRACT PASSED: 30 gating checks, 15 mutants caught (ATK-YEAR0-001 closure criterion).
INV-SIM-01 END-TO-END MET: clock, save and constructor all at year 0.
==================================================
EXIT: 0
```

### Test C: `node tools/check_deus_syntax.js`
```
Checked 52 DEUS plugin files. Errors: 0
EXIT: 0
```

---

## 4. Verification of Implementation Details and Claims

1. **Dev-Only Architecture & New Game Separation (INV-SIM-01):**
   - `tools/dev/sim_forward.js` is a command-line utility. It is not registered in `game/js/plugins.js` and introduces no plugin files under `game/js/plugins/`.
   - The test suite's `scanGame` affirmatively verifies that no file in the `game/` tree references `sim_forward` or `DEUS_SimForward`.
   - New Game execution remains strictly at Year 0 (`history.simulated === false`, `history.demographics.yearsSimulated === 0`, `clock === 0`).
2. **Copy Isolation & Overwrite Safeguard:**
   - The input save file is never written in place. A SHA256 integrity check confirms the input file is bit-for-bit identical before and after simulation runs.
   - `assertDistinctPaths` correctly resolves realpaths and case-insensitive paths (on win32) to refuse attempts to overwrite the input file.
3. **Simulation Mechanics & State Projection:**
   - History advancement operates on a deep clone via `UF.HistoricalDemographics.simulate(demographics, years)`.
   - State projection (`publish`) updates `factions.list[].population`, `history.years`, `history.worldAge`, `history.simulated`, living/graveyard demographic indices, and chronicle events in the standard materialized format, leaving unit placement and rulers intact as specified.
   - Resuming simulation (e.g. 2 years + 2 years) perfectly matches continuous runs (4 years).
4. **Decisions and Policies:**
   - DEC-007 (Art Freeze): 0 art generated, modified, or requested.
   - DEC-011 (Engine Core Read-Only): No core files modified.
   - DEC-027 SRD 5.1: No D&D product-identity issues.
   - No WBS modifications or premature state transitions.

---

## 5. Findings

- **BLOCKER:** None
- **MAJOR:** None
- **MINOR:** None

---

## 6. Verdict

VERDICT: CLEAN PASS
