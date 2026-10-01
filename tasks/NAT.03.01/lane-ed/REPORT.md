# lane-ed (NAT.03.01) report: budgeted, resumable, wrap-aware Darcy kernel with constants from units.js

Date: 2026-10-01. Writer: claude. Reviewer: gemini. Branch `task/lane-ed`. Base `c9f3858b` (the lane-ed launch commit on main `24d0de80`). Code tip `d7e55287`; this report and its evidence are committed on top of it.

Commits:
- `453f3c77`: the new checks and the per-check runner, committed before any kernel edit (`aquifer.js` at this commit is the same as at the base).
- `12372cd5`: the kernel change.
- `d7e55287`: two more assertions (a cell woken mid-pass stays dirty; wrapped runs must end differently from open runs) and a shorter failure message.

## What changed
- `game/js/sim/hydrology/aquifer.js`:
  - Lines 16-18: `VOLUME_PER_STRATUM`, `WATER_DENSITY_CENTIPOUNDS_PER_CUFT` and `MAX_WATER_MASS_PER_STRATUM` now come from `require("../units.js")` (`STRATUM_FT3`, `WATER_CP_PER_FT3`, `WATER_CP_PER_STRATUM`). The values are unchanged (50, 6240, 312000), and so are the export names. `index.js` is untouched.
  - `processTick(dt, ledger, opts)` takes a new third argument:
    - `opts.maxInterfaces` (a positive integer) caps the interface evaluations in one call.
    - A pass is the sorted edge list of the cells that were dirty when it began. An unfinished pass keeps a cursor (`passCursor`: edges, next index, the cells found still dirty, the cells woken during the pass, the wrap), and the next call resumes from it. When the last edge is evaluated, the pass publishes its dirty set (still-dirty plus woken cells).
    - The return value gains `complete` and `remainingInterfaces`. `interfacesProcessed` now counts the edges evaluated in this call; without opts that equals the old value.
  - `opts.wrap = { width, height }` (either axis may be 0 or absent, meaning that axis does not wrap):
    - `getNeighbors`, `markDirty` and `isHorizontalNeighbor` take an optional wrap, so x = width-1 neighbours x = 0 (and the same for y) at L = 5 ft.
    - A pass keeps the wrap it began with. Resuming it with a different wrap throws a `RangeError`.
  - `serialize` writes `cursor` (null between passes). `deserialize` restores it. A save without the field (the older format) loads as "no unfinished pass".
  - New negative-control mutant `cursor_reset` (`MUTANT=cursor_reset`): a resumed pass restarts at its first edge. The hook sits in the kernel, beside the existing three.
  - No physics change: the Darcy flux, the residuals, the clamps and the edge order are untouched. A call with no options and no unfinished pass is one whole tick, as before.
- `tools/test_aquifer_seepage.js`:
  - Five new checks: `budget_bounds_interfaces`, `budgeted_equals_unbudgeted`, `cursor_survives_save`, `wrap_neighbour` and `constants_from_units`.
  - The runner now runs every check even after one fails, prints `FAIL: <check> - <reason>`, and exits 1 if any check failed.
  - New flags: `--case=<name>` runs a single check, and `--mutant=<name>` sets `MUTANT`.
  - The bodies of the 12 ratified checks are unchanged. `assert` no longer prints on its own (the runner prints the failure).

## How I tested it
- At the base `c9f3858b`: the three gate commands, plus the three existing mutants (`evidence/base_run.txt`).
- FAIL-before: I ran the final test file over a `git archive` of the base (`%TEMP%\laneed_base`), whole and with `--case=` for each new check (`evidence/base_new_checks_fail.txt`).
- At the tip: `node tools/test_aquifer_seepage.js`; `--mutant=cursor_reset`; and `MUTANT=infinite_water|leak_free|no_clamp`.
- 11 hand mutations, each applied to a scratch copy (`%TEMP%\laneed_handmut.js`, never committed).
- No physics change: 20 seeded random 5x5x2-Z blocks (porous, cavern and impermeable cells, mixed K), each run for 200 unbudgeted ticks through the base kernel and the tip kernel side by side. After every tick I compared the return values and the serialized state (`%TEMP%\laneed_nophys.js`). As a control, I reran the comparison against a tip copy with the vertical L changed from 2 to 3.
- The three gate commands in a fresh `git clone` checked out at `d7e55287`.

