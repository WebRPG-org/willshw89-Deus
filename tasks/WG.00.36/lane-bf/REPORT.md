# WG.00.36 Lane BF report

Cross-layer multi-unit selection and group orders. This report does not treat a pass as certification. The PM runs the gate tests on the tip, then Gemini reviews.

## What changed

- `game/js/plugins/DEUS_Select.js` — a drag on the viewed level also takes player units on lower levels whose cell `UF.LayerOverlays.cellVisible` accepts. Shift+drag adds those units. Shift+click and plain click hit the viewed unit when one stands there, and otherwise the topmost unit in a visible lower cell. A group move uses one V68 ring on the clicked level; every order's `z` is that level. Changing the viewed level cancels a drag and does not clear the group. A unit that changes level stays selected and keeps its move order. The box reads an occupancy map of the units in the box's visible cells. It does not walk every unit on later frames of the same drag.
- `game/js/plugins/DEUS_LayerOverlays.js` — exports `cellVisible` (the existing `pointVisible` walk). A selection square is drawn for `unit.selected`, `unit.data.selected`, or `UF.Select.isSelected(id)`. The square stays one cell at scale 1, with no filter, blur, tint, fog, or fade.
- `docs/systems/UF_Select.md` — section 8 is the gesture table, the group-move rule, the API, and the new checks.
- `tools/select_xlayer/test_xlayer_select.js` — the five checks, each with a provocation.

Designation tools (chop, mine, stockpile, and the rest) still mark only the level the drag started on. Hotkeys are unchanged. No art was generated.

## Rules

**Visible.** A lower cell is eligible only when `UF.LayerOverlays.cellVisible({ x, y, z, viewZ, maxDepth, opaque })` returns true. `opaque` is `UF.Depth.isOpen(...) !== true`. The viewed level's own units are eligible. A unit under a solid cell, above the view, or deeper than `UF.Depth.config.maxDepth` (2 when Depth does not say otherwise) is not. Select does not repeat that walk. If `DEUS_LayerOverlays` is not loaded, the live box stays on the viewed level rather than guessing cover.

**Gestures.** Plain drag replaces the group with the player units in the box on the viewed level and on visible lower levels. Shift+drag adds them and does not remove anyone already selected. Shift+click toggles one unit: the viewed cell wins, and an empty viewed cell toggles the topmost visible unit below. Plain click on empty ground still clears the group.

**Group move.** `T = (x, y, Zt)` is the clicked cell. One V68 formation is searched on `Zt` only (standable cells, Chebyshev rings, no corner cutting, nearest unit takes the nearest cell). Every selected unit, on any level, gets a slot in that ring. The order is `{ area, x, y, z: Zt }`. A unit not yet on `Zt` paths there across slopes, stairs, and ramps. The order object is not rewritten when the unit's level changes. A unit with no free cell is still counted: `"N moving; M found no free cell."` On the ground the standable area is `{ x, y }` with no `z` field, the same call the single-level move used.

**Selection square.** Viewed-level corners stay in the tilemap. A selected unit on a lower visible level gets the overlay's existing selection square, at 1:1. The id is not written onto the saved unit.

## Open questions (not answered)

- `DEUS_Depth` still draws at most `maxDepth` (2) levels below the view. A unit further down an open shaft is not selectable, because that level is not drawn. Whether selection should reach past the drawn planes is the same open question as `docs/systems/DEUS_LayerOverlays.md` section 7.
- The depth-demo HP bar versus the combat bar on lower layers remains the open question in that same section. This lane did not change bar geometry.

## Follow-ups

- `PROPOSED-BF-01`: a formation computed on each unit's current level, instead of one ring on the clicked level, if the Owner wants the group to keep its spacing on the level it is leaving.
- `PROPOSED-BF-02`: Shift+click cycles the units stacked in one column. Today the viewed unit wins, and the lower unit is reached only when that viewed cell is empty.
- `PROPOSED-BF-03`: the snapshot suite `select` is registered four times (Core requires `DEUS_Select`, the harness also loads the `UF_Select` shim, and `registerSelectChecks` runs at load and at boot). Two of the four runs do not own the input handler and fail. That is already true on base `ecc7b898`. The two runs that own the handler pass every check. Fixing the double registration is outside this task's gestures.

## Registration request

`DEUS_LayerOverlays` is still not in `game/js/plugins.js` (the WG.00.35 request was not applied). Live cross-layer picking and the lower-layer selection square call that plugin. Until it is loaded, a box stays on the viewed level. The PM adds this after `DEUS_Depth`. No parameters. Not added in this lane.

```json
{
  "name": "DEUS_LayerOverlays",
  "status": true,
  "description": "[DEUS LayerOverlays] Lower-layer effects, HP bars, status, and combat/spell overlays at 1:1 with no filters (DEC-011).",
  "parameters": {}
}
```

## Gate tests

Run in this worktree on the tip, before the commit that adds this report.

### `node tools/select_xlayer/test_xlayer_select.js`

```
PASS box_visible
PASS shift_layers
PASS group_orders
PASS survive
PASS perf
RESULT: 5 passed, 0 failed
EXIT:0
```

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
BENCH buried hp=32 lowerHp=0 overlays=96 lower=0 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.367 steadyMs=
BENCH shaft-depth-2 hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.482 steadyMs=
BENCH shaft-depth-31 hp=48 lowerHp=16 overlays=144 lower=48 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.364 steadyMs=
BENCH cues-on hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=6 steadyAlloc=undefined rebuildMs=0.113 steadyMs=
BENCH steady hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=undefined steadyAlloc=0 rebuildMs=2.392 steadyMs=0.010
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

`--provoke=<name>` makes that check FAIL (exit 1). `--provoke-all` runs each in a child and exits 0 only when every child failed.

`node tools/select_xlayer/test_xlayer_select.js --provoke=box_visible`

```
FAIL box_visible — unit under solid cover was picked
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

The other four provocations fail their own checks the same way: shift drops the unit that should have been kept, an off-level order is retargeted to the unit's old level, the group and the 1:1 square are dropped on a level change, and the box walks every unit on every frame.

## Existing `select` suite (base and tip)

Command on the tip (this worktree):

`node tools/test_snapshot.js --name lane_bf_select_tip --plugins UF_Select --suite select`

```
RESULT: 73 passed, 23 failed (exit 1)
EXIT:1
```

Command on base `ecc7b8984a0ab1a919595c792f98a60f18872f73` (throwaway checkout under `%TEMP%\lane_bf_select_base`, deleted after the run):

`node tools/test_snapshot.js --name lane_bf_select_base --plugins UF_Select --suite select`

```
RESULT: 73 passed, 23 failed (exit 1)
EXIT:1
```

The suite is registered four times, so it runs four times. On both base and tip the 1st and 3rd runs fail and the 2nd and 4th runs pass every check, including `select.box_units` (3 units), `select.shift_adds` (A=1, A+B=2, plain B=1, toggle=2), `select.group_move` (5 jobs, 5 distinct cells), and `select.level_scope`. The 23 FAIL lines are the same check names on both commits:

`box_units`, `shift_adds`, `tool_chop_area`, `tool_skips_ineligible`, `tool_obeys_unlocks`, `zone_saved` (first failing run only), `leave_tool`, `target_square_brackets`, `drag_release_dismisses_square`, `tile_deselect_right_click`, `tile_deselect_esc`, `tile_deselect_left_click`.

No check that passed on a base run fails on the matching tip run. The duplicate registration is `PROPOSED-BF-03`. The snapshots were under `%TEMP%` and were deleted before the commit.
