# Independent Grok Review — NAT.03.01 repair / lane-bx

- **Writer**: MiniMax
- **Reviewer**: Grok
- **Reviewed Commit**: `71f8ee46d8a933b7bd019010d353fcc67a8c7cbc`
- **Parent**: `7c33fc63d3ea27432beb5ffb2a1807053e43c6db`
- **Subject**: `[minimax] NAT.03.01 repair browser-host guard for process.env.MUTANT`
- **Branch**: `task/lane-bx`
- **Worktree**: `C:\Users\snewt\.deus_worktrees\lane-bx`
- **Review Date**: 2026-09-28
- **Prior review**: `tasks/NAT.03.01/lane-bx/review_grok_ed9ee8f4.md` on `ed9ee8f4c386528a0440f9413c615983d08a6ff6`

No product code was edited for this review. Checks ran against the committed module at `71f8ee46d8a933b7bd019010d353fcc67a8c7cbc`.

## 1. Diff and scope

`git rev-parse HEAD` at the start of this review was `71f8ee46d8a933b7bd019010d353fcc67a8c7cbc`.

`git log -1 --format` for that commit:

```text
71f8ee46d8a933b7bd019010d353fcc67a8c7cbc
7c33fc63d3ea27432beb5ffb2a1807053e43c6db
[minimax] NAT.03.01 repair browser-host guard for process.env.MUTANT
```

`git diff --name-status 7c33fc63..71f8ee46`:

```text
M	game/js/sim/hydrology/aquifer.js
```

`git diff --stat 7c33fc63..71f8ee46`: 1 file changed, 5 insertions(+), 2 deletions(-).

The repair commit modifies only `game/js/sim/hydrology/aquifer.js`. `git merge-base --is-ancestor 7c33fc63 71f8ee46` exited 0. The working tree of that path matched the commit under review.

## 2. The guard

`AquiferEngine.prototype.processTick` previously read `process.env.MUTANT` at the clamp and again before the donor debit. Both reads now use one local, at `game/js/sim/hydrology/aquifer.js` lines 269–270:

```javascript
// Safely guarded process.env access for host-agnostic runtimes
const mutant = typeof process !== "undefined" && process.env ? process.env.MUTANT : undefined;
```

The clamp tests `mutant === "no_clamp"`. The donor debit tests `mutant !== "infinite_water"`.

Precedence binds the local as `((typeof process !== "undefined") && process.env) ? process.env.MUTANT : undefined`. `typeof` on an absent `process` binding returns `"undefined"` and does not throw. The `&&` then skips the property read. When `process.env` is a truthy object, `mutant` is `process.env.MUTANT`, and the two comparisons are the comparisons the Node harness already used.

A search of `game/js/sim/hydrology/aquifer.js` finds that single `process.env` read. The only other `process` spelling in the file is the method name `processTick`.

## 3. Closure of the unguarded read

The prior defect was a cavern-breach tick throwing `ReferenceError: process is not defined` in a realm with no `process` binding.

A context probe of that realm, using the same sandbox object as the tick below:

```text
typeof_process undefined
bare_access ReferenceError: process is not defined
```

Bare `process.env` still throws. The module's own tick does not.

The exact sandbox command from the prior review, run against this commit, exited 0:

```text
PASS_BROWSER_SANDBOX 93564 36
```

Those masses are the production breach: 36 centipounds moved, the donor was debited, and the sum stayed 93600. The tick reached the transfer, took the production clamp, took the production debit, and returned. The unguarded-read defect is closed.

## 4. Gate

`node tools/test_aquifer_seepage.js` with `MUTANT` unset. Exit 0. 12 of 12.

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
PASS: test_dirty_region_quiescence - Sleeping update cost=2.700 μs, activeCells=0, interfacesProcessed=0

ALL CHECKS PASSED: 12 check(s) verified in 19ms.
```

The single-sample sleep time on this run was 2.700 μs. The checked contract is the zero-work sleep path (`activeCells=0`, `interfacesProcessed=0`), which held.

## 5. Negative controls

Each mutant was `node tools/test_aquifer_seepage.js` with `MUTANT` set. All three exited 1. The harness banner still prints `[BASELINE]` on these runs; that string lives in `tools/test_aquifer_seepage.js`, which this commit does not change. The kill is the assertion and the exit code.

| Mutant | Exit | Killing assertion |
| --- | --- | --- |
| `infinite_water` | 1 | `FAIL: Aquifer stratum did not seep (mass=93600)` on `test_darcy_cavern_breach` |
| `leak_free` | 1 | `FAIL: Cavern void received no seepage water (mass=0)` on `test_darcy_cavern_breach` |
| `no_clamp` | 1 | `FAIL: Donor dropped below zero: -495` on `test_donor_exhaustion_clamp` |

`no_clamp` passed the first seven tests, including the cavern breach and the mass sum, then died on the donor clamp. The fixture asks for 500 centipounds from a cell that holds 5, so the unclamped balance is −495.

`infinite_water` and `no_clamp` still branch on the guarded `mutant` local inside `processTick`. `leak_free` is applied by the test, which zeroes both conductivities before the tick. The kernel guard does not intercept that path, and the cavern assertion still fires.

## 6. Syntax

`node tools/check_deus_syntax.js`: exit 0, `Checked 60 DEUS plugin files. Errors: 0`.

`node --check game/js/sim/hydrology/aquifer.js`: exit 0. The plugin syntax gate parses `game/js/plugins/DEUS_*.js` only. The direct check covers the repaired module.

## 7. Behavior outside the guard

With `MUTANT` unset, the local is `undefined`. Both comparisons take the production arm. The sandbox breach and the 12 gate checks agree on that path: 36 centipounds across the harmonic interface, donor debited, sum conserved.

The 1 bp porosity exchange recorded in the prior review (a 31-centipound cell at K = 1000000 swapping its whole stock each tick) is outside this diff. The repair does not change that step size.

## 8. Conclusion

Commit `71f8ee46d8a933b7bd019010d353fcc67a8c7cbc` is the reviewed SHA. Its diff is confined to `game/js/sim/hydrology/aquifer.js`. The direct `process.env.MUTANT` reads are gone. A realm with no `process` binding completes the cavern-breach tick at 93564 / 36. The 12 gate tests pass, the three mutants still die on the assertions above, and both syntax checks pass.

VERDICT: PASS
