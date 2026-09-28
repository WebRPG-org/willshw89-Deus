# Independent Codex review — WG.00.21 / lane-be

Review date: 2026-09-27. Writer: Grok. Reviewer: Codex (independent AI family).
Reviewed writer commit: **87f4e4ee8ce1d8f21fa316f5ba8fe6aaabbd8137**.
Branch: `task/lane-be`. Implementation was not edited or merged.

## Identity and scope

Observed before writing this file:
- `git branch --show-current`: `task/lane-be`.
- `git rev-parse HEAD`: `87f4e4ee8ce1d8f21fa316f5ba8fe6aaabbd8137`.
- `git show -s --format=fuller 87f4e4ee8ce1d8f21fa316f5ba8fe6aaabbd8137`: existing commit, author/committer deus-grok, subject `[grok] WG.00.21 stop draw work at the first opaque surface`.
- `git fetch origin main task/lane-be`: exit 0. Fetched `origin/main` is `6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0`; `origin/task/lane-be` equals the full reviewed hash.
- `git merge-base origin/main 87f4e4ee8ce1d8f21fa316f5ba8fe6aaabbd8137`: `ecc7b8984a0ab1a919595c792f98a60f18872f73`. This equals the brief's declared base.
- Range contains the PM brief/lane commit `1c4452f84e2070267766d3be3abfee2a8dfe2418` and the writer commit. The reviewed hash was both local HEAD and remote branch tip.
- `git diff --check ecc7b898 87f4e4ee`: exit 0.
- Initial worktree had only untracked `tasks/WG.00.21/lane-be/launches/`; those files were left alone.

