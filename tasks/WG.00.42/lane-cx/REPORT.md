# WG.00.42 / lane-cx: WorldGen quick fixes

Evidence date: 2026-09-30 (America/Chicago). Writer: Codex / OpenAI Codex family.
Authority: Owner task instruction; lane BRIEF citing MSG-PRUNE-PM-030/039/040/043 and DEC-052. World: Emerys (DEC-054).
Disposition: implementation and requested headless gates submitted for independent Grok review; no WBS closure, merge, push, or Owner approval claimed.

## What changed

- `game/js/plugins/DEUS_WorldGen.js`: `start_in_middle` derives the expected colonist-tag count from the configured pair notes and checks each expected event's name, note and centre-relative position. Tagged, untagged, mixed, empty and absent pair configurations are covered, as is the installed-Colonists branch. The current DEUS catalog has tagged pair notes; deriving the count supports that catalog as well as the untagged case identified by SYSEVAL-B02.
- `game/js/plugins/DEUS_WorldGen.js`: the Ground wait requires both `UF.Levels.view() === 0` and a current area. Its rejection propagates to `DEUS_Test.js`'s existing suite runner, which records `suite_completed: FAIL` with the error message. No later WorldGen builds/checks run after a rejected wait.
- `game/js/plugins/DEUS_WorldGen.js`: surface writes and Ground suite reads now use `W.levelKey`, matching underground writes. Ground retains `ax,ay`; nonzero levels use `ax,ay,z`. Builds at +1/+2 no longer overwrite Ground's kitLog/stats. These collections are derived diagnostics, not saved world truth.
- `tools/test_worldgen_quickfixes.js`: three targeted behavioral checks loading the real World and WorldGen plugins and registered WorldGen suite in fresh VMs, plus three in-memory source mutants with an exclusive-kill requirement.
- `tasks/WG.00.42/lane-cx/{state.md,REPORT.md,syntax.log,quickfixes.log,mutants.log}`: claim, evidence and handoff. The explicit allowedPaths govern this task; STATUS/VISION/system docs are outside the writer's scope. The manifest and pre-existing launch files were preserved.

## How I tested it

| Command | Observed result | Exit | Evidence |
|---|---|---|---|
| `node tools/check_deus_syntax.js` | 62 DEUS plugin files, 0 errors | 0 | `syntax.log` |
| `node tools/test_worldgen_quickfixes.js` | 3 passed, 0 failed | 0 | `quickfixes.log` |
| `node tools/test_worldgen_quickfixes.js --mutants` | baseline 3/0; all 3 mutants killed only by their targeted checks | 0 | `mutants.log` |
| `node --check tools/test_worldgen_quickfixes.js` | no syntax diagnostics | 0 | session command output |
| `git diff --check` | no whitespace errors | 0 | session command output |
| `git diff --cached --check` | no whitespace errors after log newline normalization | 0 | session command output |

The first staged whitespace check returned 2 because PowerShell captured the three logs with CRLF line endings. Only those logs were normalized to UTF-8/LF; their output text and results were preserved, and the staged check then passed.

Fixture: seed `20260930`, 64x64 areas, 2x2 world, start area (1,1), levels -2..+2. Tests execute `UF.World.buildArea` and real WorldGen generators. The test controls Levels, Tiles and engine presentation services; it reads the real RMMZ autotile constants without editing core. It does not execute renderer, real asynchronous view swaps, wall-clock timers, faction simulation or Year-0 settlement. The rejected wait uses an injected Error and verifies propagation of the identical object.

The start check also rejects five corrupt maps: wrong position, name, note, missing glade note, and an extra colonist-tagged event. The level-key check compares nonempty generated grids and placement records at two areas across five levels, verifies earlier records retain their identity after later builds, and rebuilds the Ground diagnostics after a JSON round-trip of world state. It executes the real suite's stats and kitLog readers with an instrumented key authority. Unrelated full-suite checks are not counted as passes; the fixture stops at named check boundaries. In particular, the full `kit_seeded` criterion requires Factions/History, which this bounded harness does not install.

## Evidence

Screenshot: none produced. Native RMMZ editor F5 and F8 console inspection: NOT RUN.

Actual output excerpts:

```text
Checked 62 DEUS plugin files. Errors: 0
EXIT=0
RESULT: 3 passed, 0 failed
KILLED M1_pair_requires_colonist_tags: expected only start_in_middle; failed=start_in_middle
KILLED M2_ground_timeout_swallowed: expected only ground_timeout; failed=ground_timeout
KILLED M3_surface_keys_omit_z: expected only level_keys; failed=level_keys
MUTANTS: 3/3 killed only by targeted checks
EXIT=0
```

| Mutant | Source defect restored | start_in_middle | ground_timeout | level_keys |
|---|---|---|---|---|
| M1 | Require all pair events to carry colonist tags | FAIL | PASS | PASS |
| M2 | Swallow the Ground wait rejection | PASS | FAIL | PASS |
| M3 | Omit z from the surface generator's diagnostic key | PASS | PASS | FAIL |

Each run executes all three checks in separate VMs. A surviving mutant, a wrong failed check, or any additional failed check returns a nonzero process exit. Mutants never modify files on disk.

Tested base SHA: `7172f0e25f73c55d7e0b88fe2f90d071c28b2031`, with the writer changes in the commit containing this report. Resolve that writer SHA with `git log -1 --format=%H -- tasks/WG.00.42/lane-cx/REPORT.md` at handoff; the final response provides the actual resulting commit. Exact tested file SHA-256 values:

- `DEUS_WorldGen.js`: `BCC104D00FB908628CB9C778D9DE89916F697D3B4D0041605ABC04A58D0E0EFC`.
- `test_worldgen_quickfixes.js`: `29DEAA2BC70ECFEADB4B780CA1B8050AFE125EEFF0476DFA2E5622B2F55125E5`.

## Not done / known problems

- Native editor F5, live F8 inspection, screenshot proof and actual engine save/load were not performed. A JSON state round-trip is only headless rebuild evidence.
- The complete in-engine `worldgen` suite was not run. Its unrelated image, full-size terrain, kit/faction and visual criteria remain unverified by this lane.
- Existing audit findings concerning underground objects across load and absent terrain art remain outside this three-fix task.
- Independent Grok review, coordinator fresh-clone gates and normal merge_gate integration remain pending. No slice or task is self-certified.
- `docs/STATUS.md` and `docs/systems/UF_WorldGen.md` were not updated because they are outside allowedPaths. The coordinator must reconcile the handoff and public diagnostic-key documentation during integration.

## Try it in RMMZ

1. Open this lane's `game/game.rmmzproject`, press F5, and start a new Emerys world with seed `20260930`. Use F8 to inspect errors.
2. Visit +1 and +2, then press Home to return to Ground. In F8, inspect the diagnostic records after explicitly building the five levels:

   ```js
   const worldgenWorld = UF.World;
   const worldgenArea = worldgenWorld.state.startArea;
   for (const z of [0, 1, 2, -1, -2]) worldgenWorld.buildArea(worldgenArea.x, worldgenArea.y, z);
   console.table([0, 1, 2, -1, -2].map(z => {
       const key = worldgenWorld.levelKey(worldgenArea.x, worldgenArea.y, z);
       return { z, key, kit: !!UF.WorldGen.kitLog[key], stats: !!UF.WorldGen.stats[key] };
   }));
   ```

3. Expected: five distinct diagnostic records, Ground under `ax,ay`, other levels under `ax,ay,z`, and Ground's records retained after upper-level builds. Capture and inspect the actual scene and console before claiming playable proof.
4. For the existing in-engine automated suite, use `run_tests.bat worldgen` in an approved disposable test checkout. Expected lane behavior: start validation follows configured pair notes, and a failed Ground transition records a failed suite with the timeout text. The full suite's other results must be reviewed separately. Controlled timeout and alternate pair cases are already reproducible with the Node harness; normal F5 does not activate `UF.Test`.

## Decisions needed

- No implementation clarification is outstanding. The next gate is independent Grok review and coordinator integration; Owner slice approval follows the required playable evidence.

## GAME TRANSLATION

**WBS / Lane:** WG.00.42 / lane-cx.
**Approved scope / Owner authorization reference:** Owner's three-fix assignment; MSG-PRUNE-PM-030 and lane BRIEF; DEC-052; Emerys under DEC-054.
**Writer SHA / evidence date:** containing writer commit as resolved above; tested base and exact file hashes recorded above; 2026-09-30.
**Translation Class:** C. FOUNDATIONAL / INDIRECT: correctness of WorldGen diagnostics and the existing start/Ground test prerequisites.

