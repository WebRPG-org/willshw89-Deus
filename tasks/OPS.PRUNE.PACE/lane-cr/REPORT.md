# OPS.PRUNE.PACE lane-cr implementation handoff

Date: 2026-09-30. Evidence recorded by 2026-09-30T18:11:50Z.
Writer: codex (OpenAI family); actual underlying model identifier/effort not exposed by this session. No subagents used. Reviewer: claude, pending independent review.
Branch: `task/lane-cr`. Tested implementation SHA: `8560efa6f64306420bfcfd4dc7c66f072bc5af3f`. Subsequent handoff commit contains documentation/evidence only.
Status: implementation and writer checks ready for independent review; no approval, WBS closure, integration or gameplay completion claimed.

## What changed

- `tools/ops/pace.js`: one-shot report with weekly/shortest binding selection, verified account evidence checks, local bounded history, actual 60-minute consumption, graded rate actions, SURGE, exhaustion and cost/LOW guards. Emits sourced text or JSON; unsupported data stays UNKNOWN.
- `tools/ops/test_pace.js`: 117 assertions including CLI persistence/error handling, decimal thresholds and nine in-memory implementation mutants. Child CLI tests execute synchronously with timeouts.
- `tasks/OPS.PRUNE.PACE/lane-cr/README.md`: input/CLI contract, provenance boundary, history limitations, operator commands and game-translation explanation.
- Lane-local `.gitignore`, `state.md`, this report and `evidence/*.log`: untracked history location, scoped claim/checkpoint and reproducible writer evidence. No shared docs or manifest changed.

An additional decimal regression exposed wrong neighboring bands at ratios 0.9 and 1.1 (`115 passed, 2 failed`, EXIT=1). The first correction rounds derived ratios to 14 significant digits before strict band classification. The final 117-check suite passes with those regressions included.

## How I tested it

All commands ran in the foreground in `C:\Users\snewt\.deus_worktrees\lane-cr`, with Node v24.19.0. No test or child process from this session remains running. These are writer-worktree results, not the coordinator's required fresh-clone integration checks.

| Command | Observed result | Evidence |
|---|---|---|
| `node tools/check_deus_syntax.js` | 62 DEUS plugins checked, 0 syntax errors, EXIT=0 | `evidence/syntax-gate.log` |
| `node --check tools/ops/pace.js` | EXIT=0 | Captured foreground tool output; no separate file |
| `node --check tools/ops/test_pace.js` | EXIT=0 | Captured foreground tool output; no separate file |
| `node tools/ops/test_pace.js` | 117 passed, 0 failed, EXIT=0 | `evidence/pace-gate.log` |
| `node tools/ops/test_pace.js --mutants` | Baseline 117/0; 9 mutants killed, 0 survived; EXIT=0 | `evidence/mutants.log` |
| `node tools/ops/test_pace.js --mutant wrong-band` | Required band assertion fails, EXIT=1 | `evidence/wrong-band.log` |
| `node tools/ops/test_pace.js --mutant missing-reset` | Required missing-reset assertion fails, EXIT=1 | `evidence/missing-reset.log` |
| `node tools/ops/test_pace.js --mutant stale-reading` | Required stale-reading assertion fails, EXIT=1 | `evidence/stale-reading.log` |
| `node tools/ops/test_pace.js --mutant ungrounded-estimate` | Required precision assertion fails, EXIT=1 | `evidence/ungrounded-estimate.log` |
| `node tools/ops/pace.js --read-only` | All five providers UNKNOWN with reasons, EXIT=0 | `evidence/checked-in-snapshot.log` |
| `git diff --check` | EXIT=0 | Captured foreground tool output |

Both `lane.json` gate commands were run. The syntax gate checks game plugins, so separate syntax checks covered the two new scripts as well. The CLI snapshot check read the existing file; no live provider was queried and no quota refresh is claimed.

## Evidence

No screenshots produced; this is operations tooling with no visual acceptance criterion. Log excerpts copied from actual final runs:

```text
Checked 62 DEUS plugin files. Errors: 0
EXIT=0
RESULT: 117 passed, 0 failed
EXIT=0
MUTANTS: 9 killed, 0 survived
EXIT=0
```

