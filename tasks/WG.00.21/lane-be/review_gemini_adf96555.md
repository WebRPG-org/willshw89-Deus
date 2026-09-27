# Independent Gemini review — WG.00.21 / lane-be

Review date: 2026-09-27.
Writer: Grok (grok-4.7 xhigh).
Reviewer: Gemini (independent AI family, non-author).
Exact reviewed writer commit: `adf96555e44fe89ac9108f48780b9099e94ac1ca`.
Branch: `task/lane-be`.
Implementation was not edited, merged, pushed, or self-certified.

## Identity and scope

Observed before writing this review:
- `git branch --show-current`: `task/lane-be`
- `git rev-parse adf96555e44fe89ac9108f48780b9099e94ac1ca`: `adf96555e44fe89ac9108f48780b9099e94ac1ca`
- `git show -s --format=fuller adf96555`:
  - Author: deus-grok
  - Commit: `adf96555e44fe89ac9108f48780b9099e94ac1ca`
  - Subject: `[grok] WG.00.21 close covered paint, cliffs, and stale lower sprites`
- Merge base with `origin/main` (`ecc7b8984a0ab1a919595c792f98a60f18872f73`): `ecc7b8984a0ab1a919595c792f98a60f18872f73` (matches declared base in BRIEF.md).

All paths in `git diff --name-only ecc7b8984a0ab1a919595c792f98a60f18872f73 adf96555e44fe89ac9108f48780b9099e94ac1ca` were verified against `lane.json` allowedPaths:

| Path | Matching allowedPaths entry | In Scope |
|---|---|---|
| `docs/systems/DEUS_OcclusionCulling.md` | `docs/systems/DEUS_OcclusionCulling.md` | Yes |
| `game/js/plugins/DEUS_Depth.js` | `game/js/plugins/DEUS_Depth.js` | Yes |
| `tasks/WG.00.21/lane-be/BRIEF.md` | `tasks/WG.00.21/**` | Yes |
| `tasks/WG.00.21/lane-be/REPORT.md` | `tasks/WG.00.21/**` | Yes |
| `tasks/WG.00.21/lane-be/evidence/base_frame.png` | `tasks/WG.00.21/**` | Yes |
| `tasks/WG.00.21/lane-be/evidence/equality.json` | `tasks/WG.00.21/**` | Yes |
| `tasks/WG.00.21/lane-be/evidence/tip_frame.png` | `tasks/WG.00.21/**` | Yes |
| `tasks/WG.00.21/lane-be/lane.json` | `tasks/WG.00.21/**` | Yes |
| `tasks/WG.00.21/lane-be/launches/20260927_164900_prompt.txt` | `tasks/WG.00.21/**` | Yes |
| `tasks/WG.00.21/lane-be/review_codex_87f4e4ee.md` | `tasks/WG.00.21/**` | Yes |
| `tools/occlusion/bench_occlusion.js` | `tools/occlusion/**` | Yes |
| `tools/occlusion/compare_planes.js` | `tools/occlusion/**` | Yes |
| `tools/occlusion/live_occlusion.js` | `tools/occlusion/**` | Yes |
| `tools/occlusion/test_occlusion_culling.js` | `tools/occlusion/**` | Yes |

No art or audio assets were generated or modified. No files in `art/**`, `game/img/**`, or `game/audio/**` were touched. The evidence PNG files (`base_frame.png`, `tip_frame.png`) are automated test-harness render comparisons permitted by BRIEF.md. DEC-007 is satisfied. `DEUS_Culling.js` and engine core files are untouched.

## Evaluation against acceptance requirements and prior review (Codex 87f4e4ee)

### 1. Covered cells not painted or retained as stale lower-layer sprites (M1 Closure)
- In `game/js/plugins/DEUS_Depth.js`, `updatePlanes` binds `plane.bind(..., (mx, my) => !self.cellExposed(z, mx, my))`. Covered cells return `false` for `cellExposed`, which sets `skipCell = true`, preventing lower plane tile painting. Verified via `mask_order` in `test_layer_render_flat.js` where covered ground texel alpha is confirmed 0 (`ground under it not painted`).
- In `Sprite_DepthPlane.prototype.seeUnit`, units on covered cells (`this._ocRoot.cellCovered(z, u.x, u.y)`) are skipped; `endScan` releases any previously allocated sprites whose stamp was not updated.
- In `rebuildItems` and `rebuildWalls`, candidate searches operate strictly on exposed rectangular runs (`exposurePieces`), skipping covered cells and avoiding full window walks.
- Cliff faces: `rebuildWalls` filters out covered walls and connector cells. Re-running Codex's live-method probe against actual methods yielded `coveredWallSprites=0 expected=0`.
- Entity window margin: `cellCovered` classifies margin columns outside the camera walk directly via `columnOpenTo` without full scans, ensuring covered margin units are not retained.

