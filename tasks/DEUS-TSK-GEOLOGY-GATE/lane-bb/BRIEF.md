# Lane BB Brief: DEUS-TSK-GEOLOGY-GATE repair the stale test harness of the gate test tools/test_geology_strata.js

**LAUNCH GATE MET (PM, 2026-09-27 ~11:40 CT):** Owner asked (11:25 CT) that the broken gate test `tools/test_geology_strata.js` be diagnosed and, if the fix is small and mechanical, given a small lane. It is on the `gate` list of `tools/ops/gate_tests.json` and exits 1 on main at `188fee267f6c95bd477736f3dc7dfce2c6e75a12` before running a single check. Routing (Claude weekly conserved, Codex exhausted until Tue ~9:34 PM CT): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author; gemini-3.8-flash thinking HIGH is the Owner-authorised final gate while 3.1 Pro is quota-blocked until ~19:04 CT, DEC-034). Not a WBS row: PM ops task id `DEUS-TSK-GEOLOGY-GATE` (same pattern as DEUS-TSK-DEPTH-DEMO).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-bb | **Task ID:** DEUS-TSK-GEOLOGY-GATE | **Branch:** task/lane-bb | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-bb` | **Writer:** grok (grok-4.7 xhigh, multi-agent on) | **Reviewer:** gemini (non-author) | **Size:** S | **Base:** origin/main `188fee267f6c95bd477736f3dc7dfce2c6e75a12`

## PM diagnosis (verify it yourself first)
`node tools/test_geology_strata.js` on main dies while loading the plugins, before any check runs:
```
    const CORE = window.UF.World.Z_RANGES.legacy;
TypeError: Cannot read properties of undefined (reading 'legacy')   (DEUS_Levels.js, loaded by the test at line 100)
```
Cause: the test builds a hand-written stub of `UF.World` (lines 74-84: state, inWorld, currentArea, viewLevel, registerGenerator, unregisterGenerator) and never loads `DEUS_World.js`. Since WG.00.17 (commit bdf45b4c, "Z range authority in DEUS_World") `DEUS_Levels.js` reads `window.UF.World.Z_RANGES.legacy` at load, and later code also reads `window.UF.Space` (`GRID_SIZE_FEET`, `STRATUM_FEET`, set by DEUS_World.js). The PM tried adding a `Z_RANGES` stub in a scratch copy: it then fails on `UF.Space.GRID_SIZE_FEET`; loading the real DEUS_World.js into the same sandbox fails on `PluginManager is not defined`. So the stub is stale and falls further behind with every plugin change.
Sibling gate tests that load the same plugins and pass on main (`tools/test_strata_foundation.js`, `tools/test_strata_cuts_and_caves.js`) load the real `DEUS_World.js`, `DEUS_WorldGen.js`, `DEUS_Tiles.js`, `DEUS_Objects.js`, `DEUS_Levels.js`, `DEUS_Floors.js` in a vm with small RMMZ engine stubs (`setup()` in test_strata_foundation.js). Use that pattern.

## allowedPaths (exact; mirrored in `tasks/DEUS-TSK-GEOLOGY-GATE/lane-bb/lane.json`)
- `tools/test_geology_strata.js`
- `tasks/DEUS-TSK-GEOLOGY-GATE/**`
Notes: every plugin, every other test and all data are READ-ONLY. This is a harness repair: no gameplay code changes.

**FORBIDDEN:** everything else, including `game/**` (all plugins and data), `tools/ops/gate_tests.json` (do not quarantine or delist the test), `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `docs/**` (STATUS, OWNER_DECISIONS, WBS), every gate tool (`tools/ops/**`, `tools/governance/**`), `art/**` (including the untracked `art/sprites/`), `game/img/**`. Files claimed by lanes running at the same time are off limits: AU (DEUS_Fluid.js, game/js/sim/hydro/**), AV (DEUS_Levels.js, DEUS_NaturalConnections.js, DEUS_WorldGen.js, tools/test_natural_connections.js, tools/worldgen/**), AW (DEUS_Depth*.js, DEUS_CombatUI.js, DEUS_LayerOverlays.js), AY (game/js/sim/decay/**), AZ (game/data/plans/**, tools/plans/**). Note: AV is changing DEUS_Levels.js / DEUS_WorldGen.js on its own branch; your harness must work against main as it is at your base.

## Docs to read (only these)
- `tools/test_geology_strata.js` (the test) and `tools/test_strata_foundation.js` (`setup()`, the working harness pattern)
- `docs/systems/DEUS_ZRange.md` (Z range authority, legacy core -2..+2)
- the geology parts of `game/js/plugins/DEUS_WorldGen.js` (`geologyAt`, `cellInfo`) and `game/js/plugins/DEUS_Levels.js` (`stratumAt`, `cellAt`) - read only
- `tools/ops/README.md` section 4 (gate_tests.json)

## Scope
1. Replace the stale hand-written `UF.World` stub with a sandbox that loads the real plugins the checks need (at least DEUS_World.js before DEUS_WorldGen.js and DEUS_Levels.js), with only the RMMZ engine stubs they touch, following `setup()` in test_strata_foundation.js. Keep the test dependency-free and runnable as `node tools/test_geology_strata.js` from the repo root.
2. Keep all nine checks and their meaning: api_present, surface_strata_valid, determinism, physical_properties_attached, upper_earth_strata, deep_earth_strata, levels_stratum_at, cell_info_contains_geology, levels_cell_at_contains_stratum. Never weaken an assertion (no loosened ranges, no removed checks, no try/catch that turns a failure into a pass). Keep the `--mutant` mode working: `node tools/test_geology_strata.js --mutant` must exit 1.
3. If, once the harness loads, a check fails because the game's current behaviour differs from the assertion (for example the depth band name at z=-1 / z=-2 under the 32-layer range), do NOT change the assertion to match. Record the exact output in REPORT.md, write `tasks/DEUS-TSK-GEOLOGY-GATE/lane-bb/escalation.md` naming the check, the expected and the actual values and the doc lines that decide it, commit, push your branch and stop. The PM and Gemini decide.
4. Add a harness self-check that fails loudly (exit 1 with a clear message) if a plugin fails to load, instead of a raw stack trace, and a mutant that proves it (for example `--mutant=no_world` that skips DEUS_World.js must exit 1 with that message).
5. REPORT.md: root cause (with the commit that introduced it), what changed, raw gate output with EXIT values, mutant results, and PROPOSED-BB-NN follow-ups (for example other tests with the same stale stub, found by a read-only search).

## Acceptance
- `node tools/test_geology_strata.js` exits 0 on your tip with all nine checks PASS, or an escalation per scope item 3.
- `--mutant` and your new load mutant exit 1.
- Every lane.json gate test passes, with output pasted in REPORT.md.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini).
## Gate tests
- `node tools/test_geology_strata.js`
- `node tools/test_strata_foundation.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art or audio, never run PixelLab or any image model, and never write generation prompts. Existing or placeholder tiles/sprites only.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-BB-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/DEUS-TSK-GEOLOGY-GATE/lane-bb/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing. Every new check has a killed mutant.
7. Do not merge; do not self-certify. An independent review by a different AI family (Gemini, launched later by the PM) decides. Review: any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-bb`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
