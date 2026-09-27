# OPS.40.06 lane-at report

Writer: grok. Reviewer: gemini (not this run). This report does not mark the task DONE.

## What changed

- Added `docs/LESSONS_AND_MISTAKES.md`. Eighteen entries, LM-001 through LM-018. The six WBS seeds are LM-001 through LM-006. LM-007 through LM-018 are the other process rows in `docs/STATUS.md` section "Open Defects & Blockers" that have a commit or an in-repo path.
- Added this file.

No code, no gate, no WBS file, and no `docs/STATUS.md` edit. The untracked launch prompt `tasks/OPS.40.06/lane-at/launches/20260927_021428_prompt.txt` was already in the worktree and is not part of these commits.

## Gate

`tasks/OPS.40.06/lane-at/lane.json` lists one gate. Run from the worktree before the commit that adds this report:

```
node tools/check_deus_syntax.js
```

```
Checked 52 DEUS plugin files. Errors: 0
```

Process exit: 0.

## Evidence check

Every commit named in the log was checked with `git cat-file -e <sha>^{commit}`. Every path named as present was checked with `git cat-file -e HEAD:<path>`. Strings that the log says are not objects were checked the same way and exited 128. The script output below is from that run. `git rev-parse HEAD` in it is the WIP commit `56084c4577dc115bef110c53d150c9b9489cf80d`, before the sentence fix and this report.

