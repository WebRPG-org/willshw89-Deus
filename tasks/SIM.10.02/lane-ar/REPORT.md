# SIM.10.02 lane-ar report

Writer: grok. This report does not mark the task DONE. The independent Gemini review decides.

Branch: `task/lane-ar`. Base named in the brief: `origin/main` `a6be423d54bd2f7d4b5a5f24f51bae73f978c4de`. No merge. No `DEUS_INTEGRATOR`. No art.

## What changed

- `tools/dev/sim_forward.js` — dev-only CLI. Loads a JSON save, or builds a seeded standard Year-0 world with the same plugin set as `tools/test_new_game_year0.js`, deep-copies it, and runs `UF.HistoricalDemographics.simulate` for N years on the copy. Writes `deus.sim_forward.v1` JSON to a new file. Prints years run, year, living population, and faction counts before and after, and the output path. Refuses to write the input path. Requiring the module does not simulate.
- `tools/sim/test_sim_forward_guard.js` — runs that CLI on the fixture, checks input bytes, compares the ledger to an in-process `HistoricalDemographics.simulate`, scans `game/` for a reference to the tool, and reruns a standard New Game (year 0, `history.simulated === false`). Mutants: write the input, drop the path refusal, skip the step, call `simulate` from the new-game listener, name the tool under `game/`.
- `tools/sim/fixtures/sim_forward/year0_seed_424242.json` — Year-0 snapshot for seed 424242 (`--seed 424242 --years 0`). sha256 `fa6000640426ec85de5e6d00bfae17d65a7001a3b7c77a04e7e993970a5f1a45`, 278561 bytes.
- `docs/systems/DEUS_SimForward.md` — usage, guarantees, limits.

No file outside the brief's allowedPaths was edited. `game/` was not modified. The tool is not in `game/js/plugins.js`.

The forward step is the annual demographic ledger (`UF.HistoricalDemographics.simulate`), the same step `UF.History.generate` runs when an aged world is built. N is not passed as `History.generate`'s `targetYear`. That argument is the new-game age. A seeded run builds `UF.NewGameSetup.year === 0` and steps only the copy. After the step, faction populations, `history.years`, `history.worldAge`, `history.simulated`, the living/graveyard id lists, and `history.events` are copied from the ledger the way `History.materialize` publishes them. Placed units and `history.rulers` are left as loaded.

On seed 424242, 3 years move living population 72 → 87 with the faction roster still 9. A 2-year run resumed for 2 more years matches a continuous 4-year run (year 4, living 89).

## Open Owner questions

None. This lane does not answer an open Owner question.

## Follow-ups (no WBS ids)

| Id | Follow-up | Why it is not in this lane |
|---|---|---|
| PROPOSED-AR-01 | Place the advanced population back into world units, or write a loadable `.rmmzsave`, so a playtester can open the aged world. | `History.materialize` returns without work once `materialization.complete` is set. Changing that is a `game/` edit, which this lane cannot make. |
| PROPOSED-AR-02 | Optional dev switches for the legacy site/war/ruin generator and for `History.iterateWorldHistory`, still not on the New Game path. | INV-SIM-01 and the current New Game path use the demographic ledger. Those other engines stay off. |
| PROPOSED-AR-03 | Accept a compressed `.rmmzsave` as `--input`. | The CLI reads and writes JSON. A raw world object or `{ ufWorld }` is accepted. The engine serializer is not invoked. |

## Gate evidence

Gates were run from the repo root on this implementation, before the commit that adds this report. The report file is not an input to any gate.

### `node tools/sim/test_sim_forward_guard.js`

Exit 0.

```text
=== SIM.10.02 sim_forward guard ===
fixture C:\Users\snewt\.deus_worktrees\lane-ar\tools\sim\fixtures\sim_forward\year0_seed_424242.json
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
  [PASS] mutant_game_references_tool_caught: C:\Users\snewt\AppData\Local\Temp\sim1002-FY9asr\hooked\game\js\plugins\DEUS_Hook.js
  [PASS] repo_fixture_untouched_at_end: fa6000640426ec85de5e6d00bfae17d65a7001a3b7c77a04e7e993970a5f1a45

==================================================
SIM.10.02 GUARD PASSED
==================================================
```

### `node tools/test_new_game_year0.js`

Exit 0. 30 gating checks, 15 mutants. Assertions were not changed.

```text
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
  [PASS] embark_payload_shape: Untouched payload {"faction":"human","year":0,"seed":1057652873,"worldSize":256,"fogOfWar":false} (expected keys faction,fogOfWar,seed,worldSize,year; integer year 0; seed 1..2147483646)
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
  history after New Game: {"startYear":0,"years":0,"worldAge":0,"clockYear0":0,"demographicsCurrentYear":0,"demographicsStartYear":0,"units":72} (2524 ms)

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
  [PASS] section_c_checks_can_pass: with the clock fed the setup year, 4/4 Section C checks pass (clock year 0, save year 0; 2861 ms)

==================================================
SETUP CONTRACT PASSED: 30 gating checks, 15 mutants caught (ATK-YEAR0-001 closure criterion).
INV-SIM-01 END-TO-END MET: clock, save and constructor all at year 0.
==================================================
```

### `node tools/check_deus_syntax.js`

Exit 0.

```text
Checked 52 DEUS plugin files. Errors: 0
```
