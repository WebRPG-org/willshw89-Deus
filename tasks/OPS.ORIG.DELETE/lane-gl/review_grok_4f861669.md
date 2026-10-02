# Independent review: OPS.ORIG.DELETE / lane-gl

## Metadata

| Field | Value |
| --- | --- |
| Writer | Codex |
| Reviewer | Grok |
| Target SHA | `4f861669d060ab9e8648280aa866b2e67cfd685b` |
| Branch | `task/lane-gl` |
| Parent | `4d416fc98cb13500042b54b041e1e6e939d5a971` (opening `[pm]` commit) |
| Task | OPS.ORIG.DELETE (DEC-061; re-cut of lane-gi) |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-gl` |

`git rev-parse HEAD` at review start: `4f861669d060ab9e8648280aa866b2e67cfd685b`. Subject: `[codex] OPS.ORIG.DELETE remove stale checks and strengthen guard`. Author: `deus-codex`. Pushed: `origin/task/lane-gl` matched this SHA. Uncommitted paths were `tasks/OPS.ORIG.DELETE/lane-gl/grok_review_prompt.txt` and `tasks/OPS.ORIG.DELETE/lane-gl/launches/` only.

## Scope

`git diff --name-status 4d416fc9 4f861669`:

| Status | Path |
| --- | --- |
| A | `tasks/OPS.ORIG.DELETE/lane-gl/guard_mutations.js` |
| A | `tasks/OPS.ORIG.DELETE/lane-gl/runtime_stubs.js` |
| M | `tools/build_interactive_walker_html.js` |
| M | `tools/export_u7_style_dataset.js` |
| M | `tools/test_all_object_charsets.js` |
| M | `tools/test_no_originality_check.js` |
| M | `tools/verify_all_42_male_charsets.js` |
| M | `tools/verify_all_6_male_variations.js` |
| M | `tools/verify_batch4_assets.js` |
| M | `tools/verify_batch6_assets.js` |
| M | `tools/verify_human_male_suite.js` |
| M | `tools/verify_nature_and_cursors.js` |

12 files, 239 insertions, 81 deletions. Every path is inside `lane.json` `allowedPaths`. Docs, mail, `AUDIT_LOG`, and `OWNER_DECISIONS` are absent. `tools/originality_check.js`, `tools/check_furniture_originality.js`, `tools/test_object_originality.js`, and `docs/systems/ORIGINALITY_CHECK.md` are absent from the tree and from git. `tools/ops/quarantine.json` has no `originality_check`, `check_furniture_originality`, `test_object_originality`, or `originality_index`.

## Brief items 1–9 at this SHA

1. `tools/verify_nature_and_cursors.js`: section 2 (`VERIFYING ORIGINALITY ON FACE SHEETS` and the unbound `out`) is gone. Remaining sections are numbered 1–3. `node tasks/OPS.ORIG.DELETE/lane-gl/runtime_stubs.js` stubs `child_process.execSync` to `'FILE PASS'` and reaches `ALL CHECKS COMPLETED!` with 21 art-check calls and no `FAIL:` line.
2. `tools/verify_all_42_male_charsets.js`: `if (orig !== 'PASS')` and `U7 Orig: PASS` are gone; unused `child_process` import is gone. The same stub file fakes `fs` + `png_read` and reaches `AUDIT SUMMARY: 42 / 42 Charsets PASSED` with exit 0.
3. `tools/verify_batch6_assets.js`: both empty `try { passed++; } catch` blocks are gone. `passed` now increments only on a successful `art_check`.
4. `tools/verify_batch4_assets.js`: `origFailCount` and `originality FAILs = ...` are gone. Summary is `art_check FAILs = ${artFailCount}`; exit 1 depends on `artFailCount` only.
5. `tools/verify_all_6_male_variations.js`: `// Originality check`, `origResult = 'NOT RUN'`, and `U7 originality: ${origResult}` are gone.
6. `tools/test_all_object_charsets.js`: `origPass` / `origFail` and the `origFail > 0` exit branch are gone. Totals printed are the two art-check lines only.
7. `tools/build_interactive_walker_html.js`: `Originality Verification` heading and `// removed check` are gone. Spec grid is `md:grid-cols-2`.
8. `tools/export_u7_style_dataset.js`: the shipping bullet continues as `or near-copy of a source image.` with no check reference.
9. `tools/process_batch2_plants.js` (unchanged from `4d416fc9`): no `// removed check`, `origRes`, `origResult`, or Originality log text.

