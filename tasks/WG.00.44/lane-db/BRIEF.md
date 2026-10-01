# lane-db: One sim-module loader, the matter-opener registry, and a vm hook in every harness found by a mechanical scan

| Field | Value |
|---|---|
| WBS | WG.00.44 (NEW) |
| taskId (manifest) | WG.00.44 |
| Branch | `task/lane-db` |
| Manifest | `tasks/WG.00.44/lane-db/lane.json` (copy of `lane.json` beside this brief) |
| Writer -> reviewer | claude -> grok |
| Size | M |
| Wave | 2 of 19 |
| Dependencies | lane-da (w1; merged at `2f504c62`) |
| RMMZ editor must be closed | no |

Plan: the DEC-058 natural-world build plan of 2026-09-30, as amended by WORK-GATE G02 and the D1 reconciliation (WBS Rev 34). That file sits in the PM's session scratchpad, which is temporary and which writers in other CLIs or worktrees cannot see, so the plan text this brief relies on is quoted under "Plan excerpts" at the end. Base: `main` at the wave-2B launch commit, which holds every wave-1 merge (lanes ex, en, dn, ez, el and da, after the prune lanes cu and ct; lane-da merged at `2f504c62`) and WBS Rev 34 (`0b4a0689`) or later. At the post-approval prep (2026-10-01) main was `68483d99`, which also holds the wave-2A merges of lanes fd, ed and ea and WBS Rev 36. Pin the SHA you actually start from in your launch record (WORK-GATE wave 2B, CROSS-LANE). Rerun every guard and keep-green suite at your own base before you claim FAIL-before or PASS-after. Draft measurements are not current proof (G02 section 4; plan risk 17).

## Goal

The game and every headless harness load a pure game/js/sim module through UF.Sim.require(name); a missing module throws naming the tried paths, never null. UF.Sim also holds the New-Game matter-opener registry. Every vm harness that loads DEUS_World, DEUS_WorldGen, DEUS_Levels or DEUS_Fluid installs one hook, found by a mechanical scan the check re-runs; the hook keeps harness grids at 1x1 unless the harness asks for the shipped grid.

## Scope

