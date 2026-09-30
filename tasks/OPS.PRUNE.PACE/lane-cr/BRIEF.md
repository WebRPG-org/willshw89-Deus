# Lane Brief: lane-cr (OPS.PRUNE.PACE)

## Objective
Author `tools/ops/pace.js` and its verification suite `tools/ops/test_pace.js` per Owner Directives and PACE-1..14 (MSG-PRUNE-PM-015..024):
1. **Inputs:**
   - Reads account usage state from live tool output (e.g. `docs/agents/PROVIDER_USAGE_STATUS.json` or CLI outputs).
   - Maintains local usage history to measure usage rate (`% used / hour` in binding window).
2. **Calculations:**
   - Binding window: shortest window or weekly window.
   - `target = remaining% / hours_to_reset`.
   - `measured = % used in last 60 minutes`.
   - `ratio = measured / target`.
   - Actions (PACE-6 graded scale):
     - `ratio < 0.5`: `ACCELERATE-2` (double workers or give largest packet)
     - `0.5 <= ratio < 0.9`: `ACCELERATE-1` (one more worker)
     - `0.9 <= ratio <= 1.1`: `HOLD`
     - `1.1 < ratio <= 1.5`: `THROTTLE-1` (bounded tasks only)
     - `ratio > 1.5`: `THROTTLE-2` (stop new dispatches)
     - `SURGE`: In last 10% of window with > 10% left -> `ACCELERATE-2`
   - Strict Grounding (PACE-11, PACE-14): If remaining % or reset is UNKNOWN, target is UNKNOWN. Every line must cite verified source or UNKNOWN.
3. **Outputs:**
   - Prints formatted PACE lines: `PACE <provider> rem <n>% reset <UTC> used/h <m> target/h <t> -> <action> [source: <source>]`.
4. **Automated Tests (`tools/ops/test_pace.js`):**
   - Must fail for: wrong band classification, missing reset time handling, stale reading older than 30 minutes, or ungrounded estimate.
   - Includes deliberate mutant support.

## Governance
- Writer: `codex`
- Reviewer: `claude`
- Branch: `task/lane-cr`
- Allowed Paths: `tools/ops/pace.js`, `tools/ops/test_pace.js`, `tasks/OPS.PRUNE.PACE/lane-cr/**`