Deliberate failure excerpts (these are mutant runs, not baseline failures):

```text
FAIL missing_reset_unknown: Expected values to be strictly equal:
10 !== null
KILLED missing-reset: required failing check missing_reset_unknown
KILLED stale-reading: required failing check stale_reading_rejected
KILLED ungrounded-estimate: required failing check ungrounded_precision_SESSION_ONLY
```

The snapshot check emitted, among its five lines:

```text
PACE claude rem UNKNOWN reset UNKNOWN used/h UNKNOWN target/h UNKNOWN -> UNKNOWN [source: UNKNOWN] [reason: account evidence UNKNOWN]
```

## Not done / known problems

- Claude's independent review and coordinator fresh-clone/gate integration remain pending. Nothing was pushed or merged.
- Existing checked-in telemetry has provider-state/session precision, not adequate exact account readings; it cannot support numeric recommendations. The tool validates provenance metadata but cannot authenticate a caller's provider evidence.
- History must establish the 60-minute boundary exactly or with equal bracketing readings. Poll jitter, warmup, reset rollover, missing samples and corrections can leave measured use UNKNOWN. The tool deliberately supplies no estimated substitute. SURGE/exhaustion can still be justified independently from complete current quota evidence.
- A single writer per history file is required; concurrent polling against the same file is not supported. The expected-cost guard covers the binding window only and is not a general dispatch authorization.
- Original MSG-PRUNE-PM-020..024 are not present in this checkout. The lane brief supplies the strict PACE-11/PACE-14 requirement; the available AG-PRUNE-011 correction and PACE-1..10 messages were inspected. No missing directives were invented.
- No automatic dispatcher hookup, end-of-renewal waste audit, RMMZ test, F8 check or game save/load check was performed. Runtime integration is outside this tooling lane. `docs/STATUS.md` remains untouched because it is outside allowedPaths; the lane-local state records the actual handoff.

## Try it in RMMZ

Inapplicable: no game behavior changes. To inspect the operations result, run `node tools/ops/pace.js --read-only` from this checkout. Expected with the current checked-in snapshot: five UNKNOWN lines, each with an explicit source status/reason. To exercise all numeric cases, run `node tools/ops/test_pace.js`; its synthetic cases do not represent live account quota.

## Decisions needed

- No additional Owner decision needed to author this bounded change. Next gate: independent Claude review of the code and evidence, followed by the authorized coordinator's normal integration process.

## GAME TRANSLATION

Class C: foundational/indirect operations tooling. **CONSUMED BY GAME SYSTEMS: none.** Named consumer: existing coordinator's usage-aware dispatch/reporting workflow; it can invoke this CLI after collecting exact account telemetry. This lane does not install that invocation.

| Required field | Result |
|---|---|
| Player / World Effect | Indirect assurance for staffing authorized game work; no player/world behavior added. |
| Trigger | Coordinator/operator invokes the CLI against a verified account snapshot. |
| Runtime Authority | `tools/ops/pace.js`: `evaluate`, `measure`, `classify`, `format`; source snapshots own quota truth. |
| Simulation Path | Inapplicable; no simulation state consumed or mutated. |
| Engine Bridge | Inapplicable; no engine bridge or runtime code changed. |
| Visible Result | Sourced PACE text/JSON in the operator terminal; no player-facing display. |
| Persistence | Version-1 local untracked history; repeated-poll/CLI persistence tests passed. No game saves. |
| Failure Without This Lane | Hand estimates can recommend wrong dispatch volume or disguise unknown/stale quota. |
| Automated Proof | Final writer SHA and exact foreground commands/results above; both manifest gates passed. |
| In-Game Proof | Not performed, inapplicable to operations tooling; no playability claim. |

Simulation implemented: NO (inapplicable). Engine bridge implemented: NO (inapplicable). Presentation implemented: NO (game presentation inapplicable; CLI output tested). Input/player interaction implemented: NO (inapplicable). Save/load implemented: NO (game saves inapplicable; local operations history tested). Playable verification performed: NO (inapplicable).