```
===== commits that must exist =====
EXIT=0 ed75745694e174ad7836724c0ac206bd0d186a2c
EXIT=0 a0d68065e18269ac823792cee842f45addd28ab4
EXIT=0 d087b0977cca51194d42ba8538c3de38b69ae914
EXIT=0 9f320da22d8956a026012a093b9ec4dc7f5ad964
EXIT=0 a14ee83268028e5084f5c595c54c868cde736ddb
EXIT=0 16fec1077534c48480a5fac893cade74546a5ffd
EXIT=0 d1f9cec58f704e6559cd72cf9546ee7c30aab751
EXIT=0 86c48aade4f838e3b2d90396e4c992cfa6c0802b
EXIT=0 0f7f26cd0d249b07db893a6f48c4aa7cbfe51a8f
EXIT=0 a1d02927e43f1d3217659c146aac8a522974c259
EXIT=0 da2c16b2c8ac2939d855837ecea1b31a17cdf06e
EXIT=0 a0183d68ad21fab6daf7f9cfee8f8d5dbbf352f5
EXIT=0 59573b81bc83b965558fae602ab7a9703e02ecee
EXIT=0 4b9673c67879def4131643196ddb960369394c69
EXIT=0 31676cf143a2b458306b29a43a1e76e40f09cb90
EXIT=0 2e4571a6bd91f852af9cf55f48e15362395a5334
EXIT=0 0536d3920ae4ac6dd65364565583bcf69db20a60
EXIT=0 b9abee29b64f008502d667aa85de20e2669a298f
EXIT=0 6e07f7db4ce8d1a7f4b77cd9a8fd605442d6b87a
EXIT=0 9c0e7b57e93dee27ccc163f669531b348456955c
EXIT=0 a81d0daf8239c1f7d4e5269f9dd6e85e019b2733
EXIT=0 aa0385e3f7d0da79d9d666b591505071592798e0
EXIT=0 8be696f6aad53fe68d819327401672c74494c628
EXIT=0 70dad2779911954aa521f94d10a9a829549ffa81
EXIT=0 048752c83e6fc0bbc06f8cfbe810cb07b61c17f0
EXIT=0 d89edf7e287f33efde16ce0f67527be97d730cdc
===== strings that must not resolve =====
EXIT=128 ed75745610ec163f4b52b2257d079944634df4e2
fatal: Not a valid object name ed75745610ec163f4b52b2257d079944634df4e2^{commit}
EXIT=128 4f346b9a
fatal: Not a valid object name 4f346b9a^{commit}
EXIT=128 e99da6f2
fatal: Not a valid object name e99da6f2^{commit}
EXIT=128 a0183d684e20
fatal: Not a valid object name a0183d684e20^{commit}
===== paths in HEAD =====
EXIT=0 HEAD:docs/LESSONS_AND_MISTAKES.md
EXIT=0 HEAD:docs/STATUS.md
EXIT=0 HEAD:docs/CANONICAL_ROLES.md
EXIT=0 HEAD:docs/worldgen/DEUS_WORLDGEN_WBS.md
EXIT=0 HEAD:docs/OWNER_DECISIONS.md
EXIT=0 HEAD:tools/governance/check_claims.js
EXIT=0 HEAD:tools/governance/test_check_claims.js
EXIT=0 HEAD:tools/governance/MERGE_GATE.md
EXIT=0 HEAD:tools/governance/merge_gate.js
EXIT=0 HEAD:tools/check_deus_syntax.js
EXIT=0 HEAD:tools/ops/launch_worker.ps1
EXIT=0 HEAD:tasks/WG.00.08/defects.jsonl
EXIT=0 HEAD:tasks/WG.00.08/mutant_kill_roster.md
EXIT=0 HEAD:tasks/WG.00.08/state.md
EXIT=0 HEAD:tasks/WG.00.08/evidence/mutants_run_d1fbeab.log
EXIT=0 HEAD:tasks/WG.00.08/evidence/mutants_run_47052c3.log
EXIT=0 HEAD:tasks/WG.00.08/evidence/mutant_shaft_prescan_removed_old_check_bb32c44.log
===== paths not in HEAD =====
EXIT=128 HEAD:docs/outbox/2026-09-25_2305_board.md
fatal: path 'docs/outbox/2026-09-25_2305_board.md' does not exist in 'HEAD'
EXIT=128 HEAD:tasks/WG.00.08/grok_verification.md
fatal: path 'tasks/WG.00.08/grok_verification.md' does not exist in 'HEAD'
EXIT=128 HEAD:tasks/WG.00.11/review_8d1c7c37.md
fatal: path 'tasks/WG.00.11/review_8d1c7c37.md' does not exist in 'HEAD'
===== blobs =====
EXIT=0 16fec107:tasks/WG.00.08/grok_verification.md
EXIT=0 ed757456:tasks/WG.00.11/review_8d1c7c37.md
EXIT=0 a81d0daf:docs/STATUS.md
===== refs =====
EXIT=0 rev-parse HEAD
56084c4577dc115bef110c53d150c9b9489cf80d
EXIT=0 rev-parse task/lane-b
ed75745694e174ad7836724c0ac206bd0d186a2c
EXIT=0 rev-parse origin/task/lane-b
ed75745694e174ad7836724c0ac206bd0d186a2c
EXIT=0 rev-parse task/lane-a
16fec1077534c48480a5fac893cade74546a5ffd
EXIT=0 rev-parse origin/task/lane-a
16fec1077534c48480a5fac893cade74546a5ffd
EXIT=0 rev-parse origin/task/lane-c3
70dad2779911954aa521f94d10a9a829549ffa81
===== ancestry =====
EXIT=1 ancestor 16fec107 of 0f7f26cd
EXIT=0 ancestor 0f7f26cd of HEAD
EXIT=1 ancestor 16fec107 of HEAD
EXIT=0 ancestor 16fec107 of task/lane-a
EXIT=1 ancestor a1d02927 of HEAD
EXIT=0 ancestor da2c16b2 of HEAD
EXIT=0 ancestor 31676cf1 of HEAD
EXIT=0 ancestor 59573b81 of HEAD
EXIT=0 ancestor 4b9673c6 of HEAD
EXIT=1 ancestor ed757456 of HEAD
===== other board hashes from 2026-09-25 23:05 =====
EXIT=0 9e36da7cfbd1385b26e1fa0b4389296751c85c3f
EXIT=0 16fec1077534c48480a5fac893cade74546a5ffd
EXIT=0 6633993d36485970cbf3317f4aff3957f9397c3c
EXIT=0 2355931661a124c7262b52273d1e44712545c480
EXIT=0 a8e4250202fa3d5e0b5c0317532cdebcd736ecc5
===== grep fabricated suffix on main =====
EXIT=1 grep ed75745610ec a6be423d
===== outbox sizes (outside git) =====
0 C:\Users\snewt\.deus_pm\outbox\2026-09-25_2307_board.md
0 C:\Users\snewt\.deus_pm\outbox\2026-09-25_2317_board.md
0 C:\Users\snewt\.deus_pm\outbox\2026-09-25_2325_board.md
===== cited lines =====
HEAD:tasks/WG.00.08/evidence/mutants_run_d1fbeab.log:30: MUTANTS: 27/27 caught by a named check (exit 1) (1387 s)
HEAD:tasks/WG.00.08/evidence/mutants_run_47052c3.log:29: MUTANTS: 28/28 caught by a named check (exit 1) (1146 s)
HEAD:tasks/WG.00.08/evidence/mutant_shaft_prescan_removed_old_check_bb32c44.log:48: RESULT: 26 passed, 0 failed (exit 0)
HEAD:tasks/WG.00.08/state.md:107: 4. **2.2b: mutant roster, now 28** → `tasks/WG.00.08/mutant_kill_roster.md` (revision 2; revision 1's 27/27 is kept in its history table).
HEAD:tools/check_deus_syntax.js:21: process.exit(bad > 0 ? 1 : 0);
HEAD:docs/STATUS.md:24:   - Command captures must record `EXIT=$LASTEXITCODE` per command directly in shell (never inside `powershell -Command "..."`).
HEAD:docs/STATUS.md:41: - **Incident Correction (Directive 001-H sec 6):** Coordinator output file overwrite at 17:13:55 logged as `DEF-COORD-INJECT-01`; `b1ua8l2oj.output` had real 29/0 EXIT=0 result confirmed by `task-34196.log:1084`; `bvwyow104.output` was hook-script SyntaxError (EXIT=1); coordinator ceased all worker temp file touches.
HEAD:docs/CANONICAL_ROLES.md:21: | **Gemini / Antigravity** | **Coordinator & Integration Authority** | • Orchestration, task routing, and WBS state transitions.<br>• Integration authority for all merges into `main`.<br>• Repository health, architectural alignment, and baseline profiling.<br>• Autonomous non-living art production pipeline via Google Nano Banana Pro.<br>• Telemetry monitoring and 3-minute pulse reporting. | • **Does not self-certify.** A WBS item CANNOT be marked `DONE` until an independent closure reviewer's verdict is recorded with a timestamp that precedes the `DONE` edit.<br>• Cannot close defects as `grok`. May record `FIX_READY`. |
===== lane Z bytes at a81d0daf =====
32,9,111,111,108,115,47,115,101,99,117,114,105,116,121,47,42,42,60
```

