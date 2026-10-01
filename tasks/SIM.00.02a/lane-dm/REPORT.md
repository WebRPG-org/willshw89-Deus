# lane-dm REPORT: SIM.00.02a, one shared simulation tick from the absolute game minute

Writer: claude. Reviewer: gemini. Branch `task/lane-dm`. Base `a1e879a5`. Code commits `ef4d0333` and `862c3714`. Gate runs on 2026-10-01 at `cf5545cc`, which is the code plus launch-prompt commits only.

## What changed
- `game/js/sim/host/tick.js` (new, 132 lines): `createTickClock({secondsPerTick: 36, maxTicksPerAdvance: 100})` with an integer second accumulator, `advanceToMinute(absMinute)` returning the ticks due (at most 100 per call), owed ticks drained on later advances, and `serialize`/`restore`.
- `game/js/plugins/DEUS_World.js` (+78): on `time:minute` it reads the absolute minute from `$ufTime` (day, hour, minute) and advances the clock to it. The clock is armed when `world:created` returns (after every handler, including `iterateWorldHistory`) and on load from the saved origin. The state is saved in `ufWorld.simTick`. Adds `UF.Sim.onTick(name, order, fn)`, run in (order, name) with domain `action`, plus `UF.Sim.tickCount()` and `UF.Sim.tickStats()`. No frame hook.
- `tools/test_sim_tick.js` (new, 549 lines): 10 named checks, the NW.js New Game check and 9 mutants. `862c3714` reads the sources as LF so the mutant anchors match a CRLF clone.
- `docs/systems/DEUS_SimTick.md` (new, 96 lines): system doc.
- `tasks/SIM.00.02a/lane-dm/evidence/`, `REPORT.md`: evidence and this report.

## How I tested it
Each gateTests command from `lane.json` was run in the foreground, one at a time, in this worktree at `cf5545cc`. Each output was saved in full to `evidence/<name>_tip.txt`:
1. `node tools/check_deus_syntax.js` (evidence/check_deus_syntax_tip.txt)
2. `node tools/test_sim_tick.js` (evidence/test_sim_tick_tip.txt). This also holds every other named check in the brief, the NW.js New Game run and the mutants.
3. `node tools/test_sim_loader.js` (evidence/test_sim_loader_tip.txt)
4. `node tools/test_new_game_year0.js` (evidence/test_new_game_year0_tip.txt)

These ran in the lane worktree, not in fresh clones as merge_gate does. The fresh-clone gate run is not checked.

FAIL-before: `evidence/fail_before_at_cd7fe1a4.txt` was produced earlier in this lane (15:59) by running the new `tools/test_sim_tick.js` against a clone at `cd7fe1a4`, which has no lane code. I read that file this session but did not re-run it.

## Evidence
Gate results at `cf5545cc` (copied from the files, trimmed):

```text
$ node tools/check_deus_syntax.js
Checked 62 DEUS plugin files. Errors: 0
exit 0
```

```text
$ node tools/test_sim_tick.js
PASS tick_from_game_minutes - pure clock: minutes 1,2,3 -> 1, 2, 2 ticks (remainder 0 s); game: tickCount 0 at world start, after each advanceMinute(1): 1, 3, 5 (expected 1, 3, 5), remainder 0 s, owed 0; console errors 0
PASS multi_minute_advance - advanceMinute(6): 10 ticks from 1 time:minute event (expected 10 from 1); then AddTime 6 (plugin command): 20 (expected 20); remainder 0 s, owed 0
PASS history_does_not_tick - year-3 New Game (history years 3): ... tickCount 0 and armed false at the end of world:created, 0 when newWorld returned (armed true at minute 840, calendar minute 840, owed 0); advanceMinute(6) afterwards -> 10 (expected 10); 0 console errors; 3174 ms
PASS bulk_advance_bounded - pure clock: advanceToMinute(1440) -> 100, then 23 drains of at most 100: 2400 in total (expected 2400), owed 0; game: advanceMinute(1440) ran 100 ticks in that call, owed 2300; ...
PASS paused_zero - 60 running frames: 10 ticks; 600 paused frames: ticks 10 -> 10, calendar minute 486 -> 486, advances 6 -> 6; ...
PASS speed_scales - 600 frames at the default TimeSpeed (1/6 s per game minute): 60 minutes, 100 ticks (expected 100); at TimeSpeed 0.05: 200 minutes, 333 ticks (expected 333)
PASS handlers_ordered - registered b(10) a(10) c(-5) d(2.5); 5 ticks ran: c1 d1 a1 b1 c2 d2 a2 b2 ...
PASS save_resume_exact - ... after 30 x 1 min, 7 min and AddTime 50 in both: original 2546 ticks/0 owed/24 s, loaded 2546/0/24 s; ...
PASS no_frame_hook - 600 running Scene_Map frames: 60 time:minute events, 60 clock advances (expected one per event); 300 paused frames: 0 advances (expected 0)
PASS calendar_stub - DEUS_World alone with $ufTime = { year: 1 }: newWorld ran; armed true at minute 0, 0 ticks
PASS nwjs_new_game - run_tests exit 0; 8 sim_tick PASS lines; no FAIL/ERROR lines
      PASS sim_tick.ticks_fixed_while_paused - 180 paused frames: tickCount 40 -> 40, game minute 504 -> 504, advances 24 -> 24
      PASS sim_tick.addtime_60_adds_100 - paused, AddTime 60 (plugin command): tickCount 40 -> 140, owed 0 -> 0
      ...
PASS mutant_frame_hook - ...: no_frame_hook red
PASS mutant_drop_remainder - ...: tick_from_game_minutes red
PASS mutant_unsaved_accumulator - ...: save_resume_exact red
PASS mutant_count_events - each time:minute event counts as 60 s, whatever it carried: multi_minute_advance red
PASS mutant_uncapped_catchup - ...: bulk_advance_bounded red
PASS mutant_arm_early - ...: history_does_not_tick red
PASS mutant_frame_rate_ticks - ...: paused_zero red, speed_scales red
PASS mutant_calendar_required - ...: calendar_stub red
PASS mutant_unordered_handlers - ...: handlers_ordered red
RESULT: 20 passed, 0 failed
exit 0 (36 s)
```

