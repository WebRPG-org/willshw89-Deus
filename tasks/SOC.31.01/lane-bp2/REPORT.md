# SOC.31.01 lane-bp2 clean evidence-path repair report

**Date:** 2026-09-27

**Branch:** `task/lane-bp2`

**Reviewed code tip:** `0a09758c3e6944e6b56d3e1f059178b828da51f0`

**Worktree start:** `0243bf3826485b59e6dbe69514791069c03eab60` (the reviewed code tip plus only the coordinator launch prompt at `tasks/SOC.31.01/lane-bp2/launches/20260927_205317_prompt.txt`)

**Corrected source:** `3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b`

## What changed

- `tasks/SOC.31.01/lane-bp2/AUTHORITY_GAPS.md`: faithfully ported the authority-gap evidence from corrected source path `tasks/SOC.31.01/lane-bp/AUTHORITY_GAPS.md`.
- `tools/society/test_treasury.js`: changed only the task evidence folder token from `lane-bp` to `lane-bp2`.
- `docs/systems/DEUS_Treasury.md`: changed only the two task evidence folder tokens from `lane-bp` to `lane-bp2`.
- `tasks/SOC.31.01/lane-bp2/REPORT.md`: replaced the stale pre-fix failure report with this lane-local evidence.

No treasury behavior, schema, assertion, threshold, or policy was changed. `tasks/SOC.31.01/lane-bp2/BRIEF.md` and `tasks/SOC.31.01/lane-bp2/lane.json` were not edited. No art or audio path was read or changed.

## How I tested it

- Ran `node tools/society/test_treasury.js` in the foreground from the repository root; exit `0`.
- Ran `node tools/check_deus_syntax.js` in the foreground from the repository root; exit `0`.
- Compared the schema and runtime module to corrected source commit `3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b` with both blob IDs and `git diff --exit-code`.
- Compared the new `lane-bp2/AUTHORITY_GAPS.md` blob to the corrected source `lane-bp/AUTHORITY_GAPS.md` blob.
- Inspected the exact test/documentation diff against the corrected source with `git diff --unified=0`.
- Searched the test and documentation for stale `lane-bp` task references with `rg --pcre2`.
- Checked `BRIEF.md` and `lane.json` against `HEAD` with `git diff --exit-code`.
- Inspected the final working-tree and staged path lists before commit.

## Evidence

- Screenshot: none produced. This repair changes a headless test evidence path and documentation links; no visual output was involved.
- Log excerpt (copied from the real foreground output, trimmed):

```text
=== ISOLATION AND AUTHORITY GAPS ===
PASS isolation.no_wall_clock - source scan
PASS isolation.no_random - source scan
PASS isolation.no_filesystem - source scan
PASS isolation.no_engine_global - source scan
PASS isolation.no_mint_dependency - source scan
PASS isolation.no_physical_store_state - no store state in module
PASS authority.gaps_recorded - Currency, denomination, Tax, tariff, Office authority, Credit limits, Interest, maturity, Physical coin custody
PASS documentation.contract_present - INV-SOC-06, assets + expenses, caller-supplied, principal, physical

RESULT: 131 passed, 0 failed
TREASURY_EXIT=0
Checked 60 DEUS plugin files. Errors: 0
SYNTAX_EXIT=0
```

### Corrected-source blob proof

The expected IDs came from `git rev-parse 3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b:<path>`. The worktree IDs came from `git hash-object -- <path>`.

| Path | Corrected-source blob | Worktree blob | Match |
|---|---|---|---|
| `game/data/society/treasury.schema.json` | `e4bf3deb067fba2426c47880b28c257bd4584517` | `e4bf3deb067fba2426c47880b28c257bd4584517` | yes |
| `game/js/sim/society/DEUS_Treasury.js` | `d4377baf19ce3aab6831645195db4ba5e988b42b` | `d4377baf19ce3aab6831645195db4ba5e988b42b` | yes |
| source `tasks/SOC.31.01/lane-bp/AUTHORITY_GAPS.md` / worktree `tasks/SOC.31.01/lane-bp2/AUTHORITY_GAPS.md` | `15be6b84b81c06fe923e416d204b9094349538af` | `15be6b84b81c06fe923e416d204b9094349538af` | yes |

The runtime/schema tree comparison returned:

```text
RUNTIME_SCHEMA_DIFF_EXIT=0
```

### Test/documentation token-only diff

Exact `git diff --unified=0 3eddf8f6a1ed8503dfe9c99c87b7fc26c8e8d18b -- tools/society/test_treasury.js docs/systems/DEUS_Treasury.md` substantive lines:

```diff
--- a/docs/systems/DEUS_Treasury.md
+++ b/docs/systems/DEUS_Treasury.md
@@ -75 +75 @@
-... `tasks/SOC.31.01/lane-bp/AUTHORITY_GAPS.md`.
+... `tasks/SOC.31.01/lane-bp2/AUTHORITY_GAPS.md`.
@@ -124 +124 @@
-Exact gate output and any observed problems are recorded in `tasks/SOC.31.01/lane-bp/REPORT.md` after the foreground runs.
+Exact gate output and any observed problems are recorded in `tasks/SOC.31.01/lane-bp2/REPORT.md` after the foreground runs.
--- a/tools/society/test_treasury.js
+++ b/tools/society/test_treasury.js
@@ -13 +13 @@
-const GAPS_PATH = path.join(ROOT, "tasks", "SOC.31.01", "lane-bp", "AUTHORITY_GAPS.md");
+const GAPS_PATH = path.join(ROOT, "tasks", "SOC.31.01", "lane-bp2", "AUTHORITY_GAPS.md");
```

The omitted text on documentation line 75 is identical on both sides; the full command showed only the three `lane-bp` to `lane-bp2` substitutions above. The stale-reference search returned no matches:

```text
STALE_REFERENCE_RG_EXIT=1
```

The protected-file comparison returned:

```text
PROTECTED_DIFF_EXIT=0
```

### Allowed-path inspection

After removing the temporary `docs/STATUS.md` claim, the final working-tree changes were limited to:

```text
 M docs/systems/DEUS_Treasury.md
 M tasks/SOC.31.01/lane-bp2/REPORT.md
 M tools/society/test_treasury.js
?? tasks/SOC.31.01/lane-bp2/AUTHORITY_GAPS.md
```

Only those four explicit paths were staged. The unchanged treasury schema and runtime module were not staged.

## Not done / known problems

- RMMZ Playtest (F5), F8 console inspection, and screenshot evidence were not run because this task changes only a headless test evidence path and documentation/task evidence; the treasury module remains unregistered with the RMMZ runtime.
- The branch contains the coordinator-owned launch-prompt commit `0243bf3826485b59e6dbe69514791069c03eab60` after reviewed code tip `0a09758c3e6944e6b56d3e1f059178b828da51f0`; this task did not alter or remove that coordinator metadata.

## Try it in RMMZ

1. No RMMZ test step applies to this isolated, unregistered CommonJS module.

Expected: no runtime-visible change. The repair is exercised by `node tools/society/test_treasury.js`, which now reaches all assertions and reports `131 passed, 0 failed`.

## Decisions needed

- None for this task-local provenance portability repair.
