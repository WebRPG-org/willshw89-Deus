# SIM.00.02a lane-dm review (grok)

Target: `08bd54f7989376c6b9bdcb2924569dfb509926b4`
Branch: `task/lane-dm`
Reviewer: grok. Writer family: claude.
Reviewed commit is `git rev-parse HEAD` at the start of this review (the `[claude]` fix). The `[ops]` commit `623aa49c` above the previous review is a launch record.

The earlier review `tasks/SIM.00.02a/lane-dm/review_grok_331d61c4.md` (commit `38c74ec8`) closed with a pass-with-minors line, which merge_gate does not accept. Its one minor was `advanceToMinute` keeping the old remainder on a backward minute. This review is of the fix for that.

## 1. Scope

`git log --format='%h %an | %s' origin/main..HEAD`

```text
08bd54f7 deus-claude | [claude] SIM.00.02a lane-dm fix after grok review: a backward minute resets the remainder
623aa49c deus-gemini | [ops] SIM.00.02a lane-dm launch prompt 20261001_174947 (writer claude)
38c74ec8 deus-grok | [grok] SIM.00.02a lane-dm review: review_grok_331d61c4.md (VERDICT: PASS WITH MINORS)
331d61c4 deus-pm | [pm] lane-dm reviewer gemini -> grok: Gemini CLI cannot run as a worker; bda69d18 is a one-line review with no launch (AUDIT_LOG A13-7)
bda69d18 deus-gemini | [gemini] SIM.00.02a review d8ff27cd
d8ff27cd deus-claude | [claude] SIM.00.02a lane-dm evidence and REPORT at cf5545cc
cf5545cc deus-ops | [ops] SIM.00.02a lane-dm launch prompt 20261001_171035 (writer claude)
740edd38 deus-ops | [ops] SIM.00.02a lane-dm launch prompt 20261001_161109 (writer claude)
862c3714 deus-claude | [claude] SIM.00.02a test_sim_tick: read sources as LF so mutant anchors match a CRLF clone
ef4d0333 deus-claude | [claude] SIM.00.02a shared simulation tick from the absolute game minute
cd7fe1a4 deus-ops | [ops] SIM.00.02a lane-dm launch prompt 20261001_151024 (writer claude)
030a8cc6 deus-ops | [pm] Open lane-dm (SIM.00.02a): BRIEF.md and lane.json, reconciled at a1e879a5
```

`git diff --name-status 38c74ec8 HEAD`

```text
M	docs/systems/DEUS_SimTick.md
M	game/js/sim/host/tick.js
M	tasks/SIM.00.02a/lane-dm/REPORT.md
A	tasks/SIM.00.02a/lane-dm/evidence/backward_minute_after_fix.txt
A	tasks/SIM.00.02a/lane-dm/evidence/backward_minute_fail_before.txt
A	tasks/SIM.00.02a/lane-dm/evidence/gates_after_grok_fix.txt
A	tasks/SIM.00.02a/lane-dm/launches/20261001_174947_prompt.txt
M	tools/test_sim_tick.js
```

`git show --stat` splits that range in two. `623aa49c` adds only `tasks/SIM.00.02a/lane-dm/launches/20261001_174947_prompt.txt` (14 lines). `08bd54f7` changes `docs/systems/DEUS_SimTick.md`, `game/js/sim/host/tick.js`, `tools/test_sim_tick.js`, `tasks/SIM.00.02a/lane-dm/REPORT.md`, and three evidence files. Every path is a lane file or one of the three product files the fix was allowed to touch. `game/js/plugins/DEUS_World.js` is unchanged in this range.

Findings: none.

## 2. Backward minute

The probe from the earlier review, run on the tip clock (`node -e` requiring `game/js/sim/host/tick.js`, `createTickClock({ secondsPerTick: 36, maxTicksPerAdvance: 100 })`):

```text
arm(480); advanceToMinute(481) -> returned 1, rem 24, ticks 1
advanceToMinute(61)            -> returned 0, rem 0, last 61, ticks 1, rebases 1
advanceToMinute(62)            -> returned 1, rem 24, ticks 2
fresh arm(61); advanceToMinute(62) -> returned 1, rem 24, ticks 1
forward-minute tick count matches armed clock: true
```

