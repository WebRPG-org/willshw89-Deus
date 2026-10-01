# NAT.03.02 / lane-ea writer report

Date: 2026-10-01. Writer: claude. Designated reviewer: gemini (not yet run).
Base: `54d8e533` (wave-2 launch commit). Tested code SHA: `942da037`
(code commits fa9172b8, 8858d0c2, 942da037). This is writer evidence, not an
independent review, a merge or a leaf closure.

## What changed

- `game/js/sim/hydrology/open.js` (new): the open-fluid cp store. Typed water and
  lava cp in sparse per-(area, z) cells. Capacity comes from the host's open strata
  x `units.STRATUM_FT3` x density; water's density is from `sim/units.js` and lava's
  from the host. Depth, height and type are derived views. Flow is
  `DEUS_Fluid.stepArea`'s gravity-then-equalize rule ported to cp, with exact
  integer level comparison and a one-millistratum stop. Neighbours wrap across area
  seams, and seam records carry a canonical key. One work budget (default 512)
  counts every visit and host probe, with a saved mid-visit cursor. Finite source
  accounts are the only way fluid enters. Saves are exact and validated.
- `game/js/sim/hydrology/index.js`: additive. Adds `createWaterAuthority` and
  `WATER_AUTHORITY_SCHEMA`. The nine aquifer exports are unchanged in name and target.
- `tools/sim/test_water_open_cp.js` (new): the 11 named checks and 11 source
  mutants. The mutants run in private module trees and never edit files on disk.
- `docs/systems/DEUS_WaterAuthority.md` (new): API, records, storage, views, flow,
  budget, persistence, known simplifications, tests.
- `tasks/NAT.03.02/lane-ea/evidence/*`, this report. BRIEF.md and lane.json are
  unchanged. No path outside allowedPaths changed. No art. Nothing pushed or merged.

## How I tested it

1. First step, before any edit: recorded the baseline export list of
   `hydrology/index.js` at 54d8e533 (`evidence/baseline_index_exports.json`, nine
   names, each `./aquifer.js#<same name>`).
2. Keep-green gates at the base: `node tools/check_deus_syntax.js` (exit 0, 62
   files, 0 errors) and `node tools/test_aquifer_seepage.js` (exit 0, 12 checks).
   Logs: `evidence/base_syntax.txt`, `evidence/base_aquifer.txt`.
3. FAIL-before: I ran the tip test file against the base tree (git archive of
   54d8e533). `aquifer_exports_preserved` passed (it is a guard). The other 10 failed
   (exit 1): `createWaterAuthority is not a function` / open.js ENOENT. This is
   **absence evidence**. Behavioural red comes from the mutants. Log:
   `evidence/base_fail_before.txt`.
4. PASS-after: the three lane.json gate commands ran in a fresh shared clone at
   942da037 (sparse `/game/js/ /tools/`, HEAD asserted), all exit 0. Log:
   `evidence/tip_gates_fresh_clone.txt`.
5. Mutants: 11/11 killed by assertion, inside the gate run above (the default run
   includes the sweep). These include the brief's five: drop_cp, no_wrap,
   free_probe, depth_quantum, overwrite_type.
6. Merge order with lane-ed: lane-ed is not merged yet. I trial-merged its tip
   b1edf735 onto 942da037 (`--no-ff`, no conflicts) in a scratch clone and ran both
   suites: test_water_open_cp 11/11 + 11/11 mutants, test_aquifer_seepage 17 checks,
   both exit 0. Log: `evidence/combined_with_lane_ed_b1edf735.txt`. This is a
   pre-check, not the brief's required rerun. Whichever lane merges second must
   still rerun both suites on the real merge candidate.
7. Other fluid suites at the tip, all exit 0: `tools/sim/test_units.js` (7/7),
   `tools/sim/test_water_dynamics.js`, `tools/sim/test_fluid_attach.js`,
   `tools/test_fluid_correctness_lane_cw.js` (46/46).

## Evidence

No screenshot: the brief requires no F5 evidence for this checkpoint, and none
was produced. Gate log excerpt (copied, trimmed) from `evidence/tip_gates_fresh_clone.txt`:

