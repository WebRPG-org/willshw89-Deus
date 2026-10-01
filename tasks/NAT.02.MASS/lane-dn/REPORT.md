# NAT.02.MASS part 1 / lane-dn writer handoff

Date: 2026-10-01. Writer/provider family: codex. Designated reviewer: grok,
not yet run. Base: `3b12aed03ce7a66a4c84ec0cedc3bec453002fdc`.
Tested implementation SHA: `42d864f38d422660a46363852af889ec9fde5c0c`.
This handoff records writer evidence, not an independent review or leaf closure.

## What changed

- `game/js/sim/units.js`: frozen unit/geometry table, density-derived water
  capacities, exact half-up kg/g conversion using BigInt, guarded cp arithmetic,
  stable largest-remainder allocation and WORLD_BOUND checking.
- `tools/sim/test_units.js`: seven named checks and four source mutants in
  isolated VMs. The sweep exits 1 on any surviving or invalid mutant.
- `docs/systems/DEUS_Matter.md`: public API, input/error contracts, world-bound
  assumptions and deferred consumer integration.
- `tasks/NAT.02.MASS/lane-dn/`: claim/work log, reproducible foreground validation
  runner, timestamped raw logs and this handoff. BRIEF.md and lane.json unchanged.
- No edits outside allowedPaths, art work, push, merge or WBS status changes.

## How I tested it

All four manifest gates ran in separate fresh Git clones at the tested SHA
(2026-10-01 08:00:53 to 08:01:02 UTC). Each clone had an isolated working tree
and shared read-only source objects, matching merge_gate's shared-clone model.
Sparse checkout included game/js and tools, so no artwork was copied. Each
clone HEAD was asserted equal to the tested SHA. All child commands used
synchronous execution and 900-second timeouts.

| Command | Observed result | Evidence |
|---|---|---|
| `node tools/check_deus_syntax.js` | Exit 0; 62 plugin files, 0 syntax errors | `evidence/gate-1.txt` |
| `node tools/sim/test_units.js` | Exit 0; 7 passed, 0 failed | `evidence/gate-2.txt` |
| `node tools/sim/test_units.js --mutation-sweep` | Exit 0; 7 baseline checks pass; 4/4 mutants killed | `evidence/gate-3.txt` |
| `node tools/test_aquifer_seepage.js` | Exit 0; 12 checks pass | `evidence/gate-4.txt` |

Additional actual runs:

- The syntax and aquifer keep-green suites passed before units.js was added:
  `evidence/baseline-syntax.txt`, `evidence/baseline-aquifer.txt`.
- The final harness copied into a clone of the exact lane base failed all seven
  checks because units.js was missing, exit 1. This is **absence evidence only**:
  `evidence/base-final-harness-absence.txt`.
- `density_6250` failed both water_stratum_is_312000 and
  units_geometry_matches_space. `round_half_down` failed kg_to_cp_rule;
  `apportion_drops_remainder` failed apportion_exact; `overflow_guard_removed`
  failed overflow_refused, showing all three missing guards in its message.
- A scratch harness with only apportion_exact disabled reported a surviving
  remainder mutant and exited 1: `evidence/sweep-survivor-negative-control.txt`.
  No production source or gate switch was weakened.
- Separate scratch module corruptions (gallons 834 to 835; bound width 768 to
  769) failed gallons_are_derived and world_bound_safe respectively, exit 1:
  `evidence/negative-gallons.txt`, `evidence/negative-bound.txt`.
- Direct `node --check` passed for units.js and test_units.js; the plugin syntax
  gate does not cover sim modules. Logs: `evidence/syntax-units.txt` and
  `evidence/syntax-test-units.txt`.
- Reproducer: `node tasks/NAT.02.MASS/lane-dn/verify_lane.js` (exit 0).
  It removes only its own validated scratch directory in a finally block;
  the clones and child test processes are no longer running.
- Manifest validation, main brief/manifest identity, required ancestors and
  ownership checked. Only overlapping manifests were the already-merged co/cu
  predecessors: `evidence/preflight.txt`.

## Evidence

Screenshot: none produced or required by this lane's brief. RMMZ not checked.
Actual log excerpts (normal sweep, then deliberately weakened scratch sweep):

```text
RESULT: 7 passed, 0 failed
MUTATION RESULT: 4/4 killed; 0 survived/invalid
EXIT 0

PASS apportion_drops_remainder::apportion_exact
SURVIVED/INVALID apportion_drops_remainder: all named checks must fail by assertion
MUTATION RESULT: 3/4 killed; 1 survived/invalid
EXIT 1
```

