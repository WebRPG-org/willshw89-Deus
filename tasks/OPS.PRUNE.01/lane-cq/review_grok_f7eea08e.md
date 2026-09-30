# Independent closure review: OPS.PRUNE.01 / lane-cq (pass 10 / FIX-CQ-10)

## Metadata

| Field | Value |
|---|---|
| Writer | Gemini |
| Reviewer | Grok |
| Reviewer Family | xai (Grok) |
| Authority | Independent closure review of the three defects in `tasks/OPS.PRUNE.01/lane-cq/review_grok_3b2f0a26.md` |
| Prior verdict | `3b2f0a26fe6e7be4a95ed8f750b0d84358357772` failed in `tasks/OPS.PRUNE.01/lane-cq/review_grok_3b2f0a26.md` (commit `4f92e516c4b87463e6d84fa4f32696b732de4a12`) |
| Target Commit SHA | `f7eea08ee511211ec63de7c185f9d6b070ac33f4` |
| Branch | `task/lane-cq` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-cq` |
| Worktree HEAD at execution | `9c0d5dfb88ff1df5454884c9e2d9e120109bbfc2` |
| Merge-base with `origin/main` | `5fe51c14933edb31e391dd7d6049489a2ce0a631` |
| `origin/main` at execution | `c34c98f33071a54070f0e6f7323e82c947d569fb` |
| `origin/task/lane-cq` at execution | `f7eea08ee511211ec63de7c185f9d6b070ac33f4` |
| Node | v24.19.0 |
| Executed | 2026-09-30 16:26–16:30 CT, in this worktree |

`git cat-file -t f7eea08ee511211ec63de7c185f9d6b070ac33f4` is `commit`. The worktree blobs of the two files that commit changes are the same objects as that commit:

| Path | Blob |
|---|---|
| `docs/STATUS.md` | `fc165404d86c9bc84fe303ca713ebfbe479a06fa` |
| `tools/test_control_board.js` | `acbda590f5bd1c37e05dfd5d35ea4ea5e0c15d8a` |

HEAD is one commit above the reviewed sha. That commit, `9c0d5dfb88ff1df5454884c9e2d9e120109bbfc2`, adds only `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_162356_prompt.txt`. It does not change the control board or the validator. Untracked paths at execution, absent from both commits, were:

- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_135832_prompt.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_141239_prompt.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_142140_prompt.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_145210_prompt.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_150749_prompt.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_FIX_CQ_7_prompt.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_FIX_CQ_8_prompt.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_review_prompt_3b2f0a26.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_review_prompt_f7eea08e.txt`

The control-board and syntax gates do not read them. No tracked file was left modified by this review.

## Commit

```text
HASH:    f7eea08ee511211ec63de7c185f9d6b070ac33f4
SUBJECT: [gemini] OPS.PRUNE.01 FIX-CQ-10: upfront input data mutations, strict 13/13 kill verification
AUTHOR:  deus-ops <deus-ops@local.invalid>
DATE:    2026-09-30 16:23:18 -0500
PARENT:  4f92e516c4b87463e6d84fa4f32696b732de4a12
```

That commit's own diff is two paths:

```text
 docs/STATUS.md              |   4 +-
 tools/test_control_board.js | 102 ++++++++++++++++++++++++--------------------
 2 files changed, 57 insertions(+), 49 deletions(-)
```

`git diff --name-only origin/main...f7eea08ee511211ec63de7c185f9d6b070ac33f4` is twenty paths. Every one is inside `tasks/OPS.PRUNE.01/lane-cq/lane.json` `allowedPaths`. Zero edits to engine core (`rmmz_*.js`, `main.js`, `libs/**`). Zero edits under `art/` or catalogue trees.

The `docs/STATUS.md` hunk updates two section 3.A status cells. The `task/lane-cq` cell reads `Historical reviews at 4a5fc62a / 6f53ca64 / 4f92e516; in closure review (FIX-CQ-10)`. The `task/lane-cr` cell reads `Grok CLEAN PASS at f78c554b; MERGE-READY`. The baseline board-truth check accepts the CQ cell because it still matches `/historical/i`.

