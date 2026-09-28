# DEUS Quartermaster physical allocation planner

## Purpose

`game/js/sim/society/DEUS_Quartermaster.js` implements SOC.32.01 as an isolated deterministic planner. It accepts a closed snapshot of explicit physical stock lots, explicit demands, caller ordering, explicit lot eligibility, and already-normalized destination capacity. It returns auditable lot reservations, one allocation outcome per request, explicit unfilled-demand refusals, exact lot and capacity remainders, and conservation proof rows.

The module does not discover stock, infer policy, purchase goods, transfer items, lock live inventory, schedule hauling, or integrate with any engine subsystem. That separation preserves INV-SOC-06: treasury wealth, prices, account balances, and abstract faction inventory have no field and no path that can satisfy physical demand.

## Authority and boundaries

- `docs/society/DEUS_SOCIETY_WBS.md` defines SOC.32.01 as distinct physical inventory management for tools, food, raw goods, and arms, resolving physical availability separately from financial wealth.
- `docs/INVARIANT_REGISTRY.md` defines INV-SIM-03 physical conservation and INV-SOC-06 treasury/stores separation.
- `docs/society/DEUS_PERSON_AND_INSTITUTIONS.md` assigns physical stock oversight and reservations to the Quartermaster while the Treasurer separately handles financial records and wage earmarks.
- `tasks/SOC.32.01/lane-br/BRIEF.md` controls this isolated implementation. In particular, it requires caller facts, safe-integer exactness, purity, copy-on-write behavior, deterministic ordering, negative fixtures, and no integration edits.

Items and Containers remain the authorities for live physical instances, placement, storage policy, weight, slots, and ownership. Resources remains the authority for any future approved material substitution. This planner duplicates none of those states or behaviors.

## Persisted data contract

The Draft 2020-12 schema is `game/data/society/quartermaster.schema.json`. The persisted root is a `DEUS_QUARTERMASTER_PLAN` at `schemaVersion: 1`. It embeds a canonical copy of the complete input so a stored plan is self-auditing.

All entity references are positive safe integers. `itemId` is different: it is the exact string catalogue identity requested and supplied, not a live item-instance reference. No aliases, tags, categories, material roles, value equivalence, or case folding are applied.

### Input

| Record | Required fields | Meaning |
|---|---|---|
| Root | `schemaVersion`, `kind`, `lots`, `requests`, `destinations` | Closed input. Unknown fields, including financial fields, are rejected. |
| Lot | `lotId`, `sourceItemId`, `itemId`, `quantity`, `selectionOrder`, `provenance` | One disjoint physical stock lot. `sourceItemId` is the caller's stable physical instance reference and must be unique. Quantity is positive and exact. |
| Request | `requestId`, `itemId`, `quantity`, `priority`, `tieBreakOrder`, `eligibleLotIds`, `destinationId`, `provenance` | One explicit demand. Eligibility is a closed list of supplied lot IDs; an empty list means no lot is eligible. |
| Destination | `destinationId`, `availableCapacity`, `provenance` | Caller-computed free capacity in normalized allocation units. Zero is valid. |

Provenance is opaque persisted JSON. The planner preserves it but assigns it no gameplay meaning. Numeric provenance is restricted to canonical safe integers so serialization remains exact; JavaScript negative zero is rejected because JSON serialization would silently rewrite it to zero. Nested values are copied and canonicalized. Cycles, accessors, non-enumerable fields, sparse or named-field arrays, symbols, functions, non-finite numbers, fractions, unsafe numbers, custom prototypes, and array subclasses are rejected.

All input and persisted records must be ordinary data records or plain arrays, including ordinary values created in another JavaScript realm. Validation inspects own data-property descriptors before reading fields. The planner copies array indices directly and never dispatches through caller-owned `map`, `slice`, `sort`, or similar methods, so modified foreign array intrinsics cannot change stock facts or eligibility.

### Mechanical ordering contract

The caller supplies every order fact:

1. Higher numeric `priority` is planned first.
2. Equal priority uses lower numeric `tieBreakOrder` first.
3. Every `(priority, tieBreakOrder)` pair must be unique; otherwise the input is rejected as ambiguous. Array order and request ID never choose a winner.
4. Among a request's exact-item eligible lots, lower `selectionOrder` is consumed first.
5. `selectionOrder` is globally unique; array order and lot ID never select stock.

These comparisons are API mechanics, not DEUS ration, rank, emergency, military, fairness, or stock-rotation policy. Those policies are absent authority and must be computed by a future caller.

### Capacity convention

One reserved item quantity consumes one supplied capacity unit. `availableCapacity` must therefore already be normalized by the caller into the same indivisible allocation units used by its demands. The module does not convert slots, stacks, kilograms, pounds, ounces, volume, filters, or existing occupancy. Those translations remain an authority gap.

### Output

- `reservations`: one positive physical claim per request/lot pair, with lot, source item, request, exact item, destination, quantity, and detached copies of all three provenance records.
- `allocations`: exactly one outcome per request: `FILLED`, `PARTIAL`, or `REFUSED`, with requested, allocated, and unfilled quantities. This summarizes reservation rows; it is not a second physical pool.
- `refusals`: exactly one row for each nonzero unfilled quantity. Refused quantity is unmet demand, never stock.
- `remainingLots`: exactly one row for every input lot, including untouched lots and zero remainders.
- `destinationRemainders`: exactly one row for every input destination, including unused and zero-capacity destinations.
- `conservation`: aggregate and per-item proof values. `valid` is emitted but never trusted by `validatePlan`; the entire plan is recomputed from its embedded input.

