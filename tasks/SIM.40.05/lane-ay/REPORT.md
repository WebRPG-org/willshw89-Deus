# SIM.40.05 lane-ay report

Writer: grok. Branch `task/lane-ay`. This package is the design's PROPOSED-R-01 and the host-agnostic part of PROPOSED-R-02. It does not mark the task DONE. Gemini reviews it.

Code under test for the gate run below is commit `1a7cb4c6afcaafe0de3e9c76bfc6e50003b4a56d`. This report does not change that code.

## What changed

- `game/data/sim/decay_params.json` and `game/data/sim/decay_params.schema.json`. Decay classes, seven exposures, lives in milli-years, freeze-thaw / root / fire modifiers, stage points (rem 850,000 and the foundation floor 250,000), residue and humus fractions, structure templates, and the transform name list. `dpy` is null.
- `game/js/sim/decay/`. Pure CommonJS. `clock.js` is the R-01.2 clock. `heap.js` orders `(dueYt, id)`. `validate.js` is the dependency-free checker. `core.js` holds members, the long and short heaps, sparse byte counts, and booking records. No plugin, no strata write, no art.
- `tools/sim/test_decay_core.js` and `tools/sim/fixtures/decay/expected_instants.json`.
- `docs/systems/DEUS_Decay.md`.

`createDecay(params, { dpy })` requires `dpy`. The clock functions do not take it. `tick = dueYt × dpy` and the day-boundary test are the only uses.

## Evidence

The test oracle is a separate integer implementation of `lifeYt`, `rem`, `cross`, and the band rebase. It matches the implementation on every finite class and exposure, and it matches the pinned instants.

| Case | Result |
|---|---|
| ASHLAR SHELTERED, wR 90, no modifier | `failYt` 48,000,000 at dpy 1 and dpy 360 |
| R-01.6 bands (wR 90, FT 0.25) | 6,522,407; 11,944,052; 16,552,449; 20,469,582 |
| H1 bands (wR 50, FT 0.25) | 3,353,604; 6,055,246; 8,351,640; 10,303,576 |
| H1 at dpy 1, 4, 20, and 360 | the same four instants |
| H1 first band processing day | day 1,398 at dpy 1; day 27,947 at dpy 20 |
| H1 at the y1,397 checkpoint | band 1 not yet failed |
| H1 at the y1,398 checkpoint | band 1 failed |
| H2 bands | 149,640; 227,875 |
| Per-day milli-rate mutant, 20,000 sy, maxHP 120 | 20,000 sy at dpy 1 and 6,000 sy at dpy 20. The clock stays 48,000,000 yt. |
| MR-16 published instants | 6,056,602 and 6,055,276. The clock's second band is 6,055,246 at both dpy values. |
| Rebase of sheltered timber at yt 72,000 | `t0` 72,000, `rem0` 800,000, `lifeYt` 144,000, fail 187,200 |
| Roof break | one call per roof member, `collapse.breakElement`, at most 64 cells, `BUILT→RUBBLE` only after the caller commits. Grand total unchanged. |
| Stage crossing | no booking. A source record is refused. |
| Short heap | SKY remains become skeletal at tick `k+600` (dpy 1) and `k+12,000` (dpy 20). A sky loaf fails at yt 240. |
| Long heap | an instant inside a day waits for that day's boundary, then at most `ceil(due/2400)` entries per tick. The event's `atYt` stays the year-tick. |
| Save / load | heaps are absent from the blob. `lifeYt` is kept. Continuing matches the uninterrupted checksum. A load that did not rebuild would not fire the pending break. |
| Layers | the same records at z −12 and z 3, and at z −3 and z −12, report the same byte count. A dense plane of `layers × 1024 × 24` differs by more than 64 KiB between 9 and 32 layers. |

Validator rejects a zero life, infinity on THATCH, a milli-year that does not make `lifeYears × 2400` an integer, a `lifeYt` past `2^32−2`, an unknown field, a chosen `dpy`, coal / gem / fossil-bed outputs, and a template whose ROOF life at SKY is not shorter than its WALL life at SHELTERED.

## Memory and per-tick cost

Typed sizes from R-10.2. The layer count is not a factor.