## Defect 1 — Four mutants edit the board text before parsing

RESOLVED. `missing_archive_ruling`, `blank_archive_dest`, `board_truth_missing_correction`, and `board_truth_standin_glob_changed` are applied to `rawStatusText` at `tools/test_control_board.js` lines 159–182, before comment stripping (line 185) and before section parsing (lines 188–193). Each of those four names appears again only in the `MUTANTS` array (lines 35–43). No later branch is guarded by them. The failure arrays are filled by the ordinary classifiers: the section 5 row loop (`malformedArchivedRows.push` at line 376) and the board-truth predicates (lines 505 and 512).

| Mutant | Edit of `rawStatusText` | Predicate that then fails | Observed failure |
|---|---|---|---|
| `missing_archive_ruling` | Inserts a section 5 data row whose ruling cell is `NOT APPROVED`, immediately after the header and separator | Line 375: ruling must be exactly `Owner 2026-09-30 prune ruling` | `Malformed rows: game/js/plugins/DEUS_Fake.js`. Exit 1. `TOTAL FAILURES: 1` |
| `blank_archive_dest` | Inserts `` `| `game/js/plugins/DEUS_FakeBlank.js` | | Owner 2026-09-30 prune ruling | `` | Line 375: `!arch` | `Malformed rows: game/js/plugins/DEUS_FakeBlank.js`. Exit 1. `TOTAL FAILURES: 1` |
| `board_truth_missing_correction` | Deletes the section 4 line that contains `Legacy unresolved issues` | Lines 510–512, reading parsed `sec4Rows` | `Section 4 missing 'Legacy unresolved issues (ledger section 4): closure UNVERIFIED' row`. Exit 1. `TOTAL FAILURES: 1` |
| `board_truth_standin_glob_changed` | Replaces every `$U7_*` with `$U7_CHANGED_NOT_MATCHING` | Lines 503–506, testing `/\$U7_\*/` and `/!\$U7_\*/` against `standInsText` | Missing canonical tokens for `$U7_*` person sheets and `!$U7_*` object sheets. Exit 1. `TOTAL FAILURES: 1` |

An independent read of the same regexes against `docs/STATUS.md`, outside the validator, produced:

- Ruling row cells: `` `game/js/plugins/DEUS_Fake.js` ``, `` `archive/plugins/DEUS_Fake.js` ``, `NOT APPROVED`.
- Blank-destination row cells: `` `game/js/plugins/DEUS_FakeBlank.js` ``, empty string, `Owner 2026-09-30 prune ruling`. `arch_empty=true`.
- Legacy rows remaining after the deletion: 0.
- `$U7_*` occurrences remaining in the Stand-ins section: 0. The literal token `$U7_CHANGED_NOT_MATCHING` is present. `/!\$U7_\*/` does not match, because `!$U7_*` contains `$U7_*`.

The pass 9 logs for the two board-truth mutants were the sentences `Mutant injected: missing board truth correction` and a pushed stand-in sentence while the six patterns still matched. This run's board-truth log is the legacy-row predicate and the two glob predicates. The archive mutants name `DEUS_Fake.js` and `DEUS_FakeBlank.js`, which are the rows inserted into the table. The live Agriculture row is left intact. Disk checks stay green on both archive mutants, which is what follows from the parser placing those rows in `malformedArchivedRows` and keeping them out of `archivedRows`.

## Defect 2 — Prose and comment mutations reach the parser

RESOLVED.

`prose_only_live_plugin` (lines 147–149) replaces the single section 1 row that contains `` `DEUS_Core` `` with `Prose mention: `DEUS_Core.js` is an important engine module.` `prose_only_companion_plugin` (lines 151–153) does the same for the `` `DEUS_Containers` `` row. Both replacements run before section parsing. Section 1 authorization reads `parseTableRows` only (lines 246–259).

Independent application of those two replacements:

| Probe | Result |
|---|---|
| Prose sentence sits between `## 1. Live Systems` and `## 2. Frozen Systems` | Both mutants |
| Prose line contains a pipe | Neither |
| Section 1 table rows still naming `DEUS_Core` | 0 |
| Section 1 table rows whose first cell is `DEUS_Containers` | 0 |

