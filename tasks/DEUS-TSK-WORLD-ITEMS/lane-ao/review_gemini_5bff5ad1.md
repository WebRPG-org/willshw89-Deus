# Independent Review: Lane AO (DEUS-TSK-WORLD-ITEMS)

- **Task ID:** `DEUS-TSK-WORLD-ITEMS`
- **Lane:** `lane-ao`
- **Reviewed Writer Tip (FINAL SHA):** `5bff5ad1f2eb96d8e800a6c2c896dda97944f230`
- **Base (Merge Base with origin/main):** `1c2fcc28736566f8dd4f14ccd0633f09687e3521`
- **Writer:** Grok (`deus-grok`)
- **Reviewer:** Gemini (gemini-3.8-flash thinking HIGH per Owner DEC-034 final merge gate)
- **Review Mode:** Independent review in fresh throwaway clone (`core.autocrlf=false`, detached HEAD at `5bff5ad1f2eb96d8e800a6c2c896dda97944f230`).

---

## 1. Branch and Commit Verification

Raw git verification from worktree:
```text
$ git rev-parse HEAD origin/task/lane-ao
5bff5ad1f2eb96d8e800a6c2c896dda97944f230
5bff5ad1f2eb96d8e800a6c2c896dda97944f230

$ git log -12 --format="%H %an %s"
5bff5ad1f2eb96d8e800a6c2c896dda97944f230 deus-grok [grok] DEUS-TSK-WORLD-ITEMS world item placement
3c51290a599c26cbf21d4e9438f07c3845fab60a deus-pm [pm] Open lane-ao (DEUS-TSK-WORLD-ITEMS): BRIEF.md and lane.json
1c2fcc28736566f8dd4f14ccd0633f09687e3521 deus-pm Merge task/lane-aa: WG.00.17 Z-range one setting, 32 layers (-16..+15), sparse storage, 2-ft strata (PM merge; Gemini 3.8 Flash thinking HIGH final gate per Owner ruling 20:45 CT replacing the Pro second pass, VERDICT: PASS WITH NOTES (0 BLOCKER, 0 MAJOR) at 212ddf060c41925bfd5e71d88f165cc606433510 / review d2c6614f5b403d397089728f0412a7b14057b430; earlier Flash PASS 705bf9ba9e7af37d44731bcf46ca4d3ea154b61d; writer grok tip 212ddf060c41925bfd5e71d88f165cc606433510)
d2c6614f5b403d397089728f0412a7b14057b430 deus-gemini [gemini] WG.00.17 review final 212ddf06
c1bb4469772b0763dc257bf2aa6c61256532772e deus-pm Merge task/lane-al: WG.20.01 A9b+A9c items 12-43 + section F + addendum 0509 (PM merge; Gemini 3.8 Flash thinking HIGH final gate per Owner ruling 20:45 CT, VERDICT: CLEAN PASS at c70736fdf535e2579bb48789e8d9057420b2dcf9 / review c17da05f9feafa15601ee13cce30505bb1683749; writer grok tip c70736fdf535e2579bb48789e8d9057420b2dcf9)
c17da05f9feafa15601ee13cce30505bb1683749 deus-gemini [gemini] WG.20.01 review c70736fd
684c9513d181a844f9a06c4f34021f40ee2cafb1 snewt [gemini] 0119-DO/0120-DP: Lane AA Pro launch quota-blocked; AA/AL reviews held until Pro reset ~2026-09-27 19:04 CT
7a5d50a319bc3ef05bb0b23692a5096aba35073a snewt [gemini] 0118-DN: Lane AL A9c item 43 FINAL recorded; review held for Pro
c70736fdf535e2579bb48789e8d9057420b2dcf9 deus-grok [grok] WG.20.01 A9c item 43 whole-sprite characters and eight directions
3d2a719741efe1941a03350731e797c7faca21f2 snewt [gemini] 0117-DM: Lane AL A9c item 43 addendum 0509 recorded
0885b8791289a030664b30dc2ec2513680c7e3db snewt [gemini] 0116-DL: Lane AL WG.20.01 A9c item 43 LAUNCHED
bdf4401abf1943637530cd5b61651feb9357e4b5 deus-pm [pm] WG.20.01 A9c item 43 addendum 0509 (Owner 17:09 CT rulings)
```

The tip commit matches `5bff5ad1f2eb96d8e800a6c2c896dda97944f230` exactly on HEAD and `origin/task/lane-ao`.

---

## 2. Scope Verification

