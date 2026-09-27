# Lane BC Brief: DEUS-TSK-EFFORT-POLICY honour an explicit Grok writer effort of `high` for mechanical lanes (Owner rule b, 2026-09-27 11:26 CT)

**LAUNCH GATE MET (PM, 2026-09-27 ~11:50 CT):** The Owner approved rule (b) at 11:26 CT ("Yes, turn on all three"), superseding DEC-032 item 5 (the Grok `xhigh` floor) for mechanical lanes only. The rule is recorded in docs/STATUS.md section 0 (main `214a81fa`). The live launcher library `C:\Users\snewt\.deus_worktrees\logs\pm_ops\top_models.ps1` still raises every Grok launch to `xhigh` (`Resolve-PmEffort`). The Owner asked (11:43 CT) that the change go through a lane and an independent review. Routing: writer grok-4.7 xhigh (tooling logic, multi-agent on), reviewer gemini (non-author; gemini-3.8-flash thinking HIGH is the Owner-authorised final gate while 3.1 Pro is quota-blocked until ~19:04 CT, DEC-034). Not a WBS row: PM ops task id `DEUS-TSK-EFFORT-POLICY`.

**NO ART GENERATION BY ANYONE (DEC-007).**

**Lane:** lane-bc | **Task ID:** DEUS-TSK-EFFORT-POLICY | **Branch:** task/lane-bc | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-bc` | **Writer:** grok (grok-4.7 xhigh, multi-agent on) | **Reviewer:** gemini (non-author) | **Size:** S | **Base:** origin/main `0f472b578dd17efef3cc3b921c9d0b9151f787d2`

## Why the file moves into the repo
`top_models.ps1` lives outside the repository (PM ops folder, not under git), so a review could not see a change to it. This lane brings it under review: you import the live file into the repo verbatim, then change the repo copy. After the merge the PM installs the merged file over the live one (with a backup). You never write outside your worktree: the live file under `C:\Users\snewt\.deus_worktrees\logs\pm_ops\` is READ-ONLY for you (read it, never edit it).
- Live file: `C:\Users\snewt\.deus_worktrees\logs\pm_ops\top_models.ps1`, SHA-256 `F1E271E78B140F46AE43C58DE9CAFA376827F7A433D43B2FCF9ABDBB14B2D386`, 188 lines, last written 2026-09-26 11:26 CT.
- Callers (read only, do not edit): `pm_ops\start_writer2.ps1`, `pm_ops\start_writer3.ps1` (writers), `pm_ops\start_review.ps1` (reviews), and the Gemini pulse. They dot-source the file and call `Get-PmTopModelSpec <provider> <effort> <taskType> <model> <lane>`.

## allowedPaths (exact; mirrored in `tasks/DEUS-TSK-EFFORT-POLICY/lane-bc/lane.json`)
- `tools/ops/pm_launch/**`
- `tasks/DEUS-TSK-EFFORT-POLICY/**`

**FORBIDDEN:** everything else, including every other file under `tools/ops/` (`launch_worker.ps1`, `gate_tests.json`, `hooks/**`, `run_gate.js`, `resume_queue.ps1`), `tools/governance/**`, `game/**`, `docs/**` (STATUS, OWNER_DECISIONS, WBS), `game/js/plugins.js`, `art/**` (including the untracked `art/sprites/`), and every file outside the worktree (the PM ops folder, the registry, `C:\Users\snewt\.deus_pm\**`). Never run the live launchers and never start a worker, a review or a pulse; never write `registry\model_limits.json` or `provider_status.json` (tests must not call `Set-PmModelLimit`, `Add-PmModelRun` or anything that writes outside a temp folder).

## Docs to read (only these)
- the live `top_models.ps1` (all of it) and the `Get-PmTopModelSpec` calls in `start_writer3.ps1` and `start_review.ps1` (read only)
- `docs/STATUS.md` section 0 (DEC-032 bullet and the 2026-09-27 11:26 CT Owner process rules) - read only
- `docs/OWNER_DECISIONS.md` DEC-032 - read only
- `tools/ops/README.md` section 1 (lane.json) - read only

## Scope
1. **Import verbatim (its own commit):** copy the live file to `tools/ops/pm_launch/top_models.ps1` byte for byte. Commit it alone with subject `[grok] DEUS-TSK-EFFORT-POLICY import live top_models.ps1 verbatim` and put the SHA-256 (must equal the value above) in REPORT.md. If the live hash differs from the value above, stop and escalate (someone changed the live file).
2. **Rule (b) in the repo copy:** `Resolve-PmEffort` (or its caller `Get-PmTopModelSpec`) honours an explicit `-Effort high` for a Grok launch only when ALL of these hold: provider `grok`; tier `standard` (never `big`); the lane's `lane.json` has `"effortClass": "mechanical"`; and the lane's `lane.json` `writer` is `grok` (so the launch is the writer's: reviewers are always another family). In every other case the current behaviour is unchanged: default and floor `xhigh`, anything lower raised to `xhigh`, `top` = highest. Claude, Codex, Fable and Gemini behaviour is unchanged. `medium`/`low` are still raised to the floor even for mechanical lanes (the Owner allowed `high`, nothing lower).
3. The `lane.json` lookup must reuse the existing lane.json discovery (`Resolve-PmTier`) and fail safe: missing, unreadable or malformed lane.json, a missing `effortClass`, or any other value means NOT mechanical (floor applies). Make the worktree root overridable for tests (for example `$PmWorktreeRoot`, defaulting to `C:\Users\snewt\.deus_worktrees`) without changing the default behaviour.
4. Update the header comment block: record the Owner rule (b) of 2026-09-27 11:26 CT, which lanes count as mechanical (data files, schemas, templates, catalog entries, formatting, simple specs), and that the PM marks a lane mechanical by writing `"effortClass": "mechanical"` in its lane.json at lane opening. Keep the rest of the file's behaviour byte-identical outside the change (the reviewer diffs the two commits).
5. **Test** `tools/ops/pm_launch/test_top_models_effort.ps1` (plain PowerShell 5.1, no Pester, no network, exit 0 on pass and 1 on any failure, one `PASS`/`FAIL` line per case). It dot-sources the repo copy with the worktree root pointed at a temp folder holding fake lane folders, and checks at least: grok mechanical + `high` -> `high`; grok mechanical + no effort -> `xhigh`; grok mechanical + `medium` -> `xhigh`; grok non-mechanical + `high` -> `xhigh`; grok mechanical on a big task id (e.g. WG.00.17) + `high` -> `xhigh`; grok mechanical lane whose writer is not grok + `high` -> `xhigh`; malformed lane.json -> `xhigh`; `effortClass` `"Mechanical "` or other values -> decide and document (exact match after trim/lowercase is acceptable); claude standard `high`/`max`, codex standard, gemini unchanged from the imported copy (compare against the verbatim copy loaded side by side, or hard-code the old answers). Each new rule has a mutant that the test kills (for example `-Mutant ignore_writer`, `-Mutant ignore_tier`, `-Mutant allow_medium`), run by the test itself.
6. REPORT.md: what changed (diff summary between the import commit and your tip), raw test output with EXIT, mutant results, the exact install step for the PM after merge (copy `tools/ops/pm_launch/top_models.ps1` over the live file after backing it up to `top_models.ps1.bak_20260927_effortclass`), and PROPOSED-BC-NN follow-ups (for example the PM brief template gaining an `effortClass` line).

## Acceptance
- The import commit's file hash equals the live hash above.
- Every lane.json gate test passes, with output pasted in REPORT.md.
- Outside rule (b), `Get-PmTopModelSpec` answers exactly as the imported copy for every provider and tier the test covers.
- The independent review by a different AI family passes. Only then can the task be marked DONE (by Gemini), and only then does the PM install the file.
## Gate tests
- `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/pm_launch/test_top_models_effort.ps1`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO ART OR AUDIO GENERATION BY ANYONE (DEC-007).** Never generate, draw, edit, request or integrate art or audio, never run PixelLab or any image model, and never write generation prompts.
2. Write only inside allowedPaths (mirrored in lane.json). Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-BC-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed on your branch).
5. Run every lane.json gate test before the final commit and paste the output into `tasks/DEUS-TSK-EFFORT-POLICY/lane-bc/REPORT.md`.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing. Every new check has a killed mutant.
7. Do not merge; do not self-certify. An independent review by a different AI family (Gemini, launched later by the PM) decides. Review: any missing scope item = MAJOR.
8. Push only your own branch (`git push origin task/lane-bc`); never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