```text
fresh shared clone 2026-10-01T10:19:21Z, HEAD 942da0375abaf348994e3fbc06c533f9e23b7214, node v24.19.0, sparse: /game/js/ /tools/
=== node tools/check_deus_syntax.js
Checked 62 DEUS plugin files. Errors: 0
EXIT 0
=== node tools/sim/test_water_open_cp.js
PASS aquifer_exports_preserved - 9 baseline exports re-exported unchanged
PASS cp_exact_conservation - water 9000000 cp, lava 3000000 cp exact every step; 36309107 cp moved
PASS cavity_height_depth - cavity d1 / 2 ft, cell d7 / 10 ft, lip surface 7 ft, lava=water volume d3
PASS unlike_fluids_kept - lava cell and both water bodies unchanged after settling
PASS wrap_seam_flow - outer east, internal and outer south seams each split 1560000 cp evenly
PASS seam_once - one record 0,0,3,0,0|1,0,0,0,0, debit = credit = 312000 cp, order-independent
PASS budget_bound - work and host probes <= budget for 1, 2, 3, 7, 64 and the default 512
PASS no_source_no_mint - unknown source, re-registration, solid target, exhaustion and tampered save all mint 0 cp
PASS quiescent_zero - settled in 122 steps; 10 further steps cost 0 work, 0 probes
PASS no_unit_constants - no unit literals; capacity follows units.js (6250 -> 1562500 cp) and host lava density
PASS serialize_roundtrip_exact - 90-step continuation exact from 5 save points (4 mid-visit)
RESULT: 11 passed, 0 failed
KILLED drop_cp -> cp_exact_conservation - water open cp read cell by cell vs running total, step 0
KILLED no_wrap -> wrap_seam_flow - water crossed the seam into 0,1,0,1,0
KILLED free_probe -> budget_bound - host probes 5 exceed budget 1 (step 2)
KILLED depth_quantum -> cavity_height_depth - equal volumes give equal depth views
KILLED overwrite_type -> unlike_fluids_kept - lava cp untouched
KILLED seam_key_directional -> seam_once - canonical seam key, lower cell key first
KILLED mint_without_source -> no_source_no_mint - Missing expected exception: unregistered source refused
KILLED always_requeue -> quiescent_zero - did not settle within 500 steps (queued 48)
KILLED density_literal -> no_unit_constants - open.js holds unit literals
KILLED cursor_not_saved -> serialize_roundtrip_exact - run(90) vs load(save(run(1))) then run(89)
KILLED export_dropped -> aquifer_exports_preserved - index.js lost the baseline export canonicalEdgeKey
MUTANTS: 11/11 killed
EXIT 0
=== node tools/test_aquifer_seepage.js
ALL CHECKS PASSED: 12 check(s) verified in 8ms.
EXIT 0
```

During development:
- The first full run failed two checks.
  - `unlike_fluids_kept` was a fixture error: the lava cell had open, empty
    neighbours and spread into them, as it should. I enclosed it.
  - `cp_exact_conservation` did not settle. Exact equalization went on trading
    single cp: 37,273 transfers and 144,669 work units for the basin fixture.
