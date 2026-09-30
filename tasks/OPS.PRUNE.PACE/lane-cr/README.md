# OPS.PRUNE.PACE operator contract

Date: 2026-09-30. Writer: codex. Independent reviewer: claude (pending).

`tools/ops/pace.js` is a one-shot local report. The existing coordinator can call it after refreshing account telemetry, every 15 minutes under PACE-1. It does not launch workers, execute providers, refresh telemetry, choose model tiers, or schedule itself. Recommendations do not grant authority to open lanes or bypass review.

## Run

From the repository root:

```powershell
node tools/ops/pace.js
node tools/ops/pace.js --read-only
node tools/ops/pace.js --input path/to/account-snapshot.json --history tasks/OPS.PRUNE.PACE/lane-cr/.local/history.json --json
```

The default input is `docs/agents/PROVIDER_USAGE_STATUS.json`. The default history is `tasks/OPS.PRUNE.PACE/lane-cr/.local/history.json`; this lane's `.gitignore` excludes `.local/`. Do not commit account telemetry. Paths supplied explicitly are resolved from the caller's working directory; defaults are resolved from the script location. An explicit history outside `.local/` must be kept untracked by its operator.

`--input -` reads JSON from standard input (including normalized JSON captured from a CLI). Raw terminal prose is not accepted. `--read-only` reads existing history without creating or changing it. `--json` exposes targets, ratios, reasons, measurement timestamps, binding window, surge and dispatch guard separately. `--now <UTC>` is for deterministic replay/testing; omit it for live decisions. `--expected-cost-pct <0..100>` supplies a task cost in **binding-window percentage points**. A cost above remaining quota denies dispatch even during SURGE. `WITHIN_BINDING_QUOTA` only reports that comparison; it does not prove that other limits or prerequisites permit dispatch. Omitted cost leaves the guard UNKNOWN.

The program prints one PACE line for each of gemini, claude, grok, codex and minimax, plus any extra provider in the input. Missing providers produce UNKNOWN lines. A valid report, including UNKNOWN values, exits 0. Malformed JSON, malformed history, file errors and invalid CLI arguments exit 1, print `PACE ERROR` to stderr, and print no PACE recommendations. Do not treat exit 0 as permission to dispatch; inspect the action and guard.

## Account evidence contract

Use the existing telemetry shape (`remainingWeeklyPct`, `weeklyReset`, `remainingFiveHourPct`, `fiveHourReset`) or an explicit `windows` list:

```json
{
  "providers": {
    "claude": {
      "precision": "EXACT_PROVIDER",
      "scope": "account",
      "accountId": "TEST_account",
      "source": "TEST_account_usage capture",
      "lastChecked": "2026-09-30T12:00:00Z",
      "windows": [
        {
          "id": "weekly",
          "durationHours": 168,
          "remainingPct": 50,
          "resetAt": "2026-10-02T14:00:00Z"
        },
        {
          "id": "five-hour",
          "durationHours": 5,
          "remainingPct": 75,
          "resetAt": "2026-09-30T16:00:00Z"
        }
      ]
    }
  }
}
```

This is synthetic input, not a claim about a live account. Do not copy it into live telemetry. Keep the actual observation time and source when normalizing tool output; never relabel estimates as `EXACT_PROVIDER`.

- `precision: EXACT_PROVIDER`, a non-placeholder `source` and a per-provider/per-window `lastChecked` are required for numerical evidence. `SESSION_ONLY`, `PROVIDER_STATE_ONLY`, state labels, token totals, credits, hand-entered targets and estimates do not establish account percentages. An explicit non-account `scope` or `verified: false` rejects the reading. Existing exact telemetry omits `scope`, which is accepted for compatibility.
- A window may override source, precision, scope, lastChecked and verified when readings were obtained separately. `accountId` identifies the account; keep it stable and distinct when switching accounts. If omitted, one default account per provider is assumed.
- Percentages must be finite JSON numbers from 0 through 100. Dates must be valid absolute UTC ISO timestamps ending in `Z`; minute precision, seconds and up to three fractional digits are accepted. Missing, invalid, expired or future-observed data stays UNKNOWN. Readings older than 30 minutes are rejected; exactly 30 minutes is accepted. Top-level `generatedAt` never refreshes a reading.
- The weekly window (id `weekly`) binds when present, even if incomplete. Otherwise the shortest supplied positive `durationHours` binds. The explicit windows list must enumerate the account's applicable windows. `hasWeeklyWindow: true` with no weekly record fails closed; contradictory declarations and duplicate ids fail closed.
- Legacy weekly null placeholders are treated as UNKNOWN weekly evidence, not proof of no weekly quota. Set `hasWeeklyWindow: false` only when absence is established. Legacy weekly/five-hour field names establish their durations as 168/5 hours. Unknown window duration prevents an actionable report; a reset later than one full window after its observation is inconsistent.

