# Independent closure re-review: OPS.PRUNE.05 / lane-ct (tip 87380985)

## Metadata

| Field | Value |
|---|---|
| Writer of the reviewed tip | deus-ops (merge) |
| Reviewer | Grok |
| Lane | lane-ct |
| Task | OPS.PRUNE.05 catch-up re-review after the lane-co content conflicts (MSG-PRUNE-PM-075) |
| Branch | `task/lane-ct` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-ct` |
| Reviewed commit | `87380985668da7ea4f34a4650628c68910555184` |
| Parents | `f40d70c4f01e7817e56db4715ea2d3a7f2c8f378` (`[gemini] merge origin/main into task/lane-ct (resolve lane-co retargeting in 5 test harnesses)`), `fbdd2bd946a0913adabd5a2df1c1ece55ffba74c` (`origin/main`) |
| Lane-co retarget ancestor | `e12e9e727c8314f5bbb2bc92eb8bdeb745a84250` |
| Pre-resolution lane-ct tip | `df81ba68016173ee106ba88255fc3cf7e5078640` |
| `origin/main` at review | `fbdd2bd946a0913adabd5a2df1c1ece55ffba74c` (`git fetch origin main`; `FETCH_HEAD` matches) |
| Node | v24.19.0 |
| Executed | 2026-10-01 03:24 CT, in this worktree |

`git cat-file -t 87380985668da7ea4f34a4650628c68910555184` is `commit`. Worktree `HEAD` at execution was that commit.

```text
HASH:    87380985668da7ea4f34a4650628c68910555184
SUBJECT: Merge remote-tracking branch 'origin/main' into task/lane-ct
AUTHOR:  deus-ops <deus-ops@local.invalid>
DATE:    2026-10-01 03:11:14 -0500
PARENTS: f40d70c4f01e7817e56db4715ea2d3a7f2c8f378 fbdd2bd946a0913adabd5a2df1c1ece55ffba74c
```

`git diff --stat f40d70c4f01e7817e56db4715ea2d3a7f2c8f378 HEAD` is only:

```text
art/COUNCIL_RECORD.md | 34 ++++++++++++++++++++++++++++++++++
1 file changed, 34 insertions(+)
```

The five harness resolutions are in the first parent, `f40d70c4`. Their blobs are unchanged at this tip.

## Five resolved harnesses

Lane-co `e12e9e72` retargeted plugin paths in these five files from `UF_*` to `DEUS_*`. Lane-ct's Rule-4 work replaced swallowed exits with checks that throw. At `87380985` each file has the canonical `DEUS_*` plugin path and the shared failure contract.

`git diff df81ba68016173ee106ba88255fc3cf7e5078640 HEAD` for the five files is two lines, both the remaining lane-co retargets:

- `tools/test_all_animated_objects_live.js`: the injection comment now names `DEUS_Anim.js`. The path on the next line was already `js/plugins/DEUS_Anim.js`.
- `tools/test_all_faction_menus.js`: the enabled-plugin expression now requires `"DEUS_" + name`. The pre-merge expression accepted `(?:DEUS_|UF_)`.

The other three files are byte-identical to `df81ba68`, and that pre-merge text already injects `js/plugins/DEUS_Test.js`.

| File | Blob at HEAD | Versus `df81ba68` | Canonical path at HEAD |
|---|---|---|---|
| `tools/test_all_animated_objects_live.js` | `e8417ca09efc058eda386cde3fbd34a16a6474d2` | comment retargeted to `DEUS_Anim.js` | `js/plugins/DEUS_Anim.js` (line 91) |
| `tools/test_all_faction_menus.js` | `a4e144a6143d39d1410cd2ee95b8b1f206a5a89b` | regex retargeted to `DEUS_` only | `"DEUS_FactionMenus"` and `"DEUS_Test"` must be enabled (lines 16–18) |
| `tools/test_light_wall_occlusion_live.js` | `4d1845fa18d6047e093fc72739441f7d1038c03a` | identical | `js/plugins/DEUS_Test.js` (line 25) |
| `tools/test_standard_4d_ingame.js` | `a0fba5e1cfd8db4c99a4e48473e71fe8c5fc9d48` | identical | `js/plugins/DEUS_Test.js` (line 30) |
| `tools/test_standard_8d_ingame.js` | `f5a62189e7026981f81c4e3b7277c3061e64b419` | identical | `js/plugins/DEUS_Test.js` (line 34) |

`git grep` for conflict markers in those five paths at `HEAD` found none.

Rule-4 failure paths still in `tools/test_all_animated_objects_live.js`, and used by the other four through `require('./test_all_animated_objects_live')`:

- `runMain` prints `FAIL` and sets `process.exitCode = 1` when the body throws (lines 8–13).
- `checkChild` throws when `child.error`, a signal, or `child.status !== 0` (lines 16–21).
- `createSnapshot` throws when robocopy's status is outside 0..7 (lines 33–34).
- `replaceOnce` throws unless the injection hook occurs exactly once (lines 40–42).
- `verifyArtifacts` throws unless `results.txt` has one `RESULT` line with zero failures, exit 0, matching `PASS` lines, a `PASS` for the requested suite, and no `FAIL` or `ERROR` token, and unless every named screenshot exists and has a visible pixel (lines 45–68).
- `runSuite` runs `tools/run_tests.js` with `spawnSync` and then calls `checkChild` and `verifyArtifacts` (lines 71–76).

Call sites at this tip:

- `tools/test_all_animated_objects_live.js` line 179: `runSuite(..., "anim", ["live_animated_objects_scene"])` after `replaceOnce` on the `DEUS_Anim.js` hook.
- `tools/test_all_faction_menus.js` line 18 throws if `DEUS_FactionMenus` or `DEUS_Test` is missing or disabled; line 24 calls `runSuite` for `faction_menus` with the eleven menu screenshots.
- `tools/test_light_wall_occlusion_live.js` lines 141 and 147: `replaceOnce` into `DEUS_Test.js`, then `runSuite` for the closed-door and open-doorway shots.
- `tools/test_standard_4d_ingame.js` lines 129 and 135: `replaceOnce` into `DEUS_Test.js`, then `runSuite` for the two elf-male shots.
- `tools/test_standard_8d_ingame.js` lines 222 and 228: `replaceOnce` into `DEUS_Test.js`, then `runSuite` for the normal, closeup, and wide shots.

`$UF_Elf_*` strings remain inside the 4D and 8D showcase payloads. Those are charset image names. Lane-co's `e12e9e72` diff did not retarget them, and they are not `plugins/UF_*.js` requires.

`git diff --stat df81ba68016173ee106ba88255fc3cf7e5078640 HEAD` for the other eleven Rule-4 harnesses (the ten remaining `tools/test_*.js` files plus `tools/ops/pm_launch/test_top_models_effort.ps1`) is empty.

## Lane-co guard

Command: `node tools/test_no_loadscript_shims.js`. Exit 0.

```text
DEFERRED tools/test_time_domains_proof.js:38 ../game/js/plugins/UF_World.js (L3/lane-cp)
RESULT: PASS; 41 required archives; 2 protected plugins; 0 violations; 1 L3 deferrals
```

The recorded deferral is the L3/lane-cp exception the guard prints on a clean run. Violation count is 0.

## Quality gates

Run in this worktree at the reviewed tip.

| Command | Exit | Observed |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_control_board.js` | 0 | `CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)` |
| `node tools/test_palette.js` | 0 | `Palette loaded successfully` |
| `node tools/governance/test_check_claims.js` | 0 | `RESULT: 279 passed, 0 failed` |

