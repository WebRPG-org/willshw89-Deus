# Independent adversarial review: OPS.PRUNE.01 / lane-cq (re-review)

## Metadata

| Field | Value |
|---|---|
| Writer | Gemini |
| Reviewer | Grok |
| Authority | DEC-034 independent cross-family review; `docs/CANONICAL_ROLES.md` (independent first verdict) |
| Prior verdict | `4bf8549fce9aea4260cf0ed6f93d9c0e45be5e61` — VERDICT: FAIL (`tasks/OPS.PRUNE.01/lane-cq/review_grok_45376e85.md`) |
| Reviewed commit | `8accbf074d60956a56f655a69abaf84cf32a230c` |
| Branch | `task/lane-cq` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-cq` |
| Worktree HEAD at execution | `ca6af756b1e9117ffec40456dcd5b96a100b10fc` |
| Merge-base with `origin/main` | `5fe51c14933edb31e391dd7d6049489a2ce0a631` |
| `origin/main` at execution | `6d70b0ff0f8e9c42df5accbf56763c84eec8af54` |
| `origin/task/lane-cq` at execution | `8accbf074d60956a56f655a69abaf84cf32a230c` |
| Node | v24.19.0 |
| Executed | 2026-09-30 13:18 CT, in this worktree (not a fresh clone) |

The launch prompt names `8accbf07bebb3d750c1f54beaa34c38d6ee9425d`. `git cat-file -t` on that id fails (`bad object`). `git rev-parse 8accbf07` resolves to one commit, `8accbf074d60956a56f655a69abaf84cf32a230c`, whose subject is the remediation commit and whose parent is the prior review `4bf8549f`. This review is of that object.

`ca6af756` is the ops launch-prompt commit. Its only change from the reviewed commit is `A tasks/OPS.PRUNE.01/lane-cq/launches/20260930_131151_prompt.txt`. `docs/STATUS.md` and `tools/test_control_board.js` at execution are the reviewed commit's blobs. Gate commands ran against that tree.

## Remediation Verification

### Finding 1 — worktree `+` branches are now kept

`tools/test_control_board.js:140` is `b.replace(/^[*+\s]+/, "")`. `git branch --list task/*` in this worktree returned 25 `task/*` lines, 16 of them prefixed `+` (sample: `+ task/lane-a`, `+ task/lane-b`, `+ task/lane-bd`). No ANSI color bytes. After that replace, all 16 `+` names stayed in the checked set.

Section 3's backticked branch column and that set are equal: 25 names, empty difference both ways. `task/lane-cr` and `task/lane-cs` are rows in section 3. The happy-path line was `All open task/* branches (25) are accounted for in In Review`.

### Finding 2 — `--mutate=` and `--mutant=` both change inputs the predicates read

`tools/test_control_board.js:37` accepts `--mutant=` and `--mutate=` (`/^--(?:mutant|mutate)=([a-z_]+)$/`). Each mode mutates the data the later check reads:

| Mode | Input change | Predicate that fires | Observed detail |
|---|---|---|---|
| `missing_live_plugin` | `statusText` replace of `DEUS_Core` before check 1 (lines 81–84) | `hasToken` over enabled `plugins.js` names | `Missing: DEUS_Core` |
| `archived_file_exists` | extra archived row `game/js/plugins/DEUS_Core.js` before `existsSync` (lines 189–192) | `existsSync` on the original path | `Still exists on disk: game/js/plugins/DEUS_Core.js` (row count 52) |
| `unlisted_plugin_in_dir` | `unauthorized_rogue_script.js` pushed onto the directory list before the scan (lines 209–212) | enabled-name / `hasToken` accounting | `Unaccounted files: unauthorized_rogue_script.js` |
| `missing_task_branch` | `task/mutant-unlisted-lane` pushed onto the branch list before the scan (lines 146–149) | `hasToken` on the branch and the lane name | `Missing: task/mutant-unlisted-lane` (count 26) |

None of the four modes append a string onto the failure list after the predicate. A predicate that always succeeded would leave these runs at exit 0. Both flag spellings exited 1 for all four names. See the gate table.

`hasToken` (lines 62–66) uses a boundary of `[^a-zA-Z0-9_-]`. Probes against isolated longer names returned no hit: `DEUS_World` inside `DEUS_WorldGen`, `lane-b` inside `lane-bb` / `task/lane-bb`, `DEUS_Combat` inside `DEUS_CombatRT`, `DEUS_Depth` inside `DEUS_DepthCues`, `DEUS_Time` inside `DEUS_TimeSpeed`, `DEUS_Select` inside `UF_Select`, and `DEUS_Core` inside `DEUS_Core_MUTATED_OUT`. The board still carries `DEUS_World` and `task/lane-b` as their own tokens, so those rows do not depend on the longer names.

### Finding 3 — `companionPlugins` is read, and the eleven names sit in section 1.B

The parser at lines 113–120 matches `const companionPlugins = [ ... ];` in `game/js/plugins/DEUS_Core.js`, strips `//` comments, and keeps quoted entries. On the current file (array at lines 89–104) it returns exactly:

`DEUS_Containers`, `DEUS_Bag`, `DEUS_Stockpiles`, `DEUS_Fluid`, `DEUS_Conditions`, `DEUS_Select`, `DEUS_Dnd5e`, `DEUS_Callings`, `DEUS_HistoricalDemographics`, `DEUS_DeathForensics`, `UF_Households`.

Each of those eleven tokens is present in the section 1.B slice of `docs/STATUS.md` (rows at lines 64–74, citing `DEUS_Core.js` lines 90–99 and 103, which match the array). The old section "Unwired Core & Candidate Modules" is gone. The happy-path line was `All DEUS_Core companion plugins (11) are listed on the control board`.

Same pass over the rest of the board diff: `plugins.js` has 42 plugins, all `status: true`, and section 1.A lists those 42 names in that order. `DEUS_Camera.js:624` is `PluginManager.loadScript("DEUS_Minimap")`. The 41 `UF_*.js` names in section 2.D are on disk and each file is 16 lines. `game/js/plugins/` has 105 `.js` files; every basename is an enabled plugin or a token on the board.

## Commit & Diff Verification

`git cat-file -t 8accbf074d60956a56f655a69abaf84cf32a230c` is `commit`.

```text
HASH:    8accbf074d60956a56f655a69abaf84cf32a230c
SUBJECT: [gemini] OPS.PRUNE.01: remediate Grok review findings (companions, worktree branches, real mutants)
AUTHOR:  deus-ops <deus-ops@local.invalid>
DATE:    2026-09-30 13:11:06 -0500
PARENT:  4bf8549fce9aea4260cf0ed6f93d9c0e45be5e61
```

That commit's own diff is two files, both on `lane.json` `allowedPaths`:

```text
 docs/STATUS.md              | 59 ++++++++++++++---------------
 tools/test_control_board.js | 91 ++++++++++++++++++++++++++++++---------------
 2 files changed, 92 insertions(+), 58 deletions(-)
```

`git diff --name-status origin/main...8accbf074d60956a56f655a69abaf84cf32a230c` (the branch since the merge-base):

| Path | Status | In allowedPaths |
|---|---|---|
| `docs/STATUS.md` | M | yes |
| `docs/archive/STATUS_LEDGER_20260930.md` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/BRIEF.md` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/lane.json` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_125717_prompt.txt` | A | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_45376e85.md` | A | yes |
| `tools/ops/gate_tests.json` | M | yes |
| `tools/test_control_board.js` | A | yes |

Eight paths. Zero outside `allowedPaths`. Zero edits to engine core (`rmmz_*.js`, `main.js`, `libs/**`). Zero edits under `art/` or catalogue trees. Zero edits to civilization or faction source. `tools/ops/gate_tests.json` lists `tools/test_control_board.js` as gate entry 10. `quarantine` is unchanged from the prior review.

Cited section 3 SHAs that were checked all resolve, including the two new rows: `409e085cfba48c36357652e2ed13d7e9b4cc47c2` (`task/lane-cr`) and `2609995909ba988e785bbd7c7811195f433be275` (`task/lane-cs`). At execution those commits were ancestors of the worktree tips `12d7b0d4ae47` and `cc2a739a8555`. The tips moved while this review ran. The rows name the branches.

## Gate Test Execution & Results

Commands run in `C:\Users\snewt\.deus_worktrees\lane-cq`. Exit codes are `$LASTEXITCODE` immediately after each process.

| Command | Exit | Required |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | pass. Output: `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_control_board.js` | 0 | pass. Ends `CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)` |
| `node tools/test_control_board.js --mutate=missing_live_plugin` | 1 | fail. `Missing: DEUS_Core` |
| `node tools/test_control_board.js --mutate=archived_file_exists` | 1 | fail. `Still exists on disk: game/js/plugins/DEUS_Core.js` |
| `node tools/test_control_board.js --mutate=unlisted_plugin_in_dir` | 1 | fail. `Unaccounted files: unauthorized_rogue_script.js` |
| `node tools/test_control_board.js --mutate=missing_task_branch` | 1 | fail. `Missing: task/mutant-unlisted-lane` |
| `node tools/test_control_board.js --mutant=missing_live_plugin` | 1 | fail. Same `DEUS_Core` detail as `--mutate=` |
| `node tools/test_control_board.js --mutant=archived_file_exists` | 1 | fail. Same `DEUS_Core.js` detail as `--mutate=` |
| `node tools/test_control_board.js --mutant=unlisted_plugin_in_dir` | 1 | fail. Same rogue-script detail as `--mutate=` |
| `node tools/test_control_board.js --mutant=missing_task_branch` | 1 | fail. Same missing-lane detail as `--mutate=` |

The syntax gate and all eight mutant runs meet the required exit codes. The happy-path exit 0 is real for the predicates it evaluates, and it does not inspect archive destinations. See the finding.

## Findings

### 1. Section 5 swapped ten real archive files for ten paths that are not in the repository

The remediation diff rewrites the archived table in `docs/STATUS.md` as well as sections 1–3. Set comparison of section 5 original paths at `4bf8549f` (51 rows, archive paths checked in the prior review) against section 5 at `8accbf07` (still 51 rows):

Ten rows removed. Each original path is absent under `game/js/plugins/`, and each archive path is tracked:

| Archive path still in git | On the board at `8accbf07` |
|---|---|
| `archive/plugins/DEUS_Time.js` | absent |
| `archive/plugins/UF_Agriculture.js` | absent |
| `archive/plugins/UF_BootstrapData.js` | absent |
| `archive/plugins/UF_Conditions.js` | absent |
| `archive/plugins/UF_Containers.js` | absent |
| `archive/plugins/UF_DFCombat.js` | absent |
| `archive/plugins/UF_DFWorld.js` | absent |
| `archive/plugins/UF_FogOfWar.js` | absent |
| `archive/plugins/UF_ProcGen.js` | absent |
| `archive/plugins/UF_Rules.js` | absent |

Ten rows added. `git ls-files` returns nothing for these names anywhere in the tree, and both the `game/js/plugins/` path and the `archive/plugins/` path are absent on disk:

| Board row | Line |
|---|---|
| `archive/plugins/DEUS_Tech.js` | 185 |
| `archive/plugins/UF_AssetInventory.js` | 186 |
| `archive/plugins/UF_AutoTiling.js` | 187 |
| `archive/plugins/UF_Caravan.js` | 189 |
| `archive/plugins/UF_Extraction.js` | 194 |
| `archive/plugins/UF_Quality.js` | 203 |
| `archive/plugins/UF_Reclamation.js` | 204 |
| `archive/plugins/UF_Tech.js` | 210 |
| `archive/plugins/UF_TimeDomains.js` | 211 |
| `archive/plugins/UF_Weights.js` | 212 |

Section 5's introduction says these files were moved to `archive/`. The ten new archive paths were not. The forty-one unchanged rows still have an archive file on disk and an original path that is gone.

Check 4 (`tools/test_control_board.js:194–205`) calls `existsSync` only on the original path. A path that was never in the tree satisfies that test. The happy-path run printed `All items declared in Archived Systems (51) have been moved off their original paths` and exited 0. The `archived_file_exists` mutant proves `existsSync` can see a file that is present. It does not prove the listed archive path exists.

### Notes that do not carry the verdict

- A thrown `git branch` is still a pass. The `catch` at lines 142–144 warns and leaves `taskBranches` empty, and an empty list satisfies check 3. `git branch` succeeded in this run, and the 25-name set matched section 3.
- A `companionPlugins` literal the regex misses is still a pass: `companionPlugins` stays `[]` and check 2 reports zero companions listed. The regex matched the current `DEUS_Core.js` and returned 11 names.
- Checks 1–3 and 5 search the whole of `docs/STATUS.md`. The eleven companions and the 25 branches are in sections 1.B and 3, so this run is not saved by a mention elsewhere.
- `sim/ledger` remains a section 1.B row. No file under `game/js/plugins/` references `ledger.js` or `sim/ledger`. The prior review recorded the same classification note. `gate_tests.json` has no ledger entry. The new parenthetical says "verified by gate suites".

## Final verdict

Findings 1–3 from `4bf8549f` are fixed. Worktree `+` branches are parsed and all 25 local `task/*` branches are listed in section 3. Both mutant flags alter the inputs the real predicates read, and all eight required mutant commands exit 1 with those predicates' messages. `companionPlugins` is parsed from `DEUS_Core.js`, and all eleven companions are rows in section 1.B. Scope, plugin order, shim line counts, and the syntax gate hold.

The same commit's archived table does not. It drops ten files that are in `archive/plugins/` and lists ten archive paths that are not in the repository. The control-board gate exits 0 on that table because it never looks up the archive side.

VERDICT: FAIL
