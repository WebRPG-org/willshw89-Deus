# WG.00.15 lane-av report

Writer: grok. Coupling defaults **on**. Every gate below passed without editing a pinned expectation.

## What changed

Underground substrate biomes are derived from the surface climate column at `(gx, gy)` plus the DEC-013 underground band. The old 4×4 province roll remains for a world whose save has no `verticalBiomeCoupling` flag, so those checksums stay the bytes they were made with. A new game copies `UF.Levels.VERTICAL_BIOME_COUPLING` (true) onto the world before baselines are built.

Bands used, from DEC-013 item 7: shallow underground -8..-1, deep caverns -16..-9. Z-1 and Z-2 are both in the shallow band. The old Z-2 deep set is the deep band, from Z-9 down. Layers below -2 stay solid rock; coupling only names the substrate. The rule table is in `docs/systems/DEUS_VerticalBiomes.md`.

`UF.NaturalConnections.SURVEY.testedCap` is 64. Flooded underground floors are not dry passages and do not spend that budget (baseline pools were already excluded). On a founded world the camp flood covers the nearest caves, so the first chain is further out than 12 clearance tests. Seed 12 finds it on test 51.

`tools/test_natural_connections.js` loads the DEUS plugins and keeps the fixture namespace. 25 passed, 0 failed. It is not a gate.

## Evidence

Generation time is `UF.Levels` `genMs` for the same seed, median of three paired reps, then the median across seeds 1–3. Coupling on stays within 10% of coupling off.

| Range | Median on/off | Per seed (on ms / off ms) |
|---|---|---|
| -16..+15 | 1.020 | 614/602, 626/613, 609/612 |
| -4..+4 | 1.025 | 640/625, 619/607, 620/602 |

### `node tools/worldgen/test_vertical_biome_coupling.js`

