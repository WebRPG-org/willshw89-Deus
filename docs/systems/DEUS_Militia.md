# DEUS militia mobilization planner

## Purpose

`game/js/sim/society/DEUS_Militia.js` is the pure SOC.40.02 planning boundary. It converts one explicit faction threat, caller-supplied person/service records, caller-supplied wall and gate capacities, and one complete policy into deterministic mobilization orders. It does not classify military service, schedule work, move units, transfer equipment, resolve combat, calculate losses, or touch engine state.

The planner preserves these authority boundaries:

- INV-SOC-07: requested staffing comes only from `policy.postRequirements[].requested`. Population size never creates, scales, caps, floors, or rounds demand.
- INV-SOC-08: when a selected person has a supplied `CIVILIAN_ECONOMIC` current duty, the complete duty record is copied to `displacedCivilianDuties`. This module does not estimate production, harvest, money, time, or recovery losses; SOC.42.01 owns those calculations.
- INV-SOC-01 and INV-SOC-02: `identity`, military service status, and current duty stay separate. Craft, civic office, class, age-like data, rank, calling, and population do not classify or prioritize military service.
- SOC.40.01 remains the owner of service-status classification. This module consumes status tokens only.

The tracked WBS and person specification enumerate six service tokens: `NONE`, `RESERVE`, `MILITIA`, `GUARD`, `PROFESSIONAL`, and `ELITE_RETINUE`. INV-SOC-07's parenthetical list omits `ELITE_RETINUE`; this module follows the explicit WBS/person list without deriving any status. `NONE` is the specified non-combatant status and cannot appear in a policy's allowed-status list. `RESERVE` is selectable only when the caller explicitly authorizes it for the supplied threat.

## Public API

The CommonJS export has no engine wrapper or global namespace.

| Export | Result |
|---|---|
| `REQUEST_SCHEMA` | Input schema version, currently `1`. |
| `PLAN_SCHEMA` | Output schema version, currently `1`. |
| `SERVICE_STATUSES` | Frozen copy of the six consumed administrative status tokens. |
| `POST_KINDS` | Frozen `WALL`, `GATE` list. |
| `DUTY_CATEGORIES` | Frozen `CIVILIAN_ECONOMIC`, `NON_ECONOMIC` list. |
| `validateRequest(request)` | Returns `{ ok, errors }`. It does not plan or mutate input. |
| `planMobilization(request)` | Returns the canonical plan or throws `MilitiaError`. |
| `validatePlan(request, plan)` | Returns `{ ok, errors }`; rejects non-canonical, duplicate, unknown, ineligible, over-demand, over-capacity, or provenance-losing plans. |
| `assertPlan(request, plan)` | Returns a detached copy of a valid canonical plan; throws `E_PLAN` otherwise. |
| `canonicalStringify(value)` | Deterministic JSON text with recursively sorted object keys; rejects non-plain/non-finite data. |

Errors carry `name: "MilitiaError"`, `code`, `path`, and `errors`. Missing caller authority is `E_AUTHORITY_GAP`; malformed data is `E_DATA`/`E_INPUT`; invalid identity is `E_IDENTITY`; bad policy is `E_POLICY`; unknown references are `E_REFERENCE`; duplicates are `E_DUPLICATE`; ambiguous total-order keys are `E_NONDETERMINISTIC_TIE`; invalid result plans are `E_PLAN`.

## Request data

Every record is plain, enumerable JSON data. Sparse arrays, accessors, symbol keys, functions, cycles, non-plain instances, and non-finite numbers are rejected. Request nesting is limited to 128 levels. Plan copying/serialization reserves eight additional envelope levels (136 total), so a request accepted at its depth boundary still produces a serializable plan accepted by `validatePlan`. Inputs are copied before sorting or planning, including own properties named `__proto__`. Stable entity IDs, individual counts, and aggregate requested/capacity totals are safe integers; entity IDs are positive and counts may be zero.

### Top level

```js
{
  schema: 1,
  threat: { ... },
  people: [ ... ],
  posts: [ ... ],
  policy: { ... }
}
```

Unknown top-level fields are rejected. There is deliberately no population-ratio, automatic threshold, clock, response-time, morale, equipment, rank, or combat-stat field.

### Threat

```js
{
  id: 301,
  factionId: 7,
  key: "CALLER_THREAT_KEY",
  source: { eventId: 401 }
}
```

`id` and `factionId` are stable positive integer IDs. `key` is an opaque caller classification. The planner never computes it from severity or population. `source` is required caller provenance and may contain additional plain data. This record preserves evidence; the planner does not authenticate whether the named source is authorized. `policy.threatKey` must match exactly; a mismatch is an authority gap rather than a default response.

### Person

