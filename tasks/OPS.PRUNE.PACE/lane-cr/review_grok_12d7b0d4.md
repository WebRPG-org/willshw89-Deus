# Grok review: OPS.PRUNE.PACE lane-cr tip 12d7b0d4

Reviewed commit: `12d7b0d4ae47d657aeecf4b3ed4eb0ab157bd11f`

Independent review of the lane-cr tip. Reviewer is Grok (xAI family). The writer commits under review are Codex. No file other than this review was created or modified. `tools/ops/pace.js` and `tools/ops/test_pace.js` were executed and read, then left unchanged.

## Worktree identity

Commands ran in `C:\Users\snewt\.deus_worktrees\lane-cr` on branch `task/lane-cr`. Node v24.19.0.

```text
$ git rev-parse HEAD
12d7b0d4ae47d657aeecf4b3ed4eb0ab157bd11f
EXIT=0

$ git log -1 --format="%H %an %s"
12d7b0d4ae47d657aeecf4b3ed4eb0ab157bd11f deus-codex [codex] OPS.PRUNE.PACE record foreground gate evidence and handoff
EXIT=0

$ git merge-base HEAD origin/main
6d70b0ff0f8e9c42df5accbf56763c84eec8af54
EXIT=0

$ git status --short
?? tasks/OPS.PRUNE.PACE/lane-cr/launches/20260930_142248_prompt.txt
```

HEAD is `12d7b0d4ae47d657aeecf4b3ed4eb0ab157bd11f`. The untracked launch prompt was already present and is outside this review commit.

Commits from the merge-base through the tip:

```text
12d7b0d4 [codex] OPS.PRUNE.PACE record foreground gate evidence and handoff
8560efa6 [codex] OPS.PRUNE.PACE correct decimal ratio boundary handling
9f59d7a0 [codex] OPS.PRUNE.PACE implement grounded pacing and mutation checks
409e085c [codex] OPS.PRUNE.PACE checkpoint scope and evidence plan
d2a9c8c2 [ops] OPS.PRUNE.PACE lane-cr launch prompt 20260930_125816 (writer codex)
863f7f68 [gemini] OPS.PRUNE.PACE: add lane manifest and brief for lane-cr
```

`12d7b0d4ae47d657aeecf4b3ed4eb0ab157bd11f` itself adds the handoff report, state update, and `evidence/*.log`. The pacing implementation is in the tip tree via `9f59d7a0` and the decimal-boundary correction `8560efa6`. This review judges that tree.

## Allowlist

`tasks/OPS.PRUNE.PACE/lane-cr/lane.json` allows `tools/ops/pace.js`, `tools/ops/test_pace.js`, and `tasks/OPS.PRUNE.PACE/lane-cr/**`.

```text
$ git diff --name-status 6d70b0ff0f8e9c42df5accbf56763c84eec8af54 HEAD
A	tasks/OPS.PRUNE.PACE/lane-cr/.gitignore
A	tasks/OPS.PRUNE.PACE/lane-cr/BRIEF.md
A	tasks/OPS.PRUNE.PACE/lane-cr/README.md
A	tasks/OPS.PRUNE.PACE/lane-cr/REPORT.md
A	tasks/OPS.PRUNE.PACE/lane-cr/evidence/checked-in-snapshot.log
A	tasks/OPS.PRUNE.PACE/lane-cr/evidence/missing-reset.log
A	tasks/OPS.PRUNE.PACE/lane-cr/evidence/mutants.log
A	tasks/OPS.PRUNE.PACE/lane-cr/evidence/pace-gate.log
A	tasks/OPS.PRUNE.PACE/lane-cr/evidence/stale-reading.log
A	tasks/OPS.PRUNE.PACE/lane-cr/evidence/syntax-gate.log
A	tasks/OPS.PRUNE.PACE/lane-cr/evidence/ungrounded-estimate.log
A	tasks/OPS.PRUNE.PACE/lane-cr/evidence/wrong-band.log
A	tasks/OPS.PRUNE.PACE/lane-cr/lane.json
A	tasks/OPS.PRUNE.PACE/lane-cr/launches/20260930_125816_prompt.txt
A	tasks/OPS.PRUNE.PACE/lane-cr/state.md
A	tools/ops/pace.js
A	tools/ops/test_pace.js
```

