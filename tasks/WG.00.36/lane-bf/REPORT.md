# WG.00.36 Lane BF report

Cross-layer multi-unit selection and group orders. This report does not treat a pass as certification. The PM runs the gate tests on the tip, then Gemini reviews.

This pass answers the Codex review of `32a9d3b9` (`tasks/WG.00.36/lane-bf/review_codex_32a9d3b9.md`, review commit `62f4ba72`). M1, M2, and M3 are fixed inside the lane's allowed paths. No new Owner decision was required.

## What changed

- `game/js/plugins/DEUS_Select.js` — a lower cell is eligible only while `UF.Depth` is drawing it. If that plugin is loaded and `config.enabled` is not true, the reach is 0. `config.maxDepth` and `config.exposes` then cap the planes the renderer will bind. The occupancy index is updated from unit add, remove, move, area, and level events. A drag's setup and release read the buckets for the cells in the box. They do not walk `UF.World.units()`. The index is rebuilt from that list only when the listeners bind (if units are already present) and when a save loads. A level change keeps the id and the move order and moves the unit's bucket. A view change keeps the group and cancels a drag whose level is no longer the view.
- `docs/systems/UF_Select.md` — section 8 now states the drawing flag, the expose walk, the event index, and the known snapshot-suite baseline.
- `tools/select_xlayer/test_xlayer_select.js` — the five checks load `DEUS_Select.js` with `PluginManager` present and drive the live drag, click, `groupMove`, level-change, and view-change paths. `--provoke=<name>` breaks that live path.

`DEUS_LayerOverlays.js` is unchanged. Designation tools still mark only the level the drag started on. Hotkeys are unchanged. No art was generated.

## Rules

**Visible.** A lower cell is eligible only when `UF.LayerOverlays.cellVisible` returns true and the renderer would draw that plane. `opaque` is `UF.Depth.isOpen(...) !== true`. The viewed level's own units are eligible. A unit under a solid cell, above the view, deeper than the reach, or on a plane `config.exposes` will not bind is not. If `UF.Depth` is loaded and `config.enabled` is not true, nothing below the view is eligible. Turning drawing off or on takes effect on the next click or box. If `DEUS_LayerOverlays` is not loaded, the live box stays on the viewed level rather than guessing cover. If `DEUS_Depth` is not loaded, the cap stays 2.

**Gestures.** Plain drag replaces the group with the player units in the box on the viewed level and on visible lower levels. Shift+drag adds them and does not remove anyone already selected. Shift+click toggles one unit: the viewed cell wins, and an empty viewed cell toggles the topmost visible unit below. Plain click on empty ground still clears the group.

**Group move.** `T = (x, y, Zt)` is the clicked cell. One V68 formation is searched on `Zt` only (standable cells, Chebyshev rings, no corner cutting, nearest unit takes the nearest cell). Every selected unit, on any level, gets a slot in that ring. The order is `{ area, x, y, z: Zt }`. A unit not yet on `Zt` paths there across slopes, stairs, and ramps. The order object is not rewritten when the unit's level changes. A unit with no free cell is still counted: `"N moving; M found no free cell."` On the ground the standable area is `{ x, y }` with no `z` field. On any other level the area carries `z`.

**Selection square.** Viewed-level corners stay in the tilemap. A selected unit on a lower visible level gets the overlay's existing selection square, at 1:1. The id is not written onto the saved unit.

**Box cost.** Setup, a later frame of the same drag, and release read units only from the buckets of the cells the box tests. A unit that was never added, moved, or loaded into the index is not visited by that walk.

## Open questions (not answered)

- `DEUS_Depth` still draws at most `maxDepth` (2) levels below the view. A unit further down an open shaft is not selectable, because that level is not drawn. Whether selection should reach past the drawn planes is the same open question as `docs/systems/DEUS_LayerOverlays.md` section 7.
- The depth-demo HP bar versus the combat bar on lower layers remains the open question in that same section. This lane did not change bar geometry.

## Follow-ups

