# SIM.40.11 lane-ad report

Writer: grok. Reviewer: gemini (not this run). This report does not mark the task DONE.

## What changed

- `game/js/sim/reclaim.js` — posts mining, building, deconstruction, collapse, decay and outdoor reclamation through `game/js/sim/ledger.js` using SIM.40.00 masses. The ledger files were not edited.
- `game/js/plugins/DEUS_Jobs.js` — a strata mine posts four slices (a solid cell keeps S0). A build posts the object. Each job update calls one reclamation step when a host has attached `UF.Matter`. The legacy drops (soil: 1 stone, other: 2 stone) are unchanged.
- `game/js/plugins/DEUS_Objects.js` — `setIn` refuses a new ore class after the ledger is sealed. `applyIn` posts the mass-table yield.
- `game/js/plugins/DEUS_Floors.js` — a floor job posts the consumed item. Removing a floor posts deconstruct. A roof deck with no bill is recorded unpaid and is not sourced.
- `game/js/plugins/DEUS_Items.js` — create and remove note an appear or a remove. Covered mine and build drops are not a second post.
- `game/js/plugins/DEUS_Walls.js` — `Walls.collapse` posts the wall collapse list. Removing a wall object calls it.
- `tools/sim/test_reclaim.js`, `tools/sim/test_reclaim_longrun.js`, `tools/sim/fixtures/reclaim/schedule.json`, `tools/sim/fixtures/reclaim/checksums.json` — unit checks, a 4000-tick two-seed run, and the one-gram failure checks.
- `docs/systems/DEUS_Reclamation.md` — the posts, the path walker, the hooks, and what was left open.

No art was generated. No file outside the lane's allowedPaths was edited. `tasks/SIM.40.11/lane-ad/launches/` was already present and was not added.

The hooks do nothing until a host calls `install(root, session)` after registering the world and sealing. That host is not in this lane's files. Until then the world writes behave as they did.

## Gate output

Commands from `tasks/SIM.40.11/lane-ad/lane.json`, run in the foreground on this tree. Each exited 0. The script stopped on the first non-zero exit and printed `ALL GATES PASSED`.

