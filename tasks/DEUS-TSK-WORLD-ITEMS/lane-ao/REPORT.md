# Lane AO report: DEUS-TSK-WORLD-ITEMS

Writer: grok. Reviewer: gemini (not this run). Branch: `task/lane-ao`. No merge. No WBS id minted.

The headless sim is `game/js/sim/world_items`. `DEUS_WorldItems.js` binds it and, when the engine classes exist, refuses steps onto 48 px items. `DEUS_Containers.js` keeps its slot and kilogram API. A bridge at the bottom forwards spill and chest-use into a bound sim world, and ignores ids the sim does not track so the old chest path still returns.

Sprites are slot ids only. No art or audio was generated. PixelLab was not run.

`placedCount` of the bench world is 100,000. Far chunks are counts. The near chunk is expanded. A container with contents is one budget object and one save record.

## Registration request

Do not edit `DEUS_Core.js`. Add one plugin entry at merge:

| Field | Value |
| --- | --- |
| Name | DEUS_WorldItems |
| File | js/plugins/DEUS_WorldItems.js |
| Status | true (on) |
| Parameters | none |
| Load after | DEUS_Containers, DEUS_Movement8D, DEUS_Items |

`DEUS_Containers` is already registered. The U7 bridge is inside that file.

The host calls `DEUS.WorldItems.bind(DEUS.WorldItems.createWorld({ seed }))`. Shift cycles a stack only after `setPointer` supplies world pixels (the camera is another lane). PageUp holds 3×, PageDown holds 4×.

## Owner-open (not answered)

- How many ledger mu are in one pound. Catalog `massMu` is an explicit integer posted to the ledger. It is not a rate. Several rows use the SRD pound count so the tests stay readable.
- Surface load limits. Table 150 lb and shelf 40 lb are PM defaults. Tests pass an explicit limit.
- Collapse multiple. The PM default is twice the load limit.
- A pound cap for a barrel. The SRD gives 4 cu ft and no pound cap, so the sim enforces volume only.
- Crate tare, weight and volume. The crate is not an SRD container row. The PM default is 15 lb, 200 lb, 8 cu ft.
- Volumes for items the SRD does not size (weapons, armor, rations, and the rest of the catalog).
- A universal lock or trap DC. Each lock carries its own DC.
- Robe weight. The PM default is 4 lb.
- Brass key weight. The PM default is 1 oz.
- Near radius and chunk size. The PM defaults are 24 tiles and 16 tiles.
- Whether a burn splits between ash and charcoal. The sim posts the existing ash row.
- Diagonal run step. Walk diagonal is 3 px per axis (AS-SCALE-001). Run diagonal is 4 px per axis so the step stays a whole pixel.
- Which keys cycle a stack and hold zoom. The PM default is Shift, PageUp for 3×, PageDown for 4×.
- Whether opening a trapped container should roll, or only spring. The disarm check is the SRD roll (fail by 5 or more springs it). Opening an unlocked, undefeated trap springs it once without a second roll.
- Slot-id grammar for the five armor-state map sprites. The unit passes `slotByArmor`. This lane does not write the catalogue.
- Whether seeded far counts must register ledger mass. `place()` registers mass before seal. A summary count does not.
- Whether the placement save should embed `ledger.snapshot()`. It does not. The host stores the ledger snapshot beside it.
- Small item world sprites remain an open PixelLab test in the asset standard. This lane did not generate them.

## PM defaults

Recorded in `docs/systems/DEUS_WorldItems.md`. The Owner can replace any of them without a code change to the rules above: pass the limit, the radius, the zoom factor, or the slot id in.

## Follow-ups

- PROPOSED-AO-01: register `DEUS_WorldItems` in `game/js/plugins.js` at merge (see the registration request).
- PROPOSED-AO-02: point `setBlockProvider` at the live wall and cave grid when that lane's API is the one to call.
- PROPOSED-AO-03: catalogue rows for the placeholder slot ids other than the two examples already in the standard.

## Gate output

Fresh run on this tree. All four exited 0.

### node tools/world_items/test_world_items.js

```
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

Exit 0.

### node tools/world_items/bench_world_items_100k.js

```
BENCH placed=100000 detailed_near=100 summary_chunks=1000
BENCH frame_ms=0.059 median of 21 viewport draws
BENCH memory_bytes=160288
BENCH heap_delta_bytes=700896
BENCH save_summary_bytes=78981
BENCH save_delta_bytes=1441
BENCH materialize_ms=92.8 peak_memory_bytes=32160896
BENCH budget frame_ms <= 16 PASS
BENCH budget memory_bytes <= 16777216 PASS
BENCH budget heap_delta_bytes <= 67108864 PASS
BENCH budget save_summary_bytes <= 262144 PASS
BENCH budget save_delta_bytes <= 32768 PASS
BENCH budget placed == 100000 PASS
BENCH RESULT: PASS
```

Exit 0. Frame time is the near 16-tile window while 100,000 items exist as counts. `materialize_ms` is the cost of expanding all 1,000 chunks and is not the frame budget. The summary save is the 1,000 chunk records (78,981 bytes). The delta save is the one chunk touched by 20 edits (1,441 bytes).

Budgets are engineering ceilings for this bench (16 ms frame, 16 MB accounted, 64 MB heap delta, 256 KB summary save, 32 KB delta). They are not Owner rulings.

### node tools/sim/test_ledger.js

```
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
mutants: 42; run time 8892 ms
RESULT: 117 passed, 0 failed
```

Exit 0. Ledger sources were not edited.

### node tools/check_deus_syntax.js

```
Checked 53 DEUS plugin files. Errors: 0
```

Exit 0.
