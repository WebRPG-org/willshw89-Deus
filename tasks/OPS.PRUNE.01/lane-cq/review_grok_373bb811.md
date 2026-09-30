# Independent adversarial review: OPS.PRUNE.01 / lane-cq (pass 5)

## Metadata

| Field | Value |
|---|---|
| Writer | Gemini |
| Reviewer | Grok |
| Authority | DEC-034 independent cross-family review; `docs/CANONICAL_ROLES.md` (independent first verdict) |
| Prior verdict | `b58421afaae8abc94755d09e909f980bacbfd49c` — VERDICT: FAIL (`tasks/OPS.PRUNE.01/lane-cq/review_grok_2960d329.md`) |
| Reviewed commit | `373bb811e45d144fc8420ae75afb4298eaa89553` |
| Branch | `task/lane-cq` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-cq` |
| Worktree HEAD at execution | `373bb811e45d144fc8420ae75afb4298eaa89553` |
| Merge-base with `origin/main` | `5fe51c14933edb31e391dd7d6049489a2ce0a631` |
| `origin/main` at execution | `e0b7404ac553921da684858e7554d62646f0bac9` |
| `origin/task/lane-cq` at execution | `373bb811e45d144fc8420ae75afb4298eaa89553` |
| Node | v24.19.0 |
| Executed | 2026-09-30 14:19 CT, in this worktree (not a fresh clone) |

HEAD is the reviewed commit. `git cat-file -t 373bb811e45d144fc8420ae75afb4298eaa89553` is `commit`. The worktree blob of `docs/STATUS.md` is `0980064a89bf2a0af91c11b335ce100358134b42`, the same object as `HEAD:docs/STATUS.md`. Untracked paths at execution, absent from the commit, were `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_135832_prompt.txt` and `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_141239_prompt.txt`. The gates do not read them.

## Remediation of `b58421af`

`b58421af` failed because section 4 recorded NAT.02.01 as OPEN, called it a "Matter kernel," and dropped the parenthesis MSG-PRUNE-PM-033 required.

MSG-PRUNE-PM-033 (2026-09-30T18:30:25.501Z, from fable to gemini, type DEFECT, fable outbox) direction NAT-STATUS says: mark NAT.02.01 NOT DONE on the control board, under Defect/Unproved, with this sentence:

`kernel is a stub (no rubble, no ledger posting); review fdb5c0a0 missed it`

The writer's ACK AG-PRUNE-024 quotes that sentence and the NOT DONE mark. This commit replaces one line. `docs/STATUS.md:155` is now byte-identical to the row the launch names:

```text
| `NAT.02.01` | `tasks/NAT.02.01/lane-bv` | kernel is a stub (no rubble, no ledger posting); review `fdb5c0a0` missed it | NOT DONE |
```

Length 133. The description cell is that sentence, with the short SHA in the table's backticks. The status cell is `NOT DONE`. The row sits in `## 4. Defect / Unproved`, between the ATK-YEAR0-001 row and `## 5. Archived Systems`. The reference path `tasks/NAT.02.01/lane-bv` exists. `fdb5c0a0` resolves to `fdb5c0a07fe66756738e5b3bca81d7f683ac8657`. `tasks/NAT.02.01/lane-bv/review_grok_fdb5c0a0.md` still ends `VERDICT: PASS` and `VERDICT: CLEAN PASS`.

The sentence still matches the kernel on this tree. A probe called `createLedger()` from `game/js/sim/ledger.js` and `executeCollapse()` from `game/js/sim/structural/collapse.js` on one solid, supported cell with no ground anchor and no supporting neighbor:

- The ledger object is frozen. `transferMass` is absent. `typeof ledger.transferMass` is `undefined`.
- `collapse.js` is strict. Lines 61–65 call `ledger.transferMass` when it is a function, and otherwise assign `ledger.rubble`.
- The call threw `TypeError: Cannot add property rubble, object is not extensible`.
- The cell was already `open_air` with `solid: false`. The checksum was unchanged. `rubble` was not added.
- The file has no rubble-item constructor. `rubbleItemsCreated` is a counter after the ledger write.
- `tools/test_structural_collapse.js` lines 100–107 pass a plain object that implements `transferMass`. That mass check does not call `createLedger()`.

## Commit and diff

```text
HASH:    373bb811e45d144fc8420ae75afb4298eaa89553
SUBJECT: [gemini] OPS.PRUNE.01: reconcile NAT.02.01 defect row to exact MSG-PRUNE-PM-033 text and NOT DONE status
AUTHOR:  deus-ops <deus-ops@local.invalid>
DATE:    2026-09-30 14:12:15 -0500
PARENT:  b58421afaae8abc94755d09e909f980bacbfd49c
```

That commit's own diff is one file, on `lane.json` `allowedPaths`:

