# Reclamation and matter posts

SIM.40.11. The mass ledger in `game/js/sim/ledger.js` is the accounting authority. `game/js/sim/reclaim.js` posts balanced moves for mining, building, deconstruction, collapse, decay and outdoor reclamation. It does not edit the ledger module. A move the ledger table does not contain is not invented.

Masses come from `game/js/sim/materials.js` (`massOf`, `yieldOf`, `reclaimTarget`, `billOfMaterials`) and from the object rows in `game/data/sim/mass_tables.json`. The integer is the catalogue `mu`. The gram size of `mu` is still the unconfirmed proposal in the catalogue (`1 mu = 1 g`). This package conserves that integer. It does not decide the unit.

## Posts

`createReclaim({ ledger, materials, data, strict })` keeps a pile list that is the recount of the ledger. `registerSlice`, `registerItem`, `registerObject` and `registerHolding` run only before `seal`. After `seal`, totals change only through ledger `transform`.

| Call | What it posts |
|---|---|
| `mine(materialId, slices, cause)` | The material's yield list, `slices` times. `identity` stays in place. Soil's yield is identity, so digging soil does not create stone. |
| `note("build", { elementId, count })` | The bill: each line's item mass becomes an object of the same class. A floor job with no bill posts `massOf(item)` from item form to object form. |
| `note("deconstruct")` / `note("harvest")` | The object's yield list. The list's mu matches the object's lines, or the post is refused. |
| `note("collapse")` | The object's collapse list. |
| `note("decay")` | One step of that pile's reclamation path. |
| `note("deck")` | Nothing. A roof deck written with no bill is `E_UNPAID`. Mass is not sourced. |
| `note("item")` outside a covered world write | Nothing. An item that appears or vanishes with no open post is `E_UNDECLARED`. |
| `note("object", { phase: "before" })` | After seal, a new ore class (`ironstone`, `copper_outcrop`, `gold_outcrop`, or any object line whose class is ore) is `E_ORE_OUTPUT` and the placement is refused. Before seal the same call does not refuse: world generation still registers ore. |

`strict: true` throws on an unpaid or unbalanced post. The plugins call the same `note` and, unless `UF.Matter.strict` is set, keep the existing world write when the ledger is not attached.

## Reclamation

`tick(n)` selects one outdoor, non-exempt pile with mass and advances it one step along `reclaimTarget(id).path`.

- A step is a ledger row (`weather:rubble->sediment`, `rot:wood->humus`, `rust`, `lithify`, …).
- If the pile's form has no such row, one same-class form change is posted first when the table allows it. A stone item becomes a stone object (`build`), and the next tick breaks that object to rubble. The path then weathers to sediment and lithifies to stone. There is no rubble-to-stone row (D-RECLAIM-RUBBLE).
- Wood, bone and other biomass rot to humus, not to a soil class (D-RECLAIM-ORGANIC).
- Iron, copper and silver rust to that element's trace strata. Gold and platinum are already the scrap endpoint (`au_metal` / `pt_metal` item). They are not given a rust row.
- An ore class is never the output of a different class. A pile whose path is empty (ungraded vein, gem, noble scrap) is left where it is.
- A solid block is counted when finished stone or humus strata at one coordinate cover `massOf` of one slice. The remainder stays in the pile. Nothing is rounded away.

`build` marks the new object exempt. Tick does not reclaim an active structure. Collapse and deconstruct are the posts that take it apart. The catalogue still stores DEC-028.3 with `implemented: false`. The caller sets `exempt` (carried, contained, claimed, enclosed, or an active structure). This module skips those piles. It does not edit the catalogue flag.

One tick is one step. It is not a year. The calendar scale (D-1) is open, so no year length is chosen.

## Plugin hooks

The hooks are no-ops when `UF.Matter` is missing. A host attaches a sealed session with `install(root, session)` from `reclaim.js` after it has registered the world. This lane does not add that host: walking generated strata is outside the files this task may edit.

| File | Hook |
|---|---|
| `DEUS_Jobs.js` | Strata mine/quarry posts four slices (solid keeps S0). Build posts the object id. Each job update calls `tick(1)`. Legacy drop counts are unchanged. |
| `DEUS_Objects.js` | `setIn` refuses a new ore class after seal. `applyIn` posts the mass-table yield, not the catalogue action counts. |
| `DEUS_Floors.js` | A floor job posts the consumed item. Removing a floor posts deconstruct. A roof deck is `E_UNPAID`. |
| `DEUS_Items.js` | Create and remove note an appear or remove. A drop inside a covered mine or build is not a second post. |
| `DEUS_Walls.js` | `Walls.collapse(typeId, count, cause)` posts the wall's collapse list. Removing a wall object calls it. |

## Tests

```
node tools/sim/test_reclaim.js
node tools/sim/test_reclaim_longrun.js
```

The long run is the fixture `tools/sim/fixtures/reclaim/schedule.json` (4000 ticks, seeds 1 and 2). Family totals stay on the sealed baseline. Checksums are pinned in `checksums.json`. Injecting one mu of soil on a copy of that run fails at that tick with mineral delta `+1`. A mutated `reclaim.js` that sources one extra mu, or that posts one extra mu, fails `test_reclaim.js`.

## Left open

These are not decided here.

- D-1, the calendar. Tick is not converted to a year.
- D-MU-UNIT, the size of mu.
- Vein grade for strata ids 38-47 (`OWNER_OPEN`). No ore-rock mass is invented.
- D-TIN. Tin, and the unmapped share of bronze, are not posted.
- D-OBJECT-VOXEL. Object posts use the catalogue bill, not a voxel count.
- DEC-018. The `magic` source is not used.
- Creature body mass. Hunt and birth are not posted.
- D-RECLAIM-ORGANIC and D-RECLAIM-RUBBLE. The ledger paths are used as published.
