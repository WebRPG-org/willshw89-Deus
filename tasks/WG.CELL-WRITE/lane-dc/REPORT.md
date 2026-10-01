# WG.CELL-WRITE / lane-dc writer report

Parent of the fixture commit: `07a944291879018ac0ddf369e78f72c3cd87f0ab`. Fixture commit: `9b2073bb79551bc8e694390c4eda3bf3fd4ff9fc`. The optimization commit that contains this report holds these blobs:

- `game/js/plugins/DEUS_Levels.js` `e87ff4e0cfa55f42efbb8d553ecc7375b47f7442`
- `docs/systems/DEUS_Levels.md` `b932c4da053f1196010eff69d6d5638ad5aed402`
- `tools/test_area_generation_speed.js` `d424e6a0dcb69f4f5a665f9f53482ab6da5366a2` (committed in `9b2073bb`)
- `tools/fixtures/levels/core_checksums_gen1_5.json` `ecf12a1bf5df7cf6b19ecacadeea693e030c2daf` (committed in `9b2073bb`)

Date of the runs: 2026-10-01. Machine: this lane worktree. Lane-db's vm hook is absent on `origin/main` `95501a0b` (`tools/lib/vm_sim_require.js` is not there), so this harness does not install it.

## What changed

- `game/js/plugins/DEUS_Levels.js`: the generator hash is fixed-arity. `hash32_3`, `hash32_4`, and `hash32_6` replace the rest-parameter `hash32`. `valueNoise` calls `hash32_4` four times and no longer builds a per-corner closure. Feature rolls (`rnd`, `rint`, `rfl`) mix the same FNV-1a bytes with `mixPart` and omit a missing tail. `HASH_OFFSET` is the mutant anchor. Checksum bytes for generators 1–5 match the fixture captured from the base plugin.
- `tools/test_area_generation_speed.js`: `one_area_volume_ms`, `no_rest_parameter_hash_on_generator_path`, and `core_checksums_bit_identical`. `--capture-fixture` wrote the fixture once. `--mutant=hash_changed` moves `HASH_OFFSET`.
- `tools/fixtures/levels/core_checksums_gen1_5.json`: 20 cases from base `07a94429`. Generators 1–5, seeds 18 and 20260927, grids 1×1 and 3×3. Core levels −2..+2. Each case names its area coordinates and start area. Z range −16..+15, coupling on. Seed 18 generator 5 1×1 matches the sparse-save core checksums.
- `docs/systems/DEUS_Levels.md`: checksum row names the fixed-arity hash and `worldDesc`. A 2026-10-01 measurement paragraph records the two medians.
- `tasks/WG.CELL-WRITE/lane-dc/LAUNCH_RECORD.md`, this report, and `evidence/`.

## How I tested it

Commands in this worktree. Each had a kill timeout under 900 s. None hit it. A fresh clone of the repo was not used; `merge_gate` is the fresh-clone run.

Base plugin (`function hash32(...parts)` restored), new test present:

- `node tools/test_area_generation_speed.js` exit 1 (784 s). Static check red. Speed samples 17,912.0, 17,315.3, 15,284.4 ms, median 17,315.3, over 5,000. `core_checksums_bit_identical` green. `evidence/fail-before.txt`.
- `node tools/test_sparse_outer_save.js` exit 0 (60 s). 7 passed. `evidence/sparse-base.txt`.

Fixture capture, same base plugin, before the optimization was what the process loaded: `node tools/test_area_generation_speed.js --capture-fixture` exit 0 (949 s). `evidence/capture-fixture.txt`.

Tip plugin:

- `node tools/check_deus_syntax.js` exit 0. 62 files, 0 errors.
- `node tools/test_area_generation_speed.js` exit 0 (197 s). Static green. Speed samples 3,319.6, 3,944.3, 3,961.1 ms, median 3,944.3. Checksums green. `evidence/pass-after.txt`.
- Median ratio against the base run above: 17,315.3 / 3,944.3 = 4.390.
- `node tools/test_area_generation_speed.js --mutant=hash_changed` exit 1 (183 s). `core_checksums_bit_identical` red. First listed misses: `g1_s18_1x1 z -2 11dc84dd != f6aad9f4`. `evidence/mutant-hash_changed.txt`.
- `node tools/test_sparse_outer_save.js` exit 0 (20 s). 7 passed, including the 32 seed-18 layer checksums. `evidence/sparse-tip.txt`.
- `node tools/test_strata_cuts_and_caves.js` exit 0 (153 s). 30 passed. `evidence/strata-gate.txt`.
- `node tools/test_deep_cuts_and_mountain_cap_wg0041.js` exit 0 (39 s). 11 passed. `evidence/deep-cuts-gate.txt`.

NW.js smoke, seed 18, snapshot `C:\Users\snewt\AppData\Local\Temp\lane-dc-f5\game` (img/audio/effects linked, `js` and `data` copied). The snapshot's `plugins.js` sets DEUS_World `Seed` to 18. The snapshot's `DEUS_World.js` adds `seed=` to one existing timing line. Those two edits are not in the repo.

