# WG.00.44 / lane-db writer report

Date: 2026-10-01. Writer: claude. Designated reviewer: grok (not yet run).
Base: `7f91efbb` (wave-2B launch commit; launch record `launches/20261001_071059_record.md`).
Tested code SHA: `7cc12f1f` (code commits 6fb697b2, 257aeae0, a0c8598a, 8865cb29 docs, 7cc12f1f). This is writer
evidence, not an independent review, a merge or a leaf closure. Nothing pushed or merged.

## What changed

- `game/js/plugins/DEUS_World.js`: new `DEUS.Sim` (`UF.Sim`) block after `window.UF.Space = Space;`, outside the
  span `tools/sim/test_units.js` cuts out. `Sim.require(name)` / `Sim.resolve(name)` load `game/js/sim/<name>.js` or
  `<name>/index.js`. They look under `<cwd>/js/sim`, then `<cwd>/game/js/sim`, then `<__dirname>/../sim`. A missing
  module throws `DEUS_SIM_MODULE_MISSING` with every tried path, never `null`, and there is no fallback copy. A bad
  name is a `TypeError`. The game logs the first resolution of each name to `game_runtime.log`.
  `Sim.registerMatterOpener(name, fn)` / `Sim.matterOpeners()` form the registry: sorted by name, duplicates throw,
  frozen entries. Nothing runs the openers yet (lane-dv). The members are added to an existing `DEUS.Sim` object,
  because `sim/geomorphology` publishes `DEUS.Sim.Soil` there.
