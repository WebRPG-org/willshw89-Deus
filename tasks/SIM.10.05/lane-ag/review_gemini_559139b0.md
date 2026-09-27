# Independent Review: SIM.10.05 Underground Year-0 viability (PGA DEEP-06)

- **Task:** SIM.10.05
- **Lane:** lane-ag
- **Writer:** grok
- **Reviewer:** gemini (gemini-3.8-flash thinking HIGH per Owner DEC-034 final merge gate ruling)
- **Reviewed Tip Commit:** `559139b0ca3e9c6205e3fb6be6e47f43cedf9ec8`
- **Branch:** `task/lane-ag`

---

## 1. Git Confirmation & SHA Verification

Verification of git HEAD and `origin/task/lane-ag`:
```
$ git rev-parse HEAD origin/task/lane-ag
559139b0ca3e9c6205e3fb6be6e47f43cedf9ec8
559139b0ca3e9c6205e3fb6be6e47f43cedf9ec8

$ git log -12 --format="%H %an %s"
559139b0ca3e9c6205e3fb6be6e47f43cedf9ec8 deus-grok [grok] SIM.10.05 Underground Year-0 camps can reach forage and water
fc8d96bf25eec91ec003334370975e6e101fefe3 deus-pm [pm] Open lane-ag (SIM.10.05): BRIEF.md and lane.json
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

---

## 2. Scope & Constraint Verification

Merge base with `origin/main`:
```
$ git merge-base origin/main 559139b0ca3e9c6205e3fb6be6e47f43cedf9ec8
a6be423d54bd2f7d4b5a5f24f51bae73f978c4de
```

Name-status diff against merge base:
```
$ git diff --name-status a6be423d54bd2f7d4b5a5f24f51bae73f978c4de 559139b0ca3e9c6205e3fb6be6e47f43cedf9ec8
M	game/js/plugins/DEUS_Colonists.js
M	game/js/plugins/DEUS_WorldGen.js
A	tasks/SIM.10.05/lane-ag/BRIEF.md
A	tasks/SIM.10.05/lane-ag/REPORT.md
A	tasks/SIM.10.05/lane-ag/lane.json
A	tools/sim/test_underground_year0.js
```

### Scope Compliance Table

| Path | Status | Allowed by `lane.json`? | Notes |
|---|---|---|---|
| `game/js/plugins/DEUS_Colonists.js` | Modified | YES | Filters out lava from drinking search (`isWaterAt` check) |
| `game/js/plugins/DEUS_WorldGen.js` | Modified | YES | Implements `WorldGen.undergroundYear0` (settle, plantFloor, quietLava, placeKit) |
| `tasks/SIM.10.05/lane-ag/BRIEF.md` | Added | YES | Lane AG brief |
| `tasks/SIM.10.05/lane-ag/REPORT.md` | Added | YES | Lane AG report |
| `tasks/SIM.10.05/lane-ag/lane.json` | Added | YES | Lane specification |
| `tools/sim/test_underground_year0.js` | Added | YES | 20-seed headless test harness with Rule 4 mutation check |

### Forbidden Paths Check
- `docs/STATUS.md`: Untouched.
- `*WBS*.md`: Untouched.
- `docs/OWNER_DECISIONS.md`: Untouched.
- `game/js/plugins.js`: Untouched.
- `game/js/plugins/DEUS_Core.js`: Untouched.
- `art/**`: Untouched (DEC-007 NO ART observed).
- No edits outside `allowedPaths`.

---

## 3. Gate Test Execution in Isolated Temporary Clone

Executed in a detached clone at commit `559139b0ca3e9c6205e3fb6be6e47f43cedf9ec8`.

### a. `node tools/sim/test_underground_year0.js`
```
=== UNDERGROUND YEAR-0 VIABILITY (SIM.10.05) ===

--- 20 seeds, year 0, 32 layers, human player so all four underground peoples found ---
  [PASS] seed 1 (2938 ms, 4 underground): food, water, light, paths
  [PASS] seed 2 (3139 ms, 4 underground): food, water, light, paths
  [PASS] seed 3 (2966 ms, 4 underground): food, water, light, paths
  [PASS] seed 4 (2962 ms, 4 underground): food, water, light, paths
  [PASS] seed 5 (3025 ms, 4 underground): food, water, light, paths
  [PASS] seed 6 (3014 ms, 4 underground): food, water, light, paths
  [PASS] seed 7 (2905 ms, 4 underground): food, water, light, paths
  [PASS] seed 8 (2873 ms, 4 underground): food, water, light, paths
  [PASS] seed 9 (2910 ms, 4 underground): food, water, light, paths
  [PASS] seed 10 (2974 ms, 4 underground): food, water, light, paths
  [PASS] seed 11 (2887 ms, 4 underground): food, water, light, paths
  [PASS] seed 12 (2811 ms, 4 underground): food, water, light, paths
  [PASS] seed 13 (2926 ms, 4 underground): food, water, light, paths
  [PASS] seed 14 (2905 ms, 4 underground): food, water, light, paths
  [PASS] seed 15 (2857 ms, 4 underground): food, water, light, paths
  [PASS] seed 16 (2919 ms, 4 underground): food, water, light, paths
  [PASS] seed 17 (2902 ms, 4 underground): food, water, light, paths
  [PASS] seed 18 (2879 ms, 4 underground): food, water, light, paths
  [PASS] seed 19 (2791 ms, 4 underground): food, water, light, paths
  [PASS] seed 20 (2841 ms, 4 underground): food, water, light, paths

--- mutation: WorldGen.undergroundYear0 removed ---
  [FAIL] seed 1 (3087 ms, 4 underground): dwarf@73,214,z-1 fungal forage dead-end | dwarf@74,214,z-1 fungal forage dead-end | dwarf@75,214,z-1 fungal forage dead-end | dwarf@73,215,z-1 fungal forage dead-end
  [FAIL] seed 7 (3072 ms, 4 underground): dwarf@216,181,z-1 fungal forage dead-end | dwarf@217,181,z-1 fungal forage dead-end | dwarf@218,181,z-1 fungal forage dead-end | dwarf@216,182,z-1 fungal forage dead-end
  [FAIL] seed 18 (2938 ms, 4 underground): dwarf@147,216,z-1 fungal forage dead-end | dwarf@148,216,z-1 fungal forage dead-end | dwarf@149,216,z-1 fungal forage dead-end | dwarf@147,217,z-1 fungal forage dead-end
  [PASS] mutation_fails: 3 of 3 seeds failed without the fix (expected at least 1)

PASS 0 seed failure(s), mutation caught (67576 ms)
EXIT: 0
```

### b. `node tools/test_new_game_year0.js`
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
  [PASS] embark_payload_shape: Untouched payload {"faction":"human","year":0,"seed":1351588978,"worldSize":256,"fogOfWar":false} (expected keys faction,fogOfWar,seed,worldSize,year; integer year 0; seed 1..2147483646)
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
  history after New Game: {"startYear":0,"years":0,"worldAge":0,"clockYear0":0,"demographicsCurrentYear":0,"demographicsStartYear":0,"units":72} (2596 ms)

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
  [PASS] section_c_checks_can_pass: with the clock fed the setup year, 4/4 Section C checks pass (clock year 0, save year 0; 2877 ms)

==================================================
SETUP CONTRACT PASSED: 30 gating checks, 15 mutants caught (ATK-YEAR0-001 closure criterion).
INV-SIM-01 END-TO-END MET: clock, save and constructor all at year 0.
==================================================
EXIT: 0
```

### c. `node tools/check_deus_syntax.js`
```
Checked 52 DEUS plugin files. Errors: 0
EXIT: 0
```

---

## 4. Spot-Check of Report Claims Against Implementation

1. **Subterranean Species Mapping (OQ-23 preserved):**
   - Dwarves & Gnomes on -1, Tieflings & Dragonborn on -2.
   - Verified that `DEUS_Factions.js` layer mapping was untouched.
2. **Year-0 Subterranean Ecology & Conservation of Matter:**
   - Dry strata cells under drinking flood are utilized for fungal minimums.
   - Forage relocated onto walkable camp components utilizes fungi already generated on the level.
   - Lava flooding over camp 3x3 areas on z = -2 is quenched by swapping water strata from distant shallow (z = -1) pools into deep pools, converting lethal lava flood into drinkable water flood.
   - Dragonborn (SRD 5.1 darkvision: 0 ft) have reachable glow-cap illumination placed outside the chest clearing.
3. **Colonist Behavior:**
   - In `DEUS_Colonists.js`, `isWaterAt` now excludes cells where `UF.Levels.isLavaAt` returns true, preventing colonists from attempting to drink lava.
4. **Empirical Mutation Test:**
   - Disabling `WorldGen.undergroundYear0` produced reproducible failures on seeds 1, 7, and 18, demonstrating that the test genuinely gates on the functionality.

---

## 5. Findings

- **BLOCKER:** None
- **MAJOR:** None
- **MINOR:** None

---

## 6. Verdict

VERDICT: CLEAN PASS
