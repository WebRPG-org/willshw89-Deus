# ART.GROUND.INDUCT lane-cy2 fix report — 2026-10-01

This report covers the fix after Grok's review of `86c51fd9`. The earlier `WRITER_REPORT.md` records that superseded 15-set attempt.

## What changed

- `tools/art/ground_kept_sets.json`: mapped all 34 set-bearing rows of the brief's table to their kept PixelLab IDs, solid tile index, slot, and catalogue source ID. The allowlist contains those 34 IDs and two unselected alternatives; no deleted ID is present. Meadow and tropical grass remain the two existing Owner masters.
- `tools/art/induct_all_ground_tiles.js` and `art/masters/source_sets/*`: read the 2026-09-30 and 2026-10-01 backups, palette-snap the selected solid tiles, rebuild A2/D sheets, and record source provenance. Outside slot 6 borrows the newly placed dry grass base; Dungeon slots 3 and 4 borrow the newly placed peak rock base. Outside slot 16 retains main's transparent swamp mud base. Dungeon slot 6 retains its stock swamp mud dry block as the PM exception, and slot 1 retains stock dug earth.
- `game/img/tilesets/{Outside_A2,Dungeon_A2,Outside_D,DEUS_GroundVar_D}.png`: placed the table's sets and stand-ins in the existing slot layout. Outside A2 slots 0 and 1 and the stock Outside A1 sheet remain unchanged.
- `game/data/Tilesets.json`: set `tilesetNames[7]` to `Outside_D` on tilesets 2 and 4. `set_outside_d.js` made the parsed-array edit and wrote the existing one-line-per-tileset format. Git reports a two-line replacement.
- `tools/art/verify_specimens_rgb.js` and `tools/art/test_ground_kept_sets.js`: check every table-mapped RGB block against its own source, reject transparent mapped slots, enforce the named base/stock exceptions, check D gallery swatches, and require the D name on exactly tilesets 2 and 4.
- `art/catalogue/*` and `docs/art/catalogue/*`: rebuilt after the sheet change; the generated files were byte-identical to the existing catalogue outputs, so they have no Git diff.
- `tasks/ART.GROUND.INDUCT/lane-cy2/{regression_86.js,render_ground_boards.js,evidence/*}`: reproducible baseline rejection, 2× boards, and New Game snapshot evidence.

## How I tested it

- Opened the 2× source pair board. Each row shows tile 0 on the left and tile 15 on the right, in `ground_kept_sets.json` key order. The brief's selected side reads as its named terrain; for example, sand damp uses the tan tile while its other solid tile is meadow green. No `fillTile` correction was needed.
- `node tasks/ART.GROUND.INDUCT/lane-cy2/regression_86.js` temporarily substituted the exact 86c51fd9 A2 and Tilesets bytes, ran the new checks in the foreground, and restored the current bytes in a `finally` block:
  ```text
  86c51fd9 A2 RGB check exit=1
  [FAIL] Outside_A2.png slot 4 fully transparent
  86c51fd9 D sheet check exit=1
  [FAIL] Tilesets 2 D sheet must be Outside_D and be the only name change
  ```
- Named mutants at the repaired tip also exited 1: `--mutant=outside-source` reported `[FAIL] Outside_A2.png slot 4 is not forest_floor_base`; `--mutant=d-name` reported `[FAIL] Tilesets 2 D sheet must be Outside_D and be the only name change`.
- Rebuilt the catalogue with `node tools/art/build_catalogue.js`: `BUILD: OK (10194 entries, 206 sheets, 242 outOfScope, 12 files written)`.
- Ran the manifest's five `gateTests` commands in the foreground, one at a time, after the rebuild:
  ```text
  node tools/check_deus_syntax.js                 exit=0  Checked 62 DEUS plugin files. Errors: 0
  node tools/art/verify_specimens_rgb.js          exit=0  Outside A2 32 slots; Dungeon A2 32 slots; gallery and Outside D matched
  node tools/art/test_ground_kept_sets.js         exit=0  34 table sets, Map001 identity, and Tilesets 2/4 Outside_D passed
  node tools/art/build_catalogue.js --check       exit=0  CHECK: OK (12 generated files match)
  node tools/art/test_catalogue.js                exit=0  50/50 checks passed
  ```
- Updated the disposable lane-cy2 game copy with the repaired sheets and Tilesets JSON, then ran `node tools/run_tests.js ground_evidence --game <disposable copy>` in the foreground. Its New Game run reported `RESULT: 3 passed, 0 failed (exit 0)`. Both screenshots were opened.

## Evidence