The minute after the rebase returns 1 tick and remainder 24 s, the same as a clock armed at minute 61. The earlier probe returned 2 ticks and remainder 12 s on that minute.

The new check fails on a temp copy of the pre-fix clock and passes on the tip.

Temp tree `C:\Users\snewt\AppData\Local\Temp\sim0002a-revert-tick`: `tools/test_sim_tick.js` and `tools/lib/vm_sim_require.js` copied from this worktree, `game/js/sim/host/tick.js` written from `git show 38c74ec8:game/js/sim/host/tick.js` (6565 bytes, reset line absent). The backward branch there is:

```text
if (absMinute < last) {
                rebases++;
                last = absMinute;
                return payOwed();
            }
```

`node tools/test_sim_tick.js --only=backward_minute_resets_remainder --no-nw` in that tree:

```text
FAIL backward_minute_resets_remainder - arm(480), advanceToMinute(481) -> 1 (remainder 24 s); advanceToMinute(61) -> 0, last 61, remainder 24 s, rebases 1; advanceToMinute(62) -> 2 (remainder 12 s); a clock armed at 61: advanceToMinute(62) -> 1 (remainder 24 s); owed across a rebase: arm(0), 1440 then 100 -> 100 paid, owed 2200, rebases 1
RESULT: 0 passed, 1 failed
EXIT_CODE:1
```

Same command in this worktree (tip `tick.js`):

```text
PASS backward_minute_resets_remainder - arm(480), advanceToMinute(481) -> 1 (remainder 24 s); advanceToMinute(61) -> 0, last 61, remainder 0 s, rebases 1; advanceToMinute(62) -> 1 (remainder 24 s); a clock armed at 61: advanceToMinute(62) -> 1 (remainder 24 s); owed across a rebase: arm(0), 1440 then 100 -> 100 paid, owed 2200, rebases 1
RESULT: 1 passed, 0 failed
EXIT_CODE:0
```

Owed ticks are still paid on the rebase (100 paid, 2200 left). Findings: none.

## 3. Gates and mutants

Each gate is `lane.json` `gateTests`, run in this worktree, one at a time. `EXIT_CODE` is `$LASTEXITCODE` of that `node` process.

`node tools/check_deus_syntax.js`

```text
Checked 62 DEUS plugin files. Errors: 0
EXIT_CODE:0
```

`node tools/test_sim_tick.js`

