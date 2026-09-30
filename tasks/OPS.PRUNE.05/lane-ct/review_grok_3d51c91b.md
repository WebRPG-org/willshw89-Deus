# Independent closure review: OPS.PRUNE.05 / lane-ct (tip 3d51c91b)

## Metadata

| Field | Value |
|---|---|
| Writer | Codex |
| Reviewer | Grok |
| Lane | lane-ct |
| Task | OPS.PRUNE.05 Rule-4 test failure path fixes |
| Branch | `task/lane-ct` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-ct` |
| Reviewed writer commit | `3d51c91b718f05f42f52d6b8c0ef17fab4ba2a8c` |
| Implementation commit | `78da533344b4ce3ffc337f584e2d0b45ea21a506` |
| Parent of the implementation | `7507e17f1f855f8800f014b67e61972d34f9ddc9` |
| Worktree HEAD when this review was executed | `3d51c91b718f05f42f52d6b8c0ef17fab4ba2a8c` |
| Node | v24.19.0 |
| Executed | 2026-09-30 17:41 CT, in this worktree |

`git cat-file -t 3d51c91b718f05f42f52d6b8c0ef17fab4ba2a8c` is `commit`. Its parent is `78da533344b4ce3ffc337f584e2d0b45ea21a506`.

Untracked launch prompts present during execution, and left untracked:

- `tasks/OPS.PRUNE.05/lane-ct/launches/20260930_173514_prompt.txt`
- `tasks/OPS.PRUNE.05/lane-ct/launches/20260930_codex_lane_ct.txt`
- `tasks/OPS.PRUNE.05/lane-ct/launches/20260930_review_prompt_3d51c91b.txt`

The negative driver rewrote `tasks/OPS.PRUNE.05/lane-ct/evidence/negative_verification.json` with this run's timestamp and `baseCommit`. That file was restored to the writer blob before this review was committed. The re-run counts below are from that execution.

## Commits

```text
HASH:    78da533344b4ce3ffc337f584e2d0b45ea21a506
SUBJECT: [codex] OPS.PRUNE.05: fix Rule-4 failure paths across 16 test harnesses
AUTHOR:  deus-codex <deus-ops@local.invalid>
DATE:    2026-09-30 17:31:27 -0500
PARENT:  7507e17f1f855f8800f014b67e61972d34f9ddc9
```

That commit changes the 16 harnesses and adds the lane evidence (fixtures, negative driver, gate logs, effort transcript). 28 files, 5286 insertions, 367 deletions.

```text
HASH:    3d51c91b718f05f42f52d6b8c0ef17fab4ba2a8c
SUBJECT: [codex] OPS.PRUNE.05: fix Rule-4 failure paths across 16 test harnesses - completion report
AUTHOR:  deus-codex <deus-ops@local.invalid>
DATE:    2026-09-30 17:34:47 -0500
PARENT:  78da533344b4ce3ffc337f584e2d0b45ea21a506
```

`git diff --name-only 78da533344b4ce3ffc337f584e2d0b45ea21a506 3d51c91b718f05f42f52d6b8c0ef17fab4ba2a8c` is three paths:

```text
docs/STATUS.md
tasks/OPS.PRUNE.05/lane-ct/REPORT.md
tasks/OPS.PRUNE.05/lane-ct/evidence/gate_control_board_final.log
```

The 16 harness blobs are identical at `78da5333` and `3d51c91b`. The status cell for `task/lane-ct` reads: writer submitted `78da5333`; Grok review pending; 246 fixture cases pass; NW.js/F5 not run. It records the handoff. It does not claim closure.

## Scope

`git diff --name-only --diff-filter=D 7507e17f1f855f8800f014b67e61972d34f9ddc9 3d51c91b718f05f42f52d6b8c0ef17fab4ba2a8c` is empty. No path was deleted. No file under `game/`, `art/`, or `archive/` changed. `tools/ops/active_lanes.json` is unchanged.

Every path from `7507e17f` to `3d51c91b` is inside `tasks/OPS.PRUNE.05/lane-ct/lane.json` `allowedPaths`. The harness set is these 16 files, each present in the tip tree (`tools/test_sack_ui_and_loose_items.js` is tracked):

| # | Path | Failure path now exercised |
|---|---|---|
| 1 | `tools/test_all_animated_objects_live.js` | Shared contract, then the anim suite |
| 2 | `tools/test_all_faction_menus.js` | Enabled `DEUS_FactionMenus` / `DEUS_Test`, then child and screenshots |
| 3 | `tools/test_creatures_ingame.js` | One wildlife hook, then child and screenshots |
| 4 | `tools/test_dwarves_ingame.js` | One `t.screenshot("map")` hook, then child and screenshots |
| 5 | `tools/test_elves_ingame.js` | Same smoke hook, then child and screenshots |
| 6 | `tools/test_golden_art_review_live.js` | Injected grass check requires a nonempty screenshot path |
| 7 | `tools/test_light_wall_occlusion_live.js` | Child status plus both occlusion screenshots |
| 8 | `tools/test_sack_ui_and_loose_items.js` | Ten assertions against the real `DEUS_Bag.js` |
| 9 | `tools/test_standard_4d_ingame.js` | Child status plus both 4D screenshots |
| 10 | `tools/test_standard_8d_ingame.js` | Child status plus three 8D screenshots |
| 11 | `tools/test_temperate_arid_transition_live.js` | Injected check requires six ground kinds and the west/east endpoints |
| 12 | `tools/test_tilesets_live.js` | Child status plus ground and underground screenshots |
| 13 | `tools/test_title_menu.js` | Snapshot-only capture; hidden menu and missing PNG fail |
| 14 | `tools/test_underground_room.js` | Child status plus the underground screenshot |
| 15 | `tools/test_water_ingame.js` | Child status plus the water screenshot |
| 16 | `tools/ops/pm_launch/test_top_models_effort.ps1` | Case-sensitive policy compares; lowered Codex floor fails them |

## Rule 4

The live wrappers share `runMain`, `checkChild`, `createSnapshot`, `replaceOnce`, `verifyScreenshot`, `verifyArtifacts`, and `runSuite` in `tools/test_all_animated_objects_live.js`. Importing that file exports the helpers. `runMain` runs only when the file is the process entry. A thrown check prints `FAIL` and sets `process.exitCode = 1`.

`checkChild` rejects a child error, a signal, or a non-zero status. `createSnapshot` treats robocopy status 8+ (and a null status) as copy failure and rejects a snapshot that already contains `test_output`. `replaceOnce` throws unless the hook occurs once. `verifyArtifacts` requires one `RESULT` line with at least one pass, zero failures, exit 0, a matching `PASS` count, a `PASS <suite>.` line, no `FAIL` or `ERROR` token, and one decodable PNG per expected shot that has a nonzero alpha pixel. `runSuite` applies `checkChild` and then `verifyArtifacts`.

Hook counts in the current game tree, each exactly one:

- `game/js/plugins/DEUS_Anim.js`: `const objectsBefore = cat.objects;`
- `game/js/plugins/DEUS_Wildlife.js`: `t.screenshot("df_behaviors");`
- `game/js/plugins/DEUS_Test.js`: `t.screenshot("map");` and `Test.suite("smoke", async t => {`
- `game/js/plugins.js`: `var $plugins = [`
- `DEUS_FactionMenus` and `DEUS_Test` are enabled, which is what the faction wrapper requires
- `DEUS_Bag.js` contains one `const picked = I.pickUp(source.itemId, u.id);`
- `tools/ops/pm_launch/top_models.ps1` contains one `'codex:standard' = 'xhigh'`

The enumerated defects are closed in source:

- Swallowed `try/catch` around `run_tests.js` or `nw.exe` is gone from the faction, creature, dwarf, elf, 4D, 8D, tileset, underground, water, light, golden, and animated wrappers. Those paths go through `runSuite` or, for the title wrapper, `checkChild` plus `verifyArtifacts`.
- The animated readiness timeout `.catch(() => {})` is gone. The injection targets `DEUS_Anim.js`.
- `t.check("grass_batch1_rendered", true, ...)` is now `existsSync` and `size > 0` on the screenshot path returned by `t.screenshot`.
- `t.check('temperate_arid_transition_verified', true, ...)` is now a check that the settled live map contains tile ids 2862, 2910, 2958, 3006, 3054, and 3102, with west `2862` and east `3054` or `3102`.
- The sack harness loads `game/js/plugins/DEUS_Bag.js` in a Node VM and asserts hotkey preservation, inventory-tab routing, loose-versus-equipped filtering, strength capacity (`8.5` / `180` for the fixture unit), cavity clamping (`bagX=37`, `bagY=110`), world pickup identity, rejected pickup, hit testing, and close. Those numbers match `calculateCarriedWeight` (`STR * 15`) and `clampToCavity` in the plugin. Items and Sheet are doubles. The Bag source is the plugin.
- The PowerShell harness compares with `-ceq`, checks child artifact presence, row count, and boolean `passed`, and accepts a matching exception only for `eq bad tasktype`. `-LibraryPath` points the ordinary assertions at another library copy. `failCount > 0` exits 1.

The fixture driver doubles filesystem and `spawnSync` boundaries. It keeps `replaceOnce`, `verifyArtifacts`, `decodePNG`, the injected suite source, the Bag plugin, and `Get-PmTopModelSpec` on the path that produces the verdict. A negative row is accepted only when the process status is 1, the output has a `FAIL` line, and the fault's diagnostic regex matches. Healthy rows must exit 0.

## Negative verification

Command, from the worktree:

```text
node tasks/OPS.PRUNE.05/lane-ct/evidence/run_negative_verification.js
```

Exit code 0.

```text
RESULT: 246 fixture cases passed, 0 failed; 16 target harnesses
```

| Class | Rows | Observed |
|---|---|---|
| Expected failures | 227 | Every row exited 1 and printed a `FAIL` line. The driver's reason regex matched. |
| Positive controls | 19 | Every row exited 0. No row printed a `FAIL` line. |

The 227 failures cover child status 7, launch `ENOENT`, timeout, robocopy status 8, stale `test_output`, missing/empty/failed/error/truncated/miscounted/wrong-suite results, missing/empty/non-PNG screenshots, and a missing injection hook on the 12 wrappers that inject one. Faction menus and the title wrapper have no plugin-body hook; their child and artifact faults still exit 1. Separate suite executions cover the grass screenshot assertion, the transition metadata assertion, and the title menu assertion. The sack mutant replaces the pickup call with `const picked = true`. The effort mutant changes a library copy's Codex standard floor from `xhigh` to `low`.

Observed diagnostics from this run:

```text
FAIL Error: anim: child status=7, signal=none:
FAIL Error: invalid or failed anim results: FAIL anim.fixture_contract
FAIL Error: missing or empty screenshot: ...\anim.live_animated_objects_scene.png
FAIL Error: expected exactly one injection hook: const objectsBefore = cat.objects;
FAIL AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
FAIL golden_art_review_grass.grass_batch1_rendered - Batch 1 screenshot must exist and contain image data
FAIL temperate_arid_live.temperate_arid_transition_verified - Live ground kinds=2862; west=2862; east=2862
FAIL title.menu_visible - title command menu is not visible or has no commands
FAIL rule codex mechanical high effort got=high want=xhigh
FAIL eq codex standard (empty) got=effort parent=low old=xhigh; ... model_reasoning_effort=low ... model_reasoning_effort=xhigh ... want=match
```

The Codex lines are the ordinary `Assert-Eq` / `Assert-SameRow` compares. With the floor lowered, explicit `high` stays `high` instead of rising to `xhigh`, and an empty effort is raised to `low` against the verbatim blob's `xhigh`. The real library control exited 0.

## Gate tests

| Command | Exit | Observed |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_control_board.js` | 0 | `CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)` |
| `node tools/test_palette.js` | 0 | `Palette loaded successfully` |
| `node tools/governance/test_check_claims.js` | 0 | `RESULT: 279 passed, 0 failed` |

## Residual observations

`tools/test_standard_8d_ingame.js` still calls `writePNG` on `C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85/standard_8d_live_focused_scene.png` after the suite screenshots have already been accepted. `git blame` attributes that line to `8b40cc0c5` (2026-09-19). The other brain copies in this set are guarded with `existsSync`. On a machine where that directory is absent, a live run that has already satisfied `runSuite` would throw there and `runMain` would exit 1. The negative driver stubs `writePNG`, so the healthy 8D row does not exercise that path. The Rule 4 child, results, and screenshot checks run before it.

This review did not launch NW.js or the RPG Maker editor. Screenshot acceptance here is a decoded PNG with a visible pixel, plus the grass, transition, and title assertions executed against the fixture doubles. The writer report states the same limit.

The PowerShell harness keeps its unique temporary evidence directory. That directory is under the user temp path.

## Verdict

The tip `3d51c91b718f05f42f52d6b8c0ef17fab4ba2a8c` contains the 16 authorized harness fixes. Each negative fixture exits 1 from a failed check and prints `FAIL`. The four required gates exited 0 with the outputs above.

VERDICT: CLEAN PASS