Merge base: `git merge-base origin/main 5bff5ad1f2eb96d8e800a6c2c896dda97944f230` -> `1c2fcc28736566f8dd4f14ccd0633f09687e3521`.

### Scope Diff (`git diff --name-status 1c2fcc28736566f8dd4f14ccd0633f09687e3521 5bff5ad1f2eb96d8e800a6c2c896dda97944f230`)

| Status | File Path | In allowedPaths? | Scope Notes |
|---|---|---|---|
| A | `docs/systems/DEUS_WorldItems.md` | YES (`docs/systems/DEUS_WorldItems.md`) | Systems documentation |
| M | `game/js/plugins/DEUS_Containers.js` | YES (`game/js/plugins/DEUS_Containers.js`) | Non-breaking additive U7 bridge at EOF |
| A | `game/js/plugins/DEUS_WorldItems.js` | YES (`game/js/plugins/DEUS_WorldItems.js`) | RMMZ plugin shell |
| A | `game/js/sim/world_items/catalog.js` | YES (`game/js/sim/world_items/**`) | SRD & item catalog definitions |
| A | `game/js/sim/world_items/constants.js` | YES (`game/js/sim/world_items/**`) | Units, sizes, timing, movement constants |
| A | `game/js/sim/world_items/geom.js` | YES (`game/js/sim/world_items/**`) | 6 px cell geometry, draw order, snapping |
| A | `game/js/sim/world_items/hash.js` | YES (`game/js/sim/world_items/**`) | Pure deterministic hash/prng mix |
| A | `game/js/sim/world_items/index.js` | YES (`game/js/sim/world_items/**`) | Entry facade for headless sim |
| A | `game/js/sim/world_items/ledger_bridge.js` | YES (`game/js/sim/world_items/**`) | Ledger transforms for spill/burn/collapse |
| A | `game/js/sim/world_items/pathing.js` | YES (`game/js/sim/world_items/**`) | 8-way pathing adapter, corner gating |
| A | `game/js/sim/world_items/summary.js` | YES (`game/js/sim/world_items/**`) | Seeded anchor placement for far chunks |
| A | `game/js/sim/world_items/world.js` | YES (`game/js/sim/world_items/**`) | Core world item state machine |
| A | `tasks/DEUS-TSK-WORLD-ITEMS/lane-ao/BRIEF.md` | YES (`tasks/DEUS-TSK-WORLD-ITEMS/**`) | Task brief |
| A | `tasks/DEUS-TSK-WORLD-ITEMS/lane-ao/REPORT.md` | YES (`tasks/DEUS-TSK-WORLD-ITEMS/**`) | Lane report |
| A | `tasks/DEUS-TSK-WORLD-ITEMS/lane-ao/lane.json` | YES (`tasks/DEUS-TSK-WORLD-ITEMS/**`) | Lane config |
| A | `tools/world_items/bench_world_items_100k.js` | YES (`tools/world_items/**`) | 100k stress benchmark |
| A | `tools/world_items/test_world_items.js` | YES (`tools/world_items/**`) | Deterministic unit & mutant test suite |

### Non-interference and Boundary Checks
- `docs/STATUS.md`: NOT touched.
- `docs/OWNER_DECISIONS.md`: NOT touched.
- WBS files (`docs/*WBS*.md`, etc.): NOT touched.
- `game/js/plugins.js`: NOT touched (registration request properly documented in `REPORT.md`).
- `game/js/plugins/DEUS_Core.js`: NOT touched.
- `game/js/sim/ledger*`: NOT touched.
- `art/**`, `game/img/**`: NOT touched.
- No files modified outside `allowedPaths`.

---

## 3. Gate Test Execution in Fresh Temporary Clone

A fresh temporary clone was created at `$env:TEMP\lane_ao_review_5bff5ad1` using:
`git clone -c core.autocrlf=false . $tempDir`
`git checkout --detach 5bff5ad1f2eb96d8e800a6c2c896dda97944f230`

All four gate tests were executed in the foreground inside the temporary clone.

### a. `node tools/world_items/test_world_items.js`
Raw execution output:
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
- **EXIT: 0**