Observed processes:

| Mutant | Exit | Failure log |
|---|---|---|
| `prose_only_live_plugin` | 1 | `Missing from Section 1 table: DEUS_Core` and `Unauthorized files: DEUS_Core.js`. `TOTAL FAILURES: 2` |
| `prose_only_companion_plugin` | 1 | `Missing from Section 1 table: DEUS_Containers` and `Unauthorized files: DEUS_Containers.js`. `TOTAL FAILURES: 2` |

`rogue_plugin_in_comment` (lines 155–157) inserts, on the line after `## 1. Live Systems`, two HTML comments that contain a table row and a list item for `DEUS_RogueScript`, plus the prose line `Warning: `DEUS_RogueScript.js` observed in directory.` Comment stripping on line 185 runs after that insertion. Lines 442–444 then add `DEUS_RogueScript.js` to the directory list the anti-junk guard reads. That push is the directory stimulus. The comments are the authorization attempt.

Independent placement check: the first `DEUS_RogueScript` offset is after `## 1. Live Systems` and before `## 2. Frozen Systems`. After the same comment strip the validator uses, no section 1 table row contains `DEUS_RogueScript`, and the warning line is still inside section 1 and is not a table row. With the comments left in place, `parseTableRows` does authorize `DEUS_RogueScript`.

Observed process, strip intact: exit 1, `Unauthorized files: DEUS_RogueScript.js`, `TOTAL FAILURES: 1`.

Counterfactual, temp copy only: the strip assignment was replaced with `const statusText = rawStatusText`, `ROOT` was pointed at this worktree, and `--mutant=rogue_plugin_in_comment` was run. Exit 0. The comment-shaped table row authorizes the pushed filename when the strip is absent, so this kill is the strip. The repo file was not edited for that run.

## Defect 3 — `--verify-proof` requires all 13 kills

RESOLVED. `tools/test_control_board.js` lines 62–111:

- The baseline child must exit 0 and its stdout must include `CONTROL BOARD VALIDATION: CLEAN PASS`. A thrown child exits 1 at line 76. A zero exit whose stdout lacks that sentence leaves `baselinePass` false and exits 1 at lines 79–82.
- Each of the 13 `MUTANTS` entries increments exactly one of `killed` (child status 1), `survived` (child status 0), or `badExit` (any other status).
- Line 104 exits 1 unless `killed === MUTANTS.length` and `survived === 0` and `badExit === 0`. `survived` starts at 0 and only increments, so the written test `survived > 0` is that zero check. `MUTANTS.length` is 13.
- The success line interpolates `killed` and `survived`. It is reached only after line 104 has passed.

The repo command `node tools/test_control_board.js --verify-proof` exited 0 and printed `1 baseline passed, 13/13 negative cases killed, 0 survived.`

Three temp copies of the same script, each with `ROOT` pointed at this worktree, confirm the refusal paths. The repo file was not edited.

| Copy | Change | Exit | Tail |
|---|---|---|---|
| Survivor | `missing_archive_ruling` performs no text edit | 1 | `Mutant missing_archive_ruling unexpectedly passed (exit 0)` then `FAIL: Mutant kill requirements not met (12/13 killed, 1 survived, 0 bad exit)` |
| Bad status | `blank_archive_dest` calls `process.exit(2)` | 1 | `Mutant blank_archive_dest failed with non-1 status (2)` then `FAIL: Mutant kill requirements not met (12/13 killed, 0 survived, 1 bad exit)` |
| Baseline | A non-mutant child prints `FORCED BASELINE FAIL` and exits 1 | 1 | `[FAIL] Baseline failed:` and the child command line |