```js
{
  id: 101,
  factionId: 7,
  alive: true,
  eligibility: {
    eligible: true,
    reason: "CALLER_ELIGIBLE",
    source: { authority: "CALLER_POLICY" }
  },
  serviceStatus: "MILITIA",
  eligiblePostIds: [201, 202],
  identity: {
    schema: 1,
    craft: "BLACKSMITH",
    civicOffice: "TREASURER",
    class: { id: "srd:class:fighter", level: 3 }
  },
  currentDuty: {
    id: 501,
    kind: "FORGE_PICKAXES",
    category: "CIVILIAN_ECONOMIC",
    provenance: { jobId: 7001, workstationId: 8101 }
  }
}
```

- `alive` and `eligibility` are separate caller facts. A dead person is never assigned even if a stale eligibility record says `eligible: true`.
- `eligibility.reason` and `eligibility.source` are mandatory so an exclusion or approval remains auditable. The planner does not invent protected-person rules.
- `serviceStatus` must be one of the six consumed tokens. It is never inferred from `identity`.
- `eligiblePostIds` is the caller's explicit post-compatibility decision. Every ID must name a supplied post; duplicates are rejected. An empty array is valid and produces a refusal when demand exists.
- `identity` must match the SOC.10.01 identity contract exactly. It is validated but never read for selection or changed.
- `currentDuty` is `null` or a record with stable `id`, non-empty `kind`, explicit category, and a provenance object. Additional plain fields are allowed and are retained. The planner copies the entire duty record; it never substitutes the person's craft for duty evidence.

### Defense post

```js
{
  id: 201,
  factionId: 7,
  kind: "GATE",
  capacity: 2,
  source: { structureId: 601 }
}
```

Only `WALL` and `GATE` are in SOC.40.02. `capacity` is the caller-supplied number of slots available to this mobilization plan at this post. It is not derived from geometry or population. A zero capacity is valid. Requested staffing may exceed capacity; the planner assigns no more than capacity and records the remainder with `POST_CAPACITY`. Missing, negative, fractional, string, non-finite, or unsafe capacities are rejected.

### Policy

```js
{
  schema: 1,
  id: "CALLER_POLICY_ID",
  version: 4,
  threatKey: "CALLER_THREAT_KEY",
  authority: { decisionId: "CALLER_DECISION" },
  allowedStatuses: ["MILITIA", "GUARD"],
  candidatePriorities: [
    { personId: 101, priority: 0, tieBreak: 10 }
  ],
  postRequirements: [
    { postId: 201, requested: 2, priority: 0, tieBreak: 10 }
  ]
}
```

The policy is complete, not a hint. `authority` is preserved as opaque evidence; authentication belongs to the caller or a future integration boundary.

- `allowedStatuses` is explicit, unique, and may be empty. It cannot contain `NONE`.
- `candidatePriorities` contains exactly one row for every supplied person, including dead and ineligible people, so refusals have a stable audit order.
- `postRequirements` contains exactly one row for every supplied post. Use `requested: 0` to make the caller's decision to leave a post unstaffed explicit.
- Lower `priority` sorts first. Lower `tieBreak` sorts first within a priority. Both are caller-supplied non-negative safe integers. Every `(priority, tieBreak)` pair must be unique within its list. The planner has no insertion-order or stable-ID fallback for an ambiguous tie.
- Reordering the input arrays cannot change a plan. Changing priority or tie-break values is an explicit policy change and may change it.

These requirements intentionally expose unresolved authority. The planner does not supply a default threshold, eligible status set, post demand, post capacity, candidate preference, post preference, protected-person exception, or tie rule.

## Plan data

`planMobilization` returns:

```js
{
  schema: 1,
  status: "PLANNED",
  threat: { ...canonical detached threat... },
  policy: { ...canonical detached policy... },
  orders: [ ... ],
  assignments: [ ... ],
  refusals: [ ... ],
  unfilledPosts: [ ... ],
  displacedCivilianDuties: [ ... ],
  summary: { ... }
}
```

All collections are in caller-policy order, not source-array order. Every selected person appears in exactly one assignment and one order. An order records the threat and policy IDs, person/post IDs, `DEFEND_GATE` or `DEFEND_WALL` duty, complete prior duty, service status, eligibility provenance, caller priority/tie values, post provenance, demand, and capacity. The generated `orderId` is unique within the canonical plan and stable for the same threat/post/person IDs; it is not a cross-plan global ID, so a future persistence owner must scope it with the returned policy/threat context. The module returns data only; it does not install the duty in a scheduler.

The exact emitted record shapes are:

```js
orders[] = {
  orderId, type: "DEFEND_POST", threatId, policyId, personId, postId,
  postKind: "WALL" | "GATE",
  duty: { type: "DEFEND_WALL" | "DEFEND_GATE", postId },
  previousDuty: null | { ...complete supplied currentDuty },
  audit: {
    serviceStatus,
    eligibility: { eligible, reason, source },
    eligiblePostIds: [ ...sorted stable post IDs ],
    candidatePriority: { priority, tieBreak },
    postRequirement: { requested, priority, tieBreak },
    postCapacity,
    postSource: { ...complete supplied post source }
  }
};

assignments[] = { orderId, personId, postId, postKind };

refusals[] = {
  personId, reason, serviceStatus, alive,
  eligibility: { eligible, reason, source },
  eligiblePostIds: [ ...sorted stable post IDs ],
  candidatePriority: { priority, tieBreak }
};

unfilledPosts[] = {
  postId, postKind, requested, capacity, assigned, unfilled,
  postSource: { ...complete supplied post source },
  reasons: [ { code: "POST_CAPACITY" | "NO_AVAILABLE_PERSON", count } ]
};

displacedCivilianDuties[] = {
  personId, orderId, postId,
  previousDuty: { ...complete supplied CIVILIAN_ECONOMIC currentDuty }
};

summary = {
  requested, availableCapacity, assigned, refused, unfilled,
  displacedCivilianDuties
};
```

Names without quoted literals above are scalar fields copied or calculated as described in the request and accounting rules. `threat` and `policy` are detached canonical copies of the validated caller records; their status, candidate, and post-requirement arrays are normalized to deterministic order.

`refusals` contains every unassigned supplied person, in candidate-policy order. Reasons are:

| Reason | Meaning |
|---|---|
| `DEAD` | Caller says the person is not alive. |
| `INELIGIBLE` | Caller eligibility decision is false. |
| `NONCOMBATANT_STATUS` | Supplied service status is `NONE`. |
| `STATUS_NOT_AUTHORIZED` | Status is valid but absent from this policy response. |
| `NO_REQUESTED_POST` | No demanded post appears in the person's caller-supplied eligible-post list. |
| `POST_CAPACITY_EXHAUSTED` | Compatible demand exceeds the supplied post capacity. |
| `DEMAND_SATISFIED` | Compatible requested staffing was already filled by higher caller priority. |

`unfilledPosts` contains only posts whose requested staffing was not met. `POST_CAPACITY` counts the portion above supplied capacity; `NO_AVAILABLE_PERSON` counts capacity that could not be filled from alive, eligible, authorized, compatible, unassigned people. For each post, `requested = assigned + unfilled`.

`displacedCivilianDuties` contains exactly one record for each assigned person whose supplied current duty category is `CIVILIAN_ECONOMIC`. It links `personId`, `orderId`, and `postId` to a detached exact copy of `previousDuty`. An assigned professional or guard still produces displacement evidence when the caller says their current duty is civilian/economic. An unselected person never produces a displacement record. A null or `NON_ECONOMIC` duty produces none.

The summary counts requested slots, available post capacity, assignments, refusals, unfilled slots, and displaced civilian duties. It is accounting evidence, not a loss estimate.

## Allocation procedure

1. Validate and recursively detach the complete request.
2. Match the policy to the exact threat key.
3. Sort post requirements by caller `priority`, then caller `tieBreak`.
4. For each post, scan the complete candidate total order.
5. Select only people who are alive, caller-eligible, status-authorized, compatible with that post, and not already assigned.
6. Stop at both explicit requested staffing and explicit capacity.
7. Emit orders/assignments, then refusals, unfilled accounting, and exact civilian-duty displacement evidence.

This is deliberately a deterministic caller-priority greedy allocation. It does not backtrack or rematch earlier assignments to maximize global cardinality; any desired cross-post optimization is caller policy that requires a separately specified algorithm. No step reads total population to decide how many people to mobilize.

## Events

None. This module emits and listens to no engine events.

## Save data

None. The planner has no state and writes no save key. A future integration may persist accepted orders through the owning scheduler/save subsystem; that is outside SOC.40.02.

## Checks

Run `node tools/society/test_militia.js`. The suite loads the module in a VM where filesystem dependencies are unavailable, `Date`/engine globals are absent, and `Math.random` throws. It calculates its pass/fail totals and exits non-zero on any failed fixture or surviving mutant. The current harness contains 201 baseline/negative checks and 79 targeted source mutants.

The baseline and invariant checks are:

- Planning/audit: `baseline_plan_is_auditable`, `plan_schema_and_status_are_exact`, `assignment_records_are_exact`, `order_links_are_coherent`, `order_audit_preserves_decisive_inputs`, `plan_context_preserves_threat_and_policy_authority`, `policy_context_preserves_complete_decision`, `summary_accounts_every_person`, `summary_record_is_exact`, `baseline_summary_conserves_demand`, `dead_person_refused`, `dead_refusal_audit_is_exact`, `ineligible_person_refused`, `none_status_is_noncombatant`, `unauthorized_status_refused`, `demand_satisfied_refusal_is_explicit`, `unfilled_posts_separate_capacity_and_people`, `unfilled_post_records_are_exact`.
- Duty evidence: `displacement_exact_provenance`, `professional_displacement_preserved`, `proto_named_provenance_is_preserved`, `non_economic_duty_not_displaced`, `no_duty_does_not_invent_displacement`.
- Policy boundaries: `identity_axes_do_not_authorize`, `identity_changes_do_not_change_selection`, `reserve_requires_explicit_authorization`, `elite_retinue_token_is_consumed_not_derived`, `all_six_status_records_validate`, `caller_priority_controls_selection`, `post_priority_controls_allocation`, `post_tie_break_controls_allocation`, `post_compatibility_respected`.
- Assignment/capacity: `wall_order_uses_wall_duty`, `one_person_one_post`, `capacity_never_overassigned`, `unfilled_reasons_partition_shortfall`, `capacity_refusal_is_explicit`, `zero_capacity_is_valid_and_audited`, `zero_demand_mobilizes_nobody`.
- Anti-ratio provocations: `ratio_same_population_tracks_demand`, `ratio_demand_seven_of_eight`, `ratio_one_of_one`, `ratio_same_demand_different_population`, `irrelevant_population_does_not_change_assignments`.
- Determinism/purity: `deterministic_repeated_plan`, `permuted_inputs_same_plan`, `input_not_mutated`, `rejected_input_not_mutated`, `frozen_input_supported`, `output_duty_is_detached`, `later_input_mutation_does_not_change_plan`, `accepted_depth_boundary_roundtrips`.
- Plan rejection: canonical/copy checks plus targeted malformed-root, collection, assignment, stable-ID, unknown-reference, duplicate, capacity, demand, availability, order-count, displacement-person, displacement-category, and provenance diagnostics. Each guard is asserted by its specific `corrupt_*` or `non_*_plan_*` fixture instead of relying only on the final canonical comparison.

Targeted validation fixtures cover every required field and substantive rule: explicit threat/source/policy authority; person IDs, faction, alive and eligibility values/provenance; all service-status cases; eligible-post references; exact SOC.10.01 identity; explicit null versus absent current-duty evidence; complete duty category/provenance; duplicate/invalid posts and every invalid capacity form; policy threat match; allowed-status validity; exact candidate/post coverage; unknown/duplicate references; invalid demand/priority values; candidate/post tie ambiguity; and non-plain, sparse, cyclic, functional, symbolic, accessor, non-enumerable, extra-array-property, depth-boundary, and non-finite data. Every invalid-request fixture checks both throwing `planMobilization` behavior and structured `validateRequest` rejection with the expected error code.

The 79 source mutants cover:

- fixed half/ten-percent ratios, population thresholds, ignored demand/capacity, and invented post order;
- assignment of dead/ineligible/unauthorized/incompatible people, duplicate assignment, wrong wall/gate duty, and corrupted order/assignment links;
- dropped, truncated, aliased, miscategorized, or fabricated civilian-duty displacement evidence;
- input-order dependence, in-place sorting, ambiguous ties, invalid/omitted schemas, IDs, counts, priorities, eligibility, compatibility, current duty, status authorization, and post requirements;
- unauthorized defaults for alive status, eligibility, post compatibility, service-status policy, candidate order, post demand/order/capacity/source/kind, duty presence, and duty category;
- corrupted threat/policy/order/refusal/unfilled/summary audit fields;
- aggregate overflow, special property names, inherited schema names, accessors, non-enumerable fields, extra array properties, unsafe object copying, and lost depth headroom;
- removed plan-invariant guards, `validateRequest` always accepting, and `validatePlan` omitting canonical comparison.

A mutant counts as killed only when its named target check passes against the baseline module and fails against the syntactically loaded mutant. A missing/ambiguous source anchor, load failure, or unrelated exception is a harness failure, not a kill.

## Status

Implemented as a host-agnostic CommonJS module with its standalone deterministic test suite. It is not registered as an RMMZ plugin and has no scheduler, combat, map, equipment, casualty, alarm, UI, save, or SOC.42.01 economic-loss integration.

Authority still required from future callers:

- how raw observations become a threat key;
- which statuses respond to that key, including reserve activation;
- protected-person and post-compatibility decisions;
- requested staffing, available capacity, candidate priority, post priority, and every tie-break;
- the upstream definition/provenance of `CIVILIAN_ECONOMIC` duties;
- acceptance/application of the returned orders and later demobilization.
