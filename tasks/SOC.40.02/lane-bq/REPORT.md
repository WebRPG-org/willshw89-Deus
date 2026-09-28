# SOC.40.02 lane-bq report

- Date: 2026-09-27
- Branch: `task/lane-bq`
- Writer: Codex
- Scope: pure deterministic militia mobilization planning only

## What changed

- `game/js/sim/society/DEUS_Militia.js`: added the host-agnostic SOC.40.02 planner, request/plan validation, stable caller-policy ordering, auditable orders/refusals/unfilled posts, and exact civilian-economic-duty displacement provenance.
- `tools/society/test_militia.js`: added 201 deterministic baseline/negative checks and 79 source mutants, including fixed-ratio, hidden-default, over-assignment, ordering, mutation, malformed-plan, and lost-economic-evidence provocations.
- `docs/systems/DEUS_Militia.md`: documented the authority boundary, exact request/output records, allocation behavior, errors, public API, tests, and deferred integrations.
- `tasks/SOC.40.02/lane-bq/state.md`: recorded and released the task-local claim because `docs/STATUS.md` is coordinator-exclusive and outside this lane's allowed paths.
- `tasks/SOC.40.02/lane-bq/REPORT.md`: recorded scope, exact gate results, evidence, authority gaps, and limitations.

## How I tested it

- Ran `node tools/society/test_militia.js` in the foreground from the repository root. Exit code: `0`.
- Ran `node tools/check_deus_syntax.js` in the foreground from the repository root. Exit code: `0`.
- Ran `node --check game/js/sim/society/DEUS_Militia.js` and `node --check tools/society/test_militia.js` during development. Both returned exit code `0` with no stdout.
- Independently reviewed the final module for policy inference, purity, hostile plain-data inputs, deterministic ordering, output audit completeness, displacement evidence, and targeted mutant coverage. The final read-only reviews reported no findings.
- Inspected the complete staged diff and staged path list before commit; only five changed paths, all allowed by `tasks/SOC.40.02/lane-bq/BRIEF.md`, are included.

## Evidence

- Screenshot: not produced. This lane deliberately has no RMMZ/UI integration or visual acceptance surface, and the brief prohibits art/audio work.
- Militia gate log excerpt (exact final line):

```text
RESULT: 280 passed, 0 failed
```

- Representative exact mutation results from the same foreground run:

```text
PASS mutant_fixed_half_population_ratio: killed by ratio_demand_seven_of_eight
PASS mutant_fixed_ten_percent_population_ratio: killed by ratio_same_population_tracks_demand
PASS mutant_population_threshold_blocks_small_factions: killed by ratio_one_of_one
PASS mutant_drop_all_displacement_evidence: killed by displacement_exact_provenance, professional_displacement_preserved
PASS mutant_drop_professional_displacement_evidence: killed by professional_displacement_preserved
PASS mutant_default_missing_current_duty_to_null: killed by reject_missing_current_duty_evidence
PASS mutant_default_missing_duty_category: killed by reject_missing_duty_category
PASS mutant_validate_request_always_accepts: killed by reject_wrong_request_schema, reject_missing_post_source, reject_non_array_candidate_priorities
```

- Syntax gate log (exact stdout):

```text
Checked 60 DEUS plugin files. Errors: 0
```

## Not done / known problems

- The planner is not registered as an RMMZ plugin and does not integrate with the scheduler, combat, map, equipment, alarm, casualty, UI, save, or SOC.42.01 loss-calculation systems; those are explicitly outside SOC.40.02.
- RMMZ F5 playtest, F8 console inspection, and screenshot evidence were not run because this task has no engine/UI integration. The standalone harness loads the new module directly in a restricted VM; the repository syntax gate only reports its existing 60 plugin files.
- The allocation is intentionally greedy in caller-supplied post order and does not backtrack for maximum-cardinality matching. A different optimization algorithm requires tracked policy authority.
- The module preserves `CIVILIAN_ECONOMIC` duty evidence but does not calculate the resulting economic loss; SOC.42.01 owns that calculation.
- The tracked WBS/person contract includes `ELITE_RETINUE`, while INV-SOC-07's parenthetical status list omits it. The module consumes the six-token WBS/person contract and does not classify status.
- `docs/STATUS.md` was not edited because it is coordinator-exclusive and outside the lane whitelist; the task-local state file records completion instead.
- Independent cross-family fresh-clone review remains the coordinator/reviewer gate described by the brief.
- No art or audio was generated, edited, requested, catalogued, moved, or integrated.

## Try it in RMMZ

1. There is no RMMZ playtest action for this unintegrated pure module. From the repository root, run `node tools/society/test_militia.js`.
2. Run `node tools/check_deus_syntax.js`.

Expected: the first command ends with `RESULT: 280 passed, 0 failed`; the second prints `Checked 60 DEUS plugin files. Errors: 0`. No visible in-game behavior changes until a separately authorized integration consumes the returned plan.

## Decisions needed

- A future caller/integration owner must supply how observations become a threat key; authorized statuses; alive/eligibility/post-compatibility decisions; wall/gate capacities; requested staffing; candidate/post priority and every tie-break; and acceptance/application/demobilization behavior.
- A future authority decision is needed if mobilization should use optimization or rematching instead of the documented greedy caller-priority procedure.
- The invariant owner may reconcile INV-SOC-07's omitted `ELITE_RETINUE` token with the six-token WBS/person contract.
