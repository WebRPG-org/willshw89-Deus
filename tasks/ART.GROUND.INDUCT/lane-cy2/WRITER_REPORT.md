# ART.GROUND.INDUCT lane-cy2 writer report (2026-10-01)

User amendment to BRIEF: use only the 15 Tiles Pro sets in `C:/Users/snewt/DEUS_backups/pixellab_2026-10-01/tiles_pro`. This supersedes the brief's 43-set, two-folder input. Thirteen table-selected sets are inducted; `248a876d` and `ba56457f` remain unselected alternatives. No 2026-09-30 PixelLab set is read.

## What changed

- `tools/art/ground_kept_sets.json`: fixed the 15-ID allowlist, 13 selections and their expected A2 and D positions.
- `tools/art/induct_all_ground_tiles.js`: built selected source masters and A2 blocks from the 2026-10-01 folder, preserving the pre-lane pixels in uncovered slots and lane-cy's D slot positions.
- `tools/art/verify_specimens_rgb.js` and `tools/art/test_ground_kept_sets.js`: checked every A2 block, D swatch, source ID, Map001 identity and Tilesets diff scope.
- `game/img/tilesets/{Outside_A1,Outside_A2,Dungeon_A2,Outside_D,DEUS_GroundVar_D}.png`: copied the stock A1 sheet specified by the brief; inducted the selected ground art in A2 and D.
- `art/masters/source_sets/*`: saved 13 palette-snapped 48×48 source tiles with PixelLab IDs and fillTile values in sidecars.
- `art/catalogue/catalogue.json` and generated `docs/art/catalogue/*`: rebuilt the catalogue from its current inputs.
- `game/data/Map001.json` and `game/data/Tilesets.json`: unchanged Git blobs from `a5255704`; the Outside tileset already names `Outside_D`, and the new cave art is in `Dungeon_A2`.

## How I tested it

- Visually opened `source_solid_board.png` before selecting tile 0 or 15; each selected solid tile reads as the named terrain rather than its meadow partner. No fillTile corrections were needed.
- `node tools/check_deus_syntax.js` → `Checked 62 DEUS plugin files. Errors: 0`.
- `node tools/art/verify_specimens_rgb.js` → all 32 blocks of each A2 sheet and all 13 D swatches matched the table or retained baseline.
- Wrong-slot mutant: fed Outside A2 slot 18 from slot 19; verifier exited 1 with `[FAIL] Outside_A2.png slot 18 is not dirt_damp`. Original image bytes restored.
- `node tools/art/test_ground_kept_sets.js` → source, Map001 Git-blob and Tilesets checks passed. Named in-memory mutants `source-id`, `map` and `tilesets` each exited 1. The Map001 guard uses Git's checkout filter so it works with Windows line endings in a fresh clone.
- `node tools/art/build_catalogue.js --check` → `CHECK: OK (12 generated files match)`.
- `node tools/art/test_catalogue.js` → `50/50 checks passed`.
- Re-ran all five manifest gate commands at the committed writer tip in an isolated fresh clone; all exited 0. The initial clone exposed a Windows checkout line-ending mismatch in the Map001 guard, which was corrected before the final run.
- Disposable game copy: `node tools/add_test_plugin.js <copy>/js/plugins.js`, then `node tools/run_tests.js smoke --game <copy>` → `RESULT: 129 passed, 0 failed (exit 0)`.
- After copying the final five sheets and `DEUS_GroundEvidence.js` into that disposable game: `node tools/run_tests.js ground_evidence --game <copy>` → `RESULT: 3 passed, 0 failed (exit 0)`.

## Evidence

- `source_solid_board.png`: tile 0 at left and tile 15 at right for each of the 15 new sets, ordered by ID in `ground_kept_sets.json`; opened at original resolution.
- `new_game_ground_kinds_2x.png`: opened; at 2× zoom the New Game tilemap shows dry-grass base and damp, marsh mud, dirt damp/dry, road, and sand damp/dry in adjacent columns. The disposable evidence plugin hides actors and UI for this capture.
- `new_game_damp_dry_2x.png`: opened; two brown dirt states appear beside two pale sand states in repeated columns, with no blank tiles in the pictured area.
- `snapshot_results.txt`: the live New Game capture recorded `PASS ground_evidence.no_errors - none` and `RESULT: 3 passed, 0 failed (exit 0)`.
- The rebuilt `Outside_A2.png`, `Dungeon_A2.png` and `DEUS_GroundVar_D.png` were opened. The D sheet shows 13 swatches at their reserved lane-cy positions, with other cells transparent.

## Not done / known problems

- Independent Grok review and PM merge are pending. This writer report is not a review verdict.
- DEC-059 directs the RMMZ editor to stay closed during this phase; its process state was not checked here. A literal editor F5/F8 session was not run. The brief directs the disposable snapshot harness for this lane.
- Several terrain base slots had no 2026-10-01 set. They retain pre-lane art or transparency. Dry-grass dry copies the existing dry-grass base block. Dungeon peak-rock states, swamp-mud dry and dug earth retain stock stand-ins. The brief flags seams in some kept sets; a full seamlessness review remains for the independent reviewer.
- The catalogue builder still emits the DEC-045 moisture-variant rows as `MISSING` even though their source masters are now present. Road and cave-floor rows resolve to the inducted runtime sheets. Updating the hardcoded DEC-045 catalogue logic is outside this lane's allowed paths.
- `docs/STATUS.md`, `docs/VISION.md` and `art/APPROVALS.md` are outside the lane manifest and were not edited. The PM should record the user amendment and integration status there.

## Try it in RMMZ

1. After independent review and PM integration, reopen the project in RPG Maker MZ and start a New Game.
2. Compare the Outside A2 ground kinds and Dungeon A2 cave floor against the two saved 2× evidence images.

Expected: the selected terrains use the 2026-10-01 set artwork in the documented slots; uncovered slots retain their pre-lane appearance.

## Decisions needed

- Independent reviewer verdict and PM merge decision.
- Whether a later catalogue lane should make DEC-045 source-master presence update the variant rows' status and runtime location.

## GAME TRANSLATION

| Field | Lane result |
|---|---|
| Player / World Effect | Selected ground kinds gain the Owner's new terrain textures. |
| Trigger | New Game or any map drawing Outside A2 / Dungeon A2 tile IDs. |
| Runtime Authority | Existing RPG Maker MZ tileset names and tile IDs; no simulation authority changed. |
| Simulation Path | Existing world generation chooses tile IDs; this lane changes the image pixels at those IDs. |
| Engine Bridge | RMMZ tilemap reads `Outside_A2.png` and `Dungeon_A2.png`. |
| Visible Result | Adjacent 2× ground columns in the disposable New Game screenshots. |
| Persistence | Saves retain tile IDs; this lane changes no save schema. |
| Failure Without This Lane | Selected slots remain stock, empty or old placeholders. |
| Automated Proof | RGB slot provenance, allowlist/Map001/Tilesets checks, catalogue checks and syntax check above. |
| In-Game Proof | Disposable NW.js New Game snapshot suite: 3 passed, 0 failed; literal editor F5 not run. |

Simulation implemented: NO (art-only lane). Engine bridge implemented: YES (existing RMMZ sheet names). Presentation implemented: YES (A2 and D images). Input/player interaction implemented: NO (art-only lane). Save/load implemented: NO (no schema or tile-ID changes). Playable verification performed: YES through the disposable New Game harness; editor F5 remains untested.
