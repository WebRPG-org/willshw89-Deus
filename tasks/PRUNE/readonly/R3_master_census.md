# Project DEUS - Master Test Census (Pro-Tier Reconciled)

**Audit Scope:** Complete repository test inventory across `tools/` and subdirectories (`tools/**/test_*.js`).
**Reconciliation Authority:** Synthesis of partitioned batches R3a (A-E, 55 files), R3b (F-P, 71 files), and R3c (Q-Z + subdirs, 120 files).
**Total Audited:** 249 files (100% read-only inspection; zero execution).

## Master Census Summary

| Category | Count | Action in L5 |
|---|---|---|
| **KEEP** | 142 | Retain as active tests; ensure included in appropriate test suites |
| **ARCHIVE** | 40 | Move to `archive/tools/` (tests of deleted, unwired, or legacy forwarder subsystems) |
| **RENAME** | 51 | Rename to remove `test_` prefix (utilities, visual processors, benchmark harnesses, raw art checkers) |
| **NO_FAILURE_PATH** | 16 | Fix failure path (add real assertions, check process exit code) or remove from gate |
| **Total** | **249** | |

## Section 1: All NO_FAILURE_PATH Tests (Immediate Remediation Queue)

These 14 scripts are named `test_*` but violate Rule 4 by having no exit-1 path, hardcoding `true`, or exiting 0 on error:

| Path | Subject Code | Defect / Reason |
|---|---|---|
| `tools/test_all_animated_objects_live.js` | `game/js/plugins/UF_Anim.js` | Launches live NW.js playtest via spawnSync but never checks test results or test_output/results.txt, unconditionally exiting 0 even upon test failure or timeout. |
| `tools/test_all_faction_menus.js` | `game/js/plugins/UF_FactionMenus.js` | Executes tools/run_tests.js faction_menus within a try/catch block that swallows execution failures and exits 0 unconditionally. |
| `tools/test_creatures_ingame.js` | `game/js/plugins/UF_Wildlife.js, tools/run_tests.js wildlife` | Executes tools/run_tests.js wildlife within a try/catch block that catches errors without setting a non-zero exit code, exiting 0 unconditionally. |
| `tools/test_dwarves_ingame.js` | `Dwarf faction showcase, tools/run_tests.js smoke` | Runs tools/run_tests.js smoke within a try/catch block that logs errors to console but swallows them, exiting 0 unconditionally. |
| `tools/test_elves_ingame.js` | `Elf faction showcase, tools/run_tests.js smoke` | Runs tools/run_tests.js smoke within a try/catch block that swallows failures without setting a non-zero exit code, exiting 0 unconditionally. |
| `tools/test_golden_art_review_live.js` | `Golden Art Review playtest` | Contains hardcoded `true` assertion (Rule 4 violation: `t.check("grass_batch1_rendered", true, ...)`) and catches harness errors without non-zero exit. |
| `tools/test_light_wall_occlusion_live.js` | `game/js/plugins/DEUS_Objects.js, DEUS_Walls.js` | Injects assertions but invokes `childProcess.spawnSync` without inspecting `testResult.status`; unconditionally exits 0 even if test fails. |
| `tools/test_sack_ui_and_loose_items.js` | `game/js/plugins/DEUS_Bag.js` | Empty 0-byte file stub; contains no code or assertions and exits 0 unconditionally. |
| `tools/test_standard_4d_ingame.js` | `Live Standard 4D NW.js playtest` | Live NW.js screenshot showcase runner for 4D charsets; swallows harness errors and exits 0 unconditionally with no assertions. |
| `tools/test_standard_8d_ingame.js` | `Live Standard 8D NW.js playtest` | Live NW.js screenshot showcase runner for 8D charsets; swallows harness errors and exits 0 unconditionally with no assertions. |
| `tools/test_temperate_arid_transition_live.js` | `Live Cross-Biome NW.js playtest` | Live NW.js showcase script with hardcoded true assertion (Rule 4 violation: t.check('temperate_arid_transition_verified', true, ...)); can never fail. |
| `tools/test_tilesets_live.js` | `Live Tileset NW.js playtest` | Live NW.js showcase runner for tilesets; swallows errors and exits 0 unconditionally with no assertions. |
| `tools/test_title_menu.js` | `Live Title Menu screenshot` | Title menu screenshot capture runner; swallows errors and exits 0 unconditionally with no assertions. |
| `tools/test_underground_room.js` | `Live Underground Room NW.js playtest` | Live NW.js screenshot runner for noon underground room visual review; swallows errors and exits 0 unconditionally with no assertions. |
| `tools/test_water_ingame.js` | `Live Water NW.js playtest` | Live NW.js screenshot runner for water pond surface flow; swallows errors and exits 0 unconditionally with no assertions. |
| `tools/ops/pm_launch/test_top_models_effort.ps1` | `pm_ops/top_models.ps1` | PowerShell launch evaluation script comparing model effort settings; prints status without test assertions or failure exits. |

## Section 2: All ARCHIVE Candidates (Dead Subsystems)

