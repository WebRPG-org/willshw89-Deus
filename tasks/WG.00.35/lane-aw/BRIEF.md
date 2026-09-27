# Lane AW Brief: WG.00.35 Lower-layer overlay rendering at 1:1 (effects, HP bars, status, combat and spell overlays)

**LAUNCH GATE MET (PM, 2026-09-27 ~10:30 CT, Owner-approved next-lane launch 09:58 CT):** WBS dep met: WG.00.17 (Lane AA) merged `1c2fcc28`. Related merged work: Lane AN combat U7 (HP bars, floating numbers) `53e72b93`, Lane AP depth demo `f09a1ac4`. `DEUS_Depth.js`, `DEUS_DepthCues.js` and `DEUS_CombatUI.js` have no live claim. Routing (Claude weekly conserved, Codex exhausted until Tue ~9:34 PM CT): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author; gemini-3.8-flash thinking HIGH is the Owner-authorised final gate while 3.1 Pro is quota-blocked until ~19:04 CT, DEC-034).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-aw | **Task ID:** WG.00.35 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`) | **Branch:** task/lane-aw | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-aw` | **Writer:** grok (grok-4.7 xhigh, multi-agent on) | **Reviewer:** gemini (non-author) | **Size:** M | **Base:** origin/main `2755f61947610723723384ad39ad3fbc92d4679f` | **Source:** WBS row WG.00.35; DEC-011; Owner requirement 2026-09-26 11:31 CT.

## allowedPaths (exact; mirrored in `tasks/WG.00.35/lane-aw/lane.json`)
- `game/js/plugins/DEUS_Depth.js`
- `game/js/plugins/DEUS_DepthCues.js`
- `game/js/plugins/DEUS_CombatUI.js`
- `game/js/plugins/DEUS_LayerOverlays.js`
- `tools/layer_overlays/**`
- `docs/systems/DEUS_LayerOverlays.md`
- `tasks/WG.00.35/**`
Notes: `DEUS_Levels.js`, `DEUS_World.js`, `DEUS_Combat.js`, `DEUS_CombatRT.js`, `game/js/sim/combat_rt/**`, `DEUS_DepthDemo.js` are READ-ONLY here: hook by RMMZ-style aliasing from your own plugin file; escalate if a core change is unavoidable.

**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `docs/VISION.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool (`tools/ops/**`, `tools/governance/merge_gate.js`, `tools/governance/check_claims.js`, `tools/governance/check_invariants.js`), `art/**` (including the untracked `art/sprites/`), `game/img/**`, and `game/js/sim/ledger*` (read-only; stale Lane L1 claim). Files claimed by lanes running at the same time are off limits: AU (DEUS_Fluid.js, game/js/sim/hydro/**, tools/sim/test_water_dynamics.js); AV (DEUS_Levels.js, DEUS_NaturalConnections.js, DEUS_WorldGen.js, tools/worldgen/**); AX (DEUS_Wildlife.js, DEUS_Taming.js, game/js/sim/taming/**, tools/taming/**); AY (game/js/sim/decay/**, game/data/sim/decay_params*.json, tools/sim/test_decay_core.js); AZ (game/data/plans/**, tools/plans/**); BA (DEUS_Colonists.js, game/js/sim/society/**, game/data/society/**, tools/society/**).

## Docs to read (only these)
- `docs/worldgen/DEUS_WORLDGEN_WBS.md` rows WG.00.35 and WG.00.18 (context only; WG.00.18 is Owner-led and NOT in scope)
- `docs/OWNER_DECISIONS.md` DEC-011 (1:1, zero filters) - read only
- `docs/systems/DEUS_ZRange.md`, `docs/systems/DEUS_CombatU7.md`, `docs/systems/DEUS_DepthDemo.md`
- `tasks/DEUS-TSK-DEPTH-DEMO/lane-ap/REPORT.md` (compatibility notes on lower-layer HP bars and spell effects)

## Scope
1. When the player looks down through open layers, every visible lower layer renders its effects, HP bars, status indicators, and combat/spell overlays (hit flashes, floating damage numbers, selection/range markers) at 1:1 scale with zero filters: no blur, tint, fog, desaturation, alpha fade or scaling applied to those overlays (DEC-011; Owner 2026-09-26 11:31 CT).
2. Overlays of a lower-layer unit are positioned exactly over that unit as drawn on its layer (whole-pixel offsets, same as the layer's draw offset), drawn in correct order (a higher opaque layer still occludes them; they never draw over an opaque surface above them).
3. Depth-demo cues (Lane AP toggles, all off by default) may darken or offset the layer, but overlays keep 1:1 and no filter; document the interaction.
4. Cost: overlays are only built for visible, unoccluded lower-layer units (change-driven; zero allocation per frame in the hot path per PERFORMANCE_ARCHITECTURE). Benchmark at 32 layers with a large unit count; results table in `docs/systems/DEUS_LayerOverlays.md` and REPORT.md.
5. Test `tools/layer_overlays/test_layer_overlays.js` (headless, deterministic): overlays for units on lower visible layers exist, scale 1, no filters, whole-pixel positions matching the unit, occluded units get none, current-layer behaviour unchanged. Mutants: apply a filter/tint, scale 0.9, draw an occluded unit's bar, drop lower-layer overlays.
6. Visual leaf: capture F5/NW.js evidence (screenshots of a lower-layer fight seen from above) only in a throwaway clone under %TEMP%; if NW.js cannot run headless, say so in REPORT.md and list the Owner playtest check.

## Acceptance
- Every lane.json gate test passes, with output pasted in REPORT.md.
- REPORT.md lists what changed, the evidence, open Owner questions and PROPOSED-AW-NN follow-ups.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini).
## Gate tests
- `node tools/layer_overlays/test_layer_overlays.js`
- `node tools/test_layer_render_flat.js --suite depth`
- `node tools/depth_demo/test_depth_demo.js`
- `node tools/combat_rt/test_combat_rt.js`
- `node tools/check_deus_syntax.js`

## Registration of new plugins
Do NOT edit `game/js/plugins.js` or `game/js/plugins/DEUS_Core.js` (shared files; RMMZ editor safety). Keep headless logic loadable directly by your tests. Put the exact registration entry you need (plugin name, load order, parameters) under a `## Registration request` heading in REPORT.md; the PM applies it at merge time.

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art or audio, never run PixelLab or any image model, and never write generation prompts. Existing or placeholder tiles/sprites only.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AW-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/WG.00.35/lane-aw/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing. Every new check has a killed mutant.
7. Do not merge; do not self-certify. An independent review by a different AI family (Gemini, launched later by the PM) decides. Review: any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-aw`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
