# DEUS-TSK-GEOLOGY-GATE lane-bb report

Writer: grok. Branch: `task/lane-bb`. FIX1 base: `188fee267f6c95bd477736f3dc7dfce2c6e75a12`. FIX2 merged `origin/main` `6b8ac5e6dad1b4e9a67c6ce3e56c9ea75f6421b0` (includes the brief's `ecc7b898`).

## FIX2 — re-derive the strata foundation test for the current main

The test file moves. Plugins do not. Cause B is the documented new-world generator (B1). There is no `escalation_fix2.md`.

### Step 0

`git fetch origin` then `git merge --no-ff origin/main` on `task/lane-bb`. No conflict. Merge commit `7da40cae`. `origin/main` had moved one commit past the brief's `ecc7b898`: `6b8ac5e6` only edits `docs/STATUS.md`. The AV merge `42c3bc9a` (WG.00.15 `eed4776b`) is in that history.

### Reproduction on the merged tip, before this edit

`node tools/test_strata_foundation.js --quiet` at `7da40cae` (the worktree matched the fresh clone checked out at that SHA). EXIT 1.

```
TIME 147.0 s
RESULT: 18 passed, 8 failed (exit 1) - generation_deterministic, baseline_roundtrip, fills_0_to_5, floor_on_substrate, legacy_shapes_match, surface_elevation_matches, sphere_aoe, unchanged_terrain_regenerates
```

The eight FAIL lines:

```
FAIL generation_deterministic - checksums strata/pre-strata: -2: 4c8a28ca/1898af90 DIFFERENT, repeat same, seed+1 differs, seed 20260930 DIFFERENT bfc54f6e/af450852; -1: e9e10c09/3846830f DIFFERENT, repeat same, seed+1 differs, seed 20260930 DIFFERENT b6bfdc45/5ab7833e; 0: e51c7731/e51c7731 (WorldGen lattice of the live world); 1: fa009862/fa009862, repeat same, seed+1 differs, seed 20260930 same; 2: c548f665/c548f665, repeat same, seed+1 differs, seed 20260930 same
FAIL baseline_roundtrip - -2.material 61635 cells differ; -2.biome 65536 cells differ; -1.material 17883 cells differ; -1.biome 47550 cells differ
FAIL fills_0_to_5 - +1 over the valley cell (196,37): 5/5 elev 89 want 19, 4/5 88/18, 3/5 87/17, 2/5 86/16, 1/5 85/15, 0/5 ok. Shapes and HEIGHT_k_OF_5 match.
FAIL floor_on_substrate - 0/5 over air: open; over solid ground {"shape":"floor","top":-1,"elev":84,"mat":"stone"} want elevation 14; 0/5 at -2: floor, elevation 69 (want open, -1)
FAIL legacy_shapes_match - shapeCodeAt over 327680 cells: 0 differ; cellAt material on every 97th cell: 824 differ (-2 soil/stone)
FAIL surface_elevation_matches - 64975 columns, elevation (S + 2) x 5; wrong 64975 ((0,0) S 1: 85/0)
FAIL sphere_aoe - HP {"-1:4":0,"-1:3":255,"-1:2":255,"0:0":0,"0:1":85,"0:2":255,"0:3":255} want the 1 ft table; 3 strata hit (want 7), cells 2, levels [-1,0]
FAIL unchanged_terrain_regenerates - records 9 = changed 9; a fresh vm's five baselines equal byte for byte false; record dropped true
```

That is the PM table's `ecc7b898` row (18/8). Cause A's four lines are the same ones FIX1 recorded on `188fee26` / `d8fbdc9d`. Cause B's four appear with the AV merge, as the PM bisect says. This lane did not re-run `e57a5da6`, `bdf45b4c`, or `d8fbdc9d`.

### Cause A — the test still used the pre-WG.00.17 frame

`bdf45b4c` (WG.00.17, merged through Lane AA `1c2fcc28`) is the frame the Owner decided (DEC-013). The test's vm has no `process`, so New Game takes `Z_RANGES.default` (`docs/systems/DEUS_ZRange.md` section 3: `newWorldZRange()` is `DEUS_Z_RANGE` or else `Z_RANGES.default`).

| Check | Old expectation | Rule the test now uses | Doc |
|---|---|---|---|
| `fills_0_to_5` | `+1` fill k has elevation `15 + k - 1` (zMin -2) | `e = (1 - zMin) x STRATA_PER_LAYER + (k - 1)`; k = 0 stays -1 (the ground floor's S4 is air) | section 7, `e = (z - zMin) x 5 + s` |
| `floor_on_substrate` | elevation 14; at -2 always open, elevation -1 | over solid ground, elevation of that cell's S4, `(0 - zMin) x 5 + 4`. At -2: open and -1 when -2 is `zMin`; otherwise a floor on the solid level below, `elevationOf(-2, 0) - 1` | section 7; section 5 (`zMin`: nothing below to stand on); section 6 (below the core: solid stone) |
| `surface_elevation_matches` | `(S + 2) x 5` | `(S - zMin) x STRATA_PER_LAYER` (S0 of the surface level) | section 7 |
| `sphere_aoe` | 1 ft table, 7 strata at r = 3 ft, distances 0, 1, 2 ft | same column, distance `\|(z x STRATA_PER_LAYER + s) x STRATUM_FEET\|` from ground S0; hit when `<= 3`. HP is `ceil(240 x (1 - d/3) x dig resist x 255 / maxHP)` off 255 | section 7 (middle at `(e + 0.5) x STRATUM_FEET`; `STRATUM_FEET` 2). The 3 / 9 / 27 counts in that section are `tools/zrange/blast_tables.js` with the centre on -1 S2, not this fixture |
| `destruction_changes_shape` (solid branch only) | hardcoded elevation 4 | `elevationOf(-1, 0) - 1`, which is 4 when zMin is -2. This seed's cave still takes the open branch (below is a floor, elevation -1) | same elevation rule |

Live inputs, not literals of -16: `UF.World.zRange()`, `UF.World.Z_RANGES`, `UF.Space.STRATA_PER_LAYER`, `UF.Space.STRATUM_FEET`, `UF.Space.GRID_SIZE_FEET`. The host environment is not copied into the vm, so an ambient `DEUS_Z_RANGE` cannot move the default world.

The same three elevation checks also run in a second New Game with `DEUS_Z_RANGE=legacy` (`Z_RANGES.legacy`, -2..+2). There the old numbers still hold: `+1` at 5/5 is 19, ground S4 is 14, a cleared -2 cell is open at -1, and surface floors are `(S + 2) x 5`. The sphere is the same 3 hits at both ranges (zMin cancels; the feet come from `UF.Space`).

On the default world the derived numbers are the ones the old run printed as actual: 89, 84, 69, 85, and 3 strata with HP `{"-1:4":0,"0:0":0,"0:1":85}` (soil at -1 S4, stone on the ground).

### Cause B — B1, the new generator is documented

WG.00.15 (`eed4776b`, merged `42c3bc9a`) is the second break. The deciding lines, not the output:

- `docs/systems/DEUS_VerticalBiomes.md` line 3: a new world copies `verticalBiomeCoupling` on (default true). A save that does not carry the flag keeps the old 4×4 province roll, so its level checksums still match.
- Same doc, depth bands: Z-1 and Z-2 are both shallow (-8..-1). The old Z-2 deep set is the deep band, from Z-9 down. Every layer in a band gets the same substrate id for a column.
- `docs/systems/DEUS_ZRange.md` section 3, the legacy rule: an old 5-level save loads at -2..+2 and plays as before. Section 6: the core's geometry is generated as before, at every range.
- `tasks/WG.00.15/lane-av/REPORT.md`: coupling defaults on; the old roll remains for a save with no flag, so those checksums stay the bytes they were made with.

That is B1. The worlds this check builds with `newWorld` are new games, so the column rule is the intended generator. A save with the flag absent still regenerates the old roll. The pre-strata save this test writes has no flag (`world:initializing` is the only writer, and it runs on New Game, not on load). After load, its five baseline `strata.m` buffers equal an explicit coupling-off world byte for byte. The change does not alter what that old save regenerates to.

What moved, and what stayed exact:

- `generation_deterministic`. The coupling-off world (the constant copied onto the state is false) matches the pre-strata plugins of `2d5fc47` on all five levels, both seeds: `-2 1898af90`, `-1 3846830f`, `0 e51c7731`, `1 fa009862`, `2 c548f665`. Repeat matches, seed+1 differs (ground has no seed+1 test: it is the live WorldGen lattice). The coupling-on new game repeats, seed+1 differs, and levels 0, +1, +2 still equal the pre-strata checksums. Its -2/-1 checksums (`4c8a28ca`, `e9e10c09`) are stable and are not required to equal the pre-strata bytes.
- `baseline_roundtrip`. Coupling-off shape, material, water, and biome equal the pre-strata arrays on all 65536 cells of all 5 levels. The new game's shapes and water do too, and its levels 0, +1, +2 materials and biomes do too. Its -2 and -1 biome grids are one grid, every code in 1..4 (the shallow set). The coupling-off -2 grid is codes 5..8 and is not the -1 grid (the old deep / shallow split).
- `legacy_shapes_match`. New-game `shapeCodeAt` still matches pre-strata on all 327680 cells. Material, constructed, and liquid on every 97th cell match on the coupling-off world, and on the new game for levels 0, +1, +2. The 824 underground material mismatches (Z-2 soil against the old all-stone deep set) are the column rule, judged on the old-generator world.
- `unchanged_terrain_regenerates`. Records still equal changed cells (9), and putting +1 back to five air still drops the record. A fresh new game's five baselines equal the new game's snapshot. The loaded flag-absent save's baselines equal the old roll, not the new game.

### Mutants

All 29 exit 1. Four plugin anchors had moved with WG.00.17 (the -2..+2 literals are now `zMin`/`zMax`, and `toStrata`'s dense array is sealed away). The replacements hit the current lines and still fail the same checks. `storage_fat` now triples the dense compat copy in `defineDense`, so `strata.m.length === n * 5` fails.

| Mutant | EXIT | Failed checks |
|---|---|---|
| `storage_fat` | 1 | `storage_budget` |
| `lost_fluid` | 1 | `generation_deterministic`, `baseline_roundtrip`, `solid_open_columns`, `legacy_shapes_match`, `resistance_and_hooks`, `migration_no_data_loss`, `migration_profiles`, `fluid_adapter` |
| `no_headroom` | 1 | `headroom_walkability`, `damage_single_stratum` |
| `floor_needs_no_support` | 1 | `fills_0_to_5`, `floor_on_substrate`, `legacy_shapes_match`, `destruction_changes_shape`, `shape_grids_coherent`, `migration_no_data_loss` |
| `damage_neighbour` | 1 | `damage_single_stratum`, `sphere_aoe` |
| `no_cross_z` | 1 | `damage_crosses_levels_box`, `sphere_aoe` |
| `resist_ignored` | 1 | `resistance_and_hooks` |
| `hooks_ignored` | 1 | `resistance_and_hooks` |
| `no_destroy_event` | 1 | `damage_single_stratum`, `damage_crosses_levels_box`, `events_on_destruction` |
| `overburden_one_level` | 1 | `overburden` |
| `overburden_no_gap` | 1 | `overburden` |
| `hp_not_saved` | 1 | `save_load_strata_hp` |
| `migration_drops_constructed` | 1 | `migration_no_data_loss`, `migration_profiles` |
| `migration_ramp_flat` | 1 | `migration_profiles` |
| `unknown_schema_accepted` | 1 | `unknown_format_diagnostics` |
| `junk_applied` | 1 | `unknown_format_diagnostics` |
| `baseline_records_kept` | 1 | `headroom_walkability`, `unchanged_terrain_regenerates` |
| `fluid_table_wrong` | 1 | `fluid_adapter` |
| `alloc_in_query` | 1 | `no_allocation_queries` |
| `slow_query` | 1 | `query_cost` |
| `stale_grid` | 1 | `fills_0_to_5`, `floor_on_substrate`, `headroom_walkability`, `destruction_changes_shape`, `shape_grids_coherent` |
| `stale_neighbours` | 1 | `floor_on_substrate`, `headroom_walkability`, `shape_grids_coherent` |
| `error_injected` | 1 | `migration_no_data_loss` |
| `old_zmin` | 1 | `fills_0_to_5`, `floor_on_substrate`, `surface_elevation_matches` |
| `legacy_as_default` | 1 | `fills_0_to_5`, `floor_on_substrate`, `surface_elevation_matches` |
| `blast_1ft` | 1 | `sphere_aoe` (3 hit, the 1 ft expectation wants 7) |
| `coupled_vs_pre_strata` | 1 | `generation_deterministic`, `baseline_roundtrip`, `legacy_shapes_match` |
| `old_save_as_new_game` | 1 | `unchanged_terrain_regenerates` |
| `shallow_band_split` | 1 | `baseline_roundtrip` |

`old_zmin` judges the default world with `Z_RANGES.legacy.zMin` and gets the pre-WG.00.17 wants (19, 14, open/-1, `(S+2) x 5`) against the live default world. `legacy_as_default` judges the legacy world with `Z_RANGES.default.zMin`. `blast_1ft` sets the expectation's stratum to 1 ft. `coupled_vs_pre_strata` requires the coupling-on -2/-1 bytes to equal `2d5fc47`. `old_save_as_new_game` requires the flag-absent save to equal the new game. `shallow_band_split` requires the new game's Z-2 to differ from Z-1.

### Note for the PM

The AV merge was gated on that lane's own tests. The repo `gate` list in `tools/ops/gate_tests.json` includes `tools/test_strata_foundation.js` (and `tools/test_strata_cuts_and_caves.js`). This lane did not edit `gate_tests.json`.

`node tools/test_strata_cuts_and_caves.js` is red on this tip for reasons outside `allowedPaths`. Its nested `foundation_suite` is green (this repair). The other seven failures are in that file and the plugins. See `escalation.md` and PROPOSED-BB-03. This lane did not edit them.

### Open Owner questions

Listed only. This lane does not answer them.

- `docs/systems/DEUS_ZRange.md` section 11: the default split -16..+15 is still the PM default and open for the Owner. The test reads `Z_RANGES.default` through the API.
- Same section: ADR-003 Q16 (old saves) is open. The implemented legacy rule is what this test pins.
- Same section: lava stays on -2; whether it belongs deeper is open.
- `tasks/WG.00.15/lane-av/REPORT.md`: DEC-030's band edges versus the DEC-013 bands this coupling uses; whether a `deep_magma` substrate should exist; whether rock below -2 should be carved.

### Gate output (final tree)

#### `node tools/test_strata_foundation.js` — EXIT 0

```
=== DEUS-TSK-FABLE-19A strata foundation: seed 20260923 (second seed 20260930) ===
INFO newWorld 11173 ms with strata, 13195 ms pre-strata, 9156 ms uncoupled, 9468 ms legacy range; area 0,0, 256x256
INFO zRange new game -16..15 (Z_RANGES.default), legacy proof -2..2 (Z_RANGES.legacy); stratum 2 ft, 5 strata/layer, cell 5 ft
INFO coupling new game true, old-generator world false
INFO fixtures valley (196,37), valley2 (8,71), deepRock (64,10), pool (19,8), cave (13,8), cave2 (24,8), hillTop (8,8), deep2 (11,8)
PASS storage_budget - strata 1336320 B + connectors 133632 B + cached shape grids 327680 B = 1797632 B (1.71 MiB) for the 5 levels of area 0,0, limit 3500000 B; also held: biome 131072 B, shared surface grid 65536 B, legacy views built so far 0 B, total 1998336 B; flat Uint8Array 65536x5 per level true; baseline HP implicit (full) true; +1 legacy views not built before a read true
PASS generation_deterministic - checksums: old-generator -2: 1898af90/1898af90, repeat same, seed+1 differs, seed 20260930 same; old-generator -1: 3846830f/3846830f, repeat same, seed+1 differs, seed 20260930 same; old-generator 0: e51c7731/e51c7731 (WorldGen lattice); old-generator 1: fa009862/fa009862, repeat same, seed+1 differs, seed 20260930 same; old-generator 2: c548f665/c548f665, repeat same, seed+1 differs, seed 20260930 same; new game -2: repeat same, seed+1 differs, new-generator 4c8a28ca (not required to equal pre-strata 1898af90); new game -1: repeat same, seed+1 differs, new-generator e9e10c09 (not required to equal pre-strata 3846830f); new game 0: repeat same, seed+1 n/a, pre-strata same; new game 1: repeat same, seed+1 differs, pre-strata same; new game 2: repeat same, seed+1 differs, pre-strata same
PASS baseline_roundtrip - old-generator shape, material, water and biome equal the pre-strata arrays byte for byte (65536 cells, 5 levels); new game shapes and water match, and -2/-1 are one shallow-band grid
PASS solid_open_columns - 5 levels: solid 143840 (5/5 solid strata), open 53198 (5/5 air), floor 130057 (S0; 200 pools with S1..S2 water/lava), ramp 561 (S0..S2), stairs 24 (S0); wrong 0; solid strata at full HP (255) true
PASS fills_0_to_5 - +1 over the valley cell (196,37) (ground below a floor, S4 air): default zMin -16 [5/5 ok, 4/5 ok, 3/5 ok, 2/5 ok, 1/5 ok, 0/5 ok]; legacy zMin -2 [5/5 ok, 4/5 ok, 3/5 ok, 2/5 ok, 1/5 ok, 0/5 ok]; ranges true
PASS floor_on_substrate - default zMin -16: 0/5 over air open; over solid ground {"shape":"floor","top":-1,"elev":84,"mat":"stone"} (want floor, top -1, elevation 84 = ground S4, stone); 0/5 at -2 floor, elevation 69 (want floor, 69); legacy zMin -2: over solid {"shape":"floor","top":-1,"elev":14,"mat":"stone"} (want 14); at -2 open, elevation -1 (want open, -1)
PASS legacy_shapes_match - shapeCodeAt new game/pre-strata over 327680 cells (5 levels): 0 differ; cellAt material/constructed/liquid on every 97th cell of the old-generator world: 0 differ; new game surface levels: 0 differ
PASS surface_elevation_matches - 64975 columns whose surface level S holds a floor: stood-on stratum is S0, elevation (S - zMin) x 5; default zMin -16 wrong 0; legacy zMin -2 wrong 0 (legacy zMin is Z_RANGES.legacy true)
PASS headroom_walkability - ground (8,71): as generated {"shape":"floor","walk":true}; slab on +1 S0 (headroom 4) {"shape":"floor","walk":true}; ground 2/5 under the slab (headroom 3) {"shape":"solid","walk":false} (want solid, not walkable); slab removed {"shape":"floor","walk":true,"top":1}; back to the baseline {"shape":"floor","walk":true,"recorded":false} (no saved record)
PASS damage_single_stratum - hill rock on the ground (64,10): 30 dig on S2 -> HP 255 -> 191 (want 191), S1 255, S3 255; 200 more -> destroyed true: [stone,stone,air,stone,stone] HP [255,255,0,255,255]; HP left 480/480, support 0.80; shape solid (S0..S1 solid under a 1-stratum gap: headroom 1)
PASS destruction_changes_shape - cave floor at -1 (13,8), S0 soil: floor -> S0 destroyed -> open (the cell below is floor: standing on its top at elevation -1); levels:cellChanged 1
PASS damage_crosses_levels_box - box (64,10) from Z-1:S4 to Z0:S0, 500 blast: destroyed 2 on levels [-1,0]; -1 [soil,soil,soil,soil,air] HP [255,255,255,255,0], ground [air,stone,stone,stone,stone] HP [0,255,255,255,255]
PASS sphere_aoe - sphere r 3 ft at the ground's S0 over (64,10), 240 dig, linear, stratum 2 ft: default HP {"-1:0":255,"-1:1":255,"-1:2":255,"-1:3":255,"-1:4":0,"0:0":0,"0:1":85,"0:2":255,"0:3":255,"0:4":255} want {"-1:0":255,"-1:1":255,"-1:2":255,"-1:3":255,"-1:4":0,"0:0":0,"0:1":85,"0:2":255,"0:3":255,"0:4":255} (0 = destroyed); 3 strata hit (want 3), 2 destroyed (want 2), cells written 2 (want 2: this column's -1 and ground; the next cell's middle is 5 ft, outside the radius true), levels [-1,0]; legacy range 3 hit (want 3), cells 2, HP match true
PASS resistance_and_hooks - fire on stone x0.1: 10 -> HP 233; fire on wood x2: 20 -> HP 170; a stone hook returning 0: effective 0, HP 255, saw stone:blast; a "*" hook doubling 12 dig: 24 -> HP 204; impact on a pool's water stratum: fluid true, hit false, fluid hook saw [water], strata unchanged true
PASS events_on_destruction - cave floor (24,8) at -1: a small hit then a destroying one: strataDamaged 2, strataDestroyed 1 {"area":{"x":0,"y":0},"x":24,"y":8,"z":-1,"stratum":0,"material":"soil","constructed":false,"debris":"loose_earth","damageType":"dig","source":"TEST_pick"}, strataChanged 2, cellChanged at -1 after the destroying hit 1 (none for the HP-only hit true), shapeChanged 0
PASS overburden - hasOpaqueOverburden on every 3rd cell of 5 levels (109230) vs "a non-open cell anywhere above": 0 wrong; valley ground: open sky false; under a deck on +2 with +1 open true (Floors.hasOpaqueOverburden true, Floors.isRoofed true; the pre-strata isRoofed false: it looked one level up only); a stone S4 over an air gap in the cell true (+1 above it: false); deep rock at -1 roofed true
PASS shape_grids_coherent - cached grids 5, 327680 cells re-derived with the edits in place: 0 differ; column (8,71) -1/0/+1/+2 floor/open/floor/open (want floor/open/floor/open: -1 2/5, the ground dug out over it, a deck on +1, sky); after restoring: 0 differ
PASS migration_no_data_loss - pre-strata save (662 chars, 9 changed cells) loaded through DataManager.extractSaveContents: dig a -1 rock cell to a soil floor: floor/soil -> floor/soil; wall up a -1 cave floor: solid/stone -> solid/stone; wooden deck on +1 over the valley: floor/wood/built -> floor/wood/built; constructed ramp on +1: ramp/stone/built -> ramp/stone/built; stairs up at -1: stairUp/stone/water -> stairUp/stone/water; wooden deck over a -1 pool: floor/wood/built/water -> floor/wood/built/water; a hole in a +1 hilltop (open over solid ground): open/soil -> floor/stone; ground cell walled with soil: solid/soil -> solid/soil; record {"rule":"strata","to":1,"converted":9,"droppedAsBaseline":1,"invalid":0,"shapeChanged":1,"normalizedOpen":2,"errors":[]}; strataSchemaVersion 1; levels[z].cells gone true; checksums verified (0 mismatches)
PASS migration_profiles - solid_5_of_5 ok, open_0_of_5 ok, floor_S0 ok, deck_constructed ok, ramp_3_of_5 ok, stairs_S0_connector ok, pool_kept ok; e.g. ramp [stone,stone,stone,air,air] ramp, pool deck [wood,water,water,air,air]
PASS unknown_format_diagnostics - (a) strataSchemaVersion 99: console.error true, legacy cells left in place true, setShape refused true, damage refused true; (b) 5 junk legacy entries: invalid 5, console.error true, kept in unmigratedCells true, good entries applied true; (c) a corrupt strata record: console.error true, the other records read true
PASS save_load_strata_hp - ground rock (64,10) after dig: [stone,stone,stone,stone,air] HP [255,255,255,170,0]; +1 (196,37): [stone,water,air,air,air] HP [77,0,0,0,0]; same after save/load true; saved record "000101010100ffffffaa00" (22 hex digits = connector + 5 materials + 5 HP)
PASS unchanged_terrain_regenerates - saved strata records 9 = cells differing from their baseline 9 (of 327680); a fresh new game equals the new-game baselines true; flag-absent save (flag absent) equals the old roll true; +1 (196,37) set back to its baseline (5 air): record dropped true
PASS fluid_adapter - DEUS_Fluid depth 0..7 -> strata [0,1,1,2,3,4,4,5], strata 0..5 -> depth [0,1,3,4,6,7], round trip true; passage bits: pool at -1 38 (capacity 6, down false, FLUID_2_OF_5), rock 0, +2 sky 63 (capacity 7, up true, down true); repeated calls equal true
PASS no_allocation_queries - 3 windows of 400,000 rounds x 5 queries (shapeCodeAt numeric and ref, surfaceHeightAt, hasOpaqueOverburden, getStrataFluidPassage; checksum 43398750): garbage collections inside the windows 0 (want 0), heap growth 268192 / 82240 / 85792 B, least 82240 (limit 2,000,000 = 1 B per query; one 16 B object per query would be 32 MB)
PASS query_cost - shapeCodeAt (ax, ay, x, y, z) on 4096 cells over the 5 levels, 1000000 calls after a warm-up: strata 742 ns/call, pre-strata 1962 ns/call (bound 2000 ns; the per-frame budget is measured in game)
PASS no_errors - none beyond the 3 the diagnostic check provoked
TIME 179.8 s
RESULT: 26 passed, 0 failed (exit 0)
```

EXIT=0

#### `node tools/test_geology_strata.js` — EXIT 0

```
INFO plugins loaded: DEUS_World.js, DEUS_WorldGen.js, DEUS_Levels.js (25 ms)
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

EXIT=0

#### `node tools/check_deus_syntax.js` — EXIT 0

```
Checked 60 DEUS plugin files. Errors: 0
```

EXIT=0

#### `node tools/test_strata_cuts_and_caves.js` — EXIT 1

This file is outside `allowedPaths`. The nested `foundation_suite` is green. The other seven failures are escalated. Full run:

```
=== DEUS-TSK-FABLE-19B natural cuts and all-Z caves: regression seed 18, second seed 3, seed set 18,3,21,4 ===
INFO newWorld seed 18: generator 5 11439 ms, generator 4 (same code, levelsGen 4) 11708 ms, pre-19B code 11495 ms; natural features 468 ms
INFO seed set built: 18, 3, 21, 4 (120 s)
FAIL deterministic_same_seed - seed 18 in two vms: strata+connectors+caps per level -2:same -1:same 0:same 1:same 2:same, feature list same; regenerated inside seed 3's world: -2: e96252ee/6bfcdbb1 DIFFERENT, -1: 5e3c240b/29e5254d DIFFERENT, 1: eaf389b9, 2: 9998ffb2
PASS different_seeds_differ - carved columns: seed 18 4997, seed 3 2027, shared 195 (overlap 2.9 %, limit 25 %); cut anchors 19 / 8, at the same cell 0 (0 %, limit 30 %); seed 3 valid (no floating mass, caves present) true
FAIL old_generator_unchanged - generator 4 (levelsGen 4) vs the pre-19B code (19fcf0e), seed 18: strata per level -2:DIFFERENT -1:DIFFERENT 0:same 1:same 2:same; checksums -2:9978c5f8/666ada13 -1:f023c77b/8eda2b93 0:0779462c 1:1496eea4 2:ae3e6025; no features or caps true; a pre-V80 migration's generators [4,4,4,4,4]
PASS carve_only_removes - 4 seeds, generator 4 -> 5: solid strata carved to air 57026; +2 massif fill on capped summit columns 5345; air -> matter elsewhere 0, solid material changed 0, fluid removed 0; connectors: ramps added 754, other changes on unchanged columns 0
PASS partial_heights - cut columns of seed 18 by the fill of the cell holding the new top: HEIGHT_1_OF_5 519 e.g. (72,24,-1), HEIGHT_2_OF_5 301 e.g. (77,31,-1), HEIGHT_3_OF_5 472 e.g. (76,29,-1), HEIGHT_4_OF_5 654 e.g. (71,24,-1), HEIGHT_5_OF_5 1064 e.g. (69,23,-1) (want >= 5 each); heightStateAt disagreeing 0
PASS z0_to_z1_exposure - 751 generated columns of seed 18 open from the ground down to a floor in -1; deepest (190,83): first air 5 ft, ground cell open, -1 cell floor (HEIGHT_0_OF_5), overburden false
PASS z1_to_z2_exposure - 31 generated sky-open columns of seed 18 whose -1 cell is all air over a floor in -2; deepest (194,89): first air 3 ft, -1 open, -2 floor HEIGHT_3_OF_5
PASS feature_reaches_z2 - a connected generated cut of seed 18: 207 columns, host levels [1], deepest first air 3 ft at (194,89); traced through the cut up to a column whose natural surface is the ground or higher true
PASS shallow_more_common - generated cut components over 4 seeds by realized depth: shallow (<= 4 ft) 66, deeper partial 28, exposing -1 to its S0 20, reaching -2 8 (want shallow >= 3 x reaching -2, and at least one reaching -2); 18: 23 shallow / 3 to -2; 3: 8 shallow / 1 to -2; 21: 18 shallow / 2 to -2; 4: 17 shallow / 2 to -2
PASS caves_on_all_levels - roofed generated cave floors over 4 seeds by level: 2: 930 (seed 18 (87,208)), 1: 1403 (seed 18 (47,98)), 0: 1619 (seed 18 (174,47)), -1: 1378 (seed 18 (43,205)), -2: 2181 (seed 18 (41,206))
PASS cave_free_terrain - 18: cave columns 2058 (3.14 %), massif 691 (1.05 %); 3: cave columns 1531 (2.34 %), massif 290 (0.44 %); 21: cave columns 1927 (2.94 %), massif 262 (0.40 %); 4: cave columns 1686 (2.57 %), massif 1006 (1.54 %) (limits 5 % and 3 %)
PASS traversable_terrain - 18: standable 125240/124320 (100.7 %), ground 24408/23939 (102.0 %), largest ground region 14148/14537 (97.3 %), start valley untouched true; 3: standable 128150/127194 (100.8 %), ground 39962/39468 (101.3 %), largest ground region 39557/39320 (100.6 %), start valley untouched true; 21: standable 127618/126036 (101.3 %), ground 12686/11478 (110.5 %), largest ground region 3348/3348 (100.0 %), start valley untouched true; 4: standable 123812/123627 (100.1 %), ground 15315/14346 (106.8 %), largest ground region 4442/4457 (99.7 %), start valley untouched true
FAIL cave_overburden - seed 18: 2128 roofed generated cave floors (hasOpaqueOverburden true and continuousAirHeight = the air run of the strata), 0 sky-open cut floors (no overburden, Infinity); wrong 0; network chambers roofed at their centres 47/48 (want >= 90 %: a mouth or a cut can open a few): #7 (22,201) floor 10: open to the sky
PASS cave_void_minimum - roofed generated cave voids over 4 seeds by height (ft): {"3":852,"4":1995,"5":2130,"6":1071,"7":1047,"8":301,"9":77,"10":20,"11":5,"12":8,"13":3,"14":2}; under 3 ft 0
FAIL roof_breach - threw TypeError: Cannot read properties of null (reading 'material') |     at C:\Users\snewt\.deus_worktrees\lane-bb\tools\test_strata_cuts_and_caves.js:807:44 |     at guard (C:\Users\snewt\.deus_worktrees\lane-bb\tools\test_strata_cuts_and_caves.js:187:18)
FAIL clearance_4_5_more - fixture column (64,30): 1 solid + 4 air under solid 4 ft (derived shape floor: the compatibility view; the clearance is the data), 5 air on -2's S4 5, across -1 and the ground 6 (airRunAt 0), up to +1 9, open sky Infinity, a 2 ft slot 2 (shape solid), solid 0, no floor -1; restored records 0; generated floors: 4 ft NONE, 5 ft NONE, > 5 ft NONE; 1,000,000 queries 1331 ns each, heap growth 65264 B (checksum 6075000)
FAIL clearance_stops_at_fluid - fixture column (64,30): -1 stone + 4 water, ground solid: continuousAirHeight 0 (want 0), airRunAt(6) 0 (want 0); -1 stone + 2 air + 2 water: continuousAirHeight 2 (want 2), airRunAt(6) 0 (want 2) WRONG; -1 stone + water + 3 air (from the floor): continuousAirHeight 0 (want 0), airRunAt(6) 0 (want 0); the same, air run from S2: continuousAirHeight 0 (want 0), airRunAt(7) 0 (want 3) WRONG; -2 stone + 4 lava, -1 solid: continuousAirHeight 0 (want 0), airRunAt(1) 0 (want 0); -2 stone + 4 air, -1 solid (control): continuousAirHeight 4 (want 4), airRunAt(1) 0 (want 4) WRONG; restored records 0
PASS multi_z_connectivity - 3 networks flagged multi-Z in seed 18; #6 from (202,50) floor 10 ft: 658 air strata (roofed), floors on levels [-1,0]; natural ramp connectors added 294, e.g. (71,24,-1) derived ramp
PASS shafts_keep_fluid - seed 18: 2 shafts (2 with rock under water), 0 skylights (0 with rock under water); seed 3: 3 shafts (0 with rock under water), 10 skylights (10 with rock under water); total rock strata under water: 38 (shafts 8, skylights 30), carved 0; after the carve: every planted water stratum still water, no rock under it carved
PASS no_floating_mass - solid strata not connected to bedrock or the area edge: 18: generator 5 0, generator 4 0; 3: generator 5 0, generator 4 0; 21: generator 5 0, generator 4 0; 4: generator 5 0, generator 4 0; the generator removed 2 unconnected strata in seed 18
PASS protections - 4 seeds: 208 underground founding squares and pools with their roofs, 106 cliff cave mouths with their corridors, the 12-cell area edge (0 changed), 29801 valley cells within 2 of a cut checked for surface water (0 wet)
PASS ground_holes - seed 18: 1116 open ground cells (natural cuts): rock face on layers 0 and 2, region 250, not walkable, cellInfo not walkable, no object; objects on unstandable cut cells at +1/+2 0; volumeStats.open 1116
PASS save_load - generator-5 world saved (636 chars of world state) and loaded: checksums verified (0 mismatches), the dug cave floor (223,46,-1) kept [air,air,air,air,air] (changed true); loaded into a fresh vm that had another world: its checksums regenerate and the dig is there true
FAIL no_parallel_authority - baseline members beyond strata, connectors, biome, surface, caps, legacy views and descriptors: -2.cw (unknown member), -2.dir (unknown member), -2.mixed (unknown member), -2.mixedCount (unknown member), -2.shift (unknown member), -2.mask (unknown member), -1.cw (unknown member), -1.dir (unknown member), -1.mixed (unknown member), -1.mixedCount (unknown member), -1.shift (unknown member), -1.mask (unknown member), 0.cw (unknown member), 0.dir (unknown member), 0.mixed (unknown member), 0.mixedCount (unknown member), 0.shift (unknown member), 0.mask (unknown member), 1.cw (unknown member), 1.dir (unknown member), 1.mixed (unknown member), 1.mixedCount (unknown member), 1.shift (unknown member), 1.mask (unknown member), 2.cw (unknown member), 2.dir (unknown member), 2.mixed (unknown member), 2.mixedCount (unknown member), 2.shift (unknown member), 2.mask (unknown member); feature descriptors 11888 chars (no per-cell grid)
PASS cost - seed 18: newWorld generator 5 11439 ms vs generator 4 11708 ms (same code) vs pre-19B 11495 ms; natural features 468 ms (bound 3000); seed set newWorld 3: 11948/11142 ms, 21: 12393/11639 ms, 4: 12513/11795 ms; baselines' own memory per area (strata, connectors, biome, surface, caps) 1886104 B vs 1739776 B (caps 691 entries, ~5528 B; bound +256 KiB), with the cached shape grids and built legacy views 4544408 B vs 2071552 B; fresh save 636 vs 723 chars of world state
PASS fluid_suite - node tools/test_strata_fluid_reconciliation.js: exit 0 in 208 s; PASSED: 36; FAILED: 0; MUTANT VERIFICATION: 5/5 mutants detected.
PASS foundation_suite - node tools/test_strata_foundation.js: exit 0 in 217 s; RESULT: 26 passed, 0 failed (exit 0)
PASS no_errors - none
TIME 216.9 s
RESULT: 21 passed, 7 failed (exit 1) - deterministic_same_seed, old_generator_unchanged, cave_overburden, roof_breach, clearance_4_5_more, clearance_stops_at_fluid, no_parallel_authority
```

EXIT=1

## FIX1 — strata foundation is already red on main

PM pre-review of tip `217753520073caf5ace303874652944986c4de81` (full clone `prereview_bb_20260927_115745`) was RED on `node tools/test_strata_foundation.js`: 22 passed, 4 failed (`fills_0_to_5`, `floor_on_substrate`, `surface_elevation_matches`, `sphere_aoe`). Geology and syntax were green.

Those four failures are on the merge base. This lane did not change `tools/test_strata_foundation.js` or any plugin. A fresh clone of the base fails the same four checks, with the same four FAIL lines. The geology harness is not an input to that test, so there is no edit inside `allowedPaths` that can turn it green. The assertions were not weakened. Stop, and escalate below.

### What the geology diff changed

`git diff 188fee267f6c95bd477736f3dc7dfce2c6e75a12 217753520073caf5ace303874652944986c4de81` changes one code file: `tools/test_geology_strata.js` (195 insertions, 74 deletions). The other files in that range are this lane's brief, `lane.json`, and the first report.

On the merge base the harness built a hand-written `UF.World` (`state`, `inWorld`, `currentArea`, `viewLevel`, `registerGenerator`, `unregisterGenerator`) and ran only `DEUS_WorldGen.js` and `DEUS_Levels.js`. It never loaded `DEUS_World.js`. After `bdf45b4c` (2026-09-26), `DEUS_Levels.js` reads `window.UF.World.Z_RANGES.legacy` at load, so that stub threw before any check.

The tip loads the real plugins in a Node `vm`, in order: `DEUS_World.js`, `DEUS_WorldGen.js`, `DEUS_Levels.js`. Engine stubs are only what those files touch at load, in the same shape as `setup()` in `tools/test_strata_foundation.js` (`PluginManager.parameters` from `game/js/plugins.js`, the Tilemap constants section of `rmmz_core.js`, and the constructors they alias). A plugin that throws is caught and the process exits 1 with one `HARNESS` line. The world under test is the one the nine checks were written against: seed `1074124084`, size 256, one area, no `zRange`, which `DEUS_World` reads as legacy -2..+2. The nine checks are unchanged. `--mutant` still requires fewer than 2 surface stone types. `--mutant=no_world` skips `DEUS_World.js` and must exit 1.

`tools/test_strata_foundation.js` does not load that file. It never has.

### Side-by-side

Two fresh clones of `C:/Users/snewt/OneDrive/Desktop/UF` (`git clone --shared --sparse`), sparse paths `tools`, `game/js`, `game/data`, detached at the commit. `DEUS_Z_RANGE` was unset. SHA-256 identical on both clones: `tools/test_strata_foundation.js`, `tools/check_deus_syntax.js`, `game/js/plugins.js`, `DEUS_World.js`, `DEUS_WorldGen.js`, `DEUS_Tiles.js`, `DEUS_Objects.js`, `DEUS_Levels.js`, `DEUS_Floors.js`, `DEUS_Core.js`. Only `tools/test_geology_strata.js` differed.

Both foundation runs: seed 20260923, the same fixtures (`valley (196,37)`, `deepRock (64,10)`, …), the same level checksums (`-2: 1898af90`, `-1: 3846830f`, `0: e51c7731`, `1: fa009862`, `2: c548f665`). The four FAIL lines are byte-identical, and they match the PM full-clone `lane-bb_gate2.out`. TIME and the allocation-check heap bytes differ; the checks do not.

Merge-base `188fee267f6c95bd477736f3dc7dfce2c6e75a12`:

```
RESULT: 22 passed, 4 failed (exit 1) - fills_0_to_5, floor_on_substrate, surface_elevation_matches, sphere_aoe
```

Tip `217753520073caf5ace303874652944986c4de81`:

```
RESULT: 22 passed, 4 failed (exit 1) - fills_0_to_5, floor_on_substrate, surface_elevation_matches, sphere_aoe
```

The shared FAIL lines:

```
FAIL fills_0_to_5 - +1 over the valley cell (196,37) (ground below a floor, S4 air): 5/5 WRONG {"shape":"solid","top":4,"elev":89,"state":"HEIGHT_5_OF_5","solid":true,"frac":1} want {"shape":"solid","top":4,"elev":19,"state":"HEIGHT_5_OF_5","solid":true,"frac":1}, 4/5 WRONG {"shape":"floor","top":3,"elev":88,"state":"HEIGHT_4_OF_5","solid":false,"frac":0.8} want {"shape":"floor","top":3,"elev":18,"state":"HEIGHT_4_OF_5","solid":false,"frac":0.8}, 3/5 WRONG {"shape":"floor","top":2,"elev":87,"state":"HEIGHT_3_OF_5","solid":false,"frac":0.6} want {"shape":"floor","top":2,"elev":17,"state":"HEIGHT_3_OF_5","solid":false,"frac":0.6}, 2/5 WRONG {"shape":"floor","top":1,"elev":86,"state":"HEIGHT_2_OF_5","solid":false,"frac":0.4} want {"shape":"floor","top":1,"elev":16,"state":"HEIGHT_2_OF_5","solid":false,"frac":0.4}, 1/5 WRONG {"shape":"floor","top":0,"elev":85,"state":"HEIGHT_1_OF_5","solid":false,"frac":0.2} want {"shape":"floor","top":0,"elev":15,"state":"HEIGHT_1_OF_5","solid":false,"frac":0.2}, 0/5 ok
FAIL floor_on_substrate - 0/5 over the ground's floor (S4 air): open; 0/5 over a solid ground cell: {"shape":"floor","top":-1,"elev":84,"mat":"stone"} (want floor, no stratum of its own, elevation 14 = ground S4, stone); 0/5 at -2 (nothing below: lava): floor, elevation 69
FAIL surface_elevation_matches - 64975 columns whose surface level S holds a floor: the stood-on stratum is S0 of level S, elevation (S + 2) x 5; wrong 64975 ((0,0) S 1: 85/0; (1,0) S 1: 85/0; (2,0) S 1: 85/0; (3,0) S 1: 85/0)
FAIL sphere_aoe - sphere r 3 ft at the ground's S0 over (64,10), 240 dig, linear: HP {"-1:4":0,"-1:3":255,"-1:2":255,"0:0":0,"0:1":85,"0:2":255,"0:3":255} want {"-1:4":0,"-1:3":0,"-1:2":255,"0:0":0,"0:1":0,"0:2":85,"0:3":255} (0 = destroyed); 3 strata hit (want 7: -1 S2..S4, ground S0..S3), 2 destroyed, cells written 2 (want 2: this column's -1 and ground; the next cell's middle is 5 ft away), levels [-1,0]
```

### Why the numbers differ from the assertions

`tools/test_strata_foundation.js` was last changed in `116a3de9` (2026-09-25 11:39 -0500), before `bdf45b4c` (2026-09-26 07:59 -0500). Its `setup()` does not put `process` in the vm. `DEUS_World.newWorldZRange()` then does not see `DEUS_Z_RANGE` and a New Game gets `Z_RANGES.default` (-16..+15). `docs/systems/DEUS_ZRange.md` (the `default` row, and the New Game paragraph). `elevationOf` is `(z - zMin) * 5 + s` (`DEUS_Levels.js`). The test still hardcodes the legacy frame, zMin -2. The offset is `(-2 - (-16)) * 5 = 70`.

- `fills_0_to_5`: +1, 5/5 wants elevation 19 and gets 89. 19 = `(1 - (-2)) * 5 + 4`. 89 = `(1 - (-16)) * 5 + 4`. Shape and `HEIGHT_k_OF_5` match.
- `surface_elevation_matches`: wants `(S + 2) * 5`. Surface level 1 is 15 on that frame and 85 on -16..+15 (`(1 - (-16)) * 5 + 0`). Every one of the 64975 columns is wrong by that offset. The stood-on stratum top is still 0.
- `floor_on_substrate`: 0/5 over solid ground wants elevation 14 (legacy ground S4) and gets 84. At z=-2 the test wants open and elevation -1, because -2 is the bottom of the legacy range and nothing is below it. On -16..+15 the level below is z=-3, and a level under the core is solid rock (`outerBaseline`, `z < CORE.zMin`). `worldStrataElevationAt` then returns `elevationOf(-2, 0) - 1 = 69`, and the shape is floor.
- `sphere_aoe`: the test's distance table is the 1 ft stratum (`|e + 0.5 - 10.5|` ft, 7 strata inside a 3 ft radius). `docs/systems/DEUS_ZRange.md` records the change: a stratum is 2 ft, so the same radius reaches half as many strata, and the 2 ft table at 3 ft is 3 strata. The run hit 3. `DEUS_Levels.js` says the same thing on `applyVolumeDamage`. The +70 offset cancels out of the distances. This failure is the 2 ft stratum.

Repairing that means editing `tools/test_strata_foundation.js` or the plugins. Both are outside `allowedPaths`. This lane does not do it.

### Fresh-clone gate exits at the tip

Clone HEAD `217753520073caf5ace303874652944986c4de81`. `DEUS_Z_RANGE` unset.

```
node tools/test_geology_strata.js
EXIT=0
RESULT: 9 passed, 0 failed (exit 0)

node tools/check_deus_syntax.js
EXIT=0
Checked 59 DEUS plugin files. Errors: 0

node tools/test_strata_foundation.js
EXIT=1
RESULT: 22 passed, 4 failed (exit 1) - fills_0_to_5, floor_on_substrate, surface_elevation_matches, sphere_aoe
```

The RESULT and Checked lines are from the side-by-side run in that clone. The `EXIT=` lines are `$LASTEXITCODE` from a later `node` run of the same three commands in the same clone: geology 0, syntax 0, foundation 1. The merge-base clone printed the same foundation RESULT.

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
- FIX1 escalation: `node tools/test_strata_foundation.js` exits 1 on origin/main `188fee267f6c95bd477736f3dc7dfce2c6e75a12` and on this tip, same four checks, same FAIL lines (FIX1 section). The test still expects the pre-`bdf45b4c` frame (zMin -2, 1 ft strata). A New Game in its vm is `Z_RANGES.default` (-16..+15) with 2 ft strata. The repair is in `tools/test_strata_foundation.js` or the plugins. Both are outside this lane. This lane does not weaken those assertions and does not answer which side should move.

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

`test_column_landforms.js` dies at its line 181. `test_vertical_worldgen_proof.js` dies at its line 236. No check runs. Same cause as this gate (`bdf45b4c`). Both files are outside this lane's `allowedPaths`. FIX2: Lane BD (`DEUS-TSK-ZRANGE-HARNESS`) now owns those two files. This lane still does not edit them.

A read of `tools/**/*.js` for `DEUS_Levels.js` found the other loaders already loading `DEUS_World.js` first (`test_strata_foundation.js`, `test_strata_cuts_and_caves.js`, `test_volumetric_terrain_column.js`, `test_upper_elevation_terrain.js`, `test_survival_regressions.js`, `test_native_survival_soak.js`, `test_19b_performance_determinism.js`, `test_strata_fluid_reconciliation.js`, `tools/sim/test_living_world_rules.js`, `tools/zrange/bench_queries.js`, `tools/capture_pre_migration_baseline.js`).

## PROPOSED-BB-02

`tools/test_strata_foundation.js` exits 1 on origin/main and on this tip. Fresh clones of `188fee26` and `21775352` printed the same four FAIL lines (FIX1 section). `fills_0_to_5`, `floor_on_substrate`, and `surface_elevation_matches` want the legacy frame (zMin -2). A New Game in that vm is `Z_RANGES.default` (-16..+15), and `worldStrataElevationAt` is `(z - zMin) * 5 + stratum` (70 elevation steps higher). `sphere_aoe` wants the 1 ft blast table (7 strata at radius 3 ft). The live 2 ft table hits 3, which is what `docs/systems/DEUS_ZRange.md` records for that radius. The test's last commit is `116a3de9` (2026-09-25), before `bdf45b4c` (2026-09-26). The fix is in that test or in the plugins, both outside this lane.

FIX2 widened `allowedPaths` to include `tools/test_strata_foundation.js` and did this repair. The four Cause A checks, and the four Cause B checks that the AV merge added, pass on the FIX2 tip. See the FIX2 section.

## PROPOSED-BB-03

Repair `tools/test_strata_cuts_and_caves.js` the same way this lane repaired `tools/test_strata_foundation.js`. On this tip the command exits 1 with seven failures: `deterministic_same_seed`, `old_generator_unchanged`, `cave_overburden`, `roof_breach`, `clearance_4_5_more`, `clearance_stops_at_fluid`, `no_parallel_authority`. The nested `foundation_suite` is green. The file is not in this lane's `allowedPaths`. Detail and the deciding doc lines are in `escalation.md`. Do not weaken those checks.
