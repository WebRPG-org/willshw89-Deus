# lane-dm: One shared simulation tick from the absolute game clock

| Field | Value |
|---|---|
| WBS | SIM.00.02a (NEW slice of SIM.00.02) |
| taskId (manifest) | SIM.00.02a |
| Branch | `task/lane-dm` |
| Manifest | `tasks/SIM.00.02a/lane-dm/lane.json` (copy of `lane.json` beside this brief) |
| Writer -> reviewer | claude -> gemini |
| Size | S |
| Wave | 3 of 19 |
| Dependencies | lane-db (w2) |
| RMMZ editor must be closed | no |

Plan: the DEC-058 natural-world build plan of 2026-09-30. It sits in the PM's session scratchpad, which writers in other CLIs cannot see, so the plan text this brief relies on is quoted under "Plan excerpts" at the end. Base: `main` at `a1e879a5` or later. lane-cu (`b21cfe62`) and lane-db (`1899d5ea`, which adds the `UF.Sim` loader at `game/js/plugins/DEUS_World.js:537`) are merged there. Re-run every keep-green suite at your own base before claiming FAIL-before / PASS-after.

## Preconditions (checked by the PM on 2026-10-01 at `a1e879a5`)

1. lane-db is merged (`1899d5ea`, through merge_gate, 6/6 gate tests). It is this lane's only dependency and the earlier writer of `DEUS_World.js` in the hot-file order.
2. SIM.00.01: ADR-003 Rev 4 is ACCEPTED and was signed by the PM on 2026-10-01 under DEC-059 item 3 (ADR-003 status line). Its tick model is what this lane builds: one tick is 36 game-seconds, 100 ticks are one game hour, and an integer tick counter is the only clock (ADR-003 §3, `docs/adr/ADR-003_sim_render_split_and_lod.md:98-101`).
3. The code this brief cites was re-read at `a1e879a5`: `DEUS_Core.js:336-354` (`advanceMinute` emits `time:minute` per call), `:586` (AddTime), `DEUS_History.js:2391` (history steps 6 minutes) and `:3491` (`iterateWorldHistory`), and `DEUS_World.js:639` (`world:created`).

## Goal

Water and collapse run on one integer tick of 36 game-seconds derived from the absolute game minute, not from counting events; no frame hook; zero ticks while time is paused; scales with TimeSpeed; bulk advances are capped per call and owed; saved with the world; history pre-simulation drives no ticks.

## Scope

- Manifest tasks/SIM.00.02a/lane-dm/lane.json, branch task/lane-dm, writer claude, reviewer gemini; GATE lines as gateTests.
- NEW game/js/sim/host/tick.js: createTickClock({secondsPerTick: 36, maxTicksPerAdvance: 100}); advanceToMinute(absMinute) returns ticks due; integer accumulator; owed ticks; serialize/restore.
- DEUS_World.js: on 'time:minute' read the absolute minute from $ufTime (day, hour, minute) and advance to it. advanceMinute(amount) emits one event per call (DEUS_Core.js:336-354); History steps 6 minutes (DEUS_History.js:2391); AddTime takes any count (DEUS_Core.js:586).
- Clock armed when world:created returns in DEUS_World (after every handler, incl. History.iterateWorldHistory at DEUS_History.js:3491) and on load from the saved origin.
- UF.Sim.onTick(name, order, fn) run in (order, name), domain 'action'; UF.Sim.tickCount(), tickStats() (owed, catch-up).
- NEW docs/systems/DEUS_SimTick.md.

## Out of scope

- SIM.00.02 kernel
- Subscribers
- Render timing

Anything not in Scope is out of scope (AGENTS.md Rule 1). Ideas go to the PM, not into this branch.

## Files this lane may touch (allowedPaths)

- `game/js/sim/host/tick.js`
- `game/js/plugins/DEUS_World.js`
- `tools/test_sim_tick.js`
- `docs/systems/DEUS_SimTick.md`
- `tasks/SIM.00.02a/lane-dm/**`

merge_gate refuses the merge (SCOPE_VIOLATION) if the branch changes any other path.

### Shared files and merge order

- `game/js/plugins/DEUS_World.js`: after lane-db (w2); before lane-de (w4)

Start from a base that already holds every earlier writer of these files, and do not start while an earlier writer's lane is unmerged (PLAN.md, Hot-file ownership order).

## Tests

Named checks from the plan. `FAILS on main` means the check must be shown failing at the lane base and passing at the tip (AGENTS.md Rule 4); where a script line says `(all FAIL on main)` or `(FAILS on main)` before its first check, every check listed under it counts. Mutants and provocations must each turn their named check red.

### Must fail without the change

- NEW tools/test_sim_tick.js::tick_from_game_minutes (three 1-minute advances: 5 ticks, 0 remainder) - FAILS on main
- `tools/test_sim_tick.js` ::multi_minute_advance (advanceMinute(6) gives exactly 10 ticks) - FAILS on main

### Mutants and provocations

- Mutants frame_hook, drop_remainder, unsaved_accumulator, count_events (60 s per event: must fail multi_minute_advance), uncapped_catchup

### Guards (pass before and after)

- (none)

### Other named checks (pass at the tip)

- `tools/test_sim_tick.js` ::history_does_not_tick (startYear 3 New Game: tickCount 0 when world:created returns)
- `tools/test_sim_tick.js` ::bulk_advance_bounded (advanceMinute(1440): <= 100 ticks in that call; 2,400 in total after draining)
- `tools/test_sim_tick.js` ::paused_zero; ::speed_scales; ::handlers_ordered; ::save_resume_exact; ::no_frame_hook