### b. `node tools/world_items/bench_world_items_100k.js`
*(Note: Review instructions referenced `bench_100k.js`; `lane.json` declares `tools/world_items/bench_world_items_100k.js` which is the actual file on disk).*
Raw execution output:
```text
BENCH placed=100000 detailed_near=100 summary_chunks=1000
BENCH frame_ms=0.079 median of 21 viewport draws
BENCH memory_bytes=160288
BENCH heap_delta_bytes=553040
BENCH save_summary_bytes=78981
BENCH save_delta_bytes=1441
BENCH materialize_ms=94.3 peak_memory_bytes=32160896
BENCH budget frame_ms <= 16 PASS
BENCH budget memory_bytes <= 16777216 PASS
BENCH budget heap_delta_bytes <= 67108864 PASS
BENCH budget save_summary_bytes <= 262144 PASS
BENCH budget save_delta_bytes <= 32768 PASS
BENCH budget placed == 100000 PASS
BENCH RESULT: PASS
```
- **EXIT: 0**

### c. `node tools/sim/test_ledger.js`
Raw execution output:
```text
WG.65.15 ledger tests; node v24.19.0; files: game/js/sim/ledger.js, game/js/sim/ledger_defaults.js
PASS load_in_bare_vm_context (ECMAScript built-ins only; Math.random throws; Date removed)
PASS purity_dynamic_context_is_bare (undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,threw)
PASS defaults_minimum_classes_and_forms
PASS defaults_no_row_outputs_ore
PASS defaults_rows_keep_elements
PASS defaults_sources_never_ore_or_finite
PASS defaults_magic_flagged_unconfirmed
PASS defaults_decay_chain_rows
PASS defaults_rust_rows_keep_element
PASS defaults_module_is_frozen
PASS defaults_deterministic_describe_and_checksum
PASS config_rejects_ore_output_row
PASS config_rejects_ore_output_recipe
PASS config_rejects_ore_source_list
PASS config_finite_source_needs_flag
PASS config_rejects_cross_element_row
PASS config_rejects_unbalanced_recipe
PASS config_rejects_malformed
PASS config_is_copied_at_load
PASS config_sources_are_data_driven
PASS register_and_totals
PASS seal_enforced
PASS register_rejects_unknown_class_and_form
PASS amount_rejects_non_integers
PASS amount_zero_allowed
PASS amount_overflow_rejected
PASS composite_amounts_are_multiples
PASS transform_conserves_totals
PASS transform_needs_a_table_row
PASS transform_insufficient_is_atomic
PASS transform_ore_output_refused_at_call
PASS transform_element_change_refused_at_call
PASS ore_moves_form_and_only_decreases
PASS rust_keeps_element
PASS decay_chain_conserves_mass
PASS decay_chain_skip_and_reverse_refused
PASS fire_leaves_ash_and_charcoal
PASS water_freezes_and_thaws
PASS electrum_recipe_conserves_gold_and_silver
PASS cause_required
PASS source_undeclared_name_refused
PASS source_ore_refused_at_call
PASS source_finite_refused
PASS source_sink_scope
PASS magic_source_and_sink_logged_with_cause
PASS sink_can_lower_ore_and_is_atomic
PASS audit_clean_recount
PASS audit_detects_every_class_and_form
PASS audit_detects_form_shift
PASS audit_class_level_recount
PASS audit_missing_counts_as_zero_and_unknown_keys
PASS audit_rejects_bad_recount_values
PASS interval_identity_and_close
PASS snapshot_is_json_safe
PASS restore_round_trip_and_continue
PASS restore_ignores_key_order
PASS restore_rejects_tampering
PASS restore_unsealed_snapshot
PASS checksum_deterministic_and_pure
PASS checksum_sees_every_class
PASS checksum_sees_which_class_holds_what
PASS log_is_bounded
PASS purity_static_ledger_js (no ADR-003 §2.3 identifier, only ./ledger* requires, Math within §10.4)
PASS purity_static_ledger_defaults_js (no ADR-003 §2.3 identifier, only ./ledger* requires, Math within §10.4)
PASS purity_mutant_window_detected (forbidden identifier window)
PASS purity_mutant_math_random_detected (Math.random is not on the ADR-003 §10.4 list)
PASS purity_mutant_math_random_computed_detected (Math used other than as Math.<exact function>)
PASS purity_mutant_date_detected (forbidden identifier Date)
PASS purity_mutant_require_fs_detected (require() of something other than a ./ledger* string)
PASS purity_mutant_global_in_template_detected (forbidden identifier process)
PASS purity_mutant_math_sin_detected (Math.sin is not on the ADR-003 §10.4 list)
PASS purity_mutant_rmmz_global_detected (forbidden identifier $gameMap)
PASS purity_mutant_facade_detected (forbidden identifier UF)
PASS purity_mutant_function_constructor_detected (forbidden identifier Function)
PASS purity_static_ignores_comments_strings_regex (names inside comments, strings, template text and a regex are not flagged)
PASS mutant_transform_drops_1_unit_killed (12 check(s) fail, e.g. amount_zero_allowed, composite_amounts_are_multiples, transform_conserves_totals [E_INSUFFICIENT: transform "stone"/"object" -> "stone"/"ruin": stone|ruin holds 0, cannot r])
PASS mutant_transform_adds_1_unit_killed (11 check(s) fail, e.g. amount_zero_allowed, composite_amounts_are_multiples, transform_conserves_totals [zero changes nothing: expected 10500, got 10501])
PASS mutant_source_skips_name_check_killed (2 check(s) fail, e.g. config_sources_are_data_driven, source_undeclared_name_refused [magic removed from the table: expected E_UNKNOWN_SOURCE, got  Cannot read properties of un])
PASS mutant_sink_skips_name_check_killed (1 check(s) fail, e.g. source_undeclared_name_refused [sink "nowhere": expected E_UNKNOWN_SINK, got  Cannot read properties of undefined (reading])
PASS mutant_ore_output_allowed_at_load_killed (1 check(s) fail, e.g. config_rejects_ore_output_row [row stone -> fe_ore: expected E_ORE_OUTPUT, got E_FAMILY E_FAMILY: transform row 83 (sprou])
PASS mutant_ore_output_allowed_at_call_killed (2 check(s) fail, e.g. config_is_copied_at_load, transform_ore_output_refused_at_call [transform: expected E_ORE_OUTPUT, got E_FAMILY E_FAMILY: transform "stone"/"strata" -> "fe])
PASS mutant_ore_source_allowed_at_call_killed (4 check(s) fail, e.g. config_finite_source_needs_flag, config_is_copied_at_load, ore_moves_form_and_only_decreases [ore is never allowed: expected E_ORE_OUTPUT, got E_SOURCE_SCOPE E_SOURCE_SCOPE: source "ma])
PASS mutant_ore_source_allowed_at_load_killed (1 check(s) fail, e.g. config_rejects_ore_source_list [magic listing fe_ore: expected E_ORE_OUTPUT, got E_FINITE_SOURCE E_FINITE_SOURCE: source m])
PASS mutant_ore_recipe_output_allowed_killed (1 check(s) fail, e.g. config_rejects_ore_output_recipe [recipe: expected E_ORE_OUTPUT, nothing was thrown])
PASS mutant_rust_changes_element_in_defaults_killed (58 check(s) fail, e.g. defaults_minimum_classes_and_forms, defaults_no_row_outputs_ore, defaults_rows_keep_elements [E_FAMILY: transform row 80 (rust) changes the element/family mix: fe_metal [["fe",1]] -> c])
PASS mutant_element_check_removed_at_load_killed (1 check(s) fail, e.g. config_rejects_cross_element_row [fe_metal -> cu_trace: expected E_FAMILY, nothing was thrown])
PASS mutant_element_check_removed_at_call_killed (1 check(s) fail, e.g. transform_element_change_refused_at_call [fe -> cu: expected E_FAMILY, got E_NO_ENTRY E_NO_ENTRY: transform "fe_metal"/"item" -> "cu])
PASS mutant_recipe_balance_unchecked_killed (1 check(s) fail, e.g. config_rejects_unbalanced_recipe [au 1 + ag 1 -> electrum 4: expected E_FAMILY, nothing was thrown])
PASS mutant_finite_source_allowed_at_call_killed (1 check(s) fail, e.g. source_finite_refused [magic fe_metal: expected E_FINITE_SOURCE, got E_SOURCE_SCOPE E_SOURCE_SCOPE: source "magic])
PASS mutant_finite_source_allowed_at_load_killed (2 check(s) fail, e.g. defaults_sources_never_ore_or_finite, config_finite_source_needs_flag [source debug-explicit allows finite ag_metal|item])
PASS mutant_seal_not_enforced_for_register_killed (1 check(s) fail, e.g. seal_enforced [register after seal: expected E_SEALED, nothing was thrown])
PASS mutant_seal_not_enforced_for_calls_killed (1 check(s) fail, e.g. seal_enforced [transform before seal: expected E_NOT_SEALED, got  Cannot read properties of null (reading])
PASS mutant_float_accepted_killed (3 check(s) fail, e.g. amount_rejects_non_integers, amount_overflow_rejected, audit_rejects_bad_recount_values [register 1.5: expected E_AMOUNT, got E_MULTIPLE E_MULTIPLE: register "stone"/"strata" (cau])
PASS mutant_negative_accepted_killed (3 check(s) fail, e.g. amount_rejects_non_integers, audit_rejects_bad_recount_values, restore_rejects_tampering [register -1: expected E_AMOUNT, got E_INSUFFICIENT E_INSUFFICIENT: register "stone"/"strat])
PASS mutant_overflow_unchecked_killed (1 check(s) fail, e.g. amount_overflow_rejected [electrum key beyond MAX: expected E_OVERFLOW, nothing was thrown])
PASS mutant_family_overflow_unchecked_killed (1 check(s) fail, e.g. amount_overflow_rejected [family mineral: expected E_OVERFLOW, nothing was thrown])
PASS mutant_insufficient_unchecked_killed (3 check(s) fail, e.g. transform_insufficient_is_atomic, electrum_recipe_conserves_gold_and_silver, sink_can_lower_ore_and_is_atomic [too much: expected E_INSUFFICIENT, nothing was thrown])
PASS mutant_composite_multiple_unchecked_killed (1 check(s) fail, e.g. composite_amounts_are_multiples [register 3 electrum: expected E_MULTIPLE, nothing was thrown])
PASS mutant_cause_unchecked_killed (2 check(s) fail, e.g. register_rejects_unknown_class_and_form, cause_required [empty cause: expected E_CAUSE, nothing was thrown])
PASS mutant_audit_ignores_a_class_killed (3 check(s) fail, e.g. audit_clean_recount, audit_detects_every_class_and_form, audit_missing_counts_as_zero_and_unknown_keys [every (class, form) checked: expected 68, got 64])
PASS mutant_audit_ignores_families_killed (1 check(s) fail, e.g. audit_detects_every_class_and_form [family diffs for ag_metal differ:])
PASS mutant_closure_check_disabled_killed (1 check(s) fail, e.g. restore_rejects_tampering [tamper closure: amount: expected E_SNAPSHOT, nothing was thrown])
PASS mutant_interval_family_identity_disabled_killed (1 check(s) fail, e.g. restore_rejects_tampering [tamper interval family identity: expected E_SNAPSHOT, nothing was thrown])
PASS mutant_interval_class_identity_disabled_killed (1 check(s) fail, e.g. restore_rejects_tampering [tamper interval class identity: expected E_SNAPSHOT, nothing was thrown])
PASS mutant_checksum_ignores_key_order_killed (1 check(s) fail, e.g. restore_ignores_key_order [checksum after restoring reversed keys: expected "20f79ada", got "7a4b911a"])
PASS mutant_checksum_commutative_killed (1 check(s) fail, e.g. checksum_sees_which_class_holds_what [swapped amounts give the same checksum])
PASS mutant_checksum_ignores_a_class_killed (1 check(s) fail, e.g. checksum_sees_every_class [checksum ignores gem|strata])
PASS mutant_restore_accepts_bad_amounts_killed (1 check(s) fail, e.g. restore_rejects_tampering [tamper negative pair: expected E_SNAPSHOT, nothing was thrown])
PASS mutant_restore_skips_closure_killed (1 check(s) fail, e.g. restore_rejects_tampering [tamper closure: amount: expected E_SNAPSHOT, nothing was thrown])
PASS mutant_log_unbounded_killed (1 check(s) fail, e.g. log_is_bounded [events kept: expected 16, got 2001])
PASS mutant_refused_call_leaves_trace_killed (4 check(s) fail, e.g. transform_insufficient_is_atomic, electrum_recipe_conserves_gold_and_silver, sink_can_lower_ore_and_is_atomic [no trace of the refused call: expected "2a8469f1", got "4f22a7e0"])
PASS mutant_defaults_ore_sprout_row_killed (56 check(s) fail, e.g. defaults_minimum_classes_and_forms, defaults_no_row_outputs_ore, defaults_rows_keep_elements [E_ORE_OUTPUT: transform row 16 (sprout) outputs ore class fe_ore from stone (LIFE-002: ore])
PASS mutant_defaults_decay_skip_row_killed (2 check(s) fail, e.g. defaults_decay_chain_rows, decay_chain_skip_and_reverse_refused [skip/reverse row rubble|strata>stone|strata must not exist])
PASS mutant_defaults_magic_marked_confirmed_killed (1 check(s) fail, e.g. defaults_magic_flagged_unconfirmed [magic ownerConfirmed: expected false, got true])
PASS mutant_defaults_magic_allows_finite_killed (3 check(s) fail, e.g. defaults_sources_never_ore_or_finite, config_finite_source_needs_flag, source_finite_refused [source magic allows finite ag_metal|item])
PASS mutant_defaults_not_frozen_killed (1 check(s) fail, e.g. defaults_module_is_frozen [a defaults object is not frozen])
PASS mutant_hidden_math_random_caught_dynamically_killed (59 check(s) fail, e.g. defaults_minimum_classes_and_forms, defaults_no_row_outputs_ore, defaults_rows_keep_elements [PURITY: Math.random called]; static scan of the mutant: clean, so only the bare vm context catches it)
mutants: 42; run time 9159 ms
RESULT: 117 passed, 0 failed
```
- **EXIT: 0**

