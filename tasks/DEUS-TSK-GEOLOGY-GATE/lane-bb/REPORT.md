# DEUS-TSK-GEOLOGY-GATE lane-bb report

Writer: grok. Branch: `task/lane-bb`. Base: `188fee267f6c95bd477736f3dc7dfce2c6e75a12`.

## Root cause

`node tools/test_geology_strata.js` died while loading plugins, before any of the nine checks. `DEUS_Levels.js` line 69 reads `window.UF.World.Z_RANGES.legacy` at load, and later reads `window.UF.Space.GRID_SIZE_FEET` and `STRATUM_FEET` (line 1038). The harness built a hand-written `UF.World` (`state`, `inWorld`, `currentArea`, `viewLevel`, `registerGenerator`, `unregisterGenerator`) and never loaded `DEUS_World.js`.

That read was introduced by WG.00.17, commit `bdf45b4cb133eff5436ee9cb4c4ec6cbe255cb9e` (2026-09-26, "[claude] WG.00.17 WIP: Z range authority in DEUS_World"). `Z_RANGES.legacy` is -2..+2. `UF.Space` is set in the same plugin (`GRID_SIZE_FEET` 5, `STRATUM_FEET` 2). The geology harness was last touched in `27d509c6` and still had the stub.

On this base the same load crash is still in two other harnesses (see PROPOSED-BB-01). Both exit 1 at `DEUS_Levels.js:69` with `Cannot read properties of undefined (reading 'legacy')`.

## What changed

`tools/test_geology_strata.js` only.

The hand-written `UF.World` is gone. The harness loads the real plugins in a Node `vm`, in order: `DEUS_World.js`, `DEUS_WorldGen.js`, `DEUS_Levels.js`. Engine stubs are only what those files touch at load (`PluginManager.parameters` from `game/js/plugins.js`, the Tilemap constants section of `rmmz_core.js`, and the constructors they alias). A plugin that throws is caught and the process exits 1 with one `HARNESS` line, not an uncaught stack.

The world under test is the one the nine checks were written against: seed `1074124084`, size 256, one area, no `zRange` field. `DEUS_World.zRange()` reads a state with no `zRange` as `Z_RANGES.legacy` (-2..+2). `docs/systems/DEUS_ZRange.md` section 3.

The nine checks and their assertions are the same: `api_present`, `surface_strata_valid`, `determinism`, `physical_properties_attached`, `upper_earth_strata`, `deep_earth_strata`, `levels_stratum_at`, `cell_info_contains_geology`, `levels_cell_at_contains_stratum`.

`--mutant` still requires fewer than 2 surface stone types. A healthy catalog has 5, so that run exits 1.
`--mutant=no_world` skips `DEUS_World.js`. `DEUS_Levels.js` then fails to load and the harness exits 1.

## Open Owner questions

Listed only. This lane does not answer them.

- `docs/systems/DEUS_ZRange.md`: the New Game split -16..+15 is the PM default and is still open for the Owner. The range stays data.
- The same doc: ADR-003 Q16 (old saves) is open for the Owner. A state with no `zRange` is read as the legacy range -2..+2. The geology world state is that case.

## Gate output

### `node tools/test_geology_strata.js` — EXIT 0

```
INFO plugins loaded: DEUS_World.js, DEUS_WorldGen.js, DEUS_Levels.js (26 ms)
INFO world seed 1074124084, size 256, areas 1x1, zRange -2..2 (state has no zRange: legacy)
INFO space 5 ft cell, 2 ft stratum
=== Running Geological Strata Test Suite ===
PASS geology.api_present - WorldGen.geologyAt and Levels.stratumAt are defined
PASS geology.surface_strata_valid - sampled 196 cells: 5 stone types found (granite, slate, limestone, sandstone, basalt), all match catalog
PASS geology.determinism - cell (128,128) produced identical stone 'slate' across repeated calls
PASS geology.physical_properties_attached - stone Slate: density 2.65, compressiveStrength 65, workability 75
PASS geology.upper_earth_strata - Z=-1 stratum: stone 'limestone', depthBand 'upper_earth'
PASS geology.deep_earth_strata - Z=-2 stratum: stone 'slate', depthBand 'deep'
PASS geology.levels_stratum_at - Levels.stratumAt matches WorldGen.geologyAt: slate
PASS geology.cell_info_contains_geology - WorldGen.cellInfo(128,128,0) includes geology: stone 'slate'
PASS geology.levels_cell_at_contains_stratum - Levels.cellAt(64,64,-1) includes stratum: stone 'limestone'

RESULT: 9 passed, 0 failed (exit 0)
```