| Row | Arithmetic | Bytes |
|---|---|---|
| One site, 600 members × 8 runs | 600 × (40 + 32) | 43,200 |
| 40 structures | 40 × 32 | 1,280 |
| One site record | 16 | 16 |
| Site total | | 44,496 |
| Scenario L members | 150,000 × 72 | 10,800,000 |
| Scenario L structures | 10,000 × 32 | 320,000 |
| Scenario L member heap | 45,000 × 12 | 540,000 |
| Scenario L items | 200,000 × 32 | 6,400,000 |
| Scenario L remains | 41,700 × 48 | 2,001,600 |

R-10.4's 20,000 events per sy is `ceil(20000 / 2400) = 9` events per tick at dpy 1, and `ceil(20000 / 48000) = 1` at dpy 20. Remains at 2,500 per sy sit under the short-heap cap of 16 per tick (`2500 ≤ 16 × 2400`). An empty tick compares the heap top once.

## Owner questions

None of these are answered here. The parameter file stores the design default and an `ownerOpen` tag.

| Id | Shipped default |
|---|---|
| D-1 | `dpy` is null. Callers pass it. |
| OQ-R-01 | (a) the life table. No speed factor. |
| OQ-R-02 | Not implemented. Foundations schedule the anchor floor (rem 250,000) rather than rem 0. That is the design's TR-1 mechanism, not a term for how long a ruin stays recognizable. |
| OQ-R-03 | Lithification is off. The row outputs ROCK-SED only and is not run. |
| OQ-R-04 | (a) unattended items weather. Attended items get no decay record. |
| OQ-R-05 | (a) SPECIAL lives are infinite. |
| OQ-R-06 | (a) the sy remains table, anchor 200 sy. |
| OQ-R-07 | (a) exposed ash and charcoal have weather lives; buried residue is infinite. |
| OQ-R-08 | Not in this package. |
| OQ-R-09 | (a) a caller-supplied damage threshold does not stop the clock. Options (b) and (c) are not implemented. |

BONE SEALED and BONE WET are gaps. R-03.5 points at the skeletal row, which has no those columns. `addMember` refuses them.

CUPROUS, LEADTIN and SILVER have no numeric reference `corrosionResistance` in the design. Their table is scale 1 until the caller passes `fieldNum` and `fieldDen`. FERROUS uses denominator 30.

## Follow-ups

- PROPOSED-AY-01. Wire this module to the core tick and to Lane Q's break path (SIM.00.05, SIM.40.02). R-05 names are still the design's ASSUMED names. The break handler here is the caller's.
- PROPOSED-AY-02. FX-R-01 long-run ledger (AT-R-17 / PROPOSED-R-10): fire, litter, sediment, and the 9-layer and 32-layer world, not only the clock instants.
- PROPOSED-AY-03. Item composites, the remains hand-off names, and the mass unit against Lane W (PROPOSED-R-04). Gentle repose is one duration written in game days. It is data-adjacent and not executed.
- PROPOSED-AY-04. Map design form names (BUILT, FINES, OXIDE, REMAINS) onto `ledger.js` classes. This package posts only when the record already names a ledger row. The tested row is wood object → wood ruin.
- PROPOSED-AY-05. Site maintenance, abandonment, and the ruin flag (PROPOSED-R-03 / AT-R-03, AT-R-04). A maintained member already has an empty heap entry. The population triage is not here.
- PROPOSED-AY-06. S2, S5, S6, burial exposure, and lithification (OQ-R-03). S0, S1, S3, and S4 are derived from member clocks only.

## Gate

Commands from `tasks/SIM.40.05/lane-ay/lane.json`, run from the worktree after `1a7cb4c6`. Exit 0 on each.

### `node tools/sim/test_decay_core.js`

