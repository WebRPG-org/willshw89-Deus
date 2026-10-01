# WG.00.44 lane-db independent review

- Reviewer: grok (family grok)
- Writer: codex (family codex)
- Date: 2026-10-01
- Branch: `task/lane-db`
- Worktree: `C:\Users\snewt\.deus_worktrees\lane-db`
- Reviewed commit: `12e28ee6d12f1fe7b3c012b0fcefbd3d9794658b`
- Reviewed parent: `c50fddfad4714d51b6cb0181ea0cd2d675bf556a`
- Restored scanner commit: `06ccf8ceb72dec04f377aa25849518be338585d3` (code `7cc12f1f45c83fd279acb55a98a2e2f7b69eab3a`, prior review `d7cef0d4`)
- Lane base: `7f91efbbfb7d21a99bfaef7cbcede6a87d53bf0d`
- Directive: MSG-PRUNE-PM-116 item 1; Owner ruling 2026-10-01, "Ship reviewed scanner"
- Manifest: `tasks/WG.00.44/lane-db/lane.json`
- Node for this review's runs: v24.19.0
- No art generated, requested, or integrated (DEC-007). Engine core (`game/js/rmmz_*.js`, `game/js/main.js`, `game/js/libs/`) was not edited.

## 1. Start state

HEAD at review start was `12e28ee6d12f1fe7b3c012b0fcefbd3d9794658b`. `git status` showed no tracked uncommitted diff. Three untracked launch prompts were left unstaged and are not part of the reviewed commit or this review commit:

- `tasks/WG.00.44/lane-db/launches/20261001_083414_prompt.txt` (the earlier review of `06ccf8ce`)
- `tasks/WG.00.44/lane-db/launches/20261001_101357_prompt.txt` (the AST fix-round assignment, superseded by the Owner ruling)
- `tasks/WG.00.44/lane-db/launches/20261001_133045_prompt.txt` (this review)

`tasks/WG.00.44/lane-db/BRIEF.md` was re-read before the checks below. The ruling to review against is the one the writer prompt records: restore the scanner Grok already passed, keep the AST attempt in history, and treat the two answerability MERGE NO items as accepted residuals.

## 2. Restored scanner

`git rev-parse` blob ids are identical at `06ccf8ce`, `7cc12f1f`, and `12e28ee6` for:

| Path | Blob |
|---|---|
| `tools/lib/vm_harness_scan.js` | `1fbc13274c4571a2f6d7f869665a9fe10bc1fea8` |
| `tools/test_sim_loader.js` | `e495664c7712a529357db705bd5fb305e4b5a6ea` |
| `tools/bench_history_demographics.js` | `157231e58b81afcfb603b312ade4a010984beeb8` |
| `tools/lib/vm_sim_require.js` | `839287d4b5f18d32bf05d71c89075243862047c7` |
| `game/js/plugins/DEUS_World.js` | `80d1bbf503c309a111c21be810a59329b66bdf2b` |

`git diff 06ccf8ce 12e28ee6 --` those five paths is empty. The AST rewrite in `96e12464` and the evidence commit `ecaea43e` remain in history. They are not the active scanner, loader test, or demographics benchmark.

`tools/bench_history_demographics.js` again requires `./lib/vm_sim_require` and passes `simHook.install({})` as the `compileFunction` context extension. That file hashes `DEUS_World.js`. The restored scan still counts it. The brief's rule counts that kind of mention, and the Owner ruling restores this reviewed hook rather than the later exclusion.

Read of the restored scanner and hook check:

- `classify` tokenizes source, looks for a vm context, and names a hit when a target plugin (`DEUS_World`, `DEUS_WorldGen`, `DEUS_Levels`, `DEUS_Fluid`) is referenced and the reference is not slice-only. `onlySliced` treats a use as sliced when it is the receiver of `.slice`, `.substring`, `.substr`, `.match`, or `.exec`. A chained call that still yields the whole file, including `.slice(0)`, stays on that sliced path. Template literals are tokenized, and a `DEUS_${...}` prefix can mark a module-name list; a whole load wrapped only as a template the classifier does not follow is not a hit. Those are the two scan gaps the Known gaps section records.
- `installsHook` in `tools/test_sim_loader.js` returns true when tokenized source binds `require` of `vm_sim_require` and that binding has a `.install(` call. It does not execute the harness or prove that `install` ran on the sandbox that later evaluates the plugin. That is the second accepted residual.

This worktree scan (`node tools/lib/vm_harness_scan.js`) printed `49 hits in 937 files`. The 49 paths are the harnesses in `lane.json` `allowedPaths` that load a target plugin, plus `tools/test_sim_loader.js` and `tools/bench_history_demographics.js`. `tools/sim/test_units.js` is absent. The four World-double harnesses are absent. `tools/test_area_generation_speed.js` is absent; lane-dc has not merged, so the one-file handoff is not due.

Committed scan JSON, parsed in this session:

