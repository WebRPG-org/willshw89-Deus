# Lane AD Brief: SIM.40.11 Matter-conserving ledger integration and world reclamation

**LAUNCH GATE MET (PM, 2026-09-26 ~21:10 CT):** (1) SIM.40.00 / Lane AC merged (MERGED row in docs/STATUS.md). (2) Lane AA (WG.00.17) merged to main after the Owner-authorised Gemini 3.8 Flash final-gate review (Owner ruling 20:45 CT) and its STATUS claim row set to MERGED / write access revoked in the same PM commit that registers this lane. (3) allowedPaths re-checked against the live STATUS claims table: no live claim on any path below. Routing (Claude ~98% weekly, Codex exhausted): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-ad | **Task ID:** SIM.40.11 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`, Rev 26) | **Branch:** task/lane-ad | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-ad` | **Writer:** grok (grok-4.7 xhigh, multi-agent on) | **Reviewer:** gemini (non-author; while gemini-3.1-pro-preview is quota-blocked the Owner-authorised final gate is gemini-3.8-flash thinking HIGH, ruling 2026-09-26 20:45 CT) | **Size:** L | **Base:** origin/main `1c2fcc28736566f8dd4f14ccd0633f09687e3521` (set at open time) | **Source:** Directive 0063-BL; DEC-028 (matter conserved by weight, closed-loop reclamation). WBS deps: WG.65.15 (merged 1f683b94), SIM.40.01 (merged d655c122), SIM.40.05 (merged 7f07ee48), SIM.40.00 (Lane AC, running). Fixes LWGA F-03 and F-04 (`docs/audits/LIVING_WORLD_GAP_AUDIT.md`). PM brief prepared 2026-09-26 by main-chat ops for the Owner.

## LAUNCH GATE (all must be true)
1. SIM.40.00 (Lane AC) merged to main with its independent review PASS (this lane consumes game/data/sim/** and game/js/sim/materials.js).
2. Lane AA (WG.00.17) merged to main and its claim retired: DEUS_Jobs/Walls/Floors/Objects/Items.js are in Lane AA's live write set.
3. PM re-checks allowedPaths below against the live STATUS claims table and trims them to the files actually needed before opening.

**Provider at launch (PM 21:10 CT):** Grok writer (grok-4.7 --reasoning-effort xhigh, multi-agent on, via start_writer3.ps1 -Provider grok) / Gemini reviewer (non-author). Claude (~98% weekly) and Codex (exhausted until Tue 21:34 CT) are not used.

## allowedPaths (exact; mirrored in `tasks/SIM.40.11/lane-ad/lane.json`)
- `game/js/sim/reclaim.js`
- `game/js/plugins/DEUS_Jobs.js`
- `game/js/plugins/DEUS_Walls.js`
- `game/js/plugins/DEUS_Floors.js`
- `game/js/plugins/DEUS_Objects.js`
- `game/js/plugins/DEUS_Items.js`
- `tools/sim/test_reclaim.js`
- `tools/sim/test_reclaim_longrun.js`
- `tools/sim/fixtures/reclaim/**`
- `docs/systems/DEUS_Reclamation.md`
- `tasks/SIM.40.11/**`

**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/sim/ledger*` (unless escalated and granted), `docs/VISION.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool, and `art/**`.

## Scope
1. Make `game/js/sim/ledger*` the single accounting authority for material mass: every mining, building, deconstruction, collapse and decay event posts a balanced debit/credit by weight using SIM.40.00 material masses. The ledger module itself stays read only unless the review of WG.65.15 allows an additive hook; if a ledger change is needed, escalate.
2. New pure module `game/js/sim/reclaim.js`: terrain reclamation that converts accumulated outdoor loose items, rubble and ruins back into soil/stone per SIM.40.05 decay rules, conserving weight exactly (zero creation, zero deletion).
3. Wire the plugins with minimal, reviewed hooks only (no refactors).
4. Deterministic long-run tests: seeded multi-thousand-tick runs across mining/build/collapse/decay/reclaim with total mass per material class constant to the gram; mutation checks prove the tests catch a leaked or duplicated gram.

## Acceptance
- Every lane.json gate test passes, with output pasted in REPORT.md.
- REPORT.md lists what changed, the evidence, open Owner questions and PROPOSED-AD-NN follow-ups.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini).

## Gate tests
- `node tools/sim/test_reclaim.js`
- `node tools/sim/test_reclaim_longrun.js`
- `node tools/sim/test_ledger.js`
- `node tools/sim/test_materials.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art, and never tell anyone to.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AD-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/SIM.40.11/lane-ad/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing.
7. Do not merge; do not self-certify. An independent review by a different AI family (launched later by the PM) decides.
8. Push only your own branch (`git push origin task/lane-ad`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
