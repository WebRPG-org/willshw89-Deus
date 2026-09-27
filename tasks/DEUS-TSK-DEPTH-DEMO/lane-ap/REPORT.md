# DEUS-TSK-DEPTH-DEMO lane-ap report

Writer: grok. Reviewer: gemini, launched later by the PM. This report does not certify the lane. Merge still waits on the Owner, including after a Gemini pass.

No art and no audio were generated. No PixelLab run. No image files were written. Placeholder colours and catalogue slot names only.

`DEUS_Depth.js`, `plugins.js`, and `DEUS_Core.js` were not edited. The flat depth suite still loads only `DEUS_Depth`.

## What landed

- `game/js/plugins/DEUS_DepthCues.js` — cue math. Headless `require` from Node. Defaults are DEC-011: every boolean cue off, scale 1, light off, blur rejected.
- `game/js/plugins/DEUS_DepthDemo.js` — 8×6 demo scene, 32-layer benchmark (512 units, 19×15 window), and a `Scene_Map` overlay that draws nothing while the state is the default.
- `game/data/DEUS_DepthDemo.json` — baked ramp table, swatch book, demo scene, asset-need list.
- `docs/systems/DEUS_DepthDemo.md` — rules and the benchmark table.
- `tools/depth_demo/test_depth_demo.js` — 28 checks, each with a killed mutant.
- `tools/depth_demo/bench_depth_demo.js` — reprints the table.

Geometry used here is A9c items 26 and 29: 1 layer = 5 ft = 48 px, quarters 12 px. The view is RMMZ top-down 3/4. Cliff and wall drops are one tile, not quarter-height front strips. `DP.CLIFF.TEMPERATE.FACE` is never emitted.

Cues, all default off: palette ramp, cliff/wall/ramp faces with a 1 px lip, hard 2 px checker shadows, whole-pixel parallax on lower layers only, layer markers, unit height shift (`quarter × 12`), camera layer easing in whole pixels, dithered cutaways, cross-layer spell notes, glows through open cells onto lower layers, weather on the exposed surface, dynamic light `off` / `per-tile` / `per-pixel` (blur cannot be enabled), dim falloff of 2 or 3 steps, day length 24..48 real minutes, integer scale 1/2/3 nearest-neighbour.

HP bars stay on the unit's layer, including below the view, and keep the UI colour. Spells stay on their target layer. Selection can hold units on more than one layer. Cues do not clear it.

The dual-grid Wang renderer (A9c item 34) is not in this task.

## Benchmark

Same table as `docs/systems/DEUS_DepthDemo.md`. Node raster, this machine, iterations 4, or 2 when the case is per-pixel or scaled. Buffer bytes are the typed arrays allocated for that composite. They are stable. Frame milliseconds are one measurement, not a gate.

Scene: 32 layers, z −16..+15, 512 units, 19×15 tiles, 8 lights. View z = 0. `glowsLightLower` rasters z = 0 down through −16 (17 layers).