### 2. Intermediate cover mutations and dirtying lower planes (M2 Closure)
- `Sprite_DepthRoot.prototype.shapeChanged` now invokes `this.invalidateBelow(z)`, refreshing all active lower planes (`_entityDirty = true`, `_objectLayer.markDirty(false)`, `_tilemap.refresh()`).
- `noteExposureChange(plan)` invalidates all lower planes when the exposed set changes (e.g. closing or reopening a column while camera is stationary).
- Re-running Codex's live-method probe confirmed `upperShapeChanged lowerRebuilds=1 lowerPlacements=1 expectedRebuilds>0`.
- The live integration check `cover_reopen` verified closing an upper shaft drops the lower item and reopening restores it while an adjacent shaft stays exposed with camera stationary.

### 3. Production-path testing and live provocations (M3 Closure)
- `tools/occlusion/test_occlusion_culling.js` now executes both the planner unit checks and `tools/occlusion/live_occlusion.js`, which launches a disposable NW.js game runtime running actual tilemaps, sprites, and `DEUS_LayerOverlays`.
- All five provocations (`covered_not_drawn`, `exposed_drawn`, `cost_proportional`, `no_full_scan`, `switch_and_pan`) are verified both headlessly and through live mutants (`live_mutants` check in `live_occlusion.js`).

### 4. Base/tip frame and plane equality (M4 Closure)
- `tools/occlusion/compare_planes.js` runs identical fixture scenes at seed `20260927` on base (`ecc7b898`) and tip (`adf96555`), capturing crops (`432x336`) of the combined tile and plane render.
- Crop hashes are identical (`64918904`). Exposed texels match (`hole-floor`: `#352d24/255`, `shaft-floor`: `#71864d/255`).
- The evidence images `tasks/WG.00.21/lane-be/evidence/base_frame.png` and `tip_frame.png` were opened and inspected. Their SHA256 hashes match byte-for-byte: `f3ae8aada6a147a6ba096fe878a99980b13a47b780e50e6cef0bcb36e8b47496`.
- Result: `EQUAL_FRAME true`, `EQUAL_EXPOSED true`.

### 5. Stress-scene benchmark and work scaling (M5 Closure)
- `tools/occlusion/bench_occlusion.js` executes a 30-second solid stress test (~1900 frames) followed by an 8-second open shaft test on both legacy (5 layers) and default (32 layers) with fixed seed `20260927`.
- Steady frames under solid cover perform 0 visits, 0 level visits, 0 tile paints, and 0 sprite touches in both 5-layer and 32-layer configurations.
- Measured solid frame interval medians: legacy `15.735 ms`, default `15.800 ms` (gap: 0.065 ms, well within the 3 ms / 20% tolerance).
- Open scene with 2 exposed cells paints 1 spot in a 570-cell window and tracks 1 visible sprite in both configurations. Deep unit (z=-3) on 32-layer world is confirmed not exposed and has 0 sprites.

## Visual evidence inspected

Reviewer opened and inspected both evidence images:
- `tasks/WG.00.21/lane-be/evidence/base_frame.png`
- `tasks/WG.00.21/lane-be/evidence/tip_frame.png`

Visual content: A solid textured stone surface with an outer test boundary rectangle. In the center, a 2-cell opening exposes lower levels: the left cell shows green grass ground from level 0 (shaft floor), and the right cell shows a brown/dark stone floor from level 1 (hole floor). Below it, another two-cell opening reveals green ground tiles. The base and tip images are completely indistinguishable and verified bit-identical.

## Independent gate execution results

All commands were independently executed from the unchanged worktree at writer tip `adf96555`.

### 1. `node tools/check_deus_syntax.js`
- Command: `node tools/check_deus_syntax.js`
- Exit: 0
- Output:
```text
Checked 60 DEUS plugin files. Errors: 0
```

