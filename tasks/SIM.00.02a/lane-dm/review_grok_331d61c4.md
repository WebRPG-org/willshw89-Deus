# SIM.00.02a lane-dm review (grok)

Target: `331d61c43d61e454d6436e45a32ef1e00e9804ee`
Branch: `task/lane-dm`
Range: `git log origin/main..331d61c43d61e454d6436e45a32ef1e00e9804ee`
Reviewer: grok. Writer family: claude.
Merge-base with `origin/main` at review time: `a1e879a5002f3af855849a30aac5dee463ca393e` (unchanged by `git fetch origin`).

Commits in range:

- `ef4d0333` code and tests (deus-claude)
- `862c3714` test source read as LF (deus-claude); `git show --stat` is only `tools/test_sim_tick.js`
- `d8ff27cd` evidence and `REPORT.md` (deus-claude)
- `bda69d18` one-line `review_gemini_d8ff27cd.md` (`VERDICT: PASS`, no hash, no checks). Set aside by the PM. Not treated as a review.
- `331d61c4` manifest reviewer gemini to grok, plus the brief note (PM)

`git diff --name-only ef4d0333 HEAD -- game/js docs/systems tools/test_sim_tick.js` is only `tools/test_sim_tick.js`. The game clock at the tip is the `ef4d0333` clock.

## 1. Scope

Command: `git diff --name-status (git merge-base origin/main HEAD) HEAD`

```text
A	docs/systems/DEUS_SimTick.md
M	game/js/plugins/DEUS_World.js
A	game/js/sim/host/tick.js
A	tasks/SIM.00.02a/lane-dm/BRIEF.md
A	tasks/SIM.00.02a/lane-dm/REPORT.md
A	tasks/SIM.00.02a/lane-dm/evidence/check_deus_syntax_tip.txt
A	tasks/SIM.00.02a/lane-dm/evidence/fail_before_at_cd7fe1a4.txt
A	tasks/SIM.00.02a/lane-dm/evidence/nwjs_results.txt
A	tasks/SIM.00.02a/lane-dm/evidence/sim_tick.map.png
A	tasks/SIM.00.02a/lane-dm/evidence/test_new_game_year0_tip.txt
A	tasks/SIM.00.02a/lane-dm/evidence/test_sim_loader_tip.txt
A	tasks/SIM.00.02a/lane-dm/evidence/test_sim_tick_tip.txt
A	tasks/SIM.00.02a/lane-dm/lane.json
A	tasks/SIM.00.02a/lane-dm/launches/20261001_151024_prompt.txt
A	tasks/SIM.00.02a/lane-dm/launches/20261001_161109_prompt.txt
A	tasks/SIM.00.02a/lane-dm/launches/20261001_171035_prompt.txt
A	tasks/SIM.00.02a/lane-dm/review_gemini_d8ff27cd.md
A	tools/test_sim_tick.js
```

Every path is in `lane.json` `allowedPaths` (`game/js/sim/host/tick.js`, `game/js/plugins/DEUS_World.js`, `tools/test_sim_tick.js`, `docs/systems/DEUS_SimTick.md`, `tasks/SIM.00.02a/lane-dm/**`). Re-checked after `git fetch origin`; the name-status list was the same. Findings: none.

## 2. Tests

Run from this worktree, one command at a time. `EXIT_CODE` is `$LASTEXITCODE` immediately after that `node` process.

### Gate tests

`node tools/check_deus_syntax.js`

```text
Checked 62 DEUS plugin files. Errors: 0
EXIT_CODE:0
```

`node tools/test_sim_tick.js`