## Commands

| Command | Exit | Observed |
|---|---|---|
| `node tools/test_control_board.js` | 0 | `CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)`. Companions 11, active lanes 17, reference branches 10, archive rows 51, anti-junk clean, board-truth check clean. |
| `node tools/test_control_board.js --verify-proof` | 0 | `1 baseline passed, 13/13 negative cases killed, 0 survived.` |
| `node tools/test_control_board.js --mutant=<each of the 13 names>` | 1 each | Separate process per name. Status 1 for all 13. Failure text is in the mutant table. |
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/governance/merge_gate.js --lane lane-cq --manifest tasks/OPS.PRUNE.01/lane-cq/lane.json --dry-run` | 1 | Scope, manifest, and both clone tests pass. `REVIEW_NOT_LAST`, `BRANCH_UNPUSHED`, and `MAIN_DIRTY` refuse. Detail below. |

Baseline log:

```text
=== Control Board & Anti-Regression Verification (FIX-CQ-10) ===
  [OK] STATUS.md contains Section 1 (Live Systems)
  [OK] STATUS.md contains Section 2 (Frozen Systems)
  [OK] STATUS.md contains Section 3 (In Review)
  [OK] STATUS.md contains Section 4 (Defect / Unproved)
  [OK] STATUS.md contains Section 5 (Archived Systems)
  [OK] STATUS.md contains Stand-ins Section
  [OK] plugins.js discovery found enabled plugins (>0)
  [OK] All enabled plugins in plugins.js are explicitly recorded in Section 1 tables
  [OK] DEUS_Core companions discovery found items (>0)
  [OK] All DEUS_Core companion plugins (11) are explicitly recorded in Section 1 tables
  [OK] active_lanes.json discovery found active lanes (>0)
  [OK] All declared active task branches (17) are listed in Section 3
  [OK] All declared reference branches (10) are listed in Section 3
  [OK] Section 5 (Archived Systems) discovery found archived rows (>0)
  [OK] All archived rows in Section 5 contain explicit, valid rulings and non-blank destinations
  [OK] All items declared in Section 5 (51) have been moved off their original paths
  [OK] All archive destinations declared in Section 5 (51) exist on disk
  [OK] Anti-Junk Guard: No unlisted or unauthorized .js files in game/js/plugins (Strict table/list authorization; prose/comments/archive excluded)
  [OK] Board Truth Integrity: all corrections verified (lane-cs reference, historical CQ hash, climate authorities, clean stand-in notes, canonical stand-in tokens, legacy unresolved row)
-----------------------------------------------------
CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)
```

`--verify-proof` log:

```text
=== Acceptance Evidence & Proof Verification (FIX-CQ-10 Item 4) ===
  [OK] Baseline check on final tip: PASSED (0 errors)
  [OK] Mutant missing_live_plugin correctly failed with exit 1
  [OK] Mutant prose_only_live_plugin correctly failed with exit 1
  [OK] Mutant prose_only_companion_plugin correctly failed with exit 1
  [OK] Mutant rogue_plugin_in_comment correctly failed with exit 1
  [OK] Mutant missing_archive_ruling correctly failed with exit 1
  [OK] Mutant blank_archive_dest correctly failed with exit 1
  [OK] Mutant archived_file_exists correctly failed with exit 1
  [OK] Mutant missing_in_archive correctly failed with exit 1
  [OK] Mutant unlisted_plugin_in_dir correctly failed with exit 1
  [OK] Mutant missing_active_lane correctly failed with exit 1
  [OK] Mutant board_truth_cs_in_active correctly failed with exit 1
  [OK] Mutant board_truth_missing_correction correctly failed with exit 1
  [OK] Mutant board_truth_standin_glob_changed correctly failed with exit 1