The program validates the evidence **contract**; it cannot authenticate a provider response or detect a caller fabricating an exact reading/source string. The telemetry collector and local history are trusted inputs. It never calls a provider to verify them independently. A collector must supply account-level quota evidence to produce numeric recommendations. The checked-in snapshot inspected in this lane has only provider-state/session precision and cannot do so.

## Rate, history and actions

`target = remainingPct / hoursToReset`, using the evaluation clock. `measured` is the percentage-point decrease over the 60 minutes ending at the latest verified observation, which can be up to 30 minutes old. `ratio = measured / target`. The report cites current evidence and both measurement endpoints; JSON includes the exact interval. It never scales session tokens to account quota.

Rate bands: below 0.5 ACCELERATE-2; 0.5 through below 0.9 ACCELERATE-1; 0.9 through 1.1 HOLD; above 1.1 through 1.5 THROTTLE-1; above 1.5 THROTTLE-2. SURGE applies at or inside the last 10% of the verified window duration, with strictly more than 10% remaining, and requests ACCELERATE-2 regardless of ratio (including unavailable rate history). A verified exhausted window denies dispatch as EXHAUSTED, including a shorter window when weekly otherwise binds. A supplied over-budget cost overrides SURGE. The policy's LOW band (above 0 through 10% remaining) caps ACCELERATE/HOLD at THROTTLE-1 for bounded tasks. Throttling reduces volume, never required model quality.

History retains verified samples for two hours with a 4,096-sample safety bound, and has schema `version: 1`. Each sample includes provider/account/window identity, reset, duration, observed/captured timestamps, percentage and source. Writes replace the JSON atomically via a temporary file; invalid existing history is preserved and reported as an error. Run one poll at a time per history file; concurrent writers are not supported. Repeated snapshots are deduplicated without inventing usage.

Measurement needs an observation exactly at the 60-minute boundary, or equal quota readings bracketing that boundary no more than 30 minutes apart. The latter establishes zero observed change across the boundary. Otherwise measured/rate action stays UNKNOWN (except independently justified SURGE/exhaustion). No interpolation, partial-hour annualization, extrapolation, cross-account comparison or cross-reset subtraction is used. Poll jitter can therefore yield UNKNOWN even after an hour; collect more evidence rather than inventing an hourly rate. Quota increases, same-time conflicts and out-of-order observations invalidate the measurement. Reset rollover needs a new hour of evidence. No unused-quota-at-renewal audit is claimed: this bounded report retains only the rate history needed here.

## Checks

```powershell
node tools/check_deus_syntax.js
node --check tools/ops/pace.js
node --check tools/ops/test_pace.js
node tools/ops/test_pace.js
node tools/ops/test_pace.js --mutants
node tools/ops/test_pace.js --mutant wrong-band
node tools/ops/test_pace.js --mutant missing-reset
node tools/ops/test_pace.js --mutant stale-reading
node tools/ops/test_pace.js --mutant ungrounded-estimate
```

Normal suites and `--mutants` should exit 0. Each individual deliberate mutant should exit 1 through failed assertions. Mutants alter a VM-loaded copy of the actual implementation; they do not edit files and there is no production mutant flag. The aggregate mutation run checks that a named relevant assertion fails for each defect, not merely that an exception occurs. Other mutants cover weekly selection, target, measured use, SURGE and reset mixing. CLI tests use synchronous child processes with timeouts, keep scratch under this lane's `.local/`, and remove only their own scratch directory. No background process is launched.

## GAME TRANSLATION

- Class: C, foundational/indirect **operations tooling**. CONSUMED BY GAME SYSTEMS: none; the consumer is the existing coordinator's usage-aware dispatch/reporting workflow. No runtime integration is claimed.
- Player / World Effect: indirect assurance that authorized game implementation and review capacity is paced from evidence. It adds no game behavior.
- Trigger: operator/coordinator invokes `node tools/ops/pace.js` after obtaining account telemetry.
- Runtime Authority: `evaluate`, `measure`, `classify`, `format` in `tools/ops/pace.js` own this report; provider snapshots remain quota authority.
- Simulation Path: inapplicable; no simulation state is read or changed.
- Engine Bridge: inapplicable; no RMMZ plugin or bridge is required for operations advice.
- Visible Result: sourced PACE lines or JSON for the coordinator; no player-visible output.
- Persistence: local, untracked version-1 account history; no game saves touched.
- Failure Without This Lane: hand-computed estimates can overstate quota, conceal stale evidence or advise a wrong dispatch volume.
- Automated Proof: foreground Node gates and mutation/CLI checks above; observed results belong in `REPORT.md` with the tested writer SHA.
- In-Game Proof: not performed; inapplicable for this operations-only lane. No screenshot produced or gameplay completeness claimed.

Simulation implemented: NO (inapplicable). Engine bridge implemented: NO (inapplicable). Presentation implemented: NO (game presentation inapplicable; CLI report exists). Input/player interaction implemented: NO (inapplicable). Save/load implemented: NO (game saves inapplicable; local history tested separately). Playable verification performed: NO (inapplicable).
