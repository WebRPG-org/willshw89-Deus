# Independent closure review: OPS.PRUNE.01 / lane-cq (pass 8)

## Metadata

| Field | Value |
|---|---|
| Writer | Gemini |
| Reviewer | Grok |
| Reviewer Family | xai (Grok) |
| Authority | DEC-034 independent cross-family review; `docs/CANONICAL_ROLES.md` (independent first verdict) |
| Prior verdict | `28278460c11e8fc48527e6c38f43a5b1d5d93013` refused in `tasks/OPS.PRUNE.01/lane-cq/review_grok_28278460.md` (commit `7fab523069ef0d46065a39805014ae503af5497b`) |
| Target Commit SHA | `65c0c0762077188e641de2f4b14a95c6fb761701` |
| Branch | `task/lane-cq` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-cq` |
| Worktree HEAD at execution | `65c0c0762077188e641de2f4b14a95c6fb761701` |
| Merge-base with `origin/main` | `5fe51c14933edb31e391dd7d6049489a2ce0a631` |
| `origin/main` at execution | `e05e95797cbe1713e284d7af6c542b79276e2d36` |
| `origin/task/lane-cq` at execution | `65c0c0762077188e641de2f4b14a95c6fb761701` |
| Node | v24.19.0 |
| Executed | 2026-09-30 15:13–15:17 CT, in this worktree (gate tests inside `merge_gate` ran in fresh clones of this tip) |

HEAD is the reviewed commit. `git cat-file -t 65c0c0762077188e641de2f4b14a95c6fb761701` is `commit`. The worktree blob of `docs/STATUS.md` is `6fa57c1d9caeb4e48252b6c8fc86cb0c14f20363`, the same object as `HEAD:docs/STATUS.md`. The file is LF and ends with a newline. Untracked paths at execution, absent from the commit, were:

- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_135832_prompt.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_141239_prompt.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_142140_prompt.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_145210_prompt.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_150749_prompt.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_FIX_CQ_7_prompt.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_FIX_CQ_8_prompt.txt`

The gates do not read them.

## Commit

```text
HASH:    65c0c0762077188e641de2f4b14a95c6fb761701
SUBJECT: [gemini] OPS.PRUNE.01 FIX-CQ-8: restore UI stand-in declaration bullets in docs/STATUS.md
AUTHOR:  deus-ops <deus-ops@local.invalid>
DATE:    2026-09-30 15:07:23 -0500
PARENT:  7fab523069ef0d46065a39805014ae503af5497b
```

That commit's own diff is one path, on `lane.json` `allowedPaths`:

```text
 docs/STATUS.md | 3 +++
 1 file changed, 3 insertions(+)
```

The three insertions are the two UI bullets and a blank line after them. Nothing earlier in `docs/STATUS.md` changes. Line 5, line 16, section 3, and section 4 are the parent bytes. `git diff --name-only origin/main...65c0c0762077188e641de2f4b14a95c6fb761701` is seventeen paths. `merge_gate` marked every one inside `allowedPaths`. Zero edits to engine core (`rmmz_*.js`, `main.js`, `libs/**`). Zero edits under `art/` or catalogue trees.

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
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_28278460.md` | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_2960d329.md` | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_373bb811.md` | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_45376e85.md` | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_4a5fc62a.md` | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_8accbf07.md` | yes |
| `tools/ops/active_lanes.json` | yes |
| `tools/ops/gate_tests.json` | yes |
| `tools/test_control_board.js` | yes |

## Stand-ins: eight bullets, 114 names, 15 globs

`## Stand-ins` is at `docs/STATUS.md:226`. The section has eight bullet lines, 228 through 235:

| # | Line | Label |
|---|---|---|
| 1 | 228 | People |
| 2 | 229 | Creatures |
| 3 | 230 | Objects without the prefix |
| 4 | 231 | Objects with the prefix |
| 5 | 232 | Items |
| 6 | 233 | Ground |
| 7 | 234 | UI still drawn in play |
| 8 | 235 | UI and other extractions, unused |