```text
PASS tick_from_game_minutes - pure clock: minutes 1,2,3 -> 1, 2, 2 ticks (remainder 0 s); game: tickCount 0 at world start, after each advanceMinute(1): 1, 3, 5 (expected 1, 3, 5), remainder 0 s, owed 0; console errors 0
PASS multi_minute_advance - advanceMinute(6): 10 ticks from 1 time:minute event (expected 10 from 1); then AddTime 6 (plugin command): 20 (expected 20); remainder 0 s, owed 0
PASS history_does_not_tick - year-3 New Game (history years 3): 0 time:minute events from the demographics history, 60 in all during world:created with iterateWorldHistory(state, 3) (stopped by ReferenceError: WORK_BEATS_PER_SHARED is not defined); tickCount 0 and armed false at the end of world:created, 0 when newWorld returned (armed true at minute 840, calendar minute 840, owed 0); advanceMinute(6) afterwards -> 10 (expected 10); 0 console errors; 5682 ms
PASS bulk_advance_bounded - pure clock: advanceToMinute(1440) -> 100, then 23 drains of at most 100: 2400 in total (expected 2400), owed 0; game: advanceMinute(1440) ran 100 ticks in that call, owed 2300; drained over 24 more minutes (largest step 100): 2440 ticks = 2400 from the bulk advance + 40 from those minutes; catch-ups 24
PASS paused_zero - 60 running frames: 10 ticks; 600 paused frames: ticks 10 -> 10, calendar minute 486 -> 486, advances 6 -> 6; 600 running frames after: 110 ticks over 66 game minutes (expected 110)
PASS speed_scales - 600 frames at the default TimeSpeed (1/6 s per game minute): 60 minutes, 100 ticks (expected 100); at TimeSpeed 0.05: 200 minutes, 333 ticks (expected 333)
PASS handlers_ordered - registered b(10) a(10) c(-5) d(2.5); 5 ticks ran: c1 d1 a1 b1 c2 d2 a2 b2 c3 d3 a3 b3 c4 d4 a4 b4 c5 d5 a5 b5; duplicate "a": UF.Sim.onTick: "a" is already registered; order NaN: TypeError; no fn: TypeError; empty name: TypeError; tickStats().handlers c,d,a,b, domain action
PASS save_resume_exact - saved ufWorld.simTick {"v":1,"secondsPerTick":36,"armed":true,"origin":480,"last":1921,"remainder":24,"owed":2300,"ticks":101,"advances":2,"catchUps":1,"rebases":0}; loaded clock equals the saved one: true; after 30 x 1 min, 7 min and AddTime 50 in both: original 2546 ticks/0 owed/24 s, loaded 2546/0/24 s; loaded ticks+owed = floor(elapsed/36 s): true; a save without simTick arms at its minute 1921: true
PASS no_frame_hook - 600 running Scene_Map frames: 60 time:minute events, 60 clock advances (expected one per event); 300 paused frames: 0 advances (expected 0)
PASS calendar_stub - DEUS_World alone with $ufTime = { year: 1 }: newWorld ran; armed true at minute 0, 0 ticks
PASS nwjs_new_game - run_tests exit 0; 8 sim_tick PASS lines; no FAIL/ERROR lines
      PASS sim_tick.uf_sim_tick_present - UF.Sim.tickCount / tickStats from DEUS_World.js
      PASS sim_tick.ticks_rise_while_running - 180 frames at x1: tickCount 10 -> 40, game minute 486 -> 504
      PASS sim_tick.advances_only_on_minutes - 18 time:minute events, 18 clock advances (no frame hook: one per event)
      PASS sim_tick.ticks_fixed_while_paused - 180 paused frames: tickCount 40 -> 40, game minute 504 -> 504, advances 24 -> 24
      PASS sim_tick.addtime_60_adds_100 - paused, AddTime 60 (plugin command): tickCount 40 -> 140, owed 0 -> 0
      PASS sim_tick.speed_scales - 2 s at x1: 81 game updates, 8 min, 13 ticks (expected 13); 2 s at x4: 116 game updates, 12 min, 20 ticks (expected 20)
      PASS sim_tick.ticks_match_elapsed - ticks 173 + owed 0 over 104 game minutes since minute 480
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
RESULT: 20 passed, 0 failed
EXIT_CODE:0
```

`node tools/test_sim_loader.js`

