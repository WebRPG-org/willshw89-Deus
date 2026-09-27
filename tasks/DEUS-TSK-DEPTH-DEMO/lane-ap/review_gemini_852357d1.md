# Independent Review: Lane AP (DEUS-TSK-DEPTH-DEMO)

Reviewer: Gemini (independent non-author review)
Writer: Grok
Reviewed SHA: 852357d1b7d0fd0a79161da14f2f419d8b971979

## Git Tip Verification

```text
git rev-parse HEAD origin/task/lane-ap:
852357d1b7d0fd0a79161da14f2f419d8b971979
852357d1b7d0fd0a79161da14f2f419d8b971979

git log -12 --format="%H %an %s":
852357d1b7d0fd0a79161da14f2f419d8b971979 deus-grok [grok] DEUS-TSK-DEPTH-DEMO record lower-layer light cost and gate output
31ab0feaf7b64355ddbcb82c41a1d06c790314fa deus-grok [grok] DEUS-TSK-DEPTH-DEMO add depth cue demo, baked ramps, and headless gates
7b6dcb4748f7a85fc682c79ede847c7e3d09c2e6 deus-pm [pm] Open lane-ap (DEUS-TSK-DEPTH-DEMO): BRIEF.md and lane.json
1c2fcc28736566f8dd4f14ccd0633f09687e3521 deus-pm Merge task/lane-aa: WG.00.17 Z-range one setting, 32 layers (-16..+15), sparse storage, 2-ft strata (PM merge; Gemini 3.8 Flash thinking HIGH final gate per Owner ruling 20:45 CT replacing the Pro second pass, VERDICT: PASS WITH NOTES (0 BLOCKER, 0 MAJOR) at 212ddf060c41925bfd5e71d88f165cc606433510 / review d2c6614f5b403d397089728f0412a7b14057b430; earlier Flash PASS 705bf9ba9e7af37d44731bcf46ca4d3ea154b61d; writer grok tip 212ddf060c41925bfd5e71d88f165cc606433510)
d2c6614f5b403d397089728f0412a7b14057b430 deus-gemini [gemini] WG.00.17 review final 212ddf06
c1bb4469772b0763dc257bf2aa6c61256532772e deus-pm Merge task/lane-al: WG.20.01 A9b+A9c items 12-43 + section F + addendum 0509 (PM merge; Gemini 3.8 Flash thinking HIGH final gate per Owner ruling 20:45 CT, VERDICT: CLEAN PASS at c70736fdf535e2579bb48789e8d9057420b2dcf9 / review c17da05f9feafa15601ee13cce30505bb1683749; writer grok tip c70736fdf535e2579bb48789e8d9057420b2dcf9)
c17da05f9feafa15601ee13cce30505bb1683749 deus-gemini [gemini] WG.20.01 review c70736fd
684c9513d181a844f9a06c4f34021f40ee2cafb1 snewt [gemini] 0119-DO/0120-DP: Lane AA Pro launch quota-blocked; AA/AL reviews held until Pro reset ~2026-09-27 19:04 CT
7a5d50a319bc3ef05bb0b23692a5096aba35073a snewt [gemini] 0118-DN: Lane AL A9c item 43 FINAL recorded; review held for Pro
c70736fdf535e2579bb48789e8d9057420b2dcf9 deus-grok [grok] WG.20.01 A9c item 43 whole-sprite characters and eight directions
3d2a719741efe1941a03350731e797c7faca21f2 snewt [gemini] 0117-DM: Lane AL A9c item 43 addendum 0509 recorded
0885b8791289a030664b30dc2ec2513680c7e3db snewt [gemini] 0116-DL: Lane AL WG.20.01 A9c item 43 LAUNCHED
```

## Scope Verification

Merge base with `origin/main`: `1c2fcc28736566f8dd4f14ccd0633f09687e3521`.

