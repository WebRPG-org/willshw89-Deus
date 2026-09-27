# Lane AT Brief: OPS.40.06 Lessons and mistakes log

**LAUNCH GATE MET (PM, 2026-09-27 ~02:30 CT, Owner-approved Grok writer restart 02:05 CT):** WBS row OPS.40.06 has no dependencies; `docs/LESSONS_AND_MISTAKES.md` does not exist on main and has no claim. Routing (Claude ~98% weekly, Codex exhausted until Tue 21:34 CT): writer grok-4.7 xhigh (multi-agent on), reviewer gemini (non-author; gemini-3.8-flash thinking HIGH is the Owner-authorised final gate while 3.1 Pro is quota-blocked, ruling 2026-09-26 20:45 CT).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-at | **Task ID:** OPS.40.06 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`) | **Branch:** task/lane-at | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-at` | **Writer:** grok (grok-4.7 xhigh, multi-agent on) | **Reviewer:** gemini (non-author) | **Size:** S | **Base:** origin/main `a6be423d54bd2f7d4b5a5f24f51bae73f978c4de` | **Source:** [MD] m18; WBS row OPS.40.06.

## allowedPaths (exact; mirrored in `tasks/OPS.40.06/lane-at/lane.json`)
- `docs/LESSONS_AND_MISTAKES.md`
- `tasks/OPS.40.06/**`

**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `docs/VISION.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool (`tools/ops/**`, `tools/governance/merge_gate.js`, `tools/governance/check_claims.js`), and `art/**`. Files claimed by live lanes are off limits: AN (DEUS_CombatRT/CombatUI/Move8/Combat.js, game/js/sim/combat_rt/**), AO (DEUS_WorldItems/Containers.js, game/js/sim/world_items/**), AP (DEUS_DepthDemo/DepthCues.js), AG (DEUS_Factions/Colonists/Ecology/WorldGen.js).

## Docs to read (only these)
- `docs/worldgen/DEUS_WORLDGEN_WBS.md` row OPS.40.06 (the six required seed entries)
- `docs/STATUS.md` section "Open Defects & Blockers" (DEF-* rows), read only
- git history for the cited commits (`git show --stat <sha>`, `git log`), read only

## Scope
1. Create `docs/LESSONS_AND_MISTAKES.md`: a durable log of process mistakes and the rule each one produced. Entry format: ID (LM-NNN), date, what happened, evidence (commit hash or repo path that exists), impact, the rule/guard now in place (cite the file, test or directive), status.
2. It must contain at least the six WBS seed entries, each citing a real commit or path: the fabricated `task/lane-b` hash (`ed757456`); SyntaxError output taken as proof of a passing test; 27 vs 28 mutants miscounted; exit codes lost inside `powershell -Command`; merge before review (`0f7f26cd` landed before `16fec107`); self-certification (`59573b81`, `4b9673c6`).
3. Add further entries only where the evidence is in the repo (e.g. DEF-COORD-* rows in docs/STATUS.md). Verify every cited hash with `git cat-file -e <sha>` and every path exists; paste that verification output in REPORT.md. Never invent a hash (that is itself seed lesson 1).
4. Docs only; no code changes.

## Acceptance
- Every lane.json gate test passes, with output pasted in REPORT.md.
- REPORT.md lists what changed, the evidence, open Owner questions and PROPOSED-AT-NN follow-ups.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini).
## Gate tests
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art, and never tell anyone to.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AT-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/OPS.40.06/lane-at/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing.
7. Do not merge; do not self-certify. An independent review by a different AI family (launched later by the PM) decides.
8. Push only your own branch (`git push origin task/lane-at`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.