17 paths, 2044 insertions, all additions. Every path matches the allowlist. `git diff --check 6d70b0ff0f8e9c42df5accbf56763c84eec8af54 HEAD` exited 0. No pre-existing tracked file is modified. `.gitignore` ignores only `.local/`.

## Gates I ran

| Command | Observed result |
|---|---|
| `node tools/check_deus_syntax.js` | `Checked 62 DEUS plugin files. Errors: 0`, EXIT=0 |
| `node --check tools/ops/pace.js` | EXIT=0 |
| `node --check tools/ops/test_pace.js` | EXIT=0 |
| `node tools/ops/test_pace.js` | `RESULT: 117 passed, 0 failed`, EXIT=0 |
| `node tools/ops/test_pace.js --mutants` | baseline 117/0, then `MUTANTS: 9 killed, 0 survived`, EXIT=0 |

The syntax gate counts DEUS plugins. It does not parse the new pace scripts. Direct `node --check` on both scripts passed.

The baseline log includes the CLI checks: two foreground polls, read-only history preservation, stdin JSON, bad input, corrupt history left in place, missing input, unknown option, invalid cost, and input/history path collision.

### Mutant commands as specified

`node tools/ops/test_pace.js --mutant=<name>` for all nine names (`wrong-band`, `missing-reset`, `stale-reading`, `ungrounded-estimate`, `wrong-window`, `wrong-target`, `wrong-measured`, `no-surge`, `mix-reset`) each exited 1. Each one stopped at the harness usage throw in `tools/ops/test_pace.js` (`Usage: test_pace.js [--mutants | --mutant NAME]`). That spelling does not load a mutant.

The harness contract, and the lane README, is two arguments: `--mutant NAME`. I ran that form for the same nine names. Each exited 1 with assertion failures, and `--mutants` reports the required check killed:

| Mutant | `--mutant NAME` result | Required check killed |
|---|---|---|
| wrong-band | 105 passed, 3 failed, EXIT=1 | `band_0` |
| missing-reset | 100 passed, 8 failed, EXIT=1 | `missing_reset_unknown` |
| stale-reading | 106 passed, 2 failed, EXIT=1 | `stale_reading_rejected` |
| ungrounded-estimate | 101 passed, 7 failed, EXIT=1 | `ungrounded_precision_SESSION_ONLY` |
| wrong-window | 104 passed, 4 failed, EXIT=1 | `weekly_precedes_shortest` |
| wrong-target | 96 passed, 12 failed, EXIT=1 | `measured_target_ratio` |
| wrong-measured | 94 passed, 14 failed, EXIT=1 | `measured_target_ratio` |
| no-surge | 106 passed, 2 failed, EXIT=1 | `surge_overrides_high_ratio` |
| mix-reset | 107 passed, 1 failed, EXIT=1 | `reset_cycle_not_mixed` |

Mutants patch an in-memory copy of `pace.js`. The production CLI has no mutant switch. After these runs, `git status` showed no change to either script.

## Adversarial reading of the tip

`tools/ops/pace.js` is a one-shot report. `main` parses local flags, reads JSON (file or stdin), evaluates, optionally writes local history, and prints. The file does not import `child_process` and does not call a provider, a network API, or a scheduler. The only `.exec` is the UTC regex. Recommendations are text or JSON. Exit 0 includes UNKNOWN lines, which matches the contract that exit status is not dispatch authority.

Band edges in `classify` (`pace.js` lines 31-38) match the brief:

- ratio below 0.5 is `ACCELERATE-2`; 0.5 is `ACCELERATE-1`
- below 0.9 stays `ACCELERATE-1`; 0.9 through 1.1 inclusive is `HOLD`
- above 1.1 through 1.5 inclusive is `THROTTLE-1`; above 1.5 is `THROTTLE-2`
- non-finite, negative, and non-numeric ratios are `UNKNOWN`