Diff against merge base:
```text
A	docs/systems/DEUS_DepthDemo.md
A	game/data/DEUS_DepthDemo.json
A	game/js/plugins/DEUS_DepthCues.js
A	game/js/plugins/DEUS_DepthDemo.js
A	tasks/DEUS-TSK-DEPTH-DEMO/lane-ap/BRIEF.md
A	tasks/DEUS-TSK-DEPTH-DEMO/lane-ap/REPORT.md
A	tasks/DEUS-TSK-DEPTH-DEMO/lane-ap/lane.json
A	tools/depth_demo/bench_depth_demo.js
A	tools/depth_demo/test_depth_demo.js
```

### Scope Table

| Path | Status | Within `allowedPaths`? | Notes |
|---|---|---|---|
| `game/js/plugins/DEUS_DepthCues.js` | Added | YES | Headless cue math, baked palette shifts, shadows, parallax, light, integer scale |
| `game/js/plugins/DEUS_DepthDemo.js` | Added | YES | Demo scene builder, benchmark suite, Map overlay (draws nothing when cues are off) |
| `game/data/DEUS_DepthDemo.json` | Added | YES | Baked ramps, swatch book, demo scene data, asset-need list |
| `docs/systems/DEUS_DepthDemo.md` | Added | YES | System specification, geometry rules, benchmark table |
| `tasks/DEUS-TSK-DEPTH-DEMO/lane-ap/BRIEF.md` | Added | YES | Task brief |
| `tasks/DEUS-TSK-DEPTH-DEMO/lane-ap/lane.json` | Added | YES | Lane manifest |
| `tasks/DEUS-TSK-DEPTH-DEMO/lane-ap/REPORT.md` | Added | YES | Writer report |
| `tools/depth_demo/bench_depth_demo.js` | Added | YES | Depth benchmark runner |
| `tools/depth_demo/test_depth_demo.js` | Added | YES | 28 gate tests with 28 killed mutants |

Forbidden path checks:
- `game/js/plugins.js`: UNTOUCHED
- `game/js/plugins/DEUS_Core.js`: UNTOUCHED
- `game/js/plugins/DEUS_Depth.js`: UNTOUCHED
- `art/**`: UNTOUCHED (0 files modified/added)
- `docs/STATUS.md`: UNTOUCHED
- `docs/OWNER_DECISIONS.md`: UNTOUCHED
- WBS files: UNTOUCHED

## Policy & Invariant Checks

1. **NO ART (DEC-007):** PASS. No image files generated, requested, or integrated. Placeholder colors and slot catalogue names only.
2. **DEC-011 (1:1 view, no filters default):** PASS. Every cue is off by default (`scale=1`, `lightMode="off"`, `blur=false`, `dimSteps=0`). Map overlay draws nothing in default state.
3. **Integer Render Scale (A9c item 27):** PASS. Only nearest-neighbour integer scaling (1x, 2x, 3x) supported; fractional scaling and blur filters are strictly rejected.
4. **DEC-027 / SRD 5.1 & UI Compatibility:** PASS. HP bars stay anchored on each unit's layer with unshifted UI colors. Spell targets remain on their assigned layers. Cross-layer selection sets remain intact without cue interference.
5. **Geometry (A9c items 26 & 29):** PASS. Standard 1 layer = 5 ft = 48 px, quarters = 12 px used. Legacy 10 ft instances in external files (`DEUS_World.js`, `DEUS_Levels.js`, `art/catalogue/geometry.json`) are flagged as `PROPOSED-AP-01` and appropriately left untouched.
6. **Owner Gate:** PASS. Both `BRIEF.md` and `REPORT.md` explicitly state that this lane does not certify Owner acceptance; Owner sign-off on the depth rules is strictly required prior to any merge.

## Gate Test Results (in fresh temporary clone)

All gate tests re-executed in fresh detached clone (`C:\Users\snewt\.gemini\tmp\lane-ap\deus_review_ap_852357d1` at `852357d1b7d0fd0a79161da14f2f419d8b971979`).

