# Lane BA Brief: SOC.10.01 Person three-axis identity schema (craft, civic office, class)

**LAUNCH GATE MET (PM, 2026-09-27 ~10:30 CT, Owner-approved next-lane launch 09:58 CT):** WBS row SOC.10.01 lists no dependencies; INV-SOC-01..02 are in `docs/INVARIANT_REGISTRY.md`. `DEUS_Colonists.js` has no live claim (Lane AG merged `556d21e5`). Routing (Claude weekly conserved, Codex exhausted until Tue ~9:34 PM CT): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author; gemini-3.8-flash thinking HIGH is the Owner-authorised final gate while 3.1 Pro is quota-blocked until ~19:04 CT, DEC-034).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-ba | **Task ID:** SOC.10.01 (`docs/society/DEUS_SOCIETY_WBS.md`) | **Branch:** task/lane-ba | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-ba` | **Writer:** grok (grok-4.7 xhigh, multi-agent on) | **Reviewer:** gemini (non-author) | **Size:** M | **Base:** origin/main `2755f61947610723723384ad39ad3fbc92d4679f` | **Source:** Society WBS row SOC.10.01; INV-SOC-01, INV-SOC-02.

## allowedPaths (exact; mirrored in `tasks/SOC.10.01/lane-ba/lane.json`)
- `game/js/sim/society/**`
- `game/data/society/person_identity.schema.json`
- `game/js/plugins/DEUS_Colonists.js`
- `tools/society/**`
- `docs/systems/DEUS_PersonIdentity.md`
- `tasks/SOC.10.01/**`
Notes: `DEUS_Factions.js`, `DEUS_Callings.js`, `UF_Households.js`, `DEUS_History.js`, `DEUS_Jobs.js` are READ-ONLY here (derive from them; propose follow-ups for wiring them).

**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `docs/VISION.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool (`tools/ops/**`, `tools/governance/merge_gate.js`, `tools/governance/check_claims.js`, `tools/governance/check_invariants.js`), `art/**` (including the untracked `art/sprites/`), `game/img/**`, and `game/js/sim/ledger*` (read-only; stale Lane L1 claim). Files claimed by lanes running at the same time are off limits: AU (DEUS_Fluid.js, game/js/sim/hydro/**, tools/sim/test_water_dynamics.js); AV (DEUS_Levels.js, DEUS_NaturalConnections.js, DEUS_WorldGen.js, tools/worldgen/**); AW (DEUS_Depth.js, DEUS_DepthCues.js, DEUS_CombatUI.js, DEUS_LayerOverlays.js, tools/layer_overlays/**); AX (DEUS_Wildlife.js, DEUS_Taming.js, game/js/sim/taming/**, tools/taming/**); AY (game/js/sim/decay/**, game/data/sim/decay_params*.json, tools/sim/test_decay_core.js); AZ (game/data/plans/**, tools/plans/**).

## Docs to read (only these)
- `docs/society/DEUS_SOCIETY_WBS.md` rows SOC.10.01, SOC.11.01, SOC.12.01, SOC.20.01 (context)
- `docs/INVARIANT_REGISTRY.md` INV-SOC-01 (three independent axes) and INV-SOC-02 (current duty is operational state)
- `docs/design/EMERGENT_SOCIETY.md`, `docs/design/CLASSES.md`, `docs/design/PEOPLES.md` (person model sections)
- `tasks/SIM.50.11/gap-audit-people/PEOPLE_GAP_AUDIT.md` (people-side gaps)

## Scope
1. Canonical person identity model: independent `craft`, `civicOffice` and `class` fields, each allowing `NONE`; `class` is a 2014 SRD 5.1 class id (or NONE) with level; current duty stays operational state, not identity (INV-SOC-02). Schema `game/data/society/person_identity.schema.json` and a pure module `game/js/sim/society/identity.js` (create, validate, change one axis, serialize) with no engine globals.
2. Wire it into `DEUS_Colonists.js` minimally: every colonist (including the 72 Year-0 founders) carries an identity record; defaults derived deterministically from existing data (e.g. calling/job -> craft) where a clear mapping exists, otherwise NONE; save/load round trip; old saves without identity load and get defaults (migration).
3. Changing one axis never changes the other two (INV-SOC-01); document the mapping table and any ambiguous mapping as an Owner question.
4. Test `tools/society/test_person_identity.js` (headless, deterministic): axes independent under every single-axis change; NONE allowed on each axis; schema validation; save/load and old-save migration; Year-0 founders all have valid identities. Mutants: coupling class to craft, rejecting NONE, dropping identity on load.
5. Minimal, targeted edits to DEUS_Colonists.js; no refactors.

## Acceptance
- Every lane.json gate test passes, with output pasted in REPORT.md.
- REPORT.md lists what changed, the evidence, open Owner questions and PROPOSED-BA-NN follow-ups.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini).
## Gate tests
- `node tools/society/test_person_identity.js`
- `node tools/test_new_game_year0.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art or audio, never run PixelLab or any image model, and never write generation prompts. Existing or placeholder tiles/sprites only.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-BA-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/SOC.10.01/lane-ba/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing. Every new check has a killed mutant.
7. Do not merge; do not self-certify. An independent review by a different AI family (Gemini, launched later by the PM) decides. Review: any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-ba`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
