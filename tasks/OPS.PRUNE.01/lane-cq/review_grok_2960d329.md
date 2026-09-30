# Independent adversarial review: OPS.PRUNE.01 / lane-cq (pass 4)

## Metadata

| Field | Value |
|---|---|
| Writer | Gemini |
| Reviewer | Grok |
| Authority | DEC-034 independent cross-family review; `docs/CANONICAL_ROLES.md` (independent first verdict) |
| Prior verdict | `21020c736260745313c4795ffbdfef4eca12ce15` — VERDICT: CLEAN PASS (`tasks/OPS.PRUNE.01/lane-cq/review_grok_21020c73.md`) |
| Reviewed commit | `2960d32919890c3aed70b163e67ccd1485c4e21f` |
| Branch | `task/lane-cq` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-cq` |
| Worktree HEAD at execution | `2960d32919890c3aed70b163e67ccd1485c4e21f` |
| Merge-base with `origin/main` | `5fe51c14933edb31e391dd7d6049489a2ce0a631` |
| `origin/main` at execution | `ba2f88bbfc057c640b57a0ee86643dd55f51708c` |
| `origin/task/lane-cq` at execution | `2960d32919890c3aed70b163e67ccd1485c4e21f` |
| Node | v24.19.0 |
| Executed | 2026-09-30 14:10 CT, in this worktree (not a fresh clone) |

HEAD is the reviewed commit. The only untracked path is `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_135832_prompt.txt`. It is not in the commit and the gates do not read it.

## Remediation verification

### Section 5 is the moved-away set: 51 row pairs, no phantoms

An independent parser, separate from the gate, read section 5 two ways: the gate's split-and-trim loop, and a strict match on backtick-wrapped table cells. Both returned the same 51 original paths and the same 51 archive paths. Zero parser disagreement. Zero duplicate originals. Zero duplicate archive paths.

For every row, all of the following held:

- The original path is absent on disk and absent from the git index.
- The archive path is a tracked non-empty file, and `git ls-files` returns that path with the table's casing.
- The original basename and the archive basename are the same. The original stays under `game/js/plugins/`. The archive path stays under `archive/plugins/`.

Zero rows failed that walk. `git ls-files` on the ten phantom names from `f6120780` (`DEUS_Tech.js`, `UF_AssetInventory.js`, `UF_AutoTiling.js`, `UF_Caravan.js`, `UF_Extraction.js`, `UF_Quality.js`, `UF_Reclamation.js`, `UF_Tech.js`, `UF_TimeDomains.js`, `UF_Weights.js`) still returns nothing.

`archive/plugins/` has 62 tracked paths: 58 top-level `.js` files and 4 files under `archive/plugins/stock_rmmz/`. Seven top-level files are not section 5 rows, and each still has a live file at `game/js/plugins/` of the same name: `DEUS_Callings.js`, `DEUS_Conditions.js`, `DEUS_Containers.js`, `DEUS_Select.js`, `UF_Households.js`, `UF_Select.js`, `UF_Time.js`. Listing those seven as archived would make check 4 fail, because the original path exists. The moved-away set (archive file tracked, original gone) is exactly the 51 rows. The prior pass recorded the same seven. This commit does not edit section 5.

### Check 4 reads both sides, and `missing_archive_file` hits the archive predicate

`tools/test_control_board.js` lines 201–219 walk `archivedRows` and record two results: `existsSync` on the original path, and a missing `existsSync` on the archive path. Each result has its own `check()`. `missing_archive_file` is in `MUTANTS` (line 30) and is accepted by the same `--mutant=` / `--mutate=` regex as the other four (line 38).

Lines 194–197 push `{ orig: "game/js/plugins/non_existent_fake_orig.js", arch: "archive/plugins/non_existent_fake_arch.js" }` onto `archivedRows` before that walk. The original file is not on disk, so the original-path check stays green. The archive file is not on disk, so the archive check is the one that fails. Both flags printed one failure, `Missing from archive on disk: archive/plugins/non_existent_fake_arch.js`, at row count 52, and exited 1.

The happy path printed both lines at count 51 and exited 0:

```text
[OK] All items declared in Archived Systems (51) have been moved off their original paths
[OK] All archive destinations declared in Archived Systems (51) exist on disk
```

### Section 3 matches the 26 local `task/*` branches, including `task/lane-cw`

`git branch --list task/*` returned 26 lines, 17 of them prefixed `+`. The replace at line 141 kept every name. That set and section 3's branch column are equal: 26 names, empty difference both ways, no duplicate board rows. `task/lane-cw` is one of the 26.

The new row is `task/lane-cw` / `lane-cw` (`NAT.03.01`) / DEUS_Fluid and sim/hydro correctness, items a–h. MSG-PRUNE-PM-034's lettered scope is (a) through (h). `ab15c1f9` resolves to `ab15c1f9ae320b90036f081c4a48b8e08a59b583`, subject `[ops] NAT.03.01 lane-cw setup manifest and brief` (2026-09-30 13:41:16 -0500). It is an ancestor of `task/lane-cw`. The other 17 cited short SHAs in section 3 also resolve. The 11 companion names from `DEUS_Core.js` are still rows in section 1.B. Section 1.A's 42 names are still `plugins.js` enabled order, and every plugin is `status: true`.

### Section 4 does not record the NAT.02.01 defect MSG-PRUNE-PM-033 specified

MSG-PRUNE-PM-033 (2026-09-30T18:30:25.501Z, from fable to gemini, type DEFECT) tells the lane-cq board to mark NAT.02.01 NOT DONE under Defect/Unproved with this sentence:

`kernel is a stub (no rubble, no ledger posting); review fdb5c0a0 missed it`

The writer's ACK (AG-PRUNE-024) quoted that sentence and the NOT DONE mark. The commit writes a different cell at `docs/STATUS.md:155`:

```text
| `NAT.02.01` | `tasks/NAT.02.01/lane-bv` | Matter kernel is a stub; review `fdb5c0a0` missed it. | OPEN |
```

The reference path exists, and `fdb5c0a0` resolves to `fdb5c0a07fe66756738e5b3bca81d7f683ac8657`. `tasks/NAT.02.01/lane-bv/review_grok_fdb5c0a0.md` ends VERDICT: PASS and VERDICT: CLEAN PASS. The status cell says OPEN. The description says "Matter kernel" and drops `(no rubble, no ledger posting)`.

That parenthesis is the defect. On this tree:

- `game/js/sim/ledger.js` returns `Object.freeze({...})` at lines 704–711. `transferMass` is not a key. `createLedger()` is frozen and `typeof ledger.transferMass` is `undefined`.
- `game/js/sim/structural/collapse.js` lines 59–69 call `ledger.transferMass` only when that property is a function. The fallback assigns `ledger.rubble`. In this file's strict mode, that assignment on the real ledger throws `TypeError: Cannot add property rubble, object is not extensible`. A probe of one supported solid cell with no support path threw there. The cell had already been set to `open_air`. The ledger checksum did not change. No rubble property was added.
- The file never constructs a rubble item. `rubbleItemsCreated` is a counter, and the throw happens before the increment.
- `tools/test_structural_collapse.js` lines 100–107 pass a plain object that implements `transferMass`. The PASS review's mass check never calls `createLedger()`.

NAT.02.01 is the collapse kernel in `game/js/sim/structural/`. "Matter kernel" points at the wrong module. `ledger.js` and `materials.js` are the matter books, and they are not this stub.

## Commit and diff

`git cat-file -t 2960d32919890c3aed70b163e67ccd1485c4e21f` is `commit`.

```text
HASH:    2960d32919890c3aed70b163e67ccd1485c4e21f
SUBJECT: [gemini] OPS.PRUNE.01: add task/lane-cw to section 3 and record NAT.02.01 defect in section 4
AUTHOR:  deus-ops <deus-ops@local.invalid>
DATE:    2026-09-30 13:56:21 -0500
PARENT:  1061e6d57ec57997f0f93692d736c15e6e436636
```

That commit's own diff is one file, on `lane.json` `allowedPaths`:

```text
 docs/STATUS.md | 2 ++
 1 file changed, 2 insertions(+)
```

The two insertions are the `task/lane-cw` row and the `NAT.02.01` row. Nothing else in `docs/STATUS.md` changed.

`git diff --name-status 5fe51c14933edb31e391dd7d6049489a2ce0a631 2960d32919890c3aed70b163e67ccd1485c4e21f`:

| Path | Status | In allowedPaths |
|---|---|---|
| `docs/STATUS.md` | M | yes |
| `docs/archive/STATUS_LEDGER_20260930.md` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/BRIEF.md` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/lane.json` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_125717_prompt.txt` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_131151_prompt.txt` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_132438_prompt.txt` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_21020c73.md` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_45376e85.md` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_8accbf07.md` | A | yes |
| `tools/ops/gate_tests.json` | M | yes |
| `tools/test_control_board.js` | A | yes |

Twelve paths. Zero outside `allowedPaths`. Zero edits to engine core (`rmmz_*.js`, `main.js`, `libs/**`). Zero edits under `art/` or catalogue trees. Zero edits to civilization or faction source. `tools/ops/gate_tests.json` lists `tools/test_control_board.js` as gate entry 10, after `tools/test_strata_foundation.js`. `quarantine` is unchanged. This commit does not edit the gate file.

## Gate execution

Commands run in `C:\Users\snewt\.deus_worktrees\lane-cq`. Each process was spawned with stdout and stderr captured. The exit code is that process's status. `--mutant=` and `--mutate=` wrote identical transcripts for each name.

| Command | Exit | Observed |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_control_board.js` | 0 | `CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)`. Both archive lines at count 51. Branch line at count 26 |
| `--mutant=` / `--mutate=missing_live_plugin` | 1 | One failure. `Missing: DEUS_Core` |
| `--mutant=` / `--mutate=archived_file_exists` | 1 | Count 52. `Still exists on disk: game/js/plugins/DEUS_Core.js` and `Missing from archive on disk: archive/plugins/DEUS_Core.js` |
| `--mutant=` / `--mutate=missing_archive_file` | 1 | Count 52. Only `Missing from archive on disk: archive/plugins/non_existent_fake_arch.js`. Original-path check passes |
| `--mutant=` / `--mutate=unlisted_plugin_in_dir` | 1 | `Unaccounted files: unauthorized_rogue_script.js` |
| `--mutant=` / `--mutate=missing_task_branch` | 1 | `Missing: task/mutant-unlisted-lane` at count 27 |

The syntax gate, the happy path, and all ten mutant commands meet the required exit codes. The new mutant is killed by the archive-existence predicate.

## Findings

### 1. The NAT.02.01 row is not the defect record MSG-PRUNE-PM-033 required

The message's direction and the writer's ACK both name the board text: NOT DONE, and `kernel is a stub (no rubble, no ledger posting); review fdb5c0a0 missed it`. The committed row says OPEN, calls it a "Matter kernel," and omits the parenthesis. A probe against `createLedger()` reproduces the omitted facts: no `transferMass`, the fallback write throws, the checksum does not move, and no rubble item exists. The PASS review at `fdb5c0a0` checked a test double that implements `transferMass`.

### Notes that do not carry the verdict

- `archived_file_exists` fails two checks. The injected archive path is `archive/plugins/DEUS_Core.js`, and that file is not on disk, so the archive check fails beside the original-path check. The original-path predicate still fires. `missing_archive_file` isolates the archive check.
- The file header at line 12 still describes check 4 as the original-path test only. The archive-existence check is in the body.
- A thrown `git branch` is still a pass. The `catch` at lines 143–145 warns and leaves `taskBranches` empty, and an empty list satisfies check 3. `git branch` succeeded in this run, and the 26-name set matched section 3.
- At 13:56, when this commit was written, `task/lane-cw` already pointed at `939b98c3` (the ops launch-prompt commit, parent `ab15c1f9`). The row cites `ab15c1f9`. During this review the tip was `28fe2614d20b518617116855c5d1fb004435f449` (`[codex] NAT.03.01 record fresh-clone gates and game translation handoff`). `ab15c1f9` remains an ancestor. The row names the branch.
- MSG-PRUNE-PM-033 also says NAT.03.01 and NAT.04.01 stay "kernel reviewed, not bridged." They were not section 4 rows before this commit, and this commit does not add them. MSG-PRUNE-PM-034, two minutes later, opens lane-cw for the (a)–(h) correctness fixes. Section 3's lane-cw row matches that later scope.
- `sim/ledger` remains a section 1.B row. The prior review recorded the same classification note.

## Final verdict

The archive table, check 4, `missing_archive_file`, and the 26-branch set, including `task/lane-cw`, hold. The syntax gate and all five mutants exit as required. The diff from the merge-base stays inside `lane.json` `allowedPaths`.

The new section 4 row does not. It does not mark NAT.02.01 NOT DONE, and it does not carry the sentence MSG-PRUNE-PM-033 specified. The dropped clause is the defect a probe against the real ledger reproduces.

VERDICT: FAIL
