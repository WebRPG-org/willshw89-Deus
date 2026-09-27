# DEUS Occlusion Culling

A cell of a lower level is drawn only when every level between the viewed level and that cell is open. The walk stops at the first opaque surface. Cells under that surface are not given tiles, units, objects, items, cliff faces, ramps or effects. The viewed level itself is drawn as it was.

The cost of that walk follows the exposed cells inside the camera bounds, not the size of the level and not how many levels the world has. A solid cover costs nothing below it. MaxDepth stays 2, the value the Owner set (DEC-011).

**Task:** WG.00.21. **Files:** `game/js/plugins/DEUS_Depth.js` (the rule and the planes), `docs/systems/DEUS_OcclusionCulling.md`. The camera rectangle is `UF.Culling.bounds()` (two tiles of margin). No image files are written.

## 1. The rule

From the viewed level downward, one column at a time, and only inside the camera bounds:

1. If the viewed cell is not open, stop. Nothing below it is visited. The viewed level's own tiles, sprites and overlays are unchanged.
2. Otherwise step to the next level down, while the step is within `maxDepth` and the level exists. That cell is exposed: it may be drawn.
3. If that cell is not open, it is the first opaque surface (solid, floor, ramp or stair). Stop. Levels under it are not visited.
4. If it is open, continue. The next level shows through it, as the planes already do.

Open means the shape code `open`. Anything else is a surface. A ramp on an exposed cell is drawn. The cells under the ramp are not.

`maxDepth` in the running game is `UF.Depth.config.maxDepth`, clamped to 0..2 from the plugin parameter `MaxDepth` (default 2). The planner itself takes whatever `maxDepth` it is given, so a later raise of the parameter does not need a second rule. Today there are still two pooled planes. A third level would need another plane (see Follow-ups). Under a solid viewed cell the extra depth would still visit nothing.

What is exposed is drawn 1:1. No blur, scale, parallax, alpha or tint is applied for depth (DEC-011). A unit's own `data.tint` and an item's material tint stay. They are the entity's colours.

## 2. What the planes still paint

Lane K's `mask_order` check reads the depth-2 canvas under a +1 floor and requires that texel to be opaque, so a plane that has any exposed cell in the camera bounds still paints its whole window. The composite is unchanged: the upper plane and the exposure mask hide the covered texels, and the sampled exposed texels are the same ones as before.

A plane with no exposed cell does that full paint once, on the bind, so `switch_same_frame` still sees it painted since it was bound. Every later frame, including a camera move across solid ground, skips the tilemap repaint and does not build sprites. Covered cells on that plane cost nothing per frame.

Sprites are stricter than the canvas. On a plane that does paint, a unit, object, item, ramp or effect whose own cell was not reached is not created. An object rebuild walks the same window as `UF.Objects` and skips a covered cell before it takes a sprite. `DEUS_LayerOverlays` only paints units that have a sprite on the plane, and it already drops a spell whose column is not open.

A natural cliff face is 96 px, and Lane K's seam check reads the sprite for every face in the entity window, including a face whose own column is covered. Those faces are still built with the window query. A viewport with no exposed cell never runs that query. Ramp sprites are one cell and are kept only on an exposed cell.

## 3. When the work runs

The column walk runs when the camera's tile rectangle changes, the viewed level changes, or a shape changes (`shapeRevision` / `openStamp`). A steady frame does not walk the grid again. It reuses the exposed set. `frameVisits` and `frameLevelVisits` on that frame are 0, and `fullScans` stays 0.

It does not scan the level (256×256) and it does not scan every level in the range. A solid 32-layer world and a solid 5-layer world visit the same cells: the camera bounds, once, at the viewed level, then stop.

