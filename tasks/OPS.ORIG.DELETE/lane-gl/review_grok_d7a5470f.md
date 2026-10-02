# Independent review: OPS.ORIG.DELETE / lane-gl

## Metadata

| Field | Value |
| --- | --- |
| Writer | Codex |
| Reviewer | Grok |
| Target SHA | `d7a5470f33ff3b7c229f20a16b72129be05b803c` |
| Branch | `task/lane-gl` |
| Parent | `b349bb76e846834a0713a3b08f75eec3d0c34a4e` (`[pm]` allowlist expansion and brief clarification) |
| Task | OPS.ORIG.DELETE (DEC-061; re-cut of lane-gi) |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-gl` |

`git rev-parse HEAD` at review start: `d7a5470f33ff3b7c229f20a16b72129be05b803c`. Subject: `[codex] OPS.ORIG.DELETE clear remaining removed-check claims`. Author: `deus-codex`. This review is of that commit. Untracked paths `tasks/OPS.ORIG.DELETE/lane-gl/grok_review_prompt.txt` and `tasks/OPS.ORIG.DELETE/lane-gl/launches/` are not in it.

History `origin/main..HEAD` at review start: `4d416fc9` PM opening, `4f861669` first writer pass, `b8e43cc0` the earlier rejection, `b349bb76` PM scope, `d7a5470f` this pass.

## 1. B1 and B2 are closed

`node tools/test_no_originality_check.js` in this worktree:

```
PASS: No originality checks found.
EXIT:0
```

`git grep -n -i originalit -- tools` lists only the guard and the exempt catalogue field:

```
tools/art/induct_batch_10.js:123:          originalityDistance: null,
tools/test_no_originality_check.js:17:    'tools/originality_check.js',
tools/test_no_originality_check.js:18:    'tools/check_furniture_originality.js',
tools/test_no_originality_check.js:19:    'tools/test_object_originality.js',
tools/test_no_originality_check.js:20:    'docs/systems/ORIGINALITY_CHECK.md'
tools/test_no_originality_check.js:31:    assert(!qContent.includes('originality_check'), 'quarantine.json contains originality_check');
tools/test_no_originality_check.js:32:    assert(!qContent.includes('check_furniture_originality'), 'quarantine.json contains check_furniture_originality');
tools/test_no_originality_check.js:33:    assert(!qContent.includes('test_object_originality'), 'quarantine.json contains test_object_originality');
tools/test_no_originality_check.js:34:    assert(!qContent.includes('originality_index'), 'quarantine.json contains originality_index');
tools/test_no_originality_check.js:39:    'originality_check',
tools/test_no_originality_check.js:40:    'check_furniture_originality',
tools/test_no_originality_check.js:41:    'test_object_originality',
tools/test_no_originality_check.js:42:    'originality_index'
tools/test_no_originality_check.js:105:                assert(!lower.includes('originalit'), `${relative} contains removed-check wording`);
tools/test_no_originality_check.js:143:    console.log('PASS: No originality checks found.');
```

`git grep -n -e "// removed check" -- tools` prints nothing. `REMOVED_CHECK_EXIT:1`.

`git grep -n -e "U7 Orig" -e "ORIG_CHECK" -e "origFail" -e "origPass" -e "origResult" -- tools` hits only the guard's own detector:

```
tools/test_no_originality_check.js:44:const forbiddenIdentifiers = /\b(?:ORIG_CHECK|origFail|origPass|origFailCount|origResult|origRes)\b/;
tools/test_no_originality_check.js:108:            assert(!content.includes('U7 Orig'), `${relative} claims U7 Orig`);
```

The same search with `tools/test_no_originality_check.js` excluded prints nothing. `IDENT_OUTSIDE_GUARD_EXIT:1`. The 24 FAIL lines from the review of `4f861669` are gone. `tools/verify_batch3_assets.js` and `tools/verify_biome_assets.js` each lose only the `// removed check` line (`git diff b349bb76 HEAD` for those two paths).

## 2. Scope

`git merge-base origin/main HEAD` is `89b2af83de9566f3f6998da7d5aacef446821d2a` (unchanged after `git fetch origin`; `origin/main` is `29462469985c5fcf26d66ad4377012586d0e4854`).

`git diff --name-status 89b2af83de9566f3f6998da7d5aacef446821d2a HEAD`:

