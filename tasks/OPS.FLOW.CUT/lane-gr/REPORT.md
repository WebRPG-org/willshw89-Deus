# lane-gr report (OPS.FLOW.CUT)

Writer grok. Base `1cfc791c` (PM open) on main `91d37ae5`. Gate self-test count before this lane, from the case table at that base: 148 (101 cases, 8 unit checks, 33 mutant kills, 6 source mutants). After this lane, `node tools/governance/test_merge_gate.js` printed `RESULT: 161 passed, 0 failed` (109 cases, 8 unit checks, 38 mutant kills, 6 source mutants). `tools/ops/test_launch_worker.ps1` printed `RESULT: PASS (285 checks, 0 failed)`. `node tools/check_deus_syntax.js` printed `Checked 62 DEUS plugin files. Errors: 0`.

The merge gate now runs `gateTests` on a throwaway merge of `origin/main` and the lane tip (`deus-merge-gate`), up to `--jobs` at a time (default 3), with `"serial": true` after that pool and one `"retryOnce"` retry whose row reads `flaky: passed on retry`. A content conflict is `MERGE_CONFLICT` before any test. `"hotfix": true` with no review is accepted only inside `tools/**`, `docs/**`, `tasks/**`, `tools/fixtures/**` and `game/data/sim/**`; the merge subject then ends with `(hotfix, no review: DEC-087)`. A hotfix that already has a review is a normal lane.

`launch_worker.ps1` generates the reviewer procedure (tip hash, scope diff, brief, `REPORT.md`, named mutants, `merge-tree`, review file, verdict, commit, push, `FINAL SHA`, no background command). `-ReviewNotes` appends after that procedure. `-PromptFile` still replaces the whole prompt. `open_lane.ps1` cuts `task/<lane>` from `origin/main`, commits `BRIEF.md` and `lane.json` as `deus-pm`, and pushes.

Not checked here: a real `merge_gate` run against this lane (the reviewer and the PM do that), and `-Launch` on `open_lane.ps1` (the tests do not start a worker). No game code was edited.
