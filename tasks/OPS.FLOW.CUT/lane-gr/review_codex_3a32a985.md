# Independent review: OPS.FLOW.CUT lane-gr

Reviewer: codex (OpenAI family). Writer: grok. Reviewed TIP: `3a32a9853d3b4e0284be5ae924934c9aca12f1f0`. Lane base: `91d37ae5920b583590a6750b34cba6da244ae024`; writer's parent/open-lane commit: `1cfc791c`. Review date: 2026-10-01.

Scope: `git diff --name-status 91d37ae5920b583590a6750b34cba6da244ae024 HEAD` listed only paths permitted by `tasks/OPS.FLOW.CUT/lane-gr/lane.json`. The writer commit itself changed nine permitted paths relative to `1cfc791c`. I read `BRIEF.md`, `REPORT.md`, the implementation and changed tests. No `game/` path changed; game-runtime proof is inapplicable to this governance/tooling lane.

## Findings

- **BLOCKER — the current merge result conflicts.** After `git fetch origin`, `origin/main` was `de8ef5e1bc09600f802104d7130458d7aa5144cc`. `git merge-tree --write-tree origin/main HEAD` exited 1 and printed `CONFLICT (content): Merge conflict in tools/governance/merge_gate.js`. The lane cannot reach the requested temporary merge or a normal integration on that main tip. The overlapping main history includes newer PM hotfix commits in `merge_gate.js` and `launch_worker.ps1`. Reconcile those changes and rerun the review and gate on the resulting writer tip.
- **MAJOR — a saved reviewer prompt bypasses the new procedure and drops review notes.** In `tools/ops/launch_worker.ps1:1256-1273`, a launch without `-PromptFile` calls `Find-DeusSavedPrompt`; when it finds a prior reviewer prompt, it uses that text instead of `New-DeusLanePrompt`. `-ReviewNotes` is appended only when `promptSource` is `generated`. A saved reviewer prompt from before this change can therefore omit the required review file, verdict, commit and push instructions, and PM notes supplied with that launch are silently absent. The brief requires the reviewer procedure whenever no `-PromptFile` is given and requires `-ReviewNotes` to append the lane-specific points. `test_launch_worker.ps1` checks the generated reviewer path and saved prompt reuse separately, but has no saved-reviewer-plus-notes case.

## Independent checks

- `node tools/check_deus_syntax.js` — exit 0: `Checked 62 DEUS plugin files. Errors: 0`.
- `node tools/governance/test_merge_gate.js` — exit 0: `RESULT: 161 passed, 0 failed`. This included `PASS mutant_tests_at_tip_killed`, `PASS mutant_sequential_only_killed`, `PASS mutant_retry_without_flag_killed`, `PASS mutant_retry_twice_killed`, and `PASS mutant_hotfix_any_path_killed`.
- `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_launch_worker.ps1` — exit 0: `RESULT: PASS (285 checks, 0 failed)`; the suite reported `PASS no_leftover_processes`.
- `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_open_lane.ps1` — exit 0: `RESULT: PASS (22 checks, 0 failed)`; the suite reported `PASS no_leftover_processes`.
- `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_launch_worker.ps1 -Mutants -Only prompt_without_commit` — exit 0: `MUTANT prompt_without_commit: CAUGHT (exit 1; failed: required_phrases -- Commit with the subject)`.
- `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_open_lane.ps1 -Mutants -Only open_lane_wrong_author` — exit 0: `MUTANT open_lane_wrong_author: CAUGHT (exit 1;   FAIL author -- deus-wrong)`.

Not checked: a live `merge_gate` integration run or `open_lane.ps1 -Launch`. The merge-tree conflict prevents a passing gate on the current main tip. The saved-reviewer-prompt gap is established from the launcher's branch and note-appending conditions; I did not start a real provider worker for it.

VERDICT: REJECT