| case | scale | light | frame ms | buffer bytes |
|---|---:|---|---:|---:|
| all-off | 1 | off | 0.630 | 0 |
| toggle-paletteShift | 1 | off | 1.174 | 855 |
| toggle-cliffFaces | 1 | off | 0.610 | 0 |
| toggle-dropShadows | 1 | off | 1.123 | 656640 |
| toggle-parallax | 1 | off | 0.387 | 0 |
| toggle-depthMarkers | 1 | off | 0.268 | 0 |
| toggle-unitHeightShift | 1 | off | 0.323 | 0 |
| toggle-cameraLayerEasing | 1 | off | 0.269 | 0 |
| toggle-ditheredCutaways | 1 | off | 1.029 | 656640 |
| toggle-crossLayerEffects | 1 | off | 0.269 | 0 |
| toggle-glowsLightLower | 1 | off | 0.301 | 0 |
| toggle-weatherByLayer | 1 | off | 0.308 | 0 |
| light-per-tile | 1 | per-tile | 0.374 | 285 |
| light-per-pixel | 1 | per-pixel | 4.816 | 656640 |
| dim-2 | 1 | per-tile | 0.316 | 285 |
| dim-3 | 1 | per-tile | 0.288 | 285 |
| day-length-36 | 1 | off | 0.261 | 0 |
| scale-2 | 2 | off | 6.554 | 2626560 |
| scale-3 | 3 | off | 13.753 | 5909760 |
| glows-lower-lit | 1 | per-tile | 0.905 | 4845 |
| look | 1 | off | 1.707 | 657495 |
| look-parallax | 1 | off | 1.785 | 657495 |
| look-light-tile | 1 | per-tile | 1.869 | 662340 |
| look-light-pixel | 1 | per-pixel | 807.642 | 11820375 |
| all-tile-1x | 1 | per-tile | 2.521 | 1318980 |
| all-pixel-2x | 2 | per-pixel | 790.832 | 15103575 |
| all-pixel-3x | 3 | per-pixel | 818.216 | 18386775 |
| night-torch-fire-tile | 1 | per-tile | 0.239 | 285 |
| night-torch-fire-pixel | 1 | per-pixel | 4.665 | 656640 |

Per-pixel on the viewed layer alone is about 5 ms. Per-pixel on all 17 layers from the view down is about 800 ms in this raster. Per-tile across those same layers stays under 1 ms.

## 10 ft layers still in the tree

Flagged, not changed:

| File | Still on the 10 ft model |
|---|---|
| `game/js/plugins/DEUS_World.js` | `UF.Space.Z_STEP_FEET` 10, from `STRATA_PER_LAYER` 5 × `STRATUM_FEET` 2. `rulesDistanceFeet` uses it. |
| `game/js/plugins/DEUS_Levels.js` | `STRATA = 5`. Comment: a level is 10 ft. |
| `art/catalogue/geometry.json` | `layerFt` 10, `layerPx` 96, `stratumPx` [19, 19, 19, 19, 20]. |

`DEUS_Dnd5e.js` mentions "10 ft" only as spell speed text. That is not layer geometry.

## Owner questions

Not decided here:

1. AS-RENDER-001 says the game presentation default is 2× (1920-wide), 3× at 2560 and 3840. This task's brief keeps DEC-011 as the demo default, so the demo boots at 1× and does not apply `recommendScale`. The function is recorded. Whether the demo should open at 2× is for the Owner at review.
2. AS-SCALE-001 gives the torch as 192 px bright + 192 px dim. It does not give a separate fire radius or window-glow radius. The demo places fire at the same 192 + 192. `GL.WINDOW.F00` is an asset need with no placed radius.

## Proposed follow-ups

- `PROPOSED-AP-01` — Retarget `UF.Space`, `DEUS_Levels` strata, and `art/catalogue/geometry.json` from 10 ft / five 2 ft strata to 5 ft / four 12 px quarters. Those files are outside this lane.
- `PROPOSED-AP-02` — Dual-grid Wang terrain renderer (A9c item 34). Out of scope for this task.

## Registration request

Add these to `game/js/plugins.js` immediately after `DEUS_Depth`. Parameters are empty. This lane did not edit `plugins.js`.

1. `name`: `DEUS_DepthCues`
   - `status`: true
   - `description`: `[DEUS Depth Cues] Baked depth ramps, cliffs, shadows, parallax, light and integer scale. Every cue off by default.`
   - `parameters`: `{}`
   - Load after `DEUS_Depth`, `DEUS_Levels`, `DEUS_World`, `DEUS_Camera`.

2. `name`: `DEUS_DepthDemo`
   - `status`: true
   - `description`: `[DEUS Depth Demo] Owner-review depth cues. Defaults off (DEC-011).`
   - `parameters`: `{}`
   - Load after `DEUS_DepthCues`.

After that registration, the console API is `DEUS.DepthDemo.setToggle(name, true)`, `setScale(1|2|3)`, `setLightMode("off"|"per-tile"|"per-pixel")`, `setDimSteps(0|2|3)`, `setDayLength(minutes|null)`, `reset()`. Scale 1 leaves the canvas style alone. Scale 2 or 3 sets nearest-neighbour CSS on the finished canvas and does not change the map tilemap scale.