### 1. `node tools/depth_demo/test_depth_demo.js`
```text
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
Raw exit code: `0`

### 2. `node tools/test_layer_render_flat.js --suite depth`
```text
=== DEUS_Depth suite "depth" (WG.00.09b Lane K) ===
run: RESULT: 27 passed, 0 failed (exit 0) in 36.5 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24848_1790511151032 (deleted)
  PASS depth.preconditions - world true, levels true, view 0, surface grid true, screen 816x624, world seed 1207898421
  PASS depth.proof_scene - fixture scene centred at (184,184) in area (0,0), world seed 1207898421: 144 columns x 5 levels (332 cell(s) written, 388 already as specified), 57 ground tile(s) set (meadow, tile 2816), 78 object(s) cleared, 3203 ms; 0 refused, 0 cell(s) not as specified; hole (179,181), deck 3 cells from (182,182)
  PASS depth.planes_present - view 2; depth 1 -> level 1, 2 paint(s), 39827 opaque samples; depth 2 -> level 0, 4 paint(s), 57327 opaque samples; last paint 4.1 ms, last peek 0.0 ms
  PASS depth.repaint_cost - 4 of 4 refreshes of one 912x720 plane repainted it by the next frame; repaint times 4.1 / 2.5 / 0.8 / 1.1 / 1.2 ms (reported, not gated: wall-clock time, this machine, nw.exe harness)
  PASS depth.projection_origin - centre -> (408,312) want (408,312); left edge -> (0,312) want (0,312) (identity, DEC-011); plane scale 1
  PASS depth.exposure_by_upper_geometry - floor cell (188,181) unchanged by the planes; open cell (181,180) shows the level below
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24848_1790511151032\test_output\depth.planes_only_plus2.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24848_1790511151032\test_output\depth.planes_only_plus2_tiles.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24848_1790511151032\test_output\depth.canvas_depth1.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24848_1790511151032\test_output\depth.canvas_depth2.png
  PASS depth.mask_order - deck cell (183,182) at screen (384,240): drawn #d89a55, depth 1 texels {#351d16 #492a19 #d89a55 #8e4d30}, ground texel under it #71864d/255
  PASS depth.depth2_through_depth1 - low ground (188,186) at screen (624,432): drawn #71864d/255, ground texel #71864d/255, ground texels {#71864d}, depth 1 alpha there 0; under the hole (179,181) the ground draws #71864d/255 (tiles 2816/0/0)
  PASS depth.entities_drawn - fixtures: oak placed at (177,180), item stone x3 at (178,181), unit added; +1 plane draws 1 object(s), 1 unit(s), 1 item stack(s), 10 wall/ramp frame(s); item sheet !$UF_Item_Stone ready true, tracked by the plane true, visible true; unit at (180,182) probed at screen (240,244): drawn (#fbdcc8 vs #35312d without units)
  PASS depth.crisp_nearest - 53504 opaque samples, 0 colour(s) not in the 64-colour source set; smooth false, baseTexture scaleMode 0 (0 nearest, 1 linear), sprite texture is the bitmap's, plane at (-24,-24)
  PASS depth.parallax_bounded - edge shift measured depth 1 0 px, depth 2 0 px (want 0); a pan of 2 tiles moved a low-ground point on depth 1 from x 624 to 528 (-96 px, want -96); the point under the centre stays at x 408; display back at 175.5 (was 175.5)
  PASS depth.tunables_take_effect - maxDepth 1 [1:1 2:-] void true; maxDepth 2 [1:1 2:0]; enabled false [1:- 2:-] void false; enabled true [1:1 2:0] void true
  PASS depth.no_filters_any_state - maxDepth 1: none; maxDepth 2: none; off: none; on: none; entities off: none; entities on: none
  PASS depth.one_level_below - maxDepth 1: depth 1 level 1, depth 2 hidden, void shown
  PASS depth.void_beyond - low ground (188,186) at screen (624,432): planes render #08080c/255, screen #08080c, void #08080c
  PASS depth.no_blends - 0 of 53504 sampled pixels are blends (want 0)
  PASS depth.flat_transform - depth 1 scale 1 at (-24,-24) filters [] entities [] alpha 1; depth 2 scale 1 at (-24,-24) filters [] entities [] alpha 1; blur/colour filters in the subtree: none; active tilemap scale 1, filters none, alpha 1; terrace pixel #352d24, its source texel #352d24/255
  PASS depth.entities_inherit_treatment - unit sprite in the +1 plane: child of the plane, world scale 1 x 1, filters on it and its 3 container(s): none; tint #ffffff (the unit's own)
  PASS depth.visual_settings_no_physics - unchanged: {"unit":{"x":180,"y":182,"z":1},"shapeUnit":"floor","shapeChain":"open","walkChain":false,"walkUnit":true,"objects":1}
  PASS depth.config_deterministic - the same after maxDepth 1 / 0 / 2 and off / on: {"describe":"2 level(s) below, drawn 1:1 (DEC-011), void #08080c","planes":[{"z":1,"visible":true,"x":-24,"y":-24,"scale":1,"alpha":1,"filters":[]},{"z":0,"visible":true,"x":-24,"y":-24,"scale":1,"alpha":1,"filters":[]}]}
  PASS depth.planes_cost - sampled 2 x 60 frames per condition: planes off none shown in every frame, on both bound in every frame; reported, not gated: GL renderer "ANGLE (NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11 vs_5_0 ps_5_0)"; median engine tick (update + render submit): planes off 1.4 ms, on 2.0 ms (the planes +0.6 ms); median frame intervals off 16, on 16 ms; worst tick off 2.8, on 3.4 ms; this machine, nw.exe harness, simulation paused
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24848_1790511151032\test_output\depth.plus2_off.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24848_1790511151032\test_output\depth.plus2_flat.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24848_1790511151032\test_output\depth.plus1_off.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24848_1790511151032\test_output\depth.plus1_flat.png
  PASS depth.screenshots_written - depth.plus2_off.png 294385 B, depth.plus2_flat.png 108229 B, depth.plus1_off.png 273022 B, depth.plus1_flat.png 110128 B
  PASS depth.ground_draws_through_openings - view 0, depth 1 -> -1, depth 2 -> -2, void shown; floor ground cell (182,183) unchanged by the planes (its own art's lowest alpha 255); open cell (185,183) over the -2 floor draws #352d24 (planes #352d24, -2 texels {#514945 #35312d #352d24}, -1 alpha 0; planes off #000000); open cell (183,183) over the -1 floor draws #352d24 (-1 texels {#514945 #35312d #352d24}; planes off #000000)
  PASS depth.entities_at_seam - view on +2 centred on (2,2), display (249.5,251.5) (wrapped); +1 plane level 1: item (1,1) drawn at (384,312); item (253,1) drawn at (192,312); item (1,253) drawn at (384,120); item (253,253) drawn at (192,120); wall face (254,4) drawn at (240,456); wall face (4,254) drawn at (528,168); unit (3,3) drawn at (480,408)
  PASS depth.canvases_freed - after 4 in-place level switches and 2 map transfer(s) (a new spriteset each): 4 canvas layers in use, 4 canvases made since boot, 0 destroyed, 0 pooled (want 4 / 4 / 0 / 0); at each new scene's start, view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]; view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]
  PASS depth.hotkey_free - keyMapper[118] (F7) is undefined: the preset hotkey is gone and the key is free
  PASS depth.no_errors - none
required checks: 27/27 PASS

RESULT: all required checks passed (exit 0)
```
Raw exit code: `0`

### 3. `node tools/check_deus_syntax.js`
```text
Checked 54 DEUS plugin files. Errors: 0
```
Raw exit code: `0`

## Findings

- **BLOCKER:** 0
- **MAJOR:** 0
- **MINOR:** 0

Notes:
- The implementation strictly adheres to the scope and constraints set out in `BRIEF.md` and `lane.json`.
- The depth cues are entirely off by default, maintaining DEC-011 flat 1:1 view without filters or blur.
- The gate tests include comprehensive coverage and mutant-killing checks for all toggles, scale limits, lighting dither, and geometry.
- The registration request for PM merge integration is cleanly detailed in `REPORT.md` without any unauthorized edits to `plugins.js` or `DEUS_Core.js`.
- Owner sign-off is preserved as a mandatory prerequisite prior to merge.

VERDICT: CLEAN PASS
