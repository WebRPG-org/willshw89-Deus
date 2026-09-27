# Lane AZ Brief: SOC.10.02 Faction Development Plan spec and JSON schema

**LAUNCH GATE MET (PM, 2026-09-27 ~10:30 CT, Owner-approved next-lane launch 09:58 CT):** WBS row SOC.10.02 lists no dependencies; DEC-015 is DECIDED (Owner 00:52 CT). `game/data/plans/` does not exist on main and has no claim. SOC.10.03 (the nine race plan files) is NOT in scope. Routing (Claude weekly conserved, Codex exhausted until Tue ~9:34 PM CT): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author; gemini-3.8-flash thinking HIGH is the Owner-authorised final gate while 3.1 Pro is quota-blocked until ~19:04 CT, DEC-034).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-az | **Task ID:** SOC.10.02 (`docs/society/DEUS_SOCIETY_WBS.md`) | **Branch:** task/lane-az | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-az` | **Writer:** grok (grok-4.7 xhigh, multi-agent on) | **Reviewer:** gemini (non-author) | **Size:** M | **Base:** origin/main `2755f61947610723723384ad39ad3fbc92d4679f` | **Source:** Society WBS row SOC.10.02; DEC-015; V141.

## allowedPaths (exact; mirrored in `tasks/SOC.10.02/lane-az/lane.json`)
- `game/data/plans/faction_plan.schema.json`
- `game/data/plans/TEMPLATE.plan.json`
- `tools/plans/**`
- `docs/systems/DEUS_FactionPlans.md`
- `tasks/SOC.10.02/**`
Notes: Every game plugin and `game/data/**` outside the two plan files are READ-ONLY. No gameplay code changes.

**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `docs/VISION.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool (`tools/ops/**`, `tools/governance/merge_gate.js`, `tools/governance/check_claims.js`, `tools/governance/check_invariants.js`), `art/**` (including the untracked `art/sprites/`), `game/img/**`, and `game/js/sim/ledger*` (read-only; stale Lane L1 claim). Files claimed by lanes running at the same time are off limits: AU (DEUS_Fluid.js, game/js/sim/hydro/**, tools/sim/test_water_dynamics.js); AV (DEUS_Levels.js, DEUS_NaturalConnections.js, DEUS_WorldGen.js, tools/worldgen/**); AW (DEUS_Depth.js, DEUS_DepthCues.js, DEUS_CombatUI.js, DEUS_LayerOverlays.js, tools/layer_overlays/**); AX (DEUS_Wildlife.js, DEUS_Taming.js, game/js/sim/taming/**, tools/taming/**); AY (game/js/sim/decay/**, game/data/sim/decay_params*.json, tools/sim/test_decay_core.js); BA (DEUS_Colonists.js, game/js/sim/society/**, game/data/society/**, tools/society/**).

## Docs to read (only these)
- `docs/society/DEUS_SOCIETY_WBS.md` rows SOC.10.01, SOC.10.02, SOC.10.03
- `docs/OWNER_DECISIONS.md` DEC-015 and DEC-013 (depth bands) - read only; `docs/VISION.md` V141 - read only
- `docs/design/AUTONOMOUS_CIVILIZATION.md`, `docs/art/DEUS_RACIAL_BUILDING_BIBLE_TEMPLATE.md`, `docs/design/TECH_TREE.md`
- `docs/INVARIANT_REGISTRY.md` INV-SOC-01..03

## Scope
1. Spec `docs/systems/DEUS_FactionPlans.md` and JSON Schema `game/data/plans/faction_plan.schema.json` covering: 6 settlement stages (camp, hamlet, village, town, city, capital) with required population, buildings, roles and institutions; unlock prerequisites; dynamic build-order priorities per stage that adapt under peace, threat, famine and abundance; class and occupation mix per stage mapped to the SOC.10.01 axes (`craft`, `civicOffice`, `class`, each allowing `NONE`); technology and knowledge paths (craft and construction unlocks); architectural style per race linked to the building-bible template and the race's DEC-013 home-layer band; expansion rules (colonization distance, terrain) and failure modes (regression and collapse conditions).
2. `game/data/plans/TEMPLATE.plan.json`: a structurally complete plan that validates, with every race-specific cultural value (lore, names, values, style choices) marked `OWNER_TODO` (DEC-015 item 4). Do not author the nine race plans (SOC.10.03).
3. Dependency-free validator `tools/plans/validate_faction_plan.js` (CLI, exit non-zero on error, clear messages) plus consistency checks the schema alone cannot express (stages ordered, prerequisites reference existing ids, occupation mix sums, band ids valid).
4. Test `tools/plans/test_faction_plan_schema.js` with fixtures under `tools/plans/fixtures/**`: the template validates; each mutant fixture fails (missing stage, unknown prerequisite, bad band, occupation mix not summing, a cultural field filled with invented lore instead of OWNER_TODO in the template).
5. Docs and data only; consumers (autonomous civilization logic, deep history) are future lanes - list them as PROPOSED-AZ-NN.

## Acceptance
- Every lane.json gate test passes, with output pasted in REPORT.md.
- REPORT.md lists what changed, the evidence, open Owner questions and PROPOSED-AZ-NN follow-ups.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini).
## Gate tests
- `node tools/plans/test_faction_plan_schema.js`
- `node tools/plans/validate_faction_plan.js game/data/plans/TEMPLATE.plan.json`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art or audio, never run PixelLab or any image model, and never write generation prompts. Existing or placeholder tiles/sprites only.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AZ-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/SOC.10.02/lane-az/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing. Every new check has a killed mutant.
7. Do not merge; do not self-certify. An independent review by a different AI family (Gemini, launched later by the PM) decides. Review: any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-az`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
