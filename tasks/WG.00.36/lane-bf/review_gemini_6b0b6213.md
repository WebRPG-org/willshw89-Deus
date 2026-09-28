# Independent Gemini Review — WG.00.36 / lane-bf

Review Date: 2026-09-27  
Writer: Grok  
Reviewed Commit: `6b0b6213a19148597706bf903640c6fde1e66098`  
Branch: `task/lane-bf`  
Merge Base with `origin/main`: `ecc7b8984a0ab1a919595c792f98a60f18872f73`  
Reviewer: Gemini (Independent non-author review per DEC-034 / CANONICAL_ROLES.md)

---

## 1. Identity & Scope Verification

### Branch and Commits
- Current branch: `task/lane-bf`
- Reviewed writer tip: `6b0b6213a19148597706bf903640c6fde1e66098`
- Merge base with `origin/main` (`ecc7b8984a0ab1a919595c792f98a60f18872f73`): verified via `git merge-base` as `ecc7b8984a0ab1a919595c792f98a60f18872f73`.
- Changes from merge-base to writer tip inspected:

| Changed Path | `allowedPaths` Match | Scope Assessment |
|---|---|---|
| `docs/systems/UF_Select.md` | `docs/systems/UF_Select.md` | Full cross-layer spec, gestures, reach rules, performance, baseline notes |
| `game/js/plugins/DEUS_LayerOverlays.js` | `game/js/plugins/DEUS_LayerOverlays.js` | Exported `cellVisible(query)`, `unitMarked(unit)` checking `UF.Select.isSelected(id)`, 1:1 selection square |
| `game/js/plugins/DEUS_Select.js` | `game/js/plugins/DEUS_Select.js` | Cross-layer picking, `depthReach` drawing guard, event-driven spatial occupancy index, group orders on clicked Z, level retention |
| `tasks/WG.00.36/lane-bf/BRIEF.md` | `tasks/WG.00.36/**` | Task contract |
| `tasks/WG.00.36/lane-bf/REPORT.md` | `tasks/WG.00.36/**` | Writer report addressing Codex review |
| `tasks/WG.00.36/lane-bf/lane.json` | `tasks/WG.00.36/**` | Lane configuration and gates |
| `tasks/WG.00.36/lane-bf/launches/20260927_164900_prompt.txt` | `tasks/WG.00.36/**` | Writer prompt log |
| `tasks/WG.00.36/lane-bf/review_codex_32a9d3b9.md` | `tasks/WG.00.36/**` | Previous Codex review report |
| `tools/select_xlayer/test_xlayer_select.js` | `tools/select_xlayer/**` | Comprehensive live-path integration test harness with 5 checks and 5 provocations |

All 9 files changed between merge-base and writer tip strictly conform to `allowedPaths` in `lane.json`.

### Art & Audio Policy (DEC-007)
- Changes are strictly limited to JavaScript plugins, test tools, Markdown specifications, and lane metadata.
- Zero modifications to `art/`, `game/img/`, `game/audio/`.
- Zero art or audio generation models invoked. Zero new sprite or audio assets added. Existing drawn primitives (1:1 selection square) are reused.

---

## 2. Verification of Prior Codex Findings (M1, M2, M3)

### M1: Disabled Depth Drawing Prevents Lower Picks (Verified Clean)
- **Requirement:** Lower-layer units must only be selectable if the renderer is actually drawing that lower layer plane. If `UF.Depth` is loaded and `config.enabled !== true`, lower units must not be pickable.
- **Production Implementation:** In `game/js/plugins/DEUS_Select.js`:
  ```javascript
  function depthReach(viewZ) {
      const D = window.UF && UF.Depth;
      if (!D || !D.config) return 2;
      if (D.config.enabled !== true) return 0;
      let n = 2;
      const raw = D.config.maxDepth;
      if (typeof raw === "number" && raw >= 0) n = raw | 0;
      const exposes = D.config.exposes;
      if (typeof exposes !== "function") return n;
      let reach = 0;
      let z = viewZ | 0;
      while (reach < n) {
          if (exposes(z) !== true) break;
          reach++;
          z--;
      }
      return reach;
  }
  ```
  `columnVisible`, `queryBoxUnits`, and `resolveClickUnit` pass `maxDepth: depthReach(viewZ)`. When `D.config.enabled !== true`, `depthReach` returns `0`, causing `pointVisible` in `DEUS_LayerOverlays.js` to return `false` for any `z < viewZ`, and bounding the search loops to `viewZ`.
- **Independent Probe Verification:** Evaluated with live production functions:
  - Single click with `depth.config.enabled = true`: lower unit selected (`true`).
  - Single click with `depth.config.enabled = false`: lower unit selected (`false`).
  - Box drag with `depth.config.enabled = false`: lower unit selected (`false`).
  - Box drag with `depth.config.enabled = true`: lower unit selected (`true`).
- **Conclusion:** Finding M1 is completely resolved.

### M2: Box Selection Locality & No World Scans (Verified Clean)
- **Requirement:** Box selection cost must scale with units in the box's visible cells, not with all units in the world; no per-frame full scan at drag start, preview, or release.
- **Production Implementation:** In `game/js/plugins/DEUS_Select.js`:
  - A persistent spatial hash `occMap` (`Map<cellKey, unit[]>`) is maintained purely by event listeners (`world:unitAdded`, `world:unitMoved`, `world:unitAreaChanged`, `world:unitLevelChanged`, `world:unitRemoved`) and re-seeded upon `DataManager.extractSaveContents` / boot.
  - `queryBoxUnits(box, force)` queries only the spatial buckets for the cells in the bounding box (`cellUnits(area, x, y, z)`). It never calls `World.units()` during drag setup, dragging preview frames, or release commit.