The initial implementation test caught an incorrectly transcribed maximum-cp
decimal in the fixture (six checks passed, conversion check failed); that
fixture was corrected with exact BigInt math before the recorded passing gates.
Details and initial preflight tooling issues are in WORK_LOG.md.

## Not done / known problems

- Independent Grok review and PM merge_gate integration remain pending.
  NAT.02.MASS is a shared leaf; part 1 does not close it or audit finding A11-2.
- Importers in lanes do, ea and ed are outside this scope. Existing ledger,
  water and material callers have not been migrated to this module.
- WORLD_BOUND's load-time check proves the water-filled v1 envelope only.
  `checkWorldBound(maxCpPerStratum, extraReservoirCp)` supports later material
  and finite-core bounds, but those real inventory inputs are not checked here.
- Geometry evidence executes the actual UF.Space definition from source;
  it is not an RMMZ boot or proof that a live consumer receives these units.
- F5/F8, game screenshots and consumer save/load were not checked. The module
  owns no mutable/save state. No playable behavior is claimed.
- docs/STATUS.md and docs/VISION.md were left untouched because the Owner's
  direct allowedPaths restriction excludes them. The local claim is released;
  PM can reconcile the central board at review/integration.

## Try it in RMMZ

No RMMZ steps for this bounded foundation; the brief explicitly says F5
evidence is not required. Do not expect a new visible game behavior yet.
For the implemented contract, run `node tools/sim/test_units.js` from the
project root. Expected: seven passes and exit 0. Consumer playtest steps belong
to later importer/bridge lanes; none are invented here.

## Decisions needed

No Owner decision needed for this implementation. Designated Grok review and
PM integration are the next steps under the existing routing. No review verdict
has been requested, fabricated or supplied by this writer.

## GAME TRANSLATION

WBS / Lane: NAT.02.MASS shared leaf, part 1 / lane-dn.
Approved scope / authority: lane BRIEF.md, WORK-GATE G02 row dn, DEC-058 and
CANONICAL_ROLES 2.1. Writer SHA/evidence date: as recorded above.
Translation Class: **C FOUNDATIONAL / INDIRECT**.

1. **Player / World Effect:** provides consistent integer weight and geometry
   for future finite water and mass-bearing rubble. No live game behavior
   changes from this unimported module alone.
2. **Trigger:** a consumer calls kgToCp/gToCp, arithmetic or apportion during
   import/transfer. The load-time water WORLD_BOUND check runs on require.
3. **Runtime Authority:** sim/units.js owns this shared conversion/arithmetic
   contract. It owns no balances; ledger and fluid consumers retain their state.
4. **Simulation Path:** decimal input -> BigInt ratio -> exact half-up integer
   cp; integer operations -> guarded Number; weighted cp -> largest-remainder
   shares whose sum equals the input. Water capacity derives from geometry.
5. **Engine Bridge:** DEFERRED TO the importer work named in the brief (lanes
   do, ea, ed) and their subsequent fluid/structural integrations. None is
   introduced by lane-dn.
6. **Visible Result:** none observed. Intended consumers are DEUS_Fluid's finite
   pool filling/draining and structural collapse's rubble. Wrong units would
   mis-size water and create/erase rubble weight across conversions.
7. **Persistence:** no save schema or mutable state here. All outputs are Number
   cp values; actual ledger/world save/load integration remains downstream.
8. **Failure Without This Lane:** consumers lack a shared exact conversion and
   geometry contract; the base clone fails module loading. This does not prove
   that existing gameplay is fixed by merely adding the module.
9. **Automated Proof:** the commands, tested SHA, named mutations and raw logs
   above prove the pure numerical contract. The UF.Space test checks source
   compatibility. Live consumer delivery/integration tests: NOT RUN.
10. **In-Game Proof:** NOT RUN; no F5 proof required by this brief. No seed,
    scene or screenshot is claimed.

**CONSUMED BY GAME SYSTEMS:** planned importer consumers in do, ea, ed supply
cp/geometry to ledger/material, fluid and structural integrations. Actual
imports and consumer integration tests are absent in this scope, not a PASS.

## GAME BRIDGE STATUS

| Field | Status / evidence |
|---|---|
| Simulation implemented | YES for the pure units scope; seven checks and four killed mutants at the tested SHA. |
| Engine bridge implemented | NO; deferred to named importer/integration work. |
| Presentation implemented | NO; no rendering/UI change in this scope. |
| Input/player interaction implemented | NO; not part of a units module. |
| Save/load implemented | NO; no module state to save; consumer persistence unverified. |
| Playable verification performed | NO; RMMZ not run. |

Remaining step before player experience: integrate the shared contract into
the authorized importers and gameplay consumers, then independently test their
conservation, persistence and RMMZ outcomes. Player-facing status:
**NOT YET PLAYABLE**.