`test_control_board.js` recorded 15 active task branches and 16 reference branches.

## Control board equality with origin/main

Command:

```text
git diff origin/main..HEAD -- docs/STATUS.md tools/ops/active_lanes.json
```

Empty. `git diff --numstat` for the same range is empty. Working tree versus `HEAD` for those two paths is also empty.

Blob ids, identical across `HEAD`, `origin/main` (`fbdd2bd946a0913adabd5a2df1c1ece55ffba74c`), and `git hash-object` of the working files:

| Path | Blob |
|---|---|
| `docs/STATUS.md` | `fffb24d83633d31d9f63fc323269bd3e16743b27` |
| `tools/ops/active_lanes.json` | `7e6dc165d8c92fea387660a16c691a68ab40b635` |

`docs/STATUS.md` is 27889 bytes with 0 CR bytes. `tools/ops/active_lanes.json` is 922 bytes with 0 CR bytes.

## Line endings and working copy

`git config --show-origin --get core.autocrlf` is `false` (`file:C:/Users/snewt/OneDrive/Desktop/UF/.git/config`).

`git diff --check` exited 0 and printed nothing.

Untracked launch prompts were present and were left untracked:

- `tasks/OPS.PRUNE.05/lane-ct/launches/20260930_173514_prompt.txt`
- `tasks/OPS.PRUNE.05/lane-ct/launches/20260930_codex_lane_ct.txt`
- `tasks/OPS.PRUNE.05/lane-ct/launches/20260930_review_prompt_3d51c91b.txt`
- `tasks/OPS.PRUNE.05/lane-ct/launches/20261001_023027_prompt.txt`
- `tasks/OPS.PRUNE.05/lane-ct/launches/20261001_031244_prompt.txt`
- `tasks/OPS.PRUNE.05/lane-ct/launches/20261001_031453_prompt.txt`

## Verdict

`87380985668da7ea4f34a4650628c68910555184` contains the five-file resolution from `f40d70c4` unchanged. Each resolved harness keeps lane-co's `DEUS_*` plugin path and lane-ct's Rule-4 checks (`runMain`, `checkChild`, `replaceOnce`, `verifyArtifacts`, `runSuite`). `node tools/test_no_loadscript_shims.js` exited 0 with 0 violations. The four quality gates exited 0 with the outputs above. `docs/STATUS.md` and `tools/ops/active_lanes.json` are byte-for-byte identical to `origin/main` at `fbdd2bd946a0913adabd5a2df1c1ece55ffba74c`.

VERDICT: CLEAN PASS
