# lane-cy2: put the Owner's kept ground sets into the game (art only)

| Field | Value |
|---|---|
| WBS | ART.GROUND.INDUCT (re-cut of lane-cy) |
| taskId (manifest) | ART.GROUND.INDUCT |
| Branch | `task/lane-cy2` |
| Manifest | `tasks/ART.GROUND.INDUCT/lane-cy2/lane.json` |
| Writer -> reviewer | codex -> grok |
| Dependencies | none |
| RMMZ editor must be closed | yes (DEC-059 keeps it closed during the natural-world build; the lane writes `game/img/tilesets/*`) |

Base: `main` at `eb1c1c9d` or later.

## Why a re-cut

The Owner, 2026-10-01: "If shit passed review then it should be good to go, no?"; "Check the tiles I already made, there are 46 on pixellab"; "There are 43 tilesets in there my guy". The art in lane-cy (`task/lane-cy`, Grok PASS `fb29a17b`) is wanted, but the branch cannot be merged as it is:
1. Its converter (`tools/art/induct_all_ground_tiles.js`) reads 16 PixelLab sets the Owner has since deleted. Owner deletions are rejections. Those sets are 0c163850, c0c35c89, 7d4ee010, 10b7c41f, 98b6a1bc, 6ed41dbc, 40a777bc, 73e6e557, ec0f0920, 19506eac, 3bd90e5f, b21608ca, 11a039a0, 11d057da, fdd52808 and a32533f0.
2. It replaces the game's start map, `game/data/Map001.json` (startMapId 1), with a 50x40 demo map full of signposts.
3. It re-formats all of `game/data/Tilesets.json` (+49,274 lines). The only real change there is the tilesetNames of tilesets 2 and 4.

## Goal

Build the ground sheets from the Owner's 43 kept Tiles Pro sets only, and change nothing else in the game.

## Scope

1. **Bring over from lane-cy**, without its Map001, demo map or Tilesets reformat:
   - `git checkout origin/task/lane-cy -- tools/art/induct_all_ground_tiles.js tools/art/verify_specimens_rgb.js`;
   - its stock `game/img/tilesets/Outside_A1.png`. That is RMMZ's own water sheet, a stand-in until the PM's water passes; main's copy is empty.
2. **Change the converter's set table** to the Owner's kept sets below. Read tiles from both backup folders:
   - `C:/Users/snewt/DEUS_backups/pixellab_2026-09-30/tiles_pro`;
   - `C:/Users/snewt/DEUS_backups/pixellab_2026-10-01/tiles_pro` (the 15 new sets, staged by the PM in the same `<id>__NN.png` and `<id>.txt` format).
   - `fillTile` is the index of the solid tile of the named terrain. In a corner set, tile 15 is all first terrain and tile 0 all second.
3. **A slot with no kept set:**
   - a damp or dry variant uses its base kind's block; log it as a stand-in;
   - a base kind with no set keeps what main has today;
   - never use a deleted set.
4. **Write the sheets:** `game/img/tilesets/Outside_A2.png`, `game/img/tilesets/Dungeon_A2.png`, `game/img/tilesets/DEUS_GroundVar_D.png`, and `game/img/tilesets/Outside_D.png` if the D sheet needs it. Same slot layout as lane-cy.
5. **`game/data/Tilesets.json`:** change only the tilesetNames entries the new sheets need, in RMMZ's own compact one-line-per-tileset format. The diff must touch only those lines. Write it with a script that edits the parsed array and writes it back in RMMZ's format, never `ConvertTo-Json` (ENGINE_RULES §4). If nothing needs changing, do not touch the file.
6. **Rebuild the art catalogue** (`node tools/art/build_catalogue.js`; the lane holds the catalogue slot). The tileset images are catalogue sources.

## The set table (PM, 2026-10-01; the Owner's kept sets only)

