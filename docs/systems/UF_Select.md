# UF_Select
Drag-box selection for units, Shift multi-selection toggle, plain-click ground movement with multi-unit group formation pathfinding, area job designations (chop, gather, pick, mine, quarry, dig, dismantle, floor, wall, stockpile, cancel), bitset stockpile zones, and toolbar UI.

Status: built 2026-09-19. Checks: `select` (15 checks, all PASS on snapshot `select_test`; provoked failure run 0/15 PASS; worst frame time 3.13 ms <= 25 ms budget).

**Owner:** Claude Code · **File:** `game/js/plugins/UF_Select.js` · **Load order:** after `UF_World`, `UF_Objects`, `UF_Items`, `UF_Jobs`, `UF_Floors`, `UF_Walls`, `UF_Colonists`, `UF_Interact`, `UF_Camera`; before `UF_Test`.

---

## 1. System Overview & Architecture

`UF_Select` implements player interaction for selecting units and issuing area designations over map geometry. It fulfills the requirements of VISION V86:
- Left-click drag boxes dynamically select player-controlled units or designate bulk jobs.
- Plain left-click on a colonist selects them; clicking on open ground with selected units dispatches movement.
- Shift modifier supports union/toggle selection behavior.
- Group movement uses Euclidean-sorted Chebyshev ring targets to dispatch non-overlapping destinations.
- Area designation tools support batch work orders (chop, gather, pick, mine, quarry, dig, dismantle, floor, wall, stockpile, cancel) with progressive frame budgets preventing hitching on large rectangles (up to $30\times 30$).
- Bitset-encoded stockpile zones persist in world state via `JsonEx`.
- A unit box on the viewed level also takes player units on lower levels whose cell is visible through open cells (`UF.LayerOverlays.cellVisible`, the same rule as the depth overlays). Designation tools stay on the box's own level. Switching the viewed level cancels an active drag and does not clear the selection.

---

## 2. Controls, Hotkeys & Toolbar

The top HUD contains a compact toolbar (`Window_UFSelectToolbar`) positioned alongside game speed controls. The toolbar presents active tool state, hotkey glyphs, and tooltips.

| Tool | Hotkey | Action / Effect | Eligible Targets |
|---|---|---|---|
| **Select** | `Space` / `Escape` | Box selection of player units | Colonists, pets, player-faction units |
| **Chop** | `C` | Mark trees for felling | `oak`, `pine`, `birch`, `willow`, etc. |
| **Gather** | `G` | Gather wild plants & crops | Harvestable plants, herbs, bushes |
| **Pick** | `P` | Pick up loose items | Ground items (`UF_Items`) |
| **Mine** | `M` | Mine natural stone/ore | Boulders, mineral veins, rock faces |
| **Quarry** | `R` | Quarry surface stone & gravel | Rubble, loose stones, quarry deposits |
| **Dig** | `V` | Excavate ditches / channels | Diggable soil & earthen terrain |
| **Dismantle**| `T` | Demolish built structures | Player walls, floors, doors, furniture |
| **Floor** | `L` | Lay designated flooring | Open passable terrain |
| **Wall** | `B` | Erect designated walls | Buildable perimeter tiles |
| **Stockpile**| `O` | Designate storage zones | Flat walkable ground |
| **Cancel** | `N` | Cancel pending designations | Open/unclaimed jobs, stockpile cells |

### Gesture & Click Handling
- **Plain Drag**: Initiates when mouse movement exceeds 5 screen pixels while holding Left Button. Draws a tinted selection or tool bounding box with live candidate count.
- **Shift + Drag / Shift + Click**:
  - Without tool: Toggles/unions units into the current selection set.
  - With tool: Appends designations to existing jobs.
- **Right-Click**: Cancels current drag; if no drag is active, clears the active tool and returns to unit selection. Does not bleed through to context menus (`UF_Interact`).
- **Clickthrough Guard**: Dragging or clicking starting over UI windows (`Window_UFSelectToolbar`, colonist cards) never triggers map selection or designations.

---

## 3. Group Movement Formation

When multiple units are selected and the player clicks a destination cell $T = (x_T, y_T)$:
1. Sorts selected units by Euclidean distance to $T$ so closest units claim nearest spots.
2. Iterates outward in concentric Chebyshev rings:
   $$\text{ring } r = 0, 1, 2, \dots, R$$
   where cell offset $(\Delta x, \Delta y)$ satisfies $\max(|\Delta x|, |\Delta y|) = r$.
3. Checks cell validity via `UF.World.isPassable(area, x, y, z)` and ensures no other unit in the group has claimed the slot.
4. Issues a direct `"move"` job to each unit via `UF.Jobs.create({ type: "move", owner: u.id, target: { area, x, y, z } })`.
5. Displays a temporary confirmation notification (e.g. `"5 moving"`).

A mixed-level group uses the same ring on the clicked level. Every order's `z` is that level, including units that are still on another level. See section 8.

