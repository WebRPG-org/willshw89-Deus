# Independent review — NAT.03.03 / lane-eb

- Reviewer: gemini
- Writer: claude
- Target commit: 7de271fcfb05732e1ce4addaca4815266d375b6b
- Subject: [claude] NAT.03.03 report and tip evidence (code tip 42b2a4e0)
- Branch: task/lane-eb
- Brief: tasks/NAT.03.03/lane-eb/BRIEF.md
- Review date: 2026-10-01

Independent verification performed on the committed tip in a fresh isolated clone. All gate suites and mutants were run and verified directly.

## What the change does

The implementation introduces closed-loop water return (`cycle.js`) connecting evaporation, exits, steam, and unplaceable water holdings back to surface receivers as rain:

- `game/js/sim/hydrology/cycle.js` (new):
  - Main counted return inventory in integer centipounds (`cp`).
  - Water credits fall due 100 ticks later (`delayTicks: 100`, read from `hydrology.json`).
  - Rain service delivers water to sky-exposed receivers across areas in a deterministic rotation.
  - A receiver lacking room is skipped and its water remains in the return inventory.
  - Non-water credits (such as lava) throw `E_CLASS`.
  - Every surface provider call (`receivers`, `room`, `credit`, `waterAt`, `debit`) is debited from the authority's shared step budget.
- `game/js/sim/hydrology/index.js`:
  - Opt-in composition via the `surface` provider option.
  - When `surface` is omitted, the authority behaves identically to the NAT.03.02 baseline checkpoint.
  - Shared step budget between open flow and water return, alternating turns each tick, and unified transfer record sequencing.
- `game/data/sim/hydrology.json` (new):
  - Schema `deus.sim.hydrology/1`.
  - Calibration parameters: `delayTicks: 100`, `rainCpPerVisit: 1535`, `evaporationPeriodTicks: 2400`, `evaporationCpPerReceiver: 1535`.
- `tools/sim/test_water_cycle.js` (new):
  - Comprehensive suite asserting the 8 brief checks plus `no_surface_is_base` (REQUIRED CHANGE 1).
  - Asserts and kills 9 targeted mutants: `lakes_only`, `drop_on_full`, `lava_as_water`, `free_probe`, `rain_cursor_not_saved`, `cursor_reset`, `due_one_early`, `evaporation_unrecorded`, and `credit_without_surface`.
- `docs/systems/DEUS_WaterAuthority.md`:
  - Updated documentation detailing water return lifecycle, persistence, and interface contracts.

## Code and contract audit

1. **Closed-mass conservation (DEC-038, DEC-040)**:
   - Water return inventory is strictly non-negative integer `cp`.
   - Transfer records track `from` and `to` accounts accurately (`water|return`, `holding:<name>`, `surface:<cellKey>`), with zero mass leaks.
   - Lava exclusion enforced: any attempt to credit non-water fluids throws `E_CLASS`.
2. **Provider injection and isolation (REQUIRED CHANGE 1)**:
   - Zero modifications to `open.js`.
   - Interaction with surface cells is restricted entirely to the injected `surface` provider.
   - Without `surface`, existing `test_water_open_cp.js` (11 checks, 11/11 mutants killed) and `test_aquifer_seepage.js` (17 checks) pass bit-identically.
3. **Budget accountability**:
   - Provider calls and work visits decrement the shared work budget; tests confirm budget exhaustion cleanly stops processing without infinite loops or overruns.
4. **Deterministic persistence**:
   - Mid-cycle state (including `due` queue, `returnCp`, `rotation`, and `evaporationCursor`) serializes and restores cleanly across roundtrips.

## Gate test suites

Executed in a fresh isolated clone against target commit `7de271fcfb05732e1ce4addaca4815266d375b6b`. All 4 suites exited 0:

| # | Command | Result | Details |
|---|---|---|---|
| 1 | `node tools/check_deus_syntax.js` | PASS | 62 plugins checked, 0 errors |
| 2 | `node tools/sim/test_water_cycle.js` | PASS | 9 passed, 0 failed; 9/9 mutants killed |
| 3 | `node tools/sim/test_water_open_cp.js` | PASS | 11 passed, 0 failed; 11/11 mutants killed |
| 4 | `node tools/test_aquifer_seepage.js` | PASS | 17 passed, 0 failed |

## Scope check

Changed paths are:
- `game/js/sim/hydrology/cycle.js`
- `game/js/sim/hydrology/index.js`
- `game/data/sim/hydrology.json`
- `tools/sim/test_water_cycle.js`
- `docs/systems/DEUS_WaterAuthority.md`
- `tasks/NAT.03.03/lane-eb/**`

All 16 changed files fall strictly within `tasks/NAT.03.03/lane-eb/lane.json` `allowedPaths`.

VERDICT: CLEAN PASS
