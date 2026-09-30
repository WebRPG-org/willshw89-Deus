# Independent adversarial review: OPS.PRUNE.01 / lane-cq (pass 7)

## Metadata

| Field | Value |
|---|---|
| Writer | Gemini |
| Reviewer | Grok |
| Authority | DEC-034 independent cross-family review; `docs/CANONICAL_ROLES.md` (independent first verdict) |
| Prior verdict | `4a5fc62a10a313d371acf32e25c82313272d5979` — CLEAN PASS (`tasks/OPS.PRUNE.01/lane-cq/review_grok_4a5fc62a.md`, commit `67039942`) |
| Reviewed commit | `28278460c11e8fc48527e6c38f43a5b1d5d93013` |
| Branch | `task/lane-cq` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-cq` |
| Worktree HEAD at execution | `28278460c11e8fc48527e6c38f43a5b1d5d93013` |
| Merge-base with `origin/main` | `5fe51c14933edb31e391dd7d6049489a2ce0a631` |
| `origin/main` at execution | `e05e95797cbe1713e284d7af6c542b79276e2d36` |
| `origin/task/lane-cq` at execution | `28278460c11e8fc48527e6c38f43a5b1d5d93013` |
| Node | v24.19.0 |
| Executed | 2026-09-30 15:02 CT, in this worktree (not a fresh clone) |

HEAD is the reviewed commit. `git cat-file -t 28278460c11e8fc48527e6c38f43a5b1d5d93013` is `commit`. The worktree blob of `docs/STATUS.md` is `c81dc77c8c38b215e3e3585c7e096183f1d84320`, the same object as `HEAD:docs/STATUS.md`. The file is LF and ends with a newline. Untracked paths at execution, absent from the commit, were:

- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_135832_prompt.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_141239_prompt.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_142140_prompt.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_145210_prompt.txt`
- `tasks/OPS.PRUNE.01/lane-cq/launches/20260930_FIX_CQ_7_prompt.txt`

The gates do not read them.

## Commit

```text
HASH:    28278460c11e8fc48527e6c38f43a5b1d5d93013
SUBJECT: [gemini] OPS.PRUNE.01 FIX-CQ-7: section-bound board validation, active_lanes.json, and defect ledger update
AUTHOR:  deus-ops <deus-ops@local.invalid>
DATE:    2026-09-30 14:50:34 -0500
PARENT:  67039942eabb931a49d87373fcd0bf94da99c099
```

That commit's own diff is five paths, all on `lane.json` `allowedPaths`:

```text
 docs/STATUS.md                         |  52 ++++--
 docs/archive/STATUS_LEDGER_20260930.md |   2 +-
 tasks/OPS.PRUNE.01/lane-cq/lane.json   |   1 +
 tools/ops/active_lanes.json            |  35 +++++
 tools/test_control_board.js            | 279 +++++++++++++++++++++++----------
 5 files changed, 266 insertions(+), 103 deletions(-)
```

`lane.json` adds `tools/ops/active_lanes.json` to `allowedPaths`. `git diff --name-only origin/main...28278460c11e8fc48527e6c38f43a5b1d5d93013` is sixteen paths. Every path is inside `allowedPaths`. Zero edits to engine core (`rmmz_*.js`, `main.js`, `libs/**`). Zero edits under `art/` or catalogue trees. Zero edits to civilization or faction source.

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
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_373bb811.md` | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_45376e85.md` | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_4a5fc62a.md` | yes |
| `tasks/OPS.PRUNE.01/lane-cq/review_grok_8accbf07.md` | yes |
| `tools/ops/active_lanes.json` | yes |
| `tools/ops/gate_tests.json` | yes |
| `tools/test_control_board.js` | yes |

## Checks that hold

### Authority, Rule 14, section 3, section 4, ledger link

`docs/STATUS.md` line 5 is:

```text
**PM & Integration Authority:** Claude; **Coordinator / Proposer:** Gemini / Antigravity (DEC-042/DEC-048)
```

Line 16 names `DEUS_Core` and the role cell is `Foundation systems; Rule 14 time tags NOT IMPLEMENTED; see section 4; deterministic RNG, spatial queries, and engine hooks`.

Section 3 is split into `### A. Active Lanes in Review / In Flight` and `### B. Merged or Reference Branches`. An independent parser of those two tables, separate from the gate, produced the same sets as `tools/ops/active_lanes.json`:

- Subsection A, 18 branches, equal to `activeLanes`: `task/lane-cq`, `task/lane-co`, `task/lane-cr`, `task/lane-cs`, `task/lane-cs2`, `task/lane-cw`, `task/art-temperate-induction`, `task/lane-a`, `task/lane-bd`, `task/lane-bj`, `task/lane-bp`, `task/lane-ca`, `task/lane-ce`, `task/lane-cf`, `task/lane-cl`, `task/lane-e`, `task/lane-h`, `task/lane-pm-streamline`.
- Subsection B, 9 branches, equal to `referenceBranches`: `task/lane-b`, `task/lane-bb`, `task/lane-bt`, `task/lane-bu`, `task/lane-bv`, `task/lane-bw`, `task/lane-by`, `task/lane-bz`, `task/lane-cm`.

The required status cells are present:

- `task/lane-cq`: `Grok CLEAN PASS at 4a5fc62a; DEC-052 PARTIAL / PM MERGE HELD`. `4a5fc62a` is the prior tip. `review_grok_4a5fc62a.md` ends `VERDICT: CLEAN PASS`.
- `task/lane-bj`: `AUDIT DELIVERED / DEFECT EVIDENCE (d134315d)`. `d134315d` resolves.
- `task/lane-e`: `PAUSED at 05948e9c`. `05948e9c` resolves.

The three new CLEAN PASS citations also resolve, and each named review ends `VERDICT: CLEAN PASS`: `task/lane-cr` at `12d7b0d4` (`tasks/OPS.PRUNE.PACE/lane-cr/review_grok_12d7b0d4.md` on `task/lane-cr`), `task/lane-cs2` at `aa47b74f`, `task/lane-cw` at `28fe2614`. Each cited commit is an ancestor of that branch tip.

Section 4, lines 161–163:

```text
| `NAT.02.01` | `tasks/NAT.02.01/lane-bv` | kernel is a stub (no rubble, no ledger posting); review `fdb5c0a0` missed it | NOT DONE |
| `L8 loose files on main` | PM check 2026-09-30 | cited commit does not exist in any repo; AG records NOT DONE | UNPROVED / NOT DONE |
| Climate Hold Disposition | `tasks/NAT.05.01/lane-bw` | DEC-037 Natural World phase lock: climate deferred pending physical strata/hydrology gates | FROZEN / PENDING GATES |
```

The NAT.02.01 row is byte-identical to the same row on parent `67039942:docs/STATUS.md` (length 133). `tasks/NAT.02.01/lane-bv` exists in this worktree. The climate reference is the path `tasks/wbs_registry.json` already records for NAT.05.01. That directory is absent from this worktree.

`docs/archive/STATUS_LEDGER_20260930.md` line 6 changed from `](archive/STATUS_LEDGER_20260925.md)` to `](STATUS_LEDGER_20260925.md)`. From a file that already lives in `docs/archive/`, the new relative target is `docs/archive/STATUS_LEDGER_20260925.md`, and that file exists. The parent link's extra `archive/` segment is gone. The rest of the ledger diff is that one line.

### Gate execution

Commands run in `C:\Users\snewt\.deus_worktrees\lane-cq`. Exit codes are the process status. The happy path was run again at 15:02 CT after the mutant runs.

