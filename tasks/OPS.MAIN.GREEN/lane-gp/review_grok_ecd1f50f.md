# lane-gp review (grok)

Reviewed commit (TIP): `ecd1f50f09f0b486bb6f9317387543594a2983ed`

Reviewer: grok. Writer family: claude (author `deus-claude` on the writer commit; the PM opened the lane). Branch `task/lane-gp`. Merge-base with `origin/main`: `2c63c5e650b99bc07b078eed155f83bbf20d0eb9`. After `git fetch origin`, `origin/main` is `917f2755f823d7aad297769d09db600ff653b8c1`.

`git log --format='%h %an | %s' origin/main..HEAD`:

```
ecd1f50f deus-claude | [claude] OPS.MAIN.GREEN: speed harness installs the sim hook, six stump mass rows, zrange census counts objects by id
3aae2b8c deus-pm | [pm] Open lane-gp (OPS.MAIN.GREEN, writer claude): main's four red gates after the lane-gh, lane-do2 and lane-dc merges
```

Gates, the speed harness, the mass consumers, and both zrange runs were executed in one fresh clone of the tip, made the way `tools/governance/merge_gate.js` `makeClone` makes one: `git clone -c core.autocrlf=false -c core.eol=lf -c core.safecrlf=false --shared --no-checkout` of the common git dir, then the same three keys in the clone's local config, then `checkout --detach ecd1f50f09f0b486bb6f9317387543594a2983ed`. Clone setup printed:

```
CHECKOUT_EXIT 0
ecd1f50f09f0b486bb6f9317387543594a2983ed
false
lf
false
```

`git status --porcelain` in the clone was empty. Commands ran one at a time, each to completion before the next. The clone was `C:\Users\snewt\AppData\Local\Temp\lane-gp-review-ecd1f50f`.

## 1. Scope

`git diff --name-status $(git merge-base origin/main HEAD) HEAD` (tabs written as `TAB`):

```
M TAB game/data/sim/mass_tables.json
A TAB tasks/OPS.MAIN.GREEN/lane-gp/BRIEF.md
A TAB tasks/OPS.MAIN.GREEN/lane-gp/REPORT.md
A TAB tasks/OPS.MAIN.GREEN/lane-gp/convert_geology_fixture.js
A TAB tasks/OPS.MAIN.GREEN/lane-gp/lane.json
M TAB tools/test_area_generation_speed.js
M TAB tools/zrange/fixtures/geology_304ca7b2_seed18.json
M TAB tools/zrange/zrange_suite.js
```

`lane.json` `allowedPaths` is four files (`tools/test_area_generation_speed.js`, `game/data/sim/mass_tables.json`, `tools/zrange/zrange_suite.js`, `tools/zrange/fixtures/geology_304ca7b2_seed18.json`) plus `tasks/OPS.MAIN.GREEN/lane-gp/**`. The diff is those four files plus four files in that folder. No other path.

## 2. Speed harness and the sim hook

`git diff $(git merge-base origin/main HEAD) HEAD -- tools/test_area_generation_speed.js` is two added lines and nothing else:

```
+const simHook = require("./lib/vm_sim_require"); // WG.00.44: UF.Sim.require and a 1x1 grid default in the vm
```

```
     env.$gameMap = new env.Game_Map();
     env.$gamePlayer = new env.Game_Player();
+    simHook.install(env); // before the plugins are evaluated; the PluginManager above passes AreasX and AreasY, which the hook keeps
     for (const f of ["DEUS_World.js", "DEUS_WorldGen.js", "DEUS_Levels.js"]) {
         const src = f === "DEUS_Levels.js" ? levelsSource : fs.readFileSync(path.join(ROOT, "game/js/plugins", f), "utf8");
         vm.runInNewContext(src, env, { filename: f });
```

`install(env)` runs before `vm.runInNewContext`. The sandbox's `PluginManager` is already set, and its `parameters` returns the harness arguments:

```javascript
parameters: () => ({ AreasX: String(areasX), AreasY: String(areasY) }),
```

