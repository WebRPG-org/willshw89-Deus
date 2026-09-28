# SOC.32.01 authority gaps

Recorded 2026-09-27. These questions are deliberately outside the isolated planner. None has been answered by `DEUS_SOCIETY_WBS.md`, `INVARIANT_REGISTRY.md`, `DEUS_PERSON_AND_INSTITUTIONS.md`, the current Items/Containers contracts, or the SOC.32.01 brief.

## Physical stock authority

- Which runtime subsystem creates the stock snapshot, proves every lot is physically present, and supplies its inventory revision.
- How a planner `lotId` maps to an Items stack/instance ID, a WorldItems record, or a future canonical inventory record.
- Whether one physical stack may be split into multiple planner lots. Version 1 rejects repeated `sourceItemId` values because no disjoint-slice contract exists.
- How merged or split runtime stacks retain source provenance, and how provenance fields are standardized beyond lossless opaque JSON.
- How stale snapshots, simultaneous consumers, already-live reservations, and stock changes between planning and execution are detected.
- Which item catalogue IDs exist and which items belong to the descriptive domains tools, food, raw goods, and arms. The planner accepts exact caller IDs and invents no catalogue.

## Demand and scarcity policy

- Who creates demands and decides ration amounts, tool counts, raw-material needs, armament needs, reserve levels, allocation thresholds, minimum fills, or all-or-nothing requests.
- Whether partial fills are immediately useful, held, retried, pooled, or rolled back.
- Any fairness, quota, proportional-sharing, round-robin, household, office, rank, age, health, culture, military, or emergency entitlement rule.
- The gameplay priority values assigned to competing demands. Version 1 only defines the mechanical interpretation of caller values: larger `priority` first, then smaller `tieBreakOrder`; an equal pair is rejected.
- The gameplay preference among eligible lots: age/FIFO, spoilage, quality, material, ownership, location, travel cost, strategic scarcity, or other considerations. Version 1 only follows the caller's globally unique, smaller-first `selectionOrder`.
- Whether the planner should optimize total filled requests, preserve special-purpose lots, or reserve scarce stock for later requests. Version 1 follows the explicit total order and does not optimize behind the caller's back.

## Eligibility and ownership

- Which subsystem is authoritative for faction, household, personal, institutional, legal, and hostile ownership.
- Who evaluates permission, jurisdiction, claimant entitlement, physical access, reachability, locks, quality, material, condition, storage policy, or other eligibility facts.
- Whether eligibility may change after planning and how it is revalidated at execution.
- How militia or professional military status affects access to arms. SOC.32.01 defines no military entitlement.

## Destination capacity

- The canonical common unit for container capacity. Existing tracked contracts mention slots, weights with conflicting kilogram/pound labels, and whole-ounce WorldItems accounting; no approved conversion unifies them.
- How weight, volume, item dimensions, stack merging, slot count, per-item limits, existing occupancy, nested contents, filters, locks, and ownership become one caller-supplied integer `availableCapacity`.
- Whether capacity is shared across item types, reserved for categories, or partitioned. Version 1 treats each supplied destination as one shared allocation-unit ceiling.
- Whether one requested item quantity always consumes one normalized capacity unit in the eventual adapter. Version 1's arithmetic requires the caller to pre-normalize capacity into the same indivisible units as demand; it does not claim that this models weight, volume, or slots.

## Reservation lifecycle and execution

- Stable live reservation identity, owner, purpose vocabulary, expiration conditions, and explicit time domain.
- Cancellation, release, death, load, abandonment, retry, fulfillment, and partial-execution behavior required by the engineering standard.
- Atomic conflict checking, idempotency, replay protection, concurrent-plan exclusion, and transaction/rollback rules.
- Whether a successful plan reserves, commits, or merely proposes stock. Version 1 produces a proposal: its reservation rows are the physical debit represented by allocation summaries, not live locks or transfers.
- Transport, hauling, travel, pathing, delivery time, failures in transit, item splitting, container mutation, destination admission, and physical consumption.
- Integration with Items, Containers, Resources, Jobs, the duty scheduler, offices, militia, or UI. All are expressly excluded from this lane.

## Physical changes outside allocation

- Spoilage, decay, theft, loss, destruction, production, crafting, transformation, salvage, and replenishment between snapshot and execution.
- Item aliases, resource roles, material substitution, exchange recipes, or equivalence classes. Version 1 requires exact `itemId` equality even when an external catalogue considers items related.
- Whether physical currency lots may be allocated for exact coin demands. Version 1 permits any explicit physical lot to satisfy only the same exact item ID; it never converts coin into another good.

## Finance separation

- Prices, exchange values, purchasing, credit, debt, budgets, payroll, tax, treasury authorization, and trade are not stock facts and have no planner field or fallback path.
- A later purchase workflow would need to create or transfer an explicit physical lot before SOC.32.01 could see it. Wealth alone remains unable to satisfy food, tools, raw goods, or arms under INV-SOC-06.

## Persistence and reporting

- Runtime save-key ownership, save-system registration, migrations from any future schema version, and integration with SOC.60.02.
- A canonical plan ID, inventory revision ID, issuer/approver identity, and durable audit-log retention policy.
- Which integration adapter materializes subsystem state into ordinary non-`Proxy` JSON data before planning. Version 1 rejects accessors, custom record/array prototypes, and array subclasses; arbitrary ECMAScript `Proxy` trap behavior cannot be proven side-effect-free by a portable pure validator and is outside the persisted-data contract.
- Presentation wording and precedence when more than one refusal condition binds. Version 1 uses a deterministic technical convention: report both when stock and capacity are both exhausted, otherwise capacity exhaustion before stock exhaustion. This is diagnostic ordering, not entitlement policy.
- Native RMMZ plugin loading, editor Playtest behavior, UI display, and F8 diagnostics. The current file is a CommonJS pure module used only through the isolated test gate.
