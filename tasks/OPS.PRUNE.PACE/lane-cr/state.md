# OPS.PRUNE.PACE lane-cr state

- Date: 2026-09-30.
- Writer: codex; branch: `task/lane-cr`; reviewer: claude (not yet requested or performed).
- Claim: `tools/ops/pace.js`, `tools/ops/test_pace.js`, `tasks/OPS.PRUNE.PACE/lane-cr/**`.
- Status: implementation in progress. Initial worktree clean; no existing pace implementation.
- The explicit allowedPaths override the general STATUS/VISION edit instructions. Claim and task evidence stay here; shared governance documents remain untouched.
- Scope: one-shot, account-usage pacing report and local history, with foreground tests and deliberate mutants. No dispatcher, scheduler, provider calls, art, game changes, push, or merge.
- Source inspection: BRIEF.md, lane.json, PACE-1..10 in MSG-PRUNE-PM-015..018, PACE-11 correction in AG-PRUNE-011, utilization policy section 6. The original MSG-PRUNE-PM-020..024 are absent from this checkout; the brief supplies PACE-11/PACE-14 strict grounding requirements.
- Binding window: weekly when present; otherwise shortest reported window. Session totals and provider availability alone are not account quota evidence.
- Planned checks: both lane.json gates, direct syntax checks for the new scripts, CLI persistence/error cases, and deliberate wrong-band/missing-reset/stale/ungrounded mutants.
- No tests or gameplay verification claimed at this checkpoint.