-----------------------------------------------------
PROOF VERIFICATION: 1 baseline passed, 13/13 negative cases killed, 0 survived.
```

### Negative cases

Each row is one `node tools/test_control_board.js --mutant=<name>` process.

| Mutant | Exit | What the process changes | Failure log |
|---|---|---|---|
| `missing_live_plugin` | 1 | Deletes the section 1 `` `DEUS_Core` `` table row before parsing | `Missing from Section 1 table: DEUS_Core` and `Unauthorized files: DEUS_Core.js`. `TOTAL FAILURES: 2` |
| `prose_only_live_plugin` | 1 | Replaces that row with a section 1 prose sentence before parsing | Same two lines as `missing_live_plugin`. The sentence is inside section 1 and is not a table row |
| `prose_only_companion_plugin` | 1 | Replaces the section 1 `` `DEUS_Containers` `` row with a prose sentence before parsing | `Missing from Section 1 table: DEUS_Containers` and `Unauthorized files: DEUS_Containers.js`. `TOTAL FAILURES: 2` |
| `rogue_plugin_in_comment` | 1 | Inserts comment-wrapped table and list rows inside section 1 before the strip, then adds `DEUS_RogueScript.js` to the directory list | `Unauthorized files: DEUS_RogueScript.js`. `TOTAL FAILURES: 1`. With the strip removed, this mutant exits 0 |
| `missing_archive_ruling` | 1 | Inserts a section 5 row ruled `NOT APPROVED` before parsing | `Malformed rows: game/js/plugins/DEUS_Fake.js`. `TOTAL FAILURES: 1` |
| `blank_archive_dest` | 1 | Inserts a section 5 row whose archive cell is empty before parsing | `Malformed rows: game/js/plugins/DEUS_FakeBlank.js`. `TOTAL FAILURES: 1` |
| `archived_file_exists` | 1 | Inserts a well-formed section 5 row for `game/js/plugins/DEUS_Core.js` before parsing | Count 52. `Still exists on disk: game/js/plugins/DEUS_Core.js` and `Missing from archive on disk: archive/plugins/DEUS_Core.js`. `TOTAL FAILURES: 2` |
| `missing_in_archive` | 1 | Inserts a well-formed section 5 row whose destination is absent before parsing | Count 52. `Missing from archive on disk: archive/plugins/non_existent_fake_arch.js`. `TOTAL FAILURES: 1` |
| `unlisted_plugin_in_dir` | 1 | Pushes `unauthorized_rogue_script.js` onto the directory list | `Unauthorized files: unauthorized_rogue_script.js`. `TOTAL FAILURES: 1` |
| `missing_active_lane` | 1 | Pushes `task/lane-mutant-unlisted` onto `activeLanes` before the section 3 check | Count 18. `Missing from Section 3: task/lane-mutant-unlisted`. `TOTAL FAILURES: 1` |
| `board_truth_cs_in_active` | 1 | Pushes `task/lane-cs` onto `activeLanes` and removes it from `referenceBranches` before the board-truth checks | Still in `activeLanes`, and missing from `referenceBranches`. `TOTAL FAILURES: 1` |
| `board_truth_missing_correction` | 1 | Deletes the legacy unresolved-issues row before parsing | `Section 4 missing 'Legacy unresolved issues (ledger section 4): closure UNVERIFIED' row`. `TOTAL FAILURES: 1` |
| `board_truth_standin_glob_changed` | 1 | Replaces `$U7_*` in the raw board before parsing | Missing `$U7_*` person sheets and `!$U7_*` object sheets. `TOTAL FAILURES: 1` |

The file's leading comment still says `FIX-CQ-9`. The runtime banners printed by this run say `FIX-CQ-10`. That comment does not change the verdict.

## Merge gate dry-run

The gate reads the local branch tip, which at execution was `9c0d5dfb88ff1df5454884c9e2d9e120109bbfc2`, one `[ops]` commit above `f7eea08ee511211ec63de7c185f9d6b070ac33f4`. Node process status 1.

```text
# DEUS merge gate summary (tools/governance/merge_gate.js)
mode: dry-run
local branch:  9c0d5dfb88ff1df5454884c9e2d9e120109bbfc2
tracking / remote task/lane-cq: f7eea08ee511211ec63de7c185f9d6b070ac33f4
local / tracking / remote main: c34c98f33071a54070f0e6f7323e82c947d569fb
main worktree: C:/Users/snewt/OneDrive/Desktop/UF
merge-base: 5fe51c14933edb31e391dd7d6049489a2ce0a631
manifest blob: a06dda6d6b641c8e200999840d9e0ced1d8e1a5b
writer / reviewer: gemini / grok
diff: 21 files, every path in allowedPaths

