# lane-gl: finish deleting the originality check, in code (DEC-061; re-cut of lane-gi)

| Field | Value |
|---|---|
| WBS | OPS.ORIG.DELETE |
| taskId (manifest) | OPS.ORIG.DELETE |
| Branch | `task/lane-gl` |
| Manifest | `tasks/OPS.ORIG.DELETE/lane-gl/lane.json` |
| Writer -> reviewer | codex -> grok |
| Dependencies | none |
| RMMZ editor must be closed | no |

Base: `main` at `89b2af83` or later.

## Why this lane exists

DEC-061 (Owner, 2026-10-01): "We can nix the originality check entirely. delete it off the planet." lane-gi (writer Gemini) took three review rounds and Grok rejected the last (`24bd46e4`, review file `review_grok_a49f4b09.md`). Its last commit also carried files that do not belong to the lane (mail, AUDIT_LOG, OWNER_DECISIONS), and its docs edits spliced one sentence into many old sentences, doubled it in places and put the old instruction back in twelve files.

The PM re-cut it (DEC-085, "bureaucracy that could be cut"):
- **This lane touches code only.** No docs sweep. A doc line that tells the reader to run a deleted tool is obsolete, and the PM adds one notice to the art standard saying so. The docs are out of scope; do not edit them.
- **The opening commit** (`[pm]`, by deus-pm) copies lane-gi's tool changes from `a49f4b09` onto main: the three tools and `docs/systems/ORIGINALITY_CHECK.md` deleted, the `tools/ops/quarantine.json` entries removed, the 22 changed pipeline scripts, and `tools/test_no_originality_check.js`. It does not carry any other file. You start from that state and fix what is left.

## What is still wrong (from Grok's reviews of b7e154a1 and a49f4b09; each item names the file and lines at `a49f4b09`)

Crashes (a section still uses a variable the edit deleted; `node --check` passes, the code throws):
1. `tools/verify_nature_and_cursors.js:40-44`: section 2 is still headed `VERIFYING ORIGINALITY ON FACE SHEETS`; the `out` it matches and tests is no longer defined (`out` in section 1 is block-scoped). Delete section 2.
2. `tools/verify_all_42_male_charsets.js:101`: `if (orig !== 'PASS')` with no `orig`. Line 122 still prints `U7 Orig: PASS`. Remove both.

A step that survives as a no-op or a hard-coded pass:
3. `tools/verify_batch6_assets.js:46-49` and `:73-76`: an empty `try` still does `passed++`, so each file counts a pass for nothing; the summary at line 83 counts those passes. Remove the step and fix the count.
4. `tools/verify_batch4_assets.js:40` and `:74-75`: `origFailCount` stays 0; the summary still prints `originality FAILs = ...`. Remove the variable, the summary text and the branch.
5. `tools/verify_all_6_male_variations.js:83-87`: the comment `// Originality check`, `origResult = 'NOT RUN'`, and the log line `U7 originality: ${origResult}`. Remove them.
6. `tools/test_all_object_charsets.js:14` and `:47`: `origPass` and `origFail` are never updated, and `origFail > 0` can no longer fail the process. Remove them. No originality total is printed.
7. `tools/build_interactive_walker_html.js:147-148`: the page still gets the heading `Originality Verification` and the text `// removed check`. Remove both.
8. `tools/export_u7_style_dataset.js:573-574`: the next readme string is `'  '`, so the bullet "never a copy, trace, recolour, crop" stops there. Restore that bullet as a complete sentence without any reference to the check.
9. `tools/process_batch2_plants.js`: check the whole file once for a leftover `// removed check`, an `origRes` or `origResult`, and any `Originality` log text.

The guard test:
10. `tools/test_no_originality_check.js` passed while 1-8 were in the tree. Make it fail on any of: a reference to `originality_check`, `check_furniture_originality`, `test_object_originality` or `originality_index`; the word `originalit` (case-insensitive) in any `tools/**/*.js` except this test and `tools/art/induct_batch_10.js` (its `originalityDistance: null` is inert catalogue metadata, left alone); the identifiers `ORIG_CHECK`, `origFail`, `origPass`, `origFailCount`, `origResult`, `origRes`; the strings `U7 Orig` and `RESULT PASS\nFILE PASS`; a call that executes a `.png` file (`execSync` or `execFileSync` with a path ending `.png`). It must also fail when a git command it runs fails (Grok found that a failed `git merge-base` passed). Keep the existing checks. Show each rule failing under a named mutant (AGENTS.md Rule 4) and quote the output. Show the new guard failing at the opening commit (it must catch items 1 to 8).

## Scope and tests

Allowed paths are in `lane.json` (the files listed above, `tools/test_no_originality_check.js`, `tools/ops/quarantine.json` and the lane folder). Gate tests: `node tools/check_deus_syntax.js`; `node tools/test_no_originality_check.js`. Also run `node tools/test_object_art.js` and `node tools/test_all_object_charsets.js` at the opening commit and at your tip. At the base both exit 1 with `PASS = 61 / 67, FAIL = 26` and `Character Sheets Art Check: 61/67 PASS, 26 FAIL`, `Master Icons Art Check: 0/67 PASS, 87 FAIL`. The tip must be no worse. Quote both.

For each of items 1 and 2, show that the script no longer throws: run its non-asset parts, or evaluate the changed section with a stub, and say which you did.

## Rules

- Commit only on `task/lane-gl` with the `[codex]` tag, staging only the manifest paths (`git add <paths>`, never `-A`).
- Push `task/lane-gl` when the work is committed, and end with FINAL SHA.
- The reviewer is launched through `tools/ops/launch_worker.ps1`. The PM merges through merge_gate.
- Report in one paragraph plus the test output (DEC-085 item 5: this lane does not touch `game/`).

## Clarification after the first review (PM, 2026-10-02 ~00:40Z)

Grok's review of 4f861669 (`review_grok_4f861669.md`) rejects the lane on two points. B1: your guard (brief item 10) fails on the word `originalit` in 20 more files under `tools/` (showcase and widget builders, `classify_tests.js`, `process_camp_assets.js`, `verify_all_42_dwarf_male_charsets.js`). Some of them print "U7 Orig: PASS" into generated pages, which is now a false claim. The PM added those 20 paths to `allowedPaths`: clear the wording, the claims and any step that depended on them, and nothing else in those files. B2: the leftover `// removed check` comment in `tools/verify_batch3_assets.js` and `tools/verify_biome_assets.js` goes too. Then `node tools/test_no_originality_check.js` must exit 0, with the named mutants kept and the object-art counts no worse.