| Command | Exit | Observed |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_control_board.js` | 0 | `CONTROL BOARD VALIDATION: CLEAN PASS (0 errors)`. 42 enabled plugins, 11 companions, 18 active lanes, 9 reference branches, 51 archive rows. Same result at 15:02 CT |
| `--mutant=missing_live_plugin` | 1 | One failure. `Missing from Section 1: DEUS_Core` |
| `--mutant=misclassified_plugin` | 1 | One failure. `Missing from Section 1: DEUS_Core`. The mutant also appends a `DEUS_Core` row onto section 4 text. The live check still fails, so a section 4 mention does not satisfy section 1 |
| `--mutant=missing_archive_ruling` | 1 | `Missing ruling for: game/js/plugins/DEUS_Agriculture.js` |
| `--mutant=rogue_plugin_in_comment` | 1 | `Unauthorized files: DEUS_RogueScript.js` |
| `--mutant=archived_file_exists` | 1 | Count 52. `Still exists on disk: game/js/plugins/DEUS_Core.js` and `Missing from archive on disk: archive/plugins/DEUS_Core.js`. Total failures 2 |
| `--mutant=missing_in_archive` | 1 | Count 52. Only `Missing from archive on disk: archive/plugins/non_existent_fake_arch.js` |
| `--mutant=unlisted_plugin_in_dir` | 1 | `Unauthorized files: unauthorized_rogue_script.js` |
| `--mutant=missing_active_lane` | 1 | Count 19. `Missing from Section 3: task/lane-mutant-unlisted` |

`tools/ops/gate_tests.json` still lists `tools/test_control_board.js`.

Section binding on the happy path, counted by the same token extractor the gate uses: 105 files in `game/js/plugins/`. 42 are enabled. 12 companions are authorized only from section 1 (`DEUS_Bag`, `DEUS_Callings`, `DEUS_Conditions`, `DEUS_Containers`, `DEUS_DeathForensics`, `DEUS_Dnd5e`, `DEUS_Fluid`, `DEUS_HistoricalDemographics`, `DEUS_Minimap`, `DEUS_Select`, `DEUS_Stockpiles`, `UF_Households`). The other 51 are authorized only from section 2. Zero files are authorized only from section 5. Zero files are unauthorized. Section 5's match stops before `## Stand-ins` (`SEC5` does not contain that heading).

Empty discovery is fail-closed in the source. `enabledPlugins.length === 0` and `companionPlugins.length === 0` call `process.exit(1)` immediately (`tools/test_control_board.js` lines 138–140 and 176–178). `activeLanes.length === 0` records a failure at line 208, and any failure exits 1 at lines 354–357. Those three empty paths were not executed here; the run that exited 0 took the non-empty counts above.

An independent call of the comment stripper, using the function at lines 320–328, was given section 1 text plus `<!-- DEUS_RogueScript.js -->`. The token set did not contain `DEUS_RogueScript`. The same text with the stripper removed did contain it. Section 4 text is not passed to that extractor.

## Finding

### The stand-in reader list dropped two declaration bullets

`## Stand-ins` is present at `docs/STATUS.md:226`. The readers do not stop at the heading. Both consume every bullet under it, and both stop at the next `##` heading:

- `tools/generate_asset_inventory.js` lines 148–166. A backticked token on a bullet becomes a stand-in name or glob. Line 567 classes an unprefixed file as `U7 stand-in` only when `standinListed` hits. Line 566 still classes a `U7_` basename without the list.
- `tools/originality_check.js` lines 34–58. The same bullets feed the policy check. A basename matching `/^[!$]*u7_/i` is still caught without the list (lines 70–71). An unprefixed file is a declared stand-in only when the bullet list names it.

On `5fe51c14:docs/STATUS.md` and on `origin/main:docs/STATUS.md` the section has eight bullets. The first six bullets of `HEAD:docs/STATUS.md` are byte-identical to those six bullets once CR is stripped. The live file ends on the Ground bullet (line 233). These two bullets are absent.

The exact lines are `docs/archive/STATUS_LEDGER_20260930.md` lines 235 and 236. The first starts `UI still drawn in play:` and names `U7_Faces.png`, `u7_gump_*.png`, `gump_test.png`, `gump_backpack.png`, `gump_barrel.png`, and `gump_sack.png`. The second starts `UI and other extractions, unused:` and names `U7_Window.png`, `U7_Cursor.png`, `U7_Select.png`, `U7_Pointer.png`, `U7_HandPointer.png`, `u7_gumps/`, `gump_*.png`, `paperdoll_*.png`, `face_*.png`, `actor_*.png`, `monster_*.png`, and `test_shape*.png`. The ledger copy is intact. Neither reader opens the ledger. `STATUS_FILE` in both tools is `docs/STATUS.md`.

