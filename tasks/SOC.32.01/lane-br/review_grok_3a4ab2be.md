# SOC.32.01 review (Grok) of 3a4ab2be5f585573c081b5bf2275966719029df0

Independent review of the isolated Quartermaster physical allocation planner. The writer tip under review is `3a4ab2be5f585573c081b5bf2275966719029df0` (`[codex] SOC.32.01 physical allocation planner`, parent `be1b67f4d120f55c478f245e332e8d9e651a4b5d`). This worktree's HEAD at review time was `19694f346e4dc02c1538299e06d4edce5cc819ee`, one later ops commit that adds only `tasks/SOC.32.01/lane-br/launches/20260927_201348_prompt.txt`. `git diff --name-status 3a4ab2be5f585573c081b5bf2275966719029df0 HEAD` is that single launch file. The gates and the independent probe loaded the worktree bytes, which are the writer-tip bytes for every product path.

Node.js v24.19.0. SHA-256 of the reviewed product files:

| File | SHA-256 |
|---|---|
| `game/js/sim/society/DEUS_Quartermaster.js` | `82d6218e783f268c7236e5cf60f65854e92093cc2d96fcf30ef2a966e176a359` |
| `game/data/society/quartermaster.schema.json` | `be9f9e3b8422fe422062e1a16b04edd51120a734f9dc31a6010225e739fdd42a` |
| `tools/society/test_quartermaster.js` | `3660f7b1d23b7083d60e5d68b1a244d3255694bbd7735b603fea28a26bc5a4de` |
| `docs/systems/DEUS_Quartermaster.md` | `c883d833cdeff56236b0c02fd41b4eaa8d72b8837a5956062856fae024e72bca` |

VERDICT: PASS

## Range and allowed paths

The brief base is `368632d629bb65a773ee8c204578d7bf1ab74c61`. That commit is also `git merge-base 368632d629bb65a773ee8c204578d7bf1ab74c61 3a4ab2be5f585573c081b5bf2275966719029df0`. Lane commits:

- `eb39622331753348a69f3301227bc900339ce1a1` `[ops] Register SOC.32.01 lane-br`
- `be1b67f4d120f55c478f245e332e8d9e651a4b5d` `[ops] SOC.32.01 lane-br launch prompt 20260927_191455 (writer codex)`
- `3a4ab2be5f585573c081b5bf2275966719029df0` `[codex] SOC.32.01 physical allocation planner`

`git diff --name-status 368632d629bb65a773ee8c204578d7bf1ab74c61 3a4ab2be5f585573c081b5bf2275966719029df0`:

```text
A	docs/systems/DEUS_Quartermaster.md
A	game/data/society/quartermaster.schema.json
A	game/js/sim/society/DEUS_Quartermaster.js
A	tasks/SOC.32.01/lane-br/AUTHORITY_GAPS.md
A	tasks/SOC.32.01/lane-br/BRIEF.md
A	tasks/SOC.32.01/lane-br/CLAIM.md
A	tasks/SOC.32.01/lane-br/REPORT.md
A	tasks/SOC.32.01/lane-br/lane.json
A	tasks/SOC.32.01/lane-br/launches/20260927_191455_prompt.txt
A	tools/society/test_quartermaster.js
```

All ten paths are inside `tasks/SOC.32.01/lane-br/lane.json` `allowedPaths`. The writer commit adds the planner, schema, system contract, gate, authority-gap record, and report. No path is `game/js/plugins.js`, a Resources, Items, Containers, Jobs, mint, treasury, militia, tax, payroll, or save file.

`git merge-base origin/main 3a4ab2be5f585573c081b5bf2275966719029df0` is `6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0`. The four paths that differ between that merge-base and the brief base are pre-lane local-main drift, and none of them is in the lane commits: `docs/OWNER_DECISIONS.md`, `docs/STATUS.md`, `docs/society/DEUS_SOCIETY_WBS.md`, `docs/telemetry/sessions/active_workers.json`. A search of that pre-lane diff for `quartermaster`, `Quartermaster`, and `SOC.32` returned no hits.