## Gate output

Run on the worktree after the lower-layer light raster, before this report was committed. The depth suite's snapshot was deleted by the harness.

```
===== node tools/depth_demo/test_depth_demo.js =====
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
EXIT 0

===== node tools/test_layer_render_flat.js --suite depth =====
=== DEUS_Depth suite "depth" (WG.00.09b Lane K) ===
run: RESULT: 27 passed, 0 failed (exit 0) in 37.1 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_7364_1790478865488 (deleted)
  PASS depth.preconditions - world true, levels true, view 0, surface grid true, screen 816x624, world seed 426325128
  PASS depth.proof_scene - fixture scene centred at (160,160) in area (0,0), world seed 426325128: 144 columns x 5 levels (611 cell(s) written, 109 already as specified), 112 ground tile(s) set (meadow, tile 2816), 74 object(s) cleared, 5541 ms; 0 refused, 0 cell(s) not as specified; hole (155,157), deck 3 cells from (158,158)
  PASS depth.planes_present - view 2; depth 1 -> level 1, 2 paint(s), 55956 opaque samples; depth 2 -> level 0, 2 paint(s), 53585 opaque samples; last paint 5.2 ms, last peek 0.0 ms
  PASS depth.repaint_cost - 4 of 4 refreshes of one 912x720 plane repainted it by the next frame; repaint times 5.2 / 1.3 / 1.4 / 2.0 / 1.2 ms (reported, not gated: wall-clock time, this machine, nw.exe harness)
  PASS depth.projection_origin - centre -> (408,312) want (408,312); left edge -> (0,312) want (0,312) (identity, DEC-011); plane scale 1
  PASS depth.exposure_by_upper_geometry - floor cell (164,157) unchanged by the planes; open cell (157,156) shows the level below
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_7364_1790478865488\test_output\depth.planes_only_plus2.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_7364_1790478865488\test_output\depth.planes_only_plus2_tiles.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_7364_1790478865488\test_output\depth.canvas_depth1.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_7364_1790478865488\test_output\depth.canvas_depth2.png
  PASS depth.mask_order - deck cell (159,158) at screen (384,240): drawn #d89a55, depth 1 texels {#351d16 #492a19 #d89a55 #8e4d30}, ground texel under it #71864d/255
  PASS depth.depth2_through_depth1 - low ground (164,162) at screen (624,432): drawn #71864d/255, ground texel #71864d/255, ground texels {#71864d}, depth 1 alpha there 0; under the hole (155,157) the ground draws #71864d/255 (tiles 2816/0/0)
  PASS depth.entities_drawn - fixtures: oak placed at (153,156), item stone x3 at (154,157), unit added; +1 plane draws 1 object(s), 1 unit(s), 1 item stack(s), 87 wall/ramp frame(s); item sheet !$UF_Item_Stone ready true, tracked by the plane true, visible true; unit at (156,158) probed at screen (240,244): drawn (#fbdcc8 vs #35312d without units)
  PASS depth.crisp_nearest - 35328 opaque samples, 0 colour(s) not in the 52-colour source set; smooth false, baseTexture scaleMode 0 (0 nearest, 1 linear), sprite texture is the bitmap's, plane at (-24,-24)
  PASS depth.parallax_bounded - edge shift measured depth 1 0 px, depth 2 0 px (want 0); a pan of 2 tiles moved a low-ground point on depth 1 from x 624 to 528 (-96 px, want -96); the point under the centre stays at x 408; display back at 151.5 (was 151.5)
  PASS depth.tunables_take_effect - maxDepth 1 [1:1 2:-] void true; maxDepth 2 [1:1 2:0]; enabled false [1:- 2:-] void false; enabled true [1:1 2:0] void true
  PASS depth.no_filters_any_state - maxDepth 1: none; maxDepth 2: none; off: none; on: none; entities off: none; entities on: none
  PASS depth.one_level_below - maxDepth 1: depth 1 level 1, depth 2 hidden, void shown
  PASS depth.void_beyond - low ground (164,162) at screen (624,432): planes render #08080c/255, screen #08080c, void #08080c
  PASS depth.no_blends - 0 of 35328 sampled pixels are blends (want 0)
  PASS depth.flat_transform - depth 1 scale 1 at (-24,-24) filters [] entities [] alpha 1; depth 2 scale 1 at (-24,-24) filters [] entities [] alpha 1; blur/colour filters in the subtree: none; active tilemap scale 1, filters none, alpha 1; terrace pixel #352d24, its source texel #352d24/255
  PASS depth.entities_inherit_treatment - unit sprite in the +1 plane: child of the plane, world scale 1 x 1, filters on it and its 3 container(s): none; tint #ffffff (the unit's own)
  PASS depth.visual_settings_no_physics - unchanged: {"unit":{"x":156,"y":158,"z":1},"shapeUnit":"floor","shapeChain":"open","walkChain":false,"walkUnit":true,"objects":1}
  PASS depth.config_deterministic - the same after maxDepth 1 / 0 / 2 and off / on: {"describe":"2 level(s) below, drawn 1:1 (DEC-011), void #08080c","planes":[{"z":1,"visible":true,"x":-24,"y":-24,"scale":1,"alpha":1,"filters":[]},{"z":0,"visible":true,"x":-24,"y":-24,"scale":1,"alpha":1,"filters":[]}]}
  PASS depth.planes_cost - sampled 2 x 60 frames per condition: planes off none shown in every frame, on both bound in every frame; reported, not gated: GL renderer "ANGLE (NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11 vs_5_0 ps_5_0)"; median engine tick (update + render submit): planes off 1.6 ms, on 2.3 ms (the planes +0.7 ms); median frame intervals off 14, on 14 ms; worst tick off 4.8, on 3.4 ms; this machine, nw.exe harness, simulation paused
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_7364_1790478865488\test_output\depth.plus2_off.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_7364_1790478865488\test_output\depth.plus2_flat.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_7364_1790478865488\test_output\depth.plus1_off.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_7364_1790478865488\test_output\depth.plus1_flat.png
  PASS depth.screenshots_written - depth.plus2_off.png 250370 B, depth.plus2_flat.png 113700 B, depth.plus1_off.png 197521 B, depth.plus1_flat.png 98354 B
  PASS depth.ground_draws_through_openings - view 0, depth 1 -> -1, depth 2 -> -2, void shown; floor ground cell (158,159) unchanged by the planes (its own art's lowest alpha 255); open cell (161,159) over the -2 floor draws #352d24 (planes #352d24, -2 texels {#514945 #35312d #352d24}, -1 alpha 0; planes off #000000); open cell (159,159) over the -1 floor draws #352d24 (-1 texels {#514945 #35312d #352d24}; planes off #000000)
  PASS depth.entities_at_seam - view on +2 centred on (2,2), display (249.5,251.5) (wrapped); +1 plane level 1: item (1,1) drawn at (384,312); item (253,1) drawn at (192,312); item (1,253) drawn at (384,120); item (253,253) drawn at (192,120); wall face (254,4) drawn at (240,456); wall face (4,254) drawn at (528,168); unit (3,3) drawn at (480,408)
  PASS depth.canvases_freed - after 4 in-place level switches and 2 map transfer(s) (a new spriteset each): 4 canvas layers in use, 4 canvases made since boot, 0 destroyed, 0 pooled (want 4 / 4 / 0 / 0); at each new scene's start, view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]; view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]
  PASS depth.hotkey_free - keyMapper[118] (F7) is undefined: the preset hotkey is gone and the key is free
  PASS depth.no_errors - none
required checks: 27/27 PASS

RESULT: all required checks passed (exit 0)
EXIT 0

===== node tools/check_deus_syntax.js =====
Checked 54 DEUS plugin files. Errors: 0
EXIT 0
```
