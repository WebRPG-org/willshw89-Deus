# WG.CELL-WRITE / lane-dd writer report

Starting SHA: `d8acc31026bce06556b4b6046bccad9ec7b263ff`. Branch `task/lane-dd`. Writer grok. Date of the runs: 2026-10-02. Machine: this lane worktree. The first implementation commit is `c1e8155245871dcdf4acf42012b6ad89efc75386`. This report's commit is the tip named at the end of the session.

## What changed

- `game/js/plugins/DEUS_Levels.js`: New Game generates the start area only. Any other area is generated once, by the first `baseline` request that needs its floor. `viewLevel()` does not gate that. Generator 5 still builds one area's 32 levels in one `volumeOf` pass. Core entries gain `areaSums` (`"ax,ay"` to 8 hex digits) the first time that area is seen in a world state. A later request compares the saved sum and does not replace it. `levels:areaGenerated` `{ ax, ay, gen }` fires once per world state and area. A load queues those events until `DataManager.extractSaveContents` has restored `World.state`, then flushes them once in `(ay, ax)` order. The hold starts before the previous wrapper, so an inner wrapper (lane-dv's matter host) still runs before the flush. A one-area world still writes the string `checksum`. A multi-area world's `checksum` stays null. `verifyLevels` skips a null checksum, so a new multi-area load does not walk the grid. A multi-area save that still has string checksums and no `areaSums` is migrated only after those strings verify (`migrations` rule `WG.00.46`). `stats().areaGenerations` records `{ ax, ay, gen, ms }`. `traceAreaRequests` is off unless a caller turns it on. `five_levels` and `complete_at_start` use the viewed area's sum on a multi-area world and do not require every area at New Game.
- `tools/test_lazy_area_generation.js`: the checks named in the brief, including `offscreen_request_generates_area`. `--mutant` and `--from-rev` edit the plugin in memory. `--capture-fixture` writes the area fixture only after the all-area chain matches lane-dc.
- `tools/fixtures/levels/area_checksums_gen5_3x3.json`: per-area generator-5 sums for seeds 18 and 20260927, grid 3×3. `sourceSha` is `d8acc31026bce06556b4b6046bccad9ec7b263ff`, the plugin the sums were captured from. A normal run compares the file and does not rewrite it.
- `docs/systems/DEUS_Levels.md` and `docs/systems/DEUS_ZRange.md`: the start-area policy, `areaSums`, the event, the trace switch, and the load flush.

`const allLevels` stays in `ensureWorldLevels` and is unused on the normal path. `test_32_levels_generation.js` and `test_sparse_outer_save.js` replace `const entryLevels = CORE_LEVELS` with `const entryLevels = allLevels`. Both of those gates passed.

## How I tested it

Commands in this worktree. Each node gate had a kill timeout under 900 s. None hit it. A fresh clone was not used. `merge_gate` is the fresh-clone run.

Fail-before, base plugin `d8acc310` via `--from-rev` (the worktree file was not swapped):

- `node tools/test_lazy_area_generation.js --from-rev=d8acc310` exit 1. 4 passed, 10 failed. Guards passed: `legacy_single_checksum_verifies`, `trace_off_by_default`, `home_areas_exist_at_tick0`, `new_game_3x3_cost_bound` (no `areaGenerations`; whole-run times printed). Must-fail checks failed in the harness, not by `MODULE_NOT_FOUND`. `ensure_generates_start_area_only` saw `generated 45`. `load_generates_visited_areas_only` saw extract delta 45. `evidence/fail-before.txt`.

Tip, after the two harness bugs in the first red run were fixed (the once-per-area counter was read after a second area; order comparison used object key order). The fixture-read run and the later gate run are the green ones:

- `node tools/test_lazy_area_generation.js` exit 0 (114.7 s). 14 passed. `evidence/lazy-tip.txt`.
- Mutants, each exit 1 on its named check only: `eager_ensure`, `record_not_saved`, `silent_replace`, `event_not_held`, `view_gated_generation`, `event_per_cache_fill`, `order_dependent_noise`, `regenerate_twice` (both `new_game_3x3_areas_attributed` and `new_game_3x3_cost_bound`). `evidence/mutant-*.txt`.

Other gates, tip plugin:

- `node tools/check_deus_syntax.js` exit 0 (6 s). 62 files, 0 errors.
- `node tools/zrange/scan_z_literals.js` exit 0 (0.3 s). 139 lines, 139 allowed, 0 stale.
- `node tools/test_sim_loader.js` exit 0 (52.7 s). 7 passed.
- `node tools/test_sparse_outer_save.js` exit 0 (20.3 s). 7 passed. Terrain+range diff 2 B. Levels JSON 425 B at both ranges.
- `node tools/test_32_levels_generation.js` exit 0 (4 s). 9 passed.
- `node tools/test_new_game_year0.js` exit 0 (18.9 s). 30 gating checks, 15 mutants caught.
- `node tools/test_area_generation_speed.js` exit 0 (174.5 s). Samples 3520.8, 3869.9, 4143.4 ms, median 3869.9, limit 5000. `core_checksums_bit_identical` passed, including generator 5 seed 18 1×1 z0 `1f5c2a72`.
- `node tools/test_strata_cuts_and_caves.js` exit 0 (156.2 s). 30 passed.

NW.js, editor closed. Snapshot `C:\Users\snewt\AppData\Local\Temp\lane-dd-f5\game` (`tools/test_snapshot.js --no-run`: `js` and `data` copied, asset folders junctioned). The snapshot's `plugins.js` sets DEUS_World `Seed` to 18, and `AreasX`/`AreasY` to 3 for the 3×3 runs. Base runs copy `git show d8acc310:game/js/plugins/DEUS_Levels.js` into the snapshot only. Those edits are not in the repo.

- Base 1×1 smoke: exit 0 (39.0 s). 122 passed. `no_errors` none. `world:created` +18170.4 ms. `setupNewGame` exit +18412.3 ms. Map 1000.
- Tip 1×1 smoke: exit 0 (34.4 s). 122 passed. `no_errors` none. `world:created` +16713.4 ms. `setupNewGame` exit +16923.9 ms. Map 1000.
- Base 1×1 vertical: exit 1 (74.8 s). 6 passed, 5 failed. `five_levels` and `complete_at_start` passed. Checksums `-2 95c997d4`, `-1 1ed786a5`, `0 1f5c2a72`, `1 eaf389b9`, `2 9998ffb2`.
- Tip 1×1 vertical: exit 1 (65.6 s). 7 passed, 4 failed. `five_levels` and `complete_at_start` passed with the same five checksums. The pass text is "every level available on request (generator 5's one volume holds all 32)".
- Base 3×3 smoke: exit 2 (129.2 s). Scene_Map was up. The harness timed out after 11000 ms waiting for 60 frames. `world:created` +80070.6 ms. `setupNewGame` exit +80231.5 ms. Reserved map 1004.
- Base 3×3 vertical: exit 2 (135.3 s). Same frame timeout. `world:created` +88522.2 ms. `setupNewGame` exit +88672.0 ms. Map 1004.
- Tip 3×3 smoke: exit 2 (131.4 s). Same frame timeout. `world:created` +81658.8 ms. `setupNewGame` exit +81790.2 ms. Map 1004.
- Tip 3×3 vertical: exit 2 (141.2 s). Same frame timeout. `world:created` +84267.0 ms. `setupNewGame` exit +84475.9 ms. Map 1004.

`five_levels` and `complete_at_start` did not run on 3×3. The frame wait lives in `DEUS_Test.js`, which this lane cannot edit. The same timeout happens with the base plugin.

## Evidence

