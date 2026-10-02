# lane-gp report: main's four red gates

Writer: claude (the PM). Base `2c63c5e6`; opening `3aae2b8c`. Written 2026-10-02.

**What changed, how it was tested, what was not checked.** Three defects, each a pair of lanes that were green alone (merge_gate tests a lane at its own tip, not at the merged result). (1) `tools/test_area_generation_speed.js` now requires `tools/lib/vm_sim_require.js` and calls `simHook.install(env)` before it evaluates the plugins (2 lines); this clears `test_sim_loader` `every_vm_harness_installs_hook` and the speed harness itself runs and passes. (2) `game/data/sim/mass_tables.json` gets six rows (`oak_stump`, `swamp_stump`, `dead_stump`, `birch_stump`, `pine_stump`, `fruit_stump`), each a copy of the existing `stump` row (1,764 cp), and the six ids in `catalogIndex.objects`; this clears `test_materials` `catalog_objects_covered`. (3) `tools/test_zrange.js` `matter_unchanged` failed because the census counted map objects by numeric typeId and the nine war banners follow the catalogue in typeId order, so six new catalogue objects moved them from 88..96 to 94..102 (bisect: identical at `f01d0454`, `objects.97: 1 vs 0` at `6ee18bf4`, lane-gh's merge). `tools/zrange/zrange_suite.js` now counts objects by id (`UF.Objects.type(typeId).id`), and `tools/zrange/fixtures/geology_304ca7b2_seed18.json` is re-keyed by `convert_geology_fixture.js` (264 counts), which reads the typeId-to-id lists from the reference commit itself. Not checked: the original `matter_destroyed` provocation (not re-run); merge_gate's own run of the six gate commands (the PM runs it); an F5 session (no `game/js` plugin names `mass_tables.json` or the harnesses; `git grep mass_tables -- game/js` is empty). The tree rows' identity postings still name the generic `stump` (same mass); pointing each at its own stump is left to a later lane.

## Before: the four red checks on main (`2c63c5e6`, tools and game identical at `2f3377f6`)

```
$ node tools/test_sim_loader.js --only=every_vm_harness_installs_hook
FAIL every_vm_harness_installs_hook - 51 hits in 983 files; without the hook: tools/test_area_generation_speed.js; planted harness found by the scan: true, refused: true; hooked fixture accepted: true
RESULT: 0 passed, 1 failed                                  (exit 1)
$ node tools/sim/test_materials.js
FAIL catalog_objects_covered
RESULT: 113 passed, 1 failed
$ node tools/test_zrange.js   (bisect run at 6ee18bf4, lane-gh's merge; at f01d0454 the -4..4 census was identical)
FAIL matter_unchanged - geology reference 304ca7b2 seed 18: -4..4: New Game DIFFERS (objects.97: 1 vs 0, objects.98: 1 vs 0, objects.99: 1 vs 0, objects.100: 1 vs 0), rock above +2 5160 strata (reference 5160), ledger ce5a214c (reference ce5a214c); ...
```

(At `f01d0454` the `-2..2` and `-16..15` sim runs exited 2 under load, so only the `-4..4` part of that bisect run is evidence.)

## After: this branch

```
$ node tools/check_deus_syntax.js                      Checked 62 DEUS plugin files. Errors: 0
$ node tools/sim/test_materials.js                     RESULT: 114 passed, 0 failed
$ node tools/sim/migrate_mass_units.js --check         CHECK: OK (materials.json and mass_tables.json are integer centipounds)
$ node tools/test_sim_loader.js                        PASS every_vm_harness_installs_hook - 51 hits in 982 files; without the hook: none; ...
                                                       RESULT: 7 passed, 0 failed
$ node tools/test_area_generation_speed.js             PASS one_area_volume_ms - median 3174.2 ms, limit 5000
                                                       PASS core_checksums_bit_identical     RESULT pass
$ node tools/test_zrange.js                            PASS matter_unchanged - geology reference 304ca7b2 seed 18: -4..4: New Game identical, rock above +2 5160 strata (reference 5160), ledger ce5a214c (reference ce5a214c); after 1500 updates identical ...; -16..15: New Game identical, rock above +2 19408 strata (reference 19408), ledger 4ce57b52 (reference 4ce57b52) ...
                                                       RESULT: 10 passed, 0 failed (exit 0)
Consumers of mass_tables.json: node tools/sim/test_reclaim.js  RESULT: 38 passed, 0 failed;  node tools/sim/test_living_world_rules.js  RESULT: PASS (0 failed)
```

## Each check can fail (AGENTS.md Rule 4)

- Loader check: the FAIL above is the check on main with the hook missing; with the hook it passes.
- `catalog_objects_covered`: `oak_stump` removed from `catalogIndex.objects` in a copy of the table gives `FAIL clean_validate: E_COVERAGE: object extras`, `FAIL catalog_objects_covered`, `RESULT: 112 passed, 2 failed`; restored gives 114 / 0.
- `matter_unchanged` after the re-keying: `banner_human` changed from 1 to 2 in the fixture's `-4..4` New Game census (restored afterwards, `cmp` identical) gives `FAIL matter_unchanged - ... -4..4: New Game DIFFERS (objects.banner_human: 1 vs 2) ...` and `RESULT: 9 passed, 1 failed (exit 1)`.

## Evidence kept in this folder

`convert_geology_fixture.js` (the one-off converter; it throws unless the reference commit has 87 catalogue objects and 9 banners).
