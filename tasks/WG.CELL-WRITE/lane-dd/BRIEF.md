# lane-dd: Lazy area generation, per-area checksums and the levels:areaGenerated event

| Field | Value |
|---|---|
| WBS | WG.CELL-WRITE (SHARED; merged D2/D3 CELL), part 3 of 15; deliverable WG.00.46 (`docs/worldgen/DEUS_WORLDGEN_WBS.md:135`) |
| taskId (manifest) | WG.CELL-WRITE |
| Branch | `task/lane-dd` |
| Manifest | `tasks/WG.CELL-WRITE/lane-dd/lane.json` (the PM installs it; draft below) |
| Writer -> reviewer | grok -> codex |
| Size | M |
| Wave | 3 of 19 |
| Dependencies | lane-dc (merged `062e7e65`), lane-db (merged `1899d5ea`) |
| RMMZ editor must be closed | no |

Base: `main` at `6ee18bf4` or later; it holds lane-da `2f504c62`, lane-db, lane-dc, lane-dm `f01d0454` (the shared tick) and lane-do2 `968ac67c`. Pin the SHA you start from in your report. Every figure below is the PM drafter's one run at `6ee18bf4` in a clean clone; rerun every guard and keep-green suite at your own base before you claim FAIL-before or PASS-after.

**Merge condition (DEC-065 item 1).** This lane may be dispatched and reviewed now. It cannot be MERGED until the Owner has accepted or rejected the narrowing of his 2026-09-29 request ("I also want to generate all 32 layers on world generation, im tired of not seeing that done", commit `a8c1e62a`, relayed by AG) in a line on main (an amendment under DEC-065 or an Owner decision entry). The PM merges only after that line exists. If the Owner rejects the narrowing, eager generation of all 32 levels of every area at New Game stays an acceptance rule and the PM rewrites this brief; do not build for that case.

**Measured at the lane base (DEC-065, PM, 2026-10-02 ~00:20Z):** the shipped-grid (1x1) New Game takes 2,734 ms (second run 2,717 ms), seed 424242, main `f01d0454`, by `node tools/test_new_game_year0.js` Section C: a headless New Game through the real Core, World, WorldGen, Factions, History, Levels, Dnd5e, Callings and HistoricalDemographics plugins (72 units founded), three Codex workers running, so an upper bound. The drafter's run at `6ee18bf4` printed 3,153 ms. It is not the NW.js New Game (scene and tileset load). This lane prints the same figure at its base and at its tip, and on an explicit 3x3 grid: the total time, the areas generated, which of them hold faction homes, which request generated each, and the median ms per area (Tarea).

## PM rulings at dispatch (2026-10-02, PM; the drafter's "PM to confirm" items)