- `PROPOSED-BF-01`: a formation computed on each unit's current level, instead of one ring on the clicked level, if the Owner wants the group to keep its spacing on the level it is leaving.
- `PROPOSED-BF-02`: Shift+click cycles the units stacked in one column. Today the viewed unit wins, and the lower unit is reached only when that viewed cell is empty.
- `PROPOSED-BF-03`: the snapshot suite `select` is registered four times (Core requires `DEUS_Select`, the harness also loads the `UF_Select` shim, and `registerSelectChecks` runs at load and at boot). Two of the four runs do not own the input handler and fail. That is already true on base `ecc7b898`. The two runs that own the handler pass every check. Fixing the double registration is outside this task's gestures.

## Registration request

`DEUS_LayerOverlays` is still not in `game/js/plugins.js` (the WG.00.35 request was not applied). Live cross-layer picking and the lower-layer selection square call that plugin. Until it is loaded, a box stays on the viewed level. The PM adds this after `DEUS_Depth`. No parameters. Not added in this lane. `game/js/plugins.js` is outside allowedPaths.

```json
{
  "name": "DEUS_LayerOverlays",
  "status": true,
  "description": "[DEUS LayerOverlays] Lower-layer effects, HP bars, status, and combat/spell overlays at 1:1 with no filters (DEC-011).",
  "parameters": {}
}
```

## Gate tests

Run in this worktree on the tip, before the commit that adds this report. PowerShell `EXIT:` is `$LASTEXITCODE` after the node process.

### `node tools/select_xlayer/test_xlayer_select.js`

```
PASS box_visible
PASS shift_layers
DEBUG_GROUPMOVE_ORDER: C.isColonist=true, orderedJob=1
DEBUG_GROUPMOVE_ORDER: C.isColonist=true, orderedJob=2
DEBUG_GROUPMOVE_J_CREATE: orderedJob=3
DEBUG_GROUPMOVE_ORDER: C.isColonist=true, orderedJob=4
DEBUG_GROUPMOVE_J_CREATE: orderedJob=5
DEBUG_GROUPMOVE_ORDER: C.isColonist=true, orderedJob=6
PASS group_orders
DEBUG_GROUPMOVE_ORDER: C.isColonist=true, orderedJob=7
DEBUG_GROUPMOVE_ORDER: C.isColonist=true, orderedJob=8
PASS survive
PASS perf
RESULT: 5 passed, 0 failed
EXIT:0
```