```
=== node tools/sim/test_reclaim.js ===
PASS catalogue validates
PASS reclaim has no host calls
PASS vm load
PASS mine four slices
PASS mine keeps one floor slice
PASS mine posts the slice mass
PASS legacy two stone is not the ledger mass
PASS mine family constant
PASS soil mine stays soil
PASS build campfire
PASS collapse campfire
PASS deconstruct wall
PASS ore harvest keeps the gram
PASS unsealed ore placement is registration phase
PASS sealed ore placement is refused
PASS exempt iron stays metal
PASS gold stays scrap
PASS finite families constant
PASS bone rots to one humus block
PASS bone family constant
PASS rubble reclaims to stone
PASS wood reclaim reaches humus
PASS snapshot restore
PASS tampered place fails recount
PASS good snapshot again
PASS duplicated gram is caught
PASS leaked gram is caught
PASS sealed unpaid deck
PASS undeclared item creates nothing
PASS mutant leak gram fails the run
PASS mutant duplicated gram fails the run
PASS same seed same checksum
PASS jobs posts mine build and tick
PASS objects guard ore and post harvest
PASS floors post build deconstruct and deck
PASS items post appear and remove
PASS walls post collapse
PASS unmapped tin is not invented
RESULT: 38 passed, 0 failed
EXIT=0

=== node tools/sim/test_reclaim_longrun.js ===
PASS seed 1 conserves for 4000 ticks
PASS seed 1 deterministic
PASS seed 2 conserves
PASS seeds differ
PASS seed 1 exempt iron untouched
PASS seed 1 outdoor iron is trace
PASS seed 1 gold scrap remains
PASS seed 1 ore mass unchanged
PASS seed 1 gem family unchanged
PASS seed 1 humus block formed
PASS seed 1 closure
PASS seed 2 exempt iron untouched
PASS seed 2 outdoor iron is trace
PASS seed 2 gold scrap remains
PASS seed 2 ore mass unchanged
PASS seed 2 gem family unchanged
PASS seed 2 humus block formed
PASS seed 2 closure
PASS pinned checksums
PASS injected gram fails the long run
CHECKSUM seed1 07830127
CHECKSUM seed2 d082be50
RESULT: 20 passed, 0 failed
EXIT=0

=== node tools/sim/test_ledger.js ===
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
mutants: 42; run time 8727 ms
RESULT: 117 passed, 0 failed
EXIT=0

=== node tools/sim/test_materials.js ===
PASS clean_validate
PASS determinism_checksum
PASS purity_clean
PASS mutant_layer_count_killed
PASS mutant_layer_product_killed
PASS mutant_layer_160_killed
PASS mutant_one_ft_killed
PASS mutant_host_killed
PASS mutant_random_killed
PASS slice_mass_conserved
PASS ore_not_emitted
PASS bills_sum
PASS catalog_items_covered
PASS catalog_objects_covered
PASS mu_unconfirmed
PASS calendar_open
PASS no_save_migration
PASS no_layer_count_field
PASS granite_slice
PASS granite_by_strata_id
PASS stone_item
PASS stockpile_massless
PASS water_slice_open
PASS masonry_bill
PASS wall_stone_bill
PASS reclaim_iron_trace
PASS reclaim_gold_scrap
PASS reclaim_wood_both
PASS electrum_matches_ledger
PASS lava_ratio
PASS yield_of_granite_sums
PASS rubble_both_shapes
PASS bad_count_throws
PASS zero_count
PASS fixtures_present
PASS fixture_bad_alloy
PASS fixture_bad_alloy_multiple
PASS fixture_bad_ash_class
PASS fixture_bad_blast
PASS fixture_bad_bom
PASS fixture_bad_bulk
PASS fixture_bad_calendar
PASS fixture_bad_class
PASS fixture_bad_class_by_element
PASS fixture_bad_collapse
PASS fixture_bad_combustion
PASS fixture_bad_coverage_item
PASS fixture_bad_coverage_object
PASS fixture_bad_decay_key
PASS fixture_bad_decay_ore
PASS fixture_bad_duplicate_strata
PASS fixture_bad_erode_ore
PASS fixture_bad_extra_item
PASS fixture_bad_family
PASS fixture_bad_family_mass
PASS fixture_bad_gap
PASS fixture_bad_item_class
PASS fixture_bad_item_count
PASS fixture_bad_item_type
PASS fixture_bad_item_weight
PASS fixture_bad_lava_ratio
PASS fixture_bad_layer
PASS fixture_bad_line_class
PASS fixture_bad_mass_float
PASS fixture_bad_mass_negative
PASS fixture_bad_mass_zero
PASS fixture_bad_massless
PASS fixture_bad_massless_amount
PASS fixture_bad_metal_reclaim
PASS fixture_bad_migration
PASS fixture_bad_mu_ref
PASS fixture_bad_mu_scale
PASS fixture_bad_mu_status
PASS fixture_bad_noble
PASS fixture_bad_null_mass
PASS fixture_bad_ore_reclaim
PASS fixture_bad_ore_yield
PASS fixture_bad_path
PASS fixture_bad_posting_form
PASS fixture_bad_rust_ore
PASS fixture_bad_species
PASS fixture_bad_status_open
PASS fixture_bad_status_word
PASS fixture_bad_strata_id
PASS fixture_bad_transform
PASS fixture_bad_unit_mineral
PASS fixture_bad_unit_record
PASS fixture_bad_unit_water
PASS fixture_bad_yield
PASS mutant_yield_short
PASS mutant_collapse_short
PASS mutant_ore_yield
PASS mutant_bom
PASS mutant_coverage_item
PASS mutant_metal_reclaim
PASS mutant_mu_confirmed
PASS mutant_combustion
PASS ice_slice_du
PASS lava_unit_mu
PASS reclaim_by_strata_id
PASS massof_rejects_iron_strata
PASS massof_rejects_bone_strata
PASS massof_slice_overflow
PASS massof_object_overflow
PASS massof_ruin_overflow
iceDu from massOf = 1
water family after fluid 7 = 7
water family after one ice slice = 8
after thaw water/fluid = 8 water/ice = 0 water family = 8
family ag = 0
family au = 0
family cu = 0
family fe = 0
family gem = 0
family mineral = 0
family organic = 0
family pt = 0
family water = 8
balanced = true
PASS water_thaw_du
PASS yield_lists_post
RESULT: 107 passed, 0 failed
EXIT=0

=== node tools/check_deus_syntax.js ===
Checked 52 DEUS plugin files. Errors: 0
EXIT=0
```

`ALL GATES PASSED`

## Open Owner questions

Not answered here.

- D-1 calendar. A tick in this module is one path step, not a year.
- D-MU-UNIT. The conserved integer is the catalogue mu. Reading that integer as grams uses the unconfirmed proposal.
- Vein grade for strata ids 38-47 (`OWNER_OPEN`). No ore-rock mass was invented.
- D-TIN. Tin, and bronze's unmapped share, are not posted.
- D-OBJECT-VOXEL. Object posts use the catalogue bill.
- DEC-018. The unconfirmed `magic` source was not used.
- Creature body mass (ledger Q3). Hunt and birth are not posted.
- D-RECLAIM-ORGANIC and D-RECLAIM-RUBBLE. The published ledger paths are used (humus; rubble to sediment to stone).
- DEC-028.3. The catalogue flag `implemented` is still false. Piles the caller marks exempt are skipped. The flag was not changed.

## Follow-ups

- **PROPOSED-AD-01.** A host outside this lane's files registers the generated world, seals, and calls `install`. Until that exists the plugin hooks do not post.
- **PROPOSED-AD-02.** Replace the legacy mine drops (1 or 2 stone) with the catalogue slice postings so a recount of world items matches the ledger.
- **PROPOSED-AD-03.** Give the roof deck a bill. The hook records `E_UNPAID` and does not create the mass.
- **PROPOSED-AD-04.** `DEUS_Ecology.js` still sprouts `ironstone`, `copper_outcrop` and `gold_outcrop`. `setIn` refuses those after seal only when `UF.Matter` is attached. This lane cannot edit Ecology.
- **PROPOSED-AD-05.** Catalogue action counts that do not match the mass-table yields (D-CATALOG-YIELD) are still what the world drops. The ledger posts the mass-table list.

## Certification

Not self-certified. An independent gemini review decides.
