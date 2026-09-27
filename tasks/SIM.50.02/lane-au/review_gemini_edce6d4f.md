# Independent Review: Lane AU (Task SIM.50.02)

**Reviewed Writer Tip (SHA):** `edce6d4f44bcc3b6c446946a715a59bc71b24b36`  
**Reviewer:** Gemini (Independent Reviewer / Non-Author; running under Owner DEC-034 fallback protocol)  
**Branch:** `task/lane-au`  
**Merge Base:** `2755f61947610723723384ad39ad3fbc92d4679f`  

---

## 1. Git Revision and Log Verification

Git revision verification output:
```text
edce6d4f44bcc3b6c446946a715a59bc71b24b36
edce6d4f44bcc3b6c446946a715a59bc71b24b36
```
(Confirmed HEAD equals `origin/task/lane-au` at `edce6d4f44bcc3b6c446946a715a59bc71b24b36`).

Recent commit log:
```text
edce6d4f44bcc3b6c446946a715a59bc71b24b36 deus-grok [grok] SIM.50.02 cross-layer water dynamics
2c4dacfcb88de24f39d9302b5bf1064fbe7f2e68 deus-pm [pm] Open lane-au (SIM.50.02): BRIEF.md and lane.json
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

---

## 2. Scope & Allowed Paths Check

`git diff --name-status 2755f61947610723723384ad39ad3fbc92d4679f edce6d4f44bcc3b6c446946a715a59bc71b24b36`:

| Status | File Path | In allowedPaths? |
|---|---|---|
| A | `docs/systems/DEUS_WaterDynamics.md` | YES (`docs/systems/DEUS_WaterDynamics.md`) |
| M | `game/js/plugins/DEUS_Fluid.js` | YES (`game/js/plugins/DEUS_Fluid.js`) |
| A | `game/js/sim/hydro/index.js` | YES (`game/js/sim/hydro/**`) |
| A | `game/js/sim/hydro/permeability.js` | YES (`game/js/sim/hydro/**`) |
| A | `tasks/SIM.50.02/lane-au/BRIEF.md` | YES (`tasks/SIM.50.02/**`) |
| A | `tasks/SIM.50.02/lane-au/REPORT.md` | YES (`tasks/SIM.50.02/**`) |
| A | `tasks/SIM.50.02/lane-au/lane.json` | YES (`tasks/SIM.50.02/**`) |
| A | `tools/sim/fixtures/water_dynamics/ranges.json` | YES (`tools/sim/fixtures/water_dynamics/**`) |
| A | `tools/sim/test_water_dynamics.js` | YES (`tools/sim/test_water_dynamics.js`) |

- **Art Check (DEC-007):** No art generated, drawn, edited, or requested.
- **Forbidden Files Check:**
  - `game/js/plugins.js`: UNTOUCHED
  - `game/js/plugins/DEUS_Core.js`: UNTOUCHED
  - `docs/VISION.md`: UNTOUCHED
  - `docs/STATUS.md`: UNTOUCHED
  - `docs/OWNER_DECISIONS.md`: UNTOUCHED
  - WBS files: UNTOUCHED
  - Governance & ops tools: UNTOUCHED
  - Sibling lane paths (AV, AW, AX, AY, AZ, BA): UNTOUCHED

---

## 3. Fresh Clone Gate Verification

Executed in isolated clone `.review_tmp_clone` at `edce6d4f44bcc3b6c446946a715a59bc71b24b36`:

### Gate Test (a): `node tools/sim/test_water_dynamics.js`
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
```
**EXIT_WATER:** `0`

### Gate Test (b): `node tools/sim/test_fluid_attach.js`
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
```
**EXIT_ATTACH:** `0`

### Gate Test (c): `node tools/sim/test_living_world_rules.js`
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
```
**EXIT_LIVING:** `0`

### Gate Test (d): `node tools/check_deus_syntax.js`
```text
Checked 58 DEUS plugin files. Errors: 0
```
**EXIT_SYNTAX:** `0`

---

## 4. Requirements & Mutant Analysis

1. **Cross-layer water dynamics:**
   - Seepage through porous strata & soil reads `UF.Levels.dominantMaterial` and maps `porosity.perm` (classes 0..6) to deterministic integer schedules. Class 0 blocks; classes 1..5 seep over 4, 3, 2, or 1 visits.
   - Waterfalls utilize vertical gravity transfer through the DOWN passage bit (8) across single and multiple layer drops.
   - Subterranean aquifers & springs implemented via `defineAquifer` and `defineSpring`. Water is drawn directly from stored groundwater; springs cleanly cease when the reservoir hits 0.
   - Lake filling & drying implemented via `defineLake`, `setSeasonInput`, `seedAtmosphere`, and evaporation/infiltration routines.
   - Flooding fills the cell, overflows into lateral orthogonal neighbors, and rises through the UP passage bit (16) to the cell above without penetrating solid rock.
2. **Mass conservation (LIFE-001):**
   - Strictly counted ledger units (`totalWaterMass = totalWater + session.stored()`, where `session.stored() = storedAquifers() + atmosphere + displaced`). Excess from stratum changes goes into `displaced`. Total mass maintained identically across 200 checkpoints in long closed-system runs.
3. **Change-driven & Sparse (V133, DEC-013):**
   - Only dirty queue cells processed; quiet queues incur 0 cell scans. Memory allocated lazily on write. COST-32 demonstrates peak processing bounded well below map volume, and settled ticks process 0 cells.
4. **Owner Decisions & Questions:**
   - Seasonal input uses pluggable function `setSeasonInput(fn)` defaulting to neutral 0 precipitation. DEC-026 calendar reconciliation listed as open Owner question and NOT answered.
   - Open questions (porosity fraction, D-WATER-SLICE, DEC-013 split) listed neutrally without answering. Follow-ups proposed as `PROPOSED-AU-01` through `PROPOSED-AU-09`.
5. **Mutants Killed:**
   - `createWater`: Mutant creates water; test detects mass increase and fails.
   - `deleteEvap`: Mutant drops evaporated water; test detects missing mass in atmosphere and fails.
   - `floodSolid`: Mutant writes into solid rock; test detects rock water > 0 and fails.
   - `fullScan`: Full-world scan mutant exceeds cost bound and fails.
   - Additional mutants verified: `ignorePerm`, `seep_quantum`, `drop_seep_visits`, `no_gravity_waterfall`.
6. **Backward Compatibility:**
   - Saves without `hydro` key (array and object format) load seamlessly.

---

## 5. Findings

- **BLOCKER:** None.
- **MAJOR:** None.
- **MINOR:** None.

---

## 6. Verdict

VERDICT: CLEAN PASS
