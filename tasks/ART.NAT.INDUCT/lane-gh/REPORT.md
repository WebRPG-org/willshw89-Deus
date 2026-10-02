## What changed
- Batch A1 art into the game as RMMZ still sprites: 16 palette-snapped masters in `art/approved/`, 15 sprite sheets and sidecars under `game/img/characters/` (5 trees, 6 stumps, bush, white flowers, and the 8-block grass tuft sheet), and `game/data/DEUS_WorldCatalog.json` (each tree leaves its own stump). Tool: `tools/art/build_still_charsets.js` with `tools/art/still_charsets.json`; test: `tools/art/test_still_charsets.js`.
- PM correction (deus-pm, 2026-10-01): the four earlier screenshots under `evidence/` did not show trees, stumps or flora (each showed a crowd of colonists, and the "tree felled" image showed a faction banner). The writer's report described them as clean forest, conifer, swamp and felled-tree scenes, which they were not. They are deleted. The evidence is now one contact sheet made by script from the committed sheets, and this report says what was and was not observed.

## How I tested it
- `node tools/check_deus_syntax.js` and `node tools/art/test_still_charsets.js`, with the named mutants, in clean LF clones (see the reviews).
- Contact sheet: a PM script (not committed) takes every sprite in `tools/art/still_charsets.json`, crops RMMZ's standing frame (middle column, first row of each 3x4 block) from the committed PNG, and draws it at 2x on 48-px tiles, with the sidecar anchor drawn as a red pixel on the bottom edge of the tile.

## Evidence
- `evidence/contact_sheet_still_charsets.png` (1784x1576; opened and described): 21 frames on a 3x4-tile grass grid. Row 1: oak, swamp tree, dead tree, birch (96x144 frame), pine (96x144 frame), oak stump. Row 2: swamp, dead, birch, pine and fruit stumps, and the bush. Rows 3-4: the white flowers and the 8 grass-tuft blocks (the three tufts cycle 1,2,3,1,2,3,1,2). Every tree base sits on the bottom edge of its tile, centred on the red anchor pixel; the stumps are small and sit on the same line; the birch and pine are tall and stay inside the frame; nothing is cropped. Nothing animates: each sheet's `stand` is frame 1 only.

## Not done / known problems
- No New Game or F5 scene was captured: the in-game placement of these objects in a generated world was not observed, and neither were the chop action producing the matching stump, persistence of the new stump types, or any RMMZ editor session. The Owner sees the art in game.
- Sizes: the birch and pine are drawn in 96x144 frames; the Owner fixes any size mismatch in game (DEC-016 amendment, 2026-10-01).

## Try it in RMMZ
1. Start a New Game and walk to a forest. Expected: the oak, birch, pine and bush are the new U7-style stills; chopping a tree leaves a stump of the same kind.

## Decisions needed
- None.
