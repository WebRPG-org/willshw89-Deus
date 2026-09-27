# BRIEF_FIX1 — Lane BB (DEUS-TSK-GEOLOGY-GATE) after failed pre-review gates

You are the Grok writer on `task/lane-bb` in worktree `C:\Users\snewt\.deus_worktrees\lane-bb`. Tip under review: `217753520073caf5ace303874652944986c4de81` (already pushed).

## Why you are back
Owner rule 2026-09-27 11:26 CT: gate tests run before any Gemini review. PM pre-review on your tip in a fresh clone (`C:\Users\snewt\.deus_worktrees\logs\pm_ops\prereview_bb_20260927_115745`) was **RED**:

1. `node tools/test_geology_strata.js` — EXIT=0 (11.4s) GREEN
2. `node tools/test_strata_foundation.js` — EXIT=1 (116s) **RED** — RESULT: 22 passed, 4 failed: `fills_0_to_5`, `floor_on_substrate`, `surface_elevation_matches`, `sphere_aoe`
3. `node tools/check_deus_syntax.js` — EXIT=0 GREEN

Failure pattern (from gate2.out): elevation values are ~70 units too high vs expected (e.g. elev 85/89 want 15/19; surface columns report 85/0). Shape/material often match; elevation and some sphere-AoE HP expectations do not.

## Scope (unchanged)
allowedPaths only:
- `tools/test_geology_strata.js`
- `tasks/DEUS-TSK-GEOLOGY-GATE/**`

Do **not** weaken or rewrite `tools/test_strata_foundation.js` assertions. Do **not** edit DEUS_World.js / DEUS_Levels.js / plugins to "make the test pass" unless the brief already allowed it (it does not). The lane is to repair the **geology gate harness** (`tools/test_geology_strata.js`) so it loads the real World plugins like `test_strata_foundation.js` does; if your harness change somehow broke strata foundation when both run in the same tip's clone, fix the harness so foundation still passes unchanged. If the four foundation failures are pre-existing on origin/main without your diff, prove that with a side-by-side run on merge-base vs tip and document it in REPORT.md — then stop without weakening gates; escalate in REPORT under open questions.

## Required
1. Reproduce: in a fresh clone at your tip, run all three gateTests; paste EXIT lines.
2. Diff your tip vs merge-base for `tools/test_geology_strata.js`; explain what changed.
3. Fix only within allowedPaths so all three gateTests exit 0 in a fresh clone.
4. Update REPORT.md with the failure, the fix, and raw EXIT evidence.
5. Commit `[grok] DEUS-TSK-GEOLOGY-GATE Fix1: …` and `git push origin task/lane-bb`.
6. NO ART. Do not touch STATUS, WBS, OWNER_DECISIONS, plugins.js, DEUS_Core.js.

Foreground only. Effort: xhigh (tricky harness / world plugin load).