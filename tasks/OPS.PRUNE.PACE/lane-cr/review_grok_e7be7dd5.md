# Grok review: OPS.PRUNE.PACE lane-cr tip e7be7dd5

Target Commit SHA: e7be7dd535503c95681fa65ce47c44ec1064f295

Reviewer Family: xai (Grok)

Independent closure review of task/lane-cr (OPS.PRUNE.PACE) at the FIX-CR tip. The writer commit is Codex. This review did not modify `tools/ops/pace.js`, `tools/ops/test_pace.js`, lane manifests, or any other source file. Commands ran in `C:\Users\snewt\.deus_worktrees\lane-cr` on branch `task/lane-cr` with Node v24.19.0.

```text
$ git rev-parse HEAD
e7be7dd535503c95681fa65ce47c44ec1064f295

$ git log -1 --format="%H %an %s"
e7be7dd535503c95681fa65ce47c44ec1064f295 deus-codex [codex] OPS.PRUNE.PACE FIX-CR: timestamp normalization, provenance validation, and pacing band decoupling

$ git merge-base HEAD origin/main
6d70b0ff0f8e9c42df5accbf56763c84eec8af54
```

`git diff --check e7be7dd535503c95681fa65ce47c44ec1064f295^..e7be7dd535503c95681fa65ce47c44ec1064f295` exited 0. Tip blobs match the writer handoff: `pace.js` `4f691674f82a9349e98498f33f340adc99f262b9`, `test_pace.js` `63ee377f218789f49523f9f3773e31dc8971a343`.

The FIX-CR commit changes only:

- `tools/ops/pace.js`
- `tools/ops/test_pace.js`
- `tasks/OPS.PRUNE.PACE/lane-cr/README.md`
- `tasks/OPS.PRUNE.PACE/lane-cr/REPORT.md`
- `tasks/OPS.PRUNE.PACE/lane-cr/state.md`
- `tasks/OPS.PRUNE.PACE/lane-cr/evidence/fix-cr-mutants.log`
- `tasks/OPS.PRUNE.PACE/lane-cr/evidence/fix-cr-pace.log`
- `tasks/OPS.PRUNE.PACE/lane-cr/evidence/fix-cr-syntax.log`

`lane.json` allows those paths. From merge-base `6d70b0ff0f8e9c42df5accbf56763c84eec8af54` the branch adds 21 paths, all inside `allowedPaths`. Untracked launch prompts under `tasks/OPS.PRUNE.PACE/lane-cr/launches/` were already present and were not part of the reviewed commit.

## FIX-CR

Authority checked: the five corrections in `tasks/OPS.PRUNE.PACE/lane-cr/launches/20260930_FIX_CR_prompt.txt` (ANSWER-CR / MSG-PRUNE-PM-045). Each one is present in the tip and is killed by a mutant that restores the old behavior.

### 1. Timestamp normalization

`utc` accepts absolute ISO timestamps with `Z` or an explicit `+HH:MM`/`-HH:MM` offset, including minute precision and 1–3 fractional digits. It rejects timezone-free strings, impossible dates, and out-of-range offsets. `validateHistory` canonicalizes `observedAt`, `capturedAt`, and `resetAt` to millisecond UTC before measurement, same-window identity, conflict checks, and deduplication, and the canonical value is what `evaluate` keeps.

Conflicting remainings at one instant stay `measured: null`, `action: UNKNOWN`, including `2026-09-30T11:00:00Z`, `2026-09-30T11:00Z`, `2026-09-30T06:00:00-05:00`, and `2026-09-30T13:00:00+02:00`. A same-instant conflict hidden behind a repeated boundary sample is included by walking that timestamp group backward. Equivalent spellings of one reading dedupe. Both conflicting values survive a second poll.

Independent probes also passed: a current `-05:00` observation conflicting with a `Z` history row; a duplicate tail spelled three different ways (`11:00Z`, `-05:00`, canonical `Z`); fractional offset `2026-09-30T06:00:00.5-05:00` equal to `2026-09-30T11:00:00.500Z`.

Mutant `raw-history-times` drops the canonical history and the required check fails with `0 !== null` (a false measured zero). Mutant `hidden-boundary-conflict` stops expanding the same-time group and fails `boundary_conflict_not_hidden_by_duplicate_tail`.