`tools/lib/vm_sim_require.js` `pinGrid` copies that object and fills a grid key only when the value is missing or empty:

```javascript
for (const key of GRID_KEYS) {
    if (out[key] === undefined || out[key] === null || out[key] === "") out[key] = "1";
}
```

`GRID_KEYS` is `AreasX` and `AreasY`. An explicit non-empty value is returned as the harness passed it. `install` wraps `PluginManager` with an accessor before the plugins run, so `DEUS_World` reads that wrapper. The harness's explicit `AreasX` and `AreasY` are kept. The same run's `PASS core_checksums_bit_identical` covers the 1x1 and 3x3 grids, which is the behaviour that would fail if the hook had replaced an explicit 3 with `"1"`.

Clone run:

```
===== node tools/test_sim_loader.js =====
PASS every_vm_harness_installs_hook - 51 hits in 982 files; without the hook: none; planted harness found by the scan: true, refused: true; hooked fixture accepted: true
RESULT: 7 passed, 0 failed
EXIT:0
===== node tools/test_area_generation_speed.js =====
PASS no_rest_parameter_hash_on_generator_path
one_area_volume_ms sample 1 2709.4 ms
one_area_volume_ms sample 2 2958.6 ms
one_area_volume_ms sample 3 2864.3 ms
one_area_volume_ms samples 2709.4 2958.6 2864.3 median 2864.3
PASS one_area_volume_ms - median 2864.3 ms, limit 5000
PASS core_checksums_bit_identical
RESULT pass
EXIT:0
```

## 3. Mass tables

Compared `git show` of `2c63c5e650b99bc07b078eed155f83bbf20d0eb9:game/data/sim/mass_tables.json` and `ecd1f50f09f0b486bb6f9317387543594a2983ed:game/data/sim/mass_tables.json` by JSON parse, and classified `git diff -U0` of the same pair.

```
MASS added count: 6
MASS added rows: oak_stump, swamp_stump, dead_stump, birch_stump, pine_stump, fruit_stump
MASS removed rows: (none)
MASS changed existing rows: (none)
MASS added set equals the six: true
MASS row oak_stump deep-equals base stump: true massCp=1764 massStatus=PM_DEFAULT_UNCONFIRMED
MASS row swamp_stump deep-equals base stump: true massCp=1764 massStatus=PM_DEFAULT_UNCONFIRMED
MASS row dead_stump deep-equals base stump: true massCp=1764 massStatus=PM_DEFAULT_UNCONFIRMED
MASS row birch_stump deep-equals base stump: true massCp=1764 massStatus=PM_DEFAULT_UNCONFIRMED
MASS row pine_stump deep-equals base stump: true massCp=1764 massStatus=PM_DEFAULT_UNCONFIRMED
MASS row fruit_stump deep-equals base stump: true massCp=1764 massStatus=PM_DEFAULT_UNCONFIRMED
MASS tip stump deep-equals base stump: true
INDEX added: birch_stump, dead_stump, fruit_stump, oak_stump, pine_stump, swamp_stump
INDEX removed: (none)
INDEX tip sorted: true
INDEX base sorted: true
INDEX minus six equals base index: true
REST of mass_tables identical after removing the six: true
APPENDED object-key order: oak_stump, swamp_stump, dead_stump, birch_stump, pine_stump, fruit_stump
CATALOGUE order of the six: oak_stump, swamp_stump, dead_stump, birch_stump, pine_stump, fruit_stump
APPENDED equals catalogue order: true
CATALOGUE object count: 93 unique 93 dupes (none)
CATALOGUE objects with no mass row at base (6): oak_stump, swamp_stump, dead_stump, birch_stump, pine_stump, fruit_stump
MISSING equals catalogue order of the six: true
BASE mass object rows not in catalogue: 0 (none)
CATALOGUE text identical base vs tip: true
MASS DIFF non-header +lines 282 -lines 0
```

The catalogue set difference is from `game/data/DEUS_WorldCatalog.json` at the merge-base (the blob is identical at the tip): object ids with no key in the base `objects` map. That set is exactly the six ids, in catalogue order. `git diff` of the mass file adds 282 lines and deletes none.

