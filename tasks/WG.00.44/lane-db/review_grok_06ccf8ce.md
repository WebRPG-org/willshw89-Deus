# WG.00.44 lane-db independent review

- Reviewer: grok (family grok)
- Writer: claude (family claude)
- Date: 2026-10-01
- Branch: `task/lane-db`
- Reviewed commit: `06ccf8ceb72dec04f377aa25849518be338585d3`
- Writer code tip named in that commit: `7cc12f1f45c83fd279acb55a98a2e2f7b69eab3a`
- Lane base: `7f91efbbfb7d21a99bfaef7cbcede6a87d53bf0d`
- Manifest: `tasks/WG.00.44/lane-db/lane.json`
- No art generated, requested, or integrated (DEC-007). Engine core (`game/js/rmmz_*.js`, `game/js/main.js`, `game/js/libs/`) was not edited.

## 1. Tip confirmation

Observed before this review:

```text
git log -n 5
06ccf8ce [claude] WG.00.44 report, launch record (base 7f91efbb), evidence for tip 7cc12f1f
7cc12f1f [claude] WG.00.44 scan: a use inside a call other than a path/read call is an evaluation (assigned_eval fixture)
8865cb29 [claude] WG.00.44 docs: DEUS.Sim loader, matter openers, vm hook, harness scan, test_sim_loader checks
a0c8598a [claude] WG.00.44 WIP: sim_forward loads the hook from its found root (guard runs temp copies)
257aeae0 [claude] WG.00.44 WIP: hook installed in the 48 scanned harnesses; tools/test_sim_loader.js

git rev-parse HEAD
06ccf8ceb72dec04f377aa25849518be338585d3

branch: task/lane-db
```

`git diff --stat 7cc12f1f 06ccf8ce` changes only `docs/systems/DEUS_World.md` (2 lines) and files under `tasks/WG.00.44/lane-db/`. The plugin, the hook, the scan, and the harness edits are in `7cc12f1f` and its parents. This review is of `06ccf8ce`, which is that code plus the writer report and evidence.