```text
 docs/STATUS.md | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

`git diff --name-only origin/main...373bb811e45d144fc8420ae75afb4298eaa89553` (the branch since the merge-base):

| Path | In allowedPaths |
|---|---|
| `docs/STATUS.md` | yes |
| `docs/archive/STATUS_LEDGER_20260930.md` | yes |
| `tasks/OPS.PRUNE.01/lane-cq/BRIEF.md` | yes (`tasks/OPS.PRUNE.01/lane-cq/**`) |
| `tasks/OPS.PRUNE.01/lane-cq/lane.json` | yes |
| `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_125717_prompt.txt` | yes |
| `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_131151_prompt.txt` | yes |
| `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_132438_prompt.txt` | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_21020c73.md` | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_2960d329.md` | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_45376e85.md` | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_8accbf07.md` | yes |
| `tools/ops/gate_tests.json` | yes |
| `tools/test_control_board.js` | yes |

Thirteen paths. Zero outside `allowedPaths`. Zero edits to engine core (`rmmz_*.js`, `main.js`, `libs/**`). Zero edits under `art/` or catalogue trees. Zero edits to civilization or faction source. `tools/ops/gate_tests.json` lists `tools/test_control_board.js` as gate entry 10. `quarantine` is the single Z-2 cut proof entry. This commit does not edit the gate file.

## Gate execution

Commands run in `C:\Users\snewt\.deus_worktrees\lane-cq`. The syntax gate and the first control-board suite ran before `task/lane-cs2` existed. Exit codes are the process status.

| Command | Exit | Observed |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_control_board.js` | 0 | `CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)`. Branch line at count 26. Both archive lines at count 51 |
| `--mutant=missing_live_plugin` | 1 | One failure. `Missing: DEUS_Core` |
| `--mutant=archived_file_exists` | 1 | Count 52. `Still exists on disk: game/js/plugins/DEUS_Core.js` and `Missing from archive on disk: archive/plugins/DEUS_Core.js` |
| `--mutant=missing_archive_file` | 1 | Count 52. Original-path check passes. Only `Missing from archive on disk: archive/plugins/non_existent_fake_arch.js` |
| `--mutant=unlisted_plugin_in_dir` | 1 | `Unaccounted files: unauthorized_rogue_script.js` |
| `--mutant=missing_task_branch` | 1 | `Missing: task/mutant-unlisted-lane` at count 27 |

An ordered re-run after `task/lane-cs2` was created, and a final happy-path run at the close of this review, do not repeat that clean result. See the finding. On that later tree every mutant still exits 1 and still prints the predicate message above, and each transcript also prints `Missing: task/lane-cs2`.

## Findings

### 1. Check 3 fails: `task/lane-cs2` is a local branch and section 3 does not name it

`tools/test_control_board.js` check 3 lists `git branch --list task/*`, strips the worktree `+` prefix, and requires `hasToken` to hit `task/<name>` or the lane name. The boundary is `[^a-zA-Z0-9_-]`, so the section 3 row `task/lane-cs` does not account for `task/lane-cs2`.

`task/lane-cs2` was created from `origin/main` (`e0b7404a`) during this review. Reflog: `f850afbe90f19ecbe905316cf9883929169fef65` at 14:15:17 CT (`[gemini] WG.20.02: lane manifest and brief for lane-cs2`), then `043a6b4c07bd53391c094678f8a75489fb79a5b7` at 14:15:56 CT. The worktree is `C:\Users\snewt\.deus_worktrees\lane-cs2`. At the close of this review the tip was `cd6624b20bc81ef21e48f56037daef8d04c77377` (14:17:09 CT, `[gemini] WG.20.02: record DEC-052 after-action for lane-cs2`). `f850afbe` is an ancestor of that tip.

`docs/STATUS.md` contains `lane-cs` on line 121 and contains no `lane-cs2` token. The final happy-path command printed:

```text
[X] FAIL: All open task/* branches (27) are accounted for in In Review (Missing: task/lane-cs2)
TOTAL FAILURES: 1
```

Exit code 1. The other five checks on that run stayed green: 42 enabled plugins, 11 companions, 51 archive rows on both sides, anti-junk guard clean. The same missing branch is why the ordered mutant re-run is not a single expected failure.

The first suite in this review, against the 26-branch set, exited 0. `373bb811` was written at 14:12:15, before this ref existed. The gate reads live local branches. On this machine, at review close, it does not exit 0.

## Notes that do not carry the verdict

- The section 4 remediation holds. Line 155 matches MSG-PRUNE-PM-033's sentence and the NOT DONE mark, and the collapse probe still reproduces the parenthesis.
- `archived_file_exists` fails two checks. The injected archive path `archive/plugins/DEUS_Core.js` is not on disk, so the archive check fails beside `Still exists on disk: game/js/plugins/DEUS_Core.js`. The original-path predicate still fires. `missing_archive_file` isolates the archive check.
- The file header at line 12 still describes check 4 as the original-path test only. The archive-existence check is in the body. This commit does not edit that file.
- MSG-PRUNE-PM-033 also says NAT.03.01 and NAT.04.01 stay "kernel reviewed, not bridged." They are still not section 4 rows. Section 3's `task/lane-cw` row is the NAT.03.01 line added by `2960d329`. This commit does not change it.
- A thrown `git branch` is still a pass. The `catch` warns and leaves `taskBranches` empty, and an empty list satisfies check 3. `git branch` succeeded in these runs.

## Final verdict

The NAT.02.01 row at `docs/STATUS.md:155` is the defect record MSG-PRUNE-PM-033 specified. The diff from the merge-base stays inside `lane.json` `allowedPaths`. The syntax gate exits 0. Each of the five mutants exits 1 and prints its predicate message.

The happy path does not exit 0 with 0 errors. Check 3 reports `Missing: task/lane-cs2` for a local `task/*` branch that section 3 does not name.

VERDICT: FAIL