### `node tools/test_strata_foundation.js` — EXIT 1

This failure is on the base. `git diff --stat HEAD` for this lane is only `tools/test_geology_strata.js`. The foundation test does not load that file. Its last commit is `116a3de9` (2026-09-25), before `bdf45b4c` (2026-09-26).

`World.newWorld` takes `Z_RANGES.default` (-16..+15). The vm sandbox does not receive `process`, so `DEUS_Z_RANGE` is not visible inside the plugins. `elevationOf` is `(z - zMin) * 5 + s` (`DEUS_Levels.js`). The test still hardcodes the core frame (zMin -2): `+1` at 5/5 wants elevation 19 and gets 89. 89 = `(1 - (-16)) * 5 + 4`.

```
=== DEUS-TSK-FABLE-19A strata foundation: seed 20260923 (second seed 20260930) ===
INFO newWorld 11100 ms with strata, 13028 ms pre-strata; area 0,0, 256x256
INFO fixtures valley (196,37), valley2 (8,71), deepRock (64,10), pool (19,8), cave (13,8), cave2 (24,8), hillTop (8,8), deep2 (11,8)
PASS storage_budget - strata 1336320 B + connectors 133632 B + cached shape grids 327680 B = 1797632 B (1.71 MiB) for the 5 levels of area 0,0, limit 3500000 B; also held: biome 131072 B, shared surface grid 65536 B, legacy views built so far 0 B, total 1998336 B; flat Uint8Array 65536x5 per level true; baseline HP implicit (full) true; +1 legacy views not built before a read true
PASS generation_deterministic - checksums strata/pre-strata: -2: 1898af90/1898af90, repeat same, seed+1 differs, seed 20260930 same; -1: 3846830f/3846830f, repeat same, seed+1 differs, seed 20260930 same; 0: e51c7731/e51c7731 (WorldGen lattice of the live world); 1: fa009862/fa009862, repeat same, seed+1 differs, seed 20260930 same; 2: c548f665/c548f665, repeat same, seed+1 differs, seed 20260930 same
PASS baseline_roundtrip - shape, material, water (below the ground) and biome of all 5 levels equal the pre-strata arrays byte for byte (65536 cells each)
PASS solid_open_columns - 5 levels: solid 143840 (5/5 solid strata), open 53198 (5/5 air), floor 130057 (S0; 200 pools with S1..S2 water/lava), ramp 561 (S0..S2), stairs 24 (S0); wrong 0; solid strata at full HP (255) true
FAIL fills_0_to_5 - +1 over the valley cell (196,37) (ground below a floor, S4 air): 5/5 WRONG {"shape":"solid","top":4,"elev":89,"state":"HEIGHT_5_OF_5","solid":true,"frac":1} want {"shape":"solid","top":4,"elev":19,"state":"HEIGHT_5_OF_5","solid":true,"frac":1}, 4/5 WRONG {"shape":"floor","top":3,"elev":88,"state":"HEIGHT_4_OF_5","solid":false,"frac":0.8} want {"shape":"floor","top":3,"elev":18,"state":"HEIGHT_4_OF_5","solid":false,"frac":0.8}, 3/5 WRONG {"shape":"floor","top":2,"elev":87,"state":"HEIGHT_3_OF_5","solid":false,"frac":0.6} want {"shape":"floor","top":2,"elev":17,"state":"HEIGHT_3_OF_5","solid":false,"frac":0.6}, 2/5 WRONG {"shape":"floor","top":1,"elev":86,"state":"HEIGHT_2_OF_5","solid":false,"frac":0.4} want {"shape":"floor","top":1,"elev":16,"state":"HEIGHT_2_OF_5","solid":false,"frac":0.4}, 1/5 WRONG {"shape":"floor","top":0,"elev":85,"state":"HEIGHT_1_OF_5","solid":false,"frac":0.2} want {"shape":"floor","top":0,"elev":15,"state":"HEIGHT_1_OF_5","solid":false,"frac":0.2}, 0/5 ok
FAIL floor_on_substrate - 0/5 over the ground's floor (S4 air): open; 0/5 over a solid ground cell: {"shape":"floor","top":-1,"elev":84,"mat":"stone"} (want floor, no stratum of its own, elevation 14 = ground S4, stone); 0/5 at -2 (nothing below: lava): floor, elevation 69
PASS legacy_shapes_match - shapeCodeAt strata/pre-strata over 327680 cells (5 levels): 0 differ; cellAt material/constructed/liquid on every 97th cell: 0 differ
FAIL surface_elevation_matches - 64975 columns whose surface level S holds a floor: the stood-on stratum is S0 of level S, elevation (S + 2) x 5; wrong 64975 ((0,0) S 1: 85/0; (1,0) S 1: 85/0; (2,0) S 1: 85/0; (3,0) S 1: 85/0)
PASS headroom_walkability - ground (8,71): as generated {"shape":"floor","walk":true}; slab on +1 S0 (headroom 4) {"shape":"floor","walk":true}; ground 2/5 under the slab (headroom 3) {"shape":"solid","walk":false} (want solid, not walkable); slab removed {"shape":"floor","walk":true,"top":1}; back to the baseline {"shape":"floor","walk":true,"recorded":false} (no saved record)
PASS damage_single_stratum - hill rock on the ground (64,10): 30 dig on S2 -> HP 255 -> 191 (want 191), S1 255, S3 255; 200 more -> destroyed true: [stone,stone,air,stone,stone] HP [255,255,0,255,255]; HP left 480/480, support 0.80; shape solid (S0..S1 solid under a 1-stratum gap: headroom 1)
PASS destruction_changes_shape - cave floor at -1 (13,8), S0 soil: floor -> S0 destroyed -> open (the cell below is floor: standing on its top at elevation -1); levels:cellChanged 1
PASS damage_crosses_levels_box - box (64,10) from Z-1:S4 to Z0:S0, 500 blast: destroyed 2 on levels [-1,0]; -1 [soil,soil,soil,soil,air] HP [255,255,255,255,0], ground [air,stone,stone,stone,stone] HP [0,255,255,255,255]
FAIL sphere_aoe - sphere r 3 ft at the ground's S0 over (64,10), 240 dig, linear: HP {"-1:4":0,"-1:3":255,"-1:2":255,"0:0":0,"0:1":85,"0:2":255,"0:3":255} want {"-1:4":0,"-1:3":0,"-1:2":255,"0:0":0,"0:1":0,"0:2":85,"0:3":255} (0 = destroyed); 3 strata hit (want 7: -1 S2..S4, ground S0..S3), 2 destroyed, cells written 2 (want 2: this column's -1 and ground; the next cell's middle is 5 ft away), levels [-1,0]
PASS resistance_and_hooks - fire on stone x0.1: 10 -> HP 233; fire on wood x2: 20 -> HP 170; a stone hook returning 0: effective 0, HP 255, saw stone:blast; a "*" hook doubling 12 dig: 24 -> HP 204; impact on a pool's water stratum: fluid true, hit false, fluid hook saw [water], strata unchanged true
PASS events_on_destruction - cave floor (24,8) at -1: a small hit then a destroying one: strataDamaged 2, strataDestroyed 1 {"area":{"x":0,"y":0},"x":24,"y":8,"z":-1,"stratum":0,"material":"soil","constructed":false,"debris":"loose_earth","damageType":"dig","source":"TEST_pick"}, strataChanged 2, cellChanged at -1 after the destroying hit 1 (none for the HP-only hit true), shapeChanged 1
PASS overburden - hasOpaqueOverburden on every 3rd cell of 5 levels (109230) vs "a non-open cell anywhere above": 0 wrong; valley ground: open sky false; under a deck on +2 with +1 open true (Floors.hasOpaqueOverburden true, Floors.isRoofed true; the pre-strata isRoofed false: it looked one level up only); a stone S4 over an air gap in the cell true (+1 above it: false); deep rock at -1 roofed true
PASS shape_grids_coherent - cached grids 5, 327680 cells re-derived with the edits in place: 0 differ; column (8,71) -1/0/+1/+2 floor/open/floor/open (want floor/open/floor/open: -1 2/5, the ground dug out over it, a deck on +1, sky); after restoring: 0 differ
PASS migration_no_data_loss - pre-strata save (662 chars, 9 changed cells) loaded through DataManager.extractSaveContents: dig a -1 rock cell to a soil floor: floor/soil -> floor/soil; wall up a -1 cave floor: solid/stone -> solid/stone; wooden deck on +1 over the valley: floor/wood/built -> floor/wood/built; constructed ramp on +1: ramp/stone/built -> ramp/stone/built; stairs up at -1: stairUp/stone/water -> stairUp/stone/water; wooden deck over a -1 pool: floor/wood/built/water -> floor/wood/built/water; a hole in a +1 hilltop (open over solid ground): open/soil -> floor/stone; ground cell walled with soil: solid/soil -> solid/soil; record {"rule":"strata","to":1,"converted":9,"droppedAsBaseline":1,"invalid":0,"shapeChanged":1,"normalizedOpen":2,"errors":[]}; strataSchemaVersion 1; levels[z].cells gone true; checksums verified (0 mismatches)
PASS migration_profiles - solid_5_of_5 ok, open_0_of_5 ok, floor_S0 ok, deck_constructed ok, ramp_3_of_5 ok, stairs_S0_connector ok, pool_kept ok; e.g. ramp [stone,stone,stone,air,air] ramp, pool deck [wood,water,water,air,air]
PASS unknown_format_diagnostics - (a) strataSchemaVersion 99: console.error true, legacy cells left in place true, setShape refused true, damage refused true; (b) 5 junk legacy entries: invalid 5, console.error true, kept in unmigratedCells true, good entries applied true; (c) a corrupt strata record: console.error true, the other records read true
PASS save_load_strata_hp - ground rock (64,10) after dig: [stone,stone,stone,stone,air] HP [255,255,255,170,0]; +1 (196,37): [stone,water,air,air,air] HP [77,0,0,0,0]; same after save/load true; saved record "000101010100ffffffaa00" (22 hex digits = connector + 5 materials + 5 HP)
PASS unchanged_terrain_regenerates - saved strata records 9 = cells differing from their baseline 9 (of 327680); a fresh vm's five baselines equal byte for byte true; +1 (196,37) set back to its baseline (5 air): record dropped true
PASS fluid_adapter - DEUS_Fluid depth 0..7 -> strata [0,1,1,2,3,4,4,5], strata 0..5 -> depth [0,1,3,4,6,7], round trip true; passage bits: pool at -1 38 (capacity 6, down false, FLUID_2_OF_5), rock 0, +2 sky 63 (capacity 7, up true, down true); repeated calls equal true
PASS no_allocation_queries - 3 windows of 400,000 rounds x 5 queries (shapeCodeAt numeric and ref, surfaceHeightAt, hasOpaqueOverburden, getStrataFluidPassage; checksum 43398750): garbage collections inside the windows 0 (want 0), heap growth 270824 / 81304 / 87808 B, least 81304 (limit 2,000,000 = 1 B per query; one 16 B object per query would be 32 MB)
PASS query_cost - shapeCodeAt (ax, ay, x, y, z) on 4096 cells over the 5 levels, 1000000 calls after a warm-up: strata 979 ns/call, pre-strata 2521 ns/call (bound 2000 ns; the per-frame budget is measured in game)
PASS no_errors - none beyond the 3 the diagnostic check provoked
TIME 124.5 s
RESULT: 22 passed, 4 failed (exit 1) - fills_0_to_5, floor_on_substrate, surface_elevation_matches, sphere_aoe
```