## Evidence
- `evidence/base_run.txt` (base): `check_deus_syntax` reports 0 errors, the aquifer suite 12/12 and `test_units` 7/7, all exit 0. Each existing mutant exits 1 on its first check: `infinite_water` and `leak_free` on `test_darcy_cavern_breach`, `no_clamp` on `test_donor_exhaustion_clamp`. `tools/sim/test_water_open_cp.js` does not exist on this main.
- `evidence/base_new_checks_fail.txt`: tip test, base kernel: `RESULT: 12 passed, 5 failed`, exit 1. Each new check also fails alone:
  - `budget_bounds_interfaces`: "first budgeted call evaluated 46, expected 5".
  - `wrap_neighbour`: "x seam: 0,0,0,0 is not a wrapped neighbour of 3,0,0,0".
  - `constants_from_units`: "aquifer VOLUME_PER_STRATUM ignores units.js (got 50)".
  - `budgeted_equals_unbudgeted` and `cursor_survives_save`: "call 1 evaluated 46 interfaces, budget 1/4".
- `evidence/tip_run.txt` (tip `d7e55287`): `ALL CHECKS PASSED: 17 check(s)`, exit 0. The 12 ratified checks print the same figures as at the base (for example 36 cp breach, 79618/50127/20255 cp order invariance, 93600 cp clamp); only check 12's timing differs.
- `evidence/tip_mutants.txt`:
  - `--mutant=cursor_reset` exits 1. `budget_bounds_interfaces` reports "pass did not complete within 1000 calls"; `budgeted_equals_unbudgeted` and `cursor_survives_save` report "did not finish N passes within 100000 calls (finished 0)".
  - The three existing mutants still exit 1, and their first red check is the same as at the base.
  - Because the runner no longer stops at the first failure, more checks now show as red: under `infinite_water`, the drawdown, donor-clamp and `wrap_neighbour` checks as well.
- `evidence/tip_hand_mutations.txt`: all 11 turn their target check red, exit 1.

  | Hand mutation | Check turned red |
  |---|---|
  | woken-during-pass cells dropped at completion | `budget_bounds_interfaces` |
  | cursor not loaded | `cursor_survives_save` |
  | cursor wrap not saved | `cursor_survives_save` |
  | cursor `next` not saved | `cursor_survives_save` |
  | still-dirty set not saved | `cursor_survives_save` |
  | budget off by one | `budget_bounds_interfaces` (also the other two budget checks) |
  | edges recomputed on each resume | `budgeted_equals_unbudgeted` |
  | seam edge uses L = 2 | `wrap_neighbour` (32 cp vs 12 cp) |
  | wrap ignored when a pass collects its edges | `wrap_neighbour`, `budgeted_equals_unbudgeted` |
  | literal capacity 312000 | `constants_from_units` |
  | literal density 6240 | `constants_from_units` |

- `evidence/no_physics_change.txt`: "SAME: 20 seeded fixtures x 200 unbudgeted ticks (4000 ticks)". The control (vertical L 2 to 3) reports "DIFF seed 1 tick 0 transfersExecuted: base 153 tip 139", exit 1.
- `evidence/tip_gate_fresh_clone.txt` (fresh clone at `d7e55287`): `check_deus_syntax` reports 0 errors, the aquifer suite 17/17 and `test_units` 7/7, all exit 0.
- No screenshots. The brief requires no F5 evidence, and nothing in the game loads this module.

## Not done / known problems
- **Merge-order rerun with lane-ea: not run.** `task/lane-ea` held only its launch commit `54d8e533` when I finished, and `tools/sim/test_water_open_cp.js` does not exist yet. Under the brief, whichever lane merges second reruns `node tools/sim/test_water_open_cp.js` and `node tools/test_aquifer_seepage.js` on the combined candidate. This lane does not touch `index.js`. lane-ea's guard should still see every aquifer export, because the export list is unchanged.
- The budget counts interface evaluations only. Starting a pass still visits every dirty cell's neighbours and sorts the edge set in one call (O(D log D) for D dirty cells), and a budget does not bound that work. Under design D2 §3.2, receiver probes and topology visits should also draw on the one shared budget. That is not done here: the brief scopes the budget to interfaces.
- The cursor stores the pass's whole edge list (in memory and in the save), so a save made mid-pass grows with the number of active edges. A save made between passes has `cursor: null`.
- Edges evaluated in different budgeted calls use the dt of the call that evaluates them. A budgeted pass equals an unbudgeted tick only when every call in the pass uses the same dt. The kernel does not enforce this; the comment documents it.
- Wrapped coordinates must already lie in `[0, width)` / `[0, height)`; the kernel does not normalise ids that lie outside that range.
- `markDirty(x, y, z, s)` with no wrap does not wake the cell across the seam (the pass still finds that edge from the dirty cell itself). Callers on a wrapped world should pass the wrap.
- The `cursor_reset` hook, like the three existing mutant hooks, reads `process.env.MUTANT` in the kernel. I followed the file's convention and did not move the hooks out.
- The `ledger` argument of `processTick` was unused before this lane and is still unused.
- No editor Playtest (F5) and no F8 console check: no RMMZ consumer loads `sim/hydrology` (see GAME TRANSLATION).

