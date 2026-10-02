# lane-gp: put main's four red gates back to green (hotfix)

| Field | Value |
|---|---|
| WBS | OPS.MAIN.GREEN |
| taskId (manifest) | OPS.MAIN.GREEN |
| Branch | `task/lane-gp` |
| Manifest | `tasks/OPS.MAIN.GREEN/lane-gp/lane.json` |
| Writer -> reviewer | claude (the PM) -> grok |
| RMMZ editor must be closed | no |

Base: `main` at `2c63c5e6` (merge of lane-gl) or later.

## Why

On 2026-10-02 (~01:00Z) the PM ran the suites that the merged lanes touch against `main` itself and found four red checks that no lane's own gate showed. merge_gate tests each lane at its own tip, not at the merged result, so two lanes that were each green broke each other:

1. `node tools/test_sim_loader.js`, check `every_vm_harness_installs_hook`: `tools/test_area_generation_speed.js` (lane-dc, speed harness) builds a vm sandbox and evaluates `DEUS_World.js`, `DEUS_WorldGen.js` and `DEUS_Levels.js` without `tools/lib/vm_sim_require.js` (lane-db, WG.00.44). Each lane was green alone.
2. `node tools/sim/test_materials.js`, check `catalog_objects_covered`: lane-gh added six stump objects to `game/data/DEUS_WorldCatalog.json` (`oak_stump`, `swamp_stump`, `dead_stump`, `birch_stump`, `pine_stump`, `fruit_stump`); lane-do2 (NAT.02.MASS) made `game/data/sim/mass_tables.json` list every catalogue object, so the six have no row.
3. `node tools/test_zrange.js`, check `matter_unchanged`: bisected to lane-gh's merge (`6ee18bf4`; at `f01d0454` the New Game census was identical). The census counts map objects by numeric typeId, and a typeId is a position in the catalogue: the nine war banners are appended after the catalogue objects (`DEUS_Objects.js`, `BANNER_SPECIES`), so six new catalogue objects moved them from typeIds 88..96 to 94..102 and the frozen reference (`tools/zrange/fixtures/geology_304ca7b2_seed18.json`) differs by numbering only. The suite's own comment says it counts "by object id"; the code counts by number.

(`tools/test_area_generation_speed.js` itself is the same defect as item 1: it is the file the loader check names.)

## Scope

1. `tools/test_area_generation_speed.js`: `const simHook = require("./lib/vm_sim_require");` and `simHook.install(env);` in `makeEnv`, before the plugins are evaluated, as `tools/test_new_game_year0.js` does. The sandbox's PluginManager passes AreasX and AreasY explicitly, which the hook keeps.
2. `game/data/sim/mass_tables.json`: the six stump ids added to `catalogIndex.objects` (sorted) and six rows added to `objects`, each a copy of the existing `stump` row (1,764 cp, `PM_DEFAULT_UNCONFIRMED`, one log on salvage), appended in catalogue order. Nothing else in the file changes. The identity postings of the tree rows keep naming `stump` (same mass; a later lane may point each tree at its own stump).
3. `tools/zrange/zrange_suite.js`: the census counts map objects by object id (`UF.Objects.type(typeId).id`, `#<typeId>` when unknown). `tools/zrange/fixtures/geology_304ca7b2_seed18.json`: the reference census re-keyed the same way by `tasks/OPS.MAIN.GREEN/lane-gp/convert_geology_fixture.js`, which reads the typeId-to-id lists from the reference commit itself (87 catalogue ids from `304ca7b2:game/data/DEUS_WorldCatalog.json`, the nine banner ids from `304ca7b2:game/js/plugins/DEUS_Objects.js`) and fails if either count is not 87 / 9. A numbering change can no longer fail `matter_unchanged`; a changed count of any named object still does.
4. Evidence that each check can fail (AGENTS.md Rule 4): the loader check fails with the hook line removed from the speed harness; `catalog_objects_covered` fails with a stump row's id removed from `catalogIndex.objects`; `matter_unchanged` fails with one object added to or removed from the live census (a provocation: edit one count in a copy of the fixture) and still reports `matter_destroyed` for the existing provocation.

## Out of scope

Making merge_gate test the merge result (the follow-up lane); pointing each tree's identity posting at its own stump; pruning the legacy `UF_WorldCatalog.json`; any art; any change to `game/js/`.

## Tests (lane.json gateTests; each runs in a fresh clone)

- `node tools/check_deus_syntax.js`
- `node tools/sim/test_materials.js` and `node tools/sim/migrate_mass_units.js --check`
- `node tools/test_sim_loader.js`
- `node tools/test_area_generation_speed.js`
- `node tools/test_zrange.js`

## Rules

- Commit only on `task/lane-gp`, staging only the manifest paths. The writer commit carries the `[claude]` tag.
- Push `task/lane-gp`; the reviewer (grok) is launched through `tools/ops/launch_worker.ps1` and commits its own review file in its run. The PM merges through merge_gate.
- Report in one paragraph plus the test output (DEC-085 item 5).