---

## 4. Progressive Commit & Performance Budgets

To ensure silky frame rates when dragging large boxes (e.g. $30\times 30 = 900$ tiles):
- **Preview Budget (`previewMs = 2 ms`)**: Incremental candidate tile scanning and caching (`Uint8Array`) during drag so mouse movement remains 60 FPS.
- **Commit Budget (`commitMs = 3 ms`)**: Bulk job creation is segmented into batches processed across sequential frames via `commitBatches`.
- **Worst Frame Time**: Automated benchmark of a full $30\times 30$ box confirmed $3.13\text{ ms}$, well under the $25\text{ ms}$ budget.

---

## 5. Stockpile Zones & Persistence

- Stockpile zones are stored in `UF.World.state.select.zones`.
- Each zone records:
  - `id`: Unique zone ID (`zone_<timestamp>_<rand>`).
  - `name`: Display name (`"Stockpile 1"`).
  - `area`: Area coordinate object `{ x, y }`.
  - `z`: Vertical level index.
  - `bounds`: Bounding rectangle `{ x0, y0, x1, y1 }`.
  - `bitset`: Run-length / bitset array encoding cell inclusion within the bounding box.
- Zones render on screen whenever the Stockpile or Cancel tool is active, displaying a tinted overlay with cell borders and name badge.
- Fully serializable via `JsonEx` across game save/load cycles.

---

## 6. Public API Reference (`UF.Select`)

| Method / Property | Description |
|---|---|
| `selected()` | Returns array of selected unit IDs (`number[]`). |
| `select(ids, opts)` | Sets or updates current selection. `opts.shift` enables union/toggle. |
| `clear()` | Clears current unit selection. |
| `tool()` | Returns active tool ID (`string` or `null`). |
| `setTool(toolId, opts)` | Sets active designation tool (`"chop"`, `"wall"`, etc.) with optional parameters. |
| `box()` | Returns active dragging box `{ x0, y0, x1, y1, tool, area, z }` or `null`. |
| `cancelBox(reason)` | Aborts current drag box. |
| `zones()` | Returns array of stockpile zones for the current area and Z-level. |
| `lastSummary()` | Returns stats of last committed drag (`{ made, skipped }`). |
| `commits()` | Returns array of pending commit batches. |
| `registeredKeys()` | Returns dictionary of hotkey registrations and collision checks. |
| `viewZ()` | Returns current active Z-level from `UF.Levels` or `UF.World`. |
| `isSelected(id)` | True when that unit id is in the group. Lower-layer overlays read this for the selection square. The flag is not written onto the unit, and it is not saved. |
| `UF.SelectX` | Headless cross-layer helpers (`unitsInBox`, `applyBox`, `toggleId`, `visibleUnitAt`, `planGroupOrders`, `retain`, `viewKeeps`, `indexUnits`). `require` of `DEUS_Select.js` returns this object when `PluginManager` is absent. |
| `UF.LayerOverlays.cellVisible(query)` | The column rule a box calls. `query` is `{ x, y, z, viewZ, maxDepth, opaque }`. A cell under any opaque cell above it, above the view, or deeper than `maxDepth` is not visible. |

---

## 7. Verification & Automated Tests

Suite `select` runs 15 checks via `tools/test_snapshot.js --name select_test --plugins UF_Select --suite select`:
1. `select.box_units`: Drags box around units and asserts player colonists and pets are selected while allied guards, wild animals, and outside units are excluded.
2. `select.shift_adds`: Verifies Box A, Shift+Box B, plain Box B, and Shift-click toggle.
3. `select.plain_click`: Verifies single-click unit selection and subsequent ground click dispatching a move job.
4. `select.group_move`: Verifies 5 selected units clicking near an obstacle dispatch to 5 distinct destination cells in Chebyshev formation rings.
5. `select.tool_chop_area`: Verifies hotkey 'C' and drag felling 4 designated oaks.
6. `select.tool_skips_ineligible`: Verifies skipping already designated cells and options gated by action predicates.
7. `select.tool_obeys_unlocks`: Verifies `UF.Tech.canBuild` locks reject designations and record reasons in commit summary.
8. `select.zone_saved`: Verifies stockpile zone creation and lossless `JsonEx` serialization round-trip.
9. `select.cancel_area`: Verifies hotkey 'N' cancels unowned area designations without terminating owned in-progress jobs.
10. `select.no_clickthrough`: Verifies drags beginning over UI windows never select map tiles or units.
11. `select.leave_tool`: Verifies right-click clears the active tool without opening context menus.
12. `select.level_scope`: Verifies switching Z-levels mid-drag cleanly cancels the box.
13. `select.keys_free`: Verifies no conflicting hotkey bindings.
14. `select.big_rect_frame_time`: Verifies $30\times 30$ box commit executes within frame timing budget ($3.13\text{ ms} \le 25\text{ ms}$).
15. `select.no_errors`: Verifies zero console errors thrown across the entire suite.

