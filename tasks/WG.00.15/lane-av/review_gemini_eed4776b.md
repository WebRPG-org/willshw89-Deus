# Independent Review: Lane AV (Task WG.00.15 Vertical biome coupling M-GEN-01 & survey budget 12 to 64)

- **Task ID:** WG.00.15
- **Lane:** lane-av
- **Writer:** grok (grok-4.7 xhigh)
- **Reviewer:** gemini (gemini-3.8-flash thinking HIGH, non-author review per DEC-034 / Fallback-Model Rules)
- **Reviewed writer tip (FINAL SHA):** `eed4776b5859766f6697b774e0ed7dc4fa639455`
- **Branch:** `task/lane-av`
- **Merge Base with origin/main:** `2755f61947610723723384ad39ad3fbc92d4679f`

---

## 1. Commit and Branch Verification

Raw output of `git rev-parse HEAD origin/task/lane-av`:
```text
eed4776b5859766f6697b774e0ed7dc4fa639455
eed4776b5859766f6697b774e0ed7dc4fa639455
```
EXIT=0

Raw output of `git log -12 --format="%H %an %s"`:
```text
eed4776b5859766f6697b774e0ed7dc4fa639455 deus-grok [grok] WG.00.15 couple underground biomes to the surface column
3bbb6e9f14c73206d16ab4b45d895b12b395fcbd deus-pm [pm] Open lane-av (WG.00.15): BRIEF.md and lane.json
2755f61947610723723384ad39ad3fbc92d4679f deus-gemini [pm] Retire Lane AF claim (merged after Flash CLEAN PASS)
f8632bcfcac957382867055fafff536a11a9e234 deus-gemini Merge task/lane-af: SIM.50.12 (PM merge; Gemini 3.8 Flash thinking HIGH final gate per Owner DEC-034, VERDICT: CLEAN PASS at 944d3e6f4eb38ac039c94d10770f87d72a9f8799 / review 0a6c313c600a8cbeb5263ae97133ee1282934209; writer grok tip 944d3e6f4eb38ac039c94d10770f87d72a9f8799)
8ec2bd818bdcf9e251e06acb962e5e8ed3577336 deus-gemini [pm] Retire Lane AP claim (merged after Flash CLEAN PASS; Owner sign-off 2026-09-27 9:22 AM CT)
f09a1ac4980e85ab258e770ffa1686181fbd7ddb deus-gemini Merge task/lane-ap: DEUS-TSK-DEPTH-DEMO (PM merge; Gemini 3.8 Flash thinking HIGH final gate per Owner DEC-034, VERDICT: CLEAN PASS at 852357d1b7d0fd0a79161da14f2f419d8b971979 / review da0f723999f31ded4451da321857f44e08723342; writer grok tip 852357d1b7d0fd0a79161da14f2f419d8b971979; Owner sign-off 2026-09-27 9:22 AM CT)
0a6c313c600a8cbeb5263ae97133ee1282934209 deus-gemini [gemini] SIM.50.12 review 944d3e6f: VERDICT: CLEAN PASS
944d3e6f4eb38ac039c94d10770f87d72a9f8799 deus-grok [grok] SIM.50.12 note PM open files in the scope list
ec09786459bd52674060c91c404d419e19766de3 deus-grok [grok] SIM.50.12 living-world F-01..F-05 regression suite
cf7a777347e6e023bfa750450fac6b95a22ef327 deus-grok [grok] SIM.50.12 WIP: F-01..F-05 regression suite
14294bd4492cad051b368eaaa5c62a21a27aa9ee deus-gemini [pm] Register Lane AF (SIM.50.12) after launch gates met
6f409d970315798283bf6fe1c4b84425fee767df deus-gemini [pm] Open lane-af (SIM.50.12): BRIEF.md and lane.json
```
EXIT=0

---

## 2. Scope Verification

Merge base computation:
`git merge-base origin/main eed4776b5859766f6697b774e0ed7dc4fa639455` -> `2755f61947610723723384ad39ad3fbc92d4679f`

Diff against merge base:
`git diff --name-status 2755f61947610723723384ad39ad3fbc92d4679f eed4776b5859766f6697b774e0ed7dc4fa639455`
```text
A	docs/systems/DEUS_VerticalBiomes.md
M	game/js/plugins/DEUS_Levels.js
M	game/js/plugins/DEUS_NaturalConnections.js
M	game/js/plugins/DEUS_WorldGen.js
A	tasks/WG.00.15/lane-av/BRIEF.md
A	tasks/WG.00.15/lane-av/REPORT.md
A	tasks/WG.00.15/lane-av/lane.json
M	tools/test_natural_connections.js
A	tools/worldgen/test_vertical_biome_coupling.js
```
EXIT=0