| Path | Subject Code | Reason |
|---|---|---|
| `tools/test_agriculture.js` | `game/js/plugins/UF_Agriculture.js, game/js/plugins/UF_Skills.js` | Attempts to load UF_Agriculture.js and UF_Skills.js which do not exist; tests dead/archived farming subsystems frozen under DEC-037. |
| `tools/test_birth_rate_halved.js` | `game/js/plugins/UF_Colonists.js, game/js/plugins/UF_History.js, game/js/plugins/UF_Ecology.js` | Asserts specific code strings inside legacy UF_* plugins that have been replaced with 17-line backward compatibility shims, causing test assertions to fail on dead files. |
| `tools/test_callings_and_clearing_live.js` | `game/js/plugins/UF_Callings.js` | Relies on non-existent UF_Callings.js and legacy pre-DEUS clearing protocols; civilization/labor callings subsystems are dead/archived. |
| `tools/test_callings_system.js` | `game/js/plugins/UF_Callings.js` | Directly requires non-existent ../game/js/plugins/UF_Callings.js (fails with MODULE_NOT_FOUND); callings system is dead/archived. |
| `tools/test_continuous_frontier_progression.js` | `game/js/plugins/UF_ProfileTabs.js, game/js/plugins/UF_Colonists.js` | Tests legacy pre-DEUS Town Hall / alcove bed settlement progression relying on non-existent UF_ProfileTabs.js and UF_Colonists shim; superseded by DEUS_Projects autonomous settlement system. |
| `tools/test_cooperative_building_and_offspring_pairbonding.js` | `game/js/plugins/UF_Colonists.js, game/js/plugins/UF_Households.js` | Tests dead pre-DEUS prototype logic for focal household construction and offspring pairbonding by string-patching UF_Colonists and UF_Households (both are dead/archived shims). |
| `tools/test_cooperative_homestead_construction.js` | `game/js/plugins/UF_Households.js, game/js/plugins/UF_Colonists.js` | In-engine test for obsolete Town Hall / activeFocalHousehold cooperative homestead system that relies on archived UF_Households and UF_Colonists shims. |
| `tools/test_culture_growth.js` | `game/js/plugins/UF_CultureGrowth.js` | Directly reads non-existent ../game/js/plugins/UF_CultureGrowth.js (fails with ENOENT); culture growth system is dead/archived under civilization freeze. |
| `tools/test_diagonal_corners_and_doorways.js` | `game/js/plugins/UF_Movement8D.js` | Tests legacy pre-DEUS movement geometry by patching UF_Movement8D.js (which is now a 17-line shim lacking movement logic); superseded by DEUS_Movement8D.js. |
| `tools/test_dynamic_armor_reflection.js` | `game/js/plugins/UF_Generator.js` | Evaluates UF_Generator.js (which is now a 17-line shim lacking generator functions) and tests obsolete portrait reflection helpers; superseded by DEUS_Generator.js. |
| `tools/test_ecology.js` | `game/js/plugins/UF_Ecology.js` | Reads and mutates legacy UF_Ecology.js (which is now a 17-line shim lacking ecology simulation logic); superseded by DEUS_Ecology.js. |
| `tools/test_extraction_difficulty.js` | `game/js/plugins/UF_Skills.js` | Directly reads non-existent ../game/js/plugins/UF_Skills.js (fails with ENOENT); legacy skills and extraction difficulty system is dead/archived. |
| `tools/test_farm_view.js` | `game/js/plugins/UF_FarmView.js` | Targets deleted/archived farming visualization plugin `UF_FarmView.js` (fails with ENOENT if executed; farming frozen under DEC-037). |
| `tools/test_fire_safety.js` | `game/js/plugins/UF_FireSafety.js` | Targets deleted/archived plugin `UF_FireSafety.js` (fails with ENOENT if executed). |
| `tools/test_goals.js` | `game/js/plugins/UF_Goals.js` | Targets deleted/archived plugin `UF_Goals.js` (fails with ENOENT if executed). |
| `tools/test_ludeon_planning.js` | `game/js/plugins/UF_Construction.js` | Targets non-existent/archived 4-stage construction plugin `UF_Construction.js` (assertions fail due to missing plugin). |
| `tools/test_material_refining_and_tech_pacing.js` | `game/js/plugins/UF_CultureGrowth.js` | Targets deleted/archived plugin `UF_CultureGrowth.js` (fails with ENOENT if executed; culture tech frozen under DEC-037). |
| `tools/test_profile_tabs.js` | `game/js/plugins/UF_ProfileTabs.js` | Targets deleted/archived UI plugin `UF_ProfileTabs.js` (fails with ENOENT if executed). |
| `tools/test_sanitation_system.js` | `game/js/plugins/UF_Sanitation.js, UF_SettlementPillars.js` | Attempts to load UF_Sanitation.js and UF_SettlementPillars.js which do not exist on disk; tests dead/archived sanitation subsystem. |
| `tools/test_second_by_second_history.js` | `game/js/plugins/UF_History.js, UF_Colonists.js, UF_Households.js` | String-patches and evaluates legacy UF_* plugins that have been replaced by 17-line backward compatibility shims lacking history simulation code. |
| `tools/test_settlement_pillars.js` | `game/js/plugins/UF_SettlementPillars.js` | Directly requires non-existent UF_SettlementPillars.js (fails with MODULE_NOT_FOUND); dead/archived settlement pillar subsystem. |
| `tools/test_unified_capability_proof.js` | `game/js/plugins/UF_Proficiency.js` | Directly requires non-existent ../game/js/plugins/UF_Proficiency.js (fails with MODULE_NOT_FOUND); legacy proficiency subsystem is dead/archived. |
| `tools/test_var2_suite.js` | `game/img/characters/$UF_Human_Male_2_*` | Batch verification of Adult Male Human Variation 2 sprite sheets which were deleted in the 2026-09-29 art restart under DEC-007. |
| `tools/test_var_suite.js` | `game/img/characters/$UF_Human_Male_3_*` | Batch verification of Adult Male Human Variation 3 sprite sheets which were deleted in the 2026-09-29 art restart under DEC-007. |
| `tools/test_walls_ingame.js` | `game/js/plugins/UF_Walls.js` | Requires targetHook in legacy UF_Walls.js which has been replaced by a 17-line shim lacking wall showcase hooks; exits 1 on dead file. |
| `tools/test_z_doors.js` | `game/js/plugins/UF_Doors.js` | Evaluates legacy UF_Doors.js which has been replaced with a 17-line backward compatibility shim; tests dead/superseded plugin file. |
| `tools/test_z_fire.js` | `game/js/plugins/UF_Fire.js` | Evaluates legacy UF_Fire.js which has been replaced with a 17-line backward compatibility shim; tests dead/superseded plugin file. |
| `tools/test_z_floors.js` | `game/js/plugins/UF_Floors.js` | Evaluates legacy UF_Floors.js which has been replaced with a 17-line backward compatibility shim; tests dead/superseded plugin file. |
| `tools/test_z_flora.js` | `game/js/plugins/UF_WorldGen.js, UF_Objects.js` | Evaluates legacy UF_WorldGen.js and UF_Objects.js which have both been replaced with 17-line backward compatibility shims; tests dead/superseded plugin files. |
| `tools/test_z_ownership.js` | `game/js/plugins/UF_Ownership.js` | Evaluates legacy UF_Ownership.js which has been replaced with a 17-line backward compatibility shim; tests dead/superseded plugin file. |
| `tools/test_z_walls.js` | `game/js/plugins/UF_Walls.js` | Evaluates legacy UF_Walls.js which has been replaced with a 17-line backward compatibility shim; tests dead/superseded plugin file. |
| `tools/combat_rt/test_combat_rt.js` | `game/js/sim/combat_rt/ & DEUS_CombatRT.js` | Tests DEUS_CombatRT.js / game/js/sim/combat_rt/, an unwired real-time combat system scheduled for archival per R2 audit. |
| `tools/depth_demo/test_depth_demo.js` | `DEUS_DepthDemo.js & DEUS_DepthCues.js` | Tests DEUS_DepthDemo.js and DEUS_DepthCues.js, unwired presentation demo plugins scheduled for archival per R2 audit. |
| `tools/layer_overlays/test_layer_overlays.js` | `game/js/plugins/DEUS_LayerOverlays.js` | Tests DEUS_LayerOverlays.js, an unwired overlay plugin scheduled for archival per R2 audit. |
| `tools/select_xlayer/test_xlayer_select.js` | `game/js/plugins/DEUS_Select.js, DEUS_LayerOverlays.js` | Tests WG.00.36 cross-layer selection which requires the unwired DEUS_LayerOverlays.js scheduled for archival per R2 audit. |
| `tools/society/test_minting_engine.js` | `game/js/plugins/DEUS_Mint.js` | Tests DEUS_Mint.js coin minting engine; DEUS_Mint.js is an unwired plugin scheduled for archival per R2 audit. |
| `tools/taming/test_taming.js` | `game/js/plugins/DEUS_Taming.js & game/js/sim/taming/` | Tests DEUS_Taming.js and game/js/sim/taming/, an unwired creature taming system scheduled for archival per R2 audit. |
| `tools/taming_party/test_tamed_party_combat.js` | `game/js/sim/taming/party.js` | Tests game/js/sim/taming/party.js, an unwired creature party combat module scheduled for archival per R2 audit. |
| `tools/world_items/test_persistent_objects.js` | `game/js/plugins/DEUS_WorldItems.js & game/js/sim/world_items/` | Tests DEUS_WorldItems.js / game/js/sim/world_items/, an unwired physical item subsystem scheduled for archival per R2 audit. |
| `tools/world_items/test_world_items.js` | `game/js/plugins/DEUS_WorldItems.js & game/js/sim/world_items/` | Tests DEUS_WorldItems.js and world item hash grid; unwired subsystem scheduled for archival per R2 audit. |

