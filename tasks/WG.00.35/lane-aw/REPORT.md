# WG.00.35 lane-aw report

Writer: grok. Reviewer: gemini, launched later by the PM. This report does not certify the lane.

No art and no audio were generated. No image model was run. No image files were written. Bars and marks are code-filled rectangles. `plugins.js`, `DEUS_Core.js`, `DEUS_CombatUI.js`, and `DEUS_DepthCues.js` were not edited.

## What changed

- `game/js/plugins/DEUS_LayerOverlays.js` — headless planner plus the live sprites on a depth plane. `sync(world)` rebuilds only when `world.revision` changes. The same revision returns the cached plan and allocates no records. Visible lower-layer units get effects, the combat HP bar, status marks, an action bar, a hit flash, native floating numbers (at most four), a selection square, a whole-square range mark, and spell marks. Scale is 1. Filters, blur, tint, fog, desaturation, and alpha fade stay off. An opaque cell above the unit, a cell outside the window, a unit above the view, or a unit past `maxDepth` gets nothing.
- `game/js/plugins/DEUS_Depth.js` — after the lower-layer units are placed, calls `UF.LayerOverlays` if that plugin is loaded. The depth suite does not load it, so the call is a null check there.
- `tools/layer_overlays/test_layer_overlays.js` — 20 checks, each with a mutant it rejects.
- `tools/layer_overlays/bench_layer_overlays.js` — reprints the benchmark table.
- `docs/systems/DEUS_LayerOverlays.md` — rules, cue interaction, and the benchmark.

The viewed layer's combat bars stay in `DEUS_Combat`. This plugin paints on the depth planes only. The headless plan still describes the viewed layer with the same bar geometry, so a test can see it was not scaled or filtered.

A lower-layer bar uses the on-map combat bar: 32×6 back, 30×4 fill, five sections, fill `[36, 196, 36]`. The foot matches `DEUS_Depth` (`(x + 0.5) × 48`, `(y + 1) × 48`) plus the layer's whole-pixel draw offset. `DEUS_DepthCues.hpBars` is unchanged: 48×4, UI colour `[200, 40, 48]`, `paletteShifted` false.

Depth-demo cues may move or darken a layer. Parallax, camera, easing, and unit-height shift move the overlay with the unit by whole pixels. Palette, light, blur, and render scale do not change the overlay. `crossLayerEffects` lists open layers between caster and target; the spell sprite stays on the target cell.

Blood marks stay at alpha 1. The 3-step fade from Combat U7 is not applied (DEC-011: no alpha fade on these overlays).

## Benchmark

One Node run, this worktree, 2026-09-27. 32 layers, z −16..+15, view z = 0, 1024 units. Each visible bench unit is three overlays (faction, low HP, HP bar). `bad` counts overlays that are scaled, filtered, blurred, tinted, fogged, desaturated, faded, palette-shifted, or off a whole pixel. Reprint: `node tools/layer_overlays/bench_layer_overlays.js`.

| case | reach | HP bars | lower HP bars | overlays | bad | time |
|---|---:|---:|---:|---:|---:|---|
| buried | 31 | 32 | 0 | 96 | 0 | 1.287 ms (first records) |
| shaft-depth-2 | 2 | 34 | 2 | 102 | 0 | 0.189 ms |
| shaft-depth-31 | 31 | 48 | 16 | 144 | 0 | 0.328 ms |
| cues-on | 2 | 34 | 2 | 102 | 0 | 0.123 ms; dx 6, dy 6; scale 1 |
| steady | 2 | 34 | 2 | 102 | 0 | 20 rebuilds 1.690 ms; 200 unchanged frames 0.008 ms; 0 new records |

The pool stops at 144 records. Milliseconds are one measurement, not a gate.

## Evidence

NW.js does run headless. The lane gate `node tools/test_layer_render_flat.js --suite depth` passed on this machine (27/27, about 49 s) and deleted its snapshot. That run loads only `DEUS_Depth`, so it does not draw these overlays.

A second throwaway under `%TEMP%\uf_snapshots\lane_aw_overlay` registered `DEUS_Depth` and `DEUS_LayerOverlays` and ran the same depth suite: 27/27, exit 0. `depth.plus2_flat.png` is view +2 looking through an opening onto the +1 proof unit. A bar sits over that unit's head (green fill, and the small status mark). `DEUS_Combat` does not draw bars for a unit whose Z is not the viewed layer, so that bar is this plugin. The scene is the depth proof unit, not a fight: no second combatant, no floating number, no spell. The clone, including the screenshots, was deleted before the commit.

Owner playtest, still worth doing: stand on an open shaft, start a fight on the layer below, and confirm the HP bar, a hit number, and a selection square sit on that unit at 1:1, disappear when a floor is filled in above them, and do not blur or fade when a depth-demo cue is turned on.