Refusal codes are diagnostic:

- `ELIGIBLE_EXACT_STOCK_EXHAUSTED`
- `DESTINATION_CAPACITY_EXHAUSTED`
- `STOCK_AND_DESTINATION_CAPACITY_EXHAUSTED`

When multiple constraints bind, the last code reports both; otherwise capacity exhaustion is reported before stock exhaustion. This is a deterministic reporting convention, not a gameplay priority.

## Conservation model

Reservations are the sole physical debit. Allocations mirror them by request and are not added again.

For every lot and exact item identity:

```text
available physical quantity = reserved quantity + remaining physical quantity
```

For every request:

```text
requested quantity = allocated quantity + refused/unfilled quantity
```

For every destination:

```text
available capacity = reserved capacity + remaining capacity
```

The total reservation quantity must equal total allocated quantity. Validation also retains and checks every lot, request, source item, destination, item ID, and provenance record, so compensating `+1/-1` corruption and wrong-item substitution cannot hide behind a balanced grand total.

## Public API

The module exports a frozen CommonJS object and uses no host or engine global.

- `VERSION` → `1`.
- `INPUT_KIND` → `"DEUS_QUARTERMASTER_INPUT"`.
- `PLAN_KIND` → `"DEUS_QUARTERMASTER_PLAN"`.
- `REFUSAL_CODES` → frozen diagnostic code list.
- `validateInput(input)` → `{ ok, errors }`. Every error is `{ code, path, message }`. Does not mutate or throw for ordinary invalid data. Arbitrary ECMAScript `Proxy` traps are not part of the persisted-data contract and must be materialized by the caller into plain records first.
- `plan(input)` → a new detached canonical plan. Throws the first coded validation error for invalid input.
- `validatePlan(plan)` → `{ ok, errors }`. Rejects non-JSON state, invalid embedded input, any unknown/missing/tampered output, and every mismatch from the deterministic recomputation.
- `audit(plan)` → `{ ok, errors, conservation }`; proof is returned only for a valid plan.
- `serialize(plan)` → canonical compact JSON after full validation.
- `deserialize(text)` → detached plan after parse and full validation. There is no permissive migration or coercion.

Repeated calls share no mutable output graph. Input arrays are never sorted or decremented in place. Output and nested provenance values are detached from input and from sibling/cross-call records.

## Events

None. This is a pure function module.

## Save data

The schema describes a persistable plan, but this lane registers no RMMZ save key and performs no save-system migration. Save wiring belongs to SOC.60.02 or another explicitly authorized integration task. Version 1 accepts only version 1 and fails closed on other versions.

## Checks

`node tools/society/test_quartermaster.js` runs the following classes of checks in a bare JavaScript context:

- full, partial, and refused outcomes with exact lot/request/destination provenance;
- priority, tie-break, lot-selection, eligibility, exact-item, shared-capacity, and permutation behavior;
- per-lot, per-request, per-destination, per-item, and aggregate independent conservation;
- strict duplicate, type, safe-integer, reference, ordering, field, JSON, and arithmetic-overflow rejection fixtures;
- treasury-field rejection and physical-coin/wrong-item non-substitution;
- deep input immutability, input/output detachment, sibling detachment, and cross-call detachment;
- schema validation, canonical round-trip, and tamper rejection for created, lost, offset, substituted, forged, or omitted units/records;
- a child-process deliberate failing fixture that must emit a named `FAIL`, report one failure, and exit nonzero through the real harness path;
- hostile descriptor, prototype, cross-realm-intrinsic, and prior-output prototype-poisoning fixtures that prove getters and caller array behavior are not invoked;
- in-memory source mutants for stock and capacity over-allocation, wrong-item substitution, duplicate identities, fractional/unsafe/negative-zero values, ambiguous ordering, reversed priorities, ignored lot ordering, capacity resets, treasury admission, provenance loss, load/audit bypasses, aliasing, and created/lost units.
- in-memory schema mutants for positive-ID bounds, nested record closure, required lot fields, allocation-status enumeration, and unique eligibility IDs.

The recorded second lane gate, `node tools/check_deus_syntax.js`, does not scan `game/js/sim/society/`; the dedicated test imports the module in a bare context and is therefore the syntax/load gate for this file.

## Status and limitations

Implemented in the isolated SOC.32.01 lane on 2026-09-27. No engine integration, RMMZ F5 Playtest, F8 console inspection, native save/load, live item transfer, performance benchmark, or screenshot is claimed. The planner is data-sized work invoked by a caller, not a frame loop.

All known missing policies and adapters are recorded in `tasks/SOC.32.01/lane-br/AUTHORITY_GAPS.md`. In particular, version 1 does not decide rations, priorities, entitlement, ownership, substitution, stock rotation, spoilage, transport, container conversions, reservation expiry/release, concurrency, purchasing, prices, or treasury behavior.