An independent copy of the inventory parser (`tools/generate_asset_inventory.js` lines 148–166) measured this file, the parent `28278460:docs/STATUS.md`, `origin/main:docs/STATUS.md`, the merge-base `5fe51c14:docs/STATUS.md`, and `docs/archive/STATUS_LEDGER_20260930.md`.

| Source | Bullets | Inventory names | Inventory globs |
|---|---|---|---|
| `65c0c076` `docs/STATUS.md` | 8 | 114 | 15 |
| Parent `28278460` | 6 | 104 | 7 |
| `origin/main` | 8 | 114 | 15 |
| Merge-base `5fe51c14` | 8 | 114 | 15 |
| Ledger `docs/archive/STATUS_LEDGER_20260930.md` | 8 | 114 | 15 |

All eight bullet strings on this tip are byte-identical to the eight bullets on `origin/main`, on the merge-base, and in the ledger. Lengths: 1075, 910, 994, 874, 453, 362, 481, 336. The parent keeps the first six unchanged and has no seventh or eighth bullet. This commit adds these two lines:

```text
- UI still drawn in play: `game/img/faces/U7_Faces.png` (8 portraits), `game/img/system/u7_gump_*.png` (container gumps; `gump_test.png`, `gump_backpack.png`, `gump_barrel.png`, `gump_sack.png` below are byte copies) | FACES.VGA and GUMPS.VGA shapes 0, 1, 2, 5, by tools/extract_u7_assets.ps1 (lines 83–180) | drawn in play: UF_Dialogue 271 and UF_Gumps 215 (faces), UF_Gumps 104–108 (gumps); RMMZ editor data: Actors.json faces of actors 2–9. Not swapped: a code change, see above
- UI and other extractions, unused: `game/img/system/U7_Window.png`, `U7_Cursor.png`, `U7_Select.png`, `U7_Pointer.png`, `U7_HandPointer.png`, `game/img/system/u7_gumps/`, `gump_*.png`, `paperdoll_*.png`, `game/img/faces/face_*.png`, `actor_*.png`, `monster_*.png`, `test_shape*.png` | earlier extraction, sources not recorded | nothing
```

Against the parent, the inventory parser gains exactly ten names and eight globs:

- Names: `faces/u7_faces`, `gump_backpack`, `gump_barrel`, `gump_sack`, `gump_test`, `system/u7_window`, `u7_cursor`, `u7_handpointer`, `u7_pointer`, `u7_select`.
- Globs: `system/u7_gump_*`, `system/u7_gumps/*`, `gump_*`, `paperdoll_*`, `faces/face_*`, `actor_*`, `monster_*`, `test_shape*`.

Those are the names and globs pass 7 reported as present only on the two missing bullets. The same ten names and eight globs are hits for the originality checker's first-field rule (`tools/originality_check.js` lines 34–58). That rule counts 113 names and 15 globs on this tip, on main, on the merge-base, and in the ledger. The inventory count is 114 because it also takes backticks after the first pipe. The one extra token is `standinsource`, from `` `standInSource` `` on the objects-without-prefix bullet. That bullet is unchanged from the parent and from main.

The fifteen glob entries, in order, are `$U7_*`, `$U7_Adam*`, `$U7_Eve*`, `$U7_Fighter*`, `$U7_*`, `!$U7_*`, `!$U7_Item_*`, `system/u7_gump_*`, `system/u7_gumps/*`, `gump_*`, `paperdoll_*`, `faces/face_*`, `actor_*`, `monster_*`, `test_shape*`. `$U7_*` is pushed twice. The tool counts entries, so the reported glob count is 15.

Tracked PNG coverage, using the same `standinListed` test as the inventory tool (`git ls-files game/img`, 2656 tracked PNGs):

| | Count |
|---|---|
| Newly listed versus the parent | 355 |
| Of those, `U7_` basename | 14 |
| Of those, unprefixed | 341 |
| Lost versus the parent | 0 |
| `characters/` | 11 |
| `faces/` | 242 |
| `pictures/` | 8 |
| `system/` | 94 |

