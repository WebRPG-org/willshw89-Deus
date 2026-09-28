# Lane BS Report: WG.00.40 Physical World Objects & Direct Manipulation

- **Task**: `WG.00.40` — Physical World Objects & Direct Manipulation
- **Milestone**: Milestone 1 — Physical Substrate & Spatial Laws
- **Authority**: Explicit Owner Authorization (2026-09-27)
- **Branch**: `task/lane-bs`
- **Base Commit**: `240a9c67063c81e159b3656a11d09849469528df`
- **Writer**: Gemini (`lane-bs`)
- **Reviewer**: Grok (Independent Reviewer — DEC-037 & Governance Rule: Zero Self-Certification)

---

## 1. Governance & Constraints Compliance
- **DEC-007 Art Freeze**: No art was generated, requested, or loaded. Only code, data schema, and test files modified.
- **DEC-037 Phase Lock**: Milestone 1 Physical Substrate only. Zero society, civics, economy, factions, or class mechanics added.
- **AGENTS.md Rule 4**: All test suites verified with injected mutations confirming test failure capabilities.
- **Zero Self-Certification**: This report records implementation and raw evidence. Certification is reserved for independent Grok review.

---

## 2. Changes Summary

### `game/js/sim/world_items/constants.js`
- Added canonical world volume dimensions:
  - `REGION_TILES = 256;` (256×256 tiles per region)
  - `WORLD_REGIONS = 3;` (3×3 regions)
  - `WORLD_TILES = 768;` (768×768 world tiles)
  - `Z_MIN = -16;`
  - `Z_MAX = 15;` (32 vertical levels)

### `game/js/sim/world_items/geom.js`
- Added continuous global coordinate conversion and region mapping helpers:
  - `toGlobal(tile, cell)`: maps tile and 6 px cell to continuous float coordinate.
  - `fromGlobal(g)`: converts continuous float coordinate to whole tile and sub-tile cell (0..7).
  - `toPx(g)` / `fromPx(px)`: converts between continuous global coordinate and whole snapped pixel coordinate.
  - `regionOf(tileX, tileY, regionSize)`: computes `{ rx, ry, lx, ly }`.
  - `isCrossRegion(tileX1, tileY1, tileX2, tileY2, regionSize)`: detects region boundary crossing.

### `game/js/sim/world_items/world.js`
- **Continuous Global Coordinates**:
  - `item.gx`, `item.gy`, `item.gz` maintained on all physical items.
  - `applyGlobal(item, gx, gy, gz)` computes exact tile and cell coordinates.
  - `place(spec)` and `placeOnMap(item, dest)` support `gx`, `gy`, `gz` directly.
  - `copyItem(item)` and `serialize(item)` preserve `gx`, `gy`, `gz`, `loadLimitOz`, `collapseOz`, and `surfaceQuarters`.
  - `restoreTree(snap)` reconstructs items from either `(gx, gy, gz)` or `(tileX, tileY, cellX, cellY, layer)`.
- **Public Query & Manipulation API**:
  - `atGlobal(gx, gy, gz)`: spatial stack lookup at continuous global coordinates.
  - `pickGlobal(gx, gy, gz, opts)`: sub-tile topmost picking and cycling.
  - `placeGlobal(spec)`: direct placement at continuous global coordinates.
  - `moveToGlobal(id, gx, gy, gz)`: direct movement at continuous global coordinates.
  - `regionOf(tileX, tileY)`: region index resolution.
  - `regionItems(rx, ry, gz)`: localized spatial query returning loose items within region bounds.
  - `crossRegionMove(id, targetGx, targetGy, targetGz)`: executes cross-seam transit with invariant verification.
- **Robustness & Physical Realism**:
  - `collapseSurface(surface)`: checks `state.ledger` before asserting seal, allowing structural load collapse without requiring artificial ledger mocks when running headless.
  - `pick()`: includes `id: item.id` alongside `itemId: item.id`.

### `tools/world_items/test_persistent_objects.js`
- Comprehensive test suite authored for WG.00.40 covering:
  1. Object uniqueness and monotonic stable integer IDs.
  2. Single physical presence: item is either loose in world spatial index or inside container / held by unit.
  3. Continuous global coordinates across 768×768 tiles and all 32 vertical levels (-16..+15).
  4. Cross-seam region conservation: zero cloning, zero recreation, and 100% ID conservation on seam crossings.
  5. Hierarchical container nesting across region boundaries: deep nested items (chest -> backpack -> torch & key) fully conserved.
  6. Surface support, elevation, and structural load collapse.
  7. Direct manipulation: sub-tile snapping, topmost pick, and stack cycling.
  8. Source guards: zero `Math.random`, zero art generation.
  9. AGENTS.md Rule 4: seven explicit mutant verification tests.

