# SOC.32.01 lane-br report

- Date: 2026-09-27
- Branch: `task/lane-br`
- Base: `368632d629bb65a773ee8c204578d7bf1ab74c61`
- Scope: isolated persisted schema and pure deterministic Quartermaster physical allocation planner

## What changed

- `game/data/society/quartermaster.schema.json`: added the closed Draft 2020-12 persisted plan schema, including embedded caller input, reservations, allocation outcomes, refusals, exact remainders, and conservation proof records.
- `game/js/sim/society/DEUS_Quartermaster.js`: added strict plain-data validation, canonical copying, exact-item allocation, deterministic caller ordering, safe-integer arithmetic, conservation proofs, tamper-recomputing plan validation, and detached serialization/audit APIs.
- `docs/systems/DEUS_Quartermaster.md`: documented the contract, mechanical ordering, capacity convention, conservation equations, finance separation, APIs, save boundary, and limitations.
- `tools/society/test_quartermaster.js`: added the bare-context gate, independent per-identity oracle, targeted negative fixtures, real failure-path child provocation, 42 in-memory source mutants, and 5 in-memory schema mutants.
- `tasks/SOC.32.01/lane-br/AUTHORITY_GAPS.md`: recorded every identified absent gameplay policy, physical adapter, capacity conversion, lifecycle, finance, persistence, and reporting authority.
- `tasks/SOC.32.01/lane-br/CLAIM.md`: recorded and released the allowed-path lane claim without editing central status outside this lane's write scope.
- `tasks/SOC.32.01/lane-br/REPORT.md`: recorded the writer evidence and remaining limits.

No Resources, Items, Containers, Jobs, scheduler, treasury, mint, militia, tax, payroll, save wiring, plugin registration, art, or audio file was edited or integrated.

## How I tested it

- Foreground gate on 2026-09-27:

  ```text
  node tools/society/test_quartermaster.js
  checks include 116 real-module conditions, 42 source mutants, and 5 schema mutants; 1589 ms
  RESULT: 167 passed, 0 failed
  EXIT_CODE=0
  ```

- The same gate exercised its actual failing runner in a child process. Exact parent observation:

  ```text
  PASS harness_real_failure_path_exits_nonzero: child runner emitted named FAIL and RESULT: 0 passed, 1 failed with exit 1
  ```

- Foreground repository syntax gate on 2026-09-27:

  ```text
  node tools/check_deus_syntax.js
  Checked 60 DEUS plugin files. Errors: 0
  EXIT_CODE=0
  ```

- Additional writer syntax checks during development:

  ```text
  node --check game/js/sim/society/DEUS_Quartermaster.js
  node --check tools/society/test_quartermaster.js
  EXIT_CODE=0 for both; neither command printed diagnostics.
  ```

- Independent read-only adversarial probes on the final module hash exercised 1,615 ordinary/boundary cases and rejected 344 derived-plan corruptions. The reviewer also observed zero calls to hostile foreign `map`, `slice`, `sort`, `filter`, `push`, `pop`, `indexOf`, `toJSON`, and iterator hooks. These are supplementary review results, not substitutes for the two recorded writer gates.

Requirement-to-check map:

| Rule | Failing control or mutation evidence |
|---|---|
| Stock, capacity, and demand bounds | `full_partial_refusal_outputs`; `mutant_ignore_stock_bound_killed`; `mutant_ignore_capacity_bound_killed`; `mutant_ignore_demand_bound_killed` |
| Exact item and explicit eligibility only | `wrong_item_and_ineligible_stock_never_substitute`; `mutant_wrong_item_substitution_killed`; `reject_nonarray_eligibility` |
| No treasury, prices, wealth, or balance supply path | `treasury_field_rejected`; `financial_values_in_provenance_have_no_supply_path`; `mutant_treasury_as_stock_fallback_killed` |
| Caller-defined deterministic total order | `priority_and_tiebreak_are_caller_order`; `lot_selection_order_not_array_or_id`; ambiguous-order negatives; reversed-priority and ignored-lot-order mutants |
| Stable identities and provenance | `canonical_input_preserves_every_caller_fact`; duplicate-ID negatives; provenance-erasure mutants; per-row independent audit |
| Safe exact quantities | fractional, unsafe, range, aggregate-overflow, and negative-zero negatives; unsafe/fractional/negative-zero mutants |
| Conservation and exact remainders | `independent_per_identity_conservation`; zero/untouched remainder control; created/lost/balanced-proof mutants |
| Copy-on-write and no hostile array behavior | frozen-input, graph-detachment, accessor, subclass, counterfeit-prototype, foreign-intrinsic, inherited-getter, and prior-output-poisoning controls |
| Persisted-plan strictness | schema acceptance/negative matrix, five schema mutants, round-trip, recomputation tamper controls, forged deserialize cases, invalid audit cases |
| Harness can fail | child runner emitted a named failure and exited 1; malformed or unloaded source mutants are reported as failures rather than kills |

## Evidence

- Screenshot: not produced. This lane has no UI, map, scene, plugin registration, or RMMZ integration surface to capture.
- Log excerpt from the final dedicated gate:

  ```text
  PASS mutant_create_one_unit_killed: failed named control(s): independent_per_identity_conservation, persisted_plan_round_trip_and_audit
  PASS mutant_lose_one_unit_killed: failed named control(s): independent_per_identity_conservation, persisted_plan_round_trip_and_audit
  PASS mutant_treasury_as_stock_fallback_killed: failed named control(s): treasury_field_rejected, financial_values_in_provenance_have_no_supply_path
  PASS schema_mutant_eligibility_ids_not_unique_killed: failed named control(s): schema_rejects_id_bounds_closed_required_enum_and_unique_fields
  checks include 116 real-module conditions, 42 source mutants, and 5 schema mutants; 1589 ms
  RESULT: 167 passed, 0 failed
  EXIT_CODE=0
  ```

- Final allowed-path and staged-diff inspection on 2026-09-27: all seven staged paths matched `lane.json` (`7 paths, 0 violations`); `git diff --cached --check` exited 0 with no diagnostics; every staged addition was read file by file, including the complete 1,708-line test harness, before commit.

## Not done / known problems

- RMMZ F5 Playtest, F8 console inspection, native save/load, and a screenshot were not run. The brief forbids integration edits, and the new CommonJS pure module is not registered with RMMZ. The dedicated gate is the syntax/load check for this file because `tools/check_deus_syntax.js` scans only `game/js/plugins/DEUS_*.js`.
- The plan proves consistency with the embedded caller snapshot. It does not prove that lots currently exist, remain unreserved, are owned by the caller, or can be atomically transferred. Those adapter and concurrency questions are recorded in `AUTHORITY_GAPS.md`.
- Destination capacity is already-normalized caller data using one capacity unit per allocated item quantity. Weight, volume, slots, stacking, filters, ownership, and occupancy conversions have no tracked common authority.
- Arbitrary ECMAScript `Proxy` traps are outside the persisted plain-data contract; a future adapter must materialize ordinary records and arrays.
- The PM fresh-clone gate and independent cross-family review required after writer handoff have not been performed in this lane.

## Try it in RMMZ

1. There is no authorized RMMZ test route for this isolated lane; do not add the module to `plugins.js` or save wiring to manufacture one.
2. Run `node tools/society/test_quartermaster.js` from the repository root.
3. Run `node tools/check_deus_syntax.js` from the repository root.

Expected: the dedicated gate reports the exact counts recorded above and exits 0; the repository syntax gate reports 60 checked plugin files, 0 errors, and exits 0. No RMMZ-visible change is expected.

## Decisions needed

- No additional gameplay-policy decision is needed for the isolated planner candidate.
- Later integration authority must decide snapshot ownership/revisions, demand and priority policy, eligibility/ownership, common capacity units, reservation lifecycle and atomic execution, live persistence ownership, and presentation wording before this plan can control physical state.