```
D	docs/systems/ORIGINALITY_CHECK.md
A	tasks/OPS.ORIG.DELETE/lane-gl/BRIEF.md
A	tasks/OPS.ORIG.DELETE/lane-gl/REPORT.md
A	tasks/OPS.ORIG.DELETE/lane-gl/guard_mutations.js
A	tasks/OPS.ORIG.DELETE/lane-gl/lane.json
A	tasks/OPS.ORIG.DELETE/lane-gl/review_grok_4f861669.md
A	tasks/OPS.ORIG.DELETE/lane-gl/runtime_stubs.js
M	tools/build_all_42_charsets_widget.js
M	tools/build_all_42_dwarf_male_showcase.js
M	tools/build_batch1_showcase.js
M	tools/build_batch2_items_showcase.js
M	tools/build_batch3_items_showcase.js
M	tools/build_batch4_items_showcase.js
M	tools/build_batch5_items_showcase.js
M	tools/build_batch6_items_showcase.js
M	tools/build_female_42_charsets_widget.js
M	tools/build_female_settler_walk.js
M	tools/build_ff5_architecture_showcase.js
M	tools/build_generator_prompts.js
M	tools/build_human_male_showcase_widget.js
M	tools/build_ingame_widget.js
M	tools/build_interactive_walker_html.js
M	tools/build_log_showcase.js
M	tools/build_male_variations_widget.js
M	tools/build_master_showcase.js
M	tools/build_self_contained_showcase.js
M	tools/build_serious_chibi_comparison.js
D	tools/check_furniture_originality.js
M	tools/classify_tests.js
M	tools/export_u7_style_dataset.js
M	tools/make_25d.js
M	tools/ops/quarantine.json
D	tools/originality_check.js
M	tools/process_batch2_plants.js
M	tools/process_camp_assets.js
M	tools/process_nano_banana_female_settler.js
M	tools/test_all_object_charsets.js
A	tools/test_no_originality_check.js
M	tools/test_object_art.js
D	tools/test_object_originality.js
M	tools/test_var2_suite.js
M	tools/test_var_suite.js
M	tools/verify_all_42_dwarf_male_charsets.js
M	tools/verify_all_42_female_charsets.js
M	tools/verify_all_42_male_charsets.js
M	tools/verify_all_6_male_variations.js
M	tools/verify_all_face_deliveries.js
M	tools/verify_batch3_assets.js
M	tools/verify_batch4_assets.js
M	tools/verify_batch6_assets.js
M	tools/verify_biome_assets.js
M	tools/verify_human_male_suite.js
M	tools/verify_nature_and_cursors.js
```

53 paths. A path-by-path compare against `lane.json` `allowedPaths` (the `tasks/OPS.ORIG.DELETE/lane-gl/**` glob included) printed `outside NONE`.

The 20 paths added in `b349bb76` are touched only by `d7a5470f` (`git log --format=%h origin/main..HEAD -- <file>` prints `d7a5470f` for each). `git diff b349bb76 HEAD` on those paths is claim removal and the values that existed only to feed the claim. No other line is reformatted.

| File | What the diff changes |
| --- | --- |
| `tools/build_all_42_charsets_widget.js` | Subtitle drops `U7 Originality: 42/42 PASS`. |
| `tools/build_batch1_showcase.js` | Three `dist` fields, the `ORIGINALITY: PASS (DIST …)` label, and `ORIGINALITY` in the footer. |
| `tools/build_batch2_items_showcase.js` | Same pattern, four `dist` fields. |
| `tools/build_batch3_items_showcase.js` | Same pattern, four `dist` fields. |
| `tools/build_batch4_items_showcase.js` | Same pattern, four `dist` fields. |
| `tools/build_batch5_items_showcase.js` | Same pattern, six `dist` fields. |
| `tools/build_batch6_items_showcase.js` | Same pattern, four `dist` fields. |
| `tools/build_female_42_charsets_widget.js` | Subtitle drops `U7 Originality: 42/42 PASS`. |
| `tools/build_ff5_architecture_showcase.js` | Footer drops `& ORIGINALITY CHECKS`. |
| `tools/build_generator_prompts.js` | Rule 12, the faces paragraph, the intro, and how-to step 4 lose the check claim. The never-trace / never-copy sentences stay, and each remains a complete sentence. |
| `tools/build_human_male_showcase_widget.js` | Subtitle drops `U7 Originality: PASS`. The `U7 ORIGINALITY: PASS` badge is deleted. |
| `tools/build_ingame_widget.js` | Drops `0 FAIL, 0 WARN on originality check.` |
| `tools/build_log_showcase.js` | Deletes two `ORIGINALITY: PASS (DIST …)` `drawText` calls and `AND ORIGINALITY` in the footer. Later labels keep their y positions. |
| `tools/build_male_variations_widget.js` | Deletes the `U7 Originality: 6/6 PASS` div. |
| `tools/build_master_showcase.js` | Deletes the Originality Check row. |
| `tools/build_self_contained_showcase.js` | Deletes the `U7 ORIGINALITY: PASS (>=0.28)` badge. |
| `tools/build_serious_chibi_comparison.js` | The combined line becomes `PALETTE CHECK: PASS`. |
| `tools/classify_tests.js` | Comment drops "originality checks". The art-pipeline test drops `file.includes("originality")`. |
| `tools/process_camp_assets.js` | Deletes the comment bullet that named the check. |
| `tools/verify_all_42_dwarf_male_charsets.js` | Deletes the comment bullet that named the check. |

