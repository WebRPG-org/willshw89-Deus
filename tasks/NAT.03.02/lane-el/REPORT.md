# lane-el (NAT.03.02) report: retire NaturalConnections' private water store

Date: 2026-10-01. Writer: claude. Reviewer: gemini. Branch `task/lane-el`. Base `afaeaf69`, tip `941b2052` (code), plus this report and its evidence. Briefs: `BRIEF.md` and `BRIEF_AMENDMENT_1.md` (PM ruling, option 1: a floored natural passage is not a drain).

## What changed
- `tools/test_natural_connections_no_mint.js`: the amended guard and the new checks and mutants (below). First commit `de3209ab`, made before any plugin edit, with the base output.
- `game/js/plugins/DEUS_NaturalConnections.js`:
  - removed `fluidsState`, `hasFluid`, `addFluid`, `clearFluids` and `updateFluids`, with their API entries, the `Levels.waterAt` wrapper and the frame-30 `updateFluids()` call. The frame-30 block still calls `stepCreatures()`.
  - `isWater` reads only `Levels.waterAt` and `Jobs.isWaterAt`. `dry()` uses `isWater`.
  - a saved `naturalConnections.fluids` record is left as it is (no code touches it).
  - the in-game `liquid_present_at_entrance` and `liquid_flow_through_connection` checks are rewritten against UF.Fluid (same names).
- `tools/test_natural_connections.js`:
  - `liquid_physics_flow` is removed.
  - `liquid_makes_landing_wet_refusing_travel` now wets the landing through the fixture's own `Levels.waterAt` (its `wet` set).
  - that `Levels.waterAt` double now also answers at Ground, which has no baseline. It used to crash there, and `dry()` now asks it at Ground through `isWater`, just as the real `Levels.waterAt` already answers. No check was changed.
- `docs/systems/DEUS_NaturalConnections.md`: a water section, the retired API, events, the legacy payload, checks, and a 2026-10-01 status.

## How I tested it
- `node tools/test_natural_connections_no_mint.js` at the base (plugin unchanged) and at the tip, plus each mutant run with `--case=<its check>`.
- `node tools/test_natural_connections.js` and its 7 mutants at the tip.
- The three gate commands in a fresh `git clone` of `task/lane-el` at `941b2052`.
- NW.js: on a snapshot copy of `game/` in `%TEMP%\lane-el-f5`, with `node tools/add_test_plugin.js` (DEUS_Test is not registered in the worktree), I ran the `natural_connections` suite:
  - with the forced seed 20260919 (launched with `--uf-test=natural_connections`, the only flag that forces it), at the base and at the tip;
  - with the snapshot's `DEUS_World` `Seed` parameter set to 7 and `node tools/run_tests.js natural_connections`, at the base, at the tip, and under 2 snapshot-only mutants (`%TEMP%\lane-el-f5\mutate.js`).

## Evidence
- `evidence/base_amended_run.txt` (base `afaeaf69`): 3 passed, 4 failed.
  - Passed: `authoritative_flow_conserved`, `floored_passage_is_not_a_drain`, `creatures_still_stepped`.
  - Failed: `link_does_not_mint`, `waterAt_not_wrapped`, `private_store_gone`, `legacy_payload_round_trip`. For example, seed 7's landing (136,132,-2) went from `{"isWater":false,"waterAt":false}` to `{"isWater":true,"waterAt":true}` after one frame-30 update, and baseline -1 water went from 134 to 161 cells on seed 20260919.
- `evidence/tip_run.txt` (tip `941b2052`): 7 passed, 0 failed, exit 0.
- `evidence/tip_mutants.txt`: every mutant exits 1 on its named check, for the intended reason.

  | Mutant | Check it turns red | Why it fails |
  |---|---|---|
  | `disable_all_flow` | `authoritative_flow_conserved` | The open-column control moves no water (credit 0). The floored passages stay 0/0. |
  | `fake_passage_flow` | `floored_passage_is_not_a_drain` | cliff_cave_0_0_1 shows landing 1, credit 1. |
  | `credit_legacy_payload` | `legacy_payload_round_trip` | The payload cells read as water, and the Fluid mass goes from 0 to 2. |
  | `drop_legacy_payload` | `legacy_payload_round_trip` | The payload is undefined after load and after the second save. |
  | `drop_step_creatures` | `creatures_still_stepped` | The wolf stays at (136,132,0). |
