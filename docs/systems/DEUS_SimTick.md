# DEUS_SimTick: the shared simulation tick

**Owner:** Claude Code · **WBS:** SIM.00.02a (lane-dm, 2026-10-01) · **Files:** `game/js/sim/host/tick.js` (the clock), `game/js/plugins/DEUS_World.js` (the host: `UF.Sim.onTick`, `tickCount`, `tickStats`), `tools/test_sim_tick.js` (checks)

## 1. Purpose

One integer tick that water and collapse (and later the spawner and the world budget) run on. It follows ADR-003 §3: **1 tick = 36 game-seconds, 100 ticks = 1 game hour**, and an integer tick count is the only sim clock. The tick is derived from the **absolute game minute** of DEUS_Core's calendar, not from counting events or frames:

- It moves only when DEUS_Core emits `time:minute`. There is no frame hook (DEC-070), so a frame where no game minute passes costs nothing.
- Paused time (`$ufTime.isPaused`, DEUS_TimeSpeed's Space) emits no minute, so zero ticks run.
- TimeSpeed (DEUS_Core's `TimeSpeed` parameter, DEUS_TimeSpeed's ×2..×32) changes how many game minutes pass per real second, so the tick rate follows it.
- One `time:minute` event can carry many minutes (`advanceMinute(6)` in history, `AddTime 60`): the elapsed time is read from the calendar, so it gives the same ticks as six one-minute events.
- A large jump is capped at 100 ticks per call; the rest is owed and paid on later minutes (Rule 14: no unbounded work in one call).
- History pre-simulation runs no ticks: the clock is armed only when `world:created` returns (after every handler, including History's).

ADR-003 §0 item 2 describes "a host accumulator once per displayed frame". This lane's brief settles it the other way (critic: elapsed time from the absolute minute; DEC-070: no per-frame work), and the brief records the PM's answer.

## 2. The clock (`game/js/sim/host/tick.js`)

Pure CommonJS, no host global, no IO, no randomness. Load it with `UF.Sim.require("host/tick")`.

| Export | What it does |
|---|---|
| `createTickClock({ secondsPerTick = 36, maxTicksPerAdvance = 100 })` | A new, unarmed clock. Both options are positive integers, else `E_TICK_CONFIG`. |
| `absoluteMinute(day, hour, minute)` | `(day - 1) * 1440 + hour * 60 + minute` (DEUS_Core's `day` starts at 1). A bad reading throws `E_TICK_MINUTE`. |
| `DEFAULTS`, `SAVE_VERSION` | `{ secondsPerTick: 36, maxTicksPerAdvance: 100 }`, `1`. |

A clock:

| Member | What it does |
|---|---|
| `arm(absMinute)` | Arms (or re-arms) at that minute: 0 ticks, 0 remainder, nothing owed. |
| `isArmed()` | |
| `advanceToMinute(absMinute)` | Returns the ticks to run now, 0..`maxTicksPerAdvance`. Elapsed seconds = `(absMinute - last) * 60 + remainder`; `floor(elapsed / 36)` ticks join the owed count, `elapsed % 36` is kept as the remainder, and the call pays `min(owed, cap)`. An earlier minute (SetTime backwards) moves the clock there, counts a rebase and runs no new ticks. Unarmed: 0. |
| `drain()` | Pays `min(owed, cap)` owed ticks without moving time. The host does not call it (owed ticks are paid on the next minutes); it is there for tools. |
| `tickCount()`, `owed()` | |
| `stats()` | A new object: `armed`, `secondsPerTick`, `maxTicksPerAdvance`, `originMinute`, `lastMinute`, `remainderSeconds`, `owed`, `ticks`, `advances`, `catchUps` (calls that left ticks owed), `rebases`. |
| `serialize()` / `restore(data)` | Plain JSON `{ v: 1, secondsPerTick, armed, origin, last, remainder, owed, ticks, advances, catchUps, rebases }` and back, exactly. `restore` refuses another version, another `secondsPerTick` or a bad field (`E_TICK_SAVE`). |

Every number is a safe integer; an advance that would overflow throws `E_TICK_RANGE`. Invariant while armed: `ticks + owed === floor((lastMinute - originMinute) * 60 / 36)` when no rebase happened.

## 3. The host (`UF.Sim`, in DEUS_World.js)

| Member | What it does |
|---|---|
| `UF.Sim.onTick(name, order, fn)` | `fn(tick)` on every tick, `tick` being the tick number (1 for the first tick after arming). Handlers run in ascending `order`, then by `name` (code-unit order). `name` is a non-empty unique string (a duplicate throws `Error`), `order` a finite number, `fn` a function (else `TypeError`). Timer domain `"action"` (Rule 14). Register at plugin load; registrations survive New Game and Load. |
| `UF.Sim.tickCount()` | Ticks run since the live world's clock was armed; 0 with no world. |
| `UF.Sim.tickStats()` | A new object: the clock's `stats()` plus `domain: "action"` and `handlers` (names in run order). With no world: zeros and `armed: false`. |

Wiring:

- `time:minute` → read `$ufTime` (day, hour, minute) → `advanceToMinute` → run that many ticks through the handlers. A handler that moves the calendar does not re-enter; the minute is picked up on the next event.
- No calendar (no `$ufTime`, or a `$ufTime` whose `day`, `hour` and `minute` are not all numbers, as the `{ year: 1 }` stub many vm harnesses use): the clock arms at minute 0 and minutes are ignored. A calendar with numbers that are not a reading (a negative minute) throws `E_TICK_MINUTE`, which `UF.Events` logs.
- `World.newWorld` disarms the clock before `world:initializing`, and arms it at the calendar minute right after `emit("world:created")` returns.
- `DataManager.createGameObjects` (New Game, Load) disarms it.
- Save: `makeSaveContents` writes `simClock.serialize()` to `UF.World.state.simTick` (so it is saved with the world, `contents.ufWorld`). Between saves `state.simTick` is the last saved copy, not the live clock: read `UF.Sim.tickStats()`.
- Load: `extractSaveContents` restores the clock from `state.simTick`. A save from before SIM.00.02a (no `simTick`) arms the clock at the loaded calendar minute.

Not in this slice: the SIM.00.02 kernel, subscribers (DEUS_Fluid on the tick is lane-ec, DEUS_Structural lane-es, the world budget lane-ej) and render timing.

## 4. Events

Listens to `time:minute` (DEUS_Core). Emits none.

## 5. Save data

`UF.World.state.simTick` (see §2 `serialize`).

## 6. Checks (`node tools/test_sim_tick.js`)

| Check | Proves |
|---|---|
| `tick_from_game_minutes` | Three 1-minute advances give 1, 3, 5 ticks with 0 remainder (pure clock: 1, 2, 2) |
| `multi_minute_advance` | `advanceMinute(6)` (one event) gives exactly 10 ticks; `AddTime 6` 10 more |
| `history_does_not_tick` | A year-3 New Game in the vm (the New Game plugins of `test_new_game_year0.js`), with `iterateWorldHistory(state, 3)` also run inside `world:created`: time:minute events fire during `world:created`, the tick count is 0 and the clock unarmed at its end, 0 when `newWorld` returns, and the clock is live afterwards |
| `bulk_advance_bounded` | `advanceMinute(1440)`: at most 100 ticks in that call; after draining, 2,400 ticks from it (pure clock: 100 + 23 drains of 100) |
| `paused_zero` | 600 paused Scene_Map frames: no tick, no minute, no advance |
| `speed_scales` | 600 frames at TimeSpeed 1/6 s and 0.05 s: 60 vs 200 minutes, 100 vs 333 ticks, each exactly `floor(minutes * 60 / 36)` |
| `handlers_ordered` | Run order (order, name), argument checks, `tickStats().handlers`, domain |
| `save_resume_exact` | A save with a remainder and owed ticks loads into a fresh runtime with the same stats, and both runs stay identical; a save without `simTick` arms at its minute |
| `no_frame_hook` | Over 600 running frames, one clock advance per time:minute event; none over 300 paused frames |
| `calendar_stub` | DEUS_World alone with `$ufTime = { year: 1 }`: `newWorld` runs, the clock arms at minute 0 with 0 ticks |
| `nwjs_new_game` | A snapshot of `game/` in NW.js (Year 0 New Game, `TEST_SimTickSuite`): ticks rise at ×1, one advance per minute event, no tick while paused, `AddTime 60` adds 100, 2 s at ×4 runs more game minutes than 2 s at ×1 with exactly `floor((remainder + 60 × minutes) / 36)` ticks in each, ticks + owed match the elapsed minutes, no console errors, screenshot `sim_tick.map.png` |

Mutants (in memory; each must turn its check red): `frame_hook` → `no_frame_hook`, `drop_remainder` → `tick_from_game_minutes`, `unsaved_accumulator` → `save_resume_exact`, `count_events` → `multi_minute_advance`, `uncapped_catchup` → `bulk_advance_bounded`, and four more for the checks those leave unguarded: `arm_early` → `history_does_not_tick`, `frame_rate_ticks` → `paused_zero` and `speed_scales`, `calendar_required` → `calendar_stub`, `unordered_handlers` → `handlers_ordered`. The default run runs every check and every mutant; `--mutant=<name>` runs the headless checks under one mutant, `--no-nw` skips NW.js, `--save-evidence` copies the NW.js results and screenshot into `tasks/SIM.00.02a/lane-dm/evidence/`.

## 7. Status

Built 2026-10-01 on `task/lane-dm` (base `030a8cc6`, main `a1e879a5`). Not run in the editor's Playtest F5 (the editor stays closed, DEC-059); the in-game evidence is the NW.js snapshot run above.

Known limits:
- The shipped New Game builds history through the demographics path, which moves no calendar minute. `iterateWorldHistory` (DEUS_History.js:3491) is reached only on the founders path, and at `a1e879a5` it throws `ReferenceError: WORK_BEATS_PER_SHARED is not defined` (DEUS_History.js:2591) after 60 steps. `history_does_not_tick` runs it anyway for the minutes it moves before that.
- `no_frame_hook` headless drives only `Scene_Map.prototype.update`; a hook on another frame path is caught by the NW.js check `advances_only_on_minutes`.
- A handler that throws ends that minute's batch: `UF.Events` logs the error to the console, and the ticks the clock already handed out for that minute are not run again.
- In NW.js on 2026-10-01, a 2 s window ran 98 game updates at ×1 and 144 at ×4 (the `speed_scales` detail): ×4 is frame-bound on this machine, so the in-game check asserts more minutes at ×4 and exact ticks per minute, not a 4× rate.
- `SetTime` to an earlier hour re-bases the clock (no ticks for the jump back); `SetTime` forward is caught up on the next minute, capped like any jump.