The per-frame unit candidate list from Lane K is unchanged (`scan_candidates_only` still counts every unit on the bound planes' levels). A candidate whose column the camera walk covered, and did not mark exposed, returns before a sprite is created or walked. The entity window is a few cells larger than the camera bounds (tall sprites, and the loop seam). A column the walk did not include keeps that window's previous sprite rule, so a unit stepping in at the window's edge still gets a sprite. The membership test is not a grid scan.

## 4. Counters

`UF.Depth.stats().occlusion`:

| Field | Meaning |
|---|---|
| `frameVisits` | Cells walked this frame. 0 on a steady frame. On a rebuild, camera cells plus each lower cell actually entered. |
| `frameLevelVisits` | Lower cells entered this frame. 0 when the viewport is solid, and 0 on a steady frame. |
| `exposedCells` | Lower cells the last rebuild marked exposed. |
| `columnChecks` | Camera cells in that rebuild. |
| `levelVisits` | Lower cells entered in that rebuild. |
| `maskBuilds` | Rebuilds since boot. |
| `fullScans` | Whole-map walks. Stays 0 unless the `no_full_scan` provocation is on. |
| `spriteTouches` | Unit, item, wall and object sprites placed. Covered sprites are not placed. |
| `skippedPaints` | Frames a bound plane skipped its tile repaint because it had no exposed cell. |
| `steadyFrames` | Frames that did not rebuild the mask. |
| `maxDepth` | The live cap (2). |

`UF.Depth.occlusion` is the planner: `plan(input)`, `step(world)`, `boundsOf(bounds)`, `DEFAULT_MAX_DEPTH` (2). `require("game/js/plugins/DEUS_Depth.js")` returns that object under Node, where Tilemap and PIXI are absent. The same `plan` runs in the game.

`plan` input: `viewZ`, `maxDepth`, `zMin`, `zMax`, `size`, `bounds` (`minX`, `minY`, `maxX`, `maxY`, tile space, inclusive at the floor), `shapeStamp`, `isOpen(x, y, z)`, optional `provoke`. The result's `exposed` set holds `"z,x,y"` for lower cells only. `byDepth[d]` is how many cells were exposed at depth `d` (1 is the first level below the view).

`step(world)` applies the plan to `units`, `objects`, `items`, `walls`, `ramps` and `effects`. A drawn record has `scale` 1, `alpha` 1, `filters` null and the entity's own `tint`. Covered entities are not updated. The viewed level is not in the pass.

## 5. Benchmark

`node tools/occlusion/bench_occlusion.js` copies `game/` to a throwaway folder under `%TEMP%` (heavy asset folders are junctions), runs the disposable suite `occlusion_bench` twice, and deletes the folder. `DEUS_TEST_YEAR=0`. One run is `DEUS_Z_RANGE=legacy` (5 levels, −2..+2). The other is `DEUS_Z_RANGE=default` (32 levels, −16..+15).

The scene: the camera rectangle, plus five tiles, is set to solid stone on the viewed level, so caves elsewhere still exist but the viewport is covered. Eight steady frames, then a three-tile pan, still on solid stone. Then one column is opened through the viewed level and the level below, with a floor on the level under that, and units are placed on the exposed floor, on the covered neighbour, and (on the 32-level world) three levels down.

Acceptance is the WBS line: a solid 32-level scene costs about the same as a solid 5-level scene. The counts are the bound (they do not grow with the level count). Milliseconds are one run on this machine. The tolerance used by the script is a gap of 2 ms, or a gap no larger than the smaller of the two medians, because the two launches do not share a quiet machine and the depth update is a small part of the frame. Counts must match exactly for steady visits, steady level visits, steady paint, steady sprite touches, pan level visits and pan paint, and the open shaft's exposed-cell count must match. `maxDepth` must stay 2.

Measured 2026-09-27 on this machine, one pair of launches (`DEUS_TEST_YEAR=0`). The throwaway folder was deleted at the end of the script. Reprint the script to measure again.

| | legacy (5) | default (32) |
|---|---:|---:|
| steady frame visits | 0 | 0 |
| steady level visits | 0 | 0 |
| steady paint delta | 0 | 0 |
| steady sprite touches | 0 | 0 |
| steady median ms | 0.100 | 0.050 |
| pan frame visits | 396 | 396 |
| pan level visits | 0 | 0 |
| pan paint delta | 0 | 0 |
| pan median ms | 0.100 | 0.050 |
| open exposed cells | 2 | 2 |
| open median ms | 0.200 | 0.190 |
| exposed sprite / covered sprite | yes / no | yes / no |
| deep unit exposed | n/a (no z −3) | no, and no sprite |

The three-tile pan walked 396 camera cells and no lower cell, the same count at 5 levels and at 32. The script allows the two pan counts to differ by one camera row (40 cells, or 15 percent), because the display's fraction changes which tile the bounds floor lands on. This run did not need that room. Steady frames walked nothing. The open shaft exposed 2 cells (the open level below the view, and the floor under that) and placed only the unit on the exposed cell. The unit three levels down, which exists only in the 32-level world, was not exposed and had no sprite.

Milliseconds are the median of `lastUpdateMs` over the sampled frames. The steady gap was 0.050 ms and the pan gap was 0.050 ms; the 32-level launch was the faster one. The script's tolerance is a gap of 2 ms, or a gap no larger than the smaller median. 2 ms is several times the noisiest solid sample in this run (0.370 ms) and is the room given to two separate launches that do not share a quiet machine. The counts are the bound. They do not grow with the level count.

## 6. Checks

`node tools/occlusion/test_occlusion_culling.js`

Five checks. `--provoke=<name>` turns that check's bug on and must fail it (exit 0, line `CAUGHT`). `--provoke-all` runs each of those. A normal run exits 0 with `RESULT: 5 passed, 0 failed`.

| Check | What it holds | Provocation |
|---|---|---|
| `covered_not_drawn` | Covered units, objects, items, walls, ramps, effects, and a unit under the first floor, stay at 0 updates for three frames. | Those entities are updated and marked rendered. |
| `exposed_drawn` | The exposed set matches an independent walk. Drawn records are 1:1, untinted by depth, and the viewed level is not in the pass. | Exposed entities are omitted. |
| `cost_proportional` | Solid 32-level and solid 5-level visits equal the camera cell count and do not grow with the map or with `maxDepth` 32. An open shaft of depth 4 visits 4 lower cells, not the range. | Every level of the range is charged for every camera cell. |
| `no_full_scan` | The second and third frames visit 0 cells and `fullScans` is 0. | Every frame walks the whole map. |
| `switch_and_pan` | Closing the cover, panning off the unit, and moving the view above it each stop updates. | The first plan is kept, so the unit keeps updating. |

`node tools/test_layer_render_flat.js --suite depth`, `node tools/depth_demo/test_depth_demo.js`, `node tools/layer_overlays/test_layer_overlays.js` and `node tools/check_deus_syntax.js` stay as they are. `node tools/test_culling_native.js` is run on the base commit and on this tip; `DEUS_Culling.js` is not edited.

## 7. Open questions (not decided here)

- DEC-017 leaves the custom map-renderer go/no-go open until the Owner has the benchmarks. These numbers are an input to that. They are not the decision.
- The WBS row cites DEC-018. In `docs/OWNER_DECISIONS.md`, DEC-018 is the spell ruling and DEC-021 is the occlusion ruling this lane implements, with V133 and V149. The WBS text is not changed here.

## 8. Follow-ups

- `PROPOSED-BE-01`: paint only the exposed spots of a plane that has a mixed window. Lane K `mask_order` currently requires the covered depth-2 texel to remain on the canvas, so this lane still paints the whole window whenever any cell of that plane is exposed.
- `PROPOSED-BE-02`: a third pooled plane, if the Owner raises `MaxDepth` above 2. The walk already stops at the first opaque cell, so solid cover would not start costing the extra levels. The parameter clamp and the two-plane pool are unchanged.
- `PROPOSED-BE-03`: ask `naturalWallCells` and `UF.Items.find` for exposed runs only. On a mixed window they still read the whole entity window; sprites are then kept only for exposed cells. A solid window skips that read.