- [Outside A2 all 32 slots at 2×](evidence/outside_a2_all_32_2x.png): opened; eight columns by four rows show meadow/grass, soil, forest litter, rock, mud, dirt, scree and sand. Slot 16 at row 3 column 1 is the sole blank, matching the no-base-set exception. Some selected sets show the seams noted in the brief.
- [Source solid pairs at 2×](evidence/source_solid_pairs_2x.png): opened; all 34 selected sets show tile 0 beside tile 15 in JSON key order, allowing the named terrain to be distinguished from its partner.
- [New Game ground kinds at 2×](evidence/new_game_ground_kinds_fix_2x.png): opened; adjacent bands show dry grass base/damp, marsh mud, dirt states, road, sand states and meadow, with no blank band.
- [New Game damp/dry at 2×](evidence/new_game_damp_dry_fix_2x.png): opened; the brown dirt states and pale sand states appear in repeated columns and remain visibly distinct.
- Opened `Dungeon_A2.png`: peak rock slots 3 and 4 repeat the base rock block; slot 6 is the retained dark stock block and slot 1 the stock dug-earth block. Opened `Outside_D.png`: the selected swatches occupy the original gallery positions; unused cells are transparent.
- [Snapshot log](evidence/snapshot_results_fix.txt), trimmed:
  ```text
  PASS ground_evidence.surface_kinds_at_2x - camera 2, map 256x256, origin 124,125
  PASS ground_evidence.damp_dry_tiles
  PASS ground_evidence.no_errors - none
  RESULT: 3 passed, 0 failed (exit 0)
  ```

## Not done / known problems

- Independent Grok review and PM merge remain pending; this writer report is not a review verdict.
- Outside A2 slot 16 stays transparent because swamp_mud_base has no kept set. Dungeon A2 slot 6 keeps stock artwork because a blank autotile would draw nothing. Dungeon slot 1 is also stock.
- The brief marks visible seams in shrub soil dry, forest floor dry, rock base, scree damp/dry and mined stone. This fix places the PM's selected sources; it does not replace or regrade them.
- The catalogue's existing moisture-variant logic may still label some newly sourced variants `MISSING`; its hardcoded status rules are outside this lane's paths.
- The RMMZ editor stayed closed under DEC-059. Literal editor F5/F8 was not run; the disposable New Game snapshot harness provided the in-engine evidence. Reopen the project after this data-file change.
- `docs/STATUS.md` and `art/APPROVALS.md` are outside this manifest's allowed paths and were not edited.

## Try it in RMMZ

1. After independent review and PM integration, reopen the project in RPG Maker MZ and start a New Game.
2. Inspect adjacent Outside A2 ground kinds and Dungeon A2 peak rock, dug earth and swamp dry tiles. Compare with the linked 2× screenshots.

Expected: table-selected terrain fills its documented A2 slots; tilesets 2 and 4 load Outside D; the named no-set exceptions retain their documented pixels.

## Decisions needed

- Independent reviewer verdict and PM integration through `merge_gate`.
- Any later replacement of the known-seam sets or the swamp mud base requires the PM/Owner art process.

## GAME TRANSLATION

| Field | Lane result |
|---|---|
| Player / World Effect | A. DIRECT PLAYER-VISIBLE: ground kinds now display the Owner's table-selected textures. |
| Trigger | New Game or any map rendering these Outside A2, Dungeon A2, or D tile IDs. |
| Runtime Authority | RPG Maker MZ tileset names and tile IDs; no simulation authority changed. |
| Simulation Path | Existing world generation emits tile IDs; the repaired sheets supply their pixels. |
| Engine Bridge | `Tilesets.json` binds Outside A2 and Dungeon A2; entries 2 and 4 now also bind Outside D. |
| Visible Result | The opened 2× New Game screenshots and all-slot board above. |
| Persistence | Saves retain tile IDs; no save schema changed. |
| Failure Without This Lane | Eighteen Outside A2 slots are transparent at 86c51fd9, Dungeon peak states remain stock, and D never loads. |
| Automated Proof | Baseline rejection, source RGB and transparency checks, D name/diff checks, and all five manifest gates above. |
| In-Game Proof | Disposable New Game snapshot suite: 3 passed, 0 failed. Literal editor F5/F8 not run. |

Simulation implemented: NO (art-only). Engine bridge implemented: YES (Tilesets D bindings). Presentation implemented: YES (A2/D sheets). Input/player interaction implemented: NO (art-only). Save/load implemented: NO (tile IDs unchanged). Playable verification performed: YES in the disposable New Game harness; literal editor F5 remains untested.