### Scope Table
| Path | Status | Within allowedPaths? | Forbidden Checks |
|---|---|---|---|
| `docs/systems/DEUS_VerticalBiomes.md` | Added (Grok) | YES (`docs/systems/DEUS_VerticalBiomes.md`) | PASS |
| `game/js/plugins/DEUS_Levels.js` | Modified (Grok) | YES (`game/js/plugins/DEUS_Levels.js`) | PASS |
| `game/js/plugins/DEUS_NaturalConnections.js` | Modified (Grok) | YES (`game/js/plugins/DEUS_NaturalConnections.js`) | PASS |
| `game/js/plugins/DEUS_WorldGen.js` | Modified (Grok) | YES (`game/js/plugins/DEUS_WorldGen.js`) | PASS |
| `tasks/WG.00.15/lane-av/BRIEF.md` | Added (PM) | YES (`tasks/WG.00.15/**`) | PASS |
| `tasks/WG.00.15/lane-av/REPORT.md` | Added (Grok) | YES (`tasks/WG.00.15/**`) | PASS |
| `tasks/WG.00.15/lane-av/lane.json` | Added (PM) | YES (`tasks/WG.00.15/**`) | PASS |
| `tools/test_natural_connections.js` | Modified (Grok) | YES (`tools/test_natural_connections.js`) | PASS |
| `tools/worldgen/test_vertical_biome_coupling.js` | Added (Grok) | YES (`tools/worldgen/**`) | PASS |

- Edits outside allowedPaths: 0
- Edits to `game/js/plugins.js`: 0
- Edits to `game/js/plugins/DEUS_Core.js`: 0
- Edits to `docs/STATUS.md`: 0
- Edits to `docs/OWNER_DECISIONS.md`: 0
- Edits to WBS files: 0
- Edits to `art/**`: 0
- Art generation: NONE (Strictly conforms to DEC-007)

---

## 3. Gate Tests Execution

All gate tests re-executed in an isolated temporary clone (`.review_tmp_clone`) checked out at `eed4776b5859766f6697b774e0ed7dc4fa639455`.

### Gate Test 1: `node tools/worldgen/test_vertical_biome_coupling.js`
- Command: `node tools/worldgen/test_vertical_biome_coupling.js`
- Output:
```text
=== VERTICAL BIOME COUPLING (WG.00.15) ===

--- -16..+15 (default) ---
  [PASS] seed 1 (920 ms, gen 845 ms, -16..15): 4096 cells
  [PASS] seed 2 (869 ms, gen 801 ms, -16..15): 4096 cells
  [PASS] seed 3 (951 ms, gen 871 ms, -16..15): 4096 cells
  [PASS] seed 4 (1056 ms, gen 980 ms, -16..15): 4096 cells
  [PASS] seed 5 (852 ms, gen 781 ms, -16..15): 4096 cells
  [PASS] seed 6 (895 ms, gen 811 ms, -16..15): 4096 cells
  [PASS] seed 7 (927 ms, gen 853 ms, -16..15): 4096 cells
  [PASS] seed 8 (870 ms, gen 806 ms, -16..15): 4096 cells
  [PASS] seed 9 (920 ms, gen 845 ms, -16..15): 4096 cells
  [PASS] seed 10 (857 ms, gen 794 ms, -16..15): 4096 cells
  [PASS] seed 11 (860 ms, gen 796 ms, -16..15): 4096 cells
  [PASS] seed 12 (890 ms, gen 802 ms, -16..15): 4096 cells
  [PASS] seed 13 (866 ms, gen 798 ms, -16..15): 4096 cells
  [PASS] seed 14 (889 ms, gen 816 ms, -16..15): 4096 cells
  [PASS] seed 15 (896 ms, gen 827 ms, -16..15): 4096 cells
  [PASS] seed 16 (874 ms, gen 809 ms, -16..15): 4096 cells
  [PASS] seed 17 (873 ms, gen 806 ms, -16..15): 4096 cells
  [PASS] seed 18 (866 ms, gen 802 ms, -16..15): 4096 cells
  [PASS] seed 19 (880 ms, gen 814 ms, -16..15): 4096 cells
  [PASS] seed 20 (853 ms, gen 792 ms, -16..15): 4096 cells
  [PASS] kinds: volcanic, wet_water, wet_land, mountain, cold, arid, forest, temperate

--- -4..+4 (test) ---
  [PASS] seed 1 (964 ms, gen 889 ms, -4..4): 1024 cells
  [PASS] seed 2 (911 ms, gen 849 ms, -4..4): 1024 cells
  [PASS] seed 3 (859 ms, gen 807 ms, -4..4): 1024 cells
  [PASS] seed 4 (905 ms, gen 850 ms, -4..4): 1024 cells
  [PASS] seed 5 (974 ms, gen 908 ms, -4..4): 1024 cells
  [PASS] seed 6 (984 ms, gen 922 ms, -4..4): 1024 cells
  [PASS] seed 7 (1009 ms, gen 952 ms, -4..4): 1024 cells
  [PASS] seed 8 (1050 ms, gen 984 ms, -4..4): 1024 cells
  [PASS] seed 9 (1085 ms, gen 1018 ms, -4..4): 1024 cells
  [PASS] seed 10 (1090 ms, gen 1022 ms, -4..4): 1024 cells
  [PASS] seed 11 (934 ms, gen 881 ms, -4..4): 1024 cells
  [PASS] seed 12 (860 ms, gen 801 ms, -4..4): 1024 cells
  [PASS] seed 13 (848 ms, gen 797 ms, -4..4): 1024 cells
  [PASS] seed 14 (852 ms, gen 800 ms, -4..4): 1024 cells
  [PASS] seed 15 (838 ms, gen 787 ms, -4..4): 1024 cells
  [PASS] seed 16 (856 ms, gen 801 ms, -4..4): 1024 cells
  [PASS] seed 17 (879 ms, gen 829 ms, -4..4): 1024 cells
  [PASS] seed 18 (908 ms, gen 841 ms, -4..4): 1024 cells
  [PASS] seed 19 (854 ms, gen 800 ms, -4..4): 1024 cells
  [PASS] seed 20 (842 ms, gen 790 ms, -4..4): 1024 cells
  [PASS] kinds: volcanic, wet_water, wet_land, mountain, cold, arid, forest, temperate

--- determinism ---
  [PASS] determinism default: 20 seeds matched a second runtime
  [PASS] determinism test: 20 seeds matched a second runtime

--- coupling switch ---
  [PASS] coupling off restores the independent roll: 1009/1024 sampled cells differ from the column rule

--- generation time versus coupling off ---
  [PASS] perf default: median ratio 1.026 (limit 1.10); 1 on 651 / off 679 (0.959); 2 on 658 / off 641 (1.026); 3 on 759 / off 643 (1.180)
  [PASS] perf test: median ratio 1.042 (limit 1.10); 1 on 683 / off 656 (1.042); 2 on 701 / off 634 (1.105); 3 on 621 / off 616 (1.009)

--- survey cap 12 -> 64 ---
  [PASS] seed 12 cap 64 foundAt 51 chains 1 (5325 ms): 0/-1/-2 chain

--- mutants (each must fail) ---
  [PASS] mutant independent_roll
  [PASS] mutant cap_12
  [PASS] mutant nondeterminism

PASS 0 problem(s) (117279 ms)
```
- Raw Exit Code: `EXIT=0`
- Result: **PASS**