- I added the one-millistratum stop (the aquifer's head unit, DESIGN-D2 section 3.2).
  The same fixture now settles in 12,169 transfers (122 steps at 512).
  `quiescent_zero` now also asserts that settled open neighbours are level within
  a millistratum.
- My first fresh-clone gate attempt ran nothing. Git Bash rewrote the sparse
  patterns into Windows paths, so the clone was empty. I reran it with
  `MSYS_NO_PATHCONV=1`; the log above is the rerun.

## Not done / known problems

- Gemini review and the PM's merge_gate integration are pending.
- Nothing in the game calls the authority yet. Binding it to DEUS_Fluid,
  DEUS_Levels, the clock and saves is lane-ec. F5/F8 not checked; RMMZ not run.
- Simplifications, all documented in DEUS_WaterAuthority.md:
  - A cell is one compartment that fills bottom-up. In a cell with a solid stratum
    between open ones, a little fluid may stay above the split.
  - Geometry that closes on stored fluid leaves it in place. Displacement is the
    binding lane's job.
  - No drains, rain, aquifer exchange or water/lava contact records. These are out
    of scope.
  - One FIFO queue across areas, with no fair multi-class scheduling (NAT.03.06).
- The settle cost is not small. A 3.4M-cp disturbance in a ~50-cell basin takes
  about 62,000 work units (122 steps at 512). Not profiled in the game.
- The default budget of 512 is the settled value from the brief, not a measured
  frame cost.
- `release`, `fluidAt` and `capacityAt` each probe the host outside the tick budget.
  They are commands and queries, not tick work.
- The design calls this a "contract checkpoint". It does not consume the shared
  ledger (`sim/ledger.js`). Records carry `{row, cls, cp, cause, from, to}` for the
  host to book in the binding lane.
- docs/STATUS.md was not updated, because it is outside allowedPaths.

## Try it in RMMZ

Nothing to try in RMMZ. No game code calls this module yet, and the brief says
the first F5 proof is in lane-ec. To exercise the contract, run
`node tools/sim/test_water_open_cp.js` from the project root.
Expected: `RESULT: 11 passed, 0 failed`, `MUTANTS: 11/11 killed`, exit 0.

## Decisions needed

- None for the Owner.
- For the PM: the one-millistratum equalization stop is my choice, not the brief's.
  I made it so a pool settles in bounded work. Confirm it, or name another stop.

## GAME TRANSLATION

```text
GAME TRANSLATION

WBS / Lane: NAT.03.02 (contract checkpoint) / lane-ea
Approved scope / Owner authorization reference: tasks/NAT.03.02/lane-ea/BRIEF.md; WORK-GATE G02 wave 2A; DEC-058; DEC-038/040
Writer SHA / evidence date: 942da037 / 2026-10-01
Translation Class: C FOUNDATIONAL / INDIRECT

Player / World Effect:
None yet. Once bound (lane-ec), water and lava in the world are finite masses that
fall down shafts, level out in basins, and run across area seams, including the
world's wrapped edge. A shallow cavity reads shallower than a deep cell.

Trigger:
Host calls: registerGeologicalSources (world generation), release (a source
feeds a cell), wake (geometry changed), step (each simulation tick).

Runtime Authority:
createWaterAuthority in game/js/sim/hydrology/index.js over open.js. State:
cells (area, z, cell -> {cls, cp}), sources (id -> {cls, cp, registered}),
queue, cursor, per-class totals, record row.

Simulation Path:
open.js step -> flowDown / flowLateral -> move (debit = credit) -> record;
levelOf / depthViewOf for views; units.js for geometry, water density and cp arithmetic.

Engine Bridge:
DEFERRED TO lane-ec (NAT.03.02 binding, wave 7): DEUS_Fluid becomes the façade,
and DEUS_Levels supplies openMask. Not built here.

Visible Result:
None observed. No game code calls the module.

Persistence:
serialize/deserialize, schema deus.water.authority/1. Exact continuation proven
headless (serialize_roundtrip_exact). Not yet wired into the RMMZ save (lane-ec).

Failure Without This Lane:
No cp-based fluid store exists. Water stays in DEUS_Fluid's 0..7 depth units, with
no finite-source rule, no seam flow, and a depth that ignores cavity height.

Automated Proof:
node tools/sim/test_water_open_cp.js at 942da037 in a fresh clone: 11/11 checks,
11/11 mutants killed, exit 0 (evidence/tip_gates_fresh_clone.txt). Fixtures are
the in-file host masks; lava density is a 16000 cp/ft3 test fixture. Consumer
integration test: NOT RUN (no consumer yet).

In-Game Proof:
NOT RUN. The brief requires none for this checkpoint.

CONSUMED BY GAME SYSTEMS:
- lane-ec binding: DEUS_Fluid depthAt/typeAt/walkable and the DEUS_Levels flood
  queries will read fluidAt/depthView/typeView. Not integrated; no test.
- lane-eb (wave 3) builds on these interfaces.
- If this were corrupt: pools would gain or lose water (mint/drop), lava could
  turn into water, a seam could double-move water, a 2-ft puddle could block
  walking like deep water, or a reload could change what flows next.

GAME BRIDGE STATUS
Simulation implemented: YES (checkpoint scope) - 11 checks, 11 mutants at 942da037
Engine bridge implemented: NO - deferred to lane-ec
Presentation implemented: NO - not in scope
Input/player interaction implemented: NO - not in scope
Save/load implemented: NO - headless serialize/deserialize only; RMMZ save hook NOT VERIFIED (lane-ec)
Playable verification performed: NO - RMMZ not run

Remaining step before player can experience it:
lane-ec binds the authority to DEUS_Fluid / DEUS_Levels / the clock / the save, and proves it in F5.

Simulation authority: COMPLETE within the NAT.03.02 checkpoint scope, supported by evidence/tip_gates_fresh_clone.txt
Game translation consumer: DEFINED as the DEUS_Fluid façade and DEUS_Levels flood queries (lane-ec)
Engine bridge: DEFERRED TO lane-ec
Player-facing status: NOT YET PLAYABLE
```
