# Lane AU Brief: SIM.50.02 Cross-layer water dynamics

**LAUNCH GATE MET (PM, 2026-09-27 ~10:30 CT, Owner-approved next-lane launch 09:58 CT):** WBS deps met: SIM.50.01 (living-world gap audit) merged `4614dbfa`; WG.00.17 (Lane AA, 32 layers) merged `1c2fcc28`. The last Fluid lanes (AE SIM.50.13, AF SIM.50.12 regression suite) are merged, so `DEUS_Fluid.js` has no live claim. Routing (Claude weekly conserved, Codex exhausted until Tue ~9:34 PM CT): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author; gemini-3.8-flash thinking HIGH is the Owner-authorised final gate while 3.1 Pro is quota-blocked until ~19:04 CT, DEC-034).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-au | **Task ID:** SIM.50.02 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`) | **Branch:** task/lane-au | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-au` | **Writer:** grok (grok-4.7 xhigh, multi-agent on) | **Reviewer:** gemini (non-author) | **Size:** L | **Base:** origin/main `2755f61947610723723384ad39ad3fbc92d4679f` | **Source:** WBS row SIM.50.02; Directive 0021-V Addendum 14; V142; LWGA row 1 / WAT-*.

## allowedPaths (exact; mirrored in `tasks/SIM.50.02/lane-au/lane.json`)
- `game/js/plugins/DEUS_Fluid.js`
- `game/js/sim/hydro/**`
- `tools/sim/test_water_dynamics.js`
- `tools/sim/fixtures/water_dynamics/**`
- `docs/systems/DEUS_WaterDynamics.md`
- `tasks/SIM.50.02/**`
Notes: `DEUS_Levels.js`, `DEUS_World.js`, `game/js/sim/materials.js` and `game/js/sim/ledger*` are READ-ONLY here (use their public APIs; escalate if a change there is unavoidable). `docs/systems/DEUS_Fluid.md` is Gemini/AA-owned: put new documentation in `docs/systems/DEUS_WaterDynamics.md`.

**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `docs/VISION.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool (`tools/ops/**`, `tools/governance/merge_gate.js`, `tools/governance/check_claims.js`, `tools/governance/check_invariants.js`), `art/**` (including the untracked `art/sprites/`), `game/img/**`, and `game/js/sim/ledger*` (read-only; stale Lane L1 claim). Files claimed by lanes running at the same time are off limits: AV (DEUS_Levels.js, DEUS_NaturalConnections.js, DEUS_WorldGen.js, tools/worldgen/**); AW (DEUS_Depth.js, DEUS_DepthCues.js, DEUS_CombatUI.js, DEUS_LayerOverlays.js, tools/layer_overlays/**); AX (DEUS_Wildlife.js, DEUS_Taming.js, game/js/sim/taming/**, tools/taming/**); AY (game/js/sim/decay/**, game/data/sim/decay_params*.json, tools/sim/test_decay_core.js); AZ (game/data/plans/**, tools/plans/**); BA (DEUS_Colonists.js, game/js/sim/society/**, game/data/society/**, tools/society/**).

## Docs to read (only these)
- `docs/worldgen/DEUS_WORLDGEN_WBS.md` row SIM.50.02
- `docs/audits/LIVING_WORLD_GAP_AUDIT.md` row 1 (Cross-layer water), the SIM.50.02 requirement paragraph and findings WAT-* (e.g. WAT-2: no sources or sinks)
- `docs/systems/DEUS_Fluid.md`, `docs/systems/DEUS_ZRange.md` (32 layers, sparse storage), `docs/systems/DEUS_Materials.md` (porosity/permeability if present)
- `tasks/SIM.50.13/lane-ae/REPORT.md` and `tasks/SIM.50.12/lane-af/REPORT.md` (the fluid attach fix and the F-05 regression you must keep green)
- `docs/OWNER_DECISIONS.md` DEC-026 (calendar vs solar day, OWNER_OPEN) - read only

## Scope
1. Extend the existing 0..7 fluid solver in `game/js/plugins/DEUS_Fluid.js` (pure helpers may live in `game/js/sim/hydro/**`) with cross-layer water dynamics across the 32 layers (-16..+15): (a) seepage/infiltration through porous strata and soil by material, (b) vertical drops and waterfalls through openings between layers, (c) subterranean aquifers and springs as physical sources fed from stored groundwater, (d) lake filling and drying (inflow, evaporation, drainage/infiltration), (e) flooding when inflow exceeds capacity.
2. Mass conservation (LIFE-001): water is never created or destroyed; every source draws from a stored reservoir (aquifer/groundwater) and every sink moves water somewhere counted (evaporation to an atmosphere/groundwater budget that is itself counted). Flood fill must never create water (the F-05/D-4 bug fixed by Lane AE).
3. Change-driven (V133): only dirty cells/regions are processed; no per-tick full-world scans; sparse storage per DEC-013 (memory scales with wet cells, not 32 x area). Report per-tick cost on a 32-layer fixture.
4. Seasonal flooding: the calendar is OWNER_OPEN (DEC-026). Drive seasonal input through a pluggable precipitation/season input with a neutral default (constant or zero); do not choose a calendar. List it as an Owner question.
5. Test `tools/sim/test_water_dynamics.js` (headless, seeded, deterministic): seepage through porous vs impermeable strata; a waterfall through an opening between layers; a spring fed from an aquifer that stops when the aquifer is empty; a lake that fills and dries; flooding; total water mass identical at every checkpoint over a long run; no water on solid rock; runs at both -4..+4 and -16..+15. Mutants that must fail: create water in a source, delete water in evaporation, flood fill into solid rock, full-world scan per tick (cost bound).
6. Minimal, targeted edits to DEUS_Fluid.js; no refactors of unrelated code; keep save/load compatible (old saves load).

## Acceptance
- Every lane.json gate test passes, with output pasted in REPORT.md.
- REPORT.md lists what changed, the evidence, open Owner questions and PROPOSED-AU-NN follow-ups.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini).
## Gate tests
- `node tools/sim/test_water_dynamics.js`
- `node tools/sim/test_fluid_attach.js`
- `node tools/sim/test_living_world_rules.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art or audio, never run PixelLab or any image model, and never write generation prompts. Existing or placeholder tiles/sprites only.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AU-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/SIM.50.02/lane-au/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing. Every new check has a killed mutant.
7. Do not merge; do not self-certify. An independent review by a different AI family (Gemini, launched later by the PM) decides. Review: any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-au`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