- `evidence/tip_fixture_suite.txt`: 24 passed, 0 failed. Each of the 7 fixture mutants still fails 1 to 4 checks. `landing` turns the rewritten `liquid_makes_landing_wet_refusing_travel` red.
- `evidence/tip_gate_fresh_clone.txt`: all three gate commands exit 0.
- `evidence/f5_tip_seed7/results.txt`: 11 passed, 4 failed. Both rewritten checks pass, and the line reads `liquid_flow_through_connection - 400 UF.Fluid steps: Ground debit 0, lower-level credit 0; landing (136,132,-1) before {"isWater":false,"depth":0}, after steps {...false, 0}, after 61 frames and both screenshots {...false, 0}; level sums [0,0,0] -> [6,0,0] -> [6,0,0] -> [6,0,0]`. In words: the landing is dry after the upper entrance has been wetted. 0 new errors.
- `evidence/f5_base_seed7/results.txt`: the same 11 pass and the same 4 fail at the base. Its old liquid check reads `flows 2, water reached lower landing: true`, which is the minting this lane removes.
- `evidence/f5_tip_mutants_seed7.txt`: both snapshot mutants turn a rewritten check red.
  - `mint_into_fluid` (the frame-30 tick puts 1 UF.Fluid water at each wet entrance's landing) turns `liquid_flow_through_connection` red: the landing reads `{"isWater":true,"depth":1}` and the level sums are `[6,1,1]`.
  - `isWater_ignores_levels` turns `liquid_present_at_entrance` red: it reads `isWater false`.
  - Before `941b2052` the check waited only 3 frames and `mint_into_fluid` passed. That is why it now holds the wet entrance for 61 frames.
- Screenshot `evidence/f5_tip_seed7/natural_connections.landing_dry_after_wetting.png` (opened): level -1 (the level box reads "-1"), centred on the landing (136,132,-1). It shows dark blue brick cave walls and floor and black void cells, with no water drawn anywhere. The bottom notice is left over from the earlier F6 test. The passage's stair marker cannot be picked out in it. The earlier `middle_entrance.png` of the same cell looks the same.
- Screenshot `evidence/f5_tip_seed7/natural_connections.entrance_wetted.png` (opened): Ground (the level box reads "Ground"), centred on the entrance (136,132,0). It shows grass, a dark curved stroke over a pale blue patch at the centre (the stair marker, which is also in the pre-wetting `ground_entrance.png`), the founding crowd on the left, a stump and grass tufts. The 6 UF.Fluid water units at the entrance are not drawn: this frame looks the same as `ground_entrance.png` there. The wetting is shown by the check's numbers, not by the image.

## Not done / known problems
- **The in-game suite does not PASS on its fixed seed 20260919.** `generated_chain` fails at the base and at the tip (`evidence/f5_base_natural_connections_seed20260919.txt`, `evidence/f5_tip_natural_connections_seed20260919.txt`). The survey reports `tested: 0` of 18103 candidates. With no chain yet, the only skip before the tested count is the `levels.waterAt` test on the -1/-2 cells, so every candidate was called wet. The suite then returns before the liquid checks run. Passage generation is out of this lane's scope. I have not investigated it in NW.js. (In the node VM on the same seed, Levels' flood fill from Ground water reaches the -1 caves.)
- **On seed 7, 4 in-game checks fail at the base and at the tip alike:** `dry_supported_landings`, `invalid_f6_keeps_order`, `reverse_traversal` and `keyboard_order_moves_unit`. I have not investigated them. The brief's "`--suite natural_connections` PASSes" is therefore not met. Only the two rewritten liquid checks and `no_errors` are evidenced as passing.
- The seed-7 F5 runs set the `DEUS_World` `Seed` parameter in the snapshot's `plugins.js` only. Nothing in the repo forces seed 7.
- `tools/run_tests.js` passes `--deus-test=natural_connections`, but the plugin forces seed 20260919 only on `--uf-test=natural_connections`. So a stock `run_tests.js natural_connections` run gets the Seed parameter or a random seed. This predates the lane and is not changed here.
- Measurement reading: the amendment says "upper stays 6". The endpoint cell itself drops to 1-3, because UF.Fluid spreads the pour sideways over its own level. The checks therefore measure the upper level's total in a 25x25 box (debit 0) and print the cell depth beside it. This follows the amendment's "(no debit)". The PM may want it worded differently.
- `creatures_still_stepped` and `link_does_not_mint` use seed 7 as well as 20260919. In this VM, every landing on seed 20260919 already reads wet (Levels' flood fill), so neither a free landing nor a newly wet one can show there.
- `credit_legacy_payload` credits the payload into UF.Fluid. Its other form, "isWater reads the payload", is what the base code did, and the base run shows `legacy_payload_round_trip` failing on it.
- The VM tests run UF.Fluid without sim/hydro. In NW.js (hydro loaded), the in-game check's level sums stayed `[6,0,0]`, so no seepage showed in that run.
- `tools/ops/quarantine.json:538` still lists `tools/test_natural_connections.js` as FAIL_API_DRIFT. That is the PM's item (not in allowedPaths).
- The plugin's `@help` still points at `docs/systems/UF_NaturalConnections.md`; it is left alone (not in scope).
- No editor Playtest (F5 in the RMMZ editor) and no F8 console check: the NW.js runs above are harness launches.
- The merge waits for ADR-003 amendment A11 (amendment "Unchanged").

## Try it in RMMZ
1. Make a snapshot copy of `game/` and register DEUS_Test in it: `node tools/add_test_plugin.js <copy>/js/plugins.js`.
2. In the copy's `plugins.js`, set the `DEUS_World` parameter `Seed` to `7`.
3. Run `node tools/run_tests.js natural_connections --game <copy>`.

Expected:
- `liquid_present_at_entrance` and `liquid_flow_through_connection` pass, with Ground debit 0, lower-level credit 0 and the landing `{"isWater":false,"depth":0}`.
- The four checks named above fail as they do at the base.
- `test_output` holds `landing_dry_after_wetting.png` and `entrance_wetted.png`.

## Decisions needed
- The in-game suite's fixed seed 20260919 no longer makes a chain at this main, and 4 checks fail on seed 7 at the base. Whose lane takes these? It would need passage generation, or a new fixture seed, which this lane may not choose.
- Is the upper-level reading of "upper stays 6" acceptable (see above)?
