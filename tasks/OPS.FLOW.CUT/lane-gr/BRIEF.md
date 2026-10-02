# lane-gr: cut four process costs from the gate and the launcher (DEC-087)

| Field | Value |
|---|---|
| WBS | OPS.FLOW.CUT |
| taskId (manifest) | OPS.FLOW.CUT |
| Branch | `task/lane-gr` |
| Manifest | `tasks/OPS.FLOW.CUT/lane-gr/lane.json` |
| Writer -> reviewer | grok -> codex |
| Dependencies | lane-gk (OPS.GATE.SMOOTH), merged `a4b785f0`: it last edited both files |
| RMMZ editor must be closed | no |

Base: `main` at `91d37ae5` or later. Pin the SHA you start from.

## Why

DEC-087 (Owner, 2026-10-02: "do all", after the PM listed eight process costs). Evidence from 2026-10-02, 00:00Z to 02:15Z: every merge_gate run took 8 to 12 minutes because its suites run one after another at the lane tip; main was red on four checks that no lane's gate saw, because two green lanes broke each other at the merge; lane-gp's gate was refused once by a census check that is not reproducible under load (AUDIT_LOG A13-17) and had to be re-run whole; two reviewer runs ended EXITED-NO-COMMIT because their prompts did not ask for a committed review file; opening a lane took the PM four manual steps.

## Scope

Every behaviour below is a gate or launcher rule, so each gets a test case and a mutant in the existing self-tests (`tools/governance/test_merge_gate.js`, `tools/ops/test_launch_worker.ps1`), or in the new `tools/ops/test_open_lane.ps1`.