## Gates

Both recorded commands were run in this worktree.

`node tools/society/test_quartermaster.js` — exit 0.

```text
checks include 116 real-module conditions, 42 source mutants, and 5 schema mutants; 1637 ms
RESULT: 167 passed, 0 failed
```

The child-process harness check passed with this parent observation:

```text
PASS harness_real_failure_path_exits_nonzero: child runner emitted named FAIL and RESULT: 0 passed, 1 failed with exit 1
```

Every source mutant anchor occurred once, the mutated source loaded, and the mutant failed at least one named passing control. Killed source mutants:

| Mutant | Killed by |
|---|---|
| `ignore_stock_bound` | `full_partial_refusal_outputs`, `independent_per_identity_conservation` |
| `ignore_capacity_bound` | `full_partial_refusal_outputs`, `shared_capacity_cross_item_bound` |
| `ignore_demand_bound` | `full_partial_refusal_outputs`, `independent_per_identity_conservation` |
| `wrong_item_substitution` | `wrong_item_and_ineligible_stock_never_substitute`, `independent_per_identity_conservation` |
| `prototype_named_fields_accepted` | `prototype_named_unknown_fields_rejected_at_every_boundary` |
| `input_structure_guard_disabled` | `input_accessors_and_non_enumerable_fields_rejected_without_execution` |
| `missing_root_fields_read_from_prototype` | `missing_fields_never_resolve_inherited_foreign_getters` |
| `id_and_order_ranges_disabled` | zero ids and negative order controls |
| `negative_zero_numbers_accepted` | quantity, capacity, priority, and provenance negative-zero controls |
| `provenance_symbols_allowed` | `provenance_symbols_and_hidden_fields_rejected` |
| `persisted_json_guard_disabled` | `persisted_plan_array_extras_symbols_and_sparse_rows_rejected` |
| `item_proof_creates_balanced_unit` | `independent_per_identity_conservation` |
| `behavioral_array_prototypes_allowed` | subclass and persisted-array controls |
| `caller_lot_map_invoked` | `foreign_array_intrinsics_cannot_mutate_or_invent_input` |
| `caller_eligibility_slice_invoked` | `foreign_array_intrinsics_cannot_mutate_or_invent_input` |
| `item_id_grammar_relaxed` | whitespace, newline, leading punctuation, and length controls |
| `lot_item_id_validation_removed` | `reject_malformed_lot_item_id` |
| `request_destination_id_validation_removed` | string, zero, and fractional destination controls |
| `eligibility_array_validation_removed` | `reject_nonarray_eligibility` |
| `request_provenance_validation_removed` | `reject_invalid_request_provenance` |
| `destination_provenance_validation_removed` | `reject_invalid_destination_provenance` |
| `request_provenance_erased` | `canonical_input_preserves_every_caller_fact` |
| `destination_provenance_erased` | `canonical_input_preserves_every_caller_fact` |
| `destination_provenance_alias` | `input_output_and_cross_call_graphs_are_detached` |
| `reservation_request_provenance_alias` | `input_output_and_cross_call_graphs_are_detached` |
| `deserialize_skips_validation` | `deserialize_revalidates_parseable_forged_plans` |
| `audit_forces_success` | `audit_reports_invalid_plan_errors_without_conservation` |
| `audit_conservation_alias` | `persisted_plan_round_trip_and_audit` |
| `duplicate_lot_id_accepted` | `reject_duplicate_lot_id` |
| `duplicate_request_id_accepted` | `reject_duplicate_request_id` |
| `duplicate_source_item_id_accepted` | `reject_duplicate_source_item_id` |
| `unsafe_quantity_accepted` | `reject_unsafe_quantity`, `reject_unsafe_capacity` |
| `fractional_quantity_rounded` | `reject_fractional_quantity` |
| `ambiguous_request_tie_accepted` | `reject_ambiguous_request_order` |
| `priority_reversed` | `priority_and_tiebreak_are_caller_order` |
| `lot_order_ignored` | `lot_selection_order_not_array_or_id`, `multiple_lots_keep_order_identity_and_provenance` |
| `input_output_alias` | detachment and permutation controls |
| `create_one_unit` | conservation and round-trip controls |
| `lose_one_unit` | conservation and round-trip controls |
| `capacity_resets_each_request` | `shared_capacity_cross_item_bound`, `independent_per_identity_conservation` |
| `treasury_as_stock_fallback` | `treasury_field_rejected`, `financial_values_in_provenance_have_no_supply_path` |
| `shallow_lot_provenance_copy` | `input_output_and_cross_call_graphs_are_detached` |

