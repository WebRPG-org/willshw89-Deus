# ART.NAT.INDUCT batch A2 independent review (lane-gm)

Reviewed TIP: `e0e9167d6779a1289630e9f7a2908bce5aca9ac9` (`task/lane-gm`)
Reviewer: grok. Writer family: claude (the PM wrote this lane). The review is of that commit only.

`git log --format='%h %an | %s' origin/main..HEAD` at review time:

```text
e0e9167d deus-claude | [claude] ART.NAT.INDUCT batch A2: fruit trees, three flower clumps, sapling and the fourth tuft as RMMZ still sprites
b01d45cb deus-pm | [pm] lane-gm manifest: allow tools/art/build_still_charsets.js (a mapping row may set the anchor)
12521934 deus-pm | [pm] Open lane-gm (ART.NAT.INDUCT batch A2): 7 palette-snapped masters and their PM YEA ledger rows, brief and manifest
```

`git rev-parse HEAD` printed `e0e9167d6779a1289630e9f7a2908bce5aca9ac9`. `git merge-base origin/main HEAD` printed `6ee18bf482ab11da95af9cdc7d847bb54f7200e6`, before and after `git fetch origin`.

## 1. Scope

`git diff --name-status $(git merge-base origin/main HEAD) HEAD`, repeated after `git fetch origin` (merge-base unchanged). Every path was matched against `tasks/ART.NAT.INDUCT/lane-gm/lane.json` `allowedPaths` (exact path, or a `/**` prefix).

```text
IN  M art/APPROVALS.md
IN  A art/approved/SURFACE_SHARED_FLORA_FLOWERS-BLUE_B-V1_DEFAULT.png
IN  A art/approved/SURFACE_SHARED_FLORA_FLOWERS-PURPLE_B-V1_DEFAULT.png
IN  A art/approved/SURFACE_SHARED_FLORA_FLOWERS_B-V1_DEFAULT.png
IN  A art/approved/SURFACE_SHARED_FLORA_GRASS-TUFT_B-V4_DEFAULT.png
IN  A art/approved/SURFACE_SHARED_TREE_FRUIT-TREE-BARE_B-V1_DEFAULT.png
IN  A art/approved/SURFACE_SHARED_TREE_FRUIT-TREE_B-V1_DEFAULT.png
IN  A art/approved/SURFACE_SHARED_TREE_SAPLING_B-V1_DEFAULT.png
IN  M game/data/DEUS_WorldCatalog.json
IN  M game/img/characters/!$UF_Flowers_Blue.json
IN  M game/img/characters/!$UF_Flowers_Blue.png
IN  M game/img/characters/!$UF_Flowers_Purple.json
IN  M game/img/characters/!$UF_Flowers_Purple.png
IN  M game/img/characters/!$UF_Fruit_Tree.json
IN  M game/img/characters/!$UF_Fruit_Tree.png
IN  M game/img/characters/!$UF_Fruit_Tree_Bare.json
IN  M game/img/characters/!$UF_Fruit_Tree_Bare.png
IN  M game/img/characters/!$UF_Sapling.json
IN  M game/img/characters/!$UF_Sapling.png
IN  M game/img/characters/!$UF_Wildflowers.json
IN  M game/img/characters/!$UF_Wildflowers.png
IN  M game/img/characters/!UF_GrassTuft_V8.png
IN  A tasks/ART.NAT.INDUCT/lane-gm/BRIEF.md
IN  A tasks/ART.NAT.INDUCT/lane-gm/REPORT.md
IN  A tasks/ART.NAT.INDUCT/lane-gm/evidence/contact_sheet_batch_a2.png
IN  A tasks/ART.NAT.INDUCT/lane-gm/lane.json
IN  M tools/art/build_still_charsets.js
IN  A tools/art/contact_sheet_still_charsets.js
IN  M tools/art/still_charsets.json
IN  M tools/art/test_still_charsets.js
merge_base=6ee18bf482ab11da95af9cdc7d847bb54f7200e6
changed_paths=30 outside_allowedPaths=0
```

The worktree also had an untracked `tasks/ART.NAT.INDUCT/lane-gm/launches/` prompt. It is not in the TIP diff.

## 2. Masters, ledger hashes, and the A2 section

`sha256sum` is not on PATH. The seven masters were hashed with `C:\Program Files\Git\usr\bin\sha256sum.exe`:

```text
b1834430748fb4cce6d5ce52e8e928281d133b53de5dd6022d6bb8b834abaf4e *art/approved/SURFACE_SHARED_TREE_FRUIT-TREE_B-V1_DEFAULT.png
d3a755a8495d86c00043f2c3681f0b0a4d147bb4c991649a0cee8c29b4c5e80b *art/approved/SURFACE_SHARED_TREE_FRUIT-TREE-BARE_B-V1_DEFAULT.png
c30576deb4b07b8138bdf262c73b2e9cec0c9b844e5037e5ad91bd3fb7b9546f *art/approved/SURFACE_SHARED_FLORA_FLOWERS_B-V1_DEFAULT.png
c0d39b5a8a5c4baa9db3d8d74198ff5de6919116b5da9b531852df8cc2d5938e *art/approved/SURFACE_SHARED_FLORA_FLOWERS-PURPLE_B-V1_DEFAULT.png
c99e86a686c5c27af0485969896df0a83141a033df26841664fa7f36c5c179fe *art/approved/SURFACE_SHARED_FLORA_FLOWERS-BLUE_B-V1_DEFAULT.png
31201ea5c6e02214d4317bad40aa879d4f79ec1916f3c5e05617046d1d077a79 *art/approved/SURFACE_SHARED_TREE_SAPLING_B-V1_DEFAULT.png
6a32c487cf8914082c1add62e59db2427edaf90e88c252e078a2089478ff526e *art/approved/SURFACE_SHARED_FLORA_GRASS-TUFT_B-V4_DEFAULT.png
```

Each hash equals the YEA row in `art/APPROVALS.md` (lines 60-66) for that entry id. Node `crypto` SHA-256 of the same bytes matched the same seven strings, and each file's decoded size is the frame the lane claims: fruit trees 96x144, the three flower clumps and tuft 4 48x48, sapling 48x96.

The human-readable section `## PM YEAs, induction batch A2 (DEC-056), 2026-10-02` lists the same seven ids, in the same order:

```text
SURFACE_SHARED_TREE_FRUIT-TREE_B-V1_DEFAULT
SURFACE_SHARED_TREE_FRUIT-TREE-BARE_B-V1_DEFAULT
SURFACE_SHARED_FLORA_FLOWERS_B-V1_DEFAULT
SURFACE_SHARED_FLORA_FLOWERS-PURPLE_B-V1_DEFAULT
SURFACE_SHARED_FLORA_FLOWERS-BLUE_B-V1_DEFAULT
SURFACE_SHARED_TREE_SAPLING_B-V1_DEFAULT
SURFACE_SHARED_FLORA_GRASS-TUFT_B-V4_DEFAULT
same_seven=true
```

## 3. Sheets equal their masters

Independent RGBA compare through `tools/png_read.js` `decodePNG`. A pixel counts as a mismatch when any of R, G, B, or A differs.

Fruit tree `!$UF_Fruit_Tree.png` is 288x576. The master is 96x144. All 12 cells (3 columns x 4 rows) match the master:

```text
sheet=288x576 master=96x144
cell col=0 row=0 origin=0,0 mismatched_pixels=0/13824
cell col=1 row=0 origin=96,0 mismatched_pixels=0/13824
cell col=2 row=0 origin=192,0 mismatched_pixels=0/13824
cell col=0 row=1 origin=0,144 mismatched_pixels=0/13824
cell col=1 row=1 origin=96,144 mismatched_pixels=0/13824
cell col=2 row=1 origin=192,144 mismatched_pixels=0/13824
cell col=0 row=2 origin=0,288 mismatched_pixels=0/13824
cell col=1 row=2 origin=96,288 mismatched_pixels=0/13824
cell col=2 row=2 origin=192,288 mismatched_pixels=0/13824
cell col=0 row=3 origin=0,432 mismatched_pixels=0/13824
cell col=1 row=3 origin=96,432 mismatched_pixels=0/13824
cell col=2 row=3 origin=192,432 mismatched_pixels=0/13824
fruit_cells=12 fruit_mismatched_pixels=0
```

Tuft sheet `!UF_GrassTuft_V8.png` is 576x384. Each of the eight character blocks (3x4 cells of 48x48) was compared to masters 1, 2, 3, 4, 1, 2, 3, 4:

```text
tuft_sheet=576x384
block=0 holds_master=1 id=SURFACE_SHARED_FLORA_GRASS-TUFT_B-V1_DEFAULT origin=0,0 bad_cells=0/12 mismatched_pixels=0/27648
block=1 holds_master=2 id=SURFACE_SHARED_FLORA_GRASS-TUFT_B-V2_DEFAULT origin=144,0 bad_cells=0/12 mismatched_pixels=0/27648
block=2 holds_master=3 id=SURFACE_SHARED_FLORA_GRASS-TUFT_B-V3_DEFAULT origin=288,0 bad_cells=0/12 mismatched_pixels=0/27648
block=3 holds_master=4 id=SURFACE_SHARED_FLORA_GRASS-TUFT_B-V4_DEFAULT origin=432,0 bad_cells=0/12 mismatched_pixels=0/27648
block=4 holds_master=1 id=SURFACE_SHARED_FLORA_GRASS-TUFT_B-V1_DEFAULT origin=0,192 bad_cells=0/12 mismatched_pixels=0/27648
block=5 holds_master=2 id=SURFACE_SHARED_FLORA_GRASS-TUFT_B-V2_DEFAULT origin=144,192 bad_cells=0/12 mismatched_pixels=0/27648
block=6 holds_master=3 id=SURFACE_SHARED_FLORA_GRASS-TUFT_B-V3_DEFAULT origin=288,192 bad_cells=0/12 mismatched_pixels=0/27648
block=7 holds_master=4 id=SURFACE_SHARED_FLORA_GRASS-TUFT_B-V4_DEFAULT origin=432,192 bad_cells=0/12 mismatched_pixels=0/27648
```

Sidecars:

```text
!$UF_Fruit_Tree.json frame=96x144 anchor=[48,143]
!$UF_Fruit_Tree_Bare.json frame=96x144 anchor=[48,143]
!$UF_Sapling.json frame=48x96 anchor=[24,95]
```

Those are the fruit-tree anchors `[48, 143]` and frames 96x144, and the sapling frame 48x96 with anchor `[24, 95]`. The sapling catalogue row is already slot 48x96, anchor 24,95, so it is not in `SIZE_EXCEPTIONS`. The fruit-tree catalogue rows are still slot 96x96, anchor 48,95; the mapping and the sidecars carry the taller frame.

`getVariantForCell` stores `computeInitialVisualVariant(..., 8)`, which returns `0 .. 7`. For `!UF_GrassTuft_V8`, `frameFor` uses that index as the character block. Blocks 3 and 7 are tuft 4, so the fourth master is in the cycle the object layer indexes.

## 4. Sapling catalog object and `frameFor`

`git diff $(git merge-base origin/main HEAD) HEAD -- game/data/DEUS_WorldCatalog.json` is only the sapling object. The tile and tint are replaced by the image:

```text
diff --git a/game/data/DEUS_WorldCatalog.json b/game/data/DEUS_WorldCatalog.json
@@ -2745,11 +2745,7 @@
     {
       "id": "sapling",
       "name": "Sapling",
-      "tile": {
-        "sheet": "Outside_B",
-        "id": 152
-      },
-      "tint": "#7fb35a",
+      "image": "!$UF_Sapling",
       "under": true,
       "passable": true,
```

`game/data/DEUS_WorldCatalog.json` stat against the merge-base is `6 +---`. No other object hunk.

That is enough for the object to draw from the character sheet.

`bitmapFor` (`game/js/plugins/DEUS_Objects.js` 661-663) loads a character bitmap when `type.image` is set, and only then considers `type.tile`. `frameFor` (669-684) does the opposite: if `type.tile` is set it returns a tileset rectangle and never reads the character sheet. Removing `tile` is what lets `frameFor` fall through. With no tile and no `gen`, it reads the sidecar of `!$UF_Sapling`. That name does not contain `_V8` and does not start with `!UF_` (the second character is `$`), so it is not an eight-character sheet. `ImageManager.isBigCharacter` is true because the name contains `$`. The sidecar then sets the frame to 48x96 and the anchor to `[24/48, 95/96]`, and `animations.stand` is column 1. `_assign` (987-1019) uses `bitmapFor` and then `frameFor`, and `setFrame` draws that one cell. Every cell of a `$` sheet is the master (the charset test checks this for the sapling; the fruit-tree compare above is the same rule). Dropping `tint` also matters for colour: line 122 sets `tintValue` to `0xffffff` when `tint` is absent, so the old `#7fb35a` multiply is gone. `frameFor` itself does not look at tint.

The fruit tree, bare fruit tree, wildflowers, purple flowers, blue flowers, and grass tuft objects already have `image` and no `tile`. This diff does not touch them.