Parsed with the originality checker's first-field rule, the omitted bullets are the only source of these exact names: `faces/u7_faces`, `gump_test`, `gump_backpack`, `gump_barrel`, `gump_sack`, `system/u7_window`, `u7_cursor`, `u7_select`, `u7_pointer`, `u7_handpointer`. They are also the only source of these globs: `system/u7_gump_*`, `system/u7_gumps/*`, `gump_*`, `paperdoll_*`, `faces/face_*`, `actor_*`, `monster_*`, `test_shape*`.

355 PNGs under `game/img` match a declaration that exists only on those two bullets. 14 of them have a `U7_` basename, so the filename rule still classes them. 341 are tracked and unprefixed, so both readers lose them:

| Bucket | Files |
|---|---|
| `faces/` unprefixed, tracked | 241 |
| `system/` unprefixed, tracked | 81 |
| `characters/` unprefixed, tracked | 11 |
| `pictures/` unprefixed, tracked | 8 |
| `U7_` basename, tracked | 14 |

The four named unprefixed copies are on disk and tracked: `game/img/system/gump_backpack.png`, `gump_barrel.png`, `gump_sack.png`, `gump_test.png`. The heading's shorter form (`## Stand-ins` versus the parenthetical on main) still matches `/^##\s+Stand-ins/i`. The prose paragraphs above the bullets are also absent; those paragraphs are not bullets, so the readers skip them. The missing `## Backlog` heading does not cut the list short: on main that heading comes after the eighth bullet, and on this file the two bullets are simply not there.

The control-board gate does not read `## Stand-ins`. Its clean pass does not see this hole.

## Notes that do not carry the verdict

- `rogue_plugin_in_comment` exits 1 and prints `Unauthorized files: DEUS_RogueScript.js`. The comment is appended to `statusText` at lines 122–124, after the section slices at lines 103–107, so the stripper never sees it. The failure is the injected filename, the same shape as `unlisted_plugin_in_dir`. Deleting the stripper would leave this mutant red. The stripper itself holds: a comment placed inside section 1 does not authorize `DEUS_RogueScript`, and the same text authorizes it if the strip is removed.
- `archived_file_exists` fails two checks. The injected archive path `archive/plugins/DEUS_Core.js` is not on disk, so the archive check fails beside `Still exists on disk: game/js/plugins/DEUS_Core.js`. The original-path predicate still fires. `missing_in_archive` isolates the archive check.
- `const authorizedPlugins` at lines 316–317 is never read. Authorization uses the section token sets and `enabledPlugins.includes`.
- The section 4 rows above are present and byte-checked. The gate parses `sec4Text` and does not assert those rows. Removing them would leave the happy path green.
- `referenceBranches` uses `|| []`. An omitted or empty key would pass the per-branch loop. The fail-closed count check is on `activeLanes` only. This file has 9 reference branches, and all 9 are in subsection B.
- Local `task/*` scanning is gone, which is the FIX-CQ-7 list design. At execution, `git branch --list task/*` returned 29 names. Two are outside the versioned list: `task/lane-cv` was created at 2026-09-30 14:54:47 -0500, after this commit, and `task/lane-cw2` was created at 2026-09-30 14:48:41 -0500, about two minutes before it. The gate cannot see either. The 27 names that are in `active_lanes.json` match section 3 exactly, with no A/B overlap.

## Final verdict

The syntax gate exits 0. The control-board happy path exits 0 with 0 errors, including on a repeat after the mutants. All eight named mutants exit 1 and print the predicates above. Line 5, line 16, the section 3 split, the three section 4 rows, and the ledger link match the FIX-CQ-7 text. The NAT.02.01 row is unchanged from the parent. The diff from the merge-base stays inside `lane.json` `allowedPaths`.

The stand-in reader does not. `## Stand-ins` is present, and the first six bullets match main. The two UI bullets the readers parse are absent from `docs/STATUS.md`. 341 tracked unprefixed images, including `gump_backpack.png`, `gump_barrel.png`, `gump_sack.png`, and `gump_test.png`, lose the declaration those tools use. The full bullets remain in the ledger, which those tools do not read.

VERDICT: FAIL