### 2. `node tools/occlusion/test_occlusion_culling.js`
- Command: `node tools/occlusion/test_occlusion_culling.js`
- Exit: 0
- Output:
```text
PASS covered_not_drawn
PASS exposed_drawn
PASS cost_proportional
PASS no_full_scan
PASS switch_and_pan
PLANNER: 5 passed, 0 failed
Running --deus-test=occlusion_live on C:\Users\snewt\AppData\Local\Temp\deus_occlusion_live_BFsKgv\game
UF_Test run 2026-09-27T22:51:12.756Z args=[]
HARNESS New Game year 0 (requested 0)
DEBUG_SHEET: Scene_Boot.start called
AVAILABLE SUITES: selftest, smoke, perf, native_starting_gear, native_survival_dying, native_perf_4x_benchmark, occlusion_live, select, minimap, natural_connections, ownership, ecology, projects, settlement, colonists, overseer, world, spawn, worldgen, biomes, tiles, ground, factions, skins, history, objects, walls, doors, items, jobs, floors, wildlife, wildlife_seeds, stance, combat, anim, fog, daynight, timespeed, camera, culling, speech, overhead, look, sheet, talk, fire, vertical, natural_walls, flooding, strata, environment, faction_menus, title, load, setup, depth, layers_flat, select
SUITE occlusion_live
PASS occlusion_live.boot - maxDepth 2 view 2 seed 20260927 center 176,176
PASS occlusion_live.viewport_covered - 572 solid, 0 refused, exposed 0
PASS occlusion_live.covered_not_drawn - covered sprites absent; margin (187,176)/(187,177) inside window true outside the camera walk true
PASS occlusion_live.exposed_drawn - exposed unit, object, item and ramp are on the planes at 1:1
PASS occlusion_live.live_paint - paint spots match the exposed opaque cells
PASS occlusion_live.live_effects - exposed bar and one spell; covered bar absent
PASS occlusion_live.no_full_scan - steady visits 0 fullScans 0
PASS occlusion_live.cover_reopen - closed true reopened true display 167.5
PASS occlusion_live.live_mutants - each live guard failed its check when provoked
PASS occlusion_live.switch_and_pan - before true after pan false after view false
RESULT: 10 passed, 0 failed (exit 0)
RESULT: 5 passed, 0 failed
```

### 3. `node tools/occlusion/test_occlusion_culling.js --provoke-all`
- Command: `node tools/occlusion/test_occlusion_culling.js --provoke-all`
- Exit: 0
- Output:
```text
CAUGHT covered_not_drawn: covered-unit updates 3 rendered true; covered-object updates 3 rendered true; covered-item updates 3 rendered true; covered-wall updates 3 rendered true; covered-ramp updates 3 rendered true; covered-effect updates 3 rendered true; deep-unit updates 3 rendered true
CAUGHT exposed_drawn: drew 0 want 6; missing exposed-unit; missing exposed-object; missing exposed-item; missing exposed-wall; missing exposed-ramp; missing exposed-effect
CAUGHT cost_proportional: 32-layer visits 7616 vs 5-layer 1190; solid level visits 7378 / 952; solid exposed 7616; visits 7616 want the bounds 238 not the map; maxDepth 32 on solid visited 7616 / levels 7378; fullScans 1
CAUGHT no_full_scan: second frame visits 4096 fullScans 1 rebuilt true; third frame visits 4096
CAUGHT switch_and_pan: still updated after the cover closed (2); still updated after the pan (3); still updated after the view moved above it (3)
RESULT: 5 provocations caught, 0 missed
```