**Player / World Effect:** reliable validation of generated start events and separate object/kit diagnostics for each level of Emerys. Normal generation still creates map tiles, events and `ufObjects`; this lane fixes validation and accounting of those outputs.

**Trigger:** `UF.World.buildArea(ax, ay, z)` invokes the registered generators; test-mode `worldgen` invokes start and Ground-view checks.

**Runtime Authority:** `UF.World.levelKey` owns key formatting; `UF.WorldGen` owns its derived `kitLog` and `stats`; catalog `start.pair` owns expected event metadata; `UF.Levels.view` supplies the actual view level.

**Simulation Path:** `DEUS_World.js` `buildArea` -> `DEUS_WorldGen.js` `generate` / `generateUnderground` -> map events/object grid plus per-level kitLog/stats -> the registered worldgen suite's start, object-count and kit-log readers.

**Engine Bridge:** existing `UF.World.buildArea` creates RMMZ map data, and `DEUS_World.js` `DataManager.loadMapData` supplies it to the engine. `DEUS_Objects.js` consumes `ufObjects` for visible object sprites. Existing `DEUS_Test.js` `run` catches the propagated error and reports a failed `suite_completed`. Full World/WorldGen delivery to map data is exercised headlessly; rendering and the real view-switch bridge are not observed in this session.

**Visible Result:** expected map content is unchanged by diagnostic-key formatting. Developers inspecting levels see separate records; a broken Ground test prerequisite is visible as a test failure. No live visual result is claimed.

**Persistence:** the World save adapter stores `World.state` as `contents.ufWorld`; it does not serialize WorldGen diagnostics. Key spelling remains compatible at Ground and underground levels, and diagnostics rebuild from generated state. The Node fixture proves a JSON state round-trip and equivalent Ground diagnostic rebuild; engine save/load is NOT RUN. No save schema change.

**Failure Without This Lane:** untagged configured start pairs fail their validator despite correct placement; a stale non-Ground area may satisfy the former readiness predicate and timeouts are suppressed; upper-level generation can replace Ground's diagnostic collections.

**Automated Proof:** the three exact Node gate commands, seed, observed outputs, exit codes and file hashes appear above. Real World/WorldGen map generation and suite consumers run in VMs. The three deliberate source regressions yield the isolated FAIL/PASS matrix above.

**In-Game Proof:** NOT RUN. Reproducible F5/F8 and suite steps are listed above. No screenshot, rendering, actual asynchronous transition, or editor save/load proof was produced.

**CONSUMED BY GAME SYSTEMS:**

- `DEUS_World.js` consumes the registered generators' events and object grids; the harness uses its actual `buildArea` and compares diagnostics with that generated grid.
- The real `worldgen` suite consumes generated start events, `WorldGen.stats`, and `WorldGen.kitLog`; the harness exercises those consumers and observes the targeted checks. Bad keys misreport the generated level even while its object grid remains intact.
- `DEUS_Objects.js` consumes the object grid for sprites; renderer delivery is source-traced only, NOT RUN. No new presentation feature is implied by diagnostic correctness.
- `DEUS_Test.js` consumes rejected suite promises and logs failure; the harness proves rejection reaches the caller, while the existing runner catch was read in source. Live runner output is NOT RUN.

**GAME BRIDGE STATUS**

- Simulation implemented: YES within the three-fix scope; real generation, per-level diagnostics and targeted suite logic exercised by the headless checks.
- Engine bridge implemented: YES, existing `buildArea`/`loadMapData` and suite-error catcher are source-traced; full live bridge verification remains NOT RUN.
- Presentation implemented: NO new presentation in this lane; existing renderer behavior is NOT VERIFIED in-engine.
- Input/player interaction implemented: NO new interaction in this lane; existing level controls are NOT VERIFIED here.
- Save/load implemented: NO new save implementation needed for derived diagnostics; engine save/load is NOT VERIFIED, JSON state rebuild alone passes.
- Playable verification performed: NO; F5/F8 and screenshots remain outstanding.

**Remaining step before player can experience it:** independent review, coordinator integration and native playtest proof of the existing consumers. No new art, lane, feature or world-generation scope is requested.