Base: `main` after lane-gp merged (its `tools/test_sim_loader.js` and speed-harness fixes make this lane's gates green at the base). Pin the SHA you start from.

1. The sim-hook edit of `tools/test_area_generation_speed.js` was done by lane-gp. That file is **not** in this lane's allowedPaths; do not touch it. Your harness `tools/test_lazy_area_generation.js` installs the hook as the brief says.
2. New fixture `tools/fixtures/levels/area_checksums_gen5_3x3.json`: confirmed.
3. Record `levels[z].areaSums`, core levels only: confirmed.
4. Legacy multi-area saves: one all-area verify at load, then per-area records and migration `WG.00.46`: confirmed.
5. Tarea and the DEC-065 bound: the check `new_game_3x3_cost_bound` judges the **Levels-attributable** time: the sum of per-area `ms` in `stats().areaGenerations` at 3x3 must be at most T1x1_levels + k x Tarea, where Tarea is the median per-area generation `ms` of the same run and k the areas built. The whole-run New Game times (T(1x1), T(3x3), homes, requesters) are printed and recorded, not judged: the drafter measured 15 s at 3x3 of which Levels is about 0.7 s per area; the rest is Factions and History work outside this lane. The PM puts the literal DEC-065 bound to the Owner as an open question; it does not block this lane.
6. The three added gates (`test_32_levels_generation`, `test_new_game_year0`, `zrange/scan_z_literals`): confirmed.
7. No checksum contributor API in this lane: confirmed.
8. Trace switch `UF.Levels.traceAreaRequests(true)`: confirmed.
9. Gate time: a target of 600 s for `test_lazy_area_generation.js`, printed in the report; not a failing check.
10. The Owner's acceptance of the narrowing of "all 32 layers" is a **merge** condition held by the PM, not something this lane supplies. Build and push; the PM holds the merge until the Owner answers.
11. Verdicts: `CLEAN PASS`, `PASS` and `PASS WITH MINORS` are all accepted by merge_gate since lane-gk merged.
12. **The simulation, never the view, drives generation (Owner, 2026-10-02: societies must develop in parallel).** Add the check `offscreen_request_generates_area`: at 3x3, a request from a non-viewed area made by simulation code (a faction or colonist action, not the player's view or a map load) generates that area at once, in the same call, and `stats().areaRequests` names the requesting plugin; a mutant that defers or refuses generation for areas outside the view (`view_gated_generation`) must fail it. No code path may make generation depend on `viewLevel()` or the camera.

## Goal

At New Game Levels itself generates only the start area. Any other area is generated once, by the request that needs its floor (a faction home, founders, a camp), and demand stays keyed by (area, z). Generator 5 still builds an area's 32 levels in its one `volumeOf` pass (outer levels are UNIFORM chunks). Per-area core checksums are recorded on first generation and checked on regeneration. `levels:areaGenerated {ax, ay, gen}` fires once per area per world state and is held during a load until World.state is restored. Every generator's output stays byte for byte the same (lane-dc's fixture). No faction starts late (DEC-070 condition A) and an area built later equals one built at New Game (condition B).

## Preconditions (checked by the drafter at `6ee18bf4`)

1. Eager generation: `ensureWorldLevels` (`game/js/plugins/DEUS_Levels.js:4674`) calls `baseline(z, ax, ay)` for every area of every level (:4687) and writes the all-area `L.checksum = checksumOf(z)` (:4690). `checksumOf` (:1135) chains every area; `strataHash` is :1185. `volumeOf` (:2586) is the one area generation: cache `volumes` (:2580), kept = max(3, areas) (:2621), `stats.generated += core.length` (:2605). `baseline` (:1104) keeps 12 baseline objects (`baselines`, :633).
2. Load: `verifyLevels` (:4744) regenerates every area through `checksumOf(z, undefined, undefined, st)`. Levels' `DataManager.extractSaveContents` wrapper (:4762-4770) calls the earlier wrapper, then migrates and verifies. World's wrapper sets `World.state = contents.ufWorld` at `DEUS_World.js:3498` (wrapper :3495). Levels loads after World, so its wrapper runs after the restore; a wrapper installed earlier than World's runs before it.
3. No area event exists. Levels emits through `emit` (:287). `stats()` (:5364) is a JSON copy of `stats` (:634). `checksum` (:5331) is public and the sparse-save and lane-dc gates call it: keep its meaning.
4. `complete_at_start` (:5820) is the in-plugin check (suite `vertical`); its text says every level of the range is made at New Game.
5. Home areas: `DEUS_Factions.js:126-127,175-183` rolls a distinct non-start home area per faction in a multi-area world and :247 moves the player's home to the start area. `Factions.placeAreas` asks Levels for pockets (`habitablePockets`, :485 and :810): that request generates a home area.
6. Harness: `tools/test_new_game_year0.js:39` lists the nine New Game plugins, `loadRuntime` (:281) installs the hook (:305), `runSectionC` (:339-359) times plugin load plus `World.newWorld`. `tools/lib/vm_sim_require.js` pins an unspecified AreasX/AreasY to 1 and keeps explicit values: a 3x3 case passes them through its `PluginManager.parameters` at plugin load (not after) and asserts the world's dimensions. `UF.Sim.tickCount()` (`DEUS_World.js:594`) is 0 until the clock arms when `world:created` returns. **Levels' world hooks are not installed in these harnesses:** `hookWorld` (:5375) runs from the `Scene_Boot.start` wrapper (:5421-5425), no vm harness starts a scene, so `ensureWorldLevels` never runs at `world:initializing` there (probe, full set, 1x1: `stats.initMs` undefined; the first Factions or History request builds the area). The game does run it. The new harness must run the game's flow: after the plugins load, call `Scene_Boot.prototype.start` once (with the NEW_GAME stub the call throws after `hookWorld` has registered the listeners: catch it).
7. Drafter's probe at `6ee18bf4`, full plugin set, seed 424242, this host, `World.newWorld` only (plugin load is 30 ms): 1x1 takes 2.7-2.8 s without the boot hook (the PM's 2,734 ms) and 2.8-2.9 s with it, one area built (`stats.generated` 5, `genMs` 0.72-0.80 s). 3x3 without the hook takes 15.0-15.1 s with 8 areas built (`genMs` 5.3 s): the nine factions' homes fill (1,1), (2,0), (2,1), (0,2), (0,0), (0,1), (1,2), (2,2) and area (1,0) holds none. 3x3 with the hook takes 18.6 s, all nine built by `ensureWorldLevels` (45 baselines, `genMs` 6.4 s). Mean generation is 0.7 s per area, but each extra area costs 1.7-1.8 s of New Game (a CPU profile shows `valueNoise` in DEUS_WorldGen.js, the `World()` accessor in DEUS_Levels.js and History/Factions work), so DEC-065's bound with Tarea = the same run's median generation ms (about 8.5 s here) fails at base: see the guard below (PM to confirm).
8. **Two gates are red at base, not through this lane:** `node tools/test_area_generation_speed.js` exits 1 in 74 ms (`UF.Sim.require("host/tick")`: no host; DEUS_World arms the tick clock in `newWorld` since lane-dm, and lane-dc's harness never installed lane-db's hook; the one-file handoff in lane-dc's brief was not completed before dc merged) and `node tools/test_sim_loader.js` fails `every_vm_harness_installs_hook` (6 passed, 1 failed; it names that file). This lane fixes both by the hook-only edit in Scope. With exactly those two lines in a scratch copy the drafter saw the hook check pass and the speed harness exit 0 (median cold area 3,443.9 ms, 175 s).
9. Green at base (one run each): `check_deus_syntax` 62 files 0 errors; `test_sparse_outer_save` 7/7 (13 s); `test_strata_cuts_and_caves` 30/30 (112 s; it failed twice inside merge_gate on 2026-10-01 while passing outside it, DEC-085 evidence, so a refusal there goes to the PM); `test_32_levels_generation` 9/9; `test_new_game_year0` exit 0 (18 s); `tools/zrange/scan_z_literals.js` exit 0; `test_deep_cuts_and_mountain_cap_wg0041` 11/11.

## Scope

- Manifest `tasks/WG.CELL-WRITE/lane-dd/lane.json`, branch `task/lane-dd`, writer grok, reviewer codex; the gate commands below are its gateTests.
- `ensureWorldLevels`: generate the start area only (`st.startArea`). The legacy all-area `L.checksum` is written only when the world has one area (it then equals the area's checksum; `test_32_levels_generation` and `test_sparse_outer_save` read it) and stays null in a multi-area world; `verifyLevels` already skips a null checksum.
- Per-area checksum: `areaChecksum(z, ax, ay, seed?, gen?, worldDesc?)`, public, same argument shape as `checksum`, folding one area's bytes in the order `checksumOf` uses, so that for a one-area world it equals `checksumOf(z)`. `checksumOf` keeps its exact byte order (at z 0 it folds every area's lattice, then every area's strata, :1135-1180) and shares the per-area helpers; its values do not change (lane-dc's fixture is the guard). Records: `st.levels[String(z)].areaSums = { "ax,ay": "<8 hex>" }` for the core levels -2..+2 only, written when an area is first requested in this world state, compared (never replaced) when a loaded world's recorded area is requested for the first time in the session. A mismatch: `console.warn`, `stats.checksumMismatches`, `levels[z].checksumMismatch = true`. No entry for any outer level (lane-da's sparse rule and `migrateSparseOuterSave` stay). PM to confirm the key name and shape.
- First request per world state: an O(1) check per `baseline()` call against a runtime-only set kept per world state (never saved, never a scan); the per-area hash runs once per (world state, area) per session (Rule 14). A new world with the same seed that finds the volume cached still records and fires for its own state: the event is once per world state, not once per cache fill.
- `levels:areaGenerated {ax, ay, gen}` through `emit`: once per (world state, area), at the first request that finds no saved record; a regeneration of a recorded area fires nothing. Events raised while Levels' extract wrapper runs are queued and flushed once, sorted by (ay, ax), after its restore, migration and checks, so no consumer runs before World.state is the loaded state. Document that boundary: lane-dv restores its matter host in an inner wrapper, before this flush. Consumers (later): lane-dl, lane-ef, lane-eg. DEC-070 condition C (whatever a lane registers at first build must be registered for every area at New Game, or caught up to the game time) is each consumer lane's to meet and prove; this event and these records are what they build on.
- Legacy saves (PM to confirm): a save whose core entries carry a string `checksum` still verifies. With one area that costs the area the load builds anyway. For a multi-area legacy save, verify once at load by the existing all-area `checksumOf`, then write the per-area records and push migration `WG.00.46` onto `st.migrations`: the one allowed all-area generation at load, for saves with a legacy checksum and more than one area (none ships: the shipped grid is 1x1 until lane-de). A new-form save never takes it. Report mismatches; never replace.
- `complete_at_start` (:5820) and the `five_levels` text: keep the allocation, early-initialization and idempotence assertions; say every level is available on request (generator 5's one volume holds all 32) and drop "every level of the range made" as a New Game requirement. Do not turn it into an unconditional PASS.
- Attribution: `stats().areaGenerations` always (`{ax, ay, gen, ms}` per area, in order) and, with `UF.Levels.traceAreaRequests(true)` (off by default; documented), `stats().areaRequests` (`{ax, ay, requester}`, the first non-Levels plugin file in the stack of that area's first generation, for example `DEUS_Factions.js`).
- NEW `tools/test_lazy_area_generation.js`: the nine NEW_GAME_PLUGINS, lane-db's hook installed (`const simHook = require("./lib/vm_sim_require");`, `simHook.install(env);` before the plugins load), explicit `AreasX`/`AreasY` "3" and an assertion of the world's dimensions; prints the DEC-065 figures; the named checks below; `--mutant=<name>` runs; `--capture-fixture`.
- NEW `tools/fixtures/levels/area_checksums_gen5_3x3.json` (PM to confirm the path): per-area core checksums, generator 5, seeds 18 and 20260927, 3x3, captured once from the eager order and accepted only if the all-area chain recomputed from the same volumes equals lane-dc's frozen value in `tools/fixtures/levels/core_checksums_gen1_5.json`. Normal runs never rewrite it.
- `tools/test_area_generation_speed.js`: the hook install only (the same two lines as above: the import at the top and `simHook.install(env);` in `makeEnv` before the plugin loop at :139); the binding form `tools/test_sim_loader.js:134-143` recognizes (an inline `require(...).install(env)` is not recognized). Timings, bounds and the fixture compare stay untouched (PM to confirm this one-file allowance).
- Docs: `docs/systems/DEUS_Levels.md` (rows :53, :54, :56, :64; Save data :285-292; Events :294-295; Checks :315-317) and `docs/systems/DEUS_ZRange.md` (section 6 :86, section 9 :137, section 10): the policy, the record, the event, the trace switch and the flush boundary. Checksum content stays the core strata bytes and the ground lattice; DEC-073 item 8 later adds designations, lair/den records, the depletion record and the notable registry and excludes spawned units: this lane adds no contributor API (PM to confirm); lane-fi, fe and ff keep their own record and parity test.

## Out of scope

- LOD for other areas (WG.00.28); pre-warming neighbours; the grid flip (lane-de); generator 6 (lane-dg); the matter host (lane-dv); other plugins' New Game work: report which plugins request areas at New Game (the attribution list), do not fix them; spawn and ecology work (lane-fi).
- Edits to dependency-owned tests or fixtures other than the hook install above. Anything not in Scope is out of scope (AGENTS.md Rule 1); ideas go to the PM.

## Files this lane may touch (allowedPaths)

- `game/js/plugins/DEUS_Levels.js`
- `tools/test_lazy_area_generation.js`
- `tools/fixtures/levels/area_checksums_gen5_3x3.json`
- `tools/test_area_generation_speed.js` (hook install only)
- `docs/systems/DEUS_Levels.md`
- `docs/systems/DEUS_ZRange.md`
- `tasks/WG.CELL-WRITE/lane-dd/**`

merge_gate refuses the merge (SCOPE_VIOLATION) if the branch changes any other path.

### Shared files and merge order

- `DEUS_Levels.js` and `docs/systems/DEUS_Levels.md` are written only by WG.CELL-WRITE parts, in order: lane-da (merged `2f504c62`) -> lane-dc (merged `062e7e65`) -> **lane-dd** -> lane-dw (w5) -> lane-dv (w6) -> lane-dx (w7) -> lane-dy (w8) -> lane-dz (w9) -> lane-dg (w10) -> lane-di (w11) -> lane-dj (w12) -> lane-eg (w14). `docs/systems/DEUS_ZRange.md`: lane-da -> **lane-dd** -> lane-dg. Change only the Levels surfaces in Scope, never the rest of the CELL contract (commitMatterBatch, removeStratum, setShape/derivePacked/standing, committed-change publication, flood delegation, effectiveSupport, the matter-participant registry).
- `tools/test_area_generation_speed.js`: lane-dc created it; this lane edits the hook only; lane-df (w4) gates on it. `tools/test_lazy_area_generation.js`: created here; lane-de (w4) gates on it.
- Wave 3 runs beside lane-dp and lane-dr (DEC-078); they share no file with this lane.

## Tests

`FAILS on main` means the check is shown failing at the lane base with the new test present (run the new test against the base's `DEUS_Levels.js`; a MODULE_NOT_FOUND exit is not a named-check failure) and passing at the tip (AGENTS.md Rule 4). Each mutant (edited in memory only) must turn its named check red.

### Must fail without the change

- NEW `tools/test_lazy_area_generation.js` ::new_game_3x3_areas_attributed: full plugin set at explicit 3x3, boot hook run (Precondition 6), seed 424242; each area generated at most once; every area but the start area attributed to a non-Levels requester; no area is generated that holds no home and that nothing requested (here (1,0)); the list printed - FAILS on main (Levels builds all nine itself, :4687)
- ::ensure_generates_start_area_only: Core, World, WorldGen, Levels at 3x3, boot hook run, `World.newWorld(18)`: `areaGenerations` is exactly the start area (1,1) and `stats().generated` is 5 baselines (one area's core) - FAILS on main (45 baselines, nine areas; `stats().generated` exists at base, so the base failure is behavioral, not a missing API)
- ::area_generated_event_once: one event per (world state, area): none for repeated reads, none for a regeneration after eviction (a volume is evicted only when other worlds' areas push it out of `volumes`: keep is max(3, areas), :2621), one more for a new world of the same seed that reuses a cached volume - FAILS on main
- ::area_generated_deferred_on_load: nothing is delivered while the extract wrapper runs, an inner wrapper that requests an area before the restore included; each event flushed once, in (ay, ax) order, after the restore, and the listener sees the loaded state - FAILS on main
- ::per_area_checksum_on_first_generation: after New Game `levels[-2..2].areaSums["1,1"]` equals `areaChecksum(z, 1, 1)`; requesting (0,0) adds "0,0"; no record for an unrequested area or an outer level; survives a JSON round trip - FAILS on main
- ::load_generates_visited_areas_only: load a 3x3 save that recorded two areas; only the view's area is generated by the load (`areaGenerations` after `extractSaveContents` and the map's first build) - FAILS on main (`verifyLevels` builds all nine)
- ::lazy_equals_eager: areas built lazily in three orders (start first, reverse, one seeded shuffle; start-last through foreign-descriptor `areaChecksum` calls) have per-area sums equal to the new fixture, and the chain equals dc's frozen all-area value (DEC-070 condition B) - FAILS on main (no `areaChecksum`)

### Guards (pass before and after)

- ::new_game_3x3_cost_bound: full plugin set, boot hook, same process; print T(1x1), T(3x3), both grids, k, homes, requesters, per-area `ms`, their median (Tarea) and the bound `T(1x1) + (k - 1) x Tarea x 1.25` (DEC-065). `areaGenerations[].ms` is the wall time of the whole first generation (the `volumeOf` miss, noise queries included). **PM to confirm the definition before launch:** read literally on whole-run totals the bound fails at base (Precondition 7: about 8.5 s against 15 s), so the drafter recommends bounding what this lane controls: the Levels-attributable time (the sum of `areaGenerations[].ms` plus the ms spent on per-area sums, a counter in `stats`) against the same formula, while the whole-run totals are only printed. Mutant `regenerate_twice` doubles that time. A slow host can flake a time bound: rerun, do not raise the margin (plan risk 18).
- ::home_areas_exist_at_tick0 (DEC-070 condition A): every faction's home area is generated and its home level reads when `World.newWorld` returns, with `UF.Sim.tickCount() === 0`.
- ::legacy_single_checksum_verifies: a 1x1 save with a string `checksum` and no `areaSums`, and a 3x3 save whose checksums come from lane-dc's frozen fixture (not recomputed) both verify; a flipped nibble is reported, not replaced.

### Other named checks (pass at the tip)

- ::per_area_checksum_mismatch_reported; ::area_sums_computed_once_per_area (1,000 `baseline()` calls on one area compute one sum); ::trace_off_by_default (no stack capture, `areaRequests` empty).

### Mutants and provocations

- `regenerate_twice` (every generated area generated again) must fail `new_game_3x3_cost_bound`; also show a single area generated twice failing `new_game_3x3_areas_attributed` (DEC-065: the time margin alone admits one duplicate). `eager_ensure` (the all-area loop back): `ensure_generates_start_area_only`. `event_per_cache_fill`: `area_generated_event_once`. `event_not_held`: `area_generated_deferred_on_load`. `record_not_saved`: `per_area_checksum_on_first_generation`. `silent_replace` (a mismatch overwrites the record): `per_area_checksum_mismatch_reported`. `order_dependent_noise` (drop the area from `surfaceGridFor`'s key, :1094): `lazy_equals_eager`.

### Gate commands (lane.json gateTests; each runs in a fresh clone, 900 s timeout)

- `node tools/check_deus_syntax.js`; `node tools/test_lazy_area_generation.js` (target under 600 s on an idle host, printed); `node tools/test_sparse_outer_save.js`; `node tools/test_area_generation_speed.js`; `node tools/test_strata_cuts_and_caves.js`; `node tools/test_sim_loader.js`.
- Added by the drafter (PM to confirm; the registry lists the first six only): `node tools/test_32_levels_generation.js`; `node tools/test_new_game_year0.js`; `node tools/zrange/scan_z_literals.js` (a new Z literal in `DEUS_Levels.js` fails it: use `CORE_LEVELS` and the range accessors; `tools/zrange/z_literal_allowlist.json` is not in allowedPaths).

## lane.json (draft)

```json
{ "lane": "lane-dd", "taskId": "WG.CELL-WRITE", "branch": "task/lane-dd", "writer": "grok", "reviewer": "codex",
  "allowedPaths": ["game/js/plugins/DEUS_Levels.js", "tools/test_lazy_area_generation.js", "tools/fixtures/levels/area_checksums_gen5_3x3.json",
    "tools/test_area_generation_speed.js", "docs/systems/DEUS_Levels.md", "docs/systems/DEUS_ZRange.md", "tasks/WG.CELL-WRITE/lane-dd/**"],
  "gateTests": [
    {"cmd":"node","args":["tools/check_deus_syntax.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/test_lazy_area_generation.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/test_sparse_outer_save.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/test_area_generation_speed.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/test_strata_cuts_and_caves.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/test_sim_loader.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/test_32_levels_generation.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/test_new_game_year0.js"],"timeoutSec":900},
    {"cmd":"node","args":["tools/zrange/scan_z_literals.js"],"timeoutSec":900} ] }
```

## F5 evidence

The editor stays closed (DEC-059). Run on a snapshot copy of `game/` (never `game/` itself): `node tools/add_test_plugin.js <copy>/js/plugins.js`, set DEUS_World `Seed` 18 in the copy's `plugins.js` (and `AreasX`/`AreasY` 3 for the second run), then `node tools/run_tests.js smoke --game <copy>` and `node tools/run_tests.js vertical --game <copy>` at base and at tip. Copy the `[TIMING]` lines (`world:created`, `setupForNewGame exit`) of the copy's `game_runtime.log` into `evidence/` (as lane-dc's `evidence/f5-*-timing.txt`): DEC-065 wants the NW.js New Game time at base and tip. Open every screenshot before citing it and describe what is in it (Rule 5); the in-plugin `five_levels` and `complete_at_start` results are part of the `vertical` run. Class C.

## GAME TRANSLATION (class C, foundational; the diff touches `game/`)

- **Player/world effect:** a New Game builds only the areas it needs; a 3x3 world pays per generated area, not per area in the world. **Trigger:** New Game (`world:initializing`), the first `baseline` request of an area, a load. **Authority:** `DEUS_Levels.js`; records under `World.state.levels[z].areaSums`. **Path:** `ensureWorldLevels` -> `baseline` -> `volumeOf` -> per-area record and check -> `levels:areaGenerated`; a load runs World's restore, then Levels' queue flush.
- **Bridge:** the existing `uf_levels_terrain` generator (`registerGenerator`, :5379) draws what `baseline` returns; unchanged. Event consumers (lane-dl, lane-ef, lane-eg) and the 3x3 grid (lane-de) are later lanes: Engine bridge DEFERRED to them, not playable here. **Persistence:** `areaSums` saved; the seen set and the queue are runtime only. **Failure without it:** New Game cost grows with the world, and no consumer has a once-only, post-restore area signal. **Proof:** the gate commands above (headless) plus the F5 run above; in-game proof of 3x3 belongs to lane-de.
- Report the bridge status fields (simulation, engine bridge, presentation, input, save/load, playable verification) as YES/NO with evidence; "not checked" where not observed.

## Writer and reviewer

- Writer `grok` (family grok), reviewer `codex` (family codex): different families, as merge_gate requires. D1 lanes take no Claude writer or reviewer (`docs/CANONICAL_ROLES.md` section 2.1). Authority: DEC-031 item 1, DEC-058, DEC-078 (several lanes per provider; this lane does not wait for another lane's writer or reviewer).
- Commit authors are `deus-grok` (tag `[grok]`) and `deus-codex` (tag `[codex]`). The review is a real launch through `tools/ops/launch_worker.ps1`. The review commit is the branch tip (one parent), touches only `tasks/WG.CELL-WRITE/lane-dd/review_codex_<sha8>.md`, which holds the full 40-character SHA of the last non-review commit and ends with exactly one verdict line: `VERDICT: CLEAN PASS` or `VERDICT: PASS`; `VERDICT: PASS WITH MINORS` is accepted only after lane-gk (DEC-085 item 2) merges (merge_gate at `6ee18bf4` takes the first two, `tools/governance/merge_gate.js:234`; PM to confirm at launch). The reviewer runs every gate on the writer's tip in a fresh clone.

## Rules that bind this lane

- DEC-085: main takes only merges and PM commits. Commit only on `task/lane-dd`, staging only the allowedPaths (`git add <paths>`, never `-A`); push the branch; the final message ends with `FINAL SHA: <40 hex>`. The PM merges through `merge_gate` (`--no-ff`). The manifest and this brief are the PM's: a writer commit that changes either triggers MANIFEST_TAMPERED. Mail is local files.
- Engine core read-only (Rule 9); tests must be able to fail (Rule 4); no per-frame full scans (Rule 14); two failed fixes on one problem: stop, write down what is known, ask (Rule 10); no art (DEC-007); mass is integer centipounds (DEC-038); soil deferred (DEC-057).
- Report: one paragraph per AGENTS.md format plus the real test output, the GAME TRANSLATION block above, and a closing block "NUMBERS FOR THE WBS ROW" (T(1x1) base and tip, T(3x3), k, homes, requesters, Tarea, NW.js 1x1 and 3x3) for the PM to add to WG.00.46.