### 4. `node tools/test_layer_render_flat.js --suite depth`
- Command: `node tools/test_layer_render_flat.js --suite depth`
- Exit: 0
- Output:
```text
=== DEUS_Depth suite "depth" (WG.00.09b Lane K) ===
run: RESULT: 27 passed, 0 failed (exit 0) in 36.0 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26556_1790549494790 (deleted)
  PASS depth.preconditions - world true, levels true, view 0, surface grid true, screen 816x624, world seed 2067064504
  PASS depth.proof_scene - fixture scene centred at (184,184) in area (0,0), world seed 2067064504: 144 columns x 5 levels (519 cell(s) written, 201 already as specified), 134 ground tile(s) set (meadow, tile 2816), 50 object(s) cleared, 4847 ms; 0 refused, 0 cell(s) not as specified; hole (179,181), deck 3 cells from (182,182)
  PASS depth.planes_present - view 2; depth 1 -> level 1, 2 paint(s), 38839 opaque samples; depth 2 -> level 0, 2 paint(s), 42282 opaque samples; last paint 2.1 ms, last peek 0.0 ms
  PASS depth.repaint_cost - 4 of 4 refreshes of one 912x720 plane repainted it by the next frame; repaint times 2.1 / 1.7 / 2.5 / 1.6 / 1.1 ms (reported, not gated: wall-clock time, this machine, nw.exe harness)
  PASS depth.projection_origin - centre -> (408,312) want (408,312); left edge -> (0,312) want (0,312) (identity, DEC-011); plane scale 1
  PASS depth.exposure_by_upper_geometry - floor cell (188,181) unchanged by the planes; open cell (181,180) shows the level below
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26556_1790549494790\test_output\depth.planes_only_plus2.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26556_1790549494790\test_output\depth.planes_only_plus2_tiles.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26556_1790549494790\test_output\depth.canvas_depth1.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26556_1790549494790\test_output\depth.canvas_depth2.png
  PASS depth.mask_order - deck cell (183,182) at screen (384,240): drawn #d89a55, depth 1 texels {#351d16 #492a19 #d89a55 #8e4d30}, ground under it not painted
  PASS depth.depth2_through_depth1 - low ground (188,186) at screen (624,432): drawn #71864d/255, ground texel #71864d/255, ground texels {#71864d}, depth 1 alpha there 0; under the hole (179,181) the ground draws #71864d/255 (tiles 2816/0/0)
  PASS depth.entities_drawn - fixtures: oak placed at (177,180), item stone x3 at (178,181), unit added; +1 plane draws 1 object(s), 1 unit(s), 1 item stack(s), 0 wall/ramp frame(s); covered summit cliff not drawn; item sheet !$UF_Item_Stone ready true, tracked by the plane true, visible true; unit at (180,182) probed at screen (240,244): drawn (#fbdcc8 vs #35312d without units)
  PASS depth.crisp_nearest - 53504 opaque samples, 0 colour(s) not in the 51-colour source set; smooth false, baseTexture scaleMode 0 (0 nearest, 1 linear), sprite texture is the bitmap's, plane at (-24,-24)
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
  PASS depth.planes_cost - sampled 2 x 60 frames per condition: planes off none shown in every frame, on both bound in every frame; reported, not gated: GL renderer "ANGLE (NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11 vs_5_0 ps_5_0)"; median engine tick (update + render submit): planes off 1.6 ms, on 1.9 ms (the planes +0.4 ms); median frame intervals off 16, on 16 ms; worst tick off 2.8, on 3.4 ms; this machine, nw.exe harness, simulation paused
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26556_1790549494790\test_output\depth.plus2_off.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26556_1790549494790\test_output\depth.plus2_flat.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26556_1790549494790\test_output\depth.plus1_off.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26556_1790549494790\test_output\depth.plus1_flat.png
  PASS depth.screenshots_written - depth.plus2_off.png 294385 B, depth.plus2_flat.png 107664 B, depth.plus1_off.png 258478 B, depth.plus1_flat.png 109410 B
  PASS depth.ground_draws_through_openings - view 0, depth 1 -> -1, depth 2 -> -2, void shown; floor ground cell (182,183) unchanged by the planes (its own art's lowest alpha 255); open cell (185,183) over the -2 floor draws #6d4d3d (planes #6d4d3d, -2 texels {#553d31 #6d4d3d}, -1 alpha 0; planes off #000000); open cell (183,183) over the -1 floor draws #6d4d3d (-1 texels {#553d31 #6d4d3d}; planes off #000000)
  PASS depth.entities_at_seam - view on +2 centred on (2,2), display (249.5,251.5) (wrapped); +1 plane level 1: item (1,1) drawn at (384,312); item (253,1) drawn at (192,312); item (1,253) drawn at (384,120); item (253,253) drawn at (192,120); unit (3,3) drawn at (480,408); covered wall (254,4) not drawn; covered wall (4,254) not drawn
  PASS depth.canvases_freed - after 4 in-place level switches and 2 map transfer(s) (a new spriteset each): 4 canvas layers in use, 4 canvases made since boot, 0 destroyed, 0 pooled (want 4 / 4 / 0 / 0); at each new scene's start, view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]; view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]
  PASS depth.hotkey_free - keyMapper[118] (F7) is undefined: the preset hotkey is gone and the key is free
  PASS depth.no_errors - none
required checks: 27/27 PASS

RESULT: all required checks passed (exit 0)
```

### 5. `node tools/depth_demo/test_depth_demo.js`
- Command: `node tools/depth_demo/test_depth_demo.js`
- Exit: 0
- Result: 28 passed, 0 failed, 28 mutants killed

### 6. `node tools/layer_overlays/test_layer_overlays.js`
- Command: `node tools/layer_overlays/test_layer_overlays.js`
- Exit: 0
- Result: 40 passed, 0 failed