## Section 3: All RENAME Candidates (Tools & Utilities)

| Path | Subject Code | Purpose / Reason |
|---|---|---|
| `tools/test_adam_res.js` | `Ultima 7 SHAPES.VGA extraction / game/img/characters/$Adam.png` | Inspection utility that decodes U7 shape frames and checks $Adam.png dimensions; contains no assertions or failure exit paths. |
| `tools/test_adam_scales.js` | `Ultima 7 SHAPES.VGA extraction / sprite scaling reference` | Graphic generation tool rendering 5x and 6x scaled comparison sheets to reference/; contains no assertions or failure exit paths. |
| `tools/test_all_walk_cycles.js` | `art/raw/*_walk.png, tools/build_pro_human_male.js` | Filmstrip generator extracting walk cycles across 12 character variants and writing preview sheets; contains no assertions or exit codes. |
| `tools/test_clean_attack_sheet.js` | `art/raw/human_male_pro_4d_attack.png, tools/build_pro_human_male.js` | Art assembly processor slicing raw attack frames, applying dark outlines, and generating 12-sprite charset pro_attack_12_sheet.png; contains no assertions. |
| `tools/test_clean_bow_sheet.js` | `art/raw/human_male_pro_4d_bow.png, tools/build_pro_human_male.js` | Art assembly processor slicing raw bow frames and assembling 12-sprite charset pro_bow_12_sheet.png; contains no assertions. |
| `tools/test_clean_downed_sheet.js` | `art/raw/human_male_pro_4d_downed.png, tools/build_pro_human_male.js` | Art assembly processor slicing raw downed frames and assembling 12-sprite charset pro_downed_12_sheet.png; contains no assertions. |
| `tools/test_clean_haul_sheet.js` | `art/raw/human_male_pro_4d_haul.png, tools/build_pro_human_male.js` | Art assembly processor slicing raw haul frames and assembling 12-sprite charset pro_haul_12_sheet.png; contains no assertions. |
| `tools/test_clean_magic_sheet.js` | `art/raw/human_male_pro_4d_cast.png, tools/build_pro_human_male.js` | Art assembly processor slicing raw cast frames and assembling 12-sprite charset pro_magic_12_sheet.png; contains no assertions. |
| `tools/test_clean_u7_composites.js` | `art/raw/u7_modular_portraits_nano_pro.png` | Image composite processor extracting heads, hair, beards, and clothes to render sample portraits in scratch/; contains no assertions. |
| `tools/test_clean_walk_sheet.js` | `art/raw/human_male_pro_4d_walk.png, art/palette/uf.hex` | Palette-snapping and slicing processor generating 12-sprite walk charset pro_walk_12_sheet.png; contains no assertions. |
| `tools/test_clean_walk_sheet2.js` | `art/raw/human_male_pro_4d_walk.png, art/palette/uf.hex` | Variant walk sheet processor generating pro_walk_12_sheet_clean.png; contains no assertions. |
| `tools/test_clean_walk_sheet3.js` | `art/raw/human_male_pro_4d_walk.png, art/palette/uf.hex` | Variant walk sheet processor generating pro_walk_12_sheet_perfect.png; contains no assertions. |
| `tools/test_clean_work_sheet.js` | `art/raw/human_male_pro_4d_work.png, tools/build_pro_human_male.js` | Art assembly processor slicing raw work frames and assembling 12-sprite charset pro_work_12_sheet.png; contains no assertions. |
| `tools/test_deer_action_boxes.js` | `art/raw/pro_deer_eat.png, art/raw/pro_deer_attack.png, art/raw/pro_deer_sleep.png` | Sprite bounding-box measurement and inspection tool logging cell coordinates for raw deer images; contains no assertions or exit codes. |
| `tools/test_eye_variations.js` | `art/raw eye variation ASCII grids` | Sprite generation and rendering utility outputting 1x and 16x eye variation PNGs to game/test_output/; contains no assertions or exit codes. |
| `tools/test_facing_detection.js` | `tools/build_pro_human_male.js` | Diagnostic utility inspecting frame facing directions; contains no assertions or failure exit. |
| `tools/test_factions_live.js` | `game/js/plugins/DEUS_FactionMenus.js` | In-game screenshot capture script for faction dialogues; contains no assertions and catches/suppresses errors. |
| `tools/test_faction_menus_clean.js` | `tools/run_tests.js (faction_menus)` | Post-test screenshot harvesting utility copying PNGs to `art/review/menus/`; contains no assertions. |
| `tools/test_female_u7_composites.js` | `Modular portrait raw art` | Modular portrait extraction and compositing script writing to scratch folder; contains no assertions. |
| `tools/test_ff5_candidates.js` | `FF5 candidate pixel art` | Pixel art candidate rendering tool outputting 16x PNGs to `game/test_output/`; contains no assertions. |
| `tools/test_ff5_proportions_and_footsteps.js` | `FF5 proportion comparison art` | Visual comparison atlas generator outputting to `art/review/`; contains no assertions. |
| `tools/test_fixed_cycle.js` | `Male walk cycle raw art` | Frame extraction and filmstrip generator utility misnamed as test; contains no assertions. |
| `tools/test_fixed_walk_playback.js` | `$UF_Human_Male_1_Walk.png` | Art review playback matrix generator writing to `art/review/`; contains no assertions. |
| `tools/test_fix_facings.js` | `Character sprite facing analyzer` | Directional facing inspection utility analyzing skin pixel bias; contains no assertions. |
| `tools/test_gen3_metrics.js` | `Underground gen3 math prototype` | Procedural cave generation prototype and statistical metric calculator; contains no assertions. |
| `tools/test_generator_combinations.js` | `Character sprite generator` | Library module exporting generator compositing functions (`compositeCharset`, `compositePortrait`); contains no assertions. |
| `tools/test_ground_shades_prototype.js` | `game/data/UF_WorldCatalog.json ground shades` | Ground shade data mapping prototype; contains no assertions. |
| `tools/test_hare_action_boxes.js` | `Raw hare sprite art` | Bounding box scanning utility for raw hare sprite sheets; contains no assertions. |
| `tools/test_haul_builder.js` | `Hauling character sprite builder` | Art processing utility compositing crates onto walking frames; contains no assertions. |
| `tools/test_human_dwarf_8d_live.js` | `Human & Dwarf 8D in-game showcase` | Screenshot capture harness script; contains no assertions (`t.check` is never called) and ignores harness errors. |
| `tools/test_human_female_variations_live.js` | `Human female variations showcase` | Visual showcase capture script for female variants; contains no assertions. |
| `tools/test_human_male_live_ingame.js` | `Human male actions showcase` | Visual showcase capture script for male actions; contains no assertions and ignores errors. |
| `tools/test_human_male_variations_live.js` | `Human male variations showcase` | Visual showcase capture script for male variants; contains no assertions. |
| `tools/test_menu_ingame.js` | `In-game menu & dialogue windowskin` | Menu and dialogue screenshot capture script; contains no assertions. |
| `tools/test_palette.js` | `art/palette/uf.hex` | Palette loading and color-snapping prototype utility; contains no assertions. |
| `tools/test_portrait_clothing_offsets.js` | `Portrait clothing generator offsets` | Visual calibration tool for modular portrait clothing offsets; contains no assertions. |
| `tools/test_process_human_12.js` | `Face sprite sheet quantizer` | Face asset quantization and sprite sheet build tool outputting to `game/img/faces/`; contains no assertions. |
| `tools/test_quantize.ps1` | `tools/process_assets.ps1 & FastQuantizer` | PowerShell image quantization benchmark and conversion utility; contains no assertions or failure exit paths. |
| `tools/test_r4c2_foreshorten.js` | `Chest sprite raw art` | Image processing utility foreshortening chest lid sprites and outputting test_r4c2.png; contains no assertions. |
| `tools/test_resize_face.js` | `Face portrait raw art` | Image resizing and palette-snapping utility generating 144x144 test crops in art/review/; contains no assertions. |
| `tools/test_round_world_live.js` | `Live Round World NW.js playtest` | In-engine screenshot capture harness demonstrating East/West and North/South seam crossings; contains no assertions. |
| `tools/test_seamless_seam_live.js` | `Live Seamless Seam NW.js playtest` | In-engine screenshot capture harness positioning camera over river seam; contains no assertions. |
| `tools/test_sheep_action_boxes.js` | `Raw sheep sprite art` | Bounding box scanning and span measurement tool analyzing raw sheep sprite sheets; contains no assertions. |
| `tools/test_side_combos.js` | `Male walk cycle raw art` | Frame extraction and filmstrip compositor utility generating test images for human male walk frames; contains no assertions. |
| `tools/test_slice_human.js` | `Human male face raw art` | Slicing utility extracting face cells from temporary brain artifact JPEG to art/review/test_crops/; contains no assertions. |
| `tools/test_snapshot.js` | `tools/run_tests.js` | Test runner and disposable snapshot environment CLI utility; provisions game/ copy and delegates to run_tests.js. |
| `tools/test_u7_modular_composition.js` | `U7 modular portrait raw art` | Image composite processor extracting heads, hair, beards, and clothes to render sample portraits in scratch/; contains no assertions. |
| `tools/test_v2_clean_u7_composites.js` | `U7 modular portrait raw art` | Image composite processor tuning bounding boxes and extracting portrait pieces; contains no assertions. |
| `tools/test_walk_triplets.js` | `Male walk cycle raw art` | Filmstrip generation tool extracting walk cycle triplets at 4x zoom to inspect stride cadence; contains no assertions. |
| `tools/test_wolf_cleanup.js` | `Wolf walk cycle raw art` | Sprite cleanup utility flood-filling background magenta pixels in wolf walk sheet; contains no assertions. |
| `tools/test_z_cavern_gen.js` | `Procedural cave generation prototype` | Cavern noise generator prototype printing ASCII preview maps to console; contains no assertions. |