```text
PASS vm_loader_loads_ledger - resolve("ledger") = C:\Users\snewt\.deus_worktrees\lane-dm\game\js\sim\ledger.js; exports createLedger: function; same object as Node's require: true; resolve("hydro") = C:\Users\snewt\.deus_worktrees\lane-dm\game\js\sim\hydro\index.js; sandbox require left alone: true
PASS missing_module_throws - threw DEUS_SIM_MODULE_MISSING: UF.Sim.require("no_such_module_wg0044"): no such sim module; tried C:\Users\snewt\.deus_worktrees\lane-dm\game\js\sim\no_such_module_wg0044.js, C:\Users\snewt\.deus_worktrees\lane-dm\game\js\sim\no_such_module_wg0044\index.js, C:\Users\snewt\.deus_worktrees\lane-dm\game\game\js\sim\no_such_module_wg0044.js, C:\Users\snewt\.deus_worktrees\lane-dm\game\game\js\sim\no_such_module_wg0044\index.js; "../plugins/DEUS_World" -> TypeError; no host -> UF.Sim.require("ledger"): no such sim module; tried nothing (no require in this host)
PASS every_vm_harness_installs_hook - 50 hits in 940 files; without the hook: none; planted harness found by the scan: true, refused: true; hooked fixture accepted: true
PASS scan_finds_known_harnesses - 50 hits; known hits missing: none; excluded files found: none; fixtures classified wrong: none
PASS opener_registry - order Air, core, water; duplicate "core": UF.Sim.registerMatterOpener: "core" is already registered; bad fn: TypeError; empty name: TypeError; registry after a caller emptied its copy: 3; UF.Levels at register: undefined
PASS grid_pinned_by_hook - fallback-3 fixture: {} -> 1x1, grid "shipped" -> 3x3, AreasX "2" -> 2x1, PluginManager set after install -> 1x1, legacy UF_World AreasX "4" -> 4x1; real DEUS_World.js -> 1x1; grid "3x3" refused: true
PASS nwjs_loader - run_tests exit 0; 5 sim_loader PASS lines; no FAIL/ERROR lines; log: 2026-10-01T22:42:19.305Z [SIM] UF.Sim.require("ledger") resolved C:\Users\snewt\AppData\Local\Temp\wg0044-nw-jA4kkq\game\js\sim\ledger.js; expected C:\Users\snewt\AppData\Local\Temp\wg0044-nw-jA4kkq\game\js\sim\ledger.js
RESULT: 7 passed, 0 failed
EXIT_CODE:0
```

`node tools/test_new_game_year0.js` (sections A–D all `[PASS]`, including 15 mutants caught)

```text
SETUP CONTRACT PASSED: 30 gating checks, 15 mutants caught (ATK-YEAR0-001 closure criterion).
INV-SIM-01 END-TO-END MET: clock, save and constructor all at year 0.
EXIT_CODE:0
```

Findings: none.

### Must fail without the change

Tip `tools/test_sim_tick.js` run in a temp tree whose `DEUS_World.js` is `git show a1e879a5:game/js/plugins/DEUS_World.js`, with `DEUS_Core.js` copied from this worktree (that file is not in the lane diff) and with `game/js/sim/host/tick.js` absent (`tick.js present: False`).

Command: `node tools/test_sim_tick.js --only=tick_from_game_minutes,multi_minute_advance --no-nw`

```text
FAIL tick_from_game_minutes - threw Error: Cannot find module 'C:\Users\snewt\AppData\Local\Temp\sim0002a-failbefore\game\js\sim\host\tick.js' | Require stack: | - C:\Users\snewt\AppData\Local\Temp\sim0002a-failbefore\tools\test_sim_tick.js
FAIL multi_minute_advance - UF.Sim.onTick / tickCount / tickStats missing after DEUS_World.js loads
RESULT: 0 passed, 2 failed
EXIT_CODE:1
```

Same two failures the checked-in `evidence/fail_before_at_cd7fe1a4.txt` records (`Cannot find module ... tick.js`, and `UF.Sim.onTick / tickCount / tickStats missing`). At the tip both checks pass (gate output above): three 1-minute steps give 1, 3, 5 ticks and remainder 0; `advanceMinute(6)` gives 10 ticks from one `time:minute`. Findings: none.

### Mutants and provocations

The brief names five mutants and no separate provocation. Each was run as `node tools/test_sim_tick.js --mutant=<name> --no-nw`. The harness exits 1 when every named check is red. The four extra mutants in the test file were run the same way.

