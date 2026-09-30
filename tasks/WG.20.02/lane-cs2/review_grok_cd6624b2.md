# WG.20.02 lane-cs2 independent review (Grok)

Reviewed tip, from `git rev-parse HEAD` in `C:\Users\snewt\.deus_worktrees\lane-cs2` on `task/lane-cs2`:

```
cd6624b20bc81ef21e48f56037daef8d04c77377
```

Writer commit under that tip: `043a6b4c07bd53391c094678f8a75489fb79a5b7`.
Reviewer: Grok. This file is the review. No catalogue, card, builder, or art file was edited. No art was generated.

## Git

`git rev-parse HEAD` printed `cd6624b20bc81ef21e48f56037daef8d04c77377`.
`git merge-base HEAD origin/main` printed `e0b7404ac553921da684858e7554d62646f0bac9` (equal to `origin/main`).

```
cd6624b20bc81ef21e48f56037daef8d04c77377 [gemini] WG.20.02: record DEC-052 after-action for lane-cs2
043a6b4c07bd53391c094678f8a75489fb79a5b7 [codex] WG.20.02: implement DEC-045 triplet builder generation and resolve catalogue schema gate
f850afbe90f19ecbe905316cf9883929169fef65 [gemini] WG.20.02: lane manifest and brief for lane-cs2
```

`git log HEAD -- tasks/WG.20.02/lane-cs2/lane.json` lists one commit, `f850afbe90f19ecbe905316cf9883929169fef65`, subject `[gemini]`, one parent. The working tree was clean apart from an untracked `tasks/WG.20.02/lane-cs2/launches/` directory, which this review does not add.

## Gates

Run in this worktree, foreground, after confirming HEAD.

| # | Command | Exit |
|---|---|---|
| 1 | `node tools/check_deus_syntax.js` | 0 |
| 2 | `node tools/test_palette.js` | 0 |
| 3 | `node tools/art/test_catalogue.js` | 1 |
| 4 | `node tasks/WG.20.02/lane-cs2/check_cards1.cjs --self-test` | 0 |

Syntax: `Checked 62 DEUS plugin files. Errors: 0`.
Palette: `Palette loaded successfully`.
CARDS-1 self-test: `RESULT: 14 passed, 0 failed` (seven checks and seven rejected mutations).

Catalogue gate, the failing check:

```
PASS catalogue.schema: $id deus-art-catalogue/1.2.0; unsupported keywords 0; 10122 entries, 187 sheets: 0 schema errors; broken copy rejected with 2 errors
FAIL catalogue.rebuild_identical: 12 outputs; run1 vs run2 differ: none; fresh build vs committed differ: art/catalogue/catalogue.json, docs/art/catalogue/INDEX.md; catalogue.json sha256 1184fba0bba18d21...
PASS catalogue.live_catalogue_valid: real build: 10122 entries, 0 rule errors
46/47 checks passed
```

Two successive builds match each other. Both differ from the committed tree. Schema validation of the committed catalogue reports 0 errors. The live build reports 0 rule errors, including `SLOT_OUTSIDE_SHEET` and `SLOT_OVERLAP`.

## Scope

`git diff --name-status --no-renames e0b7404ac553921da684858e7554d62646f0bac9 HEAD`: 20 paths. Each matches an `allowedPaths` glob in `tasks/WG.20.02/lane-cs2/lane.json`. Image suffixes (`png`, `jpg`, `jpeg`, `gif`, `bmp`, `webp`, `tga`, `psd`): none. `game/` paths: none. `art/catalogue/geometry.json`: unchanged.