```text
PASS tick_from_game_minutes - pure clock: minutes 1,2,3 -> 1, 2, 2 ticks (remainder 0 s); game: tickCount 0 at world start, after each advanceMinute(1): 1, 3, 5 (expected 1, 3, 5), remainder 0 s, owed 0; console errors 0
PASS multi_minute_advance - advanceMinute(6): 10 ticks from 1 time:minute event (expected 10 from 1); then AddTime 6 (plugin command): 20 (expected 20); remainder 0 s, owed 0
PASS history_does_not_tick - year-3 New Game (history years 3): 0 time:minute events from the demographics history, 60 in all during world:created with iterateWorldHistory(state, 3) (stopped by ReferenceError: WORK_BEATS_PER_SHARED is not defined); tickCount 0 and armed false at the end of world:created, 0 when newWorld returned (armed true at minute 840, calendar minute 840, owed 0); advanceMinute(6) afterwards -> 10 (expected 10); 0 console errors; 2825 ms
PASS bulk_advance_bounded - pure clock: advanceToMinute(1440) -> 100, then 23 drains of at most 100: 2400 in total (expected 2400), owed 0; game: advanceMinute(1440) ran 100 ticks in that call, owed 2300; drained over 24 more minutes (largest step 100): 2440 ticks = 2400 from the bulk advance + 40 from those minutes; catch-ups 24
PASS paused_zero - 60 running frames: 10 ticks; 600 paused frames: ticks 10 -> 10, calendar minute 486 -> 486, advances 6 -> 6; 600 running frames after: 110 ticks over 66 game minutes (expected 110)
PASS speed_scales - 600 frames at the default TimeSpeed (1/6 s per game minute): 60 minutes, 100 ticks (expected 100); at TimeSpeed 0.05: 200 minutes, 333 ticks (expected 333)
PASS handlers_ordered - registered b(10) a(10) c(-5) d(2.5); 5 ticks ran: c1 d1 a1 b1 c2 d2 a2 b2 c3 d3 a3 b3 c4 d4 a4 b4 c5 d5 a5 b5; duplicate "a": UF.Sim.onTick: "a" is already registered; order NaN: TypeError; no fn: TypeError; empty name: TypeError; tickStats().handlers c,d,a,b, domain action
PASS save_resume_exact - saved ufWorld.simTick {"v":1,"secondsPerTick":36,"armed":true,"origin":480,"last":1921,"remainder":24,"owed":2300,"ticks":101,"advances":2,"catchUps":1,"rebases":0}; loaded clock equals the saved one: true; after 30 x 1 min, 7 min and AddTime 50 in both: original 2546 ticks/0 owed/24 s, loaded 2546/0/24 s; loaded ticks+owed = floor(elapsed/36 s): true; a save without simTick arms at its minute 1921: true
PASS no_frame_hook - 600 running Scene_Map frames: 60 time:minute events, 60 clock advances (expected one per event); 300 paused frames: 0 advances (expected 0)
PASS calendar_stub - DEUS_World alone with $ufTime = { year: 1 }: newWorld ran; armed true at minute 0, 0 ticks
PASS backward_minute_resets_remainder - arm(480), advanceToMinute(481) -> 1 (remainder 24 s); advanceToMinute(61) -> 0, last 61, remainder 0 s, rebases 1; advanceToMinute(62) -> 1 (remainder 24 s); a clock armed at 61: advanceToMinute(62) -> 1 (remainder 24 s); owed across a rebase: arm(0), 1440 then 100 -> 100 paid, owed 2200, rebases 1
PASS nwjs_new_game - run_tests exit 0; 8 sim_tick PASS lines; no FAIL/ERROR lines
      PASS sim_tick.uf_sim_tick_present - UF.Sim.tickCount / tickStats from DEUS_World.js
      PASS sim_tick.ticks_rise_while_running - 180 frames at x1: tickCount 10 -> 40, game minute 486 -> 504
      PASS sim_tick.advances_only_on_minutes - 18 time:minute events, 18 clock advances (no frame hook: one per event)
      PASS sim_tick.ticks_fixed_while_paused - 180 paused frames: tickCount 40 -> 40, game minute 504 -> 504, advances 24 -> 24
      PASS sim_tick.addtime_60_adds_100 - paused, AddTime 60 (plugin command): tickCount 40 -> 140, owed 0 -> 0
      PASS sim_tick.speed_scales - 2 s at x1: 85 game updates, 8 min, 13 ticks (expected 13); 2 s at x4: 88 game updates, 9 min, 15 ticks (expected 15)
      PASS sim_tick.ticks_match_elapsed - ticks 168 + owed 0 over 101 game minutes since minute 480
      PASS sim_tick.no_console_errors - none since TEST_SimTickConsole loaded (plugins.js index 0)
PASS mutant_frame_hook - a Scene_Map frame hook also calls the minute handler every frame: no_frame_hook red
PASS mutant_drop_remainder - the seconds past the last whole tick are dropped: tick_from_game_minutes red
PASS mutant_unsaved_accumulator - the save keeps the tick count but not the remainder or the owed ticks: save_resume_exact red
PASS mutant_count_events - each time:minute event counts as 60 s, whatever it carried: multi_minute_advance red
PASS mutant_uncapped_catchup - a bulk advance hands out every due tick at once: bulk_advance_bounded red
PASS mutant_arm_early - the clock is armed before world:created, so history pre-simulation ticks: history_does_not_tick red
PASS mutant_frame_rate_ticks - a fixed 10 Hz frame accumulator (a minute every 10 frames) instead of time:minute: paused_zero red, speed_scales red
PASS mutant_calendar_required - any $ufTime is read as a full calendar: calendar_stub red
PASS mutant_unordered_handlers - handlers run in registration order: handlers_ordered red
PASS mutant_backward_keeps_remainder - a move to an earlier minute keeps the old remainder: backward_minute_resets_remainder red
RESULT: 22 passed, 0 failed
EXIT_CODE:0
```

`history_does_not_tick` still stops `iterateWorldHistory` with `ReferenceError: WORK_BEATS_PER_SHARED is not defined`. The check's own condition holds (0 ticks, unarmed, then 10 ticks from `advanceMinute(6)`). The earlier review noted this and did not grade it. This diff does not touch `DEUS_History.js`. Noted, not graded.