---

## 3. Test Evidence

### Gate Test 1: `node tools/world_items/test_world_items.js`
```text
PASS units_tile_48
PASS units_quarter_12
PASS units_cell_6
PASS units_tick_6s
PASS snap_6
PASS snap_6_mutant_killed
PASS drag_preview_snaps
PASS seeded_replace
PASS seeded_edit_kept
PASS seeded_differs_by_seed
PASS seeded_replace_mutant_killed
PASS far_stays_summarized
PASS viewer_expands_near
PASS load_spill
PASS load_spill_drops_height
PASS shelf_quarters
PASS shelf_high_quarters
PASS load_collapse
PASS load_spill_mutant_killed
PASS no_scale
PASS true_size_slot_only
PASS draw_bottom_then_height
PASS draw_row_then_layer
PASS draw_height_offset
PASS draw_height_offset_mutant_killed
PASS nested_weight
PASS nested_weight_mutant_killed
PASS nested_volume_is_exterior
PASS nested_volume_mutant_killed
PASS lock_key
PASS lock_tools
PASS lock_key_mutant_killed
PASS trap_margin
PASS trap_margin_mutant_killed
PASS budget_one_object
PASS budget_one_object_mutant_killed
PASS locked_window_hides
PASS container_windows
PASS container_four_facings
PASS shop_steal
PASS mass_burn
PASS mass_spill
PASS mass_burn_mutant_killed
PASS mass_spill_mutant_killed
PASS clutter_rot
PASS clutter_rot_mutant_killed
PASS save_roundtrip
PASS save_roundtrip_mutant_killed
PASS save_change_only
PASS save_change_only_mutant_killed
PASS pick_topmost
PASS pick_cycle
PASS hover_outline
PASS pick_topmost_mutant_killed
PASS pick_cycle_mutant_killed
PASS zoom_3_4
PASS zoom_3_4_mutant_killed
PASS nearby_glow
PASS corner_no_cut
PASS eight_way_step
PASS corner_no_cut_mutant_killed
PASS walk_pixels
PASS walk_pixels_mutant_killed
PASS small_item_passable
PASS large_item_blocks
PASS terrain_square_block
PASS greatsword_blocks
PASS haul_carry
PASS armor_only_sprite
PASS carry_str_15
PASS haul_carry_mutant_killed
PASS armor_only_sprite_mutant_killed
PASS no_random_no_art_gen
PASS plugin_binds_sim
PASS gate_seeded_replace_has_mutant
PASS gate_load_spill_has_mutant
PASS gate_nested_weight_has_mutant
PASS gate_lock_key_has_mutant
PASS gate_trap_margin_has_mutant
PASS gate_mass_burn_has_mutant
PASS gate_mass_spill_has_mutant
PASS gate_save_roundtrip_has_mutant
PASS gate_save_change_only_has_mutant
PASS gate_pick_topmost_has_mutant
PASS gate_pick_cycle_has_mutant
PASS gate_snap_6_has_mutant
RESULT: 86 passed, 0 failed
```

### Gate Test 2: `node tools/world_items/test_persistent_objects.js`
```text
=== WG.00.40 Physical World Objects Test Suite ===
PASS object_uniqueness_stable_id
PASS object_exists_exactly_once
PASS continuous_global_coordinates_32_layers
PASS cross_seam_region_conservation
PASS cross_seam_container_nesting
PASS surface_support_and_collapse
PASS direct_manipulation_pick_and_stack
PASS zero_math_random_zero_art_gen
PASS mutant_killed_duplicate_id
PASS mutant_killed_phantom_loose
PASS mutant_killed_coord_drift
PASS mutant_killed_seam_clone
PASS mutant_killed_nest_drop
PASS mutant_killed_no_collapse
PASS mutant_killed_no_cycle
RESULT: 15 passed, 0 failed
```

**Total Tests**: 101 passed, 0 failed.

---

## 4. Next Step
- Commit implementation on `task/lane-bs`.
- Route independent adversarial review to Grok.