`tools/verify_human_male_suite.js` also drops the `U7 ORIGINALITY: PASS` badge. That file is on the allowlist.

## Guard (item 10)

`tools/test_no_originality_check.js` now scans every `tools/**/*.js` except itself for the removed tool names, `originalit` (with the `tools/art/induct_batch_10.js` exemption), the identifier list, `U7 Orig`, `RESULT PASS`/`FILE PASS` stubs, `.png` as the `execSync`/`execFileSync` command, empty `try { passed++; } catch`, and the unfinished export bullet. A failed `git merge-base` / `git diff` is a failed guard (`execFileSync`, no shell interpolation).

`node tasks/OPS.ORIG.DELETE/lane-gl/guard_mutations.js` exited 0. Quoted lines:

```
PASS MUTANT opening commit: exit=1; FAIL: tools/verify_nature_and_cursors.js contains removed-check wording | FAIL: tools/verify_all_42_male_charsets.js claims U7 Orig | FAIL: tools/verify_batch6_assets.js counts an empty check as PASS | FAIL: tools/verify_batch4_assets.js contains removed-check wording | FAIL: tools/verify_all_6_male_variations.js contains removed-check wording | FAIL: tools/test_all_object_charsets.js contains removed-check identifier | FAIL: tools/build_interactive_walker_html.js contains removed-check wording | FAIL: tools/export_u7_style_dataset.js has an unfinished shipping rule
PASS MUTANT removed tool: exit=1; FAIL: tools/test_all_object_charsets.js references originality_check
PASS MUTANT furniture tool: exit=1; FAIL: tools/test_all_object_charsets.js references check_furniture_originality
PASS MUTANT object test: exit=1; FAIL: tools/test_all_object_charsets.js references test_object_originality
PASS MUTANT index: exit=1; FAIL: tools/test_all_object_charsets.js references originality_index
PASS MUTANT word fragment: exit=1; FAIL: tools/test_all_object_charsets.js contains removed-check wording
PASS MUTANT ORIG_CHECK: exit=1; FAIL: tools/test_all_object_charsets.js contains removed-check identifier
PASS MUTANT origFail: exit=1; FAIL: tools/test_all_object_charsets.js contains removed-check identifier
PASS MUTANT origPass: exit=1; FAIL: tools/test_all_object_charsets.js contains removed-check identifier
PASS MUTANT origFailCount: exit=1; FAIL: tools/test_all_object_charsets.js contains removed-check identifier
PASS MUTANT origResult: exit=1; FAIL: tools/test_all_object_charsets.js contains removed-check identifier
PASS MUTANT origRes: exit=1; FAIL: tools/test_all_object_charsets.js contains removed-check identifier
PASS MUTANT U7 Orig: exit=1; FAIL: tools/test_all_object_charsets.js claims U7 Orig
PASS MUTANT stub: exit=1; FAIL: tools/test_all_object_charsets.js contains RESULT PASS stub
PASS MUTANT empty pass: exit=1; FAIL: tools/test_all_object_charsets.js counts an empty check as PASS
PASS MUTANT png execSync: exit=1; FAIL: tools/test_all_object_charsets.js executes a .png file
PASS MUTANT png execFileSync: exit=1; FAIL: tools/test_all_object_charsets.js executes a .png file
PASS MUTANT git merge-base failure: exit=1; FAIL: Could not check changed files syntax via git diff: named git merge-base mutant
```

The opening-commit overlay uses the new guard against `4d416fc9` contents of the files this commit changed. That overlay catches brief items 1–8.

## Blockers

### B1 — Gate test red: `originalit` remains under `tools/`

`node tools/test_no_originality_check.js` at `4f861669d060ab9e8648280aa866b2e67cfd685b` exited 1. Quoted output:

```
FAIL: tools/build_all_42_charsets_widget.js contains removed-check wording
FAIL: tools/build_all_42_charsets_widget.js claims U7 Orig
FAIL: tools/build_batch1_showcase.js contains removed-check wording
FAIL: tools/build_batch2_items_showcase.js contains removed-check wording
FAIL: tools/build_batch3_items_showcase.js contains removed-check wording
FAIL: tools/build_batch4_items_showcase.js contains removed-check wording
FAIL: tools/build_batch5_items_showcase.js contains removed-check wording
FAIL: tools/build_batch6_items_showcase.js contains removed-check wording
FAIL: tools/build_female_42_charsets_widget.js contains removed-check wording
FAIL: tools/build_female_42_charsets_widget.js claims U7 Orig
FAIL: tools/build_ff5_architecture_showcase.js contains removed-check wording
FAIL: tools/build_generator_prompts.js contains removed-check wording
FAIL: tools/build_human_male_showcase_widget.js contains removed-check wording
FAIL: tools/build_human_male_showcase_widget.js claims U7 Orig
FAIL: tools/build_ingame_widget.js contains removed-check wording
FAIL: tools/build_log_showcase.js contains removed-check wording
FAIL: tools/build_male_variations_widget.js contains removed-check wording
FAIL: tools/build_male_variations_widget.js claims U7 Orig
FAIL: tools/build_master_showcase.js contains removed-check wording
FAIL: tools/build_self_contained_showcase.js contains removed-check wording
FAIL: tools/build_serious_chibi_comparison.js contains removed-check wording
FAIL: tools/classify_tests.js contains removed-check wording
FAIL: tools/process_camp_assets.js contains removed-check wording
FAIL: tools/verify_all_42_dwarf_male_charsets.js contains removed-check wording
```

24 FAIL lines, 20 files. Brief item 10 requires the word `originalit` (case-insensitive) to fail the guard in any `tools/**/*.js` except this test and `tools/art/induct_batch_10.js`. The writer implemented that scan. Those 20 files are outside `allowedPaths`, so this tip cannot make the gate green. The next writer pass needs those strings gone (PM expands the allowlist to cover them) and `node tools/test_no_originality_check.js` exiting 0.

### B2 — In-allowlist leftover `// removed check`

`tools/verify_batch3_assets.js:7` and `tools/verify_biome_assets.js:7` still read `// removed check`. Both files are on the allowlist and already sat in that state at `4d416fc9`. The same stub comment was item 7 on the walker. The `originalit` scan does not see it. Delete both lines.

## Tests run at this SHA

| Command | Exit | Observed |
| --- | --- | --- |
| `node tools/test_no_originality_check.js` | 1 | 24 FAIL lines above |
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node tasks/OPS.ORIG.DELETE/lane-gl/runtime_stubs.js` | 0 | `PASS nature/cursor stub: 21 art-check calls, completion reached`; `PASS male charset stub: 42/42 sidecar path reached, exit 0` |
| `node tasks/OPS.ORIG.DELETE/lane-gl/guard_mutations.js` | 0 | 18 named mutants killed, including opening commit and git merge-base failure |
| `node tools/test_object_art.js` | 1 | `Art Check Results: PASS = 61 / 67, FAIL = 26` |
| `node tools/test_all_object_charsets.js` | 1 | `Character Sheets Art Check:   61/67 PASS, 26 FAIL`; `Master Icons Art Check:       0/67 PASS, 87 FAIL` |

`tools/test_object_art.js` is unchanged from `4d416fc9` to this tip. `tools/test_all_object_charsets.js` only dropped the originality counters; the art-check loops are the same. Tip counts match the brief's opening-commit quotes (`PASS = 61 / 67, FAIL = 26` and `Character Sheets Art Check: 61/67 PASS, 26 FAIL`, `Master Icons Art Check: 0/67 PASS, 87 FAIL`).

## Required next pass

1. Delete `// removed check` in `tools/verify_batch3_assets.js` and `tools/verify_biome_assets.js`.
2. Clear `originalit` / `U7 Orig` from the 20 files listed in B1 (allowlist expansion required for those paths).
3. Re-run `node tools/test_no_originality_check.js` to exit 0, keep the named mutants, and keep the object-art counts no worse than the quotes above.

VERDICT: REJECT