| Status | Path | Allowed |
|---|---|---|
| M | art/catalogue/catalogue.json | yes |
| M | art/catalogue/conflicts.md | yes |
| M | art/catalogue/references.json | yes |
| M | docs/art/cards/TEMPERATE_BATCH1_GENERATIONS.md | yes |
| M | docs/art/catalogue/BAND_SURFACE.md | yes |
| M | docs/art/catalogue/INDEX.md | yes |
| A | tasks/WG.20.02/lane-cs2/AFTER_ACTION.md | yes |
| A | tasks/WG.20.02/lane-cs2/BRIEF.md | yes |
| A | tasks/WG.20.02/lane-cs2/REPORT.md | yes |
| A | tasks/WG.20.02/lane-cs2/apply_cards1.cjs | yes |
| A | tasks/WG.20.02/lane-cs2/cards1-validation-final.log | yes |
| A | tasks/WG.20.02/lane-cs2/cards1-validation.log | yes |
| A | tasks/WG.20.02/lane-cs2/catalogue-baseline.log | yes |
| A | tasks/WG.20.02/lane-cs2/catalogue-final.log | yes |
| A | tasks/WG.20.02/lane-cs2/check_cards1.cjs | yes |
| A | tasks/WG.20.02/lane-cs2/lane.json | yes |
| A | tasks/WG.20.02/lane-cs2/palette.log | yes |
| A | tasks/WG.20.02/lane-cs2/state.md | yes |
| A | tasks/WG.20.02/lane-cs2/syntax.log | yes |
| M | tools/art/build_catalogue.js | yes |

`git diff --numstat` has no binary row. The builder change is the DEC-045 block in `tools/art/build_catalogue.js` (the 11 kinds, sheet `ATLAS_SURFACE_SHARED_TILE_DEC045`, status `MISSING`).

## What the triplet commit actually contains

Parsed committed `art/catalogue/catalogue.json` at this tip:

- 10122 entries, 187 sheets.
- 33 entries on `ATLAS_SURFACE_SHARED_TILE_DEC045`, one V1/V2/V3 triplet for dirt, dry-grass, forest-floor, mud, needle-floor, rock, sand, scree, shrub-soil, stony, swamp-mud.
- Every one of those 33 has status `MISSING`.
- statusWhy values are exactly:
  - `DEC-045 damp (V1) metadata record; no image, QA or Owner approval; DEC-007 remains in force.`
  - `DEC-045 base (V2) metadata record; no image, QA or Owner approval; DEC-007 remains in force.`
  - `DEC-045 dry (V3) metadata record; no image, QA or Owner approval; DEC-007 remains in force.`
- Sheet object: `{ sheetId: ATLAS_SURFACE_SHARED_TILE_DEC045, kind: ATLAS, group SURFACE/SHARED/TILE, w: 1584, h: 48, gridPx: 48, runtimeFile: null }`. 1584 = 33 × 48. Slot rects: 0 outside the sheet, 0 overlapping pairs.
- `docs/art/catalogue/INDEX.md` lists that sheet as `1584x48` with 33 slots.
- The sheet is emitted by `build()` into the catalogue. It is not a row added to `geometry.json`.

A fresh `build()` of this worktree matches the committed catalogue on every entry, every sheet, and every top-level field except `sources`. `run1` vs `run2` is empty. The single pin mismatch is `docs/OWNER_DECISIONS.md`:

| Tree | Catalogue pin for `docs/OWNER_DECISIONS.md` | LF-normalised hash of that file | `lineOf` for the RAMP cite |
|---|---|---|---|
| HEAD `cd6624b2` | `988b0d69c94cbe4540099e9155977a78011edaec0924630eb6d76125267cb039` | `f2f47bb012cb5f584f64e9e39bc899ca79062973fa943b7b457561bcf4ba8a1b` | 324 |
| `origin/main` `e0b7404a` | `9ab3414d005e7912e037edfd87d1c9c76eb72ae80eeafa16e2d01ba021f99b43` | `f2f47bb012cb5f584f64e9e39bc899ca79062973fa943b7b457561bcf4ba8a1b` | 324 |
| lane-cs launch `b0b0b784` | `9ab3414d005e7912e037edfd87d1c9c76eb72ae80eeafa16e2d01ba021f99b43` | `988b0d69c94cbe4540099e9155977a78011edaec0924630eb6d76125267cb039` | 313 |