Killed schema mutants, all against `schema_rejects_id_bounds_closed_required_enum_and_unique_fields`: `positive_ids_allow_zero`, `lot_allows_unknown_fields`, `lot_has_no_required_fields`, `allocation_status_unbounded`, `eligibility_ids_not_unique`.

`node tools/check_deus_syntax.js` — exit 0.

```text
Checked 60 DEUS plugin files. Errors: 0
```

That gate reads `game/js/plugins/DEUS_*.js` only. `DEUS_Quartermaster.js` is absent from `game/js/plugins.js`. The dedicated gate is the load and syntax evidence for the new module: it compiled and executed the writer-tip source in a bare `vm` context.

## Independent conservation probe

A separate Node probe, not part of the lane commit, required `DEUS_Quartermaster.js` and kept its own decision procedure and bigint ledger. It did not trust `conservation.valid`. For every accepted plan it checked per-lot, per-request, per-destination, per-item, and aggregate equations; exact item identity on every reservation; caller eligibility; positive reservation quantities; one row per request/lot pair; provenance equality; and nonnegative remainders. It also required `serialize` to equal an independent compact encoder and to round-trip.

Hand-checked complex snapshot: food lots 5 and 4, axe 2, physical `coin:gp` 50, stone 3, sword 1; requests in descending priority for 5 food, 4 food, 3 axes, 2 food eligible only for the coin lot, 2 stone into a zero-capacity destination, and 2 swords. Observed reservations, in order:

| Request | Lot | Source | Item | Destination | Quantity |
|---:|---:|---:|---|---:|---:|
| 301 | 102 | 1002 | `food:ration` | 201 | 4 |
| 301 | 101 | 1001 | `food:ration` | 201 | 1 |
| 302 | 101 | 1001 | `food:ration` | 201 | 1 |
| 303 | 103 | 1003 | `tool:axe` | 202 | 2 |
| 306 | 106 | 1006 | `arm:sword` | 202 | 1 |

Outcomes: 301 FILLED 5/0; 302 PARTIAL 1/3 `DESTINATION_CAPACITY_EXHAUSTED`; 303 PARTIAL 2/1 `ELIGIBLE_EXACT_STOCK_EXHAUSTED`; 304 REFUSED 0/2 `ELIGIBLE_EXACT_STOCK_EXHAUSTED`; 305 REFUSED 0/2 `DESTINATION_CAPACITY_EXHAUSTED`; 306 PARTIAL 1/1 `ELIGIBLE_EXACT_STOCK_EXHAUSTED`. Stock proof 65/9/56. Demand proof 18/9/9. Capacity proof 10/9/1. Per item: `food:ration` 9/6/3, `coin:gp` 50/0/50, axe 2/2/0, sword 1/1/0, stone 3/0/3. The coin lot's provenance carried `price` and `treasuryBalance` and contributed no food.

Further exact cases that matched the same oracle:

- Stock 5, demand 8, capacity 5 allocates 5, refuses 3, remainder 0, code `STOCK_AND_DESTINATION_CAPACITY_EXHAUSTED`.
- Stock 5, demand 8, capacity 3 allocates 3, refuses 5, remainder 2, code `DESTINATION_CAPACITY_EXHAUSTED`.
- Stock 2, demand 8, capacity 5 allocates 2, refuses 6, remainder 0, code `ELIGIBLE_EXACT_STOCK_EXHAUSTED`.
- Lots of 2, 5, and 5 with capacity 4 allocate 2 then 2 from the lower `selectionOrder` lots and leave the third lot at 5.
- An earlier food lot of 9 that is absent from `eligibleLotIds` stays at 9 while the eligible lot of 2 is consumed.
- A higher-priority request into capacity 0 refuses and leaves the lot available for a lower-priority request on another destination.
- Equal priority uses smaller `tieBreakOrder` even when that request is later in the array. Priority 9 beats priority 1 even when the lower priority is listed first and has the smaller tie-break. Priority -1 beats -50. Priority `9007199254740991` beats `0`, `-1`, and `-9007199254740991`.
- Lot id 1 with `selectionOrder` 20 loses to lot id 9 with `selectionOrder` 10.
- `Food:ration` and `food:ration` do not substitute. Eligible ids `[10, 2]` are stored as `[2, 10]`, while the lot with `selectionOrder` 0 is still consumed first.
- A repeated `(priority, tieBreakOrder)` and a repeated `selectionOrder` are rejected even when stock would cover both requests. A repeated `sourceItemId` across two item ids is rejected.
- Empty eligibility refuses the demand and leaves stock unchanged. A zero-capacity destination with eligible stock still on hand reports `DESTINATION_CAPACITY_EXHAUSTED` and does not debit the lot.

Safe-integer bounds, all exact:

- One lot, one request, and one destination at `9007199254740991` allocate that value and leave remainder 0.
- Food `(9007199254740991 - 1) / 2` plus axes `4503599627370496` sums to `9007199254740991`. Both items fill, both remainders are 0, and the stock proof available value is `9007199254740991`.
- Adding one more unit to a lot sum, a request sum, or a capacity sum that is already at the maximum throws `E_ARITHMETIC_UNSAFE` and leaves the original quantity in place.

Closed rejection observed directly: fractional, string, zero, negative, and negative-zero quantities; negative-zero priority and provenance; string destination and eligibility ids; duplicate and unknown eligibility; a quantity accessor that was not invoked; and root, lot, request, and destination fields `treasury`, `treasuryBalance`, `wealth`, `price`, `prices`, `balance`, `balances`, `accounts`, `payroll`, `budget`, `debt`, `credit`, `weight`, `volume`, `slots`, `owner`, `spoilage`, `militia`, `ration`, and `quota`. An empty granary whose provenance holds `treasuryBalance`, `price`, `wealth`, and `balance` at the safe-integer maximum allocates 0 and refuses 4. A physical `coin:gp` lot satisfies a `coin:gp` request and does not move a sibling food lot, including when the food request lists only the coin lot.

Determinism and identity: all 216 orderings of a 3-lot, 3-request, 3-destination input, including reversed eligibility arrays, produced one serialize byte string. Three hundred seeded inputs with shuffled rows, shared capacity, mixed items, empty eligibility, zero capacity, negative priorities, and financial provenance matched the oracle and the bigint ledger. Frozen input survived planning with the same snapshot. Output graphs were disjoint from the input, from each other across two calls, and from `deserialize`. Mutating a reservation's nested provenance changed neither the other call nor the previously serialized bytes. After load, replacing `Array.prototype.sort`, `map`, `slice`, `filter`, `push`, `pop`, and `indexOf` with throwing functions left the serialized plan unchanged.

Persisted-plan rejection: created unit, lost unit, offsetting lot pair, item swap, a self-consistent quantity lie, reordered reservations, refusal-code-only edit, `conservation.valid = false`, a `treasury` field, a duplicate per-item proof, an embedded-input-only edit, and a dropped reservation all fail `serialize` and `deserialize` with `E_PLAN_MISMATCH`. Deleting a reservation index so the array is sparse fails with `E_PLAN_JSON`. A serialized plan whose `"remainingQuantity":2` was rewritten to `-0` parses as negative zero and fails `deserialize` with `E_PLAN_JSON`. A fractional quantity in JSON fails with `E_PLAN_JSON`. `audit` on each tamper returned `ok: false` and `conservation: null`, and mutating a successful audit did not change the plan.