A direct `classify` probe and a derived-ratio probe at 0.5, 0.899999, 0.9, 1.1, 1.100001, and 1.5 landed on those bands. Derived ratios are reduced to 14 significant digits before the strict compare, which is the `8560efa6` correction.

Grounding checks I re-ran against the library, separate from the suite:

- A reading 30 minutes plus 1 ms old produces `rem UNKNOWN`, `target null`, `source UNKNOWN`, action `UNKNOWN`, reason `stale reading (older than 30 minutes)`. Exactly 30 minutes still yields a numeric target.
- `SESSION_ONLY` plus planted `measured`, `target`, and `sessionTokensUsed` fields stays fully UNKNOWN. Those fields are not read as quota.
- A missing reset and a `+00:00` offset reset keep action `UNKNOWN` and `target null`. Lowercase `z` is rejected as an observation time. The UTC parser requires a trailing `Z` and a `toISOString` round-trip, so impossible dates such as `2026-02-30` fail closed (suite).
- Weekly id binds when present. A five-hour sample is not subtracted from a weekly window (`measured null` on that probe). Identical same-timestamp history rows with different remainings stay `UNKNOWN` (`quota correction/conflicting history`).
- A canonical hour of five-hour evidence, 50 to 40 over four hours to reset, is `HOLD` with measured 10, target 10, ratio 1, surge false.

Zero remaining becomes `EXHAUSTED` / `DENY` rather than a numeric ratio. A verified 0% shorter window overrides a weekly SURGE to `EXHAUSTED` / `DENY`. Over-budget `expectedCostPct` overrides SURGE to `THROTTLE-2` / `DENY`.

## Residual notes

These do not fail the gates above.

1. Text output keeps `[SURGE]` when a later guard changes the action. On a weekly window with five hours left (inside the last 10% of 168h) and `expectedCostPct` above remaining, the object is `action THROTTLE-2`, `dispatch DENY`, `surge true`, and the line ends in `-> THROTTLE-2 ... [SURGE]`. A verified five-hour 0% beside that weekly window prints `-> EXHAUSTED ... [SURGE]` with `dispatch DENY`. `format` appends `[SURGE]` from the flag (`pace.js` line 268) after exhaustion and cost handling have replaced the action. The action token and `dispatch` are the stop signals. A consumer that keys only off the substring `SURGE` will misread the line.

2. Same-instant conflict detection compares raw `observedAt` strings (`pace.js` lines 144-145). Two history rows at one instant, spelled `2026-09-30T11:00:00.000Z` and `2026-09-30T11:00Z`, with remainings 80 then 40, produced `measured 0`, ratio 0, action `ACCELERATE-2` on a non-surge five-hour window. The identical-string pair of those remainings correctly returned `UNKNOWN`. The higher-then-lower spelling was the miss; the lower-then-higher spelling was caught as an increase. Samples this program writes use `toISOString()`, so its own polls do not create the pair. The hole is an imported history that is already inconsistent and uses two accepted UTC spellings.

3. A stale sibling window is omitted from the report. A fresh weekly SURGE reading beside a five-hour window at 0% with `lastChecked` older than 30 minutes produced a clean `ACCELERATE-2` line and an empty reason list. The stale percentage is not copied into the numbers. The line also does not say that a listed window was rejected.

4. `verified: "false"` (a string) is treated as usable evidence because the check is `verified !== false`. The published contract names boolean `false`. Boolean `false` is rejected by the suite.

## Verdict

HEAD is `12d7b0d4ae47d657aeecf4b3ed4eb0ab157bd11f`. The pace suite exited 0 with 117 passed and 0 failed. All nine mutants exited 1; the in-memory mutant harness killed all nine required checks. The merge-base diff stays inside `lane.json` allowedPaths.

VERDICT: CLEAN PASS
