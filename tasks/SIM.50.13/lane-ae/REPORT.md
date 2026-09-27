# SIM.50.13 lane-ae report

**Writer:** grok. **Branch:** `task/lane-ae`. **Not DONE.** An independent gemini review decides. This report does not certify the task.

No art was generated, drawn, edited, or requested (DEC-007). No file outside the brief's allowedPaths was written. No WBS id was minted. No merge. No push of any branch except `task/lane-ae`.

## What changed

### F-03 — loose stones do not become ore (`game/js/plugins/DEUS_Ecology.js`)

The three `rocks_small` sprout rows (levels 0, -1, -2) no longer list `ironstone`, `copper_outcrop`, or `gold_outcrop`. Each row matures only to `granite_boulder` (the non-ore stone outcome already on those rows; its previous weight is unchanged). Other sprout rows are unchanged, including crystal and gem rows.

Maturation refuses an ore outcome even when a save already stored one. `isOreSproutOutcome` matches those three ids and any object type whose tags include `ore`. The sprout record is dropped and `setIn` is not called, so the loose stone stays a loose stone. A `granite_boulder` outcome still matures.

### F-05 / D-4 — solver binds on every map and layer load (`game/js/plugins/DEUS_Fluid.js`)

`DEUS_Core` `require()`s this file before it runs `window.DEUS = window.DEUS || {}; window.UF = window.DEUS`. A module-local `var UF = UF || {}` never became `window.UF`, so `DEUS_Levels` kept its legacy flood fill, which paints water with no volume.

`bindSharedNamespace` publishes one object on `window.DEUS` and `window.UF` when neither exists yet, so Core's later assignment keeps that object and `UF.Fluid`. If `window.UF` already exists, it is kept (a pre-seeded namespace is not replaced). `attachFluid` stamps `Fluid` onto the live `window.UF` and hooks the current Events bus once.

Attach runs at load, again from `Game_Map.prototype.setup` (one map id per level), and on `world:areaBuilt` / `world:levelBuilt`. Attach writes no cells. The deferred hook timer is cleared once the bus is hooked, including its 5s deadline.

## Evidence

Node only. NW.js was not started. The gates are node programs; a heavy NW.js run is not required to show the `require()` scoping rule, and none was left running.

`node tools/sim/test_ore_sprout.js`

```text
PASS sprout_tables_no_ore — rock rows 3; ore entries []; bad weights []
PASS legacy_ore_not_placed — matured 0; ore writes 0; cells ironstone=rocks_small, copper_outcrop=rocks_small, gold_outcrop=rocks_small, mythril_vein=rocks_small
PASS granite_boulder_still_matures — matured 1; cell granite_boulder
PASS long_run_no_ore — beats 1500 seeds 5013,501313; ore hits 0; bad rock mature none; grid ore 0/0
PASS long_run_still_sprouts — granite 397/384; other matures 747/764; loose-stone sprouts seen 62563/60748
PASS long_run_seeded — seed 5013 placements 332 identical across two runs; differs from seed 501313
RESULT: PASS (0 failed)
```

Exit 0. The long run is 1500 beats on a 48×48 map for seeds 5013 and 501313, inside a vm sandbox around the real plugin. It counts every `setIn` and every live sprout's `matureType`. A second pair of 200-beat runs on seed 5013 matches placement-for-placement. A type tagged `ore` but not in the three-id list (`mythril_vein`) is also refused.

`node tools/sim/test_fluid_attach.js`

```text
PASS mutant_site_present — three bind assignments
PASS mutant_require_does_not_bind — window.UF.Fluid set: false
PASS require_binds_before_core_lines — window.UF.Fluid is the module export before Core runs: true
PASS require_survives_core_assign — same object after window.DEUS = window.DEUS || {}; window.UF = window.DEUS: true
PASS hooks_on_first_map_load — listeners 9
PASS hooks_not_stacked — before second load 9 after 9 (levels:cellChanged,levels:shapeChanged,levels:strataChanged,levels:strataDestroyed,world:areaBuilt,world:levelBuilt,doors:opened,doors:closed,doors:broken)
PASS volume_before_place — scanned 0 legacy 0
PASS volume_after_place — scanned 22 diagnostics 22 legacyCalls 0 legacyVolume 0 expected 22
PASS volume_after_attach — scanned 22 diagnostics 22 legacyCalls 0 legacyVolume 0 expected 22
PASS flood_uses_solver — vias solver volume 22
PASS volume_across_flood_fills — layers 32 volume 22
PASS volume_across_flow — ticks 10 bottom 22 expected 22
PASS reattach_on_map_load — was unbound true; restored true; missing
PASS classic_script_binds — identity kept: true Fluid set: true
RESULT: PASS (0 failed)
```

Exit 0. Load order matches Core: CommonJS wrapper first, with no `window.UF`, then Core's two assignment lines. An in-memory mutant that deletes the three `window` assignments does not bind, so the check can fail. The file on disk is not edited by that mutant.

Water is counted two ways: `diagnostics().totalWaterVolume` and a full scan of `depthAt` over z=-16..15 on an 8×8 area. 22 depth units were placed (7+5+4+6). The same 22 remains after map setup, `world:areaBuilt`, `world:levelBuilt`, a `getFloodGrid` read on every layer in range, and 10 solver ticks. After the flow, all 22 sit on z=-16 (the bottom of the world's range). The consumer branch copied from `DEUS_Levels.getFloodGrid` (solver grid when `window.UF.Fluid.getFloodGrid` exists, otherwise the legacy fill) took the solver path every time. The legacy path adds volume in the test; its call count stayed 0. Replacing `window.UF` with a new object clears `Fluid`; the next `Game_Map.setup` puts the same solver back and does not change the 22.

`node tools/check_deus_syntax.js`

```text
Checked 52 DEUS plugin files. Errors: 0
```

Exit 0.

## Open Owner questions

These are not answered here.

| ID | Question | What this lane did |
|---|---|---|
| D-4 | How `DEUS_Fluid` should load (audit §9). (a) Register it in `plugins.js`. (b) Bind `window.UF` from `DEUS_Fluid.js`. | The brief's launch note says the fix is option (b) inside `DEUS_Fluid.js`, and that `plugins.js` and `DEUS_Core.js` stay forbidden. That is what landed. It is not an Owner ruling. |
| D-5 | Whether the "User specification 2026-09-19" comment over the sprout tables was an Owner order for renewable ore (audit §9). (a) Remove it, keeping V74 and V83. (b) An Owner row that makes some outcrops renewable, with a source and a ledger entry. | The brief orders ore outcomes removed from loose-stone maturation. That removal is in the sprout tables and at maturation. It is not an Owner ruling on D-5. |

## Proposed follow-ups

| ID | Follow-up |
|---|---|
| PROPOSED-AE-01 | Gem sprouts are still in the tables: `crystal_small` matures into `crystal` and `crystal_spire` on levels -1 and -2. The audit (VEG-1) treats those as finite minerals created from nothing. This brief allowed a non-ore stone outcome to stay, so `granite_boulder` still matures from `rocks_small`. Neither gems nor that boulder were removed. |
| PROPOSED-AE-02 | `DEUS_Levels.js` `computeFloods` still paints water with no volume when `window.UF.Fluid.getFloodGrid` is missing. After this bind that branch is not taken on the `require()` path. The fill itself is outside allowedPaths. |
| PROPOSED-AE-03 | In-game check that `window.UF.Fluid` is set after boot (the audit's F5 read). The node tests cover the JavaScript load order, not NW.js. |