Working tree at review start: one untracked file, `tasks/WG.00.44/lane-db/launches/20261001_083414_prompt.txt` (this review's launch prompt). It is not part of the reviewed commit and is not in this review commit.

## 2. Scope

`git diff --name-only 7f91efbb 06ccf8ce` is 64 paths. Each matches `tasks/WG.00.44/lane-db/lane.json` `allowedPaths` (the `tasks/WG.00.44/lane-db/**` pattern for the report and evidence). No other path changed.

`tools/test_area_generation_speed.js` is not in the diff and does not exist at this tip or at `origin/main` (`d38a89d2`). Lane-dc has not merged, so the one-file handoff is not due on this tip. `tools/sim/test_units.js` is not in the diff. `game/js/plugins.js` and `game/data/*.json` are not in the diff.

`git diff --check 7f91efbb 06ccf8ce` reports trailing whitespace on the empty "failing checks" cells of `tasks/WG.00.44/lane-db/evidence/harness_base_vs_tip.txt`. That is evidence formatting. It does not change the recorded exit codes. The report's claim that `--check` was clean is wrong; see Notes.

## 3. Code read

`UF.Sim` is appended in `game/js/plugins/DEUS_World.js` after `window.UF.Space = Space;` (the block starts at the `UF.Sim (WG.00.44)` comment, after `Space.Z_STEP_FEET = ...` at line 416). The keep-green regex in `tools/sim/test_units.js` matches exactly one `const Space = {` … `Space.Z_STEP_FEET = ` span, and that span does not contain `UF.Sim`.

`Sim.require` / `Sim.resolve` accept only `^[A-Za-z0-9_]+(\/[A-Za-z0-9_]+)*(\.js)?$`. A missing module throws `Error` code `DEUS_SIM_MODULE_MISSING` with `tried` set. There is no `return null` path. A vm host (`DEUS_SIM_HOST`) is preferred over the sandbox's own `require`. The game logs the first resolution of each name with `fs.appendFileSync("game_runtime.log", ...)`. Members are `Object.assign`ed onto an existing `window.UF.Sim`, so a later `DEUS.Sim.Soil` publish is not replaced by this block, and an earlier object is kept.

`registerMatterOpener` rejects a non-string or empty name, a non-function, and a duplicate name. `matterOpeners()` returns a new array of frozen `{ name, fn }` sorted by code unit.

`tools/lib/vm_sim_require.js` `install` puts a frozen host (`require`, cwd = this repo's `game/`, `log: null`) on the sandbox and, unless `grid: "shipped"`, wraps `PluginManager` so `parameters("DEUS_World")` fills a missing `AreasX` / `AreasY` with `"1"`, including a `PluginManager` assigned after `install`. Any other `grid` value throws. The sandbox's own `require` is not replaced.

`tools/lib/vm_harness_scan.js` is a mechanical classifier (vm context creation, a target plugin string or a bare name in a `DEUS_`-prefixed list, and not slice-only). A use inside a call other than a path or read call is whole. `tools/sim/test_units.js` stays slice-only. The four World-double harnesses are not hits. At this tip the scan reports 49 hits in 937 files. Every hit is in `allowedPaths`. The 49th hit is `tools/test_sim_loader.js` itself, which binds the hook and calls `install`.

Hook placement spot-checked, not only by the static `require` + `.install(` check:

- `tools/test_32_levels_generation.js` calls `simHook.install(env)` immediately before the `DEUS_World.js` / `DEUS_WorldGen.js` / `DEUS_Levels.js` `runInContext` loop.
- `tools/dev/sim_forward.js` requires the hook from `path.join(ROOT, "tools", "lib", "vm_sim_require")`, where `ROOT` is found by walking up from the file, so a temp copy still loads the repo hook.
- `tools/bench_underground_gen.js` and `tools/bench_vertical_worldgen.js` require it with `path.join(__dirname, ...)`.
- Nested harnesses (`tools/worldgen/`, `tools/zrange/`, `tools/sim/`, `tools/society/`, `tools/performance/`) require `../lib/vm_sim_require`.
- `tools/sim/test_fluid_attach.js` installs on both sandboxes that evaluate plugin source. `tools/sim/test_living_world_rules.js` installs on each of its three sandbox loads.
- `tools/bench_history_demographics.js` does not evaluate a target plugin; it hashes `DEUS_World.js`. The scan counts it, and the hook is passed as the `compileFunction` context extension. That matches the brief (a doubt counts as whole).

`origin/main` (`d38a89d2`) added `tools/sim/test_water_cycle.js` after this lane's base. Classified with this tip's scanner: `vm=true`, `targets` empty, `hit=false`. It would not become an unhooked hit on a later merge. Combined runs with lane-dc and lane-do remain the PM's, as the brief says.

## 4. Gate commands

Fresh shared clone, `git clone -c core.autocrlf=false -c core.eol=lf -c core.safecrlf=false --shared --no-checkout`, then the same three keys in local config, detached checkout of `06ccf8ceb72dec04f377aa25849518be338585d3`. Confirmed `core.autocrlf=false`, `core.eol=lf`, `core.safecrlf=false`, node v24.19.0. Clone: `C:\Users\snewt\AppData\Local\Temp\wg0044-grok-tip`. Each command's process exit code:

| Command | Exit | Observed result |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_sim_loader.js` | 0 | `RESULT: 7 passed, 0 failed` |
| `node tools/test_32_levels_generation.js` | 0 | `Results: 9 passed, 0 failed.` |
| `node tools/test_geology_strata.js` | 0 | `RESULT: 10 passed, 0 failed (exit 0)` |
| `node tools/test_new_game_year0.js` | 0 | `SETUP CONTRACT PASSED: 30 gating checks, 15 mutants caught` |
| `node tools/sim/test_units.js` | 0 | `RESULT: 7 passed, 0 failed` |

`test_sim_loader.js` at the tip (trimmed):

```text
PASS vm_loader_loads_ledger - resolve("ledger") = C:\Users\snewt\AppData\Local\Temp\wg0044-grok-tip\game\js\sim\ledger.js; exports createLedger: function; same object as Node's require: true; resolve("hydro") = ...\hydro\index.js; sandbox require left alone: true
PASS missing_module_throws - threw DEUS_SIM_MODULE_MISSING: ...; "../plugins/DEUS_World" -> TypeError; no host -> UF.Sim.require("ledger"): no such sim module; tried nothing (no require in this host)
PASS every_vm_harness_installs_hook - 49 hits in 937 files; without the hook: none; planted harness found by the scan: true, refused: true; hooked fixture accepted: true
PASS scan_finds_known_harnesses - 49 hits; known hits missing: none; excluded files found: none; fixtures classified wrong: none
PASS opener_registry - order Air, core, water; duplicate "core": UF.Sim.registerMatterOpener: "core" is already registered; bad fn: TypeError; empty name: TypeError; registry after a caller emptied its copy: 3; UF.Levels at register: undefined
PASS grid_pinned_by_hook - fallback-3 fixture: {} -> 1x1, grid "shipped" -> 3x3, AreasX "2" -> 2x1, PluginManager set after install -> 1x1, legacy UF_World AreasX "4" -> 4x1; real DEUS_World.js -> 1x1; grid "3x3" refused: true
PASS nwjs_loader - run_tests exit 0; 5 sim_loader PASS lines; no FAIL/ERROR lines; log: 2026-10-01T13:41:42.011Z [SIM] UF.Sim.require("ledger") resolved C:\Users\snewt\AppData\Local\Temp\wg0044-nw-Yf0J6r\game\js\sim\ledger.js; expected C:\Users\snewt\AppData\Local\Temp\wg0044-nw-Yf0J6r\game\js\sim\ledger.js
RESULT: 7 passed, 0 failed
```

## 5. Fail-before at base `7f91efbb`

Separate clone, same autocrlf/eol/safecrlf settings, detached `7f91efbbfb7d21a99bfaef7cbcede6a87d53bf0d`. Overlaid only `tools/test_sim_loader.js`, `tools/lib/vm_sim_require.js`, and `tools/lib/vm_harness_scan.js` from `06ccf8ce` (`git checkout 06ccf8ce --` those three paths). `DEUS_World.js` and the harnesses stayed at the base. `node tools/test_sim_loader.js` exit 1.

```text
FAIL vm_loader_loads_ledger - UF.Sim.require is missing after DEUS_World.js loads
FAIL missing_module_throws - UF.Sim.require is missing after DEUS_World.js loads
FAIL every_vm_harness_installs_hook - 49 hits in 937 files; without the hook: <48 harness paths>; planted harness found by the scan: true, refused: true; hooked fixture accepted: true
PASS scan_finds_known_harnesses - 49 hits; known hits missing: none; excluded files found: none; fixtures classified wrong: none
FAIL opener_registry - UF.Sim.registerMatterOpener / matterOpeners missing after DEUS_World.js loads
PASS grid_pinned_by_hook - fallback-3 fixture: {} -> 1x1, grid "shipped" -> 3x3, AreasX "2" -> 2x1, PluginManager set after install -> 1x1, legacy UF_World AreasX "4" -> 4x1; real DEUS_World.js -> 1x1; grid "3x3" refused: true
FAIL nwjs_loader - run_tests exit 1; 0 sim_loader PASS lines; problems: FAIL sim_loader.uf_sim_present - UF.Sim from DEUS_World.js; log: no [SIM] ledger line; expected C:\Users\snewt\AppData\Local\Temp\wg0044-nw-YtM5DM\game\js\sim\ledger.js
RESULT: 2 passed, 5 failed
```

The five checks the brief says fail on main failed. The "without the hook" list is 48 files. The 49th hit is the overlaid `tools/test_sim_loader.js`, which does install the hook. `scan_finds_known_harnesses` and `grid_pinned_by_hook` pass at the base because they test the overlaid libs and a fixture; the base `DEUS_World.js` grid default is already 1.

## 6. Mutants

Same clone settings, detached `06ccf8ceb72dec04f377aa25849518be338585d3`, directory `C:\Users\snewt\AppData\Local\Temp\wg0044-grok-mut`. Each run used `--only=vm_loader_loads_ledger,missing_module_throws,every_vm_harness_installs_hook,scan_finds_known_harnesses,opener_registry,grid_pinned_by_hook` so the six headless checks ran and `nwjs_loader` did not. The mutants edit source in memory; they do not change the snapshot's on-disk plugin, so an NW.js boot would not exercise them. Each process exit code was 1. The other five headless checks passed in each run.

| Mutant | Exit | Check that failed | Observed detail |
|---|---|---|---|
| `return_null_on_missing` | 1 | `missing_module_throws` | `returned null instead of throwing` |
| `fixed_list_scan` | 1 | `every_vm_harness_installs_hook` | `10 hits in 10 files; without the hook: none; planted harness found by the scan: false, refused: true` |
| `unpinned_grid` | 1 | `grid_pinned_by_hook` | `fallback-3 fixture: {} -> 3x3, grid "shipped" -> 3x3, AreasX "2" -> 2x3, PluginManager set after install -> 3x3, legacy UF_World AreasX "4" -> 4x3; real DEUS_World.js -> 1x1` |

`fixed_list_scan` fails because the planted harness is not in the fixed list, which is the provocation the brief requires. `unpinned_grid` leaves the real file at 1x1 because that file's JS fallback is still 1; the fallback-3 fixture is what turns the check red.

## 7. Harness base-vs-tip evidence

Read `tasks/WG.00.44/lane-db/evidence/harness_base_vs_tip.txt` and compared it to a scan of this tip. I did not re-execute those 49 runs.

- 49 data rows. 0 rows where the base exit code differs from the tip exit code. Every row's `same` column is `yes`.
- Exit codes: 27 rows at 0, 20 rows at 1, 2 rows at 2 (both are `tools/bench_vertical_worldgen.js`).
- 48 distinct files. `tools/bench_vertical_worldgen.js` is recorded twice (`--runs 1 --runtime both`, and `--selftest`).
- Those 48 files are exactly the scan hits minus `tools/test_sim_loader.js`. That file is new at the tip, so it has no base exit. The gate in section 4 runs it (exit 0).
- Rows that were already non-zero at `7f91efbb` are the same non-zero at the tip. The file's trimmed failure text matches the pre-existing failures named in `REPORT.md` (History load order, Scene_Map, `legacy_flooding_compatibility`, `sky_cap_empty_z12`, and the others listed there). This review did not re-open those failures.

## 8. NW.js proof

Independent run, section 4: `nwjs_loader` passed, `run_tests` exit 0, 5 `sim_loader` PASS lines, no FAIL/ERROR lines. The log line names the snapshot path:

```text
2026-10-01T13:41:42.011Z [SIM] UF.Sim.require("ledger") resolved C:\Users\snewt\AppData\Local\Temp\wg0044-nw-Yf0J6r\game\js\sim\ledger.js
```

That path is the snapshot's `game\js\sim\ledger.js`, which is what the check expected.

Writer evidence, opened and read in this session:

- `tasks/WG.00.44/lane-db/evidence/nwjs_game_runtime_sim_lines.txt` contains `2026-10-01T12:45:37.867Z [SIM] UF.Sim.require("ledger") resolved C:\Users\snewt\AppData\Local\Temp\wg0044-nw-mmkcPk\game\js\sim\ledger.js` after the core load line.
- `tasks/WG.00.44/lane-db/evidence/nwjs_sim_loader_results.txt`: `PASS sim_loader.uf_sim_present`, `ledger_resolved_from_game_folder`, `ledger_loaded`, `missing_module_throws`, `no_console_errors` ("none since TEST_SimLoaderConsole loaded (plugins.js index 0)"), `RESULT: 5 passed, 0 failed (exit 0)`.
- Screenshot `tasks/WG.00.44/lane-db/evidence/nwjs_sim_loader_map.png`, opened: a grass field, many rows of colonists with small green bars, a red banner with a gold emblem on a pole near the middle of the crowd, the level control reading "Ground", "1x Speed", a zoom panel at "1.0x" with "Normal" selected, "Explored: 3% (1793 cells)", and the bottom letter toolbar. The picture shows the snapshot reached the map. The loader proof is the log line above, not the picture.

Not run in the RMMZ editor Playtest (F5). The brief asks for the NW.js `--uf-test` line (Class C). That was observed.

## 9. Notes

No blocking or major findings.

1. `git diff --check` is not clean. `evidence/harness_base_vs_tip.txt` has trailing whitespace on rows whose failure column is empty. `REPORT.md` says the check was clean. The exit codes in that file still match, and this review's parse of them is in section 7.
2. `every_vm_harness_installs_hook` is a static bind-and-call check. It does not prove each `install` receives the sandbox the plugins run in. The spot checks in section 3 and the unchanged exit codes in section 7 are the evidence that the hook is on the loaded context. `tools/bench_history_demographics.js` is a hit that only hashes `DEUS_World.js`; the hook there has nothing to change. The brief counts that file.
3. A missing module's `tried` list includes `<cwd>/game/js/sim/...` even when cwd is already the game folder, so the message names `game\game\js\sim\...`. The two real paths are present, the check requires those, and the extra path does not exist. The docs describe the three bases.
4. Harnesses that were already failing at `7f91efbb` are still failing for the same recorded reasons. They are outside this lane's repair scope (`test_round_world.js` and `test_seamless_map_edges.js` got the hook line only).
5. This review did not re-run the 49 harness rows. It parsed the committed evidence and checked the file set against a fresh scan.

## 10. Conclusion

The tip adds one sim loader that throws on a missing module, a matter-opener registry on `UF.Sim`, and a vm hook in every harness the mechanical scan finds. The six gate commands pass in a fresh `core.autocrlf=false` clone of `06ccf8ceb72dec04f377aa25849518be338585d3`. The five checks that must fail without `UF.Sim` and without the harness hooks fail at `7f91efbb`. Each of the three mutants turns its named check red and exits 1. The NW.js run resolves `ledger.js` from the snapshot game folder and reports no console errors.

VERDICT: CLEAN PASS