`tools/test_strata_foundation.js` and `game/js/plugins/DEUS_Levels.js` are outside `allowedPaths`. This lane did not edit them and did not change those assertions.

### `node tools/check_deus_syntax.js` — EXIT 0

```
Checked 59 DEUS plugin files. Errors: 0
```

## Mutants

### `node tools/test_geology_strata.js --mutant` — EXIT 1

The diversity assertion is unchanged. Five stone types are found, so the `< 2` mutant requirement fails. The other eight checks still pass.

```
MUTANT --mutant: surface stone diversity must be < 2; a healthy world must fail
INFO plugins loaded: DEUS_World.js, DEUS_WorldGen.js, DEUS_Levels.js (26 ms)
INFO world seed 1074124084, size 256, areas 1x1, zRange -2..2 (state has no zRange: legacy)
INFO space 5 ft cell, 2 ft stratum
=== Running Geological Strata Test Suite ===
PASS geology.api_present - WorldGen.geologyAt and Levels.stratumAt are defined
FAIL geology.surface_strata_valid - sampled 196 cells: 5 stone types found (granite, slate, limestone, sandstone, basalt), all match catalog
PASS geology.determinism - cell (128,128) produced identical stone 'slate' across repeated calls
PASS geology.physical_properties_attached - stone Slate: density 2.65, compressiveStrength 65, workability 75
PASS geology.upper_earth_strata - Z=-1 stratum: stone 'limestone', depthBand 'upper_earth'
PASS geology.deep_earth_strata - Z=-2 stratum: stone 'slate', depthBand 'deep'
PASS geology.levels_stratum_at - Levels.stratumAt matches WorldGen.geologyAt: slate
PASS geology.cell_info_contains_geology - WorldGen.cellInfo(128,128,0) includes geology: stone 'slate'
PASS geology.levels_cell_at_contains_stratum - Levels.cellAt(64,64,-1) includes stratum: stone 'limestone'

RESULT: 8 passed, 1 failed (exit 1)
```