```text
$ node tools/test_sim_loader.js
... 7 PASS lines (vm_loader_loads_ledger ... nwjs_loader)
RESULT: 7 passed, 0 failed
exit 0 (34 s)
```

```text
$ node tools/test_new_game_year0.js
SETUP CONTRACT PASSED: 30 gating checks, 15 mutants caught (ATK-YEAR0-001 closure criterion).
INV-SIM-01 END-TO-END MET: clock, save and constructor all at year 0.
exit 0 (17 s)
```

FAIL-before at `cd7fe1a4` (`evidence/fail_before_at_cd7fe1a4.txt`): both must-fail checks are red there, `tick_from_game_minutes` (`Cannot find module ... game\js\sim\host\tick.js`) and `multi_minute_advance` (`UF.Sim.onTick / tickCount / tickStats missing after DEUS_World.js loads`). All 10 named checks and all 9 mutant checks were red: `RESULT: 0 passed, 19 failed`, `exit 1`. (The NW.js check did not exist then.)

- Screenshot `evidence/sim_tick.map.png`: I opened it. It shows the New Game map (grass, the player at the lower left, a red banner in the middle, the PAUSED badge at the top right). A TEST_ overlay reads "UF.Sim.tickCount() = 171 / owed 0, remainder 24 s, catch-ups 0, advances 44 / game minute 583 (armed at 480), clock 09:43 day 1, paused". 103 minutes since arming x 60 s / 36 s = 171.67, so 171 whole ticks with a 24 s remainder, which matches the overlay. The NW.js run that took it (`evidence/nwjs_results.txt`, 2026-10-01T20:24Z, 8/8 PASS) was made from the working tree at 15:24, before the code commit `ef4d0333` at 15:59. The NW.js check in this session's `test_sim_tick.js` run passed 8/8 at `cf5545cc` (quoted above), but I did not open that run's screenshot, so the PNG here is the earlier one.

## Not done / known problems
- `history_does_not_tick` reports that `iterateWorldHistory(state, 3)` in the harness was "stopped by ReferenceError: WORK_BEATS_PER_SHARED is not defined". That name is used at `game/js/plugins/DEUS_History.js:2591` and has no definition there. The same line is on `origin/main` (`14a1c178`), so this lane did not cause it, and `DEUS_History.js` is outside this lane's paths. The check still holds (0 ticks and not armed when `world:created` ends), but a year-3 history does not run to completion in the harness. Flagged for the PM.
- The gate commands ran in this worktree, not in merge_gate's fresh clones. The fresh-clone run is not checked.
- The F5 check in the real RMMZ editor Playtest is not checked: the editor stays closed under DEC-059. The in-game evidence comes from the NW.js harness on a snapshot copy.
- F8 dev console in the editor Playtest: not checked. The harness check `sim_tick.no_console_errors` passed.
- The FAIL-before output is from earlier in this lane. I did not re-run it this session.
- Gemini review: not done yet. `docs/STATUS.md` was not updated because it is outside this lane's paths.