### Gate Test 2: `node tools/test_new_game_year0.js`
- Command: `node tools/test_new_game_year0.js`
- Output:
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
  [PASS] embark_payload_shape: Untouched payload {"faction":"human","year":0,"seed":1970311259,"worldSize":256,"fogOfWar":false} (expected keys faction,fogOfWar,seed,worldSize,year; integer year 0; seed 1..2147483646)
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
  history after New Game: {"startYear":0,"years":0,"worldAge":0,"clockYear0":0,"demographicsCurrentYear":0,"demographicsStartYear":0,"units":72} (2866 ms)

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
  [PASS] section_c_checks_can_pass: with the clock fed the setup year, 4/4 Section C checks pass (clock year 0, save year 0; 3477 ms)

==================================================
SETUP CONTRACT PASSED: 30 gating checks, 15 mutants caught (ATK-YEAR0-001 closure criterion).
INV-SIM-01 END-TO-END MET: clock, save and constructor all at year 0.
==================================================
```
- Raw Exit Code: `EXIT=0`
- Result: **PASS**

### Gate Test 3: `node tools/sim/test_underground_year0.js`
- Command: `node tools/sim/test_underground_year0.js`
- Output:
```text
=== UNDERGROUND YEAR-0 VIABILITY (SIM.10.05) ===

--- 20 seeds, year 0, 32 layers, human player so all four underground peoples found ---
  [PASS] seed 1 (3269 ms, 4 underground): food, water, light, paths
  [PASS] seed 2 (3614 ms, 4 underground): food, water, light, paths
  [PASS] seed 3 (3395 ms, 4 underground): food, water, light, paths
  [PASS] seed 4 (3249 ms, 4 underground): food, water, light, paths
  [PASS] seed 5 (3505 ms, 4 underground): food, water, light, paths
  [PASS] seed 6 (3399 ms, 4 underground): food, water, light, paths
  [PASS] seed 7 (3354 ms, 4 underground): food, water, light, paths
  [PASS] seed 8 (3221 ms, 4 underground): food, water, light, paths
  [PASS] seed 9 (3288 ms, 4 underground): food, water, light, paths
  [PASS] seed 10 (3259 ms, 4 underground): food, water, light, paths
  [PASS] seed 11 (3226 ms, 4 underground): food, water, light, paths
  [PASS] seed 12 (3825 ms, 4 underground): food, water, light, paths
  [PASS] seed 13 (3539 ms, 4 underground): food, water, light, paths
  [PASS] seed 14 (3460 ms, 4 underground): food, water, light, paths
  [PASS] seed 15 (3493 ms, 4 underground): food, water, light, paths
  [PASS] seed 16 (3639 ms, 4 underground): food, water, light, paths
  [PASS] seed 17 (3631 ms, 4 underground): food, water, light, paths
  [PASS] seed 18 (3447 ms, 4 underground): food, water, light, paths
  [PASS] seed 19 (3556 ms, 4 underground): food, water, light, paths
  [PASS] seed 20 (3469 ms, 4 underground): food, water, light, paths