```
=== VERTICAL BIOME COUPLING (WG.00.15) ===

--- -16..+15 (default) ---
  [PASS] seed 1 (868 ms, gen 800 ms, -16..15): 4096 cells
  [PASS] seed 2 (831 ms, gen 773 ms, -16..15): 4096 cells
  [PASS] seed 3 (793 ms, gen 726 ms, -16..15): 4096 cells
  [PASS] seed 4 (829 ms, gen 765 ms, -16..15): 4096 cells
  [PASS] seed 5 (821 ms, gen 744 ms, -16..15): 4096 cells
  [PASS] seed 6 (839 ms, gen 773 ms, -16..15): 4096 cells
  [PASS] seed 7 (823 ms, gen 747 ms, -16..15): 4096 cells
  [PASS] seed 8 (869 ms, gen 798 ms, -16..15): 4096 cells
  [PASS] seed 9 (926 ms, gen 862 ms, -16..15): 4096 cells
  [PASS] seed 10 (803 ms, gen 744 ms, -16..15): 4096 cells
  [PASS] seed 11 (798 ms, gen 731 ms, -16..15): 4096 cells
  [PASS] seed 12 (877 ms, gen 813 ms, -16..15): 4096 cells
  [PASS] seed 13 (826 ms, gen 768 ms, -16..15): 4096 cells
  [PASS] seed 14 (794 ms, gen 739 ms, -16..15): 4096 cells
  [PASS] seed 15 (779 ms, gen 720 ms, -16..15): 4096 cells
  [PASS] seed 16 (825 ms, gen 755 ms, -16..15): 4096 cells
  [PASS] seed 17 (799 ms, gen 739 ms, -16..15): 4096 cells
  [PASS] seed 18 (862 ms, gen 803 ms, -16..15): 4096 cells
  [PASS] seed 19 (808 ms, gen 750 ms, -16..15): 4096 cells
  [PASS] seed 20 (820 ms, gen 734 ms, -16..15): 4096 cells
  [PASS] kinds: volcanic, wet_water, wet_land, mountain, cold, arid, forest, temperate

--- -4..+4 (test) ---
  [PASS] seed 1 (901 ms, gen 833 ms, -4..4): 1024 cells
  [PASS] seed 2 (875 ms, gen 821 ms, -4..4): 1024 cells
  [PASS] seed 3 (836 ms, gen 787 ms, -4..4): 1024 cells
  [PASS] seed 4 (811 ms, gen 763 ms, -4..4): 1024 cells
  [PASS] seed 5 (787 ms, gen 737 ms, -4..4): 1024 cells
  [PASS] seed 6 (849 ms, gen 799 ms, -4..4): 1024 cells
  [PASS] seed 7 (835 ms, gen 776 ms, -4..4): 1024 cells
  [PASS] seed 8 (831 ms, gen 786 ms, -4..4): 1024 cells
  [PASS] seed 9 (837 ms, gen 790 ms, -4..4): 1024 cells
  [PASS] seed 10 (831 ms, gen 783 ms, -4..4): 1024 cells
  [PASS] seed 11 (799 ms, gen 750 ms, -4..4): 1024 cells
  [PASS] seed 12 (822 ms, gen 759 ms, -4..4): 1024 cells
  [PASS] seed 13 (831 ms, gen 783 ms, -4..4): 1024 cells
  [PASS] seed 14 (782 ms, gen 735 ms, -4..4): 1024 cells
  [PASS] seed 15 (852 ms, gen 796 ms, -4..4): 1024 cells
  [PASS] seed 16 (834 ms, gen 787 ms, -4..4): 1024 cells
  [PASS] seed 17 (796 ms, gen 749 ms, -4..4): 1024 cells
  [PASS] seed 18 (843 ms, gen 794 ms, -4..4): 1024 cells
  [PASS] seed 19 (829 ms, gen 771 ms, -4..4): 1024 cells
  [PASS] seed 20 (798 ms, gen 748 ms, -4..4): 1024 cells
  [PASS] kinds: volcanic, wet_water, wet_land, mountain, cold, arid, forest, temperate

--- determinism ---
  [PASS] determinism default: 20 seeds matched a second runtime
  [PASS] determinism test: 20 seeds matched a second runtime

--- coupling switch ---
  [PASS] coupling off restores the independent roll: 1009/1024 sampled cells differ from the column rule

--- generation time versus coupling off ---
  [PASS] perf default: median ratio 1.020 (limit 1.10); 1 on 614 / off 602 (1.020); 2 on 626 / off 613 (1.022); 3 on 609 / off 612 (0.994)
  [PASS] perf test: median ratio 1.025 (limit 1.10); 1 on 640 / off 625 (1.025); 2 on 619 / off 607 (1.019); 3 on 620 / off 602 (1.031)

--- survey cap 12 -> 64 ---
  [PASS] seed 12 cap 64 foundAt 51 chains 1 (5079 ms): 0/-1/-2 chain

--- mutants (each must fail) ---
  [PASS] mutant independent_roll
  [PASS] mutant cap_12
  [PASS] mutant nondeterminism

PASS 0 problem(s) (110270 ms)
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
  [PASS] embark_payload_shape: Untouched payload {"faction":"human","year":0,"seed":757713050,"worldSize":256,"fogOfWar":false} (expected keys faction,fogOfWar,seed,worldSize,year; integer year 0; seed 1..2147483646)
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
  history after New Game: {"startYear":0,"years":0,"worldAge":0,"clockYear0":0,"demographicsCurrentYear":0,"demographicsStartYear":0,"units":72} (2775 ms)

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
  [PASS] section_c_checks_can_pass: with the clock fed the setup year, 4/4 Section C checks pass (clock year 0, save year 0; 2975 ms)

==================================================
SETUP CONTRACT PASSED: 30 gating checks, 15 mutants caught (ATK-YEAR0-001 closure criterion).
INV-SIM-01 END-TO-END MET: clock, save and constructor all at year 0.
==================================================
```

### `node tools/sim/test_underground_year0.js`

