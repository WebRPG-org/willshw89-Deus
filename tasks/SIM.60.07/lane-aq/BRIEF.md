# Lane AQ Brief: SIM.60.07 UF.Rules routing for wildlife damage

**LAUNCH GATE MET (PM, 2026-09-27 ~02:30 CT, Owner-approved Grok writer restart 02:05 CT):** WBS deps met: SIM.60.05 (Lane AB, SRD rules engine `game/js/sim/rules/**`) merged to main, WG.00.17 (Lane AA) merged. The work is Lane AB review MINOR-9 / PROPOSED-AB-05. DEUS_Wildlife.js has no live claim. Routing (Claude ~98% weekly, Codex exhausted until Tue 21:34 CT): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author; gemini-3.8-flash thinking HIGH is the Owner-authorised final gate while 3.1 Pro is quota-blocked, ruling 2026-09-26 20:45 CT).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-aq | **Task ID:** SIM.60.07 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`) | **Branch:** task/lane-aq | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-aq` | **Writer:** grok (grok-4.7 xhigh, multi-agent on) | **Reviewer:** gemini (non-author) | **Size:** S | **Base:** origin/main `a6be423d54bd2f7d4b5a5f24f51bae73f978c4de` | **Source:** Lane AB review MINOR-9 (`tasks/SIM.60.05/lane-ab/review_claude_1057a448.md`), PROPOSED-AB-05 (`tasks/SIM.60.05/lane-ab/REPORT.md`); DEC-027.

## allowedPaths (exact; mirrored in `tasks/SIM.60.07/lane-aq/lane.json`)
- `game/js/plugins/DEUS_Wildlife.js`
- `tools/sim/test_wildlife_rules_damage.js`
- `tools/sim/fixtures/wildlife_rules/**`
- `tasks/SIM.60.07/**`

**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `docs/VISION.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool (`tools/ops/**`, `tools/governance/merge_gate.js`, `tools/governance/check_claims.js`), and `art/**`. Files claimed by live lanes are off limits: AN (DEUS_CombatRT/CombatUI/Move8/Combat.js, game/js/sim/combat_rt/**), AO (DEUS_WorldItems/Containers.js, game/js/sim/world_items/**), AP (DEUS_DepthDemo/DepthCues.js), AG (DEUS_Factions/Colonists/Ecology/WorldGen.js); `game/js/sim/rules/**` is read-only for this lane (Lane AB merged; if UF.Rules itself needs a change, escalate).

## Docs to read (only these)
- `docs/worldgen/DEUS_WORLDGEN_WBS.md` row SIM.60.07
- `tasks/SIM.60.05/lane-ab/review_claude_1057a448.md` MINOR-9 and `tasks/SIM.60.05/lane-ab/REPORT.md` PROPOSED-AB-05
- `game/js/sim/rules/rules.js` (API: `attack`, `damage`, `hitPoints`), `docs/systems/` UF.Rules doc if present

## Scope
1. `game/js/plugins/DEUS_Wildlife.js` (predator hunt, around lines 1115-1125 on main) subtracts the species catalog `combat.attack` from prey HP next to its `UF.Combat.engage` call: a second damage law outside UF.Rules. Route that damage through `UF.Rules` (SRD attack roll then damage, with the rules engine's seeded RNG) so there is exactly one damage law. Read how `UF.Combat.engage` already applies damage (read only; `DEUS_Combat.js` is Lane AN's file) and make sure prey is never damaged twice for one attack.
2. Keep behaviour when `UF.Rules` or `UF.Combat` is absent (headless or disabled) deterministic and documented; kills, yields drops, `wildlife:kill` events and feeding state must still work.
3. Test `tools/sim/test_wildlife_rules_damage.js`: headless, seeded; proves damage now comes from UF.Rules (e.g. AC/miss changes the outcome), no double damage with Combat enabled, deterministic across runs, kill/yield path intact; includes mutants (restore the catalog subtraction; double-apply) that make it fail.
4. Minimal, targeted edits; no refactors of DEUS_Wildlife.js.

## Acceptance
- Every lane.json gate test passes, with output pasted in REPORT.md.
- REPORT.md lists what changed, the evidence, open Owner questions and PROPOSED-AQ-NN follow-ups.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini).
## Gate tests
- `node tools/sim/test_wildlife_rules_damage.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art, and never tell anyone to.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AQ-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/SIM.60.07/lane-aq/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing.
7. Do not merge; do not self-certify. An independent review by a different AI family (launched later by the PM) decides.
8. Push only your own branch (`git push origin task/lane-aq`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.