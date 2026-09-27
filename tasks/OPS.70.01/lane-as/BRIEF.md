# Lane AS Brief: OPS.70.01 Invariant checker

**LAUNCH GATE MET (PM, 2026-09-27 ~02:30 CT, Owner-approved Grok writer restart 02:05 CT):** WBS dep met: OPS.30.01 (Lane Y, GATE runner + quarantine census, `tools/ops/run_gate.js`, `tools/ops/gate_tests.json`) merged to main. Routing (Claude ~98% weekly, Codex exhausted until Tue 21:34 CT): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author; gemini-3.8-flash thinking HIGH is the Owner-authorised final gate while 3.1 Pro is quota-blocked, ruling 2026-09-26 20:45 CT).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-as | **Task ID:** OPS.70.01 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`) | **Branch:** task/lane-as | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-as` | **Writer:** grok (grok-4.7 xhigh, multi-agent on) | **Reviewer:** gemini (non-author) | **Size:** M | **Base:** origin/main `a6be423d54bd2f7d4b5a5f24f51bae73f978c4de` | **Source:** `docs/CONSOLIDATION_PLAN_V1.md` (invariant checker phase); `docs/INVARIANT_REGISTRY.md`; WBS row OPS.70.01.

## allowedPaths (exact; mirrored in `tasks/OPS.70.01/lane-as/lane.json`)
- `tools/governance/check_invariants.js`
- `tools/governance/test_check_invariants.js`
- `tools/governance/fixtures/invariants/**`
- `tasks/OPS.70.01/**`

**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `docs/VISION.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool (`tools/ops/**`, `tools/governance/merge_gate.js`, `tools/governance/check_claims.js`), and `art/**`. Files claimed by live lanes are off limits: AN (DEUS_CombatRT/CombatUI/Move8/Combat.js, game/js/sim/combat_rt/**), AO (DEUS_WorldItems/Containers.js, game/js/sim/world_items/**), AP (DEUS_DepthDemo/DepthCues.js), AG (DEUS_Factions/Colonists/Ecology/WorldGen.js); `docs/INVARIANT_REGISTRY.md` and `tools/ops/gate_tests.json` are read-only for this lane.

## Docs to read (only these)
- `docs/worldgen/DEUS_WORLDGEN_WBS.md` row OPS.70.01
- `docs/INVARIANT_REGISTRY.md` (all rows)
- `docs/CONSOLIDATION_PLAN_V1.md` section on the invariant checker
- `docs/OWNER_DECISIONS.md` (read only, to see which invariants later Owner decisions supersede)
- `tools/ops/README.md` section 4 and `tools/ops/gate_tests.json` (how a suite joins the GATE list)

## Scope
1. Build `tools/governance/check_invariants.js` (node, no new dependencies): one named check per invariant in `docs/INVARIANT_REGISTRY.md` that can be checked mechanically on the repo tree (static scans and/or running the cited test with a timeout), exit 0 only when every active check passes, and print a per-invariant PASS / FAIL / NOT-MECHANICAL / SUPERSEDED table.
2. Some registry rows are stale against later Owner decisions (e.g. five strata / five macro-Z levels vs the merged 32-layer WG.00.17; Nano Banana Pro only vs the later PixelLab rulings). Do not decide which is right: mark such rows SUPERSEDED-PENDING-OWNER with the conflicting decision cited, skip them, and list each as an open Owner question in REPORT.md. Rows that are process rules (reviews, claims) are NOT-MECHANICAL unless a repo check exists.
3. Test `tools/governance/test_check_invariants.js`: every active check is seen to FAIL on a mutant fixture under `tools/governance/fixtures/invariants/**` (INV-CORE-05: tests must be able to fail), and passes on the real tree.
4. Joining the GATE list: do not edit `tools/ops/gate_tests.json`; put the exact proposed entry in REPORT.md as PROPOSED-AS-01 for the PM to apply after review.

## Acceptance
- Every lane.json gate test passes, with output pasted in REPORT.md.
- REPORT.md lists what changed, the evidence, open Owner questions and PROPOSED-AS-NN follow-ups.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini).
## Gate tests
- `node tools/governance/test_check_invariants.js`
- `node tools/governance/check_invariants.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art, and never tell anyone to.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AS-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/OPS.70.01/lane-as/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing.
7. Do not merge; do not self-certify. An independent review by a different AI family (launched later by the PM) decides.
8. Push only your own branch (`git push origin task/lane-as`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.