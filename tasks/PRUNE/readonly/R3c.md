# TASK PACKET R3c: Test Census Batch C (Q through Z + subdirs)

**Audited:** 120 test scripts (69 in `tools/test_q*.js`..`test_z*.js` + 51 in `tools/**/test_*.js`)  
**Methodology:** Read-only inspection of source code, target files, assertion statements, failure exit paths, and subsystem statuses. No test was executed.

## Summary

| Classification | Count | Description |
| :--- | :--- | :--- |
| **KEEP** | 76 | Active test of live code (assertions verified and failure exit path confirmed) |
| **ARCHIVE** | 22 | Test of dead, unintegrated, or archived subsystems (or dead shims) |
| **RENAME** | 14 | Tool, generator, showcase, or diagnostic utility misnamed as test (no assertions) |
| **NO_FAILURE_PATH** | 8 | Test script that swallows failures, contains hardcoded true assertions, or exits 0 unconditionally |
| **Total** | **120** | |

---

## Detailed Classification Table

| Path | Classification | Subject Code | Reason |
| :--- | :--- | :--- | :--- |
| `tools/test_quantize.ps1` | **RENAME** | `tools/process_assets.ps1 & FastQuantizer` | PowerShell image quantization benchmark and conversion utility; contains no assertions or failure exit paths. |
| `tools/test_r4c2_foreshorten.js` | **RENAME** | `Chest sprite raw art` | Image processing utility foreshortening chest lid sprites and outputting test_r4c2.png; contains no assertions. |
| `tools/test_region_seam_continuity.js` | **KEEP** | `game/js/plugins/DEUS_Levels.js, DEUS_WorldGen.js` | Active WG.00.41 gate test verifying 32-layer column generation, deep cuts, and region-seam integrity; contains assertions and failure exit. |
| `tools/test_regrowth_construction_guard.js` | **KEEP** | `game/js/plugins/DEUS_Objects.js, DEUS_WorldGen.js` | Active verification of plant/tree regrowth guards against colonist construction; includes assertions and failure exit. |
| `tools/test_resize_face.js` | **RENAME** | `Face portrait raw art` | Image resizing and palette-snapping utility generating 144x144 test crops in art/review/; contains no assertions. |
| `tools/test_resource_economy_standard.js` | **KEEP** | `game/data/DEUS_ResourceRegistry.json` | Automated verification suite for DEUS Resource Economy Standard; validates registry, 10 checks, mutant tests, exits 1 on failure. |
| `tools/test_resource_node_materials.js` | **KEEP** | `game/data/UF_WorldCatalog.json` | Active test suite for natural terrain and resource node material binding; validates 6 checks and exits 1 on failure. |
| `tools/test_round_world.js` | **KEEP** | `game/js/plugins/DEUS_World.js` | Active headless verification of toroidal world wrapping in DEUS_World; includes assertions, mutation tests, and failure exit. |
| `tools/test_round_world_live.js` | **RENAME** | `Live Round World NW.js playtest` | In-engine screenshot capture harness demonstrating East/West and North/South seam crossings; contains no assertions. |
| `tools/test_sack_ui_and_loose_items.js` | **NO_FAILURE_PATH** | `game/js/plugins/DEUS_Bag.js` | Empty 0-byte file stub; contains no code or assertions and exits 0 unconditionally. |
| `tools/test_sanitation_system.js` | **ARCHIVE** | `game/js/plugins/UF_Sanitation.js, UF_SettlementPillars.js` | Attempts to load UF_Sanitation.js and UF_SettlementPillars.js which do not exist on disk; tests dead/archived sanitation subsystem. |
| `tools/test_scale_standard.js` | **KEEP** | `game/data/DEUS_ScaleRegistry.json, tools/scale_resolver.js` | Active verification of human and wildlife scale standard (DW.01.03); validates scale registry, PNG metrics, and exits 1 on failure. |
| `tools/test_seamless_map_edges.js` | **KEEP** | `game/js/plugins/DEUS_World.js, DEUS_WorldGen.js` | Active test suite verifying seamless map edge alignment and toroidal continuity across 17 checks; exits 1 on failure. |
| `tools/test_seamless_seam_live.js` | **RENAME** | `Live Seamless Seam NW.js playtest` | In-engine screenshot capture harness positioning camera over river seam; contains no assertions. |
| `tools/test_second_by_second_history.js` | **ARCHIVE** | `game/js/plugins/UF_History.js, UF_Colonists.js, UF_Households.js` | String-patches and evaluates legacy UF_* plugins that have been replaced by 17-line backward compatibility shims lacking history simulation code. |
| `tools/test_settlement_domestic_housing.js` | **KEEP** | `game/js/plugins/DEUS_Projects.js, DEUS_Colonists.js, UF_Households.js` | Active headless integration test for domestic housing, private home progression, and fire safety; includes assertions, mutants, and failure exit. |
| `tools/test_settlement_expansion_multi_dwelling.js` | **KEEP** | `game/js/plugins/DEUS_Projects.js, DEUS_Colonists.js, UF_Households.js` | Active headless integration test for colony multi-dwelling expansion and cottage construction; includes assertions, mutants, and failure exit. |
| `tools/test_settlement_pillars.js` | **ARCHIVE** | `game/js/plugins/UF_SettlementPillars.js` | Directly requires non-existent UF_SettlementPillars.js (fails with MODULE_NOT_FOUND); dead/archived settlement pillar subsystem. |
| `tools/test_settlement_projects.js` | **KEEP** | `game/js/plugins/DEUS_Projects.js, DEUS_Objects.js, DEUS_Jobs.js` | Active headless checks for DEUS_Projects autonomous settlement projects, communal buildings, and deficit resolution; includes assertions, mutants, and failure exit. |
| `tools/test_sheep_action_boxes.js` | **RENAME** | `Raw sheep sprite art` | Bounding box scanning and span measurement tool analyzing raw sheep sprite sheets; contains no assertions. |
| `tools/test_side_combos.js` | **RENAME** | `Male walk cycle raw art` | Frame extraction and filmstrip compositor utility generating test images for human male walk frames; contains no assertions. |
| `tools/test_slice_human.js` | **RENAME** | `Human male face raw art` | Slicing utility extracting face cells from temporary brain artifact JPEG to art/review/test_crops/; contains no assertions. |
| `tools/test_snapshot.js` | **RENAME** | `tools/run_tests.js` | Test runner and disposable snapshot environment CLI utility; provisions game/ copy and delegates to run_tests.js. |
| `tools/test_soil_geomorphology.js` | **KEEP** | `game/js/sim/geomorphology/index.js` | Active verification suite for NAT.04.01 geomorphology, soil layering, moisture gradient, and sediment transport; includes assertions and failure exit. |
| `tools/test_srd_character_presentation.js` | **KEEP** | `game/data/plans/*.plan.json, tools/rules/` | Active verification of SRD 5.1 character presentation, races, classes, and ability modifiers; 12 checks, exits 1 on failure. |
| `tools/test_srd_combat_proof.js` | **KEEP** | `game/js/sim/rules/rules.js, game/js/plugins/DEUS_Combat.js` | Authoritative verification suite for SRD 5.1 combat rules, AC, attack rolls, damage, advantage/disadvantage; 45 assertions, exits 1 on failure. |
| `tools/test_srd_equipment_proof.js` | **KEEP** | `game/js/sim/rules/rules.js, game/data/UF_WorldCatalog.json` | Active verification suite for SRD 5.1 equipment, weapon properties, armor classes, and stealth disadvantages; 26 assertions, exits 1 on failure. |
| `tools/test_srd_parity.js` | **KEEP** | `game/js/sim/rules/rules.js` | Parity verification suite comparing engine dice and rule math against standard SRD 5.1 tables; 45 assertions, exits 1 on failure. |
| `tools/test_srd_rules_proof.js` | **KEEP** | `game/js/sim/rules/rules.js` | Authoritative verification suite for core SRD 5.1 rule resolution, ability checks, saving throws, and DC scaling; 50 assertions, exits 1 on failure. |
| `tools/test_stabilization.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js, DEUS_Jobs.js, DEUS_Projects.js` | Active headless checks for SRD 5.1 dying state, first aid stabilization, and medicine checks; 13 checks, exits 1 on failure. |
| `tools/test_standard_4d_ingame.js` | **NO_FAILURE_PATH** | `Live Standard 4D NW.js playtest` | Live NW.js screenshot showcase runner for 4D charsets; swallows harness errors and exits 0 unconditionally with no assertions. |
| `tools/test_standard_8d_ingame.js` | **NO_FAILURE_PATH** | `Live Standard 8D NW.js playtest` | Live NW.js screenshot showcase runner for 8D charsets; swallows harness errors and exits 0 unconditionally with no assertions. |
| `tools/test_starter_kit_and_stockpile.js` | **KEEP** | `game/js/plugins/DEUS_Items.js, DEUS_Stockpiles.js` | Active automated verification for initial racial starter kits and 9-tile stockpile registration; 19 assertions, throws on failure. |
| `tools/test_stockpiles_designation.js` | **KEEP** | `game/js/plugins/DEUS_Stockpiles.js, DEUS_Containers.js` | Active headless verification suite for DF-style stockpile designation, filter rules, and container items; 19 checks, mutants, exits 1 on failure. |
| `tools/test_strata_cuts_and_caves.js` | **KEEP** | `game/js/plugins/DEUS_Levels.js, DEUS_WorldGen.js` | Registered ops gate test for 32-layer Z-range strata cuts, cave carving, and bedrock bounds; 32 checks, mutants, exits 1 on failure. |
| `tools/test_strata_fluid_reconciliation.js` | **KEEP** | `game/js/plugins/DEUS_World.js, DEUS_WorldGen.js, DEUS_Fluid.js` | Active verification suite for WG.00.07 fluid <-> 5-strata reconciliation and volume conservation; 37 assertions, exits 1 on failure. |
| `tools/test_strata_foundation.js` | **KEEP** | `game/js/plugins/DEUS_Levels.js, DEUS_WorldGen.js` | Registered ops gate test for 5-strata geometry authority in DEUS_Levels.js; 29 checks, mutants, exits 1 on failure. |
| `tools/test_structural_collapse.js` | **KEEP** | `game/js/sim/structural/index.js` | Active gate test suite for structural support calculations and cascading collapse mechanics; 9 checks, exits 1 on failure. |
| `tools/test_survival_needs_loop.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js, DEUS_Items.js` | Active headless verification for SRD 5.1 food/water consumption, hunger, dehydration, and exhaustion; 20 checks, mutants, exits 1 on failure. |
| `tools/test_survival_regressions.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js, DEUS_World.js` | Dedicated regression suite for survival gates, hunger pacing, and biological decay; 26 checks, mutants, exits 1 on failure. |
| `tools/test_temperate_arid_transition_live.js` | **NO_FAILURE_PATH** | `Live Cross-Biome NW.js playtest` | Live NW.js showcase script with hardcoded true assertion (Rule 4 violation: t.check('temperate_arid_transition_verified', true, ...)); can never fail. |
| `tools/test_tilesets_live.js` | **NO_FAILURE_PATH** | `Live Tileset NW.js playtest` | Live NW.js showcase runner for tilesets; swallows errors and exits 0 unconditionally with no assertions. |
| `tools/test_time_domains_proof.js` | **KEEP** | `game/js/plugins/UF_Time.js` | Active automated verification for multi-domain time architecture across ticks, rounds, history, and presentation clock; 46 assertions, mutants, exits 1 on failure. |
| `tools/test_title_menu.js` | **NO_FAILURE_PATH** | `Live Title Menu screenshot` | Title menu screenshot capture runner; swallows errors and exits 0 unconditionally with no assertions. |
| `tools/test_town_hall_ai_live.js` | **KEEP** | `game/js/plugins/DEUS_Colonists.js, UF_Households.js` | In-engine NW.js verification for 4-pair cooperative Town Hall AI and bed allocation; asserts conditions via t.check, mutants, exits 1 on failure. |
| `tools/test_u7_modular_composition.js` | **RENAME** | `U7 modular portrait raw art` | Image composite processor extracting heads, hair, beards, and clothes to render sample portraits in scratch/; contains no assertions. |
| `tools/test_underground_room.js` | **NO_FAILURE_PATH** | `Live Underground Room NW.js playtest` | Live NW.js screenshot runner for noon underground room visual review; swallows errors and exits 0 unconditionally with no assertions. |
| `tools/test_unified_capability_proof.js` | **ARCHIVE** | `game/js/plugins/UF_Proficiency.js` | Directly requires non-existent ../game/js/plugins/UF_Proficiency.js (fails with MODULE_NOT_FOUND); legacy proficiency subsystem is dead/archived. |
| `tools/test_unpartnered_shelter_progression.js` | **KEEP** | `game/js/plugins/DEUS_Projects.js, DEUS_Colonists.js` | In-engine NW.js verification for autonomous private shelter planning for unpartnered colonists; asserts conditions via t.check, mutants, exits 1 on failure. |
| `tools/test_upper_elevation_terrain.js` | **KEEP** | `game/js/plugins/DEUS_Levels.js, DEUS_World.js` | Active automated verification suite for upper elevation terrain, plateaus, volumetric integrity, and ramps; 12 checks, mutants, exits 1 on failure. |
| `tools/test_v2_clean_u7_composites.js` | **RENAME** | `U7 modular portrait raw art` | Image composite processor tuning bounding boxes and extracting portrait pieces; contains no assertions. |
| `tools/test_var2_suite.js` | **ARCHIVE** | `game/img/characters/$UF_Human_Male_2_*` | Batch verification of Adult Male Human Variation 2 sprite sheets which were deleted in the 2026-09-29 art restart under DEC-007. |
| `tools/test_var_suite.js` | **ARCHIVE** | `game/img/characters/$UF_Human_Male_3_*` | Batch verification of Adult Male Human Variation 3 sprite sheets which were deleted in the 2026-09-29 art restart under DEC-007. |
| `tools/test_verify_world_state_registry.js` | **KEEP** | `tools/verify_world_state_registry.js` | Active automated test suite validating tools/verify_world_state_registry.js and state invariant checks; 73 assertions, exits 1 on failure. |
| `tools/test_vertical_worldgen_proof.js` | **KEEP** | `game/js/plugins/DEUS_WorldGen.js, DEUS_Levels.js` | Active automated verification suite for vertical worldgen, cliff caves, and natural rock enclosure; 33 assertions, mutants, exits 1 on failure. |
| `tools/test_volumetric_terrain_column.js` | **KEEP** | `game/js/plugins/DEUS_Levels.js, DEUS_WorldGen.js` | Active verification suite for hard volumetric column landforms, elevation distribution, and ramp continuity; 24 checks, exits 1 on failure. |
| `tools/test_walk_triplets.js` | **RENAME** | `Male walk cycle raw art` | Filmstrip generation tool extracting walk cycle triplets at 4x zoom to inspect stride cadence; contains no assertions. |
| `tools/test_walls_ingame.js` | **ARCHIVE** | `game/js/plugins/UF_Walls.js` | Requires targetHook in legacy UF_Walls.js which has been replaced by a 17-line shim lacking wall showcase hooks; exits 1 on dead file. |
| `tools/test_water_ingame.js` | **NO_FAILURE_PATH** | `Live Water NW.js playtest` | Live NW.js screenshot runner for water pond surface flow; swallows errors and exits 0 unconditionally with no assertions. |
| `tools/test_wolf_cleanup.js` | **RENAME** | `Wolf walk cycle raw art` | Sprite cleanup utility flood-filling background magenta pixels in wolf walk sheet; contains no assertions. |
| `tools/test_zoom_depth_coverage.js` | **KEEP** | `game/js/plugins/DEUS_Depth.js` | Active automated tests for 0.5x zoom depth coverage, viewport culling, and zero memory allocation churn; 24 assertions, exits 1 on failure. |
| `tools/test_zrange.js` | **KEEP** | `game/js/plugins/DEUS_Levels.js, DEUS_World.js, DEUS_Fluid.js` | Authoritative automated test suite for WG.00.17 32-layer Z-range authority, sparse memory/save storage, and elevation math; comprehensive assertions, mutants, exits 1 on failure. |
| `tools/test_z_cavern_gen.js` | **RENAME** | `Procedural cave generation prototype` | Cavern noise generator prototype printing ASCII preview maps to console; contains no assertions. |
| `tools/test_z_doors.js` | **ARCHIVE** | `game/js/plugins/UF_Doors.js` | Evaluates legacy UF_Doors.js which has been replaced with a 17-line backward compatibility shim; tests dead/superseded plugin file. |
| `tools/test_z_fire.js` | **ARCHIVE** | `game/js/plugins/UF_Fire.js` | Evaluates legacy UF_Fire.js which has been replaced with a 17-line backward compatibility shim; tests dead/superseded plugin file. |
| `tools/test_z_floors.js` | **ARCHIVE** | `game/js/plugins/UF_Floors.js` | Evaluates legacy UF_Floors.js which has been replaced with a 17-line backward compatibility shim; tests dead/superseded plugin file. |
| `tools/test_z_flora.js` | **ARCHIVE** | `game/js/plugins/UF_WorldGen.js, UF_Objects.js` | Evaluates legacy UF_WorldGen.js and UF_Objects.js which have both been replaced with 17-line backward compatibility shims; tests dead/superseded plugin files. |
| `tools/test_z_ownership.js` | **ARCHIVE** | `game/js/plugins/UF_Ownership.js` | Evaluates legacy UF_Ownership.js which has been replaced with a 17-line backward compatibility shim; tests dead/superseded plugin file. |
| `tools/test_z_walls.js` | **ARCHIVE** | `game/js/plugins/UF_Walls.js` | Evaluates legacy UF_Walls.js which has been replaced with a 17-line backward compatibility shim; tests dead/superseded plugin file. |
| `tools/art/test_blank_templates.js` | **KEEP** | `tools/art/make_blank_templates.js` | Active verification suite for WG.32.02 blank template tileset generation; validates grid schemas, dimensions, and blank slot markers, exits 1 on failure. |
| `tools/art/test_catalogue.js` | **KEEP** | `art/catalogue/catalogue.json` | Authoritative OPS.30.06 art catalogue schema 1.2 validator; validates 47 assertions across 2,494 catalogued slots, exits 1 on failure. |
| `tools/art/test_multi_variant_topology.js` | **KEEP** | `Multi-variant autotile bitmask logic` | Active verification of multi-variant terrain autotile topological continuity and bitmask transitions; has assertions, exits 1 on failure. |
| `tools/art/test_place_art.js` | **KEEP** | `tools/art/place_art.js, tools/art/validate_art.js` | Active automated test suite for WG.41.01 place_art.js and validate_art.js tooling; validates slot placement and validation gates, exits 1 on failure. |
| `tools/art/test_validate_asset_standard.js` | **KEEP** | `tools/art/validate_asset_standard.js` | Active automated test suite for tools/art/validate_asset_standard.js; verifies asset standard validation rules, exits 1 on failure. |
| `tools/audio/test_validate_audio_standard.js` | **KEEP** | `game/audio/` | Active automated test suite for audio asset standard validation, sample rates, formats, and channel counts; exits 1 on failure. |
| `tools/combat_rt/test_combat_rt.js` | **ARCHIVE** | `game/js/sim/combat_rt/ & DEUS_CombatRT.js` | Tests DEUS_CombatRT.js / game/js/sim/combat_rt/, an unwired real-time combat system scheduled for archival per R2 audit. |
| `tools/depth_demo/test_depth_demo.js` | **ARCHIVE** | `DEUS_DepthDemo.js & DEUS_DepthCues.js` | Tests DEUS_DepthDemo.js and DEUS_DepthCues.js, unwired presentation demo plugins scheduled for archival per R2 audit. |
| `tools/governance/test_check_claims.js` | **KEEP** | `tasks/wbs_registry.json, tools/governance/check_claims.js` | Registered ops gate test for governance claim tracking, active task branch validation, and worktree verification; exits 1 on failure. |
| `tools/governance/test_check_invariants.js` | **KEEP** | `tools/governance/check_invariants.js` | Active governance invariant test suite verifying all Project DEUS invariants and mutant fixtures; exits 1 on failure. |
| `tools/governance/test_merge_gate.js` | **KEEP** | `tools/governance/merge_gate.js` | Active automated test suite for tools/governance/merge_gate.js governance integration script; exits 1 on failure. |
| `tools/governance/fixtures/invariants/INV-FLD-02/tools/test_strata_fluid_reconciliation.js` | **KEEP** | `tools/governance/fixtures/invariants/INV-FLD-02/` | Deliberate failing mutant fixture for governance invariant test INV-FLD-02; asserts invariant detector catches mutant. |
| `tools/layer_overlays/test_layer_overlays.js` | **ARCHIVE** | `game/js/plugins/DEUS_LayerOverlays.js` | Tests DEUS_LayerOverlays.js, an unwired overlay plugin scheduled for archival per R2 audit. |
| `tools/occlusion/test_occlusion_culling.js` | **KEEP** | `game/js/plugins/DEUS_Depth.js` | Active automated verification of DEUS_Depth.js occlusion culling rules, max depth bounds, and visibility; has assertions, mutants, exits 1 on failure. |
| `tools/ops/test_run_gate.js` | **KEEP** | `tools/ops/run_gate.js` | Active automated test suite for tools/ops/run_gate.js; validates gate test execution, list filtering, and quarantine handling; exits 1 on failure. |
| `tools/plans/test_faction_plan_schema.js` | **KEEP** | `game/data/plans/TEMPLATE.plan.json` | Active SOC.10.02 schema validation gate for TEMPLATE.plan.json; validates 27 checks and mutant fixtures, exits 1 on failure. |
| `tools/plans/test_race_plans.js` | **KEEP** | `game/data/plans/*.plan.json` | Active SOC.10.03 verification suite ensuring all nine racial plans exist, validate against schema, and match templates; exits 1 on failure. |
| `tools/rules/test_srd_rules.js` | **KEEP** | `game/js/sim/rules/` | Active headless test suite for game/js/sim/rules/ engine; validates d20 dice, skill checks, damage rolls, and SRD parity; exits 1 on failure. |
| `tools/security/test_check_dependencies.js` | **KEEP** | `package.json, tools/security/check_dependencies.js` | Active security gate verifying zero unreviewed npm dependencies, locked package hashes, and allowed core modules; exits 1 on failure. |
| `tools/security/test_scan_secrets.js` | **KEEP** | `tools/security/scan_secrets.js` | Active security scanner test verifying detection of API keys, hardcoded credentials, and high-entropy secret patterns; exits 1 on failure. |
| `tools/security/test_support.js` | **KEEP** | `tools/security/support.js` | Active test suite for security audit helper functions and telemetry parsers; exits 1 on failure. |
| `tools/select_xlayer/test_xlayer_select.js` | **ARCHIVE** | `game/js/plugins/DEUS_Select.js, DEUS_LayerOverlays.js` | Tests WG.00.36 cross-layer selection which requires the unwired DEUS_LayerOverlays.js scheduled for archival per R2 audit. |
| `tools/sim/test_decay_core.js` | **KEEP** | `game/js/sim/decay/core.js` | Active automated test suite for game/js/sim/decay/core.js item/material decay clocks and expiration heaps; exits 1 on failure. |
| `tools/sim/test_fluid_attach.js` | **KEEP** | `game/js/sim/hydro/` | Active test suite validating fluid attachment to surface strata and geological boundaries; has assertions, exits 1 on failure. |
| `tools/sim/test_ledger.js` | **KEEP** | `game/js/sim/ledger.js` | Authoritative verification of mass/matter conservation ledger in game/js/sim/ledger.js; 25 assertions, exits 1 on failure. |
| `tools/sim/test_ledger_longrun.js` | **KEEP** | `game/js/sim/ledger.js` | WG.65.15 deterministic long-run conservation harness running thousands of simulation ticks; validates ledger integrity, exits 1 on failure. |
| `tools/sim/test_living_world_rules.js` | **KEEP** | `game/js/plugins/DEUS_World.js` | Active SIM.50.12 regression suite for living-world audit findings F-01..F-05 at 32-layer Z-range; 6 checks, exits 1 on failure. |
| `tools/sim/test_materials.js` | **KEEP** | `game/js/sim/materials.js` | Active SIM.40.00 tests for material catalogue, hardness, density, and physical properties; 48 checks, exits 1 on failure. |
| `tools/sim/test_ore_sprout.js` | **KEEP** | `game/js/sim/decay/` | Active SIM.50.13 F-03 regression test ensuring loose surface stones never mature into ore deposits; 7 checks, exits 1 on failure. |
| `tools/sim/test_reclaim.js` | **KEEP** | `game/js/sim/reclaim.js` | Active SIM.40.11 reclaim and ledger-post tests verifying 100% matter conservation during salvage; 40 checks, exits 1 on failure. |
| `tools/sim/test_reclaim_longrun.js` | **KEEP** | `game/js/sim/reclaim.js` | Active SIM.40.11 long-run test running multi-thousand tick cycles of mine, build, collapse, and reclaim; 16 checks, exits 1 on failure. |
| `tools/sim/test_sim_forward_guard.js` | **KEEP** | `tools/dev/sim_forward.js` | Active SIM.10.02 forward simulation guard verifying state progression without frame loss or corruption; 23 checks, exits 1 on failure. |
| `tools/sim/test_underground_year0.js` | **KEEP** | `game/js/plugins/DEUS_WorldGen.js, DEUS_Levels.js` | Active SIM.10.05 verification of standard New Game Year 0 state on 32-layer world; validates underground strata and pockets, exits 1 on failure. |
| `tools/sim/test_water_dynamics.js` | **KEEP** | `game/js/sim/hydro/` | Active SIM.50.02 cross-layer water simulation test; deterministic multi-Z hydrological flow; 43 checks, exits 1 on failure. |
| `tools/sim/test_wildlife_rules_damage.js` | **KEEP** | `game/js/sim/rules/` | Active SIM.60.07 test verifying predator adjacent attacks resolve through UF.Rules combat rather than hardcoded damage; 21 checks, exits 1 on failure. |
| `tools/society/test_craft_catalogue.js` | **KEEP** | `game/data/society/craft_catalogue.json` | Active headless test suite and validator for master craft catalogue game/data/society/craft_catalogue.json; 23 checks, exits 1 on failure. |
| `tools/society/test_militia.js` | **KEEP** | `game/js/sim/society/DEUS_Militia.js` | Active unit test suite for game/js/sim/society/DEUS_Militia.js muster, squad orders, and drill; 94 checks, exits 1 on failure. |
| `tools/society/test_minting_engine.js` | **ARCHIVE** | `game/js/plugins/DEUS_Mint.js` | Tests DEUS_Mint.js coin minting engine; DEUS_Mint.js is an unwired plugin scheduled for archival per R2 audit. |
| `tools/society/test_offices.js` | **KEEP** | `game/data/society/offices.json` | Active deterministic test suite and validator for faction offices and hierarchy in game/data/society/offices.json; 34 checks, exits 1 on failure. |
| `tools/society/test_person_identity.js` | **KEEP** | `game/js/sim/society/identity.js` | Active headless checks for person identity records in game/js/sim/society/identity.js; 61 checks, exits 1 on failure. |
| `tools/society/test_quartermaster.js` | **KEEP** | `game/js/sim/society/DEUS_Quartermaster.js` | Active SOC.32.01 headless gate for game/js/sim/society/DEUS_Quartermaster.js supply distribution; checks mutants, exits 1 on failure. |
| `tools/society/test_race_class_affinity.js` | **KEEP** | `game/data/society/race_class_affinity.json` | Active SOC.11.02 gate validating DEC-036 racial class affinity tables in game/data/society/race_class_affinity.json; 39 checks, exits 1 on failure. |
| `tools/society/test_srd_classes.js` | **KEEP** | `game/data/society/srd_classes.json` | Active validator and gate for SRD 5.1 classes in game/data/society/srd_classes.json; checks hit dice, proficiencies, and features, exits 1 on failure. |
| `tools/society/test_treasury.js` | **KEEP** | `game/js/sim/society/DEUS_Treasury.js` | Active SOC.31.01 deterministic treasury checks for game/js/sim/society/DEUS_Treasury.js; 56 checks, exits 1 on failure. |
| `tools/spells/test_spell_effects.js` | **KEEP** | `tools/spells/validate_spell_effects.js` | Active SIM.60.02 test suite for tools/spells/validate_spell_effects.js and spell schema validator; exits 1 on failure. |
| `tools/taming/test_taming.js` | **ARCHIVE** | `game/js/plugins/DEUS_Taming.js & game/js/sim/taming/` | Tests DEUS_Taming.js and game/js/sim/taming/, an unwired creature taming system scheduled for archival per R2 audit. |
| `tools/taming_party/test_tamed_party_combat.js` | **ARCHIVE** | `game/js/sim/taming/party.js` | Tests game/js/sim/taming/party.js, an unwired creature party combat module scheduled for archival per R2 audit. |
| `tools/worldgen/test_vertical_biome_coupling.js` | **KEEP** | `game/js/plugins/DEUS_WorldGen.js` | Active WG.00.15 headless test verifying 20 seeds across both Z-ranges for vertical biome coupling; exits 1 on failure. |
| `tools/world_items/test_persistent_objects.js` | **ARCHIVE** | `game/js/plugins/DEUS_WorldItems.js & game/js/sim/world_items/` | Tests DEUS_WorldItems.js / game/js/sim/world_items/, an unwired physical item subsystem scheduled for archival per R2 audit. |
| `tools/world_items/test_world_items.js` | **ARCHIVE** | `game/js/plugins/DEUS_WorldItems.js & game/js/sim/world_items/` | Tests DEUS_WorldItems.js and world item hash grid; unwired subsystem scheduled for archival per R2 audit. |
| `tools/zrange/test_switch_depth2.js` | **KEEP** | `game/js/plugins/DEUS_Depth.js` | Active regression test for WG.00.17 Lane AA depth-2 renderer behavior in DEUS_Depth.js across Z-ranges; exits 1 on failure. |

---

## Addendum: Subdirectory PowerShell Test Scripts

The following 3 PowerShell test scripts in subdirectories were also audited for complete coverage:

| Path | Classification | Subject Code | Reason |
| :--- | :--- | :--- | :--- |
| `tools/ops/test_launch_worker.ps1` | **KEEP** | `tools/ops/launch_worker.ps1` | PowerShell test suite for worker launcher CLI; validates model arguments, environment flags, and worktree isolation with failure exits. |
| `tools/ops/test_resume_queue.ps1` | **KEEP** | `tools/ops/resume_queue.ps1` | PowerShell test suite for queue resumption logic; verifies PID checks, process logs, and task queue ordering with failure exits. |
| `tools/ops/pm_launch/test_top_models_effort.ps1` | **NO_FAILURE_PATH** | `pm_ops/top_models.ps1` | PowerShell launch evaluation script comparing model effort settings; prints status without test assertions or failure exits. |

