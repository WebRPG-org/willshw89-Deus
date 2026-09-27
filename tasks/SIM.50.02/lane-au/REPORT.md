# SIM.50.02 lane-au report

Writer: grok. Reviewer: gemini (not this run). This report does not mark the task DONE.

No art was generated, drawn, edited, or requested (DEC-007). No file outside the brief's allowedPaths was written. No WBS id was minted. No Owner question is answered here. No merge. The only push is `git push origin task/lane-au`.

## What changed

Cross-layer water on the existing 0..7 solver. Cell depth stays in `game/js/plugins/DEUS_Fluid.js`. Transfers that are not open-shaft gravity live in `game/js/sim/hydro/` (`index.js`, `permeability.js`). The note is `docs/systems/DEUS_WaterDynamics.md`. `docs/systems/DEUS_Fluid.md` was not edited.

`UF.Fluid.hydro()` is null when `require("../sim/hydro/index.js")` throws. The attach regression and F-05 load this plugin with a require that throws. Those paths do not create the new stores, and their volume checks are unchanged.

Counted water, integer du (the solver's depth unit). Lava is not in this ledger.

| Store | Role |
|---|---|
| Cell depth | Existing sparse grid. `diagnostics().totalWaterVolume` is still this number only. |
| Aquifer | Named store, or `col:ax:ay:x:y` when a porous column has no open cell under it. Springs debit it. |
| Atmosphere | Precipitation debits it. Evaporation credits it. |
| Displaced | Leftover du when `reconcileCellWithStrata` shrinks a cell and the neighbours and the cell above cannot take the excess. |

`diagnostics().totalWaterMass` is the grid plus those three stores. A transfer that does not fit stays in the store it came from.

Seepage reads `UF.Levels.dominantMaterial` and `createMaterials().material(id).porosity.perm` (class 0..6). The catalogue fraction is still null. Class 0 blocks. Class 6 is an opening (gravity), not a seep. Classes 1..5 move 1 du on a period of 4, 3, 2, or 1 visits, and class 5 moves 2 du every visit. Water is not written into a capacity-0 plug. The walk is down that one column, bounded by the layer count.

Waterfalls are the existing gravity step through the `DOWN` bit. A drop across the whole range is that step repeated. Springs draw a named aquifer and stop at 0. Lakes are a registered cell list: precipitation is `setSeasonInput`, default `{ precipitation: 0 }`; evaporation moves du into the atmosphere; infiltration is seepage into the column aquifer. Flood delivery fills the cell, then the four neighbours, then the cell above when `UP` is set. Capacity 0 is not written.

A tick runs lake precipitation and evaporation only for registered cells that have an offer or evaporation, then the dirty queue. A quiet queue and a zero offer examine no cells. Level grids are still made on the first write. The 32-layer cost fixture is a 32×32 map, one open column.

Saves keep `fluidSchemaVersion: 1` and the record list `[ax, ay, z, x, y, type, depth]`. `hydro` is added only when an aquifer, spring, lake, atmosphere, displaced du, or seep visit count exists. A bare array and a version-1 object with no `hydro` key still load. The season function is not saved.

## Evidence

Node only. No NW.js process was started. The temp directory was not used. No background job was left running.

`COST-32` from the water-dynamics gate, one open column on `-16..+15`, map 32×32 (full grid 32768 cells):

```text
COST-32 activeExamined 0 activeProcessed 12 settledExamined 0 settledProcessed 0 steps 16 bottom 7 full 32768 grids 32
```

`activeExamined` is 0 because an open shaft is gravity: the cell is empty before the seep walk. The dirty queue on the busiest tick of that drop processed 12 cells. After the 7 du pooled on the bottom layer, the next tick processed 0. A full-scan mutant on the same fixture examined 32768 and fails the bound. Grids allocated after the drop: 32, one per level the water touched, and a read of every level before the first write allocated 0.

The closed run is 200 ticks, total 25 du (atmosphere 12, aquifer 8, cell 5), twice per range, same signature. Soil through a plug reaches the cave in 10 ticks; granite does not. Sand (class 4) moves 2 du in 2 ticks; soil (class 3) needs 4. A spring of 4 du stops at depth 4 and aquifer 0. A lake fills from the atmosphere to depth 7 and dries back by evaporation. A porous column of 6 du ends in the column aquifer with every plug dry. Inflow of 20 into a capacity-7 cell puts 7 there, 7 on the open neighbour, and 6 back in the atmosphere. Inflow of 10 with `UP` open puts 7 on the cell and 3 on the layer above. Lava does not seep. A shrink from capacity 7 to 2 leaves depth 2 and displaced 5.

## Gate output

Commands from `tasks/SIM.50.02/lane-au/lane.json`, foreground, this tree, after the last edit. Exit codes are on the `EXIT_*` lines.

`node tools/sim/test_water_dynamics.js`

```text
PASS fixture_passage_bits — capacity 7 down 8
PASS require_binds — UF.Fluid is the module export
PASS hydro_loaded — session
PASS perm_granite_blocks — granite 0
PASS perm_soil_seeps — soil 3
PASS perm_sandstone_seeps — sandstone 3
PASS perm_air_open — air 6
PASS seep_quantum_blocks — soil visit1 0
PASS mutant_seep_quantum_fails — mutant 1
PASS season_default_zero — precipitation 0
PASS layer_count -16..+15 — layers 32
PASS sparse_read -16..+15 — grids 0
PASS sparse_one_write -16..+15 — grids 1 after read 1 volume 3
PASS seepage_porous -16..+15 — ticks 10 cave 5 plug 0 total 5 soilPerm 3
PASS seepage_impermeable -16..+15 — source 5 cave 0
PASS mutant_ignore_perm_fails -16..+15 — source 0 cave 0 aquifer 5 (water left the cell above the granite)
PASS seepage_by_material -16..+15 — sand perm 4 ticks 2 soil ticks 4 cave 2
PASS seep_visit_resumes -16..+15 — cave 1 source 0
PASS mutant_drop_seep_visits_fails -16..+15 — source 1 cave 0 (resume check would fail)
PASS waterfall_opening -16..+15 — quiet true steps 1 bottom 7
PASS mutant_no_gravity_waterfall_fails -16..+15 — top 7 bottom 0
PASS waterfall_range -16..+15 — steps 16 bottom 7 mid 0 grids 32
PASS spring_stops -16..+15 — depth 4 aquifer 0
PASS mutant_create_water_fails -16..+15 — total 6 aquifer 3 grid 3
PASS lake_fills -16..+15 — depth 7 atmo 2 total 9
PASS lake_dries_evap -16..+15 — depth 0 atmo 9
PASS mutant_delete_evap_fails -16..+15 — total 3 atmo 0 depth 3
PASS lake_dries_infiltration -16..+15 — ticks 12 grid 0 aquifer 6 plugs 0
PASS flood_lateral -16..+15 — a 7 b 7 atmo 6
PASS flood_up_layer -16..+15 — low 7 high 3
PASS flood_refuses_solid -16..+15 — rock 0 atmo 4
PASS mutant_flood_solid_fails -16..+15 — rock 4 (solid-cell check would fail)
PASS lava_not_seeped -16..+15 — lava 4 cave 0
PASS displaced_counted -16..+15 — depth 2 displaced 5 total 7
PASS old_save_array -16..+15 — depth 5 total 5
PASS old_save_object -16..+15 — depth 4
PASS save_roundtrip -16..+15 — before 11 after 11 version 1
PASS season_not_saved -16..+15 — atmo 5 depth 0 (default precipitation is 0; DEC-026 not chosen)
PASS mass_checkpoints -16..+15 — checkpoints 200 total 25 sigMatch true
PASS cost_bound -16..+15 — activeExamined 0 activeProcessed 12 settledExamined 0 settledProcessed 0 steps 16 bottom 7 full 32768 size 32 layers 32
COST-32 activeExamined 0 activeProcessed 12 settledExamined 0 settledProcessed 0 steps 16 bottom 7 full 32768 grids 32
PASS mutant_full_scan_fails -16..+15 — examined 32768 full 32768 (cost bound would fail)
PASS layer_count -4..+4 — layers 9
PASS sparse_read -4..+4 — grids 0
PASS sparse_one_write -4..+4 — grids 1 after read 1 volume 3
PASS seepage_porous -4..+4 — ticks 10 cave 5 plug 0 total 5 soilPerm 3
PASS seepage_impermeable -4..+4 — source 5 cave 0
PASS mutant_ignore_perm_fails -4..+4 — source 0 cave 0 aquifer 5 (water left the cell above the granite)
PASS seepage_by_material -4..+4 — sand perm 4 ticks 2 soil ticks 4 cave 2
PASS seep_visit_resumes -4..+4 — cave 1 source 0
PASS mutant_drop_seep_visits_fails -4..+4 — source 1 cave 0 (resume check would fail)
PASS waterfall_opening -4..+4 — quiet true steps 1 bottom 7
PASS mutant_no_gravity_waterfall_fails -4..+4 — top 7 bottom 0
PASS waterfall_range -4..+4 — steps 4 bottom 7 mid 0 grids 9
PASS spring_stops -4..+4 — depth 4 aquifer 0
PASS mutant_create_water_fails -4..+4 — total 6 aquifer 3 grid 3
PASS lake_fills -4..+4 — depth 7 atmo 2 total 9
PASS lake_dries_evap -4..+4 — depth 0 atmo 9
PASS mutant_delete_evap_fails -4..+4 — total 3 atmo 0 depth 3
PASS lake_dries_infiltration -4..+4 — ticks 12 grid 0 aquifer 6 plugs 0
PASS flood_lateral -4..+4 — a 7 b 7 atmo 6
PASS flood_up_layer -4..+4 — low 7 high 3
PASS flood_refuses_solid -4..+4 — rock 0 atmo 4
PASS mutant_flood_solid_fails -4..+4 — rock 4 (solid-cell check would fail)
PASS lava_not_seeped -4..+4 — lava 4 cave 0
PASS displaced_counted -4..+4 — depth 2 displaced 5 total 7
PASS old_save_array -4..+4 — depth 5 total 5
PASS old_save_object -4..+4 — depth 4
PASS save_roundtrip -4..+4 — before 11 after 11 version 1
PASS season_not_saved -4..+4 — atmo 5 depth 0 (default precipitation is 0; DEC-026 not chosen)
PASS mass_checkpoints -4..+4 — checkpoints 200 total 25 sigMatch true
PASS cost_bound -4..+4 — activeExamined 0 activeProcessed 12 settledExamined 0 settledProcessed 0 steps 4 bottom 7 full 576 size 8 layers 9
PASS mutant_full_scan_fails -4..+4 — examined 576 full 576 (cost bound would fail)
RESULT: PASS (0 failed)
EXIT_WATER:0
```

`node tools/sim/test_fluid_attach.js`

```text
PASS mutant_site_present — three bind assignments
PASS mutant_require_does_not_bind — window.UF.Fluid set: false
PASS require_binds_before_core_lines — window.UF.Fluid is the module export before Core runs: true
PASS require_survives_core_assign — same object after window.DEUS = window.DEUS || {}; window.UF = window.DEUS: true
PASS hooks_on_first_map_load — listeners 9
PASS hooks_not_stacked — before second load 9 after 9 (levels:cellChanged,levels:shapeChanged,levels:strataChanged,levels:strataDestroyed,world:areaBuilt,world:levelBuilt,doors:opened,doors:closed,doors:broken)
PASS volume_before_place — scanned 0 legacy 0
PASS volume_after_place — scanned 22 diagnostics 22 legacyCalls 0 legacyVolume 0 expected 22
PASS volume_after_attach — scanned 22 diagnostics 22 legacyCalls 0 legacyVolume 0 expected 22
PASS flood_uses_solver — vias solver volume 22
PASS volume_across_flood_fills — layers 32 volume 22
PASS volume_across_flow — ticks 10 bottom 22 expected 22
PASS reattach_on_map_load — was unbound true; restored true; missing 
PASS classic_script_binds — identity kept: true Fluid set: true
RESULT: PASS (0 failed)
EXIT_ATTACH:0
```

`node tools/sim/test_living_world_rules.js`

```text
PRE-FIX 75cf2ff399e5fdbce1f69e7178e4cb4329374eee
PASS F-01 rejects the 5-level 1 ft model — rejected (levels -2,-1,0,1,2 want -16,-15,-14,-13,-12,-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15; zRange {"zMin":-2,"zMax":2}; isLevel false for 27 levels in range, first -16; feet cell 5 stratum 1 per 5 step 5; no worldStrataElevationAt)
PASS F-03 rejects an ore sprout row — rejected (0:rocks_small->ironstone)
PASS F-05 mutant bind stays unset — mutant left window.UF.Fluid unset
PASS F-01 -16..+15 — env -16..+15 and state; levels 32 feet 5/2/10 elevation -16=4,-11=29,-10=34,-9=39,-8=44,-7=49,-6=54,-5=59,-4=64,-3=69
PASS F-02 -16..+15 — below-core 14 uniform; mixed levels 2; scratch 1/32; grids before 0 after write 1 after read 1 volume 3
PASS F-03 -16..+15 — scheduled ore refused at -16,0,15; beats 320; ore hits 0
PASS F-04 -16..+15 — mine z -16 4 slices moved, 1 kept; mine z 0 4 slices moved, 1 kept; mine z 15 4 slices moved, 1 kept; soil z -1 stayed soil; quarry z -16 4 slices moved, 1 kept; campfire collapse conserved
PASS F-05 -16..+15 — bound before Core; volume 22 across 32 layers; bottom 22
PASS F-01 -4..+4 — env -4..+4 and state; levels 9 feet 5/2/10 elevation -4=4
PASS F-02 -4..+4 — below-core 2 uniform; mixed levels 2; scratch 1/9; grids before 0 after write 1 after read 1 volume 3
PASS F-03 -4..+4 — scheduled ore refused at -4,0,4; beats 320; ore hits 0
PASS F-04 -4..+4 — mine z -4 4 slices moved, 1 kept; mine z 0 4 slices moved, 1 kept; mine z 4 4 slices moved, 1 kept; soil z -1 stayed soil; quarry z -4 4 slices moved, 1 kept; campfire collapse conserved
PASS F-05 -4..+4 — bound before Core; volume 22 across 9 layers; bottom 22
RESULT: PASS (0 failed)
EXIT_LIVING:0
```

`node tools/check_deus_syntax.js`

```text
Checked 58 DEUS plugin files. Errors: 0
EXIT_SYNTAX:0
```

## Open Owner questions

These are not answered here.

| ID | Question | What this lane did |
|---|---|---|
| DEC-026 | How the calendar reconciles the solar day with the year (VISION V123). Status in `docs/OWNER_DECISIONS.md`: OPEN. | Precipitation is `setSeasonInput`. The default returns `{ precipitation: 0 }`. The suite's wet and dry stretches are a function of the tick counter. That function is not a calendar and it is not saved. No option A, B, or C is chosen. |
| Porosity fraction | `porosity` on the material record stores `perm` (class 0..6) and leaves the fraction null (`PLACEHOLDER`). PROPOSED-AC-02 said SIM.50.02 would replace that fraction. | This lane reads `porosity.perm` only. The integer seep schedule is a local map of that class. The fraction is not written. `game/data/sim/materials.json` is outside allowedPaths. |
| D-WATER-SLICE / D-WATER-DU | 7 du do not divide across 5 slices. Water's kilogram and mu figures are not confirmed. | This lane counts solver du. It does not convert a du to kilograms or mu, and it does not split a layer into slices. |
| DEC-013 split | The default `-16..+15` is the PM default. The Owner may still change the split. | The suite runs `-16..+15` and `-4..+4`. It does not pick a different split. |

## Proposed follow-ups

| ID | Follow-up |
|---|---|
| PROPOSED-AU-01 | Write a porosity fraction back onto the material record, and replace the local class schedule if the Owner wants a conductivity. The catalogue file is outside this lane. |
| PROPOSED-AU-02 | A pressure field and U-bends (WAT-4). A spring here delivers at its outlet from a stored aquifer. Upward spill is only the `UP` bit when the cell below is over capacity. |
| PROPOSED-AU-03 | One water authority (WAT-5). Surface rivers and lakes are still worldgen tiles. Strata pools and natural-connection flags are not this solver. Those files are outside allowedPaths. |
| PROPOSED-AU-04 | Drinking and filling a bucket still do not debit water (WAT-6, `DEUS_Jobs.js`, `DEUS_Fire.js`). When hydro is loaded, a capacity shrink that cannot spill puts the leftover in the displaced store. When hydro did not load, that leftover is still dropped, which is the previous solver. |
| PROPOSED-AU-05 | Off-view water (WAT-8) still follows `UF.Fluid.tick`: the viewed area when `viewLevel()` is set. |
| PROPOSED-AU-06 | `doors:broken` still wakes the wrong cell when the payload is a string (WAT-10). Not this task. |
| PROPOSED-AU-07 | Water still stops at an area edge. |
| PROPOSED-AU-08 | No velocity or flux for erosion (SIM.50.03). This ledger stores du, not a flow vector. |
| PROPOSED-AU-09 | Per-slice water rounding (D-WATER-SLICE, PROPOSED-AC-07) stays open. |

## Scope

Files written for this run:

- `game/js/plugins/DEUS_Fluid.js`
- `game/js/sim/hydro/index.js`
- `game/js/sim/hydro/permeability.js`
- `tools/sim/test_water_dynamics.js`
- `tools/sim/fixtures/water_dynamics/ranges.json`
- `docs/systems/DEUS_WaterDynamics.md`
- `tasks/SIM.50.02/lane-au/REPORT.md`

`tasks/SIM.50.02/lane-au/launches/` was already present and was not added. No temp clone was created.
