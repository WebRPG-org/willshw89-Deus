# Independent adversarial review: OPS.PRUNE.01 / lane-cq (pass 3)

## Metadata

| Field | Value |
|---|---|
| Writer | Gemini |
| Reviewer | Grok |
| Authority | DEC-034 independent cross-family review; `docs/CANONICAL_ROLES.md` (independent first verdict) |
| Prior verdict | `f6120780407005382536c954032fa1081e544678` — VERDICT: FAIL (`tasks/OPS.PRUNE.01/lane-cq/review_grok_8accbf07.md`) |
| Reviewed commit | `21020c736260745313c4795ffbdfef4eca12ce15` |
| Branch | `task/lane-cq` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-cq` |
| Worktree HEAD at execution | `0d31169549540e8057ad6492b7b177ec4e5e37f6` |
| Merge-base with `origin/main` | `5fe51c14933edb31e391dd7d6049489a2ce0a631` |
| `origin/main` at execution | `0f544a96bac23c7c12a23e8ee32eb6e5f4e0545a` |
| `origin/task/lane-cq` at execution | `21020c736260745313c4795ffbdfef4eca12ce15` |
| Node | v24.19.0 |
| Executed | 2026-09-30 13:36 CT, in this worktree (not a fresh clone) |

The launch prompt names `21020c733355a2979268f74a8a071c6bc1209b55`. `git cat-file -t` on that id fails (`could not get object info`). `git rev-parse 21020c73` resolves to one commit, `21020c736260745313c4795ffbdfef4eca12ce15`, whose subject is the section 5 remediation and whose parent is the prior review `f6120780`. This review is of that object.

`0d311695` is the ops launch-prompt commit. Its only change from the reviewed commit is `A tasks/OPS.PRUNE.01/lane-cq/launches/20260930_132438_prompt.txt`. Blob ids of the two files this commit edits are identical at HEAD and at the reviewed commit: `docs/STATUS.md` `75e17bbe01bbdf544a6f94aa1a563771128a6dbd`, `tools/test_control_board.js` `9194b7f55c26e577b57e9e9021ee256188cc55bc`. Gate commands ran against that tree.

## Remediation Verification

### Archive table — the `f6120780` finding is fixed

`f6120780` found that section 5 had dropped 10 real `archive/plugins/` files and listed 10 paths that are not in the repository, while check 4 only called `existsSync` on the original path.

The row pairs in section 5 at this tip are identical to the row pairs at `4bf8549f` (the table that review had already checked against disk). Both sides have 51 unique rows. The set difference is empty in both directions. Against `8accbf07`, the only changes are the ten removals and the ten restorations named in that finding:

| Restored (on the board, on disk, tracked) | Removed (absent from the board, from disk, and from `git ls-files`) |
|---|---|
| `archive/plugins/DEUS_Time.js` | `archive/plugins/DEUS_Tech.js` |
| `archive/plugins/UF_Agriculture.js` | `archive/plugins/UF_AssetInventory.js` |
| `archive/plugins/UF_BootstrapData.js` | `archive/plugins/UF_AutoTiling.js` |
| `archive/plugins/UF_Conditions.js` | `archive/plugins/UF_Caravan.js` |
| `archive/plugins/UF_Containers.js` | `archive/plugins/UF_Extraction.js` |
| `archive/plugins/UF_DFCombat.js` | `archive/plugins/UF_Quality.js` |
| `archive/plugins/UF_DFWorld.js` | `archive/plugins/UF_Reclamation.js` |
| `archive/plugins/UF_FogOfWar.js` | `archive/plugins/UF_Tech.js` |
| `archive/plugins/UF_ProcGen.js` | `archive/plugins/UF_TimeDomains.js` |
| `archive/plugins/UF_Rules.js` | `archive/plugins/UF_Weights.js` |

`git ls-files` with those ten removed names as pathspecs returns no paths anywhere in the tree.

An independent parser, separate from the gate, read section 5 two ways: the gate's own split-and-trim loop, and a strict match on backtick-wrapped table cells. Both returned the same 51 original paths and the same 51 archive paths. For every row, all of the following held:

- The original path is absent on disk and absent from the git index (`game/js/plugins/`).
- The archive path is a non-empty regular file, the directory entry's case matches the table, and the path is tracked under `archive/plugins/`.
- The original basename and the archive basename are the same, and both paths stay under those two directories.

Zero rows failed that walk. The ten restored files are the pre-existing blobs. This commit does not add or edit anything under `archive/plugins/`. The smallest restored file is `UF_Rules.js` at 632 bytes; `DEUS_Time.js` is 22,599 bytes.

### Check 4 now reads the archive path, and the new mutant hits that predicate

`tools/test_control_board.js` lines 201–219 walk `archivedRows` and record two results: `existsSync` on the original path, and a missing `existsSync` on the archive path. Each result has its own `check()`. The new mutant is in `MUTANTS` (line 30) and is accepted by the same `--mutant=` / `--mutate=` regex as the other four (line 38).

Lines 194–197 push `{ orig: "game/js/plugins/non_existent_fake_orig.js", arch: "archive/plugins/non_existent_fake_arch.js" }` onto `archivedRows` before that walk. The original file is not on disk, so the original-path check stays green. The archive file is not on disk, so the archive check is the one that fails. Both flags printed one failure, `Missing from archive on disk: archive/plugins/non_existent_fake_arch.js`, at row count 52, and exited 1. A gate that never looked up the archive side would have exited 0 on this mutant.

The happy path printed both new lines at count 51 and exited 0:

```text
[OK] All items declared in Archived Systems (51) have been moved off their original paths
[OK] All archive destinations declared in Archived Systems (51) exist on disk
```

### Findings 1–3 from `4bf8549f` still hold

This commit does not edit the branch parser, the companion parser, or the other three mutants. Re-checked on this tree:

- `git branch --list task/*` returned 25 lines, 16 prefixed `+` (sample: `+ task/lane-a`, `+ task/lane-b`, `+ task/lane-bd`). The replace at line 141 kept every name. That set and section 3's branch column are equal. The happy-path line was `All open task/* branches (25) are accounted for in In Review`.
- `--mutant=` and `--mutate=` still rewrite the input the later predicate reads. `missing_live_plugin` reports `Missing: DEUS_Core`. `unlisted_plugin_in_dir` reports `unauthorized_rogue_script.js`. `missing_task_branch` reports `task/mutant-unlisted-lane` at count 26. `archived_file_exists` still reports `Still exists on disk: game/js/plugins/DEUS_Core.js`. See the note below for the second failure that run now also prints.
- The companion parser (lines 114–121) still returns the eleven names in `DEUS_Core.js` lines 89–104: `DEUS_Containers`, `DEUS_Bag`, `DEUS_Stockpiles`, `DEUS_Fluid`, `DEUS_Conditions`, `DEUS_Select`, `DEUS_Dnd5e`, `DEUS_Callings`, `DEUS_HistoricalDemographics`, `DEUS_DeathForensics`, `UF_Households`. Each is a row in section 1.B. The happy-path line was `All DEUS_Core companion plugins (11) are listed on the control board`.

Same pass over the rest of the board, which this commit does not edit outside section 5:

- `plugins.js` has 42 plugins, all `status: true`, and section 1.A lists those 42 names in that order.
- The 41 `UF_*.js` names in section 2.D are on disk. Each file is 16 content lines, ends with a newline, and calls `PluginManager.loadScript`. `UF_Core.js` is representative. None of those basenames is also a section 5 row.
- `game/js/plugins/` has 105 `.js` files. Every basename is an enabled plugin or a token on the board.
- `DEUS_Camera.js:624` is `PluginManager.loadScript("DEUS_Minimap")`. `DEUS_Fluid.js:984` is `require("../sim/hydro/index.js")`. `DEUS_Combat.js` builds a `sim/rules/rules.js` path beside the creature-data lookup.
- The 17 short SHAs cited in section 3 all resolve to commits, including `409e085cfba48c36357652e2ed13d7e9b4cc47c2` and `2609995909ba988e785bbd7c7811195f433be275`.

## Commit & Diff Verification

`git cat-file -t 21020c736260745313c4795ffbdfef4eca12ce15` is `commit`.

```text
HASH:    21020c736260745313c4795ffbdfef4eca12ce15
SUBJECT: [gemini] OPS.PRUNE.01: reconcile section 5 archived systems table to disk truth and enforce archive existence check
AUTHOR:  deus-ops <deus-ops@local.invalid>
DATE:    2026-09-30 13:24:21 -0500
PARENT:  f6120780407005382536c954032fa1081e544678
```

That commit's own diff is two files, both on `lane.json` `allowedPaths`:

```text
 docs/STATUS.md              | 20 ++++++++++----------
 tools/test_control_board.js | 15 +++++++++++++++
 2 files changed, 25 insertions(+), 10 deletions(-)
```

`docs/STATUS.md` only rewrites section 5 rows. The ten phantom lines are replaced by the ten restored lines. `tools/test_control_board.js` adds `missing_archive_file` to `MUTANTS`, pushes the synthetic row, and adds the archive `existsSync` check.

`git diff --name-status 5fe51c14933edb31e391dd7d6049489a2ce0a631 21020c736260745313c4795ffbdfef4eca12ce15`:

| Path | Status | In allowedPaths |
|---|---|---|
| `docs/STATUS.md` | M | yes |
| `docs/archive/STATUS_LEDGER_20260930.md` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/BRIEF.md` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/lane.json` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_125717_prompt.txt` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_131151_prompt.txt` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_45376e85.md` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_8accbf07.md` | A | yes |
| `tools/ops/gate_tests.json` | M | yes |
| `tools/test_control_board.js` | A | yes |

Ten paths. Zero outside `allowedPaths`. Zero edits to engine core (`rmmz_*.js`, `main.js`, `libs/**`). Zero edits under `art/` or catalogue trees. Zero edits to civilization or faction source. `tools/ops/gate_tests.json` is unchanged by this commit. Versus the merge-base it still only appends `tools/test_control_board.js` after `tools/test_strata_foundation.js`. `quarantine` is unchanged.

## Gate Test Execution & Results

Commands run in `C:\Users\snewt\.deus_worktrees\lane-cq`. Each process was started with stdout and stderr redirected to separate files. The exit code is that process's exit code. `--mutant=` and `--mutate=` printed the same failure text for each name.

| Command | Exit | Observed |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node --check tools/test_control_board.js` | 0 | parses |
| `node tools/test_control_board.js` | 0 | `CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)`. Both archive lines at count 51 |
| `--mutate=` / `--mutant=missing_live_plugin` | 1 | `Missing: DEUS_Core`. One failure. Archive checks stay at 51 and pass |
| `--mutate=` / `--mutant=archived_file_exists` | 1 | Count 52. `Still exists on disk: game/js/plugins/DEUS_Core.js` and `Missing from archive on disk: archive/plugins/DEUS_Core.js` |
| `--mutate=` / `--mutant=missing_archive_file` | 1 | Count 52. Only `Missing from archive on disk: archive/plugins/non_existent_fake_arch.js`. Original-path check passes |
| `--mutate=` / `--mutant=unlisted_plugin_in_dir` | 1 | `Unaccounted files: unauthorized_rogue_script.js` |
| `--mutate=` / `--mutant=missing_task_branch` | 1 | `Missing: task/mutant-unlisted-lane` at count 26 |

The syntax gate, the happy path, and all ten required mutant commands meet the required exit codes. The new mutant is killed by the archive-existence predicate.

## Findings

No verdict-carrying defect on this tip.

### Notes that do not carry the verdict

- `archived_file_exists` now fails two checks. The injected archive path is `archive/plugins/DEUS_Core.js`, and that file is not on disk, so the new archive check fails beside the original-path check. The original-path predicate still fires (`Still exists on disk: game/js/plugins/DEUS_Core.js`), which is the behavior that mutant was added to prove. A later deletion of only that predicate would leave this mutant red because of the missing archive path. Pointing the injected archive path at a file that exists, such as `archive/plugins/DEUS_Time.js`, would make the run fail on the original-path check alone. `missing_archive_file` already isolates the archive check.
- The handler also names `missing_in_archive` (line 194). That string is not in `MUTANTS`, so the unknown-mutant guard at lines 47–49 exits 2 before the handler. Both `--mutant=missing_in_archive` and `--mutate=missing_in_archive` printed `Unknown mutant: missing_in_archive` and exited 2. The name this pass requires, `missing_archive_file`, is the one that exits 1.
- The file header at line 12 still describes check 4 as the original-path test only. The archive-existence check is in the body of the function.
- A thrown `git branch` is still a pass. The `catch` at lines 143–145 warns and leaves `taskBranches` empty, and an empty list satisfies check 3. `git branch` succeeded in this run, and the 25-name set matched section 3.
- A `companionPlugins` literal the regex misses is still a pass: `companionPlugins` stays `[]` and check 2 reports zero companions listed. The regex matched the current `DEUS_Core.js` and returned 11 names.
- Checks 1–3 and 5 search the whole of `docs/STATUS.md`. The eleven companions and the 25 branches are in sections 1.B and 3.
- `sim/ledger` remains a section 1.B row. The prior review recorded the same classification note. This commit does not touch that row.
- `archive/plugins/` also contains seven `.js` files that are not section 5 rows: `DEUS_Callings.js`, `DEUS_Conditions.js`, `DEUS_Containers.js`, `DEUS_Select.js`, `UF_Households.js`, `UF_Select.js`, `UF_Time.js`, plus `archive/plugins/stock_rmmz/`. Each of the seven still has a live file at `game/js/plugins/` of the same name (a companion, the section 2.C clock, or the `UF_Select` shim). They were already outside the table at `4bf8549f`. Section 5 is the moved-away set, and that set matches the good table.

## Final verdict

The archive defect from `f6120780` is fixed. Section 5's 51 row pairs match the table at `4bf8549f`. Every original path is gone from disk and from the index. Every archive path is a tracked, non-empty file. The ten phantom names are gone. Check 4 calls `existsSync` on the archive path, and `missing_archive_file` fails that predicate under both flags.

Findings 1–3 from `4bf8549f` still hold on this tree. Worktree `+` branches are parsed and all 25 local `task/*` branches are listed in section 3. Both mutant flags alter inputs the real predicates read, and all ten required mutant commands exit 1. `companionPlugins` is parsed from `DEUS_Core.js`, and all eleven companions are rows in section 1.B. Scope, plugin order, shim line counts, and the syntax gate hold.

VERDICT: CLEAN PASS
