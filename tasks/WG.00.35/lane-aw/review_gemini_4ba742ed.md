# Lane AW Independent Review (WG.00.35)

**Reviewer:** Gemini (gemini-3.8-flash thinking HIGH fallback gate per DEC-034)
**Writer:** Grok (grok-4.7 xhigh)
**Task ID:** WG.00.35 (Lower-layer overlays at 1:1 with zero filters per DEC-011)
**Tip SHA Under Review:** 4ba742edf1efc81cba56eb6a89779c0f5f599ea1

---

## 1. Tip Verification

Confirmed HEAD and `origin/task/lane-aw` match the expected writer tip:

```text
$ git rev-parse HEAD origin/task/lane-aw
4ba742edf1efc81cba56eb6a89779c0f5f599ea1
4ba742edf1efc81cba56eb6a89779c0f5f599ea1
```

Commit log context:

```text
$ git log -12 --format="%H %an %s"
4ba742edf1efc81cba56eb6a89779c0f5f599ea1 deus-grok [grok] WG.00.35 Lower-layer overlays at 1:1
0a9b3895bff7d547def7b82335e0f253a68e8616 deus-pm [pm] Open lane-aw (WG.00.35): BRIEF.md and lane.json
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

## 2. Scope Verification

Merge base between `origin/main` and `4ba742edf1efc81cba56eb6a89779c0f5f599ea1`:
```text
$ git merge-base origin/main 4ba742edf1efc81cba56eb6a89779c0f5f599ea1
2755f61947610723723384ad39ad3fbc92d4679f
```

Diff name-status:
```text
$ git diff --name-status 2755f61947610723723384ad39ad3fbc92d4679f 4ba742edf1efc81cba56eb6a89779c0f5f599ea1
A	docs/systems/DEUS_LayerOverlays.md
M	game/js/plugins/DEUS_Depth.js
A	game/js/plugins/DEUS_LayerOverlays.js
A	tasks/WG.00.35/lane-aw/BRIEF.md
A	tasks/WG.00.35/lane-aw/REPORT.md
A	tasks/WG.00.35/lane-aw/lane.json
A	tools/layer_overlays/bench_layer_overlays.js
A	tools/layer_overlays/test_layer_overlays.js
```

### Scope Table

| Path | Status | Within `lane.json` allowedPaths | Notes |
|---|---|---|---|
| `docs/systems/DEUS_LayerOverlays.md` | Added | YES (`docs/systems/DEUS_LayerOverlays.md`) | System documentation, benchmark, and rules |
| `game/js/plugins/DEUS_Depth.js` | Modified | YES (`game/js/plugins/DEUS_Depth.js`) | Null-safe bus hook to `UF.LayerOverlays` |
| `game/js/plugins/DEUS_LayerOverlays.js` | Added | YES (`game/js/plugins/DEUS_LayerOverlays.js`) | Overlays planner and live sprite renderer |
| `tasks/WG.00.35/lane-aw/BRIEF.md` | Added | YES (`tasks/WG.00.35/**`) | Task specification |
| `tasks/WG.00.35/lane-aw/REPORT.md` | Added | YES (`tasks/WG.00.35/**`) | Task report |
| `tasks/WG.00.35/lane-aw/lane.json` | Added | YES (`tasks/WG.00.35/**`) | Lane configuration |
| `tools/layer_overlays/bench_layer_overlays.js` | Added | YES (`tools/layer_overlays/**`) | Benchmark reprint script |
| `tools/layer_overlays/test_layer_overlays.js` | Added | YES (`tools/layer_overlays/**`) | 20 test checks each killing a mutant |

Disallowed paths check:
- `docs/STATUS.md`: Untouched
- `docs/OWNER_DECISIONS.md`: Untouched
- `*WBS*.md`: Untouched
- `game/js/plugins.js`: Untouched
- `game/js/plugins/DEUS_Core.js`: Untouched
- `art/**`: Untouched
- Sibling lanes: Untouched

---

## 3. Independent Gate Test Execution

All tests executed inside fresh detached clone `.review_tmp_clone` at `4ba742edf1efc81cba56eb6a89779c0f5f599ea1`.

### Gate Test 1: `node tools/layer_overlays/test_layer_overlays.js`
- **Command:** `node tools/layer_overlays/test_layer_overlays.js`
- **Output:**
```
PASS lower_layers_have_overlays
PASS lower_layers_have_overlays_mutant_killed
PASS scale_is_one
PASS scale_is_one_mutant_killed
PASS no_filters_tint_fog_or_fade
PASS no_filters_tint_fog_or_fade_mutant_killed
PASS whole_pixel_over_the_unit
PASS whole_pixel_over_the_unit_mutant_killed
PASS occluded_units_have_none
PASS occluded_units_have_none_mutant_killed
PASS current_layer_unchanged
PASS current_layer_unchanged_mutant_killed
PASS cues_shift_the_layer_not_the_overlay
PASS cues_shift_the_layer_not_the_overlay_mutant_killed
PASS draw_order_lower_then_higher
PASS draw_order_lower_then_higher_mutant_killed
PASS steady_frame_allocates_nothing
PASS steady_frame_allocates_nothing_mutant_killed
PASS rebuild_reuses_records
PASS rebuild_reuses_records_mutant_killed
PASS change_driven_by_revision
PASS change_driven_by_revision_mutant_killed
PASS window_and_depth_reach_cull
PASS window_and_depth_reach_cull_mutant_killed
PASS spells_status_and_combat_marks
PASS spells_status_and_combat_marks_mutant_killed
PASS number_stack_matches_combat_cap
PASS number_stack_matches_combat_cap_mutant_killed
PASS damage_colours_match_combat
PASS damage_colours_match_combat_mutant_killed
PASS plan_is_deterministic
PASS plan_is_deterministic_mutant_killed
PASS live_hook_is_a_no_op_without_pixi
PASS live_hook_is_a_no_op_without_pixi_mutant_killed
PASS depth_calls_overlay_bus
PASS depth_calls_overlay_bus_mutant_killed
PASS no_art_generation
PASS no_art_generation_mutant_killed
BENCH layers=32 units=1024 pool=144 allocations=146
BENCH buried hp=32 lowerHp=0 overlays=96 lower=0 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.320 steadyMs=
BENCH shaft-depth-2 hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.569 steadyMs=
BENCH shaft-depth-31 hp=48 lowerHp=16 overlays=144 lower=48 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.289 steadyMs=
BENCH cues-on hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=6 steadyAlloc=undefined rebuildMs=0.124 steadyMs=
BENCH steady hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=undefined steadyAlloc=0 rebuildMs=1.600 steadyMs=0.008
PASS benchmark_32_layers
PASS benchmark_32_layers_mutant_killed
RESULT: 40 passed, 0 failed
```
- **EXIT:** 0

### Gate Test 2: `node tools/test_layer_render_flat.js --suite depth`
- **Command:** `node tools/test_layer_render_flat.js --suite depth`
- **Output:**
```
=== DEUS_Depth suite "depth" (WG.00.09b Lane K) ===
run: RESULT: 27 passed, 0 failed (exit 0) in 36.8 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_25180_1790527184410 (deleted)
  PASS depth.preconditions - world true, levels true, view 0, surface grid true, screen 816x624, world seed 141147983
  PASS depth.proof_scene - fixture scene centred at (200,168) in area (0,0), world seed 141147983: 144 columns x 5 levels (272 cell(s) written, 448 already as specified), 135 ground tile(s) set (meadow, tile 2816), 79 object(s) cleared, 3270 ms; 0 refused, 0 cell(s) not as specified; hole (195,165), deck 3 cells from (198,166)
  PASS depth.planes_present - view 2; depth 1 -> level 1, 2 paint(s), 19091 opaque samples; depth 2 -> level 0, 2 paint(s), 40176 opaque samples; last paint 4.4 ms, last peek 0.0 ms
  PASS depth.repaint_cost - 4 of 4 refreshes of one 912x720 plane repainted it by the next frame; repaint times 4.4 / 2.2 / 0.9 / 0.9 / 1.2 ms (reported, not gated: wall-clock time, this machine, nw.exe harness)
  PASS depth.projection_origin - centre -> (408,312) want (408,312); left edge -> (0,312) want (0,312) (identity, DEC-011); plane scale 1
  PASS depth.exposure_by_upper_geometry - floor cell (204,165) unchanged by the planes; open cell (197,164) shows the level below
  PASS depth.mask_order - deck cell (199,166) at screen (384,240): drawn #d89a55, depth 1 texels {#351d16 #492a19 #d89a55 #8e4d30}, ground texel under it #71864d/255
  PASS depth.depth2_through_depth1 - low ground (204,170) at screen (624,432): drawn #71864d/255, ground texel #71864d/255, ground texels {#71864d}, depth 1 alpha there 0; under the hole (195,165) the ground draws #71864d/255 (tiles 2816/0/0)
  PASS depth.entities_drawn - fixtures: oak placed at (193,164), item stone x3 at (194,165), unit added; +1 plane draws 1 object(s), 1 unit(s), 1 item stack(s), 10 wall/ramp frame(s); item sheet !$UF_Item_Stone ready true, tracked by the plane true, visible true; unit at (196,166) probed at screen (240,244): drawn (#fbdcc8 vs #35312d without units)
  PASS depth.crisp_nearest - 53504 opaque samples, 0 colour(s) not in the 65-colour source set; smooth false, baseTexture scaleMode 0 (0 nearest, 1 linear), sprite texture is the bitmap's, plane at (-24,-24)
  PASS depth.parallax_bounded - edge shift measured depth 1 0 px, depth 2 0 px (want 0); a pan of 2 tiles moved a low-ground point on depth 1 from x 624 to 528 (-96 px, want -96); the point under the centre stays at x 408; display back at 191.5 (was 191.5)
  PASS depth.tunables_take_effect - maxDepth 1 [1:1 2:-] void true; maxDepth 2 [1:1 2:0]; enabled false [1:- 2:-] void false; enabled true [1:1 2:0] void true
  PASS depth.no_filters_any_state - maxDepth 1: none; maxDepth 2: none; off: none; on: none; entities off: none; entities on: none
  PASS depth.one_level_below - maxDepth 1: depth 1 level 1, depth 2 hidden, void shown
  PASS depth.void_beyond - low ground (204,170) at screen (624,432): planes render #08080c/255, screen #08080c, void #08080c
  PASS depth.no_blends - 0 of 53504 sampled pixels are blends (want 0)
  PASS depth.flat_transform - depth 1 scale 1 at (-24,-24) filters [] entities [] alpha 1; depth 2 scale 1 at (-24,-24) filters [] entities [] alpha 1; blur/colour filters in the subtree: none; active tilemap scale 1, filters none, alpha 1; terrace pixel #352d24, its source texel #352d24/255
  PASS depth.entities_inherit_treatment - unit sprite in the +1 plane: child of the plane, world scale 1 x 1, filters on it and its 3 container(s): none; tint #ffffff (the unit's own)
  PASS depth.visual_settings_no_physics - unchanged: {"unit":{"x":196,"y":166,"z":1},"shapeUnit":"floor","shapeChain":"open","walkChain":false,"walkUnit":true,"objects":1}
  PASS depth.config_deterministic - the same after maxDepth 1 / 0 / 2 and off / on: {"describe":"2 level(s) below, drawn 1:1 (DEC-011), void #08080c","planes":[{"z":1,"visible":true,"x":-24,"y":-24,"scale":1,"alpha":1,"filters":[]},{"z":0,"visible":true,"x":-24,"y":-24,"scale":1,"alpha":1,"filters":[]}]}
  PASS depth.planes_cost - sampled 2 x 60 frames per condition: planes off none shown in every frame, on both bound in every frame; reported, not gated: GL renderer "ANGLE (NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11 vs_5_0 ps_5_0)"; median engine tick (update + render submit): planes off 1.7 ms, on 2.1 ms (the planes +0.4 ms); median frame intervals off 14, on 14 ms; worst tick off 3.6, on 3.0 ms; this machine, nw.exe harness, simulation paused
  PASS depth.screenshots_written - depth.plus2_off.png 307092 B, depth.plus2_flat.png 87312 B, depth.plus1_off.png 291793 B, depth.plus1_flat.png 121035 B
  PASS depth.ground_draws_through_openings - view 0, depth 1 -> -1, depth 2 -> -2, void shown; floor ground cell (198,167) unchanged by the planes (its own art's lowest alpha 255); open cell (201,167) over the -2 floor draws #352d24 (planes #352d24, -2 texels {#514945 #35312d #352d24}, -1 alpha 0; planes off #000000); open cell (199,167) over the -1 floor draws #6d4d3d (-1 texels {#553d31 #6d4d3d}; planes off #000000)
  PASS depth.entities_at_seam - view on +2 centred on (2,2), display (249.5,251.5) (wrapped); +1 plane level 1: item (1,1) drawn at (384,312); item (253,1) drawn at (192,312); item (1,253) drawn at (384,120); item (253,253) drawn at (192,120); wall face (254,4) drawn at (240,456); wall face (4,254) drawn at (528,168); unit (3,3) drawn at (480,408)
  PASS depth.canvases_freed - after 4 in-place level switches and 2 map transfer(s) (a new spriteset each): 4 canvas layers in use, 4 canvases made since boot, 0 destroyed, 0 pooled (want 4 / 4 / 0 / 0); at each new scene's start, view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]; view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]
  PASS depth.hotkey_free - keyMapper[118] (F7) is undefined: the preset hotkey is gone and the key is free
  PASS depth.no_errors - none
required checks: 27/27 PASS

RESULT: all required checks passed (exit 0)
```
- **EXIT:** 0

### Gate Test 3: `node tools/depth_demo/test_depth_demo.js`
- **Command:** `node tools/depth_demo/test_depth_demo.js`
- **Output:**
```
PASS defaults_all_off
KILLED defaults_all_off
PASS each_toggle_on_off
KILLED each_toggle_on_off
PASS integer_scale_only
KILLED integer_scale_only
PASS blur_rejected
KILLED blur_rejected
PASS ramps_baked_match_json
KILLED ramps_baked_match_json
PASS ramps_deterministic
KILLED ramps_deterministic
PASS ramps_darker_cooler_desat
KILLED ramps_darker_cooler_desat
PASS parallax_whole_pixels
KILLED parallax_whole_pixels
PASS shadows_hard_dither
KILLED shadows_hard_dither
PASS cliff_faces_one_tile
KILLED cliff_faces_one_tile
PASS geometry_5ft_48px
KILLED geometry_5ft_48px
PASS legacy_10ft_flagged
KILLED legacy_10ft_flagged
PASS unit_height_whole_pixels
KILLED unit_height_whole_pixels
PASS camera_ease_whole_pixels
KILLED camera_ease_whole_pixels
PASS depth_markers
KILLED depth_markers
PASS cutaway_binary
KILLED cutaway_binary
PASS weather_exposed_layer
KILLED weather_exposed_layer
PASS light_crisp_no_gradient
KILLED light_crisp_no_gradient
PASS glows_light_lower_layers
KILLED glows_light_lower_layers
PASS glow_sprites_additive
KILLED glow_sprites_additive
PASS night_ramp_baked
KILLED night_ramp_baked
PASS day_length_and_dim_steps
KILLED day_length_and_dim_steps
PASS letterbox_no_stretch
KILLED letterbox_no_stretch
PASS hp_spell_selection_compat
KILLED hp_spell_selection_compat
PASS whole_pixel_plan
KILLED whole_pixel_plan
PASS json_defaults_and_scene
KILLED json_defaults_and_scene
PASS no_art_generation
KILLED no_art_generation
PASS benchmark_covers_toggles
KILLED benchmark_covers_toggles
RESULT: 28 passed, 0 failed, 28 mutants killed
```
- **EXIT:** 0

### Gate Test 4: `node tools/combat_rt/test_combat_rt.js`
- **Command:** `node tools/combat_rt/test_combat_rt.js`
- **Output:**
```
PASS clock_6s_speed_pause
PASS clock_6s_speed_pause_mutant_killed
PASS seeded_rng_matches_rules_dice
PASS seeded_rng_matches_rules_dice_mutant_killed
PASS deterministic_both_modes
PASS deterministic_both_modes_mutant_killed
PASS same_seed_replay
PASS same_seed_replay_mutant_killed
PASS mode_switch_keeps_combat_state
PASS mode_switch_keeps_combat_state_mutant_killed
PASS orders_survive_switch
PASS orders_survive_switch_mutant_killed
PASS rules_hit_changes_hp
PASS rules_hit_changes_hp_mutant_killed
PASS cross_layer_fight
PASS cross_layer_fight_mutant_killed
PASS companion_behaviours
PASS companion_behaviours_mutant_killed
PASS weapon_clips_no_shield_anim
PASS weapon_clips_no_shield_anim_mutant_killed
PASS armor_state_and_class_off_map
PASS armor_state_and_class_off_map_mutant_killed
PASS frames_dirs_strike
PASS frames_dirs_strike_mutant_killed
PASS knockback_cosmetic
PASS knockback_cosmetic_mutant_killed
PASS forced_move_changes_grid
PASS forced_move_changes_grid_mutant_killed
PASS eight_way_facing
PASS eight_way_facing_mutant_killed
PASS footprints_and_size_frames
PASS footprints_and_size_frames_mutant_killed
PASS distance_555
PASS distance_555_mutant_killed
PASS range_markers_whole_squares
PASS range_markers_whole_squares_mutant_killed
PASS move8_pixels_and_corners
PASS move8_pixels_and_corners_mutant_killed
PASS death_pose
PASS death_pose_mutant_killed
PASS miss_is_zero_and_uncoloured_hit
PASS miss_is_zero_and_uncoloured_hit_mutant_killed
PASS damage_colours
PASS damage_colours_mutant_killed
PASS condition_overlay_not_a_clip
PASS condition_overlay_not_a_clip_mutant_killed
PASS layer_range_32
PASS layer_range_32_mutant_killed
PASS multi_layer_selection
PASS multi_layer_selection_mutant_killed
PASS squad_behaviour
PASS squad_behaviour_mutant_killed
PASS ui_layers_skin_markers_scale
PASS ui_layers_skin_markers_scale_mutant_killed
PASS integer_scale
PASS integer_scale_mutant_killed
PASS hero_switch_pause_to_target_camera
PASS hero_switch_pause_to_target_camera_mutant_killed
PASS plugins_attach
PASS plugins_attach_mutant_killed
PASS combat_hook_present
PASS combat_hook_present_mutant_killed
PASS sources_have_no_generator_or_live_shield_clip
PASS sources_have_no_generator_or_live_shield_clip_mutant_killed
RESULT: 64 passed, 0 failed
```
- **EXIT:** 0

### Gate Test 5: `node tools/check_deus_syntax.js`
- **Command:** `node tools/check_deus_syntax.js`
- **Output:**
```
Checked 59 DEUS plugin files. Errors: 0
```
- **EXIT:** 0

---

## 4. Spot-Checks & Requirement Verification

1. **DEC-011 Invariant Compliance (1:1 scale, zero filters):**
   - Verified in `DEUS_LayerOverlays.js`:
     - Overlays explicitly enforce `scale: 1`, `filters: null`, `alpha: 1`, `blur: false`, `tint: null`, `fog: false`, `desaturate: false`, `paletteShifted: false`.
     - In live sprites, `lock(s)` actively nulls filters, enforces `scale.set(1, 1)`, `alpha = 1`, and `tint = 0xffffff`.
   - Verified in `test_layer_overlays.js`:
     - `scale_is_one` & mutant killed.
     - `no_filters_tint_fog_or_fade` & mutant killed.

2. **Occlusion & Draw Order:**
   - Overlays are built strictly for visible, unoccluded lower-layer units.
   - Verified that `columnOpen` checks `root.skipsMainCell(x, y)` and each higher plane's `skipCell(x, y)`.
   - Any higher opaque cell completely suppresses the overlay.
   - Draw order is sorted from bottom Z to top Z, with individual overlay kinds sequenced consistently (`ORDER`).
   - Verified in tests: `occluded_units_have_none`, `draw_order_lower_then_higher`.

3. **Performance & Allocation Invariants (PERFORMANCE_ARCHITECTURE):**
   - Rebuilding is change-driven via `revision` (headless) and `hashPlane` (live).
   - Rebuilding reuses pre-allocated object pools (`take()`, `takeList()`).
   - Steady state frames allocate 0 records (`steadyAllocations = 0`).
   - Verified in tests: `steady_frame_allocates_nothing`, `rebuild_reuses_records`, `change_driven_by_revision`, and `benchmark_32_layers`.

4. **Depth Cues Interaction:**
   - Evaluated against `DEUS_DepthCues.js` settings:
     - Parallax offset, unit height shift, and camera easing translate the overlay cleanly with the unit using whole pixels.
     - Lighting, dimming, palette shifting, blur, and scale settings do not affect the overlay.
   - Tested in `cues_shift_the_layer_not_the_overlay` & mutant killed.

5. **NO ART (DEC-007):**
   - Zero art generation, no image assets created or touched.
   - Overlays use code-rendered Bitmaps (`fillRect`, `drawText`) in standard RMMZ format.
   - Tested in `no_art_generation` & mutant killed.

6. **Registration Request & Open Owner Questions:**
   - `REPORT.md` contains an explicit `## Registration request` for the PM to apply at merge time to `game/js/plugins.js`.
   - `game/js/plugins.js` and `game/js/plugins/DEUS_Core.js` were NOT edited by the writer.
   - Open Owner questions are documented in `REPORT.md` and left for Owner decision, not answered by the writer.
   - Proposed follow-ups are correctly named `PROPOSED-AW-01` and `PROPOSED-AW-02`.

---

## 5. Findings

- **BLOCKER:** None.
- **MAJOR:** None.
- **MINOR:** None.

---

VERDICT: CLEAN PASS