The 341 unprefixed files are the set pass 7 said both readers drop. They are listed again. These six paths are tracked: `game/img/faces/U7_Faces.png`, `game/img/system/U7_Window.png`, `game/img/system/gump_backpack.png`, `game/img/system/gump_barrel.png`, `game/img/system/gump_sack.png`, `game/img/system/gump_test.png`.

### Parser command

```text
node tools/generate_asset_inventory.js --out C:\Users\snewt\AppData\Local\Temp\lane-cq-pass8-inventory
```

`--out` sends `ASSET_INVENTORY.md` and `UF_AssetIndex.json` outside the repo. The stand-in parse still reads `docs/STATUS.md`. Exit code of the whole tool: 1. The stand-in line passed. The message template is `tools/generate_asset_inventory.js` line 173. Observed:

```text
PASS inventory.standins_parsed: 8 lines under STATUS.md → Stand-ins: 114 names, 15 globs
```

The other twenty checks: 17 passed, 3 failed. Result line: `RESULT FAIL 18/21 checks (inventory)`.

| Check | Result |
|---|---|
| `standins_parsed` | PASS, 8 lines, 114 names, 15 globs |
| `standins_detected` | PASS. 52 `U7_` character sheets and 10 unprefixed U7-derived files are classed `U7 stand-in` |
| `catalog_no_standins` | PASS |
| `runtime_no_standins` | PASS |
| `missing_files` | FAIL. `1 referenced files do not exist` |
| `stock_cuts_verified` | FAIL. 39 of 54 stock cuts, source `system/IconSet.png` |
| `rmmz_data_no_standins` | FAIL. `$U7_Blacksmith`, `$U7_DwarfGuard`, `$U7_Goblin`, `$U7_Miner`, `img/faces/U7_Faces.png` |

`statusOf` classes a `U7_` basename as a stand-in before it consults the bullet list (`tools/generate_asset_inventory.js` line 566). The five editor-data names in `rmmz_data_no_standins` are `U7_` names, so that failure does not depend on the two restored bullets. `missing_files` and `stock_cuts_verified` do not read the Stand-ins bullets. The lane's `gateTests` are the syntax check and `tools/test_control_board.js`. They do not run the inventory tool.

## Gate test results

Commands run in `C:\Users\snewt\.deus_worktrees\lane-cq` unless noted. Exit codes are the process status. The control-board happy path was run again after the mutant runs.

| Command | Exit | Observed |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_control_board.js` | 0 | `CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)` |
| `node tools/test_control_board.js` (repeat after mutants) | 0 | Same clean line |
| `node tools/governance/merge_gate.js --lane lane-cq --manifest tasks/OPS.PRUNE.01/lane-cq/lane.json --dry-run` | 1 | See the dry-run report below |

Happy-path log:

```text
=== Control Board & Anti-Regression Verification (FIX-CQ-7) ===
  [OK] STATUS.md contains Section 1 (Live Systems)
  [OK] STATUS.md contains Section 2 (Frozen Systems)
  [OK] STATUS.md contains Section 3 (In Review)
  [OK] STATUS.md contains Section 4 (Defect / Unproved)
  [OK] STATUS.md contains Section 5 (Archived Systems)
  [OK] plugins.js discovery found enabled plugins (>0)
  [OK] All enabled plugins in plugins.js are listed in Section 1 (Live Systems)
  [OK] DEUS_Core companions discovery found items (>0)
  [OK] All DEUS_Core companion plugins (11) are listed in Section 1 (Live Systems)
  [OK] active_lanes.json discovery found active lanes (>0)
  [OK] All declared active task branches (18) are listed in Section 3 (In Review)
  [OK] All declared reference branches (9) are listed in Section 3 (In Review)
  [OK] Section 5 (Archived Systems) discovery found archived rows (>0)
  [OK] All archived rows in Section 5 contain explicit rulings
  [OK] All items declared in Section 5 (51) have been moved off their original paths
  [OK] All archive destinations declared in Section 5 (51) exist on disk
  [OK] Anti-Junk Guard: No unlisted or unauthorized .js files in game/js/plugins (Section-bound, comments excluded)
