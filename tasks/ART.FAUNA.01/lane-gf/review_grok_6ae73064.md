# ART.FAUNA.01 / lane-gf review

| Field | Value |
|---|---|
| Reviewer | Grok |
| Writer | claude (`deus-claude`) |
| Reviewed commit | `6ae7306481e758e318ead36571459254267e68b5` |
| Parent | `3ba37e0afb16c7c91c497e5ab7b694c74238c3b2` |
| Branch | `task/lane-gf` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-gf` |
| Merge base with `origin/main` | `6c6e4afe8ec9f6d766b16204698bb8ad3603706b` |
| Node | v24.19.0 |
| Executed | 2026-10-01 |

`git rev-parse HEAD` at review was `6ae7306481e758e318ead36571459254267e68b5`. The tip commit adds `tools/art/fauna/**` and `art/fauna/GENLOG.jsonl`. The induction those scripts record is the lane range `6c6e4afe..6ae73064` (175 files). That range is what this review checks against `tasks/ART.FAUNA.01/lane-gf/BRIEF.md`.

Untracked and left untracked: `tasks/ART.FAUNA.01/lane-gf/launches/20261001_144206_prompt.txt`.

## Scope

Every path in `git diff --name-status 6c6e4afe..6ae73064` matches `lane.json` `allowedPaths`. The 12 sheets are `game/img/characters/$DEUS_Creature_{Wolf,Fox,Boar,Hare,Fowl,Hawk,Songbird,Bat,GiantSpider,WildSheep,Rat,RestlessDead}.png`. No other wildlife id changed. `git diff --check 6c6e4afe..6ae73064` exited 0.

## Catalogs

`game/data/DEUS_WorldCatalog.json` and `game/data/UF_WorldCatalog.json` are byte-identical at the tip (327551 bytes, no CR). They were byte-identical for wildlife records at the merge base too. Both have 23 wildlife records. The only record changes are the 12 inducted species:

| id | was | now | tint |
|---|---|---|---|
| wolf | `$UF_Stock_Nature_0` | `$DEUS_Creature_Wolf` | none before, none now |
| fox | `$UF_Stock_Nature_3` | `$DEUS_Creature_Fox` | `#ff9a6a` removed |
| boar | `$UF_Stock_Nature_2` | `$DEUS_Creature_Boar` | `#7a5a40` removed |
| hare | `$UF_Stock_Nature_2` | `$DEUS_Creature_Hare` | `#c8a888` removed |
| fowl | `$UF_Stock_Monster_0` | `$DEUS_Creature_Fowl` | `#f0dcb8` removed |
| hawk | `$UF_Stock_Vehicle_2` | `$DEUS_Creature_Hawk` | `#c09070` removed |
| songbird | `$UF_Stock_Nature_5` | `$DEUS_Creature_Songbird` | none before, none now |
| bat | `$UF_Stock_Vehicle_2` | `$DEUS_Creature_Bat` | `#585068` removed |
| giant_spider | `$UF_Stock_SF_Monster_2` | `$DEUS_Creature_GiantSpider` | none before, none now |
| wild_sheep | `$UF_Stock_Nature_2` | `$DEUS_Creature_WildSheep` | none before, none now |
| rat | `$UF_Stock_Nature_2` | `$DEUS_Creature_Rat` | `#8888a0` removed |
| restless_dead | `$UF_Stock_Monster_6` | `$DEUS_Creature_RestlessDead` | none before, none now |

`git diff -U2` on `DEUS_WorldCatalog.json` is those image replacements and tint-line deletions. No other field and no reformat. Deer, jackal, and the other stock species still point at their stock sheets.

`DEUS_Wildlife.js` `speciesById` sets `tintValue` to `0xffffff` when `tint` is absent (line 134). `drawn_and_tinted` compares the boar sprite to that value (line 1753), so an untinted boar is what the check wants.

## Sheets and masters

PNG IHDR: ten sheets are 144×192 (48×48 frames). Giant spider is 288×192 (96×48). Restless dead is 144×384 (48×96). Each is 3×4, columns pixel-identical, every frame opaque, lowest opaque pixel on the bottom row, left and right padding equal or off by one pixel.

A crop of each cardinal master, bottom-aligned and centred the way `tools/art/fauna/build_sheet.js` places it, matches the sheet cell pixel for pixel, including colour (12 species × 4 facings). The four diagonal masters in each `art/fauna/<species>/` have opaque pixels. `source.json` names PixelLab Create Character, a character id, the canvas, and the correction for songbird, bat, wild sheep, rat, and restless dead.

Read as images: wolf, fox, boar, hare, fowl (hen), hawk, songbird, bat, giant spider, wild sheep, rat, and restless dead are the named creatures, with south / west / east / north in that row order. West and east are opposite profiles (centroids sit on opposite sides of the frame centre), except the bat, whose side views are a narrow vertical body.

## Catalogue and asset index

`art/catalogue` rows for the 12 species changed `runtime.file` from the stock sheet to `$DEUS_Creature_*` and status from `STOCK` to `EXISTING_UNAPPROVED`. Deer and jackal keep `$UF_Stock_Nature_3`; fox was dropped from that sheet's `usedBy`. Asset index: the 12 new keys added; `$UF_Stock_Monster_0`, `$UF_Stock_Monster_6`, `$UF_Stock_Nature_0`, `$UF_Stock_Nature_2`, `$UF_Stock_Nature_5`, and `$UF_Stock_SF_Monster_2` removed because nothing still uses them. `UF_Generator` was also dropped; `game/js/plugins.js` registers `DEUS_Generator`, not `UF_Generator`. Other catalogue `sourceIds` edits are AR citations and shared-sheet user lists from the same regen. Runtime files for those entries did not change.

`runtimeSheets` in `tools/art/build_catalogue.js` sizes a character sheet from the entry envelope (`ceilTo(envelope.hMax) * 4`), not from the PNG. Restless dead's envelope is still 48px tall, so the catalogue sheet record says 144×192 while the PNG is 144×384. The game draws the PNG. The row points at the new file.

## Gates

Run in this worktree at `6ae7306481e758e318ead36571459254267e68b5`.

| Command | Exit | Observed |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | Checked 62 DEUS plugin files. Errors: 0 |
| `node tools/art/test_fauna_induction.js` | 0 | 12 species, 8 passed, 0 failed |
| `node tools/art/test_fauna_induction.js --mutants` | 0 | 8/8 caught in isolation |
| `node tools/art/build_catalogue.js --check` | 0 | CHECK: OK (12 generated files match) |
| `node tools/art/test_catalogue.js` | 0 | 50/50 checks passed |

## Evidence image

`tasks/ART.FAUNA.01/lane-gf/evidence/fauna_view.fauna_view_east.png` is the game at Ground, zoom 2.0x, on grass. Facing east, with green bars: fox, boar, and hare on the upper row; bat, giant spider, wild sheep, and rat on the lower row. Sizes read against each other (boar and sheep larger than fox and hare; spider wide; bat and rat small). The evidence plugin places all 12 on a six-wide grid, and 2x zoom crops wolf, fowl, hawk, songbird, and restless dead off this frame. The south shot shows the same crop facing south, including the bat's wings. Those five sheets were opened on their own and match the species. The in-game `wildlife` suite was not re-run for this review. The writer's report is the only record of that suite.

## Notes

`tools/art/test_fauna_induction.js` reads the DEUS catalog into `record` and the UF catalog into `recordUF`, then says "no UF_WorldCatalog wildlife record" when `record` is missing. A missing sheet also `continue`s before the catalog checks. Neither hid a fault in this tree: both catalogs were compared in full, and the eight mutants each turned only their own check red.

`tools/art/fauna/induct.js` edits `UF_WorldCatalog.json` only. The DEUS copy was brought into step in the committed tree (the files match). The fauna scripts `require` `C:/Users/snewt/OneDrive/Desktop/UF/tools/...` and read `.pixellab_token` from that tree. `chars/` is gitignored. They are the generation archive from the PM commit that allowed `tools/art/fauna/**`, not a fresh-clone rerun. No token is in `art/fauna/GENLOG.jsonl` or the scripts.

VERDICT: CLEAN PASS
