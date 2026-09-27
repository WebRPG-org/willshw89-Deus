# SIM.10.05 Underground Year-0 viability — lane-ag report

Writer: grok. Not a certification. An independent review decides.

## What changed

Underground founders are the four peoples `DEUS_Factions.js` still places below ground: dwarves and gnomes on -1, tieflings and dragonborn on -2. That mapping was not changed (OQ-23).

On a fresh Year-0 world the camp floor is often covered by flood water. The underground flora pass treated every flooded cell as a pool, so the kit's mushrooms and glow-caps never landed in the camp's walk, and some founder squares sat in lava flood from the deep pool. `DEUS_WorldGen.js` (`WorldGen.undergroundYear0`) now:

- Places the underground kit's own fungal minimums (cave mushrooms, glow-caps) on floor whose strata are dry, including floor under drinking flood. Minerals and blocking props stay on unflooded floor.
- If a camp still has no fungal food outside the 3×3 the chest clear wipes, moves a fungus the level already grew onto a walkable cell beside the camp. Same for a glow-cap when the species has no darkvision.
- When lava flood covers the camp's 3×3, moves water strata from a shallow (-1) pool at least 8 cells from any -1 camp onto the deep pool within 8 cells of the camp, one stratum for one stratum. The shallow cell is left dry. The camp square then stands in water flood, which a colonist can walk and drink.

`DEUS_Colonists.js` `waterNear` skips lava. `isWaterAt` counts a lava pool; it is not a drink.

No new energy source was added. Food is the existing underground kit and fungus already grown on that level. Water moved onto a deep pool is water that was already in a shallow pool. The displaced lava is not kept (see PROPOSED-AG-02).

Dragonborn are the underground people with no darkvision (SRD 5.1, 0 ft). Their light is a reachable glow-cap. Dwarves, gnomes, and tieflings have darkvision and are not required to reach one.

## Evidence

`tools/sim/test_underground_year0.js` builds 20 Year-0 worlds (seeds 1–20) on the 32-layer range (-16..15) with a human player, so all four underground peoples found. For every living founder it requires a walk on real floor (not lava, not a strata pool, not a blocking object) to fungal forage and to drinkable water, and to a glow-cap when `species_reference.json` says darkvision is 0. The clock stays at year 0.

The mutation sets `const year0 = WorldGen.undergroundYear0` to null. Seeds 1, 7, and 18 then fail: the -1 founders have no path to fungal forage.

## Open Owner questions

- **OQ-23.** Which people live in which layer range at 32 layers is still open. This lane kept the current code: tiefling and dragonborn on -2, dwarf and gnome on -1, everyone else on 0, and the player's own faction still forced to 0.
- **OQ-24.** What feeds life in the deep caves is still open. This lane did not choose organic input only, geothermal heat, or a magical source. Year 0 uses fungus and water the world already has. It does not say what renews that forage after it is eaten.

## Follow-ups

- **PROPOSED-AG-01.** Renewal of cave fungus from organic matter already in the column (detritus, remains, humus), so a camp is not limited to the Year-0 stand. Which energy budget that growth may use is OQ-24.
- **PROPOSED-AG-02.** Lava displaced when a deep pool is filled with moved shallow water is dropped. A later change could park that lava where its flood cannot cover a camp.

## Gate output

Commands from `tasks/SIM.10.05/lane-ag/lane.json`, run in the worktree on 2026-09-27. All three exited 0.

### `node tools/check_deus_syntax.js`

```
Checked 52 DEUS plugin files. Errors: 0
```

### `node tools/test_new_game_year0.js`

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
  [PASS] embark_payload_shape: Untouched payload {"faction":"human","year":0,"seed":1687966344,"fogOfWar":false} (expected keys faction,fogOfWar,seed,worldSize,year; integer year 0; seed 1..2147483646)
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
  history after New Game: {"startYear":0,"years":0,"worldAge":0,"clockYear0":0,"demographicsCurrentYear":0,"demographicsStartYear":0,"units":72} (2700 ms)

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
  [PASS] section_c_checks_can_pass: with the clock fed the setup year, 4/4 Section C checks pass (clock year 0, save year 0; 2940 ms)

==================================================
SETUP CONTRACT PASSED: 30 gating checks, 15 mutants caught (ATK-YEAR0-001 closure criterion).
INV-SIM-01 END-TO-END MET: clock, save and constructor all at year 0.
==================================================
```

The embark payload seed in Section A is chosen by that suite and is not one of the twenty viability seeds.

### `node tools/sim/test_underground_year0.js`

```
=== UNDERGROUND YEAR-0 VIABILITY (SIM.10.05) ===

--- 20 seeds, year 0, 32 layers, human player so all four underground peoples found ---
  [PASS] seed 1 (2993 ms, 4 underground): food, water, light, paths
  [PASS] seed 2 (3136 ms, 4 underground): food, water, light, paths
  [PASS] seed 3 (3026 ms, 4 underground): food, water, light, paths
  [PASS] seed 4 (2983 ms, 4 underground): food, water, light, paths
  [PASS] seed 5 (3014 ms, 4 underground): food, water, light, paths
  [PASS] seed 6 (2976 ms, 4 underground): food, water, light, paths
  [PASS] seed 7 (2924 ms, 4 underground): food, water, light, paths
  [PASS] seed 8 (2908 ms, 4 underground): food, water, light, paths
  [PASS] seed 9 (3026 ms, 4 underground): food, water, light, paths
  [PASS] seed 10 (2952 ms, 4 underground): food, water, light, paths
  [PASS] seed 11 (2957 ms, 4 underground): food, water, light, paths
  [PASS] seed 12 (2892 ms, 4 underground): food, water, light, paths
  [PASS] seed 13 (2921 ms, 4 underground): food, water, light, paths
  [PASS] seed 14 (2892 ms, 4 underground): food, water, light, paths
  [PASS] seed 15 (3016 ms, 4 underground): food, water, light, paths
  [PASS] seed 16 (2999 ms, 4 underground): food, water, light, paths
  [PASS] seed 17 (2905 ms, 4 underground): food, water, light, paths
  [PASS] seed 18 (2920 ms, 4 underground): food, water, light, paths
  [PASS] seed 19 (2931 ms, 4 underground): food, water, light, paths
  [PASS] seed 20 (2943 ms, 4 underground): food, water, light, paths

--- mutation: WorldGen.undergroundYear0 removed ---
  [FAIL] seed 1 (3071 ms, 4 underground): dwarf@73,214,z-1 fungal forage dead-end | dwarf@74,214,z-1 fungal forage dead-end | dwarf@75,214,z-1 fungal forage dead-end | dwarf@73,215,z-1 fungal forage dead-end
  [FAIL] seed 7 (2999 ms, 4 underground): dwarf@216,181,z-1 fungal forage dead-end | dwarf@217,181,z-1 fungal forage dead-end | dwarf@218,181,z-1 fungal forage dead-end | dwarf@216,182,z-1 fungal forage dead-end
  [FAIL] seed 18 (2964 ms, 4 underground): dwarf@147,216,z-1 fungal forage dead-end | dwarf@148,216,z-1 fungal forage dead-end | dwarf@149,216,z-1 fungal forage dead-end | dwarf@147,217,z-1 fungal forage dead-end
  [PASS] mutation_fails: 3 of 3 seeds failed without the fix (expected at least 1)

PASS 0 seed failure(s), mutation caught (68397 ms)
```
