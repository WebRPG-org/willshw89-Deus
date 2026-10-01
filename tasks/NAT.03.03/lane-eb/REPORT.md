# lane-eb report: NAT.03.03 water return (writer claude, reviewer gemini)

## Launch record

- Base: `607c012d5ea3097c50aa05eb081f977dcf77e44f` (`[ops] NAT.03.03 lane-eb launch prompt 20261001_073136`), which holds lane-ea's merge `2bb8f7da` (checked with `git merge-base --is-ancestor`).
- Code tip: `42b2a4e0a8b45d46ac73b1ed6f8e28011802b5f4`. The commit that adds this report and the tip evidence touches only `tasks/NAT.03.03/lane-eb/`.
- Date: 2026-10-01. Node v24.19.0.

## What changed

- `game/js/sim/hydrology/cycle.js` (new): the return inventory. `credit(cp, cause, from)` books water only (other classes throw `E_CLASS`); due records fall due 100 ticks later; rain is served by a deterministic rotation over the provider's per-area receiver index, one visit per receiver per step, debiting only what a receiver took; evaporation passes read and debit sky-exposed water through the provider; every provider call costs one unit of the step budget; exact save/parse/commit.
- `game/js/sim/hydrology/index.js`: `createWaterAuthority` composes the cycle when `options.surface` is given (shared budget, alternating first service by tick, one record row sequence, `totals().water.return`, `credit`, `returnStatus`, the `cycle` save payload, all-or-nothing load). Without `surface` it returns the NAT.03.02 checkpoint authority. The one difference there: it refuses (`E_SAVE`) a save that holds a return payload, which only a return-enabled authority writes.
- `game/data/sim/hydrology.json` (new): `waterReturn` tuning v1. `delayTicks` 100 is settled. `rainCpPerVisit` 1535, `evaporationPeriodTicks` 2400 and `evaporationCpPerReceiver` 1535 are PM_DEFAULT (about 3 mm over a 5 ft x 5 ft cell; one pass per game day at 36-s ticks).
- `tools/sim/test_water_cycle.js` (new): 9 named checks (the brief's 8 plus `no_surface_is_base` for REQUIRED CHANGE 1) and 9 mutants, using the same loader and kill rule as `test_water_open_cp.js`.
- `docs/systems/DEUS_WaterAuthority.md`: new options and methods, record causes, a new "Water return" section (provider contract, credits, due records, rain, evaporation, budget), persistence, simplifications and tests.

## How I tested it

- At the base `607c012d`: ran all four gate commands (`evidence/base_607c012d_*.txt`). Syntax, `test_water_open_cp.js` (11 passed, 11/11 mutants) and `test_aquifer_seepage.js` (17) exited 0. `test_water_cycle.js` stopped with MODULE_NOT_FOUND (exit 1), which the brief says is not a named-check failure.
- At the tip `42b2a4e0`: ran all four gate commands in the worktree (`evidence/tip_42b2a4e0_*.txt`), and again in a fresh `git clone -c core.autocrlf=true` with the sources checked out as CRLF (`evidence/tip_42b2a4e0_crlf_clone.txt`). All exited 0 both times.

## Evidence

- `evidence/tip_42b2a4e0_test_water_cycle.txt`: `RESULT: 9 passed, 0 failed`, `MUTANTS: 9/9 killed`, exit 0.
- `evidence/tip_42b2a4e0_test_water_open_cp.txt`: 11 passed, `MUTANTS: 11/11 killed`, exit 0 (the keep-green suite, read-only for this lane).
- `evidence/tip_42b2a4e0_test_aquifer_seepage.txt`: `ALL CHECKS PASSED: 17 check(s)`, exit 0.
- `evidence/tip_42b2a4e0_check_deus_syntax.txt`: `Checked 62 DEUS plugin files. Errors: 0`, exit 0.
- Mutant kills (copied from the tip run):

```
KILLED lakes_only -> exit_rains_remote_nonlake - the dry receiver in the far area (2,2) got rain: 0 cp
KILLED drop_on_full -> full_receivers_retain - the return inventory keeps every cp, step 100
KILLED lava_as_water -> lava_never_returns - Missing expected exception: lava credit refused (exit from holding:magma-hold)
KILLED free_probe -> rain_charges_budget - host + surface calls 43 exceed budget 3 (step 101)
KILLED rain_cursor_not_saved -> evaporation_save_load_cycle - run(420) vs load(save(run(124))) then run(296)
KILLED cursor_reset -> rotation_deterministic - rain follows the rotation across areas, skipping the full receiver
KILLED due_one_early -> due_not_early - credit before step 0 rains at step 100
KILLED evaporation_unrecorded -> transfer_records_balance - records for water|return sum to -43744, the account changed by 35350
KILLED credit_without_surface -> no_surface_is_base - the checkpoint authority's members
```

- Mutant pairing used (the brief asked the PM to confirm it): lakes_only -> `exit_rains_remote_nonlake`, drop_on_full -> `full_receivers_retain`, lava_as_water -> `lava_never_returns`, free_probe -> `rain_charges_budget`. Provocations: `rain_cursor_not_saved` -> `evaporation_save_load_cycle`, `cursor_reset` -> `rotation_deterministic`, `due_one_early` -> `due_not_early`, `evaporation_unrecorded` -> `transfer_records_balance`, `credit_without_surface` -> `no_surface_is_base`.
- No screenshot: the brief requires no F5 evidence (the in-game proof is lane-ec).

## Not done / known problems

- Nothing in the game uses water return yet. The surface provider is a test fixture. Binding it to the open store (which needs a debit and an outside credit in `open.js`), routing `DEUS_Fluid.pendingDisplaced` to `credit`, and calling `credit` from real exits are all lane-ec. Not checked in F5.
- Water return needs a budget of at least 3 to make progress (an area list read, a room probe and a credit). With budgets 1 and 2 it stays within the budget but never rains. `rain_charges_budget` asserts progress only from 3.
- The fair-service rule alternates which of open flow and water return is served first on each tick. It is not NAT.03.06's fair multi-class scheduler, and it does not report oldest-due age.
- The cycle reads the receiver lists every step and does not cache them between steps. A list that changes between steps can make the rotation, or an evaporation pass, skip or repeat a receiver once. The provider must return its lists in a stable order; the cycle does not sort them.
- A save holding a return payload is refused by an authority without a surface, and the reverse is refused too. A save under different `waterReturn` tuning is refused (`E_CALIBRATION`), so a later tuning change will need a migration.
- `cycle.js` reads `game/data/sim/hydrology.json` with `fs` and a path relative to its own folder. Not checked in a packaged NW.js build.
- The PM_DEFAULT rain and evaporation amounts are estimates (about 3 mm per visit and per day). They have not been measured against gameplay and are flagged for the Owner (plan risk 19).

## Try it in RMMZ

Nothing to try in RMMZ. Headless only: `node tools/sim/test_water_cycle.js`.
Expected: 9 PASS lines, `MUTANTS: 9/9 killed`, exit 0.

## Decisions needed

- PM: confirm the mutant pairing above, and the extra guard check `no_surface_is_base`.
- PM: accept or change the PM_DEFAULT values in `hydrology.json` (`rainCpPerVisit` 1535, `evaporationPeriodTicks` 2400, `evaporationCpPerReceiver` 1535), and the minimum budget of 3 for rain.
- PM: confirm that refusing a return payload in the checkpoint authority's `deserialize` fits "behaves exactly as at the base". The checkpoint never writes that payload. The alternative is silently dropping return water.
