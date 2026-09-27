# WG.00.21 Lane BE report

Writer: grok. Reviewer: not this run. Branch `task/lane-be`. Base `ecc7b8984a0ab1a919595c792f98a60f18872f73`.

This pass closes the five majors in `review_codex_87f4e4ee.md`. A lower cell is painted only when the walk from the viewed level reaches it and the cell is not itself open. Covered tiles, cliffs, units, objects, items, ramps and effects are not created. Closing one column dirties the lower plane while another column stays open and the camera stays put. `MaxDepth` is still 2. `DEUS_Culling.js` was not edited. No plugin registration. No art.

The system note is `docs/systems/DEUS_OcclusionCulling.md`.

## Open questions (not answered)

- DEC-017 leaves the custom map-renderer go/no-go to the Owner. The benchmark below is an input, not that decision.
- The WBS row cites DEC-018. In `docs/OWNER_DECISIONS.md`, DEC-018 is the spell ruling and DEC-021 is the occlusion ruling implemented here (with V133 and V149). The WBS text was not changed.

## What changed for M1–M5

- Live tile paint skips a cell the walk did not reach. `mask_order` now requires the covered depth-2 texel to be absent. The composite at that deck cell is still the depth-1 floor.
- Cliff, item and wall queries use exposed runs. A solid cell's column is covered, because the level above a solid derives to a floor, so those cliff sprites are not built.
- A column in the entity-window margin, outside the camera walk, is classified on its own. An open column there still gets its unit. A covered column does not.
- A shape change refreshes every lower plane's items, objects, ramps and tiles. The live suite closes one shaft and leaves the other open without moving the camera, then reopens it.
- `node tools/occlusion/test_occlusion_culling.js` still runs the planner, then launches the real planes. The live launch checks tile alpha, sprite maps, overlay bars and spells, paint-spot counts, and provokes each live guard.
- Same seed `20260927`, same fixture: the base and tip tile-and-plane crops hash equal (`64918904`, 432×336). Exposed texels match (`#352d24/255` and `#71864d/255`). Images: `tasks/WG.00.21/lane-be/evidence/base_frame.png` and `tip_frame.png`. Both show the same stone field, the green shaft, and the dark neighbour.
- The stress benchmark is 1903 solid frames (30 seconds) plus an 8 second open shaft, seed 20260927. Acceptance is the frame interval, not `lastUpdateMs`.

## Benchmark

`node tools/occlusion/bench_occlusion.js` (throwaway copies under `%TEMP%`, deleted by the script). Exit 0.

| | legacy (5) | default (32) |
|---|---:|---:|
| solid frames | 1903 | 1903 |
| solid visits / levels / paint / touches / visible | 0 | 0 |
| solid frame median / average / worst | 15.810 / 15.767 / 31.485 ms | 15.810 / 15.767 / 32.645 ms |
| pan visits / levels / paint | 396 / 0 / 0 | 396 / 0 / 0 |
| open exposed cells | 2 | 2 |
| open paint spots / window | 1 / 570 | 1 / 570 |
| open visible sprites | 1 | 1 |
| open frame median | 15.845 ms | 15.850 ms |
| deep unit | level absent | not exposed, no sprite |

Tolerance in the script: counts match. Frame median and average may differ by 3 ms or 20 percent of the smaller value. Worst frames may differ by 20 ms or half the smaller worst. This run's medians are the same 15.810 ms. The gap on the worst solid frames is 1.160 ms.

```
COMPARE gapMedian 15.810000000783475 vs 15.810000000783475 avg 15.76684182869181 vs 15.766820809249355 worst 31.48499999952037 vs 32.64500000295811; openGap 15.84500000171829 vs 15.84999999977299; spots 1 vs 1 visible 1 vs 1; updateMs 0.025000001187436283 vs 0.024999997549457476 (not the acceptance); counts equal; frame time within tolerance
REMOVED C:\Users\snewt\AppData\Local\Temp\deus_occlusion_3167B5
BENCH_EXIT:0
```

## Base / tip frames

`node tools/occlusion/compare_planes.js`. Exit 0.

```
EQUAL_FRAME true EQUAL_EXPOSED true
EVIDENCE C:\Users\snewt\.deus_worktrees\lane-be\tasks\WG.00.21\lane-be\evidence
COMPARE_EXIT:0
```

## Gate tests

### `node tools/occlusion/test_occlusion_culling.js` EXIT 0

Planner 5 passed. Live NW.js suite 10 passed, including `cover_reopen`, `live_paint`, `live_effects` and `live_mutants`.

```
PLANNER: 5 passed, 0 failed
RESULT: 10 passed, 0 failed (exit 0)
RESULT: 5 passed, 0 failed
EXIT=0
```

### `node tools/occlusion/test_occlusion_culling.js --provoke-all` EXIT 0

```
CAUGHT covered_not_drawn
CAUGHT exposed_drawn
CAUGHT cost_proportional
CAUGHT no_full_scan
CAUGHT switch_and_pan
RESULT: 5 provocations caught, 0 missed
EXIT=0
```

### `node tools/test_layer_render_flat.js --suite depth` EXIT 0

```
RESULT: 27 passed, 0 failed (exit 0) in 38.6 s
required checks: 27/27 PASS
RESULT: all required checks passed (exit 0)
EXIT=0
```

`mask_order` reports the ground under the deck as not painted. `entities_drawn` reports 0 wall frames and the covered summit cliff not drawn. `entities_at_seam` draws the four items and the unit; both covered walls are not drawn.

### `node tools/depth_demo/test_depth_demo.js` EXIT 0

```
RESULT: 28 passed, 0 failed, 28 mutants killed
EXIT=0
```

### `node tools/layer_overlays/test_layer_overlays.js` EXIT 0

```
RESULT: 40 passed, 0 failed
EXIT=0
```

### `node tools/check_deus_syntax.js` EXIT 0

```
Checked 60 DEUS plugin files. Errors: 0
EXIT=0
```

`node tools/test_layer_render_flat.js` (layers_flat, not a lane.json gate) also exited 0: 12/12, including `unit_step_same_frame` and `switch_same_frame`.

## `node tools/test_culling_native.js`

`DEUS_Culling.js` is unchanged. Both runs pass phase 1 (10/10) and fail in the same place in phase 2. `founders_loaded` fails, then the suite throws on `founders[0].x`. That is the base behavior.

Tip (this worktree): EXIT 1. Phase 1 10 passed. Phase 2 `authoritative_units_count` count=1119, then `founders_loaded` and `suite_completed` (`Cannot read property 'x' of undefined`).

```
RESULT: 10 passed, 0 failed (exit 0)
RESULT: 3 passed, 2 failed (exit 1)
TIP_EXIT:1
```

Base `ecc7b898` (byte copy of that commit's `DEUS_Depth.js` into this worktree for the run, then restored): EXIT 1. Phase 1 10 passed. The suite list includes `depth` and `layers_flat`. Phase 2 count=1190, then the same two failures.

```
RESULT: 10 passed, 0 failed (exit 0)
RESULT: 3 passed, 2 failed (exit 1)
BASE_EXIT:1
RESTORED:true
```

## Follow-ups

`PROPOSED-BE-02` (a third plane if `MaxDepth` is raised) remains in the system note. Painting only exposed cells, and querying walls and items by exposed run, are in this lane. No WBS ids were minted.
