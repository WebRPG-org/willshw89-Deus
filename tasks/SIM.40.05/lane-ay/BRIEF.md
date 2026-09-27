# Lane AY Brief: SIM.40.05 Decay core: parameter data, decay clock and instant-keyed scheduler (host-agnostic)

**LAUNCH GATE MET (PM, 2026-09-27 ~10:30 CT, Owner-approved next-lane launch 09:58 CT):** SIM.40.05 design merged `7f07ee48` (Grok review `tasks/SIM.40.05/lane-r/review_grok_9a2908fb.md`); deps SIM.40.01 (design merged `d655c122`) and SIM.00.01 (ADR-003 merged) met; the ledger (WG.65.15) and material model (SIM.40.00, Lane AC `5772cb98`) are on main. This lane builds only the design's PROPOSED-R-01 and the host-agnostic part of PROPOSED-R-02; runtime wiring waits for SIM.00.05 and SIM.40.02. Routing (Claude weekly conserved, Codex exhausted until Tue ~9:34 PM CT): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author; gemini-3.8-flash thinking HIGH is the Owner-authorised final gate while 3.1 Pro is quota-blocked until ~19:04 CT, DEC-034).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-ay | **Task ID:** SIM.40.05 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`) | **Branch:** task/lane-ay | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-ay` | **Writer:** grok (grok-4.7 xhigh, multi-agent on) | **Reviewer:** gemini (non-author) | **Size:** M | **Base:** origin/main `2755f61947610723723384ad39ad3fbc92d4679f` | **Source:** WBS row SIM.40.05; design `tasks/SIM.40.05/lane-r/SIM.40.05_DECAY_CYCLE.md` R-12.2 PROPOSED-R-01/R-02.

## allowedPaths (exact; mirrored in `tasks/SIM.40.05/lane-ay/lane.json`)
- `game/js/sim/decay/**`
- `game/data/sim/decay_params.json`
- `game/data/sim/decay_params.schema.json`
- `tools/sim/test_decay_core.js`
- `tools/sim/fixtures/decay/**`
- `docs/systems/DEUS_Decay.md`
- `tasks/SIM.40.05/lane-ay/**`
Notes: `game/js/sim/ledger*`, `game/js/sim/materials.js`, `game/js/sim/reclaim.js` and every plugin file are READ-ONLY here (call public APIs only). Do not touch `tasks/SIM.40.05/lane-r/**` (merged design).

**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `docs/VISION.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool (`tools/ops/**`, `tools/governance/merge_gate.js`, `tools/governance/check_claims.js`, `tools/governance/check_invariants.js`), `art/**` (including the untracked `art/sprites/`), `game/img/**`, and `game/js/sim/ledger*` (read-only; stale Lane L1 claim). Files claimed by lanes running at the same time are off limits: AU (DEUS_Fluid.js, game/js/sim/hydro/**, tools/sim/test_water_dynamics.js); AV (DEUS_Levels.js, DEUS_NaturalConnections.js, DEUS_WorldGen.js, tools/worldgen/**); AW (DEUS_Depth.js, DEUS_DepthCues.js, DEUS_CombatUI.js, DEUS_LayerOverlays.js, tools/layer_overlays/**); AX (DEUS_Wildlife.js, DEUS_Taming.js, game/js/sim/taming/**, tools/taming/**); AZ (game/data/plans/**, tools/plans/**); BA (DEUS_Colonists.js, game/js/sim/society/**, game/data/society/**, tools/society/**).

## Docs to read (only these)
- `docs/worldgen/DEUS_WORLDGEN_WBS.md` row SIM.40.05
- `tasks/SIM.40.05/lane-r/SIM.40.05_DECAY_CYCLE.md` sections 0 (conventions: sy, yt, DPY), R-01 (decay drivers, classes, exposure, lives, maintenance, ledger entries), R-02 (stages), R-05.3 (collapse contract), R-08.5 (slow clocks), R-10 (sparse storage), Acceptance tests, R-12.2 PROPOSED-R-01/R-02, Owner questions
- `tasks/SIM.40.05/lane-r/review_grok_9a2908fb.md`
- `docs/systems/DEUS_Materials.md`, `game/js/sim/ledger.js` public API, `docs/adr/ADR-003_sim_render_split_and_lod.md` section 17 (decay) - read only

## Scope
1. PROPOSED-R-01: decay parameter data `game/data/sim/decay_params.json` (decay classes dc, exposure classes ex, default lives `lifeYears[dc][ex]`, modifiers, stage thresholds, residue fractions) with a JSON schema and a dependency-free validator; every value that depends on an Owner question (OQ-R-01, OQ-R-04, OQ-R-05, OQ-R-09) is data with the design's default and an `ownerOpen` tag.
2. PROPOSED-R-02 (host-agnostic part): the decay clock of R-01.2 (t0 in yt, rem0 in millionths, lifeYt, failYt closed form) and the instant-keyed scheduler with long and short heaps (R-08.5), as a pure module under `game/js/sim/decay/**` with no engine globals. DPY (D-1 / DEC-026) is a parameter; do not choose a calendar.
3. Collapse hand-off (R-05.3) and ledger entries (R-01.8) as an event/record interface the future runtime lane consumes; do not wire into plugins (SIM.00.05 / SIM.40.02 not built). No mass is created or destroyed by the core; ledger bookings are returned as records or made through the ledger's public API.
4. Sparse storage per R-10 (memory scales with decaying members, not world size); report memory and per-tick arithmetic against R-10.3/R-10.4.
5. Test `tools/sim/test_decay_core.js` (headless, deterministic): the design's applicable acceptance tests (AT-R-01, AT-R-02, AT-R-05, AT-R-18, AT-R-19, AT-R-20 or those R-12.2 maps to R-01/R-02), identical fail instants at DPY=1 and DPY=N (e.g. 4 and 360), heap order and drain correctness, validator rejects bad data. Mutants: per-day rounding (review MAJOR-1), wrong heap order, a value outside schema accepted, mass created on a stage change.

## Acceptance
- Every lane.json gate test passes, with output pasted in REPORT.md.
- REPORT.md lists what changed, the evidence, open Owner questions and PROPOSED-AY-NN follow-ups.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini).
## Gate tests
- `node tools/sim/test_decay_core.js`
- `node tools/sim/test_materials.js`
- `node tools/sim/test_ledger.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art or audio, never run PixelLab or any image model, and never write generation prompts. Existing or placeholder tiles/sprites only.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AY-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/SIM.40.05/lane-ay/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing. Every new check has a killed mutant.
7. Do not merge; do not self-certify. An independent review by a different AI family (Gemini, launched later by the PM) decides. Review: any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-ay`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