### 2. Provenance validation

`verifiedEvidence` accepts only a missing `verified` or boolean `true`. Strings `"false"` and `"true"`, numbers, `null`, objects, and arrays are untrusted. Boolean `false` is untrusted. `sourceLabel` rejects `UNKNOWN`, `N/A`, and `--` after whitespace removal, in any case, for both the current reading and history. Current placeholder or non-boolean input stays UNKNOWN and records no sample. The same values in history throw `invalid history sample` so the CLI prints `PACE ERROR`, prints no advice, and leaves the file in place. That is the documented fail-closed history contract, and it does not produce a numeric rate.

Mutant `truthy-verified` restores `verified !== false`. `non_boolean_verified_"false"_rejected` then fails with `10 !== null`. Mutant `placeholder-history-source` accepts any non-empty label; `history_source_"n/a"_rejected` fails with `Missing expected exception`.

### 3. Pacing band decoupling

`report.action` is assigned only from `classify(ratio)`. Bands are ratio `< 0.5` ACCELERATE-2, `< 0.9` ACCELERATE-1, `<= 1.1` HOLD, `<= 1.5` THROTTLE-1, otherwise THROTTLE-2. LOW quota, exhaustion, expected cost, and SURGE do not replace that token.

The requested case, 8% remaining over four hours with measured use 0, is target 2, ratio 0, action ACCELERATE-2, dispatch BOUNDED_TASKS, surge false. A direct probe formatted `-> ACCELERATE-2` with `dispatch: BOUNDED_TASKS` and no `[SURGE]`. SURGE is cleared when dispatch is DENY or BOUNDED_TASKS, or any sibling was rejected. A known exhausted sibling and THROTTLE-2 still set DENY. THROTTLE-2 denial remains DENY when another sibling is stale.

Mutants `low-overrides-band`, `surge-overrides-band`, `denied-surge`, and `ignored-bounded-dispatch` each fail their named check.

### 4. Sibling windows as UNKNOWN

Every listed window is returned with `KNOWN` or `UNKNOWN` and a reason. Text names `window <id>`, `scope: binding-window`, and `dispatch`, and appends rejected siblings as `<id> UNKNOWN (<reason>)`. A stale or incomplete sibling adds `provider-wide advice UNKNOWN: rejected sibling windows`, forces dispatch UNKNOWN unless a known DENY already applies, and suppresses SURGE. The binding-window ratio band stays visible and scoped; it is not an unqualified provider-wide acceleration.

Probe line for a fresh weekly ratio of 0 beside a five-hour reading older than 30 minutes:

```text
PACE claude window weekly rem 50% reset 2026-09-30T17:00:00.000Z used/h 0 target/h 10 -> ACCELERATE-2 [source: TEST_history; PROBE#claude/weekly via TEST_account_usage @ 2026-09-30T12:00:00.000Z] [scope: binding-window] [dispatch: UNKNOWN] [windows: five-hour UNKNOWN (stale reading (older than 30 minutes))] [reason: provider-wide advice UNKNOWN: rejected sibling windows]
```

A fresh five-hour reading at 0% still denies dispatch and keeps action ACCELERATE-2. Mutant `hidden-sibling` marks rejected windows KNOWN. Mutant `ignore-sibling-restriction` leaves dispatch at `WITHIN_BINDING_QUOTA`. Both fail `rejected_sibling_stale_exposed`.

### 5. CLI rejection tests

`cli_unknown_option_fails` and `cli_invalid_expected_cost_fails` rewrite valid input and history, require a valid invocation to exit 0, then require the specific stderr and empty stdout. Unknown option expects `PACE ERROR: unknown option or missing value: --mutant`. Cost rejection covers `NaN`, `''`, `0x10`, `1e1`, `-1`, and `101`, all expecting `PACE ERROR: invalid expected cost percent`. The empty-string, hex, and exponent spellings are the ones that would become legal numbers if only the lexical check were removed. CLI mutants run a scratch copy of the changed implementation under the lane `.local/` directory and do not rewrite `tools/ops/pace.js`.

Mutant `cli-accept-unknown-option` exits 0 where rejection is required (`0 !== 1`). Mutant `cli-accept-invalid-cost` is killed by the empty string: `cost "" must fail` / `0 !== 1`. After those runs, `git status` showed no change to either script.

## Gate test results