| key | set | fillTile | note |
|---|---|---|---|
| meadow, tropical_grass | owner master files (as lane-cy) | - | unchanged |
| dry_grass_base | a7bfcf27 | 0 | |
| dry_grass_damp | 5122a922 | 15 | new |
| dry_grass_dry | none | - | base stands in |
| shrub_soil_base / damp / dry | 6ea85489 / ff01c30d / 390a16e7 | 0 | dry shows seams |
| forest_floor_base | 4d156d7e | 0 | |
| forest_floor_damp | 7e83dfcc | 15 | new |
| forest_floor_dry | 642ca861 | 0 | seams show |
| needle_floor_base / dry | 373f6cd2 / 61c027fe | 0 | |
| needle_floor_damp | ba8523c7 | 15 | new (alternatives 248a876d, ba56457f) |
| sand_base | 74e8c5ec | 0 | |
| sand_damp | d8d58d33 | 0 | new; its first terrain is the meadow |
| sand_dry | 1a88fe0e | 15 | new |
| stony_base / damp | 1338d7b1 / 6bc632da | 0 | |
| stony_dry | 82e30806 | 15 | new |
| rock_base / dry | cf0ca97a / a7a14675 | 0 | base shows seams |
| rock_damp | db0f92ff | 15 | new |
| peak_rock_base | 38ff1be9 | 0 | |
| peak_rock_damp, peak_rock_dry | none | - | base stands in |
| marsh_mud_base | 1fe2fa67 | 15 | new |
| marsh_mud_damp | ac1027ec | 0 | |
| marsh_mud_dry | 35f849ec | 15 | new |
| swamp_mud_base | none | - | as main today |
| swamp_mud_damp | 28056291 | 0 | |
| swamp_mud_dry | none | - | base stands in |
| dirt_base | 58e1a2c9 | 15 | |
| dirt_damp | 14cb1aff | 15 | new |
| dirt_dry | 581ead32 | 15 | new |
| scree_base / damp / dry | 12c2a349 / 50c160d0 / 9b14146b | 0 | damp and dry show seams |
| road_trail | 6c37c67e | 15 | new |
| cave_floor | 4e32db8a | 15 | new |
| dug_earth | none | - | as main today |
| mined_stone | 74a93c7b | 0 | seams show |

Before trusting a fillTile, check it by eye: the solid tile you take must show the named terrain, not its meadow partner. If a fillTile is wrong, use the other solid tile and note it in the report.

## Tests (lane.json gateTests; each runs in a fresh clone)

- `node tools/check_deus_syntax.js`.
- `node tools/art/verify_specimens_rgb.js`, updated so that every A2 slot's block derives from its table entry. It must fail when a slot is fed from another set; show that with a mutant.
- A new `tools/art/test_ground_kept_sets.js`:
  - the converter references only ids from the 43 kept sets (an allowlist file of the 43 ids) and none of the 16 deleted ids;
  - `game/data/Map001.json` is byte-identical to main;
  - the `Tilesets.json` diff is limited to tilesetNames.
  Show each check failing at the base or under a named mutant (AGENTS.md Rule 4).
- `node tools/art/build_catalogue.js --check` and `node tools/art/test_catalogue.js`.

## F5 evidence

The editor stays closed (DEC-059). Use the snapshot harness: `node tools/add_test_plugin.js <copy>/js/plugins.js`, then `node tools/run_tests.js <suite> --game <copy>`. Take one New Game screenshot at 2x showing several ground kinds side by side, and one of a damp/dry variant area. Open both and describe them (Rule 5).

## Out of scope

- The demo map and anything in `game/data/Map*.json`.
- Water art (the PM is generating it), cliffs, objects.
- Choosing between the Owner's sets beyond the table: the PM chose (DEC-056) and the Owner can change it.

## Rules

Commit only on `task/lane-cy2` with the `[codex]` tag, staging only the manifest paths. The reviewer is launched through `tools/ops/launch_worker.ps1` (AUDIT_LOG A12). The PM merges through merge_gate. Report in the AGENTS.md format.