- `evidence/fail-before.txt`: base plugin, exit 1.
- `evidence/lazy-tip.txt`: 14 passed. The DEC-065 lines below are from this file.
- `evidence/mutant-*.txt`: each named check red, exit 1.
- `evidence/syntax.txt`, `z-literals.txt`, `sim-loader.txt`, `sparse-tip.txt`, `levels32.txt`, `year0.txt`, `speed-tip.txt`, `strata-gate.txt`.
- `evidence/f5-*-timing.txt`: the `[TIMING]` lines. `evidence/f5-*-results.txt`: the harness RESULT line.
- Screenshot `evidence/f5-base-1x1-smoke-smoke.map.png`, opened 2026-10-02: grass ground. A dense block of people with green bars, a red banner with a gold emblem near the middle, trees at the left and right, stumps at the lower corners. Plate reads Ground. Zoom 1.0x Normal. "Explored: 3% (1793 cells)". A dark minimap. A letter bar along the bottom. The seed is not drawn.
- Screenshot `evidence/f5-tip-1x1-smoke-smoke.map.png`, opened 2026-10-02: the same ground layout, same plate, same 3% count, same banner, crowd, trees and stumps.
- Screenshot `evidence/f5-base-1x1-vertical-vertical.view_ground.png` and `evidence/f5-tip-1x1-vertical-vertical.view_ground.png`, opened 2026-10-02: zoom 0.5, plate Ground. One blue-haired figure near the center of a grass field, trees and a stump, a row of smaller figures along the top right. Explored 3% (1793 cells). The two pictures match.
- Screenshot `evidence/f5-base-1x1-vertical-vertical.view_minus1.png` and the tip copy, opened 2026-10-02: plate "-1". Dark blue cavern, black rock walls, one figure and a small green plant on a floor, zoom 0.5. Explored 0% (0 cells). The two pictures match.
- Screenshot `evidence/f5-base-1x1-vertical-vertical.view_plus1.png` and the tip copy, opened 2026-10-02: plate "+1". Grass seen from above, a wooden platform near a tree, scattered trees and stumps, zoom 0.5. Explored 0%. The two pictures match.
- Screenshot `evidence/f5-base-1x1-vertical-vertical.pre_v80_loaded.png` and the tip copy, opened 2026-10-02: plate Ground, zoom 1.0x. A column of people, a red banner, trees on the left. Explored 3% (1793 cells). The check `surface_migration` still failed on the tile hash (3680697598 against the fixture's 3179089613) on both plugins. The picture is the loaded ground. It does not show that hash.
- Screenshots `evidence/f5-base-3x3-smoke-harness.on_failure.png`, `evidence/f5-base-3x3-vertical-harness.on_failure.png`, `evidence/f5-tip-3x3-smoke-harness.on_failure.png`, `evidence/f5-tip-3x3-vertical-harness.on_failure.png`, opened 2026-10-02: the ground map is up. Plate Ground, zoom 1.0x Normal, explored 3% (1793 cells). A dense crowd and a red lion banner. The field is darker than the 1×1 smoke shot, and the trees at the edges are mostly out of frame. The four pictures match each other. The harness log says the scene was Scene_Map and the 60-frame wait timed out. The picture does not show the seed. The log's reserved map is 1004, the center area's ground.

Log excerpt, tip gate (`evidence/lazy-tip.txt`):

```text
DEC-065 areas 1,1 1064.5ms DEUS_Core.js | 2,0 1076.5ms DEUS_WorldGen.js | 2,1 823.0ms DEUS_WorldGen.js | 0,2 824.3ms DEUS_WorldGen.js | 0,0 911.0ms DEUS_WorldGen.js | 0,1 809.6ms DEUS_WorldGen.js | 1,2 1036.9ms DEUS_WorldGen.js | 2,2 1093.0ms DEUS_WorldGen.js
DEC-065 homes human*@1,1 z0 elf@2,0 z0 halfling@2,1 z0 dwarf@0,2 z-1 gnome@0,0 z-1 dragonborn@0,1 z-2 half-elf@1,2 z0 half-orc@2,2 z0 tiefling@1,2 z-2
PASS new_game_3x3_areas_attributed: real true one-duplicate-would-pass false areas 1,1 2,0 2,1 0,2 0,0 0,1 1,2 2,2
DEC-065 T(1x1) 16003.5 ms grid 1x1 T(3x3) 31644.1 ms grid 3x3 k 8 Tarea 974.0 ms per-area 1064.5,1076.5,823.0,824.3,911.0,809.6,1036.9,1093.0 T1x1_levels 1015.4 judged sum 7639.0 <= 8807.2 printed expression T(1x1)+(k-1)*Tarea*1.25 = 24525.7
PASS new_game_3x3_cost_bound
RESULT 14 passed, 0 failed
```

Area (1,0) was not a home and was not generated. Half-elf and tiefling share area (1,2) at z 0 and z -2. The first stack frame outside Levels is `DEUS_Core.js` for the start area (the `world:initializing` listener) and `DEUS_WorldGen.js` for the other seven. History was not that frame. An offscreen `baseline(0, 0, 0)` invoked under the filename `DEUS_Factions.js`, with the view on (1,1), generated the area and recorded requester `DEUS_Factions.js`.

Fail-before excerpt:

```text
DEC-065 T(1x1) 12816 ms grid 1x1; T(3x3) 29771 ms grid 3x3; areaGenerations absent, whole-run times printed only
PASS new_game_3x3_cost_bound
RESULT 4 passed, 10 failed
```

`regenerate_twice` doubled the record list (k stayed 8) and failed the judged sum: 12122.1 ms against a limit of 7202.5 ms. It also failed the one-duplicate attribution predicate.

## Not done / known problems

- The node gates ran in this worktree. A second clone was not built.
- NW.js 3×3 never finished a suite. The map came up, then `DEUS_Test` stopped after 11 s without 60 frames. The base plugin did the same. `five_levels` and `complete_at_start` on a 3×3 world were not observed in NW.js.
- 1×1 vertical fails `underground_biomes`, `offscreen_state`, `save_size`, and `surface_migration` on the base plugin and on this one. The underground numbers match (`-1` 49.95% solid, 46 pockets, dry founding cores false). `save_size` is about 7.3 MB of JSON against a 3 MB limit. `surface_migration` tile hash 3680697598 against fixture 3179089613. `follow_view` failed on the base run (the view moved for an unfollowed unit) and passed on the tip run. One run each. The follow code was not edited.
- The printed expression `T(1x1)+(k-1)*Tarea*1.25` is 24525.7 ms. Measured `newWorld` wall `T(3x3)` is 31644.1 ms. The pass/fail bound is the sum of `areaGenerations[].ms` (7639.0 <= 8807.2). `areaSumMs` is not in that sum.
- NW.js 3×3 `world:created` is 80070.6 ms at the base and 81658.8 ms at the tip (smoke). Eight of nine areas are still built, because eight areas hold homes. One empty cell is the difference, and it is inside an ~80 s run.
- `DataManager.saveGame` writing a file and `loadGame` reading it back from disk: not checked. The harness load path is `extractSaveContents` of a JSON object.
- FPS: not measured.
- Event consumers and a playable 3×3 grid are later lanes. This lane did not add them.
- The area fixture's `sourceSha` is the starting SHA, not the commit that added the file.

## Try it in RMMZ

1. New Game, DEUS_World Seed 18, AreasX and AreasY left at 1.
2. Wait until the ground map is up.
Expected: the 1×1 smoke picture above, map 1000, no console error from the smoke suite. On this machine `setupNewGame` exit was +18412.3 ms with the previous plugin and +16923.9 ms with this one.

A 3×3 New Game (AreasX and AreasY 3, Seed 18) reached Scene_Map on map 1004 in both plugins, then the test harness stopped waiting for frames. The failure screenshots show that ground. `world:created` was +80070.6 ms before this lane and +81658.8 ms after, on the smoke runs.

## Decisions needed

- The 3×3 NW.js frame stall is in `DEUS_Test.js` and already happens on `d8acc310`. This lane did not change that file.
- The 1×1 vertical failures listed above are present on the base plugin. This lane did not retune those checks.
- Confirm the WBS row uses the judged Levels sum, and keeps the whole-run expression as a printed number. On this host the printed expression is under the measured `newWorld` wall.

## GAME TRANSLATION

WBS / Lane: WG.00.46 / WG.CELL-WRITE lane-dd. Owner acceptance of the DEC-065 narrowing is commit `91d37ae5`.
Approved scope / Owner authorization reference: DEC-065. New Game builds the start area and the areas a faction home needs. The simulation, never the view, drives generation.
Writer SHA / evidence date: the tip SHA printed after the push. Evidence date 2026-10-02.
Translation Class: C FOUNDATIONAL / INDIRECT

Player / World Effect: a New Game builds the start area, then each other area when something asks for its floor. A 3×3 world in the full plugin set built 8 areas (seed 424242). Area (1,0) was not built.
Trigger: `world:initializing` for the start area. The first `baseline` of any other area. A load, for areas the save already recorded, after `World.state` is restored.
Runtime Authority: `DEUS_Levels.js`. Records: `World.state.levels[z].areaSums` on the five core levels. The seen set and the load queue are runtime only.
Simulation Path: `ensureWorldLevels` -> `baseline` -> `volumeOf` -> `recordArea` -> `areaChecksum` -> `levels:areaGenerated`. A load runs the previous `extractSaveContents` wrapper (World restores state), then Levels flushes the queue.
Engine Bridge: `uf_levels_terrain` (`registerGenerator`) still paints what `baseline` returns. Unchanged. Event consumers (lane-dl, lane-ef, lane-eg) and the 3×3 grid (lane-de) are later lanes. Engine bridge for those consumers is DEFERRED. Not playable as a 3×3 feature here.
Visible Result: 1×1 seed 18 smoke reached the ground map at base and tip (screenshots above). 3×3 reached Scene_Map on map 1004 and then the frame wait expired, at base and tip. The pictures show the ground camp. They do not show which areas were generated.
Persistence: `areaSums` is on the core level entries and survives a JSON round trip (`per_area_checksum_on_first_generation`). A mismatched sum is warned and kept (`per_area_checksum_mismatch_reported`). The seen set is not saved. A load of a two-area 3×3 save generated nothing inside `extractSaveContents`, then one area when that area's map was built (`load_generates_visited_areas_only`).
Failure Without This Lane: on `d8acc310`, a 3×3 New Game generated 45 core baselines in `ensure` (`generated 45`), and a load of a visited-area save generated 45 baselines during extract.
Automated Proof: `node tools/test_lazy_area_generation.js` exit 0, 14 passed, `evidence/lazy-tip.txt`. `--from-rev=d8acc310` exit 1, `evidence/fail-before.txt`. The other gate commands listed above, all exit 0. Seed 18 and 20260927 for the area fixture. Seed 424242 for the full-plugin attribution run.
In-Game Proof: RUN on a snapshot, 2026-10-02. Seed 18. Suites `smoke` and `vertical`, grids 1×1 and 3×3, base plugin `d8acc310` and this plugin. Screenshots listed above, each opened. 1×1 smoke: 122 passed, 0 failed, both plugins. 1×1 vertical: `five_levels` and `complete_at_start` passed both plugins. The suite exit was 1 for other checks that also fail on the base plugin. 3×3: harness exit 2, frame wait, both plugins. The map picture is the failure screenshot.

CONSUMED BY GAME SYSTEMS:
- `DEUS_WorldGen` reads shape through `baseline` when `cellInfo` asks for a ground cell. Observed requester for the seven non-start areas in the seed-424242 3×3 New Game.
- `DEUS_Factions` places homes. The homes were readable at `UF.Sim.tickCount() === 0` (9 homes). The first stack frame was WorldGen, not Factions, except when the harness called `baseline` under the filename `DEUS_Factions.js`.
- Later consumers of `levels:areaGenerated` are not in this lane. A missed or repeated event would make a later lane generate an area twice or not at all. The headless checks cover once-per-state and the load flush. No in-game consumer is wired here.

GAME BRIDGE STATUS
Simulation implemented: YES - `evidence/lazy-tip.txt`, 14 passed, and the fail-before run exit 1.
Engine bridge implemented: YES for terrain paint (`uf_levels_terrain` unchanged; 1×1 smoke drew the ground). DEFERRED for `levels:areaGenerated` consumers and for a playable 3×3 grid.
Presentation implemented: YES for the existing ground and level paint on 1×1 (screenshots). The 3×3 map drew and then the frame wait expired.
Input/player interaction implemented: NO - not checked. The vertical suite's own key path passed `switch_view` on 1×1 at base and tip. This lane did not add an input.
Save/load implemented: YES for `areaSums` in the headless extract path. Disk `saveGame`/`loadGame`: not checked.
Playable verification performed: YES for 1×1 seed 18 smoke, base and tip. PARTIAL for 3×3: the map reached Scene_Map and the screenshots were opened; the suite did not finish.

Remaining step before player can experience it: lane-de for the 3×3 grid in play, and lane-dl / lane-ef / lane-eg for consumers of `levels:areaGenerated`. A 1×1 New Game already shows the same ground as before.

Simulation authority: COMPLETE within WG.00.46, supported by `evidence/lazy-tip.txt` and the mutant files.
Game translation consumer: DEFINED as the existing terrain painter, plus later lanes for the area event.
Engine bridge: DEFERRED TO lane-dl, lane-ef, lane-eg, and lane-de.
Player-facing status: NOT YET PLAYABLE as a 3×3 feature. 1×1 New Game play is unchanged in the smoke screenshots.

## NUMBERS FOR THE WBS ROW

Node `newWorld` wall, full plugin set, seed 424242, this machine, 2026-10-02.

- T(1x1) base: 12816 ms (`--from-rev=d8acc310`). `areaGenerations` absent.
- T(1x1) tip: 16003.5 ms. T1x1_levels 1015.4 ms (one area).
- T(3x3) base: 29771 ms.
- T(3x3) tip: 31644.1 ms.
- k: 8. Areas (1,1) (2,0) (2,1) (0,2) (0,0) (0,1) (1,2) (2,2). (1,0) absent.
- Tarea: 974.0 ms (median of the eight tip generation times).
- Judged sum: 7639.0 ms <= 8807.2 ms (T1x1_levels + k * Tarea). Passed.
- Printed expression T(1x1)+(k-1)*Tarea*1.25 = 24525.7 ms. Not the pass/fail bound. Measured T(3x3) wall is above it.
- Homes, tick 0: human at (1,1) z0 (player), elf (2,0) z0, halfling (2,1) z0, dwarf (0,2) z-1, gnome (0,0) z-1, dragonborn (0,1) z-2, half-elf (1,2) z0, half-orc (2,2) z0, tiefling (1,2) z-2.
- Requesters: (1,1) DEUS_Core.js. The other seven DEUS_WorldGen.js.
- NW.js seed 18, `world:created` / `setupNewGame` exit, smoke: 1×1 base 18170.4 / 18412.3 ms; 1×1 tip 16713.4 / 16923.9 ms; 3×3 base 80070.6 / 80231.5 ms; 3×3 tip 81658.8 / 81790.2 ms.
- Speed gate, one area, generator 5, seed 18: median 3869.9 ms (samples 3520.8, 3869.9, 4143.4), limit 5000.