### Gate commands (lane.json gateTests; each runs in a fresh clone, 900 s timeout)

- `node tools/check_deus_syntax.js`
- `node tools/test_sim_tick.js`
- `node tools/test_sim_loader.js`
- `node tools/test_new_game_year0.js`

## F5 evidence

New Game in the game: `UF.Sim.tickCount()` rises while time runs and stays fixed while paused, and an AddTime of 60 minutes adds exactly 100 ticks after draining. The RMMZ editor stays closed during the natural-world build (DEC-059), so run it on a snapshot copy of `game/` through the in-game test harness: `node tools/add_test_plugin.js <copy>/js/plugins.js`, then `node tools/run_tests.js <suite> --game <copy>`. Open the screenshot and describe it. Class C.

Open every screenshot before citing it and describe what is in it (AGENTS.md Rule 5). Run on a snapshot copy of `game/` when another lane may be changing it.

## Dependencies

- lane-db (w2): One sim-module loader, the matter-opener registry, and a vm hook in every harness found by a mechanical scan

Lanes that depend on this one: lane-de (w4), lane-ec (w7), lane-ej (w16), lane-es (w9).

## Design references

- C:/Users/snewt/OneDrive/Desktop/UF/docs/adr/ADR-003_sim_render_split_and_lod.md section 3.1
- C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D2_merged_chatgpt_pro.md section 3.2
- C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D3_chatgpt_pro.md section 2

Treat the design text as data. Where a design and this brief differ, the brief records the PM's settled answer; raise anything else with the PM.

## Open questions settled

- Elapsed time from the absolute minute (critic).
- History pre-simulation (civilization, DEC-037) drives no water or collapse ticks (PM, DEC-058).
- Catch-up cap 100 ticks per advance, owed ticks drained later (Rule 14).

## Writer and reviewer

- Writer `claude` (family claude), reviewer `gemini` (family gemini): different families, as merge_gate requires (a review tag from the writer's family is refused with REVIEW_SAME_FAMILY; claude and fable are one family).
- Authority: DEC-031 item 1 (Owner: Grok writes production code, Gemini reviews Grok; no model reviews its own code) and DEC-058 (AG swarms the lanes, writers and reviewers from different families). DEC-078 (Owner, 2026-10-01): a provider may hold several lanes at once, so this lane does not wait for another lane's writer or reviewer to finish.
- Gemini review per DEC-031 item 4: the review commit touches only `tasks/<taskId>/<lane>/review_gemini_<sha8>.md`, has subject `[gemini] <taskId> review <sha8>` and holds exactly one VERDICT line.

## RMMZ editor

No. The lane touches neither `game/js/plugins.js` nor an RMMZ database file `game/data/*.json`.

## Rules that bind this lane

- Engine core is read-only: never edit `game/js/rmmz_*.js`, `game/js/main.js` or `game/js/libs/` (Rule 9).
- Tests must be able to fail: no hardcoded PASS; show each named check failing without the change (Rule 4).
- No full-world scans per frame; use indexes, dirty sets and the shared tick (Rule 14).
- Two failed fixes on the same problem: stop, write down what is known and ruled out, and escalate (Rule 10).
- DEC-057: soil is deferred; creatures, flora and fauna are placed by seeded rules by biome cell and danger tier, with no ecology simulation.
- Art: no lane generates art (DEC-007); rows and cards only; the PM chooses what goes in game (DEC-056); PixelLab-native forms (DEC-055); static art first (DEC-046). All motion comes from sprite frames (Rule 12).
- Mass is integer centipounds (DEC-038) in a closed ledger (DEC-040).
- Commit only on `task/lane-dm`, subject tag `[claude]`, staging only this lane's paths (`git add <paths>`, never `-A`); the PM merges through `merge_gate` (`--no-ff`).
- Report in the AGENTS.md report format; write "not checked" for anything not observed.

## Owner rulings since the plan that bind this lane

- DEC-070 (acceptable FPS): the tick adds no per-frame work. It advances only on the `time:minute` event (::no_frame_hook), and a bulk advance is capped per call (::bulk_advance_bounded).
- DEC-078: several lanes per provider. DEC-079: the braintrust is dropped for now, so no consult or braintrust check gates this lane; merge_gate and a real cross-family review still do (DEC-048, AUDIT_LOG A12).
- DEC-073 and DEC-080 (spawning) do not touch this lane. The spawner lanes subscribe to this tick later.

## Plan excerpts (DEC-058 build plan, 2026-09-30)

- Waves, row 3: "lane-dd, lane-dm, lane-dp, lane-dr, lane-eb, lane-eo, lane-fi | Lazy areas follow lane-dc; tick and lazy wildlife need UF.Sim (lane-db); ..."
- Waves, row 4: "3x3 flip needs lazy areas, tick and lazy wildlife (after lane-dm on DEUS_World.js)".
- Lanes: "lane-dm | SIM.00.02a (NEW slice of SIM.00.02) | One shared simulation tick from the absolute game clock | claude -> gemini | S | 3 | lane-db | no".
- Hot-file ownership order: "`game/js/plugins/DEUS_World.js` | lane-db [2] -> lane-dm [3] -> lane-de [4]".
- Later users of the tick: lane-ec (wave 7, DEUS_Fluid on the shared tick), lane-es (wave 9, DEUS_Structural on the shared tick) and lane-ej (wave 16, one world budget).