The Lane Z codes are space, tab (9), then `ools/security/**<`. That is the `\t` escape described in LM-009.

`node tools/governance/check_claims.js --commit <sha> --json`, same day, violation text only:

```
COMMIT 59573b81 toolExit=1 ok=false sha=59573b81bc83b965558fae602ab7a9703e02ecee
  4.1 checked=1 violations=1
    docs/STATUS.md:23 WG.00.08 -> DELIVERED (prose): cites 9f320da2, which is not reachable from the parent commit(s)
  4.2 checked=1 violations=1
    docs/STATUS.md:23 WG.00.08 -> DELIVERED (prose): names no independent reviewer ("closedBy: <agent>" plus that agent's committed review artifact); owners and cited-commit authors are claude, gemini; the committer, gemini, is one of them
  4.3 checked=0 violations=0
  4.4 checked=1 violations=0
COMMIT 4b9673c6 toolExit=1 ok=false sha=4b9673c67879def4131643196ddb960369394c69
  4.1 checked=1 violations=1
    docs/STATUS.md:31 WG.00.11 -> COMPLETE (prose): cites a8e42502, which is not reachable from the parent commit(s)
  4.2 checked=1 violations=1
    docs/STATUS.md:31 WG.00.11 -> COMPLETE (prose): names no independent reviewer ("closedBy: <agent>" plus that agent's committed review artifact); owners and cited-commit authors are claude, gemini; the committer, gemini, is one of them
  4.3 checked=0 violations=0
  4.4 checked=1 violations=0
COMMIT 31676cf1 toolExit=1 ok=false sha=31676cf143a2b458306b29a43a1e76e40f09cb90
  4.1 checked=3 violations=1
    docs/STATUS.md:11 WG.00.08 -> COMPLETED (prose): cites no commit hash and no test run
  4.2 checked=3 violations=3
    docs/STATUS.md:10 WG.00.08 -> ACCEPTED (prose): names no independent reviewer ("closedBy: <agent>" plus that agent's committed review artifact); owners and cited-commit authors are claude, gemini; the committer, gemini, is one of them
    docs/STATUS.md:11 WG.00.08 -> COMPLETED (prose): names no independent reviewer ("closedBy: <agent>" plus that agent's committed review artifact); owners and cited-commit authors are claude, gemini; the committer, gemini, is one of them
    docs/worldgen/DEUS_WORLDGEN_WBS.md:95 WG.00.08 -> DONE: names no independent reviewer ("closedBy: <agent>" plus that agent's committed review artifact); owners and cited-commit authors are claude, gemini; the committer, gemini, is one of them
  4.3 checked=1 violations=3
    docs/worldgen/DEUS_WORLDGEN_WBS.md: non-status edits to WG.00.08 without a Rev increase (Rev none -> none)
    docs/worldgen/DEUS_WORLDGEN_WBS.md: no Rev header ("**Rev:** N" before the first section)
    docs/worldgen/DEUS_WORLDGEN_WBS.md: no Revision Log table
  4.4 checked=2 violations=0
COMMIT 0f7f26cd toolExit=0 ok=true sha=0f7f26cd0d249b07db893a6f48c4aa7cbfe51a8f
  4.1 checked=0 violations=0
  4.2 checked=0 violations=0
  4.3 checked=0 violations=0
  4.4 checked=0 violations=0
```

