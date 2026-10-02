# lane-nx2 (NAT.02.01 part 3): The Levels Reader, Commit, and Pure Occupant Plan

| Field | Value |
|---|---|
| WBS | NAT.02.01 |
| Branch | \	ask/lane-nx2\ |
| Manifest | \	asks/NAT.02.01/lane-nx2/lane.json\ |
| Writer -> reviewer | grok -> codex |

## 1. Scope
Per docs/design/COLLAPSE_REPLAN_DEC083.md (sections 6, 7, 8):
1. **levels_reader.js**: Implement the struct reader reading from injected \levels\, \objects\, \isKnown\ (so sim code does not name \UF\ or \window\). Wrap torus edges, parse S0-S4 strata HP and materials.
2. **commit.js**: Implement the fall step commit via \setStrata(..., { cause: "structural:fall" })\, atomic with rollback on failure. Vacate first, then fill. 
3. **occupants.js**: Pure occupant plan for units, items, and non-structural objects under a fall.
4. **index.js**: Export these modules.
5. **test_structural_levels.js** and **test_structure_fluid.js**: Implement tests using the node VM pattern (from test_strata_fluid_reconciliation.js) asserting water conservation, fall events, and mutants \all_deletes_displaced\, \ill_before_vacate\, \skip_event\.

## 2. The prompt
(Default launch_worker generated prompt applies; you push and end with FINAL SHA).