### d. `node tools/check_deus_syntax.js`
Raw execution output:
```text
Checked 53 DEUS plugin files. Errors: 0
```
- **EXIT: 0**

---

## 4. Spot-Check of REPORT Claims against Evidence

1. **6 px Placement Cells & Whole-Pixel Rendering:**
   - In `game/js/sim/world_items/constants.js`: `CELL_PX = 6`, `CELLS_PER_TILE = 8`, `TILE_PX = 48`.
   - In `game/js/sim/world_items/geom.js`: `snapPx` rounds `px / CELL_PX` using half-up arithmetic to 6 px increments. Drag preview and placements use integer whole-pixel coordinates (`anchorPx = tile * 48 + cell * 6`). Confirmed verified in `test_world_items.js` (`snap_6`, `drag_preview_snaps`).
2. **Far Chunks as Seeded Counts / Near Detailed:**
   - In `game/js/sim/world_items/summary.js`: `seededAnchor` combines world seed, chunk coords, layer, type hash, and index deterministically to compute exact tile/cell coordinates on expansion without random generators or clock calls.
   - Far chunks maintain summary manifests; expanding near chunks creates concrete records; collapse restores compact counts. Confirmed verified in tests (`seeded_replace`, `seeded_differs_by_seed`, `far_stays_summarized`, `viewer_expands_near`).