### `node tools/test_geology_strata.js --mutant=no_world` — EXIT 1

```
MUTANT no_world: DEUS_World.js is not loaded; plugin load must fail
HARNESS plugin failed to load: DEUS_Levels.js: Cannot read properties of undefined (reading 'Z_RANGES')
RESULT: 0 passed, 1 failed (exit 1)
```

## PROPOSED-BB-01

Repair `tools/test_column_landforms.js` and `tools/test_vertical_worldgen_proof.js` the same way. Each installs a hand-written `UF.World` (no `Z_RANGES`, no `UF.Space`) and then `require`s `DEUS_Levels.js`. On this base both exit 1 at load:

```
DEUS_Levels.js:69
    const CORE = window.UF.World.Z_RANGES.legacy;
TypeError: Cannot read properties of undefined (reading 'legacy')
```

`test_column_landforms.js` dies at its line 181. `test_vertical_worldgen_proof.js` dies at its line 236. No check runs. Same cause as this gate (`bdf45b4c`). Both files are outside this lane's `allowedPaths`.

A read of `tools/**/*.js` for `DEUS_Levels.js` found the other loaders already loading `DEUS_World.js` first (`test_strata_foundation.js`, `test_strata_cuts_and_caves.js`, `test_volumetric_terrain_column.js`, `test_upper_elevation_terrain.js`, `test_survival_regressions.js`, `test_native_survival_soak.js`, `test_19b_performance_determinism.js`, `test_strata_fluid_reconciliation.js`, `tools/sim/test_living_world_rules.js`, `tools/zrange/bench_queries.js`, `tools/capture_pre_migration_baseline.js`).

## PROPOSED-BB-02

`tools/test_strata_foundation.js` exits 1 on this base, as pasted above. `fills_0_to_5`, `floor_on_substrate`, and `surface_elevation_matches` want core-frame elevations (zMin -2). A New Game in that sandbox is `Z_RANGES.default` (-16..+15), and `worldStrataElevationAt` is `(z - zMin) * 5 + stratum`. `sphere_aoe` also fails (3 strata hit, the test wants 7); the test predates the 2 ft stratum / range-relative elevation in `bdf45b4c`. The fix is in that test or in the plugins, both outside this lane.