## Open Owner questions

Not decided here:

- The depth-demo HP bar is 48×4 in the UI colour. The on-map bar is the 30px combat bar. This lane uses the combat bar on lower layers so the unit matches the viewed layer. Whether those should be one bar is for the Owner.
- `DEUS_Depth` still draws at most `MaxDepth` (2) planes. Overlays are not built for a layer that has no plane. Whether an open shaft deeper than that should show overlays before those layers are drawn is for the Owner.

## Follow-ups

- `PROPOSED-AW-01`: a read-only selection accessor on the combat engine. Fortress selection is closed over inside `combat_rt`, and `view()` copies it. Live marks read `unit.selected` or `unit.data.selected` so the frame does not copy that list.
- `PROPOSED-AW-02`: share `DEUS_Combat`'s cached opaque-top so the lower bar sits on the same head row. This lane uses the sprite frame top, or 40 px when the frame is not ready, and does not read pixels per frame.

## Registration request

The PM adds this to `game/js/plugins.js` at merge, after `DEUS_Depth`. No parameters. Do not add it in this lane.

```json
{
  "name": "DEUS_LayerOverlays",
  "status": true,
  "description": "[DEUS LayerOverlays] Lower-layer effects, HP bars, status, and combat/spell overlays at 1:1 with no filters (DEC-011).",
  "parameters": {}
}
```

## Gate tests

Run on the worktree after the last code edit. This report does not treat a pass as certification.