Identity postings (`process: "identity"`) are 50 at the base and 50 at the tip. None were added or removed. Every posting that names `stump` still names `stump`, including yield and collapse on `oak`, `birch`, `pine`, `fir_snow`, `fruit_tree_bare`, `tree_savanna`, `tree_swamp`, `mangrove`, `tree_tropical`, `palm`, `dead_tree`, `tree_cursed`, and `tower_cap`. `fruit_tree.yield` still names `fruit_tree_bare`, as it did at the base.

Clone runs:

```
===== node tools/sim/test_materials.js =====
PASS catalog_objects_covered
RESULT: 114 passed, 0 failed
EXIT:0
===== node tools/sim/migrate_mass_units.js --check =====
CHECK: OK (materials.json and mass_tables.json are integer centipounds)
EXIT:0
===== node tools/sim/test_reclaim.js =====
RESULT: 38 passed, 0 failed
EXIT:0
===== node tools/sim/test_living_world_rules.js =====
RESULT: PASS (0 failed)
EXIT:0
```

`test_materials.js` printed 114 `PASS` lines, including `PASS catalog_objects_covered`, then the RESULT line above.

## 4. Z-range census and the geology fixture

`tools/zrange/zrange_suite.js` counts map objects by id. The diff adds `objectName` and uses it in the core-level loop:

```javascript
const objectName = n => { const ty = O && typeof O.type === "function" ? O.type(n) : null; return ty && ty.id ? ty.id : `#${n}`; };
...
for (let i = 0; i < map.ufObjects.length; i++) { const o = map.ufObjects[i]; if (o) add(c.objects, objectName(o)); }
```

`O` is `UF.Objects`. `Objects.type` is `typeOf` (`game/js/plugins/DEUS_Objects.js`): a number indexes the catalogue list (`list[typeId - 1]`), and a miss returns null. The cell value in `ufObjects` is that typeId. If the entry is missing, or the entry has no truthy `id`, the count key is `` `#${n}` ``, which is `#<typeId>`. An object whose type has no id is counted under `#<typeId>`. A cell holding `0` is skipped by `if (o)`; the objects plugin treats `0` as nothing.

The fixture was compared by parsing the base blob and the tip blob. Reference names came from `304ca7b2:game/data/DEUS_WorldCatalog.json` (87 object ids) and the nine `BANNER_SPECIES` ids in `304ca7b2:game/js/plugins/DEUS_Objects.js` (`banner_human`, `banner_elf`, `banner_dwarf`, `banner_gnome`, `banner_halfling`, `banner_half_elf`, `banner_half_orc`, `banner_dragonborn`, `banner_tiefling`). Old numeric keys map as `names[typeId - 1]`.

```
REF catalogue objects: 87 banners: 9 banner_human,banner_elf,banner_dwarf,banner_gnome,banner_halfling,banner_half_elf,banner_half_orc,banner_dragonborn,banner_tiefling
FIXTURE top base: reference, seed, updates, source, configs
FIXTURE top tip: reference, seed, updates, source, configs, objectKeys
objectKeys: "object id (was numeric typeId until lane-gp; typeIds 1..87 were the catalogue in order and 88..96 the nine war banners)"
FIXTURE aside from census object maps and objectKeys identical: true
CONFIGS base: -4..4, -16..15, -2..2 tip: -4..4, -16..15, -2..2
SUM -4..4 census: oldKeys 42 newKeys 42 oldSum 3870 newSum 3870
SUM -4..4 censusAfter: oldKeys 46 newKeys 46 oldSum 3895 newSum 3895
SUM -16..15 census: oldKeys 42 newKeys 42 oldSum 3870 newSum 3870
SUM -16..15 censusAfter: oldKeys 46 newKeys 46 oldSum 3895 newSum 3895
SUM -2..2 census: oldKeys 42 newKeys 42 oldSum 3870 newSum 3870
SUM -2..2 censusAfter: oldKeys 46 newKeys 46 oldSum 3895 newSum 3895
COUNT COMPARE compared=264 mismatches=0 missingName=0
COUNT SAMPLES: (none)
```

