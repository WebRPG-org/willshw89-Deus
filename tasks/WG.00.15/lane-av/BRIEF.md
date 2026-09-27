# Lane AV Brief: WG.00.15 Vertical biome coupling (M-GEN-01) and survey budget 12 to 64

**LAUNCH GATE MET (PM, 2026-09-27 ~10:30 CT, Owner-approved next-lane launch 09:58 CT):** WBS row WG.00.15 lists no dependencies; WG.00.17 (32 layers) merged `1c2fcc28`; Lane AG (SIM.10.05 underground Year-0 viability) merged `556d21e5`. `DEUS_Levels.js`, `DEUS_NaturalConnections.js` and `DEUS_WorldGen.js` have no live claim. Routing (Claude weekly conserved, Codex exhausted until Tue ~9:34 PM CT): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author; gemini-3.8-flash thinking HIGH is the Owner-authorised final gate while 3.1 Pro is quota-blocked until ~19:04 CT, DEC-034).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-av | **Task ID:** WG.00.15 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`) | **Branch:** task/lane-av | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-av` | **Writer:** grok (grok-4.7 xhigh, multi-agent on) | **Reviewer:** gemini (non-author) | **Size:** M | **Base:** origin/main `2755f61947610723723384ad39ad3fbc92d4679f` | **Source:** WBS row WG.00.15; M-GEN-01 (DEUS_GENERATION_PACKETS_MANIFEST.md section 2).

## allowedPaths (exact; mirrored in `tasks/WG.00.15/lane-av/lane.json`)
- `game/js/plugins/DEUS_Levels.js`
- `game/js/plugins/DEUS_NaturalConnections.js`
- `game/js/plugins/DEUS_WorldGen.js`
- `tools/test_natural_connections.js`
- `tools/worldgen/**`
- `docs/systems/DEUS_VerticalBiomes.md`
- `tasks/WG.00.15/**`
Notes: `DEUS_World.js`, `DEUS_Fluid.js`, `DEUS_Factions.js`, `DEUS_Colonists.js`, `DEUS_Ecology.js` are READ-ONLY here. `tools/test_natural_connections.js` currently fails on main (0 passed, 25 failed: module load error) - you MAY repair it (never weaken an assertion), but it is not a gate test.

**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `docs/VISION.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool (`tools/ops/**`, `tools/governance/merge_gate.js`, `tools/governance/check_claims.js`, `tools/governance/check_invariants.js`), `art/**` (including the untracked `art/sprites/`), `game/img/**`, and `game/js/sim/ledger*` (read-only; stale Lane L1 claim). Files claimed by lanes running at the same time are off limits: AU (DEUS_Fluid.js, game/js/sim/hydro/**, tools/sim/test_water_dynamics.js); AW (DEUS_Depth.js, DEUS_DepthCues.js, DEUS_CombatUI.js, DEUS_LayerOverlays.js, tools/layer_overlays/**); AX (DEUS_Wildlife.js, DEUS_Taming.js, game/js/sim/taming/**, tools/taming/**); AY (game/js/sim/decay/**, game/data/sim/decay_params*.json, tools/sim/test_decay_core.js); AZ (game/data/plans/**, tools/plans/**); BA (DEUS_Colonists.js, game/js/sim/society/**, game/data/society/**, tools/society/**).

## Docs to read (only these)
- `docs/worldgen/DEUS_WORLDGEN_WBS.md` row WG.00.15
- `docs/packets/generation/DEUS_GENERATION_PACKETS_MANIFEST.md` section 2, Milestone M-GEN-01 (the three items, including the safety guarantee)
- `docs/systems/DEUS_ZRange.md` (32 layers, five depth bands) and `docs/systems/UF_Levels.md` / `docs/systems/UF_WorldGen.md`
- `tasks/SIM.10.05/lane-ag/REPORT.md` (underground Year-0 viability you must keep)

## Scope
1. Vertical biome coupling: underground biomes (the `DEUS_Levels.js` underground biome table, e.g. rooted_loam, clay_bed, and the deeper bands) are derived from the surface climate column at the same (gx, gy) plus the depth band, replacing the disconnected per-level seed roll. Examples from M-GEN-01: clay bed beneath swamps/rivers, rooted loam beneath forests, chalk karst beneath mountains, deep magma beneath volcanic hotspots. Extend the rule across all 16 underground layers and the DEC-013 depth bands (not just the old Z-1/Z-2), deterministic per seed.
2. Raise the `survey.tested` candidate cap in `DEUS_NaturalConnections.js` from 12 to 64 (data-driven constant), so continuous multi-level connection chains are found; prove the chain check now succeeds where 12 failed.
3. Safety guarantee (M-GEN-01 item 3): prove the change in disposable world-generation tests first. Put the coupling behind a single setting; default ON only if every gate test below passes unchanged, otherwise default OFF and report the exact diffs for the PM. Never edit a pinned/golden expectation in an existing test; if one must change, escalate.
4. Test `tools/worldgen/test_vertical_biome_coupling.js` (headless, 20 seeds): underground biome at each depth is consistent with its surface column per the rule table; deterministic per seed; the 12->64 budget finds the chain; runs at -4..+4 and -16..+15; performance within 10% of main for generation time (report numbers). Mutants: revert to the independent roll, cap back at 12, break determinism.
5. Minimal, targeted edits; no refactors.

## Acceptance
- Every lane.json gate test passes, with output pasted in REPORT.md.
- REPORT.md lists what changed, the evidence, open Owner questions and PROPOSED-AV-NN follow-ups.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini).
## Gate tests
- `node tools/worldgen/test_vertical_biome_coupling.js`
- `node tools/test_new_game_year0.js`
- `node tools/sim/test_underground_year0.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art or audio, never run PixelLab or any image model, and never write generation prompts. Existing or placeholder tiles/sprites only.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AV-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/WG.00.15/lane-av/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing. Every new check has a killed mutant.
7. Do not merge; do not self-certify. An independent review by a different AI family (Gemini, launched later by the PM) decides. Review: any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-av`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