| Command | Exit | Observed output |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node --check tools/ops/pace.js` | 0 | no output |
| `node --check tools/ops/test_pace.js` | 0 | no output |
| `node tools/ops/test_pace.js` | 0 | 170 lines starting `PASS`, including both CLI rejection checks; `RESULT: 170 passed, 0 failed` |
| `node tools/ops/test_pace.js --mutants` | 0 | baseline `RESULT: 170 passed, 0 failed`; `MUTANTS: 21 killed, 0 survived` |

`node tools/governance/merge_gate.js --lane lane-cr --manifest tasks/OPS.PRUNE.PACE/lane-cr/lane.json --dry-run` exited 1. It fetched origin and checked local tip `e7be7dd535503c95681fa65ce47c44ec1064f295`. Manifest provenance, scope, refs, and pushed all passed. Fresh clones ran both manifest gates: `node tools/check_deus_syntax.js` exit 0 (6.83 s) and `node tools/ops/test_pace.js` exit 0 (1.23 s). The gate still printed `GATE: REFUSED (exit 1)` for two checks outside this implementation:

- `REVIEW_NOT_LAST`: review commit `a53111acbeadc85c051497c2d3f4afb0a40a982e` is followed by `e7be7dd5`. This dry-run was taken before the present review commit.
- `MAIN_DIRTY`: the main worktree `C:/Users/snewt/OneDrive/Desktop/UF` has uncommitted tracked mailbox and telemetry files. That checkout is not this lane.

`lane.json` names reviewer `claude`. This artifact is the assigned xAI review of the Codex tip. It does not edit the manifest.

## Mutant kill evidence

Command: `node tools/ops/test_pace.js --mutants`

Exit: 0

Result: `MUTANTS: 21 killed, 0 survived`

| Mutant | Required check | Result |
|---|---|---|
| wrong-band | `band_0` | KILLED (148 passed, 13 failed) |
| missing-reset | `missing_reset_unknown` | KILLED (152 passed, 9 failed) |
| stale-reading | `stale_reading_rejected` | KILLED (158 passed, 3 failed) |
| ungrounded-estimate | `ungrounded_precision_SESSION_ONLY` | KILLED (154 passed, 7 failed) |
| wrong-window | `weekly_precedes_shortest` | KILLED (151 passed, 10 failed) |
| wrong-target | `measured_target_ratio` | KILLED (133 passed, 28 failed) |
| wrong-measured | `measured_target_ratio` | KILLED (134 passed, 27 failed) |
| no-surge | `surge_exact_10_percent_time` | KILLED (160 passed, 1 failed) |
| mix-reset | `reset_cycle_not_mixed` | KILLED (159 passed, 2 failed) |
| raw-history-times | `same_instant_conflict_2026-09-30T11:00:00Z` | KILLED (154 passed, 7 failed) |
| hidden-boundary-conflict | `boundary_conflict_not_hidden_by_duplicate_tail` | KILLED (160 passed, 1 failed) |
| truthy-verified | `non_boolean_verified_"false"_rejected` | KILLED (152 passed, 9 failed) |
| placeholder-history-source | `history_source_"n/a"_rejected` | KILLED (152 passed, 9 failed) |
| low-overrides-band | `low_quota_bounded` | KILLED (155 passed, 6 failed) |
| surge-overrides-band | `surge_cannot_override_high_ratio` | KILLED (157 passed, 4 failed) |
| denied-surge | `expected_cost_exceeds_remaining_blocks_surge` | KILLED (152 passed, 9 failed) |
| ignored-bounded-dispatch | `bounded_dispatch_suppresses_surge` | KILLED (160 passed, 1 failed) |
| hidden-sibling | `rejected_sibling_stale_exposed` | KILLED (155 passed, 6 failed) |
| ignore-sibling-restriction | `rejected_sibling_stale_exposed` | KILLED (156 passed, 5 failed) |
| cli-accept-unknown-option | `cli_unknown_option_fails` | KILLED (169 passed, 1 failed) |
| cli-accept-invalid-cost | `cli_invalid_expected_cost_fails` | KILLED (169 passed, 1 failed) |

No mutant survived. Each named check failed because the restored defect produced the old numeric advice, the old dispatch token, a missing rejection, or a successful CLI exit.

VERDICT: CLEAN PASS