The three configurations' `census` and `censusAfter` differ only in the `objects` keys, and the file gains `objectKeys`. Every renamed count matches. 3 configurations × (42 + 46) = 264.

`node tasks/OPS.MAIN.GREEN/lane-gp/convert_geology_fixture.js` was run with its cwd set to a temp directory whose fixture file was the base blob (`git show 2c63c5e6:tools/zrange/fixtures/geology_304ca7b2_seed18.json`, 16526 bytes, sha256 `f2647c60dac4db450cb6c073784891152a9d7332911c59faaf70a8b5a12eb1de`) and whose `.git` file pointed at this worktree's git dir, so `git show 304ca7b2:...` read the reference commit. The worktree fixture was not modified.

```
CONVERTER STDOUT: converted 264 object counts in -4..4, -16..15, -2..2
PRODUCED bytes 18851 04fedd0f021ac6616a84be6c5e543fb69cc72a9bd7620496346cece51645a33a
TIP bytes 18851 04fedd0f021ac6616a84be6c5e543fb69cc72a9bd7620496346cece51645a33a
PRODUCED equals TIP byte for byte: true
```

## 5. `node tools/test_zrange.js` in the LF clone

Full suite, foreground, clone above. Duration about 265 s. Exit 0.

```
PASS matter_unchanged - geology reference 304ca7b2 seed 18: -4..4: New Game identical, rock above +2 5160 strata (reference 5160), ledger ce5a214c (reference ce5a214c); after 1500 updates identical, ledger ce5a214c (reference ce5a214c); layers outside -2..+2: 4 material keys; -16..15: New Game identical, rock above +2 19408 strata (reference 19408), ledger 4ce57b52 (reference 4ce57b52); after 1500 updates identical, ledger 4ce57b52 (reference 4ce57b52); layers outside -2..+2: 23 material keys; -2..2: New Game identical, rock above +2 5160 strata (reference 5160), ledger 78879322 (reference 78879322); after 1500 updates identical, ledger 78879322 (reference 78879322); layers outside -2..+2: 0 material keys
RESULT: 10 passed, 0 failed (exit 0)
EXIT:0
```

The nine other checks also printed `PASS` (`single_authority`, `elevation_math`, `feet_2ft_10ft`, `sparse_memory`, `sparse_save`, `legacy_save_loads`, `old_layers_identical`, `extreme_layers_work`, `path_scratch_bounded`).

`node tools/test_zrange.js --provoke=matter_destroyed` (same clone, its own foreground run, about 118 s):

```
  run p_matter_destroyed_-4..4_core: RESULT: 8 passed, 0 failed (exit 0) in 35 s (run_tests exit 0); snapshot ... (deleted)
  run p_matter_destroyed_-4..4_sim: RESULT: 2 passed, 0 failed (exit 0) in 117 s (run_tests exit 0); snapshot ... (deleted)
CAUGHT provocation matter_destroyed -> matter_unchanged: FAIL geology reference 304ca7b2 seed 18: -4..4: New Game DIFFERS (strata.1: 390885 vs 390890), rock above +2 5160 strata (reference 5160), ledger e146d5a0 (reference ce5a214c); after 1500 updates DIFFERS (strata.1: 390885 vs 390890), ledger e146d5a0 (reference ce5a214c); layers outside -2..+2: 4 material keys
PROVOCATIONS: 1/1 caught
EXIT:0
```

The provocation still makes `matter_unchanged` fail (stone strata 390885 vs 390890, ledger `e146d5a0` vs `ce5a214c`, at New Game and after 1500 updates). The in-game suite lines above are the phase runs; the driver judges `matter_unchanged` afterwards. `tools/test_zrange.js` defines the process exit as: `0` when every check passed, and with `--provoke` when every provocation was caught; `1` when a check failed on a normal run or a provocation was not caught; `2` on a harness problem. A caught provocation therefore exits 0. This run exited 0 with `PROVOCATIONS: 1/1 caught`. Exit 1 would mean the provocation was not caught.