## Section 4: Master Inventory (All 249 Files)

| Path | Classification | Subject Code |
|---|---|---|
| `tools/test_adam_res.js` | **RENAME** | `Ultima 7 SHAPES.VGA extraction / game/img/characters/$Adam.png` |
| `tools/test_adam_scales.js` | **RENAME** | `Ultima 7 SHAPES.VGA extraction / sprite scaling reference` |
| `tools/test_aging_and_lifespan.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js` |
| `tools/test_agriculture.js` | **ARCHIVE** | `game/js/plugins/UF_Agriculture.js, game/js/plugins/UF_Skills.js` |
| `tools/test_all_animated_objects_live.js` | **NO_FAILURE_PATH** | `game/js/plugins/UF_Anim.js` |
| `tools/test_all_faction_menus.js` | **NO_FAILURE_PATH** | `game/js/plugins/UF_FactionMenus.js` |
| `tools/test_all_object_charsets.js` | **KEEP** | `game/data/UF_WorldCatalog.json, tools/art_check.js, tools/originality_check.js` |
| `tools/test_all_walk_cycles.js` | **RENAME** | `art/raw/*_walk.png, tools/build_pro_human_male.js` |
| `tools/test_ally_movement_exclusive_action_square.js` | **KEEP** | `game/js/plugins/UF_Movement8D.js, game/js/plugins/UF_Jobs.js, game/js/plugins/UF_Test.js` |
| `tools/test_aquifer_seepage.js` | **KEEP** | `game/js/sim/hydrology/index.js` |
| `tools/test_autonomous_project_dispatch.js` | **KEEP** | `game/js/plugins/DEUS_Projects.js, game/js/plugins/DEUS_Colonists.js, game/js/plugins/DEUS_Jobs.js` |
| `tools/test_autonomous_settlement_closure.js` | **KEEP** | `game/js/plugins/DEUS_Projects.js, game/js/plugins/DEUS_Colonists.js, game/js/plugins/DEUS_Jobs.js` |
| `tools/test_autonomous_work_recovery.js` | **KEEP** | `game/js/plugins/DEUS_Projects.js, game/js/plugins/DEUS_Colonists.js, game/js/plugins/DEUS_Jobs.js` |
| `tools/test_bag_and_racial_banners.js` | **KEEP** | `game/js/plugins/DEUS_Bag.js, game/js/plugins/DEUS_Items.js, game/data/UF_WorldCatalog.json` |
| `tools/test_biome_standard.js` | **KEEP** | `game/data/DEUS_BiomeRegistry.json, tools/biome_resolver.js` |
| `tools/test_birth_rate_halved.js` | **ARCHIVE** | `game/js/plugins/UF_Colonists.js, game/js/plugins/UF_History.js, game/js/plugins/UF_Ecology.js` |
| `tools/test_building_variety_live.js` | **KEEP** | `game/js/plugins/UF_Levels.js, game/js/plugins/UF_Floors.js, game/js/plugins/UF_Objects.js` |
| `tools/test_callings_and_clearing_live.js` | **ARCHIVE** | `game/js/plugins/UF_Callings.js` |
| `tools/test_callings_system.js` | **ARCHIVE** | `game/js/plugins/UF_Callings.js` |
| `tools/test_camera_zoom.js` | **KEEP** | `game/js/plugins/DEUS_Camera.js` |
| `tools/test_chest_left_click_info.js` | **KEEP** | `game/js/plugins/DEUS_Containers.js` |
| `tools/test_clean_attack_sheet.js` | **RENAME** | `art/raw/human_male_pro_4d_attack.png, tools/build_pro_human_male.js` |
| `tools/test_clean_bow_sheet.js` | **RENAME** | `art/raw/human_male_pro_4d_bow.png, tools/build_pro_human_male.js` |
| `tools/test_clean_downed_sheet.js` | **RENAME** | `art/raw/human_male_pro_4d_downed.png, tools/build_pro_human_male.js` |
| `tools/test_clean_haul_sheet.js` | **RENAME** | `art/raw/human_male_pro_4d_haul.png, tools/build_pro_human_male.js` |
| `tools/test_clean_magic_sheet.js` | **RENAME** | `art/raw/human_male_pro_4d_cast.png, tools/build_pro_human_male.js` |
| `tools/test_clean_u7_composites.js` | **RENAME** | `art/raw/u7_modular_portraits_nano_pro.png` |
| `tools/test_clean_walk_sheet.js` | **RENAME** | `art/raw/human_male_pro_4d_walk.png, art/palette/uf.hex` |
| `tools/test_clean_walk_sheet2.js` | **RENAME** | `art/raw/human_male_pro_4d_walk.png, art/palette/uf.hex` |
| `tools/test_clean_walk_sheet3.js` | **RENAME** | `art/raw/human_male_pro_4d_walk.png, art/palette/uf.hex` |
| `tools/test_clean_work_sheet.js` | **RENAME** | `art/raw/human_male_pro_4d_work.png, tools/build_pro_human_male.js` |
| `tools/test_column_landforms.js` | **KEEP** | `game/js/plugins/DEUS_WorldGen.js, game/js/plugins/DEUS_Levels.js` |
| `tools/test_combat_dying_integration.js` | **KEEP** | `game/js/plugins/DEUS_Combat.js, game/js/plugins/DEUS_Dnd5e.js` |
| `tools/test_conditions_native_closure.js` | **KEEP** | `game/js/plugins/DEUS_Conditions.js, game/js/plugins/DEUS_Combat.js` |
| `tools/test_conditions_system.js` | **KEEP** | `game/js/plugins/DEUS_Conditions.js, game/js/plugins/DEUS_Combat.js` |
| `tools/test_container_item_interactions.js` | **KEEP** | `game/js/plugins/DEUS_Containers.js, game/js/plugins/DEUS_Items.js, game/js/plugins/DEUS_Sheet.js` |
| `tools/test_continuous_frontier_progression.js` | **ARCHIVE** | `game/js/plugins/UF_ProfileTabs.js, game/js/plugins/UF_Colonists.js` |
| `tools/test_cooperative_building_and_offspring_pairbonding.js` | **ARCHIVE** | `game/js/plugins/UF_Colonists.js, game/js/plugins/UF_Households.js` |
| `tools/test_cooperative_homestead_construction.js` | **ARCHIVE** | `game/js/plugins/UF_Households.js, game/js/plugins/UF_Colonists.js` |
| `tools/test_creature_inventory_black_box.js` | **KEEP** | `game/js/plugins/DEUS_Sheet.js, game/js/plugins/DEUS_Bag.js` |
| `tools/test_creatures_ingame.js` | **NO_FAILURE_PATH** | `game/js/plugins/UF_Wildlife.js, tools/run_tests.js wildlife` |
| `tools/test_culling_native.js` | **KEEP** | `game/js/plugins/DEUS_Culling.js` |
| `tools/test_culture_growth.js` | **ARCHIVE** | `game/js/plugins/UF_CultureGrowth.js` |
| `tools/test_d20_equipment_slots.js` | **KEEP** | `game/data/UF_WorldCatalog.json, game/js/plugins/DEUS_Combat.js, game/js/plugins/DEUS_Sheet.js` |
| `tools/test_deep_cuts_and_mountain_cap_wg0041.js` | **KEEP** | `game/js/plugins/DEUS_Levels.js, game/js/plugins/DEUS_WorldGen.js` |
| `tools/test_deer_action_boxes.js` | **RENAME** | `art/raw/pro_deer_eat.png, art/raw/pro_deer_attack.png, art/raw/pro_deer_sleep.png` |
| `tools/test_diagonal_corners_and_doorways.js` | **ARCHIVE** | `game/js/plugins/UF_Movement8D.js` |
| `tools/test_duplicate_registration.js` | **KEEP** | `game/data/UF_WorldCatalog.json, game/data/DEUS_WorldCatalog.json, game/js/plugins/DEUS_Items.js` |
| `tools/test_dwarves_ingame.js` | **NO_FAILURE_PATH** | `Dwarf faction showcase, tools/run_tests.js smoke` |
| `tools/test_dynamic_armor_reflection.js` | **ARCHIVE** | `game/js/plugins/UF_Generator.js` |
| `tools/test_ecology.js` | **ARCHIVE** | `game/js/plugins/UF_Ecology.js` |
| `tools/test_elves_ingame.js` | **NO_FAILURE_PATH** | `Elf faction showcase, tools/run_tests.js smoke` |
| `tools/test_equipment_drag.js` | **KEEP** | `game/js/plugins/DEUS_Items.js` |
| `tools/test_extraction_difficulty.js` | **ARCHIVE** | `game/js/plugins/UF_Skills.js` |
| `tools/test_eye_variations.js` | **RENAME** | `art/raw eye variation ASCII grids` |
| `tools/test_facing_detection.js` | **RENAME** | `tools/build_pro_human_male.js` |
| `tools/test_factions_live.js` | **RENAME** | `game/js/plugins/DEUS_FactionMenus.js` |
| `tools/test_faction_construction_and_homes.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js, UF_Households.js` |
| `tools/test_faction_founder_pairbonding.js` | **KEEP** | `game/js/plugins/DEUS_Factions.js, DEUS_History.js` |
| `tools/test_faction_menus_clean.js` | **RENAME** | `tools/run_tests.js (faction_menus)` |
| `tools/test_faction_reproduction.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js, DEUS_Factions.js` |
| `tools/test_faction_starting_gear.js` | **KEEP** | `game/js/plugins/DEUS_Factions.js, DEUS_Items.js` |
| `tools/test_family_compounds_and_shops.js` | **KEEP** | `game/js/plugins/UF_Households.js, prop charsets` |
| `tools/test_family_integration.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js, UF_Households.js` |
| `tools/test_farm_view.js` | **ARCHIVE** | `game/js/plugins/UF_FarmView.js` |
| `tools/test_female_u7_composites.js` | **RENAME** | `Modular portrait raw art` |
| `tools/test_ff5_candidates.js` | **RENAME** | `FF5 candidate pixel art` |
| `tools/test_ff5_proportions_and_footsteps.js` | **RENAME** | `FF5 proportion comparison art` |
| `tools/test_fire_safety.js` | **ARCHIVE** | `game/js/plugins/UF_FireSafety.js` |
| `tools/test_fixed_cycle.js` | **RENAME** | `Male walk cycle raw art` |
| `tools/test_fixed_walk_playback.js` | **RENAME** | `$UF_Human_Male_1_Walk.png` |
| `tools/test_fix_facings.js` | **RENAME** | `Character sprite facing analyzer` |
| `tools/test_fog_z_level_live.js` | **KEEP** | `game/js/plugins/DEUS_Fog.js, DEUS_Levels.js` |
| `tools/test_foliage_sprite_animations.js` | **KEEP** | `Foliage character sets & sidecars` |
| `tools/test_gen3_metrics.js` | **RENAME** | `Underground gen3 math prototype` |
| `tools/test_generated_z2_cut_proof.js` | **KEEP** | `game/js/plugins/DEUS_WorldGen.js, DEUS_Fluid.js` |
| `tools/test_generator_combinations.js` | **RENAME** | `Character sprite generator` |
| `tools/test_geology_strata.js` | **KEEP** | `game/js/plugins/DEUS_World.js, DEUS_Levels.js` |
| `tools/test_goals.js` | **ARCHIVE** | `game/js/plugins/UF_Goals.js` |
| `tools/test_golden_art_review_live.js` | **NO_FAILURE_PATH** | `Golden Art Review playtest` |
| `tools/test_greater_z_roof_live.js` | **KEEP** | `game/js/plugins/DEUS_Floors.js, DEUS_Levels.js` |
| `tools/test_ground_shades_prototype.js` | **RENAME** | `game/data/UF_WorldCatalog.json ground shades` |
| `tools/test_hare_action_boxes.js` | **RENAME** | `Raw hare sprite art` |
| `tools/test_haul_builder.js` | **RENAME** | `Hauling character sprite builder` |
| `tools/test_hazard_reflex.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js, DEUS_Fire.js` |
| `tools/test_hazard_torture_live.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js, DEUS_Fire.js` |
| `tools/test_hearth_containment_and_provenance.js` | **KEEP** | `game/js/plugins/DEUS_Fire.js, DEUS_Colonists.js` |
| `tools/test_historical_carrying_capacity.js` | **KEEP** | `game/js/plugins/DEUS_HistoricalDemographics.js` |
| `tools/test_history_materialization_and_world_age.js` | **KEEP** | `game/js/plugins/DEUS_History.js, DEUS_Colonists.js` |
| `tools/test_hist_metadata_contracts.js` | **KEEP** | `game/js/plugins/DEUS_History.js` |
| `tools/test_households.js` | **KEEP** | `game/js/plugins/UF_Households.js` |
| `tools/test_human_dwarf_8d_live.js` | **RENAME** | `Human & Dwarf 8D in-game showcase` |
| `tools/test_human_female_variations_live.js` | **RENAME** | `Human female variations showcase` |
| `tools/test_human_inheritance.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js:745` |
| `tools/test_human_male_live_ingame.js` | **RENAME** | `Human male actions showcase` |
| `tools/test_human_male_variations_live.js` | **RENAME** | `Human male variations showcase` |
| `tools/test_layer_render_flat.js` | **KEEP** | `game/js/plugins/DEUS_Depth.js (WG.00.09b Lane K)` |
| `tools/test_layer_switch_inplace.js` | **KEEP** | `game/js/plugins/DEUS_Levels.js, DEUS_Depth.js` |
| `tools/test_light_wall_occlusion_live.js` | **NO_FAILURE_PATH** | `game/js/plugins/DEUS_Objects.js, DEUS_Walls.js` |
| `tools/test_liquid_depth_simulation.js` | **KEEP** | `game/js/plugins/DEUS_Fluid.js, DEUS_Levels.js` |
| `tools/test_live_town_center_progression.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js, UF_Households.js` |
| `tools/test_ludeon_planning.js` | **ARCHIVE** | `game/js/plugins/UF_Construction.js` |
| `tools/test_material_recipes.js` | **KEEP** | `game/js/plugins/DEUS_Items.js, DEUS_Jobs.js` |
| `tools/test_material_refining_and_tech_pacing.js` | **ARCHIVE** | `game/js/plugins/UF_CultureGrowth.js` |
| `tools/test_material_substitution.js` | **KEEP** | `game/js/plugins/DEUS_Items.js, UF_WorldCatalog.json` |
| `tools/test_menu_ingame.js` | **RENAME** | `In-game menu & dialogue windowskin` |
| `tools/test_minimap.js` | **KEEP** | `game/js/plugins/DEUS_Minimap.js, DEUS_Levels.js` |
| `tools/test_multi_deficit_settlement.js` | **KEEP** | `game/js/plugins/DEUS_Projects.js, DEUS_Colonists.js` |
| `tools/test_native_resolution_standard.js` | **KEEP** | `Native resolution standard (DW.01.02)` |
| `tools/test_native_survival_soak.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js, DEUS_DeathForensics.js` |
| `tools/test_natural_connections.js` | **KEEP** | `game/js/plugins/DEUS_NaturalConnections.js` |
| `tools/test_new_game_year0.js` | **KEEP** | `game/js/plugins/DEUS_Core.js, DEUS_History.js` |
| `tools/test_object_art.js` | **KEEP** | `game/data/UF_WorldCatalog.json object charsets` |
| `tools/test_object_originality.js` | **KEEP** | `World object originality (Rule 8)` |
| `tools/test_package_proofs_ingame.js` | **KEEP** | `Packages 1-3 (Space, Matter, Aquifer)` |
| `tools/test_palette.js` | **RENAME** | `art/palette/uf.hex` |
| `tools/test_palette_standard.js` | **KEEP** | `art/palette/uf.hex, material ramps (DW.01.05)` |
| `tools/test_perf_benchmark.js` | **KEEP** | `Engine 60 FPS baseline (DEUS-PERF-01)` |
| `tools/test_physical_inventory_proof.js` | **KEEP** | `game/js/plugins/DEUS_Containers.js, DEUS_Items.js` |
| `tools/test_population_growth_and_immigration.js` | **KEEP** | `game/js/plugins/DEUS_Factions.js, DEUS_Colonists.js` |
| `tools/test_portrait_clothing_offsets.js` | **RENAME** | `Portrait clothing generator offsets` |
| `tools/test_post_town_hall_progression.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js, UF_Households.js` |
| `tools/test_process_human_12.js` | **RENAME** | `Face sprite sheet quantizer` |
| `tools/test_production_history_demographics.js` | **KEEP** | `game/js/plugins/DEUS_HistoricalDemographics.js` |
| `tools/test_profile_tabs.js` | **ARCHIVE** | `game/js/plugins/UF_ProfileTabs.js` |
| `tools/test_project_construction_loop.js` | **KEEP** | `game/js/plugins/DEUS_Projects.js, DEUS_Colonists.js` |
| `tools/test_quantize.ps1` | **RENAME** | `tools/process_assets.ps1 & FastQuantizer` |
| `tools/test_r4c2_foreshorten.js` | **RENAME** | `Chest sprite raw art` |
| `tools/test_region_seam_continuity.js` | **KEEP** | `game/js/plugins/DEUS_Levels.js, DEUS_WorldGen.js` |
| `tools/test_regrowth_construction_guard.js` | **KEEP** | `game/js/plugins/DEUS_Objects.js, DEUS_WorldGen.js` |
| `tools/test_resize_face.js` | **RENAME** | `Face portrait raw art` |
| `tools/test_resource_economy_standard.js` | **KEEP** | `game/data/DEUS_ResourceRegistry.json` |
| `tools/test_resource_node_materials.js` | **KEEP** | `game/data/UF_WorldCatalog.json` |
| `tools/test_round_world.js` | **KEEP** | `game/js/plugins/DEUS_World.js` |
| `tools/test_round_world_live.js` | **RENAME** | `Live Round World NW.js playtest` |
| `tools/test_sack_ui_and_loose_items.js` | **NO_FAILURE_PATH** | `game/js/plugins/DEUS_Bag.js` |
| `tools/test_sanitation_system.js` | **ARCHIVE** | `game/js/plugins/UF_Sanitation.js, UF_SettlementPillars.js` |
| `tools/test_scale_standard.js` | **KEEP** | `game/data/DEUS_ScaleRegistry.json, tools/scale_resolver.js` |
| `tools/test_seamless_map_edges.js` | **KEEP** | `game/js/plugins/DEUS_World.js, DEUS_WorldGen.js` |
| `tools/test_seamless_seam_live.js` | **RENAME** | `Live Seamless Seam NW.js playtest` |
| `tools/test_second_by_second_history.js` | **ARCHIVE** | `game/js/plugins/UF_History.js, UF_Colonists.js, UF_Households.js` |
| `tools/test_settlement_domestic_housing.js` | **KEEP** | `game/js/plugins/DEUS_Projects.js, DEUS_Colonists.js, UF_Households.js` |
| `tools/test_settlement_expansion_multi_dwelling.js` | **KEEP** | `game/js/plugins/DEUS_Projects.js, DEUS_Colonists.js, UF_Households.js` |
| `tools/test_settlement_pillars.js` | **ARCHIVE** | `game/js/plugins/UF_SettlementPillars.js` |
| `tools/test_settlement_projects.js` | **KEEP** | `game/js/plugins/DEUS_Projects.js, DEUS_Objects.js, DEUS_Jobs.js` |
| `tools/test_sheep_action_boxes.js` | **RENAME** | `Raw sheep sprite art` |
| `tools/test_side_combos.js` | **RENAME** | `Male walk cycle raw art` |
| `tools/test_slice_human.js` | **RENAME** | `Human male face raw art` |
| `tools/test_snapshot.js` | **RENAME** | `tools/run_tests.js` |
| `tools/test_soil_geomorphology.js` | **KEEP** | `game/js/sim/geomorphology/index.js` |
| `tools/test_srd_character_presentation.js` | **KEEP** | `game/data/plans/*.plan.json, tools/rules/` |
| `tools/test_srd_combat_proof.js` | **KEEP** | `game/js/sim/rules/rules.js, game/js/plugins/DEUS_Combat.js` |
| `tools/test_srd_equipment_proof.js` | **KEEP** | `game/js/sim/rules/rules.js, game/data/UF_WorldCatalog.json` |
| `tools/test_srd_parity.js` | **KEEP** | `game/js/sim/rules/rules.js` |
| `tools/test_srd_rules_proof.js` | **KEEP** | `game/js/sim/rules/rules.js` |
| `tools/test_stabilization.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js, DEUS_Jobs.js, DEUS_Projects.js` |
| `tools/test_standard_4d_ingame.js` | **NO_FAILURE_PATH** | `Live Standard 4D NW.js playtest` |
| `tools/test_standard_8d_ingame.js` | **NO_FAILURE_PATH** | `Live Standard 8D NW.js playtest` |
| `tools/test_starter_kit_and_stockpile.js` | **KEEP** | `game/js/plugins/DEUS_Items.js, DEUS_Stockpiles.js` |
| `tools/test_stockpiles_designation.js` | **KEEP** | `game/js/plugins/DEUS_Stockpiles.js, DEUS_Containers.js` |
| `tools/test_strata_cuts_and_caves.js` | **KEEP** | `game/js/plugins/DEUS_Levels.js, DEUS_WorldGen.js` |
| `tools/test_strata_fluid_reconciliation.js` | **KEEP** | `game/js/plugins/DEUS_World.js, DEUS_WorldGen.js, DEUS_Fluid.js` |
| `tools/test_strata_foundation.js` | **KEEP** | `game/js/plugins/DEUS_Levels.js, DEUS_WorldGen.js` |
| `tools/test_structural_collapse.js` | **KEEP** | `game/js/sim/structural/index.js` |
| `tools/test_survival_needs_loop.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js, DEUS_Items.js` |
| `tools/test_survival_regressions.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js, DEUS_World.js` |
| `tools/test_temperate_arid_transition_live.js` | **NO_FAILURE_PATH** | `Live Cross-Biome NW.js playtest` |
| `tools/test_tilesets_live.js` | **NO_FAILURE_PATH** | `Live Tileset NW.js playtest` |
| `tools/test_time_domains_proof.js` | **KEEP** | `game/js/plugins/UF_Time.js` |
| `tools/test_title_menu.js` | **NO_FAILURE_PATH** | `Live Title Menu screenshot` |
| `tools/test_town_hall_ai_live.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js, UF_Households.js` |
| `tools/test_u7_modular_composition.js` | **RENAME** | `U7 modular portrait raw art` |
| `tools/test_underground_room.js` | **NO_FAILURE_PATH** | `Live Underground Room NW.js playtest` |
| `tools/test_unified_capability_proof.js` | **ARCHIVE** | `game/js/plugins/UF_Proficiency.js` |
| `tools/test_unpartnered_shelter_progression.js` | **KEEP** | `game/js/plugins/DEUS_Projects.js, DEUS_Colonists.js` |
| `tools/test_upper_elevation_terrain.js` | **KEEP** | `game/js/plugins/DEUS_Levels.js, DEUS_World.js` |
| `tools/test_v2_clean_u7_composites.js` | **RENAME** | `U7 modular portrait raw art` |
| `tools/test_var2_suite.js` | **ARCHIVE** | `game/img/characters/$UF_Human_Male_2_*` |
| `tools/test_var_suite.js` | **ARCHIVE** | `game/img/characters/$UF_Human_Male_3_*` |
| `tools/test_verify_world_state_registry.js` | **KEEP** | `tools/verify_world_state_registry.js` |
| `tools/test_vertical_worldgen_proof.js` | **KEEP** | `game/js/plugins/DEUS_WorldGen.js, DEUS_Levels.js` |
| `tools/test_volumetric_terrain_column.js` | **KEEP** | `game/js/plugins/DEUS_Levels.js, DEUS_WorldGen.js` |
| `tools/test_walk_triplets.js` | **RENAME** | `Male walk cycle raw art` |
| `tools/test_walls_ingame.js` | **ARCHIVE** | `game/js/plugins/UF_Walls.js` |
| `tools/test_water_ingame.js` | **NO_FAILURE_PATH** | `Live Water NW.js playtest` |
| `tools/test_wolf_cleanup.js` | **RENAME** | `Wolf walk cycle raw art` |
| `tools/test_zoom_depth_coverage.js` | **KEEP** | `game/js/plugins/DEUS_Depth.js` |
| `tools/test_zrange.js` | **KEEP** | `game/js/plugins/DEUS_Levels.js, DEUS_World.js, DEUS_Fluid.js` |
| `tools/test_z_cavern_gen.js` | **RENAME** | `Procedural cave generation prototype` |
| `tools/test_z_doors.js` | **ARCHIVE** | `game/js/plugins/UF_Doors.js` |
| `tools/test_z_fire.js` | **ARCHIVE** | `game/js/plugins/UF_Fire.js` |
| `tools/test_z_floors.js` | **ARCHIVE** | `game/js/plugins/UF_Floors.js` |
| `tools/test_z_flora.js` | **ARCHIVE** | `game/js/plugins/UF_WorldGen.js, UF_Objects.js` |
| `tools/test_z_ownership.js` | **ARCHIVE** | `game/js/plugins/UF_Ownership.js` |
| `tools/test_z_walls.js` | **ARCHIVE** | `game/js/plugins/UF_Walls.js` |
| `tools/art/test_blank_templates.js` | **KEEP** | `tools/art/make_blank_templates.js` |
| `tools/art/test_catalogue.js` | **KEEP** | `art/catalogue/catalogue.json` |
| `tools/art/test_multi_variant_topology.js` | **KEEP** | `Multi-variant autotile bitmask logic` |
| `tools/art/test_place_art.js` | **KEEP** | `tools/art/place_art.js, tools/art/validate_art.js` |
| `tools/art/test_validate_asset_standard.js` | **KEEP** | `tools/art/validate_asset_standard.js` |
| `tools/audio/test_validate_audio_standard.js` | **KEEP** | `game/audio/` |
| `tools/combat_rt/test_combat_rt.js` | **ARCHIVE** | `game/js/sim/combat_rt/ & DEUS_CombatRT.js` |
| `tools/depth_demo/test_depth_demo.js` | **ARCHIVE** | `DEUS_DepthDemo.js & DEUS_DepthCues.js` |
| `tools/governance/test_check_claims.js` | **KEEP** | `tasks/wbs_registry.json, tools/governance/check_claims.js` |
| `tools/governance/test_check_invariants.js` | **KEEP** | `tools/governance/check_invariants.js` |
| `tools/governance/test_merge_gate.js` | **KEEP** | `tools/governance/merge_gate.js` |
| `tools/governance/fixtures/invariants/INV-FLD-02/tools/test_strata_fluid_reconciliation.js` | **KEEP** | `tools/governance/fixtures/invariants/INV-FLD-02/` |
| `tools/layer_overlays/test_layer_overlays.js` | **ARCHIVE** | `game/js/plugins/DEUS_LayerOverlays.js` |
| `tools/occlusion/test_occlusion_culling.js` | **KEEP** | `game/js/plugins/DEUS_Depth.js` |
| `tools/ops/test_run_gate.js` | **KEEP** | `tools/ops/run_gate.js` |
| `tools/plans/test_faction_plan_schema.js` | **KEEP** | `game/data/plans/TEMPLATE.plan.json` |
| `tools/plans/test_race_plans.js` | **KEEP** | `game/data/plans/*.plan.json` |
| `tools/rules/test_srd_rules.js` | **KEEP** | `game/js/sim/rules/` |
| `tools/security/test_check_dependencies.js` | **KEEP** | `package.json, tools/security/check_dependencies.js` |
| `tools/security/test_scan_secrets.js` | **KEEP** | `tools/security/scan_secrets.js` |
| `tools/security/test_support.js` | **KEEP** | `tools/security/support.js` |
| `tools/select_xlayer/test_xlayer_select.js` | **ARCHIVE** | `game/js/plugins/DEUS_Select.js, DEUS_LayerOverlays.js` |
| `tools/sim/test_decay_core.js` | **KEEP** | `game/js/sim/decay/core.js` |
| `tools/sim/test_fluid_attach.js` | **KEEP** | `game/js/sim/hydro/` |
| `tools/sim/test_ledger.js` | **KEEP** | `game/js/sim/ledger.js` |
| `tools/sim/test_ledger_longrun.js` | **KEEP** | `game/js/sim/ledger.js` |
| `tools/sim/test_living_world_rules.js` | **KEEP** | `game/js/plugins/DEUS_World.js` |
| `tools/sim/test_materials.js` | **KEEP** | `game/js/sim/materials.js` |
| `tools/sim/test_ore_sprout.js` | **KEEP** | `game/js/sim/decay/` |
| `tools/sim/test_reclaim.js` | **KEEP** | `game/js/sim/reclaim.js` |
| `tools/sim/test_reclaim_longrun.js` | **KEEP** | `game/js/sim/reclaim.js` |
| `tools/sim/test_sim_forward_guard.js` | **KEEP** | `tools/dev/sim_forward.js` |
| `tools/sim/test_underground_year0.js` | **KEEP** | `game/js/plugins/DEUS_WorldGen.js, DEUS_Levels.js` |
| `tools/sim/test_water_dynamics.js` | **KEEP** | `game/js/sim/hydro/` |
| `tools/sim/test_wildlife_rules_damage.js` | **KEEP** | `game/js/sim/rules/` |
| `tools/society/test_craft_catalogue.js` | **KEEP** | `game/data/society/craft_catalogue.json` |
| `tools/society/test_militia.js` | **KEEP** | `game/js/sim/society/DEUS_Militia.js` |
| `tools/society/test_minting_engine.js` | **ARCHIVE** | `game/js/plugins/DEUS_Mint.js` |
| `tools/society/test_offices.js` | **KEEP** | `game/data/society/offices.json` |
| `tools/society/test_person_identity.js` | **KEEP** | `game/js/sim/society/identity.js` |
| `tools/society/test_quartermaster.js` | **KEEP** | `game/js/sim/society/DEUS_Quartermaster.js` |
| `tools/society/test_race_class_affinity.js` | **KEEP** | `game/data/society/race_class_affinity.json` |
| `tools/society/test_srd_classes.js` | **KEEP** | `game/data/society/srd_classes.json` |
| `tools/society/test_treasury.js` | **KEEP** | `game/js/sim/society/DEUS_Treasury.js` |
| `tools/spells/test_spell_effects.js` | **KEEP** | `tools/spells/validate_spell_effects.js` |
| `tools/taming/test_taming.js` | **ARCHIVE** | `game/js/plugins/DEUS_Taming.js & game/js/sim/taming/` |
| `tools/taming_party/test_tamed_party_combat.js` | **ARCHIVE** | `game/js/sim/taming/party.js` |
| `tools/worldgen/test_vertical_biome_coupling.js` | **KEEP** | `game/js/plugins/DEUS_WorldGen.js` |
| `tools/world_items/test_persistent_objects.js` | **ARCHIVE** | `game/js/plugins/DEUS_WorldItems.js & game/js/sim/world_items/` |
| `tools/world_items/test_world_items.js` | **ARCHIVE** | `game/js/plugins/DEUS_WorldItems.js & game/js/sim/world_items/` |
| `tools/zrange/test_switch_depth2.js` | **KEEP** | `game/js/plugins/DEUS_Depth.js` |
| `tools/ops/test_launch_worker.ps1` | **KEEP** | `tools/ops/launch_worker.ps1` |
| `tools/ops/test_resume_queue.ps1` | **KEEP** | `tools/ops/resume_queue.ps1` |
| `tools/ops/pm_launch/test_top_models_effort.ps1` | **NO_FAILURE_PATH** | `pm_ops/top_models.ps1` |