## Try it in RMMZ
Nothing to try in RMMZ: no plugin loads `game/js/sim/hydrology`. From the repo root:
1. `node tools/test_aquifer_seepage.js`. Expected: `ALL CHECKS PASSED: 17 check(s)`, exit 0.
2. `node tools/test_aquifer_seepage.js --mutant=cursor_reset`. Expected: exit 1, with `budget_bounds_interfaces`, `budgeted_equals_unbudgeted` and `cursor_survives_save` red.
3. `node tools/sim/test_units.js`. Expected: 7 passed.

## Decisions needed
- None for this lane. For the later scheduler lanes (lane-ds w9, lane-ee w10): should pass start (the neighbour probes and the sort) also draw on the shared budget B, as D2 §3.2 says? That would change how a pass is defined (the edge list would be built incrementally).

```text
GAME TRANSLATION

WBS / Lane: NAT.03.01 / lane-ed (kernel amendment)
Approved scope / Owner authorization reference: tasks/NAT.03.01/lane-ed/BRIEF.md (DEC-058 build plan as amended by WORK-GATE G02 and WBS Rev 34); DEC-038 units, DEC-030 wrapped areas
Writer SHA / evidence date: d7e55287 / 2026-10-01
Translation Class: C FOUNDATIONAL / INDIRECT

Player / World Effect:
None yet in the game. The groundwater kernel can now be run under a per-tick work cap and resumed later
(including across a save), and water can seep across the world's wrapped horizontal edge.

Trigger:
A caller's processTick(dt, ledger, { maxInterfaces, wrap }). No game system calls it yet.

Runtime Authority:
AquiferEngine (game/js/sim/hydrology/aquifer.js): strata waterMass, signedResidualMap, dirtyCells, and the new passCursor.

Simulation Path:
aquifer.js processTick -> _beginPass (sorted canonical edges, wrap-aware getNeighbors) -> the unchanged per-edge Darcy/residual/clamp body -> on completion, dirty-set publish. Constants come from game/js/sim/units.js.

Engine Bridge:
None. No RMMZ plugin requires sim/hydrology. Deferred to the D2 runtime cutover (NAT.03.02/NAT.03.03 per D2 §4) and the scheduler lanes that depend on this one (lane-ds w9, lane-ee w10).

Visible Result:
None observed in game; nothing is drawn from this module.

Persistence:
AquiferEngine.serialize/deserialize: new "cursor" field (null between passes); a cursor-less older save loads as "no unfinished pass".
Proof: cursor_survives_save (48 mid-pass save/load round trips give a bit-identical result to 12 unbudgeted ticks). No game save path calls it.

Failure Without This Lane:
A world-sized groundwater tick could not be capped per frame (Rule 14), an unfinished pass would be lost on save, and water could not cross the wrapped world edge, leaving a dry seam on every wrapped area. Water constants could drift from the shared units table.

Automated Proof:
node tools/test_aquifer_seepage.js at d7e55287: 17/17, exit 0 (evidence/tip_run.txt, evidence/tip_gate_fresh_clone.txt).
FAIL-before at base c9f3858b: the 5 new checks red (evidence/base_new_checks_fail.txt).
Mutant cursor_reset plus 11 hand mutations red (evidence/tip_mutants.txt, evidence/tip_hand_mutations.txt).
Unbudgeted behaviour identical to the base over 4000 seeded ticks (evidence/no_physics_change.txt).
Consumer integration test: none exists (no consumer).

In-Game Proof:
NOT RUN. No in-game consumer exists; the brief requires none.

CONSUMED BY GAME SYSTEMS:
- None yet. Planned: the D2 water authority's scheduler (hydrology/index.js stepWorld, lod.js), which spends the shared budget B through opts.maxInterfaces and passes the world's wrap.
- If this is corrupted in gameplay: a broken cursor would skip or repeat seepage interfaces (water appears or stalls in cut rock); a wrong wrap would make a dry or doubled seam at area edges; a constant drift would give porous rock the wrong capacity.

GAME BRIDGE STATUS
Simulation implemented: YES - aquifer.js at d7e55287, 17/17 checks
Engine bridge implemented: NO - no plugin loads sim/hydrology (deferred to the D2 runtime cutover)
Presentation implemented: NO - nothing draws groundwater
Input/player interaction implemented: NO - none
Save/load implemented: NO - the kernel serializes its cursor (cursor_survives_save), but no game save calls it
Playable verification performed: NO - NOT RUN, no consumer

Simulation authority: COMPLETE within the lane-ed kernel amendment, supported by evidence/tip_run.txt and evidence/base_new_checks_fail.txt
Game translation consumer: DEFINED as the D2 water authority scheduler (hydrology/index.js / lod.js)
Engine bridge: DEFERRED TO the D2 runtime cutover lanes
Player-facing status: NOT YET PLAYABLE

Remaining step before player can experience it: the D2 runtime cutover connects AquiferEngine to the shared tick and to DEUS_Fluid/DEUS_Levels, with the world's wrap and budget.
```