- **Independent Probe Verification:** Evaluated a world populated with 4,000 distant units plus 1 target lower unit, instrumented with a Proxy tracking reads on the world units array:
  - Drag setup reads: `0`
  - Drag preview reads: `0`
  - Drag release reads: `0`
  - Selected unit: `[ 10 ]` (the single unit in the box).
- **Conclusion:** Finding M2 is completely resolved.

### M3: Live Transition, Group Order, and Retention Integration Tests (Verified Clean)
- **Requirement:** Tests must verify production paths, live event listeners, actual orders dispatched to `C.order` / `J.create`, connector/slope traversal, level retention, view change behavior, and 1:1 lower-plane selection rings, rather than detached surrogate helpers.
- **Test Implementation:** `tools/select_xlayer/test_xlayer_select.js` now implements `bootLive()` which initializes `DEUS_Select.js` with `PluginManager` present:
  - `checkBox`: Drives real `TouchInput` drag and click through `Scene_Map.updateOverseerControls()` and `Scene_Map.update()`, dynamically toggling `UF.Depth.config.enabled` on/off and checking exposed plane caps (`config.exposes`).
  - `checkShift`: Drives live Shift+drag, plain-drag replacement, and Shift+click toggling through `resolveClickUnit`.
  - `checkOrders`: Calls live `Select.groupMove()`, verifies formation generation on clicked Z, verifies `C.order` for colonists and `J.create` for non-colonists, executes slope steps (`job.steps.some(s => s.via === 'slope')`), and verifies unit selection retention throughout traversal.
  - `checkSurvive`: Dispatches `world:unitLevelChanged`, asserts spatial bucket re-indexing, asserts move order target object retention without mutation, dispatches `levels:viewChanged` mid-drag to verify drag cancellation without clearing selection, and verifies 1:1 lower-layer selection square generation via `UF.LayerOverlays.sync()`.
  - `checkPerf`: Instruments a 4,000-unit world and verifies zero world-unit reads on drag setup and release, verifies un-indexed units are not scanned until save extraction re-seeds the index.
  - Every check has a corresponding provocation (`--provoke=<name>`) that mutates the live production behavior and reproducibly triggers a `FAIL` (exit 1).
- **Conclusion:** Finding M3 is completely resolved.

---

## 3. Independent Gate Execution & Results

### Gate 1: Cross-Layer Selection Test Suite
Command: `node tools/select_xlayer/test_xlayer_select.js`
```text
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
EXIT: 0
```

### Gate 2: Layer Overlays Test Suite & Benchmarks
Command: `node tools/layer_overlays/test_layer_overlays.js`
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
BENCH buried hp=32 lowerHp=0 overlays=96 lower=0 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.764 steadyMs=
BENCH shaft-depth-2 hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.160 steadyMs=
BENCH shaft-depth-31 hp=48 lowerHp=16 overlays=144 lower=48 bad=0 dx=undefined steadyAlloc=undefined rebuildMs=0.269 steadyMs=
BENCH cues-on hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=6 steadyAlloc=undefined rebuildMs=0.111 steadyMs=
BENCH steady hp=34 lowerHp=2 overlays=102 lower=6 bad=0 dx=undefined steadyAlloc=0 rebuildMs=2.035 steadyMs=0.014
PASS benchmark_32_layers
PASS benchmark_32_layers_mutant_killed
RESULT: 40 passed, 0 failed
EXIT: 0
```

### Gate 3: DEUS Syntax Check
Command: `node tools/check_deus_syntax.js`
```text
Checked 60 DEUS plugin files. Errors: 0
EXIT: 0
```

### Provocation Suite Execution
Command: `node tools/select_xlayer/test_xlayer_select.js --provoke-all`
```text
CAUGHT box_visible exit 1
CAUGHT shift_layers exit 1
CAUGHT group_orders exit 1
CAUGHT survive exit 1
CAUGHT perf exit 1
PROVOKE-ALL: 5/5 caught
EXIT: 0
```

Individual Provocation Verifications:
- `node tools/select_xlayer/test_xlayer_select.js --provoke=box_visible`:
  `FAIL box_visible — unit under solid cover was picked` -> EXIT: 1
- `node tools/select_xlayer/test_xlayer_select.js --provoke=shift_layers`:
  `FAIL shift_layers — shift across levels got 1,9,10,2,5` -> EXIT: 1
- `node tools/select_xlayer/test_xlayer_select.js --provoke=group_orders`:
  `FAIL group_orders — order 3 z -1 from -1` -> EXIT: 1
- `node tools/select_xlayer/test_xlayer_select.js --provoke=survive`:
  `FAIL survive — selection dropped the unit that changed level` -> EXIT: 1
- `node tools/select_xlayer/test_xlayer_select.js --provoke=perf`:
  `FAIL perf — 1x1 setup pick world-unit reads=4002` -> EXIT: 1

---

## 4. Findings

### BLOCKER
None.

### MAJOR
None. Prior findings M1, M2, and M3 from review `32a9d3b9` have been fully and properly resolved.

### MINOR / Integration Notes
- **I1 (Pre-existing registration dependency):** `DEUS_LayerOverlays` is not yet registered in `game/js/plugins.js`. The registration entry has been documented in `REPORT.md` for PM application as required by standing rules.
- **I2 (Pre-existing test harness baseline):** Duplicate registration in the snapshot test suite (`select_test` having 73 pass / 23 fail due to double registration between `DEUS_Core` and the `UF_Select` compatibility shim) is preserved identically between base and tip, with zero regressions.

---

VERDICT: CLEAN PASS