## 6. Gate tests

Each `lane.json` `gateTests` command, in the LF clone, in order. Exit code is the process exit.

| Command | Exit | Result line |
|---|---|---|
| `node tools/check_deus_syntax.js` | 0 | `Checked 62 DEUS plugin files. Errors: 0` |
| `node tools/sim/test_materials.js` | 0 | `RESULT: 114 passed, 0 failed` |
| `node tools/sim/migrate_mass_units.js --check` | 0 | `CHECK: OK (materials.json and mass_tables.json are integer centipounds)` |
| `node tools/test_sim_loader.js` | 0 | `RESULT: 7 passed, 0 failed` |
| `node tools/test_area_generation_speed.js` | 0 | `RESULT pass` |
| `node tools/test_zrange.js` | 0 | `RESULT: 10 passed, 0 failed (exit 0)` |

## 7. REPORT.md

The report's statement that the original provocation was not re-run is in the opening paragraph: "Not checked: the original `matter_destroyed` provocation (not re-run)". That describes the writer's run. This review re-ran it; see section 5. The statement is accurate about the report's own evidence.

The report's statement that the tree rows' identity postings still name `stump` is true. Section 3 shows those postings are unchanged from the base, and the chop/collapse identities on the tree rows still name `stump`. That is acceptable. The brief requires the postings to keep naming `stump`, the six new rows are copies of the `stump` row (1764 cp, `PM_DEFAULT_UNCONFIRMED`, one log on salvage), and pointing each tree at its own stump is out of scope. The mass named by those postings equals the mass of each new stump row.

After-block numbers this review produced and that match the report: `Checked 62 DEUS plugin files. Errors: 0`; `RESULT: 114 passed, 0 failed`; `CHECK: OK (materials.json and mass_tables.json are integer centipounds)`; `51 hits in 982 files; without the hook: none`; `RESULT: 7 passed, 0 failed`; `PASS core_checksums_bit_identical` and `RESULT pass`; `limit 5000`; rock above +2 `5160` and `19408`; ledgers `ce5a214c` and `4ce57b52`; `RESULT: 10 passed, 0 failed (exit 0)`; reclaim `RESULT: 38 passed, 0 failed`; living-world `RESULT: PASS (0 failed)`.

The one after-number that does not match this review is the speed median. The report quotes `PASS one_area_volume_ms - median 3174.2 ms, limit 5000`. This run was `median 2864.3 ms` (samples 2709.4, 2958.6, 2864.3), same limit, same pass. The median is a sample from the writer's machine. The report records that sample; it does not overstate the pass.

The report's `matter_unchanged` quote uses ellipsis. The figures it prints (`5160`, `ce5a214c`, `19408`, `4ce57b52`, 10 passed, 0 failed) match section 5. The ellipsis leaves out this run's `-2..2` ledger `78879322` (also rock `5160`) and the outer-key counts 4, 23, and 0. Those omitted figures agree with the quoted "identical" result.

This review did not re-run the before-state red commands on main, so it did not produce the report's before figures (`51 hits in 983 files`, `RESULT: 0 passed, 1 failed`, `RESULT: 113 passed, 1 failed`, `objects.97: 1 vs 0` and the following banner slots). It also did not re-run the report's Rule 4 mutants (`RESULT: 112 passed, 2 failed` after dropping `oak_stump` from the index, and `banner_human` `1 vs 2` with `RESULT: 9 passed, 1 failed`). The report presents those as the writer's measurements, and it separates them from the tip results.

## 8. Merge with origin/main

```
git fetch origin
FETCH_EXIT:0
git rev-parse origin/main
917f2755f823d7aad297769d09db600ff653b8c1
git merge-tree --write-tree origin/main HEAD
afb16a6ad3cf527f3732aa32a996746d2de3b085
MERGE_TREE_EXIT:0
```

`git log --format='%h %an | %s' origin/main..HEAD` after the fetch is still the two commits quoted at the top.

## Findings

No BLOCKER, MAJOR, or MINOR findings.

VERDICT: CLEAN PASS