The pin written by this lane is the decisions file from `b0b0b784` (`task/lane-cs`), where the RAMP sentence "Art catalogue adds ramp/slope pieces per terrain" is line 313. On this tip that sentence is line 324 (`docs/OWNER_DECISIONS.md:324`), after the DEC-019/020 amendment in `b89cd9cc`, which is already in `origin/main`. Committed `docs/art/catalogue/INDEX.md` line 60 still cites `docs/OWNER_DECISIONS.md:313`. A fresh build cites `docs/OWNER_DECISIONS.md:324`. That is the only INDEX line that differs. File sizes stay equal (catalogue 13223258 bytes, INDEX 18812 bytes) because one 64-character hash and one line number changed.

`origin/main` was already stale: its pin `9ab3414d…` does not match the decisions file in that same commit. This lane replaced that pin with `988b0d69…` and left the gate red. Rebuilding on this tip rewrites `art/catalogue/catalogue.json` and `docs/art/catalogue/INDEX.md` only. The other ten generated outputs already match, including the 33 rows and the 1584×48 sheet.

`check_cards1.cjs` does not see this. `preserve_existing` skips `sources`. It also loads the baseline with `git show b0b0b784:art/catalogue/catalogue.json`. `b0b0b784` is on `task/lane-cs` and is not an ancestor of HEAD (`git merge-base --is-ancestor` exited 1). The self-test exits 0 here because that object is in the local database via `origin/task/lane-cs`.

## Cards and the carried lane-cs record

`check_cards1.cjs --self-test` passed against `docs/art/cards/TEMPERATE_BATCH1_GENERATIONS.md`: 77 run blocks, runs 26 and 27 absent, triplet ids on runs 1–24 and 28–36, uniform A2 ids on 25, 37, 48–50, settings text on runs 1–37 and 48–52, static-first wording, and the item/reference edits the script asserts. Run 1 is `` `SURFACE_SHARED_TERRAIN_ROCK_V2_DEFAULT` `` with the Create Tiles Pro settings fragment.

`tasks/WG.20.02/lane-cs2/REPORT.md`, `state.md`, and `catalogue-final.log` still describe the refused lane-cs tree: status `REQUESTED`, schema errors on `$.entries[6124]`, rebuild sha `6d192241602b0d7b`, branch `task/lane-cs`, implementation `5f22e3d69881c62f591c870e7ae056985f5b48fe`. On this tip the schema check reports 0 errors and the fresh catalogue sha prefix is `1184fba0bba18d21`. `apply_cards1.cjs` still stamps `status: 'REQUESTED'` and asserts the DEC-045 sheet is absent, so it refuses on this tree. The rows in the committed catalogue come from `build_catalogue.js`, which stamps `MISSING`.

## Findings

1. Blocking. `node tools/art/test_catalogue.js` exits 1. Committed `catalogue.json` pins `docs/OWNER_DECISIONS.md` at `988b0d69c94cbe4540099e9155977a78011edaec0924630eb6d76125267cb039`. The file in this commit hashes to `f2f47bb012cb5f584f64e9e39bc899ca79062973fa943b7b457561bcf4ba8a1b`. Committed `INDEX.md` cites the RAMP sentence at line 313; on this tip it is line 324. The 33 triplet rows, the 1584×48 sheet, and the other generated files match a fresh build.
2. The lane handoff logs and `REPORT.md` record the earlier `REQUESTED` schema failure, which this tree does not have. The failure on this tip is the rebuild pin above.
3. `check_cards1.cjs` bases its "unchanged entries" proof on commit `b0b0b784`, outside this branch's history, and it ignores `sources`. It exited 0 and did not catch finding 1.

Slot bounds on the 33 DEC-045 cells are inside the sheet with no overlaps. No image file and no `game/` file is in the diff. `geometry.json` has no DEC-045 sheet row; the atlas metadata lives in the built catalogue.

VERDICT: FAIL
