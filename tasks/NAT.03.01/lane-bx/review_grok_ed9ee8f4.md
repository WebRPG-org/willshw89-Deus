# Independent Grok Review — NAT.03.01 / lane-bx

- **Writer**: MiniMax (MiniMax M3 via Cline)
- **Reviewer**: Grok
- **Reviewed Commit**: `ed9ee8f4c386528a0440f9413c615983d08a6ff6`
- **Fork Point**: `fe9b0f9b73757afb232ddf01b19414cd20b9cac0`
- **Cited Base**: `db5f926ece53d9336dbf68f3d4db7d39f3b4392f` (sibling of the lane, not an ancestor)
- **Branch**: `task/lane-bx`
- **Worktree**: `C:\Users\snewt\.deus_worktrees\lane-bx`
- **Review Date**: 2026-09-28
- **Authority**: DEC-034 independent review; DEC-037 natural-world phase lock; DEC-038 mathematical foundations (brief on this branch, amended text on `db5f926e`); closed centipound mass (the review charter's DEC-040). No `DEC-040` heading exists in `docs/OWNER_DECISIONS.md` here or at `db5f926e`. The invariant was checked as integer centipound conservation.

No product code was edited. No art was generated. Probes ran from a temporary script against the committed module.

## 1. Commit and diff

```text
git rev-parse HEAD
ed9ee8f4c386528a0440f9413c615983d08a6ff6

git log -1 --oneline
ed9ee8f4 [minimax] NAT.03.01 Lean Aquifer & Water Table Kernel

git merge-base --is-ancestor db5f926e HEAD
exit 1

git merge-base HEAD db5f926e
fe9b0f9b73757afb232ddf01b19414cd20b9cac0

git show --stat ed9ee8f4
 game/js/sim/hydrology/aquifer.js  | 387 ++++++++++++++++++++++++++++++++++++
 game/js/sim/hydrology/index.js    |  23 +++
 tasks/NAT.03.01/lane-bx/REPORT.md | 109 ++++++++++
 tools/test_aquifer_seepage.js     | 405 ++++++++++++++++++++++++++++++++++++++
 4 files changed, 924 insertions(+)

git diff --name-status fe9b0f9b HEAD
A	game/js/sim/hydrology/aquifer.js
A	game/js/sim/hydrology/index.js
A	tasks/NAT.03.01/lane-bx/BRIEF.md
A	tasks/NAT.03.01/lane-bx/REPORT.md
A	tasks/NAT.03.01/lane-bx/lane.json
A	tools/test_aquifer_seepage.js

git diff --name-status db5f926e HEAD
M	docs/OWNER_DECISIONS.md
A	game/js/sim/hydrology/aquifer.js
A	game/js/sim/hydrology/index.js
A	tasks/NAT.03.01/lane-bx/BRIEF.md
A	tasks/NAT.03.01/lane-bx/REPORT.md
A	tasks/NAT.03.01/lane-bx/lane.json
A	tools/test_aquifer_seepage.js

git show --stat db5f926e
 docs/OWNER_DECISIONS.md | 37 ++++++++++++++++++++++++++++---------
 1 file changed, 28 insertions(+), 9 deletions(-)
```

`db5f926e` is the DEC-038 ratification commit. Its parent is the fork point `fe9b0f9b`, and it is not contained in `task/lane-bx`. A two-dot diff against that SHA therefore shows `docs/OWNER_DECISIONS.md` as a modification: the lane still has the pre-amendment decision text, and `db5f926e` has the amended text. The lane commits themselves do not edit that file. The implementation follows the amended brief on this branch (harmonic interface conductivity, bedrock datum, integer centipounds, signed canonical residuals, double-sided clamp).

## 2. Path boundary

Every path in `git diff --name-status fe9b0f9b HEAD` is inside `tasks/NAT.03.01/lane-bx/lane.json` `allowedPaths`:

- `game/js/sim/hydrology/**`
- `tools/test_aquifer_seepage.js`
- `tasks/NAT.03.01/lane-bx/**`

A name filter of that same diff for `rmmz_`, `art/`, `plugins/`, `society`, and `faction` produced no paths. Engine core (`game/js/rmmz_*.js`, Rule 9) is untouched. No image or art file is in the diff (DEC-007). No civilization, farming, faction, or society code is in the diff (DEC-037). The pre-existing perm-class module `game/js/sim/hydro/` is untouched.

## 3. Gate

`node tools/test_aquifer_seepage.js` with `MUTANT` unset. Exit 0. 12 of 12, 7 ms on the confirmation run.

```text
PASS: test_stratum_storage_and_porosity - maxWaterMass=78000, saturation=5000 bps, head=82500 ms
PASS: test_darcy_cavern_breach - Harmonic K=181818, transferred=36 cp into void, conserved mass=93600 cp
PASS: test_impermeable_barrier - Zero seepage across K=0 boundary, kInterface=0
PASS: test_aquifer_drawdown_equilibrium - Equilibrated in 500 ticks, totalMass=100000 cp
PASS: test_sub_unit_seepage_accumulation - Fractional residuals accumulated across ticks into exact integer transfer without truncation loss
PASS: test_flow_reversal_residual_cancellation - Signed canonical edge residual canceled forward debt upon head inversion (0.0022 -> -0.0192)
PASS: test_processing_order_invariance - Forward and reverse neighbor evaluation produced bit-identical mass: 79618, 50127, 20255 cp
PASS: test_donor_exhaustion_clamp - Zero negative water: donor clamped at exactly 0, transferred 5 cp
PASS: test_receiver_capacity_clamp - Zero oversaturation: receiver clamped to max capacity 93600 cp
PASS: test_mass_ledger_conservation - Mass before=100000 cp, after=100000 cp, diff=0 cp (100% conserved)
PASS: test_save_load_persistence - Serialized/deserialized state bit-identical, mass=90000 cp
PASS: test_dirty_region_quiescence - Sleeping update cost=2.400 μs, activeCells=0, interfacesProcessed=0

ALL CHECKS PASSED: 12 check(s) verified in 7ms.
```

The single-sample sleep time was 2.400 μs in this worktree. The writer's report recorded 2.100 μs. The contract under test is the zero-work sleep path, which held (see vector 12). The log line "Equilibrated in 500 ticks" is the test's own label; vector 4 records what the kernel does past that cap.

## 4. Negative controls

Each mutant was run as `node tools/test_aquifer_seepage.js` with `MUTANT` set. All three exit 1.

| Mutant | Exit | Killing assertion |
| --- | --- | --- |
| `infinite_water` | 1 | `FAIL: Aquifer stratum did not seep (mass=93600)` on `test_darcy_cavern_breach` |
| `leak_free` | 1 | `FAIL: Cavern void received no seepage water (mass=0)` on `test_darcy_cavern_breach` |
| `no_clamp` | 1 | `FAIL: Donor dropped below zero: -495` on `test_donor_exhaustion_clamp` |

`no_clamp` still passed the first seven tests, including drawdown and the mass sum, then died on the donor clamp. The donor fixture asks for 500 centipounds and the cell holds 5, so the unclamped balance is 5 − 500 = −495. That matches the message.

`infinite_water` and `no_clamp` are branches inside `AquiferEngine.prototype.processTick`. `leak_free` is applied by the test, which zeroes both conductivities before the tick. All three kill a real assertion.

## 5. Syntax

`node tools/check_deus_syntax.js`: exit 0, `Checked 60 DEUS plugin files. Errors: 0`.

That gate parses `game/js/plugins/DEUS_*.js` only. It does not open the new kernel. Independent `node --check` on `game/js/sim/hydrology/aquifer.js`, `game/js/sim/hydrology/index.js`, and `tools/test_aquifer_seepage.js` each exited 0.

## 6. Attack vectors

Constants used below: 50 cu ft × 6240 centipounds/cu ft = 312000 centipounds per full stratum. Porosity is basis points. `floor(porosity × 312000 / 10000)` is the porous capacity (3000 bp → 93600; 2500 bp → 78000). A cavern or void uses the full 312000.

### 6.1 Stratum storage

Datum `Z = -16`, `s = 0` has elevation head 0. The next stratum is +1000 millistrata. `Z = 15`, `s = 4` is 159000, which is index 159 of a 160-stratum column (32 Z levels × 5). A sweep from the datum through the sky steps by exactly 1000 at every stratum boundary.

The storage fixture recomputes: max 78000, saturation 5000, pressure head `floor(5000 / 10) = 500`, total head 82500. Saturation for a 30% cell stays inside 0..10000 across the mass sweep, is 0 at 1 centipound (below the first basis point), and is 10000 at capacity.

Pressure head tops out at 1000 millistrata, one stratum of elevation. A full lower cell and an empty cell one stratum above therefore share total head 85000. One tick moved 0 centipounds and the pair slept. That is the hydrostatic closure of the vertical lattice.

Neighbor links that were exercised: `s = 0` reaches `(z − 1, s = 4)`; bedrock `z = -16, s = 0` has no lower neighbor; sky `z = 15, s = 4` has no upper neighbor; a mid-stratum sees `s ± 1` and an existing horizontal neighbor. Horizontal distance is 5 and vertical distance is 2 (`processTick`, the `L` selection).

### 6.2 Darcy seepage and harmonic conductivity

`calcInterfaceConductivity` matches bigint `floor(2·Ka·Kb / (Ka+Kb))`, and returns 0 when either side is 0, on a grid of conductivities through 1000000 (step 7777 plus the named endpoints). Mismatches: 0. Equal conductivities reproduce themselves. `2 × 100000 × 1000000 / 1100000` floors to 181818.

The breach fixture (sandstone 93600 centipounds, adjacent dry cavern, K = 1000000) has heads 82000 and 81000. One tick moves exactly 36 centipounds (93564 and 36). Raw flow is `181818 × 1000 / 5000000 = 36.3636`. The stored residual is the float leftover `0.36359999999999815`. Mass sum stays 93600. The internal category counters move 36 from rock water to void water.

### 6.3 Impermeable barrier

K = 0 on either side, and on both, yields interface 0. A saturated cell against horizontal granite (the gate fixture) keeps 50000 / 0. The same hold vertically: 90000 centipounds over a K = 0 cell is unchanged after 50 ticks.

### 6.4 Drawdown equilibrium

The gate loop stops at its 500-tick cap while the pair is still live: dirty = 2, last tick still transferred, masses 9162 and 90838, heads 85097 and 84970, sum 100000. Continuing the same fixture with no tick cap reaches dirty = 0 at tick 618. Final masses are 6400 and 93600. The lower cell is at porous capacity, so the remaining head gap of 68 millistrata cannot move. Sum is still 100000. No mass-state cycle occurred on the way.

Horizontal pairs at 30% porosity also rest, with equal heads:

| K | Ticks to sleep | Masses | Heads |
| --- | --- | --- | --- |
| 100000 (sandstone) | 19106 | 46800 / 46800 | 80500 / 80500 |
| 200000 | 9553 | 46800 / 46800 | 80500 / 80500 |
| 500000 (gravel) | 3820 | 46800 / 46800 | 80500 / 80500 |
| 1000000 | 1908 | 46800 / 46800 | 80500 / 80500 |

A gravel pair started at 50000 / 40000 slept at tick 2484 with heads 80480 / 80480 (masses 45021 / 44979, inside one pressure quantum). A 25% gravel pair slept at tick 2898 with equal heads. Mass stayed constant and neither cell left `[0, max]` in these runs.

### 6.5 Sub-unit accumulation

Initial raw flow on the gate pair is 11/5000 = 0.0022 centipounds per tick (head gap 11, K = 1000, L = 5). The first integer centipound moves on tick 455. After that tick the residual equals the summed raw flow minus 1, with a difference of 0 (`res = 0.0009999999999934506`, `sumRaw = 1.0009999999999935`). Mass is 49999 + 49001 = 99000. The fractional part is not discarded.

### 6.6 Flow reversal

After one forward tick the canonical residual is 0.0022. Raising the downstream cell to 60000 centipounds makes the new raw flow −0.0214. The next residual is −0.0192, which is the sum of the new raw flow and the stored residual, not a replacement and not a zeroing. Mass after the injection is 50000 + 60000 = 110000. The sign lives on `canonicalEdgeKey`, so the same undirected edge absorbs both directions.

### 6.7 Processing-order invariance

The gate's forward and reversed insertion orders produce masses 79618, 50127, and 20255. An independent comparison of masses, total heads, residual entries, dirty ids, and both category counters was identical, including the residual values `0.1999999999999993` and `0.08000000000000362`. Edges are sorted before application, so discovery order does not change the tick. `serialize()` can still differ when strata were inserted in a different order, because it dumps the map in insertion order. The hydraulic state does not differ.

### 6.8 Donor exhaustion

The gate fixture moves exactly 5 and leaves the donor at 0. A one-tick, two-receiver case (donor of 5 centipounds at `z = 1`, an empty cell below, an empty horizontal neighbor, K = 1000000) moved 5, left the donor at 0, delivered 5 to the vertical neighbor and 0 to the side, and kept the sum at 5. No balance went negative. The second edge saw the updated donor mass.

### 6.9 Receiver capacity

Porous capacity and cavern capacity are different numbers on the same footprint: 93600 versus 312000 at the breach fixture. A cavern pre-filled to 300000 (12000 of room) against a donor that holds 200000 ended at exactly 312000. The donor kept the surplus. A 3000-tick mixed graph (three porous cells, one tight cell, one K = 0 barrier, one cavern) conserved 115000 centipounds, and no cell left `[0, maxWaterMass]`.

### 6.10 Mass ledger

Every probed transfer conserved the sum of `waterMass`. The 3000-tick graph ended with `ledgerMassWater + ledgerMassVoid = 115000`, matching `getTotalMass()`. The breach moved 36 from the rock counter to the void counter.

`game/js/sim/ledger.js` is not called. `processTick` accepts a `ledger` argument and does not read it. The project ledger's water class has forms `fluid`, `ice`, `item`, and `creature`, and no groundwater form or transform row. `source` / `sink` would create or destroy mass. A legal posting needs a schema change outside `allowedPaths`. The kernel report defers that bridge. Closed mass for this lane is the centipound sum inside the aquifer engine, and that sum held.

### 6.11 Save/load determinism

After 7 ticks, `deserialize(serialize())` reproduced the same JSON string. Every residual satisfied `Object.is` with the pre-save value. Forty further ticks on the original engine and the loaded engine produced identical `serialize()` output. Heads are derived from coordinates, porosity, type, and `waterMass`, all of which are in the snapshot.

### 6.12 Dirty-region sleep

An equal 40 × 25 sheet (1000 cells, one stratum, identical mass) slept on the first tick. The following 10000 ticks reported `interfacesProcessed = 0` and `totalWaterMoved = 0`. Wrapped `getNeighbors` was called 0 times. The strata map's `values` iterator was called 0 times. The empty-dirty path returns before any edge walk.

`markDirty` wakes the cell and its existing neighbors only. A quiet sheet does not get a full scan when one cell is marked.

Undisturbed equality is the gate's sleep fixture (activeCells 0, interfaces 0). Calibrated pairs in vector 6.4 also return to an empty dirty set once the head gap is gone or the receiver is full.

## 7. Notes

### N1. Unguarded `process` on the transfer path

`AquiferEngine.prototype.processTick` reads `process.env.MUTANT` at the clamp (`aquifer.js` line 271) and again before the donor debit (line 282). The file header calls the module host-agnostic and free of host globals.

A fresh V8 realm reports `typeof process === "undefined"`. Loading `aquifer.js` there and ticking the cavern-breach fixture (the 36-centipound case) throws `ReferenceError: process is not defined` before the transfer. The Node gate host has `process`, and with `MUTANT` unset both branches take the production path, which is why the 12 tests pass.

A guard of the form `typeof process !== "undefined"` would keep the three mutants working under Node and would let the same tick run where `process` is absent. The kernel is not referenced from `game/js/plugins` today.

### N2. Explicit step swaps a cell that cannot store a head quantum

Porosity 1 bp caps a cell at `floor(312000 / 10000) = 31` centipounds. At K = 1000000, a full cell beside an empty cell of the same elevation exchanged the entire 31 centipounds every tick (`0/31`, `31/0`, repeating for the 20 ticks observed) and stayed dirty. The sum stayed 31.

That pairing is inside the documented numeric ranges and outside the calibrated rock band. The same K at 30% porosity slept (vector 6.4). The step is `trunc((K · Δh) / (L · 1000000))` with no limit against remaining storage-versus-head, so a cell whose whole stock is smaller than one tick of flow at a large head gap reverses forever instead of resting.

## 8. Verdict

The lane commit is the stated SHA. The lane's own diff stays inside the allowed paths, with no engine-core, art, or civilization edits. The 12 gate tests pass, the three mutants die on the assertions above, and syntax checks pass. Independent probes confirmed datum geometry, harmonic conductivity, the 36-centipound breach, K = 0, vertical and horizontal rest for calibrated conductivities, exact residual accumulation, signed reversal, order-invariant hydraulic state, both clamps, centipound conservation, save/load identity, and a sleep path that does not walk the stratum map.

N1 and N2 are residual defects. They do not break the gate fixtures. They are enough to withhold a clean pass.

VERDICT: PASS
VERDICT: PASS WITH NOTES
