# lane-gk: make merge_gate and launch_worker stop costing time for process reasons (DEC-085)

| Field | Value |
|---|---|
| WBS | OPS.GATE.SMOOTH |
| taskId (manifest) | OPS.GATE.SMOOTH |
| Branch | `task/lane-gk` |
| Manifest | `tasks/OPS.GATE.SMOOTH/lane-gk/lane.json` |
| Writer -> reviewer | codex -> grok |
| Dependencies | lane-gj (OPS.GATE.LOGS), merged before this branch was cut: it edits the same files |
| RMMZ editor must be closed | no |

Base: `main` at `c79ca2d6` or later.

## Why

DEC-085 (Owner, 2026-10-01: "Do everything", after asking what could be cut from the process). Evidence from 2026-10-01, 20:36Z to 23:56Z: 9 merge_gate runs produced 3 merges. Six runs refused for process reasons, not code defects: MAIN_DIRTY (a telemetry write), RACE_REF_MOVED twice (a mail commit and tooling commits by AG landed on main while a 10-minute run was in progress, after every test had passed), MANIFEST_TAMPERED, and two flaky runs. lane-dm needed a writer fix run and a second review to fix one MINOR, because "VERDICT: PASS WITH MINORS" is not an accepted verdict. lane-do2 needed a full review for a re-cut whose code was identical to an already reviewed tip. Two mis-signed launch-record commits needed Owner-approved exceptions.

Mail, telemetry and tooling edits no longer commit to main (DEC-085 item 1), so the gate's main-must-not-move rule can be relaxed safely.

## Scope

All changes in `tools/governance/` and `tools/ops/`. Every behaviour below is a gate rule, so each gets a test case and a mutant in `tools/governance/test_merge_gate.js` (the file's own self-test: each mutant must make a case fail).

1. **`PASS WITH MINORS` is a passing verdict.** `VERDICT_PASS_RE` (merge_gate.js, near line 232) accepts `CLEAN PASS`, `PASS` and `PASS WITH MINORS` (case as today, the same decoration rules). Any other verdict line anywhere in the file still refuses. The report prints the verdict line. Cases: accepted (`VERDICT: PASS WITH MINORS`, decorated forms); refused (`VERDICT: PASS WITH MAJORS`, `VERDICT: PASS WITH MINORS` followed by a `VERDICT: REJECT` line).
2. **Main moving during the run is not a refusal by itself.** Today `doMerge` refuses `RACE_REF_MOVED` when `main` or the lane tip moved. New rule, at the merge step:
   - the lane tip moved: refuse `RACE_REF_MOVED`, as today;
   - main moved: run `git fetch origin`, then compare `<main at gate start>..origin/main`. If none of the files changed there is in the lane's own changed files (the diff recorded at gate start) and `git merge-tree --write-tree origin/main <tip>` exits 0, fast-forward local main to origin/main (it must be a fast-forward; if local main has commits origin lacks, refuse as today) and merge on top of it. If a moved file is also a lane file, or the merge-tree has a conflict, refuse `RACE_REF_MOVED` and name the files.
   - Tracked changes in main's worktree still refuse `MAIN_DIRTY`, as today (untracked and ignored files never count).
   The report says "main moved while the gate ran: <old> -> <new>; merged on top (no shared files)". Cases: main moves by an unrelated file (merges); main moves by a lane file (refused); the lane tip moves (refused); merge-tree conflict (refused). Mutants: `race_any_move_refuses` (the old behaviour), `race_ignores_shared_files`.
3. **A re-cut that changes no code needs no new review.** Today the last commit must be a review by the designated reviewer. New rule: if the commits above the last valid review commit are all single-parent `[pm]` commits that touch only `tasks/<taskId>/<lane>/BRIEF.md` and `tasks/<taskId>/<lane>/lane.json`, and `git diff <reviewed target> <tip> -- . ':!tasks/<taskId>/<lane>/'` is empty, the review stands for the tip. The report prints the review file, its target and "PM manifest/brief commits above the review; code identical". Cases: accepted; a [pm] commit above the review that changes any other path (refused `REVIEW_NOT_LAST`); a non-[pm] commit above the review (refused). Mutant: `pm_above_review_any_path`.
4. **Launch prompts are not committed to lane branches.** `launch_worker.ps1`: `-NoCommitPrompt` becomes the default. The prompt is saved under `~/.deus_ops/prompts/<lane>_<runId>.txt` (or the existing `-PromptFile` location) and `promptPath` is recorded in the telemetry entry, as today. A new `-CommitPrompt` switch restores the old behaviour. `tools/ops/test_launch_worker.ps1` (it runs the real launcher against a fake worker in a temp repo) gets cases: default makes no prompt commit and records `promptPath`; `-CommitPrompt` commits it. `tools/ops/README.md` and the script's help text say so. `tools/governance/merge_gate.js` is unchanged by this item: the `[ops]` author rule stays for any `[ops]` commit that does exist.
5. **Doc.** `tools/governance/MERGE_GATE.md` describes items 1 to 3 (accepted verdicts, the main-moved rule, the PM re-cut rule), and its reason-code table keeps `RACE_REF_MOVED` with the narrower meaning.

## Tests (lane.json gateTests; each runs in a fresh clone)

- `node tools/check_deus_syntax.js`
- `node tools/governance/test_merge_gate.js` (the count after lane-gj, plus yours)
- `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_launch_worker.ps1`

Show each new case failing under its mutant (AGENTS.md Rule 4), and quote the output. Run the existing cases first at the base to record the baseline counts.

## Out of scope

Finding the cause of the intermittent strata sub-suite failures (AUDIT_LOG A13-1; lane-gj keeps the logs that will show it). Changing which families may review. Any change to `game/`.

## Rules

- Commit only on `task/lane-gk` with the `[codex]` tag, staging only the manifest paths.
- Push `task/lane-gk` when the work is committed, and end with FINAL SHA.
- The reviewer is launched through `tools/ops/launch_worker.ps1`. The PM merges through merge_gate.
- Report in one paragraph plus the test output (DEC-085 item 5): what changed, how it was tested, what was not checked.