-----------------------------------------------------
CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)
```

An independent read of `game/js/plugins.js` counted 42 enabled plugins, the same number the section 1 prose states. The OK lines give 11 companions, 18 active lanes, 9 reference branches, and 51 archive rows.

### merge_gate dry-run

Run against tip `65c0c0762077188e641de2f4b14a95c6fb761701`, before this review commit existed. Exit 1.

```text
# DEUS merge gate summary (tools/governance/merge_gate.js)
mode: dry-run
local branch / tracking / remote task/lane-cq: 65c0c0762077188e641de2f4b14a95c6fb761701
local main / tracking / remote main:           e05e95797cbe1713e284d7af6c542b79276e2d36
main worktree: C:/Users/snewt/OneDrive/Desktop/UF
merge-base: 5fe51c14933edb31e391dd7d6049489a2ce0a631
manifest blob: a06dda6d6b641c8e200999840d9e0ced1d8e1a5b
writer / reviewer: gemini / grok
diff: 17 files, every path in allowedPaths

Tests, each in a fresh clone at the checked sha:
  1. node tools/check_deus_syntax.js     exit 0  6.20 s  PASS
  2. node tools/test_control_board.js    exit 0  0.10 s  PASS

Checks:
  refs            PASS
  (a) manifest    PASS
  (a) scope       PASS
  (b) review      REFUSED  REVIEW_NOT_LAST
  (c) tests       PASS
  (d) pushed      PASS
  (e) main        REFUSED  MAIN_DIRTY
  (f) execution   NOT RUN (refused)

REFUSED MAIN_DIRTY: C:/Users/snewt/OneDrive/Desktop/UF has uncommitted tracked changes or an operation in progress: M docs/agents/mailboxes/fable/inbox.jsonl; M docs/agents/mailboxes/fable/outbox.jsonl; M docs/agents/mailboxes/gemini/inbox.jsonl; M docs/agents/mailboxes/gemini/outbox.jsonl; M docs/telemetry/sessions/active_workers.json
REFUSED REVIEW_NOT_LAST: review commit 7fab523069ef0d46065a39805014ae503af5497b "[grok] OPS.PRUNE.01: independent review of lane-cq tip 28278460" is followed by 1 commit(s): 65c0c076 "[gemini] OPS.PRUNE.01 FIX-CQ-8: restore UI stand-in declaration bullets in docs/STATUS.md"
GATE: REFUSED (exit 1)
```

`REVIEW_NOT_LAST` is the order rule. The checked sha is the writer commit. The previous review commit sits under it. This artifact is the review of that writer commit, so it cannot already be an ancestor of the sha the dry-run checked. `MAIN_DIRTY` is five tracked paths in the main worktree. They are outside this commit and outside `allowedPaths`. Scope, manifest, pushed, and both lane gate tests passed on the fresh clones.

## Mutant kill evidence

`tools/test_control_board.js` defines these eight mutants (lines 28–38). The accepted flag is `--mutant=<name>` or `--mutate=<name>`, with the name matching `[a-z_]+`. Each was run as `node tools/test_control_board.js --mutant=<name>`. All eight exited 1. Mutant mode is in memory. A happy path after the eight still exited 0.

| Command | Exit | Failure log |
|---|---|---|
| `--mutant=missing_live_plugin` | 1 | `Missing from Section 1: DEUS_Core`. `TOTAL FAILURES: 1` |
| `--mutant=misclassified_plugin` | 1 | `Missing from Section 1: DEUS_Core`. The mutant also appends a `DEUS_Core` row onto section 4. Section 1 still fails. `TOTAL FAILURES: 1` |
| `--mutant=missing_archive_ruling` | 1 | `Missing ruling for: game/js/plugins/DEUS_Agriculture.js`. `TOTAL FAILURES: 1` |
| `--mutant=rogue_plugin_in_comment` | 1 | `Unauthorized files: DEUS_RogueScript.js`. `TOTAL FAILURES: 1` |
| `--mutant=archived_file_exists` | 1 | Count 52. `Still exists on disk: game/js/plugins/DEUS_Core.js` and `Missing from archive on disk: archive/plugins/DEUS_Core.js`. `TOTAL FAILURES: 2` |
| `--mutant=missing_in_archive` | 1 | Count 52. `Missing from archive on disk: archive/plugins/non_existent_fake_arch.js`. `TOTAL FAILURES: 1` |
| `--mutant=unlisted_plugin_in_dir` | 1 | `Unauthorized files: unauthorized_rogue_script.js`. `TOTAL FAILURES: 1` |
| `--mutant=missing_active_lane` | 1 | Count 19. `Missing from Section 3: task/lane-mutant-unlisted`. `TOTAL FAILURES: 1` |

Representative log (`missing_live_plugin`):

```text
=== Control Board & Anti-Regression Verification (FIX-CQ-7) ===
[MUTANT MODE ACTIVE: missing_live_plugin]
  [X] FAIL: All enabled plugins in plugins.js are listed in Section 1 (Live Systems) (Missing from Section 1: DEUS_Core)
