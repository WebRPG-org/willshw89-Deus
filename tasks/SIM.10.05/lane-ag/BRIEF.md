# Lane AG Brief: SIM.10.05 Underground Year-0 viability (PGA DEEP-06)

**LAUNCH GATE MET (PM, 2026-09-27 ~02:30 CT, Owner-approved Grok writer restart 02:05 CT):** (1) Lane AA (WG.00.17, 32 layers) merged to main (1c2fcc28) and its claim retired. (2) SIM.10.01 code is on main (`DEUS_History.js`, `DEUS_HistoricalDemographics.js`; WBS status DONE-unverified), so the WBS dependency is met; WG.00.17 is merged. (3) allowedPaths re-derived from post-AA main: underground founding lives in `DEUS_Factions.js` (`getZForSpecies`, "Subterranean founding" / `underground-pocket` rule near line 507), so `DEUS_Factions.js` is added; no live claim (AN/AO/AP) touches any AG path. Lane AE (DEUS_Ecology.js) is merged, so the Ecology overlap is gone. Routing (Claude ~98% weekly, Codex exhausted): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-ag | **Task ID:** SIM.10.05 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`) | **Branch:** task/lane-ag | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-ag` | **Writer:** grok (grok-4.7 xhigh, multi-agent on) | **Reviewer:** gemini (non-author; gemini-3.8-flash thinking HIGH is the Owner-authorised final gate while 3.1 Pro is quota-blocked, ruling 2026-09-26 20:45 CT) | **Size:** M | **Base:** origin/main `a6be423d54bd2f7d4b5a5f24f51bae73f978c4de` | **Source:** Directive 0062-BK; PGA DEEP-06 (`tasks/SIM.50.11/gap-audit-people/PEOPLE_GAP_AUDIT.md` G10-1, OQ-23, OQ-24). WBS deps SIM.10.01, WG.00.17.

## allowedPaths (exact; mirrored in `tasks/SIM.10.05/lane-ag/lane.json`)
- `game/js/plugins/DEUS_Factions.js`
- `game/js/plugins/DEUS_Colonists.js`
- `game/js/plugins/DEUS_Ecology.js`
- `game/js/plugins/DEUS_WorldGen.js`
- `tools/sim/test_underground_year0.js`
- `tools/sim/fixtures/underground_year0/**`
- `tasks/SIM.10.05/**`

**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `game/js/sim/ledger*` (unless escalated and granted), `docs/VISION.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool, and `art/**`. Files claimed by live lanes (AN: DEUS_CombatRT/CombatUI/Move8/Combat.js; AO: DEUS_WorldItems/Containers.js; AP: DEUS_DepthDemo/DepthCues.js) are off limits.

## Docs to read (only these)
- `docs/worldgen/DEUS_WORLDGEN_WBS.md` row SIM.10.05 (and SIM.10.01 for context)
- `tasks/SIM.50.11/gap-audit-people/PEOPLE_GAP_AUDIT.md`: G10-1, DEEP-06, OQ-23, OQ-24 rows only
- `docs/INVARIANT_REGISTRY.md` INV-SIM-01 (Year 0 start: no pre-simulated history)

## Scope
1. Underground-starting races (the four peoples founded below ground by `DEUS_Factions.js`) start Year 0 with viable subterranean ecology: a food source they can forage (fungal foraging), reachable water, light where their biology needs it, and walkable paths from spawn to those resources, on the 32-layer world.
2. Headless multi-seed test `tools/sim/test_underground_year0.js` (at least 20 seeds): every underground faction survives Year 0 with zero instant starvation, dehydration or pathing dead-ends. Include a mutation check that removes the fix and proves the test fails.
3. Matter comes from somewhere: do not conjure food or water from nothing. If the only way is a new energy/food source (OQ-24 options), do not choose one; list it as an open Owner question and implement the smallest option that uses existing world matter.
4. Which people lives in which layer range at 32 layers is Owner-open (OQ-23): keep the current mapping and do not change it.
5. Placeholder tiles only; no art. Minimal, targeted edits; no refactors.

## Acceptance
- Every lane.json gate test passes, with output pasted in REPORT.md.
- REPORT.md lists what changed, the evidence, open Owner questions and PROPOSED-AG-NN follow-ups.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini).

## Gate tests
- `node tools/sim/test_underground_year0.js`
- `node tools/test_new_game_year0.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art, and never tell anyone to.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AG-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/SIM.10.05/lane-ag/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing.
7. Do not merge; do not self-certify. An independent review by a different AI family (launched later by the PM) decides.
8. Push only your own branch (`git push origin task/lane-ag`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.