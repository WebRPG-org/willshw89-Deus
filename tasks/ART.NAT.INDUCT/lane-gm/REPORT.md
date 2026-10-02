## What changed
- Batch A2 of the PM-chosen natural-world art is in the game as RMMZ still sprites: the fruit tree and the bare fruit tree (96x144 frames, anchor (48,143)), the red-yellow, purple and blue flower clumps (`!$UF_Wildflowers`, `!$UF_Flowers_Purple`, `!$UF_Flowers_Blue`), the sapling (`!$UF_Sapling`, 48x96), and the fourth grass tuft (`!UF_GrassTuft_V8` now holds four variants, cycling 1,2,3,4,1,2,3,4).
- `game/data/DEUS_WorldCatalog.json`: the `sapling` object drops its stock tile and tint and uses `"image": "!$UF_Sapling"` (`DEUS_Objects.js` `frameFor` draws `tile` before `image`).
- `tools/art/still_charsets.json` (six rows, the fourth tuft entry, and an `anchor` on the two fruit-tree rows), `tools/art/build_still_charsets.js` (a mapping row may set the anchor), `tools/art/test_still_charsets.js` (new rows; a `SIZE_EXCEPTIONS` list for the six pieces a pixel or two outside their catalogue size, per the DEC-016 amendment; alpha and palette checked directly for them; every mapped sprite must be used by a world object; the sapling check; templates now go to a temp folder instead of `tools/art/temp_templates`), and `tools/art/contact_sheet_still_charsets.js` (the evidence script).
- The seven masters and their PM YEA ledger rows came in the lane's opening commit.

## How I tested it
- `node tools/check_deus_syntax.js`: 62 files, 0 errors. `node tools/art/test_still_charsets.js`: `All checks passed.`, with a NOTE line for each of the six size exceptions.
- Provocations, each exit 1 and the test back to exit 0 after restore: a pixel of the fruit tree's first cell (`Sheet !$UF_Fruit_Tree does not match master`), a pixel of tuft block 3 (`V8 Block 3 ... does not match master ...GRASS-TUFT_B-V4`), the fruit tree anchor off by one (`Sidecar anchor [48,142] != expected anchor [48,143]`), the sapling object back on its stock tile (`No world object uses !$UF_Sapling`), the blue flowers' ledger row removed (`No YEA ledger row`), and a semi-transparent pixel in an exception master (validate_art refuses a code outside the allowed list).
- Evidence: `node tools/art/contact_sheet_still_charsets.js tasks/ART.NAT.INDUCT/lane-gm/evidence/contact_sheet_batch_a2.png Fruit_Tree Wildflowers Flowers_Purple Flowers_Blue Sapling GrassTuft`.

## Evidence
- `evidence/contact_sheet_batch_a2.png` (1784x1184, opened and described): 14 frames on a 3x4-tile grass grid, each drawn from the committed sheet at 2x with the sidecar anchor as a red pixel on the bottom edge of the middle tile column. Row 1: the fruit tree (a dark broadleaf crown with orange fruit, base on the tile edge), the bare fruit tree (grey branches, base on the edge), the red-yellow, purple and blue flower clumps, the sapling (a thin brown trunk with a few green leaves). Rows 2 and 3: the eight tuft blocks; blocks 3 and 7 are the pale fourth tuft, the others the three earlier tufts. Nothing is cropped and nothing animates (`stand` is frame 1).

## Not done / known problems
- No New Game or F5 scene was captured: the in-game look of the new fruit trees and flowers, the gather action turning a fruit tree into its picked form, and the sapling's new sprite in a generated world were not observed. The Owner sees the art in game.
- Sizes: the fruit trees are drawn 95x98 and 94x98 in 96x144 frames (their catalogue rows say 96x96); the flower clumps are 21 tall against an envelope of 20; tuft 4 is 19 tall against a minimum of 20. The Owner fixes size mismatches in game (DEC-016 amendment).
- The wildflowers sprite's catalogue row `FLOWERS_B-V1_DEFAULT` is the red-yellow clump; the catalogue rows are not rebuilt in this lane (the catalogue lanes own them).

## Try it in RMMZ
1. Start a New Game and walk to a broadleaf forest and a meadow. Expected: fruit trees, flowers and saplings show the new U7-style stills; picking a fruit tree swaps it for the bare tree; the tall grass shows four different tufts.

## Decisions needed
- None.