TOTAL FAILURES: 1
FAIL: All enabled plugins in plugins.js are listed in Section 1 (Live Systems) - Missing from Section 1: DEUS_Core
```

`archived_file_exists`:

```text
[MUTANT MODE ACTIVE: archived_file_exists]
  [X] FAIL: All items declared in Section 5 (52) have been moved off their original paths (Still exists on disk: game/js/plugins/DEUS_Core.js)
  [X] FAIL: All archive destinations declared in Section 5 (52) exist on disk (Missing from archive on disk: archive/plugins/DEUS_Core.js)
TOTAL FAILURES: 2
```

`missing_in_archive` isolates the archive-destination check. `misclassified_plugin` shows a section 4 mention does not satisfy section 1. This commit does not edit `tools/test_control_board.js`. The kill set is the set the file ships.

## Notes that do not carry the verdict

- The heading on this tip is `## Stand-ins`. On `origin/main` and in the ledger it is `## Stand-ins (U7-derived files: unused by the catalog since 2026-09-19; dev only, never committed, deleted before release; AGENTS rule 8)`. Both readers match `/^##\s+Stand-ins/i`. The eight bullets are byte-identical, which is what those readers consume.
- Section 3 still says `Grok CLEAN PASS at 4a5fc62a; DEC-052 PARTIAL / PM MERGE HELD` for `task/lane-cq`. This commit does not edit that row. `4a5fc62a` still resolves, and it is an ancestor of this tip.
- Section 4 lines 161–163 are unchanged, including the NAT.02.01 row: `kernel is a stub (no rubble, no ledger posting); review fdb5c0a0 missed it` with status `NOT DONE`.
- `archived_file_exists` fails two checks, because the injected archive path `archive/plugins/DEUS_Core.js` is not on disk beside `Still exists on disk: game/js/plugins/DEUS_Core.js`. The original-path predicate still fires.
- The dry-run's `MAIN_DIRTY` refusal is the main worktree's mailbox and telemetry edits. It is not a change in `65c0c0762077188e641de2f4b14a95c6fb761701`.

## Final verdict

The pass 7 hole is closed. `docs/STATUS.md` has eight Stand-ins bullets. The two UI bullets are back, and all eight bullets are byte-identical to `origin/main`, the merge-base, and the ledger. The inventory parser reports 8 lines, 114 names, and 15 globs. The ten names and eight globs pass 7 named are in both the inventory parse and the first-field parse. 355 tracked PNGs that the parent list missed are listed again, including the 341 unprefixed files, and none of the parent's listings were dropped.

`node tools/check_deus_syntax.js` exits 0: `Checked 62 DEUS plugin files. Errors: 0`. `node tools/test_control_board.js` exits 0: `CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)`, including a repeat after the mutants. All eight mutants registered in `tools/test_control_board.js` exit 1 and print the predicates above. The commit diff is the two bullets plus a blank line, inside `allowedPaths`. On a fresh clone, both lane gate tests exit 0.

VERDICT: CLEAN PASS
