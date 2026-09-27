# WG.00.21 Lane BE report

Writer: grok. Reviewer: gemini (not this run). Branch `task/lane-be`. Base `ecc7b8984a0ab1a919595c792f98a60f18872f73`.

A lower cell is drawn only when every level between the viewed level and it is open, and the walk stops at the first opaque surface, inside `MaxDepth` (still 2) and inside `UF.Culling.bounds()`. Covered units, objects, items, ramps and effects inside that rectangle are not created. A solid viewport does no further plane paint after the bind paint. `DEUS_Culling.js` was not edited. No plugin registration. No art.

The system note is `docs/systems/DEUS_OcclusionCulling.md`.

## Open questions (not answered)

- DEC-017 leaves the custom map-renderer go/no-go to the Owner. The benchmark below is an input, not that decision.
- The WBS row cites DEC-018. In `docs/OWNER_DECISIONS.md`, DEC-018 is the spell ruling and DEC-021 is the occlusion ruling implemented here (with V133 and V149). The WBS text was not changed.

## Benchmark

`node tools/occlusion/bench_occlusion.js` (throwaway copy under `%TEMP%`, deleted by the script). Exit 0.

Solid viewport, 8 steady frames then a 3-tile pan. Open shaft afterwards.

| | legacy (5) | default (32) |
|---|---:|---:|
| steady visits / level visits / paint / sprites | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| steady median `lastUpdateMs` | 0.100 | 0.050 |
| pan camera cells / level visits / paint | 396 / 0 / 0 | 396 / 0 / 0 |
| pan median ms | 0.100 | 0.050 |
| open exposed cells | 2 | 2 |
| open median ms | 0.200 | 0.190 |
| exposed sprite / covered sprite | yes / no | yes / no |
| unit at view−3 | level does not exist | not exposed, no sprite |

Tolerance in the script: counts must match (pan cell-counts may differ by one camera row, 40 cells or 15 percent; this run was exact). Milliseconds: a gap of 2 ms, or a gap no larger than the smaller median. This run's gaps were 0.050 ms. The 32-level launch was the faster one. 2 ms is several times the noisiest solid sample (0.370 ms) and is the room for two separate launches.

```
SUMMARY legacy {"range":"legacy","levels":5,"z":{"zMin":-2,"zMax":2},"maxDepth":2,"steadyVisits":0,"steadyLevels":0,"steadyPaint":0,"steadyTouch":0,"steadyMs":0.09999999929277692,"panLevels":0,"panPaint":0,"panVisits":396,"panMs":0.09999999929277692,"openExposed":2,"openMs":0.20000000040454324,"exposedSprite":true,"coveredSprite":false,"deepExposed":null,"deepSprite":false}
SUMMARY default {"range":"default","levels":32,"z":{"zMin":-16,"zMax":15},"maxDepth":2,"steadyVisits":0,"steadyLevels":0,"steadyPaint":0,"steadyTouch":0,"steadyMs":0.05000000055588316,"panLevels":0,"panPaint":0,"panVisits":396,"panMs":0.04999999873689376,"openExposed":2,"openMs":0.1900000006571645,"exposedSprite":true,"coveredSprite":false,"deepExposed":false,"deepSprite":false}
COMPARE steadyMs 0.09999999929277692 vs 0.05000000055588316 gap 0.04999999873689376; panMs 0.09999999929277692 vs 0.04999999873689376 gap 0.05000000055588316; openExposed 2 vs 2; counts equal; time within tolerance
REMOVED C:\Users\snewt\AppData\Local\Temp\deus_occlusion_FP6Jmr
BENCH_EXIT:0
```

## Gate tests

### `node tools/occlusion/test_occlusion_culling.js` EXIT 0

```
PASS covered_not_drawn
PASS exposed_drawn
PASS cost_proportional
PASS no_full_scan
PASS switch_and_pan
RESULT: 5 passed, 0 failed
OCC:0
```

### `node tools/occlusion/test_occlusion_culling.js --provoke-all` EXIT 0

```
CAUGHT covered_not_drawn: covered-unit updates 3 rendered true; covered-object updates 3 rendered true; covered-item updates 3 rendered true; covered-wall updates 3 rendered true; covered-ramp updates 3 rendered true; covered-effect updates 3 rendered true; deep-unit updates 3 rendered true
CAUGHT exposed_drawn: drew 0 want 6; missing exposed-unit; missing exposed-object; missing exposed-item; missing exposed-wall; missing exposed-ramp; missing exposed-effect
CAUGHT cost_proportional: 32-layer visits 7616 vs 5-layer 1190; solid level visits 7378 / 952; solid exposed 7616; visits 7616 want the bounds 238 not the map; maxDepth 32 on solid visited 7616 / levels 7378; fullScans 1
CAUGHT no_full_scan: second frame visits 4096 fullScans 1 rebuilt true; third frame visits 4096
CAUGHT switch_and_pan: still updated after the cover closed (2); still updated after the pan (3); still updated after the view moved above it (3)
RESULT: 5 provocations caught, 0 missed
PROVOKE_EXIT:0
```