## 5. `tools/art/test_still_charsets.js`

The diff adds `SIZE_EXCEPTIONS` for exactly six entry ids. The only codes in those lists are `DIMS_MISMATCH` and `SCALE_OUT_OF_ENVELOPE`:

```text
SURFACE_SHARED_TREE_FRUIT-TREE_B-V1_DEFAULT: DIMS_MISMATCH, SCALE_OUT_OF_ENVELOPE
SURFACE_SHARED_TREE_FRUIT-TREE-BARE_B-V1_DEFAULT: DIMS_MISMATCH, SCALE_OUT_OF_ENVELOPE
SURFACE_SHARED_FLORA_FLOWERS_B-V1_DEFAULT: SCALE_OUT_OF_ENVELOPE
SURFACE_SHARED_FLORA_FLOWERS-PURPLE_B-V1_DEFAULT: SCALE_OUT_OF_ENVELOPE
SURFACE_SHARED_FLORA_FLOWERS-BLUE_B-V1_DEFAULT: SCALE_OUT_OF_ENVELOPE
SURFACE_SHARED_FLORA_GRASS-TUFT_B-V4_DEFAULT: SCALE_OUT_OF_ENVELOPE
```

Any other refusal fails. The branch is `codes.every(c => allowed.includes(c))`; a code outside that list, or a refusal for an id that is not listed, calls `fail`. `pixelProblems` then checks alpha (0 or 255) and opaque palette colours, and fails the test if either count is non-zero. It runs only when every refusal code is in the allow list. On the clean run it did run for all six: each NOTE line is printed only after `pixelProblems` returns zero semi-transparent and zero off-palette pixels (see check 6).

`validate_art.js` does not stop at the first refusal. It accumulates reasons, and it still checks alpha and palette when the file size differs from the slot (the early return is only for a header more than four times the slot area, which these 96x144 files are not). A mutated exception master therefore fails on the "any other refusal" branch, which is the branch that names `ALPHA_NOT_BINARY` or `OFF_PALETTE`. The comment that says validate_art stops at the first refusal is not how `validateBuffer` works. The allow-list still rejects those codes.

Provocations ran in the LF clone of the TIP (`core.autocrlf=false`, `core.eol=lf`, `core.safecrlf=false`, HEAD `e0e9167d6779a1289630e9f7a2908bce5aca9ac9`), after the clean gate. Each was restored with `git checkout` before the next. `git diff --name-only` was empty after every restore. Final `git status --porcelain` in that clone was empty. FAIL lines below are complete. A REFUSE line longer than 180 characters is cut there; the `ALPHA_NOT_BINARY` and `OFF_PALETTE` lines are complete.