### `node tools/layer_overlays/test_layer_overlays.js`

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
BENCH buried hp=32 lowerHp=0 overlays=96 lower=0 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.355 steadyMs=
BENCH shaft-depth-2 hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.549 steadyMs=
BENCH shaft-depth-31 hp=48 lowerHp=16 overlays=144 lower=48 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.289 steadyMs=
BENCH cues-on hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=6 steadyAlloc=undefined rebuildMs=0.117 steadyMs=
BENCH steady hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=undefined steadyAlloc=0 rebuildMs=1.583 steadyMs=0.009
PASS benchmark_32_layers
PASS benchmark_32_layers_mutant_killed
RESULT: 40 passed, 0 failed
```

The `allocations=146` line is the counter after the checks that ran before the benchmark inside that same process (the record pool is 144; the extra counts are the opaque set and one spell `between` list from earlier checks). The isolated bench script reports `pool 144` and `steadyAlloc=0`.

### `node tools/test_layer_render_flat.js --suite depth`

```
=== DEUS_Depth suite "depth" (WG.00.09b Lane K) ===
run: RESULT: 27 passed, 0 failed (exit 0) in 48.5 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_1904_1790524439560 (deleted)
  PASS depth.preconditions - world true, levels true, view 0, surface grid true, screen 816x624, world seed 1759440080
  PASS depth.proof_scene - fixture scene centred at (168,176) in area (0,0), world seed 1759440080: 144 columns x 5 levels (649 cell(s) written, 71 already as specified), 112 ground tile(s) set (meadow, tile 2816), 101 object(s) cleared, 5907 ms; 0 refused, 0 cell(s) not as specified; hole (163,173), deck 3 cells from (166,174)
  PASS depth.planes_present - view 2; depth 1 -> level 1, 4 paint(s), 55956 opaque samples; depth 2 -> level 0, 2 paint(s), 47833 opaque samples; last paint 5.0 ms, last peek 0.0 ms
  PASS depth.repaint_cost - 4 of 4 refreshes of one 912x720 plane repainted it by the next frame; repaint times 5.0 / 1.7 / 1.2 / 1.8 / 1.7 ms (reported, not gated: wall-clock time, this machine, nw.exe harness)
  PASS depth.projection_origin - centre -> (408,312) want (408,312); left edge -> (0,312) want (0,312) (identity, DEC-011); plane scale 1
  PASS depth.exposure_by_upper_geometry - floor cell (172,173) unchanged by the planes; open cell (165,172) shows the level below
  PASS depth.mask_order - deck cell (167,174) at screen (384,240): drawn #d89a55, depth 1 texels {#351d16 #492a19 #d89a55 #8e4d30}, ground texel under it #71864d/255
  PASS depth.depth2_through_depth1 - low ground (172,178) at screen (624,432): drawn #71864d/255, ground texel #71864d/255, ground texels {#71864d}, depth 1 alpha there 0; under the hole (163,173) the ground draws #71864d/255 (tiles 2816/0/0)
  PASS depth.entities_drawn - fixtures: oak placed at (161,172), item stone x3 at (162,173), unit added; +1 plane draws 1 object(s), 1 unit(s), 1 item stack(s), 84 wall/ramp frame(s); item sheet !$UF_Item_Stone ready true, tracked by the plane true, visible true; unit at (164,174) probed at screen (240,244): drawn (#fbdcc8 vs #35312d without units)
  PASS depth.crisp_nearest - 33792 opaque samples, 0 colour(s) not in the 57-colour source set; smooth false, baseTexture scaleMode 0 (0 nearest, 1 linear), sprite texture is the bitmap's, plane at (-24,-24)
  PASS depth.parallax_bounded - edge shift measured depth 1 0 px, depth 2 0 px (want 0); a pan of 2 tiles moved a low-ground point on depth 1 from x 624 to 528 (-96 px, want -96); the point under the centre stays at x 408; display back at 159.5 (was 159.5)
  PASS depth.tunables_take_effect - maxDepth 1 [1:1 2:-] void true; maxDepth 2 [1:1 2:0]; enabled false [1:- 2:-] void false; enabled true [1:1 2:0] void true
  PASS depth.no_filters_any_state - maxDepth 1: none; maxDepth 2: none; off: none; on: none; entities off: none; entities on: none
  PASS depth.one_level_below - maxDepth 1: depth 1 level 1, depth 2 hidden, void shown
  PASS depth.void_beyond - low ground (172,178) at screen (624,432): planes render #08080c/255, screen #08080c, void #08080c
  PASS depth.no_blends - 0 of 33792 sampled pixels are blends (want 0)
  PASS depth.flat_transform - depth 1 scale 1 at (-24,-24) filters [] entities [] alpha 1; depth 2 scale 1 at (-24,-24) filters [] entities [] alpha 1; blur/colour filters in the subtree: none; active tilemap scale 1, filters none, alpha 1; terrace pixel #352d24, its source texel #352d24/255
  PASS depth.entities_inherit_treatment - unit sprite in the +1 plane: child of the plane, world scale 1 x 1, filters on it and its 3 container(s): none; tint #ffffff (the unit's own)
  PASS depth.visual_settings_no_physics - unchanged: {"unit":{"x":164,"y":174,"z":1},"shapeUnit":"floor","shapeChain":"open","walkChain":false,"walkUnit":true,"objects":1}
  PASS depth.config_deterministic - the same after maxDepth 1 / 0 / 2 and off / on: {"describe":"2 level(s) below, drawn 1:1 (DEC-011), void #08080c","planes":[{"z":1,"visible":true,"x":-24,"y":-24,"scale":1,"alpha":1,"filters":[]},{"z":0,"visible":true,"x":-24,"y":-24,"scale":1,"alpha":1,"filters":[]}]}
  PASS depth.planes_cost - sampled 2 x 60 frames per condition: planes off none shown in every frame, on both bound in every frame; reported, not gated: GL renderer "ANGLE (NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11 vs_5_0 ps_5_0)"; median engine tick (update + render submit): planes off 1.7 ms, on 2.4 ms (the planes +0.7 ms); median frame intervals off 14, on 14 ms; worst tick off 3.2, on 3.8 ms; this machine, nw.exe harness, simulation paused
  PASS depth.screenshots_written - depth.plus2_off.png 259968 B, depth.plus2_flat.png 113737 B, depth.plus1_off.png 209992 B, depth.plus1_flat.png 93264 B
  PASS depth.ground_draws_through_openings - view 0, depth 1 -> -1, depth 2 -> -2, void shown; floor ground cell (166,175) unchanged by the planes (its own art's lowest alpha 255); open cell (169,175) over the -2 floor draws #352d24 (planes #352d24, -2 texels {#514945 #35312d #352d24}, -1 alpha 0; planes off #000000); open cell (167,175) over the -1 floor draws #352d24 (-1 texels {#514945 #35312d #352d24}; planes off #000000)
  PASS depth.entities_at_seam - view on +2 centred on (2,2), display (249.5,251.5) (wrapped); +1 plane level 1: item (1,1) drawn at (384,312); item (253,1) drawn at (192,312); item (1,253) drawn at (384,120); item (253,253) drawn at (192,120); wall face (254,4) drawn at (240,456); wall face (4,254) drawn at (528,168); unit (3,3) drawn at (480,408)
  PASS depth.canvases_freed - after 4 in-place level switches and 2 map transfer(s) (a new spriteset each): 4 canvas layers in use, 4 canvases made since boot, 0 destroyed, 0 pooled (want 4 / 4 / 0 / 0); at each new scene's start, view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]; view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]
  PASS depth.hotkey_free - keyMapper[118] (F7) is undefined: the preset hotkey is gone and the key is free
  PASS depth.no_errors - none
required checks: 27/27 PASS

RESULT: all required checks passed (exit 0)
```

### `node tools/depth_demo/test_depth_demo.js`

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

### `node tools/combat_rt/test_combat_rt.js`

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

### `node tools/check_deus_syntax.js`

```
Checked 59 DEUS plugin files. Errors: 0
```