| Mutant | Named check red | Exit |
|---|---|---|
| `frame_hook` | `no_frame_hook` — 600 frames: 60 minute events, 660 clock advances; 300 paused frames: 300 advances | 1 |
| `drop_remainder` | `tick_from_game_minutes` — minutes 1,2,3 give 1, 1, 1 ticks; game counts 1, 2, 3 (expected 1, 3, 5) | 1 |
| `unsaved_accumulator` | `save_resume_exact` — saved remainder 0 and owed 0; loaded clock does not equal the live one (2546 ticks / 24 s vs loaded 246 / 0 s) | 1 |
| `count_events` | `multi_minute_advance` — `advanceMinute(6)` gives 1 tick from 1 event (expected 10); AddTime 6 gives 3 (expected 20) | 1 |
| `uncapped_catchup` | `bulk_advance_bounded` — `advanceToMinute(1440)` returns 2400 in that call; game `advanceMinute(1440)` runs 2400 ticks, owed 0 | 1 |
| `arm_early` | `history_does_not_tick` — tickCount 600 and armed true at the end of `world:created` | 1 |
| `frame_rate_ticks` | `paused_zero` (600 paused frames: ticks 10 to 110) and `speed_scales` (x4 stays at 100 ticks) | 1 |
| `calendar_required` | `calendar_stub` — `newWorld` throws `absoluteMinute: day undefined...` | 1 |
| `unordered_handlers` | `handlers_ordered` — run order `b1 a1 c1 d1 ...`, handlers `b,a,c,d` | 1 |

Quoted results:

```text
===== MUTANT frame_hook =====
FAIL no_frame_hook - 600 running Scene_Map frames: 60 time:minute events, 660 clock advances (expected one per event); 300 paused frames: 300 advances (expected 0)
RESULT: 8 passed, 2 failed; named check red: no_frame_hook
EXIT_CODE:1
===== MUTANT drop_remainder =====
FAIL tick_from_game_minutes - pure clock: minutes 1,2,3 -> 1, 1, 1 ticks (remainder 0 s); game: tickCount 0 at world start, after each advanceMinute(1): 1, 2, 3 (expected 1, 3, 5), remainder 0 s, owed 0; console errors 0
RESULT: 5 passed, 5 failed; named check red: tick_from_game_minutes
EXIT_CODE:1
===== MUTANT unsaved_accumulator =====
FAIL save_resume_exact - saved ufWorld.simTick {"v":1,"secondsPerTick":36,"armed":true,"origin":480,"last":1921,"remainder":0,"owed":0,"ticks":101,"advances":2,"catchUps":1,"rebases":0}; loaded clock equals the saved one: false; after 30 x 1 min, 7 min and AddTime 50 in both: original 2546 ticks/0 owed/24 s, loaded 246/0/0 s; loaded ticks+owed = floor(elapsed/36 s): false; a save without simTick arms at its minute 1921: true
RESULT: 9 passed, 1 failed; named check red: save_resume_exact
EXIT_CODE:1
===== MUTANT count_events =====
FAIL multi_minute_advance - advanceMinute(6): 1 ticks from 1 time:minute event (expected 10 from 1); then AddTime 6 (plugin command): 3 (expected 20); remainder 12 s, owed 0
RESULT: 5 passed, 5 failed; named check red: multi_minute_advance
EXIT_CODE:1
===== MUTANT uncapped_catchup =====
FAIL bulk_advance_bounded - pure clock: advanceToMinute(1440) -> 2400, then 0 drains of at most 0: 2400 in total (expected 2400), owed 0; game: advanceMinute(1440) ran 2400 ticks in that call, owed 0; drained over 0 more minutes (largest step 2400): 2400 ticks = 2400 from the bulk advance + 0 from those minutes; catch-ups 0
RESULT: 9 passed, 1 failed; named check red: bulk_advance_bounded
EXIT_CODE:1
```

Findings: none. Each named check goes red for the reason the brief names (60 s per event fails `multi_minute_advance`; dropping the remainder fails the 5-tick count; an unsaved remainder/owed count fails the exact resume; an uncapped catch-up hands out 2400 ticks in one call; a frame hook advances on paused frames).

### Guards

The brief lists `(none)`. No guard command was run. Findings: none.

## 3. Code reading

The tick is the absolute game minute, not an event count.

