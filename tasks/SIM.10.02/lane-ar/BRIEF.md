# Lane AR Brief: SIM.10.02 Simulate-forward as a dev-only tool

**LAUNCH GATE MET (PM, 2026-09-27 ~02:30 CT, Owner-approved Grok writer restart 02:05 CT):** WBS deps met: SIM.10.01 (history simulation, `DEUS_History.js`) and WG.00.14 (Year-0 contract, INV-SIM-01) are on main (DONE-unverified); `tools/test_new_game_year0.js` passes on main (30 gating checks, 15 mutants). Routing (Claude ~98% weekly, Codex exhausted until Tue 21:34 CT): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author; gemini-3.8-flash thinking HIGH is the Owner-authorised final gate while 3.1 Pro is quota-blocked, ruling 2026-09-26 20:45 CT).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-ar | **Task ID:** SIM.10.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`) | **Branch:** task/lane-ar | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-ar` | **Writer:** grok (grok-4.7 xhigh, multi-agent on) | **Reviewer:** gemini (non-author) | **Size:** S | **Base:** origin/main `a6be423d54bd2f7d4b5a5f24f51bae73f978c4de` | **Source:** INV-SIM-01 (`docs/INVARIANT_REGISTRY.md`); WBS row SIM.10.02.

## allowedPaths (exact; mirrored in `tasks/SIM.10.02/lane-ar/lane.json`)
- `tools/dev/sim_forward.js`
- `tools/sim/test_sim_forward_guard.js`
- `tools/sim/fixtures/sim_forward/**`
- `docs/systems/DEUS_SimForward.md`
- `tasks/SIM.10.02/**`

**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `docs/VISION.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool (`tools/ops/**`, `tools/governance/merge_gate.js`, `tools/governance/check_claims.js`), and `art/**`. Files claimed by live lanes are off limits: AN (DEUS_CombatRT/CombatUI/Move8/Combat.js, game/js/sim/combat_rt/**), AO (DEUS_WorldItems/Containers.js, game/js/sim/world_items/**), AP (DEUS_DepthDemo/DepthCues.js), AG (DEUS_Factions/Colonists/Ecology/WorldGen.js); every `game/**` file is read-only for this lane (if the tool cannot work without a game-code hook, escalate).

## Docs to read (only these)
- `docs/worldgen/DEUS_WORLDGEN_WBS.md` rows SIM.10.01, SIM.10.02, WG.00.14
- `docs/INVARIANT_REGISTRY.md` INV-SIM-01
- `docs/systems/UF_History.md`; `game/js/plugins/DEUS_History.js` (`simulate(state, cfg, targetYears)` near line 886); `tools/bench_history_sim.js` and `tools/test_new_game_year0.js` (headless harness patterns)

## Scope
1. Build a dev-only CLI `tools/dev/sim_forward.js` that loads a save (or a seeded fresh world built headless the way the existing tools do), copies it, runs the existing history/population simulation forward N years on the copy, and writes the result to a new output file. It must never modify the input save in place, must refuse to write over its input, and must print a clear summary (years run, population/faction counts before and after, output path).
2. The tool is dev-only: it must not be loadable from the game (not in `game/js/plugins.js`, no plugin file) and must not run at new game (INV-SIM-01: Standard New Game starts at Year 0 with no pre-simulated history).
3. Guard test `tools/sim/test_sim_forward_guard.js`: (a) runs the CLI headless for a small N on a fixture and checks the output and that the input is byte-identical afterwards; (b) proves the new-game path never calls simulate-forward (static check that nothing under `game/` references the tool, plus a runtime check that a standard new game still reports year 0 with `simulated: false`); (c) mutants that make it fail (e.g. write in place, call from the new-game path).
4. Short doc `docs/systems/DEUS_SimForward.md`: usage, guarantees, limits.

## Acceptance
- Every lane.json gate test passes, with output pasted in REPORT.md.
- REPORT.md lists what changed, the evidence, open Owner questions and PROPOSED-AR-NN follow-ups.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini).
## Gate tests
- `node tools/sim/test_sim_forward_guard.js`
- `node tools/test_new_game_year0.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art, and never tell anyone to.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AR-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/SIM.10.02/lane-ar/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing.
7. Do not merge; do not self-certify. An independent review by a different AI family (launched later by the PM) decides.
8. Push only your own branch (`git push origin task/lane-ar`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.