### `node tools/test_layer_render_flat.js --suite depth` EXIT 0

```
=== DEUS_Depth suite "depth" (WG.00.09b Lane K) ===
run: RESULT: 27 passed, 0 failed (exit 0) in 55.4 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_12536_1790535618542 (deleted)
  PASS depth.preconditions - world true, levels true, view 0, surface grid true, screen 816x624, world seed 1220012695
  PASS depth.proof_scene - fixture scene centred at (184,184) in area (0,0), world seed 1220012695: 144 columns x 5 levels (682 cell(s) written, 38 already as specified), 112 ground tile(s) set (meadow, tile 2816), 79 object(s) cleared, 7978 ms; 0 refused, 0 cell(s) not as specified; hole (179,181), deck 3 cells from (182,182)
  PASS depth.planes_present - view 2; depth 1 -> level 1, 2 paint(s), 55956 opaque samples; depth 2 -> level 0, 2 paint(s), 53447 opaque samples; last paint 6.4 ms, last peek 0.0 ms
  PASS depth.repaint_cost - 4 of 4 refreshes of one 912x720 plane repainted it by the next frame; repaint times 6.4 / 1.7 / 2.2 / 1.9 / 2.5 ms (reported, not gated: wall-clock time, this machine, nw.exe harness)
  PASS depth.projection_origin - centre -> (408,312) want (408,312); left edge -> (0,312) want (0,312) (identity, DEC-011); plane scale 1
  PASS depth.exposure_by_upper_geometry - floor cell (188,181) unchanged by the planes; open cell (181,180) shows the level below
  PASS depth.mask_order - deck cell (183,182) at screen (384,240): drawn #d89a55, depth 1 texels {#351d16 #492a19 #d89a55 #8e4d30}, ground texel under it #71864d/255
  PASS depth.depth2_through_depth1 - low ground (188,186) at screen (624,432): drawn #71864d/255, ground texel #71864d/255, ground texels {#71864d}, depth 1 alpha there 0; under the hole (179,181) the ground draws #71864d/255 (tiles 2816/0/0)
  PASS depth.entities_drawn - fixtures: oak placed at (177,180), item stone x3 at (178,181), unit added; +1 plane draws 1 object(s), 1 unit(s), 1 item stack(s), 85 wall/ramp frame(s); item sheet !$UF_Item_Stone ready true, tracked by the plane true, visible true; unit at (180,182) probed at screen (240,244): drawn (#fbdcc8 vs #35312d without units)
  PASS depth.crisp_nearest - 33792 opaque samples, 0 colour(s) not in the 53-colour source set; smooth false, baseTexture scaleMode 0 (0 nearest, 1 linear), sprite texture is the bitmap's, plane at (-24,-24)
  PASS depth.parallax_bounded - edge shift measured depth 1 0 px, depth 2 0 px (want 0); a pan of 2 tiles moved a low-ground point on depth 1 from x 624 to 528 (-96 px, want -96); the point under the centre stays at x 408; display back at 175.5 (was 175.5)
  PASS depth.tunables_take_effect - maxDepth 1 [1:1 2:-] void true; maxDepth 2 [1:1 2:0]; enabled false [1:- 2:-] void false; enabled true [1:1 2:0] void true
  PASS depth.no_filters_any_state - maxDepth 1: none; maxDepth 2: none; off: none; on: none; entities off: none; entities on: none
  PASS depth.one_level_below - maxDepth 1: depth 1 level 1, depth 2 hidden, void shown
  PASS depth.void_beyond - low ground (188,186) at screen (624,432): planes render #08080c/255, screen #08080c, void #08080c
  PASS depth.no_blends - 0 of 33792 sampled pixels are blends (want 0)
  PASS depth.flat_transform - depth 1 scale 1 at (-24,-24) filters [] entities [] alpha 1; depth 2 scale 1 at (-24,-24) filters [] entities [] alpha 1; blur/colour filters in the subtree: none; active tilemap scale 1, filters none, alpha 1; terrace pixel #352d24, its source texel #352d24/255
  PASS depth.entities_inherit_treatment - unit sprite in the +1 plane: child of the plane, world scale 1 x 1, filters on it and its 3 container(s): none; tint #ffffff (the unit's own)
  PASS depth.visual_settings_no_physics - unchanged: {"unit":{"x":180,"y":182,"z":1},"shapeUnit":"floor","shapeChain":"open","walkChain":false,"walkUnit":true,"objects":1}
  PASS depth.config_deterministic - the same after maxDepth 1 / 0 / 2 and off / on: {"describe":"2 level(s) below, drawn 1:1 (DEC-011), void #08080c","planes":[{"z":1,"visible":true,"x":-24,"y":-24,"scale":1,"alpha":1,"filters":[]},{"z":0,"visible":true,"x":-24,"y":-24,"scale":1,"alpha":1,"filters":[]}]}
  PASS depth.planes_cost - sampled 2 x 60 frames per condition: planes off none shown in every frame, on both bound in every frame; reported, not gated: GL renderer "ANGLE (NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11 vs_5_0 ps_5_0)"; median engine tick (update + render submit): planes off 1.8 ms, on 2.3 ms (the planes +0.5 ms); median frame intervals off 14, on 19 ms; worst tick off 6.0, on 3.8 ms; this machine, nw.exe harness, simulation paused
  PASS depth.screenshots_written - depth.plus2_off.png 252504 B, depth.plus2_flat.png 113710 B, depth.plus1_off.png 199417 B, depth.plus1_flat.png 91772 B
  PASS depth.ground_draws_through_openings - view 0, depth 1 -> -1, depth 2 -> -2, void shown; floor ground cell (182,183) unchanged by the planes (its own art's lowest alpha 255); open cell (185,183) over the -2 floor draws #6d4d3d (planes #6d4d3d, -2 texels {#553d31 #6d4d3d}, -1 alpha 0; planes off #000000); open cell (183,183) over the -1 floor draws #6d4d3d (-1 texels {#553d31 #6d4d3d}; planes off #000000)
  PASS depth.entities_at_seam - view on +2 centred on (2,2), display (249.5,251.5) (wrapped); +1 plane level 1: item (1,1) drawn at (384,312); item (253,1) drawn at (192,312); item (1,253) drawn at (384,120); item (253,253) drawn at (192,120); wall face (254,4) drawn at (240,456); wall face (4,254) drawn at (528,168); unit (3,3) drawn at (480,408)
  PASS depth.canvases_freed - after 4 in-place level switches and 2 map transfer(s) (a new spriteset each): 4 canvas layers in use, 4 canvases made since boot, 0 destroyed, 0 pooled (want 4 / 4 / 0 / 0); at each new scene's start, view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]; view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]
  PASS depth.hotkey_free - keyMapper[118] (F7) is undefined: the preset hotkey is gone and the key is free
  PASS depth.no_errors - none
required checks: 27/27 PASS

RESULT: all required checks passed (exit 0)
DEPTH_EXIT:0
```

