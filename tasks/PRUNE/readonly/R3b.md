# TASK PACKET R3b: Test Census Batch B (F through P)

**Audited:** 71 test scripts in `tools/` (`test_f*.js` through `test_p*.js`)  
**Methodology:** Read-only inspection of source code, target files, assertion statements, failure exit paths, and subsystem statuses.

## Summary

| Classification | Count | Description |
| :--- | :--- | :--- |
| **KEEP** | 41 | Active test of live code with assertions and verified failure/exit-1 path |
| **ARCHIVE** | 6 | Test targeting deleted, unintegrated, or archived subsystems |
| **RENAME** | 22 | Tool, generator, showcase, or diagnostic utility misnamed as test (no assertions) |
| **NO_FAILURE_PATH** | 2 | Test script with test assertions that ignores errors or can never exit non-zero / fail |
| **Total** | **71** | |

---

## Detailed Classification Table

| Path | Classification | Subject Code | Reason |
| :--- | :--- | :--- | :--- |
| `tools/test_facing_detection.js` | RENAME | `tools/build_pro_human_male.js` | Diagnostic utility inspecting frame facing directions; contains no assertions or failure exit. |
| `tools/test_factions_live.js` | RENAME | `game/js/plugins/DEUS_FactionMenus.js` | In-game screenshot capture script for faction dialogues; contains no assertions and catches/suppresses errors. |
| `tools/test_faction_construction_and_homes.js` | KEEP | `game/js/plugins/DEUS_Colonists.js`, `UF_Households.js` | Active headless test of colonist home construction planning and progression with strict assertions and `process.exit(1)` on failure. |
| `tools/test_faction_founder_pairbonding.js` | KEEP | `game/js/plugins/DEUS_Factions.js`, `DEUS_History.js` | Active test of founder pair-bonding, childbirth, and lineage inheritance with assertions, mutant checks, and failure exit. |
| `tools/test_faction_menus_clean.js` | RENAME | `tools/run_tests.js` (faction_menus) | Post-test screenshot harvesting utility copying PNGs to `art/review/menus/`; contains no assertions. |
| `tools/test_faction_reproduction.js` | KEEP | `game/js/plugins/DEUS_Colonists.js`, `DEUS_Factions.js` | Active test suite for faction reproduction, mating, childbirth, and aging with strict assertions and failure exit. |
| `tools/test_faction_starting_gear.js` | KEEP | `game/js/plugins/DEUS_Factions.js`, `DEUS_Items.js` | Active verification of faction starting equipment and inventory slots with assertions and failure exit. |
| `tools/test_family_compounds_and_shops.js` | KEEP | `game/js/plugins/UF_Households.js`, prop charsets | Active verification of household compound progression, shop planning, and prop character sets with assertions and failure exit. |
| `tools/test_family_integration.js` | KEEP | `game/js/plugins/DEUS_Colonists.js`, `UF_Households.js` | Active test of colonist decision-making, household reservations, and job planning with assertions and `process.exitCode` failure path. |
| `tools/test_farm_view.js` | ARCHIVE | `game/js/plugins/UF_FarmView.js` | Targets deleted/archived farming visualization plugin `UF_FarmView.js` (fails with ENOENT if executed; farming frozen under DEC-037). |
| `tools/test_female_u7_composites.js` | RENAME | Modular portrait raw art | Modular portrait extraction and compositing script writing to scratch folder; contains no assertions. |
| `tools/test_ff5_candidates.js` | RENAME | FF5 candidate pixel art | Pixel art candidate rendering tool outputting 16x PNGs to `game/test_output/`; contains no assertions. |
| `tools/test_ff5_proportions_and_footsteps.js` | RENAME | FF5 proportion comparison art | Visual comparison atlas generator outputting to `art/review/`; contains no assertions. |
| `tools/test_fire_safety.js` | ARCHIVE | `game/js/plugins/UF_FireSafety.js` | Targets deleted/archived plugin `UF_FireSafety.js` (fails with ENOENT if executed). |
| `tools/test_fixed_cycle.js` | RENAME | Male walk cycle raw art | Frame extraction and filmstrip generator utility misnamed as test; contains no assertions. |
| `tools/test_fixed_walk_playback.js` | RENAME | `$UF_Human_Male_1_Walk.png` | Art review playback matrix generator writing to `art/review/`; contains no assertions. |
| `tools/test_fix_facings.js` | RENAME | Character sprite facing analyzer | Directional facing inspection utility analyzing skin pixel bias; contains no assertions. |
| `tools/test_fog_z_level_live.js` | KEEP | `game/js/plugins/DEUS_Fog.js`, `DEUS_Levels.js` | Active in-engine NW.js test verifying Z-level fog isolation and starting camp floor absence with failure exit. |
| `tools/test_foliage_sprite_animations.js` | KEEP | Foliage character sets & sidecars | Active asset verification test validating foliage sway animation frames and sidecars with failure exit. |
| `tools/test_gen3_metrics.js` | RENAME | Underground gen3 math prototype | Procedural cave generation prototype and statistical metric calculator; contains no assertions. |
| `tools/test_generated_z2_cut_proof.js` | KEEP | `game/js/plugins/DEUS_WorldGen.js`, `DEUS_Fluid.js` | Active targeted proof test for WG.00.08 / DEC-001 verifying Z-2 ravine cuts and fluid conservation with failure exit. |
| `tools/test_generator_combinations.js` | RENAME | Character sprite generator | Library module exporting generator compositing functions (`compositeCharset`, `compositePortrait`); contains no assertions. |
| `tools/test_geology_strata.js` | KEEP | `game/js/plugins/DEUS_World.js`, `DEUS_Levels.js` | Active test of physical stone stratum properties and depth bands across Z levels with failure exit. |
| `tools/test_goals.js` | ARCHIVE | `game/js/plugins/UF_Goals.js` | Targets deleted/archived plugin `UF_Goals.js` (fails with ENOENT if executed). |
| `tools/test_golden_art_review_live.js` | NO_FAILURE_PATH | Golden Art Review playtest | Contains hardcoded `true` assertion (Rule 4 violation: `t.check("grass_batch1_rendered", true, ...)`) and catches harness errors without non-zero exit. |
| `tools/test_greater_z_roof_live.js` | KEEP | `game/js/plugins/DEUS_Floors.js`, `DEUS_Levels.js` | Active in-engine NW.js verification of greater Z roof deck creation, autotiling, and walkability with failure exit. |
| `tools/test_ground_shades_prototype.js` | RENAME | `game/data/UF_WorldCatalog.json` ground shades | Ground shade data mapping prototype; contains no assertions. |
| `tools/test_hare_action_boxes.js` | RENAME | Raw hare sprite art | Bounding box scanning utility for raw hare sprite sheets; contains no assertions. |
| `tools/test_haul_builder.js` | RENAME | Hauling character sprite builder | Art processing utility compositing crates onto walking frames; contains no assertions. |
| `tools/test_hazard_reflex.js` | KEEP | `game/js/plugins/DEUS_Colonists.js`, `DEUS_Fire.js` | Active headless test suite for colonist reflexive hazard avoidance, flight, and self-preservation with failure exit. |
| `tools/test_hazard_torture_live.js` | KEEP | `game/js/plugins/DEUS_Colonists.js`, `DEUS_Fire.js` | Active multi-agent torture test for complex hazard survival, firefighting, and grappling with failure exit. |
| `tools/test_hearth_containment_and_provenance.js` | KEEP | `game/js/plugins/DEUS_Fire.js`, `DEUS_Colonists.js` | Active test of 14-day hearth fire containment and structure provenance with strict assertions and failure exit. |
| `tools/test_historical_carrying_capacity.js` | KEEP | `game/js/plugins/DEUS_HistoricalDemographics.js` | Active demographic carrying capacity and population lifecycle contract suite with failure exit. |
| `tools/test_history_materialization_and_world_age.js` | KEEP | `game/js/plugins/DEUS_History.js`, `DEUS_Colonists.js` | Active test of historical person materialization and world age calculation with assertions and failure exit. |
| `tools/test_hist_metadata_contracts.js` | KEEP | `game/js/plugins/DEUS_History.js` | Active regression suite verifying history metadata schema contracts and determinism with failure exit. |
| `tools/test_households.js` | KEEP | `game/js/plugins/UF_Households.js` | Active test of persistent household data structures, pair bonding, and home planning with failure exit. |
| `tools/test_human_dwarf_8d_live.js` | RENAME | Human & Dwarf 8D in-game showcase | Screenshot capture harness script; contains no assertions (`t.check` is never called) and ignores harness errors. |
| `tools/test_human_female_variations_live.js` | RENAME | Human female variations showcase | Visual showcase capture script for female variants; contains no assertions. |
| `tools/test_human_inheritance.js` | KEEP | `game/js/plugins/DEUS_Colonists.js:745` | Active statistical regression test of human variation inheritance algorithm matching `DEUS_Colonists.js` with throw assertions. |
| `tools/test_human_male_live_ingame.js` | RENAME | Human male actions showcase | Visual showcase capture script for male actions; contains no assertions and ignores errors. |
| `tools/test_human_male_variations_live.js` | RENAME | Human male variations showcase | Visual showcase capture script for male variants; contains no assertions. |
| `tools/test_layer_render_flat.js` | KEEP | `game/js/plugins/DEUS_Depth.js` (WG.00.09b Lane K) | Active verification suite for flat 1:1 layer rendering and layer-switch lag fixes with failure exit. |
| `tools/test_layer_switch_inplace.js` | KEEP | `game/js/plugins/DEUS_Levels.js`, `DEUS_Depth.js` | Active test verifying in-place Z-level swapping without map transfers with strict assertions and failure exit. |
| `tools/test_light_wall_occlusion_live.js` | NO_FAILURE_PATH | `game/js/plugins/DEUS_Objects.js`, `DEUS_Walls.js` | Injects assertions but invokes `childProcess.spawnSync` without inspecting `testResult.status`; unconditionally exits 0 even if test fails. |
| `tools/test_liquid_depth_simulation.js` | KEEP | `game/js/plugins/DEUS_Fluid.js`, `DEUS_Levels.js` | Active test suite for conserved volumetric fluid depth simulation, 3D flow, and dirty queues with failure exit. |
| `tools/test_live_town_center_progression.js` | KEEP | `game/js/plugins/DEUS_Colonists.js`, `UF_Households.js` | Active in-engine test of autonomous post-Town-Hall progression and resource handling with failure exit. |
| `tools/test_ludeon_planning.js` | ARCHIVE | `game/js/plugins/UF_Construction.js` | Targets non-existent/archived 4-stage construction plugin `UF_Construction.js` (assertions fail due to missing plugin). |
| `tools/test_material_recipes.js` | KEEP | `game/js/plugins/DEUS_Items.js`, `DEUS_Jobs.js` | Active test of material-aware crafting recipes, ingredient role matching, and quality roll with failure exit. |
| `tools/test_material_refining_and_tech_pacing.js` | ARCHIVE | `game/js/plugins/UF_CultureGrowth.js` | Targets deleted/archived plugin `UF_CultureGrowth.js` (fails with ENOENT if executed; culture tech frozen under DEC-037). |
| `tools/test_material_substitution.js` | KEEP | `game/js/plugins/DEUS_Items.js`, `UF_WorldCatalog.json` | Active test suite for material substitution matrix, property matcher, and conservation with failure exit. |
| `tools/test_menu_ingame.js` | RENAME | In-game menu & dialogue windowskin | Menu and dialogue screenshot capture script; contains no assertions. |
| `tools/test_minimap.js` | KEEP | `game/js/plugins/DEUS_Minimap.js`, `DEUS_Levels.js` | Active test suite for multi-Z minimap rendering, fog masking, and dirty rect caching with failure exit. |
| `tools/test_multi_deficit_settlement.js` | KEEP | `game/js/plugins/DEUS_Projects.js`, `DEUS_Colonists.js` | Active headless test of autonomous settlement deficits and project brain utility ranking with failure exit. |
| `tools/test_native_resolution_standard.js` | KEEP | Native resolution standard (DW.01.02) | Active verification suite for native-resolution asset standard and pixel density contracts with failure exit. |
| `tools/test_native_survival_soak.js` | KEEP | `game/js/plugins/DEUS_Colonists.js`, `DEUS_DeathForensics.js` | Active long-run survival soak and colonist mortality audit suite with failure exit. |
| `tools/test_natural_connections.js` | KEEP | `game/js/plugins/DEUS_NaturalConnections.js` | Active test suite for multi-level natural connections, ramps, climbing, and traversability with failure exit. |
| `tools/test_new_game_year0.js` | KEEP | `game/js/plugins/DEUS_Core.js`, `DEUS_History.js` | Active verification suite ensuring new game starts deterministically at Year 0 with failure exit. |
| `tools/test_object_art.js` | KEEP | `game/data/UF_WorldCatalog.json` object charsets | Active batch validation test running art_check.js on all catalog object sprite sheets with failure exit. |
| `tools/test_object_originality.js` | KEEP | World object originality (Rule 8) | Active originality audit test running originality_check.js on all catalog object sheets with failure exit. |
| `tools/test_package_proofs_ingame.js` | KEEP | Packages 1-3 (Space, Matter, Aquifer) | Canonical in-engine playtest verification suite for Packages 1, 2, and 3 with assertions and failure exit. |
| `tools/test_palette.js` | RENAME | `art/palette/uf.hex` | Palette loading and color-snapping prototype utility; contains no assertions. |
| `tools/test_palette_standard.js` | KEEP | `art/palette/uf.hex`, material ramps (DW.01.05) | Active test suite validating canonical palette architecture and material color ramps with failure exit. |
| `tools/test_perf_benchmark.js` | KEEP | Engine 60 FPS baseline (DEUS-PERF-01) | Active performance benchmark verifying 60 FPS frame time budgets under 4x speed with failure exit. |
| `tools/test_physical_inventory_proof.js` | KEEP | `game/js/plugins/DEUS_Containers.js`, `DEUS_Items.js` | Active verification suite for physical inventory and container storage mechanics with failure exit. |
| `tools/test_population_growth_and_immigration.js` | KEEP | `game/js/plugins/DEUS_Factions.js`, `DEUS_Colonists.js` | Active test of faction population growth, immigration thresholds, and demographics with failure exit. |
| `tools/test_portrait_clothing_offsets.js` | RENAME | Portrait clothing generator offsets | Visual calibration tool for modular portrait clothing offsets; contains no assertions. |
| `tools/test_post_town_hall_progression.js` | KEEP | `game/js/plugins/DEUS_Colonists.js`, `UF_Households.js` | Active in-engine test of colonist AI progression and workshop/homestead planning post-Town Hall with failure exit. |
| `tools/test_process_human_12.js` | RENAME | Face sprite sheet quantizer | Face asset quantization and sprite sheet build tool outputting to `game/img/faces/`; contains no assertions. |
| `tools/test_production_history_demographics.js` | KEEP | `game/js/plugins/DEUS_HistoricalDemographics.js` | Active regression proof for historical demographic simulation invariants and seed stability with failure exit. |
| `tools/test_profile_tabs.js` | ARCHIVE | `game/js/plugins/UF_ProfileTabs.js` | Targets deleted/archived UI plugin `UF_ProfileTabs.js` (fails with ENOENT if executed). |
| `tools/test_project_construction_loop.js` | KEEP | `game/js/plugins/DEUS_Projects.js`, `DEUS_Colonists.js` | Active headless test verifying autonomous shelter construction loop and material conservation with failure exit. |