| File | scanned | hits |
|---|---:|---:|
| `evidence/reviewed_scanner_restore/scan_tip.json` | 937 | 49 |
| `evidence/reviewed_scanner_restore/scan_base.json` | 934 | 48 |
| `evidence/reviewed_scanner_restore/scan_base_with_test.json` | 937 | 49 |

The report's measured counts match this scan and those files. The raw base is 48 because `tools/test_sim_loader.js` does not exist there. Overlaying the test brings the 49th hit. The base-overlay hook failure in the writer's log lists 48 files missing install text; the overlaid test supplies the 49th match.

## 3. Docs and report

`git diff 06ccf8ce 12e28ee6 -- docs/systems/DEUS_World.md` is only the appended section "Known gaps (Owner ruling 2026-10-01)". It names MSG-PRUNE-PM-116 item 1, the restore from `06ccf8ce` (code `7cc12f1f`), and the two accepted residuals: template-wrapped or chained-slice whole loads are not counted, and the hook check looks for an install in source rather than proving install-on-the-evaluating-sandbox before evaluation. It says the AST attempt remains in history. That matches the ruling and the code read above.

`tasks/WG.00.44/lane-db/REPORT.md` at this commit records writer Codex, the same authorization, candidate `a018ccb53cfc0d3f0ddd1103ad13096ed80ed232`, the six fresh-clone gate results, the 49/937 and 48/934 counts, the withdrawn clean-diff claim, and a `GAME TRANSLATION` block (Class C). `lane.json` is unchanged from `7f91efbb` and from `ecaea43e`. Its `writer` field is still `claude`. The writer assignment forbade editing the manifest; the Owner assignment is what authorizes Codex for this restoration. The field mismatch is recorded in the report and is not a scanner defect.

`git diff a018ccb53cfc0d3f0ddd1103ad13096ed80ed232 12e28ee6` changes only `REPORT.md`, `RESTORE_REVIEWED.md`, and files under `evidence/reviewed_scanner_restore/`. `game/`, `tools/`, and `docs/systems/DEUS_World.md` are identical between that tested candidate and this commit. The candidate is a real commit (`git cat-file -t` is `commit`).

`git diff --check`, `git diff --cached --check`, and `git diff 7f91efbb --check` each exit 0 at this tip. The trailing whitespace that the prior review found in `evidence/harness_base_vs_tip.txt` is gone. That file is unchanged from `ecaea43e` (`git diff --stat` against that commit is empty). `git diff --check 06ccf8ce 12e28ee6 -- tasks/WG.00.44/lane-db/evidence/harness_base_vs_tip.txt` exits 0.

## 4. Scope

`12e28ee6` changes 18 paths: `docs/systems/DEUS_World.md`, the three restored tools, and files under `tasks/WG.00.44/lane-db/`. Each is in `lane.json` `allowedPaths`.

`git diff --name-only 7f91efbb 12e28ee6` is `game/js/plugins/DEUS_World.js`, `docs/systems/DEUS_World.md`, the hooked harnesses and the two new tools libraries, and `tasks/WG.00.44/lane-db/**`. Each path is in `allowedPaths`. `tools/sim/test_units.js` is not in the diff. `tools/test_area_generation_speed.js` is not in the diff. `game/js/plugins.js` and `game/data/*.json` are not in the diff.

## 5. Gate commands in this worktree

Run on the worktree at `12e28ee6d12f1fe7b3c012b0fcefbd3d9794658b`, foreground, Node v24.19.0. The tree stayed free of tracked changes after the runs.