- Manifest tasks/WG.00.44/lane-db/lane.json, branch task/lane-db, writer claude, reviewer grok; allowedPaths = files; GATE lines as gateTests.
- UF.Sim.require in DEUS_World.js beside UF.Space; resolves game/js/sim/<name>; no fallback copy, no silent null (unlike `loadHydroModule`, DEUS_Fluid.js:1032-1043 at `68483d99`).
- NEW UF.Sim.registerMatterOpener(name, fn) and UF.Sim.matterOpeners() (sorted by name; duplicate name throws) in DEUS_World.js (plugins.js index 5), so DEUS_WorldGen (index 6) can register at plugin load while UF.Levels (index 35) does not exist yet. lane-dv runs them; lane-dl registers the core.
- NEW tools/lib/vm_sim_require.js install(sandbox, opts): resolves UF.Sim.require in the vm and wraps the sandbox PluginManager.parameters so DEUS_World reads AreasX/AreasY '1' when the harness passes none (today's behaviour); opts.grid 'shipped' opts out (grid tests only).
- NEW tools/lib/vm_harness_scan.js: a hit is a tools/**/*.js file that creates a vm context (require('vm'), runInContext, runInNewContext, createContext, new vm.Script) and evaluates a whole target plugin file (DEUS_World, DEUS_WorldGen, DEUS_Levels or DEUS_Fluid) in it. Whole-plugin source transformed for a mutant counts (for example the `--mutant=checksum_all_levels` run of tools/test_32_levels_generation.js), and so does a plugin loaded through a module-name list: a quoted plugin id or file name, or a quoted bare name ('World', 'WorldGen', 'Levels', 'Fluid') in a list it prefixes with DEUS_ or reads from game/js/plugins/. A harness that evaluates only a source slice of a target plugin is not a hit. This is a general rule, not a file-name exemption; on main today one harness falls under it, tools/sim/test_units.js, which runs only the UF.Space block of DEUS_World.js (WORK-GATE wave 2B, lane-db change 1; P2). World-double harnesses (test_autonomous_project_dispatch, test_project_construction_loop, test_settlement_projects, test_survival_needs_loop) load no plugin and are not hits.
- Install the hook in every harness the scan finds at your actual lane base (files list). The check re-runs the scan, so the hit list at your base is the acceptance, not a fixed count. Survey history, kept as measurements: the plan's 43 on main 534ef734; 49 under the draft rule on main 89a4bc52; 48 under the rule above on main 89a4bc52 and again on main 68483d99, the difference being tools/sim/test_units.js. Five whole-plugin harnesses reached main after the plan's survey: `tools/test_sparse_outer_save.js` (lane-da, `2f504c62`), `tools/test_natural_connections_no_mint.js` (lane-el, `fa482001`), and `tools/test_extraction_difficulty.js`, `tools/test_resource_node_materials.js` and `tools/test_z_flora.js` (OPS.PRUNE.02, lane-co, `2bf927da`, which retargeted them from the `UF_*` loadScript shims to `DEUS_WorldGen.js`, and two of them also to `DEUS_Levels.js`). If your base holds a whole-plugin harness that is not in allowedPaths, stop and ask the PM for a scope amendment; do not exempt it from the scan (WORK-GATE wave 2B, CROSS-LANE). Every later lane that adds such a harness installs the hook and gates on tools/test_sim_loader.js.
- `tools/sim/test_units.js` is not a scan hit and is not in allowedPaths: this lane never edits it. It cuts the `UF.Space` block out of `DEUS_World.js`, from `const Space = {` (line 335 at `68483d99`) to the `Space.Z_STEP_FEET` line (416), with a regex, and runs that text alone in an empty vm context (`tools/sim/test_units.js:16-24`). Because this lane edits `DEUS_World.js`, the unchanged test is one of its keep-green gates (Guards): keep `UF.Sim` outside that span; `window.UF.Space = Space;` is at line 458 (WORK-GATE wave 2B, lane-db changes 1 and 3).
- `tools/test_32_levels_generation.js` as lane-da left it: the vm loads `DEUS_World.js`, `DEUS_WorldGen.js` and `DEUS_Levels.js` in one loop (lines 83-87 at `2f504c62`, unchanged at `68483d99`), and its `--mutant=checksum_all_levels` switch rewrites the Levels source before that loop (lines 13-29). Its checks are lane-da's WG.00.43 set (`core_entries_only` through `no_entry_for_unchanged_plus_10`, lines 114-144).
- Do not repair test_round_world.js or test_seamless_map_edges.js (Scene_Map ReferenceError on main; rechecked at 89a4bc52, where both stop at `DEUS_World.js:3271` with `Scene_Map is not defined`); only add the hook line.

## Out of scope

- Loading any particular module (consumer lanes)
- Repairing broken harnesses
- DEUS_Core's companion loader
- Running openers (lane-dv)

Anything not in Scope is out of scope (AGENTS.md Rule 1). Ideas go to the PM, not into this branch.

## Files this lane may touch (allowedPaths)

- `game/js/plugins/DEUS_World.js`
- `tools/lib/vm_sim_require.js`
- `tools/lib/vm_harness_scan.js`
- `tools/test_sim_loader.js`
- `docs/systems/DEUS_World.md`
- `tools/bench_history_demographics.js`
- `tools/bench_history_sim.js`
- `tools/bench_species_biology.js`
- `tools/bench_underground_gen.js`
- `tools/bench_vertical_worldgen.js`
- `tools/capture_pre_migration_baseline.js`
- `tools/dev/sim_forward.js`
- `tools/performance/census_boot_load.js`
- `tools/profile_historical_demographics.js`
- `tools/sim/test_fluid_attach.js`
- `tools/sim/test_living_world_rules.js`
- `tools/sim/test_sim_forward_guard.js`
- `tools/sim/test_underground_year0.js`
- `tools/society/test_person_identity.js`
- `tools/test_19b_performance_determinism.js`
- `tools/test_32_levels_generation.js`
- `tools/test_bag_and_racial_banners.js`
- `tools/test_combat_dying_integration.js`
- `tools/test_deep_cuts_and_mountain_cap_wg0041.js`
- `tools/test_duplicate_registration.js`
- `tools/test_extraction_difficulty.js`
- `tools/test_faction_starting_gear.js`
- `tools/test_fluid_correctness_lane_cw.js`
- `tools/test_generated_z2_cut_proof.js`
- `tools/test_geology_strata.js`
- `tools/test_hist_metadata_contracts.js`
- `tools/test_historical_carrying_capacity.js`
- `tools/test_history_materialization_and_world_age.js`
- `tools/test_liquid_depth_simulation.js`
- `tools/test_native_survival_soak.js`
- `tools/test_natural_connections_no_mint.js`
- `tools/test_new_game_year0.js`
- `tools/test_production_history_demographics.js`
- `tools/test_region_seam_continuity.js`
- `tools/test_resource_node_materials.js`
- `tools/test_round_world.js`
- `tools/test_seamless_map_edges.js`
- `tools/test_sparse_outer_save.js`
- `tools/test_starter_kit_and_stockpile.js`
- `tools/test_strata_cuts_and_caves.js`
- `tools/test_strata_fluid_reconciliation.js`
- `tools/test_strata_foundation.js`
- `tools/test_survival_regressions.js`
- `tools/test_volumetric_terrain_column.js`
- `tools/test_worldgen_quickfixes.js`
- `tools/test_z_flora.js`
- `tools/worldgen/test_vertical_biome_coupling.js`
- `tools/zrange/bench_queries.js`
- `tools/test_area_generation_speed.js`
- `tasks/WG.00.44/lane-db/**`

merge_gate refuses the merge (SCOPE_VIOLATION) if the branch changes any other path.

`tools/test_area_generation_speed.js` is listed for one conditional purpose only: installing the hook after lane-dc has merged (see the handoff exception under "Shared files and merge order"). If lane-db merges first, it does not create or edit that file.

### Shared files and merge order

- `game/js/plugins/DEUS_World.js`: after (first writer); before lane-dm (w3), lane-de (w4)
- `docs/systems/DEUS_World.md`: after (first writer); before lane-de (w4)
- `tools/test_32_levels_generation.js`: after lane-da (w1; merged at `2f504c62`); before (last writer)
- `tools/test_sparse_outer_save.js`: after lane-da (w1; merged at `2f504c62`, which created it); before (last writer). lane-dd (w3) gates on it.
- `tools/test_natural_connections_no_mint.js`: after lane-el (w1; merged at `fa482001`, which created it); before (last writer). lane-em (w18) gates on it.
- `tools/test_area_generation_speed.js`: created by lane-dc (w2, parallel with this lane); this lane writes it only under the one-file handoff exception below. lane-dd (w3) and lane-df (w4) gate on it.
- `tools/sim/test_living_world_rules.js`: after (first writer); before lane-dr (w3)
- `tools/test_geology_strata.js`: after (first writer); before lane-df (w4)
- `tools/test_region_seam_continuity.js`: after (first writer); before lane-dg (w10)
- `tools/test_strata_fluid_reconciliation.js`: after (first writer); before lane-ec (w7), lane-eg (w14)
- `tools/test_fluid_correctness_lane_cw.js`: after (first writer); before lane-ec (w7)
- `tools/test_liquid_depth_simulation.js`: after (first writer); before lane-ec (w7)
- `tools/sim/test_fluid_attach.js`: after (first writer); before lane-ec (w7)

Start from a base that already holds every earlier writer of these files, and do not start while an earlier writer's lane is unmerged (plan, Hot-file ownership order; see Plan excerpts).

**One-file handoff exception (WORK-GATE wave 2B, P1 as corrected by the judge).** lane-db and lane-dc run in parallel. For `tools/test_area_generation_speed.js` only, the sentence above does not make either lane wait for the other; every other row above keeps the rule, and no other hot-file order changes.

- If lane-dc merges first: lane-db merges origin/main into its branch (a normal merge, no rebase) and then installs only the vm hook in `tools/test_area_generation_speed.js`, which is in lane-db's allowedPaths for that purpose only, so that `tools/test_sim_loader.js::every_vm_harness_installs_hook` passes at lane-db's tip.
- If lane-db merges first: lane-db does not create or edit `tools/test_area_generation_speed.js`. lane-dc merges origin/main into its branch (a normal merge, no rebase), installs lane-db's hook in its own speed harness, and the PM adds `node tools/test_sim_loader.js` (timeoutSec 900) to lane-dc's gateTests by a `[pm]` manifest commit before lane-dc's final review. The PM then reruns the manifest and registry validation.
- Either way the second merger completes this integration before its final independent review and answerability check. An earlier review does not cover the integration changes.

**Combined runs (WORK-GATE wave 2B, P5).** merge_gate tests each branch tip, not the merge result. Before the second of lane-db and lane-dc merges, and before the second of lane-db and lane-do merges if lane-do is still open (lane-do gates on two harnesses this lane edits), the PM runs the union of both lanes' current gate sets on the exact combined candidate (main plus the second tip) and records the main, branch and candidate SHAs, every command, its exit code and the clone settings. A change to any input of the candidate makes that evidence stale. Even apart from the handoff file, lane-db edits lane-dc's keep-green harnesses while lane-dc changes `DEUS_Levels.js`, which lane-db's gates load, so two green branch tips are not enough.

## Tests

Named checks from the plan. `FAILS on main` means the check must be shown failing at the lane base and passing at the tip (AGENTS.md Rule 4); where a script line says `(all FAIL on main)` or `(FAILS on main)` before its first check, every check listed under it counts. Mutants and provocations must each turn their named check red.

### Must fail without the change

- NEW tools/test_sim_loader.js::vm_loader_loads_ledger - FAILS on main (no UF.Sim)
- `tools/test_sim_loader.js` ::missing_module_throws - FAILS on main
- `tools/test_sim_loader.js` ::every_vm_harness_installs_hook (runs vm_harness_scan.js at test time; every hit installs the hook) - FAILS on main
- `tools/test_sim_loader.js` ::opener_registry - FAILS on main
- `tools/test_sim_loader.js` ::nwjs_loader (NW.js --uf-test on a snapshot resolves from the game's working directory) - FAILS on main

### Mutants and provocations

- Mutants return_null_on_missing, fixed_list_scan (a planted fixture harness without the hook must fail every_vm_harness_installs_hook), unpinned_grid

### Guards (pass before and after)

- `node tools/sim/test_units.js` (keep-green, read-only for this lane): the unchanged test passes at your actual base and at the tip. It reads the `UF.Space` span of `DEUS_World.js`, the file this lane edits (WORK-GATE wave 2B, lane-db change 3).

### Other named checks (pass at the tip)

- `tools/test_sim_loader.js` ::scan_finds_known_harnesses (includes test_new_game_year0, test_worldgen_quickfixes, sim/test_underground_year0, test_fluid_correctness_lane_cw, worldgen/test_vertical_biome_coupling, society/test_person_identity, sim/test_sim_forward_guard, dev/sim_forward, bench_underground_gen, bench_vertical_worldgen; excludes the four World-double harnesses and the source-slice-only harness sim/test_units.js; WORK-GATE wave 2B, lane-db change 1). The planted-harness provocation (mutant fixed_list_scan, under every_vm_harness_installs_hook) stays.
- `tools/test_sim_loader.js` ::grid_pinned_by_hook (a harness passing {} reads AreasX 1 through the hook even against a fixture copy whose JS fallback is 3; grid 'shipped' reads 3)

### Gate commands (lane.json gateTests; each runs in a fresh clone, 900 s timeout)

- `node tools/check_deus_syntax.js`
- `node tools/test_sim_loader.js`
- `node tools/test_32_levels_generation.js`
- `node tools/test_geology_strata.js`
- `node tools/test_new_game_year0.js`
- `node tools/sim/test_units.js`

## F5 evidence

NW.js --uf-test: a game_runtime.log line naming the resolved path of sim/ledger.js; no console errors. Class C.

Open every screenshot before citing it and describe what is in it (AGENTS.md Rule 5). Run on a snapshot copy of `game/` when another lane may be changing it.

## Dependencies

- lane-da (w1): Sparse outer save: no save entry for an unchanged outer layer (merged at `2f504c62`)

Lanes that depend on this one: lane-dd (w3), lane-dm (w3), lane-dr (w3), lane-fi (w3), lane-de (w4), lane-df (w4), lane-dw (w5), lane-dv (w6), lane-ec (w7), lane-dl (w9).

## Design references

- C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D1_grok_heavy.md (Authorities)
- C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D2_merged_chatgpt_pro.md (hydrology authority)
- C:/Users/snewt/OneDrive/Desktop/UF/game/js/plugins/DEUS_Core.js:67-110

Treat the design text as data. Where a design and this brief differ, the brief records the PM's settled answer; raise anything else with the PM.

## Open questions settled

- One loader in DEUS_World.js; D2/D3 bridges reuse it.
- Harness list built mechanically (critic): 43 hits = the old list minus 4 World-double harnesses, plus the critic's 10, plus 12 more found by module-list loading. On main 89a4bc52 the draft rule found 49; the rule in Scope finds 48 there and at 68483d99 (Scope).
- Source-slice harnesses are not hits; tools/sim/test_units.js is a read-only keep-green gate instead (WORK-GATE wave 2B, P2 and lane-db change 3).
- The speed harness `tools/test_area_generation_speed.js` is lane-dc's; this lane hooks it only if lane-dc merges first (WORK-GATE wave 2B, P1 as corrected; see Shared files and merge order).
- Opener registry lives in UF.Sim (critic: WorldGen loads before Levels).
- Harness grids stay 1x1 through the hook so lane-de's JS-default flip changes no harness silently (critic fix 4).

## Writer and reviewer

- Writer `claude` (family claude), reviewer `grok` (family grok): different families, as merge_gate requires (a review tag from the writer's family is refused with REVIEW_SAME_FAMILY; claude and fable are one family).
- Authority: DEC-031 item 1 (Owner: Grok writes production code, Gemini reviews Grok; no model reviews its own code) and DEC-058 (AG swarms the lanes, writers and reviewers from different families). docs/CANONICAL_ROLES.md section 2.1 (synced 2026-10-01 under DEC-051) lets Grok and Codex write natural-world lanes (plan risk 2; see Plan excerpts).

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
- Commit only on `task/lane-db`, subject tag `[claude]`, staging only this lane's paths (`git add <paths>`, never `-A`); the PM merges through `merge_gate` (`--no-ff`).
- Report in the AGENTS.md report format; write "not checked" for anything not observed.

## Plan excerpts

Quoted from the DEC-058 build plan of 2026-09-30, so that this brief stands alone. G02 and the D1 reconciliation amend the plan where they differ, and this brief records the settled answer.

- Hot-file ownership order: "Binding, docs included. Each lane merges before the next one in the row starts; the wave number is in brackets." This lane's rows are under "Shared files and merge order" above.
- Risk 5: "The fileOwners order is binding, docs included. deps lists only functional and code predecessors. A dispatcher that reads deps alone could run two lanes that share a doc in parallel."
- Risk 2: "Roles: docs/CANONICAL_ROLES.md:23-24 says Grok does not implement production engine code and Codex is bounded to tools/ and docs/telemetry/. ... Before wave 1 the PM records the CANONICAL_ROLES.md sync under DEC-051. If the PM does not, the fallback is to re-manifest the plugin-touching codex lanes ... and the grok lanes with claude writers." The sync is recorded on main (docs/CANONICAL_ROLES.md section 2.1, 2026-10-01).
- Risk 10: "Harness grids: lane-db's hook keeps every scanned vm harness at 1x1 unless the harness opts into the shipped grid, so lane-de's JS-default flip changes no harness silently. Trade-off: those harnesses no longer mirror the shipped 3x3. The 3x3 coverage comes from lanes dd, fi, de, fb and ff, plus lane-de's printed report of which gate harnesses fail at 3x3."
- Risk 11: "The mechanical scan finds 43 vm harnesses, not the 35 the critic implied. The critic's 10 are in, 12 more load plugins through module-name lists or DEUS_Fluid alone (e.g. bench_history_sim, test_bag_and_racial_banners, sim/test_fluid_attach, test_liquid_depth_simulation), and 4 World-double harnesses were dropped. Every later lane that adds a plugin-loading vm harness must install the hook and gate on tools/test_sim_loader.js." That count is from main 534ef734; for the later counts see Scope.
- Risk 16: "Checks already red on main, not used as gates until fixed: test_region_seam_continuity sky_cap_empty_z12 (lane-dg fixes it); test_round_world.js and test_seamless_map_edges.js (Scene_Map ReferenceError); test_liquid_depth_simulation legacy_flooding_compatibility (lane-ec); tools/zrange/scan_z_literals.js; build_catalogue --check (lane-er rebuilds it); test_vertical_biome_coupling, test_ecology and test_upper_elevation_terrain."
- Risk 17: "Draft baselines were measured on older mains ... Every lane re-runs its keep-green suites at its own base before claiming FAIL-before/PASS-after."