The `DEBUG_GROUPMOVE_*` lines are the existing logs inside `groupMove`. The live check calls that function.

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
BENCH buried hp=32 lowerHp=0 overlays=96 lower=0 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.403 steadyMs=
BENCH shaft-depth-2 hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.507 steadyMs=
BENCH shaft-depth-31 hp=48 lowerHp=16 overlays=144 lower=48 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.271 steadyMs=
BENCH cues-on hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=6 steadyAlloc=undefined rebuildMs=0.124 steadyMs=
BENCH steady hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=undefined steadyAlloc=0 rebuildMs=1.971 steadyMs=0.009
PASS benchmark_32_layers
PASS benchmark_32_layers_mutant_killed
RESULT: 40 passed, 0 failed
EXIT:0
```

### `node tools/check_deus_syntax.js`

```
Checked 60 DEUS plugin files. Errors: 0
EXIT:0
```

## Provocations

`--provoke=<name>` sets `UF_TEST_PROVOKE=xlayer.<name>` before the plugin loads, so the live path misbehaves. The check expects the correct result and FAILs. `--provoke-all` runs each in a child and exits 0 only when every child failed.

`node tools/select_xlayer/test_xlayer_select.js --provoke=box_visible`

```
FAIL box_visible — unit under solid cover was picked
RESULT: 0 passed, 1 failed
EXIT:1
```

`node tools/select_xlayer/test_xlayer_select.js --provoke=shift_layers`

```
FAIL shift_layers — shift across levels got 1,9,10,2,5
RESULT: 0 passed, 1 failed
EXIT:1
```

`node tools/select_xlayer/test_xlayer_select.js --provoke=group_orders`

```
DEBUG_GROUPMOVE_ORDER: C.isColonist=true, orderedJob=1
DEBUG_GROUPMOVE_ORDER: C.isColonist=true, orderedJob=2
DEBUG_GROUPMOVE_J_CREATE: orderedJob=3
DEBUG_GROUPMOVE_ORDER: C.isColonist=true, orderedJob=4
DEBUG_GROUPMOVE_J_CREATE: orderedJob=5
DEBUG_GROUPMOVE_ORDER: C.isColonist=true, orderedJob=6
FAIL group_orders — order 3 z -1 from -1
RESULT: 0 passed, 1 failed
EXIT:1
```

`node tools/select_xlayer/test_xlayer_select.js --provoke=survive`

```
DEBUG_GROUPMOVE_ORDER: C.isColonist=true, orderedJob=1
DEBUG_GROUPMOVE_ORDER: C.isColonist=true, orderedJob=2
FAIL survive — selection dropped the unit that changed level
RESULT: 0 passed, 1 failed
EXIT:1
```

`node tools/select_xlayer/test_xlayer_select.js --provoke=perf`

```
FAIL perf — 1x1 setup pick world-unit reads=4002
RESULT: 0 passed, 1 failed
EXIT:1
```

`node tools/select_xlayer/test_xlayer_select.js --provoke-all`

```
CAUGHT box_visible exit 1
CAUGHT shift_layers exit 1
CAUGHT group_orders exit 1
CAUGHT survive exit 1
CAUGHT perf exit 1
PROVOKE-ALL: 5/5 caught
EXIT:0
```

What each provocation breaks, on the live path:

- `box_visible` makes `columnVisible` accept every cell, so the drag picks the unit under solid cover.
- `shift_layers` treats the Shift+drag as a replace, so the unit outside the box is dropped. The ids above are the box contents without that unit.
- `group_orders` writes each order's `z` as the unit's level at the click. Unit 3 started on -1, so its order is not the clicked level.
- `survive` clears the group when `world:unitLevelChanged` fires.
- `perf` walks `World.units()` inside the box query. Setup of a 1×1 box read 4002 world units (4000 far plus the two in the cell).

## What the live checks do

Each check boots `DEUS_Select.js` in a vm with `PluginManager` defined and calls the real input and order functions.

- `box_visible` drags and clicks with drawing on, off, and on again, and with `exposes` limiting the reach to one plane.
- `shift_layers` Shift+drags, plain-drags, and Shift+clicks through the real gesture code.
- `group_orders` calls `groupMove`. Colonists go through `C.order`. The other unit goes through `J.create`. Each order then walks a slope connector to the order's level. The ground formation area has no `z`; a target on -1 passes `z`.
- `survive` moves a unit with `world:unitLevelChanged`, checks the next box reads the new cell, keeps the job target object, cancels an open drag on `levels:viewChanged` without clearing the group, and draws the 1:1 lower square from the live `UF.Select.isSelected`.
- `perf` puts 4000 far units in `World.units()` and in the index, then measures world-unit reads on drag setup and release (both 0). A unit placed only in the array is not picked. After `DataManager.extractSaveContents`, that unit is picked and the drag still reads 0 world units.

The slope walk is the harness job follower that `groupMove` calls. `DEUS_World.js` is outside this lane, so this pass does not execute that file's 3D search. The order's level, the connector step, and the selection are what the check asserts.

## Existing `select` suite (base and tip)

Not re-run in this pass. The NW.js snapshot comparison from the previous tip, and the Codex review of `32a9d3b9`, still describe the baseline. On base `ecc7b8984a0ab1a919595c792f98a60f18872f73` and on that tip the command was:

`node tools/test_snapshot.js --name lane_bf_select_tip --plugins UF_Select --suite select`

```
RESULT: 73 passed, 23 failed (exit 1)
EXIT:1
```

The same command on the base checkout produced the same 73/23 split. The review's repeat of the base matched the tip on 96 of 96 check outcomes. The 23 failures are the duplicate registrations named in `PROPOSED-BF-03`. This pass does not change those checks, and it does not treat that exit 1 as a new regression.