```text
MUTANT sheet cell pixel x=10 y=12 R 0 -> 1
--- sheet_cell_pixel EXIT=1
FAIL: Sheet !$UF_Fruit_Tree does not match master SURFACE_SHARED_TREE_FRUIT-TREE_B-V1_DEFAULT
1 check(s) failed.
RESTORE game/img/characters/!$UF_Fruit_Tree.png diff=""

MUTANT tuft block 3 pixel x=440 y=9 R 0 -> 1
--- tuft_block_3 EXIT=1
FAIL: V8 Block 3 of !UF_GrassTuft_V8 does not match master SURFACE_SHARED_FLORA_GRASS-TUFT_B-V4_DEFAULT
1 check(s) failed.
RESTORE game/img/characters/!UF_GrassTuft_V8.png diff=""

MUTANT fruit anchor [48,143] -> [48,142]
--- fruit_anchor EXIT=1
FAIL: Sidecar anchor [48,142] != expected anchor [48,143]
1 check(s) failed.
RESTORE game/img/characters/!$UF_Fruit_Tree.json diff=""

MUTANT sapling image removed, tile Outside_B/152 tint #7fb35a
--- sapling_tile EXIT=1
FAIL: No world object uses !$UF_Sapling
FAIL: the sapling object must use image !$UF_Sapling and no tile
2 check(s) failed.
RESTORE game/data/DEUS_WorldCatalog.json diff=""

MUTANT remove ledger line 64: | 2026-10-02 | YEA | `SURFACE_SHARED_FLORA_FLOWERS-BLUE_B-V1_DEFAULT` | ...
--- ledger_row_removed EXIT=1
FAIL: No YEA ledger row for master SURFACE_SHARED_FLORA_FLOWERS-BLUE_B-V1_DEFAULT with sha256 c99e86a686c5c27af0485969896df0a83141a033df26841664fa7f36c5c179fe
FAIL: validate_art rejected SURFACE_SHARED_FLORA_FLOWERS-BLUE_B-V1_DEFAULT:
REFUSE APPROVAL_MISSING: no YEA ledger row approves sha256 c99e86a686c5c27af0485969896df0a83141a033df26841664fa7f36c5c179fe for SURFACE_SHARED_FLORA_FLOWERS-BLUE_B-V1_DEFAULT / ATL
REFUSE SCALE_OUT_OF_ENVELOPE: 1 of 1 frame(s) outside envelope w 10..22 h 10..20 (scaleRow MICRO_FLOWERS): frame 0: drawn box 21x21 at (14,27)-(34,47)
2 check(s) failed.
RESTORE art/APPROVALS.md diff=""

MUTANT blue-flowers master pixel 18,27 alpha 255 -> 128; same predicate semi=1 off=0
--- exception_master_semialpha EXIT=1
FAIL: No YEA ledger row for master SURFACE_SHARED_FLORA_FLOWERS-BLUE_B-V1_DEFAULT with sha256 a079495e788612bbd3d622082accb2195ca962d8f289b0d13eb7bace8b223ba2
FAIL: validate_art rejected SURFACE_SHARED_FLORA_FLOWERS-BLUE_B-V1_DEFAULT:
REFUSE APPROVAL_MISSING: no YEA ledger row approves sha256 a079495e788612bbd3d622082accb2195ca962d8f289b0d13eb7bace8b223ba2 for SURFACE_SHARED_FLORA_FLOWERS-BLUE_B-V1_DEFAULT / ATL
REFUSE ALPHA_NOT_BINARY: 1 pixel(s) with alpha other than 0 or 255; first at (18,27) alpha 128
REFUSE SCALE_OUT_OF_ENVELOPE: 1 of 1 frame(s) outside envelope w 10..22 h 10..20 (scaleRow MICRO_FLOWERS): frame 0: drawn box 21x21 at (14,27)-(34,47)
FAIL: Sheet !$UF_Flowers_Blue does not match master SURFACE_SHARED_FLORA_FLOWERS-BLUE_B-V1_DEFAULT
3 check(s) failed.
RESTORE art/approved/SURFACE_SHARED_FLORA_FLOWERS-BLUE_B-V1_DEFAULT.png diff=""

MUTANT tuft-4 master pixel 26,29 rgb -> 010203; same predicate semi=0 off=1
--- exception_master_offpalette EXIT=1
FAIL: No YEA ledger row for master SURFACE_SHARED_FLORA_GRASS-TUFT_B-V4_DEFAULT with sha256 96e5d40a6cbd5bf4dc119e4902de34f7796e8888117fc03a562b11ec658838d5
FAIL: validate_art rejected SURFACE_SHARED_FLORA_GRASS-TUFT_B-V4_DEFAULT:
REFUSE APPROVAL_MISSING: no YEA ledger row approves sha256 96e5d40a6cbd5bf4dc119e4902de34f7796e8888117fc03a562b11ec658838d5 for SURFACE_SHARED_FLORA_GRASS-TUFT_B-V4_DEFAULT / ATLAS
REFUSE OFF_PALETTE: 1 non-transparent pixel(s) not in deus_master_world_palette_v1.hex; first at (26,29) #010203
REFUSE SCALE_OUT_OF_ENVELOPE: 1 of 1 frame(s) outside envelope w 16..28 h 20..36 (scaleRow MICRO_TALL_GRASS): frame 0: drawn box 22x19 at (14,29)-(35,47)
FAIL: V8 Block 3 of !UF_GrassTuft_V8 does not match master SURFACE_SHARED_FLORA_GRASS-TUFT_B-V4_DEFAULT
FAIL: V8 Block 7 of !UF_GrassTuft_V8 does not match master SURFACE_SHARED_FLORA_GRASS-TUFT_B-V4_DEFAULT
RESTORE art/approved/SURFACE_SHARED_FLORA_GRASS-TUFT_B-V4_DEFAULT.png diff=""
CLONE_STATUS=""
DONE
```

The alpha and palette predicate used above is the same test `pixelProblems` uses. On the mutated files the test exits 1 because those codes are not in the allow list. Changing the master also changes its SHA-256, so the YEA row misses and `APPROVAL_MISSING` is reported as well.

## 6. Gate tests, one at a time, in LF clones