### 7. `node tools/occlusion/bench_occlusion.js`
- Command: `node tools/occlusion/bench_occlusion.js`
- Exit: 0
- Output excerpt:
```text
SUMMARY legacy {"range":"legacy","seed":20260927,"levels":5,"z":{"zMin":-2,"zMax":2},"maxDepth":2,"steadyVisits":0,"steadyLevels":0,"steadyPaint":0,"steadyTouch":0,"steadyN":1905,"steadyVisible":0,"gapMedian":15.735000000859145,"gapAvg":15.748435695537395,"gapWorst":32.110000000102445,"tickMedian":1.7100000004575122,"tickAvg":1.8141811023315193,"tickWorst":4.600000000209548,"updateMsMedian":0.025000001187436283,"panLevels":0,"panPaint":0,"panVisits":396,"openExposed":2,"openSpots":1,"openWindow":570,"openVisible":1,"openGapMedian":15.804999999090796,"openGapAvg":15.803648915184128,"openGapWorst":31.569999999192078,"exposedSprite":true,"coveredSprite":false,"deepExposed":null,"deepSprite":false}
SUMMARY default {"range":"default","seed":20260927,"levels":32,"z":{"zMin":-16,"zMax":15},"maxDepth":2,"steadyVisits":0,"steadyLevels":0,"steadyPaint":0,"steadyTouch":0,"steadyN":1898,"steadyVisible":0,"gapMedian":15.800000001036096,"gapAvg":15.814423076922997,"gapWorst":33.550000000104774,"tickMedian":1.6649999997753184,"tickAvg":1.7779109589043887,"tickWorst":6.01000000096974,"updateMsMedian":0.024999997549457476,"panLevels":0,"panPaint":0,"panVisits":396,"openExposed":2,"openSpots":1,"openWindow":570,"openVisible":1,"openGapMedian":15.809999997145496,"openGapAvg":15.838241106717515,"openGapWorst":32.28999999919324,"exposedSprite":true,"coveredSprite":false,"deepExposed":false,"deepSprite":false}
COMPARE gapMedian 15.735000000859145 vs 15.800000001036096 avg 15.748435695537395 vs 15.814423076922997 worst 32.110000000102445 vs 33.550000000104774; openGap 15.804999999090796 vs 15.809999997145496; spots 1 vs 1 visible 1 vs 1; updateMs 0.025000001187436283 vs 0.024999997549457476 (not the acceptance); counts equal; frame time within tolerance
```

### 8. `node tools/occlusion/compare_planes.js`
- Command: `node tools/occlusion/compare_planes.js`
- Exit: 0
- Output excerpt:
```text
EQUAL {"seed":20260927,"center":{"x":176,"y":176},"frameHash":64918904,"crop":{"hash":64918904,"x":216,"y":168,"w":432,"h":336},"width":816,"height":624,"exposed":[{"name":"hole-floor","z":1,"x":177,"y":176,"texel":{"color":"#352d24","alpha":255}},{"name":"shaft-floor","z":0,"x":176,"y":176,"texel":{"color":"#71864d","alpha":255}}],"png":"C:\\Users\\snewt\\AppData\\Local\\Temp\\deus_occlusion_equal_ZZv9U6\\base\\game\\test_output\\equal_frame.png"}
EQUAL_FRAME true EQUAL_EXPOSED true
```

### 9. `node tools/test_culling_native.js`
- Command: `node tools/test_culling_native.js`
- Exit: 1 (Phase 1 10/10 passed; Phase 2 fails on `founders_loaded` and throws on `founders[0].x`). Confirmed identical failure on merge-base (`ecc7b898`) and tip (`adf96555`). Pre-existing baseline test limitation outside lane scope.

### 10. `node tools/test_layer_render_flat.js` (Lane K extra suite)
- Command: `node tools/test_layer_render_flat.js`
- Exit: 0
- Result: 12 passed, 0 failed.

## Findings

### BLOCKER
None.

### MAJOR
None. All 5 findings (M1–M5) from the previous Codex review of `87f4e4ee` have been closed and empirically verified on `adf96555`.

### MINOR

#### MINOR 1 — Pre-existing `test_culling_native.js` Phase 2 failure
- Evidence: `node tools/test_culling_native.js` fails Phase 2 on `culling_native_phase2.founders_loaded` and throws on `founders[0].x` at both base commit `ecc7b898` and writer tip `adf96555`.
- Evaluation: `DEUS_Culling.js` was not modified in this lane. The failure is identical on base and tip, confirming no regression from this task.

#### MINOR 2 — Intermittent 1-frame timing jitter in un-gated `layers_flat` test
- Evidence: Running the non-gated default suite `node tools/test_layer_render_flat.js` under heavy concurrent machine load produced one run where `unit_step_same_frame` timed out by 1 tick (17 ticks vs 16 tick bound). Subsequent runs passed 12/12 cleanly. The required gate in `lane.json` (`--suite depth`) passed 27/27 on every run.

VERDICT: CLEAN PASS