`absoluteMinute` is `(day - 1) * 1440 + hour * 60 + minute` (`game/js/sim/host/tick.js`). `onSimMinute` reads `$ufTime.day/hour/minute` and calls `advanceToMinute` (`DEUS_World.js`). Elapsed seconds are `(absMinute - last) * 60 + remainder`, whole ticks are `floor(seconds / 36)`, and the leftover is `seconds % 36`. Three 1-minute steps are 60, 84, 72 seconds: 1 + 2 + 2 ticks and remainder 0, which the passing `tick_from_game_minutes` line shows. `advanceMinute(6)` emits one `time:minute` (`DEUS_Core.js` `advanceMinute` emits once per call) and the clock still sees a 6-minute jump: 10 ticks. The `count_events` mutant, which advances `lastMinute + 1` per event, fails that check. Forward time uses integer seconds. It does not drift against the calendar: `paused_zero` and `speed_scales` both require `ticks === floor(minutes * 60 / 36)`.

Pause and speed. `Game_UFTime.update` returns immediately when `isPaused` is set, so no `time:minute` and no tick. `no_frame_hook` recorded 60 advances for 60 minute events over 600 frames, and 0 advances over 300 paused frames. There is no `Scene_Map` hook in the lane diff. TimeSpeed only changes how often Core emits minutes; the tick follows those minutes (60 min / 100 ticks at the default, 200 min / 333 ticks at 0.05).

Catch-up cap. `payOwed` hands out `min(owed, maxTicksPerAdvance)` with the cap at 100. `advanceMinute(1440)` ran 100 ticks and left 2300 owed; the pure clock drained to 2400. `runSimTicks` walks the handler list only, once per handed-out tick. The diff adds no walk of units, areas, or objects, and nothing on `Game_Map.update` / `Scene_Map.update`. Rule 14's per-frame full-world scan is not in this change.

Ordering. `UF.Events.emit` is synchronous and in registration order (`DEUS_Core.js`). `DEUS_World` subscribes to `time:minute` at plugin load. `onTick` sorts by `(order, name)` and `tickStats().domain` is `"action"`. `handlers_ordered` ran `c, d, a, b`. `newWorld` sets `simClock = null` before `emit("world:created")` and calls `armSimClock()` after that emit returns, so history inside the emit (including `iterateWorldHistory`) sees an unarmed clock. `history_does_not_tick`: tickCount 0 and armed false when `world:created` returns, armed at minute 840 afterwards, then `advanceMinute(6)` gives 10. The `arm_early` mutant (arm before the emit) makes that check red at 600 ticks. A handler that moves the calendar during `runSimTicks` is ignored while `simTicking` is set; the next minute event reads the absolute minute and catches up. That does not double-count.

Load does not double-count. `DataManager.loadGame` calls `createGameObjects` then `extractSaveContents` (`game/js/rmmz_managers.js`). `createGameObjects` sets `simClock = null`. World's `extractSaveContents` runs after Core's wrapper has restored `$ufTime`, then `restore`s `state.simTick` or, if the save has none, `armSimClock()` at that minute. `serialize` stores remainder, owed, ticks, and `last`. Probe on the tip clock (`createTickClock`, arm 480, `advanceToMinute(481)`, `restore` of that save):

```text
before save: ticks 1, rem 24, last 481
at load:    ticks 1, rem 24, owed 0, last 481
same minute advanceToMinute(481): returned 0; ticks 1, rem 24, last 481
next minute advanceToMinute(482): returned 2; ticks 3, rem 12, last 482
```

The same minute pays nothing. The next minute adds `60 + 24` seconds (2 ticks, remainder 12), which is the same step a live clock takes. `save_resume_exact` matches this with a remainder of 24 s and 2300 owed ticks: loaded stats equal the saved clock, and both sides stay identical after 30 one-minute steps, a 7-minute step, and AddTime 50 (2546 / 0 / 24 s). A save with no `simTick` arms at the loaded minute with 0 ticks.

`history_does_not_tick` still stops `iterateWorldHistory(state, 3)` with `ReferenceError: WORK_BEATS_PER_SHARED is not defined`. That name is in `DEUS_History.js`, which this diff does not touch, and the check's own condition holds (0 ticks, unarmed, at the post-history minute). Noted, not graded.

### MINOR — a backward minute keeps the old remainder

`advanceToMinute`, when `absMinute < last`, sets `last` to that minute, counts a rebase, and returns `payOwed()` without touching `remainder` (`game/js/sim/host/tick.js`). The following forward minute adds `60 +` that leftover. Probe:

```text
arm(480); advanceToMinute(481) -> returned 1, rem 24, ticks 1
advanceToMinute(61)            -> returned 0, rem 24, last 61, ticks 1, rebases 1
advanceToMinute(62)            -> returned 2, rem 12, ticks 3
fresh arm(61); advanceToMinute(62) -> returned 1, rem 24, ticks 1
```

The minute after the rebase emits 2 ticks. A clock armed on the new minute emits 1. The phase stays off by the old remainder (at most 35 game-seconds, one tick). `SetTime` writes hour and minute and does not emit `time:minute` (`DEUS_Core.js` `setTime`), so the host hits this path on the next minute, when the absolute minute is lower than `last`. Already-owed ticks are still paid on that call (`payOwed`), which matches the doc's "no new ticks" and not the function comment that says the call returns 0. Forward play, pause, speed, the 100-tick cap, history arming, and load do not take this path, and the doc already drops the tick invariant across a rebase. One extra tick after a backward `SetTime` is the whole effect.

## 4. Evidence

Files present under `tasks/SIM.00.02a/lane-dm/evidence/`:

- `check_deus_syntax_tip.txt` — `Checked 62 DEUS plugin files. Errors: 0` / `exit 0`. Matches `REPORT.md`.
- `test_sim_tick_tip.txt` — `RESULT: 20 passed, 0 failed` / `exit 0 (36 s)`, headed `cf5545cc`. The PASS lines `REPORT.md` quotes, including the abbreviated NW.js block (`ticks_fixed_while_paused` 40 to 40, `addtime_60_adds_100` 40 to 140), match this file. That file's NW.js window is 186 ticks over 112 minutes; the report says so by pointing at this file and treating the PNG as an earlier run.
- `test_sim_loader_tip.txt` — `RESULT: 7 passed, 0 failed` / `exit 0 (34 s)`. Matches the report.
- `test_new_game_year0_tip.txt` — `SETUP CONTRACT PASSED: 30 gating checks, 15 mutants caught` and `INV-SIM-01 END-TO-END MET` / `exit 0 (17 s)`. Matches the report.
- `fail_before_at_cd7fe1a4.txt` — `RESULT: 0 passed, 19 failed` / `exit 1`, with both must-fail checks red. Matches the report. Re-run above agrees on those two checks.
- `nwjs_results.txt` — `UF_Test run 2026-10-01T20:24:10.948Z`, 8 `PASS sim_tick.*` lines, `RESULT: 8 passed, 0 failed (exit 0)`, `ticks 171 + owed 0 over 103 game minutes since minute 480`.
- `sim_tick.map.png` — opened. It is the in-game map after the suite pauses for the shot: grass, the player sprite at the lower left, a red banner near the center, bushes, the minimap ("Explored: 3% (1793 cells)"), the speed box with 1.0x selected, and a PAUSED badge at the top right. The TEST_ window reads `UF.Sim.tickCount() = 171`, `owed 0, remainder 24 s, catch-ups 0, advances 44`, `game minute 583 (armed at 480), clock 09:43 day 1, paused`. 583 − 480 = 103 minutes; `103 * 60 / 36 = 171` ticks and 24 s (`6180 - 171 * 36 = 24`). Clock 09:43 on day 1 is minute 583. Advances 44 match that results file: 24 advances by the pause check (minute 504), one `AddTime 60`, then 8 minutes at x1 and 11 at x4 (`504 + 60 + 8 + 11 = 583`). The PNG and `nwjs_results.txt` are the 20:24Z run the report describes. The game files have not changed since `ef4d0333`. This review's own `nwjs_new_game` passed the same 8 checks on a different frame window (173 ticks, 104 minutes).

Findings: none.

## 5. Merge with origin/main

```text
git fetch origin
FETCH_EXIT:0
git merge-tree --write-tree origin/main HEAD
596d3918a6dbfbc18405be39db3a6a21a355f82a
MERGE_TREE_EXIT:0
```

Findings: none.

## Findings

1. MINOR — `game/js/sim/host/tick.js` `advanceToMinute`: a move to an earlier absolute minute keeps `remainder`, so the next forward minute can emit one extra tick (probe: 2 ticks versus 1 from a clock armed at the new minute). See section 3.

No BLOCKER. No MAJOR.

VERDICT: PASS WITH MINORS