Every path from `git diff --name-only <merge-base> <writer-hash>` was checked against the actual lane.json (exact matches or prefix for /**). All seven match:

| Changed path | Matching allowedPaths entry | Review |
|---|---|---|
| docs/systems/DEUS_OcclusionCulling.md | exact path | Rule, exceptions, counters, benchmarks, proposals read |
| game/js/plugins/DEUS_Depth.js | exact path | Planner, live render integration, entity lifecycle, paint/masks, inherited checks reviewed |
| tasks/WG.00.21/lane-be/BRIEF.md | tasks/WG.00.21/** | Requirements read |
| tasks/WG.00.21/lane-be/REPORT.md | tasks/WG.00.21/** | Writer evidence and limitations read |
| tasks/WG.00.21/lane-be/lane.json | tasks/WG.00.21/** | Scope and all five gates read |
| tools/occlusion/bench_occlusion.js | tools/occlusion/** | Runtime fixture, counters, timing and cleanup read and run |
| tools/occlusion/test_occlusion_culling.js | tools/occlusion/** | All checks, oracle, wiring and provocations read and run |

Scope checker stdout:
```text
IN_SCOPE docs/systems/DEUS_OcclusionCulling.md => docs/systems/DEUS_OcclusionCulling.md
IN_SCOPE game/js/plugins/DEUS_Depth.js => game/js/plugins/DEUS_Depth.js
IN_SCOPE tasks/WG.00.21/lane-be/BRIEF.md => tasks/WG.00.21/**
IN_SCOPE tasks/WG.00.21/lane-be/REPORT.md => tasks/WG.00.21/**
IN_SCOPE tasks/WG.00.21/lane-be/lane.json => tasks/WG.00.21/**
IN_SCOPE tools/occlusion/bench_occlusion.js => tools/occlusion/**
IN_SCOPE tools/occlusion/test_occlusion_culling.js => tools/occlusion/**
EXIT=0
```

No asset/art/audio file is changed in the range. No generator, art prompt or new art integration was found in the changed code. Review runs used existing assets and permitted test-harness PNG renders. **NO ART: satisfied.** DEUS_Culling.js and engine core are unchanged.

The task-specific restriction to this review file overrides generic STATUS claims and VISION decision-log edits. Neither was edited. Existing A9 transparent ground-art findings and A10 cave-generation findings remain outside this review's implementation scope; fixture tiles are used by the depth checks.

## Acceptance assessment

| Requirement | Assessment |
|---|---|
| First opaque surface, all intermediate levels open | Planner correctly adds the first lower opaque cell and stops before deeper cells; cap and z bounds are enforced. Live tiles/cliff sprites do not consistently obey this rule (M1). |
| Covered units/objects/items/ramps/effects neither created nor updated | Unit/item/object guards apply inside walked camera columns. Cliff faces deliberately bypass the rule; lower entity caches are not invalidated by intermediate cover changes; outside-walk fallback retains covered sprites (M1/M2). Effect behavior is mostly inherited overlay logic, not exercised by the new live occlusion test (M3). |
| Exposed-area paint and sprite bound | Not met: whole plane paints, whole entity-window queries, covered cliffs, and all bound-level unit candidates remain (M1). Benchmark's two-cell opening causes 125/287 sprite touches per sampled frame. |
| Change-driven, no per-frame full-grid scan | Planner caches by floored bounds/view/shape stamp and steady visits are zero. This does not bound total live sprite or candidate work. Existing full-world candidate rebuild every 60 frames remains. No newly added per-frame whole-map walk on the normal path observed. |
| MaxDepth unchanged and extensibility documented | Met: parameter default/clamp and two planes stay 2; planner can accept more depth; need for extra planes documented. |
| Flat 1:1 / no blur, scale, parallax, alpha or tint shading | Existing depth and flat-render suites pass, including positions, source colours, filters and seams. Exposed ordinary fixtures look crisp in opened screenshots. Exact base-versus-tip frame/plane equality proof is missing (M4). |
| 32 vs 5 solid + open benchmark | Reproduced exit 0; equal solid counters, 396 pan visits each. This is a short depth-update microbenchmark, not the required stress frame-time proof (M5). |
| New tests and each provocation able to fail | Five headless checks pass and five provocations are caught, but they exercise a surrogate entity step rather than live plane behavior (M3). |
| All five lane gates | Independently rerun at the exact writer tip, exit 0 each; raw output below. |
| Native culling base/tip nonregression | Independently run on merge base and tip: both exit 1 at founders_loaded / suite_completed; phase 1 is 10/10 both. Same observed failure, not an all-green regression result. |
| System note/API/counters/open questions/proposals | Present. Explicit deferrals PROPOSED-BE-01/-03 are required current scope, not optional follow-ups. |
| Independent review / DONE | This is Codex's independent review. Gemini gate/PM status transition and Owner approval are not performed by this review. |
| RMMZ F5/F8 Definition of Done | Native NW.js harnesses run; actual editor F5 and manual F8 were not run. No writer editor evidence is supplied in this lane. No completion claim made. |

## Findings

### BLOCKER

None identified.

### MAJOR M1 — Live covered paint/cliff work violates the required first-surface and exposed-area bound

Evidence: DEUS_Depth.js:452–463, 932–957, 1064–1094, 1273–1289, 1396–1399, 1429–1472; system note:26–40 and 119–121.

Plane binding gives skipCell only its own level's open cells. With one exposed lower cell, updatePlane still runs the stock whole-window paint. A covered depth-2 tile under a depth-1 floor is intentionally painted; the first-opaque stop exists in the planner, not the tile paint path. The writer explicitly preserves that work to satisfy an older internal-canvas assertion. The brief does not grant that exception and requires conflicts outside scope to be escalated.

Natural cliff sprites have no cellCovered guard at all: rebuildWalls takes every returned face, allocates/retains it, then placeEntities places it each frame. A focused invocation of the actual rebuildWalls method with cellCovered always true created one covered wall sprite. The reproduced runtime benchmark exposed exactly two cells but recorded 287 touches per sampled open frame in legacy and 125 in default. Solid steady frames were zero, so the new whole-plane early exit helps completely covered viewports but does not satisfy mixed-view bounds.

cellCovered also returns false outside walked columns. The wider entity window therefore retains covered units/items/objects/ramps beyond UF.Culling bounds, and scanUnits continues to walk the entire bound-level candidate list even when exposure is zero. The extra flat suite reports 738 candidates tested per frame against 1250 world units. This is independent of exposed screen area.

Required closure: enforce the occlusion rule in live paint/sprite/query work, including cliffs and margins, or obtain a direct scope ruling; prove mixed/open scenes with actual paint, allocation, update and render counts. The review supplies no implementation fix.

### MAJOR M2 — Intermediate cover mutations do not invalidate lower-plane item/object/ramp membership

Evidence: DEUS_Depth.js:873–892, 1333–1381, 1505–1511, 1573–1576.

Example: view +2, +2 open at two columns; +1 open at column A above an item/object/ramp at z0 and remains open at column B. Close +1 at A without panning. openStamp does not change while +1 still has other openings. updateExposure rebuilds the exposed set, but does not dirty entity caches. shapeChanged refreshes only the plane matching changed z (+1), not the affected z0 plane. The z0 item's/ramp's retained sprite is placed by placeEntities until a later rebuild/300-frame safety net. Objects have a separate dirty path and also do not receive this upper-cover invalidation. Reopening a previously hidden A similarly need not create the lower item/object immediately. With some z0 exposure left, the n===0 whole-plane clearing does not resolve it.

A source-method probe called actual shapeChanged({z:1}) followed by actual z0 updateEntities with unchanged window and clean flags: lowerRebuilds=0, lowerPlacements=1. This is isolated method evidence, not a claim of an observed full-game screen leak; masking may hide some pixels, but hidden sprite updates and missing newly exposed content still violate scope.

Required closure: dirty all affected lower entity memberships when exposure changes; test both closing and reopening one column while another stays exposed, without camera movement.

### MAJOR M3 — New occlusion checks certify a surrogate entity implementation

Evidence: DEUS_Depth.js:261–302 versus live methods:647–720, 835–868, 873–978; test_occlusion_culling.js:97–125, 192–228, 239–249.

O.step increments fake records and returns literal scale=1, alpha=1, filters=null. The live renderer never calls step; it only shares plan. Headless covered-wall assertions pass although the live wall method demonstrably creates a covered wall. Fake effects are not real LayerOverlays. The wiring checks are substring searches. All five provocations change the planner/surrogate branch; they do not establish that breaking actual wall/item/object/paint/overlay integration fails a gate.

Required closure: integration checks against actual planes, sprites and renderer counters, with mutations of each live guard/dirty path. Keep the planner unit tests, but do not treat them as proof of live behavior.

### MAJOR M4 — Required base/tip pixel-identical or plane-identical proof is absent

Evidence: BRIEF scope 4; REPORT gate evidence; DEUS_Depth.js depth suite and screenshots.

The existing suites compare selected texels/transforms to source assets and compare plane enabled/disabled states at one tip. They do not compare the writer tip against the merge-base implementation. REPORT supplies no preserved paired base/tip images, plane digest, deterministic same-scene comparison or equality result. The tracked task subtree contains only BRIEF, lane.json and REPORT, with no writer screenshot/raw-evidence files. The writer's temporary snapshots were deleted.

The reviewer opened new tip screenshots and the sampled ordinary fixtures are crisp, but this is not the explicitly requested equality proof. Random seeds/fixture centres differed across runs; no base/tip equality is claimed here.

Required closure: reproducible same-seed, same-fixture base/tip comparison of exposed frame pixels or relevant plane contents, with retained raw equality result and inspected images.

### MAJOR M5 — Benchmark cannot establish the required stress-scene frame-time equivalence

Evidence: bench_occlusion.js:101–120, 123, 147, 245–270; system note:68–94.

The measured ms field is Depth.stats().lastUpdateMs, which omits frame rendering, render submission and GPU work. Only eight solid frames, eight pan frames and six open frames are sampled, with one pair of fresh launches and no fixed seed. The open path's sprite touches are printed but never compared/asserted. The 2 ms absolute tolerance is about 15–20 times this review's 0.10–0.13 ms solid medians, and could permit a large relative increase. The pan median is dominated by steady frames after the single pan, not the rebuild frame. No 30-second average/worst frame-time stress measurement, machine/visible-unit inventory or exposure sweep is supplied.

The rerun supports only equal solid counters and a short depth-update measurement at MaxDepth 2. It does not substantiate total 32-layer stress scene frame cost being approximately 5-layer cost or the open-area work bound.

Required closure: actual frame-time stress measurement with fixed scene/seed, duration and average/worst/visible unit counts, plus appropriate tolerance and mixed-view paint/sprite counts. Keep microbenchmark claims limited to measured scope.

### MINOR

No separate minor finding is needed. Existing native culling founder failure is recorded as a pre-existing limitation, not attributed to this commit.

## Focused live-method probe

Command: the following PowerShell here-string piped to `node`, followed by `Write-Output "EXIT=$LASTEXITCODE"`. It reads actual method bodies without changing source files; small stubs isolate renderer control flow.

```javascript
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('game/js/plugins/DEUS_Depth.js','utf8');
function method(type,name) {
  const start=src.indexOf(type+'.prototype.'+name+' = function');
  const end=src.indexOf('\n    };',start)+7;
  return src.slice(start,end);
}
const ctx={Sprite_DepthPlane:function(){},Sprite_DepthRoot:function(){},
  config:{entities:{walls:true},entityRefreshFrames:300},
  World:()=>({state:{size:64}}),windowPieces:()=>[[0,0,4,4]],
  provoked:()=>false,Levels:()=>({}),stats:{entityRebuilds:0,itemRebuilds:0},
  Map,Set,console};
vm.createContext(ctx);
vm.runInContext(method('Sprite_DepthPlane','rebuildWalls')+'\n'
  +method('Sprite_DepthPlane','updateEntities')+'\n'
  +method('Sprite_DepthRoot','shapeChanged'),ctx);
const plane={level:{x:0,y:0,z:1},_ocRoot:{cellCovered:()=>true},
  _walls:new Map(),takeSprite:()=>({}),releaseSprite:()=>{}};
ctx.Sprite_DepthPlane.prototype.rebuildWalls.call(plane,{
  naturalWallCells:()=>[{x:3,y:3,code:1,mask:0}],
  naturalWallFrame:()=>({width:48,height:96})},{});
console.log('LIVE_METHOD coveredWallSprites='+plane._walls.size+' expected=0');
let rebuilds=0,placed=0;
const p={level:{z:0},map:{},_entityFrame:1,_entityDirty:false,
  _itemsDirty:false,_winDx:0,_winDy:0,rebuildItems:()=>rebuilds++,
  rebuildWalls:()=>rebuilds++,placeEntities:()=>placed++};
const root={viewZ:2,repaintMain:()=>{},
  refreshLevel:z=>{if(z===p.level.z)p._entityDirty=true;}};
ctx.Sprite_DepthRoot.prototype.shapeChanged.call(root,{z:1});
ctx.Sprite_DepthPlane.prototype.updateEntities.call(p,{dx:0,dy:0},0);
console.log('LIVE_METHOD upperShapeChanged lowerRebuilds='+rebuilds
  +' lowerPlacements='+placed+' expectedRebuilds>0');
```

Raw result (diagnostic process exit 0; printed mismatches are the evidence):
```text
LIVE_METHOD coveredWallSprites=1 expected=0
LIVE_METHOD upperShapeChanged lowerRebuilds=0 lowerPlacements=1 expectedRebuilds>0
EXIT=0
```

## Independent gate evidence

Commands were run from the writer worktree while HEAD remained the full reviewed hash. Each exact lane command was followed directly in PowerShell by `Write-Output "EXIT=$LASTEXITCODE"`. EXIT below is the Node process exit, not the enclosing shell's exit. No gate assertion was altered. The depth driver uses a disposable game snapshot and removes it; an additional --keep run was made to inspect images.

| Command | Node exit | Result |
|---|---:|---|
| node tools/occlusion/test_occlusion_culling.js | 0 | 5 passed |
| node tools/test_layer_render_flat.js --suite depth | 0 | 27 passed |
| node tools/depth_demo/test_depth_demo.js | 0 | 28 passed, 28 mutants killed |
| node tools/layer_overlays/test_layer_overlays.js | 0 | 40 passed |
| node tools/check_deus_syntax.js | 0 | 60 files, 0 errors |

Raw stdout/stderr from these executions follows. Machine timing results are limited to these harness runs.

### `node tools/occlusion/test_occlusion_culling.js`

```text
PASS covered_not_drawn
PASS exposed_drawn
PASS cost_proportional
PASS no_full_scan
PASS switch_and_pan
RESULT: 5 passed, 0 failed
EXIT=0
```

### `node tools/test_layer_render_flat.js --suite depth`

```text
=== DEUS_Depth suite "depth" (WG.00.09b Lane K) ===
run: RESULT: 27 passed, 0 failed (exit 0) in 55.3 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26632_1790536271578 (deleted)
  PASS depth.preconditions - world true, levels true, view 0, surface grid true, screen 816x624, world seed 479841348
  PASS depth.proof_scene - fixture scene centred at (192,176) in area (0,0), world seed 479841348: 144 columns x 5 levels (557 cell(s) written, 163 already as specified), 112 ground tile(s) set (meadow, tile 2816), 78 object(s) cleared, 6327 ms; 0 refused, 0 cell(s) not as specified; hole (187,173), deck 3 cells from (190,174)
  PASS depth.planes_present - view 2; depth 1 -> level 1, 2 paint(s), 52664 opaque samples; depth 2 -> level 0, 2 paint(s), 48501 opaque samples; last paint 6.1 ms, last peek 0.0 ms
  PASS depth.repaint_cost - 4 of 4 refreshes of one 912x720 plane repainted it by the next frame; repaint times 6.1 / 2.0 / 1.9 / 2.0 / 1.8 ms (reported, not gated: wall-clock time, this machine, nw.exe harness)
  PASS depth.projection_origin - centre -> (408,312) want (408,312); left edge -> (0,312) want (0,312) (identity, DEC-011); plane scale 1
  PASS depth.exposure_by_upper_geometry - floor cell (196,173) unchanged by the planes; open cell (189,172) shows the level below
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26632_1790536271578\test_output\depth.planes_only_plus2.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26632_1790536271578\test_output\depth.planes_only_plus2_tiles.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26632_1790536271578\test_output\depth.canvas_depth1.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26632_1790536271578\test_output\depth.canvas_depth2.png
  PASS depth.mask_order - deck cell (191,174) at screen (384,240): drawn #d89a55, depth 1 texels {#351d16 #492a19 #d89a55 #8e4d30}, ground texel under it #71864d/255
  PASS depth.depth2_through_depth1 - low ground (196,178) at screen (624,432): drawn #71864d/255, ground texel #71864d/255, ground texels {#71864d}, depth 1 alpha there 0; under the hole (187,173) the ground draws #71864d/255 (tiles 2816/0/0)
  PASS depth.entities_drawn - fixtures: oak placed at (185,172), item stone x3 at (186,173), unit added; +1 plane draws 1 object(s), 1 unit(s), 1 item stack(s), 10 wall/ramp frame(s); item sheet !$UF_Item_Stone ready true, tracked by the plane true, visible true; unit at (188,174) probed at screen (240,244): drawn (#fbdcc8 vs #35312d without units)
  PASS depth.crisp_nearest - 53504 opaque samples, 0 colour(s) not in the 65-colour source set; smooth false, baseTexture scaleMode 0 (0 nearest, 1 linear), sprite texture is the bitmap's, plane at (-24,-24)
  PASS depth.parallax_bounded - edge shift measured depth 1 0 px, depth 2 0 px (want 0); a pan of 2 tiles moved a low-ground point on depth 1 from x 624 to 528 (-96 px, want -96); the point under the centre stays at x 408; display back at 183.5 (was 183.5)
  PASS depth.tunables_take_effect - maxDepth 1 [1:1 2:-] void true; maxDepth 2 [1:1 2:0]; enabled false [1:- 2:-] void false; enabled true [1:1 2:0] void true
  PASS depth.no_filters_any_state - maxDepth 1: none; maxDepth 2: none; off: none; on: none; entities off: none; entities on: none
  PASS depth.one_level_below - maxDepth 1: depth 1 level 1, depth 2 hidden, void shown
  PASS depth.void_beyond - low ground (196,178) at screen (624,432): planes render #08080c/255, screen #08080c, void #08080c
  PASS depth.no_blends - 0 of 53504 sampled pixels are blends (want 0)
  PASS depth.flat_transform - depth 1 scale 1 at (-24,-24) filters [] entities [] alpha 1; depth 2 scale 1 at (-24,-24) filters [] entities [] alpha 1; blur/colour filters in the subtree: none; active tilemap scale 1, filters none, alpha 1; terrace pixel #352d24, its source texel #352d24/255
  PASS depth.entities_inherit_treatment - unit sprite in the +1 plane: child of the plane, world scale 1 x 1, filters on it and its 3 container(s): none; tint #ffffff (the unit's own)
  PASS depth.visual_settings_no_physics - unchanged: {"unit":{"x":188,"y":174,"z":1},"shapeUnit":"floor","shapeChain":"open","walkChain":false,"walkUnit":true,"objects":1}
  PASS depth.config_deterministic - the same after maxDepth 1 / 0 / 2 and off / on: {"describe":"2 level(s) below, drawn 1:1 (DEC-011), void #08080c","planes":[{"z":1,"visible":true,"x":-24,"y":-24,"scale":1,"alpha":1,"filters":[]},{"z":0,"visible":true,"x":-24,"y":-24,"scale":1,"alpha":1,"filters":[]}]}
  PASS depth.planes_cost - sampled 2 x 60 frames per condition: planes off none shown in every frame, on both bound in every frame; reported, not gated: GL renderer "ANGLE (NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11 vs_5_0 ps_5_0)"; median engine tick (update + render submit): planes off 1.7 ms, on 2.5 ms (the planes +0.8 ms); median frame intervals off 14, on 14 ms; worst tick off 3.5, on 4.0 ms; this machine, nw.exe harness, simulation paused
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26632_1790536271578\test_output\depth.plus2_off.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26632_1790536271578\test_output\depth.plus2_flat.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26632_1790536271578\test_output\depth.plus1_off.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_26632_1790536271578\test_output\depth.plus1_flat.png
  PASS depth.screenshots_written - depth.plus2_off.png 308177 B, depth.plus2_flat.png 114814 B, depth.plus1_off.png 256887 B, depth.plus1_flat.png 117397 B
  PASS depth.ground_draws_through_openings - view 0, depth 1 -> -1, depth 2 -> -2, void shown; floor ground cell (190,175) unchanged by the planes (its own art's lowest alpha 255); open cell (193,175) over the -2 floor draws #6d4d3d (planes #6d4d3d, -2 texels {#553d31 #6d4d3d}, -1 alpha 0; planes off #000000); open cell (191,175) over the -1 floor draws #6d4d3d (-1 texels {#553d31 #6d4d3d}; planes off #000000)
  PASS depth.entities_at_seam - view on +2 centred on (2,2), display (249.5,251.5) (wrapped); +1 plane level 1: item (1,1) drawn at (384,312); item (253,1) drawn at (192,312); item (1,253) drawn at (384,120); item (253,253) drawn at (192,120); wall face (254,4) drawn at (240,456); wall face (4,254) drawn at (528,168); unit (3,3) drawn at (480,408)
  PASS depth.canvases_freed - after 4 in-place level switches and 2 map transfer(s) (a new spriteset each): 4 canvas layers in use, 4 canvases made since boot, 0 destroyed, 0 pooled (want 4 / 4 / 0 / 0); at each new scene's start, view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]; view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]
  PASS depth.hotkey_free - keyMapper[118] (F7) is undefined: the preset hotkey is gone and the key is free
  PASS depth.no_errors - none
required checks: 27/27 PASS

RESULT: all required checks passed (exit 0)
EXIT=0
```

### `node tools/depth_demo/test_depth_demo.js`

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
EXIT=0
```

### `node tools/layer_overlays/test_layer_overlays.js`

```text
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
BENCH buried hp=32 lowerHp=0 overlays=96 lower=0 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.580 steadyMs=
BENCH shaft-depth-2 hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.747 steadyMs=
BENCH shaft-depth-31 hp=48 lowerHp=16 overlays=144 lower=48 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.369 steadyMs=
BENCH cues-on hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=6 steadyAlloc=undefined rebuildMs=0.140 steadyMs=
BENCH steady hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=undefined steadyAlloc=0 rebuildMs=1.908 steadyMs=0.018
PASS benchmark_32_layers
PASS benchmark_32_layers_mutant_killed
RESULT: 40 passed, 0 failed
EXIT=0
```

### `node tools/check_deus_syntax.js`

```text
Checked 60 DEUS plugin files. Errors: 0
EXIT=0
```

### `node tools/occlusion/test_occlusion_culling.js --provoke-all`

```text
CAUGHT covered_not_drawn: covered-unit updates 3 rendered true; covered-object updates 3 rendered true; covered-item updates 3 rendered true; covered-wall updates 3 rendered true; covered-ramp updates 3 rendered true; covered-effect updates 3 rendered true; deep-unit updates 3 rendered true
CAUGHT exposed_drawn: drew 0 want 6; missing exposed-unit; missing exposed-object; missing exposed-item; missing exposed-wall; missing exposed-ramp; missing exposed-effect
CAUGHT cost_proportional: 32-layer visits 7616 vs 5-layer 1190; solid level visits 7378 / 952; solid exposed 7616; visits 7616 want the bounds 238 not the map; maxDepth 32 on solid visited 7616 / levels 7378; fullScans 1
CAUGHT no_full_scan: second frame visits 4096 fullScans 1 rebuilt true; third frame visits 4096
CAUGHT switch_and_pan: still updated after the cover closed (2); still updated after the pan (3); still updated after the view moved above it (3)
RESULT: 5 provocations caught, 0 missed
EXIT=0
```

### `node tools/occlusion/bench_occlusion.js`

```text
--- legacy exit 0 (38.5 s) ---
Running --deus-test=occlusion_bench on C:\Users\snewt\AppData\Local\Temp\deus_occlusion_VAH3Yr\legacy\game
UF_Test run 2026-09-27T19:12:09.174Z args=[]
HARNESS New Game year 0 (requested 0)
DEBUG_SHEET: Scene_Boot.start called
AVAILABLE SUITES: selftest, smoke, perf, native_starting_gear, native_survival_dying, native_perf_4x_benchmark, occlusion_bench, select, minimap, natural_connections, ownership, ecology, projects, settlement, colonists, overseer, world, spawn, worldgen, biomes, tiles, ground, factions, skins, history, objects, walls, doors, items, jobs, floors, wildlife, wildlife_seeds, stance, combat, anim, fog, daynight, timespeed, camera, culling, speech, overhead, look, sheet, talk, fire, vertical, natural_walls, flooding, strata, environment, faction_menus, title, load, setup, depth, layers_flat, select
SUITE occlusion_bench
PASS occlusion_bench.boot - maxDepth 2 view 0 range {"zMin":-2,"zMax":2} levels 5
PASS occlusion_bench.solid_written - 896 solid cells, 0 refused
PASS occlusion_bench.solid_settled - exposed 0 visits 0
PASS occlusion_bench.camera_panned - display moved 3
PASS occlusion_bench.open_exposed - {"cell":true,"sprite":true}
PASS occlusion_bench.open_covered - {"cell":false,"sprite":false}
PASS occlusion_bench.open_deep - {"exposed":null,"sprite":false}
PASS occlusion_bench.no_full_scan - fullScans 0
PASS occlusion_bench.solid_steady - steady [{"visits":0,"levels":0,"exposed":0,"ms":0.11999999878753442,"paintDelta":0,"touchDelta":0,"skippedDelta":8,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.06999999823165126,"paintDelta":0,"touchDelta":0,"skippedDelta":8,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.1849999989644857,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.13000000035390258,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.16999999934341758,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.09500000123807695,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.12999999853491317,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.22000000171829015,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0}]
PASS occlusion_bench.solid_pan - pan [{"visits":396,"levels":0,"exposed":0,"ms":0.1449999999749707,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.13500000204658136,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.4399999997986015,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.13000000035390258,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.1650000012887176,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.11499999891384505,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.12000000060652383,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.1050000009854557,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0}]
BENCH {"zRange":{"zMin":-2,"zMax":2},"levelCount":5,"maxDepth":2,"view":0,"solid":{"wrote":896,"steady":[{"visits":0,"levels":0,"exposed":0,"ms":0.11999999878753442,"paintDelta":0,"touchDelta":0,"skippedDelta":8,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.06999999823165126,"paintDelta":0,"touchDelta":0,"skippedDelta":8,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.1849999989644857,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.13000000035390258,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.16999999934341758,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.09500000123807695,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.12999999853491317,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.22000000171829015,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0}],"pan":[{"visits":396,"levels":0,"exposed":0,"ms":0.1449999999749707,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.13500000204658136,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.4399999997986015,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.13000000035390258,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.1650000012887176,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.11499999891384505,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.12000000060652383,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.1050000009854557,"paintDelta":0,"touchDelta":0,"skippedDelta":4,"full":0}],"moved":3},"open":{"holeOk":true,"exposedCell":true,"coveredCell":false,"exposedSprite":true,"coveredSprite":false,"deepLevel":false,"deepExposed":null,"deepSprite":false,"exposedCells":2,"frames":[{"visits":0,"levels":0,"exposed":2,"ms":0.34500000037951395,"paintDelta":0,"touchDelta":287,"skippedDelta":0,"full":0},{"visits":0,"levels":0,"exposed":2,"ms":0.594999999520951,"paintDelta":0,"touchDelta":287,"skippedDelta":0,"full":0},{"visits":0,"levels":0,"exposed":2,"ms":2.169999999750871,"paintDelta":0,"touchDelta":287,"skippedDelta":0,"full":0},{"visits":0,"levels":0,"exposed":2,"ms":1.969999999346328,"paintDelta":0,"touchDelta":287,"skippedDelta":0,"full":0},{"visits":0,"levels":0,"exposed":2,"ms":0.4149999986111652,"paintDelta":0,"touchDelta":287,"skippedDelta":0,"full":0},{"visits":0,"levels":0,"exposed":2,"ms":0.3600000018195715,"paintDelta":0,"touchDelta":287,"skippedDelta":0,"full":0}]}}
RESULT: 10 passed, 0 failed (exit 0)

--- default exit 0 (42.3 s) ---
Running --deus-test=occlusion_bench on C:\Users\snewt\AppData\Local\Temp\deus_occlusion_VAH3Yr\default\game
UF_Test run 2026-09-27T19:12:48.112Z args=[]
HARNESS New Game year 0 (requested 0)
DEBUG_SHEET: Scene_Boot.start called
AVAILABLE SUITES: selftest, smoke, perf, native_starting_gear, native_survival_dying, native_perf_4x_benchmark, occlusion_bench, select, minimap, natural_connections, ownership, ecology, projects, settlement, colonists, overseer, world, spawn, worldgen, biomes, tiles, ground, factions, skins, history, objects, walls, doors, items, jobs, floors, wildlife, wildlife_seeds, stance, combat, anim, fog, daynight, timespeed, camera, culling, speech, overhead, look, sheet, talk, fire, vertical, natural_walls, flooding, strata, environment, faction_menus, title, load, setup, depth, layers_flat, select
SUITE occlusion_bench
PASS occlusion_bench.boot - maxDepth 2 view 0 range {"zMin":-16,"zMax":15} levels 32
PASS occlusion_bench.solid_written - 896 solid cells, 0 refused
PASS occlusion_bench.solid_settled - exposed 0 visits 0
PASS occlusion_bench.camera_panned - display moved 3
PASS occlusion_bench.open_exposed - {"cell":true,"sprite":true}
PASS occlusion_bench.open_covered - {"cell":false,"sprite":false}
PASS occlusion_bench.open_deep - {"exposed":false,"sprite":false}
PASS occlusion_bench.no_full_scan - fullScans 0
PASS occlusion_bench.solid_steady - steady [{"visits":0,"levels":0,"exposed":0,"ms":0.07499999992433004,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.07000000005064066,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.10000000111176632,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.11500000073283445,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.09999999929277692,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.11499999891384505,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.07499999810534064,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.09500000123807695,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0}]
PASS occlusion_bench.solid_pan - pan [{"visits":396,"levels":0,"exposed":0,"ms":0.09499999941908754,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.08999999954539817,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.0850000014906982,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.11500000073283445,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.09500000123807695,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.1049999991664663,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.08499999967170879,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.09500000123807695,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0}]
BENCH {"zRange":{"zMin":-16,"zMax":15},"levelCount":32,"maxDepth":2,"view":0,"solid":{"wrote":896,"steady":[{"visits":0,"levels":0,"exposed":0,"ms":0.07499999992433004,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.07000000005064066,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.10000000111176632,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.11500000073283445,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.09999999929277692,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.11499999891384505,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.07499999810534064,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.09500000123807695,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0}],"pan":[{"visits":396,"levels":0,"exposed":0,"ms":0.09499999941908754,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.08999999954539817,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.0850000014906982,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.11500000073283445,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.09500000123807695,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.1049999991664663,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.08499999967170879,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0},{"visits":0,"levels":0,"exposed":0,"ms":0.09500000123807695,"paintDelta":0,"touchDelta":0,"skippedDelta":2,"full":0}],"moved":3},"open":{"holeOk":true,"exposedCell":true,"coveredCell":false,"exposedSprite":true,"coveredSprite":false,"deepLevel":true,"deepExposed":false,"deepSprite":false,"exposedCells":2,"frames":[{"visits":0,"levels":0,"exposed":2,"ms":0.2699999986361945,"paintDelta":0,"touchDelta":125,"skippedDelta":0,"full":0},{"visits":0,"levels":0,"exposed":2,"ms":0.5999999993946403,"paintDelta":0,"touchDelta":125,"skippedDelta":0,"full":0},{"visits":0,"levels":0,"exposed":2,"ms":0.38500000118801836,"paintDelta":0,"touchDelta":125,"skippedDelta":0,"full":0},{"visits":0,"levels":0,"exposed":2,"ms":0.3349999988131458,"paintDelta":0,"touchDelta":125,"skippedDelta":0,"full":0},{"visits":0,"levels":0,"exposed":2,"ms":0.5799999998998828,"paintDelta":0,"touchDelta":125,"skippedDelta":0,"full":0},{"visits":0,"levels":0,"exposed":2,"ms":0.41000000055646524,"paintDelta":0,"touchDelta":125,"skippedDelta":0,"full":0}]}}
RESULT: 10 passed, 0 failed (exit 0)

SUMMARY legacy {"range":"legacy","levels":5,"z":{"zMin":-2,"zMax":2},"maxDepth":2,"steadyVisits":0,"steadyLevels":0,"steadyPaint":0,"steadyTouch":0,"steadyMs":0.13000000035390258,"panLevels":0,"panPaint":0,"panVisits":396,"panMs":0.13500000204658136,"openExposed":2,"openMs":0.594999999520951,"exposedSprite":true,"coveredSprite":false,"deepExposed":null,"deepSprite":false}
SUMMARY default {"range":"default","levels":32,"z":{"zMin":-16,"zMax":15},"maxDepth":2,"steadyVisits":0,"steadyLevels":0,"steadyPaint":0,"steadyTouch":0,"steadyMs":0.09999999929277692,"panLevels":0,"panPaint":0,"panVisits":396,"panMs":0.09500000123807695,"openExposed":2,"openMs":0.41000000055646524,"exposedSprite":true,"coveredSprite":false,"deepExposed":false,"deepSprite":false}
COMPARE steadyMs 0.13000000035390258 vs 0.09999999929277692 gap 0.03000000106112566; panMs 0.13500000204658136 vs 0.09500000123807695 gap 0.04000000080850441; openExposed 2 vs 2; counts equal; time within tolerance
REMOVED C:\Users\snewt\AppData\Local\Temp\deus_occlusion_VAH3Yr
EXIT=0
```

### `node tools/test_culling_native.js — writer tip`

```text
UF_Test run 2026-09-27T19:12:55.637Z args=[]
DEBUG_SHEET: Scene_Boot.start called
AVAILABLE SUITES: selftest, smoke, perf, native_starting_gear, native_survival_dying, native_perf_4x_benchmark, culling_native_phase1, culling_native_phase2, select, minimap, natural_connections, ownership, ecology, projects, settlement, colonists, overseer, world, spawn, worldgen, biomes, tiles, ground, factions, skins, history, objects, walls, doors, items, jobs, floors, wildlife, wildlife_seeds, stance, combat, anim, fog, daynight, timespeed, camera, speech, overhead, look, sheet, talk, fire, vertical, natural_walls, flooding, strata, environment, faction_menus, title, load, setup, depth, layers_flat, culling, select
SUITE culling_native_phase1
PASS culling_native_phase1.culling_active - UF.Culling is active and enabled
PASS culling_native_phase1.camera_level_0_zoom_1.00 - Culling bounds zoom matches camera level 0
PASS culling_native_phase1.origin_seam_queried - Units registered at origin
PASS culling_native_phase1.torus_wrap_queried - Units registered across toroidal seam
PASS culling_native_phase1.dynamic_spawn_registered - Dynamic unit spawned at (64,44)
PASS culling_native_phase1.dynamic_offscreen_culled - Offscreen spawned unit is culled
PASS culling_native_phase1.margin_entry_reactivates - Unit entering margin reactivates and becomes visible
PASS culling_native_phase1.despawn_unregisters - Despawn unregisters from culling spatial index
SHOT C:\Users\snewt\AppData\Local\Temp\deus_culling_native_4nb2JE\game\test_output\culling_native_phase1.culling_native_phase1_saved.png
PASS culling_native_phase1.save_game_99_written - Disposable save file 99 created successfully on disk
PASS culling_native_phase1.phase1_no_errors
RESULT: 10 passed, 0 failed (exit 0)

--- Executing Phase 2: Full Process Restart & Load Verification ---
[native] Running --deus-test=culling_native_phase2 on C:\Users\snewt\AppData\Local\Temp\deus_culling_native_4nb2JE\game
UF_Test run 2026-09-27T19:13:38.363Z args=[]
DEBUG_SHEET: Scene_Boot.start called
AVAILABLE SUITES: selftest, smoke, perf, native_starting_gear, native_survival_dying, native_perf_4x_benchmark, culling_native_phase1, culling_native_phase2, select, minimap, natural_connections, ownership, ecology, projects, settlement, colonists, overseer, world, spawn, worldgen, biomes, tiles, ground, factions, skins, history, objects, walls, doors, items, jobs, floors, wildlife, wildlife_seeds, stance, combat, anim, fog, daynight, timespeed, camera, speech, overhead, look, sheet, talk, fire, vertical, natural_walls, flooding, strata, environment, faction_menus, title, load, setup, depth, layers_flat, culling, select
SUITE culling_native_phase2
PASS culling_native_phase2.save_99_loaded - Save file 99 loaded cleanly
PASS culling_native_phase2.world_present - UF.World present after load
PASS culling_native_phase2.authoritative_units_count - All 100+ authoritative units loaded intact; count=1194
FAIL culling_native_phase2.founders_loaded - Found all 8 founder colonists in loaded world
FAIL culling_native_phase2.suite_completed - Cannot read property 'x' of undefined [at Object.UF.Test.suite.isDefault [as fn] (chrome-extension://njgcanhfjdabfmnlmpmdedalocpafnhl/js/plugins/TEST_CullingNativeSuite.js:175:30) | at async run (chrome-extension://njgcanhfjdabfmnlmpmdedalocpafnhl/js/plugins/DEUS_Test.js:222:21)]
RESULT: 3 passed, 2 failed (exit 1)
Phase 2 FAILED. Aborting integration.
EXIT=1
```

### `node tools/test_culling_native.js — merge base`

```text
CHECKOUT_EXIT=0
BASE_DIR=C:\Users\snewt\AppData\Local\Temp\deus_be_review_base_b51c2c9d7c214339a58127bfa2d90bbd
=== DEUS NATIVE F5/F8 & SAVE/LOAD VERIFICATION HARNESS ===
Disposable Game Runtime: C:\Users\snewt\AppData\Local\Temp\deus_culling_native_zvVUmT\game

--- Executing Phase 1: Native Visual & Save Generation ---
[native] Running --deus-test=culling_native_phase1 on C:\Users\snewt\AppData\Local\Temp\deus_culling_native_zvVUmT\game
UF_Test run 2026-09-27T19:13:42.817Z args=[]
DEBUG_SHEET: Scene_Boot.start called
AVAILABLE SUITES: selftest, smoke, perf, native_starting_gear, native_survival_dying, native_perf_4x_benchmark, culling_native_phase1, culling_native_phase2, select, minimap, natural_connections, ownership, ecology, projects, settlement, colonists, overseer, world, spawn, worldgen, biomes, tiles, ground, factions, skins, history, objects, walls, doors, items, jobs, floors, wildlife, wildlife_seeds, stance, combat, anim, fog, daynight, timespeed, camera, speech, overhead, look, sheet, talk, fire, vertical, natural_walls, flooding, strata, environment, faction_menus, title, load, setup, depth, layers_flat, culling, select
SUITE culling_native_phase1
PASS culling_native_phase1.culling_active - UF.Culling is active and enabled
PASS culling_native_phase1.camera_level_0_zoom_1.00 - Culling bounds zoom matches camera level 0
PASS culling_native_phase1.origin_seam_queried - Units registered at origin
PASS culling_native_phase1.torus_wrap_queried - Units registered across toroidal seam
PASS culling_native_phase1.dynamic_spawn_registered - Dynamic unit spawned at (64,44)
PASS culling_native_phase1.dynamic_offscreen_culled - Offscreen spawned unit is culled
PASS culling_native_phase1.margin_entry_reactivates - Unit entering margin reactivates and becomes visible
PASS culling_native_phase1.despawn_unregisters - Despawn unregisters from culling spatial index
SHOT C:\Users\snewt\AppData\Local\Temp\deus_culling_native_zvVUmT\game\test_output\culling_native_phase1.culling_native_phase1_saved.png
PASS culling_native_phase1.save_game_99_written - Disposable save file 99 created successfully on disk
PASS culling_native_phase1.phase1_no_errors
RESULT: 10 passed, 0 failed (exit 0)

--- Executing Phase 2: Full Process Restart & Load Verification ---
[native] Running --deus-test=culling_native_phase2 on C:\Users\snewt\AppData\Local\Temp\deus_culling_native_zvVUmT\game
UF_Test run 2026-09-27T19:14:13.844Z args=[]
DEBUG_SHEET: Scene_Boot.start called
AVAILABLE SUITES: selftest, smoke, perf, native_starting_gear, native_survival_dying, native_perf_4x_benchmark, culling_native_phase1, culling_native_phase2, select, minimap, natural_connections, ownership, ecology, projects, settlement, colonists, overseer, world, spawn, worldgen, biomes, tiles, ground, factions, skins, history, objects, walls, doors, items, jobs, floors, wildlife, wildlife_seeds, stance, combat, anim, fog, daynight, timespeed, camera, speech, overhead, look, sheet, talk, fire, vertical, natural_walls, flooding, strata, environment, faction_menus, title, load, setup, depth, layers_flat, culling, select
SUITE culling_native_phase2
PASS culling_native_phase2.save_99_loaded - Save file 99 loaded cleanly
PASS culling_native_phase2.world_present - UF.World present after load
PASS culling_native_phase2.authoritative_units_count - All 100+ authoritative units loaded intact; count=1254
FAIL culling_native_phase2.founders_loaded - Found all 8 founder colonists in loaded world
FAIL culling_native_phase2.suite_completed - Cannot read property 'x' of undefined [at Object.UF.Test.suite.isDefault [as fn] (chrome-extension://njgcanhfjdabfmnlmpmdedalocpafnhl/js/plugins/TEST_CullingNativeSuite.js:175:30) | at async run (chrome-extension://njgcanhfjdabfmnlmpmdedalocpafnhl/js/plugins/DEUS_Test.js:222:21)]
RESULT: 3 passed, 2 failed (exit 1)
Phase 2 FAILED. Aborting integration.
EXIT=1
```

### `node tools/test_layer_render_flat.js --keep — extra regression`

```text
run: RESULT: 12 passed, 0 failed (exit 0) in 34.8 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_layers_flat_8548_1790536485710
  PASS layers_flat.preconditions - world true, levels true, view 0, screen 816x624, world seed 1623044279
  PASS layers_flat.fixtures - fixture scene centred at (176,176) in area (0,0), world seed 1623044279: 144 columns x 5 levels (562 cell(s) written, 158 already as specified), 112 ground tile(s) set (meadow, tile 2816), 105 object(s) cleared, 5784 ms; 0 refused, 0 cell(s) not as specified; cut 6 cells from (175,175), -1 floor (175,175); unit A (173,173) +1; unit B (175,175) -1
  PASS layers_flat.flat_position - before the pan depth 1 off by (0,0), depth 2 off by (0,0); after a 2-tile pan depth 1 off by (0,0), depth 2 off by (0,0) (want 0 px); unit A drawn at (288,216) for its cell's foot (288,216)
  PASS layers_flat.flat_crisp - 53504 opaque samples of the +2 planes' tile render, 0 colour(s) not in the 56-colour source set
  PASS layers_flat.unit_step_same_frame - step (173,173) -> (174,173) in frame 125, tick 73: sprite target 174,173 set in frame 125, walk from tick 73; 12 frame(s) drawn 1..15 ticks after it, each between the cells; 3 frame(s) drawn 16+ ticks after it, each on the new cell's foot (336,216); walk frames shown: true (columns 1/2, stand 1); reported, not gated: first drawn on the new cell 16 tick(s), 16 frame update(s) after the step (bound 16 ticks); unit E outside the window at x 188, stepped to (187,176) in frame 155: sprite made in frame 155
  PASS layers_flat.scan_candidates_only - 738 unit(s) tested per frame; 738 on the planes' levels, 1250 in the world; candidate lists made 7 time(s) since boot
  PASS layers_flat.item_change_scoped - before [{"items":false,"all":false,"objects":false},{"items":false,"all":false,"objects":false}]; a stone given to unit A (held): [{"items":false,"all":false,"objects":false},{"items":false,"all":false,"objects":false}]; a stone on the ground of level 1 at (174,173): [{"items":true,"all":false,"objects":false},{"items":false,"all":false,"objects":false}]
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_layers_flat_8548_1790536485710\test_output\layers_flat.ground_off.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_layers_flat_8548_1790536485710\test_output\layers_flat.ground_flat.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_layers_flat_8548_1790536485710\test_output\layers_flat.minus1_off.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_layers_flat_8548_1790536485710\test_output\layers_flat.minus1_flat.png
  PASS layers_flat.every_view_sees_through - +2: open cell (175,175) draws #08080c, planes #08080c/255, planes off #000000; floor cell (180,173) unchanged (#352d24 / #352d24 planes off); planes on levels [1, 0]; +1: open cell (175,175) draws #6d4d3d, planes #6d4d3d/255, planes off #000000; floor cell (172,172) unchanged (#352d24 / #352d24 planes off); planes on levels [0, -1]; Ground: open cell (175,175) draws #6d4d3d, planes #6d4d3d/255, planes off #000000; floor cell (174,175) unchanged (#71864d / #71864d planes off); planes on levels [-1, -2]; -1: open cell (176,175) draws #6d4d3d, planes #6d4d3d/255, planes off #000000; solid cell (174,175) unchanged (#573a07 / #573a07 planes off); planes on levels [-2]
  PASS layers_flat.flat_no_filters - plus2: planes on levels [1, 0], flat; plus1: planes on levels [0, -1], flat
  PASS layers_flat.switch_same_frame - switches 0->2 2->1 1->0 0->-1 -1->0: 0->2 at levels:viewChanged (frame 95): planes 1:shown painted since bound (3 paint(s)), 0:shown painted since bound (3 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 95): planes 1:shown painted since bound (3 paint(s)), 0:shown painted since bound (3 paint(s)); 1 unit(s) in the window, all with a frame on their cell; 2->1 at levels:viewChanged (frame 182): planes 0:shown painted since bound (11 paint(s)), -1:shown painted since bound (11 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 182): planes 0:shown painted since bound (11 paint(s)), -1:shown painted since bound (12 paint(s)); 1 unit(s) in the window, all with a frame on their cell; 1->0 at levels:viewChanged (frame 203): planes -1:shown painted since bound (15 paint(s)), -2:shown painted since bound (16 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 203): planes -1:shown painted since bound (16 paint(s)), -2:shown painted since bound (16 paint(s)); 1 unit(s) in the window, all with a frame on their cell; 0->-1 at levels:viewChanged (frame 230): planes -2:shown painted since bound (22 paint(s)); 0 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 230): planes -2:shown painted since bound (22 paint(s)); 0 unit(s) in the window, all with a frame on their cell; -1->0 at levels:viewChanged (frame 257): planes -1:shown painted since bound (27 paint(s)), -2:shown painted since bound (21 paint(s)); 1 unit(s) in the window, all with a frame on their cell; first drawn frame (frame 257): planes -1:shown painted since bound (28 paint(s)), -2:shown painted since bound (21 paint(s)); 1 unit(s) in the window, all with a frame on their cell
  PASS layers_flat.screenshots_written - layers_flat.ground_off.png 63257 B, layers_flat.ground_flat.png 67184 B, layers_flat.minus1_off.png 105785 B, layers_flat.minus1_flat.png 106297 B
  PASS layers_flat.no_errors - none
required checks: 12/12 PASS

RESULT: all required checks passed (exit 0)
EXIT=0
```

### `node tools/test_layer_render_flat.js --suite depth --keep — visual inspection repeat`

```text
run: RESULT: 27 passed, 0 failed (exit 0) in 70.8 s (snapshot exit 0); snapshot C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24688_1790536361625
  PASS depth.preconditions - world true, levels true, view 0, surface grid true, screen 816x624, world seed 1430055618
  PASS depth.proof_scene - fixture scene centred at (168,168) in area (0,0), world seed 1430055618: 144 columns x 5 levels (674 cell(s) written, 46 already as specified), 112 ground tile(s) set (meadow, tile 2816), 55 object(s) cleared, 9555 ms; 0 refused, 0 cell(s) not as specified; hole (163,165), deck 3 cells from (166,166)
  PASS depth.planes_present - view 2; depth 1 -> level 1, 2 paint(s), 55956 opaque samples; depth 2 -> level 0, 2 paint(s), 52630 opaque samples; last paint 13.1 ms, last peek 0.0 ms
  PASS depth.repaint_cost - 4 of 4 refreshes of one 912x720 plane repainted it by the next frame; repaint times 13.1 / 2.7 / 2.9 / 19.6 / 4.0 ms (reported, not gated: wall-clock time, this machine, nw.exe harness)
  PASS depth.projection_origin - centre -> (408,312) want (408,312); left edge -> (0,312) want (0,312) (identity, DEC-011); plane scale 1
  PASS depth.exposure_by_upper_geometry - floor cell (172,165) unchanged by the planes; open cell (165,164) shows the level below
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24688_1790536361625\test_output\depth.planes_only_plus2.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24688_1790536361625\test_output\depth.planes_only_plus2_tiles.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24688_1790536361625\test_output\depth.canvas_depth1.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24688_1790536361625\test_output\depth.canvas_depth2.png
  PASS depth.mask_order - deck cell (167,166) at screen (384,240): drawn #d89a55, depth 1 texels {#351d16 #492a19 #d89a55 #8e4d30}, ground texel under it #71864d/255
  PASS depth.depth2_through_depth1 - low ground (172,170) at screen (624,432): drawn #71864d/255, ground texel #71864d/255, ground texels {#71864d}, depth 1 alpha there 0; under the hole (163,165) the ground draws #71864d/255 (tiles 2816/0/0)
  PASS depth.entities_drawn - fixtures: oak placed at (161,164), item stone x3 at (162,165), unit added; +1 plane draws 1 object(s), 1 unit(s), 1 item stack(s), 59 wall/ramp frame(s); item sheet !$UF_Item_Stone ready true, tracked by the plane true, visible true; unit at (164,166) probed at screen (240,244): drawn (#fbdcc8 vs #35312d without units)
  PASS depth.crisp_nearest - 39360 opaque samples, 0 colour(s) not in the 59-colour source set; smooth false, baseTexture scaleMode 0 (0 nearest, 1 linear), sprite texture is the bitmap's, plane at (-24,-24)
  PASS depth.parallax_bounded - edge shift measured depth 1 0 px, depth 2 0 px (want 0); a pan of 2 tiles moved a low-ground point on depth 1 from x 624 to 528 (-96 px, want -96); the point under the centre stays at x 408; display back at 159.5 (was 159.5)
  PASS depth.tunables_take_effect - maxDepth 1 [1:1 2:-] void true; maxDepth 2 [1:1 2:0]; enabled false [1:- 2:-] void false; enabled true [1:1 2:0] void true
  PASS depth.no_filters_any_state - maxDepth 1: none; maxDepth 2: none; off: none; on: none; entities off: none; entities on: none
  PASS depth.one_level_below - maxDepth 1: depth 1 level 1, depth 2 hidden, void shown
  PASS depth.void_beyond - low ground (172,170) at screen (624,432): planes render #08080c/255, screen #08080c, void #08080c
  PASS depth.no_blends - 0 of 39360 sampled pixels are blends (want 0)
  PASS depth.flat_transform - depth 1 scale 1 at (-24,-24) filters [] entities [] alpha 1; depth 2 scale 1 at (-24,-24) filters [] entities [] alpha 1; blur/colour filters in the subtree: none; active tilemap scale 1, filters none, alpha 1; terrace pixel #352d24, its source texel #352d24/255
  PASS depth.entities_inherit_treatment - unit sprite in the +1 plane: child of the plane, world scale 1 x 1, filters on it and its 3 container(s): none; tint #ffffff (the unit's own)
  PASS depth.visual_settings_no_physics - unchanged: {"unit":{"x":164,"y":166,"z":1},"shapeUnit":"floor","shapeChain":"open","walkChain":false,"walkUnit":true,"objects":1}
  PASS depth.config_deterministic - the same after maxDepth 1 / 0 / 2 and off / on: {"describe":"2 level(s) below, drawn 1:1 (DEC-011), void #08080c","planes":[{"z":1,"visible":true,"x":-24,"y":-24,"scale":1,"alpha":1,"filters":[]},{"z":0,"visible":true,"x":-24,"y":-24,"scale":1,"alpha":1,"filters":[]}]}
  PASS depth.planes_cost - sampled 2 x 60 frames per condition: planes off none shown in every frame, on both bound in every frame; reported, not gated: GL renderer "ANGLE (NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11 vs_5_0 ps_5_0)"; median engine tick (update + render submit): planes off 1.7 ms, on 2.3 ms (the planes +0.6 ms); median frame intervals off 14, on 14 ms; worst tick off 2.6, on 4.2 ms; this machine, nw.exe harness, simulation paused
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24688_1790536361625\test_output\depth.plus2_off.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24688_1790536361625\test_output\depth.plus2_flat.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24688_1790536361625\test_output\depth.plus1_off.png
  SHOT C:\Users\snewt\AppData\Local\Temp\uf_snapshots\lanek_depth_24688_1790536361625\test_output\depth.plus1_flat.png
  PASS depth.screenshots_written - depth.plus2_off.png 283327 B, depth.plus2_flat.png 114934 B, depth.plus1_off.png 230110 B, depth.plus1_flat.png 104879 B
  PASS depth.ground_draws_through_openings - view 0, depth 1 -> -1, depth 2 -> -2, void shown; floor ground cell (166,167) unchanged by the planes (its own art's lowest alpha 255); open cell (169,167) over the -2 floor draws #6d4d3d (planes #6d4d3d, -2 texels {#553d31 #6d4d3d}, -1 alpha 0; planes off #000000); open cell (167,167) over the -1 floor draws #6d4d3d (-1 texels {#553d31 #6d4d3d}; planes off #000000)
  PASS depth.entities_at_seam - view on +2 centred on (2,2), display (249.5,251.5) (wrapped); +1 plane level 1: item (1,1) drawn at (384,312); item (253,1) drawn at (192,312); item (1,253) drawn at (384,120); item (253,253) drawn at (192,120); wall face (254,4) drawn at (240,456); wall face (4,254) drawn at (528,168); unit (3,3) drawn at (480,408)
  PASS depth.canvases_freed - after 4 in-place level switches and 2 map transfer(s) (a new spriteset each): 4 canvas layers in use, 4 canvases made since boot, 0 destroyed, 0 pooled (want 4 / 4 / 0 / 0); at each new scene's start, view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]; view 2: planes on levels [1 1 paint(s), 0 1 paint(s)]
  PASS depth.hotkey_free - keyMapper[118] (F7) is undefined: the preset hotkey is gone and the key is free
  PASS depth.no_errors - none
required checks: 27/27 PASS

RESULT: all required checks passed (exit 0)
EXIT=0
```

## Visual evidence inspected

Writer evidence consists of REPORT's pasted text; no committed lane evidence directory is present. The first exact depth gate deletes its screenshots before returning, so those particular images could not be opened. The reviewer reran with --keep and opened all eight depth PNGs, then opened all four PNGs from the extra layers_flat run.

Depth snapshot: `C:/Users/snewt/AppData/Local/Temp/uf_snapshots/lanek_depth_24688_1790536361625/test_output/`:
- depth.planes_only_plus2.png: terrace with oak, stone stack and pink-haired unit; wooden deck; green lower ground and black void/caps.
- depth.planes_only_plus2_tiles.png: same terrain/deck without entities; ground is visible through the terrace hole.
- depth.canvas_depth1.png: upper terrace/deck and extensive wooden tile border around the canvas; central transparent/open region displays black in the viewer.
- depth.canvas_depth2.png: green ground across the lower canvas, with a central cut and surrounding water-pattern tiles. Canvas contains more than just exposed columns.
- depth.plus2_off.png: blue sky fills the opening with the planes disabled, rock rim and +2 UI.
- depth.plus2_flat.png: same view with lower ground, terrace, tree, unit and deck replacing sky; crisp pixels and black void, +2 UI.
- depth.plus1_off.png: terrace, tree, unit/HP marks and deck over blue sky through open areas; +1 UI.
- depth.plus1_flat.png: lower green ground and cut replace sky under the terrace, retaining terrace/deck/entities at crisp scale.

Flat snapshot: `C:/Users/snewt/AppData/Local/Temp/uf_snapshots/lanek_layers_flat_8548_1790536485710/test_output/`:
- layers_flat.ground_off.png: ground grass with a black central opening.
- layers_flat.ground_flat.png: a blond test unit and brown floor visible in that opening.
- layers_flat.minus1_off.png: dark blue underground view, unit beside a dark opening.
- layers_flat.minus1_flat.png: same underground view with lower floor texture inside the opening.

These match the ordinary fixture visibility/1:1 checks, not a paired base/tip equality test or a proof of zero hidden work. Screenshots are temporary test evidence, not new art. Native culling's phase-1 SHOT files were removed by the next process's test-output initialization before inspection; both remaining result files were readable. No visual claim is made about those absent images.

## Regression and performance limits

Base native culling was run in a local shared throwaway clone checked out at `ecc7b8984a0ab1a919595c792f98a60f18872f73`; clone and checkout exit 0. Tip ran from the unchanged writer worktree. Both scripts staged disposable game runtimes. Base count=1254, tip count=1194; generated populations differ, but the same founders_loaded and undefined-x failures occur on both. The writer's account of that failure was independently reproduced. Save/load culling after the failure is not checked.

The reviewer benchmark's solid medians were 0.130/0.100 ms (5/32 layers), pan medians 0.135/0.095 ms; these are depth-update timings from the script, not FPS or whole-frame guarantees. Both solid cases had zero steady visits/level visits/paint/touches and 396 pan visits. Open exposure=2 each; open medians 0.595/0.410 ms and per-sampled-frame touches 287/125. Those values reinforce M1/M5; they do not justify the stronger WBS performance claim. Other workers were not stopped, so timing comparisons are limited by concurrent machine load.

No RMMZ editor F5 session or manual F8 console inspection was performed. Harness depth.no_errors and layers_flat.no_errors passed. All temporary game/clone folders created for this review are removed after evidence inspection; no background review processes remain.

## What changed

Only this review file. No implementation, assets, manifests, STATUS, WBS, registration or other worker file was edited. The user's explicit review-only instruction governs the generic claim/decision-log requirements.

## How I tested it

All five exact lane gates, all five occlusion provocations, the occlusion NW benchmark, native culling at base and tip, extra flat-render suite, retained depth visual repeat, path-scope check, diff whitespace check and isolated actual-method probes. Commands and raw results are recorded above.

## Not done / known problems

M1–M5 require writer/PM resolution. The native culling suite has the same pre-existing founder failure at base and tip. F5/F8 manual proof and exact base/tip image equality are not established. Passing lane gates alone is insufficient for acceptance.

## Try it in RMMZ

1. From +2, keep two openings through +1 to z0; place an existing item/object/ramp below one.
2. Close and reopen only that +1 column without moving the camera, leaving the second opening in place.
3. Inspect lower-plane entity membership/updates and visible content immediately after each mutation.
4. Compare a mixed shaft with many covered natural cliff cells against a fully covered view, including real paint/sprite counters.

Expected: covered lower entities receive no creation/update/render work; reopening restores them immediately; all lower draw work follows exposure and stops at the first opaque surface. These are proposed manual reproduction steps, not editor actions observed in this session.

## Decisions needed

Return the implementation to the writer for M1–M5. The reviewer does not approve a scope reduction, change MaxDepth, decide DEC-017, transition WBS or authorize a merge.

VERDICT: FAIL