| Command | Exit | Observed result |
|---|---:|---|
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_sim_loader.js` | 0 | `RESULT: 7 passed, 0 failed` |
| `node tools/test_32_levels_generation.js` | 0 | `Results: 9 passed, 0 failed.` |
| `node tools/test_geology_strata.js` | 0 | `RESULT: 10 passed, 0 failed (exit 0)` |
| `node tools/test_new_game_year0.js` | 0 | `SETUP CONTRACT PASSED: 30 gating checks, 15 mutants caught` |
| `node tools/sim/test_units.js` | 0 | `RESULT: 7 passed, 0 failed` |

`test_sim_loader.js` in this worktree (trimmed):

```text
PASS every_vm_harness_installs_hook - 49 hits in 937 files; without the hook: none; planted harness found by the scan: true, refused: true; hooked fixture accepted: true
PASS scan_finds_known_harnesses - 49 hits; known hits missing: none; excluded files found: none; fixtures classified wrong: none
PASS nwjs_loader - run_tests exit 0; 5 sim_loader PASS lines; no FAIL/ERROR lines; log: 2026-10-01T18:34:43.611Z [SIM] UF.Sim.require("ledger") resolved C:\Users\snewt\AppData\Local\Temp\wg0044-nw-pGkWZu\game\js\sim\ledger.js; expected C:\Users\snewt\AppData\Local\Temp\wg0044-nw-pGkWZu\game\js\sim\ledger.js
RESULT: 7 passed, 0 failed
```

The other four headless checks in that same run also passed (`vm_loader_loads_ledger`, `missing_module_throws`, `opener_registry`, `grid_pinned_by_hook`), with the same detail shape as the writer's fresh-clone log.

Writer fresh-clone evidence, read in this session from `evidence/reviewed_scanner_restore/gates.txt` and `summary.json`: six separate shared clones, detached `a018ccb53cfc0d3f0ddd1103ad13096ed80ed232`, `core.autocrlf=false`, `core.eol=lf`, `core.safecrlf=false`, 900-second timeout, Node v24.19.0. Each manifest command exited 0. Because `game/`, `tools/`, and `docs/systems/DEUS_World.md` match this commit, that log is evidence for the same inputs this review executed.

## 6. Mutants

Same worktree, headless `--only` set, so `nwjs_loader` did not run. Each process exited 1. The other five headless checks passed.

| Mutant | Exit | Check that failed | Observed detail |
|---|---:|---|---|
| `return_null_on_missing` | 1 | `missing_module_throws` | `returned null instead of throwing` |
| `fixed_list_scan` | 1 | `every_vm_harness_installs_hook` | `10 hits in 10 files; planted harness found by the scan: false` |
| `unpinned_grid` | 1 | `grid_pinned_by_hook` | fallback-3 fixture `{} -> 3x3`; real `DEUS_World.js` stayed `1x1` |

The writer's `gates.txt` records the same three named failures, plus a base overlay at `7f91efbb` (test, scanner, and hook only) that exited 1 with 2 passed and 4 failed: loader, missing-module, every-harness-hook, and opener-registry. This review read that log and did not repeat the base clone. The five checks the brief says fail without `UF.Sim` and the harness hooks are the ones that failed there; `nwjs_loader` was outside that headless `--only` run. `scan_finds_known_harnesses` and `grid_pinned_by_hook` passed on the overlay, which is what the prior review of this same test code also saw.

## 7. NW.js proof

This review's worktree `nwjs_loader` passed. The log line names the snapshot path the check expected:

```text
2026-10-01T18:34:43.611Z [SIM] UF.Sim.require("ledger") resolved C:\Users\snewt\AppData\Local\Temp\wg0044-nw-pGkWZu\game\js\sim\ledger.js
```

Writer evidence, opened and read in this session:

- `evidence/reviewed_scanner_restore/nwjs/snapshot_path.txt` is `C:\Users\snewt\AppData\Local\Temp\wg0044-nw-n8AiKH`.
- `nwjs/game_runtime.log` contains `2026-10-01T18:06:38.250Z [SIM] UF.Sim.require("ledger") resolved C:\Users\snewt\AppData\Local\Temp\wg0044-nw-n8AiKH\game\js\sim\ledger.js`.
- `nwjs/test_output/results.txt`: five `sim_loader` PASS lines (`uf_sim_present`, `ledger_resolved_from_game_folder`, `ledger_loaded`, `missing_module_throws`, `no_console_errors`) and `RESULT: 5 passed, 0 failed (exit 0)`.
- Screenshot `nwjs/test_output/sim_loader.map.png`, opened: a grass field, rows of colonists with green bars, a red banner with a gold emblem near the middle of the crowd, trees and a rock, the level control reading "Ground", "1x Speed", a zoom panel at "1.0x" with "Normal" selected, a dark minimap reading "Explored: 3% (1793 cells)", and the bottom letter toolbar. The picture shows the snapshot reached the map. The loader proof is the log line above.

Editor Playtest F5 was not run. The brief's Class C check is the NW.js `--uf-test` line. That line was observed in this review and in the committed writer log.

## 8. Notes

No blocking findings.

1. The two scanner gaps in the Known gaps section are still present, because this commit restores the reviewed scanner. The Owner ruling accepts them. The AST attempt is history only.
2. `lane.json` still names writer `claude`. This restoration's writer is Codex under the Owner assignment, and the manifest was left unchanged on purpose. Reviewer and writer for `12e28ee6` are different families.
3. `git diff --check` against the lane base is clean at this tip. The report keeps the earlier clean-diff claim withdrawn.
4. Combined runs with lane-dc and lane-do remain the PM's, as the brief says. This review does not certify a merge.

## 9. Conclusion

`12e28ee6d12f1fe7b3c012b0fcefbd3d9794658b` restores `tools/lib/vm_harness_scan.js`, `tools/test_sim_loader.js`, and `tools/bench_history_demographics.js` byte-for-byte from `06ccf8ce` (code `7cc12f1f`). `docs/systems/DEUS_World.md` is that same text plus the Owner-accepted residuals. The report's 49-hit count matches a scan run in this worktree, the fresh-clone gate log matches the six commands, and the translation block is present. All six `lane.json` gate commands passed in this worktree. Each of the three named mutants turned only its named check red and exited 1.

VERDICT: CLEAN PASS