All 15 checks have been verified with clean passes (15/15 PASS) and provoked failures (`UF_TEST_PROVOKE = "select.all"`, 0/15 PASS, exit 1).

The file registers further checks after those 15 (tile clicks, the wall button, and others). WG.00.36 does not change them. Cross-layer checks are section 8.

## 8. Cross-layer selection and group orders (WG.00.36)

Selection can hold units on several levels at once. Orders for that group use one flat formation on the level the player clicked. Cover is never reimplemented here: a lower cell is eligible only when `UF.LayerOverlays.cellVisible` says so. That is the same walk the overlay planner uses (`pointVisible`): not above the view, not past `UF.Depth.config.maxDepth` (2 unless the depth plugin says otherwise), and every layer strictly above the unit through the view is open. `UF.Depth.isOpen` answers the single-cell question. A unit standing on the viewed level is eligible even when that cell is solid, because nothing is above them. A unit under solid cover is not. A unit on a level the renderer does not draw (deeper than `maxDepth`) is not.

The occupancy map is built from `UF.World.units()` once when a drag starts and again when the button is released. While the rectangle is unchanged, a later frame does no work. When the rectangle grows, the pick reads only the buckets for visible cells inside it. It does not walk every unit in the world on those frames.

### Gestures

The viewed level is `viewZ()`. "Visible lower" means a level from `viewZ - 1` down through `viewZ - maxDepth` whose cell passes `cellVisible`. Hotkeys, toolbar tools, Esc, and right-click-to-leave-a-tool are unchanged. Designation drags (chop, mine, stockpile, and the rest) still mark only the level the drag started on.

| Gesture | Viewed level | Visible lower level | Hidden, above the view, or past `maxDepth` |
|---|---|---|---|
| Plain click | Selects that unit and replaces the group. Unchanged when a unit stands on the viewed cell. | If the viewed cell has no unit, selects the topmost unit in the column. | Not hit. |
| Plain click on empty ground | Clears the selection. Unchanged. | A visible unit in the column is a unit click, not ground. | Clears when the column shows nobody. |
| Shift+click | Toggles that unit. Unchanged. | Toggles the topmost unit in the column when the viewed cell is empty. | No toggle. |
| Plain drag | Replaces the group with player units in the box on this level. | Also takes player units in the box on visible lower cells. | Never taken. |
| Shift+drag | Adds the units in the box. Does not remove units outside it. | Adds those visible units too. | Never added. |
| Right-click, or Move here | Group move (below). | The same order. | A unit already selected still gets an order. |
| View level changes | Cancels an in-progress drag (`select.level_scope`). | The group stays. | The group stays. |
| Unit walks onto another level | Stays selected. Its move order is not cleared or rewritten. | The selection square is drawn by the lower-layer overlay when the cell is visible. | No square while the cell is not visible. The id stays selected. |

Shift+drag adds. It does not toggle off units that are already selected inside the new box. Shift+click toggles one unit. Both match the single-level gestures.

A click prefers the viewed cell. A colonist standing on the viewed cell is the one who is toggled, even if another colonist is visible in the shaft below. To toggle the lower colonist, the viewed cell has to be empty so the click goes through the opening.

### Group move

The clicked cell is `T = (x, y, Zt)` with `Zt` the level of the click (the viewed level for a map click).

1. One V68 formation is searched on `Zt` only: standable cells, Chebyshev rings out to `formationRadius` (12), no corner cutting, nearest unit (horizontal distance, then id) takes the nearest cell.
2. Every selected unit, including units on other levels, is in that one assignment. Each order is `{ area, x, y, z: Zt }`.
3. A unit that is not yet on `Zt` keeps that order while it crosses a slope, stair, or ramp. Selection does not cancel the job when `world:unitLevelChanged` fires, and it does not clear the group when `levels:viewChanged` fires.
4. A unit with no free cell left is counted as before: `"5 moving; 1 found no free cell."` The formation is not a second ring on the unit's current level.

On the ground (`Zt` 0) the standable query is the same `{ x, y }` area object the single-level move used, so an all-on-one-level group gets the same cells as before.

### Selection square

Units on the viewed level keep the existing selection corners in the tilemap. A selected unit on a lower visible level gets the overlay's selection square (`DEUS_LayerOverlays`, kind `selection`): one cell, scale 1, no filter, blur, tint, fog, or fade (DEC-011). The overlay asks `UF.Select.isSelected(id)` and still honours `unit.selected` / `unit.data.selected`. Nothing is written onto the saved unit.

### Checks

`node tools/select_xlayer/test_xlayer_select.js` checks the five rules above (`box_visible`, `shift_layers`, `group_orders`, `survive`, `perf`). `--provoke=<name>` makes that check FAIL (exit 1). `--provoke-all` runs each provocation and exits 0 only when every one failed. The snapshot suite in section 7 is unchanged and must still pass.

---
