# lane-gj: keep the evidence when a gate test fails (AUDIT_LOG A13-1)

| Field | Value |
|---|---|
| WBS | OPS.GATE.LOGS |
| taskId (manifest) | OPS.GATE.LOGS |
| Branch | `task/lane-gj` |
| Manifest | `tasks/OPS.GATE.LOGS/lane-gj/lane.json` |
| Writer -> reviewer | gemini -> codex (Owner, 2026-10-01: "Keep gemini coding too") |
| Dependencies | lane-gg (OPS.GATE.AUTHOR), merged before this branch was cut |
| RMMZ editor must be closed | no |

Base: `main` at `b135a222` or later.

## Why

AUDIT_LOG A13-1. On 2026-10-01, merge_gate refused lane-dc twice at test 3, `tools/test_strata_cuts_and_caves.js`, with "28 passed, 2 failed - fluid_suite, foundation_suite". The same test then passed 30/30 four times. The reason for the two failures was never seen, for two reasons:
- merge_gate prints only the last 20 lines of a failed test's log, and deletes its temp clones and logs unless `--keep-temp` was given;
- the strata test prints its FAIL lines early in its output (the sub-suites run in their own processes), so they fall outside those 20 lines.

## Scope

1. **`tools/governance/merge_gate.js`.** When any test ends FAIL, TIMEOUT or SPAWN ERROR, keep the temp directory, as `--keep-temp` does today, and print its path. In the report, under the failed test's tail, add up to 20 lines of that test's log that contain `FAIL` (case-sensitive word match), so the failing checks show even when they are not in the tail. A passing run still deletes its temp directory unless `--keep-temp` was given. Update `tools/governance/MERGE_GATE.md` to say so.
2. **`tools/governance/test_merge_gate.js`.** Add cases for both behaviours:
   - a failing fixture test keeps its temp dir, and the report shows its FAIL lines;
   - a passing run deletes its temp dir.
   Add a mutant for each (for example `keep_failed_temp_off`, `fail_lines_off`) to `MUTANTS` and `KILLS`, so the self-test shows each one caught. Every existing case still passes.
3. **`tools/test_strata_cuts_and_caves.js`.** When a sub-suite (`fluid_suite`, `foundation_suite`) fails, print the last 40 lines of its output just before the final `RESULT:` line. Change no check and no threshold.

## Tests (lane.json gateTests; each runs in a fresh clone)

- `node tools/check_deus_syntax.js`
- `node tools/governance/test_merge_gate.js` (129 checks at base after OPS.GATE.AUTHOR; more at the tip)
- `node tools/test_strata_cuts_and_caves.js`

Show the new merge_gate cases failing under their mutants (AGENTS.md Rule 4). For the strata test, show the new block with a provoked sub-suite failure, for example a temp copy with one sub-suite's check broken. Quote the output.

## Out of scope

Finding the cause of the lane-dc flake. With this lane merged, the next failure will show it.

## Rules

- Commit only on `task/lane-gj` with the `[gemini]` tag (launch_worker authors it `deus-gemini`), staging only the manifest paths.
- Push `task/lane-gj` when the work is committed, and end with FINAL SHA.
- The reviewer is launched through `tools/ops/launch_worker.ps1`. The PM merges through merge_gate.
- Report in the AGENTS.md format and write "not checked" for anything not observed.