## Try it in RMMZ
1. Start a New Game on a snapshot copy, or in Playtest once the editor may be reopened.
2. Press F8 and run `UF.Sim.tickCount()` a few times while time runs, then pause and run it again.
3. While paused, run AddTime 60, then let a few game minutes pass and read `UF.Sim.tickStats()`.
Expected: the count rises about 5 ticks every 3 game minutes while time runs and stays fixed while paused. AddTime 60 adds exactly 100 ticks (owed 0, since 100 is within the per-call cap).

## Decisions needed
- Whether to open a lane for the undefined `WORK_BEATS_PER_SHARED` in `DEUS_History.js:2591` (present on main).

## Fix after grok review

Grok's review `review_grok_331d61c4.md` (PASS WITH MINORS) had one MINOR, section 3: a move to an earlier absolute minute kept the old remainder, so the next forward minute could emit one extra tick. This fix changes only that rule.

- `game/js/sim/host/tick.js` `advanceToMinute`: when `absMinute < last`, the clock now also sets `remainder = 0`, as if armed at that minute. `rebases` is still counted and owed ticks are still kept and paid (`payOwed()`, unchanged). The function comment now says so; it no longer says the call returns 0, which Grok noted was wrong when ticks are owed.
- `tools/test_sim_tick.js`: new check `backward_minute_resets_remainder` (Grok's probe: arm 480, minute 481, back to 61, then 62, against a clock armed at 61; plus an owed-ticks case: arm 0, minute 1440, back to 100 pays 100 and leaves 2,200 owed). New mutant `backward_keeps_remainder` removes the reset line in memory and must turn that check red.
- `docs/systems/DEUS_SimTick.md`: the `advanceToMinute` row, the check table, the mutant list and the SetTime note describe the reset.

Before the fix (`tick.js` as at `38c74ec8`, `evidence/backward_minute_fail_before.txt`):

```text
FAIL backward_minute_resets_remainder - arm(480), advanceToMinute(481) -> 1 (remainder 24 s); advanceToMinute(61) -> 0, last 61, remainder 24 s, rebases 1; advanceToMinute(62) -> 2 (remainder 12 s); a clock armed at 61: advanceToMinute(62) -> 1 (remainder 24 s); owed across a rebase: arm(0), 1440 then 100 -> 100 paid, owed 2200, rebases 1
RESULT: 0 passed, 1 failed
exit 1
```

After the fix, and under the mutant (`evidence/backward_minute_after_fix.txt`):

```text
PASS backward_minute_resets_remainder - arm(480), advanceToMinute(481) -> 1 (remainder 24 s); advanceToMinute(61) -> 0, last 61, remainder 0 s, rebases 1; advanceToMinute(62) -> 1 (remainder 24 s); a clock armed at 61: advanceToMinute(62) -> 1 (remainder 24 s); owed across a rebase: arm(0), 1440 then 100 -> 100 paid, owed 2200, rebases 1
RESULT: 1 passed, 0 failed
exit 0

$ node tools/test_sim_tick.js --mutant=backward_keeps_remainder --no-nw
FAIL backward_minute_resets_remainder - ... advanceToMinute(62) -> 2 (remainder 12 s); a clock armed at 61: advanceToMinute(62) -> 1 (remainder 24 s) ...
RESULT: 10 passed, 1 failed; named check red: backward_minute_resets_remainder
exit 1
```

Gate tests from `lane.json`, run one at a time in the foreground in this worktree on 2026-10-01 (full output: `evidence/gates_after_grok_fix.txt`):

```text
$ node tools/check_deus_syntax.js
Checked 62 DEUS plugin files. Errors: 0
exit 0

$ node tools/test_sim_tick.js
PASS backward_minute_resets_remainder - ...
PASS nwjs_new_game - run_tests exit 0; 8 sim_tick PASS lines; no FAIL/ERROR lines
PASS mutant_backward_keeps_remainder - a move to an earlier minute keeps the old remainder: backward_minute_resets_remainder red
RESULT: 22 passed, 0 failed
exit 0 (49 s)

$ node tools/test_sim_loader.js
RESULT: 7 passed, 0 failed
exit 0 (48 s)

$ node tools/test_new_game_year0.js
SETUP CONTRACT PASSED: 30 gating checks, 15 mutants caught (ATK-YEAR0-001 closure criterion).
INV-SIM-01 END-TO-END MET: clock, save and constructor all at year 0.
exit 0 (15 s)
```

All 11 earlier checks and 9 earlier mutants still pass (22 = 12 checks + 10 mutants). Not checked: the backward move through the game host (a real `SetTime` backwards in NW.js or F5); the new check drives the pure clock, as Grok's probe did. The `sim_tick.map.png` screenshot was not retaken. Fresh-clone (merge_gate) runs: not checked.
