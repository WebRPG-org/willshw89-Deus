# Lane AF Brief: SIM.50.12 Living-world rule-breach fix package (re-scoped: post-merge regression plus residual fixes)

**STATUS: OPEN.** Launch gates met 2026-09-27 ~08:15 CT (AA 1c2fcc28, AE 2f97fae4, AD 72c69b2f on main; Gemini recorded SIM.50.12 re-scope in WBS Rev 28 / DoD text). Writer grok-4.7 xhigh, reviewer gemini-3.8-flash thinking HIGH (Pro held until ~19:04 CT; Claude weekly conserved).

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-af | **Task ID:** SIM.50.12 (`docs/worldgen/DEUS_WORLDGEN_WBS.md`, Rev 26) | **Branch:** task/lane-af | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-af` | **Writer:** claude | **Reviewer:** grok | **Size:** M | **Base:** origin/main `c58df3bac659e0b0278a2767a991bc2d4b4e10aa` (set at open time) | **Source:** Directive 0062-BK; LWGA F-01..F-05. WBS dep SIM.50.01. PM finding: as written, F-01/F-02 duplicate WG.00.17, F-03/F-05 duplicate SIM.50.13 and F-04 duplicates SIM.40.11, so launching it now would collide with three other packages. PM brief prepared 2026-09-26 by main-chat ops for the Owner.

## LAUNCH GATE (all must be true)
1. Lane AA (WG.00.17) merged: LWGA F-01/F-02 are fixed by WG.00.17 itself.
2. Lane AE (SIM.50.13) merged: covers F-03 and F-05.
3. Lane AD (SIM.40.11) merged: covers F-04.
4. Gemini records the re-scope proposed in Directive 0068-BQ (SIM.50.12 becomes a post-merge regression suite for F-01..F-05 across 32 layers plus fixes for anything still failing).

**Provider at launch:** Grok writer (grok-4.7 xhigh, multi-agent on), Gemini reviewer (gemini-3.8-flash thinking HIGH while Pro limited). Claude weekly conserved; Codex exhausted until Tue.

## allowedPaths (exact; mirrored in `tasks/SIM.50.12/lane-af/lane.json`)
- `tools/sim/test_living_world_rules.js`
- `tools/sim/fixtures/living_world/**`
- `tasks/SIM.50.12/**`

**FORBIDDEN:** everything else, including `game/js/plugins.js`, `game/js/sim/ledger*` (unless escalated and granted), `docs/VISION.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, every `*WBS*.md`, every gate tool, and `art/**`.

## Scope
1. Write one regression test per LWGA finding F-01..F-05 that runs at -16..+15 and at the -4..+4 test range and fails on the pre-fix main (prove it by running against the recorded pre-fix commit in a %TEMP% clone).
2. Fix any residual breach the suite still finds, touching only the files the PM grants at launch (list them in escalation.md first if they are not in allowedPaths).

## Acceptance
- Every lane.json gate test passes, with output pasted in REPORT.md.
- REPORT.md lists what changed, the evidence, open Owner questions and PROPOSED-AF-NN follow-ups.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini).

## Gate tests
- `node tools/sim/test_living_world_rules.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art, and never tell anyone to.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AF-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch). Heavy NW.js runs only in throwaway clones under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into `tasks/SIM.50.12/lane-af/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing.
7. Do not merge; do not self-certify. An independent review by a different AI family (launched later by the PM) decides.
8. Push only your own branch (`git push origin task/lane-af`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