- Base Levels: `node tools/run_tests.js smoke --game <snapshot>` exit 0 (36.4 s). 122 passed. `smoke.no_errors` none. `setupNewGame` exit +17,159.9 ms. `world:created` +16,936.7 ms. Log line `seed=18`. `evidence/f5-base-timing.txt`.
- Tip Levels, same snapshot otherwise: exit 0 (34.4 s). 122 passed. `smoke.no_errors` none. `setupNewGame` exit +16,750.9 ms. `world:created` +16,545.3 ms. `seed=18`. `evidence/f5-tip-timing.txt`.

The runner passes `--deus-test=smoke`. `DEUS_Test.js` treats that flag the same as `--uf-test=smoke`.

## Evidence

- `evidence/fail-before.txt`: base speed and static red, checksum guard green.
- `evidence/pass-after.txt`: tip median 3,944.3 ms and checksum guard green.
- `evidence/mutant-hash_changed.txt`: guard red.
- `evidence/capture-fixture.txt`: the 20 capture lines and source SHA `07a94429`.
- `evidence/sparse-base.txt`, `evidence/sparse-tip.txt`, `evidence/strata-gate.txt`, `evidence/deep-cuts-gate.txt`.
- `evidence/f5-base-timing.txt` and `evidence/f5-tip-timing.txt`: the `[TIMING]` lines. A search of each full runtime log for `Error` and `TypeError` returned no matches. The full logs were about 1.4 MB of history text and were not committed.
- Screenshot `evidence/f5-base-smoke.map.png`, opened 2026-10-01: the ground after that New Game. Grass field. A crowd of people in rows, each with a green bar. A red banner with a gold emblem near the center. Trees on the left and the right, stumps at the lower corners. Top right plate reads Ground, with pause and 1x Speed. Zoom panel shows 1.0x Normal selected and "Explored: 3% (1793 cells)". A dark minimap sits under the zoom panel. A letter bar runs along the bottom. The picture does not show the seed or the clock.
- Screenshot `evidence/f5-tip-smoke.map.png`, opened 2026-10-01: the same ground layout after the tip New Game. Same plate, same 3% explored count, same banner, same crowd, same trees and stumps. The picture does not show the seed or the clock. The seed and the clock are the timing lines above.

## Not done / known problems

- The node gates ran in this worktree. A second clone was not built. `merge_gate` still has to run them in a fresh clone.
- The slowest tip speed sample is 3,961.1 ms. The limit is 5,000 ms. A busier machine can land above 5,000 on the same code (plan risk 18).
- NW.js New Game on seed 18 moved from 17,159.9 ms to 16,750.9 ms (`setupNewGame` enter to exit). The 4.390× figure is the node vm, where `Math` is a cross-realm copy. The game's own `Math.imul` was already in-realm.
- `DataManager.saveGame` writing a file and `loadGame` reading it back: not checked. Smoke's `save_serializes` stringifies `makeSaveContents` in the same process.
- FPS: not measured.
- Browser play of a web UI: not applicable. This change is the plugin and the node harness.
- lane-db has not merged. This branch does not contain `origin/main` past the lane base, and it does not install lane-db's vm hook.

## Try it in RMMZ

1. New Game at seed 18, Z range −16..+15.
2. Wait until the ground map is up.
Expected: the ground scene described above, no console error. The world bytes match a New Game from before this lane. Wall time on this machine was about 17 s to `setupNewGame` exit at the base and about 16.8 s at the tip.

## Decisions needed

- None. The 5,000 ms gate and the byte-identical fixture are the brief's. The in-game clock is evidence, and it is not a second speed gate.

GAME TRANSLATION

WBS / Lane: WG.00.45, executed as WG.CELL-WRITE lane-dc. Brief: `tasks/WG.CELL-WRITE/lane-dc/BRIEF.md`. Owner authorization: DEC-058 as amended by WORK-GATE G02, row dc.
Approved scope / Owner authorization reference: one-area `volumeOf` at least twice as fast in the node harness, median at or under 5,000 ms, generator 1–5 output byte-identical. WorldGen `valueNoise` and lazy areas stay out.
Writer SHA / evidence date: Levels blob `e87ff4e0`, docs blob `b932c4da`, harness blob `d424e6a0`, fixture blob `ecf12a1b`. Evidence dated 2026-10-01. The commit that contains this file is the commit of the Levels and docs blobs plus this report. The harness and fixture are `9b2073bb`.
Translation Class: C. FOUNDATIONAL / INDIRECT

Player / World Effect: A new world is the same cells as before this lane. Building the first area's levels costs less time in the node vm (median 3,944.3 ms against 17,315.3 ms for the same cold `baseline(0,0,0)`). In the running game the New Game clock on seed 18 was 17,159.9 ms at the base and 16,750.9 ms at the tip.

Trigger: New Game calls `World.newWorld`, which emits `world:initializing`. `DEUS_Levels.js` `hookWorld` runs `ensureWorldLevels`, which calls `baseline` for every level of the Z range. That builds one `volumeOf` per area when the generator is 5.