```
=== UNDERGROUND YEAR-0 VIABILITY (SIM.10.05) ===

--- 20 seeds, year 0, 32 layers, human player so all four underground peoples found ---
  [PASS] seed 1 (3058 ms, 4 underground): food, water, light, paths
  [PASS] seed 2 (3334 ms, 4 underground): food, water, light, paths
  [PASS] seed 3 (3220 ms, 4 underground): food, water, light, paths
  [PASS] seed 4 (3058 ms, 4 underground): food, water, light, paths
  [PASS] seed 5 (3169 ms, 4 underground): food, water, light, paths
  [PASS] seed 6 (3101 ms, 4 underground): food, water, light, paths
  [PASS] seed 7 (3076 ms, 4 underground): food, water, light, paths
  [PASS] seed 8 (3078 ms, 4 underground): food, water, light, paths
  [PASS] seed 9 (3180 ms, 4 underground): food, water, light, paths
  [PASS] seed 10 (3050 ms, 4 underground): food, water, light, paths
  [PASS] seed 11 (3100 ms, 4 underground): food, water, light, paths
  [PASS] seed 12 (3012 ms, 4 underground): food, water, light, paths
  [PASS] seed 13 (2996 ms, 4 underground): food, water, light, paths
  [PASS] seed 14 (3004 ms, 4 underground): food, water, light, paths
  [PASS] seed 15 (3098 ms, 4 underground): food, water, light, paths
  [PASS] seed 16 (3124 ms, 4 underground): food, water, light, paths
  [PASS] seed 17 (3069 ms, 4 underground): food, water, light, paths
  [PASS] seed 18 (3051 ms, 4 underground): food, water, light, paths
  [PASS] seed 19 (3063 ms, 4 underground): food, water, light, paths
  [PASS] seed 20 (3255 ms, 4 underground): food, water, light, paths

--- mutation: WorldGen.undergroundYear0 removed ---
  [FAIL] seed 1 (3399 ms, 4 underground): dwarf@73,214,z-1 fungal forage dead-end | dwarf@74,214,z-1 fungal forage dead-end | dwarf@75,214,z-1 fungal forage dead-end | dwarf@73,215,z-1 fungal forage dead-end
  [FAIL] seed 7 (3323 ms, 4 underground): dwarf@216,181,z-1 fungal forage dead-end | dwarf@217,181,z-1 fungal forage dead-end | dwarf@218,181,z-1 fungal forage dead-end | dwarf@216,182,z-1 fungal forage dead-end
  [FAIL] seed 18 (3156 ms, 4 underground): dwarf@147,216,z-1 fungal forage dead-end | dwarf@148,216,z-1 fungal forage dead-end | dwarf@149,216,z-1 fungal forage dead-end | dwarf@147,217,z-1 fungal forage dead-end
  [PASS] mutation_fails: 3 of 3 seeds failed without the fix (expected at least 1)

PASS 0 seed failure(s), mutation caught (72035 ms)
```

### `node tools/check_deus_syntax.js`

```
Checked 58 DEUS plugin files. Errors: 0
```

## Open Owner questions

Not answered here.

1. DEC-030's depth-band edges supersede DEC-013. This lane followed the brief and used DEC-013 (shallow -8..-1, deep -16..-9). Whether the column rule should move to DEC-030's edges is open.
2. DEC-013 still lists biome assignment per band as open. The table maps the eight existing substrate ids. It does not place the 25 pipeline biomes.
3. The substrate list has no `deep_magma` id. Volcanic columns use `deep_mine_belt` in the deep band. Lava on Z-2 stays a pool. Whether a `deep_magma` substrate should exist is open.
4. The default Z split -16..+15 is still the PM default and open for the Owner (DEC-013).
5. Rock below -2 stays solid (WG.00.17). Coupling names it. Whether those layers should be carved is open.

## PROPOSED-AV-01

If the Owner picks DEC-030's band edges, retarget `DEPTH_BANDS` and the column table. Do not do that inside this lane.

## PROPOSED-AV-02

If the Owner wants a `deep_magma` substrate under volcanic hotspots, add that id and point the deep volcanic row at it. This lane uses `deep_mine_belt`.