```
PASS validate_clean
PASS schema_required
PASS dpy_unset
PASS tag_OQ-R-01
PASS tag_OQ-R-04
PASS tag_OQ-R-05
PASS tag_OQ-R-09
PASS reject_zero
PASS reject_infinite_thatch
PASS reject_fraction
PASS reject_life_yt
PASS reject_unknown
PASS reject_dpy_chosen
PASS reject_ore
PASS reject_gem
PASS reject_fossil
PASS reject_roof_wall
PASS dpy_required
PASS long_life_yt
PASS r016_lives
PASS h1_lives
PASS ft8
PASS oracle_grid
PASS inverse
PASS at_r01_long_life
PASS hp_only_thresholds
PASS hp_on_cross
PASS not_every_day
PASS mutant_per_day_disagrees
PASS clock_ignores_per_day
PASS rebase_assignment
PASS rebase_moves_fail
PASS threshold_ignored
PASS h1_s1
PASS h1_s3
PASS h1_bands
PASS h1_s4
PASS not_mr16
PASS not_mr15_years
PASS day_due_differs
PASS checkpoint_year
PASS checkpoint_inclusion
PASS r016_bands
PASS h2_bands
PASS break_per_roof
PASS enqueued_cap
PASS no_deletion
PASS built_to_rubble
PASS wall_rebased
PASS member_cap
PASS mutant_world_recheck
PASS stage_no_mass
PASS mutant_mass_created
PASS mutant_stage_delta
PASS heap_order
PASS mutant_heap_order
PASS long_not_mid_day
PASS long_budget
PASS long_spread
PASS short_cap
PASS skeletal_tick_dpy1
PASS skeletal_tick_dpy20
PASS food_dpy20
PASS barrier_stops
PASS barrier_uses_cause_instant
PASS attended
PASS maintained_idle
PASS corrosion_conserves
PASS sparse_layers
PASS mutant_dense_plane
PASS r10_site
PASS r10_tick
PASS layout_no_layers
PASS residue_split
PASS rot_split
PASS save_omits_heap
PASS load_keeps_life
PASS load_does_not_rederive
PASS reload_continues
PASS heap_rebuilt
PASS mutant_lost_heap
PASS ledger_conserves
PASS ledger_refuses_coal
PASS purity
PASS special_infinite
PASS bone_gap
PASS layer_memory
decay core 87 passed, 0 failed
EXIT_DECAY=0
```

### `node tools/sim/test_materials.js`

```
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
EXIT_MATERIALS=0
```

### `node tools/sim/test_ledger.js`

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
PASS mutant_transform_drops_1_unit_killed
PASS mutant_transform_adds_1_unit_killed
PASS mutant_source_skips_name_check_killed
PASS mutant_sink_skips_name_check_killed
PASS mutant_ore_output_allowed_at_load_killed
PASS mutant_ore_output_allowed_at_call_killed
PASS mutant_ore_source_allowed_at_call_killed
PASS mutant_ore_source_allowed_at_load_killed
PASS mutant_ore_recipe_output_allowed_killed
PASS mutant_rust_changes_element_in_defaults_killed
PASS mutant_element_check_removed_at_load_killed
PASS mutant_element_check_removed_at_call_killed
PASS mutant_recipe_balance_unchecked_killed
PASS mutant_finite_source_allowed_at_call_killed
PASS mutant_finite_source_allowed_at_load_killed
PASS mutant_seal_not_enforced_for_register_killed
PASS mutant_seal_not_enforced_for_calls_killed
PASS mutant_float_accepted_killed
PASS mutant_negative_accepted_killed
PASS mutant_overflow_unchecked_killed
PASS mutant_family_overflow_unchecked_killed
PASS mutant_insufficient_unchecked_killed
PASS mutant_composite_multiple_unchecked_killed
PASS mutant_cause_unchecked_killed
PASS mutant_audit_ignores_a_class_killed
PASS mutant_audit_ignores_families_killed
PASS mutant_closure_check_disabled_killed
PASS mutant_interval_family_identity_disabled_killed
PASS mutant_interval_class_identity_disabled_killed
PASS mutant_checksum_ignores_key_order_killed
PASS mutant_checksum_commutative_killed
PASS mutant_checksum_ignores_a_class_killed
PASS mutant_restore_accepts_bad_amounts_killed
PASS mutant_restore_skips_closure_killed
PASS mutant_log_unbounded_killed
PASS mutant_refused_call_leaves_trace_killed
PASS mutant_defaults_ore_sprout_row_killed
PASS mutant_defaults_decay_skip_row_killed
PASS mutant_defaults_magic_marked_confirmed_killed
PASS mutant_defaults_magic_allows_finite_killed
PASS mutant_defaults_not_frozen_killed
PASS mutant_hidden_math_random_caught_dynamically_killed
mutants: 42; run time 12937 ms
RESULT: 117 passed, 0 failed
EXIT_LEDGER=0
```

The ledger log's parenthetical failure examples are omitted above where they only repeat the passing check name. Every line was PASS. Exit 0. Run time 12937 ms. 42 mutants.

### `node tools/check_deus_syntax.js`

```
Checked 58 DEUS plugin files. Errors: 0
EXIT_SYNTAX=0
```