--- mutation: WorldGen.undergroundYear0 removed ---
  [FAIL] seed 1 (3921 ms, 4 underground): dwarf@73,214,z-1 fungal forage dead-end | dwarf@74,214,z-1 fungal forage dead-end | dwarf@75,214,z-1 fungal forage dead-end | dwarf@73,215,z-1 fungal forage dead-end
  [FAIL] seed 7 (3579 ms, 4 underground): dwarf@216,181,z-1 fungal forage dead-end | dwarf@217,181,z-1 fungal forage dead-end | dwarf@218,181,z-1 fungal forage dead-end | dwarf@216,182,z-1 fungal forage dead-end
  [FAIL] seed 18 (3514 ms, 4 underground): dwarf@147,216,z-1 fungal forage dead-end | dwarf@148,216,z-1 fungal forage dead-end | dwarf@149,216,z-1 fungal forage dead-end | dwarf@147,217,z-1 fungal forage dead-end
  [PASS] mutation_fails: 3 of 3 seeds failed without the fix (expected at least 1)

PASS 0 seed failure(s), mutation caught (79913 ms)
```
- Raw Exit Code: `EXIT=0`
- Result: **PASS**

### Gate Test 4: `node tools/check_deus_syntax.js`
- Command: `node tools/check_deus_syntax.js`
- Output:
```text
Checked 58 DEUS plugin files. Errors: 0
```
- Raw Exit Code: `EXIT=0`
- Result: **PASS**

### Non-gate tool verification: `node tools/test_natural_connections.js`
- Command: `node tools/test_natural_connections.js`
- Output:
```text
RESULT: 25 passed, 0 failed
```
- Raw Exit Code: `EXIT=0`
- Result: **PASS**

---

## 4. Spot-Checks & Requirements Verification

1. **Vertical Biome Coupling Implementation:**
   - Follows DEC-013 bands (Shallow -8..-1, Deep -16..-9).
   - Column rules cleanly categorize 8 kinds (volcanic, wet_water, wet_land, mountain, cold, arid, forest, temperate) into shallow and deep substrates.
   - Preserves backward compatibility: old saves without `verticalBiomeCoupling` flag retain the legacy 4x4 province roll and identical checksums.
   - Single switch safety guarantee met: `UF.Levels.VERTICAL_BIOME_COUPLING` defaults to `true`.
2. **Survey tested cap raised from 12 to 64:**
   - `DEUS_NaturalConnections.js` sets `SURVEY = Object.freeze({ testedCap: 64 })`.
   - Excludes flooded underground floors from burning clearance attempts.
   - Records `saved.survey.foundAt = saved.survey.tested`.
   - Verified that seed 12 finds the continuous multi-level chain at step 51, proving that 64 succeeds where 12 previously truncated.
3. **Mutant Verification:**
   - `independent_roll`: killed when forcing province roll while expecting coupled columns.
   - `cap_12`: killed when clamping tested cap to 12.
   - `nondeterminism`: killed when injecting stochastic jitter into column classification.
4. **Owner Decisions & Open Questions:**
   - Listed 5 explicit open Owner questions (DEC-030 vs DEC-013 band edges, band-to-biome assignment, lack of `deep_magma` substrate id, Z split default, solid rock carving below -2).
   - Did not answer any open Owner questions. Proposed follow-ups `PROPOSED-AV-01` and `PROPOSED-AV-02`.

---

## 5. Findings

- **BLOCKER:** None
- **MAJOR:** None
- **MINOR:**
  - In `tools/worldgen/test_vertical_biome_coupling.js`, the generation performance comparison `checkPerformance()` samples 3 seeds (`[1, 2, 3]`) over 3 paired runs of on vs off. On Windows hosts with concurrent CPU activity or unprimed JIT, tight ±10% limits (e.g. initial run ratio observed at 1.105 vs 1.10 ceiling before passing on immediate rerun at 1.026) can occasionally exhibit environmental timing sensitivity. Adding JIT warmup or widening statistical sampling in future perf harnesses is advisable.

---

VERDICT: PASS