Each gate from `lane.json` ran in its own `git clone -c core.autocrlf=false -c core.eol=lf -c core.safecrlf=false --shared --no-checkout` of this worktree, then `git config --local` of those three keys, then `checkout --detach e0e9167d6779a1289630e9f7a2908bce5aca9ac9`. Both clones printed that HEAD and `false`, `lf`, `false`.

```text
PWD=C:\Users\snewt\AppData\Local\Temp\lane-gm-gate1
HEAD=e0e9167d6779a1289630e9f7a2908bce5aca9ac9
autocrlf=false eol=lf safecrlf=false
node tools/check_deus_syntax.js
Checked 62 DEUS plugin files. Errors: 0
GATE1_EXIT=0
```

```text
PWD=C:\Users\snewt\AppData\Local\Temp\lane-gm-gate2
HEAD=e0e9167d6779a1289630e9f7a2908bce5aca9ac9
autocrlf=false eol=lf safecrlf=false
node tools/art/test_still_charsets.js
NOTE: size exception SURFACE_SHARED_TREE_FRUIT-TREE_B-V1_DEFAULT: validate_art refused DIMS_MISMATCH (allowed, DEC-016 amendment); alpha and palette checked directly
NOTE: size exception SURFACE_SHARED_TREE_FRUIT-TREE-BARE_B-V1_DEFAULT: validate_art refused DIMS_MISMATCH (allowed, DEC-016 amendment); alpha and palette checked directly
NOTE: size exception SURFACE_SHARED_FLORA_FLOWERS_B-V1_DEFAULT: validate_art refused SCALE_OUT_OF_ENVELOPE (allowed, DEC-016 amendment); alpha and palette checked directly
NOTE: size exception SURFACE_SHARED_FLORA_FLOWERS-PURPLE_B-V1_DEFAULT: validate_art refused SCALE_OUT_OF_ENVELOPE (allowed, DEC-016 amendment); alpha and palette checked directly
NOTE: size exception SURFACE_SHARED_FLORA_FLOWERS-BLUE_B-V1_DEFAULT: validate_art refused SCALE_OUT_OF_ENVELOPE (allowed, DEC-016 amendment); alpha and palette checked directly
NOTE: size exception SURFACE_SHARED_FLORA_GRASS-TUFT_B-V4_DEFAULT: validate_art refused SCALE_OUT_OF_ENVELOPE (allowed, DEC-016 amendment); alpha and palette checked directly
All checks passed.
GATE2_EXIT=0
```

The two fruit trees were refused only `DIMS_MISMATCH` (their files are 96x144 against a 96x96 catalogue slot, so the envelope check is not run). The three flower clumps and tuft 4 were refused only `SCALE_OUT_OF_ENVELOPE`. Both of those codes are the ones the allow list names.

## 7. Contact sheet and what the report says was not observed

Opened `tasks/ART.NAT.INDUCT/lane-gm/evidence/contact_sheet_batch_a2.png`. Decoded size:

```text
contact=1784x1184
red_marker_at=152,390 rgba=255,0,0,255 neighbor=100,116,72,255
```

1784x1184 is the contact script's size for 14 standing frames: six columns of a 3x4-tile patch at 2x, three rows, the last row holding two panels. Row 1, left to right, is the leafy fruit tree with orange fruit, the bare grey fruit tree, the red-yellow flower clump, the purple clump, the blue clump, and the thin sapling. Row 2 is six grass tufts. Row 3 is two grass tufts, and the rest of that row is the dark page background. The sprites sit on the grass grid and are not cropped by the panel. Pixel (152, 390) is the red anchor mark on the bottom edge of the middle tile column of the first panel, which is what the script draws for the sidecar anchor. This is a sheet preview. It is not a New Game screen and not an F5 scene.

`REPORT.md` says that, in the section "Not done / known problems":

```text
- No New Game or F5 scene was captured: the in-game look of the new fruit trees and flowers, the gather action turning a fruit tree into its picked form, and the sapling's new sprite in a generated world were not observed. The Owner sees the art in game.
```

That matches what this review observed. No New Game or F5 scene was opened here either.

## 8. Merge with origin/main

```text
git fetch origin
FETCH_EXIT=0
origin/main=278dbeb444a647c190a68851692e7e3ff435efa5

git merge-tree --write-tree origin/main HEAD
cf4f135d52bd6312ee834c2f39d96ca371695df6
MERGE_TREE_EXIT=0
```

## Findings

No findings.

VERDICT: CLEAN PASS
