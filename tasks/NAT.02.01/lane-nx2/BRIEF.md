# lane-nx2: Integration and legacy replacement (Commit and Fluid Interface)

| Field | Value |
|---|---|
| WBS | NAT.02.01 (nx2) |
| taskId (manifest) | NAT.02.01 |
| Branch | 	ask/lane-nx2 |
| Manifest | 	asks/NAT.02.01/lane-nx2/lane.json |
| Writer -> reviewer | minimax -> codex |
| Size | M |
| Dependencies | NAT.02.01 (lane-gq / nx1) |

## Goal
Implement the integration layer for the pure connectivity kernel (nx1). This involves the fall step commit (grouping blocks, building records, writing via setStrata), handling occupants (crush lethality), and fluid interface pinning checks.

## Scope
1. **Commit**: Write the final 11-byte record per affected cell (moved bytes keep HP/constructed flag, connector code cleared, stairs to plain blocks). Write through setStrata(..., { cause: "structural:fall" }) vacating first, then filling. One synchronous commit.
2. **Occupants**: After commit, scan units in changed levels. If a unit is crushed by falling rock or collapsing room, they die instantly (Owner DECISION 2026-10-01). Survivors falling drop to the nearest standable cell taking SRD falling damage.
3. **Checks**: Implement interface pinning checks in 	est_structure_fluid.js: slab_into_pool_conserves_water, loor_mined_lake_drains_down, acate_wakes_neighbours, 
o_fluid_write_by_fall.

## Out of scope
Any span, load, weight, or capacity limits. Fluid edits (Fluid handles its own displacement).

## Rules
- One commit per tick.
- Adhere to pure deterministic RNG.