- `tools/lib/vm_sim_require.js` (new): `install(sandbox, { grid })` puts `DEUS_SIM_HOST` in the sandbox (this
  process's `require`, `game/` as cwd), so `UF.Sim.require` resolves in the vm without changing the sandbox's own
  `require`, `process` or `__dirname`. With `grid: "pinned"` (the default), `PluginManager` becomes an accessor whose
  `parameters("DEUS_World")` reads AreasX/AreasY `"1"` when the harness passes none. `grid: "shipped"` leaves it alone.
- `tools/lib/vm_harness_scan.js` (new): the mechanical scan. The rule is in its header and in
  `docs/systems/DEUS_World.md`, and it names no file. At `7f91efbb` it finds 48 harnesses, the same set as this lane's
  allowedPaths list; `tools/test_sim_loader.js` makes 49. `tools/sim/test_units.js` is excluded as slice-only. The four
  World-double harnesses are excluded because they name targets only in comments.
- 48 harnesses: one `require` of the hook plus `simHook.install(<sandbox>)` before the target plugins are evaluated.
  Three of them load it from an absolute path because they run from copied locations:
  - `tools/dev/sim_forward.js` loads it from its found ROOT; `test_sim_forward_guard` runs mutated temp copies of it.
  - `bench_underground_gen.js` and `bench_vertical_worldgen.js` load it by `__dirname`; their nw-native mode runs a copy.
  Two harnesses got something other than the standard edit:
  - `bench_history_demographics.js` hashes `DEUS_World.js` but evaluates no target. The rule counts it, so the hook
    is placed in its single `compileFunction` scope (`contextExtensions`); the PRNG slice reads none of its names.
  - `test_round_world.js` / `test_seamless_map_edges.js`: hook line only, not repaired (brief).
- `tools/test_sim_loader.js` (new): seven named checks and three mutants (see `docs/systems/DEUS_World.md` section 5).
- `docs/systems/DEUS_World.md`: API, hook, scan rule, checks, status.
- `tasks/WG.00.44/lane-db/`: this report, the launch record, `evidence/`. BRIEF.md and lane.json are unchanged.
  Every changed path is in allowedPaths (checked with a script against lane.json). `tools/test_area_generation_speed.js`
  was not touched: lane-dc has not merged.

## How I tested it

1. Base `7f91efbb`, gate-style clone (shared, `core.autocrlf=false`, `core.eol=lf`, detached HEAD): the five
   keep-green gates (`check_deus_syntax`, `test_32_levels_generation`, `test_geology_strata`, `test_new_game_year0`,
   `sim/test_units`) all exit 0 (`evidence/base_keepgreen_gates_7f91efbb.txt`).
2. FAIL-before: I copied the final `test_sim_loader.js` and both libs into the base clone. The five must-fail checks
   fail there (no `UF.Sim`; 49 hits, none hooked; the NW.js suite's `uf_sim_present` FAIL). `scan_finds_known_harnesses`
   and `grid_pinned_by_hook` pass, because they test the copied libs. Exit 1. Log: `evidence/fail_before_at_7f91efbb.txt`.
3. PASS-after: all six lane.json gate commands in a fresh clone at `7cc12f1f`, each exit 0. Log:
   `evidence/tip_gates_fresh_clone_7cc12f1f.txt`.
4. Mutants at `7cc12f1f`, six headless checks each: `return_null_on_missing` fails only `missing_module_throws`.
   `fixed_list_scan` fails only `every_vm_harness_installs_hook` (the planted harness is not found). `unpinned_grid`
   fails only `grid_pinned_by_hook`. Each run exits 1. Log: `evidence/tip_mutants_7cc12f1f.txt`. `nwjs_loader` was not
   run under the mutants. The `assigned_eval` scan fixture added in 7cc12f1f is classified "not a hit" by the
   8865cb29 scan and "hit" by the final scan (run by hand; output in the session, not in evidence).
5. Every hooked harness at base and at tip, in gate-style clones: 38 test harnesses, plus 11 runs of the benches and
   tools (`--selftest` or one short run). All 49 rows have the same exit code at base and tip (`evidence/harness_base_vs_tip.txt`).
   - For strata cuts, strata foundation, region seam, survival soak, vertical biome coupling and the sim_forward
     guard I diffed the PASS/FAIL lines; they match except for timings and temp paths.
   - The two `capture_pre_migration_baseline` seeds give the same world checksums at base and tip.
   - `sim_forward --seed 424242 --years 1` writes a byte-identical output at base and tip.
   - `test_32_levels_generation --mutant=checksum_all_levels` is caught (`core_entries_only` FAIL) at both.
6. The first tip run (257aeae0) showed one regression: `test_sim_forward_guard` lost two mutant catches, because its
   temp copies of `sim_forward.js` could not resolve `../lib/vm_sim_require`. Fixed in a0c8598a. The guard's 23 check
   lines then matched the base exactly.
7. `git diff 7f91efbb..HEAD --check` is clean. Current `origin/main` (`370ae0da`, after lane-eb's merge) adds
   `tools/sim/test_water_cycle.js`, which is not a scan hit (48 hits on that tree), so merging main would not add an
   unhooked harness.

## Evidence

- Screenshot `evidence/nwjs_sim_loader_map.png`, opened: the game reached the map on a snapshot. Grass field, rows of
  colonists around a red banner, the level selector ("Ground"), the speed control ("1x Speed"), the zoom panel and the
  bottom tool bar. It shows the game booted with the change. The loader proof is the log line, not the picture.
- `evidence/nwjs_game_runtime_sim_lines.txt` (from the snapshot's `game_runtime.log`):
  `2026-10-01T12:45:37.867Z [SIM] UF.Sim.require("ledger") resolved C:\Users\snewt\AppData\Local\Temp\wg0044-nw-mmkcPk\game\js\sim\ledger.js`
- `evidence/nwjs_sim_loader_results.txt`: `PASS sim_loader.uf_sim_present`, `ledger_resolved_from_game_folder`,
  `ledger_loaded`, `missing_module_throws`, `no_console_errors` ("none since TEST_SimLoaderConsole loaded (plugins.js
  index 0)"); `RESULT: 5 passed, 0 failed (exit 0)`. That run was at the WIP stage (DEUS_World.js as in 6fb697b2,
  unchanged since). The gate run at 7cc12f1f repeated it: `PASS nwjs_loader ... [SIM] UF.Sim.require("ledger")
  resolved ...\wg0044-nw-PrLRC5\game\js\sim\ledger.js`.
- Gate log excerpt (`evidence/tip_gates_fresh_clone_7cc12f1f.txt`, trimmed):
  ```
  fresh shared clone 2026-10-01T13:28:53Z, HEAD 7cc12f1f45c83fd279acb55a98a2e2f7b69eab3a, node v24.19.0, core.autocrlf=false core.eol=lf
  === node tools/test_sim_loader.js
  PASS every_vm_harness_installs_hook - 49 hits in 937 files; without the hook: none; planted harness found by the scan: true, refused: true; hooked fixture accepted: true
  PASS grid_pinned_by_hook - fallback-3 fixture: {} -> 1x1, grid "shipped" -> 3x3, AreasX "2" -> 2x1, PluginManager set after install -> 1x1, legacy UF_World AreasX "4" -> 4x1; real DEUS_World.js -> 1x1; grid "3x3" refused: true
  RESULT: 7 passed, 0 failed
  EXIT 0
  ```

## Not done / known problems

- Not run in the RMMZ editor's Playtest (F5). The NW.js evidence comes from `run_tests.js` on a snapshot (Class C, as
  the brief asks).
- Harnesses already red at the base stay red at the tip, with the same failing checks. They are outside this lane:
  - `test_19b_performance_determinism` (`WA.initNewWorld is not a function`)
  - `test_extraction_difficulty` (`UF_Skills.js` missing)
  - `test_faction_starting_gear` (History load-order Error after its first checks)
  - `test_hist_metadata_contracts` and `bench_history_sim --selftest` (History load-order FATAL)
  - `test_history_materialization_and_world_age` (ROUNDTRIP_worldSha256)
  - `test_production_history_demographics`, `bench_species_biology`, `profile_historical_demographics` (candidate/packet mismatch)
  - `test_resource_node_materials` (`Z_RANGES` of undefined)
  - `test_round_world` and `test_seamless_map_edges` (Scene_Map)
  - `test_z_flora` (7 fails)
  - `test_liquid_depth_simulation` (`legacy_flooding_compatibility`)
  - `test_strata_cuts_and_caves` (`clearance_4_5_more`)
  - `test_region_seam_continuity` (`sky_cap_empty_z12`)
  - `test_native_survival_soak` (4 fails)
  - `worldgen/test_vertical_biome_coupling` (`mutant independent_roll` anchor; its perf ratio also failed once under
    parallel load)
  - `sim/test_sim_forward_guard` (fixture drift)
  - `bench_underground_gen` (GEN3 profiler) and `bench_vertical_worldgen` (DEUS_Depth bootstrap)
- `every_vm_harness_installs_hook` checks statically: the file binds the hook with `require` and calls `.install(` in
  code. It does not prove `install` gets the sandbox the plugins run in. The gate harnesses (test_32, geology,
  new_game_year0) and the base/tip comparison show the hook in use, not a check per file.
- The scan rule is conservative: a doubt counts as "whole". `bench_history_demographics.js` is a hit although it only
  hashes `DEUS_World.js`. This matches the brief's survey count (48 at 68483d99), and the hook there has no effect.
- `UF.Sim.require`'s third candidate base (`<cwd>/game/js/sim`) also appears in the game's tried list
  (`<game>/game/js/sim/...`), where it never exists. This is harmless and is visible in the missing-module message.
- The hook's `PluginManager` accessor cannot see a `class PluginManager` declared by a script inside the context. No
  hit does that today: every hit evaluates only `DataManager` sections of `rmmz_managers.js`.
- Combined runs with lane-dc, and with lane-do if it is open, are the PM's (brief, "Combined runs"). Not run here.

## Try it in RMMZ

1. With the editor closed or open (this lane changes neither `plugins.js` nor `game/data`), press F5 and start a New Game.
2. Press F8 and run `UF.Sim.resolve("ledger")`, then `UF.Sim.require("ledger").createLedger`, then `UF.Sim.require("nope")`.

Expected: the first gives `<project>\game\js\sim\ledger.js`; the second is a function; the third throws "no such sim
module; tried ..." with code `DEUS_SIM_MODULE_MISSING`. `game/game_runtime.log` gains
`[SIM] UF.Sim.require("ledger") resolved ...`.

## Decisions needed

- None for this lane. For the PM: after lane-dc merges, its speed harness needs the hook and
  `node tools/test_sim_loader.js` in its gateTests (brief, handoff exception).