3. **Containers as One Object for Budget and Save:**
   - In `game/js/sim/world_items/world.js`: Nested items set `parentId`, so `budgetCount` counts only top-level roots (`item.parentId` skipped). `saveChanges` serializes container contents as nested records inside the single container object rather than separate loose records. Confirmed verified in tests (`budget_one_object`, `save_roundtrip`, `save_change_only`).
4. **Mass Conservation & Ledger Transforms:**
   - Spills, container burning, surface collapse, and decay invoke `ledger_bridge.js`, which applies valid transform rows from `ledger_defaults.js` (e.g. `wood/object -> wood/ruin`, `wood/item -> ash/strata`, `biomass/item -> humus/strata`). All transforms leave `assertBalanced(ledgerRecount())` clean. Confirmed verified in tests (`mass_burn`, `mass_spill`, `clutter_rot`).
5. **No Art Generation (DEC-007):**
   - No image or audio files created or requested. Items specify slot IDs (`WS.LONGSWORD.24.D`, etc.) per asset standard AS-ID-001. Confirmed verified by diff check and automated check `no_random_no_art_gen`.
6. **DEC-011 and DEC-027 Compliance:**
   - Scale is 1:1 (`scale: 1`, no fractional sprite scaling). Hold-to-zoom is strictly integer 3x/4x nearest-neighbor.
   - SRD 5.1 rules for container capacities (backpack 1 cu ft / 30 lb, sack 1 cu ft / 30 lb, chest 12 cu ft / 300 lb), 5-5-5 distance metrics, thieves' tools vs DC with trap trigger on miss by 5+, and carry capacity (`Str * 15`).
7. **RMMZ Engine Safety:**
   - `game/js/plugins.js` and `game/js/plugins/DEUS_Core.js` were NOT modified.
   - Clean registration request supplied in `REPORT.md` for PM merge time.

---

## 5. Findings

- **BLOCKER:** 0
- **MAJOR:** 0
- **MINOR:** 0

Notes:
- The bench script path in `lane.json` is `tools/world_items/bench_world_items_100k.js` (review prompt noted `tools/world_items/bench_100k.js` as shorthand). Tested the actual file directly, passing all 6 performance/memory budgets with EXIT 0.

---

## 6. Verdict

VERDICT: CLEAN PASS