### `node tools/depth_demo/test_depth_demo.js` EXIT 0

```
RESULT: 28 passed, 0 failed, 28 mutants killed
DEMO_EXIT:0
```

### `node tools/layer_overlays/test_layer_overlays.js` EXIT 0

```
RESULT: 40 passed, 0 failed
OVERLAY_EXIT:0
```

### `node tools/check_deus_syntax.js` EXIT 0

```
Checked 60 DEUS plugin files. Errors: 0
SYNTAX:0
```

`node tools/test_layer_render_flat.js` (layers_flat, not a lane.json gate) also exited 0: 12/12, including `switch_same_frame` and `unit_step_same_frame`.

## `node tools/test_culling_native.js`

`DEUS_Culling.js` is unchanged. Both runs fail in the same place. Phase 1 is 10/10 on both. Phase 2 loads the save, then `founders_loaded` fails (founder ids 1..8 are not all present) and the suite throws on `founders[0].x`. That is the base behavior, not a change from this lane.

Base `ecc7b898` (throwaway clone, deleted): EXIT 1

```
PASS culling_native_phase1 ... RESULT: 10 passed, 0 failed (exit 0)
PASS culling_native_phase2.save_99_loaded
PASS culling_native_phase2.world_present
PASS culling_native_phase2.authoritative_units_count - count=1252
FAIL culling_native_phase2.founders_loaded - Found all 8 founder colonists in loaded world
FAIL culling_native_phase2.suite_completed - Cannot read property 'x' of undefined
RESULT: 3 passed, 2 failed (exit 1)
BASE_EXIT:1
```

Tip (this worktree): EXIT 1

```
PASS culling_native_phase1 ... RESULT: 10 passed, 0 failed (exit 0)
PASS culling_native_phase2.save_99_loaded
PASS culling_native_phase2.world_present
PASS culling_native_phase2.authoritative_units_count - count=1181
FAIL culling_native_phase2.founders_loaded - Found all 8 founder colonists in loaded world
FAIL culling_native_phase2.suite_completed - Cannot read property 'x' of undefined
RESULT: 3 passed, 2 failed (exit 1)
TIP_EXIT:1
```

## Follow-ups

`PROPOSED-BE-01`, `PROPOSED-BE-02`, `PROPOSED-BE-03` are in the system note. No WBS ids were minted.