Runtime Authority: `UF.Levels` baselines, owned by `DEUS_Levels.js`. The hash inputs are the world seed, the generator version, the area, and the salts already in the generator. `HASH_OFFSET` is 2166136261. The checksum accumulator in `checksumOf` keeps its own literal and was not retargeted.

Simulation Path: `mixPart` and `hashFinish` (`DEUS_Levels.js`, the seeded-noise block) are the FNV-1a that `hash32` used to compute. `valueNoise` hashes the four corners with `hash32_4`. `paintProvinceBiomes` and generator 2's `rand` call `hash32_3` or `hash32_6`. `carveNaturalFeatures` mixes the feature rolls through `rnd`, `rint`, and `rfl`. `volumeOf` is unchanged in order: level arrays, carve, seal, caps, deep cuts.

Engine Bridge: `Game_Player.setupForNewGame` (`DEUS_World.js`) calls `World.newWorld`. `DataManager.setupNewGame` is the RMMZ entry. `DEUS_Core.js` logs `[TIMING]` around `Scene_Boot.start`. The observed connection is those timing lines plus the smoke suite reaching map 1000.

Visible Result: The player sees the ground settlement. The screenshots show that scene at base and at tip. They do not show a clock. The clock is the timing log. Observed in smoke: 122 checks passed, `no_errors` none, at both base and tip.

Persistence: Level checksums are the save's check that the regenerated baseline matches. The seed-18 generator-5 1×1 core checksums in the fixture are `95c997d4`, `1ed786a5`, `1f5c2a72`, `eaf389b9`, `9998ffb2` for z −2..+2, the same bytes as `BASE_LAYER_CHECKSUMS` in `tools/test_sparse_outer_save.js`. Sparse save stayed 7/7 at base and tip. A file-level `saveGame`/`loadGame` on this tip: not checked.

Failure Without This Lane: The node harness still spends a median 17,315.3 ms on one cold area, and the rest-parameter hash stays on the generator path. Later lanes that bound area generation against this test (`lane-dd`, `lane-df`) would be measuring that cost. The player's map would still be the same bytes; the New Game clock in NW.js would stay near 17 s, which is where the base already was.

Automated Proof: Commands, exits, and the two medians are in How I tested it. Seed 18 for the speed trials and the NW.js runs. Seeds 18 and 20260927 for the fixture. Headless proof is `node tools/test_area_generation_speed.js` exit 0, and exit 1 on the base plugin and on `--mutant=hash_changed`.

In-Game Proof: RUN on a snapshot, 2026-10-01. Base `2026-10-01T13:29:25.801Z`, tip `2026-10-01T13:30:27.039Z`. Suite `smoke`. Seed 18 in the log. Screenshots `evidence/f5-base-smoke.map.png` and `evidence/f5-tip-smoke.map.png` (opened; described above). Expected: map up, no console error. Observed: 122 passed, 0 failed, `no_errors` none, both runs.

CONSUMED BY GAME SYSTEMS:
- `ensureWorldLevels` / `volumeOf`: contract is the five core baselines and the outer layers of the Z range, checksummed as before. Integration observed this session: the speed harness's 20 checksum cases match the frozen fixture, and sparse-save's 32 layer checksums match `BASE_LAYER_CHECKSUMS`. Exit 0 at the tip. Corruption: a hash that drifted would fail `core_checksums_bit_identical` and the sparse layer check; the mutant run failed the fixture guard.
- `DataManager.setupNewGame` and `Game_Player.setupForNewGame`: contract is a New Game at the requested seed reaches the ground map. Observed in the NW.js smoke log: `seed=18`, map 1000, `setupNewGame` exit +16,750.9 ms at the tip. Corruption: a thrown error during generation would fail `smoke.no_errors` or never reach the map. Neither happened.
- `UF.WorldGen.valueNoise`: out of this lane. The ground lattice checksum for generators 1–4 is still WorldGen's. The fixture pins those bytes too.

GAME BRIDGE STATUS
Simulation implemented: YES - speed harness exit 0, mutant exit 1, sparse exit 0, strata 30 passed, deep cuts 11 passed.
Engine bridge implemented: YES for the New Game path observed in the smoke log (`setupNewGame` through `world:created` to map 1000).
Presentation implemented: YES for the existing ground scene. This lane does not draw a new element. Both screenshots were opened.
Input/player interaction implemented: NO new input. The smoke scene shows the existing zoom and time controls. Not exercised beyond the harness reaching the map.
Save/load implemented: YES for the checksum and sparse-entry contract in the node harness. The file-level `saveGame`/`loadGame` path: NOT VERIFIED.
Playable verification performed: YES for the smoke New Game on seed 18 at base and tip. A played session of walking and digging: NOT RUN.

Remaining step before player can experience it: The player already gets this world from New Game. The faster path is the same world, built with the fixed-arity hash. Nothing further in this lane has to land before that New Game.