Tests, each in a fresh clone at the checked sha:
  1. node tools/check_deus_syntax.js     exit 0  5.24 s  PASS
  2. node tools/test_control_board.js    exit 0  0.12 s  PASS

Checks:
  refs            PASS
  (a) manifest    PASS
  (a) scope       PASS
  (b) review      REFUSED  REVIEW_NOT_LAST
  (c) tests       PASS
  (d) pushed      REFUSED  BRANCH_UNPUSHED
  (e) main        REFUSED  MAIN_DIRTY
  (f) execution   NOT RUN (refused)

REFUSED BRANCH_UNPUSHED: local task/lane-cq 9c0d5dfb88ff1df5454884c9e2d9e120109bbfc2 is ahead of origin f7eea08ee511211ec63de7c185f9d6b070ac33f4
REFUSED MAIN_DIRTY: C:/Users/snewt/OneDrive/Desktop/UF has uncommitted tracked changes or an operation in progress: M docs/agents/mailboxes/fable/outbox.jsonl; M docs/agents/mailboxes/gemini/inbox.jsonl; M docs/telemetry/sessions/active_workers.json; M tools/ops/launch_worker.ps1
REFUSED REVIEW_NOT_LAST: review commit 4f92e516c4b87463e6d84fa4f32696b732de4a12 "[grok] OPS.PRUNE.01: independent review of lane-cq tip 3b2f0a26" is followed by 2 commit(s): 9c0d5dfb "[ops] OPS.PRUNE.01 lane-cq launch prompt 20260930_162356 (reviewer grok)", f7eea08e "[gemini] OPS.PRUNE.01 FIX-CQ-10: upfront input data mutations, strict 13/13 kill verification"
GATE: REFUSED (exit 1)
```

`REVIEW_NOT_LAST` is the order rule. The previous review commit sits under the writer commit and under the ops launch prompt. This artifact is the review of the writer commit, so it was not yet an ancestor of the sha the dry-run checked. `BRANCH_UNPUSHED` is that same local ops commit: `origin/task/lane-cq` is the reviewed sha. `MAIN_DIRTY` is four tracked paths in the main worktree. They are outside `f7eea08ee511211ec63de7c185f9d6b070ac33f4` and outside `allowedPaths`. Scope, manifest, and both lane gate tests passed on the fresh clones.

## Final verdict

The three pass 9 defects are closed on `f7eea08ee511211ec63de7c185f9d6b070ac33f4`.

The four named mutants edit table text or stand-in tokens in `rawStatusText` before parsing, and the failure text is the ordinary section 5 and board-truth predicates. The two prose mutants replace section 1 table rows with prose sentences before parsing, and those sentences are not table rows. The rogue comment is inserted inside section 1 before the strip; removing the strip makes that mutant exit 0. `--verify-proof` keeps `baselinePass`, requires `killed === 13`, `survived === 0`, and `badExit === 0`, and exits 1 when any of those fails. The repo proof command exited 0 with 13 of 13 killed. `node tools/check_deus_syntax.js` exited 0 with 62 plugins and 0 errors. The happy-path control board exited 0.

VERDICT: CLEAN PASS
