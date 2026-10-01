# WG.CELL-WRITE / lane-da writer report (ANSWER-DA rework)

Parent of this commit: `a51e079fa37c06f048f4a5af56a25ad6732287e0`. The gates below ran on these blobs, which this commit keeps:

- `game/js/plugins/DEUS_Levels.js` `14d9ff5da41af959e4e346c05aed24d24c0acc94`
- `tools/test_sparse_outer_save.js` `0ec9de3fc3f87b61f4682a32be57aa6a7ffb59ba`

Date of the runs: 2026-10-01.

## What changed

- `game/js/plugins/DEUS_Levels.js`: removed `buildViewBaselines` and its call in `setView`. `setView` again matches the lane base (`b889de90`): a view change does not walk every area to build baselines. `ensureWorldLevels` still builds baselines for the world's levels at New Game, which is the base construction path this lane was told to leave in place.
- `tools/test_sparse_outer_save.js`: `view_does_not_save` reads `DataManager.makeSaveContents().ufWorld.levels` after `setView(-10)`, `setView(12)`, and the two `baseline` calls. `fresh_save_terrain_range_bound` is measured on two new seed-18 worlds (`-16..+15` and `-4..+4`) before any view, dig, or revert. Mutant `entry_on_view` now patches `setView` so an outer destination gets a checksum entry, and that run exits 1 at `view_does_not_save`.
- `tasks/WG.CELL-WRITE/lane-da/REPORT.md` and `tasks/WG.CELL-WRITE/lane-da/evidence/`: this report and the logs cited below.
- WBS, registry, and `BRIEF_PRECONDITIONS_RECORD.md` were not edited. The PM's record is on main at `4b5eb45f` (read with `git show` on 2026-10-01). It lists the five dispatch preconditions and the main commits that hold them (`b21cfe62`, `32a2fe05`, `b889de90`).

## How I tested it

Fresh shared clones of `C:/Users/snewt/OneDrive/Desktop/UF`, sparse-checkout `game/js`, `game/data`, `tools`, `docs/systems`. Each command had a 900000 ms kill timeout. None hit it. Detail: `evidence/provenance.txt`.

Tip clone `C:\Users\snewt\AppData\Local\Temp\lane-da-clones\tip-precommit`, `core.autocrlf=false`, detached `a51e079`, corrected files overlaid (hashes above, CRLF count 0, `buildViewBaselines` absent):

- `node tools/check_deus_syntax.js` exit 0 (5682 ms)
- `node tools/test_sparse_outer_save.js` exit 0 (46065 ms)
- `node tools/test_32_levels_generation.js` exit 0 (10545 ms)
- `node tools/test_strata_cuts_and_caves.js` exit 0 (532419 ms, TIME 532.3 s). Started 2026-10-01T09:54:52.253Z.

Base clone `C:\Users\snewt\AppData\Local\Temp\lane-da-clones\base-b889de90` at `b889de90382b7bdc89ca98b8fb6dbb38beb49ba2`:

- `node tools/check_deus_syntax.js` exit 0
- `node tools/test_32_levels_generation.js` exit 0 (the base's ten checks, including all-32 save entries)
- `node tools/test_sparse_outer_save.js` with the corrected test and fixture overlaid, plugin left at the base blob `8076d47c`: exit 1, five checks red, two guards green
- `node tools/test_strata_cuts_and_caves.js` exit 0 after an LF re-checkout of `game/js` (431.2 s). An earlier attempt on a CRLF working tree exited 2 at `shafts_keep_fluid`.

Seven mutants in the worktree on the same two blobs (not a second time inside the clone). Each exit 1. Named reds:

- `checksum_all_levels` (sparse): `fresh_save_terrain_range_bound`, `new_game_core_entries_only`, `view_does_not_save`
- `drop_ignores_checksum`: `revert_drops_outer_entry` (case B still held `z,gen,checksum,strata`)
- `strip_all_outer`: `migration_keeps_real_outer_change`
- `strip_caps_only`: `migration_keeps_real_outer_change`
- `entry_on_view`: `view_does_not_save` with `makeSaveContents().ufWorld.levels` keys `[-10,-2,-1,0,1,2,12]`
- `outer_baseline_shift`: `all_32_layers_reconstructible_unchanged` (`-9:41ba9dc5!=93f6b5c4`)
- `checksum_all_levels` (`test_32_levels_generation.js`): `core_entries_only`

`drop_ignores_checksum` also turned `migration_strips_checksum_only_entries` red. `strip_all_outer` also turned `revert_drops_outer_entry` and `migration_strips_checksum_only_entries` red. `strip_caps_only` also turned `migration_strips_checksum_only_entries` red. Those extra reds are in `evidence/mutants.txt`.

## Evidence

- `evidence/pass-after.txt`: the three fast tip gates, full stdout for syntax, sparse, and the 32-level test.
- `evidence/strata-gate.txt`: the recorded strata gate (exit 0, clearance 1103 ns, fluid 36 passed, foundation 27 passed, RESULT 30 passed) and the earlier 2000 ns misses on the same clone.
- `evidence/base-keep-green.txt`: syntax, base `test_32`, and the LF strata run at `b889de90`.
- `evidence/fail-before.txt`: corrected test against the base plugin. Terrain+range diff 1294 B (levels 1787 / 495, zRange 22 / 20, fluid 37 / 37) before any view. `makeSaveContents().ufWorld.levels` held all 32 keys after the views.
- `evidence/mutants.txt`: the seven exits.
- `evidence/provenance.txt`: clone paths, hashes, timeout, line-ending note.
- `evidence/sparse_outer-results.txt`: NW.js `--uf-test` suite `sparse_outer` at 2026-10-01T08:27:09.435Z in `C:\Users\snewt\AppData\Local\Temp\laneaa_clones\lane-da-wg0043`. `PASS sparse_outer.sparse_outer_save`. Keys before save and after load `[-3,-2,-1,0,1,2]`. `levels["-10"]` absent. Errors none. That run is the tree that became `a51e079`, which still had `buildViewBaselines`. It was not repeated after this rework.
- Screenshot `evidence/sparse_outer.after_load.png`, opened 2026-10-01: the ground after that load. Grass field. Top right plate reads Ground, with pause and 1x Speed. Zoom panel shows 1.0x Normal selected and "Explored: 3% (1793 cells)". Center: several people and a red banner with a gold lion. A fruiting tree upper left, bushes and a grey boulder lower right, a dark rock lower left. The picture does not show save keys. The keys are the log line above.

Tip `fresh_save` on the untouched seed-18 worlds: `-16..+15` 334 B (levels 275, zRange 22, fluid 37), `-4..+4` 332 B (levels 275, zRange 20, fluid 37), diff 2 B.

## Not done / known problems

- The corrected tip was not played in NW.js. `DataManager.saveGame` / `loadGame` on this tip: not checked. The 2026-10-01T08:27Z playtest is the previous tip.
- Strata's 2000 ns checks moved across the bound on the same corrected clone before the recorded pass. In order: clearance 2766 ns with `foundation_suite` `query_cost` also red (this one shared the machine with the base suite); clearance 1848 ns with `query_cost` red; clearance 2586 ns with `foundation_suite` green; then the recorded run at 1103 ns with both suites green. `shapeCodeAt` is outside this rework's diff. A busy machine can fail that gate without a save-logic change.
- The first base strata attempt exited 2 because the harness LF anchor was absent in a CRLF working tree. The keep-green result is the later LF checkout, exit 0.
- `UF.World.saveWorld`, a `DEUS_Save` plugin, and `DEUS_Levels.initLevelsFromSave` are not in this tree. Searched `game/js` and `docs` on 2026-10-01. The save and load path that is in the tree is cited in the translation block.
- Mutants were not executed a second time inside the fresh clone. They ran on the worktree copies of the two blobs the clone gated.
- Browser play of a web UI: not applicable. This change is the plugin and the node tests.
- FPS: not measured.

## Try it in RMMZ

1. New Game at Z range -16..+15, seed 18.
2. Step the view to -10 and back to the ground. Dig one solid cell on -3. Save. Load.
Expected: the saved level keys are `-3,-2,-1,0,1,2`. There is no `-10`. No console error. That is what the 08:27Z log showed on the previous tip. This tip: not checked.

## Decisions needed

- None in this lane. Precondition records stay the PM's main commit `4b5eb45f`.

GAME TRANSLATION

WBS / Lane: WG.00.43, executed as WG.CELL-WRITE lane-da. Brief: `tasks/WG.CELL-WRITE/lane-da/BRIEF.md`. Owner authorization: DEC-058 as amended by WORK-GATE G02, row da.
Approved scope / Owner authorization reference: save and init only. Core entries at New Game, checksum-only outer entries empty, one-shot migration rule `WG.00.43`, viewed layer writes no entry. Caps stay in the shipped `levels[zMax].caps` form.
Writer SHA / evidence date: blobs `14d9ff5d` (Levels) and `0ec9de3f` (sparse test), parent `a51e079`. Evidence dated 2026-10-01. The commit that contains this file is the commit of those blobs plus this report.
Translation Class: C. FOUNDATIONAL / INDIRECT

Player / World Effect: A New Game save stores level entries for -2..+2 only. An outer level gains an entry with its first change and loses it with its last. Looking at a level does not add an entry. A load of a save that still has checksum-only outer entries deletes those once and keeps a real strata change and a caps-only entry.

Trigger: New Game calls `ensureWorldLevels` (`DEUS_Levels.js` `onWorldCreated`, line 4750). A cell change calls `levelEntry` / `dropEmptyOuterEntry` (lines 1702 and 1715). Load of a version-4 world calls `migrateSparseOuterSave` from `DataManager.extractSaveContents` (lines 4713-4722). `setView` (line 4773) changes the level on screen and does not write `state.levels`.

Runtime Authority: `UF.World.state.levels`, owned by `DEUS_Levels.js`. The world object is `UF.World.state`. Checksum-only means every key is `z`, `gen`, `checksum`, or `strata`, `strata` is absent or empty, and there is no `caps` key (`checksumOnlyEntry`, line 1706).

Simulation Path: `ensureWorldLevels` writes entries for `CORE_LEVELS` only and still builds baselines for every z in the range (lines 4625-4643). `dropEmptyOuterEntry` deletes a checksum-only outer entry. `migrateSparseOuterSave` does that once and pushes `{ rule: "WG.00.43", stripped }` onto `state.migrations`.

Engine Bridge: `DataManager.makeSaveContents` (`game/js/rmmz_managers.js` line 389) builds the RMMZ contents. `DEUS_World.js` lines 3338-3342 set `contents.ufWorld = World.state`. `DEUS_Fluid.js` lines 1304-1309 add `contents.deusFluid` and `contents.ufFluid` (the same fluid object). `DataManager.saveGame` (line 345) stores that object. On load, `DataManager.loadGame` (line 355) calls `extractSaveContents`. `DEUS_World.js` lines 3345-3348 set `World.state` from `contents.ufWorld`. `DEUS_Levels.js` lines 4713-4725 then run `migrateSparseOuterSave`, `verifyLevels`, and `deltaLevels` for a version-4 world.

`UF.World.saveWorld`: not in the tree. The world payload is the `contents.ufWorld = World.state` assignment above.
`DEUS_Save`: no `game/js/plugins/DEUS_Save.js`. The save consumer is `DataManager.saveGame` plus the World and Fluid wrappers.
`DEUS_Levels.initLevelsFromSave`: not in the tree. The load consumer is the `extractSaveContents` wrapper at `DEUS_Levels.js:4713`.

Visible Result: The player sees the level they stepped to. Whether that level was written into the save is not drawn on screen. Observed in the headless test: after `setView(-10)` and `setView(12)`, `makeSaveContents().ufWorld.levels` keys are `[-2,-1,0,1,2]`. Observed in the prior NW.js log: after viewing -10 and digging -3, keys before save and after load are `[-3,-2,-1,0,1,2]`. The opened screenshot shows the ground scene described above. It does not show the keys. This tip's screen: not checked.

Persistence: `state.levels` is inside `contents.ufWorld`. Core keys -2..+2 are in a fresh seed-18 save (levels JSON 275 B). Outer checksum-only keys are absent. The mixed fixture's `-10` strata change and `15` caps-only entry, checksum keys included, are byte-identical after one load and after a second load (`migration_keeps_real_outer_change`, `migration_strips_checksum_only_entries`). Terrain+range (levels + `zRange` + fluid) diff between -16..+15 and -4..+4 on untouched seed-18 worlds is 2 B (bound 256). At the base plugin the same measure is 1294 B.

Failure Without This Lane: A New Game save holds an entry and a checksum for all 32 levels. The base measured levels JSON 1787 B at -16..+15 against 495 B at -4..+4. Viewing -10 still left all 32 keys in `makeSaveContents().ufWorld.levels`. A checksum-only outer entry survived a revert (`revert_drops_outer_entry` case B at the base). If the migration deleted real changes, the dug outer cell or the changed cap at +15 would be gone after load (`strip_all_outer`, `strip_caps_only`).

Automated Proof: Commands, exits, and seeds are in How I tested it and the evidence files. Seed 18. Fixture `tools/fixtures/levels/save_32_entries_seed18.json`. Headless proof is `node tools/test_sparse_outer_save.js` exit 0, including the `makeSaveContents().ufWorld.levels` read. That is a vm harness: it loads `DEUS_World.js`, `DEUS_WorldGen.js`, `DEUS_Levels.js`, and `DEUS_Fluid.js` and calls the wrapped `makeSaveContents`. It is not `DataManager.saveGame` writing a file. The separate integration of save and load through `DataManager.saveGame(18)` / `loadGame(18)` is the NW.js log on the previous tip, not this one.

In-Game Proof: NOT RUN on this tip. Previous tip, 2026-10-01T08:27:09.435Z, suite `sparse_outer`, log `evidence/sparse_outer-results.txt`, screenshot `evidence/sparse_outer.after_load.png` (opened; described above). Expected keys `[-3,-2,-1,0,1,2]`. Observed those keys before save and after load, `levels["-10"]` absent, errors none.

CONSUMED BY GAME SYSTEMS:
- `DataManager.makeSaveContents`: contract is `contents.ufWorld` equals `UF.World.state`, so `ufWorld.levels` is the level table the rest of the save stores. Integration observed this session: `tools/test_sparse_outer_save.js` `view_does_not_save` reads that object after the views and requires the keys `[-2,-1,0,1,2]`. Exit 0. Corruption: an extra outer key is a level the player did not change sitting in the save; the base run showed all 32 keys and a 1294 B terrain+range gap.
- `DataManager.saveGame` / `loadGame` (`rmmz_managers.js` 345 and 355), with `DEUS_World.js` and `DEUS_Levels.js` `extractSaveContents`: contract is the stored `ufWorld.levels` come back through `migrateSparseOuterSave` once. Headless `loadWorld` in the sparse test calls `extractSaveContents` and checks the migration. The file save and load were observed only on the previous tip's NW.js log. This tip: not checked. Corruption: a second migration record, or a kept checksum-only entry, or a deleted real dig or cap.
- `DEUS_Fluid.js` `makeSaveContents`: adds the fluid part of the terrain+range measure. The sparse test's diff counts `deusFluid` / `ufFluid` (37 B on both ranges in the tip run). A fluid change is outside this lane.
- `UF.World.saveWorld`, `DEUS_Save`, `DEUS_Levels.initLevelsFromSave`: names from the rework brief. Not present in this tree, so no contract was executed under those names.

GAME BRIDGE STATUS
Simulation implemented: YES - sparse test exit 0 and the seven mutant exits in `evidence/mutants.txt`.
Engine bridge implemented: YES for the wrappers that already assign `contents.ufWorld` and run `extractSaveContents`. The file-level `saveGame`/`loadGame` path on this tip: NOT VERIFIED.
Presentation implemented: NO - this lane does not draw save contents. The level plate in the prior screenshot is the existing view UI. Not re-checked on this tip.
Input/player interaction implemented: YES for the existing `,` / `.` view keys and for `setView` in the headless harness (`setView -10 true`, `setView +12 true`). Player input on this tip: not checked.
Save/load implemented: YES in the headless `makeSaveContents` / `extractSaveContents` checks (exit 0). File save/load on this tip: not checked. File save/load on the previous tip: the NW.js log, exit 0, one check.
Playable verification performed: NO on this tip. Previous tip's screenshot was opened; it shows the ground scene, not the save table.

Simulation authority: COMPLETE within the save/init scope, supported by `evidence/pass-after.txt` and `evidence/mutants.txt`.
Game translation consumer: DEFINED as `DataManager.makeSaveContents` (`contents.ufWorld.levels`), `DataManager.saveGame` / `loadGame`, and `DEUS_Levels.js` `extractSaveContents` (`migrateSparseOuterSave`).
Engine bridge: the existing `DEUS_World.js` / `DEUS_Fluid.js` / `DEUS_Levels.js` wrappers. File playtest of this tip: NOT RUN.
Player-facing status: NOT YET PLAYABLE as a claim for this commit. The previous tip's one NW.js check passed.

Remaining step before player can experience it: Gemini re-review of this tip, then a New Game at -16..+15 on this commit: view -10, dig one cell on -3, save, load, and read the level keys. That playtest was not run here.