`0f7f26cd` exits 0. LM-005 records that. The merge-before-review mistake is not what rules 4.1–4.4 flag on that commit.

## Open Owner questions

This lane does not answer these.

1. Commit `ed757456` (`tasks/WG.00.11/review_8d1c7c37.md`, section "Decisions needed (owner)") asks whether setup year N should start the clock at N or keep the N+1 mapping, and whether a standard New Game should offer a Starting Year selector. A search of `docs/OWNER_DECISIONS.md` for `Starting Year`, `HIST-10`, `Year 0`, and `N+1` found no hits. That search is not a decision.
2. WBS section 5.3 lists OD-1 through OD-18 as OPEN, and PM-1 as a PM ruling. None of them is decided here.
3. Closing any `DEF-*` row is not this lane's decision. The log copies the OPEN state from `docs/STATUS.md`.

## Follow-ups

- **PROPOSED-AT-01.** `tools/ops/launch_worker.ps1:1246–1249` still commits the launch prompt onto the lane branch unless `-NoCommitPrompt` is set. DEF-COORD-LAUNCH-PROMPT-01 says prompts are stored out of band. The code and the defect row disagree. Changing the launcher is outside this lane's allowed paths.
- **PROPOSED-AT-02.** Nothing in `tools/` fails a capture that reads `$LASTEXITCODE` inside `powershell -Command`. The guard is the sentence at `docs/STATUS.md:24`.
- **PROPOSED-AT-03.** `tools/governance/check_claims.js` rule 4.1 rejects a non-object hash when a closure cites one. It does not read outbox boards, so a board row marked MATCH (100%) with a non-object hash is not failed by that checker. OPS.40.09 is the existing row for the lane-b correction board. This lane did not write that board.

Existing rows this lane did not do: OPS.10.02 (the review files `16fec107:tasks/WG.00.08/grok_verification.md` and `ed757456:tasks/WG.00.11/review_8d1c7c37.md` are not on HEAD) and OPS.40.09.

## Not claimed

No merge. No push of any branch other than `task/lane-at`. No `DEUS_INTEGRATOR`. No art. The independent review is Gemini's, later.
