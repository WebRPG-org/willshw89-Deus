# Independent Grok Review — WG.00.40 / lane-bs

- **Writer**: Gemini
- **Reviewer**: Grok
- **Reviewed Commit**: `9ff79bf208bb222b782cc4ede366aa8be929960f`
- **Merge Base**: `240a9c67063c81e159b3656a11d09849469528df`
- **Branch**: `task/lane-bs`
- **Worktree**: `C:\Users\snewt\.deus_worktrees\lane-bs`
- **Review date**: 2026-09-27
- **Authority**: DEC-034 independent adversarial review; `docs/CANONICAL_ROLES.md` (Grok reviews, and does not self-certify the writer's report)

Commands run in this worktree at that commit, before this review file existed:

```text
git rev-parse HEAD
9ff79bf208bb222b782cc4ede366aa8be929960f

git merge-base HEAD origin/main
240a9c67063c81e159b3656a11d09849469528df

git log -1 --oneline
9ff79bf2 [gemini] WG.00.40 Physical world objects & continuous global coordinates

git diff --stat 240a9c67063c81e159b3656a11d09849469528df 9ff79bf208bb222b782cc4ede366aa8be929960f
 game/js/sim/world_items/constants.js         |   8 +-
 game/js/sim/world_items/geom.js              |  49 +++-
 game/js/sim/world_items/world.js             | 110 +++++--
 tasks/WG.00.40/lane-bs/BRIEF.md              |  51 ++++
 tasks/WG.00.40/lane-bs/REPORT.md             | 192 ++++++++++++
 tasks/WG.00.40/lane-bs/lane.json             |  28 ++
 tools/world_items/test_persistent_objects.js | 419 +++++++++++++++++++++++++++
 7 files changed, 838 insertions(+), 19 deletions(-)
```

The range is one commit. Every path sits inside `tasks/WG.00.40/lane-bs/lane.json` `allowedPaths` (`game/js/sim/world_items/**`, `tools/world_items/**`, `tasks/WG.00.40/lane-bs/**`). No image, sprite, or art-pipeline file is in the diff.

## Gate tests

### `node tools/world_items/test_world_items.js`

Exit code **0**.

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

### `node tools/world_items/test_persistent_objects.js`

Exit code **0**.

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

**Gate total: 101 passed, 0 failed.** Both commands exited 0.

## Rule 4 mutant run

`node tools/world_items/test_persistent_objects.js --mutant` printed the same 15 lines and `RESULT: 15 passed, 0 failed`. Exit code **0**.

`tools/world_items/test_persistent_objects.js` never reads `process.argv`. The flag is ignored. The file's mutant evidence is the seven in-process `mutant_killed_*` checks.

Those seven are not equal:

| Check | What the mutant does | Independent result |
|---|---|---|
| `mutant_killed_duplicate_id` | Overwrites the local id fed to the test's `Set` (`test_persistent_objects.js` lines 47–49). | The positive loop would reject a repeated id returned by `place`. The mutant edits the value the assertion sees. |
| `mutant_killed_phantom_loose` | `return false` at lines 82–84, before the post-`putIn` pick assertion. | The line passes for any world. Deleting the loose-item assertion leaves this line green. |
| `mutant_killed_coord_drift` | `return false` at lines 119–121, before any placement. | Same. The coordinate checks are unreachable under the mutant. |
| `mutant_killed_seam_clone` | `placeGlobal` of a second greatsword at `gx 255.875` (lines 193–196). | Reproduced below. The kill is the new sword covering the destination pixel. A second sword placed at `gx 10` leaves every assertion in that function true. |
| `mutant_killed_nest_drop` | `move` of the nested pouch out of the chest (lines 254–257). | The contents and weight assertions reject that world. This one alters the sim and the checks catch it. |
| `mutant_killed_no_collapse` | `return false` at lines 320–322, before the broken-table assertion. | Unconditional. |
| `mutant_killed_no_cycle` | `return false` at lines 353–355, before the cycle picks. | Unconditional. |

`test_world_items.js` is a separate harness. Its mutants are in-memory source patches (`loadMutant`), and that suite's `*_mutant_killed` lines passed in the run above. That covers the pre-existing snap, spill, nested weight, pick, and save checks. It does not patch `fromGlobal`, `crossRegionMove`, `atGlobal`, or `regionItems`.

## Independent substrate probe

A headless probe against `createWorld` at this commit (seeded, not the suite) measured the following.

Constants: `REGION_TILES` 256, `WORLD_REGIONS` 3, `WORLD_TILES` 768 (`3 * 256`), `Z_MIN` -16, `Z_MAX` 15 (32 levels), `CELLS_PER_TILE` 8, `CHUNK_TILES` 16.

Geometry: `toGlobal` / `fromGlobal` / `toPx` / `fromPx` round-trip for tiles `0, 1, 255, 256, 511, 512, 767` and cells `0..7` had **0** mismatches. `isCrossRegion` matched the 256-tile split on four seam pairs and one same-region pair.

Volume: 9 region-corner anchors × 32 layers = **288** daggers. Ids were `1..288` with no gaps and no duplicates. Each item's `gx`, `gy`, `gz`, and `layer` matched the request. `atGlobal` and `pickGlobal` returned that id. `regionOf` matched `floor(tile / 256)`. **0** mismatches.

Single presence: a torch `putIn` a chest, a longsword `equip`ped, and a sack `beginHaul`ed left `regionItems(0,0,0)` as `[chest]` only. `pickGlobal` at the torch, sword, and sack anchors returned null. The chest's `contents` were `[torch]`.

Corner migration: chest at `(255.875, 511.875, z=3)` containing a backpack containing a torch and a brass key. `totalOz(chest)` was **497** before and after `crossRegionMove` to `(256, 512, 3)` (chest 400 oz + backpack 80 + torch 16 + key 1). Result: `ok`, same id `1`, `fromRegion {rx:0, ry:1}` to `{rx:1, ry:2}`, `isCrossRegion` true. Old region and `atGlobal(255.875, 511.875, 3)` were empty of those ids. New region and `atGlobal(256, 512, 3)` listed only the chest. Child parent links stayed chest ← backpack ← torch and key.

`saveChanges` / `loadChanges` on a fresh world with the same seed restored id `1` at `(256, 512, 3)`, `totalOz` 497, the same parent links, a loose set of `[1]` at the new anchor, and an empty loose set at the old anchor.

`moveToGlobal` of a dagger from `(10.125, 20.25, -6)` to `(10.5, 20.25, -6)` then to `(256, 20.25, -6)` kept the id, landed on region `{rx:1, ry:0}`, and left the old anchor unpicked.

Collapse, headless world, table at `gz -6` with `loadLimitLb 10` and `collapseLb 30`, dagger already on the table (`heightQuarters` 1), plate then moved onto it: table `broken`, `kind` `"item"`, `ledgerForm` `"ruin"`, `massMu` 30 still on that same id. Dagger and plate `surfaceId` null and `heightQuarters` 0. All three ids still resolvable.

Collapse with a sealed ledger (`createLedger(defaultConfig())`, same limits, dagger and plate): `ledger.assertBalanced(world.ledgerRecount())` returned ok, table broken with form `ruin`, both occupants on the floor at height 0. The same move with an **unsealed** ledger threw `E_NOT_SEALED`.

Off-grid `placeGlobal` at `50.1` stored `gx 50.125`, `cellX` 1. A three-item stack there picked ids in order top, middle, bottom, top (`3, 2, 1, 3`).

Seam-clone reproduction of the suite's own assertions:

| Extra greatsword | Assertion failures | Region counts |
|---|---|---|
| none | none | region 0: 0, region 1: 1 |
| at `255.875` (the suite's mutant) | destination `pickGlobal` returned the new id | region 0: 1, region 1: 1 |
| at `gx 10` | none | region 0: 1, region 1: 1 |

Source scan of every `game/js/sim/world_items/*.js`: no `Math.random`, and no `pixellab`, `image_gen`, `dall-e`, `generate_image`, `png`, or `img/` hit. Slot ids remain the sprite key. This commit generates no art (DEC-007). The diff adds no faction, civics, economy, or class system (the lane's DEC-037 phase lock).

## Invariants checked in the code

**An object exists exactly once.** `makeItem` assigns `state.nextId++` (`world.js` around line 87). `place` / `placeGlobal` do not pass an caller id. `putIn` detaches before linking `parentId`. `equip` and `beginHaul` set `heldBy` and `indexAdd` refuses `parentId` or `heldBy` (lines 195–196). `regionItems` skips those same two flags. The probe's container, hand, and haul cases each had one loose chest and no second pick.

**Continuous coordinates.** `applyCell` writes `gx`, `gy`, `gz` from `geom.toGlobal` and the layer (`world.js` lines 160–162). `applyGlobal` snaps through `fromGlobal` (`geom.js` lines 82–92): nearest cell of 8, with cell 8 carried to the next tile. `atGlobal`, `pickGlobal`, `placeGlobal`, `moveToGlobal`, and `crossRegionMove` are on the frozen world API (lines 1827–1876). `placeGlobal` is `place`. The 288-point volume probe and the seam round-trip both matched.

**Cross-seam migration.** `crossRegionMove` calls `move`, which `indexSub`s the old chunk key and `placeOnMap`s the new one. Chunk size is 16 tiles, so a 255→256 step also changes chunk. The corner probe kept one id, one loose record, and the nested ids.

**Weight and collapse.** `totalOz` still recurses with the `NEST_RECURSE` anchor the older mutant patch uses. Exterior volume is unchanged (`STOW_EXTERIOR`). `collapseSurface` (lines 423–452) drops every occupant to height 0. The new `if (state.ledger)` wrapper still throws `E_NOT_SEALED` when a ledger exists and is unsealed, and the sealed path still transforms and stays balanced. With no ledger, a wood surface (`onSpill` form `ruin`, not `strata`) is marked broken in place and keeps `massMu`. Current surfaces in `catalog.js` use `WOOD_RUIN`. The headless probe matched that.

**Art.** No art call, no asset bytes, no `Math.random` in the sim directory.

## Findings

### BLOCKER

None. The success-path laws measured above hold at `9ff79bf2`: one id per object, the 768×768×32 volume round-trips, seam and corner moves keep id and nested weight, overload collapse drops occupants, and the sealed ledger stays balanced.

### MAJOR

The new file's Rule 4 section overstates what it kills. `node tools/world_items/test_persistent_objects.js --mutant` exits 0 because the flag is unread. Four of the seven `mutant_killed_*` checks are an unconditional `return false` (`phantom_loose`, `coord_drift`, `no_collapse`, `no_cycle`). Those four lines cannot print FAIL. `seam_clone` fails only when the extra greatsword overlaps the destination cell; the same assertions accept an extra greatsword at `gx 10`, with region 0 still holding a sword. `REPORT.md` describes these seven as proof that injected mutations make the tests fail. The nest-drop check and the positive invariant checks are real. The four unconditional lines and the seam-clone placement are not a source mutation of `crossRegionMove`, `fromGlobal`, or `collapseSurface`.

### MINOR

1. **Volume constants are not clamps.** `placeGlobal` accepts `gx 768` (tile 768, region index 3), `gx -0.125` (tile -1), `gz 16`, and `gz -17`. The in-volume corner `767.875, 767.875, 15` stores exactly. `WORLD_TILES`, `Z_MIN`, and `Z_MAX` are exported and unused by `place` and `applyGlobal`.

2. **A thrown `placeGlobal` leaves a record `regionItems` can see.** `place` inserts the item into `state.items` before `applyGlobal` (`world.js` lines 496–500). `placeGlobal({ gx: NaN })` throws `E_GLOBAL`. Afterwards `regionItems(0,0,0)` returned `[{ id: 1, typeId: "dagger", tileX: 0 }]`. `atGlobal(0,0,0)` was `[]` and `pickGlobal` was null, because `indexAdd` never ran. The insert-before-validate order predates this commit; `regionItems` is new and it reports that record.

3. **Moving a surface leaves occupants on it.** `crossRegionMove` of a table from `(15, 15)` to `(256, 15)` left the dagger at `(15.125, 15.125)` with `surfaceId` still the table and `heightQuarters` 1. `move` updates the moved item only. Overload collapse does drop occupants; that path passed headless and sealed. `docs/systems/DEUS_WorldItems.md` defines the drop as the load-limit and collapse-multiple path. Lane brief §5 also names movement of the supporting surface. That movement path is unchanged.

4. **Nested items keep the coordinates they had when they were stowed.** After the corner move, the backpack's `gx/gy` were still `255.875 / 511.875` and the torch's were still `1 / 1`, while `parentId` kept them out of `atGlobal` and out of the loose region list. Save/load preserved that. Loose presence stayed a single chest.

## Verdict

The physical substrate at `9ff79bf208bb222b782cc4ede366aa8be929960f` matches the laws exercised above: stable ids, one presence, the 768×768 grid and 32 layers, cross-region moves, nested weight 497 conserved, overload collapse, sealed-ledger balance, and no art generation. The gate commands exited 0 with 86 and 15 passes. The new suite's `--mutant` run also exited 0, and four of its killed-mutant lines cannot fail. That keeps this short of a clean bill for the new harness.

VERDICT: PASS