`node tools/test_sim_loader.js`

```text
PASS vm_loader_loads_ledger - resolve("ledger") = C:\Users\snewt\.deus_worktrees\lane-dm\game\js\sim\ledger.js; exports createLedger: function; same object as Node's require: true; resolve("hydro") = C:\Users\snewt\.deus_worktrees\lane-dm\game\js\sim\hydro\index.js; sandbox require left alone: true
PASS missing_module_throws - threw DEUS_SIM_MODULE_MISSING: UF.Sim.require("no_such_module_wg0044"): no such sim module; tried C:\Users\snewt\.deus_worktrees\lane-dm\game\js\sim\no_such_module_wg0044.js, C:\Users\snewt\.deus_worktrees\lane-dm\game\js\sim\no_such_module_wg0044\index.js, C:\Users\snewt\.deus_worktrees\lane-dm\game\game\js\sim\no_such_module_wg0044.js, C:\Users\snewt\.deus_worktrees\lane-dm\game\game\js\sim\no_such_module_wg0044\index.js; "../plugins/DEUS_World" -> TypeError; no host -> UF.Sim.require("ledger"): no such sim module; tried nothing (no require in this host)
PASS every_vm_harness_installs_hook - 50 hits in 940 files; without the hook: none; planted harness found by the scan: true, refused: true; hooked fixture accepted: true
PASS scan_finds_known_harnesses - 50 hits; known hits missing: none; excluded files found: none; fixtures classified wrong: none
PASS opener_registry - order Air, core, water; duplicate "core": UF.Sim.registerMatterOpener: "core" is already registered; bad fn: TypeError; empty name: TypeError; registry after a caller emptied its copy: 3; UF.Levels at register: undefined
PASS grid_pinned_by_hook - fallback-3 fixture: {} -> 1x1, grid "shipped" -> 3x3, AreasX "2" -> 2x1, PluginManager set after install -> 1x1, legacy UF_World AreasX "4" -> 4x1; real DEUS_World.js -> 1x1; grid "3x3" refused: true
PASS nwjs_loader - run_tests exit 0; 5 sim_loader PASS lines; no FAIL/ERROR lines; log: 2026-10-01T23:53:23.057Z [SIM] UF.Sim.require("ledger") resolved C:\Users\snewt\AppData\Local\Temp\wg0044-nw-1X2Xrj\game\js\sim\ledger.js; expected C:\Users\snewt\AppData\Local\Temp\wg0044-nw-1X2Xrj\game\js\sim\ledger.js
RESULT: 7 passed, 0 failed
EXIT_CODE:0
```

`node tools/test_new_game_year0.js` — every Section A–D line was `[PASS]`, including 15 mutants caught.

```text
SETUP CONTRACT PASSED: 30 gating checks, 15 mutants caught (ATK-YEAR0-001 closure criterion).
INV-SIM-01 END-TO-END MET: clock, save and constructor all at year 0.
EXIT_CODE:0
```

Brief mutants, each `node tools/test_sim_tick.js --mutant=<name> --no-nw`. The harness exits 1 when every named check is red. Named failures:

```text
===== MUTANT frame_hook =====
FAIL no_frame_hook - 600 running Scene_Map frames: 60 time:minute events, 660 clock advances (expected one per event); 300 paused frames: 300 advances (expected 0)
RESULT: 9 passed, 2 failed; named check red: no_frame_hook
EXIT_CODE:1
===== MUTANT drop_remainder =====
FAIL tick_from_game_minutes - pure clock: minutes 1,2,3 -> 1, 1, 1 ticks (remainder 0 s); game: tickCount 0 at world start, after each advanceMinute(1): 1, 2, 3 (expected 1, 3, 5), remainder 0 s, owed 0; console errors 0
RESULT: 5 passed, 6 failed; named check red: tick_from_game_minutes
EXIT_CODE:1
===== MUTANT unsaved_accumulator =====
FAIL save_resume_exact - saved ufWorld.simTick {"v":1,"secondsPerTick":36,"armed":true,"origin":480,"last":1921,"remainder":0,"owed":0,"ticks":101,"advances":2,"catchUps":1,"rebases":0}; loaded clock equals the saved one: false; after 30 x 1 min, 7 min and AddTime 50 in both: original 2546 ticks/0 owed/24 s, loaded 246/0/0 s; loaded ticks+owed = floor(elapsed/36 s): false; a save without simTick arms at its minute 1921: true
RESULT: 10 passed, 1 failed; named check red: save_resume_exact
EXIT_CODE:1
===== MUTANT count_events =====
FAIL multi_minute_advance - advanceMinute(6): 1 ticks from 1 time:minute event (expected 10 from 1); then AddTime 6 (plugin command): 3 (expected 20); remainder 12 s, owed 0
RESULT: 6 passed, 5 failed; named check red: multi_minute_advance
EXIT_CODE:1
===== MUTANT uncapped_catchup =====
FAIL bulk_advance_bounded - pure clock: advanceToMinute(1440) -> 2400, then 0 drains of at most 0: 2400 in total (expected 2400), owed 0; game: advanceMinute(1440) ran 2400 ticks in that call, owed 0; drained over 0 more minutes (largest step 2400): 2400 ticks = 2400 from the bulk advance + 0 from those minutes; catch-ups 0
RESULT: 9 passed, 2 failed; named check red: bulk_advance_bounded
EXIT_CODE:1
```

`frame_hook` also turns `paused_zero` red (600 paused frames: advances 66 to 666, ticks stay 10). That is the same extra red the earlier review recorded for this mutant (8 passed, 2 failed, before this check existed). `drop_remainder` also turns `backward_minute_resets_remainder` red, because minute 481 then keeps remainder 0 s instead of 24 s. The default suite still records each named mutant caught (`PASS mutant_<name>` above). Findings: none.

## 4. tick.js behaviour

`git diff 38c74ec8 HEAD -- game/js/sim/host/tick.js` in full:

```text
diff --git a/game/js/sim/host/tick.js b/game/js/sim/host/tick.js
index 5a15f487..c96af387 100644
--- a/game/js/sim/host/tick.js
+++ b/game/js/sim/host/tick.js
@@ -59,7 +59,8 @@ function createTickClock(opts) {
         /**
          * Moves the clock to an absolute game minute and returns the ticks to run now (0..maxTicksPerAdvance).
          * Elapsed seconds = (absMinute - last) * 60 + remainder; whole ticks of it are added to what is owed, and the
-         * call pays up to the cap. An earlier minute re-bases the clock there and returns 0. Unarmed: 0, nothing kept.
+         * call pays up to the cap. An earlier minute re-bases the clock there with a zero remainder, as if armed at it,
+         * adds no ticks and pays only what is already owed. Unarmed: 0, nothing kept.
          */
         advanceToMinute(absMinute) {
             if (!armed) return 0;
@@ -68,6 +69,7 @@ function createTickClock(opts) {
             if (absMinute < last) {
                 rebases++;
                 last = absMinute;
+                remainder = 0;   // as if armed at that minute; owed ticks are kept
                 return payOwed();
             }
             const seconds = (absMinute - last) * 60 + remainder;
```

The only executable change is `remainder = 0` on `absMinute < last`, before `payOwed()`. Same-minute and forward advances still use `(absMinute - last) * 60 + remainder`. A backward move still does not add ticks from the jump, still counts a rebase, and still pays already-owed ticks up to the cap. The comment now matches that. `docs/systems/DEUS_SimTick.md` describes the same rule and names `backward_minute_resets_remainder`. Findings: none.

## 5. Merge with origin/main

```text
git fetch origin
FETCH_EXIT:0
git merge-base origin/main HEAD
a1e879a5002f3af855849a30aac5dee463ca393e
git rev-parse origin/main
9bcce830b4fb6eae3356672fe8fdd4699ce9ff22
git merge-tree --write-tree origin/main HEAD
75f3f954396b13c3b2a69ab057c71f69fd404d6d
MERGE_TREE_EXIT:0
```

`HEAD` at this command was `08bd54f7989376c6b9bdcb2924569dfb509926b4`. Merge-base is unchanged from the earlier review. `origin/main` has moved to `9bcce830`. The merge-tree write exits 0.

Findings: none.

## Findings

None. No BLOCKER. No MAJOR. No MINOR.

VERDICT: CLEAN PASS