`dist` is not read anywhere else in those showcase scripts; the property and the only template that used it go out together. In `classify_tests.js`, dropping `file.includes("originality")` is the step that classified scripts by that name. The deleted tools are gone. `test_no_originality_check.js` now matches the existing `file.startsWith("test_")` branch.

## 3. Brief items 1–9 at this SHA

1. `tools/verify_nature_and_cursors.js`: section 2 is `VERIFYING MENU THEMES & WINDOW SKINS`. Each `out` is declared inside its `for` loop. There is no `VERIFYING ORIGINALITY ON FACE SHEETS` heading. Ran `node tasks/OPS.ORIG.DELETE/lane-gl/runtime_stubs.js`, which evaluates the script with `child_process.execSync` stubbed to `'FILE PASS'` (not the live art files). Output: `PASS nature/cursor stub: 21 art-check calls, completion reached`. Exit 0. No `ReferenceError`.
2. `tools/verify_all_42_male_charsets.js`: no `orig` binding and no `U7 Orig` text. The pass log at line 113 is the dimension / color / alpha / grounding line. The same stub file fakes `fs` and `./png_read` and reaches the summary. Output: `PASS male charset stub: 42/42 sidecar path reached, exit 0`. Exit 0. No `ReferenceError`.
3. `tools/verify_batch6_assets.js`: both empty `try { passed++; } catch` blocks are gone. `passed++` is only after a successful `art_check` (lines 40 and 59). The summary is `Verification Summary: ${passed} PASS, ${failed} FAIL`.
4. `tools/verify_batch4_assets.js`: no `origFailCount`. Summary line 69 is `Summary: art_check FAILs = ${artFailCount}`. Exit 1 depends on `artFailCount` only.
5. `tools/verify_all_6_male_variations.js`: no `// Originality check`, no `origResult`, no `U7 originality` log. The per-variation log is line 82; the overall line is 85.
6. `tools/test_all_object_charsets.js`: counters are `sheetPass`, `sheetFail`, `iconPass`, `iconFail` only. No `origPass`, `origFail`, or `origFail > 0` exit. Printed totals are the two art-check lines.
7. `tools/build_interactive_walker_html.js`: no `Originality Verification` heading and no `// removed check`. The spec grid at line 137 is `md:grid-cols-2`. The heading at line 136 is `Technical Specs & Engine Verification`.
8. `tools/export_u7_style_dataset.js` lines 573–574 are a complete bullet with no check reference: `never a copy, trace, recolour, crop` / `or near-copy of a source image.`
9. `tools/process_batch2_plants.js`: `git grep -n -e "origRes" -e "Originality" -e "removed check" -- tools/process_batch2_plants.js` prints nothing. `PLANTS_EXIT:1`.

## 4. Guard

Clean tree: `node tools/test_no_originality_check.js` exited 0 (`PASS: No originality checks found.`), quoted in section 1.

`node tasks/OPS.ORIG.DELETE/lane-gl/guard_mutations.js` exited 0. 18 named mutants, each with guard exit 1:

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
EXIT:0
```

The opening-commit overlay still catches brief items 1–8. The failed-git mutant still fails the guard.

## 5. Syntax and object-art counts

| Command | Exit | Result line |
| --- | --- | --- |
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/test_object_art.js` | 1 | `Art Check Results: PASS = 61 / 67, FAIL = 26` |
| `node tools/test_all_object_charsets.js` | 1 | `Character Sheets Art Check:   61/67 PASS, 26 FAIL` and `Master Icons Art Check:       0/67 PASS, 87 FAIL` |

Those counts match the brief's opening-commit floor. The tip is no worse.

## 6. Gate tests in an LF clone

One clone of the common git dir, `git clone -c core.autocrlf=false -c core.eol=lf -c core.safecrlf=false --shared --no-checkout`, then the same three local configs, then `checkout --detach d7a5470f33ff3b7c229f20a16b72129be05b803c`. Quoted setup:

```
CHECKOUT_EXIT:0
CLONE_HEAD=d7a5470f33ff3b7c229f20a16b72129be05b803c
autocrlf=false
eol=lf
safecrlf=false
```

The manifest `gateTests` ran one at a time in that clone:

```
--- gate 1: node tools/check_deus_syntax.js ---
Checked 62 DEUS plugin files. Errors: 0
SYNTAX_EXIT:0
--- gate 2: node tools/test_no_originality_check.js ---
PASS: No originality checks found.
GUARD_EXIT:0
```

## 7. Merge with origin/main

`git fetch origin` then `git merge-tree --write-tree origin/main HEAD`:

```
FETCH_EXIT:0
69237532343ecfc2c98e47c376e3ddaf6f53d1bb
MERGE_TREE_EXIT:0
```

## Findings

No blocker, major, or minor findings.

VERDICT: CLEAN PASS