Canonical bytes keep provenance array order (`[3,1,2]` stays in that order), sort ordinary object keys, and emit canonical integer-index keys in numeric order before the remaining keys (`{"2":4,"10":3,"4294967295":5,...}`). Reversing input rows and rewriting the same provenance with a different insertion order produced the same bytes. A 128-character item id and `Food/ration` are accepted. Empty, spaced, newline, leading-punctuation, 129-character, and non-string item ids are rejected with `E_ITEM_ID`. Generated plans used in the probe also passed an independent walk of `quartermaster.schema.json`; that walk rejected a treasury field, a fractional quantity, lot id 0, duplicate eligibility, and status `MAYBE`.

## INV-SOC-06

`docs/INVARIANT_REGISTRY.md` states INV-SOC-06 as separation of faction monetary balance and Quartermaster physical goods: financial wealth cannot substitute for physical food. The planner has no treasury, price, balance, wealth, payroll, or account field in its closed input, and a source scan of `DEUS_Quartermaster.js` found none of those words. Unknown financial fields are rejected at the root and on lot, request, and destination records. Financial numbers inside provenance are copied as opaque JSON and are not read by the allocator. Exact `itemId` equality is required, so a physical coin lot can satisfy only a request for that same item id. The `treasury_as_stock_fallback` mutant, which admits financial fields and treats a treasury balance as a filled request, was killed by both finance controls.

## Authority gaps

`tasks/SOC.32.01/lane-br/AUTHORITY_GAPS.md` still records the open questions, and the implementation does not answer them:

- Ownership and live presence stay caller facts. There is no owner field, no catalogue, and no lookup into Items, WorldItems, or Containers. Repeated `sourceItemId` values are rejected because no disjoint-slice contract exists.
- Destination capacity is used as one already-normalized unit per allocated quantity. Weight, volume, slots, spoilage, and militia fields are rejected. No conversion table was added.
- Reservation rows are the proposal ledger inside the returned plan. The frozen export list is `VERSION`, `INPUT_KIND`, `PLAN_KIND`, `REFUSAL_CODES`, `validateInput`, `validatePlan`, `plan`, `audit`, `serialize`, and `deserialize`. There is no reserve, release, cancel, commit, or transfer operation and no module-level mutable ledger.
- Two sequential plans on the same input do not share output objects. No concurrency, expiry, or replay policy is encoded.
- `serialize` and `deserialize` validate a version-1 plan. No save key, plugin registration, or migration was added.
- Integration with Resources, Items, Containers, Jobs, the scheduler, treasury, mint, militia, tax, and payroll is absent from the diff.

The WBS row for SOC.32.01 remains `PLANNED` in the tracked society WBS. This lane's allowed paths do not include that file, and the lane did not edit it.

## Art and audio

`git diff --name-only 368632d629bb65a773ee8c204578d7bf1ab74c61 HEAD` is the ten writer paths plus the reviewer launch prompt. None is under `art/`, `game/audio/`, `game/img/`, or `docs/art/`, and none has an image or audio extension. No art or audio file changed.

## Verdict

The merge-base-to-tip planner conserves every checked physical quantity by lot, item, request, destination, and aggregate. It does not create or lose stock, does not substitute item identities, and does not allocate beyond stock, demand, destination capacity, or caller eligibility. Ordering is fixed by caller priority, tie-break, and lot `selectionOrder`, including across the 216 permutations. Identities and provenance survive. Validation fails closed, and tampered plans are rejected by recomputation. Safe-integer aggregates hold through the maximum safe integer. Inputs and outputs are detached, and serialization is canonical. Treasury and other financial values have no supply path. The recorded authority gaps remain gaps.

VERDICT: PASS