1. **Gate tests run on the merge result.** In the fresh clone, after the manifest, authorship and review checks pass, merge_gate makes a temporary merge commit of `origin/main` and the lane tip (no fast-forward, a throwaway identity) and runs every gateTests command against that tree, not the tip. A conflict refuses `MERGE_CONFLICT` before any test runs. The final merge on `main` must produce the same tree; if `main` moved so that it would not, the existing moved-main rule (lane-gk) decides. The report prints `tests ran on the merge result <tree8>`. Cases: two branches each green alone whose union fails a test are refused `TEST_FAILED`; a conflicting lane is refused `MERGE_CONFLICT`. Mutant: `tests_at_tip`.
2. **Suites run in parallel, with a serial flag.** gateTests run up to 3 at a time (`--jobs N`, default 3), each in its own clone as today; a manifest entry may carry `"serial": true` and then runs alone after the parallel ones. The per-test report rows keep the wall time; the total wall time is printed. Cases: three 2-second fixture tests finish in under 4 seconds; a serial entry starts only after the others end. Mutant: `sequential_only`.
3. **One retry for a named flaky test.** A manifest entry may carry `"retryOnce": true`: when it fails, it runs once more, alone, and the gate passes if the second run passes; the report row says `flaky: passed on retry` and both logs are kept (lane-gj's log rule). No flag, no retry. Cases: a fixture test that fails on its first call and passes on the second (a marker file) passes with the flag and is refused without; a test that fails twice is refused. Mutants: `retry_without_flag`, `retry_twice`.
4. **Hotfix class (DEC-087 item 3).** `"hotfix": true` in lane.json: the gate accepts a lane with no review commit when every allowedPath is under `tools/**`, `docs/**`, `tasks/**`, `tools/fixtures/**` or `game/data/sim/**` and no commit of the lane touches any other path; otherwise `HOTFIX_SCOPE` refuses. The merge commit subject ends with `(hotfix, no review: DEC-087)`. The writer-author rules still apply. Cases: accepted; a hotfix whose diff touches `game/js/plugins/` is refused `HOTFIX_SCOPE`; a hotfix with a review is accepted as a normal lane. Mutant: `hotfix_any_path`.
5. **The reviewer prompt lives in the launcher (DEC-087 item 4).** `launch_worker.ps1` generates the reviewer prompt from lane.json and the brief when no `-PromptFile` is given: TIP is `git rev-parse HEAD` and its full hash goes in the review; check scope against allowedPaths with `git diff --name-status <merge-base> HEAD`; read the brief and the lane's REPORT.md; run the new or changed tests and the lane's named mutants, not every gate command (merge_gate runs those); `git fetch origin` and `git merge-tree --write-tree origin/main HEAD`; write `tasks/<taskId>/<lane>/review_<tag>_<tip8>.md` with findings graded BLOCKER, MAJOR or MINOR and one final line `VERDICT: CLEAN PASS`, `VERDICT: PASS`, `VERDICT: PASS WITH MINORS` or `VERDICT: REJECT`; `git add` that one path; commit with the subject `[<tag>] <taskId> <lane> review: review_<tag>_<tip8>.md (VERDICT: <verdict>)`; push; end with FINAL SHA; commit before the turn ends; never start a background command. A new `-ReviewNotes <file>` appends the PM's lane-specific points. Cases in `test_launch_worker.ps1`: the generated reviewer prompt contains each required element (a fixed phrase list in the test); `-ReviewNotes` text appears after them; `-PromptFile` still replaces the whole prompt. Mutant: `prompt_without_commit`.
6. **One-command lane opener (DEC-087 item 5).** New `tools/ops/open_lane.ps1 -Lane <lane> -Task <taskId> -Writer <w> -Reviewer <r> -BriefFile <path> [-ManifestFile <json>] [-Launch] [-WorktreeRoot ...]`: refuses when the branch or worktree exists, the brief is empty, the writer and reviewer share a family, or the manifest fails `merge_gate.validateManifest`; cuts `<WorktreeRoot>/<lane>` on `task/<lane>` from `origin/main`; writes `tasks/<taskId>/<lane>/BRIEF.md` and `lane.json` (when `-ManifestFile` is absent it writes one with `push: true`, the allowedPaths and gateTests from the brief's own ```json block, which must exist); commits as deus-pm with `git -c user.name=deus-pm -c user.email=deus-pm@local.invalid` and the subject `[pm] Open <lane> (<taskId>, writer <w>): <the brief's first heading without its "# lane-xx: " prefix>`; pushes `task/<lane>`; with `-Launch`, calls `launch_worker.ps1` for the writer with the brief path. Tests in the new `tools/ops/test_open_lane.ps1` on a temp repo (the pattern of `test_launch_worker.ps1`): opens a lane and checks the commit author, subject, files and push; refuses a duplicate lane, an empty brief, a same-family pair and a bad manifest. Mutant: `open_lane_wrong_author`.
7. **Docs.** `tools/governance/MERGE_GATE.md` describes items 1 to 4 and adds `MERGE_CONFLICT` and `HOTFIX_SCOPE` to the reason-code table; `tools/ops/README.md` describes items 5 and 6.

## Out of scope

Any change under `game/`. Which families may review. The timing-sensitive simulation behind A13-17. Changing what counts as a valid review file beyond the hotfix class.

## Files this lane may touch (allowedPaths)

- `tools/governance/merge_gate.js`, `tools/governance/test_merge_gate.js`, `tools/governance/MERGE_GATE.md`
- `tools/ops/launch_worker.ps1`, `tools/ops/test_launch_worker.ps1`, `tools/ops/open_lane.ps1`, `tools/ops/test_open_lane.ps1`, `tools/ops/README.md`
- `tasks/OPS.FLOW.CUT/lane-gr/**`

## Tests (lane.json gateTests; each runs in a fresh clone)

- `node tools/check_deus_syntax.js`
- `node tools/governance/test_merge_gate.js` (the count after lane-gk, 148, plus yours; every new mutant shown killing its case)
- `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_launch_worker.ps1`
- `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/test_open_lane.ps1`

Record the baseline counts at your base before you change anything. Show each new case failing under its mutant (AGENTS.md Rule 4) and quote the output.

## Rules

- Commit only on `task/lane-gr` with the `[grok]` tag (author deus-grok), staging only the manifest's paths (`git add <paths>`, never `-A`). Do not edit this brief or lane.json.
- Push `task/lane-gr` when the work is committed and end with FINAL SHA. Never start a background command.
- Report in one paragraph plus the test output (DEC-085 item 5): what changed, how it was tested, what was not checked. The PM launches the reviewer and merges.
- Two failed fixes on the same problem: stop, write down what you ruled out, and end your turn (AGENTS.md Rule 10).

## lane.json (draft)

```json
{ "lane": "lane-gr", "taskId": "OPS.FLOW.CUT", "branch": "task/lane-gr", "writer": "grok", "reviewer": "codex", "push": true,
  "allowedPaths": ["tools/governance/merge_gate.js", "tools/governance/test_merge_gate.js", "tools/governance/MERGE_GATE.md",
    "tools/ops/launch_worker.ps1", "tools/ops/test_launch_worker.ps1", "tools/ops/open_lane.ps1", "tools/ops/test_open_lane.ps1", "tools/ops/README.md",
    "tasks/OPS.FLOW.CUT/lane-gr/**"],
  "gateTests": [
    {"cmd":"node","args":["tools/check_deus_syntax.js"],"timeoutSec":600},
    {"cmd":"node","args":["tools/governance/test_merge_gate.js"],"timeoutSec":1200},
    {"cmd":"powershell","args":["-NoProfile","-ExecutionPolicy","Bypass","-File","tools/ops/test_launch_worker.ps1"],"timeoutSec":1200},
    {"cmd":"powershell","args":["-NoProfile","-ExecutionPolicy","Bypass","-File","tools/ops/test_open_lane.ps1"],"timeoutSec":900} ] }
```
